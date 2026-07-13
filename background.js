/* ═══ Locus background.js ═══ */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const normalizeLanguage = value => /^zh(?:[-_]|$)/i.test(String(value || '').trim()) ? 'zh-TW' : 'en';
const browserLanguage = () => {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const lang = nav.languages?.[0] || nav.language || 'en';
  return normalizeLanguage(lang);
};
const appLocale = s => normalizeLanguage(s?.settings?.language || browserLanguage());

async function getState() {
  const d = await chrome.storage.local.get('te');
  return d.te || null;
}
async function setState(s) {
  try {
    await chrome.storage.local.set({ te: s });
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
  const s = await getState();
  if (s?.settings?.closeTabOnSave === false) return;
  try { await chrome.tabs.remove(tabId); } catch {}
}

function flash(text = '✓', color = '#22c55e') {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1400);
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
  { id: 'te-save-all',       title: '📚 Save all tabs in window', contexts: ['page'] }
];

function registerContextMenus() {
  chrome.contextMenus.removeAll(() => {
    for (const m of MENU_ITEMS) chrome.contextMenus.create(m);
  });
}

chrome.runtime.onInstalled.addListener(registerContextMenus);
chrome.runtime.onStartup.addListener(registerContextMenus);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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
});

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Keyboard shortcut: save current tab ──────────────────────────────
chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd === 'save-current-tab') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    if (tab.url.startsWith('chrome') || tab.url.startsWith('edge') || tab.url.startsWith('about')) return;
    const ok = await addToInbox({ id: uid(), type:'tab', title:tab.title||'Untitled', url:tab.url, fav:tab.favIconUrl||'' });
    if (ok) { flash(); await closeCapturedTabIfEnabled(tab.id); }
    else flash('dup', '#f97316');
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

// Advance a recurring reminder to its next fire time strictly after now.
// Returns null when the reminder doesn't recur or has passed its `until` bound.
// If the service worker slept through several cycles we skip straight to the
// next future occurrence rather than firing a burst of catch-up notifications.
function nextRecurTime(at, recur) {
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
  const now = Date.now();
  while (ts != null && ts <= now) ts = step(ts);
  if (ts != null && recur.until && ts > recur.until) return null;
  return ts;
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
      const title = it.type === 'tab' ? it.title : (it.type === 'todo' ? 'To-do reminder' : 'Note reminder');
      const msg = it.type === 'tab' ? (it.url || '') : (stripHtml(it.html || it.text || '').slice(0, 120));
      chrome.notifications.create('te-notif-' + itemId, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: '⏰ ' + title,
        message: msg,
        priority: 2
      });
      // Recurring reminders re-arm for their next occurrence; one-shots are
      // marked notified so they stop surfacing as pending.
      let itNext = null;
      if (it.reminder) {
        itNext = nextRecurTime(it.reminder.at, it.reminder.recur);
        if (itNext != null) { it.reminder.at = itNext; it.reminder.notified = false; }
        else it.reminder.notified = true;
      }
      await setState(s);
      if (itNext != null) { try { await chrome.alarms.create(alarm.name, { when: itNext }); } catch {} }
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
      if (!r) return;
      chrome.notifications.create((isGroup ? 'te-gnotif-' : 'te-cnotif-') + entId + '-' + idx, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: '⏰ ' + (r.label || ent.name || (isGroup ? 'Group reminder' : 'Category reminder')),
        message: (isGroup ? 'Group: ' : 'Category: ') + (ent.name || ''),
        priority: 2
      });
      const next = nextRecurTime(r.at, r.recur);
      if (next != null) { r.at = next; r.notified = false; } else { r.notified = true; }
      await setState(s);
      if (next != null) { try { await chrome.alarms.create(alarm.name, { when: next }); } catch {} }
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

// Click notification → open Locus. Subscription and storage-quota
// notifications previously did nothing on click — now they all open newtab.
const NOTIF_OPEN_PREFIXES = ['te-notif-', 'te-gnotif-', 'te-cnotif-', 'te-sub-notif-', 'te-storage-quota-'];
chrome.notifications.onClicked.addListener((notifId) => {
  if (!NOTIF_OPEN_PREFIXES.some(p => notifId.startsWith(p))) return;
  chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
  chrome.notifications.clear(notifId);
});
