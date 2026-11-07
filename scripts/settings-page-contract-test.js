'use strict';

// Contract test for the Settings page (canvas board Settings.dc.html): a page
// beside the rail with seven sections and a sliding pill, cards of rows whose
// switches have a springy knob, the theme preview that crossfades, the Plan
// section (Auto-plan rules and the AI companion off switch on the optional
// permission, no stored field), the download that fills before the shared
// receipt, and Privacy & data as one section. Production slices of newtab.js
// run in node:vm against a small fake DOM.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const source = read('newtab.js');
const css = read('newtab.css');
const html = read('newtab.html');
const manifest = JSON.parse(read('manifest.json'));
const ci = read('.github/workflows/ci.yml');
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const plain = value => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const eq = (actual, expected, message) => { assert.deepEqual(plain(actual), plain(expected), message); checks += 1; };

function between(start, end, input = source) {
  const from = input.indexOf(start);
  assert.ok(from >= 0, `${start} must remain extractable`);
  const to = input.indexOf(end, from + start.length);
  assert.ok(to > from, `${end} must follow ${start}`);
  return input.slice(from, to);
}
function extractFunction(name) {
  const match = new RegExp(`^(?:async )?function ${name}\\(`, 'm').exec(source);
  assert.ok(match, `${name} must remain a top-level function`);
  const end = source.indexOf('\n}\n', match.index);
  return source.slice(match.index, end + 2);
}

const markup = between('<!-- ══════ SETTINGS PAGE ══════ -->', '<!-- Paste links import -->', html);
const shellSource = between('// ── Settings page shell (2026-11 canvas)', '\nfunction applySettings() {');
const sectionsSource = between('// Seven sections, as on the board.', '\nfunction prefersReducedMotion() {');
const layerStart = css.indexOf('   SETTINGS PAGE (2026-11 canvas)');
const layer = css.slice(layerStart, css.indexOf('\n/* ----', layerStart));

// ── 1. The page: heading, seven sections with a pill, no Close ──────────
function testMarkup() {
  ok(/<div id="settings-drawer" class="hidden" role="region" aria-labelledby="sp-side-title" data-settings-layout="board">/.test(markup),
    'Settings is a named region (a page beside the rail), not a modal dialog');
  ok(!/aria-modal/.test(markup), 'the page is not modal: the rail stays usable');
  ok(/<h1 class="stg-title" id="sp-side-title" data-i18n="settings\.title">Settings<\/h1>/.test(markup), 'one big Settings heading');
  ok(/<h2 class="stg-h" id="sp-title" data-i18n="settings\.general">General<\/h2>/.test(markup), 'the section name is the second heading');
  ok(/<p class="sr-only" id="sp-sub"/.test(markup), 'the section sub-line stays as a hidden description');
  ok(/<button id="drawer-x" type="button" hidden aria-hidden="true" tabindex="-1"><\/button>/.test(markup),
    'no visible Close: the rail and Escape leave the page (the id stays for compatibility)');
  const tabs = [...markup.matchAll(/<button class="dt[^"]*" type="button" data-tab="([a-z]+)" aria-current="(page|false)">\s*<svg[^>]*aria-hidden="true">[\s\S]*?<\/svg>\s*<span data-i18n="([^"]+)">/g)];
  eq(tabs.map(m => m[1]), ['general', 'appearance', 'capture', 'plan', 'shortcuts', 'privacy', 'about'], 'the board\'s seven sections, in order');
  eq(tabs.map(m => m[3]), ['settings.general', 'settings.appearance', 'settings.capture', 'settings.plan', 'settings.shortcuts', 'settings.privacyData', 'settings.about'], 'each section is labelled');
  ok(/<nav class="stg-nav" id="drawer-tabs" aria-label="Settings sections" data-i18n-aria-label="settings\.sectionsAria">\s*<span class="stg-pill" aria-hidden="true"><\/span>/.test(markup),
    'the list is a named nav with one sliding pill');
  for (const pane of ['general', 'appearance', 'capture', 'plan', 'shortcuts', 'privacy', 'storage', 'data', 'about']) {
    ok(new RegExp(`<div class="drawer-sections stg-pane(?: hidden)?" id="dp-${pane}">`).test(markup), `pane #dp-${pane} exists`);
  }
  ok(!/sp-side-foot|privacyFirst|sp-hd-copy|class="field-lbl"|data-transfer-direction|capture-contract-kicker|privacy-contract-kicker/.test(markup),
    'the side footnote, header copy, ledger labels and kickers are gone');
}

// ── 2. Rows: every switch is a labelled native checkbox with a knob ─────
function testRows() {
  const switches = [...markup.matchAll(/<span class="stg-sw"><input type="checkbox" role="switch" id="([a-z-]+)" class="stg-sw-in"[^>]*><span class="stg-sw-track" aria-hidden="true"><span class="stg-knob"><\/span><\/span><\/span>/g)].map(m => m[1]);
  eq(switches, ['tog-hibernate', 'tog-autoswitch', 'tog-urls', 'tog-anim', 'tog-capture-ask', 'tog-capture-remember', 'tog-capture-close',
    'tog-capture-dedupe', 'tog-capture-title', 'tog-capture-favicon', 'tog-plan-rollover', 'tog-plan-warn', 'tog-companion', 'tog-blur'],
    'every on/off setting is the board\'s switch');
  for (const id of switches) {
    ok(new RegExp(`<label class="stg-l" for="${id}"`).test(markup), `#${id} has a visible label`);
  }
  ok(!/<input type="checkbox" role="switch" id="tog-capture-ask"[^>]*\bchecked\b/.test(markup), 'Ask where to save stays an opt-in, off for new profiles');
  const described = [...markup.matchAll(/aria-describedby="([^"]+)"/g)].flatMap(m => m[1].split(' '));
  for (const id of new Set(described)) {
    ok(new RegExp(`id="${id}"`).test(markup), `#${id} (a description) exists`);
  }
  for (const id of ['general-hibernate-hint', 'capture-close-hint', 'capture-destination-hint', 'appearance-urls-hint', 'privacy-mask-toggle-hint', 'storage-usage-hint', 'data-export-hint']) {
    ok(new RegExp(`class="sr-only" id="${id}"`).test(markup), `#${id} stays as a visually hidden description`);
  }
  ok(/<section id="capture-contract" class="stg-contract sr-only"/.test(markup), 'the save contract is a hidden summary, not a diagram on the page');
  ok(/<p id="(?:general|appearance|privacy)-status" class="stg-status"/.test(markup) && /<p id="capture-policy-status" class="stg-status"/.test(markup),
    'each preference status speaks to assistive technology (and shows on failure)');
  ok(!/<svg/.test(between('<!-- ── General ── -->', '<!-- ── Appearance ── -->', markup)), 'General draws its chevron in CSS, no icon residue');
  ok(/<details id="general-workspace-plugin" class="stg-card stg-disc">/.test(markup)
    && /<details id="appearance-style-pack" class="stg-card stg-disc">/.test(markup)
    && /<details id="privacy-screen-plugin" class="stg-card stg-disc">/.test(markup), 'the three plugins stay one click away as disclosures');
}

// ── 3. Every earlier control is still on the page ───────────────────────
function testReachable() {
  for (const id of ['seg-language', 'show-tour-btn', 'theme-grid', 'seg-size', 'theme-pack-grid', 'seg-width', 'seg-font', 'appearance-pack-reset',
    'capture-destination', 'shortcuts-customize', 'shortcuts-global-list', 'shortcuts-filter', 'shortcuts-app-list', 'shortcuts-empty',
    'storage-bar-meter', 'storage-refresh', 'storage-breakdown', 'storage-open-archive', 'export-btn', 'import-json-btn', 'import-file',
    'bookmarks-btn', 'paste-import-btn', 'sp-about-version', 'settings-open-planner']) {
    eq((markup.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `#${id} is on the page once`);
  }
  ok(/<button id="shortcuts-clear" class="stg-btn" type="button" data-i18n="settings\.clearShortcutsFilter">Clear<\/button>/.test(markup), 'the empty shortcut list offers Clear');
  ok(/<span class="stg-export-fill" aria-hidden="true"><\/span>/.test(markup) && /class="stg-export-done"/.test(markup), 'the download button has its fill and its check');
  ok(/\.\.\.\['general', 'appearance', 'capture', 'plan', 'shortcuts', 'privacy', 'storage', 'data', 'about'\]/.test(read('scripts/quality-gates.js')),
    'the gates keep every pane id stable');
}

// ── 4. Capture copy names the popup's one-click Save too ────────────────
function testCaptureCopy() {
  ok(source.includes("'settings.captureDestinationHint': 'Used by Save in the toolbar popup, the keyboard shortcut and the context menu. If unavailable, saving stops and the source tab stays open.',"),
    'EN: the quick-save destination is used by the popup\'s Save as well');
  ok(source.includes("'settings.captureDestinationHint': '工具列彈出視窗的「儲存」、鍵盤快速鍵與右鍵選單都會存到這裡；若無法確認位置，會停止儲存並保留原分頁。',"),
    'zh-TW: the same, in Taiwan wording');
  ok(source.includes("'settings.captureOtherEntry': 'Popup, shortcut and context menu: {destination}',")
    && source.includes("'settings.captureOtherEntry': '彈出視窗、快速鍵與右鍵選單：{destination}',"), 'the contract summary names the popup too');
  ok(!/Used by the keyboard shortcut and context menu\./.test(source + html), 'the incomplete copy is gone');
}

// ── 5. A tiny DOM for the slices ────────────────────────────────────────
class FakeEl {
  constructor(tag = 'div', attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.attributes = new Map();
    this.dataset = {};
    this.styleProps = new Map();
    this.style = { setProperty: (k, v) => this.styleProps.set(k, String(v)), getPropertyValue: k => this.styleProps.get(k) || '' };
    this.classSet = new Set();
    this.listeners = {};
    this.textContent = '';
    this.title = '';
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.offsetLeft = 0;
    this.offsetTop = 0;
    this.offsetWidth = 120;
    this.offsetHeight = 44;
    this.reflows = 0;
    this.classLog = [];
    const el = this;
    this.classList = {
      add: (...names) => names.forEach(n => { el.classSet.add(n); el.classLog.push('+' + n); }),
      remove: (...names) => names.forEach(n => { el.classSet.delete(n); el.classLog.push('-' + n); }),
      toggle: (n, force) => { const on = force === undefined ? !el.classSet.has(n) : !!force; if (on) el.classSet.add(n); else el.classSet.delete(n); el.classLog.push((on ? '+' : '-') + n); return on; },
      contains: n => el.classSet.has(n),
    };
    for (const [k, v] of Object.entries(attrs)) this.setAttribute(k, v);
  }
  get id() { return this.attributes.get('id') || ''; }
  set id(v) { this.setAttribute('id', v); }
  get className() { return [...this.classSet].join(' '); }
  set className(v) { this.classSet = new Set(String(v).split(/\s+/).filter(Boolean)); }
  set innerHTML(v) { this._html = v; }
  get innerHTML() { return this._html || ''; }
  setAttribute(k, v) {
    if (k === 'class') { this.className = v; return; }
    if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v);
    this.attributes.set(k, String(v));
  }
  getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
  hasAttribute(k) { return this.attributes.has(k); }
  appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
  append(...kids) { kids.forEach(k => this.appendChild(k)); }
  replaceChildren(...kids) { this.children = []; kids.forEach(k => this.appendChild(k)); }
  get offsetWidthLive() { return this.offsetWidth; }
  addEventListener(type, fn, opts) { (this.listeners[type] = this.listeners[type] || []).push({ fn, once: !!opts?.once }); }
  dispatch(type, event = {}) { const list = this.listeners[type] || []; this.listeners[type] = list.filter(l => !l.once); list.forEach(l => l.fn(event)); }
  matches(selector) { return matchCompound(this, selector); }
  closest(selector) { let el = this; while (el) { if (el.matches(selector)) return el; el = el.parentElement; } return null; }
  descendants() { return this.children.flatMap(c => [c, ...c.descendants()]); }
  querySelectorAll(selector) { return queryAll(this, selector); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  focus() { this.ownerDocument.activeElement = this; }
  scrollIntoView(opts) { this.scrolledWith = opts; }
  getBoundingClientRect() { return { right: this.rectRight || 0 }; }
}
function matchCompound(el, selector) {
  return selector.split(',').some(alt => {
    const parts = alt.trim().match(/[#.]?[a-zA-Z0-9_-]+|\[[^\]]+\]/g) || [];
    return parts.every(part => {
      if (part.startsWith('#')) return el.id === part.slice(1);
      if (part.startsWith('.')) return el.classSet.has(part.slice(1));
      if (part.startsWith('[')) {
        const m = /^\[([a-z-]+)(?:="([^"]*)")?\]$/.exec(part);
        if (m[1] === 'role') return el.getAttribute('role') === m[2];
        return m[2] === undefined ? el.hasAttribute(m[1]) : el.getAttribute(m[1]) === m[2];
      }
      return el.tagName === part.toUpperCase();
    });
  });
}
function queryAll(scope, selector) {
  const steps = selector.trim().split(/\s+/);
  let set = [scope];
  for (const step of steps) set = set.flatMap(node => node.descendants().filter(d => d.matches(step)));
  return [...new Set(set)];
}
function makeDocument() {
  const body = new FakeEl('body');
  const doc = {
    body,
    activeElement: body,
    getElementById: id => (id ? body.descendants().find(el => el.id === id) || null : null),
    querySelectorAll: selector => queryAll(body, selector),
    querySelector: selector => queryAll(body, selector)[0] || null,
    createElement: tag => { const el = new FakeEl(tag); el.ownerDocument = doc; return el; },
  };
  const make = (tag, attrs = {}, parent = body) => { const el = new FakeEl(tag, attrs); el.ownerDocument = doc; parent.appendChild(el); return el; };
  return { doc, make };
}

// ── 6. Sections: seven in the list, Privacy & data shows three panes ─────
function sectionsHarness({ pending = null } = {}) {
  const { doc, make } = makeDocument();
  const drawer = make('div', { id: 'settings-drawer' });
  const main = make('div', { id: 'sp-main' }, drawer);
  const nav = make('nav', { id: 'drawer-tabs' }, main);
  make('span', { class: 'stg-pill' }, nav);
  const tabs = ['general', 'appearance', 'capture', 'plan', 'shortcuts', 'privacy', 'about'].map((tab, index) => {
    const b = make('button', { class: 'dt', 'data-tab': tab }, nav);
    b.offsetTop = 48 * index;
    return b;
  });
  const content = make('div', { id: 'stg-content' }, main);
  make('h2', { id: 'sp-title' }, content);
  make('p', { id: 'sp-sub' }, content);
  const panes = {};
  for (const pane of ['general', 'appearance', 'capture', 'plan', 'shortcuts', 'privacy', 'storage', 'data', 'about']) {
    panes[pane] = make('div', { id: `dp-${pane}`, class: 'drawer-sections hidden' }, content);
  }
  const rendered = [];
  const focused = [];
  const context = vm.createContext({
    document: doc,
    tr: key => `T:${key}`,
    State: { get: () => ({ settings: { animate: true } }) },
    prefersReducedMotion: () => false,
    settingsPreferencePendingTransaction: () => pending,
    focusSettingsPreferencePendingControl: () => { focused.push('pending'); return true; },
    ...Object.fromEntries(['renderGeneralSettings', 'renderAppearanceSettings', 'renderCaptureSettings', 'renderPlanSettings', 'renderShortcutsSettings',
      'renderPrivacySettings', 'renderStorageSettings', 'renderDataSettings', 'renderAboutSettings'].map(name => [name, () => rendered.push(name)])),
    moveSettingsPill: button => { context.__pill = button?.dataset.tab || null; return true; },
  });
  vm.runInContext(`${sectionsSource}\nglobalThis.__s = { setSettingsSection, SETTINGS_SECTIONS };`, context, { filename: 'settings-sections.js' });
  return { context, tabs, panes, rendered, focused, main, content, doc };
}

function testSections() {
  const h = sectionsHarness();
  eq(h.context.__s.SETTINGS_SECTIONS.filter(s => !s.nav).map(s => s.id), ['general', 'appearance', 'capture', 'plan', 'shortcuts', 'privacy', 'about'],
    'seven sections in the list');
  eq(h.context.__s.SETTINGS_SECTIONS.filter(s => s.nav).map(s => [s.id, s.nav]), [['storage', 'privacy'], ['data', 'privacy']],
    'Storage and Import & Export (palette entries) open Privacy & data');
  ok(h.context.__s.setSettingsSection('privacy') === true, 'Privacy & data opens');
  eq(Object.entries(h.panes).filter(([, el]) => !el.classList.contains('hidden')).map(([k]) => k), ['privacy', 'storage', 'data'],
    'it shows the facts, Storage and Backup panes together');
  eq(h.rendered, ['renderPrivacySettings', 'renderStorageSettings', 'renderDataSettings'], 'each shown pane renders itself');
  eq(h.tabs.filter(t => t.classList.contains('active')).map(t => t.dataset.tab), ['privacy'], 'one active section');
  eq(h.tabs.find(t => t.dataset.tab === 'privacy').getAttribute('aria-current'), 'page', 'the active section is the current page');
  eq(h.context.__pill, 'privacy', 'the pill slides to it');
  eq(h.doc.getElementById('sp-title').textContent, 'T:settings.privacyData', 'the heading names the section');
  ok(h.content.classLog.join(' ').endsWith('-sp-enter +sp-enter'), 'a new section rises in (class dropped, reflowed, added back)');
  h.content.classLog.length = 0;
  h.rendered.length = 0;
  ok(h.context.__s.setSettingsSection('storage') === true, 'the Storage entry opens');
  eq(h.panes.storage.scrolledWith, { block: 'start', behavior: 'instant' }, '…Privacy & data at its Storage pane');
  eq(h.content.classLog, [], '…without replaying the entrance (same section)');
  ok(h.context.__s.setSettingsSection('archive') === true && h.panes.storage.scrolledWith, 'the legacy name archive still lands on Storage');
  ok(h.context.__s.setSettingsSection('plan') === true && !h.panes.plan.classList.contains('hidden') && h.panes.privacy.classList.contains('hidden'), 'Plan opens alone');
  const blocked = sectionsHarness({ pending: { kind: 'privacy', controlId: 'tog-blur' } });
  ok(blocked.context.__s.setSettingsSection('storage') === true, 'a pending Privacy write still allows its own section (Storage is part of it)');
  ok(blocked.context.__s.setSettingsSection('general') === false && blocked.focused.length === 1, 'a pending write keeps you in its section and on its control');
}

// ── 7. The shell: pill, knob, preview, ring, rail, routes, inert ────────
function shellHarness(overrides = {}) {
  const { doc, make } = makeDocument();
  const app = make('div', { id: 'app' });
  const sidebar = make('aside', { id: 'sidebar' }, app);
  sidebar.rectRight = 230;
  const mainEl = make('main', { id: 'main' }, app);
  const tabrail = make('div', { id: 'tabrail' }, app);
  const drawer = make('div', { id: 'settings-drawer', class: 'hidden' });
  const nav = make('nav', { id: 'drawer-tabs' }, drawer);
  const pill = make('span', { class: 'stg-pill' }, nav);
  const tab = make('button', { class: 'dt active', 'data-tab': 'appearance' }, nav);
  tab.offsetLeft = 0; tab.offsetTop = 48; tab.offsetWidth = 232; tab.offsetHeight = 44;
  const sw = make('span', { class: 'stg-sw' }, drawer);
  const input = make('input', { id: 'tog-urls', class: 'stg-sw-in' }, sw);
  const track = make('span', { class: 'stg-sw-track' }, sw);
  const knob = make('span', { class: 'stg-knob' }, track);
  const preview = make('div', { id: 'appearance-preview' }, drawer);
  const grid = make('div', { id: 'theme-grid' }, drawer);
  const segSize = make('div', { id: 'seg-size' }, drawer);
  const segWidth = make('div', { id: 'seg-width' }, drawer);
  const planPane = make('div', { id: 'dp-plan' }, drawer);
  const ruleA = make('input', { id: 'tog-plan-rollover', 'data-plan-rule': 'planRollOver' }, planPane);
  const ruleB = make('input', { id: 'tog-plan-warn', 'data-plan-rule': 'planWarnOverload' }, planPane);
  const companion = make('input', { id: 'tog-companion' }, planPane);
  const chip = make('span', { id: 'settings-companion-state' }, planPane);
  const exportBtn = make('button', { id: 'export-btn' }, drawer);
  const fill = make('span', { class: 'stg-export-fill' }, exportBtn);
  const exportText = make('span', { class: 'stg-export-text' }, exportBtn);
  const log = [];
  const inert = new Map();
  const timers = [];
  let route = 'ws1/home';
  let pending = null;
  let permission = overrides.permission ?? false;
  const link = { status: 'off', pairingId: '', detail: '' };
  const context = vm.createContext({
    document: doc,
    window: { addEventListener: () => {}, removeEventListener: () => {} },
    ResizeObserver: class { observe() { log.push('observe'); } disconnect() { log.push('disconnect'); } },
    rafThrottle: fn => fn,
    tr: (key, vars = {}) => `T:${key}${Object.values(vars).some(Boolean) ? JSON.stringify(vars) : ''}`,
    toast: (msg, opts = {}) => { log.push(['toast', msg, opts]); return true; },
    setElementInertOwner: (el, owner, on) => { inert.set(el.id, on); log.push(['inert', el.id, owner, on]); },
    settingsPreferenceBlocksDismissal: () => !!pending,
    focusSettingsPreferencePendingControl: () => { log.push('focus-pending'); return true; },
    restoreOpener: el => { log.push(['restore', el.id]); return true; },
    _overlayOpeners: { delete: el => log.push(['forget', el.id]) },
    Router: { build: r => r, currentRoute: () => route },
    settingsSectionShown: 'appearance',
    CORE_APPEARANCE_THEMES: [{ id: 'auto', colors: ['#fffdf8', '#3158db', '#171d19'] }, { id: 'folio', colors: ['#fffdf8', '#3158db', '#19231f'] }, { id: 'folio-dark', colors: ['#171d19', '#8fa8ff', '#f4efe4'] }],
    THEMES: [{ id: 'nord', colors: ['#2e3440', '#88c0d0', '#a3be8c'] }],
    isDarkTheme: id => id === 'folio-dark' || id === 'nord',
    appearanceSettingValue: (s, k) => s[k],
    State: { get: () => ({ settings: { animate: !overrides.still, planRollOver: true } }) },
    prefersReducedMotion: () => !!overrides.reduced,
    planRuleOn: (s, k) => (k === 'planRollOver' ? s.planRollOver === true : s.planWarnOverload !== false),
    planRuleSettingPending: null,
    plannerHasNativePermission: async () => permission,
    PLANNER_LINK_KEY: 'te_planner_link',
    plannerLink: link,
    plannerCompanionConnect: async () => { log.push('connect'); if (overrides.connect === false) { link.status = 'notInstalled'; return false; } link.status = 'connected'; link.pairingId = '7F3A-C21E'; return true; },
    plannerCompanionDisconnect: () => { log.push('disconnect-port'); if (link.status === 'connected') link.status = 'off'; },
    plannerScheduleIdleDisconnect: () => log.push('idle-disconnect'),
    chrome: {
      storage: { local: { get: async key => { log.push(['read', key]); return { [key]: { pairingId: overrides.stored || '' } }; }, set: async () => { log.push('WRITE'); } } },
      permissions: { remove: async request => { log.push(['remove', request]); permission = false; return overrides.removeFails ? false : true; } },
    },
    exportJSON: () => { log.push('export'); return 'locus-1ws-2026-11-07.json'; },
    renderDataSettings: () => log.push('render-data'),
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {},
    openPlan: view => log.push(['openPlan', view]),
    openPlannerDialog: opener => { log.push(['planner', opener?.id || null]); return true; },
  });
  vm.runInContext(`${shellSource}\nglobalThis.__x = { moveSettingsPill, springSettingsSwitch, paintAppearancePreview, paintAppearanceChoices, showSettingsPage, syncSettingsPageShell,
    closeSettingsPage, handleSettingsRailClick, closeSettingsPageOnRouteChange, renderPlanSettings, paintSettingsCompanion, setSettingsCompanion,
    runSettingsExport, openPlannerFromSettings, isOpen: isSettingsPageOpen };`, context, { filename: 'settings-shell.js' });
  return {
    x: context.__x, context, doc, make, drawer, nav, pill, tab, input, knob, preview, grid, segSize, segWidth, ruleA, ruleB, companion, chip,
    exportBtn, fill, exportText, log, inert, timers, link,
    setRoute: r => { route = r; }, setPending: p => { pending = p; }, getPermission: () => permission, setPermission: p => { permission = p; },
  };
}

async function testShell() {
  const h = shellHarness();
  ok(h.x.moveSettingsPill(h.tab), 'the pill moves');
  eq(['--stg-pill-x', '--stg-pill-y', '--stg-pill-w', '--stg-pill-h'].map(k => h.nav.style.getPropertyValue(k)), ['0px', '48px', '232px', '44px'], 'to the active section\'s box');
  eq(h.nav.dataset.pill, 'on', 'and shows');
  ok(h.x.springSettingsSwitch(h.input) && h.knob.classLog.join(' ') === '-is-sprung +is-sprung', 'a flipped switch replays the knob\'s squash (drop, reflow, add)');

  h.x.paintAppearancePreview('folio');
  const [a, b] = h.preview.children;
  ok(h.preview.children.length === 2 && a.classList.contains('is-front') && a.dataset.theme === 'folio', 'the preview paints the current theme on its front layer');
  h.x.paintAppearancePreview('folio-dark');
  ok(b.classList.contains('is-front') && !a.classList.contains('is-front') && b.dataset.theme === 'folio-dark' && b.classList.contains('is-dark'),
    'a new theme paints the back layer and crossfades it to the front');
  eq(b.style.getPropertyValue('--pv-ground'), '#171d19', 'with that theme\'s ground');
  h.x.paintAppearancePreview('folio-dark');
  ok(b.classList.contains('is-front') && b.classLog.filter(c => c === '+is-front').length === 1, 'the same theme does not replay the crossfade');
  h.x.paintAppearancePreview('auto');
  ok(a.classList.contains('is-front') && a.classList.contains('is-split') && a.style.getPropertyValue('--pv-ground-2') === '#171d19', 'System shows two flat halves');
  h.x.paintAppearanceChoices({ size: 'compact', width: 'wide' }, 'folio-dark');
  eq([h.grid.style.getPropertyValue('--stg-ring'), h.grid.dataset.ring, h.segSize.style.getPropertyValue('--stg-i'), h.segWidth.style.getPropertyValue('--stg-i')],
    ['2', 'on', '0', '2'], 'the ring and the thumbs slide to the chosen mode, size and width');
  h.x.paintAppearanceChoices({ size: 'normal', width: 'normal' }, 'nord');
  eq(h.grid.dataset.ring, 'off', 'a Style plugin theme hides the core ring');

  // Opening: the work area goes inert, the rail stays usable, the page sits beside it.
  ok(h.x.showSettingsPage(h.drawer) && h.x.isOpen(), 'the page opens');
  eq([h.inert.get('main'), h.inert.get('tabrail'), h.inert.has('sidebar')], [true, true, false], 'the work area is inert; the rail is not');
  eq(h.drawer.style.getPropertyValue('--stg-rail'), '230px', 'the page starts at the rail\'s edge');
  ok(h.log.includes('observe'), 'it follows the rail\'s width');

  // Rail: a destination leaves Settings; a menu or dialog opener keeps it.
  const railBtn = id => { const el = h.make('button', { id }, h.doc.getElementById('sidebar')); return { target: el, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } }; };
  ok(h.x.handleSettingsRailClick(railBtn('nav-more')) === false && h.x.isOpen(), 'More (a menu) keeps Settings open');
  const popup = railBtn('ws-chip-x');
  popup.target.setAttribute('aria-haspopup', 'menu');
  ok(h.x.handleSettingsRailClick(popup) === false && h.x.isOpen(), 'any control with a popup keeps it open');
  h.setPending({ kind: 'general' });
  const busy = railBtn('nav-inbox');
  ok(h.x.handleSettingsRailClick(busy) === true && busy.prevented && busy.stopped && h.x.isOpen() && h.log.includes('focus-pending'),
    'a pending preference write refuses the rail and keeps focus on its control');
  h.setPending(null);
  ok(h.x.handleSettingsRailClick(railBtn('nav-inbox')) === true && !h.x.isOpen(), 'a rail destination leaves Settings');
  ok(h.log.some(e => Array.isArray(e) && e[0] === 'forget' && e[1] === 'settings-drawer'), '…without pulling focus back to the opener');
  h.x.syncSettingsPageShell();
  eq([h.inert.get('main'), h.inert.get('tabrail')], [false, false], 'the work area is usable again');

  // Routes: any route change while Settings shows leaves it.
  h.x.showSettingsPage(h.drawer);
  ok(h.x.closeSettingsPageOnRouteChange() === false && h.x.isOpen(), 'a repaint on the same route keeps Settings');
  h.setRoute('ws1/library/all');
  ok(h.x.closeSettingsPageOnRouteChange() === true && !h.x.isOpen(), 'a new route leaves Settings');
  h.setRoute('ws1/home');
  h.x.showSettingsPage(h.drawer);
  ok(h.x.closeSettingsPage() === true && h.log.some(e => Array.isArray(e) && e[0] === 'restore'), 'Close (Escape) returns focus to the opener');

  // Plan rules mirror Plan's own setting.
  await h.x.renderPlanSettings();
  eq([h.ruleA.checked, h.ruleB.checked], [true, true], 'the Auto-plan switches show Plan\'s rules');
}

async function testCompanion() {
  // Off profile: no permission, so the switch is off and no chip.
  let h = shellHarness();
  let state = await h.x.paintSettingsCompanion();
  eq([state.on, h.companion.checked, h.chip.hidden], [false, false, true], 'without the optional permission the companion is off');
  ok(!h.log.some(e => Array.isArray(e) && e[0] === 'read'), 'nothing is read while it is off');

  // On: the grant comes from the click; connect pairs and the chip says so.
  h.companion.checked = true;
  let grant;
  const run = h.x.setSettingsCompanion(true, new Promise(resolve => { grant = resolve; }));
  await new Promise(r => setImmediate(r));
  eq(h.chip.textContent, 'T:planner.companion.connecting', 'the chip says Connecting while it pairs');
  eq(h.chip.dataset.state, 'busy', '…with the spinner');
  ok(h.companion.disabled === true, 'the switch waits for the answer');
  h.setPermission(true);
  grant(true);
  ok(await run === true, 'turning it on connects');
  ok(h.log.includes('connect') && h.log.includes('idle-disconnect'), 'through the planner\'s own connect, then its idle disconnect');
  eq(h.chip.textContent, 'T:settings.companionPaired{"id":"7F3A-C21E"}', 'the chip shows the pairing');
  eq(h.chip.dataset.state, 'paired', '…in green');
  ok(h.log.some(e => Array.isArray(e) && e[0] === 'toast' && e[1] === 'T:settings.companionConnected' && /7F3A-C21E/.test(e[2].sub)), 'the shared receipt names the pairing');

  // Off: disconnect and release the permission; no stored field is written.
  h.companion.checked = false;
  ok(await h.x.setSettingsCompanion(false) === true, 'turning it off succeeds');
  ok(h.log.includes('disconnect-port'), 'it closes the native port');
  ok(h.log.some(e => Array.isArray(e) && e[0] === 'remove' && JSON.stringify(e[1]) === '{"permissions":["nativeMessaging"]}'), 'and releases only the optional nativeMessaging permission');
  ok(h.log.some(e => Array.isArray(e) && e[0] === 'toast' && e[1] === 'T:settings.companionOff'), 'the receipt says AI companion off');
  eq([h.companion.checked, h.chip.hidden], [false, true], 'the switch and chip show off');
  ok(!h.log.includes('WRITE'), 'no stored field is written for on or off');

  // Denied: nothing connects.
  h = shellHarness();
  h.companion.checked = true;
  ok(await h.x.setSettingsCompanion(true, Promise.resolve(false)) === false && !h.log.includes('connect'), 'a refused permission connects nothing');
  ok(h.log.some(e => Array.isArray(e) && e[0] === 'toast' && e[1] === 'T:planner.companion.denied'), 'and says why');
  eq(h.companion.checked, false, 'the switch goes back off');

  // Granted but not installed: on, with a short chip and the planner's message.
  h = shellHarness({ connect: false });
  h.companion.checked = true;
  await h.x.setSettingsCompanion(true, Promise.resolve(true).then(v => { h.setPermission(true); return v; }));
  eq([h.companion.checked, h.chip.textContent, h.chip.dataset.state], [true, 'T:settings.companionNotInstalled', 'error'], 'an uninstalled companion shows Not installed');
  ok(/planner\.companion\.notInstalled/.test(h.chip.title), 'with the full planner message as its tooltip');

  // A stored pairing with the permission shows Paired before any connect.
  h = shellHarness({ permission: true, stored: 'AB12' });
  state = await h.x.paintSettingsCompanion();
  eq([state.on, h.chip.textContent], [true, 'T:settings.companionPaired{"id":"AB12"}'], 'a granted, paired profile shows its pairing');

  // A failed release says so.
  h = shellHarness({ permission: true, removeFails: true });
  await h.x.setSettingsCompanion(false);
  ok(h.log.some(e => Array.isArray(e) && e[0] === 'toast' && e[1] === 'T:settings.companionOffFailed' && e[2].tone === 'warning'), 'a failed release warns and points to the extensions page');

  // Plan with AI: Settings closes first, then Plan opens the planner.
  h = shellHarness();
  h.x.showSettingsPage(h.drawer);
  h.make('button', { id: 'plan-ai-btn' });
  ok(h.x.openPlannerFromSettings() === true && !h.x.isOpen(), 'Open in Plan closes Settings');
  ok(h.log.some(e => Array.isArray(e) && e[0] === 'openPlan') && h.log.some(e => Array.isArray(e) && e[0] === 'planner' && e[1] === 'plan-ai-btn'), '…opens Plan and its Plan with AI sheet from the Plan header button');
}

function testExport() {
  let h = shellHarness();
  ok(h.x.runSettingsExport() === true, 'Download starts');
  eq([h.exportBtn.dataset.state, h.exportBtn.getAttribute('aria-busy'), h.exportText.textContent], ['run', 'true', 'T:settings.exportPreparing'], 'the button fills while it prepares');
  ok(h.fill.classLog.join(' ').endsWith('-is-running +is-running'), 'the fill replays');
  ok(!h.log.includes('export'), 'the request waits for the fill');
  ok(h.x.runSettingsExport() === false, 'a second click while it runs does nothing');
  h.fill.dispatch('animationend');
  ok(h.log.filter(e => e === 'export').length === 1, 'the fill\'s end makes exactly one request');
  eq([h.exportBtn.dataset.state, h.exportText.textContent], ['done', 'T:settings.exportRequested'], 'the button turns green: Download requested');
  h.timers.find(t => t.ms === 900).fn();
  ok(h.log.filter(e => e === 'export').length === 1, 'the fallback timer cannot request twice');
  h.timers.find(t => t.ms === 2400).fn();
  eq(h.exportBtn.dataset.state, 'idle', 'then it rests again');
  h = shellHarness({ reduced: true });
  h.x.runSettingsExport();
  ok(h.log.includes('export') && h.exportBtn.dataset.state === 'done', 'with reduced motion the request is immediate');
  h = shellHarness({ still: true });
  h.x.runSettingsExport();
  ok(h.log.includes('export'), 'with the Motion setting off too');
  ok(/toast\(tr\('feedback\.exported', \{\n    workspaces: counts\.workspaces,\n    items: counts\.items,\n  \}\), \{ sub: a\.download \}\);\n  return a\.download;/.test(extractFunction('exportJSON')),
    'the shared receipt names the requested file');
}

function testBindings() {
  const init = between("const _drawer = document.getElementById('settings-drawer');", '// Global keys');
  ok(/const _openDrawer = event => openSettingsDrawer\(null, event\?\.currentTarget \|\| null\);/.test(init), 'every opener goes through openSettingsDrawer');
  ok(/_drawer\.addEventListener\('keydown', e => \{ if \(settingsPreferencePendingTransaction\(\)\) trapTabKey\(e, _drawer\); \}\);/.test(init),
    'Tab may reach the rail, except while a write waits for storage');
  ok(/if \(event\.target\?\.classList\?\.contains\('stg-sw-in'\)\) springSettingsSwitch\(event\.target\);/.test(init), 'every switch springs on change');
  ok(/void commitPlanRuleSetting\(input\.dataset\.planRule, !!input\.checked\)\.finally\(\(\) => renderPlanSettings\(\)\);/.test(init),
    'the Auto-plan switches use Plan\'s own receipt-gated setting');
  ok(/const granted = on && typeof plannerRequestNativePermission === 'function'\n\s*\? plannerRequestNativePermission\(\)/.test(init),
    'the permission prompt opens inside the click');
  ok(/if \(!closeSettingsPage\(\{ restoreFocus: false \}\)\) return;\n\s*openLibrarySurface\('archive'\);/.test(init), 'Open archive leaves Settings, then opens Archive');
  ok(/appearancePackReset\.onclick = \(\) => \{ void resetAppearanceStylePack\(appearancePackReset\); \};/.test(init)
    && /if \(!await commitAppearanceSettingsChange\(button\.id, patch\)\) return false;\n\s*toast\(tr\('settings\.stylePackResetDone'\), \{\n\s*actionLabel: tr\('history\.undoAction'\),\n\s*action: \(\) => undoAppearanceStylePackReset\(button, patch, previous\),/.test(extractFunction('resetAppearanceStylePack'))
    && /return commitAppearanceSettingsChange\(button\.id, previous\)/.test(extractFunction('undoAppearanceStylePackReset')),
  'Use core defaults offers Undo, which puts the exact previous choices back through the same write');
  ok(/shortcutsClear\.onclick = \(\) => \{\n\s*shortcutsFilter\.value = '';\n\s*filterAppShortcuts\(\);\n\s*shortcutsFilter\.focus\(\);/.test(init), 'Clear empties the filter and returns to it');
  ok(/document\.getElementById\('export-btn'\)\.onclick = \(\) => \{\n\s*runSettingsExport\(\);/.test(source), 'Download runs the filling export');
  ok(/function renderBoard\(\) \{\n  invalidateItemCache\(\);\n[^\n]*\n  closeSettingsPageOnRouteChange\(\);/.test(source), 'every board render checks whether the route left Settings');
  ok(/new MutationObserver\(syncSettingsPageShell\)\.observe\(_drawer, \{ attributes: true, attributeFilter: \['class'\] \}\);/.test(init)
    && /document\.getElementById\('sidebar'\)\?\.addEventListener\('click', handleSettingsRailClick, true\);/.test(init),
  'every way of hiding the page releases the work area, and the rail is watched before its own handlers');
  ok(!/privacy-export-btn|privacy-goto-data/.test(source), 'the duplicate backup pair is gone from the code too');
  ok(/if \(typeof paintAppearanceChoices === 'function'\) paintAppearanceChoices\(settings, theme\);/.test(extractFunction('renderAppearanceSettings')),
    'Appearance paints the ring, thumbs and preview from the stored settings');
}

function testPermissionBoundary() {
  eq(manifest.optional_permissions, ['nativeMessaging'], 'nativeMessaging stays the only optional permission');
  ok(!manifest.permissions.includes('nativeMessaging') && !manifest.host_permissions, 'no install-time native messaging and no host permissions');
  eq([...source.matchAll(/chrome\.permissions\.(request|remove|contains)\(([^)]*)\)/g)].map(m => [m[1], m[2]]),
    [['remove', "{ permissions: ['nativeMessaging'] }"]], 'newtab.js only ever releases nativeMessaging (requests stay in planner.js)');
  ok(!/chrome\.storage\.local\.set/.test(shellSource), 'the Settings shell never writes chrome.storage');
}

function testLocales() {
  const keys = ['settings.sectionsAria', 'settings.privacyData', 'settings.plan', 'settings.planSub', 'settings.companion', 'settings.companionPaired',
    'settings.companionConnected', 'settings.companionOff', 'settings.companionOffFailed', 'settings.companionNotInstalled', 'settings.companionReload',
    'settings.companionNotConnected', 'settings.openInPlan', 'settings.filterShortcuts', 'settings.clearShortcutsFilter', 'settings.backupHeading',
    'settings.bookmarksLabel', 'settings.linksLabel', 'settings.exportPreparing', 'settings.exportRequested', 'settings.stylePackResetDone'];
  const enStart = source.indexOf('  en: {');
  const zhStart = source.indexOf("  'zh-TW': {");
  const en = source.slice(enStart, zhStart);
  const zh = source.slice(zhStart, source.indexOf('\n};', zhStart));
  for (const key of keys) {
    const pick = block => (block.match(new RegExp(`\\n    '${key.replace('.', '\\.')}': ('(?:[^'\\\\]|\\\\.)*'),`)) || [])[1];
    const a = pick(en);
    const b = pick(zh);
    ok(a && b, `${key} exists in EN and zh-TW`);
    eq((b.match(/\{[a-z]+\}/g) || []).sort(), (a.match(/\{[a-z]+\}/g) || []).sort(), `${key} keeps the same placeholders`);
  }
  for (const gone of ['settings.privacyFirst', 'settings.privacyFirstBody', 'settings.captureStorageProof', 'settings.dataBackupDirection',
    'settings.privacyActionsAria', 'settings.reviewRestore', 'settings.storageProfileLimit', 'settings.aboutBody', 'settings.privacy']) {
    ok(!new RegExp(`\\n    '${gone.replace('.', '\\.')}':`).test(source), `${gone} is gone (no longer used)`);
  }
}

function testCss() {
  ok(layerStart > 0 && layerStart < css.indexOf('FIND AGAIN AND THE COMMAND PALETTE (2026-11 canvas)'), 'the layer sits before Find again, whose suite reads to the end');
  ok(!/ARCHIVE AND TRASH PAGE|FIND AGAIN/.test(layer), 'the slice is bounded at the next layer');
  ok(!/(?:linear|radial|conic)-gradient\s*\(/.test(layer), 'no gradients (System preview is two flat halves)');
  ok(!/#sidebar\b/.test(layer), 'the rail is left alone');
  ok(!/#E0281B|#e0281b|var\(--red\)|var\(--today-badge\)/.test(layer), 'no red: nothing on Settings is waiting');
  const durations = [...layer.matchAll(/(?<![\w-])(\d*\.?\d+)(m?s)\b/g)].map(m => (m[2] === 'ms' ? Number(m[1]) : Number(m[1]) * 1000)).filter(ms => ms > 0);
  // Presses (0.1 s) and the check's 50 ms delay sit under the range by design.
  ok(durations.every(ms => ms <= 320 || ms === 800), `motion runs at most 320 ms (the 0.8 s spinner is the only exception): ${[...new Set(durations)].join(', ')}`);
  ok((layer.match(/infinite/g) || []).length === (layer.match(/stgSpin \.8s linear infinite/g) || []).length
    && /\.stg-chip\[data-state="busy"\]::before \{[^}]*animation: stgSpin \.8s linear infinite;/.test(layer)
    && /#storage-capacity\[data-state="loading"\] \.stg-cap-head \.stg-btn svg \{ animation: stgSpin \.8s linear infinite; \}/.test(layer),
  'only the busy spinners (connecting, checking storage) loop');
  ok(/\.stg-knob \{[^}]*transition: left \.3s var\(--today-spring\), width \.16s ease;/.test(layer), 'the knob travels on the spring curve');
  ok(/@keyframes stgKnob \{ 0% \{ transform: scale\(1\.18, \.84\); \} 55% \{ transform: scale\(\.94, 1\.06\); \} 100% \{ transform: none; \} \}/.test(layer), 'and squashes like the board\'s');
  ok(/\.stg-layer \{[^}]*transition: opacity \.32s ease;/.test(layer), 'the theme preview crossfades');
  for (const [selector, rule] of [
    ['.stg-btn', /min-height: 44px;/], ['.stg-select', /min-height: 44px;/], ['.stg-filter', /min-height: 44px;/], ['.stg-nav .dt', /min-height: 44px;/],
    ['.stg-sw-in', /inset: -6px -4px;/], ['.stg-fonts button', /min-height: 44px;/], ['#settings-drawer .theme-card.compact', /min-height: 44px;/],
  ]) {
    const block = layer.match(new RegExp(`\\n${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{[^}]*\\}`))?.[0] || '';
    ok(rule.test(block), `${selector} is a 44 px target`);
  }
  ok(/\.stg-seg button \{[^}]*min-height: 38px;[\s\S]*\.stg-seg button::before \{ content: ""; position: absolute; inset: -3px 0; \}/.test(layer), 'segments reach 44 px through the track padding');
  ok(/@container \(max-width: 640px\) \{\n  \.stg-body \{ flex-direction: column;[\s\S]*\.stg-nav \{[^}]*flex-direction: row;[^}]*overflow-x: auto;/.test(layer), 'at phone width the list becomes one scrolling strip');
  ok(/\.stg-main \{[^}]*position: relative;[^}]*overflow-x: hidden;/.test(layer), 'no horizontal scroll, and hidden descriptions stay inside the page');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n  #settings-drawer,\n  #settings-drawer \*,\n  #settings-drawer \*::before,\n  #settings-drawer \*::after \{ animation: none !important; transition: none !important;/.test(layer), 'reduced motion stops everything');
  ok(/body\[data-anim="off"\] #settings-drawer,\nbody\[data-anim="off"\] #settings-drawer \*,/.test(layer), 'so does the Motion setting');
  ok(/#settings-drawer \{[^}]*--stg-ink: var\(--text\);/.test(layer), 'theme buttons that carry their own theme still draw in the page\'s ink');
  ok(!/#settings-drawer \.drawer-sec|\.sp-side|\.sp-hd|\.appearance-setting|\.privacy-contract|\.capture-contract-route\s*\{/.test(css), 'the old Settings ledger CSS is gone');
}

// Review finding R3-7: the Undo of "Use core defaults" never overwrites a
// newer appearance choice. As with a receipt whose Undo is no longer the
// latest action, a later appearance change withdraws it (the message stays
// and drains); an Undo that still arrives late finds a newer choice and
// writes nothing.
async function testResetUndo() {
  const settings = { theme: 'nord', font: 'lora', width: 'normal', size: 'normal' };
  const toastEntries = [];
  const log = [];
  const context = vm.createContext({
    State: { get: () => ({ settings }) },
    APPEARANCE_SETTING_DEFAULTS: { theme: 'folio', size: 'normal', width: 'normal', font: 'dm', showUrls: true, animate: true },
    isCoreAppearanceTheme: id => ['auto', 'folio', 'folio-dark'].includes(id),
    normalizeThemeId: id => id,
    tr: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
    toastEntries,
    toast: (msg, opts = {}) => { toastEntries.push({ msg, tone: 'success', busy: false, ...opts }); return true; },
    toastFront: () => toastEntries[toastEntries.length - 1] || null,
    settleToastAction: (entry, outcome) => { log.push(['settle', entry.msg, plain(outcome)]); entry.action = null; return true; },
    removeToastEntry: entry => { log.push(['remove', entry.msg]); toastEntries.splice(toastEntries.indexOf(entry), 1); return true; },
    writes: [],
  });
  // The acknowledged write is stubbed; like the real one (asserted below), it
  // withdraws an earlier reset's Undo once storage has accepted the change.
  vm.runInContext(`${extractFunction('appearanceSettingValue')}\n${extractFunction('appearanceStylePackResetPatch')}\n${between('let appearanceResetUndo = null;', '\n// Download: the button fills')}
async function commitAppearanceSettingsChange(id, patch) { writes.push([id, JSON.parse(JSON.stringify(patch))]); Object.assign(State.get().settings, patch); withdrawAppearanceResetUndo(); return true; }
globalThis.x = { resetAppearanceStylePack, commitAppearanceSettingsChange, current: () => appearanceResetUndo };`, context, { filename: 'settings-reset-undo.js' });
  const button = { id: 'appearance-pack-reset' };

  ok(await context.x.resetAppearanceStylePack(button) === true, 'Use core defaults writes the core choices');
  eq(context.writes, [['appearance-pack-reset', { theme: 'folio', font: 'dm' }]], '…only what differs from the core');
  const first = toastEntries.at(-1);
  eq([first.msg, first.actionLabel, typeof first.action, context.x.current() === first], ['settings.stylePackResetDone', 'history.undoAction', 'function', true], 'its receipt offers Undo');
  const lateUndo = first.action;
  await context.x.commitAppearanceSettingsChange('theme-folio-dark', { theme: 'folio-dark' });
  eq(log, [['settle', 'settings.stylePackResetDone', { message: 'settings.stylePackResetDone', tone: 'success' }]],
    'a later appearance choice withdraws that Undo: the message stays, the action goes and the receipt drains (finding R3-7)');
  eq([first.action, context.x.current()], [null, null], 'nothing is left to undo');
  const stale = await lateUndo();
  eq([stale.message, stale.tone, context.writes.length, settings.theme], ['history.undoStale', 'warning', 2, 'folio-dark'],
    'an Undo that still arrives finds the newer choice, writes nothing and says Undo is no longer available');

  Object.assign(settings, { theme: 'nord', font: 'lora' });
  log.length = 0;
  await context.x.resetAppearanceStylePack(button);
  const second = toastEntries.at(-1);
  const undone = await second.action();
  eq([undone.message, undone.tone, settings.theme, settings.font, context.writes.at(-1)],
    ['history.undid:{"action":"settings.stylePackReset"}', 'info', 'nord', 'lora', ['appearance-pack-reset', { theme: 'nord', font: 'lora' }]],
    'with no change in between, Undo puts the exact previous theme and typeface back');
  eq(log, [], 'the Undo’s own write does not withdraw itself');

  Object.assign(settings, { theme: 'nord', font: 'lora' });
  await context.x.resetAppearanceStylePack(button);
  const behind = toastEntries.at(-1);
  toastEntries.push({ msg: 'newer receipt', busy: false });
  await context.x.commitAppearanceSettingsChange('appearance-size-large', { size: 'large' });
  ok(log.some(entry => entry[0] === 'remove' && entry[1] === 'settings.stylePackResetDone') && !toastEntries.includes(behind),
    'a reset receipt waiting behind a newer one leaves with its Undo');

  const commit = extractFunction('commitAppearanceSettingsChange');
  ok(/appearanceSettingsStatus = \{ key: 'settings\.appearanceSaved', state: 'success' \};\n\s*\/\/[^\n]*\n\s*withdrawAppearanceResetUndo\(\);/.test(commit),
    'the real write withdraws the reset’s Undo only after storage accepts a change');
  ok(!/withdrawAppearanceResetUndo/.test(commit.slice(commit.indexOf('if (expected === previous)'), commit.indexOf('const transaction ='))), 'a no-op choice keeps it');
  ok(/if \(toastFront\(\) === entry\) return settleToastAction\(entry, \{ message: entry\.msg, tone: entry\.tone \}\);\n\s*return removeToastEntry\(entry\);/.test(extractFunction('withdrawAppearanceResetUndo')),
    'the shared receipt’s own stale-Undo rule: the front one keeps its message, one behind leaves');
}

// Findings R3-4 and R3-5: every text pair on the page holds 4.5:1 in every
// bundled theme, computed from themes.css and the mixes this layer declares.
function testContrast() {
  const parse = value => {
    const text = String(value || '').trim();
    let match = /^#([0-9a-f]{6})$/i.exec(text);
    if (match) return { r: parseInt(match[1].slice(0, 2), 16), g: parseInt(match[1].slice(2, 4), 16), b: parseInt(match[1].slice(4), 16), a: 1 };
    match = /^rgba?\(([^)]+)\)$/.exec(text);
    if (match) { const p = match[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    return null;
  };
  const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const mix = (a, share, b) => ({ r: a.r * share + b.r * (1 - share), g: a.g * share + b.g * (1 - share), b: a.b * share + b.b * (1 - share), a: 1 });
  const lum = ({ r, g, b }) => [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (fg, bg) => { const a = lum(fg); const b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  const black = { r: 0, g: 0, b: 0, a: 1 };
  const white = { r: 255, g: 255, b: 255, a: 1 };
  const num = (pattern, label) => { const m = pattern.exec(layer); ok(m, `${label} is declared as a theme-aware mix`); return Number(m[1]) / 100; };
  const ink2 = num(/--stg-ink-2: color-mix\(in srgb, var\(--text2\) (\d+)%, var\(--text\)\);/, 'the secondary ink on cards and tints');
  const nowMuted = num(/--stg-now-muted: var\(--registry-muted, color-mix\(in srgb, var\(--today-now-text\) (\d+)%, var\(--today-now\)\)\);/, 'the facts’ quiet label');
  const seg = num(/--stg-seg: var\(--card-rule, color-mix\(in srgb, var\(--text\) (\d+)%, var\(--stg-card\)\)\);/, 'the segment track');
  const chip = num(/\.stg-chip\[data-state="active"\],[\s\S]*?\{[^}]*color: color-mix\(in srgb, var\(--today-receipt\) (\d+)%, var\(--text\)\);/, 'the Active chip text');
  const onDark = num(/body\[data-theme="folio-dark"\] #settings-drawer \{ --stg-on: color-mix\(in srgb, var\(--accent-bg\) (\d+)%, #000\); \}/, 'Locus Dark’s filled button');
  const doneLight = num(/body\[data-theme-mode="light"\] \.stg-export\[data-state="done"\] \{ background: color-mix\(in srgb, var\(--today-receipt\) (\d+)%, #000\); \}/, 'the light themes’ done fill');
  const doneDark = num(/body\[data-theme-mode="dark"\] \.stg-export\[data-state="done"\] \{ color: color-mix\(in srgb, var\(--today-ground\) (\d+)%, #000\); \}/, 'the dark themes’ done text');
  for (const selector of ['.stg-meta', '.stg-seg button', '.stg-chip', '.stg-filter', '.stg-empty', '.stg-note', '.stg-licence', '#storage-breakdown .sp-breakdown-meta']) {
    const block = layer.match(new RegExp(`\\n${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{[^}]*\\}`))?.[0] || '';
    ok(/color: var\(--stg-ink-2\);/.test(block), `${selector} uses the secondary ink`);
  }
  ok(/\.stg-fact-k \{ color: var\(--stg-now-muted\);/.test(layer), 'the facts’ labels use their quiet label colour (finding R3-4)');
  const themesCss = read('themes.css');
  const darkTheme = {};
  for (const m of source.matchAll(/\{ id:'([\w-]+)',\s*label:'[^']*',\s*colors:\['#([0-9a-f]{6})'/g)) {
    const [r, g, b] = [0, 2, 4].map(i => parseInt(m[2].slice(i, i + 2), 16));
    darkTheme[m[1]] = (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5; // isDarkTheme's rule
  }
  const fails = [];
  let themes = 0;
  for (const m of themesCss.matchAll(/\n\[data-theme="([\w-]+)"\] \{([^}]*)\}/g)) {
    if (!(m[1] in darkTheme) || m.index !== themesCss.indexOf(`\n[data-theme="${m[1]}"] {`)) continue;
    themes += 1;
    const raw = {};
    for (const d of m[2].matchAll(/--([\w-]+):\s*([^;]+);/g)) raw[d[1]] = d[2].trim();
    const c = name => parse(raw[name]);
    const text = c('text');
    const card = c('card') || c('paper-strong') || c('panel');
    const ground = c('ground') || c('paper') || c('bg');
    const now = c('registry-card') || c('registry-bg') || text;
    const receipt = c('receipt') || c('green');
    const ink = mix(c('text2'), ink2, text);
    const track = c('card-rule') ? over(c('card-rule'), card) : mix(text, seg, card);
    const fill = m[1] === 'folio-dark' ? mix(c('accent-bg'), onDark, black) : c('accent-bg');
    const pairs = {
      'meta on a card': [ink, card],
      'chip on its tint': [ink, mix(text, 0.06, card)],
      'segment on its track': [ink, track],
      'shortcut status on its tint': [ink, mix(text, 0.05, card)],
      'section list on the page': [c('text2'), ground],
      'fact label on the dark fact': [c('registry-muted') || mix(c('registry-text') || c('bg2'), nowMuted, now), now],
      'Active chip on its green tint': [mix(receipt, chip, text), mix(receipt, 0.14, card)],
      'Download on the filled button': [c('accent-text'), fill],
      'Download done': darkTheme[m[1]] ? [mix(ground, doneDark, black), receipt] : [white, mix(receipt, doneLight, black)],
    };
    for (const [name, [fg, bg]] of Object.entries(pairs)) {
      const value = contrast(fg, bg);
      if (value < 4.5) fails.push(`${m[1]}: ${name} ${value.toFixed(2)}`);
    }
  }
  eq(themes, 19, 'all 19 bundled themes are checked');
  eq(fails, [], 'every Settings text pair is at least 4.5:1 in every bundled theme (findings R3-4, R3-5)');
}

function testCi() {
  ok(ci.includes('scripts/settings-page-contract-test.js'), 'CI syntax-checks this suite');
  ok(/run: node scripts\/settings-page-contract-test\.js/.test(ci), 'CI runs this suite');
}

(async () => {
  testMarkup();
  testRows();
  testReachable();
  testCaptureCopy();
  testSections();
  await testShell();
  await testCompanion();
  testExport();
  testBindings();
  testPermissionBoundary();
  testLocales();
  testCss();
  await testResetUndo();
  testContrast();
  testCi();
  console.log(`Settings page contract tests passed: ${checks} checks (seven sections and the pill, switch rows, hidden descriptions, Privacy & data panes, rail and route exits, theme preview crossfade, companion off switch on the optional permission, the filling download, the reset Undo withdrawn by a newer choice, locales, CSS, 4.5:1 in 19 themes)`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
