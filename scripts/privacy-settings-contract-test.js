const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');
const backgroundSource = fs.readFileSync(path.join(root, 'background.js'), 'utf8').replace(/\r\n/g, '\n');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

function extractBetween(startMarker, endMarker, input = source) {
  const start = input.indexOf(startMarker);
  const end = input.indexOf(endMarker, start);
  assert.ok(start >= 0, `${startMarker} must remain extractable`);
  assert.ok(end > start, `${endMarker} must follow ${startMarker}`);
  return input.slice(start, end);
}

function countId(id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (html.match(new RegExp(`\\bid=["']${escaped}["']`, 'g')) || []).length;
}

const privacyHtml = extractBetween('<!-- ── Privacy ── -->', '<!-- ── Storage ── -->', html);
// Privacy & data is drawn by the Settings page layer (2026-11 canvas board).
const privacyCss = extractBetween('   SETTINGS PAGE (2026-11 canvas)', '\n/* ----', css);
const dataHtml = extractBetween('<!-- ── Import & Export ── -->', '<!-- ── About ── -->', html);
const privacyPrimitivesSource = extractBetween(
  'const PRIVACY_SETTING_KEYS',
  '\nfunction settingsPreferencePendingTransaction',
);
const privacyControllerSource = extractBetween(
  'function renderPrivacySettings()',
  '\n// SETTINGS PAGE',
);

for (const id of [
  'dp-privacy',
  'privacy-contract',
  'privacy-contract-title',
  'privacy-screen-plugin',
  'privacy-plugin-state',
  'privacy-mask-heading',
  'tog-blur',
  'privacy-status',
]) {
  assert.equal(countId(id), 1, `Privacy must preserve exactly one #${id}`);
}

assert.match(privacyHtml,
  /id="privacy-contract"[^>]*aria-labelledby="privacy-contract-title"[^>]*aria-describedby="privacy-status"[^>]*aria-busy="false"/,
  'Privacy must expose one named, described, busy-capable boundary');
assert.equal((privacyHtml.match(/class="privacy-fact(?: recovery)?" role="listitem"/g) || []).length, 4,
  'Privacy must lead with exactly four storage, network, access, and recovery facts');
assert.match(privacyHtml,
  /settings\.privacyStorageLabel[\s\S]*settings\.privacyStorageValue[\s\S]*settings\.privacyNetworkLabel[\s\S]*settings\.privacyNetworkValue[\s\S]*settings\.privacyAccessLabel[\s\S]*settings\.privacyAccessValue[\s\S]*settings\.privacyRecoveryLabel[\s\S]*settings\.privacyRecoveryValue/,
  'the fact ledger must keep the exact local-data sequence');
// Privacy & data shows the facts, Storage and Backup as one section (the
// board), so the backup action and the restore path sit in the same view and
// the old duplicate Download / Review restore pair under the facts is gone.
assert.ok(/\{ id: 'privacy',\s+title: 'settings\.privacyData',\s+sub: 'settings\.privacySub', panes: \['privacy', 'storage', 'data'\] \}/.test(source),
  'Privacy & data must show the facts, Storage and Backup panes together');
assert.equal(countId('privacy-export-btn') + countId('privacy-goto-data') + countId('privacy-export-limit'), 0,
  'the duplicate backup pair under the facts must be gone');
assert.match(dataHtml,
  /<button id="export-btn" class="stg-btn stg-btn-b stg-export"[^>]*type="button"[^>]*aria-describedby="data-backup-body data-export-hint"[\s\S]*id="import-json-btn"/,
  'backup must be the primary native action, with the download limit and restore path named');
assert.match(privacyHtml,
  /<details id="privacy-screen-plugin"[\s\S]*settings\.screenMaskPlugin[\s\S]*id="privacy-plugin-state"[^>]*data-state="available"[\s\S]*id="tog-blur"[^>]*data-settings-preference-control[^>]*aria-describedby="privacy-mask-hint privacy-mask-toggle-hint"/,
  'the screen-share mask must stay inside one available, named local plugin');
assert.match(privacyHtml,
  /settings\.screenMaskHint">[^<]*(?:does not encrypt|不會加密)[^<]*</,
  'the plugin must distinguish display masking from stored-data security');
assert.match(privacyHtml,
  /id="privacy-status"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"[^>]*data-state="idle"/,
  'Privacy must expose one atomic persistence receipt');
assert.doesNotMatch(privacyHtml,
  /sp-privacy-hero|sp-privacy-shield|sp-privacy-checks|Privacy &amp; Security|Privacy & Security|Privacy blur mode|No tracking or analytics|style="|<svg/,
  'Privacy must remove the promotional shield/checklist, vague security title, old blur language, inline style, and ornamental icons');

assert.equal(manifest.host_permissions, undefined,
  'the exact zero-host-permission fact must remain true in the manifest');
assert.deepEqual([...manifest.permissions].sort(),
  ['alarms', 'bookmarks', 'contextMenus', 'favicon', 'notifications', 'storage', 'tabs'].sort(),
  'the browser-access fact must track the current explicit extension capabilities');
assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/,
  'the no-backend-connection fact must remain grounded in the release extension-page CSP');

for (const key of [
  'settings.privacyData',
  'settings.privacySub',
  'settings.privacyContractTitle',
  'settings.privacyFactsAria',
  'settings.privacyStorageLabel',
  'settings.privacyStorageValue',
  'settings.privacyStorageBody',
  'settings.privacyNetworkLabel',
  'settings.privacyNetworkValue',
  'settings.privacyNetworkBody',
  'settings.privacyAccessLabel',
  'settings.privacyAccessValue',
  'settings.privacyAccessBody',
  'settings.privacyRecoveryLabel',
  'settings.privacyRecoveryValue',
  'settings.privacyRecoveryBody',
  'settings.screenMaskPlugin',
  'settings.screenMaskPluginHint',
  'settings.screenMaskAvailable',
  'settings.screenMaskActive',
  'settings.screenMask',
  'settings.screenMaskHint',
  'settings.screenMaskToggle',
  'settings.screenMaskToggleHint',
  'settings.privacyIdle',
  'settings.privacySaving',
  'settings.privacySaved',
  'settings.privacyFailed',
]) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.equal((source.match(new RegExp(`^\\s{4}'${escaped}':`, 'gm')) || []).length, 2,
    `${key} must exist exactly once in English and once in native zh-TW`);
}
assert.ok(source.includes("'settings.privacyData': '隱私與資料'"),
  'zh-TW must avoid claiming a broader Security surface');
assert.ok(source.includes("'settings.privacyAccessValue': '零項網站存取權限'"),
  'zh-TW must name host permissions in user-facing Taiwanese browser language');
assert.ok(source.includes("'settings.screenMaskPlugin': '螢幕分享遮罩外掛'"),
  'zh-TW must use the established local 外掛 terminology');

assert.match(privacyPrimitivesSource,
  /const PRIVACY_SETTING_KEYS = new Set\(\['blurPrivacy'\]\)[\s\S]*Object\.freeze\(\{ blurPrivacy: false \}\)/,
  'Privacy must allowlist the one compatible setting and retain its historical false default');
assert.match(privacyPrimitivesSource,
  /function privacySettingsPatchIsValid[\s\S]*entries\.length === 1[\s\S]*PRIVACY_SETTING_KEYS\.has[\s\S]*typeof entries\[0\]\[1\] === 'boolean'/,
  'Privacy must accept only one exact boolean patch');
assert.match(privacyPrimitivesSource,
  /function privacyScreenPluginIsActive[\s\S]*privacySettingValue\(settings, 'blurPrivacy'\) === true/,
  'the plugin Active state must derive from real compatible product state');
assert.match(privacyControllerSource,
  /function renderPrivacySettings[\s\S]*control\.checked = active[\s\S]*plugin\.open = active[\s\S]*plugin\.dataset\.locked[\s\S]*settings\.screenMaskActive[\s\S]*paintSettingsPreferenceBusy/,
  'rendering must reconcile the toggle, legacy active state, disclosure, receipt, and Settings interlock');
assert.match(privacyControllerSource,
  /async function commitPrivacySettingsChange[\s\S]*State\.isRecoveryRequired[\s\S]*privacySettingsPending = transaction[\s\S]*applySettings\(\)[\s\S]*await State\.persistNow\(\)[\s\S]*State\.get\(\) !== state[\s\S]*State\.get\(\)\.settings !== settings[\s\S]*privacySettingsPatchFingerprint\(settings, keys\) !== expected[\s\S]*settings\.privacySaved/,
  'one controller must project, await one receipt, and reject state, owner, or touched-value drift before success');
assert.equal((privacyControllerSource.match(/State\.persistNow\(\)/g) || []).length, 1,
  'Privacy must expose exactly one acknowledged persistence boundary');
assert.doesNotMatch(privacyControllerSource,
  /State\.persist\(\)|toast\(|fetch\(|chrome\.runtime\.sendMessage|pluginEnabled|marketplace/,
  'Privacy must not retain a fire-and-forget write or invent network/plugin state');
assert.match(source,
  /function settingsPreferencePendingTransaction\(\)[\s\S]*generalSettingsPending \|\| captureSettingsPending \|\| appearanceSettingsPending \|\| privacySettingsPending[\s\S]*function settingsPreferenceBlocksDismissal\(\)[\s\S]*privacySettingsBlocksDismissal/,
  'Privacy must join the one Settings-level pending owner and dismissal interlock');
assert.match(source,
  /function paintSettingsPreferenceBusy\(\)[\s\S]*privacy-contract[\s\S]*pending\?\.kind === 'privacy'[\s\S]*control\.disabled = busy && control\.id !== ownerId/,
  'pending Privacy persistence must mark its boundary busy and disable every other tracked control');
assert.match(source,
  /privacy: \(\) => renderPrivacySettings\(\)[\s\S]*function applySettings[\s\S]*renderPrivacySettings\(\)/,
  'section entry, locale changes, and state reconciliation must render real Privacy state');
assert.match(source,
  /document\.getElementById\('tog-blur'\)\.onchange = e => \{[\s\S]*commitPrivacySettingsChange\(e\.target\.id, \{ blurPrivacy: !!e\.target\.checked \}\)/,
  'the retained toggle must use only the acknowledged Privacy controller');
assert.match(source,
  /const privacyPluginSummary[\s\S]*isPrivacySettingsPending\(\)[\s\S]*preventDefault\(\)[\s\S]*focusPrivacySettingsPendingControl\(\)/,
  'the plugin disclosure must not close over its pending owner');
assert.match(source,
  /const _closeDrawer = \(\) => \{[\s\S]*settingsPreferenceBlocksDismissal\(\)[\s\S]*focusSettingsPreferencePendingControl\(\)[\s\S]*return false/,
  'pending Privacy must block pointer dismissal and restore owner focus');
assert.match(source,
  /if \(settingsPreferenceBlocksDismissal\(\)\)[\s\S]*e\.key !== 'Tab'[\s\S]*stopImmediatePropagation\(\)[\s\S]*focusSettingsPreferencePendingControl\(\)/,
  'pending Privacy must retain Settings Tab trapping while owning Escape and lower shortcuts');

for (const contract of [
  /\.stg-facts \{[^}]*display: grid;[^}]*grid-template-columns: repeat\(auto-fit, minmax\(170px, 1fr\)\)/,
  /\.stg-facts \.privacy-fact \{[^}]*border-radius: 16px;[^}]*background: var\(--today-now\);[^}]*color: var\(--today-now-text\)/,
  /\.stg-disc > summary\[aria-disabled="true"\],\n\.stg-disc\[data-locked="true"\] > summary \{ cursor: wait; \}/,
]) {
  assert.match(privacyCss, contract, `Privacy must use the Settings page layer: ${contract}`);
}
assert.doesNotMatch(privacyCss,
  /(?:linear|radial|conic)-gradient\s*\(|backdrop-filter/,
  'Privacy must not use decorative gradients or glass blur');
assert.match(privacyCss,
  /@container \(max-width: 640px\) \{[\s\S]*\.stg-facts \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); gap: 8px; \}/,
  'the four facts must fold into two columns at phone width');
assert.match(privacyCss,
  /#settings-drawer :is\([^)]*\.stg-disc > summary\):focus-visible \{\n  outline: 2px solid var\(--index-focus, var\(--accent\)\);/,
  'the native plugin disclosure must have a visible keyboard focus indicator');
assert.match(privacyCss,
  /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*#settings-drawer \*[\s\S]*transition:\s*none !important/,
  'Privacy must inherit the Settings reduced-motion boundary');
assert.match(privacyCss,
  /@media \(forced-colors:\s*active\)[\s\S]*\.stg-facts \.privacy-fact \{ border: 1px solid CanvasText; background: Canvas; color: CanvasText; \}/,
  'forced colors must preserve the fact ledger boundaries');
assert.match(css,
  /body\.blur-privacy \.item-title,[\s\S]*body\.blur-privacy \.library-title,\s*body\.blur-privacy \.library-url,\s*body\.blur-privacy \.library-destination,[\s\S]*filter:\s*blur\(6px\)/,
  'the optional mask must cover saved titles and recovery locations (the Library row’s title, source and full destination)');
assert.match(backgroundSource,
  /function captureReceiptPath\(result, copy\)[\s\S]*result\?\.blurPrivacy === true[\s\S]*return copy\.destinationHidden/,
  'the optional mask copy must remain grounded in hidden capture-notification destinations');
assert.doesNotMatch(css,
  /body\.blur-privacy[^\n]*:hover|body\.blur-privacy[\s\S]{0,520}transition:\s*filter/,
  'masked content must not reveal on hover or use ornamental blur motion');

function initialSettings(overrides = {}) {
  return { blurPrivacy: false, ...overrides };
}

function buildHarness(overrides = {}) {
  let currentState = { settings: initialSettings(overrides) };
  let recoveryRequired = false;
  let persistNow = async () => ({ ok: true });
  const calls = { persists: 0, applies: 0, renders: 0, focuses: 0, recoveries: 0, requires: 0 };
  const control = {
    id: 'tog-blur',
    dataset: { settingsPreferenceControl: 'true' },
    focus() { calls.focuses += 1; document.activeElement = control; },
  };
  const document = {
    activeElement: null,
    getElementById(id) { return id === control.id ? control : null; },
  };
  const context = vm.createContext({
    document,
    tr: key => `en:${key}`,
    paintSettingsPreferenceBusy: () => {},
    applySettings: () => { calls.applies += 1; calls.renders += 1; },
    showStateRecoveryRequired: () => { calls.recoveries += 1; },
    State: {
      get: () => currentState,
      isRecoveryRequired: () => recoveryRequired,
      requireRecovery: () => { calls.requires += 1; recoveryRequired = true; },
      persistNow: () => { calls.persists += 1; return persistNow(); },
    },
  });
  vm.runInContext(
    `${privacyPrimitivesSource}\n` +
    'function settingsPreferencePendingTransaction() { return privacySettingsPending; }\n' +
    'function focusSettingsPreferencePendingControl() { return focusPrivacySettingsPendingControl(); }\n' +
    `${privacyControllerSource}\n` +
    'renderPrivacySettings = () => { globalThis.__calls.renders += 1; return null; };\n' +
    'globalThis.__privacy = {\n' +
    '  commit: commitPrivacySettingsChange,\n' +
    '  pending: () => privacySettingsPending,\n' +
    '  status: () => ({ ...privacySettingsStatus }),\n' +
    '  active: privacyScreenPluginIsActive,\n' +
    '};',
    Object.assign(context, { __calls: calls }),
  );
  return {
    api: context.__privacy,
    calls,
    control,
    state: () => currentState,
    setState: next => { currentState = next; },
    setRecovery: next => { recoveryRequired = next; },
    setPersistNow: next => { persistNow = next; },
  };
}

async function run() {
  let releaseReceipt;
  const pending = buildHarness();
  pending.setPersistNow(() => new Promise(resolve => { releaseReceipt = resolve; }));
  const runPending = pending.api.commit('tog-blur', { blurPrivacy: true });
  assert.equal(pending.state().settings.blurPrivacy, true,
    'a valid mask choice must project immediately before requesting its receipt');
  assert.equal(pending.calls.persists, 1,
    'one mask change must request exactly one persisted receipt');
  assert.equal(pending.calls.applies, 1,
    'the mask must project immediately through the real settings boundary');
  assert.equal(pending.api.pending().controlId, 'tog-blur',
    'the initiating toggle must own the pending transaction');
  assert.deepEqual({ ...pending.api.status() },
    { key: 'settings.privacySaving', state: 'pending' },
    'pending persistence must expose the localized saving state');
  assert.equal(await pending.api.commit('tog-blur', { blurPrivacy: false }), false,
    'a second mask change must be refused while the first receipt is pending');
  assert.equal(pending.calls.persists, 1,
    'duplicate activation must not enqueue another whole-graph write');
  assert.equal(pending.calls.focuses, 1,
    'duplicate activation must return focus to the owning toggle');
  releaseReceipt({ ok: true });
  assert.equal(await runPending, true,
    'an exact acknowledged mask change must complete');
  assert.equal(pending.api.pending(), null,
    'acknowledgement must release the Privacy interlock');
  assert.deepEqual({ ...pending.api.status() },
    { key: 'settings.privacySaved', state: 'success' },
    'only acknowledgement may expose the saved receipt');
  assert.equal(pending.calls.focuses, 1,
    'completion must not move focus away from the owning toggle');

  const noOp = buildHarness();
  assert.equal(await noOp.api.commit('tog-blur', { blurPrivacy: false }), true,
    'an unchanged mask choice remains a successful no-op');
  assert.equal(noOp.calls.persists, 0,
    'an unchanged mask choice must not create an empty revision');
  assert.equal(await noOp.api.commit('missing-control', { blurPrivacy: true }), false,
    'an unknown opener must not mutate Privacy');
  assert.equal(await noOp.api.commit('tog-blur', { unsafe: true }), false,
    'an unknown setting key must not cross the Privacy boundary');
  assert.equal(await noOp.api.commit('tog-blur', { blurPrivacy: 'yes' }), false,
    'a non-boolean mask value must stop before mutation');
  assert.equal(noOp.calls.persists, 0,
    'invalid Privacy input must stop before persistence');
  assert.equal(noOp.state().settings.blurPrivacy, false,
    'invalid input must leave the real setting untouched');

  const unnamed = buildHarness();
  delete unnamed.control.dataset.settingsPreferenceControl;
  assert.equal(await unnamed.api.commit('tog-blur', { blurPrivacy: true }), false,
    'a control outside the tracked Settings boundary must not mutate Privacy');
  assert.equal(unnamed.calls.persists, 0,
    'an untracked control must stop before persistence');

  const recovery = buildHarness();
  recovery.setRecovery(true);
  assert.equal(await recovery.api.commit('tog-blur', { blurPrivacy: true }), false,
    'pre-existing recovery must block a new mask change');
  assert.equal(recovery.state().settings.blurPrivacy, false,
    'recovery blocking must leave the setting untouched');
  assert.equal(recovery.calls.persists, 0,
    'recovery blocking must not enqueue a write');
  assert.equal(recovery.calls.recoveries, 1,
    'recovery blocking must expose the existing authoritative reload path');

  const rejected = buildHarness();
  rejected.setPersistNow(async () => {
    rejected.setRecovery(true);
    throw new Error('receipt rejected');
  });
  assert.equal(await rejected.api.commit('tog-blur', { blurPrivacy: true }), false,
    'a rejected mask receipt must not complete');
  assert.equal(rejected.state().settings.blurPrivacy, true,
    'the unsaved mask choice must remain visible behind fail-closed recovery');
  assert.deepEqual({ ...rejected.api.status() },
    { key: 'settings.privacyFailed', state: 'error' },
    'rejection must remain an error rather than a saved receipt');
  assert.equal(rejected.calls.recoveries, 1,
    'receipt rejection must surface authoritative reload recovery');

  let releaseAdoption;
  const adopted = buildHarness();
  adopted.setPersistNow(() => new Promise(resolve => { releaseAdoption = resolve; }));
  const adoptedRun = adopted.api.commit('tog-blur', { blurPrivacy: true });
  adopted.setState({ settings: { blurPrivacy: false } });
  releaseAdoption({ ok: true });
  assert.equal(await adoptedRun, false,
    'a replaced authoritative graph must invalidate the old mask receipt');
  assert.equal(adopted.calls.requires, 1,
    'graph replacement must enter fail-closed recovery');
  assert.notEqual(adopted.api.status().state, 'success',
    'graph replacement must never expose success');

  let releaseOwner;
  const replacedSettings = buildHarness();
  replacedSettings.setPersistNow(() => new Promise(resolve => { releaseOwner = resolve; }));
  const ownerRun = replacedSettings.api.commit('tog-blur', { blurPrivacy: true });
  replacedSettings.state().settings = { blurPrivacy: true };
  releaseOwner({ ok: true });
  assert.equal(await ownerRun, false,
    'a replaced settings owner must invalidate the old mask receipt');
  assert.equal(replacedSettings.calls.requires, 1,
    'settings-owner replacement must enter fail-closed recovery');

  let releaseDrift;
  const drifted = buildHarness();
  drifted.setPersistNow(() => new Promise(resolve => { releaseDrift = resolve; }));
  const driftRun = drifted.api.commit('tog-blur', { blurPrivacy: true });
  drifted.state().settings.blurPrivacy = false;
  releaseDrift({ ok: true });
  assert.equal(await driftRun, false,
    'touched-value drift must invalidate the old mask receipt');
  assert.equal(drifted.calls.requires, 1,
    'touched-value drift must enter fail-closed recovery');

  assert.equal(pending.api.active({ blurPrivacy: true }), true,
    'compatible stored true must make the local plugin Active');
  assert.equal(pending.api.active({ blurPrivacy: false }), false,
    'stored false must keep the local plugin Available');
  assert.equal(pending.api.active({}), false,
    'missing legacy bytes must retain the historical inactive default');

  console.log('privacy settings contract tests passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
