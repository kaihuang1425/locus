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
// Appearance is drawn by the Settings page layer (2026-11 canvas board).
const appearanceCss = extractBetween('   SETTINGS PAGE (2026-11 canvas)', '\n/* ----', css);
const appearanceSource = extractBetween('const APPEARANCE_SETTING_KEYS', '\n// SETTINGS PAGE');
const appearanceCommitSource = extractBetween('async function commitAppearanceSettingsChange', '\nfunction renderPrivacySettings');
const themeBuilderSource = extractBetween('const APPEARANCE_THEME_CHOICES', '\nconst CAPTURE_SETTING_CONTROL_IDS');

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
  'tog-urls',
  'tog-anim',
  'appearance-status',
  'seg-font',
  'appearance-preview',
  'appearance-reset-row',
  'appearance-reset',
]) {
  assert.equal(countId(id), 1, `Appearance must preserve exactly one #${id}`);
}

assert.match(appearanceHtml,
  /id="appearance-profile"[^>]*aria-labelledby="appearance-theme-heading"[^>]*aria-describedby="appearance-status"[^>]*aria-busy="false"/,
  'Appearance must expose one named, described, busy-capable preference boundary');
// Round 2, Kai's decision 1: one picker for every theme, a named radio group.
assert.match(appearanceHtml,
  /<h3 class="stg-gh" id="appearance-theme-heading" data-i18n="settings\.theme">Theme<\/h3>[\s\S]*id="theme-grid"[^>]*role="radiogroup"[^>]*aria-labelledby="appearance-theme-heading"/,
  'every theme is one picker: a radio group under the visible Theme heading (decision 1)');
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
// Round 2, Kai's decisions 1 and 2 (ported from "optional themes, typefaces,
// and column width must stay inside one available local Style plugin").
assert.doesNotMatch(appearanceHtml, /<details|plugin|Plugin|外掛|data-state="available"|>Available</,
  'Appearance has no plugin disclosure and no Available chip: themes and the typeface are ordinary choices (decision 1)');
assert.ok(appearanceHtml.indexOf('id="theme-grid"') < appearanceHtml.indexOf('id="seg-font"')
  && appearanceHtml.indexOf('id="seg-font"') < appearanceHtml.indexOf('id="seg-size"')
  && appearanceHtml.indexOf('id="seg-size"') < appearanceHtml.indexOf('id="tog-urls"')
  && appearanceHtml.indexOf('id="tog-urls"') < appearanceHtml.indexOf('id="tog-anim"')
  && appearanceHtml.indexOf('id="tog-anim"') < appearanceHtml.indexOf('id="appearance-preview"')
  && appearanceHtml.indexOf('id="appearance-preview"') < appearanceHtml.indexOf('id="appearance-reset"'),
  'Appearance reads Theme, then Typeface, Item size, Show URLs and Animations beside the Preview, then Reset appearance');
assert.match(appearanceHtml,
  /<label class="stg-l" for="seg-font" data-i18n="settings\.fontFamily">Typeface<\/label>\s*<select id="seg-font" class="stg-select stg-font" data-settings-preference-control/,
  'Typeface is an ordinary labelled row (decision 1)');
assert.equal((appearanceHtml.match(/<option value="[a-z-]+" data-font="[a-z-]+"/g) || []).length, 8,
  'all eight typefaces stay choosable, each shown in its own face');
assert.equal(countId('seg-width') + countId('appearance-width-narrow') + countId('appearance-width-normal') + countId('appearance-width-wide'), 0,
  'Column width is removed (decision 2)');
assert.match(appearanceHtml,
  /<figure class="stg-pv" id="appearance-preview" aria-labelledby="appearance-preview-cap">\s*<figcaption class="stg-pvcap" id="appearance-preview-cap" data-i18n="settings\.preview">Preview<\/figcaption>\s*<div class="stg-pvg" aria-hidden="true">/,
  'the board\'s live Preview sits beside the controls, labelled, its sample hidden from assistive technology (decision 2)');
assert.match(appearanceHtml,
  /<div class="stg-reset" id="appearance-reset-row" hidden>\s*<button id="appearance-reset" class="stg-btn" type="button" data-settings-preference-control aria-describedby="appearance-reset-hint">/,
  'Reset appearance is one hidden-until-changed action with its consequence described');
assert.doesNotMatch(appearanceHtml, /theme-cycle-btn|Cycle theme|style="|clean &amp; modern|geometric minimal|coder/,
  'Appearance must remove the cycling shortcut, inline font residue, and prototype marketing labels');

// Round 2, Kai's decision 1 (ported from "System, Locus Light, and Locus Dark
// must be the only promoted color modes" and "legacy-compatible visual variants
// must render only into the optional Style plugin").
assert.match(themeBuilderSource,
  /const APPEARANCE_THEME_CHOICES = Object\.freeze\(\[\n  \{ id: 'auto'[^\n]*\n  \{ id: 'folio'[^\n]*\n  \{ id: 'folio-dark'[^\n]*\n  \.\.\.THEMES\.filter\(theme => theme\.id !== 'folio' && theme\.id !== 'folio-dark'\)/,
  'System, Locus Light and Locus Dark come first, then every other bundled theme, in one picker (decision 1)');
assert.match(themeBuilderSource,
  /function createThemeChoiceButton[\s\S]*document\.createElement\('button'\)[\s\S]*button\.type = 'button'[\s\S]*setAttribute\('role', 'radio'\)[\s\S]*aria-checked[\s\S]*commitAppearanceSettingsChange/,
  'every theme is a native button with the radio role and checked state, using the acknowledged preference boundary');
assert.match(themeBuilderSource,
  /for \(const choice of APPEARANCE_THEME_CHOICES\) grid\.appendChild\(createThemeChoiceButton\(choice\)\);/,
  'every theme renders into the one picker (decision 1)');
assert.doesNotMatch(themeBuilderSource, /packGrid|theme-pack-grid|compact: true|isCoreAppearanceTheme/,
  'no second, hidden theme grid remains');
assert.match(themeBuilderSource,
  /mini\.dataset\.theme = id;/,
  'each card\'s preview carries its own theme, so it is drawn in that theme\'s colours');
assert.doesNotMatch(themeBuilderSource, /card\.innerHTML|document\.createElement\('div'\).*theme-card|State\.persist\(\)|cycleTheme/,
  'theme construction must not restore pointer-only cards, fire-and-forget writes, or theme cycling');
assert.doesNotMatch(source, /theme-cycle-btn|function cycleTheme\(|palette\.nextTheme|action\.cycleTheme/,
  'optional themes must not leak into a primary shortcut or cycling control');

for (const key of [
  'settings.theme',
  'settings.theme.system',
  'settings.theme.systemHint',
  'settings.theme.light',
  'settings.theme.lightHint',
  'settings.theme.dark',
  'settings.theme.darkHint',
  'settings.densityHint',
  'settings.fontFamily',
  'settings.font.systemName',
  'settings.showUrlsHint',
  'settings.animations',
  'settings.animationsHint',
  'settings.appearanceIdle',
  'settings.appearanceSaving',
  'settings.appearanceSaved',
  'settings.appearanceFailed',
  'settings.preview',
  'settings.previewGroup',
  'settings.previewTodo',
  'settings.resetAppearance',
  'settings.resetAppearanceHint',
  'settings.resetAppearanceDone',
]) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.equal((source.match(new RegExp(`^\\s{4}'${escaped}':`, 'gm')) || []).length, 2,
    `${key} must exist exactly once in English and once in native zh-TW`);
}
// Round 2, Kai's decision 1 (ported from "zh-TW must use the native interface
// term 樣式外掛 for the optional Style plugin"): no plugin, in either language.
for (const key of ['settings.stylePack', 'settings.stylePackHint', 'settings.stylePackAvailable', 'settings.stylePackActive',
  'settings.moreThemes', 'settings.moreThemesHint', 'settings.stylePackReset', 'settings.stylePackResetHint', 'settings.stylePackResetDone',
  'settings.columnWidth', 'settings.columnWidthHint', 'settings.width.narrow', 'settings.width.normal', 'settings.width.wide',
  'settings.themeMode', 'settings.themeModeHint', 'settings.cardDetails', 'settings.cardDetailsHint', 'settings.fontFamilyHint']) {
  assert.equal((source.match(new RegExp(`^\\s{4}'${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':`, 'gm')) || []).length, 0,
    `${key} is gone from English and zh-TW (decisions 1 and 2)`);
}
assert.doesNotMatch(source.match(/\n {4}'settings\.[^\n]*/g).join('\n'), /plugin|Plugin|外掛/,
  'no Settings string says plugin (外掛) in either language (decision 1)');
assert.ok(source.includes("'settings.appearanceSub': '主題、字體、項目大小與動畫。'"),
  'zh-TW Appearance scope names the theme, typeface, item size and animations');
for (const [id, en] of [['dark', 'Indigo Dark'], ['light', 'Indigo Light'], ['solarized-dark', 'Solarized Dark'], ['solarized-light', 'Solarized Light']]) {
  assert.match(source, new RegExp(`\\{ id:'${id}',\\s*label:'${en}',`),
    `the ${id} theme is named ${en} in both languages; its id is unchanged (round 2 rename)`);
}
assert.doesNotMatch(source, /label:'(?:Light|Dark|Solar\. Dark|Solar\. Light)'/,
  'the old Light, Dark and Solar. names are gone');

assert.match(appearanceSource,
  /const APPEARANCE_SETTING_KEYS = new Set\(\[\n  'theme',\n  'size',\n  'font',\n  'showUrls',\n  'animate',\n\]\);/,
  'the Appearance boundary allowlists exactly its five stored keys; Column width is gone (decision 2)');
assert.match(appearanceSource,
  /function appearanceSettingsPatchIsValid[\s\S]*THEMES\.some[\s\S]*\['compact', 'normal', 'large'\][\s\S]*typeof value !== 'boolean'/,
  'Appearance must validate every persisted value before mutation');
assert.doesNotMatch(appearanceSource, /'narrow'|'wide'|'width'/,
  'nothing in Appearance writes or validates a column width (decision 2)');
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
  /\.stg-themes \{[^}]*display: grid;[^}]*grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/,
  /\.stg-tc \{[^}]*min-height: 44px;[^}]*border-radius: 16px;/,
  /\.stg-ring \{[^}]*transform: translate\(calc\(var\(--stg-rx, 0px\) - 5px\), calc\(var\(--stg-ry, 0px\) - 5px\)\);/,
  /\.stg-ring\.is-live \{ transition: transform \.3s var\(--today-ease\), width \.3s var\(--today-ease\), height \.3s var\(--today-ease\)/,
  /\.stg-seg \{[^}]*width: 276px;[^}]*max-width: 100%;/,
  /\.stg-thumb \{[^}]*left: calc\(4px \+ \(100% - 8px\) \/ var\(--stg-n\) \* var\(--stg-i, 1\)\);[^}]*transition: left \.3s var\(--today-ease\)/,
  /\.stg-pvc \{[^}]*padding: calc\(12px \+ var\(--dn-pad-y\)\) calc\(12px \+ var\(--dn-pad-x\)\);[^}]*transition: padding \.28s ease/,
  /body\[data-show-urls="off"\] \.stg-pv-uw \{ grid-template-rows: 0fr; opacity: 0; \}/,
  /\.stg-status:not\(\[data-state="error"\]\) \{[^}]*position: absolute;[^}]*clip: rect\(0 0 0 0\)/,
]) {
  assert.match(appearanceCss, contract, `Appearance must use the Settings page layer: ${contract}`);
}
// The board's System preview is two flat halves, never a gradient.
assert.doesNotMatch(appearanceCss, /(?:linear|radial|conic)-gradient\s*\(/,
  'Appearance must not use decorative gradients');
assert.match(appearanceCss,
  /@container stgthemes \(max-width: 619px\) \{ \.stg-themes \{ grid-template-columns: repeat\(4, [\s\S]*@container stgthemes \(max-width: 439px\) \{ \.stg-themes \{ grid-template-columns: repeat\(3, [\s\S]*@container stgthemes \(max-width: 299px\) \{ \.stg-themes \{ grid-template-columns: repeat\(2, /,
  'the picker steps from five columns to four, three and two as its width shrinks; the ring is measured, so it follows');
assert.match(appearanceCss,
  /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*#settings-drawer \*[\s\S]*transition:\s*none !important/,
  'Appearance must inherit the Settings reduced-motion boundary');
assert.match(appearanceCss,
  /body\[data-anim="off"\] #settings-drawer \*,[\s\S]*transition: none !important/,
  'the product Motion preference must suppress Appearance transitions immediately');
assert.match(appearanceCss,
  /@media \(forced-colors:\s*active\)[\s\S]*\.stg-ring \{ border-color: Highlight; \}[\s\S]*\.stg-tc\[aria-checked="true"\] \.stg-tn,\n  \.stg-seg button\[aria-pressed="true"\][\s\S]*\{ color: Highlight; \}/,
  'forced colors must preserve the active theme, font, and density indicators');
assert.match(themeBuilderSource,
  /const ring = document\.createElement\('span'\);[\s\S]*ring\.className = 'stg-ring';[\s\S]*grid\.appendChild\(ring\);/,
  'the picker carries one ring that slides to the chosen theme');
assert.match(themeBuilderSource,
  /hint\.className = 'th-meta sr-only';/,
  'theme hints stay in the button, hidden visually');

const CONTROL_IDS = [
  'appearance-theme-auto',
  'appearance-theme-folio',
  'appearance-theme-folio-dark',
  'appearance-theme-tabento',
  'appearance-size-compact',
  'appearance-size-normal',
  'appearance-size-large',
  'seg-font',
  'tog-urls',
  'tog-anim',
  'appearance-reset',
];

function initialSettings(overrides = {}) {
  return {
    theme: 'folio',
    size: 'normal',
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
  const calls = { persists: 0, applies: 0, renders: 0, focuses: 0, recoveries: 0, requires: 0, withdraws: 0 };
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
    // Settings' "Use core defaults" Undo, which a newer accepted choice ends.
    withdrawAppearanceResetUndo: () => { calls.withdraws += 1; },
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
    '  changed: appearanceLookIsChanged,\n' +
    '  resetPatch: appearanceResetPatch,\n' +
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
  assert.equal(pending.calls.withdraws, 0,
    'nothing is withdrawn before storage accepts the choice');
  releaseReceipt({ ok: true });
  assert.equal(await runPending, true,
    'an exact acknowledged Appearance choice must complete');
  assert.equal(pending.calls.withdraws, 1,
    'an accepted Appearance choice withdraws an earlier Reset appearance Undo, so it can never overwrite this newer choice (finding R3-7)');
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
  const adoptedRun = adopted.api.commit('seg-font', { font: 'inter' });
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

  // Round 2: Reset appearance puts back everything on Appearance (approved
  // default 3); a stored column width is never read, written or reset.
  const changed = buildHarness({
    theme: 'tabento',
    size: 'large',
    width: 'wide',
    font: 'lora',
    showUrls: false,
    animate: false,
  });
  assert.equal(changed.api.changed(changed.state().settings), true,
    'any theme, typeface, size, URL or animation change offers Reset appearance');
  assert.deepEqual({ ...changed.api.resetPatch(changed.state().settings) }, {
    theme: 'folio',
    size: 'normal',
    font: 'dm',
    showUrls: true,
    animate: true,
  }, 'Reset appearance resets the theme, typeface, item size, URLs and animations, and never the retired column width (default 3, decision 2)');
  assert.equal(await changed.api.commit('appearance-reset', changed.api.resetPatch(changed.state().settings)), true,
    'the reset is one acknowledged write');
  assert.equal(changed.calls.persists, 1, '…one write for all five choices');
  assert.equal(changed.state().settings.width, 'wide',
    'a stored column width is carried untouched (decision 2: no schema bump, as settings.showLanding in 3875e85)');
  assert.equal(changed.api.changed(changed.state().settings), false, 'after the reset nothing differs, so Reset hides');
  assert.equal(await changed.api.commit('tog-urls', { width: 'narrow' }), false,
    'a column width can no longer be written (decision 2)');
  for (const [settings, expected] of [
    [{}, {}],
    [{ theme: 'auto' }, { theme: 'folio' }],
    [{ showUrls: undefined, animate: 'yes' }, {}],
  ]) {
    assert.deepEqual({ ...changed.api.resetPatch(settings) }, expected,
      `Reset compares with the defaults as the app reads them: ${JSON.stringify(settings)}`);
  }

  console.log('Appearance settings contract tests passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
