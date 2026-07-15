'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { throw new Error(message); };

const manifest = JSON.parse(read('manifest.json'));
if (manifest.manifest_version !== 3) fail('manifest_version must be 3');
if (manifest.host_permissions?.length) fail('Locus must not request host permissions');
for (const permission of ['storage', 'tabs', 'favicon']) {
  if (!manifest.permissions?.includes(permission)) fail(`Missing required permission: ${permission}`);
}

const extensionCsp = manifest.content_security_policy?.extension_pages || '';
if (!/connect-src\s+'none'/.test(extensionCsp)) fail("Extension CSP must include connect-src 'none'");
if (!/img-src\s+'self'\s+data:\s+blob:/.test(extensionCsp)) {
  fail("Extension CSP must restrict images to 'self', data:, and blob:");
}

const htmlFiles = ['newtab.html', 'popup.html', 'suspended.html'];
for (const file of htmlFiles) {
  const html = read(file);
  if (/<script\b(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>/i.test(html)) {
    fail(`${file} contains an inline script, which MV3 blocks`);
  }
  if (/\son[a-z]+\s*=/i.test(html)) fail(`${file} contains an inline event handler`);
  if (/<(?:img|source)\b[^>]*\bsrc\s*=\s*["']https?:/i.test(html)) {
    fail(`${file} loads a remote image`);
  }

  const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) fail(`${file} contains duplicate ids: ${duplicates.join(', ')}`);
}

const runtimeFiles = ['newtab.js', 'popup.js', 'suspended.js', 'background.js', 'import-utils.js', 'prepaint.js'];
for (const file of runtimeFiles) {
  const source = read(file);
  if (/google\.com\/s2\/favicons/i.test(source)) fail(`${file} uses a remote favicon service`);
  if (/\bonerror\s*=\s*["'`]/.test(source)) fail(`${file} emits an inline event handler`);
}

for (const file of ['newtab.js', 'popup.js']) {
  const source = read(file);
  const writes = source.match(/chrome\.storage\.local\.set\(\{\s*te\s*:/g) || [];
  if (writes.length !== 0) fail(`${file} must not write whole state outside the service worker`);
  if (!/chrome\.runtime\.sendMessage\(\{\s*type:\s*['"]locus-state-write['"]\s*,\s*state:\s*candidate\s*\}\)/.test(source)
    || !source.includes('_revision')
    || !source.includes('WriteFailureEpoch')
    || !source.includes('LOCUS_STATE_QUEUE_INVALIDATED')) {
    fail(`${file} must route whole-state writes through the revisioned service-worker protocol`);
  }
}

const background = read('background.js');
const backgroundWrites = background.match(/chrome\.storage\.local\.set\(\{\s*te\s*:/g) || [];
if (backgroundWrites.length !== 1) fail('background.js must own the only whole-state write');
if (!background.includes('locus-state-write')
  || !background.includes('STATE_LOCK_NAME')
  || !background.includes('_revision')
  || !background.includes('stateWriteQueue')
  || !/setState\(s\)[\s\S]{0,500}enqueueStateWrite/.test(background)) {
  fail('background.js must serialize revision-guarded writes through the service-worker FIFO');
}

const newtab = read('newtab.js');
if (/SANITIZE_KEEP[^\n]*['"]IMG['"]/.test(newtab)) fail('Rich text must not retain image elements');
if (/archive\.length\s*>\s*200|archive\.length\s*=\s*200/.test(newtab)) {
  fail('Archive entries must not be silently truncated');
}
const captureCommit = newtab.slice(
  newtab.indexOf('async function commitCapturedTabs('),
  newtab.indexOf('\nfunction captureResultMessage(', newtab.indexOf('async function commitCapturedTabs(')),
);
const capturePersistIndex = captureCommit.indexOf('State.persistNow()');
const captureCloseIndex = captureCommit.indexOf('chrome.tabs.remove');
if (capturePersistIndex < 0 || captureCloseIndex < capturePersistIndex) {
  fail('Captured tabs must be persisted before they are closed');
}
if (!newtab.includes('captureCommitPending')
  || !/if \(captureCommitPending\)[\s\S]{0,250}rollbackSnapshot\(actionId\)[\s\S]{0,250}return false/.test(newtab)) {
  fail('Overlapping new-tab captures must fail closed and roll back the later optimistic action');
}
if (!newtab.includes('chrome.storage.onChanged.addListener')
  || !newtab.includes('observeStoredState(stored)')
  || !newtab.includes('inFlightExpectedStateJson')
  || !newtab.includes('recoverAuthoritative(')) {
  fail('New-tab state must distinguish self write events and recover from external whole-state changes');
}
if (!/function normalizeLoadedState\(\)[\s\S]{0,700}if \(!State\.needsPersistence\(\)\) return false;[\s\S]{0,100}State\.persist\(\)/.test(newtab)
  || !/function initAfterLoad\(\)[\s\S]{0,120}normalizeLoadedState\(\)/.test(newtab)) {
  fail('Clean new-tab boots must not write or advance the state revision');
}
const observedStateHandler = newtab.slice(
  newtab.indexOf('function handleObservedStoredState(stored) {'),
  newtab.indexOf('\nfunction startStateStorageSync()', newtab.indexOf('function handleObservedStoredState(stored) {')),
);
if (!observedStateHandler.includes('showStateRecoveryRequired') || observedStateHandler.includes('restoreAuthoritativeState')) {
  fail('Dirty external state must stay behind the reload interlock and must never be auto-adopted');
}
const stateWriteRequest = newtab.slice(
  newtab.indexOf('async function requestStateWrite(candidate) {'),
  newtab.indexOf('\n  function writeState()', newtab.indexOf('async function requestStateWrite(candidate) {')),
);
if (!stateWriteRequest.includes('catch (error)') || !stateWriteRequest.includes('requireRecovery()')) {
  fail('Unknown or failed writer receipts must centrally invalidate later mutations');
}
if (!captureCommit.includes('catch (error)')
  || !captureCommit.includes('laterEditsRemain')
  || !captureCommit.includes('await restoreAuthoritativeState(')
  || !captureCommit.includes('return false')) {
  fail('Failed captures must preserve later edits or restore authoritative storage before returning with source tabs open');
}
if (!/registerClosedTabs\(actionId, tabs\)/.test(newtab) || !/async undo\([^)]*\)[\s\S]{0,4000}chrome\.tabs\.create/.test(newtab)) {
  fail('Undo must restore source tabs closed by a capture');
}
if (!newtab.includes('latestActionId()') || !newtab.includes('LOCUS_UNDO_STALE')) {
  fail('Toast Undo and closed-tab effects must be scoped to their originating action');
}
if (!newtab.includes('LOCUS_UNDO_PENDING')
  || !/commitCapturedTabs[\s\S]{0,500}beginCaptureAction\(actionId\)/.test(newtab)
  || !/registerClosedTabs\(actionId, closedTabs\)[\s\S]{0,500}finishCaptureAction\(actionId\)/.test(newtab)) {
  fail('Capture Undo must stay blocked until browser-side close effects are registered');
}
if (!newtab.includes('LOCUS_UNDO_INTERRUPTED')
  || !/snapshot\(label\)[\s\S]{0,100}mutationEpoch\+\+/.test(newtab)
  || !/async undo[\s\S]{0,1800}restoreHistoryEntry[\s\S]{0,1000}ensureUnchanged/.test(newtab)) {
  fail('Async Undo must preserve newer mutations and restore interrupted history order');
}
if (!newtab.includes('restoredTabId') || !/chrome\.tabs\.get\(tab\.restoredTabId\)/.test(newtab)) {
  fail('Closed-tab restoration retries must be idempotent');
}
if (!/visibleFocusableElements[\s\S]{0,700}getClientRects\(\)\.length/.test(newtab) || !/trapTabKey[\s\S]{0,300}visibleFocusableElements/.test(newtab)) {
  fail('Modal focus traps must ignore hidden legacy controls');
}
if (!/newestHomeItems\(items[^)]*\)[\s\S]{0,1200}buildHomePreviewRow/.test(newtab)) {
  fail('Home must show newly saved items instead of the oldest Inbox entries');
}
if (!newtab.includes('failedCloseCount') || !newtab.includes('source tab stayed open')) {
  fail('Capture copy must report partial tab-close failures truthfully');
}
if (!/sanitizeHtml\(g\.readme\s*\|\|\s*['"]['"]\)/.test(newtab)) {
  fail('Group descriptions must be sanitized before rendering');
}
if (!/seg\[2\]\s*===\s*['"]library['"]/.test(newtab) || !/type:\s*['"]library['"]/.test(newtab)) {
  fail('Library surfaces must have a durable route');
}
if (!newtab.includes('LocusImportUtils.prepareMerge') || !newtab.includes('LocusImportUtils.normalizeForReplace') || !newtab.includes('LocusImportUtils.normalizeLegacy')) {
  fail('Import paths must use the tested recovery normalizers');
}
const newtabHtml = read('newtab.html');
if (newtabHtml.indexOf('import-utils.js') < 0 || newtabHtml.indexOf('import-utils.js') > newtabHtml.indexOf('newtab.js')) {
  fail('Import recovery helpers must load before the new-tab application');
}
const popup = read('popup.js');
if (!popup.includes('recoverCaptureWriteFailure') || !popup.includes('showCaptureFailure')) {
  fail('Popup capture failures must roll back and remain visible');
}
const popupSingleCapture = popup.slice(
  popup.indexOf('async function doSave('),
  popup.indexOf('\nfunction loadHibernatePrefs', popup.indexOf('async function doSave(')),
);
const popupWindowCapture = popup.slice(
  popup.indexOf('async function saveWindow('),
  popup.indexOf('\nasync function importBookmarksFromPopup', popup.indexOf('async function saveWindow(')),
);
const popupHibernateCapture = popup.slice(
  popup.indexOf('async function hibernateSelectedScope('),
  popup.indexOf('\nasync function saveTabsBeforeHibernate', popup.indexOf('async function hibernateSelectedScope(')),
);
if (!/await persistPopupState\(\)[\s\S]*catch \(error\)[\s\S]*return false[\s\S]*chrome\.tabs\.remove/.test(popupSingleCapture)
  || !/await persistPopupState\(\)[\s\S]*catch \(error\)[\s\S]*return false[\s\S]*chrome\.tabs\.remove/.test(popupWindowCapture)) {
  fail('Popup capture paths must stop before closing tabs when their revisioned write rejects');
}
for (const [name, flow] of [
  ['single-tab save', popupSingleCapture],
  ['window hibernate', popupHibernateCapture],
  ['window save', popupWindowCapture],
]) {
  if (!/if \(!beginPopupCapture\(\)\)[\s\S]*finally \{[\s\S]*finishPopupCapture\(\)/.test(flow)) {
    fail(`Popup ${name} must hold the shared capture mutex through browser-side effects`);
  }
}
if (!background.includes('reportCaptureFailure') || !background.includes('te-capture-error-')) {
  fail('Background capture failures must remain visible and actionable');
}

const claimControlledFiles = [
  'README.md', 'RELEASE_NOTES.md', 'docs/index.html', 'manifest.json',
  'newtab.html', 'newtab.js', 'popup.html', 'popup.js', 'background.js',
];
const bannedClaims = /nothing leaves|everything stays|zero ram|zero memory|uses zero memory|almost no memory|costs almost no memory|optional encrypted sync|we never collect|100% local storage|private by design|your data is yours\. always|yours forever|import it back on any device|re-?importable anytime|restore them anytime|exports? keep working forever|ready for github pages|reminders fire,?\s*repeat|save all open tabs|save all tabs|stored only on this device|stays on this device|stay recoverable on this device|stay in extension-local storage|永遠屬於你|隱私至上|隱私優先設計|零記憶體|不占用記憶體|任何裝置|隨時可再匯入|隨時還原|永久可用|永遠不會收集|100% 本機|提醒會準時|儲存所有開啟分頁|儲存所有分頁|僅儲存在此裝置|只儲存在這台裝置/i;
for (const file of claimControlledFiles) {
  if (bannedClaims.test(read(file))) fail(`${file} contains a blocked absolute, durability, memory, or eligible-tab claim`);
}
const landing = read('docs/index.html');
const landingRobots = landing.match(/<meta\s+name=["']robots["'][^>]*>/gi) || [];
if (landingRobots.length !== 1 || !/noindex/i.test(landingRobots[0])) {
  fail('Candidate landing page must remain noindex until owner decision O-08 closes');
}
if (/<link\s+rel=["']canonical["']/i.test(landing)) {
  fail('Candidate landing page must not declare itself canonical before owner decision O-08');
}
for (const file of ['README.md', 'docs/index.html']) {
  const source = read(file);
  if (!/uninstall/i.test(source) || !/profile/i.test(source) || !/export/i.test(source)) {
    fail(`${file} must disclose export and uninstall/profile-loss limits near local-storage positioning`);
  }
}
for (const file of ['newtab.html', 'newtab.js', 'popup.html', 'popup.js']) {
  const source = read(file);
  const hasExportWarning = /export before uninstall|uninstalling[^.]{0,120}export|解除安裝[^。]{0,80}匯出/i.test(source);
  const hasProfileLossWarning = /delet(?:e|ing)[^.;]{0,80}profile|losing the profile|刪除[^。]{0,40}設定檔/i.test(source);
  if (!hasExportWarning || !hasProfileLossWarning) {
    fail(`${file} must keep export plus uninstall/profile-loss limits on active local-storage surfaces`);
  }
}
if (!/data-i18n=["']priv\.export["']>Export before uninstalling/.test(newtabHtml)
    || !/read-later-local[\s\S]{0,180}Export before uninstalling or deleting the profile/.test(newtab)
    || !/['"]about\.private['"]\s*:\s*['"][^'"\n]*export before uninstalling/.test(newtab)) {
  fail('New-tab local-storage summaries must keep their nearby export/profile-loss qualifiers');
}
if (/fonts\.(?:googleapis|gstatic)\.com/i.test(landing)) fail('Maintained landing page must not load Google Fonts');
if (/id=["']tools["']/.test(landing)) fail('Maintained landing page must keep secondary trackers out of the core promise');
for (const match of landing.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)) {
  try { new Function(match[1]); } catch (error) { fail(`docs/index.html contains invalid inline JavaScript: ${error.message}`); }
}
const demoDir = path.join(root, 'marketing', 'landing_page_demo', 'public');
for (const name of fs.readdirSync(demoDir).filter(name => name.endsWith('.html'))) {
  const source = fs.readFileSync(path.join(demoDir, name), 'utf8');
  const robots = source.match(/<meta\s+name=["']robots["'][^>]*>/gi) || [];
  if (robots.length !== 1 || !/noindex/i.test(robots[0])) fail(`${name} must have exactly one noindex robots directive`);
}

const htmlKeys = new Set();
for (const file of htmlFiles) {
  for (const match of read(file).matchAll(/\bdata-i18n(?:-[a-z-]+)?\s*=\s*["']([^"']+)["']/gi)) {
    htmlKeys.add(match[1]);
  }
}
const englishStart = newtab.search(/const I18N\s*=\s*\{\s*en\s*:/);
const chineseMatch = /\r?\n\s*'zh-TW'\s*:/.exec(newtab.slice(Math.max(0, englishStart)));
const chineseStart = chineseMatch ? englishStart + chineseMatch.index : -1;
if (englishStart < 0 || chineseStart < 0) fail('Could not locate the English i18n catalog');
const englishCatalog = newtab.slice(englishStart, chineseStart);
const missingKeys = [...htmlKeys].filter(key => !englishCatalog.includes(`'${key}':`));
if (missingKeys.length) fail(`Missing English i18n keys: ${missingKeys.join(', ')}`);
const catalogEnd = newtab.indexOf('\nfunction tr(', chineseStart);
if (catalogEnd < 0) fail('Could not locate the end of the i18n catalog');
const chineseCatalog = newtab.slice(chineseStart, catalogEnd);
const missingChineseKeys = [...htmlKeys].filter(key => !chineseCatalog.includes(`'${key}':`));
if (missingChineseKeys.length) fail(`Missing zh-TW i18n keys: ${missingChineseKeys.join(', ')}`);

console.log('Quality gates passed');
