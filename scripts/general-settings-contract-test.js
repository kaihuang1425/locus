const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');

function extractBetween(startMarker, endMarker, input) {
  const text = input || source;
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start);
  assert.ok(start >= 0, startMarker + ' must remain extractable');
  assert.ok(end > start, endMarker + ' must follow ' + startMarker);
  return text.slice(start, end);
}

function countId(id) {
  return (html.match(new RegExp("\\bid=[\"']" + id + "[\"']", 'g')) || []).length;
}

const generalHtml = extractBetween('<!-- ── General ── -->', '<!-- ── Appearance ── -->', html);
const generalCss = extractBetween(
  '/* General keeps only language, recovery opening, and first-save help',
  '/* Shared section header row used by Settings shortcut groups. */',
  css,
);
const generalSource = extractBetween('const GENERAL_SETTING_KEYS', 'const CAPTURE_SETTING_CONTROL_IDS');

for (const id of [
  'dp-general',
  'general-preferences',
  'general-language-heading',
  'seg-language',
  'general-opening-heading',
  'tog-hibernate',
  'general-guide-heading',
  'show-tour-btn',
  'general-status',
  'general-workspace-plugin',
  'general-plugin-state',
  'general-window-heading',
  'tog-autoswitch',
]) {
  assert.equal(countId(id), 1, 'General must preserve exactly one #' + id);
}
// Just Today (2026-11-07): the calm new tab is gone, and with it the Welcome
// screen toggle and the name it greeted.
for (const id of [
  'general-welcome-heading',
  'general-welcome-hint',
  'tog-landing',
  'general-landing-hint',
  'profile-name-input',
  'profile-name-save',
  'general-name-hint',
  'landing-layer',
]) {
  assert.equal(countId(id), 0, 'General must no longer render #' + id);
}

assert.match(generalHtml,
  /id="general-preferences"[^>]*aria-labelledby="sp-title"[^>]*aria-describedby="general-status"[^>]*aria-busy="false"/,
  'General must expose one named, described, busy-capable preference boundary');
assert.match(generalHtml,
  /<select id="seg-language"[^>]*data-settings-preference-control[^>]*aria-labelledby="general-language-heading"[^>]*aria-describedby="general-language-hint"[\s\S]*<option value="en"[\s\S]*<option value="zh-TW"/,
  'language must be one native named select with both supported values');
for (const [controlId, hintId] of [
  ['tog-hibernate', 'general-hibernate-hint'],
  ['tog-autoswitch', 'general-autoswitch-hint'],
]) {
  assert.match(generalHtml,
    new RegExp('id="' + controlId + '"[^>]*data-settings-preference-control[^>]*aria-describedby="' + hintId + '"'),
    '#' + controlId + ' must expose its exact effect to assistive technology');
}
assert.match(generalHtml,
  /id="show-tour-btn"[^>]*type="button"[^>]*data-settings-preference-control[^>]*data-i18n="settings\.showTour"/,
  'the first-save guide must remain one quiet native action in the core ledger');
assert.match(generalHtml,
  /id="general-status"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"[^>]*data-state="idle"/,
  'General must expose one atomic persistence receipt');
assert.match(generalHtml,
  /<details id="general-workspace-plugin"[\s\S]*settings\.workspacePlugin[\s\S]*id="general-plugin-state"[^>]*data-state="available"[\s\S]*id="tog-autoswitch"[\s\S]*<\/details>/,
  'window switching must stay inside one available local plugin');
assert.match(generalHtml,
  /id="general-plugin-hint"[^>]*data-i18n="settings\.workspacePluginHint">Optional browser-window switching\. Available locally and off by default\.<\/small>/,
  'the static plugin fallback must disclose local availability and the inactive default');
assert.doesNotMatch(generalHtml,
  /Welcome screen|settings\.(?:welcomeScreen|showLanding|yourName|welcomeNamePlaceholder|saveWelcomeName)|general-plugin-controls|general-name-/,
  'the Workspace plugin must no longer offer a Welcome screen or a name for it');
assert.doesNotMatch(generalHtml,
  />Profile<|>Your name<|Used for the home greeting|Open saved tabs hibernated|Show calm new-tab welcome|style="|<svg/,
  'General must remove account-like Profile copy, hibernation jargon, inline style, and ornamental icon residue');

const languageIndex = generalHtml.indexOf('id="seg-language"');
const hibernateIndex = generalHtml.indexOf('id="tog-hibernate"');
const guideIndex = generalHtml.indexOf('id="show-tour-btn"');
const pluginIndex = generalHtml.indexOf('id="general-workspace-plugin"');
assert.ok(languageIndex >= 0 && languageIndex < hibernateIndex && hibernateIndex < guideIndex && guideIndex < pluginIndex,
  'core language, saved-page opening, and first-save help must precede optional Workspace extras');

for (const key of [
  'settings.generalSub',
  'settings.language',
  'settings.language.hint',
  'settings.savedPageOpening',
  'settings.savedPageOpeningHint',
  'settings.hibernate',
  'settings.hibernateHint',
  'settings.generalIdle',
  'settings.generalSaving',
  'settings.generalSaved',
  'settings.generalFailed',
  'settings.workspacePlugin',
  'settings.workspacePluginHint',
  'settings.workspacePluginAvailable',
  'settings.workspacePluginActive',
  'settings.windowSwitching',
  'settings.windowSwitchingHint',
  'settings.autoSwitch',
  'settings.autoSwitchHint',
  'settings.tipsOnboarding',
  'settings.firstSaveGuideHint',
  'settings.showTour',
]) {
  const count = source.split("    '" + key + "':").length - 1;
  assert.equal(count, 2, key + ' must exist once in English and once in native zh-TW');
}
for (const key of [
  'settings.welcomeScreen',
  'settings.welcomeScreenHint',
  'settings.showLanding',
  'settings.showLandingHint',
  'settings.yourName',
  'settings.yourNameHint',
  'settings.welcomeNamePlaceholder',
  'settings.saveWelcomeName',
]) {
  assert.equal(source.split("    '" + key + "':").length - 1, 0, key + ' must be gone from English and zh-TW');
}
assert.ok(source.includes("'settings.workspacePlugin': '工作區外掛'"),
  'zh-TW must use the native interface term 工作區外掛');
assert.ok(source.includes("'settings.generalSub': '設定介面語言、已儲存網頁的開啟方式，以及選用的工作區功能。'"),
  'zh-TW General scope must read naturally and preserve the core/plugin hierarchy');
assert.ok(source.includes("'settings.workspacePluginHint': 'Optional browser-window switching. Available locally and off by default.'"),
  'English plugin copy must state local availability and the inactive default');
assert.ok(source.includes("'settings.workspacePluginHint': '選用的瀏覽器視窗切換功能；已內建，預設關閉。'"),
  'zh-TW plugin copy must state local availability and the inactive default naturally');
const initialStateSource = extractBetween('const createInitialState = () => ({', '\n  });');
assert.match(initialStateSource, /blurPrivacy:false, windowSync:false,/,
  'fresh state keeps its privacy and window defaults');
assert.doesNotMatch(initialStateSource, /showLanding|profile/,
  'fresh state must not write the retired Welcome-layer choice or a Welcome name');
assert.doesNotMatch(source.replace(/^\s*\/\/.*$/gm, ''), /showLanding|\.settings\??\.profile\b|profile\.name/,
  'no code reads a stored Welcome-layer choice or Welcome name, so old values stay harmless');

assert.match(generalSource,
  /const GENERAL_SETTING_KEYS = new Set\(\[\n  'language',\n  'hibernate',\n  'autoSwitchWorkspace',\n\]\);/,
  'General must explicitly allowlist only its three stored preferences');
assert.doesNotMatch(generalSource, /showLanding|'profile'|profile-name|NameDraft|generalProfileName|resetNameDraft/,
  'General must not keep the retired Welcome toggle, the Welcome name, or its draft handling');
assert.match(generalSource,
  /function generalSettingsPatchIsValid[\s\S]*entries\.length !== 1[\s\S]*SUPPORTED_LOCALES\.includes[\s\S]*typeof value !== 'boolean'/,
  'General must validate one exact language or boolean patch');
assert.match(generalSource,
  /function generalWorkspacePluginIsActive\(settings\) \{\n  return generalSettingValue\(settings, 'autoSwitchWorkspace'\) === true;\n\}/,
  'Workspace plugin Active state must derive from window switching, its one real setting');
assert.match(generalSource,
  /const GENERAL_SETTING_DEFAULTS = Object\.freeze\(\{\n  hibernate: true,\n  autoSwitchWorkspace: false,\n\}\);/,
  'missing compatible bytes must retain Hibernate while window switching stays inactive');
assert.match(generalSource,
  /async function commitGeneralSettingsChange[\s\S]*State\.isRecoveryRequired[\s\S]*generalSettingsPending = transaction[\s\S]*projectGeneralSettingsChange\(keys\)[\s\S]*await State\.persistNow\(\)[\s\S]*State\.get\(\) !== state[\s\S]*generalSettingsPatchFingerprint\(settings, keys\) !== expected[\s\S]*generalSaved/,
  'one controller must project, await one receipt, and reject graph or touched-value drift before success');
assert.equal((generalSource.match(/State\.persistNow\(\)/g) || []).length, 1,
  'General must expose exactly one acknowledged persistence boundary');
assert.doesNotMatch(generalSource, /State\.persist\(\)|toast\(|pluginEnabled|marketplace|fetch\(|chrome\.runtime\.sendMessage/,
  'General must not retain fire-and-forget writes or invent plugin/network state');
assert.match(source,
  /function settingsPreferencePendingTransaction\(\)[\s\S]*generalSettingsPending \|\| captureSettingsPending \|\| appearanceSettingsPending \|\| privacySettingsPending[\s\S]*function settingsPreferenceBlocksDismissal\(\)[\s\S]*generalSettingsBlocksDismissal/,
  'General, Capture, Appearance, and Privacy must share one Settings-level pending owner');
assert.match(source,
  /function paintSettingsPreferenceBusy\(\)[\s\S]*general-preferences[\s\S]*data-settings-preference-control[\s\S]*control\.disabled = busy && control\.id !== ownerId[\s\S]*dataset\.settingsPreferenceDisabled/,
  'pending persistence must include General and honour a control\'s own disabled state');
assert.match(source,
  /const languageSelect = document\.getElementById\('seg-language'\)[\s\S]*commitGeneralSettingsChange\(e\.target\.id, \{ language: e\.target\.value \}\)[\s\S]*bindGeneralToggle\('tog-hibernate', 'hibernate'\)[\s\S]*bindGeneralToggle\('tog-autoswitch', 'autoSwitchWorkspace'\)/,
  'every General select or toggle must converge on the same acknowledged controller');
assert.doesNotMatch(source,
  /bindGeneralToggle\('tog-landing'|saveGeneralName|profile-name-|handleGeneralNameDraftEscape|discardGeneralNameDraft/,
  'the Welcome toggle binding, the name Save, and its draft-first Escape must be gone');
assert.match(source,
  /if \(handleOrganizationNameGlobalKey\(e\)\) return;\s+const tag = document\.activeElement\?\.tagName;/,
  'the global Escape stack goes from the organization dialogs straight to the shared field checks');
assert.doesNotMatch(source,
  /nameInput\.onchange[\s\S]{0,220}State\.persist|#seg-language button|tog-hibernate'\)\.onchange[\s\S]{0,180}State\.persist|tog-autoswitch'\)\.onchange[\s\S]{0,180}State\.persist|landingToggle\.onchange/,
  'legacy blur and fire-and-forget General bindings must be gone');

for (const contract of [
  /\.general-preferences\s*\{[^}]*border-top:\s*3px solid var\(--index-locator/,
  /#dp-general\.sp-enter\s*\{[^}]*animation:\s*none/,
  /\.general-language-select\s*\{[^}]*width:\s*min\(100%,\s*340px\)[^}]*min-height:\s*44px[^}]*border-radius:\s*3px/,
  /\.general-toggle-list \.toggle-row\s*\{[^}]*min-height:\s*54px[^}]*border-bottom:\s*1px solid var\(--border\)/,
  /\.general-workspace-plugin\[data-locked="true"\] > summary\s*\{[^}]*cursor:\s*wait/,
]) {
  assert.match(generalCss, contract, 'General must use the compact Locus Index contract: ' + contract);
}
assert.doesNotMatch(generalCss, /(?:linear|radial|conic)-gradient\s*\(|backdrop-filter|translateY\(|scale\(/,
  'General must not use decorative gradients, blur, lift, or scale motion');
assert.match(generalCss,
  /@media \(max-width:\s*620px\) \{\n  \.general-language-select \{ width: 100%; \}\n\}/,
  'the language select must take the full row at 620/520 px');
assert.doesNotMatch(css, /\.general-name-|\.general-plugin-controls/,
  'the Welcome name field and its plugin controls must leave no styles behind');
assert.match(css,
  /@media \(max-width:\s*800px\)[\s\S]*\.appearance-setting,[\s\S]*\.appearance-pack-section\s*\{[^}]*grid-template-columns:\s*1fr/,
  'General must inherit the deliberate 800 px stack from the shared preference ledger');
assert.match(css,
  /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*#settings-drawer \*[\s\S]*transition:\s*none !important/,
  'General must inherit the Settings reduced-motion boundary');
assert.match(css,
  /body\[data-anim="off"\] \.appearance-profile,[\s\S]*transition:\s*none !important/,
  'the product Motion preference must suppress General transitions');
assert.match(css,
  /@media \(forced-colors:\s*active\)[\s\S]*\.general-language-select \{[^}]*border-color:\s*CanvasText[\s\S]*\.general-preferences\s*\{[^}]*border-top-color:\s*Highlight/,
  'forced colors must preserve General control boundaries and its one locator');

const CONTROL_IDS = [
  'seg-language',
  'tog-hibernate',
  'tog-autoswitch',
  // Retired controls stay in the harness DOM so a commit naming them is refused
  // by the allowlist, not by a missing element.
  'tog-landing',
  'profile-name-save',
];

// Kai's own profile still stores the retired Welcome choice and name.
function initialSettings(overrides) {
  return {
    language: 'en',
    hibernate: true,
    autoSwitchWorkspace: false,
    showLanding: true,
    profile: { marker: 'preserve', name: 'Kai' },
    ...(overrides || {}),
  };
}

function buildHarness(overrides) {
  let currentState = { settings: initialSettings(overrides) };
  let recoveryRequired = false;
  let persistNow = async () => ({ ok: true });
  const calls = {
    persists: 0,
    applies: 0,
    renderAll: 0,
    renders: 0,
    focuses: 0,
    recoveries: 0,
    requires: 0,
  };
  const controls = new Map();
  const document = {
    activeElement: null,
    getElementById(id) { return controls.get(id) || null; },
  };
  for (const id of CONTROL_IDS) {
    const control = {
      id,
      dataset: { settingsPreferenceControl: 'true' },
      focus() { calls.focuses += 1; document.activeElement = control; },
    };
    controls.set(id, control);
  }
  const context = vm.createContext({
    SUPPORTED_LOCALES: ['en', 'zh-TW'],
    browserLanguage: () => 'en',
    normalizeLanguage: value => ['en', 'zh-TW'].includes(value) ? value : 'en',
    document,
    tr: key => 'en:' + key,
    paintSettingsPreferenceBusy: () => {},
    applySettings: () => { calls.applies += 1; },
    renderAll: () => { calls.renderAll += 1; },
    renderHeader: () => {},
    showStateRecoveryRequired: () => { calls.recoveries += 1; },
    State: {
      get: () => currentState,
      isRecoveryRequired: () => recoveryRequired,
      requireRecovery: () => { calls.requires += 1; recoveryRequired = true; },
      persistNow: () => { calls.persists += 1; return persistNow(); },
    },
  });
  vm.runInContext(
    generalSource + '\n' +
    'renderGeneralSettings = () => { globalThis.__calls.renders += 1; return null; };\n' +
    'globalThis.settingsPreferencePendingTransaction = () => generalSettingsPending;\n' +
    'globalThis.focusSettingsPreferencePendingControl = () => focusGeneralSettingsPendingControl();\n' +
    'globalThis.__general = {\n' +
    '  commit: commitGeneralSettingsChange,\n' +
    '  pending: () => generalSettingsPending,\n' +
    '  status: () => ({ ...generalSettingsStatus }),\n' +
    '  pluginActive: generalWorkspacePluginIsActive,\n' +
    '};',
    Object.assign(context, { __calls: calls }),
  );
  return {
    api: context.__general,
    calls,
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
  const runPending = pending.api.commit('seg-language', { language: 'zh-TW' });
  assert.equal(pending.state().settings.language, 'zh-TW',
    'a valid language choice must project before requesting its receipt');
  assert.equal(pending.calls.persists, 1,
    'one General activation must request exactly one persisted receipt');
  assert.equal(pending.calls.applies, 1,
    'language must project immediately through the real settings boundary');
  assert.equal(pending.calls.renderAll, 1,
    'language projection must update dynamic product copy');
  assert.equal(pending.api.pending().controlId, 'seg-language',
    'the initiating General control must own the transaction');
  assert.deepEqual({ ...pending.api.status() },
    { key: 'settings.generalSaving', state: 'pending' },
    'pending persistence must expose a localized saving state');
  assert.equal(await pending.api.commit('tog-hibernate', { hibernate: false }), false,
    'a second General activation must be refused while the first receipt is pending');
  assert.equal(pending.calls.persists, 1,
    'duplicate activation must not enqueue another whole-graph write');
  assert.equal(pending.calls.focuses, 1,
    'duplicate activation must return focus to the initiating control');
  releaseReceipt({ ok: true });
  assert.equal(await runPending, true,
    'an exact acknowledged General choice must complete');
  assert.equal(pending.api.pending(), null,
    'acknowledgement must release the General interlock');
  assert.deepEqual({ ...pending.api.status() },
    { key: 'settings.generalSaved', state: 'success' },
    'only acknowledgement may expose the saved receipt');

  const noOp = buildHarness();
  assert.equal(await noOp.api.commit('tog-hibernate', { hibernate: true }), true,
    'an unchanged General choice remains a successful no-op');
  assert.equal(noOp.calls.persists, 0,
    'an unchanged General choice must not create an empty revision');
  assert.equal(await noOp.api.commit('missing-control', { hibernate: false }), false,
    'an unknown opener must not mutate General');
  assert.equal(await noOp.api.commit('tog-hibernate', { unsafe: true }), false,
    'an unknown setting key must not cross the General boundary');
  assert.equal(await noOp.api.commit('seg-language', { language: 'fr' }), false,
    'an unsupported locale must stop before mutation');
  assert.equal(await noOp.api.commit('profile-name-save', { profile: { name: 'Kai' } }), false,
    'the retired Welcome-name Save must not cross the General boundary');
  assert.equal(await noOp.api.commit('tog-landing', { showLanding: false }), false,
    'the retired Welcome toggle must not cross the General boundary');
  assert.equal(await noOp.api.commit('tog-autoswitch', { showLanding: false }), false,
    'a live control must not carry a write to the retired Welcome choice');
  assert.equal(await noOp.api.commit('tog-autoswitch', { profile: { name: '' } }), false,
    'a live control must not carry a write to the retired Welcome name');
  assert.equal(noOp.calls.persists, 0,
    'invalid General input must stop before persistence');
  assert.deepEqual([noOp.state().settings.showLanding, { ...noOp.state().settings.profile }],
    [true, { marker: 'preserve', name: 'Kai' }],
    'refused writes leave the retired keys exactly as stored');

  const legacy = buildHarness();
  assert.equal(await legacy.api.commit('tog-hibernate', { hibernate: false }), true,
    'a profile that stored the retired keys still saves General preferences');
  assert.equal(legacy.calls.persists, 1);
  assert.deepEqual([legacy.state().settings.showLanding, { ...legacy.state().settings.profile }],
    [true, { marker: 'preserve', name: 'Kai' }],
    'saving another preference carries the retired Welcome choice and name untouched');

  const rejected = buildHarness();
  rejected.setPersistNow(async () => {
    rejected.setRecovery(true);
    throw new Error('receipt rejected');
  });
  assert.equal(await rejected.api.commit('tog-hibernate', { hibernate: false }), false,
    'a rejected General receipt must not complete');
  assert.equal(rejected.state().settings.hibernate, false,
    'the optimistic choice must remain visible behind fail-closed recovery');
  assert.deepEqual({ ...rejected.api.status() },
    { key: 'settings.generalFailed', state: 'error' },
    'rejection must remain an error rather than a saved receipt');
  assert.equal(rejected.calls.recoveries, 1,
    'receipt rejection must surface authoritative-reload recovery');

  let releaseDrift;
  const drift = buildHarness();
  drift.setPersistNow(() => new Promise(resolve => { releaseDrift = resolve; }));
  const driftRun = drift.api.commit('tog-autoswitch', { autoSwitchWorkspace: true });
  drift.state().settings.autoSwitchWorkspace = false;
  releaseDrift({ ok: true });
  assert.equal(await driftRun, false,
    'a touched General value changed before acknowledgement must not claim success');
  assert.equal(drift.calls.requires, 1,
    'post-acknowledgement preference drift must require authoritative recovery');
  assert.equal(drift.calls.recoveries, 1,
    'post-acknowledgement preference drift must expose recovery');

  let releaseAdoption;
  const adopted = buildHarness();
  adopted.setPersistNow(() => new Promise(resolve => { releaseAdoption = resolve; }));
  const adoptedRun = adopted.api.commit('tog-autoswitch', { autoSwitchWorkspace: true });
  adopted.setState({ settings: initialSettings({ autoSwitchWorkspace: true }) });
  releaseAdoption({ ok: true });
  assert.equal(await adoptedRun, false,
    'graph adoption before acknowledgement must not complete an old General transaction');
  assert.equal(adopted.calls.requires, 1,
    'graph adoption must require authoritative recovery even when the value matches');

  const blocked = buildHarness();
  blocked.setRecovery(true);
  assert.equal(await blocked.api.commit('tog-hibernate', { hibernate: false }), false,
    'General must refuse mutation while authoritative recovery is already required');
  assert.equal(blocked.calls.persists, 0,
    'recovery preflight must stop before persistence');
  assert.equal(blocked.state().settings.hibernate, true,
    'recovery preflight must leave the setting untouched');
  assert.equal(blocked.calls.recoveries, 1,
    'recovery preflight must return to the existing recovery layer');

  const plugin = buildHarness();
  assert.equal(plugin.api.pluginActive(plugin.state().settings), false,
    'a stored showLanding: true and a Welcome name must not mark the Workspace plugin active');
  plugin.state().settings.autoSwitchWorkspace = true;
  assert.equal(plugin.api.pluginActive(plugin.state().settings), true,
    'the real window-switch setting must mark the Workspace plugin active');
  assert.equal(plugin.api.pluginActive({}), false,
    'missing bytes must keep the optional Workspace plugin available rather than active');

  console.log('General settings contract tests passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
