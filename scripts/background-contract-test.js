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
  schema: 12,
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
        { id: 'category-once', at: fixedNow + 60_000, notified: false },
        { id: 'category-monthly', at: recurringTimes.category, notified: false, recur: { every: 'month', interval: 1 } },
      ],
      groups: [{
        id: 'group',
        name: 'Inbox',
        reminders: [
          { id: 'group-once', at: fixedNow + 120_000, notified: false },
          { id: 'group-biweekly', at: recurringTimes.group, notified: false, recur: { every: 'week', interval: 2 } },
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
  'te-creminder2-category|category-once',
  'te-creminder2-category|category-monthly',
  'te-greminder2-group|group-once',
  'te-greminder2-group|group-biweekly',
  'te-reminder-daily-recurring',
  'te-reminder-item',
  'te-reminder-nested',
  'te-reminder-nested-recurring',
  'te-sub-subscription',
].sort();
const staleReminderNames = [
  'te-creminder-category-0',
  'te-creminder-category-1',
  'te-creminder-missing-0',
  'te-greminder-group-0',
  'te-greminder-group-1',
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
  ['te-creminder2-category|category-once', fixedNow + 60_000],
  ['te-creminder2-category|category-monthly', recurringTimes.category + (62 * dayMs)],
  ['te-greminder2-group|group-once', fixedNow + 120_000],
  ['te-greminder2-group|group-biweekly', recurringTimes.group + (28 * dayMs)],
  ['te-reminder-daily-recurring', recurringTimes.item + (3 * dayMs)],
  ['te-reminder-item', fixedNow + 180_000],
  ['te-reminder-nested', fixedNow + 240_000],
  ['te-reminder-nested-recurring', recurringTimes.nested + (6 * dayMs)],
  ['te-sub-subscription', subscriptionReminderAt],
]);
const restartNow = fixedNow + (8 * dayMs);
const restartAlarmTimes = new Map([
  ['te-creminder2-category|category-monthly', recurringTimes.category + (62 * dayMs)],
  ['te-greminder2-group|group-biweekly', recurringTimes.group + (28 * dayMs)],
  ['te-reminder-daily-recurring', recurringTimes.item + (11 * dayMs)],
  ['te-reminder-nested-recurring', recurringTimes.nested + (14 * dayMs)],
  ['te-sub-subscription', subscriptionReminderAt],
]);
const restartStaleNames = [
  'te-creminder2-category|category-once',
  'te-greminder2-group|group-once',
  'te-reminder-item',
  'te-reminder-nested',
].sort();
const deliveryNextTimes = new Map([
  ['te-creminder2-category|category-monthly', (() => {
    const next = new Date(restartAlarmTimes.get('te-creminder2-category|category-monthly'));
    next.setMonth(next.getMonth() + 1);
    return next.getTime();
  })()],
  ['te-greminder2-group|group-biweekly', restartAlarmTimes.get('te-greminder2-group|group-biweekly') + (14 * dayMs)],
  ['te-reminder-daily-recurring', restartAlarmTimes.get('te-reminder-daily-recurring') + dayMs],
  ['te-reminder-nested-recurring', restartAlarmTimes.get('te-reminder-nested-recurring') + (2 * dayMs)],
]);

const alarmMap = new Map([
  ...staleReminderNames.map(name => [name, { name, scheduledTime: fixedNow + 1 }]),
  ['other-alarm', { name: 'other-alarm', scheduledTime: fixedNow + 2 }],
  ['te-pomodoro', { name: 'te-pomodoro', scheduledTime: fixedNow + 3 }],
]);
const alarmCalls = { created: [], cleared: [] };
const captureCalls = {
  storageSets: 0,
  removedTabs: [],
  notifications: [],
  notificationAttempts: [],
  notificationUpdates: [],
  notificationUpdateAttempts: [],
  openedTabs: [],
  clearedNotifications: [],
  tabGets: [],
  tabQueries: [],
  badges: [],
  effects: [],
  storageGets: 0,
};
const stateWriteEffectOrder = [];
const listeners = Object.create(null);
let storageMode = 'normal';
let conflictRead = 0;
let randomSequence = 0;
let alarmFailure = null;
let notificationFailure = null;
let notificationUpdateFailure = null;
let notificationApiMode = 'promise';
let releaseNotificationCreate = null;
let releaseNotificationUpdate = null;
let releaseNotificationClear = null;
let releaseHybridCreateCallback = null;
let releaseHybridCreatePromise = null;
let tabGetFailure = null;
let tabGetOverride = null;
let afterTabGet = null;
let tabRemoveFailure = null;
let tabCreateFailure = false;
let nextCreatedTabId = 100;
let badgeFailure = false;
let afterStorageSet = null;
let tabInventory = [{
  id: 99,
  windowId: 7,
  active: true,
  title: 'Captured tab',
  url: 'https://capture.test',
  favIconUrl: '',
}];

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
        captureCalls.storageGets += 1;
        if (storageMode === 'read-error') throw new Error('Injected state read failure.');
        if (storageMode !== 'conflict') return { te: deepClone(persistedState) };
        conflictRead += 1;
        return { te: deepClone(conflictRead % 2 === 1 ? staleState : state) };
      },
      async set(value) {
        stateWriteEffectOrder.push('storage-set');
        captureCalls.effects.push('storage-set');
        captureCalls.storageSets += 1;
        if (storageMode === 'quota') throw new Error('QUOTA_BYTES quota exceeded.');
        if (storageMode === 'error') throw new Error('Injected state write failure.');
        persistedState = deepClone(value.te);
        if (afterStorageSet) await afterStorageSet();
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
      stateWriteEffectOrder.push('alarms-get-all');
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
    create(id, options, callback) {
      captureCalls.notificationAttempts.push({ id, options: deepClone(options) });
      captureCalls.effects.push(`notification-attempt:${id}`);
      const failed = (typeof notificationFailure === 'function' && notificationFailure(id))
        || notificationFailure === id;
      if (notificationApiMode === 'hybrid') {
        let nativeSettled = false;
        const recordSuccess = () => {
          if (nativeSettled) return;
          nativeSettled = true;
          captureCalls.effects.push(`notification:${id}`);
          captureCalls.notifications.push({ id, options: deepClone(options) });
        };
        let resolvePromise;
        let rejectPromise;
        const returned = new Promise((resolve, reject) => {
          resolvePromise = resolve;
          rejectPromise = reject;
        });
        releaseHybridCreateCallback = ({ error = null } = {}) => {
          if (error) chrome.runtime.lastError = { message: error };
          else recordSuccess();
          callback?.(id);
          delete chrome.runtime.lastError;
        };
        releaseHybridCreatePromise = ({ error = null } = {}) => {
          if (error) rejectPromise(new Error(error));
          else {
            recordSuccess();
            resolvePromise(id);
          }
        };
        return returned;
      }
      if (notificationApiMode === 'callback-only') {
        releaseNotificationCreate = ({ error = failed ? 'Injected notification failure.' : null } = {}) => {
          if (error) chrome.runtime.lastError = { message: error };
          else {
            captureCalls.effects.push(`notification:${id}`);
            captureCalls.notifications.push({ id, options: deepClone(options) });
          }
          callback?.(id);
          delete chrome.runtime.lastError;
        };
        return undefined;
      }
      if (failed) return Promise.reject(new Error('Injected notification failure.'));
      captureCalls.effects.push(`notification:${id}`);
      captureCalls.notifications.push({ id, options: deepClone(options) });
      return Promise.resolve(id);
    },
    update(id, options, callback) {
      captureCalls.notificationUpdateAttempts.push({ id, options: deepClone(options) });
      captureCalls.effects.push(`notification-update-attempt:${id}`);
      const failed = (typeof notificationUpdateFailure === 'function' && notificationUpdateFailure(id))
        || notificationUpdateFailure === id;
      if (notificationApiMode === 'callback-only') {
        releaseNotificationUpdate = ({ error = failed ? 'Injected notification update failure.' : null, updated = true } = {}) => {
          if (error) chrome.runtime.lastError = { message: error };
          else if (updated) {
            captureCalls.effects.push(`notification-update:${id}`);
            captureCalls.notificationUpdates.push({ id, options: deepClone(options) });
          }
          callback?.(updated);
          delete chrome.runtime.lastError;
        };
        return undefined;
      }
      if (failed) return Promise.reject(new Error('Injected notification update failure.'));
      captureCalls.effects.push(`notification-update:${id}`);
      captureCalls.notificationUpdates.push({ id, options: deepClone(options) });
      return Promise.resolve(true);
    },
    clear(id, callback) {
      captureCalls.effects.push(`notification-clear-attempt:${id}`);
      if (notificationApiMode === 'callback-only') {
        releaseNotificationClear = ({ error = null, cleared = true } = {}) => {
          if (error) chrome.runtime.lastError = { message: error };
          else if (cleared) {
            captureCalls.clearedNotifications.push(id);
            captureCalls.effects.push(`notification-clear:${id}`);
          }
          callback?.(cleared);
          delete chrome.runtime.lastError;
        };
        return undefined;
      }
      captureCalls.clearedNotifications.push(id);
      captureCalls.effects.push(`notification-clear:${id}`);
      return Promise.resolve(true);
    },
  },
  tabs: {
    async query(query = {}) {
      captureCalls.tabQueries.push(deepClone(query));
      let matches = tabInventory;
      if (Number.isInteger(query.windowId)) matches = matches.filter(tab => tab.windowId === query.windowId);
      if (query.active === true) matches = matches.filter(tab => tab.active === true);
      if (query.currentWindow === true) matches = matches.filter(tab => tab.windowId === 7);
      return deepClone(matches);
    },
    async get(id) {
      captureCalls.effects.push(`tab-get:${id}`);
      captureCalls.tabGets.push(id);
      if (tabGetFailure === id) throw new Error('Injected tab read failure.');
      const tab = tabInventory.find(candidate => candidate.id === id);
      if (!tab) throw new Error('Tab not found.');
      const result = typeof tabGetOverride === 'function'
        ? tabGetOverride(id, deepClone(tab))
        : tab;
      if (afterTabGet) await afterTabGet(id, deepClone(result));
      return deepClone(result);
    },
    async remove(id) {
      captureCalls.effects.push(`tab-remove-attempt:${id}`);
      if (tabRemoveFailure === id) throw new Error('Injected tab remove failure.');
      captureCalls.effects.push(`tab-remove:${id}`);
      captureCalls.removedTabs.push(id);
      tabInventory = tabInventory.filter(tab => tab.id !== id);
    },
    async create(options) {
      captureCalls.effects.push(`tab-create-attempt:${options.url}`);
      if (tabCreateFailure) throw new Error('Injected tab create failure.');
      captureCalls.effects.push(`tab-create:${options.url}`);
      captureCalls.openedTabs.push(deepClone(options));
      const created = {
        id: nextCreatedTabId++,
        windowId: Number.isInteger(options.windowId) ? options.windowId : 7,
        active: options.active !== false,
        ...deepClone(options),
      };
      if (created.active) {
        tabInventory.forEach(tab => {
          if (tab.windowId === created.windowId) tab.active = false;
        });
      }
      tabInventory.push(created);
      return deepClone(created);
    },
  },
  action: {
    setBadgeText(options) {
      if (badgeFailure) throw new Error('Injected badge failure.');
      captureCalls.badges.push(deepClone(options));
    },
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
  collectFutureReminderAlarms,
  entityReminderAlarmName,
  parseEntityReminderAlarmName,
  requestReminderAlarmReconciliation,
  collectCaptureReservedIds,
  createCaptureIdAllocator,
  ensureDefault,
  isCapturableUrl,
  resolveCaptureDestination,
  resolveCaptureTarget,
  addToInbox,
  closeCapturedTabIfEnabled,
  saveContextWindow,
  closeContextWindowSources,
  buildCaptureReceiptNotificationId,
  parseCaptureReceiptNotificationId,
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

function fixtureCategory(targetState = persistedState) {
  return targetState.workspaces[0].categories[0];
}

function fixtureGroup(targetState = persistedState) {
  return fixtureCategory(targetState).groups[0];
}

function fixtureItem(id, targetState = persistedState) {
  const visit = items => {
    for (const item of items || []) {
      if (item.id === id) return item;
      if (item.type === 'stack') {
        const nested = visit(item.items);
        if (nested) return nested;
      }
    }
    return null;
  };
  return visit(fixtureGroup(targetState).items);
}

function resetReminderDeliveryScenario() {
  currentNow = fixedNow;
  persistedState = deepClone(state);
  storageMode = 'normal';
  conflictRead = 0;
  alarmFailure = null;
  notificationFailure = null;
  notificationUpdateFailure = null;
  notificationApiMode = 'promise';
  releaseNotificationCreate = null;
  releaseNotificationUpdate = null;
  releaseNotificationClear = null;
  releaseHybridCreateCallback = null;
  releaseHybridCreatePromise = null;
  tabGetFailure = null;
  tabGetOverride = null;
  afterTabGet = null;
  tabRemoveFailure = null;
  tabCreateFailure = false;
  nextCreatedTabId = 100;
  badgeFailure = false;
  afterStorageSet = null;
  alarmMap.clear();
  alarmMap.set('other-alarm', { name: 'other-alarm', scheduledTime: fixedNow + 2 });
  alarmMap.set('te-pomodoro', { name: 'te-pomodoro', scheduledTime: fixedNow + 3 });
  alarmCalls.created.length = 0;
  alarmCalls.cleared.length = 0;
  captureCalls.storageSets = 0;
  captureCalls.notifications.length = 0;
  captureCalls.notificationAttempts.length = 0;
  captureCalls.notificationUpdates.length = 0;
  captureCalls.notificationUpdateAttempts.length = 0;
  captureCalls.openedTabs.length = 0;
  captureCalls.clearedNotifications.length = 0;
  captureCalls.tabGets.length = 0;
  captureCalls.tabQueries.length = 0;
  captureCalls.badges.length = 0;
  captureCalls.effects.length = 0;
  captureCalls.storageGets = 0;
}

function assertNoReminderDelivery(before, label) {
  assert.deepEqual(persistedState, before, `${label} must not mutate persisted state`);
  assert.equal(captureCalls.storageSets, 0, `${label} must not write state`);
  assert.deepEqual(captureCalls.notifications, [], `${label} must not notify`);
  assert.deepEqual(alarmCalls.created, [], `${label} must not reconcile alarms`);
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

  const encoded = testApi.entityReminderAlarmName('group', 'group-|空', { id: 'reminder-|醒' }, 0);
  assert.equal(encoded, 'te-greminder2-group-%7C%E7%A9%BA|reminder-%7C%E9%86%92');
  assert.deepEqual(
    deepClone(testApi.parseEntityReminderAlarmName(encoded)),
    { kind: 'group', entId: 'group-|空', reminderId: 'reminder-|醒', legacyIndex: null },
    'stable alarm components must round-trip through delimiter-safe encoding',
  );
  const legacyState = deepClone(state);
  legacyState.schema = 11;
  for (const reminder of [...fixtureCategory(legacyState).reminders, ...fixtureGroup(legacyState).reminders]) delete reminder.id;
  const legacyEntityNames = [...testApi.collectFutureReminderAlarms(legacyState, fixedNow).keys()]
    .filter(name => name.startsWith('te-greminder-') || name.startsWith('te-creminder-'))
    .sort();
  assert.deepEqual(legacyEntityNames, [
    'te-creminder-category-0',
    'te-creminder-category-1',
    'te-greminder-group-0',
    'te-greminder-group-1',
  ], 'schema-11 reminders must retain a transition alarm until migration is authoritative');

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

async function testReminderDeliveryPersistence() {
  const recurringCases = [
    {
      name: 'te-reminder-daily-recurring',
      notificationId: 'te-notif-daily-recurring',
      getReminder: targetState => fixtureItem('daily-recurring', targetState).reminder,
    },
    {
      name: 'te-reminder-nested-recurring',
      notificationId: 'te-notif-nested-recurring',
      getReminder: targetState => fixtureItem('nested-recurring', targetState).reminder,
    },
    {
      name: 'te-greminder2-group|group-biweekly',
      notificationId: 'te-gnotif-group|group-biweekly',
      getReminder: targetState => fixtureGroup(targetState).reminders[1],
    },
    {
      name: 'te-creminder2-category|category-monthly',
      notificationId: 'te-cnotif-category|category-monthly',
      getReminder: targetState => fixtureCategory(targetState).reminders[1],
    },
  ];

  for (const delivery of recurringCases) {
    resetReminderDeliveryScenario();
    const scheduledTime = restartAlarmTimes.get(delivery.name);
    const nextTime = deliveryNextTimes.get(delivery.name);
    const before = deepClone(persistedState);
    currentNow = scheduledTime;

    await listeners.alarm({ name: delivery.name, scheduledTime });

    const expected = deepClone(before);
    expected._revision += 1;
    const expectedReminder = delivery.getReminder(expected);
    expectedReminder.at = nextTime;
    expectedReminder.notified = false;
    assert.deepEqual(persistedState, expected, `${delivery.name} must persist only its next occurrence`);
    assert.equal(captureCalls.storageSets, 1, `${delivery.name} must use one central state write`);
    assert.deepEqual(captureCalls.notifications.map(call => call.id), [delivery.notificationId]);
    assert.equal(alarmMap.get(delivery.name)?.scheduledTime, nextTime, `${delivery.name} must keep its stable name at the exact next occurrence`);
    assert.equal(alarmMap.has('other-alarm'), true, `${delivery.name} must preserve unrelated alarms`);
    assert.equal(alarmMap.has('te-pomodoro'), true, `${delivery.name} must preserve other Locus alarms`);
  }

  resetReminderDeliveryScenario();
  const movedIdentityName = 'te-greminder2-group|group-biweekly';
  const movedIdentityTime = restartAlarmTimes.get(movedIdentityName);
  fixtureGroup().reminders.reverse();
  const movedIdentityBefore = deepClone(persistedState);
  currentNow = movedIdentityTime;
  await listeners.alarm({ name: movedIdentityName, scheduledTime: movedIdentityTime });
  const movedIdentityExpected = deepClone(movedIdentityBefore);
  movedIdentityExpected._revision += 1;
  const movedReminder = fixtureGroup(movedIdentityExpected).reminders.find(reminder => reminder.id === 'group-biweekly');
  movedReminder.at = deliveryNextTimes.get(movedIdentityName);
  movedReminder.notified = false;
  assert.deepEqual(persistedState, movedIdentityExpected, 'an index-shifted reminder must deliver and advance by stable id');
  assert.deepEqual(captureCalls.notifications.map(call => call.id), ['te-gnotif-group|group-biweekly']);
  assert.equal(fixtureGroup().reminders.find(reminder => reminder.id === 'group-once').at, fixedNow + 120_000, 'the shifted neighbor must remain untouched');

  resetReminderDeliveryScenario();
  const legacyIdentityState = deepClone(persistedState);
  legacyIdentityState.schema = 11;
  for (const reminder of [...fixtureCategory(legacyIdentityState).reminders, ...fixtureGroup(legacyIdentityState).reminders]) delete reminder.id;
  persistedState = legacyIdentityState;
  const legacyIdentityName = 'te-greminder-group-1';
  const legacyIdentityTime = restartAlarmTimes.get('te-greminder2-group|group-biweekly');
  const legacyIdentityBefore = deepClone(persistedState);
  currentNow = legacyIdentityTime;
  await listeners.alarm({ name: legacyIdentityName, scheduledTime: legacyIdentityTime });
  const legacyIdentityExpected = deepClone(legacyIdentityBefore);
  legacyIdentityExpected._revision += 1;
  fixtureGroup(legacyIdentityExpected).reminders[1].at = deliveryNextTimes.get('te-greminder2-group|group-biweekly');
  fixtureGroup(legacyIdentityExpected).reminders[1].notified = false;
  assert.deepEqual(persistedState, legacyIdentityExpected, 'a schema-11 transition alarm must remain deliverable before migration');
  assert.deepEqual(captureCalls.notifications.map(call => call.id), ['te-gnotif-group-1']);

  resetReminderDeliveryScenario();
  const oneShotName = 'te-reminder-item';
  const oneShotTime = fixtureItem('item').reminder.at;
  const oneShotBefore = deepClone(persistedState);
  currentNow = oneShotTime;
  await listeners.alarm({ name: oneShotName, scheduledTime: oneShotTime });
  const oneShotExpected = deepClone(oneShotBefore);
  oneShotExpected._revision += 1;
  fixtureItem('item', oneShotExpected).reminder.notified = true;
  assert.deepEqual(persistedState, oneShotExpected, 'a delivered one-shot must persist as notified');
  assert.deepEqual(captureCalls.notifications.map(call => call.id), ['te-notif-item']);
  assert.equal(alarmMap.has(oneShotName), false, 'a delivered one-shot must not be re-armed');

  resetReminderDeliveryScenario();
  const finalOccurrenceName = 'te-reminder-daily-recurring';
  const finalOccurrenceTime = fixedNow + (5 * 60_000);
  const finalReminder = fixtureItem('daily-recurring').reminder;
  finalReminder.at = finalOccurrenceTime;
  finalReminder.notified = false;
  finalReminder.recur = { every: 'day', interval: 1, until: finalOccurrenceTime };
  const finalOccurrenceBefore = deepClone(persistedState);
  currentNow = finalOccurrenceTime;
  await listeners.alarm({ name: finalOccurrenceName, scheduledTime: finalOccurrenceTime });
  const finalOccurrenceExpected = deepClone(finalOccurrenceBefore);
  finalOccurrenceExpected._revision += 1;
  fixtureItem('daily-recurring', finalOccurrenceExpected).reminder.notified = true;
  assert.deepEqual(persistedState, finalOccurrenceExpected, 'the last permitted recurrence must persist as notified');
  assert.equal(alarmMap.has(finalOccurrenceName), false, 'a recurrence beyond its until bound must not be armed');

  resetReminderDeliveryScenario();
  const staleName = 'te-reminder-item';
  const staleTime = fixtureItem('item').reminder.at;
  fixtureItem('item').reminder.at = staleTime + (10 * 60_000);
  let staleBefore = deepClone(persistedState);
  currentNow = staleTime;
  await listeners.alarm({ name: staleName, scheduledTime: staleTime });
  assertNoReminderDelivery(staleBefore, 'a rescheduled stale alarm');

  resetReminderDeliveryScenario();
  const removedTime = fixtureItem('item').reminder.at;
  delete fixtureItem('item').reminder;
  staleBefore = deepClone(persistedState);
  currentNow = removedTime;
  await listeners.alarm({ name: staleName, scheduledTime: removedTime });
  assertNoReminderDelivery(staleBefore, 'a removed reminder alarm');

  resetReminderDeliveryScenario();
  const removedIdentityName = 'te-greminder2-group|group-biweekly';
  const removedIdentityTime = restartAlarmTimes.get(removedIdentityName);
  fixtureGroup().reminders[1] = {
    id: 'same-time-replacement',
    at: removedIdentityTime,
    notified: false,
    recur: { every: 'week', interval: 2 },
  };
  staleBefore = deepClone(persistedState);
  currentNow = removedIdentityTime;
  await listeners.alarm({ name: removedIdentityName, scheduledTime: removedIdentityTime });
  assertNoReminderDelivery(staleBefore, 'a removed stable identity replaced at the same index and time');

  resetReminderDeliveryScenario();
  fixtureGroup().reminders[0].id = 'group-biweekly';
  staleBefore = deepClone(persistedState);
  currentNow = removedIdentityTime;
  await listeners.alarm({ name: removedIdentityName, scheduledTime: removedIdentityTime });
  assertNoReminderDelivery(staleBefore, 'a duplicated current-schema reminder identity');

  resetReminderDeliveryScenario();
  fixtureGroup().reminders[1].notified = true;
  staleBefore = deepClone(persistedState);
  currentNow = removedIdentityTime;
  await listeners.alarm({ name: removedIdentityName, scheduledTime: removedIdentityTime });
  assertNoReminderDelivery(staleBefore, 'an already-notified reminder alarm');

  resetReminderDeliveryScenario();
  const failedNotificationTime = fixtureItem('item').reminder.at;
  const failedNotificationBefore = deepClone(persistedState);
  notificationFailure = 'te-notif-item';
  currentNow = failedNotificationTime;
  await listeners.alarm({ name: oneShotName, scheduledTime: failedNotificationTime });
  assertNoReminderDelivery(failedNotificationBefore, 'a failed delivery notification');

  resetReminderDeliveryScenario();
  const failedWrite = recurringCases[0];
  const failedWriteTime = restartAlarmTimes.get(failedWrite.name);
  const failedWriteNext = deliveryNextTimes.get(failedWrite.name);
  const failedWriteBefore = deepClone(persistedState);
  storageMode = 'quota';
  currentNow = failedWriteTime;
  await listeners.alarm({ name: failedWrite.name, scheduledTime: failedWriteTime });
  assert.deepEqual(persistedState, failedWriteBefore, 'a failed delivery write must leave authority unchanged');
  assert.equal(captureCalls.storageSets, 1, 'a failed delivery write must not retry blindly');
  assert.equal(alarmMap.get(failedWrite.name)?.scheduledTime, failedWriteNext, 'a failed delivery write must rebuild the consumed recurrence from authority');
  assert.equal(captureCalls.notifications.some(call => call.id === failedWrite.notificationId), true, 'the delivered notification remains observable');
  assert.equal(captureCalls.notifications.some(call => call.id.startsWith('te-storage-quota-')), true, 'a quota failure must remain visible');
  assert.equal(captureCalls.notifications.some(call => call.id.startsWith('te-reminder-error-')), false, 'the existing quota warning must avoid a duplicate reminder warning after alarm recovery');

  resetReminderDeliveryScenario();
  const genericWriteBefore = deepClone(persistedState);
  storageMode = 'error';
  currentNow = failedWriteTime;
  await listeners.alarm({ name: failedWrite.name, scheduledTime: failedWriteTime });
  assert.deepEqual(persistedState, genericWriteBefore, 'a generic delivery write failure must leave authority unchanged');
  assert.equal(captureCalls.storageSets, 1, 'a generic delivery write failure must not retry blindly');
  assert.equal(alarmMap.get(failedWrite.name)?.scheduledTime, failedWriteNext, 'a generic write failure must rebuild the consumed recurrence from authority');
  const updateWarning = captureCalls.notifications.find(call => call.id.startsWith('te-reminder-error-'));
  assert.ok(updateWarning, 'a non-quota delivery write failure must surface an actionable warning');
  assert.match(updateWarning.options.title, /update needs attention/i);
  assert.match(updateWarning.options.message, /could not save its status/i);

  resetReminderDeliveryScenario();
  const failedRearm = recurringCases[0];
  const failedRearmTime = restartAlarmTimes.get(failedRearm.name);
  const failedRearmNext = deliveryNextTimes.get(failedRearm.name);
  const failedRearmBefore = deepClone(persistedState);
  alarmFailure = { create: failedRearm.name };
  currentNow = failedRearmTime;
  await listeners.alarm({ name: failedRearm.name, scheduledTime: failedRearmTime });
  const failedRearmExpected = deepClone(failedRearmBefore);
  failedRearmExpected._revision += 1;
  const failedRearmReminder = failedRearm.getReminder(failedRearmExpected);
  failedRearmReminder.at = failedRearmNext;
  failedRearmReminder.notified = false;
  assert.deepEqual(persistedState, failedRearmExpected, 'a re-arm failure must not roll back an accepted delivery write');
  assert.equal(alarmMap.has(failedRearm.name), false, 'a failed alarm create must remain observable as missing');
  const schedulingWarning = captureCalls.notifications.find(call => call.id.startsWith('te-reminder-error-'));
  assert.ok(schedulingWarning, 'a failed post-delivery reconciliation must surface an actionable warning');
  assert.match(schedulingWarning.options.title, /scheduling needs attention/i);
  assert.match(schedulingWarning.options.message, /open Locus/i);
  await listeners.notificationClick(schedulingWarning.id);
  assert.deepEqual(captureCalls.openedTabs.at(-1), { url: 'chrome-extension://locus/newtab.html' });
  assert.equal(captureCalls.clearedNotifications.includes(schedulingWarning.id), true);

  resetReminderDeliveryScenario();
}

async function testCallbackOnlyReminderDeliveryFailureStaysAuthoritative() {
  resetReminderDeliveryScenario();
  notificationApiMode = 'callback-only';
  const alarmName = 'te-reminder-item';
  const scheduledTime = fixtureItem('item').reminder.at;
  const before = deepClone(persistedState);
  currentNow = scheduledTime;

  let deliverySettled = false;
  const delivery = listeners.alarm({ name: alarmName, scheduledTime })
    .finally(() => { deliverySettled = true; });
  for (let turn = 0; turn < 8 && typeof releaseNotificationCreate !== 'function'; turn += 1) {
    await Promise.resolve();
  }
  assert.equal(typeof releaseNotificationCreate, 'function',
    'callback-only Chrome must expose a pending native delivery receipt');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(deliverySettled, false,
    'reminder delivery must stay pending until callback-only Chrome settles');
  assert.deepEqual(persistedState, before,
    'before the native callback, reminder authority must remain unchanged');
  assert.equal(captureCalls.storageSets, 0,
    'before the native callback, reminder delivery must perform zero state writes');
  assert.deepEqual(alarmCalls.created, [],
    'before the native callback, reminder delivery must not reconcile alarms');

  releaseNotificationCreate({ error: 'Injected callback-only notification failure.' });
  await delivery;
  assert.deepEqual(persistedState, before,
    'a callback-only notification failure must leave reminder authority unchanged');
  assert.equal(captureCalls.storageSets, 0,
    'a callback-only notification failure must not consume the reminder');
  assert.deepEqual(alarmCalls.created, [],
    'a callback-only notification failure must not reconcile from an undelivered reminder');
  assert.deepEqual(captureCalls.notifications, [],
    'a callback-only notification failure must not record a delivered native notification');
  resetReminderDeliveryScenario();
}

async function testCallbackOnlyReminderDeliverySuccessCommitsAfterReceipt() {
  resetReminderDeliveryScenario();
  notificationApiMode = 'callback-only';
  const alarmName = 'te-reminder-item';
  const scheduledTime = fixtureItem('item').reminder.at;
  const before = deepClone(persistedState);
  const effectOrderStart = stateWriteEffectOrder.length;
  currentNow = scheduledTime;

  let deliverySettled = false;
  const delivery = listeners.alarm({ name: alarmName, scheduledTime })
    .finally(() => { deliverySettled = true; });
  for (let turn = 0; turn < 8 && typeof releaseNotificationCreate !== 'function'; turn += 1) {
    await Promise.resolve();
  }
  assert.equal(typeof releaseNotificationCreate, 'function',
    'callback-only Chrome must expose a pending native delivery receipt');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(deliverySettled, false,
    'successful reminder delivery must stay pending until callback-only Chrome settles');
  assert.deepEqual(captureCalls.notificationAttempts.map(call => call.id), ['te-notif-item'],
    'the pending delivery must make exactly one native notification attempt');
  assert.deepEqual(captureCalls.notifications, [],
    'withholding the callback must not report a native notification as delivered');
  assert.deepEqual(persistedState, before,
    'withholding the callback must leave reminder authority unchanged');
  assert.equal(captureCalls.storageSets, 0,
    'withholding the callback must perform zero state writes');
  assert.deepEqual(stateWriteEffectOrder.slice(effectOrderStart), [],
    'withholding the callback must not start alarm reconciliation');
  assert.deepEqual(alarmCalls.created, [],
    'withholding the callback must not schedule replacement alarms');
  assert.deepEqual(alarmCalls.cleared, [],
    'withholding the callback must not clear alarms');

  releaseNotificationCreate();
  await delivery;

  const expected = deepClone(before);
  expected._revision += 1;
  fixtureItem('item', expected).reminder.notified = true;
  assert.equal(deliverySettled, true,
    'the public alarm delivery must settle after callback-only Chrome succeeds');
  assert.deepEqual(captureCalls.notificationAttempts.map(call => call.id), ['te-notif-item'],
    'callback success must not duplicate the native notification attempt');
  assert.deepEqual(captureCalls.notifications.map(call => call.id), ['te-notif-item'],
    'callback success must record exactly one delivered native notification');
  assert.deepEqual(persistedState, expected,
    'callback success must persist only the delivered one-shot status');
  assert.equal(captureCalls.storageSets, 1,
    'callback success must use exactly one central state write');
  assert.deepEqual(stateWriteEffectOrder.slice(effectOrderStart), ['storage-set', 'alarms-get-all'],
    'callback success must persist authority before reconciling alarms');
  assert.equal(alarmMap.has(alarmName), false,
    'a delivered one-shot must remain unscheduled after reconciliation');
  resetReminderDeliveryScenario();
}

async function testCallbackOnlyEntityReminderDeliveryUsesNativeReceipt() {
  resetReminderDeliveryScenario();
  notificationApiMode = 'callback-only';
  const alarmName = 'te-greminder2-group|group-biweekly';
  const notificationId = 'te-gnotif-group|group-biweekly';
  const scheduledTime = restartAlarmTimes.get(alarmName);
  const before = deepClone(persistedState);
  const effectOrderStart = stateWriteEffectOrder.length;
  currentNow = scheduledTime;

  let deliverySettled = false;
  const delivery = listeners.alarm({ name: alarmName, scheduledTime })
    .finally(() => { deliverySettled = true; });
  for (let turn = 0; turn < 8 && typeof releaseNotificationCreate !== 'function'; turn += 1) {
    await Promise.resolve();
  }
  assert.equal(typeof releaseNotificationCreate, 'function',
    'a callback-only Group delivery must expose a pending native receipt');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(deliverySettled, false,
    'Group delivery must wait for callback-only Chrome before advancing recurrence');
  assert.deepEqual(persistedState, before,
    'a pending Group notification must leave recurrence authority unchanged');
  assert.equal(captureCalls.storageSets, 0,
    'a pending Group notification must perform zero state writes');
  assert.deepEqual(stateWriteEffectOrder.slice(effectOrderStart), [],
    'a pending Group notification must not start reconciliation');

  releaseNotificationCreate();
  await delivery;

  const expected = deepClone(before);
  expected._revision += 1;
  const expectedReminder = fixtureGroup(expected).reminders.find(reminder => reminder.id === 'group-biweekly');
  expectedReminder.at = deliveryNextTimes.get(alarmName);
  expectedReminder.notified = false;
  assert.deepEqual(captureCalls.notificationAttempts.map(call => call.id), [notificationId],
    'Group delivery must make exactly one native notification attempt');
  assert.deepEqual(captureCalls.notifications.map(call => call.id), [notificationId],
    'Group delivery must record exactly one native notification');
  assert.deepEqual(persistedState, expected,
    'Group delivery must advance only its stable recurring reminder after callback success');
  assert.equal(captureCalls.storageSets, 1,
    'Group callback success must use exactly one central state write');
  assert.deepEqual(stateWriteEffectOrder.slice(effectOrderStart), ['storage-set', 'alarms-get-all'],
    'Group callback success must persist authority before reconciling alarms');
  assert.equal(alarmMap.get(alarmName)?.scheduledTime, deliveryNextTimes.get(alarmName),
    'Group callback success must re-arm the stable reminder at its exact next occurrence');
  resetReminderDeliveryScenario();
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

  const reconciledCandidate = deepClone(persistedState);
  fixtureItem('item', reconciledCandidate).reminder.at = fixedNow + 300_000;
  stateWriteEffectOrder.length = 0;
  const reconciled = await sendRuntimeMessage({
    type: 'locus-state-write',
    state: reconciledCandidate,
    reconcileReminders: true,
  });
  assert.equal(reconciled.ok, true);
  assert.equal(reconciled.revision, 4);
  assert.equal(reconciled.reminderReconciliation?.ok, true, 'the write receipt must include its completed alarm effect');
  assert.equal(reconciled.reminderReconciliation?.reason, 'state-write');
  assert.deepEqual(stateWriteEffectOrder.slice(0, 2), ['storage-set', 'alarms-get-all'], 'alarm reconciliation must begin only after storage accepts the state');
  assert.equal(alarmMap.get('te-reminder-item')?.scheduledTime, fixedNow + 300_000);

  const alarmFailureCandidate = deepClone(persistedState);
  fixtureItem('item', alarmFailureCandidate).reminder.at = fixedNow + 360_000;
  alarmFailure = { create: 'te-reminder-item' };
  const alarmFailureReceipt = await sendRuntimeMessage({
    type: 'locus-state-write',
    state: alarmFailureCandidate,
    reconcileReminders: true,
  });
  assert.equal(alarmFailureReceipt.ok, true, 'an alarm failure must not erase an accepted state receipt');
  assert.equal(alarmFailureReceipt.revision, 5);
  assert.equal(alarmFailureReceipt.reminderReconciliation?.ok, false, 'the accepted receipt must expose the post-write alarm failure');
  assert.equal(fixtureItem('item').reminder.at, fixedNow + 360_000, 'the accepted reminder state must survive an alarm failure');
  alarmFailure = null;

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

async function testAcceptedQuickCaptureReceiptSurvivesMalformedGraph() {
  storageMode = 'normal';
  const malformedCollections = [
    ['Workspace categories', candidate => {
      candidate.workspaces.push({ id: 'malformed-workspace', categories: {} });
    }],
    ['Space groups', candidate => {
      candidate.workspaces.push({
        id: 'malformed-workspace',
        categories: [{ id: 'malformed-category', groups: {} }],
      });
    }],
    ['Group items', candidate => {
      candidate.workspaces.push({
        id: 'malformed-workspace',
        categories: [{
          id: 'malformed-category',
          groups: [{ id: 'malformed-group', items: {} }],
        }],
      });
    }],
    ['nested items', candidate => {
      candidate.workspaces.push({
        id: 'malformed-workspace',
        categories: [{
          id: 'malformed-category',
          groups: [{
            id: 'malformed-group',
            items: [{ id: 'malformed-stack', type: 'stack', items: {} }],
          }],
        }],
      });
    }],
  ];

  for (const [label, mutate] of malformedCollections) {
    const before = deepClone(persistedState);
    const candidate = deepClone(persistedState);
    mutate(candidate);
    const storageSetsBefore = captureCalls.storageSets;
    const browserEffectsBefore = {
      removedTabs: captureCalls.removedTabs.length,
      notificationAttempts: captureCalls.notificationAttempts.length,
      openedTabs: captureCalls.openedTabs.length,
      tabGets: captureCalls.tabGets.length,
      tabQueries: captureCalls.tabQueries.length,
    };

    const receipt = await sendRuntimeMessage({
      type: 'locus-state-write',
      state: candidate,
      quickCaptureItem: {
        workspaceId: 'workspace',
        itemId: 'item',
        expectedUrl: 'https://item.test',
      },
    });

    assert.deepEqual(deepClone(receipt), {
      ok: true,
      revision: before._revision + 1,
      quickCaptureResult: {
        ok: false,
        code: 'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE',
        destinationReady: false,
      },
    }, `${label} must keep its authoritative write receipt and expose only an unavailable destination`);
    assert.equal(captureCalls.storageSets, storageSetsBefore + 1,
      `${label} receipt resolution must not retry or repair the accepted write`);
    const accepted = deepClone(candidate);
    accepted._revision = before._revision + 1;
    assert.deepEqual(persistedState, accepted,
      `${label} receipt resolution must leave the accepted graph unchanged`);
    assert.deepEqual({
      removedTabs: captureCalls.removedTabs.length,
      notificationAttempts: captureCalls.notificationAttempts.length,
      openedTabs: captureCalls.openedTabs.length,
      tabGets: captureCalls.tabGets.length,
      tabQueries: captureCalls.tabQueries.length,
    }, browserEffectsBefore, `${label} must produce no browser effect after acceptance`);

    persistedState = before;
  }
}

async function testAcceptedQuickCaptureReceiptRejectsMalformedDestination() {
  storageMode = 'normal';
  const before = deepClone(persistedState);
  const candidate = deepClone(persistedState);
  candidate.workspaces[0].categories[0].id = { malformed: true };
  const storageSetsBefore = captureCalls.storageSets;

  const receipt = await sendRuntimeMessage({
    type: 'locus-state-write',
    state: candidate,
    quickCaptureItem: {
      workspaceId: 'workspace',
      itemId: 'item',
      expectedUrl: 'https://item.test',
    },
  });

  assert.deepEqual(deepClone(receipt), {
    ok: true,
    revision: before._revision + 1,
    quickCaptureResult: {
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE',
      destinationReady: false,
    },
  }, 'a malformed destination identity must not be advertised as ready after its state write is accepted');
  assert.equal(captureCalls.storageSets, storageSetsBefore + 1,
    'destination validation must neither retry nor repair the accepted write');

  persistedState = before;
}

async function testAcceptedQuickCaptureReceiptTraversesLargeValidStackSafely() {
  storageMode = 'normal';
  const before = deepClone(persistedState);
  const candidate = deepClone(persistedState);
  const nestedItems = new Array(200_000).fill(null);
  nestedItems[nestedItems.length - 1] = {
    id: 'large-item',
    type: 'tab',
    title: 'Large graph item',
    url: 'https://large-graph.test',
  };
  candidate.workspaces.push({
    id: 'large-workspace',
    categories: [{
      id: 'large-category',
      name: 'Large category',
      groups: [{
        id: 'large-group',
        name: 'Large group',
        items: [{ id: 'large-stack', type: 'stack', items: nestedItems }],
      }],
    }],
  });
  const storageSetsBefore = captureCalls.storageSets;

  const receipt = await sendRuntimeMessage({
    type: 'locus-state-write',
    state: candidate,
    quickCaptureItem: {
      workspaceId: 'large-workspace',
      itemId: 'large-item',
      expectedUrl: 'https://large-graph.test',
    },
  });

  assert.deepEqual(deepClone(receipt), {
    ok: true,
    revision: before._revision + 1,
    quickCaptureResult: {
      ok: true,
      destinationReady: true,
      destination: {
        workspaceId: 'large-workspace',
        categoryId: 'large-category',
        categoryName: 'Large category',
        groupId: 'large-group',
        groupName: 'Large group',
        itemId: 'large-item',
      },
    },
  }, 'a large valid nested graph must not lose its exact accepted destination to variadic traversal limits');
  assert.equal(captureCalls.storageSets, storageSetsBefore + 1,
    'large-graph receipt resolution must remain an accepted-once read-only continuation');

  persistedState = before;
}

async function testCaptureConflicts() {
  const captureTab = {
    id: 99,
    windowId: 7,
    active: true,
    title: 'Captured tab',
    url: 'https://capture.test',
    favIconUrl: '',
  };
  tabInventory = [deepClone(captureTab)];
  const contextNotification = await assertCaptureConflict(
    () => listeners.contextMenu({ menuItemId: 'te-save-page' }, captureTab),
    'context-menu capture',
  );
  await assertCaptureConflict(
    () => listeners.command('save-current-tab'),
    'shortcut capture',
  );
  await assertCaptureConflict(
    () => listeners.contextMenu({ menuItemId: 'te-save-all' }, captureTab),
    'whole-window context-menu capture',
  );

  await listeners.notificationClick(contextNotification.id);
  assert.deepEqual(captureCalls.openedTabs.at(-1), { url: 'chrome-extension://locus/newtab.html' });
  assert.equal(captureCalls.clearedNotifications.includes(contextNotification.id), true);
}

function captureFixture() {
  return {
    schema: 12,
    _revision: 10,
    activeWsId: 'ws-a',
    settings: {
      language: 'en',
      closeTabOnSave: true,
      captureRememberLast: false,
      captureDeduplicate: true,
      captureIncludeTitle: true,
      captureIncludeFavicon: true,
      captureDefaultCategoryId: '',
    },
    archive: [{
      id: 'archive-entry',
      wsId: 'archive-ws',
      catId: 'archive-space',
      groupId: 'archive-group',
      data: { id: 'archive-item' },
    }],
    trash: [{
      id: 'trash-entry',
      wsId: 'trash-ws',
      catId: 'trash-space',
      groupId: 'trash-group',
      data: { id: 'trash-item' },
    }],
    columnSizes: { 'layout-size-id': 320 },
    columnWidths: { 'layout-width-id': 280 },
    workspaces: [{
      id: 'ws-a',
      name: 'Primary',
      activeCatId: 'space-a',
      categories: [{
        id: 'space-a',
        name: 'Focus',
        canvasPositions: { 'canvas-position-id': { x: 10, y: 20 } },
        groups: [{
          id: 'inbox-a',
          name: 'Inbox',
          symbol: '📥',
          items: [{ id: 'existing-item', type: 'tab', title: 'Existing', url: 'https://existing.test', fav: '' }],
        }, {
          id: 'project-a',
          name: 'Project',
          items: [],
        }],
      }, {
        id: 'space-b',
        name: 'Later',
        groups: [{
          id: 'inbox-b',
          name: 'Inbox',
          items: [],
        }],
      }],
    }, {
      id: 'ws-b',
      name: 'Secondary',
      activeCatId: 'space-c',
      categories: [{
        id: 'space-c',
        name: 'Reference',
        groups: [{
          id: 'inbox-c',
          name: 'Inbox',
          items: [],
        }],
      }],
    }],
  };
}

function captureSpace(targetState, id) {
  for (const workspace of targetState.workspaces || []) {
    const space = (workspace.categories || []).find(candidate => candidate.id === id);
    if (space) return space;
  }
  return null;
}

function captureGroup(targetState, id) {
  for (const workspace of targetState.workspaces || []) {
    for (const space of workspace.categories || []) {
      const group = (space.groups || []).find(candidate => candidate.id === id);
      if (group) return group;
    }
  }
  return null;
}

function resetCaptureScenario(candidate = captureFixture()) {
  currentNow = fixedNow;
  persistedState = deepClone(candidate);
  storageMode = 'normal';
  conflictRead = 0;
  afterStorageSet = null;
  notificationFailure = null;
  notificationUpdateFailure = null;
  notificationApiMode = 'promise';
  releaseNotificationCreate = null;
  releaseNotificationUpdate = null;
  releaseNotificationClear = null;
  releaseHybridCreateCallback = null;
  releaseHybridCreatePromise = null;
  tabGetFailure = null;
  tabGetOverride = null;
  afterTabGet = null;
  tabRemoveFailure = null;
  tabCreateFailure = false;
  nextCreatedTabId = 100;
  badgeFailure = false;
  stateWriteEffectOrder.length = 0;
  captureCalls.storageSets = 0;
  captureCalls.removedTabs.length = 0;
  captureCalls.notifications.length = 0;
  captureCalls.notificationAttempts.length = 0;
  captureCalls.notificationUpdates.length = 0;
  captureCalls.notificationUpdateAttempts.length = 0;
  captureCalls.openedTabs.length = 0;
  captureCalls.clearedNotifications.length = 0;
  captureCalls.tabGets.length = 0;
  captureCalls.tabQueries.length = 0;
  captureCalls.badges.length = 0;
  captureCalls.effects.length = 0;
  captureCalls.storageGets = 0;
  tabInventory = [{
    id: 99,
    windowId: 7,
    active: true,
    title: 'Captured tab',
    url: 'https://capture.test',
    favIconUrl: 'https://capture.test/favicon.ico',
  }];
}

const captureReceiptPrefix = 'te-capture-receipt-v1|';
const captureReceiptHomePrefix = 'te-capture-receipt-home-';
const captureReceiptCalls = () => captureCalls.notifications
  .filter(call => call.id.startsWith(captureReceiptPrefix) || call.id.startsWith(captureReceiptHomePrefix));
const captureReceiptAttempts = () => captureCalls.notificationAttempts
  .filter(call => call.id.startsWith(captureReceiptPrefix) || call.id.startsWith(captureReceiptHomePrefix));
const captureReceiptUpdateCalls = () => captureCalls.notificationUpdates
  .filter(call => call.id.startsWith(captureReceiptPrefix) || call.id.startsWith(captureReceiptHomePrefix));
const captureReceiptUpdateAttempts = () => captureCalls.notificationUpdateAttempts
  .filter(call => call.id.startsWith(captureReceiptPrefix) || call.id.startsWith(captureReceiptHomePrefix));

function onlyCaptureReceipt(label) {
  const receipts = captureReceiptCalls();
  assert.equal(receipts.length, 1, `${label} must create exactly one capture receipt`);
  const updates = captureReceiptUpdateCalls();
  assert.ok(updates.length <= 1, `${label} must update its stable receipt at most once`);
  if (updates.length) assert.equal(updates[0].id, receipts[0].id, `${label} must update the created receipt in place`);
  return updates[0] || receipts[0];
}

function assertCaptureReceiptRoute(receipt, expected) {
  const parsed = testApi.parseCaptureReceiptNotificationId(receipt.id);
  assert.ok(parsed, 'an actionable capture receipt must use the production codec');
  assert.equal(parsed.kind, expected.kind);
  assert.equal(parsed.workspaceId, expected.workspaceId);
  assert.equal(parsed.targetId, expected.targetId);
  assert.match(parsed.nonce, /^[a-z0-9-]{8,64}$/i);
  return parsed;
}

function assertCaptureTargetUnavailable(run, label) {
  assert.throws(
    run,
    error => error?.code === 'LOCUS_CAPTURE_TARGET_UNAVAILABLE',
    `${label} must fail closed`,
  );
}

async function testExactCaptureDestinationAndIds() {
  const activeState = captureFixture();
  const active = testApi.resolveCaptureDestination(activeState);
  assert.equal(active.ws.id, 'ws-a');
  assert.equal(active.cat.id, 'space-a');
  assert.equal(active.group, null);
  assert.equal(active.source, 'active');
  const activeTarget = testApi.resolveCaptureTarget(activeState);
  assert.equal(activeTarget.group.id, 'inbox-a');
  assert.equal(activeTarget.proposedInbox, false);

  const rememberedState = captureFixture();
  rememberedState.settings.captureRememberLast = true;
  rememberedState.settings.captureLastTarget = {
    workspaceId: 'ws-a',
    categoryId: 'space-a',
    groupId: 'project-a',
  };
  const remembered = testApi.resolveCaptureDestination(rememberedState);
  assert.equal(remembered.ws.id, 'ws-a');
  assert.equal(remembered.cat.id, 'space-a');
  assert.equal(remembered.group.id, 'project-a');
  assert.equal(remembered.source, 'remembered');

  const defaultState = captureFixture();
  defaultState.settings.captureDefaultCategoryId = 'space-b';
  const configured = testApi.resolveCaptureTarget(defaultState);
  assert.equal(configured.ws.id, 'ws-a');
  assert.equal(configured.cat.id, 'space-b');
  assert.equal(configured.group.id, 'inbox-b');
  assert.equal(configured.source, 'default');

  const incompleteRemembered = captureFixture();
  incompleteRemembered.settings.captureRememberLast = true;
  incompleteRemembered.settings.captureLastTarget = { groupId: 'project-a' };
  assertCaptureTargetUnavailable(
    () => testApi.resolveCaptureDestination(incompleteRemembered),
    'an incomplete remembered tuple',
  );

  const movedRemembered = captureFixture();
  movedRemembered.settings.captureRememberLast = true;
  movedRemembered.settings.captureLastTarget = {
    workspaceId: 'ws-a',
    categoryId: 'space-a',
    groupId: 'inbox-b',
  };
  assertCaptureTargetUnavailable(
    () => testApi.resolveCaptureDestination(movedRemembered),
    'a moved remembered Group',
  );

  const duplicateGroup = captureFixture();
  duplicateGroup.settings.captureRememberLast = true;
  duplicateGroup.settings.captureLastTarget = {
    workspaceId: 'ws-a',
    categoryId: 'space-a',
    groupId: 'project-a',
  };
  captureSpace(duplicateGroup, 'space-c').groups.push({ id: 'project-a', name: 'Duplicate', items: [] });
  assertCaptureTargetUnavailable(
    () => testApi.resolveCaptureDestination(duplicateGroup),
    'a duplicate remembered Group ID',
  );

  const staleDefault = captureFixture();
  staleDefault.settings.captureDefaultCategoryId = 'missing-space';
  assertCaptureTargetUnavailable(
    () => testApi.resolveCaptureDestination(staleDefault),
    'a stale configured default Space',
  );

  const duplicateActiveSpace = captureFixture();
  captureSpace(duplicateActiveSpace, 'space-c').id = 'space-a';
  assertCaptureTargetUnavailable(
    () => testApi.resolveCaptureDestination(duplicateActiveSpace),
    'a globally duplicate active Space ID',
  );

  const duplicateInbox = captureFixture();
  captureSpace(duplicateInbox, 'space-a').groups.push({ id: 'inbox-duplicate', name: 'Inbox', items: [] });
  assertCaptureTargetUnavailable(
    () => testApi.resolveCaptureTarget(duplicateInbox),
    'duplicate Inbox names in the exact Space',
  );

  const ambiguousInboxId = captureFixture();
  captureSpace(ambiguousInboxId, 'space-c').groups[0].id = 'inbox-a';
  assertCaptureTargetUnavailable(
    () => testApi.resolveCaptureTarget(ambiguousInboxId),
    'a globally duplicate Inbox ID',
  );

  const proposedInbox = captureFixture();
  captureSpace(proposedInbox, 'space-a').groups = captureSpace(proposedInbox, 'space-a').groups
    .filter(group => group.name !== 'Inbox');
  const proposed = testApi.resolveCaptureTarget(proposedInbox, { allocateId: () => 'new-inbox-id' });
  assert.equal(proposed.proposedInbox, true);
  assert.equal(proposed.group.id, 'new-inbox-id');
  assert.equal(captureSpace(proposedInbox, 'space-a').groups[0], proposed.group);

  const retained = captureFixture();
  retained.settings.captureLastTarget = {
    workspaceId: 'remembered-ws',
    categoryId: 'remembered-space',
    groupId: 'remembered-group',
  };
  retained.settings.captureDefaultCategoryId = 'remembered-default-space';
  const collisions = [
    'ws-a',
    'archive-item',
    'trash-item',
    'remembered-group',
    'remembered-default-space',
    'layout-size-id',
    'layout-width-id',
    'canvas-position-id',
    'safe-capture-id',
  ];
  let collisionIndex = 0;
  const allocateId = testApi.createCaptureIdAllocator(retained, () => collisions[collisionIndex++]);
  assert.equal(allocateId(), 'safe-capture-id', 'the allocator must skip active, retained, hint, layout, and Canvas IDs');

  const fresh = await testApi.ensureDefault({
    schema: 12,
    _revision: 0,
    workspaces: [],
    archive: [{ id: 'retained-fresh-id' }],
    settings: {},
  });
  const freshIds = [
    fresh.activeWsId,
    fresh.workspaces[0].id,
    fresh.workspaces[0].activeCatId,
    fresh.workspaces[0].categories[0].id,
    fresh.workspaces[0].categories[0].groups[0].id,
  ];
  assert.equal(new Set(freshIds).size, 3, 'fresh Workspace, Space, and Inbox IDs must be unique');
  assert.equal(freshIds.includes('retained-fresh-id'), false);
}

async function testSingleContextCaptureTransaction() {
  const rememberedState = captureFixture();
  rememberedState.settings.captureRememberLast = true;
  rememberedState.settings.captureLastTarget = {
    workspaceId: 'ws-a',
    categoryId: 'space-a',
    groupId: 'project-a',
  };
  resetCaptureScenario(rememberedState);
  const accepted = await testApi.addToInbox({
    id: 'caller-controlled-id',
    type: 'tab',
    title: '  Captured title  ',
    url: 'https://single.test/path',
    fav: 'https://single.test/favicon.ico',
  });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.status, 'saved');
  assert.equal(accepted.groupId, 'project-a');
  assert.equal(accepted.revision, 11);
  assert.equal(accepted.locale, 'en');
  assert.equal(accepted.workspaceName, 'Primary');
  assert.equal(accepted.categoryName, 'Focus');
  assert.equal(accepted.groupName, 'Project');
  assert.equal(captureCalls.storageSets, 1, 'one capture must perform exactly one guarded write');
  const saved = captureGroup(persistedState, 'project-a').items[0];
  assert.notEqual(saved.id, 'caller-controlled-id');
  assert.equal(saved.id, accepted.itemId);
  assert.equal(saved.title, 'Captured title');
  assert.equal(saved.url, 'https://single.test/path');
  assert.equal(saved.fav, 'https://single.test/favicon.ico');

  const beforeDuplicate = deepClone(persistedState);
  const duplicate = await testApi.addToInbox({
    type: 'tab',
    title: 'Duplicate',
    url: 'https://single.test/path',
  });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.status, 'duplicate');
  assert.equal(duplicate.itemId, accepted.itemId, 'one exact duplicate must retain the existing item continuation');
  assert.equal(duplicate.workspaceName, 'Primary');
  assert.equal(duplicate.categoryName, 'Focus');
  assert.equal(duplicate.groupName, 'Project');
  assert.equal(captureCalls.storageSets, 1, 'a duplicate must not write');
  assert.deepEqual(persistedState, beforeDuplicate);

  const nestedDuplicateState = captureFixture();
  nestedDuplicateState.settings.captureRememberLast = true;
  nestedDuplicateState.settings.captureLastTarget = {
    workspaceId: 'ws-a',
    categoryId: 'space-a',
    groupId: 'project-a',
  };
  captureGroup(nestedDuplicateState, 'project-a').items = [{
    id: 'nested-stack',
    type: 'stack',
    items: [{ id: 'nested-item', type: 'tab', url: 'https://nested.test' }],
  }];
  resetCaptureScenario(nestedDuplicateState);
  const nestedBefore = deepClone(persistedState);
  const nestedDuplicate = await testApi.addToInbox({
    type: 'tab',
    title: 'Nested duplicate',
    url: 'https://nested.test',
  });
  assert.equal(nestedDuplicate.ok, false);
  assert.equal(nestedDuplicate.status, 'duplicate');
  assert.equal(nestedDuplicate.itemId, 'nested-item',
    'background capture must retain the exact nested duplicate continuation');
  assert.equal(captureCalls.storageSets, 0,
    'a nested context-menu or shortcut duplicate must not write');
  assert.deepEqual(persistedState, nestedBefore);

  const proposedState = captureFixture();
  captureSpace(proposedState, 'space-a').groups = [];
  resetCaptureScenario(proposedState);
  const proposed = await testApi.addToInbox({
    type: 'tab',
    title: 'Provision Inbox',
    url: 'https://proposed.test',
  });
  assert.equal(proposed.ok, true);
  assert.equal(proposed.proposedInbox, true);
  assert.equal(captureSpace(persistedState, 'space-a').groups.length, 1);
  assert.equal(captureSpace(persistedState, 'space-a').groups[0].name, 'Inbox');
  assert.equal(captureSpace(persistedState, 'space-a').groups[0].items.length, 1);

  resetCaptureScenario();
  const beforeUnsupported = deepClone(persistedState);
  await assert.rejects(
    testApi.addToInbox({ type: 'tab', title: 'Internal', url: 'chrome://settings' }),
    error => error?.code === 'LOCUS_CAPTURE_INVALID',
  );
  await assert.rejects(
    testApi.addToInbox({ type: 'tab', title: 'Script', url: 'javascript:alert(1)' }),
    error => error?.code === 'LOCUS_CAPTURE_INVALID',
  );
  assert.equal(captureCalls.storageSets, 0);
  assert.deepEqual(persistedState, beforeUnsupported);

  resetCaptureScenario();
  const beforeQuota = deepClone(persistedState);
  storageMode = 'quota';
  await assert.rejects(testApi.addToInbox({
    type: 'tab',
    title: 'Quota',
    url: 'https://quota-capture.test',
  }), /quota/i);
  assert.equal(captureCalls.storageSets, 1, 'a rejected capture must not retry its writer');
  assert.deepEqual(persistedState, beforeQuota);
  assert.ok(captureCalls.notifications.some(call => call.id.startsWith('te-storage-quota-')));
}

async function testContextCaptureSourceEffects() {
  resetCaptureScenario();
  notificationApiMode = 'callback-only';
  let callbackCaptureSettled = false;
  const callbackCapture = listeners.contextMenu(
    { menuItemId: 'te-save-page' },
    deepClone(tabInventory[0]),
  ).then(() => { callbackCaptureSettled = true; });
  for (let turn = 0; turn < 50 && !releaseNotificationCreate; turn += 1) await Promise.resolve();
  assert.equal(typeof releaseNotificationCreate, 'function',
    'callback-only Chrome must receive a receipt creation callback');
  assert.equal(callbackCaptureSettled, false,
    'capture completion must wait for callback-only receipt creation');
  assert.deepEqual(captureCalls.tabGets, [],
    'no source effect may begin before Chrome confirms the actionable receipt');
  assert.deepEqual(captureCalls.removedTabs, []);
  releaseNotificationCreate({ error: 'Notifications unavailable' });
  await callbackCapture;
  assert.equal(captureCalls.storageSets, 1, 'receipt failure must retain the accepted save');
  assert.deepEqual(captureCalls.tabGets, [],
    'receipt failure must leave the accepted source untouched');
  assert.deepEqual(captureCalls.removedTabs, []);
  assert.equal(captureReceiptAttempts().length, 1, 'receipt failure must remain single-shot');
  assert.equal(captureReceiptCalls().length, 0);
  assert.equal(captureCalls.notificationAttempts.some(call => call.id.startsWith('te-capture-error-')), false,
    'receipt failure must not emit a false not-saved warning');

  const genericWorkspaceId = '\u9805'.repeat(170);
  const genericReceiptState = captureFixture();
  genericReceiptState.workspaces[0].id = genericWorkspaceId;
  genericReceiptState.activeWsId = genericWorkspaceId;
  resetCaptureScenario(genericReceiptState);
  const genericReceiptSource = deepClone(tabInventory[0]);
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, genericReceiptSource);
  assert.equal(captureCalls.storageSets, 1,
    'an overlong encoded locator must still retain its accepted save');
  assert.equal(captureGroup(persistedState, 'inbox-a').items.some(item => item.url === genericReceiptSource.url), true);
  const genericReceipt = onlyCaptureReceipt('an accepted page save without an exact receipt locator');
  assert.equal(genericReceipt.id.startsWith(captureReceiptHomePrefix), true,
    'an overlong encoded locator must use the generic Home receipt');
  assert.equal(genericReceipt.options.title, 'Page saved; check source tab');
  assert.match(genericReceipt.options.message, /Click to open Locus\.$/);
  assert.equal(captureCalls.storageGets, 2,
    'a generic receipt must not begin a fresh destructive-authority read');
  assert.deepEqual(captureCalls.tabGets, [],
    'a generic receipt must preserve the source without inspecting it');
  assert.deepEqual(captureCalls.removedTabs, []);
  assert.equal(captureReceiptUpdateAttempts().length, 0,
    'a generic receipt must keep its conservative source outcome without a final update');
  assert.equal(captureCalls.notificationAttempts.some(call => call.id.startsWith('te-capture-error-')), false,
    'a generic receipt must not emit a false not-saved warning');

  resetCaptureScenario();
  notificationApiMode = 'callback-only';
  const delayedSource = deepClone(tabInventory[0]);
  const delayedCapture = listeners.contextMenu(
    { menuItemId: 'te-save-page' },
    delayedSource,
  );
  for (let turn = 0; turn < 50 && !releaseNotificationCreate; turn += 1) await Promise.resolve();
  assert.equal(typeof releaseNotificationCreate, 'function',
    'the delayed capture must reach its accepted receipt boundary');
  const acceptedItem = captureGroup(persistedState, 'inbox-a').items
    .find(item => item.url === delayedSource.url);
  assert.ok(acceptedItem, 'the delayed capture must persist its exact item before the receipt');
  const displacedCandidate = deepClone(persistedState);
  captureGroup(displacedCandidate, 'inbox-a').items = captureGroup(displacedCandidate, 'inbox-a').items
    .filter(item => item.id !== acceptedItem.id);
  captureGroup(displacedCandidate, 'project-a').items.push(deepClone(acceptedItem));
  const displacement = await sendRuntimeMessage({
    type: 'locus-state-write',
    state: displacedCandidate,
  });
  assert.equal(displacement.ok, true, 'a newer public writer must accept the displaced item');
  const newerState = deepClone(persistedState);
  const storageGetsBeforeReceipt = captureCalls.storageGets;
  notificationApiMode = 'promise';
  releaseNotificationCreate();
  await delayedCapture;
  assert.equal(captureCalls.storageGets, storageGetsBeforeReceipt + 1,
    'source cleanup must fresh-read authority after the delayed receipt settles');
  assert.deepEqual(captureCalls.tabGets, [],
    'a newer write that displaced the accepted item must stop before source inspection');
  assert.deepEqual(captureCalls.removedTabs, [],
    'a newer write that displaced the accepted item must preserve the source');
  assert.deepEqual(persistedState, newerState,
    'delayed completion must not overwrite or repair the newer authoritative graph');
  assert.equal(captureCalls.storageSets, 2,
    'delayed completion must add no write after the capture and newer public update');
  assert.equal(onlyCaptureReceipt('a displaced accepted item').options.message.includes('Source tab closed.'), false,
    'a displaced accepted item must keep the conservative source outcome');

  resetCaptureScenario();
  notificationApiMode = 'callback-only';
  const unrelatedSource = deepClone(tabInventory[0]);
  const unrelatedCapture = listeners.contextMenu(
    { menuItemId: 'te-save-page' },
    unrelatedSource,
  );
  for (let turn = 0; turn < 50 && !releaseNotificationCreate; turn += 1) await Promise.resolve();
  const unrelatedCandidate = deepClone(persistedState);
  unrelatedCandidate.settings.unrelatedMarker = 'kept';
  const unrelatedWrite = await sendRuntimeMessage({
    type: 'locus-state-write',
    state: unrelatedCandidate,
  });
  assert.equal(unrelatedWrite.ok, true);
  const storageGetsBeforeUnrelatedCleanup = captureCalls.storageGets;
  notificationApiMode = 'promise';
  releaseNotificationCreate();
  await unrelatedCapture;
  assert.equal(captureCalls.storageGets, storageGetsBeforeUnrelatedCleanup + 1,
    'safe cleanup must still fresh-read an unrelated newer revision');
  assert.deepEqual(captureCalls.tabGets, [99]);
  assert.deepEqual(captureCalls.removedTabs, [99],
    'an unrelated newer write must not revoke an otherwise exact accepted destination');
  assert.equal(persistedState.settings.unrelatedMarker, 'kept',
    'safe cleanup must preserve the unrelated newer write');
  assert.equal(captureCalls.storageSets, 2);

  resetCaptureScenario();
  let markSourceReadStarted;
  let resumeSourceRead;
  const sourceReadStarted = new Promise(resolve => { markSourceReadStarted = resolve; });
  afterTabGet = async id => {
    assert.equal(id, 99);
    markSourceReadStarted();
    await new Promise(resolve => { resumeSourceRead = resolve; });
  };
  const serializedCleanup = listeners.contextMenu(
    { menuItemId: 'te-save-page' },
    deepClone(tabInventory[0]),
  );
  await sourceReadStarted;
  const queuedCandidate = deepClone(persistedState);
  queuedCandidate.settings.queuedAfterCleanup = true;
  let queuedWriteSettled = false;
  const queuedWrite = sendRuntimeMessage({
    type: 'locus-state-write',
    state: queuedCandidate,
  }).then(result => {
    queuedWriteSettled = true;
    return result;
  });
  for (let turn = 0; turn < 3; turn += 1) await Promise.resolve();
  assert.equal(queuedWriteSettled, false,
    'a newer whole-state write must wait while guarded source cleanup owns the FIFO');
  assert.equal(captureCalls.storageSets, 1,
    'the queued writer must not commit between authority validation and removal');
  resumeSourceRead();
  await serializedCleanup;
  const queuedWriteResult = await queuedWrite;
  assert.equal(queuedWriteResult.ok, true);
  assert.deepEqual(captureCalls.removedTabs, [99]);
  assert.equal(captureCalls.effects.indexOf('tab-remove:99')
    < captureCalls.effects.lastIndexOf('storage-set'), true,
  'source removal must finish before the queued newer state write commits');
  assert.equal(persistedState.settings.queuedAfterCleanup, true);

  resetCaptureScenario();
  notificationApiMode = 'callback-only';
  const unreadableSource = deepClone(tabInventory[0]);
  const unreadableCapture = listeners.contextMenu(
    { menuItemId: 'te-save-page' },
    unreadableSource,
  );
  for (let turn = 0; turn < 50 && !releaseNotificationCreate; turn += 1) await Promise.resolve();
  storageMode = 'read-error';
  notificationApiMode = 'promise';
  releaseNotificationCreate();
  await unreadableCapture;
  assert.deepEqual(captureCalls.tabGets, [],
    'an unconfirmed authority read must stop before source inspection');
  assert.deepEqual(captureCalls.removedTabs, [],
    'an unconfirmed authority read must preserve the accepted source');
  assert.equal(captureCalls.notificationAttempts.some(call => call.id.startsWith('te-capture-error-')), false,
    'a post-acceptance authority read failure must not claim that persistence failed');
  assert.equal(captureCalls.storageSets, 1,
    'an authority read failure must not retry or roll back the accepted write');

  resetCaptureScenario();
  notificationApiMode = 'callback-only';
  let callbackSuccessSettled = false;
  const callbackSuccess = listeners.contextMenu(
    { menuItemId: 'te-save-page' },
    deepClone(tabInventory[0]),
  ).then(() => { callbackSuccessSettled = true; });
  for (let turn = 0; turn < 50 && !releaseNotificationCreate; turn += 1) await Promise.resolve();
  const initialCallbackReceipt = captureReceiptAttempts()[0];
  assert.ok(initialCallbackReceipt, 'callback-only capture must attempt one stable receipt');
  releaseNotificationCreate();
  for (let turn = 0; turn < 50 && !releaseNotificationUpdate; turn += 1) await Promise.resolve();
  assert.deepEqual(captureCalls.removedTabs, [99],
    'a confirmed callback-only receipt may be followed by one guarded close');
  assert.equal(callbackSuccessSettled, false,
    'capture completion must wait for the callback-only final receipt state');
  assert.equal(typeof releaseNotificationUpdate, 'function');
  assert.equal(captureReceiptUpdateAttempts()[0]?.id, initialCallbackReceipt.id,
    'the final callback-only state must update the created receipt in place');
  releaseNotificationUpdate();
  await callbackSuccess;
  assert.equal(callbackSuccessSettled, true);
  const finalCallbackReceipt = onlyCaptureReceipt('a callback-only accepted page save');
  assert.equal(finalCallbackReceipt.options.message,
    'Primary › Focus › Inbox\nSource tab closed. Click to open the saved item.');

  resetCaptureScenario();
  notificationApiMode = 'hybrid';
  let callbackFirstSettlements = 0;
  const callbackFirstCapture = listeners.contextMenu(
    { menuItemId: 'te-save-page' },
    deepClone(tabInventory[0]),
  ).then(() => { callbackFirstSettlements += 1; });
  for (let turn = 0; turn < 50 && !releaseHybridCreateCallback; turn += 1) await Promise.resolve();
  assert.equal(typeof releaseHybridCreatePromise, 'function');
  assert.deepEqual(captureCalls.tabGets, [], 'hybrid creation must still precede source inspection');
  notificationApiMode = 'promise';
  releaseHybridCreateCallback();
  await callbackFirstCapture;
  releaseHybridCreatePromise({ error: 'Late hybrid rejection' });
  for (let turn = 0; turn < 3; turn += 1) await Promise.resolve();
  assert.equal(callbackFirstSettlements, 1, 'a late Promise rejection must not overturn callback success');
  assert.deepEqual(captureCalls.tabGets, [99]);
  assert.deepEqual(captureCalls.removedTabs, [99]);
  assert.equal(captureReceiptUpdateAttempts().length, 1, 'late hybrid completion must not repeat the final update');

  resetCaptureScenario();
  notificationApiMode = 'hybrid';
  let promiseFirstSettlements = 0;
  const promiseFirstCapture = listeners.contextMenu(
    { menuItemId: 'te-save-page' },
    deepClone(tabInventory[0]),
  ).then(() => { promiseFirstSettlements += 1; });
  for (let turn = 0; turn < 50 && !releaseHybridCreatePromise; turn += 1) await Promise.resolve();
  assert.equal(typeof releaseHybridCreateCallback, 'function');
  notificationApiMode = 'promise';
  releaseHybridCreatePromise();
  await promiseFirstCapture;
  releaseHybridCreateCallback({ error: 'Late hybrid callback error' });
  for (let turn = 0; turn < 3; turn += 1) await Promise.resolve();
  assert.equal(promiseFirstSettlements, 1, 'a late callback error must not overturn Promise success');
  assert.deepEqual(captureCalls.tabGets, [99]);
  assert.deepEqual(captureCalls.removedTabs, [99]);
  assert.equal(captureReceiptUpdateAttempts().length, 1, 'late hybrid callback must not repeat the final update');

  resetCaptureScenario();
  const source = deepClone(tabInventory[0]);
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, source);
  assert.equal(captureCalls.storageSets, 1);
  assert.deepEqual(captureCalls.tabGets, [99]);
  assert.deepEqual(captureCalls.removedTabs, [99], 'an unchanged source may close only after the accepted receipt');
  assert.equal(captureGroup(persistedState, 'inbox-a').items.some(item => item.url === source.url), true);
  const savedItem = captureGroup(persistedState, 'inbox-a').items.find(item => item.url === source.url);
  const initialReceipt = captureReceiptCalls()[0];
  const closedReceipt = onlyCaptureReceipt('an accepted page save');
  assertCaptureReceiptRoute(closedReceipt, { kind: 'item', workspaceId: 'ws-a', targetId: savedItem.id });
  assert.equal(initialReceipt.id, closedReceipt.id, 'the conservative and final states must share one receipt identity');
  assert.equal(initialReceipt.options.message,
    "Primary › Focus › Inbox\nCouldn't confirm whether the source tab closed. Click to open the saved item.");
  assert.deepEqual(closedReceipt.options, {
    type: 'basic',
    iconUrl: 'chrome-extension://locus/icons/icon128.png',
    title: 'Page saved',
    message: 'Primary › Focus › Inbox\nSource tab closed. Click to open the saved item.',
    priority: 0,
    silent: true,
  });
  assert.deepEqual(captureCalls.effects.filter(effect =>
    effect === 'storage-set'
      || effect.startsWith('tab-get:')
      || effect.startsWith('tab-remove')
      || effect.startsWith('notification-attempt:')
      || effect.startsWith('notification-update-attempt:')
  ).slice(0, 6), [
    'storage-set',
    `notification-attempt:${closedReceipt.id}`,
    'tab-get:99',
    'tab-remove-attempt:99',
    'tab-remove:99',
    `notification-update-attempt:${closedReceipt.id}`,
  ], 'one stable receipt must precede the guarded close and then receive its final state');
  const storageGetsBeforeReceiptClick = captureCalls.storageGets;
  notificationApiMode = 'callback-only';
  let callbackClearSettled = false;
  const callbackClear = listeners.notificationClick(closedReceipt.id)
    .then(() => { callbackClearSettled = true; });
  for (let turn = 0; turn < 50 && !releaseNotificationClear; turn += 1) await Promise.resolve();
  for (let turn = 0; turn < 3; turn += 1) await Promise.resolve();
  assert.equal(typeof releaseNotificationClear, 'function',
    'callback-only Chrome must receive the receipt clear callback');
  assert.equal(callbackClearSettled, false,
    'receipt continuation must wait for callback-only clearing');
  assert.equal(captureCalls.storageGets, storageGetsBeforeReceiptClick + 1, 'receipt click must fresh-read authoritative state once');
  assert.deepEqual(captureCalls.openedTabs.at(-1), {
    url: `chrome-extension://locus/newtab.html#/ws/ws-a/home?item=${encodeURIComponent(savedItem.id)}`,
  });
  releaseNotificationClear();
  await callbackClear;
  assert.equal(captureCalls.clearedNotifications.includes(closedReceipt.id), true);

  resetCaptureScenario();
  const navigatedSource = deepClone(tabInventory[0]);
  afterStorageSet = async () => {
    tabInventory[0].url = 'https://navigated-after-save.test';
  };
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, navigatedSource);
  assert.equal(captureCalls.storageSets, 1, 'navigation after acceptance must not change the accepted save');
  assert.deepEqual(captureCalls.removedTabs, [], 'a navigated source must stay open');
  assert.equal(captureGroup(persistedState, 'inbox-a').items.some(item => item.url === navigatedSource.url), true);
  const unconfirmedReceipt = onlyCaptureReceipt('a navigated accepted page save');
  assert.equal(unconfirmedReceipt.options.title, 'Page saved; check source tab');
  assert.equal(unconfirmedReceipt.options.message,
    "Primary › Focus › Inbox\nCouldn't confirm whether the source tab closed. Click to open the saved item.");

  resetCaptureScenario();
  tabGetOverride = (id, tab) => id === 99 ? { ...tab, pendingUrl: 42 } : tab;
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, deepClone(tabInventory[0]));
  assert.deepEqual(captureCalls.tabGets, [99]);
  assert.deepEqual(captureCalls.removedTabs, [],
    'a malformed pending destination must leave the source open');
  assert.equal(onlyCaptureReceipt('a malformed pending source').options.title,
    'Page saved; check source tab');

  const keepOpenState = captureFixture();
  keepOpenState.settings.closeTabOnSave = false;
  resetCaptureScenario(keepOpenState);
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, deepClone(tabInventory[0]));
  assert.equal(captureCalls.storageSets, 1);
  assert.deepEqual(captureCalls.tabGets, [], 'a disabled close policy must not touch the source tab');
  assert.deepEqual(captureCalls.removedTabs, []);
  const keptReceipt = onlyCaptureReceipt('an intentionally kept-open page save');
  assert.equal(keptReceipt.options.message,
    'Primary › Focus › Inbox\nSource tab stayed open. Click to open the saved item.');

  resetCaptureScenario();
  tabGetFailure = 99;
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, deepClone(tabInventory[0]));
  assert.equal(captureCalls.storageSets, 1);
  assert.deepEqual(captureCalls.removedTabs, []);
  assert.equal(onlyCaptureReceipt('an accepted save with an unconfirmed source read').options.title,
    'Page saved; check source tab');

  resetCaptureScenario();
  tabRemoveFailure = 99;
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, deepClone(tabInventory[0]));
  assert.equal(captureCalls.storageSets, 1);
  assert.equal(captureCalls.effects.filter(effect => effect === 'tab-remove-attempt:99').length, 1,
    'a rejected source removal must remain single-shot');
  assert.deepEqual(captureCalls.removedTabs, []);
  assert.equal(onlyCaptureReceipt('an accepted save with a rejected source close').options.title,
    'Page saved; check source tab');
  assert.equal(captureCalls.notificationAttempts.some(call => call.id.startsWith('te-capture-error-')), false,
    'a rejected post-save close must not claim that persistence failed');

  resetCaptureScenario();
  notificationFailure = id => id.startsWith(captureReceiptPrefix) || id.startsWith(captureReceiptHomePrefix);
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, deepClone(tabInventory[0]));
  assert.equal(captureCalls.storageSets, 1, 'receipt display failure must not retry an accepted save');
  assert.deepEqual(captureCalls.tabGets, [], 'receipt display failure must stop before inspecting the source');
  assert.deepEqual(captureCalls.removedTabs, [], 'receipt display failure must leave the accepted source open');
  assert.equal(captureReceiptAttempts().length, 1, 'receipt display failure must make one no-throw attempt');
  assert.equal(captureReceiptCalls().length, 0);
  assert.equal(captureCalls.notificationAttempts.some(call => call.id.startsWith('te-capture-error-')), false,
    'receipt display failure must not emit a false not-saved warning');

  resetCaptureScenario();
  notificationUpdateFailure = id => id.startsWith(captureReceiptPrefix) || id.startsWith(captureReceiptHomePrefix);
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, deepClone(tabInventory[0]));
  assert.equal(captureCalls.storageSets, 1, 'receipt update failure must not retry an accepted save');
  assert.deepEqual(captureCalls.removedTabs, [99],
    'the guarded close may proceed after Chrome confirms the conservative receipt');
  assert.equal(captureReceiptCalls().length, 1);
  assert.equal(captureReceiptUpdateAttempts().length, 1, 'the final receipt state must remain single-shot');
  assert.equal(captureReceiptUpdateCalls().length, 0);
  assert.equal(captureReceiptCalls()[0].options.title, 'Page saved; check source tab',
    'a failed final update must leave the truthful conservative receipt in place');
  assert.equal(captureCalls.notificationAttempts.some(call => call.id.startsWith('te-capture-error-')), false,
    'receipt update failure must not emit a false not-saved warning');

  resetCaptureScenario();
  badgeFailure = true;
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, deepClone(tabInventory[0]));
  assert.equal(captureCalls.storageSets, 1, 'badge failure must not retry an accepted save');
  assert.deepEqual(captureCalls.removedTabs, [99]);
  assert.equal(captureReceiptCalls().length, 1, 'badge failure must not suppress the destination receipt');
  assert.equal(captureCalls.notificationAttempts.some(call => call.id.startsWith('te-capture-error-')), false,
    'secondary badge failure must not claim that the accepted save failed');

  resetCaptureScenario();
  const beforeFailure = deepClone(persistedState);
  storageMode = 'error';
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, deepClone(tabInventory[0]));
  assert.equal(captureCalls.storageSets, 1, 'a rejected context save must remain single-shot');
  assert.deepEqual(persistedState, beforeFailure);
  assert.deepEqual(captureCalls.removedTabs, []);
  assert.ok(captureCalls.notifications.some(call => call.id.startsWith('te-capture-error-')));
  assert.equal(captureReceiptAttempts().length, 0, 'a rejected write must never attempt a success receipt');

  resetCaptureScenario();
  tabInventory[0].url = 'https://existing.test';
  tabInventory[0].title = 'Existing duplicate';
  const duplicateBefore = deepClone(persistedState);
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, deepClone(tabInventory[0]));
  assert.equal(captureCalls.storageSets, 0, 'an exact duplicate must not write');
  assert.deepEqual(persistedState, duplicateBefore);
  assert.deepEqual(captureCalls.tabGets, [], 'an exact duplicate must not inspect or close the source');
  assert.deepEqual(captureCalls.removedTabs, []);
  const duplicateReceipt = onlyCaptureReceipt('one exact duplicate');
  assert.equal(duplicateReceipt.options.title, 'Already saved');
  assert.equal(duplicateReceipt.options.message,
    'Primary › Focus › Inbox\nClick to open the saved item.');
  assertCaptureReceiptRoute(duplicateReceipt, {
    kind: 'item', workspaceId: 'ws-a', targetId: 'existing-item',
  });

  for (const entry of [
    {
      label: 'link',
      info: { menuItemId: 'te-save-link', linkUrl: 'https://link.test', selectionText: 'Saved link' },
      title: 'Link saved',
    },
    {
      label: 'selection',
      info: { menuItemId: 'te-save-selection', selectionText: 'Saved note' },
      title: 'Note saved',
    },
    {
      label: 'image',
      info: { menuItemId: 'te-save-image', srcUrl: 'https://image.test/picture.png' },
      title: 'Image saved',
    },
  ]) {
    resetCaptureScenario();
    await listeners.contextMenu(entry.info, deepClone(tabInventory[0]));
    assert.equal(captureCalls.storageSets, 1, `${entry.label} capture must write once`);
    assert.deepEqual(captureCalls.removedTabs, [], `${entry.label} capture must not close the page containing it`);
    const receipt = onlyCaptureReceipt(`an accepted ${entry.label} capture`);
    assert.equal(receipt.options.title, entry.title);
    assert.equal(receipt.options.message,
      'Primary › Focus › Inbox\nClick to open the saved item.');
  }

  resetCaptureScenario();
  await listeners.command('save-current-tab');
  assert.equal(captureCalls.storageSets, 1, 'the save-current-tab command must write once');
  assert.deepEqual(captureCalls.removedTabs, [99]);
  assert.equal(onlyCaptureReceipt('an accepted shortcut save').options.title, 'Page saved');

  const zhState = captureFixture();
  zhState.settings.language = 'zh-TW';
  zhState.settings.closeTabOnSave = false;
  captureSpace(zhState, 'space-a').name = '研究';
  resetCaptureScenario(zhState);
  await listeners.command('save-current-tab');
  const zhReceipt = onlyCaptureReceipt('a native zh-TW shortcut save');
  assert.equal(zhReceipt.options.title, '分頁已儲存');
  assert.equal(zhReceipt.options.message,
    'Primary › 研究 › 收件匣\n原分頁保持開啟。點一下即可在 Locus 開啟已儲存項目。');

  const blurredState = deepClone(zhState);
  blurredState.settings.blurPrivacy = true;
  resetCaptureScenario(blurredState);
  await listeners.command('save-current-tab');
  const blurredReceipt = onlyCaptureReceipt('a privacy-blurred native zh-TW save');
  assert.equal(blurredReceipt.options.message,
    '已隱藏儲存位置\n原分頁保持開啟。點一下即可在 Locus 開啟已儲存項目。');
  assert.equal(blurredReceipt.options.message.includes('Primary'), false);
  assert.equal(blurredReceipt.options.message.includes('研究'), false);
  assert.equal(blurredReceipt.options.message.includes('收件匣'), false);

  const hostilePathState = captureFixture();
  hostilePathState.settings.closeTabOnSave = false;
  hostilePathState.settings.captureRememberLast = true;
  hostilePathState.settings.captureLastTarget = {
    workspaceId: 'ws-a',
    categoryId: 'space-a',
    groupId: 'project-a',
  };
  hostilePathState.workspaces[0].name = 'Work\u202e\nspace';
  captureSpace(hostilePathState, 'space-a').name = 'Focus\u061c\u200f › zone';
  captureGroup(hostilePathState, 'project-a').name = `${'A'.repeat(70)}\nForged outcome`;
  resetCaptureScenario(hostilePathState);
  tabInventory[0].title = 'Private dashboard title';
  tabInventory[0].url = 'https://private-source.test/account';
  tabInventory[0].favIconUrl = 'https://private-source.test/favicon.ico';
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, deepClone(tabInventory[0]));
  const sanitizedReceipt = onlyCaptureReceipt('a capture with hostile path labels');
  const [pathLine, outcomeLine, extraLine] = sanitizedReceipt.options.message.split('\n');
  assert.equal(pathLine, `Work space › Focus zone › ${'A'.repeat(39)}…`,
    'path labels must remove control/bidi formatting and truncate each user segment');
  assert.equal(outcomeLine, 'Source tab stayed open. Click to open the saved item.');
  assert.equal(extraLine, undefined, 'user path labels must not forge another notification line');
  assert.equal(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/.test(sanitizedReceipt.options.message), false);
  assert.equal(sanitizedReceipt.options.message.includes('Private dashboard title'), false,
    'capture receipts must not expose the saved page title');
  assert.equal(sanitizedReceipt.options.message.includes('private-source.test'), false,
    'capture receipts must not expose the saved URL or favicon host');
}

async function testContextWindowCaptureTransaction() {
  const windowState = captureFixture();
  const space = captureSpace(windowState, 'space-a');
  space.groups = [{ id: 'project-a', name: 'Project', items: [] }];
  windowState.settings.captureRememberLast = true;
  windowState.settings.captureLastTarget = {
    workspaceId: 'ws-a',
    categoryId: 'space-a',
    groupId: 'project-a',
  };
  windowState.settings.language = 'zh-TW';

  const genericWorkspaceId = '\u9805'.repeat(170);
  const genericReceiptState = captureFixture();
  genericReceiptState.workspaces[0].id = genericWorkspaceId;
  genericReceiptState.activeWsId = genericWorkspaceId;
  resetCaptureScenario(genericReceiptState);
  tabInventory = [{
    id: 1,
    windowId: 7,
    active: true,
    title: 'Initiating',
    url: 'https://one.test',
    favIconUrl: '',
  }, {
    id: 2,
    windowId: 7,
    active: false,
    title: 'Second',
    url: 'https://two.test',
    favIconUrl: '',
  }, {
    id: 4,
    windowId: 7,
    active: false,
    title: 'Third',
    url: 'https://four.test',
    favIconUrl: '',
  }];
  await listeners.contextMenu({ menuItemId: 'te-save-all' }, deepClone(tabInventory[0]));
  assert.equal(captureCalls.storageSets, 1,
    'an overlong window locator must still retain its accepted Session Group');
  assert.equal(captureSpace(persistedState, 'space-a').groups.some(group =>
    (group.items || []).some(item => item.url === 'https://two.test')), true);
  const genericReceipt = onlyCaptureReceipt('an accepted window save without an exact receipt locator');
  assert.equal(genericReceipt.id.startsWith(captureReceiptHomePrefix), true,
    'an overlong encoded window locator must use the generic Home receipt');
  assert.equal(genericReceipt.options.title, 'Saved 3 tabs');
  assert.match(genericReceipt.options.message,
    /2 other tabs could not be confirmed closed\. This tab stayed open\. Click to open Locus\.$/);
  assert.equal(captureCalls.storageGets, 2,
    'a generic window receipt must not begin a fresh destructive-authority read');
  assert.deepEqual(captureCalls.tabGets, [],
    'a generic window receipt must preserve every source without inspecting it');
  assert.deepEqual(captureCalls.removedTabs, []);
  assert.equal(captureReceiptUpdateAttempts().length, 0,
    'a generic window receipt must keep its conservative source outcome without a final update');

  resetCaptureScenario(windowState);
  tabInventory = [{
    id: 1,
    windowId: 7,
    active: true,
    title: 'Initiating',
    url: 'https://one.test',
    favIconUrl: '',
  }, {
    id: 2,
    windowId: 7,
    active: false,
    title: 'Second',
    url: 'https://two.test',
    favIconUrl: '',
  }, {
    id: 3,
    windowId: 7,
    active: false,
    title: 'Internal',
    url: 'chrome://extensions',
    favIconUrl: '',
  }, {
    id: 4,
    windowId: 7,
    active: false,
    title: 'Became active',
    url: 'https://four.test',
    favIconUrl: '',
  }, {
    id: 5,
    windowId: 8,
    active: false,
    title: 'Other window',
    url: 'https://other-window.test',
    favIconUrl: '',
  }];

  const result = await testApi.saveContextWindow(deepClone(tabInventory[0]));
  assert.equal(result.ok, true);
  assert.equal(result.status, 'saved');
  assert.equal(result.count, 3);
  assert.equal(result.categoryId, 'space-a');
  assert.equal(result.locale, 'zh-TW');
  assert.equal(result.workspaceName, 'Primary');
  assert.equal(result.categoryName, 'Focus');
  assert.equal(captureCalls.storageSets, 1);
  assert.deepEqual(captureCalls.tabQueries, [{ windowId: 7 }], 'whole-window capture must query the initiating window exactly');
  const savedSpace = captureSpace(persistedState, 'space-a');
  assert.equal(savedSpace.groups.some(group => group.name === 'Inbox'), false, 'Session capture must not provision an unrelated Inbox');
  assert.equal(savedSpace.groups.length, 2);
  const session = savedSpace.groups.find(group => group.id === result.groupId);
  assert.ok(session.name.startsWith('工作階段 '), 'native zh-TW must name the generated Session Group');
  assert.equal(result.groupName, session.name);
  assert.deepEqual(session.items.map(item => item.url), [
    'https://one.test',
    'https://two.test',
    'https://four.test',
  ]);
  const generatedIds = [session.id, ...session.items.map(item => item.id)];
  assert.equal(new Set(generatedIds).size, generatedIds.length);
  const reservedBefore = testApi.collectCaptureReservedIds(windowState);
  for (const id of generatedIds) assert.equal(reservedBefore.has(id), false, `${id} must not reuse a retained identity`);

  tabInventory.find(tab => tab.id === 4).active = true;
  const closeResult = await testApi.closeContextWindowSources(result);
  assert.deepEqual(deepClone(closeResult), { closed: 1, unconfirmed: 1 });
  assert.deepEqual(captureCalls.removedTabs, [2], 'cleanup must preserve the initiating and newly active tabs');
  assert.equal(tabInventory.some(tab => tab.id === 1), true);
  assert.equal(tabInventory.some(tab => tab.id === 4), true);

  resetCaptureScenario(windowState);
  tabInventory = [{
    id: 1,
    windowId: 7,
    active: true,
    title: 'Initiating',
    url: 'https://one.test',
    favIconUrl: '',
  }, {
    id: 2,
    windowId: 7,
    active: false,
    title: 'Malformed pending',
    url: 'https://two.test',
    favIconUrl: '',
  }, {
    id: 4,
    windowId: 7,
    active: false,
    title: 'Unknown active state',
    url: 'https://four.test',
    favIconUrl: '',
  }];
  afterStorageSet = async () => {
    tabInventory.find(tab => tab.id === 2).pendingUrl = 42;
    delete tabInventory.find(tab => tab.id === 4).active;
  };
  await listeners.contextMenu({ menuItemId: 'te-save-all' }, deepClone(tabInventory[0]));
  assert.deepEqual(captureCalls.tabGets, [2, 4]);
  assert.deepEqual(captureCalls.removedTabs, [],
    'window cleanup must reject malformed pending and unconfirmed inactive state');
  assert.match(onlyCaptureReceipt('malformed window source state').options.message,
    /另有 2 個分頁無法確認是否已關閉/);

  resetCaptureScenario(windowState);
  tabInventory = [{
    id: 1,
    windowId: 7,
    active: true,
    title: 'Initiating',
    url: 'https://one.test',
    favIconUrl: '',
  }, {
    id: 2,
    windowId: 7,
    active: false,
    title: 'Second',
    url: 'https://two.test',
    favIconUrl: '',
  }, {
    id: 4,
    windowId: 7,
    active: false,
    title: 'Became active',
    url: 'https://four.test',
    favIconUrl: '',
  }];
  afterStorageSet = async () => {
    tabInventory.find(tab => tab.id === 4).active = true;
  };
  await listeners.contextMenu({ menuItemId: 'te-save-all' }, deepClone(tabInventory[0]));
  assert.equal(captureCalls.storageSets, 1, 'the window listener must guard the whole capture with one write');
  assert.deepEqual(captureCalls.tabGets, [2, 4]);
  assert.deepEqual(captureCalls.removedTabs, [2]);
  const listenerSession = captureSpace(persistedState, 'space-a').groups
    .find(group => group.id !== 'project-a');
  const initialWindowReceipt = captureReceiptCalls()[0];
  const windowReceipt = onlyCaptureReceipt('an accepted partial window save');
  assertCaptureReceiptRoute(windowReceipt, {
    kind: 'group', workspaceId: 'ws-a', targetId: listenerSession.id,
  });
  assert.equal(windowReceipt.options.title, '已儲存 3 個分頁');
  assert.equal(windowReceipt.options.message,
    `Primary › Focus › ${listenerSession.name}\n已關閉其他 1 個分頁；另有 1 個分頁無法確認是否已關閉。目前分頁保持開啟。點一下即可開啟儲存位置。`);
  assert.equal(initialWindowReceipt.id, windowReceipt.id,
    'the partial window result must update the conservative receipt in place');
  const windowReceiptAttempt = `notification-attempt:${windowReceipt.id}`;
  const windowReceiptUpdate = `notification-update-attempt:${windowReceipt.id}`;
  assert.equal(captureCalls.effects.indexOf(windowReceiptAttempt) < captureCalls.effects.indexOf('tab-get:2'), true,
    'the window receipt must exist before any guarded source-close result');
  assert.equal(captureCalls.effects.indexOf(windowReceiptUpdate) > captureCalls.effects.indexOf('tab-get:4'), true,
    'the final window state must follow every guarded source-close result');
  const storageGetsBeforeWindowClick = captureCalls.storageGets;
  await listeners.notificationClick(windowReceipt.id);
  assert.equal(captureCalls.storageGets, storageGetsBeforeWindowClick + 1);
  assert.deepEqual(captureCalls.openedTabs.at(-1), {
    url: `chrome-extension://locus/newtab.html#/ws/ws-a/group/${encodeURIComponent(listenerSession.id)}`,
  });

  resetCaptureScenario(windowState);
  tabInventory = [{
    id: 1,
    windowId: 7,
    active: true,
    title: 'Initiating',
    url: 'https://one.test',
    favIconUrl: '',
  }, {
    id: 2,
    windowId: 7,
    active: false,
    title: 'Second',
    url: 'https://two.test',
    favIconUrl: '',
  }, {
    id: 4,
    windowId: 7,
    active: false,
    title: 'Third',
    url: 'https://four.test',
    favIconUrl: '',
  }];
  notificationApiMode = 'callback-only';
  const displacedWindowCapture = listeners.contextMenu(
    { menuItemId: 'te-save-all' },
    deepClone(tabInventory[0]),
  );
  for (let turn = 0; turn < 50 && !releaseNotificationCreate; turn += 1) await Promise.resolve();
  assert.equal(typeof releaseNotificationCreate, 'function',
    'the delayed window capture must reach its accepted receipt boundary');
  const displacedWindowCandidate = deepClone(persistedState);
  const acceptedWindowSpace = captureSpace(displacedWindowCandidate, 'space-a');
  const acceptedWindowIndex = acceptedWindowSpace.groups
    .findIndex(group => group.id !== 'project-a');
  assert.notEqual(acceptedWindowIndex, -1);
  const [displacedSession] = acceptedWindowSpace.groups.splice(acceptedWindowIndex, 1);
  captureSpace(displacedWindowCandidate, 'space-b').groups.push(displacedSession);
  const displacedWindowWrite = await sendRuntimeMessage({
    type: 'locus-state-write',
    state: displacedWindowCandidate,
  });
  assert.equal(displacedWindowWrite.ok, true,
    'a newer public writer must accept the displaced Session Group');
  const displacedWindowState = deepClone(persistedState);
  const storageGetsBeforeWindowCleanup = captureCalls.storageGets;
  notificationApiMode = 'promise';
  releaseNotificationCreate();
  await displacedWindowCapture;
  assert.equal(captureCalls.storageGets, storageGetsBeforeWindowCleanup + 1,
    'window cleanup must fresh-read authority after the delayed receipt settles');
  assert.deepEqual(captureCalls.tabGets, [],
    'a displaced Session Group must stop before source inspection');
  assert.deepEqual(captureCalls.removedTabs, [],
    'a displaced Session Group must preserve every source');
  assert.deepEqual(persistedState, displacedWindowState,
    'delayed window completion must preserve the newer authoritative graph');
  assert.equal(captureCalls.storageSets, 2);

  resetCaptureScenario(windowState);
  tabInventory = [{
    id: 1,
    windowId: 7,
    active: true,
    title: 'Initiating',
    url: 'https://one.test',
    favIconUrl: '',
  }, {
    id: 2,
    windowId: 7,
    active: false,
    title: 'Second',
    url: 'https://two.test',
    favIconUrl: '',
  }, {
    id: 4,
    windowId: 7,
    active: false,
    title: 'Third',
    url: 'https://four.test',
    favIconUrl: '',
  }];
  notificationApiMode = 'callback-only';
  const partialAuthorityCapture = listeners.contextMenu(
    { menuItemId: 'te-save-all' },
    deepClone(tabInventory[0]),
  );
  for (let turn = 0; turn < 50 && !releaseNotificationCreate; turn += 1) await Promise.resolve();
  const partialAuthorityCandidate = deepClone(persistedState);
  const partialSession = captureSpace(partialAuthorityCandidate, 'space-a').groups
    .find(group => group.id !== 'project-a');
  partialSession.items = partialSession.items.filter(item => item.url !== 'https://two.test');
  const partialAuthorityWrite = await sendRuntimeMessage({
    type: 'locus-state-write',
    state: partialAuthorityCandidate,
  });
  assert.equal(partialAuthorityWrite.ok, true);
  const partialAuthorityState = deepClone(persistedState);
  const storageGetsBeforePartialCleanup = captureCalls.storageGets;
  notificationApiMode = 'promise';
  releaseNotificationCreate();
  await partialAuthorityCapture;
  assert.equal(captureCalls.storageGets, storageGetsBeforePartialCleanup + 1);
  assert.deepEqual(captureCalls.tabGets, [4],
    'window cleanup must inspect only sources whose exact saved item remains authoritative');
  assert.deepEqual(captureCalls.removedTabs, [4],
    'window cleanup may close the still-authoritative source while preserving the removed one');
  assert.deepEqual(persistedState, partialAuthorityState);
  assert.equal(captureCalls.storageSets, 2);
  assert.match(onlyCaptureReceipt('partially retained window authority').options.message,
    /已關閉其他 1 個分頁；另有 1 個分頁無法確認是否已關閉/);

  resetCaptureScenario(windowState);
  tabInventory = [{
    id: 1,
    windowId: 7,
    active: true,
    title: 'Initiating',
    url: 'https://one.test',
    favIconUrl: '',
  }, {
    id: 2,
    windowId: 7,
    active: false,
    title: 'Second',
    url: 'https://two.test',
    favIconUrl: '',
  }, {
    id: 4,
    windowId: 7,
    active: false,
    title: 'Third',
    url: 'https://four.test',
    favIconUrl: '',
  }];
  notificationFailure = id => id.startsWith(captureReceiptPrefix) || id.startsWith(captureReceiptHomePrefix);
  await listeners.contextMenu({ menuItemId: 'te-save-all' }, deepClone(tabInventory[0]));
  assert.equal(captureCalls.storageSets, 1, 'window receipt failure must retain the accepted Session Group');
  assert.deepEqual(captureCalls.tabGets, [], 'window receipt failure must stop before inspecting any source');
  assert.deepEqual(captureCalls.removedTabs, [], 'window receipt failure must keep every source open');
  assert.equal(captureReceiptAttempts().length, 1);
  assert.equal(captureCalls.notificationAttempts.some(call => call.id.startsWith('te-capture-error-')), false,
    'window receipt failure must not emit a false not-saved warning');

  resetCaptureScenario(windowState);
  tabInventory = [{
    id: 1,
    windowId: 7,
    active: true,
    title: 'Internal',
    url: 'chrome://settings',
    favIconUrl: '',
  }];
  const empty = await testApi.saveContextWindow(deepClone(tabInventory[0]));
  assert.equal(empty.ok, false);
  assert.equal(empty.status, 'empty');
  assert.equal(captureCalls.storageSets, 0, 'an empty eligible window must not write or create a Group');

  await assert.rejects(
    testApi.saveContextWindow({ windowId: 7, url: 'https://missing-tab-id.test' }),
    error => error?.code === 'LOCUS_CAPTURE_SOURCE_UNAVAILABLE',
    'whole-window capture must require the initiating tab identity before any query or write',
  );
  assert.equal(captureCalls.storageSets, 0);
}

async function testCaptureReceiptCodecAndFreshResolution() {
  const restartId = `${captureReceiptPrefix}item|ws-a|existing-item|restart123`;
  assert.deepEqual(deepClone(testApi.parseCaptureReceiptNotificationId(restartId)), {
    kind: 'item',
    workspaceId: 'ws-a',
    targetId: 'existing-item',
    nonce: 'restart123',
  }, 'an encoded receipt must remain self-contained after a service-worker restart');

  const reservedWorkspaceId = 'ws/a|1';
  const reservedItemId = 'item?x=1&y=2|%';
  const reservedReceiptId = `${captureReceiptPrefix}item|${encodeURIComponent(reservedWorkspaceId)}|${encodeURIComponent(reservedItemId)}|restart456`;
  assert.deepEqual(deepClone(testApi.parseCaptureReceiptNotificationId(reservedReceiptId)), {
    kind: 'item',
    workspaceId: reservedWorkspaceId,
    targetId: reservedItemId,
    nonce: 'restart456',
  }, 'reserved locator characters must round-trip exactly once');
  for (const malformed of [
    `${captureReceiptPrefix}unknown|ws-a|existing-item|restart123`,
    `${captureReceiptPrefix}item|ws-a||restart123`,
    `${captureReceiptPrefix}item|ws-a|existing-item`,
    `${captureReceiptPrefix}item|ws-a|existing-item|restart123|extra`,
    `${captureReceiptPrefix}item|%ZZ|existing-item|restart123`,
    `${captureReceiptPrefix}item|ws-a|existing-item|short`,
  ]) assert.equal(testApi.parseCaptureReceiptNotificationId(malformed), null, `${malformed} must fail closed`);
  assert.equal(testApi.buildCaptureReceiptNotificationId({
    kind: 'item', workspaceId: 'w'.repeat(200), targetId: '項'.repeat(200),
  }, () => 'restart789'), null, 'an encoded locator beyond Chrome\'s 500-character limit must fall back to generic Home');
  assert.equal(testApi.buildCaptureReceiptNotificationId({
    kind: 'item', workspaceId: 'ws-a', targetId: '\ud800',
  }, () => 'restart789'), null, 'a lone surrogate must fail closed instead of escaping the codec');

  resetCaptureScenario();
  const storageGetsBeforeRestartClick = captureCalls.storageGets;
  await listeners.notificationClick(restartId);
  assert.equal(captureCalls.storageGets, storageGetsBeforeRestartClick + 1);
  assert.equal(captureCalls.storageSets, 0, 'receipt continuation must be read-only');
  assert.deepEqual(captureCalls.openedTabs, [{
    url: 'chrome-extension://locus/newtab.html#/ws/ws-a/home?item=existing-item',
  }]);
  assert.deepEqual(captureCalls.clearedNotifications, [restartId]);
  assert.equal(captureCalls.effects.indexOf('tab-create:chrome-extension://locus/newtab.html#/ws/ws-a/home?item=existing-item')
    < captureCalls.effects.indexOf(`notification-clear-attempt:${restartId}`), true,
  'receipt activation must create its continuation before clearing the receipt');

  resetCaptureScenario();
  tabCreateFailure = true;
  await listeners.notificationClick(restartId);
  assert.deepEqual(captureCalls.openedTabs, []);
  assert.deepEqual(captureCalls.clearedNotifications, [],
    'a failed continuation must preserve the receipt for a deliberate retry');
  assert.equal(captureCalls.effects.filter(effect => effect.startsWith('tab-create-attempt:')).length, 1,
    'a failed continuation must not retry or open a fallback tab');
  assert.equal(captureCalls.effects.some(effect => effect.startsWith('notification-clear-attempt:')), false);

  const movedState = captureFixture();
  const movedItem = captureGroup(movedState, 'inbox-a').items.shift();
  captureGroup(movedState, 'project-a').items.push({
    id: 'stack-moved', type: 'stack', name: 'Moved stack', items: [movedItem],
  });
  resetCaptureScenario(movedState);
  await listeners.notificationClick(restartId);
  assert.deepEqual(captureCalls.openedTabs, [{
    url: 'chrome-extension://locus/newtab.html#/ws/ws-a/home?item=existing-item',
  }], 'a same-Workspace move must follow the freshly resolved stable item');

  const groupReceiptId = `${captureReceiptPrefix}group|ws-a|project-a|restart123`;
  const movedGroupState = captureFixture();
  const movedGroup = captureSpace(movedGroupState, 'space-a').groups
    .splice(captureSpace(movedGroupState, 'space-a').groups.findIndex(group => group.id === 'project-a'), 1)[0];
  captureSpace(movedGroupState, 'space-b').groups.push(movedGroup);
  resetCaptureScenario(movedGroupState);
  await listeners.notificationClick(groupReceiptId);
  assert.deepEqual(captureCalls.openedTabs, [{
    url: 'chrome-extension://locus/newtab.html#/ws/ws-a/group/project-a',
  }], 'a same-Workspace Group move must follow its current exact destination');

  const movedOutState = captureFixture();
  const movedOut = captureGroup(movedOutState, 'inbox-a').items.shift();
  captureGroup(movedOutState, 'inbox-c').items.push(movedOut);
  resetCaptureScenario(movedOutState);
  await listeners.notificationClick(restartId);
  assert.deepEqual(captureCalls.openedTabs, [{ url: 'chrome-extension://locus/newtab.html' }],
    'an item moved to another Workspace must fall back to local Home');

  const duplicateIdState = captureFixture();
  captureGroup(duplicateIdState, 'inbox-c').items.push({
    id: 'existing-item', type: 'tab', title: 'Duplicate ID', url: 'https://duplicate-id.test',
  });
  resetCaptureScenario(duplicateIdState);
  await listeners.notificationClick(restartId);
  assert.deepEqual(captureCalls.openedTabs, [{ url: 'chrome-extension://locus/newtab.html' }],
    'a globally duplicated item ID must never choose one target');

  const ambiguousUrlState = captureFixture();
  captureGroup(ambiguousUrlState, 'inbox-a').items.push({
    id: 'second-existing', type: 'tab', title: 'Second existing', url: 'https://existing.test',
  });
  resetCaptureScenario(ambiguousUrlState);
  tabInventory[0].url = 'https://existing.test';
  await listeners.contextMenu({ menuItemId: 'te-save-page' }, deepClone(tabInventory[0]));
  const ambiguousReceipt = onlyCaptureReceipt('an ambiguous URL duplicate');
  assert.equal(ambiguousReceipt.id.startsWith(captureReceiptHomePrefix), true,
    'an ambiguous duplicate must use the generic receipt namespace');
  assert.equal(captureCalls.storageSets, 0);
  assert.deepEqual(captureCalls.removedTabs, []);
  const storageGetsBeforeGenericClick = captureCalls.storageGets;
  await listeners.notificationClick(ambiguousReceipt.id);
  assert.equal(captureCalls.storageGets, storageGetsBeforeGenericClick,
    'a generic receipt must not pretend it has an exact locator');
  assert.deepEqual(captureCalls.openedTabs, [{ url: 'chrome-extension://locus/newtab.html' }]);

  resetCaptureScenario();
  const malformedReceiptId = `${captureReceiptPrefix}item|%ZZ|existing-item|restart123`;
  await listeners.notificationClick(malformedReceiptId);
  assert.equal(captureCalls.storageGets, 0, 'malformed receipt locators must not read or traverse user data');
  assert.deepEqual(captureCalls.openedTabs, [{ url: 'chrome-extension://locus/newtab.html' }]);
  assert.deepEqual(captureCalls.clearedNotifications, [malformedReceiptId]);

  resetCaptureScenario();
  await listeners.notificationClick('unrelated-notification');
  assert.deepEqual(captureCalls.openedTabs, []);
  assert.deepEqual(captureCalls.clearedNotifications, []);
}

async function testCaptureReceiptSurvivesUnconfirmedContinuation() {
  const receiptId = `${captureReceiptPrefix}item|ws-a|existing-item|restart123`;
  const destinationUrl = 'chrome-extension://locus/newtab.html#/ws/ws-a/home?item=existing-item';
  resetCaptureScenario();
  tabGetFailure = 100;

  await listeners.notificationClick(receiptId);

  assert.deepEqual({
    openedTabs: captureCalls.openedTabs,
    createAttempts: captureCalls.effects.filter(effect => effect.startsWith('tab-create-attempt:')).length,
    tabGets: captureCalls.tabGets,
    clearedNotifications: captureCalls.clearedNotifications,
  }, {
    openedTabs: [{ url: destinationUrl }],
    createAttempts: 1,
    tabGets: [100],
    clearedNotifications: [],
  }, 'an unconfirmed continuation must keep the capture receipt available without retrying');
}

async function testCaptureReceiptContinuationConfirmationMatrix() {
  const receiptId = `${captureReceiptPrefix}item|ws-a|existing-item|restart123`;
  const destinationUrl = 'chrome-extension://locus/newtab.html#/ws/ws-a/home?item=existing-item';
  const clickWithFinalTab = async transform => {
    resetCaptureScenario();
    tabGetOverride = (id, tab) => id === 100 ? transform(tab) : tab;
    await listeners.notificationClick(receiptId);
    return {
      createAttempts: captureCalls.effects.filter(effect => effect.startsWith('tab-create-attempt:')).length,
      clearedNotifications: [...captureCalls.clearedNotifications],
    };
  };

  const exactPending = await clickWithFinalTab(tab => ({
    ...tab,
    url: 'chrome-extension://locus/newtab.html',
    pendingUrl: destinationUrl,
  }));
  assert.deepEqual(exactPending, {
    createAttempts: 1,
    clearedNotifications: [receiptId],
  }, 'an exact pending local route must confirm the continuation');

  resetCaptureScenario();
  nextCreatedTabId = -1;
  await listeners.notificationClick(receiptId);
  assert.deepEqual({
    createAttempts: captureCalls.effects.filter(effect => effect.startsWith('tab-create-attempt:')).length,
    tabGets: captureCalls.tabGets,
    clearedNotifications: captureCalls.clearedNotifications,
  }, {
    createAttempts: 1,
    tabGets: [],
    clearedNotifications: [],
  }, 'a negative created-tab identity must keep the capture receipt without a final read or retry');

  for (const [label, transform] of [
    ['wrong route', tab => ({ ...tab, url: 'chrome-extension://locus/newtab.html#/wrong' })],
    ['conflicting pending route', tab => ({ ...tab, pendingUrl: 'chrome-extension://locus/newtab.html#/wrong' })],
    ['whitespace pending route', tab => ({ ...tab, pendingUrl: '   ' })],
    ['malformed pending route', tab => ({ ...tab, pendingUrl: 42 })],
    ['inactive destination', tab => ({ ...tab, active: false })],
    ['malformed window identity', tab => ({ ...tab, windowId: null })],
    ['negative window identity', tab => ({ ...tab, windowId: -1 })],
  ]) {
    assert.deepEqual(await clickWithFinalTab(transform), {
      createAttempts: 1,
      clearedNotifications: [],
    }, `${label} must keep the capture receipt without retrying`);
  }
}

(async () => {
  await testReminderReconciliation();
  await testReminderDeliveryPersistence();
  await testCallbackOnlyReminderDeliveryFailureStaysAuthoritative();
  await testCallbackOnlyReminderDeliverySuccessCommitsAfterReceipt();
  await testCallbackOnlyEntityReminderDeliveryUsesNativeReceipt();
  await testCentralStateWriteProtocol();
  await testAcceptedQuickCaptureReceiptSurvivesMalformedGraph();
  await testAcceptedQuickCaptureReceiptRejectsMalformedDestination();
  await testAcceptedQuickCaptureReceiptTraversesLargeValidStackSafely();
  await testCaptureConflicts();
  await testExactCaptureDestinationAndIds();
  await testSingleContextCaptureTransaction();
  await testContextCaptureSourceEffects();
  await testContextWindowCaptureTransaction();
  await testCaptureReceiptCodecAndFreshResolution();
  await testCaptureReceiptSurvivesUnconfirmedContinuation();
  await testCaptureReceiptContinuationConfirmationMatrix();
  console.log(`Background contracts passed: reminderInitial=${initialAlarmTimes.size}, reminderRestart=${restartAlarmTimes.size}, recurringRearmed=${restartAlarmTimes.size - 1}, restartStale=${restartStaleNames.length}, alarmFailureOps=2, firedDeliveries=8, callbackDeliveryPaths=3, staleIgnored=5, identityMutationPaths=2, deliveryFailurePaths=4, stateAlarmReceipts=2, captureDestinations=10, captureWritePaths=6, captureSourceGuards=6, captureAuthorityGuards=8, captureContinuationGuards=9`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
