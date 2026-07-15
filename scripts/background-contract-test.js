'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const fixedNow = Date.UTC(2030, 0, 15, 12, 0, 0);
const deepClone = value => JSON.parse(JSON.stringify(value));

class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [fixedNow]));
  }

  static now() {
    return fixedNow;
  }
}

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
      reminders: [{ at: fixedNow + 60_000, notified: false }],
      groups: [{
        id: 'group',
        name: 'Inbox',
        reminders: [{ at: fixedNow + 120_000, notified: false }],
        items: [
          { id: 'item', type: 'tab', title: 'Item', url: 'https://item.test', reminder: { at: fixedNow + 180_000, notified: false } },
          {
            id: 'stack',
            type: 'stack',
            items: [{ id: 'nested', type: 'todo', text: 'Nested', reminder: { at: fixedNow + 240_000, notified: false } }],
          },
          { id: 'past', type: 'todo', text: 'Past', reminder: { at: fixedNow - 1, notified: false } },
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
  'te-greminder-group-0',
  'te-reminder-item',
  'te-reminder-nested',
  'te-sub-subscription',
].sort();
const staleReminderNames = [
  'te-creminder-missing-0',
  'te-greminder-missing-0',
  'te-reminder-missing',
  'te-sub-missing',
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
      alarmCalls.created.push({ name, when: options.when });
      alarmMap.set(name, { name, scheduledTime: options.when });
    },
    async clear(name) {
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

async function testReminderReconciliation() {
  const startupResult = await testApi.waitForStartupReconciliation();
  assert.equal(startupResult.ok, true);
  assert.equal(startupResult.expected, expectedReminderNames.length);
  assert.equal(startupResult.scheduled, expectedReminderNames.length);
  assert.equal(startupResult.staleCleared, staleReminderNames.length);
  assert.deepEqual(alarmCalls.created.map(call => call.name).sort(), expectedReminderNames);
  assert.deepEqual(alarmCalls.cleared.sort(), staleReminderNames);

  for (const name of expectedReminderNames) assert.equal(alarmMap.has(name), true, `${name} was not scheduled`);
  for (const name of staleReminderNames) assert.equal(alarmMap.has(name), false, `${name} was not cleared`);
  assert.equal(alarmMap.has('te-reminder-past'), false, 'past item reminders must not be recreated');
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
  console.log('Background contracts passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
