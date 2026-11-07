'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const importUtils = require('../import-utils.js');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8');
const themesCss = fs.readFileSync(path.join(root, 'themes.css'), 'utf8');

function themeHexToken(theme, token) {
  const block = themesCss.match(new RegExp(`\\[data-theme="${theme}"\\] \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(block, `missing ${theme} theme block`);
  const value = block[1].match(new RegExp(`--${token}\\s*:\\s*(#[0-9a-f]{6})`, 'i'));
  assert.ok(value, `missing hexadecimal --${token} in ${theme}`);
  return value[1].slice(1).match(/../g).map(part => Number.parseInt(part, 16));
}

function mixSrgb(foreground, background, foregroundWeight) {
  return foreground.map((channel, index) => (
    channel * foregroundWeight + background[index] * (1 - foregroundWeight)
  ));
}

function contrastRatio(first, second) {
  const luminance = color => color.map(channel => channel / 255)
    .map(channel => (channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} must remain extractable from newtab.js`);
  const declarationStart = source.slice(Math.max(0, start - 6), start) === 'async '
    ? start - 6
    : start;
  const open = source.indexOf('{', source.indexOf(')', start) + 1);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; index += 1; }
      continue;
    }
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

// Archive and Trash became one page in the 2026-11 build: the row review, the
// row builder, row Restore, the selection bar and its Restore, the write runner
// and the page renderer together take the place of the two old renderers.
function archivePageSource() {
  return [
    'archivePageRowReview', 'buildArchivePageRow', 'archivePageRestoreRow',
    'syncArchivePageSelection', 'archivePageRestoreSelected', 'renderArchivePage', 'runArchivePageWrite',
  ].map(extractFunction).join('\n');
}

// The mixed-selection refusal: `refuse` disables the selection's Restore, then
// each mixed case names why.
const MIXED_SELECTION_REFUSAL = /const refuse = key => \{[\s\S]*?restoreSelected\.disabled = true;[\s\S]*?if \(containsArchivedPage && \(containsArchivedGroup \|\| containsLocalItem\)\) \{\s*refuse\(trash \? 'trash\.restorePagesSeparately' : 'archive\.restorePagesSeparately'\);[\s\S]*?else if \(containsArchivedGroup && containsLocalItem\) \{\s*refuse\(trash \? 'trash\.restoreGroupsSeparately' : 'archive\.restoreGroupsSeparately'\);/;

function loadFunctions(names, globals = {}) {
  const context = vm.createContext({ ...globals });
  vm.runInContext(names.map(extractFunction).join('\n\n'), context, {
    filename: 'newtab-library-recovery-extract.js',
  });
  return context;
}

const plain = value => JSON.parse(JSON.stringify(value));

function readI18n() {
  const startMarker = 'const I18N = ';
  const start = source.indexOf(startMarker);
  const trStart = source.indexOf('\nfunction tr(', start);
  const close = source.lastIndexOf('};', trStart);
  assert.ok(start >= 0 && trStart > start && close > start, 'I18N must remain extractable');
  const literal = source.slice(start + startMarker.length, close + 1);
  return vm.runInNewContext(`(${literal})`, {}, { filename: 'newtab-library-i18n-extract.js' });
}

function fixture() {
  const readUnread = {
    id: 'item-alpha', type: 'tab', title: 'Distributed notes', url: 'https://alpha.test/',
    readLaterAt: 100, createdAt: 100,
  };
  const readDone = {
    id: 'item-beta', type: 'tab', title: 'Distributed systems', url: 'https://beta.test/',
    readLaterAt: 200, readAt: 300, createdAt: 200,
  };
  const laterUnread = {
    id: 'item-gamma', type: 'tab', title: 'Networking', url: 'https://gamma.test/',
    readLaterAt: 400, createdAt: 400,
  };
  const workspace = {
    id: 'ws/one', name: 'Research',
    categories: [{
      id: 'space-one', name: 'Thesis',
      groups: [{
        id: 'group-one', name: 'Sources',
        items: [{ id: 'stack-one', type: 'stack', name: 'Reading', items: [readUnread, readDone] }, laterUnread],
      }],
    }],
  };
  return { workspace, readUnread, readDone, laterUnread };
}

function tr(key, vars = {}) {
  if (key === 'library.destinationPath') {
    return `${vars.workspace} › ${vars.space} › Group: ${vars.group}`;
  }
  if (key === 'library.destinationStack') return `${vars.path} › Stack: ${vars.stack}`;
  if (key === 'library.openPage') return 'Open page';
  if (key === 'library.viewDetails') return 'View details';
  if (key === 'library.markRead') return 'Mark as read';
  if (key === 'library.markUnread') return 'Mark as unread';
  return key;
}

function testFilteredReadLaterLedger() {
  const { workspace, readDone } = fixture();
  const context = loadFunctions([
    'collectWorkspaceTabs', 'libraryRowsForState', 'libraryDestinationText',
  ], { tr });
  const state = { mode: 'read-later', query: 'distributed', status: 'read', sort: 'title' };
  const rows = plain(context.libraryRowsForState(workspace, state));
  assert.equal(rows.length, 1, 'the filtered Read Later ledger must show each matching save exactly once');
  assert.equal(rows[0].item.id, readDone.id);
  assert.equal(
    context.libraryDestinationText(rows[0]),
    'Research › Thesis › Group: Sources › Stack: Reading',
    'every recovery row must expose the complete saved destination',
  );
}

function testRecoveryRowActionsAreExplicit() {
  const { workspace, readUnread } = fixture();
  const context = loadFunctions([
    'collectWorkspaceTabs', 'libraryDestinationText', 'libraryLedgerRowModel',
  ], {
    tr,
    dispUrl: url => new URL(url).hostname,
    fmtTimeRelative: () => '2 days ago',
  });
  const row = context.collectWorkspaceTabs(workspace).find(candidate => candidate.item.id === readUnread.id);
  assert.deepEqual(plain(context.libraryLedgerRowModel(row, 'read-later')), {
    id: 'item-alpha',
    title: 'Distributed notes',
    url: 'alpha.test',
    destination: 'Research › Thesis › Group: Sources › Stack: Reading',
    openLabel: 'Open page',
    detailsLabel: 'View details',
    age: '2 days ago',
    statusLabel: 'Mark as read',
  }, 'each ledger row must name its destination and both recovery actions without relying on a hidden menu');
}

function testRecoveryActionsRequireTheSameVisibleSave() {
  const { workspace, readDone } = fixture();
  const state = { workspaces: [workspace], activeWsId: workspace.id };
  const libraryState = { mode: 'read-later', query: 'distributed', status: 'read', sort: 'title' };
  const context = loadFunctions([
    'collectWorkspaceItems',
    'collectWorkspaceTabs',
    'itemDetailValueFingerprint',
    'itemDetailLocationFingerprint',
    'resolveUniqueHomePreviewItem',
    'createSavedItemRecoveryContext',
    'resolveSavedItemRecoveryTarget',
    'libraryRouteQuery',
    'libraryRowsForState',
    'libraryRowFocusKey',
    'createLibraryRecoveryContext',
    'resolveLibraryRecoveryTarget',
  ], {
    State: { get: () => state },
    activeWs: () => state.workspaces.find(candidate => candidate.id === state.activeWsId),
    activeLibraryMode: 'read-later',
    activeLibraryState: libraryState,
    boardDetailItemId: null,
    LIBRARY_LEDGER_MODES: ['all', 'favorites', 'read-later'],
  });
  const row = context.collectWorkspaceTabs(workspace).find(candidate => candidate.item === readDone);
  const receipt = context.createLibraryRecoveryContext(row, libraryState);
  assert.equal(context.resolveLibraryRecoveryTarget(receipt).item, readDone,
    'an unchanged visible saved item must remain recoverable');

  libraryState.query = 'networking';
  assert.equal(context.resolveLibraryRecoveryTarget(receipt), null,
    'a stale row from an older Library query must not borrow a newly visible item');
}

function testVisibleActionsShareOneExactRecoveryBoundary() {
  const { workspace, readDone } = fixture();
  const state = { workspaces: [workspace], activeWsId: workspace.id };
  const libraryState = { mode: 'read-later', query: 'distributed', status: 'read', sort: 'title' };
  const calls = [];
  const context = loadFunctions([
    'collectWorkspaceItems',
    'collectWorkspaceTabs',
    'itemDetailValueFingerprint',
    'itemDetailLocationFingerprint',
    'resolveUniqueHomePreviewItem',
    'createSavedItemRecoveryContext',
    'resolveSavedItemRecoveryTarget',
    'libraryRouteQuery',
    'libraryRowsForState',
    'libraryRowFocusKey',
    'createLibraryRecoveryContext',
    'resolveLibraryRecoveryTarget',
    'activateLibraryRecovery',
  ], {
    State: { get: () => state },
    activeWs: () => workspace,
    activeLibraryMode: 'read-later',
    activeLibraryState: libraryState,
    boardDetailItemId: null,
    LIBRARY_LEDGER_MODES: ['all', 'favorites', 'read-later'],
    openSavedTabItem: (item, options) => { calls.push(['open', item, options]); return true; },
    openItemDetail: (id, options) => { calls.push(['details', id, options]); return true; },
    focusDialogOpener: opener => calls.push(['focus', opener]),
    toast: message => calls.push(['toast', message]),
    tr,
  });
  const row = context.collectWorkspaceTabs(workspace).find(candidate => candidate.item === readDone);
  const receipt = context.createLibraryRecoveryContext(row, libraryState);
  const opener = { id: 'visible-action' };

  assert.equal(context.activateLibraryRecovery(receipt, 'open', opener), true);
  assert.equal(calls[0][0], 'open');
  assert.equal(calls[0][1], readDone);
  assert.equal(calls[0][2].opener, opener);

  assert.equal(context.activateLibraryRecovery(receipt, 'details', opener), true);
  assert.deepEqual(plain(calls.slice(1)), [
    ['focus', opener],
    ['details', readDone.id, { returnFocusKey: receipt.focusKey }],
  ], 'Open page and View details must resolve the same frozen visible row before dispatch');
}

function testLibraryRouteStateNeverWritesDurableStorage() {
  const calls = [];
  const context = loadFunctions(['openLibrarySurface'], {
    LIBRARY_MODES: ['all', 'favorites', 'read-later', 'archive', 'trash'],
    activeWs: () => ({ id: 'ws/one' }),
    Router: {
      navigate: (route, options = {}) => {
        calls.push({ route: plain(route), options: plain(options) });
        return true;
      },
    },
  });
  assert.equal(context.openLibrarySurface('read-later'), undefined);
  assert.deepEqual(calls, [{
    route: { type: 'library', wsId: 'ws/one', mode: 'read-later', query: {} },
    options: { persist: false },
  }], 'switching Library modes must keep ephemeral ledger state out of chrome.storage.local');

  const renderer = extractFunction('renderLibraryLedgerSurface');
  assert.match(renderer, /Router\.sync\(\{\s*replace:\s*true\s*\}\)/,
    'query, status, and sort changes must replace the current URL entry');
  assert.doesNotMatch(renderer, /State\.persist|persistNow|chrome\.storage\.local\.set/,
    'rendering or filtering the ledger must never create a durable write');
}

function testLibraryDetailRouteRequiresAUniqueVisibleRow() {
  const { workspace, readDone } = fixture();
  const state = { workspaces: [workspace], activeWsId: workspace.id };
  const context = loadFunctions([
    'collectWorkspaceItems',
    'collectWorkspaceTabs',
    'resolveUniqueHomePreviewItem',
    'libraryRowsForState',
    'libraryDetailItemIdForRoute',
  ], {
    State: { get: () => state },
    LIBRARY_LEDGER_MODES: ['all', 'favorites', 'read-later'],
  });
  const visibleState = { mode: 'read-later', query: 'distributed', status: 'read', sort: 'title' };
  assert.equal(context.libraryDetailItemIdForRoute(workspace, visibleState, readDone.id), readDone.id,
    'a unique item visible in the restored ledger may reopen its Details sheet');
  assert.equal(context.libraryDetailItemIdForRoute(workspace, {
    ...visibleState, query: 'networking',
  }, readDone.id), null,
  'a filtered-out item must not open behind a different ledger result');

  const duplicateWorkspace = {
    id: 'ws/two', name: 'Duplicate',
    categories: [{ id: 'space-two', name: 'Other', groups: [{
      id: 'group-two', name: 'Other', items: [{ ...readDone }],
    }] }],
  };
  state.workspaces.push(duplicateWorkspace);
  assert.equal(context.libraryDetailItemIdForRoute(workspace, visibleState, readDone.id), null,
    'a duplicate global item id must fail closed instead of borrowing the first match');
}

function testLibraryQueryCompositionIsStable() {
  const context = loadFunctions(['bindLibraryQueryControl']);
  const applied = [];
  const input = {
    value: '',
    dataset: {},
    blurCount: 0,
    blur() { this.blurCount += 1; },
  };
  assert.equal(context.bindLibraryQueryControl(input, value => applied.push(value)), true,
    'the Library query must install one composition-aware controller');

  input.oncompositionstart();
  input.value = '研';
  assert.equal(input.oninput({ currentTarget: input, isComposing: true }), false,
    'interim IME input must not filter results or replace the route');
  let escapePrevented = false;
  assert.equal(input.onkeydown({
    key: 'Escape', keyCode: 229, isComposing: true,
    preventDefault() { escapePrevented = true; },
  }), false, 'IME-owned Escape must remain available to cancel composition');
  assert.equal(escapePrevented, false);
  assert.equal(input.value, '研');
  assert.equal(input.blurCount, 0);
  assert.deepEqual(applied, []);

  input.value = '研究';
  assert.equal(input.oncompositionend(), true,
    'composition end must commit the exact completed query once');
  assert.deepEqual(applied, ['研究']);
  assert.equal(input.oninput({ currentTarget: input, isComposing: false }), false,
    'the browser input event following composition end must not duplicate the commit');
  assert.deepEqual(applied, ['研究']);

  input.value = '研究資料';
  assert.equal(input.oninput({ currentTarget: input, isComposing: false }), true,
    'ordinary input must continue to filter immediately');
  assert.deepEqual(applied, ['研究', '研究資料']);
  escapePrevented = false;
  assert.equal(input.onkeydown({
    key: 'Escape', keyCode: 27, isComposing: false,
    preventDefault() { escapePrevented = true; },
  }), true, 'settled Escape must retain the established clear-and-blur action');
  assert.equal(escapePrevented, true);
  assert.equal(input.value, '');
  assert.equal(input.blurCount, 1);
  assert.deepEqual(applied, ['研究', '研究資料', '']);

  const ledgerSource = extractFunction('renderLibraryLedgerSurface');
  assert.match(ledgerSource,
    /bindLibraryQueryControl\(search, query => \{[\s\S]*updateState\(\{ query \}\)[\s\S]*paint\(\)/,
    'All Links, Favorites, and Read Later must share the composition-safe query controller');
  assert.doesNotMatch(ledgerSource, /search\.on(?:input|compositionstart|compositionend|keydown)\s*=/,
    'the Library renderer must not retain a second direct query-event path');
}

function testReadLaterRendersOneLedger() {
  const librarySource = extractFunction('renderLibrarySurface');
  const readLaterSource = extractFunction('renderReadLaterSurface');
  const ledgerSource = extractFunction('renderLibraryLedgerSurface');
  assert.match(librarySource, /renderLibraryLedgerSurface\(/,
    'All Links and Favorites must use the shared recovery ledger');
  assert.match(readLaterSource, /renderLibraryLedgerSurface\(/,
    'Read Later must use the same recovery ledger');
  assert.match(ledgerSource, /buildLibraryLedgerRow\(/,
    'the shared ledger must render its exact recovery row contract');
  assert.match(ledgerSource, /lib-hd[\s\S]*lib-title[\s\S]*lib-tools[\s\S]*lib-modes[\s\S]*lib-status[\s\S]*lib-field[\s\S]*lib-sort[\s\S]*lib-card[\s\S]*library-list/,
    'Library must read as one heading, then one row of view switch, reading status, filter and sort (no stacked bars), then the ledger card');
  assert.doesNotMatch(ledgerSource, /library-location|library-toolbar|library-query-row/,
    'the hidden scope chip and the stacked toolbar rows must not come back');
  assert.doesNotMatch(`${readLaterSource}\n${ledgerSource}\n${css}`, /read-later-cards|read-later-card(?:-|\s|\{|\.)|read-later-next/,
    'Read Later must not duplicate queue items in a separate Up next card section');
}

function testLedgerPresentationKeepsRecoveryContextReachable() {
  const rowSource = extractFunction('buildLibraryLedgerRow');
  const cssLf = css.replace(/\r\n/g, '\n');
  const libraryCss = cssLf.slice(cssLf.indexOf('LIBRARY PAGE (2026-11 canvas)'));
  assert.ok(libraryCss.length > 2000, 'the Library page layer must be present');
  assert.match(rowSource, /<div class="library-copy lib-copy">[\s\S]*library-title[\s\S]*library-destination[\s\S]*library-url[\s\S]*<\/div>/,
    'each ledger record must keep title, exact destination, and source in one recovery block');
  assert.match(rowSource, /library-primary[\s\S]*library-details[\s\S]*\$\{toggleAction\}[\s\S]*library-more/,
    'visible row actions must lead with Open and Details before contextual state and More');
  const menuSource = rowSource.slice(rowSource.indexOf('const actions ='), rowSource.indexOf('return actions;'));
  assert.ok(menuSource.length > 50, 'the row menu must be extractable');
  assert.doesNotMatch(menuSource.replace('...folded,', ''), /library\.(?:openPage|viewDetails)|detailsLabel|cmIcons\.(?:open|detail)|favoriteAction|readStatusAction|toggleFavoriteFrom/,
    'More must not duplicate visible Open, Details, Favorite, or reading-status actions');
  assert.match(rowSource, /const folded = shown\(row\.querySelector\('\.lib-acts'\)\) \? \[\] : \[[\s\S]*?detailsLabel[\s\S]*?toggleFavoriteFrom\(owner\)[\s\S]*?\];/,
    'Details and Favorite join More only when the row is not showing them (phone width, touch)');
  assert.match(menuSource, /readLaterAction[\s\S]*archiveAction/,
    'More must retain the additional Read Later and Archive lifecycle actions');
  assert.match(rowSource, /bindBoardItemContextMenu\(row, opener => \{[\s\S]*\}, \{ menuButton: more \}\);/,
    'the More menu must anchor to its row control for pointer and keyboard activation, and right-click opens it too');
  assert.doesNotMatch(rowSource, /event\.page[XY]/,
    'keyboard-opened row menus must not fall back to the viewport origin');
  assert.doesNotMatch(css, /@media \(max-width: 1500px\)[\s\S]*?\.lib-row\s*\{/s,
    'the ledger must not fragment every 1280px record into three disconnected bands');
  assert.match(libraryCss, /@container \(max-width: 640px\) \{[\s\S]*?\.lib-row \{\n\s*display: grid;\n\s*grid-template-columns: 24px minmax\(0, 1fr\) 44px;\n\s*grid-template-areas: "fav title more" "meta meta meta";[\s\S]*?\.lib-row \.lib-meta \{ grid-area: meta;[\s\S]*?\.lib-row \.lib-acts \{ display: none; \}\n\s*\.lib-row \.lib-more \{ grid-area: more; display: grid;/,
    'at phone width the title takes the row beside a small icon and More, the destination wraps whole on the meta line across the full row, and the row actions fold into More');
  assert.doesNotMatch(libraryCss.slice(libraryCss.indexOf('@container (max-width: 640px)')), /\.library-destination \{[^}]*(?:white-space: nowrap|text-overflow|display: none)/,
    'the phone layout wraps the destination rather than cutting it');
  assert.match(libraryCss, /@media \(hover: none\) \{\n\s*\.lib-row \.lib-acts \{ display: none; \}\n\s*\.lib-row \.lib-more \{ display: grid; \}/,
    'touch screens reach the row actions through More');
  assert.doesNotMatch(css, /\.library-destination\s*\{[^}]*(?:display:\s*none|text-overflow)/,
    'the full saved destination must remain visible at every supported width');
  assert.match(libraryCss, /\.lib-meta \{[^}]*font-family: var\(--today-mono\);/,
    'the destination is set in the locator mono type');
  assert.match(libraryCss, /\.lib-meta \.library-destination \{ overflow-wrap: anywhere; \}/,
    'the exact saved destination must wrap rather than be cut');
  assert.match(libraryCss, /\.lib-field,\n\.lib-sort \{\n\s*height: 52px;/,
    'the Library filter and sort are full-height fields');
  assert.match(libraryCss, /\.lib-field:focus-within,\n\.lib-sort:focus-within \{[^}]*0 0 0 4px/,
    'the complete Library find control must expose one visible keyboard focus boundary');
  assert.doesNotMatch(css, /\.lib-field input:focus-visible/,
    'the nested query input must not draw a second competing focus ring');
  assert.match(extractFunction('renderLibraryLedgerSurface'), /<p class="sr-only library-result-count" aria-live="polite"><\/p>/,
    'the record count is announced, not shown as another pill (the view switch shows the counts)');
  assert.match(libraryCss, /\.lib-card \{[^}]*border: 1px solid var\(--today-rule\);[^}]*border-radius: 22px;/,
    'the saved records sit in one quiet card');
  for (const selector of ['.lib-seg-btn', '.lib-ai', '.lib-text', '.lib-check', '.lib-clear']) {
    const rule = libraryCss.match(new RegExp(`\\n${selector.replace('.', '\\.')} \\{[^}]*\\}`));
    assert.ok(rule && /(?:^|\s|;)height: (?:4[4-9]|5\d)px/.test(rule[0]), `${selector} must keep a 44 px target`);
  }
  assert.match(libraryCss, /\.lib-open \{[^}]*margin: -11px 0;\n\s*padding: 11px 0;[^}]*line-height: 22px;/,
    'the title button is a 44 px target, and its stretched area opens from anywhere on the row');
  assert.match(cssLf, /body\.blur-privacy \.library-title,\nbody\.blur-privacy \.library-url,\nbody\.blur-privacy \.library-destination,/,
    'privacy blur must cover the Library title, source, and destination trail');
  assert.doesNotMatch(css, /library-location/,
    'the removed scope chip leaves no styles behind');
  assert.match(libraryCss, /\.lib-cap \{[^}]*color: var\(--accent-text, #fff\);/,
    'the Open hint uses the theme contrast token');
  assert.match(libraryCss, /\.lib-ebtn\.is-primary \{[^}]*color: var\(--accent-text, #fff\);/,
    'the primary empty-state action uses the theme contrast token');
  assert.match(libraryCss, /\.lib-star\.is-on \{ color: var\(--text\); \}\n\.lib-star\.is-on svg \{ fill: currentColor; \}/,
    'favorite emphasis must follow the active theme token');
  assert.match(libraryCss, /@media \(forced-colors: active\) \{[\s\S]*?\.lib-card,[\s\S]*?border: 1px solid CanvasText;[\s\S]*?\.lib-thumb,\n\s*\.lib-gi \{ outline: 2px solid Highlight;/,
    'the card, the pressed view and the highlighted row remain distinct in forced colors');
}

function testLedgerCopyIsLocalizedInEnglishAndTaiwanChinese() {
  const i18n = readI18n();
  const keys = [
    'library.subtitleAll', 'library.subtitleFavorites', 'library.resultCountOne', 'library.resultCount',
    'library.destinationPath', 'library.destinationStack', 'library.openPage', 'library.viewDetails',
    'library.openPageFor', 'library.viewDetailsFor',
    'library.sort', 'library.sortNewest', 'library.sortOldest', 'library.sortTitle', 'library.moreActions',
    'library.readingStatus', 'library.unread', 'library.read', 'library.all', 'library.markRead',
    'library.markUnread', 'library.markedRead', 'library.markedUnread', 'library.savedWhen',
    'library.queuedWhen', 'library.localStorage', 'library.itemUnavailable',
    'library.view', 'library.modeCount', 'library.archiveNamed', 'library.allCaughtUp',
    'library.nothingRead', 'library.showUnread',
  ];
  for (const key of keys) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  assert.equal(i18n['zh-TW']['library.destinationPath'], '{workspace} › {space} › 群組：{group}');
  assert.equal(i18n['zh-TW']['library.openPage'], '開啟頁面');
  assert.equal(i18n['zh-TW']['library.viewDetails'], '查看詳細資料');
  const statusPlanSource = extractFunction('planSavedTabReturnMutation');
  const statusCommitSource = extractFunction('commitSavedTabReturnMutation');
  assert.match(statusPlanSource, /historyKey:\s*markingUnread\s*\?\s*'library\.markUnread'\s*:\s*'library\.markRead'/,
    'Read Later history must use localized action copy');
  assert.match(statusCommitSource, /State\.snapshot\(tr\(plan\.historyKey\)\)/,
    'return-marker history must resolve the localized action key at commit time');
  assert.match(statusCommitSource, /toast\(tr\(plan\.successKey\), receipt \|\| \{\}\)/,
    'Read Later success feedback must use localized copy (the Library page adds Undo through its receipt options)');
  assert.doesNotMatch(`${statusPlanSource}\n${statusCommitSource}`, /['"]Mark(?:ed)? (?:as )?(?:un)?read['"]/,
    'Read Later status changes must not leak hardcoded English');
  const rowSource = extractFunction('buildLibraryLedgerRow');
  assert.match(rowSource, /aria-label="\$\{esc\(tr\('library\.openPageFor',\s*\{\s*title:\s*model\.title\s*\}\)\)\}"/,
    'repeated Open page controls must name their saved page to assistive technology');
  assert.match(rowSource, /aria-label="\$\{esc\(tr\('library\.viewDetailsFor',\s*\{\s*title:\s*model\.title\s*\}\)\)\}"/,
    'repeated View details controls must name their saved page to assistive technology');
}

function createReturnMarkerReceiptHarness({ favorite = false, readLaterAt = null, readAt = null, recovery = false } = {}) {
  const item = {
    id: 'return-item',
    type: 'tab',
    title: 'Return to this',
    url: 'https://return.test/',
    favorite,
    ...(readLaterAt == null ? {} : { readLaterAt }),
    ...(readAt == null ? {} : { readAt }),
  };
  const stack = { id: 'return-stack', type: 'stack', name: 'Review', items: [item] };
  const state = {
    activeWsId: 'return-workspace',
    workspaces: [{
      id: 'return-workspace',
      categories: [{ id: 'return-space', groups: [{ id: 'return-group', items: [stack] }] }],
    }],
  };
  const opener = {
    id: 'return-opener',
    isConnected: true,
    focus() { context.__calls.push({ type: 'focus' }); },
  };
  const context = vm.createContext({
    __item: item,
    __state: state,
    __opener: opener,
    __recovery: recovery,
    __calls: [],
    __frames: [],
    __resolveWrite: null,
    __rejectWrite: null,
    State: {
      get() { return context.__state; },
      isRecoveryRequired() { return context.__recovery; },
      snapshot(label) { context.__calls.push({ type: 'snapshot', label }); },
      persistNow() {
        context.__calls.push({ type: 'persist' });
        return new Promise((resolve, reject) => {
          context.__resolveWrite = resolve;
          context.__rejectWrite = reject;
        });
      },
      requireRecovery() { context.__recovery = true; context.__calls.push({ type: 'require-recovery' }); },
    },
    setSavedTabReturnMutationBusy(candidate, candidateOpener, busy) {
      context.__calls.push({ type: 'busy', candidate, opener: candidateOpener, busy });
      return true;
    },
    showStateRecoveryRequired(error) { context.__calls.push({ type: 'show-recovery', error }); },
    renderBoard() { context.__calls.push({ type: 'render' }); },
    toast(message) { context.__calls.push({ type: 'toast', message }); },
    tr: key => `translated:${key}`,
    requestAnimationFrame(callback) {
      context.__calls.push({ type: 'frame' });
      context.__frames.push(callback);
      return context.__frames.length;
    },
  });
  vm.runInContext([
    'itemDetailValueFingerprint',
    'identityItemTargets',
    'currentItemReminderIdentity',
    'createItemReminderMutationContext',
    'resolveItemReminderMutationTarget',
    'isSavedTabReturnMutationPending',
    'createSavedTabReturnMutationContext',
    'resolveSavedTabReturnMutationTarget',
    'planSavedTabReturnMutation',
    'focusSavedTabReturnMutationOpener',
    'commitSavedTabReturnMutation',
  ].map(extractFunction).join('\n\n').replace(
    'function isSavedTabReturnMutationPending()',
    'let savedTabReturnMutationPending = null;\nfunction isSavedTabReturnMutationPending()',
  ) + '\nglobalThis.__createReturnContext = createSavedTabReturnMutationContext;\n'
    + 'globalThis.__commitReturnMarker = commitSavedTabReturnMutation;', context, {
    filename: 'saved-tab-return-marker-receipt.js',
  });
  context.__review = context.__createReturnContext(item);
  return context;
}

async function testSavedTabReturnMarkersWaitForAcceptedStorage() {
  const favorite = createReturnMarkerReceiptHarness();
  assert.ok(favorite.__review, 'a unique nested saved tab must produce one exact return-marker context');
  const favoriting = favorite.__commitReturnMarker(favorite.__review, 'favorite', favorite.__opener, 500);
  assert.equal(favorite.__item.favorite, true, 'the guarded graph may hold the candidate while visible UI remains unchanged');
  assert.deepEqual(
    favorite.__calls.map(call => call.type),
    ['busy', 'snapshot', 'persist'],
    'one pending owner, localized history entry, and write must begin before feedback',
  );
  assert.equal(favorite.__calls[1].label, 'translated:itemAction.addFavorite');
  assert.equal(favorite.__calls.some(call => ['render', 'toast', 'focus'].includes(call.type)), false);
  assert.equal(
    await favorite.__commitReturnMarker(favorite.__review, 'favorite', favorite.__opener, 501),
    false,
    'a second return-marker action must not race the pending receipt',
  );
  assert.equal(favorite.__calls.filter(call => call.type === 'persist').length, 1);
  favorite.__resolveWrite({ ok: true, revision: 31 });
  assert.equal(await favoriting, true);
  assert.deepEqual(favorite.__calls.slice(3).map(call => call.type), ['busy', 'render', 'toast']);
  assert.equal(favorite.__calls.at(-1).message, 'translated:itemAction.addedFavorite');

  const unfavorite = createReturnMarkerReceiptHarness({ favorite: true });
  const unfavoriting = unfavorite.__commitReturnMarker(unfavorite.__review, 'favorite', unfavorite.__opener, 600);
  assert.equal(unfavorite.__item.favorite, false);
  assert.equal(unfavorite.__calls[1].label, 'translated:itemAction.removeFavorite');
  unfavorite.__resolveWrite({ ok: true, revision: 32 });
  assert.equal(await unfavoriting, true);
  assert.equal(unfavorite.__calls.at(-1).message, 'translated:itemAction.removedFavorite');

  const later = createReturnMarkerReceiptHarness({ readAt: 50 });
  const addingLater = later.__commitReturnMarker(later.__review, 'read-later', later.__opener, 700);
  assert.equal(later.__item.readLaterAt, 700, 'adding Read Later must freeze the activation timestamp');
  assert.equal(later.__item.readAt, undefined, 'adding Read Later must reset prior read state');
  assert.equal(later.__calls[1].label, 'translated:itemAction.saveReadLater');
  later.__resolveWrite({ ok: true, revision: 33 });
  assert.equal(await addingLater, true);
  assert.equal(later.__calls.at(-1).message, 'translated:itemAction.savedReadLater');

  const removeLater = createReturnMarkerReceiptHarness({ readLaterAt: 100, readAt: 200 });
  const removingLater = removeLater.__commitReturnMarker(
    removeLater.__review, 'read-later', removeLater.__opener, 800,
  );
  assert.equal(removeLater.__item.readLaterAt, undefined);
  assert.equal(removeLater.__item.readAt, undefined);
  removeLater.__resolveWrite({ ok: true, revision: 34 });
  assert.equal(await removingLater, true);
  assert.equal(removeLater.__calls.at(-1).message, 'translated:itemAction.removedReadLater');

  const read = createReturnMarkerReceiptHarness({ readLaterAt: 100 });
  const markingRead = read.__commitReturnMarker(read.__review, 'read-status', read.__opener, 900);
  assert.equal(read.__item.readAt, 900, 'marking read must freeze the activation timestamp');
  assert.equal(read.__calls[1].label, 'translated:library.markRead');
  read.__resolveWrite({ ok: true, revision: 35 });
  assert.equal(await markingRead, true);
  assert.equal(read.__calls.at(-1).message, 'translated:library.markedRead');

  const unread = createReturnMarkerReceiptHarness({ readLaterAt: 100, readAt: 200 });
  const markingUnread = unread.__commitReturnMarker(unread.__review, 'read-status', unread.__opener, 1000);
  assert.equal(unread.__item.readAt, undefined);
  assert.equal(unread.__calls[1].label, 'translated:library.markUnread');
  unread.__resolveWrite({ ok: true, revision: 36 });
  assert.equal(await markingUnread, true);
  assert.equal(unread.__calls.at(-1).message, 'translated:library.markedUnread');

  const outsideQueue = createReturnMarkerReceiptHarness();
  assert.equal(await outsideQueue.__commitReturnMarker(
    outsideQueue.__review, 'read-status', outsideQueue.__opener, 1100,
  ), false);
  assert.deepEqual(outsideQueue.__calls, [], 'read status outside Read Later must remain inert');

  const stale = createReturnMarkerReceiptHarness();
  stale.__item.title = 'Changed elsewhere';
  assert.equal(await stale.__commitReturnMarker(stale.__review, 'favorite', stale.__opener, 1200), false);
  assert.deepEqual(stale.__calls.map(call => call.type), ['busy', 'frame']);
  stale.__frames[0]();
  assert.deepEqual(stale.__calls.slice(2).map(call => call.type), ['busy', 'toast', 'focus']);
  assert.equal(stale.__calls[3].message, 'translated:detail.changed');
  assert.equal(stale.__calls.some(call => ['snapshot', 'persist', 'render'].includes(call.type)), false);

  const recovery = createReturnMarkerReceiptHarness({ recovery: true });
  assert.equal(await recovery.__commitReturnMarker(
    recovery.__review, 'favorite', recovery.__opener, 1300,
  ), false);
  assert.deepEqual(recovery.__calls, []);

  const rejected = createReturnMarkerReceiptHarness();
  const rejection = rejected.__commitReturnMarker(rejected.__review, 'favorite', rejected.__opener, 1400);
  rejected.__recovery = true;
  rejected.__rejectWrite(Object.assign(new Error('unknown receipt'), { code: 'LOCUS_STATE_UNKNOWN_ACK' }));
  assert.equal(await rejection, false);
  assert.equal(rejected.__calls.filter(call => call.type === 'persist').length, 1, 'unknown receipt must not retry');
  assert.deepEqual(rejected.__calls.slice(3).map(call => call.type), ['busy', 'show-recovery']);
  assert.equal(rejected.__calls.some(call => ['render', 'toast', 'focus'].includes(call.type)), false);

  const interlockSource = extractFunction('setSavedTabReturnMutationInterlock');
  const busySource = extractFunction('setSavedTabReturnMutationBusy');
  const commonSource = extractFunction('commonActs');
  const runnerSource = extractFunction('runLibraryLedgerMutation');
  const rowSource = extractFunction('buildLibraryLedgerRow');
  assert.match(
    interlockSource,
    /setElementInertOwner\(sibling, 'saved-tab-return', true\)[\s\S]*?setElementInertOwner\(element, 'saved-tab-return', false\)/,
    'the exact return-marker path must own and later release its siblings',
  );
  assert.match(
    busySource,
    /setAttribute\('aria-busy', String\(busy\)\)[\s\S]*?setAttribute\('aria-disabled', String\(busy\)\)[\s\S]*?is-return-marker-pending/,
    'the originating marker and row/card must expose one truthful pending state',
  );
  assert.ok(
    [...source.matchAll(/isSavedTabReturnMutationPending\(\)/g)].length >= 7,
    'pending return markers must block duplicate action, routes, navigation, and global shortcuts',
  );
  assert.match(commonSource, /await toggleFavorite\(it, mutationOpener\)[\s\S]*?await toggleReadLater\(it, mutationOpener\)/,
    'Board actions must await acceptance before their focus continuation');
  assert.match(runnerSource, /async function runLibraryLedgerMutation[\s\S]*?await mutation\(\)[\s\S]*?requestAnimationFrame/,
    'Library focus continuation must wait for the accepted marker result');
  assert.match(rowSource, /toggleFavorite\(item, opener, receipt\)[\s\S]*?toggleReadLater\(item, opener, receipt\)[\s\S]*?toggleFavoriteFrom\(favorite\)[\s\S]*?toggleReadStatus\(item, readStatus, receipt\)[\s\S]*?toggleReadLaterFrom\(laterButton\)[\s\S]*?toggleReadLaterFrom\(owner\)/,
    'visible Library markers and More actions must identify their exact originating control');
  assert.match(
    css,
    /\[data-return-marker\]\[aria-busy="true"\][\s\S]*?animation:\s*return-marker-receipt-pulse/,
    'the previously accepted marker must stay visible with one restrained receipt signal',
  );

  let settleMutation;
  const focusCalls = [];
  const runner = loadFunctions(['runLibraryLedgerMutation'], {
    libraryPageSession: null,
    activeLibraryState: { mode: 'favorites' },
    activeLibraryMode: 'favorites',
    requestAnimationFrame(callback) { focusCalls.push('frame'); callback(); },
    focusLibraryLedgerTarget(id, action) { focusCalls.push([id, action]); },
  });
  const continuation = runner.runLibraryLedgerMutation(
    [{ item: { id: 'current' } }, { item: { id: 'next' } }],
    0,
    () => new Promise(resolve => { settleMutation = resolve; }),
    { itemRemains: false, action: 'favorite' },
  );
  assert.deepEqual(focusCalls, [], 'pending storage must not move Library focus');
  settleMutation(true);
  assert.equal(await continuation, true);
  assert.deepEqual(focusCalls, ['frame', ['next', 'open']], 'acceptance may focus the exact fallback row');
}

function createSavedPageArchiveReceiptHarness({
  recovery = false,
  returnPending = false,
  itemType = 'tab',
  local = false,
} = {}) {
  const item = itemType === 'note'
    ? { id: 'archive-page', type: 'note', html: '<strong>Local field note</strong>', color: 'blue' }
    : itemType === 'todo'
      ? { id: 'archive-page', type: 'todo', text: 'Review local source', done: false }
      : itemType === 'stack'
        ? {
            id: 'archive-page', type: 'stack', name: 'Nested evidence', symbol: '🗂️', color: '#a855f7',
            items: [{ id: 'archive-child', type: 'tab', title: 'Preserved source', url: 'https://nested.test/' }],
          }
      : {
          id: 'archive-page',
          type: 'tab',
          title: 'File this page',
          url: 'https://archive.test/',
          favorite: true,
          readLaterAt: 400,
        };
  const stack = { id: 'archive-stack', type: 'stack', name: 'Review', items: [item] };
  const state = {
    activeWsId: 'archive-workspace',
    workspaces: [{
      id: 'archive-workspace',
      name: 'Research',
      categories: [{
        id: 'archive-space',
        name: 'Sources',
        groups: [{ id: 'archive-group', name: 'Read next', items: [stack] }],
      }],
    }],
    archive: [],
  };
  const opener = {
    id: 'archive-opener',
    isConnected: true,
    focus() { context.__calls.push({ type: 'focus' }); },
  };
  const context = vm.createContext({
    __item: item,
    __stack: stack,
    __state: state,
    __opener: opener,
    __recovery: recovery,
    __returnPending: returnPending,
    __calls: [],
    __frames: [],
    __generatedIdCalls: 0,
    __resolveWrite: null,
    __rejectWrite: null,
    State: {
      get() { return context.__state; },
      isRecoveryRequired() { return context.__recovery; },
      snapshot(label) { context.__calls.push({ type: 'snapshot', label }); },
      persistNow() {
        context.__calls.push({ type: 'persist' });
        return new Promise((resolve, reject) => {
          context.__resolveWrite = resolve;
          context.__rejectWrite = reject;
        });
      },
      requireRecovery() { context.__recovery = true; context.__calls.push({ type: 'require-recovery' }); },
    },
    isSavedTabReturnMutationPending() { return context.__returnPending; },
    setSavedPageArchiveBusy(candidate, candidateOpener, busy) {
      context.__calls.push({ type: 'busy', candidate, opener: candidateOpener, busy });
      return true;
    },
    showStateRecoveryRequired(error) { context.__calls.push({ type: 'show-recovery', error }); },
    renderBoard() { context.__calls.push({ type: 'render' }); },
    renderArchiveList() { context.__calls.push({ type: 'render-archive' }); },
    toast(message, options) { context.__calls.push({ type: 'toast', message, options }); },
    tr: key => `translated:${key}`,
    requestAnimationFrame(callback) {
      context.__calls.push({ type: 'frame' });
      context.__frames.push(callback);
      return context.__frames.length;
    },
  });
  vm.runInContext([
    'itemDetailValueFingerprint',
    'identityItemTargets',
    'currentItemReminderIdentity',
    'createItemReminderMutationContext',
    'resolveItemReminderMutationTarget',
    'isSavedPageArchivePending',
    'createSavedPageArchiveContext',
    'createBoardLocalArchiveContext',
    'resolveSavedPageArchiveTarget',
    'focusSavedPageArchiveOpener',
    'commitSavedPageArchive',
  ].map(extractFunction).join('\n\n').replace(
    'function isSavedPageArchivePending()',
    'let savedPageArchivePending = null;\nfunction isSavedPageArchivePending()',
  ) + '\nglobalThis.__createArchiveContext = createSavedPageArchiveContext;\n'
    + 'globalThis.__createLocalArchiveContext = createBoardLocalArchiveContext;\n'
    + 'globalThis.__commitArchive = commitSavedPageArchive;', context, {
    filename: 'saved-page-archive-receipt.js',
  });
  context.__review = local
    ? context.__createLocalArchiveContext(item)
    : context.__createArchiveContext(item);
  return context;
}

async function testSavedPageArchiveWaitsForAcceptedStorage() {
  const accepted = createSavedPageArchiveReceiptHarness();
  assert.ok(accepted.__review, 'a unique nested saved page must produce one exact Archive context');
  const archiving = accepted.__commitArchive(accepted.__review, accepted.__opener, 1700);
  assert.equal(accepted.__stack.items.length, 0, 'the guarded graph may hold the Archive candidate');
  assert.deepEqual(plain(accepted.__state.archive), [{
    kind: 'item',
    data: {
      id: 'archive-page', type: 'tab', title: 'File this page', url: 'https://archive.test/',
      favorite: true, readLaterAt: 400,
    },
    wsId: 'archive-workspace',
    catId: 'archive-space',
    groupId: 'archive-group',
    catName: 'Sources',
    groupName: 'Read next',
    at: 1700,
  }], 'the accepted-compatible Archive entry must freeze its exact destination and activation time');
  assert.deepEqual(accepted.__calls.map(call => call.type), ['busy', 'snapshot', 'persist']);
  assert.equal(accepted.__calls[1].label, 'translated:itemAction.archive');
  assert.equal(accepted.__calls.some(call => ['render', 'render-archive', 'toast', 'focus'].includes(call.type)), false,
    'pending storage must keep the accepted card/row and omit success');
  assert.equal(await accepted.__commitArchive(accepted.__review, accepted.__opener, 1800), false,
    'a second Archive action must not race the pending receipt');
  assert.equal(accepted.__calls.filter(call => call.type === 'persist').length, 1);
  accepted.__resolveWrite({ ok: true, revision: 41 });
  assert.equal(await archiving, true);
  assert.deepEqual(accepted.__calls.slice(3).map(call => call.type), [
    'busy', 'render', 'render-archive', 'toast',
  ]);
  assert.equal(accepted.__calls.at(-1).message, 'translated:itemAction.archived');
  assert.equal(accepted.__calls.at(-1).options.undo, true, 'accepted single-page Archive must remain reversible');

  const stale = createSavedPageArchiveReceiptHarness();
  stale.__item.type = 'note';
  assert.equal(await stale.__commitArchive(stale.__review, stale.__opener, 1900), false);
  assert.deepEqual(stale.__calls.map(call => call.type), ['busy', 'frame']);
  stale.__frames[0]();
  assert.deepEqual(stale.__calls.slice(2).map(call => call.type), ['busy', 'toast', 'focus']);
  assert.equal(stale.__calls[3].message, 'translated:detail.changed');
  assert.equal(stale.__calls.some(call => ['snapshot', 'persist', 'render'].includes(call.type)), false);

  const recovery = createSavedPageArchiveReceiptHarness({ recovery: true });
  assert.equal(await recovery.__commitArchive(recovery.__review, recovery.__opener, 2000), false);
  assert.deepEqual(recovery.__calls, []);

  const competingMarker = createSavedPageArchiveReceiptHarness({ returnPending: true });
  assert.equal(await competingMarker.__commitArchive(
    competingMarker.__review, competingMarker.__opener, 2050,
  ), false);
  assert.deepEqual(competingMarker.__calls, [], 'a pending return marker must keep shared More ownership');

  const rejected = createSavedPageArchiveReceiptHarness();
  const rejection = rejected.__commitArchive(rejected.__review, rejected.__opener, 2100);
  rejected.__recovery = true;
  rejected.__rejectWrite(Object.assign(new Error('unknown receipt'), { code: 'LOCUS_STATE_UNKNOWN_ACK' }));
  assert.equal(await rejection, false);
  assert.equal(rejected.__calls.filter(call => call.type === 'persist').length, 1, 'unknown receipt must not retry');
  assert.deepEqual(rejected.__calls.slice(3).map(call => call.type), ['busy', 'show-recovery']);
  assert.equal(rejected.__calls.some(call => ['render', 'render-archive', 'toast', 'focus'].includes(call.type)), false);

  const interlockSource = extractFunction('setSavedPageArchiveInterlock');
  const busySource = extractFunction('setSavedPageArchiveBusy');
  const rowSource = extractFunction('buildLibraryLedgerRow');
  const tabSource = extractFunction('buildTab');
  const returnCommitSource = extractFunction('commitSavedTabReturnMutation');
  assert.match(interlockSource,
    /setElementInertOwner\(sibling, 'saved-page-archive', true\)[\s\S]*?setElementInertOwner\(element, 'saved-page-archive', false\)/,
    'saved-page Archive must own and later release its exact ancestor-sibling path');
  assert.match(busySource,
    /\.lv-stack\[data-id=[\s\S]*?setAttribute\('aria-busy', String\(busy\)\)[\s\S]*?setAttribute\('aria-disabled', String\(busy\)\)[\s\S]*?\.library-row, \.item, \.lv-stack[\s\S]*?is-saved-page-archive-pending/,
    'the originating Archive control and Board/List record must expose one truthful pending state');
  assert.ok([...source.matchAll(/isSavedPageArchivePending\(\)/g)].length >= 7,
    'pending saved-page Archive must block duplicate action, routes, navigation, and global shortcuts');
  assert.match(returnCommitSource, /isSavedPageArchivePending\(\)/,
    'return-marker writes must not race Archive on the shared More control');
  assert.match(rowSource, /archiveSavedPage\(item, archiveButton\)[\s\S]*archiveSavedPage\(item, owner\)/,
    'Library Archive must identify its exact control: the row button, or the control that opened the menu');
  assert.match(tabSource,
    /async \(archiveOpener[\s\S]*?await archiveSavedPage\(it, archiveOpener[\s\S]*?requestAnimationFrame/,
    'Board Archive focus continuation must wait for the accepted saved-page result');
  assert.match(rowSource, /data-item-archive="menu"/,
    'the Library Archive owner must remain addressable after its menu closes');
  assert.match(tabSource, /data-item-archive="menu"/,
    'the persistent Board More control must remain an addressable Archive receipt owner');
  assert.match(css,
    /\[data-item-archive\]\[aria-busy="true"\][\s\S]*?animation:\s*return-marker-receipt-pulse/,
    'saved-page Archive must reuse the restrained persistence receipt signal');
}

async function testBoardLocalArchiveSharesAcceptedStorageBoundary() {
  for (const itemType of ['note', 'todo', 'stack']) {
    const accepted = createSavedPageArchiveReceiptHarness({ itemType, local: true });
    assert.ok(accepted.__review, `${itemType} must produce one exact local-card Archive context`);
    const original = plain(accepted.__item);
    const archiving = accepted.__commitArchive(accepted.__review, accepted.__opener, 2300);
    assert.equal(accepted.__stack.items.length, 0, `${itemType} may leave only the guarded graph while storage is pending`);
    assert.deepEqual(plain(accepted.__state.archive[0].data), original,
      `${itemType} Archive must preserve the complete imported local record`);
    assert.deepEqual(accepted.__calls.map(call => call.type), ['busy', 'snapshot', 'persist']);
    assert.equal(accepted.__calls.some(call => ['render', 'render-archive', 'toast'].includes(call.type)), false,
      `${itemType} must not claim Archive success before acknowledgement`);
    accepted.__resolveWrite({ ok: true, revision: 52 });
    assert.equal(await archiving, true);
    assert.deepEqual(accepted.__calls.slice(3).map(call => call.type), [
      'busy', 'render', 'render-archive', 'toast',
    ]);
  }

  const tab = createSavedPageArchiveReceiptHarness({ local: true });
  assert.equal(tab.__review, null, 'the local-card boundary must reject saved pages');

  const stale = createSavedPageArchiveReceiptHarness({ itemType: 'note', local: true });
  stale.__item.type = 'todo';
  assert.equal(await stale.__commitArchive(stale.__review, stale.__opener, 2400), false);
  assert.deepEqual(stale.__calls.map(call => call.type), ['busy', 'frame']);
  stale.__frames[0]();
  assert.deepEqual(stale.__calls.slice(2).map(call => call.type), ['busy', 'toast', 'focus']);
  assert.equal(stale.__calls.some(call => ['snapshot', 'persist', 'render'].includes(call.type)), false,
    'a stale local record must fail before mutation or persistence');
}

function createArchivedPageRestoreReceiptHarness({
  missingGroup = false,
  existingInbox = false,
  activeDuplicate = false,
  recovery = false,
} = {}) {
  const archivedItem = {
    id: 'restore-page',
    type: 'tab',
    title: 'Bring this back',
    url: 'https://restore.test/',
    favorite: true,
  };
  const destinationGroups = missingGroup
    ? (existingInbox ? [{ id: 'inbox-group', name: 'Inbox', items: [] }] : [])
    : [{ id: 'restore-group', name: 'Reading', items: [] }];
  if (activeDuplicate) {
    destinationGroups.push({
      id: 'duplicate-group',
      name: 'Duplicate',
      items: [{ id: 'restore-page', type: 'tab', title: 'Collision', url: 'https://collision.test/' }],
    });
  }
  const entry = {
    kind: 'item',
    data: archivedItem,
    wsId: 'restore-workspace',
    catId: 'restore-space',
    groupId: 'restore-group',
    catName: 'Sources',
    groupName: 'Reading',
    at: 500,
  };
  const state = {
    activeWsId: 'restore-workspace',
    workspaces: [{
      id: 'restore-workspace',
      name: 'Research',
      activeCatId: 'restore-space',
      categories: [{ id: 'restore-space', name: 'Sources', groups: destinationGroups }],
    }],
    archive: [entry],
    trash: [],
  };
  const opener = {
    id: 'restore-opener',
    isConnected: true,
    focus() { context.__calls.push({ type: 'focus' }); },
  };
  const context = vm.createContext({
    __entry: entry,
    __item: archivedItem,
    __state: state,
    __opener: opener,
    __recovery: recovery,
    __calls: [],
    __frames: [],
    __resolveWrite: null,
    __rejectWrite: null,
    State: {
      get() { return context.__state; },
      isRecoveryRequired() { return context.__recovery; },
      snapshot(label) { context.__calls.push({ type: 'snapshot', label }); },
      persistNow() {
        context.__calls.push({ type: 'persist' });
        return new Promise((resolve, reject) => {
          context.__resolveWrite = resolve;
          context.__rejectWrite = reject;
        });
      },
      requireRecovery() { context.__recovery = true; context.__calls.push({ type: 'require-recovery' }); },
    },
    LocusImportUtils: importUtils,
    uid() {
      context.__generatedIdCalls += 1;
      return context.__generatedIdCalls === 1 ? 'restore-group' : 'created-inbox';
    },
    setArchivedPageRestoreBusy(candidate, candidateOpener, busy) {
      context.__calls.push({ type: 'busy', candidate, opener: candidateOpener, busy });
      return true;
    },
    showStateRecoveryRequired(error) { context.__calls.push({ type: 'show-recovery', error }); },
    renderBoard() { context.__calls.push({ type: 'render' }); },
    renderArchiveList() { context.__calls.push({ type: 'render-archive' }); },
    updateNavChrome() { context.__calls.push({ type: 'nav' }); },
    toast(message, options) { context.__calls.push({ type: 'toast', message, options }); },
    tr(key, vars = {}) {
      if (key === 'library.destinationPath') {
        return `${vars.workspace} › ${vars.space} › Group: ${vars.group}`;
      }
      if (key === 'archive.restoreDestination') return `Restore to ${vars.destination}`;
      if (key === 'archive.restoredTo') return `Restored to ${vars.destination}`;
      return `translated:${key}`;
    },
    requestAnimationFrame(callback) {
      context.__calls.push({ type: 'frame' });
      context.__frames.push(callback);
      return context.__frames.length;
    },
  });
  vm.runInContext([
    'itemDetailValueFingerprint',
    'activeArchivedPageItemIdCount',
    'resolveArchivedPageRestoreDestination',
    'createArchivedPageRestoreContext',
    'resolveArchivedPageRestoreTarget',
    'archivedPageRestoreDestinationText',
    'isArchivedPageRestorePending',
    'focusArchivedPageRestoreOpener',
    'createOrganizationIdAllocator',
    'commitArchivedPageRestore',
  ].map(extractFunction).join('\n\n').replace(
    'function isArchivedPageRestorePending()',
    'let archivedPageRestorePending = null;\nfunction isArchivedPageRestorePending()',
  ) + '\nglobalThis.__createRestoreContext = createArchivedPageRestoreContext;\n'
    + 'globalThis.__restoreDestinationText = archivedPageRestoreDestinationText;\n'
    + 'globalThis.__commitRestore = commitArchivedPageRestore;', context, {
    filename: 'archived-page-restore-receipt.js',
  });
  context.__review = context.__createRestoreContext(entry);
  context.__destinationText = context.__review
    ? context.__restoreDestinationText(context.__review)
    : '';
  return context;
}

async function testArchivedPageRestoreShowsAndKeepsExactDestination() {
  const accepted = createArchivedPageRestoreReceiptHarness();
  assert.ok(accepted.__review, 'one current archived page must produce an exact Restore review');
  assert.equal(accepted.__destinationText, 'Restore to Research › Sources › Group: Reading');
  const restoring = accepted.__commitRestore(accepted.__review, accepted.__opener);
  assert.equal(accepted.__state.archive.length, 0, 'the guarded graph may hold the Restore candidate');
  assert.equal(accepted.__state.workspaces[0].categories[0].groups[0].items[0], accepted.__item,
    'Restore must preserve the exact saved-page object and metadata');
  assert.deepEqual(accepted.__calls.map(call => call.type), ['busy', 'snapshot', 'persist']);
  assert.equal(accepted.__calls[1].label, 'Restore to Research › Sources › Group: Reading');
  assert.equal(accepted.__calls.some(call => ['render', 'render-archive', 'nav', 'toast', 'focus'].includes(call.type)), false,
    'pending storage must keep the accepted Archive row and destination visible');
  assert.equal(await accepted.__commitRestore(accepted.__review, accepted.__opener), false,
    'a second Restore must not race the pending receipt');
  assert.equal(accepted.__calls.filter(call => call.type === 'persist').length, 1);
  accepted.__resolveWrite({ ok: true, revision: 51 });
  assert.equal(await restoring, true);
  assert.deepEqual(accepted.__calls.slice(3).map(call => call.type), [
    'busy', 'render', 'render-archive', 'nav', 'toast',
  ]);
  assert.equal(accepted.__calls.at(-1).message, 'Restored to Research › Sources › Group: Reading');
  assert.equal(accepted.__calls.at(-1).options.undo, true);

  const existingInbox = createArchivedPageRestoreReceiptHarness({ missingGroup: true, existingInbox: true });
  assert.equal(existingInbox.__destinationText, 'Restore to Research › Sources › Group: Inbox',
    'an existing Inbox fallback must be explicit before Restore');

  const createdInbox = createArchivedPageRestoreReceiptHarness({ missingGroup: true });
  assert.equal(createdInbox.__review.destination.createInbox, true);
  assert.equal(createdInbox.__destinationText, 'Restore to Research › Sources › Group: Inbox');
  const restoringToInbox = createdInbox.__commitRestore(createdInbox.__review, createdInbox.__opener);
  assert.deepEqual(plain(createdInbox.__state.workspaces[0].categories[0].groups[0]), {
    id: 'created-inbox',
    name: 'Inbox',
    symbol: '📥',
    color: '#6366f1',
    collapsed: false,
    items: [{ id: 'restore-page', type: 'tab', title: 'Bring this back', url: 'https://restore.test/', favorite: true }],
  }, 'a missing destination Group must create only the visible Inbox fallback');
  assert.match(extractFunction('commitArchivedPageRestore'), /createOrganizationIdAllocator\(\)/,
    'a newly created restore Inbox must allocate against active, archived, trashed, and hinted IDs');
  assert.doesNotMatch(extractFunction('commitArchivedPageRestore'), /\buid\(\)/,
    'Archive Restore must not reuse a retained destination hint as a new Inbox identity');
  createdInbox.__resolveWrite({ ok: true, revision: 52 });
  assert.equal(await restoringToInbox, true);

  const duplicate = createArchivedPageRestoreReceiptHarness({ activeDuplicate: true });
  assert.equal(duplicate.__review, null, 'an active stable-ID collision must make Restore unavailable');
  assert.deepEqual(duplicate.__calls, []);

  const stale = createArchivedPageRestoreReceiptHarness();
  stale.__state.workspaces[0].categories[0].groups[0].name = 'Changed elsewhere';
  assert.equal(await stale.__commitRestore(stale.__review, stale.__opener), false);
  assert.deepEqual(stale.__calls.map(call => call.type), ['busy', 'frame']);
  stale.__frames[0]();
  assert.deepEqual(stale.__calls.slice(2).map(call => call.type), ['busy', 'toast', 'focus']);
  assert.equal(stale.__calls[3].message, 'translated:detail.changed');
  assert.equal(stale.__calls.some(call => ['snapshot', 'persist', 'render'].includes(call.type)), false);

  const recovery = createArchivedPageRestoreReceiptHarness({ recovery: true });
  assert.equal(await recovery.__commitRestore(recovery.__review, recovery.__opener), false);
  assert.deepEqual(recovery.__calls, []);

  const rejected = createArchivedPageRestoreReceiptHarness();
  const rejection = rejected.__commitRestore(rejected.__review, rejected.__opener);
  rejected.__recovery = true;
  rejected.__rejectWrite(Object.assign(new Error('unknown receipt'), { code: 'LOCUS_STATE_UNKNOWN_ACK' }));
  assert.equal(await rejection, false);
  assert.equal(rejected.__calls.filter(call => call.type === 'persist').length, 1, 'unknown receipt must not retry');
  assert.deepEqual(rejected.__calls.slice(3).map(call => call.type), ['busy', 'show-recovery']);
  assert.equal(rejected.__calls.some(call => ['render', 'toast', 'focus'].includes(call.type)), false);

  const i18n = readI18n();
  for (const key of [
    'archive.restore', 'archive.restoreFor', 'archive.restoreDestination',
    'archive.restoredTo', 'archive.restoreUnavailable',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  assert.equal(i18n['zh-TW']['archive.restore'], '復原');
  assert.equal(i18n['zh-TW']['archive.restoreDestination'], '復原到 {destination}');
  assert.equal(i18n['zh-TW']['archive.restoredTo'], '已復原到 {destination}');

  const interlockSource = extractFunction('setArchivedPageRestoreInterlock');
  const busySource = extractFunction('setArchivedPageRestoreBusy');
  // The Archive & Trash page (2026-11): one row review, one row builder, and one
  // write runner that holds focus until the write is accepted.
  const renderSource = ['archivePageRowReview', 'buildArchivePageRow', 'archivePageRestoreRow', 'runArchivePageWrite']
    .map(extractFunction).join('\n');
  assert.match(interlockSource,
    /setElementInertOwner\(sibling, 'archived-page-restore', true\)[\s\S]*?setElementInertOwner\(element, 'archived-page-restore', false\)/,
    'Restore must own and later release its exact Archive-row path');
  assert.match(busySource,
    /setAttribute\('aria-busy', String\(busy\)\)[\s\S]*?setAttribute\('aria-disabled', String\(busy\)\)[\s\S]*?is-archived-page-restore-pending/,
    'the exact Restore button and row must expose pending receipt state');
  assert.ok([...source.matchAll(/isArchivedPageRestorePending\(\)/g)].length >= 7,
    'pending Restore must block duplicate action, routes, navigation, and global shortcuts');
  assert.match(renderSource,
    /createArchivedPageRestoreContext\(entry, 'archive', index\)[\s\S]*?line: archivedPageRestoreDestinationText\(context\)/,
    'the Archive row must display the destination owned by its exact Restore review');
  assert.match(renderSource,
    /data-archived-page-restore="true"[\s\S]*?runArchivePageWrite\(\[key\], 'restore', async \(\) => \{[\s\S]*?restoreArchivedPage\(review\.context, button\)[\s\S]*?changed = !!\(await write\(\)\);[\s\S]*?if \(changed\) requestAnimationFrame\(\(\) => focusArchivePageTarget\(nextKey, control\)\)/,
    'the row must await acceptance before focusing its rebuilt Archive neighbor');
  assert.match(css,
    /\[data-archived-page-restore\]\[aria-busy="true"\][\s\S]*?animation:\s*return-marker-receipt-pulse/,
    'Restore must reuse the existing restrained persistence receipt signal');
}

function testCompactSavedPageRestoreUsesCanonicalReview() {
  const calls = [];
  const frames = [];
  const review = { itemId: 'restore-page', entryRef: { id: 'archive-entry' } };
  let current = true;
  let focusExact = true;
  const context = loadFunctions(['openArchivedPageRestoreReview'], {
    resolveArchivedPageRestoreTarget(candidate) {
      calls.push(['resolve', candidate]);
      return current ? { entry: candidate.entryRef } : null;
    },
    reportArchivedPageRestoreUnavailable(opener) {
      calls.push(['unavailable', opener]);
      return false;
    },
    openLibrarySurface(mode) { calls.push(['open', mode]); },
    requestAnimationFrame(callback) { frames.push(callback); calls.push(['frame']); return frames.length; },
    focusArchivedPageRestoreReview(candidate) {
      calls.push(['focus-review', candidate]);
      return focusExact;
    },
    toast(message, options) { calls.push(['toast', message, options]); },
    tr(key) { return `translated:${key}`; },
  });
  const opener = { id: 'compact-restore-review' };

  assert.equal(context.openArchivedPageRestoreReview(review, opener), true);
  assert.deepEqual(plain(calls), [
    ['resolve', review],
    ['open', 'archive'],
    ['frame'],
  ], 'a current compact saved page must only open the canonical Archive route');
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.deepEqual(plain(calls.at(-1)), ['focus-review', review],
    'the route continuation must focus the exact reviewed Archive entry');

  calls.length = 0;
  current = false;
  assert.equal(context.openArchivedPageRestoreReview(review, opener), false);
  assert.deepEqual(plain(calls), [
    ['resolve', review],
    ['unavailable', opener],
  ], 'stale compact truth must keep its source open and avoid navigation');

  calls.length = 0;
  current = true;
  focusExact = false;
  assert.equal(context.openArchivedPageRestoreReview(review, opener), true);
  frames.shift()();
  assert.deepEqual(plain(calls.slice(-2)), [
    ['focus-review', review],
    ['toast', 'translated:detail.changed', { danger: true, duration: 6000 }],
  ], 'post-navigation drift must explain the stale review without restoring');

  const continuationSource = extractFunction('openArchivedPageRestoreReview');
  assert.doesNotMatch(continuationSource,
    /State\.(?:snapshot|persist|persistNow)|restoreArchive(?:Entries)?\(|commitArchivedPageRestore\(/,
    'review navigation must not share the Restore mutation or persistence path');

  const focusSource = extractFunction('focusArchivedPageRestoreReview');
  const archiveSource = extractFunction('buildArchivePageRow');
  assert.match(focusSource,
    /resolveArchivedPageRestoreTarget\(context\)[\s\S]*?focusArchivedEntryRestoreReview\(target\?\.entry, '__archivedPageRestoreEntry'/,
    'review focus must resolve and match the exact Archive entry reference');
  assert.match(extractFunction('focusArchivedEntryRestoreReview'),
    /if \(entry\) archivePageReveal\(entry\);[\s\S]*?candidate\[property\] === entry/,
    'review focus renders the exact entry’s row, then matches it by reference');
  assert.match(archiveSource,
    /__archivedPageRestoreEntry = review\.kind === 'page' \? entry : undefined;/,
    'each primary archived-page Restore control must own its exact entry reference');

  const searchSource = extractFunction('renderArchiveSearchResults');
  assert.match(searchSource,
    /isArchivedPage[\s\S]*?createArchivedPageRestoreContext\(match\.entry\)[\s\S]*?openArchivedPageRestoreReview\(restoreContext, viewButton\)/,
    'Search saved pages must continue to their exact canonical Restore review');
  assert.match(searchSource,
    /if \(isArchivedPage \|\| isArchivedGroup \|\| isArchivedLocalItem\)[\s\S]*?else \{[\s\S]*?restoreArchive\(idx\)/,
    'Search must retain legacy direct Restore only for unsupported stored-entry types');

  const settingsSource = extractFunction('renderArchiveList');
  assert.match(settingsSource,
    /isArchivedPage[\s\S]*?createArchivedPageRestoreContext\(e\)[\s\S]*?openArchivedPageRestoreReview\(restoreContext, actionButton\)/,
    'Settings saved pages must continue to their exact canonical Restore review');
  assert.match(settingsSource,
    /if \(reviewedRestore\)[\s\S]*?else actionButton\.onclick = \(\) => restoreArchive\(i\)/,
    'Settings must retain legacy direct Restore only for unsupported stored-entry types');
}

function createArchivedPageBatchRestoreHarness({
  sharedMissingInbox = false,
  duplicateItemId = false,
  recovery = false,
  collectionName = 'archive',
} = {}) {
  const pageA = {
    id: 'batch-page-a', type: 'tab', title: 'Batch page A', url: 'https://batch-a.test/', favorite: true,
  };
  const pageB = {
    id: duplicateItemId ? pageA.id : 'batch-page-b',
    type: 'tab', title: 'Batch page B', url: 'https://batch-b.test/', readLaterAt: 200,
  };
  const groups = sharedMissingInbox
    ? []
    : [
        { id: 'reading-group', name: 'Reading', items: [] },
        { id: 'queue-group', name: 'Queue', items: [] },
      ];
  const retention = collectionName === 'trash' ? { trashedAt: 900, retentionStartedAt: 900 } : {};
  const entries = [
    {
      kind: 'item', data: pageA, wsId: 'batch-workspace', catId: 'batch-space',
      groupId: sharedMissingInbox ? 'missing-group' : 'reading-group',
      catName: 'Sources', groupName: sharedMissingInbox ? 'Missing' : 'Reading', at: 700,
      ...retention,
    },
    {
      kind: 'item', data: pageB, wsId: 'batch-workspace', catId: 'batch-space',
      groupId: sharedMissingInbox ? 'missing-group' : 'queue-group',
      catName: 'Sources', groupName: sharedMissingInbox ? 'Missing' : 'Queue', at: 600,
      ...retention,
    },
  ];
  const state = {
    activeWsId: 'batch-workspace',
    workspaces: [{
      id: 'batch-workspace', name: 'Research', activeCatId: 'batch-space',
      categories: [{ id: 'batch-space', name: 'Sources', groups }],
    }],
    archive: collectionName === 'archive' ? entries.slice() : [],
    trash: collectionName === 'trash' ? entries.slice() : [],
  };
  const context = vm.createContext({
    __state: state,
    __entries: entries,
    __pages: [pageA, pageB],
    __collectionName: collectionName,
    __calls: [],
    __frames: [],
    __resolveWrite: null,
    __rejectWrite: null,
    __recovery: recovery,
    __uidCalls: 0,
    State: {
      get() { return context.__state; },
      isRecoveryRequired() { return context.__recovery; },
      snapshot(label) { context.__calls.push({ type: 'snapshot', label }); },
      persistNow() {
        context.__calls.push({ type: 'persist' });
        return new Promise((resolve, reject) => {
          context.__resolveWrite = resolve;
          context.__rejectWrite = reject;
        });
      },
      requireRecovery() { context.__recovery = true; context.__calls.push({ type: 'require-recovery' }); },
    },
    uid() { context.__uidCalls += 1; return `created-inbox-${context.__uidCalls}`; },
    createOrganizationIdAllocator() {
      return () => {
        context.__uidCalls += 1;
        return `created-inbox-${context.__uidCalls}`;
      };
    },
    setArchivedPageBatchRestoreBusy(candidate, opener, busy) {
      context.__calls.push({ type: 'busy', candidate, opener, busy });
      return true;
    },
    setArchivedPageRestoreBusy(candidate, opener, busy) {
      context.__calls.push({ type: 'busy', candidate, opener, busy });
      return true;
    },
    showStateRecoveryRequired(error) { context.__calls.push({ type: 'show-recovery', error }); },
    renderBoard() { context.__calls.push({ type: 'render' }); },
    renderArchiveList() { context.__calls.push({ type: 'render-archive' }); },
    updateNavChrome() { context.__calls.push({ type: 'nav' }); },
    toast(message, options) { context.__calls.push({ type: 'toast', message, options }); },
    focusArchivedPageRestoreOpener(opener) { context.__calls.push({ type: 'focus', opener }); return true; },
    requestAnimationFrame(callback) {
      context.__calls.push({ type: 'frame' });
      context.__frames.push(callback);
      return context.__frames.length;
    },
    tr(key, vars = {}) {
      if (key === 'library.destinationPath') {
        return `${vars.workspace} / ${vars.space} / ${vars.group}`;
      }
      if (key === 'archive.restoreSelected') return 'Restore selected';
      if (key === 'archive.restoredTo') return `Restored to ${vars.destination}`;
      if (key === 'archive.restoredPagesTo') return `Restored ${vars.count} pages to ${vars.destination}`;
      if (key === 'archive.restoredPagesToMany') {
        return `Restored ${vars.count} pages to ${vars.destinationCount} destinations`;
      }
      if (key === 'trash.restoreSelected') return 'Restore selected from Trash';
      if (key === 'trash.restoredTo') return `Restored from Trash to ${vars.destination}`;
      if (key === 'trash.restoredPagesTo') {
        return `Restored ${vars.count} pages from Trash to ${vars.destination}`;
      }
      if (key === 'trash.restoredPagesToMany') {
        return `Restored ${vars.count} pages from Trash to ${vars.destinationCount} destinations`;
      }
      return `translated:${key}`;
    },
  });
  const trashFunctions = collectionName === 'trash' ? [
    'createTrashedPageRestoreContext',
    'commitTrashedPageRestore',
    'createTrashedPageBatchRestoreContext',
    'commitTrashedPageBatchRestore',
    'commitArchivedPageRestore',
  ] : [];
  const functions = [
    ...trashFunctions,
    'createArchivedPageBatchRestoreContext',
    'commitArchivedPageBatchRestore',
    'itemDetailValueFingerprint',
    'activeArchivedPageItemIdCount',
    'resolveArchivedPageRestoreDestination',
    'createArchivedPageRestoreContext',
    'resolveArchivedPageRestoreTarget',
    'archivedPageRestoreDestinationText',
    'groupArchivedPageRestoreDestinations',
    'resolveArchivedPageBatchRestoreTargets',
    'archivedPageBatchRestoreSuccessText',
    'isArchivedPageRestorePending',
  ];
  vm.runInContext(functions.map(extractFunction).join('\n\n').replace(
    'function isArchivedPageRestorePending()',
    'let archivedPageRestorePending = null;\nfunction isArchivedPageRestorePending()',
  ) + '\nglobalThis.__createBatchReview = createArchivedPageBatchRestoreContext;\n'
    + 'globalThis.__commitBatchRestore = commitArchivedPageBatchRestore;\n'
    + (collectionName === 'trash'
      ? 'globalThis.__createTrashReview = createTrashedPageRestoreContext;\n'
        + 'globalThis.__commitTrashRestore = commitTrashedPageRestore;\n'
        + 'globalThis.__createTrashBatchReview = createTrashedPageBatchRestoreContext;\n'
        + 'globalThis.__commitTrashBatchRestore = commitTrashedPageBatchRestore;'
      : ''), context, {
    filename: 'archived-page-batch-restore.js',
  });
  return context;
}

async function testSelectedSavedPagesRestoreAfterOneReceipt() {
  const accepted = createArchivedPageBatchRestoreHarness();
  const review = accepted.__createBatchReview(accepted.__entries);
  assert.ok(review, 'two current saved pages must produce one batch Restore review');
  assert.equal(review.count, 2);
  assert.equal(review.destinations.length, 2);
  assert.deepEqual(plain(review.destinations.map(destination => destination.count)), [1, 1]);

  const restoring = accepted.__commitBatchRestore(review, { id: 'batch-restore' });
  assert.equal(accepted.__state.archive.length, 0, 'the guarded graph may hold the reviewed batch candidate');
  assert.equal(accepted.__state.workspaces[0].categories[0].groups[0].items[0], accepted.__pages[0]);
  assert.equal(accepted.__state.workspaces[0].categories[0].groups[1].items[0], accepted.__pages[1]);
  assert.deepEqual(accepted.__calls.map(call => call.type), ['busy', 'snapshot', 'persist']);
  assert.equal(accepted.__calls[1].label, 'Restore selected');
  assert.equal(accepted.__calls.some(call => ['render', 'render-archive', 'nav', 'toast', 'focus'].includes(call.type)), false,
    'pending storage must keep the reviewed Archive rows and destination summary visible');
  assert.equal(await accepted.__commitBatchRestore(review, { id: 'duplicate' }), false);
  assert.equal(accepted.__calls.filter(call => call.type === 'persist').length, 1);
  accepted.__resolveWrite({ ok: true, revision: 71 });
  assert.equal(await restoring, true);
  assert.deepEqual(accepted.__calls.slice(3).map(call => call.type), [
    'busy', 'render', 'render-archive', 'nav', 'toast',
  ]);
  assert.equal(accepted.__calls.at(-1).message, 'Restored 2 pages to 2 destinations');
  assert.equal(accepted.__calls.at(-1).options.undo, true);

  const sharedInbox = createArchivedPageBatchRestoreHarness({ sharedMissingInbox: true });
  const inboxReview = sharedInbox.__createBatchReview(sharedInbox.__entries);
  assert.equal(inboxReview.destinations.length, 1, 'one missing Inbox plan must be reviewed once');
  assert.equal(inboxReview.destinations[0].count, 2);
  const restoringToInbox = sharedInbox.__commitBatchRestore(inboxReview, { id: 'batch-inbox' });
  assert.equal(sharedInbox.__uidCalls, 1, 'one exact Space must receive at most one planned Inbox');
  assert.equal(sharedInbox.__state.workspaces[0].categories[0].groups.length, 1);
  const restoredInboxItems = sharedInbox.__state.workspaces[0].categories[0].groups[0].items;
  assert.equal(restoredInboxItems.length, 2);
  assert.equal(restoredInboxItems[0], sharedInbox.__pages[0],
    'the first reviewed page must retain object identity and order');
  assert.equal(restoredInboxItems[1], sharedInbox.__pages[1],
    'the second reviewed page must retain object identity and order');
  sharedInbox.__resolveWrite({ ok: true, revision: 72 });
  assert.equal(await restoringToInbox, true);
  assert.equal(sharedInbox.__calls.at(-1).message,
    'Restored 2 pages to Research / Sources / Inbox',
    'one reviewed destination must remain explicit in accepted success');

  const duplicate = createArchivedPageBatchRestoreHarness({ duplicateItemId: true });
  assert.equal(duplicate.__createBatchReview(duplicate.__entries), null,
    'duplicate selected stable IDs must not produce a batch review');

  const mixed = createArchivedPageBatchRestoreHarness();
  const noteEntry = {
    kind: 'item', data: { id: 'batch-note', type: 'note', html: '<p>Note</p>' },
    wsId: 'batch-workspace', catId: 'batch-space', groupId: 'reading-group', at: 500,
  };
  mixed.__state.archive.push(noteEntry);
  assert.equal(mixed.__createBatchReview([mixed.__entries[0], noteEntry]), null,
    'mixed saved-page and non-page content must not fall through the saved-page batch seam');

  const stale = createArchivedPageBatchRestoreHarness();
  const staleReview = stale.__createBatchReview(stale.__entries);
  stale.__state.workspaces[0].categories[0].groups[0].name = 'Changed elsewhere';
  assert.equal(await stale.__commitBatchRestore(staleReview, { id: 'stale-batch' }), false);
  assert.deepEqual(stale.__calls.map(call => call.type), ['busy', 'frame']);
  stale.__frames[0]();
  assert.deepEqual(stale.__calls.slice(2).map(call => call.type), ['busy', 'toast', 'focus']);
  assert.equal(stale.__calls.some(call => ['snapshot', 'persist', 'render'].includes(call.type)), false);

  const recovery = createArchivedPageBatchRestoreHarness({ recovery: true });
  assert.equal(await recovery.__commitBatchRestore(
    recovery.__createBatchReview(recovery.__entries), { id: 'recovery-batch' },
  ), false);
  assert.deepEqual(recovery.__calls, []);

  const rejected = createArchivedPageBatchRestoreHarness();
  const rejection = rejected.__commitBatchRestore(
    rejected.__createBatchReview(rejected.__entries), { id: 'rejected-batch' },
  );
  rejected.__recovery = true;
  rejected.__rejectWrite(Object.assign(new Error('unknown receipt'), { code: 'LOCUS_STATE_UNKNOWN_ACK' }));
  assert.equal(await rejection, false);
  assert.equal(rejected.__calls.filter(call => call.type === 'persist').length, 1, 'unknown receipt must not retry');
  assert.deepEqual(rejected.__calls.slice(3).map(call => call.type), ['busy', 'show-recovery']);
  assert.equal(rejected.__calls.some(call => ['render', 'toast', 'focus'].includes(call.type)), false);

  const i18n = readI18n();
  for (const key of [
    'archive.restoreDestinations', 'archive.restorePagesSeparately',
    'archive.restoredPagesTo', 'archive.restoredPagesToMany',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  assert.equal(i18n['zh-TW']['archive.restoreDestinations'], '{count} 個復原位置');
  assert.equal(i18n['zh-TW']['archive.restorePagesSeparately'], '請分開選取已儲存頁面和其他封存內容');
  assert.equal(i18n['zh-TW']['archive.restoredPagesTo'], '已將 {count} 個頁面復原到 {destination}');
  assert.equal(i18n['zh-TW']['archive.restoredPagesToMany'], '已將 {count} 個頁面復原到 {destinationCount} 個位置');

  const renderSource = archivePageSource();
  assert.match(renderSource,
    /archive-selection-destinations/,
    'the selection bar must retain one compact destination disclosure');
  assert.match(renderSource,
    /createArchivedPageBatchRestoreContext\(selectedEntries\)/,
    'the destination disclosure must derive from the reviewed saved pages');
  assert.match(renderSource,
    /runArchivePageWrite\(keys, 'restore', \(\) => \{[\s\S]*?commitArchivedPageBatchRestore\(selectedRestoreReview, restoreSelected\)[\s\S]*?changed = !!\(await write\(\)\);[\s\S]*?if \(changed\) requestAnimationFrame\(\(\) => focusArchivePageTarget\(nextKey, control\)\)/,
    'selected saved pages must wait for batch acceptance before focus continuation');
  assert.match(renderSource, MIXED_SELECTION_REFUSAL,
    'mixed selections must not route saved pages through the legacy batch writer');
  assert.match(css,
    /\[data-archived-page-batch-restore\]\[aria-busy="true"\][\s\S]*?animation:\s*return-marker-receipt-pulse/,
    'saved-page batch Restore must reuse the existing restrained persistence receipt signal');
}

async function testTrashedSavedPagesRestoreAfterOneReceipt() {
  const single = createArchivedPageBatchRestoreHarness({ collectionName: 'trash' });
  const review = single.__createTrashReview(single.__entries[0]);
  assert.ok(review, 'one current trashed saved page must produce an exact Restore review');
  assert.equal(review.collectionName, 'trash');
  assert.equal(review.entryRef.trashedAt, 900, 'the reviewed value must retain its Trash timestamp');
  const restoring = single.__commitTrashRestore(review, { id: 'trash-row-restore' });
  assert.equal(single.__state.trash.length, 1, 'pending row Restore must remove only its exact Trash entry');
  assert.equal(single.__state.workspaces[0].categories[0].groups[0].items[0], single.__pages[0]);
  assert.deepEqual(single.__calls.map(call => call.type), ['busy', 'snapshot', 'persist']);
  assert.equal(single.__calls.some(call => ['render', 'render-archive', 'nav', 'toast', 'focus'].includes(call.type)), false,
    'pending Trash persistence must keep the reviewed row, route, and countdown visible');
  single.__resolveWrite({ ok: true, revision: 81 });
  assert.equal(await restoring, true);
  assert.deepEqual(single.__calls.slice(3).map(call => call.type), [
    'busy', 'render', 'render-archive', 'nav', 'toast',
  ]);
  assert.equal(single.__calls.at(-1).message,
    'Restored from Trash to Research / Sources / Reading');
  assert.equal(single.__calls.at(-1).options.undo, true);

  const batch = createArchivedPageBatchRestoreHarness({ collectionName: 'trash' });
  const batchReview = batch.__createTrashBatchReview(batch.__entries);
  assert.ok(batchReview);
  assert.equal(batchReview.collectionName, 'trash');
  assert.equal(batchReview.destinations.length, 2);
  const restoringBatch = batch.__commitTrashBatchRestore(batchReview, { id: 'trash-batch-restore' });
  assert.equal(batch.__state.trash.length, 0);
  assert.equal(batch.__calls.filter(call => call.type === 'persist').length, 1);
  assert.equal(batch.__calls.some(call => ['render', 'toast', 'focus'].includes(call.type)), false);
  batch.__resolveWrite({ ok: true, revision: 82 });
  assert.equal(await restoringBatch, true);
  assert.equal(batch.__calls.at(-1).message,
    'Restored 2 pages from Trash to 2 destinations');

  const i18n = readI18n();
  for (const key of [
    'trash.restoreToFor', 'trash.restorePagesSeparately', 'trash.restoredTo',
    'trash.restoredPagesTo', 'trash.restoredPagesToMany',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  assert.equal(i18n['zh-TW']['trash.restorePagesSeparately'],
    '請分開選取已儲存頁面和垃圾桶內的其他內容');
  assert.equal(i18n['zh-TW']['trash.restoreToFor'], '將「{title}」復原到 {destination}');
  assert.equal(i18n['zh-TW']['trash.restoredTo'], '已從垃圾桶復原到 {destination}');
  assert.equal(i18n['zh-TW']['trash.restoredPagesTo'],
    '已將 {count} 個頁面從垃圾桶復原到 {destination}');
  assert.equal(i18n['zh-TW']['trash.restoredPagesToMany'],
    '已將 {count} 個頁面從垃圾桶復原到 {destinationCount} 個位置');

  const renderSource = archivePageSource();
  assert.match(renderSource,
    /createTrashedPageRestoreContext\(entry, index\)[\s\S]*?line: archivedPageRestoreDestinationText\(context\)/,
    'each trashed saved-page row must display the destination owned by its exact review');
  assert.match(renderSource,
    /tr\(trash \? 'trash\.restoreToFor' : 'archive\.restoreToFor', \{ title, destination: path \}\)/,
    'the saved-page Restore control must name its exact page and destination');
  assert.match(renderSource,
    /commitTrashedPageRestore\(review\.context, button\)[\s\S]*?changed = !!\(await write\(\)\);[\s\S]*?if \(changed\) requestAnimationFrame\(\(\) => focusArchivePageTarget\(nextKey, control\)\)/,
    'row Restore must wait for the Trash receipt before focus continuation');
  assert.match(renderSource,
    /createTrashedPageBatchRestoreContext\(selectedEntries\)[\s\S]*?commitTrashedPageBatchRestore\(selectedRestoreReview, restoreSelected\)/,
    'selected trashed pages must share one reviewed batch receipt');
  assert.match(renderSource, MIXED_SELECTION_REFUSAL,
    'mixed Trash selections must not route saved pages through the legacy writer');
}

function createArchivedGroupRestoreHarness({
  collectionName = 'archive',
  activeConflict = false,
  recovery = false,
} = {}) {
  const group = {
    id: 'restored-group',
    name: 'Reading set',
    symbol: '📚',
    color: '#4f46e5',
    collapsed: false,
    reminders: [{ id: 'group-reminder', at: '2030-01-02T09:00:00.000Z', notified: false }],
    items: [
      { id: 'group-page', type: 'tab', title: 'Paper', url: 'https://paper.test/' },
      {
        id: 'group-stack', type: 'stack', name: 'Notes', items: [
          { id: 'group-note', type: 'note', html: '<p>Keep this exact note.</p>' },
        ],
      },
    ],
  };
  const retention = collectionName === 'trash'
    ? { trashedAt: 900, retentionStartedAt: 875 }
    : {};
  const entry = {
    kind: 'group',
    data: group,
    wsId: 'group-workspace',
    catId: 'group-space',
    catName: 'Sources',
    at: 700,
    ...retention,
  };
  const destinationGroups = activeConflict
    ? [{ id: group.id, name: 'Conflicting group', items: [] }]
    : [{ id: 'existing-group', name: 'Existing', items: [] }];
  const state = {
    activeWsId: 'group-workspace',
    workspaces: [{
      id: 'group-workspace',
      name: 'Research',
      activeCatId: 'group-space',
      categories: [{ id: 'group-space', name: 'Sources', groups: destinationGroups }],
    }],
    archive: collectionName === 'archive' ? [entry] : [],
    trash: collectionName === 'trash' ? [entry] : [],
  };
  const context = vm.createContext({
    __state: state,
    __entry: entry,
    __group: group,
    __calls: [],
    __frames: [],
    __resolveWrite: null,
    __rejectWrite: null,
    __recovery: recovery,
    LocusImportUtils: importUtils,
    State: {
      get() { return context.__state; },
      isRecoveryRequired() { return context.__recovery; },
      snapshot(label) { context.__calls.push({ type: 'snapshot', label }); },
      persistNow() {
        context.__calls.push({ type: 'persist' });
        return new Promise((resolve, reject) => {
          context.__resolveWrite = resolve;
          context.__rejectWrite = reject;
        });
      },
      requireRecovery() { context.__recovery = true; context.__calls.push({ type: 'require-recovery' }); },
    },
    setArchivedGroupRestoreBusy(candidate, opener, busy) {
      context.__calls.push({ type: 'busy', candidate, opener, busy });
      return true;
    },
    showStateRecoveryRequired(error) { context.__calls.push({ type: 'show-recovery', error }); },
    renderBoard() { context.__calls.push({ type: 'render' }); },
    renderArchiveList() { context.__calls.push({ type: 'render-archive' }); },
    updateNavChrome() { context.__calls.push({ type: 'nav' }); },
    toast(message, options) { context.__calls.push({ type: 'toast', message, options }); },
    focusArchivedPageRestoreOpener(opener) { context.__calls.push({ type: 'focus', opener }); return true; },
    requestAnimationFrame(callback) {
      context.__calls.push({ type: 'frame' });
      context.__frames.push(callback);
      return context.__frames.length;
    },
    tr(key, vars = {}) {
      if (key === 'library.spaceDestinationPath') return `${vars.workspace} / ${vars.space}`;
      if (key === 'archive.restoreDestination') return `Restore to ${vars.destination}`;
      if (key === 'archive.restoredTo') return `Restored to ${vars.destination}`;
      if (key === 'trash.restoredTo') return `Restored from Trash to ${vars.destination}`;
      return `translated:${key}`;
    },
  });
  const functions = [
    'itemDetailValueFingerprint',
    'archivedGroupEntityIds',
    'archivedGroupIdsAvailable',
    'resolveArchivedGroupRestoreDestination',
    'createArchivedGroupRestoreContext',
    'createTrashedGroupRestoreContext',
    'resolveArchivedGroupRestoreTarget',
    'archivedGroupRestorePathText',
    'archivedGroupRestoreDestinationText',
    'isArchivedPageRestorePending',
    'commitArchivedGroupRestore',
    'commitTrashedGroupRestore',
  ];
  vm.runInContext(functions.map(extractFunction).join('\n\n').replace(
    'function isArchivedPageRestorePending()',
    'let archivedPageRestorePending = null;\nfunction isArchivedPageRestorePending()',
  ) + `
globalThis.__createGroupReview = createArchivedGroupRestoreContext;
globalThis.__createTrashGroupReview = createTrashedGroupRestoreContext;
globalThis.__commitGroupRestore = commitArchivedGroupRestore;
globalThis.__commitTrashGroupRestore = commitTrashedGroupRestore;
globalThis.__groupPathText = archivedGroupRestorePathText;
globalThis.__groupDestinationText = archivedGroupRestoreDestinationText;`, context, {
    filename: 'archived-group-restore.js',
  });
  return context;
}

async function testArchivedGroupRestoreWaitsForOneReceipt() {
  const accepted = createArchivedGroupRestoreHarness();
  const review = accepted.__createGroupReview(accepted.__entry, 'archive');
  assert.ok(review, 'one exact archived Group must produce a Restore review');
  assert.equal(review.collectionName, 'archive');
  assert.equal(review.groupRef, accepted.__group);
  assert.deepEqual(plain(review.entityIds), [
    'restored-group', 'group-page', 'group-stack', 'group-note',
  ]);
  assert.equal(accepted.__groupPathText(review), 'Research / Sources');
  assert.equal(accepted.__groupDestinationText(review), 'Restore to Research / Sources');

  const restoring = accepted.__commitGroupRestore(review, { id: 'group-restore' });
  assert.equal(accepted.__state.archive.length, 0, 'the guarded graph may remove only the reviewed entry');
  assert.equal(accepted.__state.workspaces[0].categories[0].groups.at(-1), accepted.__group,
    'pending Restore must retain the exact complete Group object');
  assert.deepEqual(accepted.__calls.map(call => call.type), ['busy', 'snapshot', 'persist']);
  assert.equal(accepted.__calls[1].label, 'Restore to Research / Sources');
  assert.equal(accepted.__calls.some(call => ['render', 'render-archive', 'nav', 'toast', 'focus'].includes(call.type)), false,
    'pending storage must keep the Group row, route, count, and date visible');
  assert.equal(await accepted.__commitGroupRestore(review, { id: 'duplicate' }), false);
  assert.equal(accepted.__calls.filter(call => call.type === 'persist').length, 1);
  accepted.__resolveWrite({ ok: true, revision: 91 });
  assert.equal(await restoring, true);
  assert.deepEqual(accepted.__calls.slice(3).map(call => call.type), [
    'busy', 'render', 'render-archive', 'nav', 'toast',
  ]);
  assert.equal(accepted.__calls.at(-1).message, 'Restored to Research / Sources');
  assert.equal(accepted.__calls.at(-1).options.undo, true);
  assert.equal(accepted.__group.reminders[0].id, 'group-reminder');
  assert.equal(accepted.__group.items[1].items[0].html, '<p>Keep this exact note.</p>');

  const conflict = createArchivedGroupRestoreHarness({ activeConflict: true });
  assert.equal(conflict.__createGroupReview(conflict.__entry, 'archive'), null,
    'an active stable-ID conflict must make the Group unavailable rather than clone or rekey it');

  const crossCollection = createArchivedGroupRestoreHarness();
  crossCollection.__state.trash.push(crossCollection.__entry);
  assert.equal(crossCollection.__createGroupReview(crossCollection.__entry, 'archive'), null,
    'one entry reference present in both collections must not produce a review');

  const stale = createArchivedGroupRestoreHarness();
  const staleReview = stale.__createGroupReview(stale.__entry, 'archive');
  stale.__group.name = 'Changed elsewhere';
  assert.equal(await stale.__commitGroupRestore(staleReview, { id: 'stale-group' }), false);
  assert.deepEqual(stale.__calls.map(call => call.type), ['busy', 'frame']);
  stale.__frames[0]();
  assert.deepEqual(stale.__calls.slice(2).map(call => call.type), ['busy', 'toast', 'focus']);
  assert.equal(stale.__calls.some(call => ['snapshot', 'persist', 'render'].includes(call.type)), false);

  const recovery = createArchivedGroupRestoreHarness({ recovery: true });
  assert.equal(await recovery.__commitGroupRestore(
    recovery.__createGroupReview(recovery.__entry, 'archive'), { id: 'recovery-group' },
  ), false);
  assert.deepEqual(recovery.__calls, []);

  const rejected = createArchivedGroupRestoreHarness();
  const rejection = rejected.__commitGroupRestore(
    rejected.__createGroupReview(rejected.__entry, 'archive'), { id: 'rejected-group' },
  );
  rejected.__recovery = true;
  rejected.__rejectWrite(Object.assign(new Error('unknown receipt'), { code: 'LOCUS_STATE_UNKNOWN_ACK' }));
  assert.equal(await rejection, false);
  assert.equal(rejected.__calls.filter(call => call.type === 'persist').length, 1,
    'unknown Group receipt must not retry');
  assert.deepEqual(rejected.__calls.slice(3).map(call => call.type), ['busy', 'show-recovery']);
  assert.equal(rejected.__calls.some(call => ['render', 'toast', 'focus'].includes(call.type)), false);

  const trashed = createArchivedGroupRestoreHarness({ collectionName: 'trash' });
  const trashReview = trashed.__createTrashGroupReview(trashed.__entry);
  assert.ok(trashReview, 'one exact trashed Group must produce the strict Trash review');
  assert.equal(trashReview.collectionName, 'trash');
  assert.equal(trashReview.entryRef.trashedAt, 900);
  assert.equal(await trashed.__commitTrashGroupRestore(review, { id: 'wrong-collection' }), false,
    'the Trash commit wrapper must reject an Archive review');
  const restoringTrash = trashed.__commitTrashGroupRestore(trashReview, { id: 'trash-group' });
  assert.equal(trashed.__state.trash.length, 0);
  assert.equal(trashed.__state.workspaces[0].categories[0].groups.at(-1), trashed.__group);
  assert.equal(trashed.__calls.filter(call => call.type === 'persist').length, 1);
  assert.equal(trashed.__calls.some(call => ['render', 'toast', 'focus'].includes(call.type)), false);
  trashed.__resolveWrite({ ok: true, revision: 92 });
  assert.equal(await restoringTrash, true);
  assert.equal(trashed.__calls.at(-1).message, 'Restored from Trash to Research / Sources');

  const i18n = readI18n();
  for (const key of [
    'library.spaceDestinationPath', 'archive.restoreGroupToFor', 'trash.restoreGroupToFor',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  assert.equal(i18n['zh-TW']['library.spaceDestinationPath'], '{workspace} › {space}');
  assert.equal(i18n['zh-TW']['archive.restoreGroupToFor'], '將群組「{title}」復原到 {destination}');
  assert.equal(i18n['zh-TW']['trash.restoreGroupToFor'], '將垃圾桶內的群組「{title}」復原到 {destination}');

  const archiveRender = archivePageSource();
  assert.match(archiveRender,
    /createArchivedGroupRestoreContext\(entry, 'archive', index\)[\s\S]*?line: archivedGroupRestoreDestinationText\(context\)/,
    'each archived Group row must display the destination owned by its exact review');
  assert.match(archiveRender,
    /tr\(trash \? 'trash\.restoreGroupToFor' : 'archive\.restoreGroupToFor', \{ title, destination: archivedGroupRestorePathText\(context\) \}\)/,
    'the Archive Group control must name the raw destination path once');
  assert.match(archiveRender,
    /data-archived-group-restore="true"[\s\S]*?commitArchivedGroupRestore\(review\.context, button\)[\s\S]*?changed = !!\(await write\(\)\);[\s\S]*?if \(changed\) requestAnimationFrame\(\(\) => focusArchivePageTarget\(nextKey, control\)\)/,
    'individual Archive Group Restore must wait for acceptance before focus continuation');

  const trashRender = archivePageSource();
  assert.match(trashRender,
    /createTrashedGroupRestoreContext\(entry, index\)[\s\S]*?line: archivedGroupRestoreDestinationText\(context\)/,
    'each trashed Group row must retain its exact destination beside the countdown');
  assert.match(trashRender,
    /trashDaysLeft\(entry\)/,
    'every Trash row keeps its countdown beside the destination');
  assert.match(trashRender,
    /commitTrashedGroupRestore\(review\.context, button\)[\s\S]*?changed = !!\(await write\(\)\);/,
    'individual Trash Group Restore must wait for acceptance before focus continuation');

  const compactSearch = extractFunction('renderArchiveSearchResults');
  assert.match(compactSearch,
    /isArchivedGroup[\s\S]*?createArchivedGroupRestoreContext\(match\.entry, 'archive'\)[\s\S]*?openArchivedGroupRestoreReview\(restoreContext, viewButton\)/,
    'compact Search must route Groups to the canonical exact-destination review');
  const compactSettings = extractFunction('renderArchiveList');
  assert.match(compactSettings,
    /isArchivedGroup[\s\S]*?createArchivedGroupRestoreContext\(e, 'archive'\)[\s\S]*?openArchivedGroupRestoreReview\(restoreContext, actionButton\)/,
    'Settings must route Groups to the canonical exact-destination review');
  assert.match(css,
    /\[data-archived-group-restore\]\[aria-busy="true"\][\s\S]*?animation:\s*return-marker-receipt-pulse/,
    'Group Restore must reuse the established persistence receipt signal');
}

function createArchivedLocalItemRestoreHarness({
  collectionName = 'archive',
  rootType = 'stack',
  activeConflict = false,
  missingGroup = false,
  recovery = false,
} = {}) {
  const item = rootType === 'note'
    ? { id: 'stored-note', type: 'note', html: '<p>Keep this note.</p>', color: '#fff7d6' }
    : rootType === 'todo'
      ? { id: 'stored-todo', type: 'todo', text: 'Renew library card', done: false }
      : {
          id: 'stored-stack', type: 'stack', name: 'Reading notes', expanded: false,
          items: [
            { id: 'stack-page', type: 'tab', title: 'Paper', url: 'https://paper.test/' },
            { id: 'stack-note', type: 'note', html: '<p>Keep this nested note.</p>' },
            {
              id: 'stack-inner', type: 'stack', name: 'Next', items: [
                { id: 'stack-todo', type: 'todo', text: 'Summarize', done: true },
              ],
            },
          ],
        };
  const retention = collectionName === 'trash'
    ? { trashedAt: 900, retentionStartedAt: 875 }
    : {};
  const entry = {
    kind: 'item',
    data: item,
    wsId: 'local-workspace',
    catId: 'local-space',
    catName: 'Projects',
    groupId: 'return-group',
    groupName: 'Project notes',
    at: 700,
    ...retention,
  };
  const destinationGroup = {
    id: 'return-group', name: 'Project notes', items: activeConflict
      ? [{ id: rootType === 'stack' ? 'stack-note' : item.id, type: 'note', html: '<p>Conflict</p>' }]
      : [],
  };
  const state = {
    activeWsId: 'local-workspace',
    workspaces: [{
      id: 'local-workspace',
      name: 'Research',
      activeCatId: 'local-space',
      categories: [{
        id: 'local-space', name: 'Projects', groups: missingGroup ? [] : [destinationGroup],
      }],
    }],
    archive: collectionName === 'archive' ? [entry] : [],
    trash: collectionName === 'trash' ? [entry] : [],
  };
  const context = vm.createContext({
    __state: state,
    __entry: entry,
    __item: item,
    __destinationGroup: destinationGroup,
    __calls: [],
    __frames: [],
    __resolveWrite: null,
    __rejectWrite: null,
    __recovery: recovery,
    LocusImportUtils: importUtils,
    State: {
      get() { return context.__state; },
      isRecoveryRequired() { return context.__recovery; },
      snapshot(label) { context.__calls.push({ type: 'snapshot', label }); },
      persistNow() {
        context.__calls.push({ type: 'persist' });
        return new Promise((resolve, reject) => {
          context.__resolveWrite = resolve;
          context.__rejectWrite = reject;
        });
      },
      requireRecovery() { context.__recovery = true; context.__calls.push({ type: 'require-recovery' }); },
    },
    createOrganizationIdAllocator() {
      context.__calls.push({ type: 'allocator' });
      return () => 'allocated-inbox';
    },
    setArchivedLocalItemRestoreBusy(candidate, opener, busy) {
      context.__calls.push({ type: 'busy', candidate, opener, busy });
      return true;
    },
    showStateRecoveryRequired(error) { context.__calls.push({ type: 'show-recovery', error }); },
    renderBoard() { context.__calls.push({ type: 'render' }); },
    renderArchiveList() { context.__calls.push({ type: 'render-archive' }); },
    updateNavChrome() { context.__calls.push({ type: 'nav' }); },
    toast(message, options) { context.__calls.push({ type: 'toast', message, options }); },
    focusArchivedPageRestoreOpener(opener) { context.__calls.push({ type: 'focus', opener }); return true; },
    requestAnimationFrame(callback) {
      context.__calls.push({ type: 'frame' });
      context.__frames.push(callback);
      return context.__frames.length;
    },
    tr(key, vars = {}) {
      if (key === 'library.destinationPath') {
        return `${vars.workspace} / ${vars.space} / Group: ${vars.group}`;
      }
      if (key === 'archive.restoreDestination') return `Restore to ${vars.destination}`;
      if (key === 'archive.restoredTo') return `Restored to ${vars.destination}`;
      if (key === 'trash.restoredTo') return `Restored from Trash to ${vars.destination}`;
      if (key === 'archive.restoreUnavailable') return 'Restore destination unavailable';
      return `translated:${key}`;
    },
  });
  const functions = [
    'itemDetailValueFingerprint',
    'archivedLocalItemEntityIds',
    'archivedLocalItemIdsAvailable',
    'resolveArchivedPageRestoreDestination',
    'createArchivedLocalItemRestoreContext',
    'createTrashedLocalItemRestoreContext',
    'resolveArchivedLocalItemRestoreTarget',
    'archivedLocalItemRestorePathText',
    'archivedLocalItemRestoreDestinationText',
    'isArchivedPageRestorePending',
    'commitArchivedLocalItemRestore',
    'commitTrashedLocalItemRestore',
  ];
  vm.runInContext(functions.map(extractFunction).join('\n\n').replace(
    'function isArchivedPageRestorePending()',
    'let archivedPageRestorePending = null;\nfunction isArchivedPageRestorePending()',
  ) + `
globalThis.__createLocalReview = createArchivedLocalItemRestoreContext;
globalThis.__createTrashLocalReview = createTrashedLocalItemRestoreContext;
globalThis.__commitLocalRestore = commitArchivedLocalItemRestore;
globalThis.__commitTrashLocalRestore = commitTrashedLocalItemRestore;
globalThis.__localPathText = archivedLocalItemRestorePathText;
globalThis.__localDestinationText = archivedLocalItemRestoreDestinationText;`, context, {
    filename: 'archived-local-item-restore.js',
  });
  return context;
}

async function testArchivedLocalItemRestoreWaitsForOneReceipt() {
  for (const rootType of ['note', 'todo', 'stack']) {
    const candidate = createArchivedLocalItemRestoreHarness({ rootType });
    const review = candidate.__createLocalReview(candidate.__entry, 'archive');
    assert.ok(review, `${rootType} must produce one exact destination review`);
    assert.equal(review.itemRef, candidate.__item);
  }

  const accepted = createArchivedLocalItemRestoreHarness();
  const review = accepted.__createLocalReview(accepted.__entry, 'archive');
  assert.deepEqual(plain(review.entityIds), [
    'stored-stack', 'stack-page', 'stack-note', 'stack-inner', 'stack-todo',
  ]);
  assert.equal(accepted.__localPathText(review), 'Research / Projects / Group: Project notes');
  assert.equal(accepted.__localDestinationText(review), 'Restore to Research / Projects / Group: Project notes');

  const restoring = accepted.__commitLocalRestore(review, { id: 'local-restore' });
  assert.equal(accepted.__state.archive.length, 0);
  assert.equal(accepted.__destinationGroup.items.at(-1), accepted.__item,
    'pending Restore must retain the complete original Stack object');
  assert.deepEqual(accepted.__calls.map(call => call.type), ['busy', 'snapshot', 'persist']);
  assert.equal(accepted.__calls.some(call => ['render', 'render-archive', 'nav', 'toast', 'focus'].includes(call.type)), false,
    'pending storage must keep the local-item row, route, and date visible');
  assert.equal(await accepted.__commitLocalRestore(review, { id: 'duplicate' }), false);
  assert.equal(accepted.__calls.filter(call => call.type === 'persist').length, 1);
  accepted.__resolveWrite({ ok: true, revision: 111 });
  assert.equal(await restoring, true);
  assert.deepEqual(accepted.__calls.slice(3).map(call => call.type), [
    'busy', 'render', 'render-archive', 'nav', 'toast',
  ]);
  assert.equal(accepted.__calls.at(-1).message, 'Restored to Research / Projects / Group: Project notes');
  assert.equal(accepted.__calls.at(-1).options.undo, true);
  assert.equal(accepted.__item.items[2].items[0].text, 'Summarize');

  const conflict = createArchivedLocalItemRestoreHarness({ activeConflict: true });
  assert.equal(conflict.__createLocalReview(conflict.__entry, 'archive'), null,
    'a nested active stable-ID conflict must make the complete Stack unavailable');

  const duplicate = createArchivedLocalItemRestoreHarness();
  duplicate.__item.items[1].id = duplicate.__item.id;
  assert.equal(duplicate.__createLocalReview(duplicate.__entry, 'archive'), null,
    'duplicate IDs inside the stored item graph must fail closed');

  const stale = createArchivedLocalItemRestoreHarness();
  const staleReview = stale.__createLocalReview(stale.__entry, 'archive');
  stale.__item.name = 'Changed elsewhere';
  assert.equal(await stale.__commitLocalRestore(staleReview, { id: 'stale-local' }), false);
  assert.deepEqual(stale.__calls.map(call => call.type), ['busy', 'frame']);
  stale.__frames[0]();
  assert.deepEqual(stale.__calls.slice(2).map(call => call.type), ['busy', 'toast', 'focus']);
  assert.equal(stale.__calls.some(call => ['snapshot', 'persist', 'render'].includes(call.type)), false);

  const recovery = createArchivedLocalItemRestoreHarness({ recovery: true });
  assert.equal(await recovery.__commitLocalRestore(
    recovery.__createLocalReview(recovery.__entry, 'archive'), { id: 'recovery-local' },
  ), false);
  assert.deepEqual(recovery.__calls, []);

  const rejected = createArchivedLocalItemRestoreHarness();
  const rejection = rejected.__commitLocalRestore(
    rejected.__createLocalReview(rejected.__entry, 'archive'), { id: 'rejected-local' },
  );
  rejected.__recovery = true;
  rejected.__rejectWrite(Object.assign(new Error('unknown receipt'), { code: 'LOCUS_STATE_UNKNOWN_ACK' }));
  assert.equal(await rejection, false);
  assert.equal(rejected.__calls.filter(call => call.type === 'persist').length, 1,
    'unknown local-item receipt must not retry');
  assert.deepEqual(rejected.__calls.slice(3).map(call => call.type), ['busy', 'show-recovery']);
  assert.equal(rejected.__calls.some(call => ['render', 'toast', 'focus'].includes(call.type)), false);

  const trashed = createArchivedLocalItemRestoreHarness({ collectionName: 'trash', rootType: 'todo', missingGroup: true });
  const trashReview = trashed.__createTrashLocalReview(trashed.__entry);
  assert.ok(trashReview);
  assert.equal(trashReview.collectionName, 'trash');
  assert.equal(trashReview.entryRef.trashedAt, 900);
  assert.equal(trashReview.destination.createInbox, true);
  assert.equal(await trashed.__commitTrashLocalRestore(review, { id: 'wrong-collection' }), false);
  const restoringTrash = trashed.__commitTrashLocalRestore(trashReview, { id: 'trash-local' });
  const inbox = trashed.__state.workspaces[0].categories[0].groups[0];
  assert.equal(inbox.id, 'allocated-inbox');
  assert.equal(inbox.name, 'Inbox');
  assert.equal(inbox.items[0], trashed.__item);
  assert.deepEqual(trashed.__calls.map(call => call.type), ['busy', 'allocator', 'snapshot', 'persist']);
  trashed.__resolveWrite({ ok: true, revision: 112 });
  assert.equal(await restoringTrash, true);
  assert.equal(trashed.__calls.at(-1).message, 'Restored from Trash to Research / Projects / Group: Inbox');

  const i18n = readI18n();
  assert.equal(i18n.en['archive.restoreToFor'], 'Restore {title} to {destination}');
  assert.equal(i18n['zh-TW']['archive.restoreToFor'], '將「{title}」復原到 {destination}');
  assert.equal(i18n['zh-TW']['trash.restoreToFor'], '將「{title}」復原到 {destination}');

  const archiveRender = archivePageSource();
  assert.match(archiveRender,
    /\['note', 'todo', 'stack'\]\.includes\(entry\.data\?\.type\)[\s\S]*?createArchivedLocalItemRestoreContext\(entry, 'archive', index\)[\s\S]*?line: archivedLocalItemRestoreDestinationText\(context\)/,
    'each archived local-item row must display its exact reviewed Group destination');
  assert.match(archiveRender,
    /tr\(trash \? 'trash\.restoreToFor' : 'archive\.restoreToFor', \{ title, destination: archivedLocalItemRestorePathText\(context\) \}\)[\s\S]*?data-archived-local-item-restore="true"[\s\S]*?commitArchivedLocalItemRestore\(review\.context, button\)[\s\S]*?changed = !!\(await write\(\)\);[\s\S]*?if \(changed\) requestAnimationFrame\(\(\) => focusArchivePageTarget\(nextKey, control\)\)/,
    'individual Archive local-item Restore must wait for acceptance before focus continuation');

  const trashRender = archivePageSource();
  assert.match(trashRender,
    /createTrashedLocalItemRestoreContext\(entry, index\)[\s\S]*?line: archivedLocalItemRestoreDestinationText\(context\)/,
    'each trashed local-item row must retain its exact destination beside the countdown');
  assert.match(trashRender,
    /commitTrashedLocalItemRestore\(review\.context, button\)[\s\S]*?changed = !!\(await write\(\)\);/,
    'individual Trash local-item Restore must wait for acceptance before focus continuation');

  const compactSearch = extractFunction('renderArchiveSearchResults');
  assert.match(compactSearch,
    /isArchivedLocalItem[\s\S]*?createArchivedLocalItemRestoreContext\(match\.entry, 'archive'\)[\s\S]*?openArchivedLocalItemRestoreReview\(restoreContext, viewButton\)/,
    'compact Search must route local items to the canonical exact-destination review');
  const compactSettings = extractFunction('renderArchiveList');
  assert.match(compactSettings,
    /isArchivedLocalItem[\s\S]*?createArchivedLocalItemRestoreContext\(e, 'archive'\)[\s\S]*?openArchivedLocalItemRestoreReview\(restoreContext, actionButton\)/,
    'Settings must route local items to the canonical exact-destination review');
  assert.match(css,
    /\[data-archived-local-item-restore\]\[aria-busy="true"\][\s\S]*?animation:\s*return-marker-receipt-pulse/,
    'local-item Restore must reuse the established persistence receipt signal');
}

function createArchivedGroupBatchRestoreHarness({
  collectionName = 'archive',
  sharedDestination = false,
  duplicateGroupId = false,
  recovery = false,
} = {}) {
  const groupA = {
    id: 'batch-group-a', name: 'Reading', symbol: '📚', color: '#4f46e5', items: [
      { id: 'batch-group-page-a', type: 'tab', title: 'Paper A', url: 'https://a.test/' },
    ],
  };
  const groupB = {
    id: duplicateGroupId ? groupA.id : 'batch-group-b',
    name: 'Queue', symbol: '📥', color: '#0f766e', items: [
      { id: 'batch-group-page-b', type: 'tab', title: 'Paper B', url: 'https://b.test/' },
    ],
  };
  const retention = index => collectionName === 'trash'
    ? { trashedAt: 900 - index * 25, retentionStartedAt: 875 - index * 25 }
    : {};
  const entries = [
    {
      kind: 'group', data: groupA, wsId: 'batch-group-workspace', catId: 'batch-group-space-a',
      catName: 'Sources', at: 700, ...retention(0),
    },
    {
      kind: 'group', data: groupB, wsId: 'batch-group-workspace',
      catId: sharedDestination ? 'batch-group-space-a' : 'batch-group-space-b',
      catName: sharedDestination ? 'Sources' : 'Later', at: 650, ...retention(1),
    },
  ];
  const sourceExisting = { id: 'source-existing', name: 'Existing source', items: [] };
  const laterExisting = { id: 'later-existing', name: 'Existing later', items: [] };
  const state = {
    activeWsId: 'batch-group-workspace',
    workspaces: [{
      id: 'batch-group-workspace', name: 'Research', activeCatId: 'batch-group-space-a',
      categories: [
        { id: 'batch-group-space-a', name: 'Sources', groups: [sourceExisting] },
        { id: 'batch-group-space-b', name: 'Later', groups: [laterExisting] },
      ],
    }],
    archive: collectionName === 'archive' ? entries.slice() : [],
    trash: collectionName === 'trash' ? entries.slice() : [],
  };
  const context = vm.createContext({
    __state: state,
    __entries: entries,
    __groups: [groupA, groupB],
    __calls: [],
    __frames: [],
    __resolveWrite: null,
    __rejectWrite: null,
    __recovery: recovery,
    LocusImportUtils: importUtils,
    State: {
      get() { return context.__state; },
      isRecoveryRequired() { return context.__recovery; },
      snapshot(label) { context.__calls.push({ type: 'snapshot', label }); },
      persistNow() {
        context.__calls.push({ type: 'persist' });
        return new Promise((resolve, reject) => {
          context.__resolveWrite = resolve;
          context.__rejectWrite = reject;
        });
      },
      requireRecovery() { context.__recovery = true; context.__calls.push({ type: 'require-recovery' }); },
    },
    setArchivedGroupBatchRestoreBusy(candidate, opener, busy) {
      context.__calls.push({ type: 'busy', candidate, opener, busy });
      return true;
    },
    showStateRecoveryRequired(error) { context.__calls.push({ type: 'show-recovery', error }); },
    renderBoard() { context.__calls.push({ type: 'render' }); },
    renderArchiveList() { context.__calls.push({ type: 'render-archive' }); },
    updateNavChrome() { context.__calls.push({ type: 'nav' }); },
    toast(message, options) { context.__calls.push({ type: 'toast', message, options }); },
    focusArchivedPageRestoreOpener(opener) { context.__calls.push({ type: 'focus', opener }); return true; },
    requestAnimationFrame(callback) {
      context.__calls.push({ type: 'frame' });
      context.__frames.push(callback);
      return context.__frames.length;
    },
    tr(key, vars = {}) {
      if (key === 'library.spaceDestinationPath') return `${vars.workspace} / ${vars.space}`;
      if (key === 'archive.restoreDestination') return `Restore to ${vars.destination}`;
      if (key === 'archive.restoreSelected') return 'Restore selected';
      if (key === 'trash.restoreSelected') return 'Restore selected from Trash';
      if (key === 'archive.restoredTo') return `Restored to ${vars.destination}`;
      if (key === 'trash.restoredTo') return `Restored from Trash to ${vars.destination}`;
      if (key === 'archive.restoredGroupsTo') return `Restored ${vars.count} groups to ${vars.destination}`;
      if (key === 'archive.restoredGroupsToMany') {
        return `Restored ${vars.count} groups to ${vars.destinationCount} destinations`;
      }
      if (key === 'trash.restoredGroupsTo') {
        return `Restored ${vars.count} groups from Trash to ${vars.destination}`;
      }
      if (key === 'trash.restoredGroupsToMany') {
        return `Restored ${vars.count} groups from Trash to ${vars.destinationCount} destinations`;
      }
      return `translated:${key}`;
    },
  });
  const functions = [
    'itemDetailValueFingerprint',
    'archivedGroupEntityIds',
    'archivedGroupIdsAvailable',
    'resolveArchivedGroupRestoreDestination',
    'createArchivedGroupRestoreContext',
    'createTrashedGroupRestoreContext',
    'resolveArchivedGroupRestoreTarget',
    'archivedGroupRestorePathText',
    'archivedGroupRestoreDestinationText',
    'groupArchivedGroupRestoreDestinations',
    'createArchivedGroupBatchRestoreContext',
    'createTrashedGroupBatchRestoreContext',
    'resolveArchivedGroupBatchRestoreTargets',
    'archivedGroupBatchRestoreSuccessText',
    'isArchivedPageRestorePending',
    'commitArchivedGroupBatchRestore',
    'commitTrashedGroupBatchRestore',
  ];
  vm.runInContext(functions.map(extractFunction).join('\n\n').replace(
    'function isArchivedPageRestorePending()',
    'let archivedPageRestorePending = null;\nfunction isArchivedPageRestorePending()',
  ) + `
globalThis.__createGroupBatchReview = createArchivedGroupBatchRestoreContext;
globalThis.__createTrashGroupBatchReview = createTrashedGroupBatchRestoreContext;
globalThis.__commitGroupBatchRestore = commitArchivedGroupBatchRestore;
globalThis.__commitTrashGroupBatchRestore = commitTrashedGroupBatchRestore;`, context, {
    filename: 'archived-group-batch-restore.js',
  });
  return context;
}

async function testSelectedGroupsRestoreAfterOneReceipt() {
  const accepted = createArchivedGroupBatchRestoreHarness();
  const review = accepted.__createGroupBatchReview(accepted.__entries, 'archive');
  assert.ok(review, 'two exact archived Groups must produce one batch review');
  assert.equal(review.count, 2);
  assert.deepEqual(plain(review.groupIds), ['batch-group-a', 'batch-group-b']);
  assert.equal(review.destinations.length, 2);
  assert.deepEqual(plain(review.destinations.map(destination => destination.count)), [1, 1]);

  const restoring = accepted.__commitGroupBatchRestore(review, { id: 'group-batch' });
  assert.equal(accepted.__state.archive.length, 0);
  assert.equal(accepted.__state.workspaces[0].categories[0].groups.at(-1), accepted.__groups[0]);
  assert.equal(accepted.__state.workspaces[0].categories[1].groups.at(-1), accepted.__groups[1]);
  assert.deepEqual(accepted.__calls.map(call => call.type), ['busy', 'snapshot', 'persist']);
  assert.equal(accepted.__calls[1].label, 'Restore selected');
  assert.equal(accepted.__calls.some(call => ['render', 'render-archive', 'nav', 'toast', 'focus'].includes(call.type)), false,
    'pending storage must keep selected Group rows and destinations visible');
  assert.equal(await accepted.__commitGroupBatchRestore(review, { id: 'duplicate' }), false);
  assert.equal(accepted.__calls.filter(call => call.type === 'persist').length, 1);
  accepted.__resolveWrite({ ok: true, revision: 101 });
  assert.equal(await restoring, true);
  assert.deepEqual(accepted.__calls.slice(3).map(call => call.type), [
    'busy', 'render', 'render-archive', 'nav', 'toast',
  ]);
  assert.equal(accepted.__calls.at(-1).message, 'Restored 2 groups to 2 destinations');
  assert.equal(accepted.__calls.at(-1).options.undo, true);

  const shared = createArchivedGroupBatchRestoreHarness({ sharedDestination: true });
  const sharedReview = shared.__createGroupBatchReview(shared.__entries, 'archive');
  assert.equal(sharedReview.destinations.length, 1);
  assert.equal(sharedReview.destinations[0].count, 2);
  const restoringShared = shared.__commitGroupBatchRestore(sharedReview, { id: 'shared-groups' });
  assert.deepEqual(shared.__state.workspaces[0].categories[0].groups.slice(-2), shared.__groups,
    'Groups restored to one Space must retain selected order and exact object identity');
  shared.__resolveWrite({ ok: true, revision: 102 });
  assert.equal(await restoringShared, true);
  assert.equal(shared.__calls.at(-1).message, 'Restored 2 groups to Research / Sources');

  const duplicate = createArchivedGroupBatchRestoreHarness({ duplicateGroupId: true });
  assert.equal(duplicate.__createGroupBatchReview(duplicate.__entries, 'archive'), null,
    'duplicate Group identities must make the whole selection unavailable');

  const mixed = createArchivedGroupBatchRestoreHarness();
  const noteEntry = {
    kind: 'item', data: { id: 'batch-local-note', type: 'note', html: '<p>Local note</p>' },
    wsId: 'batch-group-workspace', catId: 'batch-group-space-a', at: 500,
  };
  mixed.__state.archive.push(noteEntry);
  assert.equal(mixed.__createGroupBatchReview([mixed.__entries[0], noteEntry], 'archive'), null,
    'Groups mixed with local items must not enter the Group batch seam');

  const stale = createArchivedGroupBatchRestoreHarness();
  const staleReview = stale.__createGroupBatchReview(stale.__entries, 'archive');
  stale.__state.workspaces[0].categories[1].name = 'Changed elsewhere';
  assert.equal(await stale.__commitGroupBatchRestore(staleReview, { id: 'stale-groups' }), false);
  assert.deepEqual(stale.__calls.map(call => call.type), ['busy', 'frame']);
  stale.__frames[0]();
  assert.deepEqual(stale.__calls.slice(2).map(call => call.type), ['busy', 'toast', 'focus']);
  assert.equal(stale.__calls.some(call => ['snapshot', 'persist', 'render'].includes(call.type)), false);

  const recovery = createArchivedGroupBatchRestoreHarness({ recovery: true });
  assert.equal(await recovery.__commitGroupBatchRestore(
    recovery.__createGroupBatchReview(recovery.__entries, 'archive'), { id: 'recovery-groups' },
  ), false);
  assert.deepEqual(recovery.__calls, []);

  const rejected = createArchivedGroupBatchRestoreHarness();
  const rejection = rejected.__commitGroupBatchRestore(
    rejected.__createGroupBatchReview(rejected.__entries, 'archive'), { id: 'rejected-groups' },
  );
  rejected.__recovery = true;
  rejected.__rejectWrite(Object.assign(new Error('unknown receipt'), { code: 'LOCUS_STATE_UNKNOWN_ACK' }));
  assert.equal(await rejection, false);
  assert.equal(rejected.__calls.filter(call => call.type === 'persist').length, 1,
    'unknown Group batch receipt must not retry');
  assert.deepEqual(rejected.__calls.slice(3).map(call => call.type), ['busy', 'show-recovery']);
  assert.equal(rejected.__calls.some(call => ['render', 'toast', 'focus'].includes(call.type)), false);

  const trashed = createArchivedGroupBatchRestoreHarness({ collectionName: 'trash' });
  const trashReview = trashed.__createTrashGroupBatchReview(trashed.__entries);
  assert.ok(trashReview);
  assert.equal(trashReview.collectionName, 'trash');
  assert.equal(trashReview.reviews[0].entryRef.trashedAt, 900);
  assert.equal(await trashed.__commitTrashGroupBatchRestore(review, { id: 'wrong-collection' }), false);
  const restoringTrash = trashed.__commitTrashGroupBatchRestore(trashReview, { id: 'trash-groups' });
  assert.equal(trashed.__state.trash.length, 0);
  assert.equal(trashed.__calls.filter(call => call.type === 'persist').length, 1);
  assert.equal(trashed.__calls.some(call => ['render', 'toast', 'focus'].includes(call.type)), false);
  trashed.__resolveWrite({ ok: true, revision: 103 });
  assert.equal(await restoringTrash, true);
  assert.equal(trashed.__calls.at(-1).message, 'Restored 2 groups from Trash to 2 destinations');

  const i18n = readI18n();
  for (const key of [
    'archive.restoreGroupsSeparately', 'trash.restoreGroupsSeparately',
    'archive.restoredGroupsTo', 'archive.restoredGroupsToMany',
    'trash.restoredGroupsTo', 'trash.restoredGroupsToMany',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  assert.equal(i18n['zh-TW']['archive.restoreGroupsSeparately'], '請分開選取群組和其他封存內容');
  assert.equal(i18n['zh-TW']['trash.restoreGroupsSeparately'], '請分開選取群組和垃圾桶內的其他內容');
  assert.equal(i18n['zh-TW']['archive.restoredGroupsTo'], '已將 {count} 個群組復原到 {destination}');
  assert.equal(i18n['zh-TW']['archive.restoredGroupsToMany'], '已將 {count} 個群組復原到 {destinationCount} 個位置');
  assert.equal(i18n['zh-TW']['trash.restoredGroupsTo'], '已將垃圾桶內的 {count} 個群組復原到 {destination}');
  assert.equal(i18n['zh-TW']['trash.restoredGroupsToMany'], '已將垃圾桶內的 {count} 個群組復原到 {destinationCount} 個位置');

  const archiveRender = archivePageSource();
  assert.match(archiveRender,
    /containsArchivedGroup && containsLocalItem[\s\S]*?archive\.restoreGroupsSeparately[\s\S]*?createArchivedGroupBatchRestoreContext\(selectedEntries, 'archive'\)[\s\S]*?showRoutes\(view\.selectedReview, 'library\.spaceDestinationPath', archivedGroupRestoreDestinationText\)/,
    'Archive Group-only selection must own its destination review and mixed-selection refusal');
  assert.match(archiveRender,
    /commitArchivedGroupBatchRestore\(selectedRestoreReview, restoreSelected\)[\s\S]*?changed = !!\(await write\(\)\);[\s\S]*?if \(changed\) requestAnimationFrame\(\(\) => focusArchivePageTarget\(nextKey, control\)\)/,
    'selected Archive Groups must wait for one accepted receipt before focus continuation');

  const trashRender = archivePageSource();
  assert.match(trashRender,
    /containsArchivedGroup && containsLocalItem[\s\S]*?trash\.restoreGroupsSeparately[\s\S]*?createTrashedGroupBatchRestoreContext\(selectedEntries\)/,
    'Trash Group-only selection must own its destination review and mixed-selection refusal');
  assert.match(trashRender,
    /commitTrashedGroupBatchRestore\(selectedRestoreReview, restoreSelected\)[\s\S]*?changed = !!\(await write\(\)\);/,
    'selected Trash Groups must wait for one accepted receipt before focus continuation');
  assert.match(css,
    /\[data-archived-group-batch-restore\]\[aria-busy="true"\][\s\S]*?animation:\s*return-marker-receipt-pulse/,
    'selected Group Restore must reuse the established persistence receipt signal');
}

function createArchivedLocalItemBatchRestoreHarness({
  collectionName = 'archive',
  sharedDestination = false,
  duplicateItemId = false,
  recovery = false,
} = {}) {
  const items = [
    { id: 'batch-note', type: 'note', html: '<p>Project context</p>', color: '#fff7d6' },
    { id: duplicateItemId ? 'batch-note' : 'batch-todo', type: 'todo', text: 'Send summary', done: false },
    {
      id: 'batch-stack', type: 'stack', name: 'Reading', expanded: false, items: [
        { id: 'batch-stack-page', type: 'tab', title: 'Paper', url: 'https://paper.test/' },
        { id: 'batch-stack-note', type: 'note', html: '<p>Nested context</p>' },
      ],
    },
  ];
  const retention = collectionName === 'trash'
    ? { trashedAt: 900, retentionStartedAt: 875 }
    : {};
  const entries = items.map((item, index) => ({
    kind: 'item',
    data: item,
    wsId: 'batch-local-workspace',
    catId: sharedDestination || index < 1 ? 'batch-local-space-a' : 'batch-local-space-b',
    catName: sharedDestination || index < 1 ? 'Projects' : 'Later',
    groupId: sharedDestination || index < 1 ? 'batch-local-group-a' : 'missing-local-group',
    groupName: sharedDestination || index < 1 ? 'Working set' : 'Missing group',
    at: 700 - index,
    ...retention,
  }));
  const destinationGroup = { id: 'batch-local-group-a', name: 'Working set', items: [] };
  const state = {
    activeWsId: 'batch-local-workspace',
    workspaces: [{
      id: 'batch-local-workspace',
      name: 'Research',
      activeCatId: 'batch-local-space-a',
      categories: [
        { id: 'batch-local-space-a', name: 'Projects', groups: [destinationGroup] },
        { id: 'batch-local-space-b', name: 'Later', groups: [] },
      ],
    }],
    archive: collectionName === 'archive' ? entries.slice() : [],
    trash: collectionName === 'trash' ? entries.slice() : [],
  };
  let allocated = 0;
  const context = vm.createContext({
    __state: state,
    __entries: entries,
    __items: items,
    __destinationGroup: destinationGroup,
    __calls: [],
    __frames: [],
    __resolveWrite: null,
    __rejectWrite: null,
    __recovery: recovery,
    LocusImportUtils: importUtils,
    State: {
      get() { return context.__state; },
      isRecoveryRequired() { return context.__recovery; },
      snapshot(label) { context.__calls.push({ type: 'snapshot', label }); },
      persistNow() {
        context.__calls.push({ type: 'persist' });
        return new Promise((resolve, reject) => {
          context.__resolveWrite = resolve;
          context.__rejectWrite = reject;
        });
      },
      requireRecovery() { context.__recovery = true; context.__calls.push({ type: 'require-recovery' }); },
    },
    createOrganizationIdAllocator() {
      context.__calls.push({ type: 'allocator' });
      return () => `allocated-local-inbox-${++allocated}`;
    },
    setArchivedLocalItemBatchRestoreBusy(candidate, opener, busy) {
      context.__calls.push({ type: 'busy', candidate, opener, busy });
      return true;
    },
    showStateRecoveryRequired(error) { context.__calls.push({ type: 'show-recovery', error }); },
    renderBoard() { context.__calls.push({ type: 'render' }); },
    renderArchiveList() { context.__calls.push({ type: 'render-archive' }); },
    updateNavChrome() { context.__calls.push({ type: 'nav' }); },
    toast(message, options) { context.__calls.push({ type: 'toast', message, options }); },
    focusArchivedPageRestoreOpener(opener) { context.__calls.push({ type: 'focus', opener }); return true; },
    requestAnimationFrame(callback) {
      context.__calls.push({ type: 'frame' });
      context.__frames.push(callback);
      return context.__frames.length;
    },
    tr(key, vars = {}) {
      if (key === 'library.destinationPath') {
        return `${vars.workspace} / ${vars.space} / Group: ${vars.group}`;
      }
      if (key === 'archive.restoreDestination') return `Restore to ${vars.destination}`;
      if (key === 'archive.restoredTo') return `Restored to ${vars.destination}`;
      if (key === 'trash.restoredTo') return `Restored from Trash to ${vars.destination}`;
      if (key === 'archive.restoredItemsTo') return `Restored ${vars.count} items to ${vars.destination}`;
      if (key === 'archive.restoredItemsToMany') return `Restored ${vars.count} items to ${vars.destinationCount} destinations`;
      if (key === 'trash.restoredItemsTo') return `Restored ${vars.count} items from Trash to ${vars.destination}`;
      if (key === 'trash.restoredItemsToMany') return `Restored ${vars.count} items from Trash to ${vars.destinationCount} destinations`;
      if (key === 'archive.restoreSelected') return 'Restore selected';
      if (key === 'trash.restoreSelected') return 'Restore selected from Trash';
      if (key === 'archive.restoreUnavailable') return 'Restore destination unavailable';
      return `translated:${key}`;
    },
  });
  const functions = [
    'itemDetailValueFingerprint',
    'archivedLocalItemEntityIds',
    'archivedLocalItemIdsAvailable',
    'resolveArchivedPageRestoreDestination',
    'createArchivedLocalItemRestoreContext',
    'createTrashedLocalItemRestoreContext',
    'resolveArchivedLocalItemRestoreTarget',
    'archivedLocalItemRestorePathText',
    'archivedLocalItemRestoreDestinationText',
    'groupArchivedPageRestoreDestinations',
    'createArchivedLocalItemBatchRestoreContext',
    'createTrashedLocalItemBatchRestoreContext',
    'resolveArchivedLocalItemBatchRestoreTargets',
    'archivedLocalItemBatchRestoreSuccessText',
    'isArchivedPageRestorePending',
    'commitArchivedLocalItemBatchRestore',
    'commitTrashedLocalItemBatchRestore',
  ];
  vm.runInContext(functions.map(extractFunction).join('\n\n').replace(
    'function isArchivedPageRestorePending()',
    'let archivedPageRestorePending = null;\nfunction isArchivedPageRestorePending()',
  ) + `
globalThis.__createLocalBatchReview = createArchivedLocalItemBatchRestoreContext;
globalThis.__createTrashLocalBatchReview = createTrashedLocalItemBatchRestoreContext;
globalThis.__commitLocalBatchRestore = commitArchivedLocalItemBatchRestore;
globalThis.__commitTrashLocalBatchRestore = commitTrashedLocalItemBatchRestore;
globalThis.__localBatchSuccessText = archivedLocalItemBatchRestoreSuccessText;`, context, {
    filename: 'archived-local-item-batch-restore.js',
  });
  return context;
}

async function testSelectedLocalItemsRestoreAfterOneReceipt() {
  const accepted = createArchivedLocalItemBatchRestoreHarness();
  const review = accepted.__createLocalBatchReview(accepted.__entries, 'archive');
  assert.ok(review, 'a mixed note/to-do/Stack selection must produce one exact batch review');
  assert.equal(review.count, 3);
  assert.deepEqual(plain(review.itemIds), ['batch-note', 'batch-todo', 'batch-stack']);
  assert.deepEqual(plain(review.destinations.map(destination => destination.count)), [1, 2]);

  const restoring = accepted.__commitLocalBatchRestore(review, { id: 'selected-local-items' });
  assert.equal(accepted.__state.archive.length, 0);
  assert.deepEqual(accepted.__destinationGroup.items, accepted.__items.slice(0, 1),
    'the existing destination must retain selected order and exact object identity');
  const createdInbox = accepted.__state.workspaces[0].categories[1].groups[0];
  assert.equal(createdInbox.id, 'allocated-local-inbox-1');
  assert.equal(createdInbox.name, 'Inbox');
  assert.deepEqual(plain(createdInbox.items.map(item => item.id)), ['batch-todo', 'batch-stack'],
    'one reviewed Inbox must retain the to-do and complete Stack in selected order');
  assert.equal(createdInbox.items[0], accepted.__items[1]);
  assert.equal(createdInbox.items[1], accepted.__items[2],
    'the complete original Stack object must enter the reviewed new Inbox');
  assert.deepEqual(accepted.__calls.map(call => call.type), ['busy', 'allocator', 'snapshot', 'persist']);
  assert.equal(accepted.__calls.some(call => ['render', 'render-archive', 'nav', 'toast', 'focus'].includes(call.type)), false,
    'pending storage must keep every selected row and route visible');
  assert.equal(await accepted.__commitLocalBatchRestore(review, { id: 'duplicate' }), false);
  assert.equal(accepted.__calls.filter(call => call.type === 'persist').length, 1);
  accepted.__resolveWrite({ ok: true, revision: 121 });
  assert.equal(await restoring, true);
  assert.deepEqual(accepted.__calls.slice(4).map(call => call.type), [
    'busy', 'render', 'render-archive', 'nav', 'toast',
  ]);
  assert.equal(accepted.__calls.at(-1).message, 'Restored 3 items to 2 destinations');
  assert.equal(accepted.__calls.at(-1).options.undo, true);

  const shared = createArchivedLocalItemBatchRestoreHarness({ sharedDestination: true });
  const sharedReview = shared.__createLocalBatchReview(shared.__entries, 'archive');
  assert.equal(sharedReview.destinations.length, 1);
  assert.equal(sharedReview.destinations[0].count, 3);
  assert.equal(
    shared.__localBatchSuccessText(sharedReview),
    'Restored 3 items to Research / Projects / Group: Working set',
  );

  const duplicateEntry = createArchivedLocalItemBatchRestoreHarness();
  assert.equal(duplicateEntry.__createLocalBatchReview([
    duplicateEntry.__entries[0], duplicateEntry.__entries[0],
  ], 'archive'), null, 'the batch seam must reject duplicate entry references');
  const duplicateId = createArchivedLocalItemBatchRestoreHarness({ duplicateItemId: true });
  assert.equal(duplicateId.__createLocalBatchReview(duplicateId.__entries, 'archive'), null,
    'one conflicting stable ID must make the whole local-item selection unavailable');

  const stale = createArchivedLocalItemBatchRestoreHarness();
  const staleReview = stale.__createLocalBatchReview(stale.__entries, 'archive');
  stale.__state.workspaces[0].categories[1].name = 'Changed elsewhere';
  assert.equal(await stale.__commitLocalBatchRestore(staleReview, { id: 'stale-local-items' }), false);
  assert.deepEqual(stale.__calls.map(call => call.type), ['busy', 'frame']);
  stale.__frames[0]();
  assert.deepEqual(stale.__calls.slice(2).map(call => call.type), ['busy', 'toast', 'focus']);
  assert.equal(stale.__calls.some(call => ['snapshot', 'persist', 'render'].includes(call.type)), false);

  const recovery = createArchivedLocalItemBatchRestoreHarness({ recovery: true });
  assert.equal(await recovery.__commitLocalBatchRestore(
    recovery.__createLocalBatchReview(recovery.__entries, 'archive'), { id: 'recovery-local-items' },
  ), false);
  assert.deepEqual(recovery.__calls, []);

  const rejected = createArchivedLocalItemBatchRestoreHarness();
  const rejection = rejected.__commitLocalBatchRestore(
    rejected.__createLocalBatchReview(rejected.__entries, 'archive'), { id: 'rejected-local-items' },
  );
  rejected.__recovery = true;
  rejected.__rejectWrite(Object.assign(new Error('unknown receipt'), { code: 'LOCUS_STATE_UNKNOWN_ACK' }));
  assert.equal(await rejection, false);
  assert.equal(rejected.__calls.filter(call => call.type === 'persist').length, 1,
    'unknown local-item batch receipt must not retry');
  assert.deepEqual(rejected.__calls.slice(4).map(call => call.type), ['busy', 'show-recovery']);
  assert.equal(rejected.__calls.some(call => ['render', 'toast', 'focus'].includes(call.type)), false);

  const trashed = createArchivedLocalItemBatchRestoreHarness({ collectionName: 'trash' });
  const trashReview = trashed.__createTrashLocalBatchReview(trashed.__entries);
  assert.ok(trashReview);
  assert.equal(trashReview.collectionName, 'trash');
  assert.equal(trashReview.reviews[0].entryRef.trashedAt, 900);
  assert.equal(await trashed.__commitTrashLocalBatchRestore(review, { id: 'wrong-collection' }), false);
  const restoringTrash = trashed.__commitTrashLocalBatchRestore(trashReview, { id: 'trash-local-items' });
  assert.equal(trashed.__state.trash.length, 0);
  assert.equal(trashed.__calls.filter(call => call.type === 'persist').length, 1);
  assert.equal(trashed.__calls.some(call => ['render', 'toast', 'focus'].includes(call.type)), false);
  trashed.__resolveWrite({ ok: true, revision: 122 });
  assert.equal(await restoringTrash, true);
  assert.equal(trashed.__calls.at(-1).message, 'Restored 3 items from Trash to 2 destinations');

  const i18n = readI18n();
  for (const key of [
    'archive.restoredItemsTo', 'archive.restoredItemsToMany',
    'trash.restoredItemsTo', 'trash.restoredItemsToMany',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  assert.equal(i18n['zh-TW']['archive.restoredItemsTo'], '已將 {count} 個項目復原到 {destination}');
  assert.equal(i18n['zh-TW']['archive.restoredItemsToMany'], '已將 {count} 個項目復原到 {destinationCount} 個位置');
  assert.equal(i18n['zh-TW']['trash.restoredItemsTo'], '已將垃圾桶內的 {count} 個項目復原到 {destination}');
  assert.equal(i18n['zh-TW']['trash.restoredItemsToMany'], '已將垃圾桶內的 {count} 個項目復原到 {destinationCount} 個位置');

  const archiveRender = archivePageSource();
  assert.match(archiveRender,
    /containsArchivedLocalItem[\s\S]*?createArchivedLocalItemBatchRestoreContext\(selectedEntries, 'archive'\)[\s\S]*?showRoutes\(view\.selectedReview, 'library\.destinationPath', archivedLocalItemRestoreDestinationText\)/,
    'Archive local-item-only selection must own its one/many destination review');
  assert.match(archiveRender,
    /commitArchivedLocalItemBatchRestore\(selectedRestoreReview, restoreSelected\)[\s\S]*?changed = !!\(await write\(\)\);[\s\S]*?if \(changed\) requestAnimationFrame\(\(\) => focusArchivePageTarget\(nextKey, control\)\)/,
    'selected Archive local items must wait for one accepted receipt before focus continuation');

  const trashRender = archivePageSource();
  assert.match(trashRender,
    /containsArchivedLocalItem[\s\S]*?createTrashedLocalItemBatchRestoreContext\(selectedEntries\)[\s\S]*?showRoutes\(view\.selectedReview, 'library\.destinationPath'/,
    'Trash local-item-only selection must own its one/many destination review');
  assert.match(trashRender,
    /commitTrashedLocalItemBatchRestore\(selectedRestoreReview, restoreSelected\)[\s\S]*?changed = !!\(await write\(\)\);/,
    'selected Trash local items must wait for one accepted receipt before focus continuation');
  assert.match(css,
    /\[data-archived-local-item-batch-restore\]\[aria-busy="true"\][\s\S]*?animation:\s*return-marker-receipt-pulse/,
    'selected local-item Restore must reuse the established persistence receipt signal');
  // The Archive & Trash page (2026-11) carries the filing manifest in its dark
  // selection bar; at phone width the route list spans the full bar.
  assert.match(css,
    /\n\.arv-sel \{[^}]*position: relative;[\s\S]*?@container \(max-width: 640px\) \{[\s\S]*?\.arv-dests \{ position: static;[^}]*\}[\s\S]*?\.arv-dests > ul \{[^}]*width: min\(430px, 100%\);/,
    'the narrow filing manifest must anchor its route list inside the full selection strip');
  assert.match(css,
    /--arv-sel: color-mix\(in srgb, var\(--index-locator, var\(--accent\)\) 10%, var\(--today-card\)\);[\s\S]*?\.arv-row\.is-selected \{ background: var\(--arv-sel\); box-shadow: inset 3px 0 0 var\(--index-locator, var\(--accent\)\); \}/,
    'selected recovery rows must keep the filing edge while preserving readable destination and retention metadata');
  const metaRule = css.match(/\n\.arv-meta \{[^}]*\}/)?.[0] || '';
  // The metadata ink is --text2 leaned toward --text, so it reads at 4.5:1 on
  // a picked or hovered row in every theme (review finding R3-5).
  assert.ok(/display: block;/.test(metaRule) && /color: var\(--arv-ink-2\);/.test(metaRule) && !/nowrap|ellipsis/.test(metaRule)
    && /--arv-ink-2: color-mix\(in srgb, var\(--text2\) \d+%, var\(--text\)\);/.test(css)
    && /\.arv-meta \.archive-restore-destination \{ overflow-wrap: anywhere; \}/.test(css),
  'exact Restore destinations must wrap without clipping while other recovery metadata stays compact');
  // The Local and retention trust cards were hidden by the 2026-11 canvas layer
  // and are gone with the summary; their evidence stays as each page's
  // description for assistive technology, and every Trash row keeps its days.
  assert.match(source,
    /root\.querySelector\('#archive-sub'\)\.textContent = tr\(trash \? 'trash\.subtitle' : 'archive\.subtitle'\);/,
    'the browser-profile and 30-day evidence stays as the page description');
  assert.match(css,
    /\.arv-days\.is-soon \{ background: var\(--today-when-soft\); color: var\(--today-when-soft-text\); \}/,
    'a Trash entry close to deletion is marked in the orange of "when", on its readable soft pair');
  for (const theme of ['folio', 'folio-dark']) {
    const locator = themeHexToken(theme, 'locator');
    const card = themeHexToken(theme, 'card');
    const text = themeHexToken(theme, 'text');
    const text2 = themeHexToken(theme, 'text2');
    const selectedBackground = mixSrgb(locator, card, 0.1);
    assert.ok(contrastRatio(text, selectedBackground) >= 4.5,
      `${theme} selected recovery title must retain 4.5:1 contrast`);
    assert.ok(contrastRatio(text2, selectedBackground) >= 4.5,
      `${theme} selected recovery destination and retention metadata must retain 4.5:1 contrast`);
    assert.ok(contrastRatio(text2, card) >= 4.5,
      `${theme} recovery metadata on a hovered row must retain 4.5:1 contrast`);
  }
  assert.ok(contrastRatio(themeHexToken('folio', 'when-soft-text'), themeHexToken('folio', 'when-soft')) >= 4.5,
    'folio days-left pill must retain 4.5:1 contrast');
}

(async () => {
  testFilteredReadLaterLedger();
  testRecoveryRowActionsAreExplicit();
  testRecoveryActionsRequireTheSameVisibleSave();
  testVisibleActionsShareOneExactRecoveryBoundary();
  testLibraryRouteStateNeverWritesDurableStorage();
  testLibraryDetailRouteRequiresAUniqueVisibleRow();
  testLibraryQueryCompositionIsStable();
  testReadLaterRendersOneLedger();
  testLedgerPresentationKeepsRecoveryContextReachable();
  testLedgerCopyIsLocalizedInEnglishAndTaiwanChinese();
  await testSavedTabReturnMarkersWaitForAcceptedStorage();
  await testSavedPageArchiveWaitsForAcceptedStorage();
  await testBoardLocalArchiveSharesAcceptedStorageBoundary();
  await testArchivedPageRestoreShowsAndKeepsExactDestination();
  testCompactSavedPageRestoreUsesCanonicalReview();
  await testSelectedSavedPagesRestoreAfterOneReceipt();
  await testTrashedSavedPagesRestoreAfterOneReceipt();
  await testArchivedGroupRestoreWaitsForOneReceipt();
  await testArchivedLocalItemRestoreWaitsForOneReceipt();
  await testSelectedGroupsRestoreAfterOneReceipt();
  await testSelectedLocalItemsRestoreAfterOneReceipt();
  console.log('Library recovery ledger contract passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
