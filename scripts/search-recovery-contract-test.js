'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

function extractBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker} must remain extractable`);
  return source.slice(start, end);
}

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
  assert.ok(parameterClose >= 0, `${name} must have a complete parameter list`);
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

const safeUrlSource = extractFunction('isOpenableSavedTabUrl');
const collectItemsSource = extractFunction('collectWorkspaceItems');
const searchConstantsSource = extractBetween('const SEARCH_COLORS =', '\nfunction parseSearchQuery(');
const parseSearchSource = extractFunction('parseSearchQuery');
const plainSearchHtmlSource = extractFunction('_searchPlainHtml');
const notePartsSource = extractFunction('_searchNoteParts');
const itemTitleSource = extractFunction('_searchItemTitle');
const itemBlobSource = extractFunction('_searchItemBlob');
const itemMatchesSource = extractFunction('searchItemMatches');
const timeCutoffSource = extractFunction('_searchTimeCutoff');
const searchScoreSource = extractFunction('_searchScore');
const rowsForStateSource = extractFunction('_searchRowsForState');
const collectTabsSource = extractFunction('collectWorkspaceTabs');
const landingLinkMatchesSource = extractFunction('landingLinkMatches');
const paletteMatchingLinksSource = extractFunction('_palMatchingLinks');
const paletteSavedLinkSource = extractFunction('_palSavedLinkCommand');
const homeTrailGroupNameSource = extractFunction('homeTrailGroupName');
const homeTrailPathPartsSource = extractFunction('homeTrailPathParts');
const homeTrailPathTextSource = extractFunction('homeTrailPathText');
const homeTrailDestinationContextSource = extractFunction('homeTrailDestinationContext');
const homeTrailDestinationStillMatchesSource = extractFunction('homeTrailDestinationStillMatches');
const organizationGroupTargetSource = extractFunction('organizationGroupTarget');
const identitySpaceTargetSource = extractFunction('identitySpaceTarget');
const identityGroupTargetSource = extractFunction('identityGroupTarget');
const createLandingInboxContextSource = extractFunction('createLandingInboxContext');
const resolveLandingInboxTargetSource = extractFunction('resolveLandingInboxTarget');
const openInboxViewSource = extractFunction('openInboxView');
const landingDestinationSource = extractFunction('landingResultDestinationText');
const valueFingerprintSource = extractFunction('itemDetailValueFingerprint');
const locationFingerprintSource = extractFunction('itemDetailLocationFingerprint');
const uniqueResolverSource = extractFunction('resolveUniqueHomePreviewItem');
const contextSource = extractFunction('createSavedItemRecoveryContext');
const resolveSource = extractFunction('resolveSavedItemRecoveryTarget');
const createSearchSource = extractFunction('createSearchRecoveryContext');
const resolveSearchSource = extractFunction('resolveSearchRecoveryTarget');
const matchSearchRowSource = extractFunction('searchRecoveryContextMatchesRow');
const resolveCurrentSearchSource = extractFunction('resolveCurrentSearchRecoveryTarget');
const canOpenSource = extractFunction('searchRecoveryCanOpen');
const pathPartsSource = extractFunction('searchRecoveryPathParts');
const pathTextSource = extractFunction('searchRecoveryLocationText');
const pathHtmlSource = extractFunction('searchRecoveryPathHtml');
const reportSource = extractFunction('reportSearchRecoveryUnavailable');
const cancelDetailsSource = extractFunction('cancelSearchItemDetailPreparation');
const searchDetailRouteSource = extractFunction('searchDetailRoute');
const openDetailsSource = extractFunction('_searchOpenDetails');
const openPrimarySource = extractFunction('_searchOpenPrimary');
const activationContextSource = extractFunction('searchRecoveryContextForActivation');
const queryKeydownSource = extractFunction('handleSearchQueryKeydown');
const ensureLiveRegionSource = extractFunction('ensureSearchLiveRegion');
const resetAnnouncementSource = extractFunction('resetSearchAnnouncement');
const announcementSignatureSource = extractFunction('searchAnnouncementSignature');
const announceStatusSource = extractFunction('announceSearchStatus');
const suspendRecoverySource = extractFunction('suspendSearchRecoveryActions');
const startCompositionSource = extractFunction('startSearchQueryComposition');
const queueInputSource = extractFunction('queueSearchQueryInput');
const endCompositionSource = extractFunction('endSearchQueryComposition');
const queueQuerySource = extractFunction('_searchQueueQuery');
const selectResultSource = extractFunction('_searchSelectResult');
const moveSelectionSource = extractFunction('_searchMoveSelection');
const bindResultSource = extractFunction('bindSearchResultActivation');
const resultRowSource = extractFunction('_searchResultRow');
const placeRowGlideSource = extractFunction('placeRowGlide');
const placeSearchGlideSource = extractFunction('placeSearchGlide');
const searchStateSource = extractFunction('searchStateFromQuery');
const searchRouteSource = extractFunction('searchRouteQuery');
const hiddenFilterCountSource = extractFunction('searchHiddenFilterCount');
const filtersActiveSource = extractFunction('searchFiltersActive');
const filterResetPatchSource = extractFunction('searchFilterResetPatch');
const syncQueryClearSource = extractFunction('syncSearchQueryClear');
const renderSearchSource = extractFunction('renderSearchSurface');
const reconcileSelectionSource = extractFunction('reconcileSearchSelection');
const closeDetailSource = extractFunction('closeItemDetail');
const restoreDetailFocusSource = extractFunction('restoreItemDetailFocus');
const routerParseSource = extractFunction('parse');
const routerBuildSource = extractFunction('build');
const routerApplySource = extractFunction('apply');
const searchPagingConstantsSource = extractBetween('const SEARCH_RESULT_BATCH_SIZE =', '\nfunction searchResultLimit(');
const searchResultLimitSource = extractFunction('searchResultLimit');
const searchVisibleRowsSource = extractFunction('searchVisibleRows');
const showNextBatchSource = extractFunction('showNextSearchResultBatch');
const searchSetSource = extractFunction('_searchSet');
const openSearchSurfaceSource = extractFunction('openSearchSurface');
const closeSearchSurfaceSource = extractFunction('closeSearchSurface');
const bindStaticSource = extractFunction('bindStatic');

assert.doesNotMatch(openPrimarySource, /chrome\.tabs\.create/, 'Search recovery must not bypass the shared opener');
assert.match(openPrimarySource, /resolveCurrentSearchRecoveryTarget[\s\S]*openSavedTabItem/, 'Search recovery must require settled current-result membership and exact identity before the shared opener');
assert.match(resolveCurrentSearchSource, /searchVisibleRows\(activeSearch\)/, 'direct recovery effects must share the current progressive result window');
assert.doesNotMatch(`${openPrimarySource}\n${resultRowSource}`, /State\.(?:snapshot|persist)/, 'opening a Search result must not directly mutate saved content');
assert.match(resultRowSource, /bindSearchResultActivation/, 'each result must use the shared pointer and keyboard activation binding');
assert.match(resultRowSource, /tabIndex = selected \? 0 : -1/, 'only the selected result must enter the Tab order');
assert.doesNotMatch(selectResultSource, /renderBoard|_searchSet/, 'selection must keep the row attached so a real double-click can complete');
assert.match(selectResultSource, /scrollIntoView\(\{ block: 'nearest' \}\)/, 'keyboard selection must keep its focused row visible');
assert.doesNotMatch(moveSelectionSource, /renderBoard|setTimeout/, 'arrow selection must update the mounted result list in place');
assert.match(moveSelectionSource, /_searchSelectResult/, 'arrow selection must share the in-place roving controller');
// 2026-11-06 (page board): the preview pane gave way to one card of rows. The
// title covers its row, so a click opens the result (the old click selected and
// a double click opened); Details sits on each openable row.
assert.match(bindResultSource, /addEventListener\('click'[\s\S]*_searchOpenPrimary[\s\S]*event\.key === 'Enter'[\s\S]*_searchOpenPrimary/, 'result click and keyboard activation must use the recovery controller');
assert.doesNotMatch(bindResultSource, /dblclick/, 'a single click opens a result now that its title covers the row');
assert.match(bindResultSource, /addEventListener\('focus'[\s\S]*_searchSelectResult/, 'focus (pointer or keyboard) must select a result in place');
assert.match(resultRowSource, /const canOpen = searchRecoveryCanOpen\(recoveryContext\)[\s\S]*canOpen \? `<button type="button" class="fnd-details">[\s\S]*_searchOpenDetails\(recoveryContext/, 'Details must sit beside Open only for pages that open, through the same recovery controller; anything else opens Details from its title');
assert.match(resultRowSource, /searchRecoveryPathHtml\(recoveryContext\)/, 'each result must show its real saved destination path');
assert.doesNotMatch(`${source}\n${css}`, /search-detail-related|search\.related|function _searchDetail\(/, 'the preview pane and its related-results list were replaced by the rows (the same results are in the list)');
assert.match(openDetailsSource, /searchDetailRoute\(activeSearch[\s\S]*persist: false[\s\S]*if \(!navigated\)/, 'View details must stay on Search and report refused navigation');
assert.match(routerApplySource, /route\.type === 'search'[\s\S]*searchVisibleRows\(next\)[\s\S]*resolveUniqueHomePreviewItem\(route\.wsId, next\.selectedId\)[\s\S]*detailTarget && detailTarget\.item === selectedRow\?\.item/, 'Search Details must require current visible-result membership and exact route identity before opening');
assert.match(routerApplySource, /searchVisibleRows\(next\)/, 'Search detail routing must share the rendered progressive result window');
assert.match(closeDetailSource, /activeSearch[\s\S]*searchDetailRoute\(activeSearch[\s\S]*persist: false/, 'closing Search Details must restore the same Search route without a durable write');
assert.match(resultRowSource, /dataset\.itemId/, 'Search results must expose the exact item id for detail-return focus');
assert.match(restoreDetailFocusSource, /\[data-item-id=/, 'the shared detail sheet must be able to restore focus to a Search result');
assert.match(renderSearchSource, /handleSearchQueryKeydown/, 'query activation must use the debounce- and IME-aware controller');
const queryClearHarness = vm.createContext({});
vm.runInContext(`${syncQueryClearSource}\nglobalThis.__syncQueryClear = syncSearchQueryClear;`, queryClearHarness);
const queryClearControl = { hidden: false, disabled: false };
const queryClearInput = { value: '' };
queryClearHarness.input = queryClearInput;
queryClearHarness.control = queryClearControl;
assert.equal(vm.runInContext('__syncQueryClear(input, control)', queryClearHarness), false,
  'an empty Search query must expose no Clear action');
assert.equal(queryClearControl.hidden, true,
  'an empty Search query must remove Clear from the visual and keyboard sequence');
assert.equal(queryClearControl.disabled, true,
  'an empty Search query must keep Clear non-actionable even if hidden styling is unavailable');
queryClearInput.value = 'saved research';
assert.equal(vm.runInContext('__syncQueryClear(input, control)', queryClearHarness), true,
  'typed Search text must make Clear immediately available');
assert.equal(queryClearControl.hidden, false);
assert.equal(queryClearControl.disabled, false);
assert.match(renderSearchSource, /const clearQueryButton = page\.querySelector\('\.search-query-clear'\)[\s\S]*syncSearchQueryClear\(input, clearQueryButton\)[\s\S]*oninput = event => \{[\s\S]*syncSearchQueryClear\(input, clearQueryButton\)[\s\S]*queueSearchQueryInput\(event\)[\s\S]*oncompositionend = \(\) => \{[\s\S]*syncSearchQueryClear\(input, clearQueryButton\)[\s\S]*endSearchQueryComposition\(input\)/,
  'the rendered Clear action must follow initial, ordinary, and IME-completed input immediately');
assert.match(queryKeydownSource, /isComposing[\s\S]*keyCode === 229[\s\S]*_searchMoveSelection\([\s\S]*true[\s\S]*searchRecoveryContextForActivation/, 'query keys must ignore IME composition, move focus into results, and resolve current results');
assert.match(bindResultSource, /event\.key === 'Home'[\s\S]*event\.key === 'End'[\s\S]*'first' : 'last'/, 'long result lists must support Home and End roving navigation');
assert.match(queueQuerySource, /activeSearch !== scheduledState[\s\S]*scheduledState\.query !== scheduledQuery/, 'a stale debounce must not mutate a newer Search session');
assert.match(queueQuerySource, /setAttribute\('aria-busy', 'true'\)[\s\S]*removeAttribute\('role'\)[\s\S]*removeAttribute\('aria-labelledby'\)/, 'loading state must not remain inside a stale list');
assert.doesNotMatch(queueQuerySource, /innerHTML|replaceChildren/, 'typing keeps the old rows on screen (inert, outside the list semantics) until the settled rows replace them, so the page does not jump on each keystroke');
assert.doesNotMatch(queueQuerySource, /setSelectionRange/, 'the settled repaint must never move the caret');
assert.doesNotMatch(queueQuerySource, /role="status"/, 'the inline loading state must not duplicate the persistent live announcement');
assert.match(`${ensureLiveRegionSource}\n${announceStatusSource}`, /document\.body\.appendChild[\s\S]*searchAnnouncement === nextSignature[\s\S]*requestAnimationFrame/, 'Search announcements must deduplicate a persistent mounted live region by result-state signature');
assert.match(resetAnnouncementSource, /delete region\.dataset\.searchAnnouncement/, 'leaving Search must reset its live-announcement session');
assert.match(suspendRecoverySource, /activeSearch\.loading = true[\s\S]*activeSearch\.detailOpen = false[\s\S]*list\.inert = true/, 'query and composition changes must synchronously disable old results and their row actions (Details lives on each row inside the inert list)');
assert.match(renderSearchSource, /class="fnd-count" aria-hidden="true"[\s\S]*announceSearchStatus/, 'the visible (rolling) result count must use the persistent live region for announcements');
assert.match(renderSearchSource, /state\.spaceId !== 'all'[\s\S]*state\.spaceId = 'all'[\s\S]*reconcileSearchSelection\(state, failure \? \[\] : visibleRows\)/, 'production Search rendering must normalize only missing Spaces before running exact selection/detail reconciliation');
assert.match(renderSearchSource, /searchVisibleRows\(state, rows\)/, 'Search rendering must use the shared progressive result window');
assert.match(renderSearchSource, /<div id="search-result-list"><\/div><footer class="search-result-continuation" hidden>/, 'the continuation must remain outside the listbox');
assert.match(renderSearchSource, /showNextSearchResultBatch/, 'the continuation control must use the shared focus-aware controller');
assert.match(renderSearchSource, /const remaining = Math\.max\(0, rows\.length - visibleRows\.length\)[\s\S]*more\.hidden = remaining === 0[\s\S]*Math\.min\(SEARCH_RESULT_BATCH_SIZE, remaining\)/, 'the final partial batch must use its real count and remove the exhausted action');
assert.doesNotMatch(renderSearchSource, /IntersectionObserver|onscroll|addEventListener\(['"]scroll/, 'Search continuation must stay deliberate instead of becoming infinite scroll');
assert.doesNotMatch(renderSearchSource, /search-steps|search-page-footer/, 'Find again must remove generic process and stats decoration');
assert.doesNotMatch(renderSearchSource, /search-title-icon/, 'Find again must not spend its heading hierarchy on a generic decorative icon');
assert.match(resultRowSource, /search-result-location[\s\S]*search-result-snippet[\s\S]*search-result-time/, 'each result must lead with its exact saved location and keep saved age independently scannable');
assert.doesNotMatch(resultRowSource, /search-result-meta/, 'the exact saved path must not be buried in a generic low-priority metadata line');
assert.match(resultRowSource, /search-result-location[\s\S]*searchRecoveryPathHtml[\s\S]*class="fnd-acts"/, 'each result must put its recovery actions after its exact saved path');
assert.doesNotMatch(renderSearchSource, /role="combobox"|role="tablist"|<main class="search-results"/, 'Search must avoid mixed combobox/tab semantics and nested main landmarks');
// Rows hold two actions (Open, Details), so populated results are a list of
// rows with buttons, not a listbox of options.
assert.match(renderSearchSource, /role="group"[\s\S]*aria-pressed[\s\S]*list\.setAttribute\('role', 'list'\)/, 'type filters and populated results must expose truthful conditional semantics');
assert.match(resultRowSource, /setAttribute\('role', 'listitem'\)/, 'each populated result must be a list item');
assert.match(renderSearchSource, /search-filter-space-[\s\S]*search-filter-time-[\s\S]*search-filter-tag-/, 'rerendering filters must retain stable focus targets');
assert.match(renderSearchSource, /searchHiddenFilterCount\(state\)[\s\S]*search\.activeFilterCount/, 'the collapsed filter control must project its count through localized copy');
assert.match(renderSearchSource, /has-active-filters[\s\S]*class="search-filter-count" aria-hidden="true"/, 'the collapsed filter control must expose the visual count without making its badge a duplicate announcement');
assert.match(renderSearchSource, /toggle\.setAttribute\('aria-label', filterToggleLabel\)/, 'the active hidden-filter count must be included in the filter control accessible name');
assert.match(renderSearchSource, /id="search-clear-filters"[\s\S]*clearFiltersButton\.disabled = !filtersActive[\s\S]*_searchSet\(searchFilterResetPatch\(\), 'search-surface-input'\)/, 'the panel reset must be disabled at default state and use the shared filter-only patch');
assert.match(renderSearchSource, /const filtersActive = searchFiltersActive\(state\)[\s\S]*label: tr\(filtersActive \? 'empty\.clearFilters' : 'empty\.clearSearch'\)[\s\S]*run: filtersActive \? clearFilters : clearSearch/, 'the no-result recovery action must share the same definition of active filters');
assert.doesNotMatch(source, /search\.clearAll/, 'Search must not label a filter-only reset as clearing everything');
assert.doesNotMatch(css, /\.search-steps|\.search-page-footer/, 'obsolete Search decoration styles must be removed');
assert.doesNotMatch(`${source}\n${css}`, /search-result-fav|search\.(?:favorite|unfavorite|stats|tips|tipOperators|tipQuotes|tipExclude)/, 'Find again must remove orphaned dashboard and quick-mutation residue');
// 2026-11-06 (page board): the look decisions of the 2026-08 locator ledger are
// ported to the board's equivalents; the decisions about content stay.
assert.match(css, /\.search-query-box\.fnd-q \{[^}]*height: 66px[^}]*border-radius: 20px[\s\S]*\.search-query-box\.fnd-q:focus-within \{[^}]*border-color: var\(--index-locator/, 'the find field must lead the page: the board\'s 66 px field with the locator focus ring (it replaced the 2026-08 accent edge)');
assert.match(css, /\.fnd-thumb \{[^}]*transform: translateX\(calc\(var\(--fnd-i, 0\) \* 100%\)\)[^}]*transition: transform \.32s[\s\S]*\.fnd-seg-btn \{[^}]*height: 44px/, 'content types must be one segmented switch whose pill slides (it replaced the flat filing rail), with 44 px targets');
assert.match(css, /\.fnd-panel \{[^}]*display: flex[^}]*flex-wrap: wrap[\s\S]*\.fnd-panel \.search-filter-sections \{ display: contents; \}[\s\S]*\.fnd-chip \{[^}]*height: 44px/, 'filters must open as one panel of chip groups above the results (it replaced the tray over the two-column ledger)');
assert.match(css, /\.search-result-location\.fnd-meta \{[^}]*font-family: var\(--today-mono\)[^}]*overflow-wrap: anywhere/, 'exact result paths must wrap and use the locator (mono) type');
assert.match(css, /\.fnd-details \{[^}]*height: 44px[\s\S]*\.fnd-cap,\n\.pal-cap \{[^}]*height: 36px/, 'each row\'s recovery actions (Details and the Open key) must be reachable 44 px targets beside the path');
assert.match(css, /\.search-sort \{[^}]*min-height: 44px[\s\S]*\.fnd-reset \{[^}]*min-height: 44px/, 'filter reset and result sorting must retain complete keyboard targets');
assert.match(css, /\.search-recovery-path/, 'the exact recovery path must have production styling');
assert.match(css, /\.search-result-continuation \{[^}]*display: flex[\s\S]*\.search-result-continuation button:focus-visible/, 'the quiet continuation footer and keyboard focus must have production styling');
assert.match(css, /\.fnd-open:focus-visible::after \{ box-shadow: inset 0 0 0 2px var\(--index-locator/, 'Search results must retain a visible keyboard focus state');
assert.match(css, /@container \(max-width: 640px\) \{[\s\S]*?\.fnd-row \.fnd-acts \{ grid-area: acts;/, 'at phone width Details must stay on the row instead of clipping');
assert.match(css, /\.search-result-continuation button \{[^}]*min-height: 44px[\s\S]*@container \(max-width: 640px\) \{[\s\S]*?\.search-result-continuation \{ flex-direction: column;/, 'the narrow continuation action must retain a reachable target and stack under its count');
assert.doesNotMatch(css, /#search-result-list[^{]*\{[^}]*max-height/, 'with actions on every row the results are no nested scroller; the page scrolls (the bounded list served the old preview pane)');
assert.match(renderSearchSource, /buildLibraryEmpty\(\{/, 'empty states must use the shared board empty state inside the results card');
assert.match(css, /\.fnd-tt \{[^}]*text-overflow: ellipsis[\s\S]*\.fnd-src \{[^}]*text-overflow: ellipsis/, 'long titles and sources must stay inside the row (tags moved to Details)');
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\n  \.fnd, \.fnd \*, \.fnd \*::before, \.fnd \*::after,\n  #cmd-palette, #cmd-palette \*/, 'Search and the palette must honor reduced motion');
assert.match(css, /@media \(forced-colors: active\) \{[\s\S]*?\.search-result-location \{ color: CanvasText; \}/, 'Search destination context must survive forced colors');
assert.match(css, /@media \(forced-colors: active\)[\s\S]*\.search-type-tabs button\[aria-pressed="true"\][\s\S]*border: 2px solid Highlight[\s\S]*\.search-result-row\.selected \{ border-left: 3px solid Highlight; \}[\s\S]*:focus-visible[\s\S]*outline: 2px solid CanvasText/, 'forced colors must distinguish selected or pressed state from the outer keyboard focus ring');
assert.match(css, /@media \(forced-colors: active\)[\s\S]*\.fnd-cap,\n  \.pal-cap \{ forced-color-adjust: none; background: Highlight;/, 'the Open key on the selected row must survive forced colors');
assert.match(css, /\.search-filter-toggle\.has-active-filters[^{]*\{[^}]*border-color:[^}]*accent/, 'active hidden filters must remain visible when the panel is collapsed');
assert.match(css, /\.search-filter-count \{[^}]*border-radius: 999px[^}]*font-variant-numeric: tabular-nums/, 'the exact hidden-filter count must use a compact stable badge');
assert.match(css, /\.fnd-reset:disabled \{[^}]*color: var\(--text3\)[^}]*cursor: default/, 'the unavailable filter reset must have a quiet non-actionable state');
assert.match(css, /@media \(forced-colors: active\)[\s\S]*\.search-filter-count \{[^}]*forced-color-adjust: none[^}]*background: Highlight[^}]*color: HighlightText/, 'the active count must remain distinct in forced colors');

// Just Today (2026-11-07): the calm new tab and its saved-work field are gone.
// The helpers it introduced keep their names and are tested where they are
// used now: the palette's saved links, the Inbox door, and the Search route.
assert.doesNotMatch(html, /id="landing-(?:layer|search-form|search-input|search-submit|search-results|unsorted|unsorted-count|reminders)"/,
  'the retired launch layer must leave no field, suggestion list, or chip behind');
assert.doesNotMatch(source,
  /function (?:landingResults|syncLandingComboboxState|handleLandingSearchInput|handleLandingSearchKeydown|paintLandingResults|submitLandingSearch|activateLandingInbox|reportLandingInboxUnavailable|renderLandingLayer|bindLandingLayer|closeLandingLayer)\(|_landingResultIndex|_landingInboxContext/,
  'the retired launch field must leave no handlers, ranking, or Inbox chip state behind');
assert.doesNotMatch(css, /\.landing-(?:result|unsorted|search)/,
  'the retired suggestion rows and chips must leave no styles behind');

const destinationLocale = { value: 'en' };
const destinationContext = vm.createContext({
  tr(key) {
    if (key === 'nav.inbox') return destinationLocale.value === 'zh-TW' ? '收件匣' : 'Inbox';
    return key;
  },
});
vm.runInContext(
  `${homeTrailGroupNameSource}\n${homeTrailPathTextSource}\n${landingDestinationSource}\nglobalThis.__destination = { landingResultDestinationText };`,
  destinationContext,
  { filename: 'saved-link-destination-contract.js' },
);
const nestedSavedLinkRow = {
  ws: { id: 'workspace-path', name: 'Desk' },
  cat: { id: 'space-path', name: 'Research' },
  group: { id: 'group-path', name: 'Inbox' },
  parents: [{ id: 'stack-outer', name: 'Sprint' }, { id: 'stack-inner', name: 'Sources' }],
};
assert.equal(
  destinationContext.__destination.landingResultDestinationText(nestedSavedLinkRow),
  'Desk › Research › Inbox › Sprint › Sources',
  'a saved-link destination must project the complete visible Workspace-to-nested-Stack trail',
);
destinationLocale.value = 'zh-TW';
assert.equal(
  destinationContext.__destination.landingResultDestinationText(nestedSavedLinkRow),
  'Desk › Research › 收件匣 › Sprint › Sources',
  'a saved-link destination must reuse the canonical native zh-TW Inbox label at the presentation boundary',
);
assert.match(paletteSavedLinkSource, /const destination = landingResultDestinationText\(row\)[\s\S]*tr\('palette\.savedLinkDesc', \{ host: [^}]*destination \}\)/,
  'a palette saved link must describe itself with its full destination trail');

const exactInbox = { id: 'inbox-exact', name: 'Inbox', items: [] };
const exactSpace = { id: 'space-exact', name: 'Research', groups: [exactInbox] };
const exactWorkspace = {
  id: 'workspace-exact',
  name: 'Desk',
  activeCatId: exactSpace.id,
  categories: [exactSpace],
};
const inboxDoorControl = {
  state: { activeWsId: exactWorkspace.id, workspaces: [exactWorkspace] },
  routes: [],
  effects: [],
  unavailable: 0,
};
const inboxDoorContext = vm.createContext({
  State: { get: () => inboxDoorControl.state },
  tr: key => key === 'nav.inbox' ? 'Inbox' : key,
  activeWs: () => inboxDoorControl.state.workspaces
    .find(workspace => workspace.id === inboxDoorControl.state.activeWsId) || null,
  activeCat: () => {
    const workspace = inboxDoorControl.state.workspaces
      .find(candidate => candidate.id === inboxDoorControl.state.activeWsId);
    return workspace
      ? workspace.categories.find(space => space.id === workspace.activeCatId) || workspace.categories[0] || null
      : null;
  },
  Router: {
    navigate(route, options) {
      inboxDoorControl.routes.push(JSON.parse(JSON.stringify({ route, options })));
      inboxDoorControl.effects.push('route');
      return true;
    },
  },
  reportInboxNavigationUnavailable() {
    inboxDoorControl.unavailable += 1;
    inboxDoorControl.effects.push('unavailable');
    return false;
  },
});
vm.runInContext(
  `${homeTrailPathPartsSource}\n${homeTrailPathTextSource}\n${homeTrailDestinationContextSource}\n${homeTrailDestinationStillMatchesSource}\n${organizationGroupTargetSource}\n${identitySpaceTargetSource}\n${identityGroupTargetSource}\n${createLandingInboxContextSource}\n${resolveLandingInboxTargetSource}\n${openInboxViewSource}\nglobalThis.__inboxDoor = { createLandingInboxContext, resolveLandingInboxTarget, openInboxView };`,
  inboxDoorContext,
  { filename: 'inbox-door-contract.js' },
);
const exactInboxContext = inboxDoorContext.__inboxDoor.createLandingInboxContext(exactWorkspace);
assert.equal(exactInboxContext?.inboxRef, exactInbox, 'one exact active-Space Inbox must be actionable');
assert.equal(inboxDoorContext.__inboxDoor.openInboxView(exactInboxContext, {}), true);
assert.deepEqual(inboxDoorControl.routes, [{
  route: { type: 'group', wsId: exactWorkspace.id, groupId: exactInbox.id, itemId: null, query: {} },
  options: { persist: false },
}], 'the Inbox door must route to the exact re-resolved Inbox without a whole-state navigation write');
assert.deepEqual(inboxDoorControl.effects, ['route'], 'the Inbox door must take only the accepted route');

exactSpace.groups = [];
assert.equal(inboxDoorContext.__inboxDoor.createLandingInboxContext(exactWorkspace), null,
  'a missing Inbox must not become a navigation action or implicit create');
exactSpace.groups = [exactInbox, { id: 'inbox-second', name: 'Inbox', items: [] }];
assert.equal(inboxDoorContext.__inboxDoor.createLandingInboxContext(exactWorkspace), null,
  'duplicate Inboxes must not borrow first-match routing authority');

exactSpace.groups = [exactInbox];
const staleInboxContext = inboxDoorContext.__inboxDoor.createLandingInboxContext(exactWorkspace);
exactSpace.groups = [{ id: exactInbox.id, name: 'Inbox', items: [] }];
inboxDoorControl.routes = [];
inboxDoorControl.effects = [];
assert.equal(inboxDoorContext.__inboxDoor.openInboxView(staleInboxContext, {}), false);
assert.equal(inboxDoorControl.unavailable, 1, 'same-ID replacement must report one recovery result');
assert.deepEqual(inboxDoorControl.routes, [], 'same-ID replacement must open no route');
assert.deepEqual(inboxDoorControl.effects, ['unavailable'], 'same-ID replacement must only report');

exactSpace.groups = [exactInbox];
const duplicatedIdContext = inboxDoorContext.__inboxDoor.createLandingInboxContext(exactWorkspace);
inboxDoorControl.state.workspaces.push({
  id: 'workspace-other',
  name: 'Other',
  activeCatId: 'space-other',
  categories: [{ id: 'space-other', name: 'Other', groups: [{ id: exactInbox.id, name: 'Reference', items: [] }] }],
});
inboxDoorControl.effects = [];
assert.equal(inboxDoorContext.__inboxDoor.openInboxView(duplicatedIdContext, {}), false);
assert.equal(inboxDoorControl.unavailable, 2, 'a globally duplicated Group ID must report recovery once');
assert.deepEqual(inboxDoorControl.effects, ['unavailable'], 'ambiguous identity must open nothing');
assert.doesNotMatch(html, /data-i18n="landing\.unsorted"/, 'no surface may expose a second name for Inbox');
assert.doesNotMatch(`${createLandingInboxContextSource}\n${resolveLandingInboxTargetSource}\n${openInboxViewSource}`, /State\.(?:snapshot|persist)/,
  'Inbox navigation must not create or write saved content');

const exactTitleLink = {
  id: 'exact-title',
  type: 'tab',
  title: 'Report',
  url: 'https://exact.example/',
  createdAt: 1,
};
const addressOnlyLinks = Array.from({ length: 6 }, (_, index) => ({
  id: `newer-address-${index}`,
  type: 'tab',
  title: `Weekly notes ${index}`,
  url: `https://report-${index}.example/`,
  createdAt: 100 + index,
}));
const linkMatchWorkspace = {
  id: 'workspace-ranking',
  name: 'Desk',
  categories: [{
    id: 'space-ranking',
    name: 'Research',
    groups: [{
      id: 'group-ranking',
      name: 'Inbox',
      items: [exactTitleLink, ...addressOnlyLinks],
    }],
  }],
};
const linkMatchContext = vm.createContext({
  URL,
  activeWs: () => linkMatchWorkspace,
  dispUrl: value => String(value || ''),
  tr: key => key,
});
vm.runInContext(
  [
    searchConstantsSource,
    parseSearchSource,
    plainSearchHtmlSource,
    notePartsSource,
    itemTitleSource,
    itemBlobSource,
    itemMatchesSource,
    collectTabsSource,
    landingLinkMatchesSource,
    'globalThis.__links = query => collectWorkspaceTabs(activeWs()).filter(row => landingLinkMatches(row, query)).map(row => row.item.id);',
  ].join('\n'),
  linkMatchContext,
  { filename: 'saved-link-match-contract.js' },
);
assert.deepEqual(JSON.parse(JSON.stringify(linkMatchContext.__links('report'))),
  ['exact-title', ...addressOnlyLinks.map(link => link.id)],
  'the shared saved-link matcher must find title and address matches');
assert.deepEqual(JSON.parse(JSON.stringify(linkMatchContext.__links('domain:report'))),
  addressOnlyLinks.map(link => link.id),
  'the shared saved-link matcher must honour search operators');
assert.deepEqual(JSON.parse(JSON.stringify(linkMatchContext.__links('   '))), [],
  'an empty query must match no saved link');
assert.match(paletteMatchingLinksSource, /\.filter\(row => landingLinkMatches\(row, query\)\)[\s\S]*isOpenableSavedTabUrl/,
  'the command palette must keep using the shared saved-link matcher and only offer pages Reopen accepts');

const searchHandoff = {
  routes: [],
  webSearches: [],
  searchFocus: 0,
  menusClosed: 0,
};
const searchHandoffElements = new Map([
  ['search-surface-input', { focus() { searchHandoff.searchFocus += 1; } }],
]);
const searchHandoffContext = vm.createContext({
  document: {
    getElementById(id) { return searchHandoffElements.get(id) || null; },
  },
  activeWs() { return { id: 'workspace/local?' }; },
  Router: {
    navigate(route, options) { searchHandoff.routes.push({ route, options }); return true; },
  },
  chrome: {
    search: {
      query(intent) { searchHandoff.webSearches.push(intent); },
    },
  },
  hideContextMenu() { searchHandoff.menusClosed += 1; },
  setTimeout(callback) { callback(); return 1; },
});
vm.runInContext(
  `${openSearchSurfaceSource}\n${closeSearchSurfaceSource}\nglobalThis.__search = { openSearchSurface, closeSearchSurface };`,
  searchHandoffContext,
  { filename: 'local-search-route-contract.js' },
);
searchHandoffContext.__search.openSearchSurface('sprint notes');
assert.deepEqual(
  JSON.parse(JSON.stringify(searchHandoff.routes)),
  [{
    route: { type: 'search', wsId: 'workspace/local?', query: { q: 'sprint notes' } },
    options: { persist: false },
  }],
  'a saved-work query must open the existing local Search route without a durable write',
);
assert.deepEqual(searchHandoff.webSearches, [], 'saved-work search must not dispatch a browser web search');
assert.equal(searchHandoff.menusClosed, 1, 'opening Search must close a menu first (one floating layer)');
assert.equal(searchHandoff.searchFocus, 1, 'the existing Search route must retain its input-focus handoff');
searchHandoffContext.__search.closeSearchSurface();
assert.deepEqual(
  JSON.parse(JSON.stringify(searchHandoff.routes.at(-1))),
  {
    route: { type: 'home', wsId: 'workspace/local?', query: {} },
    options: { persist: false },
  },
  'leaving URL-backed Search must return Home without writing durable state',
);
assert.equal(manifest.permissions.includes('search'), false, 'local saved-work search must not retain the single-use browser search permission');
assert.doesNotMatch(openSearchSurfaceSource, /chrome\.search/, 'opening Search must not retain a hidden web-search fallback');
assert.match(html, /<span class="topbar-search-ph" data-i18n="landing\.searchPlaceholder">Search saved work…<\/span>/,
  'pre-i18n Search markup must describe the local saved-work action');
const topbarSearchMarkup = html.match(/<button id="topbar-search"[\s\S]*?<\/button>/)?.[0] || '';
assert.match(topbarSearchMarkup, /data-i18n-aria-label="landing\.searchSaved"/,
  'the primary Search entry must name the established local saved-work action');
assert.match(topbarSearchMarkup, /data-i18n="landing\.searchPlaceholder"/,
  'the primary Search entry must reuse the established saved-work placeholder');
assert.match(topbarSearchMarkup, /<kbd[^>]*aria-hidden="true"[^>]*>\/<\/kbd>/,
  'the primary Search entry must advertise the direct Find-again shortcut without polluting its accessible name');
assert.match(bindStaticSource, /topSearch[\s\S]*onclick = \(\) => openSearchSurface\(\)/,
  'clicking the prominent Search entry must open Find again');
assert.doesNotMatch(bindStaticSource, /topSearch[^\n]*openCommandPalette/,
  'the prominent Search entry must not masquerade as the command palette');
assert.match(bindStaticSource, /ctrlKey \|\| e\.metaKey[\s\S]*key\.toLowerCase\(\) === 'k'[\s\S]*openCommandPalette\(\)[\s\S]*e\.key === '\/'[\s\S]*openSearchBar\(\)/,
  'global shortcuts must retain Ctrl or Command K for commands and slash for Find again');
assert.match(css, /body\[data-surface="search"\] \.topbar-search\s*\{[^}]*visibility:\s*hidden/s,
  'the routed Search field must be the sole visible Search owner');

const detailRoot = {
  classList: { contains() { return false; } },
  dataset: {},
};
const recoveryHarness = {
  activeWorkspace: null,
  state: { workspaces: [] },
  activationRows: [],
  openResult: true,
  navigateResult: true,
  preparedOpener: null,
  opens: [],
  routes: [],
  prepared: [],
  cancelled: [],
  toasts: [],
  moves: [],
};
const recoveryContext = vm.createContext({
  recoveryHarness,
  State: { get() { return recoveryHarness.state; } },
  activeWs() { return recoveryHarness.activeWorkspace; },
  openSavedTabItem(item, options) {
    recoveryHarness.opens.push({ item, options });
    return recoveryHarness.openResult;
  },
  focusDialogOpener(opener) { recoveryHarness.preparedOpener = opener; },
  prepareItemDetailOpen(itemId) {
    recoveryHarness.prepared.push(itemId);
    detailRoot.dataset.returnItemId = String(itemId);
  },
  restoreOpener() {
    recoveryHarness.cancelled.push(recoveryHarness.prepared.at(-1) || null);
    const opener = recoveryHarness.preparedOpener;
    recoveryHarness.preparedOpener = null;
    if (!opener || typeof opener.focus !== 'function') return false;
    opener.focus({ preventScroll: true });
    return true;
  },
  document: { getElementById(id) { return id === 'item-detail' ? detailRoot : null; } },
  Router: {
    navigate(route, options) {
      recoveryHarness.routes.push({ route, options });
      return recoveryHarness.navigateResult;
    },
  },
  toast(message, options) { recoveryHarness.toasts.push({ message, options }); },
  tr(key) { return key; },
  requestAnimationFrame(callback) { callback(); },
  homeTrailGroupName(group) { return group?.name || ''; },
  homeTrailPathText(parts) { return parts.join(' → '); },
  _searchMoveSelection(delta, focusRow, edge) { recoveryHarness.moves.push({ delta, focusRow, edge }); },
  closeSearchSurface() {},
  esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  },
  URL,
});
vm.runInContext(
  [
    safeUrlSource,
    collectItemsSource,
    valueFingerprintSource,
    locationFingerprintSource,
    uniqueResolverSource,
    contextSource,
    resolveSource,
    createSearchSource,
    resolveSearchSource,
    matchSearchRowSource,
    resolveCurrentSearchSource,
    canOpenSource,
    pathPartsSource,
    pathTextSource,
    pathHtmlSource,
    reportSource,
    cancelDetailsSource,
    searchPagingConstantsSource,
    searchResultLimitSource,
    searchVisibleRowsSource,
    searchRouteSource,
    searchDetailRouteSource,
    openDetailsSource,
    openPrimarySource,
    'let activeSearch = null;',
    'function _searchRowsForState() { return recoveryHarness.activationRows; }',
    activationContextSource,
    queryKeydownSource,
    'globalThis.__recovery = { createSearchRecoveryContext, resolveSearchRecoveryTarget, searchRecoveryCanOpen, searchRecoveryLocationText, searchRecoveryPathHtml, searchDetailRoute, _searchOpenDetails, _searchOpenPrimary, searchRecoveryContextForActivation, handleSearchQueryKeydown, setActiveSearch(value) { activeSearch = value; } };',
  ].join('\n'),
  recoveryContext,
  { filename: 'search-recovery-model.js' },
);
const recovery = recoveryContext.__recovery;

function resetRecoveryEffects() {
  recoveryHarness.openResult = true;
  recoveryHarness.navigateResult = true;
  recoveryHarness.preparedOpener = null;
  recoveryHarness.opens.length = 0;
  recoveryHarness.routes.length = 0;
  recoveryHarness.prepared.length = 0;
  recoveryHarness.cancelled.length = 0;
  recoveryHarness.toasts.length = 0;
  recoveryHarness.moves.length = 0;
  for (const key of Object.keys(detailRoot.dataset)) delete detailRoot.dataset[key];
}

function makeRecoveryTarget(url = 'https://exact.example', type = 'tab') {
  const item = { id: 'item-exact', type, title: 'Exact save', url };
  const stack = { id: 'stack-inner', type: 'stack', name: 'Reading', items: [item] };
  const outerStack = { id: 'stack-outer', type: 'stack', name: 'Project', items: [stack] };
  const parents = [outerStack, stack];
  const group = { id: 'group-exact', name: 'Inbox', items: [outerStack] };
  const cat = { id: 'space-exact', name: 'Research', groups: [group] };
  const ws = { id: 'ws-exact', name: 'Work', activeCatId: cat.id, categories: [cat] };
  const target = { ws, cat, group, parents, item };
  const row = { cat, group, parents, item };
  recoveryHarness.activeWorkspace = ws;
  recoveryHarness.state = { workspaces: [ws] };
  recoveryHarness.activationRows = [row];
  return { ws, cat, group, outerStack, stack, parents, item, target, row };
}

function reviewedTarget(url = 'https://exact.example', type = 'tab') {
  const model = makeRecoveryTarget(url, type);
  recovery.setActiveSearch({
    query: 'needle', type: 'all', spaceId: 'all', time: 'any', hasTags: false,
    tag: '', sort: 'best', selectedId: model.item.id, filtersOpen: true,
    detailOpen: false, loading: false,
  });
  const context = recovery.createSearchRecoveryContext(model.row);
  assert.ok(context, 'a complete Search row must produce an exact recovery context');
  return { ...model, context };
}

assert.equal(recovery.createSearchRecoveryContext({}), null, 'an incomplete Search row must not produce a recovery context');
const pathModel = reviewedTarget();
assert.equal(
  recovery.searchRecoveryLocationText(pathModel.context),
  'Work → Research → Inbox → Project → Reading',
  'Search must expose the exact Workspace, Space, Group, and nested Stack path',
);
assert.match(recovery.searchRecoveryPathHtml(pathModel.context), /class="search-recovery-path"[\s\S]*aria-current="location"/, 'the visible path must identify its current destination');

for (const url of [
  'http://example.com/page',
  'https://example.com/page',
  'HTTPS://EXAMPLE.COM/mixed-case',
  '  https://example.com/surrounded  ',
  'ftp://example.com/file.txt',
  'file:///C:/Users/example/file.txt',
]) {
  resetRecoveryEffects();
  const model = reviewedTarget(url);
  assert.equal(recovery.searchRecoveryCanOpen(model.context), true, `${url} must be visibly openable through the production allowlist`);
  assert.equal(recovery._searchOpenPrimary(model.context), true, `${url} must use the shared safe opener`);
  assert.equal(recoveryHarness.opens.length, 1, `${url} must create one shared-opener request`);
  assert.equal(recoveryHarness.opens[0].item, model.item, `${url} must open the exact reviewed item`);
  assert.equal(recoveryHarness.opens[0].options.focus, true, `${url} must request a focused tab`);
  assert.equal(recoveryHarness.routes.length, 0, `${url} must not detour through Details`);
  assert.equal(recoveryHarness.toasts.length, 0, `${url} must not report a false stale state`);
}

for (const url of [
  '',
  '   ',
  'not a url',
  '//example.com/protocol-relative',
  'https://[invalid',
  'javascript:alert(1)',
  'data:text/html,unsafe',
  'blob:https://example.com/id',
  'about:blank',
  'chrome://settings',
  'edge://settings',
  'view-source:https://example.com',
  'chrome-extension://example/page.html',
  'mailto:user@example.com',
  'tel:+123456789',
  'custom-protocol://example',
]) {
  resetRecoveryEffects();
  const model = reviewedTarget(url);
  assert.equal(recovery.searchRecoveryCanOpen(model.context), false, `${url || 'blank'} must not expose Open page`);
  assert.equal(recovery._searchOpenPrimary(model.context), true, `${url || 'blank'} must fall back to exact Details`);
  assert.equal(recoveryHarness.opens.length, 0, `${url || 'blank'} must never reach the browser opener`);
  assert.deepEqual(recoveryHarness.prepared, [model.item.id], `${url || 'blank'} must prepare the exact item detail`);
  assert.equal(recoveryHarness.routes.length, 1, `${url || 'blank'} must navigate to one exact detail route`);
  assert.deepEqual(JSON.parse(JSON.stringify(recoveryHarness.routes[0].route)), {
    type: 'search', wsId: model.ws.id,
    query: { q: 'needle', item: model.item.id, filters: '1', detail: '1' },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(recoveryHarness.routes[0].options)), { persist: false });
}

resetRecoveryEffects();
const noteModel = reviewedTarget('', 'note');
assert.equal(recovery._searchOpenPrimary(noteModel.context), true, 'a non-tab result must open exact Details');
assert.equal(recoveryHarness.opens.length, 0, 'a non-tab result must never reach the browser opener');
assert.deepEqual(recoveryHarness.prepared, [noteModel.item.id]);

function assertFailsClosed(label, mutateReviewedState) {
  resetRecoveryEffects();
  const model = reviewedTarget();
  mutateReviewedState(model);
  const opener = {
    isConnected: true,
    focusCalls: 0,
    focus() { this.focusCalls += 1; },
  };
  assert.equal(recovery._searchOpenPrimary(model.context, opener), false, `${label} must fail closed`);
  assert.equal(recoveryHarness.opens.length, 0, `${label} must not reach the browser opener`);
  assert.equal(recoveryHarness.routes.length, 0, `${label} must not navigate to a possibly different item`);
  assert.equal(recoveryHarness.prepared.length, 0, `${label} must not prepare a possibly different item`);
  assert.equal(recoveryHarness.toasts.length, 1, `${label} must explain why recovery stopped`);
  assert.equal(recoveryHarness.toasts[0].message, 'search.recoveryUnavailable');
  assert.equal(opener.focusCalls, 1, `${label} must restore focus to the initiating control`);
}

assertFailsClosed('a missing item', model => { model.stack.items = []; });
assertFailsClosed('a duplicate item in the same Workspace', model => {
  model.cat.groups.push({ id: 'group-duplicate', name: 'Later', items: [{ ...model.item }] });
});
assertFailsClosed('a duplicate item in another Workspace', model => {
  const duplicate = { ...model.item };
  recoveryHarness.state.workspaces.push({
    id: 'ws-other', name: 'Other', activeCatId: 'space-other',
    categories: [{ id: 'space-other', name: 'Other Space', groups: [{ id: 'group-other', name: 'Other Group', items: [duplicate] }] }],
  });
});
assertFailsClosed('a duplicate Workspace id', model => {
  recoveryHarness.state.workspaces.push({ id: model.ws.id, name: 'Duplicate Workspace', categories: [] });
});
assertFailsClosed('a deep-equal item replacement', model => { model.stack.items[0] = { ...model.item }; });
assertFailsClosed('a replaced owning Space', model => {
  model.ws.categories[0] = { ...model.cat, groups: [model.group] };
});
assertFailsClosed('a replaced owning Group', model => {
  model.cat.groups[0] = { ...model.group, items: [model.outerStack] };
});
assertFailsClosed('a replaced stack parent', model => {
  model.group.items[0] = { ...model.outerStack, items: [model.stack] };
});
assertFailsClosed('an inserted stack parent', model => {
  model.group.items = [{ id: 'stack-added', type: 'stack', name: 'Added', items: [model.outerStack] }];
});
assertFailsClosed('a reordered stack path', model => {
  model.outerStack.items = [model.item];
  model.stack.items = [model.outerStack];
  model.group.items = [model.stack];
});
assertFailsClosed('a moved item', model => {
  model.stack.items = [];
  model.cat.groups.push({ id: 'group-moved', name: 'Moved', items: [model.item] });
});
for (const [label, mutate] of [
  ['a renamed Workspace', model => { model.ws.name = 'Renamed Work'; }],
  ['a renamed Space', model => { model.cat.name = 'Renamed Research'; }],
  ['a renamed Group', model => { model.group.name = 'Renamed Inbox'; }],
  ['a renamed stack parent', model => { model.stack.name = 'Renamed Reading'; }],
]) assertFailsClosed(label, mutate);
assertFailsClosed('an address edited after review', model => { model.item.url = 'https://changed.example'; });
assertFailsClosed('an active Workspace switch', model => {
  recoveryHarness.activeWorkspace = { id: model.ws.id, name: model.ws.name };
});
assertFailsClosed('an item outside the current query results', () => {
  recoveryHarness.activationRows = [];
});
assertFailsClosed('an activation while the current query is unsettled', model => {
  recovery.setActiveSearch({ loading: true, selectedId: model.item.id });
});

resetRecoveryEffects();
const staleDetailModel = reviewedTarget('javascript:blocked()');
recoveryHarness.activationRows = [];
assert.equal(recovery._searchOpenDetails(staleDetailModel.context), false, 'an old detail action must fail after the item leaves current results');
assert.equal(recoveryHarness.routes.length, 0, 'an old detail action must not route a prior item');
assert.equal(recoveryHarness.prepared.length, 0, 'an old detail action must not prepare a prior item');

resetRecoveryEffects();
const cappedModel = reviewedTarget();
const cappedFillers = Array.from({ length: 100 }, (_, index) => ({
  id: `cap-fill-${index}`,
  type: 'tab',
  title: `Visible filler ${index}`,
  url: `https://fill-${index}.example`,
}));
cappedModel.stack.items = [...cappedFillers, cappedModel.item];
const cappedRows = cappedFillers.map(item => ({
  cat: cappedModel.cat,
  group: cappedModel.group,
  parents: cappedModel.parents,
  item,
}));
recoveryHarness.activationRows = [...cappedRows, cappedModel.row];
const cappedState = { loading: false, selectedId: cappedModel.item.id };
recovery.setActiveSearch(cappedState);
assert.equal(recovery._searchOpenPrimary(cappedModel.context), false, 'a direct action must not open a selected item beyond the 100 visible results');
assert.equal(recoveryHarness.opens.length, 0, 'an item beyond the visible cap must never reach the shared opener');
assert.equal(recoveryHarness.routes.length, 0, 'an item beyond the visible cap must never route to Details');
assert.equal(recoveryHarness.prepared.length, 0, 'an item beyond the visible cap must never prepare Details');
const cappedActivation = recovery.searchRecoveryContextForActivation(cappedState, cappedModel.ws);
assert.equal(cappedActivation.itemRef, cappedFillers[0], 'query activation must fall back to the first visible result when a stale selection sits beyond the cap');
assert.notEqual(cappedActivation.itemRef, cappedModel.item, 'query activation must never recover an unrendered selected result');
resetRecoveryEffects();
assert.equal(recovery._searchOpenDetails(cappedModel.context), false, 'a detail action must not open a selected item beyond the 100 visible results');
assert.equal(recoveryHarness.routes.length, 0, 'an item beyond the visible cap must not gain a Search-owned detail route');
assert.equal(recoveryHarness.prepared.length, 0, 'an item beyond the visible cap must not prepare a hidden detail target');
resetRecoveryEffects();
cappedState.resultLimit = 200;
recovery.setActiveSearch(cappedState);
assert.equal(recovery._searchOpenPrimary(cappedModel.context), true, 'a deliberately revealed result must become safely openable');
assert.equal(recoveryHarness.opens.length, 1, 'a revealed result must make one exact shared-opener request');
assert.equal(recoveryHarness.opens[0].item, cappedModel.item, 'progressive reveal must retain exact recovery identity');
const expandedActivation = recovery.searchRecoveryContextForActivation(cappedState, cappedModel.ws);
assert.equal(expandedActivation.itemRef, cappedModel.item, 'query activation must resolve the selected result inside the expanded window');
resetRecoveryEffects();
assert.equal(recovery._searchOpenDetails(cappedModel.context), true, 'a revealed result must gain an exact Search-owned detail route');
assert.equal(recoveryHarness.routes.length, 1);
assert.equal(recoveryHarness.routes[0].route.query.shown, '200', 'Details must preserve the expanded result window in the URL');

resetRecoveryEffects();
const refusedOpenModel = reviewedTarget();
recoveryHarness.openResult = false;
const refusedOpener = { isConnected: true, focusCalls: 0, focus() { this.focusCalls += 1; } };
assert.equal(recovery._searchOpenPrimary(refusedOpenModel.context, refusedOpener), false, 'a shared opener refusal must fail closed');
assert.equal(recoveryHarness.opens.length, 1, 'a shared opener refusal must make only one attempt');
assert.equal(recoveryHarness.routes.length, 0, 'a shared opener refusal must not silently switch to Details');
assert.equal(recoveryHarness.toasts.length, 1, 'a shared opener refusal must be explained');
assert.equal(refusedOpener.focusCalls, 1, 'a shared opener refusal must restore initiating focus');

resetRecoveryEffects();
const refusedRouteModel = reviewedTarget('javascript:blocked()');
const refusedRouteOpener = { isConnected: true, focusCalls: 0, focus() { this.focusCalls += 1; } };
recoveryHarness.navigateResult = false;
assert.equal(recovery._searchOpenDetails(refusedRouteModel.context, refusedRouteOpener), false, 'a refused detail route must not report success');
assert.equal(recoveryHarness.routes.length, 1, 'a refused detail route must make one reviewed navigation attempt');
assert.equal(recoveryHarness.opens.length, 0, 'a refused detail route must not reach the browser opener');
assert.deepEqual(recoveryHarness.cancelled, [refusedRouteModel.item.id], 'a refused detail route must clear its prepared detail metadata');
assert.equal(detailRoot.dataset.returnItemId, undefined, 'a refused detail route must leave no stale detail target');
assert.equal(recoveryHarness.toasts.length, 1, 'a refused detail route must explain that recovery stopped');
assert.equal(refusedRouteOpener.focusCalls, 1, 'a refused detail route must restore initiating focus once');

resetRecoveryEffects();
const activationModel = reviewedTarget();
const activationState = { loading: false, selectedId: activationModel.item.id };
recovery.setActiveSearch(activationState);
assert.equal(recovery.searchRecoveryContextForActivation(activationState, activationModel.ws).itemRef, activationModel.item, 'query Enter must resolve the current result, not a rendered closure');
activationState.loading = true;
assert.equal(recovery.searchRecoveryContextForActivation(activationState, activationModel.ws), null, 'query Enter must be inert during debounce loading');
activationState.loading = false;
const supersededState = { ...activationState };
recovery.setActiveSearch(supersededState);
assert.equal(recovery.searchRecoveryContextForActivation(activationState, activationModel.ws), null, 'a superseded query closure must never activate');

const currentQueryOpener = { isConnected: true, focus() {} };
const queryEvent = (overrides = {}) => ({
  key: 'Enter', keyCode: 13, isComposing: false, currentTarget: currentQueryOpener,
  preventCalls: 0, stopCalls: 0,
  preventDefault() { this.preventCalls += 1; },
  stopPropagation() { this.stopCalls += 1; },
  ...overrides,
});
resetRecoveryEffects();
recovery.setActiveSearch(supersededState);
recoveryHarness.activationRows = [activationModel.row];
const composingEvent = queryEvent({ isComposing: true });
assert.equal(recovery.handleSearchQueryKeydown(composingEvent, supersededState, activationModel.ws), false, 'IME confirmation Enter must not activate a result');
assert.equal(composingEvent.preventCalls, 0);
assert.equal(recoveryHarness.opens.length, 0);
const legacyCompositionEvent = queryEvent({ keyCode: 229 });
assert.equal(recovery.handleSearchQueryKeydown(legacyCompositionEvent, supersededState, activationModel.ws), false, 'legacy IME Enter must not activate a result');
assert.equal(recoveryHarness.opens.length, 0);
const previousSelectedId = supersededState.selectedId;
supersededState.selectedId = null;
const queryArrowEvent = queryEvent({ key: 'ArrowDown', keyCode: 40 });
assert.equal(recovery.handleSearchQueryKeydown(queryArrowEvent, supersededState, activationModel.ws), true, 'query ArrowDown must enter the result-list roving focus model');
const queryArrowUpEvent = queryEvent({ key: 'ArrowUp', keyCode: 38 });
assert.equal(recovery.handleSearchQueryKeydown(queryArrowUpEvent, supersededState, activationModel.ws), true, 'query ArrowUp must enter at the final result when no explicit selection exists');
assert.deepEqual(recoveryHarness.moves, [
  { delta: 1, focusRow: true, edge: 'first' },
  { delta: -1, focusRow: true, edge: 'last' },
], 'query arrowing must enter the first or final perceptible option without skipping');
supersededState.selectedId = previousSelectedId;
supersededState.loading = true;
const loadingEvent = queryEvent();
assert.equal(recovery.handleSearchQueryKeydown(loadingEvent, supersededState, activationModel.ws), false, 'debouncing Enter must not activate an old result');
assert.equal(loadingEvent.preventCalls, 1);
assert.equal(recoveryHarness.opens.length, 0);
supersededState.loading = false;
const currentEvent = queryEvent();
assert.equal(recovery.handleSearchQueryKeydown(currentEvent, supersededState, activationModel.ws), true, 'settled query Enter must activate the current result');
assert.equal(currentEvent.preventCalls, 1);
assert.equal(recoveryHarness.opens.length, 1, 'settled query Enter must produce exactly one browser effect');

const compositionHarness = { queued: [], cleared: [], suspends: 0 };
const compositionContext = vm.createContext({
  _searchRenderTimer: 'pending-render',
  clearTimeout(value) { compositionHarness.cleared.push(value); },
  _searchQueueQuery(value) { compositionHarness.queued.push(value); },
  suspendSearchRecoveryActions() { compositionHarness.suspends += 1; },
});
vm.runInContext(
  `${startCompositionSource}\n${queueInputSource}\n${endCompositionSource}\nglobalThis.__composition = { startSearchQueryComposition, queueSearchQueryInput, endSearchQueryComposition };`,
  compositionContext,
  { filename: 'search-composition-model.js' },
);
const composition = compositionContext.__composition;
const compositionInput = { value: 'first', dataset: {} };
assert.equal(composition.startSearchQueryComposition(compositionInput), true);
assert.equal(compositionInput.dataset.searchComposing, 'true');
assert.deepEqual(compositionHarness.cleared, ['pending-render'], 'composition start must cancel a pending partial-query render');
assert.equal(compositionHarness.suspends, 1, 'composition start must synchronously suspend old recovery actions');
compositionInput.value = '完整搜尋';
assert.equal(composition.queueSearchQueryInput({ currentTarget: compositionInput, isComposing: true }), false, 'composing input must not destroy the active IME control');
assert.equal(composition.queueSearchQueryInput({ currentTarget: compositionInput, isComposing: false }), false, 'the composition marker must also suppress browsers with an incomplete isComposing flag');
assert.deepEqual(compositionHarness.queued, []);
assert.equal(composition.endSearchQueryComposition(compositionInput), true);
assert.deepEqual(compositionHarness.queued, ['完整搜尋'], 'compositionend must schedule the completed value exactly once');
assert.equal(composition.queueSearchQueryInput({ currentTarget: compositionInput, isComposing: false }), false, 'the duplicate final input event must be suppressed');
compositionInput.value = '完整搜尋字';
assert.equal(composition.queueSearchQueryInput({ currentTarget: compositionInput, isComposing: false }), true);
assert.deepEqual(compositionHarness.queued, ['完整搜尋', '完整搜尋字'], 'ordinary input must resume after composition');

const liveHarness = { region: null, callbacks: [] };
const liveContext = vm.createContext({
  document: {
    getElementById(id) { return id === 'search-live-region' ? liveHarness.region : null; },
    createElement() {
      return {
        id: '', className: '', dataset: {}, textContent: '', isConnected: true,
        attributes: new Map(),
        setAttribute(name, value) { this.attributes.set(name, value); },
      };
    },
    body: { appendChild(region) { liveHarness.region = region; } },
  },
  requestAnimationFrame(callback) { liveHarness.callbacks.push(callback); },
});
vm.runInContext(
  `${ensureLiveRegionSource}\n${resetAnnouncementSource}\n${announcementSignatureSource}\n${announceStatusSource}\nglobalThis.__live = { ensureSearchLiveRegion, resetSearchAnnouncement, searchAnnouncementSignature, announceSearchStatus };`,
  liveContext,
  { filename: 'search-live-region-model.js' },
);
const live = liveContext.__live;
const announcedState = {
  query: 'needle', type: 'note', spaceId: 'space', time: 'week', hasTags: true,
  tag: 'urgent', sort: 'recent', selectedId: 'one', detailOpen: false,
};
const countSignature = live.searchAnnouncementSignature(announcedState, 3, 'results');
const detailOnlySignature = live.searchAnnouncementSignature({ ...announcedState, detailOpen: true, selectedId: 'two' }, 3, 'results');
assert.equal(countSignature, detailOnlySignature, 'selection and detail-only rerenders must share one announcement signature');
assert.equal(live.announceSearchStatus('3 results', countSignature), true);
assert.equal(liveHarness.region.textContent, '', 'a new live message must wait until the region is mounted');
liveHarness.callbacks.shift()();
assert.equal(liveHarness.region.textContent, '3 results');
assert.equal(live.announceSearchStatus('3 results', detailOnlySignature), false, 'an unchanged result state must not re-announce during detail open/close');
assert.equal(liveHarness.callbacks.length, 0);
const changedCountSignature = live.searchAnnouncementSignature(announcedState, 4, 'results');
assert.equal(live.announceSearchStatus('4 results', changedCountSignature), true);
liveHarness.callbacks.shift()();
assert.equal(liveHarness.region.textContent, '4 results');
const firstBatchSignature = live.searchAnnouncementSignature(announcedState, 346, 'results', 100);
const secondBatchSignature = live.searchAnnouncementSignature(announcedState, 346, 'results', 200);
assert.notEqual(firstBatchSignature, secondBatchSignature, 'revealing another result batch must produce one new progress announcement');
assert.equal(live.announceSearchStatus('Showing 200 of 346', secondBatchSignature), true);
liveHarness.callbacks.shift()();
assert.equal(liveHarness.region.textContent, 'Showing 200 of 346');
assert.equal(live.resetSearchAnnouncement(), true);
assert.equal(liveHarness.region.textContent, '');
assert.equal(liveHarness.region.dataset.searchAnnouncement, undefined, 'leaving Search must permit the same result state to announce on the next visit');
assert.equal(live.announceSearchStatus('3 results', countSignature), true);
const abandonedSearchCallback = liveHarness.callbacks.shift();
assert.equal(live.resetSearchAnnouncement(), true);
abandonedSearchCallback();
assert.equal(liveHarness.region.textContent, '', 'a queued Search announcement must not speak after leaving Search');
assert.equal(live.announceSearchStatus('3 results', countSignature), true);
const supersededCountCallback = liveHarness.callbacks.shift();
assert.equal(live.announceSearchStatus('4 results', changedCountSignature), true);
const currentCountCallback = liveHarness.callbacks.shift();
supersededCountCallback();
assert.equal(liveHarness.region.textContent, '', 'a superseded live callback must not publish its stale result count');
currentCountCallback();
assert.equal(liveHarness.region.textContent, '4 results');
live.resetSearchAnnouncement();

const debounceHarness = {
  callbacks: [], syncs: [], announcements: [], renders: 0, focuses: 0, selections: 0,
};
const debounceList = {
  attributes: new Map([['role', 'list'], ['aria-labelledby', 'search-results-title']]), innerHTML: 'old rows', inert: false,
  setAttribute(name, value) { this.attributes.set(name, value); },
  removeAttribute(name) { this.attributes.delete(name); },
};
const debounceInput = {
  value: 'gamma',
  focus() { debounceHarness.focuses += 1; },
  setSelectionRange() { debounceHarness.selections += 1; },
};
const debounceContext = vm.createContext({
  Router: { sync(options) { debounceHarness.syncs.push(options); } },
  announceSearchStatus(message, signature) { debounceHarness.announcements.push({ message, signature }); },
  tr(key) { return key; },
  esc(value) { return String(value); },
  document: {
    getElementById(id) {
      if (id === 'search-result-list') return debounceList;
      if (id === 'search-surface-input') return debounceInput;
      return null;
    },
  },
  clearTimeout() {},
  setTimeout(callback) { debounceHarness.callbacks.push(callback); return debounceHarness.callbacks.length; },
  renderBoard() { debounceHarness.renders += 1; },
});
vm.runInContext(
  `${searchPagingConstantsSource}\nlet activeSearch = null; let _searchRenderTimer = null;\n${announcementSignatureSource}\n${suspendRecoverySource}\n${queueQuerySource}\nglobalThis.__debounce = { queue: _searchQueueQuery, setActive(value) { activeSearch = value; } };`,
  debounceContext,
  { filename: 'search-debounce-model.js' },
);
const debounce = debounceContext.__debounce;
const searchSessionA = { query: '', selectedId: 'old', detailOpen: true, loading: false, resultLimit: 300 };
const searchSessionB = { query: 'new session', selectedId: 'new', detailOpen: false, loading: false };
debounce.setActive(searchSessionA);
debounce.queue('alpha');
assert.equal(searchSessionA.loading, true);
assert.equal(searchSessionA.detailOpen, false, 'typing must close a detail route before results change');
assert.equal(searchSessionA.resultLimit, 100, 'typing a new query must return to the first result batch');
assert.equal(debounceList.inert, true, 'typing must synchronously disable the old result controls');
assert.equal(debounceList.innerHTML, 'old rows', 'typing must keep the old rows on screen until the settled rows replace them (no layout jump per keystroke)');
assert.equal(debounceList.attributes.get('aria-busy'), 'true', 'the old rows must be marked busy while the query settles');
assert.equal(debounceList.attributes.has('role') || debounceList.attributes.has('aria-labelledby'), false, 'the old rows must leave the list semantics while the query settles');
debounce.setActive(searchSessionB);
debounceHarness.callbacks[0]();
assert.deepEqual(searchSessionB, { query: 'new session', selectedId: 'new', detailOpen: false, loading: false }, 'a stale callback must not mutate the replacement Search session');
assert.equal(debounceHarness.renders, 0, 'a stale callback must not render a replacement Search session');
assert.equal(debounceHarness.syncs.length, 1, 'a stale callback must not write a replacement URL');
assert.equal(debounceHarness.focuses, 0, 'a stale callback must not steal focus in a replacement Search session');
const searchSessionC = { query: '', selectedId: 'prior', detailOpen: false, loading: false };
debounce.setActive(searchSessionC);
debounce.queue('gamma');
debounceHarness.callbacks[1]();
assert.equal(searchSessionC.loading, false, 'the current debounce must settle its own Search state');
assert.equal(debounceHarness.renders, 1);
assert.equal(debounceHarness.syncs.length, 3, 'the current query must sync once while loading and once when settled');
assert.equal(debounceHarness.focuses, 1, 'a settle whose repaint dropped focus must return it to the field');
assert.equal(debounceHarness.selections, 0, 'the settled repaint must never move the caret');
debounceContext.document.activeElement = debounceInput;
debounce.queue('gamma ray');
debounceHarness.callbacks[2]();
assert.equal(debounceHarness.renders, 2);
assert.equal(debounceHarness.focuses, 1, 'a settle must not refocus a field that kept focus through the repaint');

const batchHarness = { rows: [], renders: 0, syncs: [], callbacks: [], nodes: new Map() };
function batchNode(id) {
  return {
    isConnected: true,
    dataset: { itemId: id },
    focusCalls: 0,
    scrollCalls: 0,
    focus() { this.focusCalls += 1; },
    scrollIntoView() { this.scrollCalls += 1; },
  };
}
const batchContext = vm.createContext({
  _searchRowsForState() { return batchHarness.rows; },
  renderBoard() { batchHarness.renders += 1; },
  Router: { sync(options) { batchHarness.syncs.push(options); } },
  document: { getElementById(id) { return batchHarness.nodes.get(id) || null; } },
  setTimeout(callback) { batchHarness.callbacks.push(callback); return batchHarness.callbacks.length; },
});
vm.runInContext(
  `${searchPagingConstantsSource}\n${searchResultLimitSource}\nlet activeSearch = null;\n${searchVisibleRowsSource}\n${showNextBatchSource}\nglobalThis.__batch = { show: showNextSearchResultBatch, setActive(value) { activeSearch = value; } };`,
  batchContext,
  { filename: 'search-result-continuation-model.js' },
);
const batch = batchContext.__batch;
batchHarness.rows = Array.from({ length: 250 }, (_, index) => ({ item: { id: `batch-item-${index}` } }));
const batchState = { loading: false, resultLimit: 100, selectedId: 'batch-item-0', detailOpen: true };
const firstNewBatchNode = batchNode('batch-item-100');
const secondNewBatchNode = batchNode('batch-item-200');
batchHarness.nodes.set('search-result-100', firstNewBatchNode);
batchHarness.nodes.set('search-result-200', secondNewBatchNode);
batch.setActive(batchState);
assert.equal(batch.show(), true, 'Show more must reveal the next bounded result batch');
assert.equal(batchState.resultLimit, 200);
assert.equal(batchState.selectedId, 'batch-item-100', 'Show more must select the first newly revealed result');
assert.equal(batchState.detailOpen, false, 'Show more must close any stale exact-detail route');
assert.equal(batchHarness.renders, 1);
assert.deepEqual(JSON.parse(JSON.stringify(batchHarness.syncs)), [{ replace: true }], 'batch expansion must update the current history entry without adding noisy steps');
batchHarness.callbacks.shift()();
assert.equal(firstNewBatchNode.focusCalls, 1, 'the first newly revealed row must receive keyboard focus');
assert.equal(firstNewBatchNode.scrollCalls, 1, 'the first newly revealed row must be brought into view');
assert.equal(batch.show(), true);
assert.equal(batchState.resultLimit, 300, 'a partial final batch must retain the next canonical 100-row URL window');
assert.equal(batchState.selectedId, 'batch-item-200');
const staleBatchFocus = batchHarness.callbacks.shift();
batch.setActive({ loading: false, resultLimit: 100, selectedId: null, detailOpen: false });
staleBatchFocus();
assert.equal(secondNewBatchNode.focusCalls, 0, 'a superseded Search session must not steal focus');
batch.setActive(batchState);
assert.equal(batch.show(), false, 'Show more must be inert once every result is visible');
batchState.loading = true;
batchState.resultLimit = 100;
assert.equal(batch.show(), false, 'Show more must be inert while a query is unsettled');

const setHarness = { renders: 0, syncs: [], callbacks: [] };
const setContext = vm.createContext({
  renderBoard() { setHarness.renders += 1; },
  Router: { sync(options) { setHarness.syncs.push(options); } },
  document: { getElementById() { return null; } },
  setTimeout(callback) { setHarness.callbacks.push(callback); },
});
vm.runInContext(
  `${searchPagingConstantsSource}\nlet activeSearch = null;\n${searchSetSource}\nglobalThis.__set = { run: _searchSet, setActive(value) { activeSearch = value; } };`,
  setContext,
  { filename: 'search-result-window-reset-model.js' },
);
const resultWindowState = {
  query: 'needle', type: 'all', spaceId: 'all', time: 'any', hasTags: false,
  tag: '', sort: 'best', filtersOpen: false, resultLimit: 300, loading: false,
};
setContext.__set.setActive(resultWindowState);
setContext.__set.run({ filtersOpen: true });
assert.equal(resultWindowState.resultLimit, 300, 'opening filters must preserve the expanded result window');
for (const [field, value] of [
  ['query', 'another query'],
  ['type', 'note'],
  ['spaceId', 'space-other'],
  ['time', 'week'],
  ['hasTags', true],
  ['tag', 'urgent'],
  ['sort', 'recent'],
]) {
  resultWindowState.resultLimit = 300;
  setContext.__set.run({ [field]: value });
  assert.equal(resultWindowState.resultLimit, 100, `${field} changes must return to the first batch`);
}

const bindingCalls = { selections: 0, opens: 0, presses: 0, moves: [], closes: 0 };
const bindingContext = vm.createContext({
  _searchSelectResult() { bindingCalls.selections += 1; return true; },
  _searchOpenPrimary() { bindingCalls.opens += 1; return true; },
  _searchMoveSelection(delta, focus, edge) { bindingCalls.moves.push({ delta, focus, edge }); },
  closeSearchSurface() { bindingCalls.closes += 1; },
  pressSearchGlide() { bindingCalls.presses += 1; },
});
vm.runInContext(`${bindResultSource}\nglobalThis.__bind = bindSearchResultActivation;`, bindingContext, { filename: 'search-result-binding.js' });
const boundResult = {
  listeners: {},
  addEventListener(type, listener) { this.listeners[type] = listener; },
};
bindingContext.__bind(boundResult, { item: { id: 'bound-item' } }, 0, { itemId: 'bound-item' });
const pointerEvent = { currentTarget: boundResult };
boundResult.listeners.focus(pointerEvent);
assert.equal(bindingCalls.selections, 1, 'focus on a result (pointer press or keyboard) must select it in place');
assert.equal(bindingCalls.opens, 0, 'focus alone must not open a result');
boundResult.listeners.click(pointerEvent);
assert.equal(bindingCalls.opens, 1, 'a click on a result (its title covers the row) must open it exactly once');
assert.equal(bindingCalls.presses, 1, 'opening must press the gliding highlight');
assert.equal(boundResult.listeners.dblclick, undefined, 'a double click is no longer the open gesture');
const resultEnter = { key: 'Enter', currentTarget: boundResult, preventCalls: 0, preventDefault() { this.preventCalls += 1; }, stopPropagation() {} };
boundResult.listeners.keydown(resultEnter);
assert.equal(resultEnter.preventCalls, 1, 'Enter must not also fire the button\'s own click');
assert.equal(bindingCalls.opens, 2, 'result Enter must add exactly one activation');
const resultArrow = { key: 'ArrowDown', currentTarget: boundResult, preventCalls: 0, preventDefault() { this.preventCalls += 1; }, stopPropagation() {} };
boundResult.listeners.keydown(resultArrow);
assert.equal(resultArrow.preventCalls, 1);
assert.deepEqual(bindingCalls.moves, [{ delta: 1, focus: true, edge: undefined }], 'result ArrowDown must keep roving focus in the mounted list');
const resultArrowUp = { key: 'ArrowUp', currentTarget: boundResult, preventCalls: 0, preventDefault() { this.preventCalls += 1; }, stopPropagation() {} };
boundResult.listeners.keydown(resultArrowUp);
assert.equal(resultArrowUp.preventCalls, 1);
assert.deepEqual(bindingCalls.moves[1], { delta: -1, focus: true, edge: undefined }, 'the actual result ArrowUp binding must request reverse movement');
const resultEnd = { key: 'End', currentTarget: boundResult, preventCalls: 0, preventDefault() { this.preventCalls += 1; }, stopPropagation() {} };
boundResult.listeners.keydown(resultEnd);
const resultHome = { key: 'Home', currentTarget: boundResult, preventCalls: 0, preventDefault() { this.preventCalls += 1; }, stopPropagation() {} };
boundResult.listeners.keydown(resultHome);
assert.equal(resultEnd.preventCalls, 1);
assert.equal(resultHome.preventCalls, 1);
assert.deepEqual(bindingCalls.moves.slice(2), [
  { delta: 0, focus: true, edge: 'last' },
  { delta: 0, focus: true, edge: 'first' },
], 'result Home and End must reach both edges of a long list');

// Roving selection over the mounted rows: each row's title button carries the
// id `search-result-<index>`; the row (`.search-result-row`) owns the selected
// class and both of its buttons (Open, Details) follow the roving tab index.
// The gliding highlight moves to the selected row.
const selectionRows = ['a', 'b', 'c'].map(id => ({ item: { id } }));
const selectionHarness = { syncs: [], nodes: new Map(), rows: [] };
function selectionClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    contains(name) { return values.has(name); },
    toggle(name, force) { const next = force === undefined ? !values.has(name) : !!force; if (next) values.add(name); else values.delete(name); return next; },
  };
}
const selectionGlide = {
  classList: selectionClassList(),
  offsetWidth: 1,
  props: {},
  style: { setProperty(name, value) { selectionGlide.props[name] = value; } },
};
const selectionPage = { querySelector(selector) { return selector === '.fnd-glide' ? selectionGlide : null; } };
const selectionList = {
  querySelectorAll(selector) { return selector === '.search-result-row' ? selectionHarness.rows : []; },
};
function selectionRowNodes(id, index) {
  const selected = id === 'b';
  const row = {
    itemId: id,
    isConnected: true,
    offsetTop: 6 + index * 64,
    offsetHeight: 64,
    classList: selectionClassList(selected ? ['selected'] : []),
    buttons: [],
    querySelectorAll(selector) { return selector === 'button' ? this.buttons : []; },
  };
  const open = {
    id: `search-result-${index}`,
    isConnected: true,
    tabIndex: selected ? 0 : -1,
    focusCalls: 0,
    scrollCalls: [],
    closest(selector) {
      if (selector === '.search-result-row') return row;
      if (selector === '#search-result-list') return selectionList;
      if (selector === '.search-page') return selectionPage;
      return null;
    },
    focus() { this.focusCalls += 1; },
    scrollIntoView(options) { this.scrollCalls.push(options); },
  };
  const details = { tabIndex: selected ? 0 : -1 };
  row.buttons = [open, details];
  return { row, open, details };
}
selectionRows.forEach((entry, index) => {
  const nodes = selectionRowNodes(entry.item.id, index);
  selectionHarness.rows.push(nodes.row);
  selectionHarness.nodes.set(nodes.open.id, nodes);
});
const originalSelectionNodes = [...selectionHarness.nodes.values()];
const selectionContext = vm.createContext({
  Router: { sync(options) { selectionHarness.syncs.push(options); } },
  document: { getElementById(id) { return selectionHarness.nodes.get(id)?.open || null; } },
  _searchRowsForState() { return selectionRows; },
});
vm.runInContext(
  `${searchPagingConstantsSource}\nlet activeSearch = { selectedId: 'b' };\n${searchResultLimitSource}\n${searchVisibleRowsSource}\n${placeRowGlideSource}\n${placeSearchGlideSource}\n${selectResultSource}\n${moveSelectionSource}\nglobalThis.__selection = { move: _searchMoveSelection, select: _searchSelectResult, state() { return activeSearch; }, setSelected(value) { activeSearch.selectedId = value; } };`,
  selectionContext,
  { filename: 'search-selection-model.js' },
);
const selection = selectionContext.__selection;
assert.equal(selection.move(1, true), true, 'production ArrowDown must select the next mounted result');
assert.equal(selection.state().selectedId, 'c');
assert.deepEqual([...selectionHarness.nodes.values()], originalSelectionNodes, 'roving selection must keep every result node mounted');
for (const [id, nodes] of [['a', originalSelectionNodes[0]], ['b', originalSelectionNodes[1]], ['c', originalSelectionNodes[2]]]) {
  const selected = id === 'c';
  assert.equal(nodes.row.classList.contains('selected'), selected, `${id} must expose the correct selected class`);
  assert.equal(nodes.open.tabIndex, selected ? 0 : -1, `${id} must expose the correct roving tab index on its title`);
  assert.equal(nodes.details.tabIndex, selected ? 0 : -1, `${id} must give its Details action the same roving tab index`);
}
assert.equal(selectionGlide.classList.contains('is-on'), true, 'the highlight must show on the selected row');
assert.equal(selectionGlide.props['--glide-y'], `${originalSelectionNodes[2].row.offsetTop}px`, 'the highlight must glide to the selected row');
assert.equal(selectionGlide.props['--glide-h'], '64px', 'the highlight must take the selected row\'s height');
assert.deepEqual(JSON.parse(JSON.stringify(selectionHarness.syncs)), [{ replace: true }], 'selection must replace the current URL instead of pushing history');
assert.equal(originalSelectionNodes[2].open.focusCalls, 1);
assert.deepEqual(JSON.parse(JSON.stringify(originalSelectionNodes[2].open.scrollCalls)), [{ block: 'nearest' }]);
assert.equal(selection.move(1, true), true, 'production selection must wrap from the final result to the first');
assert.equal(selection.state().selectedId, 'a');
assert.equal(selectionGlide.props['--glide-y'], `${originalSelectionNodes[0].row.offsetTop}px`);
assert.equal(originalSelectionNodes[0].open.focusCalls, 1);
assert.deepEqual(JSON.parse(JSON.stringify(originalSelectionNodes[0].open.scrollCalls)), [{ block: 'nearest' }]);
assert.equal(selection.move(-1, true), true, 'production ArrowUp must reverse-wrap from the first result to the final result');
assert.equal(selection.state().selectedId, 'c');
assert.equal(originalSelectionNodes[2].open.focusCalls, 2);
assert.deepEqual(JSON.parse(JSON.stringify(originalSelectionNodes[2].open.scrollCalls)), [{ block: 'nearest' }, { block: 'nearest' }]);
selection.setSelected(null);
assert.equal(selection.move(1, true, 'first'), true, 'query ArrowDown edge mode must enter the first result instead of skipping it');
assert.equal(selection.state().selectedId, 'a');
assert.equal(selection.move(0, true, 'last'), true, 'End edge mode must select the final result');
assert.equal(selection.state().selectedId, 'c');
assert.equal(selection.move(0, true, 'first'), true, 'Home edge mode must select the first result');
assert.equal(selection.state().selectedId, 'a');
assert.equal(originalSelectionNodes[0].open.focusCalls, 3, 'first-edge entry and Home must focus the first mounted row');
assert.equal(originalSelectionNodes[2].open.focusCalls, 3, 'last-edge entry must focus the final mounted row');
assert.equal(originalSelectionNodes[0].open.scrollCalls.length, 3);
assert.equal(originalSelectionNodes[2].open.scrollCalls.length, 3);
assert.deepEqual(JSON.parse(JSON.stringify(selectionHarness.syncs)), Array.from({ length: 6 }, () => ({ replace: true })), 'forward, reverse, and edge roving must never add browser-history entries');
// Focus on a row's Details action selects its row without pulling focus away.
assert.equal(selection.select(selectionRows[1], 1, originalSelectionNodes[1].open, { focus: false }), true);
assert.equal(selection.state().selectedId, 'b');
assert.equal(originalSelectionNodes[1].open.focusCalls, 0, 'selecting a row from its Details action must leave focus on Details');
assert.equal(originalSelectionNodes[1].row.classList.contains('selected'), true);
const effectsBeforeMissing = { syncs: selectionHarness.syncs.length, glide: selectionGlide.props['--glide-y'] };
selectionHarness.nodes.delete('search-result-2');
assert.equal(selection.move(1, true), false, 'a missing mounted target must fail without selecting a different row');
assert.equal(selection.state().selectedId, 'b');
assert.deepEqual({ syncs: selectionHarness.syncs.length, glide: selectionGlide.props['--glide-y'] }, effectsBeforeMissing);
const disconnected = originalSelectionNodes[0].open;
disconnected.isConnected = false;
assert.equal(selection.select(selectionRows[0], 0, disconnected), false, 'a disconnected result must fail without effects');
assert.deepEqual({ syncs: selectionHarness.syncs.length, glide: selectionGlide.props['--glide-y'] }, effectsBeforeMissing);

const i18nSource = extractBetween('const I18N = {', '\nfunction tr(');
const i18nContext = vm.createContext({});
vm.runInContext(`${i18nSource}\nglobalThis.__I18N = I18N;`, i18nContext, { filename: 'search-recovery-i18n.js' });
for (const key of [
  'search.title',
  'search.subtitle',
  'search.inputPlaceholder',
  'search.activeFilterCount',
  'search.clearFilters',
  'search.resultCountOne',
  'search.resultCount',
  'search.showingResults',
  'search.showMore',
  'search.open',
  'search.details',
  'search.detailsItem',
  'search.resultWord',
  'search.noResultsIn',
  'search.nothingIn',
  'search.resultOpenAria',
  'search.resultDetailsAria',
  'search.recoveryUnavailable',
]) {
  const en = i18nContext.__I18N.en[key];
  const zhTW = i18nContext.__I18N['zh-TW'][key];
  assert.ok(en?.trim(), `English Search recovery copy must define ${key}`);
  assert.ok(zhTW?.trim(), `zh-TW Search recovery copy must define ${key}`);
  assert.notEqual(zhTW, en, `zh-TW Search recovery copy must be native for ${key}`);
}
assert.equal(i18nContext.__I18N['zh-TW']['search.showingResults'], '已顯示 {shown} 個，共 {total} 個結果');
assert.equal(i18nContext.__I18N['zh-TW']['search.showMore'], '再顯示 {count} 個結果');
assert.equal(i18nContext.__I18N['zh-TW']['search.activeFilterCount'], '已套用 {count} 項');
assert.equal(i18nContext.__I18N['zh-TW']['search.clearFilters'], '清除篩選條件');
assert.equal(i18nContext.__I18N.en['landing.searchPlaceholder'], 'Search saved work…');
assert.equal(i18nContext.__I18N.en['landing.searchSaved'], 'Search saved work');
assert.equal(i18nContext.__I18N['zh-TW']['landing.searchPlaceholder'], '搜尋已儲存內容…');
assert.equal(i18nContext.__I18N['zh-TW']['landing.searchSaved'], '搜尋已儲存內容');
for (const key of ['landing.subtitle', 'landing.noResults', 'landing.savedResults', 'landing.inboxUnavailable']) {
  assert.equal(key in i18nContext.__I18N.en || key in i18nContext.__I18N['zh-TW'], false,
    `${key} must be gone with the retired launch field`);
}

const stateContext = vm.createContext({});
vm.runInContext(
  `${searchPagingConstantsSource}\n${searchResultLimitSource}\n${searchStateSource}\n${searchRouteSource}\n${searchDetailRouteSource}\nglobalThis.__searchState = { searchResultLimit, searchStateFromQuery, searchRouteQuery, searchDetailRoute };`,
  stateContext,
  { filename: 'search-recovery-route.js' },
);
assert.equal(stateContext.__searchState.searchStateFromQuery({}).filtersOpen, false, 'filters must be collapsed by default');
assert.equal(stateContext.__searchState.searchStateFromQuery({ filters: '1' }).filtersOpen, true, 'an explicit URL state must reopen filters');
assert.equal(stateContext.__searchState.searchRouteQuery({ filtersOpen: true }).filters, '1', 'open-filter state must survive reload/back-forward');
assert.equal(stateContext.__searchState.searchRouteQuery({ filtersOpen: false }).filters, undefined, 'collapsed filters must keep the default URL quiet');

const hiddenFilterContext = vm.createContext({});
vm.runInContext(
  `${hiddenFilterCountSource}\n${filtersActiveSource}\n${filterResetPatchSource}\nglobalThis.__filterControls = { searchHiddenFilterCount, searchFiltersActive, searchFilterResetPatch };`,
  hiddenFilterContext,
  { filename: 'search-filter-controls.js' },
);
const hiddenFilterCount = state => hiddenFilterContext.__filterControls.searchHiddenFilterCount(state);
const filtersActive = state => hiddenFilterContext.__filterControls.searchFiltersActive(state);
assert.equal(hiddenFilterCount(null), 0, 'missing Search state must not invent an active filter');
assert.equal(hiddenFilterCount({ spaceId: 'all', time: 'any', hasTags: false, tag: '' }), 0, 'default hidden filters must keep the toggle quiet');
assert.equal(hiddenFilterCount({ spaceId: 'space-a', time: 'any', hasTags: false, tag: '' }), 1, 'one scoped Space must count once');
assert.equal(hiddenFilterCount({ spaceId: 'space-a', time: 'week', hasTags: false, tag: 'Research' }), 3, 'Space, time, and tag dimensions must each count once');
assert.equal(hiddenFilterCount({ spaceId: 'all', time: 'any', hasTags: true, tag: 'Research' }), 1, 'tag value and Has tags must remain one hidden tag dimension even for defensive mixed state');
assert.equal(hiddenFilterCount({ spaceId: 'all', time: 'any', hasTags: false, tag: '', query: 'needle', type: 'note', sort: 'recent' }), 0, 'visible query, content type, and sort controls must not inflate the hidden count');
assert.equal(filtersActive(null), false, 'missing Search state must not enable Clear filters');
assert.equal(filtersActive({ type: 'all', spaceId: 'all', time: 'any', hasTags: false, tag: '', query: 'needle', sort: 'recent' }), false, 'query and sorting must not enable a filter reset');
for (const state of [
  { type: 'note', spaceId: 'all', time: 'any', hasTags: false, tag: '' },
  { type: 'all', spaceId: 'space-a', time: 'any', hasTags: false, tag: '' },
  { type: 'all', spaceId: 'all', time: 'week', hasTags: false, tag: '' },
  { type: 'all', spaceId: 'all', time: 'any', hasTags: true, tag: '' },
  { type: 'all', spaceId: 'all', time: 'any', hasTags: false, tag: 'Research' },
]) assert.equal(filtersActive(state), true, 'every result-narrowing filter dimension must enable Clear filters');
assert.deepEqual(
  JSON.parse(JSON.stringify(hiddenFilterContext.__filterControls.searchFilterResetPatch())),
  { type: 'all', spaceId: 'all', time: 'any', hasTags: false, tag: '', selectedId: null },
  'Clear filters must reset only filter dimensions and selection; query, sort, and panel visibility stay outside the patch while _searchSet owns the established result-window reset',
);
assert.equal(stateContext.__searchState.searchStateFromQuery({}).resultLimit, 100, 'Search must start with one bounded result batch');
assert.equal(stateContext.__searchState.searchStateFromQuery({ shown: '300' }).resultLimit, 300, 'an expanded URL window must survive reload/back-forward');
assert.equal(stateContext.__searchState.searchRouteQuery({ resultLimit: 300 }).shown, '300');
assert.equal(stateContext.__searchState.searchRouteQuery({ resultLimit: 100 }).shown, undefined, 'the default result window must keep the URL quiet');
for (const invalid of ['0', '99', '101', '250', '-100', 'nope', 'Infinity']) {
  const normalized = stateContext.__searchState.searchStateFromQuery({ shown: invalid });
  assert.equal(normalized.resultLimit, 100, `invalid result window ${invalid} must fail back to one batch`);
  assert.equal(stateContext.__searchState.searchRouteQuery(normalized).shown, undefined);
}
const fullQuery = {
  q: '研究 & recovery?',
  type: 'note',
  space: 'space/with reserved?',
  time: 'week',
  tags: '1',
  tag: '待處理 & urgent',
  sort: 'recent',
  item: 'item/with reserved?',
  filters: '1',
  shown: '300',
};
const fullState = stateContext.__searchState.searchStateFromQuery(fullQuery);
assert.deepEqual(JSON.parse(JSON.stringify(stateContext.__searchState.searchRouteQuery(fullState))), fullQuery, 'every Search query/filter/selection field must survive parse and rebuild');
const detailRoute = stateContext.__searchState.searchDetailRoute(fullState, 'workspace/工作?', fullState.selectedId, true);
assert.deepEqual(JSON.parse(JSON.stringify(detailRoute)), {
  type: 'search', wsId: 'workspace/工作?', query: { ...fullQuery, detail: '1' },
}, 'Search Details must preserve every query/filter/selection field on its own route');
const detailState = stateContext.__searchState.searchStateFromQuery(detailRoute.query);
const closedRoute = stateContext.__searchState.searchDetailRoute(detailState, detailRoute.wsId, detailState.selectedId, false);
assert.deepEqual(JSON.parse(JSON.stringify(closedRoute)), {
  type: 'search', wsId: 'workspace/工作?', query: fullQuery,
}, 'closing Search Details must return to the exact selected Search state');
assert.equal(stateContext.__searchState.searchStateFromQuery({ detail: '1' }).detailOpen, false, 'a detail flag without an exact selected item must fail closed');

const closeHarness = { routes: [], navigateResult: true, pending: false };
const closeContext = vm.createContext({
  isItemDetailMutationPending() { return closeHarness.pending; },
  activeWs() { return { id: 'workspace/工作?' }; },
  activeCat() { return null; },
  getViewMode() { return 'board'; },
  State: { get() { return { activeWsId: 'workspace/工作?' }; } },
  Router: {
    navigate(route, options) {
      closeHarness.routes.push({ route, options });
      return closeHarness.navigateResult;
    },
  },
});
vm.runInContext(
  `${searchPagingConstantsSource}\n${searchResultLimitSource}\nlet activeSearch = null; let activeGroupPage = null; let activeLibraryMode = null; let activeHome = false;\n${searchRouteSource}\n${searchDetailRouteSource}\n${closeDetailSource}\nglobalThis.__close = { run: closeItemDetail, setSearch(value) { activeSearch = value; } };`,
  closeContext,
  { filename: 'search-detail-close-model.js' },
);
closeContext.__close.setSearch(detailState);
assert.equal(closeContext.__close.run(), true, 'production closeItemDetail must take the Search-owned branch');
assert.deepEqual(JSON.parse(JSON.stringify(closeHarness.routes)), [{ route: JSON.parse(JSON.stringify(closedRoute)), options: { persist: false } }], 'production close must preserve the full Search state and request no durable persistence');
closeHarness.routes.length = 0;
closeHarness.navigateResult = false;
assert.equal(closeContext.__close.run(), false, 'a refused Search close route must report failure');
assert.equal(closeHarness.routes.length, 1, 'a refused Search close must make only one exact navigation attempt');
closeHarness.routes.length = 0;
closeHarness.pending = true;
assert.equal(closeContext.__close.run(), false, 'a pending item mutation must interlock Search close');
assert.equal(closeHarness.routes.length, 0, 'an interlocked close must not navigate');

const applyItem = {
  id: fullState.selectedId,
  type: 'note',
  html: `<p>${fullState.query}</p>`,
  notes: '',
  tags: [fullState.tag],
  createdAt: Date.now(),
};
const applyGroup = { id: 'group-search', name: 'Recovery', items: [applyItem] };
const applySpace = { id: fullState.spaceId, name: 'Research', groups: [applyGroup] };
const applyWorkspace = {
  id: detailRoute.wsId,
  name: 'Work',
  activeCatId: applySpace.id,
  categories: [applySpace],
};
const applyHarness = {
  state: { activeWsId: applyWorkspace.id, workspaces: [applyWorkspace] },
  persists: 0,
};
const applyContext = vm.createContext({
  State: {
    get() { return applyHarness.state; },
    persist() { applyHarness.persists += 1; },
  },
  activeWs() { return applyHarness.state.workspaces.find(workspace => workspace.id === applyHarness.state.activeWsId) || null; },
  tr(key) { return key; },
  dispUrl(value) { return String(value || ''); },
  URL,
});
vm.runInContext(
  `let activeSearch = null; let activeHome = false; let activeGroupPage = null; let activeCalendar = null; let activeLibraryMode = null; let boardDetailItemId = null;\n${collectItemsSource}\n${uniqueResolverSource}\n${searchConstantsSource}\n${parseSearchSource}\n${plainSearchHtmlSource}\n${notePartsSource}\n${itemTitleSource}\n${itemBlobSource}\n${itemMatchesSource}\n${timeCutoffSource}\n${searchScoreSource}\n${rowsForStateSource}\n${searchPagingConstantsSource}\n${searchResultLimitSource}\n${searchVisibleRowsSource}\n${searchStateSource}\n${searchRouteSource}\n${reconcileSelectionSource}\n${routerApplySource}\nglobalThis.__apply = { run: apply, snapshot() { return { activeSearch, boardDetailItemId }; }, renderBoundary() { const rows = searchVisibleRows(activeSearch); const selected = reconcileSearchSelection(activeSearch, rows); return { rowCount: rows.length, selectedId: selected?.item?.id || null, routeQuery: searchRouteQuery(activeSearch), activeSearch, boardDetailItemId }; } };`,
  applyContext,
  { filename: 'search-detail-apply-model.js' },
);
assert.equal(applyContext.__apply.run(closedRoute), true, 'the base Search history entry must initialize production route state');
let rendered = JSON.parse(JSON.stringify(applyContext.__apply.renderBoundary()));
assert.equal(rendered.rowCount, 1, 'the production Search matcher fixture must actually satisfy every query/type/Space/time/tag filter');
assert.equal(rendered.selectedId, fullState.selectedId);
assert.equal(applyContext.__apply.run(detailRoute), true, 'the production Router must open exact Search Details');
let applied = JSON.parse(JSON.stringify(applyContext.__apply.snapshot()));
assert.equal(applied.boardDetailItemId, fullState.selectedId);
assert.equal(applied.activeSearch.detailOpen, true);
assert.deepEqual(JSON.parse(JSON.stringify(stateContext.__searchState.searchRouteQuery(applied.activeSearch))), JSON.parse(JSON.stringify(detailRoute.query)));
rendered = JSON.parse(JSON.stringify(applyContext.__apply.renderBoundary()));
assert.equal(rendered.selectedId, fullState.selectedId, 'render canonicalization must retain a genuinely matching open detail result');
assert.equal(rendered.boardDetailItemId, fullState.selectedId);
assert.equal(applyContext.__apply.run(closedRoute), true, 'production close application must clear Details');
applied = JSON.parse(JSON.stringify(applyContext.__apply.snapshot()));
assert.equal(applied.boardDetailItemId, null);
assert.equal(applied.activeSearch.detailOpen, false);
assert.deepEqual(JSON.parse(JSON.stringify(stateContext.__searchState.searchRouteQuery(applied.activeSearch))), fullQuery, 'close application must retain the complete query/filter/selection state');
assert.equal(applyContext.__apply.run(detailRoute), true);
assert.equal(applyContext.__apply.run(closedRoute), true, 'applying the prior Search history entry must model browser Back from Details');
applied = JSON.parse(JSON.stringify(applyContext.__apply.snapshot()));
assert.equal(applied.boardDetailItemId, null);
assert.deepEqual(JSON.parse(JSON.stringify(stateContext.__searchState.searchRouteQuery(applied.activeSearch))), fullQuery, 'Back must restore the exact prior Search state');
assert.equal(applyHarness.persists, 0, 'Search detail route application must never persist durable state');
assert.equal(applyContext.__apply.run(detailRoute), true);
assert.equal(applyContext.__apply.run({ type: 'search', wsId: 'missing-workspace', query: detailRoute.query }), true);
applied = JSON.parse(JSON.stringify(applyContext.__apply.snapshot()));
assert.equal(applied.boardDetailItemId, null, 'an unknown route Workspace must fail closed instead of borrowing the active Workspace');
assert.equal(applied.activeSearch.detailOpen, false);

const queryWithoutSelection = { ...fullQuery };
delete queryWithoutSelection.item;
function assertRetainedItemStopsMatching(label, mutate) {
  assert.equal(applyContext.__apply.run(detailRoute), true, `${label}: the restored matching item must reopen exact Details`);
  const before = JSON.parse(JSON.stringify(applyContext.__apply.renderBoundary()));
  assert.equal(before.rowCount, 1, `${label}: the retained fixture must match before mutation`);
  assert.equal(before.boardDetailItemId, fullState.selectedId);
  const restore = mutate();
  const after = JSON.parse(JSON.stringify(applyContext.__apply.renderBoundary()));
  const retained = applyWorkspace.categories.some(space =>
    space.groups.some(group => group.items.includes(applyItem))
  );
  assert.equal(retained, true, `${label}: the item must remain in the graph`);
  assert.equal(after.rowCount, 0, `${label}: the production matcher must remove the retained nonmatching item`);
  assert.equal(after.activeSearch.selectedId, null, `${label}: selectedId must fail closed`);
  assert.equal(after.activeSearch.detailOpen, false, `${label}: detailOpen must fail closed`);
  assert.equal(after.boardDetailItemId, null, `${label}: the sheet target must fail closed`);
  assert.deepEqual(after.routeQuery, queryWithoutSelection, `${label}: item/detail URL state must clear together`);
  restore();
}
assertRetainedItemStopsMatching('query predicate', () => {
  const previous = applyItem.html;
  applyItem.html = '<p>unrelated words</p>';
  return () => { applyItem.html = previous; };
});
assertRetainedItemStopsMatching('type predicate', () => {
  const previous = applyItem.type;
  applyItem.type = 'todo';
  return () => { applyItem.type = previous; };
});
assertRetainedItemStopsMatching('Space predicate', () => {
  const movedGroup = { id: 'moved-group', name: 'Moved', items: [applyItem] };
  const movedSpace = { id: 'different-space', name: 'Different', groups: [movedGroup] };
  applyGroup.items = [];
  applyWorkspace.categories.push(movedSpace);
  return () => {
    applyWorkspace.categories.pop();
    applyGroup.items = [applyItem];
  };
});
assertRetainedItemStopsMatching('time predicate', () => {
  const previous = applyItem.createdAt;
  applyItem.createdAt = Date.now() - 8 * 86400000;
  return () => { applyItem.createdAt = previous; };
});
assertRetainedItemStopsMatching('tag predicate', () => {
  const previous = applyItem.tags;
  applyItem.tags = ['different-tag'];
  return () => { applyItem.tags = previous; };
});
assert.equal(applyContext.__apply.run(detailRoute), true);
applyGroup.items = [];
rendered = JSON.parse(JSON.stringify(applyContext.__apply.renderBoundary()));
assert.equal(rendered.rowCount, 0, 'the production render boundary must observe an item that no longer matches/exits');
assert.equal(rendered.selectedId, null);
assert.equal(rendered.activeSearch.selectedId, null, 'a removed or filtered-out item must clear selectedId');
assert.equal(rendered.activeSearch.detailOpen, false, 'a removed or filtered-out item must clear detailOpen');
assert.equal(rendered.boardDetailItemId, null, 'a removed or filtered-out item must clear the detail sheet target');
assert.deepEqual(rendered.routeQuery, queryWithoutSelection, 'render canonicalization must remove stale item/detail URL state together while retaining the query and filters');

const cappedApplyItems = Array.from({ length: 100 }, (_, index) => ({
  id: `cap-note-${index}`,
  type: 'note',
  html: `<p>${fullState.query}</p>`,
  notes: '',
  tags: [fullState.tag],
  createdAt: applyItem.createdAt + 1000 + index,
}));
applyGroup.items = [...cappedApplyItems, applyItem];
const defaultCappedDetailRoute = JSON.parse(JSON.stringify(detailRoute));
delete defaultCappedDetailRoute.query.shown;
applyContext.__apply.run(defaultCappedDetailRoute);
rendered = JSON.parse(JSON.stringify(applyContext.__apply.renderBoundary()));
assert.equal(rendered.rowCount, 100, 'the default Search window must remain a bounded 100-result batch');
assert.equal(rendered.selectedId, null, 'a route-selected item outside the current window must fail closed instead of becoming invisible');
assert.equal(rendered.activeSearch.selectedId, null);
assert.equal(rendered.activeSearch.detailOpen, false);
assert.equal(rendered.boardDetailItemId, null);
const defaultCappedQueryWithoutSelection = { ...queryWithoutSelection };
delete defaultCappedQueryWithoutSelection.shown;
assert.deepEqual(rendered.routeQuery, defaultCappedQueryWithoutSelection, 'the default window must remove hidden item/detail URL state without inventing continuation state');
assert.equal(applyContext.__apply.run(detailRoute), true, 'an expanded Search history entry must reveal result 101');
rendered = JSON.parse(JSON.stringify(applyContext.__apply.renderBoundary()));
assert.equal(rendered.rowCount, 101, 'the expanded window must expose every available row up to its URL-backed limit');
assert.equal(rendered.selectedId, fullState.selectedId, 'a revealed route-selected item must remain exact and visible');
assert.equal(rendered.activeSearch.detailOpen, true);
assert.equal(rendered.boardDetailItemId, fullState.selectedId);
assert.equal(rendered.routeQuery.shown, '300', 'render canonicalization must preserve the expanded result window');

const rebuiltSearchRow = { id: 'rebuilt-search-row' };
const focusHarness = { targets: [], selectors: [] };
const focusContext = vm.createContext({
  restoreOpener() { return false; },
  document: {
    querySelector(selector) {
      focusHarness.selectors.push(selector);
      return selector === `[data-item-id="${fullState.selectedId}"][tabindex]` ? rebuiltSearchRow : null;
    },
    getElementById() { return null; },
  },
  focusItemDetailTarget(target) {
    focusHarness.targets.push(target);
    return target === rebuiltSearchRow;
  },
});
vm.runInContext(`${restoreDetailFocusSource}\nglobalThis.__restoreFocus = restoreItemDetailFocus;`, focusContext, { filename: 'search-detail-focus-model.js' });
focusContext.__restoreFocus({}, fullState.selectedId, '');
assert.equal(focusHarness.targets.length, 1, 'Search detail return must make one focus attempt');
assert.equal(focusHarness.targets[0], rebuiltSearchRow, 'Search detail return must focus the rebuilt exact result row');
assert.ok(focusHarness.selectors.includes(`[data-item-id="${fullState.selectedId}"][tabindex]`));
const invalidDefaults = stateContext.__searchState.searchStateFromQuery({
  type: 'unknown', time: 'forever', sort: 'magic', tags: '0', filters: '0',
});
assert.equal(invalidDefaults.type, 'all');
assert.equal(invalidDefaults.time, 'any');
assert.equal(invalidDefaults.sort, 'best');
assert.equal(invalidDefaults.hasTags, false);
assert.equal(invalidDefaults.filtersOpen, false);
assert.deepEqual(JSON.parse(JSON.stringify(stateContext.__searchState.searchRouteQuery(invalidDefaults))), {}, 'default and invalid enum state must elide from the URL');

const routerContext = vm.createContext({ encodeURIComponent, decodeURIComponent });
vm.runInContext(
  `${routerParseSource}\n${routerBuildSource}\nglobalThis.__router = { parse, build };`,
  routerContext,
  { filename: 'search-router-roundtrip.js' },
);
const encodedDetailHash = routerContext.__router.build(detailRoute);
assert.deepEqual(
  JSON.parse(JSON.stringify(routerContext.__router.parse(encodedDetailHash))),
  JSON.parse(JSON.stringify(detailRoute)),
  'the production Router must encode and parse the full Search Details route without losing reserved or zh-TW text',
);
const encodedClosedHash = routerContext.__router.build(closedRoute);
assert.deepEqual(
  JSON.parse(JSON.stringify(routerContext.__router.parse(encodedClosedHash))),
  JSON.parse(JSON.stringify(closedRoute)),
  'the production Router must restore the exact Search route after closing Details or going Back',
);

console.log('Search recovery contracts passed');
