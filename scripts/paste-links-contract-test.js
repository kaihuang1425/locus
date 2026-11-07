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
  const expression = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = expression.exec(source);
  assert.ok(match, `${name} must exist in production`);
  const start = match.index;
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
      if (depth === 0) {
        return { start, end: index + 1, source: source.slice(start, index + 1) };
      }
    }
  }
  assert.fail(`${name} must have a balanced body`);
}

function extractFunction(name) {
  return extractFunctionRecord(name).source;
}

function extractPasteController() {
  const declaration = /\blet\s+pasteImportCtx\s*=/.exec(source);
  assert.ok(declaration, 'pasteImportCtx must remain an extractable production boundary');
  const start = source.lastIndexOf('\n', declaration.index) + 1;
  const end = extractFunctionRecord('bindPasteImportUI').end;
  return source.slice(start, end);
}

function extractRouter() {
  const start = source.indexOf('const Router = (() => {');
  const end = source.indexOf('\n})();', start);
  assert.ok(start >= 0 && end > start, 'Router must remain extractable');
  return source.slice(start, end + '\n})();'.length);
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
    { filename: 'paste-links-i18n-extract.js' },
  );
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
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

class ClassList {
  constructor(...initial) {
    this.values = new Set(initial);
  }

  add(...values) {
    values.forEach(value => this.values.add(value));
  }

  remove(...values) {
    values.forEach(value => this.values.delete(value));
  }

  contains(value) {
    return this.values.has(value);
  }

  toggle(value, force) {
    const next = force == null ? !this.values.has(value) : !!force;
    if (next) this.values.add(value);
    else this.values.delete(value);
    return next;
  }
}

const i18n = readI18n();
const pasteControllerSource = extractPasteController();

function interpolate(locale, key, vars = {}) {
  const dictionary = i18n[locale] || i18n.en;
  return String(dictionary[key] || i18n.en[key] || key)
    .replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}

function makeState() {
  const groupA = {
    id: 'group-a',
    name: 'Inbox',
    symbol: 'I',
    color: '#6366f1',
    collapsed: false,
    items: [],
  };
  const groupB = {
    id: 'group-b',
    name: 'Reading',
    symbol: 'R',
    color: '#0ea5e9',
    collapsed: false,
    items: [],
  };
  const spaceA = {
    id: 'space-a',
    name: 'Sources',
    groups: [groupA, groupB],
    canvasPositions: { 'reserved-canvas': { x: 1, y: 2 } },
  };
  const spaceB = {
    id: 'space-b',
    name: 'Later',
    groups: [],
  };
  const workspaceA = {
    id: 'workspace-a',
    name: 'Research',
    activeCatId: 'space-a',
    categories: [spaceA, spaceB],
  };
  const workspaceB = {
    id: 'workspace-b',
    name: 'Personal',
    activeCatId: 'space-c',
    categories: [{
      id: 'space-c',
      name: 'Home',
      groups: [{
        id: 'group-c',
        name: 'Home',
        symbol: 'H',
        color: '#22c55e',
        collapsed: false,
        items: [],
      }],
    }],
  };
  return {
    activeWsId: 'workspace-a',
    settings: {
      language: 'en',
      captureLastTarget: {
        workspaceId: 'workspace-a',
        categoryId: 'space-a',
        groupId: 'reserved-remembered',
      },
    },
    archive: [{ id: 'archive-entry', kind: 'group', groupId: 'reserved-envelope' }],
    trash: [],
    columnWidths: { 'reserved-column': 240 },
    workspaces: [workspaceA, workspaceB],
    refs: { workspaceA, workspaceB, spaceA, spaceB, groupA, groupB },
  };
}

function countItems(state) {
  let count = 0;
  for (const workspace of state.workspaces) {
    for (const space of workspace.categories) {
      for (const group of space.groups) count += group.items.length;
    }
  }
  return count;
}

function buildHarness({
  locale = 'en',
  persistNow = async () => ({ ok: true, revision: 1 }),
  recoveryRequired = false,
  actionId = 73,
  uidValues = [],
  state = makeState(),
} = {}) {
  const calls = {
    snapshots: [],
    persists: 0,
    renders: 0,
    toasts: [],
    recoveries: [],
    locks: 0,
    unlocks: 0,
    traps: 0,
    uid: [],
    events: [],
  };
  const listeners = new Map();
  const elements = new Map();
  const bodyChildren = [];
  const overlayChildren = new Set();
  const openers = new WeakMap();

  const document = {
    activeElement: null,
    body: { children: bodyChildren },
    getElementById(id) {
      return elements.get(id) || null;
    },
    createElement(tagName) {
      return makeElement('', [], { tagName });
    },
  };

  function makeElement(id, classes = [], {
    bodyChild = false,
    overlayChild = false,
    tagName = 'DIV',
  } = {}) {
    const element = {
      id,
      tagName: tagName.toUpperCase(),
      classList: new ClassList(...classes),
      dataset: {},
      attributes: new Map(),
      children: [],
      value: '',
      textContent: '',
      placeholder: '',
      disabled: false,
      readOnly: false,
      hidden: false,
      inert: false,
      isConnected: true,
      onclick: null,
      setAttribute(name, value) {
        this.attributes.set(name, String(value));
      },
      getAttribute(name) {
        return this.attributes.get(name);
      },
      removeAttribute(name) {
        this.attributes.delete(name);
      },
      appendChild(child) {
        this.children.push(child);
        if (this.tagName === 'SELECT' && !this.value) this.value = child.value;
        return child;
      },
      replaceChildren(...children) {
        this.children = [...children];
        this.value = children[0]?.value || '';
      },
      contains(target) {
        return target === this || (id === 'paste-overlay' && overlayChildren.has(target));
      },
      focus() {
        if (this.isConnected !== false && !this.inert && !this.disabled) {
          document.activeElement = this;
        }
      },
      addEventListener(type, listener) {
        listeners.set(`${id}:${type}`, listener);
      },
    };
    if (id) elements.set(id, element);
    if (bodyChild) bodyChildren.push(element);
    if (overlayChild) overlayChildren.add(element);
    return element;
  }

  const app = makeElement('app', [], { bodyChild: true });
  const overlay = makeElement('paste-overlay', ['hidden'], { bodyChild: true });
  const recoveryOverlay = makeElement('state-recovery-overlay', ['hidden'], { bodyChild: true });
  const area = makeElement('paste-area', [], { overlayChild: true, tagName: 'TEXTAREA' });
  const destination = makeElement('paste-dest', [], { overlayChild: true, tagName: 'SELECT' });
  const nameField = makeElement('paste-group-name-field', ['hidden'], { overlayChild: true });
  const nameInput = makeElement('paste-group-name', [], { overlayChild: true, tagName: 'INPUT' });
  const preview = makeElement('paste-preview', [], { overlayChild: true });
  const status = makeElement('paste-status', [], { overlayChild: true });
  const spaceContext = makeElement('paste-space-context', [], { overlayChild: true });
  const close = makeElement('paste-x', [], { overlayChild: true, tagName: 'BUTTON' });
  const cancel = makeElement('paste-cancel', [], { overlayChild: true, tagName: 'BUTTON' });
  const confirm = makeElement('paste-go', [], { overlayChild: true, tagName: 'BUTTON' });
  const settingsOpener = makeElement('paste-import-btn', [], { tagName: 'BUTTON' });
  const explicitOpener = makeElement('explicit-paste-opener', [], { tagName: 'BUTTON' });
  for (const id of [
    'reminder-overlay',
    'modal-overlay',
    'import-overlay',
    'organization-name-overlay',
    'organization-delete-overlay',
  ]) {
    makeElement(id, ['hidden'], { bodyChild: true });
  }
  document.activeElement = explicitOpener;

  let currentLocale = locale;
  let currentRecoveryRequired = recoveryRequired;
  let generatedId = 0;
  const queuedIds = [...uidValues];
  let context;

  const State = {
    get() {
      return state;
    },
    isRecoveryRequired() {
      return currentRecoveryRequired;
    },
    requireRecovery() {
      currentRecoveryRequired = true;
    },
    snapshot(label) {
      calls.snapshots.push({ label, data: plain(state) });
      calls.events.push('snapshot');
      return actionId;
    },
    async persistNow() {
      calls.persists += 1;
      calls.events.push('persist-start');
      try {
        const receipt = await persistNow();
        calls.events.push('persist-end');
        return receipt;
      } catch (error) {
        currentRecoveryRequired = true;
        calls.events.push('persist-reject');
        throw error;
      }
    },
  };

  context = vm.createContext({
    document,
    State,
    LocusImportUtils: { collectEntityIds },
    URL,
    Error,
    Object,
    String,
    Set,
    Map,
    WeakMap,
    Date,
    tr(key, vars = {}) {
      return interpolate(currentLocale, key, vars);
    },
    activeWs() {
      return state.workspaces.find(workspace => workspace.id === state.activeWsId) || null;
    },
    activeCat() {
      const workspace = state.workspaces.find(candidate => candidate.id === state.activeWsId);
      return workspace?.categories.find(space => space.id === workspace.activeCatId) || null;
    },
    uid() {
      const id = queuedIds.length ? String(queuedIds.shift()) : `generated-${++generatedId}`;
      calls.uid.push(id);
      return id;
    },
    stampNew(item) {
      if (item && item.createdAt == null) item.createdAt = 1_700_000_000_000;
      return item;
    },
    favUrl(url) {
      return `favicon:${url}`;
    },
    setElementInertOwner: undefined,
    focusDialogOpener(opener) {
      opener?.focus();
    },
    rememberOpener(element) {
      openers.set(element, document.activeElement);
    },
    restoreOpener(element) {
      const opener = openers.get(element);
      openers.delete(element);
      if (!opener || opener.isConnected === false || opener.inert || opener.disabled) return false;
      opener.focus();
      return document.activeElement === opener;
    },
    _overlayOpeners: openers,
    lockBodyScroll() {
      calls.locks += 1;
      calls.events.push('lock');
    },
    unlockBodyScroll() {
      calls.unlocks += 1;
      calls.events.push('unlock');
    },
    trapTabKey() {
      calls.traps += 1;
    },
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
    renderAll() {
      calls.renders += 1;
      calls.events.push('render');
    },
    toast(message, options) {
      calls.toasts.push({ message, options: plain(options) });
      calls.events.push('toast');
    },
    showStateRecoveryRequired(error) {
      calls.recoveries.push(error);
      recoveryOverlay.classList.remove('hidden');
    },
  });

  const dependencies = [
    extractFunction('setElementInertOwner'),
    extractFunction('organizationGroupTarget'),
    extractFunction('identitySpaceTarget'),
    extractFunction('identityGroupTarget'),
    extractFunction('createOrganizationIdAllocator'),
  ].join('\n\n');
  vm.runInContext(
    `${dependencies}\n${pasteControllerSource}\n`
      + 'globalThis.__paste = {\n'
      + '  analyzePastedLinks, parsePastedLinks, pasteImportGroupOptions,\n'
      + '  createPasteImportContext, refreshPasteImportReview, paintPasteImportDialog,\n'
      + '  setPasteImportBusy, setPasteImportInterlock, isPasteImportPending,\n'
      + '  openPasteOverlay, closePasteOverlay, applyPasteImport,\n'
      + '  handlePasteImportGlobalKey, bindPasteImportUI,\n'
      + '  get context() { return pasteImportCtx; },\n'
      + '  get busy() { return pasteImportBusy; },\n'
      + '};',
    context,
    { filename: 'paste-links-production-contract.js' },
  );

  function eventFor(key, target = document.activeElement) {
    return {
      key,
      target,
      defaultPrevented: false,
      propagationStopped: false,
      immediatePropagationStopped: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {
        this.propagationStopped = true;
      },
      stopImmediatePropagation() {
        this.immediatePropagationStopped = true;
      },
    };
  }

  function dispatch(id, type, event = {}) {
    const element = elements.get(id);
    const enriched = event;
    if (!enriched.target) enriched.target = element;
    enriched.currentTarget = element;
    if (!enriched.preventDefault) enriched.preventDefault = () => {};
    if (!enriched.stopPropagation) enriched.stopPropagation = () => {};
    if (!enriched.stopImmediatePropagation) enriched.stopImmediatePropagation = () => {};
    if (type === 'click' && typeof element.onclick === 'function') return element.onclick(enriched);
    const listener = listeners.get(`${id}:${type}`);
    if (listener) return listener(enriched);
    return undefined;
  }

  function setLinks(value) {
    area.value = value;
    context.__paste.paintPasteImportDialog();
  }

  function selectDestination(value) {
    destination.value = value;
    if (context.__paste.context) context.__paste.context.selectedGroupId = value;
    context.__paste.paintPasteImportDialog();
  }

  return {
    api: context.__paste,
    calls,
    state,
    refs: state.refs,
    document,
    elements,
    app,
    overlay,
    recoveryOverlay,
    area,
    destination,
    nameField,
    nameInput,
    preview,
    status,
    spaceContext,
    close,
    cancel,
    confirm,
    settingsOpener,
    explicitOpener,
    eventFor,
    dispatch,
    setLinks,
    selectDestination,
    setLocale(value) {
      currentLocale = value;
    },
    isRecoveryRequired() {
      return currentRecoveryRequired;
    },
  };
}

function testUrlAnalysis() {
  const harness = buildHarness();
  const analysis = plain(harness.api.analyzePastedLinks([
    'https://example.com/a',
    '',
    'ftp://example.com/private',
    'not a URL',
    'http://example.net/',
    'https://example.com/a',
  ].join('\n')));
  assert.deepEqual(analysis, {
    urls: ['https://example.com/a', 'http://example.net/'],
    skipped: 3,
  }, 'Paste links must retain only unique full http/https lines and report every invalid or duplicate nonblank line');
  assert.deepEqual(
    plain(harness.api.parsePastedLinks('chrome://settings\nhttps://valid.test/\nhttps://valid.test/')),
    ['https://valid.test/'],
    'the compatibility parser must expose the same filtered and deduplicated URL list',
  );
}

async function testFrozenDestinationReorderAndReceipt() {
  const receipt = deferred();
  const harness = buildHarness({ persistNow: () => receipt.promise, actionId: 91 });
  assert.equal(harness.api.openPasteOverlay(harness.explicitOpener), true);
  assert.equal(harness.app.inert, true, 'opening Paste links must interlock the app');
  assert.equal(harness.recoveryOverlay.inert, false, 'Paste links must not inert the higher recovery layer');
  assert.equal(harness.document.activeElement, harness.area, 'the reviewed dialog must initially focus the links field');
  harness.setLinks('https://example.com/a\nhttps://developer.mozilla.org/');

  const { workspaceA, workspaceB, spaceA, spaceB, groupA, groupB } = harness.refs;
  spaceA.groups.reverse();
  workspaceA.activeCatId = spaceB.id;
  harness.state.activeWsId = workspaceB.id;

  const pending = harness.api.applyPasteImport();
  assert.equal(harness.api.isPasteImportPending(), true, 'pending state must publish synchronously');
  assert.equal(harness.overlay.classList.contains('hidden'), false);
  assert.equal(harness.close.disabled, true);
  assert.equal(harness.cancel.disabled, true);
  assert.equal(harness.confirm.disabled, true);
  assert.equal(groupA.items.length, 2, 'a sibling reorder and active-view changes must not redirect the frozen exact group');
  assert.equal(groupB.items.length, 0);
  assert.equal(spaceB.groups.length, 0);
  assert.equal(harness.calls.snapshots.length, 1);
  assert.equal(harness.calls.persists, 1);
  assert.equal(harness.calls.renders, 0, 'render must await the authoritative receipt');
  assert.equal(harness.calls.toasts.length, 0, 'success must await the authoritative receipt');
  assert.equal(harness.calls.unlocks, 0, 'close must await the authoritative receipt');
  assert.equal(await harness.api.applyPasteImport(), false, 'a duplicate activation must be rejected while pending');
  assert.equal(harness.api.closePasteOverlay(), false, 'close must be blocked while the write receipt is pending');
  assert.equal(harness.calls.snapshots.length, 1);
  assert.equal(harness.calls.persists, 1);

  receipt.resolve({ ok: true, revision: 22 });
  assert.equal(await pending, true);
  assert.equal(harness.api.isPasteImportPending(), false);
  assert.equal(harness.overlay.classList.contains('hidden'), true);
  assert.equal(harness.app.inert, false);
  assert.equal(harness.document.activeElement, harness.explicitOpener, 'success close must return focus to the exact opener');
  assert.equal(harness.calls.renders, 1);
  assert.deepEqual(harness.calls.toasts, [{
    message: interpolate('en', 'paste.successMany', { count: 2, group: 'Inbox' }),
    options: { undo: 91 },
  }], 'accepted import must expose the exact snapshot action ID for Undo');
  assert.equal(
    harness.calls.snapshots[0].label,
    interpolate('en', 'paste.historyMany', { count: 2, group: 'Inbox' }),
  );
  const eventIndex = name => harness.calls.events.indexOf(name);
  assert.ok(eventIndex('snapshot') < eventIndex('persist-start'));
  assert.ok(eventIndex('persist-start') < eventIndex('persist-end'));
  assert.ok(eventIndex('persist-end') < eventIndex('render'));
  assert.ok(eventIndex('render') < eventIndex('unlock'));
  assert.ok(eventIndex('unlock') < eventIndex('toast'));
}

async function testChangedDestinationsFailBeforeSnapshot() {
  const cases = [
    {
      name: 'missing',
      mutate(harness) {
        harness.refs.spaceA.groups = harness.refs.spaceA.groups.filter(group => group !== harness.refs.groupA);
      },
    },
    {
      name: 'moved',
      mutate(harness) {
        harness.refs.spaceA.groups = harness.refs.spaceA.groups.filter(group => group !== harness.refs.groupA);
        harness.refs.spaceB.groups.push(harness.refs.groupA);
      },
    },
    {
      name: 'duplicate',
      mutate(harness) {
        harness.refs.spaceA.groups.push({
          ...harness.refs.groupA,
          items: [],
        });
      },
    },
    {
      name: 'replaced',
      mutate(harness) {
        const index = harness.refs.spaceA.groups.indexOf(harness.refs.groupA);
        harness.refs.spaceA.groups[index] = {
          ...harness.refs.groupA,
          items: [],
        };
      },
    },
    {
      name: 'renamed',
      mutate(harness) {
        harness.refs.groupA.name = 'Renamed elsewhere';
      },
    },
  ];

  for (const entry of cases) {
    const harness = buildHarness();
    harness.api.openPasteOverlay(harness.explicitOpener);
    harness.setLinks('https://safe.example/');
    const before = countItems(harness.state);
    entry.mutate(harness);
    assert.equal(await harness.api.applyPasteImport(), false, `${entry.name} destination must stop the import`);
    assert.equal(harness.calls.snapshots.length, 0, `${entry.name} destination must stop before snapshot`);
    assert.equal(harness.calls.persists, 0, `${entry.name} destination must stop before persistence`);
    assert.equal(countItems(harness.state), before, `${entry.name} destination must not receive imported items`);
    assert.equal(harness.calls.renders, 0);
    assert.equal(harness.calls.toasts.length, 0);
    assert.equal(harness.overlay.classList.contains('hidden'), false);
    assert.ok(
      [i18n.en['paste.destinationChanged'], i18n.en['paste.destinationUnavailable']]
        .includes(harness.status.textContent),
      `${entry.name} destination must explain that review is required or resolution is unsafe`,
    );
  }
}

async function testEmptySpaceLocalizationAndCollisionAvoidance() {
  const state = makeState();
  state.refs.spaceA.groups = [];
  const harness = buildHarness({
    locale: 'zh-TW',
    state,
    actionId: 118,
    uidValues: [
      'workspace-a',
      'reserved-envelope',
      'reserved-column',
      'reserved-canvas',
      'reserved-remembered',
      'new-group',
      'new-group',
      'new-item-1',
      'new-item-2',
    ],
  });
  harness.api.openPasteOverlay(harness.explicitOpener);
  assert.equal(harness.destination.value, '__new__', 'an empty Space must review a new Group destination');
  assert.equal(harness.nameField.classList.contains('hidden'), false, 'an empty Space must expose the Group name field');
  harness.setLinks('https://one.example/\nhttp://two.example/');
  assert.equal(await harness.api.applyPasteImport(), true);

  assert.equal(state.refs.spaceA.groups.length, 1);
  const group = state.refs.spaceA.groups[0];
  assert.equal(group.name, i18n['zh-TW']['paste.defaultGroupName'], 'blank new-Group input must use the locale-specific fallback');
  assert.equal(group.id, 'new-group');
  assert.deepEqual(plain(group.items.map(item => item.id)), ['new-item-1', 'new-item-2']);
  assert.equal(new Set([group.id, ...group.items.map(item => item.id)]).size, 3);
  assert.ok(harness.calls.uid.includes('workspace-a'), 'allocator must reject an ID already in the graph');
  assert.ok(harness.calls.uid.includes('reserved-envelope'), 'allocator must reject an archived destination hint');
  assert.ok(harness.calls.uid.includes('reserved-column'), 'allocator must reject an organization metadata key');
  assert.ok(harness.calls.uid.includes('reserved-canvas'), 'allocator must reject a canvas position key');
  assert.ok(harness.calls.uid.includes('reserved-remembered'), 'allocator must reject a remembered capture target');
  assert.equal(harness.calls.snapshots.length, 1);
  assert.equal(harness.calls.persists, 1);
  assert.equal(
    harness.calls.snapshots[0].label,
    interpolate('zh-TW', 'paste.historyMany', { count: 2, group: i18n['zh-TW']['paste.defaultGroupName'] }),
  );
  assert.deepEqual(harness.calls.toasts, [{
    message: interpolate('zh-TW', 'paste.successMany', {
      count: 2,
      group: i18n['zh-TW']['paste.defaultGroupName'],
    }),
    options: { undo: 118 },
  }]);
}

async function testNoValidInputAndRecoveryFailures() {
  const noValid = buildHarness();
  noValid.api.openPasteOverlay(noValid.explicitOpener);
  noValid.setLinks('ftp://private.test/\nnot a URL');
  assert.equal(await noValid.api.applyPasteImport(), false);
  assert.equal(noValid.calls.snapshots.length, 0);
  assert.equal(noValid.calls.persists, 0);
  assert.equal(noValid.calls.renders, 0);
  assert.equal(noValid.calls.toasts.length, 0);
  assert.equal(noValid.document.activeElement, noValid.area);
  assert.equal(noValid.area.getAttribute('aria-invalid'), 'true');
  assert.equal(noValid.preview.textContent, i18n.en['paste.noneValid']);

  for (const code of ['LOCUS_STATE_WRITE_FAILED', 'LOCUS_STATE_WRITE_UNKNOWN']) {
    const failure = Object.assign(new Error(code), { code });
    const harness = buildHarness({
      persistNow: async () => {
        throw failure;
      },
    });
    harness.api.openPasteOverlay(harness.explicitOpener);
    harness.setLinks('https://receipt.example/');
    assert.equal(await harness.api.applyPasteImport(), false);
    assert.equal(harness.calls.snapshots.length, 1, `${code} occurs after the one history snapshot`);
    assert.equal(harness.calls.persists, 1);
    assert.equal(harness.calls.renders, 0, `${code} must not render a success state`);
    assert.equal(harness.calls.unlocks, 0, `${code} must leave the guarded draft open behind recovery`);
    assert.equal(harness.calls.toasts.length, 0, `${code} must not claim success`);
    assert.equal(harness.overlay.classList.contains('hidden'), false);
    assert.equal(harness.status.textContent, i18n.en['paste.saveFailed']);
    assert.equal(harness.api.context.unavailable, true);
    assert.deepEqual(harness.calls.recoveries, [failure]);
  }

  const preExisting = buildHarness({ recoveryRequired: true });
  preExisting.api.openPasteOverlay(preExisting.explicitOpener);
  preExisting.setLinks('https://blocked.example/');
  const before = countItems(preExisting.state);
  assert.equal(await preExisting.api.applyPasteImport(), false);
  assert.equal(preExisting.calls.snapshots.length, 0, 'pre-existing recovery must block before snapshot');
  assert.equal(preExisting.calls.persists, 0, 'pre-existing recovery must block before a new write');
  assert.equal(countItems(preExisting.state), before, 'pre-existing recovery must block before mutation');
  assert.equal(preExisting.calls.renders, 0);
  assert.equal(preExisting.calls.toasts.length, 0);
  assert.equal(preExisting.calls.recoveries.length, 1);
  assert.equal(preExisting.calls.recoveries[0].code, 'LOCUS_STATE_RECOVERY_REQUIRED');
}

function testFocusEscapeAndInterlock() {
  const idle = buildHarness();
  idle.api.bindPasteImportUI();
  idle.api.openPasteOverlay(idle.explicitOpener);
  const tab = idle.eventFor('Tab', idle.area);
  idle.dispatch('paste-overlay', 'keydown', tab);
  assert.equal(idle.calls.traps, 1, 'Tab must stay in the dialog focus trap');
  const escape = idle.eventFor('Escape', idle.area);
  idle.dispatch('paste-overlay', 'keydown', escape);
  assert.equal(escape.defaultPrevented, true);
  assert.equal(escape.propagationStopped, true);
  assert.equal(idle.overlay.classList.contains('hidden'), true);
  assert.equal(idle.document.activeElement, idle.explicitOpener, 'idle Escape must restore the exact opener');

  const outside = buildHarness();
  outside.api.openPasteOverlay(outside.explicitOpener);
  const outsideEscape = outside.eventFor('Escape', outside.app);
  assert.equal(outside.api.handlePasteImportGlobalKey(outsideEscape), true);
  assert.equal(outsideEscape.defaultPrevented, true);
  assert.equal(outsideEscape.immediatePropagationStopped, true);
  assert.equal(outside.overlay.classList.contains('hidden'), true);

  const recoveryTop = buildHarness();
  recoveryTop.api.openPasteOverlay(recoveryTop.explicitOpener);
  recoveryTop.recoveryOverlay.classList.remove('hidden');
  const recoveryEvent = recoveryTop.eventFor('Escape', recoveryTop.recoveryOverlay);
  assert.equal(
    recoveryTop.api.handlePasteImportGlobalKey(recoveryEvent),
    false,
    'the higher recovery dialog must retain keyboard ownership above Paste links',
  );
  assert.equal(recoveryTop.overlay.classList.contains('hidden'), false);
}

function testStaticDialogContracts() {
  const apply = extractFunction('applyPasteImport');
  const close = extractFunction('closePasteOverlay');
  const binding = extractFunction('bindPasteImportUI');
  const globalKey = extractFunction('handlePasteImportGlobalKey');
  const locale = extractFunction('applyLocale');
  const interlocks = extractFunction('inheritActiveBodyInterlocks');
  const router = extractRouter();

  assert.equal((apply.match(/State\.snapshot\(/g) || []).length, 1, 'Paste links must own exactly one history snapshot');
  assert.equal((apply.match(/State\.persistNow\(/g) || []).length, 1, 'Paste links must await exactly one authoritative write');
  assert.match(apply, /setPasteImportBusy\(true\)[\s\S]*State\.snapshot\([\s\S]*await State\.persistNow\(\)[\s\S]*renderAll\(\)[\s\S]*closePasteOverlay\(\)[\s\S]*toast\(/);
  assert.match(apply, /State\.isRecoveryRequired\?\.\(\)[\s\S]*return false;[\s\S]*pasteImportTarget\(\)/,
    'pre-existing recovery must stop before destination resolution and mutation');
  assert.doesNotMatch(apply, /\bState\.persist\(/, 'Paste links must not start a fire-and-forget write');
  assert.match(close, /pasteImportBusy\) return false/, 'all close paths must honor the pending receipt');
  assert.match(binding, /pasteImportBusy[\s\S]*event\.key === 'Tab'[\s\S]*trapTabKey\(event, overlay\)/);
  assert.match(binding, /event\.key === 'Escape'[\s\S]*closePasteOverlay\(\)/);
  assert.match(globalKey, /state-recovery-overlay[\s\S]*recovery\.contains\(event\.target\)[\s\S]*return false/);
  assert.match(globalKey, /stopImmediatePropagation\(\)[\s\S]*event\.key === 'Escape'[\s\S]*closePasteOverlay\(\)/);
  assert.match(locale, /paste-overlay[\s\S]*paintPasteImportDialog\(\)/, 'a live locale change must repaint dynamic Paste links copy');
  assert.match(interlocks, /paste-overlay[\s\S]*'paste-import'/, 'lazy body surfaces must inherit the Paste links interlock');
  assert.match(source, /if \(handlePasteImportGlobalKey\(e\)\) return;[\s\S]*if \(handleReminderGlobalKey\(e\)\) return;/,
    'Paste links must own global keys before lower modal and app shortcuts');
  assert.match(source, /higherLayerIds = \[[^\]]*'state-recovery-overlay','paste-overlay'/,
    'Paste links must sit below recovery and above base launch-layer Escape');
  assert.match(source, /_escBlockers = \[[^\]]*'state-recovery-overlay','paste-overlay'/,
    'one Escape must treat Paste links as a foreground blocker');

  assert.match(router, /handleLocationChange\(\)[\s\S]*pasteOpen[\s\S]*isPasteImportPending\(\)/,
    'browser Back/Forward must observe pending Paste links work');
  assert.match(router, /if \(pasteOpen\)[\s\S]*closePasteOverlay\(\{ restoreFocus: false \}\)/,
    'browser history must discard an idle frozen draft before changing route');
  assert.match(router, /navigate\(route,[\s\S]*paste-overlay[\s\S]*isPasteImportPending\(\)[\s\S]*return false/,
    'programmatic routing must not outlive an open or pending Paste links destination');

  assert.match(html, /id="paste-overlay"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="paste-title"[^>]*aria-describedby="paste-description"/);
  assert.match(html, /<label[^>]*for="paste-area"[^>]*data-i18n="paste\.linksLabel"/);
  assert.match(html, /id="paste-area"[^>]*aria-describedby="paste-preview paste-status"/);
  assert.match(html, /id="paste-preview"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
  assert.match(html, /id="paste-status"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
  assert.match(html, /<select id="paste-dest"[^>]*aria-describedby="paste-space-context paste-status"/);
  assert.match(html, /id="paste-group-name"[^>]*data-i18n-placeholder="paste\.groupNamePlaceholder"/);
  assert.match(html, /id="paste-x"[^>]*data-i18n-aria-label="paste\.close"/);

  assert.match(css, /#paste-overlay \.paste-panel\s*\{[\s\S]*max-height:\s*calc\(100dvh - 32px\)[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto[\s\S]*overflow:\s*hidden/);
  assert.match(css, /#paste-overlay \.modal-bd\s*\{\s*overflow-y:\s*auto;\s*\}/);
  assert.match(css, /#paste-area:focus,[\s\S]*#paste-group-name:focus[\s\S]*box-shadow:\s*0 0 0 3px var\(--accent-bg\)/);
  assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*\.paste-actions\s*\{\s*grid-template-columns:\s*1fr;\s*\}[\s\S]*#paste-overlay \.modal-ft button/);
  assert.doesNotMatch(pasteControllerSource, /(?:alert|confirm|prompt)\s*\(/,
    'the core Paste links path must not regress to a native blocking dialog');
}

function testLocalizedCopyContracts() {
  const keys = [
    'paste.title',
    'paste.close',
    'paste.description',
    'paste.linksLabel',
    'paste.linksPlaceholder',
    'paste.location',
    'paste.addTo',
    'paste.newGroup',
    'paste.groupName',
    'paste.groupNamePlaceholder',
    'paste.cancel',
    'paste.importOne',
    'paste.importMany',
    'paste.importing',
    'paste.ready',
    'paste.readySkipped',
    'paste.noneValid',
    'paste.destinationChanged',
    'paste.spaceUnavailable',
    'paste.destinationUnavailable',
    'paste.prepareFailed',
    'paste.saveFailed',
    'paste.defaultGroupName',
    'paste.historyOne',
    'paste.historyMany',
    'paste.successOne',
    'paste.successMany',
    'paste.duplicateGroup',
  ];
  for (const key of keys) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  for (const key of ['paste.title', 'paste.description', 'paste.addTo', 'paste.saveFailed', 'paste.successMany']) {
    assert.notEqual(i18n.en[key], i18n['zh-TW'][key], `${key} must have native zh-TW copy`);
  }
  assert.match(i18n['zh-TW']['paste.location'], /工作區.+空間/);
  assert.match(i18n['zh-TW']['paste.noneValid'], /完整.+網址/);
}

(async () => {
  testUrlAnalysis();
  await testFrozenDestinationReorderAndReceipt();
  await testChangedDestinationsFailBeforeSnapshot();
  await testEmptySpaceLocalizationAndCollisionAvoidance();
  await testNoValidInputAndRecoveryFailures();
  testFocusEscapeAndInterlock();
  testStaticDialogContracts();
  testLocalizedCopyContracts();
  console.log('Paste links contracts passed: URL filtering, frozen exact destinations, receipt-gated persistence, recovery, collision-safe IDs, focus/router interlocks, responsive dialog semantics, and en/zh-TW copy.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
