'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const scale = 1024;
const fixedNow = Date.UTC(2030, 0, 15, 12, 0, 0);

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

runSingleItemRoundTrip();
runGroupRoundTrip();
runBatchTrashRoundTrip();
runMissingEntryNoOps();

console.log(`Archive scale contracts passed: single=${scale}, groupItems=${scale}, batch=${scale}, trash=${scale}`);
