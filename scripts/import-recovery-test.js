'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  collectEntityIds,
  normalizeLegacy,
  normalizeForReplace,
  prepareMerge,
} = require('../import-utils.js');

const root = path.resolve(__dirname, '..');
const newtabSource = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const currentSchemaMatch = newtabSource.match(/const CURRENT_SCHEMA = (\d+);/);
const validatorStart = newtabSource.indexOf('const MAX_IMPORT_NODES = ');
const validatorEnd = newtabSource.indexOf('\n\nfunction sanitizeImportedRichText', validatorStart);
assert.ok(currentSchemaMatch, 'CURRENT_SCHEMA must be extractable');
assert.ok(validatorStart >= 0 && validatorEnd > validatorStart, 'import validator must be extractable');

const currentSchema = Number(currentSchemaMatch[1]);
const validatorSandbox = { CURRENT_SCHEMA: currentSchema, URL };
vm.runInNewContext(
  `${newtabSource.slice(validatorStart, validatorEnd)}\nthis.validateImportData = validateImportData;`,
  validatorSandbox,
  { filename: 'newtab-import-validator.js' },
);
const { validateImportData } = validatorSandbox;

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
      reminders: [
        { at: now + 1000, notified: false },
        { id: 'category-reminder', at: now + 2000, notified: false },
        { id: 'category-reminder', at: now + 3000, notified: false },
      ],
      groups: [{
        id: 'group',
        reminders: [{ at: now + 4000, notified: false }],
        items: [item('item'), item('stack', 'stack')],
      }],
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
    data: { id: 'group', reminders: [{ at: now + 5000, notified: false }], items: [item('item')] },
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
for (const [label, entity] of [
  ['merged category', mergedCategory],
  ['merged group', mergedGroup],
  ['merged trashed group', prepared.trash[0].data],
]) {
  const ids = (entity.reminders || []).map(reminder => reminder.id);
  assert.equal(ids.every(id => typeof id === 'string' && id.length > 0), true, `${label} reminders must receive ids`);
  assert.equal(new Set(ids).size, ids.length, `${label} reminder ids must be unique`);
}

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

function makeValidImport(suffix = 'base') {
  return {
    schema: currentSchema,
    activeWsId: `ws-${suffix}`,
    settings: {},
    workspaces: [{
      id: `ws-${suffix}`,
      activeCatId: `cat-${suffix}`,
      categories: [{
        id: `cat-${suffix}`,
        reminders: [{ id: `cat-reminder-${suffix}`, at: now + 1000, notified: false }],
        groups: [{
          id: `group-${suffix}`,
          reminders: [{ id: `group-reminder-${suffix}`, at: now + 2000, notified: false }],
          items: [
            { id: `tab-${suffix}`, type: 'tab', title: 'Safe tab', url: `https://example.com/${suffix}` },
            { id: `note-${suffix}`, type: 'note', html: '<b>safe</b>' },
            { id: `todo-${suffix}`, type: 'todo', text: 'Safe task', done: false },
            {
              id: `stack-${suffix}`,
              type: 'stack',
              items: [{ id: `nested-${suffix}`, type: 'note', html: 'Nested' }],
            },
          ],
        }],
      }],
    }],
    archive: [{
      kind: 'item',
      data: { id: `archive-${suffix}`, type: 'tab', title: 'Archived', url: 'file:///safe.html' },
    }],
    trash: [{
      kind: 'group',
      data: {
        id: `trash-${suffix}`,
        reminders: [{ id: `trash-reminder-${suffix}`, at: now + 3000, notified: false }],
        items: [],
      },
    }],
  };
}

function expectImportRejection(label, data, message, schema = currentSchema) {
  assert.throws(
    () => validateImportData(data, schema),
    message,
    `${label} must be rejected before import mutation`,
  );
}

const validImport = makeValidImport();
const validSnapshot = JSON.stringify(validImport);
validateImportData(validImport, currentSchema);
assert.equal(JSON.stringify(validImport), validSnapshot, 'validation must not mutate an accepted backup');

const schema11Reminders = makeValidImport('schema-11-reminders');
delete schema11Reminders.workspaces[0].categories[0].reminders[0].id;
delete schema11Reminders.workspaces[0].categories[0].groups[0].reminders[0].id;
delete schema11Reminders.trash[0].data.reminders[0].id;
validateImportData(schema11Reminders, 11);

expectImportRejection('future schema', makeValidImport(), /newer schema/, currentSchema + 1);
expectImportRejection('array root', [], /at least one workspace/);
expectImportRejection('empty workspace list', { workspaces: [] }, /at least one workspace/);

const badSettings = makeValidImport('bad-settings');
badSettings.settings = [];
expectImportRejection('array settings', badSettings, /settings must be an object/);

const badArchive = makeValidImport('bad-archive');
badArchive.archive = {};
expectImportRejection('object archive', badArchive, /archive must be an array/);

const badTrash = makeValidImport('bad-trash');
badTrash.trash = {};
expectImportRejection('object trash', badTrash, /trash must be an array/);

const unsafeKey = makeValidImport('unsafe-key');
Object.defineProperty(unsafeKey.settings, '__proto__', {
  value: { polluted: true }, enumerable: true, configurable: true, writable: true,
});
expectImportRejection('prototype-pollution key', unsafeKey, /contains unsafe key "__proto__"/);

const oversizedText = makeValidImport('oversized-text');
oversizedText.settings.note = 'x'.repeat((1024 * 1024) + 1);
expectImportRejection('oversized string', oversizedText, /oversized text value/);

const excessiveDepth = makeValidImport('excessive-depth');
let deepValue = 'leaf';
for (let depth = 0; depth < 31; depth++) deepValue = { child: deepValue };
excessiveDepth.settings.deep = deepValue;
expectImportRejection('excessive object depth', excessiveDepth, /nested too deeply/);

const excessiveNodes = makeValidImport('excessive-nodes');
excessiveNodes.settings.values = new Array(120000).fill(null);
expectImportRejection('excessive node count', excessiveNodes, /too many values/);

const missingWorkspaceId = makeValidImport('missing-workspace-id');
missingWorkspaceId.workspaces[0].id = '';
expectImportRejection('missing workspace id', missingWorkspaceId, /invalid id/);

const duplicateCategoryId = makeValidImport('duplicate-category-id');
duplicateCategoryId.workspaces[0].categories[0].id = duplicateCategoryId.workspaces[0].id;
expectImportRejection('duplicate category id', duplicateCategoryId, /reuses id/);

const oversizedGroupId = makeValidImport('oversized-group-id');
oversizedGroupId.workspaces[0].categories[0].groups[0].id = 'g'.repeat(201);
expectImportRejection('oversized group id', oversizedGroupId, /invalid id/);

const duplicateItemId = makeValidImport('duplicate-item-id');
duplicateItemId.workspaces[0].categories[0].groups[0].items[1].id =
  duplicateItemId.workspaces[0].categories[0].groups[0].items[0].id;
expectImportRejection('duplicate item id', duplicateItemId, /reuses id/);

const invalidWorkspaceRecord = makeValidImport('invalid-workspace-record');
invalidWorkspaceRecord.workspaces[0] = null;
expectImportRejection('non-object workspace', invalidWorkspaceRecord, /must be an object/);

const missingCategories = makeValidImport('missing-categories');
missingCategories.workspaces[0].categories = [];
expectImportRejection('empty categories', missingCategories, /at least one category/);

const invalidGroups = makeValidImport('invalid-groups');
invalidGroups.workspaces[0].categories[0].groups = {};
expectImportRejection('non-array groups', invalidGroups, /groups must be an array/);

const invalidGroupRecord = makeValidImport('invalid-group-record');
invalidGroupRecord.workspaces[0].categories[0].groups[0] = [];
expectImportRejection('non-object group', invalidGroupRecord, /must be an object/);

const invalidItems = makeValidImport('invalid-items');
invalidItems.workspaces[0].categories[0].groups[0].items = {};
expectImportRejection('non-array items', invalidItems, /items must be an array/);

const invalidReminders = makeValidImport('invalid-reminders');
invalidReminders.workspaces[0].categories[0].reminders = {};
expectImportRejection('non-array reminders', invalidReminders, /reminders must be an array/);

const invalidReminderRecord = makeValidImport('invalid-reminder-record');
invalidReminderRecord.workspaces[0].categories[0].groups[0].reminders[0] = null;
expectImportRejection('non-object reminder', invalidReminderRecord, /must be an object/);

const missingReminderId = makeValidImport('missing-reminder-id');
delete missingReminderId.workspaces[0].categories[0].reminders[0].id;
expectImportRejection('missing current-schema reminder id', missingReminderId, /invalid id/);

const duplicateReminderId = makeValidImport('duplicate-reminder-id');
duplicateReminderId.workspaces[0].categories[0].reminders.push({
  ...duplicateReminderId.workspaces[0].categories[0].reminders[0],
  at: now + 4000,
});
expectImportRejection('duplicate current-schema reminder id', duplicateReminderId, /reuses id/);

const invalidItemRecord = makeValidImport('invalid-item-record');
invalidItemRecord.workspaces[0].categories[0].groups[0].items[0] = null;
expectImportRejection('non-object item', invalidItemRecord, /must be an object/);

const unsupportedItem = makeValidImport('unsupported-item');
unsupportedItem.workspaces[0].categories[0].groups[0].items[0].type = 'bookmark';
expectImportRejection('unsupported item type', unsupportedItem, /unsupported type/);

const missingUrl = makeValidImport('missing-url');
delete missingUrl.workspaces[0].categories[0].groups[0].items[0].url;
expectImportRejection('missing tab URL', missingUrl, /missing its URL/);

const unsupportedUrl = makeValidImport('unsupported-url');
unsupportedUrl.workspaces[0].categories[0].groups[0].items[0].url = 'javascript:alert(1)';
expectImportRejection('unsupported URL scheme', unsupportedUrl, /unsupported URL scheme/);

const malformedUrl = makeValidImport('malformed-url');
malformedUrl.workspaces[0].categories[0].groups[0].items[0].url = 'not a URL';
expectImportRejection('malformed URL', malformedUrl, /invalid URL/);

const invalidStackItems = makeValidImport('invalid-stack-items');
invalidStackItems.workspaces[0].categories[0].groups[0].items[3].items = {};
expectImportRejection('non-array stack items', invalidStackItems, /items must be an array/);

const deepStack = makeValidImport('deep-stack');
let nestedItem = { id: 'deep-leaf', type: 'note', html: 'Leaf' };
for (let depth = 12; depth >= 0; depth--) {
  nestedItem = { id: `deep-stack-${depth}`, type: 'stack', items: [nestedItem] };
}
deepStack.workspaces[0].categories[0].groups[0].items = [nestedItem];
expectImportRejection('excessive nested stack', deepStack, /nested too deeply/);

const corruptArchiveEntry = makeValidImport('corrupt-archive-entry');
corruptArchiveEntry.archive[0].kind = 'workspace';
expectImportRejection('unknown archive entry kind', corruptArchiveEntry, /not a valid archived entry/);

const duplicateArchivePayloadId = makeValidImport('duplicate-archive-payload-id');
duplicateArchivePayloadId.archive[0] = {
  kind: 'group',
  data: { id: 'archive-duplicate', items: [{ id: 'archive-duplicate', type: 'note', html: 'Duplicate' }] },
};
expectImportRejection('duplicate archive payload id', duplicateArchivePayloadId, /reuses id/);

const corruptTrashPayload = makeValidImport('corrupt-trash-payload');
corruptTrashPayload.trash[0].data = [];
expectImportRejection('non-object trash payload', corruptTrashPayload, /not a valid archived entry/);

let fuzzSeed = 0x5eed1234;
const nextFuzz = () => {
  fuzzSeed ^= fuzzSeed << 13;
  fuzzSeed ^= fuzzSeed >>> 17;
  fuzzSeed ^= fuzzSeed << 5;
  return fuzzSeed >>> 0;
};
const fuzzMutators = [
  (data, random) => {
    const targets = [
      data.workspaces[0],
      data.workspaces[0].categories[0],
      data.workspaces[0].categories[0].groups[0],
      data.workspaces[0].categories[0].groups[0].items[random % 4],
    ];
    const invalidIds = ['', null, random, 'i'.repeat(201)];
    targets[random % targets.length].id = invalidIds[(random >>> 4) % invalidIds.length];
  },
  (data, random) => {
    const items = data.workspaces[0].categories[0].groups[0].items;
    items[random % items.length].type = `unknown-${random}`;
  },
  (data, random) => {
    const urls = ['javascript:alert(1)', 'mailto:test@example.com', 'not a URL'];
    data.workspaces[0].categories[0].groups[0].items[0].url = urls[random % urls.length];
  },
  (data, random) => {
    const mutations = [
      () => { data.workspaces[0].categories = null; },
      () => { data.workspaces[0].categories[0].groups = {}; },
      () => { data.workspaces[0].categories[0].groups[0].items = 'items'; },
      () => { data.workspaces[0].categories[0].groups[0].items[3].items = {}; },
    ];
    mutations[random % mutations.length]();
  },
  (data, random) => {
    const workspace = data.workspaces[0];
    const category = workspace.categories[0];
    const group = category.groups[0];
    const mutations = [
      () => { category.id = workspace.id; },
      () => { group.id = category.id; },
      () => { group.items[random % group.items.length].id = group.id; },
    ];
    mutations[random % mutations.length]();
  },
  (data, random) => {
    const keys = ['__proto__', 'prototype', 'constructor'];
    Object.defineProperty(data.settings, keys[random % keys.length], {
      value: { unsafe: true }, enumerable: true, configurable: true, writable: true,
    });
  },
  (data, random) => {
    const mutations = [
      () => { data.archive[0].kind = 'category'; },
      () => { data.archive[0].data = null; },
      () => { data.trash[0].kind = 'workspace'; },
      () => { data.trash[0].data = []; },
    ];
    mutations[random % mutations.length]();
  },
  (data, random) => {
    const mutations = [
      () => { data.workspaces[0] = null; },
      () => { data.workspaces[0].categories[0] = 0; },
      () => { data.workspaces[0].categories[0].groups[0] = []; },
      () => { data.workspaces[0].categories[0].groups[0].items[random % 4] = null; },
    ];
    mutations[random % mutations.length]();
  },
];

const fuzzFamilyCounts = new Array(fuzzMutators.length).fill(0);
for (let run = 0; run < 128; run++) {
  const data = makeValidImport(`fuzz-${run}`);
  const family = run % fuzzMutators.length;
  const random = nextFuzz();
  fuzzMutators[family](data, random);
  fuzzFamilyCounts[family]++;
  let rejection;
  try {
    validateImportData(data, currentSchema);
  } catch (error) {
    rejection = error;
  }
  assert.ok(rejection, `seeded malformed import ${run} (family ${family}) must be rejected`);
  assert.ok(String(rejection.message || '').trim(), `seeded malformed import ${run} must explain its rejection`);
}
assert.deepEqual(fuzzFamilyCounts, new Array(fuzzMutators.length).fill(16));

console.log('Import recovery fixtures passed (33 malformed boundaries; 128 seeded fuzz cases)');
