'use strict';

// Contract test for the Archive & Trash page (canvas board Archive.dc.html):
// one page with an Archive / Trash switch (sliding thumb, rolling counts), the
// filing line on every row, Restore that arcs the row out with the shared
// receipt and Undo, Move to Trash that flies toward its tab, Delete forever on
// the shared Keep / Delete ask, the selection bar with its filing manifest,
// one-line empty states, keys, the phone layout, locales and CSS. Production
// slices of newtab.js run in node:vm: the one-pass Restore index against the
// per-row checks (at 1,024 entries too), entry keys across an Undo rebuild,
// and the write runner's hold, motion, repaint and focus order.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const source = read('newtab.js');
const css = read('newtab.css');
const html = read('newtab.html');
const ci = read('.github/workflows/ci.yml');
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const plain = value => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const eq = (actual, expected, message) => { assert.deepEqual(plain(actual), plain(expected), message); checks += 1; };

// A top-level function runs from its declaration to the first closing brace at
// column 0 (the file's style), so template literals cannot fool it.
function extractFunction(name) {
  const marker = new RegExp(`^(?:async )?function ${name}\\(`, 'm');
  const match = marker.exec(source);
  assert.ok(match, `${name} must remain a top-level function in newtab.js`);
  const end = source.indexOf('\n}\n', match.index);
  assert.ok(end > match.index, `${name} must end with a closing brace at column 0`);
  return source.slice(match.index, end + 2);
}

// The page's CSS layer, bounded at the next layer header (so a later layer
// never counts as this page's, and this layer never leaks into another's).
const layerStart = css.indexOf('ARCHIVE AND TRASH PAGE (2026-11 canvas)');
const layerEnd = css.indexOf('/* ----', layerStart);
const layer = css.slice(layerStart, layerEnd > layerStart ? layerEnd : undefined);
const rule = selector => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return layer.match(new RegExp(`\\n${escaped} \\{[^}]*\\}`))?.[0] || '';
};

// ── 1. The one-pass Restore index matches the per-row checks ─────────────
const RESTORE_SLICES = [
  'archiveEntryTimestamp', 'archiveEntryKey', 'activeArchivedPageItemIdCount',
  'resolveArchivedPageRestoreDestination', 'createArchivedPageRestoreContext', 'createTrashedPageRestoreContext',
  'archivedLocalItemEntityIds', 'archivedLocalItemIdsAvailable', 'createArchivedLocalItemRestoreContext',
  'createTrashedLocalItemRestoreContext', 'archivedGroupEntityIds', 'archivedGroupIdsAvailable',
  'resolveArchivedGroupRestoreDestination', 'createArchivedGroupRestoreContext', 'createTrashedGroupRestoreContext',
  'createArchiveRestoreIndex',
];

function restoreContext(state) {
  const context = vm.createContext({
    State: { get: () => state },
    LocusImportUtils: require(path.join(root, 'import-utils.js')),
    itemDetailValueFingerprint: value => JSON.stringify(value),
    Map, Set, JSON, Array, Object, String, Number,
  });
  vm.runInContext(RESTORE_SLICES.map(extractFunction).join('\n\n'), context, { filename: 'archive-page-restore-slices.js' });
  return context;
}

const summary = review => (review ? {
  collection: review.collectionName,
  id: review.itemId || review.groupId,
  ids: review.entityIds || null,
  destination: [review.destination.workspaceId, review.destination.spaceId, review.destination.groupId || '', !!review.destination.createInbox],
} : null);

function reviewsBothWays(state) {
  const ctx = restoreContext(state);
  const index = ctx.createArchiveRestoreIndex();
  const out = [];
  for (const name of ['archive', 'trash']) {
    for (const entry of state[name]) {
      if (!entry || !entry.data) continue;
      const make = (withIndex) => {
        const i = withIndex ? index : null;
        if (entry.kind === 'group') return name === 'trash' ? ctx.createTrashedGroupRestoreContext(entry, i) : ctx.createArchivedGroupRestoreContext(entry, 'archive', i);
        if (entry.data.type === 'tab') return name === 'trash' ? ctx.createTrashedPageRestoreContext(entry, i) : ctx.createArchivedPageRestoreContext(entry, 'archive', i);
        return name === 'trash' ? ctx.createTrashedLocalItemRestoreContext(entry, i) : ctx.createArchivedLocalItemRestoreContext(entry, 'archive', i);
      };
      out.push({ name, id: entry.data.id, plain: summary(make(false)), indexed: summary(make(true)) });
    }
  }
  return out;
}

const ws = (groups, extra = {}) => ({ id: 'ws', name: 'Workspace', activeCatId: 'sp', categories: [{ id: 'sp', name: 'Space', groups }], ...extra });
const tab = id => ({ id, type: 'tab', title: id, url: `https://example.test/${id}` });
const note = id => ({ id, type: 'note', html: `<p>${id}</p>` });
const stack = (id, items) => ({ id, type: 'stack', name: id, items });
const itemEntry = (data, extra = {}) => ({ kind: 'item', data, wsId: 'ws', catId: 'sp', groupId: 'g1', catName: 'Space', groupName: 'One', at: 100, ...extra });
const groupEntry = (data, extra = {}) => ({ kind: 'group', data, wsId: 'ws', catId: 'sp', catName: 'Space', at: 100, ...extra });

{
  const shared = itemEntry(tab('twice'));
  const state = {
    activeWsId: 'ws',
    workspaces: [ws([
      { id: 'g1', name: 'One', items: [tab('live-page'), note('live-note')] },
      { id: 'g2', name: 'Inbox', items: [] },
    ])],
    archive: [
      itemEntry(tab('free-page')),
      itemEntry(tab('live-page')),
      itemEntry(note('free-note')),
      itemEntry(note('live-note')),
      itemEntry(stack('stack-free', [tab('stack-a'), note('stack-b')])),
      itemEntry(stack('stack-clash', [tab('trash-copy'), note('stack-c')])),
      groupEntry({ id: 'group-free', name: 'Free', items: [tab('group-a')] }),
      groupEntry({ id: 'group-clash', name: 'Clash', items: [note('live-note')] }),
      shared,
      shared,
      itemEntry(note('sp')),
      itemEntry(tab('lost-group'), { groupId: 'gone', groupName: 'Gone' }),
    ],
    trash: [
      itemEntry(tab('trash-copy'), { trashedAt: 500 }),
      itemEntry(note('trash-note'), { trashedAt: 500 }),
      groupEntry({ id: 'trash-group', name: 'Trash group', items: [] }, { trashedAt: 500 }),
    ],
  };
  const rows = reviewsBothWays(state);
  rows.forEach(row => eq(row.indexed, row.plain, `the one-pass index gives the same Restore review as the per-row checks (${row.name} ${row.id})`));
  const byId = Object.fromEntries(rows.map(row => [row.id, row.indexed]));
  ok(byId['free-page'] && byId['free-note'] && byId['stack-free'] && byId['group-free'], 'free entries can be restored');
  ok(!byId['live-page'] && !byId['live-note'] && !byId['stack-clash'] && !byId['group-clash'], 'an id still used elsewhere fails closed, as before');
  ok(!byId.twice, 'an entry stored twice fails closed, as before');
  ok(!byId.sp, 'a note whose id is a Space id is not restored over it (the id scan covers Spaces)');
  eq(byId['lost-group'].destination, ['ws', 'sp', 'g2', false], 'a missing group falls back to the Space’s Inbox, as before');

  // A malformed stored group makes the id scan throw, so the per-row checks
  // refuse every note, to-do, stack and group; the index refuses the same ones.
  state.archive.push(groupEntry({ id: 'group-broken', name: 'Broken', items: 'not-a-list' }));
  const poisoned = reviewsBothWays(state);
  poisoned.forEach(row => eq(row.indexed, row.plain, `with a malformed group stored, the index still agrees (${row.name} ${row.id})`));
  ok(poisoned.find(row => row.id === 'free-page').indexed && !poisoned.find(row => row.id === 'free-note').indexed, 'pages still restore; id-checked kinds fail closed, as before');
}

{
  // The same answers at 1,024 entries, in one pass instead of one scan per row.
  const items = Array.from({ length: 1024 }, (_, i) => {
    const id = `scale-${i}`;
    if (i % 4 === 0) return tab(id);
    if (i % 4 === 1) return note(id);
    if (i % 4 === 2) return { id, type: 'todo', text: id };
    return stack(id, [note(`${id}-n`), tab(`${id}-t`)]);
  });
  const state = {
    activeWsId: 'ws',
    workspaces: [ws([{ id: 'g1', name: 'One', items: [tab('scale-7-t')] }])],
    archive: items.map(item => itemEntry(item)),
    trash: [],
  };
  const started = Date.now();
  const rows = reviewsBothWays(state);
  const elapsed = Date.now() - started;
  eq(rows.filter(row => JSON.stringify(row.indexed) !== JSON.stringify(row.plain)).length, 0, 'every one of 1,024 reviews matches with and without the index');
  ok(rows.filter(row => !row.indexed).map(row => row.id).join() === 'scale-7', 'only the stack whose child is still active fails closed');
  ok(elapsed < 60000, `1,024 reviews both ways finish (${elapsed} ms)`);
  const ctx = restoreContext(state);
  const t0 = Date.now();
  const index = ctx.createArchiveRestoreIndex();
  state.archive.forEach(entry => (entry.data.type === 'tab'
    ? ctx.createArchivedPageRestoreContext(entry, 'archive', index)
    : ctx.createArchivedLocalItemRestoreContext(entry, 'archive', index)));
  const indexed = Date.now() - t0;
  ok(indexed < 1500, `1,024 indexed reviews take ${indexed} ms (one pass, not one scan per row)`);
}

{
  // Entry keys survive an Undo (which rebuilds every stored object) and tell
  // an Archive entry from its Trash copy.
  const ctx = restoreContext({ workspaces: [], archive: [], trash: [] });
  const archived = itemEntry(tab('k1'), { at: 123 });
  const trashed = { ...archived, trashedAt: 456 };
  eq(ctx.archiveEntryKey(JSON.parse(JSON.stringify(archived))), ctx.archiveEntryKey(archived), 'a rebuilt entry keeps its key');
  ok(ctx.archiveEntryKey(trashed) !== ctx.archiveEntryKey(archived), 'the Trash copy has its own key');
  ok(ctx.archiveEntryKey(groupEntry({ id: 'k1', items: [] }, { at: 123 })) !== ctx.archiveEntryKey(archived), 'a group and an item never share a key');
}

// ── 2. The write runner: hold, motion, one repaint, then focus ───────────
function runnerHarness() {
  const calls = [];
  const frames = [];
  const session = { holdRender: 0, missedRender: false, selected: new Set(['a', 'b', 'keep']), view: null };
  const context = vm.createContext({
    archivePageSession: session,
    archivePageNeighbourKey: keys => `after:${keys.join(',')}`,
    syncArchivePageSelection: () => calls.push(['sync', [...session.selected]]),
    archivePageLeave: async (keys, motion) => { calls.push(['leave', keys, motion, session.holdRender]); },
    renderBoard: () => calls.push(['repaint', session.holdRender]),
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
    focusArchivePageTarget: (key, control) => calls.push(['focus', key, control]),
    Math, Set,
  });
  vm.runInContext(extractFunction('runArchivePageWrite'), context, { filename: 'archive-page-runner.js' });
  return { context, calls, frames, session };
}

(async () => {
  {
    const { context, calls, frames, session } = runnerHarness();
    let land;
    const pending = context.runArchivePageWrite(['a'], 'restore', () => new Promise(resolve => { land = resolve; }));
    eq(session.holdRender, 1, 'the page holds its repaint while storage accepts the write');
    eq(calls, [], 'nothing moves or repaints before the write lands');
    land(true);
    eq(await pending, true, 'the runner reports the landed write');
    eq(calls.map(call => call[0]), ['sync', 'leave', 'repaint'], 'the selection updates, the row leaves with its motion, then one repaint');
    eq(calls[1].slice(1), [['a'], 'restore', 1], 'the motion runs while the repaint is still held');
    eq(calls[0][1], ['b', 'keep'], 'the written row leaves the selection at once');
    eq(calls[2][1], 0, 'the repaint comes after the hold is released');
    eq(frames.length, 1, 'focus moves on the next frame');
    frames[0]();
    eq(calls.at(-1), ['focus', 'after:a', 'restore'], 'focus goes to the neighbour row’s same control (review finding A-6)');
  }
  {
    const { context, calls, frames, session } = runnerHarness();
    const refused = await context.runArchivePageWrite(['a'], 'restore', async () => false);
    eq(refused, false, 'a refused write reports false');
    eq(calls, [], 'a refused write leaves the rows and the page as they are');
    eq(frames.length, 0, 'a refused write leaves focus where its own receipt put it');
    eq(session.holdRender, 0, 'and releases the hold');
  }
  {
    const { context, calls, session } = runnerHarness();
    let first;
    let second;
    const one = context.runArchivePageWrite(['a'], 'restore', () => new Promise(resolve => { first = resolve; }));
    const two = context.runArchivePageWrite(['b'], 'trash', () => new Promise(resolve => { second = resolve; }), { control: 'kill' });
    eq(session.holdRender, 2, 'overlapping writes each hold the repaint');
    first(true);
    await one;
    eq(calls.filter(call => call[0] === 'repaint').length, 0, 'no repaint while another row is still leaving');
    second(true);
    await two;
    eq(calls.filter(call => call[0] === 'repaint'), [['repaint', 0]], 'one repaint once the last motion ends');
  }
  {
    const { context, calls, session } = runnerHarness();
    session.missedRender = true;
    await context.runArchivePageWrite(['a'], 'restore', async () => false);
    eq(calls.map(call => call[0]), ['repaint'], 'a repaint skipped during the hold (an Undo, a receipt) still happens');
  }

  // ── 3. Page wiring ──────────────────────────────────────────────────────
  const renderBoard = source.slice(source.indexOf('function renderBoard() {'), source.indexOf('\n// ════', source.indexOf('function renderBoard() {')));
  ok(/if \(!isArchivePageActive\(\)\) \{\n\s*document\.getElementById\('board'\)\.classList\.remove\('arv-mode'\);\n\s*if \(document\.body\.dataset\.page === 'archive'\) delete document\.body\.dataset\.page;/.test(renderBoard),
    'the page keeps its marks through its own repaint (the scroll position is never clamped)');
  ok(/if \(archivePageSession && !isArchivePageActive\(\)\) archivePageSession = null;/.test(renderBoard), 'the page memory ends when the page is left');
  ok(/if \(activeLibraryMode === 'archive'\) return renderArchiveSurface\(\);\n\s*if \(activeLibraryMode === 'trash'\) return renderTrashSurface\(\);/.test(extractFunction('renderLibrarySurface')), 'the routes and rail entries still reach Archive and Trash');
  const page = extractFunction('renderArchivePage');
  ok(/if \(session\.holdRender && page\) \{\n\s*session\.missedRender = true;\n\s*return true;/.test(page), 'leaving rows hold the repaint, and the missed repaint is remembered');
  ok(/if \(mode === 'trash'\) purgeExpiredTrash\(\);\n\s*reconcileTrashDeleteAsk\(\);/.test(page), 'Trash still purges expired entries, and an open ask is re-read before painting');
  ok(/if \(!firstShow && !session\.view\?\.motion && board\.scrollTop !== keepScroll\) \{\n\s*board\.scrollTo\(\{ top: keepScroll, behavior: 'instant' \}\);/.test(page), 'a repaint keeps the reader’s place in a long list');
  ok(/<h1 class="arv-title" id="archive-title" tabindex="-1"><\/h1>[\s\S]*?<div class="arv-seg" role="group">[\s\S]*?<span class="arv-thumb" aria-hidden="true"><\/span>/.test(page), 'one heading and the Archive / Trash switch with its thumb, no stacked header bars');
  ok(!/archive-summary|trash-retention|library-head|archive-toolbar|localNote/.test(page + extractFunction('paintArchivePage')), 'no summary cards, retention note, header bar or local note');
  const sync = extractFunction('syncArchivePage');
  ok(/seg\.style\.setProperty\('--arv-i', String\(ARCHIVE_PAGE_MODES\.indexOf\(mode\)\)\);/.test(sync), 'the thumb slides to the open collection');
  ok(/count\.innerHTML = libraryRollMarkup\(counts\[id\], previous \? previous\[id\] : null\);/.test(sync), 'the counts roll with the shared count roll');
  ok(/if \(previous && counts\[id\] > previous\[id\]\) restartLibraryMotion\(count, 'is-bump'\);/.test(sync), 'a count that grows bumps (Move to Trash, an Undo)');
  ok(/restartLibraryMotion\(title, 'is-swap'\)/.test(sync), 'the heading swaps when the switch moves');
  const paint = extractFunction('paintArchivePage');
  ok(/session\.view\.reuse\.set\(row\.dataset\.key, row\)/.test(paint) && /view\.reuse\.get\(key\) \|\| null/.test(extractFunction('appendArchivePageRows')),
    'a repaint keeps every unchanged row instead of rebuilding it (1,024 entries stay quick)');
  ok(/index: createArchiveRestoreIndex\(\)/.test(paint), 'one Restore index per paint');
  ok(/appendArchivePageRows\(Math\.max\(ARCHIVE_PAGE_WINDOW, session\.shown\)\)/.test(paint) && /^const ARCHIVE_PAGE_WINDOW = 120;$/m.test(source),
    'rows arrive 120 at a time; a repaint renders as deep as the reader went');
  ok(/new IntersectionObserver\(/.test(extractFunction('bindArchivePage')) && /tr\('archive\.showMore'/.test(extractFunction('appendArchivePageRows')),
    'further rows load as the list scrolls, and Show more stays as a button');
  const row = extractFunction('buildArchivePageRow');
  ok(/previous && previous\.dataset\.sig === signature \? previous : null/.test(row), 'a row is rebuilt only when what it shows changed');
  ok(/role="checkbox" aria-checked="false" aria-label="\$\{esc\(tr\('trash\.select', \{ title \}\)\)\}"/.test(row), 'the pick is a named check box');
  ok(/class="arv-restore"\$\{restoreAttr\}[\s\S]*?aria-label="\$\{esc\(review\.label\)\}"[\s\S]*?\$\{unavailable \? ' disabled aria-disabled="true"' : ''\}/.test(row), 'Restore names the item and its destination, and is off when its review is unavailable');
  ok(/class="arv-ai arv-kill"[\s\S]*?aria-label="\$\{esc\(`\$\{killLabel\}: \$\{title\}`\)\}"/.test(row), 'Move to Trash / Delete forever names the item');
  ok(/class="arv-ai arv-more"[\s\S]*?aria-haspopup="menu"/.test(row) && /bindBoardItemContextMenu\(row,[\s\S]*?\{ menuButton: more \}\)/.test(row), 'More, right-click and Shift+F10 open the row menu');
  ok(/archivePageWhenLabel\(at\)/.test(row) && /new Intl\.DateTimeFormat\(locale, \{ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' \}\)/.test(extractFunction('archivePageWhenLabel')),
    'dates come from formatters made once per locale');

  const restoreRow = extractFunction('archivePageRestoreRow');
  ok(/runArchivePageWrite\(\[key\], 'restore'/.test(restoreRow) && /restoreArchivedPage\(review\.context, button\)/.test(restoreRow)
    && /commitArchivedGroupRestore\(review\.context, button\)/.test(restoreRow) && /commitTrashedLocalItemRestore\(review\.context, button\)/.test(restoreRow)
    && /\(trash \? restoreTrashEntries : restoreArchiveEntries\)\(\[entry\]\)/.test(restoreRow),
  'Restore uses the existing receipt-gated transactions (their receipts carry Undo), and the old writer for older entries');
  ok(!/holdRender/.test(restoreRow), 'a second Restore while a row is leaving is not dropped (finding A-5 family)');
  const killRow = extractFunction('archivePageKillRow');
  ok(/permanentlyDeleteTrashEntries\(\[data\.entry\], \{ run: archivePageDeleteRun\(\[key\]\) \}\)/.test(killRow), 'Delete forever asks on the shared receipt and runs the write with the page’s motion');
  ok(/moveArchiveEntriesToTrash\(\[data\.entry\]\)/.test(killRow), 'Move to Trash uses the existing transaction');
  const leave = extractFunction('archivePageLeave');
  ok(/motion === 'restore' \? 'is-restored' : motion === 'trash' \? 'is-tossed' : 'is-deleted'/.test(leave) && /planReducedMotion\(\)/.test(leave),
    'Restore arcs out, Move to Trash flies, Delete forever dissolves; reduced motion skips them');
  const selection = extractFunction('syncArchivePageSelection');
  ok(/bar\.hidden = !any;\n\s*find\.hidden = any;/.test(selection), 'the selection bar takes the tools row’s place');
  ok(/tr\('archive\.restoreDestinations'/.test(selection) && /<li><span>\$\{esc\(path\)\}<\/span><strong>\$\{count\}<\/strong><\/li>/.test(selection), 'the bar lists every destination with its count');
  ok(/if \(focusWasInBar\) archivePageFocus\(find\.querySelector\('\.arv-field input'\)\)/.test(selection), 'focus never falls to the page body when the bar goes');
  ok(/if \(!archivePageEscape\(\)\) goHome\(\);/.test(source) && /return archivePageClearSelection\(\);/.test(extractFunction('archivePageEscape')),
    'Escape closes the route list, then clears the selection, before it leaves the page');
  ok(/archivePageReveal\(entry\)/.test(extractFunction('focusArchivedEntryRestoreReview')), 'a compact review renders and focuses its exact row');
  const empties = paint.match(/buildLibraryEmpty\(\{[\s\S]*?\}\);/g) || [];
  eq(empties.length, 3, 'three empty states: no match, empty Trash, empty Archive');
  ok(empties.every(block => (block.match(/label: tr\(/g) || []).length === 1), 'each empty state is one line and one button');
  ok(/title: tr\('empty\.noMatchTitle'\)[\s\S]*?label: tr\('empty\.clearFilters'\)/.test(paint)
    && /title: tr\('empty\.trashTitle'\)[\s\S]*?label: tr\('empty\.browseArchive'\)/.test(paint)
    && /title: tr\('empty\.archiveTitle'\)[\s\S]*?label: tr\('empty\.browseLibrary'\)/.test(paint), 'the empty states keep their next steps');
  ok(/trash \? stored\.length - entries\.length : 0/.test(paint) && /tr\('trash\.invalid', \{ count: invalid \}\)/.test(paint), 'damaged Trash entries are still reported');
  ok(!/confirm\(/.test(extractFunction('permanentlyDeleteTrashEntries')), 'no native confirmation');

  // ── 4. Locales ──────────────────────────────────────────────────────────
  const i18nStart = source.indexOf('const I18N = ');
  const literal = source.slice(i18nStart + 'const I18N = '.length, source.lastIndexOf('};', source.indexOf('\nfunction tr(', i18nStart)) + 1);
  const I18N = vm.runInNewContext(`(${literal})`, {});
  const keys = ['archive.restored', 'archive.view', 'archive.types', 'archive.showMore', 'trash.askMany', 'trash.delete', 'trash.confirmTitle',
    'trash.title', 'nav.archive', 'archive.search', 'trash.search', 'archive.subtitle', 'trash.subtitle', 'trash.all', 'trash.links', 'trash.notes',
    'trash.todos', 'trash.groups', 'trash.select', 'trash.deleteForever', 'archive.moveToTrash', 'archive.restore', 'trash.daysLeft', 'trash.dayLeft',
    'trash.expiresToday', 'trash.today', 'trash.yesterday', 'trash.thisWeek', 'trash.earlier', 'empty.archiveTitle', 'empty.trashTitle',
    'empty.noMatchTitle', 'empty.clearFilters', 'empty.browseArchive', 'empty.browseLibrary', 'library.moreActions', 'selection.clearTitle'];
  for (const key of keys) {
    const en = I18N.en[key];
    const zh = I18N['zh-TW'][key];
    ok(typeof en === 'string' && en.trim() && typeof zh === 'string' && zh.trim(), `${key} exists in en and zh-TW`);
    eq((zh.match(/\{\w+\}/g) || []).sort(), (en.match(/\{\w+\}/g) || []).sort(), `${key} keeps its placeholders in zh-TW`);
  }
  eq([I18N['zh-TW']['archive.restored'], I18N['zh-TW']['trash.delete'], I18N['zh-TW']['trash.askMany']], ['已復原', '刪除', '永久刪除 {count} 個項目？'], 'zh-TW uses the established terms (復原, 刪除, 永久刪除)');
  for (const gone of ['archive.summary.entries', 'archive.summary.local', 'trash.summary.space', 'trash.retention', 'trash.localOnly', 'trash.confirmOne',
    'trash.cancelDelete', 'trash.deleting', 'empty.archiveBody', 'empty.trashBody', 'empty.noMatchBody', 'empty.returnHome', 'trash.deleteSelected']) {
    ok(!(gone in I18N.en) && !(gone in I18N['zh-TW']), `${gone} was removed with the stacked summary, the dialog and the helper paragraphs`);
  }

  // ── 5. CSS ──────────────────────────────────────────────────────────────
  ok(layer.length > 4000, 'the Archive and Trash layer is present');
  ok(!/FIND AGAIN AND THE COMMAND PALETTE/.test(layer), 'this layer is read on its own (bounded at the next layer)');
  ok(css.indexOf('ARCHIVE AND TRASH PAGE (2026-11 canvas)') < css.indexOf('FIND AGAIN AND THE COMMAND PALETTE (2026-11 canvas)'), 'the layer sits before Find again, whose suite reads to the end of the file');
  ok(!/(?:linear|radial|conic)-gradient\s*\(/.test(layer), 'no gradients (the hover edge is a shadow, the strike a scaled line)');
  ok(/\.arv-thumb \{[^}]*transform: translateX\(calc\(var\(--arv-i, 0\) \* 100%\)\);[^}]*transition: transform \.32s var\(--today-ease\);/.test(layer), 'the switch thumb slides in 320 ms');
  ok(/\.arv-cnt\.is-bump \{ animation: arv-bump \.32s var\(--today-spring\); \}/.test(layer), 'the count bumps with a spring');
  ok(/\.arv-row\.is-restored \.arv-restore \{ background: var\(--today-receipt\);/.test(layer) && /@keyframes arv-arc \{[\s\S]*?translate\(-120px, -2px\) rotate\(-3deg\) scale\(\.92\)/.test(layer),
    'Restore turns green and the row arcs out');
  ok(/@keyframes arv-toss \{ to \{ transform: translate\(90px, -46px\) scale\(\.55\); opacity: 0; \} \}/.test(layer), 'Move to Trash flies toward the Trash tab');
  ok(/@keyframes arv-dissolve \{ to \{ opacity: 0; filter: blur\(3px\); transform: scale\(\.97\); \} \}/.test(layer), 'Delete forever dissolves');
  ok(/\.arv-row\.is-back \{ animation: arv-drop \.32s/.test(layer), 'a row Undo brings back drops in');
  ok(/\.arv-row\.is-doomed \.arv-tt::after \{ transform: none; \}/.test(layer) && !/\.arv-row\.is-doomed[^{]*\{[^}]*opacity: 0?\.\d/.test(layer.replace(/\.arv-row\.is-doomed \.arv-pick \.ibx-fav \{ opacity: \.4; \}/, '')),
    'finding A-7: the asked row is struck through at full contrast (only its icon dims)');
  ok(/\.arv-days\.is-soon \{ background: var\(--today-when-soft\); color: var\(--today-when-soft-text\); \}/.test(layer), 'entries close to deletion are marked in the orange of "when"');
  for (const selector of ['.arv-seg-btn', '.arv-pick', '.arv-ai', '.arv-restore', '.arv-chip', '.arv-clear', '.arv-sb', '.arv-morebtn', '.arv-field']) {
    ok(/(?:^|\s|;)(?:min-)?height: (?:4[4-9]|5\d)px/.test(rule(selector)), `${selector} is at least 44 px tall`);
  }
  ok(/@container \(max-width: 640px\) \{[\s\S]*?grid-template-areas: "pick title more" "meta meta meta";[\s\S]*?\.arv-row \.arv-copy \{ display: contents; \}[\s\S]*?\.arv-row \.arv-acts \{ display: none; \}[\s\S]*?\.arv-row \.arv-more \{ grid-area: more; display: grid;/.test(layer),
    'phone: the title takes the row beside the pick and More, the meta line runs under it, actions fold into More');
  ok(/@media \(hover: none\) \{\n\s*\.arv-row \.arv-acts \{ display: none; \}\n\s*\.arv-row \.arv-more \{ display: grid; \}/.test(layer), 'touch screens get More instead of hover actions');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n\s*\.arv, \.arv \*, \.arv \*::before, \.arv \*::after \{ animation: none !important; transition: none !important; \}/.test(layer), 'reduced motion stops every page animation');
  ok(/@media \(forced-colors: active\)/.test(layer), 'forced colours keep the switch, chips and checks visible');
  ok(/\.arv \{[^}]*position: relative;/.test(layer), 'hidden live text stays inside the board, so the window never scrolls');
  ok(/\.arv-tools \{ position: relative; z-index: 5;/.test(layer), 'the route list opens above the rows');
  ok(/body\.blur-privacy :is\(\.arv-tt, \.arv-meta\) \{ filter: blur\(6px\); \}/.test(layer), 'privacy blur covers titles and destinations');
  ok(/body\[data-page="archive"\] #topbar \.tb-left \{\n\s*position: absolute;/.test(layer), 'the shell keeps only the search field, Save tab and More, as on the other pages');
  ok(!/id=["']trash-delete-/.test(html), 'the modal Trash dialog is gone');

  // ── 6. CI ───────────────────────────────────────────────────────────────
  ok(/scripts\/archive-page-contract-test\.js/.test(ci.split('\n').find(line => line.includes('for f in')) || ''), 'CI syntax-checks this suite');
  ok(/run: node scripts\/archive-page-contract-test\.js/.test(ci), 'CI runs this suite');

  console.log(`Archive page contracts passed: ${checks} checks (one-pass Restore index equal to the per-row checks, also at 1,024; keys across Undo; the write runner's hold, motion, one repaint and focus; switch, counts, rows, selection bar, Escape, empty states, locales, CSS, CI)`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
