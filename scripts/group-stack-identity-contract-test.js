'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const importUtils = require('../import-utils.js');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');

function extractFunctionRecord(name) {
  const signature = `function ${name}(`;
  const signatureStart = source.indexOf(signature);
  assert.ok(signatureStart >= 0, `${name} must exist in production`);
  const start = source.slice(Math.max(0, signatureStart - 6), signatureStart) === 'async '
    ? signatureStart - 6
    : signatureStart;
  const parametersStart = source.indexOf('(', signatureStart);
  let parameterDepth = 0;
  let parametersEnd = -1;
  for (let index = parametersStart; index < source.length; index += 1) {
    if (source[index] === '(') parameterDepth += 1;
    else if (source[index] === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        parametersEnd = index;
        break;
      }
    }
  }
  assert.ok(parametersEnd > parametersStart, `${name} must have balanced parameters`);
  const bodyStart = source.indexOf('{', parametersEnd);
  assert.ok(bodyStart > parametersEnd, `${name} must have a body`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return { start, end: index + 1, source: source.slice(start, index + 1) };
    }
  }
  assert.fail(`${name} must have a balanced body`);
}

function extractFunction(name) {
  return extractFunctionRecord(name).source;
}

function readI18n() {
  const startMarker = 'const I18N = ';
  const start = source.indexOf(startMarker);
  const trStart = source.indexOf('\nfunction tr(', start);
  const close = source.lastIndexOf('};', trStart);
  assert.ok(start >= 0 && trStart > start && close > start, 'I18N must remain extractable');
  return vm.runInNewContext(
    `(${source.slice(start + startMarker.length, close + 1)})`,
    {},
    { filename: 'group-stack-identity-i18n-extract.js' },
  );
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

class ClassList {
  constructor(...initial) { this.values = new Set(initial); }
  add(...values) { values.forEach(value => this.values.add(value)); }
  remove(...values) { values.forEach(value => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const next = force == null ? !this.values.has(value) : !!force;
    if (next) this.values.add(value); else this.values.delete(value);
    return next;
  }
}

function makeState() {
  return {
    activeWsId: 'ws-a',
    recentEmoji: [],
    workspaces: [
      {
        id: 'ws-a',
        name: 'Research',
        activeCatId: 'cat-a',
        categories: [
          {
            id: 'cat-a',
            name: 'Reading',
            groups: [
              {
                id: 'g-a', name: 'Sources', symbol: '📖', color: '#3b82f6', collapsed: false,
                items: [
                  { id: 't1', type: 'tab', title: 'One', url: 'https://one.example' },
                  { id: 't2', type: 'tab', title: 'Two', url: 'https://two.example' },
                  {
                    id: 's1', type: 'stack', name: 'Deep reads', symbol: '📚', color: '#6366f1', expanded: true,
                    items: [{ id: 't3', type: 'tab', title: 'Three', url: 'https://three.example' }],
                  },
                  { id: 's2', type: 'stack', name: 'Later', symbol: '📥', color: '#64748b', expanded: true, items: [] },
                ],
              },
              {
                id: 'g-b', name: 'Follow-up', symbol: '🧭', color: '#10b981', collapsed: false,
                items: [{ id: 't4', type: 'tab', title: 'Four', url: 'https://four.example' }],
              },
            ],
          },
          {
            id: 'cat-b',
            name: 'Archive room',
            groups: [
              {
                id: 'g-c', name: 'Elsewhere', symbol: '📦', color: '#f97316', collapsed: false,
                items: [{ id: 't5', type: 'tab', title: 'Five', url: 'https://five.example' }],
              },
            ],
          },
        ],
      },
      {
        id: 'ws-b',
        name: 'Personal',
        activeCatId: 'cat-c',
        categories: [
          {
            id: 'cat-c',
            name: 'Home',
            groups: [
              {
                id: 'g-d', name: 'Plans', symbol: '🏠', color: '#a855f7', collapsed: false,
                items: [{ id: 't6', type: 'tab', title: 'Six', url: 'https://six.example' }],
              },
            ],
          },
        ],
      },
    ],
  };
}

const controllerFunctions = [
  'organizationGroupTarget',
  'createOrganizationIdAllocator',
  'identitySpaceTarget',
  'identityGroupTarget',
  'identityItemTargets',
  'identityStackTarget',
  'identityFields',
  'identityFieldsFingerprint',
  'identitySelectionFingerprint',
  'identityGroupDuplicateFingerprint',
  'cloneGroupForDuplicate',
  'groupContainsReminderData',
  'cloneGroupLayoutValue',
  'getCanvasGroupEl',
  'canvasGroupFootprint',
  'canvasGroupRect',
  'canvasRectsOverlap',
  'findOpenCanvasPosition',
  'prepareGroupDuplicateLayout',
  'applyGroupDuplicateLayout',
  'reconcileDuplicatedGroupReminders',
  'reconcileRemindersAfterHistoryChange',
  'performUndo',
  'performRedo',
  'identityEditorPrefix',
  'paintIdentityEditor',
  'setIdentityEditorBusy',
  'setIdentityEditorError',
  'clearIdentityEditorError',
  'selectIdentityColor',
  'handleIdentityColorKeydown',
  'setIdentityEditorInterlock',
  'focusIdentityTarget',
  'focusIdentityFallback',
  'closeIdentityEditor',
  'closeModal',
  'prepareIdentityBatch',
  'rejectIdentityEditorOpen',
  'openIdentityEditor',
  'handleIdentityEditorKeydown',
  'handleIdentityEditorGlobalKey',
  'confirmIdentityEditor',
];

const controllerSource = [
  extractFunction('setElementInertOwner'),
  ...controllerFunctions.map(extractFunction),
].join('\n\n');
const i18n = readI18n();

function buildHarness({
  persistNow = async () => undefined,
  uidSequence = ['fresh-1'],
  selectedIds = [],
  locale = 'en',
  activeGroupPageId = null,
  latestActionId = 73,
  sendMessage = async () => ({ ok: true }),
  undo = async () => null,
  redo = async () => null,
  isRecoveryRequired = false,
} = {}) {
  const state = makeState();
  const calls = {
    snapshots: [], persists: 0, debouncedPersists: 0, renders: 0, toasts: [],
    locks: 0, unlocks: 0, traps: 0, recent: [],
    syncSelection: 0, toolbarRemovals: 0, uid: 0,
    textSelections: 0, messages: [], routes: [], recoveries: [],
  };
  const elements = new Map();
  const bodyChildren = [];
  const overlayChildren = new Set();
  const emojiChildren = new Set();

  const document = {
    activeElement: null,
    body: { children: bodyChildren },
    getElementById(id) { return elements.get(id) || null; },
    querySelectorAll(selector) {
      if (selector === '#color-row .csw') return colors;
      return [];
    },
    querySelector(selector) {
      if (selector === '.lv-add-row') return elements.get('lv-add-row');
      if (selector === '.add-col-btn') return elements.get('add-col-btn');
      if (selector === '#item-detail [data-idp-focus="stack-identity"]') return elements.get('detail-stack-identity');
      const groupId = selector.match(/\.gcol\[data-gid="([^"]+)"\]/)?.[1]
        || selector.match(/\.lv-group\[data-gid="([^"]+)"\]/)?.[1];
      if (groupId) {
        const exact = elements.get(`group-focus:${groupId}`);
        if (exact) return exact;
        const exists = state.workspaces.some(workspace => (workspace.categories || []).some(space => (
          (space.groups || []).some(group => String(group.id) === groupId)
        )));
        return exists ? elements.get('created-focus') : null;
      }
      const stackId = selector.match(/(?:\.item\.stack|\.lv-stack)\[data-id="([^"]+)"\]/)?.[1];
      if (stackId) {
        const exact = elements.get(`stack-focus:${stackId}`);
        if (exact) return exact;
        const contains = items => (items || []).some(item => (
          String(item.id) === stackId || (item.type === 'stack' && contains(item.items))
        ));
        const exists = state.workspaces.some(workspace => (workspace.categories || []).some(space => (
          (space.groups || []).some(group => contains(group.items))
        )));
        return exists ? elements.get('created-focus') : null;
      }
      return null;
    },
  };

  function makeElement(id, classes = [], { bodyChild = false, overlayChild = false, emojiChild = false } = {}) {
    const element = {
      id,
      classList: new ClassList(...classes),
      dataset: {},
      attributes: new Map(),
      value: '',
      textContent: '',
      title: '',
      disabled: false,
      hidden: false,
      inert: false,
      isConnected: true,
      tabIndex: 0,
      style: {
        values: new Map(),
        setProperty(name, value) { this.values.set(name, String(value)); },
        removeProperty(name) { this.values.delete(name); },
        getPropertyValue(name) { return this.values.get(name) || ''; },
      },
      setAttribute(name, value) { this.attributes.set(name, String(value)); },
      getAttribute(name) { return this.attributes.get(name); },
      removeAttribute(name) { this.attributes.delete(name); },
      matches(selector) { return selector === '#color-row .csw' && this.classList.contains('csw'); },
      contains(target) {
        return target === this
          || (id === 'modal-overlay' && overlayChildren.has(target))
          || (id === 'emoji-picker' && emojiChildren.has(target));
      },
      focus() {
        if (this.isConnected !== false && !this.inert && !this.disabled) document.activeElement = this;
      },
      select() {
        calls.textSelections += 1;
        this.focus();
      },
      remove() {
        this.isConnected = false;
        if (id === 'item-sel-toolbar') calls.toolbarRemovals += 1;
      },
    };
    elements.set(id, element);
    if (bodyChild) bodyChildren.push(element);
    if (overlayChild) overlayChildren.add(element);
    if (emojiChild) emojiChildren.add(element);
    return element;
  }

  const app = makeElement('app', [], { bodyChild: true });
  const overlay = makeElement('modal-overlay', ['hidden'], { bodyChild: true });
  const recovery = makeElement('state-recovery-overlay', ['hidden'], { bodyChild: true });
  const emoji = makeElement('emoji-picker', ['hidden'], { bodyChild: true });
  const organizationName = makeElement('organization-name-overlay', ['hidden'], { bodyChild: true });
  const organizationDelete = makeElement('organization-delete-overlay', ['hidden'], { bodyChild: true });
  makeElement('modal', [], { overlayChild: true });
  makeElement('modal-title', [], { overlayChild: true });
  makeElement('modal-x', [], { overlayChild: true });
  makeElement('lbl-symbol', [], { overlayChild: true });
  makeElement('emoji-trigger-hint', [], { overlayChild: true });
  const symbolTrigger = makeElement('emoji-trigger', [], { overlayChild: true });
  makeElement('emoji-trigger-val', [], { overlayChild: true });
  makeElement('modal-name-label', [], { overlayChild: true });
  const input = makeElement('modal-input', [], { overlayChild: true });
  makeElement('lbl-color', [], { overlayChild: true });
  const description = makeElement('modal-description', [], { overlayChild: true });
  description.hidden = true;
  const error = makeElement('modal-error', [], { overlayChild: true });
  error.hidden = true;
  const cancel = makeElement('modal-cancel', [], { overlayChild: true });
  const modalOk = makeElement('modal-ok', [], { overlayChild: true });
  const modalX = elements.get('modal-x');
  makeElement('ep-search-input', [], { emojiChild: true });
  makeElement('ep-grid', [], { emojiChild: true });
  const colors = [
    ['#6366f1', 'indigo'], ['#3b82f6', 'blue'], ['#06b6d4', 'cyan'],
    ['#10b981', 'green'], ['#84cc16', 'lime'], ['#eab308', 'yellow'],
    ['#f97316', 'orange'], ['#ef4444', 'red'], ['#ec4899', 'pink'],
    ['#a855f7', 'purple'], ['#64748b', 'slate'],
  ].map(([color, key], index) => {
    const button = makeElement(`color-${key}`, ['csw', ...(index === 0 ? ['active'] : [])], { overlayChild: true });
    button.dataset.c = color;
    button.dataset.colorKey = key;
    button.tabIndex = index === 0 ? 0 : -1;
    return button;
  });
  const customColor = makeElement('identity-custom-color', ['csw', 'identity-custom-color'], { overlayChild: true });
  customColor.dataset.c = '';
  customColor.dataset.colorKey = 'custom';
  customColor.tabIndex = -1;
  customColor.hidden = true;
  colors.push(customColor);
  const opener = makeElement('identity-opener');
  makeElement('lv-add-row');
  makeElement('add-col-btn');
  const board = makeElement('board');
  board.clientWidth = 960;
  board.scrollLeft = 0;
  board.scrollTop = 0;
  makeElement('created-focus');
  makeElement('group-focus:g-a');
  makeElement('stack-focus:s1');
  const toolbar = makeElement('item-sel-toolbar', [], { bodyChild: true });
  const detail = makeElement('item-detail');
  detail.dataset.itemId = '';
  makeElement('detail-stack-identity');
  document.activeElement = opener;

  let uidIndex = 0;
  let currentLocale = locale;
  const selectedItemIds = new Set(selectedIds.map(String));
  const openers = new WeakMap();
  let context;

  const State = {
    get() { return state; },
    snapshot(label) {
      calls.snapshots.push({ label, state: plain(state) });
      return 73;
    },
    async persistNow() {
      calls.persists += 1;
      return persistNow();
    },
    persist() { calls.debouncedPersists += 1; },
    undo(expectedActionId) { return undo(expectedActionId); },
    redo() { return redo(); },
    latestActionId() {
      return typeof latestActionId === 'function' ? latestActionId() : latestActionId;
    },
    isRecoveryRequired() {
      return typeof isRecoveryRequired === 'function' ? isRecoveryRequired() : !!isRecoveryRequired;
    },
  };

  context = vm.createContext({
    document,
    State,
    LocusImportUtils: { collectEntityIds: importUtils.collectEntityIds },
    uid() {
      calls.uid += 1;
      const value = uidSequence[Math.min(uidIndex, uidSequence.length - 1)];
      uidIndex += 1;
      return value;
    },
    tr(key, vars = {}) {
      const dictionary = i18n[currentLocale] || i18n.en;
      return String(dictionary[key] || i18n.en[key] || key)
        .replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
    },
    stampNew(entity) { return entity; },
    focusDialogOpener(element) { element?.focus(); },
    rememberOpener(element) { openers.set(element, document.activeElement); },
    restoreOpener(element) {
      const target = openers.get(element);
      openers.delete(element);
      if (!target || target.isConnected === false || target.inert || target.disabled) return false;
      target.focus();
      return document.activeElement === target;
    },
    _overlayOpeners: openers,
    lockBodyScroll() { calls.locks += 1; },
    unlockBodyScroll() { calls.unlocks += 1; },
    trapTabKey() { calls.traps += 1; },
    closeEmojiPicker() { emoji.classList.add('hidden'); return true; },
    emojiPickerCtx: null,
    renderAll() { calls.renders += 1; },
    activeGroupPage: activeGroupPageId ? { groupId: activeGroupPageId, itemId: null } : null,
    Router: {
      navigate(route, options) {
        calls.routes.push({ route: plain(route), options: plain(options) });
        if (options?.persist !== false) State.persist();
        calls.renders += 1;
      },
    },
    toast(message, options) { calls.toasts.push({ message, options }); },
    showStateRecoveryRequired(error) {
      calls.recoveries.push(error?.message || 'recovery');
      recovery.classList.remove('hidden');
      recovery.focus();
    },
    getComputedStyle() {
      return { getPropertyValue(name) { return name === '--gw' ? '290' : ''; } };
    },
    window: { innerHeight: 720 },
    chrome: {
      runtime: {
        sendMessage(message) {
          calls.messages.push(plain(message));
          return sendMessage(message);
        },
      },
    },
    rememberRecentEmoji(symbol) {
      calls.recent.push(symbol);
      const at = state.recentEmoji.indexOf(symbol);
      if (at >= 0) state.recentEmoji.splice(at, 1);
      state.recentEmoji.unshift(symbol);
    },
    selectedItemIds,
    explicitSelMode: selectedItemIds.size > 0,
    lastSelectedItemId: selectedItemIds.size ? [...selectedItemIds].at(-1) : null,
    syncItemSelMode() { calls.syncSelection += 1; },
    setTimeout(callback) { callback(); return 1; },
    requestAnimationFrame(callback) { callback(); return 1; },
    CSS: { escape(value) { return String(value); } },
    JSON,
    Set,
    String,
  });

  vm.runInContext(
    `let modalCtx = null;\nlet modalBusy = false;\n${controllerSource}\n` +
      'globalThis.__identity = {\n' +
      '  organizationGroupTarget, createOrganizationIdAllocator, identitySpaceTarget, identityGroupTarget,\n' +
      '  identityItemTargets, identityStackTarget, identityFieldsFingerprint, identitySelectionFingerprint,\n' +
      '  prepareIdentityBatch, openIdentityEditor, closeIdentityEditor, confirmIdentityEditor,\n' +
      '  handleIdentityEditorKeydown, handleIdentityEditorGlobalKey, handleIdentityColorKeydown,\n' +
      '  selectIdentityColor, clearIdentityEditorError, paintIdentityEditor,\n' +
      '  canvasGroupFootprint, canvasGroupRect, canvasRectsOverlap, findOpenCanvasPosition,\n' +
      '  performUndo, performRedo, reconcileRemindersAfterHistoryChange,\n' +
      '  getContext: () => modalCtx, getBusy: () => modalBusy,\n' +
      '};',
    context,
    { filename: 'group-stack-identity-production-contract.js' },
  );

  function setInput(value) {
    input.value = value;
    const editorContext = context.__identity.getContext();
    if (editorContext) {
      editorContext.draftName = value;
      editorContext.nameTouched = true;
    }
  }

  return {
    api: context.__identity,
    context,
    state,
    calls,
    elements,
    document,
    overlay,
    recovery,
    emoji,
    organizationName,
    organizationDelete,
    app,
    opener,
    input,
    symbolTrigger,
    error,
    cancel,
    modalOk,
    modalX,
    toolbar,
    colors,
    customColor,
    selectedItemIds,
    setInput,
    setLocale(value) { currentLocale = value; },
  };
}

function eventFor(key, target, { shiftKey = false } = {}) {
  return {
    key,
    target,
    shiftKey,
    defaultPrevented: false,
    propagationStopped: false,
    immediatePropagationStopped: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagationStopped = true; },
    stopImmediatePropagation() { this.immediatePropagationStopped = true; },
  };
}

function groupEntityIds(group) {
  const ids = [];
  const visitItems = items => (items || []).forEach(item => {
    ids.push(String(item.id));
    if (item.type === 'stack') visitItems(item.items);
  });
  ids.push(String(group.id));
  visitItems(group.items);
  return ids;
}

function normalizeGroupEntityIds(group) {
  const normalized = plain(group);
  const visitItems = items => (items || []).forEach(item => {
    item.id = '<entity-id>';
    if (item.type === 'stack') visitItems(item.items);
  });
  normalized.id = '<entity-id>';
  visitItems(normalized.items);
  return normalized;
}

function assertDetachedGroupClone(sourceGroup, copiedGroup) {
  assert.notEqual(copiedGroup, sourceGroup, 'The copied Group object must be detached from its source');
  assert.notEqual(copiedGroup.items, sourceGroup.items, 'The copied Group items array must be detached');
  const visitItems = (sourceItems, copiedItems) => {
    assert.equal(copiedItems.length, sourceItems.length, 'The copied tree must retain its complete recursive shape');
    for (let index = 0; index < sourceItems.length; index += 1) {
      const sourceItem = sourceItems[index];
      const copiedItem = copiedItems[index];
      assert.notEqual(copiedItem, sourceItem, `Copied item ${sourceItem.id} must be a distinct object`);
      if (sourceItem.type === 'stack') {
        assert.notEqual(copiedItem.items, sourceItem.items, `Copied Stack ${sourceItem.id} must own a distinct child array`);
        visitItems(sourceItem.items || [], copiedItem.items || []);
      }
    }
  };
  visitItems(sourceGroup.items || [], copiedGroup.items || []);
}

function enrichDuplicateSource(harness) {
  const sourceGroup = harness.state.workspaces[0].categories[0].groups[0];
  const sourceStack = sourceGroup.items.find(item => item.id === 's1');
  sourceGroup.reminders = [{
    id: 'group-reminder', at: 1893456000000, recur: 'weekly', custom: { imported: true },
  }];
  sourceGroup.customFields = {
    provenance: 'import-v2', rank: 7, flags: ['trusted', 'review'], nested: { retained: true },
  };
  sourceGroup.items[0].reminder = {
    id: 'item-reminder', at: 1893542400000, recur: 'daily', custom: { timezone: 'Asia/Taipei' },
  };
  sourceGroup.items[0].customFields = { readingProgress: 0.625, labels: ['primary'] };
  sourceStack.customFields = { importedDensity: 'compact', confidence: 0.91 };
  sourceStack.items.push({
    id: 's-deep', type: 'stack', name: 'Nested evidence', symbol: 'N', color: '#0f766e', expanded: false,
    customFields: { depth: 2, retained: true },
    items: [{
      id: 't-deep', type: 'note', title: 'Recovered note', content: 'Local-only evidence',
      reminder: { id: 'deep-reminder', at: 1893628800000, recur: 'none' },
      customFields: { origin: 'legacy-import', score: 4 },
    }],
  });
  return sourceGroup;
}

function seedDuplicateCollisionState(harness) {
  const state = harness.state;
  const space = state.workspaces[0].categories[0];
  state.archive = [{
    kind: 'group', wsId: 'restore-ws-hint', catId: 'restore-space-hint', groupId: 'restore-group-hint',
    data: {
      id: 'archive-group-id', name: 'Stored group', items: [
        { id: 'archive-item-id', type: 'tab', title: 'Stored', url: 'https://archive.example' },
      ],
    },
  }];
  state.trash = [{
    kind: 'item', wsId: 'trash-ws-hint', catId: 'trash-space-hint', groupId: 'trash-group-hint',
    data: { id: 'trash-item-id', type: 'tab', title: 'Deleted', url: 'https://trash.example' },
  }];
  state.settings = {
    captureLastTarget: {
      workspaceId: 'capture-ws-hint', categoryId: 'capture-space-hint', groupId: 'capture-group-hint',
    },
    captureDefaultCategoryId: 'capture-default-space-hint',
  };
  state.columnSizes = {
    'g-a': { w: 348, h: 412, density: 'compact', custom: { imported: true } },
    'g-b': null,
    'layout-key-hint': { w: 999 },
  };
  state.columnWidths = { 'g-a': 348, 'g-b': 410, 'width-key-hint': 999 };
  space.canvasPositions = {
    'g-a': { x: 30, y: 30 },
    'g-b': { x: 370, y: 30 },
    'canvas-key-hint': { x: 999, y: 999 },
  };
  return {
    space,
    sourceGroup: enrichDuplicateSource(harness),
    collisionIds: [
      'g-b',
      'archive-group-id',
      'trash-item-id',
      'restore-group-hint',
      'capture-group-hint',
      'layout-key-hint',
      'width-key-hint',
      'canvas-key-hint',
    ],
  };
}

function duplicateParams(groupId = 'g-a') {
  return { workspaceId: 'ws-a', spaceId: 'cat-a', groupId };
}

function testStaticReachabilityAndLegacyRemoval() {
  assert.doesNotMatch(source, /\bfunction\s+createGroup\s*\(/, 'Standalone Group creation must not bypass the identity transaction');
  assert.doesNotMatch(source, /\b(?:function\s+)?openModal\s*\(/,
    'The dead legacy modal compatibility seam must remain removed');
  assert.doesNotMatch(source, /\b(?:function\s+)?confirmModal\s*\(/,
    'The dead legacy confirmation compatibility seam must remain removed');
  for (const legacyMode of ['new-group', 'edit-group', 'new-stack']) {
    assert.ok(!source.includes(`'${legacyMode}'`) && !source.includes(`"${legacyMode}"`), `${legacyMode} must not remain as a legacy modal mode`);
  }

  const entryContracts = [
    ['buildEmptySpaceState', /openIdentityEditor\('group',\s*'create'/],
    ['renderBoardView', /openIdentityEditor\('group',\s*'create'/],
    ['renderListView', /openIdentityEditor\('group',\s*'create'/],
    ['buildGroupCol', /openIdentityEditor\('group',\s*'edit'/],
    ['buildLvGroup', /openIdentityEditor\('group',\s*'edit'/],
    ['buildStack', /openIdentityEditor\('stack',\s*'edit'/],
    ['buildLvStack', /openIdentityEditor\('stack',\s*'edit'/],
    ['detailPrimaryEditor', /openIdentityEditor\('stack',\s*'edit'/],
  ];
  for (const [name, expected] of entryContracts) {
    assert.match(extractFunction(name), expected, `${name} must route identity changes through the shared controller`);
  }

  const boardGroup = extractFunction('buildGroupCol');
  const listGroup = extractFunction('buildLvGroup');
  const groupMenu = extractFunction('groupActionMenuItems');
  assert.equal((source.match(/openIdentityEditor\('group',\s*'duplicate'/g) || []).length, 1,
    'Board and List Duplicate must share one Group action model');
  assert.match(
    groupMenu,
    /action:\s*\(\) => openIdentityEditor\('group',\s*'duplicate',\s*identityParams,\s*opener\)/,
    'Group Duplicate must pass the stable identity tuple and exact visible opener to the shared editor',
  );
  assert.match(
    groupMenu,
    /identityGroupTarget\(group\?\.id\)[\s\S]*?identity\.group !== group[\s\S]*?return \[.*openIdentityEditor\('group',\s*'duplicate'/s,
    'the shared Group action model must fail closed on a stale or ambiguous rendered Group',
  );
  assert.match(boardGroup, /groupActionMenuItems\(g, opener,/, 'Board and Canvas must consume the shared Group action model');
  assert.match(listGroup, /groupActionMenuItems\(g, opener,/, 'List must consume the shared Group action model');
  const boardStack = extractFunction('buildStack');
  const listStack = extractFunction('buildLvStack');
  const stackMenu = extractFunction('stackActionMenuItems');
  assert.match(
    stackMenu,
    /Array\.isArray\(options\.parentItems\)[\s\S]*?options\.group[\s\S]*?identityStackTarget\(stack\?\.id\)[\s\S]*?identity\.item !== stack[\s\S]*?identity\.parentItems !== options\.parentItems[\s\S]*?identity\.group !== options\.group[\s\S]*?return \[/,
    'the shared Stack action model must fail closed on stale, moved, or ambiguous rendered identity',
  );
  assert.match(
    stackMenu,
    /openIdentityEditor\('stack',\s*'edit',\s*identityParams,\s*opener\)/,
    'Stack Edit must pass the stable identity tuple and exact visible opener to the shared editor',
  );
  assert.match(boardStack, /stackActionMenuItems\(it, opener, \{[\s\S]*?parentItems,[\s\S]*?group,/, 'Board Stack must consume the shared action model with its rendered owner');
  assert.match(listStack, /stackActionMenuItems\(it, opener, \{[\s\S]*?parentItems,[\s\S]*?group,/, 'List Stack must consume the shared action model with its rendered owner');
  assert.doesNotMatch(source, /\bfunction\s+duplicateGroup\s*\(/,
    'Duplicate must not retain a first-match legacy mutation path outside the identity controller');

  for (const name of ['buildGroupCol', 'buildLvGroup', 'buildStack', 'buildLvStack']) {
    const implementation = extractFunction(name);
    assert.doesNotMatch(implementation, /\bprompt\s*\(/, `${name} must not use a native naming prompt`);
    assert.doesNotMatch(implementation, /\.ondblclick\s*=/, `${name} must not retain mouse-only double-click naming`);
  }
  assert.match(
    extractFunction('buildGroupCol'),
    /<button class="gcol-name" type="button" data-act="focus"/,
    'Board Group names may be native page routes but must not become inline editors',
  );
  assert.doesNotMatch(
    extractFunction('buildGroupCol'),
    /class="gcol-name"[^>]*contenteditable/,
    'Board Group names must keep naming inside the exact identity transaction',
  );
  assert.match(extractFunction('buildLvGroup'), /<button class="lv-group-name" type="button" data-act="focus"/, 'List Group names must be native page routes, not inline editors');
  assert.doesNotMatch(extractFunction('buildLvGroup'), /class="lv-group-name"[^>]*contenteditable/, 'List Group names must keep naming inside the exact identity transaction');
  assert.match(extractFunction('buildStack'), /<span class="stack-name"/, 'Board Stack names must be display text, not inline editors');
  assert.match(extractFunction('buildLvStack'), /<span class="lv-stack-name"/, 'List Stack names must be display text, not inline editors');

  const batch = extractFunction('runBatchAction');
  assert.match(
    batch,
    /if \(act === 'stack'\) \{\s*openIdentityEditor\('stack',\s*'batch-create',\s*\{\s*itemIds:\s*\[\.\.\.selectedItemIds\]\s*\},\s*opener\);\s*return;/,
    'Batch Stack must open the transaction with the exact selected stable IDs',
  );
  const stackStart = batch.indexOf("if (act === 'stack')");
  const stackReturn = batch.indexOf('return;', stackStart);
  const stackEnd = batch.indexOf('\n  }', stackReturn);
  const stackBranch = batch.slice(stackStart, stackEnd + 4);
  assert.doesNotMatch(stackBranch, /State\.(?:snapshot|persist|persistNow)\s*\(/, 'Batch Stack opening must not mutate or persist before confirmation');
  assert.doesNotMatch(stackBranch, /\bprompt\s*\(/, 'Batch Stack must not name itself with a native prompt');
}

function testStaticTransactionContracts() {
  const itemTargets = extractFunction('identityItemTargets');
  assert.match(itemTargets, /matches\.get\(id\)\.length !== 1/, 'Duplicate or missing item IDs must fail closed');
  assert.match(itemTargets, /ancestorStackIds/, 'Selection resolution must retain ancestry for nested-selection rejection');
  assert.match(itemTargets, /parentKey:/, 'Stack edits must retain a stable parent fingerprint');

  const prepare = extractFunction('prepareIdentityBatch');
  assert.match(prepare, /ids\.length < 2/, 'Batch creation must reject fewer than two unique IDs');
  assert.match(prepare, /resolved\.nested/, 'Batch creation must reject ancestor/descendant selections');
  assert.match(prepare, /spaces\.size !== 1/, 'Batch creation must reject cross-Space selections');

  const open = extractFunction('openIdentityEditor');
  assert.match(open, /entityId:\s*target\.group\.id/, 'Group edits must retain a stable Group ID');
  assert.match(open, /entityId:\s*target\.item\.id/, 'Stack edits must retain a stable Stack ID');
  assert.match(open, /batchIds:\s*targets\.map\(target => String\(target\.item\.id\)\)/, 'Batch contexts must retain primitive selected IDs');
  assert.match(open, /batchBaseline:\s*identitySelectionFingerprint\(targets\)/, 'Batch contexts must retain a location fingerprint');
  assert.doesNotMatch(open, /(?:group|space|workspace|item):\s*target\.(?:group|space|workspace|item)/, 'Identity contexts must not retain mutable entity references');
  const duplicateOpenStart = open.indexOf("entityKind === 'group' && operation === 'duplicate'");
  const duplicateOpenEnd = open.indexOf("entityKind === 'group' && operation === 'edit'", duplicateOpenStart);
  const duplicateOpen = open.slice(duplicateOpenStart, duplicateOpenEnd);
  assert.match(duplicateOpen, /state\.activeWsId !== target\.workspace\.id[\s\S]*target\.workspace\.activeCatId !== target\.space\.id/,
    'Duplicate opening must reject an inactive Workspace or Space');
  assert.match(duplicateOpen, /entityId:\s*target\.group\.id[\s\S]*baseline:\s*identityGroupDuplicateFingerprint\(target\)/,
    'Duplicate opening must retain only stable IDs, display scalars, and a detached baseline fingerprint');
  assert.match(open, /operation === 'duplicate'[\s\S]*typeof target\.select === 'function'\) target\.select\(\)/,
    'Duplicate opening must focus and select its proposed copy name for efficient keyboard confirmation');

  const confirm = extractFunction('confirmIdentityEditor');
  assert.equal((confirm.match(/State\.snapshot\s*\(/g) || []).length, 1, 'Confirmation must take exactly one history snapshot');
  assert.equal((confirm.match(/State\.persistNow\s*\(/g) || []).length, 1, 'Confirmation must make exactly one immediate persistence attempt');
  assert.match(confirm, /await State\.persistNow\(\)/, 'Confirmation must await the persistence receipt');
  assert.doesNotMatch(confirm, /State\.persist\s*\(/, 'Confirmation must not fall back to debounced persistence');
  assert.match(confirm, /const allocateId = createOrganizationIdAllocator\(\);/,
    'Every create operation must use one transaction-scoped collision-safe organization ID allocator');
  assert.match(confirm, /duplicatedGroup = cloneGroupForDuplicate\(target\.group, allocateId\)/,
    'Duplicate must rekey the full detached Group tree through that single allocator');
  assert.match(confirm, /identityFieldsFingerprint[\s\S]*setIdentityEditorError\('groupEditor\.changed'\)/, 'Concurrent Group edits must reload for review');
  assert.match(confirm, /target\.parentKey !== ctx\.parentKey/, 'Moved or reparented Stacks must fail closed');
  assert.match(confirm, /identitySelectionFingerprint\(batchTargets\) !== ctx\.batchBaseline/, 'Batch selection locations must be revalidated before mutation');
  assert.match(confirm, /if \(ctx\.colorChosen\) target\.group\.color = color;/,
    'Group edits must not persist an untouched fallback or imported custom color');
  assert.match(confirm, /if \(ctx\.colorChosen\) target\.item\.color = color;/,
    'Stack edits must not persist an untouched fallback or imported custom color');
  assert.match(confirm, /if \(!ctx\.nameTouched\) name = String\(target\.group\.name \|\| ''\)/,
    'Untouched imported Group names must bypass display-time trimming');
  assert.match(confirm, /if \(!ctx\.nameTouched\) name = String\(target\.item\.name \|\| ''\)/,
    'Untouched imported Stack names must bypass display-time trimming');
  assert.match(confirm, /if \(ctx\.nameTouched\) target\.group\.name = name;/,
    'Only an intentional Group-name edit may normalize its raw stored name');
  assert.match(confirm, /if \(ctx\.nameTouched\) target\.item\.name = name;/,
    'Only an intentional Stack-name edit may normalize its raw stored name');

  const duplicateFingerprint = extractFunction('identityGroupDuplicateFingerprint');
  assert.match(duplicateFingerprint, /spaceName:\s*target\?\.space\?\.name[\s\S]*group:\s*target\?\.group/,
    'Duplicate stale detection must cover source content and its visible destination name');
  const cloneDuplicate = extractFunction('cloneGroupForDuplicate');
  assert.match(cloneDuplicate, /JSON\.parse\(JSON\.stringify\(source\)\)/,
    'Duplicate must begin from a detached JSON-compatible clone');
  assert.match(cloneDuplicate, /copy\.id = allocateId\(\)/,
    'Duplicate must allocate a fresh Group ID');
  assert.match(cloneDuplicate, /item\.id = allocateId\(\)[\s\S]*item\.type === 'stack'[\s\S]*rekeyItems\(item\.items\)/,
    'Duplicate must recursively allocate fresh nested entity IDs');
  const prepareLayout = extractFunction('prepareGroupDuplicateLayout');
  assert.match(prepareLayout, /\['columnSizes', 'columnWidths'\]/,
    'Duplicate must preserve both persisted Group sizing records');
  assert.match(prepareLayout, /const effectiveSizes = \{ \.\.\.legacySizes \};[\s\S]*Object\.entries\(currentSizes\)[\s\S]*savedSize != null[\s\S]*effectiveSizes\[groupId\] = savedSize/,
    'Duplicate Canvas placement must merge partial legacy/current sizes with renderer-matching nullish fallback');
  assert.match(
    prepareLayout,
    /findOpenCanvasPosition\([\s\S]*duplicate\.group,[\s\S]*\[\.\.\.space\.groups, duplicate\.group\],[\s\S]*positions,[\s\S]*effectiveSizes\[duplicate\.sourceId\],[\s\S]*effectiveSizes,/,
    'Duplicate must prepare a non-overlapping Canvas position with copied and occupied Group sizes before the transactional write',
  );
  const applyLayout = extractFunction('applyGroupDuplicateLayout');
  assert.match(applyLayout, /state\[entry\.key\]\[duplicate\.group\.id\] = entry\.value/,
    'Duplicate must apply cloned sizing records under only the fresh Group ID');
  assert.match(applyLayout, /space\.canvasPositions\[duplicate\.group\.id\] = layout\.canvasPosition/,
    'Duplicate must apply only the prepared fresh Canvas key');
  const reconcile = extractFunction('reconcileDuplicatedGroupReminders');
  assert.match(reconcile, /if \(!groupContainsReminderData\(group\)\) return;/,
    'Reminder reconciliation must remain conditional on copied reminder data');
  assert.match(reconcile, /chrome\.runtime\.sendMessage\(\{ type: 'reconcile-reminders' \}\)/,
    'Acknowledged reminder-bearing copies must request one background reconciliation');
  assert.match(reconcile, /result\?\.ok !== true/,
    'Reminder reconciliation must require an explicit background acknowledgement');
  assert.match(reconcile, /duplicateReminderWarning[\s\S]*tone:\s*'warning'[\s\S]*undo:\s*actionId/,
    'A reconciliation warning must preserve the exact Duplicate Undo action');
  assert.match(reconcile, /current\?\.group === group && State\.latestActionId\(\) === actionId[\s\S]*history\.reminderReconcileWarning/,
    'A delayed reconciliation failure must drop stale exact-Undo affordances after the copy or action changes');
  const historyReconcile = extractFunction('reconcileRemindersAfterHistoryChange');
  assert.match(historyReconcile, /chrome\.runtime\.sendMessage\(\{ type: 'reconcile-reminders' \}\)/,
    'Undo and Redo must request a fresh authoritative reminder map after their acknowledged state write');
  assert.match(historyReconcile, /history\.reminderReconcileWarning[\s\S]*tone:\s*'warning'/,
    'A failed post-history reconciliation must expose a localized warning with a recovery path');
  assert.match(extractFunction('performUndo'), /await State\.undo[\s\S]*reconcileRemindersAfterHistoryChange\(\)/,
    'Duplicate Undo must reconcile only after its persistence receipt');
  assert.match(extractFunction('performRedo'), /await State\.redo[\s\S]*reconcileRemindersAfterHistoryChange\(\)/,
    'Duplicate Redo must reconcile only after its persistence receipt');

  assert.match(confirm, /ctx\.operation === 'duplicate' && ctx\.openedFromGroupPage[\s\S]*Router\.navigate\([\s\S]*groupId:\s*entityId[\s\S]*\{ persist:\s*false \}\)/,
    'Focused-Group Duplicate must route to the acknowledged copy without creating a second state write');

  const duplicateAllocationIndex = confirm.indexOf('duplicatedGroup = cloneGroupForDuplicate');
  const duplicateLayoutIndex = confirm.indexOf('duplicateLayout = prepareGroupDuplicateLayout');
  const snapshotIndex = confirm.indexOf('State.snapshot');
  assert.ok(duplicateAllocationIndex >= 0 && duplicateLayoutIndex > duplicateAllocationIndex && snapshotIndex > duplicateLayoutIndex,
    'Duplicate cloning, complete ID allocation, and layout preparation must finish before history or graph mutation');

  const colorSelection = extractFunction('selectIdentityColor');
  assert.match(colorSelection, /button !== custom && button\.dataset\.c === requested/,
    'Built-in matching must not mistake the custom preservation swatch for a palette choice');
  assert.match(colorSelection, /custom\.hidden = false[\s\S]*custom\.dataset\.c = requested/,
    'An imported custom color must be represented without normalizing it');
  const colorKeys = extractFunction('handleIdentityColorKeydown');
  assert.match(colorKeys, /querySelectorAll\('#color-row \.csw'\)\]\.filter\(button => !button\.hidden\)/,
    'Arrow-key roving must exclude the hidden custom preservation swatch');

  const clearError = extractFunction('clearIdentityEditorError');
  assert.match(clearError, /nameRequired[\s\S]*!document\.getElementById\('modal-input'\)\?\.value\.trim\(\)\) return;/,
    'Symbol and color changes must not clear a visible blank-name error');

  const busy = extractFunction('setIdentityEditorBusy');
  assert.match(busy, /if \(modalBusy\) document\.getElementById\('modal-ok'\)\?\.focus/,
    'Entering the receipt wait must keep focus on the guarded primary action');
  const paint = extractFunction('paintIdentityEditor');
  assert.match(paint, /isDuplicate && !modalBusy && !modalCtx\.nameTouched[\s\S]*duplicateDefaultName[\s\S]*input\.value = modalCtx\.draftName/,
    'An untouched generated Duplicate name must follow live locale changes');
  assert.match(paint, /confirm\.disabled = !!modalCtx\.unavailable;/,
    'The busy primary action must stay physically focusable unless recovery makes it unavailable');
  assert.match(paint, /confirm\.setAttribute\('aria-disabled', String\(disabled\)\)/,
    'The focusable busy anchor must still expose its guarded state to assistive technology');
  const setError = extractFunction('setIdentityEditorError');
  assert.match(setError, /state-recovery-overlay[\s\S]*State\.isRecoveryRequired\?\.\(\)[\s\S]*modalCtx\.unavailable[\s\S]*modal-cancel[\s\S]*focus/,
    'An unavailable editor must move focus to an enabled exit unless recovery owns the foreground');
  const rejectOpen = extractFunction('rejectIdentityEditorOpen');
  assert.match(rejectOpen, /fallbackCtx[\s\S]*focusIdentityFallback\(fallbackCtx\)/,
    'A rejected action with a detached opener must recover focus on the durable surface');

  const persistIndex = confirm.indexOf('await State.persistNow()');
  const routeIndex = confirm.indexOf('Router.navigate', persistIndex);
  const renderIndex = confirm.indexOf('renderAll()', persistIndex);
  const closeIndex = confirm.indexOf('closeIdentityEditor({ restoreFocus: false })', persistIndex);
  const toastIndex = confirm.indexOf('toast(tr(successKey', persistIndex);
  const reconcileIndex = confirm.indexOf('reconcileDuplicatedGroupReminders', persistIndex);
  assert.ok(persistIndex >= 0 && routeIndex > persistIndex && renderIndex > persistIndex && closeIndex > persistIndex && toastIndex > persistIndex && reconcileIndex > toastIndex,
    'Render, close, focus, success feedback, and reminder reconciliation must be receipt-gated');
  const catchStart = confirm.indexOf('} catch (error) {', persistIndex);
  const catchEnd = confirm.indexOf('\n  }', catchStart);
  const failureBranch = confirm.slice(catchStart, catchEnd);
  assert.doesNotMatch(failureBranch, /renderAll|closeIdentityEditor|toast\(/, 'Persistence rejection must not render, close, or claim success');
  assert.match(failureBranch, /recoveryRequired/, 'Persistence rejection must expose the recovery-owned state');
  assert.match(failureBranch, /State\.isRecoveryRequired\?\.\(\)[\s\S]*showStateRecoveryRequired\(error\)/,
    'Persistence rejection must surface recovery before disabling the editor');

  const close = extractFunction('closeIdentityEditor');
  assert.match(close, /restoreOpener\(overlay\)/, 'Cancel and Escape must restore the invoking control');
  assert.match(close, /focusIdentityFallback/, 'Rebuilt openers must have a deterministic focus fallback');
  assert.match(close, /closeEmojiPicker\(\{ restoreFocus: false \}\)/, 'Closing the editor must close its nested picker first');
}

function testMarkupLocalizationAndResponsiveHooks() {
  for (const id of [
    'modal-overlay', 'modal-title', 'modal-x', 'emoji-trigger', 'modal-input',
    'modal-description', 'modal-error', 'color-row', 'modal-cancel', 'modal-ok',
    'identity-custom-color', 'emoji-picker', 'ep-search-input', 'ep-tabs', 'ep-grid',
  ]) {
    assert.equal((html.match(new RegExp(`\\bid=["']${id}["']`, 'g')) || []).length, 1, `Identity editor id must be unique: ${id}`);
  }
  assert.match(
    html,
    /id="modal-overlay"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="modal-title"[^>]*aria-describedby="modal-description modal-error"[^>]*aria-busy="false"/,
    'The identity editor must be a labelled, described, busy-aware modal dialog',
  );
  assert.match(html, /id="modal-name-label"[^>]*for="modal-input"/, 'The visible name label must name the input');
  assert.match(html, /id="modal-input"[^>]*aria-describedby="modal-error"[^>]*autocomplete="off"/, 'The name field must expose validation and avoid unrelated autocomplete');
  assert.match(html, /id="modal-error"[^>]*role="alert"/, 'Identity validation must be announced');
  assert.match(html, /id="emoji-trigger"[^>]*aria-haspopup="dialog"[^>]*aria-expanded="false"/, 'The symbol control must expose its nested dialog state');
  assert.match(html, /id="color-row"[^>]*role="radiogroup"[^>]*aria-labelledby="lbl-color"/, 'Colors must be one named radio group');
  assert.equal((html.match(/class="csw(?: active)?"[^>]*type="button"[^>]*role="radio"/g) || []).length, 11,
    'All identity colors must be keyboard-operable radio buttons');
  assert.match(html, /id="identity-custom-color"[^>]*role="radio"[^>]*tabindex="-1"[^>]*data-color-key="custom"[^>]*hidden/,
    'The custom preservation swatch must start hidden and outside the roving order');
  assert.match(html, /id="emoji-picker"[^>]*role="dialog"[^>]*data-i18n-aria-label="emojiPicker\.title"[^>]*aria-busy="false"/, 'The symbol picker must be localized and loading-aware');
  assert.match(html, /id="ep-tabs"[^>]*role="tablist"[^>]*data-i18n-aria-label="emojiPicker\.categories"/, 'Symbol categories must expose tab semantics');

  for (const prefix of ['groupEditor.', 'stackEditor.', 'groupAction.', 'stackAction.', 'emojiPicker.']) {
    const enKeys = Object.keys(i18n.en).filter(key => key.startsWith(prefix)).sort();
    const zhKeys = Object.keys(i18n['zh-TW']).filter(key => key.startsWith(prefix)).sort();
    assert.ok(enKeys.length, `${prefix} must have English copy`);
    assert.deepEqual(zhKeys, enKeys, `${prefix} must expose matching English and zh-TW vocabulary`);
    for (const key of enKeys) {
      assert.ok(String(i18n.en[key]).trim(), `${key} English copy must not be blank`);
      assert.ok(String(i18n['zh-TW'][key]).trim(), `${key} zh-TW copy must not be blank`);
    }
  }
  for (const key of [
    'groupEditor.nameRequired', 'groupEditor.parentUnavailable', 'groupEditor.changed', 'groupEditor.recoveryRequired',
    'groupEditor.duplicateTitle', 'groupEditor.duplicateClose', 'groupEditor.duplicate',
    'groupEditor.duplicateChanged', 'groupEditor.duplicateIdUnavailable', 'groupEditor.duplicateRecoveryRequired',
    'groupEditor.duplicateDefaultName', 'groupEditor.duplicateDescription', 'groupEditor.duplicateHistory',
    'groupEditor.duplicated', 'groupEditor.duplicateReminderWarning',
    'stackEditor.selectionUnavailable', 'stackEditor.selectionNested', 'stackEditor.selectionScope',
    'stackEditor.batchDescription', 'stackEditor.recoveryRequired', 'emojiPicker.loading', 'emojiPicker.empty', 'emojiPicker.error',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `Missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `Missing zh-TW ${key}`);
  }
  assert.equal(i18n['zh-TW']['groupEditor.create'], '新增群組', 'Taiwan Group creation must keep the canonical 新增群組 terminology');
  assert.equal(i18n['zh-TW']['stackEditor.create'], '新增堆疊', 'Taiwan Stack creation must use the same concise 新增 pattern');

  assert.match(css, /#modal\s*\{[\s\S]*?max-height:\s*calc\(100vh - 32px\);[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\) auto;[\s\S]*?overflow:\s*hidden;/,
    'The editor must remain height-safe with a scrollable middle row');
  assert.match(css, /#modal, \.rm-panel\s*\{[\s\S]*?max-width:\s*calc\(100vw - 32px\);/, 'The editor must retain a 16px minimum viewport gutter');
  assert.match(css, /#modal\s*>\s*\.modal-bd\s*\{\s*overflow-y:\s*auto;/, 'Long or translated content must scroll inside the dialog');
  assert.match(css, /\.organization-name-description\s*\{[^}]*overflow-wrap:\s*anywhere;/,
    'Arbitrary Group and Space names must wrap inside narrow identity descriptions');
  assert.match(css, /#emoji-picker\s*\{[\s\S]*?width:\s*min\(340px, calc\(100vw - 16px\)\);[\s\S]*?height:\s*min\(340px, calc\(100vh - 16px\)\);/,
    'The symbol picker must clamp to narrow and short viewports');
  assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*?#modal \.modal-ft\s*\{\s*flex-wrap:\s*wrap;/, 'Footer actions must wrap at phone widths');
  assert.match(css, /\.csw:focus-visible\s*\{[^}]*outline:/, 'Color radios must retain visible keyboard focus');
  assert.match(css, /@media \(forced-colors:\s*active\)[\s\S]*?\.csw\.active/, 'Color selection must remain visible in forced-colors mode');
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?animation-duration:\s*0\.01ms !important;/, 'The shared reduced-motion contract must cover the editor and picker');
  assert.doesNotMatch(i18n.en['groupEditor.duplicateReminderWarning'], /Chrome/,
    'Reminder recovery guidance must remain accurate in Chromium browsers other than Chrome');
  assert.doesNotMatch(i18n['zh-TW']['groupEditor.duplicateReminderWarning'], /Chrome/,
    'zh-TW reminder recovery guidance must remain browser-neutral');
}

function testEscapeAndPickerStackContracts() {
  const pickerKeys = extractFunction('handleEmojiPickerKeydown');
  assert.match(pickerKeys, /event\.key === 'Escape'[\s\S]*closeEmojiPicker\(\)/, 'Escape must close the nested symbol picker');
  assert.match(pickerKeys, /event\.key === 'Tab'[\s\S]*trapTabKey\(event, picker\)/, 'The symbol picker must trap Tab');
  assert.match(pickerKeys, /ArrowLeft[\s\S]*ArrowRight[\s\S]*Home[\s\S]*End/, 'Symbol category tabs must support directional and boundary keys');

  const editorKeys = extractFunction('handleIdentityEditorKeydown');
  assert.match(editorKeys, /event\.key === 'Escape'[\s\S]*closeIdentityEditor\(\)/, 'Escape must close the identity editor after the picker');
  assert.match(editorKeys, /event\.key === 'Tab'[\s\S]*trapTabKey\(event, overlay\)/, 'The identity editor must trap Tab');
  assert.match(editorKeys, /event\.key === 'Enter'[\s\S]*confirmIdentityEditor\(\)/, 'Enter in the name input must submit the editor');

  const bindStart = source.indexOf("document.addEventListener('keydown', e => {");
  assert.ok(bindStart >= 0, 'The global key stack must exist');
  const bindEnd = source.indexOf('\n  });', bindStart);
  assert.ok(bindEnd > bindStart, 'The complete global key stack must be extractable');
  const globalKeys = source.slice(bindStart, bindEnd);
  let previousGlobalLayer = -1;
  for (const handler of [
    'handleRichTextLinkGlobalKey(e)',
    'handlePasteImportGlobalKey(e)',
    'handleReminderGlobalKey(e)',
    'handleCalendarTaskGlobalKey(e)',
    'handleEmojiPickerGlobalKey(e)',
    'handleIdentityEditorGlobalKey(e)',
  ]) {
    const index = globalKeys.indexOf(handler);
    assert.ok(index > previousGlobalLayer,
      `Global Escape must offer ${handler} its event in last-opened-first-closed order`);
    previousGlobalLayer = index;
  }

  const interlocks = extractFunction('inheritActiveBodyInterlocks');
  assert.match(interlocks, /getElementById\('modal-overlay'\)/, 'Late-mounted body surfaces must observe an open identity editor');
  assert.match(interlocks, /setElementInertOwner\(element, 'identity-editor'/, 'The shared inert owner must include the identity editor');

  const renderPicker = extractFunction('renderEmojiGrid');
  assert.match(renderPicker, /if \(!grid \|\| typeof EMOJI_DATA === 'undefined'\) return;/,
    'Typing while symbol data loads must keep the loading state instead of reading an unavailable dataset');
  const openPicker = extractFunction('openEmojiPicker');
  assert.match(openPicker, /const search = document\.getElementById\('ep-search-input'\)\?\.value\.trim\(\) \|\| '';/,
    'The completed symbol-data load must re-read a search typed while loading');
  assert.match(openPicker, /renderEmojiGrid\(search \? null : _emojiActiveCategory, search\)/,
    'The completed symbol-data load must render the current search rather than overwrite it with a category');
  const outsideStart = openPicker.indexOf('const close = event =>');
  const outsideEnd = openPicker.indexOf('\n    };', outsideStart);
  const outsideCloser = openPicker.slice(outsideStart, outsideEnd);
  assert.match(outsideCloser, /closeEmojiPicker\(\)/,
    'Outside dismissal must use normal picker close so focus returns to the opener');
  assert.doesNotMatch(outsideCloser, /restoreFocus:\s*false/,
    'Outside dismissal must not discard the picker opener');
  assert.match(extractFunction('closeEmojiPicker'), /if \(restoreFocus\) restoreOpener\(ep\)/,
    'The picker close path must restore its captured opener');

  const select = extractFunction('selectEmoji');
  const identityBranch = select.slice(select.indexOf("target.kind === 'identity-editor'"), select.indexOf("target.kind === 'sub-modal'"));
  assert.match(identityBranch, /modalCtx\.draftSymbol = e;[\s\S]*modalCtx\.symbolChosen = true;/,
    'Identity symbol selection must remain a draft owned by the identity transaction');
  assert.doesNotMatch(identityBranch, /rememberRecentEmoji|State\.(?:snapshot|persist)/,
    'A draft identity symbol must not cross the Recent or persistence boundary before confirmation');
  assert.match(select, /target\.kind === 'sub-modal'[\s\S]*dataset\.emojiChosen = 'true'/,
    'Subscription symbol selection must leave an owner-bound confirmation marker');
  assert.match(select, /target\.kind === 'habit-icon'[\s\S]*dataset\.emojiChosen = 'true'/,
    'Habit symbol selection must leave an owner-bound confirmation marker');
  assert.match(extractFunction('confirmIdentityEditor'), /if \(ctx\.symbolChosen\) rememberRecentEmoji\(symbol\)/,
    'Identity Recent history must update only with its real graph mutation');
  assert.match(extractFunction('saveSubForm'), /if \(iconElement\.dataset\.emojiChosen === 'true'\) rememberRecentEmoji\(icon\)/,
    'Subscription Recent history must update only when its owner is saved');
  assert.match(extractFunction('openSubForm'), /delete icon\.dataset\.emojiChosen/,
    'Opening a subscription owner must clear stale symbol-selection ownership');
  assert.match(extractFunction('bindHabits'), /getHabits\(\)\.push[\s\S]*if \(iconElement\.dataset\.emojiChosen === 'true'\) rememberRecentEmoji\(icon\)/,
    'Habit Recent history must update only when the Habit is actually created');
}

function testHistoryNavigationIdentityInterlock() {
  let hidden = false;
  let busy = true;
  let recoveryVisible = false;
  let currentRouteName = 'source';
  const calls = {
    pushes: [], replacements: [], closes: [], flushes: 0,
    parses: 0, applies: 0, persists: 0, renders: 0,
  };
  const location = { hash: '#attempted' };
  const routeState = {
    activeWsId: 'ws-1',
    settings: { viewMode: 'board' },
    workspaces: [{
      id: 'ws-1', activeCatId: 'cat-source',
      categories: [{ id: 'cat-source', layout: 'board' }, { id: 'cat-attempted', layout: 'board' }],
    }],
  };
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (id === 'state-recovery-overlay') return {
          classList: { contains(value) { return value === 'hidden' && !recoveryVisible; } },
        };
        if (id === 'modal-overlay') return {
          classList: { contains(value) { return value === 'hidden' && hidden; } },
          getAttribute(name) { return name === 'aria-busy' ? String(busy) : null; },
        };
        return null;
      },
    },
    location,
    history: {
      pushState(_state, _title, hash) { calls.pushes.push(hash); location.hash = hash; },
      replaceState(_state, _title, hash) { calls.replacements.push(hash); location.hash = hash; },
    },
    currentRoute() { return { name: currentRouteName }; },
    build(route) { return route.name; },
    parse(hash) { calls.parses += 1; return { name: hash.replace(/^#/, '') }; },
    apply(route) {
      calls.applies += 1;
      currentRouteName = route.name;
      routeState.workspaces[0].activeCatId = 'cat-attempted';
      return true;
    },
    closeIdentityEditor(options) { calls.closes.push(plain(options)); hidden = true; return true; },
    flushActiveItemDetailEditor() { calls.flushes += 1; },
    isArchivedPageRestorePending() { return false; },
    isSavedPageArchivePending() { return false; },
    isSelectedItemMutationPending() { return false; },
    isSavedTabReturnMutationPending() { return false; },
    isBoardTodoCompletionPending() { return false; },
    isItemDetailMutationPending() { return false; },
    isReminderMutationPending() { return false; },
    isCalendarTaskMutationPending() { return false; },
    isPasteImportPending() { return false; },
    settingsPreferencePendingTransaction() { return null; },
    closePasteOverlay() {},
    closeCalendarTaskDialog() {},
    State: {
      get() { return routeState; },
      persist() { calls.persists += 1; },
    },
    renderAll() { calls.renders += 1; },
  });
  vm.runInContext(
    `${extractFunction('handleLocationChange')}\nglobalThis.runLocationChange = handleLocationChange;`,
    context,
    { filename: 'group-stack-history-interlock-contract.js' },
  );

  context.runLocationChange();
  assert.deepEqual(calls.pushes, ['#source'],
    'A pending identity receipt must restore the reviewed route while preserving history');
  assert.equal(calls.flushes, 0, 'Pending history must not flush another editor write');
  assert.equal(calls.parses, 0);
  assert.equal(calls.applies, 0);
  assert.equal(calls.persists, 0);
  assert.equal(calls.renders, 0);
  assert.equal(calls.closes.length, 0);

  hidden = false;
  busy = false;
  location.hash = '#attempted';
  context.runLocationChange();
  assert.deepEqual(calls.closes, [{ restoreFocus: false }],
    'A non-pending identity draft must close before browser history is applied');
  assert.equal(calls.flushes, 1);
  assert.equal(calls.parses, 1);
  assert.equal(calls.applies, 1);
  assert.equal(calls.persists, 1);
  assert.equal(calls.renders, 1);
  assert.equal(calls.replacements.length, 0);

  recoveryVisible = true;
  location.hash = '#other';
  context.runLocationChange();
  assert.deepEqual(calls.pushes, ['#source', '#attempted'],
    'Fail-closed recovery must also preserve the current route without another state write');
  assert.equal(calls.flushes, 1);
  assert.equal(calls.applies, 1);
  assert.equal(calls.persists, 1);
  assert.equal(calls.renders, 1);
}

async function testBlankCancelAndPrimitiveContexts() {
  const harness = buildHarness();
  const before = JSON.stringify(harness.state);
  assert.equal(harness.api.openIdentityEditor('group', 'create', {
    workspaceId: 'ws-a', spaceId: 'cat-a',
  }, harness.opener), true);
  const context = plain(harness.api.getContext());
  assert.deepEqual(
    Object.keys(context).sort(),
    ['colorChosen', 'draftColor', 'draftName', 'draftSymbol', 'entityKind', 'nameTouched', 'operation', 'spaceId', 'workspaceId'].sort(),
    'A Group-create context must contain only draft scalars and stable parent IDs',
  );
  assert.ok(Object.values(context).every(value => value == null || ['string', 'number', 'boolean'].includes(typeof value)),
    'A Group-create context must not retain mutable graph objects');
  assert.equal(JSON.stringify(harness.state), before, 'Opening the editor must not mutate real product state');
  assert.equal(harness.document.activeElement, harness.input, 'Opening must focus the name field');
  assert.equal(harness.app.inert, true, 'Opening must inert the background');
  assert.equal(harness.app.dataset.locusInertOwners, 'identity-editor');

  harness.setInput('   ');
  assert.equal(await harness.api.confirmIdentityEditor(), false);
  assert.equal(harness.calls.snapshots.length, 0, 'Blank confirmation must not create history');
  assert.equal(harness.calls.persists, 0, 'Blank confirmation must not write');
  assert.equal(harness.calls.renders, 0, 'Blank confirmation must not render');
  assert.equal(harness.calls.toasts.length, 0, 'Blank confirmation must not claim success');
  assert.equal(harness.api.getContext().errorKey, 'groupEditor.nameRequired');
  assert.equal(harness.document.activeElement, harness.input, 'Blank validation must return focus to the field');

  assert.equal(harness.api.closeIdentityEditor(), true);
  assert.equal(JSON.stringify(harness.state), before, 'Cancel must leave state byte-for-byte unchanged');
  assert.equal(harness.overlay.classList.contains('hidden'), true);
  assert.equal(harness.document.activeElement, harness.opener, 'Cancel must restore its invoking control');
  assert.equal(harness.app.inert, false, 'Cancel must release only its background interlock');
}

async function testStaleMovedAndSelectionPreflight() {
  const stale = buildHarness();
  assert.equal(stale.api.openIdentityEditor('group', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-a',
  }, stale.opener), true);
  stale.setInput('My edit');
  const group = stale.state.workspaces[0].categories[0].groups[0];
  group.name = 'External edit';
  assert.equal(await stale.api.confirmIdentityEditor(), false);
  assert.equal(stale.calls.snapshots.length, 0, 'A concurrent Group edit must fail before history');
  assert.equal(stale.calls.persists, 0, 'A concurrent Group edit must fail before writing');
  assert.equal(stale.input.value, 'External edit', 'A concurrent Group edit must reload the latest value for review');
  assert.equal(stale.api.getContext().errorKey, 'groupEditor.changed');
  assert.equal(stale.api.getContext().unavailable, false, 'A concurrent edit remains reviewable');

  const moved = buildHarness();
  assert.equal(moved.api.openIdentityEditor('stack', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-a', stackId: 's1',
  }, moved.opener), true);
  moved.setInput('Moved stack edit');
  const groupAItems = moved.state.workspaces[0].categories[0].groups[0].items;
  const groupBItems = moved.state.workspaces[0].categories[0].groups[1].items;
  groupBItems.push(groupAItems.splice(groupAItems.findIndex(item => item.id === 's1'), 1)[0]);
  assert.equal(await moved.api.confirmIdentityEditor(), false);
  assert.equal(moved.calls.snapshots.length, 0, 'A moved Stack must fail before history');
  assert.equal(moved.calls.persists, 0, 'A moved Stack must fail before writing');
  assert.equal(moved.api.getContext().errorKey, 'stackEditor.unavailable');
  assert.equal(moved.api.getContext().unavailable, true, 'A moved Stack must require an explicit reopen');

  const preflight = buildHarness();
  assert.equal(preflight.api.prepareIdentityBatch(['s1', 't3']).errorKey, 'stackEditor.selectionNested',
    'A selected Stack and its child must be rejected');
  assert.equal(preflight.api.prepareIdentityBatch(['t1', 't5']).errorKey, 'stackEditor.selectionScope',
    'Cross-Space selection must be rejected');
  assert.equal(preflight.api.prepareIdentityBatch(['t1']).errorKey, 'stackEditor.minimumSelection',
    'A one-item Stack must be rejected');

  const duplicate = preflight.state.workspaces[0].categories[0].groups[1];
  duplicate.items.push({ id: 't1', type: 'tab', title: 'Duplicate', url: 'https://duplicate.example' });
  assert.equal(preflight.api.identityItemTargets(['t1']), null, 'Imported duplicate item IDs must fail closed');
  const before = JSON.stringify(preflight.state);
  assert.equal(preflight.api.openIdentityEditor('stack', 'batch-create', { itemIds: ['t1', 't5'] }, preflight.opener), false);
  assert.equal(JSON.stringify(preflight.state), before, 'Rejected batch preflight must not mutate state');
  assert.equal(preflight.calls.snapshots.length, 0);
  assert.equal(preflight.calls.persists, 0);
  assert.equal(preflight.calls.toasts.at(-1).options.danger, true, 'Rejected preflight must provide explicit failure feedback');

  const staleBatch = buildHarness({ selectedIds: ['t1', 't2'] });
  assert.equal(staleBatch.api.openIdentityEditor('stack', 'batch-create', {
    itemIds: [...staleBatch.selectedItemIds],
  }, staleBatch.opener), true);
  staleBatch.setInput('Stale selection');
  const staleItems = staleBatch.state.workspaces[0].categories[0].groups[0].items;
  staleItems.splice(staleItems.findIndex(item => item.id === 't2'), 1);
  assert.equal(await staleBatch.api.confirmIdentityEditor(), false);
  assert.equal(staleBatch.api.getContext().errorKey, 'stackEditor.selectionUnavailable',
    'A selected ID that disappears after opening must reach the explicit selection-unavailable state');
  assert.equal(staleBatch.api.getContext().unavailable, true);
  assert.equal(staleBatch.calls.snapshots.length, 0, 'Stale selected IDs must fail before history');
  assert.equal(staleBatch.calls.persists, 0, 'Stale selected IDs must fail before writing');
}

async function testDuplicateZeroWritePreflights() {
  const assertNoDuplicateWrite = (harness, message) => {
    assert.equal(harness.calls.snapshots.length, 0, `${message}: no history`);
    assert.equal(harness.calls.persists, 0, `${message}: no persistence`);
    assert.equal(harness.calls.renders, 0, `${message}: no render`);
    assert.equal(harness.calls.messages.length, 0, `${message}: no reminder reconciliation`);
  };

  const cancelled = buildHarness();
  const cancelledBefore = JSON.stringify(cancelled.state);
  assert.equal(cancelled.api.openIdentityEditor('group', 'duplicate', duplicateParams(), cancelled.opener), true);
  assert.equal(cancelled.input.value, i18n.en['groupEditor.duplicateDefaultName'].replace('{name}', 'Sources'));
  assert.equal(cancelled.calls.textSelections, 1, 'Duplicate opening must select the proposed copy name');
  assert.equal(cancelled.document.activeElement, cancelled.input, 'Duplicate opening must focus the selected name');
  assert.equal(JSON.stringify(cancelled.state), cancelledBefore, 'Duplicate opening must remain draft-only');
  assert.equal(cancelled.api.closeIdentityEditor(), true);
  assert.equal(JSON.stringify(cancelled.state), cancelledBefore, 'Cancelling Duplicate must preserve state byte-for-byte');
  assert.equal(cancelled.document.activeElement, cancelled.opener, 'Cancelling Duplicate must restore its exact opener');
  assertNoDuplicateWrite(cancelled, 'Cancelled Duplicate');

  const relocalized = buildHarness();
  assert.equal(relocalized.api.openIdentityEditor('group', 'duplicate', duplicateParams(), relocalized.opener), true);
  relocalized.setLocale('zh-TW');
  relocalized.api.paintIdentityEditor();
  const zhDefaultName = i18n['zh-TW']['groupEditor.duplicateDefaultName'].replace('{name}', 'Sources');
  assert.equal(relocalized.input.value, zhDefaultName,
    'An untouched generated copy name must follow a live locale change');
  assert.equal(relocalized.api.getContext().draftName, zhDefaultName);
  relocalized.setInput('My reviewed copy');
  relocalized.setLocale('en');
  relocalized.api.paintIdentityEditor();
  assert.equal(relocalized.input.value, 'My reviewed copy',
    'A user-reviewed copy name must remain canonical across locale changes');
  relocalized.api.closeIdentityEditor();
  assertNoDuplicateWrite(relocalized, 'Relocalized Duplicate draft');

  const missing = buildHarness();
  const missingBefore = JSON.stringify(missing.state);
  missing.document.activeElement = missing.elements.get('board');
  assert.equal(missing.api.openIdentityEditor('group', 'duplicate', duplicateParams('missing-group'), missing.opener), false);
  assert.equal(JSON.stringify(missing.state), missingBefore);
  assert.equal(missing.overlay.classList.contains('hidden'), true);
  assert.equal(missing.calls.toasts.length, 1, 'A missing direct-action target must provide explicit feedback');
  assert.equal(missing.calls.toasts[0].options.danger, true);
  assert.equal(missing.document.activeElement, missing.opener,
    'A connected opener must regain focus even when Duplicate validation rejects');
  assertNoDuplicateWrite(missing, 'Missing Duplicate target');

  const detached = buildHarness();
  detached.opener.isConnected = false;
  detached.document.activeElement = detached.elements.get('board');
  assert.equal(detached.api.openIdentityEditor('group', 'duplicate', duplicateParams('missing-group'), detached.opener), false);
  assert.equal(detached.document.activeElement, detached.elements.get('lv-add-row'),
    'A rejected Duplicate with a detached opener must recover focus on a durable surface control');
  assertNoDuplicateWrite(detached, 'Detached-opener Duplicate target');

  const inactiveWorkspace = buildHarness();
  inactiveWorkspace.state.activeWsId = 'ws-b';
  const inactiveWorkspaceBefore = JSON.stringify(inactiveWorkspace.state);
  assert.equal(inactiveWorkspace.api.openIdentityEditor('group', 'duplicate', duplicateParams(), inactiveWorkspace.opener), false);
  assert.equal(JSON.stringify(inactiveWorkspace.state), inactiveWorkspaceBefore);
  assertNoDuplicateWrite(inactiveWorkspace, 'Inactive Workspace Duplicate target');

  const inactiveSpace = buildHarness();
  inactiveSpace.state.workspaces[0].activeCatId = 'cat-b';
  const inactiveSpaceBefore = JSON.stringify(inactiveSpace.state);
  assert.equal(inactiveSpace.api.openIdentityEditor('group', 'duplicate', duplicateParams(), inactiveSpace.opener), false);
  assert.equal(JSON.stringify(inactiveSpace.state), inactiveSpaceBefore);
  assertNoDuplicateWrite(inactiveSpace, 'Inactive Space Duplicate target');

  const stale = buildHarness();
  assert.equal(stale.api.openIdentityEditor('group', 'duplicate', duplicateParams(), stale.opener), true);
  stale.state.workspaces[0].categories[0].groups[0].customFields = { externallyChanged: true };
  const staleBeforeConfirm = JSON.stringify(stale.state);
  assert.equal(await stale.api.confirmIdentityEditor(), false);
  assert.equal(JSON.stringify(stale.state), staleBeforeConfirm, 'Stale review must not add a copied Group');
  assert.equal(stale.api.getContext().errorKey, 'groupEditor.duplicateChanged');
  assert.equal(stale.api.getContext().unavailable, false, 'A changed source must reload for explicit review');
  assert.equal(stale.input.value, i18n.en['groupEditor.duplicateDefaultName'].replace('{name}', 'Sources'));
  assert.equal(stale.document.activeElement, stale.input, 'Changed-source review must return focus to the refreshed name');
  assertNoDuplicateWrite(stale, 'Changed Duplicate source');

  const staleTouched = buildHarness();
  assert.equal(staleTouched.api.openIdentityEditor('group', 'duplicate', duplicateParams(), staleTouched.opener), true);
  staleTouched.setInput('Intentional copy name');
  staleTouched.api.getContext().draftSymbol = 'I';
  staleTouched.api.getContext().symbolChosen = true;
  staleTouched.api.selectIdentityColor('#ef4444', { chosen: true });
  const staleTouchedSource = staleTouched.state.workspaces[0].categories[0].groups[0];
  staleTouchedSource.name = 'Externally renamed source';
  staleTouchedSource.symbol = 'E';
  staleTouchedSource.color = '#10b981';
  assert.equal(await staleTouched.api.confirmIdentityEditor(), false);
  assert.equal(staleTouched.api.getContext().errorKey, 'groupEditor.duplicateChanged');
  assert.equal(staleTouched.api.getContext().sourceName, 'Externally renamed source');
  assert.equal(staleTouched.input.value, 'Intentional copy name',
    'Stale Duplicate review must preserve an intentionally edited copy name');
  assert.equal(staleTouched.api.getContext().draftSymbol, 'I',
    'Stale Duplicate review must preserve an intentionally selected symbol');
  assert.equal(staleTouched.api.getContext().draftColor, '#ef4444',
    'Stale Duplicate review must preserve an intentionally selected color');
  assert.equal(staleTouched.api.getContext().nameTouched, true);
  assert.equal(staleTouched.api.getContext().symbolChosen, true);
  assert.equal(staleTouched.api.getContext().colorChosen, true);
  assertNoDuplicateWrite(staleTouched, 'Changed Duplicate source with intentional draft edits');

  const disappeared = buildHarness();
  assert.equal(disappeared.api.openIdentityEditor('group', 'duplicate', duplicateParams(), disappeared.opener), true);
  disappeared.state.workspaces[0].categories[0].groups.shift();
  const disappearedBeforeConfirm = JSON.stringify(disappeared.state);
  assert.equal(await disappeared.api.confirmIdentityEditor(), false);
  assert.equal(JSON.stringify(disappeared.state), disappearedBeforeConfirm);
  assert.equal(disappeared.api.getContext().errorKey, 'groupEditor.unavailable');
  assert.equal(disappeared.api.getContext().unavailable, true);
  assert.equal(disappeared.document.activeElement, disappeared.cancel,
    'A disappeared source must move focus off the disabled name field to Cancel');
  assertNoDuplicateWrite(disappeared, 'Disappeared Duplicate source');

  const becameInactive = buildHarness();
  assert.equal(becameInactive.api.openIdentityEditor('group', 'duplicate', duplicateParams(), becameInactive.opener), true);
  becameInactive.state.workspaces[0].activeCatId = 'cat-b';
  const becameInactiveBeforeConfirm = JSON.stringify(becameInactive.state);
  assert.equal(await becameInactive.api.confirmIdentityEditor(), false);
  assert.equal(JSON.stringify(becameInactive.state), becameInactiveBeforeConfirm);
  assert.equal(becameInactive.api.getContext().errorKey, 'groupEditor.unavailable');
  assert.equal(becameInactive.api.getContext().unavailable, true);
  assert.equal(becameInactive.document.activeElement, becameInactive.cancel,
    'An inactive source must leave focus on an enabled exit');
  assertNoDuplicateWrite(becameInactive, 'Duplicate source that became inactive');

  const duplicateId = buildHarness();
  assert.equal(duplicateId.api.openIdentityEditor('group', 'duplicate', duplicateParams(), duplicateId.opener), true);
  duplicateId.state.workspaces[0].categories[1].groups.push({
    id: 'g-a', name: 'Imported collision', items: [],
  });
  const duplicateIdBeforeConfirm = JSON.stringify(duplicateId.state);
  assert.equal(await duplicateId.api.confirmIdentityEditor(), false);
  assert.equal(JSON.stringify(duplicateId.state), duplicateIdBeforeConfirm);
  assert.equal(duplicateId.api.getContext().errorKey, 'groupEditor.unavailable');
  assert.equal(duplicateId.document.activeElement, duplicateId.cancel,
    'An ambiguous source ID must leave focus on an enabled exit');
  assertNoDuplicateWrite(duplicateId, 'Ambiguous Duplicate source ID');

  const exhausted = buildHarness({ uidSequence: ['g-a'] });
  assert.equal(exhausted.api.openIdentityEditor('group', 'duplicate', duplicateParams(), exhausted.opener), true);
  const exhaustedBefore = JSON.stringify(exhausted.state);
  assert.equal(await exhausted.api.confirmIdentityEditor(), false);
  assert.equal(JSON.stringify(exhausted.state), exhaustedBefore, 'ID exhaustion must fail before staging a copy');
  assert.equal(exhausted.calls.uid, 10000, 'Duplicate allocation must stop at its bounded collision retry limit');
  assert.equal(exhausted.api.getContext().errorKey, 'groupEditor.duplicateIdUnavailable');
  assertNoDuplicateWrite(exhausted, 'Duplicate ID exhaustion');
}

async function testDuplicateReceiptCloneLayoutAndReminderContract() {
  const receipt = deferred();
  const collisionIds = [
    'g-b',
    'archive-group-id',
    'trash-item-id',
    'restore-group-hint',
    'capture-group-hint',
    'layout-key-hint',
    'width-key-hint',
    'canvas-key-hint',
  ];
  const freshIds = [
    'copy-group-id',
    'copy-t1-id',
    'copy-t2-id',
    'copy-s1-id',
    'copy-t3-id',
    'copy-s-deep-id',
    'copy-t-deep-id',
    'copy-s2-id',
  ];
  const harness = buildHarness({
    persistNow: () => receipt.promise,
    uidSequence: [...collisionIds, freshIds[0], ...freshIds],
    selectedIds: ['t1'],
    sendMessage: async () => ({ ok: false }),
  });
  const fixture = seedDuplicateCollisionState(harness);
  assert.deepEqual(fixture.collisionIds, collisionIds);
  const { space, sourceGroup } = fixture;
  const siblingGroup = space.groups[1];
  const sourceBefore = plain(sourceGroup);
  const siblingBefore = plain(siblingGroup);
  const stateBefore = plain(harness.state);
  const idsBefore = importUtils.collectEntityIds(stateBefore);
  const expectedName = i18n.en['groupEditor.duplicateDefaultName'].replace('{name}', sourceGroup.name);

  assert.equal(harness.api.openIdentityEditor('group', 'duplicate', duplicateParams(), harness.opener), true);
  const context = plain(harness.api.getContext());
  assert.equal(context.operation, 'duplicate');
  assert.equal(context.entityId, 'g-a');
  assert.equal(context.workspaceId, 'ws-a');
  assert.equal(context.spaceId, 'cat-a');
  assert.equal(context.draftName, expectedName);
  assert.ok(Object.values(context).every(value => value == null || ['string', 'number', 'boolean'].includes(typeof value)),
    'Duplicate context must retain no mutable graph or layout references');
  assert.equal(JSON.stringify(harness.state), JSON.stringify(stateBefore), 'Opening Duplicate must not mutate product state');
  assert.equal(harness.calls.textSelections, 1);
  assert.equal(harness.document.activeElement, harness.input);

  const pending = harness.api.confirmIdentityEditor();
  const copiedGroup = space.groups[1];
  assert.equal(space.groups[0], sourceGroup, 'The source Group object must remain in place');
  assert.equal(space.groups[2], siblingGroup, 'Unrelated siblings must retain identity and relative order');
  assert.equal(JSON.stringify(sourceGroup), JSON.stringify(sourceBefore), 'The source Group must remain byte-for-byte unchanged');
  assert.equal(JSON.stringify(siblingGroup), JSON.stringify(siblingBefore), 'The unrelated sibling must remain unchanged');
  assert.equal(copiedGroup.name, expectedName);
  assert.deepEqual(groupEntityIds(copiedGroup), freshIds,
    'Duplicate must assign fresh deterministic IDs in Group-first recursive visual order');
  assert.equal(new Set(groupEntityIds(copiedGroup)).size, freshIds.length, 'Every copied entity ID must be unique');
  for (const id of groupEntityIds(copiedGroup)) {
    assert.equal(idsBefore.has(id), false, `Copied ID ${id} must not collide with active, Archive, or Trash payload data`);
    assert.equal(collisionIds.includes(id), false, `Copied ID ${id} must not collide with restore, capture, layout, or Canvas hints`);
  }
  assert.equal(harness.calls.uid, collisionIds.length + freshIds.length + 1,
    'The allocator must retry active, stored, reference, layout, Canvas, and same-transaction collisions');

  const expectedSemanticCopy = normalizeGroupEntityIds(sourceBefore);
  expectedSemanticCopy.name = expectedName;
  assert.deepEqual(normalizeGroupEntityIds(copiedGroup), expectedSemanticCopy,
    'Except for entity IDs and the proposed name, the complete JSON-compatible Group tree must be preserved');
  assertDetachedGroupClone(sourceGroup, copiedGroup);
  assert.notEqual(copiedGroup.reminders, sourceGroup.reminders, 'Copied Group reminders must be detached');
  assert.notEqual(copiedGroup.customFields, sourceGroup.customFields, 'Copied custom Group fields must be detached');
  assert.equal(copiedGroup.reminders[0].id, 'group-reminder', 'Stable per-entity reminder IDs must be preserved');
  assert.equal(copiedGroup.items[0].reminder.id, 'item-reminder');
  assert.equal(copiedGroup.items[2].items[1].items[0].reminder.id, 'deep-reminder');

  assert.equal(harness.calls.snapshots.length, 1, 'Duplicate must take exactly one pre-mutation history snapshot');
  assert.deepEqual(harness.calls.snapshots[0].state, stateBefore, 'Duplicate history must capture the exact pre-copy graph');
  assert.equal(
    harness.calls.snapshots[0].label,
    i18n.en['groupEditor.duplicateHistory']
      .replace('{source}', sourceBefore.name)
      .replace('{name}', expectedName),
    'Duplicate history must use the localized source and copy names',
  );
  assert.equal(harness.calls.persists, 1, 'Duplicate must request exactly one immediate persistence receipt');
  assert.equal(harness.calls.renders, 0, 'Duplicate must not render while persistence is pending');
  assert.equal(harness.calls.toasts.length, 0, 'Duplicate must not claim success while persistence is pending');
  assert.equal(harness.calls.messages.length, 0, 'Duplicate must not reconcile reminders while persistence is pending');
  assert.equal(harness.document.activeElement, harness.modalOk, 'Pending Duplicate must keep focus on its guarded primary action');
  assert.equal(harness.api.getBusy(), true);
  assert.deepEqual([...harness.selectedItemIds], ['t1'], 'Duplicate must not repurpose or clear item selection');

  const copiedPosition = space.canvasPositions[copiedGroup.id];
  assert.deepEqual(plain(copiedPosition), { x: 1164, y: 30 },
    'Production Canvas placement must skip the current-size source and partial legacy-size sibling footprints');
  const effectiveSizes = { ...harness.state.columnWidths };
  for (const [groupId, savedSize] of Object.entries(harness.state.columnSizes)) {
    if (savedSize != null) effectiveSizes[groupId] = savedSize;
  }
  assert.equal(effectiveSizes['g-b'], 410,
    'A null current-size record must retain the sibling\'s valid legacy width');
  const fallback = { w: 290, h: 582 };
  const copiedRect = harness.api.canvasGroupRect(
    copiedGroup, space.canvasPositions, fallback, effectiveSizes[copiedGroup.id],
  );
  for (const occupiedGroup of [sourceGroup, siblingGroup]) {
    const occupiedRect = harness.api.canvasGroupRect(
      occupiedGroup, space.canvasPositions, fallback, effectiveSizes[occupiedGroup.id],
    );
    assert.equal(harness.api.canvasRectsOverlap(copiedRect, occupiedRect), false,
      `Copied Canvas footprint must not overlap ${occupiedGroup.id}`);
  }
  const board = harness.elements.get('board');
  board.clientWidth = 1;
  const unsizedGroups = [
    { id: 'unsized-a' }, { id: 'unsized-b' }, { id: 'unsized-c' }, { id: 'unsized-copy' },
  ];
  const unsizedPositions = {
    'unsized-a': { x: 30, y: 30 },
    'unsized-b': { x: 350, y: 30 },
    'unsized-c': { x: 670, y: 30 },
  };
  assert.deepEqual(
    plain(harness.api.findOpenCanvasPosition(
      unsizedGroups[3], unsizedGroups, unsizedPositions, null, {},
    )),
    { x: 30, y: 648 },
    'Unsized production placement must clear a full 60vh cards region plus column chrome',
  );
  assert.equal(harness.api.canvasRectsOverlap(
    { x: 30, y: 30, w: 290, h: 582 },
    { x: 30, y: 384, w: 290, h: 582 },
  ), true, 'The default footprint must detect the former 720px vertical overlap case');
  board.clientWidth = 960;
  assert.deepEqual(plain(space.canvasPositions), {
    ...stateBefore.workspaces[0].categories[0].canvasPositions,
    [copiedGroup.id]: plain(copiedPosition),
  }, 'Duplicate must add only one fresh Canvas key');
  assert.deepEqual(harness.state.columnSizes[copiedGroup.id], stateBefore.columnSizes['g-a']);
  assert.notEqual(harness.state.columnSizes[copiedGroup.id], harness.state.columnSizes['g-a'],
    'Copied structured sizing data must not alias the source record');
  assert.equal(harness.state.columnWidths[copiedGroup.id], stateBefore.columnWidths['g-a']);
  assert.deepEqual(harness.state.archive, stateBefore.archive, 'Duplicate must not rewrite Archive');
  assert.deepEqual(harness.state.trash, stateBefore.trash, 'Duplicate must not rewrite Trash');
  assert.deepEqual(harness.state.settings, stateBefore.settings, 'Duplicate must not rewrite capture targets');
  assert.equal(harness.state.activeWsId, stateBefore.activeWsId);
  assert.equal(harness.state.workspaces[0].activeCatId, stateBefore.workspaces[0].activeCatId);

  assert.equal(await harness.api.confirmIdentityEditor(), false, 'Reactivating pending Duplicate must be a no-op');
  assert.equal(harness.calls.snapshots.length, 1);
  assert.equal(harness.calls.persists, 1);
  assert.equal(space.groups.length, 3, 'Pending reactivation must not stage another copy');

  receipt.resolve();
  assert.equal(await pending, true);
  assert.equal(harness.calls.persists, 1, 'Persistence acknowledgement must not trigger a second write');
  assert.equal(harness.calls.renders, 1, 'Acknowledged Duplicate must render exactly once');
  assert.equal(harness.overlay.classList.contains('hidden'), true);
  assert.equal(harness.document.activeElement, harness.elements.get('created-focus'),
    'Acknowledged Duplicate must focus the newly rendered Group');
  assert.deepEqual(harness.calls.messages, [{ type: 'reconcile-reminders' }],
    'Acknowledged reminder-bearing Duplicate must request exactly one reconciliation');
  assert.equal(harness.calls.toasts[0].message,
    i18n.en['groupEditor.duplicated'].replace('{name}', expectedName).replace('{source}', sourceBefore.name));
  assert.equal(harness.calls.toasts[0].options.undo, 73, 'Duplicate success must expose the exact snapshot action for Undo');

  await new Promise(resolve => setImmediate(resolve));
  assert.equal(harness.calls.toasts.length, 2, 'Failed reminder reconciliation must add one warning after success');
  const warning = harness.calls.toasts[1];
  assert.equal(warning.message, i18n.en['groupEditor.duplicateReminderWarning'].replace('{name}', expectedName));
  assert.equal(warning.options.tone, 'warning');
  assert.equal(warning.options.duration, 8000);
  assert.equal(warning.options.undo, 73, 'Reminder warning must retain the exact Duplicate Undo action');
  assert.equal(harness.api.getBusy(), false);
}

async function testDuplicatePersistenceRejectionKeepsDirtyTruth() {
  let recoveryRequired = false;
  let harness;
  harness = buildHarness({
    persistNow: async () => {
      recoveryRequired = true;
      throw new Error('storage unavailable');
    },
    isRecoveryRequired: () => recoveryRequired,
    uidSequence: [
      'rejected-group', 'rejected-t1', 'rejected-t2',
      'rejected-s1', 'rejected-t3', 'rejected-s2',
    ],
  });
  const state = harness.state;
  const space = state.workspaces[0].categories[0];
  const sourceGroup = space.groups[0];
  const sourceBefore = plain(sourceGroup);
  sourceGroup.reminders = [{ id: 'rejected-reminder', at: 1893456000000 }];
  state.columnSizes = { 'g-a': { w: 344, h: 360, density: 'compact' } };
  state.columnWidths = { 'g-a': 344 };
  space.canvasPositions = { 'g-a': { x: 30, y: 30 }, 'g-b': { x: 380, y: 30 } };
  const beforeConfirm = plain(state);

  assert.equal(harness.api.openIdentityEditor('group', 'duplicate', duplicateParams(), harness.opener), true);
  assert.equal(await harness.api.confirmIdentityEditor(), false);
  const dirtyCopy = space.groups[1];
  assert.equal(dirtyCopy.id, 'rejected-group', 'Rejected persistence must retain the one staged copy for recovery');
  assert.equal(space.groups.length, 3);
  assert.equal(JSON.stringify(sourceGroup), JSON.stringify({ ...sourceBefore, reminders: [{ id: 'rejected-reminder', at: 1893456000000 }] }),
    'Rejected Duplicate must not mutate its source');
  assert.deepEqual(state.columnSizes['rejected-group'], state.columnSizes['g-a']);
  assert.equal(state.columnWidths['rejected-group'], state.columnWidths['g-a']);
  assert.deepEqual(plain(space.canvasPositions['rejected-group']), { x: 778, y: 30 });
  assert.deepEqual(harness.calls.snapshots[0].state, beforeConfirm);
  assert.equal(harness.calls.snapshots.length, 1);
  assert.equal(harness.calls.persists, 1, 'Rejected Duplicate must not retry persistence');
  assert.equal(harness.calls.renders, 0, 'Rejected Duplicate must not render a misleading success state');
  assert.equal(harness.calls.toasts.length, 0, 'Rejected Duplicate must not claim success or warn about unscheduled reminders');
  assert.equal(harness.calls.messages.length, 0, 'Rejected Duplicate must not reconcile reminders before a receipt');
  assert.equal(harness.overlay.classList.contains('hidden'), false, 'The editor must remain open behind recovery');
  assert.equal(harness.api.getBusy(), false);
  assert.equal(harness.api.getContext().errorKey, 'groupEditor.duplicateRecoveryRequired');
  assert.equal(harness.api.getContext().unavailable, true);
  assert.equal(harness.calls.recoveries.length, 1,
    'The identity controller must surface fail-closed recovery in its rejection turn');
  assert.equal(harness.recovery.classList.contains('hidden'), false);
  assert.equal(harness.modalOk.disabled, true, 'Recovery-owned rejection must physically block a duplicate retry');
  assert.equal(harness.modalOk.getAttribute('aria-disabled'), 'true');
  assert.equal(harness.document.activeElement, harness.recovery,
    'The unavailable editor must not steal focus from fail-closed recovery');
  assert.equal(harness.app.inert, true, 'The editor must retain its background interlock while recovery owns the dirty graph');
}

async function testDuplicateFocusedGroupRouteAndDelayedWarning() {
  const routeReceipt = deferred();
  const routeHarness = buildHarness({
    activeGroupPageId: 'g-a',
    persistNow: () => routeReceipt.promise,
    uidSequence: [
      'route-group', 'route-t1', 'route-t2',
      'route-s1', 'route-t3', 'route-s2',
    ],
  });
  assert.equal(routeHarness.api.openIdentityEditor(
    'group', 'duplicate', duplicateParams(), routeHarness.opener,
  ), true);
  assert.equal(routeHarness.api.getContext().openedFromGroupPage, true);
  const routePending = routeHarness.api.confirmIdentityEditor();
  assert.equal(routeHarness.calls.snapshots.length, 1);
  assert.equal(routeHarness.calls.persists, 1,
    'Focused-Group Duplicate must still use exactly one state receipt');
  assert.equal(routeHarness.calls.routes.length, 0,
    'Focused-Group Duplicate must not route before its state acknowledgement');
  assert.equal(routeHarness.calls.renders, 0);
  assert.equal(routeHarness.document.activeElement, routeHarness.modalOk,
    'Focused-Group Duplicate must retain the guarded focus anchor while pending');
  routeReceipt.resolve();
  assert.equal(await routePending, true);
  assert.equal(routeHarness.calls.renders, 1);
  assert.deepEqual(routeHarness.calls.routes, [{
    route: { type: 'group', wsId: 'ws-a', groupId: 'route-group', itemId: null, query: {} },
    options: { persist: false },
  }], 'Focused-Group Duplicate must reveal the acknowledged copy without a second state write');
  assert.equal(routeHarness.calls.debouncedPersists, 0,
    'The post-receipt focused-Group route must not initiate another state write');
  assert.equal(routeHarness.document.activeElement, routeHarness.elements.get('created-focus'),
    'Focused-Group Duplicate must focus the copied Group on its routed surface');

  const reminderReceipt = deferred();
  let latestAction = 73;
  const warningHarness = buildHarness({
    latestActionId: () => latestAction,
    uidSequence: [
      'warning-group', 'warning-t1', 'warning-t2',
      'warning-s1', 'warning-t3', 'warning-s2',
    ],
    sendMessage: () => reminderReceipt.promise,
  });
  warningHarness.state.workspaces[0].categories[0].groups[0].reminders = [
    { id: 'warning-reminder', at: 1893456000000 },
  ];
  assert.equal(warningHarness.api.openIdentityEditor(
    'group', 'duplicate', duplicateParams(), warningHarness.opener,
  ), true);
  assert.equal(await warningHarness.api.confirmIdentityEditor(), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(warningHarness.calls.messages.length, 1);
  latestAction = 74;
  reminderReceipt.resolve({ ok: false });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(warningHarness.calls.toasts.length, 2);
  const warning = warningHarness.calls.toasts[1];
  assert.equal(warning.message, i18n.en['history.reminderReconcileWarning'],
    'A delayed reconciliation failure after a newer action must use generic recovery guidance');
  assert.equal(warning.options.tone, 'warning');
  assert.equal(warning.options.duration, 8000);
  assert.equal(warning.options.undo, undefined,
    'A delayed reconciliation failure must not expose stale exact Undo');

  const replacedReceipt = deferred();
  const replacedHarness = buildHarness({
    uidSequence: [
      'replaced-group', 'replaced-t1', 'replaced-t2',
      'replaced-s1', 'replaced-t3', 'replaced-s2',
    ],
    sendMessage: () => replacedReceipt.promise,
  });
  replacedHarness.state.workspaces[0].categories[0].groups[0].reminders = [
    { id: 'replaced-reminder', at: 1893456000000 },
  ];
  assert.equal(replacedHarness.api.openIdentityEditor(
    'group', 'duplicate', duplicateParams(), replacedHarness.opener,
  ), true);
  assert.equal(await replacedHarness.api.confirmIdentityEditor(), true);
  await new Promise(resolve => setImmediate(resolve));
  const replacedSpace = replacedHarness.state.workspaces[0].categories[0];
  const copiedIndex = replacedSpace.groups.findIndex(group => group.id === 'replaced-group');
  replacedSpace.groups[copiedIndex] = plain(replacedSpace.groups[copiedIndex]);
  replacedReceipt.resolve({ ok: false });
  await new Promise(resolve => setImmediate(resolve));
  const replacedWarning = replacedHarness.calls.toasts[1];
  assert.equal(replacedWarning.message, i18n.en['history.reminderReconcileWarning'],
    'A replaced copied-Group object must invalidate its copy-specific warning action');
  assert.equal(replacedWarning.options.undo, undefined,
    'A same-ID replacement must not retain stale exact Undo');
}

async function testDuplicateZhTWAndHistoryReconciliation() {
  const zhHarness = buildHarness({
    locale: 'zh-TW',
    uidSequence: [
      'zh-group', 'zh-t1', 'zh-t2', 'zh-s1', 'zh-t3', 'zh-s2',
    ],
    sendMessage: async () => ({ ok: false }),
  });
  const zhSource = zhHarness.state.workspaces[0].categories[0].groups[0];
  zhSource.reminders = [{ id: 'zh-reminder', at: 1893456000000 }];
  const zhName = i18n['zh-TW']['groupEditor.duplicateDefaultName'].replace('{name}', zhSource.name);
  assert.equal(zhHarness.api.openIdentityEditor(
    'group', 'duplicate', duplicateParams(), zhHarness.opener,
  ), true);
  assert.equal(zhHarness.input.value, zhName);
  assert.equal(await zhHarness.api.confirmIdentityEditor(), true);
  assert.equal(
    zhHarness.calls.snapshots[0].label,
    i18n['zh-TW']['groupEditor.duplicateHistory']
      .replace('{source}', zhSource.name)
      .replace('{name}', zhName),
    'zh-TW Duplicate history must use native localized copy',
  );
  assert.equal(
    zhHarness.calls.toasts[0].message,
    i18n['zh-TW']['groupEditor.duplicated']
      .replace('{source}', zhSource.name)
      .replace('{name}', zhName),
  );
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(
    zhHarness.calls.toasts[1].message,
    i18n['zh-TW']['groupEditor.duplicateReminderWarning'].replace('{name}', zhName),
  );
  assert.equal(zhHarness.calls.toasts[1].options.undo, 73);

  const undoReceipt = deferred();
  const undoReconcile = deferred();
  const undoHarness = buildHarness({
    locale: 'zh-TW',
    undo: () => undoReceipt.promise,
    sendMessage: () => undoReconcile.promise,
  });
  const undoPending = undoHarness.api.performUndo(73);
  assert.equal(undoHarness.calls.messages.length, 0,
    'Undo must not reconcile reminders before its state receipt');
  assert.equal(undoHarness.calls.renders, 0);
  const undoLabel = '建立群組副本';
  undoReceipt.resolve(undoLabel);
  await undoPending;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(undoHarness.calls.messages, [{ type: 'reconcile-reminders' }]);
  assert.equal(
    undoHarness.calls.toasts[0].message,
    i18n['zh-TW']['history.undid'].replace('{action}', undoLabel),
    'Acknowledged Undo feedback must remain localized',
  );
  undoReconcile.resolve({ ok: false });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(undoHarness.calls.toasts[1].message, i18n['zh-TW']['history.reminderReconcileWarning']);
  assert.equal(undoHarness.calls.toasts[1].options.tone, 'warning');

  const redoReceipt = deferred();
  const redoHarness = buildHarness({
    redo: () => redoReceipt.promise,
    sendMessage: async () => ({ ok: true }),
  });
  const redoPending = redoHarness.api.performRedo();
  assert.equal(redoHarness.calls.messages.length, 0,
    'Redo must not reconcile reminders before its state receipt');
  redoReceipt.resolve('redo');
  await redoPending;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(redoHarness.calls.messages, [{ type: 'reconcile-reminders' }]);
  assert.equal(redoHarness.calls.toasts[0].message, i18n.en['history.redid']);

  const noOpHarness = buildHarness({ undo: async () => null });
  await noOpHarness.api.performUndo(73);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(noOpHarness.calls.messages.length, 0,
    'No-op Undo must not reconcile reminders');

  const rejectedHarness = buildHarness({
    undo: async () => { throw new Error('undo persistence rejected'); },
  });
  await rejectedHarness.api.performUndo(73);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(rejectedHarness.calls.messages.length, 0,
    'Rejected Undo must not reconcile reminders');
  assert.equal(rejectedHarness.calls.toasts[0].options.danger, true);
}

async function testReceiptGatedCreateAndCollisionSafety() {
  const receipt = deferred();
  const harness = buildHarness({ persistNow: () => receipt.promise, uidSequence: ['g-a', 'fresh-group'] });
  assert.equal(harness.api.openIdentityEditor('group', 'create', {
    workspaceId: 'ws-a', spaceId: 'cat-a',
  }, harness.opener), true);
  harness.setInput('  New research  ');
  harness.api.getContext().draftSymbol = '🔬';
  harness.api.getContext().symbolChosen = true;
  harness.api.getContext().draftColor = '#06b6d4';
  const pending = harness.api.confirmIdentityEditor();

  const space = harness.state.workspaces[0].categories[0];
  const created = space.groups.find(candidate => candidate.name === 'New research');
  assert.ok(created, 'Confirmation must stage the new real Group before requesting its receipt');
  assert.equal(created.id, 'fresh-group', 'The allocator must skip an existing ID');
  assert.deepEqual(plain(created.items), [], 'A standalone create must produce an honest empty Group');
  assert.equal(harness.calls.uid, 2, 'Collision-safe allocation must retry without overwriting an entity');
  assert.equal(harness.calls.snapshots.length, 1, 'A create must take one snapshot');
  assert.equal(harness.calls.persists, 1, 'A create must request one immediate receipt');
  assert.equal(harness.calls.renders, 0, 'Rendering must wait for the persistence receipt');
  assert.equal(harness.calls.toasts.length, 0, 'Success feedback must wait for the persistence receipt');
  assert.equal(harness.overlay.classList.contains('hidden'), false, 'The editor must remain open while persistence is pending');
  const guardedControls = [
    harness.input, harness.symbolTrigger, ...harness.colors,
    harness.modalX, harness.cancel, harness.modalOk,
  ].filter(control => !control.hidden && !control.disabled);
  assert.deepEqual(guardedControls, [harness.modalOk],
    'A pending receipt must retain exactly one physically focusable guarded anchor');
  assert.equal(harness.modalOk.getAttribute('aria-disabled'), 'true',
    'The busy focus anchor must announce that activation is guarded');
  assert.equal(harness.document.activeElement, harness.modalOk,
    'Focus must move to the guarded primary action before the receipt wait');
  assert.equal(await harness.api.confirmIdentityEditor(), false,
    'Reactivating the guarded busy anchor must be a no-op');
  assert.equal(harness.calls.snapshots.length, 1);
  assert.equal(harness.calls.persists, 1);

  receipt.resolve();
  assert.equal(await pending, true);
  assert.equal(harness.calls.persists, 1, 'Receipt acknowledgement must not trigger a retry');
  assert.equal(harness.calls.renders, 1);
  assert.equal(harness.overlay.classList.contains('hidden'), true);
  assert.equal(harness.calls.toasts.length, 1);
  assert.equal(harness.calls.toasts[0].options.undo, 73, 'Success must carry the exact history receipt for Undo');
  assert.equal(harness.document.activeElement, harness.elements.get('created-focus'), 'Success must focus the newly rendered Group');
  assert.deepEqual(harness.calls.recent, ['🔬'], 'The confirmed symbol must become recent only inside the acknowledged transaction');
}

async function testPersistenceRejectionKeepsRecoveryTruth() {
  const harness = buildHarness({
    persistNow: async () => { throw new Error('storage unavailable'); },
    uidSequence: ['fresh-stack'],
  });
  assert.equal(harness.api.openIdentityEditor('stack', 'create', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-a',
  }, harness.opener), true);
  harness.setInput('Recovery queue');
  assert.equal(await harness.api.confirmIdentityEditor(), false);
  const group = harness.state.workspaces[0].categories[0].groups[0];
  assert.ok(group.items.some(item => item.id === 'fresh-stack' && item.name === 'Recovery queue'),
    'Persistence rejection must leave the dirty graph available to fail-closed recovery');
  assert.equal(harness.calls.snapshots.length, 1);
  assert.equal(harness.calls.persists, 1, 'The identity controller must not retry a failed write');
  assert.equal(harness.calls.renders, 0, 'Rejected persistence must not render a misleading success state');
  assert.equal(harness.calls.toasts.length, 0, 'Rejected persistence must not claim success');
  assert.equal(harness.overlay.classList.contains('hidden'), false, 'The editor must remain open behind recovery');
  assert.equal(harness.api.getBusy(), false);
  assert.equal(harness.api.getContext().errorKey, 'stackEditor.recoveryRequired');
  assert.equal(harness.api.getContext().unavailable, true);
  assert.equal(harness.app.inert, true, 'The identity interlock must remain owned while recovery resolves the dirty graph');
}

async function testMissingSymbolFallbackRemainsDraftOnly() {
  const noOp = buildHarness();
  const group = noOp.state.workspaces[0].categories[0].groups[1];
  delete group.symbol;
  assert.equal(noOp.api.openIdentityEditor('group', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-b',
  }, noOp.opener), true);
  assert.ok(noOp.api.getContext().draftSymbol, 'A missing symbol must still have a visible editor fallback');
  assert.equal(noOp.api.getContext().symbolChosen, undefined, 'Rendering a fallback must not count as choosing it');
  assert.equal(await noOp.api.confirmIdentityEditor(), true, 'An untouched fallback must be an edit no-op');
  assert.equal(noOp.calls.snapshots.length, 0, 'Opening and saving an untouched fallback must not create history');
  assert.equal(noOp.calls.persists, 0, 'Opening and saving an untouched fallback must not write');
  assert.equal(Object.hasOwn(group, 'symbol'), false, 'A no-op must preserve imported missing-symbol shape');

  const rename = buildHarness();
  const stack = rename.state.workspaces[0].categories[0].groups[0].items.find(item => item.id === 's1');
  delete stack.symbol;
  assert.equal(rename.api.openIdentityEditor('stack', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-a', stackId: 's1',
  }, rename.opener), true);
  rename.setInput('Renamed without choosing a symbol');
  assert.equal(await rename.api.confirmIdentityEditor(), true);
  assert.equal(stack.name, 'Renamed without choosing a symbol');
  assert.equal(Object.hasOwn(stack, 'symbol'), false,
    'Editing another field must not persist the visual symbol fallback');
  assert.equal(rename.calls.snapshots.length, 1);
  assert.equal(rename.calls.persists, 1);
  assert.equal(rename.calls.recent.length, 0, 'An unchosen fallback must not enter recent symbols');
}

async function testImportedColorAndRawNamePreservation() {
  const customNoOp = buildHarness();
  const customGroup = customNoOp.state.workspaces[0].categories[0].groups[0];
  customGroup.color = '#123456';
  assert.equal(customNoOp.api.openIdentityEditor('group', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-a',
  }, customNoOp.opener), true);
  assert.equal(customNoOp.customColor.hidden, false, 'An imported custom color must get a visible preservation swatch');
  assert.equal(customNoOp.customColor.dataset.c, '#123456');
  assert.equal(customNoOp.customColor.classList.contains('active'), true);
  assert.equal(customNoOp.customColor.tabIndex, 0);
  assert.equal(customNoOp.api.getContext().colorChosen, false, 'Representing an imported color must not count as choosing it');
  assert.equal(await customNoOp.api.confirmIdentityEditor(), true);
  assert.equal(customGroup.color, '#123456');
  assert.equal(customNoOp.calls.snapshots.length, 0);
  assert.equal(customNoOp.calls.persists, 0);

  const customRename = buildHarness();
  const customStack = customRename.state.workspaces[0].categories[0].groups[0].items.find(item => item.id === 's1');
  customStack.color = 'var(--imported-accent)';
  assert.equal(customRename.api.openIdentityEditor('stack', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-a', stackId: 's1',
  }, customRename.opener), true);
  customRename.setInput('Custom color rename');
  assert.equal(await customRename.api.confirmIdentityEditor(), true);
  assert.equal(customStack.name, 'Custom color rename');
  assert.equal(customStack.color, 'var(--imported-accent)',
    'A name-only edit must preserve an imported custom color byte-for-byte');

  const missingNoOp = buildHarness();
  const missingGroup = missingNoOp.state.workspaces[0].categories[0].groups[1];
  delete missingGroup.color;
  assert.equal(missingNoOp.api.openIdentityEditor('group', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-b',
  }, missingNoOp.opener), true);
  assert.equal(await missingNoOp.api.confirmIdentityEditor(), true);
  assert.equal(Object.hasOwn(missingGroup, 'color'), false, 'An untouched fallback must not materialize a missing Group color');
  assert.equal(missingNoOp.calls.persists, 0);

  const missingRename = buildHarness();
  const missingStack = missingRename.state.workspaces[0].categories[0].groups[0].items.find(item => item.id === 's1');
  delete missingStack.color;
  assert.equal(missingRename.api.openIdentityEditor('stack', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-a', stackId: 's1',
  }, missingRename.opener), true);
  missingRename.setInput('Missing color rename');
  assert.equal(await missingRename.api.confirmIdentityEditor(), true);
  assert.equal(Object.hasOwn(missingStack, 'color'), false,
    'A name-only edit must not persist the visual default for a missing Stack color');

  const explicit = buildHarness();
  const explicitGroup = explicit.state.workspaces[0].categories[0].groups[1];
  delete explicitGroup.color;
  assert.equal(explicit.api.openIdentityEditor('group', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-b',
  }, explicit.opener), true);
  explicit.api.selectIdentityColor('#3b82f6', { chosen: true });
  assert.equal(explicit.api.getContext().colorChosen, true);
  assert.equal(await explicit.api.confirmIdentityEditor(), true);
  assert.equal(explicitGroup.color, '#3b82f6', 'An explicit palette choice may materialize the selected color');
  assert.equal(explicit.calls.snapshots.length, 1);
  assert.equal(explicit.calls.persists, 1);

  const rawNoOp = buildHarness();
  const rawGroup = rawNoOp.state.workspaces[0].categories[0].groups[0];
  rawGroup.name = '  Imported group  ';
  assert.equal(rawNoOp.api.openIdentityEditor('group', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-a',
  }, rawNoOp.opener), true);
  assert.equal(await rawNoOp.api.confirmIdentityEditor(), true);
  assert.equal(rawGroup.name, '  Imported group  ', 'An untouched raw Group name must survive editor display');
  assert.equal(rawNoOp.calls.persists, 0);

  const rawOtherField = buildHarness();
  const rawStack = rawOtherField.state.workspaces[0].categories[0].groups[0].items.find(item => item.id === 's1');
  rawStack.name = '  Imported stack  ';
  assert.equal(rawOtherField.api.openIdentityEditor('stack', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-a', stackId: 's1',
  }, rawOtherField.opener), true);
  rawOtherField.api.selectIdentityColor('#ef4444', { chosen: true });
  assert.equal(await rawOtherField.api.confirmIdentityEditor(), true);
  assert.equal(rawStack.name, '  Imported stack  ', 'A color-only edit must preserve an untouched raw Stack name');
  assert.equal(rawStack.color, '#ef4444');

  const intentional = buildHarness();
  const intentionalStack = intentional.state.workspaces[0].categories[0].groups[0].items.find(item => item.id === 's1');
  intentionalStack.name = '  Old raw name  ';
  assert.equal(intentional.api.openIdentityEditor('stack', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-a', stackId: 's1',
  }, intentional.opener), true);
  intentional.setInput('  Intentional rename  ');
  assert.equal(await intentional.api.confirmIdentityEditor(), true);
  assert.equal(intentionalStack.name, 'Intentional rename', 'An intentional name edit must store its trimmed value');
}

async function testNameValidationAndColorRoving() {
  const harness = buildHarness();
  assert.equal(harness.api.openIdentityEditor('group', 'create', {
    workspaceId: 'ws-a', spaceId: 'cat-a',
  }, harness.opener), true);
  harness.setInput('');
  assert.equal(await harness.api.confirmIdentityEditor(), false);
  assert.equal(harness.api.getContext().errorKey, 'groupEditor.nameRequired');
  assert.equal(harness.input.getAttribute('aria-invalid'), 'true');
  assert.equal(harness.input.getAttribute('aria-describedby'), 'modal-error');

  harness.api.selectIdentityColor('#3b82f6', { chosen: true });
  assert.equal(harness.api.getContext().errorKey, 'groupEditor.nameRequired',
    'Choosing a color must not clear a blank-name error');
  harness.api.getContext().draftSymbol = '🔎';
  harness.api.getContext().symbolChosen = true;
  harness.api.clearIdentityEditorError();
  assert.equal(harness.api.getContext().errorKey, 'groupEditor.nameRequired',
    'Choosing a symbol must not clear a blank-name error');

  const slate = harness.colors.find(color => color.dataset.colorKey === 'slate');
  const indigo = harness.colors.find(color => color.dataset.colorKey === 'indigo');
  harness.api.selectIdentityColor('#64748b', { chosen: true });
  assert.equal(slate.tabIndex, 0);
  assert.equal(harness.customColor.hidden, true);
  const arrow = eventFor('ArrowRight', slate);
  assert.equal(harness.api.handleIdentityColorKeydown(arrow), true);
  assert.equal(harness.document.activeElement, indigo,
    'Arrow roving from the final built-in color must wrap past a hidden custom swatch to the first built-in color');
  assert.equal(harness.customColor.tabIndex, -1);
  assert.equal(harness.customColor.hidden, true);
  assert.equal(harness.api.getContext().errorKey, 'groupEditor.nameRequired');

  harness.setInput('Valid name');
  harness.api.clearIdentityEditorError();
  assert.equal(harness.api.getContext().errorKey, '', 'The name error may clear once the name is actually nonblank');
  assert.equal(harness.input.getAttribute('aria-invalid'), 'false');
  assert.equal(harness.input.getAttribute('aria-describedby'), undefined);
}

async function testBatchAtomicityAndExactSelection() {
  const receipt = deferred();
  const harness = buildHarness({
    persistNow: () => receipt.promise,
    uidSequence: ['fresh-batch-stack'],
    selectedIds: ['t4', 't2'],
  });
  const groupA = harness.state.workspaces[0].categories[0].groups[0];
  const groupB = harness.state.workspaces[0].categories[0].groups[1];
  const t2 = groupA.items.find(item => item.id === 't2');
  const t4 = groupB.items.find(item => item.id === 't4');
  const before = JSON.stringify(harness.state);
  assert.equal(harness.api.openIdentityEditor('stack', 'batch-create', {
    itemIds: [...harness.selectedItemIds],
  }, harness.opener), true);
  assert.equal(JSON.stringify(harness.state), before, 'Opening Batch Stack must not remove or move selected items');
  assert.equal(harness.calls.snapshots.length, 0);
  assert.equal(harness.calls.persists, 0);
  assert.deepEqual(new Set(harness.api.getContext().batchIds), new Set(['t2', 't4']), 'The transaction must retain exactly the selected IDs');
  assert.equal(harness.api.getContext().groupId, 'g-b', 'The first explicitly selected item must determine the destination Group');

  harness.setInput('Selection stack');
  const pending = harness.api.confirmIdentityEditor();
  const created = groupB.items.find(item => item.id === 'fresh-batch-stack');
  assert.ok(created, 'Batch confirmation must stage one real Stack');
  assert.equal(created.items.length, 2, 'The Stack must contain exactly the selected objects');
  assert.equal(created.items[0], t2, 'The first selected object must retain identity and visual order');
  assert.equal(created.items[1], t4, 'The second selected object must retain identity and visual order');
  assert.ok(groupA.items.some(item => item.id === 't1'), 'Unselected siblings must remain untouched');
  assert.ok(!groupA.items.some(item => item.id === 't2'));
  assert.ok(!groupB.items.some(item => item.id === 't4'));
  assert.deepEqual([...harness.selectedItemIds], ['t4', 't2'], 'Selection UI must remain truthful until persistence acknowledges the move');
  assert.equal(harness.calls.snapshots.length, 1);
  assert.equal(harness.calls.persists, 1);
  assert.equal(harness.calls.renders, 0);
  assert.equal(harness.calls.toasts.length, 0);

  receipt.resolve();
  assert.equal(await pending, true);
  assert.equal(harness.selectedItemIds.size, 0, 'Selection must clear only after the acknowledged batch mutation');
  assert.equal(harness.calls.syncSelection, 1);
  assert.equal(harness.calls.toolbarRemovals, 1);
  assert.equal(harness.calls.renders, 1);
  assert.equal(harness.calls.toasts[0].options.undo, 73);
}

function testKeyboardFocusAndInterlockDynamically() {
  const harness = buildHarness();
  assert.equal(harness.api.openIdentityEditor('group', 'edit', {
    workspaceId: 'ws-a', spaceId: 'cat-a', groupId: 'g-a',
  }, harness.opener), true);
  const tab = eventFor('Tab', harness.input);
  assert.equal(harness.api.handleIdentityEditorKeydown(tab), true);
  assert.equal(harness.calls.traps, 1, 'Tab must delegate to the shared modal focus trap');

  harness.emoji.classList.remove('hidden');
  const emojiTarget = harness.elements.get('ep-search-input');
  const nestedEscape = eventFor('Escape', emojiTarget);
  assert.equal(harness.api.handleIdentityEditorGlobalKey(nestedEscape), false,
    'The identity editor must not consume Escape owned by its nested picker');
  assert.equal(harness.overlay.classList.contains('hidden'), false);
  harness.emoji.classList.add('hidden');

  const escape = eventFor('Escape', harness.input);
  assert.equal(harness.api.handleIdentityEditorKeydown(escape), true);
  assert.equal(escape.defaultPrevented, true);
  assert.equal(escape.propagationStopped, true);
  assert.equal(harness.overlay.classList.contains('hidden'), true);
  assert.equal(harness.document.activeElement, harness.opener, 'Escape must return focus to the invoking control');
  assert.equal(harness.app.inert, false);

  const blocked = buildHarness();
  blocked.recovery.classList.remove('hidden');
  blocked.recovery.focus();
  assert.equal(blocked.api.openIdentityEditor('group', 'create', {
    workspaceId: 'ws-a', spaceId: 'cat-a',
  }, blocked.opener), false, 'Recovery must block a new identity decision');
  assert.equal(blocked.overlay.classList.contains('hidden'), true);
  assert.equal(blocked.calls.locks, 0);
  assert.equal(blocked.document.activeElement, blocked.recovery,
    'A pre-existing recovery foreground must retain focus when it blocks editor opening');
}

function testGroupFocusSelectorOrderAfterRerender() {
  const groupId = 'g-a';
  const selectors = [
    `.gcol[data-gid="${groupId}"] .gcol-toggle:not(.hidden)`,
    `.gcol[data-gid="${groupId}"] [data-act="more"]`,
    `.lv-group[data-gid="${groupId}"] .lv-group-toggle`,
  ];
  const queries = [];
  let renderedControls = new Map();
  const document = {
    activeElement: null,
    getElementById(id) {
      return id === 'item-detail' ? { dataset: { itemId: '' } } : null;
    },
    querySelector(selector) {
      queries.push(selector);
      const target = renderedControls.get(selector) || null;
      if (target?.classList.contains('hidden') && selector.includes(':not(.hidden)')) return null;
      return target;
    },
  };
  function control(id, classes = []) {
    return {
      id,
      classList: new ClassList(...classes),
      isConnected: true,
      focusCount: 0,
      scrollCount: 0,
      focus() {
        if (!this.isConnected || this.classList.contains('hidden')) return;
        this.focusCount += 1;
        document.activeElement = this;
      },
      scrollIntoView() { this.scrollCount += 1; },
    };
  }
  const context = vm.createContext({
    document,
    CSS: { escape(value) { return String(value); } },
    String,
  });
  vm.runInContext(
    `${extractFunction('focusIdentityTarget')}\n` +
      'globalThis.runFocusIdentityTarget = focusIdentityTarget;',
    context,
    { filename: 'group-focus-selector-order-contract.js' },
  );

  const visibleToggle = control('visible-toggle', ['gcol-toggle']);
  const standardMore = control('standard-more');
  const standardListToggle = control('standard-list-toggle');
  renderedControls = new Map([
    [selectors[0], visibleToggle],
    [selectors[1], standardMore],
    [selectors[2], standardListToggle],
  ]);
  assert.equal(context.runFocusIdentityTarget('group', groupId), true);
  assert.equal(document.activeElement, visibleToggle,
    'A normal Group rerender must restore focus to its visible collapse toggle first');
  assert.deepEqual(queries.splice(0), [selectors[0]],
    'A successful visible-toggle focus must not probe later Group fallbacks');

  visibleToggle.isConnected = false;
  const hiddenForcedToggle = control('forced-hidden-toggle', ['gcol-toggle', 'hidden']);
  const forcedMore = control('forced-more');
  const forcedListToggle = control('forced-list-toggle');
  renderedControls = new Map([
    [selectors[0], hiddenForcedToggle],
    [selectors[1], forcedMore],
    [selectors[2], forcedListToggle],
  ]);
  assert.equal(context.runFocusIdentityTarget('group', groupId), true);
  assert.equal(document.activeElement, forcedMore,
    'A forced-expanded Group with a hidden toggle must restore focus to its visible More button after rerender');
  assert.equal(hiddenForcedToggle.focusCount, 0,
    'The hidden forced-expanded toggle must never receive focus');
  assert.equal(forcedListToggle.focusCount, 0,
    'The same rendered Group More button must win before the List fallback');
  assert.deepEqual(queries.splice(0), selectors.slice(0, 2),
    'Forced-expanded focus must probe the visible toggle selector, then the same Group More button');

  forcedMore.isConnected = false;
  const listOnlyToggle = control('list-only-toggle');
  renderedControls = new Map([[selectors[2], listOnlyToggle]]);
  assert.equal(context.runFocusIdentityTarget('group', groupId), true);
  assert.equal(document.activeElement, listOnlyToggle,
    'List view must remain the final Group focus fallback when Board controls are absent');
  assert.deepEqual(queries.splice(0), selectors,
    'List fallback must be queried only after the visible Board toggle and same Group More button');
}

function testSharedGroupActionMenuModel() {
  // Open all is offered only when the Group holds a page Reopen accepts
  // (see saved-page-reopen-contract-test.js), so the fixture carries one.
  const group = {
    id: 'group-1',
    name: 'Inbox',
    collapsed: false,
    items: [{ id: 'tab-1', type: 'tab', title: 'Docs', url: 'https://docs.example.test/' }],
  };
  const opener = { id: 'group-more' };
  const calls = { identity: [], openAll: [], move: [], archive: [] };
  let resolvedGroup = group;
  const factory = vm.runInNewContext(`(() => {
    ${extractFunction('isOpenableSavedTabUrl')}
    ${extractFunction('groupHasReopenableSavedTab')}
    ${extractFunction('groupRecordCreationMenuItems')}
    ${extractFunction('groupActionMenuItems')}
    return groupActionMenuItems;
  })()`, {
    URL,
    identityGroupTarget(groupId) {
      if (groupId !== 'group-1' || !resolvedGroup) return null;
      return {
        workspace: { id: 'workspace-1' },
        space: { id: 'space-1' },
        group: resolvedGroup,
      };
    },
    tr(key) { return key; },
    cmIcons: {
      edit: 'edit', clock: 'clock', open: 'open', expand: 'expand',
      copy: 'copy', note: 'note', todo: 'todo', stack: 'stack', archive: 'archive',
    },
    createBoardLocalRecord() {},
    openIdentityEditor(...args) { calls.identity.push(args); },
    openIntentEditor() {},
    openEntityReminderPickerOrReport() {},
    openGroupAll(...args) { calls.openAll.push(args); },
    openGroupPage() {},
    organizationGroupMoveMenuItems(groupId, actualOpener) {
      calls.move.push([groupId, actualOpener]);
      return [{ text: 'move' }];
    },
    archiveGroup(groupId) { calls.archive.push(groupId); },
  });
  let toggles = 0;
  const items = factory(group, opener, { toggleCollapse: () => { toggles += 1; } });
  assert.ok(items.some(item => item.text === 'groupAction.openAll'),
    'the shared action model must expose the core recovery action for the exact rendered Group');
  assert.deepEqual(
    plain(items.filter(item => ['groupAction.addNote', 'groupAction.addTodo', 'groupAction.addStack'].includes(item.text)).map(item => item.text)),
    ['groupAction.addNote', 'groupAction.addTodo', 'groupAction.addStack'],
    'the shared List action model must keep local record types together inside the contextual menu',
  );
  assert.deepEqual(plain(calls.move), [['group-1', { id: 'group-more' }]],
    'the shared Move section must receive the exact Group ID and actual opener');

  items.find(item => item.text === 'groupAction.duplicate').action();
  assert.deepEqual(plain(calls.identity), [[
    'group',
    'duplicate',
    { workspaceId: 'workspace-1', spaceId: 'space-1', groupId: 'group-1' },
    { id: 'group-more' },
  ]], 'Duplicate must retain the exact identity tuple and actual opener');
  items.find(item => item.text === 'groupAction.openAll').action();
  assert.deepEqual(plain(calls.openAll), [[group, { id: 'group-more' }]],
    'Open all must retain the exact rendered Group and actual opener');
  items.find(item => item.text === 'groupAction.collapse').action();
  assert.equal(toggles, 1, 'the shared collapse action must invoke only the supplied surface controller');

  const savedItems = group.items;
  group.items = [];
  assert.ok(!factory(group, opener).some(item => item.text === 'groupAction.openAll'),
    'a Group with no reopenable page must not advertise Open all');
  group.items = savedItems;

  resolvedGroup = { ...group };
  assert.deepEqual(plain(factory(group, opener)), [],
    'a same-ID replacement must fail closed instead of exposing actions on a detached Group');
  resolvedGroup = null;
  assert.deepEqual(plain(factory(group, opener)), [],
    'a missing or ambiguous Group must fail closed before exposing actions');
}

function testSharedStackActionMenuModel() {
  const stack = { id: 'stack-1', type: 'stack', name: 'Sources', expanded: false, items: [] };
  const parentItems = [stack];
  const group = { id: 'group-1', name: 'Inbox', items: parentItems };
  const opener = { id: 'stack-more' };
  const calls = { identity: [], common: [], archive: [] };
  let resolvedStack = stack;
  let resolvedParentItems = parentItems;
  let resolvedGroup = group;
  const factory = vm.runInNewContext(`(${extractFunction('stackActionMenuItems')})`, {
    identityStackTarget(stackId) {
      if (stackId !== 'stack-1' || !resolvedStack) return null;
      return {
        workspace: { id: 'workspace-1' },
        space: { id: 'space-1' },
        group: resolvedGroup,
        item: resolvedStack,
        parentItems: resolvedParentItems,
      };
    },
    tr(key) { return key; },
    cmIcons: { edit: 'edit' },
    openIdentityEditor(...args) { calls.identity.push(args); },
    openIntentEditor() {},
    archiveBoardLocalItemWithFocus(...args) { calls.archive.push(args); return true; },
    commonActs(item, extra, options) {
      calls.common.push({ item, extra, options });
      return [
        { text: 'itemAction.details' },
        { text: 'itemAction.archive', action: options.archiveAction },
      ];
    },
  });
  let toggles = 0;
  const menuOptions = {
    parentItems,
    group,
    toggleCollapse: () => { toggles += 1; },
  };
  const items = factory(stack, opener, menuOptions);
  assert.ok(items.some(item => item.text === 'itemAction.details'),
    'the exact Stack must retain the established Details recovery action');
  assert.equal(calls.common.length, 1, 'the shared Stack model must build one common action section');
  assert.equal(calls.common[0].item, stack);
  assert.equal(calls.common[0].options.mutationOpener, opener,
    'Stack reminder/archive actions must retain the actual visible opener');

  items.find(item => item.text === 'stackAction.edit').action();
  assert.deepEqual(plain(calls.identity), [[
    'stack',
    'edit',
    { workspaceId: 'workspace-1', spaceId: 'space-1', groupId: 'group-1', stackId: 'stack-1' },
    { id: 'stack-more' },
  ]], 'Stack Edit must retain the exact identity tuple and actual opener');
  items.find(item => item.text === 'stackAction.expand').action();
  assert.equal(toggles, 1, 'the shared disclosure action must invoke only the supplied surface controller');
  items.find(item => item.text === 'itemAction.archive').action();
  assert.deepEqual(plain(calls.archive), [[
    stack,
    [stack],
    group,
    { id: 'stack-more' },
  ]], 'Stack Archive must retain the complete exact Stack, parent list, Group, and opener');

  resolvedParentItems = [stack];
  assert.deepEqual(plain(factory(stack, opener, menuOptions)), [],
    'a Stack moved to a different parent list must fail closed from its stale rendered header');
  resolvedParentItems = parentItems;
  resolvedGroup = { ...group, items: parentItems };
  assert.deepEqual(plain(factory(stack, opener, menuOptions)), [],
    'a Stack moved to a different Group must fail closed from its stale rendered header');
  resolvedGroup = group;
  resolvedStack = { ...stack };
  assert.deepEqual(plain(factory(stack, opener, menuOptions)), [],
    'a same-ID Stack replacement must fail closed instead of exposing detached actions');
  resolvedStack = null;
  assert.deepEqual(plain(factory(stack, opener, menuOptions)), [],
    'a missing or duplicate Stack must fail closed before exposing actions');
}

async function run() {
  testStaticReachabilityAndLegacyRemoval();
  testSharedGroupActionMenuModel();
  testSharedStackActionMenuModel();
  testStaticTransactionContracts();
  testMarkupLocalizationAndResponsiveHooks();
  testEscapeAndPickerStackContracts();
  testHistoryNavigationIdentityInterlock();
  await testBlankCancelAndPrimitiveContexts();
  await testStaleMovedAndSelectionPreflight();
  await testDuplicateZeroWritePreflights();
  await testDuplicateReceiptCloneLayoutAndReminderContract();
  await testDuplicatePersistenceRejectionKeepsDirtyTruth();
  await testDuplicateFocusedGroupRouteAndDelayedWarning();
  await testDuplicateZhTWAndHistoryReconciliation();
  await testReceiptGatedCreateAndCollisionSafety();
  await testPersistenceRejectionKeepsRecoveryTruth();
  await testMissingSymbolFallbackRemainsDraftOnly();
  await testImportedColorAndRawNamePreservation();
  await testNameValidationAndColorRoving();
  await testBatchAtomicityAndExactSelection();
  testKeyboardFocusAndInterlockDynamically();
  testGroupFocusSelectorOrderAfterRerender();
  console.log('Group/Stack identity contracts passed: stable IDs, atomic Duplicate receipts, production Canvas placement, history/recovery ordering, post-history reminders, localization, and focus stack.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
