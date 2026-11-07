'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const popupSource = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');
const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
const popupCss = fs.readFileSync(path.join(root, 'popup.css'), 'utf8');
const backgroundSource = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
const newtabSource = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const plain = value => value == null ? value : JSON.parse(JSON.stringify(value));

function sourceSlice(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${label} must remain extractable`);
  return source.slice(start, end);
}

const popupCapturableUrlPolicySource = sourceSlice(
  popupSource,
  'const POPUP_CAPTURABLE_PROTOCOLS',
  '\nconst uid',
  'Popup capturable URL policy',
);

const locateWorkerSource = sourceSlice(
  backgroundSource,
  'function resolvePopupLocateSavedItem(',
  '\nchrome.runtime.onMessage.addListener',
  'Popup Locate worker',
);
const popupDoSaveSource = sourceSlice(
  popupSource,
  'function popupLocateExpectedRouteUrl(',
  '\nfunction loadHibernatePrefs',
  'Popup single-tab save',
);
const popupCaptureTargetSource = sourceSlice(
  popupSource,
  'function popupCaptureError(',
  '\nfunction updateDestination',
  'Popup capture target and identity helpers',
);
const popupCaptureBatchFilterSource = sourceSlice(
  popupSource,
  'function filterPopupCaptureTabs(',
  '\nfunction popupCaptureError(',
  'Popup capture batch duplicate filter',
);
const popupOrdinarySourceCloseSource = sourceSlice(
  popupSource,
  'async function closeOrdinaryPopupSavedTab(',
  '\nasync function doSave',
  'Popup ordinary saved-tab source guard',
);
const popupOrdinaryResultSource = sourceSlice(
  popupSource,
  'function showOrdinaryCaptureResult(',
  '\nasync function closeOrdinaryPopupSavedTab',
  'Popup ordinary accepted-source result',
);
const popupHibernateSaveSource = sourceSlice(
  popupSource,
  'async function saveTabsBeforeHibernate(',
  '\nfunction collectTopTags',
  'Popup save-before-hibernate flow',
);
const popupBookmarkImportSource = sourceSlice(
  popupSource,
  'function buildPopupBookmarkImport(',
  '\nfunction trapTabKey',
  'Popup bookmark import flow',
);
const popupQuickCaptureReceiptValidationSource = sourceSlice(
  popupSource,
  'function isValidQuickCaptureResult(',
  '\nfunction setQuickCaptureDoneAction',
  'Popup quick-capture state receipt validator',
);
const popupQuickCaptureViewSource = sourceSlice(
  popupSource,
  'function setQuickCaptureDoneAction(',
  '\nfunction windowSaveSourceResult',
  'Popup quick-capture result view',
);
const popupQuickCaptureActionValidationSource = sourceSlice(
  popupSource,
  'function isValidQuickCaptureActionResult(',
  '\nasync function runQuickCaptureAction',
  'Popup quick-capture action receipt validator',
);
const popupQuickCaptureActionSource = sourceSlice(
  popupSource,
  'async function runQuickCaptureAction(',
  '\nasync function closeOrdinaryPopupSavedTab',
  'Popup quick-capture action',
);
const popupLocateRecoverySource = sourceSlice(
  popupSource,
  'function popupLocateRecoveryRouteMatches(',
  '\nfunction showLocateFailure',
  'Popup Locate recovery retry',
);
const popupLocateFailureViewSource = sourceSlice(
  popupSource,
  'function showLocateFailure(',
  '\nfunction isValidQuickCaptureResult',
  'Popup Locate partial-result view',
);
const popupSaveWindowSource = sourceSlice(
  popupSource,
  'async function saveWindow(',
  '\nasync function importBookmarksFromPopup',
  'Popup whole-window save',
);
const popupWindowResultValidationSource = sourceSlice(
  popupSource,
  'function isValidWindowSaveResult(',
  '\nfunction showWindowSaveResult',
  'Popup whole-window result validator',
);
const popupWriterSource = sourceSlice(
  popupSource,
  'let popupStateWriteQueue',
  '\nconst appLocale',
  'Popup state writer',
);
const popupSectionStackSource = sourceSlice(
  popupSource,
  'function isVisiblePopupControl(',
  '\nasync function quickCapture',
  'Popup section stack',
);
const routerParseStart = newtabSource.indexOf('  function parse(hash) {', newtabSource.indexOf('const Router = (() => {'));
const routerBuildStart = newtabSource.indexOf('  function build(route) {', routerParseStart);
const routerCurrentStart = newtabSource.indexOf('  function currentRoute() {', routerBuildStart);
assert.ok(routerParseStart >= 0 && routerBuildStart > routerParseStart && routerCurrentStart > routerBuildStart,
  'New-tab route parser and builder must remain extractable');
const routerCodecSource = newtabSource.slice(routerParseStart, routerCurrentStart);

function fixtureState() {
  return {
    _revision: 4,
    settings: { language: 'en', closeTabOnSave: true },
    workspaces: [{
      id: 'ws /?#%台灣',
      categories: [{
        id: 'space-a',
        name: 'Research',
        groups: [{
          id: 'group-a',
          name: 'Inbox',
          items: [{ id: 'item /?#%項目', type: 'tab', title: 'Saved', url: 'https://saved.test' }],
        }],
      }, {
        id: 'space-b',
        name: 'Reading',
        groups: [{ id: 'group-b', name: 'Queue', items: [] }],
      }],
    }, {
      id: 'ws-other',
      categories: [{ id: 'space-other', name: 'Outside', groups: [{ id: 'group-other', name: 'Outside Group', items: [] }] }],
    }],
    archive: [],
    trash: [],
  };
}

function windowSaveDestination(intent, {
  categoryId = 'space-a',
  categoryName = 'Research',
  groupName = 'Inbox',
} = {}) {
  return {
    workspaceId: intent.workspaceId,
    categoryId,
    categoryName,
    groupId: intent.groupId,
    groupName,
  };
}

function createWorkerHarness(initialState = fixtureState()) {
  const control = {
    state: clone(initialState),
    calls: [],
    tabGets: [],
    removedIds: [],
    queried: [],
    queryTabs: [],
    tabsById: new Map([[
      77,
      { id: 77, windowId: 321, active: true, url: 'https://saved.test' },
    ]]),
    tabGetOverrides: new Map(),
    tabGetSequences: new Map(),
    tabGetFailures: new Set(),
    tabRemoveFailures: new Set(),
    getStateFailure: null,
    queryFailure: null,
    createFailure: null,
    createResult: null,
    removeFailure: null,
    updateFailure: null,
    focusFailure: null,
    notificationFailure: null,
    setFailure: null,
    nextTabId: 900,
  };
  const context = vm.createContext({
    __control: control,
    console: { error() {} },
    appLocale: state => /^zh/i.test(String(state?.settings?.language || '')) ? 'zh-TW' : 'en',
    uid: () => 'notice-id',
    async getState() {
      control.calls.push('get');
      if (control.getStateFailure) throw control.getStateFailure;
      return clone(control.state);
    },
    async setState(candidate) {
      control.calls.push('set');
      if (control.setFailure) throw control.setFailure;
      control.state = clone(candidate);
      control.state._revision = (Number(candidate._revision) || 0) + 1;
      return control.state._revision;
    },
    async requestReminderAlarmReconciliation() {
      control.calls.push('reconcile');
      return { ok: true };
    },
    async enqueueStateWrite(task) {
      control.calls.push('enqueue');
      return task();
    },
    chrome: {
      runtime: { getURL: file => `chrome-extension://locus/${file}` },
      tabs: {
        async get(tabId) {
          control.calls.push('tab-get');
          control.tabGets.push(tabId);
          if (control.tabGetFailures.has(tabId)) throw new Error(`injected tab get failure: ${tabId}`);
          const sequence = control.tabGetSequences.get(tabId);
          if (sequence?.length) {
            const next = sequence.shift();
            if (next instanceof Error) throw next;
            return clone(next);
          }
          if (control.tabGetOverrides.has(tabId)) return clone(control.tabGetOverrides.get(tabId));
          return clone(control.tabsById.get(tabId) || { id: tabId, windowId: 321 });
        },
        async query(options) {
          control.calls.push('query');
          control.queried.push(clone(options));
          if (control.queryFailure) throw control.queryFailure;
          return clone(control.queryTabs);
        },
        async create(options) {
          control.calls.push('create');
          if (control.createFailure) throw control.createFailure;
          control.created = clone(options);
          const created = control.createResult == null
            ? { id: control.nextTabId, ...clone(options) }
            : clone(control.createResult);
          if (Number.isInteger(created?.id)) control.tabsById.set(created.id, clone(created));
          return created;
        },
        async remove(tabId) {
          control.calls.push('remove');
          control.removed = tabId;
          control.removedIds.push(tabId);
          if (control.removeFailure) throw control.removeFailure;
          if (control.tabRemoveFailures.has(tabId)) throw new Error(`injected tab remove failure: ${tabId}`);
        },
        async update(tabId, options) {
          control.calls.push('update');
          control.updated = { tabId, options: clone(options) };
          if (control.updateFailure) throw control.updateFailure;
          const known = control.tabsById.get(tabId)
            || control.queryTabs.find(tab => tab?.id === tabId)
            || (control.created && tabId === control.nextTabId ? { id: tabId, ...control.created } : null);
          const updated = {
            id: tabId,
            windowId: known?.windowId ?? control.created?.windowId ?? 500,
            url: known?.url ?? control.created?.url,
            ...clone(options),
          };
          if (options?.active === true) {
            for (const [knownId, knownTab] of control.tabsById) {
              if (knownId !== tabId && knownTab?.windowId === updated.windowId) {
                control.tabsById.set(knownId, { ...knownTab, active: false });
              }
            }
          }
          control.tabsById.set(tabId, clone(updated));
          return updated;
        },
      },
      windows: {
        async update(windowId, options) {
          control.calls.push('focus');
          control.focused = { windowId, options: clone(options) };
          if (control.focusFailure) throw control.focusFailure;
          return { id: windowId, ...clone(options) };
        },
      },
      notifications: {
        async create(id, options) {
          control.calls.push('notify');
          if (control.notificationFailure) throw control.notificationFailure;
          control.notification = { id, options: clone(options) };
          return id;
        },
      },
    },
  });
  vm.runInContext(`${locateWorkerSource}\nglobalThis.__locateApi = {
    resolvePopupLocateSavedItem,
    buildPopupLocateHash,
    quickCaptureItemReceipt,
    unknownPopupQuickCaptureActionResult,
    popupQuickCaptureRouteMatches,
    confirmPopupQuickCaptureRoute,
    performPopupOpenSavedItemDestination,
    popupQuickCaptureSourceOutcome,
    performPopupQuickCaptureAction,
    resolvePopupWindowSaveGroup,
    buildPopupWindowSaveHash,
    popupWindowSaveSources,
    popupWindowSaveGroupUrls,
    unavailablePopupWindowSaveResult,
    performPopupWindowSaveEffect,
    performPopupOpenWindowSaveDestination,
    activatePopupLocateTab,
    popupLocateNotificationId,
    parsePopupLocateNotificationId,
    popupLocateNoticeRouteMatches,
    popupLocateRouteMatches,
    confirmPopupLocateRoute,
    confirmPopupLocateSource,
    popupLocateSourceOutcome,
    performPopupLocateSavedItem,
    handleStateWriteMessage,
  };`, context, {
    filename: 'popup-locate-worker.js',
  });
  return { control, api: context.__locateApi };
}

async function testPopupLocateRecoveryRetryGuard() {
  const recovery = {
    routeTabId: 900,
    routeWindowId: 321,
    routeUrl: 'chrome-extension://locus/newtab.html#/ws/ws/home?item=item',
  };
  const createHarness = ({ current, activated = null, fresh = null, getFailure = null } = {}) => {
    const control = { calls: [], created: [] };
    let getCount = 0;
    const context = vm.createContext({
      __control: control,
      console: { error() {} },
      chrome: {
        runtime: { getURL: file => `chrome-extension://locus/${file}` },
        tabs: {
          async get(tabId) {
            control.calls.push(['get', tabId]);
            if (getFailure) throw getFailure;
            getCount++;
            return clone(getCount === 1 ? current : (fresh || activated || { ...current, active: true }));
          },
          async update(tabId, options) {
            control.calls.push(['update', tabId, clone(options)]);
            return clone(activated || { ...current, ...options });
          },
          async create(options) {
            control.calls.push(['create', clone(options)]);
            control.created.push(clone(options));
            return { id: 901, windowId: 321, ...clone(options) };
          },
        },
        windows: {
          async update(windowId, options) {
            control.calls.push(['focus', windowId, clone(options)]);
            return { id: windowId, ...clone(options) };
          },
        },
      },
    });
    vm.runInContext(`${popupLocateRecoverySource}\nglobalThis.__api = { openPopupLocateRecovery };`, context);
    return { control, api: context.__api };
  };

  const exactTab = { id: 900, windowId: 321, url: recovery.routeUrl };
  const exact = createHarness({ current: exactTab });
  await exact.api.openPopupLocateRecovery(recovery);
  assert.deepEqual(exact.control.calls, [
    ['get', 900],
    ['update', 900, { active: true }],
    ['focus', 321, { focused: true }],
    ['get', 900],
  ], 'an exact retry route may finish only after a fresh post-focus active exact check');

  for (const changed of [
    { ...exactTab, url: 'https://unrelated.test' },
    { ...exactTab, windowId: 999 },
    { ...exactTab, pendingUrl: 'https://unrelated.test' },
  ]) {
    const stale = createHarness({ current: changed });
    await stale.api.openPopupLocateRecovery(recovery);
    assert.deepEqual(stale.control.calls, [
      ['get', 900],
      ['create', { url: recovery.routeUrl }],
    ], 'a reused or navigating retry tab must never be activated');
  }

  const changedDuringActivation = createHarness({
    current: exactTab,
    activated: { ...exactTab, active: true, url: 'https://unrelated.test' },
  });
  await changedDuringActivation.api.openPopupLocateRecovery(recovery);
  assert.deepEqual(changedDuringActivation.control.calls, [
    ['get', 900],
    ['update', 900, { active: true }],
    ['create', { url: recovery.routeUrl }],
  ], 'a route changed during activation must fall back without focusing the reused tab window');

  const inactiveDuringActivation = createHarness({
    current: exactTab,
    activated: { ...exactTab, active: false },
  });
  await inactiveDuringActivation.api.openPopupLocateRecovery(recovery);
  assert.deepEqual(inactiveDuringActivation.control.calls, [
    ['get', 900],
    ['update', 900, { active: true }],
    ['create', { url: recovery.routeUrl }],
  ], 'an activation result that is not active must fall back before focus');

  const changedDuringFocus = createHarness({
    current: exactTab,
    activated: { ...exactTab, active: true },
    fresh: { ...exactTab, active: false, pendingUrl: 'https://unrelated.test' },
  });
  await changedDuringFocus.api.openPopupLocateRecovery(recovery);
  assert.deepEqual(changedDuringFocus.control.calls, [
    ['get', 900],
    ['update', 900, { active: true }],
    ['focus', 321, { focused: true }],
    ['get', 900],
    ['create', { url: recovery.routeUrl }],
  ], 'a route that loses active/exact status during focus must fall back to a fresh route');

  const unavailable = createHarness({ getFailure: new Error('missing tab') });
  await unavailable.api.openPopupLocateRecovery(recovery);
  assert.deepEqual(unavailable.control.calls, [
    ['get', 900],
    ['create', { url: recovery.routeUrl }],
  ], 'an unavailable retry tab must open a fresh exact route');

  const generic = createHarness();
  await generic.api.openPopupLocateRecovery(null);
  assert.deepEqual(generic.control.calls, [
    ['create', { url: 'chrome-extension://locus/newtab.html' }],
  ], 'a failure without authoritative route identity must open generic Locus only');
}

function testPopupLocateNotificationRouteIdentity() {
  const { api } = createWorkerHarness();
  const guard = {
    routeTabId: 900,
    routeWindowId: 321,
    routeUrl: 'chrome-extension://locus/newtab.html#/ws/ws/home?item=item%20id',
  };
  const notificationId = api.popupLocateNotificationId(guard);
  const parsed = plain(api.parsePopupLocateNotificationId(notificationId));
  assert.deepEqual(parsed, guard, 'notification retry identity must round-trip exact tab, window, and route');
  assert.equal(api.popupLocateNoticeRouteMatches({
    id: 900,
    windowId: 321,
    url: guard.routeUrl,
    active: true,
  }, parsed, 'chrome-extension://locus/newtab.html'), true);
  for (const changed of [
    { id: 900, windowId: 321, url: 'https://unrelated.test' },
    { id: 900, windowId: 999, url: guard.routeUrl },
    { id: 900, windowId: 321, url: guard.routeUrl, pendingUrl: 'https://unrelated.test' },
    { id: 900, windowId: 321, url: guard.routeUrl, active: false },
  ]) {
    assert.equal(api.popupLocateNoticeRouteMatches(
      changed,
      parsed,
      'chrome-extension://locus/newtab.html',
    ), false, 'notification retry must reject changed route identity');
  }
  const legacy = plain(api.parsePopupLocateNotificationId('te-popup-locate-900-notice-id'));
  assert.deepEqual(legacy, { routeTabId: 900, routeWindowId: null, routeUrl: null });
  assert.equal(api.popupLocateNoticeRouteMatches({
    id: 900,
    windowId: 321,
    url: guard.routeUrl,
  }, legacy, 'chrome-extension://locus/newtab.html'), false,
  'a legacy notice without exact window/route authority must never activate a retained tab ID');
}

function moveItemWithinWorkspace(state, { nested = false } = {}) {
  const item = state.workspaces[0].categories[0].groups[0].items.pop();
  const target = state.workspaces[0].categories[1].groups[0];
  target.items = nested ? [{ id: 'stack', type: 'stack', items: [item] }] : [item];
  return item;
}

async function testResolverAndRouteCodec() {
  const { api } = createWorkerHarness();
  const exact = fixtureState();
  const before = JSON.stringify(exact);
  const resolved = api.resolvePopupLocateSavedItem(exact, {
    workspaceId: exact.workspaces[0].id,
    itemId: exact.workspaces[0].categories[0].groups[0].items[0].id,
  });
  assert.equal(resolved.item.title, 'Saved', 'exact active saved item must resolve');
  assert.equal(JSON.stringify(exact), before, 'Locate resolution must not mutate authoritative state');

  const moved = fixtureState();
  const movedItem = moveItemWithinWorkspace(moved, { nested: true });
  const movedTarget = api.resolvePopupLocateSavedItem(moved, { workspaceId: moved.workspaces[0].id, itemId: movedItem.id });
  assert.equal(movedTarget.group.id, 'group-b', 'same-Workspace movement and Stack nesting must resolve at the current owner');

  const duplicateItem = fixtureState();
  duplicateItem.workspaces[0].categories[1].groups[0].items.push(clone(duplicateItem.workspaces[0].categories[0].groups[0].items[0]));
  assert.equal(api.resolvePopupLocateSavedItem(duplicateItem, { workspaceId: duplicateItem.workspaces[0].id, itemId: 'item /?#%項目' }), null,
    'duplicate active item identity must fail closed');

  const duplicateWorkspace = fixtureState();
  duplicateWorkspace.workspaces.push({ id: duplicateWorkspace.workspaces[0].id, categories: [] });
  assert.equal(api.resolvePopupLocateSavedItem(duplicateWorkspace, { workspaceId: duplicateWorkspace.workspaces[0].id, itemId: 'item /?#%項目' }), null,
    'duplicate Workspace identity must fail closed');

  const duplicateSpaceOwner = fixtureState();
  duplicateSpaceOwner.workspaces[0].categories.push({ id: 'space-a', groups: [] });
  assert.equal(api.resolvePopupLocateSavedItem(duplicateSpaceOwner, { workspaceId: duplicateSpaceOwner.workspaces[0].id, itemId: 'item /?#%項目' }), null,
    'duplicate owning Space identity must fail closed like the Home detail resolver');

  const movedOut = fixtureState();
  const outsideItem = movedOut.workspaces[0].categories[0].groups[0].items.pop();
  movedOut.workspaces[1].categories[0].groups[0].items.push(outsideItem);
  assert.equal(api.resolvePopupLocateSavedItem(movedOut, { workspaceId: movedOut.workspaces[0].id, itemId: outsideItem.id }), null,
    'an item moved outside the original Workspace must fail closed');

  const storedOnly = fixtureState();
  const archived = storedOnly.workspaces[0].categories[0].groups[0].items.pop();
  storedOnly.archive.push(archived);
  assert.equal(api.resolvePopupLocateSavedItem(storedOnly, { workspaceId: storedOnly.workspaces[0].id, itemId: archived.id }), null,
    'Archive and Trash must not be treated as active Locate targets');
  assert.equal(api.resolvePopupLocateSavedItem(fixtureState(), { workspaceId: 'missing', itemId: 'item /?#%項目' }), null,
    'missing Workspace must fail closed');
  assert.equal(api.resolvePopupLocateSavedItem(fixtureState(), { workspaceId: 'ws /?#%台灣', itemId: 'missing' }), null,
    'missing item must fail closed');

  const workspaceId = 'ws /?#%台灣';
  const itemId = 'item /?#%項目';
  const hash = api.buildPopupLocateHash(workspaceId, itemId);
  assert.equal(hash, `#/ws/${encodeURIComponent(workspaceId)}/home?item=${encodeURIComponent(itemId)}`,
    'popup Locate must encode every route identifier');
  const routeContext = vm.createContext({});
  vm.runInContext(`${routerCodecSource}\nglobalThis.__routerCodec = { parse, build };`, routeContext);
  const parsed = plain(routeContext.__routerCodec.parse(hash));
  assert.deepEqual(parsed, { type: 'home', wsId: workspaceId, query: { item: itemId } },
    'popup-built route must round-trip through the production parser');
  assert.equal(routeContext.__routerCodec.build(parsed), hash.slice(1),
    'production route builder must preserve the popup Home-detail route exactly');
}

function quickCaptureIntent(overrides = {}) {
  return {
    action: 'open',
    workspaceId: 'ws /?#%台灣',
    itemId: 'item /?#%項目',
    sourceTabId: 77,
    sourceWindowId: 321,
    sourceWasActive: true,
    expectedUrl: 'https://saved.test',
    closeSource: true,
    ...overrides,
  };
}

function quickCaptureDestination(overrides = {}) {
  return {
    workspaceId: 'ws /?#%台灣',
    categoryId: 'space-a',
    categoryName: 'Research',
    groupId: 'group-a',
    groupName: 'Inbox',
    itemId: 'item /?#%項目',
    ...overrides,
  };
}

async function testQuickCaptureReceiptAndWorkerActions() {
  const exact = fixtureState();
  const receiptApi = createWorkerHarness(exact).api;
  assert.deepEqual(plain(receiptApi.unknownPopupQuickCaptureActionResult(
    quickCaptureIntent(),
  )), {
    ok: false,
    code: 'LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN',
    action: 'open',
    effectUnknown: true,
    closeRequested: true,
    sourceOutcome: 'unconfirmed',
  }, 'an unexpected worker failure must carry no authoritative destination or route claim');
  assert.deepEqual(plain(receiptApi.unknownPopupQuickCaptureActionResult(
    quickCaptureIntent({ action: 'close', closeSource: false }),
  )), {
    ok: false,
    code: 'LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN',
    action: 'close',
    effectUnknown: true,
    closeRequested: true,
    sourceOutcome: 'unconfirmed',
  }, 'an unknown explicit Close must retain its destructive request without claiming an outcome');
  assert.deepEqual(plain(receiptApi.quickCaptureItemReceipt(exact, quickCaptureIntent())), {
    ok: true,
    destinationReady: true,
    destination: quickCaptureDestination(),
  }, 'the accepted quick-capture receipt must return exact current item and destination identity');

  const moved = fixtureState();
  const movedItem = moveItemWithinWorkspace(moved, { nested: true });
  moved.workspaces[0].categories[1].name = 'Current Space';
  moved.workspaces[0].categories[1].groups[0].name = 'Current Group';
  assert.deepEqual(plain(receiptApi.quickCaptureItemReceipt(moved, quickCaptureIntent({
    itemId: movedItem.id,
  }))), {
    ok: true,
    destinationReady: true,
    destination: quickCaptureDestination({
      categoryId: 'space-b',
      categoryName: 'Current Space',
      groupId: 'group-b',
      groupName: 'Current Group',
    }),
  }, 'a same-Workspace move must report the current Space and Group without weakening item identity');

  const duplicate = fixtureState();
  duplicate.workspaces[0].categories[1].groups[0].items.push(
    clone(duplicate.workspaces[0].categories[0].groups[0].items[0]),
  );
  assert.deepEqual(plain(receiptApi.quickCaptureItemReceipt(duplicate, quickCaptureIntent())), {
    ok: false,
    code: 'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE',
    destinationReady: false,
  }, 'duplicate active item identity must make the quick-capture destination unavailable');

  const changedSavedUrl = fixtureState();
  changedSavedUrl.workspaces[0].categories[0].groups[0].items[0].url = 'https://changed.test';
  assert.equal(receiptApi.quickCaptureItemReceipt(changedSavedUrl, quickCaptureIntent()).destinationReady, false,
    'an item whose recoverable URL no longer matches the captured source must fail closed');

  const open = createWorkerHarness(exact);
  open.control.tabsById.set(77, {
    id: 77,
    windowId: 321,
    active: true,
    url: 'https://saved.test',
  });
  const openResult = plain(await open.api.performPopupQuickCaptureAction(quickCaptureIntent()));
  assert.deepEqual(openResult, {
    action: 'open',
    destinationReady: true,
    destination: quickCaptureDestination(),
    closeRequested: true,
    ok: true,
    routeReady: true,
    routeCreated: true,
    routeTabId: 900,
    sourceOutcome: 'closed',
  });
  const routeCreateIndex = open.control.calls.indexOf('create');
  const routeActivateIndex = open.control.calls.indexOf('update');
  const routeFocusIndex = open.control.calls.indexOf('focus');
  const sourceCloseIndex = open.control.calls.indexOf('remove');
  assert.ok(
    routeCreateIndex >= 0
      && routeActivateIndex > routeCreateIndex
      && routeFocusIndex > routeActivateIndex
      && sourceCloseIndex > routeFocusIndex,
    'Open must create, activate, and focus the exact recovery route before closing its source',
  );
  assert.equal(
    open.control.created.url,
    `chrome-extension://locus/newtab.html#/ws/${encodeURIComponent('ws /?#%台灣')}/home?item=${encodeURIComponent('item /?#%項目')}`,
  );
  assert.deepEqual(open.control.tabGets, [900, 77, 900],
    'Open must confirm the focused route, inspect the source, then re-confirm the route immediately before removal');
  assert.deepEqual(open.control.removedIds, [77]);

  const openKeepSource = createWorkerHarness(exact);
  const openKeepResult = plain(await openKeepSource.api.performPopupQuickCaptureAction(
    quickCaptureIntent({ closeSource: false }),
  ));
  assert.equal(openKeepResult.ok, true);
  assert.equal(openKeepResult.closeRequested, false);
  assert.equal(openKeepResult.sourceOutcome, 'not-requested');
  assert.equal(openKeepResult.routeReady, true);
  assert.deepEqual(openKeepSource.control.tabGets, [900],
    'Open with close-off must still fresh-confirm its route without inspecting the source');
  assert.ok(!openKeepSource.control.calls.includes('remove'),
    'Open with close-off must not inspect or close the source');

  const directClose = createWorkerHarness(exact);
  directClose.control.tabsById.set(77, {
    id: 77,
    windowId: 321,
    active: true,
    url: 'https://saved.test',
  });
  const closeResult = plain(await directClose.api.performPopupQuickCaptureAction(
    quickCaptureIntent({ action: 'close' }),
  ));
  assert.deepEqual(closeResult, {
    action: 'close',
    destinationReady: true,
    destination: quickCaptureDestination(),
    closeRequested: true,
    ok: true,
    sourceOutcome: 'closed',
  });
  assert.deepEqual(directClose.control.calls, ['get', 'tab-get', 'remove'],
    'Close must fresh-resolve the saved item and exact live source without creating a route');

  const stale = createWorkerHarness(exact);
  const staleResult = plain(await stale.api.performPopupQuickCaptureAction(
    quickCaptureIntent({ itemId: 'missing' }),
  ));
  assert.equal(staleResult.code, 'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE');
  assert.equal(staleResult.destinationReady, false);
  assert.equal(staleResult.sourceOutcome, 'not-attempted');
  assert.deepEqual(stale.control.calls, ['get'],
    'a stale item must create no route and inspect or close no source');

  const malformedActions = [
    { action: undefined },
    { action: 'archive' },
    { action: null },
  ];
  for (const malformed of malformedActions) {
    const invalid = createWorkerHarness(exact);
    const result = plain(await invalid.api.performPopupQuickCaptureAction({
      ...quickCaptureIntent(),
      ...malformed,
    }));
    assert.equal(result.code, 'LOCUS_QUICK_CAPTURE_ACTION_INVALID');
    assert.deepEqual(invalid.control.calls, [],
      'an invalid action must be rejected before reading state or touching tabs');
  }

  const sourceCases = [
    {
      label: 'wrong window',
      tab: { id: 77, windowId: 999, active: true, url: 'https://saved.test' },
      expected: 'protected',
    },
    {
      label: 'wrong current URL',
      tab: { id: 77, windowId: 321, active: true, url: 'https://changed.test' },
      expected: 'protected',
    },
    {
      label: 'different pending URL',
      tab: {
        id: 77,
        windowId: 321,
        active: true,
        url: 'https://saved.test',
        pendingUrl: 'https://navigating.test',
      },
      expected: 'protected',
    },
    {
      label: 'inactive source became active',
      intent: { sourceWasActive: false },
      tab: { id: 77, windowId: 321, active: true, url: 'https://saved.test' },
      expected: 'protected',
    },
  ];
  for (const sourceCase of sourceCases) {
    const harness = createWorkerHarness(exact);
    harness.control.tabsById.set(77, sourceCase.tab);
    const result = plain(await harness.api.performPopupQuickCaptureAction(
      quickCaptureIntent({ action: 'close', ...(sourceCase.intent || {}) }),
    ));
    assert.equal(result.code, 'LOCUS_QUICK_CAPTURE_SOURCE_PROTECTED', sourceCase.label);
    assert.equal(result.sourceOutcome, sourceCase.expected, sourceCase.label);
    assert.deepEqual(harness.control.removedIds, [], `${sourceCase.label} must leave the live tab open`);
  }

  const missingSource = createWorkerHarness(exact);
  missingSource.control.tabGetFailures.add(77);
  const missingSourceResult = plain(await missingSource.api.performPopupQuickCaptureAction(
    quickCaptureIntent({ action: 'close' }),
  ));
  assert.equal(missingSourceResult.code, 'LOCUS_QUICK_CAPTURE_SOURCE_UNCONFIRMED');
  assert.equal(missingSourceResult.sourceOutcome, 'unconfirmed');
  assert.deepEqual(missingSource.control.removedIds, []);

  const closeFailure = createWorkerHarness(exact);
  closeFailure.control.tabsById.set(77, {
    id: 77,
    windowId: 321,
    active: true,
    url: 'https://saved.test',
  });
  closeFailure.control.tabRemoveFailures.add(77);
  const closeFailureResult = plain(await closeFailure.api.performPopupQuickCaptureAction(
    quickCaptureIntent({ action: 'close' }),
  ));
  assert.equal(closeFailureResult.code, 'LOCUS_QUICK_CAPTURE_SOURCE_UNCONFIRMED');
  assert.equal(closeFailureResult.sourceOutcome, 'unconfirmed');

  const routeCreateFailure = createWorkerHarness(exact);
  routeCreateFailure.control.createFailure = new Error('injected create failure');
  const routeCreateResult = plain(await routeCreateFailure.api.performPopupQuickCaptureAction(
    quickCaptureIntent(),
  ));
  assert.equal(routeCreateResult.code, 'LOCUS_QUICK_CAPTURE_ROUTE_CREATE_FAILED');
  assert.equal(routeCreateResult.routeReady, false);
  assert.equal(routeCreateResult.sourceOutcome, 'not-attempted');
  assert.deepEqual(routeCreateFailure.control.removedIds, [],
    'route creation failure must leave the source open');

  const routeActivationFailure = createWorkerHarness(exact);
  routeActivationFailure.control.updateFailure = new Error('injected activation failure');
  const routeActivationResult = plain(await routeActivationFailure.api.performPopupQuickCaptureAction(
    quickCaptureIntent(),
  ));
  assert.equal(routeActivationResult.code, 'LOCUS_QUICK_CAPTURE_ROUTE_ACTIVATE_FAILED');
  assert.equal(routeActivationResult.routeReady, false);
  assert.equal(routeActivationResult.routeTabId, 900);
  assert.deepEqual(routeActivationFailure.control.removedIds, [],
    'route activation failure must retain the source and exact created route');

  const routeChanged = createWorkerHarness(exact);
  routeChanged.control.createResult = {
    id: 900,
    windowId: 321,
    url: 'https://hijacked.test',
  };
  const routeChangedResult = plain(await routeChanged.api.performPopupQuickCaptureAction(
    quickCaptureIntent(),
  ));
  assert.equal(routeChangedResult.code, 'LOCUS_QUICK_CAPTURE_ROUTE_CHANGED');
  assert.equal(routeChangedResult.routeReady, false);
  assert.deepEqual(routeChanged.control.removedIds, [],
    'a route that changed before post-activation validation must leave the source open');

  for (const lateRouteCase of [
    {
      label: 'current URL changed after activation',
      route: {
        id: 900,
        windowId: 321,
        url: 'https://late-navigation.test',
      },
    },
    {
      label: 'pending URL changed after activation',
      route: {
        id: 900,
        windowId: 321,
        url: `chrome-extension://locus/newtab.html#/ws/${encodeURIComponent('ws /?#%台灣')}/home?item=${encodeURIComponent('item /?#%項目')}`,
        pendingUrl: 'https://late-navigation.test',
      },
    },
  ]) {
    const lateRoute = createWorkerHarness(exact);
    lateRoute.control.tabsById.set(77, {
      id: 77,
      windowId: 321,
      active: true,
      url: 'https://saved.test',
    });
    lateRoute.control.tabGetOverrides.set(900, lateRouteCase.route);
    const lateRouteResult = plain(await lateRoute.api.performPopupQuickCaptureAction(
      quickCaptureIntent(),
    ));
    assert.equal(lateRouteResult.ok, false, lateRouteCase.label);
    assert.equal(lateRouteResult.routeReady, false, lateRouteCase.label);
    assert.equal(lateRouteResult.sourceOutcome, 'not-attempted', lateRouteCase.label);
    assert.equal(lateRouteResult.code, 'LOCUS_QUICK_CAPTURE_ROUTE_CHANGED');
    assert.deepEqual(lateRoute.control.tabGets, [900],
      `${lateRouteCase.label} must stop before inspecting the source`);
    assert.deepEqual(lateRoute.control.removedIds, [],
      `${lateRouteCase.label} must leave the source open`);
  }

  const lateRouteReadFailure = createWorkerHarness(exact);
  lateRouteReadFailure.control.tabsById.set(77, {
    id: 77,
    windowId: 321,
    active: true,
    url: 'https://saved.test',
  });
  lateRouteReadFailure.control.tabGetFailures.add(900);
  const lateRouteReadResult = plain(await lateRouteReadFailure.api.performPopupQuickCaptureAction(
    quickCaptureIntent(),
  ));
  assert.equal(lateRouteReadResult.ok, false);
  assert.equal(lateRouteReadResult.routeReady, false);
  assert.equal(lateRouteReadResult.sourceOutcome, 'not-attempted');
  assert.equal(lateRouteReadResult.code, 'LOCUS_QUICK_CAPTURE_ROUTE_UNCONFIRMED');
  assert.deepEqual(lateRouteReadFailure.control.tabGets, [900],
    'an unconfirmed activated route must stop before inspecting the source');
  assert.deepEqual(lateRouteReadFailure.control.removedIds, []);

  const exactQuickRoute = {
    id: 900,
    windowId: 321,
    url: `chrome-extension://locus/newtab.html#/ws/${encodeURIComponent('ws /?#%台灣')}/home?item=${encodeURIComponent('item /?#%項目')}`,
  };
  for (const finalRouteCase of [
    {
      label: 'current URL changed immediately before close',
      finalRoute: {
        ...exactQuickRoute,
        url: 'https://last-moment-navigation.test',
      },
      code: 'LOCUS_QUICK_CAPTURE_ROUTE_CHANGED',
    },
    {
      label: 'pending URL changed immediately before close',
      finalRoute: {
        ...exactQuickRoute,
        pendingUrl: 'https://last-moment-navigation.test',
      },
      code: 'LOCUS_QUICK_CAPTURE_ROUTE_CHANGED',
    },
    {
      label: 'route read failed immediately before close',
      finalRoute: new Error('injected final route read failure'),
      code: 'LOCUS_QUICK_CAPTURE_ROUTE_UNCONFIRMED',
    },
  ]) {
    const finalRoute = createWorkerHarness(exact);
    finalRoute.control.tabsById.set(77, {
      id: 77,
      windowId: 321,
      active: true,
      url: 'https://saved.test',
    });
    finalRoute.control.tabGetSequences.set(900, [
      exactQuickRoute,
      finalRouteCase.finalRoute,
    ]);
    const finalRouteResult = plain(await finalRoute.api.performPopupQuickCaptureAction(
      quickCaptureIntent(),
    ));
    assert.equal(finalRouteResult.ok, false, finalRouteCase.label);
    assert.equal(finalRouteResult.code, finalRouteCase.code, finalRouteCase.label);
    assert.equal(finalRouteResult.routeReady, false, finalRouteCase.label);
    assert.equal(finalRouteResult.sourceOutcome, 'not-attempted', finalRouteCase.label);
    assert.deepEqual(finalRoute.control.tabGets, [900, 77, 900],
      `${finalRouteCase.label} must be the last observation before a possible remove`);
    assert.deepEqual(finalRoute.control.removedIds, [],
      `${finalRouteCase.label} must leave the source open`);
  }

  const focusFailure = createWorkerHarness(exact);
  focusFailure.control.focusFailure = new Error('injected focus failure');
  const focusFailureResult = plain(await focusFailure.api.performPopupQuickCaptureAction(
    quickCaptureIntent(),
  ));
  assert.equal(focusFailureResult.code, 'LOCUS_QUICK_CAPTURE_ROUTE_ACTIVATE_FAILED');
  assert.equal(focusFailureResult.sourceOutcome, 'not-attempted');
  assert.deepEqual(focusFailure.control.removedIds, [],
    'an unfocused destination must not trigger a source close');
}

function moveGroupWithinWorkspace(state) {
  const group = state.workspaces[0].categories[0].groups.shift();
  state.workspaces[0].categories[1].groups.push(group);
  return group;
}

async function testWindowSaveGroupResolverAndRouteCodec() {
  const { api } = createWorkerHarness();
  const exact = fixtureState();
  const before = JSON.stringify(exact);
  const resolved = api.resolvePopupWindowSaveGroup(exact, {
    workspaceId: exact.workspaces[0].id,
    groupId: 'group-a',
  });
  assert.equal(resolved.group.id, 'group-a', 'the exact active receiving Group must resolve');
  assert.equal(resolved.category.id, 'space-a');
  assert.equal(JSON.stringify(exact), before, 'window-save Group resolution must not mutate authoritative state');

  const moved = fixtureState();
  const movedGroup = moveGroupWithinWorkspace(moved);
  const movedTarget = api.resolvePopupWindowSaveGroup(moved, {
    workspaceId: moved.workspaces[0].id,
    groupId: movedGroup.id,
  });
  assert.equal(movedTarget.category.id, 'space-b',
    'a receiving Group moved within the original Workspace must resolve at its current Space');

  const duplicate = fixtureState();
  duplicate.workspaces[0].categories[1].groups.push({
    id: 'group-a',
    name: 'Duplicate identity',
    items: [],
  });
  assert.equal(api.resolvePopupWindowSaveGroup(duplicate, {
    workspaceId: duplicate.workspaces[0].id,
    groupId: 'group-a',
  }), null, 'duplicate active Group identity must fail closed');

  const duplicateWorkspace = fixtureState();
  duplicateWorkspace.workspaces.push({ id: duplicateWorkspace.workspaces[0].id, categories: [] });
  assert.equal(api.resolvePopupWindowSaveGroup(duplicateWorkspace, {
    workspaceId: duplicateWorkspace.workspaces[0].id,
    groupId: 'group-a',
  }), null, 'duplicate Workspace identity must fail closed for a window-save destination');

  const duplicateSpaceOwner = fixtureState();
  duplicateSpaceOwner.workspaces[0].categories.push({ id: 'space-a', groups: [] });
  assert.equal(api.resolvePopupWindowSaveGroup(duplicateSpaceOwner, {
    workspaceId: duplicateSpaceOwner.workspaces[0].id,
    groupId: 'group-a',
  }), null, 'duplicate owning Space identity must fail closed for a window-save destination');

  const movedOut = fixtureState();
  const outsideGroup = movedOut.workspaces[0].categories[0].groups.shift();
  movedOut.workspaces[1].categories[0].groups.push(outsideGroup);
  assert.equal(api.resolvePopupWindowSaveGroup(movedOut, {
    workspaceId: movedOut.workspaces[0].id,
    groupId: outsideGroup.id,
  }), null, 'a receiving Group moved outside the original Workspace must fail closed');

  const storedOnly = fixtureState();
  const archivedGroup = storedOnly.workspaces[0].categories[0].groups.shift();
  storedOnly.archive.push(archivedGroup);
  assert.equal(api.resolvePopupWindowSaveGroup(storedOnly, {
    workspaceId: storedOnly.workspaces[0].id,
    groupId: archivedGroup.id,
  }), null, 'Archive and Trash must not become active whole-window destinations');

  const workspaceId = 'ws /?#%台灣';
  const groupId = 'group /?#%群組';
  const hash = api.buildPopupWindowSaveHash(workspaceId, groupId);
  assert.equal(hash, `#/ws/${encodeURIComponent(workspaceId)}/group/${encodeURIComponent(groupId)}`,
    'whole-window destination routes must encode every identifier');
  const routeContext = vm.createContext({});
  vm.runInContext(`${routerCodecSource}\nglobalThis.__routerCodec = { parse, build };`, routeContext);
  const parsed = plain(routeContext.__routerCodec.parse(hash));
  assert.deepEqual(parsed, {
    type: 'group',
    wsId: workspaceId,
    groupId,
    itemId: null,
    query: {},
  }, 'worker-built Group route must round-trip through the production parser');
  assert.equal(routeContext.__routerCodec.build(parsed), hash.slice(1),
    'production route builder must preserve the whole-window Group route exactly');
}

async function testWorkerOrderingAndPartialResults() {
  const exact = fixtureState();
  const intent = {
    workspaceId: exact.workspaces[0].id,
    itemId: 'item /?#%項目',
    sourceTabId: 77,
    sourceWindowId: 321,
    sourceWasActive: true,
    expectedUrl: 'https://saved.test',
    closeSource: true,
  };
  const success = createWorkerHarness(exact);
  const result = plain(await success.api.performPopupLocateSavedItem(intent));
  assert.deepEqual(success.control.calls,
    ['get', 'create', 'tab-get', 'update', 'focus', 'tab-get', 'tab-get', 'tab-get', 'remove'],
    'worker must check source identity before activation, then recheck recovery and source before close');
  assert.equal(success.control.created.active, false, 'recovery route must exist before source close');
  assert.equal(success.control.created.windowId, intent.sourceWindowId, 'recovery must stay in the source popup window');
  assert.deepEqual(success.control.focused, { windowId: intent.sourceWindowId, options: { focused: true } });
  assert.equal(success.control.created.url, `chrome-extension://locus/newtab.html#/ws/${encodeURIComponent(intent.workspaceId)}/home?item=${encodeURIComponent(intent.itemId)}`);
  assert.deepEqual(result, { ok: true, routeCreated: true, sourceClosed: true, sourceCloseFailed: false });

  const keepSource = createWorkerHarness(exact);
  await keepSource.api.performPopupLocateSavedItem({ ...intent, closeSource: false });
  assert.deepEqual(keepSource.control.calls, ['get', 'create', 'update', 'focus', 'tab-get'],
    'close-disabled Locate must confirm recovery while leaving the source untouched');

  const stale = createWorkerHarness(exact);
  const staleResult = plain(await stale.api.performPopupLocateSavedItem({ ...intent, itemId: 'missing' }));
  assert.equal(staleResult.ok, false);
  assert.deepEqual(stale.control.calls, ['get'], 'stale identity must cause no browser effect');

  const createFailure = createWorkerHarness(exact);
  createFailure.control.createFailure = new Error('injected create failure');
  const createResult = plain(await createFailure.api.performPopupLocateSavedItem(intent));
  assert.equal(createResult.code, 'LOCUS_LOCATE_CREATE_FAILED');
  assert.deepEqual(createFailure.control.calls, ['get', 'create'], 'route creation failure must leave the source open');

  const changedSource = createWorkerHarness(exact);
  changedSource.control.tabsById.set(77, {
    id: 77,
    windowId: 321,
    active: false,
    url: 'https://navigated-after-save.test',
  });
  const changedSourceResult = plain(await changedSource.api.performPopupLocateSavedItem(intent));
  assert.equal(changedSourceResult.ok, false,
    'an accepted Save with a protected source must remain an explicit partial Locate result');
  assert.equal(changedSourceResult.code, 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED');
  assert.equal(changedSourceResult.noticeShown, true);
  assert.equal(changedSourceResult.sourceClosed, false);
  assert.equal(changedSourceResult.sourceCloseFailed, true);
  assert.deepEqual(changedSource.control.removedIds, [],
    'a source that navigated during the accepted save must remain open');

  const ambiguousSource = createWorkerHarness(exact);
  ambiguousSource.control.tabsById.set(77, {
    id: 77,
    windowId: 321,
    url: 'https://saved.test',
  });
  const ambiguousSourceResult = plain(await ambiguousSource.api.performPopupLocateSavedItem(intent));
  assert.equal(ambiguousSourceResult.sourceClosed, false);
  assert.equal(ambiguousSourceResult.sourceCloseFailed, true);
  assert.deepEqual(ambiguousSource.control.removedIds, [],
    'an ambiguous source active-state must fail closed');

  for (const sourceCase of [
    {
      label: 'returned source identity changed',
      tab: { id: 88, windowId: 321, active: true, url: 'https://saved.test' },
    },
    {
      label: 'source moved to another window',
      tab: { id: 77, windowId: 999, active: true, url: 'https://saved.test' },
    },
    {
      label: 'source was no longer the reviewed active tab',
      tab: { id: 77, windowId: 321, active: false, url: 'https://saved.test' },
    },
    {
      label: 'source gained a conflicting pending navigation',
      tab: {
        id: 77,
        windowId: 321,
        active: true,
        url: 'https://saved.test',
        pendingUrl: 'https://pending-navigation.test',
      },
    },
  ]) {
    const protectedSource = createWorkerHarness(exact);
    protectedSource.control.tabsById.set(77, sourceCase.tab);
    const protectedResult = plain(await protectedSource.api.performPopupLocateSavedItem(intent));
    assert.equal(protectedResult.code, 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED', sourceCase.label);
    assert.equal(protectedResult.sourceClosed, false, sourceCase.label);
    assert.equal(protectedResult.sourceCloseFailed, true, sourceCase.label);
    assert.deepEqual(protectedSource.control.removedIds, [], sourceCase.label);
  }

  const emptyPendingSource = createWorkerHarness(exact);
  emptyPendingSource.control.tabsById.set(77, {
    id: 77,
    windowId: 321,
    active: true,
    url: 'https://saved.test',
    pendingUrl: '',
  });
  const emptyPendingResult = plain(await emptyPendingSource.api.performPopupLocateSavedItem(intent));
  assert.equal(emptyPendingResult.sourceClosed, true,
    'an empty pending URL is not a conflicting navigation');

  for (const postActivationCase of [
    {
      label: 'source navigated after route activation',
      tab: {
        id: 77,
        windowId: 321,
        active: false,
        url: 'https://navigated-after-activation.test',
      },
    },
    {
      label: 'source became active again after route activation',
      tab: { id: 77, windowId: 321, active: true, url: 'https://saved.test' },
    },
  ]) {
    const changedAfterActivation = createWorkerHarness(exact);
    changedAfterActivation.control.tabGetSequences.set(77, [
      { id: 77, windowId: 321, active: true, url: 'https://saved.test' },
      postActivationCase.tab,
    ]);
    const changedAfterActivationResult = plain(
      await changedAfterActivation.api.performPopupLocateSavedItem(intent),
    );
    assert.equal(changedAfterActivationResult.code, 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED', postActivationCase.label);
    assert.equal(changedAfterActivationResult.sourceClosed, false, postActivationCase.label);
    assert.equal(changedAfterActivationResult.sourceCloseFailed, true, postActivationCase.label);
    assert.deepEqual(changedAfterActivation.control.removedIds, [], postActivationCase.label);
  }

  const changedRoute = createWorkerHarness(exact);
  changedRoute.control.tabGetSequences.set(900, [{
    id: 900,
    windowId: 321,
    active: true,
    url: `chrome-extension://locus/newtab.html#/ws/${encodeURIComponent(intent.workspaceId)}/home?item=${encodeURIComponent(intent.itemId)}`,
  }, {
    id: 900,
    windowId: 321,
    active: true,
    url: 'https://route-changed-after-focus.test',
  }]);
  const changedRouteResult = plain(await changedRoute.api.performPopupLocateSavedItem(intent));
  assert.equal(changedRouteResult.ok, false);
  assert.equal(changedRouteResult.code, 'LOCUS_LOCATE_ROUTE_CHANGED');
  assert.equal(changedRouteResult.routeCreated, false,
    'a changed tab must not be offered as the exact recovery route');
  assert.deepEqual(changedRoute.control.removedIds, [],
    'a recovery route that changed after focus must leave the source open');

  const pendingOnlyRoute = createWorkerHarness(exact);
  const exactRouteUrl = `chrome-extension://locus/newtab.html#/ws/${encodeURIComponent(intent.workspaceId)}/home?item=${encodeURIComponent(intent.itemId)}`;
  pendingOnlyRoute.control.tabGetSequences.set(900, [{
    id: 900,
    windowId: 321,
    active: true,
    url: '',
    pendingUrl: exactRouteUrl,
  }, {
    id: 900,
    windowId: 321,
    active: true,
    url: '',
    pendingUrl: exactRouteUrl,
  }]);
  const pendingOnlyRouteResult = plain(
    await pendingOnlyRoute.api.performPopupLocateSavedItem(intent),
  );
  assert.equal(pendingOnlyRouteResult.code, 'LOCUS_LOCATE_ROUTE_UNCONFIRMED');
  assert.equal(pendingOnlyRouteResult.routeCreated, false);
  assert.deepEqual(pendingOnlyRoute.control.removedIds, [],
    'a route that is still only pending must not authorize source removal');

  const unconfirmedRoute = createWorkerHarness(exact);
  unconfirmedRoute.control.tabGetSequences.set(900, [new Error('injected route read failure')]);
  const unconfirmedRouteResult = plain(
    await unconfirmedRoute.api.performPopupLocateSavedItem(intent),
  );
  assert.equal(unconfirmedRouteResult.code, 'LOCUS_LOCATE_ROUTE_UNCONFIRMED');
  assert.equal(unconfirmedRouteResult.routeCreated, false);
  assert.deepEqual(unconfirmedRoute.control.removedIds, [],
    'an unconfirmed focused route must leave the source open');

  const closeFailure = createWorkerHarness(exact);
  closeFailure.control.removeFailure = new Error('injected remove failure');
  const closeResult = plain(await closeFailure.api.performPopupLocateSavedItem(intent));
  assert.equal(closeResult.ok, false,
    'a close failure must not be serialized as a fully successful Locate');
  assert.equal(closeResult.code, 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED');
  assert.equal(closeResult.sourceCloseFailed, true);
  assert.equal(closeResult.noticeShown, true);
  assert.deepEqual(closeResult.destination, {
    workspaceId: intent.workspaceId,
    categoryId: 'space-a',
    categoryName: 'Research',
    groupId: 'group-a',
    groupName: 'Inbox',
    itemId: intent.itemId,
  }, 'a partial Locate result must carry only the current authoritative destination');
  assert.deepEqual(closeFailure.control.calls,
    ['get', 'create', 'tab-get', 'update', 'focus', 'tab-get', 'tab-get', 'tab-get', 'remove', 'notify'],
    'source-close failure must happen only after recovery is active and still report the partial result');
  assert.match(closeFailure.control.notification.id, /^te-popup-locate-900\|321\|/,
    'fallback notices must retain the exact recovery tab, window, and route identity');

  const noticeFailure = createWorkerHarness(exact);
  noticeFailure.control.removeFailure = new Error('injected remove failure');
  noticeFailure.control.notificationFailure = new Error('injected notification failure');
  const noticeFailureResult = plain(await noticeFailure.api.performPopupLocateSavedItem(intent));
  assert.equal(noticeFailureResult.ok, false);
  assert.equal(noticeFailureResult.code, 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED');
  assert.equal(noticeFailureResult.noticeShown, false,
    'notification failure must remain explicit in the partial effect receipt');
  assert.deepEqual(noticeFailure.control.removedIds, [77],
    'the failed close attempt must never be retried after notification failure');

  const activationFailure = createWorkerHarness(exact);
  activationFailure.control.updateFailure = new Error('injected activation failure');
  const activationResult = plain(await activationFailure.api.performPopupLocateSavedItem({ ...intent, closeSource: false }));
  assert.equal(activationResult.code, 'LOCUS_LOCATE_ACTIVATE_FAILED');
  assert.equal(activationResult.routeCreated, true, 'activation failure must retain the already-created recovery route');
  assert.equal(activationResult.routeTabId, 900, 'activation failure must return the exact recovery tab for a retry');
  assert.equal(activationResult.routeWindowId, intent.sourceWindowId,
    'the retry receipt must retain the recovery window identity');
  assert.equal(activationResult.routeUrl,
    `chrome-extension://locus/newtab.html#/ws/${encodeURIComponent(intent.workspaceId)}/home?item=${encodeURIComponent(intent.itemId)}`,
    'the retry receipt must retain the exact local saved-item route');
  assert.equal(activationResult.sourceCloseFailed, false);
  assert.deepEqual(activationFailure.control.calls, ['get', 'create', 'update', 'tab-get', 'notify']);

  const changedActivationFailure = createWorkerHarness(exact);
  changedActivationFailure.control.updateFailure = new Error('injected activation failure');
  changedActivationFailure.control.tabGetSequences.set(900, [{
    id: 900,
    windowId: 321,
    active: false,
    url: 'https://changed-before-retry.test',
  }]);
  const changedActivationResult = plain(
    await changedActivationFailure.api.performPopupLocateSavedItem({ ...intent, closeSource: false }),
  );
  assert.equal(changedActivationResult.routeCreated, false,
    'an activation error must not trust a changed tab as the exact retry route');
  assert.equal(changedActivationResult.routeTabId, undefined);
  assert.equal(changedActivationFailure.control.notification, undefined,
    'an untrusted route must not receive an exact-tab notification action');
  assert.deepEqual(changedActivationFailure.control.removedIds, []);

  const focusFailure = createWorkerHarness(exact);
  focusFailure.control.focusFailure = new Error('injected focus failure');
  const focusResult = plain(await focusFailure.api.performPopupLocateSavedItem({ ...intent, closeSource: false }));
  assert.equal(focusResult.code, 'LOCUS_LOCATE_ACTIVATE_FAILED');
  assert.equal(focusResult.routeTabId, 900);
  assert.deepEqual(focusFailure.control.calls, ['get', 'create', 'update', 'focus', 'tab-get', 'notify'],
    'an unfocused recovery window must remain a typed partial result with a recovery path');
  await assert.rejects(focusFailure.api.activatePopupLocateTab(900), error =>
    error?.code === 'LOCUS_LOCATE_WINDOW_FOCUS_FAILED'
      && error?.routeTab?.url === focusFailure.control.created.url,
  'focus failure must retain the exact local route for a visible notification fallback');

  const activationBeforeCloseFailure = createWorkerHarness(exact);
  activationBeforeCloseFailure.control.updateFailure = new Error('injected activation failure');
  const activationBeforeCloseResult = plain(
    await activationBeforeCloseFailure.api.performPopupLocateSavedItem(intent),
  );
  assert.equal(activationBeforeCloseResult.sourceClosed, false,
    'an inactive recovery route must leave source closing unattempted');
  assert.equal(activationBeforeCloseResult.sourceCloseFailed, true,
    'the partial receipt must disclose that the requested close did not happen');
  assert.deepEqual(activationBeforeCloseFailure.control.removedIds, [],
    'activation failure must preserve the source as the remaining recovery surface');
  assert.deepEqual(activationBeforeCloseFailure.control.calls,
    ['get', 'create', 'tab-get', 'update', 'tab-get', 'notify']);
}

async function testWindowSaveWorkerEffects() {
  const exact = fixtureState();
  exact.workspaces[0].categories[0].groups[0].items.push(
    { id: 'saved-ten', type: 'tab', url: 'https://ten.test' },
    {
      id: 'saved-stack',
      type: 'stack',
      items: [{ id: 'saved-eleven', type: 'tab', url: 'https://eleven.test' }],
    },
    { id: 'saved-twelve', type: 'tab', url: 'https://twelve.test' },
  );
  const baseIntent = {
    workspaceId: exact.workspaces[0].id,
    groupId: 'group-a',
    sourceWindowId: 321,
    keepTabId: 99,
    sourceTabs: [
      { tabId: 10, expectedUrl: 'https://ten.test' },
      { tabId: 11, expectedUrl: 'https://eleven.test' },
      { tabId: 10, expectedUrl: 'https://duplicate.test' },
      { tabId: 99, expectedUrl: 'https://keep.test' },
      { tabId: '11', expectedUrl: 'https://string-id.test' },
      { tabId: -1, expectedUrl: 'https://negative.test' },
      { tabId: 12.5, expectedUrl: 'https://fractional.test' },
      { tabId: 12, expectedUrl: '' },
      { tabId: 13 },
      null,
    ],
    closeSources: true,
  };

  const cyclicGroup = { items: [{ id: 'cycle-tab', type: 'tab', url: 'https://cycle.test' }] };
  cyclicGroup.items.push(cyclicGroup);
  assert.deepEqual([...createWorkerHarness(exact).api.popupWindowSaveGroupUrls(cyclicGroup)], ['https://cycle.test'],
    'recoverable URL collection must traverse nested content once and terminate on cyclic legacy objects');

  const normalized = createWorkerHarness(exact);
  normalized.control.tabsById.set(10, { id: 10, windowId: 321, url: 'https://ten.test' });
  normalized.control.tabsById.set(11, { id: 11, windowId: 321, url: 'https://eleven.test' });
  assert.deepEqual(plain(normalized.api.popupWindowSaveSources(baseIntent)), [
    { tabId: 10, expectedUrl: 'https://ten.test' },
    { tabId: 11, expectedUrl: 'https://eleven.test' },
  ], 'source descriptors must reject malformed values, deduplicate IDs, exclude the keep-tab, and preserve expected URLs');
  const success = plain(await normalized.api.performPopupWindowSaveEffect(baseIntent));
  assert.deepEqual(normalized.control.calls, ['get', 'tab-get', 'remove', 'tab-get', 'remove'],
    'the worker must fresh-resolve the destination before confirming and closing each source');
  assert.deepEqual(normalized.control.tabGets, [10, 11]);
  assert.deepEqual(normalized.control.removedIds, [10, 11]);
  assert.deepEqual(success, {
    ok: true,
    destinationReady: true,
    destination: windowSaveDestination(baseIntent),
    closeRequested: true,
    requestedCount: 2,
    closedCount: 2,
    unconfirmedCount: 0,
  });

  const keepOpen = createWorkerHarness(exact);
  const keepOpenResult = plain(await keepOpen.api.performPopupWindowSaveEffect({
    ...baseIntent,
    closeSources: false,
  }));
  assert.deepEqual(keepOpen.control.calls, ['get'],
    'close-off must validate the accepted destination without touching any source tab');
  assert.deepEqual(keepOpenResult, {
    ok: true,
    destinationReady: true,
    destination: windowSaveDestination(baseIntent),
    closeRequested: false,
    requestedCount: 2,
    closedCount: 0,
    unconfirmedCount: 0,
  });

  const movedAndRenamed = fixtureState();
  const movedAndRenamedGroup = moveGroupWithinWorkspace(movedAndRenamed);
  movedAndRenamed.workspaces[0].categories[1].name = 'Current Space';
  movedAndRenamedGroup.name = 'Current Group';
  const movedAndRenamedHarness = createWorkerHarness(movedAndRenamed);
  const movedAndRenamedResult = plain(await movedAndRenamedHarness.api.performPopupWindowSaveEffect({
    ...baseIntent,
    closeSources: false,
  }));
  assert.deepEqual(movedAndRenamedResult.destination, {
    workspaceId: movedAndRenamed.workspaces[0].id,
    categoryId: 'space-b',
    categoryName: 'Current Space',
    groupId: 'group-a',
    groupName: 'Current Group',
  }, 'a moved receiving Group receipt must return its authoritative current Space and Group names');
  assert.deepEqual(movedAndRenamedHarness.control.calls, ['get'],
    'close-off destination refresh must not inspect or close source tabs');

  const invalidWindow = createWorkerHarness(exact);
  const invalidWindowResult = plain(await invalidWindow.api.performPopupWindowSaveEffect({
    ...baseIntent,
    sourceWindowId: -1,
  }));
  assert.equal(invalidWindowResult.code, 'LOCUS_WINDOW_SAVE_SOURCE_UNAVAILABLE');
  assert.equal(invalidWindowResult.unconfirmedCount, 2);
  assert.deepEqual(invalidWindow.control.calls, ['get'],
    'an invalid source-window identity must not inspect or close a tab');

  const wrongWindow = createWorkerHarness(exact);
  wrongWindow.control.tabsById.set(10, { id: 10, windowId: 999, url: 'https://ten.test' });
  wrongWindow.control.tabsById.set(11, { id: 11, windowId: 321, url: 'https://eleven.test' });
  const wrongWindowResult = plain(await wrongWindow.api.performPopupWindowSaveEffect(baseIntent));
  assert.equal(wrongWindowResult.code, 'LOCUS_WINDOW_SAVE_CLOSE_PARTIAL');
  assert.equal(wrongWindowResult.closedCount, 1);
  assert.equal(wrongWindowResult.unconfirmedCount, 1);
  assert.deepEqual(wrongWindow.control.removedIds, [11],
    'a tab moved out of the captured source window must never be closed');

  const activeAtCheck = createWorkerHarness(exact);
  activeAtCheck.control.tabsById.set(10, { id: 10, windowId: 321, url: 'https://ten.test', active: true });
  activeAtCheck.control.tabsById.set(11, { id: 11, windowId: 321, url: 'https://eleven.test', active: false });
  const activeAtCheckResult = plain(await activeAtCheck.api.performPopupWindowSaveEffect(baseIntent));
  assert.equal(activeAtCheckResult.code, 'LOCUS_WINDOW_SAVE_CLOSE_PARTIAL');
  assert.equal(activeAtCheckResult.closedCount, 1);
  assert.equal(activeAtCheckResult.unconfirmedCount, 1);
  assert.deepEqual(activeAtCheck.control.removedIds, [11],
    'a source candidate that became active after capture must never be removed');

  const contentRemoved = clone(exact);
  const nestedItems = contentRemoved.workspaces[0].categories[0].groups[0].items
    .find(item => item.id === 'saved-stack').items;
  nestedItems.splice(0, nestedItems.length);
  const contentRemovedHarness = createWorkerHarness(contentRemoved);
  contentRemovedHarness.control.tabsById.set(10, { id: 10, windowId: 321, url: 'https://ten.test' });
  contentRemovedHarness.control.tabsById.set(11, { id: 11, windowId: 321, url: 'https://eleven.test' });
  const contentRemovedResult = plain(await contentRemovedHarness.api.performPopupWindowSaveEffect(baseIntent));
  assert.equal(contentRemovedResult.closedCount, 1);
  assert.equal(contentRemovedResult.unconfirmedCount, 1);
  assert.deepEqual(contentRemovedHarness.control.tabGets, [10]);
  assert.deepEqual(contentRemovedHarness.control.removedIds, [10],
    'a present receiving Group must not authorize closing a URL no longer recoverable from that Group');

  const changedNavigation = createWorkerHarness(exact);
  changedNavigation.control.tabsById.set(10, { id: 10, windowId: 321, url: 'https://navigated.test' });
  changedNavigation.control.tabsById.set(11, {
    id: 11,
    windowId: 321,
    url: 'https://eleven.test',
    pendingUrl: 'https://pending-elsewhere.test',
  });
  changedNavigation.control.tabsById.set(12, {
    id: 12,
    windowId: 321,
    url: 'https://twelve.test',
    pendingUrl: 'https://twelve.test',
  });
  const changedNavigationResult = plain(await changedNavigation.api.performPopupWindowSaveEffect({
    ...baseIntent,
    sourceTabs: [
      { tabId: 10, expectedUrl: 'https://ten.test' },
      { tabId: 11, expectedUrl: 'https://eleven.test' },
      { tabId: 12, expectedUrl: 'https://twelve.test' },
    ],
  }));
  assert.equal(changedNavigationResult.closedCount, 1);
  assert.equal(changedNavigationResult.unconfirmedCount, 2);
  assert.deepEqual(changedNavigation.control.removedIds, [12],
    'current or pending URL mismatches must preserve the tab, while an exact matching pending URL may close');

  const partial = createWorkerHarness(exact);
  partial.control.tabsById.set(10, { id: 10, windowId: 321, url: 'https://ten.test' });
  partial.control.tabsById.set(11, { id: 11, windowId: 321, url: 'https://eleven.test' });
  partial.control.tabsById.set(12, { id: 12, windowId: 321, url: 'https://twelve.test' });
  partial.control.tabGetFailures.add(10);
  partial.control.tabRemoveFailures.add(11);
  const partialResult = plain(await partial.api.performPopupWindowSaveEffect({
    ...baseIntent,
    sourceTabs: [
      { tabId: 10, expectedUrl: 'https://ten.test' },
      { tabId: 11, expectedUrl: 'https://eleven.test' },
      { tabId: 12, expectedUrl: 'https://twelve.test' },
    ],
  }));
  assert.equal(partialResult.ok, false);
  assert.equal(partialResult.code, 'LOCUS_WINDOW_SAVE_CLOSE_PARTIAL');
  assert.equal(partialResult.requestedCount, 3);
  assert.equal(partialResult.closedCount, 1);
  assert.equal(partialResult.unconfirmedCount, 2,
    'get and remove failures must each contribute one truthful unconfirmed source count');
  assert.deepEqual(partial.control.tabGets, [10, 11, 12]);
  assert.deepEqual(partial.control.removedIds, [11, 12]);

  const stale = createWorkerHarness(exact);
  const staleResult = plain(await stale.api.performPopupWindowSaveEffect({
    ...baseIntent,
    groupId: 'missing',
  }));
  assert.equal(staleResult.ok, false);
  assert.equal(staleResult.code, 'LOCUS_WINDOW_SAVE_DESTINATION_UNAVAILABLE');
  assert.equal(staleResult.destinationReady, false);
  assert.equal(staleResult.unconfirmedCount, 2);
  assert.deepEqual(stale.control.calls, ['get'],
    'a stale receiving Group must cause no source-tab browser effect');

  const movedOut = fixtureState();
  const movedOutGroup = movedOut.workspaces[0].categories[0].groups.shift();
  movedOut.workspaces[1].categories[0].groups.push(movedOutGroup);
  const movedOutHarness = createWorkerHarness(movedOut);
  const movedOutResult = plain(await movedOutHarness.api.performPopupWindowSaveEffect(baseIntent));
  assert.equal(movedOutResult.code, 'LOCUS_WINDOW_SAVE_DESTINATION_UNAVAILABLE');
  assert.deepEqual(movedOutHarness.control.calls, ['get'],
    'cross-Workspace destination movement must fail closed before source effects');
}

async function testOpenWindowSaveDestination() {
  const exact = fixtureState();
  const intent = {
    workspaceId: exact.workspaces[0].id,
    groupId: 'group-a',
    sourceWindowId: 321,
  };
  const routeUrl = `chrome-extension://locus/newtab.html#/ws/${encodeURIComponent(intent.workspaceId)}/group/${encodeURIComponent(intent.groupId)}`;

  const create = createWorkerHarness(exact);
  const createResult = plain(await create.api.performPopupOpenWindowSaveDestination(intent));
  assert.deepEqual(create.control.calls, ['get', 'query', 'create', 'update', 'focus'],
    'Open destination must fresh-resolve, inspect the source window, create inactive, activate, then focus');
  assert.deepEqual(create.control.queried, [{ windowId: 321 }]);
  assert.deepEqual(create.control.created, { url: routeUrl, active: false, windowId: 321 });
  assert.deepEqual(create.control.updated, { tabId: 900, options: { active: true } });
  assert.deepEqual(create.control.focused, { windowId: 321, options: { focused: true } });
  assert.deepEqual(createResult, { ok: true, routeCreated: true, routeTabId: 900 });

  const reuse = createWorkerHarness(exact);
  reuse.control.queryTabs = [{
    id: 777,
    windowId: 321,
    url: routeUrl,
    active: false,
  }, {
    id: 778,
    windowId: 321,
    url: 'chrome-extension://locus/newtab.html#/ws/other/group/other',
  }];
  const reuseResult = plain(await reuse.api.performPopupOpenWindowSaveDestination(intent));
  assert.deepEqual(reuse.control.calls, ['get', 'query', 'update', 'focus'],
    'an exact existing destination tab must be reused instead of duplicated');
  assert.deepEqual(reuse.control.updated, { tabId: 777, options: { active: true } });
  assert.deepEqual(reuseResult, { ok: true, routeCreated: true, routeTabId: 777 });

  const routeChanged = createWorkerHarness(exact);
  routeChanged.control.queryTabs = [{
    id: 777,
    windowId: 321,
    url: routeUrl,
    active: false,
  }];
  routeChanged.control.tabsById.set(777, {
    id: 777,
    windowId: 321,
    url: 'https://navigated-before-activation.test',
    active: false,
  });
  const routeChangedResult = plain(await routeChanged.api.performPopupOpenWindowSaveDestination(intent));
  assert.deepEqual(routeChangedResult, {
    ok: false,
    code: 'LOCUS_WINDOW_DESTINATION_ROUTE_CHANGED',
  }, 'a reused tab that navigates before activation must keep exact destination recovery retryable');
  assert.deepEqual(routeChanged.control.calls, ['get', 'query', 'update', 'focus']);

  const stale = createWorkerHarness(exact);
  const staleResult = plain(await stale.api.performPopupOpenWindowSaveDestination({
    ...intent,
    groupId: 'missing',
  }));
  assert.equal(staleResult.code, 'LOCUS_WINDOW_DESTINATION_UNAVAILABLE');
  assert.deepEqual(stale.control.calls, ['get'],
    'a stale destination must create, reuse, activate, and focus nothing');

  const queryFailure = createWorkerHarness(exact);
  queryFailure.control.queryFailure = new Error('injected query failure');
  const queryResult = plain(await queryFailure.api.performPopupOpenWindowSaveDestination(intent));
  assert.equal(queryResult.code, 'LOCUS_WINDOW_DESTINATION_CREATE_FAILED');
  assert.deepEqual(queryFailure.control.calls, ['get', 'query']);

  const createFailure = createWorkerHarness(exact);
  createFailure.control.createFailure = new Error('injected create failure');
  const failedCreateResult = plain(await createFailure.api.performPopupOpenWindowSaveDestination(intent));
  assert.equal(failedCreateResult.code, 'LOCUS_WINDOW_DESTINATION_CREATE_FAILED');
  assert.deepEqual(createFailure.control.calls, ['get', 'query', 'create']);

  const invalidCreatedTab = createWorkerHarness(exact);
  invalidCreatedTab.control.createResult = { id: 'not-a-tab', windowId: 321, url: routeUrl };
  const invalidCreatedResult = plain(await invalidCreatedTab.api.performPopupOpenWindowSaveDestination(intent));
  assert.equal(invalidCreatedResult.code, 'LOCUS_WINDOW_DESTINATION_CREATE_FAILED');
  assert.deepEqual(invalidCreatedTab.control.calls, ['get', 'query', 'create'],
    'a route without an exact integer tab identity must never be activated');

  const activationFailure = createWorkerHarness(exact);
  activationFailure.control.updateFailure = new Error('injected activation failure');
  const activationResult = plain(await activationFailure.api.performPopupOpenWindowSaveDestination(intent));
  assert.deepEqual(activationResult, {
    ok: false,
    code: 'LOCUS_WINDOW_DESTINATION_ACTIVATE_FAILED',
    routeCreated: true,
    routeTabId: 900,
  }, 'activation failure must retain the exact created destination tab for retry');
  assert.deepEqual(activationFailure.control.calls, ['get', 'query', 'create', 'update']);

  const focusFailure = createWorkerHarness(exact);
  focusFailure.control.focusFailure = new Error('injected focus failure');
  const focusResult = plain(await focusFailure.api.performPopupOpenWindowSaveDestination(intent));
  assert.deepEqual(focusResult, {
    ok: false,
    code: 'LOCUS_WINDOW_DESTINATION_ACTIVATE_FAILED',
    routeCreated: true,
    routeTabId: 900,
  }, 'window-focus failure must retain the exact activated destination tab for retry');
  assert.deepEqual(focusFailure.control.calls, ['get', 'query', 'create', 'update', 'focus']);
}

async function testCombinedStateReceipt() {
  const candidate = fixtureState();
  const intent = {
    workspaceId: candidate.workspaces[0].id,
    itemId: 'item /?#%項目',
    sourceTabId: 77,
    sourceWindowId: 321,
    sourceWasActive: true,
    expectedUrl: 'https://saved.test',
    closeSource: true,
  };
  const accepted = createWorkerHarness({ ...fixtureState(), workspaces: [] });
  const response = plain(await accepted.api.handleStateWriteMessage({ state: candidate, locateSavedItem: intent }));
  assert.deepEqual(response, {
    ok: true,
    revision: candidate._revision + 1,
  }, 'a state receipt must not carry or await a Locate browser effect');
  assert.deepEqual(accepted.control.calls, ['set'],
    'even a legacy state message carrying Locate intent must perform only the state write');
  assert.deepEqual(accepted.control.removedIds, []);

  const rejected = createWorkerHarness({ ...fixtureState(), workspaces: [] });
  rejected.control.setFailure = Object.assign(new Error('conflict'), { code: 'LOCUS_STATE_CONFLICT' });
  await assert.rejects(rejected.api.handleStateWriteMessage({ state: candidate, locateSavedItem: intent }), /conflict/);
  assert.deepEqual(rejected.control.calls, ['set'], 'rejected state writes must create no route and close no source');

  const stateHandlerSource = sourceSlice(
    backgroundSource,
    'async function handleStateWriteMessage(',
    '\nchrome.runtime.onMessage.addListener',
    'State-write handler',
  );
  assert.doesNotMatch(stateHandlerSource, /performPopupLocateSavedItem|locateSavedItem/,
    'the accepted-state receipt must remain independent from Locate completion');
  assert.match(backgroundSource,
    /message\?\.type === 'locus-complete-popup-locate'[\s\S]{0,220}enqueueStateWrite\(\(\) => performPopupLocateSavedItem\(message\)\)/,
    'Locate completion must enter the central queue through its own worker message');
}

async function testQuickCaptureStateReceiptBoundary() {
  const candidate = fixtureState();
  const receiptIntent = {
    workspaceId: candidate.workspaces[0].id,
    itemId: 'item /?#%項目',
    sourceTabId: 77,
    sourceWindowId: 321,
    sourceWasActive: true,
    expectedUrl: 'https://saved.test',
    closeSource: true,
  };
  const accepted = createWorkerHarness({ ...fixtureState(), workspaces: [] });
  const response = plain(await accepted.api.handleStateWriteMessage({
    state: candidate,
    quickCaptureItem: receiptIntent,
  }));
  assert.deepEqual(response, {
    ok: true,
    revision: candidate._revision + 1,
    quickCaptureResult: {
      ok: true,
      destinationReady: true,
      destination: quickCaptureDestination(),
    },
  }, 'the state response must combine acceptance with the exact quick-capture destination receipt');
  assert.deepEqual(accepted.control.calls, ['set'],
    'a quick-capture state receipt must inspect the accepted candidate without running any tab effect');
  assert.deepEqual(accepted.control.removedIds, []);

  const unavailable = createWorkerHarness({ ...fixtureState(), workspaces: [] });
  const unavailableResponse = plain(await unavailable.api.handleStateWriteMessage({
    state: candidate,
    quickCaptureItem: { ...receiptIntent, expectedUrl: 'https://forged.test' },
  }));
  assert.equal(unavailableResponse.ok, true,
    'a rejected continuation identity must not erase an already accepted state write');
  assert.deepEqual(unavailableResponse.quickCaptureResult, {
    ok: false,
    code: 'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE',
    destinationReady: false,
  });
  assert.deepEqual(unavailable.control.calls, ['set']);

  const malformedAcceptedCandidates = [
    ['Workspace categories', next => { next.workspaces[1].categories = {}; }],
    ['Space groups', next => { next.workspaces[0].categories[1].groups = {}; }],
    ['Group items', next => { next.workspaces[0].categories[1].groups[0].items = {}; }],
    ['nested item children', next => {
      next.workspaces[0].categories[1].groups[0].items = [{
        id: 'unrelated-stack',
        type: 'stack',
        items: {},
      }];
    }],
  ];
  for (const [label, makeMalformed] of malformedAcceptedCandidates) {
    const malformedCandidate = fixtureState();
    makeMalformed(malformedCandidate);
    const malformed = createWorkerHarness({ ...fixtureState(), workspaces: [] });
    const malformedResponse = plain(await malformed.api.handleStateWriteMessage({
      state: malformedCandidate,
      quickCaptureItem: receiptIntent,
    }));
    assert.deepEqual(malformedResponse, {
      ok: true,
      revision: malformedCandidate._revision + 1,
      quickCaptureResult: {
        ok: false,
        code: 'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE',
        destinationReady: false,
      },
    }, `${label} corruption must not relabel an already accepted Save as failed`);
    const acceptedGraph = clone(malformedCandidate);
    acceptedGraph._revision += 1;
    assert.deepEqual(malformed.control.state, acceptedGraph,
      `${label} corruption must retain the exact accepted candidate and revision`);
    assert.deepEqual(malformed.control.calls, ['set'],
      `${label} corruption must write once without retry, route, notification, or tab effects`);
    assert.deepEqual(malformed.control.removedIds, [],
      `${label} corruption must leave every source tab open`);
  }

  const malformedDestination = fixtureState();
  malformedDestination.workspaces[0].categories[0].id = null;
  const malformedDestinationHarness = createWorkerHarness({ ...fixtureState(), workspaces: [] });
  const malformedDestinationResponse = plain(await malformedDestinationHarness.api.handleStateWriteMessage({
    state: malformedDestination,
    quickCaptureItem: receiptIntent,
  }));
  assert.equal(malformedDestinationResponse.ok, true,
    'a malformed destination field must not erase accepted state truth');
  assert.equal(malformedDestinationResponse.revision, malformedDestination._revision + 1);
  assert.deepEqual(malformedDestinationResponse.quickCaptureResult, {
    ok: false,
    code: 'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE',
    destinationReady: false,
  }, 'a malformed destination field must never escape as a successful receipt');
  const acceptedMalformedDestination = clone(malformedDestination);
  acceptedMalformedDestination._revision += 1;
  assert.deepEqual(malformedDestinationHarness.control.state, acceptedMalformedDestination,
    'a malformed destination field must retain the exact accepted graph and revision');
  assert.deepEqual(malformedDestinationHarness.control.calls, ['set']);
  assert.deepEqual(malformedDestinationHarness.control.removedIds, []);

  const largeCandidate = fixtureState();
  const targetItem = clone(largeCandidate.workspaces[0].categories[0].groups[0].items[0]);
  const largeChildren = Array.from({ length: 200000 }, (_, index) => ({
    id: `large-child-${index}`,
    type: 'note',
    html: '',
  }));
  largeChildren[0] = targetItem;
  largeCandidate.workspaces[0].categories[0].groups[0].items = [{
    id: 'large-stack',
    type: 'stack',
    items: largeChildren,
  }];
  const large = createWorkerHarness({ ...fixtureState(), workspaces: [] });
  const largeResponse = plain(await large.api.handleStateWriteMessage({
    state: largeCandidate,
    quickCaptureItem: receiptIntent,
  }));
  assert.deepEqual(largeResponse, {
    ok: true,
    revision: largeCandidate._revision + 1,
    quickCaptureResult: {
      ok: true,
      destinationReady: true,
      destination: quickCaptureDestination(),
    },
  }, 'a valid 200,000-entry Stack must retain the exact accepted destination receipt');
  assert.deepEqual(large.control.calls, ['set'],
    'large valid traversal must still perform one accepted write and no browser effect');
  assert.deepEqual(large.control.removedIds, []);

  const rejected = createWorkerHarness({ ...fixtureState(), workspaces: [] });
  rejected.control.setFailure = Object.assign(new Error('conflict'), {
    code: 'LOCUS_STATE_CONFLICT',
  });
  await assert.rejects(rejected.api.handleStateWriteMessage({
    state: candidate,
    quickCaptureItem: receiptIntent,
  }), /conflict/);
  assert.deepEqual(rejected.control.calls, ['set'],
    'a rejected state write must expose neither a destination receipt nor a tab action');
  assert.deepEqual(rejected.control.removedIds, []);

  const stateHandlerSource = sourceSlice(
    backgroundSource,
    'async function handleStateWriteMessage(',
    '\nchrome.runtime.onMessage.addListener',
    'State-write message handler',
  );
  assert.match(stateHandlerSource,
    /const revision = await setState\(message\.state\)[\s\S]{0,260}response\.quickCaptureResult = quickCaptureItemReceipt\(message\.state, message\.quickCaptureItem\)/,
    'the accepted revision must be obtained before the quick-capture receipt is produced');
  assert.doesNotMatch(stateHandlerSource, /performPopupQuickCaptureAction|chrome\.tabs\.(?:remove|create|update)/,
    'the state-write handler must never perform the later quick-capture browser action');
  assert.match(backgroundSource,
    /message\?\.type === 'locus-complete-quick-capture'[\s\S]{0,420}enqueueStateWrite\(\(\) => performPopupQuickCaptureAction\(message\)\)[\s\S]{0,320}sendResponse/,
    'quick-capture Open and Close must stay worker-owned under the central state lock');
  const quickCompletionListener = sourceSlice(
    backgroundSource,
    "if (message?.type === 'locus-complete-quick-capture') {",
    "\n  if (message?.type === 'locus-open-window-save-destination')",
    'Quick-capture completion listener',
  );
  assert.match(quickCompletionListener,
    /catch\(error => \{[\s\S]{0,180}sendResponse\(unknownPopupQuickCaptureActionResult\(message\)\)/,
    'an unexpected queued action failure must return the typed non-authoritative unknown receipt');
  assert.doesNotMatch(quickCompletionListener,
    /failedPopupQuickCaptureActionResult|destinationReady\s*:\s*false/,
    'the listener must not manufacture an authoritative unavailable destination after an unexpected failure');
}

async function testWindowSaveStateEffectBoundary() {
  const candidate = fixtureState();
  candidate.workspaces[0].categories[0].groups[0].items.push({
    id: 'saved-ten',
    type: 'tab',
    url: 'https://ten.test',
  });
  const intent = {
    workspaceId: candidate.workspaces[0].id,
    groupId: 'group-a',
    sourceWindowId: 321,
    keepTabId: 99,
    sourceTabs: [{ tabId: 10, expectedUrl: 'https://ten.test' }],
    closeSources: true,
  };

  const accepted = createWorkerHarness({ ...fixtureState(), workspaces: [] });
  accepted.control.tabsById.set(10, { id: 10, windowId: 321, url: 'https://ten.test' });
  const response = plain(await accepted.api.handleStateWriteMessage({
    state: candidate,
    windowSaveEffect: intent,
  }));
  assert.deepEqual(response, { ok: true, revision: candidate._revision + 1 });
  assert.deepEqual(accepted.control.calls, ['set'],
    'the state-write handler must never run a whole-window browser effect before its receipt is delivered');
  assert.deepEqual(accepted.control.removedIds, []);

  const effectResult = plain(await accepted.api.performPopupWindowSaveEffect(intent));
  assert.equal(effectResult.closedCount, 1);
  assert.deepEqual(accepted.control.calls, ['set', 'get', 'tab-get', 'remove'],
    'the separate confirmed-state completion phase may close sources only after state acceptance');

  const rejected = createWorkerHarness({ ...fixtureState(), workspaces: [] });
  rejected.control.setFailure = Object.assign(new Error('conflict'), { code: 'LOCUS_STATE_CONFLICT' });
  await assert.rejects(rejected.api.handleStateWriteMessage({
    state: candidate,
    windowSaveEffect: intent,
  }), /conflict/);
  assert.deepEqual(rejected.control.calls, ['set']);
  assert.deepEqual(rejected.control.removedIds, [],
    'a rejected state write must expose no path to a source-tab effect');

  const stateHandlerSource = sourceSlice(
    backgroundSource,
    'async function handleStateWriteMessage(',
    '\nchrome.runtime.onMessage.addListener',
    'State-write message handler',
  );
  assert.doesNotMatch(stateHandlerSource, /windowSaveEffect|performPopupWindowSaveEffect/,
    'whole-window effects must stay outside the accepted-state handler');
  assert.match(backgroundSource,
    /message\?\.type === 'locus-complete-window-save'[\s\S]{0,360}enqueueStateWrite\(\(\) => performPopupWindowSaveEffect\(message\)\)[\s\S]{0,260}sendResponse/,
    'the service worker must serialize fresh destination validation and destructive completion under its central state lock');
}

function popupCaptureFixture({ withInbox = true } = {}) {
  return {
    _revision: 7,
    activeWsId: 'ws-a',
    settings: {
      language: 'en',
      captureRememberLast: false,
      captureDefaultCategoryId: '',
      captureLastTarget: {
        workspaceId: 'retained-workspace-hint',
        categoryId: 'retained-space-hint',
        groupId: 'retained-group-hint',
      },
      columnSizes: { 'retained-column-size': 320 },
      canvasPositions: { 'retained-canvas-position': { x: 1, y: 2 } },
    },
    workspaces: [{
      id: 'ws-a',
      activeCatId: 'space-a',
      categories: [{
        id: 'space-a',
        name: 'Research',
        groups: withInbox
          ? [{ id: 'group-inbox', name: 'Inbox', items: [] }]
          : [{ id: 'group-other', name: 'Reference', items: [] }],
      }, {
        id: 'space-b',
        name: 'Reading',
        groups: [{ id: 'group-b', name: 'Queue', items: [] }],
      }],
    }, {
      id: 'ws-b',
      activeCatId: 'space-c',
      categories: [{
        id: 'space-c',
        name: 'Outside',
        groups: [{ id: 'group-c', name: 'Outside Group', items: [] }],
      }],
    }],
    archive: [{ id: 'retained-archive-item', type: 'tab', url: 'https://archive.test' }],
    trash: [{ id: 'retained-trash-entry', kind: 'group', value: { id: 'retained-trash-group' } }],
  };
}

function createPopupTargetHarness(initialState) {
  const context = vm.createContext({
    __state: clone(initialState),
    structuredClone,
  });
  vm.runInContext(
    `let state = structuredClone(globalThis.__state);\n` +
    `let destinationOverrideGroupId = null;\n` +
    `const uid = () => 'fallback-id';\n` +
    `${popupCaptureTargetSource}\n` +
    `const summarize = target => target == null ? null : ({\n` +
    `  workspaceId: target.ws?.id ?? null,\n` +
    `  categoryId: target.cat?.id ?? null,\n` +
    `  groupId: target.group?.id ?? null,\n` +
    `  groupName: target.group?.name ?? null,\n` +
    `  proposedInbox: target.proposedInbox === true,\n` +
    `  source: target.source ?? null,\n` +
    `});\n` +
    `globalThis.__popupTargetApi = {\n` +
    `  preview: options => summarize(previewPopupCaptureTarget(state, options)),\n` +
    `  descriptor: options => popupCaptureTargetDescriptor(previewPopupCaptureTarget(state, options)),\n` +
    `  materialize: (descriptor, values) => {\n` +
    `    const candidates = [...values];\n` +
    `    const allocateId = createPopupCaptureIdAllocator(state, () => candidates.shift());\n` +
    `    return summarize(materializePopupCaptureTarget(state, structuredClone(descriptor), allocateId));\n` +
    `  },\n` +
    `  resolveSpace: descriptor => summarize(resolvePopupCaptureSpaceTarget(state, structuredClone(descriptor))),\n` +
    `  allocate: (values, count) => {\n` +
    `    const candidates = [...values];\n` +
    `    const allocateId = createPopupCaptureIdAllocator(state, () => candidates.shift());\n` +
    `    return Array.from({ length: count }, () => allocateId());\n` +
    `  },\n` +
    `  find: options => summarize(findCaptureTarget(options)),\n` +
    `  setOverride: value => { destinationOverrideGroupId = value; },\n` +
    `  replaceState: value => { state = structuredClone(value); },\n` +
    `  addGroup: (workspaceId, categoryId, group) => {\n` +
    `    const ws = state.workspaces.find(candidate => candidate.id === workspaceId);\n` +
    `    const cat = ws?.categories?.find(candidate => candidate.id === categoryId);\n` +
    `    cat.groups = cat.groups || [];\n` +
    `    cat.groups.push(structuredClone(group));\n` +
    `  },\n` +
    `  moveGroup: (groupId, workspaceId, categoryId) => {\n` +
    `    let moved = null;\n` +
    `    for (const ws of state.workspaces) for (const cat of (ws.categories || [])) {\n` +
    `      const index = (cat.groups || []).findIndex(group => group.id === groupId);\n` +
    `      if (index >= 0) moved = cat.groups.splice(index, 1)[0];\n` +
    `    }\n` +
    `    const ws = state.workspaces.find(candidate => candidate.id === workspaceId);\n` +
    `    const cat = ws.categories.find(candidate => candidate.id === categoryId);\n` +
    `    cat.groups.push(moved);\n` +
    `  },\n` +
    `  read: () => structuredClone(state),\n` +
    `};`,
    context,
    { filename: 'popup-capture-targets.js' },
  );
  return context.__popupTargetApi;
}

function testPopupCaptureTargetAndAllocatorContracts() {
  const noInboxState = popupCaptureFixture({ withInbox: false });
  const noInbox = createPopupTargetHarness(noInboxState);
  const before = JSON.stringify(noInbox.read());
  const preview = plain(noInbox.preview());
  assert.deepEqual(preview, {
    workspaceId: 'ws-a',
    categoryId: 'space-a',
    groupId: null,
    groupName: 'Inbox',
    proposedInbox: true,
    source: 'active',
  });
  assert.equal(JSON.stringify(noInbox.read()), before,
    'previewing an Inbox destination must not mutate the graph or allocate an identity');

  const descriptor = plain(noInbox.descriptor());
  assert.deepEqual(descriptor, {
    workspaceId: 'ws-a',
    categoryId: 'space-a',
    groupId: null,
    proposedInbox: true,
  });
  const materialized = plain(noInbox.materialize(descriptor, [
    'ws-a',
    'space-a',
    'group-other',
    'retained-archive-item',
    'retained-trash-entry',
    'retained-trash-group',
    'retained-workspace-hint',
    'retained-space-hint',
    'retained-group-hint',
    'retained-column-size',
    'retained-canvas-position',
    'fresh-inbox',
  ]));
  assert.deepEqual(materialized, {
    workspaceId: 'ws-a',
    categoryId: 'space-a',
    groupId: 'fresh-inbox',
    groupName: 'Inbox',
    proposedInbox: true,
    source: null,
  }, 'materialization must skip every active, retained, sizing, and Canvas identity');
  assert.equal(noInbox.read().workspaces[0].categories[0].groups.filter(group => group.name === 'Inbox').length, 1,
    'a real mutation may materialize exactly one Inbox');

  const allocator = createPopupTargetHarness(popupCaptureFixture());
  assert.deepEqual(plain(allocator.allocate([
    'group-inbox',
    'retained-archive-item',
    'retained-trash-group',
    'retained-column-size',
    'retained-canvas-position',
    'fresh-a',
    'fresh-a',
    'fresh-b',
  ], 2)), ['fresh-a', 'fresh-b'],
  'one allocator must reject retained collisions and reserve every identity it returns');

  const existing = createPopupTargetHarness(popupCaptureFixture());
  const existingBefore = JSON.stringify(existing.read());
  const existingPreview = plain(existing.preview());
  assert.equal(existingPreview.groupId, 'group-inbox');
  assert.equal(existingPreview.proposedInbox, false);
  const existingResolved = plain(existing.materialize(plain(existing.descriptor()), ['unused-id']));
  assert.equal(existingResolved.groupId, 'group-inbox',
    'exactly one existing Inbox must be reused without allocating another Group');
  assert.equal(JSON.stringify(existing.read()), existingBefore,
    'reusing an existing Inbox must not mutate target resolution');

  const changedProposed = createPopupTargetHarness(popupCaptureFixture({ withInbox: false }));
  const changedDescriptor = plain(changedProposed.descriptor());
  changedProposed.addGroup('ws-a', 'space-a', { id: 'appeared-inbox', name: 'Inbox', items: [] });
  assert.throws(
    () => changedProposed.materialize(changedDescriptor, ['should-not-allocate']),
    error => error?.code === 'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
    'a proposed Inbox must fail if the reviewed Space gains an Inbox before mutation',
  );

  const duplicateInboxState = popupCaptureFixture();
  duplicateInboxState.workspaces[0].categories[0].groups.push({
    id: 'group-inbox-2',
    name: 'Inbox',
    items: [],
  });
  const duplicateInbox = createPopupTargetHarness(duplicateInboxState);
  assert.throws(
    () => duplicateInbox.preview(),
    error => error?.code === 'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
    'duplicate Inbox names must fail closed',
  );

  const rememberedState = popupCaptureFixture();
  rememberedState.settings.captureRememberLast = true;
  rememberedState.settings.captureLastTarget = {
    workspaceId: 'ws-a',
    categoryId: 'space-b',
    groupId: 'group-b',
  };
  const remembered = createPopupTargetHarness(rememberedState);
  assert.deepEqual(plain(remembered.preview()), {
    workspaceId: 'ws-a',
    categoryId: 'space-b',
    groupId: 'group-b',
    groupName: 'Queue',
    proposedInbox: false,
    source: 'remembered',
  }, 'a complete remembered tuple must resolve in one exact hierarchy');

  for (const mutate of [
    candidate => { candidate.settings.captureLastTarget.groupId = 'missing'; },
    candidate => { delete candidate.settings.captureLastTarget.categoryId; },
    candidate => {
      const group = candidate.workspaces[0].categories[1].groups.pop();
      candidate.workspaces[1].categories[0].groups.push(group);
    },
    candidate => {
      candidate.workspaces[0].categories[0].groups.push({
        id: 'group-b',
        name: 'Duplicate identity',
        items: [],
      });
    },
  ]) {
    const candidate = clone(rememberedState);
    mutate(candidate);
    assert.throws(
      () => createPopupTargetHarness(candidate).preview(),
      error => error?.code === 'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
      'stale, incomplete, moved, and duplicate remembered identities must fail closed',
    );
  }

  const override = createPopupTargetHarness(popupCaptureFixture());
  override.setOverride('group-c');
  assert.equal(plain(override.find()).groupId, 'group-c',
    'an explicit popup override must resolve its one exact Group');
  override.setOverride('missing-group');
  assert.equal(override.find(), null,
    'a present but invalid explicit override must not fall through to the active target');

  const defaultState = popupCaptureFixture();
  defaultState.settings.captureDefaultCategoryId = 'space-b';
  const defaultTarget = createPopupTargetHarness(defaultState);
  assert.equal(plain(defaultTarget.preview()).categoryId, 'space-b',
    'a configured default Space must resolve at its exact owner');
  const staleDefault = clone(defaultState);
  staleDefault.settings.captureDefaultCategoryId = 'missing-space';
  assert.throws(
    () => createPopupTargetHarness(staleDefault).preview(),
    error => error?.code === 'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
    'a stale configured default must not fall through to the active Space',
  );

  const duplicateWorkspace = popupCaptureFixture();
  duplicateWorkspace.workspaces.push({ id: 'ws-a', activeCatId: 'other', categories: [] });
  assert.throws(
    () => createPopupTargetHarness(duplicateWorkspace).preview(),
    error => error?.code === 'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
    'duplicate active Workspace identity must fail closed',
  );
  const duplicateSpace = popupCaptureFixture();
  duplicateSpace.workspaces[1].categories.push({ id: 'space-a', groups: [] });
  assert.throws(
    () => createPopupTargetHarness(duplicateSpace).preview(),
    error => error?.code === 'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
    'duplicate active Space identity must fail closed',
  );

  const movedAfterReview = createPopupTargetHarness(popupCaptureFixture());
  const movedDescriptor = plain(movedAfterReview.descriptor());
  movedAfterReview.moveGroup('group-inbox', 'ws-a', 'space-b');
  assert.throws(
    () => movedAfterReview.resolveSpace(movedDescriptor),
    error => error?.code === 'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
    'a reviewed Group moved to another Space must fail before a mutation',
  );
}

function popupQuickCloseResult(message, overrides = {}) {
  return {
    ok: true,
    action: 'close',
    destinationReady: true,
    destination: {
      workspaceId: message.workspaceId,
      categoryId: 'cat',
      categoryName: 'Research',
      groupId: 'group',
      groupName: 'Inbox',
      itemId: message.itemId,
    },
    closeRequested: true,
    sourceOutcome: 'closed',
    ...overrides,
  };
}

function createPopupSaveHarness(persist, {
  effect = async message => message.type === 'locus-complete-quick-capture'
    ? popupQuickCloseResult(message)
    : {
        ok: true,
        routeCreated: true,
        sourceClosed: message.closeSource === true ? true : null,
        sourceCloseFailed: false,
      },
  initialState = null,
  sourceTab = null,
  liveTab = null,
  uidValues = [],
} = {}) {
  const state = initialState || {
    _revision: 1,
    settings: { closeTabOnSave: true, captureDeduplicate: true, captureRememberLast: true },
    activeWsId: 'ws',
    workspaces: [{
      id: 'ws',
      activeCatId: 'cat',
      categories: [{
        id: 'cat',
        name: 'Research',
        groups: [{ id: 'group', name: 'Inbox', items: [] }],
      }],
    }],
  };
  const savedSource = sourceTab || {
    id: 33,
    windowId: 44,
    title: 'Source',
    url: 'https://source.test',
  };
  const control = {
    closes: 0,
    removes: [],
    tabGets: [],
    tabGetFailure: null,
    liveTab: clone(liveTab || savedSource),
    locateFailures: [],
    locateResults: [],
    effectMessages: [],
    events: [],
    ordinaryResults: [],
    quickResults: [],
    quickReceipts: [],
    toasts: [],
    timers: [],
    pending: false,
    uidValues: [...uidValues],
    uid: 0,
  };
  const context = vm.createContext({
    __state: clone(state),
    __sourceTab: clone(savedSource),
    __control: control,
    __persist: persist,
    __effect: effect,
    URL,
    structuredClone,
    setTimeout(_callback, delay) {
      control.timers.push(delay);
      return 0;
    },
    chrome: {
      runtime: { getURL: file => `chrome-extension://locus/${file}` },
      tabs: {
        async get(id) {
          control.tabGets.push(id);
          if (control.tabGetFailure) throw control.tabGetFailure;
          return clone(control.liveTab);
        },
        async remove(id) { control.removes.push(id); },
      },
    },
    window: { close() { control.closes += 1; } },
  });
  vm.runInContext(
    `let state = structuredClone(globalThis.__state);\n` +
    `let activeTabId = 33;\n` +
    `let destinationOverrideGroupId = null;\n` +
    `const uid = () => globalThis.__control.uidValues.length\n` +
    `  ? globalThis.__control.uidValues.shift()\n` +
    `  : 'saved-item-' + (++globalThis.__control.uid);\n` +
    `const captureFields = tab => ({ title: tab.title, fav: '' });\n` +
    `const clonePopupState = () => structuredClone(state);\n` +
    `const tr = key => key;\n` +
    `const toast = message => globalThis.__control.toasts.push(message);\n` +
    `const beginPopupCapture = () => { if (globalThis.__control.pending) return false; globalThis.__control.pending = true; return true; };\n` +
    `const finishPopupCapture = () => { globalThis.__control.pending = false; };\n` +
    `const persistPopupState = async options => { globalThis.__control.events.push('persist'); return globalThis.__persist(options); };\n` +
    `const sendPopupRuntimeMessageWithDeadline = async message => { globalThis.__control.events.push('effect'); globalThis.__control.effectMessages.push(structuredClone(message)); return globalThis.__effect(message); };\n` +
    `const recoverCaptureWriteFailure = async (_error, snapshot) => { state = structuredClone(snapshot); };\n` +
    `const showLocateFailure = (cat, group, result) => { globalThis.__control.locateFailures.push(cat.id + '/' + group.id); globalThis.__control.locateResults.push(structuredClone(result)); };\n` +
    `const showOrdinaryCaptureResult = args => globalThis.__control.ordinaryResults.push({\n` +
    `  categoryId: args.cat.id,\n` +
    `  groupId: args.group.id,\n` +
    `  item: structuredClone(args.item),\n` +
    `  intent: structuredClone(args.intent),\n` +
    `  closeResult: structuredClone(args.closeResult),\n` +
    `});\n` +
    `const showQuickCaptureResult = args => globalThis.__control.quickResults.push({\n` +
    `  categoryId: args.cat.id,\n` +
    `  groupId: args.group.id,\n` +
    `  item: structuredClone(args.item),\n` +
    `  intent: structuredClone(args.intent),\n` +
    `  result: structuredClone(args.result),\n` +
    `});\n` +
    `const showQuickSaveReceipt = args => globalThis.__control.quickReceipts.push({\n` +
    `  categoryId: args.cat.id,\n` +
    `  groupId: args.group.id,\n` +
    `  item: structuredClone(args.item),\n` +
    `  intent: structuredClone(args.intent),\n` +
    `  result: structuredClone(args.result),\n` +
    `});\n` +
    `${popupCapturableUrlPolicySource}\n` +
    `${popupCaptureTargetSource}\n` +
    `${popupQuickCaptureActionValidationSource}\n` +
    `${popupOrdinarySourceCloseSource}\n` +
    `${popupQuickCaptureReceiptValidationSource}\n` +
    `${popupCaptureBatchFilterSource}\n` +
    `${popupDoSaveSource}\n` +
    `globalThis.__popupSaveApi = {\n` +
    `  save: options => doSave(state.workspaces[0], state.workspaces[0].categories[0], state.workspaces[0].categories[0].groups[0], structuredClone(globalThis.__sourceTab), options),\n` +
    `  savePreview: options => {\n` +
    `    const target = previewPopupCaptureTarget(state);\n` +
    `    return doSave(target.ws, target.cat, target.group, structuredClone(globalThis.__sourceTab), options);\n` +
    `  },\n` +
    `  setCloseSource: value => { state.settings.closeTabOnSave = value; },\n` +
    `  setLiveTab: value => { globalThis.__control.liveTab = structuredClone(value); },\n` +
    `  setTabGetFailure: value => { globalThis.__control.tabGetFailure = value; },\n` +
    `  read: () => structuredClone(state),\n` +
    `};`,
    context,
    { filename: 'popup-save-locate-flow.js' },
  );
  return { control, api: context.__popupSaveApi };
}

function createPopupWindowSaveHarness({
  persist = async () => ({ ok: true, revision: 2 }),
  effect = async message => ({
    ok: true,
    destinationReady: true,
    destination: windowSaveDestination(message, {
      groupName: message.groupId.startsWith('window-generated-') ? 'Session' : 'Inbox',
    }),
    closeRequested: message.closeSources,
    requestedCount: message.sourceTabs.length,
    closedCount: message.closeSources ? message.sourceTabs.length : 0,
    unconfirmedCount: 0,
  }),
  tabs = null,
  destinationItems = [],
  withInbox = true,
  uidValues = [],
  deduplicate = true,
} = {}) {
  const initialState = {
    _revision: 1,
    activeWsId: 'ws /?#%台灣',
    settings: {
      closeTabOnSave: true,
      captureDeduplicate: deduplicate,
      captureRememberLast: true,
      popupSaveMode: 'group',
    },
    workspaces: [{
      id: 'ws /?#%台灣',
      activeCatId: 'space-a',
      categories: [{
        id: 'space-a',
        name: 'Research',
        groups: withInbox ? [{
          id: 'group /?#%群組',
          name: 'Inbox',
          items: clone(destinationItems),
        }] : [{
          id: 'reference-group',
          name: 'Reference',
          items: clone(destinationItems),
        }],
      }],
    }],
  };
  const sourceTabs = tabs || [
    { id: 1, windowId: 321, title: 'Active', url: 'https://active.test' },
    { id: 2, windowId: 321, title: 'Second', url: 'https://second.test' },
    { id: 3, windowId: 321, title: 'Third', url: 'https://third.test' },
    { id: 'not-an-id', windowId: 321, title: 'Invalid', url: 'https://invalid.test' },
  ];
  const control = {
    pending: false,
    uid: 0,
    uidValues: [...uidValues],
    events: [],
    effectMessages: [],
    results: [],
    receipts: [],
    toasts: [],
    recoveries: [],
  };
  const context = vm.createContext({
    __initialState: clone(initialState),
    __tabs: clone(sourceTabs),
    __control: control,
    __persist: persist,
    __effect: effect,
    URL,
    structuredClone,
    console: { error() {} },
  });
  vm.runInContext(
    `let state = structuredClone(globalThis.__initialState);\n` +
    `let all = structuredClone(globalThis.__tabs);\n` +
    `let activeWindowId = 321;\n` +
    `let activeTabId = 1;\n` +
    `let windowSaveTargetGroupId = null;\n` +
    `let destinationOverrideGroupId = null;\n` +
    `const beginPopupCapture = () => { if (globalThis.__control.pending) return false; globalThis.__control.pending = true; return true; };\n` +
    `const finishPopupCapture = () => { globalThis.__control.pending = false; };\n` +
    `const clonePopupState = () => structuredClone(state);\n` +
    `const uid = () => globalThis.__control.uidValues.length\n` +
    `  ? globalThis.__control.uidValues.shift()\n` +
    `  : 'window-generated-' + (++globalThis.__control.uid);\n` +
    `const captureFields = tab => ({ title: tab.title, fav: '' });\n` +
    `const tr = key => key === 'session' ? 'Session' : key;\n` +
    `const appLocale = () => 'en';\n` +
    `const esc = value => String(value || '');\n` +
    `const toast = message => globalThis.__control.toasts.push(message);\n` +
    `const persistPopupState = async () => { globalThis.__control.events.push('persist'); return globalThis.__persist(); };\n` +
    `const sendPopupRuntimeMessageWithDeadline = async message => { globalThis.__control.events.push('effect'); globalThis.__control.effectMessages.push(structuredClone(message)); return globalThis.__effect(message); };\n` +
    `const recoverCaptureWriteFailure = async (error, snapshot) => { globalThis.__control.recoveries.push(error?.code || error?.message || 'error'); state = structuredClone(snapshot); };\n` +
    `const showWindowSaveResult = args => globalThis.__control.results.push({\n` +
    `  targetWorkspaceId: args.target.ws.id,\n` +
    `  targetSpaceId: args.target.cat.id,\n` +
    `  receivingId: args.receiving.id,\n` +
    `  itemCount: args.itemCount,\n` +
    `  hasNote: args.hasNote,\n` +
    `  result: structuredClone(args.result),\n` +
    `});\n` +
    `const showWindowSaveReceipt = args => globalThis.__control.receipts.push({\n` +
    `  receivingId: args.receiving.id,\n` +
    `  itemCount: args.itemCount,\n` +
    `  result: structuredClone(args.result),\n` +
    `});\n` +
    `${popupCapturableUrlPolicySource}\n` +
    `${popupCaptureTargetSource}\n` +
    `${popupCaptureBatchFilterSource}\n` +
    `${popupWindowResultValidationSource}\n` +
    `${popupSaveWindowSource}\n` +
    `globalThis.__popupWindowSaveApi = {\n` +
    `  save: options => saveWindow(options),\n` +
    `  read: () => structuredClone(state),\n` +
    `};`,
    context,
    { filename: 'popup-window-save-flow.js' },
  );
  return { control, api: context.__popupWindowSaveApi };
}

async function testPopupIntentAndReceiptBoundary() {
  let release;
  let recordedOptions;
  const receipt = new Promise(resolve => { release = resolve; });
  const deferred = createPopupSaveHarness(options => { recordedOptions = clone(options); return receipt; });
  const pending = deferred.api.save({ locate: true });
  await Promise.resolve();
  assert.deepEqual(recordedOptions, { quickCaptureItem: null },
    'selected Locate must keep browser-effect identity off the state request');
  assert.deepEqual(deferred.control.effectMessages, [],
    'Locate completion must not dispatch while the state receipt is pending');
  assert.equal(deferred.control.closes, 0, 'popup must not close before its typed receipt');
  assert.deepEqual(deferred.control.removes, [], 'popup must not perform the worker-owned source close');
  release({ ok: true, revision: 2 });
  assert.equal(await pending, true);
  assert.deepEqual(deferred.control.events, ['persist', 'effect']);
  assert.deepEqual(deferred.control.effectMessages, [{
    type: 'locus-complete-popup-locate',
    workspaceId: 'ws',
    itemId: 'saved-item-1',
    sourceTabId: 33,
    sourceWindowId: 44,
    sourceWasActive: true,
    expectedUrl: 'https://source.test',
    closeSource: true,
  }], 'a known accepted state receipt must dispatch one separate exact Locate completion');
  assert.equal(deferred.control.closes, 1, 'a delivered successful Locate effect receipt may finish the popup');
  assert.deepEqual(deferred.control.removes, []);

  const rejected = createPopupSaveHarness(async () => { throw new Error('injected rejected write'); });
  assert.equal(await rejected.api.save({ locate: true }), false);
  assert.equal(rejected.api.read().workspaces[0].categories[0].groups[0].items.length, 0,
    'rejected state write must roll back the optimistic item');
  assert.deepEqual(rejected.control.effectMessages, [],
    'a rejected state write must dispatch no Locate effect');
  assert.equal(rejected.control.closes, 0);
  assert.deepEqual(rejected.control.removes, []);

  const partial = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async () => ({ ok: false, code: 'LOCUS_LOCATE_CREATE_FAILED', routeCreated: false }),
  });
  assert.equal(await partial.api.save({ locate: true }), true, 'known Locate failure remains an accepted save');
  assert.equal(partial.api.read().workspaces[0].categories[0].groups[0].items.length, 1);
  assert.deepEqual(partial.control.locateFailures, ['cat/group']);
  assert.equal(partial.control.closes, 0, 'known Locate failure must keep its popup recovery state available');

  const unavailableTarget = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async () => ({ ok: false, code: 'LOCUS_LOCATE_TARGET_UNAVAILABLE' }),
  });
  assert.equal(await unavailableTarget.api.save({ locate: true }), true,
    'authoritative target loss after persistence must remain an accepted Save');
  assert.equal(unavailableTarget.api.read().workspaces[0].categories[0].groups[0].items.length, 1);
  assert.deepEqual(unavailableTarget.control.events, ['persist', 'effect'],
    'target loss must neither retry the accepted mutation nor dispatch another effect');
  assert.equal(unavailableTarget.control.closes, 0,
    'target loss must keep the popup recovery result available');

  const sourceClosePartial = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async () => ({
      ok: false,
      code: 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED',
      routeCreated: true,
      routeTabId: 900,
      routeWindowId: 44,
      routeUrl: 'chrome-extension://locus/newtab.html#/ws/ws/home?item=saved-item-1',
      destination: {
        workspaceId: 'ws',
        categoryId: 'cat',
        categoryName: 'Research',
        groupId: 'group',
        groupName: 'Inbox',
        itemId: 'saved-item-1',
      },
      sourceClosed: false,
      sourceCloseFailed: true,
      noticeShown: false,
    }),
  });
  assert.equal(await sourceClosePartial.api.save({ locate: true }), true,
    'source-close failure must not roll back an accepted Save');
  assert.equal(sourceClosePartial.control.closes, 0,
    'a partial Locate receipt must not dismiss a surviving popup as full success');
  assert.equal(sourceClosePartial.control.locateResults[0].code,
    'LOCUS_LOCATE_SOURCE_CLOSE_FAILED');
  assert.equal(sourceClosePartial.control.locateResults[0].noticeShown, false,
    'the popup must retain the worker notification outcome instead of forging success');

  const routeLessSourceClosePartial = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async () => ({
      ok: false,
      code: 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED',
      routeCreated: false,
      sourceClosed: false,
      sourceCloseFailed: true,
    }),
  });
  assert.equal(await routeLessSourceClosePartial.api.save({ locate: true }), true,
    'a malformed effect receipt must not roll back an accepted Save');
  assert.deepEqual(routeLessSourceClosePartial.control.locateResults, [{
    ok: false,
    code: 'LOCUS_LOCATE_EFFECT_UNKNOWN',
    effectUnknown: true,
    closeRequested: true,
  }], 'a source-close partial without exact route and destination authority must become unknown');
  assert.equal(routeLessSourceClosePartial.control.closes, 0,
    'a route-less partial must keep the popup recovery result available');

  const unknown = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async () => {
      const error = new Error('injected lost effect receipt');
      error.code = 'LOCUS_LOCATE_EFFECT_UNKNOWN';
      throw error;
    },
  });
  assert.equal(await unknown.api.save({ locate: true }), true,
    'a lost effect receipt must never roll back a known accepted save');
  assert.equal(unknown.api.read().workspaces[0].categories[0].groups[0].items.length, 1);
  assert.deepEqual(unknown.control.locateResults, [{
    ok: false,
    code: 'LOCUS_LOCATE_EFFECT_UNKNOWN',
    effectUnknown: true,
    closeRequested: true,
  }], 'effect transport loss must become a non-authoritative unknown outcome');
  assert.equal(unknown.control.closes, 0);

  const forgedRoute = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async () => ({
      ok: false,
      code: 'LOCUS_LOCATE_ACTIVATE_FAILED',
      routeCreated: true,
      routeTabId: 900,
      routeWindowId: 44,
      routeUrl: 'chrome-extension://locus/newtab.html#/ws/ws/home?item=another-item',
      sourceClosed: false,
      sourceCloseFailed: true,
    }),
  });
  assert.equal(await forgedRoute.api.save({ locate: true }), true);
  assert.deepEqual(forgedRoute.control.locateResults, [{
    ok: false,
    code: 'LOCUS_LOCATE_EFFECT_UNKNOWN',
    effectUnknown: true,
    closeRequested: true,
  }], 'a retry receipt for another local item must become unknown, never authoritative recovery');

  const forgedWindow = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async () => ({
      ok: false,
      code: 'LOCUS_LOCATE_ACTIVATE_FAILED',
      routeCreated: true,
      routeTabId: 900,
      routeWindowId: 99,
      routeUrl: 'chrome-extension://locus/newtab.html#/ws/ws/home?item=saved-item-1',
      sourceClosed: false,
      sourceCloseFailed: true,
    }),
  });
  assert.equal(await forgedWindow.api.save({ locate: true }), true);
  assert.equal(forgedWindow.control.locateResults[0].effectUnknown, true,
    'a retry receipt for another window must never become authoritative recovery');

  const contradictoryFailure = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async () => ({
      ok: false,
      code: 'LOCUS_LOCATE_ACTIVATE_FAILED',
      routeCreated: true,
      routeTabId: 900,
      routeWindowId: 44,
      routeUrl: 'chrome-extension://locus/newtab.html#/ws/ws/home?item=saved-item-1',
      sourceClosed: false,
      sourceCloseFailed: false,
    }),
  });
  assert.equal(await contradictoryFailure.api.save({ locate: true }), true);
  assert.equal(contradictoryFailure.control.locateResults[0].effectUnknown, true,
    'a requested close cannot be both unclosed and failure-free');

  const omittedClose = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async () => ({
      ok: false,
      code: 'LOCUS_LOCATE_ACTIVATE_FAILED',
      routeCreated: true,
      routeTabId: 900,
      routeWindowId: 44,
      routeUrl: 'chrome-extension://locus/newtab.html#/ws/ws/home?item=saved-item-1',
    }),
  });
  assert.equal(await omittedClose.api.save({ locate: true }), true);
  assert.equal(omittedClose.control.locateResults[0].effectUnknown, true,
    'a retry receipt must not omit the requested source-close outcome');

  const contradictoryClose = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async () => ({
      ok: true,
      routeCreated: true,
      sourceClosed: true,
      sourceCloseFailed: true,
    }),
  });
  assert.equal(await contradictoryClose.api.save({ locate: true }), true);
  assert.deepEqual(contradictoryClose.control.locateResults, [{
    ok: false,
    code: 'LOCUS_LOCATE_EFFECT_UNKNOWN',
    effectUnknown: true,
    closeRequested: true,
  }], 'contradictory close fields must never be interpreted as a successful Locate');

  let ordinaryOptions;
  const ordinary = createPopupSaveHarness(async options => { ordinaryOptions = clone(options); return { ok: true, revision: 2 }; });
  assert.equal(await ordinary.api.save({ locate: false }), true);
  assert.deepEqual(ordinaryOptions, { quickCaptureItem: null }, 'ordinary Save must not gain a Locate side effect');
  assert.deepEqual(ordinary.control.events, ['persist', 'effect'],
    'ordinary source cleanup must begin only after the Save receipt');
  assert.equal(ordinary.control.effectMessages[0].type, 'locus-complete-quick-capture');
  assert.equal(ordinary.control.effectMessages[0].action, 'close');
  assert.deepEqual(ordinary.control.removes, [],
    'ordinary Save must leave destructive browser effects to the serialized worker');
}

async function testPopupSingleSaveMutationAndSourceGuard() {
  const policyContext = vm.createContext({ URL });
  vm.runInContext(
    `${popupCapturableUrlPolicySource}\nglobalThis.__isPopupCapturableUrl = isPopupCapturableUrl;`,
    policyContext,
  );
  for (const url of [
    'http://example.test',
    'https://example.test/path',
    'ftp://example.test/file',
    'file:///C:/Users/example/document.html',
  ]) {
    assert.equal(policyContext.__isPopupCapturableUrl(url), true,
      `${url} must remain eligible for popup capture`);
  }
  for (const url of [
    'data:text/html,private',
    'blob:https://example.test/private',
    'javascript:alert(1)',
    'mailto:person@example.test',
    'chrome-extension://locus/newtab.html',
    'about:blank',
    'not a URL',
    '',
    null,
  ]) {
    assert.equal(policyContext.__isPopupCapturableUrl(url), false,
      `${String(url)} must remain ineligible for popup capture`);
  }

  const unsafeState = popupCaptureFixture();
  const unsafeBefore = JSON.stringify(unsafeState);
  let unsafeWrites = 0;
  const unsafe = createPopupSaveHarness(async () => {
    unsafeWrites++;
    return { ok: true, revision: 8 };
  }, {
    initialState: unsafeState,
    sourceTab: {
      id: 33,
      windowId: 44,
      title: 'Private inline page',
      url: 'data:text/html,private',
    },
  });
  assert.equal(await unsafe.api.save({}), false);
  assert.equal(unsafeWrites, 0,
    'an unreopenable popup source must be rejected before persistence');
  assert.equal(JSON.stringify(unsafe.api.read()), unsafeBefore,
    'an unreopenable popup source must not mutate the saved graph');
  assert.deepEqual(unsafe.control.events, []);
  assert.deepEqual(unsafe.control.tabGets, []);
  assert.deepEqual(unsafe.control.removes, [],
    'an unreopenable popup source must never enter source cleanup');
  assert.deepEqual(unsafe.control.toasts, ['cannotSave']);

  const proposedState = popupCaptureFixture({ withInbox: false });
  proposedState.settings.closeTabOnSave = false;
  const proposedWrites = [];
  const proposed = createPopupSaveHarness(async options => {
    proposedWrites.push(clone(options));
    return { ok: true, revision: 8 };
  }, {
    initialState: proposedState,
    uidValues: ['group-other', 'new-inbox', 'new-item'],
  });
  assert.equal(await proposed.api.savePreview({}), true);
  assert.equal(proposedWrites.length, 1,
    'a proposed-Inbox single save must make exactly one state request');
  const proposedResult = proposed.api.read();
  const createdInbox = proposedResult.workspaces[0].categories[0].groups.find(group => group.name === 'Inbox');
  assert.equal(createdInbox.id, 'new-inbox');
  assert.deepEqual(createdInbox.items.map(item => item.id), ['new-item'],
    'Inbox and item identities must share one collision-safe allocator');
  assert.equal(proposed.control.tabGets.length, 0,
    'close-off must not inspect or remove the ordinary source');

  const rejectedState = popupCaptureFixture({ withInbox: false });
  rejectedState.settings.closeTabOnSave = false;
  const rejectedBefore = JSON.stringify(rejectedState);
  const rejected = createPopupSaveHarness(async () => {
    const error = new Error('injected conflict');
    error.code = 'LOCUS_STATE_CONFLICT';
    throw error;
  }, {
    initialState: rejectedState,
    uidValues: ['new-inbox', 'new-item'],
  });
  assert.equal(await rejected.api.savePreview({}), false);
  assert.equal(JSON.stringify(rejected.api.read()), rejectedBefore,
    'a rejected proposed-Inbox write must restore the graph including the absent Inbox');
  assert.deepEqual(rejected.control.tabGets, []);
  assert.deepEqual(rejected.control.removes, []);

  const duplicateState = {
    _revision: 1,
    activeWsId: 'ws',
    settings: {
      closeTabOnSave: false,
      captureDeduplicate: true,
      captureRememberLast: false,
    },
    workspaces: [{
      id: 'ws',
      activeCatId: 'cat',
      categories: [{
        id: 'cat',
        name: 'Research',
        groups: [{
          id: 'group',
          name: 'Inbox',
          items: [{ id: 'existing', type: 'tab', url: 'https://source.test' }],
        }],
      }],
    }],
  };
  let duplicateWrites = 0;
  const duplicate = createPopupSaveHarness(async () => {
    duplicateWrites++;
    return { ok: true, revision: 2 };
  }, { initialState: duplicateState });
  assert.equal(await duplicate.api.save({}), false);
  assert.equal(duplicateWrites, 0, 'a duplicate single save must make no state request');
  assert.equal(JSON.stringify(duplicate.api.read()), JSON.stringify(duplicateState),
    'a duplicate single save must leave the exact graph untouched');
  assert.deepEqual(duplicate.control.tabGets, []);
  assert.deepEqual(duplicate.control.removes, []);

  const nestedDuplicateState = clone(duplicateState);
  nestedDuplicateState.workspaces[0].categories[0].groups[0].items = [{
    id: 'stack',
    type: 'stack',
    items: [{ id: 'nested', type: 'tab', url: 'https://source.test' }],
  }];
  let nestedDuplicateWrites = 0;
  const nestedDuplicate = createPopupSaveHarness(async () => {
    nestedDuplicateWrites++;
    return { ok: true, revision: 2 };
  }, { initialState: nestedDuplicateState });
  assert.equal(await nestedDuplicate.api.save({}), false,
    'popup single Save must reject a URL already nested in the exact destination Stack');
  assert.equal(nestedDuplicateWrites, 0);
  assert.equal(JSON.stringify(nestedDuplicate.api.read()), JSON.stringify(nestedDuplicateState));

  const protectedSource = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async message => popupQuickCloseResult(message, {
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_SOURCE_PROTECTED',
      sourceOutcome: 'protected',
    }),
  });
  assert.equal(await protectedSource.api.save({}), true,
    'an accepted save remains accepted when the worker protects its source');
  assert.deepEqual(protectedSource.control.events, ['persist', 'effect']);
  assert.deepEqual(protectedSource.control.tabGets, []);
  assert.deepEqual(protectedSource.control.removes, [],
    'the popup must never perform local source cleanup after worker refusal');
  assert.equal(protectedSource.control.ordinaryResults[0].closeResult.reason, 'changed');
  assert.deepEqual(protectedSource.control.ordinaryResults[0].closeResult.destination, {
    workspaceId: 'ws',
    categoryId: 'cat',
    categoryName: 'Research',
    groupId: 'group',
    groupName: 'Inbox',
    itemId: protectedSource.control.ordinaryResults[0].item.id,
  }, 'a protected source must display only the worker-confirmed current destination');
  const ordinaryIntent = protectedSource.control.ordinaryResults[0].intent;
  assert.equal(ordinaryIntent.workspaceId, protectedSource.api.read().workspaces[0].id);
  assert.equal(ordinaryIntent.itemId, protectedSource.control.ordinaryResults[0].item.id);
  assert.equal(ordinaryIntent.sourceTabId, 33);
  assert.equal(ordinaryIntent.sourceWindowId, 44);
  assert.equal(ordinaryIntent.sourceWasActive, true);
  assert.equal(ordinaryIntent.expectedUrl, 'https://source.test');
  assert.equal(ordinaryIntent.closeSource, false,
    'the ordinary recovery primary must never repeat the refused source close');

  const destinationLost = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async () => ({
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE',
      action: 'close',
      destinationReady: false,
      closeRequested: true,
      sourceOutcome: 'not-attempted',
    }),
  });
  assert.equal(await destinationLost.api.save({}), true,
    'destination loss after acceptance must not relabel the Save as failed');
  assert.deepEqual(destinationLost.control.events, ['persist', 'effect'],
    'destination revalidation must occur once and only after persistence');
  assert.equal(destinationLost.control.effectMessages.length, 1,
    'an accepted mutation must never be retried after destination loss');
  assert.deepEqual(destinationLost.control.tabGets, []);
  assert.deepEqual(destinationLost.control.removes, [],
    'destination loss must leave the only live source untouched');
  assert.equal(destinationLost.control.ordinaryResults[0].closeResult.reason, 'destination-unavailable');
  assert.equal(destinationLost.control.ordinaryResults[0].closeResult.destination, undefined,
    'a missing destination must not retain the pre-write path');
  assert.deepEqual(destinationLost.control.toasts, []);
  assert.deepEqual(destinationLost.control.timers, []);

  const unknownEffect = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }), {
    effect: async () => ({
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN',
      action: 'close',
      effectUnknown: true,
      closeRequested: true,
      sourceOutcome: 'unconfirmed',
    }),
  });
  assert.equal(await unknownEffect.api.save({}), true);
  assert.equal(unknownEffect.control.ordinaryResults[0].closeResult.reason, 'unconfirmed');
  assert.equal(unknownEffect.control.ordinaryResults[0].closeResult.destination, undefined,
    'an unknown worker effect must not display an unconfirmed path');
  assert.deepEqual(unknownEffect.control.removes, [],
    'an unknown worker effect must never trigger a second local close attempt');

  const closeOff = createPopupSaveHarness(async () => ({ ok: true, revision: 2 }));
  closeOff.api.setCloseSource(false);
  assert.equal(await closeOff.api.save({}), true);
  assert.deepEqual(closeOff.control.events, ['persist']);
  assert.deepEqual(closeOff.control.effectMessages, [],
    'ordinary close-off must not dispatch a browser-effect request');
  assert.deepEqual(closeOff.control.tabGets, []);
  assert.deepEqual(closeOff.control.removes, [],
    'ordinary close-off must perform no destructive-source inspection');
  assert.deepEqual(closeOff.control.ordinaryResults, [],
    'an intentional keep-open save must retain the established quiet completion');

  assert.match(popupOrdinarySourceCloseSource,
    /action: 'close'[\s\S]*type: 'locus-complete-quick-capture'[\s\S]*isValidQuickCaptureActionResult\(result, closeIntent\)/,
    'ordinary close must delegate exact destination and source revalidation to the worker');
  assert.doesNotMatch(popupOrdinarySourceCloseSource, /chrome\.tabs\.(?:get|remove)/,
    'the popup must own no destructive ordinary-save browser effect');
  assert.match(popupOrdinaryResultSource,
    /quickCaptureDestinationUnavailable[\s\S]*quickCaptureCloseProtected[\s\S]*quickCaptureCloseUnconfirmed/,
    'the ordinary result must distinguish lost destination, protected source, and unknown close');
  assert.match(popupOrdinaryResultSource,
    /quickCaptureRecoveryIntent\s*=\s*destinationUnavailable[\s\S]*\? null[\s\S]*closeSource:\s*false[\s\S]*openLocus[\s\S]*openSavedItem[\s\S]*showSection\('save-to-section'\)[\s\S]*stg-open-locus/,
    'a lost destination must downgrade to Open Locus while other refusals retain guarded Open saved item');
  assert.match(popupOrdinaryResultSource,
    /const destination = closeResult\?\.destination[\s\S]*destination\.categoryName[\s\S]*destination\.groupName/,
    'the ordinary result must show only names from a worker-confirmed destination');
  assert.doesNotMatch(popupOrdinaryResultSource, /cat\.name|group\.name/,
    'the ordinary result must never display its stale pre-write destination');
}

function createPopupHibernateHarness({
  initialState = popupCaptureFixture(),
  persist = async () => ({ ok: true, revision: 8 }),
  uidValues = [],
} = {}) {
  const control = {
    writes: 0,
    recoveries: [],
    uidValues: [...uidValues],
    uid: 0,
  };
  const context = vm.createContext({
    __state: clone(initialState),
    __control: control,
    __persist: persist,
    URL,
    structuredClone,
  });
  vm.runInContext(
    `let state = structuredClone(globalThis.__state);\n` +
    `let destinationOverrideGroupId = null;\n` +
    `let hibernateTargetGroupId = null;\n` +
    `const uid = () => globalThis.__control.uidValues.length\n` +
    `  ? globalThis.__control.uidValues.shift()\n` +
    `  : 'hibernate-generated-' + (++globalThis.__control.uid);\n` +
    `const clonePopupState = () => structuredClone(state);\n` +
    `const captureFields = tab => ({ title: tab.title, fav: tab.favIconUrl || '' });\n` +
    `const persistPopupState = async () => { globalThis.__control.writes++; return globalThis.__persist(); };\n` +
    `const recoverCaptureWriteFailure = async (error, snapshot) => {\n` +
    `  globalThis.__control.recoveries.push(error?.code || error?.message || 'error');\n` +
    `  if (snapshot !== undefined) state = structuredClone(snapshot);\n` +
    `};\n` +
    `${popupCapturableUrlPolicySource}\n` +
    `${popupCaptureTargetSource}\n` +
    `${popupCaptureBatchFilterSource}\n` +
    `${popupHibernateSaveSource}\n` +
    `globalThis.__popupHibernateApi = {\n` +
    `  save: tabs => saveTabsBeforeHibernate(structuredClone(tabs)),\n` +
    `  setTarget: groupId => { hibernateTargetGroupId = groupId; },\n` +
    `  read: () => structuredClone(state),\n` +
    `};`,
    context,
    { filename: 'popup-hibernate-capture.js' },
  );
  return { control, api: context.__popupHibernateApi };
}

async function testPopupHibernateCaptureContracts() {
  const sourceTabs = [
    { id: 10, windowId: 20, title: 'One', url: 'https://one.test' },
    { id: 11, windowId: 20, title: 'Two', url: 'https://two.test' },
    { id: 12, windowId: 20, title: 'Private inline page', url: 'data:text/html,private' },
  ];
  const proposedState = popupCaptureFixture({ withInbox: false });
  const accepted = createPopupHibernateHarness({
    initialState: proposedState,
    uidValues: ['group-other', 'hibernate-inbox', 'hibernate-item-1', 'hibernate-item-2'],
  });
  assert.equal(await accepted.api.save(sourceTabs), 2);
  assert.equal(accepted.control.writes, 1,
    'save-before-hibernate must make one state request for all captured tabs');
  const acceptedGroups = accepted.api.read().workspaces[0].categories[0].groups;
  const inbox = acceptedGroups.find(group => group.name === 'Inbox');
  assert.equal(inbox.id, 'hibernate-inbox');
  assert.deepEqual(inbox.items.map(item => item.id), ['hibernate-item-1', 'hibernate-item-2'],
    'save-before-hibernate Inbox and items must share one collision-safe allocator');
  assert.deepEqual(inbox.items.map(item => item.url), ['https://one.test', 'https://two.test'],
    'save-before-hibernate must never persist an unreopenable source');

  const duplicateState = popupCaptureFixture();
  duplicateState.workspaces[0].categories[0].groups[0].items = sourceTabs.map((tab, index) => ({
    id: `existing-${index}`,
    type: 'tab',
    url: tab.url,
  }));
  const duplicateBefore = JSON.stringify(duplicateState);
  const duplicate = createPopupHibernateHarness({ initialState: duplicateState });
  assert.equal(await duplicate.api.save(sourceTabs), 0);
  assert.equal(duplicate.control.writes, 0,
    'an all-duplicate save-before-hibernate capture must write nothing');
  assert.equal(JSON.stringify(duplicate.api.read()), duplicateBefore);

  const nestedDuplicateState = popupCaptureFixture();
  nestedDuplicateState.workspaces[0].categories[0].groups[0].items = [{
    id: 'stack',
    type: 'stack',
    items: [{ id: 'nested', type: 'tab', url: sourceTabs[0].url }],
  }];
  const nestedDuplicate = createPopupHibernateHarness({ initialState: nestedDuplicateState });
  assert.equal(await nestedDuplicate.api.save([sourceTabs[0]]), 0,
    'popup batch Save must reject a URL already nested in the exact destination Stack');
  assert.equal(nestedDuplicate.control.writes, 0);

  const sameUrlTabs = [sourceTabs[0], { ...sourceTabs[1], url: sourceTabs[0].url }];
  const batchDeduplicated = createPopupHibernateHarness({ initialState: popupCaptureFixture() });
  assert.equal(await batchDeduplicated.api.save(sameUrlTabs), 1,
    'save-before-hibernate must skip a same-URL source already accepted in this batch');
  assert.deepEqual(
    batchDeduplicated.api.read().workspaces[0].categories[0].groups[0].items.map(item => item.url),
    [sourceTabs[0].url],
    'deduplication must compare against both stored records and earlier accepted batch sources',
  );
  const batchAllowedState = popupCaptureFixture();
  batchAllowedState.settings.captureDeduplicate = false;
  const batchAllowed = createPopupHibernateHarness({ initialState: batchAllowedState });
  assert.equal(await batchAllowed.api.save(sameUrlTabs), 2,
    'save-before-hibernate must retain same-URL sources when duplicates are allowed');

  const rejectedState = popupCaptureFixture({ withInbox: false });
  const rejectedBefore = JSON.stringify(rejectedState);
  const rejected = createPopupHibernateHarness({
    initialState: rejectedState,
    uidValues: ['hibernate-inbox', 'hibernate-item-1', 'hibernate-item-2'],
    persist: async () => {
      const error = new Error('injected unknown receipt');
      error.code = 'LOCUS_STATE_UNKNOWN_ACK';
      throw error;
    },
  });
  await assert.rejects(rejected.api.save(sourceTabs), error => error?.code === 'LOCUS_STATE_UNKNOWN_ACK');
  assert.equal(rejected.control.writes, 1);
  assert.equal(JSON.stringify(rejected.api.read()), rejectedBefore,
    'a rejected hibernate capture must restore an absent proposed Inbox and every item');

  const stale = createPopupHibernateHarness({ initialState: popupCaptureFixture() });
  stale.api.setTarget('missing-group');
  await assert.rejects(
    stale.api.save(sourceTabs),
    error => error?.code === 'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
  );
  assert.equal(stale.control.writes, 0,
    'a stale explicit hibernate target must not fall through or write');
  assert.doesNotMatch(popupHibernateSaveSource, /id:\s*uid\(\)/,
    'save-before-hibernate production code must not allocate raw identities');
}

function createPopupBookmarkHarness({
  initialState = popupCaptureFixture({ withInbox: false }),
  getTree = async () => [],
  persist = async () => ({ ok: true, revision: 8 }),
  uidValues = [],
} = {}) {
  const button = {
    disabled: false,
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, value); },
    removeAttribute(name) { this.attributes.delete(name); },
  };
  const control = {
    pending: false,
    beginAttempts: 0,
    finishes: 0,
    writes: 0,
    recoveries: [],
    toasts: [],
    uidValues: [...uidValues],
    uid: 0,
  };
  const context = vm.createContext({
    __state: clone(initialState),
    __control: control,
    __button: button,
    __getTree: getTree,
    __persist: persist,
    URL,
    structuredClone,
    console: { error() {} },
    chrome: {
      bookmarks: {
        getTree: () => getTree(),
      },
    },
  });
  vm.runInContext(
    `let state = structuredClone(globalThis.__state);\n` +
    `let destinationOverrideGroupId = null;\n` +
    `const uid = () => globalThis.__control.uidValues.length\n` +
    `  ? globalThis.__control.uidValues.shift()\n` +
    `  : 'bookmark-generated-' + (++globalThis.__control.uid);\n` +
    `const $ = id => id === 'more-import-bookmarks' ? globalThis.__button : null;\n` +
    `const tr = (key, ...args) => key + (args.length ? ':' + args.join(',') : '');\n` +
    `const toast = message => globalThis.__control.toasts.push(message);\n` +
    `const clonePopupState = () => structuredClone(state);\n` +
    `const beginPopupCapture = () => {\n` +
    `  globalThis.__control.beginAttempts++;\n` +
    `  if (globalThis.__control.pending) return false;\n` +
    `  globalThis.__control.pending = true;\n` +
    `  return true;\n` +
    `};\n` +
    `const finishPopupCapture = () => {\n` +
    `  globalThis.__control.pending = false;\n` +
    `  globalThis.__control.finishes++;\n` +
    `};\n` +
    `const persistPopupState = async () => {\n` +
    `  globalThis.__control.writes++;\n` +
    `  return globalThis.__persist();\n` +
    `};\n` +
    `const recoverCaptureWriteFailure = async (error, snapshot) => {\n` +
    `  globalThis.__control.recoveries.push(error?.code || error?.message || 'error');\n` +
    `  if (snapshot !== undefined) state = structuredClone(snapshot);\n` +
    `};\n` +
    `${popupCapturableUrlPolicySource}\n` +
    `${popupCaptureTargetSource}\n` +
    `${popupBookmarkImportSource}\n` +
    `globalThis.__popupBookmarkApi = {\n` +
    `  import: () => importBookmarksFromPopup(),\n` +
    `  read: () => structuredClone(state),\n` +
    `};`,
    context,
    { filename: 'popup-bookmark-capture.js' },
  );
  return { button, control, api: context.__popupBookmarkApi };
}

async function testPopupBookmarkCaptureContracts() {
  const tree = [{
    title: 'Bookmarks',
    children: [{
      title: 'Alpha',
      url: 'https://alpha.test',
    }, {
      title: 'Bookmarklet',
      url: 'javascript:alert(document.title)',
    }, {
      title: 'Folder',
      children: [{
        title: 'Beta',
        url: 'https://beta.test',
      }],
    }],
  }];
  const accepted = createPopupBookmarkHarness({
    getTree: async () => clone(tree),
    uidValues: [
      'group-other',
      'bookmark-item-alpha',
      'bookmark-item-beta',
      'bookmark-group-folder',
      'bookmark-group-root',
    ],
  });
  assert.equal(await accepted.api.import(), true);
  assert.equal(accepted.control.writes, 1,
    'bookmark import must persist all prepared Groups in one request');
  assert.equal(accepted.control.pending, false);
  const acceptedGroups = accepted.api.read().workspaces[0].categories[0].groups;
  assert.equal(acceptedGroups.filter(group => group.name === 'Inbox').length, 0,
    'bookmark import must create Groups directly in the reviewed Space without an Inbox side effect');
  assert.deepEqual(
    acceptedGroups.slice(1).map(group => ({
      id: group.id,
      itemIds: group.items.map(item => item.id),
    })),
    [{
      id: 'bookmark-group-folder',
      itemIds: ['bookmark-item-beta'],
    }, {
      id: 'bookmark-group-root',
      itemIds: ['bookmark-item-alpha'],
    }],
    'bookmark Groups and items must share the popup collision-safe allocator',
  );
  assert.ok(accepted.control.toasts.some(message => message.startsWith('importedBookmarks:2')));

  const emptyState = popupCaptureFixture({ withInbox: false });
  const emptyBefore = JSON.stringify(emptyState);
  const empty = createPopupBookmarkHarness({
    initialState: emptyState,
    getTree: async () => [{ title: 'Empty', children: [] }],
  });
  assert.equal(await empty.api.import(), false);
  assert.equal(empty.control.writes, 0);
  assert.equal(JSON.stringify(empty.api.read()), emptyBefore,
    'an empty bookmark import must keep the graph byte-for-byte unchanged');

  const rejectedState = popupCaptureFixture({ withInbox: false });
  const rejectedBefore = JSON.stringify(rejectedState);
  const rejected = createPopupBookmarkHarness({
    initialState: rejectedState,
    getTree: async () => clone(tree),
    uidValues: [
      'bookmark-item-alpha',
      'bookmark-item-beta',
      'bookmark-group-folder',
      'bookmark-group-root',
    ],
    persist: async () => {
      const error = new Error('injected conflict');
      error.code = 'LOCUS_STATE_CONFLICT';
      throw error;
    },
  });
  assert.equal(await rejected.api.import(), false);
  assert.equal(rejected.control.writes, 1);
  assert.equal(JSON.stringify(rejected.api.read()), rejectedBefore,
    'a rejected bookmark import must roll every prepared Group and item back');
  assert.ok(!rejected.control.toasts.some(message => message.startsWith('importedBookmarks')),
    'a rejected bookmark import must show no success result');

  let releaseTree;
  const treePending = new Promise(resolve => { releaseTree = resolve; });
  const overlapState = popupCaptureFixture({ withInbox: false });
  const overlapBefore = JSON.stringify(overlapState);
  const overlap = createPopupBookmarkHarness({
    initialState: overlapState,
    getTree: () => treePending,
  });
  const first = overlap.api.import();
  await Promise.resolve();
  assert.equal(JSON.stringify(overlap.api.read()), overlapBefore,
    'bookmark traversal may wait without mutating the live graph');
  assert.equal(await overlap.api.import(), false,
    'a second bookmark import must fail closed while the first capture is pending');
  assert.equal(overlap.control.writes, 0);
  releaseTree([]);
  assert.equal(await first, false);
  assert.equal(overlap.control.beginAttempts, 2);
  assert.equal(overlap.control.finishes, 1,
    'only the capture that acquired the pending interlock may release it');
  assert.equal(overlap.control.pending, false);
  assert.doesNotMatch(popupBookmarkImportSource, /id:\s*uid\(\)/,
    'bookmark import production code must not allocate raw identities');
}

async function testPopupQuickCaptureReceiptThenResultBoundary() {
  let release;
  let recordedOptions;
  const receipt = new Promise(resolve => { release = resolve; });
  const deferred = createPopupSaveHarness(options => {
    recordedOptions = clone(options);
    return receipt;
  });
  const pending = deferred.api.save({ quick: true });
  await Promise.resolve();
  assert.deepEqual(recordedOptions, {
    quickCaptureItem: {
      workspaceId: 'ws',
      itemId: 'saved-item-1',
      sourceTabId: 33,
      sourceWindowId: 44,
      sourceWasActive: true,
      expectedUrl: 'https://source.test',
      closeSource: true,
    },
  }, 'one-click capture must attach only exact primitive saved/source identity to the state request');
  assert.deepEqual(deferred.control.quickResults, [],
    'the saved result must not render while state acceptance is still unknown');
  assert.deepEqual(deferred.control.quickReceipts, [],
    'the saved receipt must not appear while state acceptance is still unknown');
  assert.deepEqual(deferred.control.removes, [],
    'the popup page must not close the quick-capture source while the receipt is pending');
  assert.deepEqual(deferred.control.timers, [],
    'the quick branch must not schedule a timed popup dismissal while the receipt is pending');
  assert.equal(deferred.control.closes, 0);

  release({
    ok: true,
    revision: 2,
    quickCaptureResult: {
      ok: true,
      destinationReady: true,
      destination: {
        workspaceId: 'ws',
        categoryId: 'cat',
        categoryName: 'Research',
        groupId: 'group',
        groupName: 'Inbox',
        itemId: 'saved-item-1',
      },
    },
  });
  assert.equal(await pending, true);
  // Kai, 2026-11-06: one click, then the receipt toast (Undo, Move, Locate)
  // replaces the durable card for a confirmed destination.
  assert.equal(deferred.control.quickReceipts.length, 1,
    'a valid combined receipt must show the one-click receipt toast');
  assert.deepEqual(deferred.control.quickResults, [],
    'a confirmed one-click save must not open the durable result card');
  assert.deepEqual(deferred.control.quickReceipts[0].intent, recordedOptions.quickCaptureItem);
  assert.equal(deferred.control.quickReceipts[0].result.destination.groupName, 'Inbox');
  assert.deepEqual(deferred.control.removes, []);
  assert.deepEqual(deferred.control.timers, []);
  assert.equal(deferred.control.closes, 0,
    'receipt success must keep the popup and the source open for Undo, Move or Locate');

  const closeOff = createPopupSaveHarness(async options => ({
    ok: true,
    revision: 2,
    quickCaptureResult: {
      ok: true,
      destinationReady: true,
      destination: {
        workspaceId: options.quickCaptureItem.workspaceId,
        categoryId: 'cat',
        categoryName: 'Research',
        groupId: 'group',
        groupName: 'Inbox',
        itemId: options.quickCaptureItem.itemId,
      },
    },
  }));
  closeOff.api.setCloseSource(false);
  assert.equal(await closeOff.api.save({ quick: true }), true);
  assert.equal(closeOff.control.quickReceipts[0].intent.closeSource, false);
  assert.deepEqual(closeOff.control.removes, []);
  assert.deepEqual(closeOff.control.timers, []);

  const rejected = createPopupSaveHarness(async () => {
    const error = new Error('injected rejected write');
    error.code = 'LOCUS_STATE_CONFLICT';
    throw error;
  });
  assert.equal(await rejected.api.save({ quick: true }), false);
  assert.equal(rejected.api.read().workspaces[0].categories[0].groups[0].items.length, 0,
    'a rejected quick-capture write must roll back its optimistic item');
  assert.deepEqual(rejected.control.quickResults, []);
  assert.deepEqual(rejected.control.quickReceipts, [],
    'a rejected one-click write must show no saved receipt');
  assert.deepEqual(rejected.control.removes, []);
  assert.deepEqual(rejected.control.timers, []);
  assert.equal(rejected.control.closes, 0);

  for (const malformedResult of [
    null,
    { ok: true, destinationReady: true, destination: quickCaptureDestination() },
    {
      ok: true,
      destinationReady: true,
      destination: {
        workspaceId: 'ws',
        categoryId: 'cat',
        categoryName: 'Research',
        groupId: 'group',
        groupName: 'Inbox',
        itemId: 'forged-item',
      },
    },
  ]) {
    const malformed = createPopupSaveHarness(async () => ({
      ok: true,
      revision: 2,
      quickCaptureResult: malformedResult,
    }));
    assert.equal(await malformed.api.save({ quick: true }), true,
      'a malformed continuation receipt must not roll back an already accepted save');
    assert.equal(malformed.api.read().workspaces[0].categories[0].groups[0].items.length, 1);
    assert.deepEqual(malformed.control.quickReceipts, [],
      'an unconfirmed destination must never be announced by the saved receipt toast');
    assert.deepEqual(malformed.control.quickResults[0]?.result, {
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_RECEIPT_UNKNOWN',
      destinationReady: false,
    }, 'a malformed destination receipt must become an honest unavailable continuation');
    assert.deepEqual(malformed.control.removes, []);
    assert.deepEqual(malformed.control.timers, []);
    assert.equal(malformed.control.closes, 0);
  }

  assert.match(popupSource,
    /async function quickCapture\(tab\)[\s\S]{0,180}doSave\(target\.ws, target\.cat, target\.group, tab, \{ quick: true \}\)/,
    'one-click capture must explicitly enter the receipt/result quick branch');
  const quickBranch = sourceSlice(
    popupDoSaveSource,
    'if (quick) {',
    '\n    const closeRequested =',
    'Popup quick-capture terminal branch',
  );
  assert.doesNotMatch(quickBranch, /chrome\.tabs\.(?:remove|create|update)|setTimeout|window\.close|toast\(/,
    'the quick branch must contain no page-owned source close, timer, popup dismissal, or bare toast');
  assert.match(quickBranch,
    /if \(quickResult\.destinationReady === true\) \{\s*showQuickSaveReceipt\([\s\S]*\} else \{\s*showQuickCaptureResult\(/,
    'only a confirmed destination reaches the receipt toast; an unconfirmed one keeps the durable card');
}

async function testPopupWindowSaveReceiptThenEffectBoundary() {
  let releasePersist;
  let markPersistStarted;
  const persistStarted = new Promise(resolve => { markPersistStarted = resolve; });
  const deferred = createPopupWindowSaveHarness({
    persist: async () => {
      markPersistStarted();
      await new Promise(resolve => { releasePersist = resolve; });
      return { ok: true, revision: 2 };
    },
  });
  const pending = deferred.api.save({ mode: 'links', closeTabs: true, note: '', tags: [] });
  await persistStarted;
  assert.deepEqual(deferred.control.events, ['persist']);
  assert.deepEqual(deferred.control.effectMessages, [],
    'the completion effect must not dispatch while the state receipt is pending');
  releasePersist();
  assert.equal(await pending, true);
  assert.deepEqual(deferred.control.events, ['persist', 'effect'],
    'a confirmed state receipt must precede the separate browser-effect message');
  assert.deepEqual(deferred.control.effectMessages, [{
    type: 'locus-complete-window-save',
    workspaceId: 'ws /?#%台灣',
    groupId: 'group /?#%群組',
    sourceWindowId: 321,
    keepTabId: 1,
    sourceTabs: [
      { tabId: 2, expectedUrl: 'https://second.test' },
      { tabId: 3, expectedUrl: 'https://third.test' },
    ],
    closeSources: true,
  }], 'the completion message must carry only exact primitive destination/source identity');
  assert.equal(deferred.control.results[0].receivingId, 'group /?#%群組',
    'links mode must recover through its existing receiving Group');
  assert.equal(deferred.control.results[0].result.effectUnknown, undefined,
    'a valid authoritative completion receipt must not degrade to an unknown effect');
  assert.deepEqual(deferred.control.results[0].result.destination, {
    workspaceId: 'ws /?#%台灣',
    categoryId: 'space-a',
    categoryName: 'Research',
    groupId: 'group /?#%群組',
    groupName: 'Inbox',
  });

  const duplicateDestinationItems = [
    { id: 'existing-active', type: 'tab', url: 'https://active.test' },
    { id: 'existing-second', type: 'tab', url: 'https://second.test' },
    { id: 'existing-third', type: 'tab', url: 'https://third.test' },
    { id: 'existing-invalid-id', type: 'tab', url: 'https://invalid.test' },
  ];
  const noteOnly = createPopupWindowSaveHarness({
    destinationItems: duplicateDestinationItems,
  });
  assert.equal(await noteOnly.api.save({
    mode: 'links',
    closeTabs: true,
    note: 'Follow up tomorrow',
    tags: [],
  }), true, 'a note-only duplicate window save must remain an accepted save');
  assert.deepEqual(noteOnly.control.effectMessages[0].sourceTabs, [
    { tabId: 2, expectedUrl: 'https://second.test' },
    { tabId: 3, expectedUrl: 'https://third.test' },
  ], 'deduped links must still carry every valid non-active source descriptor for the requested close');
  assert.equal(noteOnly.control.results[0].itemCount, 0);
  assert.equal(noteOnly.control.results[0].hasNote, true);
  assert.equal(noteOnly.control.results[0].result.effectUnknown, undefined);
  const noteOnlyItems = noteOnly.api.read().workspaces[0].categories[0].groups[0].items;
  assert.equal(noteOnlyItems.filter(item => item.type === 'tab').length, duplicateDestinationItems.length,
    'note-only duplicate capture must not add another copy of an existing tab');
  assert.deepEqual(
    noteOnlyItems.filter(item => item.type === 'note').map(item => item.html),
    ['Follow up tomorrow'],
    'note-only duplicate capture must persist exactly one note',
  );

  const duplicateNoNote = createPopupWindowSaveHarness({
    destinationItems: duplicateDestinationItems,
  });
  assert.equal(await duplicateNoNote.api.save({
    mode: 'links',
    closeTabs: true,
    note: '',
    tags: [],
  }), false, 'an all-duplicate links save without a note must remain an early no-op');
  assert.deepEqual(duplicateNoNote.control.events, []);
  assert.deepEqual(duplicateNoNote.control.effectMessages, [],
    'an all-duplicate no-note early return must dispatch no browser effect');
  assert.equal(
    duplicateNoNote.api.read().workspaces[0].categories[0].groups[0].items.length,
    duplicateDestinationItems.length,
  );

  const sameUrlWindowTabs = [
    { id: 1, windowId: 321, title: 'Active', url: 'https://active.test' },
    { id: 2, windowId: 321, title: 'First context', url: 'https://same.test' },
    { id: 3, windowId: 321, title: 'Second context', url: 'https://same.test' },
  ];
  const batchDeduplicated = createPopupWindowSaveHarness({ tabs: sameUrlWindowTabs });
  assert.equal(await batchDeduplicated.api.save({
    mode: 'links', closeTabs: false, note: '', tags: [],
  }), true);
  assert.deepEqual(
    batchDeduplicated.api.read().workspaces[0].categories[0].groups[0].items.map(item => item.url),
    ['https://active.test', 'https://same.test'],
    'Links mode must skip a same-URL source already accepted in its current batch',
  );
  assert.deepEqual(batchDeduplicated.control.effectMessages[0].sourceTabs, [
    { tabId: 2, expectedUrl: 'https://same.test' },
    { tabId: 3, expectedUrl: 'https://same.test' },
  ], 'deduped records must retain every valid source descriptor for confirmed cleanup');
  const batchAllowed = createPopupWindowSaveHarness({
    tabs: sameUrlWindowTabs,
    deduplicate: false,
  });
  assert.equal(await batchAllowed.api.save({
    mode: 'queue', closeTabs: false, note: '', tags: [],
  }), true);
  assert.deepEqual(
    batchAllowed.api.read().workspaces[0].categories[0].groups[0].items.map(item => item.url),
    sameUrlWindowTabs.map(tab => tab.url),
    'Queue mode must retain same-URL sources when duplicates are allowed',
  );
  const batchSession = createPopupWindowSaveHarness({ tabs: sameUrlWindowTabs });
  assert.equal(await batchSession.api.save({
    mode: 'group', closeTabs: false, note: '', tags: [],
  }), true);
  assert.deepEqual(
    batchSession.api.read().workspaces[0].categories[0].groups[1].items.map(item => item.url),
    sameUrlWindowTabs.map(tab => tab.url),
    'fresh Session mode must preserve one saved item per source tab',
  );

  const protocolFiltered = createPopupWindowSaveHarness({
    tabs: [
      { id: 1, windowId: 321, title: 'Locus', url: 'chrome-extension://locus/newtab.html' },
      { id: 2, windowId: 321, title: 'Private inline page', url: 'data:text/html,private' },
      { id: 3, windowId: 321, title: 'Eligible page', url: 'https://eligible.test' },
      { id: 4, windowId: 321, title: 'Private blob', url: 'blob:https://eligible.test/private' },
    ],
  });
  assert.equal(await protocolFiltered.api.save({
    mode: 'links', closeTabs: true, note: '', tags: [],
  }), true);
  assert.deepEqual(
    protocolFiltered.api.read().workspaces[0].categories[0].groups[0].items.map(item => item.url),
    ['https://eligible.test'],
    'window Save must persist only sources that Locus can reopen',
  );
  assert.deepEqual(protocolFiltered.control.effectMessages[0].sourceTabs, [
    { tabId: 3, expectedUrl: 'https://eligible.test' },
  ], 'window Save must never offer an excluded source for cleanup');

  const queue = createPopupWindowSaveHarness({
    effect: async message => ({
      ok: true,
      destinationReady: true,
      destination: windowSaveDestination(message),
      closeRequested: message.closeSources,
      requestedCount: message.sourceTabs.length,
      closedCount: 0,
      unconfirmedCount: 0,
    }),
  });
  assert.equal(await queue.api.save({ mode: 'queue', closeTabs: false, note: '', tags: [] }), true);
  assert.equal(queue.control.effectMessages[0].groupId, 'group /?#%群組',
    'reading-queue mode must recover through the existing destination Group that received its items');
  assert.equal(queue.control.effectMessages[0].closeSources, false);
  assert.equal(queue.control.results[0].result.closeRequested, false);
  assert.equal(queue.control.results[0].result.effectUnknown, undefined);
  const queuedItems = queue.api.read().workspaces[0].categories[0].groups[0].items;
  assert.ok(queuedItems.every(item => Number.isFinite(item.readLaterAt)),
    'queue mode must preserve its existing Read Later semantics while adding recovery');

  const grouped = createPopupWindowSaveHarness();
  assert.equal(await grouped.api.save({ mode: 'group', closeTabs: true, note: '', tags: [] }), true);
  assert.equal(grouped.control.effectMessages[0].groupId, 'window-generated-1',
    'session-group mode must recover through the newly created receiving Group');
  assert.equal(grouped.control.results[0].receivingId, 'window-generated-1');
  assert.equal(grouped.api.read().workspaces[0].categories[0].groups[1].id, 'window-generated-1');
  assert.equal(grouped.control.results[0].result.effectUnknown, undefined);
  assert.equal(grouped.control.results[0].result.destination.groupId, 'window-generated-1',
    'the accepted receipt must authoritatively identify the newly created receiving Group');

  const groupedWithoutInbox = createPopupWindowSaveHarness({ withInbox: false });
  assert.equal(await groupedWithoutInbox.api.save({
    mode: 'group',
    closeTabs: false,
    note: '',
    tags: [],
  }), true);
  const groupedWithoutInboxGroups =
    groupedWithoutInbox.api.read().workspaces[0].categories[0].groups;
  assert.equal(groupedWithoutInboxGroups.filter(group => group.name === 'Inbox').length, 0,
    'Session mode must create directly in the reviewed Space without materializing an Inbox');
  assert.equal(groupedWithoutInboxGroups.filter(group => group.name.startsWith('Session')).length, 1);

  const linksWithoutInbox = createPopupWindowSaveHarness({
    withInbox: false,
    effect: async message => ({
      ok: true,
      destinationReady: true,
      destination: windowSaveDestination(message, { groupName: 'Inbox' }),
      closeRequested: false,
      requestedCount: message.sourceTabs.length,
      closedCount: 0,
      unconfirmedCount: 0,
    }),
  });
  assert.equal(await linksWithoutInbox.api.save({
    mode: 'links',
    closeTabs: false,
    note: '',
    tags: [],
  }), true);
  const linksWithoutInboxGroups =
    linksWithoutInbox.api.read().workspaces[0].categories[0].groups;
  assert.equal(linksWithoutInboxGroups.filter(group => group.name === 'Inbox').length, 1,
    'links mode must materialize exactly one Inbox inside its accepted mutation');
  assert.equal(linksWithoutInbox.control.effectMessages[0].groupId,
    linksWithoutInboxGroups.find(group => group.name === 'Inbox').id);

  const collisionSafeSession = createPopupWindowSaveHarness({
    uidValues: [
      'group /?#%群組',
      'fresh-session',
      'fresh-session',
      'fresh-tab-1',
      'fresh-tab-2',
      'fresh-tab-3',
      'fresh-tab-4',
      'fresh-note',
    ],
    effect: async message => ({
      ok: true,
      destinationReady: true,
      destination: windowSaveDestination(message, { groupName: 'Session' }),
      closeRequested: false,
      requestedCount: message.sourceTabs.length,
      closedCount: 0,
      unconfirmedCount: 0,
    }),
  });
  assert.equal(await collisionSafeSession.api.save({
    mode: 'group',
    closeTabs: false,
    note: 'Session note',
    tags: [],
  }), true);
  const createdSession =
    collisionSafeSession.api.read().workspaces[0].categories[0].groups[1];
  assert.equal(createdSession.id, 'fresh-session');
  assert.deepEqual(
    createdSession.items.map(item => item.id),
    ['fresh-note', 'fresh-tab-1', 'fresh-tab-2', 'fresh-tab-3', 'fresh-tab-4'],
    'Session Group, tab, and note generation must share one collision-safe allocator',
  );

  for (const code of ['LOCUS_STATE_CONFLICT', 'LOCUS_STATE_UNKNOWN_ACK']) {
    const rejected = createPopupWindowSaveHarness({
      persist: async () => {
        const error = new Error(`injected ${code}`);
        error.code = code;
        throw error;
      },
    });
    assert.equal(await rejected.api.save({ mode: 'links', closeTabs: true, note: '', tags: [] }), false);
    assert.deepEqual(rejected.control.events, ['persist']);
    assert.deepEqual(rejected.control.effectMessages, [],
      `${code} state outcome must dispatch no source-tab completion effect`);
    assert.equal(rejected.api.read().workspaces[0].categories[0].groups[0].items.length, 0,
      `${code} state outcome must roll the optimistic window save back`);
  }

  const unknownEffect = createPopupWindowSaveHarness({
    effect: async () => {
      const error = new Error('completion port closed');
      error.code = 'LOCUS_WINDOW_SAVE_EFFECT_UNKNOWN';
      throw error;
    },
  });
  assert.equal(await unknownEffect.api.save({ mode: 'links', closeTabs: true, note: '', tags: [] }), true,
    'an unknown completion receipt must not roll back an already accepted window save');
  assert.deepEqual(unknownEffect.control.events, ['persist', 'effect']);
  assert.equal(unknownEffect.control.results[0].result.effectUnknown, true);
  assert.equal(unknownEffect.control.results[0].result.unconfirmedCount, 2,
    'an unknown completion receipt must not manufacture a closed-tab outcome');

  const destinationLost = createPopupWindowSaveHarness({
    effect: async message => ({
      ok: false,
      code: 'LOCUS_WINDOW_DESTINATION_UNAVAILABLE',
      destinationReady: false,
      closeRequested: message.closeSources,
      requestedCount: message.sourceTabs.length,
      closedCount: 0,
      unconfirmedCount: message.sourceTabs.length,
    }),
  });
  assert.equal(await destinationLost.api.save({
    mode: 'links', closeTabs: true, note: '', tags: [],
  }), true, 'destination loss after acceptance must not relabel the window Save as failed');
  assert.deepEqual(destinationLost.control.events, ['persist', 'effect']);
  assert.equal(destinationLost.control.effectMessages.length, 1,
    'an accepted window Save must not retry after destination loss');
  assert.equal(destinationLost.control.results[0].result.destinationReady, false);
  assert.equal(destinationLost.control.results[0].result.destination, undefined,
    'an unavailable result must carry no stale destination projection');

  const invalidEffect = createPopupWindowSaveHarness({
    effect: async message => ({
      ok: true,
      destinationReady: true,
      destination: windowSaveDestination({ ...message, groupId: 'forged-group' }),
      closeRequested: true,
      requestedCount: message.sourceTabs.length,
      closedCount: message.sourceTabs.length,
      unconfirmedCount: 0,
    }),
  });
  assert.equal(await invalidEffect.api.save({ mode: 'links', closeTabs: true, note: '', tags: [] }), true);
  assert.equal(invalidEffect.control.results[0].result.effectUnknown, true,
    'a mismatched destination receipt must fail closed without rolling back the accepted save');
  assert.equal(invalidEffect.api.read().workspaces[0].categories[0].groups[0].items.length, 4);

  assert.ok(
    popupSaveWindowSource.indexOf('await persistPopupState()')
      < popupSaveWindowSource.indexOf("type: 'locus-complete-window-save'"),
    'production source must keep the state receipt textually before effect dispatch',
  );
  assert.doesNotMatch(popupSaveWindowSource, /chrome\.tabs\.remove/,
    'whole-window source closing must no longer depend on popup-page lifetime');
}

// Kai, 2026-11-06: Save window follows Save. One click saves with the remembered
// choices and confirms a clean result with the receipt toast; a partial or
// unknown result, and every save made from the sheet, keeps the result card.
async function testPopupOneClickWindowSaveReceipt() {
  const clean = createPopupWindowSaveHarness();
  assert.equal(await clean.api.save({ quick: true }), true);
  assert.deepEqual(clean.control.events, ['persist', 'effect'],
    'one-click Save window keeps the state receipt before the worker effect');
  assert.equal(clean.control.effectMessages[0].closeSources, true,
    'one-click Save window uses the stored close-after-save choice');
  assert.equal(clean.control.receipts.length, 1,
    'a clean one-click window save is confirmed by the receipt toast');
  assert.deepEqual(clean.control.results, [],
    'a clean one-click window save does not open the result card');
  assert.equal(clean.control.receipts[0].itemCount, 4);
  assert.equal(clean.control.receipts[0].result.ok, true);

  const partial = createPopupWindowSaveHarness({
    effect: async message => ({
      ok: false,
      code: 'LOCUS_WINDOW_SAVE_CLOSE_PARTIAL',
      destinationReady: true,
      destination: windowSaveDestination(message, { groupName: 'Session' }),
      closeRequested: true,
      requestedCount: message.sourceTabs.length,
      closedCount: message.sourceTabs.length - 1,
      unconfirmedCount: 1,
    }),
  });
  assert.equal(await partial.api.save({ quick: true }), true);
  assert.deepEqual([partial.control.receipts.length, partial.control.results.length], [0, 1],
    'an unconfirmed close keeps the result card with its exact retry');

  const unknown = createPopupWindowSaveHarness({
    effect: async () => { throw new Error('worker lost'); },
  });
  assert.equal(await unknown.api.save({ quick: true }), true);
  assert.deepEqual([unknown.control.receipts.length, unknown.control.results[0].result.effectUnknown], [0, true],
    'an unknown effect never reaches the receipt toast');

  const sheet = createPopupWindowSaveHarness();
  assert.equal(await sheet.api.save({ mode: 'links', closeTabs: false, note: '', tags: [] }), true);
  assert.deepEqual([sheet.control.receipts.length, sheet.control.results.length], [0, 1],
    'a save made from the Save window sheet keeps the result card exactly as before');

  assert.match(popupSource,
    /\$\('qs-all'\)\.onclick = event => \{\s*closeFloatingLayer\(\);\s*if \(popupAsksWhereToSave\(\)\) openSaveWindow\(event\.currentTarget\);\s*else saveWindow\(\{ quick: true \}\);/,
    'Save window opens its sheet only when the profile stored Ask where to save = true');
  assert.match(popupSource,
    /function popupAsksWhereToSave\(\) \{\s*return state\?\.settings\?\.captureAskEveryTime === true;\s*\}/,
    'a missing or false Ask where to save means one click');
}

function createWriterContext(sendMessage, timeoutMs = 8, retryMs = 1) {
  const state = { _revision: 1, workspaces: [], settings: {} };
  const context = vm.createContext({
    __state: clone(state),
    chrome: { runtime: { sendMessage } },
    LOCUS_STATE_WRITE_TIMEOUT_MS: timeoutMs,
    LOCUS_STATE_RECEIVER_RETRY_MS: retryMs,
    structuredClone,
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(
    `let state = structuredClone(globalThis.__state);\n` +
    `function clonePopupState() { return structuredClone(state); }\n` +
    `${popupWriterSource}\n` +
    `globalThis.__writerApi = { persistPopupState };`,
    context,
    { filename: 'popup-locate-writer.js' },
  );
  return context.__writerApi;
}

async function testPopupReceiptDeadline() {
  let neverCalls = 0;
  const never = createWriterContext(() => {
    neverCalls += 1;
    return new Promise(() => {});
  });
  await assert.rejects(never.persistPopupState(), error => error?.code === 'LOCUS_STATE_UNKNOWN_ACK');
  assert.equal(neverCalls, 1, 'unknown accepted-or-pending message must never be retried');

  let delayedCalls = 0;
  const delayedMissing = createWriterContext(async () => {
    delayedCalls += 1;
    await new Promise(resolve => setTimeout(resolve, 20));
    throw new Error('Could not establish connection. Receiving end does not exist.');
  }, 5, 1);
  await assert.rejects(delayedMissing.persistPopupState(), error => error?.code === 'LOCUS_STATE_UNKNOWN_ACK');
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(delayedCalls, 1, 'receipt timeout must close delayed missing-receiver retries');

  const codedTransportFailure = createWriterContext(async () => {
    const error = new Error('message port closed');
    error.code = 19;
    throw error;
  });
  await assert.rejects(codedTransportFailure.persistPopupState(), error =>
    error?.code === 'LOCUS_STATE_UNKNOWN_ACK' && error?.nativeCode === 19,
  'native browser error codes must not bypass unknown-receipt recovery');

  const primitiveTransportFailure = createWriterContext(async () => { throw 'message port closed'; });
  await assert.rejects(primitiveTransportFailure.persistPopupState(), error =>
    error?.code === 'LOCUS_STATE_UNKNOWN_ACK',
  'non-object transport rejections must also become unknown receipts');
}

async function testPopupWriterExcludesWindowEffects() {
  const sent = [];
  const writer = createWriterContext(async message => {
    sent.push(clone(message));
    return { ok: true, revision: 2 };
  });
  await writer.persistPopupState({
    windowSaveEffect: {
      workspaceId: 'ws',
      groupId: 'group',
      sourceTabs: [{ tabId: 10, expectedUrl: 'https://ten.test' }],
      closeSources: true,
    },
  });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'locus-state-write');
  assert.ok(!Object.hasOwn(sent[0], 'windowSaveEffect'),
    'state-write transport must not carry a source-closing effect before its receipt is known');

  const quickSent = [];
  const quickWriter = createWriterContext(async message => {
    quickSent.push(clone(message));
    return { ok: true, revision: 2 };
  });
  const quickCaptureItem = {
    workspaceId: 'ws',
    itemId: 'item',
    sourceTabId: 10,
    sourceWindowId: 20,
    sourceWasActive: true,
    expectedUrl: 'https://source.test',
    closeSource: true,
  };
  await quickWriter.persistPopupState({ quickCaptureItem });
  assert.deepEqual(quickSent[0].quickCaptureItem, quickCaptureItem,
    'the accepted-state request must carry exact quick-capture receipt identity');
  assert.equal(quickSent[0].type, 'locus-state-write');
  assert.ok(!Object.hasOwn(quickSent[0], 'action'));
  assert.notEqual(quickSent[0].type, 'locus-complete-quick-capture',
    'the state writer must not smuggle an Open/Close effect into the receipt phase');
}

function testPopupSectionStack() {
  const context = vm.createContext({
    requestAnimationFrame(callback) { callback(); },
    document: { activeElement: null },
  });
  vm.runInContext(
    `const focusLog = [];\n` +
    `const control = (id, { connected = true, disabled = false, hidden = false } = {}) => ({\n` +
    `  id,\n` +
    `  isConnected: connected,\n` +
    `  disabled,\n` +
    `  closest: selector => hidden && selector === '.hidden' ? { className: 'hidden' } : null,\n` +
    `  focus: () => focusLog.push(id),\n` +
    `});\n` +
    `const controls = {\n` +
    `  ps: control('ps'),\n` +
    `  openWindow: control('open-window'),\n` +
    `  changeDestination: control('change-destination'),\n` +
    `  hiddenOpener: control('hidden-opener', { hidden: true }),\n` +
    `  disabledOpener: control('disabled-opener', { disabled: true }),\n` +
    `  disconnectedOpener: control('disconnected-opener', { connected: false }),\n` +
    `  windowFallback: control('window-fallback'),\n` +
    `  destinationFallback: control('destination-fallback'),\n` +
    `  moreFallback: control('more-fallback'),\n` +
    `  hibernateFallback: control('hibernate-fallback'),\n` +
    `};\n` +
    `const fallbackBySection = {\n` +
    `  'more-section': controls.moreFallback,\n` +
    `  'save-window-section': controls.windowFallback,\n` +
    `  'save-to-section': controls.destinationFallback,\n` +
    `  'hibernate-section': controls.hibernateFallback,\n` +
    `};\n` +
    `const sections = {};\n` +
    `for (const id of ['main-section', 'more-section', 'save-window-section', 'save-to-section', 'hibernate-section']) {\n` +
    `  sections[id] = { classList: { toggle() {} }, querySelectorAll: () => fallbackBySection[id] ? [fallbackBySection[id]] : [] };\n` +
    `}\n` +
    `const $ = id => sections[id] || controls[id];\n` +
    `let activeSection = 'main-section';\n` +
    `let sectionHistory = [];\n` +
    `${popupSectionStackSource}\n` +
    `globalThis.__sectionApi = {\n` +
    `  show: (id, opener) => showSection(id, controls[opener]),\n` +
    `  back: () => returnToPreviousSection(),\n` +
    `  snapshot: () => ({ activeSection, history: sectionHistory.map(entry => entry.sectionId), focusLog: [...focusLog] }),\n` +
    `};`,
    context,
    { filename: 'popup-section-stack.js' },
  );
  const api = context.__sectionApi;
  api.show('save-window-section', 'openWindow');
  api.show('save-to-section', 'changeDestination');
  assert.deepEqual(plain(api.snapshot()), {
    activeSection: 'save-to-section',
    history: ['main-section', 'save-window-section'],
    focusLog: ['window-fallback', 'destination-fallback'],
  });
  api.back();
  let snapshot = plain(api.snapshot());
  assert.equal(snapshot.activeSection, 'save-window-section');
  assert.equal(snapshot.focusLog.at(-1), 'change-destination',
    'the first Back/Escape step must close the last-opened destination and restore its opener');
  api.back();
  snapshot = plain(api.snapshot());
  assert.equal(snapshot.activeSection, 'main-section');
  assert.equal(snapshot.focusLog.at(-1), 'open-window',
    'the next Back/Escape step must return to main and restore the original opener');
  api.back();
  snapshot = plain(api.snapshot());
  assert.equal(snapshot.activeSection, 'main-section');
  assert.equal(snapshot.focusLog.at(-1), 'ps',
    'an empty popup stack must focus the stable main search control');

  api.show('save-window-section', 'openWindow');
  api.show('save-to-section', 'hiddenOpener');
  api.back();
  snapshot = plain(api.snapshot());
  assert.equal(snapshot.activeSection, 'save-window-section');
  assert.equal(snapshot.focusLog.at(-1), 'window-fallback',
    'a connected opener inside a hidden ancestor must be rejected in favor of the visible section fallback');
  api.back();

  for (const invalidOpener of ['disabledOpener', 'disconnectedOpener']) {
    api.show('more-section', invalidOpener);
    api.back();
    snapshot = plain(api.snapshot());
    assert.equal(snapshot.activeSection, 'main-section');
    assert.equal(snapshot.focusLog.at(-1), 'ps',
      `${invalidOpener} must be rejected in favor of the stable main fallback`);
  }
}

function createQuickCaptureValidatorApi() {
  const context = vm.createContext({});
  vm.runInContext(
    `${popupQuickCaptureReceiptValidationSource}\n` +
    `${popupQuickCaptureActionValidationSource}\n` +
    `globalThis.__quickValidatorApi = {\n` +
    `  isValidQuickCaptureResult,\n` +
    `  isValidQuickCaptureActionResult,\n` +
    `};`,
    context,
    { filename: 'popup-quick-capture-validators.js' },
  );
  return context.__quickValidatorApi;
}

function testQuickCaptureStrictReceiptValidators() {
  const api = createQuickCaptureValidatorApi();
  const intent = quickCaptureIntent();
  const destination = quickCaptureDestination();
  const accepted = {
    ok: true,
    destinationReady: true,
    destination,
  };
  assert.equal(api.isValidQuickCaptureResult(accepted, intent), true);
  for (const forged of [
    { ...accepted, ok: false, code: 'FORGED' },
    { ...accepted, destinationReady: false },
    { ...accepted, code: 'FORGED' },
    { ...accepted, destination: { ...destination, workspaceId: 'forged' } },
    { ...accepted, destination: { ...destination, itemId: 'forged' } },
    { ok: false, code: 'UNAVAILABLE', destinationReady: false, destination },
    { ok: false, destinationReady: false },
  ]) {
    assert.equal(api.isValidQuickCaptureResult(forged, intent), false,
      'state receipt validation must reject mismatched identity, truth flags, and result shape');
  }
  assert.equal(api.isValidQuickCaptureResult({
    ok: false,
    code: 'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE',
    destinationReady: false,
  }, intent), true, 'a typed unavailable destination is a valid fail-closed state receipt');

  const openClose = {
    action: 'open',
    destinationReady: true,
    destination,
    closeRequested: true,
    ok: true,
    routeReady: true,
    routeCreated: true,
    routeTabId: 900,
    sourceOutcome: 'closed',
  };
  assert.equal(api.isValidQuickCaptureActionResult(openClose, intent), true);
  assert.equal(api.isValidQuickCaptureActionResult({
    ...openClose,
    closeRequested: false,
    sourceOutcome: 'not-requested',
  }, { ...intent, closeSource: false }), true);
  assert.equal(api.isValidQuickCaptureActionResult({
    ...openClose,
    ok: false,
    code: 'LOCUS_QUICK_CAPTURE_SOURCE_PROTECTED',
    sourceOutcome: 'protected',
  }, intent), true,
  'a route-ready protected source must remain a typed partial result, not a forged success');
  assert.equal(api.isValidQuickCaptureActionResult({
    ...openClose,
    ok: false,
    code: 'LOCUS_QUICK_CAPTURE_ROUTE_ACTIVATE_FAILED',
    routeReady: false,
    sourceOutcome: 'not-attempted',
  }, intent), true,
  'an inactive exact route may retain its typed identity without claiming completion');
  assert.equal(api.isValidQuickCaptureActionResult({
    action: 'close',
    destinationReady: true,
    destination,
    closeRequested: true,
    ok: true,
    sourceOutcome: 'closed',
  }, { ...intent, action: 'close' }), true);
  assert.equal(api.isValidQuickCaptureActionResult({
    action: 'close',
    destinationReady: false,
    closeRequested: true,
    ok: false,
    code: 'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE',
    sourceOutcome: 'not-attempted',
  }, { ...intent, action: 'close' }), true);
  const unknownOpen = {
    ok: false,
    code: 'LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN',
    action: 'open',
    effectUnknown: true,
    closeRequested: true,
    sourceOutcome: 'unconfirmed',
  };
  assert.equal(api.isValidQuickCaptureActionResult(unknownOpen, intent), true,
    'the strict validator must recognize the one non-authoritative listener-failure receipt');
  assert.equal(api.isValidQuickCaptureActionResult({
    ...unknownOpen,
    action: 'close',
  }, { ...intent, action: 'close' }), true,
  'the non-authoritative failure shape must remain valid for explicit Close');
  for (const forgedUnknown of [
    { ...unknownOpen, ok: true },
    { ...unknownOpen, code: 'LOCUS_QUICK_CAPTURE_ACTION_FAILED' },
    { ...unknownOpen, effectUnknown: false },
    { ...unknownOpen, destinationReady: false },
    { ...unknownOpen, destination },
    { ...unknownOpen, routeReady: false },
    { ...unknownOpen, routeCreated: true, routeTabId: 900 },
    { ...unknownOpen, sourceOutcome: 'not-attempted' },
    { ...unknownOpen, closeRequested: false },
  ]) {
    assert.equal(api.isValidQuickCaptureActionResult(forgedUnknown, intent), false,
      'the unknown branch must reject authoritative destination fields, route claims, and mismatched effect semantics');
  }

  const malformedActions = [
    { ...openClose, action: 'close' },
    { ...openClose, closeRequested: false },
    { ...openClose, destination: { ...destination, itemId: 'forged' } },
    { ...openClose, sourceOutcome: 'removed-maybe' },
    { ...openClose, ok: false, code: 'FORGED' },
    { ...openClose, ok: true, code: 'FORGED' },
    { ...openClose, routeReady: false, sourceOutcome: 'closed', ok: false, code: 'FORGED' },
    {
      ...openClose,
      destinationReady: false,
      destination: undefined,
      routeReady: true,
      sourceOutcome: 'not-attempted',
      ok: false,
      code: 'FORGED',
    },
  ];
  for (const forged of malformedActions) {
    assert.equal(api.isValidQuickCaptureActionResult(forged, intent), false,
      'action receipt validation must reject inconsistent identity, route, source, and success relations');
  }
}

function createPopupQuickActionHarness({
  closeRequested = true,
  response,
  responseError = null,
} = {}) {
  const control = {
    begins: 0,
    finishes: 0,
    closes: 0,
    messages: [],
    announcements: [],
    doneActions: [],
    focus: [],
    errors: [],
  };
  const context = vm.createContext({
    __control: control,
    __intent: clone(quickCaptureIntent({
      action: undefined,
      closeSource: closeRequested,
    })),
    __response: clone(response),
    __responseError: responseError,
    structuredClone,
    console: {
      error(...args) {
        control.errors.push(args.map(value => String(value?.message || value)).join(' '));
      },
    },
  });
  vm.runInContext(
    `const controls = {\n` +
    `  'save-context': { id: 'save-context', textContent: 'Research / Inbox' },\n` +
    `  'stg-open-locus': { id: 'stg-open-locus', textContent: 'Open saved item', focus() { globalThis.__control.focus.push(this.id); } },\n` +
    `  'stg-done': { id: 'stg-done', textContent: 'Close tab', focus() { globalThis.__control.focus.push(this.id); } },\n` +
    `};\n` +
    `const $ = id => controls[id];\n` +
    `const tr = (key, value, closeSource) => value == null\n` +
    `  ? key\n` +
    `  : key + ':' + value + (key === 'quickCaptureOpenUnknown' ? ':' + String(closeSource) : '');\n` +
    `let quickCaptureRecoveryIntent = structuredClone(globalThis.__intent);\n` +
    `let quickCaptureCloseRequested = ${closeRequested ? 'true' : 'false'};\n` +
    `let quickCaptureResultMessage = '';\n` +
    `const beginPopupCapture = () => { globalThis.__control.begins++; return true; };\n` +
    `const finishPopupCapture = () => { globalThis.__control.finishes++; };\n` +
    `const sendPopupRuntimeMessageWithDeadline = async message => {\n` +
    `  globalThis.__control.messages.push(structuredClone(message));\n` +
    `  if (globalThis.__responseError) throw globalThis.__responseError;\n` +
    `  return structuredClone(globalThis.__response);\n` +
    `};\n` +
    `const setQuickCaptureDoneAction = value => {\n` +
    `  quickCaptureCloseRequested = value === true;\n` +
    `  globalThis.__control.doneActions.push(value === true);\n` +
    `};\n` +
    `const announcePopupResult = (message, focusTarget = controls['stg-open-locus']) => {\n` +
    `  globalThis.__control.announcements.push({ message, focusTarget: focusTarget?.id || null });\n` +
    `  focusTarget?.focus();\n` +
    `};\n` +
    `const window = { close() { globalThis.__control.closes++; } };\n` +
    `${popupQuickCaptureActionValidationSource}\n` +
    `${popupQuickCaptureActionSource}\n` +
    `globalThis.__quickActionApi = {\n` +
    `  run: action => runQuickCaptureAction(action),\n` +
    `  read: () => ({\n` +
    `    recovery: quickCaptureRecoveryIntent && structuredClone(quickCaptureRecoveryIntent),\n` +
    `    closeRequested: quickCaptureCloseRequested,\n` +
    `    message: quickCaptureResultMessage,\n` +
    `    openLabel: controls['stg-open-locus'].textContent,\n` +
    `    destination: controls['save-context'].textContent,\n` +
    `  }),\n` +
    `};`,
    context,
    { filename: 'popup-quick-capture-action.js' },
  );
  return { control, api: context.__quickActionApi };
}

async function testPopupQuickCaptureActionSemantics() {
  const destination = quickCaptureDestination();
  const successfulOpen = createPopupQuickActionHarness({
    response: {
      action: 'open',
      destinationReady: true,
      destination,
      closeRequested: true,
      ok: true,
      routeReady: true,
      routeCreated: true,
      routeTabId: 900,
      sourceOutcome: 'closed',
    },
  });
  await successfulOpen.api.run('open');
  assert.equal(successfulOpen.control.closes, 1);
  assert.deepEqual(successfulOpen.control.messages, [{
    type: 'locus-complete-quick-capture',
    ...quickCaptureIntent(),
    action: 'open',
  }], 'Open must send only its exact retained destination/source identity to the worker');
  assert.equal(successfulOpen.control.finishes, 1);

  for (const sourceOutcome of ['protected', 'unconfirmed']) {
    const partial = createPopupQuickActionHarness({
      response: {
        action: 'open',
        destinationReady: true,
        destination,
        closeRequested: true,
        ok: false,
        code: sourceOutcome === 'protected'
          ? 'LOCUS_QUICK_CAPTURE_SOURCE_PROTECTED'
          : 'LOCUS_QUICK_CAPTURE_SOURCE_UNCONFIRMED',
        routeReady: true,
        routeCreated: true,
        routeTabId: 900,
        sourceOutcome,
      },
    });
    await partial.api.run('open');
    assert.equal(partial.control.closes, 0,
      `route-ready Open with a ${sourceOutcome} source must not silently dismiss its exact partial outcome`);
    assert.equal(partial.control.doneActions.at(-1), false,
      `route-ready Open with a ${sourceOutcome} source must disable a repeated worker Close`);
    assert.equal(
      partial.control.announcements.at(-1).message,
      sourceOutcome === 'protected'
        ? 'quickCaptureCloseProtected'
        : 'quickCaptureCloseUnconfirmed',
    );
    assert.equal(partial.control.announcements.at(-1).focusTarget, 'stg-open-locus',
      'a partial Open result must return focus to the stable primary continuation');
  }

  const routeFailure = createPopupQuickActionHarness({
    response: {
      action: 'open',
      destinationReady: true,
      destination,
      closeRequested: true,
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_ROUTE_ACTIVATE_FAILED',
      routeReady: false,
      routeCreated: true,
      routeTabId: 900,
      sourceOutcome: 'not-attempted',
    },
  });
  await routeFailure.api.run('open');
  assert.equal(routeFailure.control.closes, 0);
  assert.equal(routeFailure.control.announcements.at(-1).message, 'quickCaptureRouteInactive');
  assert.equal(routeFailure.control.announcements.at(-1).focusTarget, 'stg-open-locus');

  const unavailable = createPopupQuickActionHarness({
    response: {
      action: 'open',
      destinationReady: false,
      closeRequested: true,
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE',
      routeReady: false,
      sourceOutcome: 'not-attempted',
    },
  });
  await unavailable.api.run('open');
  assert.equal(unavailable.control.closes, 0);
  assert.equal(unavailable.api.read().recovery, null,
    'an authoritative unavailable destination must clear the unsafe exact-item retry');
  assert.equal(unavailable.api.read().openLabel, 'openLocus');
  assert.equal(unavailable.control.doneActions.at(-1), false);
  assert.equal(unavailable.control.announcements.at(-1).focusTarget, 'stg-open-locus');

  const typedUnknown = createPopupQuickActionHarness({
    response: {
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN',
      action: 'open',
      effectUnknown: true,
      closeRequested: true,
      sourceOutcome: 'unconfirmed',
    },
  });
  await typedUnknown.api.run('open');
  const typedUnknownState = typedUnknown.api.read();
  assert.equal(typedUnknown.control.closes, 0);
  assert.equal(typedUnknown.control.errors.length, 0,
    'the listener-owned unknown receipt must be recognized rather than treated as a malformed protocol response');
  assert.equal(typedUnknownState.recovery.itemId, 'item /?#%項目');
  assert.equal(typedUnknownState.recovery.closeSource, false,
    'an unknown Open effect must retain safe retry identity while disabling a later source close');
  assert.equal(typedUnknownState.closeRequested, false);
  assert.equal(typedUnknownState.openLabel, 'Open saved item',
    'non-authoritative unknown must not downgrade the primary action to generic Locus recovery');
  assert.equal(
    typedUnknown.control.announcements.at(-1).message,
    'quickCaptureOpenUnknown:Research / Inbox:true',
  );
  assert.notEqual(typedUnknown.control.announcements.at(-1).message, 'quickCaptureDestinationUnavailable');
  assert.equal(typedUnknown.control.announcements.at(-1).focusTarget, 'stg-open-locus');

  const typedUnknownCloseOff = createPopupQuickActionHarness({
    closeRequested: false,
    response: {
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN',
      action: 'open',
      effectUnknown: true,
      closeRequested: false,
      sourceOutcome: 'unconfirmed',
    },
  });
  await typedUnknownCloseOff.api.run('open');
  assert.equal(typedUnknownCloseOff.control.closes, 0);
  assert.equal(typedUnknownCloseOff.control.errors.length, 0);
  assert.equal(typedUnknownCloseOff.api.read().recovery.closeSource, false);
  assert.equal(
    typedUnknownCloseOff.control.announcements.at(-1).message,
    'quickCaptureOpenUnknown:Research / Inbox:false',
    'close-off unknown copy must not imply that a source close was attempted',
  );
  assert.equal(typedUnknownCloseOff.control.announcements.at(-1).focusTarget, 'stg-open-locus');

  const typedCloseUnknown = createPopupQuickActionHarness({
    response: {
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN',
      action: 'close',
      effectUnknown: true,
      closeRequested: true,
      sourceOutcome: 'unconfirmed',
    },
  });
  await typedCloseUnknown.api.run('close');
  const typedCloseState = typedCloseUnknown.api.read();
  assert.equal(typedCloseUnknown.control.closes, 0);
  assert.equal(typedCloseUnknown.control.errors.length, 0);
  assert.equal(typedCloseState.recovery.itemId, 'item /?#%項目');
  assert.equal(typedCloseState.recovery.closeSource, false);
  assert.equal(typedCloseState.closeRequested, false);
  assert.equal(typedCloseState.openLabel, 'Open saved item',
    'an unknown Close must preserve the safe Open continuation');
  assert.equal(typedCloseUnknown.control.announcements.at(-1).message, 'quickCaptureCloseUnconfirmed');
  assert.notEqual(typedCloseUnknown.control.announcements.at(-1).message, 'quickCaptureDestinationUnavailable');
  assert.equal(typedCloseUnknown.control.announcements.at(-1).focusTarget, 'stg-done');

  const unknown = createPopupQuickActionHarness({
    responseError: new Error('message port closed'),
  });
  await unknown.api.run('open');
  assert.equal(unknown.control.closes, 0);
  assert.equal(unknown.api.read().recovery.itemId, 'item /?#%項目',
    'an unknown action receipt must retain exact identity for a safe retry');
  assert.equal(unknown.api.read().recovery.closeSource, false);
  assert.equal(unknown.control.errors.length, 1);
  assert.equal(
    unknown.control.announcements.at(-1).message,
    'quickCaptureOpenUnknown:Research / Inbox:true',
  );
  assert.equal(unknown.control.announcements.at(-1).focusTarget, 'stg-open-locus');

  const successfulClose = createPopupQuickActionHarness({
    response: {
      action: 'close',
      destinationReady: true,
      destination,
      closeRequested: true,
      ok: true,
      sourceOutcome: 'closed',
    },
  });
  await successfulClose.api.run('close');
  assert.equal(successfulClose.control.closes, 1);
  assert.equal(successfulClose.control.messages[0].action, 'close');

  const protectedClose = createPopupQuickActionHarness({
    response: {
      action: 'close',
      destinationReady: true,
      destination,
      closeRequested: true,
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_SOURCE_PROTECTED',
      sourceOutcome: 'protected',
    },
  });
  await protectedClose.api.run('close');
  assert.equal(protectedClose.control.closes, 0);
  assert.equal(protectedClose.control.doneActions.at(-1), false);
  assert.equal(protectedClose.control.announcements.at(-1).message, 'quickCaptureCloseProtected');
  assert.equal(protectedClose.control.announcements.at(-1).focusTarget, 'stg-done',
    'a failed explicit Close must return focus to the control that invoked it');

  const popupOnlyClose = createPopupQuickActionHarness({
    closeRequested: false,
    response: null,
  });
  await popupOnlyClose.api.run('close');
  assert.equal(popupOnlyClose.control.closes, 1);
  assert.deepEqual(popupOnlyClose.control.messages, [],
    'when source closing was not requested, Close must dismiss only the popup');
  assert.equal(popupOnlyClose.control.begins, 0);
}

function testPopupLocateUnavailableDestinationView() {
  const control = { focus: [], doneActions: [] };
  const context = vm.createContext({ __control: control });
  vm.runInContext(
    `const makeClassList = () => ({ add() {}, remove() {} });\n` +
    `const controls = {\n` +
    `  'save-title': { textContent: '' },\n` +
    `  'save-context': { textContent: '' },\n` +
    `  'stg-destination-label': { classList: makeClassList() },\n` +
    `  'stg-list': { classList: makeClassList() },\n` +
    `  'stg-locate-option': { classList: makeClassList() },\n` +
    `  'stg-back': { classList: makeClassList() },\n` +
    `  'stg-locate-result-message': { textContent: '' },\n` +
    `  'stg-open-locus': { textContent: '', focus() { globalThis.__control.focus.push('open'); } },\n` +
    `  'stg-locate-result': { classList: makeClassList() },\n` +
    `};\n` +
    `const $ = id => controls[id];\n` +
    `const tr = key => key;\n` +
    `const setQuickCaptureDoneAction = value => globalThis.__control.doneActions.push(value);\n` +
    `const requestAnimationFrame = callback => callback();\n` +
    `let locateResultVisible = false;\n` +
    `let windowSaveRecoveryIntent = { stale: true };\n` +
    `let windowSaveResultMessage = 'stale';\n` +
    `let quickCaptureRecoveryIntent = { stale: true };\n` +
    `let quickCaptureCloseRequested = true;\n` +
    `let quickCaptureResultMessage = 'stale';\n` +
    `let locateRecoveryRoute = { stale: true };\n` +
    `${popupLocateFailureViewSource}\n` +
    `globalThis.__view = {\n` +
    `  show: result => showLocateFailure({ name: 'Old Space' }, { name: 'Old Group' }, result),\n` +
    `  read: () => ({\n` +
    `    destination: controls['save-context'].textContent,\n` +
    `    message: controls['stg-locate-result-message'].textContent,\n` +
    `    primary: controls['stg-open-locus'].textContent,\n` +
    `  }),\n` +
    `};`,
    context,
    { filename: 'popup-locate-unavailable-destination-view.js' },
  );
  context.__view.show({ ok: false, code: 'LOCUS_LOCATE_TARGET_UNAVAILABLE' });
  assert.deepEqual(plain(context.__view.read()), {
    destination: '',
    message: 'quickCaptureReceiptUnavailable',
    primary: 'openLocus',
  }, 'an unavailable current target must not print its optimistic Space/Group path');
  assert.deepEqual(control.doneActions, [false]);
  assert.deepEqual(control.focus, ['open']);
}

function testPopupCaptureDeskVisualContract() {
  const i18nSource = sourceSlice(popupSource, 'const I18N = {', '\nlet all =', 'Popup locale table');
  const localeContext = vm.createContext({});
  vm.runInContext(`${i18nSource}\nglobalThis.__i18n = I18N;`, localeContext);
  const i18n = localeContext.__i18n;

  assert.equal(i18n.en.loadErrorTitle, 'Couldn’t read this window');
  assert.equal(i18n.en.loadError, 'No tabs were saved or closed.');
  assert.equal(i18n['zh-TW'].loadErrorTitle, '無法讀取目前視窗');
  assert.equal(i18n['zh-TW'].loadError, '沒有儲存或關閉任何分頁。');
  assert.match(popupHtml, /<kbd id="search-shortcut"[^>]*aria-hidden="true"/,
    'the visible search shortcut must have one runtime-owned platform label');
  assert.doesNotMatch(popupHtml, /<kbd[^>]*>⌘ K<\/kbd>/,
    'the popup must not hard-code the macOS shortcut into Windows and Linux');

  const readStateSource = sourceSlice(
    popupSource,
    'function setMainCaptureReadState(',
    '\nfunction renderLoadError',
    'Popup main read-state controller',
  );
  for (const id of ['ps', 'qs-all', 'hib-open', 'more-save-current']) {
    assert.match(readStateSource, new RegExp(`'${id}'`),
      `popup read state must own ${id}`);
  }
  assert.match(readStateSource,
    /control\.disabled = unavailable[\s\S]*control\.setAttribute\('aria-disabled', String\(unavailable\)\)/,
    'loading, failure, and zero-tab states must expose native and screen-reader unavailability');
  assert.match(popupSource,
    /setMainCaptureReadState\('loading', 0\)[\s\S]*setMainCaptureReadState\('ready', all\.length\)/,
    'the load controller must keep capture actions unavailable until a successful tab read');
  assert.match(popupSource,
    /function renderLoadError\([\s\S]*setMainCaptureReadState\('error', 0\)[\s\S]*setAttribute\('role', 'alert'\)[\s\S]*setAttribute\('aria-atomic', 'true'\)/,
    'a failed read must become one atomic alert owned by the main capture state');
  assert.match(popupSource,
    /state-card-mark[\s\S]*loadErrorTitle[\s\S]*loadError[\s\S]*retry-load/,
    'the failure card must separate state, consequence, and recovery action');
  assert.match(popupSource,
    /requestAnimationFrame\(\(\) => \$\('retry-load'\)\?\.focus\(\)\)/,
    'the rebuilt failure recovery action must receive focus');
  assert.match(popupSource,
    /const retrying = document\.activeElement\?\.id === 'retry-load'[\s\S]*if \(retrying\)[\s\S]*mainCaptureFocusTarget\(\)\?\.focus\(\)/,
    'a successful retry must return focus to the rebuilt main capture lane');
  assert.match(popupSource,
    /function renderSearchShortcutHint\([\s\S]*Mac[\s\S]*'⌘ K'[\s\S]*'Ctrl K'/,
    'the visible shortcut must reflect the current operating-system convention');
  assert.match(popupSource,
    /if \(searchShortcut\)[\s\S]*mainCaptureFocusTarget\(\)[\s\S]*target === \$\('ps'\)/,
    'the keyboard shortcut must focus Search only when it is available');

  // 2026-11 popup board: the capture docket is the bottom bar (Save window,
  // Hibernate) under the current-tab card with its own Save.
  assert.match(popupCss,
    /\.bar\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0,\s*1\.3fr\)\s+minmax\(0,\s*1fr\)/,
    'the capture docket must make Save visibly stronger than Hibernate');
  assert.match(popupHtml, /id="qs-all" class="btn btn-k"[\s\S]*id="hib-open" class="btn"/,
    'Save window is the filled button of the docket and Hibernate the plain one');
  assert.match(popupCss,
    /#load-state:not\(\.hidden\)\s*\{[^}]*flex:\s*1[^}]*min-height:\s*0/,
    'loading and failure states must deliberately occupy the remaining capture field');
  assert.match(popupCss,
    /\.state-card-copy strong\s*\{[^}]*font-size:\s*14px/,
    'the failure state must have a legible named heading');
  assert.match(popupCss,
    /\.state-card-copy span\s*\{[^}]*font-size:\s*12px/,
    'the failure consequence must remain legible at native popup width');
  const fontSizeOf = selector => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rule = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(popupCss);
    const size = rule && /font-size:\s*([\d.]+)px/.exec(rule[1]);
    return size ? Number(size[1]) : 0;
  };
  assert.ok(fontSizeOf('.pti-title') >= 13 && fontSizeOf('.pti-url') >= 10.5,
    'open-tab rows must not rely on prototype-scale title and URL text');
  assert.ok(fontSizeOf('.pti-badge') >= 10.5,
    'open-tab status badges must remain readable at native popup width');
  // The local-first proof moved from a footer into the More menu: one click
  // away, readable, and still in the popup markup.
  assert.ok(fontSizeOf('.menu-note') >= 11,
    'local-first proof must stay a readable trust note');
  assert.match(popupHtml,
    /id="more-menu"[\s\S]*class="menu-note"[\s\S]*data-pop-i18n="localFirst"[\s\S]*data-pop-i18n="privacyProof"/,
    'the More menu must carry the local-first and export-before-uninstall proof');
  assert.match(popupCss,
    /\.pv-scroll\s*\{[^}]*min-height:\s*0[^}]*overflow-y:\s*auto/,
    'the current tab, its destination and the live tab list must scroll as one column above the pinned bar');
  assert.match(popupCss,
    /@media \(max-height:\s*520px\)[\s\S]*\.hero\s*\{[^}]*padding/,
    'short popup viewports must compact the current-tab card so the live tab list stays reachable');
  assert.match(popupCss,
    /@media \(forced-colors:\s*active\)[\s\S]*\.state-card-mark/,
    'the redesigned status mark must remain visible in forced colors');
}

function testSemanticAndLocaleContracts() {
  const windowSection = popupHtml.slice(
    popupHtml.indexOf('<section id="save-window-section"'),
    popupHtml.indexOf('<section id="save-to-section"'),
  );
  const saveSection = popupHtml.slice(
    popupHtml.indexOf('<section id="save-to-section"'),
    popupHtml.indexOf('<section id="hibernate-section"'),
  );
  assert.match(windowSection, /id="sw-tag-input"[^>]*data-pop-aria="tagInputLabel"[^>]*aria-label="Add a tag"/,
    'the tag field must retain a localized screen-reader name');
  assert.match(windowSection, /id="sw-modes"[^>]*role="radiogroup"[^>]*data-pop-aria="saveOptions"[^>]*aria-label="Save options"/,
    'the save choices must expose one localized radio-group name');
  assert.equal((windowSection.match(/class="sw-mode" role="radio"/g) || []).length, 3,
    'all three window-save choices must use native keyboard radio semantics');
  assert.match(windowSection, /id="sw-note"[^>]*data-pop-aria="noteInputLabel"[^>]*aria-label="Window note"/,
    'the optional note field must retain a localized screen-reader name');
  assert.match(windowSection, /id="sw-close"[\s\S]*data-pop-i18n="closeAfterSave">Close other tabs after saving</,
    'the close option must disclose that the current tab stays open');
  assert.match(saveSection, /<label id="stg-locate-option"[\s\S]*<input type="checkbox" id="stg-locate">/,
    'Locate choice must be a native labelled checkbox inside the destination section');
  assert.ok(saveSection.indexOf('id="stg-locate-option"') < saveSection.indexOf('id="stg-list"'),
    'keyboard users must reach the Locate consequence before the destination list saves immediately');
  assert.match(saveSection, /id="stg-locate-result"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/,
    'partial success must have an in-section live result, not a toast-only action');
  assert.match(saveSection, /id="stg-open-locus"[\s\S]*id="stg-done"/,
    'partial result must expose keyboard-native recovery and completion actions');
  assert.match(saveSection,
    /id="stg-open-locus"[^>]*aria-describedby="save-context save-tab-title stg-locate-result-message"/,
    'the reused Open destination action must include destination, saved summary, and result consequence');
  assert.match(saveSection,
    /id="stg-done"[^>]*data-pop-i18n="done"[^>]*data-pop-aria="closePopup"[^>]*aria-label="Close popup"/,
    'the reused secondary action must start with an explicit localized popup-close name');
  assert.doesNotMatch(saveSection, /capture-result-copy[\s\S]*<strong/,
    'the partial result must not repeat the Saved heading inside its status card');
  assert.match(popupLocateFailureViewSource,
    /LOCUS_LOCATE_SOURCE_CLOSE_FAILED[\s\S]*result\.destination\.categoryName[\s\S]*result\.destination\.groupName[\s\S]*quickCaptureCloseUnconfirmed/,
    'a requested source-close failure must remain visible with only its authoritative destination');
  assert.match(popupCss, /\.stg-locate-option\s*\{[\s\S]*overflow-wrap|\.capture-result-copy span\s*\{[^}]*overflow-wrap:\s*anywhere/,
    'localized result copy must wrap within the popup');
  assert.match(popupCss, /button:focus-visible, input:focus-visible/,
    'new native controls must inherit the visible focus system');
  assert.match(popupSource, /popupCaptureControl\?\.setAttribute\('aria-busy', 'true'\)[\s\S]*popupCaptureControl\?\.removeAttribute\('aria-busy'\)/,
    'the invoked capture control must expose and clear an honest busy state');
  assert.match(popupCss, /\.capture-pending button\[aria-busy="true"\]::after/,
    'the invoked capture control must have visible pending feedback');
  assert.match(popupCss, /@media \(prefers-reduced-motion: reduce\)/,
    'popup continuation must remain under the global reduced-motion gate');
  assert.match(popupCss,
    /body\s*\{[\s\S]{0,120}height:\s*min\(var\(--popup-height\),\s*100dvh\)[\s\S]{0,80}min-height:\s*0/,
    'the popup must cap itself to the available viewport height');
  assert.match(popupCss,
    /#popup\s*\{[\s\S]{0,100}height:\s*min\(var\(--popup-height\),\s*100dvh\)/,
    'the popup shell must share the viewport-height cap');
  assert.match(popupCss,
    /@media \(max-height:\s*520px\)[\s\S]{0,260}\.capture-result\s*\{[^}]*min-height:\s*0/,
    'short popup viewports must remove the result card prototype minimum height');
  assert.match(popupCss, /#save-to-section\s*\{[^}]*overflow-y:\s*auto/,
    'the result continuation must remain vertically reachable in short viewports');
  assert.doesNotMatch(popupSource, /stg-locate-result'\)\.setAttribute\('role', 'alert'\)/,
    'the partial-success result must remain one polite status region');
  assert.match(popupSource,
    /chrome\.tabs\.get\(recovery\.routeTabId\)[\s\S]{0,420}popupLocateRecoveryRouteMatches\(current, recovery, \{ requireActive: false \}\)[\s\S]{0,420}chrome\.tabs\.update\(recovery\.routeTabId, \{ active: true \}\)/,
    'an activation retry must fresh-check the exact saved-item route before targeting its tab');
  assert.match(popupSource,
    /popupLocateRecoveryRouteMatches\(activated, recovery\)[\s\S]{0,260}chrome\.windows\.update\(recovery\.routeWindowId, \{ focused: true \}\)[\s\S]{0,260}chrome\.tabs\.get\(recovery\.routeTabId\)[\s\S]{0,220}popupLocateRecoveryRouteMatches\(focused, recovery\)/,
    'an exact-tab retry must revalidate activation and fresh-check after focusing its recovery window');
  assert.match(popupSource,
    /chrome\.tabs\.create\(\{ url: recovery\.routeUrl \}\)/,
    'a changed or unavailable retry tab must fall back to a fresh exact saved-item route');
  assert.match(popupSource, /switchToSavedItemFailed[\s\S]*stg-locate-result-message'\)\.textContent = ''[\s\S]*requestAnimationFrame/,
    'a failed recovery retry must produce a repeatable polite live announcement');
  assert.match(popupSource, /LOCUS_STATE_QUEUE_INVALIDATED/,
    'a cancelled queued write must require state recovery before another capture');
  assert.match(popupSource,
    /querySelectorAll\('\[data-pop-aria\]'\)[\s\S]{0,160}setAttribute\('aria-label', tr\(el\.dataset\.popAria\)\)/,
    'localized aria names must update with the visible locale');
  const saveModeSource = sourceSlice(popupSource, 'function setSaveMode(', '\nfunction currentSaveMode', 'Window save radio state');
  assert.match(saveModeSource, /button\.tabIndex = active \? 0 : -1/,
    'window-save radios must maintain one roving keyboard tab stop');
  assert.match(popupSource,
    /button\.onkeydown = event => \{[\s\S]{0,220}ArrowUp[\s\S]{0,220}ArrowDown[\s\S]{0,500}\.focus\(\)/,
    'Up/Down must move and focus the selected window-save radio');
  assert.match(popupSource,
    /if \(event\.key === 'Escape'\)[\s\S]{0,240}activeSection !== 'main-section'\) returnToPreviousSection\(\)/,
    'Escape must use the same last-opened-first-closed section stack as Back');
  assert.match(popupSource,
    /if \(popupCapturePending && \(event\.key === 'Escape'[\s\S]{0,150}stopImmediatePropagation\(\)/,
    'Escape must be consumed while a worker-owned quick-capture action is pending');
  assert.match(popupSource,
    /if \(event\.key === 'Escape'\)[\s\S]{0,100}if \(locateResultVisible\) window\.close\(\)/,
    'Escape on a terminal result must dismiss only the popup');
  assert.match(popupQuickCaptureViewSource,
    /quickCaptureRecoveryIntent = \{ \.\.\.intent \}[\s\S]{0,1400}stg-locate-result-message'\)\.textContent = quickCaptureResultMessage[\s\S]{0,400}showSection\('save-to-section'\)[\s\S]{0,180}stg-open-locus'\)\.focus\(\)/,
    'a quick save must retain exact recovery identity, render the existing result card, and focus its primary action');
  // A confirmed one-click save now gets the receipt toast; this card only shows
  // an unconfirmed destination, which must never offer Close tab.
  assert.match(popupQuickCaptureViewSource,
    /function showQuickCaptureResult\([\s\S]{0,1200}quickCaptureResultMessage = tr\('quickCaptureReceiptUnavailable'\)[\s\S]{0,900}setQuickCaptureDoneAction\(false\)/,
    'the durable card reports an unconfirmed destination and never offers Close tab');
  assert.doesNotMatch(popupQuickCaptureViewSource, /quickCaptureSourceOpen/,
    'the confirmed "tab stayed open" card left with the one-click receipt');
  assert.match(popupSource,
    /function prepareSavedItemRecovery\(\{ item, intent \}, closeSource = false\) \{[\s\S]{0,200}quickCaptureRecoveryIntent = \{ \.\.\.intent, closeSource: closeSource === true \};[\s\S]{0,80}setQuickCaptureDoneAction\(closeSource === true\)/,
    'Close tab can only follow a receipt whose source is still open and close-after-save is on');
  assert.match(popupQuickCaptureViewSource,
    /dataset\.popAria = ariaKey[\s\S]{0,180}setAttribute\('aria-label', tr\(ariaKey\)\)/,
    'the dynamic Close tab/Close popup control must update its localized screen-reader name');
  assert.doesNotMatch(popupQuickCaptureActionSource, /chrome\.tabs\.(?:remove|create|update)|setTimeout/,
    'quick-capture result actions must remain worker-owned and timer-free in the popup page');
  assert.match(popupQuickCaptureActionSource,
    /type: 'locus-complete-quick-capture'[\s\S]{0,220}isValidQuickCaptureActionResult\(result, intent\)/,
    'the popup must validate the typed worker receipt before interpreting an Open/Close result');
  assert.match(popupQuickCaptureActionValidationSource,
    /if \(result\.effectUnknown === true\)[\s\S]{0,500}LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN[\s\S]{0,500}sourceOutcome === 'unconfirmed'/,
    'the popup validator must recognize only the exact non-authoritative unknown receipt');
  assert.match(popupQuickCaptureActionSource,
    /if \(result\.effectUnknown === true\)[\s\S]{0,120}showQuickCaptureActionUnknown\(action, actionControl, result\.closeRequested\)[\s\S]{0,260}if \(result\.destinationReady\)/,
    'the popup must handle non-authoritative unknown before interpreting destination availability');
  assert.match(popupQuickCaptureActionValidationSource,
    /function showQuickCaptureActionUnknown\(action, actionControl, closeRequested\)[\s\S]{0,220}tr\('quickCaptureOpenUnknown', destination, closeRequested\)[\s\S]{0,220}disableQuickCaptureClose\(\)[\s\S]{0,100}announcePopupResult\(quickCaptureResultMessage, actionControl\)/,
    'an unknown action must keep its retry intent, disable Close, announce honest copy, and restore action focus');
  assert.match(popupQuickCaptureActionSource,
    /catch \(error\)[\s\S]{0,260}showQuickCaptureActionUnknown\(action, actionControl, intent\.closeSource === true\)/,
    'a transport-unknown Open must derive close wording from the dispatched intent');
  assert.match(popupQuickCaptureActionSource,
    /if \(result\.routeReady === true\)[\s\S]{0,80}if \(result\.ok\)[\s\S]{0,260}disableQuickCaptureClose\(\)[\s\S]{0,180}quickCaptureCloseProtected[\s\S]{0,100}quickCaptureCloseUnconfirmed/,
    'a route-ready source-close partial must stay visible and disable repeated destructive recovery');
  assert.match(backgroundSource,
    /async function popupQuickCaptureSourceOutcome\([\s\S]{0,1000}source\.windowId !== intent\.sourceWindowId[\s\S]{0,160}source\.url !== intent\.expectedUrl[\s\S]{0,160}source\.pendingUrl[\s\S]{0,180}source\.active === true[\s\S]{0,300}chrome\.tabs\.remove\(intent\.sourceTabId\)/,
    'the worker must check source window, current URL, pending URL, and active-state identity immediately before removal');
  const quickWorkerSource = sourceSlice(
    backgroundSource,
    'async function performPopupQuickCaptureAction(',
    '\nfunction resolvePopupWindowSaveGroup',
    'Quick-capture action worker',
  );
  assert.ok(
    quickWorkerSource.indexOf('performPopupOpenSavedItemDestination(intent, target)')
      < quickWorkerSource.indexOf('popupQuickCaptureSourceOutcome(intent, target, routeGuard)'),
    'Open must secure the exact recovery route before any source close is attempted',
  );
  const quickRouteConfirmSource = sourceSlice(
    backgroundSource,
    'function popupQuickCaptureRouteMatches(',
    '\nasync function performPopupOpenSavedItemDestination',
    'Quick-capture route confirmation',
  );
  assert.match(quickRouteConfirmSource,
    /pendingUrl === 'string' && tab\.pendingUrl !== routeUrl\) return false[\s\S]{0,180}chrome\.tabs\.get\(routeTabId\)/,
    'fresh route checks must reject a changed pending URL even when the current URL still matches');
  const quickOpenDestinationSource = sourceSlice(
    backgroundSource,
    'async function performPopupOpenSavedItemDestination(',
    '\nasync function popupQuickCaptureSourceOutcome',
    'Quick-capture destination opener',
  );
  assert.match(quickOpenDestinationSource,
    /activatePopupLocateTab\(routeTab\.id\)[\s\S]{0,900}confirmPopupQuickCaptureRoute\(routeTab\.id, routeUrl\)/,
    'Open must fresh-read its route after activation and window focus');
  const quickSourceOutcomeSource = sourceSlice(
    backgroundSource,
    'async function popupQuickCaptureSourceOutcome(',
    '\nasync function performPopupQuickCaptureAction',
    'Quick-capture source closer',
  );
  assert.ok(
    quickSourceOutcomeSource.indexOf('chrome.tabs.get(intent.sourceTabId)')
      < quickSourceOutcomeSource.indexOf('confirmPopupQuickCaptureRoute(')
      && quickSourceOutcomeSource.indexOf('confirmPopupQuickCaptureRoute(')
        < quickSourceOutcomeSource.indexOf('chrome.tabs.remove(intent.sourceTabId)'),
    'Open must re-read its route after source validation and immediately before removal',
  );
  assert.match(quickWorkerSource,
    /LOCUS_QUICK_CAPTURE_ROUTE_CHANGED'[\s\S]{0,100}LOCUS_QUICK_CAPTURE_ROUTE_UNCONFIRMED'[\s\S]{0,320}routeReady: false[\s\S]{0,100}sourceOutcome: 'not-attempted'/,
    'a failed final route guard must return a typed no-close result');
  const windowResultSource = sourceSlice(
    popupSource,
    'function windowSaveSourceResult(',
    '\nfunction isValidWindowSaveResult',
    'Window save result copy',
  );
  assert.ok(windowResultSource.indexOf('effectUnknown') < windowResultSource.indexOf('destinationReady'),
    'an unknown worker receipt must use honest unknown copy before any no-close destination claim');
  const showWindowResultSource = sourceSlice(
    popupSource,
    'function showWindowSaveResult(',
    '\nfunction announcePopupResult',
    'Window save result view',
  );
  assert.match(showWindowResultSource,
    /result\?\.destinationReady === true \|\| result\?\.effectUnknown === true/,
    'an unknown completion receipt must retain the exact destination recovery intent');
  assert.match(showWindowResultSource,
    /const destination = result\?\.destinationReady === true[\s\S]*result\.destination\.categoryName[\s\S]*result\.destination\.groupName[\s\S]*: '';/,
    'the window result must render a path only from a worker-confirmed destination');
  assert.doesNotMatch(showWindowResultSource, /target\.cat\.name|receiving\.name/,
    'an unavailable or unknown window destination must not display its stale pre-write path');
  const openWindowDestinationSource = sourceSlice(
    popupSource,
    'async function openWindowSaveDestination(',
    '\nasync function doSave',
    'Window save destination recovery',
  );
  const routeCreatedBranch = sourceSlice(
    openWindowDestinationSource,
    'if (result?.routeCreated && Number.isInteger(result.routeTabId)) {',
    '\n    if (result?.code ===',
    'Created destination retry branch',
  );
  assert.doesNotMatch(routeCreatedBranch, /windowSaveRecoveryIntent\s*=\s*null/,
    'an inactive exact route must retain its destination intent for another fresh retry');
  assert.doesNotMatch(openWindowDestinationSource, /locateRecoveryRoute\s*=\s*result/,
    'window recovery must not reuse the single-item direct-tab retry state');
  assert.match(popupSource,
    /if \(windowSaveRecoveryIntent\) \{[\s\S]{0,100}await openWindowSaveDestination\(\)/,
    'every window-result primary retry must fresh-dispatch the retained exact recovery intent');
  assert.match(openWindowDestinationSource,
    /LOCUS_WINDOW_DESTINATION_UNAVAILABLE[\s\S]{0,120}windowSaveRecoveryIntent = null;[\s\S]{0,80}locateRecoveryRoute = null;/,
    'only an authoritative missing destination may downgrade the window result to generic Locus recovery');
  assert.match(backgroundSource,
    /parsePopupLocateNotificationId\(notifId\)[\s\S]{0,900}chrome\.tabs\.get\(parsed\.routeTabId\)[\s\S]{0,700}popupLocateNoticeRouteMatches\(current, parsed, localNewTabUrl, \{ requireActive: false \}\)[\s\S]{0,700}activatePopupLocateTab\(parsed\.routeTabId\)[\s\S]{0,700}chrome\.tabs\.get\(parsed\.routeTabId\)[\s\S]{0,500}popupLocateNoticeRouteMatches\(focused, parsed, localNewTabUrl\)[\s\S]{0,900}openConfirmedNotificationContinuation\(fallbackUrl\)/,
    'clicking a popup Locate notice must fresh-check its retained exact route before activation and safe fallback');

  const i18nSource = sourceSlice(popupSource, 'const I18N = {', '\nlet all =', 'Popup locale table');
  const localeContext = vm.createContext({});
  vm.runInContext(`${i18nSource}\nglobalThis.__i18n = I18N;`, localeContext);
  const i18n = localeContext.__i18n;
  assert.deepEqual(Object.keys(i18n.en).sort(), Object.keys(i18n['zh-TW']).sort(),
    'English and zh-TW popup keys must remain in exact parity');
  for (const key of Object.keys(i18n.en)) {
    assert.equal(typeof i18n.en[key], typeof i18n['zh-TW'][key], `locale value type must match for ${key}`);
  }
  assert.equal(i18n.en.locateAfterSave, 'Open saved item in Locus');
  assert.equal(i18n['zh-TW'].locateAfterSave, '儲存後在 Locus 開啟項目');
  assert.equal(i18n.en.done, 'Close');
  assert.equal(i18n['zh-TW'].done, '關閉');
  assert.equal(i18n.en.switchToSavedItem, 'Switch to saved item');
  assert.equal(i18n['zh-TW'].switchToSavedItem, '切換到已儲存項目');
  assert.equal(i18n.en.saveOptions, 'Save options');
  assert.equal(i18n['zh-TW'].saveOptions, '儲存方式');
  assert.equal(i18n.en.tagInputLabel, 'Add a tag');
  assert.equal(i18n['zh-TW'].tagInputLabel, '新增標籤');
  assert.equal(i18n.en.noteInputLabel, 'Window note');
  assert.equal(i18n['zh-TW'].noteInputLabel, '視窗備註');
  assert.equal(i18n.en.closeAfterSave, 'Close other tabs after saving');
  assert.equal(i18n['zh-TW'].closeAfterSave, '儲存後關閉其他分頁');
  assert.equal(i18n.en.openSavedItem, 'Open saved item');
  assert.equal(i18n['zh-TW'].openSavedItem, '開啟已儲存項目');
  assert.equal(i18n.en.closeSavedTab, 'Close tab');
  assert.equal(i18n['zh-TW'].closeSavedTab, '關閉分頁');
  assert.equal(i18n.en.closePopup, 'Close popup');
  assert.equal(i18n['zh-TW'].closePopup, '關閉彈出式視窗');
  assert.ok(!('quickCaptureSourceOpen' in i18n.en) && !('quickCaptureSourceOpen' in i18n['zh-TW']),
    'the confirmed quick-save card copy left with the one-click receipt');
  assert.deepEqual(
    [i18n.en.undo, i18n.en.move, i18n.en.moveTo, i18n.en.undone],
    ['Undo', 'Move', 'Move to', 'Undone'],
  );
  assert.deepEqual(
    [i18n['zh-TW'].undo, i18n['zh-TW'].move, i18n['zh-TW'].moveTo, i18n['zh-TW'].undone],
    ['復原', '移動', '移到', '已復原'],
    'the receipt actions use the new tab’s zh-TW Undo and Move terms',
  );
  assert.equal(
    i18n.en.quickCaptureOpenUnknown('Research / Inbox', false),
    'Saved to Research / Inbox, but Locus could not confirm whether the item opened. The saved tab stayed open.',
  );
  assert.equal(
    i18n['zh-TW'].quickCaptureOpenUnknown('研究 / 收件匣', false),
    '已儲存到「研究 / 收件匣」，但 Locus 無法確認項目是否已開啟。剛儲存的分頁仍開著。',
  );
  assert.equal(
    i18n.en.quickCaptureOpenUnknown('Research / Inbox', true),
    'Saved to Research / Inbox, but Locus could not confirm whether the item opened or whether the saved tab closed.',
  );
  assert.equal(
    i18n['zh-TW'].quickCaptureOpenUnknown('研究 / 收件匣', true),
    '已儲存到「研究 / 收件匣」，但 Locus 無法確認項目是否已開啟，也無法確認剛儲存的分頁是否已關閉。',
  );
  assert.equal(
    i18n['zh-TW'].quickCaptureOpenFailed('研究 / 收件匣'),
    '已儲存到「研究 / 收件匣」，但 Locus 無法開啟這個項目。剛儲存的分頁仍開著，請再試一次。',
  );
  assert.equal(
    i18n['zh-TW'].quickCaptureDestinationUnavailable,
    '這個項目已不在原本的儲存位置。請開啟 Locus 查看資料。',
  );
  assert.equal(i18n.en.windowSavedSummary(0, true), 'Saved a note.');
  assert.equal(i18n['zh-TW'].windowSavedSummary(0, true), '已儲存 1 則備註。');
  assert.equal(
    i18n.en.windowEffectUnknown(2, true),
    "Locus couldn't confirm the destination or whether 2 other tabs closed. This tab stayed open.",
  );
  assert.equal(
    i18n['zh-TW'].windowEffectUnknown(2, true),
    'Locus 無法確認儲存位置，也無法確認其他 2 個分頁是否已關閉。目前分頁保持開啟。',
  );
}

function testDeepLinkOverlaySuppression() {
  // Just Today (2026-11-07): no landing layer exists to cover a deep link, even
  // for a profile that stored showLanding: true.
  const bootSource = sourceSlice(newtabSource, 'function initAfterLoad() {', '\nlet _stateStorageSyncStarted', 'Boot');
  assert.doesNotMatch(`${bootSource}\n${newtabSource.replace(/^\s*\/\/.*$/gm, '')}`,
    /showLanding|showLandingLayer|landing-layer/,
    'Home detail deep links must never be covered by a landing layer, whatever showLanding was stored');
  const bindStaticSource = sourceSlice(newtabSource, 'function bindStatic() {', '\n// BOOT', 'Static binding');
  assert.match(bindStaticSource,
    /if \(!ensureOnboarding\(State\.get\(\)\.settings\)\.welcomeSeen\)[\s\S]*setTimeout\(\(\) => \{[\s\S]*if \(!currentDetailItemId\(\) && !activeGroupPage\) openWelcome\(\)/,
    'valid first-use Home detail and Group deep links must not be covered by Welcome');
}

(async () => {
  await testResolverAndRouteCodec();
  await testPopupLocateRecoveryRetryGuard();
  testPopupLocateNotificationRouteIdentity();
  await testQuickCaptureReceiptAndWorkerActions();
  await testWindowSaveGroupResolverAndRouteCodec();
  await testWorkerOrderingAndPartialResults();
  await testWindowSaveWorkerEffects();
  await testOpenWindowSaveDestination();
  await testCombinedStateReceipt();
  testPopupCaptureTargetAndAllocatorContracts();
  await testQuickCaptureStateReceiptBoundary();
  await testWindowSaveStateEffectBoundary();
  await testPopupIntentAndReceiptBoundary();
  await testPopupSingleSaveMutationAndSourceGuard();
  await testPopupHibernateCaptureContracts();
  await testPopupBookmarkCaptureContracts();
  await testPopupQuickCaptureReceiptThenResultBoundary();
  await testPopupWindowSaveReceiptThenEffectBoundary();
  await testPopupOneClickWindowSaveReceipt();
  await testPopupReceiptDeadline();
  await testPopupWriterExcludesWindowEffects();
  testPopupSectionStack();
  testQuickCaptureStrictReceiptValidators();
  await testPopupQuickCaptureActionSemantics();
  testPopupLocateUnavailableDestinationView();
  testPopupCaptureDeskVisualContract();
  testSemanticAndLocaleContracts();
  testDeepLinkOverlaySuppression();
  console.log('Popup save/locate contracts passed: receipts, identity, URL-safe source recovery, exact destination routes, LIFO focus, and locale parity.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
