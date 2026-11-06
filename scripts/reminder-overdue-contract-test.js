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
const relativeTimeSource = extractBetween(
  newtabSource,
  'function fmtTimeRelative(',
  '\n\nfunction hasIntentMeta',
);
const reminderItemTitleSource = extractBetween(
  newtabSource,
  'function reminderItemTitle(',
  '\nfunction collectReminders(',
);
const calendarDayAriaSource = extractBetween(
  newtabSource,
  'function calendarDayAriaLabel(',
  '\nfunction buildCalMonth(',
);
const calendarAgendaLabelSource = extractBetween(
  newtabSource,
  'function _calAgendaDayLabel(',
  '\nfunction _calAgendaSection(',
);
const calendarDotLabelSource = extractBetween(
  newtabSource,
  'function calendarSourceLabel(',
  '\nfunction buildCalDot(',
);
const calendarSurfaceSource = extractBetween(
  newtabSource,
  '// CALENDAR (§5 — unified reminders surface)',
  '// VIEW MODES (board / list)',
);
const englishI18nSource = extractBetween(
  newtabSource,
  '  en: {',
  "\n  'zh-TW': {",
);
const traditionalChineseI18nSource = extractBetween(
  newtabSource,
  "  'zh-TW': {",
  '\n  }\n};',
);
const pickerSource = extractBetween(
  newtabSource,
  'function openReminderPicker(itemId, detailContext = undefined, options = {}) {',
  '\nfunction openReminderOverlay(ctx, existing, opts = {}) {',
);
const badgeSource = extractBetween(
  newtabSource,
  'function renderReminderBadge(it) {',
  '\n\nfunction attachItemSelection(',
);
const calendarSource = extractBetween(
  newtabSource,
  'function buildCalendarEntries() {',
  '\n\n// Parse the calendar filter string',
);
const calendarMenuSource = extractBetween(
  newtabSource,
  'function calendarDotMenuItems(entry, opener) {',
  '\n// Move a reminder to a different day',
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
  { id: 'calendar-recurring', at: recurringTimes.daily, notified: false, recur: { every: 'day', interval: 1 }, source: 'group', refId: 'group', index: 4, reminderId: 'calendar-reminder', wsId: 'ws', catId: 'cat', groupId: 'group' },
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

const relativeCopy = {
  en: {
    'time.soon': 'soon',
    'time.now': 'now',
    'time.inMinutes': 'in {count}m',
    'time.minutesAgo': '{count}m ago',
    'time.inHours': 'in {count}h',
    'time.hoursAgo': '{count}h ago',
    'time.inDays': 'in {count}d',
    'time.daysAgo': '{count}d ago',
  },
  'zh-TW': {
    'time.soon': '即將',
    'time.now': '剛剛',
    'time.inMinutes': '{count} 分鐘後',
    'time.minutesAgo': '{count} 分鐘前',
    'time.inHours': '{count} 小時後',
    'time.hoursAgo': '{count} 小時前',
    'time.inDays': '{count} 天後',
    'time.daysAgo': '{count} 天前',
  },
};
let relativeLocale = 'en';
const relativeContext = vm.createContext({
  Date: FixedDate,
  tr(key, vars = {}) {
    const template = relativeCopy[relativeLocale]?.[key];
    assert.equal(typeof template, 'string', `relative-time key ${key} must exist in ${relativeLocale}`);
    return Object.entries(vars).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      template,
    );
  },
});
vm.runInContext(
  `${relativeTimeSource}\nglobalThis.__formatRelative = fmtTimeRelative;`,
  relativeContext,
  { filename: 'relative-time-production-contract.js' },
);
const formatRelative = relativeContext.__formatRelative;
const relativeCases = [
  ['future sub-minute', fixedNow + 30_000, 'soon', '即將'],
  ['past sub-minute', fixedNow - 30_000, 'now', '剛剛'],
  ['future minutes', fixedNow + 119_000, 'in 2m', '2 分鐘後'],
  ['past minutes', fixedNow - 119_000, '2m ago', '2 分鐘前'],
  ['future hours', fixedNow + (90 * 60_000), 'in 2h', '2 小時後'],
  ['past hours', fixedNow - (90 * 60_000), '2h ago', '2 小時前'],
  ['future days', fixedNow + (36 * 3_600_000), 'in 2d', '2 天後'],
  ['past days', fixedNow - (36 * 3_600_000), '2d ago', '2 天前'],
  ['minute-to-hour threshold', fixedNow + (59.5 * 60_000), 'in 1h', '1 小時後'],
  ['hour-to-day threshold', fixedNow + (23.5 * 3_600_000), 'in 1d', '1 天後'],
];
for (const [label, timestamp, english, traditionalChinese] of relativeCases) {
  relativeLocale = 'en';
  assert.equal(formatRelative(timestamp, fixedNow), english, `${label}: English`);
  relativeLocale = 'zh-TW';
  assert.equal(formatRelative(timestamp, fixedNow), traditionalChinese, `${label}: native zh-TW`);
}
assert.doesNotMatch(relativeTimeSource, /['"`](?:soon|now|in \$\{|ago)/, 'relative-time copy must come from locale keys');
assert.match(
  newtabSource,
  /function projectGeneralSettingsChange\(keys\)[\s\S]*keys\.includes\('language'\)[\s\S]*applySettings\(\);\s+renderAll\(\);[\s\S]*const languageSelect = document\.getElementById\('seg-language'\)[\s\S]*commitGeneralSettingsChange\(e\.target\.id, \{ language: e\.target\.value \}\)/,
  'an acknowledged locale change must repaint dynamic relative-time surfaces from the same stored timestamps',
);

const calendarCopy = {
  en: {
    'cal.title': 'Calendar',
    'cal.breadcrumb': 'Calendar navigation',
    'cal.back': 'Back',
    'cal.backToBoard': 'Back to board',
    'cal.upcoming': 'Upcoming',
    'cal.viewLabel': 'Calendar view',
    'cal.view.month': 'Month',
    'cal.view.week': 'Week',
    'cal.view.agenda': 'Agenda',
    'cal.periodNavigation': 'Calendar period',
    'cal.previousPeriod': 'Previous period',
    'cal.nextPeriod': 'Next period',
    'cal.today': 'Today',
    'cal.tomorrow': 'Tomorrow',
    'cal.filterLabel': 'Filter reminders',
    'cal.filterPlaceholder': 'Filter — type:tab, in:work, color:red, -source:group',
    'cal.pastDue': 'Past due',
    'cal.noRemindersHere': 'No reminders here.',
    'cal.nothingUpcoming': 'Nothing upcoming.',
    'cal.noWorkspaceReminders': 'No reminders in this workspace yet — set one on any item to see it here.',
    'cal.noFilterMatches': 'No reminders match this filter.',
    'cal.more': '+{count} more',
    'cal.dayOneReminder': '{date}, 1 reminder',
    'cal.dayManyReminders': '{date}, {count} reminders',
    'cal.dayNoReminders': '{date}, no reminders',
    'cal.itemUnavailable': 'Item no longer exists',
    'cal.sourceGroup': 'Group',
    'cal.sourceSpace': 'Space',
    'cal.noteFallback': 'Note',
    'cal.untitledFallback': 'Untitled',
    'cal.dotTitle': '{title} — {date}',
    'cal.dotTitleWithSource': '{title} — {date} ({source})',
    'cal.history.addTask': 'Add calendar task',
  },
  'zh-TW': {
    'cal.title': '行事曆',
    'cal.breadcrumb': '行事曆導覽',
    'cal.back': '返回',
    'cal.backToBoard': '返回看板',
    'cal.upcoming': '近期提醒',
    'cal.viewLabel': '行事曆檢視',
    'cal.view.month': '月',
    'cal.view.week': '週',
    'cal.view.agenda': '議程',
    'cal.periodNavigation': '行事曆期間',
    'cal.previousPeriod': '上一個期間',
    'cal.nextPeriod': '下一個期間',
    'cal.today': '今天',
    'cal.tomorrow': '明天',
    'cal.filterLabel': '篩選提醒',
    'cal.filterPlaceholder': '篩選，例如 type:tab、in:work、color:red、-source:group',
    'cal.pastDue': '已逾期',
    'cal.noRemindersHere': '這裡沒有提醒。',
    'cal.nothingUpcoming': '近期沒有提醒。',
    'cal.noWorkspaceReminders': '這個工作區目前沒有提醒。請在任何項目上設定提醒，提醒就會顯示在這裡。',
    'cal.noFilterMatches': '沒有符合篩選條件的提醒。',
    'cal.more': '另有 {count} 個',
    'cal.dayOneReminder': '{date}，1 個提醒',
    'cal.dayManyReminders': '{date}，{count} 個提醒',
    'cal.dayNoReminders': '{date}，沒有提醒',
    'cal.itemUnavailable': '此項目已不存在',
    'cal.sourceGroup': '群組',
    'cal.sourceSpace': '空間',
    'cal.noteFallback': '筆記',
    'cal.untitledFallback': '未命名項目',
    'cal.dotTitle': '{title} — {date}',
    'cal.dotTitleWithSource': '{title} — {date}（{source}）',
    'cal.history.addTask': '新增行事曆待辦',
  },
};
const regexEscape = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const [locale, source] of [['en', englishI18nSource], ['zh-TW', traditionalChineseI18nSource]]) {
  for (const [key, value] of Object.entries(calendarCopy[locale])) {
    assert.match(
      source,
      new RegExp(`'${regexEscape(key)}': '${regexEscape(value)}'`),
      `${locale} Calendar copy must define ${key}`,
    );
  }
}

let calendarLocale = 'en';
const calendarContext = vm.createContext({
  Date: FixedDate,
  appLocale() {
    return calendarLocale === 'zh-TW' ? 'zh-TW' : 'en-US';
  },
  tr(key, vars = {}) {
    const template = calendarCopy[calendarLocale]?.[key];
    assert.equal(typeof template, 'string', `Calendar key ${key} must exist in ${calendarLocale}`);
    return Object.entries(vars).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      template,
    );
  },
  _tlStartOfDay(timestamp) {
    const date = new FixedDate(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  },
});
vm.runInContext(
  `${reminderItemTitleSource}\n${calendarDayAriaSource}\n${calendarAgendaLabelSource}\n${calendarDotLabelSource}\n`
    + 'globalThis.__calendarCopyApi = { reminderItemTitle, calendarDayAriaLabel, _calAgendaDayLabel, calendarSourceLabel, calendarDotTitle };',
  calendarContext,
  { filename: 'calendar-copy-production-contract.js' },
);
const calendarCopyApi = calendarContext.__calendarCopyApi;
const calendarTodayStart = calendarContext._tlStartOfDay(fixedNow);
const calendarTomorrowDate = new FixedDate(calendarTodayStart);
calendarTomorrowDate.setDate(calendarTomorrowDate.getDate() + 1);
const calendarTomorrowStart = calendarContext._tlStartOfDay(calendarTomorrowDate.getTime());
calendarLocale = 'en';
assert.equal(calendarCopyApi.reminderItemTitle({ type: 'note', html: '' }), 'Note');
assert.equal(calendarCopyApi.reminderItemTitle({ type: 'todo', text: '' }), 'Untitled');
assert.equal(calendarCopyApi.reminderItemTitle({ type: 'note', html: '<b>Reviewed</b> plan' }), 'Reviewed  plan');
assert.match(calendarCopyApi.calendarDayAriaLabel(fixedNow, 0), /, no reminders$/);
assert.match(calendarCopyApi.calendarDayAriaLabel(fixedNow, 1), /, 1 reminder$/);
assert.match(calendarCopyApi.calendarDayAriaLabel(fixedNow, 3), /, 3 reminders$/);
assert.equal(calendarCopyApi._calAgendaDayLabel(calendarTodayStart, fixedNow), 'Today');
assert.equal(calendarCopyApi._calAgendaDayLabel(calendarTomorrowStart, fixedNow), 'Tomorrow');
assert.equal(calendarCopyApi.calendarSourceLabel('group'), 'Group');
assert.equal(calendarCopyApi.calendarSourceLabel('category'), 'Space');
assert.match(calendarCopyApi.calendarDotTitle({ title: 'Review', at: fixedNow, source: 'group' }), /^Review — .+ \(Group\)$/);
calendarLocale = 'zh-TW';
assert.equal(calendarCopyApi.reminderItemTitle({ type: 'note', html: '' }), '筆記');
assert.equal(calendarCopyApi.reminderItemTitle({ type: 'todo', text: '' }), '未命名項目');
assert.match(calendarCopyApi.calendarDayAriaLabel(fixedNow, 0), /，沒有提醒$/);
assert.match(calendarCopyApi.calendarDayAriaLabel(fixedNow, 1), /，1 個提醒$/);
assert.match(calendarCopyApi.calendarDayAriaLabel(fixedNow, 3), /，3 個提醒$/);
assert.equal(calendarCopyApi._calAgendaDayLabel(calendarTodayStart, fixedNow), '今天');
assert.equal(calendarCopyApi._calAgendaDayLabel(calendarTomorrowStart, fixedNow), '明天');
assert.equal(calendarCopyApi.calendarSourceLabel('group'), '群組');
assert.equal(calendarCopyApi.calendarSourceLabel('category'), '空間');
assert.match(calendarCopyApi.calendarDotTitle({ title: '檢視', at: fixedNow, source: 'category' }), /^檢視 — .+（空間）$/);

const executableCalendarSource = calendarSurfaceSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
for (const literal of [
  "'Upcoming'", "'Today'", "'Tomorrow'", "'Past due'", "'No reminders here.'",
  "'Nothing upcoming.'", "'Back to board'", "'Calendar'", "'Item no longer exists'",
]) {
  assert.equal(executableCalendarSource.includes(literal), false, `Calendar code must not retain ${literal}`);
}
assert.match(executableCalendarSource, /seg\.setAttribute\('role', 'group'\)/, 'Calendar views need grouped semantics');
assert.match(executableCalendarSource, /seg\.setAttribute\('aria-label', tr\('cal\.viewLabel'\)\)/, 'Calendar views need a localized group name');
assert.match(executableCalendarSource, /b\.setAttribute\('aria-pressed', String\(activeCalendar\.view === v\)\)/, 'Calendar view state must be exposed');
assert.match(executableCalendarSource, /input\.setAttribute\('aria-label', tr\('cal\.filterLabel'\)\)/, 'Calendar filter needs a localized accessible name');
assert.match(executableCalendarSource, /bar\.setAttribute\('aria-label', tr\('cal\.breadcrumb'\)\)/, 'Calendar breadcrumb needs a localized landmark name');
assert.match(
  executableCalendarSource,
  /if \(input\.value\) \{ input\.value = ''; calendarFilter = ''; _calFilterRestore = \{ caret: 0 \}; renderBoard\(\); \} else input\.blur\(\);/,
  'Escape must clear a nonempty Calendar filter without dropping focus from its rebuilt input',
);
const calendarCopyUseSource = `${calendarSurfaceSource}\n${reminderItemTitleSource}`;
for (const key of Object.keys(calendarCopy.en)) {
  assert.ok(calendarCopyUseSource.includes(`'${key}'`), `Calendar production paths must use ${key}`);
}
assert.match(
  executableCalendarSource,
  /if \(!all\.length\) \{\s+wrap\.appendChild\(_calEmptyNote\(tr\('cal\.noWorkspaceReminders'\)\)\);\s+\} else if \(!shown\.length\) \{\s+wrap\.appendChild\(_calEmptyNote\(tr\('cal\.noFilterMatches'\)\)\);\s+\} else \{\s+wrap\.appendChild\(view === 'agenda'/,
  'Calendar must render one authoritative workspace-empty or filter-empty state instead of stacking a view empty state',
);

const context = vm.createContext({
  Date: FixedDate,
  activeWs() { return workspace; },
  collectReminders(options) {
    assert.equal(options?.scope, 'ws');
    return rawCalendarEntries.map(entry => ({ ...entry }));
  },
  createItemReminderMutationContext(id) {
    return id === pickerItem.id ? { itemId: id } : null;
  },
  resolveItemReminderMutationTarget(mutationContext) {
    return mutationContext?.itemId === pickerItem.id ? { item: pickerItem } : null;
  },
  document: {
    querySelector() {
      return null;
    },
  },
  CSS: {
    escape(value) {
      return String(value);
    },
  },
  findItem(id) { return id === pickerItem.id ? { item: pickerItem } : null; },
  entityReminderOwnerTarget(kind, id) {
    return kind === 'group' && id === pickerEntity.id
      ? { kind, entityId: id, entity: pickerEntity }
      : null;
  },
  isStableEntityReminderId(value) {
    return typeof value === 'string' && value.trim().length > 0;
  },
  createEntityReminderRemovalContext(kind, id, reminderId) {
    return { kind, entityId: id, reminderId };
  },
  createEntityReminderMutationContext(kind, id, reminderId) {
    const reminderRef = pickerEntity.reminders.find(reminder => reminder.id === reminderId) || null;
    return { kind, entityId: id, reminderId, reminderRef };
  },
  fmtTimeRelative(at) { return `relative:${at}`; },
  tr(key, vars = {}) {
    return String(key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
  },
  openReminderOverlay(ctx, existing, options) {
    pickerCalls.push({ ctx, existing, options });
  },
});

vm.runInContext(
  `${projectionSource}\n${pendingCollectorSource}\n${pickerSource}\n${badgeSource}\n${calendarSource}\n${calendarMenuSource}\n${backgroundRecurrenceSource}\n`
    + 'globalThis.__api = { projectPendingReminders, pendingReminderTime, nextReminderOccurrenceForDisplay, backgroundNextRecurTime, openReminderPicker, openEntityReminderPicker, renderReminderBadge, buildCalendarEntries, calendarDotMenuItems };',
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
api.openEntityReminderPicker('group', pickerEntity.id, 'picker-reminder');
assert.equal(pickerCalls[0].existing.at, fixedNow + DAY, 'the item editor must open on the projected next occurrence');
assert.equal(pickerCalls[1].existing.at, Date.UTC(2030, 0, 29, 12, 0, 0), 'the entity editor must open on the projected next occurrence');
assert.equal(pickerCalls[1].ctx.reminderId, 'picker-reminder', 'the entity picker must retain stable identity instead of an array index');
assert.deepEqual(
  JSON.parse(JSON.stringify(pickerCalls[1].ctx.removalContext)),
  { kind: 'group', entityId: pickerEntity.id, reminderId: 'picker-reminder' },
);
assert.deepEqual(
  JSON.parse(JSON.stringify(pickerCalls[1].ctx.mutationContext)),
  {
    kind: 'group',
    entityId: pickerEntity.id,
    reminderId: 'picker-reminder',
    reminderRef: pickerEntity.reminders[0],
  },
  'the entity picker must retain frozen mutation authority alongside its removal context',
);
assert.equal(pickerItem.reminder.at, recurringTimes.daily, 'opening the item editor must not mutate storage');
assert.equal(pickerEntity.reminders[0].at, recurringTimes.weekly, 'opening the entity editor must not mutate storage');

const calendarEntries = api.buildCalendarEntries();
assert.deepEqual(Array.from(calendarEntries, entry => entry.id), ['calendar-overdue', 'calendar-recurring']);
assert.equal(calendarEntries[0].groupName, 'Inbox');
assert.equal(calendarEntries[0].catName, 'Work');
assert.equal(calendarEntries[1].at, fixedNow + DAY, 'Calendar must show the future projected recurrence');
assert.equal(calendarEntries[1].index, 4, 'Calendar may retain the transitional index for non-removal actions');
assert.equal(calendarEntries[1].reminderId, 'calendar-reminder', 'Calendar removal must retain stable reminder identity');

const calendarOpener = { id: 'calendar-dot-opener' };
const menuItems = api.calendarDotMenuItems({
  source: 'group',
  refId: pickerEntity.id,
  reminderId: 'picker-reminder',
  title: 'Review',
}, calendarOpener);
assert.equal(menuItems.length, 4);
menuItems[1].action();
menuItems[3].action();
assert.equal(pickerCalls[2].ctx.reminderId, 'picker-reminder', 'Calendar Edit must use the stable reminder id');
assert.equal(pickerCalls[2].options.opener, calendarOpener);
assert.equal(pickerCalls[3].ctx.reminderId, 'picker-reminder', 'Calendar Remove must use the stable reminder id');
assert.equal(pickerCalls[3].options.opener, calendarOpener);
assert.equal(pickerCalls[3].options.initialFocus, 'remove', 'Calendar Remove must reopen the reviewed destructive control');
assert.doesNotMatch(calendarMenuSource, /entry\.index/, 'Calendar menu actions must never use a stale array index');

const wiringChecks = [
  [/const reminders = collectPendingReminders\(\{ scope: ws\.id \}\)\.length;/, 'landing pending count'],
  [/pending = collectPendingReminders\(\{ scope: ws \? ws\.id : undefined \}\)\.length;/, 'app-menu pending count'],
  [/reminderCount = collectPendingReminders\(\{ scope: ws\.id \}\)\.length;/, 'Calendar default-view count'],
  [/return collectPendingReminders\(\{ scope: ws\.id \}\)\.map/, 'Calendar entry source'],
  [/const at = pendingReminderTime\(it\.reminder, now\);/, 'item reminder badge'],
];
for (const [pattern, label] of wiringChecks) assert.match(newtabSource, pattern, `${label} must use the shared pending policy`);

console.log(`Reminder overdue contracts passed: pending=6, projectedRecurrences=3, pastDue=2, resolvedHidden=2, wiredSurfaces=5, relativeCases=${relativeCases.length * 2}, calendarCopyKeys=${Object.keys(calendarCopy.en).length}`);
