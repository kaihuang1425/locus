'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const clone = value => JSON.parse(JSON.stringify(value));
const currentSchemaMatch = source.match(/const CURRENT_SCHEMA = (\d+);/);
assert.ok(currentSchemaMatch, 'CURRENT_SCHEMA must be extractable');
const currentSchema = Number(currentSchemaMatch[1]);

const stateStart = source.indexOf('const State = (() => {');
const stateEndMarker = '\n})();';
const stateEnd = source.indexOf(stateEndMarker, stateStart);
assert.ok(stateStart >= 0 && stateEnd > stateStart, 'State implementation must be extractable');

function extractBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker} must be extractable`);
  return source.slice(start, end);
}

const migrateSource = extractBetween('function isStableEntityReminderId(value) {', '\nconst STORAGE_QUOTA');
const ensureDefaultSource = extractBetween('function ensureDefault() {', '\nconst THEMES = [');
const trashSource = extractBetween('function normalizeExpiredTrash(', '\n\nfunction archiveItem(');
const ensureOnboardingSource = extractBetween('function ensureOnboarding(settings) {', '\n\n//');
const normalizeLoadedSource = extractBetween('function normalizeLoadedSettings() {', '\n\nfunction initAfterLoad()');
const ordinaryFailureSource = extractBetween('async function recoverAfterOrdinaryWriteFailure(error) {', '\n\nfunction handleObservedStoredState(stored)');
const storageErrorRouterSource = extractBetween('function handleStorageError(err) {', '\n\nfunction showStorageFull(msg)');
const recoveryOverlaySource = extractBetween('function showStateRecoveryRequired(error) {', '\n\nasync function recoverAfterOrdinaryWriteFailure(error)');

let stored;
let writeCalls = 0;
let nextId = 1;
let deferredReceipt = null;
let deferredGet = null;
let deferredWriter = null;
let deferredMissingReceiver = null;
let nextGetSnapshot = null;
let stateWriteResponseMode = 'normal';
let acceptedStateObserver = null;
let recoveryOverlayCalls = 0;
const recoveryOverlayErrors = [];
let storageErrorCalls = 0;

function currentState(revision = 0) {
  return {
    schema: currentSchema,
    _revision: revision,
    activeWsId: 'w1',
    workspaces: [{
      id: 'w1', name: 'Workspace', activeCatId: 'c1',
      categories: [{ id: 'c1', name: 'Space', groups: [] }],
    }],
    archive: [], trash: [], recentEmoji: [], columnWidths: {},
    settings: { language: 'en' },
  };
}

function deferReceipt() {
  let signalStarted;
  let release;
  const started = new Promise(resolve => { signalStarted = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  deferredReceipt = { signalStarted, wait };
  return { started, release };
}

function deferStorageGet() {
  let signalStarted;
  let release;
  const started = new Promise(resolve => { signalStarted = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  deferredGet = { signalStarted, wait };
  return { started, release };
}

function deferStateWriter() {
  let signalStarted;
  let release;
  const started = new Promise(resolve => { signalStarted = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  deferredWriter = { signalStarted, wait };
  return { started, release };
}

function deferMissingReceiver() {
  let signalStarted;
  let release;
  const started = new Promise(resolve => { signalStarted = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  deferredMissingReceiver = { signalStarted, wait };
  return { started, release };
}

stored = { te: currentState(4) };

const chrome = {
  storage: {
    local: {
      async get() {
        const snapshot = clone(nextGetSnapshot || stored);
        nextGetSnapshot = null;
        if (deferredGet) {
          const pending = deferredGet;
          deferredGet = null;
          pending.signalStarted();
          await pending.wait;
        }
        return snapshot;
      },
    },
  },
  runtime: {
    async sendMessage(message) {
      assert.equal(message?.type, 'locus-state-write');
      writeCalls += 1;
      if (stateWriteResponseMode === 'missing-receiver-once') {
        stateWriteResponseMode = 'normal';
        throw new Error('Could not establish connection. Receiving end does not exist.');
      }
      if (stateWriteResponseMode === 'missing-receiver-always') {
        throw new Error('Could not establish connection. Receiving end does not exist.');
      }
      if (stateWriteResponseMode === 'delayed-missing-receiver') {
        const pending = deferredMissingReceiver;
        assert.ok(pending, 'delayed missing receiver mode requires a gate');
        deferredMissingReceiver = null;
        pending.signalStarted();
        await pending.wait;
        throw new Error('Could not establish connection. Receiving end does not exist.');
      }
      const candidate = clone(message.state);
      if (deferredWriter) {
        const pending = deferredWriter;
        deferredWriter = null;
        pending.signalStarted();
        await pending.wait;
      }
      const localRevision = Number(candidate._revision) || 0;
      const remoteRevision = Number(stored.te?._revision) || 0;
      if (localRevision !== remoteRevision) {
        return { ok: false, code: 'LOCUS_STATE_CONFLICT', message: 'Locus changed elsewhere.' };
      }
      const revision = localRevision + 1;
      candidate._revision = revision;
      stored = { te: candidate };
      if (stateWriteResponseMode === 'close-after-accept') {
        acceptedStateObserver?.(clone(candidate));
        stateWriteResponseMode = 'normal';
        throw new Error('The message port closed before a response was received.');
      }
      if (stateWriteResponseMode === 'drop-after-accept') {
        acceptedStateObserver?.(clone(candidate));
        stateWriteResponseMode = 'normal';
        return undefined;
      }
      if (stateWriteResponseMode === 'hang-after-accept') {
        acceptedStateObserver?.(clone(candidate));
        stateWriteResponseMode = 'normal';
        await new Promise(() => {});
      }
      if (deferredReceipt) {
        const pending = deferredReceipt;
        deferredReceipt = null;
        pending.signalStarted();
        await pending.wait;
      }
      return { ok: true, revision };
    },
  },
};

const context = vm.createContext({
  browserLanguage: () => 'en',
  chrome,
  clearTimeout,
  console,
  CURRENT_SCHEMA: currentSchema,
  LOCUS_STATE_RECEIVER_RETRY_MS: 5,
  LOCUS_STATE_WRITE_TIMEOUT_MS: 40,
  THEMES: [{ id: 'folio' }, { id: 'folio-dark' }],
  esc: value => String(value ?? ''),
  handleStorageError() { storageErrorCalls += 1; },
  loadedSchema: 0,
  normalizeLanguage: value => /^zh/i.test(String(value || '')) ? 'zh-TW' : 'en',
  normalizeThemeId: value => ({ stow: 'folio', 'stow-dark': 'folio-dark' })[value] || value,
  navigator: {},
  recoverAfterOrdinaryWriteFailure() {},
  refreshStorageUsage() {},
  Router: { init() {} },
  setTimeout,
  showStateRecoveryRequired(error) {
    recoveryOverlayCalls += 1;
    recoveryOverlayErrors.push(error);
  },
  structuredClone,
  TRASH_RETENTION_MS: 30 * 24 * 60 * 60 * 1000,
  trashTimestamp: entry => Number(entry?.retentionStartedAt || entry?.trashedAt || entry?.at) || 0,
  uid: () => `id-${nextId++}`,
});

vm.runInContext(
  `${source.slice(stateStart, stateEnd + stateEndMarker.length)}\nglobalThis.__state = State;`,
  context,
  { filename: 'newtab-state.js' },
);
vm.runInContext(ordinaryFailureSource, context, { filename: 'newtab-ordinary-write-recovery.js' });
vm.runInContext(
  `${migrateSource}\n${ensureDefaultSource}\n${trashSource}\n${ensureOnboardingSource}\n${normalizeLoadedSource}\n`
    + 'globalThis.__normalizeLoadedState = normalizeLoadedState;',
  context,
  { filename: 'newtab-boot-normalizers.js' },
);

const State = context.__state;
const normalizeLoadedState = context.__normalizeLoadedState;
acceptedStateObserver = candidate => State.observeStoredState(candidate);

function assertStableReminderIds(entity, label) {
  const ids = (entity.reminders || []).map(reminder => reminder.id);
  assert.equal(ids.every(id => typeof id === 'string' && id.length > 0 && id.length <= 200), true, `${label} must have valid reminder ids`);
  assert.equal(new Set(ids).size, ids.length, `${label} reminder ids must be unique`);
}

(async () => {
  await State.load();
  const writesAtCleanBoot = writeCalls;
  const cleanRevision = State.get()._revision;
  assert.equal(normalizeLoadedState(), false, 'a valid current-schema boot must not schedule persistence');
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(writeCalls, writesAtCleanBoot, 'a clean boot must not send a write or advance revision');
  assert.equal(State.get()._revision, cleanRevision);

  stored = { te: {
    ...currentState(6),
    settings: { language: 'en', theme: 'stow', onboarding: { welcomeSeen: true } },
  } };
  await State.load();
  const writesBeforeSettingsNormalization = writeCalls;
  assert.equal(normalizeLoadedState(), true, 'legacy theme and partial onboarding fields must be normalized before the boot dirtiness check');
  assert.equal(State.get().settings.theme, 'folio');
  assert.deepEqual(clone(State.get().settings.onboarding), { welcomeSeen: true, hintsSeen: {}, disabled: false });
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(writeCalls, writesBeforeSettingsNormalization + 1);
  assert.equal(normalizeLoadedState(), false, 'settings normalization must be idempotent after persistence');

  const legacyReminderState = { ...currentState(7), schema: 11 };
  const legacyCategory = legacyReminderState.workspaces[0].categories[0];
  legacyCategory.reminders = [
    { at: 1, notified: false },
    { id: 'category-kept', at: 2, notified: false },
    { id: 'category-kept', at: 3, notified: false },
  ];
  legacyCategory.groups = [{
    id: 'reminder-group',
    items: [],
    reminders: [{ id: 'g'.repeat(201), at: 4, notified: false }, { at: 5, notified: false }],
  }];
  legacyReminderState.archive = [{
    kind: 'group',
    data: { id: 'archive-group', items: [], reminders: [{ at: 6, notified: false }] },
  }];
  legacyReminderState.trash = [{
    kind: 'group',
    data: { id: 'trash-group', items: [], reminders: [{ at: 7, notified: false }] },
  }];
  stored = { te: legacyReminderState };
  await State.load();
  const writesBeforeMigration = writeCalls;
  assert.equal(normalizeLoadedState(), true, 'legacy schema normalization must schedule persistence');
  assertStableReminderIds(State.get().workspaces[0].categories[0], 'active category');
  assertStableReminderIds(State.get().workspaces[0].categories[0].groups[0], 'active group');
  assertStableReminderIds(State.get().archive[0].data, 'archived group');
  assertStableReminderIds(State.get().trash[0].data, 'trashed group');
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(writeCalls, writesBeforeMigration + 1, 'all boot normalization must coalesce into one write');
  assert.equal(stored.te.schema, currentSchema);
  assert.equal(normalizeLoadedState(), false, 'migration must be idempotent after its accepted write');

  stored = { te: { ...currentState(10), workspaces: [], activeWsId: null } };
  await State.load();
  assert.equal(normalizeLoadedState(), true, 'a valid empty graph must create defaults once');
  const defaultIds = State.get().workspaces.flatMap(ws => [ws.id, ...ws.categories.map(cat => cat.id)]);
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(normalizeLoadedState(), false, 'default creation must not churn ids or revisions on the next boot');
  assert.deepEqual(State.get().workspaces.flatMap(ws => [ws.id, ...ws.categories.map(cat => cat.id)]), defaultIds);

  const now = Date.now();
  stored = { te: {
    ...currentState(12),
    trash: [
      { data: { id: 'expired' }, trashedAt: now - context.TRASH_RETENTION_MS - 1 },
      { data: { id: 'live' }, trashedAt: now - 1000 },
      { malformed: true },
    ],
  } };
  await State.load();
  assert.equal(normalizeLoadedState(), true, 'expired Trash cleanup must be persisted');
  assert.deepEqual(State.get().trash.map(entry => entry.data?.id || 'malformed'), ['live', 'malformed']);
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(normalizeLoadedState(), false, 'Trash cleanup must be idempotent');

  stored = { te: currentState(20) };
  await State.load();
  const externalClean = clone(State.get());
  externalClean._revision = 21;
  externalClean.settings.externalMarker = 'clean-adopt';
  stored = { te: externalClean };
  assert.equal(State.observeStoredState(externalClean), 'adopted');
  assert.equal(State.get().settings.externalMarker, 'clean-adopt');
  assert.equal(State.isClean(), true);

  State.get().settings.selfMarker = 'awaiting-receipt';
  const receiptGate = deferReceipt();
  const pendingWrite = State.persistNow();
  await receiptGate.started;
  const selfEvent = clone(stored.te);
  assert.equal(State.observeStoredState(selfEvent), 'self', 'own onChanged event must not substitute for its typed receipt');
  assert.equal(State.get()._revision, 21, 'own event before receipt must not advance local authority');
  receiptGate.release();
  await pendingWrite;
  assert.equal(State.get()._revision, 22);
  assert.equal(State.isClean(), true);

  const firstAcceptedWrite = clone(stored.te);
  State.get().settings.secondSelfMarker = 'second-receipt-won';
  await State.persistNow();
  assert.equal(State.observeStoredState(firstAcceptedWrite), 'ignored', 'a delayed exact event for an earlier accepted self-write is not a storage rollback');
  assert.equal(State.isRecoveryRequired(), false);
  assert.equal(State.get().settings.secondSelfMarker, 'second-receipt-won');

  State.get().settings.transientReceiverMarker = 'retried-before-accept';
  stateWriteResponseMode = 'missing-receiver-once';
  const writesBeforeTransientReceiver = writeCalls;
  await State.persistNow();
  assert.equal(writeCalls, writesBeforeTransientReceiver + 2, 'one missing receiver must make one safe retry');
  assert.equal(stored.te.settings.transientReceiverMarker, 'retried-before-accept');
  assert.equal(State.isRecoveryRequired(), false, 'a successful receiver retry must not block later edits');

  const authoritativeBeforeMissingReceiver = clone(stored.te);
  State.get().settings.missingReceiverMarker = 'must-not-persist';
  stateWriteResponseMode = 'missing-receiver-always';
  const writesBeforeMissingReceiver = writeCalls;
  await assert.rejects(
    State.persistNow(),
    error => error?.code === 'LOCUS_STATE_RECEIVER_UNAVAILABLE',
    'persistent receiver absence must surface a typed background-service failure',
  );
  assert.equal(writeCalls, writesBeforeMissingReceiver + 3, 'receiver retries must be strictly bounded');
  assert.deepEqual(stored.te, authoritativeBeforeMissingReceiver, 'a missing receiver must never change authority');
  assert.equal(State.get().settings.missingReceiverMarker, 'must-not-persist', 'the local graph stays visible behind recovery');
  assert.equal(State.isRecoveryRequired(), true);
  stateWriteResponseMode = 'normal';
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.missingReceiverMarker, undefined);

  const recoveryErrorsBeforeDebouncedReceiver = recoveryOverlayErrors.length;
  State.get().settings.debouncedReceiverMarker = 'ordinary-edit-restart';
  stateWriteResponseMode = 'missing-receiver-always';
  const writesBeforeDebouncedReceiver = writeCalls;
  State.persist();
  await new Promise(resolve => setTimeout(resolve, 240));
  assert.equal(writeCalls, writesBeforeDebouncedReceiver + 3, 'a debounced ordinary edit must use the bounded receiver sequence');
  assert.equal(recoveryOverlayErrors.length > recoveryErrorsBeforeDebouncedReceiver, true);
  assert.equal(
    recoveryOverlayErrors.at(-1)?.code,
    'LOCUS_STATE_RECEIVER_UNAVAILABLE',
    'ordinary debounced writes must preserve the receiver-restart recovery action end to end',
  );
  stateWriteResponseMode = 'normal';
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.debouncedReceiverMarker, undefined);

  State.get().settings.backoffDeadlineMarker = 'deadline-during-backoff';
  stateWriteResponseMode = 'missing-receiver-always';
  context.LOCUS_STATE_WRITE_TIMEOUT_MS = 1;
  const writesBeforeBackoffDeadline = writeCalls;
  await assert.rejects(
    State.persistNow(),
    error => error?.code === 'LOCUS_STATE_UNKNOWN_ACK',
    'the receipt deadline can close while a receiver retry is backing off',
  );
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(writeCalls, writesBeforeBackoffDeadline + 1, 'a timed-out backoff must not launch its next send');
  context.LOCUS_STATE_WRITE_TIMEOUT_MS = 40;
  stateWriteResponseMode = 'normal';
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.backoffDeadlineMarker, undefined);

  State.get().settings.delayedReceiverMarker = 'deadline-must-cancel-retries';
  stateWriteResponseMode = 'delayed-missing-receiver';
  const delayedReceiver = deferMissingReceiver();
  const writesBeforeDelayedReceiver = writeCalls;
  const delayedReceiverWrite = State.persistNow();
  await delayedReceiver.started;
  await assert.rejects(
    delayedReceiverWrite,
    error => error?.code === 'LOCUS_STATE_UNKNOWN_ACK',
    'the receipt deadline must still fail closed while a runtime message is pending',
  );
  assert.equal(writeCalls, writesBeforeDelayedReceiver + 1);
  const writesAtDelayedReceiverTimeout = writeCalls;
  delayedReceiver.release();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(writeCalls, writesAtDelayedReceiverTimeout, 'an abandoned timed-out request must not launch receiver retries later');
  stateWriteResponseMode = 'normal';
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.delayedReceiverMarker, undefined);

  State.get().settings.closedChannelMarker = 'accepted-before-close';
  stateWriteResponseMode = 'close-after-accept';
  const writesBeforeClosedChannel = writeCalls;
  await assert.rejects(
    State.persistNow(),
    error => /message port closed/i.test(String(error?.message))
      && error?.code !== 'LOCUS_STATE_RECEIVER_UNAVAILABLE',
    'a possibly accepted write with a closed channel must not be classified as safe to retry',
  );
  assert.equal(writeCalls, writesBeforeClosedChannel + 1, 'unknown outcomes must never be retried');
  assert.equal(stored.te.settings.closedChannelMarker, 'accepted-before-close');
  assert.equal(State.isRecoveryRequired(), true);
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.closedChannelMarker, 'accepted-before-close');

  const activeCapture = State.snapshot('browser effects still pending');
  assert.equal(State.beginCaptureAction(activeCapture), true);
  const duringCapture = clone(stored.te);
  duringCapture._revision = (Number(duringCapture._revision) || 0) + 1;
  duringCapture.settings.externalMarker = 'during-browser-effects';
  stored = { te: duringCapture };
  assert.equal(State.observeStoredState(duringCapture), 'recovery', 'capture browser effects must keep external refresh fail-closed');
  assert.notEqual(State.get().settings.externalMarker, 'during-browser-effects', 'active capture must not auto-adopt and clear its source-effect history');
  assert.equal(State.hasActiveOperation(), true);
  State.finishCaptureAction(activeCapture);
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.externalMarker, 'during-browser-effects');

  State.get().settings.localMarker = 'discard-me';
  State.persist();
  const writesBeforeDirtyRecovery = writeCalls;
  const externalDirty = clone(stored.te);
  externalDirty._revision = (Number(externalDirty._revision) || 0) + 1;
  externalDirty.settings.externalMarker = 'dirty-recovery';
  stored = { te: externalDirty };
  assert.equal(State.observeStoredState(externalDirty), 'recovery', 'dirty page must never auto-rebase an external graph');
  assert.equal(State.get().settings.localMarker, 'discard-me', 'dirty local state must remain visible behind the reload interlock');
  assert.notEqual(State.get().settings.externalMarker, 'dirty-recovery');
  const staleReadGate = deferStorageGet();
  const deliberateRecovery = State.recoverAuthoritative();
  await staleReadGate.started;
  const newerDuringRecovery = clone(externalDirty);
  newerDuringRecovery._revision = (Number(newerDuringRecovery._revision) || 0) + 1;
  newerDuringRecovery.settings.externalMarker = 'newer-during-recovery';
  stored = { te: newerDuringRecovery };
  assert.equal(State.observeStoredState(newerDuringRecovery), 'recovery');
  staleReadGate.release();
  await deliberateRecovery;
  assert.equal(State.get().settings.externalMarker, 'newer-during-recovery', 'a newer event observed during recovery must beat the stale read snapshot');
  assert.equal(State.get().settings.localMarker, undefined, 'explicit recovery may replace the dirty local graph');
  assert.equal(State.isClean(), true);
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(writeCalls, writesBeforeDirtyRecovery, 'dirty recovery must cancel an unsent debounce');

  const staleBeforeRecovery = clone(stored.te);
  State.get().settings.preObservedLocalMarker = 'keep-until-explicit-recovery';
  const preObservedHigher = clone(staleBeforeRecovery);
  preObservedHigher._revision = (Number(preObservedHigher._revision) || 0) + 1;
  preObservedHigher.settings.externalMarker = 'observed-before-recovery-read';
  stored = { te: preObservedHigher };
  assert.equal(State.observeStoredState(preObservedHigher), 'recovery');
  nextGetSnapshot = { te: staleBeforeRecovery };
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.externalMarker, 'observed-before-recovery-read', 'a higher graph observed before recovery starts must beat a stale get snapshot');

  State.get().settings.inFlightLocalMarker = 'must-remain-visible';
  const ordinaryWriterGate = deferStateWriter();
  State.persist();
  await ordinaryWriterGate.started;
  const externalDuringOrdinaryWrite = clone(stored.te);
  externalDuringOrdinaryWrite._revision = (Number(externalDuringOrdinaryWrite._revision) || 0) + 1;
  externalDuringOrdinaryWrite.settings.externalMarker = 'ordinary-write-conflict';
  stored = { te: externalDuringOrdinaryWrite };
  assert.equal(State.observeStoredState(externalDuringOrdinaryWrite), 'recovery');
  ordinaryWriterGate.release();
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(State.get().settings.inFlightLocalMarker, 'must-remain-visible', 'the ordinary failure handler must never auto-replace the dirty graph');
  assert.equal(State.isRecoveryRequired(), true);
  assert.ok(recoveryOverlayCalls > 0, 'an in-flight ordinary conflict must keep the explicit reload interlock visible');
  assert.ok(storageErrorCalls > 0);
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.externalMarker, 'ordinary-write-conflict');
  assert.equal(State.get().settings.inFlightLocalMarker, undefined);

  State.get().settings.unknownAckMarker = 'accepted-without-receipt';
  stateWriteResponseMode = 'drop-after-accept';
  await assert.rejects(State.persistNow(), error => error?.code === 'LOCUS_STATE_UNKNOWN_ACK');
  assert.equal(State.isRecoveryRequired(), true, 'a missing receipt must centrally block every mutation caller');
  assert.equal(stored.te.settings.unknownAckMarker, 'accepted-without-receipt');
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.unknownAckMarker, 'accepted-without-receipt', 'authoritative recovery must retain a write storage accepted before losing its receipt');

  State.get().settings.timeoutMarker = 'accepted-before-timeout';
  stateWriteResponseMode = 'hang-after-accept';
  await assert.rejects(State.persistNow(), error => error?.code === 'LOCUS_STATE_UNKNOWN_ACK');
  assert.equal(State.isRecoveryRequired(), true, 'a never-settling receipt must time out fail-closed');
  await State.recoverAuthoritative();
  assert.equal(State.get().settings.timeoutMarker, 'accepted-before-timeout');

  const validBeforeMalformedRevision = clone(stored.te);
  for (const invalidRevision of [-1, 1.5, Number.MAX_SAFE_INTEGER]) {
    stored = { te: { ...clone(validBeforeMalformedRevision), _revision: invalidRevision } };
    await State.load();
    assert.equal(State.isRecoveryRequired(), true, `stored revision ${invalidRevision} must fail closed during load`);
    const writesBeforeInvalid = writeCalls;
    await assert.rejects(State.persistNow(), error => error?.code === 'LOCUS_STATE_RECOVERY_REQUIRED');
    assert.equal(writeCalls, writesBeforeInvalid, 'a malformed baseline must be rejected before any writer request');
  }
  stored = { te: clone(validBeforeMalformedRevision) };
  await State.load();
  State.get()._revision = 2.5;
  const writesBeforeInvalidLocal = writeCalls;
  await assert.rejects(State.persistNow(), error => error?.code === 'LOCUS_STATE_PROTOCOL');
  assert.equal(writeCalls, writesBeforeInvalidLocal, 'an invalid local revision must be rejected before sendMessage');
  stored = { te: clone(validBeforeMalformedRevision) };
  await State.load();

  const newerSchema = clone(stored.te);
  newerSchema._revision = (Number(newerSchema._revision) || 0) + 1;
  newerSchema.schema = 99;
  stored = { te: newerSchema };
  assert.equal(State.observeStoredState(newerSchema), 'recovery');
  await assert.rejects(State.recoverAuthoritative(), error => error?.code === 'LOCUS_STATE_NEWER_SCHEMA');
  assert.equal(State.isRecoveryRequired(), true, 'newer-schema recovery must stay fail-closed');
  await assert.rejects(State.persistNow(), error => error?.code === 'LOCUS_STATE_RECOVERY_REQUIRED');

  const routedToasts = [];
  const storageErrorRouterContext = vm.createContext({
    __routedToasts: routedToasts,
    showStorageFull(message) { routedToasts.push(`quota:${message}`); },
    toast(message, options) { routedToasts.push({ message, options }); },
  });
  vm.runInContext(
    `${storageErrorRouterSource}\nglobalThis.__handleStorageError = handleStorageError;`,
    storageErrorRouterContext,
    { filename: 'newtab-storage-error-router.js' },
  );
  storageErrorRouterContext.__handleStorageError({
    code: 'LOCUS_STATE_RECEIVER_UNAVAILABLE',
    message: 'Locus could not reach its background service.',
  });
  assert.equal(routedToasts[0]?.message, 'Locus could not reach its background service.');
  assert.equal(routedToasts[0]?.options?.danger, true);
  assert.equal(routedToasts[0]?.options?.duration, 7000);
  storageErrorRouterContext.__handleStorageError(new Error('Injected generic failure'));
  assert.equal(routedToasts[1]?.message, 'Storage error: Injected generic failure');

  const runtimeReloads = [];
  const pageReloads = [];
  const scheduledCallbacks = [];
  const clearedCallbacks = [];
  let recoveryHidden = true;
  const recoveryOverlay = {
    dataset: {},
    classList: {
      contains(name) { return name === 'hidden' && recoveryHidden; },
      remove(name) { if (name === 'hidden') recoveryHidden = false; },
    },
    addEventListener(type, listener) { this[`${type}Listener`] = listener; },
  };
  const recoveryDetail = { textContent: '' };
  const recoveryButton = { focus() {} };
  const recoveryDocument = {
    getElementById(id) {
      return {
        'state-recovery-overlay': recoveryOverlay,
        'state-recovery-detail': recoveryDetail,
        'state-recovery-reload': recoveryButton,
      }[id] || null;
    },
  };
  const recoveryOverlayContext = vm.createContext({
    chrome: { runtime: { reload() { runtimeReloads.push('runtime'); } } },
    clearTimeout(id) { clearedCallbacks.push(id); },
    document: recoveryDocument,
    location: { reload() { pageReloads.push('page'); } },
    rememberOpener() {},
    setStateRecoveryInterlock() {},
    setTimeout(callback) { scheduledCallbacks.push(callback); return scheduledCallbacks.length; },
    toast() {},
    trapTabKey() {},
    tr: key => key,
  });
  vm.runInContext(
    `${recoveryOverlaySource}\nglobalThis.__showRecovery = showStateRecoveryRequired; globalThis.__bindRecovery = bindStateRecoveryOverlay;`,
    recoveryOverlayContext,
    { filename: 'newtab-state-recovery-overlay.js' },
  );
  recoveryOverlayContext.__showRecovery({
    code: 'LOCUS_STATE_RECEIVER_UNAVAILABLE',
    message: 'Background unavailable',
  });
  recoveryOverlayContext.__showRecovery(new Error('Queued write was cancelled'));
  recoveryOverlayContext.__bindRecovery();
  assert.equal(recoveryOverlay.dataset.reloadExtension, '1', 'a queued follow-on failure must not downgrade runtime recovery');
  const callbacksBeforeRuntimeReload = scheduledCallbacks.length;
  recoveryButton.onclick();
  assert.equal(runtimeReloads.length, 1, 'receiver absence must restart the extension runtime');
  assert.equal(pageReloads.length, 0, 'the runtime restart gets the first recovery attempt');
  assert.equal(scheduledCallbacks.length, callbacksBeforeRuntimeReload + 1, 'runtime restart keeps one bounded page fallback');
  scheduledCallbacks.at(-1)();
  assert.equal(pageReloads.length, 1, 'a runtime reload that does not tear down the page must fall back');

  recoveryHidden = true;
  recoveryOverlayContext.__showRecovery(new Error('Revision conflict'));
  assert.equal(recoveryOverlay.dataset.reloadExtension, '0');
  recoveryButton.onclick();
  assert.equal(runtimeReloads.length, 1, 'ordinary reconciliation must not restart unrelated extension pages');
  assert.equal(pageReloads.length, 2, 'ordinary reconciliation keeps the page-only reload');

  recoveryOverlayContext.chrome.runtime.reload = undefined;
  recoveryOverlayContext.__showRecovery({ code: 'LOCUS_STATE_RECEIVER_UNAVAILABLE' });
  recoveryButton.onclick();
  assert.equal(pageReloads.length, 3, 'receiver recovery must fall back when runtime reload is unavailable');

  recoveryHidden = true;
  recoveryOverlayContext.chrome.runtime.reload = () => {
    runtimeReloads.push('runtime-throw');
    throw new Error('Runtime reload unavailable');
  };
  recoveryOverlayContext.__showRecovery({ code: 'LOCUS_STATE_RECEIVER_UNAVAILABLE' });
  const callbacksBeforeThrownRuntimeReload = scheduledCallbacks.length;
  recoveryButton.onclick();
  assert.equal(runtimeReloads.at(-1), 'runtime-throw');
  assert.equal(scheduledCallbacks.length, callbacksBeforeThrownRuntimeReload + 1);
  assert.equal(clearedCallbacks.at(-1), scheduledCallbacks.length, 'a thrown runtime reload must cancel its delayed fallback');
  assert.equal(pageReloads.length, 4, 'a thrown runtime reload must immediately reload the page');

  console.log('State sync contracts passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
