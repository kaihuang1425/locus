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
const popupUrlPolicyStart = popupSource.indexOf('const POPUP_CAPTURABLE_PROTOCOLS');
const popupUrlPolicyEnd = popupSource.indexOf('\nconst uid', popupUrlPolicyStart);
const popupCaptureFilterStart = popupSource.indexOf('function filterPopupCaptureTabs(');
const popupCaptureFilterEnd = popupSource.indexOf('\nfunction popupCaptureError(', popupCaptureFilterStart);
const popupWriterStart = popupSource.indexOf('let popupStateWriteQueue');
const popupWriterEnd = popupSource.indexOf('\nconst appLocale', popupWriterStart);
const popupCloneStart = popupSource.indexOf('function clonePopupState()');
const popupCloneEnd = popupSource.indexOf('\nfunction showCaptureFailure', popupCloneStart);
const popupCaptureHelperStart = popupSource.indexOf('function beginPopupCapture()');
const popupCaptureHelperEnd = popupSource.indexOf('\nconst THEME_IDS', popupCaptureHelperStart);
const popupDoSaveStart = popupSource.indexOf('async function doSave(');
const popupDoSaveEnd = popupSource.indexOf('\nfunction loadHibernatePrefs', popupDoSaveStart);
const popupHibernateStart = popupSource.indexOf('function popupHibernateSourceDescriptor(');
const popupHibernateEnd = popupSource.indexOf('\nasync function hibernateSelectedScope', popupHibernateStart);
const popupHibernateSelectedStart = popupHibernateEnd + 1;
const popupHibernateSelectedEnd = popupSource.indexOf('\nasync function saveTabsBeforeHibernate', popupHibernateSelectedStart);
assert.ok(popupUrlPolicyStart >= 0 && popupUrlPolicyEnd > popupUrlPolicyStart, 'Popup capturable URL policy must be extractable');
assert.ok(popupCaptureFilterStart >= 0 && popupCaptureFilterEnd > popupCaptureFilterStart, 'Popup capture duplicate filter must be extractable');
assert.ok(popupWriterStart >= 0 && popupWriterEnd > popupWriterStart, 'Popup state writer must be extractable');
assert.ok(popupCloneStart >= 0 && popupCloneEnd > popupCloneStart, 'Popup state clone helper must be extractable');
assert.ok(popupCaptureHelperStart >= 0 && popupCaptureHelperEnd > popupCaptureHelperStart, 'Popup capture mutex must be extractable');
assert.ok(popupDoSaveStart >= 0 && popupDoSaveEnd > popupDoSaveStart, 'Popup single-tab capture must be extractable');
assert.ok(popupHibernateStart >= 0 && popupHibernateEnd > popupHibernateStart, 'Popup single-tab Hibernate must be extractable');
assert.ok(popupHibernateSelectedStart > 0 && popupHibernateSelectedEnd > popupHibernateSelectedStart, 'Popup bulk Hibernate must be extractable');
// doSave and the Hibernate source descriptor both guard on the shared URL policy,
// and doSave filters duplicates before it writes, so the harnesses load the real
// policy and filter instead of stubs.
const popupUrlPolicySource = popupSource.slice(popupUrlPolicyStart, popupUrlPolicyEnd);
const popupCaptureFilterSource = popupSource.slice(popupCaptureFilterStart, popupCaptureFilterEnd);
const popupWriterSource = popupSource.slice(popupWriterStart, popupWriterEnd);
const popupCloneSource = popupSource.slice(popupCloneStart, popupCloneEnd);
const popupCaptureHelperSource = popupSource.slice(popupCaptureHelperStart, popupCaptureHelperEnd);
const popupDoSaveSource = popupSource.slice(popupDoSaveStart, popupDoSaveEnd);
const popupHibernateSource = popupSource.slice(popupHibernateStart, popupHibernateEnd);
const popupHibernateSelectedSource = popupSource.slice(popupHibernateSelectedStart, popupHibernateSelectedEnd);

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
  let responseMode = 'normal';

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
          if (responseMode === 'missing-receiver-once') {
            responseMode = 'normal';
            throw new Error('Could not establish connection. Receiving end does not exist.');
          }
          if (responseMode === 'missing-receiver-always') {
            throw new Error('Could not establish connection. Receiving end does not exist.');
          }
          if (responseMode === 'close-after-accept') {
            throw new Error('The message port closed before a response was received.');
          }
          const localRevision = Number(candidate?._revision) || 0;
          return { ok: true, revision: localRevision + 1 };
        },
      },
    },
    LOCUS_STATE_RECEIVER_RETRY_MS: 1,
    setTimeout,
    clearTimeout,
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
    setResponseMode(mode) { responseMode = mode; },
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

async function deterministicPopupReceiverAvailability() {
  const transient = createPopupClientHarness();
  transient.setResponseMode('missing-receiver-once');
  transient.client.addToken('popup-transient-receiver');
  await transient.client.persist();
  assert.equal(transient.sent.length, 2, 'A transient missing popup receiver must retry exactly once');
  assert.deepEqual(transient.sent[1], transient.sent[0], 'A popup receiver retry must resend the immutable candidate');
  assert.equal(transient.client.read()._revision, 1, 'A confirmed popup receiver retry must adopt its revision');
  clientQueueCases++;

  const absent = createPopupClientHarness();
  absent.setResponseMode('missing-receiver-always');
  absent.client.addToken('popup-absent-receiver');
  const absentOutcome = await Promise.allSettled([absent.client.persist()]);
  assert.equal(absentOutcome[0].status, 'rejected');
  assert.equal(absentOutcome[0].reason?.code, 'LOCUS_STATE_RECEIVER_UNAVAILABLE');
  assert.equal(absent.sent.length, 3, 'A persistently absent popup receiver must stop after three attempts');
  assert.equal(absent.client.read()._revision, 0, 'An unconfirmed popup write must not advance its local revision');
  clientQueueCases++;

  const ambiguous = createPopupClientHarness();
  ambiguous.setResponseMode('close-after-accept');
  ambiguous.client.addToken('popup-ambiguous-receipt');
  const ambiguousOutcome = await Promise.allSettled([ambiguous.client.persist()]);
  assert.equal(ambiguousOutcome[0].status, 'rejected');
  assert.equal(ambiguousOutcome[0].reason?.code, 'LOCUS_STATE_UNKNOWN_ACK');
  assert.equal(ambiguous.sent.length, 1, 'An ambiguous popup receipt failure must never be retried');
  assert.equal(ambiguous.client.read()._revision, 0, 'An ambiguous popup receipt must not advance its local revision');
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
    clearTimeout() {},
    structuredClone,
    URL,
    window: { close() {} },
    document: { body: { classList: { add() {}, remove() {} } } },
  });

  vm.runInContext(
    `let state = structuredClone(globalThis.__initialPopupState);\n` +
      `const $ = () => ({ setAttribute() {} });\n` +
      `const tr = key => key;\n` +
      `const toast = message => globalThis.__toasts.push(message);\n` +
      `let nextUid = 1;\n` +
      `const uid = () => 'capture-' + nextUid++;\n` +
      `const captureFields = tab => ({ title: tab.title || tab.url, fav: '' });\n` +
      `const popupCaptureTargetDescriptor = ({ ws, cat, group }) => ({ workspaceId: ws.id, categoryId: cat.id, groupId: group.id });\n` +
      `const createPopupCaptureIdAllocator = () => uid;\n` +
      `const materializePopupCaptureTarget = (candidate, descriptor) => {\n` +
      `  const ws = candidate.workspaces.find(entry => entry.id === descriptor.workspaceId);\n` +
      `  const cat = ws?.categories.find(entry => entry.id === descriptor.categoryId);\n` +
      `  const group = cat?.groups.find(entry => entry.id === descriptor.groupId);\n` +
      `  if (!ws || !cat || !group) throw new Error('Popup capture target unavailable');\n` +
      `  return { ws, cat, group };\n` +
      `};\n` +
      `const popupCaptureError = (code, message) => Object.assign(new Error(message), { code });\n` +
      `const closeOrdinaryPopupSavedTab = async (intent, closeEnabled) => {\n` +
      `  if (closeEnabled !== true) return { closed: false, reason: 'disabled' };\n` +
      `  await chrome.tabs.remove(intent.sourceTabId);\n` +
      `  return { closed: true, reason: null };\n` +
      `};\n` +
      `let activeTabId = null;\n` +
      `${popupWriterSource}\n${popupCaptureHelperSource}\n${popupCloneSource}\n` +
      `async function recoverCaptureWriteFailure(_error, snapshot) { state = structuredClone(snapshot); }\n` +
      `${popupUrlPolicySource}\n${popupCaptureFilterSource}\n${popupDoSaveSource}\n` +
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
  await Promise.race([
    firstStarted,
    first.then(outcome => {
      throw new Error(`Popup capture returned ${String(outcome)} before dispatching its state write`);
    }),
  ]);
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

async function deterministicPopupHibernateCaptureInterlock() {
  const updates = [];
  const tabGets = [];
  const loads = [];
  const toasts = [];
  const liveTabs = new Map([
    [41, { id: 41, windowId: 7, active: false, url: 'https://hibernate-first.test' }],
    [43, { id: 43, windowId: 7, active: false, url: 'https://hibernate-failure.test' }],
  ]);
  let signalUpdateStarted;
  let releaseUpdate;
  let rejectUpdate = false;
  let releasePriorWrite;
  const updateStarted = new Promise(resolve => { signalUpdateStarted = resolve; });
  const updateWait = new Promise(resolve => { releaseUpdate = resolve; });
  const priorWrite = new Promise(resolve => { releasePriorWrite = resolve; });
  const context = vm.createContext({
    chrome: {
      tabs: {
        async get(tabId) {
          tabGets.push(tabId);
          const value = liveTabs.get(tabId);
          if (value instanceof Error) throw value;
          return clone(value);
        },
        async update(tabId, change) {
          updates.push({ tabId, change: clone(change) });
          signalUpdateStarted();
          await updateWait;
          if (rejectUpdate) throw new Error('Injected single-tab Hibernate failure');
          return { id: tabId, ...change };
        },
      },
    },
    document: {
      activeElement: null,
      body: { classList: { add() {}, remove() {} } },
    },
    URL,
  });

  vm.runInContext(
      `let popupStateRecoveryRequired = false;\n` +
      `let popupCapturePending = false;\n` +
      `let popupCaptureControl = null;\n` +
      `let popupStateWriteQueue = globalThis.__priorWrite;\n` +
      `const $ = () => ({ setAttribute() {}, removeAttribute() {} });\n` +
      `const tr = key => key;\n` +
      `const toast = message => globalThis.__toasts.push(message);\n` +
      `const showCaptureFailure = () => {};\n` +
      `const buildSuspendedUrl = ({ url }) => 'suspended:' + url;\n` +
      `const localFaviconUrl = () => 'local-favicon';\n` +
      `async function load() { globalThis.__loads.push('load'); }\n` +
      `${popupUrlPolicySource}\n${popupCaptureHelperSource}\n${popupHibernateSource}\n` +
      `globalThis.__hibernateFlow = {\n` +
      `  hibernate: hibernateSingle,\n` +
      `  descriptor: popupHibernateSourceDescriptor,\n` +
      `  matches: popupHibernateSourceStillMatches,\n` +
      `  setQueue: value => { popupStateWriteQueue = value; },\n` +
      `  begin: beginPopupCapture,\n` +
      `  finish: finishPopupCapture,\n` +
      `};`,
    Object.assign(context, { __loads: loads, __priorWrite: priorWrite, __toasts: toasts }),
    { filename: 'popup-hibernate-capture-flow.js' },
  );

  const reviewed = context.__hibernateFlow.descriptor({
    id: 44,
    windowId: 7,
    active: false,
    url: 'https://reviewed.test',
    title: 'Reviewed tab',
  });
  assert.ok(reviewed && Object.isFrozen(reviewed), 'Hibernate must freeze a valid reviewed source descriptor');
  assert.equal(context.__hibernateFlow.descriptor({
    id: -1,
    windowId: 7,
    active: false,
    url: 'https://reviewed.test',
  }), null, 'Hibernate must reject an invalid source descriptor');
  assert.equal(context.__hibernateFlow.matches({
    id: 44,
    windowId: 7,
    active: false,
    url: 'https://reviewed.test',
    pendingUrl: 'https://reviewed.test',
  }, reviewed), true, 'Hibernate must accept the exact reviewed source and matching redirect state');
  const changedSources = [
    null,
    { id: 44, windowId: 8, active: false, url: 'https://reviewed.test' },
    { id: 44, windowId: 7, active: true, url: 'https://reviewed.test' },
    { id: 44, windowId: 7, active: false, url: 'https://changed.test' },
    { id: 44, windowId: 7, active: false, url: 'https://reviewed.test', pendingUrl: 'https://redirecting.test' },
    { id: 44, windowId: 7, active: false, url: 'https://reviewed.test', pendingUrl: {} },
  ];
  changedSources.forEach((tab, index) => {
    assert.equal(
      context.__hibernateFlow.matches(tab, reviewed),
      false,
      `Hibernate must reject changed source case ${index + 1}`,
    );
  });

  const firstTab = {
    id: 41,
    windowId: 7,
    active: false,
    url: 'https://hibernate-first.test',
    title: 'Hibernate first',
  };
  const first = context.__hibernateFlow.hibernate(firstTab);
  firstTab.url = 'https://mutated-after-review.test';
  firstTab.title = 'Mutated after review';
  await Promise.resolve();
  const updateStartedBeforePriorWrite = updates.length > 0;
  releasePriorWrite();
  await updateStarted;
  const competingCapture = context.__hibernateFlow.begin();
  if (competingCapture) context.__hibernateFlow.finish();
  releaseUpdate();

  assert.equal(await first, true, 'A confirmed one-tab Hibernate must report success');
  assert.equal(updateStartedBeforePriorWrite, false, 'One-tab Hibernate must drain an earlier popup write before its browser effect');
  assert.equal(competingCapture, false, 'A pending one-tab Hibernate must block a competing capture');
  assert.equal(updates.length, 1, 'A one-tab Hibernate must update its reviewed tab once');
  assert.equal(updates[0].change.url, 'suspended:https://hibernate-first.test', 'Hibernate must use the immutable pre-wait source URL');
  assert.deepEqual(tabGets, [41], 'One-tab Hibernate must fresh-read its reviewed tab once before replacement');
  assert.deepEqual(loads, ['load'], 'A confirmed one-tab Hibernate must refresh the popup once');
  assert.ok(toasts.includes('captureBusy'), 'The blocked competing capture must use existing busy feedback');

  assert.equal(context.__hibernateFlow.begin(), true, 'The Hibernate interlock must release after success');
  const updateCount = updates.length;
  const loadCount = loads.length;
  assert.equal(await context.__hibernateFlow.hibernate({
    id: 42,
    windowId: 7,
    active: false,
    url: 'https://capture-first.test',
    title: 'Capture first',
  }), false, 'A pending capture must refuse one-tab Hibernate');
  assert.equal(updates.length, updateCount, 'Blocked one-tab Hibernate must not navigate a tab');
  assert.equal(loads.length, loadCount, 'Blocked one-tab Hibernate must not reload popup state');
  context.__hibernateFlow.finish();

  let releaseChangedSourceWrite;
  const changedSourceWrite = new Promise(resolve => { releaseChangedSourceWrite = resolve; });
  context.__hibernateFlow.setQueue(changedSourceWrite);
  liveTabs.set(44, {
    id: 44,
    windowId: 7,
    active: false,
    url: 'https://reviewed.test',
  });
  const changedUpdateCount = updates.length;
  const changedLoadCount = loads.length;
  const changed = context.__hibernateFlow.hibernate({
    id: 44,
    windowId: 7,
    active: false,
    url: 'https://reviewed.test',
    title: 'Reviewed tab',
  });
  liveTabs.set(44, {
    id: 44,
    windowId: 7,
    active: true,
    url: 'https://reviewed.test',
  });
  releaseChangedSourceWrite();
  assert.equal(await changed, false, 'A tab that becomes active during the write wait must stay open');
  assert.equal(updates.length, changedUpdateCount, 'Changed one-tab Hibernate must not navigate the source');
  assert.equal(loads.length, changedLoadCount, 'Changed one-tab Hibernate must not reload popup state');

  liveTabs.set(45, new Error('Injected missing Hibernate source'));
  const missingUpdateCount = updates.length;
  const missingLoadCount = loads.length;
  assert.equal(await context.__hibernateFlow.hibernate({
    id: 45,
    windowId: 7,
    active: false,
    url: 'https://missing-source.test',
    title: 'Missing source',
  }), false, 'An unavailable reviewed source must stay open');
  assert.equal(updates.length, missingUpdateCount, 'Unavailable one-tab Hibernate must not navigate a tab');
  assert.equal(loads.length, missingLoadCount, 'Unavailable one-tab Hibernate must not reload popup state');

  rejectUpdate = true;
  const failedUpdateCount = updates.length;
  const failedLoadCount = loads.length;
  assert.equal(await context.__hibernateFlow.hibernate({
    id: 43,
    windowId: 7,
    active: false,
    url: 'https://hibernate-failure.test',
    title: 'Hibernate failure',
  }), false, 'A failed one-tab Hibernate must report failure');
  assert.equal(updates.length, failedUpdateCount + 1, 'A failed one-tab Hibernate must not retry its browser effect');
  assert.equal(loads.length, failedLoadCount, 'A failed one-tab Hibernate must not reload popup state');
  assert.ok(toasts.includes('couldNotHibernate'), 'A failed one-tab Hibernate must retain existing failure feedback');
  assert.equal(context.__hibernateFlow.begin(), true, 'The Hibernate interlock must release after failure');
  context.__hibernateFlow.finish();
  assert.match(
    popupHibernateSelectedSource,
    /await popupStateWriteQueue;[\s\S]*?const targets = await getHibernateCandidates\(\);/,
    'Bulk Hibernate must drain earlier popup writes before reading or updating browser tabs',
  );
  assert.match(
    popupHibernateSource,
    /async function confirmPopupHibernateSource\(descriptor\)[\s\S]*?chrome\.tabs\.get\(descriptor\.tabId\)[\s\S]*?popupHibernateSourceStillMatches\(current, descriptor\)/,
    'Hibernate must fresh-read and revalidate the immutable source before replacement',
  );
  assert.match(
    popupHibernateSelectedSource,
    /const sourceDescriptors = targets\.map\(popupHibernateSourceDescriptor\)[\s\S]*?saveTabsBeforeHibernate\(targets\)[\s\S]*?for \(const descriptor of sourceDescriptors\)[\s\S]*?confirmPopupHibernateSource\(descriptor\)[\s\S]*?chrome\.tabs\.update\(descriptor\.tabId/,
    'Bulk Save-before-Hibernate must fresh-confirm every immutable source after persistence before replacement',
  );
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
  await deterministicPopupReceiverAvailability();
  await deterministicPopupCaptureFailureOverlap();
  await deterministicPopupHibernateCaptureInterlock();
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
