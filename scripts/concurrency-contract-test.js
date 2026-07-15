'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
const writerStart = source.indexOf('const STATE_LOCK_NAME');
const writerEnd = source.indexOf('\nasync function ensureDefault', writerStart);
assert.ok(writerStart >= 0 && writerEnd > writerStart, 'Background state writer must be extractable');
const writerSource = source.slice(writerStart, writerEnd);

const popupSource = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');
const popupWriterStart = popupSource.indexOf('let popupStateWriteQueue');
const popupWriterEnd = popupSource.indexOf('\nconst appLocale', popupWriterStart);
const popupCloneStart = popupSource.indexOf('function clonePopupState()');
const popupCloneEnd = popupSource.indexOf('\nfunction showCaptureFailure', popupCloneStart);
const popupCaptureHelperStart = popupSource.indexOf('function beginPopupCapture()');
const popupCaptureHelperEnd = popupSource.indexOf('\nconst THEME_IDS', popupCaptureHelperStart);
const popupDoSaveStart = popupSource.indexOf('async function doSave(');
const popupDoSaveEnd = popupSource.indexOf('\nfunction loadHibernatePrefs', popupDoSaveStart);
assert.ok(popupWriterStart >= 0 && popupWriterEnd > popupWriterStart, 'Popup state writer must be extractable');
assert.ok(popupCloneStart >= 0 && popupCloneEnd > popupCloneStart, 'Popup state clone helper must be extractable');
assert.ok(popupCaptureHelperStart >= 0 && popupCaptureHelperEnd > popupCaptureHelperStart, 'Popup capture mutex must be extractable');
assert.ok(popupDoSaveStart >= 0 && popupDoSaveEnd > popupDoSaveStart, 'Popup single-tab capture must be extractable');
const popupWriterSource = popupSource.slice(popupWriterStart, popupWriterEnd);
const popupCloneSource = popupSource.slice(popupCloneStart, popupCloneEnd);
const popupCaptureHelperSource = popupSource.slice(popupCaptureHelperStart, popupCaptureHelperEnd);
const popupDoSaveSource = popupSource.slice(popupDoSaveStart, popupDoSaveEnd);

const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

function parsePositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer`);
  return parsed;
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const requestedRuns = argumentValue('--runs');
const randomizedRuns = requestedRuns == null ? 10_000 : parsePositiveInteger(requestedRuns, '--runs');
if (randomizedRuns < 10_000) throw new Error('--runs must be at least 10000 for the P0 concurrency gate');

const requestedSeed = argumentValue('--seed');
const parsedSeed = requestedSeed == null ? 0x4c4f4355 : Number(requestedSeed);
if (!Number.isSafeInteger(parsedSeed)) throw new Error('--seed must be an integer (decimal or 0x-prefixed)');
const seed = parsedSeed >>> 0;
const seedLabel = `0x${seed.toString(16).padStart(8, '0')}`;

function xorshift32(initialSeed) {
  let state = initialSeed || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function shuffle(values, random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function makeState(revision = 0, baseTokens = []) {
  return {
    _revision: revision,
    schema: 12,
    activeWsId: 'workspace',
    settings: {},
    archive: [],
    trash: [],
    workspaces: [{
      id: 'workspace',
      activeCatId: 'category',
      categories: [{
        id: 'category',
        name: 'Space',
        groups: [{
          id: 'inbox',
          name: 'Inbox',
          items: baseTokens.map(token => ({
            id: token,
            type: 'note',
            html: token,
            stressToken: token,
          })),
        }],
      }],
    }],
  };
}

function addToken(snapshot, token) {
  const next = clone(snapshot);
  next.workspaces[0].categories[0].groups[0].items.push({
    id: token,
    type: 'note',
    html: token,
    stressToken: token,
  });
  return next;
}

function stateTokens(state) {
  const items = state?.workspaces?.[0]?.categories?.[0]?.groups?.[0]?.items || [];
  return items.map(item => item?.stressToken).filter(token => typeof token === 'string');
}

function createPopupClientHarness(initialState = makeState()) {
  const sent = [];
  let sendCount = 0;
  let firstGate = null;

  const context = vm.createContext({
    __initialPopupState: clone(initialState),
    chrome: {
      runtime: {
        async sendMessage(message) {
          assert.equal(message?.type, 'locus-state-write');
          const candidate = clone(message.state);
          sent.push(candidate);
          sendCount++;
          if (sendCount === 1 && firstGate) {
            firstGate.signalStarted();
            await firstGate.wait;
            return firstGate.response;
          }
          const localRevision = Number(candidate?._revision) || 0;
          return { ok: true, revision: localRevision + 1 };
        },
      },
    },
    structuredClone,
  });

  vm.runInContext(
    `let state = structuredClone(globalThis.__initialPopupState);\n` +
      `${popupWriterSource}\n${popupCloneSource}\n` +
      `globalThis.__popupClient = {\n` +
      `  persist: persistPopupState,\n` +
      `  read: () => structuredClone(state),\n` +
      `  replace: next => { state = structuredClone(next); },\n` +
      `  addToken: token => {\n` +
      `    state.workspaces[0].categories[0].groups[0].items.push({\n` +
      `      id: token, type: 'note', html: token, stressToken: token\n` +
      `    });\n` +
      `  }\n` +
      `};`,
    context,
    { filename: 'popup-state-writer.js' },
  );

  return {
    client: context.__popupClient,
    sent,
    deferFirst(response) {
      let signalStarted;
      let release;
      const started = new Promise(resolve => { signalStarted = resolve; });
      const wait = new Promise(resolve => { release = resolve; });
      firstGate = { response, signalStarted, wait };
      return { started, release };
    },
  };
}

let clientQueueCases = 0;
let clientCaptureCases = 0;

async function deterministicPopupQueueSuccess() {
  const harness = createPopupClientHarness();
  const gate = harness.deferFirst({ ok: true, revision: 1 });
  harness.client.addToken('popup-first');
  const first = harness.client.persist();
  await gate.started;
  harness.client.addToken('popup-second');
  const second = harness.client.persist();
  gate.release();
  await Promise.all([first, second]);

  assert.equal(harness.sent.length, 2, 'Both successful popup mutations must send one candidate');
  assert.deepEqual(stateTokens(harness.sent[0]), ['popup-first'], 'First popup candidate must be immutable at enqueue time');
  assert.deepEqual(stateTokens(harness.sent[1]), ['popup-first', 'popup-second'], 'Second popup candidate must retain both ordered mutations');
  assert.deepEqual(harness.sent.map(candidate => candidate._revision), [0, 1], 'Queued popup candidates must use consecutive remote revisions');
  assert.equal(harness.client.read()._revision, 2, 'Popup state must adopt the last confirmed revision');
  clientQueueCases++;
}

async function deterministicPopupQueueFailureInvalidation() {
  const harness = createPopupClientHarness();
  const gate = harness.deferFirst({
    ok: false,
    code: 'INJECTED_FIRST_WRITE_FAILURE',
    message: 'Injected first popup write failure',
  });
  harness.client.addToken('popup-failed-first');
  const first = harness.client.persist();
  await gate.started;
  harness.client.addToken('popup-must-not-send');
  const second = harness.client.persist();
  gate.release();

  const outcomes = await Promise.allSettled([first, second]);
  assert.deepEqual(outcomes.map(outcome => outcome.status), ['rejected', 'rejected']);
  assert.equal(outcomes[0].reason?.code, 'INJECTED_FIRST_WRITE_FAILURE');
  assert.equal(outcomes[1].reason?.code, 'LOCUS_STATE_QUEUE_INVALIDATED');
  assert.equal(harness.sent.length, 1, 'A failed popup write must invalidate every candidate already queued behind it');
  assert.deepEqual(stateTokens(harness.sent[0]), ['popup-failed-first'], 'The failed candidate must not absorb later optimistic state');

  harness.client.replace(makeState(0, ['popup-reloaded']));
  harness.client.addToken('popup-retry');
  await harness.client.persist();
  assert.equal(harness.sent.length, 2, 'A fresh candidate after recovery must be allowed to retry');
  assert.deepEqual(stateTokens(harness.sent[1]), ['popup-reloaded', 'popup-retry']);
  clientQueueCases++;
}

async function deterministicPopupCaptureFailureOverlap() {
  const sent = [];
  const removed = [];
  const toasts = [];
  let sendCount = 0;
  let signalStarted;
  let releaseFirst;
  const firstStarted = new Promise(resolve => { signalStarted = resolve; });
  const firstWait = new Promise(resolve => { releaseFirst = resolve; });
  const context = vm.createContext({
    __initialPopupState: makeState(),
    chrome: {
      runtime: {
        async sendMessage(message) {
          const candidate = clone(message.state);
          sent.push(candidate);
          sendCount++;
          if (sendCount === 1) {
            signalStarted();
            await firstWait;
            return { ok: false, code: 'INJECTED_CAPTURE_FAILURE', message: 'Injected capture failure' };
          }
          return { ok: true, revision: (Number(candidate._revision) || 0) + 1 };
        },
      },
      tabs: {
        async remove(tabId) { removed.push(tabId); },
      },
    },
    setTimeout() { return 0; },
    structuredClone,
    window: { close() {} },
  });

  vm.runInContext(
    `let state = structuredClone(globalThis.__initialPopupState);\n` +
      `const tr = key => key;\n` +
      `const toast = message => globalThis.__toasts.push(message);\n` +
      `let nextUid = 1;\n` +
      `const uid = () => 'capture-' + nextUid++;\n` +
      `const captureFields = tab => ({ title: tab.title || tab.url, fav: '' });\n` +
      `${popupWriterSource}\n${popupCaptureHelperSource}\n${popupCloneSource}\n` +
      `async function recoverCaptureWriteFailure(_error, snapshot) { state = structuredClone(snapshot); }\n` +
      `${popupDoSaveSource}\n` +
      `globalThis.__popupCapture = {\n` +
      `  save: (tabId, url) => {\n` +
      `    const ws = state.workspaces[0];\n` +
      `    const cat = ws.categories[0];\n` +
      `    const group = cat.groups[0];\n` +
      `    return doSave(ws, cat, group, { id: tabId, url, title: url });\n` +
      `  },\n` +
      `  read: () => structuredClone(state)\n` +
      `};`,
    Object.assign(context, { __toasts: toasts }),
    { filename: 'popup-capture-flow.js' },
  );

  const first = context.__popupCapture.save(1, 'https://first-capture.test');
  await firstStarted;
  const second = await context.__popupCapture.save(2, 'https://overlapping-capture.test');
  assert.equal(second, false, 'An overlapping popup capture must fail closed while the first receipt is pending');
  assert.equal(sent.length, 1, 'The overlapping popup capture must not enqueue another write');
  assert.deepEqual(removed, [], 'No popup source tab may close before the first write is confirmed');

  releaseFirst();
  assert.equal(await first, false, 'The injected first popup failure must be reported as unsuccessful');
  assert.deepEqual(removed, [], 'Neither source tab may close after the first write fails');
  const recoveredItems = context.__popupCapture.read().workspaces[0].categories[0].groups[0].items;
  assert.deepEqual(recoveredItems, [], 'Popup recovery must remove the failed optimistic capture');
  assert.ok(toasts.includes('captureBusy'), 'The rejected overlapping capture must remain visible to the user');

  assert.equal(await context.__popupCapture.save(3, 'https://retry-capture.test'), true, 'The popup capture mutex must release after failure');
  assert.deepEqual(removed, [3], 'Only the later confirmed retry may close its source tab');
  clientCaptureCases++;
}

function createControlledStorage(initialState) {
  let state = clone(initialState);
  let setCalls = 0;
  let getCalls = 0;
  const setFailures = [];

  return {
    local: {
      async get(key) {
        assert.ok(key === 'te' || key == null, `Unexpected storage key: ${String(key)}`);
        getCalls++;
        return { te: clone(state) };
      },
      async set(value) {
        setCalls++;
        const failure = setFailures.shift();
        if (failure) throw failure;
        assert.ok(value && value.te && typeof value.te === 'object', 'Whole-state write must contain te');
        state = clone(value.te);
      },
    },
    read() {
      return clone(state);
    },
    reset(nextState) {
      state = clone(nextState);
      setFailures.length = 0;
      setCalls = 0;
      getCalls = 0;
    },
    failNextSet(message = 'Injected storage set failure') {
      const error = new Error(message);
      error.code = 'INJECTED_SET_FAILURE';
      setFailures.push(error);
    },
    stats() {
      return { setCalls, getCalls };
    },
  };
}

function createExclusiveLocks() {
  let tail = Promise.resolve();
  let active = 0;
  let maxActive = 0;
  let requests = 0;

  return {
    request(name, options, task) {
      assert.equal(name, 'locus-state-write');
      if (typeof options === 'function') {
        task = options;
        options = { mode: 'exclusive' };
      }
      assert.equal(options?.mode, 'exclusive');
      assert.equal(typeof task, 'function');
      requests++;
      const run = tail.then(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        try {
          return await task({ name });
        } finally {
          active--;
        }
      });
      tail = run.catch(() => {});
      return run;
    },
    stats() {
      return { requests, maxActive };
    },
  };
}

function createHarness({ withLocks = false, initialState = makeState() } = {}) {
  const storage = createControlledStorage(initialState);
  const locks = withLocks ? createExclusiveLocks() : null;
  const notifications = [];
  const context = vm.createContext({
    chrome: {
      storage: { local: storage.local },
      notifications: {
        async create(id, options) {
          notifications.push({ id, options: clone(options) });
          return id;
        },
      },
      runtime: {
        getURL(file) {
          return `chrome-extension://locus/${file}`;
        },
      },
    },
    console: { error() {}, log() {}, warn() {} },
    navigator: locks ? { locks } : {},
    structuredClone,
  });

  vm.runInContext(
    `${writerSource}\n` +
      `globalThis.__writer = {\n` +
      `  setState,\n` +
      `  serializeError: typeof serializeStateWriteError === 'function' ? serializeStateWriteError : null,\n` +
      `  queue: () => typeof stateWriteQueue === 'undefined' ? null : stateWriteQueue\n` +
      `};`,
    context,
    { filename: 'background-state-writer.js' },
  );

  return { writer: context.__writer, storage, locks, notifications };
}

function startAttempt(writer, candidate, token) {
  let promise;
  try {
    promise = Promise.resolve(writer.setState(candidate));
  } catch (error) {
    promise = Promise.reject(error);
  }
  return { token, promise };
}

async function settleAttempts(attempts) {
  const settled = await Promise.allSettled(attempts.map(attempt => attempt.promise));
  return settled.map((result, index) => {
    const token = attempts[index].token;
    if (result.status === 'fulfilled') {
      return { token, status: 'accepted', revision: Number(result.value) };
    }
    const code = result.reason?.code || '';
    return {
      token,
      status: code === 'LOCUS_STATE_CONFLICT' ? 'rejected' : 'failed',
      error: result.reason,
    };
  });
}

function assertStatuses(outcomes, expected) {
  const details = outcomes
    .filter(outcome => outcome.error)
    .map(outcome => `${outcome.token}: ${outcome.error?.stack || outcome.error}`)
    .join('\n');
  assert.deepEqual(outcomes.map(outcome => outcome.status), expected, details);
}

function assertOracle({ state, initialRevision, baseTokens = [], outcomes }) {
  const accepted = outcomes.filter(outcome => outcome.status === 'accepted');
  const rejected = outcomes.filter(outcome => outcome.status === 'rejected');
  const failed = outcomes.filter(outcome => outcome.status === 'failed');
  const actualTokens = stateTokens(state);
  const counts = new Map();
  for (const token of actualTokens) counts.set(token, (counts.get(token) || 0) + 1);

  for (const token of baseTokens) assert.equal(counts.get(token), 1, `Base token ${token} must survive exactly once`);
  for (const outcome of accepted) {
    assert.equal(counts.get(outcome.token), 1, `Accepted token ${outcome.token} must persist exactly once`);
  }
  for (const outcome of [...rejected, ...failed]) {
    assert.equal(counts.get(outcome.token) || 0, 0, `${outcome.status} token ${outcome.token} must not persist`);
  }

  const expectedTokens = new Set([...baseTokens, ...accepted.map(outcome => outcome.token)]);
  assert.equal(actualTokens.length, expectedTokens.size, 'Final state contains an unaccounted-for or duplicate token');
  assert.equal(state._revision, initialRevision + accepted.length, 'Revision must advance exactly once per accepted mutation');

  const revisions = accepted.map(outcome => outcome.revision).sort((a, b) => a - b);
  assert.deepEqual(
    revisions,
    Array.from({ length: accepted.length }, (_, index) => initialRevision + index + 1),
    'Accepted receipts must report unique, contiguous revisions',
  );

  return { accepted: accepted.length, rejected: rejected.length, failed: failed.length };
}

let deterministicCases = 0;

async function deterministicSingleSuccess(withLocks) {
  const harness = createHarness({ withLocks });
  const token = `single-${withLocks ? 'lock' : 'queue'}`;
  const candidate = addToken(harness.storage.read(), token);
  const outcomes = await settleAttempts([startAttempt(harness.writer, candidate, token)]);
  assertStatuses(outcomes, ['accepted']);
  assertOracle({ state: harness.storage.read(), initialRevision: 0, outcomes });
  if (withLocks) {
    assert.equal(harness.locks.stats().requests, 1, 'Lock-supported writes must request the shared lock');
    assert.equal(harness.locks.stats().maxActive, 1, 'The shared lock must remain exclusive');
  }
  deterministicCases++;
}

async function deterministicCollision(withLocks, reverse) {
  const harness = createHarness({ withLocks });
  const snapshot = harness.storage.read();
  const tokens = reverse ? ['collision-b', 'collision-a'] : ['collision-a', 'collision-b'];
  const attempts = tokens.map(token => startAttempt(harness.writer, addToken(snapshot, token), token));
  const outcomes = await settleAttempts(attempts);
  assertStatuses(outcomes, ['accepted', 'rejected']);
  assertOracle({ state: harness.storage.read(), initialRevision: 0, outcomes });
  if (harness.writer.serializeError) {
    const serialized = harness.writer.serializeError(outcomes[1].error);
    assert.equal(serialized.code, 'LOCUS_STATE_CONFLICT', 'Conflict serialization must preserve its stable code');
  }
  deterministicCases++;
}

async function deterministicStaleThenFresh(withLocks) {
  const initialRevision = 4;
  const baseTokens = ['base-stale'];
  const harness = createHarness({ withLocks, initialState: makeState(initialRevision, baseTokens) });
  const stale = addToken(makeState(initialRevision - 1, baseTokens), 'stale-token');
  const fresh = addToken(harness.storage.read(), 'fresh-token');
  const outcomes = await settleAttempts([
    startAttempt(harness.writer, stale, 'stale-token'),
    startAttempt(harness.writer, fresh, 'fresh-token'),
  ]);
  assertStatuses(outcomes, ['rejected', 'accepted']);
  assertOracle({ state: harness.storage.read(), initialRevision, baseTokens, outcomes });
  deterministicCases++;
}

async function deterministicSetFailureRecovery(withLocks) {
  const harness = createHarness({ withLocks });
  const snapshot = harness.storage.read();
  harness.storage.failNextSet();
  const firstWave = await settleAttempts([
    startAttempt(harness.writer, addToken(snapshot, 'failed-token'), 'failed-token'),
    startAttempt(harness.writer, addToken(snapshot, 'queue-survives'), 'queue-survives'),
  ]);
  assertStatuses(firstWave, ['failed', 'accepted']);

  const recoveryToken = 'fresh-recovery';
  const recovery = await settleAttempts([
    startAttempt(harness.writer, addToken(harness.storage.read(), recoveryToken), recoveryToken),
  ]);
  assertStatuses(recovery, ['accepted']);
  assertOracle({ state: harness.storage.read(), initialRevision: 0, outcomes: [...firstWave, ...recovery] });
  deterministicCases++;
}

async function runDeterministicMatrix() {
  for (const withLocks of [true, false]) {
    await deterministicSingleSuccess(withLocks);
    await deterministicCollision(withLocks, false);
    await deterministicCollision(withLocks, true);
    await deterministicStaleThenFresh(withLocks);
    await deterministicSetFailureRecovery(withLocks);
  }
}

async function runRandomizedLocklessStress() {
  const random = xorshift32(seed);
  const harness = createHarness({ withLocks: false });
  const totals = { accepted: 0, rejected: 0, failed: 0, attempts: 0 };
  let staleSnapshot = null;

  for (let trial = 0; trial < randomizedRuns; trial++) {
    const initialRevision = Math.floor(random() * 6);
    const baseTokens = random() < 0.5 ? [`base-${trial}`] : [];
    harness.storage.reset(makeState(initialRevision, baseTokens));
    staleSnapshot = null;
    const outcomes = [];
    const waveCount = 1 + Math.floor(random() * 3);

    try {
      for (let wave = 0; wave < waveCount; wave++) {
        const current = harness.storage.read();
        const injectFailure = (trial + wave) % 37 === 0;
        const clientCount = 2 + Math.floor(random() * 4);
        const descriptors = [];

        for (let client = 0; client < clientCount; client++) {
          const mustBeFresh = client === 0 || (injectFailure && client === 1);
          const useStale = !mustBeFresh && staleSnapshot && random() < 0.35;
          const base = useStale ? staleSnapshot : current;
          const token = `rnd-${trial}-${wave}-${client}`;
          descriptors.push({ token, candidate: addToken(base, token) });
        }

        staleSnapshot = current;
        if (injectFailure) harness.storage.failNextSet(`Injected randomized failure at ${trial}/${wave}`);
        const scheduled = shuffle(descriptors, random);
        const waveOutcomes = await settleAttempts(
          scheduled.map(({ candidate, token }) => startAttempt(harness.writer, candidate, token)),
        );
        outcomes.push(...waveOutcomes);
      }

      const counts = assertOracle({
        state: harness.storage.read(),
        initialRevision,
        baseTokens,
        outcomes,
      });
      totals.accepted += counts.accepted;
      totals.rejected += counts.rejected;
      totals.failed += counts.failed;
      totals.attempts += outcomes.length;
    } catch (error) {
      error.message += `\nRandomized concurrency replay: node scripts/concurrency-contract-test.js --seed ${seedLabel} --runs ${randomizedRuns}`;
      error.message += `\nFailed trial: ${trial}`;
      throw error;
    }
  }

  assert.ok(totals.accepted > 0, 'Randomized stress must exercise accepted mutations');
  assert.ok(totals.rejected > 0, 'Randomized stress must exercise revision conflicts');
  assert.ok(totals.failed > 0, 'Randomized stress must exercise storage failures');
  return totals;
}

(async () => {
  await deterministicPopupQueueSuccess();
  await deterministicPopupQueueFailureInvalidation();
  await deterministicPopupCaptureFailureOverlap();
  await runDeterministicMatrix();
  const totals = await runRandomizedLocklessStress();
  console.log(
    `Concurrency contracts passed: clientQueues=${clientQueueCases}, captureFlows=${clientCaptureCases}, ` +
    `deterministic=${deterministicCases}, ` +
    `randomized=${randomizedRuns}, seed=${seedLabel}, attempts=${totals.attempts}, ` +
    `accepted=${totals.accepted}, rejected=${totals.rejected}, failed=${totals.failed}`,
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
