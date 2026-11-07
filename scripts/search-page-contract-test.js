'use strict';

// Find again and the command palette, 2026-11 page board (Search.dc.html,
// Palette.dc.html): operators marked in the field, matched words marked in the
// results, a rolling count, a gliding highlight, one empty-state action, a large
// library that stays responsive; the palette's scale-in, sliding highlight, why
// a row matched, and the one-floating-layer rule. Production slices run in
// node:vm; the rest are source and stylesheet contracts.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
// Values made inside node:vm come from another realm; compare their JSON shape.
const plain = value => (value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value);
const eq = (actual, expected, message) => { assert.deepEqual(plain(actual), plain(expected), message); checks += 1; };

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} must be implemented in production source`);
  const declarationStart = source.slice(Math.max(0, start - 6), start) === 'async ' ? start - 6 : start;
  const parameterOpen = source.indexOf('(', start + `function ${name}`.length);
  let parameterDepth = 0;
  let parameterClose = -1;
  for (let index = parameterOpen; index < source.length; index += 1) {
    if (source[index] === '(') parameterDepth += 1;
    if (source[index] === ')' && --parameterDepth === 0) { parameterClose = index; break; }
  }
  const bodyStart = source.indexOf('{', parameterClose + 1);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = bodyStart; index < source.length; index += 1) {
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
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(declarationStart, index + 1);
  }
  assert.fail(`${name} must have a complete body`);
}

function extractBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker} must remain extractable`);
  return source.slice(start, end);
}

const esc = value => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function load(names, context = {}, extra = '') {
  const sandbox = vm.createContext({ esc, URL, ...context });
  const code = `${extra}\n${names.map(extractFunction).join('\n')}\nglobalThis.__fns = { ${names.join(', ')} };`;
  vm.runInContext(code, sandbox, { filename: 'search-page-slice.js' });
  return { fns: sandbox.__fns, sandbox };
}

const searchConstants = extractBetween('const SEARCH_COLORS =', '\nfunction parseSearchQuery(');
const layerStart = css.indexOf('FIND AGAIN AND THE COMMAND PALETTE (2026-11 canvas)');
const layer = css.slice(layerStart);

function testOperatorMirror() {
  const { fns } = load(['searchQueryMarks']);
  const text = 'Quota In:Locus -is:done type:note "a b" -"x y" tag:t site:x url:y colour:red is:open plain -word';
  const marks = fns.searchQueryMarks(text).map(mark => [text.slice(mark.start, mark.end), mark.kind]);
  eq(marks, [
    ['In:Locus', 'where'], ['-is:done', 'not'], ['type:note', 'type'], ['-"x y"', 'not'], ['tag:t', 'where'],
    ['site:x', 'where'], ['url:y', 'where'], ['colour:red', 'type'], ['is:open', 'done'], ['-word', 'not'],
  ], 'the field marks every operator the shared parser understands, at its own place in the text (case kept): where in blue, is: in green, type: and colour: in grey, a minus struck through; words and quoted phrases stay plain');
  eq(fns.searchQueryMarks('in: -'), [], 'an operator with no value yet and a lone minus are not marked');
  const mirror = extractFunction('paintSearchQueryMirror');
  ok(/line\.className = 'fnd-mirror-line';[\s\S]*mirror\.replaceChildren\(line\)/.test(mirror), 'the mirror draws one inline line, so the spaces between two marks are kept (lesson: input mirror drift)');
  ok(/const key = `\$\{mark\.kind\}:\$\{perKind\[mark\.kind\]\}`;/.test(mirror), 'a mark animates only when it is new, not on every character typed into it (keyed by kind and order, not by text)');
  ok(/mirror\.scrollLeft = input\.scrollLeft;/.test(mirror), 'the mirror follows the field\'s horizontal scroll');
}

function testHitMarks() {
  const { fns } = load(['hitRangesMarkup', 'searchHitMarkup']);
  eq(fns.searchHitMarkup('Chrome storage <quota>', ['quota', 'storage']),
    'Chrome <mark class="fnd-hit">storage</mark> &lt;<mark class="fnd-hit">quota</mark>&gt;', 'every matched word is marked, case-insensitively, and the rest stays escaped');
  eq(fns.searchHitMarkup('quotas quota', ['quota']), '<mark class="fnd-hit">quota</mark>s <mark class="fnd-hit">quota</mark>', 'every occurrence is marked');
  eq(fns.searchHitMarkup('abcdef', ['bcd', 'cde']), 'a<mark class="fnd-hit">bcde</mark>f', 'overlapping matches merge into one mark');
  eq(fns.searchHitMarkup('İstanbul guide', ['guide']), 'İstanbul guide', 'text whose lowercase changes length stays unmarked rather than mismarked');
  eq(fns.searchHitMarkup('<b>', []), '&lt;b&gt;', 'no words: escaped text only');
  eq(fns.hitRangesMarkup('Keyboard', [[0, 1], [1, 2], [4, 5]], 'pal-hit'), '<mark class="pal-hit">Ke</mark>yb<mark class="pal-hit">o</mark>ard', 'touching ranges merge; the palette uses its own mark class');
}

function testSnippet() {
  const { fns } = load(['_searchPlainHtml', '_searchNoteParts', 'hitRangesMarkup', 'searchHitMarkup', 'searchResultSnippet']);
  const note = { type: 'note', html: '<p>Quota note</p><p>Quota is 10 MB; warn at 80% and offer export first.</p>' };
  eq(fns.searchResultSnippet(note, ['export']), 'Quota is 10 MB; warn at 80% and offer <mark class="fnd-hit">export</mark> first.', 'a note shows the line where the words matched, marked');
  eq(fns.searchResultSnippet(note, ['zzz']), '', 'no line when the words did not match the note text');
  eq(fns.searchResultSnippet({ type: 'tab', title: 'x', notes: '' }, ['x']), '', 'no line for a page without notes');
  const long = { type: 'tab', notes: `<p>${'word '.repeat(30)}needle tail</p>` };
  ok(fns.searchResultSnippet(long, ['needle']).startsWith('…'), 'a match deep in long notes starts the line near it, after an ellipsis');
}

function testPlainTextMemo() {
  const { fns } = load(['_searchPlainHtml']);
  eq(fns._searchPlainHtml('<p>a&nbsp;b<br>c</p>'), 'a b c', 'notes read as plain text');
  eq(fns._searchPlainHtml('<p>a&nbsp;b<br>c</p>'), 'a b c', 'a remembered note reads the same');
  fns._searchPlainHtml.cache.set('<p>remembered</p>', 'from memory');
  eq(fns._searchPlainHtml('<p>remembered</p>'), 'from memory', 'an unchanged note is read from memory instead of re-parsing its html on every keystroke');
  eq(fns._searchPlainHtml('<p>edited</p>'), 'edited', 'an edited note is a new key, never stale');
  eq(fns._searchPlainHtml(''), '', 'empty notes stay empty');
  for (let index = 0; index < 5100; index += 1) fns._searchPlainHtml(`<i>${index}</i>`);
  ok(fns._searchPlainHtml.cache.size <= 5000, 'the remembered text is bounded');
}

function testScoringOnce() {
  let scoreCalls = 0;
  const items = Array.from({ length: 60 }, (_, index) => ({
    id: `i${index}`, type: 'tab', title: index % 3 ? `quota guide ${index}` : `other ${index}`, url: `https://x${index}.example/quota`, createdAt: index,
  }));
  const ws = { id: 'w', categories: [{ id: 'c', name: 'Space', groups: [{ id: 'g', name: 'Group', items }] }] };
  const names = ['collectWorkspaceItems', 'parseSearchQuery', '_searchPlainHtml', '_searchNoteParts', '_searchItemTitle', '_searchItemBlob', 'searchItemMatches', '_searchTimeCutoff', '_searchScore', '_searchRowsForState'];
  const { fns, sandbox } = load(names, { activeWs: () => ws, tr: key => key, dispUrl: value => value }, searchConstants);
  const realScore = fns._searchScore;
  vm.runInContext('const __real = _searchScore; _searchScore = function () { globalThis.__scoreCalls = (globalThis.__scoreCalls || 0) + 1; return __real.apply(this, arguments); };', sandbox);
  const state = { query: 'quota guide', type: 'all', spaceId: 'all', time: 'any', hasTags: false, tag: '', sort: 'best' };
  const rows = fns._searchRowsForState(state);
  scoreCalls = sandbox.__scoreCalls;
  eq(scoreCalls, rows.length, 'each matching row is scored once per search, not on every comparison of the sort');
  const reference = rows.slice().sort((a, b) => realScore(b, state.query) - realScore(a, state.query));
  eq(rows.map(row => row.item.id), reference.map(row => row.item.id), 'the order is the same best-match order as before');
  ok(/const parsed = state\.query \? parseSearchQuery\(state\.query\) : null;[\s\S]*searchItemMatches\(row, state\.query, parsed\)/.test(extractFunction('_searchRowsForState')), 'the query is parsed once per search, not once per saved item');
}

function testEmptyCopy() {
  const names = ['parseSearchQuery', 'searchEmptyCopy'];
  const tr = (key, values = {}) => `${key}${Object.keys(values).length ? JSON.stringify(values) : ''}`;
  const { fns } = load(names, { tr }, searchConstants);
  const ws = { categories: [
    { id: 's1', name: 'Research', groups: [{ name: 'Storage' }] },
    { id: 's2', name: 'Kyoto trip', groups: [{ name: 'Getting around' }] },
  ] };
  const base = { type: 'all', spaceId: 'all', time: 'any', hasTags: false, tag: '' };
  eq(fns.searchEmptyCopy({ ...base, query: 'zzz' }, ws), { title: 'empty.searchTitle{"query":"zzz"}', scoped: false }, 'no scope: "No results for “words”"');
  eq(fns.searchEmptyCopy({ ...base, query: 'rail pass in:kyoto' }, ws), { title: 'search.noResultsIn{"query":"rail pass","scope":"Kyoto trip"}', scoped: true }, 'an in: scope is named by the Space or Group it matches');
  eq(fns.searchEmptyCopy({ ...base, query: 'x in:getting' }, ws).title, 'search.noResultsIn{"query":"x","scope":"Getting around"}', 'a Group name scopes too');
  eq(fns.searchEmptyCopy({ ...base, query: '', spaceId: 's1' }, ws), { title: 'search.nothingIn{"scope":"Research"}', scoped: true }, 'a Space filter with no words: "Nothing in Space" (never empty quotes)');
  eq(fns.searchEmptyCopy({ ...base, query: 'type:stack' }, ws), { title: 'empty.noMatchTitle', scoped: false }, 'operators only, no scope: "Nothing matches these filters" (never empty quotes)');
  const render = extractFunction('renderSearchSurface');
  ok(/const action = copy\.scoped\s*\? \{ label: tr\('empty\.searchAllSpaces'\), run: searchAllSpaces \}\s*: \{ label: tr\(filtersActive \? 'empty\.clearFilters' : 'empty\.clearSearch'\)/.test(render), 'the empty state offers one next step: Search all spaces when scoped, else Clear filters, else Clear search');
  ok(/buildLibraryEmpty\(\{ icon: librarySvg\('search', 26, 1\.5\), title: copy\.title, actions: \[action\] \}\)/.test(render), 'the no-result state has one action and no helper paragraph');
  ok(/query: state\.query\.replace\(\/\(\^\|\\s\)in:\\S\+\/gi, ' '\)[\s\S]*spaceId: 'all'/.test(render), 'Search all spaces drops the in: scope and the Space filter, keeping the words');
}

function testQueryKeys() {
  const calls = { set: [], closes: 0 };
  const { fns } = load(['handleSearchQueryKeydown'], {
    _searchSet(patch, focus) { calls.set.push([patch, focus]); },
    closeSearchSurface() { calls.closes += 1; },
    _searchMoveSelection() {},
    searchRecoveryContextForActivation() { return null; },
    _searchOpenPrimary() { return true; },
  });
  const event = value => ({ key: 'Escape', keyCode: 27, isComposing: false, currentTarget: { value }, preventDefault() {}, stopPropagation() {} });
  fns.handleSearchQueryKeydown(event('quota'), {}, {});
  eq(JSON.parse(JSON.stringify(calls)), { set: [[{ query: '', selectedId: null }, 'search-surface-input']], closes: 0 }, 'Escape in a field with text clears the query and keeps the page (as the Library filter does)');
  fns.handleSearchQueryKeydown(event(''), {}, {});
  eq(calls.closes, 1, 'Escape in an empty field still leaves Find again');
}

function testGlide() {
  const classes = new Set();
  const glide = {
    offsetWidth: 1,
    props: {},
    classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
    style: { setProperty(name, value) { glide.props[name] = value; } },
  };
  const seen = [];
  const realAdd = glide.classList.add;
  glide.classList.add = name => { seen.push(`+${name}`); realAdd(name); };
  const realRemove = glide.classList.remove;
  glide.classList.remove = name => { seen.push(`-${name}`); realRemove(name); };
  const { fns } = load(['placeRowGlide']);
  fns.placeRowGlide(glide, { isConnected: true, offsetTop: 70, offsetHeight: 64 });
  eq(seen, ['+is-jump', '-is-jump', '+is-on'], 'the highlight appears in place on its first row (no glide from the top)');
  eq(glide.props, { '--glide-y': '70px', '--glide-h': '64px' }, 'it sits on the row');
  seen.length = 0;
  fns.placeRowGlide(glide, { isConnected: true, offsetTop: 134, offsetHeight: 86 });
  eq(seen, ['+is-on'], 'then it glides from row to row');
  eq(glide.props['--glide-y'], '134px', 'to the next row');
  fns.placeRowGlide(glide, null);
  ok(!classes.has('is-on'), 'with no row it fades out');
}

function testPaletteMatches() {
  const tr = key => key;
  const { fns } = load(['_palLetters', 'hitRangesMarkup', 'searchHitMarkup', 'parseSearchQuery', '_palMatchMarkup', '_palCapLabel'], { tr }, searchConstants);
  eq(fns._palMatchMarkup({ label: 'Space: Kyoto trip' }, 'kyo').label, 'Space: <mark class="pal-hit">Kyo</mark>to trip', 'the typed text is marked inside the label');
  eq(fns._palMatchMarkup({ label: 'Keyboard shortcuts' }, 'kbs').label, '<mark class="pal-hit">K</mark>ey<mark class="pal-hit">b</mark>oard <mark class="pal-hit">s</mark>hortcuts', 'else the label letters it matched, in order');
  const via = fns._palMatchMarkup({ label: 'Import from browser', desc: 'Import bookmarks into the active space' }, 'bookm');
  eq(via, { label: 'Import from browser', via: '<mark class="pal-hit">bookm</mark>arks' }, 'a match in the description shows the word it used beside the label');
  ok(fns._palMatchMarkup({ label: 'Settings', keywords: 'alpha beta gamma delta' }, 'abgd').via.split('<mark').length - 1 <= 4, 'the words shown beside the label are capped');
  eq(fns._palMatchMarkup({ id: 'search-board-fallback', label: 'Search Locus for “kyo”' }, 'kyo').label, 'Search Locus for “kyo”', 'the search fallback row is never marked');
  eq(fns._palMatchMarkup({ section: 'recent', label: 'Kyoto rail pass' }, 'rail kyoto').label, '<mark class="fnd-hit">Kyoto</mark> <mark class="fnd-hit">rail</mark> pass', 'a saved link marks the query\'s words, as Find again does (any order)');
  eq(fns._palMatchMarkup({ label: 'Inbox' }, ''), { label: 'Inbox', via: '' }, 'no query, no marks');
  eq(['quick', 'go', 'shortcuts', 'more', 'recent'].map(section => fns._palCapLabel({ section, id: 'x' })), ['palette.run', 'palette.open', 'palette.open', 'palette.open', 'palette.open'], 'quick actions run; places and pages open');
  eq([fns._palCapLabel({ section: 'shortcuts', id: 'toggle-sidebar' }), fns._palCapLabel({ section: 'more', id: 'layout-list' })], ['palette.run', 'palette.run'], 'toggling the sidebar and switching layout run');
}

function paletteHarness({ detailOpen = false, detailCloses = true, drawerOpen = false } = {}) {
  const calls = [];
  const classes = new Set(['hidden']);
  const boxClasses = new Set();
  const box = { offsetWidth: 1, classList: { remove: name => { calls.push(`box-${name}`); boxClasses.delete(name); }, add: name => { calls.push(`box+${name}`); boxClasses.add(name); } } };
  const input = { value: 'stale', focus() { calls.push('focus'); } };
  const ov = {
    classList: { contains: name => classes.has(name), remove: name => classes.delete(name), add: name => classes.add(name) },
    querySelector(selector) { return selector === '.cmdp-box' ? box : selector === '#cmdp-input' ? input : null; },
  };
  const detail = { dataset: { returnItemId: 'item-7', returnFocusKey: '' }, classList: { contains: name => name === 'open' && detailOpen } };
  const { fns, sandbox } = load(['openCommandPalette'], {
    document: { getElementById: id => (id === 'item-detail' ? detail : null) },
    closeItemDetail() { calls.push('close-details'); if (detailCloses) detailOpen = false; return detailCloses; },
    restoreItemDetailFocus(root, itemId) { calls.push(`return-focus:${itemId}`); },
    hideContextMenu() { calls.push('hide-menu'); },
    isTodayTabsDrawerOpen: () => drawerOpen,
    setTodayTabsDrawer(open, options) { calls.push(`drawer:${open}:${options.restoreFocus}`); },
    _palEnsureDom: () => ov,
    _palSyncLocale() {},
    rememberOpener() { calls.push('remember'); },
    buildPaletteCommands: () => [],
    _palRender(query) { calls.push(`render:${query}`); },
    setTimeout(callback) { callback(); },
  }, 'let _palState = null;');
  return { fns, sandbox, calls, classes, boxClasses, input };
}

function testPaletteLayer() {
  let h = paletteHarness({ detailOpen: true, detailCloses: false });
  eq(h.fns.openCommandPalette(), false, 'Details that cannot close yet (a write is pending) keeps the palette shut');
  eq(h.calls, ['close-details'], 'and nothing else happens');
  ok(h.classes.has('hidden'), 'the palette stays hidden');
  h = paletteHarness({ detailOpen: true, drawerOpen: true });
  eq(h.fns.openCommandPalette(), true, 'the palette opens over any page');
  eq(h.calls, ['close-details', 'return-focus:item-7', 'hide-menu', 'drawer:false:false', 'remember', 'box-is-in', 'box+is-in', 'render:', 'focus'], 'one floating layer: Details (its focus handed back first, so the palette remembers that place), an open menu and the Today drawer give way; then the box scales in (class restarted), the list renders and the field takes focus');
  ok(!h.classes.has('hidden') && h.boxClasses.has('is-in') && h.input.value === '', 'it shows with an empty query');
  h.calls.length = 0;
  h.fns.openCommandPalette();
  ok(!h.calls.includes('remember') && !h.calls.includes('box+is-in'), 'opening it again while open neither replaces the opener nor replays the scale-in');
  const render = extractFunction('renderItemDetail');
  ok(/if \(!wasOpen\) \{\s*hideContextMenu\(\);\s*closeCommandPalette\(\);/.test(render), 'the reverse: Details opening closes the palette');
  const open = extractFunction('openSearchSurface');
  ok(/if \(typeof hideContextMenu === 'function'\) hideContextMenu\(\);[\s\S]*Router\.navigate\(\{ type: 'search'/.test(open), 'opening Find again closes an open menu; leaving the page closes Details and the Today drawer');
}

function testPaletteHome() {
  const sections = [];
  const listEl = { className: '', appendChild(node) { sections.push(node); } };
  const tr = key => key;
  const commands = [
    { id: 'save-tab', section: 'quick' }, { id: 'home', section: 'go' }, { id: 'favorites', section: 'go', home: false },
    { id: 'help', section: 'shortcuts' }, { id: 'layout-list', section: 'more', home: false },
  ];
  const { fns, sandbox } = load(['_palRenderHome', '_palRenderResults'], {
    tr,
    _palSection: (title, list) => ({ title, ids: list.map(command => command.id) }),
  }, 'let _palState = null;');
  vm.runInContext(`_palState = { cmds: ${JSON.stringify(commands)}, filtered: [], noMatch: false };`, sandbox);
  fns._palRenderHome(listEl);
  eq(sections, [
    { title: 'palette.quickActions', ids: ['save-tab'] },
    { title: 'palette.goTo', ids: ['home'] },
    { title: 'palette.shortcuts', ids: ['help'] },
  ], 'one column of sections as on the board; Recently saved is left out when nothing is saved (no helper line), and Favorites, Archive, Trash and the rest stay reachable by typing');
  eq(listEl.className, 'cmdp-list cmdp-home', 'the home list is one column');
  sections.length = 0;
  vm.runInContext('_palState.noMatch = true;', sandbox);
  fns._palRenderResults(listEl, [{ id: 'search-board-fallback' }]);
  eq(sections, [{ title: 'palette.nothingMatches', ids: ['search-board-fallback'] }], 'no match: the section says so and the search fallback is the one row (no helper paragraph)');
  const build = extractFunction('buildPaletteCommands');
  for (const id of ['save-tab', 'create-note', 'new-space', 'save-window', 'import-bookmarks', 'home', 'inbox', 'calendar', 'read-later', 'all-links', 'favorites', 'archive', 'trash', 'toggle-sidebar', 'focus-search', 'shortcut-help', 'settings', 'tools']) {
    ok(build.includes(`id: '${id}'`), `every command the palette offered stays in it: ${id}`);
  }
  ok(/layout-\$\{m\}[\s\S]*workspace-\$\{w\.id\}[\s\S]*space-\$\{c\.id\}[\s\S]*group-\$\{g\.id\}[\s\S]*settings-\$\{section\.id\}/.test(build), 'the layout, workspace, Space, group and Settings-section commands stay');
  const sync = extractFunction('_palSyncSel');
  ok(/placeRowGlide\(document\.querySelector\('#cmdp-list \.pal-glide'\), sel\)/.test(sync), 'the highlight slides to the selected row');
  ok(/if \(reveal && sel\.scrollIntoView\) sel\.scrollIntoView\(\{ block: 'nearest' \}\)/.test(sync), 'arrow keys keep the selected row in view; the pointer does not scroll the list');
  const row = extractFunction('_palRow');
  ok(/row\.tabIndex = -1;[\s\S]*setAttribute\('role', 'option'\)/.test(row), 'options stay out of the Tab order (the field owns the arrow keys, as a combobox)');
  ok(/row\.addEventListener\('pointermove'/.test(row) && !/mouseenter|mouseover|pointerover/.test(row), 'only a moving pointer selects a row: a list that opens or repaints under a resting pointer keeps its first row for Enter');
  ok(/<span class="pal-cap" aria-hidden="true">\$\{esc\(_palCapLabel\(command\)\)\}<kbd>↵<\/kbd><\/span>/.test(row), 'the selected row shows what Enter does');
  ok(!/palette\.(?:footer|recentEmpty|noMatch)'/.test(source), 'the footer hint, the empty Recently saved line and the no-match paragraph are gone');
  const run = extractFunction('_palRun');
  ok(/closeCommandPalette\(\);\s*try \{\s*const result = command\.run\(\);/.test(run), 'running a command closes the palette, then runs it; a command that confirms does so with the shared toast');
  ok(!/toast\(tr\('palette\./.test(source.slice(source.indexOf('function _palEnsureDom('), source.indexOf('function toggleSelectMode('))), 'the palette adds no confirmation of its own (one toast style)');
}

function testRenderContracts() {
  const render = extractFunction('renderSearchSurface');
  ok(/let page = searchPageRoot\(\);\s*const firstShow = !page \|\| page\.dataset\.wsId !== ws\.id;/.test(render), 'the page root stays across repaints of the same workspace (the field keeps its caret)');
  ok(/if \(input\.value !== state\.query && input\.dataset\.searchComposing !== 'true'\) input\.value = state\.query;/.test(render), 'a query changed elsewhere reaches the field, never during an IME composition');
  ok(/if \(session\.count !== rows\.length \|\| !countNum\.firstChild\) \{\s*countNum\.innerHTML = libraryRollMarkup\(rows\.length, session\.count\);/.test(render), 'the result count rolls to its new value (the shared roll)');
  ok(/typeTabs\.style\.setProperty\('--fnd-i', String\(Math\.max\(0, SEARCH_TYPE_ORDER\.indexOf\(state\.type\)\)\)\);/.test(render), 'the type pill slides to the pressed type');
  ok(/rows = state\.type === 'all' \? baseRows : baseRows\.filter\(row => row\.item\.type === state\.type\);/.test(render), 'the search runs once per repaint; the type filter reuses its rows');
  ok(/const firstPart = Math\.min\(visibleRows\.length, Math\.max\(SEARCH_FIRST_PAINT_ROWS, selectedIndex \+ 1\)\);/.test(render), 'the rows on screen and the selected row are built at once');
  ok(/const token = session\.restToken;[\s\S]*if \(session\.restToken !== token \|\| searchPageSession !== session \|\| !list\.isConnected\) return;[\s\S]*requestAnimationFrame\(rest\);\s*setTimeout\(rest, 60\);/.test(render), 'the rest of the result window follows on the next frame and is dropped when a newer repaint superseded it');
  ok(/session\.restToken = \(session\.restToken \|\| 0\) \+ 1;\s*list\.replaceChildren\(\);/.test(render), 'every repaint supersedes rows still waiting');
  ok(/list\.classList\.toggle\('is-fresh', queryChanged\);/.test(render), 'matched words animate in only when the query changed');
  ok(/if \(viewChanged && index < 12\) \{\s*node\.classList\.add\('is-rise'\);/.test(render), 'rows rise when the type, filters or sort change');
  ok(/else if \(!firstShow && board\.scrollTop !== keepScroll\) board\.scrollTo\(\{ top: keepScroll, behavior: 'instant' \}\);/.test(render), 'a repaint keeps the reader\'s place (lesson: class toggle clamps scroll)');
  const board = extractFunction('renderBoard');
  ok(/'read-later-mode', 'plan-mode'\);\s*\/\/ [^\n]*\n\s*if \(!activeSearch\) document\.getElementById\('board'\)\.classList\.remove\('search-mode'\);/.test(board), 'renderBoard keeps the Search page mark through its own repaint');
  ok(/if \(searchPageSession && !activeSearch\) searchPageSession = null;/.test(board), 'leaving Find again ends its page memory');
  const rowFn = extractFunction('_searchResultRow');
  ok(/<span class="fnd-cap" aria-hidden="true">\$\{esc\(tr\(canOpen \? 'search\.open' : 'search\.details'\)\)\}<kbd>↵<\/kbd><\/span>/.test(rowFn), 'the selected row shows what Enter does: Open for a page, Details for anything else');
  ok(/searchHitMarkup\(title, needles\)[\s\S]*searchHitMarkup\(host, needles\)/.test(rowFn), 'matched words are marked in the title and the source');
  ok(/class="fnd-meta-when" aria-hidden="true"/.test(rowFn), 'the age repeats on the meta line for phone width, hidden from assistive tech');
}

function testStylesheet() {
  ok(layerStart > 0, 'the Find again and palette layer is present');
  ok(!/(?:linear|radial|conic)-gradient\s*\(/.test(layer), 'no gradients (the soft edge behind the row actions is a shadow)');
  const durations = [...layer.matchAll(/(?<![\w-])(\d*\.?\d+)s\b/g)].map(match => Number(match[1])).filter(value => value > 0);
  ok(durations.every(value => value >= 0.12 && value <= 0.32), `motion runs 120–320 ms (found ${[...new Set(durations)].join(', ')} s)`);
  ok(!/infinite/.test(layer), 'nothing loops');
  ok(/\.search-result-row\.fnd-row \{ content-visibility: auto; contain-intrinsic-size: auto 64px; \}/.test(layer), 'a long result list lays out only the rows on screen');
  for (const [selector, size] of [['.fnd-clear', 'width: 44px;\n  height: 44px'], ['.fnd-seg-btn', 'height: 44px'], ['.fnd-chip', 'height: 44px'], ['.fnd-details', 'height: 44px'], ['.fnd-reset', 'min-height: 44px'], ['.search-sort', 'min-height: 44px'], ['.cmdp-row', 'min-height: 44px']]) {
    ok(new RegExp(`${selector.replace(/\./g, '\\.')} \\{[^}]*${size.replace(/\n/g, '\\n')}`).test(layer), `${selector} is a 44 px target`);
  }
  ok(/#search-surface-input \{[^}]*color: transparent;\s*caret-color: var\(--text\);/.test(layer) && /\.fnd-mirror \{[^}]*white-space: pre;[^}]*pointer-events: none;/.test(layer), 'the field draws its text through the mirror and keeps its own caret');
  ok(/@media \(forced-colors: active\) \{[\s\S]*?\.fnd-mirror \{ display: none; \}\s*#search-surface-input \{ color: CanvasText; \}/.test(layer), 'forced colours show the field\'s own text');
  ok(/@media \(hover: hover\) \{\s*@container \(min-width: 641px\) \{\s*\.fnd-acts \{[^}]*position: absolute;[^}]*opacity: 0;/.test(layer), 'row actions float over the row only with a pointer on a wide page');
  ok(/@container \(max-width: 640px\) \{[\s\S]*?grid-template-areas: "fav title acts" "meta meta meta" "snip snip snip";/.test(layer), 'at phone width the title takes the row and the meta line runs under it');
  ok(/\.cmdp-box \{[^}]*width: min\(640px, 100%\);[^}]*height: min\(480px, calc\(100vh - 32px\)\);/.test(layer), 'the palette is 640 by 480 at most and fits a phone');
  ok(/\.cmdp-row\.sel \.pal-cap \{ opacity: 1; transform: translate\(0, -50%\); \}/.test(layer), 'the Run or Open key shows on the selected row');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n  \.fnd, \.fnd \*, \.fnd \*::before, \.fnd \*::after,\n  #cmd-palette, #cmd-palette \*, #cmd-palette \*::before, #cmd-palette \*::after \{ animation: none !important; transition: none !important; \}/.test(layer), 'reduced motion stops every animation on both surfaces');
}

function testStrings() {
  const i18nSource = extractBetween('const I18N = {', '\nfunction tr(');
  const context = vm.createContext({});
  vm.runInContext(`${i18nSource}\nglobalThis.__I18N = I18N;`, context);
  const { en, 'zh-TW': zh } = context.__I18N;
  for (const key of ['search.resultWordOne', 'search.resultWord', 'search.noResultsIn', 'search.nothingIn', 'palette.run', 'palette.open', 'palette.nothingMatches']) {
    ok(en[key] && zh[key], `${key} is in en and zh-TW`);
    eq((zh[key].match(/\{\w+\}/g) || []).sort(), (en[key].match(/\{\w+\}/g) || []).sort(), `${key} keeps its placeholders in zh-TW`);
  }
  for (const key of ['search.preview', 'search.selectResult', 'search.related', 'search.openPage', 'search.viewDetails', 'search.openUnavailable', 'search.hideFilters', 'empty.searchBody', 'palette.footer', 'palette.recentEmpty', 'palette.noMatch']) {
    ok(!(key in en) && !(key in zh), `${key} is gone with the control that used it`);
  }
}

// Finding R2-10: leaving Find again (or the Calendar) lands focus on a control
// on screen, never <body>, and never a text field.
function testLeaveFocus() {
  const make = ({ connected = true, rects = 1, field = false, hiddenParent = false, id = '' } = {}) => {
    const el = { id, isConnected: connected, focused: 0 };
    el.focus = () => { el.focused += 1; doc.activeElement = el; };
    el.matches = sel => field && /input/.test(sel);
    el.closest = () => (hiddenParent ? {} : null);
    el.getClientRects = () => ({ length: rects });
    return el;
  };
  // <body> takes focus() like any element; it must still never count.
  const body = { id: 'body', isConnected: true, getClientRects: () => ({ length: 1 }), matches: () => false, closest: () => null, focus() { doc.activeElement = body; } };
  const targets = {};
  const doc = {
    body,
    activeElement: body,
    querySelector: sel => targets[sel] || null,
    getElementById: id => targets[`#${id}`] || null,
  };
  const { fns } = load(['focusAfterSurfaceLeave'], { document: doc });
  const opener = make({ id: 'opener' });
  targets['#board h1[tabindex]'] = make({ id: 'heading' });
  targets['#topbar-search'] = make({ id: 'topbar' });
  targets['#sidebar :is(button, a).active'] = make({ id: 'rail' });
  ok(fns.focusAfterSurfaceLeave(opener) === true && doc.activeElement === opener, 'the control that opened the page takes focus back when it is still on screen (finding R2-10)');
  doc.activeElement = body;
  fns.focusAfterSurfaceLeave(make({ connected: false }));
  ok(doc.activeElement === targets['#board h1[tabindex]'], 'a gone opener gives way to the page\'s heading');
  doc.activeElement = body;
  fns.focusAfterSurfaceLeave(make({ field: true }));
  ok(doc.activeElement === targets['#board h1[tabindex]'], 'a text field never takes it (Ctrl+Z and Escape skip fields)');
  doc.activeElement = body;
  targets['#board h1[tabindex]'].focused = 0;
  fns.focusAfterSurfaceLeave(body);
  ok(targets['#board h1[tabindex]'].focused === 1, 'Search opened from <body> (/ with nothing focused) does not count <body> as its opener');
  delete targets['#board h1[tabindex]'];
  doc.activeElement = body;
  fns.focusAfterSurfaceLeave(null);
  ok(doc.activeElement === targets['#topbar-search'], 'Today has no heading on the board: the top bar\'s search takes it');
  targets['#topbar-search'] = make({ hiddenParent: true });
  doc.activeElement = body;
  fns.focusAfterSurfaceLeave(null);
  ok(doc.activeElement === targets['#sidebar :is(button, a).active'], 'else the rail\'s entry for the page');
  const kept = make({ id: 'kept' });
  doc.activeElement = kept;
  ok(fns.focusAfterSurfaceLeave(opener) === false && doc.activeElement === kept, 'a control that has focus keeps it');
  ok(/if \(Router\.navigate\(\{ type: 'home', wsId: ws\.id, query: \{\} \}, \{ persist: false \}\)\) focusAfterSurfaceLeave\(opener\);/.test(extractFunction('closeSearchSurface')), 'every way out of Find again (Escape in the field, on a row, or on the page) goes through it');
}

// Finding R2-13: the palette lists the openable links once per open, parses a
// query once per keystroke and stops at the seventh match.
function testPaletteLinkScan() {
  const counts = { lists: 0, parses: 0, matches: 0 };
  const rows = Array.from({ length: 30 }, (_, i) => ({ item: { id: `l${i}`, url: i === 3 ? 'chrome://x' : `https://e.example/${i}`, createdAt: i } }));
  counts.texts = 0;
  const { fns } = load(['_palMatchingLinks'], {
    collectWorkspaceTabs() { counts.lists += 1; return rows; },
    activeWs() { return {}; },
    isOpenableSavedTabUrl: url => url.startsWith('https:'),
    parseSearchQuery(q) { counts.parses += 1; return { q, pos: { text: q.startsWith('-') ? [] : q.split(' ').filter(Boolean) } }; },
    // A row's text, as the shared matcher builds it: every row holds "s" and
    // "st"; even rows hold "even".
    _searchItemBlob(row) { counts.texts += 1; return `page ${Number(row.item.id.slice(1)) % 2 ? 'odd' : 'even'} s st`; },
    landingLinkMatches(row, query, parsed) { counts.matches += 1; return parsed?.q === query && Number(row.item.id.slice(1)) % 2 === 0; },
    _palSavedLinkCommand: row => row.item.id,
  }, 'let _palState = { links: null, texts: null };');
  const seven = ['l28', 'l26', 'l24', 'l22', 'l20', 'l18', 'l16'];
  eq(fns._palMatchingLinks('s'), seven, 'seven matching openable links, newest first');
  eq(fns._palMatchingLinks('st'), seven, 'the same on the next keystroke');
  eq([counts.lists, counts.parses], [1, 2], 'the links are listed once per open; each keystroke parses its query once (finding R2-13)');
  eq(counts.matches, 28, 'the scan stops at the seventh match (14 rows a keystroke, not all 29)');
  eq(counts.texts, 14, 'a row\'s text is built once per open');
  eq(fns._palMatchingLinks('even'), seven, 'rows whose text lacks a word skip the full matcher');
  eq(counts.matches, 35, 'only the seven candidates ran the full matcher');
  eq([fns._palMatchingLinks('zzqx'), fns._palMatchingLinks('zzqxw')], [[], []], 'a word no row holds matches nothing');
  eq([counts.matches, counts.texts], [35, 29], 'and costs one text check a row, the full matcher none');
  eq(fns._palMatchingLinks('-odd'), seven, 'a query without plain words (operators, a minus) still runs the shared matcher on every row it needs');
  eq(fns._palMatchingLinks('   '), [], 'no query, no links');
  ok(/_palState = \{ cmds: buildPaletteCommands\(\), links: null, texts: null,/.test(extractFunction('openCommandPalette')) && /_palState\.cmds = buildPaletteCommands\(\);\n\s*_palState\.links = null;\n\s*_palState\.texts = null;/.test(extractFunction('_palRun')), 'a new open, or a refused link\'s rebuild, lists the links and their text again');
}

// Finding R2-6 and R2-18 in the stylesheet: the secondary ink and the Enter
// key on the selected row hold 4.5:1 in every bundled theme; the palette's
// field shows its focus.
function testInksAndFocus() {
  const share = /\.fnd,\n#cmd-palette \{ --fnd-ink-2: color-mix\(in srgb, var\(--text2\) (\d+)%, var\(--text\)\); \}/.exec(layer);
  ok(share, 'Find again and the palette declare one theme-aware secondary ink');
  ok(!/var\(--text2\)/.test(layer.replace(/--fnd-ink-2: [^;]*;/g, '')), 'no text on either surface uses the untuned --text2 (finding R2-6)');
  ok(/\.fnd-seg-btn \{[^}]*color: var\(--fnd-ink-2\);/.test(layer) && /\.fnd-cnt \{[^}]*color: var\(--fnd-ink-2\);/.test(layer), 'the unpressed content types and their counts use it');
  ok(/\.fnd-cap kbd,\n\.pal-cap kbd \{[^}]*background: transparent;\n\s*box-shadow: inset 0 0 0 1px color-mix\(in srgb, currentColor 55%, transparent\);/.test(layer), 'the Enter key is outlined, so its glyph reads as the label beside it');
  ok(/#cmdp-input:focus-visible \{ outline: none; \}\n\.cmdp-inputrow:has\(> #cmdp-input:focus-visible\) \{/.test(layer), 'the palette field shows its focus on its row (finding R2-18)');
  const parse = value => {
    const text = String(value || '').trim();
    let match = /^#([0-9a-f]{6})$/i.exec(text);
    if (match) return { r: parseInt(match[1].slice(0, 2), 16), g: parseInt(match[1].slice(2, 4), 16), b: parseInt(match[1].slice(4), 16), a: 1 };
    match = /^rgba?\(([^)]+)\)$/.exec(text);
    if (match) { const p = match[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    return null;
  };
  const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const mix = (a, part, b) => ({ r: a.r * part + b.r * (1 - part), g: a.g * part + b.g * (1 - part), b: a.b * part + b.b * (1 - part), a: 1 });
  const lum = ({ r, g, b }) => [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (fg, bg) => { const a = lum(fg); const b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  const capMix = Number(/\.fnd-cap,\n\.pal-cap \{[^}]*background: color-mix\(in srgb, var\(--accent-bg, var\(--accent\)\) (\d+)%, var\(--today-now\)\);/.exec(layer)?.[1]) / 100;
  ok(capMix > 0, 'the selected row\'s key keeps its fill');
  const themesCss = fs.readFileSync(path.join(root, 'themes.css'), 'utf8').replace(/\r\n/g, '\n');
  const fails = [];
  let themes = 0;
  for (const m of themesCss.matchAll(/\n\[data-theme="([\w-]+)"\] \{([^}]*)\}/g)) {
    themes += 1;
    const raw = {};
    for (const d of m[2].matchAll(/--([\w-]+):\s*([^;]+);/g)) raw[d[1]] = d[2].trim();
    const t = name => parse(raw[name]);
    const text = t('text');
    const card = t('card') || t('paper-strong') || t('panel');
    const ground = t('ground') || t('paper') || t('bg');
    const locator = t('locator') || t('accent');
    const ink = mix(t('text2'), Number(share[1]) / 100, text);
    const now = t('registry-card') || t('registry-bg') || text;
    const pairs = {
      'secondary on a card': [ink, card],
      'secondary on the type switch': [ink, over(t('card-rule') || t('border2'), ground)],
      'secondary on the highlight': [ink, mix(locator, 0.10, card)],
      'secondary on an icon tile': [ink, mix(text, 0.07, card)],
      'the Enter key': [t('accent-text') || parse('#ffffff'), mix(t('accent-bg') || t('accent'), capMix, now)],
    };
    for (const [name, [fg, bg]] of Object.entries(pairs)) {
      const value = contrast(fg, bg);
      if (value < 4.5) fails.push(`${m[1]}: ${name} ${value.toFixed(2)}`);
    }
  }
  eq(themes, 19, 'all 19 bundled themes are checked');
  eq(fails, [], 'every Find again and palette text pair is at least 4.5:1 in every bundled theme (finding R2-6)');
}

function testCi() {
  ok(/for f in [^\n]*scripts\/search-page-contract-test\.js/.test(workflow), 'CI syntax-checks this suite');
  ok(/run: node scripts\/search-page-contract-test\.js/.test(workflow), 'CI runs this suite');
}

testOperatorMirror();
testHitMarks();
testSnippet();
testPlainTextMemo();
testScoringOnce();
testEmptyCopy();
testQueryKeys();
testGlide();
testPaletteMatches();
testPaletteLayer();
testPaletteHome();
testRenderContracts();
testStylesheet();
testStrings();
testLeaveFocus();
testPaletteLinkScan();
testInksAndFocus();
testCi();

console.log(`Search page contracts passed: ${checks} checks (operators marked in the field, matched words, snippet, plain-text memo, scoring once, empty-state copy and one action, Escape, the gliding highlight, palette matches, one floating layer, palette home, render and stylesheet rules, strings, focus after leaving, the palette's link scan, inks in 19 themes and the field's focus, CI)`);
