'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
  const marker = 'const I18N = ';
  const start = source.indexOf(marker);
  const trStart = source.indexOf('\nfunction tr(', start);
  const close = source.lastIndexOf('};', trStart);
  assert.ok(start >= 0 && trStart > start && close > start, 'I18N must remain extractable');
  return vm.runInNewContext(
    `(${source.slice(start + marker.length, close + 1)})`,
    {},
    { filename: 'organization-move-i18n-extract.js' },
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

async function settleUntil(predicate, message, attempts = 50) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.ok(predicate(), message);
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

class Element {
  constructor(document, tagName = 'div', id = '') {
    this.ownerDocument = document;
    this.tagName = String(tagName).toUpperCase();
    this.id = id;
    this.classList = new ClassList();
    this.dataset = {};
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this._textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.inert = false;
    this.isConnected = true;
    this.value = '';
    this.title = '';
    this.type = '';
    this.tabIndex = 0;
    this.onclick = null;
    this.scrollTop = 0;
    this.scrollCalls = [];
  }
  get textContent() { return this._textContent; }
  set textContent(value) {
    this._textContent = String(value ?? '');
    if (this._textContent === '') {
      this.children.forEach(child => { child.isConnected = false; child.parentElement = null; });
      this.children = [];
    }
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  appendChild(child) {
    child.parentElement = this;
    child.isConnected = true;
    this.children.push(child);
    return child;
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  contains(target) {
    if (target === this) return true;
    return this.children.some(child => child.contains(target));
  }
  focus() {
    if (this.isConnected !== false && !this.disabled && !this.inert) this.ownerDocument.activeElement = this;
  }
  scrollIntoView(options) { this.scrollCalls.push(options); }
  select() { this.focus(); }
}

function ownerSet(element) {
  return new Set(String(element?.dataset?.locusInertOwners || '').split(' ').filter(Boolean));
}

function visible(element) {
  return !!element && !element.hidden && !element.classList.contains('hidden');
}

function makeState() {
  return {
    activeWsId: 'ws-a',
    settings: {
      language: 'en',
      captureDefaultCategoryId: 'cat-a',
      captureLastTarget: {
        workspaceId: 'ws-a', categoryId: 'cat-a', groupId: 'group-a', mode: 'manual',
      },
      retained: { exact: true },
    },
    columnSizes: {
      'group-a': { width: 444, density: 'comfortable' },
      'group-b': { width: 322 },
    },
    columnWidths: { 'group-a': 444, 'group-b': 322 },
    archive: [
      {
        id: 'archive-exact', kind: 'item', wsId: 'ws-a', catId: 'cat-a', catName: 'Reading',
        groupId: 'group-a', groupName: 'Inbox', data: { id: 'archived-tab', type: 'tab' },
      },
      {
        id: 'archive-other-space', kind: 'item', wsId: 'ws-a', catId: 'cat-c', catName: 'Projects',
        groupId: 'group-a', groupName: 'Inbox', data: { id: 'other-archive', type: 'note' },
      },
      {
        id: 'archive-group-envelope', kind: 'group', wsId: 'ws-a', catId: 'cat-a', catName: 'Reading',
        groupId: 'group-a', groupName: 'Inbox', data: { id: 'archived-group', items: [] },
      },
    ],
    trash: [
      {
        id: 'trash-exact', kind: 'item', wsId: 'ws-a', catId: 'cat-a', catName: 'Reading',
        groupId: 'group-a', groupName: 'Inbox', data: { id: 'trashed-note', type: 'note' },
      },
      {
        id: 'trash-other-group', kind: 'item', wsId: 'ws-a', catId: 'cat-a', catName: 'Reading',
        groupId: 'group-b', groupName: 'Outside', data: { id: 'other-trash', type: 'todo' },
      },
    ],
    workspaces: [
      {
        id: 'ws-a',
        name: 'Research',
        symbol: 'R',
        activeCatId: 'cat-a',
        categories: [
          {
            id: 'cat-a',
            name: 'Reading',
            layout: 'board',
            canvasPositions: {
              'group-a': { x: 17, y: 29, lane: 'source' },
              'group-b': { x: 4, y: 8 },
            },
            groups: [
              {
                id: 'group-a',
                name: 'Inbox',
                symbol: 'I',
                color: '#6366f1',
                collapsed: false,
                reminders: [{ id: 'group-reminder', at: 42 }],
                customImportedField: { keep: true },
                items: [
                  {
                    id: 'stack-a', type: 'stack', name: 'Nested', custom: 'keep', items: [
                      { id: 'tab-a', type: 'tab', title: 'Source', url: 'https://example.test' },
                      { id: 'note-a', type: 'note', html: '<p>Exact</p>' },
                    ],
                  },
                  { id: 'top-a', type: 'todo', text: 'Top', done: false },
                ],
              },
              {
                id: 'group-b', name: 'Outside', symbol: 'O', color: '#0ea5e9', collapsed: false,
                items: [{ id: 'outside-item', type: 'note', html: '<p>Outside</p>' }],
              },
            ],
          },
          {
            id: 'cat-b',
            name: 'Projects',
            layout: 'list',
            canvasPositions: {
              'target-group': { x: 90, y: 30 },
              'group-a': { x: 999, y: 999, stale: true },
            },
            groups: [
              { id: 'target-group', name: 'Inbox', symbol: 'T', color: '#10b981', collapsed: false, items: [] },
            ],
          },
          { id: 'cat-c', name: 'Projects', layout: 'canvas', groups: [] },
        ],
      },
      {
        id: 'ws-b', name: 'Research', activeCatId: 'cat-z',
        categories: [{ id: 'cat-z', name: 'Other', groups: [] }],
      },
    ],
  };
}

const i18n = readI18n();
const productionFunctions = [
  'setElementInertOwner',
  'focusDialogOpener',
  'organizationWorkspaceTarget',
  'organizationGroupTarget',
  'identitySpaceTarget',
  'identityGroupTarget',
  'organizationGroupMoveOptions',
  'organizationMoveSpaceLabel',
  'organizationGroupMoveFingerprint',
  'organizationGroupItemIds',
  'organizationMoveOptionButton',
  'selectOrganizationMoveDestination',
  'paintOrganizationMoveOptions',
  'paintOrganizationNameDialog',
  'setOrganizationNameBusy',
  'setOrganizationNameError',
  'setOrganizationNameInterlock',
  'focusOrganizationNameFallback',
  'closeOrganizationNameDialog',
  'openOrganizationGroupMove',
  'organizationGroupMoveMenuItems',
  'confirmOrganizationGroupMove',
  'confirmOrganizationName',
  'bindOrganizationNameDialog',
  'handleOrganizationNameGlobalKey',
];
const controllerSource = productionFunctions.map(extractFunction).join('\n');

function buildHarness({
  locale = 'en',
  persistNow = async () => undefined,
  simulateRecoveryOnFailure = false,
  selectedIds = ['stack-a', 'note-a', 'top-a', 'outside-item'],
  lastSelectedId = 'note-a',
} = {}) {
  const state = makeState();
  const calls = {
    snapshots: [], persists: 0, renders: 0, toasts: [], locks: 0, unlocks: 0,
    traps: 0, selectionSyncs: 0, selectionToolbars: 0, newSpace: [],
  };
  const elements = new Map();
  const bodyChildren = [];
  const document = {
    activeElement: null,
    body: { children: bodyChildren },
    getElementById(id) { return elements.get(id) || null; },
    createElement(tagName) { return new Element(document, tagName); },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === '#organization-move-options .organization-move-option') {
        return moveOptions.children.filter(child => child.tagName === 'BUTTON');
      }
      if (selector.includes('.space-item')) return [sourceSpaceItem, destinationSpaceItem, otherSpaceItem];
      if (selector.includes('.wsg-card')) return [];
      if (selector.includes('.ws-chip')) return [];
      if (selector.includes('.home-card-more')) return [];
      return [];
    },
  };

  function makeElement(id, tagName = 'div', classes = [], { bodyChild = false, parent = null } = {}) {
    const element = new Element(document, tagName, id);
    element.classList.add(...classes);
    elements.set(id, element);
    if (bodyChild) bodyChildren.push(element);
    if (parent) parent.appendChild(element);
    return element;
  }

  const app = makeElement('app', 'main', [], { bodyChild: true });
  const landing = makeElement('landing-layer', 'div', ['hidden'], { bodyChild: true });
  const workspaceGrid = makeElement('ws-grid-overlay', 'div', ['hidden'], { bodyChild: true });
  const recoveryOverlay = makeElement('state-recovery-overlay', 'div', ['hidden'], { bodyChild: true });
  const recoveryReload = makeElement('state-recovery-reload', 'button', [], { parent: recoveryOverlay });
  const deleteOverlay = makeElement('organization-delete-overlay', 'div', ['hidden'], { bodyChild: true });
  const trashOverlay = makeElement('trash-delete-overlay', 'div', ['hidden'], { bodyChild: true });
  const legacyModal = makeElement('modal-overlay', 'div', ['hidden'], { bodyChild: true });
  const overlay = makeElement('organization-name-overlay', 'div', ['hidden'], { bodyChild: true });
  const title = makeElement('organization-name-title', 'h2', [], { parent: overlay });
  const close = makeElement('organization-name-close', 'button', [], { parent: overlay });
  const label = makeElement('organization-name-label', 'label', [], { parent: overlay });
  const input = makeElement('organization-name-input', 'input', [], { parent: overlay });
  const description = makeElement('organization-name-description', 'p', [], { parent: overlay });
  description.hidden = true;
  const moveField = makeElement('organization-move-field', 'div', [], { parent: overlay });
  moveField.hidden = true;
  const moveLabel = makeElement('organization-move-label', 'div', [], { parent: moveField });
  const moveOptions = makeElement('organization-move-options', 'div', [], { parent: moveField });
  const error = makeElement('organization-name-error', 'p', [], { parent: overlay });
  error.hidden = true;
  const cancel = makeElement('organization-name-cancel', 'button', [], { parent: overlay });
  const confirm = makeElement('organization-name-confirm', 'button', [], { parent: overlay });
  const addSpace = makeElement('add-cat-btn', 'button');
  makeElement('ws-menu-btn', 'button');
  const sourceSpaceItem = makeElement('source-space-item', 'button');
  sourceSpaceItem.classList.add('space-item');
  sourceSpaceItem.dataset.catId = 'cat-a';
  const destinationSpaceItem = makeElement('destination-space-item', 'button');
  destinationSpaceItem.classList.add('space-item');
  destinationSpaceItem.dataset.catId = 'cat-b';
  const otherSpaceItem = makeElement('other-space-item', 'button');
  otherSpaceItem.classList.add('space-item');
  otherSpaceItem.dataset.catId = 'cat-c';
  const opener = makeElement('group-more', 'button');
  document.activeElement = opener;

  const selectedItemIds = new Set(selectedIds.map(String));
  const openers = new WeakMap();
  let currentLocale = locale;
  let context;

  const State = {
    get() { return state; },
    snapshot(labelText) {
      calls.snapshots.push({ label: labelText, data: plain(state) });
      return 73;
    },
    async persistNow() {
      calls.persists += 1;
      try {
        return await persistNow();
      } catch (failure) {
        if (simulateRecoveryOnFailure) {
          recoveryOverlay.classList.remove('hidden');
          for (const child of bodyChildren) {
            if (child === recoveryOverlay) continue;
            context.__move.setElementInertOwner(child, 'recovery', true);
          }
        }
        throw failure;
      }
    },
  };

  context = vm.createContext({
    document,
    State,
    selectedItemIds,
    __lastSelectedItemId: lastSelectedId,
    cmIcons: { move: '<move>' },
    openOrganizationCreate(kind, options, target) {
      calls.newSpace.push({ kind, options: plain(options), opener: target });
      return true;
    },
    tr(key, vars = {}) {
      const dictionary = i18n[currentLocale] || i18n.en;
      return String(dictionary[key] || i18n.en[key] || key)
        .replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
    },
    rememberOpener(element) { openers.set(element, document.activeElement); },
    restoreOpener(element) {
      const target = openers.get(element);
      openers.delete(element);
      if (!target || target.isConnected === false || target.inert) return false;
      target.focus();
      return document.activeElement === target;
    },
    lockBodyScroll() { calls.locks += 1; },
    unlockBodyScroll() { calls.unlocks += 1; },
    trapTabKey() { calls.traps += 1; },
    renderAll() { calls.renders += 1; },
    renderItemSelToolbar() { calls.selectionToolbars += 1; },
    syncItemSelMode() { calls.selectionSyncs += 1; },
    toast(message, options) { calls.toasts.push({ message, options }); },
    setTimeout(callback) { callback(); return 1; },
    JSON,
    Object,
    String,
    Set,
    Array,
    Error,
  });

  vm.runInContext(
    `let organizationNameCtx = null;\n` +
      `let organizationNameBusy = false;\n` +
      `let lastSelectedItemId = globalThis.__lastSelectedItemId;\n` +
      `${controllerSource}\n` +
      `globalThis.__move = {\n` +
      `  setElementInertOwner, organizationGroupMoveOptions, organizationGroupMoveFingerprint,\n` +
      `  organizationGroupItemIds, selectOrganizationMoveDestination, paintOrganizationNameDialog,\n` +
      `  openOrganizationGroupMove, organizationGroupMoveMenuItems, confirmOrganizationGroupMove,\n` +
      `  confirmOrganizationName, closeOrganizationNameDialog, bindOrganizationNameDialog,\n` +
      `  handleOrganizationNameGlobalKey, getContext: () => organizationNameCtx,\n` +
      `  getBusy: () => organizationNameBusy, getLastSelected: () => lastSelectedItemId,\n` +
      `};`,
    context,
    { filename: 'organization-move-production-contract.js' },
  );

  function dispatch(element, type, event = {}) {
    const enriched = {
      target: element,
      currentTarget: element,
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
      ...event,
    };
    if (type === 'click' && typeof element.onclick === 'function') element.onclick(enriched);
    for (const listener of element.listeners.get(type) || []) listener(enriched);
    return enriched;
  }

  return {
    api: context.__move,
    state,
    calls,
    document,
    selectedItemIds,
    setLocale(value) { currentLocale = value; },
    dispatch,
    moveButtons() {
      return document.querySelectorAll('#organization-move-options .organization-move-option');
    },
    app,
    landing,
    workspaceGrid,
    recoveryOverlay,
    recoveryReload,
    deleteOverlay,
    trashOverlay,
    legacyModal,
    overlay,
    title,
    close,
    label,
    input,
    description,
    moveField,
    moveLabel,
    moveOptions,
    error,
    cancel,
    confirm,
    addSpace,
    sourceSpaceItem,
    destinationSpaceItem,
    otherSpaceItem,
    opener,
  };
}

function testStaticBoundaryAndWiring() {
  const menu = extractFunction('organizationGroupMoveMenuItems');
  const open = extractFunction('openOrganizationGroupMove');
  const confirm = extractFunction('confirmOrganizationGroupMove');
  const radioPaint = extractFunction('paintOrganizationMoveOptions');

  assert.doesNotMatch(source, /\bmoveGroupToCategory\b/, 'The direct debounced move path must stay removed');
  const groupActions = extractFunction('groupActionMenuItems');
  assert.match(extractFunction('buildGroupCol'), /groupActionMenuItems\(g,\s*opener,/, 'Board and focused Group must use the shared Group action model');
  const list = extractFunction('buildLvGroup');
  assert.match(list, /groupActionMenuItems\(g,\s*opener,/, 'List must use the shared Group action model');
  assert.match(list, /bindBoardItemContextMenu\(hd,\s*groupMenuItems,\s*\{ menuButton \}\)/, 'List More and keyboard context entry must anchor through the activating opener');
  assert.match(groupActions, /organizationGroupMoveMenuItems\(identity\.group\.id,\s*opener\)/, 'the shared Group action model must use the shared move menu');
  assert.match(menu, /openOrganizationGroupMove\(source\.group\.id,\s*opener\)/, 'Existing-Space move must retain only the stable Group ID and opener at entry');
  assert.match(menu, /openOrganizationCreate\('space',\s*\{\s*groupId:\s*source\.group\.id\s*\},\s*opener\)/, 'New-Space move must remain on the creation transaction');
  assert.doesNotMatch(menu + open + confirm, /\bprompt\s*\(|\bconfirm\s*\(/, 'Group move must not use native prompt or confirm dialogs');

  assert.match(open, /destinationSpaceId:\s*null/, 'Opening must never preselect a destination');
  assert.match(open, /State\.get\(\)\.activeWsId !== source\.workspace\.id/, 'Opening must fail closed outside the active workspace');
  assert.match(open, /source\.workspace\.activeCatId !== source\.space\.id/, 'Opening must fail closed outside the active source Space');
  assert.doesNotMatch(open, /(?:workspace|space|group):\s*source\.(?:workspace|space|group)/, 'Move context must not retain mutable entity references');
  assert.match(extractFunction('organizationGroupMoveFingerprint'), /groupCount:\s*option\.groupCount/, 'Review fingerprints must include visible destination group counts');
  assert.equal((confirm.match(/State\.snapshot\s*\(/g) || []).length, 1, 'Move confirmation must take exactly one snapshot');
  assert.equal((confirm.match(/State\.persistNow\s*\(/g) || []).length, 1, 'Move confirmation must request exactly one immediate receipt');
  assert.match(confirm, /await State\.persistNow\(\)/, 'Move confirmation must await the central writer');
  assert.doesNotMatch(confirm, /State\.persist\s*\(/, 'Move must not fall back to debounced persistence');
  assert.doesNotMatch(confirm, /activeWsId\s*=|activeCatId\s*=/, 'Moving a Group must leave the active source Space in place');
  assert.match(confirm, /State\.get\(\)\.activeWsId !== dialogCtx\.workspaceId/, 'Confirmation must fail closed if the active workspace changes');
  assert.match(confirm, /source && source\.workspace\.activeCatId !== dialogCtx\.sourceSpaceId/, 'Confirmation must fail closed if the active Space changes');
  assert.match(confirm, /for \(const collection of \[state\.archive, state\.trash\]\)/, 'Move must repair exact item restore references in Archive and Trash');

  const receipt = confirm.indexOf('await State.persistNow()');
  for (const marker of [
    'selectedItemIds.delete(itemId)',
    'syncItemSelMode()',
    'renderAll()',
    'renderItemSelToolbar()',
    'closeOrganizationNameDialog({ preferTarget: true })',
    "toast(tr('organization.group.moved'",
  ]) {
    assert.ok(confirm.indexOf(marker) > receipt, `${marker} must occur only after acknowledgement`);
  }
  assert.match(radioPaint, /' ', 'Enter'[\s\S]*selectOrganizationMoveDestination/, 'Space and Enter on a radio must select rather than confirm');
  assert.doesNotMatch(radioPaint, /confirmOrganizationGroupMove|confirmOrganizationName/, 'Radio keyboard handlers must not submit the move');
}

function testMarkupLocalizationAndResponsiveHooks() {
  for (const id of [
    'organization-name-overlay', 'organization-name-title', 'organization-name-description',
    'organization-move-field', 'organization-move-label', 'organization-move-options',
    'organization-name-error', 'organization-name-cancel', 'organization-name-confirm',
  ]) {
    assert.equal((html.match(new RegExp(`\\bid=["']${id}["']`, 'g')) || []).length, 1, `Move dialog ID must be unique: ${id}`);
  }
  assert.match(html, /id="organization-move-options"[^>]*role="radiogroup"[^>]*aria-labelledby="organization-move-label"[^>]*aria-required="true"/, 'Destination options must be one labelled required radio group');
  assert.match(html, /id="organization-name-overlay"[^>]*aria-describedby="organization-name-description organization-name-error"[^>]*aria-busy="false"/, 'Move must reuse the labelled, described, busy-aware organization dialog');

  const expectedEnglish = {
    'organization.space.moveMenuLabel': 'Move to another space…',
    'organization.space.newAndMoveMenu': 'Move to a new space…',
    'organization.group.moveTitle': 'Move group “{group}”',
    'organization.group.moveBody': 'Currently in “{source}”. Choose another space in “{workspace}”. The group and everything in it will move together.',
    'organization.group.moveListLabel': 'Move to',
    'organization.space.position': 'Space {position} of {count}',
    'organization.space.duplicateLabel': '{name}, {position}',
    'organization.group.moveOption': 'Move to “{space}”, {groups}',
    'organization.group.moveOptionDuplicate': 'Move to “{space}”, {groups}, {position}',
    'organization.group.moveOptionOne': '1 group',
    'organization.group.moveOptionMany': '{count} groups',
    'organization.group.move': 'Move group',
    'organization.group.moving': 'Moving…',
    'organization.group.moveRequired': 'Choose a space.',
    'organization.group.moveChanged': 'The group or space list changed. Review the latest choices, then move again.',
    'organization.group.moveRecoveryRequired': 'Locus couldn’t confirm this move. Reload the latest saved data before continuing.',
    'organization.group.moveContextChanged': 'The active workspace or space changed. Close this dialog and try again.',
    'organization.group.moved': 'Moved “{group}” to “{space}”',
  };
  const expectedZh = {
    'organization.space.moveMenuLabel': '移到其他空間…',
    'organization.space.newAndMoveMenu': '移到新空間…',
    'organization.group.moveTitle': '移動群組「{group}」',
    'organization.group.moveBody': '目前位於「{source}」。請在「{workspace}」中選擇其他空間。群組和其中所有內容會一起移動。',
    'organization.group.moveListLabel': '移到',
    'organization.space.position': '第 {position} 個空間，共 {count} 個',
    'organization.space.duplicateLabel': '{name}，{position}',
    'organization.group.moveOption': '移到「{space}」，{groups}',
    'organization.group.moveOptionDuplicate': '移到「{space}」，{groups}，{position}',
    'organization.group.moveOptionOne': '1 個群組',
    'organization.group.moveOptionMany': '{count} 個群組',
    'organization.group.move': '移動群組',
    'organization.group.moving': '移動中…',
    'organization.group.moveRequired': '請選擇空間。',
    'organization.group.moveChanged': '群組或空間清單已變更。請確認最新選項後再移動一次。',
    'organization.group.moveRecoveryRequired': 'Locus 無法確認這次移動是否已儲存。請重新載入最新資料後再繼續。',
    'organization.group.moveContextChanged': '目前的工作區或空間已變更。請關閉視窗後再試一次。',
    'organization.group.moved': '已將群組「{group}」移到空間「{space}」',
  };
  for (const [key, value] of Object.entries(expectedEnglish)) assert.equal(i18n.en[key], value, `English ${key} must keep approved move copy`);
  for (const [key, value] of Object.entries(expectedZh)) assert.equal(i18n['zh-TW'][key], value, `zh-TW ${key} must keep native Taiwan copy`);
  assert.doesNotMatch(Object.values(expectedEnglish).join(' '), /\bcategory\b/i, 'Public move copy must use Space vocabulary');

  assert.match(css, /\.organization-move-options\s*\{[^}]*max-height:\s*clamp\(120px, calc\(100dvh - 300px\), 320px\);[^}]*overflow-y:\s*auto;/s, 'Destination choices must remain height-safe at 720px');
  assert.match(css, /\.organization-move-option\s*\{[^}]*min-height:\s*44px;/s, 'Destination choices need a coherent control target');
  assert.match(css, /\.organization-move-option:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\);/s, 'Destination choices need visible keyboard focus');
  assert.match(css, /\.organization-name-panel\s*\{[^}]*width:\s*min\(420px, calc\(100vw - 32px\)\);[^}]*max-height:\s*calc\(100dvh - 32px\);/s, 'Move must retain shared 32px responsive gutters');
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.organization-name-panel \.modal-ft\s*\{\s*flex-wrap:\s*wrap;/, 'Narrow move actions must wrap');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\*, \*::before, \*::after/, 'Global reduced motion must cover move controls');
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?\.organization-move-option\[aria-checked="true"\][^}]*border:\s*2px solid Highlight;/, 'Forced colors must preserve selected destination state');
}

function testMenuOpeningNoPreselectionAndKeyboardSelection() {
  const harness = buildHarness();
  harness.api.bindOrganizationNameDialog();
  const before = plain(harness.state);
  const menuItems = harness.api.organizationGroupMoveMenuItems('group-a', harness.opener);
  assert.equal(menuItems.length, 2, 'A Group with alternatives needs existing- and new-Space move actions');
  assert.equal(menuItems[0].text, i18n.en['organization.space.moveMenuLabel']);
  assert.equal(menuItems[1].text, i18n.en['organization.space.newAndMoveMenu']);
  assert.equal(menuItems[0].action(), true, 'Existing-Space action must open the shared review dialog');
  assert.deepEqual(plain(harness.state), before, 'Opening move review must not mutate state');
  assert.equal(harness.calls.snapshots.length, 0);
  assert.equal(harness.calls.persists, 0);
  assert.equal(visible(harness.overlay), true);
  assert.equal(harness.label.hidden, true, 'Name input label must leave the move mode');
  assert.equal(harness.input.hidden, true, 'Name input must not become a duplicate move control');
  assert.equal(harness.moveField.hidden, false, 'Destination radio group must be visible');
  assert.equal(harness.app.inert, true, 'Move review must own the background interlock');

  let buttons = harness.moveButtons();
  assert.equal(buttons.length, 2);
  assert.deepEqual(buttons.map(button => button.getAttribute('aria-checked')), ['false', 'false'], 'No destination may be preselected');
  assert.deepEqual(buttons.map(button => button.tabIndex), [0, -1], 'Unselected radio group must expose only its first choice in roving order');
  assert.equal(harness.document.activeElement, buttons[0], 'Review must start on the first unchecked destination radio');
  assert.deepEqual(plain(buttons[0].scrollCalls), [{ block: 'nearest' }], 'Initial focus must reveal the first destination without jumping the dialog');
  assert.deepEqual(buttons.map(button => button.getAttribute('aria-label')), [
    'Move to “Projects”, 1 group, Space 2 of 3',
    'Move to “Projects”, 0 groups, Space 3 of 3',
  ], 'Duplicate destination names must announce localized workspace ordinals');
  assert.deepEqual(buttons.map(button => button.children[0].children[1].textContent), [
    '1 group · Space 2 of 3',
    '0 groups · Space 3 of 3',
  ], 'Duplicate destination metadata must expose the same ordinal visually');
  assert.equal(harness.confirm.disabled, true, 'Move must stay unavailable until an explicit choice');

  const originalButtons = [...buttons];
  let prevented = false;
  harness.dispatch(buttons[0], 'keydown', {
    key: 'Enter',
    preventDefault() { prevented = true; },
  });
  assert.equal(prevented, true, 'Enter on a destination radio must be handled locally');
  assert.equal(harness.calls.snapshots.length, 0, 'Radio Enter must select only');
  assert.equal(harness.calls.persists, 0, 'Radio Enter must not submit');
  assert.equal(visible(harness.overlay), true, 'Radio Enter must keep the review open');
  assert.equal(harness.api.getContext().destinationSpaceId, 'cat-b');
  buttons = harness.moveButtons();
  assert.equal(buttons[0], originalButtons[0], 'Radio selection must update in place without rebuilding the option list');
  assert.equal(buttons[1], originalButtons[1], 'Unselected radio identity must also remain stable');
  assert.deepEqual(buttons.map(button => button.getAttribute('aria-checked')), ['true', 'false']);
  assert.equal(harness.document.activeElement, buttons[0], 'Selected radio must retain focus');
  assert.deepEqual(plain(buttons[0].scrollCalls), [{ block: 'nearest' }, { block: 'nearest' }], 'Keyboard selection must keep the focused radio in the nearest scrollport');
  assert.equal(harness.confirm.disabled, false);
  assert.match(harness.confirm.getAttribute('aria-label'), /Projects/, 'Selected destination must enter the explicit confirmation name');

  assert.equal(harness.api.selectOrganizationMoveDestination('cat-a'), false, 'The source Space must never be selectable as its own destination');
  assert.equal(harness.calls.snapshots.length, 0, 'Same-Space selection must remain a no-op');

  harness.dispatch(harness.overlay, 'keydown', { key: 'Escape' });
  assert.equal(visible(harness.overlay), false, 'Escape must close only the idle move review');
  assert.equal(harness.document.activeElement, harness.opener, 'Escape must restore the visible Group menu opener');
  assert.deepEqual(plain(harness.state), before, 'Escape must leave the graph exact');
  assert.equal(harness.app.inert, false, 'Escape must release only the move interlock');

  const newSpace = buildHarness();
  const items = newSpace.api.organizationGroupMoveMenuItems('group-a', newSpace.opener);
  items[1].action();
  assert.equal(newSpace.calls.newSpace[0].kind, 'space');
  assert.deepEqual(newSpace.calls.newSpace[0].options, { groupId: 'group-a' });
  assert.equal(newSpace.calls.newSpace[0].opener, newSpace.opener, 'New-Space action must forward the stable Group ID and exact opener');
}

async function testDelayedReceiptExactGraphUndoSelectionAndFocus() {
  const receipt = deferred();
  const harness = buildHarness({ persistNow: () => receipt.promise });
  harness.api.bindOrganizationNameDialog();
  const state = harness.state;
  const workspace = state.workspaces[0];
  const sourceSpace = workspace.categories[0];
  const destinationSpace = workspace.categories[1];
  const group = sourceSpace.groups[0];
  const stack = group.items[0];
  const nestedNote = stack.items[1];
  const position = sourceSpace.canvasPositions[group.id];
  const before = plain(state);
  const widthsBefore = plain({ columnSizes: state.columnSizes, columnWidths: state.columnWidths });
  const unrelatedArchiveBefore = plain(state.archive.slice(1));
  const unrelatedTrashBefore = plain(state.trash.slice(1));

  harness.api.openOrganizationGroupMove('group-a', harness.opener);
  assert.equal(harness.api.selectOrganizationMoveDestination('cat-b', { focus: true }), true);
  const lateItem = { id: 'late-item', type: 'note', html: '<p>Captured while reviewing</p>' };
  group.items.push(lateItem);
  harness.selectedItemIds.add('late-item');
  const beforeConfirm = plain(state);

  const pending = harness.api.confirmOrganizationName();
  await settleUntil(() => harness.calls.persists === 1, 'Move must reach one persistence receipt');

  assert.equal(harness.calls.snapshots.length, 1);
  assert.deepEqual(harness.calls.snapshots[0].data, beforeConfirm, 'Snapshot must capture the complete graph before every move mutation');
  assert.equal(harness.calls.snapshots[0].label, 'Move group “Inbox” to space “Projects, Space 2 of 3”');
  assert.deepEqual(sourceSpace.groups.map(candidate => candidate.id), ['group-b'], 'Source must lose only the selected Group');
  assert.equal(destinationSpace.groups.at(-1), group, 'Destination must receive the exact Group object');
  assert.equal(destinationSpace.groups.at(-1).items[0], stack, 'Nested Stack reference must remain exact');
  assert.equal(destinationSpace.groups.at(-1).items[0].items[1], nestedNote, 'Nested item reference must remain exact');
  assert.equal(destinationSpace.groups.at(-1).items.at(-1), lateItem, 'The current live nested graph must move, including review-time additions');
  assert.equal(destinationSpace.canvasPositions['group-a'], position, 'Canvas position object must move without rebuilding');
  assert.equal('group-a' in sourceSpace.canvasPositions, false, 'Source Canvas reference must be removed');
  assert.deepEqual(plain(sourceSpace.canvasPositions['group-b']), { x: 4, y: 8 }, 'Unrelated source layout must remain exact');
  assert.deepEqual(plain(destinationSpace.canvasPositions['target-group']), { x: 90, y: 30 }, 'Unrelated destination layout must remain exact');
  assert.deepEqual(plain({ columnSizes: state.columnSizes, columnWidths: state.columnWidths }), widthsBefore, 'Stable-ID global layout records must not move or normalize');
  assert.equal(state.activeWsId, 'ws-a', 'Move must leave the active workspace at the source context');
  assert.equal(workspace.activeCatId, 'cat-a', 'Move must leave the active source Space visible');
  assert.deepEqual(plain(state.settings.captureLastTarget), {
    workspaceId: 'ws-a', categoryId: 'cat-b', groupId: 'group-a', mode: 'manual',
  }, 'Exact remembered capture destination must follow the moved Group and retain extra fields');
  assert.equal(state.settings.captureDefaultCategoryId, 'cat-a', 'Space-level capture default must remain unchanged');
  assert.deepEqual(plain(state.archive[0]), {
    ...before.archive[0], catId: 'cat-b', catName: 'Projects', groupName: 'Inbox',
  }, 'Exact archived-item restore reference must follow the Group');
  assert.deepEqual(plain(state.trash[0]), {
    ...before.trash[0], catId: 'cat-b', catName: 'Projects', groupName: 'Inbox',
  }, 'Exact trashed-item restore reference must follow the Group');
  assert.deepEqual(plain(state.archive.slice(1)), unrelatedArchiveBefore, 'Nonmatching Archive references must remain byte-equivalent');
  assert.deepEqual(plain(state.trash.slice(1)), unrelatedTrashBefore, 'Nonmatching Trash references must remain byte-equivalent');

  assert.deepEqual([...harness.selectedItemIds].sort(), ['late-item', 'note-a', 'outside-item', 'stack-a', 'top-a'].sort(), 'Selection must remain truthful until acknowledgement');
  assert.equal(harness.api.getLastSelected(), 'note-a', 'Selection anchor must remain until acknowledgement');
  assert.equal(harness.calls.selectionSyncs, 0);
  assert.equal(harness.calls.selectionToolbars, 0);
  assert.equal(harness.calls.renders, 0);
  assert.equal(harness.calls.toasts.length, 0);
  assert.equal(visible(harness.overlay), true);
  assert.equal(harness.overlay.getAttribute('aria-busy'), 'true');
  assert.equal(harness.confirm.disabled, false, 'Pending primary action must remain a focusable guarded anchor');
  assert.equal(harness.confirm.getAttribute('aria-disabled'), 'true');
  assert.equal(harness.confirm.textContent, 'Moving…');
  assert.equal(harness.confirm.getAttribute('aria-label'), 'Moving…', 'Pending primary action must announce its live busy state');
  assert.equal(harness.document.activeElement, harness.confirm);
  assert.equal(harness.close.disabled, true);
  assert.equal(harness.cancel.disabled, true);

  let escapePrevented = false;
  harness.dispatch(harness.overlay, 'keydown', {
    key: 'Escape', preventDefault() { escapePrevented = true; },
  });
  assert.equal(escapePrevented, true, 'Pending Escape must be consumed');
  assert.equal(visible(harness.overlay), true, 'Pending Escape must not abandon an unknown transaction');
  assert.equal(await harness.api.confirmOrganizationName(), false, 'Duplicate pending activation must be refused');
  assert.equal(harness.calls.persists, 1);
  assert.equal(harness.calls.snapshots.length, 1);

  receipt.resolve();
  assert.equal(await pending, true);
  assert.equal(harness.calls.renders, 1);
  assert.equal(harness.calls.selectionToolbars, 1);
  assert.equal(harness.calls.selectionSyncs, 1);
  assert.deepEqual([...harness.selectedItemIds], ['outside-item'], 'Only selections inside the moved Group may be pruned after acknowledgement');
  assert.equal(harness.api.getLastSelected(), null, 'An inside selection anchor must clear after acknowledgement');
  assert.equal(visible(harness.overlay), false);
  assert.equal(harness.document.activeElement, harness.destinationSpaceItem, 'Success must focus the destination Space while leaving it inactive');
  assert.deepEqual(plain(harness.calls.toasts[0]), {
    message: 'Moved “Inbox” to “Projects, Space 2 of 3”', options: { undo: 73 },
  }, 'Acknowledged success must name the duplicate Space unambiguously and expose only the exact snapshot action ID');
  assert.deepEqual(harness.calls.snapshots[0].data, beforeConfirm, 'The exact-action Undo payload must retain the entire pre-move graph');
}

async function testStableIdStaleAndNoDestinationFailures() {
  const missing = buildHarness();
  assert.equal(missing.api.openOrganizationGroupMove('missing', missing.opener), false);
  assert.equal(missing.calls.snapshots.length, 0);

  const inactive = buildHarness();
  inactive.state.activeWsId = 'ws-b';
  const inactiveBefore = plain(inactive.state);
  assert.equal(inactive.api.openOrganizationGroupMove('group-a', inactive.opener), false, 'Move review must not open for a Group outside the active workspace');
  assert.deepEqual(plain(inactive.state), inactiveBefore);
  assert.equal(visible(inactive.overlay), false);
  assert.equal(inactive.calls.snapshots.length, 0);
  assert.equal(inactive.calls.persists, 0);

  const inactiveSpace = buildHarness();
  inactiveSpace.state.workspaces[0].activeCatId = 'cat-b';
  const inactiveSpaceBefore = plain(inactiveSpace.state);
  assert.equal(inactiveSpace.api.openOrganizationGroupMove('group-a', inactiveSpace.opener), false, 'Move review must not open for a Group outside the active Space');
  assert.deepEqual(plain(inactiveSpace.state), inactiveSpaceBefore);
  assert.equal(visible(inactiveSpace.overlay), false);
  assert.equal(inactiveSpace.calls.snapshots.length, 0);
  assert.equal(inactiveSpace.calls.persists, 0);

  const duplicateGroup = buildHarness();
  duplicateGroup.state.workspaces[0].categories[1].groups.push({ id: 'group-a', name: 'Duplicate', items: [] });
  assert.equal(duplicateGroup.api.openOrganizationGroupMove('group-a', duplicateGroup.opener), false, 'Duplicate Group IDs must fail closed');

  const duplicateWorkspace = buildHarness();
  duplicateWorkspace.state.workspaces.push({ id: 'ws-a', name: 'Duplicate', activeCatId: null, categories: [] });
  assert.equal(duplicateWorkspace.api.openOrganizationGroupMove('group-a', duplicateWorkspace.opener), false, 'Duplicate workspace IDs must fail closed');

  const duplicateSpace = buildHarness();
  duplicateSpace.state.workspaces[1].categories.push({ id: 'cat-b', name: 'Duplicate ID', groups: [] });
  assert.equal(duplicateSpace.api.openOrganizationGroupMove('group-a', duplicateSpace.opener), false, 'Duplicate destination Space IDs must fail closed');

  const contextChanged = buildHarness();
  contextChanged.api.openOrganizationGroupMove('group-a', contextChanged.opener);
  contextChanged.api.selectOrganizationMoveDestination('cat-b');
  contextChanged.state.activeWsId = 'ws-b';
  const contextChangedBefore = plain(contextChanged.state);
  assert.equal(await contextChanged.api.confirmOrganizationName(), false, 'Confirmation must stop if the user changes active workspace during review');
  assert.deepEqual(plain(contextChanged.state), contextChangedBefore);
  assert.equal(contextChanged.error.textContent, i18n.en['organization.group.moveContextChanged']);
  assert.equal(contextChanged.error.hidden, false);
  assert.equal(contextChanged.confirm.disabled, true);
  assert.equal(contextChanged.api.getContext().unavailable, true);
  assert.equal(contextChanged.document.activeElement, contextChanged.cancel);
  assert.equal(contextChanged.calls.snapshots.length, 0);
  assert.equal(contextChanged.calls.persists, 0);

  const spaceContextChanged = buildHarness();
  spaceContextChanged.api.openOrganizationGroupMove('group-a', spaceContextChanged.opener);
  spaceContextChanged.api.selectOrganizationMoveDestination('cat-b');
  spaceContextChanged.state.workspaces[0].activeCatId = 'cat-b';
  const spaceContextChangedBefore = plain(spaceContextChanged.state);
  assert.equal(await spaceContextChanged.api.confirmOrganizationName(), false, 'Confirmation must stop if the user changes active Space during review');
  assert.deepEqual(plain(spaceContextChanged.state), spaceContextChangedBefore);
  assert.equal(spaceContextChanged.error.textContent, i18n.en['organization.group.moveContextChanged']);
  assert.equal(spaceContextChanged.error.hidden, false);
  assert.equal(spaceContextChanged.confirm.disabled, true);
  assert.equal(spaceContextChanged.api.getContext().unavailable, true);
  assert.equal(spaceContextChanged.document.activeElement, spaceContextChanged.cancel);
  assert.equal(spaceContextChanged.calls.snapshots.length, 0);
  assert.equal(spaceContextChanged.calls.persists, 0);

  const moved = buildHarness();
  moved.api.bindOrganizationNameDialog();
  moved.api.openOrganizationGroupMove('group-a', moved.opener);
  moved.api.selectOrganizationMoveDestination('cat-b');
  const source = moved.state.workspaces[0].categories[0];
  const third = moved.state.workspaces[0].categories[2];
  third.groups.push(source.groups.shift());
  const afterExternalMove = plain(moved.state);
  assert.equal(await moved.api.confirmOrganizationName(), false, 'A Group moved after review opens must require a fresh decision');
  assert.deepEqual(plain(moved.state), afterExternalMove);
  assert.equal(moved.error.textContent, i18n.en['organization.group.unavailable']);
  assert.equal(moved.error.hidden, false);
  assert.equal(moved.confirm.disabled, true);
  assert.equal(moved.document.activeElement, moved.cancel);
  assert.equal(moved.calls.snapshots.length, 0);
  assert.equal(moved.calls.persists, 0);

  const removedDestination = buildHarness();
  removedDestination.api.openOrganizationGroupMove('group-a', removedDestination.opener);
  removedDestination.api.selectOrganizationMoveDestination('cat-b');
  const ws = removedDestination.state.workspaces[0];
  ws.categories = ws.categories.filter(space => space.id !== 'cat-b');
  assert.equal(await removedDestination.api.confirmOrganizationName(), false);
  assert.equal(removedDestination.error.textContent, i18n.en['organization.group.moveDestinationUnavailable']);
  assert.equal(removedDestination.api.getContext().destinationSpaceId, null);
  assert.equal(removedDestination.calls.snapshots.length, 0);
  assert.equal(removedDestination.calls.persists, 0);

  const crossWorkspace = buildHarness();
  crossWorkspace.api.openOrganizationGroupMove('group-a', crossWorkspace.opener);
  crossWorkspace.api.selectOrganizationMoveDestination('cat-b');
  const crossSourceWorkspace = crossWorkspace.state.workspaces[0];
  const crossDestination = crossSourceWorkspace.categories.splice(1, 1)[0];
  crossWorkspace.state.workspaces[1].categories.push(crossDestination);
  assert.equal(await crossWorkspace.api.confirmOrganizationName(), false, 'A destination moved to another workspace must fail before history');
  assert.equal(crossWorkspace.error.textContent, i18n.en['organization.group.moveDestinationUnavailable']);
  assert.equal(crossWorkspace.calls.snapshots.length, 0);
  assert.equal(crossWorkspace.calls.persists, 0);

  const changed = buildHarness({ selectedIds: [], lastSelectedId: null });
  changed.api.openOrganizationGroupMove('group-a', changed.opener);
  changed.api.selectOrganizationMoveDestination('cat-b');
  const changedWs = changed.state.workspaces[0];
  changedWs.name = 'Updated workspace';
  changedWs.categories[0].name = 'Updated source';
  changedWs.categories[0].groups[0].name = 'Updated group';
  changedWs.categories[1].name = 'Updated destination';
  assert.equal(await changed.api.confirmOrganizationName(), false, 'Changed visible decision scope must require review');
  assert.equal(changed.calls.snapshots.length, 0);
  assert.equal(changed.calls.persists, 0);
  assert.equal(changed.error.textContent, i18n.en['organization.group.moveChanged']);
  assert.equal(changed.api.getContext().destinationSpaceId, 'cat-b', 'A still-valid stable destination may remain selected for explicit review');
  assert.match(changed.title.textContent, /Updated group/);
  assert.match(changed.description.textContent, /Updated source/);
  assert.match(changed.description.textContent, /Updated workspace/);
  assert.equal(await changed.api.confirmOrganizationName(), true, 'Second confirmation must use the reviewed live names');
  assert.equal(changed.calls.snapshots[0].label, 'Move group “Updated group” to space “Updated destination”');
  assert.deepEqual(plain(changed.calls.toasts[0]), {
    message: 'Moved “Updated group” to “Updated destination”', options: { undo: 73 },
  });

  const countChanged = buildHarness({ selectedIds: [], lastSelectedId: null });
  countChanged.api.openOrganizationGroupMove('group-a', countChanged.opener);
  countChanged.api.selectOrganizationMoveDestination('cat-b');
  const countDestination = countChanged.state.workspaces[0].categories[1];
  countDestination.groups.push({ id: 'late-destination-group', name: 'Added elsewhere', items: [] });
  const countChangedBefore = plain(countChanged.state);
  assert.equal(await countChanged.api.confirmOrganizationName(), false, 'A visible destination group-count change must require fresh review');
  assert.deepEqual(plain(countChanged.state), countChangedBefore);
  assert.equal(countChanged.calls.snapshots.length, 0);
  assert.equal(countChanged.calls.persists, 0);
  assert.equal(countChanged.error.textContent, i18n.en['organization.group.moveChanged']);
  assert.equal(countChanged.api.getContext().destinationSpaceId, 'cat-b');
  assert.equal(countChanged.moveButtons()[0].getAttribute('aria-label'), 'Move to “Projects”, 2 groups, Space 2 of 3');
  assert.equal(await countChanged.api.confirmOrganizationName(), true, 'Second confirmation may use the reviewed group count');
  assert.equal(countChanged.calls.snapshots.length, 1);
  assert.equal(countChanged.calls.persists, 1);

  const ordinalChanged = buildHarness({ selectedIds: [], lastSelectedId: null });
  ordinalChanged.api.openOrganizationGroupMove('group-a', ordinalChanged.opener);
  ordinalChanged.api.selectOrganizationMoveDestination('cat-b');
  assert.deepEqual(plain(ordinalChanged.api.getContext().moveOptions.map(option => option.id)), ['cat-b', 'cat-c']);
  const ordinalWorkspace = ordinalChanged.state.workspaces[0];
  const [sourceSpace, firstDestination, secondDestination] = ordinalWorkspace.categories;
  ordinalWorkspace.categories = [firstDestination, sourceSpace, secondDestination];
  ordinalChanged.cancel.focus();
  const ordinalChangedBefore = plain(ordinalChanged.state);
  assert.equal(await ordinalChanged.api.confirmOrganizationName(), false, 'A source-only reorder that changes visible destination ordinals must require fresh review');
  assert.deepEqual(plain(ordinalChanged.state), ordinalChangedBefore);
  assert.deepEqual(plain(ordinalChanged.api.getContext().moveOptions.map(option => option.id)), ['cat-b', 'cat-c'], 'Destination order may stay stable while its workspace ordinal changes');
  const reviewedOrdinal = ordinalChanged.moveButtons()[0];
  assert.equal(reviewedOrdinal.getAttribute('aria-label'), 'Move to “Projects”, 1 group, Space 1 of 3');
  assert.equal(ordinalChanged.document.activeElement, reviewedOrdinal, 'Concurrent review must refocus the still-valid destination');
  assert.deepEqual(plain(reviewedOrdinal.scrollCalls), [{ block: 'nearest' }], 'Concurrent review refocus must reveal the destination in the nearest scrollport');
  assert.equal(ordinalChanged.error.textContent, i18n.en['organization.group.moveChanged']);
  assert.equal(ordinalChanged.calls.snapshots.length, 0);
  assert.equal(ordinalChanged.calls.persists, 0);
  assert.equal(await ordinalChanged.api.confirmOrganizationName(), true, 'Second confirmation may use the reviewed destination ordinal');
  assert.equal(ordinalChanged.calls.snapshots[0].label, 'Move group “Inbox” to space “Projects, Space 1 of 3”');
  assert.equal(ordinalChanged.calls.snapshots.length, 1);
  assert.equal(ordinalChanged.calls.persists, 1);

  const staleCapture = buildHarness({ selectedIds: [], lastSelectedId: null });
  staleCapture.state.settings.captureLastTarget.categoryId = 'cat-c';
  staleCapture.api.openOrganizationGroupMove('group-a', staleCapture.opener);
  staleCapture.api.selectOrganizationMoveDestination('cat-b');
  assert.equal(await staleCapture.api.confirmOrganizationName(), true);
  assert.deepEqual(plain(staleCapture.state.settings.captureLastTarget), {
    workspaceId: 'ws-a', categoryId: 'cat-c', groupId: 'group-a', mode: 'manual',
  }, 'A nonmatching remembered capture triple must remain untouched');

  const noDestination = buildHarness();
  noDestination.state.workspaces[0].categories = [noDestination.state.workspaces[0].categories[0]];
  const menu = noDestination.api.organizationGroupMoveMenuItems('group-a', noDestination.opener);
  assert.equal(menu.length, 1, 'No-alternative state must expose only Move to a new space');
  assert.equal(menu[0].text, i18n.en['organization.space.newAndMoveMenu']);
  assert.equal(noDestination.api.openOrganizationGroupMove('group-a', noDestination.opener), true, 'Defensive direct opening must explain the no-destination state');
  assert.equal(noDestination.error.textContent, i18n.en['organization.group.moveNoDestination']);
  assert.equal(noDestination.confirm.disabled, true);
  assert.equal(noDestination.calls.snapshots.length, 0);
  assert.equal(noDestination.calls.persists, 0);
}

async function testRejectedReceiptRecoveryAndLocaleRepaint() {
  const failure = Object.assign(new Error('unknown write outcome'), { code: 'LOCUS_STATE_WRITE_FAILED' });
  const harness = buildHarness({
    locale: 'en',
    persistNow: async () => { throw failure; },
    simulateRecoveryOnFailure: true,
  });
  harness.api.bindOrganizationNameDialog();
  harness.api.openOrganizationGroupMove('group-a', harness.opener);
  harness.api.selectOrganizationMoveDestination('cat-b');
  harness.setLocale('zh-TW');
  harness.api.paintOrganizationNameDialog();
  assert.equal(harness.title.textContent, '移動群組「Inbox」');
  assert.equal(harness.description.textContent, '目前位於「Reading」。請在「Research」中選擇其他空間。群組和其中所有內容會一起移動。');
  assert.equal(harness.moveLabel.textContent, '移到');
  assert.equal(harness.confirm.textContent, '移動群組');
  assert.equal(harness.api.getContext().destinationSpaceId, 'cat-b', 'Locale repaint must retain the exact selected stable ID');
  const zhButtons = harness.moveButtons();
  assert.deepEqual(zhButtons.map(button => button.getAttribute('aria-label')), [
    '移到「Projects」，1 個群組，第 2 個空間，共 3 個',
    '移到「Projects」，0 個群組，第 3 個空間，共 3 個',
  ], 'zh-TW duplicate destinations must announce native ordinal copy');
  assert.deepEqual(zhButtons.map(button => button.children[0].children[1].textContent), [
    '1 個群組 · 第 2 個空間，共 3 個',
    '0 個群組 · 第 3 個空間，共 3 個',
  ]);

  const beforeSelection = [...harness.selectedItemIds];
  assert.equal(await harness.api.confirmOrganizationName(), false);
  assert.equal(harness.calls.snapshots.length, 1);
  assert.equal(harness.calls.snapshots[0].label, '將群組「Inbox」移到空間「Projects，第 2 個空間，共 3 個」');
  assert.equal(harness.calls.persists, 1);
  assert.equal(harness.calls.renders, 0);
  assert.equal(harness.calls.selectionToolbars, 0);
  assert.equal(harness.calls.selectionSyncs, 0);
  assert.deepEqual([...harness.selectedItemIds], beforeSelection, 'Rejected receipt must not prune selection');
  assert.equal(harness.calls.toasts.length, 0);
  assert.equal(visible(harness.overlay), true, 'Move record must remain behind recovery');
  assert.equal(visible(harness.recoveryOverlay), true, 'Rejected persistence must reveal recovery');
  assert.equal(harness.api.getBusy(), false);
  assert.equal(harness.overlay.getAttribute('aria-busy'), 'false');
  assert.equal(harness.error.textContent, i18n['zh-TW']['organization.group.moveRecoveryRequired']);
  assert.equal(harness.confirm.disabled, true, 'Rejected transaction must be unavailable for duplicate mutation');
  assert.equal(ownerSet(harness.recoveryOverlay).size, 0, 'Recovery must remain operable');
  assert.equal(harness.overlay.inert, true, 'Recovery must own the lower move dialog');
  assert.equal(ownerSet(harness.overlay).has('recovery'), true);
  assert.equal(harness.app.inert, true);
  assert.equal(await harness.api.confirmOrganizationName(), false, 'Unavailable rejected move must never retry');
  assert.equal(harness.calls.persists, 1);

  let prevented = false;
  let stopped = false;
  const consumed = harness.api.handleOrganizationNameGlobalKey({
    key: 'Enter',
    target: harness.recoveryReload,
    preventDefault() { prevented = true; },
    stopImmediatePropagation() { stopped = true; },
  });
  assert.equal(consumed, false, 'Recovery Reload must outrank the lower move layer');
  assert.equal(prevented, false);
  assert.equal(stopped, false);
  assert.equal(harness.state.workspaces[0].activeCatId, 'cat-a', 'Rejected move must retain active source Space');
  assert.equal(harness.state.archive[0].catId, 'cat-b', 'Dirty exact Archive reference must remain in the one failed transaction');
  assert.equal(harness.state.trash[0].catId, 'cat-b', 'Dirty exact Trash reference must remain in the one failed transaction');
}

(async () => {
  testStaticBoundaryAndWiring();
  testMarkupLocalizationAndResponsiveHooks();
  testMenuOpeningNoPreselectionAndKeyboardSelection();
  await testDelayedReceiptExactGraphUndoSelectionAndFocus();
  await testStableIdStaleAndNoDestinationFailures();
  await testRejectedReceiptRecoveryAndLocaleRepaint();
  console.log('Organization move contracts passed: stable IDs, exact graph references, receipts, selection timing, localization, focus, and recovery.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
