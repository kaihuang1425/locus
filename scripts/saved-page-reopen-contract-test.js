'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');

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

const reopenBlock = extractBetween(
  'const SAVED_TAB_REOPEN_OUTCOMES =',
  '\nasync function copySavedTabUrl(',
);
const productionSource = [
  extractFunction('collectWorkspaceItems'),
  extractFunction('itemDetailValueFingerprint'),
  extractFunction('itemDetailLocationFingerprint'),
  extractFunction('resolveUniqueHomePreviewItem'),
  extractFunction('createSavedItemRecoveryContext'),
  extractFunction('resolveSavedItemRecoveryTarget'),
  extractFunction('createLandingRecoveryContext'),
  extractFunction('resolveLandingRecoveryTarget'),
  extractFunction('reportSearchRecoveryUnavailable'),
  extractFunction('activateLandingRecovery'),
  extractFunction('organizationGroupTarget'),
  extractFunction('identitySpaceTarget'),
  extractFunction('identityGroupTarget'),
  extractFunction('buildSuspendedUrl'),
  extractFunction('isOpenableSavedTabUrl'),
  extractFunction('groupHasReopenableSavedTab'),
  reopenBlock,
  extractFunction('openGroupAll'),
].join('\n');

function testIndividualSurfaceConvergence() {
  const surfaces = [
    'openHomeTrailSavedTab',
    'buildTab',
    '_searchOpenPrimary',
    'renderItemDetail',
    'explorerItemRow',
    'renderGraphView',
    'setupOpenTabsDropToOpen',
  ];
  const surfaceSources = surfaces.map(name => [name, extractFunction(name)]);
  for (const [name, functionSource] of surfaceSources) {
    assert.match(functionSource, /openSavedTabItem\(/, `${name} must use the shared exact saved-page coordinator`);
    assert.doesNotMatch(functionSource, /openTabMaybeHibernated\(|window\.open\(/, `${name} must not bypass Reopen safety`);
  }
  const landingSurface = extractFunction('paintLandingResults');
  const landingActivation = extractFunction('activateLandingRecovery');
  assert.match(landingSurface, /createLandingRecoveryContext\(/,
    'Landing must capture the exact visible saved-page result');
  assert.match(landingSurface, /activateLandingRecovery\(/,
    'Landing must activate through exact visible-result recovery');
  assert.match(landingActivation, /resolveLandingRecoveryTarget\(context\)[\s\S]*openSavedTabItem\(/,
    'Landing recovery must re-resolve the visible save before using the shared coordinator');
  assert.doesNotMatch(`${landingSurface}\n${landingActivation}`,
    /openTabMaybeHibernated\(|window\.open\(/,
    'Landing must not bypass Reopen safety');
  const librarySurface = extractFunction('renderLibrarySurface');
  const readLaterSurface = extractFunction('renderReadLaterSurface');
  const libraryLedger = extractFunction('renderLibraryLedgerSurface');
  const libraryRow = extractFunction('buildLibraryLedgerRow');
  const libraryActivation = extractFunction('activateLibraryRecovery');
  assert.match(librarySurface, /renderLibraryLedgerSurface\(|renderReadLaterSurface\(/,
    'All Links, Favorites, and Read Later must converge on the shared Library ledger');
  assert.match(readLaterSurface, /renderLibraryLedgerSurface\(/,
    'Read Later must delegate to the shared Library ledger');
  assert.match(libraryLedger, /buildLibraryLedgerRow\(/,
    'the shared Library ledger must render the exact recovery-row controller');
  assert.match(libraryRow, /activateLibraryRecovery\(recovery,\s*'open'/,
    'the visible Library Open page action must dispatch through exact recovery');
  assert.match(libraryActivation, /resolveLibraryRecoveryTarget\(context\)[\s\S]*openSavedTabItem\(/,
    'Library recovery must re-resolve the exact visible save before using the shared coordinator');
  assert.doesNotMatch(`${librarySurface}\n${readLaterSurface}\n${libraryLedger}\n${libraryRow}\n${libraryActivation}`,
    /openTabMaybeHibernated\(|window\.open\(/,
    'no Library delegation layer may bypass Reopen safety');
  const buildTabSource = surfaceSources.find(([name]) => name === 'buildTab')[1];
  assert.match(
    buildTabSource,
    /itemAction\.openBackground[\s\S]*openSavedTabItem\(it,\s*\{\s*focus:\s*false,\s*reuse:\s*false/,
    'the secondary Open in background action must preserve a deliberate new-tab disposition',
  );
  const bulkFacade = extractFunction('openSavedTabItems');
  const bulkReporter = extractFunction('reportBulkSavedTabReopenResult');
  const bulkRecovery = extractFunction('showBulkSavedTabReopenRecovery');
  const groupBulkOpen = extractFunction('openGroupAll');
  assert.match(groupBulkOpen, /openSavedTabItems\(/,
    'Group Open all must use the shared bulk Reopen coordinator');
  assert.match(groupBulkOpen, /identityGroupTarget\(group\?\.id\)/,
    'Group Open all must resolve the exact rendered Group instead of a first ID match');
  assert.doesNotMatch(groupBulkOpen, /findGroup\(/,
    'Group Open all must never borrow the first duplicate Group ID');
  assert.match(extractFunction('runBatchAction'), /openSavedTabItems\(/,
    'selection Open must use the shared bulk Reopen coordinator');
  assert.match(bulkFacade, /aria-busy/,
    'bulk Reopen must expose pending work on the initiating control');
  assert.match(bulkReporter, /showBulkSavedTabReopenRecovery/,
    'a result that needs recovery must remain visible beside its initiating control');
  assert.match(bulkRecovery, /setAttribute\('role',\s*'status'\)/,
    'persistent bulk recovery must announce through an inline status region');
  assert.match(bulkRecovery, /bulkReopen\.dismiss/,
    'persistent bulk recovery must provide an explicit dismiss action');
  assert.doesNotMatch(source, /openAllHibernated/,
    'the old blind bulk tab creator must be removed');
  assert.match(extractFunction('groupActionMenuItems'), /openGroupAll\(group,\s*opener\)/,
    'the shared Board and List Group menu must preserve its actual opener');
  assert.match(extractFunction('groupActionMenuItems'),
    /groupHasReopenableSavedTab\(identity\.group\)[\s\S]*canOpenAll\s*\?\s*\[\{\s*text:\s*tr\('groupAction\.openAll'\)/,
    'Group menus must omit Open all when no saved page can reopen');
  assert.match(extractFunction('buildGroupCol'), /openGroupAll\(g,\s*btn\)/,
    'the persistent Board Open all control must preserve its actual opener');
  assert.match(extractFunction('buildGroupCol'),
    /groupHasReopenableSavedTab\(g\)[\s\S]*data-act="open-all"[\s\S]*disabled aria-disabled="true"/,
    'Board Open all must expose its unavailable state natively and to assistive technology');
  assert.match(extractFunction('buildLvGroup'), /openGroupAll\(g,\s*event\.currentTarget\)/,
    'the persistent List Open all control must preserve its actual opener');
  assert.match(extractFunction('buildLvGroup'),
    /groupHasReopenableSavedTab\(g\)[\s\S]*data-act="open-all"[\s\S]*disabled aria-disabled="true"/,
    'List Open all must expose its unavailable state natively and to assistive technology');
  const selectionToolbar = extractFunction('renderItemSelToolbar');
  assert.match(selectionToolbar, /canOpenSavedTabs/,
    'selection Open must visibly disable when no selected saved tab is eligible');
  assert.match(selectionToolbar, /selection\.openUnavailable/,
    'an unavailable selection Open control must explain why');
  assert.match(css, /button\[aria-busy="true"\]::after[\s\S]*bulk-reopen-spin/,
    'bulk Reopen must have a visible progress treatment');
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*button\[aria-busy="true"\]::after/,
    'bulk progress must retain a reduced-motion treatment');
  assert.match(css, /\.bulk-reopen-result[\s\S]*\.bulk-reopen-result-dismiss/,
    'required recovery must render as a dismissible inline status');
  assert.match(css, /\.gcol-btn:disabled[\s\S]*\.lv-act-btn:disabled/,
    'unavailable Board and List Open-all controls must look unavailable as well as being semantically disabled');
  assert.match(css, /#toast\[data-tone="error"\] #toast-mark::before,[\s\S]*#toast\.danger #toast-mark::before\s*\{\s*content:\s*'×'/,
    'error fallback feedback must use a distinct error mark instead of the success check');
}

function testSelectionOpenEligibility() {
  const renderSource = extractFunction('renderItemSelToolbar');
  const renderOpenTag = infos => {
    let toolbar = null;
    const context = vm.createContext({
      URL,
      selectedItemIds: new Set(infos.map((_, index) => `selected-${index}`)),
      getSelectedItemsInfo: () => infos,
      tr: key => key,
      esc: value => String(value),
      runBatchAction() {},
      document: {
        getElementById() { return toolbar; },
        createElement() {
          toolbar = {
            html: '',
            setAttribute() {},
            set innerHTML(value) { this.html = value; },
            get innerHTML() { return this.html; },
            querySelectorAll() { return []; },
          };
          return toolbar;
        },
        body: { appendChild() {} },
      },
    });
    vm.runInContext(
      `${extractFunction('isOpenableSavedTabUrl')}\n${renderSource}\nrenderItemSelToolbar();`,
      context,
      { filename: 'selection-open-eligibility.js' },
    );
    return toolbar.html.match(/<button type="button" data-act="open"[^>]*>/)?.[0] || '';
  };

  const unsafeOnly = renderOpenTag([
    { item: { id: 'unsafe', type: 'tab', url: 'javascript:alert(1)' } },
  ]);
  assert.match(unsafeOnly, /disabled aria-disabled="true"/,
    'an unsafe-only saved-page selection must not advertise an Open action');

  const mixed = renderOpenTag([
    { item: { id: 'unsafe', type: 'tab', url: 'data:text/html,private' } },
    { item: { id: 'safe', type: 'tab', url: 'https://example.test/recover' } },
  ]);
  assert.doesNotMatch(mixed, /\sdisabled(?:\s|>)/,
    'a mixed selection must keep Open available for its recoverable page');
}

function makeFixture(url = 'https://example.com/recover') {
  const item = { id: 'item-1', type: 'tab', title: 'Recover me', url };
  const group = { id: 'group-1', name: 'Inbox', items: [item] };
  const space = { id: 'space-1', name: 'Research', groups: [group] };
  const workspace = { id: 'workspace-1', name: 'Desk', categories: [space] };
  return {
    item,
    state: { activeWsId: workspace.id, settings: { hibernate: false }, workspaces: [workspace] },
  };
}

function loadApi(fixture, chromeBrowser = undefined, hooks = { toasts: [] }, lockManager = undefined) {
  const context = vm.createContext({
    URL,
    URLSearchParams,
    Map,
    Promise,
    chrome: chromeBrowser,
    navigator: lockManager ? { locks: lockManager } : {},
    State: { get: () => fixture.state },
    activeWs: () => fixture.state.workspaces.find(workspace => workspace.id === fixture.state.activeWsId),
    favUrl: () => '',
    toast: (message, options) => hooks.toasts.push({ message, options }),
    tr: key => key,
    requestAnimationFrame: callback => callback(),
    closeLandingLayer: options => hooks.landingClosures?.push(options),
    document: hooks.document,
  });
  vm.runInContext(
    `${productionSource}\nglobalThis.__api = {
      requestSavedTabReopen,
      openSavedTabItem,
      createLandingRecoveryContext,
      resolveLandingRecoveryTarget,
      activateLandingRecovery,
      requestBulkSavedTabReopen: typeof requestBulkSavedTabReopen === 'function'
        ? requestBulkSavedTabReopen
        : null,
      openSavedTabItems: typeof openSavedTabItems === 'function'
        ? openSavedTabItems
        : null,
      currentBulkSavedTabReopen: () => typeof bulkSavedTabReopenInFlight === 'undefined'
        ? null
        : bulkSavedTabReopenInFlight,
      bulkSavedTabReopenResult,
      reportBulkSavedTabReopenResult,
      groupHasReopenableSavedTab,
      openGroupAll,
    };`,
    context,
    { filename: 'saved-page-reopen-production.js' },
  );
  return context.__api;
}

async function testGroupOpenAvailabilityTracksReopenablePages() {
  const fixture = makeFixture();
  const group = fixture.state.workspaces[0].categories[0].groups[0];
  group.items = [];
  const browser = makeBrowser();
  const api = loadApi(fixture, browser);

  assert.equal(api.groupHasReopenableSavedTab(group), false,
    'the default empty Inbox must not advertise a usable Open all action');
  group.items.push(
    { id: 'note-1', type: 'note', html: '<p>Local note</p>' },
    {
      id: 'stack-1',
      type: 'stack',
      items: [
        { id: 'unsafe-1', type: 'tab', title: 'Unsafe legacy page', url: 'javascript:alert(1)' },
        { id: 'stack-2', type: 'stack', items: [fixture.item] },
      ],
    },
  );
  assert.equal(api.groupHasReopenableSavedTab(group), true,
    'one nested reopenable page must make Group Open all available');
  assert.equal(api.openGroupAll(group), true,
    'an available Group action must dispatch through the shared bulk coordinator');
  await api.currentBulkSavedTabReopen().promise;
  assert.equal(browser.calls.filter(([name]) => name === 'create').length, 1,
    'Group Open all must create only the one reopenable nested page');
}

function testLandingSuggestionFailsClosedAfterVisibleMove() {
  const fixture = makeFixture();
  const workspace = fixture.state.workspaces[0];
  const space = workspace.categories[0];
  const originalGroup = space.groups[0];
  const browserCalls = [];
  const browser = {
    runtime: { getURL: pathName => `chrome-extension://locus/${pathName}` },
    tabs: {
      async query(queryInfo) { browserCalls.push(['query', queryInfo]); return []; },
      async create(createProperties) { browserCalls.push(['create', createProperties]); return { id: 91, ...createProperties }; },
      async get(tabId) { browserCalls.push(['get', tabId]); return { id: tabId, url: fixture.item.url, active: true }; },
      async update(tabId, updateProperties) { browserCalls.push(['update', tabId, updateProperties]); return null; },
    },
    windows: { async update(windowId, updateInfo) { browserCalls.push(['window', windowId, updateInfo]); return null; } },
  };
  const hooks = { toasts: [], landingClosures: [] };
  const api = loadApi(fixture, browser, hooks);
  const visibleContext = api.createLandingRecoveryContext({
    item: fixture.item,
    cat: space,
    group: originalGroup,
    parents: [],
  });
  assert.ok(visibleContext, 'a visible Landing suggestion must capture an exact recovery context');
  assert.equal(api.resolveLandingRecoveryTarget(visibleContext)?.item, fixture.item,
    'an unchanged visible Landing suggestion must still resolve to its exact saved page');

  originalGroup.items.splice(0, 1);
  const movedGroup = { id: 'group-2', name: 'Later', items: [fixture.item] };
  space.groups.push(movedGroup);
  let focusCount = 0;
  const opener = { isConnected: true, focus() { focusCount += 1; } };

  assert.equal(api.activateLandingRecovery(visibleContext, opener), false,
    'a moved visible Landing suggestion must fail closed');
  assert.deepEqual(browserCalls, [], 'a stale visible suggestion must cause zero browser effects');
  assert.equal(hooks.landingClosures.length, 0, 'failed recovery must preserve the Landing layer and query');
  assert.equal(hooks.toasts.length, 1, 'failed recovery must report one useful message');
  assert.equal(hooks.toasts[0].message, 'search.recoveryUnavailable',
    'Landing must reuse the existing localized changed-or-moved recovery message');
  assert.equal(focusCount, 1, 'failed recovery must restore focus to the triggering suggestion');
  assert.equal(originalGroup.items.length, 0, 'recovery must not repair or copy the changed graph');
  assert.equal(movedGroup.items[0], fixture.item, 'recovery must preserve the externally moved item');
}

async function testBulkReopenReusesBeforeCreatingAndReportsTruthfully() {
  const fixture = makeFixture();
  const second = {
    id: 'item-2',
    type: 'tab',
    title: 'Open second',
    url: 'https://example.com/second',
  };
  fixture.state.workspaces[0].categories[0].groups[0].items.push(second);
  const tabs = [{ id: 61, windowId: 8, url: fixture.item.url }];
  const calls = [];
  const browser = {
    runtime: { getURL: pathName => `chrome-extension://locus/${pathName}` },
    tabs: {
      async query(queryInfo) { calls.push(['query', queryInfo]); return tabs.map(tab => ({ ...tab })); },
      async get(tabId) { calls.push(['get', tabId]); return { ...tabs.find(tab => tab.id === tabId) }; },
      async create(createProperties) {
        calls.push(['create', createProperties]);
        const tab = { id: 62, windowId: 8, ...createProperties };
        tabs.push(tab);
        return { ...tab };
      },
      async update() { throw new Error('background bulk reuse must not activate a tab'); },
    },
    windows: { async update() { throw new Error('background bulk reuse must not focus a window'); } },
  };
  const api = loadApi(fixture, browser);
  assert.equal(typeof api.requestBulkSavedTabReopen, 'function',
    'bulk Group/selection Reopen must have one production coordinator');
  const result = await api.requestBulkSavedTabReopen([fixture.item, second], browser);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    total: 2,
    created: 1,
    reused: 1,
    skipped: 0,
    checkFailed: 0,
    unconfirmed: 0,
    notAttempted: 0,
  });
  assert.deepEqual(calls.map(([name]) => name), ['query', 'get', 'query', 'create', 'get'],
    'bulk Reopen must settle each exact item before starting the next');
}

async function testBulkReopenStopsAfterUnknownEffect() {
  const fixture = makeFixture();
  const second = { id: 'item-2', type: 'tab', title: 'Uncertain', url: 'https://example.com/uncertain' };
  const third = { id: 'item-3', type: 'tab', title: 'Later', url: 'https://example.com/later' };
  fixture.state.workspaces[0].categories[0].groups[0].items.push(second, third);
  const createdTabs = [];
  const browser = makeBrowser({ queriedTabs: createdTabs });
  let createCount = 0;
  browser.tabs.create = async createProperties => {
    browser.calls.push(['create', createProperties]);
    createCount += 1;
    const tab = createCount === 2
      ? { id: 71, windowId: 8, url: 'https://wrong.example/', active: false }
      : { id: 70, windowId: 8, ...createProperties };
    createdTabs.push(tab);
    return { ...tab };
  };
  const result = await loadApi(fixture, browser).requestBulkSavedTabReopen(
    [fixture.item, second, third],
    browser,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    total: 3,
    created: 1,
    reused: 0,
    skipped: 0,
    checkFailed: 0,
    unconfirmed: 1,
    notAttempted: 1,
  });
  assert.equal(browser.calls.filter(([name]) => name === 'create').length, 2,
    'an unknown browser effect must stop every later bulk attempt');
}

async function testBulkReopenStopsAfterBrowserReadFailure() {
  const fixture = makeFixture();
  const second = { id: 'item-2', type: 'tab', title: 'Second', url: 'https://example.com/second' };
  const third = { id: 'item-3', type: 'tab', title: 'Third', url: 'https://example.com/third' };
  fixture.state.workspaces[0].categories[0].groups[0].items.push(second, third);
  const browser = makeBrowser();
  browser.tabs.query = async queryInfo => {
    browser.calls.push(['query', queryInfo]);
    throw new Error('profile tab read failed');
  };
  const result = await loadApi(fixture, browser).requestBulkSavedTabReopen(
    [fixture.item, second, third],
    browser,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    total: 3,
    created: 0,
    reused: 0,
    skipped: 0,
    checkFailed: 1,
    unconfirmed: 0,
    notAttempted: 2,
  });
  assert.equal(browser.calls.filter(([name]) => name === 'query').length, 1,
    'one failed profile read must stop the batch instead of repeating the same failure');
}

async function testSameUrlDifferentSavedItemsRevalidateSeparately() {
  const fixture = makeFixture();
  const second = {
    id: 'item-2',
    type: 'tab',
    title: 'Second copy',
    url: fixture.item.url,
  };
  fixture.state.workspaces[0].categories[0].groups[0].items.push(second);
  const browser = makeBrowser();
  let releaseQuery;
  browser.tabs.query = queryInfo => {
    browser.calls.push(['query', queryInfo]);
    return new Promise(resolve => { releaseQuery = () => resolve([]); });
  };
  const api = loadApi(fixture, browser);
  const first = api.requestSavedTabReopen(fixture.item, { focus: false }, browser);
  const secondRequest = api.requestSavedTabReopen(second, { focus: false }, browser);
  second.title = 'Changed while waiting';
  releaseQuery();
  assert.equal((await first).status, 'created-live');
  assert.equal((await secondRequest).status, 'target-unavailable',
    'a distinct same-URL save must revalidate its own frozen identity after the URL lane settles');
  assert.equal(browser.calls.filter(([name]) => name === 'create').length, 1);
}

async function testBulkSameUrlCreatesOnceThenReuses() {
  const fixture = makeFixture();
  const second = {
    id: 'item-2',
    type: 'tab',
    title: 'Same destination',
    url: fixture.item.url,
  };
  fixture.state.workspaces[0].categories[0].groups[0].items.push(second);
  const tabs = [];
  const calls = [];
  const browser = {
    runtime: { getURL: pathName => `chrome-extension://locus/${pathName}` },
    tabs: {
      async query(queryInfo) { calls.push(['query', queryInfo]); return tabs.map(tab => ({ ...tab })); },
      async create(createProperties) {
        calls.push(['create', createProperties]);
        const tab = { id: 81, windowId: 9, ...createProperties };
        tabs.push(tab);
        return { ...tab };
      },
      async get(tabId) { calls.push(['get', tabId]); return { ...tabs.find(tab => tab.id === tabId) }; },
      async update() { throw new Error('background reuse must not activate'); },
    },
    windows: { async update() { throw new Error('background reuse must not focus'); } },
  };
  const result = await loadApi(fixture, browser).requestBulkSavedTabReopen(
    [fixture.item, second],
    browser,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    total: 2,
    created: 1,
    reused: 1,
    skipped: 0,
    checkFailed: 0,
    unconfirmed: 0,
    notAttempted: 0,
  });
  assert.deepEqual(calls.map(([name]) => name), ['query', 'create', 'get', 'query', 'get'],
    'distinct same-URL saves must reuse the first confirmed create after revalidation');
}

function testDuplicateGroupIdsFailClosed() {
  const fixture = makeFixture();
  const secondGroup = {
    id: 'group-1',
    name: 'Duplicate identity',
    items: [{ id: 'item-2', type: 'tab', title: 'Wrong target', url: 'https://example.com/wrong' }],
  };
  fixture.state.workspaces[0].categories[0].groups.push(secondGroup);
  const browser = makeBrowser();
  const hooks = { toasts: [] };
  const api = loadApi(fixture, browser, hooks);
  assert.equal(api.openGroupAll(secondGroup, null), false);
  assert.deepEqual(browser.calls, [], 'an ambiguous rendered Group must have no browser effect');
  assert.deepEqual(hooks.toasts.map(entry => entry.message), ['bulkReopen.groupUnavailable']);
}

function testBulkRecoveryRemainsInlineUntilDismissed() {
  let mountedStatus = null;
  const container = {
    querySelector(selector) {
      return selector === '.bulk-reopen-result' && mountedStatus && !mountedStatus.removed
        ? mountedStatus
        : null;
    },
  };
  const anchor = {
    id: '',
    parentElement: container,
    insertAdjacentElement(position, element) {
      assert.equal(position, 'afterend');
      mountedStatus = element;
    },
  };
  const makeElement = tagName => ({
    tagName,
    children: [],
    attributes: new Map(),
    listeners: {},
    removed: false,
    setAttribute(name, value) { this.attributes.set(name, String(value)); },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    remove() { this.removed = true; },
  });
  const hooks = {
    toasts: [],
    document: { createElement: makeElement },
  };
  const fixture = makeFixture();
  const api = loadApi(fixture, makeBrowser(), hooks);
  const opener = {
    isConnected: true,
    focusCount: 0,
    closest() { return anchor; },
    focus() { this.focusCount += 1; },
  };
  api.reportBulkSavedTabReopenResult(api.bulkSavedTabReopenResult(2, {
    unconfirmed: 1,
    notAttempted: 1,
  }), opener);
  assert.deepEqual(hooks.toasts, [], 'required recovery guidance must not expire in a toast');
  assert.equal(mountedStatus.attributes.get('role'), 'status');
  assert.equal(mountedStatus.children[0].textContent,
    'bulkReopen.unconfirmed · bulkReopen.notAttempted');
  assert.equal(mountedStatus.children[1].attributes.get('aria-label'), 'bulkReopen.dismiss');
  mountedStatus.children[1].listeners.click();
  assert.equal(mountedStatus.removed, true);
  assert.equal(opener.focusCount, 1);
}

async function testBulkFacadeGatesPendingWorkAndReportsOnce() {
  const fixture = makeFixture();
  const browser = makeBrowser();
  let releaseQuery;
  browser.tabs.query = queryInfo => {
    browser.calls.push(['query', queryInfo]);
    return new Promise(resolve => { releaseQuery = () => resolve([]); });
  };
  const hooks = { toasts: [] };
  const api = loadApi(fixture, browser, hooks);
  const attributes = new Map();
  const opener = {
    disabled: false,
    isConnected: true,
    focusCount: 0,
    getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
    focus() { this.focusCount += 1; },
  };
  assert.equal(api.openSavedTabItems([fixture.item], { opener, browser }), true);
  assert.equal(api.openSavedTabItems([fixture.item], { opener, browser }), false,
    'a second bulk activation must not create another browser effect');
  assert.equal(attributes.get('aria-busy'), 'true');
  assert.equal(attributes.get('aria-disabled'), 'true');
  assert.equal(opener.disabled, false, 'pending bulk work must keep the keyboard anchor focusable');
  assert.deepEqual(hooks.toasts.map(entry => entry.message), ['bulkReopen.inProgress'],
    'a competing activation must explain why it did nothing');
  const pending = api.currentBulkSavedTabReopen();
  releaseQuery();
  await pending.promise;
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(api.currentBulkSavedTabReopen(), null);
  assert.equal(attributes.has('aria-busy'), false);
  assert.equal(attributes.has('aria-disabled'), false);
  assert.equal(opener.disabled, false);
  assert.equal(opener.focusCount, 2,
    'pending feedback and final settlement must both return to the active recovery anchor');
  assert.deepEqual(hooks.toasts.map(entry => entry.message), [
    'bulkReopen.inProgress',
    'bulkReopen.opened',
  ]);

  assert.equal(api.openSavedTabItems([], { opener, browser }), false);
  assert.deepEqual(hooks.toasts.map(entry => entry.message), [
    'bulkReopen.inProgress',
    'bulkReopen.opened',
    'bulkReopen.none',
  ]);
}

function makeBrowser({
  queriedTabs = [],
  createdTab = { id: 90, windowId: 9 },
  getTab,
  updatedTab,
} = {}) {
  const calls = [];
  return {
    calls,
    runtime: { getURL: pathName => `chrome-extension://locus/${pathName}` },
    tabs: {
      async query(queryInfo) { calls.push(['query', queryInfo]); return queriedTabs; },
      async create(createProperties) {
        calls.push(['create', createProperties]);
        const tab = { ...createdTab, ...createProperties };
        queriedTabs.push(tab);
        return { ...tab };
      },
      async get(tabId) {
        calls.push(['get', tabId]);
        if (typeof getTab === 'function') return getTab(tabId);
        return getTab || queriedTabs.find(tab => tab.id === tabId);
      },
      async update(tabId, updateProperties) {
        calls.push(['update', tabId, updateProperties]);
        const prior = queriedTabs.find(tab => tab.id === tabId) || {};
        const next = updatedTab || { ...prior, id: tabId, ...updateProperties };
        if (next?.id === tabId) Object.assign(prior, next);
        return { ...next };
      },
    },
    windows: {
      async update(windowId, updateInfo) { calls.push(['window-update', windowId, updateInfo]); return { id: windowId, ...updateInfo }; },
    },
  };
}

async function testReuseExactLiveAndSuspendedTargets() {
  const fixture = makeFixture();
  const api = loadApi(fixture);
  const liveBrowser = makeBrowser({
    queriedTabs: [
      { id: 11, windowId: 2, url: 'https://example.com/recover?near=1', lastAccessed: 30 },
      { id: 12, windowId: 3, url: 'https://example.com/recover', lastAccessed: 20 },
    ],
  });
  const live = await api.requestSavedTabReopen(fixture.item, { focus: true }, liveBrowser);
  assert.equal(live.status, 'reused-live');
  assert.deepEqual(
    JSON.parse(JSON.stringify(liveBrowser.calls)),
    [
      ['query', {}],
      ['get', 12],
      ['update', 12, { active: true }],
      ['window-update', 3, { focused: true }],
      ['get', 12],
    ],
    'an exact live destination must be activated and its window focused without creating a copy',
  );

  const suspendedUrl = 'chrome-extension://locus/suspended.html#title=Old+title&url=https%3A%2F%2Fexample.com%2Frecover&fav=old';
  const suspendedBrowser = makeBrowser({
    queriedTabs: [{ id: 21, windowId: 4, url: suspendedUrl, discarded: true }],
  });
  const suspended = await api.requestSavedTabReopen(fixture.item, { focus: true }, suspendedBrowser);
  assert.equal(suspended.status, 'reused-suspended');
  assert.equal(suspendedBrowser.calls.some(([name]) => name === 'create'), false);

  const preferLiveBrowser = makeBrowser({
    queriedTabs: [
      { id: 31, windowId: 5, url: suspendedUrl, active: true, lastAccessed: 100 },
      { id: 32, windowId: 6, url: 'https://example.com/recover', lastAccessed: 10 },
    ],
  });
  const preferred = await api.requestSavedTabReopen(fixture.item, { focus: true }, preferLiveBrowser);
  assert.equal(preferred.status, 'reused-live');
  assert.deepEqual(JSON.parse(JSON.stringify(preferLiveBrowser.calls.slice(0, 2).map(call => call.slice(0, 2)))), [
    ['query', {}],
    ['get', 32],
  ]);
}

async function testReusedTabMustConfirmExactDestinationAfterFocus() {
  const fixture = makeFixture();
  let focusSettled = false;
  const browser = makeBrowser({
    queriedTabs: [{
      id: 98,
      windowId: 21,
      url: fixture.item.url,
      active: false,
    }],
    getTab: tabId => focusSettled
      ? {
          id: tabId,
          windowId: 21,
          url: 'https://elsewhere.example/after-focus',
          active: true,
        }
      : {
          id: tabId,
          windowId: 21,
          url: fixture.item.url,
          active: false,
        },
  });
  browser.windows.update = async (windowId, updateInfo) => {
    browser.calls.push(['window-update', windowId, updateInfo]);
    focusSettled = true;
    return { id: windowId, ...updateInfo };
  };

  const result = await loadApi(fixture).requestSavedTabReopen(
    fixture.item,
    { focus: true },
    browser,
  );

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    status: 'activate-unconfirmed',
    effect: 'activated',
    tabId: 98,
    windowId: 21,
  }, 'Reopen must not report success when the activated tab changes during focus');
  assert.equal(browser.calls.some(([name]) => name === 'create'), false,
    'an uncertain reuse effect must never fall through to create');
}

async function testReusedTabFinalReceiptMatrix() {
  const makeFocusedBrowser = (fixture, finalRead) => {
    let getCount = 0;
    return makeBrowser({
      queriedTabs: [{
        id: 99,
        windowId: 22,
        url: fixture.item.url,
        active: false,
      }],
      getTab: tabId => {
        getCount += 1;
        if (getCount === 1) {
          return {
            id: tabId,
            windowId: 22,
            url: fixture.item.url,
            active: false,
          };
        }
        return finalRead(tabId);
      },
    });
  };

  const exactPendingFixture = makeFixture();
  const exactPendingBrowser = makeFocusedBrowser(exactPendingFixture, tabId => ({
    id: tabId,
    windowId: 22,
    url: 'https://elsewhere.example/loading',
    pendingUrl: exactPendingFixture.item.url,
    active: true,
  }));
  assert.equal((await loadApi(exactPendingFixture).requestSavedTabReopen(
    exactPendingFixture.item,
    { focus: true },
    exactPendingBrowser,
  )).status, 'reused-live', 'an exact pending destination remains a confirmed handoff');

  const conflictingPendingFixture = makeFixture();
  const conflictingPendingBrowser = makeFocusedBrowser(conflictingPendingFixture, tabId => ({
    id: tabId,
    windowId: 22,
    url: conflictingPendingFixture.item.url,
    pendingUrl: 'https://elsewhere.example/leaving',
    active: true,
  }));
  assert.equal((await loadApi(conflictingPendingFixture).requestSavedTabReopen(
    conflictingPendingFixture.item,
    { focus: true },
    conflictingPendingBrowser,
  )).status, 'activate-unconfirmed', 'a conflicting final pending navigation must fail closed');

  const wrongIdentityFixture = makeFixture();
  const wrongIdentityBrowser = makeFocusedBrowser(wrongIdentityFixture, tabId => ({
    id: tabId,
    windowId: 23,
    url: wrongIdentityFixture.item.url,
    active: true,
  }));
  assert.equal((await loadApi(wrongIdentityFixture).requestSavedTabReopen(
    wrongIdentityFixture.item,
    { focus: true },
    wrongIdentityBrowser,
  )).status, 'activate-unconfirmed', 'a changed final window identity must fail closed');

  const inactiveFixture = makeFixture();
  const inactiveBrowser = makeFocusedBrowser(inactiveFixture, tabId => ({
    id: tabId,
    windowId: 22,
    url: inactiveFixture.item.url,
    active: false,
  }));
  assert.equal((await loadApi(inactiveFixture).requestSavedTabReopen(
    inactiveFixture.item,
    { focus: true },
    inactiveBrowser,
  )).status, 'activate-unconfirmed', 'an exact final tab that is no longer active must fail closed');

  const readFailureFixture = makeFixture();
  let readCount = 0;
  const readFailureBrowser = makeBrowser({
    queriedTabs: [{ id: 100, windowId: 24, url: readFailureFixture.item.url, active: false }],
    getTab: tabId => {
      readCount += 1;
      if (readCount === 1) {
        return { id: tabId, windowId: 24, url: readFailureFixture.item.url, active: false };
      }
      throw new Error('final tab receipt unavailable');
    },
  });
  assert.equal((await loadApi(readFailureFixture).requestSavedTabReopen(
    readFailureFixture.item,
    { focus: true },
    readFailureBrowser,
  )).status, 'activate-unconfirmed', 'a rejected final tab read must fail closed');
}

async function testPendingBackgroundAndExplicitCopyBehavior() {
  const fixture = makeFixture();
  const api = loadApi(fixture);
  const pendingBrowser = makeBrowser({
    queriedTabs: [{
      id: 40,
      windowId: 7,
      url: 'https://elsewhere.example/old',
      pendingUrl: 'https://example.com/recover',
    }],
  });
  const pending = await api.requestSavedTabReopen(fixture.item, { focus: true }, pendingBrowser);
  assert.equal(pending.status, 'reused-live', 'an exact pending destination is the current browser intent');

  const navigatingAwayBrowser = makeBrowser({
    queriedTabs: [{
      id: 41,
      windowId: 7,
      url: 'https://example.com/recover',
      pendingUrl: 'https://elsewhere.example/next',
    }],
  });
  const navigatingAway = await api.requestSavedTabReopen(fixture.item, { focus: true }, navigatingAwayBrowser);
  assert.equal(navigatingAway.status, 'created-live');
  assert.deepEqual(navigatingAwayBrowser.calls.map(([name]) => name), ['query', 'create', 'get'],
    'a tab navigating away must not be reused, while the replacement create still requires confirmation');

  const backgroundBrowser = makeBrowser({
    queriedTabs: [{ id: 42, windowId: 8, url: 'https://example.com/recover' }],
  });
  const background = await api.requestSavedTabReopen(fixture.item, { focus: false }, backgroundBrowser);
  assert.equal(background.status, 'reused-live');
  assert.deepEqual(backgroundBrowser.calls.map(([name]) => name), ['query', 'get']);

  const hibernatedFixture = makeFixture();
  hibernatedFixture.state.settings.hibernate = true;
  const hibernatedBrowser = makeBrowser();
  const hibernated = await loadApi(hibernatedFixture).requestSavedTabReopen(
    hibernatedFixture.item,
    { focus: false },
    hibernatedBrowser,
  );
  assert.equal(hibernated.status, 'created-suspended');
  const hibernatedCreate = hibernatedBrowser.calls.find(([name]) => name === 'create');
  assert.equal(hibernatedCreate[1].active, false);
  assert.match(hibernatedCreate[1].url, /^chrome-extension:\/\/locus\/suspended\.html#/);
  assert.equal(new URLSearchParams(new URL(hibernatedCreate[1].url).hash.slice(1)).get('url'), fixture.item.url);

  const explicitCopyBrowser = makeBrowser({
    queriedTabs: [{ id: 43, windowId: 8, url: 'https://example.com/recover' }],
  });
  const explicitCopy = await api.requestSavedTabReopen(
    fixture.item,
    { focus: true, reuse: false },
    explicitCopyBrowser,
  );
  assert.equal(explicitCopy.status, 'created-live');
  assert.equal(explicitCopyBrowser.calls.some(([name]) => name === 'query'), false, 'an explicit new-tab copy must not depend on an unused duplicate scan');
  assert.deepEqual(explicitCopyBrowser.calls.map(([name]) => name), ['create', 'get'],
    'an explicit new-tab copy must still confirm its final destination');
  assert.equal(explicitCopyBrowser.calls.filter(([name]) => name === 'create').length, 1);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function testRapidIdenticalRequestsShareOneEffect() {
  const fixture = makeFixture();
  const api = loadApi(fixture);
  const query = deferred();
  const calls = [];
  let createdTab = null;
  const browser = {
    runtime: { getURL: pathName => `chrome-extension://locus/${pathName}` },
    tabs: {
      query(queryInfo) { calls.push(['query', queryInfo]); return query.promise; },
      async create(createProperties) {
        calls.push(['create', createProperties]);
        createdTab = { id: 71, windowId: 11, ...createProperties };
        return { ...createdTab };
      },
      async get(tabId) {
        calls.push(['get', tabId]);
        return createdTab?.id === tabId ? { ...createdTab } : undefined;
      },
      async update() { throw new Error('update must not run without a candidate'); },
    },
    windows: { async update() { throw new Error('window update must not run after create'); } },
  };
  const first = api.requestSavedTabReopen(fixture.item, { focus: true }, browser);
  const second = api.requestSavedTabReopen(fixture.item, { focus: true }, browser);
  assert.equal(calls.filter(([name]) => name === 'query').length, 1, 'the same rapid intent must share its in-flight read');
  query.resolve([]);
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(firstResult.status, 'created-live');
  assert.equal(secondResult.status, 'created-live');
  assert.equal(calls.filter(([name]) => name === 'create').length, 1, 'the same rapid intent must create at most one tab');
}

function makeSharedLockManager() {
  const tails = new Map();
  return {
    request(name, callback) {
      const prior = tails.get(name) || Promise.resolve();
      const run = prior.catch(() => undefined).then(callback);
      const tail = run.finally(() => {
        if (tails.get(name) === tail) tails.delete(name);
      });
      tails.set(name, tail);
      return run;
    },
  };
}

async function testSeparateLocusPagesShareOneReopenLane() {
  const firstFixture = makeFixture();
  const secondFixture = makeFixture();
  const tabs = [];
  const calls = [];
  const browser = {
    runtime: { getURL: pathName => `chrome-extension://locus/${pathName}` },
    tabs: {
      async query(queryInfo) { calls.push(['query', queryInfo]); return tabs.map(tab => ({ ...tab })); },
      async create(createProperties) {
        calls.push(['create', createProperties]);
        const tab = { id: 72, windowId: 12, ...createProperties };
        tabs.push(tab);
        return { ...tab };
      },
      async get(tabId) { calls.push(['get', tabId]); return { ...tabs.find(tab => tab.id === tabId) }; },
      async update(tabId, updateProperties) {
        calls.push(['update', tabId, updateProperties]);
        const tab = tabs.find(candidate => candidate.id === tabId);
        Object.assign(tab, updateProperties);
        return { ...tab };
      },
    },
    windows: {
      async update(windowId, updateInfo) { calls.push(['window-update', windowId, updateInfo]); return { id: windowId, ...updateInfo }; },
    },
  };
  const sharedLocks = makeSharedLockManager();
  const firstApi = loadApi(firstFixture, browser, { toasts: [] }, sharedLocks);
  const secondApi = loadApi(secondFixture, browser, { toasts: [] }, sharedLocks);
  const [first, second] = await Promise.all([
    firstApi.requestSavedTabReopen(firstFixture.item, { focus: true }, browser),
    secondApi.requestSavedTabReopen(secondFixture.item, { focus: true }, browser),
  ]);
  assert.equal(first.status, 'created-live');
  assert.equal(second.status, 'reused-live');
  assert.equal(calls.filter(([name]) => name === 'create').length, 1, 'separate Locus pages must not race into two creates');
}

async function flushAsyncWork() {
  await new Promise(resolve => setImmediate(resolve));
}

async function testFacadeReportsOneUsefulFailureAndSilentSuccess() {
  const fixture = makeFixture();
  const successBrowser = makeBrowser({
    queriedTabs: [{ id: 80, windowId: 12, url: fixture.item.url }],
  });
  const successHooks = { toasts: [] };
  const successApi = loadApi(fixture, successBrowser, successHooks);
  assert.equal(successApi.openSavedTabItem(fixture.item, { focus: true }), true);
  await flushAsyncWork();
  assert.deepEqual(successHooks.toasts, [], 'confirmed reuse must remain quiet');

  const calls = [];
  const failedBrowser = {
    runtime: { getURL: pathName => `chrome-extension://locus/${pathName}` },
    tabs: {
      async query(queryInfo) { calls.push(['query', queryInfo]); throw new Error('query unavailable'); },
      async create() { throw new Error('create must not run'); },
      async get() { throw new Error('get must not run'); },
      async update() { throw new Error('update must not run'); },
    },
    windows: { async update() { throw new Error('window update must not run'); } },
  };
  const failedHooks = { toasts: [] };
  const failedApi = loadApi(fixture, failedBrowser, failedHooks);
  const opener = {
    isConnected: true,
    focusCount: 0,
    focus() { this.focusCount += 1; },
  };
  assert.equal(failedApi.openSavedTabItem(fixture.item, { focus: true, opener }), true);
  assert.equal(failedApi.openSavedTabItem(fixture.item, { focus: true, opener }), true);
  await flushAsyncWork();
  assert.equal(calls.filter(([name]) => name === 'query').length, 1);
  assert.deepEqual(failedHooks.toasts.map(entry => entry.message), ['itemAction.reopenCheckFailed']);
  assert.equal(opener.focusCount, 1, 'one shared failure must restore the originating control once');

  const changedFixture = makeFixture();
  const changedBrowser = makeBrowser({
    queriedTabs: [{ id: 81, windowId: 13, url: changedFixture.item.url }],
    getTab: { id: 81, windowId: 13, url: 'https://elsewhere.example/changed' },
  });
  const changedHooks = { toasts: [] };
  const changedApi = loadApi(changedFixture, changedBrowser, changedHooks);
  assert.equal(changedApi.openSavedTabItem(changedFixture.item, { focus: true, opener }), true);
  await flushAsyncWork();
  assert.deepEqual(changedHooks.toasts.map(entry => entry.message), ['itemAction.reopenCandidateChanged']);
}

async function testQueuedIntentStopsAfterUnknownEffect() {
  const fixture = makeFixture();
  const api = loadApi(fixture);
  const calls = [];
  const browser = {
    runtime: { getURL: pathName => `chrome-extension://locus/${pathName}` },
    tabs: {
      async query(queryInfo) { calls.push(['query', queryInfo]); return []; },
      async create(createProperties) { calls.push(['create', createProperties]); throw new Error('receipt unavailable'); },
      async get() { throw new Error('get must not run'); },
      async update() { throw new Error('update must not run'); },
    },
    windows: { async update() { throw new Error('window update must not run'); } },
  };
  const first = api.requestSavedTabReopen(fixture.item, { focus: true }, browser);
  const queued = api.requestSavedTabReopen(fixture.item, { focus: false }, browser);
  const [firstResult, queuedResult] = await Promise.all([first, queued]);
  assert.equal(firstResult.status, 'create-unconfirmed');
  assert.equal(queuedResult.status, 'prior-effect-unconfirmed');
  assert.equal(calls.filter(([name]) => name === 'query').length, 1);
  assert.equal(calls.filter(([name]) => name === 'create').length, 1);
}

async function testIdentityRacesAndBrowserFailureReceipts() {
  const queryRaceFixture = makeFixture();
  const queryRaceApi = loadApi(queryRaceFixture);
  const pendingQuery = deferred();
  const queryRaceBrowser = makeBrowser();
  queryRaceBrowser.tabs.query = queryInfo => {
    queryRaceBrowser.calls.push(['query', queryInfo]);
    return pendingQuery.promise;
  };
  const queryRace = queryRaceApi.requestSavedTabReopen(queryRaceFixture.item, { focus: true }, queryRaceBrowser);
  queryRaceFixture.item.title = 'Changed while checking';
  pendingQuery.resolve([]);
  assert.equal((await queryRace).status, 'target-unavailable');
  assert.deepEqual(queryRaceBrowser.calls.map(([name]) => name), ['query']);

  const getRaceFixture = makeFixture();
  const getRaceApi = loadApi(getRaceFixture);
  const pendingGet = deferred();
  const getRaceBrowser = makeBrowser({
    queriedTabs: [{ id: 91, windowId: 14, url: getRaceFixture.item.url }],
  });
  getRaceBrowser.tabs.get = tabId => {
    getRaceBrowser.calls.push(['get', tabId]);
    return pendingGet.promise;
  };
  const getRace = getRaceApi.requestSavedTabReopen(getRaceFixture.item, { focus: true }, getRaceBrowser);
  await flushAsyncWork();
  getRaceFixture.item.url = 'https://example.com/changed';
  pendingGet.resolve({ id: 91, windowId: 14, url: 'https://example.com/recover' });
  assert.equal((await getRace).status, 'target-unavailable');
  assert.equal(getRaceBrowser.calls.some(([name]) => name === 'update'), false);

  const candidateFixture = makeFixture();
  const candidateBrowser = makeBrowser({
    queriedTabs: [{ id: 92, windowId: 15, url: candidateFixture.item.url }],
    getTab: { id: 92, windowId: 15, url: 'https://elsewhere.example/' },
  });
  const candidateChanged = await loadApi(candidateFixture).requestSavedTabReopen(
    candidateFixture.item,
    { focus: true },
    candidateBrowser,
  );
  assert.equal(candidateChanged.status, 'candidate-changed');
  assert.equal(candidateBrowser.calls.some(([name]) => name === 'create'), false);

  const queryFailureFixture = makeFixture();
  const queryFailureBrowser = makeBrowser();
  queryFailureBrowser.tabs.query = async queryInfo => {
    queryFailureBrowser.calls.push(['query', queryInfo]);
    throw new Error('query failed');
  };
  assert.equal((await loadApi(queryFailureFixture).requestSavedTabReopen(
    queryFailureFixture.item,
    { focus: true },
    queryFailureBrowser,
  )).status, 'browser-read-failed');

  const updateFailureFixture = makeFixture();
  const updateFailureBrowser = makeBrowser({
    queriedTabs: [{ id: 93, windowId: 16, url: updateFailureFixture.item.url }],
  });
  updateFailureBrowser.tabs.update = async (tabId, updateProperties) => {
    updateFailureBrowser.calls.push(['update', tabId, updateProperties]);
    throw new Error('activation receipt unavailable');
  };
  assert.equal((await loadApi(updateFailureFixture).requestSavedTabReopen(
    updateFailureFixture.item,
    { focus: true },
    updateFailureBrowser,
  )).status, 'activate-unconfirmed');
  assert.equal(updateFailureBrowser.calls.some(([name]) => name === 'window-update'), false);
  assert.equal(updateFailureBrowser.calls.some(([name]) => name === 'create'), false);

  const changedReceiptFixture = makeFixture();
  const changedReceiptBrowser = makeBrowser({
    queriedTabs: [{ id: 95, windowId: 18, url: changedReceiptFixture.item.url }],
    updatedTab: { id: 95, windowId: 18, active: true, url: 'https://elsewhere.example/after-activation' },
  });
  assert.equal((await loadApi(changedReceiptFixture).requestSavedTabReopen(
    changedReceiptFixture.item,
    { focus: true },
    changedReceiptBrowser,
  )).status, 'activate-unconfirmed');
  assert.equal(changedReceiptBrowser.calls.some(([name]) => name === 'window-update'), false);

  const focusFailureFixture = makeFixture();
  const focusFailureBrowser = makeBrowser({
    queriedTabs: [{ id: 94, windowId: 17, url: focusFailureFixture.item.url }],
  });
  focusFailureBrowser.windows.update = async (windowId, updateInfo) => {
    focusFailureBrowser.calls.push(['window-update', windowId, updateInfo]);
    throw new Error('focus receipt unavailable');
  };
  assert.equal((await loadApi(focusFailureFixture).requestSavedTabReopen(
    focusFailureFixture.item,
    { focus: true },
    focusFailureBrowser,
  )).status, 'focus-unconfirmed');
  assert.equal(focusFailureBrowser.calls.some(([name]) => name === 'create'), false);

  const falseFocusFixture = makeFixture();
  const falseFocusBrowser = makeBrowser({
    queriedTabs: [{ id: 96, windowId: 19, url: falseFocusFixture.item.url }],
  });
  falseFocusBrowser.windows.update = async (windowId, updateInfo) => {
    falseFocusBrowser.calls.push(['window-update', windowId, updateInfo]);
    return { id: windowId, focused: false };
  };
  assert.equal((await loadApi(falseFocusFixture).requestSavedTabReopen(
    falseFocusFixture.item,
    { focus: true },
    falseFocusBrowser,
  )).status, 'focus-unconfirmed');

  const createFailureFixture = makeFixture();
  const createFailureBrowser = makeBrowser();
  createFailureBrowser.tabs.create = async createProperties => {
    createFailureBrowser.calls.push(['create', createProperties]);
    throw new Error('create receipt unavailable');
  };
  assert.equal((await loadApi(createFailureFixture).requestSavedTabReopen(
    createFailureFixture.item,
    { focus: true },
    createFailureBrowser,
  )).status, 'create-unconfirmed');
  assert.equal(createFailureBrowser.calls.filter(([name]) => name === 'create').length, 1);
}

async function testCreateAndRejectUnsafeTargets() {
  const fixture = makeFixture();
  const api = loadApi(fixture);
  const browser = makeBrowser();
  const result = await api.requestSavedTabReopen(fixture.item, { focus: true }, browser);
  assert.equal(result.status, 'created-live');
  assert.deepEqual(JSON.parse(JSON.stringify(browser.calls)), [
    ['query', {}],
    ['create', { url: 'https://example.com/recover', active: true }],
    ['get', 90],
  ]);

  const unsafeFixture = makeFixture('javascript:alert(1)');
  const unsafeBrowser = makeBrowser();
  const unsafe = await loadApi(unsafeFixture).requestSavedTabReopen(
    unsafeFixture.item,
    { focus: true },
    unsafeBrowser,
  );
  assert.equal(unsafe.status, 'address-unavailable');
  assert.deepEqual(unsafeBrowser.calls, [], 'an unsafe saved address must have no browser effect');

  const unsafeHooks = { toasts: [] };
  const unsafeFacade = loadApi(unsafeFixture, unsafeBrowser, unsafeHooks);
  assert.equal(unsafeFacade.openSavedTabItem(unsafeFixture.item, { focus: true }), false);
  assert.deepEqual(unsafeHooks.toasts.map(entry => entry.message), ['itemAction.reopenAddressUnavailable']);

  const duplicateFixture = makeFixture();
  const duplicateItem = { ...duplicateFixture.item };
  duplicateFixture.state.workspaces[0].categories[0].groups.push({
    id: 'group-2',
    name: 'Also saved',
    items: [duplicateItem],
  });
  const duplicateBrowser = makeBrowser();
  const duplicate = await loadApi(duplicateFixture).requestSavedTabReopen(
    duplicateFixture.item,
    { focus: true },
    duplicateBrowser,
  );
  assert.equal(duplicate.status, 'target-unavailable');
  assert.deepEqual(duplicateBrowser.calls, [], 'an ambiguous saved identity must have no browser effect');
}

async function testCreatedTabMustConfirmExactDestination() {
  const fixture = makeFixture();
  const browser = makeBrowser();
  browser.tabs.create = async createProperties => {
    browser.calls.push(['create', createProperties]);
    return {
      id: 97,
      windowId: 20,
      url: 'https://wrong.example/',
      active: false,
    };
  };
  browser.tabs.get = async tabId => {
    browser.calls.push(['get', tabId]);
    return {
      id: tabId,
      windowId: 20,
      url: 'https://wrong.example/',
      active: false,
    };
  };

  const result = await loadApi(fixture).requestSavedTabReopen(
    fixture.item,
    { focus: true },
    browser,
  );

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    status: 'create-unconfirmed',
    effect: 'unknown',
  }, 'Reopen must not report success for a created tab at the wrong destination');
  assert.equal(browser.calls.filter(([name]) => name === 'create').length, 1,
    'an unconfirmed create must never be retried');
}

async function testCreatedTabFinalReceiptMatrix() {
  const makeCreatedBrowser = (fixture, finalRead) => {
    const browser = makeBrowser();
    browser.tabs.create = async createProperties => {
      browser.calls.push(['create', createProperties]);
      return { id: 101, windowId: 25, ...createProperties };
    };
    browser.tabs.get = async tabId => {
      browser.calls.push(['get', tabId]);
      return finalRead(tabId);
    };
    return browser;
  };

  const exactPendingFixture = makeFixture();
  const exactPendingBrowser = makeCreatedBrowser(exactPendingFixture, tabId => ({
    id: tabId,
    windowId: 25,
    url: 'https://elsewhere.example/loading',
    pendingUrl: exactPendingFixture.item.url,
    active: true,
  }));
  assert.equal((await loadApi(exactPendingFixture).requestSavedTabReopen(
    exactPendingFixture.item,
    { focus: true },
    exactPendingBrowser,
  )).status, 'created-live', 'an exact pending create remains a confirmed handoff');

  const conflictingPendingFixture = makeFixture();
  const conflictingPendingBrowser = makeCreatedBrowser(conflictingPendingFixture, tabId => ({
    id: tabId,
    windowId: 25,
    url: conflictingPendingFixture.item.url,
    pendingUrl: 'https://elsewhere.example/leaving',
    active: true,
  }));
  assert.equal((await loadApi(conflictingPendingFixture).requestSavedTabReopen(
    conflictingPendingFixture.item,
    { focus: true },
    conflictingPendingBrowser,
  )).status, 'create-unconfirmed', 'a conflicting created-tab navigation must fail closed');

  const wrongDispositionFixture = makeFixture();
  const wrongDispositionBrowser = makeCreatedBrowser(wrongDispositionFixture, tabId => ({
    id: tabId,
    windowId: 25,
    url: wrongDispositionFixture.item.url,
    active: false,
  }));
  assert.equal((await loadApi(wrongDispositionFixture).requestSavedTabReopen(
    wrongDispositionFixture.item,
    { focus: true },
    wrongDispositionBrowser,
  )).status, 'create-unconfirmed', 'a created foreground tab that is not active must fail closed');

  const wrongRepresentationFixture = makeFixture();
  wrongRepresentationFixture.state.settings.hibernate = true;
  const wrongRepresentationBrowser = makeCreatedBrowser(wrongRepresentationFixture, tabId => ({
    id: tabId,
    windowId: 25,
    url: wrongRepresentationFixture.item.url,
    active: false,
  }));
  assert.equal((await loadApi(wrongRepresentationFixture).requestSavedTabReopen(
    wrongRepresentationFixture.item,
    { focus: false },
    wrongRepresentationBrowser,
  )).status, 'create-unconfirmed', 'a live final tab cannot confirm a requested Hibernate placeholder');

  const readFailureFixture = makeFixture();
  const readFailureBrowser = makeCreatedBrowser(readFailureFixture, () => {
    throw new Error('created tab receipt unavailable');
  });
  assert.equal((await loadApi(readFailureFixture).requestSavedTabReopen(
    readFailureFixture.item,
    { focus: true },
    readFailureBrowser,
  )).status, 'create-unconfirmed', 'a rejected created-tab read must fail closed');
}

testIndividualSurfaceConvergence();
testSelectionOpenEligibility();
testLandingSuggestionFailsClosedAfterVisibleMove();

testCreateAndRejectUnsafeTargets()
  .then(testCreatedTabMustConfirmExactDestination)
  .then(testCreatedTabFinalReceiptMatrix)
  .then(testBulkReopenReusesBeforeCreatingAndReportsTruthfully)
  .then(testBulkReopenStopsAfterUnknownEffect)
  .then(testBulkReopenStopsAfterBrowserReadFailure)
  .then(testSameUrlDifferentSavedItemsRevalidateSeparately)
  .then(testBulkSameUrlCreatesOnceThenReuses)
  .then(testGroupOpenAvailabilityTracksReopenablePages)
  .then(testBulkFacadeGatesPendingWorkAndReportsOnce)
  .then(testReuseExactLiveAndSuspendedTargets)
  .then(testReusedTabMustConfirmExactDestinationAfterFocus)
  .then(testReusedTabFinalReceiptMatrix)
  .then(testPendingBackgroundAndExplicitCopyBehavior)
  .then(testRapidIdenticalRequestsShareOneEffect)
  .then(testSeparateLocusPagesShareOneReopenLane)
  .then(testFacadeReportsOneUsefulFailureAndSilentSuccess)
  .then(testQueuedIntentStopsAfterUnknownEffect)
  .then(testIdentityRacesAndBrowserFailureReceipts)
  .then(testDuplicateGroupIdsFailClosed)
  .then(testBulkRecoveryRemainsInlineUntilDismissed)
  .then(() => console.log('Saved-page Reopen safety contract passed.'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
