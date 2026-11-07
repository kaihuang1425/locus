'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');

function extractBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker} must remain extractable`);
  return source.slice(start, end);
}

function extractFunction(name) {
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
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`${name} must have a balanced body`);
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

function plain(value) {
  return JSON.parse(JSON.stringify(value));
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
    { filename: 'organization-delete-i18n-extract.js' },
  );
}

const inertOwnerSource = extractFunction('setElementInertOwner');
const inheritedInterlocksSource = extractFunction('inheritActiveBodyInterlocks');
const performUndoSource = extractFunction('performUndo');
const performRedoSource = extractFunction('performRedo');
const applyLocaleSource = extractFunction('applyLocale');
const paletteDomSource = extractFunction('_palEnsureDom');
const openPaletteSource = extractFunction('openCommandPalette');
const bindStaticSource = extractFunction('bindStatic');
const controllerSource = extractBetween('let organizationDeleteCtx = null;', '\n// CRUD');
const i18n = readI18n();

class ClassList {
  constructor(...initial) { this.values = new Set(initial); }
  add(...values) { values.forEach(value => this.values.add(value)); }
  remove(...values) { values.forEach(value => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function makeEmptyState() {
  return {
    activeWsId: 'ws-a',
    workspaces: [
      {
        id: 'ws-a',
        name: 'Research',
        activeCatId: 'cat-a',
        categories: [
          { id: 'cat-a', name: 'Reading', groups: [] },
          { id: 'cat-b', name: 'Later', groups: [] },
        ],
      },
      {
        id: 'ws-b',
        name: 'Personal',
        activeCatId: 'cat-c',
        categories: [{ id: 'cat-c', name: 'Home', groups: [] }],
      },
    ],
  };
}

function ownerSet(element) {
  return new Set(String(element?.dataset?.locusInertOwners || '').split(' ').filter(Boolean));
}

function buildHarness({
  persistNow = async () => undefined,
  simulateRecoveryOnFailure = false,
  disconnectOpenerOnRender = false,
  locale = 'en',
} = {}) {
  const calls = {
    locks: 0,
    unlocks: 0,
    persists: 0,
    snapshots: [],
    renders: 0,
    grids: 0,
    traps: 0,
    toasts: [],
  };
  const listeners = new Map();
  const elements = new Map();
  const bodyChildren = [];
  const document = {
    activeElement: null,
    body: { children: bodyChildren },
    getElementById(id) { return elements.get(id) || null; },
    querySelector(selector) {
      if (selector === '#wsg-close') return elements.get('wsg-close') || null;
      if (selector === '#ws-menu-btn') return elements.get('ws-menu-btn') || null;
      if (selector === '.cat-tab.active') return elements.get('active-cat-tab') || null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.space-item') return [elements.get('active-space-item')].filter(Boolean);
      return [];
    },
  };

  function makeElement(id, classes = [], { bodyChild = false } = {}) {
    const element = {
      id,
      classList: new ClassList(...classes),
      attributes: new Map(),
      dataset: {},
      disabled: false,
      hidden: false,
      inert: false,
      isConnected: true,
      textContent: '',
      onclick: null,
      setAttribute(name, value) { this.attributes.set(name, String(value)); },
      getAttribute(name) { return this.attributes.get(name); },
      contains(target) { return target === this; },
      focus() { if (this.isConnected !== false && !this.inert) document.activeElement = this; },
      addEventListener(type, listener) { listeners.set(`${id}:${type}`, listener); },
    };
    elements.set(id, element);
    if (bodyChild) bodyChildren.push(element);
    return element;
  }

  const app = makeElement('app', [], { bodyChild: true });
  const welcomeLayer = makeElement('welcome', ['hidden'], { bodyChild: true });
  const workspaceGrid = makeElement('ws-grid-overlay', ['hidden'], { bodyChild: true });
  const workspaceList = makeElement('ws-list', ['hidden'], { bodyChild: true });
  const recoveryOverlay = makeElement('state-recovery-overlay', ['hidden'], { bodyChild: true });
  const overlay = makeElement('organization-delete-overlay', ['hidden'], { bodyChild: true });
  makeElement('organization-delete-title');
  makeElement('organization-delete-message');
  const cancel = makeElement('organization-delete-cancel');
  const confirm = makeElement('organization-delete-confirm');
  const gridClose = makeElement('wsg-close');
  const workspaceMenu = makeElement('ws-menu-btn');
  const activeCategoryTab = makeElement('active-cat-tab');
  const activeSpaceItem = makeElement('active-space-item');
  activeSpaceItem.className = 'space-item';
  activeSpaceItem.dataset.catId = 'cat-b';
  makeElement('add-ws-btn');
  makeElement('add-cat-btn');
  const opener = makeElement('delete-opener');
  const detachedMenuItem = makeElement('context-menu-item');
  document.activeElement = detachedMenuItem;

  const state = makeEmptyState();
  const openers = new WeakMap();
  let currentLocale = locale;
  let context;

  const State = {
    get() { return state; },
    snapshot(label) {
      calls.snapshots.push({ label, data: plain(state) });
      return 73;
    },
    async persistNow() {
      calls.persists += 1;
      try {
        return await persistNow();
      } catch (error) {
        if (simulateRecoveryOnFailure) {
          recoveryOverlay.classList.remove('hidden');
          for (const element of bodyChildren) {
            if (element === recoveryOverlay) continue;
            context.__organization.setElementInertOwner(element, 'recovery', true);
          }
        }
        throw error;
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
      const dictionary = i18n[currentLocale];
      return String(dictionary[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
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
    },
    async openWsGrid() {
      calls.grids += 1;
      workspaceGrid.classList.remove('hidden');
    },
    toast(message, options) { calls.toasts.push({ message, options }); },
    setTimeout(callback) { callback(); return 1; },
    JSON,
  });

  vm.runInContext(
    `${inertOwnerSource}\n${controllerSource}\n` +
      'globalThis.__organization = {\n' +
      '  setElementInertOwner, organizationDeleteOccupancy, organizationDeleteTarget,\n' +
      '  setOrganizationDeleteInterlock, openOrganizationDelete, confirmOrganizationDelete,\n' +
      '  paintOrganizationDeleteDialog, closeOrganizationDeleteDialog, bindOrganizationDeleteDialog,\n' +
      '  handleOrganizationDeleteGlobalKey,\n' +
      '  context: () => organizationDeleteCtx, busy: () => organizationDeleteBusy,\n' +
      '};',
    context,
    { filename: 'organization-delete-production-contract.js' },
  );

  return {
    api: context.__organization,
    calls,
    listeners,
    document,
    elements,
    state,
    app,
    welcomeLayer,
    workspaceGrid,
    workspaceList,
    recoveryOverlay,
    overlay,
    cancel,
    confirm,
    gridClose,
    workspaceMenu,
    activeCategoryTab,
    activeSpaceItem,
    opener,
    setLocale(value) { currentLocale = value; },
  };
}

function testStaticOrganizationBoundary() {
  for (const id of [
    'organization-delete-overlay',
    'organization-delete-title',
    'organization-delete-message',
    'organization-delete-cancel',
    'organization-delete-confirm',
  ]) {
    const matches = html.match(new RegExp(`\\bid=["']${id}["']`, 'g')) || [];
    assert.equal(matches.length, 1, `Organization deletion id must be unique: ${id}`);
  }
  assert.match(
    html,
    /id="organization-delete-overlay"[^>]*role="alertdialog"[^>]*aria-modal="true"[^>]*aria-labelledby="organization-delete-title"[^>]*aria-describedby="organization-delete-message"[^>]*aria-busy="false"/,
    'The organization decision must be a labelled, described, busy-aware alert dialog',
  );
  assert.match(html, /id="organization-delete-title"[^>]*data-i18n="organization\.workspace\.confirmTitle"/, 'The dialog title needs localized fallback copy');
  assert.match(html, /id="organization-delete-cancel"[^>]*data-i18n="organization\.cancel"/, 'The safe action needs localized fallback copy');
  assert.match(html, /id="organization-delete-confirm"[^>]*data-i18n="organization\.workspace\.delete"/, 'The destructive action needs localized fallback copy');

  assert.equal(controllerSource.includes('confirm('), false, 'Organization deletion must not use native confirm()');
  assert.equal(source.includes('function deleteGroup('), false, 'Group removal must not retain a duplicate Delete controller');
  assert.equal(source.includes('deleteGroup('), false, 'All group removal menus must remain Archive-only');
  const groupActions = extractFunction('groupActionMenuItems');
  assert.ok(groupActions.includes('archiveGroup('), 'the shared Group action model must retain the recoverable Archive action');
  assert.equal(groupActions.includes('deleteGroup('), false, 'the shared Group action model must not expose a duplicate group Delete action');
  for (const name of ['buildGroupCol', 'buildLvGroup']) {
    const implementation = extractFunction(name);
    assert.ok(implementation.includes('groupActionMenuItems('), `${name} must use the shared recoverable Group action model`);
    assert.equal(implementation.includes('deleteGroup('), false, `${name} must not expose a duplicate group Delete action`);
  }

  const entryContracts = [
    ['buildWsChip', /openOrganizationDelete\('workspace', ws\.id, chip\)/],
    ['renderCategoryTabs', /openOrganizationDelete\('space', cat\.id, b\)/],
    // 2026-11: Home is the Today board and no longer renders the Space
    // register, so its card menu is no longer a Space entry point.
    ['renderSpaceNav', /openOrganizationDelete\('space', cat\.id, el\)/],
    ['openWsGrid', /openOrganizationDelete\('workspace', ws\.id, e\.target\.closest\('\.del'\)\)/],
    // 2026-11: the Space page's own Space actions menu.
    ['spaceActionMenuItems', /openOrganizationDelete\('space', cat\.id, opener\)/],
  ];
  for (const [name, expected] of entryContracts) {
    const implementation = extractFunction(name);
    assert.match(implementation, expected, `${name} must route deletion through the shared controller`);
    assert.doesNotMatch(implementation, /\bconfirm\s*\(/, `${name} must not retain a native organization confirmation`);
  }
  const reminderMenu = extractFunction('categoryReminderMenuItem');
  assert.match(reminderMenu, /Array\.isArray\(cat\?\.reminders\) && cat\.reminders\.length > 0/, 'Space reminder recovery must detect an existing record, including a delivered reminder hidden from pending surfaces');
  assert.match(reminderMenu, /tr\(hasReminder \? 'reminder\.editTitle' : 'reminder\.setTitle'\)/, 'The Space reminder action must use localized set/edit copy');
  assert.match(reminderMenu, /openEntityReminderPickerOrReport\([\s\S]*'category',[\s\S]*cat\.id,[\s\S]*hasReminder \? cat\.reminders\[0\]\.id : undefined,[\s\S]*\{ opener \}/, 'The Space menu must reopen the first stable reminder identity, report stale capture failure, and preserve its real opener');
  for (const [name, opener] of [
    ['renderCategoryTabs', 'b'],
    ['renderSpaceNav', 'el'],
  ]) {
    assert.match(extractFunction(name), new RegExp(`categoryReminderMenuItem\\(cat, ${opener}\\)`), `${name} must expose the same stable reminder recovery action with its visible opener`);
  }
  assert.match(css, /\.cat-tabs-wrap\s*\{\s*display:\s*none !important;/, 'The legacy category strip remains hidden, so visible sidebar reminder wiring is required');
  assert.equal((source.match(/openOrganizationDelete\(/g) || []).length, 6, 'Five entry points plus the controller must share one organization path');
  assert.equal((source.match(/state\.workspaces = state\.workspaces\.filter/g) || []).length, 1, 'Workspace mutation must exist only in the shared controller');
  assert.equal((source.match(/info\.ws\.categories = info\.ws\.categories\.filter/g) || []).length, 1, 'Space mutation must exist only in the shared controller');
  assert.match(inheritedInterlocksSource, /setElementInertOwner\(element, 'organization'/, 'Late-mounted body surfaces must inherit an active organization interlock');
  assert.match(inheritedInterlocksSource, /element !== organization && element !== recovery/, 'Late-mounted interlocks must keep both the organization and recovery layers interactive at their own precedence');
  assert.match(paletteDomSource, /document\.body\.appendChild\(ov\);\s*inheritActiveBodyInterlocks\(ov\);/, 'A lazily mounted command palette must inherit an active organization owner');
  assert.match(openPaletteSource, /organization-delete-overlay[\s\S]*return false;/, 'Programmatic command-palette opens must refuse an active organization decision');
  assert.match(bindStaticSource, /if \(handleOrganizationDeleteGlobalKey\(e\)\) return;/, 'The document key handler must route outside-target events through the organization interlock');
  assert.match(extractFunction('handleOrganizationDeleteGlobalKey'), /recoveryActive && recovery\.contains\(event\.target\)[\s\S]*return false;[\s\S]*event\.preventDefault\(\)/, 'The lower delete interlock must not cancel keyboard activation inside fail-closed recovery');
  assert.match(controllerSource, /document\.querySelectorAll\('\.space-item'\)/, 'Space deletion focus fallback must target the visible sidebar, not the hidden category strip');
  assert.doesNotMatch(extractFunction('focusOrganizationDeleteFallback'), /\.cat-tab\.active/, 'Space deletion must not return focus to the hidden legacy category strip');
  assert.match(extractFunction('focusOrganizationDeleteFallback'), /document\.activeElement === target/, 'Focus fallback must verify that a candidate actually received focus');
  assert.match(source, /bindTrashDeleteDialog\(\);\s*bindOrganizationDeleteDialog\(\);/, 'The production initializer must bind the organization dialog');
  assert.match(source, /_escBlockers = \[[^\]]*'organization-delete-overlay'/, 'The organization dialog must remain in the Escape blocker stack');
}

function testLocalizationParity() {
  const enKeys = Object.keys(i18n.en).filter(key => key.startsWith('organization.')).sort();
  const zhKeys = Object.keys(i18n['zh-TW']).filter(key => key.startsWith('organization.')).sort();
  assert.deepEqual(zhKeys, enKeys, 'English and zh-TW must expose exactly the same organization vocabulary');
  const required = [
    'organization.cancel',
    'organization.close',
    'organization.deleting',
    'organization.workspace.confirmTitle',
    'organization.workspace.confirmEmpty',
    'organization.workspace.blockedTitle',
    'organization.workspace.blockedBody',
    'organization.workspace.delete',
    'organization.workspace.deleteHistory',
    'organization.workspace.deleted',
    'organization.space.confirmTitle',
    'organization.space.confirmEmpty',
    'organization.space.blockedTitle',
    'organization.space.blockedBody',
    'organization.space.delete',
    'organization.space.deleteHistory',
    'organization.space.deleted',
  ].sort();
  assert.deepEqual(enKeys.filter(key => required.includes(key)), required, 'The deletion controller must not rely on missing locale keys');
  for (const key of required) {
    assert.ok(i18n.en[key]?.trim(), `English ${key} must not be blank`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `zh-TW ${key} must not be blank`);
  }
  assert.match(i18n.en['organization.workspace.confirmEmpty'], /After deleting, choose Undo on this page before reloading or closing Locus\./, 'English must give the bounded page-level recovery instruction without promising indefinite history');
  assert.match(i18n.en['organization.space.blockedBody'], /Nothing was deleted/, 'English blocked copy must state the no-op outcome');
  assert.match(i18n['zh-TW']['organization.workspace.confirmEmpty'], /先在這個頁面使用「復原」，再重新載入或關閉 Locus/, 'zh-TW must give the bounded page-level recovery instruction');
  assert.match(i18n['zh-TW']['organization.space.blockedBody'], /這次沒有刪除任何內容/, 'zh-TW blocked copy must state the no-op outcome');

  const historyKeys = [
    'history.undid',
    'history.redid',
    'history.undoStale',
    'history.undoPending',
    'history.undoInterrupted',
    'history.undoFailed',
    'history.redoInterrupted',
    'history.redoFailed',
  ];
  for (const key of historyKeys) {
    assert.ok(i18n.en[key]?.trim(), `English ${key} must not be blank`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `zh-TW ${key} must not be blank`);
  }
  assert.match(performUndoSource, /LOCUS_UNDO_STALE:\s*'history\.undoStale'/, 'Action-scoped stale Undo must use localized feedback');
  assert.match(performUndoSource, /toast\(tr\(key\)/, 'Undo failures must not expose internal English error text in zh-TW');
  assert.match(performRedoSource, /'history\.redoInterrupted'/, 'Interrupted Redo must use localized feedback');
  assert.match(applyLocaleSource, /paintOrganizationDeleteDialog\(\);/, 'Changing locale while the organization dialog is open must repaint its variable consequence copy');
  assert.match(controllerSource, /title\.dataset\.i18n = titleKey;/, 'Live title bindings must track blocked and workspace/Space state');
  assert.match(controllerSource, /cancelButton\.dataset\.i18n = cancelKey;/, 'Live safe-action bindings must track Cancel versus Close');
  assert.match(controllerSource, /confirmButton\.dataset\.i18n = confirmKey;/, 'Live destructive bindings must preserve Space and pending labels through locale application');
}

function testLiveLocaleRepaint() {
  const blocked = buildHarness();
  blocked.state.workspaces[0].categories[0].reminders = [{ id: 'delivered', at: 1, notified: true }];
  blocked.api.openOrganizationDelete('space', 'cat-a', blocked.opener);
  blocked.setLocale('zh-TW');
  blocked.api.paintOrganizationDeleteDialog();
  assert.equal(blocked.elements.get('organization-delete-title').textContent, i18n['zh-TW']['organization.space.blockedTitle'], 'A blocked Space title must repaint in zh-TW');
  assert.equal(blocked.cancel.textContent, i18n['zh-TW']['organization.close'], 'A blocked safe action must remain Close after locale reapplication');
  assert.equal(blocked.cancel.dataset.i18n, 'organization.close', 'The blocked safe action must retain the correct live locale key');
  assert.match(blocked.elements.get('organization-delete-message').textContent, /這次沒有刪除任何內容/, 'Variable blocked consequence copy must repaint in zh-TW');

  const empty = buildHarness();
  empty.api.openOrganizationDelete('space', 'cat-a', empty.opener);
  empty.setLocale('zh-TW');
  empty.api.paintOrganizationDeleteDialog();
  assert.equal(empty.elements.get('organization-delete-title').textContent, i18n['zh-TW']['organization.space.confirmTitle'], 'An empty Space title must repaint in zh-TW');
  assert.equal(empty.confirm.textContent, i18n['zh-TW']['organization.space.delete'], 'The destructive action must remain Space-specific after locale reapplication');
  assert.equal(empty.confirm.dataset.i18n, 'organization.space.delete', 'The destructive action must retain the live Space locale key');
  assert.match(empty.elements.get('organization-delete-message').textContent, /Reading/, 'Variable empty-Space copy must retain the real entity name after locale reapplication');
}

function testDialogStyling() {
  assert.match(css, /#modal-overlay,[^\n]*#organization-delete-overlay\s*\{/, 'Organization deletion must reuse the modal scrim language');
  assert.match(css, /\[data-theme-mode="light"\] #modal-overlay,[\s\S]*\[data-theme-mode="light"\] #organization-delete-overlay\s*\{[\s\S]*background:\s*rgba\(20,20,30,0\.3\)/, 'Every light-classified theme must use the calmer shared dialog scrim');
  assert.match(css, /#organization-delete-overlay\.hidden\s*\{/, 'Organization deletion must have a noninteractive hidden state');
  assert.match(css, /#modal, \.rm-panel\s*\{[^}]*width:\s*420px;[^}]*max-width:\s*calc\(100vw - 32px\)/s, 'The shared dialog panel must retain its 420px responsive width');
  assert.match(css, /\.destructive-confirm-panel,\s*\.organization-name-panel\s*\{[^}]*width:\s*min\(420px, calc\(100vw - 32px\)\);[^}]*max-height:\s*calc\(100dvh - 32px\);[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/s, 'The shared organization panels must fit a 720px-high viewport with a bounded scrolling body');
  assert.match(css, /\.destructive-confirm-panel \.modal-bd,\s*\.organization-name-panel \.modal-bd\s*\{\s*overflow-y:\s*auto;\s*\}/, 'Long consequence copy must scroll inside the 720px-height panel');

  const narrow = extractCssRule('@media (max-width: 520px) {', css.indexOf('.destructive-confirm-panel'));
  assert.match(narrow, /\.destructive-confirm-panel \.modal-ft,\s*\.organization-name-panel \.modal-ft\s*\{\s*flex-wrap:\s*wrap;/, '520px layouts must wrap dialog actions');
  assert.match(narrow, /\.destructive-confirm-panel \.modal-ft > button,\s*\.organization-name-panel \.modal-ft > button\s*\{[^}]*flex:\s*1 1 140px;[^}]*justify-content:\s*center;/s, '520px actions must remain large and balanced');

  const forced = extractCssRule('@media (forced-colors: active) {');
  assert.match(forced, /button:focus-visible,[\s\S]*outline:\s*2px solid CanvasText;/, 'Forced colors must preserve visible button focus');
  assert.match(forced, /\.rm-panel,[^}]*\{\s*border:\s*1px solid CanvasText;/, 'Forced colors must preserve the organization dialog boundary');
  assert.match(css, /\.destructive-confirm-button\s*\{[^}]*background:\s*var\(--red\)/s, 'The confirmed destructive action must use the shared red token');
  assert.match(css, /\.destructive-confirm-button\[hidden\]\s*\{\s*display:\s*none;/, 'Blocked scopes must remove the destructive action from layout');
}

async function testPopulatedScopesAreHardNoOps() {
  const workspace = buildHarness();
  workspace.state.workspaces[0].categories[0].reminders = [{ id: 'category-reminder' }];
  workspace.state.workspaces[0].categories[0].groups.push({
    id: 'group-a',
    name: 'Inbox',
    reminders: [{ id: 'group-reminder' }],
    items: [{
      id: 'stack-a',
      type: 'stack',
      items: [{ id: 'tab-a', type: 'tab' }, { id: 'note-a', type: 'note' }],
    }],
  });
  const beforeWorkspace = plain(workspace.state);
  assert.deepEqual(
    plain(workspace.api.organizationDeleteOccupancy(workspace.state.workspaces[0])),
    { groups: 1, items: 3, reminders: 2 },
    'Occupancy must include groups, nested stack containers/children, and entity reminders',
  );
  assert.equal(workspace.api.openOrganizationDelete('workspace', 'ws-a', workspace.opener), true, 'A populated workspace must open an explanatory no-op dialog');
  assert.equal(workspace.api.context().blocked, true, 'The populated workspace must be marked blocked before confirmation');
  assert.equal(workspace.confirm.hidden, true, 'Blocked workspaces must not expose a destructive action');
  assert.equal(workspace.cancel.textContent, i18n.en['organization.close'], 'Blocked workspaces must expose only Close');
  assert.equal(await workspace.api.confirmOrganizationDelete(), false, 'A direct controller call must still reject a populated workspace');
  assert.equal(workspace.calls.snapshots.length, 0, 'Blocked workspace deletion must not create history');
  assert.equal(workspace.calls.persists, 0, 'Blocked workspace deletion must not write');
  assert.equal(workspace.calls.renders, 0, 'Blocked workspace deletion must not render a mutation');
  assert.equal(workspace.calls.toasts.length, 0, 'Blocked workspace deletion must not claim success');
  assert.deepEqual(plain(workspace.state), beforeWorkspace, 'Blocked workspace deletion must preserve every byte of the graph');

  const space = buildHarness();
  space.state.workspaces[0].categories[0].reminders = [{ id: 'reminder-a' }];
  const beforeSpace = plain(space.state);
  assert.equal(space.api.openOrganizationDelete('space', 'cat-a', space.opener), true, 'A populated Space must open an explanatory no-op dialog');
  assert.equal(space.api.context().blocked, true, 'A Space reminder alone must block deletion');
  assert.equal(await space.api.confirmOrganizationDelete(), false, 'A direct controller call must still reject the populated Space');
  assert.equal(space.calls.snapshots.length, 0, 'Blocked Space deletion must not create history');
  assert.equal(space.calls.persists, 0, 'Blocked Space deletion must not write');
  assert.deepEqual(plain(space.state), beforeSpace, 'Blocked Space deletion must preserve every byte of the graph');
}

async function testStableRevalidationAndStaleRefresh() {
  const changed = buildHarness();
  changed.api.openOrganizationDelete('space', 'cat-a', changed.opener);
  changed.state.workspaces[0].categories[0].groups.push({ id: 'late-group', name: 'Late', items: [] });
  assert.equal(await changed.api.confirmOrganizationDelete(), false, 'A changed fingerprint must require a fresh decision');
  assert.equal(changed.calls.snapshots.length, 0, 'Refreshing changed scope must not create history');
  assert.equal(changed.calls.persists, 0, 'Refreshing changed scope must not write');
  assert.equal(changed.state.workspaces[0].categories.some(category => category.id === 'cat-a'), true, 'Refreshing changed scope must not remove the Space');
  assert.equal(changed.api.context().blocked, true, 'The refreshed scope must expose its newly blocked state');
  assert.equal(changed.confirm.hidden, true, 'A newly populated scope must hide the destructive action');
  assert.equal(changed.document.activeElement, changed.cancel, 'Scope refresh must return focus to the safe action');
  assert.equal(await changed.api.confirmOrganizationDelete(), false, 'A second call must remain blocked without mutation');
  assert.equal(changed.calls.snapshots.length, 0, 'Repeated blocked confirmation must remain a no-op');

  const stale = buildHarness();
  stale.api.openOrganizationDelete('space', 'cat-a', stale.opener);
  stale.state.workspaces[0].categories = stale.state.workspaces[0].categories.filter(category => category.id !== 'cat-a');
  assert.equal(await stale.api.confirmOrganizationDelete(), false, 'A missing target ID must close as a no-op');
  assert.equal(stale.calls.snapshots.length, 0, 'A missing target must not create history');
  assert.equal(stale.calls.persists, 0, 'A missing target must not write');
  assert.equal(stale.overlay.classList.contains('hidden'), true, 'A missing target must close the obsolete dialog');

  const lastWorkspace = buildHarness();
  lastWorkspace.api.openOrganizationDelete('workspace', 'ws-a', lastWorkspace.opener);
  lastWorkspace.state.workspaces.splice(1, 1);
  assert.equal(await lastWorkspace.api.confirmOrganizationDelete(), false, 'The last-workspace invariant must be revalidated at confirmation time');
  assert.deepEqual(lastWorkspace.state.workspaces.map(workspace => workspace.id), ['ws-a'], 'The last workspace must remain intact');
  assert.equal(lastWorkspace.calls.snapshots.length, 0, 'Invariant rejection must happen before history');
  assert.equal(lastWorkspace.calls.persists, 0, 'Invariant rejection must happen before persistence');

  const lastSpace = buildHarness();
  lastSpace.api.openOrganizationDelete('space', 'cat-a', lastSpace.opener);
  lastSpace.state.workspaces[0].categories.splice(1, 1);
  assert.equal(await lastSpace.api.confirmOrganizationDelete(), false, 'The last-Space invariant must be revalidated at confirmation time');
  assert.deepEqual(lastSpace.state.workspaces[0].categories.map(category => category.id), ['cat-a'], 'The last Space must remain intact');
  assert.equal(lastSpace.calls.snapshots.length, 0, 'Last-Space rejection must happen before history');
  assert.equal(lastSpace.calls.persists, 0, 'Last-Space rejection must happen before persistence');
}

async function testAcknowledgedEmptyDeletion() {
  const receipt = deferred();
  const workspace = buildHarness({
    persistNow: () => receipt.promise,
    disconnectOpenerOnRender: true,
  });
  workspace.state.workspaces[1].name = workspace.state.workspaces[0].name;
  const expectedSurvivor = plain(workspace.state.workspaces[1]);
  workspace.workspaceGrid.classList.remove('hidden');
  workspace.api.openOrganizationDelete('workspace', 'ws-a', workspace.opener);
  const pending = workspace.api.confirmOrganizationDelete();
  assert.deepEqual(workspace.state.workspaces.map(candidate => candidate.id), ['ws-b'], 'The optimistic mutation must target the confirmed workspace ID, not its duplicate name');
  assert.equal(workspace.calls.snapshots.length, 1, 'Empty workspace deletion must create one reversible history entry');
  assert.equal(workspace.calls.persists, 1, 'Empty workspace deletion must request one immediate receipt');
  assert.equal(workspace.cancel.disabled, true, 'Cancel must disable after persistence begins');
  assert.equal(workspace.confirm.disabled, true, 'Confirm must disable after persistence begins');
  assert.equal(workspace.confirm.textContent, i18n.en['organization.deleting'], 'Pending persistence must have explicit feedback');
  assert.equal(workspace.overlay.getAttribute('aria-busy'), 'true', 'Pending persistence must be announced as busy');
  assert.equal(workspace.calls.renders, 0, 'A pending write must not render deletion as durable');
  assert.equal(workspace.calls.toasts.length, 0, 'A pending write must not claim success');
  assert.equal(workspace.overlay.classList.contains('hidden'), false, 'The dialog must remain open until the receipt arrives');
  workspace.setLocale('zh-TW');
  workspace.api.paintOrganizationDeleteDialog();
  assert.equal(workspace.confirm.textContent, i18n['zh-TW']['organization.deleting'], 'Locale reapplication must preserve the pending action in zh-TW');
  assert.equal(workspace.confirm.dataset.i18n, 'organization.deleting', 'Pending locale application must retain the live busy key');
  workspace.setLocale('en');
  workspace.api.paintOrganizationDeleteDialog();
  let busyEscapePrevented = false;
  let busyEscapeStopped = false;
  workspace.api.bindOrganizationDeleteDialog();
  workspace.listeners.get('organization-delete-overlay:keydown')({
    key: 'Escape',
    preventDefault() { busyEscapePrevented = true; },
    stopPropagation() { busyEscapeStopped = true; },
  });
  assert.equal(busyEscapePrevented, true, 'Escape must still be consumed while persistence is pending');
  assert.equal(busyEscapeStopped, true, 'Busy Escape must not reach a lower surface');
  assert.equal(workspace.overlay.classList.contains('hidden'), false, 'Busy Escape must not dismiss an in-flight decision');
  receipt.resolve();
  assert.equal(await pending, true, 'An acknowledged receipt must complete workspace deletion');
  assert.deepEqual(plain(workspace.state.workspaces[0]), expectedSurvivor, 'The surviving workspace must remain byte-for-byte unchanged');
  assert.equal(workspace.state.activeWsId, 'ws-b', 'Deleting the active workspace must select its surviving sibling');
  assert.equal(workspace.calls.renders, 1, 'Acknowledged deletion must render once');
  assert.equal(workspace.calls.grids, 1, 'An underlying workspace manager must be rebuilt after acknowledgement');
  assert.equal(workspace.calls.toasts.length, 1, 'Acknowledged deletion must announce success once');
  assert.equal(workspace.calls.toasts[0].message, i18n.en['organization.workspace.deleted'], 'Workspace success must be localized');
  assert.equal(workspace.calls.toasts[0].options.undo, 73, 'Workspace success must expose the exact reversible history entry');
  assert.match(workspace.calls.snapshots[0].label, /Research/, 'Undo history must identify the exact workspace');
  assert.equal(workspace.overlay.classList.contains('hidden'), true, 'Acknowledged deletion must close the dialog');
  assert.equal(workspace.document.activeElement, workspace.gridClose, 'A removed workspace opener must fall back inside the rebuilt manager');

  const space = buildHarness({ disconnectOpenerOnRender: true });
  space.state.workspaces[0].categories[1].name = space.state.workspaces[0].categories[0].name;
  const expectedCategory = plain(space.state.workspaces[0].categories[1]);
  const expectedOtherWorkspace = plain(space.state.workspaces[1]);
  space.api.openOrganizationDelete('space', 'cat-a', space.opener);
  assert.equal(await space.api.confirmOrganizationDelete(), true, 'An acknowledged receipt must complete empty Space deletion');
  assert.deepEqual(space.state.workspaces[0].categories.map(category => category.id), ['cat-b'], 'Space deletion must target the confirmed ID, not its duplicate name');
  assert.deepEqual(plain(space.state.workspaces[0].categories[0]), expectedCategory, 'The surviving Space must remain byte-for-byte unchanged');
  assert.deepEqual(plain(space.state.workspaces[1]), expectedOtherWorkspace, 'Other workspaces must remain byte-for-byte unchanged');
  assert.equal(space.state.workspaces[0].activeCatId, 'cat-b', 'Deleting the active Space must select its surviving sibling');
  assert.equal(space.calls.persists, 1, 'Space deletion must request one immediate receipt');
  assert.equal(space.calls.renders, 1, 'Acknowledged Space deletion must render once');
  assert.equal(space.calls.toasts[0].options.undo, 73, 'Space success must expose the exact reversible history entry');
  assert.equal(space.document.activeElement, space.activeSpaceItem, 'A removed Space opener must return focus to the rebuilt visible active Space');
}

async function testRejectedWriteKeepsRecoveryInteractive() {
  const failure = Object.assign(new Error('write rejected'), { code: 'LOCUS_STATE_WRITE_FAILED' });
  const rejected = buildHarness({
    persistNow: async () => { throw failure; },
    simulateRecoveryOnFailure: true,
  });
  rejected.api.openOrganizationDelete('space', 'cat-a', rejected.opener);
  assert.equal(await rejected.api.confirmOrganizationDelete(), false, 'A rejected receipt must not complete deletion');
  assert.equal(rejected.calls.snapshots.length, 1, 'The fail-closed graph must retain its reversible local history');
  assert.equal(rejected.calls.persists, 1, 'The failed deletion must make exactly one write attempt');
  assert.equal(rejected.calls.renders, 0, 'A rejected write must not render the optimistic deletion');
  assert.equal(rejected.calls.toasts.length, 0, 'A rejected write must not claim success');
  assert.equal(rejected.overlay.classList.contains('hidden'), false, 'The organization dialog must remain present behind recovery');
  assert.equal(rejected.overlay.inert, true, 'Recovery must make the organization dialog noninteractive');
  assert.equal(ownerSet(rejected.overlay).has('recovery'), true, 'The organization dialog must inherit the recovery owner');
  assert.equal(rejected.app.inert, true, 'The application must remain fail-closed after rejection');
  assert.deepEqual([...ownerSet(rejected.app)].sort(), ['organization', 'recovery'], 'Independent organization and recovery owners must stack on the background');
  assert.equal(rejected.recoveryOverlay.classList.contains('hidden'), false, 'Persistence rejection must reveal recovery');
  assert.equal(rejected.recoveryOverlay.inert, false, 'Recovery itself must never become inert');
  assert.equal(ownerSet(rejected.recoveryOverlay).size, 0, 'Recovery itself must never receive an inert owner');
  assert.equal(rejected.confirm.disabled, false, 'The underlying dialog must clear busy state even though recovery owns interaction');
  assert.equal(rejected.overlay.getAttribute('aria-busy'), 'false', 'The underlying dialog must clear its busy announcement');
}

function testFocusEscapeAndIndependentInertOwners() {
  const harness = buildHarness();
  harness.api.bindOrganizationDeleteDialog();
  harness.api.setElementInertOwner(harness.app, 'recovery', true);
  const before = plain(harness.state);
  assert.equal(harness.api.openOrganizationDelete('space', 'cat-a', harness.opener), true, 'An empty Space must open the dialog');
  assert.equal(harness.document.activeElement, harness.cancel, 'Cancel must receive initial focus before the destructive action');
  assert.deepEqual([...ownerSet(harness.app)].sort(), ['organization', 'recovery'], 'Opening must add an independent organization inert owner');
  assert.equal(harness.welcomeLayer.inert, true, 'Opening must make the remaining background inert');
  assert.deepEqual([...ownerSet(harness.welcomeLayer)], ['organization'], 'Ordinary background surfaces need only the organization owner');

  const keydown = harness.listeners.get('organization-delete-overlay:keydown');
  let tabPrevented = false;
  keydown({ key: 'Tab', preventDefault() { tabPrevented = true; } });
  assert.equal(harness.calls.traps, 1, 'Tab must remain inside the organization dialog');
  assert.equal(tabPrevented, false, 'The production trap helper, not a parallel handler, must own Tab behavior');

  let shortcutStopped = false;
  keydown({
    key: 'k',
    ctrlKey: true,
    stopPropagation() { shortcutStopped = true; },
  });
  assert.equal(shortcutStopped, true, 'Document-level shortcuts must stop at the active organization dialog');
  assert.equal(harness.overlay.classList.contains('hidden'), false, 'A blocked shortcut must leave the top dialog unchanged');

  let escapePrevented = false;
  let escapeStopped = false;
  keydown({
    key: 'Escape',
    preventDefault() { escapePrevented = true; },
    stopPropagation() { escapeStopped = true; },
  });
  assert.equal(escapePrevented, true, 'Escape must be consumed by the top organization layer');
  assert.equal(escapeStopped, true, 'Escape must not close a lower surface');
  assert.equal(harness.overlay.classList.contains('hidden'), true, 'Escape must close only the organization dialog');
  assert.deepEqual(plain(harness.state), before, 'Escape must not mutate organization state');
  assert.equal(harness.document.activeElement, harness.opener, 'Cancellation must return focus to the explicit opener');
  assert.deepEqual([...ownerSet(harness.app)], ['recovery'], 'Closing organization must preserve an older recovery owner');
  assert.equal(harness.app.inert, true, 'Closing organization must not unlock recovery-owned background');
  assert.equal(ownerSet(harness.welcomeLayer).size, 0, 'Closing organization must release only its own owner');
  assert.equal(harness.welcomeLayer.inert, false, 'A surface with no remaining owner must become interactive');
  assert.equal(harness.calls.locks, 1, 'Opening must lock background scroll once');
  assert.equal(harness.calls.unlocks, 1, 'Escape must release the organization scroll lock once');

  assert.equal(harness.api.openOrganizationDelete('space', 'cat-a', harness.opener), true, 'The dialog must reopen for the global fallback contract');
  let globalPrevented = false;
  let globalStopped = false;
  const consumed = harness.api.handleOrganizationDeleteGlobalKey({
    key: 'Escape',
    target: harness.welcomeLayer,
    preventDefault() { globalPrevented = true; },
    stopImmediatePropagation() { globalStopped = true; },
  });
  assert.equal(consumed, true, 'An outside-target key must be owned by the active organization decision');
  assert.equal(globalPrevented, true, 'Outside-target Escape must be consumed');
  assert.equal(globalStopped, true, 'Outside-target Escape must not reach lower global handlers');
  assert.equal(harness.overlay.classList.contains('hidden'), true, 'Outside-target Escape must close the top organization dialog');
  assert.deepEqual(plain(harness.state), before, 'The outside-target fallback must not mutate organization state');
}

(async () => {
  testStaticOrganizationBoundary();
  testLocalizationParity();
  testLiveLocaleRepaint();
  testDialogStyling();
  await testPopulatedScopesAreHardNoOps();
  await testStableRevalidationAndStaleRefresh();
  await testAcknowledgedEmptyDeletion();
  await testRejectedWriteKeepsRecoveryInteractive();
  testFocusEscapeAndIndependentInertOwners();
  console.log('Organization delete contracts passed: blocking, receipts, recovery stacking, focus, localization, and responsive styling.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
