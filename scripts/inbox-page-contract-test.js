'use strict';

// Contract test for the Inbox page (2026-11 canvas): the triage card over Plan's
// Sort queue, the clean rows, the header More menu that keeps the group page's
// actions, and the routes that still reach the Inbox group. Production slices
// run in node:vm with a fixed clock; wiring and styles are checked in source.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const newtab = read('newtab.js');
const planSource = read('plan.js');
const css = read('newtab.css');
const ci = read('.github/workflows/ci.yml');
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const plain = value => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const eq = (actual, expected, message) => { assert.deepEqual(plain(actual), expected, message); checks += 1; };

function extract(name) {
  let start = newtab.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is extractable`);
  if (newtab.slice(start - 6, start) === 'async ') start -= 6;
  const open = newtab.indexOf('{', newtab.indexOf(')', start));
  let depth = 0;
  for (let index = open; index < newtab.length; index += 1) {
    if (newtab[index] === '{') depth += 1;
    else if (newtab[index] === '}') { depth -= 1; if (depth === 0) return newtab.slice(start, index + 1); }
  }
  throw new Error(name);
}
const inboxSection = newtab.slice(newtab.indexOf('// INBOX PAGE (2026-11 canvas)'), newtab.indexOf('// ITEM DETAIL PANE (§4.2'));
const inboxCss = css.slice(css.indexOf('INBOX PAGE (2026-11 canvas)'));

// Wednesday 11 November 2026, 10:00 local time.
const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0).getTime();
const NOW = at(2026, 11, 11, 10, 0);

function sandbox(extra = {}) {
  const store = new Map();
  const context = vm.createContext(Object.assign({
    console, Date, Math, JSON, Map, Set, Number, String, Object, Array, Promise,
    localStorage: {
      getItem: key => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => { store.set(key, String(value)); },
      removeItem: key => { store.delete(key); },
    },
    appLocale: () => 'en-GB',
    tr: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
    reminderItemTitle: item => item.title || item.text || item.url || '',
    nextReminderOccurrenceForDisplay: () => NaN,
  }, extra));
  vm.runInContext(`const PLAN_VIEWS = ['upcoming', 'sort']; const CAL_VIEWS = ['month', 'week', 'agenda'];\n${planSource}`, context, { filename: 'plan.js' });
  vm.runInContext([
    'let inboxPageSession = null;',
    'let activeGroupPage = null;',
    extract('pendingReminderTime'),
    extract('inboxPageState'),
    extract('inboxPageModel'),
    extract('inboxItemStatus'),
    extract('inboxWhenLabel'),
    extract('inboxSavedLabel'),
    extract('inboxSpaceMatches'),
    extract('inboxDropIndex'),
  ].join('\n'), context, { filename: 'inbox-model.js' });
  return { context, store };
}

const tab = (id, extra = {}) => Object.assign({ id, type: 'tab', title: id, url: `https://${id}.example/page`, createdAt: at(2026, 11, 10, 9) }, extra);
const todo = (id, extra = {}) => Object.assign({ id, type: 'todo', text: id, done: false, createdAt: at(2026, 11, 10, 9) }, extra);
const note = (id, extra = {}) => Object.assign({ id, type: 'note', html: `<p>${id}</p>`, createdAt: at(2026, 11, 10, 9) }, extra);

function testModel() {
  const { context } = sandbox();
  const group = {
    id: 'inbox',
    name: 'Inbox',
    items: [
      tab('a'),
      tab('b', { reminder: { at: at(2026, 11, 11, 18), notified: false } }),
      note('c'),
      todo('d', { done: true }),
      todo('e'),
      tab('f'),
      { id: 'g', type: 'stack', name: 'Stack', items: [tab('g1')] },
    ],
  };
  const session = context.inboxPageState('inbox');
  const model = context.inboxPageModel(group, new Set(['f']), session, NOW);
  eq(model.queue.map(item => item.id), ['a', 'c', 'e'], 'the waiting count is Plan’s Sort queue: undated, unfinished, not Someday, no stacks');
  eq(model.current.id, 'a', 'the card shows the first waiting item');
  eq(model.rows.map(row => row.item.id), ['b', 'c', 'd', 'e', 'f', 'g'], 'every other Inbox item is a row, in stored order');
  eq(model.rows.map(row => row.status.kind), ['when', '', 'done', '', 'someday', ''], 'rows carry when, done and Someday chips');
  eq(model.rows.find(row => row.item.id === 'b').status.label, 'plan.lane.today 18:00', 'a planned row names its day and time');
  ok(model.canSkip, 'Skip is offered while another item waits');
  eq([model.done, model.total], [0, 3], 'nothing sorted yet in this visit');

  session.skipped = ['a'];
  eq(context.inboxPageModel(group, new Set(['f']), session, NOW).current.id, 'c', 'a skipped item waits at the end of the queue');
  session.skipped = ['a', 'c', 'e'];
  eq(context.inboxPageModel(group, new Set(['f']), session, NOW).current.id, 'a', 'Skip rotates: once every item was skipped the first one comes back');
  session.skipped = [];

  const single = { id: 'inbox', name: 'Inbox', items: [tab('only')] };
  ok(!context.inboxPageModel(single, new Set(), context.inboxPageState('inbox'), NOW).canSkip, 'Skip is unavailable for the last waiting item (board review finding 8)');

  // The tally counts only answers still in effect, as Plan's Sort does.
  session.decided.set('b', 'today');
  session.decided.set('x', 'move');
  session.decided.set('a', 'archive');
  const tallied = context.inboxPageModel(group, new Set(['f']), session, NOW);
  eq(plain(tallied.tally), { today: 1, week: 0, someday: 0, archive: 0, move: 1 }, 'an answer whose Undo put the item back (a) is not counted; a move is');
  eq([tallied.done, tallied.total], [2, 5], 'the segment strip spans sorted plus waiting');
  ok(context.inboxPageState('other') !== session && context.inboxPageState('other').decided.size === 0, 'another Inbox starts its own session');
}

function testLabels() {
  const { context } = sandbox();
  eq(context.inboxWhenLabel(at(2026, 11, 11, 18), NOW), 'plan.lane.today 18:00', 'today reads Today and the time');
  eq(context.inboxWhenLabel(at(2026, 11, 12, 9), NOW), 'plan.lane.tomorrow 09:00', 'tomorrow reads Tomorrow and the time');
  ok(/^\S+ 09:00$/.test(context.inboxWhenLabel(at(2026, 11, 14, 9), NOW)) && !context.inboxWhenLabel(at(2026, 11, 14, 9), NOW).startsWith('plan.'), 'later this week reads the weekday and the time');
  ok(!/\d{2}:\d{2}/.test(context.inboxWhenLabel(at(2026, 12, 2, 9), NOW)), 'further out reads the date');
  eq(context.inboxSavedLabel(at(2026, 11, 11, 8, 40), NOW), '08:40', 'a row saved today shows its time');
  ok(!/\d/.test(context.inboxSavedLabel(at(2026, 11, 9, 8), NOW)), 'a row saved this week shows its weekday');
  ok(/\d/.test(context.inboxSavedLabel(at(2026, 10, 1, 8), NOW)), 'an older row shows its date');
  eq(context.inboxSavedLabel(undefined, NOW), '', 'no saved time, no label');
  const status = item => context.inboxItemStatus(item, new Set(['s']), NOW).kind;
  eq([status(todo('t', { done: true })), status(tab('r', { reminder: { at: at(2026, 11, 10, 9), notified: true } })), status(tab('s')), status(tab('w'))], ['done', 'when', 'someday', ''],
    'a fired reminder still reads as planned, not waiting');
  ok(context.inboxItemStatus(tab('late', { reminder: { at: at(2026, 11, 10, 9), notified: false } }), new Set(), NOW).overdue, 'a past time is marked overdue');
}

function testPickerFilterAndDrop() {
  const { context } = sandbox();
  const option = { label: 'My Workspace › Research › Storage' };
  ok(context.inboxSpaceMatches(option, ''), 'an empty filter shows every Space');
  ok(context.inboxSpaceMatches(option, 'res STOR'), 'words match in any order, ignoring case');
  ok(!context.inboxSpaceMatches(option, 'kyoto'), 'a word that is not in the path filters the Space out');
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  eq([context.inboxDropIndex(items, 'b', false), context.inboxDropIndex(items, 'b', true), context.inboxDropIndex(items, 'zz', false)], [1, 2, 3],
    'a drop lands before or after its row in stored order, else at the end');
}

// planSortDecide is the one write behind a Sort answer, shared with Plan.
async function testSharedDecide() {
  const calls = [];
  const { context } = sandbox({
    activeWs: () => ({ id: 'ws', categories: [] }),
    archiveSavedPage: async (item, opener) => { calls.push(['archivePage', item.id, opener]); return true; },
    archiveBoardLocalItem: async item => { calls.push(['archiveLocal', item.id]); return true; },
    setReminder: async (id, when) => { calls.push(['remind', id, typeof when]); return true; },
  });
  const decide = (item, choice) => context.planSortDecide(item, choice, 'opener');
  eq([await decide(tab('p'), 'skip'), calls.length], [true, 0], 'Skip writes nothing');
  ok(await decide(tab('p'), 'someday') && context.planSomedayIds().has('p'), 'Someday is the per-device mark');
  await decide(tab('p'), 'archive');
  await decide(note('n'), 'archive');
  await decide(todo('t'), 'today');
  await decide(todo('u'), 'week');
  eq(calls, [['archivePage', 'p', 'opener'], ['archiveLocal', 'n'], ['remind', 't', 'number'], ['remind', 'u', 'number']],
    'Archive and the dated answers go through the existing archive and reminder transactions');
  ok(/async function planSortChoose\(item, choice, opener = null\) \{[\s\S]*?ok = await planSortDecide\(item, choice, opener\);/.test(planSource), 'Plan’s Sort answers through planSortDecide');
  ok(/session\.holdRender = true;[\s\S]*await leaveDone;[\s\S]*session\.holdRender = false;/.test(planSource), 'Plan’s Sort still holds its repaint until the card has left');
  ok(/return planSortDecide\(item, choice, opener\);/.test(extract('inboxDecide')), 'the Inbox card answers through the same planSortDecide');
  ok(/commitSelectedItemMove\(option\.review, option\.destinationContext, opener\)/.test(extract('inboxDecide')), 'Move goes through the selection move transaction');
}

// The card's answer, run with the real session and model and stubbed writes.
async function testTriageFlow() {
  const renders = [];
  const toasts = [];
  const decided = [];
  let answer = true;
  const group = { id: 'inbox', name: 'Inbox', items: [tab('a'), tab('b')] };
  const { context } = sandbox({
    findGroup: id => (id === 'inbox' ? { group } : null),
    document: { querySelector: () => null, activeElement: null },
    CSS: { escape: value => String(value) },
    setTimeout: (fn) => { fn(); return 1; },
    toast: (message, options) => toasts.push([message, options || null]),
  });
  context.planSortDecide = async (item, choice) => { decided.push([item.id, choice]); return answer; };
  context.renderBoard = () => { const s = context.__session(); renders.push({ hold: s.holdRender, busy: s.busy, entering: s.entering }); };
  vm.runInContext([extract('inboxPageRoot'), extract('inboxFocus'), extract('focusInboxCard'), extract('inboxDecide'), extract('inboxTriage'), 'globalThis.__session = () => inboxPageSession;'].join('\n'), context);
  context.planReducedMotion = () => true;
  ok(await context.inboxTriage('inbox', group.items[0], 'today'), 'an answered card resolves true');
  const session = context.__session();
  eq(decided, [['a', 'today']], 'the answer is written once through planSortDecide');
  eq(session.decided.get('a'), 'today', 'the answer joins the session tally');
  eq(renders, [{ hold: false, busy: false, entering: false }], 'one repaint, after the hold is released (reduced motion: no entrance)');
  ok(!session.busy && !session.holdRender, 'the session is free again');

  decided.length = 0;
  renders.length = 0;
  await context.inboxTriage('inbox', group.items[0], 'skip');
  eq([decided.length, session.skipped], [0, ['a']], 'Skip writes nothing and moves the item to the back');
  const lone = { id: 'inbox', name: 'Inbox', items: [tab('z')] };
  context.findGroup = () => ({ group: lone });
  ok(!(await context.inboxTriage('inbox', lone.items[0], 'skip')), 'the last waiting item cannot be skipped');
  context.findGroup = id => (id === 'inbox' ? { group } : null);

  await context.inboxTriage('inbox', group.items[1], 'someday');
  eq(toasts.pop(), ['inbox.somedaySaved', null], 'Someday confirms through the shared toast, without Undo (the mark is per-device, as in Plan)');

  answer = false;
  renders.length = 0;
  ok(!(await context.inboxTriage('inbox', group.items[1], 'archive')), 'a refused write resolves false');
  ok(!session.decided.has('b') || session.decided.get('b') === 'someday', 'a refused write records no answer');
  eq(renders, [{ hold: false, busy: false, entering: false }], 'a refused write repaints the card in place');

  session.busy = true;
  decided.length = 0;
  ok(!(await context.inboxTriage('inbox', group.items[0], 'today')) && decided.length === 0, 'one press answers one card: a second answer waits');
  session.busy = false;
}

// The header and card markup, built with a minimal element stand-in.
function testBuilders() {
  const element = () => {
    const node = {
      className: '', dataset: {}, attributes: {}, innerHTML: '', classList: { list: new Set(), add(...names) { names.forEach(name => this.list.add(name)); } },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      querySelector: () => ({ addEventListener() {}, dataset: {} }),
      querySelectorAll: () => [],
      addEventListener() {},
      appendChild(child) { this.child = child; return child; },
    };
    return node;
  };
  const { context } = sandbox({
    document: { createElement: element },
    esc: value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    favUrl: () => '',
    dispUrl: value => value,
    fmtTimeRelative: () => '4 min ago',
    boardNotePreviewText: item => item.html,
    bindBoardItemContextMenu() {},
    saveMostRecentOpenTab() {},
    focusDialogOpener() {},
    importBookmarks() {},
    goHome() {},
  });
  vm.runInContext(['const INBOX_ICONS = {};', extract('inboxIcon'), extract('inboxDotsIcon'), extract('inboxItemTitle'), extract('inboxItemSource'), extract('inboxFavMarkup'), extract('bindInboxFavicons'), extract('buildInboxHeader'), extract('buildInboxCard'), 'const INBOX_BURST_RAYS = [0, 45, 90, 135, 180, 225, 270, 315];', extract('buildInboxClear')].join('\n'), context);
  const session = context.inboxPageState('inbox');
  const group = { id: 'inbox', name: 'Inbox', items: [tab('a'), tab('b'), tab('c')] };
  let model = context.inboxPageModel(group, new Set(), session, NOW);

  let head = context.buildInboxHeader(group, model, session);
  ok(/class="ibx-bub" role="img" aria-label="plan\.leftToSort:\{&quot;count&quot;:3\}"/.test(head.innerHTML), 'the red bubble names how many wait');
  ok(!/is-bump|is-up|is-down/.test(head.innerHTML), 'the first paint does not roll');
  session.count = 4;
  head = context.buildInboxHeader(group, model, session);
  ok(/ibx-bub is-bump/.test(head.innerHTML) && /ibx-roll-stack is-down"><span>3<\/span><span>4<\/span>/.test(head.innerHTML), 'a lower count rolls down from the old number, resting on the new one');
  session.count = 2;
  head = context.buildInboxHeader(group, model, session);
  ok(/ibx-roll-stack is-up"><span>2<\/span><span>3<\/span>/.test(head.innerHTML), 'a higher count rolls up, resting on the new one');
  ok(/data-ibx-act="save"[\s\S]*action\.saveTab[\s\S]*data-ibx-act="more"[\s\S]*aria-label="inbox\.more"/.test(head.innerHTML), 'the header holds Save tab and a labelled More');
  session.count = 0;
  const empty = { id: 'inbox', name: 'Inbox', items: [] };
  ok(!/ibx-bub/.test(context.buildInboxHeader(empty, context.inboxPageModel(empty, new Set(), session, NOW), session).innerHTML), 'no bubble when nothing waits');

  session.cardId = null;
  session.shown = false;
  let card = context.buildInboxCard(group, model, session);
  ok(card.tabIndex === 0 && card.dataset.id === 'a' && card.attributes['aria-label'] === 'plan.sortKeys', 'the card is one focusable stop that announces its keys');
  ok(!/is-entering|is-back-/.test(card.innerHTML), 'the first card does not animate in');
  ok(/data-sort="today"[\s\S]*>1<[\s\S]*data-sort="week"[\s\S]*>2<[\s\S]*data-sort="someday"[\s\S]*>3<[\s\S]*data-sort="archive"[\s\S]*>A</.test(card.innerHTML), 'Today, This week, Someday and Archive carry keys 1, 2, 3 and A');
  ok(/data-sort="move"[\s\S]*inbox\.moveToSpace[\s\S]*data-sort="skip"[\s\S]*plan\.skip/.test(card.innerHTML), 'Move to a Space and Skip sit under the answers');
  eq((card.innerHTML.match(/class="ibx-seg(?: is-done)?"/g) || []).length, 3, 'one segment per item in this visit');
  session.cardId = 'z';
  session.entering = true;
  ok(/ibx-card-item is-entering/.test(context.buildInboxCard(group, model, session).innerHTML), 'the next card enters after an answer');
  session.entering = false;
  session.decided.set('a', 'today');
  card = context.buildInboxCard(group, model, session);
  ok(/ibx-card-item is-back-today/.test(card.innerHTML) && !session.decided.has('a'), 'Undo brings the card back from where it went, once');
  const lone = { id: 'inbox', name: 'Inbox', items: [tab('only')] };
  ok(/data-sort="skip" data-ibx-focus="card-skip" aria-disabled="true"/.test(context.buildInboxCard(lone, context.inboxPageModel(lone, new Set(), session, NOW), session).innerHTML), 'Skip is disabled on the last item');

  session.hadCard = true;
  session.decided.set('a', 'week');
  const sorted = { id: 'inbox', name: 'Inbox', items: [tab('a', { reminder: { at: at(2026, 11, 12, 9), notified: false } })] };
  model = context.inboxPageModel(sorted, new Set(), session, NOW);
  const clear = context.buildInboxCard(sorted, model, session).child;
  ok(/ibx-clear is-burst/.test(clear.className) && /ibx-clear-mark is-burst/.test(clear.innerHTML) && (clear.innerHTML.match(/class="ibx-ray"/g) || []).length === 8, 'the last answer clears the Inbox with one burst');
  ok(/plan\.inboxClear/.test(clear.innerHTML) && /ibx-tally-item is-week"><span>1<\/span>plan\.tally\.week/.test(clear.innerHTML), 'the clear moment shows the session tally');
  ok(!/data-ibx-act="import"/.test(clear.innerHTML) && /data-ibx-act="home"/.test(clear.innerHTML), 'Back to Today; Import bookmarks only for an empty Inbox');
  session.hadCard = false;
  const calm = context.buildInboxCard(empty, context.inboxPageModel(empty, new Set(), session, NOW), session).child;
  ok(!/is-burst/.test(calm.innerHTML) && /data-ibx-act="import"/.test(calm.innerHTML), 'an Inbox that was already empty is calm and offers Import bookmarks');
}

function testWiring() {
  const groupPage = extract('renderGroupPage');
  ok(/const g = info\.group;\n\s*\/\/[^\n]*\n\s*if \(isInboxPageGroup\(g\)\) return renderInboxPage\(info\);\n\s*\n\s*renderBreadcrumb\(info\.ws, cat, g\);/.test(groupPage), 'the group route sends the Inbox to its own page before the breadcrumb');
  ok(/buildGroupCol\(g, \{ forceExpanded: true \}\)/.test(groupPage), 'other groups keep the force-expanded group page');
  ok(/return !!group && group\.name === 'Inbox';/.test(extract('isInboxPageGroup')), 'the Inbox is recognised the way the rest of the app names it');
  const page = extract('renderInboxPage');
  ok(/hideBreadcrumb\(\);/.test(page) && !/renderBreadcrumb|buildGroupCol|gp-readme/.test(page), 'the Inbox page has no breadcrumb, Back button, column or description box');
  ok(/if \(session\.holdRender && page\) return true;/.test(page), 'a landing answer holds the repaint, as Plan’s Sort does');
  ok(/document\.body\.dataset\.page = 'inbox';/.test(page) && /\$b\.classList\.add\('group-page-mode', 'inbox-mode'\);/.test(page), 'the page marks itself for its own styles');
  ok(/firstShow && !currentDetailItemId\(\)\) \{[\s\S]*focusInboxCard\(page\);/.test(page), 'the keys answer as soon as the page opens, unless details own focus');
  const board = extract('renderBoard');
  ok(/if \(activeSearch \|\| activeCalendar \|\| !isInboxPageActive\(\)\) \{\n\s*document\.getElementById\('board'\)\.classList\.remove\('inbox-mode'\);\n\s*if \(document\.body\.dataset\.page === 'inbox'\) delete document\.body\.dataset\.page;/.test(board), 'leaving the page clears its marks (and only its own page mark); its own repaint keeps them');
  ok(/const keepScroll = firstShow \? 0 : \$b\.scrollTop;[\s\S]*\$b\.scrollTo\(\{ top: keepScroll, behavior: 'instant' \}\)/.test(page), 'a repaint keeps the scroll position in a long Inbox');
  ok(/if \(inboxPageSession && !isInboxPageActive\(\)\) \{\n\s*inboxPageSession = null;\n\s*closeInboxSpacePicker\(\);/.test(board), 'leaving the page ends its session and closes the picker');
  ok(/let inboxPageSession = null;\nlet inboxSpacePicker = null;/.test(newtab) && newtab.indexOf('let inboxPageSession = null;') < newtab.indexOf('function renderBoard('), 'the session is declared before any render can read it');
  ok(/if \(!el\) \{\n\s*\/\/[^\n]*\n\s*if \(typeof focusInboxPageItem === 'function'\) focusInboxPageItem\(id\);\n\s*return;/.test(extract('focusItem')), 'Welcome’s focusItem() lands on the Inbox page’s card or row');
  const located = extract('focusInboxPageItem');
  ok(/classList\.remove\('is-located'\);\n\s*void target\.offsetWidth;\n\s*target\.classList\.add\('is-located'\);/.test(located), 'the located ring restarts the Today way');
  const identity = extract('focusIdentityTarget');
  ok(identity.indexOf('.lv-group[data-gid') < identity.indexOf('.ibx[data-gid="${value}"] .ibx-card[tabindex="0"]'), 'a capture receipt’s Show saved item focuses the Inbox card after the column fallbacks');
  ok(/\(typeof isInboxPageActive === 'function' && isInboxPageActive\(\)\)\n\s*\|\| \(typeof isSpacePageActive === 'function' && isSpacePageActive\(\)\)\) return openInboxBulkMovePicker\(review, opener\);\n\s*return openMoveTargetPicker\(review, opener\);/.test(extract('runBatchAction')), 'the toolbar Move uses the filterable picker on the Inbox and Space pages only');
  ok(/openInboxView\(createLandingInboxContext\(\), event\.currentTarget\)/.test(newtab), 'the rail still opens the exact Inbox');
}

function testFeaturesKept() {
  const header = extract('inboxHeaderMenuItems');
  ok(/groupActionMenuItems\(group, opener, \{ includeRecordCreation: false \}\)[\s\S]*filter\(entry => entry\.text !== openAsPage\)/.test(header), 'every group action stays in More, minus Open as page');
  ok(/addSidebarOrActiveTabToGroup\(group\)/.test(header) && /groupRecordCreationMenuItems\(group, opener\)/.test(header) && /toggleInboxAbout\(group\.id\)/.test(header), 'Save here, Add note/to-do/stack, and Description and reminders are one click into More');
  ok(/void saveMostRecentOpenTab\(\{ currentTarget: save \}\);/.test(extract('buildInboxHeader')), 'Save tab is the top bar’s save review, anchored to the page button');
  const about = extract('buildInboxAbout');
  ok(/isRichTextLinkEditorOwned\(editor\)/.test(about) && /State\.snapshot\('Edit group description'\);/.test(about) && /renderGroupReminders\(about\.querySelector\('\.gp-reminders'\), group\);/.test(about), 'the description saves like the group page and the reminders list is the same one');
  ok(/renderIntentPills\(group\)/.test(about), 'the group intention stays visible beside the description');
  const menu = extract('inboxItemMenuItems');
  ok(/stackActionMenuItems\(item, stableOpener/.test(menu) && /commonActs\(item, move,/.test(menu), 'row menus are the record menus (details, favourite, read later, marker, reminders, archive)');
  ok(/openSavedTabItem\(item, \{ focus: false, reuse: false/.test(menu) && /copySavedTabUrl\(url\)/.test(menu) && /initialFocusKey: 'title'/.test(menu), 'saved pages keep Open in background, Copy URL and Edit title');
  ok(/inbox\.moveToSpaceMenu/.test(menu), 'row menus add Move to a Space');
  const row = extract('buildInboxRow');
  ok(/attachItemDrag\(row, item, parentItems, group\);/.test(row), 'rows drag with the board’s drag source');
  ok(/bindBoardItemContextMenu\(row, opener => inboxItemMenuItems\(group, item, opener, parentItems\), \{ menuButton \}\);/.test(row), 'right-click, Shift+F10 and the More button open the row menu');
  ok(/if \(event\.shiftKey\) selectRangeTo\(id\);\n\s*else toggleItemSelect\(id\);/.test(row), 'the checkbox selects, Shift selects a range');
  ok(/class="todo-check ibx-todo-check/.test(row) && /toggleBoardTodoCompletion\(item, button\)/.test(extract('inboxToggleTodo')), 'to-dos complete through the receipt-gated Board transaction');
  ok(/role="checkbox" aria-checked="\$\{selected\}"/.test(row) && /aria-label="\$\{esc\(tr\('inbox\.archiveNamed', \{ title \}\)\)\}"/.test(row), 'icon buttons carry names');
  const drop = extract('bindInboxDropZone');
  ok(/handleTabDropIntoList\(drag\.data, list, index\)/.test(drop) && /State\.snapshot\(stack \? 'Move to stack' : 'Move item'\);/.test(drop) && /isDescendantOf\(list, info\.item\)/.test(drop), 'drag reorders with one Undo, takes open tabs, and drops into stacks');
  const triage = extract('inboxTriage');
  ok(/classList\.add\(`is-leaving-\$\{choice\}`\)/.test(triage) && /session\.entering = !reduce;/.test(triage), 'the card leaves toward its answer and the next one enters');
  ok(/const meta = planSortMeta\(current\);/.test(extract('buildInboxCard')), 'the card reads domain, initial and Saved <age> through Plan’s planSortMeta');
  ok(/1: 'today', 2: 'week', 3: 'someday', a: 'archive', A: 'archive', ArrowRight: 'skip'/.test(extract('buildInboxCard')), 'the card takes 1, 2, 3, A and →');
  ok(!/chrome\.|localStorage|fetch\(|XMLHttpRequest/.test(inboxSection), 'the page writes only through State transactions and adds no browser or network calls');
  ok(!/function toast\(/.test(inboxSection), 'confirmations use the one shared toast');
}

function testStyles() {
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n\s*\.ibx, \.ibx \*, \.ibx \*::before, \.ibx \*::after,[\s\S]*?animation: none !important; transition: none !important;/.test(inboxCss), 'reduced motion stops every Inbox animation');
  ok(!/(?:linear|radial|conic)-gradient\s*\(/.test(inboxCss), 'no gradients');
  ok(/\.ibx-roll-stack\.is-up \{ transform: translateY\(-1em\);/.test(inboxCss), 'the rolled count rests on the new number when motion is off');
  for (const choice of ['today', 'week', 'someday', 'archive', 'move', 'skip']) {
    ok(new RegExp(`\\.ibx-card-item\\.is-leaving-${choice} \\{`).test(inboxCss), `the card has a ${choice} exit`);
  }
  for (const choice of ['today', 'week', 'someday', 'archive', 'move']) {
    ok(new RegExp(`\\.ibx-card-item\\.is-back-${choice} \\{ animation: ibx-back-${choice}`).test(inboxCss), `Undo returns the card from ${choice}`);
  }
  ok(/body\[data-page="inbox"\] #topbar-save \{ display: none; \}/.test(inboxCss), 'the page’s Save tab replaces the top bar one here');
  ok(/body\[data-page="inbox"\]:has\(#item-sel-toolbar\) :is\(#toast, #toast-behind\) \{ bottom: 102px; \}/.test(inboxCss), 'toasts lift above the selection toolbar');
  for (const selector of ['.ibx-big', '.ibx-ghost', '.ibx-ai', '.ibx-ap', '.ibx-pick', '.ibx-mi']) {
    const rule = inboxCss.match(new RegExp(`\\n${selector.replace('.', '\\.')} \\{[^}]*\\}`));
    ok(rule && /(?:^|\s|;)(?:min-)?height: (?:4[4-9]|5\d)px/.test(rule[0]), `${selector} is at least 44 px tall`);
  }
  ok(/\.ibx-acts \{[^}]*opacity: 0;[^}]*\}[\s\S]*\.ibx-row:hover \.ibx-acts,\n\.ibx-row:focus-within \.ibx-acts \{ opacity: 1;/.test(inboxCss), 'row actions show on hover and on keyboard focus');
  ok(/@media \(hover: none\) \{\n\s*\.ibx-row \.ibx-acts \{ opacity: 1;/.test(inboxCss), 'touch screens always see the row actions');
}

function testLocales() {
  const start = newtab.indexOf('const I18N = {');
  const end = newtab.indexOf('\n};', start);
  const i18n = vm.runInNewContext(`(${newtab.slice(newtab.indexOf('{', start), end + 2)})`);
  const used = new Set([...inboxSection.matchAll(/tr\(\s*'(inbox\.[\w.]+)'/g)].map(match => match[1]));
  [...inboxSection.matchAll(/'(inbox\.[\w.]+)'/g)].forEach(match => used.add(match[1]));
  const defined = Object.keys(i18n.en).filter(key => key.startsWith('inbox.'));
  ok(used.size >= 15, 'the Inbox strings were found');
  eq(defined.filter(key => !used.has(key)), [], 'no unused inbox.* string');
  for (const key of used) {
    ok(typeof i18n.en[key] === 'string' && i18n.en[key], `${key} exists in English`);
    ok(typeof i18n['zh-TW'][key] === 'string' && i18n['zh-TW'][key], `${key} exists in zh-TW`);
    const vars = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    eq(vars(i18n['zh-TW'][key]), vars(i18n.en[key]), `${key} keeps the same placeholders`);
  }
  ok(!Object.entries(i18n['zh-TW']).some(([key, value]) => key.startsWith('inbox.') && /数据|默认|保存|添加|设置|搜索|文件夹/.test(value)), 'zh-TW Inbox copy avoids Mainland terms');
  eq([i18n['zh-TW']['inbox.moveToSpace'], i18n['zh-TW']['nav.inbox']], ['移到空間', '收件匣'], 'zh-TW keeps 空間 and 收件匣');
  for (const key of ['plan.leftToSort', 'plan.sortKeys', 'plan.skip', 'plan.inboxClear', 'plan.backToToday', 'plan.lane.today', 'plan.lane.week', 'plan.lane.someday', 'plan.tally.today', 'plan.tally.week', 'plan.tally.someday', 'plan.tally.archive', 'action.saveTab', 'empty.importBookmarks', 'library.moreActions']) {
    ok(inboxSection.includes(`'${key}'`) && i18n['zh-TW'][key], `${key} is reused, in both languages`);
  }
}

function testCi() {
  ok(/for f in [^\n]*scripts\/inbox-page-contract-test\.js/.test(ci), 'CI syntax-checks this suite');
  ok(/run: node scripts\/inbox-page-contract-test\.js/.test(ci), 'CI runs this suite');
}

async function main() {
  testModel();
  testLabels();
  testPickerFilterAndDrop();
  await testSharedDecide();
  await testTriageFlow();
  testBuilders();
  testWiring();
  testFeaturesKept();
  testStyles();
  testLocales();
  testCi();
  console.log(`Inbox page contracts passed: ${checks} checks (Sort queue and Skip rotation, tally, labels, picker filter, drop index, shared planSortDecide, triage hold and Undo return, header and card built in a VM, routes, features kept, motion, locales, CI)`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
