/* Locus popup.js */
const $ = id => document.getElementById(id);
const esc = s => !s ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dispUrl = u => { try { return new URL(u).hostname; } catch { return u || ''; } };
const isProto = u => !u || u.startsWith('chrome') || u.startsWith('edge') || u.startsWith('about');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const normalizeLanguage = value => /^zh(?:[-_]|$)/i.test(String(value || '').trim()) ? 'zh-TW' : 'en';
const browserLanguage = () => normalizeLanguage(navigator.languages?.[0] || navigator.language || 'en');

const I18N = {
  en: {
    openLocus: 'Open Locus', back: 'Back', searchTabs: 'Search open tabs…', currentWindow: 'Current window',
    tabs: 'tabs', saveWindow: 'Save window', hibernateWindow: 'Hibernate window', loadingTabs: 'Loading tabs…',
    retry: 'Try again', loadError: 'Locus could not read this window.', noTabs: 'No saveable tabs in this window.',
    noMatches: 'No tabs match your search.', moreTabs: n => `+ ${n} more tabs`, fewerTabs: 'Show fewer tabs',
    destination: 'Destination', change: 'Change', saveTab: 'Save tab', chooseDestination: 'Choose destination',
    noWorkspaces: 'No workspaces yet. Open Locus to get started.', noGroups: 'No groups yet.',
    hibernateExplainer: 'Hibernate replaces eligible tabs with packaged placeholders that you can continue from later.', scope: 'Scope',
    thisWindow: 'This window', allWindows: 'All windows', options: 'Options', keepPinned: 'Keep pinned tabs awake',
    keepAudio: 'Keep tabs playing audio awake', hibernate: 'Hibernate', privacyProof: 'Profile-local; export before uninstalling or deleting the profile.',
    viewing: 'Viewing', save: 'Save', hibernateTab: 'Hibernate this tab', openTab: 'Open tab', idle: n => `${n} idle`,
    openFirst: 'Open the full workspace first', alreadySaved: 'Already saved', saved: 'Saved!',
    couldNotHibernate: 'Could not hibernate tab', tabHibernated: 'Tab hibernated',
    hibernated: n => n === 1 ? 'Hibernated 1 tab' : `Hibernated ${n} tabs`, cannotSave: "This tab can't be saved",
    savedTabs: n => `Saved ${n} ${n === 1 ? 'tab' : 'tabs'}`, savedTabsClosed: n => `Saved ${n} tabs · load when opened`,
    session: 'Session', unnamedTab: 'Untitled tab',
    saveOptions: 'Save options', saveLinksOnly: 'Save links only', saveLinksOnlyDesc: 'Lightweight and fast',
    saveLinksGroup: 'Save links + tab group', saveLinksGroupDesc: 'Keep tabs organized as a group',
    saveQueue: 'Save as reading queue', saveQueueDesc: 'Review later in Read Later',
    closeAfterSave: 'Close tabs after saving', addNote: 'Add note', notePlaceholder: 'A note saved alongside these tabs…',
    suggestedTags: 'Suggested tags', addTag: '+ Add tag', localFirst: 'No Locus account or host permissions.',
    video: 'Video', pdf: 'PDF', more: 'More', moreSubtitle: 'Local tools and browser actions',
    saveCurrentTab: 'Save current tab', saveCurrentTabDesc: 'Save only this tab',
    importBookmarks: 'Import bookmarks', importBookmarksDesc: 'Bring browser bookmarks into this Space',
    keyboardShortcuts: 'Keyboard shortcuts', keyboardShortcutsDesc: 'Review or change extension shortcuts',
    moreLocalProof: "These actions use browser APIs and this profile's Locus data.",
    selectTab: title => `Select ${title}`, deselectTab: title => `Deselect ${title}`,
    selectedTabs: 'Selected', selectedCount: n => n === 1 ? '1 tab selected' : `${n} tabs selected`,
    saveBeforeHibernate: 'Save links to Locus before hibernating',
    importedBookmarks: n => n === 1 ? 'Imported 1 bookmark' : `Imported ${n} bookmarks`,
    noBookmarks: 'No saveable bookmarks found', bookmarkImportFailed: 'Could not import bookmarks',
    bookmarksUnavailable: 'Bookmarks are unavailable', saveBeforeFailed: 'Links could not be saved; nothing was hibernated',
    hibernatedAndSaved: (hibernated, saved) => `Saved ${saved} new · hibernated ${hibernated}`
  },
  'zh-TW': {
    openLocus: '開啟 Locus', back: '返回', searchTabs: '搜尋開啟的分頁…', currentWindow: '目前視窗',
    tabs: '個分頁', saveWindow: '儲存視窗', hibernateWindow: '休眠視窗', loadingTabs: '正在載入分頁…',
    retry: '再試一次', loadError: 'Locus 無法讀取這個視窗。', noTabs: '這個視窗沒有可儲存的分頁。',
    noMatches: '沒有符合搜尋的分頁。', moreTabs: n => `另有 ${n} 個分頁`, fewerTabs: '顯示較少分頁',
    destination: '儲存位置', change: '變更', saveTab: '儲存分頁', chooseDestination: '選擇儲存位置',
    noWorkspaces: '尚無工作區。請先開啟 Locus 開始使用。', noGroups: '尚無群組。',
    hibernateExplainer: '休眠會將符合條件的分頁換成封裝預留頁，之後可從預留頁繼續。', scope: '範圍',
    thisWindow: '這個視窗', allWindows: '所有視窗', options: '選項', keepPinned: '讓釘選分頁保持啟用',
    keepAudio: '讓播放音訊的分頁保持啟用', hibernate: '休眠', privacyProof: '設定檔本機資料；解除安裝或刪除設定檔前請先匯出。',
    viewing: '檢視中', save: '儲存', hibernateTab: '休眠此分頁', openTab: '開啟分頁', idle: n => `${n} 個閒置`,
    openFirst: '請先開啟完整工作區', alreadySaved: '已儲存', saved: '已儲存！',
    couldNotHibernate: '無法休眠分頁', tabHibernated: '分頁已休眠',
    hibernated: n => `已休眠 ${n} 個分頁`, cannotSave: '無法儲存此分頁',
    savedTabs: n => `已儲存 ${n} 個分頁`, savedTabsClosed: n => `已儲存 ${n} 個分頁 · 開啟時載入`,
    session: '工作階段', unnamedTab: '未命名分頁',
    saveOptions: '儲存方式', saveLinksOnly: '只儲存連結', saveLinksOnlyDesc: '輕量、快速',
    saveLinksGroup: '儲存連結＋分頁群組', saveLinksGroupDesc: '以群組保持分頁井然有序',
    saveQueue: '存為閱讀佇列', saveQueueDesc: '之後在「稍後閱讀」中檢閱',
    closeAfterSave: '儲存後關閉分頁', addNote: '加入備註', notePlaceholder: '隨這些分頁一併儲存的備註…',
    suggestedTags: '建議標籤', addTag: '＋新增標籤', localFirst: '沒有 Locus 帳號或主機權限。',
    video: '影片', pdf: 'PDF', more: '更多', moreSubtitle: '本機工具與瀏覽器操作',
    saveCurrentTab: '儲存目前分頁', saveCurrentTabDesc: '只儲存這個分頁',
    importBookmarks: '匯入書籤', importBookmarksDesc: '將瀏覽器書籤匯入這個空間',
    keyboardShortcuts: '鍵盤快速鍵', keyboardShortcutsDesc: '查看或變更擴充功能快速鍵',
    moreLocalProof: '這些操作使用瀏覽器 API 與此設定檔中的 Locus 資料。',
    selectTab: title => `選取「${title}」`, deselectTab: title => `取消選取「${title}」`,
    selectedTabs: '已選取', selectedCount: n => `已選取 ${n} 個分頁`,
    saveBeforeHibernate: '休眠前先將連結儲存到 Locus',
    importedBookmarks: n => `已匯入 ${n} 個書籤`, noBookmarks: '找不到可儲存的書籤',
    bookmarkImportFailed: '無法匯入書籤', bookmarksUnavailable: '無法使用書籤功能',
    saveBeforeFailed: '無法儲存連結，因此未休眠任何分頁',
    hibernatedAndSaved: (hibernated, saved) => `已新增儲存 ${saved} 個，並休眠 ${hibernated} 個分頁`
  }
};

Object.assign(I18N.en, {
  captureConflict: 'Locus changed in another window. Your tabs were left untouched. Open Locus, then retry.',
  captureFailed: 'Save failed. Your tabs were left untouched. Open Locus, then retry.',
  captureUnknown: 'Locus could not confirm the save. Reopen Locus before retrying; the source tab may stay open.',
  captureBusy: 'Another save is still being confirmed. Your tabs were left untouched.',
  locateAfterSave: 'Open saved item in Locus',
  savedTitle: 'Saved',
  done: 'Close',
  switchToSavedItem: 'Switch to saved item',
  locateFailed: destination => `Saved to ${destination}, but the saved item couldn't be opened. Locus did not close the source tab.`,
  locateRouteInactive: destination => `Saved to ${destination}. The saved item is open in another tab, but Locus couldn't switch to it.`,
  locateRouteInactiveSourceOpen: destination => `Saved to ${destination}. The saved item is open in another tab, but Locus couldn't switch to it or close the source tab.`,
  openLocusRetryFailed: destination => `Saved to ${destination}, but Locus still couldn't open. Try again.`,
  switchToSavedItemFailed: destination => `Saved to ${destination}. Locus still couldn't switch to the saved item. Switch tabs manually or try again.`
});
Object.assign(I18N['zh-TW'], {
  captureConflict: 'Locus 已在其他視窗變更。分頁完全未受影響。請開啟 Locus 後再試。',
  captureFailed: '儲存失敗。分頁完全未受影響。請開啟 Locus 後再試。',
  captureUnknown: 'Locus 無法確認是否已儲存。請重新開啟 Locus 後再試；原分頁可能仍開啟。',
  captureBusy: '另一項儲存仍在確認中。分頁完全未受影響。',
  locateAfterSave: '儲存後在 Locus 開啟項目',
  savedTitle: '已儲存',
  done: '關閉',
  switchToSavedItem: '切換到已儲存項目',
  locateFailed: destination => `已儲存到「${destination}」，但無法開啟這個項目。Locus 未關閉原分頁。`,
  locateRouteInactive: destination => `已儲存到「${destination}」。項目已在其他分頁開啟，但 Locus 無法切換到該分頁。`,
  locateRouteInactiveSourceOpen: destination => `已儲存到「${destination}」。項目已在其他分頁開啟，但 Locus 無法切換到該分頁，也未關閉原分頁。`,
  openLocusRetryFailed: destination => `已儲存到「${destination}」，但仍無法開啟 Locus，請再試一次。`,
  switchToSavedItemFailed: destination => `已儲存到「${destination}」。Locus 仍無法切換到已儲存項目，請手動切換分頁或再試一次。`
});

let all = [];
let state = null;
let pendingTab = null;
let activeTabId = null;
let tabsExpanded = false;
let activeSection = 'main-section';
let sectionOpener = null;
let toastTimer = null;
// The destination picker serves three flows: saving one tab now ('tab'),
// changing the resolved destination from the main view ('destination'), and
// picking where a window save lands ('window').
let pickerMode = 'tab';
// Session-scoped destination override (group id) — survives even when
// captureRememberLast is off, because it is an explicit choice made just now.
let destinationOverrideGroupId = null;
let windowSaveTargetGroupId = null;
let hibernateTargetGroupId = null;
let swSelectedTags = new Set();
let selectedTabIds = new Set();
let popupStateWriteQueue = Promise.resolve();
let popupStateWriteFailureEpoch = 0;
let popupCapturePending = false;
let popupStateRecoveryRequired = false;
let locateResultVisible = false;
let locateRecoveryTabId = null;
let popupCaptureControl = null;

const isPopupStateRecoveryError = error => [
  'LOCUS_STATE_UNKNOWN_ACK',
  'LOCUS_STATE_PROTOCOL',
  'LOCUS_STATE_QUEUE_INVALIDATED',
].includes(error?.code);

const isMissingPopupStateWriteReceiver = error =>
  /Receiving end does not exist\.?$/i.test(String(error?.message || error || '').trim());
const configuredPopupReceiverRetryMs = Number(globalThis.LOCUS_STATE_RECEIVER_RETRY_MS);
const popupReceiverRetryMs = Number.isFinite(configuredPopupReceiverRetryMs) && configuredPopupReceiverRetryMs >= 0
  ? Math.min(configuredPopupReceiverRetryMs, 1000)
  : 150;
const configuredPopupStateWriteTimeoutMs = Number(globalThis.LOCUS_STATE_WRITE_TIMEOUT_MS);
const popupStateWriteTimeoutMs = Number.isFinite(configuredPopupStateWriteTimeoutMs) && configuredPopupStateWriteTimeoutMs > 0
  ? configuredPopupStateWriteTimeoutMs
  : 10000;

async function sendPopupStateWriteMessage(candidate, retryAllowed = () => true, { locateSavedItem = null } = {}) {
  let missingReceiver = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, popupReceiverRetryMs * attempt));
      if (!retryAllowed()) throw missingReceiver;
    }
    try {
      return await chrome.runtime.sendMessage({
        type: 'locus-state-write',
        state: candidate,
        ...(locateSavedItem ? { locateSavedItem } : {}),
      });
    } catch (error) {
      // This exact rejection means no listener accepted the message. Retrying
      // any other transport failure could duplicate an already committed write.
      if (!isMissingPopupStateWriteReceiver(error) || !retryAllowed()) {
        if (!isMissingPopupStateWriteReceiver(error)) {
          const unknown = new Error(String(error?.message || error || 'Locus could not confirm the save.'));
          unknown.code = 'LOCUS_STATE_UNKNOWN_ACK';
          if (error && typeof error === 'object' && error.code != null) unknown.nativeCode = error.code;
          throw unknown;
        }
        throw error;
      }
      missingReceiver = error;
    }
  }
  const error = new Error('Locus could not reach its background service. Reopen Locus; if this repeats, reload the extension from the browser Extensions page.');
  error.code = 'LOCUS_STATE_RECEIVER_UNAVAILABLE';
  error.receiverError = String(missingReceiver?.message || missingReceiver || '');
  throw error;
}

async function persistPopupState({ locateSavedItem = null } = {}) {
  if (!state) return;
  // Capture the graph at call time. A queued write must never read a later
  // rollback from the mutable popup state and mistake that graph for its own
  // successful capture.
  const candidate = clonePopupState();
  const enqueuedFailureEpoch = popupStateWriteFailureEpoch;
  const requestWrite = async () => {
    if (enqueuedFailureEpoch !== popupStateWriteFailureEpoch) {
      const error = new Error('An earlier Locus save failed, so this queued save was cancelled. Reopen the popup, then retry.');
      error.code = 'LOCUS_STATE_QUEUE_INVALIDATED';
      throw error;
    }
    const localRevision = Number(state?._revision) || 0;
    candidate._revision = localRevision;
    let receiptTimer = null;
    let receiverRetryOpen = true;
    try {
      const receiptTimeout = new Promise((_, reject) => {
        receiptTimer = setTimeout(() => {
          const error = new Error('Locus could not confirm this save in time. Reopen Locus before retrying.');
          error.code = 'LOCUS_STATE_UNKNOWN_ACK';
          reject(error);
        }, popupStateWriteTimeoutMs);
      });
      const response = await Promise.race([
        sendPopupStateWriteMessage(candidate, () => receiverRetryOpen, { locateSavedItem }),
        receiptTimeout,
      ]);
      if (!response?.ok) {
        const error = new Error(response?.message || 'Locus could not confirm this save. Reopen the popup, then retry.');
        error.code = response ? (response.code || 'LOCUS_STATE_WRITE_FAILED') : 'LOCUS_STATE_UNKNOWN_ACK';
        throw error;
      }
      const nextRevision = Number(response.revision);
      if (!Number.isSafeInteger(nextRevision) || nextRevision !== localRevision + 1) {
        const error = new Error('Locus received an invalid save confirmation. Reopen the popup before retrying.');
        error.code = 'LOCUS_STATE_PROTOCOL';
        throw error;
      }
      state._revision = nextRevision;
      return response;
    } finally {
      receiverRetryOpen = false;
      if (receiptTimer != null) clearTimeout(receiptTimer);
    }
  };
  const run = popupStateWriteQueue.then(requestWrite);
  popupStateWriteQueue = run.then(
    () => undefined,
    () => { popupStateWriteFailureEpoch++; },
  );
  return run;
}

const appLocale = () => normalizeLanguage(state?.settings?.language || browserLanguage());
const tr = (key, ...args) => {
  const dict = I18N[appLocale()] || I18N.en;
  const value = dict[key] ?? I18N.en[key] ?? key;
  return typeof value === 'function' ? value(...args) : value;
};

function beginPopupCapture() {
  if (popupStateRecoveryRequired) {
    showCaptureFailure({ code: 'LOCUS_STATE_UNKNOWN_ACK' });
    return false;
  }
  if (popupCapturePending) {
    toast(tr('captureBusy'));
    return false;
  }
  popupCapturePending = true;
  popupCaptureControl = document.activeElement?.closest?.('button, input, textarea') || null;
  popupCaptureControl?.setAttribute('aria-busy', 'true');
  $('popup')?.setAttribute('aria-busy', 'true');
  document.body.classList.add('capture-pending');
  return true;
}

function finishPopupCapture() {
  popupCapturePending = false;
  popupCaptureControl?.removeAttribute('aria-busy');
  popupCaptureControl = null;
  $('popup')?.setAttribute('aria-busy', 'false');
  document.body.classList.remove('capture-pending');
}

const THEME_IDS = new Set(['folio', 'folio-dark', 'tabento', 'tabento-dark', 'dark', 'aurora', 'light', 'dracula', 'nord', 'rose-pine', 'tokyo-night', 'solarized-dark', 'solarized-light', 'gruvbox', 'catppuccin', 'sepia', 'mono']);
const THEME_ALIASES = { stow: 'folio', 'stow-dark': 'folio-dark' };

function applyAppearance() {
  let theme = THEME_ALIASES[state?.settings?.theme] || state?.settings?.theme || 'folio';
  if (theme === 'auto') theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'folio-dark' : 'folio';
  if (!THEME_IDS.has(theme)) theme = 'folio';
  document.documentElement.dataset.theme = theme;
  document.documentElement.lang = appLocale();
  document.body.dataset.anim = state?.settings?.animate === false ? 'off' : 'on';
  const name = String(state?.settings?.profile?.name || 'Locus').trim();
  $('profile-initial').textContent = Array.from(name)[0]?.toUpperCase() || 'L';
}

function applyLocale() {
  document.querySelectorAll('[data-pop-i18n]').forEach(el => { el.textContent = tr(el.dataset.popI18n); });
  document.querySelectorAll('[data-pop-placeholder]').forEach(el => { el.placeholder = tr(el.dataset.popPlaceholder); });
  document.querySelectorAll('[data-pop-title]').forEach(el => {
    const value = tr(el.dataset.popTitle);
    el.title = value;
    if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', value);
  });
}

const SUSPEND_PREFIX = () => chrome.runtime.getURL('suspended.html');
function localFaviconUrl(pageUrl, size = 32) {
  try {
    const page = new URL(pageUrl);
    if (!/^https?:$/.test(page.protocol)) return '';
    const endpoint = new URL(chrome.runtime.getURL('_favicon/'));
    endpoint.searchParams.set('pageUrl', page.href);
    endpoint.searchParams.set('size', String(size));
    return endpoint.href;
  } catch { return ''; }
}
function buildSuspendedUrl({ url, title, fav }) {
  const p = new URLSearchParams();
  if (url) p.set('url', url);
  if (title) p.set('title', title);
  if (fav) p.set('fav', fav);
  return `${SUSPEND_PREFIX()}#${p}`;
}

async function loadState() {
  const data = await chrome.storage.local.get('te');
  state = data.te || null;
  if (state && !state.settings) state.settings = {};
}

function clonePopupState() {
  if (typeof structuredClone === 'function') return structuredClone(state);
  return state == null ? state : JSON.parse(JSON.stringify(state));
}

function showCaptureFailure(error) {
  const message = tr(
    error?.code === 'LOCUS_STATE_CONFLICT'
      ? 'captureConflict'
      : isPopupStateRecoveryError(error)
        ? 'captureUnknown'
        : 'captureFailed'
  );
  toast(message, { persistent: true });
  const host = $('pop-toast');
  const copy = document.createElement('span');
  copy.className = 'pop-toast-copy';
  copy.textContent = message;
  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'pop-toast-action';
  action.textContent = tr('openLocus');
  action.onclick = async () => {
    try {
      await chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
      window.close();
    } catch (openError) {
      console.error('Could not open Locus after capture failure', openError);
    }
  };
  host.textContent = '';
  host.appendChild(copy);
  host.appendChild(action);
  host.classList.add('interactive');
  requestAnimationFrame(() => action.focus());
}

async function recoverCaptureWriteFailure(error, snapshot) {
  console.error('Popup capture failed', error);
  if (error && typeof error === 'object') {
    try { error.locusCaptureHandled = true; } catch {}
  }
  if (isPopupStateRecoveryError(error)) {
    popupStateRecoveryRequired = true;
  }
  if (snapshot !== undefined) state = snapshot;
  try {
    await loadState();
  } catch (reloadError) {
    console.error('Could not reload Locus after capture failure', reloadError);
  }
  try {
    applyAppearance();
    applyLocale();
    updateDestination();
    if (activeSection !== 'main-section') showSection('main-section');
  } catch (renderError) {
    console.error('Could not refresh the popup after capture failure', renderError);
  }
  try { showCaptureFailure(error); } catch (displayError) {
    console.error('Could not display the capture failure', displayError);
  }
}

function captureFields(tab) {
  const settings = state?.settings || {};
  let fallback = tab?.url || tr('unnamedTab');
  try { fallback = new URL(tab.url).hostname || fallback; } catch {}
  return {
    title: settings.captureIncludeTitle !== false ? (tab?.title || fallback) : fallback,
    fav: settings.captureIncludeFavicon !== false ? (tab?.favIconUrl || '') : ''
  };
}

function resolveGroupById(groupId) {
  if (!groupId || !state?.workspaces?.length) return null;
  for (const ws of state.workspaces) {
    for (const cat of (ws.categories || [])) {
      const group = (cat.groups || []).find(g => g.id === groupId);
      if (group) return { ws, cat, group };
    }
  }
  return null;
}

function findCaptureTarget({ useLast = true } = {}) {
  if (!state?.workspaces?.length) return null;
  const settings = state.settings || {};
  const override = resolveGroupById(destinationOverrideGroupId);
  if (override) return override;
  if (useLast && settings.captureRememberLast !== false && settings.captureLastTarget?.groupId) {
    for (const ws of state.workspaces) {
      for (const cat of (ws.categories || [])) {
        const group = (cat.groups || []).find(g => g.id === settings.captureLastTarget.groupId);
        if (group) return { ws, cat, group };
      }
    }
  }
  let ws = state.workspaces.find(w => (w.categories || []).some(c => c.id === settings.captureDefaultCategoryId));
  ws = ws || state.workspaces.find(w => w.id === state.activeWsId) || state.workspaces[0];
  let cat = (ws.categories || []).find(c => c.id === settings.captureDefaultCategoryId);
  cat = cat || (ws.categories || []).find(c => c.id === ws.activeCatId) || ws.categories?.[0];
  if (!cat) return null;
  let group = (cat.groups || []).find(g => g.name === 'Inbox');
  if (!group) {
    group = { id: uid(), name: 'Inbox', symbol: '⌑', color: '#6366f1', collapsed: false, items: [] };
    cat.groups = cat.groups || [];
    cat.groups.unshift(group);
  }
  return { ws, cat, group };
}

function updateDestination() {
  const target = findCaptureTarget();
  $('destination-card').classList.toggle('hidden', !target);
  if (target) $('destination-name').textContent = `${target.cat.name} / ${target.group.name}`;
}

function renderLoadError() {
  $('load-state').className = 'state-card error';
  $('load-state').innerHTML = `<span>${esc(tr('loadError'))}</span><button id="retry-load" type="button">${esc(tr('retry'))}</button>`;
  $('retry-load').onclick = load;
  $('tabs-region').classList.add('hidden');
  $('destination-card').classList.add('hidden');
}

async function load() {
  $('popup').setAttribute('aria-busy', 'true');
  $('load-state').className = 'state-card';
  $('load-state').innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${esc(tr('loadingTabs'))}</span>`;
  $('load-state').classList.remove('hidden');
  try {
    await loadState();
    loadHibernatePrefs();
    applyAppearance();
    applyLocale();
    const [current, tabs] = await Promise.all([
      chrome.tabs.query({ active: true, currentWindow: true }),
      chrome.tabs.query({ currentWindow: true })
    ]);
    activeTabId = current[0]?.id ?? null;
    all = tabs.filter(t => !isProto(t.url));
    reconcileSelectedTabs();
    $('window-count').textContent = all.length;
    $('qs-all').disabled = all.length === 0;
    renderTabs();
    updateDestination();
    await refreshHibernateHint();
    $('load-state').classList.add('hidden');
    $('tabs-region').classList.remove('hidden');
  } catch (error) {
    console.error('Popup load failed', error);
    renderLoadError();
  } finally {
    $('popup').setAttribute('aria-busy', 'false');
  }
}

function renderTabs() {
  const query = $('ps').value.trim().toLowerCase();
  const matches = all.filter(t => !query || (t.title || '').toLowerCase().includes(query) || (t.url || '').toLowerCase().includes(query));
  const shown = tabsExpanded || query ? matches : matches.slice(0, 5);
  const list = $('ptabs');
  list.innerHTML = '';
  if (!matches.length) {
    list.innerHTML = `<div class="empty-hint">${esc(query ? tr('noMatches') : tr('noTabs'))}</div>`;
  }
  shown.forEach(tab => list.appendChild(buildTabRow(tab)));
  const more = $('more-tabs');
  const remaining = matches.length - shown.length;
  more.classList.toggle('hidden', Boolean(query) || matches.length <= 5);
  if (!query && matches.length > 5) {
    more.textContent = tabsExpanded ? tr('fewerTabs') : tr('moreTabs', remaining);
    more.setAttribute('aria-expanded', String(tabsExpanded));
  }
  updateSelectionUi();
}

function buildTabRow(tab) {
  const row = document.createElement('div');
  const isActive = tab.id === activeTabId;
  row.className = `pti${isActive ? ' active-tab' : ''}`;
  row.setAttribute('role', 'listitem');
  const initial = (tab.title || dispUrl(tab.url) || '?').trim()[0]?.toUpperCase() || '?';
  const localIcon = localFaviconUrl(tab.url);
  const icon = localIcon
    ? `<img src="${esc(localIcon)}" alt=""><span class="pti-fallback hidden" aria-hidden="true">${esc(initial)}</span>`
    : `<span class="pti-fallback" aria-hidden="true">${esc(initial)}</span>`;
  // Content-type chips like the popup preview (PDF / Video), derived from the
  // URL alone — no page access.
  const kind = /\.pdf(?:[?#]|$)/i.test(tab.url || '') ? tr('pdf')
    : /(?:youtube\.com\/watch|youtu\.be\/|vimeo\.com\/\d)/i.test(tab.url || '') ? tr('video') : '';
  const kindBadge = kind ? `<span class="pti-badge pti-kind">${esc(kind)}</span>` : '';
  const selected = selectedTabIds.has(tab.id);
  const title = tab.title || tab.url || tr('unnamedTab');
  const select = isActive ? '' : `<button class="pti-select" type="button" data-tab-id="${tab.id}" aria-pressed="${selected}" aria-label="${esc(tr(selected ? 'deselectTab' : 'selectTab', title))}"></button>`;
  const actions = isActive
    ? `${kindBadge}<span class="pti-badge">${esc(tr('viewing'))}</span><button class="pti-save" type="button">${esc(tr('save'))}</button>`
    : `<div class="pti-acts">${kindBadge}<button class="pti-hib" type="button" title="${esc(tr('hibernateTab'))}" aria-label="${esc(tr('hibernateTab'))}"><svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M11.5 8.2A4.6 4.6 0 015.8 2.5a4.6 4.6 0 105.7 5.7z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg></button><button class="pti-save" type="button">${esc(tr('save'))}</button></div>`;
  row.classList.toggle('selected', selected);
  row.innerHTML = `${select}<button class="pti-open" type="button" title="${esc(tr('openTab'))}">${icon}<span class="pti-info"><span class="pti-title">${esc(title)}</span><span class="pti-url">${esc(dispUrl(tab.url))}</span></span></button>${actions}`;
  const image = row.querySelector('img');
  if (image) image.addEventListener('error', () => { image.classList.add('hidden'); row.querySelector('.pti-fallback')?.classList.remove('hidden'); });
  row.querySelector('.pti-open').onclick = () => { chrome.tabs.update(tab.id, { active: true }); window.close(); };
  row.querySelector('.pti-save').onclick = () => startCapture(tab);
  const selector = row.querySelector('.pti-select');
  if (selector) selector.onclick = () => toggleTabSelection(tab.id);
  const hib = row.querySelector('.pti-hib');
  if (hib) hib.onclick = () => hibernateSingle(tab);
  return row;
}

function persistSelectedTabs() {
  if (!state) return;
  state.settings = state.settings || {};
  state.settings.popupHibernateSelectedTabIds = [...selectedTabIds];
  persistPopupState().catch(error => console.error('Could not persist selected tabs', error));
}

function reconcileSelectedTabs() {
  const saved = Array.isArray(state?.settings?.popupHibernateSelectedTabIds)
    ? state.settings.popupHibernateSelectedTabIds : [];
  const liveIds = new Set(all.filter(tab => tab.id !== activeTabId).map(tab => tab.id));
  const next = new Set(saved.filter(id => liveIds.has(id)));
  const changed = next.size !== saved.length || [...next].some(id => !selectedTabIds.has(id));
  selectedTabIds = next;
  if (changed) persistSelectedTabs();
  if (!selectedTabIds.size && $('hib-scope').querySelector('.active')?.dataset.val === 'selected') {
    setHibernateScope('window', false);
  }
  updateSelectionUi();
}

function toggleTabSelection(tabId) {
  if (selectedTabIds.has(tabId)) selectedTabIds.delete(tabId); else selectedTabIds.add(tabId);
  persistSelectedTabs();
  updateSelectionUi();
  updateHibernateCount().catch(() => {});
}

function updateSelectionUi() {
  document.querySelectorAll('.pti-select').forEach(button => {
    const id = Number(button.dataset.tabId);
    const selected = selectedTabIds.has(id);
    const tab = all.find(candidate => candidate.id === id);
    const title = tab?.title || tab?.url || tr('unnamedTab');
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', tr(selected ? 'deselectTab' : 'selectTab', title));
    button.closest('.pti')?.classList.toggle('selected', selected);
  });
  const count = selectedTabIds.size;
  $('selection-status').textContent = tr('selectedCount', count);
  $('selection-status').classList.toggle('hidden', count === 0);
  $('hib-selected-count').textContent = `(${count})`;
  const selectedScope = $('hib-scope').querySelector('[data-val="selected"]');
  selectedScope.disabled = count === 0;
  selectedScope.setAttribute('aria-disabled', String(count === 0));
}

function showSection(id, opener = document.activeElement) {
  if (id !== activeSection) sectionOpener = opener;
  ['main-section', 'more-section', 'save-window-section', 'save-to-section', 'hibernate-section'].forEach(section => $(section).classList.toggle('hidden', section !== id));
  activeSection = id;
  requestAnimationFrame(() => {
    const target = id === 'main-section' ? (sectionOpener?.isConnected ? sectionOpener : $('ps')) : $(id).querySelector('button, input');
    target?.focus();
    if (id === 'main-section') sectionOpener = null;
  });
}

async function quickCapture(tab) {
  const target = findCaptureTarget();
  if (!target) return toast(tr('openFirst'));
  await doSave(target.ws, target.cat, target.group, tab);
}

function startCapture(tab) {
  if (state?.settings?.captureAskEveryTime === false) quickCapture(tab);
  else openSavePicker(tab);
}

function openSavePicker(tab, mode = 'tab') {
  pickerMode = mode;
  pendingTab = mode === 'tab' ? tab : null;
  locateResultVisible = false;
  locateRecoveryTabId = null;
  $('stg-back').classList.remove('hidden');
  $('stg-destination-label').classList.remove('hidden');
  $('stg-list').classList.remove('hidden');
  $('stg-locate-result').classList.add('hidden');
  $('stg-locate-result').setAttribute('role', 'status');
  const hasDestination = state?.workspaces?.some(ws => (ws.categories || []).some(cat => (cat.groups || []).length));
  $('stg-locate-option').classList.toggle('hidden', mode !== 'tab' || !hasDestination);
  $('stg-locate').checked = false;
  if (mode === 'tab') {
    $('save-title').textContent = tr('saveTab');
    $('save-tab-title').textContent = tab?.title || tab?.url || tr('unnamedTab');
    $('save-context').textContent = dispUrl(tab?.url);
  } else {
    // Changing a destination, not saving anything yet — show what is currently
    // resolved so the choice reads as a replacement.
    $('save-title').textContent = tr('destination');
    const current = mode === 'window'
      ? (resolveGroupById(windowSaveTargetGroupId) || findCaptureTarget())
      : mode === 'hibernate'
        ? (resolveGroupById(hibernateTargetGroupId) || findCaptureTarget())
        : findCaptureTarget();
    $('save-tab-title').textContent = current ? `${current.cat.name} / ${current.group.name}` : '';
    $('save-context').textContent = '';
  }
  const list = $('stg-list');
  list.innerHTML = '';
  if (!state?.workspaces?.length) {
    list.innerHTML = `<div class="empty-hint">${esc(tr('noWorkspaces'))}</div>`;
  } else {
    state.workspaces.forEach(ws => (ws.categories || []).forEach(cat => {
      const label = document.createElement('div');
      label.className = 'stg-cat-lbl';
      label.textContent = `${ws.symbol || '◫'} ${ws.name} · ${cat.name}`;
      list.appendChild(label);
      if (!(cat.groups || []).length) {
        const empty = document.createElement('div');
        empty.className = 'empty-hint';
        empty.textContent = tr('noGroups');
        list.appendChild(empty);
      }
      (cat.groups || []).forEach(group => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'stg-row';
        row.innerHTML = `<span class="sym">${esc(group.symbol || '⌑')}</span><span class="nm">${esc(group.name)}</span><span class="cnt">${group.items?.length || 0}</span>`;
        row.onclick = () => {
          if (pickerMode === 'tab') {
            doSave(ws, cat, group, tab, { locate: $('stg-locate').checked });
            return;
          }
          if (pickerMode === 'window') {
            windowSaveTargetGroupId = group.id;
            $('sw-destination-name').textContent = `${cat.name} / ${group.name}`;
            showSection('save-window-section');
            return;
          }
          if (pickerMode === 'hibernate') {
            hibernateTargetGroupId = group.id;
            updateHibernateDestination();
            showSection('hibernate-section');
            return;
          }
          // 'destination': update the resolved capture target for this popup
          // session, and persist it when remember-last is on.
          destinationOverrideGroupId = group.id;
          if (state.settings?.captureRememberLast !== false) {
            state.settings.captureLastTarget = { workspaceId: ws.id, categoryId: cat.id, groupId: group.id };
            persistPopupState().catch(() => {});
          }
          updateDestination();
          showSection('main-section');
        };
        list.appendChild(row);
      });
    }));
  }
  showSection('save-to-section');
}

function showLocateFailure(cat, group, result = null) {
  locateResultVisible = true;
  locateRecoveryTabId = result?.routeCreated && Number.isInteger(result?.routeTabId)
    ? result.routeTabId
    : null;
  const destination = `${cat.name} / ${group.name}`;
  $('save-title').textContent = tr('savedTitle');
  $('save-context').textContent = destination;
  $('stg-destination-label').classList.add('hidden');
  $('stg-list').classList.add('hidden');
  $('stg-locate-option').classList.add('hidden');
  $('stg-back').classList.add('hidden');
  const resultKey = result?.routeCreated
    ? (result?.sourceCloseFailed ? 'locateRouteInactiveSourceOpen' : 'locateRouteInactive')
    : 'locateFailed';
  $('stg-locate-result-message').textContent = tr(resultKey, destination);
  $('stg-open-locus').textContent = tr(locateRecoveryTabId == null ? 'openLocus' : 'switchToSavedItem');
  $('stg-locate-result').classList.remove('hidden');
  requestAnimationFrame(() => $('stg-open-locus').focus());
}

async function doSave(ws, cat, group, tab, { locate = false } = {}) {
  if (!beginPopupCapture()) return false;
  try {
    let snapshot;
    let response;
    try {
      snapshot = clonePopupState();
      group.items = group.items || [];
      if (state.settings?.captureDeduplicate !== false && group.items.find(item => item.type === 'tab' && item.url === tab.url)) {
        toast(tr('alreadySaved'));
        return false;
      }
      const meta = captureFields(tab);
      const item = { id: uid(), type: 'tab', title: meta.title, url: tab.url, fav: meta.fav, createdAt: Date.now() };
      group.items.push(item);
      if (state.settings?.captureRememberLast !== false) state.settings.captureLastTarget = { workspaceId: ws.id, categoryId: cat.id, groupId: group.id };
      response = await persistPopupState({
        locateSavedItem: locate ? {
          workspaceId: ws.id,
          itemId: item.id,
          sourceTabId: tab.id,
          sourceWindowId: tab.windowId,
          closeSource: state.settings?.closeTabOnSave !== false,
        } : null,
      });
    } catch (error) {
      await recoverCaptureWriteFailure(error, snapshot);
      return false;
    }
    if (locate) {
      if (response?.locateResult?.ok !== true) {
        showLocateFailure(cat, group, response?.locateResult);
      } else {
        window.close();
      }
      return true;
    }
    if (state.settings?.closeTabOnSave !== false) {
      try { await chrome.tabs.remove(tab.id); } catch {}
    }
    toast(tr('saved'));
    setTimeout(() => window.close(), 400);
    return true;
  } finally {
    finishPopupCapture();
  }
}

function loadHibernatePrefs() {
  const settings = state?.settings || {};
  $('hib-keep-pinned').checked = settings.popupHibernateKeepPinned !== false;
  $('hib-keep-audio').checked = settings.popupHibernateKeepAudio !== false;
  $('hib-save-before').checked = settings.popupHibernateSaveBefore === true;
  selectedTabIds = new Set(Array.isArray(settings.popupHibernateSelectedTabIds) ? settings.popupHibernateSelectedTabIds : []);
  const scope = ['window', 'selected', 'all'].includes(settings.popupHibernateScope) ? settings.popupHibernateScope : 'window';
  setHibernateScope(scope, false, false);
  updateHibernateDestination();
}

function persistHibernatePrefs() {
  if (!state) return;
  state.settings = state.settings || {};
  state.settings.popupHibernateKeepPinned = $('hib-keep-pinned').checked;
  state.settings.popupHibernateKeepAudio = $('hib-keep-audio').checked;
  state.settings.popupHibernateSaveBefore = $('hib-save-before').checked;
  state.settings.popupHibernateSelectedTabIds = [...selectedTabIds];
  state.settings.popupHibernateScope = $('hib-scope').querySelector('.active')?.dataset.val || 'window';
  persistPopupState().catch(error => console.error('Could not persist popup preferences', error));
}

function setHibernateScope(value, refresh = true, persist = true) {
  if (value === 'selected' && !selectedTabIds.size) value = 'window';
  $('hib-scope').querySelectorAll('button').forEach(button => {
    const active = button.dataset.val === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', String(active));
  });
  if (persist) persistHibernatePrefs();
  if (refresh) updateHibernateCount();
}

async function getHibernateCandidates() {
  const scope = $('hib-scope').querySelector('.active')?.dataset.val || 'window';
  const focused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const keepAwakeId = focused[0]?.id ?? activeTabId;
  let tabs = await chrome.tabs.query(scope === 'all' ? {} : { currentWindow: true });
  tabs = tabs.filter(tab => !isProto(tab.url) && tab.id !== keepAwakeId);
  if (scope === 'selected') tabs = tabs.filter(tab => selectedTabIds.has(tab.id));
  if ($('hib-keep-pinned').checked) tabs = tabs.filter(tab => !tab.pinned);
  if ($('hib-keep-audio').checked) tabs = tabs.filter(tab => !tab.audible);
  return tabs;
}

async function updateHibernateCount() {
  const count = (await getHibernateCandidates()).length;
  $('hib-count').textContent = count;
  $('hib-title-count').textContent = count;
  $('hib-go').disabled = count === 0;
}

function updateHibernateDestination() {
  const target = resolveGroupById(hibernateTargetGroupId) || findCaptureTarget();
  $('hib-destination-card').classList.toggle('hidden', !$('hib-save-before').checked);
  $('hib-destination-name').textContent = target ? `${target.cat.name} / ${target.group.name}` : tr('openFirst');
}

async function refreshHibernateHint() {
  const focused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const keepAwakeId = focused[0]?.id ?? activeTabId;
  const tabs = (await chrome.tabs.query({ currentWindow: true })).filter(tab => !isProto(tab.url) && tab.id !== keepAwakeId && !tab.pinned && !tab.audible);
  $('hib-open-hint').textContent = tabs.length ? tr('idle', tabs.length) : '';
}

async function hibernateSingle(tab) {
  try {
    await chrome.tabs.update(tab.id, { url: buildSuspendedUrl({ url: tab.url, title: tab.title, fav: localFaviconUrl(tab.url, 64) }) });
    toast(tr('tabHibernated'));
    await load();
  } catch { toast(tr('couldNotHibernate')); }
}

async function hibernateSelectedScope() {
  if (!beginPopupCapture()) return false;
  try {
    const targets = await getHibernateCandidates();
    if (!targets.length) return false;
    $('hib-go').disabled = true;
    let saved = null;
    if ($('hib-save-before').checked) {
      try {
        saved = await saveTabsBeforeHibernate(targets);
      } catch (error) {
        console.error('Could not save tabs before hibernating', error);
        if (!error?.locusCaptureHandled) showCaptureFailure(error);
        $('hib-go').disabled = false;
        return false;
      }
    }
    let count = 0;
    for (const tab of targets) {
      try {
        await chrome.tabs.update(tab.id, { url: buildSuspendedUrl({ url: tab.url, title: tab.title, fav: localFaviconUrl(tab.url, 64) }) });
        count++;
      } catch {}
    }
    toast(saved == null ? tr('hibernated', count) : tr('hibernatedAndSaved', count, saved));
    await load();
    showSection('main-section');
    return true;
  } finally {
    finishPopupCapture();
  }
}

async function saveTabsBeforeHibernate(tabs) {
  let snapshot;
  try {
    snapshot = clonePopupState();
    const target = resolveGroupById(hibernateTargetGroupId) || findCaptureTarget();
    if (!target?.group) throw new Error('No capture target');
    target.group.items = target.group.items || [];
    const existing = state.settings?.captureDeduplicate === false
      ? null : new Set(target.group.items.filter(item => item.type === 'tab').map(item => item.url));
    const createdAt = Date.now();
    const items = tabs.filter(tab => !existing || !existing.has(tab.url)).map(tab => {
      const meta = captureFields(tab);
      return { id: uid(), type: 'tab', title: meta.title, url: tab.url, fav: meta.fav, createdAt };
    });
    target.group.items.push(...items);
    if (state.settings?.captureRememberLast !== false) {
      state.settings.captureLastTarget = { workspaceId: target.ws.id, categoryId: target.cat.id, groupId: target.group.id };
    }
    await persistPopupState();
    return items.length;
  } catch (error) {
    await recoverCaptureWriteFailure(error, snapshot);
    throw error;
  }
}

function collectTopTags(limit = 4) {
  const counts = new Map();
  (state?.workspaces || []).forEach(ws => (ws.categories || []).forEach(cat => (cat.groups || []).forEach(group =>
    (group.items || []).forEach(item => (item.tags || []).forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1))))));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag]) => tag);
}

function renderSwTags(suggestions) {
  const host = $('sw-tags');
  host.innerHTML = '';
  const shown = [...new Set([...suggestions, ...swSelectedTags])];
  shown.forEach(tag => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `sw-tag${swSelectedTags.has(tag) ? ' on' : ''}`;
    chip.textContent = tag;
    chip.setAttribute('aria-pressed', String(swSelectedTags.has(tag)));
    chip.onclick = () => {
      if (swSelectedTags.has(tag)) swSelectedTags.delete(tag); else swSelectedTags.add(tag);
      renderSwTags(suggestions);
    };
    host.appendChild(chip);
  });
}

function setSaveMode(value, persist = true) {
  $('sw-modes').querySelectorAll('.sw-mode').forEach(button => {
    const active = button.dataset.val === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', String(active));
  });
  if (persist && state) {
    state.settings = state.settings || {};
    state.settings.popupSaveMode = value;
    persistPopupState().catch(() => {});
  }
}

function currentSaveMode() {
  return $('sw-modes').querySelector('.sw-mode.active')?.dataset.val
    || (['links', 'group', 'queue'].includes(state?.settings?.popupSaveMode) ? state.settings.popupSaveMode : 'group');
}

function openSaveWindow(opener) {
  if (!state?.workspaces?.length) return toast(tr('openFirst'));
  const target = resolveGroupById(windowSaveTargetGroupId) || findCaptureTarget();
  if (!target?.cat) return toast(tr('openFirst'));
  $('sw-count').textContent = all.length;
  $('sw-go-count').textContent = all.length;
  $('sw-destination-name').textContent = `${target.cat.name} / ${target.group.name}`;
  setSaveMode(['links', 'group', 'queue'].includes(state.settings?.popupSaveMode) ? state.settings.popupSaveMode : 'group', false);
  $('sw-close').checked = state.settings?.closeTabOnSave !== false;
  $('sw-note-toggle').checked = false;
  $('sw-note').value = '';
  $('sw-note').classList.add('hidden');
  swSelectedTags = new Set();
  renderSwTags(collectTopTags());
  showSection('save-window-section', opener);
}

async function saveWindow({ mode, closeTabs, note, tags } = {}) {
  if (!state?.workspaces?.length) return toast(tr('openFirst'));
  const target = resolveGroupById(windowSaveTargetGroupId) || findCaptureTarget();
  if (!target?.cat) return toast(tr('openFirst'));
  if (!beginPopupCapture()) return false;
  try {
    mode = ['links', 'group', 'queue'].includes(mode) ? mode
      : (['links', 'group', 'queue'].includes(state.settings?.popupSaveMode) ? state.settings.popupSaveMode : 'group');
    const close = closeTabs != null ? closeTabs : state.settings?.closeTabOnSave !== false;
    let snapshot;
    let items = [];
    try {
      snapshot = clonePopupState();
      const stampTab = tab => {
        const meta = captureFields(tab);
        const item = { id: uid(), type: 'tab', title: meta.title, url: tab.url, fav: meta.fav, createdAt: Date.now() };
        if (tags?.length) item.tags = [...tags];
        if (mode === 'queue') item.readLaterAt = Date.now();
        return item;
      };
      let receiving;
      if (mode === 'group') {
        const now = new Date();
        receiving = {
          id: uid(), symbol: '◫', color: '#06b6d4', collapsed: false,
          name: `${tr('session')} ${now.toLocaleDateString(appLocale(), { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' })}`,
          items: []
        };
        target.cat.groups = target.cat.groups || [];
        target.cat.groups.push(receiving);
      } else {
        receiving = target.group;
        receiving.items = receiving.items || [];
      }
      // A window save into an existing group honors the dedupe setting the same
      // way single-tab capture does; a fresh session group can't have duplicates.
      const dedupe = mode !== 'group' && state.settings?.captureDeduplicate !== false;
      const existing = dedupe ? new Set(receiving.items.filter(item => item.type === 'tab').map(item => item.url)) : null;
      items = all.filter(tab => !existing || !existing.has(tab.url)).map(stampTab);
      if (!items.length && !note) {
        state = snapshot;
        toast(tr('alreadySaved'));
        return false;
      }
      if (note) receiving.items.push({ id: uid(), type: 'note', html: esc(note), createdAt: Date.now() });
      receiving.items.push(...items);
      if (mode !== 'group' && state.settings?.captureRememberLast !== false) {
        state.settings.captureLastTarget = { workspaceId: target.ws.id, categoryId: target.cat.id, groupId: receiving.id };
      }
      await persistPopupState();
    } catch (error) {
      await recoverCaptureWriteFailure(error, snapshot);
      return false;
    }
    if (close) {
      for (const tab of all.filter(tab => tab.id !== activeTabId)) {
        try { await chrome.tabs.remove(tab.id); } catch {}
      }
    }
    const closed = close && all.length > 1;
    toast(closed ? tr('savedTabsClosed', items.length) : tr('savedTabs', items.length));
    setTimeout(() => window.close(), 900);
    return true;
  } finally {
    finishPopupCapture();
  }
}

async function importBookmarksFromPopup() {
  const button = $('more-import-bookmarks');
  if (!chrome.bookmarks?.getTree) return toast(tr('bookmarksUnavailable'));
  const target = findCaptureTarget();
  if (!target?.cat) return toast(tr('openFirst'));
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  const groups = target.cat.groups = target.cat.groups || [];
  const originalLength = groups.length;
  try {
    const tree = await chrome.bookmarks.getTree();
    let imported = 0;
    const walk = (nodes, folderName, depth) => {
      if (depth >= 50) return;
      const items = [];
      for (const node of (nodes || [])) {
        if (node.url && !isProto(node.url)) {
          items.push({ id: uid(), type: 'tab', title: node.title || node.url, url: node.url, fav: '', createdAt: Date.now() });
          imported++;
        } else if (node.children) {
          walk(node.children, node.title || folderName, depth + 1);
        }
      }
      if (items.length) groups.push({ id: uid(), name: folderName || 'Bookmarks', symbol: '🔖', color: '#eab308', collapsed: false, items });
    };
    tree.forEach(root => walk(root.children || [], root.title || 'Bookmarks', 0));
    if (!imported) {
      groups.splice(originalLength);
      toast(tr('noBookmarks'));
      return;
    }
    await persistPopupState();
    toast(tr('importedBookmarks', imported));
  } catch (error) {
    groups.splice(originalLength);
    console.error('Bookmark import failed', error);
    toast(tr('bookmarkImportFailed'));
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

function trapTabKey(event, root, extraRoot = null) {
  if (event.key !== 'Tab' || !root) return;
  const roots = [root, extraRoot].filter(Boolean);
  const focusable = roots.flatMap(container => [...container.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')])
    .filter(el => !el.closest('.hidden'));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!roots.some(container => container.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function backSection() {
  if (activeSection === 'save-to-section') {
    if (pickerMode === 'window') return 'save-window-section';
    if (pickerMode === 'hibernate') return 'hibernate-section';
  }
  return 'main-section';
}

function toast(message, { persistent = false } = {}) {
  const el = $('pop-toast');
  el.classList.remove('interactive');
  el.textContent = message;
  el.setAttribute('role', persistent ? 'alert' : 'status');
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = persistent ? null : setTimeout(() => el.classList.remove('show'), 1600);
}

function bind() {
  // Keep a receipt-gated capture from being replaced by another popup action.
  // The action popup can still be dismissed by Chrome itself; Locate is carried
  // by the worker-owned state request so that teardown cannot strand the effect.
  document.addEventListener('click', event => {
    if (!popupCapturePending) return;
    if (!event.target.closest('button, input, textarea, [role="button"]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  $('open-full').onclick = () => { chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') }); window.close(); };
  $('open-more').onclick = event => showSection('more-section', event.currentTarget);
  $('more-back').onclick = () => showSection('main-section');
  $('more-save-current').onclick = () => {
    const tab = all.find(candidate => candidate.id === activeTabId);
    if (!tab) return toast(tr('cannotSave'));
    startCapture(tab);
  };
  $('more-import-bookmarks').onclick = importBookmarksFromPopup;
  $('more-shortcuts').onclick = () => { chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); window.close(); };
  $('ps').oninput = renderTabs;
  $('more-tabs').onclick = () => { tabsExpanded = !tabsExpanded; renderTabs(); };
  // Save window: a confirm panel with destination + options when capture asks
  // every time (default), an instant save with the remembered choices when the
  // user opted out of being asked.
  $('qs-all').onclick = event => {
    if (state?.settings?.captureAskEveryTime === false) saveWindow();
    else openSaveWindow(event.currentTarget);
  };
  // "Change" changes the destination — it never saves anything by itself.
  $('change-destination').onclick = () => openSavePicker(null, 'destination');
  $('stg-back').onclick = () => {
    if (locateResultVisible) {
      window.close();
      return;
    }
    const back = pickerMode === 'window' ? 'save-window-section' : pickerMode === 'hibernate' ? 'hibernate-section' : 'main-section';
    pendingTab = null;
    pickerMode = 'tab';
    showSection(back);
  };
  $('stg-open-locus').onclick = async () => {
    try {
      if (locateRecoveryTabId == null) {
        await chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
      } else {
        const routeTab = await chrome.tabs.update(locateRecoveryTabId, { active: true });
        if (Number.isInteger(routeTab?.windowId)) {
          await chrome.windows.update(routeTab.windowId, { focused: true });
        }
      }
      window.close();
    } catch (error) {
      console.error('Could not open Locus after Locate failed', error);
      const destination = $('save-context').textContent || tr('destination');
      const failure = tr(locateRecoveryTabId == null ? 'openLocusRetryFailed' : 'switchToSavedItemFailed', destination);
      $('stg-locate-result-message').textContent = '';
      requestAnimationFrame(() => {
        $('stg-locate-result-message').textContent = failure;
        $('stg-open-locus').focus();
      });
    }
  };
  $('stg-done').onclick = () => window.close();
  $('sw-back').onclick = () => showSection('main-section');
  $('sw-change').onclick = () => openSavePicker(null, 'window');
  $('sw-modes').querySelectorAll('.sw-mode').forEach(button => {
    button.onclick = () => setSaveMode(button.dataset.val);
    button.onkeydown = event => {
      if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const order = ['links', 'group', 'queue'];
      const index = order.indexOf(currentSaveMode());
      const next = order[(index + (event.key === 'ArrowDown' ? 1 : order.length - 1)) % order.length];
      setSaveMode(next);
      $('sw-modes').querySelector(`[data-val="${next}"]`).focus();
    };
  });
  $('sw-note-toggle').onchange = () => {
    $('sw-note').classList.toggle('hidden', !$('sw-note-toggle').checked);
    if ($('sw-note-toggle').checked) $('sw-note').focus();
  };
  $('sw-tag-input').onkeydown = event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const tag = $('sw-tag-input').value.trim();
    if (!tag) return;
    swSelectedTags.add(tag);
    $('sw-tag-input').value = '';
    renderSwTags(collectTopTags());
  };
  $('sw-go').onclick = () => {
    $('sw-go').disabled = true;
    saveWindow({
      mode: currentSaveMode(),
      closeTabs: $('sw-close').checked,
      note: $('sw-note-toggle').checked ? $('sw-note').value.trim() : '',
      tags: [...swSelectedTags]
    }).finally(() => { $('sw-go').disabled = false; });
  };
  $('hib-open').onclick = async event => { await updateHibernateCount(); showSection('hibernate-section', event.currentTarget); };
  $('hib-back').onclick = () => showSection('main-section');
  $('hib-scope').querySelectorAll('button').forEach(button => {
    button.onclick = () => setHibernateScope(button.dataset.val);
    button.onkeydown = event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const enabled = [...$('hib-scope').querySelectorAll('button:not([disabled])')];
      const index = enabled.indexOf(button);
      const next = enabled[(index + (event.key === 'ArrowRight' ? 1 : enabled.length - 1)) % enabled.length];
      setHibernateScope(next.dataset.val);
      next.focus();
    };
  });
  ['hib-keep-pinned', 'hib-keep-audio'].forEach(id => $(id).onchange = () => { persistHibernatePrefs(); updateHibernateCount(); });
  $('hib-save-before').onchange = () => { persistHibernatePrefs(); updateHibernateDestination(); };
  $('hib-change').onclick = () => openSavePicker(null, 'hibernate');
  $('hib-go').onclick = hibernateSelectedScope;
  document.addEventListener('keydown', event => {
    const searchShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (popupCapturePending && (event.key === 'Escape' || searchShortcut)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const toastRoot = $('pop-toast').classList.contains('interactive') && $('pop-toast').classList.contains('show')
      ? $('pop-toast')
      : null;
    if (event.key === 'Tab' && (activeSection !== 'main-section' || toastRoot)) {
      trapTabKey(event, $(activeSection), toastRoot);
    }
    if (searchShortcut) {
      event.preventDefault();
      if (locateResultVisible) return;
      if (activeSection !== 'main-section') showSection('main-section');
      $('ps').focus();
      $('ps').select();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (locateResultVisible) window.close();
      else if (activeSection !== 'main-section') showSection(backSection());
      else window.close();
    }
  });
}

applyAppearance();
applyLocale();
bind();
load();
