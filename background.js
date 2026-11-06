/* ═══ Locus background.js ═══ */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const normalizeLanguage = value => /^zh(?:[-_]|$)/i.test(String(value || '').trim()) ? 'zh-TW' : 'en';
const browserLanguage = () => {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const lang = nav.languages?.[0] || nav.language || 'en';
  return normalizeLanguage(lang);
};
const appLocale = s => normalizeLanguage(s?.settings?.language || browserLanguage());
const STATE_LOCK_NAME = 'locus-state-write';
const withStateLock = task => typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function'
  ? navigator.locks.request(STATE_LOCK_NAME, { mode: 'exclusive' }, task)
  : task();
let stateWriteQueue = Promise.resolve();
const stateRevision = state => {
  const revision = Number(state?._revision ?? 0);
  return Number.isSafeInteger(revision) && revision >= 0 && revision < Number.MAX_SAFE_INTEGER
    ? revision
    : null;
};

// The service worker is the only context allowed to write the whole `te` graph.
// Its FIFO remains the serialization boundary when Web Locks are unavailable;
// the optional shared lock also coordinates with an older page that may still
// be alive during an extension update.
function enqueueStateWrite(task) {
  const run = stateWriteQueue.then(
    () => withStateLock(task),
    () => withStateLock(task),
  );
  stateWriteQueue = run.catch(() => undefined);
  return run;
}

function serializeStateWriteError(error) {
  return {
    ok: false,
    code: error?.code || 'LOCUS_STATE_WRITE_FAILED',
    message: String(error?.message || error || 'Locus could not save this change.'),
  };
}

async function getState() {
  const d = await chrome.storage.local.get('te');
  return d.te || null;
}
async function setState(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) {
    const error = new Error('Locus rejected an invalid state write request.');
    error.code = 'LOCUS_STATE_INVALID';
    throw error;
  }
  try {
    return await enqueueStateWrite(async () => {
      const stored = await chrome.storage.local.get('te');
      const remoteRevision = stateRevision(stored.te);
      const localRevision = stateRevision(s);
      if (remoteRevision == null) {
        const error = new Error('Locus found an invalid stored state revision.');
        error.code = 'LOCUS_STATE_PROTOCOL';
        throw error;
      }
      if (localRevision == null) {
        const error = new Error('Locus rejected an invalid state revision.');
        error.code = 'LOCUS_STATE_INVALID';
        throw error;
      }
      if (remoteRevision !== localRevision) {
        const error = new Error('Locus changed in another window. Retry the action.');
        error.code = 'LOCUS_STATE_CONFLICT';
        throw error;
      }
      const nextRevision = localRevision + 1;
      s._revision = nextRevision;
      try {
        await chrome.storage.local.set({ te: s });
        return nextRevision;
      } catch (error) {
        s._revision = localRevision;
        throw error;
      }
    });
  } catch (err) {
    console.error('Locus storage write failed:', err);
    if (/quota/i.test(String(err?.message || err))) {
      try {
        chrome.notifications.create('te-storage-quota-' + Date.now(), {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title: 'Locus storage full',
          message: 'A background save failed. Open Locus to free space.',
          priority: 2
        });
      } catch {}
    }
    // Re-throw so awaiting callers (addToInbox, save-all handler) don't
    // run their success path on a failed write.
    throw err;
  }
}

function captureError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function collectCaptureReservedIds(state) {
  const used = new Set();
  const seen = new Set();
  const reserve = value => {
    if (typeof value === 'string' && value) used.add(value);
  };
  const visit = value => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    for (const [key, nested] of Object.entries(value)) {
      if (key === 'id' || /Id$/.test(key)) reserve(nested);
      if (['columnSizes', 'columnWidths', 'canvasPositions'].includes(key)
          && nested && typeof nested === 'object' && !Array.isArray(nested)) {
        Object.keys(nested).forEach(reserve);
      }
      visit(nested);
    }
  };
  visit(state);
  return used;
}

function createCaptureIdAllocator(state, makeId = uid) {
  const used = collectCaptureReservedIds(state);
  return () => {
    for (let attempts = 0; attempts < 10000; attempts += 1) {
      const candidate = makeId();
      const id = typeof candidate === 'string' ? candidate : '';
      if (id && !used.has(id)) {
        used.add(id);
        return id;
      }
    }
    throw captureError('LOCUS_CAPTURE_ID_UNAVAILABLE', 'Locus could not allocate a safe capture identity.');
  };
}

async function ensureDefault(s) {
  if (!s) {
    s = { workspaces: [], activeWsId: null, archive: [], settings: {} };
  }
  if (!s || typeof s !== 'object' || Array.isArray(s)) {
    throw captureError('LOCUS_CAPTURE_STATE_INVALID', 'Locus could not read a valid capture state.');
  }
  if (!s.settings) s.settings = {};
  if (typeof s.settings !== 'object' || Array.isArray(s.settings)) {
    throw captureError('LOCUS_CAPTURE_STATE_INVALID', 'Locus could not read valid capture settings.');
  }
  s.settings.language = normalizeLanguage(s.settings.language || browserLanguage());
  if (s.workspaces == null) s.workspaces = [];
  if (!Array.isArray(s.workspaces)) {
    throw captureError('LOCUS_CAPTURE_STATE_INVALID', 'Locus could not read a valid Workspace list.');
  }
  if (!s.workspaces.length) {
    const allocateId = createCaptureIdAllocator(s);
    const cat = { id: allocateId(), name: 'Quicklinks', groups: [] };
    const inbox = { id: allocateId(), name: 'Inbox', symbol: '📥', color: '#6366f1', collapsed: false, items: [] };
    cat.groups.push(inbox);
    s.workspaces = [{ id: allocateId(), name: 'My Workspace', symbol: '🏠', categories: [cat], activeCatId: cat.id }];
    s.activeWsId = s.workspaces[0].id;
  }
  return s;
}

const CAPTURABLE_PROTOCOLS = new Set(['http:', 'https:', 'ftp:', 'file:']);

function isCapturableUrl(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return false;
  try {
    return CAPTURABLE_PROTOCOLS.has(new URL(raw).protocol.toLowerCase());
  } catch {
    return false;
  }
}

function captureFields(s, tab, url = tab?.url) {
  const settings = s?.settings || {};
  let fallback = url || 'Untitled';
  try { fallback = new URL(url).hostname || fallback; } catch {}
  const requestedTitle = settings.captureIncludeTitle !== false ? (tab?.title || fallback) : fallback;
  return {
    title: String(requestedTitle || fallback).trim() || fallback,
    fav: settings.captureIncludeFavicon !== false ? String(tab?.favIconUrl || tab?.fav || '') : ''
  };
}

function captureHierarchy(state) {
  const workspaces = Array.isArray(state?.workspaces) ? state.workspaces : [];
  const spaces = [];
  const groups = [];
  for (const ws of workspaces) {
    if (!ws || typeof ws !== 'object' || !Array.isArray(ws.categories)) continue;
    for (const cat of ws.categories) {
      if (!cat || typeof cat !== 'object') continue;
      spaces.push({ ws, cat });
      if (!Array.isArray(cat.groups)) continue;
      for (const group of cat.groups) {
        if (group && typeof group === 'object') groups.push({ ws, cat, group });
      }
    }
  }
  return { workspaces, spaces, groups };
}

function requireCaptureId(value, label) {
  if (typeof value !== 'string' || !value) {
    throw captureError('LOCUS_CAPTURE_TARGET_UNAVAILABLE', `Locus could not confirm the ${label} capture identity.`);
  }
  return value;
}

function requireUniqueCaptureMatch(matches, label) {
  if (matches.length !== 1) {
    throw captureError('LOCUS_CAPTURE_TARGET_UNAVAILABLE', `Locus could not confirm one exact ${label} capture destination.`);
  }
  return matches[0];
}

function resolveCaptureDestination(s, { useLast = true } = {}) {
  const settings = s?.settings || {};
  const hierarchy = captureHierarchy(s);
  if (!hierarchy.workspaces.length) {
    throw captureError('LOCUS_CAPTURE_TARGET_UNAVAILABLE', 'Locus could not find a capture Workspace.');
  }

  if (useLast && settings.captureRememberLast !== false
      && Object.prototype.hasOwnProperty.call(settings, 'captureLastTarget')) {
    const remembered = settings.captureLastTarget;
    if (!remembered || typeof remembered !== 'object' || Array.isArray(remembered)) {
      throw captureError('LOCUS_CAPTURE_TARGET_UNAVAILABLE', 'The remembered capture destination is unavailable.');
    }
    const workspaceId = requireCaptureId(remembered.workspaceId, 'remembered Workspace');
    const categoryId = requireCaptureId(remembered.categoryId, 'remembered Space');
    const groupId = requireCaptureId(remembered.groupId, 'remembered Group');
    const ws = requireUniqueCaptureMatch(
      hierarchy.workspaces.filter(candidate => candidate?.id === workspaceId),
      'remembered Workspace',
    );
    const spaceEntry = requireUniqueCaptureMatch(
      hierarchy.spaces.filter(entry => entry.cat?.id === categoryId),
      'remembered Space',
    );
    const groupEntry = requireUniqueCaptureMatch(
      hierarchy.groups.filter(entry => entry.group?.id === groupId),
      'remembered Group',
    );
    if (spaceEntry.ws !== ws || groupEntry.ws !== ws || groupEntry.cat !== spaceEntry.cat) {
      throw captureError('LOCUS_CAPTURE_TARGET_UNAVAILABLE', 'The remembered capture destination moved.');
    }
    return { ws, cat: spaceEntry.cat, group: groupEntry.group, source: 'remembered' };
  }

  const defaultCategoryId = settings.captureDefaultCategoryId;
  if (defaultCategoryId != null && defaultCategoryId !== '') {
    requireCaptureId(defaultCategoryId, 'default Space');
    const entry = requireUniqueCaptureMatch(
      hierarchy.spaces.filter(candidate => candidate.cat?.id === defaultCategoryId),
      'default Space',
    );
    const workspaceId = requireCaptureId(entry.ws?.id, 'default Workspace');
    requireUniqueCaptureMatch(
      hierarchy.workspaces.filter(candidate => candidate?.id === workspaceId),
      'default Workspace',
    );
    return { ws: entry.ws, cat: entry.cat, group: null, source: 'default' };
  }

  const activeWsId = requireCaptureId(s.activeWsId, 'active Workspace');
  const ws = requireUniqueCaptureMatch(
    hierarchy.workspaces.filter(candidate => candidate?.id === activeWsId),
    'active Workspace',
  );
  const activeCatId = requireCaptureId(ws.activeCatId, 'active Space');
  const entry = requireUniqueCaptureMatch(
    hierarchy.spaces.filter(candidate => candidate.cat?.id === activeCatId),
    'active Space',
  );
  if (entry.ws !== ws) {
    throw captureError('LOCUS_CAPTURE_TARGET_UNAVAILABLE', 'The active capture Space moved.');
  }
  return { ws, cat: entry.cat, group: null, source: 'active' };
}

function resolveCaptureTarget(s, { useLast = true, allocateId = createCaptureIdAllocator(s) } = {}) {
  const destination = resolveCaptureDestination(s, { useLast });
  if (destination.group) return destination;
  if (destination.cat.groups == null) destination.cat.groups = [];
  if (!Array.isArray(destination.cat.groups)) {
    throw captureError('LOCUS_CAPTURE_TARGET_UNAVAILABLE', 'The capture Space has an invalid Group list.');
  }
  const inboxes = destination.cat.groups.filter(group => group?.name === 'Inbox');
  if (inboxes.length > 1) {
    throw captureError('LOCUS_CAPTURE_TARGET_UNAVAILABLE', 'The capture Space has more than one Inbox.');
  }
  if (inboxes.length === 1) {
    const groupId = requireCaptureId(inboxes[0].id, 'Inbox Group');
    const hierarchy = captureHierarchy(s);
    const entry = requireUniqueCaptureMatch(
      hierarchy.groups.filter(candidate => candidate.group?.id === groupId),
      'Inbox Group',
    );
    if (entry.ws !== destination.ws || entry.cat !== destination.cat || entry.group !== inboxes[0]) {
      throw captureError('LOCUS_CAPTURE_TARGET_UNAVAILABLE', 'The capture Inbox moved.');
    }
    return { ...destination, group: inboxes[0], proposedInbox: false };
  }
  const group = {
    id: allocateId(),
    name: 'Inbox',
    symbol: '📥',
    color: '#6366f1',
    collapsed: false,
    items: [],
  };
  destination.cat.groups.unshift(group);
  return { ...destination, group, proposedInbox: true };
}

function buildCapturedItem(s, requested, allocateId) {
  if (!requested || typeof requested !== 'object' || Array.isArray(requested)) {
    throw captureError('LOCUS_CAPTURE_INVALID', 'Locus rejected an invalid capture item.');
  }
  const createdAt = Date.now();
  if (requested.type === 'tab') {
    const url = typeof requested.url === 'string' ? requested.url.trim() : '';
    if (!isCapturableUrl(url)) {
      throw captureError('LOCUS_CAPTURE_INVALID', 'Locus rejected an unsupported capture address.');
    }
    const meta = captureFields(s, requested, url);
    return { id: allocateId(), type: 'tab', title: meta.title, url, fav: meta.fav, createdAt };
  }
  if (requested.type === 'note') {
    const html = String(requested.html || '');
    if (!html.trim()) {
      throw captureError('LOCUS_CAPTURE_INVALID', 'Locus rejected an empty capture note.');
    }
    return { id: allocateId(), type: 'note', html, color: requested.color ?? null, createdAt };
  }
  throw captureError('LOCUS_CAPTURE_INVALID', 'Locus rejected an unsupported capture item.');
}

async function addToInbox(item) {
  let s = await getState();
  s = await ensureDefault(s);
  const allocateId = createCaptureIdAllocator(s);
  const target = resolveCaptureTarget(s, { allocateId });
  if (target.group.items == null) target.group.items = [];
  if (!Array.isArray(target.group.items)) {
    throw captureError('LOCUS_CAPTURE_TARGET_UNAVAILABLE', 'The capture Group has an invalid item list.');
  }
  const requestedUrl = item?.type === 'tab' && typeof item.url === 'string' ? item.url.trim() : null;
  const duplicateMatches = requestedUrl && s.settings.captureDeduplicate !== false
    ? captureGroupTabItems(target.group).filter(existing => existing.url === requestedUrl)
    : [];
  if (duplicateMatches.length) {
    const exactDuplicateId = duplicateMatches.length === 1
      && typeof duplicateMatches[0]?.id === 'string'
      && duplicateMatches[0].id
      && duplicateMatches[0].id.length <= 200
      ? duplicateMatches[0].id
      : null;
    return {
      ok: false,
      status: 'duplicate',
      locale: appLocale(s),
      blurPrivacy: s.settings?.blurPrivacy === true,
      workspaceId: target.ws.id,
      workspaceName: String(target.ws.name || ''),
      categoryId: target.cat.id,
      categoryName: String(target.cat.name || ''),
      groupId: target.group.id,
      groupName: String(target.group.name || ''),
      itemId: exactDuplicateId,
    };
  }
  const captured = buildCapturedItem(s, item, allocateId);
  target.group.items.push(captured);
  const revision = await setState(s);
  return {
    ok: true,
    status: 'saved',
    revision,
    locale: appLocale(s),
    blurPrivacy: s.settings?.blurPrivacy === true,
    workspaceId: target.ws.id,
    workspaceName: String(target.ws.name || ''),
    categoryId: target.cat.id,
    categoryName: String(target.cat.name || ''),
    groupId: target.group.id,
    groupName: String(target.group.name || ''),
    itemId: captured.id,
    expectedUrl: captured.type === 'tab' ? captured.url : null,
    closeSources: s.settings?.closeTabOnSave !== false,
    proposedInbox: target.proposedInbox === true,
  };
}

function captureTabDescriptor(tab) {
  if (!Number.isInteger(tab?.id) || !Number.isInteger(tab?.windowId)
      || typeof tab.url !== 'string' || !tab.url) return null;
  return { tabId: tab.id, windowId: tab.windowId, expectedUrl: tab.url };
}

function captureTabStillMatches(tab, descriptor, { preserveActive = false } = {}) {
  if (!tab || !descriptor) return false;
  if (tab.id !== descriptor.tabId || tab.windowId !== descriptor.windowId) return false;
  if (preserveActive && tab.active !== false) return false;
  if (tab.url !== descriptor.expectedUrl) return false;
  if (tab.pendingUrl === undefined) return true;
  if (typeof tab.pendingUrl !== 'string') return false;
  return !tab.pendingUrl || tab.pendingUrl === descriptor.expectedUrl;
}

async function closeCapturedTabIfEnabled(tab, closeEnabled, options = {}) {
  if (closeEnabled !== true) return { closed: false, reason: 'disabled' };
  const descriptor = captureTabDescriptor(tab);
  if (!descriptor) return { closed: false, reason: 'unconfirmed' };
  let current;
  try {
    current = await chrome.tabs.get(descriptor.tabId);
  } catch (error) {
    console.error('Could not confirm the saved source tab; leaving it open.', error);
    return { closed: false, reason: 'unconfirmed' };
  }
  if (!captureTabStillMatches(current, descriptor, options)) {
    return { closed: false, reason: 'changed' };
  }
  try {
    await chrome.tabs.remove(descriptor.tabId);
    return { closed: true, reason: null };
  } catch {
    return { closed: false, reason: 'unconfirmed' };
  }
}

function resolveAcceptedBackgroundCaptureGroup(state, result) {
  const acceptedRevision = Number(result?.revision);
  const currentRevision = stateRevision(state);
  if (!Number.isSafeInteger(acceptedRevision) || acceptedRevision < 0
      || currentRevision == null || currentRevision < acceptedRevision) return null;

  const workspaceId = typeof result?.workspaceId === 'string' ? result.workspaceId : '';
  const categoryId = typeof result?.categoryId === 'string' ? result.categoryId : '';
  const groupId = typeof result?.groupId === 'string' ? result.groupId : '';
  if (!workspaceId || !categoryId || !groupId) return null;

  const hierarchy = captureHierarchy(state);
  const workspaces = hierarchy.workspaces.filter(workspace => workspace?.id === workspaceId);
  const spaces = hierarchy.spaces.filter(entry => entry.cat?.id === categoryId);
  const groups = hierarchy.groups.filter(entry => entry.group?.id === groupId);
  if (workspaces.length !== 1 || spaces.length !== 1 || groups.length !== 1) return null;
  if (spaces[0].ws !== workspaces[0]
      || groups[0].ws !== workspaces[0]
      || groups[0].cat !== spaces[0].cat) return null;
  return groups[0];
}

function indexAcceptedBackgroundCaptureItems(state, itemIds) {
  const wanted = new Set(itemIds);
  const locations = new Map([...wanted].map(itemId => [itemId, []]));
  let valid = true;
  const hierarchy = captureHierarchy(state);
  const visit = (items, owner, parentItem, ancestors) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      if (ancestors.has(item)) {
        valid = false;
        continue;
      }
      if (wanted.has(item.id)) {
        locations.get(item.id).push({ ...owner, item, parentItem });
      }
      if (Array.isArray(item.items)) {
        ancestors.add(item);
        visit(item.items, owner, item, ancestors);
        ancestors.delete(item);
      }
    }
  };
  for (const owner of hierarchy.groups) {
    visit(owner.group?.items, owner, null, new Set());
  }
  return { valid, locations };
}

function resolveAcceptedBackgroundCaptureItem(state, result) {
  const owner = resolveAcceptedBackgroundCaptureGroup(state, result);
  const itemId = typeof result?.itemId === 'string' ? result.itemId : '';
  const expectedUrl = typeof result?.expectedUrl === 'string' ? result.expectedUrl : '';
  if (!owner || !itemId || !expectedUrl) return null;
  const indexed = indexAcceptedBackgroundCaptureItems(state, [itemId]);
  const matches = indexed.locations.get(itemId) || [];
  if (!indexed.valid || matches.length !== 1) return null;
  const target = matches[0];
  if (target.ws !== owner.ws || target.cat !== owner.cat || target.group !== owner.group
      || target.parentItem !== null || target.item?.type !== 'tab'
      || target.item.url !== expectedUrl) return null;
  return target;
}

function acceptedBackgroundWindowSourceIds(state, result) {
  const owner = resolveAcceptedBackgroundCaptureGroup(state, result);
  const sources = Array.isArray(result?.sources) ? result.sources : [];
  if (!owner || !Number.isInteger(result?.count) || result.count !== sources.length) return null;
  const itemIds = sources.map(source => typeof source?.itemId === 'string' ? source.itemId : '');
  if (itemIds.some(itemId => !itemId) || new Set(itemIds).size !== itemIds.length) return null;
  const indexed = indexAcceptedBackgroundCaptureItems(state, itemIds);
  if (!indexed.valid) return null;

  const ready = new Set();
  for (const source of sources) {
    const matches = indexed.locations.get(source.itemId) || [];
    if (matches.length !== 1) continue;
    const target = matches[0];
    if (target.ws === owner.ws && target.cat === owner.cat && target.group === owner.group
        && target.parentItem === null && target.item?.type === 'tab'
        && target.item.url === source.expectedUrl) {
      ready.add(source.tabId);
    }
  }
  return ready;
}

async function closeAcceptedBackgroundItemSource(result, sourceTab) {
  // Native receipt creation may outlive the accepted write. Re-enter the sole
  // state FIFO and keep its optional cross-context lock through source cleanup,
  // so authority cannot change between this fresh read and tab removal.
  try {
    return await enqueueStateWrite(async () => {
      const authoritative = await getState();
      if (!resolveAcceptedBackgroundCaptureItem(authoritative, result)) {
        return { closed: false, reason: 'destination-unavailable' };
      }
      return closeCapturedTabIfEnabled(sourceTab, result.closeSources);
    });
  } catch (error) {
    console.error('Could not confirm the accepted capture destination; leaving its source open.', error);
    return { closed: false, reason: 'unconfirmed' };
  }
}

function sessionGroupName(s, now = new Date()) {
  const locale = appLocale(s);
  const prefix = locale === 'zh-TW' ? '工作階段' : 'Session';
  return `${prefix} ${now.toLocaleDateString(locale, { month:'short', day:'numeric' })} ${now.toLocaleTimeString(locale, { hour:'2-digit', minute:'2-digit' })}`;
}

async function saveContextWindow(initiatingTab) {
  const initiatingSource = captureTabDescriptor(initiatingTab);
  if (!initiatingSource) {
    throw captureError('LOCUS_CAPTURE_SOURCE_UNAVAILABLE', 'Locus could not confirm the source window.');
  }
  const queried = await chrome.tabs.query({ windowId: initiatingTab.windowId });
  const seenIds = new Set();
  const tabs = [];
  for (const tab of queried || []) {
    if (!Number.isInteger(tab?.id) || tab.windowId !== initiatingTab.windowId || !isCapturableUrl(tab.url)) continue;
    if (seenIds.has(tab.id)) {
      throw captureError('LOCUS_CAPTURE_SOURCE_UNAVAILABLE', 'Locus found an ambiguous source tab.');
    }
    seenIds.add(tab.id);
    tabs.push(tab);
  }
  if (!tabs.length) return { ok: false, status: 'empty', count: 0 };

  let s = await getState();
  s = await ensureDefault(s);
  const allocateId = createCaptureIdAllocator(s);
  const destination = resolveCaptureDestination(s);
  if (destination.cat.groups == null) destination.cat.groups = [];
  if (!Array.isArray(destination.cat.groups)) {
    throw captureError('LOCUS_CAPTURE_TARGET_UNAVAILABLE', 'The capture Space has an invalid Group list.');
  }
  const group = {
    id: allocateId(),
    symbol: '💾',
    color: '#06b6d4',
    collapsed: false,
    name: sessionGroupName(s),
    items: tabs.map(tab => buildCapturedItem(s, {
      type: 'tab',
      title: tab.title,
      url: tab.url,
      fav: tab.favIconUrl,
    }, allocateId)),
  };
  destination.cat.groups.push(group);
  const revision = await setState(s);
  return {
    ok: true,
    status: 'saved',
    revision,
    locale: appLocale(s),
    blurPrivacy: s.settings?.blurPrivacy === true,
    count: group.items.length,
    workspaceId: destination.ws.id,
    workspaceName: String(destination.ws.name || ''),
    categoryId: destination.cat.id,
    categoryName: String(destination.cat.name || ''),
    groupId: group.id,
    groupName: String(group.name || ''),
    initiatingTabId: initiatingSource.tabId,
    closeSources: s.settings?.closeTabOnSave !== false,
    sources: tabs.map((tab, index) => {
      const source = captureTabDescriptor(tab);
      return source ? { ...source, itemId: group.items[index].id } : null;
    }).filter(Boolean),
  };
}

async function closeContextWindowSources(result) {
  const sources = (Array.isArray(result?.sources) ? result.sources : [])
    .filter(source => source?.tabId !== result?.initiatingTabId);
  if (!result?.ok || result.closeSources !== true) return { closed: 0, unconfirmed: 0 };
  try {
    return await enqueueStateWrite(async () => {
      const authoritative = await getState();
      const readySourceIds = acceptedBackgroundWindowSourceIds(authoritative, result);
      if (!readySourceIds) return { closed: 0, unconfirmed: sources.length };
      let closed = 0;
      let unconfirmed = 0;
      for (const source of sources) {
        if (!readySourceIds.has(source.tabId)) {
          unconfirmed += 1;
          continue;
        }
        const closeResult = await closeCapturedTabIfEnabled({
          id: source.tabId,
          windowId: source.windowId,
          url: source.expectedUrl,
        }, true, { preserveActive: true });
        if (closeResult.closed) closed += 1;
        else unconfirmed += 1;
      }
      return { closed, unconfirmed };
    });
  } catch (error) {
    console.error('Could not confirm the accepted window destination; leaving its sources open.', error);
    return { closed: 0, unconfirmed: sources.length };
  }
}

const CAPTURE_RECEIPT_NOTIFICATION_PREFIX = 'te-capture-receipt-v1|';
const CAPTURE_RECEIPT_HOME_NOTIFICATION_PREFIX = 'te-capture-receipt-home-';
const CAPTURE_RECEIPT_MAX_NOTIFICATION_ID = 500;
const CAPTURE_RECEIPT_MAX_ENTITY_ID = 200;

function runChromeCallbackApi(invoke) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error, value) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve(value);
    };
    const callback = value => {
      const lastError = chrome.runtime?.lastError;
      settle(lastError ? new Error(lastError.message || String(lastError)) : null, value);
    };
    let returned;
    try {
      returned = invoke(callback);
    } catch (error) {
      settle(error);
      return;
    }
    if (returned && typeof returned.then === 'function') {
      returned.then(value => settle(null, value), error => settle(error));
    }
  });
}

function createNativeNotification(notificationId, options) {
  return runChromeCallbackApi(callback => chrome.notifications.create(notificationId, options, callback));
}

function updateNativeNotification(notificationId, options) {
  return runChromeCallbackApi(callback => chrome.notifications.update(notificationId, options, callback));
}

function clearNativeNotification(notificationId) {
  return runChromeCallbackApi(callback => chrome.notifications.clear(notificationId, callback));
}

const CAPTURE_RECEIPT_COPY = {
  en: {
    itemTitles: {
      page: 'Page saved',
      link: 'Link saved',
      note: 'Note saved',
      image: 'Image saved',
      item: 'Item saved',
    },
    duplicateTitle: 'Already saved',
    unconfirmedTitle: 'Page saved; check source tab',
    windowTitle: count => `Saved ${count} ${count === 1 ? 'tab' : 'tabs'}`,
    inbox: 'Inbox',
    untitled: 'Untitled',
    sourceClosed: 'Source tab closed.',
    sourceStayed: 'Source tab stayed open.',
    sourceUnconfirmed: "Couldn't confirm whether the source tab closed.",
    windowStayed: 'Original tabs stayed open.',
    windowClosed: count => `Closed ${count} other ${count === 1 ? 'tab' : 'tabs'}.`,
    windowUnconfirmed: count => `${count} other ${count === 1 ? 'tab could' : 'tabs could'} not be confirmed closed.`,
    windowPartial: (closed, unconfirmed) => `Closed ${closed} other ${closed === 1 ? 'tab' : 'tabs'}; ${unconfirmed} other ${unconfirmed === 1 ? 'tab could' : 'tabs could'} not be confirmed closed.`,
    currentStayed: 'This tab stayed open.',
    openItem: 'Click to open the saved item.',
    openDestination: 'Click to open the destination.',
    openHome: 'Click to open Locus.',
    destinationHidden: 'Destination hidden',
    sentenceSeparator: ' ',
  },
  'zh-TW': {
    itemTitles: {
      page: '分頁已儲存',
      link: '連結已儲存',
      note: '筆記已儲存',
      image: '圖片已儲存',
      item: '項目已儲存',
    },
    duplicateTitle: '已儲存過',
    unconfirmedTitle: '已儲存，請確認原分頁',
    windowTitle: count => `已儲存 ${count} 個分頁`,
    inbox: '收件匣',
    untitled: '未命名',
    sourceClosed: '已關閉原分頁。',
    sourceStayed: '原分頁保持開啟。',
    sourceUnconfirmed: '無法確認原分頁是否已關閉。',
    windowStayed: '原分頁保持開啟。',
    windowClosed: count => `已關閉其他 ${count} 個分頁。`,
    windowUnconfirmed: count => `另有 ${count} 個分頁無法確認是否已關閉。`,
    windowPartial: (closed, unconfirmed) => `已關閉其他 ${closed} 個分頁；另有 ${unconfirmed} 個分頁無法確認是否已關閉。`,
    currentStayed: '目前分頁保持開啟。',
    openItem: '點一下即可在 Locus 開啟已儲存項目。',
    openDestination: '點一下即可開啟儲存位置。',
    openHome: '點一下即可開啟 Locus。',
    destinationHidden: '已隱藏儲存位置',
    sentenceSeparator: '',
  },
};

function captureReceiptNonce() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return uid();
}

function buildCaptureReceiptNotificationId(locator, makeNonce = captureReceiptNonce) {
  if (!locator || !['item', 'group'].includes(locator.kind)) return null;
  const workspaceId = typeof locator.workspaceId === 'string' ? locator.workspaceId : '';
  const targetId = typeof locator.targetId === 'string' ? locator.targetId : '';
  if (!workspaceId || !targetId
      || workspaceId.length > CAPTURE_RECEIPT_MAX_ENTITY_ID
      || targetId.length > CAPTURE_RECEIPT_MAX_ENTITY_ID) return null;
  let nonce;
  let encodedWorkspace;
  let encodedTarget;
  try {
    nonce = String(makeNonce());
    encodedWorkspace = encodeURIComponent(workspaceId);
    encodedTarget = encodeURIComponent(targetId);
  } catch {
    return null;
  }
  if (!/^[a-z0-9-]{8,64}$/i.test(nonce)) return null;
  const id = `${CAPTURE_RECEIPT_NOTIFICATION_PREFIX}${locator.kind}|${encodedWorkspace}|${encodedTarget}|${nonce}`;
  return id.length <= CAPTURE_RECEIPT_MAX_NOTIFICATION_ID ? id : null;
}

function parseCaptureReceiptNotificationId(notificationId) {
  if (typeof notificationId !== 'string'
      || notificationId.length > CAPTURE_RECEIPT_MAX_NOTIFICATION_ID
      || !notificationId.startsWith(CAPTURE_RECEIPT_NOTIFICATION_PREFIX)) return null;
  const parts = notificationId.slice(CAPTURE_RECEIPT_NOTIFICATION_PREFIX.length).split('|');
  if (parts.length !== 4) return null;
  const [kind, encodedWorkspace, encodedTarget, nonce] = parts;
  if (!['item', 'group'].includes(kind) || !encodedWorkspace || !encodedTarget
      || !/^[a-z0-9-]{8,64}$/i.test(nonce)) return null;
  try {
    const workspaceId = decodeURIComponent(encodedWorkspace);
    const targetId = decodeURIComponent(encodedTarget);
    if (!workspaceId || !targetId
        || workspaceId.length > CAPTURE_RECEIPT_MAX_ENTITY_ID
        || targetId.length > CAPTURE_RECEIPT_MAX_ENTITY_ID
        || encodeURIComponent(workspaceId) !== encodedWorkspace
        || encodeURIComponent(targetId) !== encodedTarget) return null;
    return Object.freeze({ kind, workspaceId, targetId, nonce });
  } catch {
    return null;
  }
}

function captureReceiptGraphemes(value) {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value),
        entry => entry.segment);
    }
  } catch {}
  return Array.from(value);
}

function captureReceiptSafeName(value, fallback, maxGraphemes) {
  const clean = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/›/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const graphemes = captureReceiptGraphemes(clean);
  if (!graphemes.length) return fallback;
  return graphemes.length > maxGraphemes
    ? `${graphemes.slice(0, maxGraphemes - 1).join('')}…`
    : clean;
}

function captureReceiptPath(result, copy) {
  if (result?.blurPrivacy === true) return copy.destinationHidden;
  const groupName = result?.groupName === 'Inbox' ? copy.inbox : result?.groupName;
  return [
    [result?.workspaceName, 24],
    [result?.categoryName, 24],
    [groupName, 40],
  ]
    .map(([name, budget]) => captureReceiptSafeName(name, copy.untitled, budget))
    .join(' › ');
}

function captureReceiptLocator(result) {
  const workspaceId = typeof result?.workspaceId === 'string' ? result.workspaceId : '';
  if (!workspaceId) return null;
  if (typeof result?.itemId === 'string' && result.itemId) {
    return { kind: 'item', workspaceId, targetId: result.itemId };
  }
  if (Number.isInteger(result?.count) && typeof result?.groupId === 'string' && result.groupId) {
    return { kind: 'group', workspaceId, targetId: result.groupId };
  }
  return null;
}

function buildBackgroundCaptureReceipt(result, options = {}, previousReceipt = null) {
  if (!result || !['saved', 'duplicate'].includes(result.status)) return null;
  const locale = normalizeLanguage(result.locale);
  const copy = CAPTURE_RECEIPT_COPY[locale] || CAPTURE_RECEIPT_COPY.en;
  const locator = captureReceiptLocator(result);
  const actionableId = previousReceipt?.actionable === true
    ? previousReceipt.notificationId
    : previousReceipt
      ? null
      : locator
        ? buildCaptureReceiptNotificationId(locator)
        : null;
  const notificationId = previousReceipt?.notificationId
    || actionableId
    || `${CAPTURE_RECEIPT_HOME_NOTIFICATION_PREFIX}${captureReceiptNonce()}`;
  const actionable = previousReceipt ? previousReceipt.actionable === true : Boolean(actionableId);
  const savedKind = ['page', 'link', 'note', 'image'].includes(options.savedKind)
    ? options.savedKind
    : 'item';
  const isWindow = Number.isInteger(result.count);
  let title = result.status === 'duplicate'
    ? copy.duplicateTitle
    : isWindow
      ? copy.windowTitle(result.count)
      : copy.itemTitles[savedKind];
  const outcome = [];
  if (isWindow) {
    if (result.closeSources !== true) {
      outcome.push(copy.windowStayed);
    } else {
      const closed = Math.max(0, Number(options.closedCount) || 0);
      const unconfirmed = Math.max(0, Number(options.unconfirmedCount) || 0);
      if (closed && unconfirmed) outcome.push(copy.windowPartial(closed, unconfirmed));
      else if (closed) outcome.push(copy.windowClosed(closed));
      else if (unconfirmed) outcome.push(copy.windowUnconfirmed(unconfirmed));
      outcome.push(copy.currentStayed);
    }
  } else if (options.sourceOutcome === 'closed') {
    outcome.push(copy.sourceClosed);
  } else if (options.sourceOutcome === 'stayed-open') {
    outcome.push(copy.sourceStayed);
  } else if (options.sourceOutcome === 'unconfirmed') {
    title = copy.unconfirmedTitle;
    outcome.push(copy.sourceUnconfirmed);
  }
  outcome.push(actionable
    ? (isWindow ? copy.openDestination : copy.openItem)
    : copy.openHome);
  return Object.freeze({
    notificationId,
    actionable,
    options: Object.freeze({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message: `${captureReceiptPath(result, copy)}\n${outcome.join(copy.sentenceSeparator)}`,
      priority: 0,
      silent: true,
    }),
  });
}

async function showBackgroundCaptureReceipt(result, options = {}) {
  const receipt = buildBackgroundCaptureReceipt(result, options);
  if (!receipt) return null;
  try {
    await createNativeNotification(receipt.notificationId, receipt.options);
    return receipt;
  } catch (error) {
    console.error('Could not show the accepted capture destination:', error);
    return null;
  }
}

async function updateBackgroundCaptureReceipt(receipt, result, options = {}) {
  const nextReceipt = buildBackgroundCaptureReceipt(result, options, receipt);
  if (!nextReceipt) return false;
  try {
    const updated = await updateNativeNotification(nextReceipt.notificationId, nextReceipt.options);
    if (updated === false) {
      console.error('Could not update the accepted capture destination: notification unavailable.');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Could not update the accepted capture destination:', error);
    return false;
  }
}

async function finishBackgroundItemCapture(result, { sourceTab = null, savedKind = 'item' } = {}) {
  if (result?.status === 'duplicate') {
    await showBackgroundCaptureReceipt(result, { savedKind });
    flash('dup', '#f97316');
    return result;
  }
  if (!result?.ok) return result;
  const initialSourceOutcome = sourceTab
    ? (result.closeSources === true ? 'unconfirmed' : 'stayed-open')
    : null;
  const receipt = await showBackgroundCaptureReceipt(result, {
    savedKind,
    sourceOutcome: initialSourceOutcome,
  });
  if (!receipt) {
    flash();
    return result;
  }
  if (sourceTab && result.closeSources === true && receipt.actionable === true) {
    const closeResult = await closeAcceptedBackgroundItemSource(result, sourceTab);
    const sourceOutcome = closeResult.closed
      ? 'closed'
      : 'unconfirmed';
    await updateBackgroundCaptureReceipt(receipt, result, { savedKind, sourceOutcome });
  }
  flash();
  return result;
}

async function finishBackgroundWindowCapture(result) {
  if (!result?.ok) return result;
  const pendingCloseCount = result.closeSources === true
    ? (result.sources || []).filter(source => source?.tabId !== result.initiatingTabId).length
    : 0;
  const receipt = await showBackgroundCaptureReceipt(result, {
    unconfirmedCount: pendingCloseCount,
  });
  if (!receipt) {
    flash(String(result.count));
    return result;
  }
  if (result.closeSources !== true || receipt.actionable !== true) {
    flash(String(result.count));
    return result;
  }
  const closeResult = await closeContextWindowSources(result);
  await updateBackgroundCaptureReceipt(receipt, result, {
    closedCount: closeResult.closed,
    unconfirmedCount: closeResult.unconfirmed,
  });
  flash(String(result.count));
  return result;
}

function captureReceiptRouteHash(state, parsed) {
  if (!state || !parsed) return null;
  try {
    if (parsed.kind === 'item') {
      const target = resolvePopupLocateSavedItem(state, {
        workspaceId: parsed.workspaceId,
        itemId: parsed.targetId,
      });
      return target ? buildPopupLocateHash(target.workspace.id, target.item.id) : null;
    }
    const target = resolvePopupWindowSaveGroup(state, {
      workspaceId: parsed.workspaceId,
      groupId: parsed.targetId,
    });
    return target ? buildPopupWindowSaveHash(target.workspace.id, target.group.id) : null;
  } catch {
    return null;
  }
}

function flash(text = '✓', color = '#22c55e') {
  try {
    chrome.action.setBadgeText({ text });
  } catch (error) {
    console.error('Could not show the capture badge:', error);
  }
  try {
    chrome.action.setBadgeBackgroundColor({ color });
  } catch (error) {
    console.error('Could not color the capture badge:', error);
  }
  try {
    setTimeout(() => {
      try {
        chrome.action.setBadgeText({ text: '' });
      } catch (error) {
        console.error('Could not clear the capture badge:', error);
      }
    }, 1400);
  } catch (error) {
    console.error('Could not schedule capture badge cleanup:', error);
  }
}

async function reportCaptureFailure(error, source) {
  console.error(`Locus ${source} capture failed:`, error);
  try { flash('!', '#ef4444'); } catch {}
  const conflict = error?.code === 'LOCUS_STATE_CONFLICT';
  const message = conflict
    ? 'Locus changed in another window. Nothing was closed. Click to open Locus, then retry.'
    : 'The capture was not saved and nothing was closed. Click to open Locus, check storage, then retry.';
  try {
    await chrome.notifications.create('te-capture-error-' + uid(), {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'Could not save to Locus',
      message,
      priority: 2
    });
  } catch (notificationError) {
    console.error('Could not show the Locus capture failure notification:', notificationError);
  }
}

// ─── Context Menus ────────────────────────────────────────────────────
// removeAll-then-create is idempotent. Bare create() calls would log
// "duplicate id" errors if onInstalled fires twice (profile sync, certain
// upgrade paths). Also re-registering on onStartup is defense-in-depth for
// rare cases where persisted menu state desyncs from the SW.
const MENU_ITEMS = [
  { id: 'te-save-page',      title: '💾 Save page to Locus',  contexts: ['page'] },
  { id: 'te-save-link',      title: '🔗 Save link to Locus',  contexts: ['link'] },
  { id: 'te-save-selection', title: '📝 Save selection as note',  contexts: ['selection'] },
  { id: 'te-save-image',     title: '🖼️ Save image',              contexts: ['image'] },
  { id: 'te-sep',            type: 'separator',                   contexts: ['page'] },
  { id: 'te-save-all',       title: '📚 Save eligible tabs in window', contexts: ['page'] }
];

function registerContextMenus() {
  chrome.contextMenus.removeAll(() => {
    for (const m of MENU_ITEMS) chrome.contextMenus.create(m);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  registerContextMenus();
  void requestReminderAlarmReconciliation('install');
});
chrome.runtime.onStartup.addListener(() => {
  registerContextMenus();
  void requestReminderAlarmReconciliation('browser-startup');
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
  if (info.menuItemId === 'te-save-page' && tab) {
    const result = await addToInbox({ type:'tab', title:tab.title||'Untitled', url:tab.url, fav:tab.favIconUrl||'' });
    await finishBackgroundItemCapture(result, { sourceTab: tab, savedKind: 'page' });
  } else if (info.menuItemId === 'te-save-link') {
    const result = await addToInbox({ type:'tab', title: info.selectionText || info.linkUrl, url: info.linkUrl, fav:'' });
    await finishBackgroundItemCapture(result, { savedKind: 'link' });
  } else if (info.menuItemId === 'te-save-selection') {
    const src = tab?.url ? `\n\n— from ${tab.url}` : '';
    const result = await addToInbox({ type:'note', html: escapeHtml(info.selectionText) + escapeHtml(src), color:null });
    await finishBackgroundItemCapture(result, { savedKind: 'note' });
  } else if (info.menuItemId === 'te-save-image') {
    const result = await addToInbox({ type:'tab', title: 'Image', url: info.srcUrl, fav:'' });
    await finishBackgroundItemCapture(result, { savedKind: 'image' });
  } else if (info.menuItemId === 'te-save-all' && tab) {
    const result = await saveContextWindow(tab);
    if (result.ok) await finishBackgroundWindowCapture(result);
    else if (result.status === 'empty') {
      flash('0', '#f97316');
    }
  }
  } catch (error) {
    await reportCaptureFailure(error, 'context-menu');
  }
});

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Keyboard shortcut: save current tab ──────────────────────────────
chrome.commands.onCommand.addListener(async (cmd) => {
  try {
    if (cmd === 'save-current-tab') {
      const matches = await chrome.tabs.query({ active: true, currentWindow: true });
      const eligible = (matches || []).filter(tab => Number.isInteger(tab?.id) && isCapturableUrl(tab.url));
      if (eligible.length > 1) {
        throw captureError('LOCUS_CAPTURE_SOURCE_UNAVAILABLE', 'Locus found more than one active source tab.');
      }
      const [tab] = eligible;
      if (!tab?.url) return;
      const result = await addToInbox({ type:'tab', title:tab.title||'Untitled', url:tab.url, fav:tab.favIconUrl||'' });
      await finishBackgroundItemCapture(result, { sourceTab: tab, savedKind: 'page' });
    }
  } catch (error) {
    await reportCaptureFailure(error, 'shortcut');
  }
});

// ─── Reminder alarms ──────────────────────────────────────────────────
function walkItems(items, id) {
  for (const it of (items || [])) {
    if (it && it.id === id) return it;
    if (it && it.type === 'stack' && it.items) {
      const r = walkItems(it.items, id);
      if (r) return r;
    }
  }
  return null;
}

function findItemById(state, id) {
  if (!state || !state.workspaces) return null;
  for (const ws of state.workspaces) {
    for (const cat of (ws.categories || [])) {
      for (const g of (cat.groups || [])) {
        const item = walkItems(g.items, id);
        if (item) return { item, ws, cat, group: g };
      }
    }
  }
  return null;
}

function findGroupById(state, id) {
  if (!state || !state.workspaces) return null;
  for (const ws of state.workspaces)
    for (const cat of (ws.categories || []))
      for (const g of (cat.groups || []))
        if (g.id === id) return g;
  return null;
}

function findCategoryById(state, id) {
  if (!state || !state.workspaces) return null;
  for (const ws of state.workspaces)
    for (const cat of (ws.categories || []))
      if (cat.id === id) return cat;
  return null;
}

const LOCUS_REMINDER_ALARM_PREFIXES = [
  'te-reminder-',
  'te-greminder2-',
  'te-creminder2-',
  'te-greminder-',
  'te-creminder-',
  'te-sub-'
];
const ENTITY_REMINDER_ALARM_PREFIXES = {
  group: 'te-greminder2-',
  category: 'te-creminder2-',
};
const LEGACY_ENTITY_REMINDER_ALARM_PREFIXES = {
  group: 'te-greminder-',
  category: 'te-creminder-',
};

function isStableEntityReminderId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 200;
}

function legacyEntityReminderAlarmName(kind, entId, index) {
  return `${LEGACY_ENTITY_REMINDER_ALARM_PREFIXES[kind]}${entId}-${index}`;
}

function entityReminderAlarmName(kind, entId, reminder, index) {
  if (!isStableEntityReminderId(reminder?.id)) return legacyEntityReminderAlarmName(kind, entId, index);
  return `${ENTITY_REMINDER_ALARM_PREFIXES[kind]}${encodeURIComponent(String(entId))}|${encodeURIComponent(reminder.id)}`;
}

function parseEntityReminderAlarmName(name) {
  const stableKind = typeof name === 'string' && name.startsWith(ENTITY_REMINDER_ALARM_PREFIXES.group)
    ? 'group'
    : (typeof name === 'string' && name.startsWith(ENTITY_REMINDER_ALARM_PREFIXES.category) ? 'category' : null);
  if (stableKind) {
    const rest = name.slice(ENTITY_REMINDER_ALARM_PREFIXES[stableKind].length);
    const separator = rest.indexOf('|');
    if (separator < 0 || rest.indexOf('|', separator + 1) >= 0) return null;
    try {
      const entId = decodeURIComponent(rest.slice(0, separator));
      const reminderId = decodeURIComponent(rest.slice(separator + 1));
      if (!entId || !isStableEntityReminderId(reminderId)) return null;
      return { kind: stableKind, entId, reminderId, legacyIndex: null };
    } catch {
      return null;
    }
  }
  const kind = typeof name === 'string' && name.startsWith(LEGACY_ENTITY_REMINDER_ALARM_PREFIXES.group)
    ? 'group'
    : (typeof name === 'string' && name.startsWith(LEGACY_ENTITY_REMINDER_ALARM_PREFIXES.category) ? 'category' : null);
  if (!kind) return null;
  const rest = name.slice(LEGACY_ENTITY_REMINDER_ALARM_PREFIXES[kind].length);
  const cut = rest.lastIndexOf('-');
  if (cut <= 0 || !/^\d+$/.test(rest.slice(cut + 1))) return null;
  return { kind, entId: rest.slice(0, cut), reminderId: null, legacyIndex: Number(rest.slice(cut + 1)) };
}

function isLocusReminderAlarm(name) {
  return typeof name === 'string' && LOCUS_REMINDER_ALARM_PREFIXES.some(prefix => name.startsWith(prefix));
}

function addFutureAlarm(expected, name, at, now) {
  const when = Number(at);
  if (Number.isFinite(when) && when > now) expected.set(name, when);
}

// Reconciliation does not replay missed occurrences. A past recurring reminder
// is re-armed at its first future wall-clock occurrence so browser restart or
// sleep cannot silently stop the series, while an overdue one-shot stays in the
// in-app Past Due list without producing a notification burst.
function addReminderAlarm(expected, name, reminder, now) {
  if (reminder?.notified) return;
  const when = Number(reminder?.at);
  if (!Number.isFinite(when)) return;
  if (when > now) {
    expected.set(name, when);
    return;
  }
  const next = nextRecurTime(when, reminder?.recur, now);
  if (Number.isFinite(next) && next > now) expected.set(name, next);
}

function addEntityReminderAlarms(expected, kind, entId, reminders, schema, now) {
  const idCounts = new Map();
  for (const reminder of reminders) {
    if (!isStableEntityReminderId(reminder?.id)) continue;
    idCounts.set(reminder.id, (idCounts.get(reminder.id) || 0) + 1);
  }
  reminders.forEach((reminder, index) => {
    if (!reminder) return;
    let name;
    if (isStableEntityReminderId(reminder.id) && idCounts.get(reminder.id) === 1) {
      name = entityReminderAlarmName(kind, entId, reminder, index);
    } else if ((Number(schema) || 0) < 12) {
      name = legacyEntityReminderAlarmName(kind, entId, index);
    } else {
      return;
    }
    addReminderAlarm(expected, name, reminder, now);
  });
}

function subscriptionReminderTime(sub) {
  if (!sub || sub.paused || sub.remind === false || typeof sub.nextBilling !== 'string') return null;
  const nextBilling = sub.nextBilling.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextBilling)) return null;
  const when = new Date(nextBilling + 'T09:00');
  when.setDate(when.getDate() - 3);
  const timestamp = when.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

// Derive the complete desired alarm set from persisted state. Reconciliation
// never mutates state, so it cannot conflict with the guarded revision writer.
function collectFutureReminderAlarms(state, now = Date.now()) {
  const expected = new Map();
  const validId = value => typeof value === 'string' && value.length > 0;

  const visitItems = items => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      if (validId(item.id) && item.reminder) {
        addReminderAlarm(expected, 'te-reminder-' + item.id, item.reminder, now);
      }
      if (item.type === 'stack') visitItems(item.items);
    }
  };

  for (const ws of (Array.isArray(state?.workspaces) ? state.workspaces : [])) {
    for (const cat of (Array.isArray(ws?.categories) ? ws.categories : [])) {
      if (validId(cat?.id) && Array.isArray(cat.reminders)) {
        addEntityReminderAlarms(expected, 'category', cat.id, cat.reminders, state?.schema, now);
      }
      for (const group of (Array.isArray(cat?.groups) ? cat.groups : [])) {
        if (validId(group?.id) && Array.isArray(group.reminders)) {
          addEntityReminderAlarms(expected, 'group', group.id, group.reminders, state?.schema, now);
        }
        visitItems(group?.items);
      }
    }
  }

  for (const sub of (Array.isArray(state?.subscriptions) ? state.subscriptions : [])) {
    if (!validId(sub?.id)) continue;
    addFutureAlarm(expected, 'te-sub-' + sub.id, subscriptionReminderTime(sub), now);
  }

  return expected;
}

function reconciliationError(operation, name, error) {
  return {
    operation,
    ...(name ? { name } : {}),
    message: String(error?.message || error || 'Unknown error')
  };
}

async function reconcileReminderAlarms(reason = 'manual') {
  const result = { ok: true, reason, expected: 0, scheduled: 0, staleCleared: 0, errors: [] };
  let state;
  let existing;

  try {
    state = await getState();
  } catch (error) {
    result.errors.push(reconciliationError('read-state', null, error));
  }
  if (!result.errors.length) {
    try {
      existing = await chrome.alarms.getAll();
    } catch (error) {
      result.errors.push(reconciliationError('list-alarms', null, error));
    }
  }

  if (!result.errors.length) {
    const expected = collectFutureReminderAlarms(state);
    result.expected = expected.size;

    const stale = existing.filter(alarm => isLocusReminderAlarm(alarm.name) && !expected.has(alarm.name));
    for (const alarm of stale) {
      try {
        if (await chrome.alarms.clear(alarm.name)) result.staleCleared += 1;
      } catch (error) {
        result.errors.push(reconciliationError('clear-stale', alarm.name, error));
      }
    }

    // create() replaces an alarm with the same name, making repeated runs
    // idempotent while also correcting a changed scheduled time.
    for (const [name, when] of expected) {
      try {
        await chrome.alarms.create(name, { when });
        result.scheduled += 1;
      } catch (error) {
        result.errors.push(reconciliationError('schedule', name, error));
      }
    }
  }

  result.ok = result.errors.length === 0;
  if (!result.ok) console.error('Locus reminder reconciliation failed:', result);
  return result;
}

// Serialize startup/install/import requests so each run observes state after
// the previous run and a post-import request cannot be lost behind startup work.
let reminderReconcileQueue = Promise.resolve();
function requestReminderAlarmReconciliation(reason) {
  const run = reminderReconcileQueue
    .then(() => reconcileReminderAlarms(reason))
    .catch(error => {
      const result = {
        ok: false,
        reason,
        expected: 0,
        scheduled: 0,
        staleCleared: 0,
        errors: [reconciliationError('unexpected', null, error)]
      };
      console.error('Locus reminder reconciliation failed:', result);
      return result;
    });
  reminderReconcileQueue = run;
  return run;
}

function resolvePopupLocateSavedItem(state, { workspaceId, itemId } = {}) {
  if (!state || typeof workspaceId !== 'string' || !workspaceId || typeof itemId !== 'string' || !itemId) return null;
  const workspaces = Array.isArray(state.workspaces) ? state.workspaces : [];
  const expectedWorkspaces = workspaces.filter(workspace => workspace?.id === workspaceId);
  if (expectedWorkspaces.length !== 1) return null;

  const matches = [];
  const seen = new Set();
  for (const workspace of workspaces) {
    const categories = workspace?.categories;
    if (categories != null && !Array.isArray(categories)) return null;
    for (const category of (categories || [])) {
      const groups = category?.groups;
      if (groups != null && !Array.isArray(groups)) return null;
      for (const group of (groups || [])) {
        const items = group?.items;
        if (items != null && !Array.isArray(items)) return null;
        const pending = items ? items.slice() : [];
        while (pending.length) {
          const item = pending.pop();
          if (!item || typeof item !== 'object' || seen.has(item)) continue;
          seen.add(item);
          if (item.id === itemId) matches.push({ workspace, category, group, item });
          if (item.items != null && !Array.isArray(item.items)) return null;
          if (item.items) {
            for (const child of item.items) pending.push(child);
          }
        }
      }
    }
  }
  if (matches.length !== 1 || matches[0].workspace !== expectedWorkspaces[0]) return null;
  const target = matches[0];
  const targetCategories = target.workspace.categories;
  if (targetCategories != null && !Array.isArray(targetCategories)) return null;
  const owningSpaces = (targetCategories || []).filter(space => space?.id === target.category?.id);
  return owningSpaces.length === 1 ? target : null;
}

function buildPopupLocateHash(workspaceId, itemId) {
  return `#/ws/${encodeURIComponent(workspaceId)}/home?item=${encodeURIComponent(itemId)}`;
}

function unavailableQuickCaptureItemReceipt() {
  return {
    ok: false,
    code: 'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE',
    destinationReady: false,
  };
}

function quickCaptureItemReceipt(state, intent) {
  try {
    const target = resolvePopupLocateSavedItem(state, intent);
    if (!target
      || target.item?.type !== 'tab'
      || typeof intent?.expectedUrl !== 'string'
      || !intent.expectedUrl
      || target.item.url !== intent.expectedUrl) {
      return unavailableQuickCaptureItemReceipt();
    }
    const destination = {
      workspaceId: target.workspace.id,
      categoryId: target.category.id,
      categoryName: target.category.name ?? '',
      groupId: target.group.id,
      groupName: target.group.name ?? '',
      itemId: target.item.id,
    };
    if (![destination.workspaceId, destination.categoryId, destination.groupId, destination.itemId]
      .every(value => typeof value === 'string' && value)
      || typeof destination.categoryName !== 'string'
      || typeof destination.groupName !== 'string') {
      return unavailableQuickCaptureItemReceipt();
    }
    return {
      ok: true,
      destinationReady: true,
      destination,
    };
  } catch (error) {
    console.error('Could not resolve accepted quick-capture destination:', error);
    return unavailableQuickCaptureItemReceipt();
  }
}

function failedPopupQuickCaptureActionResult(
  intent,
  code = 'LOCUS_QUICK_CAPTURE_ACTION_FAILED',
) {
  const action = intent?.action === 'close' ? 'close' : 'open';
  return {
    ok: false,
    code,
    action,
    destinationReady: false,
    closeRequested: action === 'close' || intent?.closeSource === true,
    sourceOutcome: 'not-attempted',
    ...(action === 'open' ? { routeReady: false } : {}),
  };
}

function unknownPopupQuickCaptureActionResult(intent) {
  const action = intent?.action === 'close' ? 'close' : 'open';
  return {
    ok: false,
    code: 'LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN',
    action,
    effectUnknown: true,
    closeRequested: action === 'close' || intent?.closeSource === true,
    sourceOutcome: 'unconfirmed',
  };
}

function popupQuickCaptureRouteMatches(tab, routeUrl) {
  if (!tab || typeof routeUrl !== 'string' || !routeUrl) return false;
  if (typeof tab.pendingUrl === 'string' && tab.pendingUrl !== routeUrl) return false;
  return tab.url === routeUrl || tab.pendingUrl === routeUrl;
}

async function confirmPopupQuickCaptureRoute(routeTabId, routeUrl) {
  try {
    const routeTab = await chrome.tabs.get(routeTabId);
    return popupQuickCaptureRouteMatches(routeTab, routeUrl)
      ? { ok: true }
      : { ok: false, code: 'LOCUS_QUICK_CAPTURE_ROUTE_CHANGED' };
  } catch (error) {
    console.error('Could not confirm the quick-capture recovery route:', error);
    return { ok: false, code: 'LOCUS_QUICK_CAPTURE_ROUTE_UNCONFIRMED' };
  }
}

async function performPopupOpenSavedItemDestination(intent, target) {
  const routeUrl = chrome.runtime.getURL('newtab.html')
    + buildPopupLocateHash(target.workspace.id, target.item.id);
  let routeTab;
  try {
    const existing = await chrome.tabs.query({});
    routeTab = existing.find(tab => tab?.url === routeUrl || tab?.pendingUrl === routeUrl) || null;
    if (!routeTab) {
      const createOptions = { url: routeUrl, active: false };
      if (Number.isInteger(intent?.sourceWindowId) && intent.sourceWindowId >= 0) {
        createOptions.windowId = intent.sourceWindowId;
      }
      try {
        routeTab = await chrome.tabs.create(createOptions);
      } catch (error) {
        if (!Object.hasOwn(createOptions, 'windowId')) throw error;
        routeTab = await chrome.tabs.create({ url: routeUrl, active: false });
      }
    }
  } catch (error) {
    console.error('Could not create the quick-capture recovery route:', error);
    return {
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_ROUTE_CREATE_FAILED',
      routeReady: false,
    };
  }
  if (!Number.isInteger(routeTab?.id)) {
    return {
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_ROUTE_CREATE_FAILED',
      routeReady: false,
    };
  }

  try {
    const activatedRoute = await activatePopupLocateTab(routeTab.id);
    if (!Number.isInteger(activatedRoute?.windowId)) {
      return {
        ok: false,
        code: 'LOCUS_QUICK_CAPTURE_ROUTE_ACTIVATE_FAILED',
        routeReady: false,
        routeCreated: true,
        routeTabId: routeTab.id,
      };
    }
    if (!popupQuickCaptureRouteMatches(activatedRoute, routeUrl)) {
      return {
        ok: false,
        code: 'LOCUS_QUICK_CAPTURE_ROUTE_CHANGED',
        routeReady: false,
        routeCreated: true,
        routeTabId: routeTab.id,
      };
    }
    const confirmedRoute = await confirmPopupQuickCaptureRoute(routeTab.id, routeUrl);
    if (!confirmedRoute.ok) {
      return {
        ok: false,
        code: confirmedRoute.code,
        routeReady: false,
        routeCreated: true,
        routeTabId: routeTab.id,
      };
    }
  } catch (error) {
    console.error('Could not activate the quick-capture recovery route:', error);
    return {
      ok: false,
      code: 'LOCUS_QUICK_CAPTURE_ROUTE_ACTIVATE_FAILED',
      routeReady: false,
      routeCreated: true,
      routeTabId: routeTab.id,
    };
  }
  return {
    ok: true,
    routeReady: true,
    routeCreated: true,
    routeTabId: routeTab.id,
  };
}

async function popupQuickCaptureSourceOutcome(intent, target, routeGuard = null) {
  if (!Number.isInteger(intent?.sourceTabId)
    || intent.sourceTabId < 0
    || !Number.isInteger(intent?.sourceWindowId)
    || intent.sourceWindowId < 0
    || typeof intent?.sourceWasActive !== 'boolean'
    || typeof intent?.expectedUrl !== 'string'
    || !intent.expectedUrl
    || target.item?.type !== 'tab'
    || target.item.url !== intent.expectedUrl) {
    return 'protected';
  }

  let source;
  try {
    source = await chrome.tabs.get(intent.sourceTabId);
  } catch (error) {
    console.error('Could not confirm the quick-capture source tab:', error);
    return 'unconfirmed';
  }
  if (!source
    || source.windowId !== intent.sourceWindowId
    || source.url !== intent.expectedUrl
    || (typeof source.pendingUrl === 'string' && source.pendingUrl !== intent.expectedUrl)
    || (intent.sourceWasActive === false && source.active === true)) {
    return 'protected';
  }
  if (routeGuard) {
    const confirmedRoute = await confirmPopupQuickCaptureRoute(
      routeGuard.routeTabId,
      routeGuard.routeUrl,
    );
    if (!confirmedRoute.ok) return confirmedRoute.code;
  }
  try {
    await chrome.tabs.remove(intent.sourceTabId);
    return 'closed';
  } catch (error) {
    console.error('Could not confirm closing the quick-capture source tab:', error);
    return 'unconfirmed';
  }
}

async function performPopupQuickCaptureAction(intent) {
  if (!['open', 'close'].includes(intent?.action)) {
    return failedPopupQuickCaptureActionResult(intent, 'LOCUS_QUICK_CAPTURE_ACTION_INVALID');
  }
  const authoritative = await getState();
  const receipt = quickCaptureItemReceipt(authoritative, intent);
  if (!receipt.destinationReady) {
    return failedPopupQuickCaptureActionResult(
      intent,
      'LOCUS_QUICK_CAPTURE_DESTINATION_UNAVAILABLE',
    );
  }
  const target = resolvePopupLocateSavedItem(authoritative, intent);
  const closeRequested = intent.action === 'close' || intent.closeSource === true;
  const base = {
    action: intent.action,
    destinationReady: true,
    destination: receipt.destination,
    closeRequested,
  };

  let routeResult = null;
  if (intent.action === 'open') {
    routeResult = await performPopupOpenSavedItemDestination(intent, target);
    if (routeResult.routeReady !== true) {
      return {
        ...base,
        ...routeResult,
        ok: false,
        sourceOutcome: 'not-attempted',
      };
    }
    if (!closeRequested) {
      return {
        ...base,
        ...routeResult,
        ok: true,
        sourceOutcome: 'not-requested',
      };
    }
  }

  const routeGuard = routeResult
    ? {
        routeTabId: routeResult.routeTabId,
        routeUrl: chrome.runtime.getURL('newtab.html')
          + buildPopupLocateHash(target.workspace.id, target.item.id),
      }
    : null;
  const sourceOutcome = await popupQuickCaptureSourceOutcome(intent, target, routeGuard);
  if (sourceOutcome === 'LOCUS_QUICK_CAPTURE_ROUTE_CHANGED'
    || sourceOutcome === 'LOCUS_QUICK_CAPTURE_ROUTE_UNCONFIRMED') {
    return {
      ...base,
      ...(routeResult || {}),
      ok: false,
      code: sourceOutcome,
      routeReady: false,
      sourceOutcome: 'not-attempted',
    };
  }
  const sourceComplete = sourceOutcome === 'closed';
  return {
    ...base,
    ...(routeResult || {}),
    ok: sourceComplete,
    ...(sourceComplete
      ? {}
      : {
          code: sourceOutcome === 'protected'
            ? 'LOCUS_QUICK_CAPTURE_SOURCE_PROTECTED'
            : 'LOCUS_QUICK_CAPTURE_SOURCE_UNCONFIRMED',
        }),
    sourceOutcome,
  };
}

function resolvePopupWindowSaveGroup(state, { workspaceId, groupId } = {}) {
  if (!state || typeof workspaceId !== 'string' || !workspaceId || typeof groupId !== 'string' || !groupId) return null;
  const workspaces = Array.isArray(state.workspaces) ? state.workspaces : [];
  const expectedWorkspaces = workspaces.filter(workspace => workspace?.id === workspaceId);
  if (expectedWorkspaces.length !== 1) return null;

  const matches = [];
  for (const workspace of workspaces) {
    for (const category of (workspace?.categories || [])) {
      for (const group of (category?.groups || [])) {
        if (group?.id === groupId) matches.push({ workspace, category, group });
      }
    }
  }
  if (matches.length !== 1 || matches[0].workspace !== expectedWorkspaces[0]) return null;
  const target = matches[0];
  const owningSpaces = (target.workspace.categories || []).filter(space => space?.id === target.category?.id);
  return owningSpaces.length === 1 ? target : null;
}

function buildPopupWindowSaveHash(workspaceId, groupId) {
  return `#/ws/${encodeURIComponent(workspaceId)}/group/${encodeURIComponent(groupId)}`;
}

function popupWindowSaveSources(intent) {
  const keepTabId = Number.isInteger(intent?.keepTabId) ? intent.keepTabId : null;
  const sources = [];
  const seen = new Set();
  for (const source of (Array.isArray(intent?.sourceTabs) ? intent.sourceTabs : [])) {
    const tabId = source?.tabId;
    if (!Number.isInteger(tabId)
      || tabId < 0
      || tabId === keepTabId
      || typeof source?.expectedUrl !== 'string'
      || !source.expectedUrl
      || seen.has(tabId)) continue;
    seen.add(tabId);
    sources.push({ tabId, expectedUrl: source.expectedUrl });
  }
  return sources;
}

function captureGroupTabItems(groupOrItems) {
  const rootItems = Array.isArray(groupOrItems) ? groupOrItems : groupOrItems?.items;
  const pending = Array.isArray(rootItems) ? [...rootItems] : [];
  const seen = new Set();
  const tabs = [];
  while (pending.length) {
    const item = pending.pop();
    if (!item || typeof item !== 'object' || seen.has(item)) continue;
    seen.add(item);
    if (item.type === 'tab' && typeof item.url === 'string' && item.url) tabs.push(item);
    if (Array.isArray(item.items)) {
      for (const child of item.items) pending.push(child);
    }
  }
  return tabs;
}

function popupWindowSaveGroupUrls(group) {
  return new Set(captureGroupTabItems(group).map(item => item.url));
}

function unavailablePopupWindowSaveResult(intent, code = 'LOCUS_WINDOW_SAVE_DESTINATION_UNAVAILABLE') {
  const sources = popupWindowSaveSources(intent);
  const closeRequested = intent?.closeSources === true;
  return {
    ok: false,
    code,
    destinationReady: false,
    closeRequested,
    requestedCount: sources.length,
    closedCount: 0,
    unconfirmedCount: closeRequested ? sources.length : 0,
  };
}

async function performPopupWindowSaveEffect(intent) {
  const authoritative = await getState();
  const target = resolvePopupWindowSaveGroup(authoritative, intent);
  if (!target) return unavailablePopupWindowSaveResult(intent);

  const sources = popupWindowSaveSources(intent);
  const closeRequested = intent?.closeSources === true;
  const result = {
    ok: true,
    destinationReady: true,
    destination: {
      workspaceId: target.workspace.id,
      categoryId: target.category.id,
      categoryName: String(target.category.name || ''),
      groupId: target.group.id,
      groupName: String(target.group.name || ''),
    },
    closeRequested,
    requestedCount: sources.length,
    closedCount: 0,
    unconfirmedCount: 0,
  };
  if (!closeRequested || !sources.length) return result;
  if (!Number.isInteger(intent?.sourceWindowId) || intent.sourceWindowId < 0) {
    return {
      ...result,
      ok: false,
      code: 'LOCUS_WINDOW_SAVE_SOURCE_UNAVAILABLE',
      unconfirmedCount: sources.length,
    };
  }

  const recoverableUrls = popupWindowSaveGroupUrls(target.group);
  for (const { tabId, expectedUrl } of sources) {
    if (!recoverableUrls.has(expectedUrl)) {
      result.unconfirmedCount++;
      continue;
    }
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab
        || tab.windowId !== intent.sourceWindowId
        || tab.active === true
        || tab.url !== expectedUrl
        || (typeof tab.pendingUrl === 'string' && tab.pendingUrl !== expectedUrl)) {
        result.unconfirmedCount++;
        continue;
      }
    } catch (error) {
      result.unconfirmedCount++;
      console.error('Could not confirm a saved window source tab:', error);
      continue;
    }
    try {
      await chrome.tabs.remove(tabId);
      result.closedCount++;
    } catch (error) {
      result.unconfirmedCount++;
      console.error('Could not confirm closing a saved window source tab:', error);
    }
  }
  if (result.unconfirmedCount > 0) {
    result.ok = false;
    result.code = 'LOCUS_WINDOW_SAVE_CLOSE_PARTIAL';
  }
  return result;
}

async function performPopupOpenWindowSaveDestination(intent) {
  const authoritative = await getState();
  const target = resolvePopupWindowSaveGroup(authoritative, intent);
  if (!target) return { ok: false, code: 'LOCUS_WINDOW_DESTINATION_UNAVAILABLE' };

  const routeUrl = chrome.runtime.getURL('newtab.html')
    + buildPopupWindowSaveHash(target.workspace.id, target.group.id);
  const query = Number.isInteger(intent?.sourceWindowId) && intent.sourceWindowId >= 0
    ? { windowId: intent.sourceWindowId }
    : { currentWindow: true };
  let routeTab;
  try {
    const existing = await chrome.tabs.query(query);
    routeTab = existing.find(tab => tab?.url === routeUrl || tab?.pendingUrl === routeUrl) || null;
    if (!routeTab) {
      const createOptions = { url: routeUrl, active: false };
      if (Number.isInteger(intent?.sourceWindowId) && intent.sourceWindowId >= 0) {
        createOptions.windowId = intent.sourceWindowId;
      }
      routeTab = await chrome.tabs.create(createOptions);
    }
  } catch (error) {
    console.error('Could not create the saved window destination route:', error);
    return { ok: false, code: 'LOCUS_WINDOW_DESTINATION_CREATE_FAILED' };
  }
  if (!Number.isInteger(routeTab?.id)) {
    return { ok: false, code: 'LOCUS_WINDOW_DESTINATION_CREATE_FAILED' };
  }

  try {
    const activatedRoute = await activatePopupLocateTab(routeTab.id);
    if (activatedRoute?.url !== routeUrl && activatedRoute?.pendingUrl !== routeUrl) {
      return { ok: false, code: 'LOCUS_WINDOW_DESTINATION_ROUTE_CHANGED' };
    }
  } catch (error) {
    console.error('Could not activate the saved window destination route:', error);
    return {
      ok: false,
      code: 'LOCUS_WINDOW_DESTINATION_ACTIVATE_FAILED',
      routeCreated: true,
      routeTabId: routeTab.id,
    };
  }
  return { ok: true, routeCreated: true, routeTabId: routeTab.id };
}

const POPUP_LOCATE_NOTICE = {
  en: {
    sourceOpenTitle: "Saved, but Locus couldn't close the tab",
    sourceOpenMessage: 'The saved item is open. Close the original tab manually if needed.',
    routeInactiveTitle: "Saved, but Locus couldn't switch tabs",
    routeInactiveMessage: 'The saved item is open in another tab. Switch to it manually.',
    routeInactiveSourceOpenTitle: "Saved, but some actions didn't finish",
    routeInactiveSourceOpenMessage: "The saved item is open in another tab, but Locus couldn't switch to it or close the original tab.",
  },
  'zh-TW': {
    sourceOpenTitle: '已儲存，但無法關閉原分頁',
    sourceOpenMessage: '已開啟儲存的項目；若不再需要原分頁，請手動關閉。',
    routeInactiveTitle: '已儲存，但無法切換分頁',
    routeInactiveMessage: '項目已在其他分頁開啟，請手動切換。',
    routeInactiveSourceOpenTitle: '已儲存，但部分操作未完成',
    routeInactiveSourceOpenMessage: '項目已在其他分頁開啟，但 Locus 無法切換到該分頁，也無法關閉原分頁。',
  },
};

const POPUP_LOCATE_NOTIFICATION_PREFIX = 'te-popup-locate-';

function popupLocateNotificationId(routeGuard) {
  return `${POPUP_LOCATE_NOTIFICATION_PREFIX}${routeGuard.routeTabId}|${routeGuard.routeWindowId}|${encodeURIComponent(routeGuard.routeUrl)}|${uid()}`;
}

function parsePopupLocateNotificationId(notificationId) {
  if (!String(notificationId || '').startsWith(POPUP_LOCATE_NOTIFICATION_PREFIX)) return null;
  const encoded = String(notificationId).slice(POPUP_LOCATE_NOTIFICATION_PREFIX.length);
  const parts = encoded.split('|');
  if (parts.length >= 3) {
    const routeTabId = Number(parts[0]);
    const routeWindowId = Number(parts[1]);
    let routeUrl;
    try {
      routeUrl = decodeURIComponent(parts[2]);
    } catch {
      return null;
    }
    return Number.isSafeInteger(routeTabId) && routeTabId >= 0
      && Number.isSafeInteger(routeWindowId) && routeWindowId >= 0
      && routeUrl
      ? { routeTabId, routeWindowId, routeUrl }
      : null;
  }
  const routeTabId = Number(encoded.split('-', 1)[0]);
  return Number.isSafeInteger(routeTabId) && routeTabId >= 0
    ? { routeTabId, routeWindowId: null, routeUrl: null }
    : null;
}

function popupLocateNoticeRouteMatches(tab, parsed, localNewTabUrl, { requireActive = true } = {}) {
  if (!tab || !parsed || tab.id !== parsed.routeTabId) return false;
  if (Number.isInteger(parsed.routeWindowId) && tab.windowId !== parsed.routeWindowId) return false;
  if (requireActive && tab.active !== true) return false;
  const pendingUrl = typeof tab.pendingUrl === 'string' ? tab.pendingUrl : '';
  return typeof parsed.routeUrl === 'string'
    && parsed.routeUrl.startsWith(localNewTabUrl)
    && tab.url === parsed.routeUrl
    && (!pendingUrl || pendingUrl === parsed.routeUrl);
}

async function showPopupLocateNotice(state, titleKey, messageKey, routeGuard) {
  const locale = appLocale(state);
  const copy = POPUP_LOCATE_NOTICE[locale] || POPUP_LOCATE_NOTICE.en;
  try {
    await chrome.notifications.create(popupLocateNotificationId(routeGuard), {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: copy[titleKey],
      message: copy[messageKey],
      priority: 1,
    });
    return true;
  } catch (error) {
    console.error('Could not show the popup Locate notice:', error);
    return false;
  }
}

async function activatePopupLocateTab(tabId) {
  const routeTab = await chrome.tabs.update(tabId, { active: true });
  if (Number.isInteger(routeTab?.windowId)) {
    try {
      await chrome.windows.update(routeTab.windowId, { focused: true });
    } catch (error) {
      const focusError = new Error('Locus activated the recovery tab but could not focus its window.');
      focusError.code = 'LOCUS_LOCATE_WINDOW_FOCUS_FAILED';
      focusError.routeTab = routeTab;
      focusError.windowError = error;
      throw focusError;
    }
  }
  return routeTab;
}

function popupLocateRouteMatches(tab, routeGuard, { requireActive = true } = {}) {
  if (!tab
    || !Number.isInteger(routeGuard?.routeTabId)
    || !Number.isInteger(routeGuard?.routeWindowId)
    || tab.id !== routeGuard.routeTabId
    || tab.windowId !== routeGuard.routeWindowId
    || (requireActive && tab.active !== true)) return false;
  const pendingUrl = typeof tab.pendingUrl === 'string' ? tab.pendingUrl : '';
  if (pendingUrl && pendingUrl !== routeGuard.routeUrl) return false;
  return tab.url === routeGuard.routeUrl || pendingUrl === routeGuard.routeUrl;
}

async function confirmPopupLocateRoute(routeGuard, options) {
  try {
    const routeTab = await chrome.tabs.get(routeGuard.routeTabId);
    if (!popupLocateRouteMatches(routeTab, routeGuard, options)) {
      return { ok: false, code: 'LOCUS_LOCATE_ROUTE_CHANGED' };
    }
    if (options?.requireCommitted === true && routeTab.url !== routeGuard.routeUrl) {
      return { ok: false, code: 'LOCUS_LOCATE_ROUTE_UNCONFIRMED' };
    }
    return { ok: true };
  } catch (error) {
    console.error('Could not confirm the popup Locate recovery route:', error);
    return { ok: false, code: 'LOCUS_LOCATE_ROUTE_UNCONFIRMED' };
  }
}

async function confirmPopupLocateSource(intent, target, routeGuard, expectedActive) {
  if (!Number.isInteger(intent?.sourceTabId)
    || intent.sourceTabId < 0
    || !Number.isInteger(intent?.sourceWindowId)
    || intent.sourceWindowId < 0
    || typeof intent?.sourceWasActive !== 'boolean'
    || typeof expectedActive !== 'boolean'
    || typeof intent?.expectedUrl !== 'string'
    || !intent.expectedUrl
    || target?.item?.type !== 'tab'
    || target.item.url !== intent.expectedUrl
    || intent.sourceTabId === routeGuard?.routeTabId) {
    return 'protected';
  }

  let source;
  try {
    source = await chrome.tabs.get(intent.sourceTabId);
  } catch (error) {
    console.error('Could not confirm the popup Locate source tab:', error);
    return 'unconfirmed';
  }
  if (!source
    || source.id !== intent.sourceTabId
    || source.windowId !== intent.sourceWindowId
    || source.active !== expectedActive
    || source.url !== intent.expectedUrl
    || (typeof source.pendingUrl === 'string'
      && source.pendingUrl
      && source.pendingUrl !== intent.expectedUrl)) {
    return 'protected';
  }
  return 'confirmed';
}

async function popupLocateSourceOutcome(intent, target, routeGuard) {
  const sourceConfirmation = await confirmPopupLocateSource(intent, target, routeGuard, false);
  if (sourceConfirmation !== 'confirmed') return sourceConfirmation;
  const confirmedRoute = await confirmPopupLocateRoute(routeGuard, { requireCommitted: true });
  if (!confirmedRoute.ok) return confirmedRoute.code;
  try {
    await chrome.tabs.remove(intent.sourceTabId);
    return 'closed';
  } catch (error) {
    console.error('Saved item opened, but the source tab close was not confirmed:', error);
    return 'unconfirmed';
  }
}

async function performPopupLocateSavedItem(intent) {
  const authoritative = await getState();
  const target = resolvePopupLocateSavedItem(authoritative, intent);
  if (!target) return { ok: false, code: 'LOCUS_LOCATE_TARGET_UNAVAILABLE' };

  const routeUrl = chrome.runtime.getURL('newtab.html')
    + buildPopupLocateHash(target.workspace.id, target.item.id);
  let routeTab;
  try {
    const createOptions = {
      url: routeUrl,
      active: false,
    };
    if (Number.isInteger(intent?.sourceWindowId)) createOptions.windowId = intent.sourceWindowId;
    routeTab = await chrome.tabs.create(createOptions);
  } catch (error) {
    console.error('Could not create the popup Locate route:', error);
    return { ok: false, code: 'LOCUS_LOCATE_CREATE_FAILED' };
  }
  if (!Number.isInteger(routeTab?.id)) return { ok: false, code: 'LOCUS_LOCATE_CREATE_FAILED' };

  let sourceClosed = null;
  let sourceCloseFailed = false;
  const routeGuard = {
    routeTabId: routeTab.id,
    routeWindowId: intent?.sourceWindowId,
    routeUrl,
  };
  let sourcePreflight = 'not-requested';
  if (intent?.closeSource === true) {
    sourceClosed = false;
    sourcePreflight = await confirmPopupLocateSource(
      intent,
      target,
      routeGuard,
      intent?.sourceWasActive,
    );
    sourceCloseFailed = sourcePreflight !== 'confirmed';
  }
  let activatedRoute;
  try {
    activatedRoute = await activatePopupLocateTab(routeTab.id);
  } catch (error) {
    console.error('Could not activate the popup Locate route:', error);
    if (intent?.closeSource === true) {
      sourceClosed = false;
      sourceCloseFailed = true;
    }
    const retryRoute = await confirmPopupLocateRoute(routeGuard, { requireActive: false });
    if (!retryRoute.ok) {
      return {
        ok: false,
        code: 'LOCUS_LOCATE_ACTIVATE_FAILED',
        routeCreated: false,
        sourceClosed,
        sourceCloseFailed,
      };
    }
    const noticePrefix = sourceCloseFailed ? 'routeInactiveSourceOpen' : 'routeInactive';
    await showPopupLocateNotice(authoritative, `${noticePrefix}Title`, `${noticePrefix}Message`, routeGuard);
    return {
      ok: false,
      code: 'LOCUS_LOCATE_ACTIVATE_FAILED',
      routeCreated: true,
      routeTabId: routeTab.id,
      routeWindowId: routeGuard.routeWindowId,
      routeUrl,
      sourceClosed,
      sourceCloseFailed,
    };
  }

  if (!popupLocateRouteMatches(activatedRoute, routeGuard)) {
    return {
      ok: false,
      code: 'LOCUS_LOCATE_ROUTE_CHANGED',
      routeCreated: false,
      sourceClosed: intent?.closeSource === true ? false : null,
      sourceCloseFailed: intent?.closeSource === true,
    };
  }
  const confirmedRoute = await confirmPopupLocateRoute(routeGuard);
  if (!confirmedRoute.ok) {
    return {
      ok: false,
      code: confirmedRoute.code,
      routeCreated: false,
      sourceClosed: intent?.closeSource === true ? false : null,
      sourceCloseFailed: intent?.closeSource === true,
    };
  }

  if (intent?.closeSource === true && Number.isInteger(intent.sourceTabId)) {
    sourceClosed = false;
    if (sourcePreflight === 'confirmed') {
      const sourceOutcome = await popupLocateSourceOutcome(intent, target, routeGuard);
      if (sourceOutcome === 'LOCUS_LOCATE_ROUTE_CHANGED'
        || sourceOutcome === 'LOCUS_LOCATE_ROUTE_UNCONFIRMED') {
        return {
          ok: false,
          code: sourceOutcome,
          routeCreated: false,
          sourceClosed: false,
          sourceCloseFailed: true,
        };
      }
      sourceClosed = sourceOutcome === 'closed';
      sourceCloseFailed = !sourceClosed;
    }
  }

  if (sourceCloseFailed) {
    const noticeShown = await showPopupLocateNotice(
      authoritative,
      'sourceOpenTitle',
      'sourceOpenMessage',
      routeGuard,
    );
    return {
      ok: false,
      code: 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED',
      routeCreated: true,
      routeTabId: routeGuard.routeTabId,
      routeWindowId: routeGuard.routeWindowId,
      routeUrl,
      destination: {
        workspaceId: target.workspace.id,
        categoryId: target.category.id,
        categoryName: target.category.name,
        groupId: target.group.id,
        groupName: target.group.name,
        itemId: target.item.id,
      },
      sourceClosed: false,
      sourceCloseFailed: true,
      noticeShown,
    };
  }
  return { ok: true, routeCreated: true, sourceClosed, sourceCloseFailed };
}

function unknownPopupLocateEffectResult(intent) {
  return {
    ok: false,
    code: 'LOCUS_LOCATE_EFFECT_UNKNOWN',
    effectUnknown: true,
    closeRequested: intent?.closeSource === true,
  };
}

async function handleStateWriteMessage(message) {
  const revision = await setState(message.state);
  const response = { ok: true, revision };
  if (message.quickCaptureItem) {
    response.quickCaptureResult = quickCaptureItemReceipt(message.state, message.quickCaptureItem);
  }
  if (message.reconcileReminders === true) {
    response.reminderReconciliation = await requestReminderAlarmReconciliation('state-write');
  }
  return response;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'locus-state-write') {
    handleStateWriteMessage(message)
      .then(sendResponse)
      .catch(error => sendResponse(serializeStateWriteError(error)));
    return true;
  }
  if (message?.type === 'locus-complete-popup-locate') {
    // This request can only be dispatched after the popup knows its save was
    // accepted. Keep all fresh route/source checks under the writer FIFO.
    enqueueStateWrite(() => performPopupLocateSavedItem(message))
      .then(sendResponse)
      .catch(error => {
        console.error('Popup Locate effects failed after the save was accepted:', error);
        sendResponse(unknownPopupLocateEffectResult(message));
      });
    return true;
  }
  if (message?.type === 'locus-complete-window-save') {
    // Hold the same FIFO/Web Lock as whole-state writes from fresh destination
    // resolution through source removal, so recoverable content cannot change
    // between validation and the destructive browser effect.
    enqueueStateWrite(() => performPopupWindowSaveEffect(message))
      .then(sendResponse)
      .catch(error => {
        console.error('Popup window-save effects failed after the save was accepted:', error);
        sendResponse(unavailablePopupWindowSaveResult(message, 'LOCUS_WINDOW_SAVE_EFFECT_FAILED'));
      });
    return true;
  }
  if (message?.type === 'locus-complete-quick-capture') {
    // The result card is already showing an accepted save. Hold the graph
    // mutation boundary while fresh identity and the live source tab are checked,
    // so an explicit Open/Close can never remove an unrecoverable source.
    enqueueStateWrite(() => performPopupQuickCaptureAction(message))
      .then(sendResponse)
      .catch(error => {
        console.error('Quick-capture recovery action failed:', error);
        sendResponse(unknownPopupQuickCaptureActionResult(message));
      });
    return true;
  }
  if (message?.type === 'locus-open-window-save-destination') {
    performPopupOpenWindowSaveDestination(message)
      .then(sendResponse)
      .catch(error => {
        console.error('Popup window destination request failed:', error);
        sendResponse({ ok: false, code: 'LOCUS_WINDOW_DESTINATION_FAILED' });
      });
    return true;
  }
  if (message?.type === 'reconcile-reminders') {
    requestReminderAlarmReconciliation('runtime-message')
      .then(sendResponse)
      .catch(error => sendResponse({
        ok: false,
        reason: 'runtime-message',
        errors: [reconciliationError('unexpected', null, error)]
      }));
    return true;
  }
  return undefined;
});

// Script evaluation is the service-worker startup boundary. onInstalled and
// onStartup request another serialized, idempotent pass for their event scope.
void requestReminderAlarmReconciliation('service-worker-start');

// Advance a recurring reminder to its next fire time strictly after now.
// Returns null when the reminder doesn't recur or has passed its `until` bound.
// If the service worker slept through several cycles we skip straight to the
// next future occurrence rather than firing a burst of catch-up notifications.
function nextRecurTime(at, recur, now = Date.now()) {
  const start = Number(at);
  const cutoff = Number(now);
  if (!Number.isFinite(start) || !Number.isFinite(cutoff)) return null;
  if (!['day', 'week', 'month'].includes(recur?.every)) return null;
  const rawInterval = Number(recur.interval);
  const interval = Number.isFinite(rawInterval) ? Math.max(1, Math.trunc(rawInterval)) : 1;
  const base = new Date(start);
  const hour = base.getHours();
  const minute = base.getMinutes();
  const second = base.getSeconds();
  const millisecond = base.getMilliseconds();
  const monthlyDay = base.getDate();
  // Keep nominal calendar coordinates independent of local-offset transitions.
  // The UTC cursor is never itself an occurrence; it only carries year/month/day.
  const cursor = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate(), 12));
  const until = Number(recur.until);
  const hasUntil = recur.until != null && recur.until !== '';
  if (hasUntil && !Number.isFinite(until)) return null;

  while (true) {
    if (recur.every === 'month') {
      cursor.setUTCDate(1);
      cursor.setUTCMonth(cursor.getUTCMonth() + interval);
    } else {
      cursor.setUTCDate(cursor.getUTCDate() + interval * (recur.every === 'week' ? 7 : 1));
    }

    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const day = recur.every === 'month' ? monthlyDay : cursor.getUTCDate();
    const candidate = new Date(year, month, day, hour, minute, second, millisecond);
    const ts = candidate.getTime();
    if (!Number.isFinite(ts)) return null;
    if (hasUntil && ts > until) return null;

    // A civil time can disappear during a DST jump (or an entire date-line
    // transition), and some months lack the requested day. Skip that occurrence
    // instead of accepting Date's forward normalization and permanently drifting.
    const exactWallTime = candidate.getFullYear() === year
      && candidate.getMonth() === month
      && candidate.getDate() === day
      && candidate.getHours() === hour
      && candidate.getMinutes() === minute
      && candidate.getSeconds() === second
      && candidate.getMilliseconds() === millisecond;
    if (exactWallTime && ts > cutoff) return ts;
  }
}

// Alarm names can outlive a reminder edit or deletion. Accept the event only when
// its scheduled occurrence still belongs to the current reminder. This also
// accepts a future occurrence that startup reconciliation derived from an older
// stored recurrence without mutating that recurrence ahead of delivery.
function reminderMatchesAlarm(reminder, alarm) {
  if (reminder?.notified) return false;
  const at = Number(reminder?.at);
  const scheduledTime = Number(alarm?.scheduledTime);
  if (!Number.isFinite(at) || !Number.isFinite(scheduledTime)) return false;
  if (at === scheduledTime) return true;
  const occurrence = nextRecurTime(at, reminder?.recur, scheduledTime - 1);
  return Number.isFinite(occurrence) && occurrence === scheduledTime;
}

async function showReminderAttention(alarmName, title, message) {
  try {
    await chrome.notifications.create('te-reminder-error-' + uid(), {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
      priority: 2
    });
  } catch (error) {
    console.error('Could not show the Locus reminder warning:', alarmName, error);
  }
}

async function reconcileAfterReminderDelivery(alarmName) {
  const result = await requestReminderAlarmReconciliation('reminder-delivered');
  if (result.ok) return result;

  await showReminderAttention(
    alarmName,
    'Reminder scheduling needs attention',
    'Locus could not finish updating reminder alarms. Open Locus to review them.',
  );
  return result;
}

async function recoverAfterReminderWriteFailure(alarmName, error) {
  // The failed candidate is never retried. Re-read authority and rebuild the alarm
  // map from it so a consumed recurring alarm does not silently end the series.
  const result = await requestReminderAlarmReconciliation('reminder-delivery-write-failed');
  const quotaWarningAlreadyShown = /quota/i.test(String(error?.message || error));
  if (!quotaWarningAlreadyShown || !result.ok) {
    await showReminderAttention(
      alarmName,
      'Reminder update needs attention',
      result.ok
        ? 'The reminder was shown, but Locus could not save its status. Open Locus to review it.'
        : 'The reminder was shown, but Locus could not save its status or restore its alarms. Open Locus to review them.',
    );
  }
  return result;
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    if (alarm.name.startsWith('te-reminder-')) {
      const itemId = alarm.name.slice('te-reminder-'.length);
      const s = await getState();
      if (!s) return;
      const found = findItemById(s, itemId);
      if (!found) return;
      const { item: it } = found;
      if (!reminderMatchesAlarm(it.reminder, alarm)) return;
      await createNativeNotification('te-notif-' + itemId, reminderNoticeOptions(s, found, it.reminder.at));
      // Recurring reminders re-arm for their next occurrence; one-shots are
      // marked notified so they stop surfacing as pending.
      // A repeating reminder also records the occurrence that just fired
      // (firedAt, optional), so Today and the in-Locus card can show it without
      // guessing; a series that has not started yet has no firedAt.
      const itNext = nextRecurTime(it.reminder.at, it.reminder.recur);
      if (itNext != null) {
        it.reminder.firedAt = Number(alarm.scheduledTime) || it.reminder.at;
        it.reminder.at = itNext;
        it.reminder.notified = false;
      } else it.reminder.notified = true;
      try {
        await setState(s);
      } catch (error) {
        await recoverAfterReminderWriteFailure(alarm.name, error);
        return;
      }
      await reconcileAfterReminderDelivery(alarm.name);
    } else if (alarm.name.startsWith('te-greminder2-') || alarm.name.startsWith('te-creminder2-')
      || alarm.name.startsWith('te-greminder-') || alarm.name.startsWith('te-creminder-')) {
      // Stable names encode both the owning entity and reminder id. Legacy
      // index names are accepted only while authority is older than schema 12.
      const parsed = parseEntityReminderAlarmName(alarm.name);
      if (!parsed) return;
      const isGroup = parsed.kind === 'group';
      const s = await getState();
      if (!s) return;
      const ent = isGroup ? findGroupById(s, parsed.entId) : findCategoryById(s, parsed.entId);
      if (!ent || !Array.isArray(ent.reminders)) return;
      let r;
      if (parsed.reminderId) {
        const matches = ent.reminders.filter(reminder => reminder?.id === parsed.reminderId);
        if (matches.length !== 1) return;
        [r] = matches;
      } else {
        if ((Number(s.schema) || 0) >= 12) return;
        r = ent.reminders[parsed.legacyIndex];
      }
      if (!reminderMatchesAlarm(r, alarm)) return;
      const notificationIdentity = parsed.reminderId
        ? `${encodeURIComponent(parsed.entId)}|${encodeURIComponent(parsed.reminderId)}`
        : `${parsed.entId}-${parsed.legacyIndex}`;
      await createNativeNotification((isGroup ? 'te-gnotif-' : 'te-cnotif-') + notificationIdentity,
        entityReminderNoticeOptions(s, ent, r, r.at));
      const next = nextRecurTime(r.at, r.recur);
      if (next != null) { r.at = next; r.notified = false; } else { r.notified = true; }
      try {
        await setState(s);
      } catch (error) {
        await recoverAfterReminderWriteFailure(alarm.name, error);
        return;
      }
      await reconcileAfterReminderDelivery(alarm.name);
    } else if (alarm.name.startsWith('te-sub-')) {
      const subId = alarm.name.slice('te-sub-'.length);
      const s = await getState();
      if (!s?.subscriptions) return;
      const sub = s.subscriptions.find(x => x.id === subId);
      if (!sub) return;
      const sym = ({ USD:'$', EUR:'€', GBP:'£', TWD:'NT$', JPY:'¥', CNY:'¥', KRW:'₩' })[sub.currency] || '$';
      chrome.notifications.create('te-sub-notif-' + subId, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: '💳 Subscription renewing in 3 days',
        message: `${sub.name} • ${sym}${Number(sub.cost).toFixed(2)} • ${sub.nextBilling}`,
        priority: 2
      });
    }
  } catch (err) {
    console.error('Locus alarm failed:', alarm.name, err);
  }
});

// System reminders can't take Locus styling, so they carry what matters: the
// Locus icon, the task title, when and where it is due, and two answers. A to-do
// offers Done and Snooze 10 min; a page or note offers Snooze 10 min.
const REMINDER_SNOOZE_MS = 10 * 60000;
const REMINDER_NOTICE_COPY = {
  en: {
    due: (time, place) => (place ? `Due ${time} · ${place}` : `Due ${time}`),
    done: 'Done',
    snooze: 'Snooze 10 min',
    untitled: 'Reminder',
    failedTitle: 'Reminder update needs attention',
    failedBody: 'Locus could not save that answer. Open Locus to review the reminder.',
  },
  'zh-TW': {
    due: (time, place) => (place ? `${time} 到期 · ${place}` : `${time} 到期`),
    done: '完成',
    snooze: '10 分鐘後再提醒',
    untitled: '提醒',
    failedTitle: '提醒需要確認',
    failedBody: 'Locus 無法儲存這個回覆，請開啟 Locus 查看提醒。',
  },
};

function reminderNoticeCopy(state) {
  return REMINDER_NOTICE_COPY[appLocale(state)] || REMINDER_NOTICE_COPY.en;
}

function reminderNoticeOptions(state, found, at) {
  const copy = reminderNoticeCopy(state);
  const it = found.item;
  const rawTitle = it.type === 'tab' ? (it.title || it.url || '') : stripHtml(it.html || it.text || '');
  const title = String(rawTitle).replace(/\s+/g, ' ').trim().slice(0, 120) || copy.untitled;
  const locale = appLocale(state) === 'zh-TW' ? 'zh-TW' : 'en-GB';
  const time = new Date(at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const place = String(found.cat?.name || '').trim();
  return {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title,
    message: copy.due(time, place),
    priority: 2,
    ...(reminderNoticeActions(it).length
      ? { buttons: reminderNoticeActions(it).map(action => ({ title: copy[action] })) }
      : {}),
  };
}

// Group and Space reminders read like item reminders: the label (or the
// group/Space name) as the title and "Due HH:MM · <name>" in the user's
// language. They carry no answer buttons: Done and Snooze belong to items.
function entityReminderNoticeOptions(state, ent, r, at) {
  const copy = reminderNoticeCopy(state);
  const name = String(ent?.name || '').replace(/\s+/g, ' ').trim();
  const title = String(r?.label || '').replace(/\s+/g, ' ').trim().slice(0, 120) || name.slice(0, 120) || copy.untitled;
  const locale = appLocale(state) === 'zh-TW' ? 'zh-TW' : 'en-GB';
  const time = new Date(at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title,
    message: copy.due(time, name),
    priority: 2,
  };
}

// The answers a notice offers. Snooze moves a one-off reminder; a repeating
// reminder has already re-armed its next occurrence when it fires, and moving
// it would shift the whole series, so it offers Done (to-dos) only.
function reminderNoticeActions(it) {
  const repeating = !!(it?.reminder && it.reminder.recur);
  const actions = [];
  if (it?.type === 'todo') actions.push('done');
  if (!repeating) actions.push('snooze');
  return actions;
}

// Answer a reminder from its system notification. The change goes through the
// same serialized state writer as every other background write, then alarms are
// reconciled so a snoozed reminder fires again.
async function answerReminderNotice(notifId, buttonIndex, now = Date.now()) {
  if (typeof notifId !== 'string' || !notifId.startsWith('te-notif-')) return { ok: false, reason: 'not-a-reminder' };
  const itemId = notifId.slice('te-notif-'.length);
  const s = await getState();
  const found = s ? findItemById(s, itemId) : null;
  if (!found) {
    await clearNativeNotification(notifId).catch(() => {});
    return { ok: false, reason: 'missing' };
  }
  const it = found.item;
  const action = reminderNoticeActions(it)[buttonIndex];
  if (!action) {
    await clearNativeNotification(notifId).catch(() => {});
    return { ok: false, reason: 'no-action' };
  }
  // A notice stays in the notification centre after its reminder is moved.
  // Snooze applies only to the occurrence that fired (still marked notified);
  // a reminder changed since then is left alone, and so is a to-do already
  // finished (on the in-Locus card, Today, or another device).
  if (action === 'snooze' && (it.done === true || !(it.reminder && it.reminder.notified === true && !it.reminder.recur))) {
    await clearNativeNotification(notifId).catch(() => {});
    return { ok: false, reason: 'stale', action };
  }
  if (action === 'done') {
    if (it.done === true) {
      await clearNativeNotification(notifId).catch(() => {});
      return { ok: true, action, changed: false };
    }
    it.done = true;
  } else {
    const reminder = it.reminder && typeof it.reminder === 'object' ? it.reminder : {};
    it.reminder = Object.assign({}, reminder, { at: now + REMINDER_SNOOZE_MS, notified: false });
  }
  try {
    await setState(s);
  } catch (error) {
    const copy = reminderNoticeCopy(s);
    await showReminderAttention(notifId, copy.failedTitle, copy.failedBody);
    return { ok: false, reason: 'write', action };
  }
  await requestReminderAlarmReconciliation('reminder-notice-' + action);
  await clearNativeNotification(notifId).catch(() => {});
  return { ok: true, action, changed: true };
}

if (chrome.notifications?.onButtonClicked?.addListener) {
  chrome.notifications.onButtonClicked.addListener((notifId, buttonIndex) => {
    answerReminderNotice(notifId, buttonIndex).catch(error => console.error('Could not answer the Locus reminder:', error));
  });
}

function stripHtml(html) {
  return String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// Delivery and actionable failure notifications all open the local new-tab app.
const NOTIF_OPEN_PREFIXES = ['te-notif-', 'te-gnotif-', 'te-cnotif-', 'te-sub-notif-', 'te-storage-quota-', 'te-capture-error-', 'te-reminder-error-', POPUP_LOCATE_NOTIFICATION_PREFIX, CAPTURE_RECEIPT_NOTIFICATION_PREFIX, CAPTURE_RECEIPT_HOME_NOTIFICATION_PREFIX];

async function openConfirmedNotificationContinuation(expectedUrl) {
  const created = await chrome.tabs.create({ url: expectedUrl });
  if (!Number.isInteger(created?.id) || created.id < 0) return null;
  const confirmed = await chrome.tabs.get(created.id);
  if (!confirmed
      || confirmed.id !== created.id
      || !Number.isInteger(confirmed.windowId)
      || confirmed.windowId < 0
      || confirmed.active !== true) return null;
  if (confirmed.pendingUrl != null && typeof confirmed.pendingUrl !== 'string') return null;
  const pendingUrl = typeof confirmed.pendingUrl === 'string' ? confirmed.pendingUrl : '';
  if (pendingUrl && pendingUrl !== expectedUrl) return null;
  return confirmed.url === expectedUrl || pendingUrl === expectedUrl ? confirmed : null;
}

chrome.notifications.onClicked.addListener(async (notifId) => {
  if (!NOTIF_OPEN_PREFIXES.some(p => notifId.startsWith(p))) return;
  const localNewTabUrl = chrome.runtime.getURL('newtab.html');
  let fallbackUrl = localNewTabUrl;
  try {
    if (notifId.startsWith(CAPTURE_RECEIPT_NOTIFICATION_PREFIX)) {
      const parsed = parseCaptureReceiptNotificationId(notifId);
      if (parsed) {
        try {
          const authoritative = await getState();
          const routeHash = captureReceiptRouteHash(authoritative, parsed);
          if (routeHash) fallbackUrl = `${localNewTabUrl}${routeHash}`;
        } catch (error) {
          console.error('Could not resolve the saved capture destination:', error);
        }
      }
    } else if (notifId.startsWith(POPUP_LOCATE_NOTIFICATION_PREFIX)) {
      const parsed = parsePopupLocateNotificationId(notifId);
      if (parsed) {
        if (parsed.routeUrl?.startsWith(localNewTabUrl)) fallbackUrl = parsed.routeUrl;
        try {
          const current = await chrome.tabs.get(parsed.routeTabId);
          if (popupLocateNoticeRouteMatches(current, parsed, localNewTabUrl, { requireActive: false })) {
            const activated = await activatePopupLocateTab(parsed.routeTabId);
            if (popupLocateNoticeRouteMatches(activated, parsed, localNewTabUrl)) {
              const focused = await chrome.tabs.get(parsed.routeTabId);
              if (popupLocateNoticeRouteMatches(focused, parsed, localNewTabUrl)) {
                await clearNativeNotification(notifId);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Could not return to the popup Locate tab:', error);
        }
      }
    }
    const continuation = await openConfirmedNotificationContinuation(fallbackUrl);
    if (!continuation) return;
    await clearNativeNotification(notifId);
  } catch (error) {
    console.error('Could not open Locus from notification:', error);
  }
});
