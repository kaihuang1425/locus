'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const LocusImportUtils = require('../import-utils.js');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');

function extractBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker} must be extractable`);
  return source.slice(start, end);
}

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
  const bodyStart = source.indexOf('{', parameterClose + 1);
  assert.ok(bodyStart >= 0, `${name} must have a function body`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = bodyStart; index < source.length; index += 1) {
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
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(declarationStart, index + 1);
    }
  }
  assert.fail(`${name} function body is unterminated`);
}

function extractCssBlock(marker) {
  const start = css.indexOf(marker);
  assert.ok(start >= 0, `${marker} must be extractable from newtab.css`);
  const bodyStart = css.indexOf('{', start);
  assert.ok(bodyStart >= 0, `${marker} must open a CSS block`);
  let depth = 0;
  for (let index = bodyStart; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, index + 1);
    }
  }
  assert.fail(`${marker} CSS block is unterminated`);
}

const captureSettingsSource = extractBetween(
  'const CAPTURE_SETTING_CONTROL_IDS',
  '\nconst APPEARANCE_SETTING_KEYS',
);

function captureSettingsState(overrides = {}) {
  const inbox = { id: 'g-inbox', name: 'Inbox', items: [] };
  const space = { id: 's-focus', name: 'Focus', groups: [inbox] };
  const workspace = { id: 'w-main', name: 'Main', activeCatId: space.id, categories: [space] };
  return {
    activeWsId: workspace.id,
    workspaces: [workspace],
    settings: {
      captureAskEveryTime: true,
      captureRememberLast: true,
      closeTabOnSave: true,
      captureDeduplicate: true,
      captureIncludeTitle: true,
      captureIncludeFavicon: true,
      captureLastTarget: {
        workspaceId: workspace.id,
        categoryId: space.id,
        groupId: inbox.id,
      },
      ...overrides,
    },
  };
}

function buildCaptureSettingsHarness(initialState = captureSettingsState()) {
  let currentState = initialState;
  let recoveryRequired = false;
  let locale = 'en';
  let persistNow = async () => ({ ok: true });
  const calls = { persists: 0, renders: 0, focuses: 0, recoveries: 0, requires: 0 };
  const recoveryErrors = [];
  const context = vm.createContext({
    document: {},
    State: {
      get: () => currentState,
      isRecoveryRequired: () => recoveryRequired,
      requireRecovery: () => {
        calls.requires += 1;
        recoveryRequired = true;
      },
      persistNow: () => {
        calls.persists += 1;
        return persistNow();
      },
    },
    tr: (key, values = {}) => {
      const substitutions = Object.entries(values).map(([name, value]) => `${name}=${value}`).join('|');
      return `${locale}:${key}${substitutions ? `:${substitutions}` : ''}`;
    },
    __renderCaptureSettings: () => { calls.renders += 1; },
    __focusCaptureSettings: () => { calls.focuses += 1; return true; },
    showStateRecoveryRequired: error => {
      calls.recoveries += 1;
      recoveryErrors.push(error || null);
    },
  });
  vm.runInContext(
    `${captureSettingsSource}\n` +
    'renderCaptureSettings = () => globalThis.__renderCaptureSettings();\n' +
    'focusCaptureSettingsPendingControl = () => globalThis.__focusCaptureSettings();\n' +
    'globalThis.settingsPreferencePendingTransaction = () => captureSettingsPending;\n' +
    'globalThis.focusSettingsPreferencePendingControl = () => focusCaptureSettingsPendingControl();\n' +
    'globalThis.__captureSettings = {\n' +
    '  model: captureSettingsContractModel,\n' +
    '  options: captureSettingsDestinationOptions,\n' +
    '  resolve: captureSettingsResolveDestination,\n' +
    '  commit: commitCaptureSettingsChange,\n' +
    '  pending: () => captureSettingsPending,\n' +
    '  status: () => ({ ...captureSettingsStatus }),\n' +
    '};',
    context,
  );
  return {
    api: context.__captureSettings,
    calls,
    recoveryErrors,
    state: () => currentState,
    setState: next => { currentState = next; },
    setLocale: next => { locale = next; },
    setRecovery: next => { recoveryRequired = next; },
    setPersistNow: next => { persistNow = next; },
  };
}

const welcomeSource = extractBetween(
  'function ensureOnboarding(settings) {',
  '\n// BIND STATIC UI',
);

for (const marker of [
  'id="tour-overlay"',
  'id="coach"',
  'class="wc-step',
  'id="wc-name"',
  'id="wc-progress-fill"',
  'id="tog-tips"',
  'id="reset-hints-btn"',
]) {
  assert.equal(html.includes(marker), false, `obsolete onboarding markup must stay removed: ${marker}`);
}
for (const marker of [
  'TOUR_STEPS',
  'WELCOME_STEPS',
  'function wcShow(',
  'function startTour(',
  'function coachMark(',
  'function resetOnboarding(',
  "tr('menu.resetConfirm')",
]) {
  assert.equal(source.includes(marker), false, `obsolete onboarding code must stay removed: ${marker}`);
}
for (const marker of ['.tour-bubble', '.tour-spotlight', '#coach', '.wc-step', '.wc-chip', '.wc-input']) {
  assert.equal(css.includes(marker), false, `obsolete onboarding style must stay removed: ${marker}`);
}
for (const id of [
  'welcome',
  'wc-card',
  'wc-task-title',
  'wc-task-description',
  'wc-candidate',
  'wc-candidate-title',
  'wc-candidate-url',
  'wc-candidate-fav',
  'wc-destination',
  'wc-destination-message',
  'wc-status',
  'wc-empty',
  'wc-error',
  'wc-retry',
  'wc-explore',
  'wc-save-first',
]) {
  const matches = html.match(new RegExp(`\\bid=["']${id}["']`, 'g')) || [];
  assert.equal(matches.length, 1, `active welcome id must occur exactly once: ${id}`);
}
assert.match(css, /@media \(max-width: 520px\)[^{]*\{[^}]*\.wc-card/s, 'welcome must keep its narrow-layout rule');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[^{]*\{[^}]*\.wc-logo \.brand-img, \.wc-card/s, 'welcome motion must remain reduced-motion safe');
assert.match(html, /class="wc-route"[\s\S]*id="wc-candidate"[\s\S]*class="wc-route-line"[\s\S]*id="wc-destination"/,
  'Welcome must present the reviewed tab and exact destination as one filing route');
assert.match(css, /\.wc-route\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+48px\s+minmax\(0,\s*1fr\)/,
  'the wide Welcome sheet must allocate equal source and destination fields around one locator');
assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.wc-route\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  'the Welcome filing route must stack at the required 800 px layout');
assert.match(css, /@media \(forced-colors: active\)[\s\S]*\.wc-route-line/,
  'the Welcome locator must remain visible in forced colors');
assert.ok(source.includes("'welcome.eyebrow': 'First save'"), 'English Welcome must name the single first-save task');
assert.ok(source.includes("'welcome.taskTitle': 'Save one tab. Find it again.'"), 'English Welcome must teach the core loop directly');
assert.ok(source.includes("'welcome.save': 'Save and close tab'"), 'English Welcome must name the source consequence');
assert.ok(source.includes("'welcome.eyebrow': '第一次儲存'"), 'zh-TW Welcome must name the single first-save task naturally');
assert.ok(source.includes("'welcome.taskTitle': '儲存一個分頁，之後找得回來'"), 'zh-TW Welcome must teach the core loop in native Taiwan wording');
assert.ok(source.includes("'welcome.save': '儲存並關閉分頁'"), 'zh-TW Welcome must name the source consequence');
assert.ok(source.includes("'welcome.error': 'Locus couldn’t check your open tabs. Try again, or explore without saving.'"), 'English query failure copy must be localized');
assert.ok(source.includes("'welcome.error': 'Locus 無法讀取開啟中的分頁。請再試一次，或先開始使用。'"), 'zh-TW query failure copy must be localized');
assert.match(welcomeSource, /function welcomeDestinationContext\([\s\S]*createInboxCaptureContext/,
  'Welcome must freeze the exact current Inbox destination it presents');
assert.match(welcomeSource, /function welcomeDestinationStillMatches\([\s\S]*resolveInboxCaptureTarget/,
  'Welcome must re-resolve that exact destination before capture');
assert.match(welcomeSource, /chrome\.tabs\.get\(welcomeCandidate\.tabId\)[\s\S]*capturedTabStillMatches/,
  'Welcome must fresh-read the reviewed source tab before capture');
assert.match(welcomeSource, /welcomeSavePending[\s\S]*aria-busy/,
  'Welcome must expose and interlock its pending Save');
assert.match(source, /const drawer = document\.getElementById\('settings-drawer'\);[\s\S]{0,180}restoreOpener\(drawer\);[\s\S]{0,100}openWelcome/, 'settings replay must restore a visible opener before welcome opens');

const sidebarToggleSource = extractFunction('updateSidebarToggleLabel');
const railToggleSource = extractFunction('updateRailToggleLabel');
const viewModeButtonSource = extractFunction('updateViewModeButton');
const secondaryNavigationSource = extractFunction('secondaryNavigationItems');
const utf8StringByteLengthSource = extractFunction('utf8StringByteLength');
const serializedUtf8SizeSource = extractFunction('serializedUtf8Size');
const storageBreakdownModelSource = extractFunction('storageBreakdownModel');
const paintSettingsStorageUsageSource = extractFunction('paintSettingsStorageUsage');
const refreshStorageUsageSource = extractFunction('refreshStorageUsage');
const renderStorageSettingsSource = extractFunction('renderStorageSettings');
const topbarContextPresentationSource = extractFunction('topbarContextPresentation');
const renderTopbarContextSource = extractFunction('renderTopbarContext');
const renderHeaderSource = extractFunction('renderHeader');
const renderBoardShellSource = extractFunction('renderBoard');

const primaryNavStart = html.indexOf('<nav id="nav-views"');
const primaryNavEnd = html.indexOf('</nav>', primaryNavStart);
assert.ok(primaryNavStart >= 0 && primaryNavEnd > primaryNavStart,
  'the primary sidebar navigation must remain one landmark');
const primaryNavMarkup = html.slice(primaryNavStart, primaryNavEnd);
let previousPrimaryPosition = -1;
for (const marker of [
  'id="nav-home"',
  'id="nav-inbox"',
  'id="nav-all"',
  'class="side-sec-row"',
  'id="space-nav"',
  'id="nav-more"',
]) {
  const position = primaryNavMarkup.indexOf(marker);
  assert.ok(position > previousPrimaryPosition,
    `the primary rail must keep task order through ${marker}`);
  previousPrimaryPosition = position;
}
for (const marker of ['side-storage', 'side-storage-fill', 'side-storage-text', 'priv-card', 'priv-hd', 'priv-row', 'priv-check']) {
  assert.equal(html.includes(marker), false,
    `Settings-only storage/privacy detail must leave the primary rail: ${marker}`);
  assert.equal(css.includes(`.${marker}`), false,
    `orphaned sidebar storage/privacy styling must be removed: ${marker}`);
}
assert.equal(refreshStorageUsageSource.includes('side-storage'), false,
  'storage refresh must update Settings without a hidden sidebar projection');
assert.match(paintSettingsStorageUsageSource, /storage-bar-fill[\s\S]*storage-bar-meter[\s\S]*storage-bar-text/,
  'storage refresh must retain the named Settings meter through its single painter');
assert.match(html, /data-tab="privacy"[\s\S]*data-tab="storage"/,
  'Settings must retain Privacy and Storage destinations');
assert.match(html, /data-i18n="settings\.privacyFirstBody"/,
  'Settings must retain the local privacy boundary explanation');
assert.ok(html.includes('id="storage-bar-fill"') && html.includes('id="storage-bar-text"'),
  'Settings must retain its storage meter');
assert.match(paintSettingsStorageUsageSource,
  /storage-capacity[\s\S]*storageUsageUnavailable[\s\S]*aria-valuetext[\s\S]*storageStateFull[\s\S]*storageStateWarn/,
  'Settings storage usage must expose loading, unavailable, known, warning, and almost-full states');
assert.match(refreshStorageUsageSource,
  /\+\+_settingsStorageUsageGeneration[\s\S]*generation !== _settingsStorageUsageGeneration/,
  'a late usage read must not overwrite a newer refresh or locale repaint');
assert.match(renderStorageSettingsSource,
  /storageArchiveEmpty[\s\S]*storageBreakdownModel\(state\)[\s\S]*storageEstimateTotal[\s\S]*storageEstimateWithCount/,
  'the Settings renderer must project localized Archive, total, empty, and ranked-row states from one model');
assert.equal(renderStorageSettingsSource.includes('.focus('), false,
  'storage repaint must never move keyboard focus');

const storageModelContext = vm.createContext({});
vm.runInContext([
  utf8StringByteLengthSource,
  serializedUtf8SizeSource,
  storageBreakdownModelSource,
  'globalThis.__storageModel = storageBreakdownModel;',
  'globalThis.__serializedSize = serializedUtf8Size;',
].join('\n'), storageModelContext);
const storageFixture = {
  schema: 12,
  settings: { language: 'zh-TW', profile: { name: '臺灣' } },
  workspaces: [{
    id: 'ws-1', name: '研究', categories: [{
      id: 'space-1', name: '資料', groups: [{
        id: 'group-1', name: 'Inbox', items: [
          { id: 'tab-1', type: 'tab', title: '臺灣資料', url: 'https://example.com' },
          { id: 'note-1', type: 'note', html: '<p>研究筆記</p>' },
          { id: 'todo-1', type: 'todo', text: '完成驗證', done: false },
          { id: 'stack-1', type: 'stack', name: '堆疊', items: [
            { id: 'tab-2', type: 'tab', title: 'Nested', url: 'https://example.org' },
          ] },
        ],
      }],
    }],
  }],
  archive: [{ kind: 'item', data: { id: 'arch-1', type: 'note', html: '封存' } }],
  trash: [{ kind: 'item', data: { id: 'trash-1', type: 'todo', text: '刪除' } }],
};
const storageFixtureBefore = JSON.stringify(storageFixture);
const storageModel = JSON.parse(JSON.stringify(storageModelContext.__storageModel(storageFixture)));
assert.ok(storageModelContext.__serializedSize('資料') > JSON.stringify('資料').length,
  'serialized estimates must count UTF-8 bytes rather than UTF-16 code units');
assert.equal(storageModel.totalBytes, storageModelContext.__serializedSize(storageFixture));
assert.equal(storageModel.hasSavedRecords, true);
assert.deepEqual(storageModel.rows.map(row => row.id).sort(),
  ['archive', 'note', 'stack', 'structure', 'tab', 'todo', 'trash'].sort());
assert.ok(storageModel.rows.every((row, index, rows) => index === 0 || rows[index - 1].bytes >= row.bytes),
  'storage areas must be ranked by the real serialized estimate');
assert.ok(storageModel.rows.every(row => row.percent >= 0 && row.percent <= 100));
assert.equal(storageModel.rows.reduce((total, row) => total + row.bytes, 0), storageModel.totalBytes,
  'ranked estimates must partition the displayed current Locus JSON total exactly');
assert.ok(storageModel.rows.find(row => row.id === 'structure').bytes > 0,
  'Workspace/Space/Group structure and settings must remain visible instead of disappearing from the estimate');
assert.equal(JSON.stringify(storageFixture), storageFixtureBefore,
  'building the storage ledger must not mutate real product state');
const emptyStorageModel = JSON.parse(JSON.stringify(storageModelContext.__storageModel({
  settings: { language: 'en' },
  workspaces: [{ categories: [{ groups: [{ items: [] }] }] }],
  archive: [],
  trash: [],
})));
assert.equal(emptyStorageModel.hasSavedRecords, false);
assert.deepEqual(emptyStorageModel.rows.map(row => row.id), ['structure'],
  'an empty library must honestly retain only its settings/structure estimate');

function storageClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    contains(name) { return values.has(name); },
    toggle(name, force) {
      const next = force === undefined ? !values.has(name) : !!force;
      if (next) values.add(name); else values.delete(name);
      return next;
    },
  };
}
function storageElement(id, classes = []) {
  const attributes = new Map();
  let text = '';
  const element = {
    id,
    dataset: {},
    style: {},
    children: [],
    classList: storageClassList(classes),
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name); },
    removeAttribute(name) { attributes.delete(name); },
    appendChild(child) { element.children.push(child); return child; },
    append(...children) { element.children.push(...children); },
  };
  Object.defineProperty(element, 'textContent', {
    get() { return text; },
    set(value) { text = String(value); if (text === '') element.children.length = 0; },
  });
  return element;
}

const storagePaintElements = new Map();
for (const id of ['storage-capacity', 'storage-bar-fill', 'storage-bar-meter', 'storage-bar-text', 'storage-bar-state', 'storage-refresh']) {
  storagePaintElements.set(id, storageElement(id));
}
let storagePaintLocale = 'en';
const storagePaintCopy = {
  en: {
    'settings.storageUsageLoading': 'Checking browser-profile storage…',
    'settings.storageChecking': 'Checking',
    'settings.storageRefresh': 'Check again',
    'settings.storageUsageUnavailable': 'Exact usage is unavailable right now.',
    'settings.storageStateUnavailable': 'Unavailable',
    'settings.storageUsage': '{used} of {quota} used · {percent}%',
    'settings.storageStateAvailable': 'Space available',
    'settings.storageStateWarn': 'Running low',
    'settings.storageStateFull': 'Almost full',
  },
  zh: {
    'settings.storageUsageLoading': '正在查看瀏覽器設定檔的儲存空間…',
    'settings.storageChecking': '正在查看',
    'settings.storageRefresh': '重新查看',
    'settings.storageUsageUnavailable': '目前無法取得確切用量。',
    'settings.storageStateUnavailable': '無法取得',
    'settings.storageUsage': '已使用 {used} / {quota} · {percent}%',
    'settings.storageStateAvailable': '空間足夠',
    'settings.storageStateWarn': '空間不多',
    'settings.storageStateFull': '即將用完',
  },
};
const storageInterpolate = (template, vars = {}) => String(template).replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
const storagePaintContext = vm.createContext({
  document: { getElementById: id => storagePaintElements.get(id) || null },
  tr: (key, vars) => storageInterpolate(storagePaintCopy[storagePaintLocale][key] || key, vars),
  _formatBytes: value => `${value} B`,
  STORAGE_WARN_PCT: 0.8,
  STORAGE_FULL_PCT: 0.95,
});
vm.runInContext(`${paintSettingsStorageUsageSource}\nglobalThis.__paintStorage = paintSettingsStorageUsage;`, storagePaintContext);
assert.equal(storagePaintContext.__paintStorage(undefined), 'loading');
assert.equal(storagePaintElements.get('storage-bar-meter').getAttribute('aria-busy'), 'true');
assert.equal(storagePaintElements.get('storage-bar-meter').getAttribute('aria-valuenow'), undefined);
assert.equal(storagePaintElements.get('storage-refresh').getAttribute('aria-disabled'), 'true');
assert.equal(storagePaintContext.__paintStorage(null), 'unavailable');
assert.equal(storagePaintElements.get('storage-bar-meter').getAttribute('aria-busy'), 'false');
assert.equal(storagePaintElements.get('storage-bar-meter').getAttribute('aria-valuetext'), 'Exact usage is unavailable right now.');
assert.equal(storagePaintElements.get('storage-refresh').getAttribute('aria-disabled'), 'false');
assert.equal(storagePaintContext.__paintStorage({ used: 50, quota: 100, pct: 0.5 }), 'available');
assert.equal(storagePaintElements.get('storage-bar-fill').style.width, '50%');
assert.equal(storagePaintElements.get('storage-bar-meter').getAttribute('aria-valuenow'), '50');
assert.equal(storagePaintContext.__paintStorage({ used: 85, quota: 100, pct: 0.85 }), 'warn');
assert.equal(storagePaintElements.get('storage-bar-fill').classList.contains('warn'), true);
assert.equal(storagePaintContext.__paintStorage({ used: 110, quota: 100, pct: 1.1 }), 'full');
assert.equal(storagePaintElements.get('storage-bar-fill').style.width, '100%');
assert.equal(storagePaintElements.get('storage-bar-meter').getAttribute('aria-valuenow'), '100');
storagePaintLocale = 'zh';
storagePaintContext.__paintStorage({ used: 50, quota: 100, pct: 0.5 });
assert.equal(storagePaintElements.get('storage-bar-text').textContent, '已使用 50 B / 100 B · 50%',
  'dynamic exact usage must repaint in native zh-TW');

const pendingStorageUsageReads = [];
const storageUsagePaints = [];
const storageRefreshContext = vm.createContext({
  _settingsStorageUsageGeneration: 0,
  _storageWarned: false,
  STORAGE_WARN_PCT: 0.8,
  STORAGE_FULL_PCT: 0.95,
  paintSettingsStorageUsage(usage) { storageUsagePaints.push(usage); },
  storageUsage() { return new Promise(resolve => pendingStorageUsageReads.push(resolve)); },
  toast() {},
  tr: key => key,
});
vm.runInContext(`${refreshStorageUsageSource}\nglobalThis.__refreshStorage = refreshStorageUsage;`, storageRefreshContext);
async function runStorageRefreshChecks() {
  const staleStorageRefresh = storageRefreshContext.__refreshStorage();
  const currentStorageRefresh = storageRefreshContext.__refreshStorage();
  pendingStorageUsageReads[0]({ used: 90, quota: 100, pct: 0.9 });
  assert.equal(await staleStorageRefresh, null);
  pendingStorageUsageReads[1]({ used: 50, quota: 100, pct: 0.5 });
  assert.equal((await currentStorageRefresh).used, 50);
  assert.deepEqual(storageUsagePaints.map(usage => usage?.used ?? null), [null, null, 50],
    'only the newest asynchronous usage receipt may repaint Settings');
}

const storageRenderElements = new Map([
  ['storage-archive-meta', storageElement('storage-archive-meta')],
  ['storage-breakdown', storageElement('storage-breakdown')],
  ['storage-breakdown-total', storageElement('storage-breakdown-total')],
  ['storage-breakdown-empty', storageElement('storage-breakdown-empty', ['hidden'])],
]);
const storageFocusSentinel = { id: 'settings-storage-opener' };
let storageRenderLocale = 'en';
let storageRenderState = storageFixture;
let storageRefreshCalls = 0;
const storageRenderCopy = {
  en: {
    'settings.storageArchiveOne': '1 archived item · about {bytes}',
    'settings.storageArchiveMany': '{count} archived items · about {bytes}',
    'settings.storageArchiveEmpty': 'No archived items yet',
    'settings.storageBreakdownAria': 'Estimated Locus data breakdown',
    'settings.storageEstimateTotal': 'Locus data · about {bytes}',
    'settings.storageEmpty': 'No saved records yet. Only Locus settings and empty structure appear below.',
    'settings.storageTypeLinks': 'Saved links',
    'settings.storageTypeNotes': 'Notes',
    'settings.storageTypeTodos': 'To-dos',
    'settings.storageTypeStacks': 'Stacks',
    'settings.storageTypeStructure': 'Workspace structure & settings',
    'settings.storageItemOne': '1 item',
    'settings.storageItemMany': '{count} items',
    'settings.storageEstimateWithCount': '{count} · about {bytes} · {percent}%',
    'settings.storageEstimateOnly': 'About {bytes} · {percent}%',
    'nav.archive': 'Archive',
    'nav.trash': 'Trash',
  },
  zh: {
    'settings.storageArchiveOne': '1 個封存項目 · 約 {bytes}',
    'settings.storageArchiveMany': '{count} 個封存項目 · 約 {bytes}',
    'settings.storageArchiveEmpty': '目前沒有封存項目',
    'settings.storageBreakdownAria': 'Locus 資料用量估算明細',
    'settings.storageEstimateTotal': 'Locus 資料估計約 {bytes}',
    'settings.storageEmpty': '目前沒有已儲存的項目。下方只會列出 Locus 設定與空白結構。',
    'settings.storageTypeLinks': '已儲存連結',
    'settings.storageTypeNotes': '筆記',
    'settings.storageTypeTodos': '待辦事項',
    'settings.storageTypeStacks': '堆疊',
    'settings.storageTypeStructure': '工作區結構與設定',
    'settings.storageItemOne': '1 項',
    'settings.storageItemMany': '{count} 項',
    'settings.storageEstimateWithCount': '{count} · 約 {bytes} · {percent}%',
    'settings.storageEstimateOnly': '約 {bytes} · {percent}%',
    'nav.archive': '封存',
    'nav.trash': '垃圾桶',
  },
};
const storageRenderContext = vm.createContext({
  State: { get: () => storageRenderState },
  document: {
    activeElement: storageFocusSentinel,
    getElementById: id => storageRenderElements.get(id) || null,
    createElement: () => storageElement('generated'),
  },
  refreshStorageUsage() { storageRefreshCalls++; return Promise.resolve(null); },
  tr: (key, vars) => storageInterpolate(storageRenderCopy[storageRenderLocale][key] || key, vars),
  _formatBytes: value => `${value} B`,
});
vm.runInContext([
  utf8StringByteLengthSource,
  serializedUtf8SizeSource,
  storageBreakdownModelSource,
  renderStorageSettingsSource,
  'globalThis.__renderStorage = renderStorageSettings;',
].join('\n'), storageRenderContext);
const renderedStorageModel = storageRenderContext.__renderStorage();
assert.equal(storageRefreshCalls, 1);
assert.equal(renderedStorageModel.totalBytes, storageModel.totalBytes);
assert.match(storageRenderElements.get('storage-archive-meta').textContent, /^1 archived item · about /);
assert.match(storageRenderElements.get('storage-breakdown-total').textContent, /^Locus data · about /);
assert.equal(storageRenderElements.get('storage-breakdown-empty').classList.contains('hidden'), true);
assert.equal(storageRenderElements.get('storage-breakdown').children.length, storageModel.rows.length);
assert.equal(storageRenderElements.get('storage-breakdown').getAttribute('aria-busy'), 'false');
assert.equal(storageRenderElements.get('storage-breakdown').getAttribute('aria-label'), 'Estimated Locus data breakdown');
assert.equal(storageRenderContext.document.activeElement, storageFocusSentinel);
storageRenderLocale = 'zh';
storageRenderContext.__renderStorage();
assert.match(storageRenderElements.get('storage-archive-meta').textContent, /^1 個封存項目 · 約 /);
assert.equal(storageRenderElements.get('storage-breakdown').getAttribute('aria-label'), 'Locus 資料用量估算明細');
assert.equal(storageRenderElements.get('storage-breakdown').children.some(row => row.children[1]?.textContent === '已儲存連結'), true,
  'the ranked register must repaint its dynamic labels in native zh-TW');
storageRenderLocale = 'en';
storageRenderState = { settings: { language: 'en' }, workspaces: [], archive: [], trash: [] };
storageRenderContext.__renderStorage();
assert.equal(storageRenderElements.get('storage-archive-meta').textContent, 'No archived items yet');
assert.equal(storageRenderElements.get('storage-breakdown-empty').classList.contains('hidden'), false);
assert.deepEqual(storageRenderElements.get('storage-breakdown').children.map(row => row.dataset.storageKind), ['structure']);
assert.equal(storageRenderContext.document.activeElement, storageFocusSentinel,
  'empty and locale repaints must retain the active Settings control');

const topbarStart = html.indexOf('<header id="topbar">');
const topbarEnd = html.indexOf('</header>', topbarStart);
assert.ok(topbarStart >= 0 && topbarEnd > topbarStart, 'the global top bar must remain extractable');
const topbarMarkup = html.slice(topbarStart, topbarEnd);
for (const id of ['ws-title', 'topbar-search', 'topbar-save', 'more-btn']) {
  assert.ok(topbarMarkup.includes(`id="${id}"`), `the global top bar must retain ${id}`);
}
assert.equal((topbarMarkup.match(/id="topbar-search"/g) || []).length, 1,
  'the global top bar must render exactly one Search affordance');
assert.match(topbarMarkup, /id="topbar-save"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/,
  'the reviewed Save action must expose its menu disclosure state');
assert.match(topbarMarkup, /id="more-btn"[^>]*aria-label="More"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/,
  'the one visible overflow must expose a name and disclosure state');
for (const id of ['undo-btn', 'calendar-btn', 'search-btn', 'settings-btn', 'plugins-btn', 'menu-btn']) {
  assert.match(topbarMarkup, new RegExp(`id="${id}"[^>]*\\bhidden\\b[^>]*aria-hidden="true"`),
    `${id} must remain a non-rendered compatibility hook instead of a competing top-bar control`);
}
assert.equal(topbarMarkup.includes('id="view-mode-btn"'), false,
  'the Space layout action must not remain in global chrome');
const surfaceToolbarStart = html.indexOf('<div id="surface-toolbar"');
const boardStart = html.indexOf('<div id="board"', surfaceToolbarStart);
assert.ok(surfaceToolbarStart > topbarEnd && boardStart > surfaceToolbarStart,
  'the board-only surface toolbar must sit between global chrome and board content');
const surfaceToolbarMarkup = html.slice(surfaceToolbarStart, boardStart);
assert.ok(surfaceToolbarMarkup.includes('id="view-mode-btn"'),
  'the existing layout action must move into the board-only surface toolbar');
assert.equal((html.match(/id="view-mode-btn"/g) || []).length, 1,
  'the stable layout action ID must remain unique');
assert.match(css, /body:not\(\[data-surface="board"\]\) #surface-toolbar\s*\{[^}]*display:\s*none/,
  'the layout subtoolbar must be absent outside its board surface');
assert.equal(/#ws-title\s*\{[^}]*display:\s*none/.test(css), false,
  'the current context title must no longer be visually suppressed');
assert.match(css, /#ws-title-name\s*\{[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/,
  'long user-authored context names must stay bounded in the top bar');

const topbarI18n = {
  'nav.home': 'Home',
  'nav.allLinks': 'All Links',
  'nav.favorites': 'Favorites',
  'nav.readLater': 'Read Later',
  'nav.archive': 'Archive',
  'nav.trash': 'Trash',
  'nav.inbox': 'Inbox localized',
  'search.title': 'Find again',
  'cal.title': 'Calendar',
};
const topbarProjectionContext = vm.createContext({
  tr(key) { return topbarI18n[key] || key; },
});
vm.runInContext(
  `${topbarContextPresentationSource}\nglobalThis.__projectTopbar = topbarContextPresentation;`,
  topbarProjectionContext,
  { filename: 'topbar-context-presentation-contract.js' },
);
for (const [candidate, expected] of [
  [{ surface: 'home' }, 'Home'],
  [{ surface: 'search' }, 'Find again'],
  [{ surface: 'calendar' }, 'Calendar'],
  [{ surface: 'library', libraryMode: 'all' }, 'All Links'],
  [{ surface: 'library', libraryMode: 'favorites' }, 'Favorites'],
  [{ surface: 'library', libraryMode: 'read-later' }, 'Read Later'],
  [{ surface: 'library', libraryMode: 'archive' }, 'Archive'],
  [{ surface: 'library', libraryMode: 'trash' }, 'Trash'],
  [{ surface: 'group', group: { name: 'Inbox', symbol: 'I' } }, 'Inbox localized'],
  [{ surface: 'group', group: { name: 'Client research', symbol: 'C' } }, 'Client research'],
  [{ surface: 'board', space: { name: 'Reading', symbol: 'R' } }, 'Reading'],
  [{ surface: 'board', workspace: { name: 'Desk', symbol: 'D' } }, 'Desk'],
  [{ surface: 'board' }, 'Locus'],
]) {
  assert.equal(topbarProjectionContext.__projectTopbar(candidate).label, expected,
    `top-bar context must project ${expected}`);
}

const topbarNodes = new Map([
  ['ws-title', { title: '' }],
  ['ws-title-sym', { textContent: '' }],
  ['ws-title-name', { textContent: '' }],
]);
const renderTopbarContextVm = vm.createContext({
  document: { getElementById(id) { return topbarNodes.get(id) || null; } },
  activeWs: () => ({ name: 'Desk', symbol: 'D' }),
  activeCat: () => ({ name: 'Reading', symbol: 'R' }),
  findGroup: () => null,
  activeSearch: null,
  activeCalendar: null,
  activeGroupPage: null,
  activeLibraryMode: null,
  activeHome: false,
  tr(key) { return topbarI18n[key] || key; },
});
vm.runInContext(
  `${topbarContextPresentationSource}\n${renderTopbarContextSource}\nglobalThis.__renderTopbar = renderTopbarContext;`,
  renderTopbarContextVm,
  { filename: 'topbar-context-render-contract.js' },
);
assert.equal(renderTopbarContextVm.__renderTopbar(), true,
  'the current-context renderer must accept the existing title nodes');
assert.equal(topbarNodes.get('ws-title-sym').textContent, 'R');
assert.equal(topbarNodes.get('ws-title-name').textContent, 'Reading');
assert.equal(topbarNodes.get('ws-title').title, 'Desk › Reading',
  'the title tooltip must retain Workspace context for a bounded visible Space name');
assert.match(renderHeaderSource, /renderTopbarContext\(\)/,
  'full header repaints must refresh the visible context');
assert.match(renderBoardShellSource, /dataset\.surface[\s\S]{0,240}renderTopbarContext\(\)/,
  'surface-only repaints must refresh context after establishing current surface truth');
assert.match(
  html,
  /id="landing-tools"[^>]*\bhidden\b/,
  'the focused landing surface must keep Tools out of its primary focus order',
);
assert.match(
  html,
  /id="landing-reminders"[^>]*\bhidden\b/,
  'the focused landing surface must keep Reminders out of its primary focus order',
);
assert.match(
  secondaryNavigationSource,
  /tr\('action\.calendar'\)[\s\S]*action:\s*openCalendar/,
  'Calendar must remain reachable from More',
);
assert.match(
  secondaryNavigationSource,
  /tr\('action\.plugins'\)[\s\S]*action:\s*\(\) => openToolsHub\(opener\)/,
  'optional Plugins must remain reachable from More with its real focus opener',
);
for (const [label, action] of [
  ['nav.favorites', "openLibrarySurface('favorites')"],
  ['nav.readLater', "openLibrarySurface('read-later')"],
  ['nav.archive', "openLibrarySurface('archive')"],
  ['nav.trash', "openLibrarySurface('trash')"],
  ['action.settings', "openSettingsDrawer('general', opener)"],
]) {
  assert.ok(secondaryNavigationSource.includes(`tr('${label}')`) && secondaryNavigationSource.includes(action),
    `${label} must remain reachable from More`);
}
assert.equal(secondaryNavigationSource.includes("tr('search.nav')"), false,
  'More must not duplicate the one visible global Search affordance');
assert.match(
  html,
  /id="sidebar-toggle"[^>]*aria-controls="sidebar"[^>]*aria-expanded="true"[^>]*data-i18n-aria-label="action\.collapseSidebar"/,
  'the sidebar toggle must declare its controlled region, initial expanded state, and localized accessible name',
);
assert.match(
  html,
  /id="nav-views"[^>]*data-i18n-aria-label="shell\.views"/,
  'the primary navigation region must expose a localized accessible name',
);
assert.match(
  html,
  /id="tabrail-toggle"[^>]*aria-controls="open-tabs"[^>]*aria-expanded="true"[^>]*data-i18n-aria-label="action\.collapseOpenedTabs"/,
  'the opened-tabs toggle must declare its controlled content, initial expanded state, and localized accessible name',
);
assert.match(
  html,
  /id="view-mode-btn"[^>]*data-i18n-title="action\.switchLayout"[^>]*data-i18n-aria-label="action\.switchLayout"/,
  'the Space layout button must expose the existing localized action as both tooltip and accessible name',
);

const savedTabUrlPolicySource = extractFunction('isOpenableSavedTabUrl');
const savedTabHelperSource = [
  savedTabUrlPolicySource,
  extractFunction('copySavedTabUrl'),
  extractFunction('itemFocusTarget'),
  extractFunction('focusItem'),
].join('\n');
const boardKeyboardSource = extractFunction('bindBoardArrowNav');
const buildTabSource = extractFunction('buildTab');
const commonActsSource = extractFunction('commonActs');
const archiveItemSource = extractFunction('archiveItem');
const buildGroupColSource = extractFunction('buildGroupCol');
const buildLvGroupSource = extractFunction('buildLvGroup');
const buildSystemEmptyStateSource = extractFunction('buildSystemEmptyState');
const groupRecordCreationMenuItemsSource = extractFunction('groupRecordCreationMenuItems');
const openGroupRecordCreationMenuSource = extractFunction('openGroupRecordCreationMenu');
const groupActionMenuItemsSource = extractFunction('groupActionMenuItems');
const clearContextMenuExpandedOwnerSource = extractFunction('clearContextMenuExpandedOwner');
const showContextMenuSource = extractFunction('showContextMenu');
const hideContextMenuSource = extractFunction('hideContextMenu');
const showAnchoredContextMenuSource = extractFunction('showAnchoredContextMenu');
const nextKeyboardGroupColumnSizeSource = extractFunction('nextKeyboardGroupColumnSize');
const nextPointerGroupColumnSizeSource = extractFunction('nextPointerGroupColumnSize');
const persistGroupColumnSizeSource = extractFunction('persistGroupColumnSize');
const bindBoardItemContextMenuSource = extractFunction('bindBoardItemContextMenu');
const openBoardRecordDetailSource = extractFunction('openBoardRecordDetail');
const createBoardLocalRecordContextSource = extractFunction('createBoardLocalRecordContext');
const resolveBoardLocalRecordCreateTargetSource = extractFunction('resolveBoardLocalRecordCreateTarget');
const setBoardLocalRecordCreateBusySource = extractFunction('setBoardLocalRecordCreateBusy');
const createBoardLocalRecordSource = extractFunction('createBoardLocalRecord');
const paletteCreateNoteSource = extractFunction('_palCreateNote');
const itemMarkerFocusKeySource = extractFunction('itemMarkerFocusKey');
const applyBoardRecordMarkerSource = extractFunction('applyBoardRecordMarker');
const detailPrimaryEditorSource = extractFunction('detailPrimaryEditor');
const detailItemMarkerPickerSource = extractFunction('detailItemMarkerPicker');
const buildNoteSource = extractFunction('buildNote');
const autoLinkifySource = extractBetween('function autoLinkify(', '\n\nlet boardTodoCompletionMutationPending');
const buildTodoSource = extractFunction('buildTodo');
const createBoardLocalArchiveContextSource = extractFunction('createBoardLocalArchiveContext');
const archiveBoardLocalItemSource = extractFunction('archiveBoardLocalItem');
const archiveBoardLocalItemWithFocusSource = extractFunction('archiveBoardLocalItemWithFocus');
const isBoardTodoCompletionPendingSource = extractFunction('isBoardTodoCompletionPending');
const createBoardTodoCompletionContextSource = extractFunction('createBoardTodoCompletionContext');
const resolveBoardTodoCompletionTargetSource = extractFunction('resolveBoardTodoCompletionTarget');
const setBoardTodoCompletionInterlockSource = extractFunction('setBoardTodoCompletionInterlock');
const setBoardTodoCompletionBusySource = extractFunction('setBoardTodoCompletionBusy');
const toggleTodoCompletionSource = extractFunction('toggleBoardTodoCompletion');
const renderOpenTabsSource = extractFunction('renderOpenTabs');
const toggleOpenTabSelectionSource = extractFunction('toggleOpenTabSelection');
const restoreOpenTabSelectionFocusSource = extractFunction('restoreOpenTabSelectionFocus');
const restoreOpenTabCaptureFocusSource = extractFunction('restoreOpenTabCaptureFocus');
const renderOpenTabRailStateSource = extractFunction('renderOpenTabRailState');
const openTabActionMenuItemsSource = extractFunction('openTabActionMenuItems');
const syncOpenTabRailCaptureControlsSource = extractFunction('syncOpenTabRailCaptureControls');
const updateSelectedBadgeSource = extractFunction('updateSelectedBadge');
const applyFilterSource = extractFunction('applyFilter');
const isOpenTabsRailAvailableSource = extractFunction('isOpenTabsRailAvailable');
const isOpenTabsRailDrawerOpenSource = extractFunction('isOpenTabsRailDrawerOpen');
const setOpenTabsRailCollapsedSource = extractFunction('setOpenTabsRailCollapsed');
const focusOpenTabFilterSource = extractFunction('focusOpenTabFilter');
const handleOpenTabsEscapeSource = extractFunction('handleOpenTabsEscape');
const applyLocaleSource = extractFunction('applyLocale');
const renderGroupPageSource = extractFunction('renderGroupPage');
const restoreDetailFocusSource = extractFunction('restoreItemDetailFocus');

assert.match(
  buildTabSource,
  /(?:el\.tabIndex\s*=\s*-1|el\.setAttribute\(['"]tabindex['"],\s*['"]-1['"]\))/,
  'saved-tab wrappers must leave the sequential focus order',
);
assert.match(
  buildTabSource,
  /<button[^>]*class="[^"]*\bitem-primary\b[^"]*"[^>]*data-item-primary="true"|<button[^>]*data-item-primary="true"[^>]*class="[^"]*\bitem-primary\b[^"]*"/s,
  'each saved tab must expose one native primary button',
);
assert.match(
  buildTabSource,
  /class="board-record-head"[\s\S]*?class="board-record-kind"[\s\S]*?class="board-record-menu"/,
  'saved pages must use the same truthful record header and persistent More hierarchy as local records',
);
assert.match(
  buildTabSource,
  /home\.previewType\.tab[\s\S]*?library\.moreActions[\s\S]*?data-item-archive="menu"[\s\S]*?aria-haspopup="menu"/,
  'saved-page type and More controls must reuse localized, receipt-addressable runtime copy',
);
assert.doesNotMatch(
  buildTabSource,
  /item-acts|item-btn|data-item-archive="direct"|data-act="(?:detail|open|del)"/,
  'saved pages must not retain the tiny hover-only prototype action strip or a direct destructive X',
);
assert.match(
  buildTabSource,
  /aria-disabled=/,
  'the primary saved-tab action must expose its unavailable state',
);
assert.match(
  buildTabSource,
  /isOpenableSavedTabUrl\(/,
  'saved-tab rendering must derive availability from the shared URL guard',
);
assert.match(
  buildTabSource,
  /openSavedTabItem\(/,
  'saved-tab activation must use the shared guarded opener',
);
assert.match(
  buildTabSource,
  /const savedTitle = typeof it\.title === ['"]string['"] \? it\.title\.trim\(\) : ['"]{2};/,
  'saved-tab titles must be trimmed before choosing visible and accessible copy',
);
assert.match(
  buildTabSource,
  /const itemTitle = savedTitle \|\| dispUrl\(savedUrl\) \|\| tr\(['"]itemAction\.untitled['"]\);/,
  'blank or non-string saved-tab titles must fall back to the URL, then localized Untitled',
);
for (const hardcoded of ['title="Details"', 'title="Open in new tab"', 'title="Archive"']) {
  assert.equal(buildTabSource.includes(hardcoded), false, `saved-tab icon action must not retain hardcoded runtime copy: ${hardcoded}`);
}
for (const hardcoded of [
  '<span>Save here</span>',
  'title="Save selected opened tabs or the current tab',
  '<span>Add record</span>',
  'aria-label="Add a record to',
]) {
  assert.equal(
    buildGroupColSource.includes(hardcoded),
    false,
    `Board quick-add controls must not retain hardcoded runtime copy: ${hardcoded}`,
  );
}
for (const key of [
  'groupAction.saveHere',
  'groupAction.saveHereFor',
  'groupAction.addRecord',
  'groupAction.addRecordFor',
]) {
  assert.ok(
    buildGroupColSource.includes(`tr('${key}'`),
    `Board quick-add rendering must use localized copy: ${key}`,
  );
}
const groupFooterStart = buildGroupColSource.indexOf('<div class="gcol-ft">');
const groupFooterEnd = buildGroupColSource.indexOf('<button type="button" class="gcol-resize"', groupFooterStart);
const groupFooterSource = buildGroupColSource.slice(groupFooterStart, groupFooterEnd);
assert.ok(groupFooterStart >= 0 && groupFooterEnd > groupFooterStart, 'the Group footer must remain extractable');
assert.equal(
  (groupFooterSource.match(/<button\b/g) || []).length,
  2,
  'the Group footer must expose exactly one Save control and one contextual Add-record control',
);
assert.match(
  groupFooterSource,
  /class="primary"[^>]*data-act="add-tab"[^>]*groupAction\.saveHereFor[\s\S]*?groupAction\.saveHere/,
  'the dominant Group footer action must name the exact-destination save behavior',
);
assert.match(
  groupFooterSource,
  /class="gcol-add-record"[^>]*data-act="add-record"[^>]*aria-haspopup="menu" aria-expanded="false"[\s\S]*?groupAction\.addRecord/,
  'the only secondary Group footer action must expose one named collapsed record menu',
);
assert.doesNotMatch(
  groupFooterSource,
  /data-act="add-(?:note|todo|stack)"/,
  'Note, To-do, and Stack must not compete with Save as equal footer controls',
);
assert.match(
  buildGroupColSource,
  /const saveHereButton = col\.querySelector\('\[data-act="add-tab"\]'\);[\s\S]*?await addSidebarOrActiveTabToGroup\(g\);[\s\S]*?const addRecordButton = col\.querySelector\('\[data-act="add-record"\]'\);[\s\S]*?openGroupRecordCreationMenu\(g, event\.currentTarget\);/,
  'both visible footer actions must route through their established capture or contextual menu controller',
);
assert.match(
  buildGroupColSource,
  /groupActionMenuItems\(g, opener, \{[\s\S]*?includeRecordCreation:\s*false/,
  'Board More must not duplicate the visible Add-record disclosure',
);
assert.match(
  buildGroupColSource,
  /label:\s*tr\('groupAction\.saveHere'\)[\s\S]*?addSidebarOrActiveTabToGroup\(g\)[\s\S]*?label:\s*tr\('groupAction\.addRecord'\)[\s\S]*?hasPopup:\s*'menu'[\s\S]*?openGroupRecordCreationMenu\(g, opener\)/,
  'an empty Group must lead with Save and keep record types behind the same named menu',
);
assert.match(
  buildSystemEmptyStateSource,
  /if \(action\.hasPopup\)[\s\S]*?aria-haspopup[\s\S]*?aria-expanded[\s\S]*?action\.run\(button\)/,
  'empty-state menu disclosures must expose their popup state and preserve the activating button as opener',
);
assert.match(
  groupRecordCreationMenuItemsSource,
  /identityGroupTarget\(group\?\.id\)[\s\S]*?identity\.group !== group[\s\S]*?createBoardLocalRecord\(identity\.group, 'note', opener\)[\s\S]*?createBoardLocalRecord\(identity\.group, 'todo', opener\)[\s\S]*?openIdentityEditor\('stack', 'create', identityParams, opener\)/,
  'the shared record menu must resolve one exact Group and retain the acknowledged Note, To-do, and Stack creation paths',
);
assert.match(
  openGroupRecordCreationMenuSource,
  /if \(!items\.length\)[\s\S]*?detail\.changed[\s\S]*?focusDialogOpener\(opener\)[\s\S]*?showAnchoredContextMenu\(opener, items, \{[\s\S]*?groupAction\.addRecordFor[\s\S]*?expandedOwner:\s*opener/,
  'an unavailable record destination must fail without writing; a valid one must open a named menu from its real opener',
);
assert.match(
  groupActionMenuItemsSource,
  /options\.includeRecordCreation === false[\s\S]*?groupRecordCreationMenuItems\(identity\.group, opener\)[\s\S]*?recordCreationItems\.length/,
  'List More must reuse the shared contextual record actions while Board can suppress their duplicate copy',
);
assert.doesNotMatch(
  buildGroupColSource,
  /State\.snapshot\(['"]Add (?:note|todo)['"]\)|State\.persist\(\)[\s\S]*?\.note-text|\.todo-text[^\n]*focus/,
  'Board quick-add must not mutate with a delayed write or focus the retired inline editors',
);
assert.match(
  createBoardLocalRecordContextSource,
  /createItemListCaptureContext\(group\.items\)[\s\S]*?resolveItemListCaptureTarget\(destinationContext\)[\s\S]*?target\.group !== group/,
  'local-record creation must freeze one exact active Group item-list destination',
);
assert.match(
  resolveBoardLocalRecordCreateTargetSource,
  /resolveItemListCaptureTarget\(context\?\.destinationContext\)[\s\S]*?target\.group !== context\.groupRef[\s\S]*?String\(target\.group\.id\) !== context\.groupId/,
  'local-record creation must re-resolve the same Group reference and stable ID before mutation',
);
assert.match(
  createBoardLocalRecordSource,
  /createCaptureDestinationReceiptContext\(context\.destinationContext, \[item\]\)[\s\S]*?await State\.persistNow\(\)[\s\S]*?resolveCaptureDestinationReceiptTarget\(receipt\)[\s\S]*?openBoardRecordDetail\(item, primary, type === 'note' \? 'note-body' : 'task'\)/,
  'a new local record must receive one acknowledged destination receipt before its Details editor opens',
);
assert.match(
  setBoardLocalRecordCreateBusySource,
  /opener\.focus[\s\S]*?setBoardLocalRecordCreateInterlock\(opener, true\)[\s\S]*?aria-busy[\s\S]*?aria-disabled/,
  'local-record creation must keep its real opener named and busy while storage owns the action',
);
assert.match(
  paletteCreateNoteSource,
  /createInboxCaptureContext\(workspace, cat\)[\s\S]*?resolveInboxCaptureTarget\(destination\)[\s\S]*?materializeInboxCaptureTarget\(destination\)[\s\S]*?return createBoardLocalRecord\(inbox, 'note', null, \{[\s\S]*?prepend: true,[\s\S]*?revealGroup: true,[\s\S]*?takeSnapshot/,
  'command-palette Note creation must reveal the acknowledged record in its real Group and Details editor',
);
assert.doesNotMatch(
  paletteCreateNoteSource,
  /State\.persist|\.note-text[^\n]*focus|cat\.groups\.unshift/,
  'command-palette Note creation must not retain its delayed write, manual Inbox mutation, or dead inline-focus path',
);
assert.match(
  buildGroupColSource,
  /<button class="gcol-name" type="button" data-act="focus"[\s\S]*?tr\('groupAction\.openAsPage'\)/,
  'the visible Group name must be a native localized route to the focused Group page',
);
assert.doesNotMatch(
  buildGroupColSource,
  /class="gcol-btn focus"/,
  'the Group header must not duplicate its name route with an unlabeled-looking icon shortcut',
);
assert.match(
  buildGroupColSource,
  /const menuButton = col\.querySelector\('\[data-act="more"\]'\);[\s\S]*?const groupMenuItems = opener =>[\s\S]*?bindBoardItemContextMenu\(hd, groupMenuItems, \{ menuButton \}\);/,
  'Group More, pointer context, Context Menu, and Shift+F10 must share the actual-opener menu controller',
);
assert.doesNotMatch(
  buildGroupColSource,
  /hd\.addEventListener\('contextmenu'/,
  'the Group header must not retain the pointer-only context-menu fork',
);
assert.match(
  clearContextMenuExpandedOwnerSource,
  /setAttribute\('aria-expanded', 'false'\)[\s\S]*?_cmExpandedOwner = null/,
  'closing or replacing a contextual menu must collapse its disclosure owner',
);
assert.match(
  showContextMenuSource,
  /clearContextMenuExpandedOwner\(\)[\s\S]*?opts\?\.expandedOwner\?\.isConnected[\s\S]*?setAttribute\('aria-expanded', 'true'\)/,
  'opening a contextual menu must clear the prior disclosure before expanding the new one',
);
assert.match(
  hideContextMenuSource,
  /clearContextMenuExpandedOwner\(\)/,
  'every shared context-menu close path must reset disclosure state',
);
assert.match(
  showAnchoredContextMenuSource,
  /function showAnchoredContextMenu\(anchor, items, opts = \{\}\)[\s\S]*?\{ focusFirst: true, \.\.\.opts \}/,
  'anchored menus must keep first-item focus while accepting the named expanded owner',
);
assert.match(
  css,
  /\.gcol-hd::before\s*\{[^}]*left:\s*0;[^}]*top:\s*0;[^}]*bottom:\s*0;[^}]*width:\s*4px;[^}]*background:\s*var\(--gcol-tint,\s*var\(--accent\)\)/s,
  'each Group register must use its real stored color as a vertical filing locator',
);
assert.doesNotMatch(
  css,
  /BENTO SIGNATURE|bento ["“]compartments|top lacquer|animation:\s*colIn|@keyframes\s+colIn/,
  'the core Group shell must not retain bento, lacquer, or ornamental entrance residue',
);
assert.doesNotMatch(
  css,
  /\.gcol-hd\s*\{[^}]*background:\s*linear-gradient/s,
  'the Group register header must use a flat Field Desk surface',
);
assert.match(
  css,
  /\.gcol-acts\s*\{[^}]*position:\s*static;[^}]*opacity:\s*1;[^}]*pointer-events:\s*auto;[^}]*background:\s*none;/s,
  'Open all and More must remain visible without hover or focus discovery',
);
for (const [selector, label] of [
  ['\\.gcol-sym-wrap', 'symbol'],
  ['\\.gcol-name', 'name route'],
  ['\\.gcol-meta \\.chev', 'collapse'],
  ['\\.gcol-btn', 'header action'],
  ['\\.gcol-ft button', 'quick add'],
]) {
  assert.match(
    css,
    new RegExp(`${selector}\\s*\\{[^}]*?(?:width|min-height|height):\\s*40px`, 's'),
    `the Group ${label} control must expose a 40 px target`,
  );
}
assert.match(
  css,
  /\.gcol\s*\{[^}]*container-type:\s*inline-size;/s,
  'resizable Group registers must expose their own inline-size query boundary',
);
assert.match(
  css,
  /\.gcol-ft\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/s,
  'the Group footer must present one flexible primary action and one content-sized disclosure',
);
assert.match(
  css,
  /\.gcol-ft button\.primary::before\s*\{[^}]*width:\s*3px;[^}]*background:\s*var\(--accent\);/s,
  'Save here must carry the restrained Locus locator instead of generic equal-button styling',
);
assert.match(
  css,
  /@container \(max-width:\s*250px\)\s*\{[\s\S]*?\.gcol-ft\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) 40px;[\s\S]*?\.gcol-add-record span\s*\{[^}]*display:\s*none;/s,
  'a 200 px resized Group must preserve both 40 px controls without clipping their accessible names',
);
assert.match(
  css,
  /@media \(forced-colors:\s*active\)\s*\{[\s\S]*?\.gcol-ft button\.primary::before\s*\{[^}]*background:\s*Highlight;[^}]*forced-color-adjust:\s*none;/s,
  'the Save locator must remain visible in forced-colors mode',
);
assert.match(
  css,
  /@media \(max-width:\s*800px\)\s*\{[\s\S]*?#board:not\(\.list-mode\):not\(\.canvas-mode\) \.gcol\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100%;/s,
  'default Group registers must fill the available Board lane without clipping at 800 px',
);
assert.match(
  css,
  /@media \(forced-colors:\s*active\)\s*\{[\s\S]*?\.gcol-hd::before\s*\{[^}]*background:\s*Highlight;[^}]*forced-color-adjust:\s*none;/s,
  'the Group filing locator must survive forced-colors mode',
);
assert.match(
  source,
  /function groupActionMenuItems\(group, opener, options = \{\}\)/,
  'Board and List Group menus must share one exact-target action model',
);
assert.match(
  buildLvGroupSource,
  /<button class="lv-group-name" type="button" data-act="focus"[\s\S]*?tr\('groupAction\.openAsPage'\)/,
  'the List Group name must be a native localized route to the focused Group page',
);
assert.doesNotMatch(
  buildLvGroupSource,
  /class="lv-act-btn" data-act="focus"/,
  'List must not duplicate the visible Group-name route with a fourth header action',
);
assert.match(
  buildLvGroupSource,
  /itemCnt === 1[\s\S]*?tr\('groupAction\.oneItem'\)[\s\S]*?tr\('groupAction\.items'/,
  'List Group counts must use localized item context instead of a bare number pill',
);
assert.match(
  buildLvGroupSource,
  /tr\('home\.previewType\.todo'\)[\s\S]*?done[\s\S]*?todos\.length/,
  'List to-do progress must carry a localized visible label',
);
assert.match(
  buildLvGroupSource,
  /data-act="add-tab"[\s\S]*?tr\('groupAction\.saveHereFor'[\s\S]*?tr\('groupAction\.saveHere'\)/,
  'List Save here must use the same visible and exact-destination copy as Board',
);
assert.doesNotMatch(
  buildLvGroupSource,
  /Add selected sidebar tabs or the active browser tab/,
  'List must not retain the hardcoded English Add tab tooltip',
);
assert.match(
  buildLvGroupSource,
  /const groupMenuItems = opener => groupActionMenuItems\(g, opener,[\s\S]*?bindBoardItemContextMenu\(hd, groupMenuItems, \{ menuButton \}\);/,
  'List More, pointer context, Context Menu, and Shift+F10 must share the actual-opener Group menu',
);
assert.doesNotMatch(
  buildLvGroupSource,
  /includeRecordCreation:\s*false/,
  'List must retain the shared record creation actions contextually inside More',
);
assert.doesNotMatch(
  buildLvGroupSource,
  /hd\.addEventListener\('contextmenu'|showContextMenu\(/,
  'List must not retain either duplicate or pointer-only Group menu paths',
);
assert.match(
  css,
  /\.lv-group\s*\{[^}]*border:\s*1px solid var\(--border2\);[^}]*background:\s*var\(--panel\);[^}]*overflow:\s*hidden;/s,
  'each List Group must render as one flat Field Desk register',
);
assert.match(
  css,
  /\.lv-group-hd::before\s*\{[^}]*top:\s*0;[^}]*bottom:\s*0;[^}]*width:\s*4px;[^}]*background:\s*var\(--gcol-tint,\s*var\(--accent\)\)/s,
  'List must preserve the real Group color as a full-height filing locator',
);
assert.match(
  css,
  /\.lv-group-acts\s*\{[^}]*opacity:\s*1;/s,
  'List recovery actions must remain visible without hover discovery',
);
for (const [selector, label] of [
  ['\\.lv-group-toggle', 'collapse'],
  ['\\.lv-group-sym', 'symbol'],
  ['\\.lv-group-name', 'name route'],
  ['\\.lv-act-btn', 'header action'],
]) {
  assert.match(
    css,
    new RegExp(`${selector}\\s*\\{[^}]*?(?:width|min-height|height):\\s*40px`, 's'),
    `the List Group ${label} control must expose a 40 px target`,
  );
}
assert.doesNotMatch(
  css,
  /\.lv-group-sym:hover\s*\{[^}]*transform:\s*scale|\.lv-group-hd:hover \.lv-group-acts|\.lv-group-hd:focus-within \.lv-group-acts/,
  'List must not retain ornamental symbol scaling or hover-only actions',
);
assert.match(
  css,
  /@media \(max-width:\s*900px\)\s*\{[\s\S]*?\.lv-group-hd\s*\{[^}]*grid-template-columns:\s*40px 40px minmax\(0,\s*1fr\);/s,
  'List Group actions must move onto a deliberate second line at compact widths',
);
assert.match(
  css,
  /@media \(forced-colors:\s*active\)\s*\{[\s\S]*?\.lv-group-hd::before\s*\{[^}]*background:\s*Highlight;[^}]*forced-color-adjust:\s*none;/s,
  'the List filing locator must survive forced-colors mode',
);
assert.match(
  buildGroupColSource,
  /<button type="button" class="gcol-resize"[^>]*data-resize-mode="width"[^>]*title="\$\{esc\(tr\('groupAction\.resizeWidthHint', \{ name: g\.name \}\)\)\}"[^>]*aria-label="\$\{esc\(tr\('groupAction\.resizeWidth', \{ name: g\.name \}\)\)\}"><\/button>/,
  'the Group width handle must be a localized native button with exact Group context',
);
assert.match(
  buildGroupColSource,
  /<button type="button" class="gcol-resize-corner"[^>]*data-resize-mode="corner"[^>]*title="\$\{esc\(tr\('groupAction\.resizeBothHint', \{ name: g\.name \}\)\)\}"[^>]*aria-label="\$\{esc\(tr\('groupAction\.resizeBoth', \{ name: g\.name \}\)\)\}"><\/button>/,
  'the Group corner handle must be a localized native button with exact Group context',
);
for (const pointerEvent of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
  assert.ok(
    buildGroupColSource.includes(`addEventListener('${pointerEvent}'`),
    `Group resize handles must bind handle-local ${pointerEvent}`,
  );
}
assert.match(
  buildGroupColSource,
  /setPointerCapture\(e\.pointerId\)/,
  'Group pointer resizing must capture the initiating pointer',
);
assert.match(
  buildGroupColSource,
  /releasePointerCapture\(activeResize\.pointerId\)/,
  'Group pointer resizing must release its captured pointer',
);
assert.doesNotMatch(
  buildGroupColSource,
  /document\.addEventListener\(['"]mouse(?:move|up)['"]/,
  'Board renders must not accumulate document-level resize listeners',
);
for (const pointerOnlyResidue of [
  '<div class="gcol-resize"',
  '<div class="gcol-resize-corner"',
  'title="Resize"',
  "addEventListener('mousedown'",
]) {
  assert.equal(
    buildGroupColSource.includes(pointerOnlyResidue),
    false,
    `Group resize controls must not retain pointer-only residue: ${pointerOnlyResidue}`,
  );
}
assert.match(
  buildGroupColSource,
  /nextKeyboardGroupColumnSize\(readVisibleGroupColumnSize\(\), e\.key, mode, e\.shiftKey, window\.innerHeight\)/,
  'both Group resize handles must route Arrow keys through the bounded size helper',
);
assert.match(
  buildGroupColSource,
  /persistGroupColumnSize\(g\.id, readVisibleGroupColumnSize\(\)\)/,
  'Group resize completion must persist the exact visible size through the shared writer',
);
assert.match(
  buildGroupColSource,
  /wasDraggable:\s*col\.draggable[\s\S]*?col\.draggable = false;[\s\S]*?col\.draggable = activeResize\.wasDraggable;/,
  'an active resize must pause and then restore the Group reorder gesture',
);
assert.match(
  css,
  /\.gcol-resize:focus-visible::after\s*\{[^}]*background:\s*var\(--accent\)/s,
  'the width handle must reveal a visible accent indicator without hover',
);
assert.match(
  css,
  /\.gcol \.gcol-resize-corner:focus-visible\s*\{[^}]*opacity:\s*1[^}]*outline:/s,
  'the corner handle must reveal a visible focus indicator without hover',
);
assert.match(
  css,
  /@media \(forced-colors:\s*active\)\s*\{[\s\S]*?\.gcol-resize:focus-visible[\s\S]*?\.gcol-resize-corner:focus-visible/s,
  'both Group resize handles must retain visible focus in forced colors',
);
for (const itemSource of [buildNoteSource, buildTodoSource]) {
  assert.match(
    itemSource,
    /bindBoardItemContextMenu\(el,/,
    'Note and To-do wrappers must use the shared pointer and keyboard context-menu path',
  );
  assert.match(
    itemSource,
    /el\.tabIndex = -1;/,
    'Note and To-do shells must not add an empty sequential keyboard stop',
  );
  assert.match(
    itemSource,
    /class="board-record-head"[\s\S]*?class="board-record-kind"[\s\S]*?class="board-record-menu"/,
    'Note and To-do cards must expose one stable record header and one persistent More control',
  );
  assert.match(
    itemSource,
    /library\.moreActions[\s\S]*?data-item-archive="menu"[\s\S]*?aria-haspopup="menu"/,
    'the persistent More control must have an exact localized record name and own Archive receipts',
  );
  assert.doesNotMatch(
    itemSource,
    /data-act="del"|item-btn danger|archiveItem\(it\.id\)/,
    'Note and To-do cards must not expose a direct destructive X or the fire-and-forget Archive writer',
  );
}
assert.equal(
  buildNoteSource.includes("{ text:'Edit'"),
  false,
  'the Note context menu must not retain a hardcoded English Edit action',
);
assert.match(
  buildNoteSource,
  /text:\s*tr\('itemAction\.editNote'\)/,
  'the Note context menu must use localized edit copy',
);
assert.match(
  bindBoardItemContextMenuSource,
  /event\.key === 'ContextMenu'[\s\S]*?event\.shiftKey && event\.key === 'F10'/,
  'Board item context menus must expose Context Menu and Shift+F10 activation',
);
assert.match(
  bindBoardItemContextMenuSource,
  /showContextMenu\([\s\S]*?\{\s*focusFirst:\s*true\s*\}\)/,
  'Board item context menus must focus their first action',
);
assert.match(
  bindBoardItemContextMenuSource,
  /const openAnchored = async[\s\S]*?showAnchoredContextMenu\(opener, getItems\(opener\)\)[\s\S]*?menuButton\.addEventListener\('click'[\s\S]*?openAnchored\(menuButton\)/,
  'the visible More control must open the same shared anchored menu',
);
assert.doesNotMatch(
  bindBoardItemContextMenuSource,
  /if \(event\.target !== anchor\) return;/,
  'Shift+F10 must not be limited to a redundant focusable card shell',
);
assert.match(
  bindBoardItemContextMenuSource,
  /const opener = resolveOpener\(event\.target\)[\s\S]*?focusDialogOpener\(opener\)[\s\S]*?openAnchored\(opener\)/,
  'keyboard menu activation must restore focus to the actual focused child',
);
assert.match(
  openBoardRecordDetailSource,
  /focusDialogOpener\(opener\)[\s\S]*?openItemDetail\(item\.id, \{ initialFocusKey \}\)/,
  'Board record actions must transfer their stable opener before routed Details focus',
);
assert.match(
  commonActsSource,
  /tr\('itemAction\.changeMarker'\)[\s\S]*?openBoardRecordDetail\(it, mutationOpener, itemMarkerFocusKey\(it\)\)/,
  'Change marker must route into the shared Details sheet instead of opening another popup',
);
assert.match(
  itemMarkerFocusKeySource,
  /`marker-\$\{itemMarkerChoice\(item\)\}`/,
  'the marker route must target the exact current named or custom choice',
);
assert.match(
  applyBoardRecordMarkerSource,
  /!ITEM_MARKER_COLORS\.includes\(stored\)[\s\S]*?style\.setProperty\('--record-custom-marker', stored\)/,
  'imported custom marker bytes must remain visible without changing stored data',
);
assert.match(
  buildNoteSource,
  /<button type="button" class="item-top board-record-body board-record-primary" data-item-primary="true"/,
  'the Note body must be one native read-only Details route',
);
assert.match(
  buildNoteSource,
  /openBoardRecordDetail\(it, event\.currentTarget, 'note-body'\)/,
  'the Note primary action must focus the real Details editor',
);
assert.doesNotMatch(
  buildNoteSource,
  /contenteditable|commitBoardNoteEdit|State\.(?:snapshot|persist)/,
  'the Board Note card must not retain an inline mutation path',
);
assert.match(
  detailPrimaryEditorSource,
  /it\.type === 'note'[\s\S]*?editor\.contentEditable = 'true'[\s\S]*?editor\.dataset\.idpFocus = 'note-body'[\s\S]*?isRichTextLinkEditorOwned\(editor\)[\s\S]*?autoLinkify\(sanitizeHtml\(rawHtml\)\)[\s\S]*?commit\(tr\('note\.history\.edit'\)/,
  'the Details Note editor must own rich text, Link focus, sanitization, and the shared receipt',
);
assert.match(
  css,
  /\.note-text\[contenteditable="true"\]:empty::before\s*\{[^}]*content:\s*attr\(data-placeholder\)/s,
  'empty Note guidance must come from the localized data-placeholder attribute',
);
assert.match(
  detailItemMarkerPickerSource,
  /setAttribute\('role', 'radiogroup'\)[\s\S]*?button\.type = 'button'[\s\S]*?setAttribute\('role', 'radio'\)[\s\S]*?setAttribute\('aria-checked'/,
  'Details must expose one named marker radiogroup of native buttons',
);
assert.match(
  detailItemMarkerPickerSource,
  /if \(color === 'custom'\) return;[\s\S]*?commit\(tr\('itemColor\.history'\)[\s\S]*?delete live\.color[\s\S]*?live\.color = color/,
  'custom bytes must remain unchanged while explicit marker choices use the exact Details receipt',
);
for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
  assert.ok(detailItemMarkerPickerSource.includes(`'${key}'`), `the Details marker picker must handle ${key}`);
}
assert.match(
  css,
  /\.idp-marker-choice\[data-marker="custom"\]\s*\{[^}]*background-color:\s*var\(--item-custom-color/s,
  'the imported custom marker must feed only a color-capable CSS property',
);
assert.doesNotMatch(
  css,
  /\.color-menu|\.cdot\b|backdrop-filter[^;]*item-custom-color/,
  'the duplicate anchored palette and its prototype visual language must be removed',
);
assert.match(
  buildTodoSource,
  /<button type="button" class="todo-check \$\{it\.done \? 'checked' : ''\}" aria-pressed="\$\{!!it\.done\}" aria-label="\$\{esc\(tr\(it\.done \? 'detail\.markIncomplete' : 'detail\.markComplete'\)\)\}"><\/button>/,
  'Board To-do completion must be a native stateful button with a localized next action',
);
assert.match(
  buildTodoSource,
  /class="board-record-primary board-record-todo-primary" data-item-primary="true"[^>]*aria-label="\$\{esc\(editLabel\)\}"/,
  'the Board To-do body must be one native read-only Details route',
);
assert.match(
  buildTodoSource,
  /openBoardRecordDetail\(it, event\.currentTarget, 'task'\)/,
  'the To-do primary action must focus the real Details task field',
);
assert.doesNotMatch(
  buildTodoSource,
  /contenteditable|commitBoardTodoTextEdit|State\.(?:snapshot|persist)/,
  'the Board To-do card must not retain an inline text writer',
);
assert.match(
  createBoardLocalArchiveContextSource,
  /createItemReminderMutationContext\(item\?\.id\)[\s\S]*?\['note', 'todo', 'stack'\]\.includes\(context\.itemType\)/,
  'local-record Archive must freeze exhaustive identity for Notes, To-dos, and complete Stacks while rejecting saved pages',
);
assert.match(
  archiveBoardLocalItemSource,
  /createBoardLocalArchiveContext\(item\)[\s\S]*?commitSavedPageArchive\(context, opener, now\)/,
  'local-card Archive must reuse the accepted-storage Archive boundary',
);
assert.match(
  archiveBoardLocalItemWithFocusSource,
  /parentItems\[index \+ 1\]\?\.id \|\| parentItems\[index - 1\]\?\.id[\s\S]*?await archiveBoardLocalItem\(item, opener, Date\.now\(\)\)[\s\S]*?requestAnimationFrame/,
  'accepted local Archive must choose its successor before removal and wait for the receipt before focus moves',
);
assert.match(
  archiveBoardLocalItemWithFocusSource,
  /focusItem\(neighborId\)[\s\S]*?focusIdentityTarget\('group', group\.id\)[\s\S]*?querySelector\('h1, \[role="heading"\]'\)/,
  'local Archive focus must fall back from sibling to Group identity to Board heading',
);
assert.ok(
  (buildTodoSource.match(/toggleBoardTodoCompletion\(it,/g) || []).length >= 2,
  'the native To-do button and context-menu action must share one completion controller',
);
assert.match(
  createBoardTodoCompletionContextSource,
  /createItemReminderMutationContext\(item\?\.id\)/,
  'Board To-do completion must freeze the existing exhaustive item identity context',
);
assert.match(
  resolveBoardTodoCompletionTargetSource,
  /resolveItemReminderMutationTarget\(context\)/,
  'Board To-do completion must re-resolve the frozen exhaustive context',
);
assert.match(
  setBoardTodoCompletionInterlockSource,
  /setElementInertOwner\(sibling, 'board-todo-completion', true\)[\s\S]*?setElementInertOwner\(element, 'board-todo-completion', false\)/,
  'the pending checkbox must own and later release its exact lower-sibling inert path',
);
assert.match(
  setBoardTodoCompletionBusySource,
  /button\.setAttribute\('aria-busy', String\(busy\)\)[\s\S]*?button\.disabled = busy[\s\S]*?classList\.toggle\('is-todo-pending', busy\)/,
  'the native checkbox and owning card must expose one in-place pending state',
);
assert.ok(
  [...source.matchAll(/isBoardTodoCompletionPending\(\)/g)].length >= 6,
  'pending To-do completion must block browser routing, programmatic navigation, and global shortcuts',
);
assert.doesNotMatch(
  source,
  /function (?:showColorMenu|commitBoardItemColor|commitBoardNoteEdit|commitBoardTodoTextEdit|flushActiveBoardNoteEditor|flushActiveBoardTodoTextEditor)\(/,
  'retired Board-local mutation paths must not remain as dead prototype residue',
);
assert.match(
  css,
  /\.board-record-head\s*\{[^}]*display:\s*flex[^}]*min-height:\s*40px/s,
  'local records must retain a stable header rhythm and touch-sized action row',
);
assert.match(
  css,
  /\.board-record-kind\s*\{[^}]*font:[^;]*var\(--font-mono/s,
  'the truthful record kind must use the established mono filing-label voice',
);
assert.match(
  css,
  /\.board-record-menu\s*\{[^}]*min-width:\s*40px[^}]*min-height:\s*40px/s,
  'the persistent More control must retain a 40 by 40 pixel target',
);
assert.match(
  css,
  /\.board-record-head \.rem-badge\s*\{[^}]*position:\s*static/s,
  'record reminders must remain in the card flow instead of obscuring content',
);
assert.doesNotMatch(
  css,
  /\.rem-badge\s*\{[^}]*animation:\s*bellShake[^}]*infinite/s,
  'record reminders must not demand attention with ornamental infinite motion',
);
assert.match(
  css,
  /\.item\.note\s*\{[^}]*background:\s*var\(--panel\)[^}]*border-color:\s*var\(--border2\)/s,
  'Note and To-do cards must share one quiet paper stock instead of a special sticky-note treatment',
);
assert.match(
  css,
  /\.board-record-primary\s*\{[^}]*width:\s*100%[^}]*background:\s*transparent[^}]*text-align:\s*left/s,
  'the read-only record body must remain a flat full-width native action',
);
assert.match(
  css,
  /\.todo-check\s*\{[^}]*width:\s*2[2-9]px[^}]*height:\s*2[2-9]px/s,
  'the To-do completion control must retain a legible local-record target',
);
assert.match(
  css,
  /\.lv-row \.item:is\(\.note, \.todo\)\s*\{[^}]*padding:\s*0[^}]*background:\s*var\(--panel\)/s,
  'the shared local-record hierarchy must not collapse back into padded prototype rows in List view',
);
assert.match(
  css,
  /@media \(forced-colors:\s*active\)\s*\{[\s\S]*?\.board-record-menu:focus-visible[\s\S]*?\.board-record-kind/s,
  'record identity and More focus must remain visible in forced colors',
);
assert.match(
  css,
  /\.todo-check\[aria-busy="true"\]\s*\{[^}]*cursor:\s*progress[^}]*animation:\s*todo-receipt-pulse/s,
  'pending completion must communicate its one local receipt in the existing checkbox',
);
for (const hardcoded of [
  'No saveable tabs in this window.',
  'aria-label="Select tab"',
  'title="Close tab"',
  'aria-label="Close tab"',
  'Asleep — reloads when you open it',
  "text:'Switch to tab'",
  "'Deselect' : 'Select'",
  "'Save to Inbox'",
  "'Close tab'",
  'ghost.textContent = `${tabs.length} tabs`',
]) {
  assert.equal(
    renderOpenTabsSource.includes(hardcoded),
    false,
    `opened-tabs rendering must not retain hardcoded runtime copy: ${hardcoded}`,
  );
}
assert.match(
  renderOpenTabsSource,
  /<button type="button" class="otab-check" role="checkbox" aria-checked="\$\{selected\}" aria-label="\$\{esc\(tr\(selected \? 'rail\.deselectTab' : 'rail\.selectTab', \{ title: tabTitle \}\)\)\}"><\/button>/,
  'opened-tab selection must use a native button with checkbox state and an exact localized tab name',
);
assert.match(
  renderOpenTabsSource,
  /<button type="button" class="otab-close" title="\$\{esc\(tr\('rail\.closeTab', \{ title: tabTitle \}\)\)\}" aria-label="\$\{esc\(tr\('rail\.closeTab', \{ title: tabTitle \}\)\)\}"/,
  'opened-tab Close must expose an exact localized tab name',
);
assert.match(
  renderOpenTabsSource,
  /<button type="button" class="otab-primary" aria-label="\$\{esc\(tr\('rail\.switchToTab', \{ title: tabTitle \}\)\)\}"/,
  'each opened-tab title must be a native, exactly named Switch control',
);
assert.match(
  source,
  /function renderOpenTabRailState\(kind, options = \{\}\)[\s\S]*rail\.loading[\s\S]*rail\.error[\s\S]*rail\.retry[\s\S]*rail\.empty/,
  'the rail must render distinct loading, failure with Retry, and true-empty states',
);
assert.match(
  source,
  /function applyFilter\(\)[\s\S]*rail\.noMatch[\s\S]*rail\.clearFilter/,
  'filtering must replace a blank list with a localized no-match state and Clear action',
);
assert.match(
  source,
  /catch \(e\) \{[\s\S]{0,220}openTabsLoadState = 'error';[\s\S]{0,120}renderOpenTabs\(\);/,
  'a rejected Chrome tab query must repaint the visible rail failure state',
);
assert.match(
  renderOpenTabsSource,
  /bindBoardItemContextMenu\(el, opener => openTabActionMenuItems\(t, opener\)\)/,
  'pointer and Shift+F10 or Context Menu activation must share the opened-tab action model',
);
assert.match(
  openTabActionMenuItemsSource,
  /const t = resolveOpenTabActionTarget\(tab\);[\s\S]*if \(!t\) return \[\];/,
  'opened-tab context actions must reject a stale rendered source before exposing browser actions',
);
assert.match(
  focusOpenTabFilterSource,
  /if \(!isOpenTabsRailAvailable\(\)\) return false;[\s\S]*setOpenTabsRailCollapsed\(false, \{ persist: true \}\)[\s\S]*filter\.focus\(\{ preventScroll: true \}\)/,
  'the S shortcut must expand a reachable rail before focusing its filter and reject the hidden 800px rail',
);
assert.match(
  restoreOpenTabCaptureFocusSource,
  /if \(!isOpenTabsRailAvailable\(\)\)[\s\S]*getElementById\('topbar-save'\)[\s\S]*preventScroll: true/,
  'post-capture focus must skip the hidden 800px rail and use a visible shell action',
);
assert.match(
  handleOpenTabsEscapeSource,
  /filter\.value = '';[\s\S]*selectedTabIds\.clear\(\);[\s\S]*isOpenTabsRailDrawerOpen\(\)[\s\S]*setOpenTabsRailCollapsed\(true/,
  'rail Escape must clear filter, then selection, then the responsive drawer in stack order',
);
assert.match(
  source,
  /if \(!_overlayWasOpen && handleOpenTabsEscape\(e\)\) return;/,
  'rail Escape handling must run only after higher overlays have retained priority',
);
assert.match(
  html,
  /id="selected-badge"[^>]*role="status"[^>]*aria-live="polite"/,
  'opened-tab selection changes must be announced as one live receipt band',
);
assert.doesNotMatch(
  renderOpenTabsSource,
  /tabCheck\.addEventListener\('keydown'/,
  'the native opened-tab selection button must not retain duplicate custom keyboard activation',
);
assert.match(
  renderOpenTabsSource,
  /toggleOpenTabSelection\(t\.id, \{ range: e\.shiftKey, restoreFocus: true \}\)/,
  'opened-tab selection activation must request focus restoration by stable tab ID',
);
assert.match(
  renderOpenTabsSource,
  /const saveable = isOpenableSavedTabUrl\(t\.url\);[\s\S]*el\.draggable = saveable/,
  'the rail must keep every managed tab visible while making drag eligibility match Reopen',
);
assert.match(
  renderOpenTabsSource,
  /<img class="otab-fav"[^>]*draggable="false"/,
  'an opened-tab favicon must not start a native child drag independently of its row',
);
{
  const dragStart = renderOpenTabsSource.indexOf("el.addEventListener('dragstart'");
  const dragEnd = renderOpenTabsSource.indexOf("el.addEventListener('dragend'", dragStart);
  const dragStartSource = renderOpenTabsSource.slice(dragStart, dragEnd);
  const unsafeGuard = dragStartSource.indexOf('if (!saveable)');
  const batchDiscovery = dragStartSource.indexOf('const batchTabs = selectedCaptureTabs()');
  const transferWrite = dragStartSource.indexOf("e.dataTransfer.setData('text/plain', t.url)");
  assert.ok(unsafeGuard >= 0 && unsafeGuard < batchDiscovery && unsafeGuard < transferWrite,
    'an unsafe row drag must stop before batch promotion or data-transfer disclosure');
}
assert.match(
  openTabActionMenuItemsSource,
  /const saveCount = selectedCaptureTabs\(\)\.length;[\s\S]*batchSave[\s\S]*saveable/,
  'rail context menus must derive batch and individual Save actions from recoverable tabs only',
);
assert.match(
  updateSelectedBadgeSource,
  /const saveCount = selectedCaptureTabs\(\)\.length;[\s\S]*const saveActions = saveCount \?/,
  'the selected badge must omit Save actions when no selected tab can be reopened',
);
assert.match(
  css,
  /\.otab\.is-save-unavailable \.otab-handle\s*\{[^}]*visibility:\s*hidden/,
  'an unsupported rail row must not display a false drag-to-save handle',
);
assert.match(
  css,
  /\.otab\.is-save-unavailable,\s*\.otab\.is-save-unavailable:active\s*\{[^}]*cursor:\s*pointer/,
  'an unsupported rail row must advertise switching rather than a false grab action',
);
assert.match(
  css,
  /\.otab-check,\s*\.otab-close\s*\{[^}]*width:\s*40px[^}]*height:\s*40px[^}]*opacity:\s*1/s,
  'opened-tab Select and Close controls must remain visible 40px targets without hover discovery',
);
assert.match(
  css,
  /@media \(min-width:\s*821px\) and \(max-width:\s*1280px\)[\s\S]*#tabrail:not\(\.collapsed\)\s*\{[^}]*position:\s*fixed[^}]*width:\s*min\(320px, calc\(100vw - 64px\)\)/,
  'the 821-1280px rail toggle must open a real responsive drawer instead of a permanently collapsed handle',
);
const openedTabRuntimeSources = [
  renderOpenTabsSource,
  renderOpenTabRailStateSource,
  openTabActionMenuItemsSource,
  syncOpenTabRailCaptureControlsSource,
  updateSelectedBadgeSource,
  applyFilterSource,
].join('\n');
for (const key of [
  'rail.loading',
  'rail.loadingBody',
  'rail.error',
  'rail.errorBody',
  'rail.retry',
  'rail.empty',
  'rail.emptyBody',
  'rail.noMatch',
  'rail.noMatchBody',
  'rail.clearFilter',
  'rail.notSaveable',
  'rail.saving',
  'rail.asleep',
  'rail.asleepHint',
  'rail.selectTab',
  'rail.deselectTab',
  'rail.closeTab',
  'rail.switchToTab',
  'rail.saveSelectedAsGroup',
  'rail.saveSelectedToInbox',
  'rail.saveToInbox',
  'rail.closeSelectedTabs',
  'rail.tabsCount',
]) {
  assert.ok(
    openedTabRuntimeSources.includes(`'${key}'`),
    `opened-tabs rendering must use localized copy: ${key}`,
  );
}
for (const hardcoded of ['>selected<', 'title="Save as group"', 'title="Save to Inbox"', 'title="Clear selection"']) {
  assert.equal(
    updateSelectedBadgeSource.includes(hardcoded),
    false,
    `opened-tabs selection badge must not retain hardcoded runtime copy: ${hardcoded}`,
  );
}
assert.match(
  applyLocaleSource,
  /if \(document\.getElementById\('open-tabs'\)\) \{\s*renderOpenTabs\(\);\s*updateSelectedBadge\(\);\s*\}/,
  'a live locale change must repaint opened-tab rows and their selection badge immediately',
);
assert.doesNotMatch(
  buildTabSource,
  /\bprompt\s*\(/,
  'saved-tab title editing must use the receipt-gated detail editor instead of a native prompt',
);
assert.match(
  buildTabSource,
  /const primary = el\.querySelector\(['"]:scope > \.item-top > \[data-item-primary="true"\]['"]\);/,
  'the saved-tab context menu must retain the same direct primary-action anchor as first-save focus',
);
assert.match(
  buildTabSource,
  /bindBoardItemContextMenu\(el,\s*savedTabMenuItems,\s*\{\s*menuButton\s*\}\)/,
  'saved pages must converge More, pointer context, Context Menu, and Shift+F10 on the shared Board menu controller',
);
assert.match(
  buildTabSource,
  /openItemDetail\(it\.id,\s*\{\s*initialFocusKey:\s*['"]title['"]\s*\}\)/,
  'Edit title must route to the saved item detail title field',
);
assert.match(
  buildTabSource,
  /copySavedTabUrl\(savedUrl\)/,
  'Copy URL must use the shared receipt helper',
);
assert.match(
  buildTabSource,
  /commonActs\(it,\s*\[\],\s*\{[\s\S]*?includeColor:\s*false,[\s\S]*?includeReminder:\s*false,[\s\S]*?mutationOpener:\s*stableOpener,[\s\S]*?afterToggle:\s*restoreSavedTabFocus,[\s\S]*?archiveAction:\s*\(\) => archiveSavedTab\(stableOpener\)/,
  'the core saved-tab keyboard menu must omit legacy direct color/reminder mutations and provide stable post-rebuild actions',
);
assert.match(
  buildTabSource,
  /const restoreSavedTabFocus = \(\) => requestAnimationFrame\(\(\) => focusItem\(it\.id\)\);/,
  'Favorite and Read Later menu toggles must schedule focus restoration after their synchronous board rebuild',
);
assert.match(
  buildTabSource,
  /parentItems\[index \+ 1\]\?\.id \|\| parentItems\[index - 1\]\?\.id \|\| ['"]{2}/,
  'saved-tab menu Archive must choose the next sibling before the previous sibling',
);
assert.match(
  buildTabSource,
  /if \(group\?\.id && focusIdentityTarget\(['"]group['"], group\.id\)\) return;[\s\S]*?focusItemDetailTarget\(board\?\.querySelector\(['"]h1, \[role="heading"\]['"]\) \|\| board\)/,
  'saved-tab menu Archive must fall back through the visible Group identity and board heading',
);
assert.match(
  commonActsSource,
  /const changed = await toggleFavorite\(it, mutationOpener\);\s*if \(changed\) afterToggle\(\);/,
  'the shared Favorite menu action must restore focus only after an acknowledged rebuild',
);
assert.match(
  commonActsSource,
  /const changed = await toggleReadLater\(it, mutationOpener\);\s*if \(changed\) afterToggle\(\);/,
  'the shared Read Later menu action must restore focus only after an acknowledged rebuild',
);
assert.match(
  buildTabSource,
  /const archiveSavedTab = async \(archiveOpener = menuButton \|\| primary\) => \{[\s\S]*?archiveAction:\s*\(\) => archiveSavedTab\(stableOpener\)/,
  'the visible More menu and keyboard context menu must share one receipt-safe successor-focus implementation',
);
assert.match(
  archiveItemSource,
  /State\.snapshot\(tr\(['"]itemAction\.archive['"]\)\);[\s\S]*?toast\(tr\(['"]itemAction\.archived['"]\),\s*\{\s*undo:\s*true\s*\}\)/,
  'saved-tab archive history and undo receipt must use localized runtime copy',
);
for (const hardcoded of [
  'Open (focused)', 'Open in background', 'Copy URL', 'Edit title…',
  'Add to Favorites', 'Remove from Favorites', 'Save to Read Later', 'Remove from Read Later',
]) {
  assert.equal(
    buildTabSource.includes(`text:'${hardcoded}'`)
      || buildTabSource.includes(`text: '${hardcoded}'`)
      || commonActsSource.includes(`text:'${hardcoded}'`)
      || commonActsSource.includes(`text: '${hardcoded}'`),
    false,
    `saved-tab context-menu copy must not remain hardcoded: ${hardcoded}`,
  );
}

const buildTabLocaleKeys = [...buildTabSource.matchAll(/['"]((?:itemAction|detail|home|library)\.[A-Za-z0-9.]+)['"]/g)]
  .map(match => match[1])
  .filter((key, index, keys) => keys.indexOf(key) === index);
assert.ok(
  buildTabLocaleKeys.length >= 5,
  'primary, unavailable, detail/open, and archive saved-tab states must use localized copy',
);
const i18nSource = extractBetween('const I18N = {', '\nfunction tr(');
const i18nContext = vm.createContext({});
vm.runInContext(`${i18nSource}\nglobalThis.__I18N = I18N;`, i18nContext, { filename: 'onboarding-i18n-contract.js' });
for (const key of [
  'shell.views',
  'action.collapseSidebar',
  'action.expandSidebar',
  'action.collapseOpenedTabs',
  'action.expandOpenedTabs',
  'action.switchLayout',
  'groupAction.addTab',
  'groupAction.addTabHint',
  'groupAction.saveHere',
  'groupAction.saveHereFor',
  'groupAction.addRecord',
  'groupAction.addRecordFor',
  'groupAction.addNote',
  'groupAction.addTodo',
  'groupAction.resizeWidth',
  'groupAction.resizeWidthHint',
  'groupAction.resizeBoth',
  'groupAction.resizeBothHint',
  'itemAction.editNote',
  'itemAction.editNoteFor',
  'itemAction.editTodo',
  'itemAction.editTodoFor',
  'itemAction.changeMarker',
  'itemColor.menuLabel',
  'itemColor.none',
  'itemColor.history',
  'note.editorLabel',
  'note.placeholder',
  'detail.emptyNote',
  'detail.emptyTodo',
  'rail.loading',
  'rail.loadingBody',
  'rail.error',
  'rail.errorBody',
  'rail.retry',
  'rail.empty',
  'rail.emptyBody',
  'rail.noMatch',
  'rail.noMatchBody',
  'rail.clearFilter',
  'rail.notSaveable',
  'rail.saving',
  'rail.asleep',
  'rail.asleepHint',
  'rail.selectTab',
  'rail.deselectTab',
  'rail.closeTab',
  'rail.switchToTab',
  'rail.saveSelectedAsGroup',
  'rail.saveSelectedToInbox',
  'rail.saveToInbox',
  'rail.closeSelectedTabs',
  'rail.tabsCount',
]) {
  const en = i18nContext.__I18N.en[key];
  const zhTW = i18nContext.__I18N['zh-TW'][key];
  assert.ok(en?.trim(), `English core-shell copy must define ${key}`);
  assert.ok(zhTW?.trim(), `zh-TW core-shell copy must define ${key}`);
  assert.notEqual(zhTW, en, `zh-TW core-shell copy must not fall back to English: ${key}`);
}

const groupResizeContext = vm.createContext({
  __resizeState: { columnSizes: { existing: { w: 288, h: 244 } } },
  __persistCalls: 0,
  State: {
    get() { return groupResizeContext.__resizeState; },
    persist() { groupResizeContext.__persistCalls += 1; },
  },
});
vm.runInContext(
  `${nextKeyboardGroupColumnSizeSource}
${nextPointerGroupColumnSizeSource}
${persistGroupColumnSizeSource}
globalThis.__nextGroupSize = nextKeyboardGroupColumnSize;
globalThis.__nextPointerGroupSize = nextPointerGroupColumnSize;
globalThis.__persistGroupSize = persistGroupColumnSize;`,
  groupResizeContext,
  { filename: 'board-group-resize-contract.js' },
);
const nextGroupSize = (current, key, mode = 'width', shiftKey = false, viewportHeight = 720) =>
  JSON.parse(JSON.stringify(groupResizeContext.__nextGroupSize(current, key, mode, shiftKey, viewportHeight)));
const nextPointerGroupSize = (current, start, pointer, mode = 'width', viewportHeight = 720) =>
  JSON.parse(JSON.stringify(groupResizeContext.__nextPointerGroupSize(current, start, pointer, mode, viewportHeight)));
assert.deepEqual(
  nextGroupSize({ w: 300, h: 260 }, 'ArrowRight'),
  { w: 316, h: 260 },
  'Right Arrow must grow Group width by 16 px',
);
assert.deepEqual(
  nextGroupSize({ w: 300, h: 105 }, 'ArrowRight'),
  { w: 316, h: 105 },
  'a width Arrow must preserve a naturally short Group height',
);
assert.deepEqual(
  nextGroupSize({ w: 300, h: 260 }, 'ArrowLeft', 'width', true),
  { w: 252, h: 260 },
  'Shift+Left Arrow must shrink Group width by 48 px',
);
assert.deepEqual(
  nextGroupSize({ w: 300, h: 260 }, 'ArrowDown', 'corner'),
  { w: 300, h: 276 },
  'corner Down Arrow must grow Group height by 16 px',
);
assert.deepEqual(
  nextGroupSize({ w: 300, h: 260 }, 'ArrowUp', 'corner', true),
  { w: 300, h: 212 },
  'corner Shift+Up Arrow must shrink Group height by 48 px',
);
assert.deepEqual(
  nextGroupSize({ w: 205, h: 125 }, 'ArrowLeft'),
  { w: 200, h: 125 },
  'Group width must clamp at 200 px',
);
assert.deepEqual(
  nextGroupSize({ w: 895, h: 125 }, 'ArrowRight', 'corner', true),
  { w: 900, h: 125 },
  'Group width must clamp at 900 px',
);
assert.deepEqual(
  nextGroupSize({ w: 300, h: 125 }, 'ArrowUp', 'corner'),
  { w: 300, h: 120 },
  'Group height must clamp at 120 px',
);
assert.deepEqual(
  nextGroupSize({ w: 300, h: 515 }, 'ArrowDown', 'corner', true),
  { w: 300, h: 520 },
  'Group height must clamp at viewport height minus 200 px',
);
assert.equal(
  nextGroupSize({ w: 300, h: 260 }, 'ArrowDown', 'width'),
  null,
  'the width-only handle must leave vertical Arrow keys to the browser',
);
assert.equal(
  nextGroupSize({ w: 300, h: 260 }, 'Enter', 'corner'),
  null,
  'non-Arrow keys must keep native button behavior',
);
assert.deepEqual(
  nextPointerGroupSize({ w: 300, h: 260 }, { x: 20, y: 30 }, { x: 52, y: 78 }),
  { w: 332, h: 260 },
  'the width pointer handle must change only width by the exact horizontal delta',
);
assert.deepEqual(
  nextPointerGroupSize({ w: 300, h: 260 }, { x: 20, y: 30 }, { x: 52, y: 78 }, 'corner'),
  { w: 332, h: 308 },
  'the corner pointer handle must apply both exact pointer deltas',
);
assert.deepEqual(
  nextPointerGroupSize({ w: 215, h: 130 }, { x: 50, y: 50 }, { x: -100, y: -100 }, 'corner'),
  { w: 200, h: 120 },
  'pointer resizing must clamp both dimensions at their lower bounds',
);
assert.deepEqual(
  nextPointerGroupSize({ w: 890, h: 510 }, { x: 0, y: 0 }, { x: 100, y: 100 }, 'corner'),
  { w: 900, h: 520 },
  'pointer resizing must clamp width and viewport-relative height at their upper bounds',
);
groupResizeContext.__persistGroupSize('group-a', { w: 348, h: 276 });
assert.deepEqual(
  JSON.parse(JSON.stringify(groupResizeContext.__resizeState)),
  {
    columnSizes: {
      existing: { w: 288, h: 244 },
      'group-a': { w: 348, h: 276 },
    },
  },
  'Group resize persistence must preserve siblings and use the existing exact { w, h } record',
);
assert.equal(
  groupResizeContext.__persistCalls,
  1,
  'one completed keyboard or pointer resize must call State.persist exactly once',
);

async function testBoardSelectionAndDetailsControlContract() {
  let documentRef = null;
  class FakeClassList {
    constructor(element) { this.element = element; }
    values() { return String(this.element.className || '').split(/\s+/).filter(Boolean); }
    contains(value) { return this.values().includes(value); }
    add(...values) {
      this.element.className = [...new Set([...this.values(), ...values])].join(' ');
    }
    toggle(value, force) {
      const active = force == null ? !this.contains(value) : !!force;
      const values = this.values().filter(candidate => candidate !== value);
      if (active) values.push(value);
      this.element.className = values.join(' ');
      return active;
    }
  }
  class FakeElement {
    constructor(tagName) {
      this.tagName = String(tagName || '').toUpperCase();
      this.children = [];
      this.parentElement = null;
      this.dataset = {};
      this.attributes = {};
      this.listeners = {};
      this.className = '';
      this.classList = new FakeClassList(this);
      this.textContent = '';
      this.innerHTML = '';
      this.title = '';
      this.type = '';
      this.isConnected = true;
      this.style = {};
    }
    get firstChild() { return this.children[0] || null; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
    removeAttribute(name) { delete this.attributes[name]; }
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    }
    insertBefore(child, before) {
      child.parentElement = this;
      const index = before ? this.children.indexOf(before) : -1;
      if (index < 0) this.children.push(child);
      else this.children.splice(index, 0, child);
      return child;
    }
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
    matchesSelector(selector) {
      if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
      return this.tagName === selector.toUpperCase();
    }
    querySelectorAll(selector) {
      const matches = [];
      const visit = element => {
        for (const child of element.children) {
          if (child.matchesSelector(selector)) matches.push(child);
          visit(child);
        }
      };
      visit(this);
      return matches;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    focus() { documentRef.activeElement = this; }
  }
  const visibleText = element => [
    String(element?.textContent || '').trim(),
    ...(element?.children || []).map(visibleText),
  ].filter(Boolean).join(' ');

  const record = new FakeElement('article');
  const recordHeader = new FakeElement('div');
  recordHeader.className = 'board-record-head';
  const recordKind = new FakeElement('span');
  recordKind.className = 'board-record-kind';
  recordHeader.appendChild(recordKind);
  record.appendChild(recordHeader);
  const recordBody = new FakeElement('div');
  recordBody.className = 'item-top';
  record.appendChild(recordBody);
  const selectionCalls = [];
  const selectionDocument = {
    activeElement: null,
    rebuiltControl: null,
    createElement: tagName => new FakeElement(tagName),
    querySelector(selector) {
      if (selector.includes('data-item-select-id')) return this.rebuiltControl;
      return null;
    },
  };
  documentRef = selectionDocument;
  const selectionContext = vm.createContext({
    document: selectionDocument,
    CSS: { escape: value => String(value) },
    requestAnimationFrame(callback) { callback(); },
    selectedItemIds: new Set(),
    reminderItemTitle() { return 'Research brief'; },
    tr(key, values = {}) {
      if (key === 'selection.selectItem') return `Select “${values.title}”`;
      if (key === 'selection.deselectItem') return `Deselect “${values.title}”`;
      if (key === 'stackEditor.defaultName') return 'Stack';
      return key;
    },
    selectRangeTo(itemId) { selectionCalls.push({ type: 'range', itemId }); },
    toggleItemSelect(itemId) {
      selectionCalls.push({ type: 'toggle', itemId });
      selectionDocument.rebuiltControl = new FakeElement('button');
      selectionDocument.rebuiltControl.dataset.itemSelectId = itemId;
    },
  });
  vm.runInContext(
    `${extractFunction('attachItemSelection')}\nglobalThis.__attachItemSelection = attachItemSelection;`,
    selectionContext,
    { filename: 'board-item-selection-control-contract.js' },
  );
  const item = { id: 'record-1', type: 'tab', title: 'Research brief' };
  const selectButton = selectionContext.__attachItemSelection(record, item);
  assert.ok(selectButton, 'record selection must return its native control for focus ownership');
  assert.equal(selectButton.tagName, 'BUTTON', 'record selection must be a native button');
  assert.equal(selectButton.type, 'button');
  assert.equal(selectButton.getAttribute('role'), 'checkbox');
  assert.equal(selectButton.getAttribute('aria-checked'), 'false');
  assert.equal(selectButton.getAttribute('aria-label'), 'Select “Research brief”');
  assert.equal(recordHeader.firstChild, selectButton, 'selection must occupy the record-header index slot without shifting body content');
  let stopped = false;
  let prevented = false;
  selectButton.listeners.click[0]({
    shiftKey: false,
    stopPropagation() { stopped = true; },
    preventDefault() { prevented = true; },
  });
  assert.deepEqual(selectionCalls, [{ type: 'toggle', itemId: 'record-1' }]);
  assert.equal(stopped, true);
  assert.equal(prevented, true);
  assert.equal(selectionDocument.activeElement, selectionDocument.rebuiltControl,
    'selection rerender must return focus to the rebuilt exact checkbox');

  selectionContext.selectedItemIds.add(item.id);
  const selectedRecord = new FakeElement('article');
  const selectedHeader = new FakeElement('div');
  selectedHeader.className = 'board-record-head';
  selectedRecord.appendChild(selectedHeader);
  const deselectButton = selectionContext.__attachItemSelection(selectedRecord, item);
  assert.equal(deselectButton.getAttribute('aria-checked'), 'true');
  assert.equal(deselectButton.getAttribute('aria-label'), 'Deselect “Research brief”');
  assert.equal(deselectButton.classList.contains('checked'), true);

  const detailCalls = [];
  const detailDocument = {
    activeElement: null,
    createElement: tagName => new FakeElement(tagName),
  };
  documentRef = detailDocument;
  const detailContext = vm.createContext({
    document: detailDocument,
    reminderItemTitle() { return 'Research brief'; },
    tr(key, values = {}) {
      const copy = {
        'itemAction.details': 'Details…',
        'itemAction.detailsFor': `View details for ${values.title}`,
        'detail.whySaved': 'Why you saved it',
        'detail.checklist': 'Checklist',
        'detail.customFields': 'Custom fields',
      };
      return copy[key] || key;
    },
    openItemDetail(itemId, options) { detailCalls.push({ itemId, options }); },
  });
  const applyItemMetaSource = extractFunction('applyItemMeta');
  vm.runInContext(
    `${applyItemMetaSource}\nglobalThis.__applyItemMeta = applyItemMeta;`,
    detailContext,
    { filename: 'board-item-details-control-contract.js' },
  );
  const detailRecord = new FakeElement('article');
  const detailedItem = {
    id: 'record-1',
    type: 'tab',
    title: 'Research brief',
    notes: '<p>Compare the sources.</p>',
    checklist: [{ text: 'Read', done: true }, { text: 'Decide', done: false }],
    customFields: [{ label: 'Owner', value: 'I-Kai' }, { label: 'State', value: 'Draft' }],
  };
  detailContext.__applyItemMeta(detailRecord, detailedItem);
  const detailsButton = detailRecord.querySelector('.item-detail-meta');
  assert.ok(detailsButton, 'real optional metadata must expose one Details action');
  assert.equal(detailsButton.tagName, 'BUTTON', 'Details discovery must use a native button');
  assert.equal(detailsButton.type, 'button');
  assert.equal(detailsButton.getAttribute('aria-label'), 'View details for Research brief');
  assert.match(visibleText(detailsButton), /Details…/);
  assert.match(visibleText(detailsButton), /Why you saved it/);
  assert.match(visibleText(detailsButton), /Checklist 1\/2/);
  assert.match(visibleText(detailsButton), /Custom fields 2/);
  detailsButton.listeners.click[0]({ stopPropagation() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(detailCalls)), [{
    itemId: 'record-1',
    options: { returnFocusKey: 'board-item-details' },
  }]);
  const plainRecord = new FakeElement('article');
  detailContext.__applyItemMeta(plainRecord, { id: 'plain-1', type: 'todo', text: 'No metadata' });
  assert.equal(plainRecord.querySelector('.item-detail-meta'), null,
    'a record without real optional metadata must not gain a decorative Details row');
  assert.match(applyItemMetaSource, /cov\.style\.backgroundColor\s*=\s*it\.cover\.color/,
    'custom cover bytes must enter the color-only CSS sink');
  assert.doesNotMatch(applyItemMetaSource, /cov\.style\.background\s*=/,
    'custom cover bytes must not enter the background shorthand or acquire a network-capable image layer');

  const detailTrigger = new FakeElement('button');
  const boardHeading = new FakeElement('h1');
  let restoredFocus = null;
  const restoreContext = vm.createContext({
    CSS: { escape: value => String(value) },
    restoreOpener() { return false; },
    document: {
      querySelector(selector) {
        return selector === '.item[data-id="record-1"] > .item-detail-meta' ? detailTrigger : null;
      },
      getElementById(id) {
        if (id !== 'board') return null;
        return { querySelector() { return boardHeading; } };
      },
    },
    focusItemDetailTarget(target) { restoredFocus = target; return true; },
  });
  vm.runInContext(
    `${extractFunction('restoreItemDetailFocus')}\nglobalThis.__restoreItemDetailFocus = restoreItemDetailFocus;`,
    restoreContext,
    { filename: 'board-item-details-focus-contract.js' },
  );
  restoreContext.__restoreItemDetailFocus({}, 'record-1', 'board-item-details');
  assert.equal(restoredFocus, detailTrigger, 'closing routed Details must restore its rebuilt trigger');

  assert.equal(i18nContext.__I18N.en['selection.selectItem'], 'Select “{title}”');
  assert.equal(i18nContext.__I18N.en['selection.deselectItem'], 'Deselect “{title}”');
  assert.equal(i18nContext.__I18N['zh-TW']['selection.selectItem'], '選取「{title}」');
  assert.equal(i18nContext.__I18N['zh-TW']['selection.deselectItem'], '取消選取「{title}」');

  const selectionCss = css.slice(css.indexOf('.item-check {'), css.indexOf('/* Selected-item action docket'));
  assert.match(selectionCss, /\.item-check\s*\{[^}]*width:\s*40px[^}]*height:\s*40px[^}]*display:\s*inline-grid/s,
    'record selection must use one persistent 40 pixel native index control');
  assert.doesNotMatch(selectionCss, /display:\s*none|border-radius:\s*999px|scale\s*\(/,
    'record selection must not return to hover-only circular or scaling prototype styling');
  assert.match(selectionCss, /\.item-check\.checked\s*\{[^}]*box-shadow:\s*inset 3px 0/s,
    'selected records must expose the non-color locator edge');
  const detailsCss = css.slice(css.indexOf('.item-detail-meta {'), css.indexOf('/* Preserve visual context', css.indexOf('.item-detail-meta {')));
  assert.match(detailsCss, /\.item-detail-meta\s*\{[^}]*width:\s*100%[^}]*min-height:\s*40px[^}]*border-top:/s,
    'optional metadata must read as one full-width recovery ledger action');
  assert.match(detailsCss, /\.idm-facts\s*\{[^}]*flex-wrap:\s*wrap/s,
    'real detail facts must wrap rather than clip at narrow widths');
  assert.doesNotMatch(detailsCss, /border-radius:\s*999px|transform:\s*scale|linear-gradient|backdrop-filter/,
    'Details discovery must not reintroduce pills, ornamental scale, gradients, or glass');
  assert.match(css, /@media \(forced-colors:\s*active\)[\s\S]*?\.item-check\.checked[\s\S]*?\.item-detail-meta/,
    'selection and Details context must retain visible forced-color boundaries');
}

for (const [collapsed, expectedKey, expectedExpanded] of [
  [false, 'action.collapseSidebar', 'true'],
  [true, 'action.expandSidebar', 'false'],
]) {
  const attributes = {};
  const toggle = {
    dataset: {},
    title: '',
    setAttribute(name, value) { attributes[name] = String(value); },
  };
  const sidebar = { classList: { contains: name => name === 'collapsed' && collapsed } };
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (id === 'sidebar') return sidebar;
        if (id === 'sidebar-toggle') return toggle;
        return null;
      },
    },
    tr: key => `translated:${key}`,
  });
  vm.runInContext(`${sidebarToggleSource}\nupdateSidebarToggleLabel();`, context, {
    filename: `sidebar-toggle-${collapsed ? 'collapsed' : 'expanded'}-contract.js`,
  });
  assert.equal(toggle.dataset.i18nTitle, expectedKey, 'sidebar tooltip key must match the next consequence');
  assert.equal(toggle.dataset.i18nAriaLabel, expectedKey, 'sidebar accessible-name key must match the next consequence');
  assert.equal(toggle.title, `translated:${expectedKey}`, 'sidebar tooltip must repaint immediately');
  assert.equal(attributes['aria-label'], `translated:${expectedKey}`, 'sidebar accessible name must repaint immediately');
  assert.equal(attributes['aria-expanded'], expectedExpanded, 'sidebar expanded state must match the live class');
}
for (const [collapsed, expectedKey, expectedExpanded] of [
  [false, 'action.collapseOpenedTabs', 'true'],
  [true, 'action.expandOpenedTabs', 'false'],
]) {
  const attributes = {};
  const toggle = {
    dataset: {},
    title: '',
    setAttribute(name, value) { attributes[name] = String(value); },
  };
  const rail = { classList: { contains: name => name === 'collapsed' && collapsed } };
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (id === 'tabrail') return rail;
        if (id === 'tabrail-toggle') return toggle;
        return null;
      },
    },
    tr: key => `translated:${key}`,
  });
  vm.runInContext(`${railToggleSource}\nupdateRailToggleLabel();`, context, {
    filename: `opened-tabs-toggle-${collapsed ? 'collapsed' : 'expanded'}-contract.js`,
  });
  assert.equal(toggle.dataset.i18nTitle, expectedKey, 'opened-tabs tooltip key must match the next consequence');
  assert.equal(toggle.dataset.i18nAriaLabel, expectedKey, 'opened-tabs accessible-name key must match the next consequence');
  assert.equal(toggle.title, `translated:${expectedKey}`, 'opened-tabs tooltip must repaint immediately');
  assert.equal(attributes['aria-label'], `translated:${expectedKey}`, 'opened-tabs accessible name must repaint immediately');
  assert.equal(attributes['aria-expanded'], expectedExpanded, 'opened-tabs expanded state must match the live class');
}
{
  const attributes = {};
  const icon = { innerHTML: '' };
  const button = {
    dataset: {},
    title: '',
    setAttribute(name, value) { attributes[name] = String(value); },
  };
  const context = vm.createContext({
    LAYOUTS: { board: { icon: '<svg>board</svg>', label: 'Bento board' } },
    document: {
      getElementById(id) {
        if (id === 'view-mode-icon') return icon;
        if (id === 'view-mode-btn') return button;
        return null;
      },
    },
    tr: key => `translated:${key}`,
  });
  vm.runInContext(`${viewModeButtonSource}\nupdateViewModeButton('board');`, context, {
    filename: 'layout-button-localization-contract.js',
  });
  assert.equal(button.title, 'translated:action.switchLayout', 'layout tooltip must use localized action copy');
  assert.equal(attributes['aria-label'], 'translated:action.switchLayout', 'layout accessible name must use localized action copy');
  assert.equal(button.dataset.mode, 'board', 'layout button must retain its current-mode diagnostic state');
  assert.equal(icon.innerHTML, '<svg>board</svg>', 'layout button must retain its current-mode icon');
}
function createBoardTodoCompletionReceiptHarness({ done = false, type = 'todo', mode = 'unique', recovery = false } = {}) {
  const item = { id: 'todo-1', type, done };
  const review = { itemId: item.id, itemRef: item };
  const opener = { id: 'todo-check-opener' };
  const context = vm.createContext({
    __item: item,
    __review: review,
    __opener: opener,
    __mode: mode,
    __recovery: recovery,
    __calls: [],
    __frames: [],
    __resolveWrite: null,
    __rejectWrite: null,
    createBoardTodoCompletionContext(candidate) {
      context.__calls.push({ type: 'create', candidate });
      if (candidate !== context.__item || candidate.type !== 'todo' || context.__mode === 'create-stale') return null;
      return context.__review;
    },
    resolveBoardTodoCompletionTarget(candidate) {
      context.__calls.push({ type: 'resolve', candidate });
      if (context.__mode !== 'unique') return null;
      return { item: context.__item };
    },
    setBoardTodoCompletionBusy(candidate, button, busy) {
      context.__calls.push({ type: 'busy', candidate, button, busy });
      return true;
    },
    State: {
      isRecoveryRequired() { return context.__recovery; },
      snapshot(label) { context.__calls.push({ type: 'snapshot', label }); },
      persistNow() {
        context.__calls.push({ type: 'persist' });
        return new Promise((resolve, reject) => {
          context.__resolveWrite = resolve;
          context.__rejectWrite = reject;
        });
      },
      requireRecovery() { context.__recovery = true; context.__calls.push({ type: 'require-recovery' }); },
    },
    showStateRecoveryRequired(error) { context.__calls.push({ type: 'show-recovery', error }); },
    tr: key => `translated:${key}`,
    renderBoard() { context.__calls.push({ type: 'render' }); },
    requestAnimationFrame(callback) {
      context.__calls.push({ type: 'frame' });
      context.__frames.push(callback);
      return context.__frames.length;
    },
    CSS: { escape: value => `escaped-${value}` },
    document: {
      querySelector(selector) {
        context.__calls.push({ type: 'query', selector });
        return { focus() { context.__calls.push({ type: 'focus' }); } };
      },
    },
  });
  vm.runInContext(
    `let boardTodoCompletionMutationPending = null;
${isBoardTodoCompletionPendingSource}
${toggleTodoCompletionSource}
globalThis.__toggleBoardTodoCompletion = toggleBoardTodoCompletion;`,
    context,
    { filename: `board-todo-completion-receipt-${done ? 'done' : 'open'}.js` },
  );
  return context;
}

async function testBoardTodoCompletionReceiptContract() {
  for (const initialDone of [false, true]) {
    const accepted = createBoardTodoCompletionReceiptHarness({ done: initialDone });
    const pending = accepted.__toggleBoardTodoCompletion(accepted.__item, accepted.__opener);
    assert.equal(accepted.__item.done, !initialDone, 'the guarded local graph must invert exactly once');
    assert.deepEqual(
      accepted.__calls.map(call => call.type),
      ['create', 'resolve', 'busy', 'snapshot', 'persist'],
      'exact context, busy state, one snapshot, and one write must begin before feedback',
    );
    assert.equal(accepted.__calls[2].busy, true);
    assert.equal(
      accepted.__calls[3].label,
      `translated:${initialDone ? 'detail.markIncomplete' : 'detail.markComplete'}`,
      'history must name the localized next consequence',
    );
    assert.equal(
      accepted.__calls.some(call => ['render', 'frame', 'query', 'focus'].includes(call.type)),
      false,
      'pending persistence must not repaint the checked state or move focus',
    );
    assert.equal(
      await accepted.__toggleBoardTodoCompletion(accepted.__item, accepted.__opener),
      false,
      'duplicate completion must be refused while the first receipt owns the checkbox',
    );
    assert.equal(accepted.__calls.filter(call => call.type === 'persist').length, 1);
    accepted.__resolveWrite({ ok: true, revision: initialDone ? 12 : 11 });
    assert.equal(await pending, true);
    assert.deepEqual(
      accepted.__calls.slice(5).map(call => call.type),
      ['busy', 'render', 'frame'],
      'acceptance alone may release the busy path, render, and schedule rebuilt focus',
    );
    assert.equal(accepted.__calls[5].busy, false);
    accepted.__frames[0]();
    assert.deepEqual(
      accepted.__calls.slice(-2),
      [
        { type: 'query', selector: '.item[data-id="escaped-todo-1"] .todo-check' },
        { type: 'focus' },
      ],
      'accepted completion must focus the same rebuilt native checkbox',
    );
  }

  for (const [label, options, expectedCreates, expectedResolves] of [
    ['missing item', { type: 'note' }, 0, 0],
    ['stale target', { mode: 'stale' }, 1, 1],
    ['changed before review', { mode: 'create-stale' }, 1, 0],
    ['recovery-owned state', { recovery: true }, 0, 0],
  ]) {
    const refused = createBoardTodoCompletionReceiptHarness(options);
    const before = refused.__item.done;
    assert.equal(await refused.__toggleBoardTodoCompletion(refused.__item, refused.__opener), false, label);
    assert.equal(refused.__item.done, before);
    assert.equal(refused.__calls.filter(call => call.type === 'create').length, expectedCreates);
    assert.equal(refused.__calls.filter(call => call.type === 'resolve').length, expectedResolves);
    assert.equal(refused.__calls.some(call => ['snapshot', 'persist', 'render'].includes(call.type)), false);
  }

  const rejected = createBoardTodoCompletionReceiptHarness();
  const rejection = rejected.__toggleBoardTodoCompletion(rejected.__item, rejected.__opener);
  rejected.__recovery = true;
  rejected.__rejectWrite(Object.assign(new Error('unknown receipt'), { code: 'LOCUS_STATE_UNKNOWN_ACK' }));
  assert.equal(await rejection, false);
  assert.equal(rejected.__calls.filter(call => call.type === 'persist').length, 1, 'failure must not retry');
  assert.deepEqual(
    rejected.__calls.slice(5).map(call => call.type),
    ['busy', 'show-recovery'],
    'failure must release local busy state into recovery without render or focus',
  );
  assert.equal(rejected.__calls.some(call => ['render', 'frame', 'query', 'focus'].includes(call.type)), false);
}

async function testBoardRecordMenuUsesActualPreparedOpener() {
  const anchorListeners = new Map();
  const menuListeners = new Map();
  const focused = [];
  const anchored = [];
  const itemOpeners = [];
  const child = {
    id: 'record-editor',
    closest() { return this; },
  };
  const preparedChild = { id: 'rebuilt-record-editor' };
  const menuButton = {
    id: 'record-more',
    addEventListener(type, listener) { menuListeners.set(type, listener); },
  };
  const anchor = {
    contains(target) { return target === child || target === menuButton; },
    addEventListener(type, listener) { anchorListeners.set(type, listener); },
  };
  const context = vm.createContext({
    focusDialogOpener(opener) { focused.push(opener); },
    showContextMenu() {},
    showAnchoredContextMenu(opener, items) {
      anchored.push({ opener, items });
      return true;
    },
  });
  vm.runInContext(
    `${bindBoardItemContextMenuSource}\nglobalThis.__bindBoardRecordMenu = bindBoardItemContextMenu;`,
    context,
    { filename: 'board-record-menu-contract.js' },
  );
  context.__bindBoardRecordMenu(anchor, opener => {
    itemOpeners.push(opener);
    return [{ text: 'Details' }];
  }, {
    menuButton,
    async prepareOpen(opener) {
      await Promise.resolve();
      return opener === child ? preparedChild : opener;
    },
  });

  let prevented = false;
  let stopped = false;
  anchorListeners.get('keydown')({
    key: 'F10',
    shiftKey: true,
    target: child,
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(prevented, true, 'Shift+F10 from a record child must suppress the native page menu');
  assert.equal(stopped, true, 'Shift+F10 from a record child must not bubble to Board shortcuts');
  assert.deepEqual(focused, [child, preparedChild],
    'the menu must preserve the real child first, then focus its post-receipt replacement');
  assert.equal(anchored.at(-1).opener, preparedChild,
    'the rebuilt child must anchor the menu after inline persistence settles');
  assert.equal(itemOpeners.at(-1), preparedChild,
    'every menu action must receive the same prepared opener used for focus return');

  let pointerPrevented = false;
  menuListeners.get('pointerdown')({ button: 0, preventDefault() { pointerPrevented = true; } });
  assert.equal(pointerPrevented, true,
    'pointer More must keep an active inline editor focused until its receipt settles');
  menuListeners.get('click')({ preventDefault() {}, stopPropagation() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(anchored.at(-1).opener, menuButton, 'More must anchor the same menu when no rebuild is needed');
  assert.equal(itemOpeners.at(-1), menuButton, 'More actions must retain the visible More control as opener');
}

async function testBoardLocalArchiveRestoresFocusAfterReceipt() {
  let settleArchive;
  const calls = { frames: [], focusedItems: [], identities: [], fallbacks: [] };
  const context = vm.createContext({
    archiveBoardLocalItem() {
      return new Promise(resolve => { settleArchive = resolve; });
    },
    requestAnimationFrame(callback) {
      calls.frames.push(callback);
      return calls.frames.length;
    },
    focusItem(id) {
      calls.focusedItems.push(id);
      context.document.activeElement = {
        closest(selector) { return selector.includes(`data-id="${id}"`) ? this : null; },
      };
    },
    focusIdentityTarget(kind, id) { calls.identities.push({ kind, id }); return true; },
    focusItemDetailTarget(target) { calls.fallbacks.push(target); return true; },
    CSS: { escape: value => String(value) },
    document: {
      activeElement: null,
      getElementById() { return { querySelector() { return { id: 'board-heading' }; } }; },
    },
  });
  vm.runInContext(
    `${archiveBoardLocalItemWithFocusSource}\nglobalThis.__archiveLocalWithFocus = archiveBoardLocalItemWithFocus;`,
    context,
    { filename: 'board-local-archive-focus-contract.js' },
  );
  const previous = { id: 'previous' };
  const current = { id: 'current', type: 'note' };
  const next = { id: 'next' };
  const archiving = context.__archiveLocalWithFocus(current, [previous, current, next], { id: 'group-1' }, { id: 'more' });
  assert.deepEqual(calls, { frames: [], focusedItems: [], identities: [], fallbacks: [] },
    'pending local Archive must not move focus or claim completion');
  settleArchive(true);
  assert.equal(await archiving, true);
  assert.equal(calls.frames.length, 1, 'accepted local Archive must schedule one post-rebuild focus continuation');
  calls.frames[0]();
  assert.deepEqual(calls.focusedItems, ['next'], 'accepted local Archive must prefer the next visible sibling');
  assert.deepEqual(calls.identities, [], 'a focused sibling must avoid a broader Group fallback');
  assert.deepEqual(calls.fallbacks, [], 'a focused sibling must avoid the Board fallback');
}

{
  const calls = { frames: [], selectors: [], focused: 0 };
  const context = vm.createContext({
    requestAnimationFrame(callback) {
      calls.frames.push(callback);
      return calls.frames.length;
    },
    isOpenTabsRailAvailable() { return true; },
    CSS: { escape: value => `escaped-${value}` },
    document: {
      getElementById(id) {
        if (id === 'tabrail') return { classList: { contains() { return false; } } };
        return null;
      },
      querySelector(selector) {
        calls.selectors.push(selector);
        return { focus() { calls.focused += 1; } };
      },
    },
  });
  vm.runInContext(
    `${restoreOpenTabSelectionFocusSource}\nrestoreOpenTabSelectionFocus(42);`,
    context,
    { filename: 'opened-tab-selection-focus-contract.js' },
  );
  assert.equal(calls.frames.length, 1, 'opened-tab selection must schedule one post-render focus');
  calls.frames[0]();
  assert.deepEqual(
    calls.selectors,
    ['#open-tabs .otab[data-tid="escaped-42"] .otab-check'],
    'opened-tab focus must resolve the exact rebuilt tab ID and its selection control',
  );
  assert.equal(calls.focused, 1, 'opened-tab focus must land on the rebuilt selection control');
}
{
  const calls = { badges: 0, renders: 0, focusIds: [] };
  const selected = new Set();
  const context = vm.createContext({
    __selected: selected,
    __calls: calls,
  });
  vm.runInContext(
    `let selectedTabIds = globalThis.__selected;
let lastClickedTabId = null;
function selectOpenTabRangeTo(tabId) { selectedTabIds.add(tabId); }
function updateSelectedBadge() { globalThis.__calls.badges += 1; }
function renderOpenTabs() { globalThis.__calls.renders += 1; }
function restoreOpenTabSelectionFocus(tabId) { globalThis.__calls.focusIds.push(tabId); }
${toggleOpenTabSelectionSource}
globalThis.__toggleOpenTabSelection = toggleOpenTabSelection;`,
    context,
    { filename: 'opened-tab-selection-controller-contract.js' },
  );
  context.__toggleOpenTabSelection(42, { restoreFocus: true });
  assert.deepEqual([...selected], [42], 'opened-tab selection must add the exact tab ID');
  assert.deepEqual(calls, { badges: 1, renders: 1, focusIds: [42] }, 'selection must repaint once and restore exact-tab focus');
  context.__toggleOpenTabSelection(42, { restoreFocus: true });
  assert.deepEqual([...selected], [], 'opened-tab deselection must remove the exact tab ID');
  assert.deepEqual(calls, { badges: 2, renders: 2, focusIds: [42, 42] }, 'deselection must repaint once and restore exact-tab focus');
}
for (const key of buildTabLocaleKeys) {
  const en = i18nContext.__I18N.en[key];
  const zhTW = i18nContext.__I18N['zh-TW'][key];
  assert.equal(typeof en, 'string', `English saved-tab copy must define ${key}`);
  assert.equal(typeof zhTW, 'string', `zh-TW saved-tab copy must define ${key}`);
  assert.ok(en.trim(), `English saved-tab copy must not be blank: ${key}`);
  assert.ok(zhTW.trim(), `zh-TW saved-tab copy must not be blank: ${key}`);
  assert.notEqual(zhTW, en, `zh-TW saved-tab copy must not fall back to English: ${key}`);
}
for (const key of [
  'itemAction.openFocused',
  'itemAction.openBackground',
  'itemAction.copyUrl',
  'itemAction.urlCopied',
  'itemAction.copyUrlFailed',
  'itemAction.editTitle',
  'itemAction.addFavorite',
  'itemAction.removeFavorite',
  'itemAction.saveReadLater',
  'itemAction.removeReadLater',
  'itemAction.archived',
]) {
  const en = i18nContext.__I18N.en[key];
  const zhTW = i18nContext.__I18N['zh-TW'][key];
  assert.ok(en?.trim(), `English saved-tab menu copy must define ${key}`);
  assert.ok(zhTW?.trim(), `zh-TW saved-tab menu copy must define ${key}`);
  assert.notEqual(zhTW, en, `zh-TW saved-tab menu copy must not fall back to English: ${key}`);
}

assert.doesNotMatch(css, /\.item-acts|\.item-btn/, 'the retired saved-page hover strip must not leave dead presentation rules');
assert.match(
  css,
  /\.item\.tab\s*\{[^}]*gap:\s*0[^}]*padding:\s*0[^}]*background:\s*var\(--panel\)/s,
  'saved pages must render as stable record slips instead of nested floating prototype cards',
);
assert.match(
  css,
  /\.item\.tab \.board-page-body\s*\{[^}]*min-height:[^}]*padding:/s,
  'saved pages must preserve a deliberate primary-action body at every density',
);
assert.match(
  css,
  /\.item\.tab > \.item-url\s*\{[^}]*font-family:[^;]*var\(--font-mono/s,
  'saved-page source domains must use the established mono locator voice',
);
assert.match(
  css,
  /\.lv-row \.item\.tab\s*\{[^}]*padding:\s*0[^}]*background:\s*var\(--panel\)/s,
  'List view must preserve the saved-page record hierarchy instead of reverting to a loose prototype row',
);
assert.match(boardKeyboardSource, /itemFocusTarget\(/, 'board Arrow navigation must land on the saved item primary action');
assert.match(
  restoreDetailFocusSource,
  /\.item\[data-id="\$\{escaped\}"\] > \.item-top\[data-item-primary="true"\][\s\S]*?\.item\[data-id="\$\{escaped\}"\] > \.item-top > \[data-item-primary="true"\]/,
  'detail close fallback must prefer only the saved item’s own direct primary action',
);
assert.match(
  renderGroupPageSource,
  /buildGroupCol\(g,\s*\{\s*forceExpanded:\s*true\s*\}\)/,
  'a focused Group or Inbox page must render its reusable column explicitly expanded',
);
for (const contract of [
  /const forceExpanded = options\.forceExpanded === true;/,
  /const renderedCollapsed = !forceExpanded && !!g\.collapsed;/,
  /col\.className = ['"]gcol['"] \+ \(renderedCollapsed \? ['"] collapsed['"] : ['"]{2}\);/,
  /gcol-toggle\$\{forceExpanded \? ['"] hidden['"] : ['"]{2}\}/,
  /const toggleCollapse = \(\) => \{\s*if \(forceExpanded\) return;/,
  /toggleCollapse:\s*forceExpanded \? null : toggleCollapse/,
]) {
  assert.match(
    buildGroupColSource,
    contract,
    'force-expanded Group pages must omit collapse state and interaction without changing stored preference',
  );
}
assert.doesNotMatch(
  buildGroupColSource,
  /g\.collapsed\s*=\s*false/,
  'force-expanded rendering must not overwrite the stored collapsed preference',
);

const savedTabContractContext = vm.createContext({
  URL,
  CSS: { escape: value => String(value).replace(/["\\]/g, '\\$&') },
  document: {
    activeElement: null,
    querySelector() { return null; },
  },
  isProto(url) {
    return !url || /^(?:chrome|edge|about|chrome-extension|view-source):/i.test(String(url));
  },
  navigator: {
    clipboard: {
      writeText(url) {
        savedTabContractContext.__copies.push(url);
        return Promise.resolve();
      },
    },
  },
  toast(message, options) {
    savedTabContractContext.__toasts.push({ message, options });
  },
  tr(key) { return key; },
  __copies: [],
  __toasts: [],
});
vm.runInContext(
  `${savedTabHelperSource}\nglobalThis.__savedTab = { isOpenableSavedTabUrl, copySavedTabUrl, itemFocusTarget, focusItem };`,
  savedTabContractContext,
  { filename: 'onboarding-saved-tab-contract.js' },
);
const savedTabApi = savedTabContractContext.__savedTab;
assert.equal(savedTabApi.isOpenableSavedTabUrl('https://example.com/article'), true, 'https saved links must remain openable');
async function assertSavedTabOpenContract() {
  for (const invalidUrl of ['', 'not a URL', 'javascript:alert(1)', 'chrome-extension://locus/newtab.html']) {
    assert.equal(savedTabApi.isOpenableSavedTabUrl(invalidUrl), false, `unsafe or invalid saved URL must not be openable: ${invalidUrl || '(blank)'}`);
  }

  assert.equal(
    await savedTabApi.copySavedTabUrl('https://example.com/copy-me'),
    true,
    'a valid saved URL must report an acknowledged clipboard write',
  );
  assert.equal(savedTabContractContext.__copies.at(-1), 'https://example.com/copy-me',
    'the clipboard helper must preserve the exact saved URL');
  assert.equal(savedTabContractContext.__toasts.at(-1).message, 'itemAction.urlCopied',
    'successful clipboard writes must use localized confirmation');

  savedTabContractContext.navigator.clipboard.writeText = () => Promise.reject(new Error('clipboard denied'));
  assert.equal(
    await savedTabApi.copySavedTabUrl('https://example.com/copy-denied'),
    false,
    'a denied clipboard write must report failure instead of manufacturing success',
  );
  assert.equal(savedTabContractContext.__toasts.at(-1).message, 'itemAction.copyUrlFailed',
    'failed clipboard writes must use localized recovery copy');
  assert.equal(savedTabContractContext.__toasts.at(-1).options.danger, true,
    'failed clipboard writes must expose their error tone');
}

async function assertSavedTabContextMenuContract() {
  const calls = {
    focusedOpeners: [],
    bindings: [],
    detail: [],
    copies: [],
    commonActsOptions: [],
    frames: [],
    focusedItems: [],
    archivedItems: [],
    identityTargets: [],
    fallbackTargets: [],
    toggles: [],
  };
  const primaryListeners = {};
  const primary = {
    addEventListener(type, listener) { primaryListeners[type] = listener; },
  };
  const menuButton = { id: 'saved-page-more' };
  const itemElement = {
    dataset: {},
    querySelector(selector) {
      if (selector === ':scope > .item-top[data-item-primary="true"]') return null;
      if (selector === ':scope > .item-top > [data-item-primary="true"]') return primary;
      if (selector === '.board-record-menu') return menuButton;
      assert.fail(`unexpected saved-page selector: ${selector}`);
    },
  };
  const boardHeading = { id: 'board-heading' };
  const board = {
    querySelector(selector) {
      assert.equal(selector, 'h1, [role="heading"]');
      return boardHeading;
    },
  };
  const document = {
    activeElement: null,
    createElement(tagName) {
      assert.equal(tagName, 'div');
      return itemElement;
    },
    getElementById(id) {
      assert.equal(id, 'board');
      return board;
    },
  };
  const menuContext = vm.createContext({
    document,
    URL,
    CSS: { escape: value => String(value) },
    BLANK_FAV: 'blank',
    cmIcons: {
      open: 'open', copy: 'copy', edit: 'edit', detail: 'detail',
      favorite: 'favorite', readLater: 'read-later', archive: 'archive',
    },
    tr: key => key,
    esc: value => String(value),
    dispUrl: () => 'example.com',
    favUrl: () => 'favicon',
    renderReminderBadge: () => '',
    isOpenableSavedTabUrl: () => true,
    openSavedTabItem: () => true,
    copySavedTabUrl: url => {
      calls.copies.push(url);
      return Promise.resolve(true);
    },
    openItemDetail: (...args) => calls.detail.push(args),
    async archiveSavedPage(target) {
      calls.archivedItems.push({ id: target.id, opener: arguments[1] });
      return true;
    },
    commonActs: (_item, _extra, options) => {
      calls.commonActsOptions.push(options);
      return [
        {
          text: 'test.favorite',
          action() {
            calls.toggles.push('favorite-rebuilt');
            options.afterToggle();
          },
        },
        {
          text: 'test.read-later',
          action() {
            calls.toggles.push('read-later-rebuilt');
            options.afterToggle();
          },
        },
        ...(options.includeColor === false ? [] : [{ text: 'test.color', action() {} }]),
        ...(options.includeReminder === false ? [] : [{ text: 'test.reminder', action() {} }]),
        { text: 'test.archive', action: options.archiveAction },
      ];
    },
    focusDialogOpener: opener => {
      calls.focusedOpeners.push(opener);
      return true;
    },
    requestAnimationFrame: callback => {
      calls.frames.push(callback);
      return calls.frames.length;
    },
    focusItem: id => {
      calls.focusedItems.push(id);
      document.activeElement = {
        closest(selector) {
          return selector === `.item[data-id="${id}"]` ? this : null;
        },
      };
    },
    focusIdentityTarget: (kind, id) => {
      calls.identityTargets.push({ kind, id });
      return true;
    },
    focusItemDetailTarget: target => {
      calls.fallbackTargets.push(target);
      return !!target;
    },
    bindBoardItemContextMenu(anchor, getItems, options) {
      calls.bindings.push({ anchor, getItems, options });
    },
    applyBoardRecordMarker() {},
    applyItemMeta() {},
    attachItemDrag() {},
  });
  vm.runInContext(
    `${buildTabSource}\nglobalThis.__buildTab = buildTab;`,
    menuContext,
    { filename: 'onboarding-saved-tab-menu-contract.js' },
  );

  const item = {
    id: 'saved-menu-1',
    type: 'tab',
    title: 'Saved menu target',
    url: 'https://example.com/saved',
  };
  const previousItem = { id: 'saved-menu-previous' };
  const nextItem = { id: 'saved-menu-next' };
  const parentItems = [previousItem, item, nextItem];
  const group = { id: 'saved-menu-group' };
  assert.equal(menuContext.__buildTab(item, parentItems, group), itemElement);
  assert.equal(calls.bindings.length, 1, 'saved pages must bind one shared More/context-menu controller');
  const binding = calls.bindings[0];
  assert.equal(binding.anchor, itemElement, 'the shared menu controller must own the whole saved-page record');
  assert.equal(binding.options.menuButton, menuButton, 'the persistent More control must anchor its menu');
  const keyboardMenu = { items: binding.getItems(primary) };
  const commonOptions = calls.commonActsOptions.at(-1);
  assert.equal(commonOptions.includeColor, false,
    'the core saved-tab keyboard menu must omit the inaccessible legacy color picker');
  assert.equal(commonOptions.includeReminder, false,
    'the core saved-tab keyboard menu must keep reminder editing in the receipt-gated detail pane');
  assert.equal(commonOptions.mutationOpener, primary,
    'keyboard entry from Open must preserve the true initiating control for receipts and Escape return');
  assert.equal(keyboardMenu.items.some(menuItem => menuItem.text === 'test.color'), false);
  assert.equal(keyboardMenu.items.some(menuItem => menuItem.text === 'test.reminder'), false);
  for (const key of [
    'itemAction.openFocused',
    'itemAction.openBackground',
    'itemAction.copyUrl',
    'itemAction.editTitle',
  ]) {
    assert.ok(keyboardMenu.items.some(menuItem => menuItem.text === key),
      `saved-tab context menu must use localized ${key}`);
  }

  const editTitle = keyboardMenu.items.find(menuItem => menuItem.text === 'itemAction.editTitle');
  editTitle.action();
  assert.equal(calls.focusedOpeners.at(-1), primary,
    'a routed context-menu action must restore the stable primary opener first');
  assert.equal(calls.detail.at(-1)[0], item.id);
  assert.equal(calls.detail.at(-1)[1].initialFocusKey, 'title',
    'Edit title must request the receipt-gated title field as initial focus');

  const copyUrl = keyboardMenu.items.find(menuItem => menuItem.text === 'itemAction.copyUrl');
  assert.equal(await copyUrl.action(), true);
  assert.equal(calls.copies.at(-1), item.url,
    'Copy URL must pass the exact stored address to its receipt helper');

  const flushNextFrame = message => {
    const callback = calls.frames.shift();
    assert.equal(typeof callback, 'function', message);
    callback();
  };
  const favorite = keyboardMenu.items.find(menuItem => menuItem.text === 'test.favorite');
  favorite.action();
  assert.equal(calls.toggles.at(-1), 'favorite-rebuilt',
    'Favorite must synchronously rebuild before requesting focus restoration');
  assert.notEqual(calls.focusedItems.at(-1), item.id,
    'Favorite must not focus a detached pre-rebuild saved-tab control');
  flushNextFrame('Favorite must schedule one post-rebuild focus frame');
  assert.equal(calls.focusedItems.at(-1), item.id,
    'Favorite must restore the rebuilt saved-tab primary action');

  calls.focusedItems.length = 0;
  const readLater = keyboardMenu.items.find(menuItem => menuItem.text === 'test.read-later');
  readLater.action();
  assert.equal(calls.toggles.at(-1), 'read-later-rebuilt',
    'Read Later must synchronously rebuild before requesting focus restoration');
  assert.equal(calls.focusedItems.length, 0,
    'Read Later must not focus a detached pre-rebuild saved-tab control');
  flushNextFrame('Read Later must schedule one post-rebuild focus frame');
  assert.deepEqual(calls.focusedItems, [item.id],
    'Read Later must restore the rebuilt saved-tab primary action');

  const archive = keyboardMenu.items.find(menuItem => menuItem.text === 'test.archive');
  const moreMenu = { items: binding.getItems(menuButton) };
  const moreOptions = calls.commonActsOptions.at(-1);
  assert.equal(moreOptions.mutationOpener, menuButton,
    'visible More entry must keep its own addressable receipt and Escape-return owner');
  const moreArchive = moreMenu.items.find(menuItem => menuItem.text === 'test.archive');
  calls.focusedItems.length = 0;
  await moreArchive.action();
  assert.deepEqual(calls.archivedItems.at(-1), { id: item.id, opener: menuButton },
    'visible More Archive must pass its exact receipt owner to the guarded mutation');
  assert.equal(calls.focusedOpeners.at(-1), menuButton,
    'a More-menu action must restore the true visible opener before dispatch');
  assert.equal(calls.focusedItems.length, 0,
    'More Archive must wait for the board rebuild before choosing a focus successor');
  flushNextFrame('More Archive must schedule post-rebuild successor focus');
  assert.deepEqual(calls.focusedItems, [nextItem.id],
    'More Archive must preserve the next-sibling focus contract');

  parentItems.splice(parentItems.indexOf(nextItem), 1);
  calls.focusedItems.length = 0;
  await archive.action();
  flushNextFrame('Archive must schedule previous-sibling focus when no next sibling remains');
  assert.deepEqual(calls.archivedItems.at(-1), { id: item.id, opener: primary },
    'keyboard Archive must preserve its exact Open-control receipt owner');
  assert.deepEqual(calls.focusedItems, [previousItem.id],
    'Archive must fall back to the previous saved sibling');

  parentItems.splice(parentItems.indexOf(previousItem), 1);
  calls.focusedItems.length = 0;
  await archive.action();
  flushNextFrame('Archive must schedule Group fallback when no sibling remains');
  assert.deepEqual(calls.identityTargets.at(-1), { kind: 'group', id: group.id },
    'Archive must prefer the Group visible identity target after sibling exhaustion');

  group.id = '';
  await archive.action();
  flushNextFrame('Archive must schedule a final board-heading fallback');
  assert.equal(calls.fallbackTargets.at(-1), boardHeading,
    'Archive must fall back to the board heading when no sibling or Group identity remains');
}

const primaryTarget = { id: 'saved-primary' };
const wrapperTarget = {
  id: 'saved-wrapper',
  querySelector(selector) {
    if (selector === ':scope > .item-top[data-item-primary="true"]') return null;
    assert.equal(
      selector,
      ':scope > .item-top > [data-item-primary="true"]',
      'item focus must use the stable direct-child primary-action hook',
    );
    return primaryTarget;
  },
};
assert.equal(savedTabApi.itemFocusTarget(wrapperTarget), primaryTarget, 'item focus must prefer the native primary action');
const nestedPrimary = { id: 'nested-tab-primary' };
const stackTarget = {
  id: 'stack-wrapper',
  querySelector(selector) {
    return selector === '[data-item-primary="true"]' ? nestedPrimary : null;
  },
};
assert.equal(
  savedTabApi.itemFocusTarget(stackTarget),
  stackTarget,
  'Stack focus must stay on the Stack instead of diving into a nested saved tab',
);
const legacyTarget = { id: 'legacy-wrapper', querySelector() { return null; } };
assert.equal(savedTabApi.itemFocusTarget(legacyTarget), legacyTarget, 'item focus must retain a safe legacy fallback');
assert.equal(savedTabApi.itemFocusTarget(null), null, 'missing items must not manufacture a focus target');

const focusCalls = [];
primaryTarget.focus = () => {
  focusCalls.push('focus');
  savedTabContractContext.document.activeElement = primaryTarget;
};
wrapperTarget.scrollIntoView = options => focusCalls.push({ scroll: options });
savedTabContractContext.document.querySelector = selector => {
  assert.equal(selector, '.item[data-id="saved-1"]', 'first-save focus must resolve the exact saved item');
  return wrapperTarget;
};
savedTabApi.focusItem('saved-1');
assert.equal(focusCalls[0], 'focus', 'first-save handoff must focus the primary saved-tab action');
assert.equal(focusCalls[1].scroll.block, 'nearest', 'first-save handoff must reveal the saved tab without jumping surfaces');
assert.equal(
  Object.hasOwn(focusCalls[1].scroll, 'behavior'),
  false,
  'first-save focus must not impose smooth motion',
);
assert.equal(savedTabContractContext.document.activeElement, primaryTarget, 'the wrapper must not retain first-save focus');

class ClassList {
  constructor(...initial) {
    this.values = new Set(initial);
  }

  add(...values) { values.forEach(value => this.values.add(value)); }
  remove(...values) { values.forEach(value => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const next = force === undefined ? !this.contains(value) : !!force;
    if (next) this.add(value);
    else this.remove(value);
    return next;
  }
}

function buildHarness(query, save = async () => false, options = {}) {
  const calls = {
    locks: 0,
    unlocks: 0,
    remembers: 0,
    restores: 0,
    persists: 0,
    inbox: 0,
    focusedItems: [],
    traps: 0,
    saves: [],
    gets: 0,
    toasts: [],
  };
  const listeners = new Map();
  const elements = new Map();
  const document = {
    activeElement: null,
    getElementById(id) { return elements.get(id) || null; },
  };

  function makeElement(id, classes = []) {
    const el = {
      id,
      classList: new ClassList(...classes),
      attributes: new Map(),
      disabled: false,
      textContent: '',
      innerHTML: '',
      src: '',
      onclick: null,
      setAttribute(name, value) { this.attributes.set(name, String(value)); },
      getAttribute(name) { return this.attributes.get(name); },
      focus() { document.activeElement = this; },
      addEventListener(type, listener) { listeners.set(`${id}:${type}`, listener); },
      click() { if (id === 'nav-inbox') calls.inbox += 1; },
    };
    elements.set(id, el);
    return el;
  }

  const opener = makeElement('opener');
  const overlay = makeElement('welcome', ['hidden']);
  makeElement('wc-card').setAttribute('aria-busy', 'false');
  makeElement('wc-candidate').setAttribute('aria-busy', 'true');
  makeElement('wc-candidate-title');
  makeElement('wc-candidate-url');
  makeElement('wc-candidate-fav');
  makeElement('wc-destination');
  makeElement('wc-destination-message', ['hidden']);
  makeElement('wc-status');
  makeElement('wc-empty', ['hidden']);
  makeElement('wc-error', ['hidden']);
  makeElement('wc-retry', ['hidden']);
  makeElement('wc-explore');
  const saveButton = makeElement('wc-save-first');
  saveButton.disabled = true;
  makeElement('nav-inbox');
  document.activeElement = opener;

  const inbox = {
    id: 'inbox-1',
    name: 'Inbox',
    items: Array.from(options.inboxItems || []),
  };
  const space = { id: 'space-1', name: 'Research', groups: [inbox] };
  const workspace = { id: 'workspace-1', name: 'Personal', categories: [space], activeCatId: space.id };
  let destinationValid = options.destinationValid !== false;
  let latestTabs = [];
  const state = {
    activeWsId: workspace.id,
    workspaces: [workspace],
    settings: {
      onboarding: { welcomeSeen: false, hintsSeen: {}, disabled: false },
      tourCompleted: false,
    },
  };
  const context = vm.createContext({
    document,
    chrome: {
      tabs: {
        async query(...args) {
          latestTabs = await query(...args);
          return latestTabs;
        },
        async get(id) {
          calls.gets += 1;
          if (options.get) return options.get(id, latestTabs);
          const tab = latestTabs.find(candidate => candidate.id === id);
          if (!tab) throw new Error('missing tab');
          return { ...tab };
        },
      },
    },
    State: {
      get() { return state; },
      persist() { calls.persists += 1; },
      isRecoveryRequired() { return false; },
    },
    BLANK_FAV: 'chrome-extension://locus/icons/icon32.png',
    isProto(url) { return /^(?:chrome|edge|about|chrome-extension):/.test(url); },
    dispUrl(url) { return new URL(url).hostname; },
    favUrl(url) { return `chrome-extension://locus/_favicon/?pageUrl=${encodeURIComponent(url)}`; },
    activeWs() { return workspace; },
    activeCat() { return space; },
    createInboxCaptureContext() {
      if (!destinationValid) return null;
      return {
        workspaceId: workspace.id,
        spaceId: space.id,
        workspaceRef: workspace,
        spaceRef: space,
        workspaceName: workspace.name,
        spaceName: space.name,
        inboxId: inbox.id,
        inboxRef: inbox,
      };
    },
    resolveInboxCaptureTarget(destination) {
      return destinationValid && destination?.workspaceRef === workspace && destination?.spaceRef === space
        ? { workspace, space, inbox }
        : null;
    },
    homeTrailPathParts(ws, cat, groupName) { return [ws?.name, cat?.name, groupName].filter(Boolean); },
    homeTrailPathText(parts) { return parts.join(' › '); },
    homeTrailPathHtml(parts) { return `<ol class="home-trail-path">${parts.map(part => `<li>${part}</li>`).join('')}</ol>`; },
    tr(key) {
      const copy = {
        'nav.inbox': 'Inbox',
        'welcome.looking': 'Looking for an open tab…',
        'welcome.error': 'Locus couldn’t check your open tabs. Try again, or explore without saving.',
        'welcome.saving': 'Saving before closing…',
        'home.trail.destinationChanged': 'Your save destination changed. Review it before saving.',
        'home.trail.candidateChanged': 'That tab changed. Review the latest page before saving.',
        'home.trail.destinationConflict': 'This space has more than one Inbox. Review the space before saving.',
        'home.trail.noDestination': 'Create a space before saving a tab.',
        'capture.destinationUnavailable': 'Locus couldn’t confirm this Space’s Inbox, so nothing was saved or closed.',
        'capture.failed': 'Save failed — your tabs were left open. Reload Locus before continuing.',
      };
      return copy[key] || key;
    },
    rememberOpener(el) { calls.remembers += 1; el.__opener = document.activeElement; },
    restoreOpener(el) { calls.restores += 1; el.__opener?.focus(); },
    lockBodyScroll() { calls.locks += 1; },
    unlockBodyScroll() { calls.unlocks += 1; },
    focusFirstIn() {
      const first = ['wc-save-first', 'wc-retry', 'wc-explore']
        .map(id => elements.get(id))
        .find(el => !el.disabled && !el.classList.contains('hidden'));
      first?.focus();
    },
    trapTabKey() { calls.traps += 1; },
    async saveTabToInbox(tab, options) {
      calls.saves.push({ tab, options });
      return save(tab, options);
    },
    toast(message, toastOptions) { calls.toasts.push({ message, options: toastOptions }); },
    focusItem(id) { calls.focusedItems.push(id); },
    setTimeout(callback) { callback(); return 1; },
    URL,
  });

  vm.runInContext(
    `${savedTabUrlPolicySource}\n${recentSaveCandidateSource}\n${captureDestinationTabUrlsSource}\n` +
    `${captureDuplicateExistsSource}\n${homeTrailSaveCandidateSource}\n` +
    `${capturedTabSourceDescriptorSource}\n${capturedTabStillMatchesSource}\n${welcomeSource}\n` +
    'globalThis.__welcome = { loadWelcomeCandidate, openWelcome, closeWelcome, bindWelcome };',
    context,
    { filename: 'onboarding-production-contract.js' },
  );

  return {
    api: context.__welcome,
    calls,
    document,
    elements,
    listeners,
    opener,
    overlay,
    state,
    setDestinationValid(value) { destinationValid = !!value; },
  };
}

const newestHomeRowsSource = extractFunction('newestHomeRows');
const recentSaveCandidateSource = extractFunction('recentSaveCandidate');
const homeTrailSaveCandidateSource = extractFunction('homeTrailSaveCandidate');
const capturedTabSourceDescriptorSource = extractFunction('capturedTabSourceDescriptor');
const capturedTabStillMatchesSource = extractFunction('capturedTabStillMatches');
const homeTrailPrimaryCloseSourceSource = extractFunction('homeTrailPrimaryCloseSource');
const homeTrailDestinationContextSource = extractFunction('homeTrailDestinationContext');
const homeTrailDestinationStillMatchesSource = extractFunction('homeTrailDestinationStillMatches');
const resolveHomeTrailSpaceReviewTargetSource = extractFunction('resolveHomeTrailSpaceReviewTarget');
const reportHomeTrailSpaceReviewUnavailableSource = extractFunction('reportHomeTrailSpaceReviewUnavailable');
const openHomeTrailSpaceReviewSource = extractFunction('openHomeTrailSpaceReview');
const organizationGroupTargetSource = extractFunction('organizationGroupTarget');
const identitySpaceTargetSource = extractFunction('identitySpaceTarget');
const identityGroupTargetSource = extractFunction('identityGroupTarget');
const identityItemTargetsSource = extractFunction('identityItemTargets');
const itemDetailValueFingerprintSource = extractFunction('itemDetailValueFingerprint');
const createLandingInboxContextSource = extractFunction('createLandingInboxContext');
const resolveLandingInboxTargetSource = extractFunction('resolveLandingInboxTarget');
const openInboxViewSource = extractFunction('openInboxView');
const updateNavChromeSource = extractFunction('updateNavChrome');
const buildPaletteCommandsSource = extractFunction('buildPaletteCommands');
const bindStaticSource = extractFunction('bindStatic');
const restoreHomeTrailFocusSource = extractFunction('restoreHomeTrailFocus');
const buildHomeTrailSource = extractFunction('buildHomeTrail');
assert.match(
  buildHomeTrailSource,
  /homeTrailRecoveryActionPlan\(item\)/,
  'the visible Home Trail must use one production action plan for its primary and secondary controls',
);
const homeTrailItemCanOfferOpenSource = extractFunction('homeTrailItemCanOfferOpen');
const homeTrailRecoveryActionPlanSource = extractFunction('homeTrailRecoveryActionPlan');
assert.match(
  buildHomeTrailSource,
  /homeTrailCaptureActionPlan\(\{[\s\S]{0,180}recoveryHasPrimary:\s*!!latest/,
  'the visible Home Trail must let one state-aware plan assign capture emphasis',
);
const homeTrailCaptureActionPlanSource = extractFunction('homeTrailCaptureActionPlan');
const homeTrailBlockedDestinationActionPlanSource = extractFunction('homeTrailBlockedDestinationActionPlan');
const saveHomeTrailCandidateSource = extractFunction('saveHomeTrailCandidate');
const homeTrailGroupNameSource = extractFunction('homeTrailGroupName');
const homeTrailPathPartsSource = extractFunction('homeTrailPathParts');
const homeTrailPathTextSource = extractFunction('homeTrailPathText');
const savedItemRecoveryContextSource = extractFunction('createSavedItemRecoveryContext');
const resolveSavedItemRecoveryTargetSource = extractFunction('resolveSavedItemRecoveryTarget');
const openHomeTrailSavedTabSource = extractFunction('openHomeTrailSavedTab');
const homeProgressiveZonePlanSource = extractFunction('homeProgressiveZonePlan');
const buildHomeInboxZoneSource = extractFunction('buildHomeInboxZone');
const renderHomeSource = extractFunction('renderHome');
const commitCapturedTabsSource = extractFunction('commitCapturedTabs');
const captureResultMessageSource = extractFunction('captureResultMessage');
const captureReceiptPresentationSource = extractFunction('captureReceiptPresentation');
const openCapturedItemReceiptSource = extractFunction('openCapturedItemReceipt');
const toastCapturedItemReceiptSource = extractFunction('toastCapturedItemReceipt');
const syncToastMessageScrollAccessSource = extractFunction('syncToastMessageScrollAccess');
const handleToastMessageScrollKeySource = extractFunction('handleToastMessageScrollKey');
const bindToastReceiptSource = extractFunction('bindToastReceipt');
const toastSource = extractFunction('toast');
const saveTabToInboxSource = extractFunction('saveTabToInbox');
const createInboxCaptureContextSource = extractFunction('createInboxCaptureContext');
const resolveInboxCaptureTargetSource = extractFunction('resolveInboxCaptureTarget');
const materializeInboxCaptureTargetSource = extractFunction('materializeInboxCaptureTarget');
const reportInboxCaptureUnavailableSource = extractFunction('reportInboxCaptureUnavailable');
const captureDestinationReceiptMessageSource = extractFunction('captureDestinationReceiptMessage');
const inboxCaptureReceiptMessageSource = extractFunction('inboxCaptureReceiptMessage');
const collectItemListCaptureTargetsSource = extractFunction('collectItemListCaptureTargets');
const createItemListCaptureContextSource = extractFunction('createItemListCaptureContext');
const resolveItemListCaptureTargetSource = extractFunction('resolveItemListCaptureTarget');
const createCaptureDestinationReceiptContextSource = extractFunction('createCaptureDestinationReceiptContext');
const resolveCaptureDestinationReceiptTargetSource = extractFunction('resolveCaptureDestinationReceiptTarget');
const revealCaptureDestinationStackPathSource = extractFunction('revealCaptureDestinationStackPath');
const openCaptureDestinationReceiptSource = extractFunction('openCaptureDestinationReceipt');
const toastCaptureDestinationReceiptSource = extractFunction('toastCaptureDestinationReceipt');
const createGeneratedGroupCaptureContextSource = extractFunction('createGeneratedGroupCaptureContext');
const resolveGeneratedGroupCaptureTargetSource = extractFunction('resolveGeneratedGroupCaptureTarget');
const reportGeneratedGroupCaptureUnavailableSource = extractFunction('reportGeneratedGroupCaptureUnavailable');
const generatedCaptureGroupNameSource = extractFunction('generatedCaptureGroupName');
const createOrganizationIdAllocatorSource = extractFunction('createOrganizationIdAllocator');
const createGroupCaptureContextSource = extractFunction('createGroupCaptureContext');
const resolveGroupCaptureTargetSource = extractFunction('resolveGroupCaptureTarget');
const reportGroupCaptureUnavailableSource = extractFunction('reportGroupCaptureUnavailable');
const topbarSaveReviewPresentationSource = extractFunction('topbarSaveReviewPresentation');
const saveReviewedTopbarTabSource = extractFunction('saveReviewedTopbarTab');
const saveMostRecentOpenTabSource = extractFunction('saveMostRecentOpenTab');
const palSaveActiveTabSource = extractFunction('_palSaveActiveTab');
const saveAllTabsSource = extractFunction('saveAllTabs');
const captureEligibleTabsSource = extractFunction('captureEligibleTabs');
const captureDestinationTabUrlsSource = extractFunction('captureDestinationTabUrls');
const captureDuplicateExistsSource = extractFunction('captureDuplicateExists');
const createCaptureBatchDuplicateFilterSource = extractFunction('createCaptureBatchDuplicateFilter');
const selectedCaptureTabsSource = extractFunction('selectedCaptureTabs');
const clearCapturedTabSelectionSource = extractFunction('clearCapturedTabSelection');
const saveSelectedToInboxSource = extractFunction('saveSelectedToInbox');
const saveSelectedAsGroupSource = extractFunction('saveSelectedAsGroup');
const addSidebarOrActiveTabToGroupSource = extractFunction('addSidebarOrActiveTabToGroup');
const handleTabDropIntoListSource = extractFunction('handleTabDropIntoList');
const dropTabsIntoCategorySource = extractFunction('dropTabsIntoCategory');
const createStackDropPreviewSource = extractFunction('createStackDropPreview');
const buildStackSource = extractFunction('buildStack');
const makeGroupDropZoneSource = extractFunction('makeGroupDropZone');
const buildLvStackSource = extractFunction('buildLvStack');
const paletteSaveActiveTabSource = extractFunction('_palSaveActiveTab');
const paletteOpenSavedLinkSource = extractFunction('_palOpenSavedLink');
const paletteSavedLinkCommandSource = extractFunction('_palSavedLinkCommand');
const paletteRecentCommandsSource = extractFunction('_palRecentCommands');
const paletteMatchingLinksSource = extractFunction('_palMatchingLinks');
const paletteRunSource = extractFunction('_palRun');
const resolveLandingRecoveryTargetSource = extractFunction('resolveLandingRecoveryTarget');
const refreshOpenTabsSource = extractFunction('refreshOpenTabs');

assert.match(
  source,
  /function stackActionMenuItems\(stack, opener, options = \{\}\)/,
  'Board and List Stack menus must share one exact-target action model',
);
for (const [label, handlerSource, classPrefix] of [
  ['Board', buildStackSource, 'stack'],
  ['List', buildLvStackSource, 'lv-stack'],
]) {
  assert.match(
    handlerSource,
    /home\.previewType\.stack[\s\S]*?itemCnt === 1[\s\S]*?groupAction\.oneItem[\s\S]*?groupAction\.items/,
    `${label} Stack must expose localized type and item-count context`,
  );
  assert.match(
    handlerSource,
    new RegExp(`class="${classPrefix}-more"[\\s\\S]*?data-item-archive="menu"[\\s\\S]*?library\\.moreActions`),
    `${label} Stack must expose one persistent item-named More control and Archive receipt owner`,
  );
  assert.match(
    handlerSource,
    /const stackMenuItems = opener => stackActionMenuItems\(it, opener,[\s\S]*?bindBoardItemContextMenu\(hd, stackMenuItems, \{ menuButton \}\);/,
    `${label} More, pointer context, Context Menu, and Shift+F10 must share the actual-opener Stack menu`,
  );
  assert.doesNotMatch(
    handlerSource,
    /function openStackMenu|const openStackMenu|showContextMenu\(|hd\.addEventListener\('contextmenu'|stack-intent-btn/,
    `${label} Stack must not retain duplicate pointer menu or intention-icon paths`,
  );
}
assert.match(
  buildStackSource,
  /el\.style\.setProperty\('--stack-tint', it\.color\)/,
  'Board Stack must render its real stored identity color without rewriting imported bytes',
);
assert.match(
  buildLvStackSource,
  /wrap\.style\.setProperty\('--stack-tint', it\.color\)[\s\S]*?wrap\.style\.setProperty\('--stack-indent', `\$\{16 \+ depth \* 18\}px`\)/,
  'List Stack must render its real identity color at its truthful nesting depth',
);
assert.match(
  css,
  /\.item\.stack::before\s*\{[^}]*width:\s*3px;[^}]*background:\s*var\(--stack-tint,\s*var\(--border2\)\)/s,
  'Board Stack must use one restrained identity-color binder rail',
);
assert.match(
  css,
  /\.lv-stack::before\s*\{[^}]*left:\s*calc\(var\(--stack-indent,\s*34px\) - 7px\);[^}]*width:\s*2px;[^}]*background:\s*var\(--stack-tint,\s*var\(--border2\)\)/s,
  'List Stack must place the binder rail at the real nesting depth',
);
for (const [selector, label] of [
  ['\\.stack-toggle', 'Board collapse'],
  ['\\.stack-sym', 'Board symbol'],
  ['\\.stack-more', 'Board More'],
  ['\\.lv-stack-toggle', 'List collapse'],
  ['\\.lv-stack-sym', 'List symbol'],
  ['\\.lv-stack-more', 'List More'],
]) {
  assert.match(
    css,
    new RegExp(`${selector}\\s*\\{[^}]*?(?:width|min-width):\\s*40px[\\s\\S]*?(?:height|min-height):\\s*40px`, 's'),
    `${label} must expose a 40 px target`,
  );
}
assert.match(
  css,
  /:is\(\.stack-meta, \.lv-stack-meta\)\s*\{[^}]*font-family:\s*var\(--font-mono\)/s,
  'Stack type and count must use the established filing locator voice',
);
assert.doesNotMatch(
  css,
  /\.(?:stack-cnt|lv-stack-cnt)\s*\{[^}]*(?:background|border|border-radius):/s,
  'Stack counts must not remain pill badges',
);
assert.match(
  css,
  /@media \(max-width:\s*560px\)\s*\{[\s\S]*?:is\(\.stack-kind, \.lv-stack-kind\)\s*\{[^}]*display:\s*none;/s,
  'compact Stack headers must spend width on the real name and recovery controls',
);
assert.match(
  css,
  /@media \(forced-colors:\s*active\)\s*\{[\s\S]*?:is\(\.item\.stack, \.lv-stack\)::before\s*\{[^}]*background:\s*Highlight;[^}]*forced-color-adjust:\s*none;/s,
  'the nested Stack locator must remain visible in forced colors',
);

for (const [label, handlerSource] of [
  ['selected Inbox Save', saveSelectedToInboxSource],
  ['selected Group Save', saveSelectedAsGroupSource],
  ['existing Group add', addSidebarOrActiveTabToGroupSource],
]) {
  assert.match(
    handlerSource,
    /renderOpenTabs\(\);[\s\S]{0,80}updateSelectedBadge\(\);[\s\S]{0,80}restoreOpenTabCaptureFocus\(\);/,
    `${label} must restore a stable rail focus after repainting a successful selection`,
  );
}
for (const [label, handlerSource] of [
  ['board stack', buildStackSource],
  ['list stack', buildLvStackSource],
]) {
  const hoverStart = handlerSource.indexOf("hd.addEventListener('dragover'");
  const hoverEnd = handlerSource.indexOf("hd.addEventListener('dragleave'", hoverStart);
  const hoverSource = handlerSource.slice(hoverStart, hoverEnd);
  assert.match(
    hoverSource,
    /if \(drag\.kind === 'tab' && !isOpenableSavedTabUrl\(drag\.data\?\.url\)\) return;[\s\S]*if \(drag\.kind === 'tabs-multi' && !captureEligibleTabs\(drag\.data\)\.length\) return;[\s\S]*e\.preventDefault\(\)[\s\S]*dropPreview\.schedule\(\)/,
    `${label} hover must refuse unsupported browser drags before auto-expansion`,
  );
  const dropStart = handlerSource.indexOf("hd.addEventListener('drop'");
  const dropSource = handlerSource.slice(dropStart);
  assert.match(
    dropSource,
    /dropPreview\.clear\(\);[\s\S]{0,180}if \(drag\.kind === 'tab'\) \{\s*await handleTabDropIntoList\(drag\.data, it\.items, it\.items\.length, \{\s*afterSnapshot: \(\) => dropPreview\.commit\(\)/,
    `${label} single drops must delegate eligibility, history, and post-snapshot Stack expansion to the shared controller`,
  );
  assert.match(
    dropSource,
    /else if \(drag\.kind === 'tabs-multi'\) \{\s*await handleTabDropIntoList\(drag\.data, it\.items, it\.items\.length, \{\s*afterSnapshot: \(\) => dropPreview\.commit\(\)/,
    `${label} multi-drops must share the same duplicate-safe controller and post-snapshot Stack expansion`,
  );
}

function assertStackDropPreviewLifecycle() {
  const classes = new Set();
  const attributes = new Map();
  const item = { expanded: false };
  let timer = null;
  let dragEndHandler = null;
  const context = vm.createContext({
    __item: item,
    __container: {
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); },
      },
    },
    __toggle: {
      setAttribute(name, value) { attributes.set(name, value); },
    },
    setTimeout(callback) { timer = callback; return 1; },
    clearTimeout() { timer = null; },
    document: {
      addEventListener(type, handler) {
        assert.equal(type, 'dragend');
        dragEndHandler = handler;
      },
      removeEventListener(type, handler) {
        assert.equal(type, 'dragend');
        if (dragEndHandler === handler) dragEndHandler = null;
      },
    },
  });
  vm.runInContext(
    `${createStackDropPreviewSource}\n` +
    'globalThis.__preview = createStackDropPreview(__container, __toggle, __item);',
    context,
    { filename: 'stack-drop-preview-contract.js' },
  );

  context.__preview.schedule();
  assert.equal(typeof timer, 'function', 'eligible hover must schedule one bounded preview');
  const runPreview = timer;
  runPreview();
  assert.equal(classes.has('expanded'), true, 'hover completion must expand only the rendered Stack');
  assert.equal(attributes.get('aria-expanded'), 'true', 'hover preview must keep visual and ARIA state aligned');
  assert.equal(typeof dragEndHandler, 'function', 'a started preview must own drag-cancel cleanup');

  dragEndHandler();
  assert.equal(classes.has('expanded'), false, 'drag cancel must remove an uncommitted expansion preview');
  assert.equal(attributes.get('aria-expanded'), 'false', 'drag cancel must restore collapsed ARIA state');

  context.__preview.schedule();
  const runRejectedPreview = timer;
  runRejectedPreview();
  context.__preview.clear();
  assert.equal(item.expanded, false, 'a rejected or duplicate-only drop must not commit expansion');
  assert.equal(classes.has('expanded'), false, 'a rejected drop must clear its visual preview');

  context.__preview.schedule();
  const runAcceptedPreview = timer;
  runAcceptedPreview();
  context.__preview.commit();
  assert.equal(item.expanded, true, 'accepted post-snapshot commit must own durable expansion');
  assert.equal(classes.has('expanded'), true, 'accepted expansion must survive preview cleanup');
  assert.equal(attributes.get('aria-expanded'), 'true', 'accepted expansion must retain truthful ARIA state');
  assert.equal(dragEndHandler, null, 'accepted expansion must release the cancel listener');
}

assert.match(
  refreshOpenTabsSource,
  /allOpenTabs = all\.filter\(t => !isProto\(t\.url\)\)/,
  'the rail must keep every non-internal open tab visible for switching and explicit Close',
);
assert.match(
  dropTabsIntoCategorySource,
  /const draggedTabs = captureEligibleTabs\([\s\S]{0,180}\);[\s\S]{0,100}if \(!draggedTabs\.length\) return false;[\s\S]{0,180}State\.snapshot/,
  'Space drops must apply the Reopen allowlist before history or graph mutation',
);
assert.match(
  dropTabsIntoCategorySource,
  /clearCapturedTabSelection\(draggedTabs\)[\s\S]{0,120}renderOpenTabs\(\)/,
  'a mixed Space drop must repaint and retain only the unsupported selection',
);
for (const [label, handlerSource] of [
  ['board stack', buildStackSource],
  ['group insertion zone', makeGroupDropZoneSource],
  ['list stack', buildLvStackSource],
]) {
  assert.match(
    handlerSource,
    /else if \(drag\.kind === 'tabs-multi'\) \{\s*await handleTabDropIntoList\(drag\.data,/,
    `${label} multi-drops must delegate to the shared Reopen-policy capture controller`,
  );
}
assert.match(
  handleTabDropIntoListSource,
  /const candidateTabs = captureEligibleTabs\([\s\S]{0,180}if \(!candidateTabs\.length[\s\S]*State\.snapshot[\s\S]*clearCapturedTabSelection\(candidateTabs\)[\s\S]{0,120}renderOpenTabs\(\)/,
  'the shared Group/Stack drop controller must apply Reopen eligibility before history and retain unsupported selection after acceptance',
);

async function assertUnsafeDirectCaptureRejected() {
  const cat = { id: 'space-1', groups: [] };
  const calls = { snapshots: 0, commits: 0, renders: 0, results: 0 };
  const context = vm.createContext({
    URL,
    activeCat() { return cat; },
    State: {
      snapshot() { calls.snapshots += 1; return 'action-1'; },
      get() { return { settings: { closeTabOnSave: true } }; },
      rollbackSnapshot() {},
    },
    tr(key) { return key; },
    captureDuplicateExists() { return false; },
    captureTabFields(tab) { return { title: tab.title || tab.url, fav: '' }; },
    stampNew(item) { return item; },
    uid() { return 'captured-1'; },
    async commitCapturedTabs() {
      calls.commits += 1;
      return { actionId: 'action-1', closeSources: true, requestedCloseCount: 1, closedCount: 1, failedCloseCount: 0 };
    },
    renderBoard() { calls.renders += 1; },
    toastCaptureResult() { calls.results += 1; },
  });
  vm.runInContext(
    `${savedTabUrlPolicySource}\n${saveTabToInboxSource}\nglobalThis.__saveTabToInbox = saveTabToInbox;`,
    context,
    { filename: 'direct-capture-url-policy-contract.js' },
  );

  const result = await context.__saveTabToInbox({
    id: 81,
    windowId: 4,
    title: 'Private local draft',
    url: 'data:text/plain,unfinished',
  }, { closeSource: true });

  assert.equal(result, false,
    'a page the shared Reopen contract rejects must not report a successful direct save');
  assert.deepEqual(cat.groups, [],
    'an unreopenable direct capture must not create an Inbox or saved item');
  assert.deepEqual(calls, { snapshots: 0, commits: 0, renders: 0, results: 0 },
    'an unreopenable direct capture must stop before history, persistence, source cleanup, render, or success feedback');
}

async function assertBoardLocalRecordUsesRetainedSafeIdentity() {
  for (const type of ['note', 'todo']) {
    const group = {
      id: 'group-1',
      name: 'Inbox',
      items: [{ id: 'active-collision', type: 'tab', title: 'Existing', url: 'https://existing.test' }],
    };
    const space = { id: 'space-1', name: 'Research', groups: [group] };
    const workspace = { id: 'workspace-1', name: 'Personal', categories: [space] };
    const state = {
      workspaces: [workspace],
      archive: [{ kind: 'item', data: { id: 'archive-collision', type: 'note', html: 'Archived' } }],
      trash: [{ kind: 'item', data: { id: 'trash-collision', type: 'todo', text: 'Trashed' } }],
      settings: {},
    };
    const ids = ['active-collision', 'archive-collision', 'trash-collision', `${type}-fresh`];
    const calls = { persists: 0, snapshots: 0, opened: [], recovery: 0 };
    const context = vm.createContext({
      State: {
        get() { return state; },
        isRecoveryRequired() { return false; },
        snapshot() { calls.snapshots += 1; return 'local-record-action'; },
        async persistNow() { calls.persists += 1; return { ok: true }; },
        requireRecovery() { calls.recovery += 1; },
      },
      LocusImportUtils,
      uid() { return ids.shift(); },
      tr(key) { return key; },
      toast() {},
      stampNew(item) { return { ...item, createdAt: 1 }; },
      createBoardLocalRecordContext(candidate, candidateType) {
        return candidate === group && candidateType === type
          ? { type, groupId: group.id, groupRef: group, destinationContext: {} }
          : null;
      },
      resolveBoardLocalRecordCreateTarget(recordContext) {
        return recordContext?.groupRef === group ? { group, list: group.items } : null;
      },
      setBoardLocalRecordCreateBusy() {},
      focusBoardLocalRecordCreateOpener() { return true; },
      createCaptureDestinationReceiptContext(_destination, items) {
        return items.length === 1 && group.items.includes(items[0]) ? { item: items[0] } : null;
      },
      resolveCaptureDestinationReceiptTarget(receipt) {
        return receipt?.item && group.items.includes(receipt.item) ? { items: [receipt.item] } : null;
      },
      showStateRecoveryRequired() {},
      renderAll() {},
      renderBoard() {},
      openGroupPage() {},
      requestAnimationFrame(callback) { callback(); },
      document: { querySelector() { return {}; } },
      CSS: { escape(value) { return String(value); } },
      itemFocusTarget() { return { id: 'local-record-primary' }; },
      openBoardRecordDetail(item) { calls.opened.push(item.id); return true; },
    });
    vm.runInContext(
      `let boardLocalRecordCreatePending = null;\n` +
      `const isBoardLocalRecordCreatePending = () => !!boardLocalRecordCreatePending;\n` +
      `${createOrganizationIdAllocatorSource}\n${createBoardLocalRecordSource}\n` +
      `globalThis.__createBoardLocalRecord = createBoardLocalRecord;`,
      context,
      { filename: 'board-local-record-identity-contract.js' },
    );

    const created = await context.__createBoardLocalRecord(group, type);
    assert.equal(created?.id, `${type}-fresh`,
      `${type} creation must skip active, Archive, and Trash identities`);
    assert.equal(group.items.at(-1), created,
      `${type} creation must persist the exact newly allocated object`);
    assert.deepEqual(calls, { persists: 1, snapshots: 1, opened: [`${type}-fresh`], recovery: 0 },
      `${type} creation must acknowledge once and open Details for the same exact identity`);
  }
}

async function assertWindowCaptureUsesReopenableUrlsOnly() {
  const cat = { id: 'space-1', name: 'Research', groups: [] };
  const workspace = { id: 'workspace-1', name: 'Personal', activeCatId: cat.id, categories: [cat] };
  const state = {
    workspaces: [workspace], activeWsId: workspace.id, archive: [], trash: [],
    settings: { closeTabOnSave: true },
  };
  const calls = {
    snapshots: [], committedIds: [], commitOptions: null, resultBase: '', empty: 0,
    receiptContexts: 0, destinationToasts: 0, staleResultToasts: 0, order: [],
  };
  const queriedTabs = [
    { id: 10, url: 'data:text/plain,private', title: 'Data draft' },
    { id: 11, url: 'http://example.com/page', title: 'HTTP' },
    { id: 12, url: 'https://example.com/page', title: 'HTTPS' },
    { id: 13, url: 'ftp://example.com/file.txt', title: 'FTP' },
    { id: 14, url: 'file:///C:/Users/test/page.html', title: 'File' },
    { id: 15, url: 'blob:https://example.com/private', title: 'Blob draft' },
    { id: 16, url: 'javascript:alert(1)', title: 'Script page' },
  ];
  const generatedIds = ['space-1', 'window-group', 'window-item-1', 'window-item-2', 'window-item-3', 'window-item-4'];
  const copy = {
    'capture.pending': 'Another save is pending',
    'capture.windowReadFailed': 'Window read failed',
    'capture.noWindowTabs': 'No saveable tabs',
    'capture.windowDestinationUnavailable': 'Destination unavailable',
    'capture.snapshotWindow': 'Save {count} open tabs as a Group',
    'capture.sessionName': 'Session {date} {time}',
    'capture.receiptSavedTab': 'Saved 1 tab to {destination}',
    'capture.receiptSavedTabs': 'Saved {count} tabs to {destination}',
    'capture.receiptSavedTabCopy': 'Saved 1 tab copy to {destination}',
    'capture.receiptSavedTabsCopy': 'Saved {count} tab copies to {destination}',
    'capture.savedWindow': 'Saved this window as a Group',
    'capture.savedWindowCopy': 'Saved copies from this window as a Group',
  };
  const context = vm.createContext({
    URL,
    chrome: { tabs: { async query() { return queriedTabs; } } },
    activeWs() { return workspace; },
    activeCat() { return cat; },
    isProto(url) { return /^(?:chrome|edge|about|view-source):/.test(String(url)); },
    State: {
      get() { return state; },
      isRecoveryRequired() { return false; },
      snapshot(label) { calls.snapshots.push(label); calls.order.push('snapshot'); return 'action-window'; },
    },
    LocusImportUtils: { collectEntityIds() { return new Set([workspace.id, cat.id]); } },
    appLocale() { return 'en-US'; },
    uid() { return generatedIds.shift(); },
    tr(key, vars = {}) {
      return String(copy[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
    },
    captureTabFields(tab) { return { title: tab.title, fav: '' }; },
    stampNew(item) { return item; },
    createItemListCaptureContext(items) {
      const group = cat.groups.find(candidate => candidate.items === items);
      return group ? {
        listRef: items,
        workspaceRef: workspace,
        spaceRef: cat,
        groupRef: group,
        workspaceName: workspace.name,
        spaceName: cat.name,
        groupName: group.name,
      } : null;
    },
    createCaptureDestinationReceiptContext(destinationContext, items) {
      calls.receiptContexts += 1;
      return { destinationContext, itemRefs: Array.from(items) };
    },
    resolveItemListCaptureTarget(destinationContext) {
      const group = cat.groups.find(candidate => candidate.items === destinationContext?.listRef);
      return group
        && destinationContext.workspaceRef === workspace
        && destinationContext.spaceRef === cat
        && destinationContext.groupRef === group
        && destinationContext.workspaceName === workspace.name
        && destinationContext.spaceName === cat.name
        && destinationContext.groupName === group.name
        ? { workspace, space: cat, group, stacks: [] }
        : null;
    },
    resolveCaptureDestinationReceiptTarget(receiptContext) {
      const target = context.resolveItemListCaptureTarget(receiptContext?.destinationContext);
      return target && receiptContext.itemRefs.every(item => target.group.items.includes(item))
        ? { ...target, items: receiptContext.itemRefs }
        : null;
    },
    async commitCapturedTabs(tabs, options) {
      calls.order.push('commit');
      calls.committedIds = Array.from(tabs, tab => tab.id);
      calls.commitOptions = options;
      return { actionId: 'action-window', closeSources: true, requestedCloseCount: tabs.length, closedCount: tabs.length, failedCloseCount: 0 };
    },
    syncOpenTabRailCaptureControls() {},
    renderBoard() {},
    toastCaptureDestinationReceipt(receiptContext, message) {
      calls.destinationToasts += 1;
      calls.order.push('success');
      calls.resultBase = message;
      assert.ok(context.resolveCaptureDestinationReceiptTarget(receiptContext),
        'accepted Save all feedback must retain a currently resolvable exact destination');
    },
    toastCaptureResult() { calls.staleResultToasts += 1; },
    toast() { calls.empty += 1; },
  });
  vm.runInContext(
    `let captureCommitPending = false; let saveAllTabsPending = false;\n` +
    `${identitySpaceTargetSource}\n${createGeneratedGroupCaptureContextSource}\n` +
    `${resolveGeneratedGroupCaptureTargetSource}\n${reportGeneratedGroupCaptureUnavailableSource}\n` +
    `${generatedCaptureGroupNameSource}\n${createOrganizationIdAllocatorSource}\n` +
    `${homeTrailGroupNameSource}\n${homeTrailPathPartsSource}\n${homeTrailPathTextSource}\n` +
    `${captureDestinationReceiptMessageSource}\n${savedTabUrlPolicySource}\n${saveAllTabsSource}\n` +
    'globalThis.__saveAllTabs = saveAllTabs;',
    context,
    { filename: 'window-capture-url-policy-contract.js' },
  );

  const result = await context.__saveAllTabs();

  assert.deepEqual(
    Array.from(cat.groups[0].items, item => item.url),
    [
      'http://example.com/page',
      'https://example.com/page',
      'ftp://example.com/file.txt',
      'file:///C:/Users/test/page.html',
    ],
    'Save all must persist exactly the URL protocols supported by Reopen',
  );
  assert.equal(cat.groups[0].id, 'window-group',
    'Save all must skip a graph-wide ID collision before creating its Group');
  assert.deepEqual(Array.from(cat.groups[0].items, item => item.id),
    ['window-item-1', 'window-item-2', 'window-item-3', 'window-item-4'],
    'Save all must allocate every generated item from the same collision-safe allocator');
  assert.deepEqual(calls.committedIds, [11, 12, 13, 14],
    'Save all must pass every supported saved source, and no unsupported source, into guarded close-after-save');
  assert.deepEqual(calls.snapshots, ['Save 4 open tabs as a Group'],
    'a mixed window with supported pages must remain one localized capture transaction');
  assert.equal(calls.commitOptions.closeSources, true,
    'the reviewed close preference must reach the guarded commit explicitly');
  assert.equal(typeof calls.commitOptions.validateDestination, 'function',
    'Save all must carry exact destination authority through persistence and source cleanup');
  assert.equal(calls.commitOptions.validateDestination(), true,
    'the accepted Save all receipt must still resolve the generated Group and saved items');
  assert.equal(calls.receiptContexts, 1,
    'Save all must freeze one exact generated-Group receipt before persistence');
  assert.equal(calls.destinationToasts, 1,
    'Save all must expose the accepted exact destination through the shared receipt action');
  assert.equal(calls.staleResultToasts, 0,
    'Save all must not fall back to a non-resolvable destination success path');
  cat.groups[0].name = 'Changed after receipt';
  assert.equal(calls.commitOptions.validateDestination(), false,
    'renaming the generated Group after review must revoke source-close authority');
  assert.match(calls.resultBase, /^Saved 4 tabs to Personal › Research › Session /,
    'window feedback must name the exact generated Group and count only recoverable pages');
  assert.deepEqual(calls.order, ['snapshot', 'commit', 'success'],
    'Save all must expose success only after the one guarded commit');
  assert.equal(calls.empty, 0, 'a mixed window with supported pages must not report an empty capture');
  assert.equal(result, true, 'an exact accepted window capture must report completion');
}

async function assertMixedSelectionSavesRecoverableTabsOnly() {
  const tabs = [
    { id: 21, windowId: 7, active: false, url: 'https://example.com/keep', title: 'Web page' },
    { id: 22, windowId: 7, active: false, url: 'blob:https://example.com/private', title: 'Blob draft' },
    { id: 23, windowId: 7, active: false, url: 'file:///C:/Users/test/notes.html', title: 'Local notes' },
    { id: 24, windowId: 7, active: false, url: 'data:text/plain,private', title: 'Data draft' },
  ];
  const selected = new Set(tabs.map(tab => tab.id));
  const cat = { id: 'space-1', name: 'Research', groups: [] };
  const workspace = { id: 'workspace-1', name: 'Personal', activeCatId: cat.id, categories: [cat] };
  const state = { workspaces: [workspace], activeWsId: workspace.id, settings: { closeTabOnSave: true } };
  const calls = { snapshot: '', committedIds: [], badgeUpdates: 0, railRenders: 0, focusRestores: 0, resultBase: '' };
  let nextId = 0;
  const context = vm.createContext({
    URL,
    __tabs: tabs,
    __selected: selected,
    activeWs() { return workspace; },
    activeCat() { return cat; },
    State: {
      get() { return state; },
      isRecoveryRequired() { return false; },
      snapshot(label) { calls.snapshot = label; return 'action-selected'; },
      rollbackSnapshot() { return true; },
    },
    appLocale() { return 'en'; },
    uid() { nextId += 1; return `selected-${nextId}`; },
    createOrganizationIdAllocator() {
      return () => { nextId += 1; return `selected-${nextId}`; };
    },
    identityItemTargets(ids) {
      const targets = [];
      for (const id of ids) {
        const index = cat.groups[0].items.findIndex(item => item.id === id);
        if (index < 0) return null;
        targets.push({
          workspace, space: cat, group: cat.groups[0], item: cat.groups[0].items[index],
          parentItems: cat.groups[0].items, ancestorStackIds: [], index, order: index,
        });
      }
      return { targets, nested: false };
    },
    itemDetailValueFingerprint(value) { return JSON.stringify(value); },
    captureTabFields(tab) { return { title: tab.title, fav: '' }; },
    stampNew(item) { return item; },
    async commitCapturedTabs(captured) {
      calls.committedIds = Array.from(captured, tab => tab.tabId ?? tab.id);
      return { actionId: 'action-selected', closeSources: true, requestedCloseCount: captured.length, closedCount: captured.length, failedCloseCount: 0 };
    },
    renderBoard() {},
    renderOpenTabs() { calls.railRenders += 1; },
    updateSelectedBadge() { calls.badgeUpdates += 1; },
    restoreOpenTabCaptureFocus() { calls.focusRestores += 1; },
    toastCaptureDestinationReceipt(receipt, base) { calls.resultBase = base; return !!receipt; },
    tr(key, vars = {}) {
      const copy = {
        'capture.snapshotSelectionGroup': 'Save {count} selected tabs as a Group',
        'capture.selectedGroupName': '{count} tabs · {date}',
        'capture.receiptSavedTabs': 'Saved {count} tabs to {destination}',
      };
      return String(copy[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
    },
    homeTrailGroupName(group) { return group.name; },
    homeTrailPathParts(ws, space, groupName) { return [ws.name, space.name, groupName]; },
    homeTrailPathText(parts) { return parts.join(' › '); },
    reportGeneratedGroupCaptureUnavailable() { return false; },
    renderAll() {},
    toast() {},
  });
  vm.runInContext(
    `let allOpenTabs = __tabs; let selectedTabIds = __selected; let lastClickedTabId = 24;\n` +
    `let captureCommitPending = false; let saveAllTabsPending = false;\n` +
    `${identitySpaceTargetSource}\n${createGeneratedGroupCaptureContextSource}\n${resolveGeneratedGroupCaptureTargetSource}\n` +
    `${collectItemListCaptureTargetsSource}\n${createItemListCaptureContextSource}\n${resolveItemListCaptureTargetSource}\n` +
    `${createCaptureDestinationReceiptContextSource}\n${resolveCaptureDestinationReceiptTargetSource}\n` +
    `${captureDestinationReceiptMessageSource}\n${capturedTabSourceDescriptorSource}\n` +
    `${savedTabUrlPolicySource}\n${recentSaveCandidateSource}\n` +
    `${captureEligibleTabsSource}\n${selectedCaptureTabsSource}\n` +
    `${clearCapturedTabSelectionSource}\n${saveSelectedAsGroupSource}\n` +
    'globalThis.__run = saveSelectedAsGroup; globalThis.__lastClicked = () => lastClickedTabId;',
    context,
    { filename: 'selected-capture-url-policy-contract.js' },
  );

  await context.__run();

  assert.deepEqual(Array.from(cat.groups[0].items, item => item.url), [
    'https://example.com/keep',
    'file:///C:/Users/test/notes.html',
  ], 'a mixed rail selection must persist only pages supported by Reopen');
  assert.deepEqual(calls.committedIds, [21, 23],
    'a mixed rail selection must never pass unsupported sources into close-after-save');
  assert.deepEqual(Array.from(selected), [22, 24],
    'unsupported tabs must remain visibly selected after the recoverable subset saves');
  assert.equal(context.__lastClicked(), 24,
    'a remaining unsupported selection must retain its exact selection anchor');
  assert.equal(calls.snapshot, 'Save 2 selected tabs as a Group', 'history must localize and count only recoverable selected tabs');
  assert.match(calls.resultBase, /^Saved 2 tabs to Personal › Research › 2 tabs · /,
    'feedback must name the exact generated Group and count only recoverable selected tabs');
  assert.equal(calls.railRenders, 1, 'the rail must repaint the remaining selected rows once');
  assert.equal(calls.badgeUpdates, 1, 'the rail must repaint the remaining selection once');
  assert.equal(calls.focusRestores, 1, 'the rail must restore focus after the successful mixed Save');
}

function assertExactCaptureDestinationReceiptContract() {
  const saved = { id: 'saved-1', type: 'tab', title: 'Primary source', url: 'https://example.com/source' };
  const note = { id: 'note-1', type: 'note', text: 'Context' };
  const stack = { id: 'stack-inner', type: 'stack', name: 'Sources', items: [saved], expanded: false };
  const outerStack = { id: 'stack-outer', type: 'stack', name: 'Collection', items: [stack], expanded: false };
  const group = { id: 'group-1', name: 'Reading', items: [outerStack] };
  const space = { id: 'space-1', name: 'Research', groups: [group] };
  const workspace = { id: 'workspace-1', name: 'Personal', activeCatId: space.id, categories: [space] };
  const state = { workspaces: [workspace], activeWsId: workspace.id };
  const calls = { routes: [], frames: [], focused: [], revealed: [], toasts: [] };
  const renderedStacks = new Map([outerStack, stack].map(value => [value.id, {
    classList: {
      add(name) {
        if (name === 'search-expand' && !calls.revealed.includes(value.id)) calls.revealed.push(value.id);
      },
    },
  }]));
  const copy = {
    'capture.receiptSavedTab': 'Saved 1 tab to {destination}',
    'capture.receiptSavedTabs': 'Saved {count} tabs to {destination}',
    'capture.receiptSavedTabCopy': 'Saved 1 tab copy to {destination}',
    'capture.receiptSavedTabsCopy': 'Saved {count} tab copies to {destination}',
    'capture.openDestination': 'Open destination',
    'capture.destinationReceiptUnavailable': 'This save destination changed or moved. Nothing was opened.',
    'capture.destinationChangedAfterSave': 'Save was confirmed, but its destination changed before Locus could show it. Review your latest data.',
    'capture.closedOne': '{base} — closed the source tab',
    'capture.closedMany': '{base} — closed {count} source tabs',
    'capture.stayedOpenOne': '{base} — source tab stayed open',
    'capture.stayedOpenMany': '{base} — source tabs stayed open',
    'capture.closedPartial': '{base} — closed {closed} of {requested} source tabs',
  };
  const context = vm.createContext({
    __stackList: stack.items,
    State: { get() { return state; } },
    activeWs() { return workspace; },
    activeCat() { return space; },
    tr(key, vars = {}) {
      return String(copy[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
    },
    homeTrailGroupName(value) { return value.name; },
    homeTrailPathParts(ws, cat, groupName) { return [ws.name, cat.name, groupName]; },
    homeTrailPathText(parts) { return parts.join(' › '); },
    Router: {
      navigate(route, options) {
        calls.routes.push({ route: JSON.parse(JSON.stringify(route)), options: { ...options } });
        return true;
      },
    },
    requestAnimationFrame(callback) { calls.frames.push(callback); return calls.frames.length; },
    focusIdentityTarget(kind, id) {
      calls.focused.push({ kind, id });
      return calls.revealed.length === 2;
    },
    CSS: { escape(value) { return String(value); } },
    document: {
      querySelectorAll(selector) {
        const entry = [...renderedStacks.entries()].find(([id]) => selector.includes(`data-id="${id}"`));
        return entry ? [entry[1]] : [];
      },
      getElementById() { return null; },
    },
    toast(message, options = {}) { calls.toasts.push({ message, options }); },
  });
  vm.runInContext(
    `${identityItemTargetsSource}\n${itemDetailValueFingerprintSource}\n` +
    `${collectItemListCaptureTargetsSource}\n${createItemListCaptureContextSource}\n${resolveItemListCaptureTargetSource}\n` +
    `${createCaptureDestinationReceiptContextSource}\n${resolveCaptureDestinationReceiptTargetSource}\n` +
    `${captureDestinationReceiptMessageSource}\n${captureResultMessageSource}\n` +
    `${revealCaptureDestinationStackPathSource}\n${openCaptureDestinationReceiptSource}\n${toastCaptureDestinationReceiptSource}\n` +
    `globalThis.__destination = createItemListCaptureContext(__stackList);\n` +
    `globalThis.__receipt = createCaptureDestinationReceiptContext(__destination, [__stackList[0]]);\n` +
    `globalThis.__resolveDestination = () => resolveItemListCaptureTarget(__destination);\n` +
    `globalThis.__resolveReceipt = () => resolveCaptureDestinationReceiptTarget(__receipt);\n` +
    `globalThis.__message = () => captureDestinationReceiptMessage(__resolveDestination(), { count: 1, closeSources: true });\n` +
    `globalThis.__show = result => toastCaptureDestinationReceipt(__receipt, __message(), result);\n` +
    `globalThis.__open = () => openCaptureDestinationReceipt(__receipt);`,
    context,
    { filename: 'capture-destination-receipt-contract.js' },
  );

  assert.ok(context.__destination, 'a displayed exact Stack item list must produce one frozen destination context');
  assert.ok(context.__receipt, 'new saved items must produce one exact destination receipt context');
  assert.equal(context.__message(), 'Saved 1 tab to Personal › Research › Reading › Collection › Sources',
    'the receipt must name the complete Workspace, Space, Group, and Stack path');
  const result = { actionId: 'capture-1', closeSources: true, requestedCloseCount: 1, closedCount: 1, failedCloseCount: 0 };
  assert.equal(context.__show(result), true, 'an exact acknowledged destination must expose its recovery receipt');
  assert.equal(calls.toasts[0].message,
    'Saved 1 tab to Personal › Research › Reading › Collection › Sources — closed the source tab');
  assert.equal(calls.toasts[0].options.actionLabel, 'Open destination');
  assert.equal(calls.toasts[0].options.undo, 'capture-1');
  calls.toasts[0].options.action();
  assert.deepEqual(calls.routes, [{
    route: { type: 'group', wsId: workspace.id, groupId: group.id, itemId: null, query: {} },
    options: { persist: false },
  }], 'Open destination must route to the exact Group without another durable write');
  assert.equal(calls.frames.length, 1, 'accepted destination navigation must schedule one rebuilt-target focus');
  calls.frames.shift()();
  assert.deepEqual(calls.revealed, [outerStack.id, stack.id],
    'Open destination must transiently reveal every collapsed Stack ancestor in path order');
  assert.deepEqual(calls.focused, [{ kind: 'stack', id: stack.id }],
    'a nested destination receipt must focus its exact rebuilt Stack');
  assert.equal(outerStack.expanded, false,
    'transient destination reveal must not persistently expand the outer Stack');
  assert.equal(stack.expanded, false,
    'transient destination reveal must not persistently expand the inner Stack');

  stack.items.unshift(note);
  assert.ok(context.__resolveReceipt(), 'sibling reorder must not invalidate the same exact saved item and destination');
  saved.title = 'Changed title';
  assert.equal(context.__resolveReceipt(), null, 'changed saved-item bytes must invalidate the receipt action');
  saved.title = 'Primary source';
  stack.items.splice(stack.items.indexOf(saved), 1);
  group.items.push(saved);
  assert.equal(context.__resolveReceipt(), null, 'moving the saved item out of its reviewed Stack must invalidate recovery');
  assert.equal(context.__open(), false, 'a moved receipt must open no fallback destination');
  assert.equal(calls.routes.length, 1, 'a stale receipt must not navigate');
  assert.equal(calls.toasts.at(-1).message, copy['capture.destinationReceiptUnavailable']);
  assert.equal(context.__show(result), false, 'post-acknowledgement destination drift must suppress exact success and Open');
  assert.equal(calls.toasts.at(-1).message,
    `${copy['capture.destinationChangedAfterSave']} — closed the source tab`);
  assert.equal(calls.toasts.at(-1).options.action, undefined);
  assert.equal(calls.toasts.at(-1).options.tone, 'warning',
    'a confirmed save whose destination drifted must use warning styling');

  group.items.pop();
  stack.items.push(saved);
  stack.name = 'Renamed';
  assert.equal(context.__resolveDestination(), null, 'renaming the reviewed Stack must invalidate its frozen path');
  stack.name = 'Sources';
  const duplicateStack = { id: stack.id, type: 'stack', name: stack.name, items: [] };
  const duplicateOuterStack = {
    id: outerStack.id,
    type: 'stack',
    name: outerStack.name,
    items: [duplicateStack],
  };
  space.groups.push({ id: group.id, name: group.name, items: [duplicateOuterStack] });
  assert.equal(context.__resolveDestination(), null, 'duplicate destination IDs must fail closed instead of choosing a first match');
  space.groups.pop();
  const originalList = stack.items;
  stack.items = [...originalList];
  assert.equal(context.__resolveDestination(), null, 'replacing the destination list owner must invalidate the captured reference');
}

function assertInactiveSpaceDropCanFreezeExactDestination() {
  const activeInbox = { id: 'inbox-active', name: 'Inbox', items: [] };
  const targetInbox = { id: 'inbox-target', name: 'Inbox', items: [] };
  const activeSpace = { id: 'space-active', name: 'Current', groups: [activeInbox] };
  const targetSpace = { id: 'space-target', name: 'Later', groups: [targetInbox] };
  const workspace = {
    id: 'workspace-1', name: 'Personal', activeCatId: activeSpace.id,
    categories: [activeSpace, targetSpace],
  };
  const foreignInbox = { id: 'inbox-foreign', name: 'Inbox', items: [] };
  const foreignSpace = { id: 'space-foreign', name: 'Foreign', groups: [foreignInbox] };
  const foreignWorkspace = {
    id: 'workspace-2', name: 'Other', activeCatId: foreignSpace.id,
    categories: [foreignSpace],
  };
  const state = { activeWsId: workspace.id, workspaces: [workspace, foreignWorkspace] };
  const context = vm.createContext({
    __targetItems: targetInbox.items,
    __foreignItems: foreignInbox.items,
    State: { get() { return state; } },
    activeWs() { return workspace; },
    activeCat() { return activeSpace; },
  });
  vm.runInContext(
    `${collectItemListCaptureTargetsSource}\n${createItemListCaptureContextSource}\n${resolveItemListCaptureTargetSource}\n` +
    `globalThis.__defaultTarget = createItemListCaptureContext(__targetItems);\n` +
    `globalThis.__dropTarget = createItemListCaptureContext(__targetItems, { allowInactiveSpace: true });\n` +
    `globalThis.__foreignTarget = createItemListCaptureContext(__foreignItems, { allowInactiveSpace: true });\n` +
    `globalThis.__resolvedDropTarget = __dropTarget ? resolveItemListCaptureTarget(__dropTarget) : null;`,
    context,
    { filename: 'inactive-space-drop-destination-contract.js' },
  );

  assert.equal(context.__defaultTarget, null,
    'ordinary capture callers must remain limited to the active Space');
  assert.equal(context.__foreignTarget, null,
    'the explicit Space-drop option must never escape the active Workspace');
  assert.equal(context.__resolvedDropTarget?.workspace, workspace,
    'cross-Space drag must retain the exact active Workspace');
  assert.equal(context.__resolvedDropTarget?.space, targetSpace,
    'cross-Space drag must resolve the exact inactive destination Space');
  assert.equal(context.__resolvedDropTarget?.group, targetInbox,
    'cross-Space drag must resolve the exact destination Inbox');
  assert.match(
    dropTabsIntoCategorySource,
    /createItemListCaptureContext\(inbox\.items,\s*\{\s*allowInactiveSpace:\s*true\s*\}\)/,
    'only the explicit Space-drop caller must opt into an inactive-Space receipt',
  );
}

async function assertSpaceDropUsesCaptureFieldPolicy() {
  const sourceTab = {
    id: 71,
    windowId: 9,
    url: 'https://example.com/private-source',
    title: 'Private raw page title',
    fav: 'data:image/png;base64,private-icon',
  };
  const inbox = {
    id: 'inbox-target',
    name: 'Inbox',
    items: [{
      id: 'existing-space-drop',
      type: 'tab',
      title: 'Earlier context',
      url: sourceTab.url,
      fav: '',
    }],
  };
  const targetSpace = { id: 'space-target', name: 'Later', groups: [inbox] };
  const workspace = { id: 'workspace-1', name: 'Personal', categories: [targetSpace] };
  const calls = { policy: 0, commits: 0, receipts: 0, rollbacks: 0, duplicateToasts: 0 };
  let deduplicate = false;
  const context = vm.createContext({
    __drag: { kind: 'tab', data: sourceTab },
    captureEligibleTabs(tabs) { return tabs; },
    activeWs() { return workspace; },
    createInboxCaptureContext(candidateWorkspace, candidateSpace) {
      return candidateWorkspace === workspace && candidateSpace === targetSpace
        ? { workspaceRef: workspace, spaceRef: targetSpace }
        : null;
    },
    State: {
      snapshot() { return 'space-drop-action'; },
      rollbackSnapshot(actionId) {
        assert.equal(actionId, 'space-drop-action');
        assert.equal(deduplicate, true, 'only the duplicate-blocked attempt may roll back');
        calls.rollbacks += 1;
      },
      get() { return { settings: { closeTabOnSave: false, captureDeduplicate: deduplicate } }; },
    },
    tr(key) { return key; },
    materializeInboxCaptureTarget() { return { workspace, space: targetSpace, inbox }; },
    createOrganizationIdAllocator() { return () => 'saved-space-drop'; },
    captureTabFields(tab) {
      calls.policy += 1;
      assert.equal(tab, sourceTab);
      return { title: 'example.com', fav: '' };
    },
    stampNew(item) { return item; },
    createItemListCaptureContext(items, options) {
      return items === inbox.items && options?.allowInactiveSpace === true
        ? { listRef: items }
        : null;
    },
    createCaptureDestinationReceiptContext(destinationContext, items) {
      return destinationContext ? { destinationContext, itemRefs: Array.from(items) } : null;
    },
    resolveCaptureDestinationReceiptTarget(receipt) {
      return receipt?.destinationContext?.listRef === inbox.items
        && receipt.itemRefs.every(item => inbox.items.includes(item))
        ? { workspace, space: targetSpace, group: inbox, items: receipt.itemRefs }
        : null;
    },
    inboxCaptureReceiptMessage() { return 'Saved to exact inactive Space Inbox'; },
    async commitCapturedTabs(tabs, options) {
      calls.commits += 1;
      assert.deepEqual(Array.from(tabs, tab => tab.id), [sourceTab.id]);
      assert.equal(options.validateDestination(), true);
      return {
        actionId: options.actionId,
        closeSources: false,
        requestedCloseCount: 0,
        closedCount: 0,
        failedCloseCount: 0,
      };
    },
    clearCapturedTabSelection() {},
    renderBoard() {},
    renderOpenTabs() {},
    updateSelectedBadge() {},
    toastCaptureDestinationReceipt(receipt) {
      calls.receipts += 1;
      assert.ok(context.resolveCaptureDestinationReceiptTarget(receipt));
    },
    renderSpaceNav() {},
    reportInboxCaptureUnavailable() { assert.fail('the exact Space drop must remain available'); },
    toast(key) {
      assert.equal(deduplicate, true, 'an accepted duplicate-allowed drop must not toast');
      assert.equal(key, 'capture.alreadySaved');
      calls.duplicateToasts += 1;
    },
  });
  vm.runInContext(
    `let drag = __drag;\n${captureDestinationTabUrlsSource}\n${captureDuplicateExistsSource}\n${dropTabsIntoCategorySource}\n` +
    'globalThis.__dropIntoSpace = dropTabsIntoCategory;',
    context,
    { filename: 'space-drop-capture-field-policy-contract.js' },
  );

  await context.__dropIntoSpace(targetSpace);
  assert.equal(calls.policy, 1,
    'Space-drop Save must apply the canonical title and favicon policy once');
  assert.equal(calls.commits, 1, 'Space-drop Save must retain one acknowledged commit');
  assert.equal(calls.receipts, 1, 'Space-drop Save must retain one exact destination receipt');
  assert.equal(inbox.items.length, 2,
    'Space-drop Save must preserve a same-URL page when duplicate URLs are allowed');
  assert.deepEqual(JSON.parse(JSON.stringify(inbox.items[1])), {
    id: 'saved-space-drop',
    type: 'tab',
    title: 'example.com',
    url: sourceTab.url,
    fav: '',
  }, 'Space-drop Save must persist only the canonical metadata-policy output');
  assert.doesNotMatch(
    dropTabsIntoCategorySource,
    /title:\s*tab\.title|fav:\s*tab\.fav|['"]Untitled['"]/,
    'Space-drop Save must not bypass capture preferences with raw drag metadata',
  );

  deduplicate = true;
  await context.__dropIntoSpace(targetSpace);
  assert.equal(inbox.items.length, 2,
    'Space-drop Save must still block a same-URL page when deduplication is enabled');
  assert.equal(calls.commits, 1, 'a duplicate-blocked Space drop must not request another commit');
  assert.equal(calls.rollbacks, 1, 'a duplicate-blocked Space drop must discard its empty history action');
  assert.equal(calls.duplicateToasts, 1, 'a duplicate-blocked Space drop must retain localized feedback');
}

assert.match(
  css,
  /#toast\s*\{[^}]*width:\s*min\(760px,\s*calc\(100vw - 32px\)\)[^}]*display:\s*grid[^}]*border-left:\s*4px solid var\(--index-receipt\)[^}]*background:\s*var\(--index-sheet\)/s,
  'capture receipts must use one legible Locus Index filing strip',
);
assert.match(
  css,
  /#toast-action,\s*\n#toast-undo,\s*\n#toast-close\s*\{[^}]*min-height:\s*40px[^}]*border-radius:\s*4px/s,
  'receipt recovery and dismissal actions must remain visible 40 px keyboard and pointer targets',
);
assert.match(
  css,
  /#toast-action\s*\{[^}]*background:\s*var\(--accent-bg\)[^}]*color:\s*var\(--accent-text\)/s,
  'Open destination must carry primary emphasis for the locate step',
);
assert.match(
  css,
  /#toast-undo\s*\{[^}]*background:\s*transparent[^}]*color:\s*var\(--text2\)/s,
  'Undo must remain clearly available without competing with Open destination',
);
assert.doesNotMatch(
  css,
  /#toast-undo:hover\s*\{[^}]*transform:/s,
  'receipt recovery must not use ornamental scaling motion',
);
assert.match(
  css,
  /@media \(max-width:\s*520px\)\s*\{[\s\S]*?\.toast-actions\s*\{[^}]*grid-column:\s*1\s*;[^}]*width:\s*100%[\s\S]*?#toast-action,\s*\n\s*#toast-undo\s*\{[^}]*flex:\s*1 1 140px/s,
  'narrow receipts must keep Open destination and Undo together before Dismiss',
);
assert.match(
  css,
  /@media \(forced-colors:\s*active\)\s*\{[\s\S]*?#toast-action\s*\{[^}]*background:\s*Highlight[^}]*color:\s*HighlightText/s,
  'forced colors must preserve the receipt primary-action hierarchy',
);

async function assertUnsupportedSelectionCannotCreateInbox() {
  const tabs = [
    { id: 25, url: 'data:text/plain,private', title: 'Data draft' },
    { id: 26, url: 'blob:https://example.com/private', title: 'Blob draft' },
  ];
  const selected = new Set(tabs.map(tab => tab.id));
  const cat = { id: 'space-1', groups: [] };
  const calls = { snapshots: 0, commits: 0, renders: 0, badges: 0, results: 0, toasts: 0 };
  const context = vm.createContext({
    URL,
    __tabs: tabs,
    __selected: selected,
    activeCat() { return cat; },
    State: {
      snapshot() { calls.snapshots += 1; return 'action-inbox'; },
      rollbackSnapshot() {},
    },
    uid() { return 'unsafe-inbox'; },
    captureDuplicateExists() { return false; },
    captureTabFields(tab) { return { title: tab.title, fav: '' }; },
    stampNew(item) { return item; },
    async commitCapturedTabs() { calls.commits += 1; return false; },
    renderBoard() { calls.renders += 1; },
    updateSelectedBadge() { calls.badges += 1; },
    toastCaptureResult() { calls.results += 1; },
    toast() { calls.toasts += 1; },
  });
  vm.runInContext(
    `let allOpenTabs = __tabs; let selectedTabIds = __selected; let lastClickedTabId = 26;\n` +
    `${savedTabUrlPolicySource}\n${captureEligibleTabsSource}\n${selectedCaptureTabsSource}\n` +
    `${clearCapturedTabSelectionSource}\n${saveSelectedToInboxSource}\n` +
    'globalThis.__run = saveSelectedToInbox;',
    context,
    { filename: 'selected-inbox-url-policy-contract.js' },
  );

  await context.__run();

  assert.deepEqual(cat.groups, [],
    'an unsupported-only selection must not create an empty or unsafe Inbox');
  assert.deepEqual(calls, { snapshots: 0, commits: 0, renders: 0, badges: 0, results: 0, toasts: 0 },
    'an unsupported-only selection must stop before history, persistence, close, render, or feedback');
  assert.deepEqual(Array.from(selected), [25, 26],
    'a refused unsupported selection must remain intact for explicit Close or clearing');
}

async function assertMixedInboxSelectionRetainsUnsupportedTabs() {
  const tabs = [
    { id: 27, url: 'https://example.com/recoverable', title: 'Recoverable page' },
    { id: 28, url: 'data:text/plain,private', title: 'Data draft' },
  ];
  const selected = new Set(tabs.map(tab => tab.id));
  const inbox = { id: 'inbox-1', name: 'Inbox', items: [] };
  const cat = { id: 'space-1', groups: [inbox] };
  const workspace = { id: 'workspace-1', categories: [cat] };
  const calls = {
    railRenders: 0,
    focusRestores: 0,
    commitOptions: null,
    destinationReceipts: 0,
    pathBlindResults: 0,
  };
  const context = vm.createContext({
    URL,
    __tabs: tabs,
    __selected: selected,
    activeWs() { return workspace; },
    activeCat() { return cat; },
    createInboxCaptureContext() { return { inboxRef: inbox }; },
    materializeInboxCaptureTarget() { return { workspace, space: cat, inbox }; },
    reportInboxCaptureUnavailable() { return false; },
    State: {
      get() { return { settings: { closeTabOnSave: true } }; },
      snapshot() { return 'action-inbox'; },
      rollbackSnapshot() {},
    },
    tr(key, values = {}) {
      return values.count === undefined ? key : `${key}:${values.count}`;
    },
    uid() { return 'legacy-inbox-id'; },
    createOrganizationIdAllocator() { return () => 'saved-inbox'; },
    captureDuplicateExists() { return false; },
    captureTabFields(tab) { return { title: tab.title, fav: '' }; },
    stampNew(item) { return item; },
    createItemListCaptureContext(items) {
      return {
        listRef: items,
        workspaceRef: workspace,
        spaceRef: cat,
        groupRef: inbox,
        workspaceName: workspace.name || '',
        spaceName: cat.name || '',
        groupName: inbox.name,
      };
    },
    resolveItemListCaptureTarget(destination) {
      return destination?.listRef === inbox.items
        && destination.workspaceRef === workspace
        && destination.spaceRef === cat
        && destination.groupRef === inbox
        && destination.groupName === inbox.name
        ? { workspace, space: cat, group: inbox, list: inbox.items, stacks: [] }
        : null;
    },
    createCaptureDestinationReceiptContext(destinationContext, items) {
      return { destinationContext, itemRefs: Array.from(items) };
    },
    resolveCaptureDestinationReceiptTarget(receipt) {
      const target = context.resolveItemListCaptureTarget(receipt?.destinationContext);
      return target && receipt.itemRefs.every(item => inbox.items.includes(item))
        ? { ...target, items: receipt.itemRefs }
        : null;
    },
    async commitCapturedTabs(captured, options) {
      calls.commitOptions = options;
      assert.equal(options.validateDestination(), true,
        'selected Inbox source cleanup must begin with exact saved-item authority');
      return { actionId: 'action-inbox', closeSources: true, requestedCloseCount: captured.length, closedCount: captured.length, failedCloseCount: 0 };
    },
    renderBoard() {},
    renderOpenTabs() { calls.railRenders += 1; },
    updateSelectedBadge() {},
    restoreOpenTabCaptureFocus() { calls.focusRestores += 1; },
    inboxCaptureReceiptMessage() { return 'Saved to exact Inbox'; },
    toastCaptureDestinationReceipt(receipt) {
      calls.destinationReceipts += 1;
      assert.ok(context.resolveCaptureDestinationReceiptTarget(receipt),
        'selected Inbox success must retain its exact saved-item destination');
    },
    toastCaptureResult() { calls.pathBlindResults += 1; },
    toast() {},
  });
  vm.runInContext(
    `let allOpenTabs = __tabs; let selectedTabIds = __selected; let lastClickedTabId = 28;\n` +
    `${savedTabUrlPolicySource}\n${captureEligibleTabsSource}\n${selectedCaptureTabsSource}\n` +
    `${clearCapturedTabSelectionSource}\n${saveSelectedToInboxSource}\n` +
    'globalThis.__run = saveSelectedToInbox; globalThis.__lastClicked = () => lastClickedTabId;',
    context,
    { filename: 'mixed-selected-inbox-url-policy-contract.js' },
  );

  await context.__run();

  assert.deepEqual(Array.from(inbox.items, item => item.url), ['https://example.com/recoverable'],
    'a mixed Inbox selection must persist only the recoverable page');
  assert.equal(inbox.items[0].id, 'saved-inbox',
    'selected Inbox capture must allocate the saved item against every retained ID');
  assert.deepEqual(Array.from(selected), [28],
    'a successful mixed Inbox capture must leave the unsupported tab visibly selected');
  assert.equal(context.__lastClicked(), 28,
    'the retained unsupported tab must remain the exact selection anchor');
  assert.equal(calls.railRenders, 1,
    'a successful mixed Inbox capture must repaint the retained checkbox state once');
  assert.equal(calls.focusRestores, 1,
    'a successful mixed Inbox capture must restore focus to the retained selection');
  assert.equal(typeof calls.commitOptions?.validateDestination, 'function',
    'selected Inbox capture must carry exact destination authority through persistence and cleanup');
  assert.equal(calls.destinationReceipts, 1,
    'selected Inbox capture must expose the existing Open-destination receipt once');
  assert.equal(calls.pathBlindResults, 0,
    'selected Inbox capture must not fall back to a path-blind success');
  inbox.name = 'Renamed after acceptance';
  assert.equal(calls.commitOptions.validateDestination(), false,
    'renaming the accepted Inbox must revoke any remaining source-close authority');
}

async function assertExactInboxCaptureBoundary() {
  const inboxA = { id: 'inbox-a', name: 'Inbox', items: [] };
  const inboxB = { id: 'inbox-b', name: 'Inbox', items: [] };
  const space = { id: ' space-1 ', name: 'Research', groups: [inboxA, inboxB] };
  const workspace = { id: ' workspace-1 ', name: 'Personal', activeCatId: space.id, categories: [space] };
  const state = { settings: { closeTabOnSave: true }, activeWsId: workspace.id, workspaces: [workspace] };
  const calls = { snapshots: 0, commits: 0, toasts: [], uid: 0 };
  const context = vm.createContext({
    URL,
    State: {
      get() { return state; },
      snapshot() { calls.snapshots += 1; return 'capture-action'; },
      rollbackSnapshot() {},
    },
    activeWs() { return workspace; },
    activeCat() { return space; },
    createOrganizationIdAllocator() {
      return () => { calls.uid += 1; return 'inbox-created'; };
    },
    tr(key) {
      return key === 'capture.destinationUnavailable'
        ? 'Locus couldn’t confirm this Space’s Inbox, so nothing was saved or closed.'
        : key;
    },
    toast(message, options) { calls.toasts.push({ message, options }); },
    captureDuplicateExists() { return false; },
    captureTabFields(tab) { return { title: tab.title, fav: '' }; },
    stampNew(item) { return item; },
    async commitCapturedTabs() { calls.commits += 1; return false; },
    renderBoard() {},
    toastCaptureResult() {},
    createSavedItemRecoveryContext() { return null; },
    toastCapturedItemReceipt() {},
  });
  vm.runInContext(
    `${organizationGroupTargetSource}\n${identitySpaceTargetSource}\n${identityGroupTargetSource}\n` +
    `${createInboxCaptureContextSource}\n${resolveInboxCaptureTargetSource}\n${materializeInboxCaptureTargetSource}\n${reportInboxCaptureUnavailableSource}\n` +
    `${savedTabUrlPolicySource}\n${saveTabToInboxSource}\n` +
    'globalThis.__capture = { createInboxCaptureContext, resolveInboxCaptureTarget, materializeInboxCaptureTarget, saveTabToInbox };',
    context,
    { filename: 'exact-inbox-capture-contract.js' },
  );
  const api = context.__capture;

  assert.equal(api.createInboxCaptureContext(workspace, space), null,
    'duplicate Inboxes must not produce a reviewed capture destination');

  space.groups = [inboxA];
  const exact = api.createInboxCaptureContext(workspace, space);
  assert.equal(exact?.inboxRef, inboxA, 'one exact Inbox must retain its reviewed runtime identity');
  assert.equal(api.resolveInboxCaptureTarget(exact)?.inbox, inboxA,
    'the exact Inbox must re-resolve without provisioning or replacement');
  assert.equal(api.materializeInboxCaptureTarget(exact)?.inbox, inboxA,
    'materialization must reuse an existing exact Inbox');
  assert.equal(calls.uid, 0, 'an existing Inbox must allocate no replacement ID');

  space.groups = [];
  const absent = api.createInboxCaptureContext(workspace, space);
  assert.equal(absent?.inboxRef, null, 'an absent Inbox may be reviewed as provisionable');
  const provisioned = api.materializeInboxCaptureTarget(absent);
  assert.equal(provisioned?.inbox?.id, 'inbox-created', 'an unchanged absent destination may provision one Inbox');
  assert.deepEqual(Array.from(space.groups, group => group.id), ['inbox-created']);

  space.groups = [inboxA, inboxB];
  const result = await api.saveTabToInbox({
    id: 81,
    windowId: 4,
    title: 'Unfinished research',
    url: 'https://example.com/research',
  }, { closeSource: true });
  assert.equal(result, false, 'a duplicate-Inbox Save must report refusal');
  assert.deepEqual(Array.from(space.groups, group => group.id), ['inbox-a', 'inbox-b'],
    'refusal must not repair, replace, or append an Inbox');
  assert.equal(calls.snapshots, 0, 'duplicate-Inbox refusal must happen before history mutation');
  assert.equal(calls.commits, 0, 'duplicate-Inbox refusal must dispatch no state write or source effect');
  assert.deepEqual(JSON.parse(JSON.stringify(calls.toasts)), [{
    message: 'Locus couldn’t confirm this Space’s Inbox, so nothing was saved or closed.',
    options: { danger: true, duration: 5000 },
  }], 'refusal must state that neither save nor close happened');
}

function assertInboxCaptureReceiptMessages() {
  const templates = {
    'nav.inbox': 'Inbox',
    'itemAction.untitled': 'Untitled',
    'capture.receiptSaved': 'Saved “{title}” to {destination}',
    'capture.receiptSavedCopy': 'Saved a copy of “{title}” to {destination}',
    'capture.receiptSavedTab': 'Saved 1 tab to {destination}',
    'capture.receiptSavedTabs': 'Saved {count} tabs to {destination}',
    'capture.receiptSavedTabCopy': 'Saved 1 tab copy to {destination}',
    'capture.receiptSavedTabsCopy': 'Saved {count} tab copies to {destination}',
  };
  const context = vm.createContext({
    tr(key, values = {}) {
      return String(templates[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
    },
  });
  vm.runInContext(
    `${homeTrailGroupNameSource}\n${homeTrailPathPartsSource}\n${homeTrailPathTextSource}\n` +
    `${captureDestinationReceiptMessageSource}\n${inboxCaptureReceiptMessageSource}\n` +
    'globalThis.__receipt = inboxCaptureReceiptMessage;',
    context,
    { filename: 'inbox-capture-receipt-contract.js' },
  );
  const receipt = context.__receipt;
  const target = {
    workspace: { name: 'Personal' },
    space: { name: 'Research' },
    inbox: { name: 'Inbox' },
  };
  assert.equal(
    receipt(target, { item: { title: 'Quarterly roadmap' }, closeSources: true }),
    'Saved “Quarterly roadmap” to Personal › Research › Inbox',
  );
  assert.equal(
    receipt(target, { item: { title: 'Quarterly roadmap' }, closeSources: false }),
    'Saved a copy of “Quarterly roadmap” to Personal › Research › Inbox',
  );
  assert.equal(receipt(target, { count: 1, closeSources: true }),
    'Saved 1 tab to Personal › Research › Inbox');
  assert.equal(receipt(target, { count: 3, closeSources: true }),
    'Saved 3 tabs to Personal › Research › Inbox');
  assert.equal(receipt(target, { count: 1, closeSources: false }),
    'Saved 1 tab copy to Personal › Research › Inbox');
  assert.equal(receipt(target, { count: 3, closeSources: false }),
    'Saved 3 tab copies to Personal › Research › Inbox');
  assert.equal(receipt({ workspace: {}, space: target.space, inbox: target.inbox }, { count: 2 }), null,
    'an incomplete destination must not masquerade as an exact receipt');
}

async function assertExistingGroupCaptureContract() {
  const tabs = [
    { id: 31, windowId: 4, active: false, url: 'https://example.com/one', title: 'One' },
    { id: 32, windowId: 4, active: false, url: 'https://example.com/one', title: 'One in another tab' },
    { id: 33, windowId: 4, active: false, url: 'https://example.com/two', title: 'Two' },
  ];
  const selected = new Set(tabs.map(tab => tab.id));
  const group = { id: ' group-1 ', name: 'Sources', items: [] };
  const space = { id: ' space-1 ', name: 'Research', groups: [group] };
  const workspace = { id: ' workspace-1 ', name: 'Personal', activeCatId: space.id, categories: [space] };
  let state = {
    activeWsId: workspace.id,
    workspaces: [workspace],
    settings: { closeTabOnSave: false },
  };
  const adoptedGroup = { id: group.id, name: group.name, items: [] };
  const adoptedSpace = { id: space.id, name: space.name, groups: [adoptedGroup] };
  const adoptedWorkspace = {
    id: workspace.id,
    name: workspace.name,
    activeCatId: adoptedSpace.id,
    categories: [adoptedSpace],
  };
  const adoptedState = {
    activeWsId: adoptedWorkspace.id,
    workspaces: [adoptedWorkspace],
    settings: { closeTabOnSave: false },
  };
  const calls = {
    snapshots: [], commits: [], toasts: [], order: [], receiptContexts: 0,
    validationResults: [], destinationWarnings: 0, staleResultToasts: 0, rawIds: 0,
  };
  let changeDestinationDuringQuery = false;
  let adoptDuringQuery = false;
  let failActiveTabRead = false;
  let currentWindowTabs = [{
    id: 41, windowId: 4, active: true, lastAccessed: 100,
    url: 'https://example.com/active', title: 'Active',
  }];
  const templates = {
    'nav.inbox': 'Inbox',
    'capture.groupDestinationUnavailable': 'Locus couldn’t confirm this Group, so nothing was saved or closed.',
    'capture.tabReadFailed': 'Locus couldn’t read the active tab, so nothing was saved or closed.',
    'capture.pending': 'Another save is pending.',
    'capture.snapshotGroupTab': 'Save 1 tab to Group',
    'capture.snapshotGroupTabs': 'Save {count} tabs to Group',
    'capture.savedGroup': 'Saved to the selected Group',
    'capture.savedCopyGroup': 'Saved a copy to the selected Group',
    'capture.receiptSavedTab': 'Saved 1 tab to {destination}',
    'capture.receiptSavedTabs': 'Saved {count} tabs to {destination}',
    'capture.receiptSavedTabCopy': 'Saved 1 tab copy to {destination}',
    'capture.receiptSavedTabsCopy': 'Saved {count} tab copies to {destination}',
  };
  const context = vm.createContext({
    URL,
    __tabs: tabs,
    __selected: selected,
    State: {
      get() { return state; },
      isRecoveryRequired() { return false; },
      snapshot(label) { calls.snapshots.push(label); calls.order.push('snapshot'); return 'group-action'; },
      rollbackSnapshot() {},
    },
    chrome: {
      tabs: {
        async query() {
          if (failActiveTabRead) throw new Error('Injected active-tab read failure');
          if (changeDestinationDuringQuery) group.name = 'Changed during browser read';
          if (adoptDuringQuery) state = adoptedState;
          return currentWindowTabs;
        },
      },
    },
    tr(key, values = {}) {
      return String(templates[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
    },
    captureTabFields(tab) { return { title: tab.title, fav: '' }; },
    stampNew(item) { return item; },
    LocusImportUtils: { collectEntityIds() { return new Set(['retained-collision']); } },
    uid() {
      calls.rawIds += 1;
      return calls.rawIds === 1 ? 'retained-collision' : `saved-${calls.rawIds - 1}`;
    },
    createItemListCaptureContext(items) {
      return {
        listRef: items,
        workspaceRef: workspace,
        spaceRef: space,
        groupRef: group,
        workspaceName: workspace.name,
        spaceName: space.name,
        groupName: group.name,
      };
    },
    createCaptureDestinationReceiptContext(destinationContext, items) {
      calls.receiptContexts += 1;
      return { destinationContext, itemRefs: Array.from(items) };
    },
    resolveItemListCaptureTarget(destinationContext) {
      return destinationContext?.workspaceRef === workspace
        && destinationContext?.spaceRef === space
        && destinationContext?.groupRef === group
        && destinationContext?.listRef === group.items
        && destinationContext?.workspaceName === workspace.name
        && destinationContext?.spaceName === space.name
        && destinationContext?.groupName === group.name
        ? { workspace, space, group, stacks: [] }
        : null;
    },
    resolveCaptureDestinationReceiptTarget(receiptContext) {
      const target = context.resolveItemListCaptureTarget(receiptContext?.destinationContext);
      return target && receiptContext.itemRefs.every(item => group.items.includes(item))
        ? { ...target, items: receiptContext.itemRefs }
        : null;
    },
    async commitCapturedTabs(captured, options) {
      calls.order.push('commit');
      calls.commits.push({ captured: captured.map(tab => tab.id), options: { ...options } });
      calls.validationResults.push(options.validateDestination?.() === true);
      workspace.name = 'Changed after receipt';
      space.name = 'Changed after receipt';
      group.name = 'Changed after receipt';
      calls.validationResults.push(options.validateDestination?.() === true);
      return {
        actionId: options.actionId,
        closeSources: options.closeSources,
        requestedCloseCount: captured.length,
        closedCount: 0,
        failedCloseCount: captured.length,
        destinationChanged: true,
      };
    },
    renderBoard() {},
    renderOpenTabs() {},
    updateSelectedBadge() {},
    restoreOpenTabCaptureFocus() {},
    toastCaptureDestinationReceipt(receiptContext, message) {
      calls.order.push('toast');
      if (context.resolveCaptureDestinationReceiptTarget(receiptContext)) {
        calls.toasts.push({ message });
      } else {
        calls.destinationWarnings += 1;
        calls.toasts.push({ message: 'capture.destinationChangedAfterSave' });
      }
    },
    toastCaptureResult(message) {
      calls.staleResultToasts += 1;
      calls.order.push('toast');
      calls.toasts.push({ message });
    },
    toast(message, options = {}) { calls.toasts.push({ message, options }); },
  });
  vm.runInContext(
    `let allOpenTabs = __tabs; let selectedTabIds = __selected; let lastClickedTabId = 33;\n` +
    `let captureCommitPending = false; let saveAllTabsPending = false;\n` +
    `${organizationGroupTargetSource}\n${identitySpaceTargetSource}\n${identityGroupTargetSource}\n` +
    `${homeTrailGroupNameSource}\n${homeTrailPathPartsSource}\n${homeTrailPathTextSource}\n` +
    `${captureDestinationReceiptMessageSource}\n${createGroupCaptureContextSource}\n` +
    `${resolveGroupCaptureTargetSource}\n${reportGroupCaptureUnavailableSource}\n` +
    `${createOrganizationIdAllocatorSource}\n` +
    `${savedTabUrlPolicySource}\n${recentSaveCandidateSource}\n` +
    `${captureEligibleTabsSource}\n${selectedCaptureTabsSource}\n` +
    `${captureDestinationTabUrlsSource}\n${captureDuplicateExistsSource}\n` +
    `${createCaptureBatchDuplicateFilterSource}\n` +
    `${clearCapturedTabSelectionSource}\n${addSidebarOrActiveTabToGroupSource}\n` +
    'globalThis.__groupCapture = { createGroupCaptureContext, resolveGroupCaptureTarget, createCaptureBatchDuplicateFilter, addSidebarOrActiveTabToGroup, setPending(value) { captureCommitPending = value; } };',
    context,
    { filename: 'existing-group-capture-contract.js' },
  );
  const api = context.__groupCapture;

  const reviewed = api.createGroupCaptureContext(group);
  assert.equal(reviewed?.workspaceId, ' workspace-1 ', 'exact imported IDs must not be normalized');
  assert.equal(reviewed?.spaceId, ' space-1 ');
  assert.equal(reviewed?.groupId, ' group-1 ');
  group.name = 'Renamed';
  assert.equal(api.resolveGroupCaptureTarget(reviewed), null, 'a renamed reviewed Group must fail closed');
  group.name = 'Sources';
  const originalItems = group.items;
  group.items = [];
  assert.equal(api.resolveGroupCaptureTarget(reviewed), null, 'a replaced Group item list must fail closed');
  group.items = originalItems;
  const duplicateSpace = { id: 'space-2', name: 'Other', groups: [{ id: group.id, name: 'Duplicate', items: [] }] };
  workspace.categories.push(duplicateSpace);
  assert.equal(api.createGroupCaptureContext(group), null, 'duplicate Group IDs must not authorize capture');
  workspace.categories.pop();

  selected.clear();
  group.items.push({
    id: 'already-saved', type: 'tab', title: 'Newest already saved',
    url: 'https://example.com/already-saved',
  });
  currentWindowTabs = [
    {
      id: 41, windowId: 4, active: false, lastAccessed: 200,
      url: 'https://example.com/already-saved', title: 'Newest already saved',
    },
    {
      id: 42, windowId: 4, active: false, lastAccessed: 100,
      url: 'https://example.com/available', title: 'Older available page',
    },
  ];
  await api.addSidebarOrActiveTabToGroup(group);
  assert.deepEqual(Array.from(group.items, item => item.url), [
    'https://example.com/already-saved',
    'https://example.com/available',
  ], 'Save here must choose the newest unsaved eligible page instead of stopping at a newer duplicate');
  assert.deepEqual(Array.from(calls.commits[0]?.captured || []), [42],
    'only the selected unsaved fallback may enter persistence and cleanup');

  group.items.length = 0;
  tabs.forEach(tab => selected.add(tab.id));
  workspace.name = 'Personal';
  space.name = 'Research';
  group.name = 'Sources';
  currentWindowTabs = [{
    id: 41, windowId: 4, active: true, lastAccessed: 100,
    url: 'https://example.com/active', title: 'Active',
  }];
  calls.snapshots.length = 0;
  calls.commits.length = 0;
  calls.toasts.length = 0;
  calls.order.length = 0;
  calls.validationResults.length = 0;
  calls.receiptContexts = 0;
  calls.destinationWarnings = 0;
  calls.staleResultToasts = 0;
  calls.rawIds = 0;

  await api.addSidebarOrActiveTabToGroup(group);
  assert.deepEqual(Array.from(group.items, item => item.url), [tabs[0].url, tabs[2].url],
    'selected existing-Group Save must skip a same-URL source already accepted in this batch');
  assert.deepEqual(Array.from(group.items, item => item.id), ['saved-1', 'saved-2'],
    'existing-Group capture must skip IDs retained elsewhere in the graph');
  assert.deepEqual(Array.from(calls.commits[0].captured), [31, 33],
    'only the first exact URL and the distinct source may enter persistence and cleanup');
  assert.deepEqual(calls.snapshots, ['Save 2 tabs to Group']);
  assert.equal(calls.commits.length, 1, 'selected Group capture must persist once');
  assert.equal(calls.commits[0].options.closeSources, false, 'the reviewed source preference must reach the commit');
  assert.equal(typeof calls.commits[0].options.validateDestination, 'function',
    'existing-Group capture must carry exact destination authority through persistence');
  assert.deepEqual(calls.validationResults, [true, false],
    'the exact receipt must invalidate when its Workspace, Space, and Group change during persistence');
  assert.equal(calls.receiptContexts, 1,
    'existing-Group capture must freeze one exact saved-item receipt before persistence');
  assert.equal(calls.destinationWarnings, 1,
    'accepted persistence with destination drift must expose one truthful recovery warning');
  assert.equal(calls.staleResultToasts, 0,
    'destination drift must never announce the now-stale reviewed path as success');
  assert.equal(calls.toasts.at(-1).message, 'capture.destinationChangedAfterSave');
  assert.deepEqual(calls.order, ['snapshot', 'commit', 'toast']);
  assert.equal(selected.size, 0, 'accepted selected tabs must clear once');

  state.settings.captureDeduplicate = false;
  assert.deepEqual(
    tabs.filter(api.createCaptureBatchDuplicateFilter([])).map(tab => tab.id),
    [31, 32, 33],
    'the new-tab batch filter must retain every same-URL source when duplicates are allowed',
  );
  state.settings.captureDeduplicate = true;

  workspace.name = 'Personal';
  space.name = 'Research';
  group.name = 'Sources';
  changeDestinationDuringQuery = true;
  const itemCount = group.items.length;
  assert.equal(await api.addSidebarOrActiveTabToGroup(group), false,
    'a Group changed during the active-tab read must refuse capture');
  assert.equal(group.items.length, itemCount, 'stale authority must mutate no Group item');
  assert.equal(calls.snapshots.length, 1, 'stale authority must stop before history');
  assert.equal(calls.commits.length, 1, 'stale authority must dispatch no write or close');
  assert.equal(calls.toasts.at(-1).message,
    'Locus couldn’t confirm this Group, so nothing was saved or closed.');

  group.name = 'Sources';
  changeDestinationDuringQuery = false;
  adoptDuringQuery = true;
  const detachedItemCount = group.items.length;
  assert.equal(await api.addSidebarOrActiveTabToGroup(group), false,
    'clean storage adoption during the active-tab read must invalidate the reviewed Group');
  assert.equal(group.items.length, detachedItemCount,
    'the detached Group must not receive an optimistic saved item');
  assert.equal(adoptedGroup.items.length, 0,
    'the unreviewed authoritative replacement Group must not receive a saved item');
  assert.equal(calls.snapshots.length, 1,
    'adopted existing-Group capture must stop before history');
  assert.equal(calls.commits.length, 1,
    'adopted existing-Group capture must dispatch no persistence or source cleanup');
  state = { activeWsId: workspace.id, workspaces: [workspace], settings: { closeTabOnSave: false } };
  adoptDuringQuery = false;

  group.name = 'Sources';
  changeDestinationDuringQuery = false;
  failActiveTabRead = true;
  assert.equal(await api.addSidebarOrActiveTabToGroup(group), false,
    'a rejected active-tab read must report a protected failure');
  assert.equal(group.items.length, itemCount, 'a rejected source read must mutate no Group item');
  assert.equal(calls.snapshots.length, 1, 'a rejected source read must stop before history');
  assert.equal(calls.commits.length, 1, 'a rejected source read must dispatch no write or close');
  assert.equal(calls.toasts.at(-1).message,
    'Locus couldn’t read the active tab, so nothing was saved or closed.');

  failActiveTabRead = false;
  api.setPending(true);
  const pendingItemCount = group.items.length;
  const pendingQueryCount = calls.commits.length;
  assert.equal(await api.addSidebarOrActiveTabToGroup(group), false,
    'an existing-Group Save must refuse duplicate activation before another browser read');
  assert.equal(group.items.length, pendingItemCount,
    'a competing capture must not optimistically mutate the Group');
  assert.equal(calls.commits.length, pendingQueryCount,
    'a competing capture must dispatch no persistence or source cleanup');
  assert.equal(calls.toasts.at(-1).message, 'Another save is pending.');
}

async function assertSaveAllTabsAdoptionBoundary() {
  const oldSpace = { id: 'space-1', name: 'Research', groups: [] };
  const oldWorkspace = { id: 'workspace-1', name: 'Personal', activeCatId: oldSpace.id, categories: [oldSpace] };
  const adoptedSpace = { id: 'space-1', name: 'Research', groups: [] };
  const adoptedWorkspace = { id: 'workspace-1', name: 'Personal', activeCatId: adoptedSpace.id, categories: [adoptedSpace] };
  let state = {
    workspaces: [oldWorkspace], activeWsId: oldWorkspace.id, archive: [], trash: [],
    settings: { closeTabOnSave: true },
  };
  const adoptedState = {
    workspaces: [adoptedWorkspace], activeWsId: adoptedWorkspace.id, archive: [], trash: [],
    settings: { closeTabOnSave: true },
  };
  const calls = { queries: 0, ids: 0, snapshots: 0, commits: 0, renders: 0, successes: 0, toasts: [] };
  const tabs = [
    { id: 11, windowId: 7, active: false, url: 'https://one.example', title: 'One' },
    { id: 12, windowId: 7, active: false, url: 'https://two.example', title: 'Two' },
  ];
  const context = vm.createContext({
    URL,
    chrome: { tabs: { async query() {
      calls.queries += 1;
      state = adoptedState;
      return tabs;
    } } },
    activeWs() { return state.workspaces.find(workspace => workspace.id === state.activeWsId) || null; },
    activeCat() {
      const workspace = state.workspaces.find(candidate => candidate.id === state.activeWsId);
      return workspace?.categories.find(space => space.id === workspace.activeCatId) || null;
    },
    isOpenableSavedTabUrl() { return true; },
    State: {
      get() { return state; },
      isRecoveryRequired() { return false; },
      snapshot() { calls.snapshots += 1; return 'save-all'; },
    },
    LocusImportUtils: { collectEntityIds() { return new Set(); } },
    uid() { calls.ids += 1; return `generated-${calls.ids}`; },
    appLocale() { return 'en-US'; },
    tr(key, vars = {}) {
      const copy = {
        'capture.pending': 'Another save is pending',
        'capture.windowReadFailed': 'Window read failed',
        'capture.noWindowTabs': 'No saveable tabs',
        'capture.windowDestinationUnavailable': 'Locus couldn’t confirm this Space, so no tabs were saved or closed.',
        'capture.snapshotWindow': 'Save {count} open tabs as a Group',
        'capture.sessionName': 'Session {date} {time}',
        'capture.savedWindow': 'Saved this window as a Group',
        'capture.savedWindowCopy': 'Saved copies from this window as a Group',
      };
      return String(copy[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
    },
    captureTabFields(tab) { return { title: tab.title, fav: '' }; },
    stampNew(item) { return item; },
    async commitCapturedTabs() {
      calls.commits += 1;
      return { actionId: 'save-all', closeSources: true, requestedCloseCount: 1, closedCount: 1, failedCloseCount: 0 };
    },
    syncOpenTabRailCaptureControls() {},
    renderBoard() { calls.renders += 1; },
    toastCaptureResult() { calls.successes += 1; },
    toast(message, options = {}) { calls.toasts.push({ message, options }); },
  });
  vm.runInContext(
    `let captureCommitPending = false; let saveAllTabsPending = false;\n` +
    `${identitySpaceTargetSource}\n${createGeneratedGroupCaptureContextSource}\n` +
    `${resolveGeneratedGroupCaptureTargetSource}\n${reportGeneratedGroupCaptureUnavailableSource}\n` +
    `${generatedCaptureGroupNameSource}\n${createOrganizationIdAllocatorSource}\n` +
    `${saveAllTabsSource}\nglobalThis.runSaveAllTabs = saveAllTabs;`,
    context,
    { filename: 'save-all-tabs-adoption-contract.js' },
  );

  const result = await context.runSaveAllTabs();
  assert.deepEqual(oldSpace.groups, [], 'the detached Space must remain unmodified');
  assert.deepEqual(adoptedSpace.groups, [], 'the authoritative Space must not receive an unreviewed generated Group');
  assert.equal(calls.snapshots, 0, 'stale Save all must stop before history');
  assert.equal(calls.commits, 0, 'stale Save all must dispatch no persistence or source cleanup');
  assert.equal(calls.renders, 0, 'stale Save all must not repaint a false result');
  assert.equal(calls.successes, 0, 'stale Save all must report no success');
  assert.equal(calls.queries, 1, 'Save all must reproduce the single asynchronous window-read boundary');
  assert.equal(calls.ids, 0, 'stale Save all must stop before allocating any persistent ID');
  assert.equal(calls.toasts.at(-1).message,
    'Locus couldn’t confirm this Space, so no tabs were saved or closed.',
    'stale Save all must explain that neither saving nor closing happened');
  assert.equal(result, false,
    'Save all must fail closed when storage adoption replaces its reviewed Space during the browser read');
}

async function assertSaveAllTabsFailureStates() {
  const eligibleTab = { id: 41, windowId: 9, active: false, url: 'https://eligible.example', title: 'Eligible' };
  const buildHarness = ({ query, recovery = false, allocationFails = false } = {}) => {
    const groupList = [];
    const calls = { queries: 0, reviews: 0, resolves: 0, ids: 0, snapshots: 0, commits: 0, renders: 0, successes: 0, toasts: [] };
    const context = vm.createContext({
      __commitPending: false,
      chrome: { tabs: { async query() { calls.queries += 1; return query(); } } },
      State: {
        get() { return { settings: { closeTabOnSave: true } }; },
        isRecoveryRequired() { return recovery; },
        snapshot() { calls.snapshots += 1; return 'save-all'; },
      },
      createGeneratedGroupCaptureContext() { calls.reviews += 1; return { reviewed: true }; },
      resolveGeneratedGroupCaptureTarget() {
        calls.resolves += 1;
        return { workspace: { name: 'Personal' }, space: { name: 'Research', groups: groupList } };
      },
      reportGeneratedGroupCaptureUnavailable() {
        calls.toasts.push('capture.windowDestinationUnavailable');
        return false;
      },
      createOrganizationIdAllocator() {
        if (allocationFails) throw new Error('allocator failed');
        return () => `generated-${++calls.ids}`;
      },
      generatedCaptureGroupName() { return 'Session'; },
      captureDestinationReceiptMessage() { return 'Saved to exact Group'; },
      captureTabFields(tab) { return { title: tab.title, fav: '' }; },
      stampNew(item) { return item; },
      isOpenableSavedTabUrl(url) { return /^https:/.test(String(url)); },
      async commitCapturedTabs() { calls.commits += 1; return { closeSources: true }; },
      syncOpenTabRailCaptureControls() {},
      renderBoard() { calls.renders += 1; },
      toastCaptureResult() { calls.successes += 1; },
      tr(key) { return key; },
      toast(message) { calls.toasts.push(message); },
    });
    vm.runInContext(
      `let captureCommitPending = false; let saveAllTabsPending = false;\n${saveAllTabsSource}\n` +
      'globalThis.runSaveAllTabs = saveAllTabs; globalThis.setCaptureCommitPending = value => { captureCommitPending = value; };',
      context,
      { filename: 'save-all-tabs-failure-contract.js' },
    );
    return { context, calls, groupList };
  };

  const rejected = buildHarness({ query: async () => { throw new Error('tabs unavailable'); } });
  assert.equal(await rejected.context.runSaveAllTabs(), false);
  assert.deepEqual(rejected.calls.toasts, ['capture.windowReadFailed']);
  assert.equal(rejected.calls.snapshots, 0);
  assert.equal(rejected.calls.commits, 0);

  let releaseDuplicateQuery;
  const duplicateQuery = new Promise(resolve => { releaseDuplicateQuery = resolve; });
  const duplicate = buildHarness({ query: () => duplicateQuery });
  const firstDuplicate = duplicate.context.runSaveAllTabs();
  await Promise.resolve();
  assert.equal(await duplicate.context.runSaveAllTabs(), false,
    'duplicate Save all activation must be refused while the first window read is pending');
  assert.equal(duplicate.calls.queries, 1, 'duplicate activation must not start a second browser read');
  assert.deepEqual(duplicate.calls.toasts, ['capture.pending']);
  releaseDuplicateQuery([{ ...eligibleTab, url: 'data:text/plain,private' }]);
  assert.equal(await firstDuplicate, false);
  assert.deepEqual(duplicate.calls.toasts, ['capture.pending', 'capture.noWindowTabs'],
    'the original request must retain its truthful no-eligible result');
  assert.equal(duplicate.calls.snapshots, 0);

  let releaseCompetingQuery;
  const competingQuery = new Promise(resolve => { releaseCompetingQuery = resolve; });
  const competing = buildHarness({ query: () => competingQuery });
  const competingRun = competing.context.runSaveAllTabs();
  await Promise.resolve();
  competing.context.setCaptureCommitPending(true);
  releaseCompetingQuery([eligibleTab]);
  assert.equal(await competingRun, false,
    'a competing capture that starts during the browser read must stop Save all before history');
  assert.equal(competing.calls.snapshots, 0);
  assert.equal(competing.calls.ids, 0);
  assert.deepEqual(competing.groupList, []);
  assert.deepEqual(competing.calls.toasts, ['capture.pending']);

  const allocation = buildHarness({ query: async () => [eligibleTab], allocationFails: true });
  assert.equal(await allocation.context.runSaveAllTabs(), false);
  assert.equal(allocation.calls.snapshots, 0, 'ID allocation failure must stop before history');
  assert.equal(allocation.calls.commits, 0, 'ID allocation failure must dispatch no write or source cleanup');
  assert.deepEqual(allocation.groupList, []);
  assert.deepEqual(allocation.calls.toasts, ['capture.windowDestinationUnavailable']);

  const blockedRecovery = buildHarness({ query: async () => [eligibleTab], recovery: true });
  assert.equal(await blockedRecovery.context.runSaveAllTabs(), false);
  assert.equal(blockedRecovery.calls.reviews, 0, 'existing recovery must block before destination review');
  assert.equal(blockedRecovery.calls.queries, 0, 'existing recovery must block before browser reads');
  assert.deepEqual(blockedRecovery.calls.toasts, [], 'the existing recovery surface remains the sole feedback owner');
}

async function assertPaletteRejectsUnreopenableActiveTab() {
  const recentPage = {
    id: 32,
    windowId: 44,
    url: 'https://recent.example/work',
    title: 'Recent work',
    lastAccessed: 200,
  };
  const unsavedPage = {
    id: 30,
    windowId: 44,
    url: 'https://older.example/work',
    title: 'Older unsaved work',
    lastAccessed: 100,
  };
  const paletteInbox = {
    id: 'palette-inbox',
    name: 'Inbox',
    items: [{ id: 'saved-recent', type: 'tab', url: recentPage.url }],
  };
  const paletteSpace = { id: 'palette-space', groups: [paletteInbox] };
  const paletteState = { settings: { captureDeduplicate: true } };
  let queryResult = [
    { id: 31, windowId: 44, url: 'chrome-extension://locus/newtab.html', active: true, lastAccessed: 300 },
    unsavedPage,
    recentPage,
    { id: 33, windowId: 44, url: 'https://moving.example/old', pendingUrl: 'https://moving.example/new', lastAccessed: 400 },
  ];
  let queryFailure = false;
  const calls = { queries: [], saves: [], toasts: [] };
  const context = vm.createContext({
    URL,
    State: { get() { return paletteState; } },
    activeCat() { return paletteSpace; },
    chrome: { tabs: { async query(options) {
      calls.queries.push(options);
      if (queryFailure) throw new Error('tabs unavailable');
      return queryResult;
    } } },
    tr(key) { return key; },
    toast(message, options) { calls.toasts.push({ message, options }); },
    async saveTabToInbox(tab, options) { calls.saves.push({ tab, options }); return tab; },
  });
  vm.runInContext(
    `${savedTabUrlPolicySource}\n${recentSaveCandidateSource}\n${captureDestinationTabUrlsSource}\n` +
    `${captureDuplicateExistsSource}\n${homeTrailSaveCandidateSource}\n${paletteSaveActiveTabSource}\n` +
    'globalThis.__saveActive = _palSaveActiveTab;',
    context,
    { filename: 'palette-capture-url-policy-contract.js' },
  );

  await context.__saveActive();

  assert.deepEqual(JSON.parse(JSON.stringify(calls.queries[0])), { currentWindow: true },
    'the palette must inspect the fresh current-window inventory rather than the active Locus page');
  assert.equal(calls.saves.length, 1, 'the palette must dispatch one recent eligible browser page');
  assert.equal(calls.saves[0].tab, unsavedPage,
    'the palette must skip a newer Inbox duplicate and dispatch the next recent unsaved page');
  assert.deepEqual(JSON.parse(JSON.stringify(calls.saves[0].options)), { destinationReceipt: true },
    'the palette Save must retain its exact destination receipt');
  assert.equal(calls.toasts.length, 0, 'a recent eligible page must not emit failure feedback');

  queryResult = [{ id: 31, url: 'blob:https://example.com/private', title: 'Private draft' }];
  await context.__saveActive();

  assert.equal(calls.saves.length, 1,
    'the palette must not dispatch a page that the shared Reopen contract rejects');
  assert.equal(calls.toasts.length, 1, 'an unsupported palette Save must give one existing recovery message');
  assert.equal(calls.toasts[0].message, 'palette.noActiveTab',
    'the palette must report that no savable browser page was found');
  assert.equal(calls.toasts[0].options.danger, true,
    'the refused palette action must remain visible as a failure rather than quiet success');

  queryFailure = true;
  await context.__saveActive();
  assert.equal(calls.saves.length, 1, 'a failed browser inventory read must dispatch no Save');
  assert.equal(calls.toasts.length, 2, 'a failed browser inventory read must reuse one localized recovery message');
}

function assertPaletteSavedPageRecovery() {
  const workspace = { id: 'palette-workspace' };
  const item = { id: 'palette-item', type: 'tab', title: 'Quarterly report', url: 'https://report.example/q3' };
  const target = { ws: workspace, item };
  const recovery = { workspaceRef: workspace, itemId: item.id };
  const calls = { opens: [], unavailable: 0 };
  let activeWorkspace = workspace;
  let resolvedTarget = target;
  const activationContext = vm.createContext({
    activeWs: () => activeWorkspace,
    resolveSavedItemRecoveryTarget: () => resolvedTarget,
    isOpenableSavedTabUrl: url => /^https?:/.test(String(url || '')),
    openSavedTabItem(opened, options) {
      calls.opens.push({ opened, options });
      return true;
    },
    reportSearchRecoveryUnavailable() {
      calls.unavailable += 1;
      return false;
    },
  });
  vm.runInContext(
    `${resolveLandingRecoveryTargetSource}\n${paletteOpenSavedLinkSource}\nglobalThis.__paletteOpen = _palOpenSavedLink;`,
    activationContext,
    { filename: 'palette-saved-page-recovery-contract.js' },
  );
  assert.equal(activationContext.__paletteOpen(recovery), true,
    'an exact saved-page command must be accepted for shared Reopen');
  assert.equal(calls.opens.length, 1, 'an exact command must delegate one browser effect');
  assert.equal(calls.opens[0].opened, item, 'the shared opener must receive the exact re-resolved item');
  assert.equal(calls.opens[0].options.focus, true, 'palette activation must request foreground Reopen');
  assert.equal(calls.opens[0].options.reportUnavailable, false,
    'preflight refusal must own one palette recovery message');

  activeWorkspace = { id: workspace.id };
  assert.equal(activationContext.__paletteOpen(recovery), false,
    'an active-Workspace replacement must refuse the visible command');
  assert.equal(calls.opens.length, 1, 'a stale Workspace must produce no browser effect');
  assert.equal(calls.unavailable, 1, 'a stale Workspace must report one existing recovery result');
  activeWorkspace = workspace;
  resolvedTarget = null;
  assert.equal(activationContext.__paletteOpen(recovery), false,
    'a moved, replaced, or ambiguous target must fail closed');
  assert.equal(calls.opens.length, 1, 'an unavailable target must produce no browser effect');
  assert.equal(calls.unavailable, 2);

  const row = {
    ws: workspace,
    cat: { id: 'palette-space', name: 'Research' },
    group: { id: 'palette-group', name: 'Inbox' },
    parents: [{ id: 'palette-stack', name: 'Sources' }],
    item: { ...item, tags: ['finance'], createdAt: 123 },
  };
  const frozenContext = { frozen: true };
  const commandCalls = [];
  const commandContext = vm.createContext({
    URL,
    PAL_ICONS: { link: '<svg></svg>' },
    activeWs: () => workspace,
    createLandingRecoveryContext(candidate, candidateWorkspace) {
      assert.equal(candidate, row);
      assert.equal(candidateWorkspace, workspace);
      return frozenContext;
    },
    landingResultDestinationText: () => 'Desk › Research › Inbox › Sources',
    dispUrl: url => url,
    _palRecentTime: () => 'Today',
    _palOpenSavedLink(context) { commandCalls.push(context); return true; },
    tr(key, values = {}) {
      if (key === 'palette.savedLinkDesc') return `Open ${values.host} · ${values.destination}`;
      if (key === 'palette.savedLink') return 'Saved link';
      return key;
    },
  });
  vm.runInContext(
    `${paletteSavedLinkCommandSource}\nglobalThis.__paletteCommand = _palSavedLinkCommand;`,
    commandContext,
    { filename: 'palette-saved-page-command-contract.js' },
  );
  const command = commandContext.__paletteCommand(row);
  assert.equal(command.desc, 'Open report.example · Desk › Research › Inbox › Sources',
    'the launcher row must state the action and complete local destination');
  assert.equal(command.keepOpenOnFalse, true,
    'an immediate exactness refusal must preserve the visible palette');
  assert.equal(command.run(), true);
  assert.equal(commandCalls[0], frozenContext,
    'activation must use the frozen recovery context instead of the raw row');

  const paletteControl = { closes: 0, builds: 0, renders: [], focuses: 0, result: false };
  const runContext = vm.createContext({
    _palState: { filtered: [{ keepOpenOnFalse: true, run: () => paletteControl.result }], query: 'quarterly' },
    closeCommandPalette() { paletteControl.closes += 1; },
    buildPaletteCommands() { paletteControl.builds += 1; return [{ id: 'fresh' }]; },
    _palRender(query) { paletteControl.renders.push(query); },
    requestAnimationFrame(callback) { callback(); },
    document: { getElementById: id => id === 'cmdp-input' ? { focus() { paletteControl.focuses += 1; } } : null },
    console: { error() {} },
    toast() {},
  });
  vm.runInContext(`${paletteRunSource}\nglobalThis.__paletteRun = _palRun;`, runContext,
    { filename: 'palette-command-acceptance-contract.js' });
  assert.equal(runContext.__paletteRun(0), false,
    'an immediate refused saved-page command must remain in the palette');
  assert.equal(paletteControl.closes, 0, 'immediate refusal must not dismiss the user query');
  assert.equal(paletteControl.builds, 1, 'immediate refusal must rebuild current local commands');
  assert.deepEqual(paletteControl.renders, ['quarterly'], 'immediate refusal must retain the exact query');
  assert.equal(paletteControl.focuses, 1, 'refreshed recovery must return focus to the query input');

  paletteControl.result = true;
  assert.equal(runContext.__paletteRun(0), true);
  assert.equal(paletteControl.closes, 1, 'an accepted saved-page activation must dismiss the palette once');

  assert.doesNotMatch(paletteOpenSavedLinkSource,
    /State\.persist|activeCatId|renderAll|openItemDetail|activeLibraryMode|activeHome|activeGroupPage|activeCalendar/,
    'palette Reopen must not switch Space, render Details, or persist navigation');
  assert.match(paletteRecentCommandsSource, /filter\(row => isOpenableSavedTabUrl\(row\.item\.url\)\)/,
    'recent launcher rows must exclude unsupported saved addresses');
  assert.match(paletteMatchingLinksSource, /filter\(row => isOpenableSavedTabUrl\(row\.item\.url\)\)/,
    'query-matched launcher rows must exclude unsupported saved addresses');
  assert.ok(source.includes("'palette.recent': 'Recently saved'"),
    'the English section heading must describe the saved-page source');
  assert.ok(source.includes("'palette.recent': '最近儲存'"),
    'the zh-TW section heading must use ordinary Taiwan wording');
  assert.ok(source.includes("'palette.savedLinkDesc': 'Open {host} · {destination}'"),
    'the English row must state its Open consequence and destination');
  assert.ok(source.includes("'palette.savedLinkDesc': '開啟 {host} · {destination}'"),
    'the zh-TW row must state its Open consequence and destination');
}

async function assertUnsupportedGroupSelectionDoesNotFallThrough() {
  const tabs = [{ id: 35, url: 'blob:https://example.com/private', title: 'Blob draft' }];
  const selected = new Set([35]);
  const group = { id: 'group-1', name: 'Research', items: [] };
  const calls = { queries: 0, snapshots: 0, commits: 0, renders: 0, railRenders: 0, badges: 0, focusRestores: 0, results: 0, toasts: 0 };
  let activeTab = { id: 36, url: 'https://active.example', title: 'Active page' };
  let commitAccepted = false;
  const context = vm.createContext({
    URL,
    __tabs: tabs,
    __selected: selected,
    chrome: { tabs: { async query(options) {
      calls.queries += 1;
      assert.deepEqual(JSON.parse(JSON.stringify(options)), { currentWindow: true },
        'no-selection Group Save must inspect the fresh window rather than the active Locus page');
      return Array.isArray(activeTab) ? activeTab : [activeTab];
    } } },
    State: {
      get() { return { settings: { closeTabOnSave: true } }; },
      isRecoveryRequired() { return false; },
      snapshot() { calls.snapshots += 1; return 'action-group'; },
    },
    tr(key) { return key; },
    createGroupCaptureContext() { return { groupRef: group }; },
    resolveGroupCaptureTarget() {
      return { workspace: { name: 'Personal' }, space: { name: 'Research' }, group };
    },
    reportGroupCaptureUnavailable() { calls.toasts += 1; return false; },
    captureDestinationReceiptMessage() { return 'Saved to exact Group'; },
    createItemListCaptureContext(items) { return { listRef: items }; },
    createCaptureDestinationReceiptContext(destinationContext, items) {
      return { destinationContext, itemRefs: Array.from(items) };
    },
    resolveItemListCaptureTarget(destinationContext) {
      return destinationContext?.listRef === group.items
        ? { workspace: { name: 'Personal' }, space: { name: 'Research' }, group, stacks: [] }
        : null;
    },
    resolveCaptureDestinationReceiptTarget(receiptContext) {
      return receiptContext?.destinationContext?.listRef === group.items
        && receiptContext.itemRefs.every(item => group.items.includes(item))
        ? { group, items: receiptContext.itemRefs }
        : null;
    },
    captureDuplicateExists() { return false; },
    captureTabFields(tab) { return { title: tab.title, fav: '' }; },
    stampNew(item) { return item; },
    uid() { return 'unsafe-group-item'; },
    createOrganizationIdAllocator() { return () => 'safe-group-item'; },
    async commitCapturedTabs(captured) {
      calls.commits += 1;
      return commitAccepted
        ? { actionId: 'action-group', closeSources: true, requestedCloseCount: captured.length, closedCount: captured.length, failedCloseCount: 0 }
        : false;
    },
    renderBoard() { calls.renders += 1; },
    renderOpenTabs() { calls.railRenders += 1; },
    updateSelectedBadge() { calls.badges += 1; },
    restoreOpenTabCaptureFocus() { calls.focusRestores += 1; },
    toastCaptureDestinationReceipt() { calls.results += 1; },
    toast() { calls.toasts += 1; },
    isProto() { return false; },
  });
  vm.runInContext(
    `let allOpenTabs = __tabs; let selectedTabIds = __selected; let lastClickedTabId = 35;\n` +
    `let captureCommitPending = false; let saveAllTabsPending = false;\n` +
    `${savedTabUrlPolicySource}\n${recentSaveCandidateSource}\n` +
    `${captureEligibleTabsSource}\n${selectedCaptureTabsSource}\n` +
    `${captureDestinationTabUrlsSource}\n${createCaptureBatchDuplicateFilterSource}\n` +
    `${clearCapturedTabSelectionSource}\n${addSidebarOrActiveTabToGroupSource}\n` +
    'globalThis.__run = addSidebarOrActiveTabToGroup;',
    context,
    { filename: 'add-group-url-policy-contract.js' },
  );

  await context.__run(group);

  assert.deepEqual(group.items, [],
    'an unsupported selected page must not be added to an existing Group');
  assert.deepEqual(calls, { queries: 0, snapshots: 0, commits: 0, renders: 0, railRenders: 0, badges: 0, focusRestores: 0, results: 0, toasts: 0 },
    'a refused selected Group-add must not fall through to the active tab or start side effects');
  assert.deepEqual(Array.from(selected), [35],
    'a refused unsupported Group selection must remain available for explicit Close or clearing');

  selected.clear();
  activeTab = { id: 36, url: 'blob:https://example.com/private', title: 'Active blob draft' };
  for (const key of Object.keys(calls)) calls[key] = 0;
  await context.__run(group);
  assert.deepEqual(group.items, [],
    'an unsupported active page must not be added to an existing Group');
  assert.deepEqual(calls, { queries: 1, snapshots: 0, commits: 0, renders: 0, railRenders: 0, badges: 0, focusRestores: 0, results: 0, toasts: 1 },
    'an unsupported active Group-add must stop after discovery with the existing guidance');

  tabs.splice(0, tabs.length,
    { id: 37, url: 'https://example.com/recoverable', title: 'Recoverable page' },
    { id: 38, url: 'data:text/plain,private', title: 'Data draft' });
  selected.add(37);
  selected.add(38);
  commitAccepted = true;
  for (const key of Object.keys(calls)) calls[key] = 0;
  await context.__run(group);
  assert.deepEqual(Array.from(group.items, item => item.url), ['https://example.com/recoverable'],
    'a mixed existing-Group selection must persist only the recoverable page');
  assert.deepEqual(Array.from(selected), [38],
    'a mixed existing-Group save must leave the unsupported tab selected');
  assert.equal(calls.railRenders, 1,
    'a mixed existing-Group save must repaint the retained selection once');
  assert.equal(calls.focusRestores, 1,
    'a mixed existing-Group save must restore focus to the retained selection');

  selected.clear();
  activeTab = [
    { id: 39, windowId: 4, active: true, url: 'chrome-extension://locus/newtab.html', lastAccessed: 300 },
    { id: 40, windowId: 4, active: false, url: 'https://example.com/recent', title: 'Recent page', lastAccessed: 200 },
    { id: 41, windowId: 4, active: false, url: 'https://example.com/old', pendingUrl: 'https://example.com/new', lastAccessed: 400 },
  ];
  for (const key of Object.keys(calls)) calls[key] = 0;
  await context.__run(group);
  assert.deepEqual(Array.from(group.items, item => item.url), [
    'https://example.com/recoverable',
    'https://example.com/recent',
  ], 'no-selection Group Save must file the freshest stable eligible browser page');
  assert.equal(calls.queries, 1, 'no-selection Group Save must make one fresh current-window read');
  assert.equal(calls.commits, 1, 'the selected recent page must enter one acknowledged commit');
  assert.equal(calls.results, 1, 'the selected recent page must retain one exact destination receipt');
}

function assertCapturedSelectionFocusContinuity() {
  const selected = new Set([28]);
  const calls = { checkboxFocus: 0, filterFocus: 0, toggleFocus: 0, fallbackFocus: 0 };
  let activeElement = null;
  let filterAcceptsFocus = true;
  let railAvailable = true;
  let visibleSelectedCheckbox = {
    focus() { calls.checkboxFocus += 1; activeElement = visibleSelectedCheckbox; },
  };
  const filter = {
    focus() { calls.filterFocus += 1; if (filterAcceptsFocus) activeElement = filter; },
  };
  const toggle = {
    focus() { calls.toggleFocus += 1; activeElement = toggle; },
  };
  const fallback = {
    focus(options) { assert.equal(options.preventScroll, true); calls.fallbackFocus += 1; activeElement = fallback; },
  };
  const context = vm.createContext({
    __selected: selected,
    isOpenTabsRailAvailable() { return railAvailable; },
    requestAnimationFrame(callback) { callback(); },
    document: {
      get activeElement() { return activeElement; },
      querySelector(selector) {
        assert.equal(selector, '#open-tabs .otab.selected:not(.hidden) .otab-check');
        return visibleSelectedCheckbox;
      },
      getElementById(id) {
        if (id === 'tab-filter') return filter;
        if (id === 'tabrail-toggle') return toggle;
        if (id === 'topbar-save') return fallback;
        return null;
      },
    },
  });
  vm.runInContext(
    `let selectedTabIds = __selected;\n${restoreOpenTabCaptureFocusSource}\n` +
    'globalThis.__restore = restoreOpenTabCaptureFocus;',
    context,
    { filename: 'captured-selection-focus-contract.js' },
  );

  assert.equal(context.__restore(), true, 'a retained selection must expose a stable focus result');
  assert.equal(calls.checkboxFocus, 1,
    'a mixed Save must return focus to the first visible remaining selected tab');
  assert.equal(calls.filterFocus, 0, 'a retained selection must take precedence over the rail fallback');

  visibleSelectedCheckbox = null;
  activeElement = null;
  assert.equal(context.__restore(), true, 'a filtered retained selection must expose a stable focus result');
  assert.equal(calls.checkboxFocus, 1, 'a filtered-out checkbox must not receive focus');
  assert.equal(calls.filterFocus, 1,
    'a filtered retained selection must return focus to the rail filter');

  selected.clear();
  activeElement = null;
  assert.equal(context.__restore(), true, 'a complete selection Save must expose a stable focus result');
  assert.equal(calls.filterFocus, 2,
    'a complete Save must return focus to the rail filter after the selected controls disappear');

  filterAcceptsFocus = false;
  activeElement = null;
  assert.equal(context.__restore(), true, 'a collapsed rail must expose a stable focus result');
  assert.equal(calls.toggleFocus, 1,
    'when the rail filter cannot take focus, the visible rail toggle must receive it');

  railAvailable = false;
  filterAcceptsFocus = true;
  activeElement = null;
  assert.equal(context.__restore(), true, 'the hidden 800px rail must expose a visible shell fallback');
  assert.equal(calls.filterFocus, 3, 'the hidden rail must not receive another filter focus attempt');
  assert.equal(calls.fallbackFocus, 1,
    'an accepted Save at the hidden rail boundary must return focus to the visible top-bar Save action');
}

async function assertUnsupportedSingleDropIsInert() {
  const list = [];
  const calls = { snapshots: 0, commits: 0, renders: 0, results: 0, toasts: 0 };
  const context = vm.createContext({
    URL,
    State: {
      snapshot() { calls.snapshots += 1; return 'action-drop'; },
      latestActionId() { return 'existing-action'; },
    },
    stampNew(item) { return item; },
    uid() { return 'unsafe-drop'; },
    async commitCapturedTabs() { calls.commits += 1; return false; },
    renderBoard() { calls.renders += 1; },
    toastCaptureResult() { calls.results += 1; },
    toast() { calls.toasts += 1; },
  });
  vm.runInContext(
    `${savedTabUrlPolicySource}\n${captureEligibleTabsSource}\n${handleTabDropIntoListSource}\n` +
    'globalThis.__run = handleTabDropIntoList;',
    context,
    { filename: 'single-drop-url-policy-contract.js' },
  );

  const result = await context.__run({
    tabId: 41,
    title: 'Private draft',
    url: 'data:text/plain,private',
  }, list, 0);

  assert.equal(result, false, 'an unsupported drop must report that no capture occurred');
  assert.deepEqual(list, [], 'an unsupported drop must not create a saved item');
  assert.deepEqual(calls, { snapshots: 0, commits: 0, renders: 0, results: 0, toasts: 0 },
    'an unsupported drop must stop before history, persistence, close, render, or feedback');
}

const homeTrailModelContext = vm.createContext({
  isOpenableSavedTabUrl(value) {
    try { return ['http:', 'https:', 'ftp:', 'file:'].includes(new URL(value).protocol); } catch { return false; }
  },
  URL,
});
vm.runInContext(
  `${homeTrailItemCanOfferOpenSource}\n${homeTrailRecoveryActionPlanSource}\n${homeTrailCaptureActionPlanSource}\n${homeTrailBlockedDestinationActionPlanSource}\n${homeProgressiveZonePlanSource}\n${newestHomeRowsSource}\n${recentSaveCandidateSource}\n${capturedTabSourceDescriptorSource}\n${capturedTabStillMatchesSource}\n${homeTrailPrimaryCloseSourceSource}\n` +
  'globalThis.__homeTrailModel = { homeTrailRecoveryActionPlan, homeTrailCaptureActionPlan, homeTrailBlockedDestinationActionPlan, homeProgressiveZonePlan, newestHomeRows, recentSaveCandidate, capturedTabStillMatches, homeTrailPrimaryCloseSource };',
  homeTrailModelContext,
  { filename: 'home-trail-model-contract.js' },
);
const homeTrailModel = homeTrailModelContext.__homeTrailModel;

assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeTrailRecoveryActionPlan({
    id: 'saved-page', type: 'tab', url: 'https://resume.example/work',
  }))),
  [
    { key: 'open', className: 'btn-primary home-trail-open' },
    { key: 'review', className: 'btn-secondary home-trail-review' },
  ],
  'an openable Home page must expose Open first and Details second with one primary action',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeTrailRecoveryActionPlan({ id: 'saved-note', type: 'note' }))),
  [{ key: 'review', className: 'btn-primary home-trail-review' }],
  'a non-page Home fallback must keep Details as its one primary continuation',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeTrailRecoveryActionPlan({ type: 'tab', url: 'https://missing-id.example' }))),
  [{ key: 'review', className: 'btn-primary home-trail-review' }],
  'a malformed page without stable identity must not advertise Open authority',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeTrailCaptureActionPlan({
    closePrimary: true,
    recoveryHasPrimary: true,
  }))),
  [
    { key: 'save-primary', closeSource: true, className: 'btn-secondary home-trail-save' },
    { key: 'save-alternate', closeSource: false, className: 'btn-secondary home-trail-save' },
  ],
  'an established Home must retain both Save consequences without competing with its primary recovery action',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeTrailCaptureActionPlan({
    closePrimary: false,
    recoveryHasPrimary: false,
  }))),
  [
    { key: 'save-primary', closeSource: false, className: 'btn-primary home-trail-save' },
    { key: 'save-alternate', closeSource: true, className: 'btn-secondary home-trail-save' },
  ],
  'an empty Home must give the remembered Save consequence the sole primary emphasis',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeTrailBlockedDestinationActionPlan(null))),
  [{
    key: 'create-space',
    className: 'btn-primary home-trail-create-space',
    labelKey: 'organization.space.createTitle',
  }],
  'a Home with no Space must expose one primary action that removes the save prerequisite',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeTrailBlockedDestinationActionPlan({ id: 'space-present' }))),
  [],
  'a normal Space must not receive a blocked-destination action',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeTrailBlockedDestinationActionPlan(
    { id: 'space-present' },
    { inboxCount: 2 },
    { recoveryHasPrimary: true },
  ))),
  [{
    key: 'review-space',
    className: 'btn-secondary home-trail-review-space',
    labelKey: 'home.trail.openSpace',
    ariaLabelKey: 'home.trail.openSpaceFor',
  }],
  'a duplicate-Inbox conflict must offer a quiet Space continuation beside an existing primary recovery action',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeTrailBlockedDestinationActionPlan(
    { id: 'space-present' },
    { inboxCount: 2 },
  ))),
  [{
    key: 'review-space',
    className: 'btn-primary home-trail-review-space',
    labelKey: 'home.trail.openSpace',
    ariaLabelKey: 'home.trail.openSpaceFor',
  }],
  'a conflict-only Home must give its sole safe continuation primary emphasis',
);
for (const inboxCount of [0, 1]) assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeTrailBlockedDestinationActionPlan(
    { id: 'space-present' },
    { inboxCount },
  ))),
  [],
  'a provisionable or exact Inbox destination must not show conflict recovery',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeProgressiveZonePlan({ categories: [] }, null))),
  { showInbox: false, showSpaces: false },
  'a no-Space Home must stop after the Trail instead of repeating setup actions',
);
for (const inboxCount of [0, 2]) assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeProgressiveZonePlan(
    { categories: [{ id: 'space-present' }] },
    inboxCount === 0 ? null : { inboxCount, inboxRef: { id: 'inbox' }, groupId: 'inbox' },
  ))),
  { showInbox: false, showSpaces: true },
  'a missing or duplicate Inbox must not expose an invented Inbox review target',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(homeTrailModel.homeProgressiveZonePlan(
    { categories: [{ id: 'space-present' }] },
    { inboxCount: 1, inboxRef: { id: 'inbox' }, groupId: 'inbox' },
  ))),
  { showInbox: true, showSpaces: true },
  'one exact Inbox must retain the normal Inbox and Spaces recovery zones',
);

const rowA = { item: { id: 'a', createdAt: 10 } };
const rowB = { item: { id: 'b', createdAt: 30 } };
const rowC = { item: { id: 'c' } };
assert.deepEqual(
  Array.from(homeTrailModel.newestHomeRows([rowA, rowB, rowC], 3), row => row.item.id),
  ['b', 'a', 'c'],
  'Home Trail must prefer real createdAt values while retaining every legacy row',
);
assert.deepEqual(
  Array.from(homeTrailModel.newestHomeRows([{ item: { id: 'legacy-1' } }, { item: { id: 'legacy-2' } }], 2), row => row.item.id),
  ['legacy-2', 'legacy-1'],
  'legacy Home rows must use deterministic reverse traversal order',
);

const mixedRecoveryRows = [
  { item: { id: 'safe-page', type: 'tab', url: 'https://resume.example/work', createdAt: 10 } },
  { item: { id: 'newer-todo', type: 'todo', createdAt: 80 } },
  { item: { id: 'newer-note', type: 'note', createdAt: 90 } },
  { item: { id: 'unsafe-page', type: 'tab', url: 'data:text/plain,private', createdAt: 100 } },
];
assert.equal(
  homeTrailModel.newestHomeRows(mixedRecoveryRows, 1, { preferReopenableTab: true })[0]?.item?.id,
  'safe-page',
  'Home must lead with the newest page eligible for guarded Reopen instead of a newer note, to-do, or unsafe page',
);
assert.equal(
  homeTrailModel.newestHomeRows(mixedRecoveryRows.slice(1), 1, { preferReopenableTab: true })[0]?.item?.id,
  'unsafe-page',
  'Home must retain its newest-item fallback when no saved page is eligible for guarded Reopen',
);

const recentCandidate = homeTrailModel.recentSaveCandidate([
  { id: 1, url: 'chrome://newtab', lastAccessed: 100 },
  { id: 2, url: 'https://older.example', lastAccessed: 10 },
  { id: 3, url: 'https://newer.example', lastAccessed: 20 },
]);
assert.equal(recentCandidate.id, 3, 'Trail display and activation must share the newest saveable-tab selector');
assert.equal(
  homeTrailModel.recentSaveCandidate([{ id: 4, url: 'https://moving.example', pendingUrl: 'https://elsewhere.example', lastAccessed: 99 }]),
  null,
  'a tab with a conflicting pending navigation must not become the displayed candidate',
);
for (const unsafeUrl of ['blob:https://example.com/id', 'data:text/plain,unfinished', 'javascript:alert(1)', 'chrome://settings']) {
  assert.equal(
    homeTrailModel.recentSaveCandidate([{ id: 5, url: unsafeUrl, lastAccessed: 100 }]),
    null,
    `a page that cannot use the shared safe reopen path must not be offered for save-and-close: ${unsafeUrl}`,
  );
}

const captured = { id: 7, windowId: 2, active: false, url: 'https://same.example' };
assert.equal(homeTrailModel.capturedTabStillMatches(captured, { ...captured }), true);
assert.equal(homeTrailModel.capturedTabStillMatches(captured, { ...captured, url: 'https://changed.example' }), false);
assert.equal(homeTrailModel.capturedTabStillMatches(captured, { ...captured, pendingUrl: 'https://changed.example' }), false);
assert.equal(homeTrailModel.capturedTabStillMatches(captured, { ...captured, windowId: 3 }), false);
assert.equal(homeTrailModel.capturedTabStillMatches(captured, { ...captured, active: true }), false);
assert.equal(homeTrailModel.capturedTabStillMatches({ ...captured, windowId: undefined }, { ...captured }), false);
assert.equal(homeTrailModel.capturedTabStillMatches(captured, { ...captured, pendingUrl: { malformed: true } }), false);
assert.equal(homeTrailModel.homeTrailPrimaryCloseSource({ closeTabOnSave: true }), true);
assert.equal(homeTrailModel.homeTrailPrimaryCloseSource({ closeTabOnSave: false }), false);
assert.equal(homeTrailModel.homeTrailPrimaryCloseSource({}), true, 'missing legacy preference must retain the existing default');

let destinationState;
let activeDestinationWorkspace;
let activeDestinationSpace;
const trailDestinationContext = vm.createContext({
  State: { get() { return destinationState; } },
  activeWs() { return activeDestinationWorkspace; },
  activeCat() { return activeDestinationSpace; },
  tr() { return 'Inbox'; },
  homeTrailPathParts(ws, cat, group) { return [ws.name, cat.name, group]; },
  homeTrailPathText(parts) { return parts.join(' > '); },
});
vm.runInContext(
  `${homeTrailDestinationContextSource}\n${homeTrailDestinationStillMatchesSource}\n` +
  'globalThis.__trailDestination = { homeTrailDestinationContext, homeTrailDestinationStillMatches };',
  trailDestinationContext,
  { filename: 'home-trail-destination-contract.js' },
);
const destinationInbox = { id: 'inbox-identity', name: 'Inbox', items: [] };
const destinationSpace = { id: 'space-destination', name: 'Research', groups: [destinationInbox] };
const destinationWorkspace = { id: 'ws-destination', name: 'Work', categories: [destinationSpace] };
destinationState = { workspaces: [destinationWorkspace] };
activeDestinationWorkspace = destinationWorkspace;
activeDestinationSpace = destinationSpace;
const reviewedDestination = trailDestinationContext.__trailDestination.homeTrailDestinationContext(
  destinationWorkspace,
  destinationSpace,
);
assert.equal(
  trailDestinationContext.__trailDestination.homeTrailDestinationStillMatches(reviewedDestination),
  true,
  'an unchanged exact Workspace, Space, and Inbox destination must resolve',
);
destinationSpace.name = 'Renamed after review';
assert.equal(
  trailDestinationContext.__trailDestination.homeTrailDestinationStillMatches(reviewedDestination),
  false,
  'a renamed destination path must require another review',
);
destinationSpace.name = 'Research';
const replacementSpace = { ...destinationSpace, groups: [destinationInbox] };
destinationWorkspace.categories = [replacementSpace];
activeDestinationSpace = replacementSpace;
assert.equal(
  trailDestinationContext.__trailDestination.homeTrailDestinationStillMatches(reviewedDestination),
  false,
  'a deep-equal same-ID Space replacement must fail closed',
);
destinationWorkspace.categories = [destinationSpace];
activeDestinationSpace = destinationSpace;
const replacementWorkspace = { ...destinationWorkspace, categories: [destinationSpace] };
destinationState.workspaces = [replacementWorkspace];
activeDestinationWorkspace = replacementWorkspace;
assert.equal(
  trailDestinationContext.__trailDestination.homeTrailDestinationStillMatches(reviewedDestination),
  false,
  'a deep-equal same-ID Workspace replacement must fail closed',
);
destinationState.workspaces = [destinationWorkspace];
activeDestinationWorkspace = destinationWorkspace;
destinationSpace.groups = [destinationInbox, { id: 'inbox-duplicate', name: 'Inbox', items: [] }];
assert.equal(
  trailDestinationContext.__trailDestination.homeTrailDestinationStillMatches(reviewedDestination),
  false,
  'a duplicate Inbox introduced after review must fail closed',
);
destinationSpace.groups = [{ ...destinationInbox }];
assert.equal(
  trailDestinationContext.__trailDestination.homeTrailDestinationStillMatches(reviewedDestination),
  false,
  'a deep-equal same-ID Inbox replacement must fail closed',
);
destinationSpace.groups = [];
const reviewedProposedInbox = trailDestinationContext.__trailDestination.homeTrailDestinationContext(
  destinationWorkspace,
  destinationSpace,
);
assert.equal(
  trailDestinationContext.__trailDestination.homeTrailDestinationStillMatches(reviewedProposedInbox),
  true,
  'an unchanged reviewed destination may still provision its first Inbox',
);
destinationSpace.groups = [destinationInbox];

const reviewInboxA = { id: 'review-inbox-a', name: 'Inbox', items: [] };
const reviewInboxB = { id: 'review-inbox-b', name: 'Inbox', items: [] };
const reviewSpace = { id: 'review-space', name: 'Research', groups: [reviewInboxA, reviewInboxB] };
const reviewWorkspace = {
  id: 'review-workspace', name: 'Desk', activeCatId: reviewSpace.id, categories: [reviewSpace],
};
const spaceReviewControl = {
  state: { activeWsId: reviewWorkspace.id, workspaces: [reviewWorkspace] },
  routes: [], toasts: [], focuses: 0, snapshots: 0, persists: 0, navigateResult: true,
};
const spaceReviewContext = vm.createContext({
  State: {
    get: () => spaceReviewControl.state,
    snapshot() { spaceReviewControl.snapshots += 1; },
    persist() { spaceReviewControl.persists += 1; },
  },
  activeWs: () => spaceReviewControl.state.workspaces
    .find(workspace => workspace.id === spaceReviewControl.state.activeWsId) || null,
  activeCat: () => {
    const workspace = spaceReviewControl.state.workspaces
      .find(candidate => candidate.id === spaceReviewControl.state.activeWsId);
    return workspace?.categories.find(space => space.id === workspace.activeCatId) || null;
  },
  Router: {
    navigate(route, options) {
      spaceReviewControl.routes.push(JSON.parse(JSON.stringify({ route, options })));
      return spaceReviewControl.navigateResult;
    },
  },
  toast(message) { spaceReviewControl.toasts.push(message); },
  tr: key => key,
  requestAnimationFrame(callback) { callback(); },
});
vm.runInContext(
  `${identitySpaceTargetSource}\n${resolveHomeTrailSpaceReviewTargetSource}\n${reportHomeTrailSpaceReviewUnavailableSource}\n${openHomeTrailSpaceReviewSource}\n` +
  'globalThis.__spaceReview = { resolveHomeTrailSpaceReviewTarget, openHomeTrailSpaceReview };',
  spaceReviewContext,
  { filename: 'home-trail-space-review-contract.js' },
);
const spaceReviewApi = spaceReviewContext.__spaceReview;
const reviewedSpace = {
  workspaceId: reviewWorkspace.id,
  spaceId: reviewSpace.id,
  workspaceRef: reviewWorkspace,
  spaceRef: reviewSpace,
  workspaceName: reviewWorkspace.name,
  spaceName: reviewSpace.name,
  inboxCount: 2,
};
const reviewOpener = { isConnected: true, focus() { spaceReviewControl.focuses += 1; } };
const graphBeforeReview = JSON.stringify(spaceReviewControl.state);
assert.equal(spaceReviewApi.openHomeTrailSpaceReview(reviewedSpace, reviewOpener), true);
assert.deepEqual(spaceReviewControl.routes, [{
  route: { type: 'board', wsId: reviewWorkspace.id, catId: reviewSpace.id, query: {} },
  options: { persist: false },
}], 'conflict recovery must route once to the exact reviewed Space without a whole-state write');
assert.equal(JSON.stringify(spaceReviewControl.state), graphBeforeReview, 'opening the Space must not mutate local data');
assert.equal(spaceReviewControl.snapshots, 0);
assert.equal(spaceReviewControl.persists, 0);

reviewSpace.groups = [reviewInboxA];
spaceReviewControl.routes = [];
assert.equal(spaceReviewApi.openHomeTrailSpaceReview(reviewedSpace, reviewOpener), true,
  'resolving the Inbox conflict before activation must not invalidate the exact Space continuation');
assert.equal(spaceReviewControl.routes.length, 1);

reviewWorkspace.categories = [{ ...reviewSpace, groups: [reviewInboxA] }];
spaceReviewControl.routes = [];
assert.equal(spaceReviewApi.openHomeTrailSpaceReview(reviewedSpace, reviewOpener), false,
  'a same-ID Space replacement must fail closed');
assert.deepEqual(spaceReviewControl.routes, []);
assert.equal(spaceReviewControl.toasts.at(-1), 'home.trail.spaceUnavailable');
assert.equal(spaceReviewControl.focuses, 1, 'failed recovery must return focus to its initiating action');
reviewWorkspace.categories = [reviewSpace];

spaceReviewControl.state.workspaces.push({
  id: 'review-other-workspace', name: 'Other', activeCatId: reviewSpace.id,
  categories: [{ id: reviewSpace.id, name: 'Duplicate', groups: [] }],
});
assert.equal(spaceReviewApi.resolveHomeTrailSpaceReviewTarget(reviewedSpace), null,
  'a globally duplicated Space ID must not borrow route authority');
spaceReviewControl.state.workspaces.pop();

spaceReviewControl.navigateResult = false;
assert.equal(spaceReviewApi.openHomeTrailSpaceReview(reviewedSpace, reviewOpener), false,
  'a refused route must retain the Home conflict state');
assert.equal(spaceReviewControl.toasts.at(-1), 'home.trail.spaceUnavailable');
assert.equal(spaceReviewControl.focuses, 2);
assert.doesNotMatch(openHomeTrailSpaceReviewSource, /State\.(?:snapshot|persist)|\.groups\s*=|\.splice\(|\.push\(|\.unshift\(/,
  'Space review must not repair, rename, select, or write any destination data');

const shellInbox = { id: 'shell-inbox', name: 'Inbox', items: [] };
const shellSpace = { id: 'shell-space', name: 'Research', groups: [shellInbox] };
const shellWorkspace = {
  id: 'shell-workspace',
  name: 'Desk',
  activeCatId: shellSpace.id,
  categories: [shellSpace],
};
const shellInboxControl = {
  state: { activeWsId: shellWorkspace.id, workspaces: [shellWorkspace] },
  routes: [],
  legacyGroups: [],
  snapshots: 0,
  persists: 0,
  unavailable: 0,
};
const shellInboxContext = vm.createContext({
  State: {
    get: () => shellInboxControl.state,
    snapshot() { shellInboxControl.snapshots += 1; return 'legacy-snapshot'; },
    persist() { shellInboxControl.persists += 1; },
  },
  activeWs: () => shellInboxControl.state.workspaces
    .find(workspace => workspace.id === shellInboxControl.state.activeWsId) || null,
  activeCat: () => {
    const workspace = shellInboxControl.state.workspaces
      .find(candidate => candidate.id === shellInboxControl.state.activeWsId);
    return workspace
      ? workspace.categories.find(space => space.id === workspace.activeCatId) || workspace.categories[0] || null
      : null;
  },
  tr: key => key === 'nav.inbox' ? 'Inbox' : key,
  homeTrailPathParts: (workspace, space, group) => [workspace.name, space.name, group],
  homeTrailPathText: parts => parts.join(' > '),
  uid: () => 'legacy-created-inbox',
  openGroupPage(groupId) { shellInboxControl.legacyGroups.push(groupId); },
  Router: {
    navigate(route, options) {
      shellInboxControl.routes.push(JSON.parse(JSON.stringify({ route, options })));
      return true;
    },
  },
  reportInboxNavigationUnavailable() {
    shellInboxControl.unavailable += 1;
    return false;
  },
});
vm.runInContext(
  `let activeLibraryMode = null; let activeHome = true;\n${homeTrailDestinationContextSource}\n${homeTrailDestinationStillMatchesSource}\n${organizationGroupTargetSource}\n${identitySpaceTargetSource}\n${identityGroupTargetSource}\n${createLandingInboxContextSource}\n${resolveLandingInboxTargetSource}\n${openInboxViewSource}\nglobalThis.__shellInbox = { createLandingInboxContext, openInboxView };`,
  shellInboxContext,
  { filename: 'shell-inbox-navigation-contract.js' },
);
const shellInboxApi = shellInboxContext.__shellInbox;
const exactShellContext = shellInboxApi.createLandingInboxContext(shellWorkspace);
assert.equal(shellInboxApi.openInboxView(exactShellContext), true);
assert.deepEqual(shellInboxControl.routes, [{
  route: { type: 'group', wsId: shellWorkspace.id, groupId: shellInbox.id, itemId: null, query: {} },
  options: { persist: false },
}], 'the shell must route once to the exact Inbox without a whole-state navigation write');
assert.equal(shellInboxControl.snapshots, 0, 'Inbox navigation must not snapshot data');
assert.equal(shellInboxControl.persists, 0, 'Inbox navigation must not persist data');
assert.deepEqual(shellInboxControl.legacyGroups, [], 'Inbox navigation must not use first-match group routing');

shellSpace.groups = [];
shellInboxControl.routes = [];
assert.equal(shellInboxApi.openInboxView(shellInboxApi.createLandingInboxContext(shellWorkspace)), false);
assert.deepEqual(shellSpace.groups, [], 'a missing Inbox must remain missing after navigation');
assert.equal(shellInboxControl.unavailable, 1, 'a missing Inbox must report one recovery result');
assert.deepEqual(shellInboxControl.routes, [], 'a missing Inbox must open no route');

shellSpace.groups = [shellInbox, { id: 'shell-inbox-second', name: 'Inbox', items: [] }];
assert.equal(shellInboxApi.openInboxView(shellInboxApi.createLandingInboxContext(shellWorkspace)), false);
assert.equal(shellInboxControl.unavailable, 2, 'duplicate Inboxes must fail closed');

shellSpace.groups = [shellInbox];
const replacedShellContext = shellInboxApi.createLandingInboxContext(shellWorkspace);
shellSpace.groups = [{ id: shellInbox.id, name: 'Inbox', items: [] }];
assert.equal(shellInboxApi.openInboxView(replacedShellContext), false);
assert.equal(shellInboxControl.unavailable, 3, 'same-ID Inbox replacement must fail closed');

shellSpace.groups = [shellInbox];
const ambiguousShellContext = shellInboxApi.createLandingInboxContext(shellWorkspace);
shellInboxControl.state.workspaces.push({
  id: 'shell-other-workspace',
  name: 'Other',
  activeCatId: 'shell-other-space',
  categories: [{
    id: 'shell-other-space',
    name: 'Other',
    groups: [{ id: shellInbox.id, name: 'Reference', items: [] }],
  }],
});
assert.equal(shellInboxApi.openInboxView(ambiguousShellContext), false);
assert.equal(shellInboxControl.unavailable, 4, 'a globally duplicated Group ID must fail closed');
assert.deepEqual(shellInboxControl.routes, [], 'every unavailable shell destination must open no route');

assert.doesNotMatch(openInboxViewSource, /State\.(?:snapshot|persist)|uid\(|\.unshift\(|openGroupPage/,
  'core Inbox navigation must not create, write, or use first-match routing');
assert.match(bindStaticSource, /nav-inbox'\)\.onclick = event => openInboxView\(createLandingInboxContext\(\), event\.currentTarget\)/,
  'the sidebar must freeze current Inbox context at activation and retain its focus owner');
assert.match(buildPaletteCommandsSource, /const inboxNavigationContext = createLandingInboxContext\(ws\)[\s\S]*id: 'inbox'[\s\S]*run: \(\) => openInboxView\(inboxNavigationContext\)/,
  'the visible palette command must retain its build-time Inbox context');
assert.match(updateNavChromeSource, /resolveLandingInboxTarget\(createLandingInboxContext\(ws\)\)[\s\S]*nav-inbox-count/,
  'the sidebar count must come from the same exact actionable Inbox resolver');
assert.ok(source.includes("'nav.inboxUnavailable': 'Locus couldn’t confirm this Space’s Inbox, so nothing was opened or changed.'"),
  'shell Inbox failure must explain the no-effect result in English');
assert.ok(source.includes("'nav.inboxUnavailable': 'Locus 無法確認這個空間中的收件匣，因此沒有開啟或變更任何內容。'"),
  'shell Inbox failure must use ordinary native zh-TW wording');
assert.equal(
  trailDestinationContext.__trailDestination.homeTrailDestinationStillMatches(reviewedProposedInbox),
  false,
  'an Inbox added after a proposed destination was reviewed must require another review',
);
destinationSpace.groups = [destinationInbox];

let resolvedTrailTarget = null;
const trailIdentityContext = vm.createContext({
  itemDetailValueFingerprint(value) { return JSON.stringify(value); },
  itemDetailLocationFingerprint(target) {
    return JSON.stringify({
      ws: target?.ws?.id,
      cat: target?.cat?.id,
      group: target?.group?.id,
      parents: (target?.parents || []).map(parent => parent.id),
    });
  },
  resolveUniqueHomePreviewItem() { return resolvedTrailTarget; },
});
vm.runInContext(
  `${savedItemRecoveryContextSource}\n${resolveSavedItemRecoveryTargetSource}\n` +
  'globalThis.__trailIdentity = { createSavedItemRecoveryContext, resolveSavedItemRecoveryTarget };',
  trailIdentityContext,
  { filename: 'home-trail-identity-contract.js' },
);
const originalTrailTarget = {
  ws: { id: 'ws-identity', name: 'Work' },
  cat: { id: 'space-identity', name: 'Research' },
  group: { id: 'group-identity', name: 'Inbox' },
  parents: [{ id: 'stack-identity' }],
  item: { id: 'item-identity', type: 'tab', title: 'Exact', url: 'https://exact.example' },
};
resolvedTrailTarget = originalTrailTarget;
const reviewedTrailContext = trailIdentityContext.__trailIdentity.createSavedItemRecoveryContext(originalTrailTarget);
assert.ok(trailIdentityContext.__trailIdentity.resolveSavedItemRecoveryTarget(reviewedTrailContext), 'an unchanged exact Trail row must resolve');
resolvedTrailTarget = { ...originalTrailTarget, item: { ...originalTrailTarget.item } };
assert.equal(trailIdentityContext.__trailIdentity.resolveSavedItemRecoveryTarget(reviewedTrailContext), null, 'a deep-equal replaced item must fail closed');
resolvedTrailTarget = { ...originalTrailTarget, cat: { ...originalTrailTarget.cat } };
assert.equal(trailIdentityContext.__trailIdentity.resolveSavedItemRecoveryTarget(reviewedTrailContext), null, 'a moved or replaced owning Space must fail closed');
resolvedTrailTarget = null;
assert.equal(trailIdentityContext.__trailIdentity.resolveSavedItemRecoveryTarget(reviewedTrailContext), null, 'a missing or duplicate item must fail closed');

for (const key of [
  'home.trail.latest',
  'home.trail.savedDestination',
  'home.trail.saveDestination',
  'home.trail.emptyTitle',
  'home.trail.emptyBody',
  'home.trail.candidate',
  'home.trail.checking',
  'home.trail.noCandidate',
  'home.trail.queryError',
  'home.trail.retry',
  'home.trail.noDestination',
  'home.trail.destinationConflict',
  'home.trail.openSpace',
  'home.trail.openSpaceFor',
  'home.trail.spaceUnavailable',
  'home.trail.saveKeepOpen',
  'home.trail.saveClose',
  'home.trail.saveKeepOpenHint',
  'home.trail.saveCloseHint',
  'home.trail.review',
  'home.trail.reviewItem',
  'home.trail.openPage',
  'home.trail.openItem',
  'home.trail.saved',
  'home.trail.candidateChanged',
  'home.trail.destinationChanged',
  'home.trail.itemUnavailable',
  'home.trail.openUnavailable',
  'home.inboxNoOtherItems',
  'capture.pending',
  'capture.startFailed',
  'capture.unconfirmedLater',
  'capture.receiptLost',
  'capture.restored',
  'capture.failed',
  'capture.destinationUnavailable',
  'capture.alreadySaved',
  'capture.snapshotInbox',
  'capture.savedInbox',
  'capture.savedCopyInbox',
  'capture.receiptSaved',
  'capture.receiptSavedCopy',
  'capture.receiptSavedTab',
  'capture.receiptSavedTabs',
  'capture.receiptSavedTabCopy',
  'capture.receiptSavedTabsCopy',
  'capture.snapshotInboxTab',
  'capture.snapshotInboxTabs',
  'capture.groupDestinationUnavailable',
  'capture.tabReadFailed',
  'capture.selectTabToAdd',
  'capture.snapshotGroupTab',
  'capture.snapshotGroupTabs',
  'capture.snapshotStackTab',
  'capture.snapshotStackTabs',
  'capture.snapshotSelectionGroup',
  'capture.selectedGroupName',
  'capture.savedGroup',
  'capture.savedCopyGroup',
  'capture.dropDestinationUnavailable',
  'capture.openDestination',
  'capture.destinationReceiptUnavailable',
  'capture.destinationChangedAfterSave',
  'capture.windowReadFailed',
  'capture.noWindowTabs',
  'capture.windowDestinationUnavailable',
  'capture.snapshotWindow',
  'capture.sessionName',
  'capture.savedWindow',
  'capture.savedWindowCopy',
  'capture.showSavedItem',
  'capture.receiptUnavailable',
  'capture.saveCopyToDestination',
  'capture.saveCloseToDestination',
  'capture.closedOne',
  'capture.closedMany',
  'capture.stayedOpenOne',
  'capture.stayedOpenMany',
  'capture.closedPartial',
]) {
  const en = i18nContext.__I18N.en[key];
  const zhTW = i18nContext.__I18N['zh-TW'][key];
  assert.ok(en?.trim(), `English Locus Trail copy must define ${key}`);
  assert.ok(zhTW?.trim(), `zh-TW Locus Trail copy must define ${key}`);
  assert.notEqual(zhTW, en, `zh-TW Locus Trail copy must be native rather than an English fallback: ${key}`);
}
assert.equal(
  i18nContext.__I18N['zh-TW']['capture.destinationUnavailable'],
  'Locus 無法確認這個空間中的收件匣，因此沒有儲存或關閉任何內容。',
  'duplicate-Inbox capture refusal must use literal native Taiwan wording',
);
assert.equal(i18nContext.__I18N['zh-TW']['capture.receiptSavedTab'], '已將 1 個分頁儲存到 {destination}');
assert.equal(i18nContext.__I18N['zh-TW']['capture.receiptSavedTabs'], '已將 {count} 個分頁儲存到 {destination}');
assert.equal(i18nContext.__I18N['zh-TW']['capture.receiptSavedTabCopy'], '已將 1 個分頁的副本儲存到 {destination}');
assert.equal(i18nContext.__I18N['zh-TW']['capture.receiptSavedTabsCopy'], '已將 {count} 個分頁的副本儲存到 {destination}');
assert.equal(
  i18nContext.__I18N['zh-TW']['capture.groupDestinationUnavailable'],
  'Locus 無法確認這個群組，因此沒有儲存或關閉任何內容。',
);
assert.equal(
  i18nContext.__I18N['zh-TW']['capture.tabReadFailed'],
  'Locus 無法讀取目前分頁，因此沒有儲存或關閉任何內容。',
);
assert.equal(
  i18nContext.__I18N['zh-TW']['capture.selectTabToAdd'],
  '請從左側選擇可儲存的分頁，再加入這個群組。',
);
assert.equal(
  i18nContext.__I18N['zh-TW']['capture.windowReadFailed'],
  'Locus 無法讀取目前視窗，因此沒有儲存或關閉任何分頁。',
);
assert.equal(
  i18nContext.__I18N['zh-TW']['capture.noWindowTabs'],
  '目前視窗沒有可儲存的分頁。',
);
assert.equal(
  i18nContext.__I18N['zh-TW']['capture.windowDestinationUnavailable'],
  'Locus 無法確認這個空間，因此沒有儲存或關閉任何分頁。',
);
assert.equal(i18nContext.__I18N['zh-TW']['capture.sessionName'], '工作階段 {date} {time}');
assert.equal(i18nContext.__I18N['zh-TW']['capture.openDestination'], '開啟儲存位置');
assert.equal(
  i18nContext.__I18N['zh-TW']['capture.destinationReceiptUnavailable'],
  '這個儲存位置已變更或移動，因此無法開啟。',
);
assert.equal(
  i18nContext.__I18N['zh-TW']['capture.destinationChangedAfterSave'],
  '已確認儲存，但儲存位置隨後已變更。請檢查最新資料。',
);

assert.match(
  createGeneratedGroupCaptureContextSource,
  /activeWs\(\) !== workspace[\s\S]*activeCat\(\) !== space[\s\S]*identitySpaceTarget[\s\S]*groupsRef/,
  'Save all must freeze the exact active Workspace, Space, and owned Group list before browser work',
);
assert.match(
  resolveGeneratedGroupCaptureTargetSource,
  /activeWs\(\) !== context\.workspaceRef[\s\S]*activeCat\(\) !== context\.spaceRef[\s\S]*location\.space\.groups !== context\.groupsRef/,
  'Save all must reject replaced, moved, or no-longer-active destination authority',
);
const saveAllQuery = saveAllTabsSource.indexOf('chrome.tabs.query');
const saveAllResolve = saveAllTabsSource.indexOf('resolveGeneratedGroupCaptureTarget');
const saveAllAllocate = saveAllTabsSource.indexOf('createOrganizationIdAllocator');
const saveAllSnapshot = saveAllTabsSource.indexOf('State.snapshot');
const saveAllMutation = saveAllTabsSource.indexOf('target.space.groups.push(group)');
const saveAllReceipt = saveAllTabsSource.indexOf('captureDestinationReceiptMessage');
const saveAllCommit = saveAllTabsSource.indexOf('await commitCapturedTabs');
const saveAllSuccess = saveAllTabsSource.indexOf('toastCaptureDestinationReceipt');
assert.ok(
  saveAllQuery >= 0
    && saveAllResolve > saveAllQuery
    && saveAllAllocate > saveAllResolve
    && saveAllSnapshot > saveAllAllocate
    && saveAllMutation > saveAllSnapshot
    && saveAllReceipt > saveAllMutation
    && saveAllCommit > saveAllReceipt
    && saveAllSuccess > saveAllCommit,
  'Save all must read, re-resolve, allocate, snapshot, mutate, freeze receipt, commit, then report success in order',
);
assert.equal((saveAllTabsSource.match(/captureCommitPending/g) || []).length, 2,
  'Save all must reject a competing capture both before and after its asynchronous browser read');
assert.match(
  saveAllTabsSource,
  /createCaptureDestinationReceiptContext[\s\S]*validateDestination:[\s\S]*resolveCaptureDestinationReceiptTarget[\s\S]*toastCaptureDestinationReceipt/,
  'Save all must carry one exact generated-Group receipt through persistence and guarded source cleanup',
);
assert.doesNotMatch(
  saveAllTabsSource,
  /No tabs to save|Save eligible tabs|name:\s*`Session|toastCaptureResult\(`Saved/,
  'Save all must not retain hard-coded runtime copy',
);
assert.equal(
  (saveMostRecentOpenTabSource.match(/saveReviewedTopbarTab\(/g) || []).length,
  2,
  'both explicit top-bar Save choices must use the same reviewed controller',
);
assert.match(
  saveReviewedTopbarTabSource,
  /saveTabToInbox\(currentTab,\s*\{\s*closeSource:[\s\S]*receipt:\s*true/,
  'the reviewed controller must retain the exact post-Save receipt',
);
assert.doesNotMatch(
  saveHomeTrailCandidateSource,
  /receipt\s*:/,
  'Home Trail must keep its dedicated accepted-save handoff instead of receiving a second receipt',
);
assert.match(
  saveTabToInboxSource,
  /options\.receipt[\s\S]*createSavedItemRecoveryContext[\s\S]*await commitCapturedTabs[\s\S]*toastCapturedItemReceipt/,
  'the exact receipt must be opt-in, frozen before persistence, and shown only after acceptance',
);
assert.match(html, /id="toast-action"[^>]*class="hidden"/, 'the shared toast must expose one optional action control');
assert.match(html, /id="toast-close"[^>]*data-i18n-aria-label="feedback\.dismiss"/,
  'the shared receipt must expose one localized native Close control');
assert.match(
  toastSource,
  /toast-action[\s\S]*actionLabel[\s\S]*onclick[\s\S]*opts\.action/,
  'the toast must bind the optional receipt action only when supplied',
);
assert.match(toastSource, /const actionable\s*=\s*hasAction\s*\|\|\s*undoActionId\s*!=\s*null[\s\S]*if \(!actionable && duration > 0\)/,
  'Undo and destination receipts must remain until acted on or dismissed');
const toastScrollAttributes = {};
let toastScrollHidden = false;
const toastScrollMessage = {
  clientHeight: 100,
  scrollHeight: 180,
  scrollTop: 36,
  setAttribute(name, value) { toastScrollAttributes[name] = String(value); },
  removeAttribute(name) { delete toastScrollAttributes[name]; },
};
const toastScrollContext = vm.createContext({
  document: {
    getElementById(id) {
      if (id === 'toast') return { classList: { contains: name => name === 'hidden' && toastScrollHidden } };
      if (id === 'toast-msg') return toastScrollMessage;
      return null;
    },
  },
});
vm.runInContext(syncToastMessageScrollAccessSource, toastScrollContext);
assert.equal(vm.runInContext('syncToastMessageScrollAccess()', toastScrollContext), true,
  'an overflowing receipt message must become keyboard reachable');
assert.equal(toastScrollAttributes.tabindex, '0',
  'an overflowing receipt message must join the natural Tab order');
toastScrollMessage.clientHeight = 180;
assert.equal(vm.runInContext('syncToastMessageScrollAccess()', toastScrollContext), false,
  'a fully visible receipt message must not add a redundant Tab stop');
assert.equal(toastScrollAttributes.tabindex, undefined,
  'a fully visible receipt message must leave the ordinary receipt Tab order unchanged');
assert.equal(toastScrollMessage.scrollTop, 0,
  'a no-longer-overflowing receipt must clear stale message scroll position');
toastScrollHidden = true;
toastScrollMessage.clientHeight = 100;
toastScrollMessage.scrollTop = 28;
assert.equal(vm.runInContext('syncToastMessageScrollAccess()', toastScrollContext), false,
  'a hidden receipt message must not remain keyboard reachable');
assert.equal(toastScrollMessage.scrollTop, 0,
  'hiding the receipt must return its reused message to the beginning');
toastScrollHidden = false;
toastScrollMessage.id = 'toast-msg';
toastScrollMessage.tabIndex = 0;
toastScrollMessage.clientHeight = 100;
toastScrollMessage.scrollHeight = 260;
let toastScrollKeyPrevented = false;
toastScrollContext.toastScrollKeyEvent = {
  currentTarget: toastScrollMessage,
  key: 'PageDown',
  preventDefault() { toastScrollKeyPrevented = true; },
};
vm.runInContext(handleToastMessageScrollKeySource, toastScrollContext);
assert.equal(vm.runInContext('handleToastMessageScrollKey(toastScrollKeyEvent)', toastScrollContext), true,
  'Page Down must operate the focused overflowing receipt message');
assert.equal(toastScrollKeyPrevented, true,
  'receipt-local scroll keys must not also move the page');
assert.equal(toastScrollMessage.scrollTop, 76,
  'Page Down must advance the receipt by one readable message page');
assert.match(bindToastReceiptSource, /addEventListener\('resize'[\s\S]*syncToastMessageScrollAccess/,
  'receipt keyboard access must stay synchronized when the viewport changes');
assert.match(bindToastReceiptSource, /toast-msg[\s\S]*addEventListener\('keydown',\s*handleToastMessageScrollKey\)/,
  'the shared receipt must bind keyboard scrolling to its message only');
assert.match(toastSource, /m\.scrollTop\s*=\s*0[\s\S]*classList\.remove\('hidden'\)[\s\S]*syncToastMessageScrollAccess/,
  'each newly shown receipt must start at the beginning before overflow access is measured');
assert.match(css, /#toast\s*\{[^}]*width:\s*min\([^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto 40px/s,
  'the receipt container must stay bounded and reserve a stable Close rail');
assert.match(css, /#toast-msg\s*\{[^}]*overflow-wrap:\s*anywhere/s,
  'long saved titles and destination trails must wrap rather than overflow');
assert.match(css, /#toast\s*\{[^}]*max-height:\s*calc\(100vh - 32px\)[^}]*overflow:\s*hidden/s,
  'the receipt must stay inside short viewports instead of clipping exact destination evidence');
assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*?#toast\s*\{[^}]*max-height:\s*calc\(100vh - 24px\)[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\) auto[\s\S]*?#toast-msg\s*\{[^}]*overflow-y:\s*auto/s,
  'compact receipts must scroll only their message while keeping recovery actions visible');
const compactToastCssStart = css.indexOf('@media (max-width: 520px)', css.indexOf('#toast-msg:focus-visible'));
const compactToastCssEnd = css.indexOf('\n.hidden { display: none', compactToastCssStart);
assert.ok(compactToastCssStart >= 0 && compactToastCssEnd > compactToastCssStart,
  'the compact receipt layout must remain extractable');
const compactToastCss = css.slice(compactToastCssStart, compactToastCssEnd);
const toastMessageMarkupIndex = html.indexOf('id="toast-msg"');
const toastActionMarkupIndex = html.indexOf('id="toast-action"');
const toastUndoMarkupIndex = html.indexOf('id="toast-undo"');
const toastCloseMarkupIndex = html.indexOf('id="toast-close"');
assert.ok(
  toastMessageMarkupIndex >= 0
    && toastActionMarkupIndex > toastMessageMarkupIndex
    && toastUndoMarkupIndex > toastActionMarkupIndex
    && toastCloseMarkupIndex > toastUndoMarkupIndex,
  'receipt DOM order must remain message, primary action, Undo, then Dismiss',
);
assert.match(compactToastCss, /\.toast-copy\s*\{[^}]*grid-column:\s*1\s*\/\s*-1[^}]*grid-row:\s*1/s,
  'compact receipt evidence must occupy the complete first row');
assert.match(compactToastCss, /\.toast-actions\s*\{[^}]*grid-column:\s*1\s*;[^}]*grid-row:\s*2/s,
  'compact receipt actions must begin the second row in DOM order');
assert.match(compactToastCss, /#toast-close\s*\{[^}]*grid-column:\s*2\s*;[^}]*grid-row:\s*2/s,
  'compact Dismiss must finish the second row instead of preceding actions visually');
assert.match(css, /#toast-msg:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--index-focus\)/s,
  'a keyboard-focused receipt message must expose the shared visible focus locator');
assert.match(
  showContextMenuSource,
  /cm-label-review[\s\S]*cm-label-review-meta[\s\S]*it\.meta[\s\S]*detailLabel[\s\S]*ariaLabel/,
  'the shared menu must render optional review detail and destination-specific accessible names',
);
assert.match(css, /\.cm-label-review\s*\{[^}]*max-width:/s,
  'the top-bar review block must remain bounded inside the menu');
assert.match(css, /\.cm-label-review-value\s*\{[^}]*overflow-wrap:\s*anywhere/s,
  'the complete reviewed destination must wrap instead of being truncated');
assert.equal(
  i18nContext.__I18N.en['home.trail.latest'],
  'Continue saved work',
  'the leading Home heading must describe the return job instead of claiming the promoted page is the latest record',
);
assert.equal(
  i18nContext.__I18N['zh-TW']['home.trail.latest'],
  '繼續查看已儲存內容',
  'the zh-TW Home heading must state the same return job in concise Taiwan UI language',
);
assert.equal(i18nContext.__I18N['zh-TW']['home.trail.openSpace'], '開啟空間');
assert.equal(i18nContext.__I18N['zh-TW']['home.trail.openSpaceFor'], '開啟「{name}」空間，檢查收件匣');
assert.equal(i18nContext.__I18N['zh-TW']['home.trail.spaceUnavailable'], 'Locus 無法確認這個空間，因此沒有開啟或變更任何內容。');

assert.match(buildHomeTrailSource, /section\.setAttribute\('aria-labelledby', 'home-trail-title'\)/, 'Trail must expose one named section');
assert.equal(buildHomeTrailSource.includes('aria-live'), false, 'Trail must leave live success ownership to the existing localized Undo toast');
assert.match(
  buildHomeTrailSource,
  /newestHomeRows\([\s\S]{0,160}preferReopenableTab:\s*true/,
  'the visible Home Trail must request the reopen-first recovery ordering',
);
assert.match(buildHomeTrailSource, /capture\.setAttribute\('role', 'group'\)[\s\S]*aria-labelledby/, 'capture controls must expose one accessible group name');
assert.match(buildHomeTrailSource, /resolveSavedItemRecoveryTarget/, 'Trail recovery actions must re-resolve reviewed identity');
assert.match(resolveSavedItemRecoveryTargetSource, /resolveUniqueHomePreviewItem[\s\S]*itemRef[\s\S]*itemFingerprint[\s\S]*locationFingerprint/, 'Trail identity must reject replaced or moved rows');
assert.match(openHomeTrailSavedTabSource, /isOpenableSavedTabUrl[\s\S]*openSavedTabItem/, 'Open page must reuse the shared saved-address allowlist and opener');
assert.match(saveHomeTrailCandidateSource, /chrome\.tabs\.get[\s\S]*capturedTabStillMatches[\s\S]*saveTabToInbox/, 'Trail save must fresh-check the displayed source before the shared capture path');
assert.match(saveHomeTrailCandidateSource, /destinationChanged/, 'Trail save must fail closed if the reviewed destination changes');
assert.match(homeTrailDestinationStillMatchesSource, /workspaceRef[\s\S]*spaceRef[\s\S]*inboxRef/, 'pending save destinations must retain exact Workspace, Space, and Inbox identity');
assert.match(buildHomeTrailSource, /homeTrailPrimaryCloseSource[\s\S]*homeTrailCaptureActionPlan[\s\S]*action\.closeSource/, 'capture controls must consume the tested preference-aware action plan');
assert.match(
  buildHomeTrailSource,
  /homeTrailBlockedDestinationActionPlan\(\s*cat,\s*destination,\s*\{ recoveryHasPrimary: !!latest \},\s*\)[\s\S]{0,1200}openOrganizationCreate\('space', \{\}, event\.currentTarget\)/,
  'the no-Space Home action must open the existing receipt-gated Space controller from its visible button',
);
assert.match(
  buildHomeTrailSource,
  /action\.key === 'create-space'[\s\S]{0,600}openHomeTrailSpaceReview\(destination, event\.currentTarget\)/,
  'duplicate-Inbox recovery must route through the exact Space-review controller',
);
assert.match(openHomeTrailSpaceReviewSource, /resolveHomeTrailSpaceReviewTarget[\s\S]*Router\.navigate\([\s\S]*type: 'board'[\s\S]*persist: false/,
  'Space review must re-resolve exact identity before read-only board navigation');
assert.match(
  buildHomeTrailSource,
  /home-trail-destination-message[\s\S]{0,1200}aria-describedby[\s\S]{0,180}home-trail-destination-message/,
  'the Create space action must remain associated with the visible save prerequisite',
);
assert.match(commitCapturedTabsSource, /chrome\.tabs\.get[\s\S]*capturedTabStillMatches[\s\S]*chrome\.tabs\.remove/, 'receipt-gated close must fresh-check source identity before removal');
assert.match(
  commitCapturedTabsSource,
  /destinationStillMatches[\s\S]*destinationChanged[\s\S]*closeCandidates = closeCandidates\.map\(\(\) => null\)[\s\S]*chrome\.tabs\.remove/,
  'a destination that changes across asynchronous capture work must lose all source-close authority',
);
assert.match(
  commitCapturedTabsSource,
  /for \(let index = 0; index < requestedTabs\.length; index\+\+\)[\s\S]*if \(!destinationStillMatches\(\)\)[\s\S]*chrome\.tabs\.get\(tabId\)[\s\S]*if \(!destinationStillMatches\(\)\)[\s\S]*chrome\.tabs\.remove\(tabId\)/,
  'every source removal must re-check the exact destination before and after its final browser read',
);
assert.match(refreshOpenTabsSource, /!captureCommitPending[\s\S]*homeTrailCandidateFingerprint[\s\S]*renderBoard/, 'tab refresh must not render optimistic capture state before its receipt');
assert.match(saveTabToInboxSource, /State\.snapshot\(tr\('capture\.snapshotInbox'\)\)/, 'Trail Undo history must use localized Inbox copy');
for (const [label, captureSource] of [
  ['single Inbox Save', saveTabToInboxSource],
  ['selected Inbox Save', saveSelectedToInboxSource],
  ['Space Inbox drop', dropTabsIntoCategorySource],
]) {
  assert.match(captureSource, /createInboxCaptureContext\([\s\S]*State\.snapshot[\s\S]*materializeInboxCaptureTarget/,
    `${label} must review exact destination identity before history and materialize only afterward`);
  assert.doesNotMatch(captureSource, /groups\.find\([^)]*Inbox/,
    `${label} must never select the first same-name Inbox`);
}
assert.match(materializeInboxCaptureTargetSource, /createOrganizationIdAllocator\(\)\(\)/,
  'new Inbox provisioning must reuse the graph-wide collision-safe organization allocator');
for (const [label, captureSource] of [
  ['single Inbox Save', saveTabToInboxSource],
  ['selected Inbox Save', saveSelectedToInboxSource],
  ['Space Inbox drop', dropTabsIntoCategorySource],
]) {
  assert.match(captureSource,
    /createOrganizationIdAllocator\(\)[\s\S]*createItemListCaptureContext[\s\S]*createCaptureDestinationReceiptContext[\s\S]*inboxCaptureReceiptMessage\([\s\S]*await commitCapturedTabs[\s\S]*validateDestination:[\s\S]*resolveCaptureDestinationReceiptTarget/,
    `${label} must allocate safely and carry exact saved-item authority through persistence and source cleanup`);
  assert.doesNotMatch(captureSource, /\buid\(\)/,
    `${label} must not allocate collision-prone saved-item IDs`);
  assert.doesNotMatch(captureSource, /toastCaptureResult\(\s*[`'"]|toast\(\s*['"]Already saved/,
    `${label} must not retain hard-coded English success or duplicate feedback`);
}
for (const [label, captureSource] of [
  ['selected Inbox Save', saveSelectedToInboxSource],
  ['Space Inbox drop', dropTabsIntoCategorySource],
]) {
  assert.match(captureSource, /toastCaptureDestinationReceipt/,
    `${label} must expose the existing exact Open-destination receipt after acceptance`);
  assert.doesNotMatch(captureSource, /toastCaptureResult/,
    `${label} must not retain a path-blind accepted result`);
}
assert.match(
  saveTabToInboxSource,
  /options\.destinationReceipt[\s\S]*toastCaptureDestinationReceipt[\s\S]*toastCaptureResult/,
  'single Inbox Save must offer exact destination recovery only when its initiating surface needs it',
);
assert.match(openTabActionMenuItemsSource, /saveTabToInbox\(t,\s*\{\s*destinationReceipt:\s*true\s*\}\)/,
  'the opened-tabs row Save must expose exact destination recovery');
assert.match(palSaveActiveTabSource, /saveTabToInbox\(tab,\s*\{\s*destinationReceipt:\s*true\s*\}\)/,
  'the command-palette Save must expose exact destination recovery');
assert.match(
  toastCapturedItemReceiptSource,
  /resolveSavedItemRecoveryTarget\(context\)[\s\S]*capture\.destinationChangedAfterSave[\s\S]*captureReceiptPresentation/,
  'the richer single-item receipt must revalidate before claiming an accepted destination',
);
assert.equal((addSidebarOrActiveTabToGroupSource.match(/resolveGroupCaptureTarget\(/g) || []).length, 2,
  'selected and active-tab Group capture must each re-resolve the reviewed destination');
assert.equal((addSidebarOrActiveTabToGroupSource.match(/captureDestinationReceiptMessage\(/g) || []).length, 2,
  'selected and active-tab Group capture must each freeze one exact receipt');
assert.match(
  addSidebarOrActiveTabToGroupSource,
  /createGroupCaptureContext\(g\)[\s\S]*chrome\.tabs\.query[\s\S]*resolveGroupCaptureTarget/,
  'active-tab Group capture must review before and re-resolve after the browser read',
);
assert.match(
  addSidebarOrActiveTabToGroupSource,
  /createCaptureDestinationReceiptContext[\s\S]*captureDestinationReceiptMessage\([\s\S]*validateDestination:[\s\S]*resolveCaptureDestinationReceiptTarget[\s\S]*toastCaptureDestinationReceipt/,
  'Group capture must carry its exact saved-item receipt through persistence and show it only after acceptance',
);
assert.equal(
  (addSidebarOrActiveTabToGroupSource.match(/createOrganizationIdAllocator\(\)/g) || []).length,
  2,
  'selected and active-tab existing-Group capture must each allocate new saved items against every retained graph ID',
);
assert.doesNotMatch(
  addSidebarOrActiveTabToGroupSource,
  /\buid\(\)/,
  'existing-Group capture must not allocate collision-prone saved-item IDs',
);
assert.doesNotMatch(
  addSidebarOrActiveTabToGroupSource,
  /toastCaptureResult|toast\(\s*['"](?:Already saved|Select a tab)/,
  'Group capture must not retain a path-blind result or hard-coded English recovery copy',
);
assert.match(
  saveSelectedAsGroupSource,
  /createGeneratedGroupCaptureContext\([\s\S]*resolveGeneratedGroupCaptureTarget[\s\S]*createOrganizationIdAllocator[\s\S]*State\.snapshot\(tr\('capture\.snapshotSelectionGroup'[\s\S]*createItemListCaptureContext[\s\S]*createCaptureDestinationReceiptContext[\s\S]*await commitCapturedTabs[\s\S]*toastCaptureDestinationReceipt/,
  'selected-as-Group Save must freeze exact authority, allocate safely, and expose one accepted destination receipt',
);
assert.doesNotMatch(
  saveSelectedAsGroupSource,
  /State\.snapshot\(`|name:\s*`|toastCaptureResult\(`|\buid\(\)/,
  'selected-as-Group Save must not retain generic English history/success or collision-prone IDs',
);
assert.match(
  handleTabDropIntoListSource,
  /createItemListCaptureContext\(list\)[\s\S]*resolveItemListCaptureTarget[\s\S]*capturedTabSourceDescriptor[\s\S]*State\.snapshot\(tr\([\s\S]*createCaptureDestinationReceiptContext[\s\S]*await commitCapturedTabs[\s\S]*validateDestination:[\s\S]*toastCaptureDestinationReceipt/,
  'Group/Stack drops must share one exact-target, frozen-source, receipt-gated capture controller',
);
assert.match(
  addSidebarOrActiveTabToGroupSource,
  /selectedTabs\.filter\(createCaptureBatchDuplicateFilter\(target\.group\)\)/,
  'selected existing-Group Save must apply duplicate policy across the current batch',
);
assert.match(
  handleTabDropIntoListSource,
  /createCaptureBatchDuplicateFilter\(target\.list\)[\s\S]*sourcePairs\.filter\(pair => acceptBatchSource\(pair\.source\)\)/,
  'Group and Stack drops must apply duplicate policy across the current batch',
);
assert.match(
  captureDuplicateExistsSource,
  /captureDestinationTabUrls\(groupOrItems\)\.has\(url\)/,
  'the canonical single-capture policy must use the exact destination URL collector',
);
assert.match(
  captureDestinationTabUrlsSource,
  /Array\.isArray\(groupOrItems\)[\s\S]*seen\.has\(item\)[\s\S]*Array\.isArray\(item\.items\)/,
  'the exact destination URL collector must traverse nested item lists without looping on cycles',
);
assert.match(
  homeTrailSaveCandidateSource,
  /captureDuplicateExists\(inbox,\s*tab\?\.url\)/,
  'Home capture must apply the same nested exact-destination duplicate policy',
);
assert.match(
  dropTabsIntoCategorySource,
  /captureDuplicateExists\(inbox\.items,\s*tab\.url\)/,
  'Space Inbox drops must honor the canonical duplicate preference',
);
assert.match(
  createCaptureBatchDuplicateFilterSource,
  /captureDeduplicate === false[\s\S]*seenUrls\.has\(url\)[\s\S]*seenUrls\.add\(url\)/,
  'existing-destination batches must bypass filtering when allowed and reserve each accepted exact URL',
);
{
  const duplicateState = { settings: { captureDeduplicate: true } };
  const duplicateContext = vm.createContext({
    State: { get: () => duplicateState },
  });
  vm.runInContext(
    `${captureDestinationTabUrlsSource}\n${captureDuplicateExistsSource}\n${createCaptureBatchDuplicateFilterSource}\n` +
    'globalThis.__duplicates = { captureDuplicateExists, createCaptureBatchDuplicateFilter };',
    duplicateContext,
    { filename: 'nested-capture-duplicate-policy.js' },
  );
  const nestedItems = [{
    id: 'stack-1',
    type: 'stack',
    items: [{ id: 'nested-tab', type: 'tab', url: 'https://nested.test' }],
  }];
  assert.equal(duplicateContext.__duplicates.captureDuplicateExists(nestedItems, 'https://nested.test'), true,
    'single capture must treat a page nested in the exact destination Stack as already saved');
  const filter = duplicateContext.__duplicates.createCaptureBatchDuplicateFilter(nestedItems);
  assert.equal(filter({ url: 'https://nested.test' }), false,
    'batch capture must reject a URL already nested in the exact destination Stack');
  assert.equal(filter({ url: 'https://distinct.test' }), true,
    'batch capture must retain a distinct URL');
  duplicateState.settings.captureDeduplicate = false;
  const allow = duplicateContext.__duplicates.createCaptureBatchDuplicateFilter(nestedItems);
  assert.equal(allow({ url: 'https://nested.test' }), true,
    'disabling deduplication must still allow a nested same-URL copy');
}
assert.doesNotMatch(
  [handleTabDropIntoListSource, buildStackSource, makeGroupDropZoneSource, buildLvStackSource].join('\n'),
  /toastCaptureResult\(\s*[`'"]|State\.snapshot\(\s*[`'"](?:Save|Already)|toast\(\s*['"]Already saved|title:\s*[^\n]*\|\|\s*['"]Untitled/,
  'Group/Stack drop paths must not retain hard-coded English history, duplicate, title, or success copy',
);
assert.match(buildHomeInboxZoneSource, /excludeItemId/, 'Inbox follow-on must omit the item already featured by the Trail');
assert.match(buildHomeInboxZoneSource, /context\.inboxRef[\s\S]*openInboxView\(context, event\.currentTarget\)/,
  'the Home Inbox zone must use the reviewed exact Inbox context and shared fail-closed navigator');
assert.doesNotMatch(buildHomeInboxZoneSource, /\.find\([^)]*Inbox/,
  'the Home Inbox zone must never choose the first same-name Group');
assert.match(renderHomeSource, /createLandingInboxContext\(ws\)[\s\S]*homeProgressiveZonePlan\(ws, inboxContext\)/,
  'Home must derive progressive zones from the existing exact Inbox context');
assert.match(renderHomeSource, /zonePlan\.showInbox[\s\S]*buildHomeInboxZone\([\s\S]*context:\s*inboxContext/,
  'Home must render the Inbox zone only for the reviewed exact Inbox');
assert.match(renderHomeSource, /if \(!zonePlan\.showSpaces\) return true/,
  'a no-Space Home must stop before the duplicate Spaces setup surface');
assert.equal(renderHomeSource.includes('home-hero'), false, 'Home must remove the scenic hero rather than leave decorative dead rendering');
const trailIndex = renderHomeSource.indexOf('buildHomeTrail');
const inboxIndex = renderHomeSource.indexOf('buildHomeInboxZone');
const spacesIndex = renderHomeSource.indexOf("tr('home.recentSpaces')");
assert.ok(trailIndex >= 0 && inboxIndex > trailIndex && spacesIndex > inboxIndex, 'Home hierarchy must be Trail, Inbox, then Spaces');
assert.match(renderHomeSource, /grid\.className\s*=\s*'home-grid home-space-register'/,
  'Spaces must render as one quiet filing register rather than a competing card grid');
assert.match(renderHomeSource, /card\.className\s*=\s*'home-card home-space-row'/,
  'each Space must use the compact register-row presentation');
assert.match(renderHomeSource, /home-card-sym[^`]*aria-hidden="true"[^`]*cat\.symbol/,
  'a Space row must preserve the user-authored symbol instead of inferring decorative art from its name');
assert.match(renderHomeSource, /newestHomeItems\(items,\s*1\)/,
  'a Space row must expose only its newest real item so recovery hierarchy stays legible');
assert.match(renderHomeSource, /home-card-viewall home-space-open[\s\S]*tr\('home\.trail\.openSpace'\)/,
  'the register must expose one localized, explicit Open space action');
assert.match(renderHomeSource, /text:\s*tr\('home\.trail\.openSpace'\)/,
  'the Space More menu must not retain hard-coded English Open copy');
assert.doesNotMatch(source, /HOME_ICON_MAP|homeCardIconName|homeCardIconHtml|homeAccentColor|buildProjectsRow/,
  'obsolete inferred Space art, synthetic accents, and the unused collections prototype must be removed');
assert.doesNotMatch(css, /\.hcs-(?:img|emoji)|\.home-card-wide|\.home-proj-/,
  'obsolete bundled-badge and collections-prototype styles must leave the production stylesheet');

for (const contract of [
  /\.home-grid\.home-space-register\s*\{[^}]*grid-template-columns:\s*1fr[^}]*gap:\s*0/,
  /\.home-card\.home-space-row\s*\{[^}]*grid-template-columns:/,
  /\.home-space-row:focus-within\s*\{/,
  /@media \(max-width: 900px\)[\s\S]*\.home-card\.home-space-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/,
  /@media \(max-width: 560px\)[\s\S]*\.home-card\.home-space-row\s*\{[^}]*grid-template-columns:\s*1fr/,
]) {
  assert.match(css, contract, `Home Space register CSS contract must hold: ${contract}`);
}

for (const contract of [
  /body\[data-surface="home"\] #topbar-save\s*\{[^}]*display:\s*none/,
  /\.home-trail[^{]*\{[^}]*border:/,
  /\.home-trail-capture:focus-visible\s*\{/,
]) {
  assert.match(css, contract, `Home Trail CSS contract must hold: ${contract}`);
}
const stackedTrailCss = extractCssBlock('@media (max-width: 1320px)');
assert.match(stackedTrailCss, /\.home-trail-line\s*\{[^}]*width:\s*2px[^}]*height:\s*28px/, 'the stacked Trail must use its vertical locator inside the exact 1320 px media block');
assert.match(stackedTrailCss, /\.home-trail-line span\s*\{[^}]*scaleY\(0\)/, 'the stacked receipt motion must follow the vertical locator');
const mediumTrailCss = extractCssBlock('@media (min-width: 761px) and (max-width: 1100px)');
assert.match(mediumTrailCss, /\.home-trail-recovery\s*\{[^}]*grid-template-areas:\s*"item item actions"\s*"line destination actions"/, 'the medium Trail must keep recovery, destination, and actions in a compact two-row route');
assert.match(mediumTrailCss, /\.home-trail-item\s*\{[^}]*grid-area:\s*item/, 'the medium Trail must place the recovered item first without changing DOM order');
assert.match(mediumTrailCss, /\.home-trail-destination\s*\{[^}]*grid-area:\s*destination/, 'the medium Trail must keep the exact saved destination in the route');
assert.match(mediumTrailCss, /\.home-trail-recovery-actions\s*\{[^}]*grid-area:\s*actions/, 'the medium Trail must keep recovery actions beside the route');
assert.match(mediumTrailCss, /\.home-trail-capture\s*\{[^}]*grid-template-areas:\s*"candidate actions"\s*"destination actions"/, 'the medium Trail must keep capture and destination visible beside its actions');
assert.match(mediumTrailCss, /\.home-trail-capture\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(310px,\s*\.9fr\)/, 'the medium capture lane must keep both consequence controls intact without letting intrinsic copy collapse the candidate');
assert.match(mediumTrailCss, /\.home-trail-next\s*\{[^}]*grid-area:\s*candidate/, 'the medium Trail must keep the next candidate first without changing DOM order');
assert.match(mediumTrailCss, /\.home-trail-next-destination\s*\{[^}]*grid-area:\s*destination/, 'the medium Trail must keep the next destination visible');
assert.match(mediumTrailCss, /\.home-trail-save-area\s*\{[^}]*grid-area:\s*actions/, 'the medium Trail must keep save actions beside the route');
assert.match(mediumTrailCss, /\.home-trail-line\s*\{[^}]*width:\s*2px[^}]*height:\s*28px/, 'the medium Trail must retain a vertical locator between the recovered item and destination');
assert.doesNotMatch(css, /\.home-trail-capture\s*\{[^}]*minmax\(250px,\s*auto\)/, 'capture consequence copy must never own an unbounded intrinsic action column');
assert.match(css, /\.home-trail-recovery-actions,\s*\n\s*\.home-trail-save-area\s*\{[^}]*min-width:\s*0/, 'Trail action groups must be allowed to shrink within their bounded grid tracks');
assert.match(css, /\.home-trail-save-hint\s*\{[^}]*max-width:\s*100%[^}]*overflow-wrap:\s*anywhere/, 'the truthful close consequence must wrap inside the action track instead of widening it');
assert.match(css, /@media \(max-width: 900px\)\s*\{\s*body\[data-theme\]\s*\{[^}]*--sidebar:\s*188px[^}]*\}[\s\S]*?#board\.home-mode\s*\{[^}]*width:\s*100%/, 'the narrow-desktop shell must retain a readable registry while giving Home the full remaining work area');
const reducedTrailCss = extractCssBlock('@media (prefers-reduced-motion: reduce) {\n  .home-trail');
assert.match(reducedTrailCss, /\.home-trail \*[\s\S]*animation:\s*none !important/, 'the exact reduced-motion block must stop Trail animation');
const forcedColorsCss = extractCssBlock('@media (forced-colors: active)');
assert.match(forcedColorsCss, /\.home-trail-capture:focus-visible\s*\{[^}]*outline-color:\s*Highlight/, 'the exact forced-colors block must expose the capture fallback focus');
assert.match(css, /\.home-space-register,\s*\n\s*\.home-card,/, 'forced colors must retain the Space register boundary');
assert.equal(css.includes('.home-hero'), false, 'obsolete scenic Home hero styles must be removed');

let focusedTrailFallback = false;
const trailFocusContext = vm.createContext({
  document: {
    querySelector(selector) {
      if (selector !== '[data-home-trail-focus="capture"]') return null;
      return {
        disabled: false,
        focus() { focusedTrailFallback = true; },
      };
    },
  },
});
vm.runInContext(
  `${restoreHomeTrailFocusSource}\nglobalThis.__restoreHomeTrailFocus = restoreHomeTrailFocus;`,
  trailFocusContext,
  { filename: 'home-trail-focus-contract.js' },
);
assert.equal(trailFocusContext.__restoreHomeTrailFocus('capture'), true, 'the capture group must accept programmatic fallback focus');
assert.equal(focusedTrailFallback, true, 'fallback focus must reach the visibly styled capture group');

async function assertHomeTrailRefreshController() {
  const pendingQueries = [];
  const calls = { boards: 0, tabRenders: 0, focus: [], railFocus: [] };
  let fingerprint = 'before';
  let activeElement = null;
  const context = vm.createContext({
    chrome: {
      tabs: {
        query(options) {
          return new Promise(resolve => pendingQueries.push({ options, resolve }));
        },
      },
    },
    document: {
      get activeElement() { return activeElement; },
      getElementById() { return { textContent: '' }; },
    },
    isProto() { return false; },
    homeTrailCandidateFingerprint() { return fingerprint; },
    activeHomeTrailFocusKey() { return 'save-primary'; },
    restoreHomeTrailFocus(key) { calls.focus.push(key); return true; },
    restoreOpenTabSelectionFocus(tabId) { calls.railFocus.push(tabId); },
    setOpenTabRailCount() {},
    renderOpenTabs() { calls.tabRenders += 1; activeElement = null; },
    renderBoard() { calls.boards += 1; },
    console,
  });
  vm.runInContext(
    `let openTabsRefreshGeneration = 0;
let openTabsLoadState = 'ready';
let allOpenTabs = [];
let currentActiveTabId = null;
let activeHome = true;
let homeTrailSavePending = false;
let captureCommitPending = false;
${refreshOpenTabsSource}
globalThis.__trailRefresh = {
  refreshOpenTabs,
  setPending(home, capture) { homeTrailSavePending = home; captureCommitPending = capture; },
};`,
    context,
    { filename: 'home-trail-refresh-contract.js' },
  );
  const resolvePair = (pair, activeTabs, allTabs) => {
    for (const request of pair) request.resolve(request.options.active ? activeTabs : allTabs);
  };

  const optimisticRefresh = context.__trailRefresh.refreshOpenTabs();
  const optimisticPair = pendingQueries.splice(0, 2);
  fingerprint = 'optimistic-inbox';
  context.__trailRefresh.setPending(true, true);
  resolvePair(optimisticPair, [{ id: 1 }], [{ id: 1, url: 'https://candidate.example' }]);
  await optimisticRefresh;
  assert.equal(calls.boards, 0, 'a tab query resolving during capture must not repaint optimistic Home state');

  context.__trailRefresh.setPending(true, false);
  fingerprint = 'before-stale-candidate-refresh';
  const staleCandidateRefresh = context.__trailRefresh.refreshOpenTabs();
  const staleCandidatePair = pendingQueries.splice(0, 2);
  fingerprint = 'after-stale-candidate-refresh';
  resolvePair(staleCandidatePair, [{ id: 2 }], [{ id: 2, url: 'https://next.example' }]);
  await staleCandidateRefresh;
  assert.equal(calls.boards, 1, 'a pre-mutation stale-candidate refresh must repaint Home even while its controller is pending');
  assert.deepEqual(calls.focus, ['save-primary'], 'a stale-candidate repaint must restore the exact Trail focus key');

  context.__trailRefresh.setPending(false, false);
  fingerprint = 'stable';
  const olderRefresh = context.__trailRefresh.refreshOpenTabs();
  const olderPair = pendingQueries.splice(0, 2);
  const newerRefresh = context.__trailRefresh.refreshOpenTabs();
  const newerPair = pendingQueries.splice(0, 2);
  const tabRendersBeforeGenerationRace = calls.tabRenders;
  resolvePair(newerPair, [{ id: 4 }], [{ id: 4, url: 'https://newer-query.example' }]);
  await newerRefresh;
  resolvePair(olderPair, [{ id: 3 }], [{ id: 3, url: 'https://stale-query.example' }]);
  assert.equal(await olderRefresh, false, 'an older overlapping tab query must report that it was superseded');
  assert.equal(calls.tabRenders, tabRendersBeforeGenerationRace + 1, 'an older overlapping query must not repaint the tab rail');

  const captureFocusRefresh = context.__trailRefresh.refreshOpenTabs();
  const captureFocusPair = pendingQueries.splice(0, 2);
  activeElement = {
    classList: { contains(name) { return name === 'otab-check'; } },
    closest(selector) {
      assert.equal(selector, '.otab[data-tid]');
      return { dataset: { tid: '28' } };
    },
  };
  resolvePair(captureFocusPair, [{ id: 28 }], [{ id: 28, url: 'data:text/plain,private' }]);
  await captureFocusRefresh;
  assert.deepEqual(calls.railFocus, ['28'],
    'a delayed tab refresh must restore the retained checkbox focused immediately before repaint');

  const unrelatedFocusRefresh = context.__trailRefresh.refreshOpenTabs();
  const unrelatedFocusPair = pendingQueries.splice(0, 2);
  activeElement = { classList: { contains() { return false; } } };
  resolvePair(unrelatedFocusPair, [{ id: 29 }], [{ id: 29, url: 'https://ordinary.example' }]);
  await unrelatedFocusRefresh;
  assert.deepEqual(calls.railFocus, ['28'],
    'an ordinary tab refresh must not move unrelated focus into the rail');
}

async function assertHomeTrailSaveController() {
  const calls = { busy: [], saves: [], toasts: [], refreshes: 0, renders: 0, classes: [], focus: [], status: '' };
  const candidate = { id: 31, windowId: 5, active: false, url: 'https://candidate.example', title: 'Candidate' };
  let currentTab = { ...candidate };
  let destinationMatches = true;
  let saveOutcome = {
    accepted: true,
    item: { id: 'saved-trail' },
    destinationConfirmed: true,
  };
  const trail = { classList: { add(value) { calls.classes.push(`add:${value}`); }, remove(value) { calls.classes.push(`remove:${value}`); } } };
  const status = {};
  const context = vm.createContext({
    chrome: { tabs: { async get() { return currentTab; } } },
    State: { isRecoveryRequired() { return false; } },
    document: {
      querySelector(selector) { return selector === '.home-trail' ? trail : null; },
      getElementById(id) { return id === 'home-trail-status' ? status : null; },
    },
    homeTrailDestinationStillMatches() { return destinationMatches; },
    setHomeTrailSaveBusy(value) { calls.busy.push(value); },
    restoreHomeTrailFocus(key) { calls.focus.push(key); return true; },
    async saveTabToInbox(tab, options) { calls.saves.push({ tab, options }); return saveOutcome; },
    async refreshOpenTabs() { calls.refreshes += 1; },
    renderBoard() { calls.renders += 1; },
    toast(message) { calls.toasts.push(message); },
    tr(key, values) { return values?.destination ? `${key}:${values.destination}` : key; },
    setTimeout(callback) { callback(); return 1; },
  });
  vm.runInContext(
    `let homeTrailSavePending = false; let captureCommitPending = false;\n${capturedTabSourceDescriptorSource}\n${capturedTabStillMatchesSource}\n${saveHomeTrailCandidateSource}\n` +
    'globalThis.__saveHomeTrailCandidate = saveHomeTrailCandidate;',
    context,
    { filename: 'home-trail-save-controller-contract.js' },
  );
  const save = context.__saveHomeTrailCandidate;
  const destination = { workspaceId: 'ws-1', spaceId: 'space-1', label: 'Work › Research › Inbox' };
  assert.equal(await save(candidate, destination, true, true), true, 'a fresh reviewed candidate must use the shared save path');
  assert.equal(calls.saves.length, 1);
  assert.equal(calls.saves[0].tab.url, candidate.url);
  assert.deepEqual(Object.keys(calls.saves[0].options), ['closeSource', 'returnOutcome']);
  assert.equal(calls.saves[0].options.closeSource, true, 'the explicit close consequence must reach the capture path');
  assert.equal(calls.saves[0].options.returnOutcome, true,
    'Home Trail must request accepted-save destination truth from the shared capture path');
  assert.deepEqual(calls.busy, [true, false], 'save activation must publish and clear synchronous pending state');
  assert.match(status.textContent, /home\.trail\.saved/, 'accepted persistence must show confirmation only after the shared save resolves');
  assert.deepEqual(calls.focus, ['open'], 'keyboard Save success must continue at the Home Trail primary Open action');

  assert.equal(await save(candidate, destination, false), true, 'the explicit keep-open action must also reach the shared save path');
  assert.equal(calls.saves.length, 2);
  assert.equal(calls.saves[1].options.closeSource, false, 'keep-open success must preserve the source consequence');

  const classCountBeforeFailure = calls.classes.length;
  saveOutcome = false;
  assert.equal(await save(candidate, destination, false), false, 'a rejected shared save must remain a failed Trail action');
  assert.equal(calls.saves.length, 3);
  assert.equal(calls.classes.length, classCountBeforeFailure, 'failed persistence must not draw the confirmation Trail');
  assert.equal(status.textContent, '', 'failed persistence must leave no visible success status');
  assert.deepEqual(calls.busy.slice(-2), [true, false], 'failed persistence must still clear the pending interlock');
  saveOutcome = {
    accepted: true,
    item: { id: 'saved-trail' },
    destinationConfirmed: true,
  };

  const classesBeforeAcceptedDrift = calls.classes.length;
  saveOutcome = {
    accepted: true,
    item: { id: 'saved-after-drift' },
    destinationConfirmed: false,
  };
  assert.equal(await save(candidate, destination, true, true), true,
    'an accepted Save with destination drift must remain accepted');
  assert.equal(calls.classes.length, classesBeforeAcceptedDrift,
    'accepted destination drift must not paint the stale reviewed route as confirmed');
  assert.equal(status.textContent, '',
    'accepted destination drift must leave no stale Home Trail destination text');
  assert.equal(calls.focus.at(-1), 'capture',
    'keyboard recovery must return to the generic Trail capture region, not stale Open');
  saveOutcome = {
    accepted: true,
    item: { id: 'saved-trail' },
    destinationConfirmed: true,
  };

  currentTab = { ...candidate, url: 'https://changed.example' };
  assert.equal(await save(candidate, destination, false), false, 'a navigated candidate must require another review');
  assert.equal(calls.saves.length, 4, 'a navigated candidate must not mutate the saved graph');
  assert.equal(calls.refreshes, 1, 'a navigated candidate must refresh the visible source');
  assert.equal(calls.toasts.at(-1), 'home.trail.candidateChanged');

  destinationMatches = false;
  currentTab = { ...candidate };
  assert.equal(await save(candidate, destination, false), false, 'a changed destination must require another review');
  assert.equal(calls.saves.length, 4, 'a changed destination must not reach capture');
  assert.equal(calls.toasts.at(-1), 'home.trail.destinationChanged');
}

async function assertTopbarSaveProvidesExactReceipt() {
  const workspace = { id: 'ws-receipt', name: 'Personal', categories: [] };
  const space = { id: 'space-receipt', name: 'Research', groups: [] };
  const inbox = { id: 'group-receipt', name: 'Inbox', items: [] };
  workspace.categories.push(space);
  workspace.activeCatId = space.id;
  space.groups.push(inbox);
  const state = {
    activeWsId: workspace.id,
    workspaces: [workspace],
    settings: { closeTabOnSave: true },
  };
  const calls = { commits: 0, commitOptions: null, renders: 0, routes: [], prepared: [], focused: 0, toasts: [] };
  let itemSequence = 0;
  let driftDuringCommit = false;
  let destinationAvailable = true;
  const navInbox = {
    isConnected: true,
    focus() { calls.focused += 1; },
  };
  const templates = {
    'capture.snapshotInbox': 'Save to Inbox',
    'capture.receiptSaved': 'Saved “{title}” to {destination}',
    'capture.receiptSavedCopy': 'Saved a copy of “{title}” to {destination}',
    'capture.showSavedItem': 'Show saved item',
    'capture.receiptUnavailable': 'This saved item changed or moved. Nothing was opened.',
    'capture.destinationChangedAfterSave': 'Saved, but the destination changed afterward. Check the latest data.',
    'capture.closedOne': '{base} — closed the source tab',
    'capture.closedMany': '{base} — closed {count} source tabs',
    'capture.stayedOpenOne': '{base} — source tab stayed open',
    'capture.stayedOpenMany': '{base} — source tabs stayed open',
    'capture.closedPartial': '{base} — closed {closed} of {requested} source tabs',
    'nav.inbox': 'Inbox',
    'itemAction.untitled': 'Untitled saved tab',
  };
  const context = vm.createContext({
    URL,
    activeWs() { return workspace; },
    activeCat() { return space; },
    State: {
      get() { return state; },
      snapshot() { return 'action-receipt'; },
      rollbackSnapshot() {},
    },
    tr(key, values = {}) {
      return String(templates[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
    },
    captureDuplicateExists() { return false; },
    captureTabFields(tab) { return { title: tab.title, fav: '' }; },
    stampNew(item) { return item; },
    uid() { return 'legacy-item-receipt'; },
    createOrganizationIdAllocator() { return () => `item-receipt-${++itemSequence}`; },
    createInboxCaptureContext() { return { inboxRef: inbox }; },
    materializeInboxCaptureTarget() { return { workspace, space, inbox }; },
    reportInboxCaptureUnavailable() { return false; },
    inboxCaptureReceiptMessage() { return 'Saved to exact Inbox'; },
    createItemListCaptureContext(items) {
      return {
        listRef: items,
        workspaceRef: workspace,
        spaceRef: space,
        groupRef: inbox,
        groupName: inbox.name,
      };
    },
    createCaptureDestinationReceiptContext(destinationContext, items) {
      return { destinationContext, itemRefs: Array.from(items) };
    },
    resolveCaptureDestinationReceiptTarget(receipt) {
      return destinationAvailable
        && receipt?.destinationContext?.listRef === inbox.items
        && receipt.destinationContext.workspaceRef === workspace
        && receipt.destinationContext.spaceRef === space
        && receipt.destinationContext.groupRef === inbox
        && receipt.destinationContext.groupName === inbox.name
        && receipt.itemRefs.every(item => inbox.items.includes(item))
        ? { workspace, space, group: inbox, items: receipt.itemRefs }
        : null;
    },
    async commitCapturedTabs(_tabs, options) {
      calls.commits += 1;
      calls.commitOptions = options;
      assert.equal(options.validateDestination(), true,
        'top-bar source cleanup must begin with exact saved-item authority');
      if (driftDuringCommit) destinationAvailable = false;
      return {
        actionId: 'action-receipt',
        closeSources: true,
        requestedCloseCount: 1,
        closedCount: 1,
        failedCloseCount: 0,
        destinationChanged: driftDuringCommit,
      };
    },
    renderBoard() { calls.renders += 1; },
    renderAll() {},
    toast(message, options = {}) { calls.toasts.push({ message, options }); },
    itemDetailValueFingerprint(value) { return JSON.stringify(value); },
    itemDetailLocationFingerprint(target) {
      return JSON.stringify({
        ws: target?.ws?.id,
        cat: target?.cat?.id,
        group: target?.group?.id,
        parents: (target?.parents || []).map(parent => parent.id),
      });
    },
    resolveUniqueHomePreviewItem(_workspaceId, itemId) {
      const item = inbox.items.find(candidate => candidate.id === itemId);
      return item
        ? { ws: workspace, cat: space, group: inbox, parents: [], item }
        : null;
    },
    document: {
      getElementById(id) { return id === 'nav-inbox' ? navInbox : null; },
    },
    focusDialogOpener(opener) { opener?.focus(); },
    prepareItemDetailOpen(itemId) { calls.prepared.push(itemId); },
    cancelSearchItemDetailPreparation() { return false; },
    Router: {
      navigate(route, options) {
        calls.routes.push({ route, options });
        return true;
      },
    },
  });
  vm.runInContext(
    `${savedTabUrlPolicySource}\n${homeTrailGroupNameSource}\n${homeTrailPathPartsSource}\n${homeTrailPathTextSource}\n` +
    `${savedItemRecoveryContextSource}\n${resolveSavedItemRecoveryTargetSource}\n${captureResultMessageSource}\n` +
    `${captureReceiptPresentationSource}\n${openCapturedItemReceiptSource}\n${toastCapturedItemReceiptSource}\n` +
    `${saveTabToInboxSource}\nglobalThis.__receipt = { saveTabToInbox };`,
    context,
    { filename: 'topbar-save-receipt-contract.js' },
  );

  const saved = await context.__receipt.saveTabToInbox({
    id: 91,
    windowId: 8,
    title: 'Quarterly roadmap',
    url: 'https://example.com/roadmap',
  }, { closeSource: true, receipt: true });

  assert.equal(saved?.id, 'item-receipt-1', 'an accepted top-bar Save must return the accepted item');
  assert.equal(calls.commits, 1, 'the richer receipt must not retry or add another state write');
  assert.equal(typeof calls.commitOptions?.validateDestination, 'function',
    'the richer receipt must govern persistence and source cleanup with the same exact saved item');
  assert.equal(calls.renders, 1, 'accepted Save must render once before presenting its receipt');
  assert.equal(calls.routes.length, 0, 'accepted Save must not force navigation');
  assert.equal(calls.toasts.length, 1, 'accepted Save must present one receipt');
  assert.equal(
    calls.toasts[0].message,
    'Saved “Quarterly roadmap” to Personal › Research › Inbox — closed the source tab',
    'the receipt must name the accepted item, exact destination, and source consequence',
  );
  assert.equal(calls.toasts[0].options.actionLabel, 'Show saved item');
  assert.equal(calls.toasts[0].options.undo, 'action-receipt', 'the exact receipt must retain action-scoped Undo');

  assert.equal(calls.toasts[0].options.action(), true, 'Show saved item must accept the unchanged frozen target');
  assert.equal(calls.focused, 1, 'the continuation must establish a stable focus return target');
  assert.deepEqual(calls.prepared, ['item-receipt-1']);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.routes)), [{
    route: {
      type: 'group',
      wsId: 'ws-receipt',
      groupId: 'group-receipt',
      itemId: 'item-receipt-1',
      query: {},
    },
    options: { persist: false },
  }], 'Show saved item must route once to the exact accepted destination without persistence');

  saved.title = 'Changed after receipt';
  assert.equal(calls.toasts[0].options.action(), false, 'a changed receipt target must fail closed');
  assert.equal(calls.routes.length, 1, 'a stale receipt must not navigate anywhere else');
  assert.equal(calls.toasts.at(-1).message, 'This saved item changed or moved. Nothing was opened.');
  assert.equal(calls.commits, 1, 'a stale continuation must never retry the accepted Save');

  driftDuringCommit = true;
  const driftOutcome = await context.__receipt.saveTabToInbox({
    id: 92,
    windowId: 8,
    title: 'Changed filing route',
    url: 'https://example.com/drifted-route',
  }, { closeSource: true, receipt: true, returnOutcome: true });
  assert.equal(driftOutcome?.accepted, true,
    'destination drift after acknowledgement must remain an accepted Save');
  assert.equal(driftOutcome?.item?.id, 'item-receipt-2');
  assert.equal(driftOutcome?.destinationConfirmed, false,
    'the opt-in outcome must expose that the accepted destination can no longer be confirmed');
  assert.equal(calls.commits, 2, 'accepted destination drift must never retry the Save');
  assert.equal(calls.toasts.at(-1).message,
    'Saved, but the destination changed afterward. Check the latest data. — closed the source tab');
  assert.equal(calls.toasts.at(-1).options.actionLabel, undefined,
    'accepted destination drift must offer no action for the stale route');
  assert.equal(calls.toasts.at(-1).options.tone, 'warning');
}

async function assertTopbarSaveReviewsExactDestination() {
  const duplicateCandidate = {
    id: 72,
    windowId: 9,
    active: false,
    title: 'Already filed recent page',
    url: 'https://duplicate.example/already',
    lastAccessed: 80,
  };
  const inbox = {
    id: 'inbox-review',
    name: 'Inbox',
    items: [{ id: 'saved-duplicate', type: 'tab', url: duplicateCandidate.url }],
  };
  const space = { id: 'space-review', name: 'Research', groups: [inbox] };
  const workspace = {
    id: 'ws-review',
    name: 'Personal',
    activeCatId: space.id,
    categories: [space],
  };
  const state = {
    activeWsId: workspace.id,
    workspaces: [workspace],
    settings: { captureDeduplicate: true },
  };
  let activeSpace = space;
  const candidate = {
    id: 71,
    windowId: 9,
    active: false,
    title: 'A complete quarterly roadmap title',
    url: 'https://example.com/roadmap',
    lastAccessed: 40,
  };
  let currentTab = { ...candidate };
  const calls = { menus: [], saves: [], toasts: [], gets: 0 };
  const templates = {
    'nav.inbox': 'Inbox',
    'home.trail.saveDestination': 'Save to',
    'home.trail.destinationChanged': 'Your save destination changed. Review it before saving.',
    'home.trail.candidateChanged': 'That tab changed. Review the latest page before saving.',
    'home.trail.noDestination': 'Create a space before saving a tab.',
    'home.trail.destinationConflict': 'This space has more than one Inbox. Review the space before saving.',
    'capture.saveCopyToDestination': 'Save a copy of “{title}” to {destination}',
    'capture.saveCloseToDestination': 'Save “{title}” to {destination} and close tab',
    'action.saveCopy': 'Save a copy to Inbox',
    'action.saveClose': 'Save to Inbox and close tab',
    'itemAction.untitled': 'Untitled saved tab',
  };
  const button = { getBoundingClientRect() { return { left: 24, bottom: 48 }; } };
  const context = vm.createContext({
    URL,
    State: { get() { return state; } },
    activeWs() { return workspace; },
    activeCat() { return activeSpace; },
    tr(key, values = {}) {
      return String(templates[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
    },
    chrome: {
      tabs: {
        async query() { return [candidate, duplicateCandidate]; },
        async get() { calls.gets += 1; return currentTab; },
      },
    },
    document: { getElementById() { return button; } },
    MORE_MENU_ICONS: { save: '<save>' },
    cmIcons: { archive: '<archive>' },
    showContextMenu(x, y, items, options) { calls.menus.push({ x, y, items, options }); },
    async saveTabToInbox(tab, options) { calls.saves.push({ tab, options }); return { id: 'saved-review' }; },
    toast(message, options) { calls.toasts.push({ message, options }); },
  });
  vm.runInContext(
    `${savedTabUrlPolicySource}\n${recentSaveCandidateSource}\n${captureDestinationTabUrlsSource}\n` +
    `${captureDuplicateExistsSource}\n${homeTrailSaveCandidateSource}\n${capturedTabSourceDescriptorSource}\n` +
    `${capturedTabStillMatchesSource}\n${homeTrailPathPartsSource}\n${homeTrailPathTextSource}\n` +
    `${homeTrailDestinationContextSource}\n${homeTrailDestinationStillMatchesSource}\n` +
    `${topbarSaveReviewPresentationSource}\n${saveReviewedTopbarTabSource}\n${saveMostRecentOpenTabSource}\n` +
    'globalThis.__topbarReview = { saveMostRecentOpenTab };',
    context,
    { filename: 'topbar-save-review-contract.js' },
  );

  assert.equal(await context.__topbarReview.saveMostRecentOpenTab({ currentTarget: button }), true);
  assert.equal(calls.saves.length, 0, 'opening the review menu must not save anything');
  assert.equal(calls.menus.length, 1, 'one reviewed candidate must produce one menu');
  const menuItems = calls.menus[0].items;
  assert.equal(menuItems[0].label, 'A complete quarterly roadmap title');
  assert.equal(menuItems[0].meta, 'example.com');
  assert.equal(menuItems[0].detailLabel, 'Save to');
  assert.equal(menuItems[0].detail, 'Personal › Research › Inbox');
  assert.equal(menuItems[1].ariaLabel, 'Save a copy of “A complete quarterly roadmap title” to Personal › Research › Inbox');
  assert.equal(menuItems[2].ariaLabel, 'Save “A complete quarterly roadmap title” to Personal › Research › Inbox and close tab');
  assert.equal(calls.menus[0].options.focusFirst, true);
  assert.equal(calls.menus[0].options.expandedOwner, button,
    'the reviewed Save menu must publish expanded state on its visible opener');

  assert.deepEqual(
    JSON.parse(JSON.stringify(await menuItems[1].action())),
    { id: 'saved-review' },
    'the reviewed copy action must delegate to the accepted capture controller',
  );
  assert.equal(calls.gets, 1, 'activation must fresh-read the exact reviewed browser tab');
  assert.equal(calls.saves.length, 1, 'a fresh review must delegate one capture only');
  assert.deepEqual(JSON.parse(JSON.stringify(calls.saves[0].options)), {
    closeSource: false,
    receipt: true,
  });
  assert.equal(calls.saves[0].tab.url, candidate.url);

  activeSpace = { ...space };
  assert.equal(await menuItems[2].action(), false, 'a changed destination must require another review');
  assert.equal(calls.saves.length, 1, 'a changed destination must not fall through to capture');
  assert.equal(calls.gets, 1, 'a known-stale destination must stop before another browser read');
  assert.equal(calls.toasts.at(-1).message, 'Your save destination changed. Review it before saving.');
}

function assertOpenTabRailResponsiveKeyboardContract() {
  let available = false;
  let collapsed = true;
  const focusCalls = { collapsed: [], filter: 0 };
  const rail = { classList: { contains(name) { return name === 'collapsed' && collapsed; } } };
  const filter = { focus(options) { assert.equal(options.preventScroll, true); focusCalls.filter += 1; } };
  const focusContext = vm.createContext({
    isOpenTabsRailAvailable() { return available; },
    setOpenTabsRailCollapsed(value, options) {
      focusCalls.collapsed.push({ value, persist: options.persist });
      collapsed = value;
    },
    requestAnimationFrame(callback) { callback(); },
    document: {
      getElementById(id) {
        if (id === 'tabrail') return rail;
        if (id === 'tab-filter') return filter;
        return null;
      },
    },
  });
  vm.runInContext(
    `${focusOpenTabFilterSource}\nglobalThis.__focusRailFilter = focusOpenTabFilter;`,
    focusContext,
    { filename: 'open-tab-rail-focus-contract.js' },
  );
  assert.equal(focusContext.__focusRailFilter(), false,
    'the S shortcut must reject a rail hidden by the 800px responsive boundary');
  assert.deepEqual(focusCalls, { collapsed: [], filter: 0 },
    'the hidden responsive rail must receive neither expansion nor hidden focus');
  available = true;
  assert.equal(focusContext.__focusRailFilter(), true,
    'the S shortcut must accept a reachable collapsed responsive rail');
  assert.deepEqual(focusCalls, { collapsed: [{ value: false, persist: true }], filter: 1 },
    'the S shortcut must expand the reachable drawer before focusing its filter');

  const selected = new Set([17, 18]);
  const escapeCalls = { prevented: 0, filters: 0, badges: 0, renders: 0, focus: [], collapses: 0 };
  let drawerOpen = true;
  const escapeFilter = { value: 'github' };
  const escapeRail = { contains(target) { return target === escapeFilter; } };
  const escapeContext = vm.createContext({
    __selected: selected,
    isOpenTabsRailAvailable() { return true; },
    isOpenTabsRailDrawerOpen() { return drawerOpen; },
    applyFilter() { escapeCalls.filters += 1; },
    updateSelectedBadge() { escapeCalls.badges += 1; },
    renderOpenTabs() { escapeCalls.renders += 1; },
    restoreOpenTabSelectionFocus(id) { escapeCalls.focus.push(id); },
    setOpenTabsRailCollapsed(value, options) {
      assert.equal(value, true);
      assert.deepEqual(JSON.parse(JSON.stringify(options)), { persist: true, restoreFocus: true });
      drawerOpen = false;
      escapeCalls.collapses += 1;
    },
    document: {
      activeElement: escapeFilter,
      getElementById(id) {
        if (id === 'tabrail') return escapeRail;
        if (id === 'tab-filter') return escapeFilter;
        return null;
      },
    },
  });
  vm.runInContext(
    `let selectedTabIds = __selected; let lastClickedTabId = 18;\n${handleOpenTabsEscapeSource}\n` +
    'globalThis.__escapeRail = handleOpenTabsEscape;',
    escapeContext,
    { filename: 'open-tab-rail-escape-contract.js' },
  );
  const escapeEvent = () => ({ key: 'Escape', preventDefault() { escapeCalls.prevented += 1; } });
  assert.equal(escapeContext.__escapeRail(escapeEvent()), true);
  assert.equal(escapeFilter.value, '', 'first rail Escape must clear the filter query');
  assert.equal(selected.size, 2, 'filter Escape must not also clear the selected tabs');
  assert.equal(escapeCalls.collapses, 0, 'filter Escape must not also close the responsive drawer');
  assert.equal(escapeContext.__escapeRail(escapeEvent()), true);
  assert.equal(selected.size, 0, 'second rail Escape must clear the selected tabs');
  assert.deepEqual(escapeCalls.focus, [18], 'selection Escape must restore the rebuilt exact tab control');
  assert.equal(escapeCalls.collapses, 0, 'selection Escape must not also close the responsive drawer');
  assert.equal(escapeContext.__escapeRail(escapeEvent()), true);
  assert.equal(escapeCalls.collapses, 1, 'third rail Escape must close the responsive drawer');
  assert.equal(escapeCalls.prevented, 3, 'each consumed rail Escape must prevent lower-surface handling');
}

(async () => {
  const captureModelHarness = buildCaptureSettingsHarness();
  const captureModelStateBefore = JSON.stringify(captureModelHarness.state());
  const popupPolicy = captureModelHarness.api.model(captureModelHarness.state());
  assert.equal(popupPolicy.destination, 'en:settings.capturePopupChoose',
    'ask-every-time must truthfully show the popup choice instead of a manufactured destination');
  assert.match(popupPolicy.entry, /^en:settings\.captureOtherEntry:destination=en:settings\.captureDestinationPath:/,
    'the same contract must expose the exact real quick-save fallback path');
  assert.equal(popupPolicy.record, 'en:settings.captureRecordTitleIcon',
    'the saved-record line must reflect the real title and favicon settings');
  assert.equal(popupPolicy.duplicate, 'en:settings.captureDuplicateSkip',
    'the saved-record line must reflect the real duplicate policy');
  assert.equal(popupPolicy.effect, 'en:settings.captureAfterClose',
    'the final route stop must reflect the real source-tab consequence');
  assert.equal(JSON.stringify(captureModelHarness.state()), captureModelStateBefore,
    'rendering the Capture contract must never allocate Inbox or mutate the local graph');
  captureModelHarness.state().settings.captureAskEveryTime = false;
  const directPolicy = captureModelHarness.api.model(captureModelHarness.state());
  assert.match(directPolicy.destination, /^en:settings\.captureDestinationPath:/,
    'quick-save mode must show the exact remembered destination from real state');
  captureModelHarness.setLocale('zh');
  assert.match(captureModelHarness.api.model(captureModelHarness.state()).destination,
    /^zh:settings\.captureDestinationPath:/,
    'Capture policy copy must resolve again after a locale change');

  const ambiguousState = captureSettingsState({
    captureAskEveryTime: false,
    captureDefaultCategoryId: 's-focus',
    captureLastTarget: undefined,
  });
  delete ambiguousState.settings.captureLastTarget;
  ambiguousState.workspaces[0].categories[0].groups.push({ id: 'g-other', name: 'Inbox', items: [] });
  const ambiguousHarness = buildCaptureSettingsHarness(ambiguousState);
  const ambiguousPolicy = ambiguousHarness.api.model(ambiguousState);
  assert.equal(ambiguousPolicy.destinationAvailable, false,
    'more than one Inbox must make the visible destination unavailable');
  assert.equal(ambiguousPolicy.destination, 'en:settings.captureDestinationUnavailable',
    'an ambiguous destination must never be presented as confirmed');
  const ambiguousOption = ambiguousPolicy.options.find(option => option.mode === 'unavailable');
  assert.equal(ambiguousOption?.disabled, true,
    'an already-saved ambiguous default must remain visible but disabled for recovery');
  assert.equal(ambiguousPolicy.options.find(option => option.mode === 'active')?.disabled, true,
    'an ambiguous active Space must not remain an apparently selectable fallback');

  const malformedIdentityState = captureSettingsState({ captureAskEveryTime: false });
  malformedIdentityState.settings.captureLastTarget.workspaceId = 42;
  const malformedIdentityHarness = buildCaptureSettingsHarness(malformedIdentityState);
  assert.equal(malformedIdentityHarness.api.resolve(malformedIdentityState), null,
    'the visible contract must not coerce an ID type that the real capture engine rejects');

  const reservedWordState = captureSettingsState({
    captureAskEveryTime: false,
    captureDefaultCategoryId: 'active',
    captureLastTarget: undefined,
  });
  delete reservedWordState.settings.captureLastTarget;
  reservedWordState.workspaces[0].categories[0].id = 'active';
  reservedWordState.workspaces[0].activeCatId = 'active';
  const reservedWordHarness = buildCaptureSettingsHarness(reservedWordState);
  const reservedWordPolicy = reservedWordHarness.api.model(reservedWordState);
  const reservedWordOption = reservedWordPolicy.options.find(option => option.categoryId === 'active');
  assert.equal(reservedWordOption?.mode, 'space',
    'an imported Space whose ID is active must remain distinct from the UI active-Space choice');
  assert.equal(reservedWordPolicy.selectedValue, reservedWordOption.value,
    'the imported reserved-word Space must remain the selected exact default');

  const duplicateIdentityState = captureSettingsState({ captureAskEveryTime: false });
  duplicateIdentityState.workspaces.push({
    id: 'w-other',
    name: 'Other',
    activeCatId: 's-other',
    categories: [{
      id: 's-other',
      name: 'Other',
      groups: [{ id: 'g-inbox', name: 'Inbox', items: [] }],
    }],
  });
  const duplicateIdentityHarness = buildCaptureSettingsHarness(duplicateIdentityState);
  assert.equal(duplicateIdentityHarness.api.resolve(duplicateIdentityState), null,
    'a duplicate remembered Group identity must fail closed without guessing by ancestry');

  let releaseCaptureReceipt;
  const pendingCapture = buildCaptureSettingsHarness();
  pendingCapture.setPersistNow(() => new Promise(resolve => { releaseCaptureReceipt = resolve; }));
  const pendingCaptureRun = pendingCapture.api.commit('tog-capture-ask', { captureAskEveryTime: false });
  assert.equal(pendingCapture.state().settings.captureAskEveryTime, false,
    'a Capture preference must update the owned draft before requesting its receipt');
  assert.equal(pendingCapture.calls.persists, 1,
    'one Capture preference activation must request exactly one persisted receipt');
  assert.equal(pendingCapture.api.pending().controlId, 'tog-capture-ask',
    'the initiating control must own the pending transaction');
  assert.deepEqual({ ...pendingCapture.api.status() },
    { key: 'settings.capturePolicySaving', state: 'pending' },
    'pending persistence must expose a localized saving state');
  assert.equal(await pendingCapture.api.commit('tog-capture-close', { closeTabOnSave: false }), false,
    'a second Capture preference activation must be refused while the first receipt is pending');
  assert.equal(pendingCapture.calls.persists, 1,
    'duplicate activation must not enqueue another whole-graph write');
  assert.equal(pendingCapture.calls.focuses, 1,
    'duplicate activation must return focus to the initiating control');
  releaseCaptureReceipt({ ok: true });
  assert.equal(await pendingCaptureRun, true,
    'an exact acknowledged Capture preference must complete');
  assert.equal(pendingCapture.api.pending(), null,
    'acknowledgement must release the Capture interlock');
  assert.deepEqual({ ...pendingCapture.api.status() },
    { key: 'settings.capturePolicySaved', state: 'success' },
    'only acknowledgement may expose the saved receipt');
  assert.equal(pendingCapture.calls.focuses, 1,
    'completion must not move focus away from the initiating control');

  const destinationCapture = buildCaptureSettingsHarness();
  assert.equal(await destinationCapture.api.commit('capture-destination', {
    captureDefaultCategoryId: 's-focus',
    captureLastTarget: undefined,
  }), true);
  assert.equal(destinationCapture.state().settings.captureDefaultCategoryId, 's-focus',
    'the fixed quick-save Space must be included in the acknowledged patch');
  assert.equal(Object.prototype.hasOwnProperty.call(destinationCapture.state().settings, 'captureLastTarget'), false,
    'an explicit fixed destination must clear the remembered Group in the same receipt');
  assert.equal(destinationCapture.calls.persists, 1,
    'the destination and remembered-target update must share one whole-graph write');

  const noOpCapture = buildCaptureSettingsHarness();
  assert.equal(await noOpCapture.api.commit('tog-capture-ask', { captureAskEveryTime: true }), true,
    'an unchanged preference remains a successful no-op');
  assert.equal(noOpCapture.calls.persists, 0,
    'an unchanged preference must not create an empty persisted revision');
  assert.equal(await noOpCapture.api.commit('unknown-control', { captureAskEveryTime: false }), false,
    'an unknown opener must not mutate Capture settings');
  assert.equal(await noOpCapture.api.commit('tog-capture-ask', { unsafeKey: true }), false,
    'an unknown setting key must not cross the preference boundary');
  assert.equal(noOpCapture.calls.persists, 0,
    'invalid Capture patches must stop before persistence');

  const rejectedCapture = buildCaptureSettingsHarness();
  rejectedCapture.setPersistNow(async () => {
    rejectedCapture.setRecovery(true);
    throw new Error('receipt rejected');
  });
  assert.equal(await rejectedCapture.api.commit('tog-capture-close', { closeTabOnSave: false }), false,
    'a rejected Capture receipt must not complete');
  assert.deepEqual({ ...rejectedCapture.api.status() },
    { key: 'settings.capturePolicyFailed', state: 'error' },
    'rejection must remain an error rather than a success toast');
  assert.equal(rejectedCapture.state().settings.closeTabOnSave, false,
    'the unsaved draft must remain visible behind fail-closed recovery');
  assert.equal(rejectedCapture.calls.recoveries, 1,
    'receipt rejection must surface the existing authoritative-reload recovery');

  let releaseDriftReceipt;
  const driftCapture = buildCaptureSettingsHarness();
  driftCapture.setPersistNow(() => new Promise(resolve => { releaseDriftReceipt = resolve; }));
  const driftRun = driftCapture.api.commit('tog-capture-dedupe', { captureDeduplicate: false });
  driftCapture.state().settings.captureDeduplicate = true;
  releaseDriftReceipt({ ok: true });
  assert.equal(await driftRun, false,
    'a touched preference that changes before acknowledgement must not claim success');
  assert.equal(driftCapture.calls.requires, 1,
    'post-acknowledgement preference drift must require authoritative recovery');
  assert.equal(driftCapture.calls.recoveries, 1,
    'post-acknowledgement drift must expose the recovery layer');
  assert.notEqual(driftCapture.api.status().state, 'success',
    'post-acknowledgement drift must never emit a saved receipt');

  let releaseAdoptedReceipt;
  const adoptedCapture = buildCaptureSettingsHarness();
  adoptedCapture.setPersistNow(() => new Promise(resolve => { releaseAdoptedReceipt = resolve; }));
  const adoptedRun = adoptedCapture.api.commit('tog-capture-favicon', { captureIncludeFavicon: false });
  adoptedCapture.setState(JSON.parse(JSON.stringify(adoptedCapture.state())));
  releaseAdoptedReceipt({ ok: true });
  assert.equal(await adoptedRun, false,
    'a clean-storage adoption that replaces the graph before receipt must not claim preference success');
  assert.equal(adoptedCapture.calls.requires, 1,
    'graph-owner replacement must require authoritative recovery');
  assert.equal(adoptedCapture.calls.recoveries, 1,
    'graph-owner replacement must expose the recovery layer');

  const blockedCapture = buildCaptureSettingsHarness();
  blockedCapture.setRecovery(true);
  const blockedBefore = JSON.stringify(blockedCapture.state().settings);
  assert.equal(await blockedCapture.api.commit('tog-capture-title', { captureIncludeTitle: false }), false,
    'an existing recovery interlock must reject Capture edits before mutation');
  assert.equal(JSON.stringify(blockedCapture.state().settings), blockedBefore,
    'a recovery-blocked Capture edit must leave the local draft untouched');
  assert.equal(blockedCapture.calls.persists, 0,
    'a recovery-blocked Capture edit must not request storage');
  assert.equal(blockedCapture.calls.recoveries, 1,
    'a recovery-blocked Capture edit must return to the recovery layer');

  await runStorageRefreshChecks();
  await testBoardSelectionAndDetailsControlContract();
  await testBoardTodoCompletionReceiptContract();
  await testBoardRecordMenuUsesActualPreparedOpener();
  await assertBoardLocalRecordUsesRetainedSafeIdentity();
  await testBoardLocalArchiveRestoresFocusAfterReceipt();
  await assertUnsafeDirectCaptureRejected();
  await assertWindowCaptureUsesReopenableUrlsOnly();
  await assertMixedSelectionSavesRecoverableTabsOnly();
  assertExactCaptureDestinationReceiptContract();
  assertInactiveSpaceDropCanFreezeExactDestination();
  await assertSpaceDropUsesCaptureFieldPolicy();
  await assertUnsupportedSelectionCannotCreateInbox();
  await assertMixedInboxSelectionRetainsUnsupportedTabs();
  await assertExactInboxCaptureBoundary();
  assertInboxCaptureReceiptMessages();
  await assertExistingGroupCaptureContract();
  await assertSaveAllTabsAdoptionBoundary();
  await assertSaveAllTabsFailureStates();
  await assertPaletteRejectsUnreopenableActiveTab();
  assertPaletteSavedPageRecovery();
  await assertUnsupportedGroupSelectionDoesNotFallThrough();
  await assertUnsupportedSingleDropIsInert();
  assertCapturedSelectionFocusContinuity();
  assertOpenTabRailResponsiveKeyboardContract();
  assertStackDropPreviewLifecycle();
  await assertHomeTrailRefreshController();
  await assertHomeTrailSaveController();
  await assertTopbarSaveProvidesExactReceipt();
  await assertTopbarSaveReviewsExactDestination();
  await assertSavedTabOpenContract();
  await assertSavedTabContextMenuContract();

  let releaseQuery;
  const deferred = new Promise(resolve => { releaseQuery = resolve; });
  const loading = buildHarness(() => deferred);
  loading.api.bindWelcome();
  const opening = loading.api.openWelcome();
  assert.equal(loading.overlay.classList.contains('hidden'), false, 'welcome must become visible before tab discovery completes');
  assert.equal(loading.document.activeElement.id, 'wc-explore', 'welcome must take focus immediately while loading');
  assert.equal(loading.elements.get('wc-candidate').getAttribute('aria-busy'), 'true', 'tab discovery must expose a loading state');
  releaseQuery([{ id: 5, windowId: 1, active: false, url: 'https://example.com/new', title: 'Newest', lastAccessed: 20 }]);
  await opening;
  assert.equal(loading.document.activeElement.id, 'wc-save-first', 'a discovered tab must move focus to the primary save action');

  const success = buildHarness(
    async () => [
      { id: 1, url: 'chrome://settings', title: 'Browser settings', lastAccessed: 100 },
      { id: 2, windowId: 1, active: false, url: 'https://example.com/older', title: 'Older', lastAccessed: 10 },
      { id: 3, windowId: 1, active: false, url: 'https://example.com/newer', title: 'Newer', lastAccessed: 30 },
    ],
    async () => ({
      accepted: true,
      item: { id: 'saved-1' },
      destinationConfirmed: true,
    }),
    {
      inboxItems: [{ id: 'saved-newer', type: 'tab', url: 'https://example.com/newer' }],
    },
  );
  success.api.bindWelcome();
  await success.api.openWelcome();
  assert.equal(success.calls.remembers, 1, 'welcome must remember its opener');
  assert.equal(success.calls.locks, 1, 'welcome must lock background scroll');
  assert.equal(success.elements.get('wc-candidate-title').textContent, 'Older',
    'welcome must skip a newer Inbox duplicate and show the next recent unsaved tab');
  assert.equal(success.elements.get('wc-candidate-url').textContent, 'example.com', 'welcome must show the real candidate URL');
  assert.equal(success.elements.get('wc-candidate').getAttribute('aria-busy'), 'false', 'successful discovery must end loading');
  assert.match(success.elements.get('wc-destination').innerHTML, /Personal[\s\S]*Research[\s\S]*Inbox/,
    'welcome must preview the exact current Workspace, Space, and Inbox before Save');
  assert.equal(success.elements.get('wc-destination-message').classList.contains('hidden'), true,
    'an exact available destination must not retain unavailable guidance');
  assert.equal(success.elements.get('wc-save-first').disabled, false, 'save must enable only after a real candidate is found');
  await success.elements.get('wc-save-first').onclick();
  assert.equal(success.calls.gets, 1, 'primary activation must fresh-read the exact reviewed browser tab once');
  assert.equal(success.calls.saves.length, 1, 'primary action must use the existing capture path once');
  assert.equal(success.calls.saves[0].tab.id, 2, 'primary action must save the unsaved candidate shown');
  assert.equal(success.calls.saves[0].options.closeSource, true, 'first save must request close through the acknowledged capture path');
  assert.deepEqual(Object.keys(success.calls.saves[0].options), ['closeSource', 'returnOutcome']);
  assert.equal(success.calls.saves[0].options.returnOutcome, true,
    'first Save must request accepted destination truth from the shared capture path');
  assert.equal(success.overlay.classList.contains('hidden'), true, 'successful save must close the welcome');
  assert.equal(success.calls.inbox, 1, 'successful save must hand off to Inbox');
  assert.deepEqual(success.calls.focusedItems, ['saved-1'], 'successful save must focus the saved item');
  assert.equal(success.state.settings.onboarding.welcomeSeen, true, 'successful completion must persist the first-run gate');

  const acceptedDestinationDrift = buildHarness(
    async () => [{ id: 30, windowId: 1, active: false, url: 'https://example.com/accepted-drift', title: 'Accepted drift', lastAccessed: 1 }],
    async () => ({
      accepted: true,
      item: { id: 'saved-after-drift' },
      destinationConfirmed: false,
    }),
  );
  acceptedDestinationDrift.api.bindWelcome();
  await acceptedDestinationDrift.api.openWelcome();
  assert.equal(await acceptedDestinationDrift.elements.get('wc-save-first').onclick(), true,
    'an accepted first Save remains complete when its destination later drifts');
  assert.equal(acceptedDestinationDrift.overlay.classList.contains('hidden'), true,
    'accepted destination drift must close Welcome so it cannot invite a duplicate Save');
  assert.equal(acceptedDestinationDrift.calls.inbox, 0,
    'accepted destination drift must not navigate to the stale reviewed Inbox');
  assert.deepEqual(acceptedDestinationDrift.calls.focusedItems, [],
    'accepted destination drift must not focus an item through the stale route');
  assert.equal(acceptedDestinationDrift.state.settings.onboarding.welcomeSeen, true,
    'accepted destination drift must still complete the first-run gate');

  const destinationUnavailable = buildHarness(
    async () => [{ id: 31, windowId: 1, active: false, url: 'https://example.com/file', title: 'File me', lastAccessed: 1 }],
    async () => ({ id: 'must-not-save' }),
    { destinationValid: false },
  );
  destinationUnavailable.api.bindWelcome();
  await destinationUnavailable.api.openWelcome();
  assert.equal(destinationUnavailable.elements.get('wc-destination-message').classList.contains('hidden'), false,
    'an unavailable exact destination must stay inline instead of manufacturing a route');
  assert.equal(destinationUnavailable.elements.get('wc-save-first').classList.contains('hidden'), true,
    'destination uncertainty must remove the destructive first-save action');
  assert.equal(destinationUnavailable.document.activeElement.id, 'wc-explore',
    'destination uncertainty must focus the safe continuation');
  assert.equal(await destinationUnavailable.elements.get('wc-save-first').onclick(), false,
    'a hidden unavailable Save must remain inert if activated programmatically');
  assert.equal(destinationUnavailable.calls.gets, 0, 'known destination uncertainty must stop before a browser read');
  assert.deepEqual(destinationUnavailable.calls.saves, [], 'known destination uncertainty must save and close nothing');

  const destinationDrift = buildHarness(
    async () => [{ id: 32, windowId: 1, active: false, url: 'https://example.com/drift', title: 'Destination drift', lastAccessed: 1 }],
    async () => ({ id: 'must-not-save' }),
  );
  destinationDrift.api.bindWelcome();
  await destinationDrift.api.openWelcome();
  destinationDrift.setDestinationValid(false);
  assert.equal(await destinationDrift.elements.get('wc-save-first').onclick(), false,
    'a changed destination must require another review');
  assert.equal(destinationDrift.calls.gets, 0, 'known destination drift must stop before reading the source tab');
  assert.deepEqual(destinationDrift.calls.saves, [], 'destination drift must not reach capture or source cleanup');
  assert.equal(destinationDrift.document.activeElement.id, 'wc-retry', 'destination drift must focus its refresh action');
  assert.equal(destinationDrift.overlay.classList.contains('hidden'), false, 'destination drift must keep Welcome available');

  const candidateDrift = buildHarness(
    async () => [{ id: 33, windowId: 1, active: false, url: 'https://example.com/reviewed', title: 'Reviewed', lastAccessed: 1 }],
    async () => ({ id: 'must-not-save' }),
    { get: async id => ({ id, windowId: 1, active: false, url: 'https://example.com/navigated', title: 'Navigated' }) },
  );
  candidateDrift.api.bindWelcome();
  await candidateDrift.api.openWelcome();
  assert.equal(await candidateDrift.elements.get('wc-save-first').onclick(), false,
    'a navigated source tab must require another review');
  assert.equal(candidateDrift.calls.gets, 1, 'candidate drift must be discovered by one exact tab read');
  assert.deepEqual(candidateDrift.calls.saves, [], 'candidate drift must stop before persistence or source cleanup');
  assert.equal(candidateDrift.elements.get('wc-error').textContent,
    'That tab changed. Review the latest page before saving.');
  assert.equal(candidateDrift.document.activeElement.id, 'wc-retry', 'candidate drift must focus Retry');

  let releasePendingSave;
  const pendingSave = buildHarness(
    async () => [{ id: 34, windowId: 1, active: false, url: 'https://example.com/pending', title: 'Pending save', lastAccessed: 1 }],
    async () => new Promise(resolve => { releasePendingSave = resolve; }),
  );
  pendingSave.api.bindWelcome();
  await pendingSave.api.openWelcome();
  const pendingSaveRun = pendingSave.elements.get('wc-save-first').onclick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pendingSave.elements.get('wc-card').getAttribute('aria-busy'), 'true',
    'pending Save must expose one busy transaction sheet');
  assert.equal(pendingSave.elements.get('wc-save-first').disabled, true, 'pending Save must block duplicate activation');
  assert.equal(pendingSave.elements.get('wc-explore').disabled, true, 'pending Save must block dismissal');
  const pendingKeydown = pendingSave.listeners.get('welcome:keydown');
  pendingKeydown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(pendingSave.overlay.classList.contains('hidden'), false, 'Escape must not close a pending first save');
  assert.equal(pendingSave.calls.persists, 0, 'pending Escape must not mark onboarding complete');
  releasePendingSave({
    accepted: true,
    item: { id: 'saved-pending' },
    destinationConfirmed: true,
  });
  assert.equal(await pendingSaveRun, true);
  assert.equal(pendingSave.overlay.classList.contains('hidden'), true, 'acknowledged Save may complete the Inbox handoff');
  assert.equal(pendingSave.elements.get('wc-card').getAttribute('aria-busy'), 'false', 'completion must release the busy state');

  const unsupported = buildHarness(async () => [
    { id: 4, url: 'data:text/plain,unfinished', title: 'Local draft', lastAccessed: 40 },
    { id: 5, url: 'blob:https://example.com/private-draft', title: 'Private draft', lastAccessed: 30 },
    { id: 6, url: 'javascript:alert(1)', title: 'Script page', lastAccessed: 20 },
    { id: 7, url: 'chrome-extension://locus/newtab.html', title: 'Locus', lastAccessed: 10 },
  ]);
  unsupported.api.bindWelcome();
  await unsupported.api.openWelcome();
  assert.equal(unsupported.elements.get('wc-empty').classList.contains('hidden'), false,
    'first use must not offer a page that the shared Reopen contract cannot open');
  assert.equal(unsupported.elements.get('wc-save-first').classList.contains('hidden'), true,
    'an unreopenable first-use page must not expose Save and close');
  assert.equal(unsupported.document.activeElement.id, 'wc-explore',
    'an unsupported-only first-use result must focus the safe Explore continuation');
  assert.deepEqual(unsupported.calls.saves, [],
    'unsupported first-use pages must never reach persistence or source cleanup');

  const empty = buildHarness(async () => [
    { id: 9, url: 'chrome-extension://locus/newtab.html', title: 'Locus', lastAccessed: 50 },
  ]);
  empty.api.bindWelcome();
  await empty.api.openWelcome();
  assert.equal(empty.elements.get('wc-empty').classList.contains('hidden'), false, 'no eligible tab must show the empty state');
  assert.equal(empty.elements.get('wc-error').classList.contains('hidden'), true, 'no eligible tab must not be mislabeled as an error');
  assert.equal(empty.elements.get('wc-save-first').classList.contains('hidden'), true, 'empty state must not expose an unusable primary action');
  assert.equal(empty.document.activeElement.id, 'wc-explore', 'empty state must focus its real continuation');

  let queryMode = 'error';
  const retry = buildHarness(async () => {
    if (queryMode === 'error') throw new Error('tabs unavailable');
    return [{ id: 11, windowId: 1, active: false, url: 'https://example.org/recovered', title: 'Recovered tab', lastAccessed: 1 }];
  });
  retry.api.bindWelcome();
  await retry.api.openWelcome();
  assert.equal(retry.elements.get('wc-error').classList.contains('hidden'), false, 'query rejection must show a distinct error state');
  assert.equal(retry.elements.get('wc-empty').classList.contains('hidden'), true, 'query rejection must not masquerade as an empty state');
  assert.equal(retry.elements.get('wc-retry').classList.contains('hidden'), false, 'query rejection must provide retry');
  assert.equal(retry.document.activeElement.id, 'wc-retry', 'query rejection must focus retry');
  queryMode = 'success';
  await retry.elements.get('wc-retry').onclick();
  assert.equal(retry.elements.get('wc-error').classList.contains('hidden'), true, 'retry success must clear the error');
  assert.equal(retry.elements.get('wc-candidate-title').textContent, 'Recovered tab', 'retry must refresh from real tab state');
  assert.equal(retry.document.activeElement.id, 'wc-save-first', 'retry success must focus the primary action');

  const failedSave = buildHarness(
    async () => [{ id: 12, windowId: 1, active: false, url: 'https://example.net/keep-open', title: 'Keep open', lastAccessed: 1 }],
    async () => false,
  );
  failedSave.api.bindWelcome();
  await failedSave.api.openWelcome();
  await failedSave.elements.get('wc-save-first').onclick();
  assert.equal(failedSave.overlay.classList.contains('hidden'), false, 'failed persistence must keep the welcome available');
  assert.equal(failedSave.calls.inbox, 0, 'failed persistence must not claim an Inbox handoff');
  assert.equal(failedSave.calls.persists, 0, 'failed persistence must not mark onboarding complete');
  assert.equal(failedSave.calls.gets, 1, 'failed persistence must still be preceded by one exact source read');
  assert.equal(failedSave.elements.get('wc-card').getAttribute('aria-busy'), 'false', 'failed persistence must release the pending sheet');
  assert.equal(failedSave.elements.get('wc-save-first').disabled, false, 'a known failed persistence result must restore the reviewed Save action');
  assert.equal(failedSave.document.activeElement.id, 'wc-save-first', 'known failure must return focus to the reviewed Save action');

  const keyboard = buildHarness(async () => []);
  keyboard.api.bindWelcome();
  await keyboard.api.openWelcome();
  const keydown = keyboard.listeners.get('welcome:keydown');
  keydown({ key: 'Tab', preventDefault() {} });
  assert.equal(keyboard.calls.traps, 1, 'Tab must stay in the welcome dialog');
  let prevented = false;
  let stopped = false;
  keydown({
    key: 'Escape',
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
  });
  assert.equal(prevented, true, 'Escape must be consumed by the welcome');
  assert.equal(stopped, true, 'Escape must not bubble into lower surfaces');
  assert.equal(keyboard.overlay.classList.contains('hidden'), true, 'Escape must close only the welcome');
  assert.equal(keyboard.calls.restores, 1, 'Escape must restore the opener');
  assert.equal(keyboard.document.activeElement, keyboard.opener, 'Escape must return focus to the opener');
  assert.equal(keyboard.calls.unlocks, 1, 'Escape must release background scroll');

  console.log('Onboarding and Home Trail contracts passed (ordering, identity, candidate safety, preference, loading, failure, focus, and responsive checks)');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
