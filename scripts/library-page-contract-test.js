'use strict';

// Contract test for the Library page (2026-11 canvas): All links, Favorites and
// Read later as one page with a sliding view switch whose counts roll, the
// reading status, one filter and the sort, quiet rows with hover actions, the
// favourite burst, the Read later count tick, the read tick, folding rows, and
// receipts with Undo. Production slices run in node:vm; wiring and styles are
// checked in source.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const newtab = read('newtab.js');
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
function extractConst(name) {
  const start = newtab.indexOf(`const ${name} = `);
  assert.ok(start >= 0, `${name} is extractable`);
  const end = newtab.indexOf('\n};\n', start);
  const line = newtab.indexOf(';\n', start);
  return newtab.slice(start, newtab[newtab.indexOf('=', start) + 2] === '{' ? end + 3 : line + 1);
}
const librarySection = newtab.slice(newtab.indexOf('// ── Library page (2026-11 canvas)'), newtab.indexOf('function renderLibrarySurface('));
const libraryCss = css.slice(css.indexOf('LIBRARY PAGE (2026-11 canvas)'));

const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tr = (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key);

function workspace() {
  const tab = (id, extra = {}) => Object.assign({ id, type: 'tab', title: `Title ${id}`, url: `https://${id}.example/page`, createdAt: 100 }, extra);
  return {
    id: 'ws', name: 'My Workspace',
    categories: [{
      id: 'space', name: 'Research',
      groups: [{
        id: 'group', name: 'Storage', color: 'blue',
        items: [
          tab('a', { favorite: true }),
          tab('b', { readLaterAt: 200 }),
          tab('c', { readLaterAt: 300, readAt: 400 }),
          { id: 'stack', type: 'stack', name: 'Pile', items: [tab('d', { favorite: true, readLaterAt: 500 })] },
          { id: 'note', type: 'note', html: '<p>not a page</p>' },
        ],
      }],
    }],
  };
}

function testModel() {
  const context = vm.createContext({
    esc,
    activeSearch: null, activeCalendar: null, activeGroupPage: null, activeLibraryMode: 'all',
    activeWs: () => ({ id: 'ws' }),
    LIBRARY_LEDGER_MODES: ['all', 'favorites', 'read-later'],
    libraryPageSession: null,
  });
  vm.runInContext([
    extract('collectWorkspaceTabs'), extract('libraryModeCounts'), extract('libraryRollMarkup'),
    extract('libraryTitleMarkup'), extract('isLibraryPageActive'), extract('libraryPageState'),
    'globalThis.__session = () => libraryPageSession;',
  ].join('\n'), context);
  eq(context.libraryModeCounts(workspace()), { all: 4, favorites: 2, 'read-later': 2 },
    'the view switch counts every saved page (stacks included, notes not), the favourites, and the unread Read later queue');
  eq(context.libraryRollMarkup(4, null), '<span class="ibx-roll"><span class="ibx-roll-stack"><span>4</span></span></span>', 'the first paint does not roll');
  eq(context.libraryRollMarkup(4, 4), '<span class="ibx-roll"><span class="ibx-roll-stack"><span>4</span></span></span>', 'an unchanged count does not roll');
  eq(context.libraryRollMarkup(5, 4), '<span class="ibx-roll"><span class="ibx-roll-stack is-up"><span>4</span><span>5</span></span></span>', 'a higher count rolls up and rests on the new number');
  eq(context.libraryRollMarkup(3, 4), '<span class="ibx-roll"><span class="ibx-roll-stack is-down"><span>3</span><span>4</span></span></span>', 'a lower count rolls down and rests on the new number');
  eq(context.libraryTitleMarkup('Chrome storage <quota>', 'storage'), 'Chrome <mark class="lib-hit">storage</mark> &lt;quota&gt;', 'the filter match is marked and the rest escaped');
  eq(context.libraryTitleMarkup('Chrome Storage', 'STORAGE'), 'Chrome <mark class="lib-hit">Storage</mark>', 'matching ignores case and keeps the title’s own case');
  eq(context.libraryTitleMarkup('Plain <b>', ''), 'Plain &lt;b&gt;', 'no filter, no mark');
  eq(context.libraryTitleMarkup('Plain', 'zzz'), 'Plain', 'no match, no mark');
  ok(context.isLibraryPageActive(), 'All links is the Library page');
  context.activeLibraryMode = 'archive';
  ok(!context.isLibraryPageActive(), 'Archive keeps its own page');
  context.activeLibraryMode = 'read-later';
  context.activeSearch = {};
  ok(!context.isLibraryPageActive(), 'Search wins over the Library page');
  context.activeSearch = null;
  const session = context.libraryPageState('ws');
  ok(session === context.libraryPageState('ws') && session !== context.libraryPageState('other'), 'one page memory per workspace');
  eq(Object.keys(context.libraryPageState('ws')).sort(), ['counts', 'fx', 'holdRender', 'mode', 'query', 'seen', 'viewKey', 'wsId'], 'the memory holds the last counts, view and the landing write only');
}

// A minimal element: innerHTML is kept as text; controls are stand-ins that
// record their handlers.
function rowSandbox(extra = {}) {
  const calls = [];
  const controls = new Map();
  const control = selector => {
    if (!controls.has(selector)) {
      controls.set(selector, {
        selector,
        isConnected: true,
        rects: 1,
        getClientRects() { return { length: this.rects }; },
        hasAttribute: () => true,
      });
    }
    return controls.get(selector);
  };
  let menu = null;
  const context = vm.createContext(Object.assign({
    esc, tr,
    document: {
      createElement: () => {
        const node = {
          className: '', dataset: {}, attributes: {}, innerHTML: '', props: {},
          style: { setProperty(name, value) { node.props[name] = value; } },
          setAttribute(name, value) { node.attributes[name] = String(value); },
          querySelector(selector) {
            if (selector === '.library-star' && !/class="library-star/.test(node.innerHTML)) return null;
            if (selector === '.read-later-status' && !/class="read-later-status/.test(node.innerHTML)) return null;
            return control(selector);
          },
          querySelectorAll: () => [],
        };
        return node;
      },
    },
    INBOX_BURST_RAYS: [0, 45, 90, 135, 180, 225, 270, 315],
    inboxFavMarkup: () => '<span class="ibx-fav"></span>',
    inboxDotsIcon: () => '<svg></svg>',
    bindInboxFavicons() {},
    inboxSavedLabel: () => '14:14',
    reminderDotColor: color => `dot:${color}`,
    planSortMeta: item => ({ domain: new URL(item.url).hostname }),
    dispUrl: url => url.replace(/^https?:\/\//, ''),
    fmtTimeRelative: () => '2 days ago',
    libraryLedgerRowModel: (row, mode) => ({
      id: String(row.item.id), title: row.item.title, url: row.item.url, destination: 'My Workspace › Research › Group: Storage',
      openLabel: 'library.openPage', detailsLabel: 'library.viewDetails', age: '2 days ago',
      statusLabel: mode === 'read-later' ? (row.item.readAt ? 'library.markUnread' : 'library.markRead') : '',
    }),
    createLibraryRecoveryContext: () => ({ focusKey: 'focus-key' }),
    libraryRowFocusKey: () => 'fallback-key',
    activateLibraryRecovery: (recovery, action, opener) => { calls.push(['recovery', action, opener.selector]); return true; },
    pressLibraryGlide: () => calls.push(['press']),
    runLibraryLedgerMutation: (rows, index, mutation, options = {}) => {
      calls.push(['run', index, plain(options.opener ? { ...options, opener: options.opener.selector } : options)]);
      return mutation();
    },
    toggleFavorite: (item, opener, receipt) => { calls.push(['favorite', item.id, opener.selector, plain(receipt)]); return true; },
    toggleReadLater: (item, opener, receipt) => { calls.push(['later', item.id, opener.selector, plain(receipt)]); return true; },
    toggleReadStatus: (item, opener, receipt) => { calls.push(['read', item.id, opener.selector, plain(receipt)]); return true; },
    archiveSavedPage: (item, opener) => { calls.push(['archive', item.id, opener.selector]); return true; },
    bindBoardItemContextMenu: (row, getItems, options) => { menu = { getItems, button: options.menuButton.selector }; },
    cmIcons: { detail: 'detail', favorite: 'favorite', readLater: 'readLater', delete: 'delete', archive: 'archive' },
  }, extra));
  vm.runInContext([extractConst('LIBRARY_PATHS'), extract('librarySvg'), extract('libraryLaterSvg'), extract('libraryTitleMarkup'), extract('buildLibraryLedgerRow')].join('\n'), context);
  return { context, calls, control, menu: () => menu };
}

function testRow() {
  const ws = workspace();
  const group = ws.categories[0].groups[0];
  const row = item => ({ ws, cat: ws.categories[0], group, parents: [], item });
  let box = rowSandbox();
  const favourite = Object.assign(group.items[0], { readLaterAt: 150 });
  const rows = [row(favourite), row(group.items[1])];
  let built = box.context.buildLibraryLedgerRow(rows[0], { mode: 'all', status: 'all' }, rows, 0, { query: 'title', motion: 'is-rise', delay: 48 });
  ok(/^library-row lib-row is-rise$/.test(built.className) && built.attributes.role === 'listitem' && built.dataset.id === 'a' && built.dataset.libraryFocusKey === 'focus-key',
    'a row keeps the hook classes, its list role, id and focus key, and takes its entry motion');
  eq(built.props['--lib-d'], '48ms', 'rows rise in with a stagger');
  const html = built.innerHTML;
  ok(/<button class="library-primary lib-open" data-lib-focus="open:a" type="button" aria-label="library\.openPageFor:\{&quot;title&quot;:&quot;Title a&quot;\}"><span class="library-title lib-tt"><mark class="lib-hit">Title<\/mark> a<\/span>/.test(html),
    'the title is the named Open action and shows the filter match');
  ok(/<span class="lib-dot" style="--dot:dot:blue" aria-hidden="true"><\/span><span class="library-destination">My Workspace › Research › Group: Storage<\/span><span class="library-url">a\.example<\/span>/.test(html),
    'the meta line is the group colour, the full destination and the source domain');
  ok(/<span class="lib-when"><span class="lib-mark is-star">[\s\S]*<span class="lib-mark is-later">[\s\S]*<time datetime="[^"]+"><span class="sr-only">library\.savedWhen:\{&quot;time&quot;:&quot;2 days ago&quot;\}<\/span><span aria-hidden="true">14:14<\/span><\/time><\/span>/.test(html),
    'the date column carries the favourite and Read later marks and a short date, with the full "Saved …" for assistive tech');
  ok(/<div class="lib-acts">\s*<button class="library-details lib-text"[^>]*aria-label="library\.viewDetailsFor[^"]*">library\.viewDetails<\/button>\s*<button class="library-star lib-ai lib-star is-on" data-return-marker="favorite"[^>]*aria-pressed="true"[^>]*aria-label="itemAction\.removeFavorite">/.test(html),
    'hover actions lead with Details, then the pressed favourite star');
  ok(/<button class="lib-ai lib-later is-on" data-return-marker="read-later"[^>]*aria-pressed="true"[^>]*aria-label="itemAction\.removeReadLater">/.test(html), 'the bookmark shows the item is queued');
  ok(/<button class="lib-ai lib-archive" data-item-archive="row"[^>]*aria-label="library\.archiveNamed:\{&quot;title&quot;:&quot;Title a&quot;\}">/.test(html), 'Archive is a named icon button');
  ok(/<span class="lib-cap" aria-hidden="true">library\.openPage<span class="lib-kbd">↵<\/span><\/span>/.test(html), 'the Open hint is decoration only');
  ok(/<button class="library-more lib-ai lib-more" data-return-marker="more" data-item-archive="menu"[^>]*aria-haspopup="menu"[^>]*aria-label="library\.moreActions/.test(html), 'More stays an addressable menu owner');
  ok(!/lib-check|lib-burst|lib-fly|is-pop|is-sent/.test(html), 'no read tick outside Read later, and no motion without a landing write');

  // Handlers: the exact control opens, marks and archives, with Undo receipts.
  box.control('.library-primary').onclick();
  box.control('.library-details').onclick();
  box.control('.library-star').onclick();
  box.control('.lib-later').onclick();
  box.control('.lib-archive').onclick();
  const receipt = { undo: true, sub: 'a.example' };
  eq(box.calls, [
    ['press'], ['recovery', 'open', '.library-primary'],
    ['recovery', 'details', '.library-details'],
    ['run', 0, { itemRemains: true, action: 'favorite', fx: '', opener: '.library-star' }], ['favorite', 'a', '.library-star', receipt],
    ['run', 0, { itemRemains: true, action: 'later', fx: '', opener: '.lib-later' }], ['later', 'a', '.lib-later', receipt],
    ['run', 0, {}], ['archive', 'a', '.lib-archive'],
  ], 'Open presses the highlight, every write names its exact control, and the marker receipts offer Undo with the domain');

  // The row menu: Read later and Archive; Details and Favorite join only when
  // the row's actions are folded away.
  eq(box.menu().button, '.library-more', 'More, right-click and Shift+F10 share one menu');
  let items = box.menu().getItems(box.control('.library-more'));
  eq(items.map(item => item.text || 'sep'), ['itemAction.removeReadLater', 'sep', 'itemAction.archive'], 'with the hover actions on screen, More adds only Read later and Archive');
  box.control('.lib-acts').rects = 0;
  items = box.menu().getItems(box.control('.library-more'));
  eq(items.map(item => item.text || 'sep'), ['library.viewDetails', 'itemAction.removeFavorite', 'itemAction.removeReadLater', 'sep', 'itemAction.archive'], 'at phone width More also holds Details and Favorite');
  box.calls.length = 0;
  items[1].action();
  items[0].action();
  eq(box.calls, [
    ['run', 0, { itemRemains: true, action: 'more', fx: '', opener: '.library-more' }], ['favorite', 'a', '.library-more', receipt],
    ['recovery', 'details', '.library-more'],
  ], 'menu actions use More as their exact control, and focus returns to it');

  // Landing writes animate the control that made them.
  box = rowSandbox();
  built = box.context.buildLibraryLedgerRow(rows[1], { mode: 'all', status: 'all' }, rows, 1, { fx: { id: 'b', kind: 'favorite-on' } });
  ok(/library-star lib-ai lib-star is-pop/.test(built.innerHTML) && (built.innerHTML.match(/class="ibx-ray"/g) || []).length === 8, 'a new favourite pops with an eight-point burst');
  built = box.context.buildLibraryLedgerRow(rows[1], { mode: 'all', status: 'all' }, rows, 1, { fx: { id: 'b', kind: 'later-on' } });
  ok(/lib-ai lib-later is-on is-sent/.test(built.innerHTML) && /class="lib-fly"/.test(built.innerHTML), 'a page sent to Read later flies its bookmark toward the tab');
  built = box.context.buildLibraryLedgerRow(rows[1], { mode: 'all', status: 'all' }, rows, 1, { fx: { id: 'other', kind: 'later-on' } });
  ok(!/is-sent|lib-fly/.test(built.innerHTML), 'only the row whose write landed animates');

  // Read later: the round read tick leads, no star; Favorites unstar leaves.
  box = rowSandbox();
  const read = row(group.items[2]);
  built = box.context.buildLibraryLedgerRow(read, { mode: 'read-later', status: 'unread' }, [read], 0, { fx: { id: 'c', kind: 'read' } });
  ok(/is-read/.test(built.className) && /^\s*<button class="read-later-status lib-check is-on is-tick" data-return-marker="read-status" data-lib-focus="check:c" type="button" aria-pressed="true"[^>]*aria-label="library\.markUnread">/.test(built.innerHTML),
    'a read row leads with its filled tick, pressed, named for the next action');
  ok(!/library-star/.test(built.innerHTML) && !/lib-mark/.test(built.innerHTML), 'Read later rows have no favourite star and no marks');
  box.control('.read-later-status').onclick();
  eq(box.calls[0], ['run', 0, { itemRemains: false, action: 'status', fx: '', opener: '.read-later-status' }], 'in Unread a status change leaves the view');
  box = rowSandbox();
  built = box.context.buildLibraryLedgerRow(rows[0], { mode: 'favorites', status: 'all' }, rows, 0);
  box.control('.library-star').onclick();
  eq(box.calls[0], ['run', 0, { itemRemains: false, action: 'favorite', fx: '', opener: '.library-star' }], 'unstarring in Favorites leaves the view');
  box = rowSandbox();
  built = box.context.buildLibraryLedgerRow(rows[1], { mode: 'read-later', status: 'all' }, rows, 1);
  box.control('.lib-later').onclick();
  eq(box.calls[0], ['run', 1, { itemRemains: false, action: 'later', fx: '', opener: '.lib-later' }], 'removing from Read later leaves the queue');
}

// The write wrapper: a leaving row holds the repaint until it has folded.
async function testRunner() {
  const log = [];
  const session = { fx: null, holdRender: false };
  const context = vm.createContext({
    libraryPageSession: session,
    activeLibraryState: { mode: 'favorites' },
    activeLibraryMode: 'favorites',
    requestAnimationFrame(callback) { log.push('frame'); callback(); },
    focusLibraryLedgerTarget(id, action) { log.push(['focus', id, action]); },
    foldLibraryRow: async (id, opener) => { log.push(['fold', id, opener, session.holdRender]); return true; },
    renderBoard() { log.push(['render', session.holdRender, plain(session.fx)]); },
  });
  vm.runInContext(extract('runLibraryLedgerMutation'), context);
  const rows = [{ item: { id: 'one' } }, { item: { id: 'two' } }];
  let settle;
  const leaving = context.runLibraryLedgerMutation(rows, 0, () => new Promise(resolve => { settle = resolve; }), { itemRemains: false, action: 'favorite', fx: '', opener: 'star' });
  ok(session.holdRender && log.length === 0, 'while the write is pending a leaving row holds the repaint and nothing moves');
  settle(true);
  ok(await leaving, 'an accepted write resolves true');
  eq(log, [['fold', 'one', 'star', true], ['render', false, null], 'frame', ['focus', 'two', 'open']], 'the row folds, then one repaint, then focus moves to the neighbour');
  log.length = 0;
  const staying = context.runLibraryLedgerMutation(rows, 1, async () => {
    log.push(['write', plain(session.fx), session.holdRender]);
    return true;
  }, { itemRemains: true, action: 'later', fx: 'later-on', opener: 'bookmark' });
  ok(await staying, 'a write that keeps the row resolves true');
  eq(log, [['write', { id: 'two', kind: 'later-on' }, false], 'frame', ['focus', 'two', 'later']], 'a staying row names its landing animation to the repaint, holds nothing, and keeps focus on its control');
  ok(session.fx === null, 'the landing animation is consumed once');
  log.length = 0;
  ok(!(await context.runLibraryLedgerMutation(rows, 0, async () => false, { itemRemains: false })), 'a refused write resolves false');
  eq(log, [['render', false, null]], 'a refused leave repaints the row in place without folding or moving focus');
}

function testFold() {
  const timers = [];
  const classes = new Set();
  const control = {
    isConnected: true, attrs: { 'aria-pressed': 'false' }, cls: new Set(['lib-check']),
    hasAttribute: name => name === 'aria-pressed',
    getAttribute(name) { return this.attrs[name]; },
    setAttribute(name, value) { this.attrs[name] = value; },
    get classList() { const set = this.cls; return { toggle: (name, on) => (on ? set.add(name) : set.delete(name)), contains: name => set.has(name), add: name => set.add(name), remove: name => set.delete(name) }; },
    get offsetWidth() { return 44; },
  };
  const row = {
    isConnected: true, offsetHeight: 64, dataset: { id: 'x' }, style: {},
    contains: node => node === control,
    classList: { add: name => classes.add(name), contains: name => classes.has(name) },
    get offsetWidth() { return 900; },
  };
  let reduce = false;
  const context = vm.createContext({
    CSS: { escape: value => value },
    libraryPageSession: { glideId: 'x' },
    libraryPageRoot: () => ({ querySelector: () => row }),
    planReducedMotion: () => reduce,
    placeLibraryGlide: (page, target) => timers.push(['glide', target]),
    restartLibraryMotion: (el, cls) => el.classList.add(cls),
    setTimeout: (fn, ms) => { timers.push(ms); fn(); return 1; },
    Promise,
  });
  vm.runInContext(extract('foldLibraryRow'), context);
  return context.foldLibraryRow('x', control).then(done => {
    ok(done, 'the fold resolves once the row has gone');
    eq([control.attrs['aria-pressed'], control.cls.has('is-on'), control.cls.has('is-tick')], ['true', true, true], 'the read tick fills and pops before the row leaves');
    eq(timers, [220, ['glide', null], 300], 'a filled tick shows for 220 ms, the highlight leaves with the row, and the fold takes 300 ms');
    ok(classes.has('is-gone') && row.style.height === '64px', 'the row folds from its own height');
    reduce = true;
    return context.foldLibraryRow('x', control);
  }).then(done => {
    ok(done === false, 'with reduced motion the row does not fold; the repaint removes it at once');
  });
}

function testWiring() {
  const board = extract('renderBoard');
  ok(/if \(!isLibraryPageActive\(\)\) \{\n\s*document\.getElementById\('board'\)\.classList\.remove\('lib-mode'\);\n\s*if \(document\.body\.dataset\.page === 'library'\) delete document\.body\.dataset\.page;/.test(board),
    'leaving the page clears its marks; its own repaint keeps them, so the scroll never clamps');
  ok(/if \(libraryPageSession && !isLibraryPageActive\(\)\) libraryPageSession = null;/.test(board), 'leaving the page forgets its counts and view');
  ok(newtab.indexOf('let libraryPageSession = null;') < newtab.indexOf('function renderBoard('), 'the page memory is declared before any render can read it');
  const page = extract('renderLibraryLedgerSurface');
  ok(/document\.body\.dataset\.page = 'library';/.test(page) && /board\.classList\.add\('lib-mode'\);/.test(page) && /hideBreadcrumb\(\);/.test(page), 'the page marks itself and has no breadcrumb');
  ok(!/library-mode|read-later-mode|board\.innerHTML = '';\n\s*const titleKey/.test(page), 'the Library page no longer uses the Archive and Trash board class');
  ok(/if \(session\.holdRender && page\) return true;/.test(page), 'a folding row holds the repaint');
  ok(/const keepScroll = firstShow \? 0 : board\.scrollTop;[\s\S]*board\.scrollTo\(\{ top: keepScroll, behavior: 'instant' \}\)/.test(page), 'a repaint keeps the scroll position');
  ok(/if \(viewChanged\) \{\n\s*placeLibraryGlide\(page, null\);\n\s*board\.scrollTo\(\{ top: 0, behavior: 'instant' \}\);/.test(page), 'a new view starts at the top');
  ok(/active\.closest\('\[data-lib-focus\]'\)\?\.dataset\.libFocus[\s\S]*inboxFocus\(page\.querySelector\(`\[data-lib-focus="\$\{CSS\.escape\(focusKey\)\}"\]`\)\)/.test(page), 'focus returns to the same control after a repaint');
  ok(/if \(activeLibraryMode !== button\.dataset\.libMode\) openLibrarySurface\(button\.dataset\.libMode\);/.test(page), 'the view switch routes like the rail (the URL owns the mode)');
  ok(/modes\.style\.setProperty\('--lib-i', String\(LIBRARY_LEDGER_MODES\.indexOf\(currentMode\)\)\);/.test(page) && /status\.style\.setProperty\('--lib-i'/.test(page), 'the pills slide by index');
  ok(/if \(id === 'read-later' && s\.fx\?\.kind === 'later-on' && previous && counts\[id\] > previous\[id\]\) \{\n\s*restartLibraryMotion\(count, 'is-bump'\);/.test(page), 'the Read later count bumps when a page is sent to it');
  ok(/if \(s\.mode != null && s\.mode !== currentMode\) restartLibraryMotion\(title, 'is-swap'\);/.test(page), 'the heading swaps only when the view changes');
  ok(/const motion = changedView \? 'is-rise' : \(sameList && !s\.seen\.has\(String\(row\.item\.id\)\) \? 'is-back' : ''\);/.test(page), 'a new view rises in; a row brought back by Undo flashes in place');
  ok(/if \(event\.key === 'Escape' && event\.defaultPrevented\) \{\n\s*event\.stopPropagation\(\);/.test(page), 'Escape that cleared the filter does not also leave the page');
  ok(/card\.addEventListener\('pointerover'[\s\S]*placeLibraryGlide\(page, row\)[\s\S]*card\.addEventListener\('focusin', event => placeLibraryGlide\(page, event\.target\.closest\?\.\('\.lib-row'\) \|\| null\)\);/.test(page), 'the highlight follows the pointer and keyboard focus');
  ok(/new ResizeObserver\(\(\) => \{\n\s*const id = libraryPageSession\?\.glideId;\n\s*if \(id\) placeLibraryGlide\(page, page\.querySelector\(`\.lib-row\[data-id="\$\{CSS\.escape\(id\)\}"\]`\)\);\n\s*\}\)\.observe\(page\.querySelector\('\.lib-list'\)\);/.test(page),
    'the highlight stays on its row when rows change height (fonts, language, width)');
  ok(/if \(index < 0\) \{ inboxFocus\(search\); return; \}[\s\S]*next\.querySelector\(`\[data-lib-focus\^="\$\{kind\}:"\]`\)/.test(page), 'Up and Down move between rows to the same control, and above the first row back to the filter');
  ok(/const browse = \{ label: tr\('empty\.browseLibrary'\), run: \(\) => openLibrarySurface\('all'\) \};\n\s*const addSave = \{ label: tr\('empty\.addSave'\), run: \(\) => openCommandPalette\(\) \};/.test(page)
    && /title: tr\('empty\.favoritesTitle'\), actions: \[browse\]/.test(page)
    && /title: tr\('empty\.readLaterTitle'\), actions: \[browse, addSave\]/.test(page)
    && /title: tr\('empty\.libraryTitle'\),\n\s*actions: \[addSave, \{ label: tr\('empty\.importBookmarks'\), run: \(\) => importBookmarks\(\) \}\]/.test(page)
    && /title: tr\('empty\.searchTitle', \{ query: current\.query \}\),\n\s*actions: \[\{ label: tr\('empty\.clearSearch'\), run: clearFilter \}\]/.test(page)
    && /title: tr\('library\.allCaughtUp'\),\n\s*actions: \[\{ label: tr\('empty\.showAll'\), run: \(\) => setStatus\('all'\) \}\]/.test(page)
    && /title: tr\('library\.nothingRead'\),\n\s*actions: \[\{ label: tr\('library\.showUnread'\), run: \(\) => setStatus\('unread'\) \}\]/.test(page),
  'every empty state keeps its next steps: Add / Save and Import bookmarks, Browse all links, Clear search, Show all, Show unread');
  ok(/input\.value = '';\n\s*input\.dispatchEvent\(new Event\('input'\)\);/.test(page), 'clearing the filter goes through the field’s own controller, so its last committed query stays true');
  ok(!/empty\.(?:favorites|readLater|library|noMatch)Body|empty\.localNote/.test(page), 'empty states carry no helper paragraph');
  const library = extract('renderLibrarySurface');
  ok(/if \(activeLibraryMode === 'archive'\) return renderArchiveSurface\(\);\n\s*if \(activeLibraryMode === 'trash'\) return renderTrashSurface\(\);/.test(library), 'Archive and Trash keep their own renderers');
  ok(/board\.classList\.add\('library-mode', 'archive-mode'\);/.test(extract('renderArchiveSurface')) && /board\.classList\.add\('library-mode', 'trash-mode'\);/.test(extract('renderTrashSurface')), 'Archive and Trash keep their board classes');
  const focus = extract('focusLibraryLedgerTarget');
  ok(/'\.lib-later'[\s\S]*'\.library-more'[\s\S]*'\.library-primary'/.test(focus) && /\.lib-empty \.lib-ebtn[\s\S]*\.lib-field input[\s\S]*library-title/.test(focus), 'focus after a write finds the bookmark or More, then the next step of an empty view');
  const commit = extract('commitSavedTabReturnMutation');
  ok(/async function commitSavedTabReturnMutation\(review, action, opener = null, now = Date\.now\(\), receipt = null\)/.test(commit) && /toast\(tr\(plan\.successKey\), receipt \|\| \{\}\);/.test(commit),
    'the receipt options reach the shared toast; other callers keep their plain receipt');
  for (const name of ['toggleFavorite', 'toggleReadLater', 'toggleReadStatus']) {
    ok(new RegExp(`async function ${name}\\(it, opener = null, receipt = null\\)[\\s\\S]*Date\\.now\\(\\), receipt\\);`).test(extract(name)), `${name} passes the receipt options through`);
  }
  ok(/await toggleFavorite\(it, mutationOpener\);[\s\S]*await toggleReadLater\(it, mutationOpener\);/.test(extract('commonActs')), 'board cards pass no receipt options, so their receipts are unchanged');
  ok(!/chrome\.|[^.']localStorage|fetch\(|XMLHttpRequest|State\.persist|State\.snapshot/.test(librarySection), 'the page writes only through the existing transactions and adds no browser, storage or network calls');
  ok(!/function toast\(/.test(librarySection), 'confirmations use the one shared toast');
}

function testStyles() {
  ok(libraryCss.length > 4000, 'the Library page layer is present');
  ok(!/(?:linear|radial|conic)-gradient\s*\(/.test(libraryCss), 'no gradients');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n\s*\.lib, \.lib \*, \.lib \*::before, \.lib \*::after \{ animation: none !important; transition: none !important; \}/.test(libraryCss), 'reduced motion stops every Library animation');
  ok(/\.lib-thumb \{[^}]*transform: translateX\(calc\(var\(--lib-i, 0\) \* 100%\)\);[^}]*transition: transform \.3s var\(--today-ease\);/.test(libraryCss), 'the active pill slides between views in 300 ms');
  ok(/\.lib-glide \{[^}]*transform: translateY\(var\(--lib-y, 0\)\);[^}]*transition: transform \.26s var\(--today-ease\)/.test(libraryCss) && /\.lib-glide\.is-jump \{ transition: opacity \.18s ease; \}/.test(libraryCss), 'the highlight glides between rows and appears in place');
  ok(/\.lib-star\.is-pop > svg \{ animation: lib-star-pop \.3s var\(--today-spring\); \}/.test(libraryCss) && /@keyframes lib-burst \{\n\s*from \{ transform: translateX\(9px\) scale\(1\); opacity: 1; \}/.test(libraryCss), 'the favourite pops with a small burst');
  ok(/\.lib-later\.is-sent > svg:first-child \{ animation: lib-send/.test(libraryCss) && /@keyframes lib-fly \{[\s\S]*translate\(-34px, -40px\)/.test(libraryCss), 'the bookmark sends a copy up toward its tab');
  ok(/\.lib-cnt\.is-bump \{ animation: lib-bump \.3s var\(--today-spring\); \}/.test(libraryCss), 'the count bumps');
  ok(/\.lib-row\.is-gone \{[^}]*height: 0 !important;[^}]*opacity: 0;[^}]*transform: translateX\(44px\);/.test(libraryCss), 'a leaving row folds away to the right');
  ok(/\.lib-acts \{[^}]*opacity: 0;[^}]*pointer-events: none;[\s\S]*?\.lib-row:hover \.lib-acts,\n\.lib-row:has\(:focus-visible\) \.lib-acts \{ opacity: 1;/.test(libraryCss), 'row actions show on hover and on keyboard focus only (a mouse click does not leave a second row open)');
  ok(/\.lib-open::after \{ content: ''; position: absolute; inset: 0;/.test(libraryCss), 'the whole row opens the page');
  ok(/\.lib-card \{[^}]*overflow: clip;/.test(libraryCss), 'a folding row is clipped to the card without making the card a scroller');
  ok(/\.lib \{[^}]*position: relative;/.test(libraryCss), 'hidden live text stays inside the board, so the window never scrolls');
  ok(/\.lib-ring \{[^}]*border: 2px solid var\(--text3\);/.test(libraryCss) && /\.lib-check\.is-on \.lib-ring \{[^}]*background: var\(--index-receipt, var\(--green\)\);/.test(libraryCss), 'the read tick is green when done');
  ok(/\.lib-later\.is-on \{ color: var\(--today-when-text\); \}/.test(libraryCss), 'Read later is orange, the colour for when');
  ok(/:is\(\.lib-ai, \.lib-text, \.lib-check, \.lib-ebtn, \.lib-clear\):focus-visible \{ outline: 2px solid/.test(libraryCss), 'every control shows keyboard focus');
  ok(/\.lib-row\.is-read \.lib-tt \{ color: var\(--text2\); \}/.test(libraryCss), 'a read page’s title is muted');
  for (const selector of ['.lib-seg-btn', '.lib-ai', '.lib-text', '.lib-check', '.lib-clear', '.lib-ebtn']) {
    const rule = libraryCss.match(new RegExp(`\\n${selector.replace('.', '\\.')} \\{[^}]*\\}`));
    ok(rule && /(?:^|\s|;)(?:min-)?height: (?:4[4-9]|5\d)px/.test(rule[0]), `${selector} is at least 44 px tall`);
  }
  ok(/body:is\(\[data-page="inbox"\], \[data-page="library"\]\) #topbar \.tb-left \{/.test(css) && /body\[data-page="inbox"\] #topbar-save \{ display: none; \}/.test(css),
    'the Library page shares the Inbox page’s top bar (search on the right, title for assistive tech); only the Inbox hides Save tab');
  ok(!/\.library-row|\.library-list|\.library-status|\.library-sort|\.read-later-row/.test(css.slice(0, css.indexOf('LIBRARY PAGE (2026-11 canvas)'))), 'the old ledger styles are gone; Archive and Trash keep .library-search and .library-head');
}

function testLocales() {
  const start = newtab.indexOf('const I18N = {');
  const end = newtab.indexOf('\n};', start);
  const i18n = vm.runInNewContext(`(${newtab.slice(newtab.indexOf('{', start), end + 2)})`);
  const added = ['library.view', 'library.modeCount', 'library.archiveNamed', 'library.allCaughtUp', 'library.nothingRead', 'library.showUnread'];
  const vars = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const key of added) {
    ok(librarySection.includes(`'${key}'`), `${key} is used by the page`);
    ok(i18n.en[key] && i18n['zh-TW'][key], `${key} exists in English and zh-TW`);
    eq(vars(i18n['zh-TW'][key]), vars(i18n.en[key]), `${key} keeps the same placeholders`);
  }
  eq(added.map(key => i18n['zh-TW'][key]), ['連結檢視方式', '{label}，{count}', '封存「{title}」', '都讀完了', '還沒有已讀的連結', '顯示未讀'], 'zh-TW copy');
  ok(!added.some(key => /数据|默认|保存|添加|设置|搜索|文件夹|链接/.test(i18n['zh-TW'][key])), 'zh-TW Library copy avoids Mainland terms');
  for (const key of ['empty.favoritesBody', 'empty.readLaterBody', 'empty.libraryBody']) {
    ok(!(key in i18n.en) && !(key in i18n['zh-TW']), `${key} (a helper paragraph the page no longer shows) is removed`);
  }
  for (const key of ['library.subtitleAll', 'library.subtitleFavorites', 'readLater.subtitle', 'library.localStorage', 'library.resultCount', 'library.savedWhen', 'library.queuedWhen', 'library.filterLinks', 'library.readingStatus']) {
    ok(newtab.includes(`'${key}'`) && i18n['zh-TW'][key], `${key} is still used, in both languages`);
  }
}

function testCi() {
  ok(/for f in [^\n]*scripts\/library-page-contract-test\.js/.test(ci), 'CI syntax-checks this suite');
  ok(/run: node scripts\/library-page-contract-test\.js/.test(ci), 'CI runs this suite');
}

async function main() {
  testModel();
  testRow();
  await testRunner();
  await testFold();
  testWiring();
  testStyles();
  testLocales();
  testCi();
  console.log(`Library page contracts passed: ${checks} checks (counts and rolls, filter marks, rows built in a VM with their exact controls and Undo receipts, row menu folding, landing motion, held repaint and fold, wiring, motion and reduced motion, targets, top bar, locales, CI)`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
