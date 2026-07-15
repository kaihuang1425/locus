'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8');
const start = source.indexOf('const State = (() => {');
const endMarker = '\n})();';
const end = source.indexOf(endMarker, start);
assert.ok(start >= 0 && end > start, 'State implementation must be extractable');

const clone = value => JSON.parse(JSON.stringify(value));
let stored = { te: { _revision: 0 } };
let nextTabId = 100;
let failOnceUrl = null;
let failSetOnce = false;
let failGetOnce = false;
let stateWriteResponseMode = 'normal';
let stateWriteCalls = 0;
let activeStateWrites = 0;
let maxActiveStateWrites = 0;
const failedUrls = new Set();
const openedTabs = new Map();
const createCalls = [];
const removeCalls = [];
const toastMessages = [];
let deferredRemove = null;
let deferredCreate = null;
let deferredGet = null;

function deferNextRemove() {
  let signalStarted;
  let release;
  const started = new Promise(resolve => { signalStarted = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  deferredRemove = { signalStarted, wait };
  return { started, release };
}

function deferNextCreate(url) {
  let signalStarted;
  let release;
  const started = new Promise(resolve => { signalStarted = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  deferredCreate = { url, signalStarted, wait };
  return { started, release };
}

function deferNextGet() {
  let signalStarted;
  let release;
  const started = new Promise(resolve => { signalStarted = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  deferredGet = { signalStarted, wait };
  return { started, release };
}

const chrome = {
  storage: {
    local: {
      async get() {
        if (failGetOnce) { failGetOnce = false; throw new Error('injected recovery read failure'); }
        const snapshot = clone(stored);
        if (deferredGet) {
          const pending = deferredGet;
          deferredGet = null;
          pending.signalStarted();
          await pending.wait;
        }
        return snapshot;
      },
      async set(value) {
        if (failSetOnce) { failSetOnce = false; throw new Error('injected persistence failure'); }
        stored = clone(value);
      },
    },
  },
  runtime: {
    async sendMessage(message) {
      assert.equal(message?.type, 'locus-state-write');
      const candidate = clone(message.state);
      stateWriteCalls += 1;
      activeStateWrites += 1;
      maxActiveStateWrites = Math.max(maxActiveStateWrites, activeStateWrites);
      try {
        await new Promise(resolve => setImmediate(resolve));
        const remoteRevision = Number(stored.te?._revision) || 0;
        const localRevision = Number(candidate?._revision) || 0;
        if (remoteRevision !== localRevision) {
          return { ok: false, code: 'LOCUS_STATE_CONFLICT', message: 'Locus changed in another window.' };
        }
        const revision = localRevision + 1;
        candidate._revision = revision;
        try {
          await chrome.storage.local.set({ te: candidate });
        } catch (error) {
          return { ok: false, code: 'LOCUS_STATE_WRITE_FAILED', message: error.message };
        }
        if (stateWriteResponseMode === 'drop-after-accept') {
          stateWriteResponseMode = 'normal';
          return undefined;
        }
        if (stateWriteResponseMode === 'hang-after-accept') {
          stateWriteResponseMode = 'normal';
          await new Promise(() => {});
        }
        return { ok: true, revision };
      } finally {
        activeStateWrites -= 1;
      }
    },
  },
  tabs: {
    async create(options) {
      createCalls.push(options.url);
      if (deferredCreate?.url === options.url) {
        const pending = deferredCreate;
        deferredCreate = null;
        pending.signalStarted();
        await pending.wait;
      }
      if (options.url === failOnceUrl && !failedUrls.has(options.url)) {
        failedUrls.add(options.url);
        throw new Error('injected create failure');
      }
      const tab = { id: nextTabId++, ...options };
      openedTabs.set(tab.id, tab);
      return tab;
    },
    async get(tabId) {
      if (!openedTabs.has(tabId)) throw new Error('tab not found');
      return openedTabs.get(tabId);
    },
    async remove(tabId) {
      removeCalls.push(tabId);
      if (!deferredRemove) return;
      const pending = deferredRemove;
      deferredRemove = null;
      pending.signalStarted();
      await pending.wait;
    },
  },
};

const context = vm.createContext({
  browserLanguage: () => 'en',
  chrome,
  clearTimeout,
  console,
  CURRENT_SCHEMA: 11,
  LOCUS_STATE_WRITE_TIMEOUT_MS: 25,
  handleStorageError() {},
  loadedSchema: 0,
  navigator: {},
  applySettings() {},
  renderAll() {},
  recoverAfterOrdinaryWriteFailure() {},
  refreshStorageUsage() {},
  setTimeout,
  showStateRecoveryRequired() {},
  structuredClone,
  toast(message) { toastMessages.push(String(message)); },
});
vm.runInContext(
  `${source.slice(start, end + endMarker.length)}\nglobalThis.__state = State;`,
  context,
  { filename: 'newtab-state.js' },
);
const State = context.__state;
context.restoreAuthoritativeState = async (options = {}) => {
  await State.recoverAuthoritative(options);
  context.renderAll();
  return true;
};
const commitStart = source.indexOf('let captureCommitPending = false;');
const commitEnd = source.indexOf('\nfunction captureResultMessage(', commitStart);
assert.ok(commitStart >= 0 && commitEnd > commitStart, 'Capture commit implementation must be extractable');
vm.runInContext(
  `${source.slice(commitStart, commitEnd)}\nglobalThis.__commitCapturedTabs = commitCapturedTabs;`,
  context,
  { filename: 'newtab-capture-commit.js' },
);
const commitCapturedTabs = context.__commitCapturedTabs;

(async () => {
  await State.load();
  State.get().settings.queueMarker = 'same-context';
  await Promise.all([State.persistNow(), State.persistNow()]);
  assert.equal(maxActiveStateWrites, 1, 'same-context page writes must wait for the prior revision receipt');
  assert.equal(stored.te._revision, 2, 'serialized same-context writes must receive consecutive revisions');

  const inFlightAction = State.snapshot('in-flight capture');
  State.get().settings.marker = 'in-flight';
  const removeGate = deferNextRemove();
  const committing = commitCapturedTabs(
    [{ id: 7, url: 'https://in-flight.test', pinned: false }],
    { actionId: inFlightAction, closeSources: true },
  );
  await removeGate.started;

  const writesBeforeOverlap = stateWriteCalls;
  const overlappingAction = State.snapshot('overlapping capture');
  State.get().settings.marker = 'overlapping-capture';
  const overlappingResult = await commitCapturedTabs(
    [{ id: 8, url: 'https://overlapping.test', pinned: false }],
    { actionId: overlappingAction, closeSources: true },
  );
  assert.equal(overlappingResult, false, 'a second capture must fail closed while the first still owns browser side effects');
  assert.equal(State.get().settings.marker, 'in-flight', 'the second optimistic capture must roll back immediately');
  assert.equal(stateWriteCalls, writesBeforeOverlap, 'the rejected overlapping capture must not enqueue another write');
  assert.deepEqual(removeCalls, [7], 'the rejected overlapping capture source must stay open');

  await assert.rejects(State.undo(inFlightAction), error => error?.code === 'LOCUS_UNDO_PENDING');
  assert.equal(State.get().settings.marker, 'in-flight');
  assert.equal(State.canUndo(), false, 'an in-flight capture must not be exposed as undoable');

  const laterDuringCapture = State.snapshot('later ordinary change');
  State.get().settings.marker = 'later';
  await State.undo(laterDuringCapture);
  assert.equal(State.get().settings.marker, 'in-flight', 'a newer ordinary action must remain independently undoable');
  await assert.rejects(State.undo(inFlightAction), error => error?.code === 'LOCUS_UNDO_PENDING');

  removeGate.release();
  const committed = await committing;
  assert.equal(committed.closedCount, 1);
  assert.deepEqual(removeCalls, [7]);
  assert.equal(State.canUndo(), true, 'capture must become undoable after close effects are registered');
  await State.undo(inFlightAction);
  assert.equal(State.get().settings.marker, undefined);
  assert.equal(createCalls.filter(url => url === 'https://in-flight.test').length, 1);
  createCalls.length = 0;
  openedTabs.clear();

  const captureAction = State.snapshot('capture');
  State.get().settings.marker = 'captured';
  const laterAction = State.snapshot('later change');
  State.get().settings.marker = 'later';
  assert.equal(State.registerClosedTabs(captureAction, [{ url: 'https://capture.test', pinned: true }]), true);

  await assert.rejects(State.undo(captureAction), error => error?.code === 'LOCUS_UNDO_STALE');
  assert.deepEqual(createCalls, [], 'a stale action-scoped Undo must not reopen tabs');
  assert.equal(State.get().settings.marker, 'later');

  await State.undo(laterAction);
  assert.equal(State.get().settings.marker, 'captured');
  await State.undo(captureAction);
  assert.equal(State.get().settings.marker, undefined);
  assert.deepEqual(createCalls, ['https://capture.test']);

  const retryAction = State.snapshot('retryable capture');
  State.get().settings.marker = 'retryable';
  State.registerClosedTabs(retryAction, [
    { url: 'https://first.test', pinned: false },
    { url: 'https://second.test', pinned: false },
  ]);
  failOnceUrl = 'https://second.test';

  await assert.rejects(State.undo(retryAction), /injected create failure/);
  assert.equal(State.get().settings.marker, 'retryable');
  assert.equal(createCalls.filter(url => url === 'https://first.test').length, 1);

  await State.undo(retryAction);
  assert.equal(State.get().settings.marker, undefined);
  assert.equal(createCalls.filter(url => url === 'https://first.test').length, 1, 'retry must not duplicate an already-restored tab');
  assert.equal(createCalls.filter(url => url === 'https://second.test').length, 2, 'only the failed tab should be retried');

  const persistRetryAction = State.snapshot('persistence retry');
  State.get().settings.marker = 'persistence-retry';
  State.registerClosedTabs(persistRetryAction, [{ url: 'https://persist.test', pinned: false }]);
  failSetOnce = true;
  await assert.rejects(State.undo(persistRetryAction), error => error?.code === 'LOCUS_UNDO_INTERRUPTED');
  assert.equal(State.isRecoveryRequired(), true, 'an Undo write failure must block later mutations until authoritative recovery');
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.marker, undefined, 'failed Undo persistence must restore the exact authoritative graph');
  assert.equal(State.canUndo(), false, 'authoritative recovery must clear the stale Undo token');
  assert.equal(createCalls.filter(url => url === 'https://persist.test').length, 1, 'the source tab reopened before persistence failed must not be duplicated');

  const interleavedAction = State.snapshot('interleaved capture undo');
  State.get().settings.marker = 'captured-before-interleave';
  State.registerClosedTabs(interleavedAction, [
    { url: 'https://interleaved-first.test', pinned: false },
    { url: 'https://interleaved-second.test', pinned: false },
  ]);
  const createGate = deferNextCreate('https://interleaved-first.test');
  const interruptedUndo = State.undo(interleavedAction);
  await createGate.started;

  const newerAction = State.snapshot('newer edit during undo');
  State.get().settings.marker = 'newer-edit-survives';
  State.persist();
  createGate.release();

  await assert.rejects(interruptedUndo, error => error?.code === 'LOCUS_UNDO_INTERRUPTED');
  assert.equal(State.get().settings.marker, 'newer-edit-survives', 'an edit made while a source tab reopens must survive');
  assert.equal(createCalls.filter(url => url === 'https://interleaved-first.test').length, 1);
  assert.equal(createCalls.filter(url => url === 'https://interleaved-second.test').length, 0, 'interrupted Undo must not continue reopening tabs');

  await State.undo(newerAction);
  assert.equal(State.get().settings.marker, 'captured-before-interleave', 'the newer action must remain first in Undo history');
  await State.undo(interleavedAction);
  assert.equal(State.get().settings.marker, undefined);
  assert.equal(createCalls.filter(url => url === 'https://interleaved-first.test').length, 1, 'capture retry must reuse the tab reopened before interruption');
  assert.equal(createCalls.filter(url => url === 'https://interleaved-second.test').length, 1, 'capture retry must open only the remaining source tab');

  const externalDuringUndoAction = State.snapshot('external revision during capture Undo');
  State.get().settings.marker = 'captured-before-external';
  State.registerClosedTabs(externalDuringUndoAction, [
    { url: 'https://external-undo-first.test', pinned: false },
    { url: 'https://external-undo-second.test', pinned: false },
  ]);
  await State.persistNow();
  const externalUndoGate = deferNextCreate('https://external-undo-first.test');
  const externalInterruptedUndo = State.undo(externalDuringUndoAction);
  await externalUndoGate.started;
  const newerExternal = clone(stored.te);
  newerExternal._revision = (Number(newerExternal._revision) || 0) + 1;
  newerExternal.settings.marker = 'newer-external';
  stored = { te: newerExternal };
  assert.equal(State.observeStoredState(newerExternal), 'recovery');
  externalUndoGate.release();
  await assert.rejects(externalInterruptedUndo, error => error?.code === 'LOCUS_UNDO_INTERRUPTED');
  assert.equal(createCalls.filter(url => url === 'https://external-undo-first.test').length, 1);
  assert.equal(createCalls.filter(url => url === 'https://external-undo-second.test').length, 0, 'recovery must stop Undo before another browser-side source effect starts');
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.marker, 'newer-external');

  const unknownAckAction = State.snapshot('unknown acknowledgement capture');
  State.get().settings.marker = 'unknown-ack-capture';
  const removeCountBeforeUnknownAck = removeCalls.length;
  const writesBeforeUnknownAck = stateWriteCalls;
  stateWriteResponseMode = 'drop-after-accept';
  const unknownAckCommit = commitCapturedTabs(
    [{ id: 77, url: 'https://unknown-ack.test', pinned: false }],
    { actionId: unknownAckAction, closeSources: true },
  );
  State.snapshot('ordinary edit after unknown acknowledgement');
  State.get().settings.ordinaryMarker = 'must-not-survive';
  State.persist();
  const unknownAckResult = await unknownAckCommit;
  assert.equal(unknownAckResult, false, 'a missing write receipt must not be treated as confirmed persistence');
  assert.equal(removeCalls.length, removeCountBeforeUnknownAck, 'a source tab must stay open when the accepted write receipt is lost');
  assert.equal(State.get().settings.marker, 'unknown-ack-capture');
  assert.equal(State.get().settings.ordinaryMarker, 'must-not-survive', 'a later edit must remain visible until the user explicitly reloads or recovers');
  assert.equal(State.isRecoveryRequired(), true);
  assert.match(toastMessages.at(-1), /later edits remain visible/i);
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(stateWriteCalls, writesBeforeUnknownAck + 1, 'unknown acknowledgement recovery must cancel the later ordinary debounce');
  await State.recoverAuthoritative();
  assert.deepEqual(clone(State.get()), stored.te, 'explicit recovery must adopt the graph that storage actually accepted');
  assert.equal(State.get().settings.ordinaryMarker, undefined);
  assert.equal(State.canUndo(), false, 'authoritative recovery must clear stale whole-graph Undo history');

  const timeoutCaptureAction = State.snapshot('timed-out acknowledgement capture');
  State.get().settings.marker = 'timed-out-capture';
  const removesBeforeTimeout = removeCalls.length;
  stateWriteResponseMode = 'hang-after-accept';
  const timeoutCaptureResult = await commitCapturedTabs(
    [{ id: 771, url: 'https://timed-out-ack.test', pinned: false }],
    { actionId: timeoutCaptureAction, closeSources: true },
  );
  assert.equal(timeoutCaptureResult, false, 'a never-settling receipt must fail closed after the bounded timeout');
  assert.equal(removeCalls.length, removesBeforeTimeout, 'a timed-out receipt must leave the source tab open');
  assert.equal(State.get().settings.marker, 'timed-out-capture', 'timeout recovery must adopt the candidate storage accepted');
  assert.match(toastMessages.at(-1), /reached storage.*confirmation was lost/i);

  const plainSetFailureAction = State.snapshot('capture with plain set failure');
  State.get().settings.marker = 'plain-set-failure';
  const removesBeforePlainSetFailure = removeCalls.length;
  failSetOnce = true;
  const plainSetFailureResult = await commitCapturedTabs(
    [{ id: 772, url: 'https://plain-set-failure.test', pinned: false }],
    { actionId: plainSetFailureAction, closeSources: true },
  );
  assert.equal(plainSetFailureResult, false);
  assert.equal(removeCalls.length, removesBeforePlainSetFailure);
  assert.deepEqual(clone(State.get()), stored.te, 'a capture failure with no later edit may recover authoritative storage automatically');
  assert.equal(State.get().settings.marker, 'timed-out-capture');

  const failedCaptureAction = State.snapshot('failing capture with ordinary edit');
  State.get().settings.marker = 'capture-must-roll-back';
  const removeCountBeforeFailure = removeCalls.length;
  const writesBeforeFailure = stateWriteCalls;
  failSetOnce = true;
  const failedCaptureCommit = commitCapturedTabs(
    [{ id: 78, url: 'https://set-failure.test', pinned: false }],
    { actionId: failedCaptureAction, closeSources: true },
  );
  State.snapshot('ordinary edit during failing capture');
  State.get().settings.ordinaryMarker = 'ordinary-must-roll-back';
  State.persist();
  const failedCaptureResult = await failedCaptureCommit;
  assert.equal(failedCaptureResult, false);
  assert.equal(removeCalls.length, removeCountBeforeFailure, 'set failure must leave the source tab open');
  assert.equal(State.get().settings.marker, 'capture-must-roll-back');
  assert.equal(State.get().settings.ordinaryMarker, 'ordinary-must-roll-back', 'set failure must not silently replace a later edit');
  assert.equal(State.isRecoveryRequired(), true);
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(stateWriteCalls, writesBeforeFailure + 1, 'recovery must cancel the interleaved ordinary debounce before it sends');
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.marker, 'timed-out-capture');
  assert.equal(State.get().settings.ordinaryMarker, undefined);
  assert.equal(State.canUndo(), false);

  const queuedFailureAction = State.snapshot('failing capture with queued successor');
  State.get().settings.marker = 'queued-capture-must-roll-back';
  const writesBeforeQueuedFailure = stateWriteCalls;
  const removesBeforeQueuedFailure = removeCalls.length;
  failSetOnce = true;
  const queuedFailureCommit = commitCapturedTabs(
    [{ id: 781, url: 'https://queued-set-failure.test', pinned: false }],
    { actionId: queuedFailureAction, closeSources: true },
  );
  State.snapshot('queued ordinary successor');
  State.get().settings.queuedMarker = 'must-not-send';
  const queuedSuccessor = State.persistNow();
  const queuedSuccessorRejected = assert.rejects(
    queuedSuccessor,
    error => error?.code === 'LOCUS_STATE_QUEUE_INVALIDATED' || error?.code === 'LOCUS_STATE_RECOVERY_REQUIRED',
  );
  assert.equal(await queuedFailureCommit, false);
  await queuedSuccessorRejected;
  assert.equal(removeCalls.length, removesBeforeQueuedFailure, 'a queued successor must not change the source-open failure contract');
  assert.equal(stateWriteCalls, writesBeforeQueuedFailure + 1, 'a successor already queued behind a failed capture must never reach the writer');
  assert.equal(State.get().settings.queuedMarker, 'must-not-send', 'a queued later edit must remain visible behind recovery');
  await State.recoverAuthoritative();
  assert.deepEqual(clone(State.get()), stored.te);
  assert.equal(State.get().settings.queuedMarker, undefined);

  const conflictCaptureAction = State.snapshot('conflicting capture with ordinary edit');
  State.get().settings.marker = 'conflicting-capture';
  const removeCountBeforeConflict = removeCalls.length;
  const writesBeforeConflict = stateWriteCalls;
  const conflictCommit = commitCapturedTabs(
    [{ id: 79, url: 'https://conflict.test', pinned: false }],
    { actionId: conflictCaptureAction, closeSources: true },
  );
  State.snapshot('ordinary edit during conflict');
  State.get().settings.ordinaryMarker = 'conflict-ordinary';
  State.persist();
  const external = clone(stored.te);
  external._revision = (Number(external._revision) || 0) + 1;
  external.settings.authoritativeMarker = 'external-wins';
  stored = { te: external };
  const conflictResult = await conflictCommit;
  assert.equal(conflictResult, false);
  assert.equal(removeCalls.length, removeCountBeforeConflict, 'conflict must leave the source tab open');
  assert.equal(State.get().settings.marker, 'conflicting-capture');
  assert.equal(State.get().settings.ordinaryMarker, 'conflict-ordinary', 'conflict must preserve the later local edit until explicit recovery');
  assert.equal(State.get().settings.authoritativeMarker, undefined);
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(stateWriteCalls, writesBeforeConflict + 1, 'conflict recovery must cancel the queued ordinary write');
  await State.recoverAuthoritative();
  assert.deepEqual(clone(State.get()), external, 'explicit conflict recovery must adopt the external authoritative graph exactly');
  assert.equal(State.get().settings.authoritativeMarker, 'external-wins');
  assert.equal(State.get().settings.ordinaryMarker, undefined);
  assert.equal(State.canUndo(), false);

  const unknownUndoAction = State.snapshot('ordinary edit for unknown Undo receipt');
  State.get().settings.undoReceiptMarker = 'must-be-undone';
  await State.persistNow();
  stateWriteResponseMode = 'drop-after-accept';
  await assert.rejects(State.undo(unknownUndoAction), error =>
    error?.code === 'LOCUS_UNDO_INTERRUPTED' || error?.code === 'LOCUS_STATE_UNKNOWN_ACK');
  assert.equal(State.isRecoveryRequired(), true, 'Undo must remain fail-closed when its accepted receipt is lost');
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.undoReceiptMarker, undefined, 'Undo recovery must adopt the graph storage accepted');

  const unknownRedoAction = State.snapshot('ordinary edit for unknown Redo receipt');
  State.get().settings.redoReceiptMarker = 'must-be-redone';
  await State.persistNow();
  await State.undo(unknownRedoAction);
  stateWriteResponseMode = 'drop-after-accept';
  await assert.rejects(State.redo(), error => error?.code === 'LOCUS_STATE_UNKNOWN_ACK');
  assert.equal(State.isRecoveryRequired(), true, 'Redo must remain fail-closed when its accepted receipt is lost');
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.redoReceiptMarker, 'must-be-redone', 'Redo recovery must adopt the graph storage accepted');

  const interruptedRedoAction = State.snapshot('ordinary edit for interrupted Redo');
  State.get().settings.interruptedRedoMarker = 'redo-candidate';
  await State.persistNow();
  await State.undo(interruptedRedoAction);
  failSetOnce = true;
  const interruptedRedo = State.redo();
  State.snapshot('newer edit during failing Redo');
  State.get().settings.newerRedoMarker = 'must-remain-visible';
  State.persist();
  await assert.rejects(interruptedRedo, error => error?.code === 'LOCUS_REDO_INTERRUPTED');
  assert.equal(State.get().settings.interruptedRedoMarker, 'redo-candidate', 'failing Redo must not restore an older graph over a newer edit');
  assert.equal(State.get().settings.newerRedoMarker, 'must-remain-visible');
  assert.equal(State.isRecoveryRequired(), true);
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.interruptedRedoMarker, undefined);
  assert.equal(State.get().settings.newerRedoMarker, undefined);

  const recoveryRaceAction = State.snapshot('capture with edit during recovery read');
  State.get().settings.recoveryRaceCaptureMarker = 'unsaved-capture';
  const recoveryReadGate = deferNextGet();
  const removesBeforeRecoveryRace = removeCalls.length;
  failSetOnce = true;
  const recoveryRaceCommit = commitCapturedTabs(
    [{ id: 801, url: 'https://recovery-read-race.test', pinned: false }],
    { actionId: recoveryRaceAction, closeSources: true },
  );
  await recoveryReadGate.started;
  State.snapshot('newer edit during authoritative recovery');
  State.get().settings.recoveryRaceLaterMarker = 'must-remain-visible';
  State.persist();
  recoveryReadGate.release();
  assert.equal(await recoveryRaceCommit, false);
  assert.equal(removeCalls.length, removesBeforeRecoveryRace, 'a recovery-read race must leave the source tab open');
  assert.equal(State.get().settings.recoveryRaceCaptureMarker, 'unsaved-capture');
  assert.equal(State.get().settings.recoveryRaceLaterMarker, 'must-remain-visible', 'the adoption guard must preserve an edit made while the storage read is pending');
  assert.equal(State.isRecoveryRequired(), true);
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.recoveryRaceCaptureMarker, undefined);
  assert.equal(State.get().settings.recoveryRaceLaterMarker, undefined);

  const failedRecoveryAction = State.snapshot('capture whose recovery read fails');
  State.get().settings.failedRecoveryMarker = 'display-only';
  const removesBeforeFailedRecovery = removeCalls.length;
  failSetOnce = true;
  failGetOnce = true;
  const failedRecoveryResult = await commitCapturedTabs(
    [{ id: 80, url: 'https://recovery-read-failure.test', pinned: false }],
    { actionId: failedRecoveryAction, closeSources: true },
  );
  assert.equal(failedRecoveryResult, false);
  assert.equal(removeCalls.length, removesBeforeFailedRecovery, 'a failed recovery read must still leave every source tab open');
  assert.equal(State.isRecoveryRequired(), true, 'failed authoritative recovery must keep persistence blocked');
  await assert.rejects(State.persistNow(), error => error?.code === 'LOCUS_STATE_RECOVERY_REQUIRED');

  console.log('Undo contracts passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
