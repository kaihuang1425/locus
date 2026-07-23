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
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `${name} must exist in production`);
  const parametersStart = source.indexOf('(', start);
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
  const bodyStart = source.indexOf('{', parametersEnd);
  assert.ok(bodyStart > start, `${name} must have a body`);
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
    { filename: 'organization-creation-i18n-extract.js' },
  );
}

function extractController() {
  const declaration = /\blet\s+organizationNameCtx\s*=/.exec(source);
  assert.ok(declaration, 'organizationNameCtx must remain an extractable production boundary');
  const start = source.lastIndexOf('\n', declaration.index) + 1;
  const names = [
    'organizationNameTarget',
    'organizationWorkspaceTarget',
    'organizationGroupTarget',
    'createOrganizationIdAllocator',
    'paintOrganizationMoveOptions',
    'paintOrganizationNameDialog',
    'setOrganizationNameBusy',
    'setOrganizationNameError',
    'setOrganizationNameInterlock',
    'focusOrganizationNameFallback',
    'closeOrganizationNameDialog',
    'openOrganizationName',
    'openOrganizationCreate',
    'confirmOrganizationCreate',
    'confirmOrganizationName',
    'bindOrganizationNameDialog',
    'handleOrganizationNameGlobalKey',
  ];
  const records = names.map(extractFunctionRecord);
  const end = Math.max(...records.map(record => record.end));
  return source.slice(start, end);
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

const i18n = readI18n();
const controllerSource = extractController();
const setElementInertOwnerSource = extractFunction('setElementInertOwner');
const focusDialogOpenerSource = extractFunction('focusDialogOpener');
const applyLocaleSource = extractFunction('applyLocale');
const bindStaticSource = extractFunction('bindStatic');
const renderHomeSource = extractFunction('renderHome');
const buildPaletteCommandsSource = extractFunction('buildPaletteCommands');
const buildGroupColSource = extractFunction('buildGroupCol');
const buildLvGroupSource = extractFunction('buildLvGroup');
const groupMoveMenuSource = extractFunction('organizationGroupMoveMenuItems');
const openWsGridSource = extractFunction('openWsGrid');
const showContextMenuSource = extractFunction('showContextMenu');

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
      captureLastTarget: { workspaceId: 'ws-a', categoryId: 'cat-a', groupId: 'group-a' },
      retainedSetting: { exact: true },
    },
    archive: [{ id: 'archive-entry', kind: 'item', data: { id: 'archived-item', type: 'note' } }],
    trash: [{ id: 'trash-entry', kind: 'item', data: { id: 'trashed-item', type: 'todo' } }],
    workspaces: [
      {
        id: 'ws-a',
        name: 'Research',
        symbol: '🔬',
        activeCatId: 'cat-a',
        categories: [
          {
            id: 'cat-a',
            name: 'Reading',
            canvasPositions: { 'group-a': { x: 17, y: 29 }, 'group-b': { x: 4, y: 8 } },
            groups: [
              {
                id: 'group-a',
                name: 'Inbox',
                symbol: '📥',
                color: '#6366f1',
                collapsed: false,
                reminders: [{ id: 'reminder-a', at: 42 }],
                items: [{
                  id: 'stack-a',
                  type: 'stack',
                  name: 'Nested',
                  items: [{ id: 'tab-a', type: 'tab', title: 'Source', url: 'https://example.test' }],
                }],
              },
              { id: 'group-b', name: 'Notes', symbol: '📁', color: '#0ea5e9', collapsed: false, items: [] },
            ],
          },
          { id: 'cat-b', name: 'Reading', groups: [] },
        ],
      },
      {
        id: 'ws-b',
        name: 'Research',
        symbol: '🏠',
        activeCatId: 'cat-c',
        categories: [{ id: 'cat-c', name: 'Home', groups: [] }],
      },
    ],
  };
}

function collectEntityIds(value) {
  const ids = new Set();
  const seen = new Set();
  const visit = candidate => {
    if (!candidate || typeof candidate !== 'object' || seen.has(candidate)) return;
    seen.add(candidate);
    if (typeof candidate.id === 'string' && candidate.id) ids.add(candidate.id);
    if (Array.isArray(candidate)) candidate.forEach(visit);
    else Object.values(candidate).forEach(visit);
  };
  visit(value);
  return ids;
}

function buildHarness({
  locale = 'en',
  persistNow = async () => undefined,
  renderAllReady = Promise.resolve(),
  uidValues = [],
  workspaceGridOpen = false,
  disconnectOpenerOnRender = false,
  simulateRecoveryOnFailure = false,
} = {}) {
  const calls = {
    locks: 0,
    unlocks: 0,
    persists: 0,
    renders: 0,
    grids: 0,
    traps: 0,
    uid: 0,
    snapshots: [],
    toasts: [],
  };
  const listeners = new Map();
  const elements = new Map();
  const bodyChildren = [];
  const overlayChildren = new Set();

  const document = {
    activeElement: null,
    body: { children: bodyChildren },
    getElementById(id) { return elements.get(id) || null; },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === '.space-item' || selector.includes('.space-item')) {
        return [elements.get('visible-space-item')].filter(Boolean);
      }
      if (selector === '.home-card-more' || selector.includes('.home-card-more')) {
        return [elements.get('home-space-opener')].filter(Boolean);
      }
      if (selector === '.wsg-card' || selector.includes('.wsg-card')) {
        return [elements.get('workspace-card')].filter(Boolean);
      }
      if (selector === '.ws-chip' || selector.includes('.ws-chip')) {
        return [elements.get('workspace-chip')].filter(Boolean);
      }
      return [];
    },
  };

  function makeElement(id, classes = [], { bodyChild = false, overlayChild = false } = {}) {
    const element = {
      id,
      classList: new ClassList(...classes),
      attributes: new Map(),
      dataset: {},
      value: '',
      textContent: '',
      disabled: false,
      hidden: false,
      inert: false,
      isConnected: true,
      onclick: null,
      setAttribute(name, value) { this.attributes.set(name, String(value)); },
      getAttribute(name) { return this.attributes.get(name); },
      removeAttribute(name) { this.attributes.delete(name); },
      contains(target) {
        return target === this
          || (id === 'organization-name-overlay' && overlayChildren.has(target))
          || (id === 'state-recovery-overlay' && target?.id === 'state-recovery-reload');
      },
      focus() {
        if (this.isConnected !== false && !this.inert) document.activeElement = this;
      },
      select() { this.focus(); },
      setSelectionRange() { this.focus(); },
      addEventListener(type, listener) { listeners.set(`${id}:${type}`, listener); },
    };
    elements.set(id, element);
    if (bodyChild) bodyChildren.push(element);
    if (overlayChild) overlayChildren.add(element);
    return element;
  }

  const app = makeElement('app', [], { bodyChild: true });
  const landing = makeElement('landing-layer', ['hidden'], { bodyChild: true });
  const workspaceGrid = makeElement('ws-grid-overlay', workspaceGridOpen ? [] : ['hidden'], { bodyChild: true });
  const workspaceList = makeElement('ws-list', ['hidden'], { bodyChild: true });
  const recoveryOverlay = makeElement('state-recovery-overlay', ['hidden'], { bodyChild: true });
  const recoveryReload = makeElement('state-recovery-reload');
  const deleteOverlay = makeElement('organization-delete-overlay', ['hidden'], { bodyChild: true });
  const trashOverlay = makeElement('trash-delete-overlay', ['hidden'], { bodyChild: true });
  const legacyModal = makeElement('modal-overlay', ['hidden'], { bodyChild: true });
  const overlay = makeElement('organization-name-overlay', ['hidden'], { bodyChild: true });
  const title = makeElement('organization-name-title', [], { overlayChild: true });
  const label = makeElement('organization-name-label', [], { overlayChild: true });
  const input = makeElement('organization-name-input', [], { overlayChild: true });
  const description = makeElement('organization-name-description', ['organization-name-description'], { overlayChild: true });
  description.hidden = true;
  const error = makeElement('organization-name-error', ['organization-name-error'], { overlayChild: true });
  error.hidden = true;
  const close = makeElement('organization-name-close', [], { overlayChild: true });
  const cancel = makeElement('organization-name-cancel', [], { overlayChild: true });
  const confirm = makeElement('organization-name-confirm', [], { overlayChild: true });
  const workspaceChip = makeElement('workspace-chip');
  workspaceChip.dataset.wsid = 'ws-a';
  const workspaceCard = makeElement('workspace-card');
  workspaceCard.dataset.wsId = 'ws-a';
  const visibleSpaceItem = makeElement('visible-space-item');
  visibleSpaceItem.dataset.catId = 'cat-a';
  const homeSpaceOpener = makeElement('home-space-opener');
  homeSpaceOpener.dataset.catId = 'cat-a';
  const workspaceGridClose = makeElement('wsg-close');
  makeElement('ws-menu-btn');
  const addWorkspace = makeElement('add-ws-btn');
  const addSpace = makeElement('add-cat-btn');
  const opener = makeElement('creation-opener');
  document.activeElement = opener;

  const state = makeState();
  const openers = new WeakMap();
  let currentLocale = locale;
  let uidCounter = 0;
  const queuedIds = [...uidValues];
  let context;

  function syncRenderedTargets() {
    const activeWorkspace = state.workspaces.find(workspace => workspace.id === state.activeWsId);
    if (!activeWorkspace) return;
    workspaceChip.dataset.wsid = activeWorkspace.id;
    workspaceCard.dataset.wsId = activeWorkspace.id;
    const activeSpaceId = activeWorkspace.activeCatId;
    if (activeSpaceId) {
      visibleSpaceItem.dataset.catId = activeSpaceId;
      homeSpaceOpener.dataset.catId = activeSpaceId;
    }
  }

  const State = {
    get() { return state; },
    snapshot(historyLabel) {
      calls.snapshots.push({ label: historyLabel, data: plain(state) });
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
            context.__creation.setElementInertOwner(child, 'recovery', true);
          }
        }
        throw failure;
      }
    },
  };

  context = vm.createContext({
    document,
    State,
    LocusImportUtils: { collectEntityIds },
    uid() {
      calls.uid += 1;
      if (queuedIds.length) return queuedIds.shift();
      uidCounter += 1;
      return `generated-${uidCounter}`;
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
    renderAll() {
      calls.renders += 1;
      if (disconnectOpenerOnRender) opener.isConnected = false;
      syncRenderedTargets();
      return renderAllReady;
    },
    async openWsGrid() {
      calls.grids += 1;
      workspaceGrid.classList.remove('hidden');
      syncRenderedTargets();
    },
    toast(message, options) { calls.toasts.push({ message, options }); },
    setTimeout(callback) { callback(); return 1; },
    requestAnimationFrame(callback) { callback(); return 1; },
    JSON,
    Object,
    String,
    Set,
    Error,
  });

  vm.runInContext(
    `${setElementInertOwnerSource}\n${focusDialogOpenerSource}\n${controllerSource}\n` +
      'globalThis.__creation = {\n' +
      '  setElementInertOwner, organizationNameTarget, organizationWorkspaceTarget,\n' +
      '  organizationGroupTarget, createOrganizationIdAllocator, paintOrganizationNameDialog,\n' +
      '  setOrganizationNameBusy, setOrganizationNameError, openOrganizationCreate,\n' +
      '  confirmOrganizationCreate, confirmOrganizationName, closeOrganizationNameDialog,\n' +
      '  bindOrganizationNameDialog, handleOrganizationNameGlobalKey, focusOrganizationNameFallback,\n' +
      '};',
    context,
    { filename: 'organization-creation-production-contract.js' },
  );

  function dispatch(id, type, event = {}) {
    const element = elements.get(id);
    const enriched = {
      target: element,
      currentTarget: element,
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
      ...event,
    };
    if (type === 'click' && typeof element.onclick === 'function') return element.onclick(enriched);
    const listener = listeners.get(`${id}:${type}`);
    if (listener) return listener(enriched);
    return undefined;
  }

  function setInput(value) {
    input.value = value;
    dispatch('organization-name-input', 'input');
  }

  return {
    api: context.__creation,
    calls,
    dispatch,
    setInput,
    setLocale(value) { currentLocale = value; },
    document,
    elements,
    state,
    app,
    landing,
    workspaceGrid,
    workspaceList,
    recoveryOverlay,
    recoveryReload,
    deleteOverlay,
    trashOverlay,
    legacyModal,
    overlay,
    title,
    label,
    input,
    description,
    error,
    close,
    cancel,
    confirm,
    workspaceChip,
    workspaceCard,
    visibleSpaceItem,
    homeSpaceOpener,
    workspaceGridClose,
    addWorkspace,
    addSpace,
    opener,
  };
}

function testStaticEntryPointsAndResidueRemoval() {
  assert.match(bindStaticSource, /wsg-add[^\n]+openOrganizationCreate\('workspace',\s*\{\},\s*event\.currentTarget\)/, 'Workspace manager Add must use the shared creation controller with its real opener');
  assert.match(bindStaticSource, /add-ws-btn[^\n]+openOrganizationCreate\('workspace',\s*\{\},\s*event\.currentTarget\)/, 'Header Add workspace must use the shared creation controller');
  assert.match(bindStaticSource, /add-cat-btn[^\n]+openOrganizationCreate\('space',\s*\{\},\s*event\.currentTarget\)/, 'Sidebar Add Space must use the shared creation controller');
  assert.match(renderHomeSource, /palette\.newSpace[\s\S]*openOrganizationCreate\('space'\)/, 'Home zero-Space recovery must use the shared creation controller');
  assert.match(buildPaletteCommandsSource, /id:\s*'new-space'[\s\S]*openOrganizationCreate\('space'\)/, 'Command-palette New space must use the shared creation controller');
  assert.match(buildGroupColSource, /organizationGroupMoveMenuItems\(g\.id,\s*opener\)/, 'Board and focused-Group menus must use the shared move section');
  assert.match(buildLvGroupSource, /organizationGroupMoveMenuItems\(g\.id,\s*(?:btn|toggleButton)\)/, 'List Group menus must use the shared move section');
  assert.match(groupMoveMenuSource, /organization\.space\.moveMenuLabel/, 'The shared Group move action must use public localized Space vocabulary');
  assert.match(groupMoveMenuSource, /organization\.space\.newAndMoveMenu[\s\S]*openOrganizationCreate\('space',\s*\{\s*groupId:\s*source\.group\.id\s*\},\s*opener\)/, 'New-Space-and-move must pass a stable Group ID and connected opener');
  assert.equal((source.match(/openOrganizationCreate\(/g) || []).length, 7, 'Six reachable entry points plus one controller must share the creation path');

  assert.doesNotMatch(source, /function\s+(?:openModal|confirmModal)\b/, 'The dead generic-modal compatibility controller must stay removed');
  assert.doesNotMatch(source, /\baction\.newCategory\b|New category name:|MOVE TO CATEGORY|\+ New category|\bNew Category\b/, 'Reachable creation copy must not leak the internal category model');
  assert.doesNotMatch(source, /function\s+moveGroupToNewCategory\b/, 'The native-prompt create-and-move path must be removed');

  assert.doesNotMatch(source, /function\s+saveWindowAsWorkspace\b|Save as workspace|workspaceManager\.browserWindows|workspaceManager\.saveAsWorkspace/, 'Workspace-manager window capture must not remain as a second creation mutation');
  assert.doesNotMatch(openWsGridSource, /chrome\.windows|wsg-windows|wsg-win-|saveWindow/, 'The workspace manager must render real workspaces without the removed browser-window capture prototype');
  assert.doesNotMatch(html, /id="wsg-windows"|Browser windows|Save as workspace/, 'Removed window capture must leave no reachable manager markup');

  assert.match(showContextMenuSource, /\['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Tab', 'Escape'\]\.includes\(e\.key\)[\s\S]*?e\.stopPropagation\(\);/, 'Context-menu navigation and Escape must not leak to lower keyboard layers');
  assert.match(showContextMenuSource, /else if \(e\.key === 'Tab'\) \{\s*e\.preventDefault\(\);[\s\S]*?entries\[next\]\.focus\(\);\s*\}/, 'Context-menu Tab and Shift+Tab must remain contained within the menu');
  assert.match(showContextMenuSource, /else if \(e\.key === 'Escape'\) \{\s*e\.preventDefault\(\);\s*hideContextMenu\(\);\s*if \(menuOpener && menuOpener\.focus\) menuOpener\.focus\(\);\s*\}/, 'Context-menu Escape must close only the menu and return focus to its opener');

  assert.match(openWsGridSource, /<button class="del"[^>]*aria-label="\$\{esc\(tr\('organization\.workspace\.delete'\)\)\}"/, 'Workspace-card delete must remain a real button with an explicit localized accessible name');
  assert.match(openWsGridSource, /enableKeyboardClick\(card\);/, 'Workspace cards must remain keyboard reachable beside their delete controls');
  assert.match(css, /\.wsg-card:hover \.del,\s*\.wsg-card:focus-within \.del,\s*\.wsg-card \.del:focus-visible\s*\{\s*opacity:\s*1;\s*\}/, 'Workspace-card delete must become visible for keyboard focus as well as pointer hover');

  assert.match(html, /id="ws-grid-overlay"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="wsg-title"/, 'The focused manager underneath creation must itself be a labelled modal');
  assert.match(html, /id="wsg-title"[^>]*data-i18n="workspaceManager\.title"/, 'Workspace manager title must localize');
  assert.match(html, /id="wsg-close"[^>]*data-i18n-aria-label="organization\.close"/, 'Workspace manager Close must have a localized screen-reader name');
  assert.match(html, /id="wsg-add"[\s\S]*data-i18n="action\.newWorkspace"/, 'Workspace manager Add must expose localized visible text');
  for (const [id, key] of [['add-ws-btn', 'action.newWorkspace'], ['add-cat-btn', 'action.newSpace']]) {
    const tag = html.match(new RegExp(`<button[^>]*id=["']${id}["'][^>]*>`))?.[0] || '';
    assert.match(tag, new RegExp(`data-i18n-title=["']${key.replace('.', '\\.')}["']`), `${id} needs a localized tooltip`);
    assert.match(tag, new RegExp(`data-i18n-aria-label=["']${key.replace('.', '\\.')}["']`), `${id} needs an explicit localized accessible name`);
  }
}

function testLocalizationContract() {
  const expectedEnglish = {
    'action.newWorkspace': 'New workspace',
    'action.newSpace': 'New space',
    'organization.create': 'Create',
    'organization.creating': 'Creating…',
    'organization.idUnavailable': 'Locus couldn’t prepare this change. Try again.',
    'organization.workspace.createTitle': 'Create workspace',
    'organization.workspace.nameLabel': 'Workspace name',
    'organization.workspace.nameRequired': 'Enter a workspace name.',
    'organization.workspace.unavailable': 'This workspace no longer exists.',
    'organization.workspace.createHistory': 'Create workspace “{name}”',
    'organization.workspace.created': 'Workspace “{name}” created',
    'organization.space.defaultName': 'Pinned',
    'organization.space.createTitle': 'Create space',
    'organization.space.createForGroupTitle': 'Create a space for “{group}”',
    'organization.space.createForGroupBody': 'The group will move into the new space.',
    'organization.space.nameLabel': 'Space name',
    'organization.space.nameRequired': 'Enter a space name.',
    'organization.space.parentUnavailable': 'This workspace no longer exists. Close this dialog and try again.',
    'organization.space.moveMenuLabel': 'Move to another space…',
    'organization.space.newAndMoveMenu': 'Move to a new space…',
    'organization.group.unavailable': 'This group moved or no longer exists. Close this dialog and try again.',
    'organization.group.nameChanged': 'The group name changed. Review the updated group, then try again.',
    'organization.space.createHistory': 'Create space “{name}”',
    'organization.space.created': 'Space “{name}” created',
    'organization.space.createAndMoveHistory': 'Create space “{space}” and move group “{group}”',
    'organization.space.createdAndMoved': 'Created space “{space}” and moved group “{group}”',
  };
  const expectedZh = {
    'action.newWorkspace': '新增工作區',
    'action.newSpace': '新增空間',
    'organization.create': '新增',
    'organization.creating': '新增中…',
    'organization.idUnavailable': 'Locus 無法準備這項變更，請再試一次。',
    'organization.workspace.createTitle': '新增工作區',
    'organization.workspace.nameLabel': '工作區名稱',
    'organization.workspace.nameRequired': '請輸入工作區名稱。',
    'organization.workspace.unavailable': '這個工作區已不存在。',
    'organization.workspace.createHistory': '新增工作區「{name}」',
    'organization.workspace.created': '已新增工作區「{name}」',
    'organization.space.defaultName': '釘選',
    'organization.space.createTitle': '新增空間',
    'organization.space.createForGroupTitle': '為「{group}」新增空間',
    'organization.space.createForGroupBody': '這個群組會移到新空間。',
    'organization.space.nameLabel': '空間名稱',
    'organization.space.nameRequired': '請輸入空間名稱。',
    'organization.space.parentUnavailable': '這個工作區已不存在。請關閉視窗後再試一次。',
    'organization.space.moveMenuLabel': '移到其他空間…',
    'organization.space.newAndMoveMenu': '移到新空間…',
    'organization.group.unavailable': '這個群組已移動或不存在。請關閉視窗後再試一次。',
    'organization.group.nameChanged': '群組名稱已變更。請確認更新後的群組，再試一次。',
    'organization.space.createHistory': '新增空間「{name}」',
    'organization.space.created': '已新增空間「{name}」',
    'organization.space.createAndMoveHistory': '新增空間「{space}」並移動群組「{group}」',
    'organization.space.createdAndMoved': '已新增空間「{space}」並移動群組「{group}」',
  };
  assert.deepEqual(Object.keys(expectedEnglish).sort(), Object.keys(expectedZh).sort(), 'Creation locale contracts must stay structurally parallel');
  for (const [key, value] of Object.entries(expectedEnglish)) assert.equal(i18n.en[key], value, `English ${key} must keep approved creation copy`);
  for (const [key, value] of Object.entries(expectedZh)) assert.equal(i18n['zh-TW'][key], value, `zh-TW ${key} must keep native Taiwan copy`);
  assert.doesNotMatch(Object.values(expectedEnglish).join(' '), /\bcategory\b/i, 'English creation copy must use Space rather than category');
  assert.doesNotMatch(Object.values(expectedZh).join(' '), /分類/, 'zh-TW creation copy must use 空間 rather than 分類');
  assert.match(applyLocaleSource, /paintOrganizationNameDialog\(\);/, 'Live locale changes must repaint the shared creation form');
}

function testMarkupAndResponsiveCss() {
  for (const id of [
    'organization-name-overlay',
    'organization-name-title',
    'organization-name-label',
    'organization-name-input',
    'organization-name-description',
    'organization-name-error',
    'organization-name-close',
    'organization-name-cancel',
    'organization-name-confirm',
  ]) {
    assert.equal((html.match(new RegExp(`\\bid=["']${id}["']`, 'g')) || []).length, 1, `Creation dialog id must be unique: ${id}`);
  }
  assert.match(html, /id="organization-name-overlay"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="organization-name-title"[^>]*aria-describedby="organization-name-description organization-name-error"[^>]*aria-busy="false"/, 'Creation must reuse one labelled, described, busy-aware modal dialog');
  assert.match(html, /id="organization-name-label"[^>]*for="organization-name-input"/, 'The visible object-specific label must own the name field');
  assert.match(html, /<input(?=[^>]*id="organization-name-input")(?=[^>]*aria-describedby="organization-name-error")(?=[^>]*autocomplete="off")[^>]*>/, 'The field must expose validation and avoid unrelated autocomplete');
  assert.match(html, /id="organization-name-description"[^>]*hidden/, 'The move consequence must be contextual rather than shown for every operation');
  assert.match(html, /id="organization-name-error"[^>]*(?:role="alert"|aria-live="polite")/, 'Creation validation must be announced');
  assert.match(html, /id="organization-name-close"[^>]*data-i18n-aria-label="organization\.close"/, 'Icon Close needs a localized screen-reader name');
  assert.match(html, /id="organization-name-cancel"[^>]*type="button"[^>]*data-i18n="organization\.cancel"/, 'Cancel must remain a safe non-submit action');
  assert.match(html, /id="organization-name-confirm"[^>]*type="button"/, 'The dynamic Create action must not invoke native form submission');

  assert.match(css, /#modal-overlay,[^\n]*#organization-name-overlay/, 'Creation must reuse the shared modal scrim language');
  assert.match(css, /\[data-theme-mode="light"\] #organization-name-overlay[\s\S]*background:\s*rgba\(20,20,30,0\.3\)/, 'Light themes need the calm shared creation scrim');
  assert.match(css, /#organization-name-overlay\.hidden[\s\S]*pointer-events:\s*none/, 'Hidden creation must be noninteractive');
  assert.match(css, /\.organization-name-panel\s*\{[^}]*width:\s*min\(420px, calc\(100vw - 32px\)\);[^}]*max-height:\s*calc\(100dvh - 32px\);[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/s, 'Creation must retain 32px gutters and a 720px-safe three-row layout');
  assert.match(css, /\.organization-name-panel \.modal-bd\s*\{[^}]*overflow-y:\s*auto;/, 'Creation body must scroll inside short viewports');
  assert.match(css, /#organization-name-input[^}]*\{[^}]*width:\s*100%/s, 'Creation name field must fill the responsive panel');
  assert.match(css, /#organization-name-input\[aria-invalid="true"\][^}]*\{[^}]*border-color:/s, 'Invalid creation input needs a non-text state');
  assert.match(css, /\.organization-name-description\s*\{[^}]*color:\s*var\(--text2\)/s, 'Move consequence needs coherent secondary typography');
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*\.organization-name-panel \.modal-ft\s*\{\s*flex-wrap:\s*wrap;/, 'Narrow creation actions must wrap');
  assert.match(css, /\.organization-name-panel \.modal-ft > button\s*\{\s*flex:\s*1 1 140px;/, 'Narrow actions must remain balanced touch targets');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\*, \*::before, \*::after/, 'Global reduced motion must cover creation');
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*input:focus-visible[\s\S]*outline:\s*2px solid CanvasText;/, 'Forced colors must preserve visible input focus');
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*\.rm-panel[^}]*border:\s*1px solid CanvasText;/, 'Forced colors must preserve the creation panel boundary');
}

async function testWorkspaceCreationReceiptUndoAndFocus() {
  const receipt = deferred();
  const harness = buildHarness({
    persistNow: () => receipt.promise,
    uidValues: ['ws-a', 'created-space', 'created-space', 'created-workspace'],
    workspaceGridOpen: true,
    disconnectOpenerOnRender: true,
  });
  harness.api.bindOrganizationNameDialog();
  const oldWorkspaces = plain(harness.state.workspaces);
  assert.equal(harness.api.openOrganizationCreate('workspace', {}, harness.opener), true, 'Workspace creation must open from a real explicit opener');
  assert.equal(harness.title.textContent, i18n.en['organization.workspace.createTitle'], 'Workspace creation needs an object-specific title');
  assert.equal(harness.label.textContent, i18n.en['organization.workspace.nameLabel'], 'Workspace creation needs an object-specific label');
  assert.equal(harness.document.activeElement, harness.input, 'Workspace creation must focus the empty name field');
  harness.setInput('  Research  ');
  const pending = harness.api.confirmOrganizationCreate();

  assert.equal(harness.calls.snapshots.length, 1, 'Workspace creation must create one reversible snapshot');
  assert.equal(harness.calls.snapshots[0].label, 'Create workspace “Research”', 'History must use the exact trimmed name and active locale');
  assert.equal(harness.calls.persists, 1, 'Workspace creation must request one immediate receipt');
  assert.equal(harness.calls.uid, 4, 'The allocator must retry collisions with existing and newly allocated IDs');
  assert.equal(harness.state.workspaces.length, oldWorkspaces.length + 1, 'Pending workspace creation must stage one local transaction');
  assert.deepEqual(plain(harness.state.workspaces.slice(0, oldWorkspaces.length)), oldWorkspaces, 'Existing workspaces must remain byte-for-byte unchanged');
  const created = harness.state.workspaces.at(-1);
  assert.deepEqual(plain(created), {
    id: 'created-workspace',
    name: 'Research',
    symbol: '🏠',
    categories: [{ id: 'created-space', name: 'Pinned', groups: [] }],
    activeCatId: 'created-space',
  }, 'Workspace creation must produce one stable-ID, immediately saveable workspace with its localized default Space');
  assert.equal(harness.state.activeWsId, created.id, 'The created workspace must become active');
  assert.equal(harness.overlay.getAttribute('aria-busy'), 'true', 'Pending persistence must be announced');
  assert.equal(harness.confirm.textContent, i18n.en['organization.creating'], 'Pending action must have explicit feedback');
  assert.equal(harness.input.disabled, true, 'Pending creation must freeze the draft');
  assert.equal(harness.close.disabled, true, 'Pending creation must disable Close');
  assert.equal(harness.cancel.disabled, true, 'Pending creation must disable Cancel');
  assert.equal(harness.confirm.disabled, false, 'Pending creation must retain one focusable guarded confirmation anchor');
  assert.equal(harness.confirm.getAttribute('aria-disabled'), 'true', 'Pending creation must expose the guarded confirmation state');
  assert.equal(harness.document.activeElement, harness.confirm, 'Pending creation must keep focus on its guarded primary action');
  assert.equal(harness.calls.renders, 0, 'A pending receipt must not render a durable result');
  assert.equal(harness.calls.toasts.length, 0, 'A pending receipt must not claim success');
  assert.equal(visible(harness.overlay), true, 'The dialog must remain visible until acknowledgement');

  harness.setLocale('zh-TW');
  harness.api.paintOrganizationNameDialog();
  assert.equal(harness.title.textContent, i18n['zh-TW']['organization.workspace.createTitle'], 'Pending title must repaint in zh-TW');
  assert.equal(harness.confirm.textContent, i18n['zh-TW']['organization.creating'], 'Pending feedback must repaint in zh-TW');
  assert.equal(harness.input.value, '  Research  ', 'Locale repaint must preserve the pending draft');
  let busyEscapePrevented = false;
  harness.dispatch('organization-name-overlay', 'keydown', {
    key: 'Escape',
    preventDefault() { busyEscapePrevented = true; },
  });
  assert.equal(busyEscapePrevented, true, 'Busy Escape must be consumed');
  assert.equal(visible(harness.overlay), true, 'Busy Escape must not dismiss an unknown-outcome transaction');

  harness.setLocale('en');
  receipt.resolve();
  assert.equal(await pending, true, 'An acknowledged receipt must complete workspace creation');
  assert.equal(harness.calls.renders, 1, 'Acknowledged creation must render once');
  assert.equal(harness.calls.grids, 1, 'An underlying workspace manager must rebuild once');
  assert.equal(harness.calls.toasts.length, 1, 'Acknowledged creation must announce success once');
  assert.deepEqual(plain(harness.calls.toasts[0]), { message: 'Workspace “Research” created', options: { undo: 73 } }, 'Success must expose only the exact snapshot action ID');
  assert.equal(visible(harness.overlay), false, 'Acknowledged creation must close the form');
  assert.equal(harness.document.activeElement, harness.workspaceCard, 'Manager creation must focus the rebuilt created workspace card');
}

async function testWorkspaceHeaderRenderBoundaryAndZhDefault() {
  const header = deferred();
  const harness = buildHarness({
    locale: 'zh-TW',
    renderAllReady: header.promise,
    uidValues: ['zh-space', 'zh-workspace'],
    disconnectOpenerOnRender: true,
  });
  harness.api.bindOrganizationNameDialog();
  harness.api.openOrganizationCreate('workspace', {}, harness.opener);
  harness.setInput('研究');
  const pending = harness.api.confirmOrganizationCreate();
  await settleUntil(() => harness.calls.renders === 1, 'Acknowledged persistence must start rendering');
  const created = harness.state.workspaces.at(-1);
  assert.equal(created.categories[0].name, '釘選', 'zh-TW workspace creation must persist the native default Space name');
  assert.equal(visible(harness.overlay), true, 'Workspace form must remain open until the asynchronous header target exists');
  assert.equal(harness.calls.toasts.length, 0, 'Success must wait for the real header boundary');
  header.resolve();
  assert.equal(await pending, true, 'Workspace creation must finish after header rebuild');
  assert.equal(harness.document.activeElement, harness.workspaceChip, 'Non-manager creation must focus the rebuilt created workspace chip');
  assert.deepEqual(plain(harness.calls.toasts[0]), { message: '已新增工作區「研究」', options: { undo: 73 } }, 'zh-TW success and exact Undo must follow acknowledgement');
}

async function testSpaceCreationGraphAndStableParent() {
  const harness = buildHarness({ locale: 'zh-TW', uidValues: ['cat-c', 'created-space'] });
  harness.api.bindOrganizationNameDialog();
  const workspaceA = plain(harness.state.workspaces[0]);
  const workspaceB = plain(harness.state.workspaces[1]);
  assert.equal(harness.api.openOrganizationCreate('space', { workspaceId: 'ws-a' }, harness.opener), true, 'Space creation must capture an exact owning workspace ID');
  harness.setInput('  Reading  ');
  assert.equal(await harness.api.confirmOrganizationCreate(), true, 'Duplicate display names must remain valid because IDs own identity');
  const actualA = harness.state.workspaces[0];
  const created = actualA.categories.at(-1);
  assert.deepEqual(Object.keys(created).sort(), ['groups', 'id', 'name'], 'Plain Space creation must add only the schema-compatible structural fields');
  assert.deepEqual(plain(created), { id: 'created-space', name: 'Reading', groups: [] }, 'Space graph must use the exact trimmed name and a fresh stable ID');
  assert.deepEqual(plain(actualA.categories.slice(0, -1)), workspaceA.categories, 'Existing Spaces must remain byte-for-byte unchanged');
  assert.deepEqual(plain({ ...actualA, categories: workspaceA.categories, activeCatId: workspaceA.activeCatId }), workspaceA, 'Only categories and activeCatId may change in the parent workspace');
  assert.deepEqual(plain(harness.state.workspaces[1]), workspaceB, 'Other workspaces must remain byte-for-byte unchanged');
  assert.equal(actualA.activeCatId, created.id, 'Created Space must become active in its exact parent');
  assert.equal(harness.state.activeWsId, 'ws-a', 'The exact parent workspace must become active');
  assert.equal(harness.calls.snapshots[0].label, '新增空間「Reading」', 'Space history must be localized and exact');
  assert.equal(harness.calls.persists, 1, 'Space creation must use one immediate receipt');
  assert.deepEqual(plain(harness.calls.toasts[0]), { message: '已新增空間「Reading」', options: { undo: 73 } }, 'Space success must expose exact-action Undo');
  assert.equal(harness.document.activeElement, harness.visibleSpaceItem, 'Space success must focus the rebuilt active Space');
}

async function testCreateAndMoveGraphIntegrity() {
  const harness = buildHarness({ uidValues: ['group-a', 'moved-space'] });
  harness.api.bindOrganizationNameDialog();
  const sourceWorkspace = harness.state.workspaces[0];
  const sourceSpace = sourceWorkspace.categories[0];
  const sourceGroup = sourceSpace.groups[0];
  const sourceGroupGraph = plain(sourceGroup);
  const untouchedGroup = plain(sourceSpace.groups[1]);
  const untouchedSiblingSpace = plain(sourceWorkspace.categories[1]);
  const untouchedOtherWorkspace = plain(harness.state.workspaces[1]);
  const untouchedArchive = plain(harness.state.archive);
  const untouchedTrash = plain(harness.state.trash);

  assert.equal(harness.api.openOrganizationCreate('space', { groupId: 'group-a' }, harness.opener), true, 'Create-and-move must resolve one exact Group and source Space');
  assert.equal(harness.title.textContent, 'Create a space for “Inbox”', 'The title must name the exact Group consequence');
  assert.equal(harness.description.textContent, 'The group will move into the new space.', 'The dialog must explain the move before confirmation');
  assert.equal(harness.description.hidden, false, 'Move consequence must be visible only in this mode');
  assert.equal(harness.input.getAttribute('aria-describedby'), 'organization-name-description organization-name-error', 'Move helper and validation must both describe the input');
  harness.setInput('  Reading  ');
  assert.equal(await harness.api.confirmOrganizationCreate(), true, 'Create-and-move must accept a duplicate display name under stable identity');

  const created = sourceWorkspace.categories.at(-1);
  assert.equal(created.id, 'moved-space', 'New Space must retry an existing Group ID and receive a unique stable ID');
  assert.equal(created.name, 'Reading', 'New Space name must trim only outer whitespace');
  assert.equal(created.groups.length, 1, 'Exactly one Group must move');
  assert.equal(created.groups[0], sourceGroup, 'The exact Group object must move rather than being rebuilt or cloned');
  assert.deepEqual(plain(created.groups[0]), sourceGroupGraph, 'Nested items, reminders, symbol, color, and collapse state must survive byte-for-byte');
  assert.deepEqual(plain(created.canvasPositions), { 'group-a': { x: 17, y: 29 } }, 'Group-specific canvas position must move with the Group');
  assert.deepEqual(sourceSpace.groups.map(group => group.id), ['group-b'], 'The source Space must lose only the moved Group');
  assert.deepEqual(plain(sourceSpace.groups[0]), untouchedGroup, 'The untouched source Group must remain byte-for-byte unchanged');
  assert.deepEqual(plain(sourceSpace.canvasPositions), { 'group-b': { x: 4, y: 8 } }, 'Source layout must retain only untouched Group positions');
  assert.deepEqual(plain(sourceWorkspace.categories[1]), untouchedSiblingSpace, 'Sibling Space must remain byte-for-byte unchanged');
  assert.deepEqual(plain(harness.state.workspaces[1]), untouchedOtherWorkspace, 'Other workspace must remain byte-for-byte unchanged');
  assert.deepEqual(plain(harness.state.archive), untouchedArchive, 'Archive must remain unchanged');
  assert.deepEqual(plain(harness.state.trash), untouchedTrash, 'Trash must remain unchanged');
  assert.deepEqual(harness.state.settings.captureLastTarget, { workspaceId: 'ws-a', categoryId: 'moved-space', groupId: 'group-a' }, 'Remembered capture destination must follow the moved Group');
  assert.equal(sourceWorkspace.activeCatId, 'moved-space', 'New destination Space must become active');
  assert.equal(harness.calls.snapshots[0].label, 'Create space “Reading” and move group “Inbox”', 'History must name both exact entities');
  assert.deepEqual(plain(harness.calls.toasts[0]), { message: 'Created space “Reading” and moved group “Inbox”', options: { undo: 73 } }, 'Move success must expose the exact combined snapshot');
  assert.equal(harness.document.activeElement, harness.visibleSpaceItem, 'Move success must focus the new destination Space');
}

async function testStaleGroupNameRequiresReview() {
  const harness = buildHarness({ uidValues: ['group-a', 'reviewed-space'] });
  harness.api.bindOrganizationNameDialog();
  const sourceWorkspace = harness.state.workspaces[0];
  const sourceSpace = sourceWorkspace.categories[0];
  const sourceGroup = sourceSpace.groups[0];

  assert.equal(harness.api.openOrganizationCreate('space', { groupId: 'group-a' }, harness.opener), true, 'Create-and-move must open against the exact Group name initially shown');
  harness.setInput('  Deep Work  ');
  sourceGroup.name = 'Updated Inbox';
  const afterExternalRename = plain(harness.state);

  assert.equal(await harness.api.confirmOrganizationCreate(), false, 'An externally renamed Group must require review before create-and-move can proceed');
  assert.deepEqual(plain(harness.state), afterExternalRename, 'The review guard must preserve the externally renamed graph byte-for-byte');
  assert.equal(harness.title.textContent, 'Create a space for “Updated Inbox”', 'The review guard must repaint the title with the current Group name');
  assert.equal(harness.error.textContent, 'The group name changed. Review the updated group, then try again.', 'The review guard must explain that a second decision is required');
  assert.equal(harness.error.hidden, false, 'The stale-name review message must remain visibly announced');
  assert.equal(harness.input.getAttribute('aria-invalid'), 'true', 'The stale-name review state must be exposed to assistive technology');
  assert.equal(harness.input.value, '  Deep Work  ', 'Repainting stale Group information must preserve the user draft exactly');
  assert.equal(harness.input.disabled, false, 'A renamed Group must remain reviewable rather than becoming unavailable');
  assert.equal(harness.confirm.disabled, false, 'A renamed Group must allow an explicit second confirmation');
  assert.equal(harness.document.activeElement, harness.input, 'The review guard must return focus to the name field');
  assert.equal(harness.calls.uid, 0, 'The review guard must run before allocating an ID');
  assert.equal(harness.calls.snapshots.length, 0, 'The first confirmation after an external rename must not create history');
  assert.equal(harness.calls.persists, 0, 'The first confirmation after an external rename must make zero writes');
  assert.equal(harness.calls.renders, 0, 'The first confirmation after an external rename must not render a success state');
  assert.equal(harness.calls.toasts.length, 0, 'The first confirmation after an external rename must not claim success');

  harness.setLocale('zh-TW');
  harness.api.paintOrganizationNameDialog();
  assert.equal(harness.title.textContent, '為「Updated Inbox」新增空間', 'The reviewed current Group name must survive a live zh-TW repaint');
  assert.equal(harness.error.textContent, '群組名稱已變更。請確認更新後的群組，再試一次。', 'The stale-name recovery message must repaint in native zh-TW');
  assert.equal(harness.input.value, '  Deep Work  ', 'Locale repaint must preserve the reviewed draft');

  assert.equal(await harness.api.confirmOrganizationCreate(), true, 'A second confirmation against the repainted Group name must complete create-and-move');
  const created = sourceWorkspace.categories.at(-1);
  assert.equal(created.id, 'reviewed-space', 'The reviewed transaction must allocate one unique destination ID');
  assert.equal(created.name, 'Deep Work', 'The reviewed transaction must preserve normal outer-whitespace trimming');
  assert.equal(created.groups[0], sourceGroup, 'The reviewed transaction must move the exact externally renamed Group object');
  assert.deepEqual(sourceSpace.groups.map(group => group.id), ['group-b'], 'The reviewed transaction must remove only the intended Group from its original Space');
  assert.equal(harness.calls.snapshots.length, 1, 'Only the second confirmation may create one history snapshot');
  assert.equal(harness.calls.snapshots[0].label, '新增空間「Deep Work」並移動群組「Updated Inbox」', 'History must use the reviewed current Group name and active locale');
  assert.equal(harness.calls.persists, 1, 'Only the second confirmation may make one immediate write');
  assert.equal(harness.calls.renders, 1, 'Durable reviewed success must render exactly once');
  assert.deepEqual(plain(harness.calls.toasts[0]), { message: '已新增空間「Deep Work」並移動群組「Updated Inbox」', options: { undo: 73 } }, 'Reviewed success must report the current Group name with exact-action Undo');
}

async function testBlankIdAndStaleTargetFailures() {
  const blank = buildHarness();
  blank.api.bindOrganizationNameDialog();
  const beforeBlank = plain(blank.state);
  blank.api.openOrganizationCreate('workspace', {}, blank.opener);
  blank.setInput('   ');
  assert.equal(await blank.api.confirmOrganizationCreate(), false, 'Whitespace-only workspace name must fail validation');
  assert.equal(blank.error.textContent, i18n.en['organization.workspace.nameRequired'], 'Blank validation must name the exact object');
  assert.equal(blank.input.getAttribute('aria-invalid'), 'true', 'Blank field must expose invalid state');
  assert.equal(blank.document.activeElement, blank.input, 'Blank validation must return focus to the field');
  assert.equal(blank.calls.snapshots.length, 0, 'Blank validation must happen before history');
  assert.equal(blank.calls.persists, 0, 'Blank validation must happen before persistence');
  assert.deepEqual(plain(blank.state), beforeBlank, 'Blank validation must preserve the graph byte-for-byte');

  const duplicateParent = buildHarness();
  duplicateParent.state.workspaces.push({ id: 'ws-a', name: 'Duplicate ID', activeCatId: null, categories: [] });
  assert.equal(duplicateParent.api.openOrganizationCreate('space', { workspaceId: 'ws-a' }, duplicateParent.opener), false, 'Duplicate workspace IDs must fail closed before opening');

  const staleParent = buildHarness();
  staleParent.api.bindOrganizationNameDialog();
  staleParent.api.openOrganizationCreate('space', { workspaceId: 'ws-a' }, staleParent.opener);
  staleParent.setInput('Deep work');
  staleParent.state.workspaces = staleParent.state.workspaces.filter(workspace => workspace.id !== 'ws-a');
  const beforeStaleParent = plain(staleParent.state);
  assert.equal(await staleParent.api.confirmOrganizationCreate(), false, 'A parent removed while the dialog is open must fail closed');
  assert.deepEqual(plain(staleParent.state), beforeStaleParent, 'Stale-parent failure must not add a Space');
  assert.equal(staleParent.error.textContent, i18n.en['organization.space.parentUnavailable'], 'Stale parent must give a concrete recovery step');
  assert.equal(staleParent.input.disabled, true, 'Unavailable parent must disable stale input');
  assert.equal(staleParent.confirm.disabled, true, 'Unavailable parent must disable Create');
  assert.equal(staleParent.document.activeElement, staleParent.cancel, 'Unavailable parent must focus the safe action');
  assert.equal(staleParent.calls.snapshots.length, 0, 'Stale parent must fail before history');
  assert.equal(staleParent.calls.persists, 0, 'Stale parent must fail before persistence');

  const duplicateParentAfterOpen = buildHarness();
  duplicateParentAfterOpen.api.bindOrganizationNameDialog();
  duplicateParentAfterOpen.api.openOrganizationCreate('space', { workspaceId: 'ws-a' }, duplicateParentAfterOpen.opener);
  duplicateParentAfterOpen.setInput('Plans');
  duplicateParentAfterOpen.state.workspaces.push({ id: 'ws-a', name: 'Duplicate ID', activeCatId: null, categories: [] });
  assert.equal(await duplicateParentAfterOpen.api.confirmOrganizationCreate(), false, 'A duplicate parent introduced while open must fail closed');
  assert.equal(duplicateParentAfterOpen.calls.snapshots.length, 0, 'Duplicate parent must fail before history');
  assert.equal(duplicateParentAfterOpen.calls.persists, 0, 'Duplicate parent must fail before persistence');

  const duplicateGroup = buildHarness();
  duplicateGroup.state.workspaces[0].categories[1].groups.push({ id: 'group-a', name: 'Duplicate', items: [] });
  assert.equal(duplicateGroup.api.openOrganizationCreate('space', { groupId: 'group-a' }, duplicateGroup.opener), false, 'Duplicate Group IDs must fail closed before opening');

  const movedGroup = buildHarness();
  movedGroup.api.bindOrganizationNameDialog();
  movedGroup.api.openOrganizationCreate('space', { groupId: 'group-a' }, movedGroup.opener);
  movedGroup.setInput('Moved destination');
  const oldSpace = movedGroup.state.workspaces[0].categories[0];
  const newSource = movedGroup.state.workspaces[0].categories[1];
  newSource.groups.push(oldSpace.groups.shift());
  const afterExternalMove = plain(movedGroup.state);
  assert.equal(await movedGroup.api.confirmOrganizationCreate(), false, 'A Group moved elsewhere while open must require a fresh decision');
  assert.deepEqual(plain(movedGroup.state), afterExternalMove, 'Stale Group failure must preserve the externally moved graph');
  assert.equal(movedGroup.error.textContent, i18n.en['organization.group.unavailable'], 'Stale Group must explain how to recover');
  assert.equal(movedGroup.document.activeElement, movedGroup.cancel, 'Stale Group must focus the safe action');
  assert.equal(movedGroup.calls.snapshots.length, 0, 'Stale Group must fail before history');
  assert.equal(movedGroup.calls.persists, 0, 'Stale Group must fail before persistence');

  const duplicateGroupAfterOpen = buildHarness();
  duplicateGroupAfterOpen.api.bindOrganizationNameDialog();
  duplicateGroupAfterOpen.api.openOrganizationCreate('space', { groupId: 'group-a' }, duplicateGroupAfterOpen.opener);
  duplicateGroupAfterOpen.setInput('Plans');
  duplicateGroupAfterOpen.state.workspaces[0].categories[1].groups.push({ id: 'group-a', name: 'Duplicate', items: [] });
  assert.equal(await duplicateGroupAfterOpen.api.confirmOrganizationCreate(), false, 'A duplicate Group introduced while open must fail closed');
  assert.equal(duplicateGroupAfterOpen.calls.snapshots.length, 0, 'Duplicate Group must fail before history');
  assert.equal(duplicateGroupAfterOpen.calls.persists, 0, 'Duplicate Group must fail before persistence');

  const idFailure = buildHarness({ uidValues: Array(10000).fill('ws-a') });
  idFailure.api.bindOrganizationNameDialog();
  idFailure.api.openOrganizationCreate('workspace', {}, idFailure.opener);
  idFailure.setInput('No ID');
  assert.equal(await idFailure.api.confirmOrganizationCreate(), false, 'ID exhaustion must fail visibly rather than create a duplicate');
  assert.equal(idFailure.error.textContent, i18n.en['organization.idUnavailable'], 'ID failure must provide localized retry guidance');
  assert.equal(idFailure.calls.snapshots.length, 0, 'ID failure must happen before history');
  assert.equal(idFailure.calls.persists, 0, 'ID failure must happen before persistence');
}

async function testRejectedReceiptFailsClosed() {
  const failure = Object.assign(new Error('write rejected'), { code: 'LOCUS_STATE_WRITE_FAILED' });
  const harness = buildHarness({
    persistNow: async () => { throw failure; },
    uidValues: ['rejected-space'],
    simulateRecoveryOnFailure: true,
  });
  harness.api.bindOrganizationNameDialog();
  harness.api.openOrganizationCreate('space', { workspaceId: 'ws-a' }, harness.opener);
  harness.setInput('Deep work');
  assert.equal(await harness.api.confirmOrganizationCreate(), false, 'A rejected receipt must not complete creation');
  assert.equal(harness.state.workspaces[0].categories.at(-1).name, 'Deep work', 'The one dirty local transaction must remain visible behind recovery');
  assert.equal(harness.calls.snapshots.length, 1, 'Rejected creation must retain its reversible local snapshot');
  assert.equal(harness.calls.persists, 1, 'Rejected creation must make exactly one write attempt');
  assert.equal(harness.calls.renders, 0, 'Rejected persistence must not render durable success');
  assert.equal(harness.calls.toasts.length, 0, 'Rejected persistence must not claim success');
  assert.equal(visible(harness.overlay), true, 'The form must remain present behind recovery');
  assert.equal(visible(harness.recoveryOverlay), true, 'Persistence failure must reveal fail-closed recovery');
  assert.equal(harness.recoveryOverlay.inert, false, 'Recovery itself must remain operable');
  assert.equal(ownerSet(harness.recoveryOverlay).size, 0, 'Recovery must never receive an inert owner');
  assert.equal(harness.overlay.inert, true, 'Recovery must own the underlying creation form');
  assert.equal(ownerSet(harness.overlay).has('recovery'), true, 'Creation form must retain the recovery owner');
  assert.equal(harness.app.inert, true, 'The app must remain fail closed');
  assert.equal(ownerSet(harness.app).has('recovery'), true, 'The app must retain recovery ownership');
  assert.equal(harness.overlay.getAttribute('aria-busy'), 'false', 'Underlying form must clear stale busy announcement');
  assert.equal(harness.close.disabled, false, 'Underlying Close must clear busy state even though recovery owns interaction');
  assert.equal(harness.cancel.disabled, false, 'Underlying Cancel must clear busy state even though recovery owns interaction');
  const consumed = harness.api.handleOrganizationNameGlobalKey({
    key: 'Enter',
    target: harness.recoveryReload,
    preventDefault() { assert.fail('Creation must not prevent recovery Reload'); },
    stopImmediatePropagation() { assert.fail('Creation must not stop recovery Reload'); },
  });
  assert.equal(consumed, false, 'Recovery Reload must outrank the underlying creation interlock');
}

async function testLocaleRepaintFocusKeyboardAndLayering() {
  const locale = buildHarness();
  locale.api.bindOrganizationNameDialog();
  locale.api.openOrganizationCreate('space', { groupId: 'group-a' }, locale.opener);
  locale.setInput('Draft Space');
  locale.setLocale('zh-TW');
  locale.api.paintOrganizationNameDialog();
  assert.equal(locale.title.textContent, '為「Inbox」新增空間', 'Live zh-TW repaint must retain the exact Group name');
  assert.equal(locale.description.textContent, '這個群組會移到新空間。', 'Live repaint must update the move consequence');
  assert.equal(locale.label.textContent, '空間名稱', 'Live repaint must update the field label');
  assert.equal(locale.confirm.textContent, '新增', 'Live repaint must update the primary action');
  assert.equal(locale.input.value, 'Draft Space', 'Live repaint must never reset the draft');
  locale.setInput('   ');
  await locale.api.confirmOrganizationCreate();
  assert.equal(locale.error.textContent, '請輸入空間名稱。', 'Validation must use the active locale');
  locale.setLocale('en');
  locale.api.paintOrganizationNameDialog();
  assert.equal(locale.error.textContent, 'Enter a space name.', 'Open validation must repaint with locale changes');

  const keyboard = buildHarness();
  keyboard.api.bindOrganizationNameDialog();
  const before = plain(keyboard.state);
  keyboard.api.openOrganizationCreate('space', { workspaceId: 'ws-a' }, keyboard.opener);
  assert.equal(keyboard.document.activeElement, keyboard.input, 'Initial focus must enter the creation field');
  assert.equal(keyboard.app.inert, true, 'Opening creation must make the background inert');
  assert.equal(ownerSet(keyboard.app).has('organization-name'), true, 'Creation must own its background interlock independently');
  keyboard.dispatch('organization-name-overlay', 'keydown', { key: 'Tab' });
  assert.equal(keyboard.calls.traps, 1, 'Tab must stay inside the creation dialog');
  let shortcutStopped = false;
  keyboard.dispatch('organization-name-overlay', 'keydown', { key: 'k', ctrlKey: true, stopPropagation() { shortcutStopped = true; } });
  assert.equal(shortcutStopped, true, 'Document shortcuts must stop at the active creation dialog');
  let escapePrevented = false;
  let escapeStopped = false;
  keyboard.dispatch('organization-name-overlay', 'keydown', {
    key: 'Escape',
    preventDefault() { escapePrevented = true; },
    stopPropagation() { escapeStopped = true; },
  });
  assert.equal(escapePrevented, true, 'Idle Escape must be consumed by the top creation layer');
  assert.equal(escapeStopped, true, 'Idle Escape must not close a lower layer');
  assert.equal(visible(keyboard.overlay), false, 'Idle Escape must close only creation');
  assert.deepEqual(plain(keyboard.state), before, 'Cancellation must not mutate data');
  assert.equal(keyboard.document.activeElement, keyboard.opener, 'Cancellation must return focus to the explicit opener');
  assert.equal(keyboard.app.inert, false, 'Closing creation must release its own inert owner');
  assert.equal(keyboard.calls.locks, 1, 'Opening must lock body scroll once');
  assert.equal(keyboard.calls.unlocks, 1, 'Closing must release body scroll once');

  keyboard.api.openOrganizationCreate('space', { workspaceId: 'ws-a' }, keyboard.opener);
  let globalPrevented = false;
  let globalStopped = false;
  const globallyConsumed = keyboard.api.handleOrganizationNameGlobalKey({
    key: 'Escape',
    target: keyboard.landing,
    preventDefault() { globalPrevented = true; },
    stopImmediatePropagation() { globalStopped = true; },
  });
  assert.equal(globallyConsumed, true, 'An outside-target key must belong to the active creation form');
  assert.equal(globalPrevented, true, 'Outside-target Escape must be consumed');
  assert.equal(globalStopped, true, 'Outside-target Escape must not reach lower global handlers');
  assert.equal(visible(keyboard.overlay), false, 'Outside-target Escape must close only creation');

  const enter = buildHarness({ uidValues: ['entered-space'] });
  enter.api.bindOrganizationNameDialog();
  enter.api.openOrganizationCreate('space', { workspaceId: 'ws-a' }, enter.opener);
  enter.setInput('Keyboard Space');
  let enterPrevented = false;
  enter.dispatch('organization-name-overlay', 'keydown', { key: 'Enter', target: enter.input, preventDefault() { enterPrevented = true; } });
  await settleUntil(() => enter.calls.toasts.length === 1, 'Enter from the name field must complete creation');
  assert.equal(enterPrevented, true, 'Input Enter must suppress native submission');
  assert.equal(enter.state.workspaces[0].categories.at(-1).name, 'Keyboard Space', 'Input Enter must use the shared receipt-gated controller');

  for (const [layerName, layer] of [
    ['recovery', keyboard.recoveryOverlay],
    ['organization deletion', keyboard.deleteOverlay],
    ['Trash deletion', keyboard.trashOverlay],
    ['legacy modal', keyboard.legacyModal],
  ]) {
    layer.classList.remove('hidden');
    assert.equal(keyboard.api.openOrganizationCreate('workspace', {}, keyboard.opener), false, `Creation must refuse active ${layerName}`);
    layer.classList.add('hidden');
  }
}

(async () => {
  testStaticEntryPointsAndResidueRemoval();
  testLocalizationContract();
  testMarkupAndResponsiveCss();
  await testWorkspaceCreationReceiptUndoAndFocus();
  await testWorkspaceHeaderRenderBoundaryAndZhDefault();
  await testSpaceCreationGraphAndStableParent();
  await testCreateAndMoveGraphIntegrity();
  await testStaleGroupNameRequiresReview();
  await testBlankIdAndStaleTargetFailures();
  await testRejectedReceiptFailsClosed();
  await testLocaleRepaintFocusKeyboardAndLayering();
  console.log('Organization creation contracts passed: centralized entry points, stable graphs, receipts, Undo, localization, focus, and responsive styling.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
