'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const fixedNow = Date.UTC(2030, 0, 15, 12, 0, 0);

function extractBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker} must be extractable`);
  return source.slice(start, end);
}

const identitySource = extractBetween('function isStableEntityReminderId(value) {', '\n\nfunction migrate() {');
const migrationPersistSource = extractBetween('function persistReminderIdentityMigration(fromSchema, normalized) {', '\n\nfunction initAfterLoad() {');
const reminderSource = extractBetween('function findEntity(kind, entId) {', '\nfunction recurLabel(recur) {');
const group = {
  id: 'group-with-dash',
  name: 'Group',
  reminders: [
    { id: 'first', at: fixedNow + 60_000, notified: false, label: 'First' },
    { id: 'second', at: fixedNow + 120_000, notified: false, label: 'Second' },
  ],
};
const category = { id: 'category', name: 'Category', reminders: [] };
const alarmMap = new Map([
  ['te-greminder-group-with-dash-0', { name: 'te-greminder-group-with-dash-0' }],
  ['te-greminder-group-with-dash-1', { name: 'te-greminder-group-with-dash-1' }],
  ['te-greminder-group-with-dash-extra-0', { name: 'te-greminder-group-with-dash-extra-0' }],
  ['unrelated', { name: 'unrelated' }],
]);
const calls = { created: [], cleared: [], snapshots: [], persists: 0, renders: 0, toasts: [], migrationOrder: [] };
let idSequence = 0;

class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [fixedNow]));
  }

  static now() {
    return fixedNow;
  }
}

const context = vm.createContext({
  chrome: {
    alarms: {
      async getAll() { return [...alarmMap.values()].map(alarm => ({ ...alarm })); },
      async clear(name) {
        calls.cleared.push(name);
        return alarmMap.delete(name);
      },
      async create(name, options) {
        calls.created.push({ name, when: options.when });
        alarmMap.set(name, { name, scheduledTime: options.when });
      },
    },
    runtime: {
      async sendMessage(message) {
        assert.equal(message?.type, 'reconcile-reminders');
        calls.migrationOrder.push('reconcile');
        return { ok: true };
      },
    },
  },
  Date: FixedDate,
  findCategory(id) { return id === category.id ? { cat: category } : null; },
  findGroup(id) { return id === group.id ? { group } : null; },
  renderBoard() { calls.renders += 1; },
  State: {
    isRecoveryRequired() { return false; },
    persist() { calls.persists += 1; },
    async persistNow(options) {
      assert.equal(options?.recordMutation, false);
      calls.migrationOrder.push('persist');
    },
    snapshot(label) { calls.snapshots.push(label); },
  },
  toast(message) { calls.toasts.push(message); },
  uid() { return `generated-${++idSequence}`; },
});

vm.runInContext(
  `${identitySource}\n${migrationPersistSource}\n${reminderSource}\n`
    + 'globalThis.__api = { entityReminderAlarmName, parseEntityReminderAlarmName, persistReminderIdentityMigration, reconcileEntityAlarms, setEntityReminder, setEntityReminderTime, removeEntityReminder };',
  context,
  { filename: 'newtab-reminder-identity.js' },
);
const api = context.__api;

function alarmNames() {
  return [...alarmMap.keys()].sort();
}

(async () => {
  assert.equal(api.persistReminderIdentityMigration(12, true), null, 'current schema must not manufacture a migration write');
  assert.deepEqual(calls.migrationOrder, []);
  await api.persistReminderIdentityMigration(11, true);
  assert.deepEqual(calls.migrationOrder, ['persist', 'reconcile'], 'schema migration must persist before replacing legacy alarms');

  const firstName = api.entityReminderAlarmName('group', group.id, group.reminders[0], 0);
  const secondName = api.entityReminderAlarmName('group', group.id, group.reminders[1], 1);
  assert.equal(firstName, 'te-greminder2-group-with-dash|first');
  assert.equal(secondName, 'te-greminder2-group-with-dash|second');

  await api.setEntityReminderTime('group', group.id, 1, fixedNow + 180_000);
  assert.deepEqual(group.reminders.map(reminder => reminder.id), ['first', 'second'], 'rescheduling must preserve reminder identities');
  assert.deepEqual(
    alarmNames(),
    [firstName, secondName, 'te-greminder-group-with-dash-extra-0', 'unrelated'].sort(),
    'reconciliation must replace both legacy index alarms without clearing another entity',
  );
  assert.equal(alarmMap.get(secondName).scheduledTime, fixedNow + 180_000);

  await api.removeEntityReminder('group', group.id, 0);
  assert.deepEqual(group.reminders.map(reminder => reminder.id), ['second']);
  assert.equal(alarmMap.has(firstName), false, 'removing a neighbor must retire only its stable alarm');
  assert.equal(alarmMap.has(secondName), true, 'the shifted reminder must retain its alarm identity');

  await api.setEntityReminder('group', group.id, {
    at: fixedNow + 240_000,
    label: 'Edited second',
    recur: { every: 'week', interval: 1 },
  }, 0);
  assert.equal(group.reminders[0].id, 'second', 'editing must preserve the existing reminder id');
  assert.equal(alarmMap.get(secondName).scheduledTime, fixedNow + 240_000);

  await api.setEntityReminder('group', group.id, { at: fixedNow + 300_000, label: 'Added' });
  assert.deepEqual(group.reminders.map(reminder => reminder.id), ['second', 'generated-1']);
  const addedName = api.entityReminderAlarmName('group', group.id, group.reminders[1], 1);
  assert.equal(alarmMap.has(addedName), true, 'a new reminder must receive a stable alarm name');

  group.reminders.reverse();
  await api.reconcileEntityAlarms('group', group.id, group.reminders);
  assert.equal(alarmMap.has(secondName), true);
  assert.equal(alarmMap.has(addedName), true, 'pure reordering must not rename either alarm');

  group.reminders.push({ id: 'notified', at: fixedNow + 360_000, notified: true });
  await api.reconcileEntityAlarms('group', group.id, group.reminders);
  assert.equal(alarmMap.has('te-greminder2-group-with-dash|notified'), false, 'notified reminders must stay unscheduled');

  const encoded = api.entityReminderAlarmName('category', 'cat-|空', { id: 'rem-|醒' }, 0);
  assert.equal(encoded, 'te-creminder2-cat-%7C%E7%A9%BA|rem-%7C%E9%86%92');
  assert.deepEqual(
    JSON.parse(JSON.stringify(api.parseEntityReminderAlarmName(encoded))),
    { kind: 'category', entId: 'cat-|空', reminderId: 'rem-|醒', legacyIndex: null },
    'encoded entity/reminder ids must round-trip without delimiter ambiguity',
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(api.parseEntityReminderAlarmName('te-greminder-group-with-dash-7'))),
    { kind: 'group', entId: 'group-with-dash', reminderId: null, legacyIndex: 7 },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(api.parseEntityReminderAlarmName('te-greminder-group-|legacy-8'))),
    { kind: 'group', entId: 'group-|legacy', reminderId: null, legacyIndex: 8 },
    'the distinct schema-12 prefix must leave arbitrary legacy entity ids unambiguous',
  );

  assert.deepEqual(calls.snapshots, ['Reschedule reminder', 'Remove reminder', 'Edit reminder', 'Add reminder']);
  assert.equal(calls.persists, 4);
  assert.equal(calls.renders, 4);
  console.log(`Reminder identity contracts passed: migrationOrder=2, mutations=${calls.persists}, stableAlarms=2, encodedRoundTrips=3`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
