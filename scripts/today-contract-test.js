'use strict';

// Today board (2026-11 canvas) contracts: the derived task model, the capture
// parser, the receipt-gated transactions it reuses, the open-tabs edge tab,
// locale parity, motion, and the unchanged permission/CSP boundary.
process.env.TZ = 'Europe/London';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const LocusPlan = require('../plan-contract.js');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const source = read('newtab.js');
const html = read('newtab.html');
const css = read('newtab.css');
const themes = read('themes.css');
const fonts = read('media/fonts/fonts.css');
const manifest = JSON.parse(read('manifest.json'));
let checks = 0;
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };
const match = (value, pattern, message) => { checks += 1; assert.match(value, pattern, message); };
const noMatch = (value, pattern, message) => { checks += 1; assert.doesNotMatch(value, pattern, message); };

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} must remain extractable from newtab.js`);
  const declarationStart = source.slice(Math.max(0, start - 6), start) === 'async ' ? start - 6 : start;
  // Skip the whole parameter list first: defaults such as `= {}` contain braces.
  const parameterOpen = source.indexOf('(', start + `function ${name}`.length);
  let parameterDepth = 0;
  let parameterClose = -1;
  let quote = '';
  let escaped = false;
  for (let index = parameterOpen; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '(') parameterDepth += 1;
    if (char === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) { parameterClose = index; break; }
    }
  }
  assert.ok(parameterClose >= 0, `${name} must have a complete parameter list`);
  const open = source.indexOf('{', parameterClose + 1);
  let depth = 0;
  quote = '';
  escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(declarationStart, index + 1);
    }
  }
  assert.fail(`${name} function body is unterminated`);
}

const london = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0).getTime();
const NOW = london(2026, 11, 4, 14, 32); // Wednesday 4 November 2026, 14:32 GMT

const context = vm.createContext({ LocusPlan, Intl, Date, Math, JSON, Map, Set, Number, String, Array, Object });
vm.runInContext([
  'todayPad2', 'todayDayKey', 'todayDayBounds', 'todayClockText', 'nextReminderOccurrenceForDisplay',
  'previousReminderOccurrence', 'todayTaskModel', 'parseTodayCapture',
].map(extractFunction).join('\n') + '\nglobalThis.__today = { todayDayKey, todayDayBounds, todayTaskModel, parseTodayCapture };', context, { filename: 'today-model.js' });
const today = context.__today;
const plain = value => JSON.parse(JSON.stringify(value));

// ── Day bounds ──
equal(today.todayDayKey(NOW), '2026-11-04', 'the day key is the local calendar date');
equal(plain(today.todayDayBounds(NOW)), { start: london(2026, 11, 4), end: london(2026, 11, 5), key: '2026-11-04' }, 'Today spans one local calendar day');

// ── Capture parser ──
const spaces = [{ id: 's1', name: 'Locus build' }, { id: 's2', name: 'Research' }, { id: 's3', name: 'Reading' }];
const parse = (text, now = NOW) => plain(today.parseTodayCapture(text, { now, timeZone: 'Europe/London', spaces }));
const tokenText = (text, parsed) => parsed.tokens.map(token => `${token.kind}:${text.slice(token.start, token.end)}`);

let text = 'call the bank tomorrow 9am';
let parsed = parse(text);
equal([parsed.title, parsed.at, parsed.dayOffset], ['call the bank', london(2026, 11, 5, 9), 1], 'tomorrow 9am resolves to the next day at 09:00');
equal(tokenText(text, parsed), ['when:tomorrow', 'when:9am'], 'both understood words are highlighted');

text = 'read storage quotas fri morning #locus';
parsed = parse(text);
equal([parsed.title, parsed.at, parsed.spaceId, parsed.spaceName], ['read storage quotas', london(2026, 11, 6, 9), 's1', 'Locus build'], 'a weekday, a part of day, and a unique #space prefix all resolve');
equal(tokenText(text, parsed), ['when:fri', 'when:morning', 'where:#locus'], 'the space tag is marked as where');

parsed = parse('Review the store screenshots 16:00');
equal([parsed.title, parsed.at, parsed.dayOffset, parsed.rolled], ['Review the store screenshots', london(2026, 11, 4, 16), 0, false], 'a later time today stays today');
parsed = parse('standup 9am');
equal([parsed.at, parsed.rolled], [london(2026, 11, 5, 9), true], 'a time that has passed today with no day moves to tomorrow');
parsed = parse('pay rent today 9am');
equal([parsed.at, parsed.rolled], [london(2026, 11, 4, 9), false], 'an explicit today keeps a time that has passed');
parsed = parse('call the bank at 3pm');
equal([parsed.title, parsed.at], ['call the bank', london(2026, 11, 4, 15)], 'a leading "at" belongs to the time it introduces');
parsed = parse('plan the sprint next week');
equal([parsed.title, parsed.at], ['plan the sprint', london(2026, 11, 9, 9)], 'next week means Monday 09:00');
parsed = parse('hike this weekend');
equal([parsed.title, parsed.at], ['hike', london(2026, 11, 7, 10)], 'the weekend means Saturday 10:00');
parsed = parse('call mom tonight');
equal([parsed.title, parsed.at], ['call mom', london(2026, 11, 4, 19)], 'tonight means today 19:00');
parsed = parse('lunch 12pm');
equal(parsed.at, london(2026, 11, 5, 12), '12pm is noon (rolled because noon has passed)');
parsed = parse('server check tomorrow 12am');
equal(parsed.at, london(2026, 11, 5, 0), '12am is midnight');
parsed = parse('buy a sun hat, it was sat on');
equal([parsed.title, parsed.at, parsed.tokens.length], ['buy a sun hat, it was sat on', null, 0], 'ambiguous short words (sun, sat, wed) are never read as days');
parsed = parse('buy a sun hat on saturday');
equal([parsed.title, parsed.at], ['buy a sun hat', london(2026, 11, 7, 9)], 'the long weekday form schedules the day at 09:00');
parsed = parse('write 13pm notes');
equal(parsed.at, null, 'an impossible meridiem time schedules nothing');
parsed = parse('#unknown stays in the title');
equal([parsed.title, parsed.spaceId, parsed.tokens.length], ['#unknown stays in the title', null, 0], 'an unknown #tag is left as text and not highlighted');
parsed = parse('look up #re');
equal([parsed.spaceId, parsed.title], [null, 'look up #re'], 'an ambiguous #space prefix never guesses');
parsed = parse('tomorrow 9am');
equal(parsed.title, '', 'a line with only a time has no title to add');
parsed = parse('Book the Kyoto rail pass 9am #research');
equal([parsed.title, parsed.spaceId], ['Book the Kyoto rail pass', 's2'], 'an exact #space name resolves');

text = '明天下午3點 打給銀行';
parsed = parse(text);
equal([parsed.title, parsed.at], ['打給銀行', london(2026, 11, 5, 15)], 'zh-TW: 明天下午3點 resolves to tomorrow 15:00');
equal(tokenText(text, parsed), ['when:明天', 'when:下午', 'when:3點'], 'zh-TW words are highlighted');
parsed = parse('下週一 交報告');
equal([parsed.title, parsed.at], ['交報告', london(2026, 11, 9, 9)], 'zh-TW: 下週一 is Monday next week');
parsed = parse('週五晚上 看電影');
equal([parsed.title, parsed.at], ['看電影', london(2026, 11, 6, 19)], 'zh-TW: 週五晚上 is Friday 19:00');
parsed = parse('今晚8點半 整理收件匣 #reading');
equal([parsed.title, parsed.at, parsed.spaceId], ['整理收件匣', london(2026, 11, 4, 20, 30), 's3'], 'zh-TW: 今晚8點半 is 20:30 today, with a #space');

// T1: a day word with no clock takes a default time; once that has passed, the
// to-do moves to the next real occurrence instead of saving a past reminder.
parsed = parse('email Sam today');
equal([parsed.title, parsed.at, parsed.rolled], ['email Sam', london(2026, 11, 4, 15), true], 'a passed default today moves to the next whole hour');
parsed = parse('pay rent wednesday');
equal([parsed.title, parsed.at, parsed.rolled], ['pay rent', london(2026, 11, 11, 9), true], 'a passed default on today\'s weekday moves to next week');
parsed = parse('今天寄信');
equal([parsed.title, parsed.at], ['寄信', london(2026, 11, 4, 15)], 'zh-TW: a passed default 今天 moves to the next whole hour');
parsed = parse('週三繳費');
equal([parsed.title, parsed.at], ['繳費', london(2026, 11, 11, 9)], 'zh-TW: a passed default 週三 moves to next Wednesday');
parsed = parse('call mom tonight', london(2026, 11, 4, 23, 10));
equal([parsed.title, parsed.at], ['call mom', london(2026, 11, 5, 0)], 'tonight after 19:00 moves to the next whole hour, past midnight if need be');
parsed = parse('hike this weekend', london(2026, 11, 7, 12));
equal([parsed.title, parsed.at], ['hike', london(2026, 11, 8, 10)], 'the weekend on a Saturday afternoon still has its Sunday');
parsed = parse('pay rent wednesday', london(2026, 11, 4, 8));
equal([parsed.at, parsed.rolled], [london(2026, 11, 4, 9), false], 'a default that is still ahead stays on today\'s weekday');

// T3: spaced and full-width zh-TW times, and 周 as well as 週.
text = '明天早上 9 點打給銀行';
parsed = parse(text);
equal([parsed.title, parsed.at], ['打給銀行', london(2026, 11, 5, 9)], 'zh-TW: the placeholder example 明天早上 9 點 parses');
equal(tokenText(text, parsed), ['when:明天', 'when:早上', 'when:9 點'], 'zh-TW: a spaced time is highlighted as one word');
parsed = parse('下午 3 點開會');
equal([parsed.title, parsed.at], ['開會', london(2026, 11, 4, 15)], 'zh-TW: 下午 3 點 is 15:00 today');
text = '明天下午３點半 開會';
parsed = parse(text);
equal([parsed.title, parsed.at], ['開會', london(2026, 11, 5, 15, 30)], 'zh-TW: full-width digits read as ASCII');
equal(tokenText(text, parsed), ['when:明天', 'when:下午', 'when:３點半'], 'offsets still point into the text as typed');
parsed = parse('周五晚上 看電影');
equal([parsed.title, parsed.at], ['看電影', london(2026, 11, 6, 19)], 'zh-TW: 周五 reads like 週五');
parsed = parse('明天 9 點 15 分 晨會');
equal([parsed.title, parsed.at], ['晨會', london(2026, 11, 5, 9, 15)], 'zh-TW: spaced 點 and 分 both parse');

// T5: 12 with an evening word is the midnight that ends the evening.
parsed = parse('晚上12點睡覺');
equal([parsed.title, parsed.at], ['睡覺', london(2026, 11, 5, 0)], 'zh-TW: 晚上12點 is 00:00 the next day');
parsed = parse('deploy 12:30 tonight');
equal([parsed.title, parsed.at], ['deploy', london(2026, 11, 5, 0, 30)], '12:30 tonight is 00:30 the next day');

// T6: word edges, bare H:MM, and quoting.
parsed = parse('look at today\'s report');
equal([parsed.title, parsed.at, parsed.tokens.length], ['look at today\'s report', null, 0], 'today\'s is a word, not a day');
parsed = parse('read John 3:16');
equal([parsed.title, parsed.at], ['read John 3:16', null], 'a bare one-digit H:MM with no day word stays in the title');
parsed = parse('call Ana at 3:30');
equal([parsed.title, parsed.at], ['call Ana', london(2026, 11, 5, 3, 30)], 'at H:MM still reads as a time (03:30, rolled to tomorrow)');
parsed = parse('read "tomorrow\'s news" tomorrow 9am');
equal([parsed.title, parsed.at], ['read "tomorrow\'s news"', london(2026, 11, 5, 9)], 'words in quotes stay literal');
parsed = parse('讀「明天過後」 週五');
equal([parsed.title, parsed.at], ['讀「明天過後」', london(2026, 11, 6, 9)], 'zh-TW: words in 「」 stay literal');

// DST: 01:30 on 28 March 2027 does not exist in London; plan-contract moves it to 02:30 BST.
parsed = parse('flight tomorrow 1:30', london(2027, 3, 27, 12));
equal(parsed.at, Date.UTC(2027, 2, 28, 1, 30), 'a wall time in a DST gap uses the next valid time from plan-contract.js');

// ── Task model ──
const day = (h, min = 0) => london(2026, 11, 4, h, min);
const workspace = {
  categories: [
    { id: 'c1', groups: [{ id: 'g1', items: [
      { id: 'over', type: 'todo', text: 'Overdue', done: false, reminder: { at: london(2026, 11, 3, 18), notified: true } },
      { id: 'overDone', type: 'todo', text: 'Old done', done: true, reminder: { at: london(2026, 11, 3, 18) } },
      { id: 'due', type: 'todo', text: 'Due', done: false, reminder: { at: day(9) } },
      { id: 'up', type: 'todo', text: 'Upcoming', done: false, reminder: { at: day(16) } },
      { id: 'any2', type: 'todo', text: 'Anytime second', done: false, createdAt: day(11) },
      { id: 'any1', type: 'todo', text: 'Anytime first', done: false, createdAt: day(10) },
      { id: 'old', type: 'todo', text: 'Created yesterday', done: false, createdAt: london(2026, 11, 3, 10) },
      { id: 'fin', type: 'todo', text: 'Finished', done: true, reminder: { at: day(8) } },
      { id: 'tomorrow', type: 'todo', text: 'Tomorrow', done: false, reminder: { at: london(2026, 11, 5, 9) } },
      { id: 'note', type: 'note', html: 'A note', createdAt: day(9) },
      { id: 'stack', type: 'stack', items: [{ id: 'nested', type: 'todo', text: 'Nested', done: false, createdAt: day(12) }] },
      { id: 'dup', type: 'todo', text: 'Duplicate A', done: false, createdAt: day(9) },
    ] }] },
    { id: 'c2', groups: [{ id: 'g2', items: [
      { id: 'dup', type: 'todo', text: 'Duplicate B', done: false, createdAt: day(9) },
    ] }] },
  ],
};
let model = plain(today.todayTaskModel(workspace, NOW, []));
equal(model.open.map(entry => entry.id), ['over', 'due', 'any1', 'any2', 'nested', 'up'],
  'open tasks run overdue, due now, anytime by creation, then later today');
equal(model.finished.map(entry => entry.id), ['fin'], 'only tasks finished today stay on the board, after the open ones');
equal([model.now.id, model.rest.map(entry => entry.id)], ['over', ['due', 'any1', 'any2', 'nested', 'up', 'fin']], 'the Now card takes the first open task');
equal([model.total, model.doneCount], [7, 1], 'progress counts every task on the board');
equal(model.open.map(entry => entry.kind), ['overdue', 'due', 'anytime', 'anytime', 'anytime', 'upcoming'], 'each task carries its derived kind');
model = plain(today.todayTaskModel(workspace, NOW, ['over', 'missing', 'due', 'over']));
equal(model.open.map(entry => entry.id), ['any1', 'any2', 'nested', 'up', 'over', 'due'], 'Later moves tasks behind every other open task, in deferral order');
model = plain(today.todayTaskModel({ categories: [] }, NOW, []));
equal([model.now, model.rest, model.total], [null, [], 0], 'an empty Workspace has no Now task');

// T2: a repeating reminder shows today's occurrence.
const daily = { every: 'day', interval: 1 };
const repeating = { categories: [{ id: 'c1', groups: [{ id: 'g1', items: [
  // Fired at 09:00 today, so the background re-armed it to tomorrow 09:00.
  { id: 'fired', type: 'todo', text: 'Stretch', done: false, createdAt: london(2026, 11, 1, 8), reminder: { at: london(2026, 11, 5, 9), recur: daily, notified: false } },
  // The browser was closed at yesterday's fire time, so `at` is still yesterday.
  { id: 'stale', type: 'todo', text: 'Water plants', done: false, createdAt: london(2026, 11, 1, 8), reminder: { at: london(2026, 11, 3, 18), recur: daily, notified: false } },
  // Weekly on Mondays: no occurrence today, and a missed Monday is not overdue.
  { id: 'weekly', type: 'todo', text: 'Bins', done: false, createdAt: london(2026, 10, 1, 8), reminder: { at: london(2026, 11, 2, 7), recur: { every: 'week', interval: 1 }, notified: false } },
  // Written at 10:00 today with a first 09:00 alarm tomorrow: nothing fired today.
  { id: 'fresh', type: 'todo', text: 'Journal', done: false, createdAt: london(2026, 11, 4, 10), reminder: { at: london(2026, 11, 5, 9), recur: daily, notified: false } },
] }] }] };
model = plain(today.todayTaskModel(repeating, NOW, []));
equal(model.open.map(entry => [entry.id, entry.kind, entry.at]), [
  ['fired', 'due', london(2026, 11, 4, 9)],
  ['stale', 'upcoming', london(2026, 11, 4, 18)],
], 'a fired series counts as due today, a stale one shows today\'s next occurrence, and neither is overdue');

// Someday marks from Plan keep an undated to-do off Today's anytime list.
model = plain(today.todayTaskModel(workspace, NOW, [], new Set(['any1', 'due'])));
equal(model.open.map(entry => entry.id), ['over', 'due', 'any2', 'nested', 'up'],
  'a to-do sent to Someday in Plan leaves Today\'s anytime list (dated ones stay)');

// ── Rendering, transactions, and reuse ──
const renderHome = extractFunction('renderHome');
match(renderHome, /buildTodayBoard\(ws\)/, 'Home renders the Today board');
match(renderHome, /todayCaptureComposing[\s\S]*todayRenderDeferred = true/, 'a repaint never interrupts an IME composition in the capture bar');
match(renderHome, /captureFocused[\s\S]*setSelectionRange/, 'a repaint keeps the capture draft, focus, and caret');
const capture = extractFunction('commitTodayCapture');
match(capture, /createTodayCaptureContext\([\s\S]*resolveTodayCaptureTarget\(context\)/, 'capture resolves one exact Space and Inbox before writing');
match(capture, /createOrganizationIdAllocator\(\)[\s\S]*State\.snapshot\(tr\('today\.history\.add'\)\)[\s\S]*inbox\.items\.push\(todo\)[\s\S]*await State\.persistNow\(parsed\.at != null \? \{ reconcileReminders: true \} : \{\}\)/,
  'capture allocates IDs, snapshots for Undo, and awaits one write that also schedules a reminder when one was parsed');
match(capture, /toast\(todayCaptureReceiptText\(parsed, context\), \{ undo: actionId \}\)/, 'an accepted capture offers Undo for that exact action');
noMatch(capture, /reminder:\s*\{[^}]*recur/, 'capture adds no new reminder fields');
const captureContext = extractFunction('createTodayCaptureContext');
match(captureContext, /inboxes\.length > 1\) return null/, 'two Inboxes in the Space add nothing');
const submit = extractFunction('submitTodayCapture');
match(submit, /if \(!parsed\.title\)[\s\S]*today\.capture\.needTitle/, 'a line with no title explains instead of adding a blank to-do');
match(extractFunction('bindTodayCapture'), /event\.isComposing \|\| event\.keyCode === 229/, 'Enter during an IME composition never submits');
match(extractFunction('openTodayTaskDetail'), /openHomePreviewItem\(workspaceId, itemId, `today:\$\{itemId\}`, opener\)/, 'task titles open the existing route-backed detail sheet');
match(extractFunction('openTodayWeek'), /query: \{ cal: 'week' \}/, 'This week opens the existing Calendar week view');
const usedKeys = new Set([...source.matchAll(/tr\('(today\.[\w.]+)'/g)].map(m => m[1]));

// ── Now card: completion and Later ──
const toggle = extractFunction('commitTodayTodoToggle');
match(toggle, /createBoardTodoCompletionContext\(row\.item\)[\s\S]*resolveBoardTodoCompletionTarget\(context\)/, 'completion reuses the exact Board to-do identity');
match(toggle, /boardTodoCompletionMutationPending = transaction[\s\S]*State\.snapshot\(tr\(target\.item\.done \? 'detail\.markIncomplete' : 'detail\.markComplete'\)\)[\s\S]*target\.item\.done = !target\.item\.done[\s\S]*await State\.persistNow\(\)/,
  'completion holds the shared pending token, takes one Undo snapshot, and awaits one acknowledged write');
const check = extractFunction('checkTodayNow');
match(check, /Promise\.all\(\[commitTodayTodoToggle\(itemId, button\), todayWait/, 'the check animation waits for the acknowledged write');
match(check, /if \(!accepted\)[\s\S]*classList\.remove\('is-checking'\)/, 'a refused or failed write puts the Now card back');
const later = extractFunction('laterTodayNow');
match(later, /deferTodayTask\(itemId\)/, 'Later defers the Now task');
noMatch(later + extractFunction('deferTodayTask'), /State\.(?:snapshot|persist|persistNow)\(/, 'Later is view order only and never writes the stored graph');
match(extractFunction('deferTodayTask'), /localStorage\.setItem\(TODAY_LATER_STORAGE_KEY/, 'Later order is per-device view state');
match(source, /const TODAY_LATER_STORAGE_KEY = 'locus\.today\.later';/, 'Later uses one documented localStorage key');

// Later run for real against a State double that fails on any touch.
{
  const stored = new Map();
  const laterContext = vm.createContext({
    Date, JSON, Number, String, Array,
    State: new Proxy({}, { get(_, key) { throw new Error(`Later touched State.${String(key)}`); } }),
    localStorage: {
      getItem(key) { return stored.has(key) ? stored.get(key) : null; },
      setItem(key, value) { stored.set(key, String(value)); },
    },
  });
  vm.runInContext([
    "const TODAY_LATER_STORAGE_KEY = 'locus.today.later';",
    'const TODAY_LATER_LIMIT = 200;',
    "let todayLaterMemory = { day: '', ids: [] };",
    ...['todayPad2', 'todayDayKey', 'readTodayLaterIds', 'deferTodayTask'].map(extractFunction),
    'globalThis.__later = { deferTodayTask, readTodayLaterIds };',
  ].join('\n'), laterContext, { filename: 'today-later.js' });
  equal(laterContext.__later.deferTodayTask('a', NOW), true, 'Later succeeds without touching State');
  laterContext.__later.deferTodayTask('b', NOW);
  laterContext.__later.deferTodayTask('a', NOW);
  equal(plain(laterContext.__later.readTodayLaterIds(NOW)), ['b', 'a'], 'Later keeps one entry per to-do, newest last');
  equal(plain(laterContext.__later.readTodayLaterIds(london(2026, 11, 5, 8))), [], 'Later order resets the next day');
  equal(JSON.parse(stored.get('locus.today.later')).day, '2026-11-04', 'Later order is stored per device for the day');
}

// T4: focus on a Today control survives a Home repaint through its stable key.
{
  const focused = [];
  let activeElement = null;
  const control = key => {
    const element = {
      dataset: { todayFocus: key },
      focus() { focused.push(key); activeElement = element; },
      closest(selector) { return selector === '#board [data-today-focus]' ? element : null; },
    };
    return element;
  };
  let built = [];
  const board = {
    classList: { add() {}, remove() {} },
    querySelector() { return null; },
    querySelectorAll(selector) { return selector === '[data-today-focus]' ? built : []; },
    set innerHTML(value) { built = []; },
    appendChild() {},
  };
  const homeContext = vm.createContext({
    document: {
      get activeElement() { return activeElement; },
      getElementById(id) { return id === 'board' ? board : null; },
    },
    activeWs() { return { id: 'w1' }; },
    hideBreadcrumb() {},
    buildTodayBoard() {
      built = [control('now-check:t1'), control('now-later:t1'), control('card-check:t2')];
      return {};
    },
    syncTodayTabsEar() {},
    startTodayClock() {},
  });
  vm.runInContext([
    'let activeHome = true;',
    'let todayCaptureComposing = false;',
    'let todayRenderDeferred = false;',
    'let todayJustAddedId = null;',
    extractFunction('renderHome'),
    'globalThis.__home = { renderHome };',
  ].join('\n'), homeContext, { filename: 'today-home-focus.js' });
  homeContext.__home.renderHome();
  activeElement = built[1];
  homeContext.__home.renderHome();
  equal(focused, ['now-later:t1'], 'a repaint puts focus back on the same Later button, not <body>');
  ok(activeElement !== null && activeElement.dataset.todayFocus === 'now-later:t1', 'the rebuilt Later button holds focus');
}
for (const builder of ['buildTodayNow', 'buildTodayCard', 'buildTodayRest']) {
  match(extractFunction(builder), /dataset\.todayFocus = /, `${builder} gives its controls a stable focus key`);
}
match(extractFunction('buildTodayBoard'), /todayTaskModel\(workspace, now, readTodayLaterIds\(now\), somedayIds\)/, 'the board applies the day\'s Later order and Plan\'s Someday marks');
match(extractFunction('buildTodayBoard'), /somedayIds = typeof planSomedayIds === 'function' \? planSomedayIds\(\)/, 'the board reads Someday marks from plan.js');
match(extractFunction('buildTodayNow'), /if \(model\.open\.length > 1\)[\s\S]*today-now-later/, 'Later is offered only when another open task can take its place');
match(extractFunction('toggleTodayCard'), /commitTodayTodoToggle\(itemId, button\)/, 'a Rest card check uses the same completion transaction');

// ── Capture highlighting ──
const mirror = extractFunction('paintTodayCaptureMirror');
match(mirror, /parseTodayCapture\(value, \{ spaces: todayCaptureSpaces\(\) \}\)/, 'highlights come from the same parser that saves the task');
match(mirror, /createElement\('mark'\)[\s\S]*today-hl is-\$\{token\.kind\}/, 'understood words are marked as when or where');
match(mirror, /today-capture-mirror-line/, 'the mirror keeps one inline line so spaces between marks survive');
match(extractFunction('buildTodayCapture'), /today-capture-mirror" aria-hidden="true"/, 'the mirror is hidden from assistive technology; the input stays the accessible field');
match(css, /\.today-capture-input\s*\{[^}]*color: transparent;[^}]*caret-color: var\(--text\)/, 'the real input keeps the caret while the mirror draws the text');
match(css, /@media \(forced-colors: active\)[\s\S]*\.today-capture-mirror \{ display: none; \}[\s\S]*\.today-capture-input \{ color: CanvasText; \}/, 'forced colors show the plain input instead of the mirror');

// ── Edge tab and the reused open-tabs rail ──
match(html, /<button id="today-tabs-ear"[^>]*aria-controls="tabrail"[^>]*aria-expanded="false"/, 'the edge tab controls the existing rail');
equal((html.match(/id="tabrail"/g) || []).length, 1, 'Today reuses the one Opened Tabs rail');
match(html, /id="today-tabs-scrim"[^>]*hidden/, 'the drawer scrim starts hidden');
const drawer = extractFunction('setTodayTabsDrawer');
noMatch(drawer, /setOpenTabsRailCollapsed|State\.persist|railCollapsed/, 'opening the drawer never changes the saved rail preference');
match(drawer, /rememberOpener\(rail,[\s\S]*restoreOpener\(rail\)/, 'closing the drawer returns focus to its opener');
match(extractFunction('handleOpenTabsEscape'), /todayDrawer[\s\S]*setTodayTabsDrawer\(false, \{ restoreFocus: true \}\)/, 'Escape closes the drawer');
match(extractFunction('focusOpenTabFilter'), /todayTabsDrawerAvailable\(\)[\s\S]*setTodayTabsDrawer\(true/, 'S opens the drawer on Today');
match(extractFunction('setOpenTabRailCount'), /syncTodayTabsEar\(value\)/, 'the badge follows the rail count');
match(extractFunction('bindTodayBoard'), /trapTabKey\(event, rail\)/, 'Tab stays inside the open drawer');
match(css, /@media \(max-width: 820px\)\s*\{\s*body\[data-surface="home"\] \.today-tabs-ear \{ display: none; \}/, 'the edge tab follows the rail, which is absent at 820 px and below');
match(html, /data-i18n-aria-label="today\.tabs\.openNone"/, 'the edge tab has a localized fallback name');
usedKeys.add('today.tabs.openNone');

// ── Locale parity ──
const enStart = source.indexOf('const I18N = {');
const zhStart = source.indexOf("'zh-TW': {", enStart);
ok(enStart >= 0 && zhStart > enStart, 'I18N keeps en then zh-TW tables');
const en = source.slice(enStart, zhStart);
const zh = source.slice(zhStart, source.indexOf('\n};', zhStart));
for (const key of usedKeys) {
  match(en, new RegExp(`'${key.replace(/\./g, '\\.')}':`), `en must define ${key}`);
  match(zh, new RegExp(`'${key.replace(/\./g, '\\.')}':`), `zh-TW must define ${key}`);
}
ok(usedKeys.size >= 15, 'Today copy is localized through I18N');

// ── Presentation, motion, fonts, tokens ──
const todayCss = css.slice(css.indexOf('TODAY BOARD (2026-11 canvas)'));
ok(todayCss.length > 1000, 'the Today block is the last presentation layer');
noMatch(todayCss, /(?:linear|radial|conic)-gradient\s*\(/, 'Today adds no decorative gradients');
match(todayCss, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.today \*[\s\S]*?animation: none !important; transition: none !important;/, 'reduced motion stops every Today animation');
match(todayCss, /body\[data-anim="off"\] :is\(\.today, \.today \*/, 'the in-app animation switch also stops Today motion');
match(todayCss, /\.today-digit\s*\{[^}]*overflow-y: clip/, 'the rolling digits never add scrollable height');
match(source, /function todayReducedMotion\(\)[\s\S]*prefers-reduced-motion: reduce/, 'scripted sequences skip their waits under reduced motion');
for (const [theme, tokens] of [['folio', ['--registry-bg: #19231f', '--locator: #3158db', '--ground: #f3f2ee', '--when: #ff5b2e', '--badge: #e0281b', '--registry-card: #19231f']], ['folio-dark', ['--ground: #111613', '--registry-card: #1e2824', '--badge: #e0281b']]]) {
  const block = themes.slice(themes.indexOf(`[data-theme="${theme}"] {`), themes.indexOf('}', themes.indexOf(`[data-theme="${theme}"] {`)));
  for (const token of tokens) ok(block.includes(token), `${theme} must keep ${token}`);
}
match(themes, /--font-brand-display: 'Bricolage Grotesque'/, 'the brand display face is a theme token');
match(fonts, /font-family: 'Bricolage Grotesque';[\s\S]*src: url\(\.\/[\w-]+\.woff2\) format\('woff2'\)/, 'Bricolage Grotesque is bundled locally');
noMatch(fonts, /https?:\/\//, 'no font is fetched at runtime');
ok(fs.existsSync(path.join(root, 'media/fonts/Bricolage-Grotesque-OFL.txt')), 'the Bricolage OFL notice ships beside the font');
for (const file of [...fonts.matchAll(/url\(\.\/([\w-]+\.woff2)\)/g)].map(m => m[1])) {
  ok(fs.existsSync(path.join(root, 'media/fonts', file)), `bundled font file exists: ${file}`);
}

// ── Boundaries that must not move ──
equal(manifest.permissions, ['tabs', 'storage', 'contextMenus', 'bookmarks', 'alarms', 'notifications', 'favicon'], 'Today adds no permission');
equal(manifest.optional_permissions, ['nativeMessaging'], 'Today adds no optional permission');
equal(manifest.content_security_policy.extension_pages, "script-src 'self'; object-src 'self'; img-src 'self' data: blob:; connect-src 'none'", 'the CSP is unchanged');
noMatch(manifest.host_permissions ? JSON.stringify(manifest.host_permissions) : '', /./, 'there are still no host permissions');
noMatch(manifest.optional_host_permissions ? JSON.stringify(manifest.optional_host_permissions) : '', /./, 'there are still no optional host permissions');
match(source, /const CURRENT_SCHEMA = 14\b/, 'Today needs no schema change');

console.log(`Today contracts passed: ${checks} checks (day bounds, capture parsing in en and zh-TW with DST, task order and Later, receipt-gated completion and capture, edge tab, locale parity, motion, fonts, permissions)`);
