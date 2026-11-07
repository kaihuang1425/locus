const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const themes = fs.readFileSync(path.join(root, 'themes.css'), 'utf8').replace(/\r\n/g, '\n');
const newtab = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');
const newtabHtml = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const newtabJs = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const popup = fs.readFileSync(path.join(root, 'popup.css'), 'utf8').replace(/\r\n/g, '\n');
const popupJs = fs.readFileSync(path.join(root, 'popup.js'), 'utf8').replace(/\r\n/g, '\n');

function section(source, startMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing ${startMarker}`);
  return source.slice(start);
}

for (const themeId of ['folio', 'folio-dark']) {
  const themeBlock = themes.match(new RegExp(`\\[data-theme="${themeId}"\\] \\{[\\s\\S]*?\\n\\}`));
  assert.ok(themeBlock, `${themeId} theme block must remain extractable`);
  for (const token of ['--registry-bg', '--registry-text', '--paper', '--paper-strong', '--locator', '--receipt']) {
    assert.match(themeBlock[0], new RegExp(`${token}:`), `${themeId} must define ${token}`);
  }
}

for (const fontId of ['dm', 'inter', 'geist', 'plex', 'lora', 'mono', 'geist-mono', 'system']) {
  assert.match(themes, new RegExp(`\\[data-font="${fontId}"\\]\\s*\\{\\s*--font:`),
    `${fontId} must remain a shared new-tab/popup font choice`);
}
assert.match(themes, /:root\s*\{[\s\S]*?--font-display:\s*var\(--font\)/,
  'shared appearance tokens must derive display type from the selected font');
assert.match(themes, /:root\s*\{[\s\S]*?--font-mono:\s*'Geist Mono'/,
  'shared appearance tokens must reserve one monospace role for exact metadata');

const newtabIndex = section(newtab, 'LOCUS INDEX REDESIGN');
// Settings is drawn by its own page layer (2026-11 canvas board).
const settingsLayerStart = newtab.indexOf('   SETTINGS PAGE (2026-11 canvas)');
assert.ok(settingsLayerStart > 0, 'the Settings page layer must exist');
const settingsLayer = newtab.slice(settingsLayerStart, newtab.indexOf('\n/* ----', settingsLayerStart));
assert.match(newtabHtml,
  /id="dp-capture"[\s\S]*id="capture-contract"[^>]*aria-labelledby="capture-contract-title"[^>]*aria-describedby="capture-policy-status"[\s\S]*id="capture-destination"[\s\S]*id="tog-capture-close"/,
  'Capture settings must lead with one real settings-derived save contract before its existing controls');
const captureHtmlStart = newtabHtml.indexOf('id="dp-capture"');
const captureHtmlEnd = newtabHtml.indexOf('id="dp-shortcuts"', captureHtmlStart);
assert.ok(captureHtmlStart >= 0 && captureHtmlEnd > captureHtmlStart,
  'Capture settings markup must remain independently inspectable');
const captureHtml = newtabHtml.slice(captureHtmlStart, captureHtmlEnd);
for (const stableId of ['dp-capture', 'capture-contract', 'capture-contract-title',
  'capture-contract-source', 'capture-contract-destination', 'capture-contract-entry',
  'capture-contract-record', 'capture-contract-duplicate', 'capture-contract-effect',
  'capture-contract-effect-hint', 'capture-policy-status', 'capture-destination-heading',
  'capture-destination', 'tog-capture-ask', 'tog-capture-remember', 'capture-source-heading',
  'tog-capture-close', 'capture-record-heading', 'tog-capture-dedupe', 'tog-capture-title',
  'tog-capture-favicon']) {
  assert.equal((newtabHtml.match(new RegExp(`id="${stableId}"`, 'g')) || []).length, 1,
    `Capture settings must preserve exactly one #${stableId}`);
}
assert.match(captureHtml,
  /class="capture-contract-route"[^>]*role="list"[^>]*data-i18n-aria-label="settings\.captureContractAria"[\s\S]*class="capture-contract-stop source"[^>]*role="listitem"[\s\S]*class="capture-contract-stop local"[^>]*role="listitem"[\s\S]*class="capture-contract-stop effect"[^>]*role="listitem"/,
  'the save contract must expose source, confirmed local copy, and source consequence as one named route');
assert.match(captureHtml,
  /id="capture-policy-status"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"[^>]*data-state="idle"/,
  'Capture preferences must own one atomic receipt status');
for (const headingId of ['capture-destination-heading', 'capture-source-heading', 'capture-record-heading']) {
  assert.match(captureHtml,
    new RegExp(`class="[^"]*\\bcapture-setting-controls\\b[^"]*"[^>]*role="group"[^>]*aria-labelledby="${headingId}"`),
    `the controls under #${headingId} must expose one named group`);
}
for (const [controlId, hintId] of [
  ['capture-destination', 'capture-destination-hint'],
  ['tog-capture-ask', 'capture-ask-hint'],
  ['tog-capture-remember', 'capture-remember-hint'],
  ['tog-capture-close', 'capture-close-hint'],
  ['tog-capture-dedupe', 'capture-dedupe-hint'],
  ['tog-capture-title', 'capture-title-hint'],
  ['tog-capture-favicon', 'capture-favicon-hint'],
]) {
  assert.match(captureHtml, new RegExp(`id="${controlId}"[^>]*aria-describedby="${hintId}"`),
    `#${controlId} must expose its exact consequence to assistive technology`);
}
for (const key of ['settings.captureSub',
  'settings.captureContractTitle', 'settings.captureContractBody', 'settings.captureContractAria',
  'settings.captureSourceLabel', 'settings.captureSourceCurrent', 'settings.captureSourceAction',
  'settings.captureLocalLabel', 'settings.captureAfterLabel', 'settings.captureDestinationActive',
  'settings.captureDestinationPath', 'settings.captureDestinationUnavailable',
  'settings.captureDestinationUnavailableHint', 'settings.capturePopupChoose',
  'settings.captureOtherEntry', 'settings.captureRecordTitleIcon', 'settings.captureRecordTitleOnly',
  'settings.captureRecordDomainIcon', 'settings.captureRecordDomainOnly',
  'settings.captureDuplicateSkip', 'settings.captureDuplicateAllow', 'settings.captureAfterClose',
  'settings.captureAfterCloseHint', 'settings.captureAfterKeep', 'settings.captureAfterKeepHint',
  'settings.capturePolicyIdle', 'settings.capturePolicySaving', 'settings.capturePolicySaved',
  'settings.capturePolicyFailed', 'settings.captureDestinationHeading',
  'settings.captureDestinationLabel', 'settings.captureDestinationHint', 'settings.captureAsk',
  'settings.captureAskHint', 'settings.captureRemember', 'settings.captureRememberHint',
  'settings.captureSourceHeading', 'settings.captureClose', 'settings.captureCloseHint',
  'settings.captureRecordHeading', 'settings.captureDedupe', 'settings.captureDedupeHint',
  'settings.captureTitle', 'settings.captureTitleHint', 'settings.captureFavicon',
  'settings.captureFaviconHint']) {
  assert.equal((newtabJs.match(new RegExp(`^\\s{4}'${key.replace('.', '\\.')}\\s*'?:`, 'gm')) || []).length, 2,
    `${key} must exist exactly once in English and once in zh-TW`);
}
const captureControllerStart = newtabJs.indexOf('const CAPTURE_SETTING_CONTROL_IDS');
const captureControllerEnd = newtabJs.indexOf('\nconst APPEARANCE_SETTING_KEYS', captureControllerStart);
assert.ok(captureControllerStart >= 0 && captureControllerEnd > captureControllerStart,
  'the Capture preference model and receipt controller must remain production-extractable');
const captureController = newtabJs.slice(captureControllerStart, captureControllerEnd);
assert.match(captureController,
  /function captureSettingsResolveActiveDestination[\s\S]*activeWsId[\s\S]*function captureSettingsResolveDestination\(state\)[\s\S]*captureLastTarget[\s\S]*captureDefaultCategoryId[\s\S]*return captureSettingsResolveActiveDestination/,
  'the visible destination must follow the same remembered, fixed, then active resolution order as real capture');
assert.match(captureController,
  /function captureSettingsUniqueMatch[\s\S]*matches\.length === 1[\s\S]*function captureSettingsResolveSpaceDestination[\s\S]*inboxes\.length > 1/,
  'the visible contract must fail closed for duplicate identities and ambiguous Inbox targets');
assert.match(captureController,
  /function captureSettingsId\(value\)[\s\S]*typeof value === 'string' && value[\s\S]*mode: 'active'[\s\S]*mode: 'space'[\s\S]*categoryId: id/,
  'the policy projection must match capture string-ID rules without colliding with its active-Space UI sentinel');
assert.match(captureController,
  /async function commitCaptureSettingsChange[\s\S]*State\.isRecoveryRequired[\s\S]*captureSettingsPending = transaction[\s\S]*await State\.persistNow\(\)[\s\S]*State\.get\(\) !== state[\s\S]*captureSettingsPatchFingerprint\(settings, keys\) !== expected[\s\S]*capturePolicySaved/,
  'each preference change must await one exact receipt and reject graph or touched-value drift before success');
assert.equal((captureController.match(/State\.persistNow\(\)/g) || []).length, 1,
  'the Capture controller must expose exactly one acknowledged persistence boundary');
assert.doesNotMatch(captureController, /State\.persist\(\)/,
  'the Capture controller must not retain fire-and-forget persistence');
assert.match(captureController,
  /function paintSettingsPreferenceBusy\(\)[\s\S]*settingsPreferencePendingTransaction\(\)[\s\S]*\[data-settings-preference-control\][\s\S]*control\.disabled = busy && control\.id !== ownerId[\s\S]*#drawer-tabs \.dt, #drawer-x[\s\S]*control\.disabled = busy/,
  'pending Capture must disable every other tracked preference, Settings section, and Close while retaining its opener');
const captureBindingsStart = newtabJs.indexOf("const captureDestination = document.getElementById('capture-destination')");
const captureBindingsEnd = newtabJs.indexOf("document.getElementById('export-btn')", captureBindingsStart);
const captureBindings = newtabJs.slice(captureBindingsStart, captureBindingsEnd);
assert.match(captureBindings,
  /commitCaptureSettingsChange\('capture-destination'[\s\S]*captureLastTarget: undefined[\s\S]*commitCaptureSettingsChange\(id,\s*\{/,
  'destination and toggle controls must converge on the same guarded receipt controller');
assert.doesNotMatch(captureBindings, /State\.persist\(|toast\(/,
  'Capture controls must not persist in the background or announce success before acknowledgement');
assert.match(newtabJs,
  /function setSettingsSection\(tab\)[\s\S]*settingsPreferencePendingTransaction\(\)[\s\S]*focusSettingsPreferencePendingControl\(\)[\s\S]*return false/,
  'pending Settings preference writes must block section navigation and keep focus on their opener');
assert.match(newtabJs,
  /const _closeDrawer = \(\) => \{[\s\S]*settingsPreferenceBlocksDismissal\(\)[\s\S]*focusSettingsPreferencePendingControl\(\)[\s\S]*return false/,
  'pending Settings preference writes must block pointer dismissal of Settings');
const globalKeysStart = newtabJs.indexOf('// Global keys');
const capturePendingKey = newtabJs.indexOf('if (settingsPreferenceBlocksDismissal())', globalKeysStart);
const nextReceiptKey = newtabJs.indexOf('if (isSavedTabReturnMutationPending())', globalKeysStart);
assert.ok(globalKeysStart >= 0 && capturePendingKey > globalKeysStart && nextReceiptKey > capturePendingKey,
  'the global keyboard stack must give the pending Capture receipt ownership before board shortcuts');
assert.match(newtabJs.slice(capturePendingKey, nextReceiptKey),
  /e\.key !== 'Tab'[\s\S]*preventDefault\(\)[\s\S]*stopImmediatePropagation\(\)[\s\S]*focusSettingsPreferencePendingControl\(\)/,
  'pending Settings preferences must retain Tab trapping while blocking Escape and global navigation');
// The board shows only the Capture controls; the settings-derived contract
// stays as the section's described summary for assistive technology, and the
// status line shows only when a write fails.
assert.match(captureHtml,
  /<section id="capture-contract" class="stg-contract sr-only"/,
  'the save contract must stay in the page as a visually hidden summary');
assert.match(settingsLayer,
  /\.stg-status:not\(\[data-state="error"\]\) \{[^}]*position: absolute;[\s\S]*\.stg-status\[data-state="error"\] \{[^}]*background: var\(--today-when-soft\)/,
  'a Capture failure must still show on the page');
assert.doesNotMatch(newtab, /\.capture-contract-(?:registry|route|stop|link)\s*\{|\.capture-proof\b|\.capture-setting-row\b/,
  'the old Capture ledger styles must be gone');
assert.doesNotMatch(captureHtml, /Page title|example\.com|capture-intro|capture-step|capture-preview|capture-local-badge/,
  'Capture settings must not manufacture populated page evidence or retain decorative steps');
assert.doesNotMatch(newtab, /\.capture-(?:intro|step|preview|local-badge)\b/,
  'obsolete Capture preview and decorative-step CSS must stay removed');
assert.match(newtabHtml,
  /id="dp-data"[\s\S]*id="export-btn"[\s\S]*<button[^>]*id="import-json-btn"[^>]*aria-controls="import-file"[\s\S]*id="import-file"/,
  'Settings Data must lead with backup and expose JSON selection through one native named button');
for (const stableId of ['dp-data', 'data-transfer-ledger', 'data-backup-title', 'data-backup-summary',
  'data-export-hint', 'export-btn', 'data-restore-title', 'data-file-status', 'import-json-btn',
  'import-file', 'data-other-title', 'bookmarks-btn', 'paste-import-btn', 'import-overlay',
  'import-description', 'import-manifest-title', 'import-counts', 'import-status', 'import-confirm']) {
  assert.equal((newtabHtml.match(new RegExp(`id="${stableId}"`, 'g')) || []).length, 1,
    `Settings Data must preserve exactly one #${stableId}`);
}
assert.doesNotMatch(newtabHtml, /<label[^>]*for="import-file"/,
  'JSON selection must not depend on a pointer-oriented label masquerading as a button');
assert.match(newtabHtml,
  /id="import-file"[^>]*accept="\.json"[^>]*hidden/,
  'the established file input must remain JSON-scoped and visually hidden behind the native trigger');
assert.match(newtabHtml,
  /id="import-overlay"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="import-title"[^>]*aria-describedby="import-description import-status"[^>]*aria-busy="false"/,
  'the backup review must expose one named, described, busy-capable modal boundary');
assert.match(newtabHtml,
  /id="import-counts"[^>]*role="list"[^>]*data-i18n-aria-label="import\.countsAria"/,
  'the real backup manifest counts must expose localized list semantics');
assert.match(newtabHtml,
  /name="import-mode" value="replace"[^>]*aria-describedby="import-replace-body"[^>]*checked[\s\S]*name="import-mode" value="merge"[^>]*aria-describedby="import-merge-body"/,
  'Replace and Merge must each expose their exact consequence to assistive technology');
for (const key of ['settings.dataTransferAria',
  'settings.dataBackupTitle', 'settings.dataBackupBody', 'settings.dataBackupLoading',
  'settings.dataBackupSummary', 'settings.dataExportLimit', 'settings.downloadBackup',
  'settings.dataRestoreTitle',
  'settings.dataRestoreBody', 'settings.dataChooseStatus', 'settings.chooseBackup',
  'settings.dataReadingFile', 'settings.dataReviewReady', 'settings.dataReviewFailed',
  'settings.dataReviewBlocked', 'settings.dataReviewCanceled', 'settings.dataImportCompleted',
  'settings.dataOtherTitle', 'settings.dataOtherBody',
  'settings.bookmarksImporting', 'feedback.bookmarksReadFailed',
  'feedback.bookmarksDestinationChanged', 'feedback.bookmarksSaveFailed',
  'history.importReplace', 'history.importMerge', 'import.kicker', 'import.description',
  'import.manifest', 'import.unchanged', 'import.countsAria', 'import.bookmarksDefaultGroup',
  'import.ready', 'import.confirmReplace', 'import.confirmMerge', 'import.importingReplace',
  'import.importingMerge', 'import.saveFailed']) {
  assert.equal((newtabJs.match(new RegExp(`^\\s{4}'${key.replace('.', '\\.')}\\s*'?:`, 'gm')) || []).length, 2,
    `${key} must exist exactly once in English and once in zh-TW`);
}
assert.match(newtabJs,
  /function renderDataSettings\([\s\S]*countState\(state\)[\s\S]*serializedUtf8Size\(state\)[\s\S]*dataTransferFileStatus/,
  'the outbound ledger must summarize only the real current graph and current file-review state');
assert.match(newtabJs,
  /function importJSON\(file, opener = null\)[\s\S]*\+\+importReadGeneration[\s\S]*generation !== importReadGeneration[\s\S]*dataReviewFailed[\s\S]*dataReadingFile[\s\S]*generation !== importReadGeneration[\s\S]*openImportPreview\(\)/,
  'file review must expose loading/failure and refuse stale asynchronous FileReader results');
assert.match(newtabJs,
  /function openImportPreview\([\s\S]*setImportInterlock\(true\)[\s\S]*lockBodyScroll\(\)[\s\S]*replaceRadio\.focus/,
  'backup review must open as one interlocked layer focused on its checked method');
assert.match(newtabJs,
  /function closeImportPreview\([\s\S]*importBusy && !force[\s\S]*setImportInterlock\(false\)[\s\S]*restoreOpener\(overlay\)/,
  'backup review must block pending dismissal and return to its real opener');
assert.match(newtabJs,
  /async function confirmImportPreview\([\s\S]*if \(!importCtx \|\| importBusy\) return false[\s\S]*setImportBusy\(true\)[\s\S]*await applyImport[\s\S]*importCtx\.errorKey = 'import\.saveFailed'[\s\S]*outcome: 'success'/,
  'one controller must keep import review visible through pending, failure, and acknowledged success');
assert.match(newtabJs,
  /function bindImportUI\([\s\S]*event\.key === 'Escape'[\s\S]*stopPropagation\(\)[\s\S]*trapTabKey\(event, overlay\)/,
  'the import review must own one LIFO Escape and contained Tab boundary');
assert.match(newtabJs,
  /importJsonButton\.onclick = \(\) =>[\s\S]*importFile\.click\(\)[\s\S]*importJSON\(file, importJsonButton\)/,
  'the native JSON trigger must remain the file-review opener');
assert.match(newtabJs,
  /async function importBookmarks\([\s\S]*identitySpaceTarget\(reviewedTarget\.workspaceId, reviewedTarget\.spaceId\)[\s\S]*State\.persistNow\(\)[\s\S]*State\.rollbackSnapshot\(actionId\)/,
  'bookmark import must re-resolve its reviewed Space and wait for accepted storage before success');
for (const contract of [
  /#import-overlay\s*\{[^}]*backdrop-filter:\s*none[^}]*animation:\s*none/,
  /#import-overlay \.import-review-panel\s*\{[^}]*border-left:\s*6px solid var\(--index-locator\)[^}]*border-radius:\s*4px/,
  /#import-overlay \.import-mode-opt:has\(input:checked\)\s*\{[^}]*border-left-color:\s*var\(--index-locator\)[^}]*background:\s*var\(--index-paper\)/,
]) {
  assert.match(newtab, contract, `the JSON review must keep its flat review contract: ${contract}`);
}
for (const contract of [
  /\.stg-btn \{[^}]*min-height: 44px;[^}]*border-radius: 12px;/,
  /\.stg-btn-b \{[^}]*background: var\(--stg-on\);/,
  /\.stg-export-fill\.is-running \{ animation: stgFill \.32s var\(--today-ease\) both; \}/,
  /\.stg-export\[data-state="done"\] \{[^}]*background: var\(--today-receipt\);/,
]) {
  assert.match(settingsLayer, contract, `Settings Backup must use the board's rows and download button: ${contract}`);
}
assert.doesNotMatch(newtab, /\.data-transfer-(?:sheet|action|direction|secondary|ledger)\b/,
  'the old transfer ledger styles must be gone');
assert.match(settingsLayer,
  /@container \(max-width: 640px\) \{[\s\S]*\.stg-export,\n  \.stg-row > \.stg-btn \{ flex: 1 1 100%; width: 100%; min-width: 0; \}/,
  'the backup actions must take the full row at phone width');
assert.match(newtab,
  /@media \(max-width:\s*520px\)[\s\S]*#import-overlay \.import-review-panel[\s\S]*#import-overlay \.modal-ft\s*\{[^}]*grid-template-columns:\s*1fr/,
  'the backup manifest and actions must remain reachable at 520 px');
assert.match(newtab,
  /@media \(forced-colors:\s*active\)[\s\S]*#import-overlay \.import-review-panel,[\s\S]*\.import-manifest \{ border-left-color: Highlight; \}/,
  'forced colors must preserve the JSON review spine and selected review method');
assert.match(newtabHtml,
  /id="storage-bar-meter"[^>]*role="meter"[^>]*aria-valuemin="0"[^>]*aria-valuemax="100"[^>]*aria-busy="true"[^>]*data-i18n-aria-label="settings\.storageUsageAria"/,
  'Settings Storage must expose one localized exact browser-usage meter before estimated Locus data');
for (const stableId of ['storage-capacity', 'storage-bar-text', 'storage-bar-state', 'storage-refresh', 'storage-bar-meter',
  'storage-bar-fill', 'storage-usage-hint', 'storage-archive-row', 'storage-archive-meta',
  'storage-open-archive', 'storage-breakdown-label', 'storage-breakdown-hint',
  'storage-breakdown-total', 'storage-breakdown-empty', 'storage-breakdown']) {
  assert.equal((newtabHtml.match(new RegExp(`id="${stableId}"`, 'g')) || []).length, 1,
    `Settings Storage must preserve exactly one #${stableId}`);
}
assert.match(newtabHtml,
  /id="storage-bar-meter"[\s\S]*id="storage-breakdown-total"[\s\S]*id="storage-breakdown"[\s\S]*id="storage-archive-row"/,
  'exact capacity, then the estimated legend, then Archive recovery (the board order)');
assert.match(newtabHtml,
  /id="storage-breakdown"[^>]*role="list"[^>]*data-i18n-aria-label="settings\.storageBreakdownAria"[^>]*aria-describedby="storage-breakdown-hint storage-breakdown-total"[^>]*aria-busy="true"/,
  'the estimated register must expose a localized name, explanation, total, and loading state');
for (const key of ['settings.storageUsageAria', 'settings.storageChecking', 'settings.storageRefresh',
  'settings.storageUsageLoading', 'settings.storageUsage', 'settings.storageUsageUnavailable',
  'settings.storageStateAvailable', 'settings.storageStateWarn', 'settings.storageStateFull',
  'settings.storageStateUnavailable', 'settings.storagePersistenceHint',
  'settings.storageArchiveLoading', 'settings.storageArchiveOne', 'settings.storageArchiveMany',
  'settings.storageArchiveEmpty', 'settings.storageBreakdownHint', 'settings.storageBreakdownAria',
  'settings.storageEstimateLoading', 'settings.storageEstimateTotal', 'settings.storageEmpty',
  'settings.storageTypeLinks', 'settings.storageTypeNotes', 'settings.storageTypeTodos',
  'settings.storageTypeStacks', 'settings.storageTypeStructure', 'settings.storageItemOne',
  'settings.storageItemMany', 'settings.storageEstimateWithCount', 'settings.storageEstimateOnly']) {
  assert.equal((newtabJs.match(new RegExp(`^\\s{4}'${key.replace('.', '\\.')}\\s*'?:`, 'gm')) || []).length, 2,
    `${key} must exist exactly once in English and once in zh-TW`);
}
assert.match(newtabJs, /function utf8StringByteLength\([\s\S]*codePointAt[\s\S]*function serializedUtf8Size\(/,
  'Settings estimates must measure serialized UTF-8 rather than JavaScript string length');
assert.match(newtabJs, /function storageBreakdownModel\([\s\S]*settings\.storageTypeStructure[\s\S]*totalBytes[\s\S]*hasSavedRecords/,
  'one pure model must own real-data buckets, total estimate, and the empty-state decision');
assert.match(newtabJs, /function paintSettingsStorageUsage\([\s\S]*storageUsageUnavailable[\s\S]*aria-valuenow[\s\S]*storageStateFull/,
  'one painter must own loading, unavailable, known, warning, and almost-full meter states');
assert.match(newtabJs, /async function refreshStorageUsage\([\s\S]*\+\+_settingsStorageUsageGeneration[\s\S]*generation !== _settingsStorageUsageGeneration/,
  'late browser-usage reads must not overwrite a newer Settings refresh');
assert.match(newtabJs, /storageRefreshBtn\.getAttribute\('aria-disabled'\) === 'true'[\s\S]*refreshStorageUsage\(\)/,
  'the unavailable state must offer one focus-stable, duplicate-guarded retry');
assert.match(newtabJs, /function applyLocale\([\s\S]*getElementById\('dp-storage'\)[\s\S]*renderStorageSettings\(\)/,
  'an open Storage section must repaint dynamic copy when locale changes');
assert.doesNotMatch(newtabJs,
  /Storage · \$\{_formatBytes|Nothing archived yet|Nothing saved yet — your library is empty|label:\s*'Links'|label:\s*'Trackers & settings'|color:\s*'#5566f2'/,
  'Settings Storage must remove hardcoded English and rainbow-dashboard model residue');
assert.doesNotMatch(newtab, /\.sp-breakdown-dot\s*\{|--dot:/,
  'estimated storage rows must not retain ornamental category dots');
for (const contract of [
  /\.stg-cap-text \{[^}]*font-family: var\(--today-display\);[^}]*font-size: 22px;[^}]*font-variant-numeric: tabular-nums;/,
  /\.stg-meter \{[^}]*display: flex;[^}]*height: 12px;[^}]*border-radius: 999px;/,
  /\.stg-fill \{[^}]*display: flex;[^}]*min-width: 6px;[^}]*transition: width \.32s var\(--today-ease\);/,
  /\.stg-part \{ background: var\(--stg-kind\); \}/,
  /#storage-breakdown \.sp-breakdown-rank \{[^}]*background: var\(--stg-kind\);/,
  /#storage-breakdown \.sp-breakdown-track \{ display: none; \}/,
]) {
  assert.match(settingsLayer, contract, `Settings Storage must use the board's segmented meter and legend: ${contract}`);
}
assert.match(newtabJs, /function renderStorageSettings\([\s\S]*meterFill\.replaceChildren\([\s\S]*part\.className = 'stg-part';[\s\S]*part\.style\.flexGrow = String\(bucket\.bytes\);/,
  'the exact-usage fill is split by the estimated share of each kind');
assert.doesNotMatch(newtab, /\.sp-storage-row\b|\.storage-capacity\s*\{|\.storage-bar-text\s*\{|\.storage-refresh\s*\{/,
  'the old Storage ledger styles must be gone');
assert.match(settingsLayer, /@media \(forced-colors:\s*active\)[\s\S]*\.stg-fill,\n  \.stg-part \{ background: Highlight; forced-color-adjust: none; \}/,
  'forced colors must preserve the usage fill');
assert.match(newtabHtml, /<section class="wc-task"[^>]*>[\s\S]*?<div class="wc-intro">[\s\S]*?<div class="wc-operation">/,
  'Welcome must keep the explicit intro and operation groups in DOM order');
for (const stableId of ['welcome', 'wc-card', 'wc-save-first', 'wc-retry', 'wc-explore']) {
  assert.equal((newtabHtml.match(new RegExp(`id="${stableId}"`, 'g')) || []).length, 1,
    `Welcome must preserve exactly one #${stableId}`);
}
assert.doesNotMatch(newtabIndex, /(?:linear|radial|conic)-gradient\s*\(/,
  'the core visual system must not fall back to decorative gradients');
assert.match(newtabIndex, /#sidebar[\s\S]*background:\s*var\(--index-registry\)/,
  'the default shell must use the ink registry rail');
assert.match(newtabIndex, /#topbar[\s\S]*border-top:\s*3px solid var\(--index-locator\)/,
  'the shared top bar must expose the location marker');
assert.doesNotMatch(newtabIndex, /font-family:\s*'Lora'/,
  'core surfaces must not override the user-selected font with an editorial face');
for (const selector of ['#ws-title', '.home-trail-head h2', '.wc-h', '.rail-title']) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(newtabIndex, new RegExp(`${escaped}[\\s\\S]*?font-family:\\s*var\\(--font-display\\)`),
    `${selector} must use the shared selected-font display role`);
}
// 2026-11: Item details is its own block (the board's panel) before the Index
// layer; its accessible heading keeps the display role there.
const newtabDetail = section(newtab, 'ITEM DETAIL PANE');
assert.match(newtabDetail, /\.idp-heading\s*\{[^}]*font-family:\s*var\(--font-display\)/,
  '.idp-heading must use the shared selected-font display role');
assert.match(newtabIndex, /\.home-trail[\s\S]*border-radius:\s*6px/,
  'Home recovery must use the ruled-record shape');
assert.match(newtabIndex, /\.home-loop-zone[\s\S]*border-top:\s*3px solid var\(--index-receipt\)/,
  'the accepted-result zone must use the receipt marker');
assert.match(newtabIndex, /\.wc-task[\s\S]*grid-template-columns:/,
  'Welcome must use the same index-sheet hierarchy');
assert.match(newtabDetail, /#item-detail \.idp-type\s*\{[^}]*background:\s*var\(--index-registry\)[^}]*color:\s*var\(--index-registry-text\)/,
  'saved-item detail must carry the registry ink in its header (the kind pill of the board header)');
assert.match(newtabIndex, /:where\([^)]*button[\s\S]*:focus-visible[\s\S]*outline:\s*3px solid var\(--index-focus\)/,
  'the redesign must retain a strong shared focus treatment');
assert.match(newtabIndex, /@media \(max-width:\s*800px\)[\s\S]*\.wc-task[\s\S]*grid-template-columns:\s*1fr/,
  'Welcome must stack at the required narrow layout');
assert.match(newtabDetail, /@media \(max-width:\s*560px\)\s*\{\s*#item-detail \.idp-panel\s*\{[^}]*width:\s*100vw/,
  'saved-item detail must remain full-width at the narrow boundary');
assert.match(newtabIndex, /@media \(forced-colors:\s*active\)/,
  'the core system must keep a forced-colors boundary');
assert.match(newtabIndex, /@media \(prefers-reduced-motion:\s*reduce\)/,
  'the core system must keep a reduced-motion boundary');

for (const contract of [
  /#context-menu\s*\{[^}]*max-width:\s*min\([^}]*max-height:\s*calc\([^}]*overflow-y:\s*auto/,
  /#context-menu\s*\{[^}]*border-top:\s*3px solid var\(--index-locator\)[^}]*background:\s*var\(--index-sheet\)/,
  /#context-menu\s*\{[^}]*backdrop-filter:\s*none[^}]*animation:\s*none/,
  /\.cm-item\s*\{[^}]*min-height:\s*40px[^}]*border-left:\s*3px solid transparent/,
  /\.cm-item:hover,\s*\.cm-item:focus-visible\s*\{[^}]*border-left-color:\s*var\(--index-locator\)[^}]*background:\s*var\(--index-paper\)/,
  /\.cm-item:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--index-focus\)/,
  /html:lang\(zh-TW\) \.cm-label\s*\{[^}]*text-transform:\s*none/,
]) {
  assert.match(newtabIndex, contract, `shared menu must use the Locus Index contract: ${contract}`);
}
assert.match(newtabIndex, /@media \(forced-colors:\s*active\)[\s\S]*#context-menu[\s\S]*\.cm-item:focus-visible/,
  'shared menus must retain a forced-colors boundary and visible focus');
assert.match(newtabIndex, /@media \(forced-colors:\s*active\)[\s\S]*\.notif-host\.has-notif \.notif-dot[\s\S]*background:\s*Highlight/,
  'the reminder signal on More must survive forced colors');
assert.doesNotMatch(newtabIndex, /#context-menu\s*\{[^}]*blur\(|#context-menu\s*\{[^}]*popIn/,
  'shared menus must not restore glass blur or ornamental entrance motion');
assert.match(newtabJs, /menu\.setAttribute\('aria-label',\s*opts\?\.ariaLabel\s*\|\|\s*tr\('menu\.actions'\)\)/,
  'every shared menu must expose a localized screen-reader name');
for (const key of [
  'action.moreReminderCount', 'menu.actions', 'menu.findReview', 'menu.options', 'menu.organize',
  'layout.view',
  'layout.board', 'layout.list', 'layout.canvas', 'layout.explorer',
  'layout.timeline', 'layout.gallery', 'layout.graph',
]) {
  assert.equal((newtabJs.match(new RegExp(`^\\s{4}'${key}'\\s*:`, 'gm')) || []).length, 2,
    `${key} must exist exactly once in English and once in zh-TW`);
}
assert.match(newtabJs, /function layoutLabel\(mode\)[\s\S]*tr\(`layout\.\$\{mode\}`\)/,
  'layout names must resolve at the presentation boundary');
for (const hardcoded of ['Find and review', 'Organize', 'Advanced views…', 'Back to core views']) {
  assert.doesNotMatch(newtabJs, new RegExp(`(?:label|text):\\s*'${hardcoded.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}'`),
    `shared menu copy must not remain hardcoded: ${hardcoded}`);
}
assert.match(newtabJs, /function secondaryNavigationItems\(opener = null\)[\s\S]*label:\s*tr\('menu\.findReview'\)/,
  'secondary navigation must use its localized review heading');
const secondaryNavigationBlock = newtabJs.match(/function secondaryNavigationItems\(opener = null\)[\s\S]*?\n\}/)?.[0] || '';
assert.doesNotMatch(secondaryNavigationBlock, /tr\('search\.nav'\)/,
  'the overflow must not duplicate the global Search affordance');
assert.match(secondaryNavigationBlock, /label:\s*tr\('menu\.options'\)[\s\S]*tr\('action\.plugins'\)[\s\S]*openToolsHub\(opener\)/,
  'secondary utilities must stay grouped behind the named Plugins entry');
assert.match(newtabJs, /function openMoreMenu\(btn, anchor = btn\)[\s\S]*label:\s*tr\('menu\.organize'\)/,
  'the page More menu must use its localized organize heading');
assert.match(newtabJs, /function openMoreMenu\(btn, anchor = btn\)[\s\S]*focusDialogOpener\(btn\)[\s\S]*expandedOwner:\s*btn/,
  'the page More menu must focus its visible disclosure owner and publish expanded state');
assert.match(newtabJs, /function openAppMenu\(anchor\)[\s\S]*getElementById\('more-btn'\)[\s\S]*positionedAnchor[\s\S]*openMoreMenu\(opener, positionedAnchor\)/,
  'the optional Welcome entry must reuse the visible More menu instead of a second model');
assert.match(newtabJs, /function syncTopbarMoreState\(\)[\s\S]*action\.moreReminderCount[\s\S]*classList\.toggle\('has-notif'[\s\S]*setAttribute\('aria-label'/,
  'the one overflow must expose localized reminder state visually and to assistive technology');
assert.doesNotMatch(newtabJs, /APP_MENU_ICONS/,
  'the retired duplicate app-menu icon language must not remain');

const syncTopbarMoreSource = newtabJs.match(/function syncTopbarMoreState\(\) \{[\s\S]*?\n\}/)?.[0] || '';
const moreClasses = new Set();
const moreAttributes = new Map();
const moreButton = {
  title: '',
  classList: { toggle(name, on) { if (on) moreClasses.add(name); else moreClasses.delete(name); } },
  setAttribute(name, value) { moreAttributes.set(name, value); },
};
const moreStateContext = vm.createContext({
  _pendingReminderCount: 0,
  itemSelMode: false,
  document: {
    body: { classList: { contains() { return false; } } },
    getElementById(id) { return id === 'more-btn' ? moreButton : null; },
  },
  tr(key, values = {}) {
    return key === 'action.moreReminderCount' ? `More actions. Reminders: ${values.count}` : 'More';
  },
});
vm.runInContext(`${syncTopbarMoreSource}\nglobalThis.__syncMore = syncTopbarMoreState;`, moreStateContext);
moreStateContext.__syncMore();
assert.equal(moreButton.title, 'More');
assert.equal(moreAttributes.get('aria-label'), 'More');
assert.equal(moreClasses.has('has-notif'), false);
moreStateContext._pendingReminderCount = 3;
moreStateContext.__syncMore();
assert.equal(moreButton.title, 'More actions. Reminders: 3');
assert.equal(moreAttributes.get('aria-label'), 'More actions. Reminders: 3');
assert.equal(moreClasses.has('has-notif'), true,
  'pending reminders must create one non-ornamental signal on More');

const secondaryNavigationRuntimeSource = newtabJs.match(/function secondaryNavigationItems\(opener = null\) \{[\s\S]*?\n\}/)?.[0] || '';
const menuCalls = { plugins: [], settings: [] };
const menuRuntimeContext = vm.createContext({
  _pendingReminderCount: 4,
  MORE_OPTION_ICONS: { settings: 'gear' },
  cmIcons: { favorite: 'favorite', readLater: 'read', archive: 'archive', delete: 'delete', clock: 'clock', stack: 'plugins' },
  tr: key => key,
  openLibrarySurface() {},
  openCalendar() {},
  openToolsHub(opener) { menuCalls.plugins.push(opener); },
  openSettingsDrawer(tab, opener) { menuCalls.settings.push({ tab, opener }); },
});
vm.runInContext(`${secondaryNavigationRuntimeSource}\nglobalThis.__secondaryItems = secondaryNavigationItems;`, menuRuntimeContext);
const runtimeOpener = { id: 'more-btn' };
const runtimeItems = menuRuntimeContext.__secondaryItems(runtimeOpener);
assert.equal(runtimeItems.some(item => item.text === 'search.nav'), false,
  'runtime More items must keep Search singular');
assert.equal(runtimeItems.find(item => item.text === 'action.calendar').sub, '4');
runtimeItems.find(item => item.text === 'action.plugins').action();
runtimeItems.find(item => item.text === 'action.settings').action();
assert.equal(menuCalls.plugins[0], runtimeOpener,
  'Plugins must inherit the visible More button as its focus-return owner');
assert.deepEqual(menuCalls.settings[0], { tab: 'general', opener: runtimeOpener },
  'Settings must inherit the visible More button as its focus-return owner');
// 2026-11-06 (page board): the Space page's seven view tabs replaced the Board/List
// menu and its Advanced views submenu.
assert.match(newtabJs, /const LAYOUT_ORDER = \['board', 'list', 'canvas', 'explorer', 'timeline', 'gallery', 'graph'\];/,
  'the view tabs replaced the Advanced views grouping (2026-11-06, page board): all seven views are in one order');
assert.match(newtabJs, /function buildSpacePage\(cat\)[\s\S]*?<div class="spc-tabs" role="tablist">[\s\S]*?LAYOUT_ORDER\.map\(view => `<button type="button" role="tab" class="spc-tab"/,
  'the view tabs replaced the Advanced views grouping (2026-11-06, page board): every view is a tab in one tablist');
assert.match(newtabJs, /function syncSpacePage\([^)]*\)[\s\S]*?tabs\.setAttribute\('aria-label', tr\('layout\.view'\)\);[\s\S]*?tab\.querySelector\('\.spc-tab-label'\)\.textContent = layoutLabel\(tab\.dataset\.view\);/,
  'the view tabs must localize their list name and every view name at the presentation boundary');
assert.doesNotMatch(newtabJs, /function openLayoutMenu\(|function openAdvancedLayoutMenu\(|'layout\.(?:advancedViews|advancedViewsOpen|backCore)'/,
  'the view tabs replaced the Advanced views grouping (2026-11-06, page board): its menus and strings are gone');

// 2026-11-06 (page board): the command palette follows its board (Palette.dc.html):
// a light card over a soft scrim, a 64 px query row, one column of sections, a
// highlight that slides between 44 px rows, and a short scale-in on open. The
// Locus Index palette look (registry query row, locator border-left rows) was
// replaced; the shortcut reference keeps the Index contract.
for (const contract of [
  /#cmd-palette\s*\{[^}]*backdrop-filter:\s*none/,
  /\.cmdp-box\s*\{[^}]*border-radius:\s*22px[^}]*background:\s*var\(--today-card\)/,
  /\.cmdp-inputrow\s*\{[^}]*min-height:\s*64px/,
  /\.cmdp-row\s*\{[^}]*min-height:\s*44px/,
  /\.cmdp-row:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--index-locator/,
  // Finding R2-18: the query field keeps a visible focus indicator (ported
  // from the Index layer's #cmdp-input:focus-visible outline): its rule turns
  // the focus colour at 2 px, and forced colours draw a Highlight outline.
  /#cmdp-input:focus-visible\s*\{\s*outline:\s*none;\s*\}\s*\.cmdp-inputrow:has\(> #cmdp-input:focus-visible\)\s*\{\s*border-bottom-color:\s*var\(--index-focus, var\(--accent\)\);\s*box-shadow:\s*inset 0 -1px 0 var\(--index-focus, var\(--accent\)\);/,
  /@media \(forced-colors: active\)[\s\S]*\.cmdp-inputrow:has\(> #cmdp-input:focus-visible\) \{ outline: 2px solid Highlight; outline-offset: -2px; \}/,
  /\.cmdp-section h3\s*\{[^}]*text-transform:\s*none/,
  /\.pal-glide\s*\{[^}]*transition:\s*transform \.26s/,
  /#cheatsheet-overlay \.rm-panel\s*\{[^}]*max-height:\s*min\([^}]*border-radius:\s*6px/,
  /\.cheatsheet \.sp-shortcut-row\s*\{[^}]*min-height:\s*44px/,
]) {
  assert.match(newtabIndex, contract, `command discovery must follow its board and keep the shortcut reference contract: ${contract}`);
}
assert.match(newtabIndex, /@media \(max-width: 520px\) \{\n  #cmd-palette \{ padding: 8px; \}/,
  'the palette is one scrolling column at every width and keeps 8 px margins on a phone');
assert.match(newtabIndex, /@media \(prefers-reduced-motion: reduce\) \{\n  \.fnd, \.fnd \*, \.fnd \*::before, \.fnd \*::after,\n  #cmd-palette, #cmd-palette \*/,
  'palette motion must remain suppressible');
assert.match(newtabIndex, /@media \(forced-colors: active\) \{[\s\S]*?#cmd-palette \{ background: Canvas; \}[\s\S]*?\.cmdp-row:focus-visible \{ outline-color: CanvasText; \}/,
  'the palette must retain forced-color focus and surfaces');
assert.match(newtabIndex, /@media \(forced-colors:\s*active\)[\s\S]*#cheatsheet-overlay \{ background: Canvas; \}/,
  'the shortcut reference must retain forced-color surfaces');
assert.doesNotMatch(newtabIndex, /#cmd-palette\s*\{[^}]*blur\(|\.cmdp-box\s*\{[^}]*popIn/,
  'command discovery must not restore glass blur or the old popIn entrance');
assert.match(newtabIndex, /\.cmdp-box\.is-in \{ animation: pal-in \.22s var\(--today-ease\) both; \}/,
  'the palette opens with the board\'s short (220 ms) scale-in, not an ornamental entrance');

assert.match(newtabHtml, /id="cheatsheet-title"[^>]*data-i18n="shortcuts\.title"/,
  'the shortcut reference heading must be localized');
assert.match(newtabHtml, /id="cheatsheet-list"[^>]*class="cheatsheet sp-shortcut-list"[^>]*role="list"/,
  'the shortcut reference must render the shared shortcut rows into one named list');
assert.match(newtabHtml, /id="cheatsheet-status"[^>]*role="status"[^>]*aria-live="polite"/,
  'the shortcut reference must expose browser-key loading and fallback status');
assert.match(newtabHtml, /id="shortcuts-global-status"[^>]*role="status"[^>]*aria-live="polite"/,
  'Settings must expose browser-key loading and fallback status');
assert.doesNotMatch(newtabHtml, /<dd>Open the command palette<\/dd>|<dd>Show this cheatsheet<\/dd>/,
  'the shortcut dialog must not retain a second hardcoded English data source');

for (const key of [
  'shortcuts.title', 'shortcuts.close', 'shortcuts.closeAria',
  'shortcuts.checkingBrowser', 'shortcuts.browserFallback',
  'shortcuts.customizeFallback', 'shortcuts.notSet',
  'shortcuts.openPalette', 'shortcuts.openSearch', 'shortcuts.saveCurrentTab',
  'shortcuts.openPopup', 'shortcuts.undo', 'shortcuts.redo',
  'shortcuts.focusTabFilter', 'shortcuts.toggleCalendar',
  'shortcuts.moveGroupFocus', 'shortcuts.activateFocusedItem',
  'shortcuts.moveFocusedItem', 'shortcuts.closeLayer',
  'shortcuts.openReference', 'shortcuts.multiSelectTab',
  'shortcuts.rangeSelectTabs',
]) {
  assert.equal((newtabJs.match(new RegExp(`^\\s{4}'${key}'\\s*:`, 'gm')) || []).length, 2,
    `${key} must exist exactly once in English and once in zh-TW`);
}
assert.match(newtabJs, /const SHORTCUT_DEFINITIONS\s*=\s*Object\.freeze\(/,
  'one immutable shortcut definition model must own Settings and the reference');
assert.match(newtabJs, /function shortcutRowsForSurface\(surface, commands = null\)/,
  'shortcut surfaces must project from the shared model');
assert.match(newtabJs, /async function readBrowserShortcutCommands\(\)/,
  'browser-assigned shortcut keys must come from one guarded API reader');
assert.match(newtabJs, /function renderCheatsheet\(\)[\s\S]*shortcuts\.checkingBrowser[\s\S]*readBrowserShortcutCommands\(\)[\s\S]*shortcuts\.browserFallback/,
  'the reference must render immediate defaults, loading, live browser keys, and fallback error');
assert.match(newtabJs, /async function renderShortcutsSettings\(\)[\s\S]*shortcuts\.checkingBrowser[\s\S]*readBrowserShortcutCommands\(\)[\s\S]*shortcuts\.browserFallback/,
  'Settings must render immediate defaults, loading, live browser keys, and fallback error');
assert.match(newtabJs, /function filterAppShortcuts\(\)[\s\S]*shortcutRowsForSurface\('app'\)/,
  'the searchable in-app shortcut list must use the shared localized model');
assert.match(newtabJs, /function openCheatsheet\(\)[\s\S]*renderCheatsheet\(\)/,
  'opening the shortcut dialog must rebuild its locale and browser-key projection');
assert.doesNotMatch(newtabJs, /const APP_SHORTCUTS\s*=|label:\s*'Open the command palette'|description:\s*'Open Locus popup'|\['Not set'\]|Open \$\{url\} to customize browser shortcuts/,
  'hardcoded duplicate shortcut copy must be removed from runtime builders');

const shortcutModelStart = newtabJs.indexOf('const SHORTCUT_DEFINITIONS = Object.freeze(');
const shortcutModelEnd = newtabJs.indexOf('\nfunction shortcutRow(', shortcutModelStart);
assert.ok(shortcutModelStart >= 0 && shortcutModelEnd > shortcutModelStart,
  'the shared shortcut model must remain production-extractable');
const shortcutContext = vm.createContext({ tr: key => `en:${key}` });
vm.runInContext(
  `${newtabJs.slice(shortcutModelStart, shortcutModelEnd)}\n` +
  'globalThis.__shortcutRowsForSurface = shortcutRowsForSurface;\n' +
  'globalThis.__shortcutDefinitions = SHORTCUT_DEFINITIONS;',
  shortcutContext,
);
const plain = value => JSON.parse(JSON.stringify(value));
const appShortcutRows = plain(shortcutContext.__shortcutRowsForSurface('app'));
const defaultReferenceRows = plain(shortcutContext.__shortcutRowsForSurface('cheatsheet'));
assert.equal(appShortcutRows.length, 13, 'Settings must expose all thirteen current in-app shortcuts');
assert.equal(defaultReferenceRows.length, 13, 'the compact reference must retain thirteen core shortcuts');
assert.equal(new Set(appShortcutRows.map(row => row.id)).size, appShortcutRows.length,
  'projected shortcut identities must remain unique');
assert.deepEqual(
  defaultReferenceRows.filter(row => row.commandName).map(row => row.id),
  ['save-current-tab', 'open-popup'],
  'the reference must retain both browser-managed commands in product order',
);
const customizedReferenceRows = plain(shortcutContext.__shortcutRowsForSurface('cheatsheet', [
  { name: 'save-current-tab', shortcut: 'Alt+Shift+S' },
  { name: '_execute_action', shortcut: '' },
]));
assert.deepEqual(customizedReferenceRows.find(row => row.id === 'save-current-tab').keys, ['Alt', 'Shift', 'S'],
  'custom browser keys must replace defaults without using manifest descriptions');
assert.deepEqual(customizedReferenceRows.find(row => row.id === 'open-popup').keys, ['en:shortcuts.notSet'],
  'a deliberately unassigned browser command must use localized Not set copy');
shortcutContext.tr = key => `zh:${key}`;
assert.equal(shortcutContext.__shortcutRowsForSurface('app')[0].label, 'zh:shortcuts.openPalette',
  'shortcut labels must resolve at render time so locale changes cannot retain English rows');
const mutableProjection = shortcutContext.__shortcutRowsForSurface('app');
mutableProjection[0].keys.push('changed');
assert.equal(shortcutContext.__shortcutRowsForSurface('app')[0].keys.includes('changed'), false,
  'surface projections must not mutate the immutable definition model');

assert.match(newtabHtml, /id="toast"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/,
  'the shared receipt strip must retain one atomic polite default live region');
assert.match(newtabHtml, /id="toast-close"[^>]*type="button"[^>]*data-i18n-aria-label="feedback\.dismiss"/,
  'every receipt must expose one localized native Close control');
for (const key of ['feedback.dismiss', 'feedback.updatedElsewhere', 'feedback.storageNearFull',
  'feedback.storageError', 'feedback.storageFull', 'feedback.groupArchived',
  'feedback.intentionSaved', 'feedback.intentionCleared', 'feedback.stackSelf',
  'feedback.bookmarksUnavailable', 'feedback.bookmarksImported',
  'feedback.bookmarksImportedWithSkipped', 'feedback.exported',
  'feedback.noSaveableTab',
  'history.archiveGroup', 'history.editIntention', 'history.clearIntention',
  'history.importBookmarks']) {
  assert.equal((newtabJs.match(new RegExp(`^\\s{4}'${key}'\\s*:`, 'gm')) || []).length, 2,
    `${key} must exist exactly once in English and once in zh-TW`);
}
assert.match(newtabJs, /'feedback\.exported': 'Backup download requested · Workspaces \{workspaces\} · Items \{items\}'/,
  'Export feedback must claim only that the browser download was requested');
assert.match(newtabJs, /'feedback\.exported': '已要求下載備份 · 工作區 \{workspaces\} · 項目 \{items\}'/,
  'zh-TW Export feedback must preserve the same truthful request boundary');
for (const contract of [
  /#toast\s*\{[^}]*display:\s*grid[^}]*border-left:\s*4px solid var\(--index-receipt\)[^}]*border-radius:\s*6px[^}]*background:\s*var\(--index-sheet\)[^}]*animation:\s*none/,
  /#toast\[data-tone="warning"\]\s*\{[^}]*border-left-color:\s*var\(--yellow\)/,
  /#toast\[data-tone="error"\]\s*\{[^}]*border-left-color:\s*var\(--red\)/,
  /#toast-action,\s*#toast-undo,\s*#toast-close\s*\{[^}]*min-height:\s*40px/,
  /#toast-close\s*\{[^}]*width:\s*40px/,
]) {
  assert.match(newtab, contract, `global feedback must use the durable Locus Index receipt contract: ${contract}`);
}
assert.match(newtab, /@media \(max-width:\s*520px\)[\s\S]*#toast\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) 40px/,
  'the receipt must become a bounded message-plus-close docket at 520 px');
assert.match(newtab, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*#toast\s*\{[^}]*transition:\s*none/,
  'receipt visibility must not animate when reduced motion is requested');
assert.match(newtab, /@media \(forced-colors:\s*active\)[\s\S]*#toast\s*\{[^}]*border-left-color:\s*Highlight/,
  'forced colors must preserve the receipt locator');
assert.doesNotMatch(newtab, /@keyframes\s+toastIn|#toast\s*\{[^}]*animation:\s*toastIn|#toast\.hidden\s*\{[^}]*scale\(/,
  'the shared receipt must not keep the legacy toastIn entrance');
// 2026-11 canvas (owner-approved Notifications board): receipts enter with a
// spring and morph in place, and all of it stops under reduced motion.
assert.match(newtab, /@media \(prefers-reduced-motion: reduce\) \{\s*body\[data-theme\] #toast,[\s\S]*?animation: none !important; transition: none !important;[\s\S]*?\.toast-drain \{ display: none; \}/,
  'the notification entrance, morph, and drain must stop under reduced motion');
assert.match(newtabJs, /function dismissToast\(\{ restoreFocus = false \} = \{\}\)/,
  'one dismissal owner must clear receipt timing and optionally restore focus');
assert.match(newtabJs, /const actionable\s*=\s*hasAction\s*\|\|\s*undoActionId\s*!=\s*null\s*\|\|\s*opts\.persistent\s*===\s*true/,
  'Undo and continuation receipts must be classified as actionable');
// Timing changed with the 2026-11 Notifications board: an Undo receipt drains
// over TOAST_UNDO_MS and pauses while hovered or focused (Ctrl+Z still undoes
// from history after it leaves); continuation and persistent receipts wait for
// an answer; passive feedback keeps its bounded duration.
assert.match(newtabJs, /const TOAST_UNDO_MS = 5200;/, 'Undo receipts drain over 5.2 seconds');
assert.match(newtabJs, /const waitsForAnswer = hasAction \|\| opts\.persistent === true;[\s\S]*const total = waitsForAnswer \? 0 : \(undoActionId != null \? TOAST_UNDO_MS : duration\);/,
  'only continuation and persistent receipts wait without a timer');
assert.match(newtabJs, /tone === 'error'[\s\S]*setAttribute\('role',\s*assertive \? 'alert' : 'status'\)[\s\S]*setAttribute\('aria-live',\s*assertive \? 'assertive' : 'polite'\)/,
  'errors must announce assertively without upgrading ordinary receipts');
assert.match(newtabJs, /toast-close[\s\S]*dismissToast\(\{ restoreFocus:\s*true \}\)[\s\S]*event\.key === 'Escape'/,
  'Close and focused Escape must share the same focus-restoring dismissal path');
assert.doesNotMatch(newtabJs, /toastTimer\s*=\s*setTimeout\([^\n]*opts\.duration\s*\|\|\s*3000/,
  'actionable recovery must not silently retain the legacy unconditional timer');
for (const hardcoded of [
  'Saved reminder identities', 'Updated from another Locus window',
  'Storage is ${pctNum}% full', 'Storage error: ', 'Storage full: ',
  'Group archived', 'Intention saved', 'Intention cleared',
  'Cannot nest stack in itself', 'Cannot drop a stack into itself',
  'Bookmarks API unavailable', 'Imported ${imported}',
  'No saveable tab is open in this window', 'Capture destination updated',
]) {
  assert.doesNotMatch(newtabJs, new RegExp(`toast\\([^\\n]*${hardcoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    `core feedback must not retain hardcoded runtime copy: ${hardcoded}`);
}
assert.match(newtabJs, /history\.reminderReconcileWarning'\),\s*\{ tone:\s*'warning'/,
  'accepted state with reminder uncertainty must use warning rather than error semantics');
assert.match(newtabJs, /feedback\.updatedElsewhere'\),\s*\{ tone:\s*'info'/,
  'cross-window adoption must use informational feedback semantics');
assert.match(newtabJs, /feedback\.storageNearFull'[\s\S]*tone:\s*'warning'/,
  'approaching local-storage capacity must use warning feedback semantics');

const toastControllerStart = newtabJs.indexOf('let toastTimer = null;');
const toastControllerEnd = newtabJs.indexOf('\nasync function performUndo(', toastControllerStart);
assert.ok(toastControllerStart >= 0 && toastControllerEnd > toastControllerStart,
  'the shared feedback controller must remain production-extractable');
function fakeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...tokens) { tokens.forEach(token => values.add(token)); },
    remove(...tokens) { tokens.forEach(token => values.delete(token)); },
    contains(token) { return values.has(token); },
    toggle(token, force) {
      if (force === undefined) force = !values.has(token);
      if (force) values.add(token); else values.delete(token);
      return force;
    },
  };
}
const toastElements = new Map();
const toastDocument = { activeElement: null };
function fakeElement(id, classes = []) {
  const events = new Map();
  const attributes = new Map();
  const element = {
    id,
    dataset: {},
    classList: fakeClassList(classes),
    textContent: '',
    onclick: null,
    isConnected: true,
    focusCount: 0,
    clientHeight: 0,
    scrollHeight: 0,
    scrollTop: 0,
    tabIndex: -1,
    addEventListener(type, listener) { events.set(type, listener); },
    setAttribute(name, value) {
      attributes.set(name, String(value));
      if (name === 'tabindex') element.tabIndex = Number(value);
    },
    removeAttribute(name) {
      attributes.delete(name);
      if (name === 'tabindex') element.tabIndex = -1;
    },
    getAttribute(name) { return attributes.get(name); },
    focus() { element.focusCount += 1; toastDocument.activeElement = element; },
    contains(target) { return target === element || ['toast-msg', 'toast-action', 'toast-undo', 'toast-close'].includes(target?.id); },
    events,
  };
  toastElements.set(id, element);
  return element;
}
const toastHost = fakeElement('toast', ['hidden']);
const toastMessage = fakeElement('toast-msg');
const toastAction = fakeElement('toast-action', ['hidden']);
const toastUndo = fakeElement('toast-undo', ['hidden']);
const toastClose = fakeElement('toast-close');
const toastOpener = fakeElement('receipt-opener');
toastDocument.activeElement = toastOpener;
toastDocument.getElementById = id => toastElements.get(id) || null;
let nextTimerId = 1;
const activeToastTimers = new Map();
const undoCalls = [];
const toastControllerContext = vm.createContext({
  document: toastDocument,
  State: { latestActionId: () => 91 },
  performUndo: actionId => { undoCalls.push(actionId); },
  setTimeout(callback, duration) {
    const id = nextTimerId++;
    activeToastTimers.set(id, { callback, duration });
    return id;
  },
  clearTimeout(id) { activeToastTimers.delete(id); },
  requestAnimationFrame(callback) { callback(); return 1; },
  Set,
});
vm.runInContext(
  `${newtabJs.slice(toastControllerStart, toastControllerEnd)}\n` +
  'globalThis.__toast = toast; globalThis.__dismissToast = dismissToast;',
  toastControllerContext,
);
toastControllerContext.__toast('Saved to Inbox', { undo: true, duration: 10 });
assert.equal(toastHost.dataset.actionable, 'true', 'Undo must make a receipt actionable');
assert.equal(activeToastTimers.size, 1, 'an Undo receipt drains on one timer');
assert.equal([...activeToastTimers.values()][0].duration, 5200, 'an Undo receipt ignores the requested duration and drains over 5.2 seconds');
assert.equal(toastHost.getAttribute('role'), 'status');
assert.equal(toastHost.getAttribute('aria-live'), 'polite');
assert.equal(toastUndo.classList.contains('hidden'), false);

let continuationRuns = 0;
toastControllerContext.__toast('Saved to Research', {
  actionLabel: 'Open destination',
  action: () => { continuationRuns += 1; },
  duration: 10,
});
assert.equal(activeToastTimers.size, 0, 'a continuation receipt waits for an answer, and the receipt behind it is paused');
toastAction.onclick();
assert.equal(continuationRuns, 1);
assert.equal(toastHost.classList.contains('hidden'), false, 'answering the front receipt brings the one behind it forward');
assert.equal(toastMessage.textContent, 'Saved to Inbox');
assert.equal(toastUndo.classList.contains('hidden'), false, 'the earlier Undo is still offered');
assert.equal(activeToastTimers.size, 1, 'the earlier receipt resumes its drain');
toastControllerContext.__dismissToast();
assert.equal(toastHost.classList.contains('hidden'), true);

toastDocument.activeElement = toastOpener;
toastControllerContext.__toast('Updated elsewhere', { tone: 'info', duration: 2500 });
assert.equal(toastHost.dataset.actionable, 'false');
assert.equal(activeToastTimers.size, 1, 'passive feedback may retain one bounded timer');
assert.equal([...activeToastTimers.values()][0].duration, 2500);
toastHost.events.get('focusin')();
assert.equal(activeToastTimers.size, 0, 'focus must stop passive feedback from disappearing under the user');
toastHost.events.get('focusout')({ relatedTarget: toastOpener });
assert.equal(activeToastTimers.size, 1, 'leaving the receipt resumes its time');

toastControllerContext.__toast('Storage failed', { danger: true, duration: 7000 });
assert.equal(toastHost.dataset.tone, 'error');
assert.equal(toastHost.getAttribute('role'), 'alert');
assert.equal(toastHost.getAttribute('aria-live'), 'assertive');
assert.equal(activeToastTimers.size, 1);
toastDocument.activeElement = toastClose;
toastClose.onclick();
assert.equal(toastOpener.focusCount, 1, 'Close must return focus to the connected receipt opener');
assert.equal(toastMessage.textContent, 'Updated elsewhere', 'closing the newest receipt reveals the one tucked behind');
toastControllerContext.__dismissToast();
assert.equal(toastHost.classList.contains('hidden'), true);

// At most two receipts: a third drops the oldest. An Undo result replaces the
// receipt that offered it, in place.
toastControllerContext.__toast('First', { tone: 'info' });
toastControllerContext.__toast('Second', { undo: 91 });
toastControllerContext.__toast('Third', { tone: 'info' });
toastControllerContext.__dismissToast();
assert.equal(toastMessage.textContent, 'Second', 'the second-newest receipt waits behind the newest');
toastControllerContext.__dismissToast();
assert.equal(toastHost.classList.contains('hidden'), true, 'the oldest of three was dropped');
// A receipt whose Undo is no longer the latest action (41 while history is at
// 91) is not brought forward with a dead Undo.
toastControllerContext.__toast('Archived X', { undo: 41 });
toastControllerContext.__toast('Copied', { tone: 'info' });
toastControllerContext.__dismissToast();
assert.equal(toastHost.classList.contains('hidden'), true, 'a stale Undo receipt is not promoted');
toastControllerContext.__toast('Moved 2 to today', { undo: 42 });
toastUndo.onclick();
assert.deepEqual(undoCalls, [42], 'Undo on the receipt undoes exactly its own action');
toastControllerContext.__toast('Undid move', { tone: 'info', glyph: 'undo', duration: 1600, replaceUndo: 42 });
assert.equal(toastMessage.textContent, 'Undid move');
assert.equal(toastHost.dataset.glyph, 'undo');
toastControllerContext.__dismissToast();
assert.equal(toastHost.classList.contains('hidden'), true, 'the Undo result replaced its receipt instead of stacking');
undoCalls.length = 0;

toastDocument.activeElement = toastOpener;
toastControllerContext.__toast('Review this save', { persistent: true, tone: 'warning' });
toastDocument.activeElement = toastUndo;
const escapeEvent = {
  key: 'Escape', prevented: false, stopped: false,
  preventDefault() { this.prevented = true; },
  stopPropagation() { this.stopped = true; },
};
toastHost.events.get('keydown')(escapeEvent);
assert.equal(escapeEvent.prevented, true);
assert.equal(escapeEvent.stopped, true);
assert.equal(toastHost.classList.contains('hidden'), true);
assert.equal(toastOpener.focusCount, 2, 'focused Escape must share Close focus recovery');
assert.deepEqual(undoCalls, [], 'dismissing a receipt must not invoke Undo');

assert.match(newtabHtml,
  /id="quota-overlay"[^>]*role="alertdialog"[^>]*aria-modal="true"[^>]*aria-labelledby="quota-title"[^>]*aria-describedby="quota-summary quota-detail quota-backup quota-guidance quota-status"[^>]*aria-busy="false"/,
  'quota rejection must expose one atomic, described fail-closed recovery dialog');
assert.match(newtabHtml, /class="rm-panel quota-panel"/,
  'storage-full recovery must have one dedicated Locus Index capacity docket');
for (const stableId of ['quota-overlay', 'quota-title', 'quota-x', 'quota-summary', 'quota-detail',
  'quota-backup', 'quota-guidance', 'quota-status', 'quota-meter', 'quota-meter-fill', 'quota-export',
  'quota-archive', 'quota-dismiss']) {
  assert.equal((newtabHtml.match(new RegExp(`id="${stableId}"`, 'g')) || []).length, 1,
    `quota recovery must preserve exactly one #${stableId}`);
}
for (const key of ['quota.eyebrow', 'quota.title', 'quota.close', 'quota.summary',
  'quota.usageAria', 'quota.usageLoading', 'quota.backup', 'quota.guidance', 'quota.export', 'quota.archive', 'quota.reload',
  'quota.usage', 'quota.usageUnavailable', 'quota.exporting', 'quota.exportRequested',
  'quota.exportFailed', 'quota.archiveUnavailable', 'quota.reloadFailed', 'quota.reloadDetail']) {
  assert.equal((newtabJs.match(new RegExp(`^\\s{4}'${key}'\\s*:`, 'gm')) || []).length, 2,
    `${key} must exist exactly once in English and once in zh-TW`);
}
assert.match(newtabHtml, /id="quota-export"[\s\S]*id="quota-archive"[\s\S]*id="quota-dismiss"/,
  'safe backup must lead reload and cleanup continuations in DOM and keyboard order');
const quotaHtml = newtabHtml.slice(
  newtabHtml.indexOf('<!-- Storage-quota recovery'),
  newtabHtml.indexOf('<!-- Workspace/Space names and Group moves', newtabHtml.indexOf('<!-- Storage-quota recovery')),
);
assert.doesNotMatch(quotaHtml,
  /<h2 id="quota-title">Storage full<|Your latest change couldn't be saved|Export now<|Open archive<|>Dismiss</,
  'the quota sheet must remove the English-only prototype copy and duplicate dismissal language');
assert.doesNotMatch(newtabJs, /`Using \$\{_formatBytes\(u\.used\)\}|Storage limit reached\./,
  'dynamic quota usage must resolve through localized truthful states');
assert.match(newtabJs, /releaseQuotaLowerInterlocks\(overlay\)[\s\S]*rememberOpener\(overlay\)/,
  'quota backup must clear lower-dialog inert owners before claiming focus');
assert.match(newtabJs, /const quotaOnTop = isQuotaRecoveryOpen\(\)[\s\S]*if \(quotaOnTop\) return;[\s\S]*focusStateRecoveryReload\(\)/,
  'the reload underlay must remain visible without stealing quota backup focus');
for (const contract of [
  /#quota-overlay\s*\{[^}]*z-index:\s*11100[^}]*backdrop-filter:\s*none/,
  /#quota-overlay \.quota-panel\s*\{[^}]*width:\s*min\(560px,\s*calc\(100vw - 32px\)\)[^}]*border-left:\s*6px solid var\(--red\)[^}]*border-radius:\s*6px[^}]*animation:\s*none/,
  /\.quota-meter-fill\s*\{[^}]*background:\s*var\(--red\)/,
  /#quota-export,\s*#quota-archive,\s*#quota-dismiss\s*\{[^}]*min-height:\s*44px/,
]) {
  assert.match(newtabIndex, contract, `quota recovery must use the Locus Index capacity contract: ${contract}`);
}
assert.match(newtabIndex, /@media \(max-width:\s*520px\)[\s\S]*#quota-overlay \.modal-ft\s*\{[^}]*grid-template-columns:\s*1fr/,
  'quota actions must become one readable column at 520 px');
assert.match(newtabIndex, /@media \(forced-colors:\s*active\)[\s\S]*#quota-overlay \.quota-panel\s*\{[^}]*border-left-color:\s*Highlight/,
  'forced colors must preserve the blocked-write locator');
assert.doesNotMatch(newtabIndex, /#quota-overlay\s*\{[^}]*backdrop-filter:\s*blur|#quota-overlay \.quota-panel\s*\{[^}]*animation:\s*(?:modalIn|fadeIn|popIn)/,
  'quota recovery must not restore glass blur or spring entrance residue');

// The 2026-11 popup board replaced the Locus Index popup layer. The same
// decisions hold on the new markup.
const popupIndex = section(popup, 'TOOLBAR POPUP');
const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8').replace(/\r\n/g, '\n');
assert.doesNotMatch(popupIndex, /(?:linear|radial|conic)-gradient\s*\(/,
  'the popup visual system must not use decorative gradients');
assert.match(popupIndex, /\.ph\s*\{[^}]*background:\s*var\(--pp-registry\)/,
  'popup chrome must share the ink registry header');
assert.match(popupIndex, /--pp-registry:\s*var\(--registry-bg/,
  'the popup header reads the registry ink of the theme');
assert.doesNotMatch(popupIndex, /font-family:\s*'Lora'|font:[^;]*'Lora'/,
  'popup headings must not override the user-selected font with an editorial face');
assert.match(popupIndex, /\.window-label\s*\{[^}]*font-family:\s*var\(--font-display\)/,
  '.window-label must use the shared selected-font display role');
assert.match(popupIndex, /\.sheet-title\s*\{[^}]*font:[^;]*var\(--font-brand-display\)/,
  'sheet titles use the canvas brand display face, as the new tab canvas pages do');
assert.match(popupJs, /document\.body\.dataset\.font\s*=\s*FONT_IDS\.has\(font\)\s*\?\s*font\s*:\s*'dm'/,
  'popup appearance must apply the persisted font with a safe default');
assert.ok(popupHtml.indexOf('id="hero-save"') > 0
  && popupHtml.indexOf('id="hero-save"') < popupHtml.indexOf('id="qs-all"')
  && popupHtml.indexOf('id="qs-all"') < popupHtml.indexOf('id="hib-open"'),
  'popup capture hierarchy must keep Save above Save window, and Save window before secondary Hibernate');
assert.match(popupIndex, /\.bar\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.3fr\)\s+minmax\(0,\s*1fr\)/,
  'Save window must stay wider than Hibernate');
assert.match(popupIndex, /\.hsave\s*\{[^}]*height:\s*44px[^}]*background:\s*var\(--pp-where-fill\)/,
  'popup Save must remain the dominant control: the one blue filled button at full hit height');
assert.match(popupIndex, /\.capture-result-icon\s*\{[^}]*background:\s*var\(--pp-saved\)/,
  'popup success must share the receipt marker');
assert.match(popupIndex, /--pp-saved:\s*#197654/,
  'the receipt marker is the canvas green for saved');
assert.match(popupIndex, /@media \(max-height:\s*520px\)[\s\S]*\.hero\s*\{[^}]*padding[\s\S]*\.bar\s*\{[^}]*padding/,
  'compact popup height must retain a bounded capture layout');
assert.match(popupIndex, /@media \(forced-colors:\s*active\)/,
  'popup must keep a forced-colors boundary');

console.log('Core visual-system contract tests passed');
