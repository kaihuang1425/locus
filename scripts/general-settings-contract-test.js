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
const aboutHtml = extractBetween('<!-- ── About ── -->', '<!-- Paste links import -->', html);
// General's rows are drawn by the Settings page layer (2026-11 canvas board).
const generalCss = extractBetween('   SETTINGS PAGE (2026-11 canvas)', '\n/* ----', css);
const generalSource = extractBetween('const GENERAL_SETTING_KEYS', 'const CAPTURE_SETTING_CONTROL_IDS');

for (const id of [
  'dp-general',
  'general-preferences',
  'general-language-heading',
  'seg-language',
  'tog-hibernate',
  'show-tour-btn',
  'general-status',
  'tog-autoswitch',
]) {
  assert.equal(countId(id), 1, 'General must preserve exactly one #' + id);
}
// Round 2 (Kai's decision 1): no Workspace extras plugin and no disclosure.
for (const id of ['general-workspace-plugin', 'general-plugin-state', 'general-plugin-hint', 'general-window-heading',
  'general-window-hint', 'general-opening-heading', 'general-opening-hint', 'general-guide-heading']) {
  assert.equal(countId(id), 0, 'General no longer renders #' + id + ' (decision 1)');
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
// The approved board moves the guide to About as "Welcome guide · Open guide".
assert.match(aboutHtml,
  /<span class="stg-l" id="about-guide-heading" data-i18n="settings\.welcomeGuide">Welcome guide<\/span>[\s\S]*<button id="show-tour-btn" class="stg-btn stg-go" type="button" data-settings-preference-control aria-describedby="about-guide-hint">\s*<span data-i18n="settings\.showTour">Open guide<\/span>/,
  'the Welcome guide stays one quiet native action, now in About (the approved board)');
assert.doesNotMatch(generalHtml, /show-tour-btn/, 'General no longer holds the guide');
assert.match(generalHtml,
  /id="general-status"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"[^>]*data-state="idle"/,
  'General must expose one atomic persistence receipt');
// Round 2, Kai's decision 1 (ported from "window switching must stay inside one
// available local plugin"): an ordinary row that says what it does.
assert.match(generalHtml,
  /<label class="stg-l" for="tog-autoswitch" data-i18n="settings\.autoSwitch">Switch Workspaces when I change windows<\/label>\s*<small class="sr-only" id="general-autoswitch-hint"[^>]*>When you focus a browser window, Locus opens the Workspace linked to it\.<\/small>/,
  'window switching is the plain row "Switch Workspaces when I change windows", its effect kept as a hidden description (decision 1)');
assert.doesNotMatch(generalHtml, /<details|plugin|Plugin|Available|data-state="available"/,
  'General has no plugin disclosure and no Available chip (decision 1)');
assert.match(generalHtml,
  /<label class="stg-l" for="tog-hibernate" data-i18n="settings\.hibernate">Ask before loading saved pages<\/label>/,
  'the placeholder switch says what it does (the board\'s label)');
assert.doesNotMatch(generalHtml,
  /Welcome screen|settings\.(?:welcomeScreen|showLanding|yourName|welcomeNamePlaceholder|saveWelcomeName)|general-plugin-controls|general-name-/,
  'the Workspace plugin must no longer offer a Welcome screen or a name for it');
assert.doesNotMatch(generalHtml,
  />Profile<|>Your name<|Used for the home greeting|Open saved tabs hibernated|Show calm new-tab welcome|style="|<svg/,
  'General must remove account-like Profile copy, hibernation jargon, inline style, and ornamental icon residue');

const languageIndex = generalHtml.indexOf('id="seg-language"');
const hibernateIndex = generalHtml.indexOf('id="tog-hibernate"');
const switchIndex = generalHtml.indexOf('id="tog-autoswitch"');
assert.ok(languageIndex >= 0 && languageIndex < hibernateIndex && hibernateIndex < switchIndex,
  'General reads Language, then saved-page loading, then window switching (the board)');

for (const key of [
  'settings.generalSub',
  'settings.language',
  'settings.language.hint',
  'settings.hibernate',
  'settings.hibernateHint',
  'settings.generalIdle',
  'settings.generalSaving',
  'settings.generalSaved',
  'settings.generalFailed',
  'settings.autoSwitch',
  'settings.autoSwitchHint',
  'settings.welcomeGuide',
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
  // Round 2 (decision 1): the Workspace extras plugin and its disclosure.
  'settings.workspacePlugin',
  'settings.workspacePluginHint',
  'settings.workspacePluginAvailable',
  'settings.workspacePluginActive',
  'settings.windowSwitching',
  'settings.windowSwitchingHint',
  'settings.savedPageOpening',
  'settings.savedPageOpeningHint',
  'settings.tipsOnboarding',
]) {
  assert.equal(source.split("    '" + key + "':").length - 1, 0, key + ' must be gone from English and zh-TW');
}
// Round 2, Kai's decision 1 (ported from "zh-TW must use the native interface
// term 工作區外掛"): the row names its effect in Taiwan wording, with no 外掛.
assert.ok(source.includes("'settings.autoSwitch': '切換視窗時一併切換工作區'"),
  'zh-TW names window switching by what it does (decision 1)');
assert.ok(source.includes("'settings.generalSub': '介面語言、已儲存網頁的開啟方式與視窗切換。'"),
  'zh-TW General scope names its three rows naturally');
assert.ok(source.includes("'settings.hibernate': '載入已儲存網頁前先詢問'"),
  'zh-TW names the placeholder switch by what it does');
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
assert.doesNotMatch(generalSource, /generalWorkspacePluginIsActive|general-workspace-plugin|general-plugin-state|workspacePlugin/,
  'no Workspace plugin state is derived or painted any more (decision 1)');
assert.match(generalSource,
  /return \{ language, autoSwitch: generalSettingValue\(settings, 'autoSwitchWorkspace'\) === true \};/,
  'General reports window switching from its one real setting');
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
  /\.stg-card \{[^}]*border: 1px solid var\(--stg-rule\)[^}]*border-radius: 20px/,
  /\.stg-content\.sp-enter \{ animation: stgIn \.3s var\(--today-ease\) both; \}/,
  /\.stg-select \{[^}]*min-width: 220px;[^}]*max-width: 100%;[^}]*min-height: 44px;[^}]*border-radius: 12px/,
  /\.stg-row \{[^}]*display: flex;[^}]*flex-wrap: wrap;[^}]*min-height: 64px/,
]) {
  assert.match(generalCss, contract, 'General must use the Settings page layer: ' + contract);
}
assert.doesNotMatch(css, /\.stg-disc\b|\.stg-chev\b|\.stg-disc-body\b/,
  'no disclosure styles remain: Settings has no plugins to open (decision 1)');
// The board's motion (the springy knob, the rise of a disclosure) uses scale
// and translate; decorative gradients and glass blur stay out.
assert.doesNotMatch(generalCss, /(?:linear|radial|conic)-gradient\s*\(|backdrop-filter/,
  'General must not use decorative gradients or glass blur');
assert.match(generalCss,
  /@container \(max-width: 640px\) \{[\s\S]*\.stg-select,\n  \.stg-seg,[\s\S]*\{ flex: 1 1 100%; width: 100%; min-width: 0; \}/,
  'the language select must take the full row at phone width');
assert.doesNotMatch(css, /\.general-name-|\.general-plugin-controls|\.general-language-select|\.general-toggle-list/,
  'the Welcome name field, its plugin controls and the old General ledger must leave no styles behind');
assert.match(generalCss,
  /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*#settings-drawer \*[\s\S]*transition:\s*none !important/,
  'General must inherit the Settings reduced-motion boundary');
assert.match(generalCss,
  /body\[data-anim="off"\] #settings-drawer,[\s\S]*transition:\s*none !important/,
  'the product Motion preference must suppress General transitions');
assert.match(generalCss,
  /@media \(forced-colors:\s*active\)[\s\S]*#settings-drawer :is\(\.stg-card, \.stg-btn, \.stg-select[^)]*\) \{ border: 1px solid CanvasText; \}/,
  'forced colors must preserve General card and control boundaries');

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
    '  value: generalSettingValue,\n' +
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

  const windows = buildHarness();
  assert.equal(windows.api.value(windows.state().settings, 'autoSwitchWorkspace'), false,
    'a stored showLanding: true and a Welcome name do not turn window switching on');
  assert.equal(windows.api.value({}, 'autoSwitchWorkspace'), false,
    'missing bytes keep window switching off');
  assert.equal(await windows.api.commit('tog-autoswitch', { autoSwitchWorkspace: true }), true,
    'the plain row turns window switching on through the same acknowledged write');
  assert.equal(windows.state().settings.autoSwitchWorkspace, true);

  console.log('General settings contract tests passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
