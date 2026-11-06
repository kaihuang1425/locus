'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8');

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} must remain extractable from newtab.js`);
  const declarationStart = source.slice(Math.max(0, start - 6), start) === 'async '
    ? start - 6
    : start;
  const parameterOpen = source.indexOf('(', start + `function ${name}`.length);
  let parameterClose = -1;
  let parameterDepth = 0;
  let parameterQuote = '';
  let parameterEscaped = false;
  for (let index = parameterOpen; index < source.length; index += 1) {
    const char = source[index];
    if (parameterQuote) {
      if (parameterEscaped) { parameterEscaped = false; continue; }
      if (char === '\\') { parameterEscaped = true; continue; }
      if (char === parameterQuote) parameterQuote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { parameterQuote = char; continue; }
    if (char === '(') parameterDepth += 1;
    if (char === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) { parameterClose = index; break; }
    }
  }
  assert.ok(parameterClose >= 0, `${name} must have a complete parameter list`);
  const open = source.indexOf('{', parameterClose + 1);
  assert.ok(open >= 0, `${name} must have a function body`);

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

function loadFunctions(names, globals = {}) {
  const context = vm.createContext({ ...globals });
  vm.runInContext(names.map(extractFunction).join('\n\n'), context, { filename: 'newtab-item-detail-extract.js' });
  return context;
}

const plain = value => JSON.parse(JSON.stringify(value));

function eventFor(key, target, shiftKey = false) {
  return {
    key,
    target,
    shiftKey,
    defaultPrevented: false,
    propagationStopped: false,
    immediatePropagationStopped: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagationStopped = true; },
    stopImmediatePropagation() {
      this.immediatePropagationStopped = true;
      this.propagationStopped = true;
    },
  };
}

function clickEventFor(target) {
  return eventFor('', target);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function tokenList(...initial) {
  const tokens = new Set(initial);
  return {
    add(...values) { values.forEach(value => tokens.add(value)); },
    remove(...values) { values.forEach(value => tokens.delete(value)); },
    contains(value) { return tokens.has(value); },
    toggle(value, force) {
      const next = force === undefined ? !tokens.has(value) : !!force;
      if (next) tokens.add(value);
      else tokens.delete(value);
      return next;
    },
  };
}

function createRichTextLinkHarness() {
  const attributes = new Map();
  const document = { activeElement: null };
  const editor = {
    nodeType: 1,
    classList: tokenList('note-text'),
    isConnected: true,
    isContentEditable: true,
    innerHTML: '<p>Selected text</p>',
    inputEvents: 0,
    closest(selector) { return selector === '.note-text' ? this : null; },
    contains(node) { return node === textNode; },
    focus() { document.activeElement = this; },
    dispatchEvent(event) {
      if (event?.type === 'input' && event.bubbles === true) this.inputEvents += 1;
      return true;
    },
  };
  const textNode = { nodeType: 3, parentElement: editor, isConnected: true };
  function makeRange(text = 'Selected text') {
    return {
      collapsed: false,
      startContainer: textNode,
      startOffset: 0,
      endContainer: textNode,
      endOffset: 13,
      selectedText: text,
      toString() { return this.selectedText; },
      cloneRange() {
        const clone = makeRange(this.selectedText);
        clone.collapsed = this.collapsed;
        clone.startContainer = this.startContainer;
        clone.startOffset = this.startOffset;
        clone.endContainer = this.endContainer;
        clone.endOffset = this.endOffset;
        return clone;
      },
      getBoundingClientRect() { return { top: 20, bottom: 36, left: 20, width: 80 }; },
    };
  }
  let selectedRange = makeRange();
  const browserSelection = {
    get rangeCount() { return selectedRange ? 1 : 0; },
    get isCollapsed() { return !selectedRange || selectedRange.collapsed; },
    getRangeAt() { return selectedRange; },
    removeAllRanges() { selectedRange = null; },
    addRange(range) { selectedRange = range; },
  };

  const makeElement = (id, hidden = false) => ({
    id,
    dataset: {},
    inert: false,
    classList: tokenList(...(hidden ? ['hidden'] : [])),
    setAttribute(name, value) { attributes.set(`${id}:${name}`, String(value)); },
    getAttribute(name) { return attributes.get(`${id}:${name}`); },
    focus() { document.activeElement = this; },
  });
  const app = makeElement('app');
  const overlay = makeElement('rich-text-link-overlay', true);
  const recovery = makeElement('state-recovery-overlay', true);
  const toolbar = makeElement('rt-toolbar');
  const input = makeElement('rich-text-link-input');
  const selectionPreview = makeElement('rich-text-link-selection');
  const error = makeElement('rich-text-link-error');
  input.value = '';
  input.setSelectionRange = (start, end) => { input.selection = [start, end]; };
  const elements = {
    app,
    'rich-text-link-overlay': overlay,
    'state-recovery-overlay': recovery,
    'rt-toolbar': toolbar,
    'rich-text-link-input': input,
    'rich-text-link-selection': selectionPreview,
    'rich-text-link-error': error,
  };
  const overlayChildren = new Set([input, selectionPreview, error]);
  overlay.contains = target => overlayChildren.has(target);
  recovery.contains = target => target === recovery;
  document.getElementById = id => elements[id] || null;
  document.body = { children: [app, overlay, recovery] };

  const execCalls = [];
  let execResult = true;
  let execError = null;
  let execMutation = null;
  document.execCommand = (...args) => {
    execCalls.push(args);
    if (execMutation !== null) editor.innerHTML = execMutation;
    if (execError) throw execError;
    return execResult;
  };

  let scrollLocks = 0;
  const globals = {
    URL,
    Event: class {
      constructor(type, options = {}) { this.type = type; this.bubbles = options.bubbles === true; }
    },
    document,
    window: { getSelection: () => browserSelection },
    richTextLinkContext: null,
    RICH_TEXT_LINK_CONFLICTING_IDS: [
      'state-recovery-overlay', 'paste-overlay', 'reminder-overlay',
      'calendar-task-overlay', 'modal-overlay', 'import-overlay',
    ],
    _overlayOpeners: new WeakMap(),
    requestAnimationFrame: callback => callback(),
    tr: key => key,
    lockBodyScroll: () => { scrollLocks += 1; },
    unlockBodyScroll: () => { scrollLocks = Math.max(0, scrollLocks - 1); },
  };
  const context = loadFunctions([
    'setElementInertOwner',
    'rememberOpener',
    'restoreOpener',
    'richTextEditorForNode',
    'richTextLinkNodeWithinEditor',
    'captureRichTextLinkSelection',
    'richTextLinkContextStillMatches',
    'normalizeRichTextLinkUrl',
    'isRichTextLinkEditorOwned',
    'setRichTextLinkInterlock',
    'focusRichTextLinkInput',
    'paintRichTextLinkDialog',
    'setRichTextLinkError',
    'restoreRichTextLinkSelection',
    'closeRichTextLinkDialog',
    'richTextLinkHasConflict',
    'openRichTextLinkDialog',
    'finishRichTextLinkSuccess',
    'applyRichTextLink',
    'handleRichTextLinkGlobalKey',
  ], globals);

  return {
    context,
    document,
    editor,
    textNode,
    input,
    overlay,
    recovery,
    toolbar,
    app,
    selectionPreview,
    error,
    execCalls,
    currentRange: () => selectedRange,
    setExecResult(value) { execResult = value; },
    setExecError(errorValue) { execError = errorValue; },
    setExecMutation(value) { execMutation = value; },
    scrollLocks: () => scrollLocks,
  };
}

function loadItemDetailMutationFunctions(globals = {}) {
  const names = [
    'collectWorkspaceItems',
    'isItemDetailMutationPending',
    'isItemDetailReminderMutationPending',
    'isReminderMutationPending',
    'handleReminderGlobalKey',
    'setReminderMutationStatus',
    'setReminderMutationBusy',
    'setReminderMutationUnavailable',
    'itemDetailValueFingerprint',
    'itemDetailSurfaceFingerprint',
    'itemDetailLocationFingerprint',
    'createItemDetailMutationContext',
    'resolveItemDetailMutationTarget',
    'clearItemDetailStatusTimer',
    'setItemDetailMutationStatus',
    'setItemDetailMutationBusy',
    'handleItemDetailPendingClick',
    'handleItemDetailPendingKeydownCapture',
    'cloneItemDetailJson',
    'isItemDetailRecord',
    'applyItemDetailCandidate',
    'commitItemDetailMutation',
    'commitItemDetailReminderMutation',
    'flushItemDetailBeforePageHide',
    'handleItemDetailKeydown',
  ];
  const context = vm.createContext({ ...globals });
  vm.runInContext(
    `let reminderCtx = null;\nlet itemDetailMutationPending = null;\nlet itemReminderMutationPending = null;\nlet entityReminderMutationPending = null;\nlet itemDetailStatusTimer = null;\n\n${names.map(extractFunction).join('\n\n')}`,
    context,
    { filename: 'newtab-item-detail-mutation-extract.js' },
  );
  return context;
}

function loadNonDetailItemReminderFunctions(globals = {}) {
  const names = [
    'isItemDetailReminderMutationPending',
    'isReminderMutationPending',
    'itemDetailValueFingerprint',
    'cloneItemDetailJson',
    'isItemDetailRecord',
    'currentItemReminderIdentity',
    'createItemReminderMutationContext',
    'resolveItemReminderMutationTarget',
    'commitItemReminderMutation',
  ];
  const context = vm.createContext({ ...globals });
  vm.runInContext(
    `let itemReminderMutationPending = null;
let entityReminderMutationPending = null;

${names.map(extractFunction).join('\n\n')}
globalThis.__itemReminderPending = () => itemReminderMutationPending;`,
    context,
    { filename: 'newtab-nondetail-item-reminder-extract.js' },
  );
  return context;
}

function testLibraryRouting() {
  const routeContext = loadFunctions(['parse', 'build']);
  const libraryQuery = { q: 'distributed systems', status: 'read', sort: 'title', item: 'item/1' };
  const hash = routeContext.build({ type: 'library', wsId: 'ws 1', mode: 'read-later', query: libraryQuery });
  assert.equal(
    hash,
    '/ws/ws%201/library/read-later?q=distributed%20systems&status=read&sort=title&item=item%2F1',
    'library query, status, sort, and detail state must be serialized into the canonical hash',
  );
  assert.deepEqual(plain(routeContext.parse(`#${hash}`)), {
    type: 'library', wsId: 'ws 1', mode: 'read-later', query: libraryQuery,
  }, 'the canonical library hash must restore the complete recovery ledger after reload/back/forward');

  const currentContext = loadFunctions(['currentRoute'], {
    activeWs: () => ({ id: 'ws-1' }),
    activeLibraryMode: 'all',
    activeLibraryState: null,
    boardDetailItemId: 'item-1',
    libraryRouteQuery: (_state, itemId) => itemId ? { item: itemId } : {},
    activeSearch: null,
    activeCalendar: null,
    activeGroupPage: null,
    activeHome: false,
    searchRouteQuery: () => ({}),
    activeCat: () => ({ id: 'cat-1' }),
    getViewMode: () => 'board',
  });
  assert.deepEqual(plain(currentContext.currentRoute()), {
    type: 'library', wsId: 'ws-1', mode: 'all', query: { item: 'item-1' },
  }, 'currentRoute must retain the open library item');

  const routeWs = { id: 'ws-1' };
  const routeCat = { id: 'cat-1' };
  const routeGroup = { id: 'group-1' };
  const routeItem = { id: 'item-1', type: 'tab', favorite: true, readLaterAt: 1 };
  const state = { activeWsId: 'ws-1', workspaces: [routeWs] };
  let searchAnnouncementResets = 0;
  const applyContext = loadFunctions([
    'libraryStateFromRoute', 'libraryRouteQuery', 'validDetailItemIdForSurface', 'apply', 'currentRoute',
  ], {
    LIBRARY_LEDGER_MODES: ['all', 'favorites', 'read-later'],
    LIBRARY_MODES: ['all', 'favorites', 'read-later', 'archive', 'trash'],
    LIBRARY_SORTS: ['newest', 'oldest', 'title'],
    LIBRARY_READ_STATUSES: ['unread', 'read', 'all'],
    State: { get: () => state },
    activeWs: () => routeWs,
    findItem: id => id === 'item-1' ? { ws: routeWs, cat: routeCat, group: routeGroup, item: routeItem } : null,
    activeSearch: { query: 'old' },
    activeHome: true,
    activeGroupPage: { groupId: 'old-group' },
    activeCalendar: { view: 'month' },
    boardDetailItemId: null,
    activeLibraryMode: null,
    activeLibraryState: null,
    libraryDetailItemIdForRoute: (_ws, _libraryState, itemId) => itemId || null,
    resetSearchAnnouncement: () => { searchAnnouncementResets += 1; },
    searchRouteQuery: () => ({}),
    activeCat: () => ({ id: 'cat-1' }),
    getViewMode: () => 'board',
  });
  assert.equal(applyContext.apply({
    type: 'library', wsId: 'ws-1', mode: 'read-later', query: {
      q: 'distributed systems', status: 'read', sort: 'title', item: 'item-1',
    },
  }), true);
  assert.equal(applyContext.boardDetailItemId, 'item-1', 'applying a library deep link must restore its detail item');
  assert.equal(applyContext.activeLibraryMode, 'read-later');
  assert.equal(applyContext.activeSearch, null);
  assert.equal(searchAnnouncementResets, 1, 'leaving Search for Library must cancel pending Search announcements');
  assert.equal(applyContext.activeHome, false);
  assert.equal(applyContext.activeGroupPage, null);
  assert.equal(applyContext.activeCalendar, null);
  assert.deepEqual(plain(applyContext.currentRoute()), {
    type: 'library', wsId: 'ws-1', mode: 'read-later', query: {
      q: 'distributed systems', status: 'read', sort: 'title', item: 'item-1',
    },
  }, 'applying a Library URL must retain its complete recovery state in the current route');
  assert.equal(applyContext.apply({
    type: 'library', wsId: 'ws-1', mode: 'read-later', query: {},
  }), true);
  assert.equal(applyContext.boardDetailItemId, null, 'a library route without item must close stale detail state');

  const navigations = [];
  const preparedItems = [];
  const openCloseContext = loadFunctions([
    'libraryRouteQuery', 'validDetailItemIdForSurface', 'openItemDetail', 'closeItemDetail',
  ], {
    LIBRARY_LEDGER_MODES: ['all', 'favorites', 'read-later'],
    findItem: id => id === 'item-1' ? { ws: routeWs, cat: routeCat, group: routeGroup, item: routeItem } : null,
    prepareItemDetailOpen: (...args) => { preparedItems.push(args); },
    activeGroupPage: null,
    activeLibraryMode: 'read-later',
    activeLibraryState: {
      mode: 'read-later', query: 'distributed systems', status: 'read', sort: 'title',
    },
    libraryDetailItemIdForRoute: (_ws, _libraryState, itemId) => itemId || null,
    boardDetailItemId: null,
    activeWs: () => ({ id: 'ws-1' }),
    activeCat: () => ({ id: 'cat-1' }),
    getViewMode: () => 'board',
    isItemDetailMutationPending: () => false,
    State: { get: () => ({ activeWsId: 'ws-1' }) },
    Router: {
      navigate: (route, options = {}) => {
        navigations.push({ route: plain(route), options: plain(options) });
        return true;
      },
    },
  });
  openCloseContext.openItemDetail('item-1');
  assert.equal(preparedItems.at(-1)[0], 'item-1', 'the opener must be captured before routed navigation');
  let navigation = navigations.shift();
  assert.deepEqual(navigation.route, {
    type: 'library', wsId: 'ws-1', mode: 'read-later', query: {
      q: 'distributed systems', status: 'read', sort: 'title', item: 'item-1',
    },
  }, 'opening from a library must preserve the complete recovery ledger route');
  assert.equal(navigation.options.persist, false,
    'opening Library detail must not write URL-owned recovery state to durable storage');
  openCloseContext.closeItemDetail();
  navigation = navigations.shift();
  assert.deepEqual(navigation.route, {
    type: 'library', wsId: 'ws-1', mode: 'read-later', query: {
      q: 'distributed systems', status: 'read', sort: 'title',
    },
  }, 'closing library detail must preserve query, status, and sort without jumping to the board');
  assert.equal(navigation.options.persist, false,
    'closing Library detail must not write URL-owned recovery state to durable storage');
  openCloseContext.openItemDetail('item-1', { initialFocusKey: 'title' });
  assert.deepEqual(
    plain(preparedItems.at(-1)),
    ['item-1', null, 'title'],
    'a routed Edit title action must forward its requested initial field to detail preparation',
  );
  navigations.shift();

  const ledgerRowSource = extractFunction('buildLibraryLedgerRow');
  const activationSource = extractFunction('activateLibraryRecovery');
  assert.match(ledgerRowSource, /activateLibraryRecovery\(recovery,\s*'details',\s*details\)/,
    'every Library mode must send its visible Details action through the exact shared recovery boundary');
  assert.match(activationSource, /openItemDetail\(target\.item\.id,\s*\{\s*returnFocusKey:\s*context\.focusKey\s*\}\)/,
    'the shared Library recovery boundary must retain routed detail focus identity');
  assert.match(extractFunction('openItemDetail'),
    /activeLibraryMode[\s\S]*libraryDetailItemIdForRoute\(ws,\s*activeLibraryState,\s*id\)/,
    'Library Details must recheck unique visible membership at its routed open boundary');
}

function testSurfaceRouteValidation() {
  const rows = {
    good: {
      ws: { id: 'ws-1' }, cat: { id: 'cat-1' }, group: { id: 'group-1' },
      item: { id: 'good', type: 'tab', favorite: true, readLaterAt: 1 },
    },
    plain: {
      ws: { id: 'ws-1' }, cat: { id: 'cat-1' }, group: { id: 'group-1' },
      item: { id: 'plain', type: 'tab' },
    },
    note: {
      ws: { id: 'ws-1' }, cat: { id: 'cat-1' }, group: { id: 'group-1' },
      item: { id: 'note', type: 'note' },
    },
  };
  const context = loadFunctions(['validDetailItemIdForSurface'], { findItem: id => rows[id] || null });
  assert.equal(context.validDetailItemIdForSurface('good', { wsId: 'ws-1', catId: 'cat-1' }), 'good');
  assert.equal(context.validDetailItemIdForSurface('good', { wsId: 'other', catId: 'cat-1' }), null);
  assert.equal(context.validDetailItemIdForSurface('good', { wsId: 'ws-1', catId: 'other' }), null);
  assert.equal(context.validDetailItemIdForSurface('good', { wsId: 'ws-1', groupId: 'other' }), null);
  assert.equal(context.validDetailItemIdForSurface('good', { wsId: 'ws-1', libraryMode: 'favorites' }), 'good');
  assert.equal(context.validDetailItemIdForSurface('plain', { wsId: 'ws-1', libraryMode: 'favorites' }), null);
  assert.equal(context.validDetailItemIdForSurface('plain', { wsId: 'ws-1', libraryMode: 'read-later' }), null);
  assert.equal(context.validDetailItemIdForSurface('note', { wsId: 'ws-1', libraryMode: 'all' }), null);
  assert.equal(context.validDetailItemIdForSurface('good', { wsId: 'ws-1', libraryMode: 'archive' }), null);
  const applySource = extractFunction('apply');
  const applyUses = applySource.match(/validDetailItemIdForSurface\(/g) || [];
  assert.ok(applyUses.length >= 2, 'group and board route application must validate item ownership');
  assert.match(applySource, /libraryDetailItemIdForRoute\(routeWs,\s*nextLibraryState,\s*routeItem\)/,
    'Library route application must additionally require a globally unique item in the current visible ledger');
  const renderDetailSource = extractFunction('renderItemDetail');
  assert.ok(renderDetailSource.includes('validDetailItemIdForSurface(id, surface)'),
    'rerenders must close an item that moved outside the current surface');
  assert.match(renderDetailSource,
    /activeLibraryMode\s*\?\s*libraryDetailItemIdForRoute\(ws,\s*activeLibraryState,\s*id\)/,
    'Library detail rerenders must close an item that is no longer globally unique and visible');
}

function homePreviewFixture() {
  const exact = { id: 'item/exact', type: 'tab', title: 'Exact link', url: 'https://exact.test/' };
  const nested = { id: 'item/nested', type: 'tab', title: 'Nested link', url: 'https://nested.test/' };
  const moved = { id: 'item/moved', type: 'note', html: 'Moved context' };
  const duplicateA = { id: 'item/duplicate', type: 'tab', title: 'Duplicate A', url: 'https://a.test/' };
  const duplicateB = { id: 'item/duplicate', type: 'todo', text: 'Duplicate B' };
  const crossWorkspaceDuplicateA = { id: 'item/cross-duplicate', type: 'note', html: 'Local duplicate' };
  const crossWorkspaceDuplicateB = { id: 'item/cross-duplicate', type: 'note', html: 'Remote duplicate' };
  const duplicateSpaceOwner = { id: 'item/duplicate-space-owner', type: 'note', html: 'Ambiguous Space owner' };
  const outside = { id: 'item/outside', type: 'tab', title: 'Outside', url: 'https://outside.test/' };

  const inbox = {
    id: 'group-inbox', name: 'Inbox', items: [
      exact,
      { id: 'stack-1', type: 'stack', name: 'Nested stack', items: [nested, duplicateA] },
    ],
  };
  const movedGroup = {
    id: 'group-moved', name: 'Moved group',
    items: [moved, duplicateB, crossWorkspaceDuplicateA],
  };
  const spaceA = { id: 'space-a', name: 'Space A', layout: 'board', groups: [inbox] };
  const spaceB = { id: 'space-b', name: 'Space B', layout: 'canvas', groups: [movedGroup] };
  const duplicateSpaceA = {
    id: 'space-duplicate', name: 'Duplicate Space A',
    groups: [{ id: 'group-duplicate-space', name: 'Ambiguous owner', items: [duplicateSpaceOwner] }],
  };
  const duplicateSpaceB = { id: 'space-duplicate', name: 'Duplicate Space B', groups: [] };
  const workspace = {
    id: 'ws/one', activeCatId: spaceA.id,
    categories: [spaceA, spaceB, duplicateSpaceA, duplicateSpaceB],
  };
  const otherSpace = {
    id: 'space-other', name: 'Other Space', groups: [
      { id: 'group-other', name: 'Other group', items: [outside, crossWorkspaceDuplicateB] },
    ],
  };
  const otherWorkspace = { id: 'ws-two', activeCatId: otherSpace.id, categories: [otherSpace] };
  const state = {
    activeWsId: workspace.id,
    settings: { viewMode: 'board' },
    workspaces: [workspace, otherWorkspace],
  };
  return {
    state, workspace, otherWorkspace, spaceA, spaceB, inbox, movedGroup,
    exact, nested, moved, duplicateA, duplicateB, crossWorkspaceDuplicateA,
    crossWorkspaceDuplicateB, duplicateSpaceOwner, outside,
  };
}

function assertHomePreviewTarget(target, expected, message) {
  assert.ok(target, message);
  assert.equal(target.ws.id, expected.wsId, `${message}: workspace`);
  assert.equal(target.cat.id, expected.catId, `${message}: Space`);
  assert.equal(target.group.id, expected.groupId, `${message}: Group`);
  assert.equal(target.item.id, expected.itemId, `${message}: item`);
}

function homePreviewContext(fixture, globals = {}) {
  return loadFunctions([
    'collectWorkspaceItems',
    'resolveUniqueHomePreviewItem',
    'homePreviewFocusKey',
    'homePreviewRoute',
    'openHomePreviewItem',
  ], {
    State: { get: () => fixture.state },
    LAYOUTS: { board: {}, list: {}, canvas: {} },
    ...globals,
  });
}

function testHomePreviewResolutionAndRouting() {
  const fixture = homePreviewFixture();
  const context = homePreviewContext(fixture, {
    focusDialogOpener() {},
    prepareItemDetailOpen() {},
    Router: { navigate() {} },
    toast() {},
    tr: key => key,
  });

  const exact = context.resolveUniqueHomePreviewItem(fixture.workspace.id, fixture.exact.id);
  assertHomePreviewTarget(exact, {
    wsId: fixture.workspace.id,
    catId: fixture.spaceA.id,
    groupId: fixture.inbox.id,
    itemId: fixture.exact.id,
  }, 'an exact top-level Home preview must resolve inside its requested workspace');
  assert.equal(exact.item, fixture.exact,
    'exact resolution must retain the real saved record');

  const nested = context.resolveUniqueHomePreviewItem(fixture.workspace.id, fixture.nested.id);
  assertHomePreviewTarget(nested, {
    wsId: fixture.workspace.id,
    catId: fixture.spaceA.id,
    groupId: fixture.inbox.id,
    itemId: fixture.nested.id,
  }, 'a Home preview must resolve an item nested in a Stack');
  assert.deepEqual(plain(nested.parents.map(parent => parent.id)), ['stack-1'],
    'nested resolution must retain the owning Stack ancestry');

  const moved = context.resolveUniqueHomePreviewItem(fixture.workspace.id, fixture.moved.id);
  assertHomePreviewTarget(moved, {
    wsId: fixture.workspace.id,
    catId: fixture.spaceB.id,
    groupId: fixture.movedGroup.id,
    itemId: fixture.moved.id,
  }, 'resolution must follow an item to its current Space within the workspace');

  assert.equal(context.resolveUniqueHomePreviewItem(fixture.workspace.id, 'missing'), null,
    'a missing preview id must fail closed');
  assert.equal(context.resolveUniqueHomePreviewItem(fixture.workspace.id, fixture.duplicateA.id), null,
    'duplicate item ids in one workspace must fail closed instead of choosing one');
  assert.equal(context.resolveUniqueHomePreviewItem(fixture.workspace.id, fixture.crossWorkspaceDuplicateA.id), null,
    'an item id duplicated in another workspace must fail closed globally');
  assert.equal(context.resolveUniqueHomePreviewItem(fixture.workspace.id, fixture.duplicateSpaceOwner.id), null,
    'a unique item with duplicate owning Space ids must fail closed');
  assert.equal(context.resolveUniqueHomePreviewItem(fixture.workspace.id, fixture.outside.id), null,
    'an item moved outside the requested workspace must fail closed');
  assert.equal(context.resolveUniqueHomePreviewItem('missing-workspace', fixture.exact.id), null,
    'a missing workspace must fail closed');

  assert.deepEqual(plain(context.homePreviewRoute(exact)), {
    type: 'home', wsId: fixture.workspace.id,
    query: { item: fixture.exact.id },
  }, 'a Home preview must deep-link to the item without leaving Home');
  assert.deepEqual(plain(context.homePreviewRoute(nested)), {
    type: 'home', wsId: fixture.workspace.id,
    query: { item: fixture.nested.id },
  }, 'a nested preview must remain on the Home detail route');
  assert.deepEqual(plain(context.homePreviewRoute(moved)), {
    type: 'home', wsId: fixture.workspace.id,
    query: { item: fixture.moved.id },
  }, 'a moved preview must recover on Home without entering its Canvas Space');
  assert.deepEqual(Object.keys(plain(context.homePreviewRoute(moved)).query), ['item'],
    'Home recovery must never inherit an owning Space layout query');
  assert.equal(context.homePreviewRoute(null), null, 'an unresolved preview must not manufacture a route');

  const homeRouteSource = extractFunction('homePreviewRoute');
  assert.ok(!homeRouteSource.includes('LAYOUTS') && !homeRouteSource.includes('.layout'),
    'Home recovery must not inspect or initialize an advanced Space layout');

  const inboxKey = context.homePreviewFocusKey(fixture.workspace.id, `inbox:${fixture.spaceA.id}`, fixture.exact.id);
  assert.equal(inboxKey, context.homePreviewFocusKey(fixture.workspace.id, `inbox:${fixture.spaceA.id}`, fixture.exact.id),
    'the same Home origin must rebuild the same focus key');
  assert.notEqual(inboxKey, context.homePreviewFocusKey(fixture.workspace.id, `space:${fixture.spaceA.id}`, fixture.exact.id),
    'Inbox and Space-register instances of one item need distinct return-focus keys');
  assert.notEqual(
    context.homePreviewFocusKey('ws/a', 'origin', 'item'),
    context.homePreviewFocusKey('ws', 'a/origin', 'item'),
    'encoded focus-key components must not collide when ids contain separators',
  );
}

function testHomeRouteStateAndHistoryContract() {
  const fixture = homePreviewFixture();
  const route = {
    type: 'home', wsId: fixture.workspace.id, query: { item: fixture.exact.id },
  };
  const routeContext = loadFunctions(['parse', 'build']);
  const hash = routeContext.build(route);
  assert.equal(hash, '/ws/ws%2Fone/home?item=item%2Fexact',
    'the Home recovery item must live in the Home hash');
  assert.deepEqual(plain(routeContext.parse(`#${hash}`)), route,
    'reload and Back/Forward must restore the Home item query');

  const currentContext = loadFunctions(['currentRoute'], {
    activeWs: () => fixture.workspace,
    activeLibraryMode: null,
    activeSearch: null,
    activeCalendar: null,
    activeGroupPage: null,
    activeHome: true,
    boardDetailItemId: fixture.exact.id,
    searchRouteQuery: () => ({}),
    activeCat: () => fixture.spaceA,
    getViewMode: () => fixture.spaceA.layout,
  });
  assert.deepEqual(plain(currentContext.currentRoute()), route,
    'currentRoute must retain an open globally unique item on Home');

  const stateBeforeApply = JSON.stringify(fixture.state);
  const viewModeBefore = fixture.state.settings.viewMode;
  const activeSpaceBefore = fixture.workspace.activeCatId;
  const canvasLayoutBefore = fixture.spaceB.layout;
  const document = { body: { dataset: { viewMode: 'board' } } };
  const applyContext = loadFunctions([
    'collectWorkspaceItems',
    'resolveUniqueHomePreviewItem',
    'currentRoute',
    'apply',
  ], {
    State: { get: () => fixture.state },
    activeWs: () => fixture.state.workspaces.find(workspace => workspace.id === fixture.state.activeWsId) || null,
    activeCat: () => {
      const workspace = fixture.state.workspaces.find(entry => entry.id === fixture.state.activeWsId);
      return workspace?.categories.find(space => space.id === workspace.activeCatId) || null;
    },
    activeLibraryMode: null,
    activeSearch: null,
    activeCalendar: { view: 'month' },
    activeGroupPage: { groupId: 'old-group', itemId: null },
    activeHome: false,
    boardDetailItemId: null,
    searchRouteQuery: () => ({}),
    searchStateFromQuery: () => null,
    validDetailItemIdForSurface: () => null,
    findGroup: () => null,
    getViewMode: () => fixture.state.settings.viewMode,
    CAL_VIEWS: ['month'],
    calendarFilter: '',
    LAYOUTS: { board: {}, canvas: {} },
    document,
  });

  assert.equal(applyContext.apply({
    type: 'home', wsId: fixture.workspace.id, query: { item: fixture.moved.id },
  }), true, 'a globally unique moved item must restore over Home');
  assert.equal(applyContext.activeHome, true);
  assert.equal(applyContext.activeGroupPage, null);
  assert.equal(applyContext.activeCalendar, null);
  assert.equal(applyContext.boardDetailItemId, fixture.moved.id);
  assert.deepEqual(plain(applyContext.currentRoute()), {
    type: 'home', wsId: fixture.workspace.id, query: { item: fixture.moved.id },
  });
  assert.equal(fixture.workspace.activeCatId, activeSpaceBefore,
    'Home recovery must not select the item\'s owning Space');
  assert.equal(fixture.spaceB.layout, canvasLayoutBefore,
    'Home recovery must not initialize or rewrite the owning Canvas layout');
  assert.equal(fixture.state.settings.viewMode, viewModeBefore,
    'Home recovery must not enter an advanced global view');
  assert.equal(document.body.dataset.viewMode, 'board');
  assert.equal(JSON.stringify(fixture.state), stateBeforeApply,
    'applying a Home item query must not mutate durable selection state');

  assert.equal(applyContext.apply({
    type: 'home', wsId: fixture.workspace.id, query: { item: fixture.duplicateA.id },
  }), true);
  assert.equal(applyContext.boardDetailItemId, null,
    'a globally ambiguous Home item query must normalize closed');
  assert.equal(applyContext.activeHome, true);

  const closeNavigations = [];
  const closeContext = loadFunctions(['closeItemDetail'], {
    activeGroupPage: null,
    activeLibraryMode: null,
    activeSearch: null,
    activeHome: true,
    activeWs: () => fixture.workspace,
    activeCat: () => fixture.spaceA,
    getViewMode: () => fixture.spaceA.layout,
    isItemDetailMutationPending: () => false,
    State: { get: () => fixture.state },
    Router: { navigate: (nextRoute, options) => closeNavigations.push({
      route: plain(nextRoute), options: plain(options),
    }) },
  });
  closeContext.closeItemDetail();
  assert.deepEqual(closeNavigations, [{
    route: { type: 'home', wsId: fixture.workspace.id, query: {} },
    options: { persist: false },
  }], 'closing Home detail must stay on Home without persisting selection');

  const historyFixture = homePreviewFixture();
  let persistenceCalls = 0;
  let renders = 0;
  const historyLocation = {
    hash: '#/ws/ws%2Fone/home?item=item%2Fexact',
  };
  const historyCalls = [];
  let historyMutationPending = false;
  let blurStartsMutation = false;
  let historyFlushes = 0;
  const historyDocument = {
    body: { dataset: { viewMode: 'board' } },
    getElementById: () => null,
  };
  const historyContext = loadFunctions([
    'collectWorkspaceItems',
    'resolveUniqueHomePreviewItem',
    'parse',
    'build',
    'currentRoute',
    'apply',
    'handleLocationChange',
  ], {
    State: {
      get: () => historyFixture.state,
      persist: () => { persistenceCalls += 1; },
    },
    activeWs: () => historyFixture.state.workspaces.find(
      workspace => workspace.id === historyFixture.state.activeWsId,
    ) || null,
    activeCat: () => {
      const workspace = historyFixture.state.workspaces.find(
        entry => entry.id === historyFixture.state.activeWsId,
      );
      return workspace?.categories.find(space => space.id === workspace.activeCatId) || null;
    },
    activeLibraryMode: null,
    activeSearch: null,
    activeCalendar: null,
    activeGroupPage: null,
    activeHome: true,
    boardDetailItemId: null,
    searchRouteQuery: () => ({}),
    searchStateFromQuery: () => null,
    validDetailItemIdForSurface: () => null,
    findGroup: () => null,
    getViewMode: () => {
      const workspace = historyFixture.state.workspaces.find(
        entry => entry.id === historyFixture.state.activeWsId,
      );
      return workspace?.categories.find(space => space.id === workspace.activeCatId)?.layout
        || historyFixture.state.settings.viewMode;
    },
    CAL_VIEWS: ['month'],
    calendarFilter: '',
    LAYOUTS: { board: {}, canvas: {} },
    document: historyDocument,
    location: historyLocation,
    history: {
      replaceState: (...args) => historyCalls.push(['replace', ...args]),
      pushState: (...args) => historyCalls.push(['push', ...args]),
    },
    closeIdentityEditor() {},
    isItemDetailMutationPending: () => historyMutationPending,
    isReminderMutationPending: () => false,
    isCalendarTaskMutationPending: () => false,
    isPasteImportPending: () => false,
    settingsPreferencePendingTransaction: () => null,
    closePasteOverlay() {},
    closeCalendarTaskDialog() {},
    settingsPreferenceBlocksDismissal: () => false,
    isArchivedPageRestorePending: () => false,
    isSavedPageArchivePending: () => false,
    isSelectedItemMutationPending: () => false,
    isSavedTabReturnMutationPending: () => false,
    isBoardTodoCompletionPending: () => false,
    flushActiveItemDetailEditor() {
      historyFlushes += 1;
      if (blurStartsMutation) historyMutationPending = true;
    },
    renderAll: () => { renders += 1; },
  });
  const durableBeforeHistory = JSON.stringify(historyFixture.state);
  historyContext.handleLocationChange();
  assert.equal(historyContext.boardDetailItemId, historyFixture.exact.id);
  assert.equal(persistenceCalls, 0,
    'Back/Forward opening Home detail must not persist ephemeral item selection');
  assert.equal(JSON.stringify(historyFixture.state), durableBeforeHistory);
  assert.equal(renders, 1);

  historyLocation.hash = '#/ws/ws%2Fone/home';
  historyContext.handleLocationChange();
  assert.equal(historyContext.boardDetailItemId, null);
  assert.equal(persistenceCalls, 0,
    'Back/Forward closing Home detail must not persist ephemeral item selection');
  assert.equal(JSON.stringify(historyFixture.state), durableBeforeHistory);
  assert.equal(renders, 2);

  historyLocation.hash = '#/ws/ws%2Fone/cat/space-b?view=canvas';
  historyContext.handleLocationChange();
  assert.equal(historyFixture.workspace.activeCatId, historyFixture.spaceB.id);
  assert.equal(persistenceCalls, 1,
    'Back/Forward must still persist a real durable Space selection change');
  assert.equal(renders, 3);

  const writesBeforePendingHistory = persistenceCalls;
  const rendersBeforePendingHistory = renders;
  const flushesBeforePendingHistory = historyFlushes;
  historyMutationPending = true;
  historyLocation.hash = '#/ws/ws%2Fone/home';
  historyContext.handleLocationChange();
  assert.equal(historyFlushes, flushesBeforePendingHistory,
    'Back/Forward must not blur again while a detail receipt already owns the foreground');
  assert.equal(persistenceCalls, writesBeforePendingHistory);
  assert.equal(renders, rendersBeforePendingHistory);
  assert.deepEqual(historyCalls.at(-1), [
    'push', null, '', '#/ws/ws%2Fone/cat/space-b?view=canvas',
  ], 'pending Back/Forward must restore the reviewed route without applying it');

  historyMutationPending = false;
  blurStartsMutation = true;
  const pushesBeforeBlur = historyCalls.length;
  historyLocation.hash = '#/ws/ws%2Fone/home';
  historyContext.handleLocationChange();
  assert.equal(historyMutationPending, true,
    'a route flush may synchronously start the detail mutation receipt');
  assert.equal(historyCalls.length, pushesBeforeBlur + 1);
  assert.deepEqual(historyCalls.at(-1), [
    'push', null, '', '#/ws/ws%2Fone/cat/space-b?view=canvas',
  ], 'history handling must recheck pending state after blur before applying the requested route');
  assert.equal(persistenceCalls, writesBeforePendingHistory);
  assert.equal(renders, rendersBeforePendingHistory);

  const historySource = extractFunction('handleLocationChange');
  assert.ok(historySource.includes('const durableSelection = () =>'),
    'history handling must compare the durable selection boundary');
  assert.match(historySource, /if \(durableChanged\) State\.persist\(\)/,
    'history handling must gate persistence on durable changes only');
}

function testHomePreviewOpenContract() {
  const fixture = homePreviewFixture();
  const navigations = [];
  const prepared = [];
  const focusedOpeners = [];
  const notices = [];
  const stateCalls = { snapshots: 0, persists: 0, immediatePersists: 0 };
  const State = {
    get: () => fixture.state,
    snapshot() { stateCalls.snapshots += 1; },
    persist() { stateCalls.persists += 1; },
    persistNow() { stateCalls.immediatePersists += 1; return Promise.resolve(); },
  };
  const context = loadFunctions([
    'collectWorkspaceItems',
    'resolveUniqueHomePreviewItem',
    'homePreviewFocusKey',
    'homePreviewRoute',
    'openHomePreviewItem',
  ], {
    State,
    LAYOUTS: { board: {}, list: {}, canvas: {} },
    focusDialogOpener: opener => { focusedOpeners.push(opener); return !!opener; },
    prepareItemDetailOpen: (...args) => prepared.push(args),
    Router: { navigate: (route, options) => navigations.push({ route: plain(route), options: plain(options) }) },
    toast: (message, options) => notices.push({ message, options: plain(options) }),
    tr: key => `localized:${key}`,
  });
  const stateBefore = JSON.stringify(fixture.state);
  const opener = { id: 'home-row-opener' };
  const returnFocusKey = context.homePreviewFocusKey(
    fixture.workspace.id, `inbox:${fixture.spaceA.id}`, fixture.exact.id,
  );

  assert.equal(context.openHomePreviewItem(
    fixture.workspace.id, fixture.exact.id, returnFocusKey, opener,
  ), true, 'an exact preview must open');
  assert.deepEqual(prepared.shift(), [fixture.exact.id, returnFocusKey],
    'detail opening must retain the exact rebuilt Home focus key');
  assert.deepEqual(navigations.shift(), {
    route: {
      type: 'home', wsId: fixture.workspace.id,
      query: { item: fixture.exact.id },
    },
    options: { persist: false },
  }, 'Home recovery navigation must never persist incidental active-route state');
  assert.equal(focusedOpeners.at(-1), opener,
    'the native row must become the remembered dialog opener before navigation rebuilds Home');

  const nestedKey = context.homePreviewFocusKey(fixture.workspace.id, 'space:space-a', fixture.nested.id);
  assert.equal(context.openHomePreviewItem(
    fixture.workspace.id, fixture.nested.id, nestedKey, opener,
  ), true, 'a nested preview must open');
  assert.equal(navigations.at(-1).route.query.item, fixture.nested.id);

  const movedKey = context.homePreviewFocusKey(fixture.workspace.id, 'space:space-a', fixture.moved.id);
  assert.equal(context.openHomePreviewItem(
    fixture.workspace.id, fixture.moved.id, movedKey, opener,
  ), true, 'a stale Home row may recover an item that moved within the workspace');
  assert.deepEqual(navigations.at(-1), {
    route: {
      type: 'home', wsId: fixture.workspace.id,
      query: { item: fixture.moved.id },
    },
    options: { persist: false },
  });

  const successfulNavigationCount = navigations.length;
  const successfulPrepareCount = prepared.length;
  for (const [itemId, label] of [
    ['missing', 'missing'],
    [fixture.duplicateA.id, 'duplicate'],
    [fixture.crossWorkspaceDuplicateA.id, 'cross-workspace duplicate'],
    [fixture.duplicateSpaceOwner.id, 'duplicate-Space owner'],
    [fixture.outside.id, 'moved-out-of-workspace'],
  ]) {
    const noticesBefore = notices.length;
    const openerFocusesBefore = focusedOpeners.length;
    assert.equal(context.openHomePreviewItem(
      fixture.workspace.id, itemId, context.homePreviewFocusKey(fixture.workspace.id, 'space:space-a', itemId), opener,
    ), false, `${label} preview must fail closed`);
    assert.equal(navigations.length, successfulNavigationCount, `${label} preview must not navigate`);
    assert.equal(prepared.length, successfulPrepareCount, `${label} preview must not prepare a detail sheet`);
    assert.equal(notices.length, noticesBefore + 1, `${label} preview must expose one failure notice`);
    assert.equal(notices.at(-1).message, 'localized:home.previewUnavailable');
    assert.equal(notices.at(-1).options.danger, true);
    assert.equal(focusedOpeners.length, openerFocusesBefore + 1,
      `${label} failure must focus its opener once before resolving stale state`);
  }

  assert.deepEqual(stateCalls, { snapshots: 0, persists: 0, immediatePersists: 0 },
    'opening or rejecting a Home preview must not create history or write state');
  assert.equal(JSON.stringify(fixture.state), stateBefore,
    'Home preview recovery must leave the real state graph unchanged');
  const openSource = extractFunction('openHomePreviewItem');
  for (const forbidden of ['State.snapshot(', 'State.persist(', 'State.persistNow(']) {
    assert.ok(!openSource.includes(forbidden), `Home preview opening must not call ${forbidden}`);
  }
  assert.match(openSource, /Router\.navigate\(route,\s*\{\s*persist:\s*false\s*\}\)/,
    'the production route call must state the no-persist boundary explicitly');
}

function testHomePreviewRowAndReturnFocus() {
  const created = [];
  const opened = [];
  const document = {
    createElement(tagName) {
      const element = {
        tagName: String(tagName).toUpperCase(),
        dataset: {},
        attributes: {},
        listeners: {},
        innerHTML: '',
        setAttribute(name, value) { this.attributes[name] = String(value); },
        addEventListener(name, listener) { this.listeners[name] = listener; },
      };
      created.push(element);
      return element;
    },
  };
  const rowContext = loadFunctions(['homePreviewFocusKey', 'homePreviewTypeKey', 'buildHomePreviewRow'], {
    document,
    _searchItemTitle: item => item.title || '',
    favUrl: url => `favicon:${url}`,
    BLANK_FAV: 'blank-favicon',
    esc: value => String(value),
    tr: (key, vars = {}) => `${key}|${vars.type || ''}|${vars.title || ''}`,
    openHomePreviewItem: (...args) => opened.push(args),
    URL,
  });
  const item = { id: 'item/row', type: 'tab', title: 'Saved row', url: 'https://row.test/path' };
  const row = rowContext.buildHomePreviewRow(item, { workspaceId: 'ws/one', origin: 'inbox:space-a' });
  const expectedKey = rowContext.homePreviewFocusKey('ws/one', 'inbox:space-a', item.id);

  assert.equal(row.tagName, 'BUTTON', 'a Home preview must use native button semantics');
  assert.equal(row.type, 'button', 'the native row must never submit an enclosing form');
  assert.equal(row.className, 'home-prow');
  assert.equal(row.dataset.itemId, item.id);
  assert.equal(row.dataset.homePreviewKey, expectedKey,
    'the rendered row must expose the deterministic key used after Home rebuilds');
  assert.equal(row.attributes['aria-label'], 'home.previewOpen|home.previewType.tab|||Saved row',
    'the native row must have a localized action-and-item accessible name');
  assert.equal(typeof row.listeners.click, 'function', 'the native row must activate through its click behavior');
  row.listeners.click({ currentTarget: row });
  assert.deepEqual(opened.shift(), ['ws/one', item.id, expectedKey, row]);
  assert.ok(!extractFunction('buildHomePreviewRow').includes("addEventListener('keydown'"),
    'native Enter and Space behavior must not be duplicated with a custom key handler');

  const prepareRoot = { classList: { contains: () => false }, dataset: {} };
  let openerCaptures = 0;
  const prepareContext = loadFunctions(['prepareItemDetailOpen'], {
    ensureItemDetailRoot: () => prepareRoot,
    rememberOpener: () => { openerCaptures += 1; },
  });
  prepareContext.prepareItemDetailOpen(item.id, expectedKey, 'title');
  assert.equal(prepareRoot.dataset.returnItemId, item.id);
  assert.equal(prepareRoot.dataset.returnFocusKey, expectedKey,
    'detail preparation must retain the exact Home-row key across routed rebuilds');
  assert.equal(prepareRoot.dataset.initialFocusKey, 'title',
    'detail preparation must retain a requested first-open field across routed rebuilds');
  assert.equal(openerCaptures, 1);
  prepareContext.prepareItemDetailOpen('another-item');
  assert.equal(prepareRoot.dataset.returnFocusKey, undefined,
    'a non-Home detail open must clear a stale Home return key');
  assert.equal(prepareRoot.dataset.initialFocusKey, undefined,
    'an ordinary detail open must clear a stale initial-field request');

  const homeTarget = { id: 'rebuilt-home-row' };
  const genericItemTarget = { id: 'generic-item-fallback' };
  const boardHeading = { id: 'board-heading' };
  const queryCalls = [];
  const focusCalls = [];
  const focusContext = loadFunctions(['restoreItemDetailFocus'], {
    CSS: { escape: value => String(value) },
    restoreOpener: () => false,
    focusItemDetailTarget: (target, scroll = false) => {
      focusCalls.push({ target, scroll });
      return !!target;
    },
    document: {
      querySelector(selector) {
        queryCalls.push(selector);
        if (selector === `.home-prow[data-home-preview-key="${expectedKey}"]`) return homeTarget;
        if (selector === `.home-prow[data-item-id="${item.id}"]`) return genericItemTarget;
        if (selector.startsWith('.library-row')) return genericItemTarget;
        return null;
      },
      getElementById: id => id === 'board' ? { querySelector: () => boardHeading } : null,
    },
  });
  focusContext.restoreItemDetailFocus({}, item.id, expectedKey);
  assert.equal(queryCalls[0], `.home-prow[data-home-preview-key="${expectedKey}"]`,
    'the exact rebuilt Home origin must be the first fallback queried');
  assert.deepEqual(focusCalls.at(-1), { target: homeTarget, scroll: true },
    'closing through Back must return focus to the exact rebuilt Home row');

  const movedQueryStart = queryCalls.length;
  focusContext.restoreItemDetailFocus({}, item.id, 'origin-that-no-longer-exists');
  const movedQueries = queryCalls.slice(movedQueryStart);
  assert.equal(movedQueries[1], `.home-prow[data-item-id="${item.id}"]`,
    'a moved item must fall back to its rebuilt native Home row by item id');
  assert.ok(!movedQueries[1].includes('tabindex'),
    'the generic Home-row fallback must not require the native button to carry tabindex');
  assert.deepEqual(focusCalls.at(-1), { target: genericItemTarget, scroll: true });

  const restoreSource = extractFunction('restoreItemDetailFocus');
  assert.ok(restoreSource.indexOf('`.home-prow[data-item-id="${escaped}"]`')
    < restoreSource.indexOf('`[data-item-id="${escaped}"][tabindex]`'),
  'the native Home row must precede legacy tabindex-only item fallbacks');

  const renderSource = extractFunction('renderItemDetail');
  assert.ok(renderSource.includes("const returnFocusKey = root?.dataset.returnFocusKey || ''"),
    'detail teardown must capture the return key before clearing its root');
  assert.ok(renderSource.includes('delete root.dataset.returnFocusKey'),
    'the return key must not leak into a later detail session');
  assert.ok(renderSource.includes('restoreItemDetailFocus(root, returnItemId, returnFocusKey)'),
    'detail teardown must pass the captured Home key into focus restoration');
  assert.ok(renderSource.includes("const initialFocusKey = root?.dataset.initialFocusKey || ''"),
    'detail rendering must capture the requested first-open field before rebuilding');
  assert.ok(renderSource.includes('delete root.dataset.initialFocusKey'),
    'the first-open field request must not leak into a later detail session');
  assert.match(
    renderSource,
    /if \(!sameItem\) \{[\s\S]*?if \(initialFocusKey\) \{[\s\S]*?root\.querySelector\(`\[data-idp-focus="\$\{escapedInitialKey\}"\]`\)[\s\S]*?focusItemDetailTarget\(panel\)/,
    'a newly opened detail pane must focus its requested field before falling back to the panel',
  );
  assert.match(renderSource, /activeHome\s*\?\s*\{\s*wsId:\s*ws\?\.id\s*\}/,
    'Home detail rendering must validate against the active workspace without selecting a Space');
  assert.ok(renderSource.includes('const homeTarget = activeHome ? resolveUniqueHomePreviewItem(ws?.id, id) : null'),
    'every Home detail rerender must retain the globally unique item and owning-Space boundary');
  assert.ok(renderSource.includes('const exactRecoveryTarget = homeTarget || searchTarget'),
    'Home and Search detail rendering must retain one exact recovery record');
  assert.ok(renderSource.includes('const info = activeHome || activeSearch ? exactRecoveryTarget'),
    'Home detail rendering must use the exact uniquely resolved record rather than a first-match lookup');

  const inboxSource = extractFunction('buildHomeInboxZone');
  assert.ok(inboxSource.includes('origin: `inbox:${cat?.id || \'\'}`'),
    'the Inbox preview must use a stable origin distinct from its Space card');
  const homeSource = extractFunction('renderHome');
  assert.ok(homeSource.includes('origin: `space:${cat.id}`'),
    'each Space-register preview must use its own stable origin');
}

function detailImplementationSource() {
  const start = source.indexOf('function ensureItemDetailRoot()');
  const end = source.indexOf('\nconst FLOATING_TOOLS', start);
  assert.ok(start >= 0 && end > start, 'item detail implementation must remain a bounded source section');
  return source.slice(start, end);
}

function testModalAndHierarchyContracts() {
  const detail = detailImplementationSource();
  const renderStart = detail.indexOf('function renderItemDetail()');
  assert.ok(renderStart >= 0, 'renderItemDetail must remain in the item detail implementation');
  const render = detail.slice(renderStart);

  const panelTag = render.match(/<aside\s+class="idp-panel"[^>]*>/)?.[0] || '';
  for (const token of [
    'role="dialog"',
    'aria-modal="true"',
    'aria-labelledby="idp-heading"',
    'aria-describedby="idp-location"',
    'tabindex="-1"',
  ]) assert.ok(panelTag.includes(token), `detail dialog must include ${token}`);
  assert.match(render, /<div class="idp-docket-line">/,
    'detail identity must read as one filing docket line');
  assert.match(render, /<h2\s+class="idp-heading sr-only"\s+id="idp-heading">/,
    'the primary record field must not repeat a second visible title while the dialog keeps its accessible heading');
  assert.match(render, /<p\s+class="idp-location"\s+id="idp-location">/);
  assert.match(render, /const locationLabel = \[info\.ws\?\.name \|\| ws\?\.name, info\.cat\?\.name, info\.group\?\.name\][\s\S]*?\.join\(' › '\)/,
    'the docket must expose the complete wrapping Workspace to Group filing path');
  assert.match(render, /aria-label="\$\{esc\(tr\('detail\.close'\)\)\}"/);
  assert.match(render, /root\.onkeydown\s*=\s*event\s*=>\s*handleItemDetailKeydown\(event, root\)/);
  assert.ok(extractFunction('ensureItemDetailRoot').includes(
    "root.addEventListener('click', handleItemDetailPendingClick, true)"
  ), 'the executable pending click guard must be installed in capture phase on the detail root');
  assert.ok(extractFunction('ensureItemDetailRoot').includes(
    "root.addEventListener('keydown', handleItemDetailPendingKeydownCapture, true)"
  ), 'the pending key guard must run before target-level detail field handlers');

  const statusIndex = render.indexOf('data-idp-save-status');
  const statusHeaderStart = render.lastIndexOf('<header class="idp-hd">', statusIndex);
  const statusHeaderEnd = render.indexOf('</header>', statusIndex);
  const bodyIndex = render.indexOf('<div class="idp-body"></div>', statusIndex);
  assert.ok(statusHeaderStart >= 0 && statusIndex > statusHeaderStart && statusHeaderEnd > statusIndex,
    'the live save status must remain inside the detail header');
  assert.ok(bodyIndex > statusHeaderEnd,
    'the live save status must remain structurally outside the busy detail body');
  assert.match(extractFunction('setItemDetailMutationBusy'),
    /const busyRegion = root\.querySelector\('\.idp-body'\);[\s\S]*?busyRegion\.setAttribute\('aria-busy', String\(busy\)\)/,
    'aria-busy must stay scoped to the body below the live save status');

  const staleStart = render.indexOf('if (!info)');
  const staleEnd = render.indexOf('\n    return;', staleStart);
  const staleBranch = render.slice(staleStart, staleEnd);
  assert.ok(staleBranch.includes("root.classList.remove('open')"), 'stale detail state must close the sheet');
  assert.ok(staleBranch.includes('setItemDetailBackgroundInert(false)'), 'closing/stale detail must release the background');
  assert.ok(render.includes('setItemDetailBackgroundInert(true)'), 'opening detail must inert the background');
  assert.match(render, /root\.querySelector\('\.idp-scrim'\)\.onclick\s*=\s*closeItemDetail/);
  assert.match(
    render,
    /const canOpenDetailTab = it\.type === ['"]tab['"] && isOpenableSavedTabUrl\(it\.url\);/,
    'detail must apply the same saved-URL safety gate as the board card',
  );
  assert.match(
    render,
    /\$\{canOpenDetailTab \? `<button class="idp-open idp-btn primary"/,
    'detail must omit its Open control when the stored address is unavailable',
  );
  assert.match(
    render,
    /if \(openButton\) openButton\.onclick = \(\) => openSavedTabItem\(it,\s*\{\s*focus:\s*true,\s*opener:\s*openButton\s*\}\);/,
    'detail Open must use the shared guarded saved-tab activation path',
  );
  assert.doesNotMatch(
    render,
    /openButton\) openButton\.onclick = \(\) => openTabMaybeHibernated\(/,
    'detail Open must not bypass the shared saved-URL guard',
  );

  const order = [
    'primarySection.appendChild(detailPrimaryEditor(it, commit))',
    'body.appendChild(nsec)',
    'body.appendChild(rem)',
    'body.appendChild(tsec)',
    "advanced.className = 'idp-advanced'",
    'body.appendChild(advanced)',
  ].map(contract => {
    const index = render.indexOf(contract);
    assert.ok(index >= 0, `missing hierarchy contract: ${contract}`);
    return index;
  });
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'primary context must precede reminder/tags and advanced metadata');
  assert.match(render, /const primarySection = section\(null, body, 'idp-primary-sec'\)/,
    'the visible title editor must own one record field rather than repeat the dialog heading');
  for (const contract of [
    /const nsec = section\(tr\('detail\.whySaved'\), null, 'idp-context-sec'\)/,
    /const rem = section\(tr\('detail\.reminder'\), null, 'idp-context-sec'\)/,
    /const tsec = section\(tr\('detail\.tags'\), null, 'idp-context-sec'\)/,
  ]) assert.match(render, contract, `core recovery context must use the filing-row hierarchy: ${contract}`);

  const advancedOrder = [
    'advancedBody.appendChild(cov)',
    'advancedBody.appendChild(csec)',
    'advancedBody.appendChild(fsec)',
  ].map(contract => {
    const index = render.indexOf(contract);
    assert.ok(index >= 0, `missing advanced hierarchy contract: ${contract}`);
    return index;
  });
  assert.deepEqual(advancedOrder, [...advancedOrder].sort((a, b) => a - b));
  assert.match(render, /hasAdvancedData\s*=\s*!!it\.cover\s*\|\|\s*!!it\.checklist\?\.length\s*\|\|\s*!!it\.customFields\?\.length/);
}

function testBackgroundInertContract() {
  const app = { inert: false, dataset: {} };
  const alreadyInertLanding = { inert: true, dataset: {} };
  const detailRoot = { inert: false, dataset: {} };
  const overlay = () => ({
    inert: false,
    dataset: {},
    hidden: true,
    classList: { contains(name) { return name === 'hidden' && this.owner.hidden; }, owner: null },
  });
  const reminderOverlay = overlay();
  const recoveryOverlay = overlay();
  reminderOverlay.classList.owner = reminderOverlay;
  recoveryOverlay.classList.owner = recoveryOverlay;
  const elements = { app, 'landing-layer': alreadyInertLanding, 'item-detail': detailRoot, 'reminder-overlay': reminderOverlay, 'state-recovery-overlay': recoveryOverlay };
  const bodyChildren = [app, alreadyInertLanding, detailRoot, reminderOverlay, recoveryOverlay];
  const context = loadFunctions(['setElementInertOwner', 'inheritActiveBodyInterlocks', 'setStateRecoveryInterlock', 'setReminderInterlock', 'setItemDetailBackgroundInert'], {
    document: {
      getElementById: id => elements[id] || null,
      body: { children: bodyChildren },
    },
  });

  context.setItemDetailBackgroundInert(true);
  assert.equal(app.inert, true);
  assert.equal(app.dataset.locusInertOwners, 'detail', 'detail must mark inertness it owns');
  assert.equal(alreadyInertLanding.inert, true);
  assert.equal(alreadyInertLanding.dataset.locusInertBase, '1', 'detail must remember pre-existing inertness');

  reminderOverlay.hidden = false;
  context.setReminderInterlock(true);
  assert.equal(app.dataset.locusInertOwners, 'detail reminder');
  assert.equal(recoveryOverlay.inert, false,
    'a reminder must never make the higher fail-closed recovery dialog inert');
  assert.equal(recoveryOverlay.dataset.locusInertOwners, undefined,
    'recovery must never inherit reminder ownership');
  recoveryOverlay.hidden = false;
  context.setStateRecoveryInterlock(true);
  assert.equal(app.dataset.locusInertOwners, 'detail reminder recovery');
  assert.equal(recoveryOverlay.inert, false,
    'opening recovery above a reminder must preserve a focusable alert dialog');

  const lateMountedSurface = { inert: false, dataset: {} };
  bodyChildren.push(lateMountedSurface);
  context.inheritActiveBodyInterlocks(lateMountedSurface);
  assert.equal(lateMountedSurface.inert, true, 'a late body surface must inherit active dialog interlocks');
  assert.equal(lateMountedSurface.dataset.locusInertOwners, 'recovery reminder');
  context.inheritActiveBodyInterlocks(recoveryOverlay);
  assert.equal(recoveryOverlay.inert, false,
    're-rendering recovery while a reminder is open must not inherit the reminder interlock');

  context.setItemDetailBackgroundInert(false);
  assert.equal(app.inert, true, 'closing detail must not release the recovery interlock');
  assert.equal(app.dataset.locusInertOwners, 'reminder recovery');
  context.setReminderInterlock(false);
  assert.equal(app.inert, true, 'closing a nested reminder must retain recovery ownership');
  assert.equal(app.dataset.locusInertOwners, 'recovery');
  context.setStateRecoveryInterlock(false);

  assert.equal(app.inert, false);
  assert.equal(app.dataset.locusInertOwners, undefined);
  assert.equal(lateMountedSurface.inert, false, 'closing both overlays must release the late surface');
  assert.equal(alreadyInertLanding.inert, true, 'closing detail must preserve another layer\'s inertness');
}

function testTabTrapFromContainerFocus() {
  const document = { activeElement: null };
  const focusable = name => ({ name, focus() { document.activeElement = this; } });
  const first = focusable('first');
  const last = focusable('last');
  const container = {
    _items: [first, last],
    classList: { contains: () => false },
    contains: element => element === first || element === last,
  };
  const context = loadFunctions(['trapTabKey'], {
    document,
    visibleFocusableElements: target => target._items,
  });

  document.activeElement = container;
  const forward = eventFor('Tab', container);
  context.trapTabKey(forward, container);
  assert.equal(forward.defaultPrevented, true);
  assert.equal(document.activeElement, first, 'Tab from the focused dialog container must enter its first control');

  document.activeElement = container;
  const backward = eventFor('Tab', container, true);
  context.trapTabKey(backward, container);
  assert.equal(backward.defaultPrevented, true);
  assert.equal(document.activeElement, last, 'Shift+Tab from the focused dialog container must wrap to its last control');
}

function testEscapeStack() {
  const recovery = { hidden: true, classList: { contains(name) { return name === 'hidden' && recovery.hidden; } } };
  const reminder = { hidden: true, classList: { contains(name) { return name === 'hidden' && reminder.hidden; } } };
  const panel = { id: 'panel' };
  const root = { querySelector: selector => selector === '.idp-panel' ? panel : null };
  let detailCloses = 0;
  let reminderCloses = 0;
  let trappedPanel = null;
  let focused = null;
  let detailMutationPending = false;
  const context = loadFunctions(['isItemDetailEditor', 'handleItemDetailKeydown'], {
    Node: { ELEMENT_NODE: 1 },
    document: {
      getElementById(id) {
        if (id === 'state-recovery-overlay') return recovery;
        if (id === 'reminder-overlay') return reminder;
        return null;
      },
    },
    trapTabKey: (event, target) => { trappedPanel = target; },
    closeReminderPicker: () => { reminderCloses += 1; },
    closeItemDetail: () => { detailCloses += 1; },
    focusItemDetailTarget: target => { focused = target; return true; },
    isItemDetailMutationPending: () => detailMutationPending,
  });

  const panelTarget = { nodeType: 1, tagName: 'ASIDE', closest: () => null };
  context.handleItemDetailKeydown(eventFor('Tab', panelTarget), root);
  assert.equal(trappedPanel, panel, 'detail Tab handling must delegate to the panel focus trap');

  recovery.hidden = false;
  reminder.hidden = false;
  const recoveryEscape = eventFor('Escape', panelTarget);
  context.handleItemDetailKeydown(recoveryEscape, root);
  assert.equal(reminderCloses, 0, 'recovery must stay above reminder and detail in the Escape stack');
  assert.equal(detailCloses, 0);
  assert.equal(recoveryEscape.defaultPrevented, false, 'the recovery layer owns its Escape event');

  recovery.hidden = true;
  const reminderEscape = eventFor('Escape', panelTarget);
  context.handleItemDetailKeydown(reminderEscape, root);
  assert.equal(reminderCloses, 1, 'Escape must close a nested reminder before detail');
  assert.equal(detailCloses, 0);
  assert.equal(reminderEscape.defaultPrevented, true);
  assert.equal(reminderEscape.propagationStopped, true);

  reminder.hidden = true;
  let blurs = 0;
  const input = {
    nodeType: 1,
    tagName: 'INPUT',
    closest: () => null,
    blur() { blurs += 1; },
  };
  const editorEscape = eventFor('Escape', input);
  context.handleItemDetailKeydown(editorEscape, root);
  assert.equal(blurs, 1, 'first Escape in an editor must commit/blur instead of closing detail');
  assert.equal(focused, panel, 'first editor Escape must move focus to the dialog container');
  assert.equal(detailCloses, 0);

  detailMutationPending = true;
  const pendingEscape = eventFor('Escape', panelTarget);
  context.handleItemDetailKeydown(pendingEscape, root);
  assert.equal(detailCloses, 0, 'Escape must not close detail while its receipt is pending');
  assert.equal(pendingEscape.defaultPrevented, true);
  assert.equal(pendingEscape.propagationStopped, true);
  detailMutationPending = false;

  const secondEscape = eventFor('Escape', panelTarget);
  context.handleItemDetailKeydown(secondEscape, root);
  assert.equal(detailCloses, 1, 'second Escape from the dialog container must close detail');

  const directEscape = eventFor('Escape', panelTarget);
  context.handleItemDetailKeydown(directEscape, root);
  assert.equal(detailCloses, 2, 'Escape outside an editor must close detail directly');
}

function testEditFlushContracts() {
  let blurs = 0;
  let immediateWrites = 0;
  let immediateWriteOptions = null;
  let needsPersistence = true;
  const input = {
    nodeType: 1,
    tagName: 'INPUT',
    closest: () => null,
    blur() { blurs += 1; },
  };
  const root = {
    classList: { contains: name => name === 'open' },
    contains: target => target === input,
  };
  const context = loadFunctions(['isItemDetailEditor', 'flushActiveItemDetailEditor', 'flushItemDetailBeforePageHide'], {
    Node: { ELEMENT_NODE: 1 },
    State: {
      needsPersistence: () => needsPersistence,
      persistNow(options) {
        immediateWrites += 1;
        immediateWriteOptions = options;
        return Promise.resolve();
      },
    },
    document: {
      activeElement: input,
      getElementById: id => id === 'item-detail' ? root : null,
    },
    isItemDetailMutationPending: () => false,
  });
  assert.equal(context.flushActiveItemDetailEditor(), true);
  assert.equal(blurs, 1, 'history/reload flush must blur the active detail editor');
  assert.equal(context.flushItemDetailBeforePageHide(), true);
  assert.equal(blurs, 2, 'page teardown must synchronously commit the active editor');
  assert.equal(immediateWrites, 1, 'page teardown must replace the edit debounce with an immediate write attempt');
  assert.deepEqual(plain(immediateWriteOptions), { recordMutation: false });

  context.document.activeElement = { nodeType: 1, tagName: 'BODY', closest: () => null };
  assert.equal(context.flushItemDetailBeforePageHide(), true,
    'page teardown must also persist an edit that blurred just before teardown');
  assert.equal(blurs, 2, 'an already-blurred editor must not be blurred again');
  assert.equal(immediateWrites, 2, 'a pending blurred edit must not be left to the expiring debounce');

  needsPersistence = false;
  assert.equal(context.flushItemDetailBeforePageHide(), false, 'clean page teardown must not manufacture a write');
  assert.equal(immediateWrites, 2);

  const handleLocation = extractFunction('handleLocationChange');
  assert.ok(handleLocation.indexOf('flushActiveItemDetailEditor()') < handleLocation.indexOf('apply(route)'),
    'Back/Forward must flush an active edit before applying the next route');
  assert.ok(handleLocation.includes("history.replaceState(null, '', '#' + canonical)"),
    'a stale or moved item route must be replaced by its canonical closed route');
  const routerStart = source.indexOf('const Router = (() => {');
  const routerEnd = source.indexOf('\n})();', routerStart);
  const router = source.slice(routerStart, routerEnd);
  const navigateStart = router.indexOf('navigate(route');
  const navigateEnd = router.indexOf('return true;', navigateStart);
  const navigateSource = router.slice(navigateStart, navigateEnd);
  const detailFlush = navigateSource.indexOf('flushActiveItemDetailEditor()');
  const historyWrite = Math.min(
    ...['history.replaceState', 'history.pushState']
      .map(token => navigateSource.indexOf(token))
      .filter(index => index >= 0),
  );
  assert.ok(detailFlush >= 0 && historyWrite > detailFlush,
    'programmatic route changes must flush detail edits before replacing the sheet');
  for (const pendingGuard of [
    'isArchivedPageRestorePending()',
    'isSavedPageArchivePending()',
    'isSelectedItemMutationPending()',
    'isSavedTabReturnMutationPending()',
    'isBoardTodoCompletionPending()',
    'isItemDetailMutationPending()',
    'isReminderMutationPending()',
    'isCalendarTaskMutationPending()',
    'isPasteImportPending()',
  ]) {
    assert.ok(
      navigateSource.indexOf(pendingGuard) >= 0
        && navigateSource.indexOf(pendingGuard) < detailFlush
        && navigateSource.lastIndexOf(pendingGuard) > detailFlush,
      `programmatic navigation must check ${pendingGuard} before and after editor flush`,
    );
  }
  assert.ok(handleLocation.indexOf('flushActiveItemDetailEditor()')
      < handleLocation.lastIndexOf('isItemDetailMutationPending()'),
    'Back/Forward must recheck the detail receipt after its blur flush');
  assert.ok(handleLocation.indexOf('flushActiveItemDetailEditor()')
      < handleLocation.lastIndexOf('isReminderMutationPending()'),
    'Back/Forward must recheck the Group/Space reminder receipt after its blur flush');
  assert.ok(router.includes("window.addEventListener('pagehide', flushItemDetailBeforePageHide)"),
    'page teardown must request the immediate edit-flush path');
  assert.ok(extractFunction('flushItemDetailBeforePageHide').includes('State.persistNow({ recordMutation: false })'),
    'the pagehide path must initiate persistence before the page is destroyed');
  assert.ok(extractFunction('flushItemDetailBeforePageHide').includes('State.needsPersistence()'),
    'the pagehide path must cover already-blurred edits without writing clean state');
}

function createItemDetailMutationHarness({ recoveryRequired = false, nested = false } = {}) {
  let recoveryActive = recoveryRequired;
  const item = { id: 'item-1', type: 'tab', title: 'Original title', url: 'https://example.test/' };
  const stack = { id: 'stack-1', type: 'stack', name: 'Saved reading', items: [item] };
  const group = { id: 'group-1', name: 'Inbox', items: [nested ? stack : item] };
  const otherGroup = { id: 'group-2', name: 'Later', items: [] };
  const space = { id: 'space-1', name: 'Space one', layout: 'board', groups: [group, otherGroup] };
  const workspace = { id: 'workspace-1', name: 'Workspace one', activeCatId: space.id, categories: [space] };
  const state = {
    _revision: 4,
    activeWsId: workspace.id,
    settings: { viewMode: 'board' },
    workspaces: [workspace],
  };

  const makeAttributedElement = () => {
    const attributes = new Map();
    return {
      attributes,
      dataset: {},
      readOnly: false,
      hasAttribute: name => attributes.has(name),
      getAttribute: name => attributes.get(name) ?? null,
      setAttribute(name, value) { attributes.set(name, String(value)); },
      removeAttribute(name) { attributes.delete(name); },
    };
  };
  const panel = makeAttributedElement();
  const busyRegion = makeAttributedElement();
  const control = makeAttributedElement();
  const status = { textContent: '', dataset: {} };
  const classes = new Set(['open']);
  const root = {
    dataset: { itemId: item.id },
    classList: {
      contains: name => classes.has(name),
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
    },
    querySelector(selector) {
      if (selector === '.idp-panel') return panel;
      if (selector === '.idp-body') return busyRegion;
      if (selector === '[data-idp-save-status]') return status;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-idp-busy-control="true"]') {
        return control.dataset.idpBusyControl === 'true' ? [control] : [];
      }
      return [control];
    },
  };

  const receipt = deferred();
  const calls = {
    snapshots: [],
    writes: [],
    renderBoard: 0,
    renderDetail: 0,
    syncHeading: 0,
    tabTraps: [],
    recovery: [],
    errors: [],
  };
  const timers = new Map();
  let nextTimerId = 1;
  let flushCalls = 0;
  let flushHandler = () => false;
  const State = {
    get: () => state,
    snapshot(label) {
      calls.snapshots.push(label);
      return 91;
    },
    persistNow(options) {
      calls.writes.push(options);
      return receipt.promise;
    },
    needsPersistence: () => true,
    isRecoveryRequired: () => recoveryActive,
  };
  const context = loadItemDetailMutationFunctions({
    State,
    activeWs: () => workspace,
    activeCat: () => space,
    currentDetailItemId: () => item.id,
    activeGroupPage: null,
    activeLibraryMode: null,
    activeHome: false,
    document: { getElementById: id => id === 'item-detail' ? root : null },
    tr: key => key,
    renderBoard: () => { calls.renderBoard += 1; },
    renderItemDetail: () => { calls.renderDetail += 1; },
    syncItemDetailHeading: () => { calls.syncHeading += 1; },
    trapTabKey: (event, target) => { calls.tabTraps.push({ event, target }); },
    showStateRecoveryRequired: error => { calls.recovery.push(error); },
    flushActiveItemDetailEditor: () => {
      flushCalls += 1;
      return flushHandler();
    },
    setTimeout(fn, delay) {
      const id = nextTimerId++;
      timers.set(id, { fn, delay });
      return id;
    },
    clearTimeout: id => { timers.delete(id); },
    console: { error: (...args) => { calls.errors.push(args); } },
  });
  const mutationContext = context.createItemDetailMutationContext({
    ws: workspace,
    cat: space,
    group,
    item,
  });
  assert.ok(mutationContext, 'the executable harness must create a real production mutation context');
  assert.ok(context.resolveItemDetailMutationTarget(mutationContext),
    'an unchanged harness target must pass production exhaustive re-resolution');
  return {
    context,
    mutationContext,
    receipt,
    calls,
    timers,
    root,
    panel,
    busyRegion,
    control,
    status,
    state,
    workspace,
    space,
    group,
    otherGroup,
    stack,
    item,
    setRecoveryRequired(value) { recoveryActive = !!value; },
    setFlushHandler(handler) { flushHandler = handler; },
    flushCallCount: () => flushCalls,
  };
}

function testItemDetailCandidateApplicationContract() {
  const context = loadFunctions([
    'itemDetailValueFingerprint',
    'cloneItemDetailJson',
    'isItemDetailRecord',
    'applyItemDetailCandidate',
  ]);
  const target = {
    id: 'imported-item',
    type: 'tab',
    title: 'Imported title',
    cover: { color: '#ef4444' },
    tags: ['research'],
    checklist: [
      { id: 'check-1', text: 'Read', done: false, importedMeta: { source: 'legacy-a' } },
      { id: 'check-2', text: 'Recover', done: false, importedMeta: { source: 'legacy-b' } },
    ],
    customFields: [
      { id: 'field-1', label: 'Status', value: 'Draft', importedMeta: { source: 'legacy-field' } },
      { id: 'field-2', label: 'Owner', value: 'I-Kai' },
    ],
    importedExtension: {
      schema: 'legacy.locus.example/v1',
      payload: { pinned: true, scores: [1, 3, 5] },
    },
  };

  const checklistRef = target.checklist;
  const firstChecklistRowRef = target.checklist[0];
  const secondChecklistRowRef = target.checklist[1];
  const firstChecklistMetaRef = target.checklist[0].importedMeta;
  const customFieldsRef = target.customFields;
  const firstCustomFieldRef = target.customFields[0];
  const secondCustomFieldRef = target.customFields[1];
  const importedExtensionRef = target.importedExtension;
  const importedExtensionJson = JSON.stringify(target.importedExtension);

  const beforeNested = plain(target);
  const candidateNested = plain(beforeNested);
  candidateNested.checklist[0].done = true;
  candidateNested.customFields[0].value = 'Ready';
  context.applyItemDetailCandidate(target, beforeNested, candidateNested);

  assert.strictEqual(target.checklist, checklistRef,
    'same-length checklist edits must preserve the live array');
  assert.strictEqual(target.checklist[0], firstChecklistRowRef,
    'a changed checklist row must preserve the live row object used by DOM closures');
  assert.strictEqual(target.checklist[1], secondChecklistRowRef,
    'an untouched checklist row must preserve its live object');
  assert.strictEqual(target.checklist[0].importedMeta, firstChecklistMetaRef,
    'unchanged nested metadata must retain its live reference');
  assert.equal(target.checklist[0].done, true);
  assert.strictEqual(target.customFields, customFieldsRef,
    'same-length custom-field edits must preserve the live array');
  assert.strictEqual(target.customFields[0], firstCustomFieldRef,
    'a changed custom-field row must preserve the live row object used by DOM closures');
  assert.strictEqual(target.customFields[1], secondCustomFieldRef,
    'an untouched custom-field row must preserve its live object');
  assert.equal(target.customFields[0].value, 'Ready');
  assert.strictEqual(target.importedExtension, importedExtensionRef,
    'an unrelated imported field must not be replaced by a known-field edit');
  assert.equal(JSON.stringify(target.importedExtension), importedExtensionJson,
    'an unrelated imported field must remain byte-equivalent');

  const coverRef = target.cover;
  const beforeCoverReplace = plain(target);
  const candidateCoverReplace = plain(beforeCoverReplace);
  candidateCoverReplace.cover = { color: '#22c55e', image: 'local-cover-token' };
  context.applyItemDetailCandidate(target, beforeCoverReplace, candidateCoverReplace);
  assert.deepEqual(plain(target.cover), candidateCoverReplace.cover,
    'cover replacement must apply the complete detached candidate value');
  assert.strictEqual(target.cover, coverRef,
    'record-shaped cover replacement may update the existing live slot in place');
  assert.strictEqual(target.importedExtension, importedExtensionRef);

  const beforeCoverDelete = plain(target);
  const candidateCoverDelete = plain(beforeCoverDelete);
  delete candidateCoverDelete.cover;
  context.applyItemDetailCandidate(target, beforeCoverDelete, candidateCoverDelete);
  assert.equal(Object.prototype.hasOwnProperty.call(target, 'cover'), false,
    'cover deletion must remove the live JSON slot');
  assert.strictEqual(target.importedExtension, importedExtensionRef);

  const tagsRef = target.tags;
  const structuralChecklistRef = target.checklist;
  const beforeAdd = plain(target);
  const candidateAdd = plain(beforeAdd);
  candidateAdd.tags.push('activation');
  candidateAdd.checklist.push({ id: 'check-3', text: 'Use', done: false });
  context.applyItemDetailCandidate(target, beforeAdd, candidateAdd);
  assert.strictEqual(target.tags, tagsRef,
    'a structural tag add must preserve the live array slot');
  assert.deepEqual(plain(target.tags), ['research', 'activation']);
  assert.strictEqual(target.checklist, structuralChecklistRef,
    'a structural checklist add must preserve the live array slot');
  assert.deepEqual(plain(target.checklist), candidateAdd.checklist);

  const beforeRemove = plain(target);
  const candidateRemove = plain(beforeRemove);
  candidateRemove.tags.splice(0, 1);
  candidateRemove.checklist.splice(1, 1);
  context.applyItemDetailCandidate(target, beforeRemove, candidateRemove);
  assert.strictEqual(target.tags, tagsRef,
    'a structural tag removal must preserve the live array slot');
  assert.deepEqual(plain(target.tags), ['activation']);
  assert.strictEqual(target.checklist, structuralChecklistRef,
    'a structural checklist removal must preserve the live array slot');
  assert.deepEqual(plain(target.checklist), candidateRemove.checklist);
  assert.strictEqual(target.importedExtension, importedExtensionRef,
    'structural edits must not replace unrelated imported data');
  assert.equal(JSON.stringify(target.importedExtension), importedExtensionJson,
    'structural edits must preserve unrelated imported data exactly');
}

async function testReceiptGatedItemDetailMutationContract() {
  const success = createItemDetailMutationHarness();
  const interactiveTarget = (tagName, classNames = []) => {
    const classes = new Set(classNames);
    const target = {
      tagName: tagName.toUpperCase(),
      classList: { contains: name => classes.has(name) },
      matches(selector) {
        return selector.split(',').some(part => {
          const token = part.trim();
          if (token === tagName.toLowerCase()) return true;
          if (token.startsWith('.') && !token.includes(' ')) return classes.has(token.slice(1));
          return token === '[contenteditable]' && this.contentEditable === 'true';
        });
      },
      closest(selector) { return this.matches(selector) ? this : null; },
    };
    return target;
  };
  const pendingTargets = [
    ['Open', interactiveTarget('button', ['idp-open'])],
    ['Close', interactiveTarget('button', ['idp-close'])],
    ['scrim', interactiveTarget('div', ['idp-scrim'])],
    ['body control', interactiveTarget('input', ['idp-title-input'])],
  ];
  let firstMutations = 0;
  const first = success.context.commitItemDetailMutation(
    success.mutationContext,
    'Edit item title',
    live => {
      firstMutations += 1;
      live.title = 'Receipt-gated title';
    },
  );

  assert.equal(success.context.isItemDetailMutationPending(), true,
    'the pending token must be visible synchronously before the receipt settles');
  assert.equal(firstMutations, 1);
  assert.equal(success.item.title, 'Receipt-gated title',
    'the sole dirty graph may show the unconfirmed edit behind the pending boundary');
  assert.deepEqual(success.calls.snapshots, ['Edit item title']);
  assert.equal(success.calls.writes.length, 1, 'one detail action must start exactly one state write');
  assert.equal(success.calls.renderBoard, 0, 'the product surface must not render before a typed receipt');
  assert.equal(success.calls.renderDetail, 0, 'the detail sheet must not rebuild before a typed receipt');
  assert.equal(success.status.textContent, 'detail.saving');
  assert.equal(success.status.dataset.tone, 'pending');
  assert.equal(success.busyRegion.getAttribute('aria-busy'), 'true');
  assert.equal(success.control.getAttribute('aria-disabled'), 'true');
  assert.equal(success.control.readOnly, true);

  const activations = [];
  for (const [label, target] of pendingTargets) {
    const event = clickEventFor(target);
    success.context.handleItemDetailPendingClick(event);
    if (!event.immediatePropagationStopped) activations.push(label);
    assert.equal(event.defaultPrevented, true, `${label} must not activate while the receipt is pending`);
    assert.equal(event.immediatePropagationStopped, true,
      `${label} must not reach its detail click handler while the receipt is pending`);
  }
  assert.deepEqual(activations, [], 'no pointer action may escape the pending capture guard');

  for (const key of ['Enter', ' ', 'Escape']) {
    const event = eventFor(key, pendingTargets[0][1]);
    success.context.handleItemDetailPendingKeydownCapture(event);
    assert.equal(event.defaultPrevented, true, `${JSON.stringify(key)} must be blocked while the receipt is pending`);
    assert.equal(event.immediatePropagationStopped, true,
      `${JSON.stringify(key)} must not reach a target-level activation, formatting, or close handler while pending`);
  }
  for (const shiftKey of [false, true]) {
    const event = eventFor('Tab', pendingTargets[0][1], shiftKey);
    success.context.handleItemDetailPendingKeydownCapture(event);
    assert.equal(event.defaultPrevented, false, 'the capture guard must leave Tab for the sheet focus trap');
    success.context.handleItemDetailKeydown(event, success.root);
    assert.equal(success.calls.tabTraps.at(-1)?.target, success.panel,
      `${shiftKey ? 'Shift+Tab' : 'Tab'} must stay delegated to the detail focus trap while pending`);
    assert.equal(success.calls.tabTraps.at(-1)?.event, event);
  }
  assert.equal(success.calls.tabTraps.length, 2,
    'both Tab directions must remain contained while mutation controls are guarded');

  let secondMutations = 0;
  const second = await success.context.commitItemDetailMutation(
    success.mutationContext,
    'Second edit',
    () => { secondMutations += 1; },
  );
  assert.equal(second, false, 'a second detail edit must fail closed while the first owns the receipt');
  assert.equal(secondMutations, 0);
  assert.equal(success.calls.snapshots.length, 1);
  assert.equal(success.calls.writes.length, 1);

  success.receipt.resolve({ ok: true, revision: 5 });
  assert.equal(await first, true);
  assert.equal(success.context.isItemDetailMutationPending(), false);
  assert.equal(success.calls.renderBoard, 1);
  assert.equal(success.calls.renderDetail, 1);
  assert.equal(success.status.textContent, 'detail.saved');
  assert.equal(success.status.dataset.tone, 'success');
  assert.equal(success.busyRegion.getAttribute('aria-busy'), 'false');
  assert.equal(success.control.hasAttribute('aria-disabled'), false);
  assert.equal(success.control.readOnly, false);
  assert.equal([...success.timers.values()].filter(timer => timer.delay === 2400).length, 1,
    'acknowledged feedback must own one bounded clear timer');
  const settledOpen = clickEventFor(pendingTargets[0][1]);
  success.context.handleItemDetailPendingClick(settledOpen);
  assert.equal(settledOpen.defaultPrevented, false,
    'the capture guard must release actions after the typed receipt settles');
  assert.equal(settledOpen.immediatePropagationStopped, false);
  const settledKey = eventFor('Enter', pendingTargets[0][1]);
  success.context.handleItemDetailPendingKeydownCapture(settledKey);
  assert.equal(settledKey.defaultPrevented, false,
    'the capture key guard must release actions after the typed receipt settles');
  assert.equal(settledKey.immediatePropagationStopped, false);

  for (const code of ['LOCUS_STATE_WRITE_FAILED', 'LOCUS_STATE_UNKNOWN_ACK']) {
    const rejected = createItemDetailMutationHarness();
    assert.equal(rejected.context.isItemDetailMutationPending(), false);
    assert.equal(rejected.root.classList.contains('open'), true);
    assert.ok(rejected.context.resolveItemDetailMutationTarget(rejected.mutationContext));
    const pending = rejected.context.commitItemDetailMutation(
      rejected.mutationContext,
      'Edit item title',
      live => { live.title = 'Dirty rejected edit'; },
    );
    assert.equal(rejected.calls.writes.length, 1,
      `${code} must reach the deferred receipt boundary; status: ${rejected.status.textContent || 'none'}; pre-write error: ${rejected.calls.errors[0]?.[1]?.message || 'none'}`);
    assert.equal(rejected.item.title, 'Dirty rejected edit', `${code} must mutate only the local candidate before rejection`);
    rejected.setRecoveryRequired(true);
    const error = Object.assign(new Error(code), { code });
    rejected.receipt.reject(error);
    assert.equal(await pending, false, `${code} must not be reported as an acknowledged edit`);
    assert.equal(rejected.item.title, 'Dirty rejected edit',
      `${code} must retain the only dirty local graph instead of rolling it back`);
    assert.equal(rejected.calls.snapshots.length, 1);
    assert.equal(rejected.calls.writes.length, 1, `${code} must not retry the unknown candidate`);
    assert.equal(rejected.calls.renderBoard, 0, `${code} must not render a false success`);
    assert.equal(rejected.calls.renderDetail, 0, `${code} must not rebuild the lower sheet`);
    assert.equal(rejected.calls.recovery.length, 1, `${code} must hand focus/control to authoritative recovery`);
    assert.equal(rejected.status.textContent, 'detail.saveFailed');
    assert.equal(rejected.status.dataset.tone, 'error');
    assert.equal(rejected.context.isItemDetailMutationPending(), false);
  }

  const recoveryPrecheck = createItemDetailMutationHarness({ recoveryRequired: true });
  let recoveryPrecheckMutations = 0;
  assert.equal(await recoveryPrecheck.context.commitItemDetailMutation(
    recoveryPrecheck.mutationContext,
    'Blocked edit',
    () => { recoveryPrecheckMutations += 1; },
  ), false);
  assert.equal(recoveryPrecheckMutations, 0);
  assert.equal(recoveryPrecheck.calls.snapshots.length, 0,
    'an existing recovery interlock must reject detail edits before history');
  assert.equal(recoveryPrecheck.calls.writes.length, 0,
    'an existing recovery interlock must reject detail edits before persistence');
  assert.equal(recoveryPrecheck.status.textContent, 'detail.saveFailed');

  const throwingMutation = createItemDetailMutationHarness();
  const throwingResult = await throwingMutation.context.commitItemDetailMutation(
    throwingMutation.mutationContext,
    'Broken edit',
    candidate => {
      candidate.title = 'Partial candidate';
      throw new Error('injected field failure');
    },
  );
  assert.equal(throwingResult, false);
  assert.equal(throwingMutation.item.title, 'Original title',
    'a synchronous field failure must leave the live item untouched');
  assert.equal(throwingMutation.calls.snapshots.length, 0,
    'a synchronous field failure must not create phantom Undo history');
  assert.equal(throwingMutation.calls.writes.length, 0,
    'a synchronous field failure must not reach persistence');
  assert.equal(throwingMutation.status.textContent, 'detail.saveFailed');

  const staleCases = [
    ['duplicate id', harness => {
      harness.otherGroup.items.push({ id: harness.item.id, type: 'note', html: 'duplicate' });
    }],
    ['missing target', harness => { harness.group.items.length = 0; }],
    ['moved target', harness => {
      harness.group.items.length = 0;
      harness.otherGroup.items.push(harness.item);
    }],
    ['replaced object', harness => { harness.group.items[0] = { ...harness.item }; }],
    ['changed type', harness => { harness.item.type = 'todo'; }],
    ['changed fingerprint', harness => { harness.item.title = 'Changed elsewhere'; }],
    ['duplicate workspace owner', harness => {
      harness.state.workspaces.push({ id: harness.workspace.id, name: 'Duplicate owner', categories: [] });
    }],
    ['duplicate Space owner', harness => {
      harness.workspace.categories.push({ id: harness.space.id, name: 'Duplicate Space', groups: [] });
    }],
    ['duplicate Group owner', harness => {
      harness.space.groups.push({ id: harness.group.id, name: 'Duplicate Group', items: [] });
    }],
    ['changed stack ancestry', harness => {
      harness.group.items = [{ id: 'stack-new', type: 'stack', name: 'New parent', items: [harness.item] }];
    }],
    ['changed location fingerprint', harness => { harness.group.name = 'Renamed elsewhere'; }],
  ];
  for (const [label, makeStale] of staleCases) {
    const stale = createItemDetailMutationHarness();
    makeStale(stale);
    let mutations = 0;
    const result = await stale.context.commitItemDetailMutation(
      stale.mutationContext,
      'Unsafe edit',
      () => { mutations += 1; },
    );
    assert.equal(result, false, `${label} must fail closed`);
    assert.equal(mutations, 0, `${label} must not run the captured mutator`);
    assert.equal(stale.calls.snapshots.length, 0, `${label} must not pollute Undo history`);
    assert.equal(stale.calls.writes.length, 0, `${label} must not write state`);
    assert.equal(stale.calls.renderBoard, 0, `${label} must not render a success`);
    assert.equal(stale.status.textContent, 'detail.changed');
    assert.equal(stale.status.dataset.tone, 'error');
    assert.equal(stale.context.isItemDetailMutationPending(), false);
  }

  const duplicateAncestor = createItemDetailMutationHarness({ nested: true });
  duplicateAncestor.otherGroup.items.push({
    id: duplicateAncestor.stack.id,
    type: 'stack',
    name: 'Duplicate ancestor',
    items: [],
  });
  let ancestorMutations = 0;
  assert.equal(await duplicateAncestor.context.commitItemDetailMutation(
    duplicateAncestor.mutationContext,
    'Unsafe nested edit',
    () => { ancestorMutations += 1; },
  ), false, 'a duplicated Stack ancestor id must fail closed');
  assert.equal(ancestorMutations, 0);
  assert.equal(duplicateAncestor.calls.snapshots.length, 0);
  assert.equal(duplicateAncestor.calls.writes.length, 0);
}

function createItemDetailReminderHarness({ existingReminder = null, recoveryRequired = false } = {}) {
  const harness = createItemDetailMutationHarness({ recoveryRequired });
  if (existingReminder) {
    harness.item.reminder = plain(existingReminder);
    harness.mutationContext.itemFingerprint = harness.context.itemDetailValueFingerprint(harness.item);
  }

  const makeControl = (id, tagName = 'BUTTON') => {
    const attributes = new Map();
    return {
      id,
      tagName,
      dataset: {},
      disabled: false,
      readOnly: false,
      _insideReminder: true,
      focusCalls: 0,
      hasAttribute: name => attributes.has(name),
      getAttribute: name => attributes.get(name) ?? null,
      setAttribute(name, value) { attributes.set(name, String(value)); },
      removeAttribute(name) { attributes.delete(name); },
      focus() { this.focusCalls += 1; },
    };
  };
  const close = makeControl('rm-x');
  const datetime = makeControl('rm-datetime', 'INPUT');
  const label = makeControl('rm-label', 'INPUT');
  const recur = makeControl('rm-recur', 'SELECT');
  const clear = makeControl('rm-clear');
  const save = makeControl('rm-save');
  const quick = makeControl('rm-quick-1');
  const controls = [close, datetime, label, recur, clear, save, quick];
  const makeAttributedRegion = () => {
    const attributes = new Map();
    return {
      hasAttribute: name => attributes.has(name),
      getAttribute: name => attributes.get(name) ?? null,
      setAttribute(name, value) { attributes.set(name, String(value)); },
      removeAttribute(name) { attributes.delete(name); },
    };
  };
  const panel = makeAttributedRegion();
  const busyRegion = makeAttributedRegion();
  const status = { textContent: '', dataset: {} };
  const classes = new Set();
  const overlay = {
    _insideReminder: true,
    classList: {
      contains: name => classes.has(name),
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
    },
    contains: target => !!target?._insideReminder,
    querySelector(selector) {
      if (selector === '.rm-panel') return panel;
      if (selector === '.modal-bd') return busyRegion;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'button, input, select') return controls;
      if (selector === '[data-rm-busy-control="true"]') {
        return controls.filter(control => control.dataset.rmBusyControl === 'true');
      }
      if (selector.includes('#rm-datetime') && selector.includes('.rm-quick button')) {
        return [label, datetime, recur, clear, save, quick];
      }
      return [];
    },
  };

  const originalGetElementById = harness.context.document.getElementById;
  const reminderElements = {
    'reminder-overlay': overlay,
    'rm-status': status,
    'rm-x': close,
    'rm-datetime': datetime,
    'rm-label': label,
    'rm-recur': recur,
    'rm-clear': clear,
    'rm-save': save,
  };
  harness.context.document.getElementById = id => reminderElements[id] || originalGetElementById(id);

  const detailFocusTargets = new Map([
    ['reminder-change', { focusKey: 'reminder-change' }],
    ['reminder-set', { focusKey: 'reminder-set' }],
  ]);
  const originalRootQuerySelector = harness.root.querySelector.bind(harness.root);
  harness.root.querySelector = selector => {
    const match = selector.match(/^\[data-idp-focus="([^"]+)"\]$/);
    return match ? detailFocusTargets.get(match[1]) || null : originalRootQuerySelector(selector);
  };

  const reminderCalls = { messages: [], closes: 0, toasts: [], focusKeys: [], order: [] };
  const originalSnapshot = harness.context.State.snapshot;
  const originalPersistNow = harness.context.State.persistNow;
  harness.context.State.snapshot = labelText => {
    reminderCalls.order.push('snapshot');
    return originalSnapshot(labelText);
  };
  harness.context.State.persistNow = options => {
    reminderCalls.order.push('persist');
    return originalPersistNow(options);
  };
  harness.context.chrome = {
    runtime: {
      sendMessage(message) {
        reminderCalls.messages.push(message);
        reminderCalls.order.push('runtime-message');
        return Promise.resolve({ ok: true });
      },
    },
  };
  harness.context.closeReminderPicker = () => {
    reminderCalls.closes += 1;
    reminderCalls.order.push('close');
    overlay.classList.add('hidden');
    return true;
  };
  harness.context.renderBoard = () => {
    harness.calls.renderBoard += 1;
    reminderCalls.order.push('render-board');
  };
  harness.context.renderItemDetail = () => {
    harness.calls.renderDetail += 1;
    reminderCalls.order.push('render-detail');
  };
  harness.context.focusItemDetailTarget = target => {
    reminderCalls.focusKeys.push(target?.focusKey || null);
    reminderCalls.order.push(`focus:${target?.focusKey || 'missing'}`);
    return !!target;
  };
  harness.context.toast = (message, options = {}) => {
    reminderCalls.toasts.push({ message, options });
    reminderCalls.order.push('toast');
  };

  return {
    ...harness,
    overlay,
    panel,
    busyRegion,
    status,
    controls,
    close,
    datetime,
    save,
    clear,
    quick,
    reminderCalls,
  };
}

function runZeroDelayReminderTimers(harness) {
  const ready = [...harness.timers.entries()].filter(([, timer]) => timer.delay === 0);
  ready.forEach(([id, timer]) => {
    harness.timers.delete(id);
    timer.fn();
  });
}

function createNonDetailItemReminderHarness({
  existingReminder = null,
  recoveryRequired = false,
} = {}) {
  const workspace = { id: 'ws-reminder' };
  const space = { id: 'space-reminder' };
  const group = { id: 'group-reminder' };
  const stack = { id: 'stack-reminder', type: 'stack', items: [] };
  const item = {
    id: 'item-reminder',
    type: 'note',
    html: 'Recover this context',
    ...(existingReminder ? { reminder: plain(existingReminder) } : {}),
  };
  stack.items.push(item);

  let identityMode = 'current';
  let recovery = recoveryRequired;
  const receipt = deferred();
  const calls = {
    identity: [],
    snapshots: [],
    writes: [],
    busy: [],
    unavailable: [],
    statuses: [],
    closes: 0,
    renders: 0,
    frames: [],
    focuses: [],
    toasts: [],
    recovery: [],
  };

  const identityItemTargets = ids => {
    calls.identity.push([...ids]);
    if (identityMode === 'duplicate') return null;
    const liveWorkspace = workspace;
    const liveSpace = space;
    const liveGroup = identityMode === 'moved'
      ? { id: 'group-moved' }
      : group;
    const liveStack = identityMode === 'ancestor-replacement'
      ? { ...stack }
      : stack;
    const liveItem = identityMode === 'replacement'
      ? plain(item)
      : item;
    const targets = [];
    if (ids.includes(stack.id)) {
      targets.push({
        workspace: liveWorkspace,
        space: liveSpace,
        group: liveGroup,
        item: liveStack,
        ancestorStackIds: [],
      });
    }
    if (ids.includes(item.id)) {
      targets.push({
        workspace: liveWorkspace,
        space: liveSpace,
        group: liveGroup,
        item: liveItem,
        ancestorStackIds: [stack.id],
      });
    }
    return { targets, nested: ids.length > 1 };
  };

  const context = loadNonDetailItemReminderFunctions({
    Date,
    identityItemTargets,
    State: {
      isRecoveryRequired: () => recovery,
      snapshot(label) {
        calls.snapshots.push(label);
        return 73;
      },
      persistNow(options) {
        calls.writes.push(plain(options));
        return receipt.promise;
      },
      requireRecovery() { recovery = true; },
    },
    tr: key => key,
    setReminderMutationBusy(busy, key) { calls.busy.push({ busy, key: key || null }); },
    setReminderMutationUnavailable(key) { calls.unavailable.push(key); },
    setReminderMutationStatus(key, tone) { calls.statuses.push({ key, tone }); },
    showReminderTimeError() { calls.statuses.push({ key: 'reminder.futureTime', tone: 'error' }); },
    closeReminderPicker() { calls.closes += 1; return true; },
    renderBoard() { calls.renders += 1; },
    requestAnimationFrame(callback) { calls.frames.push(callback); return calls.frames.length; },
    focusItemReminderTarget(ctx, hasReminder) {
      calls.focuses.push({ itemId: ctx.itemId, hasReminder });
      return true;
    },
    toast(message, options = {}) { calls.toasts.push({ message, options: plain(options) }); },
    showStateRecoveryRequired(error) { calls.recovery.push(error?.code || error?.message || String(error)); },
  });
  const mutationContext = context.createItemReminderMutationContext(item.id);
  assert.ok(mutationContext, 'the current unique nested item must produce a frozen reminder context');
  calls.identity.length = 0;

  return {
    context,
    mutationContext,
    item,
    stack,
    group,
    receipt,
    calls,
    setIdentityMode(value) { identityMode = value; },
    setRecovery(value) { recovery = value; },
  };
}

async function testReceiptGatedNonDetailItemReminderContract() {
  const nextAt = Date.now() + 3_600_000;
  const accepted = createNonDetailItemReminderHarness({
    existingReminder: {
      at: Date.now() + 1_800_000,
      notified: true,
      recur: { every: 'day', interval: 8 },
      importedMeta: { source: 'portable-backup' },
    },
  });
  const pending = accepted.context.commitItemReminderMutation(
    accepted.mutationContext,
    { at: nextAt, recur: { every: 'week', interval: 9 } },
    { fromPicker: true },
  );
  assert.ok(accepted.context.__itemReminderPending(),
    'the non-detail item reminder must establish its pending token synchronously');
  assert.deepEqual(accepted.calls.snapshots, ['reminder.updateHistory']);
  assert.deepEqual(accepted.calls.writes, [{ reconcileReminders: true }]);
  assert.deepEqual(plain(accepted.item.reminder), {
    at: nextAt,
    notified: false,
    recur: { every: 'week', interval: 1 },
    importedMeta: { source: 'portable-backup' },
  }, 'the editor must preserve imported fields while owning schedule, recurrence, and delivery state');
  assert.equal(accepted.calls.closes, 0);
  assert.equal(accepted.calls.renders, 0);
  assert.equal(accepted.calls.toasts.length, 0);
  assert.equal(accepted.calls.frames.length, 0);
  assert.deepEqual(accepted.calls.busy, [{ busy: true, key: null }]);

  assert.equal(await accepted.context.commitItemReminderMutation(
    accepted.mutationContext,
    { at: Date.now() + 7_200_000 },
    { fromPicker: true },
  ), false, 'a second activation must fail while the first receipt owns the picker');
  assert.equal(accepted.calls.snapshots.length, 1);
  assert.equal(accepted.calls.writes.length, 1);

  accepted.receipt.resolve({
    ok: true,
    revision: 8,
    reminderReconciliation: { ok: true },
  });
  assert.equal(await pending, true);
  assert.equal(accepted.context.__itemReminderPending(), null);
  assert.deepEqual(accepted.calls.busy, [
    { busy: true, key: null },
    { busy: false, key: null },
  ]);
  assert.equal(accepted.calls.closes, 1);
  assert.equal(accepted.calls.renders, 1);
  assert.deepEqual(accepted.calls.toasts, [{
    message: 'reminder.setSuccess',
    options: { undo: 73 },
  }]);
  assert.equal(accepted.calls.frames.length, 1);
  accepted.calls.frames.shift()();
  assert.deepEqual(accepted.calls.focuses, [{
    itemId: 'item-reminder',
    hasReminder: true,
  }]);

  const clear = createNonDetailItemReminderHarness({
    existingReminder: { at: Date.now() + 1_800_000, notified: false },
  });
  const clearPending = clear.context.commitItemReminderMutation(
    clear.mutationContext,
    null,
    { fromPicker: true },
  );
  assert.equal(Object.hasOwn(clear.item, 'reminder'), false);
  assert.deepEqual(clear.calls.snapshots, ['reminder.clearHistory']);
  clear.receipt.resolve({
    ok: true,
    revision: 8,
    reminderReconciliation: { ok: true },
  });
  assert.equal(await clearPending, true);
  assert.deepEqual(clear.calls.toasts, [{
    message: 'reminder.clearSuccess',
    options: { undo: 73 },
  }]);
  clear.calls.frames.shift()();
  assert.deepEqual(clear.calls.focuses, [{
    itemId: 'item-reminder',
    hasReminder: false,
  }]);

  const warning = createNonDetailItemReminderHarness();
  const warningPending = warning.context.commitItemReminderMutation(
    warning.mutationContext,
    { at: Date.now() + 3_600_000 },
    { fromPicker: true },
  );
  warning.receipt.resolve({
    ok: true,
    revision: 8,
    reminderReconciliation: { ok: false, errors: [{ operation: 'schedule' }] },
  });
  assert.equal(await warningPending, true);
  assert.equal(warning.calls.closes, 1);
  assert.equal(warning.calls.renders, 1);
  assert.deepEqual(warning.calls.toasts, [{
    message: 'reminder.scheduleWarning',
    options: { tone: 'warning', duration: 8000, undo: 73 },
  }], 'accepted state plus alarm failure must retain state and report a warning');

  for (const code of ['LOCUS_STATE_WRITE_FAILED', 'LOCUS_STATE_UNKNOWN_ACK']) {
    const rejected = createNonDetailItemReminderHarness();
    const rejectedPending = rejected.context.commitItemReminderMutation(
      rejected.mutationContext,
      { at: Date.now() + 3_600_000 },
      { fromPicker: true },
    );
    rejected.setRecovery(true);
    rejected.receipt.reject(Object.assign(new Error(code), { code }));
    assert.equal(await rejectedPending, false);
    assert.ok(rejected.item.reminder, `${code} must retain the dirty graph behind recovery`);
    assert.equal(rejected.calls.closes, 0);
    assert.equal(rejected.calls.renders, 0);
    assert.equal(rejected.calls.frames.length, 0);
    assert.equal(rejected.calls.toasts.length, 0);
    assert.deepEqual(rejected.calls.statuses.at(-1), {
      key: 'reminder.saveFailed',
      tone: 'error',
    });
    assert.equal(rejected.calls.recovery.length, 1);
  }

  const unchangedReminder = {
    at: Date.now() + 3_600_000,
    notified: false,
    recur: { every: 'month', interval: 1 },
    importedMeta: { retain: true },
  };
  const unchanged = createNonDetailItemReminderHarness({ existingReminder: unchangedReminder });
  assert.equal(await unchanged.context.commitItemReminderMutation(
    unchanged.mutationContext,
    { at: unchangedReminder.at, recur: unchangedReminder.recur },
    { fromPicker: true },
  ), true);
  assert.equal(unchanged.calls.closes, 1);
  assert.equal(unchanged.calls.snapshots.length, 0);
  assert.equal(unchanged.calls.writes.length, 0);
  assert.equal(unchanged.calls.renders, 0);
  assert.equal(unchanged.calls.toasts.length, 0);

  const invalid = createNonDetailItemReminderHarness();
  assert.equal(await invalid.context.commitItemReminderMutation(
    invalid.mutationContext,
    { at: Date.now() - 1 },
    { fromPicker: true },
  ), false);
  assert.deepEqual(invalid.calls.statuses, [{ key: 'reminder.futureTime', tone: 'error' }]);
  assert.equal(invalid.calls.snapshots.length, 0);
  assert.equal(invalid.calls.writes.length, 0);

  const recovery = createNonDetailItemReminderHarness();
  recovery.setRecovery(true);
  assert.equal(await recovery.context.commitItemReminderMutation(
    recovery.mutationContext,
    { at: Date.now() + 3_600_000 },
    { fromPicker: true },
  ), false);
  assert.equal(recovery.calls.identity.length, 0,
    'pre-existing recovery must block before identity resolution');
  assert.equal(recovery.calls.snapshots.length, 0);
  assert.equal(recovery.calls.writes.length, 0);
  assert.deepEqual(recovery.calls.unavailable, ['reminder.saveFailed']);
  assert.equal(recovery.calls.recovery.length, 1);

  for (const [label, mutate] of [
    ['duplicate item', harness => harness.setIdentityMode('duplicate')],
    ['replaced item', harness => harness.setIdentityMode('replacement')],
    ['moved item', harness => harness.setIdentityMode('moved')],
    ['replaced Stack ancestor', harness => harness.setIdentityMode('ancestor-replacement')],
    ['changed item', harness => { harness.item.html = 'Changed while the picker was open'; }],
    ['retyped item', harness => { harness.item.type = 'todo'; }],
  ]) {
    const stale = createNonDetailItemReminderHarness();
    mutate(stale);
    assert.equal(await stale.context.commitItemReminderMutation(
      stale.mutationContext,
      { at: Date.now() + 3_600_000 },
      { fromPicker: true },
    ), false, `${label} must fail closed`);
    assert.equal(Object.hasOwn(stale.item, 'reminder'), false);
    assert.equal(stale.calls.snapshots.length, 0);
    assert.equal(stale.calls.writes.length, 0);
    assert.equal(stale.calls.closes, 0);
    assert.deepEqual(stale.calls.unavailable, ['reminder.changed']);
  }
}

async function testReceiptGatedItemDetailReminderContract() {
  const cases = [
    {
      label: 'set',
      existing: null,
      next: { at: Date.now() + 3_600_000, recur: { every: 'week', interval: 99 } },
      history: 'reminder.setHistory',
      focus: 'reminder-change',
      toast: 'reminder.setSuccess',
    },
    {
      label: 'update',
      existing: {
        at: Date.now() + 1_800_000,
        notified: false,
        recur: { every: 'day', interval: 1 },
        importedMeta: { source: 'legacy-reminder' },
      },
      next: { at: Date.now() + 7_200_000, recur: { every: 'month', interval: 4 } },
      history: 'reminder.updateHistory',
      focus: 'reminder-change',
      toast: 'reminder.setSuccess',
    },
    {
      label: 'clear',
      existing: { at: Date.now() + 1_800_000, notified: false },
      next: null,
      history: 'reminder.clearHistory',
      focus: 'reminder-set',
      toast: 'reminder.clearSuccess',
    },
  ];

  for (const contract of cases) {
    const harness = createItemDetailReminderHarness({ existingReminder: contract.existing });
    const first = harness.context.commitItemDetailReminderMutation(
      harness.mutationContext,
      contract.next,
      { fromPicker: true },
    );

    assert.equal(harness.context.isItemDetailReminderMutationPending(), true,
      `${contract.label} must establish its reminder token synchronously`);
    assert.equal(harness.context.isItemDetailMutationPending(), true,
      `${contract.label} must join the detail route/pagehide pending boundary`);
    assert.deepEqual(harness.reminderCalls.order, ['snapshot', 'persist']);
    assert.deepEqual(harness.calls.snapshots, [contract.history]);
    assert.equal(harness.calls.writes.length, 1);
    assert.deepEqual(plain(harness.calls.writes), [{ reconcileReminders: true }],
      `${contract.label} must make alarm reconciliation part of the acknowledged state write`);
    assert.equal(harness.reminderCalls.messages.length, 0,
      `${contract.label} must not send a separate page-level reconciliation message`);
    assert.equal(harness.reminderCalls.closes, 0);
    assert.equal(harness.calls.renderBoard, 0);
    assert.equal(harness.calls.renderDetail, 0);
    assert.equal(harness.reminderCalls.toasts.length, 0);
    assert.equal(harness.busyRegion.getAttribute('aria-busy'), 'true');
    assert.equal(harness.status.textContent, 'reminder.saving');
    assert.equal(harness.status.dataset.tone, 'pending');
    assert.equal(harness.save.getAttribute('aria-disabled'), 'true');
    assert.equal(harness.datetime.readOnly, true);
    if (contract.next) {
      assert.deepEqual(plain(harness.item.reminder), {
        at: Number(contract.next.at),
        notified: false,
        ...(contract.existing?.importedMeta ? { importedMeta: contract.existing.importedMeta } : {}),
        ...(contract.next.recur ? { recur: { every: contract.next.recur.every, interval: 1 } } : {}),
      });
    } else {
      assert.equal(Object.hasOwn(harness.item, 'reminder'), false);
    }

    const duplicate = await harness.context.commitItemDetailReminderMutation(
      harness.mutationContext,
      { at: Date.now() + 10_800_000 },
      { fromPicker: true },
    );
    assert.equal(duplicate, false, `${contract.label} must suppress a duplicate activation while pending`);
    assert.equal(harness.calls.snapshots.length, 1);
    assert.equal(harness.calls.writes.length, 1);

    harness.receipt.resolve({
      ok: true,
      revision: 5,
      reminderReconciliation: { ok: true },
    });
    assert.equal(await first, true);
    assert.deepEqual(harness.reminderCalls.order, [
      'snapshot', 'persist', 'close', 'render-board', 'render-detail', 'toast',
    ]);
    assert.equal(harness.reminderCalls.messages.length, 0,
      `${contract.label} must consume the structured write receipt without a second runtime request`);
    assert.equal(harness.context.isItemDetailMutationPending(), false);
    assert.equal(harness.busyRegion.getAttribute('aria-busy'), 'false');
    assert.equal(harness.save.hasAttribute('aria-disabled'), false);
    assert.equal(harness.datetime.readOnly, false);
    assert.equal(harness.reminderCalls.closes, 1);
    assert.equal(harness.calls.renderBoard, 1);
    assert.equal(harness.calls.renderDetail, 1);
    assert.deepEqual(plain(harness.reminderCalls.toasts), [{
      message: contract.toast,
      options: { undo: 91 },
    }]);
    runZeroDelayReminderTimers(harness);
    assert.deepEqual(harness.reminderCalls.focusKeys, [contract.focus],
      `${contract.label} must focus the rebuilt reminder control`);
  }

  for (const code of ['LOCUS_STATE_WRITE_FAILED', 'LOCUS_STATE_UNKNOWN_ACK']) {
    const harness = createItemDetailReminderHarness();
    const next = { at: Date.now() + 3_600_000, recur: { every: 'day', interval: 1 } };
    const pending = harness.context.commitItemDetailReminderMutation(
      harness.mutationContext,
      next,
      { fromPicker: true },
    );
    harness.setRecoveryRequired(true);
    harness.receipt.reject(Object.assign(new Error(code), { code }));
    assert.equal(await pending, false);
    assert.deepEqual(plain(harness.item.reminder), {
      at: Number(next.at), notified: false, recur: { every: 'day', interval: 1 },
    }, `${code} must retain the only dirty reminder graph behind recovery`);
    assert.deepEqual(harness.reminderCalls.order, ['snapshot', 'persist']);
    assert.equal(harness.reminderCalls.messages.length, 0);
    assert.equal(harness.reminderCalls.closes, 0);
    assert.equal(harness.calls.renderBoard, 0);
    assert.equal(harness.calls.renderDetail, 0);
    assert.equal(harness.reminderCalls.toasts.length, 0);
    assert.equal(harness.calls.recovery.length, 1);
    assert.equal(harness.overlay.classList.contains('hidden'), false);
    assert.equal(harness.busyRegion.getAttribute('aria-busy'), 'false');
    assert.equal(harness.status.textContent, 'reminder.saveFailed');
    assert.equal(harness.status.dataset.tone, 'error');
  }

  const warningCases = [
    {
      label: 'structured scheduling failure',
      existing: null,
      next: { at: Date.now() + 3_600_000 },
      reconciliation: { ok: false, errors: [{ operation: 'schedule' }] },
      warning: 'reminder.scheduleWarning',
      hasReminder: true,
      focus: 'reminder-change',
    },
    {
      label: 'worker-contained rejected clear reconciliation',
      existing: { at: Date.now() + 1_800_000, notified: false },
      next: null,
      reconciliation: { ok: false, errors: [{ operation: 'unexpected', message: 'alarm API rejected' }] },
      warning: 'reminder.clearScheduleWarning',
      hasReminder: false,
      focus: 'reminder-set',
    },
  ];
  for (const contract of warningCases) {
    const harness = createItemDetailReminderHarness({ existingReminder: contract.existing });
    const pending = harness.context.commitItemDetailReminderMutation(
      harness.mutationContext,
      contract.next,
      { fromPicker: true },
    );
    assert.deepEqual(plain(harness.calls.writes), [{ reconcileReminders: true }]);
    harness.receipt.resolve({
      ok: true,
      revision: 5,
      reminderReconciliation: contract.reconciliation,
    });
    assert.equal(await pending, true);
    assert.equal(Object.hasOwn(harness.item, 'reminder'), contract.hasReminder,
      `${contract.label} must retain the accepted state instead of rolling back`);
    assert.equal(harness.calls.recovery.length, 0,
      `${contract.label} is an alarm warning, not an unknown state receipt`);
    assert.equal(harness.reminderCalls.messages.length, 0,
      `${contract.label} must not launch a second reconciliation from the page`);
    assert.equal(harness.reminderCalls.closes, 1);
    assert.equal(harness.calls.renderBoard, 1);
    assert.equal(harness.calls.renderDetail, 1);
    assert.deepEqual(plain(harness.reminderCalls.toasts), [{
      message: contract.warning,
      options: { tone: 'warning', duration: 8000, undo: 91 },
    }]);
    runZeroDelayReminderTimers(harness);
    assert.deepEqual(harness.reminderCalls.focusKeys, [contract.focus]);
  }

  for (const [labelText, makeStale] of [
    ['changed item fingerprint', harness => { harness.item.title = 'Changed elsewhere'; }],
    ['duplicate item identity', harness => {
      harness.otherGroup.items.push({ id: harness.item.id, type: 'note', html: 'duplicate' });
    }],
  ]) {
    const harness = createItemDetailReminderHarness();
    makeStale(harness);
    assert.equal(await harness.context.commitItemDetailReminderMutation(
      harness.mutationContext,
      { at: Date.now() + 3_600_000 },
      { fromPicker: true },
    ), false, `${labelText} must fail closed`);
    assert.equal(Object.hasOwn(harness.item, 'reminder'), false);
    assert.equal(harness.calls.snapshots.length, 0);
    assert.equal(harness.calls.writes.length, 0);
    assert.equal(harness.reminderCalls.messages.length, 0);
    assert.equal(harness.reminderCalls.closes, 0);
    assert.equal(harness.calls.renderBoard, 0);
    assert.equal(harness.reminderCalls.toasts.length, 0);
    assert.equal(harness.status.textContent, 'reminder.changed');
    assert.equal(harness.status.dataset.tone, 'error');
    assert.equal(harness.save.disabled, true);
    assert.equal(harness.close.focusCalls, 1);
  }
}

async function testReminderGlobalKeyContract() {
  const nonpending = createItemDetailReminderHarness();
  const insideShortcut = eventFor('z', nonpending.save);
  insideShortcut.ctrlKey = true;
  assert.equal(nonpending.context.handleReminderGlobalKey(insideShortcut), true);
  assert.equal(insideShortcut.defaultPrevented, false,
    'a key inside the non-pending picker must retain native control behavior');
  assert.equal(nonpending.reminderCalls.closes, 0,
    'an app-wide Undo shortcut must not pass through a non-pending reminder picker');

  const outside = { _insideReminder: false };
  const outsideEscape = eventFor('Escape', outside);
  assert.equal(nonpending.context.handleReminderGlobalKey(outsideEscape), true);
  assert.equal(outsideEscape.defaultPrevented, true);
  assert.equal(outsideEscape.immediatePropagationStopped, true);
  assert.equal(nonpending.reminderCalls.closes, 1,
    'outside-focus Escape must close only the top reminder picker');

  const pending = createItemDetailReminderHarness();
  const transaction = pending.context.commitItemDetailReminderMutation(
    pending.mutationContext,
    { at: Date.now() + 3_600_000 },
    { fromPicker: true },
  );
  for (const key of ['Escape', 'Enter', ' ']) {
    const event = eventFor(key, pending.save);
    assert.equal(pending.context.handleReminderGlobalKey(event), true);
    assert.equal(event.defaultPrevented, true, `${JSON.stringify(key)} must be consumed while pending`);
    assert.equal(event.immediatePropagationStopped, true);
  }
  const pendingUndo = eventFor('z', pending.save);
  pendingUndo.ctrlKey = true;
  assert.equal(pending.context.handleReminderGlobalKey(pendingUndo), true);
  assert.equal(pendingUndo.defaultPrevented, true);
  assert.equal(pending.reminderCalls.closes, 0);
  const pendingTab = eventFor('Tab', pending.save);
  assert.equal(pending.context.handleReminderGlobalKey(pendingTab), true);
  assert.equal(pendingTab.defaultPrevented, false,
    'pending Tab must remain available to the picker focus trap');
  const outsidePending = eventFor('Escape', outside);
  assert.equal(pending.context.handleReminderGlobalKey(outsidePending), true);
  assert.equal(outsidePending.defaultPrevented, true);
  assert.equal(pending.close.focusCalls, 1,
    'an outside pending key must return focus to a guarded picker anchor');

  pending.receipt.resolve({
    ok: true,
    revision: 5,
    reminderReconciliation: { ok: true },
  });
  await transaction;
}

function extractProductionGlobalKeyListener() {
  const marker = source.indexOf('// Global keys');
  const start = source.indexOf("document.addEventListener('keydown', e => {", marker);
  const endMarker = '\n  });';
  const end = source.indexOf(endMarker, start);
  assert.ok(marker >= 0 && start > marker && end > start, 'the production global key listener must be extractable');
  return source.slice(start, end + endMarker.length);
}

function testRecoveryAboveReminderGlobalKeyContract() {
  let handler = null;
  let reminderGuardCalls = 0;
  const recoveryTarget = { id: 'state-recovery-reload' };
  const outsideTarget = { id: 'outside-recovery' };
  let recoveryOpen = true;
  const recovery = {
    classList: { contains: name => name === 'hidden' && !recoveryOpen },
    contains: target => target === recoveryTarget,
  };
  const reminder = { classList: { contains: () => false } };
  const document = {
    activeElement: recoveryTarget,
    addEventListener(type, listener) { if (type === 'keydown') handler = listener; },
    getElementById(id) {
      if (id === 'state-recovery-overlay') return recovery;
      if (id === 'reminder-overlay') return reminder;
      return null;
    },
  };
  vm.runInNewContext(extractProductionGlobalKeyListener(), {
    document,
    settingsPreferenceBlocksDismissal: () => false,
    focusSettingsPreferencePendingControl: () => false,
    isSavedTabReturnMutationPending: () => false,
    isSavedPageArchivePending: () => false,
    isSelectedItemMutationPending: () => false,
    isArchivedPageRestorePending: () => false,
    isBoardTodoCompletionPending: () => false,
    handleRichTextLinkGlobalKey() { return false; },
    handleImportGlobalKey() { return false; },
    handlePasteImportGlobalKey() { return false; },
    handleReminderGlobalKey() { reminderGuardCalls += 1; return true; },
  }, { filename: 'newtab-recovery-global-key-extract.js' });
  assert.equal(typeof handler, 'function');

  for (const key of ['Enter', ' ']) {
    const event = eventFor(key, recoveryTarget);
    handler(event);
    assert.equal(event.defaultPrevented, false,
      `${JSON.stringify(key)} on recovery Reload must retain native activation`);
    assert.equal(event.immediatePropagationStopped, false);
  }
  assert.equal(reminderGuardCalls, 0,
    'keys inside top-layer recovery must never reach the lower reminder guard');

  const outsideEvent = eventFor('Escape', outsideTarget);
  handler(outsideEvent);
  assert.equal(outsideEvent.defaultPrevented, true,
    'keys outside open recovery must remain blocked');
  assert.equal(outsideEvent.immediatePropagationStopped, true);
  assert.equal(reminderGuardCalls, 0);

  recoveryOpen = false;
  handler(eventFor('Escape', outsideTarget));
  assert.equal(reminderGuardCalls, 1,
    'the reminder guard must resume ownership after recovery closes');
}

function testItemDetailReminderStaticContract() {
  const controller = extractFunction('commitItemDetailReminderMutation');
  const persistIndex = controller.indexOf('await State.persistNow({ reconcileReminders: true })');
  const receiptIndex = controller.indexOf('writeReceipt?.reminderReconciliation?.ok === true');
  const closeIndex = controller.indexOf('closeReminderPicker()', receiptIndex);
  const renderIndex = controller.indexOf('renderBoard()', receiptIndex);
  const toastIndex = controller.indexOf('toast(', receiptIndex);
  assert.ok(persistIndex >= 0 && receiptIndex > persistIndex,
    'one acknowledged state write must request and return reminder reconciliation');
  assert.ok(closeIndex > receiptIndex && renderIndex > receiptIndex && toastIndex > receiptIndex,
    'close, render, and feedback must remain after the structured receipt is consumed');
  assert.doesNotMatch(controller, /chrome\.runtime\.sendMessage/,
    'the page must not launch a second reminder reconciliation after persistence');
  assert.doesNotMatch(controller, /chrome\.alarms\./,
    'the detail reminder controller must delegate alarm authority to the service worker');
  assert.match(controller, /itemReminderMutationPending = transaction[\s\S]*State\.snapshot\(tr\(historyKey\)\)/,
    'the synchronous pending token must precede history and live mutation');
  assert.match(controller, /if \(alarmsReconciled\)[\s\S]*reminder\.setSuccess[\s\S]*reminder\.clearSuccess/,
    'only an explicitly successful receipt reconciliation may claim reminder success');
  assert.match(controller, /else \{[\s\S]*reminder\.scheduleWarning[\s\S]*reminder\.clearScheduleWarning/,
    'worker-contained reconciliation failures must use accepted-state warnings');

  const detailRender = extractFunction('renderItemDetail');
  assert.match(detailRender, /openReminderPicker\(it\.id, mutationContext\)/,
    'detail Set/Change must carry the frozen exact-item context into the picker');
  assert.match(detailRender, /commitItemDetailReminderMutation\(mutationContext, null\)/,
    'detail Clear must use the same exact-item receipt controller');
  const openPicker = extractFunction('openReminderPicker');
  assert.match(openPicker,
    /const fromDetail = detailContext !== undefined;[\s\S]*\? resolveItemDetailMutationTarget\(detailContext\)[\s\S]*: resolveItemReminderMutationTarget\(mutationContext\)/,
    'every item picker origin must re-resolve rather than trust first-match identity');
  assert.match(extractFunction('closeReminderPicker'), /isReminderMutationPending\(\)[\s\S]*return false/,
    'pending item or entity reminder persistence must block picker close');
  const binding = extractFunction('bindReminderUI');
  assert.match(binding, /receiptCommit[\s\S]*commitReminderClear\(\)[\s\S]*if \(receiptCommit\) void result;/,
    'receipt-gated item and entity Clear/Remove must leave close ownership to the async controller');
  assert.match(binding, /addEventListener\('keydown',[\s\S]*isReminderMutationPending\(\)[\s\S]*stopImmediatePropagation\(\)[\s\S]*true\)/,
    'the picker key guard must execute in capture phase');
  assert.match(binding, /addEventListener\('click',[\s\S]*isReminderMutationPending\(\)[\s\S]*stopImmediatePropagation\(\)[\s\S]*true\)/,
    'the picker click guard must execute in capture phase');

  const nonDetailController = extractFunction('commitItemReminderMutation');
  const nonDetailPersist = nonDetailController.indexOf(
    'await State.persistNow({ reconcileReminders: true })',
  );
  const nonDetailReceipt = nonDetailController.indexOf(
    'writeReceipt?.reminderReconciliation?.ok === true',
  );
  const nonDetailClose = nonDetailController.indexOf('closeReminderPicker()', nonDetailReceipt);
  const nonDetailRender = nonDetailController.indexOf('renderBoard()', nonDetailReceipt);
  const nonDetailToast = nonDetailController.indexOf('toast(', nonDetailReceipt);
  assert.ok(nonDetailPersist >= 0 && nonDetailReceipt > nonDetailPersist,
    'the non-detail controller must await the combined state/alarm receipt');
  assert.ok(nonDetailClose > nonDetailReceipt
    && nonDetailRender > nonDetailReceipt
    && nonDetailToast > nonDetailReceipt,
  'non-detail close, render, and feedback must remain after acknowledgement');
  assert.doesNotMatch(nonDetailController, /chrome\.alarms\.|chrome\.runtime\.sendMessage/,
    'non-detail reminder mutation must leave alarm authority with the service worker');
  assert.match(nonDetailController,
    /itemReminderMutationPending = transaction[\s\S]*State\.snapshot\(tr\(historyKey\)\)/,
    'non-detail pending ownership must precede history and live mutation');
  assert.match(nonDetailController,
    /requestAnimationFrame\(\(\) => focusItemReminderTarget\(context, nextReminder != null\)\)/,
    'acknowledged non-detail mutation must restore the same item or Calendar target');

  const openNonDetailPicker = extractFunction('openReminderPicker');
  assert.match(openNonDetailPicker,
    /createItemReminderMutationContext\(itemId\)[\s\S]*resolveItemReminderMutationTarget\(mutationContext\)/,
    'a non-detail picker must freeze and immediately verify exhaustive identity');
  assert.match(openNonDetailPicker,
    /mutationContext[\s\S]*opener:/,
    'the non-detail picker must retain a stable opener/focus fallback');

  const setWrapper = extractFunction('setReminder');
  const clearWrapper = extractFunction('clearReminder');
  for (const wrapper of [setWrapper, clearWrapper]) {
    assert.match(wrapper,
      /createItemReminderMutationContext\(itemId\)[\s\S]*commitItemReminderMutation\(/,
      'Calendar/direct reminder wrappers must route through the receipt controller');
    assert.doesNotMatch(wrapper, /State\.persist\(|chrome\.alarms\.|toast\(['"]/,
      'legacy direct write, alarm, and hardcoded success paths must be absent');
  }
  assert.match(extractFunction('commitReminderSet'),
    /c\.mutationContext[\s\S]*commitItemReminderMutation\(/,
    'picker Set/Update/quick actions must carry the frozen non-detail context');
  assert.match(extractFunction('commitReminderClear'),
    /c\.mutationContext[\s\S]*commitItemReminderMutation\(/,
    'picker Clear must carry the frozen non-detail context');
  assert.match(binding,
    /const receiptCommit = reminderCtx\?\.kind === 'item'[\s\S]*if \(receiptCommit\) void result;/,
    'all item reminder picker actions must leave close ownership to their async controller');
  const calendarDot = extractFunction('buildCalDot');
  assert.match(calendarDot,
    /dot\.dataset\.reminderSource = entry\.source;[\s\S]*dot\.dataset\.reminderOwnerId = entry\.refId;/,
    'Calendar must expose a stable item-reminder focus target after acknowledged render');
  assert.match(extractFunction('calRescheduleTo'),
    /entry\.source === 'item'\) return setReminder\(entry\.refId, ts, \{ recur: entry\.recur \}\)/,
    'Calendar item reschedule must reuse the receipt-gated wrapper');

  const bindStaticSource = extractFunction('bindStatic');
  const recoveryIndex = bindStaticSource.indexOf("document.getElementById('state-recovery-overlay')");
  const reminderGuardIndex = bindStaticSource.indexOf('if (handleReminderGlobalKey(e)) return;');
  assert.ok(recoveryIndex >= 0 && reminderGuardIndex > recoveryIndex,
    'top-layer recovery must return before the lower reminder key guard');
  assert.match(bindStaticSource, /higherLayerIds = \[[^\]]*'reminder-overlay'/,
    'the reminder picker must block lower launch-layer Escape');
  assert.match(bindStaticSource, /_escBlockers = \[[^\]]*'reminder-overlay'/,
    'the reminder picker must join last-opened-first-closed Escape accounting');

  assert.match(html,
    /id="rm-status"[^>]*class="rm-status"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/,
    'the picker must expose one polite atomic live status');
  assert.match(css, /\.rm-status\s*\{[^}]*min-height:[^}]*overflow-wrap:\s*anywhere;/s,
    'localized picker feedback must reserve space and wrap');
  assert.match(css, /\.rm-status\[data-tone="pending"\][^}]*var\(--accent\)/,
    'pending reminder feedback must use the shared accent token');
  assert.match(css, /\.rm-status\[data-tone="error"\][^}]*var\(--red\)/,
    'failed reminder feedback must use the shared error token');
  assert.match(css, /\.rm-mutation-pending \[aria-disabled="true"\][^}]*cursor:\s*wait;/s,
    'pending picker controls must expose visible guarded feedback');

  const i18n = readI18n();
  for (const key of [
    'reminder.saving', 'reminder.changed', 'reminder.saveFailed',
    'reminder.setSuccess', 'reminder.clearSuccess', 'reminder.scheduleWarning',
    'reminder.clearScheduleWarning', 'reminder.setHistory', 'reminder.updateHistory',
    'reminder.clearHistory',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
}

async function testItemDetailPageHideSingleWriteContract() {
  const alreadyPending = createItemDetailMutationHarness();
  const pending = alreadyPending.context.commitItemDetailMutation(
    alreadyPending.mutationContext,
    'Edit before pagehide',
    live => { live.title = 'Pending pagehide'; },
  );
  assert.equal(alreadyPending.context.flushItemDetailBeforePageHide(), true);
  assert.equal(alreadyPending.flushCallCount(), 0,
    'pagehide must not blur again when a detail transaction already owns the write');
  assert.equal(alreadyPending.calls.writes.length, 1,
    'pagehide must not start a second write for an already-pending edit');
  alreadyPending.receipt.resolve({ ok: true, revision: 5 });
  await pending;

  const blurStartsWrite = createItemDetailMutationHarness();
  let blurPromise = null;
  blurStartsWrite.setFlushHandler(() => {
    blurPromise = blurStartsWrite.context.commitItemDetailMutation(
      blurStartsWrite.mutationContext,
      'Blurred edit',
      live => { live.title = 'Blurred on pagehide'; },
      { pane: false },
    );
    return true;
  });
  assert.equal(blurStartsWrite.context.flushItemDetailBeforePageHide(), true);
  assert.equal(blurStartsWrite.flushCallCount(), 1);
  assert.equal(blurStartsWrite.context.isItemDetailMutationPending(), true,
    'the blur-triggered transaction must become visible before pagehide can inspect dirty state');
  assert.equal(blurStartsWrite.calls.writes.length, 1,
    'pagehide must reuse the blur-triggered write rather than calling persistNow again');
  assert.equal(blurStartsWrite.calls.writes[0], undefined,
    'the one write must be the mutation controller receipt, not a second recordMutation:false fallback');
  blurStartsWrite.receipt.resolve({ ok: true, revision: 5 });
  assert.equal(await blurPromise, true);
  assert.equal(blurStartsWrite.calls.renderBoard, 1);
  assert.equal(blurStartsWrite.calls.renderDetail, 0,
    'a pane:false text edit must preserve the live detail DOM after acknowledgement');
  assert.equal(blurStartsWrite.calls.syncHeading, 1);
}

function testFocusRestoration() {
  let openerRestored = true;
  let queryTarget = null;
  let queryCalls = [];
  let focusCalls = [];
  const itemTarget = { id: 'same-item' };
  const heading = { id: 'board-heading' };
  const board = { querySelector: () => heading };
  const context = loadFunctions(['restoreItemDetailFocus'], {
    CSS: { escape: value => String(value) },
    restoreOpener: () => openerRestored,
    focusItemDetailTarget: (target, scroll = false) => {
      focusCalls.push({ target, scroll });
      return !!target;
    },
    document: {
      querySelector(selector) {
        queryCalls.push(selector);
        return queryTarget && selector.startsWith('.library-row') ? queryTarget : null;
      },
      getElementById: id => id === 'board' ? board : null,
    },
  });

  context.restoreItemDetailFocus({}, 'item-1');
  assert.equal(queryCalls.length, 0, 'a connected opener must win focus restoration');
  assert.equal(focusCalls.length, 0);

  openerRestored = false;
  queryTarget = itemTarget;
  context.restoreItemDetailFocus({}, 'item-1');
  assert.ok(queryCalls.some(selector => selector.includes('[data-id="item-1"]')), 'fallback lookup must stay scoped to the same item id');
  assert.deepEqual(focusCalls.at(-1), { target: itemTarget, scroll: true }, 'the same rendered item must be restored when its opener was rebuilt');

  queryCalls = [];
  focusCalls = [];
  queryTarget = itemTarget;
  context.restoreItemDetailFocus({}, 'item-1', 'library-focus-1');
  assert.ok(
    queryCalls.includes('.library-row[data-library-focus-key="library-focus-1"] .library-primary'),
    'a rebuilt Library row must consume its stable focus key and restore the visible Open page action',
  );
  assert.deepEqual(focusCalls.at(-1), { target: itemTarget, scroll: true });

  queryCalls = [];
  focusCalls = [];
  queryTarget = null;
  context.restoreItemDetailFocus({}, 'missing-item');
  assert.deepEqual(focusCalls.at(-1), { target: heading, scroll: false }, 'the board heading must be the final safe focus fallback');

  const restoreSource = extractFunction('restoreItemDetailFocus');
  for (const selector of ['.home-prow[data-item-id=', '.library-row', '.read-later-row', '.item[data-id=', '[data-item-id=', "getElementById('board')"]) {
    assert.ok(restoreSource.includes(selector), `focus restoration must retain ${selector}`);
  }
  const openerSource = extractFunction('restoreOpener');
  assert.ok(openerSource.includes('opener.isConnected !== false'), 'disconnected openers must not receive focus');
  assert.ok(openerSource.includes('_overlayOpeners.delete(el)'), 'opener references must be released after restoration');
  assert.ok(openerSource.includes('return restored'), 'same-item and board fallback must run when opener focus fails');
  const prepareSource = extractFunction('prepareItemDetailOpen');
  assert.ok(prepareSource.includes('rememberOpener(root)'), 'detail opening must capture the invoking control');
  assert.ok(prepareSource.includes('root.dataset.returnItemId'), 'detail opening must retain a same-item fallback id');
}

function testRichTextLinkDialogContract() {
  const normalizer = loadFunctions(['normalizeRichTextLinkUrl'], { URL });
  assert.equal(normalizer.normalizeRichTextLinkUrl(' https://example.com/path?q=1 '), 'https://example.com/path?q=1');
  assert.equal(normalizer.normalizeRichTextLinkUrl('http://example.com'), 'http://example.com/');
  for (const value of [
    '', 'https://', 'example.com', '/relative', 'javascript:alert(1)',
    'data:text/html,test', 'mailto:test@example.com', 'tel:+123', 'file:///tmp/test',
    'https://exa mple.com', 'https://example.com/a b', 'https://exa\nmple.com',
  ]) {
    assert.equal(normalizer.normalizeRichTextLinkUrl(value), null, `must reject non-full-HTTP(S) value: ${value}`);
  }

  {
    const harness = createRichTextLinkHarness();
    assert.equal(harness.context.openRichTextLinkDialog(), true);
    assert.equal(harness.overlay.classList.contains('hidden'), false);
    assert.equal(harness.input.value, 'https://');
    assert.equal(harness.input.selection.join(','), '8,8');
    assert.equal(harness.selectionPreview.textContent, 'Selected text');
    assert.equal(harness.toolbar.classList.contains('hidden'), true);
    assert.equal(harness.app.inert, true, 'the lower app must be inert while the dialog owns focus');
    assert.equal(harness.app.dataset.locusInertOwners, 'rich-text-link');
    assert.equal(harness.recovery.inert, false, 'recovery must remain outside the Link interlock');
    assert.equal(harness.context.isRichTextLinkEditorOwned(harness.editor), true,
      'editor blur persistence must be suppressed while the dialog reviews its selection');
    assert.equal(harness.execCalls.length, 0, 'opening must not execute formatting');
    assert.equal(harness.editor.inputEvents, 0, 'opening must not signal a dirty editor');
    assert.equal(harness.scrollLocks(), 1);
    assert.equal(harness.context.openRichTextLinkDialog(), false, 'an already-open dialog must not replace its context');

    const captured = harness.context.richTextLinkContext;
    assert.equal(harness.context.closeRichTextLinkDialog(), true);
    assert.equal(harness.overlay.classList.contains('hidden'), true);
    assert.equal(harness.context.richTextLinkContext, null);
    assert.equal(harness.app.inert, false);
    assert.equal(harness.app.dataset.locusInertOwners, undefined);
    assert.equal(harness.document.activeElement, harness.editor);
    assert.equal(harness.currentRange().startContainer, captured.startContainer);
    assert.equal(harness.currentRange().startOffset, captured.startOffset);
    assert.equal(harness.execCalls.length, 0, 'Cancel must not execute formatting');
    assert.equal(harness.scrollLocks(), 0);
  }

  {
    const harness = createRichTextLinkHarness();
    harness.context.openRichTextLinkDialog();
    harness.input.value = 'javascript:alert(1)';
    assert.equal(harness.context.applyRichTextLink(), false);
    assert.equal(harness.context.richTextLinkContext.errorKey, 'richText.invalidUrl');
    assert.equal(harness.error.textContent, 'richText.invalidUrl');
    assert.equal(harness.input.getAttribute('aria-invalid'), 'true');
    assert.equal(harness.overlay.classList.contains('hidden'), false);
    assert.equal(harness.app.inert, true);
    assert.equal(harness.execCalls.length, 0);
    assert.equal(harness.editor.inputEvents, 0);
  }

  {
    const harness = createRichTextLinkHarness();
    harness.context.openRichTextLinkDialog();
    harness.input.value = 'https://example.com/recover';
    assert.equal(harness.context.applyRichTextLink(), true);
    assert.deepEqual(plain(harness.execCalls), [['createLink', false, 'https://example.com/recover']]);
    assert.equal(harness.editor.inputEvents, 1, 'accepted Link must dispatch one bubbling input event');
    assert.equal(harness.overlay.classList.contains('hidden'), true);
    assert.equal(harness.context.richTextLinkContext, null);
    assert.equal(harness.app.inert, false);
    assert.equal(harness.document.activeElement, harness.editor);
    assert.equal(harness.scrollLocks(), 0);
  }

  const staleMutations = [
    ['editor HTML', harness => { harness.editor.innerHTML = '<p>Changed</p>'; }],
    ['disconnected editor', harness => { harness.editor.isConnected = false; }],
    ['non-editable editor', harness => { harness.editor.isContentEditable = false; }],
    ['range boundary', harness => { harness.context.richTextLinkContext.range.startOffset = 1; }],
    ['selected text', harness => { harness.context.richTextLinkContext.range.selectedText = 'Changed'; }],
    ['range node', harness => {
      harness.context.richTextLinkContext.range.startContainer = {
        nodeType: 3,
        parentElement: harness.editor,
        isConnected: true,
      };
    }],
  ];
  for (const [label, mutate] of staleMutations) {
    const harness = createRichTextLinkHarness();
    harness.context.openRichTextLinkDialog();
    harness.input.value = 'https://example.com/';
    mutate(harness);
    assert.equal(harness.context.applyRichTextLink(), false, `${label} must fail closed`);
    assert.equal(harness.context.richTextLinkContext.errorKey, 'richText.selectionChanged');
    assert.equal(harness.execCalls.length, 0, `${label} must not reach createLink`);
    assert.equal(harness.editor.inputEvents, 0);
    assert.equal(harness.overlay.classList.contains('hidden'), false);
  }

  for (const mode of ['false', 'throw']) {
    const harness = createRichTextLinkHarness();
    const originalHtml = harness.editor.innerHTML;
    harness.context.openRichTextLinkDialog();
    harness.input.value = 'https://example.com/';
    harness.setExecMutation('<p><a href="https://example.com/">Selected text</a></p>');
    if (mode === 'false') harness.setExecResult(false);
    else harness.setExecError(new Error('unsupported'));
    assert.equal(harness.context.applyRichTextLink(), false, `${mode} command must report failure`);
    assert.equal(harness.execCalls.length, 1);
    assert.equal(harness.editor.innerHTML, originalHtml, 'a failed command must restore the exact reviewed HTML');
    assert.equal(harness.editor.inputEvents, 0);
    assert.equal(harness.context.richTextLinkContext.errorKey, 'richText.applyFailed');
    assert.equal(harness.overlay.classList.contains('hidden'), false);
    assert.equal(harness.app.inert, true, 'failed commands must restore the dialog interlock before yielding');
  }

  {
    const harness = createRichTextLinkHarness();
    harness.recovery.classList.remove('hidden');
    assert.equal(harness.context.openRichTextLinkDialog(), false,
      'the Link dialog must not open beneath recovery');
    assert.equal(harness.context.richTextLinkContext, null);
    assert.equal(harness.execCalls.length, 0);
  }

  {
    const harness = createRichTextLinkHarness();
    harness.context.openRichTextLinkDialog();
    const outside = eventFor('ArrowDown', harness.app);
    assert.equal(harness.context.handleRichTextLinkGlobalKey(outside), true);
    assert.equal(outside.defaultPrevented, true);
    assert.equal(outside.immediatePropagationStopped, true);
    assert.equal(harness.document.activeElement, harness.input,
      'a programmatic focus escape must return to the URL field');
    const inside = eventFor('a', harness.input);
    assert.equal(harness.context.handleRichTextLinkGlobalKey(inside), true);
    assert.equal(inside.defaultPrevented, false);

    const escape = eventFor('Escape', harness.app);
    assert.equal(harness.context.handleRichTextLinkGlobalKey(escape), true);
    assert.equal(escape.defaultPrevented, true);
    assert.equal(harness.overlay.classList.contains('hidden'), true);
    assert.equal(harness.execCalls.length, 0);
    assert.equal(harness.document.activeElement, harness.editor,
      'outside Escape must close only the Link dialog and restore the selection editor');
  }

  {
    const harness = createRichTextLinkHarness();
    harness.context.openRichTextLinkDialog();
    harness.recovery.classList.remove('hidden');
    const recoveryKey = eventFor('Enter', harness.recovery);
    assert.equal(harness.context.handleRichTextLinkGlobalKey(recoveryKey), false,
      'recovery controls must retain top-layer keyboard ownership');
    assert.equal(recoveryKey.defaultPrevented, false);
  }
}

function testRichTextLinkStaticContract() {
  assert.doesNotMatch(source, /\bprompt\s*\(/, 'the native rich-text Link prompt must be absent');
  assert.equal((source.match(/document\.execCommand\('createLink'/g) || []).length, 1,
    'createLink must have one reviewed production command site');

  const openSource = extractFunction('openRichTextLinkDialog');
  const applySource = extractFunction('applyRichTextLink');
  const closeSource = extractFunction('closeRichTextLinkDialog');
  const bindSource = extractFunction('bindRichTextLinkDialog');
  const globalSource = extractFunction('handleRichTextLinkGlobalKey');
  assert.ok(openSource.includes('captureRichTextLinkSelection()'));
  assert.ok(openSource.includes('setRichTextLinkInterlock(true)'));
  assert.ok(openSource.includes("input.value = 'https://'"));
  assert.ok(applySource.includes('richTextLinkContextStillMatches(context)'));
  assert.ok(applySource.includes("document.execCommand('createLink', false, normalizedUrl) === true"));
  assert.ok(applySource.includes("new Event('input', { bubbles: true })"));
  assert.ok(closeSource.includes('restoreRichTextLinkSelection(context)'));
  assert.ok(bindSource.includes("event.key === 'Escape'"));
  assert.ok(bindSource.includes('trapTabKey(event, overlay)'));
  assert.ok(globalSource.includes('event.stopImmediatePropagation()'));
  assert.ok(extractFunction('rtCreateLink').includes('openRichTextLinkDialog()'));

  const richTextMutationSurface = [
    openSource,
    applySource,
    closeSource,
    extractFunction('finishRichTextLinkSuccess'),
  ].join('\n');
  assert.doesNotMatch(richTextMutationSurface, /\bState\.|persist|snapshot|commitItemDetailMutation/,
    'the Link dialog must leave persistence and history to the owning editor');
  for (const [name, functionName] of [
    ['Details Note body', 'detailPrimaryEditor'],
    ['Group README', 'renderGroupPage'],
    ['item-detail notes', 'renderItemDetail'],
  ]) {
    assert.ok(extractFunction(functionName).includes('isRichTextLinkEditorOwned('),
      `${name} blur persistence must ignore the dialog's temporary focus move`);
  }

  const toolbarSource = extractFunction('bindRtToolbar');
  assert.ok(toolbarSource.includes("event.target?.closest?.('.note-text')"),
    'Ctrl/Cmd+K must be delegated across the Details Note body, Group READMEs, and item-detail notes');
  assert.ok(toolbarSource.includes("event.key.toLowerCase() !== 'k'"));
  // Windows checkouts with core.autocrlf=true read newtab.js with CRLF endings.
  assert.match(toolbarSource, /event\.preventDefault\(\);\r?\n {4}rtCreateLink\(\);/,
    'Ctrl/Cmd+K must cancel the browser default before opening the Link dialog');
  assert.ok(toolbarSource.includes("cmd === 'link') rtCreateLink()"),
    'the toolbar Link button must share the dialog entry point');
  assert.ok(extractFunction('inheritActiveBodyInterlocks').includes("'rich-text-link'"),
    'late-mounted body surfaces must inherit the active Link interlock');

  for (const marker of [
    'id="rt-toolbar" class="hidden" role="toolbar"',
    'data-i18n-aria-label="richText.toolbar"',
    'data-cmd="link" title="Add link (Ctrl+K)"',
    'id="rich-text-link-overlay" class="hidden" role="dialog" aria-modal="true"',
    'aria-labelledby="rich-text-link-title"',
    'aria-describedby="rich-text-link-description rich-text-link-error"',
    'id="rich-text-link-form" class="rm-panel rich-text-link-panel" novalidate',
    'id="rich-text-link-input" type="url" inputmode="url"',
    'aria-errormessage="rich-text-link-error" aria-invalid="false"',
    'id="rich-text-link-error" class="rich-text-link-error" role="status" aria-live="polite" aria-atomic="true"',
    'id="rich-text-link-apply" class="btn-primary" type="submit"',
  ]) {
    assert.ok(html.includes(marker), `rich-text Link markup must retain ${marker}`);
  }
  assert.equal((html.match(/data-i18n-title="richText\./g) || []).length, 11,
    'every toolbar command must have a localized visual tooltip');
  assert.equal((html.match(/data-i18n-aria-label="richText\./g) || []).length, 13,
    'toolbar, commands, and dialog close must have localized accessible names');

  assert.match(css, /#modal-overlay,\s*#reminder-overlay,\s*#calendar-task-overlay,\s*#rich-text-link-overlay,/,
    'the Link dialog must share the modal overlay layer');
  assert.match(css, /\.rich-text-link-panel\s*\{[\s\S]*?max-height:\s*calc\(100dvh - 32px\);[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/,
    'the Link panel must keep its header, scrollable body, and actions in the viewport');
  assert.match(css, /#rich-text-link-input\[aria-invalid="true"\]\s*\{\s*border-color:\s*var\(--red\);\s*\}/,
    'invalid URL feedback must be visible without relying on text alone');
  assert.match(css, /#rt-toolbar button:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\);/,
    'toolbar keyboard focus must remain visible');
  assert.match(css, /@media screen and \(max-width:\s*520px\)\s*\{[\s\S]*?#rich-text-link-overlay\s*\{[^}]*align-items:\s*flex-end;/,
    'the Link dialog must remain reachable on narrow viewports');
  assert.match(css, /@media \(max-height:\s*520px\)\s*\{[\s\S]*?\.rich-text-link-panel\s*\{[\s\S]*?100dvh - 16px/,
    'the Link dialog must remain bounded at short viewport heights');
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?#rich-text-link-overlay,[\s\S]*?\.rich-text-link-panel\s*\{\s*animation:\s*none;\s*transition:\s*none;/,
    'the Link dialog must remove its own motion when reduced motion is requested');
}

function readI18n() {
  const startMarker = 'const I18N = ';
  const start = source.indexOf(startMarker);
  const trStart = source.indexOf('\nfunction tr(', start);
  const close = source.lastIndexOf('};', trStart);
  assert.ok(start >= 0 && trStart > start && close > start, 'I18N must remain extractable');
  const literal = source.slice(start + startMarker.length, close + 1);
  return vm.runInNewContext(`(${literal})`, {}, { filename: 'newtab-i18n-extract.js' });
}

function testLocalization() {
  const i18n = readI18n();
  const enKeys = Object.keys(i18n.en).filter(key => key.startsWith('detail.')).sort();
  const zhKeys = Object.keys(i18n['zh-TW']).filter(key => key.startsWith('detail.')).sort();
  assert.deepEqual(zhKeys, enKeys, 'English and zh-TW must expose the same item-detail vocabulary');

  const required = [
    'detail.close', 'detail.closeTitle', 'detail.open', 'detail.whySaved', 'detail.notesPlaceholder',
    'detail.reminder', 'detail.setReminder', 'detail.changeReminder', 'detail.clearReminder',
    'detail.closeReminderDialog', 'detail.tags', 'detail.more', 'detail.cover', 'detail.checklist',
    'detail.customFields', 'detail.history.editTitle', 'detail.history.editNotes',
    'detail.history.updateTags', 'detail.history.updateChecklist', 'detail.history.updateFields',
    'detail.saving', 'detail.saved', 'detail.changed', 'detail.saveFailed',
  ];
  required.forEach(key => {
    assert.equal(typeof i18n.en[key], 'string', `missing English ${key}`);
    assert.equal(typeof i18n['zh-TW'][key], 'string', `missing zh-TW ${key}`);
    assert.ok(i18n.en[key].trim() && i18n['zh-TW'][key].trim(), `${key} must not be blank`);
  });

  const usedKeys = new Set(
    [...detailImplementationSource().matchAll(/tr\(['"](detail\.[^'"]+)['"]/g)].map(match => match[1]),
  );
  usedKeys.forEach(key => {
    assert.ok(Object.hasOwn(i18n.en, key), `runtime detail key lacks English copy: ${key}`);
    assert.ok(Object.hasOwn(i18n['zh-TW'], key), `runtime detail key lacks zh-TW copy: ${key}`);
  });
  assert.equal(i18n['zh-TW']['detail.saving'], '正在儲存變更…');
  assert.equal(i18n['zh-TW']['detail.saved'], '變更已儲存');
  assert.equal(i18n['zh-TW']['detail.changed'], '這個項目已變更或移動。請重新開啟詳細資料後再試一次。');
  assert.equal(i18n['zh-TW']['detail.saveFailed'], 'Locus 無法確認這項變更是否已儲存。請重新載入最新資料後再繼續。');

  const mutationSource = extractFunction('commitItemDetailMutation');
  for (const key of ['detail.changed', 'detail.saveFailed', 'detail.saved']) {
    assert.ok(mutationSource.includes(`'${key}'`), `the receipt controller must wire localized ${key} feedback`);
  }
  assert.ok(extractFunction('setItemDetailMutationBusy').includes("'detail.saving'"),
    'the live pending state must use localized saving feedback');
  const detailRender = extractFunction('renderItemDetail');
  for (const token of [
    'data-idp-save-status', 'role="status"', 'aria-live="polite"', 'aria-atomic="true"',
  ]) assert.ok(detailRender.includes(token), `detail rendering must retain live status wiring: ${token}`);

  const enReminderKeys = Object.keys(i18n.en).filter(key => key.startsWith('reminder.')).sort();
  const zhReminderKeys = Object.keys(i18n['zh-TW']).filter(key => key.startsWith('reminder.')).sort();
  assert.deepEqual(zhReminderKeys, enReminderKeys, 'English and zh-TW must expose the same reminder-dialog vocabulary');
  for (const key of [
    'reminder.setTitle', 'reminder.editTitle', 'reminder.label', 'reminder.labelOptional',
    'reminder.inOneHour', 'reminder.inThreeHours', 'reminder.tomorrow', 'reminder.nextWeek',
    'reminder.pickDate', 'reminder.repeat', 'reminder.none', 'reminder.daily',
    'reminder.weekly', 'reminder.monthly', 'reminder.clear', 'reminder.remove',
    'reminder.update', 'reminder.set', 'reminder.futureTime',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  for (const marker of [
    'data-i18n="reminder.setTitle"', 'data-i18n="reminder.inOneHour"',
    'data-i18n="reminder.pickDate"', 'data-i18n="reminder.none"',
    'data-i18n="reminder.clear"', 'data-i18n="reminder.set"',
  ]) assert.ok(html.includes(marker), `reminder markup must retain ${marker}`);

  const enHomePreviewKeys = Object.keys(i18n.en).filter(key => key.startsWith('home.preview')).sort();
  const zhHomePreviewKeys = Object.keys(i18n['zh-TW']).filter(key => key.startsWith('home.preview')).sort();
  assert.deepEqual(zhHomePreviewKeys, enHomePreviewKeys,
    'English and zh-TW must expose the same Home recovery vocabulary');
  for (const key of [
    'home.previewOpen', 'home.previewUnavailable', 'home.previewType.tab',
    'home.previewType.note', 'home.previewType.todo', 'home.previewType.stack',
    'home.previewType.item',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  const rowSource = extractFunction('buildHomePreviewRow');
  assert.ok(rowSource.includes("tr('home.previewOpen'"),
    'the native Home row must use localized accessible-action copy');
  assert.ok(extractFunction('openHomePreviewItem').includes("tr('home.previewUnavailable')"),
    'stale Home recovery must use localized failure copy');

  const enRichTextKeys = Object.keys(i18n.en).filter(key => key.startsWith('richText.')).sort();
  const zhRichTextKeys = Object.keys(i18n['zh-TW']).filter(key => key.startsWith('richText.')).sort();
  assert.deepEqual(zhRichTextKeys, enRichTextKeys,
    'English and zh-TW must expose the same rich-text Link vocabulary');
  for (const key of [
    'richText.toolbar', 'richText.bold', 'richText.italic', 'richText.underline',
    'richText.strikethrough', 'richText.heading', 'richText.list', 'richText.link',
    'richText.red', 'richText.green', 'richText.yellow', 'richText.clear',
    'richText.dialogTitle', 'richText.closeDialog', 'richText.description',
    'richText.selectionLabel', 'richText.addressLabel', 'richText.addressPlaceholder',
    'richText.cancel', 'richText.apply', 'richText.invalidUrl',
    'richText.selectionChanged', 'richText.applyFailed',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  assert.equal(i18n['zh-TW']['richText.toolbar'], '文字格式');
  assert.equal(i18n['zh-TW']['richText.link'], '新增連結（Ctrl+K）');
  assert.equal(i18n['zh-TW']['richText.dialogTitle'], '新增連結');
  assert.equal(i18n['zh-TW']['richText.addressLabel'], '連結網址');
  assert.equal(i18n['zh-TW']['richText.invalidUrl'], '請輸入完整的 http:// 或 https:// 網址。');
  assert.equal(i18n['zh-TW']['richText.selectionChanged'], '所選文字已變更。請重新選取文字後再新增連結。');
  assert.equal(i18n['zh-TW']['richText.applyFailed'], 'Locus 無法新增連結。請重新選取文字後再試一次。');
}

function testResponsiveAndMotionCss() {
  assert.match(css, /\/\* Saved-item detail is a docked recovery sheet[\s\S]*?\.idp-panel\s*\{[\s\S]*?width:\s*min\(560px,\s*calc\(100vw - 24px\)\);/,
    'the Field Desk detail sheet must give the saved record enough width at 1280px and 800px');
  for (const contract of [
    /\.idp-docket-line\s*\{[^}]*display:\s*flex/,
    /\.idp-location\s*\{[^}]*white-space:\s*normal[^}]*overflow-wrap:\s*anywhere/,
    /\.idp-primary-sec \.idp-primary\s*\{[^}]*border:/,
    /\.idp-primary-sec \.idp-note-editor\s*\{[^}]*max-height:\s*220px/,
    /\.idp-primary-sec \.idp-todo-check\s*\{[^}]*width:\s*40px[^}]*height:\s*40px/,
    /\.idp-context-sec\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*104px minmax\(0,\s*1fr\)/,
    /\.idp-context-sec \.idp-btn\s*\{[^}]*min-height:\s*40px/,
    /\.idp-open\s*\{[^}]*min-height:\s*40px/,
    /\.idp-close\s*\{[^}]*width:\s*40px[^}]*height:\s*40px/,
    /@media \(max-width: 560px\)[\s\S]*?\.idp-context-sec\s*\{[^}]*grid-template-columns:\s*1fr/,
  ]) assert.match(css, contract, `saved-item docket CSS contract must hold: ${contract}`);
  assert.match(css, /@media\s*\(min-width:\s*900px\)\s*\{\s*#item-detail\s+\.idp-scrim\s*\{\s*background:\s*transparent;/,
    'wide layouts must preserve visible inert context');
  assert.match(css, /@media\s*\(max-width:\s*899px\)\s*\{\s*#item-detail\.open\s+\.idp-scrim\s*\{\s*opacity:\s*1;/,
    '800px layouts must visibly dim the inert background');

  const narrowStart = css.indexOf('@media (max-width: 520px) {', css.indexOf('ITEM DETAIL PANE'));
  const narrowEnd = css.indexOf('\n}', narrowStart) + 2;
  const narrow = css.slice(narrowStart, narrowEnd);
  assert.ok(narrow.includes('.idp-panel { width: 100vw; border-left: 0; }'));
  assert.ok(narrow.includes('.idp-hd { flex-wrap: wrap; }'));
  assert.ok(narrow.includes('.idp-actions { width: 100%; justify-content: flex-end; }'));
  assert.ok(narrow.includes('.idp-cf-row { align-items: stretch; flex-wrap: wrap; }'));
  assert.ok(narrow.includes('.idp-cf-label, .idp-cf-value { flex: 1 1 100%; min-width: 0; }'));

  const reducedStart = css.indexOf('@media (prefers-reduced-motion: reduce) {', narrowEnd);
  const reducedEnd = css.indexOf('\n}', reducedStart) + 2;
  const reduced = css.slice(reducedStart, reducedEnd);
  assert.ok(reduced.includes('.idp-panel, #item-detail .idp-scrim, .idp-swatch, .idp-marker-choice, .idp-advanced-summary::after { transition: none; }'));
  assert.ok(reduced.includes('.idp-panel { transform: none; }'));

  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?\.idp-primary-sec \.idp-primary,[\s\S]*?\.idp-context-sec,[\s\S]*?border-color:\s*CanvasText/,
    'forced colors must preserve the primary record and recovery-context boundaries');

  const homeRowRule = css.match(/\.home-prow\s*\{([\s\S]*?)\}/)?.[1] || '';
  assert.match(homeRowRule, /width:\s*100%/,
    'a native Home recovery row must retain the full preview width');
  assert.match(homeRowRule, /max-width:\s*100%/,
    'a native Home recovery row must not overflow its card');
  assert.match(homeRowRule, /appearance:\s*none/,
    'the button must reuse the Home visual language instead of native button chrome');
  assert.match(css, /\.home-prow:hover,\s*\.home-prow:focus-visible\s*\{\s*background:\s*var\(--bg3\);\s*\}/,
    'pointer and keyboard discovery must share the same row feedback on Inbox and Space cards');
  assert.match(css, /\.home-prow:active\s*\{\s*background:\s*var\(--bg4\);\s*\}/,
    'native Home recovery rows must expose a pressed state without ornamental movement');
  assert.match(css, /button:focus-visible,[\s\S]*?\{[\s\S]*?outline:\s*2px solid var\(--accent\)/,
    'the native Home button must inherit the visible global keyboard focus ring');

  const detailStatusRule = css.match(/\.idp-save-status\s*\{([\s\S]*?)\}/)?.[1] || '';
  assert.match(detailStatusRule, /width:\s*100%/,
    'receipt feedback must use the available detail-header width');
  assert.match(detailStatusRule, /overflow-wrap:\s*anywhere/,
    'English and zh-TW receipt feedback must wrap without overflowing narrow detail sheets');
  assert.match(css, /\.idp-save-status\[data-tone="pending"\]\s*\{\s*color:\s*var\(--accent\);\s*\}/,
    'pending feedback must use the shared theme accent token');
  assert.match(css, /\.idp-save-status\[data-tone="success"\]\s*\{\s*color:\s*var\(--green\);\s*\}/,
    'acknowledged feedback must use the shared success token');
  assert.match(css, /\.idp-save-status\[data-tone="error"\]\s*\{\s*color:\s*var\(--red\);\s*\}/,
    'failed or stale feedback must use the shared error token');
  assert.match(css, /\.idp-mutation-pending \.idp-actions \[aria-disabled="true"\],[\s\S]*?cursor:\s*wait;/,
    'the production pending class must visibly guard detail mutation controls');
}

function testLocalRecordDetailConvergence() {
  const note = extractFunction('buildNote');
  const todo = extractFunction('buildTodo');
  const common = extractFunction('commonActs');
  const opener = extractFunction('openBoardRecordDetail');
  const primary = extractFunction('detailPrimaryEditor');
  const marker = extractFunction('detailItemMarkerPicker');

  assert.match(note, /<button type="button" class="item-top board-record-body board-record-primary" data-item-primary="true"/,
    'a Note card must expose one native read-only primary route');
  assert.match(note, /openBoardRecordDetail\(it, event\.currentTarget, 'note-body'\)/,
    'the Note primary route must open Details at the real body editor');
  assert.doesNotMatch(note, /contenteditable|commitBoardNoteEdit|State\.(?:snapshot|persist)/,
    'a Note card must not retain an inline writer');
  assert.match(todo, /class="board-record-primary board-record-todo-primary" data-item-primary="true"/,
    'a To-do card must expose one native read-only primary route');
  assert.match(todo, /openBoardRecordDetail\(it, event\.currentTarget, 'task'\)/,
    'the To-do primary route must open Details at its task field');
  assert.doesNotMatch(todo, /contenteditable|commitBoardTodoTextEdit|State\.(?:snapshot|persist)/,
    'a To-do card must not retain an inline text writer');

  assert.match(opener, /focusDialogOpener\(opener\)[\s\S]*?openItemDetail\(item\.id, \{ initialFocusKey \}\)/,
    'card and menu entry must transfer a stable opener before routed focus');
  assert.match(common, /tr\('itemAction\.changeMarker'\)[\s\S]*?openBoardRecordDetail\(it, mutationOpener, itemMarkerFocusKey\(it\)\)/,
    'Change marker must route to the same Details sheet and named marker choice');
  for (const obsolete of [
    'showColorMenu', 'commitBoardItemColor', 'commitBoardNoteEdit', 'commitBoardTodoTextEdit',
    'flushActiveBoardNoteEditor', 'flushActiveBoardTodoTextEditor',
  ]) assert.equal(source.includes(`function ${obsolete}(`), false, `${obsolete} must be retired`);

  assert.match(primary, /it\.type === 'note'[\s\S]*?editor\.contentEditable = 'true'[\s\S]*?editor\.dataset\.idpFocus = 'note-body'/,
    'Details must own the Note body editor and its stable focus key');
  assert.match(primary, /autoLinkify\(sanitizeHtml\(rawHtml\)\)[\s\S]*?commit\(tr\('note\.history\.edit'\)/,
    'Note body edits must cross the sanitizer and shared detail receipt');
  assert.match(marker, /setAttribute\('role', 'radiogroup'\)[\s\S]*?setAttribute\('role', 'radio'\)/,
    'the detail marker picker must expose one named radiogroup of native buttons');
  assert.match(marker, /if \(color === 'custom'\) return;[\s\S]*?commit\(tr\('itemColor\.history'\)/,
    'the compatible custom marker must remain read-only while explicit choices use the detail receipt');
  assert.match(marker, /if \(color === 'none'\) delete live\.color;[\s\S]*?else live\.color = color/,
    'No color and named marker changes must mutate only the compatible color slot');
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
    assert.ok(marker.includes(`'${key}'`), `marker keyboard navigation must handle ${key}`);
  }

  assert.match(css, /\.board-record-primary\s*\{[^}]*width:\s*100%[^}]*background:\s*transparent/s,
    'read-only cards must keep one flat full-width recovery action');
  assert.match(css, /\.idp-marker-options\s*\{[^}]*grid-template-columns:\s*repeat\(6, 40px\)/s,
    'the detail marker choices must use one compact rectangular index row');
  assert.match(css, /\.idp-marker-choice\[data-marker="custom"\]\s*\{\s*background-color:\s*var\(--item-custom-color/s,
    'imported custom bytes must feed only a color property');
  assert.doesNotMatch(css, /\.color-menu|\.cdot\b/,
    'the duplicate anchored palette presentation must be removed');

  const i18n = readI18n();
  for (const key of [
    'itemAction.editNoteFor', 'itemAction.editTodo', 'itemAction.editTodoFor',
    'itemAction.changeMarker', 'itemColor.menuLabel', 'detail.emptyTodo',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  assert.equal(i18n['zh-TW']['itemAction.editTodo'], '編輯待辦事項');
  assert.equal(i18n['zh-TW']['itemAction.changeMarker'], '變更標記');
  assert.equal(i18n['zh-TW']['itemColor.menuLabel'], '記錄標記');
}

function testDetailMarkerPickerBehavior() {
  let activeElement = null;
  class FakeElement {
    constructor(tagName) {
      this.tagName = String(tagName || '').toUpperCase();
      this.children = [];
      this.dataset = {};
      this.attributes = {};
      this.listeners = {};
      this.className = '';
      this.tabIndex = 0;
      this.title = '';
      const properties = new Map();
      this.style = {
        setProperty(name, value) { properties.set(name, String(value)); },
        getPropertyValue(name) { return properties.get(name) || ''; },
      };
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
    appendChild(child) { this.children.push(child); return child; }
    focus() { activeElement = this; }
  }

  const item = { id: 'note-custom-marker', type: 'note', color: '#2f6f63' };
  const commits = [];
  const context = vm.createContext({
    __item: item,
    __commits: commits,
    document: { createElement: tagName => new FakeElement(tagName) },
    tr(key, values = {}) {
      if (key === 'itemColor.menuLabel') return 'Record marker';
      if (key === 'itemColor.none') return 'No color';
      if (key === 'groupEditor.color.custom') return 'Current custom color';
      if (key === 'groupEditor.colorOption') return `Use ${values.color}`;
      if (key.startsWith('groupEditor.color.')) return key.slice('groupEditor.color.'.length);
      return key;
    },
    __commit(label, mutate) {
      const candidate = { ...item };
      mutate(candidate);
      commits.push({ label, candidate });
      Object.keys(item).forEach(key => delete item[key]);
      Object.assign(item, candidate);
      return Promise.resolve(true);
    },
  });
  const markerConstant = source.match(/const ITEM_MARKER_COLORS = Object\.freeze\([^;]+;/)?.[0] || '';
  assert.ok(markerConstant, 'the compatible marker values must remain extractable');
  vm.runInContext(
    `${markerConstant}\n${extractFunction('itemMarkerChoice')}\n${extractFunction('detailItemMarkerPicker')}\n` +
      'globalThis.__picker = detailItemMarkerPicker(__item, __commit);',
    context,
    { filename: 'item-detail-marker-picker-contract.js' },
  );

  const choices = context.__picker.children;
  const custom = choices.find(choice => choice.dataset.marker === 'custom');
  const none = choices.find(choice => choice.dataset.marker === 'none');
  const red = choices.find(choice => choice.dataset.marker === 'red');
  assert.equal(choices.length, 7, 'a compatible imported marker must join the six explicit choices');
  assert.equal(context.__picker.getAttribute('role'), 'radiogroup');
  assert.equal(context.__picker.getAttribute('aria-label'), 'Record marker');
  assert.equal(custom.getAttribute('aria-checked'), 'true');
  assert.equal(custom.getAttribute('aria-label'), 'Current custom color');
  assert.equal(custom.style.getPropertyValue('--item-custom-color'), '#2f6f63');
  assert.equal(custom.tabIndex, 0);
  assert.equal(none.getAttribute('aria-checked'), 'false');
  custom.listeners.click[0]();
  assert.equal(commits.length, 0, 'activating the current custom marker must preserve its exact byte without a write');

  let prevented = false;
  custom.listeners.keydown[0]({ key: 'ArrowLeft', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(activeElement.dataset.marker, 'blue', 'arrow navigation must wrap through the roving marker controls');
  red.listeners.click[0]();
  assert.equal(commits.length, 1);
  assert.equal(commits[0].label, 'itemColor.history');
  assert.equal(item.color, 'red', 'an explicit named marker must use the supplied Details commit boundary');
}

async function main() {
  testLibraryRouting();
  testSurfaceRouteValidation();
  testHomePreviewResolutionAndRouting();
  testHomeRouteStateAndHistoryContract();
  testHomePreviewOpenContract();
  testHomePreviewRowAndReturnFocus();
  testModalAndHierarchyContracts();
  testBackgroundInertContract();
  testTabTrapFromContainerFocus();
  testEscapeStack();
  testEditFlushContracts();
  testItemDetailCandidateApplicationContract();
  await testReceiptGatedItemDetailMutationContract();
  await testReceiptGatedNonDetailItemReminderContract();
  await testReceiptGatedItemDetailReminderContract();
  await testReminderGlobalKeyContract();
  testRecoveryAboveReminderGlobalKeyContract();
  testItemDetailReminderStaticContract();
  await testItemDetailPageHideSingleWriteContract();
  testFocusRestoration();
  testRichTextLinkDialogContract();
  testRichTextLinkStaticContract();
  testLocalization();
  testLocalRecordDetailConvergence();
  testDetailMarkerPickerBehavior();
  testResponsiveAndMotionCss();

  console.log('Item detail contracts passed: receipt-gated fields/direct reminders, read-only local cards, Details-owned editing/markers, rich-text Link review, Home recovery, routing, modal focus, localization, hierarchy, and responsive motion.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
