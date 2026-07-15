'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const scale = 1024;
const fixedNow = Date.UTC(2030, 0, 15, 12, 0, 0);
const clone = value => JSON.parse(JSON.stringify(value));

class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [fixedNow]));
  }

  static now() {
    return fixedNow;
  }
}

function extractBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker} must be extractable`);
  return source.slice(start, end);
}

const stateStart = source.indexOf('const State = (() => {');
const stateEndMarker = '\n})();';
const stateEnd = source.indexOf(stateEndMarker, stateStart);
assert.ok(stateStart >= 0 && stateEnd > stateStart, 'State implementation must be extractable');
const stateSource = source.slice(stateStart, stateEnd + stateEndMarker.length);
const ordinaryFailureSource = extractBetween(
  'async function recoverAfterOrdinaryWriteFailure(error) {',
  '\n\nfunction handleObservedStoredState(stored)',
);
const storageErrorSource = extractBetween(
  'function handleStorageError(err) {',
  '\n\nfunction showStorageFull(msg) {',
);

const productionSources = [
  extractBetween('function findGroup(gId) {', '\n\n// ════════════════════════════════════════════════════════════════\n// HASH ROUTER'),
  extractBetween('function archiveItem(itemId) {', '\nfunction archiveRestoreDestination(entry) {'),
  extractBetween('function archiveRestoreDestination(entry) {', '\n\nfunction captureTabFields(tab) {'),
  extractBetween('function restoreArchiveEntries(entries) {', '\n\nfunction restoreArchive(idx) {'),
  extractBetween('function moveArchiveEntriesToTrash(entries) {', '\n\nfunction permanentlyDeleteTrashEntries(entries) {'),
  extractBetween('function getSelectedItemsInfo() {', '\n\nfunction openMoveTargetPicker(infos) {'),
].join('\n\n');

const exposeContract = `
this.archiveContract = {
  archiveItem,
  archiveGroup,
  restoreArchiveEntries,
  restoreTrashEntries,
  moveArchiveEntriesToTrash,
  runBatchAction,
};`;

function makeItem(prefix, index) {
  const id = `${prefix}-item-${index}`;
  switch (index % 4) {
    case 0:
      return { id, type: 'tab', title: `Tab ${index}`, url: `https://example.com/${prefix}/${index}` };
    case 1:
      return { id, type: 'note', html: `<p>Note ${index}</p>` };
    case 2:
      return { id, type: 'todo', text: `Task ${index}`, done: index % 8 === 2 };
    default:
      return {
        id,
        type: 'stack',
        name: `Stack ${index}`,
        items: [
          { id: `${id}-note`, type: 'note', html: `Nested ${index}` },
          { id: `${id}-tab`, type: 'tab', title: `Nested tab ${index}`, url: `https://example.com/${prefix}/${index}/nested` },
        ],
      };
  }
}

function makeState(prefix, groupCount = 16, itemsPerGroup = 64) {
  let itemIndex = 0;
  const workspaceId = `${prefix}-workspace`;
  const categoryId = `${prefix}-category`;
  const groups = Array.from({ length: groupCount }, (_, groupIndex) => ({
    id: `${prefix}-group-${groupIndex}`,
    name: `Group ${groupIndex}`,
    items: Array.from({ length: itemsPerGroup }, () => makeItem(prefix, itemIndex++)),
  }));
  assert.equal(itemIndex, scale, 'scale fixture must contain exactly 1,024 top-level items');
  return {
    activeWsId: workspaceId,
    workspaces: [{
      id: workspaceId,
      name: 'Workspace',
      activeCatId: categoryId,
      categories: [{ id: categoryId, name: 'Space', groups }],
    }],
    archive: [],
    trash: [],
    settings: {},
  };
}

function createHarness(state, selectedIds = []) {
  const selectedItemIds = new Set(selectedIds);
  const metrics = {
    snapshots: [],
    persists: 0,
    clears: 0,
    boardRenders: 0,
    archiveRenders: 0,
    navUpdates: 0,
    toasts: [],
  };
  let nextId = 0;
  const sandbox = {
    Date: FixedDate,
    State: {
      get: () => state,
      snapshot: label => metrics.snapshots.push(label),
      persist: () => { metrics.persists++; },
    },
    selectedItemIds,
    activeWs: () => state.workspaces.find(workspace => workspace.id === state.activeWsId),
    uid: () => `archive-scale-generated-${++nextId}`,
    clearItemSelection: () => {
      selectedItemIds.clear();
      metrics.clears++;
    },
    renderBoard: () => { metrics.boardRenders++; },
    renderArchiveList: () => { metrics.archiveRenders++; },
    updateNavChrome: () => { metrics.navUpdates++; },
    toast: message => metrics.toasts.push(message),
    tr: (key, vars) => vars?.count == null ? key : `${key}:${vars.count}`,
  };
  vm.runInNewContext(`${productionSources}\n${exposeContract}`, sandbox, {
    filename: 'newtab-archive-contract.js',
  });
  return { ...sandbox.archiveContract, selectedItemIds, metrics };
}

function persistedState(state, revision) {
  return {
    ...clone(state),
    schema: 12,
    _revision: revision,
    recentEmoji: [],
    columnWidths: {},
  };
}

function createPersistenceHarness(baseline, selectedIds = []) {
  const stored = { te: clone(baseline) };
  const selectedItemIds = new Set(selectedIds);
  const metrics = {
    writeAttempts: 0,
    storageFullMessages: [],
    recoveryMessages: [],
    toasts: [],
  };
  let nextId = 0;
  const chrome = {
    storage: {
      local: {
        async get() {
          return clone(stored);
        },
      },
    },
    runtime: {
      async sendMessage(message) {
        assert.equal(message?.type, 'locus-state-write');
        metrics.writeAttempts += 1;
        return {
          ok: false,
          code: 'LOCUS_STATE_WRITE_FAILED',
          message: 'QUOTA_BYTES quota exceeded.',
        };
      },
    },
  };
  const sandbox = {
    browserLanguage: () => 'en',
    chrome,
    clearTimeout,
    console,
    CURRENT_SCHEMA: 12,
    Date: FixedDate,
    ensureDefault() {},
    loadedSchema: 0,
    migrate() {},
    navigator: {},
    normalizeExpiredTrash() {},
    normalizeLoadedSettings() {},
    refreshStorageUsage() {},
    renderArchiveList() {},
    renderBoard() {},
    selectedItemIds,
    setTimeout,
    showStateRecoveryRequired(error) {
      metrics.recoveryMessages.push(String(error?.message || error || ''));
    },
    showStorageFull(message) {
      metrics.storageFullMessages.push(String(message || ''));
    },
    structuredClone,
    toast(message) {
      metrics.toasts.push(String(message || ''));
    },
    tr: (key, vars) => vars?.count == null ? key : `${key}:${vars.count}`,
    uid: () => `archive-quota-generated-${++nextId}`,
    updateNavChrome() {},
    clearItemSelection() {
      selectedItemIds.clear();
    },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(`${stateSource}\nglobalThis.__state = State;`, context, {
    filename: 'newtab-state.js',
  });
  vm.runInContext(
    `${storageErrorSource}\n${ordinaryFailureSource}\n${productionSources}\n${exposeContract}`,
    context,
    { filename: 'newtab-archive-quota-contract.js' },
  );

  async function waitForQuotaRecovery() {
    const deadline = Date.now() + 1500;
    while (!context.__state.isRecoveryRequired() && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(context.__state.isRecoveryRequired(), true, 'quota rejection must require authoritative recovery');
  }

  return {
    State: context.__state,
    archiveContract: context.archiveContract,
    metrics,
    storedState: () => clone(stored.te),
    waitForQuotaRecovery,
  };
}

function topLevelItemIds(state) {
  const ids = [];
  for (const workspace of state.workspaces) {
    for (const category of workspace.categories) {
      for (const group of category.groups) {
        for (const item of group.items) ids.push(item.id);
      }
    }
  }
  return ids;
}

function activeTopLevelCount(state) {
  return state.workspaces.reduce((workspaceTotal, workspace) => workspaceTotal +
    workspace.categories.reduce((categoryTotal, category) => categoryTotal +
      category.groups.reduce((groupTotal, group) => groupTotal + group.items.length, 0), 0), 0);
}

function activeGroupCount(state) {
  return state.workspaces.reduce((workspaceTotal, workspace) => workspaceTotal +
    workspace.categories.reduce((categoryTotal, category) => categoryTotal + category.groups.length, 0), 0);
}

function allEntityIds(state) {
  const ids = [];
  const visitItem = item => {
    ids.push(item.id);
    if (item.type === 'stack' && Array.isArray(item.items)) item.items.forEach(visitItem);
  };
  const visitGroup = group => {
    ids.push(group.id);
    group.items.forEach(visitItem);
  };
  for (const workspace of state.workspaces) {
    ids.push(workspace.id);
    for (const category of workspace.categories) {
      ids.push(category.id);
      category.groups.forEach(visitGroup);
    }
  }
  for (const collection of [state.archive, state.trash]) {
    for (const entry of collection) {
      if (entry.kind === 'group') visitGroup(entry.data);
      else visitItem(entry.data);
    }
  }
  return ids.sort();
}

function canonicalWorkspaces(state) {
  const byId = (a, b) => a.id.localeCompare(b.id);
  const canonicalItem = item => {
    const copy = { ...item };
    if (Array.isArray(copy.items)) copy.items = copy.items.map(canonicalItem).sort(byId);
    return copy;
  };
  const workspaces = state.workspaces.map(workspace => ({
    ...workspace,
    categories: workspace.categories.map(category => ({
      ...category,
      groups: category.groups.map(group => ({
        ...group,
        items: group.items.map(canonicalItem).sort(byId),
      })).sort(byId),
    })).sort(byId),
  })).sort(byId);
  return JSON.stringify(workspaces);
}

function assertIdentityPreserved(state, expectedIds, label) {
  const actualIds = allEntityIds(state);
  assert.deepEqual(actualIds, expectedIds, `${label} must preserve every entity id exactly once`);
  assert.equal(new Set(actualIds).size, actualIds.length, `${label} must not duplicate an entity id`);
}

function runSingleItemRoundTrip() {
  const state = makeState('single');
  const initialGraph = canonicalWorkspaces(state);
  const initialIds = allEntityIds(state);
  const itemIds = topLevelItemIds(state);
  const contract = createHarness(state);

  itemIds.forEach(contract.archiveItem);
  assert.equal(state.archive.length, scale);
  assert.ok(state.archive.every(entry => entry.kind === 'item'));
  assert.equal(activeTopLevelCount(state), 0);
  assertIdentityPreserved(state, initialIds, 'single-item archive');
  assert.equal(contract.metrics.snapshots.length, scale);
  assert.equal(contract.metrics.persists, scale);

  contract.restoreArchiveEntries([...state.archive]);
  assert.equal(state.archive.length, 0);
  assert.equal(activeTopLevelCount(state), scale);
  assert.equal(canonicalWorkspaces(state), initialGraph, 'single-item restore must reproduce the canonical graph');
  assertIdentityPreserved(state, initialIds, 'single-item restore');
  assert.equal(contract.metrics.persists, scale + 1);
}

function runGroupRoundTrip() {
  const state = makeState('group');
  const initialGraph = canonicalWorkspaces(state);
  const initialIds = allEntityIds(state);
  const groupIds = state.workspaces[0].categories[0].groups.map(group => group.id);
  const contract = createHarness(state);

  groupIds.forEach(contract.archiveGroup);
  assert.equal(state.archive.length, groupIds.length);
  assert.ok(state.archive.every(entry => entry.kind === 'group'));
  assert.equal(activeGroupCount(state), 0);
  assert.equal(activeTopLevelCount(state), 0);
  assertIdentityPreserved(state, initialIds, 'whole-group archive');

  contract.restoreArchiveEntries([...state.archive]);
  assert.equal(state.archive.length, 0);
  assert.equal(activeGroupCount(state), groupIds.length);
  assert.equal(activeTopLevelCount(state), scale);
  assert.equal(canonicalWorkspaces(state), initialGraph, 'whole-group restore must reproduce the canonical graph');
  assertIdentityPreserved(state, initialIds, 'whole-group restore');
}

function runBatchTrashRoundTrip() {
  const state = makeState('batch');
  const initialGraph = canonicalWorkspaces(state);
  const initialIds = allEntityIds(state);
  const itemIds = topLevelItemIds(state);
  const contract = createHarness(state, itemIds);

  contract.runBatchAction('archive');
  assert.equal(state.archive.length, scale);
  assert.equal(activeTopLevelCount(state), 0);
  assert.equal(contract.selectedItemIds.size, 0);
  assert.deepEqual(contract.metrics.snapshots, [`Archive ${scale} items`]);
  assert.equal(contract.metrics.persists, 1);
  assertIdentityPreserved(state, initialIds, 'batch archive');

  contract.moveArchiveEntriesToTrash([...state.archive]);
  assert.equal(state.archive.length, 0);
  assert.equal(state.trash.length, scale);
  assert.ok(state.trash.every(entry => entry.trashedAt === fixedNow));
  assertIdentityPreserved(state, initialIds, 'batch Archive to Trash');

  contract.restoreTrashEntries([...state.trash]);
  assert.equal(state.trash.length, 0);
  assert.equal(activeTopLevelCount(state), scale);
  assert.equal(canonicalWorkspaces(state), initialGraph, 'Trash restore must reproduce the canonical graph');
  assertIdentityPreserved(state, initialIds, 'batch Trash restore');
  assert.equal(contract.metrics.persists, 3);
}

function runMissingEntryNoOps() {
  const state = makeState('missing');
  const before = JSON.stringify(state);
  const contract = createHarness(state, ['missing-item']);
  const foreignEntry = { kind: 'item', data: makeItem('foreign', 0) };

  contract.archiveItem('missing-item');
  contract.archiveGroup('missing-group');
  contract.runBatchAction('archive');
  contract.moveArchiveEntriesToTrash([foreignEntry]);
  contract.restoreArchiveEntries([foreignEntry]);

  assert.equal(JSON.stringify(state), before, 'missing and foreign entries must not mutate state');
  assert.equal(contract.metrics.snapshots.length, 0);
  assert.equal(contract.metrics.persists, 0);
}

async function runQuotaRejectedBatchArchive() {
  const baseline = persistedState(makeState('quota-archive'), 30);
  const initialIds = allEntityIds(baseline);
  const initialGraph = canonicalWorkspaces(baseline);
  const itemIds = topLevelItemIds(baseline);
  const harness = createPersistenceHarness(baseline, itemIds);

  await harness.State.load();
  harness.archiveContract.runBatchAction('archive');
  await harness.waitForQuotaRecovery();

  const local = harness.State.get();
  assert.equal(activeTopLevelCount(local), 0);
  assert.equal(local.archive.length, scale);
  assertIdentityPreserved(local, initialIds, 'quota-rejected batch archive local graph');
  assert.deepEqual(harness.storedState(), baseline, 'quota rejection must not change the authoritative active graph');
  assert.equal(harness.State.needsPersistence(), true, 'the unconfirmed archive must stay visibly dirty');
  assert.equal(harness.metrics.writeAttempts, 1);
  assert.equal(harness.metrics.storageFullMessages.length, 1, 'quota rejection must route to storage-full feedback');
  assert.match(harness.metrics.storageFullMessages[0], /quota/i);
  assert.equal(harness.metrics.recoveryMessages.length, 1, 'quota rejection must show the reload interlock');

  await harness.State.load();
  assert.equal(activeTopLevelCount(harness.State.get()), scale);
  assert.equal(harness.State.get().archive.length, 0);
  assert.equal(canonicalWorkspaces(harness.State.get()), initialGraph);
  assertIdentityPreserved(harness.State.get(), initialIds, 'quota-rejected batch archive recovery');
  assert.equal(harness.State.isClean(), true);
}

async function runQuotaRejectedArchiveToTrash() {
  const baseline = persistedState(makeState('quota-trash'), 40);
  const initialIds = allEntityIds(baseline);
  const itemIds = topLevelItemIds(baseline);
  createHarness(baseline, itemIds).runBatchAction('archive');
  assert.equal(baseline.archive.length, scale, 'Trash quota fixture must begin with every item authoritatively archived');
  const authoritativeArchive = clone(baseline.archive);
  const harness = createPersistenceHarness(baseline);

  await harness.State.load();
  harness.archiveContract.moveArchiveEntriesToTrash([...harness.State.get().archive]);
  await harness.waitForQuotaRecovery();

  const local = harness.State.get();
  assert.equal(local.archive.length, 0);
  assert.equal(local.trash.length, scale);
  assertIdentityPreserved(local, initialIds, 'quota-rejected Archive-to-Trash local graph');
  assert.deepEqual(harness.storedState(), clone(baseline), 'quota rejection must keep the authoritative Archive graph');
  assert.equal(harness.State.needsPersistence(), true, 'the unconfirmed Trash move must stay visibly dirty');
  assert.equal(harness.metrics.writeAttempts, 1);
  assert.equal(harness.metrics.storageFullMessages.length, 1, 'Trash quota rejection must route to storage-full feedback');
  assert.match(harness.metrics.storageFullMessages[0], /quota/i);
  assert.equal(harness.metrics.recoveryMessages.length, 1, 'Trash quota rejection must show the reload interlock');

  await harness.State.load();
  assert.equal(harness.State.get().archive.length, scale);
  assert.equal(harness.State.get().trash.length, 0);
  assert.deepEqual(clone(harness.State.get().archive), authoritativeArchive);
  assertIdentityPreserved(harness.State.get(), initialIds, 'quota-rejected Archive-to-Trash recovery');
  assert.equal(harness.State.isClean(), true);
}

(async () => {
  runSingleItemRoundTrip();
  runGroupRoundTrip();
  runBatchTrashRoundTrip();
  runMissingEntryNoOps();
  await runQuotaRejectedBatchArchive();
  await runQuotaRejectedArchiveToTrash();

  console.log(`Archive scale contracts passed: single=${scale}, groupItems=${scale}, batch=${scale}, trash=${scale}, quotaRecovery=2`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
