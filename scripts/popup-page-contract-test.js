'use strict';

// Contract test for the toolbar popup built from the 2026-11 canvas board
// (Popup.dc.html): the current-tab card whose Save morphs into a check and bumps
// the Inbox count, the destination chip with its list, the window's tab rows,
// the More menu, and the Save window / Hibernate / Save tab sheets. Production
// slices run in node:vm against small fakes; the receipt-gated save flows
// themselves are covered by popup-locate-contract-test.js.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const popupJs = read('popup.js');
const popupHtml = read('popup.html');
const popupCss = read('popup.css');
let checks = 0;
const plain = value => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.deepEqual(plain(actual), expected, message); checks += 1; };

function slice(startMarker, endMarker, label) {
  const start = popupJs.indexOf(startMarker);
  const end = popupJs.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${label} must remain extractable`);
  return popupJs.slice(start, end);
}

const captureTargetSource = slice('function popupCaptureError(', '\nfunction updateDestination', 'Capture target helpers');
const destinationSource = slice('function updateDestination() {', '\nfunction renderSearchShortcutHint', 'Destination chip');
const groupNameSource = slice('function popupGroupDisplayName(', '\nfunction loadHibernatePrefs', 'Group display name');
const titleHitSource = slice('function popupTitleWithHit(', '\nfunction renderTabs', 'Search hit marker');
const selectionSource = slice('function updateSelectionUi(', '\nfunction isVisiblePopupControl', 'Selection status');
const sectionSource = slice('function isVisiblePopupControl(', '\nasync function quickCapture', 'Sheet stack');
const pickerSaveSource = slice('async function saveFromPicker(', '\nfunction popupLocateRecoveryRouteMatches', 'Save tab sheet save');
const uiSource = slice('function restartAnimation(', '\n// Receipts use the one notification style', 'Popup UI helpers');
const i18nSource = slice('const I18N = {', '\nlet all =', 'Popup locale table');

function fakeElement(id = '', initial = []) {
  const classes = new Set(initial);
  const attrs = {};
  return {
    id,
    textContent: '',
    title: '',
    dataset: {},
    attrs,
    style: { props: {}, setProperty(name, value) { this.props[name] = value; } },
    inert: false,
    disabled: false,
    children: [],
    focused: 0,
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      toggle: (name, on) => { if (on ?? !classes.has(name)) classes.add(name); else classes.delete(name); },
      contains: name => classes.has(name),
      list: () => [...classes].sort(),
    },
    setAttribute(name, value) { attrs[name] = String(value); },
    getAttribute(name) { return attrs[name]; },
    replaceChildren(...nodes) { this.children = nodes; this.textContent = nodes.map(node => (typeof node === 'string' ? node : node.textContent)).join(''); },
    appendChild(node) { this.children.push(node); return node; },
    insertBefore(node) { this.children.push(node); return node; },
    focus() { this.focused += 1; },
    contains: () => false,
    queried: {},
    querySelector(selector) { return (this.queried[selector] ||= fakeElement(selector)); },
  };
}

function fakeDocument() {
  return {
    activeElement: null,
    createElement: () => fakeElement(),
    querySelectorAll: () => [],
  };
}

function testBoardMarkup() {
  ok(/<header id="popup-header" class="ph">/.test(popupHtml), 'the registry header stays the popup chrome');
  ok(/id="open-more"[^>]*aria-label="More"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/.test(popupHtml), 'More is a menu button');
  ok(/id="open-full"[^>]*aria-label="Open Locus"/.test(popupHtml), 'Open Locus is a labelled icon button');
  const menu = popupHtml.slice(popupHtml.indexOf('id="more-menu"'), popupHtml.indexOf('<section id="main-section"'));
  eq((menu.match(/role="menuitem"/g) || []).length, 3, 'the More menu keeps its three actions');
  ok(['more-save-current', 'more-import-bookmarks', 'more-shortcuts'].every(id => menu.includes(`id="${id}"`)), 'Save current tab, Import bookmarks and Keyboard shortcuts stay one click away');
  ok(/id="destination-chip"[^>]*aria-label="Save to"[^>]*aria-haspopup="listbox"[^>]*aria-expanded="false"[^>]*aria-controls="dest-list"/.test(popupHtml), 'the destination chip opens a listbox');
  ok(/id="destination-count" class="bub hidden" aria-hidden="true"/.test(popupHtml), 'the red count bubble sits in the chip');
  ok(/id="hero-save" class="hsave"[\s\S]*class="hsave-check"[\s\S]*class="burst"/.test(popupHtml), 'Save carries its check and its burst');
  eq((popupHtml.slice(popupHtml.indexOf('class="burst"'), popupHtml.indexOf('</span>', popupHtml.indexOf('class="burst"'))).match(/<i /g) || []).length, 6, 'the burst has six particles');
  ok(/id="dest-list" class="dlist hidden" role="listbox"/.test(popupHtml), 'one destination list serves every chip');
  for (const [id, close] of [['save-window-section', 'sw-back'], ['save-to-section', 'stg-back'], ['hibernate-section', 'hib-back']]) {
    ok(new RegExp(`<section id="${id}" class="popup-view popup-sheet hidden" role="dialog" aria-modal="true"`).test(popupHtml), `${id} is a modal sheet`);
    ok(new RegExp(`id="${close}" class="qx sheet-close"[^>]*data-pop-title="close"`).test(popupHtml), `${id} closes with a labelled close button, not a Back arrow`);
  }
  ok(/id="sheet-scrim" class="sheet-scrim" aria-hidden="true"/.test(popupHtml), 'one scrim sits behind the sheets');
  ok(/class="bar">\s*<button id="qs-all"[\s\S]*<button id="hib-open"/.test(popupHtml), 'Save window and Hibernate live in the bottom bar');
  ok(/id="pop-toast"[\s\S]*<span class="toast-acts">\s*<button id="pop-toast-undo"[^>]*>[\s\S]*<button id="pop-toast-move"[^>]*aria-haspopup="listbox"[^>]*aria-controls="dest-list"[\s\S]*<button id="pop-toast-action"[\s\S]*<\/span>\s*<button id="pop-toast-close"[^>]*aria-label="Dismiss"[\s\S]*id="pop-toast-drain"/.test(popupHtml),
    'the receipt has Undo, Move (opening the Group list) and its action in that order, then a close button and a drain bar');
  ok(/<svg class="tm-undo"/.test(popupHtml), 'an undone receipt shows the undo arrow in its circle');
  for (const gone of ['id="more-section"', 'class="pfoot"', 'class="info-card"', 'class="view-titlebar"', '>←<', 'hibernateExplainer', 'sw-mode-desc', 'moreLocalProof', 'id="destination-card"', 'profile-initial']) {
    ok(!popupHtml.includes(gone), `the board drops the stacked chrome: ${gone}`);
  }
  ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(popupHtml), 'icons are inline SVG, never emoji');
  for (const match of popupHtml.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const text = match[2].replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim();
    if (!text && /<svg/.test(match[2])) ok(/aria-label="[^"]+"/.test(match[1]), `icon-only button has a name: ${match[1].slice(0, 40)}`);
  }
}

function testLocales() {
  const ctx = vm.createContext({});
  vm.runInContext(`${i18nSource}\nglobalThis.I = I18N;`, ctx);
  const { en } = ctx.I;
  const zh = ctx.I['zh-TW'];
  for (const key of ['thisTab', 'saveTo', 'inboxName', 'destinationChip', 'savedTo', 'locate', 'clearSelection', 'clearSearch', 'dismiss', 'nothingToHibernate', 'saveTabNamed', 'hibernateTabNamed', 'close', 'tags',
    'undo', 'move', 'moveTo', 'undone', 'savedItemChanged', 'changeConflict', 'changeFailed', 'changeUnknown']) {
    ok(key in en && key in zh && typeof en[key] === typeof zh[key], `${key} exists in English and zh-TW`);
  }
  eq([en.undo, en.move, en.undone, zh.undo, zh.move, zh.moveTo, zh.undone], ['Undo', 'Move', 'Undone', '復原', '移動', '移到', '已復原'],
    'the one-click receipt says Undo and Move in the new tab’s words');
  ok(!('quickCaptureSourceOpen' in en) && !('quickCaptureSourceOpen' in zh), 'the durable "tab stayed open" card copy left with the one-click receipt');
  for (const key of ['hibernateExplainer', 'moreSubtitle', 'moreLocalProof', 'saveCurrentTabDesc', 'importBookmarksDesc', 'keyboardShortcutsDesc', 'saveLinksOnlyDesc', 'saveLinksGroupDesc', 'saveQueueDesc', 'viewing', 'idle', 'currentWindow', 'hibernateWindow', 'back', 'options', 'change', 'saved', 'suggestedTags']) {
    ok(!(key in en) && !(key in zh), `${key} left with the stacked views`);
  }
  eq([en.savedTo('Inbox'), zh.savedTo(zh.inboxName), en.locate, zh.locate], ['Saved to Inbox', '已儲存到「收件匣」', 'Locate', '查看位置'], 'the save receipt names where the tab went');
  eq([en.destinationChip('Research › Inbox', 3), zh.destinationChip('研究 › 收件匣', 3), en.destinationChip('Research › Reading', 0)],
    ['Save to Research › Inbox, 3 waiting', '儲存到「研究 › 收件匣」，有 3 項待整理', 'Save to Research › Reading'], 'the chip names its destination and what waits there');
  eq([en.selectedCount(2), zh.selectedCount(2), zh.saveLinksOnly, zh.saveQueue], ['2 selected', '已選取 2 個', '只存連結', '閱讀佇列'], 'short labels follow the board');
}

function testDestinationChip() {
  const els = {};
  const $ = id => (els[id] ||= fakeElement(id));
  let target = null;
  const ctx = vm.createContext({
    $, document: fakeDocument(),
    findCaptureTarget: () => target,
    tr: (key, ...args) => (key === 'inboxName' ? 'Inbox' : `${key}:${args.join('|')}`),
  });
  vm.runInContext(`${groupNameSource}\n${destinationSource}\nglobalThis.api = { updateDestination, popupInboxWaiting, popupTargetPath };`, ctx);
  target = { cat: { name: 'Research' }, group: { name: 'Inbox', items: [{}, {}, {}] } };
  eq(ctx.api.updateDestination(), 3, 'an Inbox destination reports what waits in it');
  eq([$('destination-name').textContent, $('destination-chip').title, $('destination-count').textContent, $('destination-count').classList.contains('hidden'), $('destination-wrap').classList.contains('hidden')],
    ['Inbox', 'Research › Inbox', '3', false, false], 'the narrow chip names the Group with the red bubble; the full path is its tooltip');
  eq($('destination-chip').attrs['aria-label'], 'destinationChip:Research › Inbox|3', 'the chip names its destination for screen readers');
  target = { cat: { name: 'Research' }, group: { name: 'Reading', items: [{}] } };
  eq([ctx.api.updateDestination(), $('destination-count').classList.contains('hidden')], [0, true], 'other Groups carry no bubble: red only means waiting');
  target = null;
  eq([ctx.api.updateDestination(), $('destination-wrap').classList.contains('hidden')], [0, true], 'no destination hides the chip');
  const hits = vm.createContext({ esc: value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;') });
  vm.runInContext(`${titleHitSource}\nglobalThis.hit = popupTitleWithHit;`, hits);
  eq([hits.hit('Local-first <b> software', 'first'), hits.hit('Kyoto', '')], ['Local-<mark class="hit">first</mark> &lt;b> software', 'Kyoto'], 'search marks the hit and escapes the title');
}

function uiContext(overrides = {}) {
  const els = {};
  const $ = id => (els[id] ||= fakeElement(id));
  const calls = { restart: [], toasts: [], sections: [], persist: 0, closeLayer: 0, updates: [] };
  const ctx = vm.createContext({
    $, els, calls, console,
    document: fakeDocument(),
    tr: (key, ...args) => (args.length ? `${key}:${args.join('|')}` : key),
    esc: value => String(value),
    savedTabUrls: new Set(),
    activeTabId: 7,
    heroSavedTabId: null,
    popupCapturePending: false,
    locateResultVisible: false,
    locateRecoveryRoute: null,
    windowSaveRecoveryIntent: null,
    windowSaveResultMessage: '',
    quickCaptureRecoveryIntent: null,
    quickCaptureResultMessage: '',
    openLayer: null,
    destinationOverrideGroupId: null,
    windowSaveTargetGroupId: null,
    hibernateTargetGroupId: null,
    state: null,
    toast: (message, options) => calls.toasts.push([message, options || {}]),
    showSection: id => calls.sections.push(id),
    setQuickCaptureDoneAction: () => {},
    persistPopupState: () => { calls.persist += 1; return Promise.resolve(); },
    updateDestination: () => 0,
    stubWindowDestination: () => calls.updates.push('window'),
    updateHibernateDestination: () => calls.updates.push('hibernate'),
    startCapture: () => {},
    all: [],
    ...overrides,
  });
  vm.runInContext(`${captureTargetSource}\n${groupNameSource}\n${uiSource}\nrestartAnimation = (el, name) => globalThis.calls.restart.push([el.id, name]);\nclosePrevious = closeFloatingLayer;\ncloseFloatingLayer = options => { globalThis.calls.closeLayer += 1; return closePrevious(options); };
updateWindowDestination = stubWindowDestination;`, ctx);
  return ctx;
}

function testSaveMorphAndCount() {
  let waiting = 2;
  const ctx = uiContext({ updateDestination: () => waiting });
  ctx.$('destination-count').textContent = '2';
  waiting = 3;
  vm.runInContext(`markTabSaved({ id: 7, url: 'https://example.test/a' })`, ctx);
  eq([ctx.heroSavedTabId, ctx.$('hero-save').classList.contains('done'), ctx.$('hero-save').attrs['aria-label']], [7, true, 'savedTitle'], 'saving the current tab turns Save into a check');
  eq(ctx.calls.restart, [['destination-count', 'is-bumping'], ['hero-save', 'is-celebrating']], 'the Inbox count bumps and the check bursts, each restarted');
  ok(ctx.savedTabUrls.has('https://example.test/a'), 'the saved URL marks its row from now on');
  ctx.calls.restart.length = 0;
  ctx.$('destination-count').textContent = '3';
  const row = fakeElement('row');
  row.querySelector = () => null;
  ctx.$('ptabs').querySelector = () => row;
  vm.runInContext(`markTabSaved({ id: 9, url: 'https://example.test/b' })`, ctx);
  eq([row.classList.contains('is-saved'), row.children.length, row.children[0].className, ctx.calls.restart], [true, 1, 'pti-mark is-new', []],
    'a saved row gets its green mark; an unchanged count does not bump');
}

function captureFixture({ withInbox = true, remember = true } = {}) {
  return {
    activeWsId: 'ws',
    settings: { captureRememberLast: remember },
    workspaces: [{
      id: 'ws',
      activeCatId: 'research',
      categories: [
        { id: 'research', name: 'Research', groups: withInbox ? [{ id: 'inbox', name: 'Inbox', color: '#9a9db0', items: [] }, { id: 'reading', name: 'Reading', color: '#6c63ff', items: [] }] : [{ id: 'reading', name: 'Reading', color: '#6c63ff', items: [] }] },
        { id: 'trip', name: 'Kyoto trip', groups: [{ id: 'food', name: 'Food', color: 'not a colour', items: [] }] },
      ],
    }],
  };
}

function testDestinationList() {
  const ctx = uiContext({ state: captureFixture() });
  const options = vm.runInContext(`popupDestinationOptions('destination').map(o => [o.group.id, o.selected, o.proposed])`, ctx);
  eq(options, [['inbox', true, false], ['reading', false, false], ['food', false, false]], 'the list offers every Group and marks the current one');
  eq(vm.runInContext(`[popupGroupColor({ color: '#6c63ff' }), popupGroupColor({ color: 'red; x' })]`, ctx), ['#6c63ff', 'var(--pp-muted)'], 'only a hex Group colour reaches the style');
  vm.runInContext(`chooseDestination('destination', popupDestinationOptions('destination')[2])`, ctx);
  eq([ctx.destinationOverrideGroupId, ctx.state.settings.captureLastTarget, ctx.calls.persist, ctx.calls.restart.at(-1)],
    ['food', { workspaceId: 'ws', categoryId: 'trip', groupId: 'food' }, 1, ['destination-name', 'is-swapping']],
    'picking from the chip changes this popup\'s destination and, with remember-last on, the next quick save');
  const forget = uiContext({ state: captureFixture({ remember: false }) });
  vm.runInContext(`chooseDestination('destination', popupDestinationOptions('destination')[1])`, forget);
  eq([forget.destinationOverrideGroupId, 'captureLastTarget' in forget.state.settings, forget.calls.persist], ['reading', false, 0], 'with remember-last off the choice stays with this popup');
  vm.runInContext(`chooseDestination('window', popupDestinationOptions('window')[1])`, ctx);
  eq([ctx.windowSaveTargetGroupId, ctx.calls.updates.at(-1), ctx.calls.persist], ['reading', 'window', 1], 'the Save window chip changes only the window save');
  vm.runInContext(`chooseDestination('hibernate', popupDestinationOptions('hibernate')[0])`, ctx);
  eq([ctx.hibernateTargetGroupId, ctx.calls.updates.at(-1)], ['inbox', 'hibernate'], 'the Hibernate chip changes only where hibernated links are saved');
  const proposed = uiContext({ state: captureFixture({ withInbox: false }) });
  const first = vm.runInContext(`(() => { const o = popupDestinationOptions('destination')[0]; return [o.proposed, o.selected, o.group.name]; })()`, proposed);
  eq(first, [true, true, 'Inbox'], 'a Space without an Inbox still offers the Inbox the first save creates');
  proposed.destinationOverrideGroupId = 'reading';
  vm.runInContext(`chooseDestination('destination', { proposed: true, ws: state.workspaces[0], cat: state.workspaces[0].categories[0], group: { name: 'Inbox' } })`, proposed);
  eq([proposed.destinationOverrideGroupId, proposed.calls.persist], [null, 0], 'choosing the proposed Inbox returns to the default destination');
}

function testOneFloatingLayer() {
  const ctx = uiContext({ state: captureFixture() });
  const menuItems = [fakeElement('m1'), fakeElement('m2')];
  ctx.$('more-menu').querySelectorAll = () => menuItems;
  ctx.$('more-menu').contains = () => false;
  ctx.$('dest-list').contains = () => false;
  ctx.$('dest-list').querySelector = () => null;
  ctx.$('popup').getBoundingClientRect = () => ({ left: 0, top: 0, width: 380, bottom: 600 });
  ctx.$('destination-chip').getBoundingClientRect = () => ({ left: 30, top: 150, width: 200, bottom: 194 });
  ctx.$('destination-chip').isConnected = true;
  ctx.$('open-more').isConnected = true;
  vm.runInContext(`openMoreMenu()`, ctx);
  eq([ctx.openLayer.kind, ctx.$('open-more').attrs['aria-expanded'], ctx.$('more-menu').classList.contains('hidden'), menuItems[0].focused], ['menu', 'true', false, 1], 'More opens its menu and focuses the first action');
  vm.runInContext(`openDestinationList('destination')`, ctx);
  eq([ctx.openLayer.kind, ctx.$('more-menu').classList.contains('hidden'), ctx.$('open-more').attrs['aria-expanded'], ctx.$('destination-chip').attrs['aria-expanded']],
    ['list', true, 'false', 'true'], 'opening the destination list closes the menu: one floating layer at a time');
  eq([ctx.$('dest-list').dataset.side, ctx.$('dest-list').style.top, ctx.$('dest-list').children.length], ['below', '200px', 3], 'the list drops below its chip with every Group');
  vm.runInContext(`openDestinationList('destination')`, ctx);
  eq([ctx.openLayer, ctx.$('dest-list').classList.contains('hidden'), ctx.$('destination-chip').focused], [null, true, 1], 'the chip toggles its list closed and keeps focus');
}

async function testReceiptLocate() {
  const intent = { workspaceId: 'ws', itemId: 'item', sourceTabId: 7, closeSource: true };
  const saved = `{ cat: { name: 'Research' }, group: { name: 'Inbox' }, item: { title: 'A page' }, intent: ${JSON.stringify(intent)} }`;
  for (const closed of [true, false]) {
    const ctx = uiContext({ runQuickCaptureAction: async action => { ctx.calls.toasts.push([`run:${action}`, {}]); return closed; } });
    ctx.$('save-context').textContent = 'stale';
    await vm.runInContext(`locateFromSaveReceipt(${saved})`, ctx);
    eq([ctx.quickCaptureRecoveryIntent.closeSource, ctx.quickCaptureRecoveryIntent.itemId, ctx.$('save-context').textContent, ctx.$('stg-open-locus').textContent, ctx.calls.toasts[0][0]],
      [false, 'item', '', 'openSavedItem', 'run:open'],
      'Locate on a receipt asks the worker to open the saved item and never to close the source; the path waits for its receipt');
    eq([ctx.calls.sections, ctx.locateResultVisible], closed ? [[], false] : [['save-to-section'], true],
      closed ? 'a finished Locate leaves the popup to close' : 'an unfinished Locate keeps its retry in the result sheet');
  }
  const busy = uiContext({ runQuickCaptureAction: async () => false });
  busy.popupCapturePending = true;
  const outcome = await vm.runInContext(`locateFromSaveReceipt(${saved})`, busy);
  eq([outcome, busy.calls.toasts.map(([message, options]) => [message, options.tone]), busy.calls.sections, busy.quickCaptureRecoveryIntent],
    ['keep', [['captureBusy', 'warning']], [], null], 'Locate waits while another save is being confirmed and keeps its receipt');
}

// One-click Save (Kai, 2026-11-06): the receipt toast carries Undo, Move and
// Locate. Undo and Move go through the same receipt-gated write as the save
// (persistPopupState here), and Undo removes exactly the saved item.
function oneClickFixture() {
  const state = captureFixture();
  const [inbox, reading] = state.workspaces[0].categories[0].groups;
  inbox.items.push({ id: 'earlier', type: 'tab', title: 'Earlier', url: 'https://earlier.test/' });
  inbox.items.push({ id: 'saved', type: 'tab', title: 'A page', url: 'https://example.test/a' });
  reading.items.push({ id: 'kept', type: 'tab', title: 'Kept', url: 'https://example.test/a' });
  state.settings.captureLastTarget = { workspaceId: 'ws', categoryId: 'research', groupId: 'inbox' };
  state.archive = [{ kind: 'item', data: { id: 'old' } }];
  return state;
}

function oneClickContext(state, { persist = () => Promise.resolve({ ok: true }), pending = false } = {}) {
  const log = { persisted: [], recoveries: [], renders: 0, done: [], runs: [] };
  const ctx = uiContext({
    state,
    heroSavedTabId: 7,
    log,
    beginPopupCapture: () => !pending,
    finishPopupCapture: () => {},
    clonePopupState: () => plain(ctx.state),
    persistPopupState: () => { log.persisted.push(plain(ctx.state)); return persist(); },
    recoverCaptureWriteFailure: async (error, snapshot, options) => { log.recoveries.push([error.code, plain(options)]); ctx.state = snapshot; },
    popupCaptureDestinationTabUrls: items => new Set(items.filter(item => item?.type === 'tab').map(item => item.url)),
    renderTabs: () => { log.renders += 1; },
    setQuickCaptureDoneAction: value => log.done.push(value),
    runQuickCaptureAction: async action => { log.runs.push([action, plain(ctx.quickCaptureRecoveryIntent)]); return true; },
  });
  // Move applies Save's own duplicate rule, so the real one runs here.
  vm.runInContext(slice('function filterPopupCaptureTabs(', '\nfunction popupCaptureError(', 'Duplicate URL rule'), ctx);
  return ctx;
}

function oneClickReceipt(ctx, closeSource = true) {
  const intent = { workspaceId: 'ws', itemId: 'saved', sourceTabId: 7, sourceWindowId: 1, sourceWasActive: true, expectedUrl: 'https://example.test/a', closeSource };
  vm.runInContext(`globalThis.receipt = showQuickSaveReceipt({ cat: state.workspaces[0].categories[0], group: state.workspaces[0].categories[0].groups[0], item: state.workspaces[0].categories[0].groups[0].items[1], intent: ${JSON.stringify(intent)}, result: { destination: { groupName: 'Inbox' } } })`, ctx);
  return ctx.calls.toasts.at(-1);
}

const withoutItem = (state, groupIndex, itemId) => {
  const copy = plain(state);
  const group = copy.workspaces[0].categories[0].groups[groupIndex];
  group.items = group.items.filter(item => item.id !== itemId);
  return copy;
};

async function testOneClickReceipt() {
  const state = oneClickFixture();
  const before = plain(state);
  const ctx = oneClickContext(state);
  const [message, options] = oneClickReceipt(ctx);
  eq([message, options.tone, typeof options.undo, typeof options.move, options.actionLabel, typeof options.action],
    ['savedTo:inboxName', 'success', 'function', 'function', 'locate', 'function'],
    'a one-click save is confirmed by the receipt toast: where it went, Undo, Move and Locate');

  const undone = await options.undo();
  eq(ctx.log.persisted.length, 1, 'Undo writes once, through the receipt-gated state write');
  eq(ctx.state, withoutItem(before, 0, 'saved'),
    'Undo removes exactly the saved item: the other Inbox item, the same URL in another Group, the remembered destination and the archive stay');
  eq([undone.message, undone.tone, undone.glyph, ctx.heroSavedTabId, ctx.log.renders], ['undone', 'info', 'undo', null, 1],
    'the receipt turns into "Undone", the Save check goes back to Save and the rows repaint');
  ok(ctx.savedTabUrls.has('https://example.test/a') && !ctx.savedTabUrls.has('https://missing.test/'), 'a URL still saved in another Group keeps its row mark');

  const again = await options.undo();
  eq([again.message, again.tone, ctx.log.persisted.length], ['savedItemChanged', 'warning', 1], 'a second Undo finds nothing to remove and writes nothing');

  for (const [label, change] of [
    ['changed URL', s => { s.workspaces[0].categories[0].groups[0].items[1].url = 'https://elsewhere.test/'; }],
    ['duplicate id', s => { s.workspaces[0].categories[1].groups[0].items.push({ id: 'saved', type: 'tab', url: 'https://example.test/a' }); }],
    ['other Workspace', s => { s.workspaces.push({ id: 'ws2', categories: [{ id: 'c2', name: 'Other', groups: [{ id: 'g2', name: 'Inbox', items: [s.workspaces[0].categories[0].groups[0].items.pop()] }] }] }); }],
  ]) {
    const changed = oneClickFixture();
    change(changed);
    const snapshot = plain(changed);
    const guarded = oneClickContext(changed);
    const [, guardedOptions] = oneClickReceipt(guarded);
    const outcome = await guardedOptions.undo();
    eq([outcome.message, guarded.log.persisted.length, plain(guarded.state)], ['savedItemChanged', 0, snapshot], `Undo leaves an item that changed in Locus alone (${label})`);
  }

  const rejected = oneClickContext(oneClickFixture(), { persist: () => Promise.reject(Object.assign(new Error('conflict'), { code: 'LOCUS_STATE_CONFLICT' })) });
  const [, rejectedOptions] = oneClickReceipt(rejected);
  const rejectedOutcome = await rejectedOptions.undo();
  eq([rejectedOutcome, rejected.log.recoveries, rejected.state, rejected.heroSavedTabId], [null, [['LOCUS_STATE_CONFLICT', { change: true }]], oneClickFixture(), 7],
    'a rejected Undo rolls back, reports a failed change (not a failed save) and keeps the check');

  const busy = oneClickContext(oneClickFixture(), { pending: true });
  const [, busyOptions] = oneClickReceipt(busy);
  eq([await busyOptions.undo(), busy.log.persisted.length], ['keep', 0], 'Undo waits while another save is being confirmed');
}

async function testOneClickMoveAndLocate() {
  const state = oneClickFixture();
  const before = plain(state);
  const ctx = oneClickContext(state);
  const [, options] = oneClickReceipt(ctx);
  ctx.$('pop-toast').getBoundingClientRect = () => ({ left: 14, top: 420, width: 352, bottom: 518 });
  ctx.$('popup').getBoundingClientRect = () => ({ left: 0, top: 0, width: 380, bottom: 600 });
  ctx.$('dest-list').contains = () => false;
  ctx.$('dest-list').querySelector = () => null;
  const pins = [];
  ctx.pinPopupToast = value => pins.push(value);
  eq(options.move(), 'keep', 'Move keeps the receipt while its list is open');
  eq([ctx.openLayer.mode, ctx.$('dest-list').attrs['aria-label'], ctx.$('dest-list').dataset.side, ctx.$('dest-list').style.bottom, pins],
    ['move', 'moveTo', 'above', '186px', [true]], 'Move opens the Group list above the receipt, named Move to, and pins the receipt');
  const options3 = vm.runInContext(`popupDestinationOptions('move').map(o => [o.group.id, o.selected, o.proposed])`, ctx);
  eq(options3, [['inbox', true, false], ['reading', false, false], ['food', false, false]], 'the Move list offers every Group and marks the one holding the item');

  const moved = await vm.runInContext(`moveQuickSave(receipt, 'food')`, ctx);
  const expected = withoutItem(before, 0, 'saved');
  expected.workspaces[0].categories[1].groups[0].items.push(before.workspaces[0].categories[0].groups[0].items[1]);
  eq(ctx.state, expected, 'Move takes the saved item out of its Group and into the picked one, nothing else');
  eq([moved.message, moved.tone, moved.keepActions, ctx.log.persisted.length, vm.runInContext('receipt.group.id', ctx), vm.runInContext('receipt.groupName', ctx)],
    ['savedTo:Food', 'success', true, 1, 'food', 'Food'], 'the receipt now names the new Group and keeps Undo, Move and Locate');
  eq(await vm.runInContext(`moveQuickSave(receipt, 'food')`, ctx), 'keep', 'moving into the same Group writes nothing');
  eq(ctx.log.persisted.length, 1, 'a no-op move writes nothing');

  await options.undo();
  eq(ctx.state, withoutItem(before, 0, 'saved'), 'Undo after Move removes the item from where it moved to');

  vm.runInContext(`closeFloatingLayer()`, ctx);
  eq([ctx.openLayer, pins], [null, [true, false]], 'closing the Move list unpins the receipt');

  // Review finding R3-6: Undo takes the item back, so a Move list open over
  // the receipt closes first instead of offering a move that can only fail.
  {
    const layered = oneClickContext(oneClickFixture());
    const [, layeredOptions] = oneClickReceipt(layered);
    layered.$('pop-toast').getBoundingClientRect = () => ({ left: 14, top: 420, width: 352, bottom: 518 });
    layered.$('popup').getBoundingClientRect = () => ({ left: 0, top: 0, width: 380, bottom: 600 });
    layered.$('dest-list').contains = () => false;
    layered.$('dest-list').querySelector = () => null;
    layered.pinPopupToast = () => {};
    layeredOptions.move();
    eq(layered.openLayer?.mode, 'move', 'the Move list is open over the receipt');
    const undone = await layeredOptions.undo();
    eq([undone.message, layered.openLayer, vm.runInContext('quickSaveMoveReceipt', layered), layered.$('dest-list').classList.contains('hidden')],
      ['undone', null, null, true], 'Undo closes the Move list and forgets its receipt (finding R3-6)');
    ok(/closeQuickSaveMove\(\{ restoreFocus: true \}\);\s*runPopupToastAction\(front, front\.undo\);/.test(popupJs),
      'Ctrl Z / Cmd Z closes the Move list first, handing focus to the receipt so it follows the result');
  }

  // Review finding R3-8: Move follows "Skip duplicate URLs" exactly as Save
  // does. Reading already holds https://example.test/a in the fixture.
  for (const dedupe of [true, false]) {
    const dup = oneClickContext(oneClickFixture());
    if (!dedupe) dup.state.settings.captureDeduplicate = false;
    oneClickReceipt(dup);
    const before = plain(dup.state);
    const outcome = await vm.runInContext(`moveQuickSave(receipt, 'reading')`, dup);
    const copies = dup.state.workspaces[0].categories[0].groups[1].items.filter(item => item.url === 'https://example.test/a').length;
    if (dedupe) {
      eq([outcome.message, outcome.tone, outcome.keepActions, dup.log.persisted.length, plain(dup.state), copies], ['alreadySaved', 'info', true, 0, before, 1],
        'with Skip duplicate URLs on, Move into a Group that holds the page writes nothing and says "Already saved", as Save does; Undo, Move and Locate stay (finding R3-8)');
    } else {
      eq([outcome.message, dup.log.persisted.length, copies], ['savedTo:Reading', 1, 2], 'with it off, Move puts the copy in, as Save would');
    }
  }
  ok(/if \(!filterPopupCaptureTabs\(\[found\.item\], destination\.group\.items\)\.length\) return \{ message: tr\('alreadySaved'\), tone: 'info', keepActions: true \};\s*found\.group\.items\.splice\(found\.index, 1\);/.test(popupJs),
    'Move checks Save\'s duplicate rule before it takes the item out of its Group');

  for (const closeSource of [true, false]) {
    const locate = oneClickContext(oneClickFixture());
    const [, locateOptions] = oneClickReceipt(locate, closeSource);
    await locateOptions.action();
    eq([locate.log.runs[0][0], locate.log.runs[0][1].closeSource, locate.log.done.at(-1)], ['open', closeSource, closeSource],
      closeSource ? 'Locate on a one-click receipt opens the item and passes close-after-save on, as the card it replaced did'
        : 'with close-after-save off, Locate never asks to close the source');
  }
}

async function testPickerSave() {
  const results = [];
  for (const [accepted, cardShown, tabId] of [[true, false, 7], [true, false, 9], [true, true, 9], [false, false, 7]]) {
    const els = {};
    const $ = id => (els[id] ||= fakeElement(id));
    $('stg-locate').checked = true;
    const calls = { saves: [], marked: [], reset: [] };
    const ctx = vm.createContext({
      $, calls, activeTabId: 7, locateResultVisible: false,
      resolveGroupById: () => ({ ws: 'ws', cat: 'cat', group: 'group' }),
      doSave: async (ws, cat, group, tab, options) => { calls.saves.push(options); if (cardShown) ctx.locateResultVisible = true; return accepted; },
      markTabSaved: tab => calls.marked.push(tab.id),
      resetToMain: target => calls.reset.push(target.id),
      toast: () => {},
      tr: key => key,
    });
    vm.runInContext(pickerSaveSource, ctx);
    await vm.runInContext(`saveFromPicker('ws', 'cat', 'group', { id: ${tabId} })`, ctx);
    results.push([calls.saves[0].locate, calls.marked, calls.reset]);
  }
  eq(results, [
    [true, [7], ['hero-save']],
    [true, [9], ['ps']],
    [true, [9], []],
    [true, [], []],
  ], 'the Save tab sheet saves to the picked Group with its Locate choice, then returns to the check unless a result needs an answer');
}

function testSheetsOverMain() {
  const focusLog = [];
  const toggles = [];
  const control = id => ({ id, isConnected: true, disabled: false, closest: () => null, focus: () => focusLog.push(id) });
  const sections = {};
  for (const id of ['main-section', 'save-window-section', 'save-to-section', 'hibernate-section']) {
    sections[id] = { id, inert: false, classList: { toggle: (name, on) => toggles.push([id, name, on]) }, querySelectorAll: () => [control(`${id}-first`)] };
  }
  const header = { inert: false };
  const ctx = vm.createContext({
    requestAnimationFrame: callback => callback(),
    document: { activeElement: control('hib-open') },
    $: id => sections[id] || (id === 'popup-header' ? header : id === 'ps' ? control('ps') : null),
    activeSection: 'main-section',
    sectionHistory: [],
  });
  vm.runInContext(sectionSource, ctx);
  vm.runInContext(`showSection('hibernate-section')`, ctx);
  eq([sections['main-section'].inert, header.inert, toggles.some(([id]) => id === 'main-section'), toggles.find(([id]) => id === 'hibernate-section')[2]],
    [true, true, false, false], 'a sheet opens over the main view, which stays visible but out of reach');
  eq(focusLog.at(-1), 'hibernate-section-first', 'focus moves into the sheet');
  vm.runInContext(`returnToPreviousSection()`, ctx);
  eq([sections['main-section'].inert, header.inert, focusLog.at(-1)], [false, false, 'hib-open'], 'closing the sheet returns focus to its opener');
}

function testSelectionResetsScope() {
  for (const [selected, expectScopeReset] of [[0, true], [2, false]]) {
    const els = {};
    const $ = id => (els[id] ||= fakeElement(id));
    const active = fakeElement('scope-active');
    active.dataset.val = 'selected';
    const selectedButton = fakeElement('scope-selected');
    $('hib-scope').querySelector = selector => (selector === '.active' ? active : selectedButton);
    const scopes = [];
    const ctx = vm.createContext({
      $, all: [],
      document: fakeDocument(),
      selectedTabIds: new Set(Array.from({ length: selected }, (_, index) => index + 1)),
      tr: (key, ...args) => `${key}:${args.join('|')}`,
      setHibernateScope: value => scopes.push(value),
    });
    vm.runInContext(selectionSource, ctx);
    vm.runInContext('updateSelectionUi()', ctx);
    eq([scopes, $('clear-selection').classList.contains('hidden'), $('ptabs').classList.contains('picking'), selectedButton.disabled],
      [expectScopeReset ? ['window'] : [], selected === 0, selected > 0, selected === 0],
      selected ? 'a selection shows its count, Clear, and the select circles on every row' : 'an emptied selection never leaves Hibernate on a disabled "Selected (0)"');
  }
}

function testFlowWiring() {
  ok(/function startCapture\(tab\) \{\s*closeFloatingLayer\(\);\s*if \(popupAsksWhereToSave\(\)\) openSavePicker\(tab\);\s*else quickCapture\(tab\);/.test(popupJs),
    'Save is one click to the chip destination; only Ask where to save opens the Save tab sheet (Kai, 2026-11-06)');
  const asks = vm.createContext({ state: null });
  vm.runInContext(slice('function popupAsksWhereToSave(', '\nfunction startCapture', 'Ask where to save rule'), asks);
  const asked = value => { asks.state = { settings: value === undefined ? {} : { captureAskEveryTime: value } }; return vm.runInContext('popupAsksWhereToSave()', asks); };
  eq([asked(undefined), asked(false), asked(true), asked('true'), asked(1)], [false, false, true, false, false],
    'only a stored true asks where to save; a missing value is one click, and an existing true keeps asking');
  asks.state = null;
  eq(vm.runInContext('popupAsksWhereToSave()', asks), false, 'a profile without Locus data still saves in one click');
  ok(/if \(await doSave\(target\.ws, target\.cat, target\.group, tab, \{ quick: true \}\)\) markTabSaved\(tab\);/.test(popupJs), 'a quick save morphs Save after the state receipt');
  const doSave = slice('async function doSave(', '\nfunction loadHibernatePrefs', 'Single-tab save');
  const success = doSave.slice(doSave.lastIndexOf('if (closeRequested && closeResult.closed !== true)'));
  ok(/toast\(tr\(\x27savedTo\x27, popupGroupDisplayName\(group\)\), \{\s*tone: \x27success\x27,\s*actionLabel: tr\(\x27locate\x27\),\s*action: \(\) => locateFromSaveReceipt\(\{ cat, group, item, intent: acceptedItemIntent \}\),/.test(success),
    'a confirmed save says where the tab went and offers Locate');
  ok(!/setTimeout|window\.close/.test(success), 'the popup stays open after a save so the next tab can follow');
  ok(/if \(result\.ok\) \{\s*window\.close\(\);\s*return true;/.test(popupJs), 'Locate reports when it finished and closed the popup');
  ok(/if \(event\.key === \x27Escape\x27\) \{\s*event\.preventDefault\(\);\s*if \(locateResultVisible\) window\.close\(\);\s*else if \(closeFloatingLayer\(\{ restoreFocus: true \}\)\) return;\s*else if \(activeSection !== \x27main-section\x27\) returnToPreviousSection\(\);\s*else if \(document\.activeElement === \$\(\x27ps\x27\) && \$\(\x27ps\x27\)\.value\) clearPopupSearch\(\);\s*else if \(!dismissToastForEscape\(\)\) window\.close\(\);/.test(popupJs),
    'Escape closes the newest layer first: list or menu, sheet, search text, receipt, then the popup');
  ok(/document\.addEventListener\(\x27pointerdown\x27, event => \{\s*if \(!openLayer\) return;[\s\S]{0,200}closeFloatingLayer\(\);/.test(popupJs), 'a press outside the open layer closes it');
  const hibernate = slice('async function hibernateSingle(', '\nasync function saveTabsBeforeHibernate', 'Hibernate actions');
  ok(!/await load\(\)/.test(hibernate) && (hibernate.match(/await refreshPopupWindow\(\)/g) || []).length === 2, 'hibernating refreshes the list in place: rows slide out, no loading card');
  ok(/\$\(\x27hib-open\x27\)\.onclick = async event => \{\s*const opener = event\.currentTarget;/.test(popupJs), 'Hibernate keeps its opener for focus return across the count read');
}

function testStyles() {
  const rule = selector => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(popupCss);
    assert.ok(match, `${selector} has a rule`);
    return match[1];
  };
  const px = (body, prop) => Number((new RegExp(`(?:^|[;\\s])${prop}:\\s*([\\d.]+)px`).exec(body) || [])[1] || 0);
  for (const selector of ['.hb', '.dchip', '.hsave', '.pti-save,\n.pti-hib', '.btn', '.more-tabs', '#sw-tag-input', '.sw-mode', '.go-inline']) {
    const body = rule(selector);
    ok(px(body, 'height') >= 44 || px(body, 'min-height') >= 44, `${selector.replace('\n', ' ')} is at least 44 px tall`);
  }
  ok(px(rule('.mi'), 'min-height') >= 44 && px(rule('.stg-row'), 'min-height') >= 44 && px(rule('.sw-row'), 'min-height') >= 44, 'menu rows, Group rows and switch rows are 44 px targets');
  ok(/\.qx::before \{ content: \x27\x27; position: absolute; inset: -6px; \}/.test(popupCss) && /\.toast-close::before \{ content: \x27\x27; position: absolute; inset: -6px; \}/.test(popupCss),
    'small close buttons reach 44 px through their hit area');
  const badgeUses = [...popupCss.matchAll(/([^{}]+)\{[^}]*var\(--pp-badge\)/g)].map(match => match[1].trim());
  eq(badgeUses, ['.bub'], 'red is only the count bubble that means something is waiting');
  ok(/\.hsave\.done \{[^}]*width: 44px[^}]*background: var\(--pp-saved\)/.test(popupCss) && /\.hsave \{[^}]*transition: width \.36s var\(--pp-spring\)/.test(popupCss), 'Save morphs into a green circle with a springy width');
  ok(/\.bub\.is-bumping \{ animation: pp-pop/.test(popupCss), 'the count bubble bumps');
  ok(/@starting-style \{\s*\.popup-sheet:not\(\.hidden\) \{ transform: translateY\(100%\); \}\s*\}/.test(popupCss) && /\.popup-sheet\.hidden \{[^}]*transition: transform \.22s[^}]*display \.22s allow-discrete/.test(popupCss),
    'sheets rise in and drop out without timers');
  ok(/#popup:has\(\.popup-sheet:not\(\.hidden\)\) \.sheet-scrim \{/.test(popupCss), 'the scrim follows the open sheet');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\s*\*, \*::before, \*::after \{ scroll-behavior: auto !important; animation: none !important; transition: none !important; \}/.test(popupCss)
    && /body\[data-anim="off"\] \*,[\s\S]{0,80}\{ animation: none !important; transition: none !important; \}/.test(popupCss), 'reduced motion and the app animation switch stop every popup animation');
  const durations = [...popupCss.matchAll(/(?:animation|transition)[^;{}]*?(\d*\.?\d+)s/g)].map(match => Number(match[1])).filter(value => value > 0 && value !== 5.2);
  ok(durations.every(value => value <= 0.8), `motion stays short (longest ${Math.max(...durations)} s besides the drain)`);
  ok(!/infinite/.test(popupCss.replace(/animation: pp-spin \.8s linear infinite/g, '')), 'nothing loops except a busy spinner');
  ok(px(rule('.pop-toast-action'), 'height') >= 44, 'receipt actions are 44 px targets');
  ok(/\.toast-acts \{ display: contents; \}/.test(popupCss)
    && /#pop-toast\[data-stacked="true"\] \{[^}]*flex-wrap: wrap/.test(popupCss)
    && /#pop-toast\[data-stacked="true"\] \.toast-acts \{[^}]*order: 1;[^}]*flex: 1 0 100%;[^}]*display: flex/.test(popupCss),
    'one action stays on the receipt line; Undo, Move and Locate wrap onto their own row under the message');
  ok(/#pop-toast\[data-glyph="undo"\] \.tm-undo \{ display: block; \}/.test(popupCss), 'the undone receipt shows its undo arrow');
}

(async () => {
  testBoardMarkup();
  testLocales();
  testDestinationChip();
  testSaveMorphAndCount();
  testDestinationList();
  testOneFloatingLayer();
  await testReceiptLocate();
  await testOneClickReceipt();
  await testOneClickMoveAndLocate();
  await testPickerSave();
  testSheetsOverMain();
  testSelectionResetsScope();
  testFlowWiring();
  testStyles();
  console.log(`Popup page contracts passed: ${checks} checks (board markup, locales, destination chip and list, Save morph and count bump, one floating layer, receipt Locate, one-click receipt with Undo / Move / Locate, Save tab sheet, sheets over main, selection scope reset, flow wiring, styles)`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
