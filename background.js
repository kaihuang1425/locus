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

async function ensureDefault(s) {
  if (!s) {
    s = { workspaces: [], activeWsId: null, archive: [], settings: {} };
  }
  if (!s.settings) s.settings = {};
  s.settings.language = normalizeLanguage(s.settings.language || browserLanguage());
  if (!s.workspaces?.length) {
    const cat = { id: uid(), name: 'Quicklinks', groups: [] };
    const inbox = { id: uid(), name: 'Inbox', symbol: '📥', color: '#6366f1', collapsed: false, items: [] };
    cat.groups.push(inbox);
    s.workspaces = [{ id: uid(), name: 'My Workspace', symbol: '🏠', categories: [cat], activeCatId: cat.id }];
    s.activeWsId = s.workspaces[0].id;
  }
  return s;
}

function captureFields(s, tab, url = tab?.url) {
  const settings = s?.settings || {};
  let fallback = url || 'Untitled';
  try { fallback = new URL(url).hostname || fallback; } catch {}
  return {
    title: settings.captureIncludeTitle !== false ? (tab?.title || fallback) : fallback,
    fav: settings.captureIncludeFavicon !== false ? (tab?.favIconUrl || tab?.fav || '') : ''
  };
}

function resolveCaptureTarget(s, { useLast = true } = {}) {
  const settings = s.settings || {};
  if (useLast && settings.captureRememberLast !== false && settings.captureLastTarget?.groupId) {
    for (const ws of (s.workspaces || [])) {
      for (const cat of (ws.categories || [])) {
        const group = (cat.groups || []).find(g => g.id === settings.captureLastTarget.groupId);
        if (group) return { ws, cat, group };
      }
    }
  }
  let ws = (s.workspaces || []).find(w => (w.categories || []).some(c => c.id === settings.captureDefaultCategoryId));
  ws = ws || s.workspaces.find(w => w.id === s.activeWsId) || s.workspaces[0];
  let cat = (ws.categories || []).find(c => c.id === settings.captureDefaultCategoryId);
  cat = cat || (ws.categories || []).find(c => c.id === ws.activeCatId) || ws.categories[0];
  if (!cat) return null;
  let group = (cat.groups || []).find(g => g.name === 'Inbox');
  if (!group) {
    group = { id: uid(), name: 'Inbox', symbol: '📥', color: '#6366f1', collapsed: false, items: [] };
    cat.groups = cat.groups || [];
    cat.groups.unshift(group);
  }
  return { ws, cat, group };
}

async function addToInbox(item) {
  let s = await getState();
  s = await ensureDefault(s);
  const target = resolveCaptureTarget(s);
  if (!target) return false;
  const inbox = target.group;
  if (item.type === 'tab' && s.settings.captureDeduplicate !== false && inbox.items.find(it => it.type === 'tab' && it.url === item.url)) {
    return false;
  }
  if (item.type === 'tab') {
    const meta = captureFields(s, item, item.url);
    item.title = meta.title;
    item.fav = meta.fav;
  }
  if (!item.createdAt) item.createdAt = Date.now();
  inbox.items.push(item);
  await setState(s);
  return true;
}

async function closeCapturedTabIfEnabled(tabId) {
  if (tabId == null) return;
  let s;
  try {
    s = await getState();
  } catch (error) {
    console.error('Could not confirm close-after-save setting; leaving the captured tab open.', error);
    return;
  }
  if (s?.settings?.closeTabOnSave === false) return;
  try { await chrome.tabs.remove(tabId); } catch {}
}

function flash(text = '✓', color = '#22c55e') {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1400);
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
    const ok = await addToInbox({ id: uid(), type:'tab', title:tab.title||'Untitled', url:tab.url, fav:tab.favIconUrl||'' });
    if (ok) { flash(); await closeCapturedTabIfEnabled(tab.id); }
  } else if (info.menuItemId === 'te-save-link') {
    const ok = await addToInbox({ id: uid(), type:'tab', title: info.selectionText || info.linkUrl, url: info.linkUrl, fav:'' });
    if (ok) flash(); else flash('dup', '#f97316');
  } else if (info.menuItemId === 'te-save-selection') {
    const src = tab?.url ? `\n\n— from ${tab.url}` : '';
    const ok = await addToInbox({ id: uid(), type:'note', html: escapeHtml(info.selectionText) + escapeHtml(src), color:null });
    if (ok) flash(); else flash('dup', '#f97316');
  } else if (info.menuItemId === 'te-save-image') {
    const ok = await addToInbox({ id: uid(), type:'tab', title: 'Image', url: info.srcUrl, fav:'' });
    if (ok) flash(); else flash('dup', '#f97316');
  } else if (info.menuItemId === 'te-save-all' && tab) {
    let s = await getState();
    s = await ensureDefault(s);
    const target = resolveCaptureTarget(s);
    const cat = target?.cat;
    if (!cat) return;
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const valid = tabs.filter(t => t.url && !t.url.startsWith('chrome') && !t.url.startsWith('edge') && !t.url.startsWith('about'));
    const now = new Date();
    cat.groups.push({
      id: uid(), symbol:'💾', color:'#06b6d4', collapsed:false,
      name: `Session ${now.toLocaleDateString(appLocale(s), { month:'short', day:'numeric' })} ${now.toLocaleTimeString(appLocale(s), { hour:'2-digit', minute:'2-digit' })}`,
      items: valid.map(t => { const meta = captureFields(s, t); return { id: uid(), type:'tab', title:meta.title, url:t.url, fav:meta.fav, createdAt:Date.now() }; })
    });
    await setState(s);
    flash(String(valid.length));
    if (s.settings?.closeTabOnSave !== false) {
      for (const captured of valid) {
        if (captured.id === tab.id) continue;
        try { await chrome.tabs.remove(captured.id); } catch {}
      }
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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) return;
      if (tab.url.startsWith('chrome') || tab.url.startsWith('edge') || tab.url.startsWith('about')) return;
      const ok = await addToInbox({ id: uid(), type:'tab', title:tab.title||'Untitled', url:tab.url, fav:tab.favIconUrl||'' });
      if (ok) { flash(); await closeCapturedTabIfEnabled(tab.id); }
      else flash('dup', '#f97316');
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
  'te-greminder-',
  'te-creminder-',
  'te-sub-'
];

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
  const when = Number(reminder?.at);
  if (!Number.isFinite(when)) return;
  if (when > now) {
    expected.set(name, when);
    return;
  }
  const next = nextRecurTime(when, reminder?.recur, now);
  if (Number.isFinite(next) && next > now) expected.set(name, next);
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
        cat.reminders.forEach((reminder, index) => {
          if (reminder) addReminderAlarm(expected, `te-creminder-${cat.id}-${index}`, reminder, now);
        });
      }
      for (const group of (Array.isArray(cat?.groups) ? cat.groups : [])) {
        if (validId(group?.id) && Array.isArray(group.reminders)) {
          group.reminders.forEach((reminder, index) => {
            if (reminder) addReminderAlarm(expected, `te-greminder-${group.id}-${index}`, reminder, now);
          });
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'locus-state-write') {
    setState(message.state)
      .then(revision => sendResponse({ ok: true, revision }))
      .catch(error => sendResponse(serializeStateWriteError(error)));
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
  if (!recur || !recur.every) return null;
  const interval = Math.max(1, recur.interval || 1);
  const step = (ts) => {
    const d = new Date(ts);
    if (recur.every === 'day') d.setDate(d.getDate() + interval);
    else if (recur.every === 'week') d.setDate(d.getDate() + 7 * interval);
    else if (recur.every === 'month') d.setMonth(d.getMonth() + interval);
    else return null;
    return d.getTime();
  };
  let ts = step(at);
  while (ts != null && ts <= now) ts = step(ts);
  if (ts != null && recur.until && ts > recur.until) return null;
  return ts;
}

// Alarm names can outlive a reminder edit or deletion. Accept the event only when
// its scheduled occurrence still belongs to the current reminder. This also
// accepts a future occurrence that startup reconciliation derived from an older
// stored recurrence without mutating that recurrence ahead of delivery.
function reminderMatchesAlarm(reminder, alarm) {
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
      const title = it.type === 'tab' ? it.title : (it.type === 'todo' ? 'To-do reminder' : 'Note reminder');
      const msg = it.type === 'tab' ? (it.url || '') : (stripHtml(it.html || it.text || '').slice(0, 120));
      await chrome.notifications.create('te-notif-' + itemId, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: '⏰ ' + title,
        message: msg,
        priority: 2
      });
      // Recurring reminders re-arm for their next occurrence; one-shots are
      // marked notified so they stop surfacing as pending.
      const itNext = nextRecurTime(it.reminder.at, it.reminder.recur);
      if (itNext != null) { it.reminder.at = itNext; it.reminder.notified = false; }
      else it.reminder.notified = true;
      try {
        await setState(s);
      } catch (error) {
        await recoverAfterReminderWriteFailure(alarm.name, error);
        return;
      }
      await reconcileAfterReminderDelivery(alarm.name);
    } else if (alarm.name.startsWith('te-greminder-') || alarm.name.startsWith('te-creminder-')) {
      // Group / category reminders (§6). The alarm name is
      // `te-greminder-<groupId>-<index>` (or `te-creminder-<catId>-<index>`);
      // the index is the last dash-segment, so parsing from the right stays
      // correct even when the entity id itself contains dashes.
      const isGroup = alarm.name.startsWith('te-greminder-');
      const rest = alarm.name.slice((isGroup ? 'te-greminder-' : 'te-creminder-').length);
      const cut = rest.lastIndexOf('-');
      if (cut < 0) return;
      const entId = rest.slice(0, cut);
      const idx = parseInt(rest.slice(cut + 1), 10);
      if (!Number.isInteger(idx)) return;
      const s = await getState();
      if (!s) return;
      const ent = isGroup ? findGroupById(s, entId) : findCategoryById(s, entId);
      if (!ent || !Array.isArray(ent.reminders)) return;
      const r = ent.reminders[idx];
      if (!reminderMatchesAlarm(r, alarm)) return;
      await chrome.notifications.create((isGroup ? 'te-gnotif-' : 'te-cnotif-') + entId + '-' + idx, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: '⏰ ' + (r.label || ent.name || (isGroup ? 'Group reminder' : 'Category reminder')),
        message: (isGroup ? 'Group: ' : 'Category: ') + (ent.name || ''),
        priority: 2
      });
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

function stripHtml(html) {
  return String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// Delivery and actionable failure notifications all open the local new-tab app.
const NOTIF_OPEN_PREFIXES = ['te-notif-', 'te-gnotif-', 'te-cnotif-', 'te-sub-notif-', 'te-storage-quota-', 'te-capture-error-', 'te-reminder-error-'];
chrome.notifications.onClicked.addListener(async (notifId) => {
  if (!NOTIF_OPEN_PREFIXES.some(p => notifId.startsWith(p))) return;
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
    await chrome.notifications.clear(notifId);
  } catch (error) {
    console.error('Could not open Locus from notification:', error);
  }
});
