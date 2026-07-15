'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const newtabSource = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const backgroundSource = fs.readFileSync(path.join(root, 'background.js'), 'utf8').replace(/\r\n/g, '\n');
const fixedNow = Date.UTC(2030, 0, 15, 12, 0, 0);
const DAY = 86_400_000;

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker} must be extractable`);
  return source.slice(start, end);
}

const projectionSource = extractBetween(
  newtabSource,
  'function nextReminderOccurrenceForDisplay(at, recur, now = Date.now()) {',
  '\n\n// ',
);
const pendingCollectorSource = extractBetween(
  newtabSource,
  'function collectPendingReminders(options = {}, now = Date.now()) {',
  '\n\n// ',
);
const pickerSource = extractBetween(
  newtabSource,
  'function openReminderPicker(itemId) {',
  '\nfunction openReminderOverlay(ctx, existing, opts = {}) {',
);
const badgeSource = extractBetween(
  newtabSource,
  'function renderReminderBadge(it) {',
  '\n\nfunction attachItemSelection(el, it) {',
);
const calendarSource = extractBetween(
  newtabSource,
  'function buildCalendarEntries() {',
  '\n\n// Parse the calendar filter string',
);
const backgroundRecurrenceSource = extractBetween(
  backgroundSource,
  'function nextRecurTime(at, recur, now = Date.now()) {',
  '\n\n// Alarm names can outlive a reminder edit or deletion.',
).replace('function nextRecurTime(', 'function backgroundNextRecurTime(');

const recurringTimes = {
  daily: fixedNow - (5 * DAY),
  weekly: Date.UTC(2030, 0, 1, 12, 0, 0),
  monthly: Date.UTC(2029, 10, 15, 12, 0, 0),
};
const pickerItem = {
  id: 'picker-item',
  reminder: { at: recurringTimes.daily, notified: false, recur: { every: 'day', interval: 1 } },
};
const pickerEntity = {
  id: 'picker-group',
  name: 'Picker group',
  reminders: [{ id: 'picker-reminder', at: recurringTimes.weekly, notified: false, recur: { every: 'week', interval: 2 }, label: 'Review' }],
};
const pickerCalls = [];
const rawCalendarEntries = [
  { id: 'calendar-overdue', at: fixedNow - DAY, notified: false, source: 'item', refId: 'item', wsId: 'ws', catId: 'cat', groupId: 'group' },
  { id: 'calendar-resolved', at: fixedNow - DAY, notified: true, source: 'category', refId: 'cat', wsId: 'ws', catId: 'cat' },
  { id: 'calendar-recurring', at: recurringTimes.daily, notified: false, recur: { every: 'day', interval: 1 }, source: 'group', refId: 'group', index: 4, wsId: 'ws', catId: 'cat', groupId: 'group' },
];
const workspace = {
  id: 'ws',
  categories: [{ id: 'cat', name: 'Work', groups: [{ id: 'group', name: 'Inbox' }] }],
};

class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [fixedNow]));
  }

  static now() {
    return fixedNow;
  }
}

const context = vm.createContext({
  Date: FixedDate,
  activeWs() { return workspace; },
  collectReminders(options) {
    assert.equal(options?.scope, 'ws');
    return rawCalendarEntries.map(entry => ({ ...entry }));
  },
  findItem(id) { return id === pickerItem.id ? { item: pickerItem } : null; },
  findEntity(kind, id) { return kind === 'group' && id === pickerEntity.id ? pickerEntity : null; },
  fmtTimeRelative(at) { return `relative:${at}`; },
  openReminderOverlay(ctx, existing, options) {
    pickerCalls.push({ ctx, existing, options });
  },
});

vm.runInContext(
  `${projectionSource}\n${pendingCollectorSource}\n${pickerSource}\n${badgeSource}\n${calendarSource}\n${backgroundRecurrenceSource}\n`
    + 'globalThis.__api = { projectPendingReminders, pendingReminderTime, nextReminderOccurrenceForDisplay, backgroundNextRecurTime, openReminderPicker, openEntityReminderPicker, renderReminderBadge, buildCalendarEntries };',
  context,
  { filename: 'reminder-overdue-production-contract.js' },
);
const api = context.__api;

const entries = [
  { id: 'overdue-once', at: fixedNow - (2 * DAY), notified: false, source: 'item', refId: 'item-overdue' },
  { id: 'future-once', at: fixedNow + 3_600_000, notified: false, source: 'category', refId: 'cat', index: 2 },
  { id: 'resolved-past', at: fixedNow - DAY, notified: true, source: 'item', refId: 'resolved-past' },
  { id: 'resolved-future', at: fixedNow + DAY, notified: true, source: 'group', refId: 'resolved-future', index: 3 },
  { id: 'daily', at: recurringTimes.daily, notified: false, recur: { every: 'day', interval: 1 }, source: 'item', refId: 'daily' },
  { id: 'weekly', at: recurringTimes.weekly, notified: false, recur: { every: 'week', interval: 2 }, source: 'group', refId: 'weekly-group', index: 7, reminderId: 'weekly-reminder' },
  { id: 'monthly', at: recurringTimes.monthly, notified: false, recur: { every: 'month', interval: 1 }, source: 'category', refId: 'monthly-category', index: 5, reminderId: 'monthly-reminder' },
  { id: 'expired', at: Date.UTC(2030, 0, 1, 12, 0, 0), notified: false, recur: { every: 'day', interval: 1, until: Date.UTC(2030, 0, 10, 12, 0, 0) }, source: 'item', refId: 'expired' },
  { id: 'invalid', at: 'not-a-time', notified: false, source: 'item', refId: 'invalid' },
];
const inputSnapshot = JSON.parse(JSON.stringify(entries));
const projected = api.projectPendingReminders(entries, fixedNow);
const byId = new Map(projected.map(entry => [entry.id, entry]));

assert.equal(projected.length, 6, 'only unresolved reminders with finite timestamps belong to pending surfaces');
assert.equal(byId.has('resolved-past'), false, 'a delivered past one-shot must not stay in Past due');
assert.equal(byId.has('resolved-future'), false, 'a notified record must never inflate pending counts');
assert.equal(byId.has('invalid'), false, 'a malformed timestamp must not reach date rendering');
assert.equal(byId.get('overdue-once').at, fixedNow - (2 * DAY), 'an overdue one-shot must keep its stored Past due timestamp');
assert.equal(byId.get('future-once').at, fixedNow + 3_600_000, 'a future one-shot must keep its scheduled timestamp');
assert.equal(byId.get('daily').at, fixedNow + DAY, 'a missed daily series must project strictly after now');
assert.equal(byId.get('weekly').at, Date.UTC(2030, 0, 29, 12, 0, 0), 'a missed biweekly series must skip the occurrence at now');
assert.equal(byId.get('monthly').at, Date.UTC(2030, 1, 15, 12, 0, 0), 'a missed monthly series must retain calendar arithmetic');
assert.equal(byId.get('expired').at, entries.find(entry => entry.id === 'expired').at, 'an expired series must remain recoverable as Past due');
assert.equal(byId.get('weekly').index, 7, 'projection must preserve the entity reminder index used by edit/remove actions');
assert.equal(byId.get('weekly').reminderId, 'weekly-reminder', 'projection must preserve the stable reminder identity');
assert.deepEqual(entries, inputSnapshot, 'pending projection must not mutate stored reminder data');
const projectedTimes = Array.from(projected, entry => entry.at);
assert.deepEqual(projectedTimes, [...projectedTimes].sort((a, b) => a - b), 'projected reminders must be sorted by displayed occurrence');

for (const id of ['daily', 'weekly', 'monthly', 'expired']) {
  const entry = entries.find(candidate => candidate.id === id);
  assert.equal(
    api.nextReminderOccurrenceForDisplay(entry.at, entry.recur, fixedNow),
    api.backgroundNextRecurTime(entry.at, entry.recur, fixedNow),
    `${id} display projection must match background reconciliation`,
  );
}

assert.equal(api.renderReminderBadge({ reminder: entries.find(entry => entry.id === 'resolved-past') }), '', 'resolved reminders must have no pending item badge');
const overdueBadge = api.renderReminderBadge({ reminder: entries.find(entry => entry.id === 'overdue-once') });
assert.match(overdueBadge, /rem-badge past/, 'an unresolved one-shot must retain a Past due item badge');
assert.match(overdueBadge, new RegExp(`relative:${fixedNow - (2 * DAY)}`));
const recurringBadge = api.renderReminderBadge({ reminder: entries.find(entry => entry.id === 'daily') });
assert.doesNotMatch(recurringBadge, /rem-badge past/, 'a re-armed recurrence must not masquerade as Past due');
assert.match(recurringBadge, new RegExp(`relative:${fixedNow + DAY}`));

api.openReminderPicker(pickerItem.id);
api.openEntityReminderPicker('group', pickerEntity.id, 0);
assert.equal(pickerCalls[0].existing.at, fixedNow + DAY, 'the item editor must open on the projected next occurrence');
assert.equal(pickerCalls[1].existing.at, Date.UTC(2030, 0, 29, 12, 0, 0), 'the entity editor must open on the projected next occurrence');
assert.equal(pickerItem.reminder.at, recurringTimes.daily, 'opening the item editor must not mutate storage');
assert.equal(pickerEntity.reminders[0].at, recurringTimes.weekly, 'opening the entity editor must not mutate storage');

const calendarEntries = api.buildCalendarEntries();
assert.deepEqual(Array.from(calendarEntries, entry => entry.id), ['calendar-overdue', 'calendar-recurring']);
assert.equal(calendarEntries[0].groupName, 'Inbox');
assert.equal(calendarEntries[0].catName, 'Work');
assert.equal(calendarEntries[1].at, fixedNow + DAY, 'Calendar must show the future projected recurrence');
assert.equal(calendarEntries[1].index, 4, 'Calendar projection must retain the action target index');

const wiringChecks = [
  [/const reminders = collectPendingReminders\(\{ scope: ws\.id \}\)\.length;/, 'landing pending count'],
  [/pending = collectPendingReminders\(\{ scope: ws \? ws\.id : undefined \}\)\.length;/, 'app-menu pending count'],
  [/reminderCount = collectPendingReminders\(\{ scope: ws\.id \}\)\.length;/, 'Calendar default-view count'],
  [/return collectPendingReminders\(\{ scope: ws\.id \}\)\.map/, 'Calendar entry source'],
  [/const at = pendingReminderTime\(it\.reminder, now\);/, 'item reminder badge'],
];
for (const [pattern, label] of wiringChecks) assert.match(newtabSource, pattern, `${label} must use the shared pending policy`);

console.log('Reminder overdue contracts passed: pending=6, projectedRecurrences=3, pastDue=2, resolvedHidden=2, wiredSurfaces=5');
