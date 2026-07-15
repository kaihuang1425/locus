'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const LocusImportUtils = require('../import-utils.js');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const currentSchemaMatch = source.match(/const CURRENT_SCHEMA = (\d+);/);
const scale = 1024;
const fixedNow = Date.UTC(2030, 0, 15, 12, 0, 0);
const retentionMs = 30 * 24 * 60 * 60 * 1000;
const clone = value => JSON.parse(JSON.stringify(value));

assert.ok(currentSchemaMatch, 'CURRENT_SCHEMA must be extractable');
const currentSchema = Number(currentSchemaMatch[1]);
const compatibilitySchemas = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const compatibilityApps = ['locus', 'folio', 'stow', 'tabento', 'tabnest', 'tabextend'];
const semanticFuzzSeed = 0x51a7e5;
const semanticFuzzRuns = 128;

assert.deepEqual(
  compatibilitySchemas,
  Array.from({ length: currentSchema + 1 }, (_, schema) => schema),
  'schema compatibility fixtures must be extended whenever CURRENT_SCHEMA changes',
);

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
const migrateSource = extractBetween('function migrate() {', '\nconst STORAGE_QUOTA');
const exportSource = extractBetween('function countState(s) {', '\n\nlet importCtx = null;');
const importReaderSource = extractBetween('let importCtx = null;', '\n\nfunction openImportPreview() {');
const applyImportSource = extractBetween('async function applyImportReplace(data) {', '\n\nfunction bindImportUI() {');

function makeItem(prefix, index) {
  const id = `${prefix}-item-${index}`;
  switch (index % 4) {
    case 0:
      return { id, type: 'tab', title: `Tab ${prefix} ${index}`, url: `https://example.com/${prefix}/${index}` };
    case 1:
      return { id, type: 'note', html: `<p>Note ${prefix} ${index}</p>` };
    case 2:
      return { id, type: 'todo', text: `Task ${prefix} ${index}`, done: index % 8 === 2 };
    default:
      return {
        id,
        type: 'stack',
        name: `Stack ${prefix} ${index}`,
        items: [
          { id: `${id}-note`, type: 'note', html: `Nested ${prefix} ${index}` },
          { id: `${id}-tab`, type: 'tab', title: `Nested tab ${index}`, url: `https://example.com/${prefix}/${index}/nested` },
        ],
      };
  }
}

function makeScaleState(prefix, revision = 12) {
  const workspaceId = `${prefix}-workspace`;
  const categoryId = `${prefix}-category`;
  const groupIds = Array.from({ length: 16 }, (_, index) => `${prefix}-group-${index}`);
  const groups = groupIds.map((id, groupIndex) => ({
    id,
    name: `Group ${groupIndex}`,
    items: Array.from({ length: 64 }, (_, itemIndex) => makeItem(`${prefix}-active`, (groupIndex * 64) + itemIndex)),
  }));
  const storedEntry = (collection, index) => ({
    kind: 'item',
    data: makeItem(`${prefix}-${collection}`, index),
    wsId: workspaceId,
    catId: categoryId,
    groupId: groupIds[index % groupIds.length],
    catName: 'Scale Space',
    groupName: `Group ${index % groupIds.length}`,
    at: fixedNow - 2000,
    ...(collection === 'trash' ? { trashedAt: fixedNow - 1000 } : {}),
  });
  return {
    schema: currentSchema,
    _revision: revision,
    activeWsId: workspaceId,
    workspaces: [{
      id: workspaceId,
      name: 'Scale workspace',
      activeCatId: categoryId,
      categories: [{
        id: categoryId,
        name: 'Scale Space',
        groups,
        canvasPositions: Object.fromEntries(groupIds.map((id, index) => [id, { x: index * 10, y: index * 20 }])),
      }],
    }],
    archive: Array.from({ length: scale }, (_, index) => storedEntry('archive', index)),
    trash: Array.from({ length: scale }, (_, index) => storedEntry('trash', index)),
    recentEmoji: ['🔖', '📚'],
    columnWidths: Object.fromEntries(groupIds.map((id, index) => [id, 300 + index])),
    columnSizes: Object.fromEntries(groupIds.map((id, index) => [id, { width: 300 + index }])),
    settings: {
      language: 'en',
      theme: 'folio-dark',
      importScaleMarker: prefix,
      onboarding: { welcomeSeen: true, hintsSeen: {}, disabled: false },
    },
  };
}

function makeBaseState(prefix, revision) {
  const workspaceId = `${prefix}-workspace`;
  const categoryId = `${prefix}-category`;
  const groupId = `${prefix}-group`;
  return {
    schema: currentSchema,
    _revision: revision,
    activeWsId: workspaceId,
    workspaces: [{
      id: workspaceId,
      name: `${prefix} workspace`,
      activeCatId: categoryId,
      categories: [{
        id: categoryId,
        name: `${prefix} Space`,
        groups: [{ id: groupId, name: `${prefix} group`, items: [makeItem(`${prefix}-base`, 1)] }],
      }],
    }],
    archive: [],
    trash: [],
    recentEmoji: ['🧭'],
    columnWidths: { [groupId]: 288 },
    settings: { language: 'en', theme: 'folio', baseMarker: prefix },
  };
}

function listEntityIds(state) {
  const ids = [];
  const visitItem = item => {
    ids.push(item.id);
    if (item.type === 'stack' && Array.isArray(item.items)) item.items.forEach(visitItem);
  };
  const visitGroup = group => {
    ids.push(group.id);
    (group.items || []).forEach(visitItem);
  };
  for (const workspace of (state.workspaces || [])) {
    ids.push(workspace.id);
    for (const category of (workspace.categories || [])) {
      ids.push(category.id);
      (category.groups || []).forEach(visitGroup);
    }
  }
  for (const collection of [state.archive || [], state.trash || []]) {
    for (const entry of collection) {
      if (entry.kind === 'group') visitGroup(entry.data);
      else visitItem(entry.data);
    }
  }
  return ids;
}

function assertUniqueEntityIds(state, expectedCount, label) {
  const ids = listEntityIds(state);
  assert.equal(ids.length, expectedCount, `${label} must retain every entity`);
  assert.equal(new Set(ids).size, ids.length, `${label} must not duplicate an entity id`);
  assert.equal(LocusImportUtils.collectEntityIds(state).size, expectedCount);
}

const identityKeys = new Set(['id', '_revision', 'activeWsId', 'activeCatId', 'wsId', 'catId', 'groupId', 'canvasPositions']);

function withoutIdentity(value) {
  if (Array.isArray(value)) return value.map(withoutIdentity);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !identityKeys.has(key))
      .map(([key, child]) => [key, withoutIdentity(child)]),
  );
}

function semanticCollections(state) {
  return withoutIdentity({
    workspaces: state.workspaces || [],
    archive: state.archive || [],
    trash: state.trash || [],
  });
}

function portableState(state) {
  const portable = clone(state);
  delete portable._revision;
  return portable;
}

function createHarness(initialState, initialWriteMode = 'success') {
  const hostSetTimeout = setTimeout;
  const hostClearTimeout = clearTimeout;
  const objectUrls = new Map();
  const metrics = {
    downloads: [],
    previews: 0,
    writeAttempts: 0,
    reminderRequests: 0,
    storageErrors: [],
    recoveryMessages: [],
    toasts: [],
  };
  let stored = { te: clone(initialState) };
  let writeMode = initialWriteMode;
  let objectUrlSequence = 0;
  let idSequence = 0;
  let previewCompletion = null;
  let context;

  class HarnessURL extends URL {
    static createObjectURL(blob) {
      const url = `blob:locus-contract/${++objectUrlSequence}`;
      objectUrls.set(url, blob);
      return url;
    }

    static revokeObjectURL(url) {
      objectUrls.delete(url);
    }
  }

  class HarnessFileReader {
    readAsText(file) {
      queueMicrotask(() => {
        if (typeof file?.contents !== 'string') {
          if (typeof this.onerror === 'function') this.onerror(new Error('Unreadable fixture'));
          return;
        }
        this.result = file.contents;
        if (typeof this.onload === 'function') this.onload();
      });
    }
  }

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
        if (message?.type === 'reconcile-reminders') {
          metrics.reminderRequests += 1;
          return { ok: true };
        }
        assert.equal(message?.type, 'locus-state-write');
        metrics.writeAttempts += 1;
        const candidate = clone(message.state);
        const localRevision = Number(candidate._revision) || 0;
        const remoteRevision = Number(stored.te?._revision) || 0;
        if (writeMode === 'failure') {
          return { ok: false, code: 'LOCUS_STATE_WRITE_FAILED', message: 'Injected import persistence failure.' };
        }
        if (localRevision !== remoteRevision) {
          return { ok: false, code: 'LOCUS_STATE_CONFLICT', message: 'Stored revision changed.' };
        }
        const revision = localRevision + 1;
        candidate._revision = revision;
        stored = { te: candidate };
        return { ok: true, revision };
      },
    },
  };

  const sandbox = {
    Blob,
    browserLanguage: () => 'en',
    chrome,
    clearTimeout: hostClearTimeout,
    console,
    CURRENT_SCHEMA: currentSchema,
    Date: FixedDate,
    document: {
      createElement(tagName) {
        assert.equal(tagName, 'a');
        return {
          href: '',
          download: '',
          click() {
            const blob = objectUrls.get(this.href);
            assert.ok(blob, 'export must click a live object URL');
            metrics.downloads.push({ filename: this.download, blob });
          },
        };
      },
    },
    ensureDefault() {},
    esc: value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    FileReader: HarnessFileReader,
    handleStorageError(error) {
      metrics.storageErrors.push(String(error?.message || error || ''));
    },
    loadedSchema: 0,
    LocusImportUtils,
    navigator: {},
    normalizeExpiredTrash() {},
    normalizeLoadedSettings() {},
    openImportPreview() {
      metrics.previews += 1;
      const complete = previewCompletion;
      previewCompletion = null;
      if (complete) complete(clone(context.__contract.importContext()));
    },
    refreshStorageUsage() {},
    renderAll() {},
    resetSurfaceAfterImportReplace() {},
    applySettings() {},
    sanitizeHtml: value => value,
    setTimeout(fn, delay, ...args) {
      if (delay === 1000) {
        queueMicrotask(() => fn(...args));
        return -1;
      }
      return hostSetTimeout(fn, delay, ...args);
    },
    showStateRecoveryRequired(error) {
      metrics.recoveryMessages.push(String(error?.message || error || ''));
    },
    structuredClone,
    toast(message) {
      metrics.toasts.push(String(message || ''));
    },
    TRASH_RETENTION_MS: retentionMs,
    uid: () => `import-allocated-${++idSequence}`,
    URL: HarnessURL,
  };

  context = vm.createContext(sandbox);
  vm.runInContext(`${stateSource}\nglobalThis.__state = State;`, context, { filename: 'newtab-state.js' });
  vm.runInContext(
    `${migrateSource}\n${exportSource}\n${importReaderSource}\n${applyImportSource}\n`
      + `globalThis.__contract = { countState, exportJSON, importJSON, applyImportReplace, applyImportMerge, importContext: () => importCtx };`,
    context,
    { filename: 'newtab-export-import-contract.js' },
  );

  async function exportCurrent(options = { silent: true }) {
    const before = metrics.downloads.length;
    context.__contract.exportJSON(options);
    assert.equal(metrics.downloads.length, before + 1, 'export must start exactly one download');
    const download = metrics.downloads.at(-1);
    return { download, text: await download.blob.text() };
  }

  async function importSerialized(text, filename = 'locus-scale.json') {
    return new Promise((resolve, reject) => {
      const timer = hostSetTimeout(() => {
        previewCompletion = null;
        reject(new Error('Valid serialized import did not reach its preview boundary'));
      }, 1500);
      previewCompletion = importContext => {
        hostClearTimeout(timer);
        resolve(importContext);
      };
      context.__contract.importJSON({
        name: filename,
        size: Buffer.byteLength(text, 'utf8'),
        contents: text,
      });
    });
  }

  return {
    State: context.__state,
    contract: context.__contract,
    exportCurrent,
    importSerialized,
    metrics,
    setWriteMode(mode) {
      writeMode = mode;
    },
    storedState: () => clone(stored.te),
  };
}

const expectedCounts = {
  workspaces: 1,
  categories: 1,
  groups: 16,
  items: 1536,
  archived: scale,
  trashed: scale,
};

function assertRestoreDestinations(state, label) {
  const workspace = state.workspaces.find(candidate => candidate.name === 'Scale workspace');
  assert.ok(workspace, `${label} must contain the imported workspace`);
  const category = workspace.categories.find(candidate => candidate.name === 'Scale Space');
  assert.ok(category, `${label} must contain the imported Space`);
  const groupIds = new Set(category.groups.map(group => group.id));
  assert.deepEqual(new Set(Object.keys(category.canvasPositions || {})), groupIds, `${label} must remap every canvas position`);
  assert.deepEqual(
    clone(Object.values(category.canvasPositions || {}).sort((a, b) => a.x - b.x)),
    Array.from({ length: 16 }, (_, index) => ({ x: index * 10, y: index * 20 })),
    `${label} must preserve canvas coordinates`,
  );
  assert.deepEqual(
    new Set(Object.keys(state.columnWidths || {}).filter(id => groupIds.has(id))),
    groupIds,
    `${label} must remap every column width`,
  );
  assert.deepEqual(
    Object.entries(state.columnWidths || {})
      .filter(([id]) => groupIds.has(id))
      .map(([, width]) => width)
      .sort((a, b) => a - b),
    Array.from({ length: 16 }, (_, index) => 300 + index),
    `${label} must preserve column widths`,
  );
  assert.deepEqual(
    new Set(Object.keys(state.columnSizes || {}).filter(id => groupIds.has(id))),
    groupIds,
    `${label} must remap every column size`,
  );
  assert.deepEqual(
    clone(Object.entries(state.columnSizes || {})
      .filter(([id]) => groupIds.has(id))
      .map(([, size]) => size)
      .sort((a, b) => a.width - b.width)),
    Array.from({ length: 16 }, (_, index) => ({ width: 300 + index })),
    `${label} must preserve column sizes`,
  );
  for (const entry of [...state.archive, ...state.trash]) {
    assert.equal(entry.wsId, workspace.id, `${label} must remap the restore workspace`);
    assert.equal(entry.catId, category.id, `${label} must remap the restore Space`);
    assert.equal(groupIds.has(entry.groupId), true, `${label} must remap the restore group`);
  }
}

function makeCompatibilitySettings(schema, label) {
  const settings = {
    language: 'en',
    theme: 'folio',
    importCompatibilityMarker: label,
  };
  if (schema < 6) settings.tourCompleted = true;
  else settings.onboarding = { welcomeSeen: false, hintsSeen: { imported: true }, disabled: true };
  if (schema >= 7) settings.showLanding = false;
  if (schema >= 8) {
    settings.popupHibernateScope = schema >= 11 ? 'selected' : 'all';
    settings.popupHibernateKeepPinned = false;
    settings.popupHibernateKeepAudio = false;
  }
  if (schema >= 9) settings.popupSaveMode = 'queue';
  if (schema >= 11) {
    settings.popupHibernateSaveBefore = true;
    settings.popupHibernateSelectedTabIds = [101, 202];
  }
  return settings;
}

function makeCompatibilityFixture(schema, label) {
  const settings = makeCompatibilitySettings(schema, label);
  if (schema < 3) {
    return {
      schema,
      settings,
      workspaces: [{
        name: `Compatibility ${label}`,
        groups: [{
          name: `Legacy group ${label}`,
          items: [
            { title: `Legacy tab ${label}`, url: `https://example.com/compat/${label}` },
            { text: `Legacy note ${label}` },
            { text: `Legacy task ${label}`, done: false },
            { name: `Legacy stack ${label}`, items: [{ text: `Legacy nested ${label}` }] },
          ],
        }],
      }],
      archive: [{
        kind: 'item',
        data: { title: `Legacy archived ${label}`, url: `https://example.com/compat/${label}/archive` },
        at: fixedNow - 1000,
      }],
    };
  }

  const workspaceId = `${label}-workspace`;
  const categoryId = `${label}-category`;
  const groupId = `${label}-group`;
  const tab = {
    id: `${label}-tab`,
    type: 'tab',
    title: `Modern tab ${label}`,
    url: `https://example.com/compat/${label}`,
    ...(schema >= 4 ? { createdAt: fixedNow - 5000 } : {}),
    ...(schema >= 5 ? {
      notes: `<p>Why ${label}</p>`,
      tags: ['compatibility', label],
      customFields: [{ label: 'Source', value: label }],
      checklist: [{ text: `Review ${label}`, done: false }],
      cover: { emoji: '🧭' },
    } : {}),
  };
  const data = {
    schema,
    activeWsId: workspaceId,
    settings,
    workspaces: [{
      id: workspaceId,
      name: `Compatibility ${label}`,
      activeCatId: categoryId,
      categories: [{
        id: categoryId,
        name: `Compatibility Space ${label}`,
        groups: [{
          id: groupId,
          name: `Modern group ${label}`,
          items: [
            tab,
            { id: `${label}-note`, type: 'note', html: `Modern note ${label}` },
            { id: `${label}-todo`, type: 'todo', text: `Modern task ${label}`, done: false },
            {
              id: `${label}-stack`,
              type: 'stack',
              name: `Modern stack ${label}`,
              items: [{ id: `${label}-nested`, type: 'note', html: `Modern nested ${label}` }],
            },
          ],
        }],
      }],
    }],
    archive: [{
      kind: 'item',
      data: {
        id: `${label}-archive`,
        type: 'tab',
        title: `Modern archived ${label}`,
        url: `https://example.com/compat/${label}/archive`,
      },
      wsId: workspaceId,
      catId: categoryId,
      groupId,
      at: fixedNow - 2000,
    }],
    recentEmoji: ['🧭'],
    columnWidths: { [groupId]: 333 },
  };
  if (schema >= 10) {
    data.trash = [{
      kind: 'group',
      data: {
        id: `${label}-trash-group`,
        name: `Modern trashed group ${label}`,
        items: [{ id: `${label}-trash-item`, type: 'note', html: `Modern trashed note ${label}` }],
      },
      wsId: workspaceId,
      catId: categoryId,
      groupId,
      at: fixedNow - 4000,
      trashedAt: fixedNow - 3000,
    }];
  }
  return data;
}

function assertCompatibilityContent(state, schema, label) {
  const workspace = state.workspaces.find(candidate => candidate.name === `Compatibility ${label}`);
  assert.ok(workspace, `${label} must retain its workspace`);
  assert.equal(workspace.categories.length, 1, `${label} must retain one Space`);
  const category = workspace.categories[0];
  assert.equal(category.groups.length, 1, `${label} must retain one group`);
  const group = category.groups[0];
  assert.deepEqual(
    clone(group.items.map(entry => entry.type)),
    ['tab', 'note', 'todo', 'stack'],
    `${label} must retain every active item type`,
  );
  const [tab, note, todo, stack] = group.items;
  const generation = schema < 3 ? 'Legacy' : 'Modern';
  assert.equal(tab.title, `${generation} tab ${label}`);
  assert.equal(tab.url, `https://example.com/compat/${label}`);
  assert.equal(note.html, `${generation} note ${label}`, `${label} must retain note content`);
  assert.equal(todo.text, `${generation} task ${label}`);
  assert.equal(todo.done, false);
  assert.equal(stack.name, `${generation} stack ${label}`);
  assert.equal(stack.items[0].type, 'note', `${label} must retain its nested note`);
  assert.equal(
    stack.items[0].html,
    `${generation} nested ${label}`,
    `${label} must retain nested content`,
  );
  if (schema >= 3) {
    assert.equal('createdAt' in tab, schema >= 4, `${label} must match schema-4 metadata availability`);
    assert.equal('notes' in tab, schema >= 5, `${label} must match schema-5 detail availability`);
    if (schema >= 4) assert.equal(tab.createdAt, fixedNow - 5000);
    if (schema >= 5) {
      assert.equal(tab.notes, `<p>Why ${label}</p>`);
      assert.deepEqual(clone(tab.tags), ['compatibility', label]);
      assert.deepEqual(clone(tab.customFields), [{ label: 'Source', value: label }]);
      assert.deepEqual(clone(tab.checklist), [{ text: `Review ${label}`, done: false }]);
      assert.deepEqual(clone(tab.cover), { emoji: '🧭' });
    }
  }
  assert.equal(state.archive.length, 1, `${label} must retain its Archive entry`);
  assert.equal(state.archive[0].data.title, `${generation} archived ${label}`);
  assert.equal(state.archive[0].data.url, `https://example.com/compat/${label}/archive`);
  assert.equal((state.trash || []).length, schema >= 10 ? 1 : 0, `${label} must match schema-10 Trash availability`);
  if (schema >= 10) {
    assert.equal(state.trash[0].data.name, `Modern trashed group ${label}`);
    assert.equal(state.trash[0].data.items[0].html, `Modern trashed note ${label}`);
  }
  if (schema >= 3) {
    for (const entry of [...(state.archive || []), ...(state.trash || [])]) {
      assert.equal(entry.wsId, workspace.id, `${label} must retain its restore workspace`);
      assert.equal(entry.catId, category.id, `${label} must retain its restore Space`);
      assert.equal(entry.groupId, group.id, `${label} must retain its restore group`);
    }
  }
}

function assertCompatibilitySettings(state, schema, label) {
  const settings = state.settings;
  assert.equal(settings.importCompatibilityMarker, label);
  assert.equal(settings.onboarding.welcomeSeen, schema < 6);
  assert.deepEqual(clone(settings.onboarding.hintsSeen), schema < 6 ? {} : { imported: true });
  assert.equal(settings.onboarding.disabled, schema >= 6);
  assert.equal(settings.showLanding, schema < 7 ? true : false);
  assert.equal(settings.popupHibernateScope, schema < 8 ? 'window' : (schema >= 11 ? 'selected' : 'all'));
  assert.equal(settings.popupHibernateKeepPinned, schema < 8 ? true : false);
  assert.equal(settings.popupHibernateKeepAudio, schema < 8 ? true : false);
  assert.equal(settings.popupSaveMode, schema < 9 ? 'group' : 'queue');
  assert.equal(settings.popupHibernateSaveBefore, schema >= 11);
  assert.deepEqual(clone(settings.popupHibernateSelectedTabIds), []);
}

async function testCompatibilityCase({ label, mode, reportedSchema, serialized, schema }) {
  const base = makeBaseState(`${label}-${mode}-target`, 120 + schema);
  const baseEntityCount = listEntityIds(base).length;
  const harness = createHarness(base);
  const baseCounts = clone(harness.contract.countState(base));
  await harness.State.load();
  const beforePreview = clone(harness.State.get());
  const importContext = await harness.importSerialized(serialized, `${label}.json`);
  assert.equal(importContext.schema, reportedSchema, `${label} must report its source schema`);
  assert.deepEqual(clone(harness.State.get()), beforePreview, `${label} preview must not mutate State`);
  assertCompatibilityContent(importContext.data, schema, label);
  if (schema >= 11) {
    assert.deepEqual(
      clone(importContext.data.settings.popupHibernateSelectedTabIds),
      [101, 202],
      `${label} parser must retain selected-tab ids before replace normalization`,
    );
  }
  const importedCounts = clone(importContext.counts);
  const importedEntityCount = listEntityIds(importContext.data).length;
  assertUniqueEntityIds(importContext.data, importedEntityCount, `${label} parsed fixture`);
  const parsedSnapshot = JSON.stringify(importContext.data);

  const applied = mode === 'replace'
    ? await harness.contract.applyImportReplace(importContext.data)
    : await harness.contract.applyImportMerge(importContext.data);
  assert.equal(applied, true, `${label} ${mode} must persist`);
  await Promise.resolve();

  const state = harness.State.get();
  const counts = clone(harness.contract.countState(state));
  if (mode === 'replace') {
    assert.deepEqual(counts, importedCounts, `${label} replace must retain exact counts`);
    assert.equal(state.schema, currentSchema, `${label} replace must migrate to CURRENT_SCHEMA`);
    assertCompatibilitySettings(state, schema, label);
    assertUniqueEntityIds(state, importedEntityCount, `${label} replace`);
    assert.equal(harness.metrics.downloads.length, 1, `${label} replace must create a safety backup`);
  } else {
    const expectedCounts = Object.fromEntries(
      Object.keys(importedCounts).map(key => [key, importedCounts[key] + baseCounts[key]]),
    );
    assert.deepEqual(counts, expectedCounts, `${label} merge must add exact counts`);
    assert.equal(state.settings.baseMarker, `${label}-${mode}-target`, `${label} merge must retain local settings`);
    assert.equal('importCompatibilityMarker' in state.settings, false, `${label} merge must not import profile settings`);
    assertUniqueEntityIds(state, baseEntityCount + importedEntityCount, `${label} merge`);
    assert.equal(harness.metrics.downloads.length, 0, `${label} merge must not create a replace backup`);
  }
  assertCompatibilityContent(state, schema, label);
  assert.equal(JSON.stringify(importContext.data), parsedSnapshot, `${label} ${mode} must not mutate parsed input`);
  assert.deepEqual(harness.storedState(), clone(state), `${label} ${mode} must be authoritative`);
  assert.equal(harness.State.isClean(), true);
  assert.equal(harness.metrics.previews, 1);
  assert.equal(harness.metrics.writeAttempts, 1);
  assert.equal(harness.metrics.reminderRequests, 1);
}

async function testCompatibilityMatrix() {
  let cases = 0;
  for (const schema of compatibilitySchemas) {
    const app = compatibilityApps[schema % compatibilityApps.length];
    const label = `schema-${schema}-${app}`;
    const data = makeCompatibilityFixture(schema, label);
    const serialized = JSON.stringify({
      app,
      schema,
      exportedAt: new FixedDate().toISOString(),
      data,
    });
    for (const mode of ['replace', 'merge']) {
      await testCompatibilityCase({ label, mode, reportedSchema: schema, serialized, schema });
      cases += 1;
    }
  }

  const rawLabel = 'raw-legacy';
  const rawData = makeCompatibilityFixture(0, rawLabel);
  delete rawData.schema;
  const rawSerialized = JSON.stringify(rawData);
  for (const mode of ['replace', 'merge']) {
    await testCompatibilityCase({
      label: rawLabel,
      mode,
      reportedSchema: 'legacy',
      schema: 0,
      serialized: rawSerialized,
    });
    cases += 1;
  }
  return { cases, rawImport: { text: rawSerialized } };
}

function createSemanticRandom(seed) {
  let state = seed >>> 0;
  return max => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state % max;
  };
}

function createSemanticCoverage() {
  return {
    itemTypes: { tab: 0, note: 0, todo: 0, stack: 0 },
    urlSchemes: { https: 0, http: 0, ftp: 0, file: 0, data: 0 },
    optionalFields: {
      createdAt: 0,
      favorite: 0,
      readLaterAt: 0,
      notes: 0,
      tags: 0,
      customFields: 0,
      checklist: 0,
      cover: 0,
      color: 0,
      reminderAt: 0,
    },
    archiveKinds: { item: 0, group: 0 },
    trashKinds: { item: 0, group: 0 },
    emptyGroups: 0,
    emptyCategories: 0,
    emptyArchive: 0,
    emptyTrash: 0,
    multiWorkspace: 0,
    maxStackDepth: 0,
    unicodeStrings: 0,
    safeRichTextValues: 0,
    activeSelections: 0,
    restoreReferences: 0,
    canvasRecords: 0,
    columnRecords: 0,
    settingsGraphs: 0,
    recentEmojiValues: 0,
    totalEntities: 0,
  };
}

function makeSemanticFuzzState(run, random, coverage) {
  const prefix = `semantic-${run}`;
  let entitySequence = 0;
  let itemSequence = 0;
  let urlSequence = 0;
  const nextId = kind => `${prefix}-${kind}-${++entitySequence}`;
  const pick = values => values[random(values.length)];
  const text = label => {
    coverage.unicodeStrings += 1;
    return `${label} · 臺灣 Ω 🧭 ${run}`;
  };
  const safeHtml = label => {
    coverage.safeRichTextValues += 1;
    return `<p>${text(label)} <strong>safe</strong> &amp; local</p>`;
  };
  const addOptional = (item, key, value) => {
    item[key] = value;
    coverage.optionalFields[key] += 1;
  };

  const makeItem = (depth = 0, forcedType = null, forceNested = false) => {
    const types = depth >= 2 ? ['tab', 'note', 'todo'] : ['tab', 'note', 'todo', 'stack'];
    const type = forcedType || pick(types);
    const ordinal = itemSequence++;
    const id = nextId(type);
    coverage.itemTypes[type] += 1;
    let item;

    if (type === 'tab') {
      const schemeIndex = (run + urlSequence++) % 5;
      const scheme = ['https', 'http', 'ftp', 'file', 'data'][schemeIndex];
      const urls = [
        `https://example.com/${prefix}/${ordinal}?q=%CE%A9#saved`,
        `http://localhost/${prefix}/${ordinal}`,
        `ftp://example.com/${prefix}/${ordinal}`,
        `file:///C:/Locus/${prefix}-${ordinal}.html`,
        'data:image/png;base64,iVBORw0KGgo=',
      ];
      coverage.urlSchemes[scheme] += 1;
      item = { id, type, title: text(`Tab ${ordinal}`), url: urls[schemeIndex] };
    } else if (type === 'note') {
      item = { id, type, html: safeHtml(`Note ${ordinal}`) };
    } else if (type === 'todo') {
      item = { id, type, text: text(`Task ${ordinal}`), done: (run + ordinal) % 2 === 0 };
    } else {
      coverage.maxStackDepth = Math.max(coverage.maxStackDepth, depth);
      let items;
      if (forceNested && depth < 2) {
        items = [makeItem(depth + 1, 'stack', true), makeItem(depth + 1, 'note')];
      } else {
        const childCount = random(4);
        items = Array.from({ length: childCount }, () => makeItem(depth + 1));
      }
      item = { id, type, name: text(`Stack ${ordinal}`), items };
    }

    const variant = (run * 31) + ordinal + depth;
    addOptional(item, 'createdAt', fixedNow - (variant * 1000));
    if (variant % 2 === 0) addOptional(item, 'favorite', variant % 4 === 0);
    if (variant % 3 === 0) addOptional(item, 'readLaterAt', fixedNow - (variant * 2000));
    if (variant % 4 === 0) addOptional(item, 'notes', safeHtml(`Why ${ordinal}`));
    if (variant % 5 === 0) addOptional(item, 'tags', ['semantic', `run-${run}`, `type-${type}`]);
    if (variant % 6 === 0) {
      addOptional(item, 'customFields', [{ label: text('Source'), value: `${prefix}/${ordinal}` }]);
    }
    if (variant % 7 === 0) {
      addOptional(item, 'checklist', [
        { text: text(`Check ${ordinal}.1`), done: false },
        { text: text(`Check ${ordinal}.2`), done: true },
      ]);
    }
    if (variant % 8 === 0) {
      addOptional(item, 'cover', variant % 16 === 0 ? { emoji: '🧭' } : { color: '#315c8c' });
    }
    if (variant % 9 === 0) addOptional(item, 'color', pick(['#315c8c', '#8a5a44', '#5b6f52']));
    if (variant % 10 === 0) addOptional(item, 'reminderAt', fixedNow + ((variant + 1) * 60000));
    return item;
  };

  const workspaces = [];
  const groupTargets = [];
  const workspaceCount = 1 + (run % 3);
  if (workspaceCount > 1) coverage.multiWorkspace += 1;
  for (let wi = 0; wi < workspaceCount; wi++) {
    let categoryCount = 1 + random(3);
    if (wi === 0 && run % 4 === 0) categoryCount = Math.max(categoryCount, 2);
    const categories = [];
    for (let ci = 0; ci < categoryCount; ci++) {
      let groupCount = wi === 0 && ci === 0 ? 1 + (run % 3) : random(4);
      if (!(wi === 0 && ci === 0) && (run + wi + ci) % 5 === 0) groupCount = 0;
      if (groupCount === 0) coverage.emptyCategories += 1;
      const groups = [];
      for (let gi = 0; gi < groupCount; gi++) {
        let items;
        if (wi === 0 && ci === 0 && gi === 0) {
          items = [
            makeItem(0, 'tab'),
            makeItem(0, 'note'),
            makeItem(0, 'todo'),
            makeItem(0, 'stack', run % 4 === 0),
          ];
        } else {
          const itemCount = (run + wi + ci + gi) % 4 === 0 ? 0 : random(6);
          items = Array.from({ length: itemCount }, () => makeItem());
        }
        if (items.length === 0) coverage.emptyGroups += 1;
        const group = {
          id: nextId('group'),
          name: text(`Group ${wi}.${ci}.${gi}`),
          symbol: pick(['📁', '🧭', '🔖']),
          color: pick(['#315c8c', '#8a5a44', '#5b6f52']),
          collapsed: (run + wi + ci + gi) % 2 === 0,
          items,
        };
        groups.push(group);
        groupTargets.push({ wi, ci, gi });
      }
      const category = {
        id: nextId('category'),
        name: text(`Space ${wi}.${ci}`),
        symbol: pick(['◆', '●', '▲']),
        layout: pick(['bento', 'list', 'canvas', 'explorer', 'timeline', 'gallery', 'graph']),
        groups,
        canvasPositions: Object.fromEntries(groups.map((group, gi) => [
          group.id,
          { x: (run * 17) + (wi * 101) + (ci * 37) + (gi * 11), y: (gi * 29) - (ci * 7) },
        ])),
      };
      coverage.canvasRecords += groups.length;
      categories.push(category);
    }
    const workspace = {
      id: nextId('workspace'),
      name: text(`Workspace ${wi}`),
      symbol: pick(['🏠', '🗂️', '🧭']),
      activeCatId: categories[random(categories.length)].id,
      categories,
    };
    coverage.activeSelections += 1;
    workspaces.push(workspace);
  }

  const resolvedTargets = groupTargets.map(target => {
    const workspace = workspaces[target.wi];
    const category = workspace.categories[target.ci];
    const group = category.groups[target.gi];
    return { ...target, workspace, category, group };
  });
  const makeStoredEntry = (collectionName, index) => {
    const target = resolvedTargets[random(resolvedTargets.length)];
    const kind = (run + index + (collectionName === 'trash' ? 1 : 0)) % 2 === 0 ? 'item' : 'group';
    coverage[collectionName === 'archive' ? 'archiveKinds' : 'trashKinds'][kind] += 1;
    const data = kind === 'item'
      ? makeItem(0, ['tab', 'note', 'todo', 'stack'][(run + index) % 4])
      : {
        id: nextId(`${collectionName}-group`),
        name: text(`${collectionName} group ${index}`),
        symbol: '📦',
        color: '#6b7280',
        collapsed: index % 2 === 0,
        items: Array.from({ length: random(4) }, () => makeItem()),
      };
    const entry = {
      kind,
      data,
      wsId: target.workspace.id,
      catId: target.category.id,
      groupId: target.group.id,
      wsName: target.workspace.name,
      catName: target.category.name,
      groupName: target.group.name,
      fixtureTarget: { workspace: target.wi, category: target.ci, group: target.gi },
      at: fixedNow - ((run + index + 1) * 1000),
    };
    coverage.restoreReferences += 1;
    if (collectionName === 'trash') {
      entry.trashedAt = fixedNow - ((run + index + 1) * 2000);
      if (index % 2 === 0) entry.retentionStartedAt = fixedNow - ((run + index + 1) * 1500);
    }
    return entry;
  };

  const archiveCount = run % 4;
  const trashCount = (run * 3) % 4;
  if (archiveCount === 0) coverage.emptyArchive += 1;
  if (trashCount === 0) coverage.emptyTrash += 1;
  const archive = Array.from({ length: archiveCount }, (_, index) => makeStoredEntry('archive', index));
  const trash = Array.from({ length: trashCount }, (_, index) => makeStoredEntry('trash', index));
  const settingsTarget = resolvedTargets[random(resolvedTargets.length)];
  const emojiPalette = ['🧭', '📚', '🔖', '🌿', 'Ω'];
  const emojiStart = random(emojiPalette.length);
  const emojiCount = 1 + random(4);
  const recentEmoji = Array.from({ length: emojiCount }, (_, index) => (
    emojiPalette[(emojiStart + index) % emojiPalette.length]
  ));
  coverage.recentEmojiValues += recentEmoji.length;
  const columnWidths = {};
  const columnSizes = {};
  resolvedTargets.forEach((target, index) => {
    const width = 240 + ((run * 13 + index * 7) % 180);
    columnWidths[target.group.id] = width;
    columnSizes[target.group.id] = { width, density: index % 2 === 0 ? 'comfortable' : 'compact' };
  });
  coverage.columnRecords += resolvedTargets.length;

  const state = {
    schema: currentSchema,
    activeWsId: workspaces[random(workspaces.length)].id,
    workspaces,
    archive,
    trash,
    recentEmoji,
    columnWidths,
    columnSizes,
    settings: {
      language: run % 2 === 0 ? 'en' : 'zh-TW',
      theme: run % 2 === 0 ? 'folio' : 'folio-dark',
      importSemanticMarker: prefix,
      showLanding: run % 3 !== 0,
      captureDefaultCategoryId: settingsTarget.category.id,
      captureLastTarget: {
        workspaceId: settingsTarget.workspace.id,
        categoryId: settingsTarget.category.id,
        groupId: settingsTarget.group.id,
      },
      popupHibernateScope: run % 2 === 0 ? 'window' : 'all',
      popupHibernateKeepPinned: run % 3 !== 0,
      popupHibernateKeepAudio: run % 4 !== 0,
      popupHibernateSaveBefore: run % 5 === 0,
      popupHibernateSelectedTabIds: [],
      popupSaveMode: pick(['links', 'group', 'queue']),
      onboarding: { welcomeSeen: true, hintsSeen: { semantic: true }, disabled: run % 7 === 0 },
      profile: { name: text('Profile'), purpose: text('Purpose') },
      plugins: { semanticFixture: run % 2 === 0 },
    },
  };
  coverage.activeSelections += 1;
  coverage.settingsGraphs += 1;
  coverage.totalEntities += listEntityIds(state).length;
  return state;
}

function assertSemanticFuzzCoverage(coverage) {
  const assertCovered = (record, label) => {
    for (const [name, count] of Object.entries(record)) {
      assert.ok(count > 0, `semantic fuzz must cover ${label} ${name}`);
    }
  };
  assertCovered(coverage.itemTypes, 'item type');
  assertCovered(coverage.urlSchemes, 'URL scheme');
  assertCovered(coverage.optionalFields, 'optional field');
  assertCovered(coverage.archiveKinds, 'Archive kind');
  assertCovered(coverage.trashKinds, 'Trash kind');
  assert.ok(coverage.emptyGroups > 0, 'semantic fuzz must cover empty groups');
  assert.ok(coverage.emptyCategories > 0, 'semantic fuzz must cover Spaces without groups');
  assert.ok(coverage.emptyArchive > 0, 'semantic fuzz must cover empty Archive');
  assert.ok(coverage.emptyTrash > 0, 'semantic fuzz must cover empty Trash');
  assert.ok(coverage.multiWorkspace > 0, 'semantic fuzz must cover multiple workspaces');
  assert.ok(coverage.maxStackDepth >= 2, 'semantic fuzz must cover nested stacks');
  assert.ok(coverage.unicodeStrings > 0, 'semantic fuzz must cover Unicode strings');
  assert.ok(coverage.safeRichTextValues > 0, 'semantic fuzz must cover already-safe rich text');
  assert.ok(coverage.activeSelections > 0, 'semantic fuzz must cover active selections');
  assert.ok(coverage.restoreReferences > 0, 'semantic fuzz must cover stored restore references');
  assert.ok(coverage.canvasRecords > 0, 'semantic fuzz must cover canvas records');
  assert.equal(coverage.columnRecords, coverage.canvasRecords, 'every generated group must have column and canvas records');
  assert.equal(coverage.settingsGraphs, semanticFuzzRuns, 'every semantic graph must carry settings');
  assert.ok(coverage.recentEmojiValues >= semanticFuzzRuns, 'every semantic graph must carry recent emoji');
  assert.ok(coverage.totalEntities > semanticFuzzRuns * 8, 'semantic fuzz must exercise a material entity corpus');
}

function assertSemanticFuzzReferences(source, resultState, resultWorkspaces, resultArchive, resultTrash, mode, label) {
  assert.equal(resultWorkspaces.length, source.workspaces.length);
  if (mode === 'replace') {
    const sourceActiveIndex = source.workspaces.findIndex(workspace => workspace.id === source.activeWsId);
    assert.equal(resultState.activeWsId, resultWorkspaces[sourceActiveIndex].id, `${label} must preserve active workspace`);
  }
  for (let wi = 0; wi < source.workspaces.length; wi++) {
    const sourceWorkspace = source.workspaces[wi];
    const resultWorkspace = resultWorkspaces[wi];
    const sourceActiveCategory = sourceWorkspace.categories.findIndex(category => category.id === sourceWorkspace.activeCatId);
    assert.equal(resultWorkspace.activeCatId, resultWorkspace.categories[sourceActiveCategory].id, `${label} must preserve active Space`);
    for (let ci = 0; ci < sourceWorkspace.categories.length; ci++) {
      const sourceCategory = sourceWorkspace.categories[ci];
      const resultCategory = resultWorkspace.categories[ci];
      assert.equal(Object.keys(resultCategory.canvasPositions || {}).length, resultCategory.groups.length);
      for (let gi = 0; gi < sourceCategory.groups.length; gi++) {
        const sourceGroup = sourceCategory.groups[gi];
        const resultGroup = resultCategory.groups[gi];
        assert.deepEqual(
          clone(resultCategory.canvasPositions[resultGroup.id]),
          clone(sourceCategory.canvasPositions[sourceGroup.id]),
          `${label} must preserve canvas position ${wi}.${ci}.${gi}`,
        );
        assert.equal(resultState.columnWidths[resultGroup.id], source.columnWidths[sourceGroup.id]);
        assert.deepEqual(clone(resultState.columnSizes[resultGroup.id]), clone(source.columnSizes[sourceGroup.id]));
      }
    }
  }

  const assertStoredReferences = (sourceEntries, resultEntries, collectionName) => {
    assert.equal(resultEntries.length, sourceEntries.length);
    sourceEntries.forEach((sourceEntry, index) => {
      const resultEntry = resultEntries[index];
      const target = sourceEntry.fixtureTarget;
      const workspace = resultWorkspaces[target.workspace];
      const category = workspace.categories[target.category];
      const group = category.groups[target.group];
      assert.deepEqual(clone(resultEntry.fixtureTarget), clone(target));
      assert.equal(resultEntry.wsId, workspace.id, `${label} ${collectionName}[${index}] workspace reference`);
      assert.equal(resultEntry.catId, category.id, `${label} ${collectionName}[${index}] Space reference`);
      assert.equal(resultEntry.groupId, group.id, `${label} ${collectionName}[${index}] group reference`);
    });
  };
  assertStoredReferences(source.archive, resultArchive, 'Archive');
  assertStoredReferences(source.trash, resultTrash, 'Trash');
}

async function testSemanticFuzzCase(source, serialized, run, mode) {
  const base = makeBaseState(`semantic-${run}-${mode}-target`, 300 + run);
  const baseEntityCount = listEntityIds(base).length;
  const harness = createHarness(base);
  const baseCounts = clone(harness.contract.countState(base));
  await harness.State.load();
  const beforePreview = clone(harness.State.get());
  const importContext = await harness.importSerialized(serialized, `semantic-${run}.json`);
  const label = `semantic run ${run} ${mode}`;
  assert.equal(importContext.schema, currentSchema);
  assert.deepEqual(importContext.data, source, `${label} parser must preserve valid semantic data`);
  assert.deepEqual(clone(harness.State.get()), beforePreview, `${label} preview must not mutate State`);
  const importedCounts = clone(importContext.counts);
  const importedEntityCount = listEntityIds(source).length;
  assertUniqueEntityIds(source, importedEntityCount, `${label} source`);
  const parsedSnapshot = JSON.stringify(importContext.data);

  const applied = mode === 'replace'
    ? await harness.contract.applyImportReplace(importContext.data)
    : await harness.contract.applyImportMerge(importContext.data);
  assert.equal(applied, true, `${label} must persist`);
  await Promise.resolve();

  const state = harness.State.get();
  let resultWorkspaces;
  let resultArchive;
  let resultTrash;
  const counts = clone(harness.contract.countState(state));
  if (mode === 'replace') {
    resultWorkspaces = state.workspaces;
    resultArchive = state.archive;
    resultTrash = state.trash;
    assert.deepEqual(counts, importedCounts, `${label} must retain exact counts`);
    for (const [key, value] of Object.entries(source.settings)) {
      assert.deepEqual(clone(state.settings[key]), clone(value), `${label} must preserve setting ${key}`);
    }
    assert.deepEqual(clone(state.recentEmoji), source.recentEmoji);
    assertUniqueEntityIds(state, importedEntityCount, label);
    assert.equal(harness.metrics.downloads.length, 1);
  } else {
    resultWorkspaces = state.workspaces.slice(-source.workspaces.length);
    resultArchive = source.archive.length ? state.archive.slice(-source.archive.length) : [];
    resultTrash = source.trash.length ? state.trash.slice(-source.trash.length) : [];
    const expectedCounts = Object.fromEntries(
      Object.keys(importedCounts).map(key => [key, importedCounts[key] + baseCounts[key]]),
    );
    assert.deepEqual(counts, expectedCounts, `${label} must add exact counts`);
    assert.deepEqual(clone(state.settings), beforePreview.settings, `${label} must retain local profile settings`);
    const expectedEmoji = [...base.recentEmoji];
    const seenEmoji = new Set(expectedEmoji);
    for (const emoji of source.recentEmoji) {
      if (!seenEmoji.has(emoji)) { expectedEmoji.push(emoji); seenEmoji.add(emoji); }
    }
    assert.deepEqual(clone(state.recentEmoji), expectedEmoji);
    assertUniqueEntityIds(state, baseEntityCount + importedEntityCount, label);
    assert.equal(harness.metrics.downloads.length, 0);
  }

  assert.deepEqual(
    semanticCollections({ workspaces: resultWorkspaces, archive: resultArchive, trash: resultTrash }),
    semanticCollections(source),
    `${label} must preserve identity-independent semantic content`,
  );
  assertSemanticFuzzReferences(source, state, resultWorkspaces, resultArchive, resultTrash, mode, label);
  assert.equal(state.schema, currentSchema);
  assert.equal(JSON.stringify(importContext.data), parsedSnapshot, `${label} must not mutate parsed input`);
  assert.deepEqual(harness.storedState(), clone(state), `${label} must be authoritative`);
  assert.equal(harness.State.isClean(), true);
  assert.equal(harness.metrics.previews, 1);
  assert.equal(harness.metrics.writeAttempts, 1);
  assert.equal(harness.metrics.reminderRequests, 1);
}

async function testSemanticFuzzMatrix() {
  const random = createSemanticRandom(semanticFuzzSeed);
  const coverage = createSemanticCoverage();
  let cases = 0;
  let representativeImport;
  for (let run = 0; run < semanticFuzzRuns; run++) {
    const source = makeSemanticFuzzState(run, random, coverage);
    const serialized = JSON.stringify({
      app: 'locus',
      schema: currentSchema,
      exportedAt: new FixedDate().toISOString(),
      data: source,
    });
    if (!representativeImport) representativeImport = { text: serialized };
    for (const mode of ['replace', 'merge']) {
      await testSemanticFuzzCase(source, serialized, run, mode);
      cases += 1;
    }
  }
  assertSemanticFuzzCoverage(coverage);
  return { cases, coverage, representativeImport };
}

async function exportScaleFixture() {
  const sourceState = makeScaleState('roundtrip');
  const expectedEntityCount = listEntityIds(sourceState).length;
  assertUniqueEntityIds(sourceState, expectedEntityCount, 'scale source');
  const harness = createHarness(sourceState);
  await harness.State.load();
  const loadedSourceState = clone(harness.State.get());

  const { download, text } = await harness.exportCurrent();
  const payload = JSON.parse(text);
  assert.equal(payload.app, 'locus');
  assert.equal(payload.schema, currentSchema);
  assert.equal(payload.exportedAt, new FixedDate().toISOString());
  assert.equal(download.filename, 'locus-1ws-2030-01-15.json');
  assert.deepEqual(payload.counts, expectedCounts);
  assert.equal('_revision' in payload.data, false, 'export must omit the profile-local revision token');
  assert.deepEqual(payload.data, portableState(loadedSourceState), 'export bytes must preserve the complete portable graph');
  const serializedBytes = Buffer.byteLength(text, 'utf8');
  assert.ok(serializedBytes < 20 * 1024 * 1024, 'scale fixture must stay inside the production import limit');
  assert.equal(harness.State.get()._revision, sourceState._revision, 'export must not advance the persistence token');
  assert.deepEqual(harness.storedState(), sourceState, 'export must not mutate authoritative storage');
  assert.equal(harness.metrics.writeAttempts, 0);

  const importContext = await harness.importSerialized(text);
  assert.deepEqual(importContext.counts, expectedCounts);
  assert.equal(importContext.schema, currentSchema);
  assert.deepEqual(importContext.data, payload.data, 'production reader and validator must preserve valid exported bytes');
  assert.deepEqual(clone(harness.State.get()), loadedSourceState, 'previewing a valid import must not mutate local state');
  return { expectedEntityCount, payload, serializedBytes, sourceState: loadedSourceState, text };
}

async function testReplaceRoundTrip(scaleExport) {
  const harness = createHarness(makeBaseState('replace-target', 40));
  await harness.State.load();
  const before = clone(harness.State.get());
  const importContext = await harness.importSerialized(scaleExport.text, 'replace-scale.json');
  const applied = await harness.contract.applyImportReplace(importContext.data);
  assert.equal(applied, true);
  await Promise.resolve();

  const state = harness.State.get();
  assert.deepEqual(clone(harness.contract.countState(state)), expectedCounts);
  assert.deepEqual(semanticCollections(state), semanticCollections(scaleExport.sourceState));
  assert.deepEqual(clone(state.recentEmoji), scaleExport.sourceState.recentEmoji);
  assert.equal(state.settings.importScaleMarker, 'roundtrip');
  assert.equal(state._revision, before._revision + 1);
  assertUniqueEntityIds(state, scaleExport.expectedEntityCount, 'replace round trip');
  assertRestoreDestinations(state, 'replace round trip');
  assert.deepEqual(harness.storedState(), clone(state), 'replace must persist the imported graph before success');
  assert.equal(harness.State.isClean(), true);
  assert.equal(harness.metrics.writeAttempts, 1);
  assert.equal(harness.metrics.reminderRequests, 1);
  assert.equal(harness.metrics.downloads.length, 1, 'replace must create one safety backup');
  assert.match(harness.metrics.downloads[0].filename, /^locus-before-import-1ws-2030-01-15\.json$/);
  const safetyPayload = JSON.parse(await harness.metrics.downloads[0].blob.text());
  assert.deepEqual(safetyPayload.data, portableState(before), 'safety backup must contain the exact portable pre-replace graph');
}

async function testMergeRoundTrip(scaleExport) {
  const base = makeBaseState('merge-target', 70);
  const baseEntityCount = listEntityIds(base).length;
  const harness = createHarness(base);
  await harness.State.load();
  const importContext = await harness.importSerialized(scaleExport.text, 'merge-scale.json');
  const applied = await harness.contract.applyImportMerge(importContext.data);
  assert.equal(applied, true);
  await Promise.resolve();

  const state = harness.State.get();
  const importedWorkspace = state.workspaces.at(-1);
  assert.deepEqual(
    semanticCollections({
      workspaces: [importedWorkspace],
      archive: state.archive.slice(-scale),
      trash: state.trash.slice(-scale),
    }),
    semanticCollections(scaleExport.sourceState),
  );
  assert.equal(state.workspaces.length, 2);
  assert.equal(state.archive.length, scale);
  assert.equal(state.trash.length, scale);
  assertUniqueEntityIds(state, baseEntityCount + scaleExport.expectedEntityCount, 'merge round trip');
  assertRestoreDestinations(state, 'merge round trip');
  assert.deepEqual(harness.storedState(), clone(state), 'merge must persist the combined graph before success');
  assert.equal(harness.State.isClean(), true);
  assert.equal(harness.metrics.writeAttempts, 1);
  assert.equal(harness.metrics.reminderRequests, 1);
  assert.equal(harness.metrics.downloads.length, 0, 'merge must not create a destructive-replace safety backup');
}

async function testRejectedImportRollback(serializedImport, mode) {
  const harness = createHarness(makeBaseState(`${mode}-failure`, 90), 'failure');
  await harness.State.load();
  const beforeLocal = clone(harness.State.get());
  const beforeStored = harness.storedState();
  const importContext = await harness.importSerialized(serializedImport.text, `${mode}-failure.json`);
  const parsedSnapshot = JSON.stringify(importContext.data);
  const applied = mode === 'replace'
    ? await harness.contract.applyImportReplace(importContext.data)
    : await harness.contract.applyImportMerge(importContext.data);
  assert.equal(applied, false, `${mode} must not report success after persistence rejection`);
  assert.deepEqual(clone(harness.State.get()), beforeLocal, `${mode} must roll back the local graph`);
  assert.deepEqual(harness.storedState(), beforeStored, `${mode} must leave authoritative storage unchanged`);
  assert.equal(harness.State.isRecoveryRequired(), true, `${mode} failure must block further persistence`);
  assert.equal(harness.metrics.writeAttempts, 1);
  assert.ok(harness.metrics.storageErrors.length >= 1, `${mode} failure must surface a storage error`);
  assert.ok(harness.metrics.recoveryMessages.length >= 1, `${mode} failure must surface recovery guidance`);
  assert.equal(harness.metrics.toasts.some(message => /^(Imported|Merged)/.test(message)), false);
  assert.equal(harness.metrics.downloads.length, mode === 'replace' ? 1 : 0);
  assert.equal(JSON.stringify(importContext.data), parsedSnapshot, `${mode} rejection must not mutate parsed input`);
}

(async () => {
  const scaleExport = await exportScaleFixture();
  await testReplaceRoundTrip(scaleExport);
  await testMergeRoundTrip(scaleExport);
  const compatibility = await testCompatibilityMatrix();
  const semanticFuzz = await testSemanticFuzzMatrix();
  await testRejectedImportRollback(scaleExport, 'replace');
  await testRejectedImportRollback(scaleExport, 'merge');
  await testRejectedImportRollback(compatibility.rawImport, 'replace');
  await testRejectedImportRollback(compatibility.rawImport, 'merge');
  await testRejectedImportRollback(semanticFuzz.representativeImport, 'replace');
  await testRejectedImportRollback(semanticFuzz.representativeImport, 'merge');
  console.log(`Export/import contracts passed: activeTopLevel=${scale}, activeItems=${expectedCounts.items}, archive=${scale}, trash=${scale}, bytes=${scaleExport.serializedBytes}, schemas=0-${currentSchema}, envelopes=${compatibilityApps.length}+raw, compatibilityCases=${compatibility.cases}, semanticRuns=${semanticFuzzRuns}, semanticCases=${semanticFuzz.cases}, semanticSeed=0x${semanticFuzzSeed.toString(16)}, semanticEntities=${semanticFuzz.coverage.totalEntities}, modes=replace+merge, rejectedWrites=6`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
