'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const fixedNow = Date.UTC(2030, 0, 15, 12, 0, 0);
const dayMs = 24 * 60 * 60 * 1000;
let currentNow = fixedNow;
const deepClone = value => JSON.parse(JSON.stringify(value));

class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [currentNow]));
  }

  static now() {
    return currentNow;
  }
}

const recurringTimes = {
  item: fixedNow - (2 * dayMs) - 60_000,
  nested: fixedNow - (5 * dayMs) - 120_000,
  group: fixedNow - (15 * dayMs),
  category: fixedNow - (32 * dayMs),
  expired: fixedNow - (2 * dayMs),
};

const state = {
  _revision: 2,
  activeWsId: 'workspace',
  settings: { closeTabOnSave: true },
  workspaces: [{
    id: 'workspace',
    activeCatId: 'category',
    categories: [{
      id: 'category',
      name: 'Category',
      reminders: [
        { at: fixedNow + 60_000, notified: false },
        { at: recurringTimes.category, notified: false, recur: { every: 'month', interval: 1 } },
      ],
      groups: [{
        id: 'group',
        name: 'Inbox',
        reminders: [
          { at: fixedNow + 120_000, notified: false },
          { at: recurringTimes.group, notified: false, recur: { every: 'week', interval: 2 } },
        ],
        items: [
          { id: 'item', type: 'tab', title: 'Item', url: 'https://item.test', reminder: { at: fixedNow + 180_000, notified: false } },
          {
            id: 'stack',
            type: 'stack',
            items: [
              { id: 'nested', type: 'todo', text: 'Nested', reminder: { at: fixedNow + 240_000, notified: false } },
              {
                id: 'nested-recurring',
                type: 'todo',
                text: 'Nested recurring',
                reminder: { at: recurringTimes.nested, notified: false, recur: { every: 'day', interval: 2 } },
              },
            ],
          },
          { id: 'past', type: 'todo', text: 'Past', reminder: { at: fixedNow - 1, notified: false } },
          {
            id: 'daily-recurring',
            type: 'todo',
            text: 'Daily recurring',
            reminder: { at: recurringTimes.item, notified: false, recur: { every: 'day', interval: 1 } },
          },
          {
            id: 'expired-recurring',
            type: 'todo',
            text: 'Expired recurring',
            reminder: {
              at: recurringTimes.expired,
              notified: false,
              recur: { every: 'day', interval: 1, until: fixedNow - 1 },
            },
          },
        ],
      }],
    }],
  }],
  subscriptions: [
    { id: 'subscription', nextBilling: '2030-02-20', remind: true, paused: false },
    { id: 'paused-subscription', nextBilling: '2030-02-20', remind: true, paused: true },
  ],
};

const staleState = { ...deepClone(state), _revision: 1 };
let persistedState = deepClone(state);
const expectedReminderNames = [
  'te-creminder-category-0',
  'te-creminder-category-1',
  'te-greminder-group-0',
  'te-greminder-group-1',
  'te-reminder-daily-recurring',
  'te-reminder-item',
  'te-reminder-nested',
  'te-reminder-nested-recurring',
  'te-sub-subscription',
].sort();
const staleReminderNames = [
  'te-creminder-missing-0',
  'te-greminder-missing-0',
  'te-reminder-expired-recurring',
  'te-reminder-missing',
  'te-reminder-past',
  'te-sub-missing',
].sort();
const subscriptionReminderAt = (() => {
  const when = new Date('2030-02-20T09:00');
  when.setDate(when.getDate() - 3);
  return when.getTime();
})();
const initialAlarmTimes = new Map([
  ['te-creminder-category-0', fixedNow + 60_000],
  ['te-creminder-category-1', recurringTimes.category + (62 * dayMs)],
  ['te-greminder-group-0', fixedNow + 120_000],
  ['te-greminder-group-1', recurringTimes.group + (28 * dayMs)],
  ['te-reminder-daily-recurring', recurringTimes.item + (3 * dayMs)],
  ['te-reminder-item', fixedNow + 180_000],
  ['te-reminder-nested', fixedNow + 240_000],
  ['te-reminder-nested-recurring', recurringTimes.nested + (6 * dayMs)],
  ['te-sub-subscription', subscriptionReminderAt],
]);
const restartNow = fixedNow + (8 * dayMs);
const restartAlarmTimes = new Map([
  ['te-creminder-category-1', recurringTimes.category + (62 * dayMs)],
  ['te-greminder-group-1', recurringTimes.group + (28 * dayMs)],
  ['te-reminder-daily-recurring', recurringTimes.item + (11 * dayMs)],
  ['te-reminder-nested-recurring', recurringTimes.nested + (14 * dayMs)],
  ['te-sub-subscription', subscriptionReminderAt],
]);
const restartStaleNames = [
  'te-creminder-category-0',
  'te-greminder-group-0',
  'te-reminder-item',
  'te-reminder-nested',
].sort();

const alarmMap = new Map([
  ...staleReminderNames.map(name => [name, { name, scheduledTime: fixedNow + 1 }]),
  ['other-alarm', { name: 'other-alarm', scheduledTime: fixedNow + 2 }],
  ['te-pomodoro', { name: 'te-pomodoro', scheduledTime: fixedNow + 3 }],
]);
const alarmCalls = { created: [], cleared: [] };
const captureCalls = { storageSets: 0, removedTabs: [], notifications: [], openedTabs: [], clearedNotifications: [] };
const listeners = Object.create(null);
let storageMode = 'normal';
let conflictRead = 0;
let randomSequence = 0;
let alarmFailure = null;

const event = name => ({
  addListener(listener) {
    listeners[name] = listener;
  },
});

const deterministicMath = Object.create(Math);
deterministicMath.random = () => 0.1 + (++randomSequence / 1000);

const chrome = {
  storage: {
    local: {
      async get() {
        if (storageMode !== 'conflict') return { te: deepClone(persistedState) };
        conflictRead += 1;
        return { te: deepClone(conflictRead % 2 === 1 ? staleState : state) };
      },
      async set(value) {
        captureCalls.storageSets += 1;
        if (storageMode === 'quota') throw new Error('QUOTA_BYTES quota exceeded.');
        persistedState = deepClone(value.te);
      },
    },
  },
  runtime: {
    onInstalled: event('installed'),
    onStartup: event('startup'),
    onMessage: event('message'),
    getURL(file) {
      return `chrome-extension://locus/${file}`;
    },
  },
  contextMenus: {
    onClicked: event('contextMenu'),
    removeAll(callback) {
      callback();
    },
    create() {},
  },
  commands: { onCommand: event('command') },
  alarms: {
    onAlarm: event('alarm'),
    async getAll() {
      return [...alarmMap.values()].map(deepClone);
    },
    async create(name, options) {
      if (alarmFailure?.create === name) throw new Error('Injected alarm create failure.');
      alarmCalls.created.push({ name, when: options.when });
      alarmMap.set(name, { name, scheduledTime: options.when });
    },
    async clear(name) {
      if (alarmFailure?.clear === name) throw new Error('Injected alarm clear failure.');
      alarmCalls.cleared.push(name);
      return alarmMap.delete(name);
    },
  },
  notifications: {
    onClicked: event('notificationClick'),
    async create(id, options) {
      captureCalls.notifications.push({ id, options: deepClone(options) });
      return id;
    },
    async clear(id) {
      captureCalls.clearedNotifications.push(id);
      return true;
    },
  },
  tabs: {
    async query() {
      return [{ id: 99, title: 'Captured tab', url: 'https://capture.test', favIconUrl: '' }];
    },
    async remove(id) {
      captureCalls.removedTabs.push(id);
    },
    async create(options) {
      captureCalls.openedTabs.push(deepClone(options));
      return { id: 100, ...options };
    },
  },
  action: {
    setBadgeText() {},
    setBadgeBackgroundColor() {},
  },
};

const context = vm.createContext({
  chrome,
  console: {
    error() {},
  },
  Date: FixedDate,
  Math: deterministicMath,
  navigator: {},
  setTimeout() {
    return 1;
  },
  URL,
});

const backgroundSource = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
vm.runInContext(backgroundSource, context, { filename: 'background.js' });
const testApi = vm.runInContext(`({
  requestReminderAlarmReconciliation,
  waitForStartupReconciliation: () => reminderReconcileQueue
})`, context);

const alarmSnapshot = () => [...alarmMap.values()]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(alarm => ({ name: alarm.name, scheduledTime: alarm.scheduledTime }));

function assertAlarmTimes(expected, label) {
  for (const [name, scheduledTime] of expected) {
    assert.equal(alarmMap.get(name)?.scheduledTime, scheduledTime, `${label}: ${name} must use its exact next time`);
  }
}

async function testReminderReconciliation() {
  const startupResult = await testApi.waitForStartupReconciliation();
  assert.equal(startupResult.ok, true);
  assert.equal(startupResult.expected, expectedReminderNames.length);
  assert.equal(startupResult.scheduled, expectedReminderNames.length);
  assert.equal(startupResult.staleCleared, staleReminderNames.length);
  assert.deepEqual(alarmCalls.created.map(call => call.name).sort(), expectedReminderNames);
  assert.deepEqual(alarmCalls.cleared.sort(), staleReminderNames);
  assertAlarmTimes(initialAlarmTimes, 'service-worker startup reconciliation');

  for (const name of expectedReminderNames) assert.equal(alarmMap.has(name), true, `${name} was not scheduled`);
  for (const name of staleReminderNames) assert.equal(alarmMap.has(name), false, `${name} was not cleared`);
  assert.equal(alarmMap.has('te-reminder-past'), false, 'past item reminders must not be recreated');
  assert.equal(alarmMap.has('te-reminder-expired-recurring'), false, 'expired recurrence must not be recreated');
  assert.equal(alarmMap.has('te-sub-paused-subscription'), false, 'paused subscriptions must not be recreated');
  assert.equal(alarmMap.has('other-alarm'), true, 'unrelated alarms must be preserved');
  assert.equal(alarmMap.has('te-pomodoro'), true, 'other Locus alarms must be preserved');

  const beforeSecondRun = alarmSnapshot();
  alarmCalls.created.length = 0;
  alarmCalls.cleared.length = 0;
  const secondResult = await testApi.requestReminderAlarmReconciliation('contract-idempotence');
  assert.equal(secondResult.ok, true);
  assert.equal(secondResult.expected, expectedReminderNames.length);
  assert.equal(secondResult.scheduled, expectedReminderNames.length);
  assert.equal(secondResult.staleCleared, 0);
  assert.deepEqual(alarmCalls.cleared, []);
  assert.deepEqual(alarmCalls.created.map(call => call.name).sort(), expectedReminderNames);
  assert.deepEqual(alarmSnapshot(), beforeSecondRun, 'a second reconciliation must not change alarm state');

  const stateBeforeRestart = deepClone(persistedState);
  const storageSetsBeforeRestart = captureCalls.storageSets;
  const notificationsBeforeRestart = captureCalls.notifications.length;
  currentNow = restartNow;
  alarmCalls.created.length = 0;
  alarmCalls.cleared.length = 0;
  listeners.startup();
  const restartResult = await testApi.waitForStartupReconciliation();
  assert.equal(restartResult.ok, true);
  assert.equal(restartResult.reason, 'browser-startup');
  assert.equal(restartResult.expected, restartAlarmTimes.size);
  assert.equal(restartResult.scheduled, restartAlarmTimes.size);
  assert.equal(restartResult.staleCleared, restartStaleNames.length);
  assert.deepEqual(alarmCalls.created.map(call => call.name).sort(), [...restartAlarmTimes.keys()].sort());
  assert.deepEqual(alarmCalls.cleared.sort(), restartStaleNames);
  assertAlarmTimes(restartAlarmTimes, 'advanced-clock browser startup reconciliation');
  for (const name of restartStaleNames) assert.equal(alarmMap.has(name), false, `${name} must clear after becoming overdue`);
  assert.equal(alarmMap.has('other-alarm'), true, 'restart reconciliation must preserve unrelated alarms');
  assert.equal(alarmMap.has('te-pomodoro'), true, 'restart reconciliation must preserve other Locus alarms');
  assert.deepEqual(persistedState, stateBeforeRestart, 'reconciliation must not mutate persisted reminder data');
  assert.equal(captureCalls.storageSets, storageSetsBeforeRestart, 'reconciliation must not write workspace state');
  assert.equal(captureCalls.notifications.length, notificationsBeforeRestart, 'reconciliation must not emit catch-up notifications');

  const beforeRestartIdempotence = alarmSnapshot();
  alarmCalls.created.length = 0;
  alarmCalls.cleared.length = 0;
  const restartSecond = await testApi.requestReminderAlarmReconciliation('contract-restart-idempotence');
  assert.equal(restartSecond.ok, true);
  assert.equal(restartSecond.expected, restartAlarmTimes.size);
  assert.equal(restartSecond.scheduled, restartAlarmTimes.size);
  assert.equal(restartSecond.staleCleared, 0);
  assert.deepEqual(alarmCalls.cleared, []);
  assert.deepEqual(alarmCalls.created.map(call => call.name).sort(), [...restartAlarmTimes.keys()].sort());
  assert.deepEqual(alarmSnapshot(), beforeRestartIdempotence, 'repeated restart reconciliation must be idempotent');
  assert.deepEqual(persistedState, stateBeforeRestart, 'idempotent reconciliation must not mutate reminder data');

  const failedCreateName = 'te-reminder-daily-recurring';
  const failedClearName = 'te-reminder-failure-stale';
  alarmMap.set(failedClearName, { name: failedClearName, scheduledTime: restartNow + 1 });
  alarmFailure = { create: failedCreateName, clear: failedClearName };
  alarmCalls.created.length = 0;
  alarmCalls.cleared.length = 0;
  const failedResult = await testApi.requestReminderAlarmReconciliation('contract-alarm-failures');
  assert.equal(failedResult.ok, false, 'alarm API failures must not report reconciliation success');
  assert.equal(failedResult.expected, restartAlarmTimes.size);
  assert.equal(failedResult.scheduled, restartAlarmTimes.size - 1);
  assert.equal(failedResult.staleCleared, 0);
  assert.deepEqual(
    Array.from(failedResult.errors, error => ({ operation: error.operation, name: error.name }))
      .sort((a, b) => a.operation.localeCompare(b.operation)),
    [
      { operation: 'clear-stale', name: failedClearName },
      { operation: 'schedule', name: failedCreateName },
    ],
  );
  assert.equal(alarmMap.has(failedClearName), true, 'a failed clear must leave the stale alarm observable');
  assert.deepEqual(persistedState, stateBeforeRestart, 'alarm API failures must not mutate reminder data');
  assert.equal(captureCalls.storageSets, storageSetsBeforeRestart, 'alarm API failures must not write workspace state');
  assert.equal(captureCalls.notifications.length, notificationsBeforeRestart, 'alarm API failures must not emit catch-up notifications');
  alarmFailure = null;
  alarmMap.delete(failedClearName);
}

async function assertCaptureConflict(runCapture, source) {
  storageMode = 'conflict';
  conflictRead = 0;
  const notificationCount = captureCalls.notifications.length;
  const storageSetCount = captureCalls.storageSets;
  await runCapture();

  assert.equal(conflictRead, 2, `${source} must stop after its guarded comparison instead of retrying stale state`);
  assert.equal(captureCalls.storageSets, storageSetCount, `${source} must not overwrite newer state`);
  assert.deepEqual(captureCalls.removedTabs, [], `${source} must not close its source tab after failure`);
  assert.equal(captureCalls.notifications.length, notificationCount + 1, `${source} must surface a notification`);
  const notification = captureCalls.notifications.at(-1);
  assert.match(notification.id, /^te-capture-error-/);
  assert.equal(notification.options.title, 'Could not save to Locus');
  assert.match(notification.options.message, /Nothing was closed/i);
  assert.match(notification.options.message, /open Locus/i);
  assert.match(notification.options.message, /retry/i);
  return notification;
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    try {
      const delivered = deepClone(message);
      assert.equal(listeners.message(delivered, {}, resolve), true, `${message.type} must keep the response channel open`);
    } catch (error) {
      reject(error);
    }
  });
}

async function testCentralStateWriteProtocol() {
  storageMode = 'normal';
  const candidate = deepClone(persistedState);
  candidate.settings.protocolMarker = 'accepted';
  const accepted = await sendRuntimeMessage({ type: 'locus-state-write', state: candidate });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.revision, 3);
  assert.equal(persistedState._revision, 3);
  assert.equal(persistedState.settings.protocolMarker, 'accepted');

  storageMode = 'quota';
  const beforeQuota = deepClone(persistedState);
  const quotaCandidate = deepClone(persistedState);
  quotaCandidate.settings.protocolMarker = 'must-not-persist';
  const notificationsBeforeQuota = captureCalls.notifications.length;
  const quota = await sendRuntimeMessage({ type: 'locus-state-write', state: quotaCandidate });
  assert.equal(quota.ok, false);
  assert.equal(quota.code, 'LOCUS_STATE_WRITE_FAILED');
  assert.match(quota.message, /quota/i);
  assert.deepEqual(persistedState, beforeQuota, 'a quota rejection must leave authoritative storage unchanged');
  const quotaNotification = captureCalls.notifications[notificationsBeforeQuota];
  assert.ok(quotaNotification, 'a quota rejection must create a visible background notification');
  assert.match(quotaNotification.options.title, /storage full/i);
  storageMode = 'normal';

  const staleCandidate = deepClone(candidate);
  staleCandidate.settings.protocolMarker = 'stale-overwrite';
  const stale = await sendRuntimeMessage({ type: 'locus-state-write', state: staleCandidate });
  assert.equal(stale.ok, false);
  assert.equal(stale.code, 'LOCUS_STATE_CONFLICT');
  assert.equal(persistedState.settings.protocolMarker, 'accepted', 'a stale message must not overwrite accepted state');

  const invalid = await sendRuntimeMessage({ type: 'locus-state-write', state: null });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.code, 'LOCUS_STATE_INVALID');

  const storageSetsBeforeInvalidRevision = captureCalls.storageSets;
  const fractionalCandidate = deepClone(persistedState);
  fractionalCandidate._revision = 1.5;
  const fractional = await sendRuntimeMessage({ type: 'locus-state-write', state: fractionalCandidate });
  assert.equal(fractional.ok, false);
  assert.equal(fractional.code, 'LOCUS_STATE_INVALID');
  assert.equal(captureCalls.storageSets, storageSetsBeforeInvalidRevision, 'an invalid client token must be rejected before storage.set');

  const exhaustedCandidate = deepClone(persistedState);
  exhaustedCandidate._revision = Number.MAX_SAFE_INTEGER;
  const exhausted = await sendRuntimeMessage({ type: 'locus-state-write', state: exhaustedCandidate });
  assert.equal(exhausted.ok, false);
  assert.equal(exhausted.code, 'LOCUS_STATE_INVALID');
  assert.equal(captureCalls.storageSets, storageSetsBeforeInvalidRevision, 'an exhausted revision must not overflow into storage');

  const validPersistedState = deepClone(persistedState);
  persistedState._revision = -1;
  const candidateAgainstInvalidStorage = deepClone(validPersistedState);
  const invalidStored = await sendRuntimeMessage({ type: 'locus-state-write', state: candidateAgainstInvalidStorage });
  assert.equal(invalidStored.ok, false);
  assert.equal(invalidStored.code, 'LOCUS_STATE_PROTOCOL');
  assert.equal(captureCalls.storageSets, storageSetsBeforeInvalidRevision, 'an invalid stored token must never be incremented or persisted');
  persistedState = validPersistedState;
}

async function testCaptureConflicts() {
  const captureTab = { id: 99, title: 'Captured tab', url: 'https://capture.test', favIconUrl: '' };
  const contextNotification = await assertCaptureConflict(
    () => listeners.contextMenu({ menuItemId: 'te-save-page' }, captureTab),
    'context-menu capture',
  );
  await assertCaptureConflict(
    () => listeners.command('save-current-tab'),
    'shortcut capture',
  );

  await listeners.notificationClick(contextNotification.id);
  assert.deepEqual(captureCalls.openedTabs.at(-1), { url: 'chrome-extension://locus/newtab.html' });
  assert.equal(captureCalls.clearedNotifications.includes(contextNotification.id), true);
}

(async () => {
  await testReminderReconciliation();
  await testCentralStateWriteProtocol();
  await testCaptureConflicts();
  console.log(`Background contracts passed: reminderInitial=${initialAlarmTimes.size}, reminderRestart=${restartAlarmTimes.size}, recurringRearmed=${restartAlarmTimes.size - 1}, restartStale=${restartStaleNames.length}, alarmFailureOps=2`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
