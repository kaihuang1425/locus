'use strict';

// Contract test for the Space page (2026-11 canvas): the heading with its
// rolling item count and reminder chip, the Space actions, one switcher for the
// seven views with a sliding underline and a crossfade, Board columns and List
// groups built to the board with the shared Group actions, the inline reminder
// sheet over the existing reminder transactions, cards that drop in, and the
// visual layer of the other five views. Production slices run in node:vm;
// wiring and styles are checked in source.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const newtab = read('newtab.js');
const css = read('newtab.css');
const html = read('newtab.html');
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
function extractConst(name) {
  const start = newtab.indexOf(`const ${name} = `);
  assert.ok(start >= 0, `${name} is extractable`);
  const end = newtab.indexOf('\n};\n', start);
  const array = newtab.indexOf('\n];\n', start);
  const opener = newtab[newtab.indexOf('=', start) + 2];
  if (opener === '{') return newtab.slice(start, end + 3);
  if (opener === '[') return newtab.slice(start, array + 3);
  return newtab.slice(start, newtab.indexOf(';\n', start) + 1);
}
const spaceSection = newtab.slice(newtab.indexOf('// SPACE PAGE (2026-11 canvas)'), newtab.indexOf('// CANVAS VIEW (free positioning'));
const spaceCss = css.slice(css.indexOf('SPACE PAGE (2026-11 canvas)'));

const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const EN = {
  'groupAction.items': '{count} items',
  'groupAction.oneItem': '1 item',
};
const tr = (key, vars) => {
  if (EN[key]) return EN[key].replace(/\{(\w+)\}/g, (_, name) => String(vars?.[name] ?? ''));
  return vars ? `${key}:${JSON.stringify(vars)}` : key;
};

// ── Model: counts, rolls, reminder target, page memory, menus ────────
function testModel() {
  let now = 1_000_000;
  const context = vm.createContext({
    esc, tr,
    Date: { now: () => now },
    activeSearch: null, activeCalendar: null, activeGroupPage: null, activeLibraryMode: null, activeHome: false,
    activeCat: () => ({ id: 'space' }),
    spacePageSession: null,
    pendingReminderTime: (reminder, at) => (reminder.notified ? null : reminder.at),
    cmIcons: { edit: 'edit', clock: 'clock', delete: 'delete' },
  });
  vm.runInContext([
    extract('libraryRollMarkup'), extract('spaceItemsMarkup'), extract('spaceRollMarkup'), extract('spaceCountRoll'),
    extract('spaceItemsLabel'), extract('spaceReminderTarget'), extract('isSpacePageActive'), extract('spacePageState'),
    extract('spaceGroupMenu'), extract('spaceActionMenuItems'), extract('markSpaceArrivals'),
  ].join('\n'), context);

  eq(context.spaceItemsMarkup(16, null), '<span class="spc-num"><span class="ibx-roll"><span class="ibx-roll-stack"><span>16</span></span></span></span> items',
    'the heading count reads "16 items" with the number as its own rolling part');
  ok(/<span class="ibx-roll-stack is-up"><span>16<\/span><span>17<\/span><\/span>/.test(context.spaceItemsMarkup(17, 16)), 'a count that grew rolls up');
  eq(context.spaceItemsMarkup(1, 2), '1 item', 'one item reads in the singular (no roll)');
  EN['groupAction.items'] = '{count} 個項目';
  ok(/^<span class="spc-num">[\s\S]*<\/span> 個項目$/.test(context.spaceItemsMarkup(3, null)), 'the number keeps the locale’s own word order');
  EN['groupAction.items'] = '{count} items';
  ok(/<span style="animation-delay:-120ms" class="ibx-roll-stack is-up">/.test(context.spaceRollMarkup(5, 4, 120)), 'a repaint mid-roll carries the roll on with a negative delay');

  const session = { counts: new Map([['g', 4]]) };
  eq(context.spaceCountRoll(session, 'g', 5), { previous: 4, delay: 0 }, 'a changed count starts its roll');
  session.counts.set('g', 5);
  now += 150;
  eq(context.spaceCountRoll(session, 'g', 5), { previous: 4, delay: 150 }, 'the next paint inside 400 ms carries the roll on');
  now += 300;
  eq(context.spaceCountRoll(session, 'g', 5), { previous: null, delay: 0 }, 'after 400 ms the count rests');
  eq(context.spaceCountRoll(null, 'g', 5), { previous: null, delay: 0 }, 'no page memory, no roll');

  const pending = context.spaceReminderTarget({ reminders: [{ id: 'a', at: 10, notified: true }, { id: 'b', at: 900 }, { id: 'c', at: 300 }] });
  eq([pending.reminder.id, pending.at], ['c', 300], 'the chip shows the next pending reminder');
  const fired = context.spaceReminderTarget({ reminders: [{ id: 'a', at: 10, notified: true }] });
  eq([fired.reminder.id, fired.at], ['a', null], 'a fired reminder is still the sheet’s target, without a chip time');
  eq(context.spaceReminderTarget({}), null, 'no reminders, no target');

  ok(context.isSpacePageActive(), 'the board surface is the Space page');
  for (const flag of ['activeSearch', 'activeCalendar', 'activeGroupPage', 'activeLibraryMode', 'activeHome']) {
    context[flag] = flag === 'activeHome' ? true : {};
    ok(!context.isSpacePageActive(), `${flag} is not the Space page`);
    context[flag] = flag === 'activeHome' ? false : null;
  }
  const memory = context.spacePageState('space');
  ok(memory === context.spacePageState('space') && memory !== context.spacePageState('other'), 'one page memory per Space');
  eq(Object.keys(context.spacePageState('space')).sort(), ['catId', 'counts', 'groupRem', 'host', 'remAt', 'seenGroups', 'seenItems', 'sheet', 'todos', 'total', 'view'],
    'the memory holds what the last paint showed and the open sheet only');

  const opened = [];
  context.openSpaceSheet = (kind, id, opener) => opened.push([kind, id, opener]);
  const keep = { text: 'groupAction.edit', action: () => 'edit' };
  const mapped = context.spaceGroupMenu([keep, { text: 'groupAction.setReminder', icon: 'clock', action: () => 'picker' }], { id: 'g' }, 'more');
  ok(mapped[0] === keep, 'other Group actions are passed through unchanged');
  mapped[1].action();
  eq([mapped[1].icon, opened], ['clock', [['group', 'g', 'more']]], 'Set reminder opens the page’s reminder sheet for that group');

  const calls = [];
  context.openOrganizationName = (...args) => calls.push(['name', ...args]);
  context.openOrganizationDelete = (...args) => calls.push(['delete', ...args]);
  context.activeWs = () => ({ categories: [{ id: 'space' }, { id: 'other' }] });
  const menu = context.spaceActionMenuItems({ id: 'space', reminders: [{ id: 'r' }] }, 'actions');
  eq(menu.map(item => item.text || (item.sep ? '—' : '')), ['organization.renameMenu', 'reminder.editTitle…', '—', 'organization.space.delete'], 'Space actions: Rename, Edit reminder, then Delete space');
  menu[0].action(); menu[1].action(); menu[3].action();
  eq(calls, [['name', 'space', 'space', 'actions'], ['delete', 'space', 'space', 'actions']], 'Rename and Delete use the shared organization dialogs with the real opener');
  eq(opened[1], ['category', 'space', 'actions'], 'the reminder entry opens the Space reminder sheet');
  ok(menu[3].danger === true, 'Delete space is marked as the dangerous action');
  context.activeWs = () => ({ categories: [{ id: 'space' }] });
  eq(context.spaceActionMenuItems({ id: 'space' }, 'actions').map(item => item.text), ['organization.renameMenu', 'reminder.setTitle…'], 'the only Space offers no Delete; no reminder reads Set reminder');

  const card = id => ({ dataset: { id }, classList: new Set(), style: {} });
  const col = id => ({ dataset: { spcGid: id }, classList: new Set(), style: {} });
  const host = list => ({ querySelectorAll: selector => (selector === '.item[data-id]' ? list.filter(x => x.dataset.id) : list.filter(x => x.dataset.spcGid)) });
  for (const el of [card('a'), col('g')]) el.classList.add = el.classList.add.bind(el.classList);
  const page = { catId: 'space' };
  context.activeCat = () => ({ id: 'space', groups: [{ id: 'g', items: [{ id: 'a', type: 'todo', done: true }] }] });
  context.markSpaceArrivals(host([card('a'), col('g')]), page, true);
  const second = [card('a'), card('b'), col('g'), col('h')];
  now += 1000;
  context.markSpaceArrivals(host(second), page, false);
  ok(!second[0].classList.has('spc-drop') && second[1].classList.has('spc-drop'), 'only a card that was not on the last paint drops in');
  ok(!second[2].classList.has('spc-back') && second[3].classList.has('spc-back'), 'a new or restored group drops in too');
  now += 200;
  const third = [card('a'), card('b')];
  context.markSpaceArrivals(host(third), page, false);
  ok(third[1].classList.has('spc-drop') && third[1].style.animationDelay === '-200ms', 'a repaint while it drops carries the drop on from where it was');
  now += 1000;
  const fourth = [card('a'), card('b')];
  context.markSpaceArrivals(host(fourth), page, false);
  ok(!fourth[1].classList.has('spc-drop'), 'once landed, a card rests');
  const fresh = [card('a'), card('z')];
  context.markSpaceArrivals(host(fresh), page, true);
  ok(!fresh[1].classList.has('spc-drop'), 'a new view or a first paint drops nothing');
  eq(page.todos.get('g'), '1/1', 'the page remembers each group’s to-do progress for the tick');
}

// A minimal element: innerHTML is kept as text; controls are stand-ins that
// record their listeners.
function sandbox(extra = {}) {
  const calls = [];
  const controls = new Map();
  const control = selector => {
    if (!controls.has(selector)) {
      const listeners = {};
      controls.set(selector, {
        selector, listeners,
        dataset: {},
        addEventListener(type, fn) { listeners[type] = fn; },
        after(node) { calls.push(['after', selector, node?.marker || 'node']); },
        querySelector: inner => control(`${selector} ${inner}`),
        querySelectorAll: () => [],
        appendChild(node) { calls.push(['append', selector, node?.marker || node?.className || 'node']); },
        insertAdjacentHTML() {},
        click() { listeners.click?.({ stopPropagation() {}, currentTarget: this, target: { closest: () => null } }); },
      });
    }
    return controls.get(selector);
  };
  const elements = [];
  const context = vm.createContext(Object.assign({
    esc, tr, String, Map,
    document: {
      body: { classList: { contains: cls => cls === 'reorder-mode' && !!extra.reorderMode } },
      createElement: tag => {
        const node = {
          tag, className: '', dataset: {}, attributes: {}, innerHTML: '', props: {}, children: [], draggable: false, listeners: {},
          classList: { add() {}, contains: () => false },
          style: { setProperty(name, value) { node.props[name] = value; } },
          setAttribute(name, value) { node.attributes[name] = String(value); },
          addEventListener(type, fn) { node.listeners[type] = fn; },
          appendChild(child) { node.children.push(child); return child; },
          querySelector: selector => control(selector),
          querySelectorAll: () => [],
        };
        elements.push(node);
        return node;
      },
    },
    spacePageSession: extra.session || null,
    spaceSvg: name => `<svg data-icon="${name}"></svg>`,
    inboxDotsIcon: () => '<svg data-icon="dots"></svg>',
    groupHasReopenableSavedTab: group => group.items.some(item => item.type === 'tab'),
    spaceCountRoll: () => ({ previous: null, delay: 0 }),
    spaceRollMarkup: count => `<roll>${count}</roll>`,
    spaceItemsMarkup: count => `<roll>${count}</roll> items`,
    spaceItemsLabel: count => `${count} items`,
    identityGroupTarget: id => ({ workspace: { id: 'ws' }, space: { id: 'space' }, group: { id } }),
    openIdentityEditor: (...args) => calls.push(['identity', args[0], args[1], plain(args[2]), args[3]?.selector]),
    openGroupPage: id => calls.push(['page', id]),
    openGroupAll: (group, opener) => calls.push(['openAll', group.id, opener.selector]),
    addSidebarOrActiveTabToGroup: group => calls.push(['save', group.id]),
    openGroupRecordCreationMenu: (group, opener) => calls.push(['record', group.id, opener.selector]),
    groupActionMenuItems: (group, opener, options) => { calls.push(['menu', group.id, opener, Object.keys(options).sort(), options.includeRecordCreation]); return [{ text: 'groupAction.setReminder', action() {} }]; },
    spaceGroupMenu: (entries, group, opener) => { calls.push(['map', group.id, opener]); return entries; },
    bindBoardItemContextMenu: (head, getItems, options) => calls.push(['bind', head.selector, options.menuButton.selector, getItems]),
    spaceToggleGroup: (group, section) => calls.push(['toggle', group.id, section.className]),
    buildSpaceGroupMeta: () => null,
    buildSpaceSheet: (kind, group) => ({ marker: `sheet:${kind}:${group.id}` }),
    buildItem: item => ({ marker: `card:${item.id}` }),
    buildLvItem: item => ({ marker: `row:${item.id}` }),
    decorateSpaceCards: () => calls.push(['decorate']),
    makeGroupDropZone: (cards, section, group, list) => calls.push(['drop', cards.selector, section.className, group.id, list.length]),
    bindSpaceGroupReorder: (section, group, axis) => calls.push(['reorder', group.id, axis]),
    isInboxPageGroup: group => group.name === 'Inbox',
    buildSystemEmptyState: options => ({ marker: `empty:${options.kind}:${options.actions.length}` }),
    openCommandPalette() {}, importBookmarks() {},
    inboxSavedLabel: () => '14:14',
  }, extra.context || {}));
  vm.runInContext([extract('buildSpaceColumn'), extract('buildLvGroup')].join('\n'), context);
  return { context, calls, control, elements };
}

function testBoardColumn() {
  const group = {
    id: 'g', name: 'Chrome APIs', color: '#6C63FF', collapsed: false,
    items: [{ id: 'a', type: 'tab' }, { id: 't', type: 'todo', done: true }, { id: 'u', type: 'todo', done: false }],
  };
  const box = sandbox();
  const col = box.context.buildSpaceColumn(group);
  const html = col.innerHTML;
  ok(col.tag === 'section' && col.className === 'spc-col' && col.dataset.gid === 'g' && col.dataset.spcGid === 'g' && col.props['--spc-tint'] === '#6C63FF',
    'a column is a section with its group id and the group’s colour');
  ok(/<div class="spc-gh" role="group" aria-label="groupAction\.aria:\{&quot;name&quot;:&quot;Chrome APIs&quot;\}">/.test(html), 'the header names its group for the shared context menu');
  ok(/<button type="button" class="spc-ib spc-chev" data-act="toggle"[^>]*aria-expanded="true"[^>]*aria-label="groupAction\.collapseFor/.test(html), 'the chevron leads and names Collapse');
  ok(/<button type="button" class="spc-gdot" data-act="identity"[^>]*aria-label="groupAction\.editFor/.test(html), 'the colour dot is the one-click Edit group (symbol, name, colour)');
  ok(/<h2 class="spc-gh2"><button class="spc-gname" type="button" data-act="focus"[^>]*aria-label="Chrome APIs · groupAction\.openAsPage">Chrome APIs<\/button><\/h2>/.test(html),
    'the group name is a heading whose button opens the group page');
  ok(/<span class="spc-cnt"><span class="sr-only">3 items<\/span><span aria-hidden="true"><roll>3<\/roll><\/span><\/span>/.test(html), 'the count bubble rolls and is read as "3 items"');
  ok(/<span class="spc-tdc"><span class="sr-only">space\.todosDone:\{"done":1,"total":2\}<\/span><span class="spc-tdc-n" aria-hidden="true">1\/2<\/span><\/span>/.test(html.replace(/&quot;/g, '"')),
    'the to-do progress reads done of total');
  ok(/data-act="open-all"[^>]*aria-label="groupAction\.openAllIn[^"]*"(?![^>]*disabled)/.test(html), 'Open all is offered when a page can reopen');
  ok(/data-act="more"[^>]*aria-haspopup="menu" aria-expanded="false"/.test(html), 'More is a named menu button');
  const footer = html.slice(html.indexOf('<div class="spc-gf">'));
  eq((footer.match(/<button\b/g) || []).length, 2, 'the footer has exactly Save here and Add record');
  ok(/class="spc-fbtn" data-act="add-tab"[^>]*aria-label="groupAction\.saveHereFor[\s\S]*?groupAction\.saveHere/.test(footer), 'Save here leads and names its exact destination');
  ok(/class="spc-fbtn is-quiet" data-act="add-record"[^>]*aria-haspopup="menu" aria-expanded="false"[\s\S]*?groupAction\.addRecord/.test(footer), 'Add record is one named record menu');
  ok(!/data-act="add-(?:note|todo|stack)"|class="gcol-resize/.test(html), 'record kinds stay in the Add record menu; the grid sizes columns, so no resize handles');

  box.control('[data-act="add-tab"]').click();
  box.control('[data-act="add-record"]').click();
  box.control('[data-act="open-all"]').click();
  box.control('[data-act="focus"]').click();
  box.control('[data-act="identity"]').click();
  box.control('[data-act="toggle"]').click();
  const bind = box.calls.find(call => call[0] === 'bind');
  bind[3]('opener');
  eq(box.calls.filter(call => ['save', 'record', 'openAll', 'page', 'identity', 'toggle', 'menu', 'map'].includes(call[0])), [
    ['save', 'g'],
    ['record', 'g', '[data-act="add-record"]'],
    ['openAll', 'g', '[data-act="open-all"]'],
    ['page', 'g'],
    ['identity', 'group', 'edit', { workspaceId: 'ws', spaceId: 'space', groupId: 'g' }, '[data-act="identity"]'],
    ['toggle', 'g', 'spc-col'],
    ['menu', 'g', 'opener', ['includeRecordCreation', 'toggleCollapse'], false],
    ['map', 'g', 'opener'],
  ], 'every control routes through the established transaction or controller');
  eq([bind[1], bind[2]], ['.spc-gh', '[data-act="more"]'], 'More, right-click, ContextMenu and Shift+F10 share one Group menu');
  ok(box.calls.some(call => call[0] === 'drop' && call[1] === '.spc-cards' && call[3] === 'g' && call[4] === 3), 'the cards are one drop zone over the group’s items');
  ok(col.draggable === true && box.calls.some(call => call[0] === 'reorder' && call[2] === 'x'), 'columns reorder by drag, left or right');
  eq(box.calls.filter(call => call[0] === 'append').map(call => call[2]), ['card:a', 'card:t', 'card:u'], 'cards are the shared item cards, in stored order');

  const emptyGroup = sandbox().context.buildSpaceColumn({ id: 'e', name: 'Later', items: [] });
  ok(/disabled aria-disabled="true"/.test(emptyGroup.innerHTML), 'Open all is disabled when nothing can reopen');
  const inboxBox = sandbox();
  inboxBox.context.buildSpaceColumn({ id: 'i', name: 'Inbox', items: [] });
  eq(inboxBox.calls.filter(call => call[0] === 'append').map(call => call[2]), ['empty:inbox:2'], 'an empty Inbox keeps Add/Save and Import bookmarks; other empty groups rely on the footer');
  const folded = sandbox().context.buildSpaceColumn({ ...group, collapsed: true });
  ok(folded.className === 'spc-col is-folded' && /aria-expanded="false"[^>]*aria-label="groupAction\.expandFor/.test(folded.innerHTML), 'a collapsed group folds and its chevron names Expand');

  const sheetBox = sandbox({ session: { sheet: { kind: 'group', id: 'g', opening: true } } });
  sheetBox.context.buildSpaceColumn(group);
  ok(sheetBox.calls.some(call => call[0] === 'after' && call[1] === '.spc-gh' && call[2] === 'sheet:group:g'), 'the group’s open reminder sheet sits under its header');
}

function testListGroup() {
  const group = { id: 'g', name: 'Launch', color: '#FF8A3D', items: [{ id: 'a', type: 'tab', createdAt: 1 }, { id: 't', type: 'todo', done: false }] };
  const box = sandbox();
  const section = box.context.buildLvGroup(group);
  const html = box.elements.find(node => node.className === 'lv-group-hd spc-lgh').innerHTML;
  ok(section.className === 'lv-group spc-lg' && section.dataset.gid === 'g' && section.props['--spc-tint'] === '#FF8A3D', 'a List group keeps the lv-group hooks and the group’s colour');
  ok(/<button class="lv-group-name spc-gname" type="button" data-act="focus"[^>]*aria-label="Launch · groupAction\.openAsPage"/.test(html), 'the List name opens the group page');
  ok(/<span class="spc-cnt is-text"><span class="sr-only">2 items<\/span><span aria-hidden="true"><roll>2<\/roll> items<\/span><\/span>/.test(html), 'the List count keeps its localized words (the "items" context decision)');
  ok(/home\.previewType\.todo 0\/1/.test(html), 'List to-do progress keeps its visible label');
  ok(/<div class="lv-group-acts spc-lacts">[\s\S]*data-act="open-all"[\s\S]*data-act="add-tab"[\s\S]*groupAction\.saveHere[\s\S]*data-act="more"/.test(html), 'Open all, Save here and More stay visible in the List header');
  box.control('[data-act="more"]');
  const bind = box.calls.find(call => call[0] === 'bind');
  bind[3]('opener');
  const menu = box.calls.find(call => call[0] === 'menu');
  ok(JSON.stringify(menu[3]) === '["toggleCollapse"]' && menu[4] === undefined, 'List More keeps the record creation actions');
  ok(box.calls.some(call => call[0] === 'drop' && call[3] === 'g'), 'List rows are a drop zone');
  ok(!box.calls.some(call => call[0] === 'reorder'), 'List groups reorder only in reorder mode');
  const reorder = sandbox({ reorderMode: true });
  reorder.context.buildLvGroup(group);
  ok(reorder.calls.some(call => call[0] === 'reorder' && call[2] === 'y'), 'in reorder mode List groups drag up or down');
}

// ── The reminder sheet over the existing transactions ───────────────
async function testSheet() {
  let now = 5_000_000;
  const calls = [];
  const context = vm.createContext({
    Date: { now: () => now },
    spacePageSession: { sheet: { kind: 'group', id: 'g', ownerKey: 'col:g:more' } },
    findEntity: (kind, id) => ({ id, name: 'Launch', reminders: [{ id: 'r1', at: now + 60000 }] }),
    pendingReminderTime: reminder => reminder.at,
    createEntityReminderMutationContext: (kind, id, reminderId) => ({ kind, id, reminderId }),
    createEntityReminderRemovalContext: (kind, id, reminderId) => ({ kind, id, reminderId, removal: true }),
    commitEntityReminderMutation: async (context, changes) => { calls.push(['set', plain(context), changes.at]); return true; },
    commitEntityReminderRemoval: async context => { calls.push(['clear', plain(context)]); return true; },
    renderBoard: () => calls.push(['render']),
    toast: (msg, opts) => calls.push(['toast', msg, plain(opts)]),
    tr: key => key,
  });
  vm.runInContext([extract('spaceReminderTarget'), extract('spaceSheetPick'), extract('spaceSheetClear')].join('\n'), context);
  ok(await context.spaceSheetPick('group', 'g', 3600000), 'a quick time commits');
  eq(calls.shift(), ['set', { kind: 'group', id: 'g', reminderId: 'r1' }, now + 3600000], 'In 1 hour updates the shown reminder through commitEntityReminderMutation');
  ok(context.spacePageSession.sheet === null, 'the sheet closes before the transaction repaints');
  ok(await context.spaceSheetClear('group', 'g'), 'Clear commits');
  eq(calls.shift(), ['clear', { kind: 'group', id: 'g', reminderId: 'r1', removal: true }], 'Clear removes that reminder through commitEntityReminderRemoval');
  context.findEntity = () => ({ id: 'g', reminders: [] });
  context.createEntityReminderMutationContext = () => null;
  ok(!(await context.spaceSheetPick('group', 'g', 3600000)), 'a stale owner does not write');
  eq(calls, [['render'], ['toast', 'reminder.entityUnavailable', { danger: true }]], 'a stale owner repaints and says so');

  const sheet = extract('buildSpaceSheet');
  ok(/SPACE_QUICK_TIMES\.map\(\(\[offset, key\], index\) => `<button type="button" class="spc-sho" data-offset="\$\{offset\}" data-spc-focus="sheet:\$\{index\}"/.test(sheet), 'four quick times, each a 44 px option with its own focus key');
  ok(/data-spc-sheet="custom"[\s\S]*space\.reminderCustom/.test(sheet) && /spaceSheetCustom\(kind, id\)/.test(sheet), 'Pick a time… opens the full reminder picker');
  ok(/\$\{target \? `<button type="button" class="spc-sho is-clear" data-spc-sheet="clear"/.test(sheet), 'Clear is offered only when there is a reminder');
  ok(/if \(event\.key !== 'Escape'\) return;\n\s*event\.preventDefault\(\);\n\s*event\.stopPropagation\(\);\n\s*closeSpaceSheet\(\{ restoreFocus: true \}\);/.test(sheet), 'Escape closes the sheet (and only the sheet) and returns focus');
  eq(vm.runInNewContext(`${extractConst('SPACE_QUICK_TIMES')}; SPACE_QUICK_TIMES`), [[3600000, 'reminder.inOneHour'], [10800000, 'reminder.inThreeHours'], [86400000, 'reminder.tomorrow'], [604800000, 'reminder.nextWeek']],
    'the quick times are the reminder picker’s own four, with their strings');
  const custom = extract('spaceSheetCustom');
  ok(/openEntityReminderPickerOrReport\(kind, id, target\?\.reminder\?\.id, \{ opener \}\)/.test(custom), 'the full picker edits the same reminder with the real opener');
  const open = extract('openSpaceSheet');
  ok(/hideContextMenu\(\);/.test(open) && /closeSpaceSheet\(\{ restoreFocus: true \}\)/.test(open) && /focusSpaceKey\('sheet:0'\)/.test(open), 'opening closes any menu (one floating layer), toggles, and focuses the first time');
}

// ── Wiring: the page, the views, the shared hooks ───────────────────
function testWiring() {
  const board = extract('renderBoard');
  ok(/if \(!isSpacePageActive\(\)\) \{\n\s*document\.getElementById\('board'\)\.classList\.remove\('spc-mode'\);\n\s*if \(document\.body\.dataset\.page === 'space'\) delete document\.body\.dataset\.page;/.test(board), 'leaving the Space page drops its marks');
  ok(/if \(spacePageSession && !isSpacePageActive\(\)\) spacePageSession = null;/.test(board), 'leaving the Space page ends its memory');
  ok(/if \(renderSpacePage\(mode\)\) return;\n\s*const layout = LAYOUTS\[mode\] \|\| LAYOUTS\.board;\n\s*layout\.render\(\);/.test(board), 'the board surface renders through the Space page');
  ok(/let spacePageSession = null;/.test(newtab) && newtab.indexOf('let spacePageSession = null;') < newtab.indexOf('function renderBoard('), 'the memory is declared before any render reads it');
  for (const name of ['renderBoardView', 'renderListView', 'renderCanvasView', 'renderExplorerView', 'renderTimelineView', 'renderGalleryView', 'renderGraphView']) {
    ok(/^function \w+\(\) \{\n\s*const \$b = spaceViewHost\(\);/.test(extract(name)), `${name} draws into the Space page’s view`);
  }
  ok(/grid\.className = 'spc-board';\n\s*cat\.groups\.forEach\(g => grid\.appendChild\(buildSpaceColumn\(g\)\)\);/.test(extract('renderBoardView')), 'Board columns are the Space columns in a grid');
  ok(/wrap\.className = 'lv-wrap spc-list';\n\s*cat\.groups\.forEach\(g => wrap\.appendChild\(buildLvGroup\(g\)\)\);/.test(extract('renderListView')), 'List groups are the List panels');
  ok(!/add-col-btn|lv-add-row/.test(newtab), 'the add-group tile and row are gone; New group lives in the view bar');
  ok(/openIdentityEditor\('group', 'create', \{\n\s*workspaceId: workspace\?\.id,\n\s*spaceId: cat\?\.id,\n\s*\}, opener\);/.test(extract('spaceCreateGroup')), 'New group uses the identity controller');

  const page = extract('renderSpacePage');
  ok(/document\.body\.dataset\.page = 'space';\n\s*board\.classList\.add\('spc-mode'\);/.test(page), 'the page marks the body and the board');
  ok(/if \(page && page\.dataset\.cat !== String\(cat\.id\)\) page = null;/.test(page), 'the page keeps its heading and switcher between paints of one Space');
  ok(/if \(changed && !spaceReducedMotion\(\)\) \{\n\s*host\.classList\.add\('is-in'\);\n\s*previous\.classList\.add\('is-out'\);\n\s*previous\.setAttribute\('aria-hidden', 'true'\);\n\s*previous\.inert = true;\n\s*setTimeout\(\(\) => previous\.remove\(\), 200\);/.test(page),
    'a view change crossfades: the old view fades out, hidden and inert, then goes');
  ok(/views\.prepend\(host\);/.test(page), 'the new view comes first, so lookups find it before the leaving one');
  ok(/markSpaceArrivals\(host, session, changed \|\| session\.view == null\);/.test(page), 'arrivals are marked after each paint of the same view only');
  ok(/if \(keepScroll && board\.scrollTop !== keepScroll\) board\.scrollTo\(\{ top: keepScroll, behavior: 'instant' \}\);/.test(page), 'a repaint keeps the scroll position');
  ok(/if \(focusKey && !page\.contains\(document\.activeElement\)\) focusSpaceKey\(focusKey\);/.test(page), 'a repaint returns focus to the same control');

  const shell = extract('buildSpacePage');
  ok(/<p class="sr-only spc-live" aria-live="polite"><\/p>/.test(shell) && shell.indexOf('spc-live') < shell.indexOf('spc-hd'), 'the live count is first in the page (no window scroll from a hidden element at the end)');
  ok(/<h1 class="spc-title" id="space-title" tabindex="-1" data-spc-focus="title"><\/h1>/.test(shell), 'the Space name is the page heading');
  ok(/<div class="spc-tabs" role="tablist">[\s\S]*LAYOUT_ORDER\.map\(view => `<button type="button" role="tab" class="spc-tab" id="spc-tab-\$\{view\}" data-view="\$\{view\}" data-spc-focus="tab:\$\{view\}" aria-controls="space-view" aria-selected="false" tabindex="-1">/.test(shell),
    'all seven views are tabs in one tablist (the board shows them all)');
  ok(/<span class="spc-uline is-jump" aria-hidden="true"><\/span>/.test(shell) && /<div id="space-view" class="spc-views" role="tabpanel"><\/div>/.test(shell), 'one underline and one tab panel');
  ok(/if \(event\.key === 'ArrowRight'\) next = \(index \+ 1\) % order\.length;\n\s*else if \(event\.key === 'ArrowLeft'\)[\s\S]*Home'\) next = 0;\n\s*else if \(event\.key === 'End'\) next = order\.length - 1;[\s\S]*setViewMode\(order\[next\]\);\n\s*focusSpaceKey\(`tab:\$\{order\[next\]\}`\);/.test(shell),
    'arrows, Home and End move along the tabs and show the view');
  ok(/showAnchoredContextMenu\(more, items, \{ ariaLabel: tr\('space\.actionsFor'/.test(shell), 'Space actions open the shared anchored menu with a name');
  const sync = extract('syncSpacePage');
  ok(/tab\.setAttribute\('aria-selected', String\(selected\)\);\n\s*tab\.tabIndex = selected \? 0 : -1;/.test(sync), 'the chosen tab is selected and the only one in the tab order');
  ok(/newGroup\.hidden = !\['board', 'list'\]\.includes\(mode\);/.test(sync), 'New group shows on Board and List, as on the board');
  ok(/if \(session\.total != null && session\.total !== total\) live\.textContent = spaceItemsLabel\(total\);/.test(sync), 'a changed count is announced');
  const line = extract('placeSpaceUnderline');
  ok(/if \(line\.classList\.contains\('is-jump'\)\) \{\n\s*void line\.offsetWidth;\n\s*line\.classList\.remove\('is-jump'\);/.test(line), 'the underline appears in place on the first paint, then slides');
  ok(/el\.classList\.remove\(cls\);\n\s*void el\.offsetWidth;\n\s*el\.classList\.add\(cls\);/.test(extract('spaceRestart')), 'motion restarts the Today way');
  const toggle = extract('spaceToggleGroup');
  ok(/State\.snapshot\('Toggle collapse'\);\n\s*g\.collapsed = !g\.collapsed;[\s\S]*State\.persist\(\);/.test(toggle), 'collapse keeps its Undo snapshot');
  ok(/State\.snapshot\('Reorder groups'\);/.test(extract('bindSpaceGroupReorder')), 'group reorder keeps its Undo snapshot');
  ok(!/chrome\.storage/.test(spaceSection), 'the page never writes storage directly');

  ok(/`\.spc-col\[data-gid="\$\{value\}"\] \.spc-chev`,\n\s*`\.lv-group\[data-gid="\$\{value\}"\] \.lv-group-toggle`,/.test(extract('focusIdentityTarget')), 'group focus lands on the Space column chevron before the List fallback');
  ok(/add\(node\.closest\('\.spc-col'\)\?\.querySelector\(':scope > \.spc-gh \.spc-gname'\)\?\.textContent\);/.test(extract('applySearchFilter')), 'in: search matches Space column names');
  ok(/document\.querySelectorAll\('\.gcol, \.spc-col'\)\.forEach\(col => \{/.test(extract('applySearchFilter')), 'search hides Space columns with no match');
  ok(/opener\.closest\('#item-sel-toolbar, \.gcol-hd, \.spc-gh, \.lv-group-hd'\)/.test(extract('bulkSavedTabReopenAnchor')), 'Open all recovery anchors to the Space column header');
  ok(/`\.spc\[data-cat="\$\{id\}"\] \[data-spc-focus="space-rem"\]`,\n\s*`\.spc\[data-cat="\$\{id\}"\] \[data-spc-focus="space-more"\]`,\n\s*`\.cat-tab/.test(extract('focusEntityReminderOwnerFallback')),
    'after a Space reminder change focus returns to the page’s chip or Space actions, not the rail');
  ok(/focusTarget\(document\.querySelector\(`\.spc \[data-spc-rem-owner="group:\$\{id\}"\]`\)\)/.test(extract('focusEntityReminderOwnerFallback')), 'after a group reminder change focus returns to its chip');
  ok(/document\.querySelector\('\[data-spc-act="add-group"\]:not\(\[hidden\]\)'\),/.test(extract('focusIdentityFallback')), 'a cancelled or failed New group returns focus to New group');

  const timeline = extract('renderTimelineView');
  ok(!/'Scale'|'Now'|'Undated'|>Now</.test(timeline) && !/'Week of '/.test(extract('_tlBucketLabel')), 'the timeline has no hard-coded English left');
  ok(/ctrl\.className = 'tl-controls spc-seg';[\s\S]*aria-label', tr\('timeline\.scale'\)[\s\S]*data-spc-focus="tl:\$\{z\}" aria-pressed="\$\{z === timelineZoom\}">\$\{esc\(tr\(`timeline\.\$\{z\}`\)\)\}/.test(timeline), 'the scale is one pressed-button switch, localized');
  ok(/void ctrl\.offsetWidth;\n\s*ctrl\.style\.setProperty\('--spc-i', zoomIndex\);/.test(timeline) && /timelineShownZoom = timelineZoom;/.test(timeline), 'its thumb slides from the last scale to the new one');
  ok(/tl-now-time">\$\{esc\(planTimeLabel\(Date\.now\(\)\)\)\}/.test(timeline), 'Now carries the time');
  const gallery = extract('renderGalleryView');
  ok(!/'Open group page'|'Empty group'/.test(gallery) && /hd\.title = `\$\{g\.name\} · \$\{tr\('groupAction\.openAsPage'\)\}`;/.test(gallery), 'Gallery section headings are localized routes');
  const graph = extract('renderGraphView');
  ok(!/— open group page/.test(graph) && /light\(el\.dataset\.groupId\)/.test(graph) && /sizeGraphPills\(wrap\);/.test(graph), 'Graph hubs are pills that light their branch, localized');
  ok(!/[🗂📁📚📝☑☐🔗]/u.test(extract('renderExplorerView') + extract('explorerItemRow')), 'Explorer rows lead with tiles and icons, not emoji');
}

// ── Styles ──────────────────────────────────────────────────────────
function testStyles() {
  ok(spaceCss.length > 4000, 'the Space page layer is present');
  ok(!/(?:linear|radial|conic)-gradient\s*\(/.test(spaceCss), 'no CSS gradients (the canvas dots are an SVG image)');
  ok(/background-image: url\("data:image\/svg\+xml,/.test(spaceCss), 'the Canvas dot sheet is a local SVG pattern');
  ok(!/#sidebar\b/.test(spaceCss), 'the rail is left alone');
  ok(!/view-mode-btn|surface-toolbar/.test(html) && !/surface-toolbar|surface-layout/.test(css) && !/openLayoutMenu|updateViewModeButton/.test(newtab),
    'the view tabs replaced the Switch layout button and its menus (2026-11-06, page board)');
  ok(/body\[data-page="space"\] #topbar \.tb-left \{\n\s*position: absolute;/.test(spaceCss), 'the shell keeps only the search field, Save tab and More, as on the Inbox page');
  ok(/body:is\(\[data-page="inbox"\], \[data-page="space"\]\) #item-sel-toolbar \{/.test(css), 'the selection toolbar is the board’s dark bar here too');
  ok(/\.spc-uline \{[^}]*transform: translateX\(var\(--spc-ul-x, 0\)\);[^}]*transition: transform \.32s var\(--today-ease\), width \.32s var\(--today-ease\);/s.test(spaceCss), 'the underline slides in 320 ms');
  ok(/\.spc-vw \{ grid-area: 1 \/ 1;/.test(spaceCss) && /\.spc-vw\.is-in \{ animation: spc-vw-in \.26s/.test(spaceCss) && /\.spc-vw\.is-out \{ animation: spc-vw-out \.16s ease forwards; pointer-events: none; \}/.test(spaceCss), 'views share one cell and crossfade');
  ok(/\.is-folded > \.spc-fold \{ grid-template-rows: 0fr; \}/.test(spaceCss) && /\.is-folded > \.spc-fold > \.spc-fold-in \{ visibility: hidden;/.test(spaceCss), 'a folded group animates shut and leaves the tab order');
  ok(/\.spc \.item\.spc-drop \{ animation: spc-drop \.42s var\(--today-ease\), spc-land \.9s ease; \}/.test(spaceCss), 'a new card drops in and rings once');
  ok(/\.spc-board \{ display: grid; grid-template-columns: repeat\(auto-fill, minmax\(300px, 1fr\)\);/.test(spaceCss), 'Board columns wrap into a grid');
  for (const [selector, size] of [['\\.spc-ib', 'width: 44px'], ['\\.spc-ibtn', 'width: 44px'], ['\\.spc-sho', 'height: 44px'], ['\\.spc-fbtn', 'height: 44px'], ['\\.spc-newg', 'height: 44px'], ['\\.spc-tab', 'height: 48px']]) {
    ok(new RegExp(`\\n${selector} \\{[^}]*${size}`, 's').test(spaceCss), `${selector} keeps a 44 px target`);
  }
  ok(/\.spc \.item \.item-title\.item-primary::after,[\s\S]*?\{ content: ''; position: absolute; inset: 0;/.test(spaceCss), 'the whole card is its main action, as on the board');
  ok(/\n\.spc \.item > \.item-detail-meta \{ position: relative; z-index: 1;/.test(spaceCss), 'the Details… summary sits above the stretched open action, so it opens Details');
  ok(/\.spc \.item \.board-record-menu \{[^}]*position: absolute;[^}]*opacity: 0;/s.test(spaceCss) && /@media \(hover: none\) \{\n\s*\.spc \.item \.board-record-menu \{ opacity: 1; \}/.test(spaceCss), 'More is the card’s hover action; always shown on touch');
  ok(/@container \(max-width: 640px\) \{[\s\S]*\.spc-board \{ grid-template-columns: minmax\(0, 1fr\); \}[\s\S]*\.spc-gh \[data-act="open-all"\] \{ display: none; \}[\s\S]*\.spc \.spc-lg \.lv-row \.item:not\(\.stack\) \{\n\s*grid-template-columns: 28px minmax\(0, 1fr\);/.test(spaceCss),
    'at phone width columns take the full width and List titles get the row with their meta under them');
  ok(/@media \(forced-colors: active\) \{\n\s*\.spc-uline,\n\s*\.spc-thumb \{ background: Highlight; forced-color-adjust: none; \}/.test(spaceCss), 'the underline and the scale thumb survive forced colours');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n\s*\.spc, \.spc \*, \.spc \*::before, \.spc \*::after \{ animation: none !important; transition: none !important; \}/.test(spaceCss), 'reduced motion stops all motion on the page');
  ok(/function spaceReducedMotion\(\) \{\n\s*return typeof planReducedMotion === 'function'/.test(newtab), 'the crossfade also honours the app’s animation-off setting');
}

// ── Locales ─────────────────────────────────────────────────────────
function testLocales() {
  const start = newtab.indexOf('const I18N = {');
  const end = newtab.indexOf('\n};', start);
  const i18n = vm.runInNewContext(`(${newtab.slice(newtab.indexOf('{', start), end + 2)})`);
  const added = ['groupAction.openAllIn', 'space.actionsFor', 'space.reminderFor', 'space.reminderAt', 'space.reminderCustom', 'space.todosDone', 'space.next',
    'timeline.scale', 'timeline.day', 'timeline.week', 'timeline.month', 'timeline.now', 'timeline.undated', 'timeline.weekOf'];
  const vars = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const key of added) {
    ok(newtab.includes(`'${key}'`) || /timeline\.\$\{z\}/.test(newtab), `${key} is used`);
    ok(i18n.en[key] && i18n['zh-TW'][key], `${key} exists in English and zh-TW`);
    eq(vars(i18n['zh-TW'][key]), vars(i18n.en[key]), `${key} keeps the same placeholders`);
  }
  eq(added.map(key => i18n['zh-TW'][key]), [
    '開啟「{name}」的所有分頁', '「{name}」空間的操作', '為「{name}」設定提醒', '提醒：{time}', '自訂時間…', '待辦已完成 {done} 項，共 {total} 項', '下一步：{text}',
    '時間刻度', '日', '週', '月', '現在', '未標日期', '{date} 起的一週',
  ], 'zh-TW copy');
  ok(!added.some(key => /数据|默认|保存|添加|设置|搜索|文件夹|链接|视图/.test(i18n['zh-TW'][key])), 'zh-TW Space copy avoids Mainland terms');
  for (const key of ['layout.board', 'layout.list', 'layout.canvas', 'layout.explorer', 'layout.timeline', 'layout.gallery', 'layout.graph', 'groupAction.new', 'groupAction.saveHere', 'groupAction.addRecord']) {
    ok(i18n.en[key] && i18n['zh-TW'][key], `${key} (shown by the page) exists in both languages`);
  }
}

function testCi() {
  ok(/for f in [^\n]*scripts\/space-page-contract-test\.js/.test(ci), 'CI syntax-checks this suite');
  ok(/run: node scripts\/space-page-contract-test\.js/.test(ci), 'CI runs this suite');
}

async function main() {
  testModel();
  testBoardColumn();
  testListGroup();
  await testSheet();
  testWiring();
  testStyles();
  testLocales();
  testCi();
  console.log(`Space page contracts passed: ${checks} checks (counts and rolls, reminder target, page memory, Space and Group menus, arrivals, Board columns and List groups built in a VM with their exact controls, the reminder sheet over the reminder transactions, switcher, crossfade, shared hooks, the five views’ labels, motion and reduced motion, targets, phone layout, locales, CI)`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
