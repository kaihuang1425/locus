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

const locateWorkerSource = sourceSlice(
  backgroundSource,
  'function resolvePopupLocateSavedItem(',
  '\nchrome.runtime.onMessage.addListener',
  'Popup Locate worker',
);
const popupDoSaveSource = sourceSlice(
  popupSource,
  'async function doSave(',
  '\nfunction loadHibernatePrefs',
  'Popup single-tab save',
);
const popupWriterSource = sourceSlice(
  popupSource,
  'let popupStateWriteQueue',
  '\nconst appLocale',
  'Popup state writer',
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
        groups: [{
          id: 'group-a',
          items: [{ id: 'item /?#%項目', type: 'tab', title: 'Saved', url: 'https://saved.test' }],
        }],
      }, {
        id: 'space-b',
        groups: [{ id: 'group-b', items: [] }],
      }],
    }, {
      id: 'ws-other',
      categories: [{ id: 'space-other', groups: [{ id: 'group-other', items: [] }] }],
    }],
    archive: [],
    trash: [],
  };
}

function createWorkerHarness(initialState = fixtureState()) {
  const control = {
    state: clone(initialState),
    calls: [],
    createFailure: null,
    removeFailure: null,
    updateFailure: null,
    focusFailure: null,
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
    chrome: {
      runtime: { getURL: file => `chrome-extension://locus/${file}` },
      tabs: {
        async create(options) {
          control.calls.push('create');
          if (control.createFailure) throw control.createFailure;
          control.created = clone(options);
          return { id: control.nextTabId, ...clone(options) };
        },
        async remove(tabId) {
          control.calls.push('remove');
          control.removed = tabId;
          if (control.removeFailure) throw control.removeFailure;
        },
        async update(tabId, options) {
          control.calls.push('update');
          control.updated = { tabId, options: clone(options) };
          if (control.updateFailure) throw control.updateFailure;
          return {
            id: tabId,
            windowId: control.created?.windowId ?? 500,
            url: control.created?.url,
            ...clone(options),
          };
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
          control.notification = { id, options: clone(options) };
          return id;
        },
      },
    },
  });
  vm.runInContext(`${locateWorkerSource}\nglobalThis.__locateApi = { resolvePopupLocateSavedItem, buildPopupLocateHash, activatePopupLocateTab, performPopupLocateSavedItem, handleStateWriteMessage };`, context, {
    filename: 'popup-locate-worker.js',
  });
  return { control, api: context.__locateApi };
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

async function testWorkerOrderingAndPartialResults() {
  const exact = fixtureState();
  const intent = { workspaceId: exact.workspaces[0].id, itemId: 'item /?#%項目', sourceTabId: 77, sourceWindowId: 321, closeSource: true };
  const success = createWorkerHarness(exact);
  const result = plain(await success.api.performPopupLocateSavedItem(intent));
  assert.deepEqual(success.control.calls, ['get', 'create', 'remove', 'update', 'focus'],
    'worker must resolve, create recovery, close source, activate, then focus its window in order');
  assert.equal(success.control.created.active, false, 'recovery route must exist before source close');
  assert.equal(success.control.created.windowId, intent.sourceWindowId, 'recovery must stay in the source popup window');
  assert.deepEqual(success.control.focused, { windowId: intent.sourceWindowId, options: { focused: true } });
  assert.equal(success.control.created.url, `chrome-extension://locus/newtab.html#/ws/${encodeURIComponent(intent.workspaceId)}/home?item=${encodeURIComponent(intent.itemId)}`);
  assert.deepEqual(result, { ok: true, routeCreated: true, sourceClosed: true, sourceCloseFailed: false });

  const keepSource = createWorkerHarness(exact);
  await keepSource.api.performPopupLocateSavedItem({ ...intent, closeSource: false });
  assert.deepEqual(keepSource.control.calls, ['get', 'create', 'update', 'focus'], 'close-disabled Locate must leave the source untouched');

  const stale = createWorkerHarness(exact);
  const staleResult = plain(await stale.api.performPopupLocateSavedItem({ ...intent, itemId: 'missing' }));
  assert.equal(staleResult.ok, false);
  assert.deepEqual(stale.control.calls, ['get'], 'stale identity must cause no browser effect');

  const createFailure = createWorkerHarness(exact);
  createFailure.control.createFailure = new Error('injected create failure');
  const createResult = plain(await createFailure.api.performPopupLocateSavedItem(intent));
  assert.equal(createResult.code, 'LOCUS_LOCATE_CREATE_FAILED');
  assert.deepEqual(createFailure.control.calls, ['get', 'create'], 'route creation failure must leave the source open');

  const closeFailure = createWorkerHarness(exact);
  closeFailure.control.removeFailure = new Error('injected remove failure');
  const closeResult = plain(await closeFailure.api.performPopupLocateSavedItem(intent));
  assert.equal(closeResult.ok, true, 'a close failure must not erase the accepted save or existing route');
  assert.equal(closeResult.sourceCloseFailed, true);
  assert.deepEqual(closeFailure.control.calls, ['get', 'create', 'remove', 'update', 'focus', 'notify'],
    'source-close failure must still activate recovery and report the partial result');
  assert.match(closeFailure.control.notification.id, /^te-popup-locate-900-/,
    'fallback notices must retain the exact recovery tab identity');

  const activationFailure = createWorkerHarness(exact);
  activationFailure.control.updateFailure = new Error('injected activation failure');
  const activationResult = plain(await activationFailure.api.performPopupLocateSavedItem({ ...intent, closeSource: false }));
  assert.equal(activationResult.code, 'LOCUS_LOCATE_ACTIVATE_FAILED');
  assert.equal(activationResult.routeCreated, true, 'activation failure must retain the already-created recovery route');
  assert.equal(activationResult.routeTabId, 900, 'activation failure must return the exact recovery tab for a retry');
  assert.equal(activationResult.sourceCloseFailed, false);
  assert.deepEqual(activationFailure.control.calls, ['get', 'create', 'update', 'notify']);

  const focusFailure = createWorkerHarness(exact);
  focusFailure.control.focusFailure = new Error('injected focus failure');
  const focusResult = plain(await focusFailure.api.performPopupLocateSavedItem({ ...intent, closeSource: false }));
  assert.equal(focusResult.code, 'LOCUS_LOCATE_ACTIVATE_FAILED');
  assert.equal(focusResult.routeTabId, 900);
  assert.deepEqual(focusFailure.control.calls, ['get', 'create', 'update', 'focus', 'notify'],
    'an unfocused recovery window must remain a typed partial result with a recovery path');
  await assert.rejects(focusFailure.api.activatePopupLocateTab(900), error =>
    error?.code === 'LOCUS_LOCATE_WINDOW_FOCUS_FAILED'
      && error?.routeTab?.url === focusFailure.control.created.url,
  'focus failure must retain the exact local route for a visible notification fallback');

  const combinedFailure = createWorkerHarness(exact);
  combinedFailure.control.removeFailure = new Error('injected close failure');
  combinedFailure.control.updateFailure = new Error('injected activation failure');
  const combinedResult = plain(await combinedFailure.api.performPopupLocateSavedItem(intent));
  assert.equal(combinedResult.sourceCloseFailed, true, 'combined failure must not lose the source-close outcome');
  assert.match(combinedFailure.control.notification.options.message, /close the original tab/,
    'combined fallback copy must disclose both failed browser effects');
}

async function testCombinedStateReceipt() {
  const candidate = fixtureState();
  const intent = { workspaceId: candidate.workspaces[0].id, itemId: 'item /?#%項目', sourceTabId: 77, sourceWindowId: 321, closeSource: true };
  const accepted = createWorkerHarness({ ...fixtureState(), workspaces: [] });
  const response = plain(await accepted.api.handleStateWriteMessage({ state: candidate, locateSavedItem: intent }));
  assert.equal(response.ok, true);
  assert.equal(response.revision, candidate._revision + 1);
  assert.equal(response.locateResult.ok, true);
  assert.deepEqual(accepted.control.calls, ['set', 'get', 'create', 'remove', 'update', 'focus'],
    'Locate browser effects must start only after the state write accepts');

  const rejected = createWorkerHarness({ ...fixtureState(), workspaces: [] });
  rejected.control.setFailure = Object.assign(new Error('conflict'), { code: 'LOCUS_STATE_CONFLICT' });
  await assert.rejects(rejected.api.handleStateWriteMessage({ state: candidate, locateSavedItem: intent }), /conflict/);
  assert.deepEqual(rejected.control.calls, ['set'], 'rejected state writes must create no route and close no source');

  const partial = createWorkerHarness({ ...fixtureState(), workspaces: [] });
  partial.control.createFailure = new Error('injected create failure');
  const partialResponse = plain(await partial.api.handleStateWriteMessage({ state: candidate, locateSavedItem: intent }));
  assert.equal(partialResponse.ok, true, 'accepted state must keep its accepted receipt when Locate fails');
  assert.equal(partialResponse.locateResult.ok, false);
  assert.equal(partial.control.state._revision, candidate._revision + 1, 'accepted saved graph must remain authoritative');
  assert.deepEqual(partial.control.calls, ['set', 'get', 'create']);
}

function createPopupSaveHarness(persist) {
  const state = {
    _revision: 1,
    settings: { closeTabOnSave: true, captureDeduplicate: true, captureRememberLast: true },
    workspaces: [{ id: 'ws', categories: [{ id: 'cat', groups: [{ id: 'group', name: 'Inbox', items: [] }] }] }],
  };
  const control = { closes: 0, removes: [], locateFailures: [], toasts: [], pending: false };
  const context = vm.createContext({
    __state: clone(state),
    __control: control,
    __persist: persist,
    structuredClone,
    setTimeout() { return 0; },
    chrome: { tabs: { async remove(id) { control.removes.push(id); } } },
    window: { close() { control.closes += 1; } },
  });
  vm.runInContext(
    `let state = structuredClone(globalThis.__state);\n` +
    `let nextUid = 1;\n` +
    `const uid = () => 'saved-item-' + nextUid++;\n` +
    `const captureFields = tab => ({ title: tab.title, fav: '' });\n` +
    `const clonePopupState = () => structuredClone(state);\n` +
    `const tr = key => key;\n` +
    `const toast = message => globalThis.__control.toasts.push(message);\n` +
    `const beginPopupCapture = () => { if (globalThis.__control.pending) return false; globalThis.__control.pending = true; return true; };\n` +
    `const finishPopupCapture = () => { globalThis.__control.pending = false; };\n` +
    `const persistPopupState = options => globalThis.__persist(options);\n` +
    `const recoverCaptureWriteFailure = async (_error, snapshot) => { state = structuredClone(snapshot); };\n` +
    `const showLocateFailure = (cat, group) => globalThis.__control.locateFailures.push(cat.id + '/' + group.id);\n` +
    `${popupDoSaveSource}\n` +
    `globalThis.__popupSaveApi = {\n` +
    `  save: options => doSave(state.workspaces[0], state.workspaces[0].categories[0], state.workspaces[0].categories[0].groups[0], { id: 33, windowId: 44, title: 'Source', url: 'https://source.test' }, options),\n` +
    `  read: () => structuredClone(state),\n` +
    `};`,
    context,
    { filename: 'popup-save-locate-flow.js' },
  );
  return { control, api: context.__popupSaveApi };
}

async function testPopupIntentAndReceiptBoundary() {
  let release;
  let recordedOptions;
  const receipt = new Promise(resolve => { release = resolve; });
  const deferred = createPopupSaveHarness(options => { recordedOptions = clone(options); return receipt; });
  const pending = deferred.api.save({ locate: true });
  await Promise.resolve();
  assert.deepEqual(recordedOptions.locateSavedItem, {
    workspaceId: 'ws', itemId: 'saved-item-1', sourceTabId: 33, sourceWindowId: 44, closeSource: true,
  }, 'selected Locate must carry only primitive saved/source identity on the state request');
  assert.equal(deferred.control.closes, 0, 'popup must not close before its typed receipt');
  assert.deepEqual(deferred.control.removes, [], 'popup must not perform the worker-owned source close');
  release({ ok: true, revision: 2, locateResult: { ok: true } });
  assert.equal(await pending, true);
  assert.equal(deferred.control.closes, 1, 'a delivered successful Locate receipt may finish the popup');
  assert.deepEqual(deferred.control.removes, []);

  const rejected = createPopupSaveHarness(async () => { throw new Error('injected rejected write'); });
  assert.equal(await rejected.api.save({ locate: true }), false);
  assert.equal(rejected.api.read().workspaces[0].categories[0].groups[0].items.length, 0,
    'rejected state write must roll back the optimistic item');
  assert.equal(rejected.control.closes, 0);
  assert.deepEqual(rejected.control.removes, []);

  const partial = createPopupSaveHarness(async () => ({ ok: true, revision: 2, locateResult: { ok: false, code: 'LOCUS_LOCATE_CREATE_FAILED' } }));
  assert.equal(await partial.api.save({ locate: true }), true, 'known Locate failure remains an accepted save');
  assert.equal(partial.api.read().workspaces[0].categories[0].groups[0].items.length, 1);
  assert.deepEqual(partial.control.locateFailures, ['cat/group']);
  assert.equal(partial.control.closes, 0, 'known Locate failure must keep its popup recovery state available');

  let ordinaryOptions;
  const ordinary = createPopupSaveHarness(async options => { ordinaryOptions = clone(options); return { ok: true, revision: 2 }; });
  assert.equal(await ordinary.api.save({ locate: false }), true);
  assert.equal(ordinaryOptions.locateSavedItem, null, 'ordinary Save must not gain a Locate side effect');
  assert.deepEqual(ordinary.control.removes, [33], 'ordinary receipt-gated source close remains unchanged');
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

function testSemanticAndLocaleContracts() {
  const saveSection = popupHtml.slice(
    popupHtml.indexOf('<section id="save-to-section"'),
    popupHtml.indexOf('<section id="hibernate-section"'),
  );
  assert.match(saveSection, /<label id="stg-locate-option"[\s\S]*<input type="checkbox" id="stg-locate">/,
    'Locate choice must be a native labelled checkbox inside the destination section');
  assert.ok(saveSection.indexOf('id="stg-locate-option"') < saveSection.indexOf('id="stg-list"'),
    'keyboard users must reach the Locate consequence before the destination list saves immediately');
  assert.match(saveSection, /id="stg-locate-result"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/,
    'partial success must have an in-section live result, not a toast-only action');
  assert.match(saveSection, /id="stg-open-locus"[\s\S]*id="stg-done"/,
    'partial result must expose keyboard-native recovery and completion actions');
  assert.doesNotMatch(saveSection, /capture-result-copy[\s\S]*<strong/,
    'the partial result must not repeat the Saved heading inside its status card');
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
  assert.doesNotMatch(popupSource, /stg-locate-result'\)\.setAttribute\('role', 'alert'\)/,
    'the partial-success result must remain one polite status region');
  assert.match(popupSource, /chrome\.tabs\.update\(locateRecoveryTabId, \{ active: true \}\)/,
    'an activation retry must target the exact already-created saved-item tab');
  assert.match(popupSource, /chrome\.windows\.update\(routeTab\.windowId, \{ focused: true \}\)/,
    'an exact-tab retry must also return focus to its recovery window');
  assert.match(popupSource, /switchToSavedItemFailed[\s\S]*stg-locate-result-message'\)\.textContent = ''[\s\S]*requestAnimationFrame/,
    'a failed recovery retry must produce a repeatable polite live announcement');
  assert.match(popupSource, /LOCUS_STATE_QUEUE_INVALIDATED/,
    'a cancelled queued write must require state recovery before another capture');
  assert.match(backgroundSource,
    /NOTIF_OPEN_PREFIXES[^\n]*POPUP_LOCATE_NOTIFICATION_PREFIX[\s\S]*activatePopupLocateTab\(routeTabId\)[\s\S]*activatedRouteUrl\.startsWith\(localNewTabUrl\)[\s\S]*chrome\.tabs\.create\(\{ url: fallbackUrl \}\)/,
    'clicking a popup Locate notice must return to its exact route before generic fallback');

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
}

function testDeepLinkOverlaySuppression() {
  assert.match(newtabSource,
    /ensureOnboarding\(State\.get\(\)\.settings\)\.welcomeSeen\s*&&\s*activeHome\s*&&\s*!currentDetailItemId\(\)\)\s*showLandingLayer\(\)/,
    'valid Home detail deep links must not be covered by the calm landing');
  const bindStaticSource = sourceSlice(newtabSource, 'function bindStatic() {', '\n// BOOT', 'Static binding');
  assert.match(bindStaticSource,
    /if \(!ensureOnboarding\(State\.get\(\)\.settings\)\.welcomeSeen\)[\s\S]*setTimeout\(\(\) => \{[\s\S]*if \(!currentDetailItemId\(\)\) openWelcome\(\)/,
    'valid first-use Home detail deep links must not be covered by Welcome');
}

(async () => {
  await testResolverAndRouteCodec();
  await testWorkerOrderingAndPartialResults();
  await testCombinedStateReceipt();
  await testPopupIntentAndReceiptBoundary();
  await testPopupReceiptDeadline();
  testSemanticAndLocaleContracts();
  testDeepLinkOverlaySuppression();
  console.log('Popup Locate contracts passed: receipts, identity, source-window recovery, partial failures, retry feedback, and locale parity.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
