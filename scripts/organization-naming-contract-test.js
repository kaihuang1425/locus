'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');
const deferredDefects = [];

function extractFunctionRecord(name) {
  const signature = `function ${name}(`;
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `${name} must exist in production`);
  const parametersStart = source.indexOf('(', start);
  let parameterDepth = 0;
  let parametersEnd = -1;
  for (let index = parametersStart; index < source.length; index++) {
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
  for (let index = bodyStart; index < source.length; index++) {
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

function extractCssRule(marker, fromIndex = 0) {
  const start = css.indexOf(marker, fromIndex);
  assert.ok(start >= 0, `${marker} must exist in CSS`);
  const bodyStart = css.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < css.length; index++) {
    if (css[index] === '{') depth += 1;
    else if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, index + 1);
    }
  }
  assert.fail(`${marker} must have a balanced CSS body`);
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
    { filename: 'organization-naming-i18n-extract.js' },
  );
}

const controllerFunctionNames = [
  'organizationNameTarget',
  'openOrganizationName',
  'paintOrganizationMoveOptions',
  'paintOrganizationNameDialog',
  'setOrganizationNameBusy',
  'closeOrganizationNameDialog',
  'confirmOrganizationName',
  'bindOrganizationNameDialog',
  'handleOrganizationNameGlobalKey',
  'focusOrganizationNameFallback',
];

function extractController() {
  const declaration = /\b(?:let|const)\s+organizationNameCtx\s*=/.exec(source);
  assert.ok(declaration, 'organizationNameCtx must remain an extractable production controller boundary');
  const start = source.lastIndexOf('\n', declaration.index) + 1;
  const records = controllerFunctionNames.map(extractFunctionRecord);
  const end = Math.max(...records.map(record => record.end));
  assert.ok(end > start, 'Organization naming controller must remain a contiguous extractable block');
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

const controllerSource = extractController();
const inertOwnerSource = extractFunction('setElementInertOwner');
const inheritedInterlocksSource = extractFunction('inheritActiveBodyInterlocks');
const applyLocaleSource = extractFunction('applyLocale');
const paletteDomSource = extractFunction('_palEnsureDom');
const openPaletteSource = extractFunction('openCommandPalette');
const bindStaticSource = extractFunction('bindStatic');
const openDeleteSource = extractFunction('openOrganizationDelete');
const focusDialogOpenerSource = extractFunction('focusDialogOpener');
const renderAllSource = extractFunction('renderAll');
const i18n = readI18n();

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
    workspaces: [
      {
        id: 'ws-a',
        name: 'Research',
        symbol: '🏠',
        activeCatId: 'cat-a',
        categories: [
          { id: 'cat-a', name: 'Reading', groups: [] },
          { id: 'cat-b', name: 'Reading', groups: [] },
        ],
      },
      {
        id: 'ws-b',
        name: 'Research',
        symbol: '💼',
        activeCatId: 'cat-c',
        categories: [{ id: 'cat-c', name: 'Home', groups: [] }],
      },
    ],
  };
}

function buildHarness({
  persistNow = async () => undefined,
  locale = 'en',
  disconnectOpenerOnRender = false,
  simulateRecoveryOnFailure = false,
  renderAllReady = Promise.resolve(),
} = {}) {
  const calls = {
    locks: 0,
    unlocks: 0,
    persists: 0,
    renders: 0,
    grids: 0,
    traps: 0,
    selections: 0,
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
    querySelector(selector) {
      if (selector === '#wsg-close') return elements.get('wsg-close') || null;
      if (selector === '#ws-menu-btn') return elements.get('ws-menu-btn') || null;
      if (selector === '#add-ws-btn') return elements.get('add-ws-btn') || null;
      if (selector === '#add-cat-btn') return elements.get('add-cat-btn') || null;
      const workspaceId = selector.match(/data-(?:wsid|ws-id)=["']([^"']+)["']/)?.[1];
      if (workspaceId) {
        return [elements.get('workspace-chip'), elements.get('workspace-card')]
          .find(element => element?.dataset?.wsid === workspaceId || element?.dataset?.wsId === workspaceId) || null;
      }
      const categoryId = selector.match(/data-(?:cat-id|catid|cid)=["']([^"']+)["']/)?.[1];
      if (categoryId) {
        return [elements.get('active-space-item'), elements.get('other-space-item'), elements.get('home-space-opener')]
          .find(element => element?.dataset?.catId === categoryId || element?.dataset?.cid === categoryId) || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.space-item' || selector.includes('.space-item')) {
        return [elements.get('active-space-item'), elements.get('other-space-item')].filter(Boolean);
      }
      if (selector === '.home-card-more' || selector.includes('.home-card-more')) {
        return [elements.get('home-space-opener')].filter(Boolean);
      }
      if (selector === '.wsg-card' || selector.includes('.wsg-card')) {
        return [elements.get('workspace-card')].filter(Boolean);
      }
      if (selector === '.ws-chip' || selector.includes('.ws-chip') || selector.includes('[data-wsid]')) {
        return [elements.get('workspace-chip'), elements.get('workspace-card')].filter(Boolean);
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
      oninput: null,
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
      select() {
        calls.selections += 1;
        this.focus();
      },
      setSelectionRange() {
        calls.selections += 1;
        this.focus();
      },
      addEventListener(type, listener) { listeners.set(`${id}:${type}`, listener); },
    };
    elements.set(id, element);
    if (bodyChild) bodyChildren.push(element);
    if (overlayChild) overlayChildren.add(element);
    return element;
  }

  const app = makeElement('app', [], { bodyChild: true });
  const welcomeLayer = makeElement('welcome', ['hidden'], { bodyChild: true });
  const workspaceGrid = makeElement('ws-grid-overlay', ['hidden'], { bodyChild: true });
  const workspaceList = makeElement('ws-list', ['hidden'], { bodyChild: true });
  const recoveryOverlay = makeElement('state-recovery-overlay', ['hidden'], { bodyChild: true });
  const recoveryReload = makeElement('state-recovery-reload');
  const deleteOverlay = makeElement('organization-delete-overlay', ['hidden'], { bodyChild: true });
  const overlay = makeElement('organization-name-overlay', ['hidden'], { bodyChild: true });
  const title = makeElement('organization-name-title', [], { overlayChild: true });
  const label = makeElement('organization-name-label', [], { overlayChild: true });
  const input = makeElement('organization-name-input', [], { overlayChild: true });
  const error = makeElement('organization-name-error', ['organization-name-error'], { overlayChild: true });
  error.hidden = true;
  const close = makeElement('organization-name-close', [], { overlayChild: true });
  const cancel = makeElement('organization-name-cancel', [], { overlayChild: true });
  const confirm = makeElement('organization-name-confirm', [], { overlayChild: true });
  const workspaceChip = makeElement('workspace-chip');
  workspaceChip.className = 'ws-chip';
  workspaceChip.dataset.wsid = 'ws-a';
  const workspaceCard = makeElement('workspace-card');
  workspaceCard.className = 'wsg-card';
  workspaceCard.dataset.wsid = 'ws-a';
  workspaceCard.dataset.wsId = 'ws-a';
  const activeSpaceItem = makeElement('active-space-item');
  activeSpaceItem.className = 'space-item';
  activeSpaceItem.dataset.catId = 'cat-a';
  const otherSpaceItem = makeElement('other-space-item');
  otherSpaceItem.className = 'space-item';
  otherSpaceItem.dataset.catId = 'cat-b';
  const homeSpaceOpener = makeElement('home-space-opener');
  homeSpaceOpener.dataset.catId = 'cat-a';
  makeElement('wsg-close');
  makeElement('ws-menu-btn');
  makeElement('add-ws-btn');
  makeElement('add-cat-btn');
  const opener = makeElement('rename-opener');
  const detachedMenuItem = makeElement('context-menu-item');
  document.activeElement = detachedMenuItem;

  const state = makeState();
  const openers = new WeakMap();
  let currentLocale = locale;
  let context;

  const State = {
    get() { return state; },
    snapshot(historyLabel) {
      calls.snapshots.push({ label: historyLabel, data: plain(state) });
      return 91;
    },
    async persistNow() {
      calls.persists += 1;
      try {
        return await persistNow();
      } catch (failure) {
        if (simulateRecoveryOnFailure) {
          recoveryOverlay.classList.remove('hidden');
          for (const element of bodyChildren) {
            if (element === recoveryOverlay) continue;
            context.__organizationName.setElementInertOwner(element, 'recovery', true);
          }
        }
        throw failure;
      }
    },
  };

  context = vm.createContext({
    document,
    State,
    findCategory(id) {
      for (const workspace of state.workspaces) {
        const category = workspace.categories.find(candidate => candidate.id === id);
        if (category) return { ws: workspace, cat: category };
      }
      return null;
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
      return renderAllReady;
    },
    async openWsGrid() {
      calls.grids += 1;
      workspaceGrid.classList.remove('hidden');
    },
    toast(message, options) { calls.toasts.push({ message, options }); },
    setTimeout(callback) { callback(); return 1; },
    requestAnimationFrame(callback) { callback(); return 1; },
    CSS: { escape(value) { return String(value); } },
    JSON,
  });

  vm.runInContext(
    `${inertOwnerSource}\n${focusDialogOpenerSource}\n${controllerSource}\n` +
      'globalThis.__organizationName = {\n' +
      '  setElementInertOwner, organizationNameTarget, openOrganizationName,\n' +
      '  paintOrganizationNameDialog, setOrganizationNameBusy, closeOrganizationNameDialog,\n' +
      '  confirmOrganizationName, bindOrganizationNameDialog, handleOrganizationNameGlobalKey,\n' +
      '  focusOrganizationNameFallback,\n' +
      '};',
    context,
    { filename: 'organization-naming-production-contract.js' },
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
    if (type === 'input' && typeof element.oninput === 'function') element.oninput(enriched);
    const listener = listeners.get(`${id}:${type}`);
    if (listener) return listener(enriched);
    return undefined;
  }

  function setInput(value) {
    input.value = value;
    dispatch('organization-name-input', 'input');
  }

  return {
    api: context.__organizationName,
    calls,
    listeners,
    dispatch,
    setInput,
    setLocale(value) { currentLocale = value; },
    document,
    elements,
    state,
    app,
    welcomeLayer,
    workspaceGrid,
    workspaceList,
    recoveryOverlay,
    recoveryReload,
    deleteOverlay,
    overlay,
    title,
    label,
    input,
    error,
    close,
    cancel,
    confirm,
    workspaceChip,
    workspaceCard,
    activeSpaceItem,
    otherSpaceItem,
    opener,
  };
}

function testStaticDialogAndReachability() {
  for (const id of [
    'organization-name-overlay',
    'organization-name-title',
    'organization-name-label',
    'organization-name-input',
    'organization-name-error',
    'organization-name-close',
    'organization-name-cancel',
    'organization-name-confirm',
  ]) {
    const matches = html.match(new RegExp(`\\bid=["']${id}["']`, 'g')) || [];
    assert.equal(matches.length, 1, `Organization naming id must be unique: ${id}`);
  }
  assert.match(
    html,
    /id="organization-name-overlay"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="organization-name-title"[^>]*aria-busy="false"/,
    'Naming must use one labelled, modal, busy-aware dialog',
  );
  assert.match(html, /id="organization-name-label"[^>]*for="organization-name-input"/, 'The visible object-specific label must name the input');
  assert.match(html, /<input(?=[^>]*id="organization-name-input")(?=[^>]*aria-describedby="organization-name-error")(?=[^>]*autocomplete="off")[^>]*>/, 'The name field must expose validation text and avoid unrelated autocomplete');
  assert.match(html, /id="organization-name-error"[^>]*(?:role="alert"|aria-live="polite")/, 'Validation changes must be announced');
  assert.match(html, /id="organization-name-close"[^>]*data-i18n-aria-label="organization\.close"/, 'The icon close action needs a localized screen-reader name');
  assert.match(html, /id="organization-name-cancel"[^>]*data-i18n="organization\.cancel"/, 'The safe footer action needs localized fallback copy');
  assert.match(html, /id="organization-name-confirm"[^>]*data-i18n="organization\.rename"/, 'The primary action needs localized fallback copy');

  const entryContracts = [
    ['buildWsChip', /openOrganizationName\('workspace',\s*ws\.id,\s*chip\)/],
    ['openWsGrid', /openOrganizationName\('workspace',\s*ws\.id,\s*card\)/],
    // 2026-11: Home is the Today board; the Space register card menu is gone.
    ['renderSpaceNav', /openOrganizationName\('space',\s*cat\.id,\s*el\)/],
    // 2026-11: the Space page's own Space actions menu.
    ['spaceActionMenuItems', /openOrganizationName\('space',\s*cat\.id,\s*opener\)/],
  ];
  for (const [name, expected] of entryContracts) {
    const implementation = extractFunction(name);
    assert.match(implementation, expected, `${name} must route its reachable rename action through the shared stable-ID controller`);
    assert.match(implementation, /organization\.rename/, `${name} must use the localized Rename menu label`);
    assert.doesNotMatch(implementation, /\bprompt\s*\(/, `${name} must not retain a native organization rename prompt`);
  }
  assert.equal((source.match(/openOrganizationName\(/g) || []).length, 5, 'Four reachable entry points plus the controller must share one rename path');

  const hiddenTabs = extractFunction('renderCategoryTabs');
  assert.doesNotMatch(hiddenTabs, /openOrganizationName|Rename category|Rename cat|organization\.rename/, 'The hidden legacy category strip must not retain a duplicate rename action');
  assert.doesNotMatch(hiddenTabs, /\.ondblclick\s*=/, 'The hidden category strip must not retain mouse-only double-click rename');
  const visibleSidebar = extractFunction('renderSpaceNav');
  assert.doesNotMatch(visibleSidebar, /\.ondblclick\s*=/, 'The visible sidebar must offer one keyboard-reachable menu action instead of duplicate double-click rename');
  assert.match(css, /\.cat-tabs-wrap\s*\{\s*display:\s*none !important;/, 'The removed hidden-tab rename path must remain genuinely hidden');

  assert.match(inheritedInterlocksSource, /organization-name-overlay/, 'Late-mounted body surfaces must inherit an active naming interlock');
  assert.match(inheritedInterlocksSource, /setElementInertOwner\([^\n]+organization/, 'Naming must use the shared independently-owned inertness helper');
  assert.match(paletteDomSource, /document\.body\.appendChild\(ov\);\s*inheritActiveBodyInterlocks\(ov\);/, 'A lazy palette must inherit the active naming interlock');
  assert.match(openPaletteSource, /organization-name-overlay[\s\S]*return false;/, 'Programmatic command-palette opens must refuse an active naming dialog');
  if (!/organization-name-overlay[\s\S]*return false;/.test(openDeleteSource)) {
    deferredDefects.push('Delete and Rename decisions must not open above one another');
  }
  assert.match(bindStaticSource, /if \(handleOrganizationNameGlobalKey\(e\)\) return;/, 'Outside-target keys must route through the naming interlock before global shortcuts');
  assert.match(source, /bindOrganizationNameDialog\(\);/, 'Initialization must bind the naming dialog once');
  assert.match(source, /_escBlockers = \[[^\]]*'organization-name-overlay'/, 'Naming must join the last-opened-first-closed Escape stack');
  assert.doesNotMatch(extractFunction('focusOrganizationNameFallback'), /\.cat-tab/, 'Focus fallback must never target the hidden category strip');
  assert.match(extractFunction('focusOrganizationNameFallback'), /document\.activeElement === target/, 'Focus fallback must verify that a visible candidate received focus');
  assert.match(renderAllSource, /const headerReady = renderHeader\(\);[\s\S]*return headerReady;/, 'The shared renderer must expose the real asynchronous workspace-chip completion boundary');
  assert.match(controllerSource, /const headerReady = renderAll\(\);[\s\S]*dialogCtx\.kind === 'workspace'[\s\S]*await headerReady;/, 'Workspace-chip success must wait for the actual rebuilt header before focus return');
  assert.doesNotMatch(extractFunction('closeOrganizationNameDialog'), /kind === 'workspace'[\s\S]*\b80\b/, 'Workspace focus must not rely on a fixed Chrome window-query delay');
  assert.match(extractFunction('handleOrganizationNameGlobalKey'), /recoveryActive && recovery\.contains\(event\.target\)[\s\S]*return false;[\s\S]*event\.preventDefault\(\)/, 'The lower naming interlock must not cancel keyboard activation inside fail-closed recovery');
}

function testLocalizationContract() {
  const required = [
    'organization.renameMenu',
    'organization.rename',
    'organization.renaming',
    'organization.nameChanged',
    'organization.workspace.renameTitle',
    'organization.workspace.nameLabel',
    'organization.workspace.actions',
    'organization.workspace.nameRequired',
    'organization.workspace.unavailable',
    'organization.workspace.renameHistory',
    'organization.workspace.renamed',
    'organization.space.renameTitle',
    'organization.space.nameLabel',
    'organization.space.actions',
    'organization.space.nameRequired',
    'organization.space.unavailable',
    'organization.space.renameHistory',
    'organization.space.renamed',
  ].sort();
  const namingKey = key => required.includes(key);
  assert.deepEqual(Object.keys(i18n.en).filter(namingKey).sort(), required, 'English must expose the complete runtime naming vocabulary');
  assert.deepEqual(Object.keys(i18n['zh-TW']).filter(namingKey).sort(), required, 'zh-TW must expose the same runtime naming vocabulary');
  for (const key of required) {
    assert.ok(i18n.en[key]?.trim(), `English ${key} must not be blank`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `zh-TW ${key} must not be blank`);
  }

  const expectedEnglish = {
    'organization.renameMenu': 'Rename…',
    'organization.rename': 'Rename',
    'organization.renaming': 'Renaming…',
    'organization.nameChanged': 'The name changed. Review the latest name, then try again.',
    'organization.workspace.renameTitle': 'Rename workspace',
    'organization.workspace.nameLabel': 'Workspace name',
    'organization.workspace.actions': 'Workspace actions for “{name}”',
    'organization.workspace.nameRequired': 'Enter a workspace name.',
    'organization.workspace.unavailable': 'This workspace no longer exists.',
    'organization.workspace.renameHistory': 'Rename workspace “{from}” to “{to}”',
    'organization.workspace.renamed': 'Workspace renamed to “{name}”',
    'organization.space.renameTitle': 'Rename space',
    'organization.space.nameLabel': 'Space name',
    'organization.space.actions': 'Space actions for “{name}”',
    'organization.space.nameRequired': 'Enter a space name.',
    'organization.space.unavailable': 'This space no longer exists.',
    'organization.space.renameHistory': 'Rename space “{from}” to “{to}”',
    'organization.space.renamed': 'Space renamed to “{name}”',
  };
  const expectedZh = {
    'organization.renameMenu': '重新命名…',
    'organization.rename': '重新命名',
    'organization.renaming': '重新命名中…',
    'organization.nameChanged': '名稱已變更。請確認最新名稱後再試一次。',
    'organization.workspace.renameTitle': '重新命名工作區',
    'organization.workspace.nameLabel': '工作區名稱',
    'organization.workspace.actions': '「{name}」工作區的操作',
    'organization.workspace.nameRequired': '請輸入工作區名稱。',
    'organization.workspace.unavailable': '這個工作區已不存在。',
    'organization.workspace.renameHistory': '工作區「{from}」改名為「{to}」',
    'organization.workspace.renamed': '工作區名稱已改為「{name}」',
    'organization.space.renameTitle': '重新命名空間',
    'organization.space.nameLabel': '空間名稱',
    'organization.space.actions': '「{name}」空間的操作',
    'organization.space.nameRequired': '請輸入空間名稱。',
    'organization.space.unavailable': '這個空間已不存在。',
    'organization.space.renameHistory': '空間「{from}」改名為「{to}」',
    'organization.space.renamed': '空間名稱已改為「{name}」',
  };
  for (const [key, value] of Object.entries(expectedEnglish)) assert.equal(i18n.en[key], value, `English ${key} must keep the approved copy`);
  for (const [key, value] of Object.entries(expectedZh)) assert.equal(i18n['zh-TW'][key], value, `zh-TW ${key} must keep native Taiwan copy`);
  assert.doesNotMatch(required.map(key => i18n['zh-TW'][key]).join(' '), /分類/, 'The public zh-TW naming flow must not leak the internal category model');
  assert.match(applyLocaleSource, /paintOrganizationNameDialog\(\);/, 'Changing locale while naming is open must repaint dynamic title, validation, and pending state');
}

function testResponsiveDialogCss() {
  assert.match(css, /#modal-overlay,[^\n]*#organization-name-overlay/, 'Naming must reuse the shared modal scrim language');
  const lightScrim = extractCssRule('[data-theme-mode="light"] #modal-overlay');
  assert.match(lightScrim, /\[data-theme-mode="light"\] #organization-name-overlay/, 'Every light-classified theme must include naming in the shared scrim rule');
  assert.match(lightScrim, /background:\s*rgba\(20,20,30,0\.3\)/, 'Light-classified themes must share the calmer dialog scrim');
  const hiddenRule = extractCssRule('#modal-overlay.hidden');
  assert.match(hiddenRule, /#organization-name-overlay\.hidden/, 'Naming must join the explicit hidden-state rule');
  assert.match(hiddenRule, /pointer-events:\s*none/, 'The hidden naming layer must be noninteractive');
  assert.match(
    css,
    /(?:#organization-name-overlay\s*(?:>\s*)?\.rm-panel|\.organization-name-panel)\s*\{[^}]*width:\s*min\(420px, calc\(100vw - 32px\)\);[^}]*max-height:\s*calc\(100dvh - 32px\);[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/s,
    'The naming panel must retain 32px viewport gutters and a height-safe three-row layout',
  );
  assert.match(css, /(?:#organization-name-overlay\s+|\.organization-name-panel\s+)\.modal-bd\s*\{[^}]*overflow-y:\s*auto;/s, 'The form body must scroll instead of escaping a 720px viewport');
  assert.match(css, /#organization-name-input[^}]*\{[^}]*width:\s*100%/s, 'The name field must fill the responsive form width');
  assert.match(css, /#organization-name-input\[aria-invalid="true"\][^}]*\{[^}]*border-color:/s, 'Invalid naming input needs a non-text visual state');
  assert.match(css, /(?:#organization-name-error|\.organization-name-error)[^}]*\{[^}]*color:/s, 'Validation feedback must use a shared semantic color');

  const narrow = extractCssRule('@media (max-width: 520px) {', css.indexOf('#organization-name-overlay'));
  assert.match(narrow, /(?:#organization-name-overlay|\.organization-name-panel)[\s\S]*\.modal-ft\s*\{[^}]*flex-wrap:\s*wrap;/s, '520px layouts must wrap naming actions');
  assert.match(narrow, /(?:#organization-name-overlay|\.organization-name-panel)[\s\S]*\.modal-ft\s*>\s*button\s*\{[^}]*flex:\s*1 1 140px;/s, 'Narrow naming actions must remain balanced touch targets');

  const reduced = extractCssRule('@media (prefers-reduced-motion: reduce) {', css.indexOf('/* ── Reduced motion'));
  assert.match(reduced, /\*, \*::before, \*::after/, 'The global reduced-motion contract must cover the naming dialog');
  const forced = extractCssRule('@media (forced-colors: active) {');
  assert.match(forced, /input:focus-visible[\s\S]*outline:\s*2px solid CanvasText;/, 'Forced colors must preserve visible input focus');
  assert.match(forced, /\.rm-panel,[^}]*\{\s*border:\s*1px solid CanvasText;/, 'Forced colors must preserve the naming panel boundary');
}

async function testTargetValidationAndNoOps() {
  const targetHarness = buildHarness();
  const workspaceTarget = targetHarness.api.organizationNameTarget('workspace', 'ws-a');
  assert.deepEqual(
    plain({ kind: workspaceTarget.kind, id: workspaceTarget.id, name: workspaceTarget.name }),
    { kind: 'workspace', id: 'ws-a', name: 'Research' },
    'Workspace lookup must retain the exact stable target instead of resolving by duplicate name',
  );
  assert.equal(workspaceTarget.entity.id, 'ws-a', 'Workspace mutation authority must be the exact stable-ID entity');
  const spaceTarget = targetHarness.api.organizationNameTarget('space', 'cat-a');
  assert.deepEqual(
    plain({ kind: spaceTarget.kind, id: spaceTarget.id, name: spaceTarget.name, workspaceId: spaceTarget.workspaceId }),
    { kind: 'space', id: 'cat-a', name: 'Reading', workspaceId: 'ws-a' },
    'Space lookup must retain its stable entity and owning workspace identity',
  );
  assert.equal(spaceTarget.entity.id, 'cat-a', 'Space mutation authority must be the exact stable-ID entity');
  assert.equal(targetHarness.api.organizationNameTarget('workspace', 'missing'), null, 'Missing workspace IDs must fail closed');
  assert.equal(targetHarness.api.organizationNameTarget('space', 'missing'), null, 'Missing Space IDs must fail closed');
  assert.equal(targetHarness.api.organizationNameTarget('category', 'cat-a'), null, 'Internal category terminology must not become a public controller kind');

  const unchanged = buildHarness();
  unchanged.api.bindOrganizationNameDialog();
  const beforeUnchanged = plain(unchanged.state);
  assert.equal(unchanged.api.openOrganizationName('space', 'cat-a', unchanged.opener), true, 'A valid Space must open the shared form');
  assert.equal(unchanged.input.value, 'Reading', 'The form must begin with the real current name');
  assert.equal(unchanged.document.activeElement, unchanged.input, 'The name field must receive initial focus');
  assert.ok(unchanged.calls.selections > 0, 'The current name must be selected for immediate replacement');
  assert.equal(await unchanged.api.confirmOrganizationName(), true, 'Submitting the unchanged normalized name may close as a completed no-op');
  assert.equal(unchanged.calls.snapshots.length, 0, 'An unchanged name must not create history');
  assert.equal(unchanged.calls.persists, 0, 'An unchanged name must not write');
  assert.equal(unchanged.calls.renders, 0, 'An unchanged name must not render a mutation');
  assert.equal(unchanged.calls.toasts.length, 0, 'An unchanged name must not claim a rename');
  assert.equal(unchanged.overlay.classList.contains('hidden'), true, 'An unchanged submission must dismiss the completed no-op form');
  assert.deepEqual(plain(unchanged.state), beforeUnchanged, 'An unchanged submission must preserve the graph byte-for-byte');

  const blank = buildHarness();
  blank.api.bindOrganizationNameDialog();
  const beforeBlank = plain(blank.state);
  blank.api.openOrganizationName('space', 'cat-a', blank.opener);
  blank.setInput('   ');
  assert.equal(await blank.api.confirmOrganizationName(), false, 'Whitespace-only input must fail validation');
  assert.equal(blank.calls.snapshots.length, 0, 'Blank validation must happen before history');
  assert.equal(blank.calls.persists, 0, 'Blank validation must happen before persistence');
  assert.equal(blank.input.getAttribute('aria-invalid'), 'true', 'Blank input must expose its invalid state');
  assert.equal(blank.error.textContent, i18n.en['organization.space.nameRequired'], 'Blank validation must name the exact object in the active locale');
  assert.equal(visible(blank.error), true, 'Blank validation must be visible');
  assert.equal(blank.document.activeElement, blank.input, 'Blank validation must return focus to the field');
  assert.deepEqual(plain(blank.state), beforeBlank, 'Blank validation must preserve the graph byte-for-byte');

  const changed = buildHarness();
  changed.api.bindOrganizationNameDialog();
  changed.api.openOrganizationName('workspace', 'ws-a', changed.opener);
  changed.setInput('Focus Lab');
  changed.state.workspaces[0].name = 'Concurrent name';
  assert.equal(await changed.api.confirmOrganizationName(), false, 'A name changed while open must require a fresh decision');
  assert.equal(changed.calls.snapshots.length, 0, 'Stale-name refresh must happen before history');
  assert.equal(changed.calls.persists, 0, 'Stale-name refresh must happen before persistence');
  assert.equal(changed.input.value, 'Concurrent name', 'A stale form must repaint the latest real name');
  assert.equal(changed.error.textContent, i18n.en['organization.nameChanged'], 'A stale form must explain the recovery step');
  assert.equal(changed.input.getAttribute('aria-invalid'), 'true', 'A stale form must expose validation to assistive technology');
  assert.equal(changed.document.activeElement, changed.input, 'A stale refresh must return focus to the selected latest name');
  changed.setLocale('zh-TW');
  changed.api.paintOrganizationNameDialog();
  assert.equal(changed.error.textContent, i18n['zh-TW']['organization.nameChanged'], 'A live locale change must repaint stale validation');

  const missing = buildHarness();
  missing.api.bindOrganizationNameDialog();
  missing.api.openOrganizationName('space', 'cat-a', missing.opener);
  missing.setInput('Deep work');
  missing.state.workspaces[0].categories = missing.state.workspaces[0].categories.filter(category => category.id !== 'cat-a');
  assert.equal(await missing.api.confirmOrganizationName(), false, 'A missing target must become a hard no-op');
  assert.equal(missing.calls.snapshots.length, 0, 'A missing target must not create history');
  assert.equal(missing.calls.persists, 0, 'A missing target must not write');
  assert.equal(missing.calls.renders, 0, 'A missing target must not render a mutation');
  assert.equal(missing.overlay.classList.contains('hidden'), false, 'A missing target may retain its explanatory form until the user closes it');
  assert.equal(missing.error.textContent, i18n.en['organization.space.unavailable'], 'Missing-target feedback must use object-specific localized copy');
  assert.equal(visible(missing.error), true, 'Missing-target feedback must remain visible');
  assert.equal(missing.input.disabled, true, 'An unavailable target must disable the stale field');
  assert.equal(missing.confirm.disabled, true, 'An unavailable target must disable Rename');
  assert.equal(missing.document.activeElement, missing.cancel, 'An unavailable target must move focus to the safe action');
  assert.equal(missing.calls.toasts.length, 0, 'A missing target must not use a mutation-success toast');
}

async function testAcknowledgedWorkspaceAndSpaceRename() {
  const receipt = deferred();
  const workspace = buildHarness({
    persistNow: () => receipt.promise,
    disconnectOpenerOnRender: true,
  });
  workspace.api.bindOrganizationNameDialog();
  workspace.workspaceGrid.classList.remove('hidden');
  const untouchedDuplicate = plain(workspace.state.workspaces[1]);
  workspace.api.openOrganizationName('workspace', 'ws-a', workspace.opener);
  workspace.setInput('  Focus Lab  ');
  assert.equal(workspace.confirm.disabled, false, 'A changed valid name must enable Rename');
  const pending = workspace.api.confirmOrganizationName();
  assert.equal(workspace.state.workspaces[0].name, 'Focus Lab', 'Confirmation must trim only surrounding whitespace');
  assert.deepEqual(plain(workspace.state.workspaces[1]), untouchedDuplicate, 'A duplicate display name must not redirect the stable-ID mutation');
  assert.equal(workspace.calls.snapshots.length, 1, 'Rename must create one reversible history entry');
  assert.equal(workspace.calls.snapshots[0].label, 'Rename workspace “Research” to “Focus Lab”', 'History must identify both exact names');
  assert.equal(workspace.calls.persists, 1, 'Rename must request one immediate central-writer receipt');
  assert.equal(workspace.overlay.getAttribute('aria-busy'), 'true', 'Pending persistence must be announced');
  assert.equal(workspace.close.disabled, true, 'Icon Close must disable while persistence is pending');
  assert.equal(workspace.cancel.disabled, true, 'Cancel must disable while persistence is pending');
  assert.equal(workspace.confirm.disabled, false, 'Rename must retain one focusable guarded confirmation anchor while pending');
  assert.equal(workspace.confirm.getAttribute('aria-disabled'), 'true', 'Pending Rename must expose its guarded state');
  assert.equal(workspace.document.activeElement, workspace.confirm, 'Pending Rename must keep focus on its guarded primary action');
  assert.equal(workspace.confirm.textContent, i18n.en['organization.renaming'], 'Pending persistence must have explicit feedback');
  assert.equal(workspace.calls.renders, 0, 'A pending receipt must not render the new name as durable');
  assert.equal(workspace.calls.toasts.length, 0, 'A pending receipt must not claim success');
  assert.equal(workspace.overlay.classList.contains('hidden'), false, 'The form must remain visible until acknowledgement');

  workspace.setLocale('zh-TW');
  workspace.api.paintOrganizationNameDialog();
  assert.equal(workspace.title.textContent, i18n['zh-TW']['organization.workspace.renameTitle'], 'Pending workspace title must repaint in zh-TW');
  assert.equal(workspace.label.textContent, i18n['zh-TW']['organization.workspace.nameLabel'], 'Pending workspace label must repaint in zh-TW');
  assert.equal(workspace.confirm.textContent, i18n['zh-TW']['organization.renaming'], 'Pending action must remain pending after locale application');
  assert.equal(workspace.input.value, '  Focus Lab  ', 'Locale application must never replace the user-entered draft while its trimmed value is pending');

  let busyEscapePrevented = false;
  let busyEscapeStopped = false;
  workspace.dispatch('organization-name-overlay', 'keydown', {
    key: 'Escape',
    preventDefault() { busyEscapePrevented = true; },
    stopPropagation() { busyEscapeStopped = true; },
  });
  assert.equal(busyEscapePrevented, true, 'Busy Escape must still be consumed');
  assert.equal(busyEscapeStopped, true, 'Busy Escape must not reach a lower surface');
  assert.equal(workspace.overlay.classList.contains('hidden'), false, 'Busy Escape must not dismiss an in-flight edit');

  workspace.setLocale('en');
  receipt.resolve();
  assert.equal(await pending, true, 'An acknowledged receipt must complete workspace rename');
  assert.equal(workspace.calls.renders, 1, 'Acknowledged rename must render once');
  assert.equal(workspace.calls.grids, 1, 'An open workspace manager must rebuild after acknowledgement');
  assert.equal(workspace.calls.toasts.length, 1, 'Acknowledged rename must announce success once');
  assert.equal(workspace.calls.toasts[0].message, 'Workspace renamed to “Focus Lab”', 'Success must name the committed workspace value');
  assert.equal(workspace.calls.toasts[0].options.undo, 91, 'Success must expose only the exact snapshot action ID');
  assert.equal(workspace.overlay.classList.contains('hidden'), true, 'Acknowledged rename must close the form');
  assert.equal(workspace.document.activeElement, workspace.workspaceCard, 'An open manager must fall back to its rebuilt visible renamed workspace card');

  const space = buildHarness({ locale: 'zh-TW', disconnectOpenerOnRender: true });
  space.api.bindOrganizationNameDialog();
  const untouchedSibling = plain(space.state.workspaces[0].categories[1]);
  const untouchedWorkspace = plain(space.state.workspaces[1]);
  space.api.openOrganizationName('space', 'cat-a', space.opener);
  space.setInput('  深度閱讀  ');
  assert.equal(await space.api.confirmOrganizationName(), true, 'An acknowledged receipt must complete Space rename');
  assert.equal(space.state.workspaces[0].categories[0].name, '深度閱讀', 'Space rename must target the confirmed category ID');
  assert.deepEqual(plain(space.state.workspaces[0].categories[1]), untouchedSibling, 'A duplicate sibling name must remain byte-for-byte unchanged');
  assert.deepEqual(plain(space.state.workspaces[1]), untouchedWorkspace, 'Other workspaces must remain byte-for-byte unchanged');
  assert.equal(space.calls.snapshots[0].label, '空間「Reading」改名為「深度閱讀」', 'zh-TW history must use native Space terminology and exact names');
  assert.equal(space.calls.toasts[0].message, '空間名稱已改為「深度閱讀」', 'zh-TW success must use native completed-action copy');
  assert.equal(space.calls.toasts[0].options.undo, 91, 'Space success must expose the exact action ID');
  assert.equal(space.document.activeElement, space.activeSpaceItem, 'A disconnected Space opener must return to the visible renamed Space');
}

async function testRejectedWriteFailsClosed() {
  const failure = Object.assign(new Error('write rejected'), { code: 'LOCUS_STATE_WRITE_FAILED' });
  const rejected = buildHarness({
    persistNow: async () => { throw failure; },
    simulateRecoveryOnFailure: true,
  });
  rejected.api.bindOrganizationNameDialog();
  rejected.api.openOrganizationName('space', 'cat-a', rejected.opener);
  rejected.setInput('Deep work');
  assert.equal(await rejected.api.confirmOrganizationName(), false, 'A rejected receipt must not complete rename');
  assert.equal(rejected.state.workspaces[0].categories[0].name, 'Deep work', 'The only local copy must remain visible behind fail-closed recovery');
  assert.equal(rejected.calls.snapshots.length, 1, 'Rejected persistence must retain reversible local history');
  assert.equal(rejected.calls.persists, 1, 'Rejected rename must make exactly one write attempt');
  assert.equal(rejected.calls.renders, 0, 'Rejected persistence must not render a durable-success state');
  assert.equal(rejected.calls.toasts.length, 0, 'Rejected persistence must not claim success');
  assert.equal(rejected.overlay.classList.contains('hidden'), false, 'The form must remain present behind recovery');
  assert.equal(rejected.recoveryOverlay.classList.contains('hidden'), false, 'Persistence failure must reveal recovery');
  assert.equal(rejected.recoveryOverlay.inert, false, 'Recovery itself must stay interactive');
  assert.equal(ownerSet(rejected.recoveryOverlay).size, 0, 'Recovery must never receive an inert owner');
  assert.equal(rejected.overlay.inert, true, 'Recovery must own the underlying naming form');
  assert.equal(ownerSet(rejected.overlay).has('recovery'), true, 'The naming form must inherit the recovery owner');
  assert.equal(rejected.app.inert, true, 'The application must remain fail closed');
  assert.equal(ownerSet(rejected.app).has('recovery'), true, 'The application must retain recovery ownership');
  assert.ok(ownerSet(rejected.app).size >= 2, 'Recovery and naming must remain independently owned on the background');
  assert.equal(rejected.overlay.getAttribute('aria-busy'), 'false', 'The form must clear stale busy announcement behind recovery');
  assert.equal(rejected.close.disabled, false, 'Underlying Close must clear busy state even though recovery owns interaction');
  assert.equal(rejected.cancel.disabled, false, 'Underlying Cancel must clear busy state even though recovery owns interaction');
  let recoveryPrevented = false;
  let recoveryStopped = false;
  const recoveryConsumed = rejected.api.handleOrganizationNameGlobalKey({
    key: 'Enter',
    target: rejected.recoveryReload,
    preventDefault() { recoveryPrevented = true; },
    stopImmediatePropagation() { recoveryStopped = true; },
  });
  assert.equal(recoveryConsumed, false, 'An active recovery control must outrank the underlying naming interlock');
  assert.equal(recoveryPrevented, false, 'Naming must preserve native Enter activation on recovery Reload');
  assert.equal(recoveryStopped, false, 'Naming must let the recovery control finish its own keyboard event chain');
}

async function testWorkspaceChipFocusWaitsForHeader() {
  const header = deferred();
  const harness = buildHarness({
    disconnectOpenerOnRender: true,
    renderAllReady: header.promise,
  });
  harness.api.bindOrganizationNameDialog();
  assert.equal(harness.api.openOrganizationName('workspace', 'ws-a', harness.opener), true, 'Workspace-chip timing coverage must open the shared dialog');
  harness.setInput('Field Notes');
  const pending = harness.api.confirmOrganizationName();
  for (let attempt = 0; attempt < 10 && harness.calls.renders === 0; attempt += 1) {
    await Promise.resolve();
  }
  assert.equal(harness.calls.renders, 1, 'Acknowledged persistence must start the shared render');
  assert.equal(harness.overlay.classList.contains('hidden'), false, 'The naming layer must remain open until the asynchronous chip rebuild finishes');
  assert.equal(harness.calls.toasts.length, 0, 'Success must not be announced before the focus target has been rebuilt');
  header.resolve();
  assert.equal(await pending, true, 'Workspace rename must finish after the real header boundary resolves');
  assert.equal(harness.document.activeElement, harness.workspaceChip, 'Focus must land on the rebuilt workspace chip after its asynchronous render');
}

function testFocusKeyboardAndInterlock() {
  const harness = buildHarness();
  harness.api.bindOrganizationNameDialog();
  harness.api.setElementInertOwner(harness.app, 'recovery', true);
  const before = plain(harness.state);
  assert.equal(harness.api.openOrganizationName('space', 'cat-a', harness.opener), true, 'A valid Space must open the naming layer');
  assert.equal(harness.document.activeElement, harness.input, 'Initial focus must enter and select the real name');
  assert.ok(harness.calls.selections > 0, 'Initial focus must select the existing value');
  assert.equal(harness.app.inert, true, 'Opening must make the application background inert');
  assert.equal(ownerSet(harness.app).has('recovery'), true, 'Opening must preserve an older independent owner');
  assert.ok(ownerSet(harness.app).size >= 2, 'Opening must add a naming owner without replacing recovery ownership');
  assert.equal(harness.recoveryOverlay.inert, false, 'The recovery layer must remain exempt from naming inertness');

  harness.dispatch('organization-name-overlay', 'keydown', { key: 'Tab' });
  assert.equal(harness.calls.traps, 1, 'Tab must remain inside the naming dialog');

  let shortcutStopped = false;
  harness.dispatch('organization-name-overlay', 'keydown', {
    key: 'k',
    ctrlKey: true,
    stopPropagation() { shortcutStopped = true; },
  });
  assert.equal(shortcutStopped, true, 'Document shortcuts must stop at the active naming dialog');
  assert.equal(harness.overlay.classList.contains('hidden'), false, 'A blocked shortcut must leave the form open');

  let escapePrevented = false;
  let escapeStopped = false;
  harness.dispatch('organization-name-overlay', 'keydown', {
    key: 'Escape',
    preventDefault() { escapePrevented = true; },
    stopPropagation() { escapeStopped = true; },
  });
  assert.equal(escapePrevented, true, 'Escape must be consumed by the top naming layer');
  assert.equal(escapeStopped, true, 'Escape must not close a lower layer');
  assert.equal(harness.overlay.classList.contains('hidden'), true, 'Escape must close only the naming form');
  assert.deepEqual(plain(harness.state), before, 'Cancellation must not mutate data');
  assert.equal(harness.document.activeElement, harness.opener, 'Cancellation must return focus to the explicit opener');
  assert.deepEqual([...ownerSet(harness.app)], ['recovery'], 'Closing naming must release only its own inert owner');
  assert.equal(harness.app.inert, true, 'The older recovery owner must continue to lock the background');
  assert.equal(harness.calls.locks, 1, 'Opening must lock body scroll once');
  assert.equal(harness.calls.unlocks, 1, 'Escape must release body scroll once');

  assert.equal(harness.api.openOrganizationName('space', 'cat-a', harness.opener), true, 'The form must reopen for outside-target fallback coverage');
  let globalPrevented = false;
  let globalStopped = false;
  const consumed = harness.api.handleOrganizationNameGlobalKey({
    key: 'Escape',
    target: harness.welcomeLayer,
    preventDefault() { globalPrevented = true; },
    stopImmediatePropagation() { globalStopped = true; },
  });
  assert.equal(consumed, true, 'An outside-target key must be owned by the active naming form');
  assert.equal(globalPrevented, true, 'Outside-target Escape must be consumed');
  assert.equal(globalStopped, true, 'Outside-target Escape must not reach lower global handlers');
  assert.equal(harness.overlay.classList.contains('hidden'), true, 'Outside-target Escape must close the top naming form only');

  harness.deleteOverlay.classList.remove('hidden');
  assert.equal(harness.api.openOrganizationName('workspace', 'ws-a', harness.opener), false, 'Naming must refuse an active destructive organization decision');
  harness.deleteOverlay.classList.add('hidden');
  harness.recoveryOverlay.classList.remove('hidden');
  assert.equal(harness.api.openOrganizationName('workspace', 'ws-a', harness.opener), false, 'Naming must refuse active fail-closed recovery');
}

(async () => {
  testStaticDialogAndReachability();
  testLocalizationContract();
  testResponsiveDialogCss();
  await testTargetValidationAndNoOps();
  await testAcknowledgedWorkspaceAndSpaceRename();
  await testRejectedWriteFailsClosed();
  await testWorkspaceChipFocusWaitsForHeader();
  testFocusKeyboardAndInterlock();
  assert.deepEqual(deferredDefects, [], deferredDefects.join('\n'));
  console.log('Organization naming contracts passed: stable IDs, validation, receipts, Undo, focus, localization, and responsive styling.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
