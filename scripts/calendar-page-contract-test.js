'use strict';

// Contract test for the Calendar view inside Plan (canvas board
// Calendar.dc.html): the selected day and its panel, Move to (days, times,
// the reminder transactions and their receipts, the travelling card), quick
// add through the reviewed Add-task transaction, one authoritative empty
// message, keys, today's single pulse, the phone layout, locales and CSS.
// Production slices of newtab.js run in node:vm beside the real plan.js; the
// date rules also run in three time zones (one child process each).

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const source = read('newtab.js');
const planSource = read('plan.js');
const css = read('newtab.css');
const html = read('newtab.html');
const ci = read('.github/workflows/ci.yml');
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const plain = value => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const eq = (actual, expected, message) => { assert.deepEqual(plain(actual), plain(expected), message); checks += 1; };

// A top-level function runs from its declaration to the first closing brace at
// column 0 (the file's style), so regex literals with quotes cannot fool it.
function extractFunction(name) {
  const marker = new RegExp(`^(?:async )?function ${name}\\(`, 'm');
  const match = marker.exec(source);
  assert.ok(match, `${name} must remain a top-level function in newtab.js`);
  const end = source.indexOf('\n}\n', match.index);
  assert.ok(end > match.index, `${name} must end with a closing brace at column 0`);
  return source.slice(match.index, end + 2);
}
const constLine = name => {
  const match = source.match(new RegExp(`^const ${name} = .*$`, 'm'));
  assert.ok(match, `${name} must remain a one-line const`);
  return match[0];
};

const SLICES = [
  'calSetAnchor', 'calSelectedDay', 'calMonthGridStart', 'calWeekStart', 'calDayIndex', 'calInMonthGrid',
  'calSelectDay', 'shiftCalendar', 'calendarToday', 'calEmptyKey', 'calEntryKey', 'calMoveTime',
  'calRescheduleTo', 'calendarMoveOptions', 'calendarDotMenuItems', 'calendarMoveMenuItems', 'calMovedReceipt',
  'calMoveEntry', 'calendarFocusAfterMove', 'calWhenLabel', 'calPeriodLabel', 'isCalendarTaskMutationPending',
  'paintCalendarTaskDialog', 'setCalendarTaskBusy', 'setCalendarTaskError', 'closeCalendarTaskDialog',
  'focusCalendarTaskMutationTarget', 'calendarAddInline', 'paintCalendarAddInline',
];

function element(id, extra = {}) {
  return Object.assign({
    id,
    value: '',
    disabled: false,
    hidden: false,
    textContent: '',
    dataset: {},
    attrs: {},
    focused: 0,
    classList: { contains: () => false, add() {}, remove() {}, toggle() {} },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    getAttribute(name) { return this.attrs[name] ?? null; },
    focus() { this.focused += 1; calls.focus.push(this.id); context.document.activeElement = this; },
  }, extra);
}

let calls;
let context;
function sandbox({ now, elements = {} } = {}) {
  calls = { renders: 0, focusDay: [], toasts: [], setReminder: [], entity: [], bump: [], land: [], prepared: [], dropped: [], commits: [], focus: [], moves: [], dialog: [] };
  const fixed = now ?? new Date(2026, 10, 11, 10, 0).getTime();
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [fixed])); }
    static now() { return fixed; }
  }
  const store = new Map();
  const byId = Object.assign({
    'calendar-task-overlay': element('calendar-task-overlay', { classList: { contains: name => name === 'hidden', add() {}, remove() {} } }),
    'calendar-task-confirm': element('calendar-task-confirm'),
    'calendar-task-input': element('calendar-task-input'),
    'calendar-task-status': element('calendar-task-status'),
    'calendar-task-close': element('calendar-task-close'),
    'calendar-task-cancel': element('calendar-task-cancel'),
    'calendar-task-description': element('calendar-task-description'),
  }, elements);
  context = vm.createContext({
    console, Math, JSON, Map, Set, Number, String, Object, Array, Promise, Error, CSS: { escape: value => String(value) },
    Date: FixedDate,
    localStorage: { getItem: key => (store.has(key) ? store.get(key) : null), setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key) },
    document: {
      activeElement: null,
      getElementById: id => byId[id] || null,
      querySelector: selector => byId[`q:${selector}`] || null,
    },
    appLocale: () => 'en',
    tr: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
    reminderItemTitle: item => item.title || item.text || '',
    State: { latestActionId: () => 'action-7', get: () => ({ settings: {} }) },
    renderBoard() { calls.renders += 1; },
    calFocusDay(day) { calls.focusDay.push(day); return true; },
    toast(message, options = {}) { calls.toasts.push({ message, options: plain(options) }); },
    setReminder(id, at, opts) { calls.setReminder.push({ id, at, opts: plain({ recur: opts.recur, receipt: opts.receipt }) }); return Promise.resolve(context.__writeOk !== false); },
    commitEntityReminderMutation(ctx, changes, opts) { calls.entity.push({ ctx: plain(ctx), changes: plain(changes), opts: plain(opts) }); return Promise.resolve(true); },
    createEntityReminderMutationContext: (kind, id, reminderId) => (context.__entityOk === false ? null : { kind, entityId: id, reminderId }),
    isReminderMutationPending: () => context.__pending === true,
    openReminderTarget() {},
    openReminderPicker() {},
    clearReminder(id) { calls.moves.push(['clear', id]); return true; },
    openEntityReminderPickerOrReport() {},
    calLand(entry, at, from) { calls.land.push({ id: entry.refId, at, from: plain(from) }); },
    calPrepareFocusAfter(source) { calls.prepared.push(source?.id || null); },
    calMarkDropped(id) { calls.dropped.push(id); },
    activeWs: () => context.__ws,
    createCalendarTaskMutationContext: day => (context.__ctx === null ? null : { dayStart: day, at: day + 9 * 3600000, spaceName: 'Work', inboxName: 'Inbox', dateLabel: 'D', timeLabel: '9:00 AM' }),
    commitCalendarTaskMutation(ctx, text) { calls.commits.push({ inline: ctx.inline === true, text, same: ctx === context.calendarTaskCtxRef() }); return Promise.resolve(true); },
    restoreOpener: () => false,
    unlockBodyScroll() {},
    setCalendarTaskInterlock() {},
    focusCalendarTaskFallback() {},
    focusIdentityTarget: () => false,
    _overlayOpeners: new Map(),
  });
  vm.runInContext(`const PLAN_VIEWS = ['upcoming', 'sort'];\n${planSource}`, context, { filename: 'plan.js' });
  const program = [
    "const CAL_VIEWS = ['month', 'week', 'agenda'];",
    'let activeCalendar = null;',
    'let calendarPageSession = null;',
    'let calendarTaskCtx = null;',
    'let calendarTaskBusy = false;',
    'let calendarTaskMutationPending = null;',
    'globalThis.calendarTaskCtxRef = () => calendarTaskCtx;',
    constLine('_tlStartOfDay'),
    constLine('_tlStartOfWeek'),
    constLine('_tlStartOfMonth'),
    ...SLICES.map(extractFunction),
    'globalThis.__cal = { get activeCalendar() { return activeCalendar; }, set activeCalendar(v) { activeCalendar = v; },',
    '  get session() { return calendarPageSession; }, set session(v) { calendarPageSession = v; },',
    '  get taskCtx() { return calendarTaskCtx; }, set taskCtx(v) { calendarTaskCtx = v; },',
    '  get busy() { return calendarTaskBusy; }, set busy(v) { calendarTaskBusy = v; },',
    '  set pending(v) { calendarTaskMutationPending = v; } };',
  ].join('\n');
  vm.runInContext(program, context, { filename: 'calendar-page-production-extract.js' });
  context.__fixed = fixed;
  return context;
}
const local = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0).getTime();

// ── Date rules, run in each time zone ─────────────────────────────
function dateRules(zone) {
  const c = sandbox({ now: local(2026, 11, 11, 10, 0) });
  const NOW = c.__fixed;
  const entry = (at, extra = {}) => Object.assign({ source: 'item', refId: 'i1', at, title: 'Task' }, extra);
  eq(c.calMoveTime(entry(local(2026, 11, 9, 17, 0)), local(2026, 11, 11), NOW), local(2026, 11, 11, 17, 0), `${zone}: a later time today keeps its time of day`);
  eq(c.calMoveTime(entry(local(2026, 11, 9, 9, 0)), local(2026, 11, 11), NOW), local(2026, 11, 11, 11, 0), `${zone}: a passed time today becomes the next whole hour`);
  eq(c.calMoveTime(entry(local(2026, 11, 9, 9, 0)), local(2026, 11, 10), NOW), null, `${zone}: a past day has no valid time`);
  const late = local(2026, 11, 11, 23, 20);
  eq(c.calMoveTime(entry(local(2026, 11, 9, 8, 0)), local(2026, 11, 11), late), null, `${zone}: after 23:00 Today has no whole hour left`);
  // Across the autumn change (New York 1 Nov, Berlin 25 Oct 2026), 09:00 stays 09:00.
  const before = local(2026, 10, 20, 10, 0);
  const moved = c.calMoveTime(entry(local(2026, 10, 21, 9, 0)), local(2026, 11, 3), before);
  eq([new Date(moved).getHours(), new Date(moved).getMinutes(), new Date(moved).getDate()], [9, 0, 3], `${zone}: the time of day survives a DST change`);
  // Onto the change day itself, where midnight + 9 hours is not 09:00.
  for (const [m, d] of [[11, 1], [10, 25]]) {
    const onChange = c.calMoveTime(entry(local(2026, 10, 21, 9, 0)), local(2026, m, d), before);
    eq([new Date(onChange).getHours(), new Date(onChange).getMinutes(), new Date(onChange).getDate()], [9, 0, d], `${zone}: the time of day survives a DST change on the change day (${m}/${d})`);
  }

  // Move to: at most four days, never the reminder's own day, each with its time.
  const wednesday = c.calendarMoveOptions(entry(local(2026, 11, 11, 16, 0)), NOW);
  eq(wednesday.map(o => o.key), ['tomorrow', 'day', 'weekend', 'nextWeek'], `${zone}: from today the menu offers Tomorrow, the day after, the weekend and next week`);
  eq(wednesday[1].label, 'Friday', `${zone}: the day after tomorrow is named by its weekday`);
  eq(wednesday.map(o => new Date(o.at).getHours()), [16, 16, 16, 16], `${zone}: every option keeps the time of day`);
  eq(wednesday.map(o => o.day), [local(2026, 11, 12), local(2026, 11, 13), local(2026, 11, 14), local(2026, 11, 16)], `${zone}: the days are local midnights`);
  eq(c.calendarMoveOptions(entry(local(2026, 11, 13, 9, 0)), NOW).map(o => o.key), ['today', 'tomorrow', 'weekend', 'nextWeek'], `${zone}: a Friday reminder can come to Today`);
  const thursday = c.calendarMoveOptions(entry(local(2026, 11, 20, 9, 0)), local(2026, 11, 12, 10, 0));
  eq(thursday.map(o => o.key), ['today', 'tomorrow', 'weekend', 'nextWeek'], `${zone}: on Thursday the day after tomorrow is the weekend, offered once`);
  const saturday = c.calendarMoveOptions(entry(local(2026, 11, 20, 9, 0)), local(2026, 11, 14, 10, 0));
  eq(saturday.map(o => o.key), ['today', 'tomorrow', 'nextWeek'], `${zone}: on Saturday there is no weekday or weekend option`);
  const sunday = c.calendarMoveOptions(entry(local(2026, 11, 20, 9, 0)), local(2026, 11, 15, 10, 0));
  eq(sunday.map(o => o.key), ['today', 'tomorrow'], `${zone}: on Sunday Next week is tomorrow, offered once`);

  // The month grid: 42 local midnights from the Monday before the 1st.
  c.__cal.activeCalendar = { view: 'month', anchor: local(2026, 11, 20, 12) };
  let day = c.calMonthGridStart();
  eq([new Date(day).getDay(), new Date(day).getDate(), new Date(day).getMonth()], [1, 26, 9], `${zone}: November 2026 starts on Monday 26 October`);
  const days = [];
  for (let i = 0; i < 42; i += 1) { days.push(day); day = c.planAddDays(day, 1); }
  ok(days.every(ts => new Date(ts).getHours() === 0 && new Date(ts).getMinutes() === 0), `${zone}: every grid day is a local midnight`);
  ok(days.every((ts, i) => i === 0 || (new Date(ts).getDate() === new Date(days[i - 1]).getDate() + 1 || new Date(ts).getDate() === 1)), `${zone}: grid days are consecutive across the DST change`);
  eq(c.calDayIndex(days[0], local(2026, 11, 2), 42), 7, `${zone}: a day's grid index`);
  eq(c.calDayIndex(days[0], local(2026, 12, 7), 42), -1, `${zone}: a day past the grid has no index`);
  eq(c.planAddDays(local(2026, 10, 31), 1), local(2026, 11, 1), `${zone}: an arrow step lands on the next local midnight`);
  eq(c.planAddDays(local(2026, 10, 25), -1), local(2026, 10, 24), `${zone}: and back across Berlin's change`);
  return checks;
}

if (process.argv[2] === '--zone') {
  const zone = process.argv[3];
  assert.equal(Intl.DateTimeFormat().resolvedOptions().timeZone, zone);
  console.log(JSON.stringify({ zone, checks: dateRules(zone) }));
  process.exit(0);
}

function testZones() {
  for (const zone of ['America/New_York', 'Europe/Berlin', 'Asia/Taipei']) {
    const child = spawnSync(process.execPath, [__filename, '--zone', zone], { encoding: 'utf8', env: { ...process.env, TZ: zone } });
    assert.equal(child.status, 0, `${zone} date rules failed:\n${child.stderr || child.stdout}`);
    const result = JSON.parse(child.stdout.trim().split(/\r?\n/).at(-1));
    checks += result.checks;
  }
}

// ── The selected day, the anchor and paging ───────────────────────
function testSelection() {
  const c = sandbox({ now: local(2026, 11, 11, 10, 0) });
  const cal = c.__cal;
  cal.activeCalendar = { view: 'month', anchor: c.__fixed };
  eq(c.calSelectedDay(), local(2026, 11, 11), 'the view opens on today');
  c.calSelectDay(local(2026, 11, 20, 15), { focus: true });
  eq([cal.activeCalendar.selected, calls.renders, calls.focusDay], [local(2026, 11, 20), 1, [local(2026, 11, 20)]], 'selecting a day stores its midnight, repaints and focuses it');
  eq(cal.activeCalendar.anchor, c.__fixed, 'a day inside the month grid does not page');
  c.calSelectDay(local(2026, 12, 9));
  eq(new Date(cal.activeCalendar.anchor).getMonth(), 11, 'a day outside the grid pages the month to it');
  c.calSelectDay(local(2026, 11, 30));
  eq(new Date(cal.activeCalendar.anchor).getMonth(), 11, 'a December-grid day (30 Nov) does not page back');
  c.shiftCalendar(-1);
  eq([new Date(cal.activeCalendar.anchor).getMonth(), c.calSelectedDay()], [10, local(2026, 11, 30)], 'Previous month pages the grid and keeps the selected day');
  cal.activeCalendar.anchor = local(2026, 11, 24, 9, 30);
  eq(c.calSelectedDay(), local(2026, 11, 24), 'when something else moves the anchor (Plan with AI), the selection follows it');
  cal.activeCalendar.view = 'week';
  c.calSelectDay(local(2026, 11, 26));
  eq(cal.activeCalendar.anchor, local(2026, 11, 26), 'in Week the anchor is the selected day');
  c.shiftCalendar(1);
  eq([cal.activeCalendar.selected, c.calWeekStart()], [local(2026, 12, 3), local(2026, 11, 30)], 'Next week moves the selection by a week');
  c.calendarToday();
  eq([cal.activeCalendar.selected, cal.activeCalendar.anchor], [local(2026, 11, 11), local(2026, 11, 11)], 'Today selects today and shows its period');
  eq(c.calPeriodLabel(), 'Nov 9 – 15', 'the week label follows the selected day');
  cal.activeCalendar.view = 'agenda';
  eq(c.calPeriodLabel(), 'cal.upcoming', 'Agenda keeps its Upcoming label');
  eq([c.calEmptyKey(0, 0), c.calEmptyKey(3, 0), c.calEmptyKey(3, 1)], ['cal.noWorkspaceReminders', 'cal.noFilterMatches', null], 'one authoritative empty message');
  eq(c.calEntryKey({ source: 'group', refId: 'g', reminderId: 'r' }), 'group:g:r', 'reminder keys carry the stable reminder id');
  eq(c.calWhenLabel(local(2026, 11, 11, 9, 5), c.__fixed), 'cal.today 09:05', 'Past due today reads Today and a 24-hour time');
  ok(/^\S+ 17:00$/.test(c.calWhenLabel(local(2026, 11, 9, 17), c.__fixed)), 'Past due this week reads the weekday and time');
}

// ── Move to and its transactions ──────────────────────────────────
async function testMove() {
  const c = sandbox({ now: local(2026, 11, 11, 10, 0) });
  const item = { source: 'item', refId: 'item-1', at: local(2026, 11, 12, 16, 0), title: 'Read', recur: { every: 'week', interval: 1 } };
  const opener = { id: 'mv' };
  const menu = c.calendarMoveMenuItems(item, opener);
  eq(menu.map(entry => (entry.sep ? '—' : entry.text)), ['cal.today', 'Friday', 'plan.move.weekend', 'plan.move.nextWeek', '—', 'reminder.editTitle…', 'detail.clearReminder'], 'Move to lists days (not the reminder\'s own), then Edit reminder… and Clear');
  eq(menu[0].sub, '16:00', 'each day shows its time');
  eq(c.calendarMoveMenuItems(item, opener, { withOpen: true }).slice(0, 2).map(entry => entry.sep ? '—' : entry.text), ['selection.open', '—'], 'right-click and Shift+F10 add Open first');
  menu[6].action();
  eq([calls.prepared, calls.moves], [['mv'], [['clear', 'item-1']]], 'Clear goes through clearReminder and plans the focus after');

  const okMove = await c.calMoveEntry(item, local(2026, 11, 13), opener);
  ok(okMove === true, 'a move resolves true');
  eq(calls.setReminder[0], { id: 'item-1', at: local(2026, 11, 13, 16, 0), opts: { recur: { every: 'week', interval: 1 }, receipt: { message: `cal.movedTo:${JSON.stringify({ date: new Date(local(2026, 11, 13, 16)).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }), time: '16:00' })}`, options: { tone: 'warning', glyph: 'clock', sub: 'Read' } } } }, 'an item moves through setReminder with its repeat and the Moved to receipt');
  ok((JSON.parse(c.localStorage.getItem('locus.plan.moves') || '{}')['item-1'] || 0) === 1, 'Plan counts the move for its "moved N times" mark');
  eq(calls.land.map(entry => [entry.id, entry.at]), [['item-1', local(2026, 11, 13, 16, 0)]], 'the card lands on its new day after the write');

  calls.setReminder.length = 0;
  c.__writeOk = false;
  c.__cal.session = { afterMove: ['x'] };
  const refused = await c.calMoveEntry(item, local(2026, 11, 14), opener);
  eq([calls.land.length, c.__cal.session.afterMove], [1, null], 'a refused move neither lands nor keeps a focus plan');
  ok(refused === false, 'a refused write reports false');
  c.__writeOk = true;
  c.__pending = true;
  ok(await c.calMoveEntry(item, local(2026, 11, 14), opener) === false && calls.setReminder.length === 1, 'nothing moves while another reminder write is pending');
  c.__pending = false;
  ok(await c.calMoveEntry(item, local(2026, 11, 9), opener) === false && calls.toasts.at(-1).message === 'reminder.futureTime', 'a past day is refused with the future-time message');
  ok(await c.calMoveEntry(item, local(2026, 11, 12), opener) === true && calls.setReminder.length === 1, 'the same day writes nothing');

  const group = { source: 'group', refId: 'g1', reminderId: 'r1', at: local(2026, 11, 12, 9, 0), title: 'Launch' };
  const groupMenu = c.calendarMoveMenuItems(group, opener);
  eq(groupMenu.at(-1).text, 'reminder.removeNamed:{"name":"Launch"}', 'a Group reminder keeps its reviewed Remove');
  await groupMenu[0].action();
  eq(calls.entity.length, 1, 'a Group reminder moves through the frozen entity context (one write)');
  eq(calls.entity[0], { ctx: { kind: 'group', entityId: 'g1', reminderId: 'r1' }, changes: { at: local(2026, 11, 11, 11, 0) }, opts: { receipt: calls.entity[0].opts.receipt } }, 'a Group reminder moves through the frozen entity context');
  ok(/^cal\.movedTo/.test(calls.entity[0].opts.receipt.message), 'with the Moved to receipt');
  c.__entityOk = false;
  const stale = c.calendarMoveMenuItems(group, opener);
  eq(stale.map(entry => entry.text), ['reminder.editTitle…', 'reminder.removeNamed:{"name":"Launch"}'], 'a reminder that changed offers no day, only the reviewed picker');

  const els = { 'q:a': { id: 'a' }, 'q:b': { id: 'b' } };
  const d = sandbox({ elements: els });
  d.__cal.session = { afterMove: ['missing', 'b', 'a'] };
  eq([d.calendarFocusAfterMove()?.id, d.__cal.session.afterMove], ['b', null], 'focus after a move takes the first neighbour still there, once');
  eq(d.calendarFocusAfterMove(), null, 'and nothing afterwards');
}

// ── Quick add through the Add-task transaction ────────────────────
async function testQuickAdd() {
  const input = element('cal-add-input');
  const status = element('cal-add-status');
  const form = element('cal-add-form');
  const c = sandbox({ elements: { 'cal-add-input': input, 'cal-add-status': status, 'cal-add-form': form } });
  c.__ws = { categories: [{ id: 's' }] };
  ok(await c.calendarAddInline(local(2026, 11, 12), '   ') === false && calls.commits.length === 0, 'an empty field adds nothing');
  ok(await c.calendarAddInline(local(2026, 11, 12), ' Pack ') === true, 'Enter adds');
  eq(calls.commits, [{ inline: true, text: 'Pack', same: true }], 'quick add runs commitCalendarTaskMutation with an inline context');
  c.__cal.busy = true;
  c.paintCalendarAddInline();
  eq([input.disabled, status.textContent, status.hidden, form.attrs['aria-busy']], [true, 'cal.adding', false, 'true'], 'while the receipt is pending the field is busy');
  ok(c.closeCalendarTaskDialog({ restoreFocus: false }) === false, 'a pending quick add cannot be closed');
  c.__cal.busy = false;
  c.__cal.taskCtx.errorKey = 'cal.destinationChanged';
  c.paintCalendarAddInline();
  eq([status.textContent, status.dataset.tone], ['cal.addFailed', 'error'], 'dialog-only wording becomes the quick add failure');
  c.__cal.taskCtx.errorKey = 'cal.saveFailed';
  c.paintCalendarAddInline();
  eq(status.textContent, 'cal.saveFailed', 'a failed save says so');
  c.setCalendarTaskError('cal.saveFailed', { unavailable: true });
  eq(calls.focus.at(-1), 'cal-add-input', 'an error returns focus to the add field');
  ok(c.closeCalendarTaskDialog({ restoreFocus: false }) === true && c.__cal.taskCtx === null && status.textContent === '', 'an accepted quick add closes its context without touching the dialog');
  c.__cal.taskCtx = { inline: true };
  c.__cal.activeCalendar = { view: 'month', anchor: 0 };
  ok(c.focusCalendarTaskMutationTarget({ inline: true }, 'new-item', 'inbox') === true, 'after the receipt focus stays in the add field');
  eq([calls.dropped, calls.focus.at(-1)], [['new-item'], 'cal-add-input'], 'and the new row drops in');
  c.__pending = true;
  c.__cal.pending = { kind: 'calendar' };
  ok(await c.calendarAddInline(local(2026, 11, 12), 'Again') === false && calls.commits.length === 1, 'nothing starts while one is pending');
  c.__cal.pending = null;
  c.__ctx = null;
  ok(await c.calendarAddInline(local(2026, 11, 12), 'Pack') === false && calls.toasts.at(-1).message === 'cal.addFailed', 'an ambiguous Inbox fails closed with a toast');
  c.__ws = { categories: [] };
  ok(await c.calendarAddInline(local(2026, 11, 12), 'Pack') === false && calls.toasts.at(-1).message === 'cal.needSpace', 'no Space: asks for one');

  const dialog = sandbox();
  dialog.__cal.taskCtx = { inline: false };
  dialog.setCalendarTaskBusy(true);
  eq(calls.focus, ['calendar-task-confirm'], 'the dialog still moves focus to its confirm button while pending');
}

// ── Source contracts ───────────────────────────────────────────────
function testSource() {
  const render = extractFunction('renderCalendar');
  ok(/if \(PLAN_VIEWS\.includes\(activeCalendar\.view\)\) \{\n\s*if \(typeof renderPlanSurface === 'function'\) return renderPlanSurface\(ws\);/.test(render), 'Plan views still render Plan');
  ok(/hideBreadcrumb\(\);/.test(render) && !/renderCalendarBreadcrumb/.test(source), 'no breadcrumb bar, as on the other Plan views');
  ok(/wrap\.appendChild\(buildPlanHeader\(ws, 'calendar'\)\)/.test(render), 'the Plan header (Upcoming, Sort inbox, Calendar, Plan with AI) stays on top');
  ok(/const scrollTop = \$b\.classList\.contains\('calendar-mode'\) \? \$b\.scrollTop : 0;[\s\S]*\$b\.scrollTo\(\{ top: scrollTop, behavior: 'instant' \}\)/.test(render), 'a repaint keeps the scroll position');
  ok(/buildCalPanel\(shown, selected, now/.test(render) && /buildCalPastDue\(shown, now, !session\.view\)/.test(render), 'Past due and the day panel follow the filter');
  ok(/if \(calendarPageSession && !\(activeCalendar && CAL_VIEWS\.includes\(activeCalendar\.view\)\)\) calendarPageSession = null;/.test(extractFunction('renderBoard')), 'leaving the Calendar view ends its session');

  const toolbar = extractFunction('buildCalToolbar');
  ok(/thumb\.style\.setProperty\('--i', String\(from\)\);\n\s*if \(from !== index\) after\.push\(\(\) => \{ void thumb\.offsetWidth; thumb\.style\.setProperty\('--i', String\(index\)\); \}\);/.test(toolbar), 'the view thumb slides from the view shown last (class restart, no timer)');
  ok(/nav\.setAttribute\('aria-label', tr\('cal\.periodNavigation'\)\)/.test(toolbar) && /tr\('cal\.previousPeriod'\)/.test(toolbar) && /tr\('cal\.nextPeriod'\)/.test(toolbar), 'paging keeps its localized names');
  ok(/title\.setAttribute\('aria-live', 'polite'\)/.test(toolbar), 'the period is announced when it changes');
  ok(/clear\.setAttribute\('aria-label', tr\('rail\.clearFilter'\)\)/.test(toolbar), 'the filter has a named Clear');

  const month = extractFunction('buildCalMonth');
  ok(/for \(let i = 0; i < 42; i\+\+\)/.test(month) && /day = planAddDays\(day, 1\);/.test(month), 'the month walks 42 days with DST-safe steps');
  ok(/cell\.type = 'button';/.test(month) && /cell\.setAttribute\('aria-pressed', String\(day === selected\)\)/.test(month) && /cell\.setAttribute\('aria-label', calendarDayAriaLabel\(day, list\.length\)\)/.test(month), 'days are buttons with a pressed state and the day label');
  ok(/grid\.children\[focusIndex\]\.tabIndex = 0;/.test(month) && /grid\.addEventListener\('keydown', calGridKey\)/.test(month), 'the grid is one tab stop with arrow keys');
  ok(/list\.slice\(0, 2\)[\s\S]*tr\('cal\.more', \{ count: list\.length - 2 \}\)/.test(month), 'two chips then "+N more", as on the board');
  const keys = extractFunction('calGridKey');
  ok(/ArrowLeft: -1, ArrowRight: 1, ArrowUp: month \? -7 : -1, ArrowDown: month \? 7 : 1/.test(keys) && /'Home'/.test(keys) && /'End'/.test(keys), 'arrows, Home and End move the selected day');
  ok(/event\.key === 'Enter'[\s\S]*getElementById\('cal-add-input'\)\?\.focus\(\)/.test(keys), 'Enter goes to the add field');
  const bindDay = extractFunction('calBindDay');
  ok(/'contextmenu'[\s\S]*openCalDay\(day, list, event\.clientX, event\.clientY/.test(bindDay) && /event\.key === 'ContextMenu' \|\| \(event\.shiftKey && event\.key === 'F10'\)/.test(bindDay) && /calMakeDropTarget\(el, day\)/.test(bindDay), 'a day keeps its menu (reviewed Add task) and stays a drop target');
  ok(/openCalendarTaskDialog\(dayStart, opener\)/.test(extractFunction('openCalDay')), 'the day menu still opens the reviewed dialog');
  ok(/isCalendarTaskMutationPending\(\)\) return false;/.test(extractFunction('openCalendarTaskDialog')), 'the dialog does not open over a pending quick add');

  const dot = extractFunction('buildCalDot');
  ok(/dot\.dataset\.reminderSource = entry\.source;[\s\S]*dot\.dataset\.reminderOwnerId = entry\.refId;[\s\S]*dot\.dataset\.reminderId = entry\.reminderId;/.test(dot), 'reminder controls keep the focus target every write returns to');
  ok(/bindAnchoredContextMenu\(dot, \(\) => calendarMoveMenuItems\(entry, dot, \{ withOpen: true \}\)\)/.test(dot) && /calBindDrag\(dot, entry\)/.test(dot), 'right-click opens Move, and the control drags');
  const number = extractFunction('calDayNumber');
  ok(/if \(elapsed < 1400\) \{\n\s*num\.classList\.add\('is-pulse'\);\n\s*num\.style\.setProperty\('--cld-pulse-t', `\$\{-elapsed\}ms`\);/.test(number), 'today pulses only while the view opens; a repaint carries it on');
  const land = extractFunction('calLand');
  ok(/if \(!from \|\| planReducedMotion\(\)\) \{\n\s*calReplay\(target, 'is-landed'\);/.test(land), 'without motion or a start point only the landing shows');
  ok(/ghost\.className = 'cld-ghost';[\s\S]*target\.classList\.add\('is-arriving'\);[\s\S]*ghost\.addEventListener\('animationend', land, \{ once: true \}\);[\s\S]*setTimeout\(land, 900\);/.test(land), 'a ghost travels, the card waits, then lands; a hidden tab cannot strand it');
  ok(/el\.classList\.remove\(className\);\n\s*void el\.offsetWidth;\n\s*el\.classList\.add\(className\);/.test(extractFunction('calReplay')), 'animations restart the way Today does');
  const panel = extractFunction('buildCalPanel');
  ok(/inner\.classList\.add\(selected > session\.sel \? 'is-next' : 'is-prev'\)/.test(panel), 'the panel slides in from the side of the new day');
  ok(/spaceCountRoll\(session, countKey, list\.length\)/.test(panel) && /spaceRollMarkup\(list\.length, roll\.previous, roll\.delay\)/.test(panel), 'the day count rolls');
  ok(/aria-describedby="cal-add-review cal-add-status"/.test(panel) && /tr\('cal\.addDescription', \{ space: review\.spaceName, group: review\.inboxName, date: review\.dateLabel, time: review\.timeLabel \}\)/.test(panel), 'the add field describes its destination, date and time');
  ok(/tr\('cal\.now', \{ time: planTimeLabel\(now\) \}\)/.test(panel), 'today shows the now line');

  // Receipts: the same transactions, an optional wording.
  const itemCommit = extractFunction('commitItemReminderMutation');
  ok(/if \(alarmsReconciled && nextReminder && opts\.receipt\?\.message\) \{\n\s*toast\(opts\.receipt\.message, \{ \.\.\.opts\.receipt\.options, undo: actionId \}\);\n\s*\} else if \(alarmsReconciled\) \{\n\s*toast\(tr\(nextReminder \? 'reminder\.setSuccess' : 'reminder\.clearSuccess'\), \{ undo: actionId \}\);/.test(itemCommit), 'an item move words its receipt; everything else is unchanged');
  ok(/if \(writeReceipt\?\.reminderReconciliation\?\.ok === true && opts\.receipt\?\.message\) \{\n\s*toast\(opts\.receipt\.message, \{ \.\.\.opts\.receipt\.options, undo: actionId \}\);/.test(extractFunction('commitEntityReminderMutation')), 'an entity move words its receipt the same way');
  ok(/commitItemReminderMutation\(context, \{ at: ts, recur: opts\.recur \}, \{ receipt: opts\.receipt \}\)/.test(extractFunction('setReminder')), 'setReminder passes the receipt on');
  ok(/typeof calendarFocusAfterMove === 'function' && focusTarget\(calendarFocusAfterMove\(\)\)\) return true;\n\s*if \(focusTarget\(document\.getElementById\('cal-filter-input'\)\)\) return true;/.test(extractFunction('focusItemReminderTarget')), 'after a move focus goes to the neighbour before the filter');
  ok(/\.cal-dot\[data-reminder-source="\$\{escapeValue\(context\.kind\)\}"\][\s\S]*calendarFocusAfterMove\(\)\)\) return true;\n\s*return focusEntityReminderOwnerFallback/.test(extractFunction('focusEntityReminderMutationTarget')), 'the same for Group and Space reminders, after their exact dot');
  ok(/sub: `\$\{context\.spaceName\} › \$\{context\.inboxName\} · \$\{context\.timeLabel\}`/.test(extractFunction('commitCalendarTaskMutation')), 'the Add task receipt names the Inbox it went to');

  // CSS: the board's look and its rules.
  const start = css.indexOf('   CALENDAR (2026-11 canvas)');
  ok(start > 0, 'the Calendar layer exists');
  // The layer ends where the next canvas layer's header begins.
  const end = css.indexOf('/* ----', start);
  const layer = css.slice(start, end > start ? end : undefined);
  ok(/\.cld-ghost \{/.test(layer) && !/FIND AGAIN/.test(layer), 'the Calendar layer is read on its own');
  const used = new Set([...layer.matchAll(/\.(cld-[a-z0-9-]+)/g)].map(match => match[1]));
  const missing = [...used].filter(name => !new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(source));
  eq(missing, [], 'every .cld- class in the layer is built by newtab.js');
  ok(!/\.cld[\w-]*[^{]*\{[^}]*gradient\(/.test(layer), 'no gradients');
  ok(!/infinite/.test(layer), 'nothing loops');
  ok(/\.cld-num\.is-pulse \{ animation: cld-today-pop \.5s var\(--today-spring\) calc\(\.2s \+ var\(--cld-pulse-t, 0ms\)\) 1 both; \}/.test(layer), 'the today pop plays once');
  ok(/animation: cld-today-ping \.9s var\(--today-ease\) calc\(\.35s \+ var\(--cld-pulse-t, 0ms\)\) 1 both;/.test(layer), 'and its ring once');
  ok(/\.cld-sel \{[^}]*transform: translate\(calc\(var\(--c, 0\) \* 100%\), calc\(var\(--r, 0\) \* 100%\)\);[^}]*transition: transform \.3s var\(--today-ease\)/.test(layer), 'the selection box slides');
  ok(/@keyframes cld-fly \{/.test(layer) && /\.cld-ghost \{[^}]*position: fixed;[^}]*pointer-events: none;[^}]*animation: cld-fly \.5s/.test(layer), 'the moved card travels as a fixed ghost');
  ok(/\.cld-btn,\n\.cld-ibtn \{\n\s*height: 44px;/.test(layer) && /\.cld-mv \{[^}]*width: 44px;\n\s*height: 44px;/.test(layer) && /\.cld-seg-btn::before \{ content: ''; position: absolute; inset: -3px 0; \}/.test(layer) && /\.cld-filter-clear::before \{ content: ''; position: absolute; inset: -6px; \}/.test(layer) && /\.cld-due-chip \.cld-mv::before \{ content: ''; position: absolute; inset: -2px; \}/.test(layer), 'controls are 44 px targets');
  ok(/\.cld-rtitle::before \{ content: ''; position: absolute; inset: 0;/.test(layer), 'a row title covers its row');
  ok(/@container \(max-width: 640px\) \{[\s\S]*\.cld-chip,\n\s*\.cld-more \{ display: none; \}[\s\S]*\.cld-dots \{ display: flex;[\s\S]*\.cld-wk \{ grid-template-columns: minmax\(0, 1fr\);[\s\S]*grid-template-areas: "title title mv" "time meta mv";/.test(layer), 'phone: dots in the month, stacked week, titles across the row');
  ok(/@container \(max-width: 340px\) \{\n\s*\.cld-month \{ margin-inline: -24px;/.test(layer), 'phone: the month runs edge to edge so days stay 44 px wide');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n\s*\.cld, \.cld \*, \.cld \*::before, \.cld \*::after,\n\s*\.cld-ghost \{ animation: none !important; transition: none !important; \}/.test(layer), 'reduced motion stops every Calendar animation');
  ok(/@media \(forced-colors: active\)/.test(layer), 'forced colours are handled');
  ok((layer.match(/var\(--today-badge\)/g) || []).length === 1 && /\.cld-due-n \{[^}]*background: var\(--today-badge\);/.test(layer), 'red is only the overdue count bubble');
  ok(!/\.cal-(?:cell|grid|toolbar|pastdue|week-col|ag-|more|anim|today-btn|nav-btn)\b/.test(css), 'the old calendar styles are gone');
  ok(/class="cal-seg planner-seg"/.test(html) && /\.cal-seg-btn\.active \{/.test(css), 'the Plan with AI horizon switch keeps its .cal-seg styles');

  // Locales: new strings in both, same placeholders; removed strings gone.
  const i18nStart = source.indexOf('const I18N = ');
  const trStart = source.indexOf('\nfunction tr(', i18nStart);
  const i18n = vm.runInNewContext(`(${source.slice(i18nStart + 'const I18N = '.length, source.lastIndexOf('};', trStart) + 1)})`);
  const vars = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const key of ['cal.addPlaceholder', 'cal.addOn', 'cal.addFailed', 'cal.movedTo', 'cal.now']) {
    ok(typeof i18n.en[key] === 'string' && i18n.en[key] && typeof i18n['zh-TW'][key] === 'string' && i18n['zh-TW'][key], `${key} exists in en and zh-TW`);
    eq(vars(i18n['zh-TW'][key]), vars(i18n.en[key]), `${key} keeps its placeholders`);
    ok(source.includes(`'${key}'`) && source.split(`'${key}'`).length > 3, `${key} is used`);
  }
  ok(!/日历|添加|任务|视图/.test(['cal.addPlaceholder', 'cal.addOn', 'cal.addFailed', 'cal.movedTo', 'cal.now'].map(key => i18n['zh-TW'][key]).join('')), 'zh-TW copy uses Taiwan terms');
  for (const key of ['cal.breadcrumb', 'cal.back', 'cal.backToBoard']) ok(!source.includes(`'${key}'`), `${key} is removed with the breadcrumb`);
  ok((ci.match(/calendar-page-contract-test\.js/g) || []).length === 2, 'CI syntax-checks and runs this suite');
}

(async () => {
  testZones();
  testSelection();
  await testMove();
  await testQuickAdd();
  testSource();
  console.log(`Calendar page contracts passed: ${checks} checks (date rules in 3 zones, selection and paging, Move to with receipts and Undo-ready transactions, quick add, focus after a move, keys, pulse, travelling card, phone layout, CSS, locales)`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
