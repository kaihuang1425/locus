/* Locus popup.js */
const $ = id => document.getElementById(id);
const esc = s => !s ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dispUrl = u => { try { return new URL(u).hostname; } catch { return u || ''; } };
const POPUP_CAPTURABLE_PROTOCOLS = new Set(['http:', 'https:', 'ftp:', 'file:']);
function isPopupCapturableUrl(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return false;
  try {
    return POPUP_CAPTURABLE_PROTOCOLS.has(new URL(raw).protocol.toLowerCase());
  } catch {
    return false;
  }
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const normalizeLanguage = value => /^zh(?:[-_]|$)/i.test(String(value || '').trim()) ? 'zh-TW' : 'en';
const browserLanguage = () => normalizeLanguage(navigator.languages?.[0] || navigator.language || 'en');

const I18N = {
  en: {
    openLocus: 'Open Locus', close: 'Close', searchTabs: 'Search open tabs…',
    tabs: 'tabs', saveWindow: 'Save window', loadingTabs: 'Loading tabs…',
    retry: 'Try again', loadErrorTitle: 'Couldn’t read this window', loadError: 'No tabs were saved or closed.', noTabs: 'No other saveable tabs in this window.',
    noMatches: 'No tabs match your search.', moreTabs: n => `+ ${n} more tabs`, fewerTabs: 'Show fewer tabs',
    destination: 'Destination', saveTab: 'Save tab', chooseDestination: 'Choose destination',
    noWorkspaces: 'No workspaces yet. Open Locus to get started.', noGroups: 'No groups yet.', scope: 'Scope',
    thisWindow: 'This window', allWindows: 'All windows', keepPinned: 'Keep pinned tabs awake',
    keepAudio: 'Keep tabs playing audio awake', hibernate: 'Hibernate', privacyProof: 'Profile-local; export before uninstalling or deleting the profile.',
    save: 'Save', hibernateTab: 'Hibernate this tab', openTab: 'Open tab',
    openFirst: 'Open the full workspace first', alreadySaved: 'Already saved',
    couldNotHibernate: 'Could not hibernate tab', tabHibernated: 'Tab hibernated',
    hibernated: n => n === 1 ? 'Hibernated 1 tab' : `Hibernated ${n} tabs`, cannotSave: "This tab can't be saved",
    savedTabs: n => `Saved ${n} ${n === 1 ? 'tab' : 'tabs'}`, savedTabsClosed: n => `Saved ${n} tabs · load when opened`,
    session: 'Session', unnamedTab: 'Untitled tab',
    saveOptions: 'Save options', saveLinksOnly: 'Links only', saveLinksGroup: 'Links + tab group', saveQueue: 'Reading queue',
    closeAfterSave: 'Close other tabs after saving', addNote: 'Add note', notePlaceholder: 'A note saved alongside these tabs…',
    tags: 'Tags', addTag: '+ Add tag', localFirst: 'No Locus account or host permissions.',
    video: 'Video', pdf: 'PDF', more: 'More',
    saveCurrentTab: 'Save current tab', importBookmarks: 'Import bookmarks', keyboardShortcuts: 'Keyboard shortcuts',
    selectTab: title => `Select ${title}`, deselectTab: title => `Deselect ${title}`,
    selectedTabs: 'Selected', selectedCount: n => `${n} selected`,
    saveBeforeHibernate: 'Save links to Locus before hibernating',
    importedBookmarks: n => n === 1 ? 'Imported 1 bookmark' : `Imported ${n} bookmarks`,
    noBookmarks: 'No saveable bookmarks found', bookmarkImportFailed: 'Could not import bookmarks',
    bookmarksUnavailable: 'Bookmarks are unavailable', saveBeforeFailed: 'Links could not be saved; nothing was hibernated',
    hibernatedAndSaved: (hibernated, saved) => `Saved ${saved} new · hibernated ${hibernated}`,
    thisTab: 'This tab', saveTo: 'Save to', inboxName: 'Inbox',
    destinationChip: (path, waiting) => waiting > 0 ? `Save to ${path}, ${waiting} waiting` : `Save to ${path}`,
    savedTo: name => `Saved to ${name}`, locate: 'Locate',
    undo: 'Undo', move: 'Move', moveTo: 'Move to', undone: 'Undone',
    clearSelection: 'Clear selection', clearSearch: 'Clear search', dismiss: 'Dismiss',
    nothingToHibernate: 'Nothing to hibernate',
    saveTabNamed: title => `Save ${title}`, hibernateTabNamed: title => `Hibernate ${title}`
  },
  'zh-TW': {
    openLocus: '開啟 Locus', close: '關閉', searchTabs: '搜尋開啟的分頁…',
    tabs: '個分頁', saveWindow: '儲存視窗', loadingTabs: '正在載入分頁…',
    retry: '再試一次', loadErrorTitle: '無法讀取目前視窗', loadError: '沒有儲存或關閉任何分頁。', noTabs: '這個視窗沒有其他可儲存的分頁。',
    noMatches: '沒有符合搜尋的分頁。', moreTabs: n => `另有 ${n} 個分頁`, fewerTabs: '顯示較少分頁',
    destination: '儲存位置', saveTab: '儲存分頁', chooseDestination: '選擇儲存位置',
    noWorkspaces: '尚無工作區。請先開啟 Locus 開始使用。', noGroups: '尚無群組。', scope: '範圍',
    thisWindow: '這個視窗', allWindows: '所有視窗', keepPinned: '讓釘選分頁保持啟用',
    keepAudio: '讓播放音訊的分頁保持啟用', hibernate: '休眠', privacyProof: '設定檔本機資料；解除安裝或刪除設定檔前請先匯出。',
    save: '儲存', hibernateTab: '休眠此分頁', openTab: '開啟分頁',
    openFirst: '請先開啟完整工作區', alreadySaved: '已儲存',
    couldNotHibernate: '無法休眠分頁', tabHibernated: '分頁已休眠',
    hibernated: n => `已休眠 ${n} 個分頁`, cannotSave: '無法儲存此分頁',
    savedTabs: n => `已儲存 ${n} 個分頁`, savedTabsClosed: n => `已儲存 ${n} 個分頁 · 開啟時載入`,
    session: '工作階段', unnamedTab: '未命名分頁',
    saveOptions: '儲存方式', saveLinksOnly: '只存連結', saveLinksGroup: '連結＋分頁群組', saveQueue: '閱讀佇列',
    closeAfterSave: '儲存後關閉其他分頁', addNote: '加入備註', notePlaceholder: '隨這些分頁一併儲存的備註…',
    tags: '標籤', addTag: '＋新增標籤', localFirst: '沒有 Locus 帳號或主機權限。',
    video: '影片', pdf: 'PDF', more: '更多',
    saveCurrentTab: '儲存目前分頁', importBookmarks: '匯入書籤', keyboardShortcuts: '鍵盤快速鍵',
    selectTab: title => `選取「${title}」`, deselectTab: title => `取消選取「${title}」`,
    selectedTabs: '已選取', selectedCount: n => `已選取 ${n} 個`,
    saveBeforeHibernate: '休眠前先將連結儲存到 Locus',
    importedBookmarks: n => `已匯入 ${n} 個書籤`, noBookmarks: '找不到可儲存的書籤',
    bookmarkImportFailed: '無法匯入書籤', bookmarksUnavailable: '無法使用書籤功能',
    saveBeforeFailed: '無法儲存連結，因此未休眠任何分頁',
    hibernatedAndSaved: (hibernated, saved) => `已新增儲存 ${saved} 個，並休眠 ${hibernated} 個分頁`,
    thisTab: '目前分頁', saveTo: '儲存到', inboxName: '收件匣',
    destinationChip: (path, waiting) => waiting > 0 ? `儲存到「${path}」，有 ${waiting} 項待整理` : `儲存到「${path}」`,
    savedTo: name => `已儲存到「${name}」`, locate: '查看位置',
    undo: '復原', move: '移動', moveTo: '移到', undone: '已復原',
    clearSelection: '清除選取', clearSearch: '清除搜尋', dismiss: '關閉通知',
    nothingToHibernate: '沒有可休眠的分頁',
    saveTabNamed: title => `儲存「${title}」`, hibernateTabNamed: title => `休眠「${title}」`
  }
};

Object.assign(I18N.en, {
  captureConflict: 'Locus changed in another window. Your tabs were left untouched. Open Locus, then retry.',
  captureFailed: 'Save failed. Your tabs were left untouched. Open Locus, then retry.',
  captureUnknown: 'Locus could not confirm the save. Reopen Locus before retrying; the source tab may stay open.',
  captureBusy: 'Another save is still being confirmed. Your tabs were left untouched.',
  changeConflict: 'Locus changed in another window, so nothing changed here. Open Locus, then try again.',
  changeFailed: 'That change didn’t save. Open Locus, then try again.',
  changeUnknown: 'Locus couldn’t confirm that change. Reopen Locus before trying again.',
  savedItemChanged: 'The item changed in Locus, so nothing changed here.',
  locateAfterSave: 'Open saved item in Locus',
  savedTitle: 'Saved',
  done: 'Close',
  switchToSavedItem: 'Switch to saved item',
  locateFailed: destination => `Saved to ${destination}, but the saved item couldn't be opened. Locus did not close the source tab.`,
  locateRouteInactive: destination => `Saved to ${destination}. The saved item is open in another tab, but Locus couldn't switch to it.`,
  locateRouteInactiveSourceOpen: destination => `Saved to ${destination}. The saved item is open in another tab, but Locus couldn't switch to it or close the source tab.`,
  openLocusRetryFailed: destination => `Saved to ${destination}, but Locus still couldn't open. Try again.`,
  switchToSavedItemFailed: destination => `Saved to ${destination}. Locus still couldn't switch to the saved item. Switch tabs manually or try again.`,
  windowSavedTitle: 'Window saved',
  tagInputLabel: 'Add a tag',
  noteInputLabel: 'Window note',
  windowSavedSummary: (count, hasNote) => count
    ? `Saved ${count} ${count === 1 ? 'tab' : 'tabs'}${hasNote ? ' and a note' : ''}.`
    : 'Saved a note.',
  openDestination: 'Open destination',
  switchToDestination: 'Switch to destination',
  originalTabsOpen: 'Original tabs stayed open.',
  currentTabOpen: 'This tab stayed open.',
  closedOtherTabs: count => `Closed ${count} other ${count === 1 ? 'tab' : 'tabs'}. This tab stayed open.`,
  partialTabClose: (closed, unconfirmed) => `${closed > 0 ? `Closed ${closed} other ${closed === 1 ? 'tab' : 'tabs'}. ` : ''}${unconfirmed} other ${unconfirmed === 1 ? 'tab did' : 'tabs did'} not close or could not be confirmed closed. This tab stayed open.`,
  destinationUnavailable: 'The saved destination could not be confirmed, so no source tabs were closed.',
  windowEffectUnknown: (count, closeRequested) => closeRequested && count > 0
    ? `Locus couldn't confirm the destination or whether ${count} other ${count === 1 ? 'tab' : 'tabs'} closed. This tab stayed open.`
    : `Locus couldn't confirm the destination. ${closeRequested ? 'This tab' : 'Original tabs'} stayed open.`,
  destinationNoLongerAvailable: 'The saved destination is no longer available. Open Locus to review your data.',
  openDestinationFailed: 'The window was saved, but Locus could not open the destination. Try again.',
  destinationRouteInactive: 'The destination is open in another tab, but Locus could not switch to it.',
  openSavedItem: 'Open saved item',
  closeSavedTab: 'Close tab',
  closePopup: 'Close popup',
  quickCaptureReceiptUnavailable: 'The tab was saved, but Locus could not confirm its current destination. The saved tab stayed open.',
  quickCaptureOpenFailed: destination => `Saved to ${destination}, but Locus could not open the item. The saved tab stayed open. Try again.`,
  quickCaptureOpenUnknown: (destination, closeRequested) => closeRequested
    ? `Saved to ${destination}, but Locus could not confirm whether the item opened or whether the saved tab closed.`
    : `Saved to ${destination}, but Locus could not confirm whether the item opened. The saved tab stayed open.`,
  quickCaptureRouteInactive: 'The saved item is open in another tab, but Locus could not switch to it. The saved tab stayed open.',
  quickCaptureDestinationUnavailable: 'The item is no longer in its saved destination. Open Locus to review your data.',
  quickCaptureCloseProtected: 'The saved tab changed, so Locus left it open. Close it manually when you are ready.',
  quickCaptureCloseUnconfirmed: 'Locus could not confirm whether the saved tab closed. The item is still saved.',
  openLocusFailed: 'Locus could not open. Try again.'
});
Object.assign(I18N['zh-TW'], {
  captureConflict: 'Locus 已在其他視窗變更。分頁完全未受影響。請開啟 Locus 後再試。',
  captureFailed: '儲存失敗。分頁完全未受影響。請開啟 Locus 後再試。',
  captureUnknown: 'Locus 無法確認是否已儲存。請重新開啟 Locus 後再試；原分頁可能仍開啟。',
  captureBusy: '另一項儲存仍在確認中。分頁完全未受影響。',
  changeConflict: 'Locus 已在其他視窗變更，這次操作沒有生效。請開啟 Locus 後再試。',
  changeFailed: '這項變更沒有儲存。請開啟 Locus 後再試。',
  changeUnknown: 'Locus 無法確認這項變更是否完成。請重新開啟 Locus 後再試。',
  savedItemChanged: '這個項目已在 Locus 裡變更，這次操作沒有生效。',
  locateAfterSave: '儲存後在 Locus 開啟項目',
  savedTitle: '已儲存',
  done: '關閉',
  switchToSavedItem: '切換到已儲存項目',
  locateFailed: destination => `已儲存到「${destination}」，但無法開啟這個項目。Locus 未關閉原分頁。`,
  locateRouteInactive: destination => `已儲存到「${destination}」。項目已在其他分頁開啟，但 Locus 無法切換到該分頁。`,
  locateRouteInactiveSourceOpen: destination => `已儲存到「${destination}」。項目已在其他分頁開啟，但 Locus 無法切換到該分頁，也未關閉原分頁。`,
  openLocusRetryFailed: destination => `已儲存到「${destination}」，但仍無法開啟 Locus，請再試一次。`,
  switchToSavedItemFailed: destination => `已儲存到「${destination}」。Locus 仍無法切換到已儲存項目，請手動切換分頁或再試一次。`,
  windowSavedTitle: '視窗已儲存',
  tagInputLabel: '新增標籤',
  noteInputLabel: '視窗備註',
  windowSavedSummary: (count, hasNote) => count
    ? `已儲存 ${count} 個分頁${hasNote ? '和 1 則備註' : ''}。`
    : '已儲存 1 則備註。',
  openDestination: '開啟儲存位置',
  switchToDestination: '切換到儲存位置',
  originalTabsOpen: '原分頁保持開啟。',
  currentTabOpen: '目前分頁保持開啟。',
  closedOtherTabs: count => `已關閉其他 ${count} 個分頁，目前分頁保持開啟。`,
  partialTabClose: (closed, unconfirmed) => `${closed > 0 ? `已關閉其他 ${closed} 個分頁；` : ''}另有 ${unconfirmed} 個分頁未關閉，或無法確認是否已關閉。目前分頁保持開啟。`,
  destinationUnavailable: '無法確認儲存位置，因此未關閉任何原分頁。',
  windowEffectUnknown: (count, closeRequested) => closeRequested && count > 0
    ? `Locus 無法確認儲存位置，也無法確認其他 ${count} 個分頁是否已關閉。目前分頁保持開啟。`
    : `Locus 無法確認儲存位置。${closeRequested ? '目前分頁' : '原分頁'}保持開啟。`,
  destinationNoLongerAvailable: '原儲存位置已不存在。請開啟 Locus 查看資料。',
  openDestinationFailed: '視窗已儲存，但 Locus 無法開啟儲存位置，請再試一次。',
  destinationRouteInactive: '儲存位置已在其他分頁開啟，但 Locus 無法切換到該分頁。',
  openSavedItem: '開啟已儲存項目',
  closeSavedTab: '關閉分頁',
  closePopup: '關閉彈出式視窗',
  quickCaptureReceiptUnavailable: '分頁已儲存，但 Locus 無法確認目前的儲存位置。剛儲存的分頁仍開著。',
  quickCaptureOpenFailed: destination => `已儲存到「${destination}」，但 Locus 無法開啟這個項目。剛儲存的分頁仍開著，請再試一次。`,
  quickCaptureOpenUnknown: (destination, closeRequested) => closeRequested
    ? `已儲存到「${destination}」，但 Locus 無法確認項目是否已開啟，也無法確認剛儲存的分頁是否已關閉。`
    : `已儲存到「${destination}」，但 Locus 無法確認項目是否已開啟。剛儲存的分頁仍開著。`,
  quickCaptureRouteInactive: '已儲存的項目已在其他分頁開啟，但 Locus 無法切換過去。剛儲存的分頁仍開著。',
  quickCaptureDestinationUnavailable: '這個項目已不在原本的儲存位置。請開啟 Locus 查看資料。',
  quickCaptureCloseProtected: '剛儲存的分頁已有變更，因此 Locus 未關閉分頁。請確認後自行關閉。',
  quickCaptureCloseUnconfirmed: 'Locus 無法確認剛儲存的分頁是否已關閉。項目仍已儲存。',
  openLocusFailed: '無法開啟 Locus，請再試一次。'
});

let all = [];
let state = null;
let pendingTab = null;
let activeTab = null;
let activeTabId = null;
let activeWindowId = null;
let tabsExpanded = false;
let activeSection = 'main-section';
let sectionHistory = [];
let toastTimer = null;
// Tab URLs already saved anywhere in Locus, for the rows' saved mark.
let savedTabUrls = new Set();
let heroSavedTabId = null;
// One floating layer at a time: the More menu or a destination list.
let openLayer = null;
// The Save tab sheet saves one tab into the row a user picks ('tab'). The
// destination lists by the chips change where a later save lands instead.
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
let locateRecoveryRoute = null;
let windowSaveRecoveryIntent = null;
let windowSaveResultMessage = '';
let quickCaptureRecoveryIntent = null;
let quickCaptureCloseRequested = false;
let quickCaptureResultMessage = '';
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

async function sendPopupRuntimeMessageWithDeadline(message, timeoutCode) {
  let timer = null;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error('Locus could not confirm the browser action in time.');
        error.code = timeoutCode;
        reject(error);
      }, popupStateWriteTimeoutMs);
    });
    return await Promise.race([chrome.runtime.sendMessage(message), timeout]);
  } finally {
    if (timer != null) clearTimeout(timer);
  }
}

async function sendPopupStateWriteMessage(
  candidate,
  retryAllowed = () => true,
  { quickCaptureItem = null } = {},
) {
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
        ...(quickCaptureItem ? { quickCaptureItem } : {}),
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

async function persistPopupState({ quickCaptureItem = null } = {}) {
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
        sendPopupStateWriteMessage(candidate, () => receiverRetryOpen, {
          quickCaptureItem,
        }),
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
    toast(tr('captureBusy'), { tone: 'warning' });
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

const THEME_IDS = new Set(['folio', 'folio-dark', 'tabento', 'tabento-dark', 'dark', 'aurora', 'light', 'dracula', 'nord', 'rose-pine', 'tokyo-night', 'solarized-dark', 'solarized-light', 'gruvbox', 'catppuccin', 'sepia', 'mono', 'grid', 'grid-dark']);
const THEME_ALIASES = { stow: 'folio', 'stow-dark': 'folio-dark' };
const FONT_IDS = new Set(['dm', 'inter', 'geist', 'plex', 'lora', 'mono', 'geist-mono', 'system']);

function applyAppearance() {
  let theme = THEME_ALIASES[state?.settings?.theme] || state?.settings?.theme || 'folio';
  if (theme === 'auto') theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'folio-dark' : 'folio';
  if (!THEME_IDS.has(theme)) theme = 'folio';
  const font = state?.settings?.font || 'dm';
  document.documentElement.dataset.theme = theme;
  document.documentElement.lang = appLocale();
  document.body.dataset.font = FONT_IDS.has(font) ? font : 'dm';
  document.body.dataset.anim = state?.settings?.animate === false ? 'off' : 'on';
}

function applyLocale() {
  document.querySelectorAll('[data-pop-i18n]').forEach(el => { el.textContent = tr(el.dataset.popI18n); });
  document.querySelectorAll('[data-pop-placeholder]').forEach(el => { el.placeholder = tr(el.dataset.popPlaceholder); });
  document.querySelectorAll('[data-pop-aria]').forEach(el => { el.setAttribute('aria-label', tr(el.dataset.popAria)); });
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

// A failed Undo or Move on a saved item ("change") names the change, not a save.
function showCaptureFailure(error, { change = false } = {}) {
  const message = tr(
    error?.code === 'LOCUS_STATE_CONFLICT'
      ? (change ? 'changeConflict' : 'captureConflict')
      : isPopupStateRecoveryError(error)
        ? (change ? 'changeUnknown' : 'captureUnknown')
        : (change ? 'changeFailed' : 'captureFailed')
  );
  toast(message, {
    persistent: true,
    actionLabel: tr('openLocus'),
    action: async () => {
      try {
        await chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
        window.close();
      } catch (openError) {
        console.error('Could not open Locus after capture failure', openError);
        return 'keep';
      }
    },
  });
  $('pop-toast').classList.add('interactive');
  requestAnimationFrame(() => $('pop-toast-action').focus());
}

async function recoverCaptureWriteFailure(error, snapshot, failureOptions = {}) {
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
    if (activeSection !== 'main-section') resetToMain();
  } catch (renderError) {
    console.error('Could not refresh the popup after capture failure', renderError);
  }
  try { showCaptureFailure(error, failureOptions); } catch (displayError) {
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

function filterPopupCaptureTabs(tabs, destinationItems, deduplicate = state?.settings?.captureDeduplicate !== false) {
  const candidates = Array.from(tabs || []);
  if (!deduplicate) return candidates;
  const seenUrls = popupCaptureDestinationTabUrls(destinationItems);
  return candidates.filter(tab => {
    const url = typeof tab?.url === 'string' ? tab.url : '';
    if (!url) return true;
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });
}

function popupCaptureDestinationTabUrls(destinationItems) {
  const pending = Array.isArray(destinationItems) ? [...destinationItems] : [];
  const seen = new Set();
  const urls = new Set();
  while (pending.length) {
    const item = pending.pop();
    if (!item || typeof item !== 'object' || seen.has(item)) continue;
    seen.add(item);
    if (item.type === 'tab' && typeof item.url === 'string' && item.url) urls.add(item.url);
    if (Array.isArray(item.items)) {
      for (const child of item.items) pending.push(child);
    }
  }
  return urls;
}

function popupCaptureError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function collectPopupCaptureReservedIds(candidateState) {
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
  visit(candidateState);
  return used;
}

function createPopupCaptureIdAllocator(candidateState, makeId = uid) {
  const used = collectPopupCaptureReservedIds(candidateState);
  return () => {
    for (let attempts = 0; attempts < 10000; attempts += 1) {
      const candidate = makeId();
      const id = typeof candidate === 'string' ? candidate : '';
      if (id && !used.has(id)) {
        used.add(id);
        return id;
      }
    }
    throw popupCaptureError(
      'LOCUS_POPUP_CAPTURE_ID_UNAVAILABLE',
      'Locus could not allocate a safe popup capture identity.',
    );
  };
}

function popupCaptureHierarchy(candidateState) {
  const workspaces = Array.isArray(candidateState?.workspaces) ? candidateState.workspaces : [];
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

function requirePopupCaptureId(value, label) {
  if (typeof value !== 'string' || !value) {
    throw popupCaptureError(
      'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
      `Locus could not confirm the ${label} identity.`,
    );
  }
  return value;
}

function requireUniquePopupCaptureMatch(matches, label) {
  if (matches.length !== 1) {
    throw popupCaptureError(
      'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
      `Locus could not confirm one exact ${label}.`,
    );
  }
  return matches[0];
}

function resolvePopupGroupDestination(candidateState, groupId, label = 'Group') {
  const hierarchy = popupCaptureHierarchy(candidateState);
  const exactGroupId = requirePopupCaptureId(groupId, label);
  const entry = requireUniquePopupCaptureMatch(
    hierarchy.groups.filter(candidate => candidate.group?.id === exactGroupId),
    label,
  );
  const workspaceId = requirePopupCaptureId(entry.ws?.id, `${label} Workspace`);
  const categoryId = requirePopupCaptureId(entry.cat?.id, `${label} Space`);
  const ws = requireUniquePopupCaptureMatch(
    hierarchy.workspaces.filter(candidate => candidate?.id === workspaceId),
    `${label} Workspace`,
  );
  const spaceEntry = requireUniquePopupCaptureMatch(
    hierarchy.spaces.filter(candidate => candidate.cat?.id === categoryId),
    `${label} Space`,
  );
  if (entry.ws !== ws || spaceEntry.ws !== ws || entry.cat !== spaceEntry.cat) {
    throw popupCaptureError(
      'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
      `Locus could not confirm the ${label} hierarchy.`,
    );
  }
  return { ws, cat: entry.cat, group: entry.group, proposedInbox: false };
}

function resolvePopupCaptureDestination(candidateState, {
  useLast = true,
  overridePresent = false,
  overrideGroupId = null,
} = {}) {
  const settings = candidateState?.settings || {};
  const hierarchy = popupCaptureHierarchy(candidateState);
  if (!hierarchy.workspaces.length) {
    throw popupCaptureError(
      'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
      'Locus could not find a popup capture Workspace.',
    );
  }

  if (overridePresent) {
    return {
      ...resolvePopupGroupDestination(candidateState, overrideGroupId, 'selected Group'),
      source: 'selected',
    };
  }

  if (useLast && settings.captureRememberLast !== false
      && Object.prototype.hasOwnProperty.call(settings, 'captureLastTarget')) {
    const remembered = settings.captureLastTarget;
    if (!remembered || typeof remembered !== 'object' || Array.isArray(remembered)) {
      throw popupCaptureError(
        'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
        'The remembered popup capture destination is unavailable.',
      );
    }
    const workspaceId = requirePopupCaptureId(remembered.workspaceId, 'remembered Workspace');
    const categoryId = requirePopupCaptureId(remembered.categoryId, 'remembered Space');
    const groupId = requirePopupCaptureId(remembered.groupId, 'remembered Group');
    const ws = requireUniquePopupCaptureMatch(
      hierarchy.workspaces.filter(candidate => candidate?.id === workspaceId),
      'remembered Workspace',
    );
    const spaceEntry = requireUniquePopupCaptureMatch(
      hierarchy.spaces.filter(entry => entry.cat?.id === categoryId),
      'remembered Space',
    );
    const groupEntry = requireUniquePopupCaptureMatch(
      hierarchy.groups.filter(entry => entry.group?.id === groupId),
      'remembered Group',
    );
    if (spaceEntry.ws !== ws || groupEntry.ws !== ws || groupEntry.cat !== spaceEntry.cat) {
      throw popupCaptureError(
        'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
        'The remembered popup capture destination moved.',
      );
    }
    return {
      ws,
      cat: spaceEntry.cat,
      group: groupEntry.group,
      proposedInbox: false,
      source: 'remembered',
    };
  }

  const defaultCategoryId = settings.captureDefaultCategoryId;
  if (defaultCategoryId != null && defaultCategoryId !== '') {
    requirePopupCaptureId(defaultCategoryId, 'default Space');
    const entry = requireUniquePopupCaptureMatch(
      hierarchy.spaces.filter(candidate => candidate.cat?.id === defaultCategoryId),
      'default Space',
    );
    const workspaceId = requirePopupCaptureId(entry.ws?.id, 'default Workspace');
    const ws = requireUniquePopupCaptureMatch(
      hierarchy.workspaces.filter(candidate => candidate?.id === workspaceId),
      'default Workspace',
    );
    if (entry.ws !== ws) {
      throw popupCaptureError(
        'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
        'The default popup capture Space moved.',
      );
    }
    return { ws, cat: entry.cat, group: null, proposedInbox: false, source: 'default' };
  }

  const activeWorkspaceId = requirePopupCaptureId(candidateState?.activeWsId, 'active Workspace');
  const ws = requireUniquePopupCaptureMatch(
    hierarchy.workspaces.filter(candidate => candidate?.id === activeWorkspaceId),
    'active Workspace',
  );
  const activeCategoryId = requirePopupCaptureId(ws.activeCatId, 'active Space');
  const entry = requireUniquePopupCaptureMatch(
    hierarchy.spaces.filter(candidate => candidate.cat?.id === activeCategoryId),
    'active Space',
  );
  if (entry.ws !== ws) {
    throw popupCaptureError(
      'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
      'The active popup capture Space moved.',
    );
  }
  return { ws, cat: entry.cat, group: null, proposedInbox: false, source: 'active' };
}

function previewPopupCaptureTarget(candidateState, options = {}) {
  const destination = resolvePopupCaptureDestination(candidateState, options);
  if (destination.group) return destination;
  const groups = destination.cat.groups;
  if (groups != null && !Array.isArray(groups)) {
    throw popupCaptureError(
      'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
      'The popup capture Space has an invalid Group list.',
    );
  }
  const inboxes = (groups || []).filter(group => group?.name === 'Inbox');
  if (inboxes.length > 1) {
    throw popupCaptureError(
      'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
      'The popup capture Space has more than one Inbox.',
    );
  }
  if (inboxes.length === 1) {
    const exact = resolvePopupGroupDestination(candidateState, inboxes[0].id, 'Inbox Group');
    if (exact.ws !== destination.ws || exact.cat !== destination.cat || exact.group !== inboxes[0]) {
      throw popupCaptureError(
        'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
        'The popup capture Inbox moved.',
      );
    }
    return { ...destination, group: inboxes[0], proposedInbox: false };
  }
  return {
    ...destination,
    group: {
      id: null,
      name: 'Inbox',
      symbol: '⌑',
      color: '#6366f1',
      collapsed: false,
      items: [],
      proposedInbox: true,
    },
    proposedInbox: true,
  };
}

function popupCaptureTargetDescriptor(target) {
  const proposedInbox = target?.proposedInbox === true || target?.group?.proposedInbox === true;
  return {
    workspaceId: requirePopupCaptureId(target?.ws?.id, 'reviewed Workspace'),
    categoryId: requirePopupCaptureId(target?.cat?.id, 'reviewed Space'),
    groupId: proposedInbox ? null : requirePopupCaptureId(target?.group?.id, 'reviewed Group'),
    proposedInbox,
  };
}

function resolvePopupCaptureSpaceTarget(candidateState, descriptor) {
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
    throw popupCaptureError(
      'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
      'The reviewed popup capture destination is unavailable.',
    );
  }
  const hierarchy = popupCaptureHierarchy(candidateState);
  const workspaceId = requirePopupCaptureId(descriptor.workspaceId, 'reviewed Workspace');
  const categoryId = requirePopupCaptureId(descriptor.categoryId, 'reviewed Space');
  const ws = requireUniquePopupCaptureMatch(
    hierarchy.workspaces.filter(candidate => candidate?.id === workspaceId),
    'reviewed Workspace',
  );
  const spaceEntry = requireUniquePopupCaptureMatch(
    hierarchy.spaces.filter(candidate => candidate.cat?.id === categoryId),
    'reviewed Space',
  );
  if (spaceEntry.ws !== ws) {
    throw popupCaptureError(
      'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
      'The reviewed popup capture Space moved.',
    );
  }

  const groups = spaceEntry.cat.groups;
  if (groups != null && !Array.isArray(groups)) {
    throw popupCaptureError(
      'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
      'The reviewed popup capture Space has an invalid Group list.',
    );
  }
  if (descriptor.proposedInbox === true) {
    if (descriptor.groupId != null || (groups || []).some(group => group?.name === 'Inbox')) {
      throw popupCaptureError(
        'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
        'The reviewed popup Inbox destination changed.',
      );
    }
    return { ws, cat: spaceEntry.cat, group: null, proposedInbox: true };
  }

  const groupId = requirePopupCaptureId(descriptor.groupId, 'reviewed Group');
  const groupEntry = requireUniquePopupCaptureMatch(
    hierarchy.groups.filter(candidate => candidate.group?.id === groupId),
    'reviewed Group',
  );
  if (groupEntry.ws !== ws || groupEntry.cat !== spaceEntry.cat) {
    throw popupCaptureError(
      'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
      'The reviewed popup capture Group moved.',
    );
  }
  return { ws, cat: spaceEntry.cat, group: groupEntry.group, proposedInbox: false };
}

function materializePopupCaptureTarget(candidateState, descriptor, allocateId) {
  const target = resolvePopupCaptureSpaceTarget(candidateState, descriptor);
  if (!target.proposedInbox) return target;
  if (target.cat.groups == null) target.cat.groups = [];
  const group = {
    id: allocateId(),
    name: 'Inbox',
    symbol: '⌑',
    color: '#6366f1',
    collapsed: false,
    items: [],
  };
  target.cat.groups.unshift(group);
  return { ...target, group };
}

function resolveGroupById(groupId) {
  try {
    return resolvePopupGroupDestination(state, groupId);
  } catch {
    return null;
  }
}

function findCaptureTarget({ useLast = true } = {}) {
  try {
    return previewPopupCaptureTarget(state, {
      useLast,
      overridePresent: destinationOverrideGroupId != null,
      overrideGroupId: destinationOverrideGroupId,
    });
  } catch {
    return null;
  }
}

function resolvePopupSelectedTarget(groupId, { useLast = true } = {}) {
  if (groupId == null) return findCaptureTarget({ useLast });
  try {
    return previewPopupCaptureTarget(state, {
      useLast: false,
      overridePresent: true,
      overrideGroupId: groupId,
    });
  } catch {
    return null;
  }
}

function updateDestination() {
  const target = findCaptureTarget();
  $('destination-wrap').classList.toggle('hidden', !target);
  if (!target) return 0;
  const waiting = popupInboxWaiting(target.group);
  // The card's chip is narrow: it names the Group, and the full path stays in
  // its accessible name, its tooltip, and the list.
  paintDestinationLabel($('destination-name'), target, { withSpace: false });
  $('destination-chip').title = popupTargetPath(target);
  const bubble = $('destination-count');
  bubble.textContent = String(waiting);
  bubble.classList.toggle('hidden', waiting === 0);
  $('destination-chip').setAttribute('aria-label', tr('destinationChip', popupTargetPath(target), waiting));
  return waiting;
}

function popupTargetPath(target) {
  return `${target?.cat?.name || ''} › ${popupGroupDisplayName(target?.group)}`;
}

// The red bubble counts what is waiting in an Inbox; other Groups show none.
function popupInboxWaiting(group) {
  return group?.name === 'Inbox' && Array.isArray(group.items) ? group.items.length : 0;
}

function paintDestinationLabel(label, target, { withSpace = true } = {}) {
  const name = document.createElement('b');
  name.textContent = popupGroupDisplayName(target?.group);
  if (!withSpace) {
    label.replaceChildren(name);
    return;
  }
  const space = document.createElement('span');
  space.className = 'dchip-space';
  space.textContent = `${target?.cat?.name || ''} ›`;
  label.replaceChildren(space, ' ', name);
}

function renderSearchShortcutHint() {
  const platform = String(navigator.userAgentData?.platform || navigator.platform || '');
  $('search-shortcut').textContent = /Mac|iPhone|iPad|iPod/i.test(platform) ? '⌘ K' : 'Ctrl K';
}

function setMainCaptureReadState(readState, count = 0) {
  const normalizedCount = Number.isInteger(count) && count > 0 ? count : 0;
  const unavailable = readState !== 'ready' || normalizedCount === 0;
  const section = $('main-section');
  section.dataset.readState = readState;
  section.dataset.tabCount = String(normalizedCount);
  for (const id of ['ps', 'qs-all', 'hib-open']) {
    const control = $(id);
    control.disabled = unavailable;
    control.setAttribute('aria-disabled', String(unavailable));
  }
  const currentUnavailable = unavailable || !all.some(candidate => candidate.id === activeTabId);
  for (const id of ['more-save-current', 'hero-save']) {
    const currentAction = $(id);
    currentAction.disabled = currentUnavailable;
    currentAction.setAttribute('aria-disabled', String(currentUnavailable));
  }
}

function renderLoadError() {
  setMainCaptureReadState('error', 0);
  const loadState = $('load-state');
  loadState.className = 'state-card error';
  loadState.setAttribute('role', 'alert');
  loadState.setAttribute('aria-atomic', 'true');
  loadState.innerHTML = `<div class="state-card-content"><span class="state-card-mark" aria-hidden="true">!</span><span class="state-card-copy"><strong>${esc(tr('loadErrorTitle'))}</strong><span>${esc(tr('loadError'))}</span></span></div><button id="retry-load" class="state-card-action" type="button">${esc(tr('retry'))}</button>`;
  $('retry-load').onclick = load;
  $('tabs-region').classList.add('hidden');
  $('hero').classList.add('hidden');
  requestAnimationFrame(() => $('retry-load')?.focus());
}

function renderLoadingState() {
  setMainCaptureReadState('loading', 0);
  const loadState = $('load-state');
  loadState.className = 'state-card';
  loadState.setAttribute('role', 'status');
  loadState.setAttribute('aria-atomic', 'true');
  loadState.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${esc(tr('loadingTabs'))}</span>`;
  loadState.classList.remove('hidden');
}

async function readPopupWindow() {
  const [current, tabs] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    chrome.tabs.query({ currentWindow: true })
  ]);
  activeTab = current[0] || null;
  activeTabId = current[0]?.id ?? null;
  activeWindowId = current[0]?.windowId ?? null;
  all = tabs.filter(t => isPopupCapturableUrl(t.url));
  savedTabUrls = popupCaptureDestinationTabUrls(popupCaptureHierarchy(state).groups
    .flatMap(entry => Array.isArray(entry.group.items) ? entry.group.items : []));
  reconcileSelectedTabs();
  $('window-count').textContent = all.length;
  setMainCaptureReadState('ready', all.length);
  renderHero();
  renderTabs();
  updateDestination();
}

async function load() {
  const retrying = document.activeElement?.id === 'retry-load';
  $('popup').setAttribute('aria-busy', 'true');
  renderLoadingState();
  try {
    await loadState();
    loadHibernatePrefs();
    applyAppearance();
    applyLocale();
    await readPopupWindow();
    $('load-state').classList.add('hidden');
    $('tabs-region').classList.remove('hidden');
    if (retrying) requestAnimationFrame(() => mainCaptureFocusTarget()?.focus());
  } catch (error) {
    console.error('Popup load failed', error);
    renderLoadError();
  } finally {
    $('popup').setAttribute('aria-busy', 'false');
  }
}

// After a save or hibernate the list is read again in place: rows for tabs
// that are gone slide out first, and the loading card never flashes.
async function refreshPopupWindow() {
  try {
    await loadState();
    const before = all.map(tab => tab.id);
    const live = new Set((await chrome.tabs.query({ currentWindow: true }))
      .filter(tab => isPopupCapturableUrl(tab.url))
      .map(tab => tab.id));
    await animateRowsOut(before.filter(id => !live.has(id)));
    await readPopupWindow();
  } catch (error) {
    console.error('Popup refresh failed', error);
    renderLoadError();
  }
}

function animateRowsOut(tabIds) {
  const rows = tabIds
    .map(id => $('ptabs').querySelector(`.pti[data-tab-id="${id}"]`))
    .filter(Boolean);
  if (!rows.length || popupMotionOff()) return Promise.resolve();
  rows.forEach((row, index) => {
    row.style.transitionDelay = `${index * 35}ms`;
    row.classList.add('is-leaving');
    row.setAttribute('aria-hidden', 'true');
  });
  return new Promise(resolve => {
    const last = rows[rows.length - 1];
    const done = () => { last.removeEventListener('transitionend', onEnd); clearTimeout(fallback); resolve(); };
    const onEnd = event => { if (event.target === last && event.propertyName === 'height') done(); };
    const fallback = setTimeout(done, 360 + rows.length * 35);
    last.addEventListener('transitionend', onEnd);
  });
}

function popupMotionOff() {
  return document.body.dataset.anim === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function popupTabInitial(tab) {
  return (tab?.title || dispUrl(tab?.url) || '?').trim()[0]?.toUpperCase() || '?';
}

function renderHero() {
  const hero = $('hero');
  hero.classList.toggle('hidden', !activeTab);
  if (!activeTab) return;
  const title = activeTab.title || activeTab.url || tr('unnamedTab');
  $('hero-title').textContent = title;
  $('hero-title').title = title;
  $('hero-host').textContent = dispUrl(activeTab.url);
  const icon = $('hero-icon');
  const initial = $('hero-initial');
  const src = localFaviconUrl(activeTab.url, 64);
  initial.textContent = popupTabInitial(activeTab);
  icon.classList.toggle('hidden', !src);
  initial.classList.toggle('hidden', !!src);
  if (src) {
    icon.addEventListener('error', () => { icon.classList.add('hidden'); initial.classList.remove('hidden'); }, { once: true });
    icon.src = src;
  }
  paintHeroSaved(heroSavedTabId === activeTabId);
}

function popupTabKind(url) {
  // Content-type chips (PDF / Video), derived from the URL alone, no page access.
  return /\.pdf(?:[?#]|$)/i.test(url || '') ? tr('pdf')
    : /(?:youtube\.com\/watch|youtu\.be\/|vimeo\.com\/\d)/i.test(url || '') ? tr('video') : '';
}

// The matched part of a title is marked so the eye finds it while typing.
function popupTitleWithHit(title, query) {
  const at = query ? title.toLowerCase().indexOf(query) : -1;
  if (at < 0) return esc(title);
  return `${esc(title.slice(0, at))}<mark class="hit">${esc(title.slice(at, at + query.length))}</mark>${esc(title.slice(at + query.length))}`;
}

function renderTabs() {
  const query = $('ps').value.trim().toLowerCase();
  const others = all.filter(t => t.id !== activeTabId);
  const matches = others.filter(t => !query || (t.title || '').toLowerCase().includes(query) || (t.url || '').toLowerCase().includes(query));
  const shown = tabsExpanded || query ? matches : matches.slice(0, 5);
  const list = $('ptabs');
  list.innerHTML = '';
  if (!matches.length) {
    list.innerHTML = `<div class="empty-hint" role="status" tabindex="-1"><span>${esc(query ? tr('noMatches') : tr('noTabs'))}</span>${query ? `<button id="empty-clear-search" class="btn btn-sm" type="button">${esc(tr('clearSearch'))}</button>` : ''}</div>`;
    const clear = $('empty-clear-search');
    if (clear) clear.onclick = clearPopupSearch;
  }
  shown.forEach(tab => list.appendChild(buildTabRow(tab, query)));
  const more = $('more-tabs');
  const remaining = matches.length - shown.length;
  more.classList.toggle('hidden', Boolean(query) || matches.length <= 5);
  if (!query && matches.length > 5) {
    more.textContent = tabsExpanded ? tr('fewerTabs') : tr('moreTabs', remaining);
    more.setAttribute('aria-expanded', String(tabsExpanded));
  }
  const count = $('search-count');
  const counted = String(matches.length);
  if (query && count.textContent !== counted) restartAnimation(count, 'is-ticking');
  count.textContent = counted;
  count.classList.toggle('hidden', !query);
  $('search-clear').classList.toggle('hidden', !query);
  $('search-shortcut').classList.toggle('hidden', Boolean(query));
  updateSelectionUi();
}

function clearPopupSearch() {
  $('ps').value = '';
  renderTabs();
  $('ps').focus();
}

function buildTabRow(tab, query = '') {
  const row = document.createElement('div');
  const selected = selectedTabIds.has(tab.id);
  const saved = savedTabUrls.has(tab.url);
  row.className = `pti${selected ? ' selected' : ''}${saved ? ' is-saved' : ''}`;
  row.setAttribute('role', 'listitem');
  row.dataset.tabId = String(tab.id);
  const initial = popupTabInitial(tab);
  const localIcon = localFaviconUrl(tab.url);
  const icon = localIcon
    ? `<img src="${esc(localIcon)}" alt=""><span class="pti-fallback fav-initial hidden" aria-hidden="true">${esc(initial)}</span>`
    : `<span class="pti-fallback fav-initial" aria-hidden="true">${esc(initial)}</span>`;
  const kind = popupTabKind(tab.url);
  const kindBadge = kind ? `<span class="pti-badge pti-kind">${esc(kind)}</span>` : '';
  const savedMark = saved ? `<span class="pti-mark" title="${esc(tr('savedTitle'))}"><svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg><span class="sr-only">${esc(tr('savedTitle'))}</span></span>` : '';
  const title = tab.title || tab.url || tr('unnamedTab');
  const select = `<button class="pti-select" type="button" data-tab-id="${tab.id}" aria-pressed="${selected}" aria-label="${esc(tr(selected ? 'deselectTab' : 'selectTab', title))}"><span><svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg></span></button>`;
  const actions = `<div class="pti-acts"><button class="pti-save" type="button" title="${esc(tr('save'))}" aria-label="${esc(tr('saveTabNamed', title))}"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 2.5h7a1 1 0 0 1 1 1v10L8 11l-4.5 2.5v-10a1 1 0 0 1 1-1z"/></svg></button><button class="pti-hib" type="button" title="${esc(tr('hibernateTab'))}" aria-label="${esc(tr('hibernateTabNamed', title))}"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" aria-hidden="true"><path d="M11.5 8.2A4.6 4.6 0 0 1 5.8 2.5a4.6 4.6 0 1 0 5.7 5.7z"/></svg></button></div>`;
  row.innerHTML = `<span class="pti-lead"><span class="pti-fav" aria-hidden="true">${icon}</span>${select}</span><button class="pti-open" type="button" title="${esc(tr('openTab'))}"><span class="pti-info"><span class="pti-title">${popupTitleWithHit(title, query)}</span><span class="pti-url">${esc(dispUrl(tab.url))}</span></span></button>${kindBadge}${savedMark}${actions}`;
  const image = row.querySelector('img');
  if (image) image.addEventListener('error', () => { image.classList.add('hidden'); row.querySelector('.pti-fallback')?.classList.remove('hidden'); });
  row.querySelector('.pti-open').onclick = () => { chrome.tabs.update(tab.id, { active: true }); window.close(); };
  row.querySelector('.pti-save').onclick = () => startCapture(tab);
  row.querySelector('.pti-select').onclick = () => toggleTabSelection(tab.id);
  row.querySelector('.pti-hib').onclick = () => hibernateSingle(tab);
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

function clearTabSelection() {
  if (!selectedTabIds.size) return;
  selectedTabIds.clear();
  persistSelectedTabs();
  updateSelectionUi();
  updateHibernateCount().catch(() => {});
  $('ps').focus();
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
  $('ptabs').classList.toggle('picking', count > 0);
  $('selection-status').textContent = tr('selectedCount', count);
  $('selection-status').classList.toggle('hidden', count === 0);
  $('clear-selection').classList.toggle('hidden', count === 0);
  $('hib-selected-count').textContent = `(${count})`;
  const selectedScope = $('hib-scope').querySelector('[data-val="selected"]');
  selectedScope.disabled = count === 0;
  selectedScope.setAttribute('aria-disabled', String(count === 0));
  // An emptied selection never leaves Hibernate on a disabled "Selected (0)".
  if (count === 0 && $('hib-scope').querySelector('.active')?.dataset.val === 'selected') {
    setHibernateScope('window');
  }
}

function isVisiblePopupControl(element) {
  return !!element?.isConnected && !element.disabled && !element.closest('.hidden');
}

function mainCaptureFocusTarget() {
  if (isVisiblePopupControl($('ps'))) return $('ps');
  if (isVisiblePopupControl($('retry-load'))) return $('retry-load');
  return $('ptabs')?.querySelector('.empty-hint') || null;
}

function renderSection(id, preferredFocus = null) {
  // The other sections are sheets over the main view. Main stays visible behind
  // the scrim, out of reach while a sheet is open.
  ['save-window-section', 'save-to-section', 'hibernate-section'].forEach(section => $(section).classList.toggle('hidden', section !== id));
  $('main-section').inert = id !== 'main-section';
  const header = $('popup-header');
  if (header) header.inert = id !== 'main-section';
  activeSection = id;
  requestAnimationFrame(() => {
    const fallback = id === 'main-section'
      ? mainCaptureFocusTarget()
      : [...$(id).querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .find(isVisiblePopupControl);
    const target = isVisiblePopupControl(preferredFocus) ? preferredFocus : fallback;
    target?.focus();
  });
}

function showSection(id, opener = document.activeElement) {
  if (id === activeSection) return;
  sectionHistory.push({ sectionId: activeSection, opener });
  renderSection(id);
}

function returnToPreviousSection() {
  const previous = sectionHistory.pop();
  if (previous) {
    renderSection(previous.sectionId, previous.opener);
    return;
  }
  renderSection('main-section', $('ps'));
}

function resetToMain(focusTarget = $('ps')) {
  sectionHistory = [];
  renderSection('main-section', focusTarget);
}

async function quickCapture(tab) {
  const target = findCaptureTarget();
  if (!target) return toast(tr('openFirst'), { tone: 'warning' });
  if (await doSave(target.ws, target.cat, target.group, tab, { quick: true })) markTabSaved(tab);
}

// Save is one click (Kai, 2026-11-06). "Ask where to save" is an opt-in: only a
// stored true opens a sheet first; a missing or false value saves at once.
function popupAsksWhereToSave() {
  return state?.settings?.captureAskEveryTime === true;
}

function startCapture(tab) {
  closeFloatingLayer();
  if (popupAsksWhereToSave()) openSavePicker(tab);
  else quickCapture(tab);
}

// "Ask where to save" opens this sheet: pick a Group and the tab is saved there.
function openSavePicker(tab) {
  pickerMode = 'tab';
  pendingTab = tab;
  locateResultVisible = false;
  locateRecoveryRoute = null;
  windowSaveRecoveryIntent = null;
  windowSaveResultMessage = '';
  quickCaptureRecoveryIntent = null;
  quickCaptureCloseRequested = false;
  quickCaptureResultMessage = '';
  setQuickCaptureDoneAction(false);
  $('stg-back').classList.remove('hidden');
  $('stg-destination-label').classList.remove('hidden');
  $('stg-list').classList.remove('hidden');
  $('stg-locate-result').classList.add('hidden');
  $('stg-locate-result').setAttribute('role', 'status');
  const hasDestination = state?.workspaces?.some(ws => (ws.categories || []).some(cat => (cat.groups || []).length));
  $('stg-locate-option').classList.toggle('hidden', !hasDestination);
  $('stg-locate').checked = false;
  $('save-title').textContent = tr('saveTab');
  $('save-tab-title').textContent = tab?.title || tab?.url || tr('unnamedTab');
  $('save-context').textContent = dispUrl(tab?.url);
  const list = $('stg-list');
  list.innerHTML = '';
  if (!state?.workspaces?.length) {
    list.innerHTML = `<div class="empty-hint">${esc(tr('noWorkspaces'))}</div>`;
  } else {
    const current = findCaptureTarget();
    const manyWorkspaces = state.workspaces.length > 1;
    state.workspaces.forEach(ws => (ws.categories || []).forEach(cat => {
      const label = document.createElement('div');
      label.className = 'stg-cat-lbl';
      label.textContent = manyWorkspaces ? `${ws.name} · ${cat.name}` : cat.name;
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
        const isCurrent = current?.group === group;
        if (isCurrent) row.setAttribute('aria-current', 'true');
        row.innerHTML = `<span class="dest-dot" aria-hidden="true"></span><span class="nm">${esc(popupGroupDisplayName(group))}</span><span class="cnt mono">${group.items?.length || 0}</span>${isCurrent ? '<svg class="dest-check" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>' : ''}`;
        row.querySelector('.dest-dot').style.background = popupGroupColor(group);
        row.onclick = () => saveFromPicker(ws, cat, group, tab);
        list.appendChild(row);
      });
    }));
  }
  showSection('save-to-section');
}

async function saveFromPicker(ws, cat, group, tab) {
  const selected = resolveGroupById(group.id);
  if (!selected || selected.ws !== ws || selected.cat !== cat || selected.group !== group) {
    toast(tr('openFirst'), { tone: 'warning' });
    return;
  }
  const accepted = await doSave(selected.ws, selected.cat, selected.group, tab, { locate: $('stg-locate').checked });
  if (!accepted) return;
  markTabSaved(tab);
  // A result card that needs an answer keeps the sheet; a clean save returns
  // to the page so the check and the receipt are in view.
  if (!locateResultVisible) resetToMain(tab?.id === activeTabId ? $('hero-save') : $('ps'));
}

function popupLocateRecoveryRouteMatches(tab, recovery, { requireActive = true } = {}) {
  if (!tab
    || !Number.isInteger(recovery?.routeTabId)
    || !Number.isInteger(recovery?.routeWindowId)
    || typeof recovery?.routeUrl !== 'string'
    || !recovery.routeUrl
    || !recovery.routeUrl.startsWith(chrome.runtime.getURL('newtab.html'))
    || tab.id !== recovery.routeTabId
    || tab.windowId !== recovery.routeWindowId
    || (requireActive && tab.active !== true)
    || tab.url !== recovery.routeUrl) return false;
  return typeof tab.pendingUrl !== 'string'
    || !tab.pendingUrl
    || tab.pendingUrl === recovery.routeUrl;
}

async function openPopupLocateRecovery(recovery) {
  if (!recovery) {
    return chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
  }
  try {
    const current = await chrome.tabs.get(recovery.routeTabId);
    if (popupLocateRecoveryRouteMatches(current, recovery, { requireActive: false })) {
      const activated = await chrome.tabs.update(recovery.routeTabId, { active: true });
      if (popupLocateRecoveryRouteMatches(activated, recovery)) {
        await chrome.windows.update(recovery.routeWindowId, { focused: true });
        const focused = await chrome.tabs.get(recovery.routeTabId);
        if (popupLocateRecoveryRouteMatches(focused, recovery)) return focused;
      }
    }
  } catch (error) {
    console.error('Could not reuse the popup Locate recovery tab:', error);
  }
  return chrome.tabs.create({ url: recovery.routeUrl });
}

function showLocateFailure(cat, group, result = null) {
  const sourceClosePartial = result?.code === 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED';
  const destinationUnavailable = result?.code === 'LOCUS_LOCATE_TARGET_UNAVAILABLE';
  locateResultVisible = true;
  windowSaveRecoveryIntent = null;
  windowSaveResultMessage = '';
  quickCaptureRecoveryIntent = null;
  quickCaptureCloseRequested = false;
  quickCaptureResultMessage = '';
  setQuickCaptureDoneAction(false);
  locateRecoveryRoute = result?.routeCreated
    && Number.isInteger(result?.routeTabId)
    && Number.isInteger(result?.routeWindowId)
    && typeof result?.routeUrl === 'string'
    && result.routeUrl
    ? {
        routeTabId: result.routeTabId,
        routeWindowId: result.routeWindowId,
        routeUrl: result.routeUrl,
      }
    : null;
  const destination = sourceClosePartial
    ? `${result.destination.categoryName} / ${result.destination.groupName}`
    : destinationUnavailable
    ? ''
    : `${cat.name} / ${group.name}`;
  $('save-title').textContent = tr('savedTitle');
  $('save-context').textContent = destination;
  $('stg-destination-label').classList.add('hidden');
  $('stg-list').classList.add('hidden');
  $('stg-locate-option').classList.add('hidden');
  $('stg-back').classList.add('hidden');
  const resultKey = result?.routeCreated
    ? (result?.sourceCloseFailed ? 'locateRouteInactiveSourceOpen' : 'locateRouteInactive')
    : 'locateFailed';
  $('stg-locate-result-message').textContent = sourceClosePartial
    ? tr('quickCaptureCloseUnconfirmed')
    : destinationUnavailable
    ? tr('quickCaptureReceiptUnavailable')
    : result?.effectUnknown === true
    ? tr('quickCaptureOpenUnknown', destination, result.closeRequested === true)
    : tr(resultKey, destination);
  $('stg-open-locus').textContent = tr(locateRecoveryRoute == null ? 'openLocus' : 'switchToSavedItem');
  $('stg-locate-result').classList.remove('hidden');
  requestAnimationFrame(() => $('stg-open-locus').focus());
}

function isValidQuickCaptureResult(result, intent) {
  if (!result || typeof result.ok !== 'boolean' || typeof result.destinationReady !== 'boolean') return false;
  if (result.ok !== result.destinationReady) return false;
  if (!result.ok) {
    return typeof result.code === 'string' && result.destination == null;
  }
  if (result.code !== undefined) return false;
  const destination = result.destination;
  return !!destination
    && destination.workspaceId === intent?.workspaceId
    && destination.itemId === intent?.itemId
    && typeof destination.categoryId === 'string'
    && typeof destination.categoryName === 'string'
    && typeof destination.groupId === 'string'
    && typeof destination.groupName === 'string';
}

function setQuickCaptureDoneAction(closeSource) {
  quickCaptureCloseRequested = closeSource === true;
  const key = quickCaptureCloseRequested ? 'closeSavedTab' : 'done';
  const ariaKey = quickCaptureCloseRequested ? 'closeSavedTab' : 'closePopup';
  $('stg-done').dataset.popI18n = key;
  $('stg-done').dataset.popAria = ariaKey;
  $('stg-done').textContent = tr(key);
  $('stg-done').setAttribute('aria-label', tr(ariaKey));
}

// A one-click save whose receipt could not confirm where the item went keeps
// this durable card with its exact retry; a confirmed one gets the receipt toast.
function showQuickCaptureResult({ cat, group, item, intent }) {
  locateResultVisible = true;
  locateRecoveryRoute = null;
  windowSaveRecoveryIntent = null;
  windowSaveResultMessage = '';
  quickCaptureRecoveryIntent = { ...intent };
  quickCaptureResultMessage = tr('quickCaptureReceiptUnavailable');
  $('save-title').textContent = tr('savedTitle');
  $('save-context').textContent = `${cat.name} / ${group.name}`;
  $('save-tab-title').textContent = item.title || item.url || tr('unnamedTab');
  $('stg-destination-label').classList.add('hidden');
  $('stg-list').classList.add('hidden');
  $('stg-locate-option').classList.add('hidden');
  $('stg-back').classList.add('hidden');
  $('stg-locate-result-message').textContent = quickCaptureResultMessage;
  $('stg-open-locus').textContent = tr('openSavedItem');
  setQuickCaptureDoneAction(false);
  $('stg-locate-result').classList.remove('hidden');
  showSection('save-to-section');
  requestAnimationFrame(() => $('stg-open-locus').focus());
}

function windowSaveSourceResult(result) {
  if (result?.effectUnknown === true) {
    return tr('windowEffectUnknown', Number(result.requestedCount) || 0, result.closeRequested === true);
  }
  if (result?.destinationReady !== true) return tr('destinationUnavailable');
  if (result.closeRequested !== true) return tr('originalTabsOpen');
  const closed = Number(result.closedCount) || 0;
  const unconfirmed = Number(result.unconfirmedCount) || 0;
  if (unconfirmed > 0) return tr('partialTabClose', closed, unconfirmed);
  if (closed > 0) return tr('closedOtherTabs', closed);
  return tr('currentTabOpen');
}

function isValidWindowSaveResult(result, intent) {
  if (!result || typeof result.destinationReady !== 'boolean') return false;
  if (!Array.isArray(intent?.sourceTabs)) return false;
  if (typeof result.ok !== 'boolean') return false;
  if (result.closeRequested !== (intent?.closeSources === true)) return false;
  const counts = [result.requestedCount, result.closedCount, result.unconfirmedCount];
  if (counts.some(count => !Number.isSafeInteger(count) || count < 0)) return false;
  if (result.requestedCount !== intent.sourceTabs.length) return false;
  if (!result.closeRequested && (result.closedCount !== 0 || result.unconfirmedCount !== 0)) return false;
  if (result.closeRequested && result.closedCount + result.unconfirmedCount !== result.requestedCount) return false;
  if (!result.destinationReady && result.closedCount !== 0) return false;
  if (result.ok !== (result.destinationReady && result.unconfirmedCount === 0)) return false;
  if (result.destinationReady) {
    const destination = result.destination;
    if (!destination
      || destination.workspaceId !== intent.workspaceId
      || destination.groupId !== intent.groupId
      || typeof destination.categoryId !== 'string'
      || typeof destination.categoryName !== 'string'
      || typeof destination.groupName !== 'string') return false;
  }
  return true;
}

function showWindowSaveResult(args) {
  prepareWindowSaveResult(args);
  locateResultVisible = true;
  showSection('save-to-section');
  requestAnimationFrame(() => $('stg-open-locus').focus());
}

// Fills the result card for a window save without showing it, so the receipt's
// Open can retry through the same card when the destination cannot open.
function prepareWindowSaveResult({ target, receiving, itemCount, hasNote, result }) {
  locateRecoveryRoute = null;
  quickCaptureRecoveryIntent = null;
  quickCaptureCloseRequested = false;
  quickCaptureResultMessage = '';
  setQuickCaptureDoneAction(false);
  windowSaveRecoveryIntent = result?.destinationReady === true || result?.effectUnknown === true
    ? {
        workspaceId: result?.destination?.workspaceId || target.ws.id,
        groupId: result?.destination?.groupId || receiving.id,
        sourceWindowId: activeWindowId,
      }
    : null;
  const destination = result?.destinationReady === true
    ? `${result.destination.categoryName} / ${result.destination.groupName}`
    : '';
  windowSaveResultMessage = windowSaveSourceResult(result);
  $('save-title').textContent = tr('windowSavedTitle');
  $('save-context').textContent = destination;
  $('save-tab-title').textContent = tr('windowSavedSummary', itemCount, hasNote);
  $('stg-destination-label').classList.add('hidden');
  $('stg-list').classList.add('hidden');
  $('stg-locate-option').classList.add('hidden');
  $('stg-back').classList.add('hidden');
  $('stg-locate-result-message').textContent = windowSaveResultMessage;
  $('stg-open-locus').textContent = tr(windowSaveRecoveryIntent ? 'openDestination' : 'openLocus');
  $('stg-locate-result').classList.remove('hidden');
}

function announcePopupResult(message, focusTarget = $('stg-open-locus')) {
  $('stg-locate-result-message').textContent = '';
  requestAnimationFrame(() => {
    $('stg-locate-result-message').textContent = message;
    focusTarget?.focus();
  });
}

function isValidWindowDestinationResult(result) {
  if (!result || typeof result.ok !== 'boolean') return false;
  if (result.ok && result.code !== undefined) return false;
  if (!result.ok && typeof result.code !== 'string') return false;
  if (result.ok) {
    return result.routeCreated === true && Number.isInteger(result.routeTabId);
  }
  if (result.routeCreated === true) return Number.isInteger(result.routeTabId);
  return result.routeCreated == null && result.routeTabId == null;
}

async function openWindowSaveDestination() {
  if (!windowSaveRecoveryIntent || !beginPopupCapture()) return false;
  try {
    let result;
    try {
      result = await sendPopupRuntimeMessageWithDeadline({
        type: 'locus-open-window-save-destination',
        ...windowSaveRecoveryIntent,
      }, 'LOCUS_WINDOW_DESTINATION_UNKNOWN');
      if (!isValidWindowDestinationResult(result)) {
        throw new Error('Locus returned an invalid destination receipt.');
      }
    } catch (error) {
      console.error('Could not request the saved window destination', error);
      $('stg-open-locus').textContent = tr('openDestination');
      announcePopupResult(`${windowSaveResultMessage} ${tr('openDestinationFailed')}`);
      return;
    }
    if (result?.ok === true) {
      window.close();
      return true;
    }
    if (result?.routeCreated && Number.isInteger(result.routeTabId)) {
      $('stg-open-locus').textContent = tr('switchToDestination');
      announcePopupResult(`${windowSaveResultMessage} ${tr('destinationRouteInactive')}`);
      return;
    }
    if (result?.code === 'LOCUS_WINDOW_DESTINATION_UNAVAILABLE') {
      windowSaveRecoveryIntent = null;
      locateRecoveryRoute = null;
      $('stg-open-locus').textContent = tr('openLocus');
      announcePopupResult(`${windowSaveResultMessage} ${tr('destinationNoLongerAvailable')}`);
      return;
    }
    $('stg-open-locus').textContent = tr('openDestination');
    announcePopupResult(`${windowSaveResultMessage} ${tr('openDestinationFailed')}`);
  } finally {
    finishPopupCapture();
  }
}

function isValidQuickCaptureActionResult(result, intent) {
  if (!result
    || !['open', 'close'].includes(result.action)
    || result.action !== intent?.action
    || typeof result.ok !== 'boolean'
    || typeof result.closeRequested !== 'boolean') return false;
  const expectedClose = intent.action === 'close' || intent.closeSource === true;
  if (result.closeRequested !== expectedClose) return false;
  if (result.effectUnknown === true) {
    return result.ok === false
      && result.code === 'LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN'
      && result.destinationReady === undefined
      && result.destination === undefined
      && result.routeReady === undefined
      && result.routeCreated === undefined
      && result.routeTabId === undefined
      && result.sourceOutcome === 'unconfirmed';
  }
  if (result.effectUnknown !== undefined || typeof result.destinationReady !== 'boolean') return false;
  const outcomes = new Set(['not-requested', 'not-attempted', 'closed', 'protected', 'unconfirmed']);
  if (!outcomes.has(result.sourceOutcome)) return false;

  if (result.destinationReady) {
    const destination = result.destination;
    if (!destination
      || destination.workspaceId !== intent.workspaceId
      || destination.itemId !== intent.itemId
      || typeof destination.categoryId !== 'string'
      || typeof destination.categoryName !== 'string'
      || typeof destination.groupId !== 'string'
      || typeof destination.groupName !== 'string') return false;
  } else if (result.destination != null || result.sourceOutcome !== 'not-attempted') {
    return false;
  }

  let expectedOk;
  if (intent.action === 'open') {
    if (typeof result.routeReady !== 'boolean') return false;
    if (result.routeReady
      && (result.routeCreated !== true || !Number.isInteger(result.routeTabId))) return false;
    if (result.routeCreated === true && !Number.isInteger(result.routeTabId)) return false;
    if (result.routeReady === false && result.sourceOutcome !== 'not-attempted') return false;
    if (result.routeReady && !expectedClose && result.sourceOutcome !== 'not-requested') return false;
    if (result.routeReady && expectedClose
      && !['closed', 'protected', 'unconfirmed'].includes(result.sourceOutcome)) return false;
    expectedOk = result.destinationReady
      && result.routeReady
      && ['not-requested', 'closed'].includes(result.sourceOutcome);
  } else {
    if (result.routeReady !== undefined
      || result.routeCreated !== undefined
      || result.routeTabId !== undefined) return false;
    expectedOk = result.destinationReady && result.sourceOutcome === 'closed';
  }
  if (result.ok !== expectedOk) return false;
  if (result.ok && result.code !== undefined) return false;
  if (!result.ok && typeof result.code !== 'string') return false;
  return true;
}

function disableQuickCaptureClose() {
  if (quickCaptureRecoveryIntent) {
    quickCaptureRecoveryIntent = {
      ...quickCaptureRecoveryIntent,
      closeSource: false,
    };
  }
  setQuickCaptureDoneAction(false);
}

function showQuickCaptureActionUnknown(action, actionControl, closeRequested) {
  const destination = $('save-context').textContent || tr('destination');
  quickCaptureResultMessage = action === 'open'
    ? tr('quickCaptureOpenUnknown', destination, closeRequested)
    : tr('quickCaptureCloseUnconfirmed');
  disableQuickCaptureClose();
  announcePopupResult(quickCaptureResultMessage, actionControl);
}

async function runQuickCaptureAction(action) {
  if (!quickCaptureRecoveryIntent || !['open', 'close'].includes(action)) return;
  if (action === 'close' && !quickCaptureCloseRequested) {
    window.close();
    return;
  }
  if (!beginPopupCapture()) return;
  const intent = {
    ...quickCaptureRecoveryIntent,
    action,
    closeSource: action === 'close' || quickCaptureRecoveryIntent.closeSource === true,
  };
  const actionControl = action === 'close' ? $('stg-done') : $('stg-open-locus');
  try {
    let result;
    try {
      result = await sendPopupRuntimeMessageWithDeadline({
        type: 'locus-complete-quick-capture',
        ...intent,
      }, 'LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN');
      if (!isValidQuickCaptureActionResult(result, intent)) {
        throw new Error('Locus returned an invalid quick-capture action receipt.');
      }
    } catch (error) {
      console.error('Could not confirm the quick-capture recovery action', error);
      showQuickCaptureActionUnknown(action, actionControl, intent.closeSource === true);
      return;
    }
    if (result.effectUnknown === true) {
      showQuickCaptureActionUnknown(action, actionControl, result.closeRequested);
      return;
    }

    if (result.destinationReady) {
      $('save-context').textContent =
        `${result.destination.categoryName} / ${result.destination.groupName}`;
    }
    if (!result.destinationReady) {
      quickCaptureRecoveryIntent = null;
      $('stg-open-locus').textContent = tr('openLocus');
      setQuickCaptureDoneAction(false);
      quickCaptureResultMessage = tr('quickCaptureDestinationUnavailable');
      announcePopupResult(quickCaptureResultMessage);
      return;
    }

    if (action === 'open') {
      if (result.routeReady === true) {
        if (result.ok) {
          window.close();
          return true;
        }
        disableQuickCaptureClose();
        quickCaptureResultMessage = tr(
          result.sourceOutcome === 'protected'
            ? 'quickCaptureCloseProtected'
            : 'quickCaptureCloseUnconfirmed'
        );
        announcePopupResult(quickCaptureResultMessage);
        return;
      }
      const destination = $('save-context').textContent || tr('destination');
      quickCaptureResultMessage =
        result.code === 'LOCUS_QUICK_CAPTURE_ROUTE_ACTIVATE_FAILED'
          ? tr('quickCaptureRouteInactive')
          : tr('quickCaptureOpenFailed', destination);
      $('stg-open-locus').textContent = tr('openSavedItem');
      announcePopupResult(quickCaptureResultMessage);
      return;
    }

    if (result.ok && result.sourceOutcome === 'closed') {
      window.close();
      return;
    }
    disableQuickCaptureClose();
    quickCaptureResultMessage = tr(
      result.sourceOutcome === 'protected'
        ? 'quickCaptureCloseProtected'
        : 'quickCaptureCloseUnconfirmed'
    );
    announcePopupResult(quickCaptureResultMessage, $('stg-done'));
  } finally {
    finishPopupCapture();
  }
}

function showOrdinaryCaptureResult({ cat, group, item, intent, closeResult }) {
  const destinationUnavailable = closeResult?.reason === 'destination-unavailable';
  locateResultVisible = true;
  locateRecoveryRoute = null;
  windowSaveRecoveryIntent = null;
  windowSaveResultMessage = '';
  quickCaptureRecoveryIntent = destinationUnavailable
    ? null
    : {
        ...intent,
        closeSource: false,
      };
  quickCaptureCloseRequested = false;
  quickCaptureResultMessage = '';
  setQuickCaptureDoneAction(false);
  const destination = closeResult?.destination;
  $('save-title').textContent = tr('savedTitle');
  $('save-context').textContent = destination
    ? `${destination.categoryName} / ${destination.groupName}`
    : '';
  $('save-tab-title').textContent = item.title || item.url || tr('unnamedTab');
  $('stg-destination-label').classList.add('hidden');
  $('stg-list').classList.add('hidden');
  $('stg-locate-option').classList.add('hidden');
  $('stg-back').classList.add('hidden');
  $('stg-locate-result-message').textContent = tr(
    destinationUnavailable
      ? 'quickCaptureDestinationUnavailable'
      : closeResult?.reason === 'changed'
      ? 'quickCaptureCloseProtected'
      : 'quickCaptureCloseUnconfirmed'
  );
  $('stg-open-locus').textContent = tr(destinationUnavailable ? 'openLocus' : 'openSavedItem');
  $('stg-locate-result').classList.remove('hidden');
  showSection('save-to-section');
  requestAnimationFrame(() => $('stg-open-locus').focus());
}

async function closeOrdinaryPopupSavedTab(intent, closeEnabled) {
  if (closeEnabled !== true) return { closed: false, reason: 'disabled' };
  const closeIntent = {
    ...intent,
    action: 'close',
    closeSource: true,
  };
  let result;
  try {
    result = await sendPopupRuntimeMessageWithDeadline({
      type: 'locus-complete-quick-capture',
      ...closeIntent,
    }, 'LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN');
    if (!isValidQuickCaptureActionResult(result, closeIntent)) {
      throw new Error('Locus returned an invalid ordinary-save close receipt.');
    }
  } catch (error) {
    console.error('Could not confirm ordinary-save source cleanup', error);
    return { closed: false, reason: 'unconfirmed' };
  }
  if (result.effectUnknown === true) return { closed: false, reason: 'unconfirmed' };
  if (!result.destinationReady) return { closed: false, reason: 'destination-unavailable' };
  if (result.sourceOutcome === 'closed') {
    return { closed: true, reason: null, destination: result.destination };
  }
  return {
    closed: false,
    reason: result.sourceOutcome === 'protected' ? 'changed' : 'unconfirmed',
    destination: result.destination,
  };
}

function popupLocateExpectedRouteUrl(intent) {
  if (typeof intent?.workspaceId !== 'string'
    || !intent.workspaceId
    || typeof intent?.itemId !== 'string'
    || !intent.itemId) return null;
  return chrome.runtime.getURL('newtab.html')
    + `#/ws/${encodeURIComponent(intent.workspaceId)}/home?item=${encodeURIComponent(intent.itemId)}`;
}

function isValidPopupLocateDestination(destination, intent) {
  return !!destination
    && destination.workspaceId === intent?.workspaceId
    && destination.itemId === intent?.itemId
    && typeof destination.categoryId === 'string'
    && typeof destination.categoryName === 'string'
    && typeof destination.groupId === 'string'
    && typeof destination.groupName === 'string';
}

function unknownPopupLocateEffectResult(intent) {
  return {
    ok: false,
    code: 'LOCUS_LOCATE_EFFECT_UNKNOWN',
    effectUnknown: true,
    closeRequested: intent?.closeSource === true,
  };
}

function isValidPopupLocateEffectResult(result, intent) {
  if (!result || typeof result.ok !== 'boolean') return false;
  const expectedRouteUrl = popupLocateExpectedRouteUrl(intent);
  if (!expectedRouteUrl) return false;
  if (result.effectUnknown === true) {
    return result.ok === false
      && result.code === 'LOCUS_LOCATE_EFFECT_UNKNOWN'
      && result.closeRequested === (intent?.closeSource === true)
      && result.routeCreated == null
      && result.routeTabId == null
      && result.routeWindowId == null
      && result.routeUrl == null
      && result.sourceClosed == null
      && result.sourceCloseFailed == null
      && result.destination == null
      && result.noticeShown == null;
  }
  if (result.effectUnknown != null || result.closeRequested != null) return false;
  if (result.ok) {
    return result.code === undefined
      && result.routeCreated === true
      && result.routeTabId == null
      && result.routeWindowId == null
      && result.routeUrl == null
      && result.destination == null
      && result.noticeShown == null
      && typeof result.sourceCloseFailed === 'boolean'
      && (intent?.closeSource === true
        ? typeof result.sourceClosed === 'boolean'
          && result.sourceCloseFailed === !result.sourceClosed
        : result.sourceClosed === null && result.sourceCloseFailed === false);
  }
  if (typeof result.code !== 'string' || !result.code) return false;
  if (result.code === 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED' && result.routeCreated !== true) return false;
  if (result.routeCreated === true) {
    const sourceClosePartial = result.code === 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED';
    if (!['LOCUS_LOCATE_ACTIVATE_FAILED', 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED'].includes(result.code)
      || !Number.isInteger(result.routeTabId)
      || !Number.isInteger(result.routeWindowId)
      || result.routeWindowId !== intent?.sourceWindowId
      || typeof result.routeUrl !== 'string'
      || result.routeUrl !== expectedRouteUrl) return false;
    if (sourceClosePartial) {
      if (intent?.closeSource !== true
        || result.sourceClosed !== false
        || result.sourceCloseFailed !== true
        || typeof result.noticeShown !== 'boolean'
        || !isValidPopupLocateDestination(result.destination, intent)) return false;
    } else if (intent?.closeSource === true) {
      if (result.sourceClosed !== false || result.sourceCloseFailed !== true) return false;
    } else if (result.sourceClosed !== null || result.sourceCloseFailed !== false) return false;
  } else if (result.routeTabId != null || result.routeWindowId != null || result.routeUrl != null) return false;
  if (result.code !== 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED'
    && (result.destination != null || result.noticeShown != null)) return false;
  if (result.routeCreated != null && typeof result.routeCreated !== 'boolean') return false;
  if (result.sourceClosed != null && typeof result.sourceClosed !== 'boolean') return false;
  if (result.sourceCloseFailed != null && typeof result.sourceCloseFailed !== 'boolean') return false;
  if (result.sourceCloseFailed === true && result.sourceClosed !== false) return false;
  if (result.sourceClosed === true && result.sourceCloseFailed !== false) return false;
  if (intent?.closeSource === true && (result.sourceClosed != null || result.sourceCloseFailed != null)) {
    if (typeof result.sourceClosed !== 'boolean'
      || typeof result.sourceCloseFailed !== 'boolean'
      || result.sourceClosed === true
      || result.sourceCloseFailed !== true) return false;
  }
  if (intent?.closeSource !== true
    && (result.sourceClosed != null || (result.sourceCloseFailed != null && result.sourceCloseFailed !== false))) return false;
  return true;
}

async function doSave(ws, cat, group, tab, { locate = false, quick = false } = {}) {
  if (!isPopupCapturableUrl(tab?.url)) {
    toast(tr('cannotSave'), { tone: 'warning' });
    return false;
  }
  if (!beginPopupCapture()) return false;
  try {
    let snapshot;
    let response;
    let item;
    let acceptedItemIntent;
    let locateIntent;
    let quickCaptureIntent;
    try {
      snapshot = clonePopupState();
      const reviewedTarget = popupCaptureTargetDescriptor({
        ws,
        cat,
        group,
        proposedInbox: group?.proposedInbox === true,
      });
      const allocateId = createPopupCaptureIdAllocator(state);
      const target = materializePopupCaptureTarget(state, reviewedTarget, allocateId);
      ws = target.ws;
      cat = target.cat;
      group = target.group;
      if (group.items == null) group.items = [];
      if (!Array.isArray(group.items)) {
        throw popupCaptureError(
          'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
          'The reviewed popup capture Group has an invalid item list.',
        );
      }
      if (!filterPopupCaptureTabs([tab], group.items).length) {
        state = snapshot;
        toast(tr('alreadySaved'), { tone: 'info' });
        return false;
      }
      const meta = captureFields(tab);
      item = {
        id: allocateId(),
        type: 'tab',
        title: meta.title,
        url: tab.url,
        fav: meta.fav,
        createdAt: Date.now(),
      };
      group.items.push(item);
      if (state.settings?.captureRememberLast !== false) state.settings.captureLastTarget = { workspaceId: ws.id, categoryId: cat.id, groupId: group.id };
      acceptedItemIntent = {
        workspaceId: ws.id,
        itemId: item.id,
        sourceTabId: tab.id,
        sourceWindowId: tab.windowId,
        sourceWasActive: tab.id === activeTabId,
        expectedUrl: tab.url,
        closeSource: state.settings?.closeTabOnSave !== false,
      };
      locateIntent = locate ? { ...acceptedItemIntent } : null;
      quickCaptureIntent = quick ? { ...acceptedItemIntent } : null;
      response = await persistPopupState({
        quickCaptureItem: quickCaptureIntent,
      });
    } catch (error) {
      await recoverCaptureWriteFailure(error, snapshot);
      return false;
    }
    if (locate) {
      let locateResult;
      try {
        // State acceptance is known before this browser-effect request exists.
        // If the popup disappears sooner, the source remains untouched.
        locateResult = await sendPopupRuntimeMessageWithDeadline({
          type: 'locus-complete-popup-locate',
          ...locateIntent,
        }, 'LOCUS_LOCATE_EFFECT_UNKNOWN');
        if (!isValidPopupLocateEffectResult(locateResult, locateIntent)) {
          throw new Error('Locus returned an invalid Locate effect receipt.');
        }
      } catch (error) {
        // The item is already saved. Transport loss cannot authorize rollback
        // or a claim about whether the worker opened/closed browser tabs.
        console.error('Could not confirm the popup Locate browser effects', error);
        locateResult = unknownPopupLocateEffectResult(locateIntent);
      }
      if (locateResult.ok !== true) {
        showLocateFailure(cat, group, locateResult);
      } else {
        window.close();
      }
      return true;
    }
    if (quick) {
      const quickResult = isValidQuickCaptureResult(response?.quickCaptureResult, quickCaptureIntent)
        ? response.quickCaptureResult
        : {
            ok: false,
            code: 'LOCUS_QUICK_CAPTURE_RECEIPT_UNKNOWN',
            destinationReady: false,
          };
      // A confirmed destination gets the receipt toast (Undo, Move, Locate); an
      // unconfirmed one keeps the durable card. Neither closes the source here.
      if (quickResult.destinationReady === true) {
        showQuickSaveReceipt({
          cat,
          group,
          item,
          intent: quickCaptureIntent,
          result: quickResult,
        });
      } else {
        showQuickCaptureResult({
          cat,
          group,
          item,
          intent: quickCaptureIntent,
          result: quickResult,
        });
      }
      return true;
    }
    const closeRequested = acceptedItemIntent.closeSource === true;
    const closeResult = await closeOrdinaryPopupSavedTab(acceptedItemIntent, closeRequested);
    if (closeRequested && closeResult.closed !== true) {
      showOrdinaryCaptureResult({
        cat,
        group,
        item,
        intent: { ...acceptedItemIntent, closeSource: false },
        closeResult,
      });
      return true;
    }
    // The popup stays open: the receipt offers Locate while the next tab waits.
    toast(tr('savedTo', popupGroupDisplayName(group)), {
      tone: 'success',
      actionLabel: tr('locate'),
      action: () => locateFromSaveReceipt({ cat, group, item, intent: acceptedItemIntent }),
    });
    return true;
  } finally {
    finishPopupCapture();
  }
}

// Sits inside the single-save source slices that the contract suites run.
function popupGroupDisplayName(group) {
  return group?.name === 'Inbox' ? tr('inboxName') : String(group?.name || '');
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
  const buttons = [...$('hib-scope').querySelectorAll('button')];
  buttons.forEach(button => {
    const active = button.dataset.val === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  $('hib-scope').style.setProperty('--seg-index', String(Math.max(0, buttons.findIndex(button => button.dataset.val === value))));
  if (persist) persistHibernatePrefs();
  if (refresh) updateHibernateCount();
}

async function getHibernateCandidates() {
  const scope = $('hib-scope').querySelector('.active')?.dataset.val || 'window';
  const focused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const keepAwakeId = focused[0]?.id ?? activeTabId;
  let tabs = await chrome.tabs.query(scope === 'all' ? {} : { currentWindow: true });
  tabs = tabs.filter(tab => isPopupCapturableUrl(tab.url) && tab.id !== keepAwakeId);
  if (scope === 'selected') tabs = tabs.filter(tab => selectedTabIds.has(tab.id));
  if ($('hib-keep-pinned').checked) tabs = tabs.filter(tab => !tab.pinned);
  if ($('hib-keep-audio').checked) tabs = tabs.filter(tab => !tab.audible);
  return tabs;
}

async function updateHibernateCount() {
  const count = (await getHibernateCandidates()).length;
  const label = $('hib-title-count');
  if (label.textContent !== String(count)) restartAnimation(label, 'is-ticking');
  $('hib-count').textContent = count;
  label.textContent = count;
  $('hib-go').disabled = count === 0;
  $('hib-go-label').classList.toggle('hidden', count === 0);
  $('hib-go-none').classList.toggle('hidden', count !== 0);
}

function updateHibernateDestination() {
  const target = resolvePopupSelectedTarget(hibernateTargetGroupId);
  $('hib-destination-card').classList.toggle('hidden', !$('hib-save-before').checked);
  if (target) paintDestinationLabel($('hib-destination-name'), target);
  else $('hib-destination-name').textContent = tr('openFirst');
  $('hib-change').setAttribute('aria-label', target ? tr('destinationChip', popupTargetPath(target), 0) : tr('openFirst'));
}

function popupHibernateSourceDescriptor(tab) {
  if (!Number.isInteger(tab?.id) || tab.id < 0
      || !Number.isInteger(tab?.windowId) || tab.windowId < 0
      || typeof tab.active !== 'boolean'
      || !isPopupCapturableUrl(tab.url)) return null;
  return Object.freeze({
    tabId: tab.id,
    windowId: tab.windowId,
    sourceWasActive: tab.active,
    expectedUrl: tab.url,
    title: typeof tab.title === 'string' ? tab.title : '',
    fav: localFaviconUrl(tab.url, 64),
  });
}

function popupHibernateSourceStillMatches(tab, descriptor) {
  if (!tab || !descriptor
      || tab.id !== descriptor.tabId
      || tab.windowId !== descriptor.windowId
      || tab.active !== descriptor.sourceWasActive
      || tab.url !== descriptor.expectedUrl) return false;
  if (tab.pendingUrl == null) return true;
  return typeof tab.pendingUrl === 'string'
    && (!tab.pendingUrl || tab.pendingUrl === descriptor.expectedUrl);
}

async function confirmPopupHibernateSource(descriptor) {
  if (!descriptor) return null;
  try {
    const current = await chrome.tabs.get(descriptor.tabId);
    return popupHibernateSourceStillMatches(current, descriptor) ? current : null;
  } catch {
    return null;
  }
}

async function hibernateSingle(tab) {
  if (!beginPopupCapture()) return false;
  try {
    const descriptor = popupHibernateSourceDescriptor(tab);
    if (!descriptor) throw new Error('Could not confirm the tab selected for Hibernate.');
    await popupStateWriteQueue;
    if (!await confirmPopupHibernateSource(descriptor)) {
      throw new Error('The tab selected for Hibernate changed before replacement.');
    }
    await chrome.tabs.update(descriptor.tabId, {
      url: buildSuspendedUrl({
        url: descriptor.expectedUrl,
        title: descriptor.title,
        fav: descriptor.fav,
      }),
    });
    toast(tr('tabHibernated'), { tone: 'info', glyph: 'moon' });
    await refreshPopupWindow();
    return true;
  } catch {
    toast(tr('couldNotHibernate'), { tone: 'error' });
    return false;
  } finally {
    finishPopupCapture();
  }
}

async function hibernateSelectedScope() {
  if (!beginPopupCapture()) return false;
  try {
    await popupStateWriteQueue;
    const targets = await getHibernateCandidates();
    if (!targets.length) return false;
    const sourceDescriptors = targets.map(popupHibernateSourceDescriptor);
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
    for (const descriptor of sourceDescriptors) {
      if (!await confirmPopupHibernateSource(descriptor)) continue;
      try {
        await chrome.tabs.update(descriptor.tabId, {
          url: buildSuspendedUrl({
            url: descriptor.expectedUrl,
            title: descriptor.title,
            fav: descriptor.fav,
          }),
        });
        count++;
      } catch {}
    }
    resetToMain($('hib-open'));
    toast(saved == null ? tr('hibernated', count) : tr('hibernatedAndSaved', count, saved), { tone: 'info', glyph: 'moon' });
    await refreshPopupWindow();
    return true;
  } finally {
    finishPopupCapture();
  }
}

async function saveTabsBeforeHibernate(tabs) {
  let snapshot;
  try {
    snapshot = clonePopupState();
    const preview = resolvePopupSelectedTarget(hibernateTargetGroupId);
    if (!preview?.group) {
      throw popupCaptureError(
        'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
        'Locus could not confirm the hibernate capture destination.',
      );
    }
    const descriptor = popupCaptureTargetDescriptor(preview);
    const allocateId = createPopupCaptureIdAllocator(state);
    const target = materializePopupCaptureTarget(state, descriptor, allocateId);
    if (target.group.items == null) target.group.items = [];
    if (!Array.isArray(target.group.items)) {
      throw popupCaptureError(
        'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
        'The hibernate capture Group has an invalid item list.',
      );
    }
    const createdAt = Date.now();
    const items = filterPopupCaptureTabs(
      tabs.filter(tab => isPopupCapturableUrl(tab?.url)),
      target.group.items,
    ).map(tab => {
      const meta = captureFields(tab);
      return {
        id: allocateId(),
        type: 'tab',
        title: meta.title,
        url: tab.url,
        fav: meta.fav,
        createdAt,
      };
    });
    if (!items.length) {
      state = snapshot;
      return 0;
    }
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

function renderSwTags(suggestions, freshTag = null) {
  const host = $('sw-tags');
  host.innerHTML = '';
  const shown = [...new Set([...suggestions, ...swSelectedTags])];
  shown.forEach(tag => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `sw-tag${swSelectedTags.has(tag) ? ' on' : ''}${tag === freshTag ? ' is-new' : ''}`;
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
  const modes = [...$('sw-modes').querySelectorAll('.sw-mode')];
  modes.forEach(button => {
    const active = button.dataset.val === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  $('sw-modes').style.setProperty('--mode-index', String(Math.max(0, modes.findIndex(button => button.dataset.val === value))));
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
  closeFloatingLayer();
  if (!state?.workspaces?.length) return toast(tr('openFirst'), { tone: 'warning' });
  const target = resolvePopupSelectedTarget(windowSaveTargetGroupId);
  if (!target?.cat) return toast(tr('openFirst'), { tone: 'warning' });
  $('sw-count').textContent = all.length;
  $('sw-go-count').textContent = all.length;
  updateWindowDestination(target);
  setSaveMode(['links', 'group', 'queue'].includes(state.settings?.popupSaveMode) ? state.settings.popupSaveMode : 'group', false);
  $('sw-close').checked = state.settings?.closeTabOnSave !== false;
  $('sw-note-toggle').checked = false;
  $('sw-note').value = '';
  $('sw-note').classList.add('hidden');
  swSelectedTags = new Set();
  renderSwTags(collectTopTags());
  showSection('save-window-section', opener);
}

async function saveWindow({ mode, closeTabs, note, tags, quick = false } = {}) {
  if (!state?.workspaces?.length) return toast(tr('openFirst'), { tone: 'warning' });
  let target = resolvePopupSelectedTarget(windowSaveTargetGroupId);
  if (!target?.cat) return toast(tr('openFirst'), { tone: 'warning' });
  if (!beginPopupCapture()) return false;
  try {
    mode = ['links', 'group', 'queue'].includes(mode) ? mode
      : (['links', 'group', 'queue'].includes(state.settings?.popupSaveMode) ? state.settings.popupSaveMode : 'group');
    const close = closeTabs != null ? closeTabs : state.settings?.closeTabOnSave !== false;
    let snapshot;
    let items = [];
    let receiving;
    let windowSaveEffect;
    try {
      snapshot = clonePopupState();
      const descriptor = popupCaptureTargetDescriptor(target);
      const allocateId = createPopupCaptureIdAllocator(state);
      const capturableTabs = all.filter(tab => isPopupCapturableUrl(tab?.url));
      const stampTab = tab => {
        const meta = captureFields(tab);
        const item = {
          id: allocateId(),
          type: 'tab',
          title: meta.title,
          url: tab.url,
          fav: meta.fav,
          createdAt: Date.now(),
        };
        if (tags?.length) item.tags = [...tags];
        if (mode === 'queue') item.readLaterAt = Date.now();
        return item;
      };
      if (mode === 'group') {
        target = resolvePopupCaptureSpaceTarget(state, descriptor);
        if (target.cat.groups == null) target.cat.groups = [];
        if (!Array.isArray(target.cat.groups)) {
          throw popupCaptureError(
            'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
            'The window capture Space has an invalid Group list.',
          );
        }
        const now = new Date();
        receiving = {
          id: allocateId(), symbol: '◫', color: '#06b6d4', collapsed: false,
          name: `${tr('session')} ${now.toLocaleDateString(appLocale(), { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' })}`,
          items: []
        };
        target.cat.groups.push(receiving);
      } else {
        target = materializePopupCaptureTarget(state, descriptor, allocateId);
        receiving = target.group;
        if (receiving.items == null) receiving.items = [];
        if (!Array.isArray(receiving.items)) {
          throw popupCaptureError(
            'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
            'The window capture Group has an invalid item list.',
          );
        }
      }
      // A window save into an existing group honors the dedupe setting the same
      // way single-tab capture does; a fresh session group can't have duplicates.
      const dedupe = mode !== 'group' && state.settings?.captureDeduplicate !== false;
      items = filterPopupCaptureTabs(capturableTabs, receiving.items, dedupe).map(stampTab);
      if (!items.length && !note) {
        state = snapshot;
        toast(tr('alreadySaved'), { tone: 'info' });
        return false;
      }
      if (note) {
        receiving.items.push({
          id: allocateId(),
          type: 'note',
          html: esc(note),
          createdAt: Date.now(),
        });
      }
      receiving.items.push(...items);
      if (mode !== 'group' && state.settings?.captureRememberLast !== false) {
        state.settings.captureLastTarget = { workspaceId: target.ws.id, categoryId: target.cat.id, groupId: receiving.id };
      }
      const sourceTabs = [];
      const seenTabIds = new Set();
      for (const tab of capturableTabs) {
        if (!Number.isInteger(tab.id)
          || tab.id === activeTabId
          || typeof tab.url !== 'string'
          || seenTabIds.has(tab.id)) continue;
        seenTabIds.add(tab.id);
        sourceTabs.push({ tabId: tab.id, expectedUrl: tab.url });
      }
      windowSaveEffect = {
        workspaceId: target.ws.id,
        groupId: receiving.id,
        sourceWindowId: activeWindowId,
        keepTabId: activeTabId,
        sourceTabs,
        closeSources: close,
      };
      await persistPopupState();
    } catch (error) {
      await recoverCaptureWriteFailure(error, snapshot);
      return false;
    }
    let windowSaveResult;
    try {
      // This second phase starts only after a known state receipt. If Chrome
      // tears down the popup before dispatch, source tabs stay open by design.
      // Once accepted, the worker owns the close attempt through popup teardown.
      windowSaveResult = await sendPopupRuntimeMessageWithDeadline({
        type: 'locus-complete-window-save',
        ...windowSaveEffect,
      }, 'LOCUS_WINDOW_SAVE_EFFECT_UNKNOWN');
      if (!isValidWindowSaveResult(windowSaveResult, windowSaveEffect)) {
        throw new Error('Locus returned an invalid window-save effect receipt.');
      }
    } catch (error) {
      // State acceptance is already known. An unavailable effect receipt must
      // never roll back that save or manufacture a source-tab outcome.
      console.error('Could not confirm the saved window browser effects', error);
      windowSaveResult = {
        ok: false,
        code: 'LOCUS_WINDOW_SAVE_EFFECT_UNKNOWN',
        effectUnknown: true,
        destinationReady: false,
        closeRequested: close,
        requestedCount: windowSaveEffect.sourceTabs.length,
        closedCount: 0,
        unconfirmedCount: close ? windowSaveEffect.sourceTabs.length : 0,
      };
    }
    const saved = {
      target,
      receiving,
      itemCount: items.length,
      hasNote: !!note,
      result: windowSaveResult,
    };
    // One click confirms a clean window save with the receipt toast. A partial or
    // unknown outcome, or a save made from the sheet, keeps the result card.
    if (quick && windowSaveResult.ok === true) showWindowSaveReceipt(saved);
    else showWindowSaveResult(saved);
    return true;
  } finally {
    finishPopupCapture();
  }
}

function buildPopupBookmarkImport(tree, allocateId) {
  let imported = 0;
  const groups = [];
  const createdAt = Date.now();
  const walk = (nodes, folderName, depth) => {
    if (depth >= 50) return;
    const items = [];
    for (const node of (nodes || [])) {
      if (isPopupCapturableUrl(node.url)) {
        items.push({
          id: allocateId(),
          type: 'tab',
          title: node.title || node.url,
          url: node.url,
          fav: '',
          createdAt,
        });
        imported++;
      } else if (node.children) {
        walk(node.children, node.title || folderName, depth + 1);
      }
    }
    if (items.length) {
      groups.push({
        id: allocateId(),
        name: folderName || 'Bookmarks',
        symbol: '🔖',
        color: '#eab308',
        collapsed: false,
        items,
      });
    }
  };
  for (const root of (tree || [])) {
    walk(root.children || [], root.title || 'Bookmarks', 0);
  }
  return { groups, imported };
}

async function importBookmarksFromPopup() {
  const button = $('more-import-bookmarks');
  if (!chrome.bookmarks?.getTree) return toast(tr('bookmarksUnavailable'), { tone: 'warning' });
  const preview = findCaptureTarget();
  if (!preview?.cat) return toast(tr('openFirst'), { tone: 'warning' });
  if (!beginPopupCapture()) return false;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  let snapshot;
  try {
    const tree = await chrome.bookmarks.getTree();
    snapshot = clonePopupState();
    const descriptor = popupCaptureTargetDescriptor(preview);
    const allocateId = createPopupCaptureIdAllocator(state);
    const target = resolvePopupCaptureSpaceTarget(state, descriptor);
    const { groups, imported } = buildPopupBookmarkImport(tree, allocateId);
    if (!imported) {
      toast(tr('noBookmarks'), { tone: 'info' });
      return false;
    }
    if (target.cat.groups == null) target.cat.groups = [];
    if (!Array.isArray(target.cat.groups)) {
      throw popupCaptureError(
        'LOCUS_POPUP_CAPTURE_TARGET_UNAVAILABLE',
        'The bookmark capture Space has an invalid Group list.',
      );
    }
    target.cat.groups.push(...groups);
    await persistPopupState();
    toast(tr('importedBookmarks', imported));
    return true;
  } catch (error) {
    console.error('Bookmark import failed', error);
    await recoverCaptureWriteFailure(error, snapshot);
    return false;
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    finishPopupCapture();
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

// Restarts a one-shot animation the way the Today code does: drop the class,
// force a reflow, add it back.
function restartAnimation(el, className) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function popupGroupColor(group) {
  const color = typeof group?.color === 'string' ? group.color.trim() : '';
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : 'var(--pp-muted)';
}

function paintHeroSaved(saved) {
  const button = $('hero-save');
  const key = saved ? 'savedTitle' : 'saveCurrentTab';
  button.classList.toggle('done', saved);
  button.dataset.popAria = key;
  button.setAttribute('aria-label', tr(key));
}

// A confirmed save turns the Save button into a check, marks the row, and bumps
// the waiting count when the tab went into the Inbox the chip shows.
function markTabSaved(tab) {
  if (!tab) return;
  if (typeof tab.url === 'string') savedTabUrls.add(tab.url);
  const bubble = $('destination-count');
  const before = bubble.classList.contains('hidden') ? 0 : Number(bubble.textContent) || 0;
  if (updateDestination() > before) restartAnimation(bubble, 'is-bumping');
  if (tab.id === activeTabId) {
    heroSavedTabId = tab.id;
    paintHeroSaved(true);
    restartAnimation($('hero-save'), 'is-celebrating');
    return;
  }
  const row = $('ptabs').querySelector(`.pti[data-tab-id="${tab.id}"]`);
  if (!row || row.classList.contains('is-saved')) return;
  row.classList.add('is-saved');
  const mark = document.createElement('span');
  mark.className = 'pti-mark is-new';
  mark.title = tr('savedTitle');
  mark.innerHTML = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg><span class="sr-only">${esc(tr('savedTitle'))}</span>`;
  row.insertBefore(mark, row.querySelector('.pti-acts'));
}

function saveActiveTab() {
  closeFloatingLayer();
  const tab = all.find(candidate => candidate.id === activeTabId);
  if (!tab) return toast(tr('cannotSave'), { tone: 'warning' });
  startCapture(tab);
}

// Locate on a save receipt opens the saved item through the worker. When that
// cannot finish, the same result sheet as a quick save keeps the retry. A save
// made from the sheet has already handled its source tab, so its Locate never
// asks for a close; a one-click save still has its source open and passes the
// close-after-save choice on, as the card it replaced did.
function prepareSavedItemRecovery({ item, intent }, closeSource = false) {
  locateRecoveryRoute = null;
  windowSaveRecoveryIntent = null;
  windowSaveResultMessage = '';
  quickCaptureRecoveryIntent = { ...intent, closeSource: closeSource === true };
  quickCaptureResultMessage = '';
  setQuickCaptureDoneAction(closeSource === true);
  $('save-title').textContent = tr('savedTitle');
  $('save-context').textContent = '';
  $('save-tab-title').textContent = item.title || item.url || tr('unnamedTab');
  ['stg-destination-label', 'stg-list', 'stg-locate-option', 'stg-back'].forEach(id => $(id).classList.add('hidden'));
  $('stg-locate-result-message').textContent = '';
  $('stg-open-locus').textContent = tr('openSavedItem');
  $('stg-locate-result').classList.remove('hidden');
}

async function locateFromSaveReceipt(saved, { closeSource = false } = {}) {
  if (popupCapturePending) {
    toast(tr('captureBusy'), { tone: 'warning' });
    return 'keep';
  }
  prepareSavedItemRecovery(saved, closeSource);
  if (await runQuickCaptureAction('open')) return undefined;
  locateResultVisible = true;
  showSection('save-to-section');
  return undefined;
}

// One-click Save confirms with the shared receipt: where the tab went, then
// Undo, Move and Locate. The receipt owns no timer or tab effect of its own;
// its drain belongs to the toast and every action is its own receipt-gated
// request. Move updates this receipt in place, so Undo and Locate follow it.
function showQuickSaveReceipt({ cat, group, item, intent, result }) {
  const receipt = {
    cat,
    group,
    item,
    intent: { ...intent },
    groupName: String(result?.destination?.groupName ?? group?.name ?? ''),
    entry: null,
  };
  receipt.entry = toast(tr('savedTo', popupGroupDisplayName({ name: receipt.groupName })), {
    tone: 'success',
    undo: () => undoQuickSave(receipt),
    move: () => openQuickSaveMove(receipt),
    actionLabel: tr('locate'),
    action: () => locateFromSaveReceipt(receipt, { closeSource: receipt.intent.closeSource === true }),
  });
  return receipt;
}

// The exact saved item: one item with this id in the whole graph, still a tab at
// the saved URL, inside the Workspace the receipt names. Anything else means it
// changed in Locus, and Undo or Move leaves it alone.
function findPopupSavedItem(candidateState, intent) {
  if (typeof intent?.itemId !== 'string' || !intent.itemId) return null;
  const matches = [];
  for (const entry of popupCaptureHierarchy(candidateState).groups) {
    if (!Array.isArray(entry.group.items)) continue;
    entry.group.items.forEach((item, index) => {
      if (item?.id === intent?.itemId) matches.push({ ...entry, item, index });
    });
  }
  if (matches.length !== 1) return null;
  const [match] = matches;
  return match.ws?.id === intent.workspaceId
    && match.item.type === 'tab'
    && match.item.url === intent.expectedUrl
    ? match
    : null;
}

// After Undo or Move the saved marks, the Save check and the Inbox count follow
// the graph again.
function repaintSavedMarks() {
  savedTabUrls = popupCaptureDestinationTabUrls(popupCaptureHierarchy(state).groups
    .flatMap(entry => Array.isArray(entry.group.items) ? entry.group.items : []));
  paintHeroSaved(heroSavedTabId != null && heroSavedTabId === activeTabId);
  renderTabs();
  updateDestination();
}

// Undo takes back exactly the item this receipt saved, through the same
// receipt-gated write as the save. Everything else in the graph stays.
async function undoQuickSave(receipt) {
  if (!beginPopupCapture()) return 'keep';
  let snapshot;
  try {
    snapshot = clonePopupState();
    const found = findPopupSavedItem(state, receipt.intent);
    if (!found) return { message: tr('savedItemChanged'), tone: 'warning' };
    found.group.items.splice(found.index, 1);
    await persistPopupState();
  } catch (error) {
    await recoverCaptureWriteFailure(error, snapshot, { change: true });
    return undefined;
  } finally {
    finishPopupCapture();
  }
  if (receipt.intent.sourceTabId === heroSavedTabId) heroSavedTabId = null;
  repaintSavedMarks();
  const heroTab = receipt.intent.sourceTabId === activeTabId;
  return { message: tr('undone'), tone: 'info', glyph: 'undo', focus: heroTab ? $('hero-save') : null };
}

let quickSaveMoveReceipt = null;

function openQuickSaveMove(receipt) {
  quickSaveMoveReceipt = receipt;
  openDestinationList('move');
  return 'keep';
}

// Move puts the saved item into another Group with the same receipt-gated write
// and keeps the receipt, now naming the new Group, with its actions and drain.
async function moveQuickSave(receipt, groupId) {
  if (!beginPopupCapture()) return 'keep';
  let snapshot;
  let destination;
  try {
    snapshot = clonePopupState();
    const found = findPopupSavedItem(state, receipt.intent);
    destination = resolveGroupById(groupId);
    if (!found || !destination
      || (destination.group.items != null && !Array.isArray(destination.group.items))) {
      return { message: tr('savedItemChanged'), tone: 'warning' };
    }
    if (destination.group === found.group) return 'keep';
    found.group.items.splice(found.index, 1);
    if (destination.group.items == null) destination.group.items = [];
    destination.group.items.push(found.item);
    await persistPopupState();
  } catch (error) {
    await recoverCaptureWriteFailure(error, snapshot, { change: true });
    return undefined;
  } finally {
    finishPopupCapture();
  }
  receipt.intent = { ...receipt.intent, workspaceId: destination.ws.id };
  receipt.cat = destination.cat;
  receipt.group = destination.group;
  receipt.groupName = String(destination.group.name ?? '');
  repaintSavedMarks();
  return { message: tr('savedTo', popupGroupDisplayName(destination.group)), tone: 'success', keepActions: true };
}

// One-click Save window confirms a clean save the same way; Open goes to the
// destination, and when it cannot, the result card keeps the exact retry.
function showWindowSaveReceipt(saved) {
  const receipt = { ...saved };
  const entry = toast(tr('savedTabs', saved.itemCount), {
    tone: 'success',
    actionLabel: tr('openDestination'),
    action: () => openWindowSaveFromReceipt(receipt),
  });
  refreshPopupWindow();
  return entry;
}

async function openWindowSaveFromReceipt(receipt) {
  if (popupCapturePending) {
    toast(tr('captureBusy'), { tone: 'warning' });
    return 'keep';
  }
  prepareWindowSaveResult(receipt);
  if (await openWindowSaveDestination()) return undefined;
  locateResultVisible = true;
  showSection('save-to-section');
  return undefined;
}

function updateWindowDestination(target = resolvePopupSelectedTarget(windowSaveTargetGroupId)) {
  if (target) paintDestinationLabel($('sw-destination-name'), target);
  else $('sw-destination-name').textContent = tr('openFirst');
  $('sw-change').setAttribute('aria-label', target ? tr('destinationChip', popupTargetPath(target), 0) : tr('openFirst'));
}

const DESTINATION_TRIGGERS = { destination: 'destination-chip', window: 'sw-change', hibernate: 'hib-change', move: 'pop-toast-move' };

function popupDestinationOptions(mode) {
  // Move lists every Group and marks the one that holds the saved item now.
  if (mode === 'move') {
    const holder = quickSaveMoveReceipt ? findPopupSavedItem(state, quickSaveMoveReceipt.intent)?.group : null;
    return popupCaptureHierarchy(state).groups.map(({ ws, cat, group }) => ({ ws, cat, group, proposed: false, selected: group === holder }));
  }
  const current = mode === 'window'
    ? resolvePopupSelectedTarget(windowSaveTargetGroupId)
    : mode === 'hibernate'
      ? resolvePopupSelectedTarget(hibernateTargetGroupId)
      : findCaptureTarget();
  const options = [];
  // A Space without an Inbox still offers one; it is created on the first save.
  if (current?.proposedInbox) options.push({ ws: current.ws, cat: current.cat, group: current.group, proposed: true, selected: true });
  popupCaptureHierarchy(state).groups.forEach(({ ws, cat, group }) => {
    options.push({ ws, cat, group, proposed: false, selected: current?.group === group });
  });
  return options;
}

function positionFloatingLayer(layer, trigger) {
  const host = $('popup').getBoundingClientRect();
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(host.width - 16, Math.max(rect.width, 248));
  layer.style.width = `${width}px`;
  layer.style.left = `${Math.min(Math.max(8, rect.left - host.left), host.width - width - 8)}px`;
  const below = host.bottom - rect.bottom - 12;
  const above = rect.top - host.top - 12;
  if (below >= Math.min(220, above)) {
    layer.dataset.side = 'below';
    layer.style.top = `${rect.bottom - host.top + 6}px`;
    layer.style.bottom = '';
    layer.style.maxHeight = `${Math.max(132, below)}px`;
  } else {
    layer.dataset.side = 'above';
    layer.style.top = '';
    layer.style.bottom = `${host.bottom - rect.top + 6}px`;
    layer.style.maxHeight = `${above}px`;
  }
}

function openDestinationList(mode) {
  if (openLayer?.kind === 'list' && openLayer.mode === mode) {
    closeFloatingLayer({ restoreFocus: true });
    return;
  }
  closeFloatingLayer();
  const trigger = $(DESTINATION_TRIGGERS[mode]);
  const list = $('dest-list');
  list.replaceChildren();
  const options = popupDestinationOptions(mode);
  if (!options.length) {
    const empty = document.createElement('div');
    empty.className = 'dlist-empty';
    empty.textContent = tr(state?.workspaces?.length ? 'noGroups' : 'noWorkspaces');
    list.appendChild(empty);
  }
  options.forEach(option => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mi dest-option';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(option.selected));
    button.tabIndex = -1;
    button.innerHTML = `<span class="dest-dot" aria-hidden="true"></span><span class="dest-path"><span class="dest-space">${esc(option.cat.name)} ›</span> <b>${esc(popupGroupDisplayName(option.group))}</b></span>${option.selected ? '<svg class="dest-check" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>' : ''}`;
    button.querySelector('.dest-dot').style.background = popupGroupColor(option.group);
    button.onclick = () => chooseDestination(mode, option);
    list.appendChild(button);
  });
  // Moving from the receipt opens the list above the whole card, and the card
  // holds its drain while the list is open.
  list.setAttribute('aria-label', tr(mode === 'move' ? 'moveTo' : 'saveTo'));
  positionFloatingLayer(list, mode === 'move' ? $('pop-toast') : trigger);
  if (mode === 'move') pinPopupToast(true);
  list.classList.remove('hidden');
  restartAnimation(list, 'is-opening');
  trigger.setAttribute('aria-expanded', 'true');
  openLayer = { kind: 'list', mode, element: list, trigger };
  (list.querySelector('[aria-selected="true"]') || list.querySelector('.dest-option'))?.focus();
}

function chooseDestination(mode, option) {
  if (mode === 'move') {
    // The move runs on its own receipt, which shows the spinner and then the
    // new Group. A receipt that has already gone moves nothing.
    const receipt = quickSaveMoveReceipt;
    closeFloatingLayer({ restoreFocus: true });
    if (receipt && popupToastEntries.includes(receipt.entry)) {
      runPopupToastAction(receipt.entry, () => moveQuickSave(receipt, option.group.id));
    }
    return;
  }
  const groupId = option.proposed ? null : option.group.id;
  if (!option.proposed) {
    const selected = resolveGroupById(groupId);
    if (!selected || selected.ws !== option.ws || selected.cat !== option.cat || selected.group !== option.group) {
      closeFloatingLayer({ restoreFocus: true });
      toast(tr('openFirst'), { tone: 'warning' });
      return;
    }
  }
  let label;
  if (mode === 'window') {
    windowSaveTargetGroupId = groupId;
    updateWindowDestination();
    label = $('sw-destination-name');
  } else if (mode === 'hibernate') {
    hibernateTargetGroupId = groupId;
    updateHibernateDestination();
    label = $('hib-destination-name');
  } else {
    // The chip changes where this popup saves; with remember-last on, the choice
    // also becomes the next quick-save destination.
    destinationOverrideGroupId = groupId;
    if (!option.proposed && state.settings?.captureRememberLast !== false) {
      state.settings.captureLastTarget = {
        workspaceId: option.ws.id,
        categoryId: option.cat.id,
        groupId,
      };
      persistPopupState().catch(() => {});
    }
    updateDestination();
    label = $('destination-name');
  }
  closeFloatingLayer({ restoreFocus: true });
  restartAnimation(label, 'is-swapping');
}

function openMoreMenu() {
  if (openLayer?.kind === 'menu') {
    closeFloatingLayer({ restoreFocus: true });
    return;
  }
  closeFloatingLayer();
  const menu = $('more-menu');
  menu.classList.remove('hidden');
  restartAnimation(menu, 'is-opening');
  $('open-more').setAttribute('aria-expanded', 'true');
  openLayer = { kind: 'menu', element: menu, trigger: $('open-more') };
  floatingLayerItems()[0]?.focus();
}

function floatingLayerItems() {
  if (!openLayer) return [];
  const selector = openLayer.kind === 'menu' ? '[role="menuitem"]' : '[role="option"]';
  return [...openLayer.element.querySelectorAll(selector)].filter(item => !item.disabled);
}

function closeFloatingLayer({ restoreFocus = false } = {}) {
  if (!openLayer) return false;
  const { element, trigger, mode } = openLayer;
  const focusWasInside = element.contains(document.activeElement);
  openLayer = null;
  element.classList.add('hidden');
  trigger?.setAttribute('aria-expanded', 'false');
  if ((restoreFocus || focusWasInside) && trigger?.isConnected) trigger.focus();
  if (mode === 'move') {
    quickSaveMoveReceipt = null;
    pinPopupToast(false);
  }
  return true;
}

function handleFloatingLayerKey(event) {
  if (event.key === 'Tab') {
    event.preventDefault();
    closeFloatingLayer({ restoreFocus: true });
    return;
  }
  const items = floatingLayerItems();
  if (!items.length) return;
  const index = items.indexOf(document.activeElement);
  const next = event.key === 'ArrowDown' ? items[(index + 1) % items.length]
    : event.key === 'ArrowUp' ? items[(index - 1 + items.length) % items.length]
      : event.key === 'Home' ? items[0]
        : event.key === 'End' ? items[items.length - 1]
          : null;
  if (!next) return;
  event.preventDefault();
  next.focus();
}

// Receipts use the one notification style of the new tab: a dark card, an icon
// circle, the message, its actions, and a close button. A receipt with Undo or
// an action drains for 5.2 s and holds while hovered or focused; the previous
// receipt waits behind the newest one. A save receipt carries Undo, Move and
// Locate; with more than one action they sit on a row under the message.
const POPUP_TOAST_ACTION_MS = 5200;
const POPUP_TOAST_PASSIVE_MS = 2600;
const POPUP_TOAST_BUTTONS = [['pop-toast-undo', 'undo'], ['pop-toast-move', 'move'], ['pop-toast-action', 'action']];
let popupToastEntries = [];
let popupToastStartedAt = 0;
let popupToastHeld = false;
// The Move list pins the receipt: it keeps its time while a Group is picked.
let popupToastPinned = false;

function popupToastFront() {
  return popupToastEntries[popupToastEntries.length - 1] || null;
}

function paintPopupToastBehind() {
  const behind = $('pop-toast-behind');
  const entry = popupToastEntries[popupToastEntries.length - 2] || null;
  if (!entry) {
    behind.classList.add('hidden');
    return;
  }
  behind.dataset.tone = entry.tone;
  $('pop-toast-behind-msg').textContent = entry.message;
  behind.classList.remove('hidden');
}

function startPopupToastTimer(entry) {
  clearTimeout(toastTimer);
  toastTimer = null;
  const el = $('pop-toast');
  const drain = $('pop-toast-drain');
  const draining = !!entry && entry.drains && entry.remaining > 0;
  el.dataset.draining = String(draining);
  drain.classList.remove('is-running');
  if (draining) {
    drain.style.setProperty('--toast-ms', `${entry.total}ms`);
    drain.style.setProperty('--toast-elapsed', `-${Math.max(0, entry.total - entry.remaining)}ms`);
    void drain.offsetWidth;
    drain.classList.add('is-running');
  }
  if (!entry || !(entry.remaining > 0) || popupToastHeld) return;
  popupToastStartedAt = Date.now();
  toastTimer = setTimeout(() => dismissPopupToast(), entry.remaining);
}

function pausePopupToastFront() {
  const front = popupToastFront();
  if (toastTimer && front && front.remaining > 0) {
    front.remaining = Math.max(0, front.remaining - (Date.now() - popupToastStartedAt));
  }
  clearTimeout(toastTimer);
  toastTimer = null;
}

function holdPopupToast() {
  if (popupToastHeld) return;
  pausePopupToastFront();
  popupToastHeld = true;
  $('pop-toast').classList.add('is-held');
}

function releasePopupToast() {
  if (!popupToastHeld || popupToastPinned) return;
  popupToastHeld = false;
  $('pop-toast').classList.remove('is-held');
  const front = popupToastFront();
  if (!front || !$('pop-toast').classList.contains('show')) return;
  if (front.remaining > 0) front.remaining = Math.max(front.remaining, 1200);
  startPopupToastTimer(front);
}

function pinPopupToast(pinned) {
  popupToastPinned = pinned;
  if (pinned) {
    holdPopupToast();
    return;
  }
  const el = $('pop-toast');
  if (!el.contains(document.activeElement) && !el.matches(':hover')) releasePopupToast();
}

function paintPopupToast(entry, animation = '') {
  const el = $('pop-toast');
  const assertive = entry.tone === 'error';
  el.classList.remove('interactive');
  el.dataset.tone = entry.tone;
  el.dataset.glyph = entry.glyph;
  el.dataset.busy = String(entry.busy);
  el.setAttribute('role', assertive ? 'alert' : 'status');
  el.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
  $('pop-toast-msg').textContent = entry.message;
  let actions = 0;
  for (const [id, key] of POPUP_TOAST_BUTTONS) {
    const button = $(id);
    if (typeof entry[key] === 'function') {
      button.textContent = key === 'action' ? entry.actionLabel : tr(key);
      button.classList.remove('hidden');
      button.disabled = entry.busy;
      button.onclick = () => runPopupToastAction(entry, entry[key]);
      actions += 1;
    } else {
      button.textContent = '';
      button.classList.add('hidden');
      button.onclick = null;
    }
  }
  el.dataset.stacked = String(actions > 1);
  el.classList.add('show');
  if (animation) {
    el.classList.remove('is-entering', 'is-promoted', 'is-morphing');
    void el.offsetWidth;
    el.classList.add(animation);
  }
  paintPopupToastBehind();
}

function dismissPopupToast({ restoreFocus = false } = {}) {
  const el = $('pop-toast');
  clearTimeout(toastTimer);
  toastTimer = null;
  const focusWasInside = el.contains(document.activeElement);
  popupToastEntries.pop();
  const next = popupToastFront();
  if (next) {
    if (next.remaining > 0) next.remaining = Math.max(next.remaining, 1500);
    paintPopupToast(next, 'is-promoted');
    startPopupToastTimer(next);
  } else {
    el.classList.remove('show', 'interactive', 'is-held');
    popupToastHeld = false;
    paintPopupToastBehind();
    startPopupToastTimer(null);
  }
  if (restoreFocus && focusWasInside) mainCaptureFocusTarget()?.focus();
  return true;
}

function removePopupToastEntry(entry) {
  const index = popupToastEntries.indexOf(entry);
  if (index < 0) return;
  if (index === popupToastEntries.length - 1) {
    dismissPopupToast({ restoreFocus: true });
    return;
  }
  popupToastEntries.splice(index, 1);
  paintPopupToastBehind();
}

// An action that returns a promise shows a spinner in the icon circle until it
// settles. Resolving to 'keep' leaves the receipt up; a { message } turns the
// receipt into its result in place (with keepActions it keeps its actions and
// starts its drain again, otherwise it becomes a short passive note); anything
// else closes it. The busy buttons are disabled, which drops their focus, so the
// focused button is remembered and focus comes back when the action settles.
function runPopupToastAction(entry, run = entry.action) {
  if (typeof run !== 'function' || entry.busy) return;
  const focused = $('pop-toast').contains(document.activeElement) ? document.activeElement : null;
  let result;
  try {
    result = run();
  } catch (error) {
    console.error('Popup receipt action failed', error);
    result = 'keep';
  }
  if (!result || typeof result.then !== 'function') {
    settlePopupToastAction(entry, result, focused);
    return;
  }
  entry.busy = true;
  if (popupToastFront() === entry) paintPopupToast(entry, 'is-morphing');
  Promise.resolve(result)
    .catch(error => {
      console.error('Popup receipt action failed', error);
      return 'keep';
    })
    .then(outcome => {
      entry.busy = false;
      settlePopupToastAction(entry, outcome, focused);
    });
}

function settlePopupToastAction(entry, outcome, focused = null) {
  if (!popupToastEntries.includes(entry)) return;
  const front = popupToastFront() === entry;
  const focusLost = () => !!focused && (!document.activeElement || document.activeElement === document.body);
  if (outcome === 'keep') {
    if (front) paintPopupToast(entry, 'is-morphing');
    if (focusLost() && isVisiblePopupControl(focused)) focused.focus();
    return;
  }
  if (!outcome || typeof outcome !== 'object' || !outcome.message) {
    removePopupToastEntry(entry);
    if (focusLost()) mainCaptureFocusTarget()?.focus();
    return;
  }
  entry.message = String(outcome.message);
  entry.tone = ['success', 'info', 'warning', 'error'].includes(outcome.tone) ? outcome.tone : 'success';
  entry.glyph = String(outcome.glyph || '');
  if (!outcome.keepActions) {
    entry.undo = null;
    entry.move = null;
    entry.action = null;
    entry.actionLabel = '';
    entry.drains = false;
    entry.total = POPUP_TOAST_PASSIVE_MS;
  }
  entry.remaining = entry.total;
  if (!front) {
    paintPopupToastBehind();
    return;
  }
  paintPopupToast(entry, 'is-morphing');
  startPopupToastTimer(entry);
  // The same button takes focus back; one that went away hands it to the page.
  if (!focusLost() && !(focused && !isVisiblePopupControl(focused))) return;
  if (isVisiblePopupControl(focused)) focused.focus();
  else (outcome.focus || mainCaptureFocusTarget())?.focus();
}

function dismissToastForEscape() {
  if (!$('pop-toast').classList.contains('show')) return false;
  return dismissPopupToast({ restoreFocus: true });
}

// Ctrl Z / Cmd Z takes back the newest save while its receipt still offers Undo.
function undoFromPopupKeyboard() {
  const front = popupToastFront();
  if (!$('pop-toast').classList.contains('show') || typeof front?.undo !== 'function' || front.busy) return false;
  runPopupToastAction(front, front.undo);
  return true;
}

function toast(message, { persistent = false, tone = '', glyph = '', actionLabel = '', action = null, undo = null, move = null } = {}) {
  const el = $('pop-toast');
  // Same notification style as the new tab. Each caller names its tone; a
  // persistent receipt without one reports a problem, a passing one confirms.
  const tones = ['success', 'info', 'warning', 'error'];
  const resolved = tones.includes(tone) ? tone : (persistent ? 'error' : 'success');
  const hasAction = !!actionLabel && typeof action === 'function';
  const hasUndo = typeof undo === 'function';
  const drains = !persistent && (hasAction || hasUndo);
  const total = persistent ? 0 : (drains ? POPUP_TOAST_ACTION_MS : POPUP_TOAST_PASSIVE_MS);
  const entry = {
    message: String(message ?? ''),
    tone: resolved,
    glyph: String(glyph || ''),
    actionLabel: hasAction ? String(actionLabel) : '',
    action: hasAction ? action : null,
    undo: hasUndo ? undo : null,
    move: typeof move === 'function' ? move : null,
    busy: false,
    drains,
    total,
    remaining: total,
  };
  if (!el.classList.contains('show')) popupToastEntries = [];
  else pausePopupToastFront();
  popupToastEntries.push(entry);
  while (popupToastEntries.length > 2) popupToastEntries.shift();
  popupToastHeld = popupToastPinned || el.contains(document.activeElement) || el.matches(':hover');
  el.classList.toggle('is-held', popupToastHeld);
  paintPopupToast(entry, 'is-entering');
  startPopupToastTimer(entry);
  return entry;
}

function bind() {
  // Keep a receipt-gated capture from being replaced by another popup action.
  // The action popup can still be dismissed by Chrome itself; Locate is carried
  // by a separate worker request after state acceptance is known.
  document.addEventListener('click', event => {
    if (!popupCapturePending) return;
    if (!event.target.closest('button, input, textarea, [role="button"]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  // One floating layer at a time: a press anywhere outside it closes it.
  document.addEventListener('pointerdown', event => {
    if (!openLayer) return;
    if (openLayer.element.contains(event.target) || openLayer.trigger?.contains(event.target)) return;
    closeFloatingLayer();
  }, true);
  $('open-full').onclick = () => { chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') }); window.close(); };
  $('open-more').onclick = openMoreMenu;
  $('more-menu-list').addEventListener('keydown', handleFloatingLayerKey);
  $('dest-list').addEventListener('keydown', handleFloatingLayerKey);
  $('more-save-current').onclick = saveActiveTab;
  $('more-import-bookmarks').onclick = () => {
    closeFloatingLayer({ restoreFocus: true });
    importBookmarksFromPopup();
  };
  $('more-shortcuts').onclick = () => { chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); window.close(); };
  $('hero-save').onclick = saveActiveTab;
  $('destination-chip').onclick = () => openDestinationList('destination');
  $('ps').oninput = renderTabs;
  $('search-clear').onclick = clearPopupSearch;
  $('clear-selection').onclick = clearTabSelection;
  $('more-tabs').onclick = () => { tabsExpanded = !tabsExpanded; renderTabs(); };
  // Save window follows Save: one click with the remembered choices and a
  // receipt, or the sheet with destination and options when the user opted in
  // to being asked.
  $('qs-all').onclick = event => {
    closeFloatingLayer();
    if (popupAsksWhereToSave()) openSaveWindow(event.currentTarget);
    else saveWindow({ quick: true });
  };
  $('sheet-scrim').onclick = () => {
    if (locateResultVisible || popupCapturePending || activeSection === 'main-section') return;
    returnToPreviousSection();
  };
  $('stg-back').onclick = () => {
    if (locateResultVisible) {
      window.close();
      return;
    }
    pendingTab = null;
    pickerMode = 'tab';
    returnToPreviousSection();
  };
  $('stg-open-locus').onclick = async () => {
    if (quickCaptureRecoveryIntent) {
      await runQuickCaptureAction('open');
      return;
    }
    if (windowSaveRecoveryIntent) {
      await openWindowSaveDestination();
      return;
    }
    try {
      await openPopupLocateRecovery(locateRecoveryRoute);
      window.close();
    } catch (error) {
      console.error('Could not open Locus after Locate failed', error);
      const destination = $('save-context').textContent || tr('destination');
      const acceptedResultMessage = quickCaptureResultMessage || windowSaveResultMessage;
      const failure = quickCaptureResultMessage
        ? `${quickCaptureResultMessage} ${tr('openLocusFailed')}`
        : acceptedResultMessage
        ? `${acceptedResultMessage} ${tr('openDestinationFailed')}`
        : tr(locateRecoveryRoute == null ? 'openLocusRetryFailed' : 'switchToSavedItemFailed', destination);
      announcePopupResult(failure);
    }
  };
  $('stg-done').onclick = async () => {
    if (quickCaptureRecoveryIntent && quickCaptureCloseRequested) {
      await runQuickCaptureAction('close');
      return;
    }
    window.close();
  };
  $('sw-back').onclick = returnToPreviousSection;
  $('sw-change').onclick = () => openDestinationList('window');
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
    renderSwTags(collectTopTags(), tag);
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
  $('hib-open').onclick = async event => {
    const opener = event.currentTarget;
    closeFloatingLayer();
    await updateHibernateCount();
    showSection('hibernate-section', opener);
  };
  $('hib-back').onclick = returnToPreviousSection;
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
  $('hib-change').onclick = () => openDestinationList('hibernate');
  $('hib-go').onclick = hibernateSelectedScope;
  const toastEl = $('pop-toast');
  toastEl.addEventListener('pointerenter', holdPopupToast);
  toastEl.addEventListener('pointerleave', () => { if (!toastEl.contains(document.activeElement)) releasePopupToast(); });
  toastEl.addEventListener('focusin', holdPopupToast);
  toastEl.addEventListener('focusout', event => {
    if (event.relatedTarget && toastEl.contains(event.relatedTarget)) return;
    if (!toastEl.matches(':hover')) releasePopupToast();
  });
  $('pop-toast-close').onclick = () => dismissPopupToast({ restoreFocus: true });
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
    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z'
      && !event.target?.closest?.('input, textarea') && undoFromPopupKeyboard()) {
      event.preventDefault();
      return;
    }
    if (searchShortcut) {
      event.preventDefault();
      if (locateResultVisible) return;
      closeFloatingLayer();
      if (activeSection !== 'main-section') resetToMain();
      const target = mainCaptureFocusTarget();
      target?.focus();
      if (target === $('ps')) $('ps').select();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (locateResultVisible) window.close();
      else if (closeFloatingLayer({ restoreFocus: true })) return;
      else if (activeSection !== 'main-section') returnToPreviousSection();
      else if (document.activeElement === $('ps') && $('ps').value) clearPopupSearch();
      else if (!dismissToastForEscape()) window.close();
    }
  });
}

applyAppearance();
applyLocale();
renderSearchShortcutHint();
bind();
load();
