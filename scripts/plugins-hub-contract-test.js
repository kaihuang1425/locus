const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');

function extractBetween(startMarker, endMarker, input) {
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

const hubHtml = extractBetween('<!-- ══════ OPTIONAL PLUGINS ══════ -->', '<!-- ══════ ABOUT ══════ -->', html);
const hubOverlayCss = extractBetween('/* ═══ TOOLS HUB ═══ */', '/* About dialog', css);
const hubCss = extractBetween('.hub-panel {', '/* ═══ POMODORO ═══ */', css);
const hubSource = extractBetween('const PLUGIN_TOOL_OPENERS', '// ════════════════════════════════════════════════════════════════\n// POMODORO', source);

for (const id of [
  'tools-hub',
  'plugins-title',
  'plugins-description',
  'plugins-local-note',
  'plugins-list',
  'hub-close',
]) {
  assert.equal(countId(id), 1, `Plugins must preserve exactly one #${id}`);
}

assert.match(
  hubHtml,
  /id="tools-hub"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="plugins-title"[^>]*aria-describedby="plugins-description plugins-local-note"/,
  'Plugins must be one named and fully described modal dialog',
);
assert.match(
  hubHtml,
  /id="hub-close"[^>]*type="button"[^>]*aria-label="Close tools"[^>]*data-i18n-aria-label="plugins\.close"/,
  'Tools must expose a localized native Close control (Plugins renamed Tools, Kai 2026-11-07)',
);
assert.match(
  hubHtml,
  /id="plugins-list"[^>]*aria-label="Available tools"[^>]*data-i18n-aria-label="plugins\.availableList"/,
  'the optional registry must have a localized list name',
);

const expectedTools = ['pomodoro', 'finance', 'subs', 'habits', 'water', 'books', 'goals', 'workout'];
const actualTools = [...hubHtml.matchAll(/<button class="hub-card"[^>]*data-tool="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(actualTools, expectedTools, 'the hub must expose only the eight real packaged research tools');
assert.equal((hubHtml.match(/class="hub-entry"/g) || []).length, expectedTools.length,
  'each packaged plugin must own one native list row');
for (const tool of expectedTools) {
  assert.match(
    hubHtml,
    new RegExp(`data-tool="${tool}"[^>]*aria-labelledby="plugin-${tool}-name plugin-${tool}-open"[^>]*aria-describedby="plugin-${tool}-desc plugin-${tool}-state"`),
    `${tool} must name its action, description, and real availability`,
  );
  for (const suffix of ['name', 'desc', 'state', 'open']) {
    assert.equal(countId(`plugin-${tool}-${suffix}`), 1, `${tool} must expose one #plugin-${tool}-${suffix}`);
  }
}
assert.doesNotMatch(hubHtml, /turn on|enable|install|marketplace|style="|hub-card-icon|[\u{1F300}-\u{1FAFF}]/u,
  'the registry must not imply enablement or restore inline, emoji, or marketplace prototype residue');

for (const key of [
  'plugins.title',
  'plugins.eyebrow',
  'plugins.subtitle',
  'plugins.localNote',
  'plugins.availableList',
  'plugins.available',
  'plugins.open',
  'plugins.close',
  ...expectedTools.flatMap(tool => [`plugins.${tool}.name`, `plugins.${tool}.desc`]),
]) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.equal((source.match(new RegExp(`^\\s{4}'${escaped}':`, 'gm')) || []).length, 2,
    `${key} must exist exactly once in English and once in native zh-TW`);
}
assert.ok(source.includes("'plugins.subtitle': '已內建在此研究版，需要時直接開啟，不必下載或登入。'"),
  'zh-TW must describe the packaged research boundary without translated enablement language');
assert.ok(source.includes("'plugins.localNote': '工具資料會留在此瀏覽器設定檔中。'"),
  'zh-TW must state the browser-profile storage boundary directly');
// Plugins became Tools (Kai, 2026-11-07, round 2 board default 2): the visible
// words change in both languages; the keys, ids and the tools stay.
for (const [key, en, zh] of [
  ['action.plugins', 'Tools', '工具'],
  ['plugins.title', 'Tools', '工具'],
  ['plugins.localNote', 'Tool data stays in this browser profile.', '工具資料會留在此瀏覽器設定檔中。'],
  ['plugins.availableList', 'Available tools', '可使用的工具'],
  ['plugins.close', 'Close tools', '關閉工具'],
]) {
  assert.ok(source.includes(`'${key}': '${en}',`) && source.includes(`'${key}': '${zh}',`),
    `${key} reads "${en}" / "${zh}" (Plugins renamed Tools, 2026-11-07)`);
}
assert.doesNotMatch(source, /^\s{4}'(?:action\.plugins|menu\.plugins|plugins\.(?:title|localNote|availableList|close))': '[^']*(?:Plugin|plugin|外掛)/m,
  'no visible Tools string still says Plugin (2026-11-07)');
assert.match(hubHtml, /<h2 id="plugins-title" data-i18n="plugins\.title">Tools<\/h2>/,
  'the Tools window is titled Tools before the language loads');
assert.ok(source.includes("'plugins.available': '可直接使用'"),
  'zh-TW must describe real availability rather than a fictional installation state');

assert.match(hubOverlayCss, /#tools-hub\s*\{[^}]*backdrop-filter:\s*none[^}]*display:\s*grid[^}]*place-items:\s*center/s,
  'the hub must use a stable centered scrim without glass blur');
assert.doesNotMatch(hubOverlayCss, /(?:linear|radial|conic)-gradient\s*\(|animation:/,
  'the optional boundary must not restore gradient or ornamental entrance effects');
for (const contract of [
  /\.hub-panel\s*\{[^}]*width:\s*min\(760px,\s*100%\)[^}]*max-height:\s*calc\(100dvh - 32px\)[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)[^}]*border-top:\s*3px solid var\(--index-locator/,
  /\.hub-hd\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto[^}]*background:\s*var\(--index-registry/,
  /\.hub-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[^}]*overflow-y:\s*auto/,
  /\.hub-card\s*\{[^}]*grid-template-columns:\s*38px minmax\(0,\s*1fr\) auto[^}]*border-left:\s*3px solid transparent[^}]*border-radius:\s*3px/,
  /\.hub-card:hover,[\s\S]*\.hub-card:focus-visible\s*\{[^}]*border-left-color:\s*var\(--index-locator/,
]) {
  assert.match(hubCss, contract, `Plugins must use the flat Locus Index registry contract: ${contract}`);
}
assert.doesNotMatch(hubCss, /(?:linear|radial|conic)-gradient\s*\(|translateY\(|scale\(|hub-card-icon/,
  'plugin rows must not use dashboard gradients, lift, scale, or retired icon tiles');
assert.match(hubCss, /@media \(max-width:\s*800px\)[\s\S]*#tools-hub\s*\{[^}]*padding:\s*16px[^}]*\}[\s\S]*\.hub-panel\s*\{[^}]*max-height:/,
  'the hub must fit the required 800 px layout deliberately');
assert.match(hubCss, /@media \(max-width:\s*620px\)[\s\S]*\.hub-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  'the registry must become one column at 620/520 px');
assert.match(hubCss, /body\[data-anim="off"\] #tools-hub,[\s\S]*transition:\s*none !important/,
  'the product Motion preference must suppress all hub transitions');
assert.match(hubCss, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*#tools-hub \*[\s\S]*transition:\s*none !important/,
  'the hub must honor OS reduced motion independently');
assert.match(css, /@media \(forced-colors:\s*active\)[\s\S]*\.hub-card:focus-visible[^}]*outline-color:\s*Highlight[\s\S]*\.hub-card-open[^}]*LinkText/,
  'forced colors must preserve locator focus and the Open affordance');

assert.match(hubSource, /const PLUGIN_TOOL_OPENERS = Object\.freeze\(\{[\s\S]*pomodoro:\s*openPomo[\s\S]*workout:\s*openWorkout/,
  'one allowlisted registry must route every real packaged tool');
assert.match(hubSource, /function openToolsHub\(opener = null\)[\s\S]*rememberOpener\(hub, opener\)[\s\S]*lockBodyScroll\(\)[\s\S]*querySelector\('\.hub-card'\)[\s\S]*focus/,
  'opening must record the real opener, lock the background, and focus the first plugin');
assert.match(hubSource, /function setToolsHubInterlock\(enabled\)[\s\S]*document\.body\.children[\s\S]*setElementInertOwner\(child, 'plugins-hub', enabled\)/,
  'the modal must make every lower body surface inert under an owner-scoped interlock');
assert.match(hubSource, /function closeToolsHub\(\)[\s\S]*classList\.contains\('hidden'\)[\s\S]*setToolsHubInterlock\(false\)[\s\S]*unlockBodyScroll\(\)[\s\S]*restoreOpener\(hub\)/,
  'closing must be idempotent and restore the app-level opener');
assert.match(hubSource, /function activateToolsHubPlugin\(tool\)[\s\S]*classList\.contains\('hidden'\)[\s\S]*typeof openPlugin !== 'function'[\s\S]*closeToolsHub\(\)[\s\S]*openPlugin\(\)/,
  'a tool launch must reject unknown IDs and transfer focus only after closing the hub');
assert.match(hubSource, /event\.target === hub[\s\S]*event\.key === 'Escape'[\s\S]*stopPropagation\(\)[\s\S]*event\.key === 'Tab'[\s\S]*trapTabKey\(event, hub\)/,
  'backdrop, Escape, and Tab must share one modal boundary');
assert.doesNotMatch(hubSource, /State\.|\.persist|chrome\.|fetch\(|XMLHttpRequest|plugins\s*=/,
  'availability and hub navigation must create no stored enablement state, permissions, or network behavior');
assert.match(source, /function secondaryNavigationItems\(opener = null\)[\s\S]*tr\('action\.plugins'\)[\s\S]*openToolsHub\(opener\)/,
  'More navigation must hand the real button to the hub focus contract');
assert.match(source, /function openAppMenu\(anchor\)[\s\S]*getElementById\('more-btn'\)[\s\S]*positionedAnchor[\s\S]*openMoreMenu\(opener, positionedAnchor\)/,
  'the optional Welcome entry must reuse the visible More owner instead of a second plugin route');

function createClassList(hidden = true) {
  const values = new Set(hidden ? ['hidden'] : []);
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    contains(value) { return values.has(value); },
  };
}

function buildHarness() {
  const calls = {
    remember: [],
    restore: 0,
    locks: 0,
    unlocks: 0,
    pluginFocus: 0,
    opened: [],
    openedFrom: [],
    trapped: 0,
    interlocks: [],
  };
  const opener = { id: 'more-btn', focus() { document.activeElement = opener; } };
  const firstPlugin = { id: 'plugin-pomodoro', dataset: { tool: 'pomodoro' }, focus() { calls.pluginFocus += 1; document.activeElement = firstPlugin; } };
  const cards = [firstPlugin];
  const listeners = {};
  const hub = {
    id: 'tools-hub',
    classList: createClassList(true),
    querySelector(selector) { return selector === '.hub-card' ? firstPlugin : null; },
    querySelectorAll(selector) { return selector === '.hub-card' ? cards : []; },
    addEventListener(type, listener) { listeners[type] = listener; },
  };
  const recovery = { id: 'state-recovery-overlay', classList: createClassList(true) };
  const app = { id: 'app', dataset: {}, inert: false };
  const topbarButton = { id: 'plugins-btn', onclick: null };
  const closeButton = { id: 'hub-close', onclick: null };
  const elements = new Map([
    ['tools-hub', hub],
    ['state-recovery-overlay', recovery],
    ['plugins-btn', topbarButton],
    ['hub-close', closeButton],
  ]);
  const document = {
    activeElement: opener,
    body: { children: [app, hub, recovery] },
    getElementById(id) { return elements.get(id) || null; },
  };
  const openTool = name => () => {
    calls.opened.push(name);
    calls.openedFrom.push(document.activeElement?.id || null);
  };
  const context = vm.createContext({
    document,
    requestAnimationFrame: callback => callback(),
    rememberOpener(element, explicit) { calls.remember.push({ element, explicit }); },
    restoreOpener() { calls.restore += 1; opener.focus(); return true; },
    lockBodyScroll() { calls.locks += 1; },
    unlockBodyScroll() { calls.unlocks += 1; },
    setElementInertOwner(element, owner, enabled) { calls.interlocks.push({ element, owner, enabled }); element.inert = enabled; },
    trapTabKey() { calls.trapped += 1; },
    openPomo: openTool('pomodoro'),
    openFin: openTool('finance'),
    openSubsTracker: openTool('subs'),
    openHabits: openTool('habits'),
    openWater: openTool('water'),
    openBooks: openTool('books'),
    openGoals: openTool('goals'),
    openWorkout: openTool('workout'),
  });
  vm.runInContext(`${hubSource}\nglobalThis.__hub = { openToolsHub, closeToolsHub, activateToolsHubPlugin, bindToolsHub };`, context);
  return { api: context.__hub, calls, hub, recovery, app, opener, firstPlugin, listeners, topbarButton, closeButton };
}

const harness = buildHarness();
assert.equal(harness.api.openToolsHub(harness.opener), true, 'a closed hub must open');
assert.equal(harness.calls.remember.length, 1, 'opening must remember one explicit app-level opener');
assert.equal(harness.calls.remember[0].explicit, harness.opener, 'the real More button must own focus return');
assert.equal(harness.calls.locks, 1, 'opening must lock background scroll once');
assert.equal(harness.app.inert, true, 'opening must make the app background inert');
assert.equal(harness.calls.pluginFocus, 1, 'opening must focus the first available plugin');
assert.equal(harness.api.openToolsHub(harness.opener), false, 'a duplicate open must be refused');
assert.equal(harness.calls.locks, 1, 'a duplicate open must not leak another scroll lock');
assert.equal(harness.api.activateToolsHubPlugin('unknown'), false, 'an unknown plugin ID must do nothing');
assert.equal(harness.hub.classList.contains('hidden'), false, 'unknown plugin input must leave the hub available');
assert.equal(harness.api.activateToolsHubPlugin('pomodoro'), true, 'an allowlisted plugin must open');
assert.equal(harness.hub.classList.contains('hidden'), true, 'tool launch must close the hub first');
assert.equal(harness.calls.unlocks, 1, 'tool launch must release the hub scroll lock');
assert.equal(harness.app.inert, false, 'tool handoff must release the hub background owner');
assert.equal(harness.calls.restore, 1, 'tool launch must restore the real app opener before handoff');
assert.deepEqual(harness.calls.opened, ['pomodoro'], 'tool launch must call only its allowlisted opener');
assert.deepEqual(harness.calls.openedFrom, ['more-btn'], 'the tool must inherit a visible app-level focus owner');
assert.equal(harness.api.closeToolsHub(), false, 'closing an already closed hub must be a no-op');
assert.equal(harness.calls.unlocks, 1, 'idempotent close must not underflow the scroll lock');

const bound = buildHarness();
assert.equal(bound.api.bindToolsHub(), true, 'the complete static hub must bind');
assert.equal(typeof bound.topbarButton.onclick, 'function', 'the stable topbar entry must retain a guarded binding');
assert.equal(typeof bound.closeButton.onclick, 'function', 'the Close button must bind');
assert.equal(typeof bound.listeners.click, 'function', 'backdrop dismissal must bind');
assert.equal(typeof bound.listeners.keydown, 'function', 'keyboard containment must bind');
bound.api.openToolsHub(bound.opener);
let prevented = 0;
let stopped = 0;
bound.listeners.keydown({ key: 'Tab', preventDefault() { prevented += 1; }, stopPropagation() { stopped += 1; } });
assert.equal(bound.calls.trapped, 1, 'Tab must remain in the plugin dialog');
bound.listeners.keydown({ key: 'Escape', preventDefault() { prevented += 1; }, stopPropagation() { stopped += 1; } });
assert.equal(prevented, 1, 'Escape must prevent lower-layer dismissal');
assert.equal(stopped, 1, 'Escape must stop before the global overlay stack');
assert.equal(bound.hub.classList.contains('hidden'), true, 'Escape must close only the hub');
assert.equal(bound.calls.restore, 1, 'Escape must restore the hub opener');

const recovery = buildHarness();
recovery.recovery.classList.remove('hidden');
assert.equal(recovery.api.openToolsHub(recovery.opener), false,
  'fail-closed state recovery must remain above optional plugins');
assert.equal(recovery.calls.locks, 0, 'blocked opening must create no scroll lock');

console.log('Plugins hub contract tests passed');
