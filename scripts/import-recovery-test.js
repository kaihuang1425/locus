'use strict';

const assert = require('node:assert/strict');
const {
  collectEntityIds,
  normalizeLegacy,
  normalizeForReplace,
  prepareMerge,
} = require('../import-utils.js');

const retentionMs = 30 * 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 6, 15);
let sequence = 0;
const makeId = () => `new-${++sequence}`;

const item = (id, type = 'tab') => type === 'tab'
  ? { id, type, title: id, url: `https://example.com/${id}` }
  : { id, type, items: [{ id: `${id}-child`, type: 'note', html: '<b>safe</b>' }] };

const existing = {
  workspaces: [{
    id: 'ws',
    activeCatId: 'cat',
    categories: [{
      id: 'cat',
      canvasPositions: { group: { x: 10, y: 20 } },
      groups: [{ id: 'group', items: [item('item'), item('stack', 'stack')] }],
    }],
  }],
  archive: [{ kind: 'item', data: item('archived-item') }],
  trash: [{ kind: 'group', data: { id: 'trashed-group', items: [item('trashed-item')] } }],
};

const incoming = {
  activeWsId: 'missing-workspace',
  settings: {
    captureDefaultCategoryId: 'missing-category',
    captureLastTarget: { workspaceId: 'missing', categoryId: 'missing', groupId: 'missing' },
    popupHibernateSelectedTabIds: [123],
  },
  workspaces: [{
    id: 'ws',
    activeCatId: 'missing-category',
    windowId: 999,
    categories: [{
      id: 'cat',
      canvasPositions: { group: { x: 40, y: 50 } },
      groups: [{ id: 'group', items: [item('item'), item('stack', 'stack')] }],
    }],
  }],
  columnWidths: { group: 444, stale: 999 },
  columnSizes: { group: { width: 444 }, stale: { width: 999 } },
  archive: [{
    kind: 'item',
    data: item('item'),
    wsId: 'ws',
    catId: 'cat',
    groupId: 'group',
    at: now - 1000,
  }],
  trash: [{
    kind: 'group',
    data: { id: 'group', items: [item('item')] },
    wsId: 'ws',
    catId: 'cat',
    trashedAt: now - retentionMs - 1000,
  }],
};

const prepared = prepareMerge(incoming, existing, { makeId, now, retentionMs });
assert.equal(prepared.workspaces.length, 1);
assert.equal(prepared.archive.length, 1, 'idless archive entries must merge');
assert.equal(prepared.trash.length, 1);

const mergedWorkspace = prepared.workspaces[0];
const mergedCategory = mergedWorkspace.categories[0];
const mergedGroup = mergedCategory.groups[0];
assert.notEqual(mergedWorkspace.id, 'ws');
assert.notEqual(mergedCategory.id, 'cat');
assert.notEqual(mergedGroup.id, 'group');
assert.equal(mergedWorkspace.activeCatId, mergedCategory.id);
assert.equal('windowId' in mergedWorkspace, false);
assert.deepEqual(Object.keys(mergedCategory.canvasPositions), [mergedGroup.id]);
assert.deepEqual(Object.keys(prepared.columnWidths), [mergedGroup.id]);
assert.deepEqual(Object.keys(prepared.columnSizes), [mergedGroup.id]);
assert.equal(prepared.archive[0].wsId, mergedWorkspace.id);
assert.equal(prepared.archive[0].catId, mergedCategory.id);
assert.equal(prepared.archive[0].groupId, mergedGroup.id);
assert.equal(prepared.trash[0].retentionStartedAt, now);

const allMergedIds = collectEntityIds({
  workspaces: prepared.workspaces,
  archive: prepared.archive,
  trash: prepared.trash,
});
const existingIds = collectEntityIds(existing);
for (const id of allMergedIds) assert.equal(existingIds.has(id), false, `collision survived for ${id}`);
assert.equal(allMergedIds.size, 9, 'every imported entity should have a unique id');

sequence = 100;
const replacement = normalizeForReplace(incoming, { makeId, now, retentionMs });
assert.equal(replacement.activeWsId, replacement.workspaces[0].id);
assert.equal(replacement.workspaces[0].activeCatId, replacement.workspaces[0].categories[0].id);
assert.equal('windowId' in replacement.workspaces[0], false);
assert.equal(replacement.settings.captureDefaultCategoryId, '');
assert.equal('captureLastTarget' in replacement.settings, false);
assert.deepEqual(replacement.settings.popupHibernateSelectedTabIds, []);
assert.deepEqual(Object.keys(replacement.columnWidths), ['group']);
assert.deepEqual(Object.keys(replacement.columnSizes), ['group']);
assert.equal(replacement.trash.length, 1);
assert.equal(replacement.trash[0].retentionStartedAt, now);

const replacementActiveIds = collectEntityIds({ workspaces: replacement.workspaces });
const replacementStoredIds = collectEntityIds({ archive: replacement.archive, trash: replacement.trash });
for (const id of replacementStoredIds) {
  assert.equal(replacementActiveIds.has(id), false, `stored payload id collides with active id ${id}`);
}

const legacy = normalizeLegacy({
  workspaces: [{
    name: 'Legacy workspace',
    groups: [{ name: 'Saved', items: [
      { title: 'Old tab', url: 'https://example.com/old' },
      { text: 'Old note' },
      { text: 'Old task', done: false },
      { name: 'Old stack', items: [{ text: 'Nested note' }] },
    ] }],
  }],
}, { makeId, schema: 'legacy' });
const legacyWorkspace = legacy.workspaces[0];
const legacyGroup = legacyWorkspace.categories[0].groups[0];
assert.equal(legacy.activeWsId, legacyWorkspace.id);
assert.equal(legacyWorkspace.activeCatId, legacyWorkspace.categories[0].id);
assert.deepEqual(legacyGroup.items.map(entry => entry.type), ['tab', 'note', 'todo', 'stack']);
assert.equal(legacyGroup.items[1].html, 'Old note');
assert.equal(legacyGroup.items[3].items[0].type, 'note');
assert.equal(collectEntityIds(legacy).size, 8, 'legacy entities receive unique ids');

console.log('Import recovery fixtures passed');
