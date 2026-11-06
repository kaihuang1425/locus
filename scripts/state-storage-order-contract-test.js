'use strict';

// Chromium returns every chrome.storage object with its keys in sorted order,
// while a graph the new tab builds or extends in memory keeps insertion order.
// This suite models that round trip and races a page's own storage.onChanged
// echo against its write receipt, the way a fresh profile's first new tab does.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const LocusImportUtils = require('../import-utils.js');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const currentSchemaMatch = source.match(/const CURRENT_SCHEMA = (\d+);/);
assert.ok(currentSchemaMatch, 'CURRENT_SCHEMA must be extractable');
const currentSchema = Number(currentSchemaMatch[1]);

function extractBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker} must be extractable`);
  return source.slice(start, end);
}

const stateSource = extractBetween('const State = (() => {', '\n})();') + '\n})();';
const migrateSource = extractBetween('function isStableEntityReminderId(value) {', '\nconst STORAGE_QUOTA');
const ensureDefaultSource = extractBetween('function ensureDefault() {', '\nconst THEMES = [');
const organizationIdAllocatorSource = extractBetween('function createOrganizationIdAllocator() {', '\nfunction organizationGroupMoveOptions(');
const trashSource = extractBetween('function normalizeExpiredTrash(', '\n\nfunction archiveItem(');
const ensureOnboardingSource = extractBetween('function ensureOnboarding(settings) {', '\n\n//');
const normalizeLoadedSource = extractBetween('function normalizeLoadedSettings() {', '\n\nfunction initAfterLoad()');
const setViewModeSource = extractBetween('function setViewMode(mode) {', '\n}\n') + '\n}\n';
const initAfterLoadSource = extractBetween('function initAfterLoad() {', '\n}\n');

const sortKeysDeep = value => {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeysDeep(value[key])]));
};
// What chrome.storage.local.get() and storage.onChanged hand back to a page.
const storageRoundTrip = value => value === undefined ? undefined : sortKeysDeep(JSON.parse(JSON.stringify(value)));
const isSortedKeys = object => {
  const keys = Object.keys(object);
  return keys.join('\n') === [...keys].sort().join('\n');
};

let stored = {};
let writeCalls = 0;
let echoOrder = 'echo-first';
let nextId = 1;
const dispositions = [];
const recoveryOverlayErrors = [];
let storageErrorCalls = 0;
let State;

function deliverEcho(te) {
  dispositions.push(State.observeStoredState(storageRoundTrip(te)));
}

const chrome = {
  storage: {
    local: {
      async get() {
        return { ...(stored.te === undefined ? {} : { te: storageRoundTrip(stored.te) }) };
      },
    },
  },
  runtime: {
    // Mirrors background.js setState(): revision compare-and-set, then the
    // storage write whose onChanged echo races the runtime receipt.
    async sendMessage(message) {
      assert.equal(message?.type, 'locus-state-write');
      writeCalls += 1;
      const candidate = JSON.parse(JSON.stringify(message.state));
      const localRevision = Number(candidate._revision);
      const remoteRevision = Number(stored.te?._revision ?? 0);
      if (localRevision !== remoteRevision) {
        return { ok: false, code: 'LOCUS_STATE_CONFLICT', message: 'Locus changed in another window. Retry the action.' };
      }
      candidate._revision = localRevision + 1;
      stored = { te: storageRoundTrip(candidate) };
      const echo = stored.te;
      if (echoOrder === 'echo-first') deliverEcho(echo);
      else setTimeout(() => deliverEcho(echo), 0);
      return { ok: true, revision: candidate._revision };
    },
  },
};

const context = vm.createContext({
  browserLanguage: () => 'en',
  chrome,
  clearTimeout,
  console,
  CURRENT_SCHEMA: currentSchema,
  LOCUS_STATE_RECEIVER_RETRY_MS: 5,
  LOCUS_STATE_WRITE_TIMEOUT_MS: 200,
  LocusImportUtils,
  THEMES: [{ id: 'folio' }, { id: 'folio-dark' }],
  esc: value => String(value ?? ''),
  handleStorageError() { storageErrorCalls += 1; },
  loadedSchema: 0,
  normalizeLanguage: value => /^zh/i.test(String(value || '')) ? 'zh-TW' : 'en',
  normalizeThemeId: value => ({ stow: 'folio', 'stow-dark': 'folio-dark' })[value] || value,
  navigator: {},
  recoverAfterOrdinaryWriteFailure(error) { recoveryOverlayErrors.push(error); },
  refreshStorageUsage() {},
  Router: { init() {}, sync() {} },
  setTimeout,
  showStateRecoveryRequired(error) { recoveryOverlayErrors.push(error); },
  structuredClone,
  TRASH_RETENTION_MS: 30 * 24 * 60 * 60 * 1000,
  trashTimestamp: entry => Number(entry?.retentionStartedAt || entry?.trashedAt || entry?.at) || 0,
  uid: () => `id${String(nextId++).padStart(4, '0')}`,
  LAYOUTS: { board: {}, list: {} },
  document: { body: { dataset: {} } },
  renderBoard() {},
  activeCat() {
    const state = context.__state.get();
    const workspace = state.workspaces.find(candidate => candidate.id === state.activeWsId);
    return workspace?.categories.find(category => category.id === workspace.activeCatId) || null;
  },
});

vm.runInContext(`${stateSource}\nglobalThis.__state = State;`, context, { filename: 'newtab-state.js' });
vm.runInContext(
  `${migrateSource}\n${organizationIdAllocatorSource}\n${ensureDefaultSource}\n${trashSource}\n${ensureOnboardingSource}\n${normalizeLoadedSource}\n${setViewModeSource}\n`
    + 'globalThis.__normalizeLoadedState = normalizeLoadedState;\nglobalThis.__setViewMode = setViewMode;\n'
    + "globalThis.__persistBootChanges = typeof persistBootChanges === 'function' ? persistBootChanges : null;",
  context,
  { filename: 'newtab-boot.js' },
);
State = context.__state;
const normalizeLoadedState = context.__normalizeLoadedState;
const setViewMode = context.__setViewMode;
const persistBootChanges = context.__persistBootChanges;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function resetObservations() {
  dispositions.length = 0;
  recoveryOverlayErrors.length = 0;
  storageErrorCalls = 0;
}

function assertNoRecovery(label) {
  assert.equal(State.isRecoveryRequired(), false, `${label}: the page must not require recovery`);
  assert.deepEqual(recoveryOverlayErrors.map(error => error?.message), [], `${label}: no recovery overlay`);
  assert.equal(storageErrorCalls, 0, `${label}: no storage-error toast`);
}

// The first new tab in an empty profile: boot creates the default graph in
// insertion order, then the reminder-identity migration path writes at once.
async function firstRun(order) {
  stored = {};
  echoOrder = order;
  resetObservations();
  await State.load();
  assert.equal(normalizeLoadedState(), true, 'an empty profile must persist its default graph');
  const workspace = State.get().workspaces[0];
  assert.ok(workspace && !isSortedKeys(workspace),
    'precondition: the default Workspace is built in insertion order, unlike its storage echo');
  const writesBefore = writeCalls;
  const response = await State.persistNow({ recordMutation: false });
  assert.equal(response?.ok, true);
  await wait(10);
  assert.equal(writeCalls, writesBefore + 1);
  assert.equal(stored.te._revision, 1);
  assert.equal(State.get()._revision, 1);
  return { workspaceKeys: Object.keys(stored.te.workspaces[0]) };
}

(async () => {
  // 1. Echo before receipt: storage.onChanged reports the page's own write with
  //    sorted keys while the write is still pending. It is the page's own graph.
  const firstEcho = await firstRun('echo-first');
  assert.deepEqual(dispositions, ['self'], 'the sorted echo of a pending own write must be recognized as self');
  assertNoRecovery('first run, echo before receipt');
  assert.equal(State.isClean(), true, 'a confirmed first-run graph is clean');
  assert.ok(isSortedKeys(stored.te.workspaces[0]) && firstEcho.workspaceKeys.includes('activeCatId'));

  // 2. Receipt before echo: the confirmed graph and its sorted echo share a
  //    revision and content, so the echo is ignored rather than a conflict.
  await firstRun('receipt-first');
  assert.deepEqual(dispositions, ['ignored'], 'the equal-revision sorted echo of a confirmed own write must be ignored');
  assertNoRecovery('first run, receipt before echo');

  // 3. Second open of the same profile: the boot layout pass appends
  //    `category.layout` to a category that storage returned sorted.
  echoOrder = 'echo-first';
  resetObservations();
  await State.load();
  const writesAtSecondBoot = writeCalls;
  assert.equal(normalizeLoadedState(), false, 'a stored current graph must not need a boot write');
  assert.equal(State.needsPersistence(), false);
  const category = context.activeCat();
  assert.equal(category.layout, undefined, 'precondition: the first write had no stored layout');
  setViewMode('board');
  assert.equal(isSortedKeys(category), false, 'precondition: layout is appended out of sorted order');
  await wait(260);
  assert.equal(writeCalls, writesAtSecondBoot + 1, 'a real layout change persists once');
  assert.deepEqual(dispositions, ['self'], 'the echo of the layout write must be recognized as self');
  assertNoRecovery('second open, boot layout write');
  assert.equal(stored.te.workspaces[0].categories.find(candidate => candidate.id === category.id).layout, 'board');

  // 4. Every later open re-applies the saved layout. That must not write.
  resetObservations();
  await State.load();
  const writesAtThirdBoot = writeCalls;
  const revisionAtThirdBoot = stored.te._revision;
  assert.equal(normalizeLoadedState(), false);
  setViewMode(context.activeCat().layout);
  assert.equal(persistBootChanges(), false, 'a boot that changed nothing has nothing to save');
  await wait(260);
  assert.equal(writeCalls, writesAtThirdBoot, 'opening a new tab must not manufacture a revision');
  assert.equal(stored.te._revision, revisionAtThirdBoot);
  assert.deepEqual(dispositions, []);
  assertNoRecovery('third open');

  // 4b. The layout is already stored, but the first render creates an
  //     on-demand slice (as the Pomodoro and floating-widget getters do). The
  //     boot-end check saves it once, so the page does not stay dirty.
  assert.match(initAfterLoadSource, /\n  renderAll\(\);\n  persistBootChanges\(\);\n/,
    'boot must save render-created slices once, right after the first render');
  resetObservations();
  await State.load();
  const writesAtSliceBoot = writeCalls;
  assert.equal(normalizeLoadedState(), false);
  setViewMode(context.activeCat().layout);
  State.get().pomo = { running: false, mode: 'work', remaining: 1500 };
  assert.equal(persistBootChanges(), true, 'a render-created slice must be saved');
  await wait(260);
  assert.equal(writeCalls, writesAtSliceBoot + 1);
  assert.deepEqual(dispositions, ['self']);
  assertNoRecovery('render-created slice');
  assert.equal(State.isClean(), true, 'the page must not stay dirty after boot');
  assert.deepEqual(stored.te.pomo, { mode: 'work', remaining: 1500, running: false });

  // 5. Key order alone is not dirtiness.
  const onboarding = State.get().settings.onboarding;
  State.get().settings.onboarding = Object.fromEntries(Object.entries(onboarding).reverse());
  assert.notEqual(Object.keys(State.get().settings.onboarding).join(), Object.keys(onboarding).join());
  assert.equal(State.needsPersistence(), false, 'a reordered but identical graph is not dirty');
  assert.equal(State.isClean(), true);

  // 6. Fail-closed boundaries stay intact for real foreign graphs.
  const foreign = JSON.parse(JSON.stringify(stored.te));
  foreign.workspaces[0].name = 'Renamed in another window';
  resetObservations();
  assert.equal(State.observeStoredState(storageRoundTrip(foreign)), 'recovery',
    'different content at the confirmed revision is still a protocol conflict');
  assert.equal(State.isRecoveryRequired(), true);

  resetObservations();
  await State.load();
  const newer = { ...JSON.parse(JSON.stringify(stored.te)), _revision: stored.te._revision + 1 };
  newer.workspaces[0].name = 'Renamed in another window';
  assert.equal(State.observeStoredState(storageRoundTrip(newer)), 'adopted',
    'a clean page still adopts a newer foreign graph');
  assert.equal(State.get().workspaces[0].name, 'Renamed in another window');

  resetObservations();
  await State.load();
  State.get().workspaces[0].name = 'Unsaved local edit';
  State.persist();
  const newest = { ...JSON.parse(JSON.stringify(stored.te)), _revision: stored.te._revision + 1 };
  newest.workspaces[0].name = 'Renamed elsewhere again';
  assert.equal(State.observeStoredState(storageRoundTrip(newest)), 'recovery',
    'a dirty page still refuses a newer foreign graph');
  assert.equal(State.isRecoveryRequired(), true);

  // 7. An own `__proto__` key (JSON.parse keeps it as data, as imports and
  //    storage can) stays part of the compared content.
  const protoState = JSON.parse(JSON.stringify(stored.te));
  protoState.settings = JSON.parse(JSON.stringify(protoState.settings).replace(/^\{/, '{"__proto__":{"note":"a"},'));
  stored = { te: storageRoundTrip(protoState) };
  resetObservations();
  await State.load();
  const protoValue = Object.getOwnPropertyDescriptor(State.get().settings, '__proto__')?.value;
  assert.deepEqual(protoValue, { note: 'a' }, 'precondition: the loaded graph keeps an own __proto__ key');
  assert.equal(State.needsPersistence(), false);
  protoValue.note = 'b';
  assert.equal(State.needsPersistence(), true, 'a change inside an own __proto__ key is a real change');

  console.log('state storage-order contract: 8 scenarios passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
