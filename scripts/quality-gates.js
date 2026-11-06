'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { throw new Error(message); };

const manifest = JSON.parse(read('manifest.json'));
const RELEASE_PERMISSIONS = [
  'tabs',
  'storage',
  'contextMenus',
  'bookmarks',
  'alarms',
  'notifications',
  'favicon',
];
const OPTIONAL_RELEASE_PERMISSIONS = ['nativeMessaging'];

function validateManifestTrustBoundary(candidate) {
  if (candidate?.manifest_version !== 3) fail('manifest_version must be 3');
  const permissions = Array.isArray(candidate.permissions) ? candidate.permissions : [];
  const unique = new Set(permissions);
  const missing = RELEASE_PERMISSIONS.filter(permission => !unique.has(permission));
  const extra = permissions.filter(permission => !RELEASE_PERMISSIONS.includes(permission));
  const duplicates = permissions.filter((permission, index) => permissions.indexOf(permission) !== index);
  if (missing.length || extra.length || duplicates.length || permissions.length !== RELEASE_PERMISSIONS.length) {
    fail(`Manifest permissions must be exactly: ${RELEASE_PERMISSIONS.join(', ')}`);
  }
  for (const field of ['host_permissions', 'optional_host_permissions']) {
    const value = candidate[field];
    if (value != null && (!Array.isArray(value) || value.length)) {
      fail(`Locus manifest must keep ${field} absent or empty`);
    }
  }
  // The only optional API permission is the opt-in planner companion. It is
  // requested from a click in the planner, never at install, and grants no
  // host, tab-content, or network access.
  const optional = candidate.optional_permissions;
  if (optional != null) {
    const ok = Array.isArray(optional)
      && optional.length <= OPTIONAL_RELEASE_PERMISSIONS.length
      && optional.every(permission => OPTIONAL_RELEASE_PERMISSIONS.includes(permission))
      && new Set(optional).size === optional.length;
    if (!ok) fail(`Locus manifest optional_permissions may only list: ${OPTIONAL_RELEASE_PERMISSIONS.join(', ')}`);
  }
  if (permissions.includes('nativeMessaging')) fail('nativeMessaging must stay optional, never an install-time permission');
  if (candidate.content_scripts != null
    && (!Array.isArray(candidate.content_scripts) || candidate.content_scripts.length)) {
    fail('Locus must not declare automatic page content scripts');
  }
  if (Object.hasOwn(candidate, 'externally_connectable')) {
    fail('Locus must not accept messages from external websites or extensions');
  }
}

validateManifestTrustBoundary(manifest);

function requireManifestTrustRejection(label, mutate) {
  const candidate = JSON.parse(JSON.stringify(manifest));
  mutate(candidate);
  let rejected = false;
  try {
    validateManifestTrustBoundary(candidate);
  } catch {
    rejected = true;
  }
  if (!rejected) fail(`Manifest trust mutation was not rejected: ${label}`);
}

for (const [label, mutate] of [
  ['missing API permission', candidate => { candidate.permissions = candidate.permissions.filter(permission => permission !== 'favicon'); }],
  ['extra API permission', candidate => { candidate.permissions.push('scripting'); }],
  ['duplicate API permission', candidate => { candidate.permissions.push('tabs'); }],
  ['required host permission', candidate => { candidate.host_permissions = ['https://*/*']; }],
  ['optional host permission', candidate => { candidate.optional_host_permissions = ['https://*/*']; }],
  ['optional API permission', candidate => { candidate.optional_permissions = ['activeTab']; }],
  ['extra optional API permission', candidate => { candidate.optional_permissions = ['nativeMessaging', 'scripting']; }],
  ['duplicate optional API permission', candidate => { candidate.optional_permissions = ['nativeMessaging', 'nativeMessaging']; }],
  ['install-time native messaging', candidate => { candidate.permissions.push('nativeMessaging'); }],
  ['automatic content script', candidate => { candidate.content_scripts = [{ matches: ['https://*/*'], js: ['prepaint.js'] }]; }],
  ['external messaging', candidate => { candidate.externally_connectable = { matches: ['https://example.com/*'] }; }],
]) {
  requireManifestTrustRejection(label, mutate);
}

const extensionCsp = manifest.content_security_policy?.extension_pages || '';
if (!/connect-src\s+'none'/.test(extensionCsp)) fail("Extension CSP must include connect-src 'none'");
if (!/img-src\s+'self'\s+data:\s+blob:/.test(extensionCsp)) {
  fail("Extension CSP must restrict images to 'self', data:, and blob:");
}

const runtimeNetworkPatterns = [
  ['fetch()', /\bfetch\s*\(/],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/],
  ['WebSocket', /\bWebSocket\b/],
  ['EventSource', /\bEventSource\b/],
  ['navigator.sendBeacon()', /\bnavigator\s*\.\s*sendBeacon\s*\(/],
];
const htmlRemoteResourcePatterns = [
  ['script', /<script\b[^>]*\bsrc\s*=\s*["']?\s*(?:https?:)?\/\//i],
  ['linked resource', /<link\b[^>]*\bhref\s*=\s*["']?\s*(?:https?:)?\/\//i],
  ['embedded resource', /<(?:img|source|iframe|embed|audio|video|track|input)\b[^>]*\b(?:src|srcset|poster)\s*=\s*["']?\s*(?:https?:)?\/\//i],
  ['object', /<object\b[^>]*\bdata\s*=\s*["']?\s*(?:https?:)?\/\//i],
  ['SVG resource', /<(?:image|use)\b[^>]*\b(?:href|xlink:href)\s*=\s*["']?\s*(?:https?:)?\/\//i],
];

function validateExtensionNetworkSource(file, source, kind) {
  if (kind === 'runtime') {
    for (const [label, pattern] of runtimeNetworkPatterns) {
      if (pattern.test(source)) fail(`${file} uses extension-directed network API ${label}`);
    }
    return;
  }
  if (kind === 'html') {
    for (const [label, pattern] of htmlRemoteResourcePatterns) {
      if (pattern.test(source)) fail(`${file} loads a remote ${label}`);
    }
    return;
  }
  if (kind === 'css') {
    if (/@import\s+(?:url\(\s*)?["']?\s*(?:https?:)?\/\//i.test(source)) {
      fail(`${file} imports remote CSS`);
    }
    if (/url\(\s*["']?\s*(?:https?:)?\/\//i.test(source)) {
      fail(`${file} loads a remote CSS resource`);
    }
    return;
  }
  fail(`Unknown extension network source kind: ${kind}`);
}

function requireNetworkSourceRejection(label, file, source, kind) {
  let rejected = false;
  try {
    validateExtensionNetworkSource(file, source, kind);
  } catch {
    rejected = true;
  }
  if (!rejected) fail(`Extension network mutation was not rejected: ${label}`);
}

for (const [label, source] of [
  ['fetch', "fetch('https://telemetry.example/ping')"],
  ['XMLHttpRequest', 'new XMLHttpRequest()'],
  ['WebSocket', "new WebSocket('wss://telemetry.example')"],
  ['EventSource', "new EventSource('https://telemetry.example/events')"],
  ['sendBeacon', "navigator.sendBeacon('https://telemetry.example/ping')"],
]) {
  requireNetworkSourceRejection(label, 'network-probe.js', source, 'runtime');
}
for (const [label, source] of [
  ['remote script', '<script src="https://cdn.example/runtime.js"></script>'],
  ['remote stylesheet', '<link rel="stylesheet" href="//cdn.example/theme.css">'],
  ['remote embedded resource', '<iframe src="https://embed.example/"></iframe>'],
  ['remote object', '<object data="https://embed.example/file"></object>'],
  ['remote SVG resource', '<svg><use href="https://cdn.example/icons.svg#save"></use></svg>'],
]) {
  requireNetworkSourceRejection(label, 'network-probe.html', source, 'html');
}
requireNetworkSourceRejection(
  'remote CSS import',
  'network-probe.css',
  '@import url("https://cdn.example/theme.css");',
  'css',
);
requireNetworkSourceRejection(
  'remote CSS resource',
  'network-probe.css',
  '.probe { background-image: url(//cdn.example/image.png); }',
  'css',
);

const htmlFiles = ['newtab.html', 'popup.html', 'suspended.html'];
for (const file of htmlFiles) {
  const html = read(file);
  validateExtensionNetworkSource(file, html, 'html');
  validateExtensionNetworkSource(file, html, 'css');
  if (/<script\b(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>/i.test(html)) {
    fail(`${file} contains an inline script, which MV3 blocks`);
  }
  if (/\son[a-z]+\s*=/i.test(html)) fail(`${file} contains an inline event handler`);

  const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) fail(`${file} contains duplicate ids: ${duplicates.join(', ')}`);
}

const runtimeFiles = ['newtab.js', 'popup.js', 'suspended.js', 'background.js', 'import-utils.js', 'prepaint.js', 'plan-contract.js', 'planner.js', 'plan.js'];
for (const file of runtimeFiles) {
  const source = read(file);
  validateExtensionNetworkSource(file, source, 'runtime');
  if (/google\.com\/s2\/favicons/i.test(source)) fail(`${file} uses a remote favicon service`);
  if (/\bonerror\s*=\s*["'`]/.test(source)) fail(`${file} emits an inline event handler`);
}

const cssFiles = ['themes.css', 'newtab.css', 'popup.css', 'media/fonts/fonts.css'];
for (const file of cssFiles) {
  validateExtensionNetworkSource(file, read(file), 'css');
}

const newtabCss = read('newtab.css');
if (!/body\[data-theme\]\s*\{[^}]*--brand-grad:\s*linear-gradient\([^;]*var\(--accent\)[^;]*var\(--accent2\)[^;]*\)[^}]*\}/s.test(newtabCss)) {
  fail('New-tab brand gradients must resolve on the theme-bearing body so the primary Save action stays visible');
}

for (const file of ['newtab.js', 'popup.js']) {
  const source = read(file);
  const writes = source.match(/chrome\.storage\.local\.set\(\{\s*te\s*:/g) || [];
  if (writes.length !== 0) fail(`${file} must not write whole state outside the service worker`);
  const sendsStateWrite = /chrome\.runtime\.sendMessage\(\{\s*type:\s*['"]locus-state-write['"]\s*,\s*state:\s*candidate(?:\s*,[\s\S]{0,320})?\s*\}\)/.test(source);
  if (!sendsStateWrite
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
const stateWriteRequestStart = newtab.indexOf('async function requestStateWrite(candidate');
const stateWriteRequest = newtab.slice(
  stateWriteRequestStart,
  newtab.indexOf('\n  function writeState(', stateWriteRequestStart),
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
  || !captureCommit.includes('State.beginCaptureAction(actionId)')
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
  fail('Modal focus traps must ignore non-rendered controls');
}
// Home is the Today board (2026-11): it lists real to-dos from the existing
// item model instead of previewing saved pages.
if (!/function renderHome\(\)[\s\S]{0,2400}buildTodayBoard\(ws\)/.test(newtab)
  || !/function todayTaskModel\([\s\S]{0,3600}item\.type === 'todo'/.test(newtab)) {
  fail('Home must render the Today board from existing to-dos');
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
const settingsMarkup = newtabHtml.slice(
  newtabHtml.indexOf('id="settings-drawer"'),
  newtabHtml.indexOf('<!-- Paste links import -->'),
);
const settingsController = newtab.slice(
  newtab.indexOf('const SETTINGS_SECTIONS = ['),
  newtab.indexOf('// Advance to the next theme', newtab.indexOf('function openSettingsDrawer(')),
);
const settingsStableIds = [
  'settings-drawer', 'drawer-tabs', 'sp-main', 'sp-title', 'sp-sub', 'drawer-x',
  ...['general', 'appearance', 'capture', 'shortcuts', 'privacy', 'storage', 'data', 'about'].map(id => `dp-${id}`),
];
if (!/id="settings-drawer"[^>]*data-settings-layout="ledger"/.test(settingsMarkup)
  || settingsStableIds.some(id => !new RegExp(`id=["']${id}["']`).test(settingsMarkup))
  || !/\.sp-nav\s*\{[^}]*counter-reset:\s*settings-section/.test(newtabCss)
  || !/\.dt::before\s*\{[^}]*counter\(settings-section,\s*decimal-leading-zero\)/.test(newtabCss)
  || !/\.drawer-sections\s*\{[^}]*border:\s*1px solid var\(--border2\)[^}]*overflow:\s*hidden/.test(newtabCss)
  || !/\.sp-grid\s*\{[^}]*display:\s*contents/.test(newtabCss)
  || !/\.drawer-sec\s*\{[^}]*grid-template-columns:\s*minmax\(132px,\s*172px\) minmax\(0,\s*1fr\)/.test(newtabCss)
  || /\.drawer-sec\s*>\s*\.field-lbl:first-child\s*\{[^}]*grid-row:\s*1\s*\/\s*span/.test(newtabCss)
  || !/#settings-drawer \.toggle-row:has\(input:focus-visible\)\s*\{[^}]*outline:\s*2px solid var\(--accent\)/.test(newtabCss)
  || !/@media \(max-width:\s*620px\)[\s\S]{0,900}\.drawer-sec\s*\{[^}]*grid-template-columns:\s*1fr/.test(newtabCss)
  || !/@media \(prefers-reduced-motion:\s*reduce\)[\s\S]{0,500}#settings-drawer,[\s\S]{0,180}#settings-drawer \*\s*\{[^}]*animation:\s*none !important/.test(newtabCss)
  || !/@media \(forced-colors:\s*active\)[\s\S]*#settings-drawer \.drawer-sec\s*\{[^}]*border:\s*0;[^}]*border-bottom:\s*1px solid CanvasText/.test(newtabCss)
  || !settingsController.includes("activeButton?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })")
  || !/function openSettingsDrawer\(tab,\s*opener = null\)[\s\S]{0,180}focusDialogOpener\(opener\)[\s\S]{0,120}rememberOpener\(d,\s*opener\)[\s\S]{0,600}querySelector\('#drawer-tabs \.dt\.active'\)[\s\S]{0,100}active\.focus\(\)/.test(settingsController)) {
  fail('Settings must retain the indexed control-ledger hierarchy, stable IDs, visible keyboard focus, narrow collapse, and reduced-motion contract');
}
const importPresentation = newtab.slice(
  newtab.indexOf('function localizeImportDiagnosticPath('),
  newtab.indexOf('// PASTE LINKS IMPORT', newtab.indexOf('function localizeImportDiagnosticPath(')),
);
const explorerPresentation = newtab.slice(
  newtab.indexOf('function explorerCopy('),
  newtab.indexOf('// TIMELINE LAYOUT', newtab.indexOf('function explorerCopy(')),
);
if (!importPresentation.includes("name === 'categories'")
  || !importPresentation.includes("tr('import.path.space', { position })")
  || !importPresentation.includes("withPath('import.error.spaceRequired'")
  || !importPresentation.includes("localizeImportValidationError(error)")
  || !importPresentation.includes("['categories', 'import.count.spaces']")
  || !/function applyLocale\(\)[\s\S]{0,2600}paintImportPreview\(\)/.test(newtab)
  || !/throw new Error\(`\$\{wp\} must contain at least one category`\)/.test(newtab)
  || !/const cp = `\$\{wp\}\.categories\[\$\{ci\}\]`/.test(newtab)) {
  fail('Import presentation must translate internal category paths without changing the raw validator or backup schema');
}
if (!explorerPresentation.includes("spaces: tr('explorer.spaces')")
  || !explorerPresentation.includes('buildExCol(copy.spaces')
  || !explorerPresentation.includes('buildExCol(copy.groups')
  || !explorerPresentation.includes("depth === 0 ? copy.items : copy.stack")
  || /buildExCol\(['"]Categories['"]/.test(explorerPresentation)) {
  fail('Explorer must present the internal category hierarchy as localized Spaces');
}
if (!/id="cat-scroll-left"[^>]*aria-label="Scroll Spaces left"[^>]*data-i18n-aria-label="organization\.scrollSpacesLeft"/.test(newtabHtml)
  || !/id="cat-scroll-right"[^>]*aria-label="Scroll Spaces right"[^>]*data-i18n-aria-label="organization\.scrollSpacesRight"/.test(newtabHtml)
  || !/id="data-transfer-ledger"[^>]*data-i18n-aria-label="settings\.dataTransferAria"/.test(newtabHtml)
  || !(newtabHtml.indexOf('id="export-btn"') < newtabHtml.indexOf('id="import-json-btn"'))
  || !/<button id="import-json-btn"[^>]*aria-controls="import-file"[^>]*aria-describedby="data-restore-body data-file-status"/.test(newtabHtml)
  || !/<input type="file" id="import-file" accept="\.json" hidden>/.test(newtabHtml)
  || !/id="import-overlay"[^>]*aria-describedby="import-description import-status"[^>]*aria-busy="false"/.test(newtabHtml)
  || !/id="import-title"[^>]*data-i18n="import\.title"/.test(newtabHtml)
  || !/id="import-x"[^>]*data-i18n-aria-label="import\.close"/.test(newtabHtml)
  || !/name="import-mode"[^>]*value="replace"[^>]*aria-describedby="import-replace-body"[^>]*checked/.test(newtabHtml)
  || !/name="import-mode"[^>]*value="merge"[^>]*aria-describedby="import-merge-body"/.test(newtabHtml)
  || !/\.data-transfer-sheet\s*\{[^}]*grid-template-columns:\s*112px minmax\(0,\s*1fr\) auto[^}]*border-left:\s*4px solid var\(--index-locator\)/.test(newtabCss)
  || !/\.data-transfer-action\s*\{[^}]*min-height:\s*44px[^}]*border-radius:\s*3px/.test(newtabCss)
  || !/#import-overlay\s*\{[^}]*backdrop-filter:\s*none[^}]*animation:\s*none/.test(newtabCss)
  || !/#import-overlay \.import-review-panel\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto[^}]*max-height:\s*calc\(100dvh - 32px\)[^}]*border-left:\s*6px solid var\(--index-locator\)/.test(newtabCss)
  || !/#import-overlay \.import-counts\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(newtabCss)
  || /\.import-mode-opt:has\(input:checked\)\s*\{[^}]*background:\s*var\(--accent-bg\)/.test(newtabCss)
  || !/#import-overlay \.import-mode-opt:has\(input:checked\)\s*\{[^}]*border-left-color:\s*var\(--index-locator\)[^}]*background:\s*var\(--index-paper\)/.test(newtabCss)
  || !/@media \(max-width:\s*520px\)[\s\S]{0,900}#import-overlay \.import-counts\s*\{[^}]*grid-template-columns:\s*1fr/.test(newtabCss)
  || !/@media \(forced-colors:\s*active\)[\s\S]*#import-overlay \.import-review-panel,[\s\S]{0,180}\.data-transfer-sheet,[\s\S]{0,180}\.data-transfer-secondary,[\s\S]{0,80}\.data-transfer-direction\s*\{[^}]*border-color:\s*CanvasText/.test(newtabCss)) {
  fail('Data transfer must lead with backup and keep the localized JSON review flat, named, keyboard-visible, and responsive');
}
const richTextLinkController = newtab.slice(
  newtab.indexOf('function richTextEditorForNode('),
  newtab.indexOf('\n// ════════════════════════════════════════════════════════════════\n// SEARCH', newtab.indexOf('function richTextEditorForNode(')),
);
if (/\bprompt\s*\(/.test(newtab)
  || (newtab.match(/document\.execCommand\('createLink'/g) || []).length !== 1
  || !richTextLinkController.includes('function normalizeRichTextLinkUrl(')
  || !richTextLinkController.includes("parsed.protocol !== 'http:' && parsed.protocol !== 'https:'")
  || !richTextLinkController.includes('function captureRichTextLinkSelection(')
  || !richTextLinkController.includes('selection.rangeCount !== 1')
  || !richTextLinkController.includes('startEditor !== endEditor')
  || !richTextLinkController.includes('function richTextLinkContextStillMatches(')
  || !richTextLinkController.includes('editor.innerHTML !== context.html')
  || !richTextLinkController.includes('range.startContainer !== context.startContainer')
  || !richTextLinkController.includes('range.toString() === context.selectedText')) {
  fail('Rich-text Link must use the exact-selection HTTP(S)-only dialog instead of a native prompt');
}
if (!/function applyRichTextLink\(\)[\s\S]{0,1600}richTextLinkContextStillMatches\(context\)[\s\S]{0,800}document\.execCommand\('createLink', false, normalizedUrl\) === true[\s\S]{0,160}new Event\('input', \{ bubbles: true \}\)/.test(newtab)
  || !richTextLinkController.includes("setElementInertOwner(child, 'rich-text-link', enabled)")
  || !richTextLinkController.includes("setRichTextLinkError('richText.selectionChanged')")
  || !richTextLinkController.includes("setRichTextLinkError('richText.applyFailed')")
  || !/handleRichTextLinkGlobalKey\(e\)[\s\S]{0,80}handlePasteImportGlobalKey\(e\)/.test(newtab)
  || !newtab.includes('bindRichTextLinkDialog();')) {
  fail('Rich-text Link must revalidate once, remain focus-contained, and preserve editor-owned persistence');
}
for (const functionName of ['detailPrimaryEditor', 'renderGroupPage', 'buildInboxAbout', 'renderItemDetail']) {
  const start = newtab.indexOf(`function ${functionName}(`);
  const next = newtab.indexOf('\nfunction ', start + 10);
  const implementation = newtab.slice(start, next < 0 ? newtab.length : next);
  if (!implementation.includes('isRichTextLinkEditorOwned(')) {
    fail(`${functionName} must suppress blur persistence during Link-dialog focus review`);
  }
}
if (!/id="rich-text-link-overlay"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="rich-text-link-title"/.test(newtabHtml)
  || !/id="rich-text-link-input"[^>]*type="url"[^>]*aria-errormessage="rich-text-link-error"[^>]*aria-invalid="false"/.test(newtabHtml)
  || !/id="rich-text-link-error"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/.test(newtabHtml)
  || !/id="rt-toolbar"[^>]*role="toolbar"[^>]*data-i18n-aria-label="richText\.toolbar"/.test(newtabHtml)
  || !/#rt-toolbar button:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/.test(newtabCss)
  || !/@media \(prefers-reduced-motion:\s*reduce\)[\s\S]{0,300}#rich-text-link-overlay,[\s\S]{0,160}\.rich-text-link-panel\s*\{\s*animation:\s*none;\s*transition:\s*none;/.test(newtabCss)) {
  fail('Rich-text Link dialog and toolbar must retain localized modal, live-error, focus, and motion semantics');
}
const popup = read('popup.js');
const popupHtml = read('popup.html');
const popupCss = read('popup.css');
if (!popup.includes('recoverCaptureWriteFailure') || !popup.includes('showCaptureFailure')) {
  fail('Popup capture failures must roll back and remain visible');
}
const popupSingleCapture = popup.slice(
  popup.indexOf('async function doSave('),
  popup.indexOf('\nfunction loadHibernatePrefs', popup.indexOf('async function doSave(')),
);
const popupWindowCapture = popup.slice(
  popup.indexOf('async function saveWindow('),
  popup.indexOf('\nfunction buildPopupBookmarkImport', popup.indexOf('async function saveWindow(')),
);
const popupHibernateCapture = popup.slice(
  popup.indexOf('async function hibernateSelectedScope('),
  popup.indexOf('\nasync function saveTabsBeforeHibernate', popup.indexOf('async function hibernateSelectedScope(')),
);
const popupOrdinarySourceGuard = popup.slice(
  popup.indexOf('async function closeOrdinaryPopupSavedTab('),
  popup.indexOf('\nasync function doSave', popup.indexOf('async function closeOrdinaryPopupSavedTab(')),
);
if (!/await persistPopupState\([\s\S]*?\);[\s\S]*catch \(error\)[\s\S]*return false[\s\S]*await closeOrdinaryPopupSavedTab/.test(popupSingleCapture)
  || !/action: 'close'[\s\S]*type: 'locus-complete-quick-capture'[\s\S]*isValidQuickCaptureActionResult\(result, closeIntent\)/.test(popupOrdinarySourceGuard)
  || /chrome\.tabs\.(?:get|remove)/.test(popupOrdinarySourceGuard)) {
  fail('Popup single-tab capture must persist first, then delegate exact source cleanup to the serialized worker');
}
const popupQuickEntry = popup.slice(
  popup.indexOf('async function quickCapture('),
  popup.indexOf('\nfunction startCapture', popup.indexOf('async function quickCapture(')),
);
const popupQuickBranchStart = popupSingleCapture.indexOf('if (quick) {');
const popupQuickBranchEnd = popupSingleCapture.indexOf(
  '\n    const closeRequested =',
  popupQuickBranchStart,
);
const popupQuickBranch = popupSingleCapture.slice(popupQuickBranchStart, popupQuickBranchEnd);
const popupQuickPersistIndex = popupSingleCapture.indexOf('response = await persistPopupState(');
const popupQuickResultIndex = popupSingleCapture.indexOf('showQuickCaptureResult(');
if (!popupQuickEntry.includes('{ quick: true }')
  || popupQuickBranchStart < 0
  || popupQuickBranchEnd <= popupQuickBranchStart
  || popupQuickPersistIndex < 0
  || popupQuickResultIndex < popupQuickPersistIndex
  || !popupSingleCapture.includes('quickCaptureItem: quickCaptureIntent')
  || /chrome\.tabs\.(?:remove|create|update)|setTimeout|window\.close|toast\(/.test(popupQuickBranch)) {
  fail('Ask-off quick capture must receive state acceptance before a durable result and must not page-own tab effects, timers, or dismissal');
}
const popupQuickAction = popup.slice(
  popup.indexOf('async function runQuickCaptureAction('),
  popup.indexOf('\nasync function closeOrdinaryPopupSavedTab', popup.indexOf('async function runQuickCaptureAction(')),
);
if (!popupQuickAction.includes("type: 'locus-complete-quick-capture'")
  || !popupQuickAction.includes('isValidQuickCaptureActionResult(result, intent)')
  || /chrome\.tabs\.(?:remove|create|update)|setTimeout/.test(popupQuickAction)
  || !/if \(result\.effectUnknown === true\)[\s\S]{0,120}showQuickCaptureActionUnknown\(action, actionControl, result\.closeRequested\)[\s\S]{0,260}if \(result\.destinationReady\)/.test(popupQuickAction)
  || !/if \(result\.routeReady === true\)[\s\S]{0,100}if \(result\.ok\)/.test(popupQuickAction)
  || !popupQuickAction.includes('disableQuickCaptureClose()')) {
  fail('Quick-capture result actions must use strict worker receipts and keep partial close outcomes visible without a popup-owned browser effect');
}
const popupQuickWorker = background.slice(
  background.indexOf('async function performPopupQuickCaptureAction('),
  background.indexOf('\nfunction resolvePopupWindowSaveGroup', background.indexOf('async function performPopupQuickCaptureAction(')),
);
const popupQuickSourceCheck = background.slice(
  background.indexOf('async function popupQuickCaptureSourceOutcome('),
  background.indexOf('\nasync function performPopupQuickCaptureAction', background.indexOf('async function popupQuickCaptureSourceOutcome(')),
);
const quickRouteIndex = popupQuickWorker.indexOf('performPopupOpenSavedItemDestination(intent, target)');
const quickCloseIndex = popupQuickWorker.indexOf('popupQuickCaptureSourceOutcome(intent, target, routeGuard)');
const quickSourceGetIndex = popupQuickSourceCheck.indexOf('chrome.tabs.get(intent.sourceTabId)');
const quickFinalRouteCheckIndex = popupQuickSourceCheck.indexOf('confirmPopupQuickCaptureRoute(');
const quickSourceRemoveIndex = popupQuickSourceCheck.indexOf('chrome.tabs.remove(intent.sourceTabId)');
if (quickRouteIndex < 0
  || quickCloseIndex < quickRouteIndex
  || !popupQuickWorker.includes('quickCaptureItemReceipt(authoritative, intent)')
  || quickSourceGetIndex < 0
  || popupQuickSourceCheck.indexOf('source.windowId !== intent.sourceWindowId') < 0
  || popupQuickSourceCheck.indexOf('source.url !== intent.expectedUrl') < 0
  || popupQuickSourceCheck.indexOf('source.pendingUrl') < 0
  || popupQuickSourceCheck.indexOf('source.active === true') < 0
  || quickFinalRouteCheckIndex < quickSourceGetIndex
  || quickSourceRemoveIndex < quickFinalRouteCheckIndex
  || !/LOCUS_QUICK_CAPTURE_ROUTE_CHANGED'[\s\S]{0,100}LOCUS_QUICK_CAPTURE_ROUTE_UNCONFIRMED'[\s\S]{0,320}routeReady: false[\s\S]{0,100}sourceOutcome: 'not-attempted'/.test(popupQuickWorker)) {
  fail('Quick-capture actions must secure recovery before close and recheck exact item, source-window, active-state, current URL, and pending URL identity');
}
const popupQuickRouteConfirmation = background.slice(
  background.indexOf('function popupQuickCaptureRouteMatches('),
  background.indexOf('\nasync function popupQuickCaptureSourceOutcome', background.indexOf('function popupQuickCaptureRouteMatches(')),
);
if (!/pendingUrl === 'string' && tab\.pendingUrl !== routeUrl\) return false/.test(popupQuickRouteConfirmation)
  || !/activatePopupLocateTab\(routeTab\.id\)[\s\S]{0,900}confirmPopupQuickCaptureRoute\(routeTab\.id, routeUrl\)/.test(popupQuickRouteConfirmation)
  || !/confirmPopupQuickCaptureRoute\([\s\S]{0,180}chrome\.tabs\.get\(routeTabId\)/.test(popupQuickRouteConfirmation)) {
  fail('Quick-capture Open must fresh-read and exactly revalidate its activated route before source handling');
}
const popupStateHandler = background.slice(
  background.indexOf('async function handleStateWriteMessage('),
  background.indexOf('\nchrome.runtime.onMessage.addListener', background.indexOf('async function handleStateWriteMessage(')),
);
const popupLocateSave = popup.slice(
  popup.indexOf('function popupLocateExpectedRouteUrl('),
  popup.indexOf('\nfunction loadHibernatePrefs', popup.indexOf('function popupLocateExpectedRouteUrl(')),
);
const popupLocateListener = background.slice(
  background.indexOf("if (message?.type === 'locus-complete-popup-locate') {"),
  background.indexOf("\n  if (message?.type === 'locus-complete-window-save')", background.indexOf("if (message?.type === 'locus-complete-popup-locate') {")),
);
const popupLocatePersistIndex = popupLocateSave.indexOf('response = await persistPopupState(');
const popupLocateEffectIndex = popupLocateSave.indexOf("type: 'locus-complete-popup-locate'");
if (popup.includes('locateSavedItem')
  || popupStateHandler.includes('locateSavedItem')
  || popupStateHandler.includes('performPopupLocateSavedItem')
  || popupLocatePersistIndex < 0
  || popupLocateEffectIndex < popupLocatePersistIndex
  || !popupLocateListener.includes('enqueueStateWrite(() => performPopupLocateSavedItem(message))')
  || !popupLocateListener.includes('sendResponse(unknownPopupLocateEffectResult(message))')
  || !/function unknownPopupLocateEffectResult\([\s\S]{0,260}LOCUS_LOCATE_EFFECT_UNKNOWN[\s\S]{0,180}effectUnknown: true/.test(popupLocateSave)
  || !/function popupLocateExpectedRouteUrl\([\s\S]{0,360}encodeURIComponent\(intent\.workspaceId\)[\s\S]{0,160}encodeURIComponent\(intent\.itemId\)/.test(popupLocateSave)
  || !/result\.routeUrl !== expectedRouteUrl/.test(popupLocateSave)
  || !/result\.routeWindowId !== intent\?\.sourceWindowId/.test(popupLocateSave)
  || !/\['LOCUS_LOCATE_ACTIVATE_FAILED', 'LOCUS_LOCATE_SOURCE_CLOSE_FAILED'\]\.includes\(result\.code\)/.test(popupLocateSave)
  || !/sourceClosePartial[\s\S]{0,420}result\.sourceClosed !== false[\s\S]{0,100}result\.sourceCloseFailed !== true[\s\S]{0,180}typeof result\.noticeShown !== 'boolean'[\s\S]{0,180}isValidPopupLocateDestination\(result\.destination, intent\)/.test(popupLocateSave)
  || !/result\.sourceClosed === true[\s\S]{0,100}result\.sourceCloseFailed !== true/.test(popupLocateSave)
  || !/result\?\.effectUnknown === true[\s\S]{0,100}quickCaptureOpenUnknown/.test(popup)) {
  fail('Popup Locate must dispatch browser effects only after a known state receipt and report a lost effect receipt as non-authoritative unknown');
}
if (!/chrome\.tabs\.get\(recovery\.routeTabId\)[\s\S]{0,420}popupLocateRecoveryRouteMatches\(current, recovery, \{ requireActive: false \}\)[\s\S]{0,420}chrome\.tabs\.update\(recovery\.routeTabId, \{ active: true \}\)/.test(popup)
  || !/popupLocateRecoveryRouteMatches\(activated, recovery\)[\s\S]{0,260}chrome\.windows\.update\(recovery\.routeWindowId, \{ focused: true \}\)[\s\S]{0,260}chrome\.tabs\.get\(recovery\.routeTabId\)[\s\S]{0,220}popupLocateRecoveryRouteMatches\(focused, recovery\)/.test(popup)
  || !/parsePopupLocateNotificationId\(notifId\)[\s\S]{0,900}chrome\.tabs\.get\(parsed\.routeTabId\)[\s\S]{0,700}popupLocateNoticeRouteMatches\(current, parsed, localNewTabUrl, \{ requireActive: false \}\)[\s\S]{0,700}activatePopupLocateTab\(parsed\.routeTabId\)[\s\S]{0,700}chrome\.tabs\.get\(parsed\.routeTabId\)[\s\S]{0,500}popupLocateNoticeRouteMatches\(focused, parsed, localNewTabUrl\)/.test(background)
  || !/function popupLocateNoticeRouteMatches\([\s\S]{0,300}requireActive[\s\S]{0,300}typeof parsed\.routeUrl === 'string'[\s\S]{0,220}tab\.url === parsed\.routeUrl/.test(background)) {
  fail('Popup Locate retries must fresh-check exact local tab, window, current URL, and pending URL identity before activation');
}
if (popupStateHandler.indexOf('const revision = await setState(message.state)') < 0
  || popupStateHandler.indexOf('response.quickCaptureResult = quickCaptureItemReceipt(message.state, message.quickCaptureItem)')
    < popupStateHandler.indexOf('const revision = await setState(message.state)')
  || popupStateHandler.includes('performPopupQuickCaptureAction')
  || !background.includes("message?.type === 'locus-complete-quick-capture'")
  || !background.includes('enqueueStateWrite(() => performPopupQuickCaptureAction(message))')) {
  fail('Quick-capture receipt generation and worker-owned completion must remain separate, ordered phases under the central state queue');
}
const popupQuickListener = background.slice(
  background.indexOf("if (message?.type === 'locus-complete-quick-capture') {"),
  background.indexOf("\n  if (message?.type === 'locus-open-window-save-destination')", background.indexOf("if (message?.type === 'locus-complete-quick-capture') {")),
);
if (!popupQuickListener.includes('sendResponse(unknownPopupQuickCaptureActionResult(message))')
  || popupQuickListener.includes('failedPopupQuickCaptureActionResult')
  || !/function unknownPopupQuickCaptureActionResult\([\s\S]{0,400}code: 'LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN'[\s\S]{0,160}effectUnknown: true[\s\S]{0,160}sourceOutcome: 'unconfirmed'/.test(background)
  || !/if \(result\.effectUnknown === true\)[\s\S]{0,500}LOCUS_QUICK_CAPTURE_ACTION_UNKNOWN[\s\S]{0,500}sourceOutcome === 'unconfirmed'/.test(popup)
  || !/function showQuickCaptureActionUnknown\(action, actionControl, closeRequested\)[\s\S]{0,220}tr\('quickCaptureOpenUnknown', destination, closeRequested\)/.test(popup)
  || !/catch \(error\)[\s\S]{0,260}showQuickCaptureActionUnknown\(action, actionControl, intent\.closeSource === true\)/.test(popupQuickAction)) {
  fail('Unexpected quick-capture action failures must stay typed as non-authoritative unknown and preserve safe popup recovery');
}
if (!/id="stg-locate-result"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/.test(popupHtml)
  || !/id="stg-open-locus"[^>]*aria-describedby="save-context save-tab-title stg-locate-result-message"/.test(popupHtml)
  || !/id="stg-done"[^>]*data-pop-aria="closePopup"[^>]*aria-label="Close popup"/.test(popupHtml)
  || !/function showQuickCaptureResult\([\s\S]{0,1600}showSection\('save-to-section'\)[\s\S]{0,180}stg-open-locus'\)\.focus\(\)/.test(popup)
  || !/height:\s*min\(var\(--popup-height\),\s*100dvh\)/.test(popupCss)
  || !/@media \(max-height:\s*520px\)[\s\S]{0,260}\.capture-result\s*\{[^}]*min-height:\s*0/.test(popupCss)) {
  fail('Quick-capture continuation must preserve its live semantics, primary focus, localized Close name, and short-height layout');
}
const popupWindowPersistIndex = popupWindowCapture.indexOf('await persistPopupState()');
const popupWindowEffectIndex = popupWindowCapture.indexOf("type: 'locus-complete-window-save'");
const popupWindowResultIndex = popupWindowCapture.indexOf('showWindowSaveResult(');
if (popupWindowPersistIndex < 0
  || popupWindowEffectIndex < popupWindowPersistIndex
  || popupWindowResultIndex < popupWindowEffectIndex
  || popupWindowCapture.includes('chrome.tabs.remove')) {
  fail('Popup window capture must receive state acceptance before dispatching worker-owned source closes and rendering their typed result');
}
const popupWindowWorker = background.slice(
  background.indexOf('async function performPopupWindowSaveEffect('),
  background.indexOf('\nasync function performPopupOpenWindowSaveDestination', background.indexOf('async function performPopupWindowSaveEffect(')),
);
if (popupWindowWorker.indexOf('chrome.tabs.get(tabId)') < 0
  || popupWindowWorker.indexOf('popupWindowSaveGroupUrls(target.group)') < 0
  || popupWindowWorker.indexOf('recoverableUrls.has(expectedUrl)') < 0
  || popupWindowWorker.indexOf('recoverableUrls.has(expectedUrl)') > popupWindowWorker.indexOf('chrome.tabs.get(tabId)')
  || popupWindowWorker.indexOf('tab.active === true') < popupWindowWorker.indexOf('chrome.tabs.get(tabId)')
  || popupWindowWorker.indexOf('tab.url !== expectedUrl') < popupWindowWorker.indexOf('tab.active === true')
  || popupWindowWorker.indexOf('tab.pendingUrl') < popupWindowWorker.indexOf('tab.url !== expectedUrl')
  || popupWindowWorker.indexOf('chrome.tabs.remove(tabId)') < popupWindowWorker.indexOf('tab.active === true')) {
  fail('Popup window-save effects must confirm recoverable content, source-window, inactive, and unchanged-URL identity before closing each tab');
}
const popupWindowDestination = background.slice(
  background.indexOf('async function performPopupOpenWindowSaveDestination('),
  background.indexOf('\nconst POPUP_LOCATE_NOTICE', background.indexOf('async function performPopupOpenWindowSaveDestination(')),
);
if (!popupWindowDestination.includes('buildPopupWindowSaveHash')
  || !popupWindowDestination.includes('activatedRoute?.url !== routeUrl')
  || !popupWindowDestination.includes('activatedRoute?.pendingUrl !== routeUrl')
  || !popupWindowDestination.includes('LOCUS_WINDOW_DESTINATION_ROUTE_CHANGED')) {
  fail('Popup window destination activation must revalidate the exact encoded Group route');
}
if (!background.includes("message?.type === 'locus-complete-window-save'")
  || !background.includes('enqueueStateWrite(() => performPopupWindowSaveEffect(message))')) {
  fail('Popup window-save source closes must remain worker-owned and serialized with state writes after state acceptance');
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
if (!/data-i18n=["']settings\.privacyFirstBody["']>Workspace data is stored in this browser profile; export before uninstalling or deleting it\./.test(newtabHtml)
    || !/data-i18n=["']settings\.storageHint["']>The ruler shows Chrome's exact local-storage total for Locus in this browser profile\./.test(newtabHtml)
    || !/data-i18n=["']settings\.storagePersistenceHint["']>Download a backup before uninstalling the extension or deleting this browser profile;/.test(newtabHtml)
    || !/["']settings\.privacyFirstBody["']\s*:\s*["']Workspace data is stored in this browser profile; export before uninstalling or deleting it\./.test(newtab)
    || !/["']settings\.storagePersistenceHint["']\s*:\s*["']Download a backup before uninstalling the extension or deleting this browser profile;/.test(newtab)
    || !/['"]library\.localStorage['"]\s*:\s*['"]Stored in this browser profile\. Export before uninstalling or deleting the profile\./.test(newtab)
    || !/library-local-note[\s\S]{0,180}tr\(['"]library\.localStorage['"]\)/.test(newtab)
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
