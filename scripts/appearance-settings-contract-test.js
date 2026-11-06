const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');

function extractBetween(startMarker, endMarker, input = source) {
  const start = input.indexOf(startMarker);
  const end = input.indexOf(endMarker, start);
  assert.ok(start >= 0, `${startMarker} must remain extractable`);
  assert.ok(end > start, `${endMarker} must follow ${startMarker}`);
  return input.slice(start, end);
}

function countId(id) {
  return (html.match(new RegExp(`\\bid=["']${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g')) || []).length;
}

const appearanceHtml = extractBetween('<!-- ── Appearance ── -->', '<!-- ── Capture ── -->', html);
const appearanceCss = extractBetween(
  '/* Appearance is intentionally small:',
  '/* Shared section header row used by Settings shortcut groups. */',
  css,
);
const appearanceSource = extractBetween('const APPEARANCE_SETTING_KEYS', '\n// SETTINGS PAGE');
const appearanceCommitSource = extractBetween('async function commitAppearanceSettingsChange', '\nfunction renderPrivacySettings');
const themeBuilderSource = extractBetween('const CORE_APPEARANCE_THEMES', '\nconst CAPTURE_SETTING_CONTROL_IDS');

for (const id of [
  'dp-appearance',
  'appearance-profile',
  'appearance-theme-heading',
  'theme-grid',
  'appearance-density-heading',
  'seg-size',
  'appearance-size-compact',
  'appearance-size-normal',
  'appearance-size-large',
  'appearance-details-heading',
  'tog-urls',
  'tog-anim',
  'appearance-status',
  'appearance-style-pack',
  'appearance-pack-state',
  'theme-pack-grid',
  'seg-width',
  'seg-font',
  'appearance-pack-reset',
]) {
  assert.equal(countId(id), 1, `Appearance must preserve exactly one #${id}`);
}

assert.match(appearanceHtml,
  /id="appearance-profile"[^>]*aria-labelledby="appearance-theme-heading"[^>]*aria-describedby="appearance-status"[^>]*aria-busy="false"/,
  'Appearance must expose one named, described, busy-capable preference boundary');
assert.match(appearanceHtml,
  /id="theme-grid"[^>]*role="group"[^>]*aria-labelledby="appearance-theme-heading"[^>]*aria-describedby="appearance-theme-hint"/,
  'the three core color modes must share one accessible group name and consequence');
assert.match(appearanceHtml,
  /id="seg-size"[^>]*role="group"[^>]*aria-labelledby="appearance-density-heading"[^>]*aria-describedby="appearance-density-hint"/,
  'density choices must share one accessible group name and explanation');
assert.match(appearanceHtml,
  /id="appearance-size-compact"[^>]*type="button"[^>]*data-settings-preference-control[^>]*aria-pressed="false"[\s\S]*id="appearance-size-normal"[^>]*aria-pressed="true"[\s\S]*id="appearance-size-large"[^>]*aria-pressed="false"/,
  'all core density choices must be native named buttons with explicit selected state');
for (const [controlId, hintId] of [
  ['tog-urls', 'appearance-urls-hint'],
  ['tog-anim', 'appearance-motion-hint'],
]) {
  assert.match(appearanceHtml, new RegExp(`id="${controlId}"[^>]*data-settings-preference-control[^>]*aria-describedby="${hintId}"`),
    `#${controlId} must expose its exact effect to assistive technology`);
}
assert.match(appearanceHtml,
  /id="appearance-status"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"[^>]*data-state="idle"/,
  'Appearance must expose one atomic persistence receipt');
assert.match(appearanceHtml,
  /<details id="appearance-style-pack"[\s\S]*<strong data-i18n="settings\.stylePack">Style plugin<\/strong>[\s\S]*id="appearance-pack-state"[^>]*data-state="available"[\s\S]*id="theme-pack-grid"[\s\S]*id="seg-width"[\s\S]*id="seg-font"/,
  'optional themes, typefaces, and column width must stay inside one available local Style plugin');
assert.doesNotMatch(appearanceHtml, /theme-cycle-btn|Cycle theme|style="|clean &amp; modern|geometric minimal|coder/,
  'Appearance must remove the cycling shortcut, inline font residue, and prototype marketing labels');

assert.match(themeBuilderSource,
  /const CORE_APPEARANCE_THEMES = Object\.freeze\([\s\S]*id: 'auto'[\s\S]*id: 'folio'[\s\S]*id: 'folio-dark'/,
  'System, Locus Light, and Locus Dark must be the only promoted color modes');
assert.match(themeBuilderSource,
  /function createThemeChoiceButton[\s\S]*document\.createElement\('button'\)[\s\S]*button\.type = 'button'[\s\S]*aria-pressed[\s\S]*commitAppearanceSettingsChange/,
  'every theme must be a native selected-state button using the acknowledged preference boundary');
assert.match(themeBuilderSource,
  /for \(const theme of CORE_APPEARANCE_THEMES\)[\s\S]*grid\.appendChild[\s\S]*THEMES\.filter\(candidate => !isCoreAppearanceTheme\(candidate\.id\)\)[\s\S]*packGrid\.appendChild/,
  'legacy-compatible visual variants must render only into the optional Style plugin');
assert.doesNotMatch(themeBuilderSource, /card\.innerHTML|document\.createElement\('div'\).*theme-card|State\.persist\(\)|cycleTheme/,
  'theme construction must not restore pointer-only cards, fire-and-forget writes, or theme cycling');
assert.doesNotMatch(source, /theme-cycle-btn|function cycleTheme\(|palette\.nextTheme|action\.cycleTheme/,
  'optional themes must not leak into a primary shortcut or cycling control');

for (const key of [
  'settings.themeMode',
  'settings.themeModeHint',
  'settings.theme.system',
  'settings.theme.systemHint',
  'settings.theme.light',
  'settings.theme.lightHint',
  'settings.theme.dark',
  'settings.theme.darkHint',
  'settings.densityHint',
  'settings.columnWidthHint',
  'settings.fontFamilyHint',
  'settings.font.sans',
  'settings.font.serif',
  'settings.font.mono',
  'settings.font.system',
  'settings.font.systemName',
  'settings.showUrlsHint',
  'settings.animationsHint',
  'settings.cardDetails',
  'settings.cardDetailsHint',
  'settings.appearanceIdle',
  'settings.appearanceSaving',
  'settings.appearanceSaved',
  'settings.appearanceFailed',
  'settings.stylePack',
  'settings.stylePackHint',
  'settings.stylePackAvailable',
  'settings.stylePackActive',
  'settings.moreThemes',
  'settings.moreThemesHint',
  'settings.stylePackReset',
  'settings.stylePackResetHint',
]) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.equal((source.match(new RegExp(`^\\s{4}'${escaped}':`, 'gm')) || []).length, 2,
    `${key} must exist exactly once in English and once in native zh-TW`);
}
assert.ok(source.includes("'settings.stylePack': '樣式外掛'"),
  'zh-TW must use the native interface term 樣式外掛 for the optional Style plugin');
assert.ok(source.includes("'settings.appearanceSub': '調整顯示模式、項目大小與卡片資訊；其他樣式收在選用外掛中。'"),
  'zh-TW Appearance scope must describe the core choices and optional plugin naturally');

assert.match(appearanceSource,
  /const APPEARANCE_SETTING_KEYS = new Set\([\s\S]*'theme'[\s\S]*'size'[\s\S]*'width'[\s\S]*'font'[\s\S]*'showUrls'[\s\S]*'animate'/,
  'the Appearance boundary must explicitly allowlist the existing stored keys');
assert.match(appearanceSource,
  /function appearanceSettingsPatchIsValid[\s\S]*THEMES\.some[\s\S]*\['compact', 'normal', 'large'\][\s\S]*\['narrow', 'normal', 'wide'\][\s\S]*typeof value !== 'boolean'/,
  'Appearance must validate every persisted value before mutation');
assert.match(appearanceSource,
  /async function commitAppearanceSettingsChange[\s\S]*State\.isRecoveryRequired[\s\S]*appearanceSettingsPending = transaction[\s\S]*applySettings\(\)[\s\S]*await State\.persistNow\(\)[\s\S]*State\.get\(\) !== state[\s\S]*appearanceSettingsPatchFingerprint\(settings, keys\) !== expected[\s\S]*appearanceSaved/,
  'one controller must preview, await one receipt, and reject graph or touched-value drift before success');
assert.equal((appearanceCommitSource.match(/State\.persistNow\(\)/g) || []).length, 1,
  'Appearance must expose exactly one acknowledged persistence boundary');
assert.doesNotMatch(appearanceSource, /State\.persist\(\)|toast\(/,
  'Appearance must not persist in the background or announce success before acknowledgement');
assert.match(source,
  /function settingsPreferencePendingTransaction\(\)[\s\S]*generalSettingsPending \|\| captureSettingsPending \|\| appearanceSettingsPending \|\| privacySettingsPending[\s\S]*function settingsPreferenceBlocksDismissal/,
  'General, Capture, Appearance, and Privacy must share one Settings-level pending owner');
assert.match(source,
  /function paintSettingsPreferenceBusy\(\)[\s\S]*\[data-settings-preference-control\][\s\S]*control\.disabled = busy && control\.id !== ownerId[\s\S]*#drawer-tabs \.dt, #drawer-x/,
  'pending persistence must disable every other tracked preference, section, and Close while retaining its opener');
assert.match(source,
  /function setSettingsSection\(tab\)[\s\S]*settingsPreferencePendingTransaction\(\)[\s\S]*id !== pending\.kind[\s\S]*focusSettingsPreferencePendingControl\(\)[\s\S]*return false/,
  'pending Appearance must block Settings section changes and return focus to its opener');
assert.match(source,
  /const _closeDrawer = \(\) => \{[\s\S]*settingsPreferenceBlocksDismissal\(\)[\s\S]*focusSettingsPreferencePendingControl\(\)[\s\S]*return false/,
  'pending Appearance must block pointer dismissal of Settings');
assert.match(source,
  /if \(settingsPreferenceBlocksDismissal\(\)\)[\s\S]*e\.key !== 'Tab'[\s\S]*stopImmediatePropagation\(\)[\s\S]*focusSettingsPreferencePendingControl\(\)/,
  'pending Appearance must retain Tab trapping while owning Escape and lower shortcuts');

for (const contract of [
  /\.appearance-setting\s*\{[^}]*grid-template-columns:\s*minmax\(150px,\s*190px\) minmax\(0,\s*1fr\)[^}]*border-bottom:\s*1px solid var\(--border\)/,
  /\.theme-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
  /\.theme-card\s*\{[^}]*min-height:\s*62px[^}]*border-left:\s*3px solid transparent[^}]*border-radius:\s*4px/,
  /\.appearance-status\[data-state="success"\]\s*\{[^}]*var\(--index-receipt/,
  /\.appearance-style-pack > summary\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto auto[^}]*min-height:\s*66px/,
]) {
  assert.match(appearanceCss, contract, `Appearance must use the compact Locus Index preference contract: ${contract}`);
}
assert.doesNotMatch(appearanceCss, /(?:linear|radial|conic)-gradient\s*\(|translateY\(|scale\(/,
  'Appearance must not use decorative gradients, lift, or scale motion');
assert.match(appearanceCss,
  /@media \(max-width:\s*800px\)[\s\S]*\.appearance-setting,[\s\S]*\.appearance-pack-section\s*\{[^}]*grid-template-columns:\s*1fr/,
  'Appearance rows must deliberately stack at the required 800 px layout');
assert.match(appearanceCss,
  /@media \(max-width:\s*620px\)[\s\S]*\.theme-grid,[\s\S]*\.appearance-font-grid\s*\{[^}]*grid-template-columns:\s*1fr[\s\S]*\.appearance-pack-footer\s*\{[^}]*flex-direction:\s*column/,
  'core and optional choices must remain readable at 620/520 px');
assert.match(css,
  /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*#settings-drawer \*[\s\S]*transition:\s*none !important/,
  'Appearance must inherit the Settings reduced-motion boundary');
assert.match(css,
  /body\[data-anim="off"\] \.appearance-profile,[\s\S]*transition:\s*none !important/,
  'the product Motion preference must suppress Appearance transitions immediately');
assert.match(css,
  /@media \(forced-colors:\s*active\)[\s\S]*\.appearance-profile,[\s\S]*\.theme-card\.active,[\s\S]*border-left-color:\s*Highlight[\s\S]*\.appearance-seg button\.active[^}]*HighlightText/,
  'forced colors must preserve the active theme, font, and density indicators');

const CONTROL_IDS = [
  'appearance-theme-auto',
  'appearance-theme-folio',
  'appearance-theme-folio-dark',
  'appearance-theme-tabento',
  'appearance-size-compact',
  'appearance-size-normal',
  'appearance-size-large',
  'appearance-width-narrow',
  'appearance-width-normal',
  'appearance-width-wide',
  'appearance-font-dm',
  'appearance-font-inter',
  'appearance-font-lora',
  'tog-urls',
  'tog-anim',
  'appearance-pack-reset',
];

function initialSettings(overrides = {}) {
  return {
    theme: 'folio',
    size: 'normal',
    width: 'normal',
    font: 'dm',
    showUrls: true,
    animate: true,
    ...overrides,
  };
}

function buildHarness(overrides = {}) {
  let currentState = { settings: initialSettings(overrides) };
  let recoveryRequired = false;
  let persistNow = async () => ({ ok: true });
  const calls = { persists: 0, applies: 0, renders: 0, focuses: 0, recoveries: 0, requires: 0 };
  const controls = new Map();
  const document = {
    activeElement: null,
    getElementById(id) { return controls.get(id) || null; },
    querySelectorAll() { return []; },
  };
  for (const id of CONTROL_IDS) {
    const control = {
      id,
      dataset: { settingsPreferenceControl: 'true' },
      focus() { calls.focuses += 1; document.activeElement = control; },
    };
    controls.set(id, control);
  }
  const themes = [
    { id: 'folio', label: 'Locus' },
    { id: 'folio-dark', label: 'Locus Dark' },
    { id: 'tabento', label: 'Rice Paper' },
  ];
  const context = vm.createContext({
    THEMES: themes,
    generalSettingsPending: null,
    generalSettingsBlocksDismissal: () => false,
    focusGeneralSettingsPendingControl: () => false,
    captureSettingsPending: null,
    captureSettingsBlocksDismissal: () => false,
    focusCaptureSettingsPendingControl: () => false,
    normalizeThemeId: value => value,
    isCoreAppearanceTheme: value => ['auto', 'folio', 'folio-dark'].includes(value),
    themeDisplayName: value => value,
    tr: key => `en:${key}`,
    document,
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
    `${appearanceSource}\n` +
    'renderAppearanceSettings = () => { globalThis.__calls.renders += 1; return null; };\n' +
    'globalThis.__appearance = {\n' +
    '  commit: commitAppearanceSettingsChange,\n' +
    '  pending: () => appearanceSettingsPending,\n' +
    '  status: () => ({ ...appearanceSettingsStatus }),\n' +
    '  active: appearanceStylePackIsActive,\n' +
    '  resetPatch: appearanceStylePackResetPatch,\n' +
    '};',
    Object.assign(context, { __calls: calls }),
  );
  return {
    api: context.__appearance,
    calls,
    controls,
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
  const runPending = pending.api.commit('appearance-theme-auto', { theme: 'auto' });
  assert.equal(pending.state().settings.theme, 'auto',
    'a valid Appearance choice must update the owned preview before requesting its receipt');
  assert.equal(pending.calls.persists, 1,
    'one Appearance activation must request exactly one persisted receipt');
  assert.equal(pending.calls.applies, 1,
    'the selected Appearance must preview immediately through the real apply boundary');
  assert.equal(pending.api.pending().controlId, 'appearance-theme-auto',
    'the initiating control must own the pending transaction');
  assert.deepEqual({ ...pending.api.status() },
    { key: 'settings.appearanceSaving', state: 'pending' },
    'pending persistence must expose the localized saving state');
  assert.equal(await pending.api.commit('appearance-size-compact', { size: 'compact' }), false,
    'a second Appearance activation must be refused while the first receipt is pending');
  assert.equal(pending.calls.persists, 1,
    'duplicate activation must not enqueue another whole-graph write');
  assert.equal(pending.calls.focuses, 1,
    'duplicate activation must return focus to the initiating control');
  releaseReceipt({ ok: true });
  assert.equal(await runPending, true,
    'an exact acknowledged Appearance choice must complete');
  assert.equal(pending.api.pending(), null,
    'acknowledgement must release the Appearance interlock');
  assert.deepEqual({ ...pending.api.status() },
    { key: 'settings.appearanceSaved', state: 'success' },
    'only acknowledgement may expose the saved receipt');
  assert.equal(pending.calls.focuses, 1,
    'completion must not move focus away from the initiating control');

  const noOp = buildHarness();
  assert.equal(await noOp.api.commit('appearance-size-normal', { size: 'normal' }), true,
    'an unchanged Appearance choice remains a successful no-op');
  assert.equal(noOp.calls.persists, 0,
    'an unchanged Appearance choice must not create an empty revision');
  assert.equal(await noOp.api.commit('missing-control', { size: 'compact' }), false,
    'an unknown opener must not mutate Appearance');
  assert.equal(await noOp.api.commit('appearance-size-compact', { unsafe: true }), false,
    'an unknown settings key must not cross the Appearance boundary');
  assert.equal(await noOp.api.commit('appearance-size-compact', { size: 'tiny' }), false,
    'an unsupported Appearance value must stop before mutation');
  assert.equal(noOp.calls.persists, 0,
    'invalid Appearance input must stop before persistence');
  assert.equal(noOp.state().settings.size, 'normal',
    'invalid input must leave the real setting untouched');

  const rejected = buildHarness();
  rejected.setPersistNow(async () => {
    rejected.setRecovery(true);
    throw new Error('receipt rejected');
  });
  assert.equal(await rejected.api.commit('appearance-theme-folio-dark', { theme: 'folio-dark' }), false,
    'a rejected Appearance receipt must not complete');
  assert.equal(rejected.state().settings.theme, 'folio-dark',
    'the unsaved visual choice must remain visible behind fail-closed recovery');
  assert.deepEqual({ ...rejected.api.status() },
    { key: 'settings.appearanceFailed', state: 'error' },
    'rejection must remain an error rather than a saved receipt');
  assert.equal(rejected.calls.recoveries, 1,
    'receipt rejection must surface the existing authoritative-reload recovery');

  let releaseDrift;
  const drift = buildHarness();
  drift.setPersistNow(() => new Promise(resolve => { releaseDrift = resolve; }));
  const driftRun = drift.api.commit('appearance-size-compact', { size: 'compact' });
  drift.state().settings.size = 'large';
  releaseDrift({ ok: true });
  assert.equal(await driftRun, false,
    'a touched Appearance value that changes before acknowledgement must not claim success');
  assert.equal(drift.calls.requires, 1,
    'post-acknowledgement preference drift must require authoritative recovery');
  assert.equal(drift.calls.recoveries, 1,
    'post-acknowledgement preference drift must expose the recovery layer');
  assert.notEqual(drift.api.status().state, 'success',
    'post-acknowledgement drift must never emit a saved receipt');

  let releaseAdoption;
  const adopted = buildHarness();
  adopted.setPersistNow(() => new Promise(resolve => { releaseAdoption = resolve; }));
  const adoptedRun = adopted.api.commit('appearance-font-inter', { font: 'inter' });
  adopted.setState({ settings: initialSettings({ font: 'inter' }) });
  releaseAdoption({ ok: true });
  assert.equal(await adoptedRun, false,
    'a graph adopted before acknowledgement must not complete an old Appearance transaction');
  assert.equal(adopted.calls.requires, 1,
    'graph adoption must require authoritative recovery even when the visible value matches');

  const blocked = buildHarness();
  blocked.setRecovery(true);
  assert.equal(await blocked.api.commit('tog-urls', { showUrls: false }), false,
    'Appearance must refuse to mutate while authoritative recovery is already required');
  assert.equal(blocked.calls.persists, 0,
    'recovery preflight must stop before persistence');
  assert.equal(blocked.state().settings.showUrls, true,
    'recovery preflight must leave the setting untouched');
  assert.equal(blocked.calls.recoveries, 1,
    'recovery preflight must return to the existing recovery layer');

  const plugin = buildHarness({
    theme: 'tabento',
    size: 'large',
    width: 'wide',
    font: 'lora',
    showUrls: false,
    animate: false,
  });
  assert.equal(plugin.api.active(plugin.state().settings), true,
    'any optional theme, typeface, or width must mark the Style plugin active');
  assert.deepEqual({ ...plugin.api.resetPatch(plugin.state().settings) }, {
    theme: 'folio',
    width: 'normal',
    font: 'dm',
  }, 'Style plugin reset must touch only its optional appearance keys');
  assert.equal(plugin.state().settings.size, 'large',
    'Style plugin reset modeling must leave core density untouched');
  assert.equal(plugin.state().settings.showUrls, false,
    'Style plugin reset modeling must leave card details untouched');
  assert.equal(plugin.state().settings.animate, false,
    'Style plugin reset modeling must leave Motion untouched');

  console.log('Appearance settings contract tests passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
