(function exposeImportUtils(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LocusImportUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createImportUtils() {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));

  function visitItemIds(item, visit) {
    if (!item || typeof item !== 'object') return;
    if (typeof item.id === 'string' && item.id) visit(item.id);
    if (item.type === 'stack' && Array.isArray(item.items)) {
      item.items.forEach(child => visitItemIds(child, visit));
    }
  }

  function visitGroupIds(group, visit) {
    if (!group || typeof group !== 'object') return;
    if (typeof group.id === 'string' && group.id) visit(group.id);
    (group.items || []).forEach(item => visitItemIds(item, visit));
  }

  function collectEntityIds(state) {
    const ids = new Set();
    const add = id => ids.add(id);
    for (const workspace of (state?.workspaces || [])) {
      if (workspace?.id) add(workspace.id);
      for (const category of (workspace?.categories || [])) {
        if (category?.id) add(category.id);
        (category?.groups || []).forEach(group => visitGroupIds(group, add));
      }
    }
    for (const collection of [state?.archive || [], state?.trash || []]) {
      for (const entry of collection) {
        if (entry?.kind === 'group') visitGroupIds(entry.data, add);
        else if (entry?.kind === 'item') visitItemIds(entry.data, add);
      }
    }
    return ids;
  }

  function createAllocator(used, makeId) {
    return () => {
      for (let attempts = 0; attempts < 10000; attempts++) {
        const next = String(makeId());
        if (next && !used.has(next)) {
          used.add(next);
          return next;
        }
      }
      throw new Error('Could not allocate a unique import id');
    };
  }

  function normalizeLegacy(source, options) {
    const { makeId, schema } = options;
    const numericSchema = Number(schema);
    const isLegacy = schema === 'legacy' || !Number.isFinite(numericSchema) || numericSchema < 3;
    const data = clone(source);
    if (!isLegacy) return data;

    const used = new Set();
    const scanIds = value => {
      if (!value || typeof value !== 'object') return;
      if (!Array.isArray(value) && typeof value.id === 'string' && value.id) used.add(value.id);
      Object.values(value).forEach(scanIds);
    };
    scanIds(data);
    const allocate = createAllocator(used, makeId);
    const ensureId = entity => {
      if (typeof entity.id !== 'string' || !entity.id) entity.id = allocate();
    };
    const normalizeItem = item => {
      ensureId(item);
      if (!item.type) {
        if (Array.isArray(item.items)) item.type = 'stack';
        else if (item.url) item.type = 'tab';
        else if (typeof item.done === 'boolean') item.type = 'todo';
        else item.type = 'note';
      }
      if (item.type === 'note' && item.html == null && item.text != null) {
        item.html = String(item.text);
        delete item.text;
      }
      if (item.type === 'stack') {
        item.items = Array.isArray(item.items) ? item.items : [];
        item.items.forEach(normalizeItem);
      }
    };
    const normalizeGroup = group => {
      ensureId(group);
      group.items = Array.isArray(group.items) ? group.items : [];
      group.items.forEach(normalizeItem);
    };

    data.workspaces = Array.isArray(data.workspaces) ? data.workspaces : [];
    for (const workspace of data.workspaces) {
      ensureId(workspace);
      if (!Array.isArray(workspace.categories) || !workspace.categories.length) {
        workspace.categories = [{ id: allocate(), name: 'Quicklinks', groups: Array.isArray(workspace.groups) ? workspace.groups : [] }];
        delete workspace.groups;
      }
      for (const category of workspace.categories) {
        ensureId(category);
        category.groups = Array.isArray(category.groups) ? category.groups : [];
        category.groups.forEach(normalizeGroup);
      }
      if (!workspace.categories.some(category => category.id === workspace.activeCatId)) {
        workspace.activeCatId = workspace.categories[0].id;
      }
    }
    if (!data.workspaces.some(workspace => workspace.id === data.activeWsId)) {
      data.activeWsId = data.workspaces[0]?.id || null;
    }
    for (const collectionName of ['archive', 'trash']) {
      data[collectionName] = Array.isArray(data[collectionName]) ? data[collectionName] : [];
      for (const entry of data[collectionName]) {
        if (!entry?.data) continue;
        if (entry.kind === 'group') normalizeGroup(entry.data);
        else normalizeItem(entry.data);
      }
    }
    return data;
  }

  function rekeyItem(item, idMap, allocate) {
    const oldId = item.id;
    item.id = allocate();
    if (idMap && oldId) idMap.set(oldId, item.id);
    if (item.type === 'stack' && Array.isArray(item.items)) {
      item.items.forEach(child => rekeyItem(child, idMap, allocate));
    }
  }

  function rekeyGroup(group, idMap, allocate) {
    const oldId = group.id;
    group.id = allocate();
    if (idMap && oldId) idMap.set(oldId, group.id);
    (group.items || []).forEach(item => rekeyItem(item, idMap, allocate));
  }

  function remapKeyedRecord(record, idMap) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return {};
    const remapped = {};
    for (const [oldId, value] of Object.entries(record)) {
      const nextId = idMap.get(oldId);
      if (nextId) remapped[nextId] = value;
    }
    return remapped;
  }

  function rekeyStoredEntry(entry, activeIdMap, allocate) {
    const copy = clone(entry);
    if (copy.wsId && activeIdMap.has(copy.wsId)) copy.wsId = activeIdMap.get(copy.wsId);
    if (copy.catId && activeIdMap.has(copy.catId)) copy.catId = activeIdMap.get(copy.catId);
    if (copy.groupId && activeIdMap.has(copy.groupId)) copy.groupId = activeIdMap.get(copy.groupId);
    const payloadMap = new Map();
    if (copy.kind === 'group') rekeyGroup(copy.data, payloadMap, allocate);
    else rekeyItem(copy.data, payloadMap, allocate);
    return copy;
  }

  function protectImportedTrash(entries, now, retentionMs) {
    return (entries || []).map(entry => {
      const copy = entry;
      const currentRetentionStart = Number(copy.retentionStartedAt);
      const trashedAt = Number(copy.trashedAt || copy.at);
      const effective = Number.isFinite(currentRetentionStart) && currentRetentionStart > 0
        ? currentRetentionStart
        : trashedAt;
      if (Number.isFinite(effective) && effective > 0 && now - effective >= retentionMs) {
        copy.retentionStartedAt = now;
      }
      return copy;
    });
  }

  function normalizeActiveSelections(data) {
    const workspaces = data.workspaces || [];
    for (const workspace of workspaces) {
      delete workspace.windowId;
      const categories = workspace.categories || [];
      if (!categories.some(category => category.id === workspace.activeCatId)) {
        workspace.activeCatId = categories[0]?.id || null;
      }
    }
    if (!workspaces.some(workspace => workspace.id === data.activeWsId)) {
      data.activeWsId = workspaces[0]?.id || null;
    }

    const categoryIds = new Set();
    const groupTargets = new Set();
    const groupIds = new Set();
    for (const workspace of workspaces) {
      for (const category of (workspace.categories || [])) {
        categoryIds.add(category.id);
        for (const group of (category.groups || [])) {
          groupIds.add(group.id);
          groupTargets.add(`${workspace.id}\u0000${category.id}\u0000${group.id}`);
        }
      }
    }

    data.settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
    if (data.settings.captureDefaultCategoryId && !categoryIds.has(data.settings.captureDefaultCategoryId)) {
      data.settings.captureDefaultCategoryId = '';
    }
    const last = data.settings.captureLastTarget;
    if (last && !groupTargets.has(`${last.workspaceId}\u0000${last.categoryId}\u0000${last.groupId}`)) {
      delete data.settings.captureLastTarget;
    }
    data.settings.popupHibernateSelectedTabIds = [];

    const pruneGroupRecord = record => {
      if (!record || typeof record !== 'object' || Array.isArray(record)) return {};
      return Object.fromEntries(Object.entries(record).filter(([id]) => groupIds.has(id)));
    };
    data.columnWidths = pruneGroupRecord(data.columnWidths);
    if (data.columnSizes != null) data.columnSizes = pruneGroupRecord(data.columnSizes);
  }

  function normalizeForReplace(source, options) {
    const { makeId, now, retentionMs } = options;
    const data = clone(source);
    normalizeActiveSelections(data);

    const used = collectEntityIds({ workspaces: data.workspaces });
    const allocate = createAllocator(used, makeId);
    const activeMap = new Map();
    data.archive = (data.archive || []).map(entry => rekeyStoredEntry(entry, activeMap, allocate));
    data.trash = (data.trash || []).map(entry => rekeyStoredEntry(entry, activeMap, allocate));
    data.trash = protectImportedTrash(data.trash, now, retentionMs);
    return data;
  }

  function prepareMerge(source, existingState, options) {
    const { makeId, now, retentionMs } = options;
    const data = clone(source);
    const used = collectEntityIds(existingState);
    const allocate = createAllocator(used, makeId);
    const idMap = new Map();

    for (const workspace of (data.workspaces || [])) {
      const oldWorkspaceId = workspace.id;
      workspace.id = allocate();
      idMap.set(oldWorkspaceId, workspace.id);
      delete workspace.windowId;
      const oldActiveCategoryId = workspace.activeCatId;
      for (const category of (workspace.categories || [])) {
        const oldCategoryId = category.id;
        category.id = allocate();
        idMap.set(oldCategoryId, category.id);
        for (const group of (category.groups || [])) rekeyGroup(group, idMap, allocate);
        category.canvasPositions = remapKeyedRecord(category.canvasPositions, idMap);
      }
      workspace.activeCatId = idMap.get(oldActiveCategoryId) || workspace.categories?.[0]?.id || null;
    }

    const archive = (data.archive || []).map(entry => rekeyStoredEntry(entry, idMap, allocate));
    let trash = (data.trash || []).map(entry => rekeyStoredEntry(entry, idMap, allocate));
    trash = protectImportedTrash(trash, now, retentionMs);

    return {
      workspaces: data.workspaces || [],
      archive,
      trash,
      columnWidths: remapKeyedRecord(data.columnWidths, idMap),
      columnSizes: remapKeyedRecord(data.columnSizes, idMap),
      idMap,
    };
  }

  return { collectEntityIds, normalizeLegacy, normalizeForReplace, prepareMerge };
});
