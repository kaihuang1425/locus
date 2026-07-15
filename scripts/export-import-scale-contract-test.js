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

async function testRejectedImportRollback(scaleExport, mode) {
  const harness = createHarness(makeBaseState(`${mode}-failure`, 90), 'failure');
  await harness.State.load();
  const beforeLocal = clone(harness.State.get());
  const beforeStored = harness.storedState();
  const importContext = await harness.importSerialized(scaleExport.text, `${mode}-failure.json`);
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
}

(async () => {
  const scaleExport = await exportScaleFixture();
  await testReplaceRoundTrip(scaleExport);
  await testMergeRoundTrip(scaleExport);
  await testRejectedImportRollback(scaleExport, 'replace');
  await testRejectedImportRollback(scaleExport, 'merge');
  console.log(`Export/import scale contracts passed: activeTopLevel=${scale}, activeItems=${expectedCounts.items}, archive=${scale}, trash=${scale}, bytes=${scaleExport.serializedBytes}, modes=replace+merge, rejectedWrites=2`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
