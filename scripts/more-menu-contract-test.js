'use strict';

// Contract test for the rail's More menu (canvas board More.dc.html, round 2,
// approved by Kai 2026-11-07). The menu rises 140 ms from More with no blur and
// never covers its button: above More at its width with the rail open, beside
// the rail when it is collapsed. One highlight glides between 44 px rows with
// the pointer or the keys, and a resting pointer never takes it. Enter, Space
// or Down open it on the first entry and Up on the last; arrows wrap, Home and
// End jump, letters jump; Escape, Tab and an outside click close it and return
// focus to More. A chosen page lands focus on its heading. Calendar left More
// (its reminder dot moved to Plan in the rail) and Plugins became Tools. The
// rail lights More as "More · <page>" for Archive, Trash and Settings, and All
// links for Favorites and Read later. Production slices of newtab.js run in
// node:vm against a small fake DOM.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const source = read('newtab.js');
const css = read('newtab.css');
const html = read('newtab.html');
const ci = read('.github/workflows/ci.yml');
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const plain = value => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const eq = (actual, expected, message) => { assert.deepEqual(plain(actual), plain(expected), message); checks += 1; };

// A top-level function runs from its declaration to the first closing brace at
// column 0 (the file's style).
function extractFunction(name) {
  const marker = new RegExp(`^(?:async )?function ${name}\\(`, 'm');
  const match = marker.exec(source);
  assert.ok(match, `${name} must remain a top-level function in newtab.js`);
  const end = source.indexOf('\n}\n', match.index);
  assert.ok(end > match.index, `${name} must end with a closing brace at column 0`);
  return source.slice(match.index, end + 2);
}

// The layer, bounded at the next layer header.
const layerStart = css.indexOf('MORE MENU (2026-11 canvas)');
const layerEnd = css.indexOf('/* ----', layerStart);
const layer = css.slice(layerStart, layerEnd > layerStart ? layerEnd : undefined);

// ── A small fake DOM ──────────────────────────────────────────────────────
function createDom() {
  const listeners = new Map();
  const doc = { activeElement: null, listeners };
  class El {
    constructor(tag, id = '') {
      this.tagName = tag.toUpperCase();
      this.id = id;
      this.children = [];
      this.parent = null;
      this.attrs = new Map();
      this.classes = new Set();
      this.dataset = {};
      this.listeners = new Map();
      this.style = { props: {}, setProperty(name, value) { this.props[name] = value; }, getPropertyValue(name) { return this.props[name] || ''; } };
      this.html = '';
      this.text = '';
      this.focusCount = 0;
      this.box = { left: 0, top: 0, width: 0, height: 0 };
      const self = this;
      this.classList = {
        add(...names) { names.forEach(n => self.classes.add(n)); },
        remove(...names) { names.forEach(n => self.classes.delete(n)); },
        toggle(name, on) { const want = on === undefined ? !self.classes.has(name) : !!on; if (want) self.classes.add(name); else self.classes.delete(name); return want; },
        contains(name) { return self.classes.has(name); },
      };
    }
    get className() { return [...this.classes].join(' '); }
    set className(value) { this.classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
    set textContent(value) { this.children.forEach(child => { child.parent = null; }); this.children = []; this.text = String(value); }
    get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
    set innerHTML(value) {
      this.html = String(value);
      const label = /<span class="mor-label">([^<]*)<\/span>/.exec(this.html);
      this.text = label ? label[1] : '';
      this.hasDot = /class="mor-dot"/.test(this.html);
      if (/class="mor-gi"/.test(this.html)) { const gi = new El('span'); gi.className = 'mor-gi'; this.appendChild(gi); }
    }
    get innerHTML() { return this.html; }
    get isConnected() { let node = this; while (node.parent) node = node.parent; return node === doc.body || node === doc.root; }
    set tabIndex(value) { this.attrs.set('tabindex', String(value)); }
    appendChild(child) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); child.parent = this; this.children.push(child); return child; }
    contains(node) { while (node) { if (node === this) return true; node = node.parent; } return false; }
    setAttribute(name, value) { this.attrs.set(name, String(value)); }
    getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
    hasAttribute(name) { return this.attrs.has(name); }
    removeAttribute(name) { this.attrs.delete(name); }
    addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
    removeEventListener(type, fn) { const list = this.listeners.get(type) || []; const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); }
    dispatch(type, event) { if (!event.currentTarget) event.currentTarget = this; (this.listeners.get(type) || []).slice().forEach(fn => fn(event)); }
    all() { return this.children.flatMap(child => [child, ...child.all()]); }
    querySelector(selector) {
      if (selector.startsWith('#')) return this.all().find(el => el.id === selector.slice(1)) || null;
      const cls = selector.replace(/^\./, '');
      return this.all().find(el => el.classes.has(cls)) || null;
    }
    querySelectorAll(selector) { const cls = selector.replace(/^\./, ''); return this.all().filter(el => el.classes.has(cls)); }
    closest(selector) {
      let node = this;
      while (node) {
        if (selector.includes('.hidden') && node.classes.has('hidden')) return node;
        if (selector.includes('[inert]') && node.attrs.has('inert')) return node;
        node = node.parent;
      }
      return null;
    }
    hidden() { let node = this; while (node) { if (node.classes.has('hidden')) return true; node = node.parent; } return false; }
    getClientRects() { return this.isConnected && !this.hidden() ? [this.box] : []; }
    getBoundingClientRect() { const b = this.box; return { left: b.left, top: b.top, width: b.width, height: b.height, right: b.left + b.width, bottom: b.top + b.height }; }
    get rowIndex() { return doc.menu.querySelectorAll('.mor-row').indexOf(this); }
    get offsetTop() { const i = this.rowIndex; return i < 0 ? 0 : 6 + i * 44 + (i >= 4 ? 13 : 0); }
    get offsetHeight() { if (this === doc.menu) return 291; return this.classes.has('mor-row') ? 44 : this.box.height; }
    get offsetWidth() { return this.box.width; }
    get scrollHeight() { return this === doc.menu ? 289 : 0; }
    get clientHeight() { if (this !== doc.menu) return 0; const max = parseFloat(this.style.maxHeight); return Number.isFinite(max) ? Math.min(289, max - 2) : 289; }
    scrollIntoView() { this.scrolled = (this.scrolled || 0) + 1; }
    focus() { if (!this.getClientRects().length) return; doc.activeElement = this; this.focusCount += 1; }
  }
  doc.body = new El('body');
  doc.body.dataset.anim = 'on';
  doc.root = new El('html');
  const byId = {};
  const make = (tag, id, parent = doc.body, box) => { const el = new El(tag, id); if (box) el.box = box; parent.appendChild(el); byId[id] = el; return el; };
  const sidebar = make('aside', 'sidebar', doc.body, { left: 0, top: 0, width: 230, height: 900 });
  const more = make('button', 'nav-more', sidebar, { left: 10, top: 799, width: 210, height: 40 });
  more.setAttribute('aria-expanded', 'false');
  const gap = make('div', 'rail-gap', sidebar, { left: 0, top: 480, width: 230, height: 20 });
  const otherControl = make('button', 'nav-inbox', sidebar, { left: 10, top: 126, width: 210, height: 40 });
  const board = make('main', 'board', doc.body, { left: 230, top: 0, width: 1210, height: 900 });
  make('h1', 'library-title', board, { left: 300, top: 90, width: 400, height: 50 });
  make('h1', 'archive-title', board, { left: 300, top: 90, width: 400, height: 50 });
  const settings = make('div', 'settings-drawer', doc.body, { left: 230, top: 0, width: 1210, height: 900 });
  settings.classList.add('hidden');
  make('h1', 'sp-side-title', settings, { left: 270, top: 30, width: 400, height: 50 });
  const hub = make('div', 'tools-hub', doc.body, { left: 0, top: 0, width: 1440, height: 900 });
  hub.classList.add('hidden');
  const hubCard = make('button', 'hub-first-card', hub, { left: 400, top: 300, width: 300, height: 60 });
  const menu = make('div', 'rail-more-menu', doc.body, { left: 0, top: 0, width: 210, height: 291 });
  menu.classList.add('hidden');
  menu.setAttribute('tabindex', '-1');
  doc.menu = menu;
  doc.getElementById = id => byId[id] || null;
  doc.createElement = tag => new El(tag);
  doc.addEventListener = (type, fn, capture) => { const key = `${type}:${!!capture}`; if (!listeners.has(key)) listeners.set(key, []); listeners.get(key).push(fn); };
  doc.removeEventListener = (type, fn, capture) => { const list = listeners.get(`${type}:${!!capture}`) || []; const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); };
  doc.querySelectorAll = selector => (selector === '#space-nav .space-item' ? [] : []);
  return { doc, El, byId, sidebar, more, gap, otherControl, menu, settings, hub, hubCard };
}

const CONTROLLER = [
  'secondaryNavigationItems', 'railMoreReducedMotion', 'railMorePage', 'railMoreCurrentKey', 'railMoreMenuPlacement',
  'railMoreKeyTarget', 'focusRailMoreElement', 'focusPageHeading', 'consumeSettingsHeadingFocus', 'paintRailMoreMenu',
  'placeRailMoreMenu', 'setRailMoreActive', 'openSidebarMoreMenu', 'closeRailMoreMenu', 'railMoreDestinationHeading',
  'chooseRailMore', 'handleRailMoreKey', 'bindRailMoreMenu',
];

function controller({ reducedMotion = false } = {}) {
  const dom = createDom();
  const timers = [];
  const calls = [];
  const state = { reduced: reducedMotion };
  const ctx = {
    document: dom.doc,
    window: {
      innerWidth: 1440, innerHeight: 900,
      matchMedia: query => ({ matches: query.includes('reduce') && state.reduced }),
      listeners: new Map(),
      addEventListener(type, fn) { this.listeners.set(type, fn); },
      removeEventListener(type, fn) { if (this.listeners.get(type) === fn) this.listeners.delete(type); },
    },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {},
    rafThrottle: fn => fn,
    activeLibraryMode: null,
    settingsOpen: false,
    tr: (key, values = {}) => ({
      'menu.findReview': 'Find and review', 'menu.options': 'Options', 'nav.favorites': 'Favorites', 'nav.readLater': 'Read Later',
      'nav.archive': 'Archive', 'nav.trash': 'Trash', 'action.plugins': 'Tools', 'action.settings': 'Settings', 'action.more': 'More',
    }[key] || key),
    esc: value => String(value),
    cmIcons: { favorite: 'f', readLater: 'r', archive: 'a', delete: 'd', stack: 's' },
    MORE_OPTION_ICONS: { settings: 'g' },
    isSettingsPageOpen: () => ctx.settingsOpen,
    closeSettingsPage: options => { calls.push(['closeSettings', options]); ctx.settingsOpen = false; dom.settings.classList.add('hidden'); return true; },
    openLibrarySurface: mode => { calls.push(['library', mode]); ctx.activeLibraryMode = mode; },
    openToolsHub: opener => { calls.push(['tools', opener && opener.id]); if (ctx.hubRefuses) return false; dom.hub.classList.remove('hidden'); dom.hubCard.focus(); return true; },
    openSettingsDrawer: (tab, opener) => {
      calls.push(['settings', tab, opener && opener.id]);
      opener.focus();
      ctx.settingsOpen = true;
      dom.settings.classList.remove('hidden');
      // openSettingsDrawer's own 50 ms focus step consults the heading flag first.
      if (!ctx.consumeSettingsHeadingFocus(dom.settings)) calls.push(['settings-section-focus']);
    },
    hideContextMenu: () => { calls.push(['hideContextMenu']); ctx.closeRailMoreMenu(); },
    closeFloatingInboxSpacePicker: () => calls.push(['closeSpacePicker']),
    Math, Number, String, Array, Object, JSON,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const region = source.slice(source.indexOf('function secondaryNavigationItems('), source.indexOf('\n}\n', source.indexOf('function bindRailMoreMenu(')) + 3);
  for (const name of CONTROLLER) assert.ok(region.includes(`function ${name}(`), `${name} sits in the More menu region`);
  vm.runInContext(`${region}\nglobalThis.__state = () => railMore; globalThis.__pending = () => settingsHeadingFocusPending;`, ctx, { filename: 'more-menu-region.js' });
  ctx.bindRailMoreMenu();
  const runTimers = () => { while (timers.length) timers.shift().fn(); };
  const key = (k, extra = {}) => Object.assign({ key: k, target: dom.doc.activeElement, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } }, extra);
  const rows = () => dom.menu.querySelectorAll('.mor-row');
  const hot = () => rows().findIndex(row => row.classes.has('is-hot'));
  const glide = () => dom.menu.querySelector('.mor-glide');
  const move = (index, x, y, movement = 4) => dom.menu.dispatch('pointermove', { pointerType: 'mouse', target: rows()[index], clientX: x, clientY: y, movementX: movement, movementY: 0 });
  const click = (detail = 1) => dom.more.onclick({ currentTarget: dom.more, detail });
  const open = () => !dom.menu.classes.has('hidden') && !!ctx.__state();
  return { ctx, dom, calls, timers, runTimers, key, rows, hot, glide, move, click, open, state };
}

(async () => {
  // ── 1. Markup, strings and the shared entry list ───────────────────────
  ok((html.match(/id="rail-more-menu"/g) || []).length === 1
    && /<div id="rail-more-menu" class="hidden" role="menu" aria-label="More" tabindex="-1"><\/div>/.test(html),
    'one More menu host: a hidden role=menu that can hold focus itself');
  ok(/<button class="nav-item" id="nav-more" aria-haspopup="menu" aria-expanded="false"/.test(html), 'More is a menu button that publishes its state');
  ok(/id="nav-plan"[\s\S]*?<span class="nav-count nav-count-when" id="nav-plan-count"><\/span>\n\s*<span class="notif-dot" aria-hidden="true"><\/span>\n\s*<\/button>/.test(html),
    'Plan in the rail carries the pending-reminder dot (moved from the top bar\'s More with the Calendar)');
  ok(/<button id="more-btn" class="icon-btn" type="button"/.test(html) && !/notif-host/.test(html), 'the top bar\'s ⋯ no longer carries a reminder dot');
  for (const [key, en, zh] of [
    ['nav.moreShowing', 'More, showing {page}', '更多，目前在{page}'],
    ['nav.planReminders', 'Reminders: {count}', '提醒：{count}'],
    ['action.plugins', 'Tools', '工具'],
  ]) {
    ok(source.includes(`    '${key}': '${en}',`) && source.includes(`    '${key}': '${zh}',`), `${key} exists in English and zh-TW`);
    eq((source.match(new RegExp(`^\\s{4}'${key.replace('.', '\\.')}':`, 'gm')) || []).length, 2, `${key} exists exactly twice`);
  }
  ok(!/'action\.moreReminderCount'|'menu\.plugins'/.test(source), 'the strings More stopped using are gone');
  const menuStrings = ['menu.findReview', 'menu.options'];
  for (const key of menuStrings) ok(new RegExp(`^\\s{4}'${key.replace('.', '\\.')}':`, 'm').test(source), `${key} stays as a screen-reader group name`);

  {
    const t = controller();
    const items = t.ctx.secondaryNavigationItems(t.dom.more);
    eq(items.filter(item => item.key).map(item => item.key), ['favorites', 'read-later', 'archive', 'trash', 'tools', 'settings'],
      'More holds Favorites, Read later, Archive, Trash, Tools, Settings: no Calendar, no Search');
    eq(items.filter(item => item.label).map(item => item.label), ['Find and review', 'Options'], 'two named groups');
    ok(items.every(item => !item.sub), 'no entry carries a count');
    eq(items.find(item => item.key === 'tools').text, 'Tools', 'Plugins became Tools');
  }

  // ── 2. Placement: never over More ──────────────────────────────────────
  {
    const t = controller();
    const place = t.ctx.railMoreMenuPlacement;
    const button = { left: 10, top: 799, bottom: 839, width: 210, right: 220 };
    const above = place(button, { right: 230 }, 291, { width: 1440, height: 900 }, false);
    eq(above, { side: 'above', left: 10, width: 210, top: 500, maxHeight: null }, 'rail open: above More at its width, 8 px clear');
    ok(above.top + 291 <= button.top - 8, 'the menu ends above the button');
    const beside = place({ left: 10, top: 799, bottom: 839, width: 43, right: 53 }, { right: 64 }, 291, { width: 1440, height: 900 }, true);
    eq(beside, { side: 'beside', left: 73, width: 240, top: 548, maxHeight: null }, 'rail collapsed: 9 px beside the rail, foot level with More');
    eq(place({ left: 10, top: 743, bottom: 783, width: 43, right: 53 }, { right: 64 }, 291, { width: 390, height: 844 }, true),
      { side: 'beside', left: 73, width: 240, top: 492, maxHeight: null }, 'phone, collapsed: beside the rail, inside 390 px');
    eq(place({ left: 10, top: 743, bottom: 783, width: 167, right: 177 }, { right: 188 }, 291, { width: 390, height: 844 }, false),
      { side: 'above', left: 10, width: 167, top: 444, maxHeight: null }, 'phone, rail open: above More at its width');
    eq(place({ left: 10, top: 200, bottom: 240, width: 210, right: 220 }, { right: 230 }, 291, { width: 1440, height: 300 }, false),
      { side: 'above', left: 10, width: 210, top: 8, maxHeight: 184 }, 'a short window: the list scrolls, still above More');
  }

  // ── 3. Keys: wrap, Home/End, letters ───────────────────────────────────
  {
    const t = controller();
    const target = (k, act) => t.ctx.railMoreKeyTarget(k, act, ['Favorites', 'Read Later', 'Archive', 'Trash', 'Tools', 'Settings']);
    eq([target('ArrowDown', -1), target('ArrowUp', -1), target('ArrowDown', 5), target('ArrowUp', 0), target('Home', 3), target('End', 1)],
      [0, 5, 0, 5, 0, 5], 'arrows start at either end and wrap; Home and End jump');
    eq([target('t', 0), target('T', 3), target('r', 4), target('s', 1), target('q', 2), target('q', -1)], [3, 4, 1, 5, 2, -1],
      'a letter goes to the next entry starting with it; none keeps the highlight');
    eq([target('Enter', 0), target('Escape', 0), target(' ', 0), target('Shift', 0)], [null, null, null, null], 'other keys are not moves');
  }

  // ── 4. Pointer open, glide, resting pointer, keys, close ───────────────
  {
    const t = controller();
    t.click(1);
    ok(t.open() && t.dom.menu.classes.has('is-in') && t.dom.more.getAttribute('aria-expanded') === 'true', 'a click opens the menu, rising, with More expanded');
    eq([t.dom.menu.style.left, t.dom.menu.style.top, t.dom.menu.style.width, t.dom.menu.dataset.side], ['10px', '500px', '210px', 'above'], 'placed above More at its width');
    ok(t.calls.some(c => c[0] === 'hideContextMenu') && t.calls.some(c => c[0] === 'closeSpacePicker'), 'one floating layer: the shared menu and the Space picker close');
    ok(t.dom.doc.activeElement === t.dom.menu && t.hot() === -1 && !t.glide().classes.has('is-on'), 'pointer open: the menu holds focus and nothing is lit');
    eq(t.rows().map(row => row.textContent), ['Favorites', 'Read Later', 'Archive', 'Trash', 'Tools', 'Settings'], 'six rows');
    ok(t.rows().every(row => row.getAttribute('role') === 'menuitem' && row.getAttribute('tabindex') === '-1' && !/\d/.test(row.textContent)),
      'rows are menu items in one roving set, with no counts');
    eq(t.dom.menu.children.filter(el => el.getAttribute('role') === 'group').map(el => el.getAttribute('aria-label')), ['Find and review', 'Options'],
      'group names stay for screen readers; the menu shows no headers');
    ok(t.dom.menu.children.some(el => el.getAttribute('role') === 'separator'), 'a rule separates Tools and Settings from the pages');

    t.move(3, 100, 640, 0);
    ok(t.hot() === -1, 'a pointer at rest (no movement) never takes the highlight');
    t.move(3, 100, 642);
    ok(t.hot() === 3 && t.dom.doc.activeElement === t.rows()[3] && t.glide().classes.has('is-jump') && t.glide().style.props['--mor-y'] === '138px',
      'real movement lights Trash: the highlight appears in place and focus follows');
    t.move(4, 100, 642);
    ok(t.hot() === 3, 'the same coordinates over another row do not steal it');
    t.move(4, 100, 700);
    ok(t.hot() === 4 && !t.glide().classes.has('is-jump') && t.glide().style.props['--mor-y'] === '195px', 'it glides to Tools, below the rule');
    t.dom.menu.dispatch('pointerleave', {});
    ok(t.hot() === -1 && !t.glide().classes.has('is-on') && t.dom.doc.activeElement === t.dom.menu, 'leaving clears the glide and parks focus on the menu');

    let e = t.key('ArrowDown');
    t.dom.menu.dispatch('keydown', e);
    ok(t.hot() === 0 && t.glide().classes.has('is-key') && e.prevented && e.stopped, 'ArrowDown from nothing lights Favorites as a keyboard ring');
    t.dom.menu.dispatch('pointerleave', {});
    ok(t.hot() === 0, 'a pointer leaving does not clear a keyboard highlight');
    t.move(2, 100, 700, 0);
    ok(t.hot() === 0, 'a resting pointer cannot steal the keyboard highlight');
    for (const [k, want, label] of [['End', 5, 'End: Settings'], ['ArrowDown', 0, 'ArrowDown wraps'], ['ArrowUp', 5, 'ArrowUp wraps'], ['Home', 0, 'Home'], ['t', 3, 't: Trash'], ['t', 4, 't again: Tools'], ['q', 4, 'no entry: stays']]) {
      t.dom.menu.dispatch('keydown', t.key(k));
      ok(t.hot() === want && t.dom.doc.activeElement === t.rows()[want], label);
    }
    e = t.key('c');
    t.dom.menu.dispatch('keydown', e);
    ok(e.stopped && e.prevented, 'a letter stays in the menu: no one-key shortcut (C for Calendar) fires under it');
    e = t.key('z', { ctrlKey: true });
    t.dom.menu.dispatch('keydown', e);
    ok(!e.stopped, 'Ctrl+Z still reaches the app');

    e = t.key('Escape');
    t.dom.menu.dispatch('keydown', e);
    ok(!t.ctx.__state() && t.dom.menu.classes.has('is-out') && !t.dom.menu.classes.has('hidden') && e.stopped, 'Escape closes: the menu falls out over 100 ms');
    ok(t.dom.doc.activeElement === t.dom.more && t.dom.more.getAttribute('aria-expanded') === 'false', 'focus returns to More, which reports collapsed');
    eq(t.timers.map(timer => timer.ms), [100], 'one 100 ms timer hides it');
    t.runTimers();
    ok(t.dom.menu.classes.has('hidden'), 'then it is hidden');

    // A second press closes; reopening while it falls cancels the fall.
    t.click(1);
    t.click(1);
    ok(!t.ctx.__state() && t.dom.doc.activeElement === t.dom.more, 'a second press closes, focus on More');
    t.click(1);
    t.runTimers();
    ok(t.open() && !t.dom.menu.classes.has('is-out'), 'reopening while it closes cancels the close');

    // Tab closes; outside clicks close.
    e = t.key('Tab');
    t.dom.menu.dispatch('keydown', e);
    ok(!t.ctx.__state() && t.dom.doc.activeElement === t.dom.more && e.prevented, 'Tab closes and returns focus to More');
    t.runTimers();
    t.click(1);
    const down = t.dom.doc.listeners.get('pointerdown:true');
    ok(down && down.length === 1, 'an outside-click watcher is registered while open');
    down[0]({ target: t.rows()[2] });
    down[0]({ target: t.dom.more });
    ok(t.open(), 'a press on the menu or on More is not an outside click');
    t.dom.doc.activeElement = t.dom.doc.body;
    down[0]({ target: t.dom.gap });
    ok(!t.ctx.__state(), 'a press on the empty rail closes the menu');
    t.runTimers();
    ok(t.dom.doc.activeElement === t.dom.more, '…and focus, which fell to the page, returns to More');
    ok(!(t.dom.doc.listeners.get('pointerdown:true') || []).length && !t.ctx.window.listeners.has('resize'), 'the watchers leave with the menu');
    t.click(1);
    t.dom.otherControl.focus();
    t.dom.doc.listeners.get('pointerdown:true')[0]({ target: t.dom.otherControl });
    t.runTimers();
    ok(!t.ctx.__state() && t.dom.doc.activeElement === t.dom.otherControl, 'a press on another control closes the menu and leaves that control focused');
    t.click(1);
    t.ctx.hideContextMenu();
    ok(!t.ctx.__state() && t.dom.doc.activeElement !== t.dom.more, 'another layer opening closes the menu without taking focus');
    t.runTimers();
  }

  // ── 5. Keyboard opens ──────────────────────────────────────────────────
  {
    const t = controller();
    t.click(0);
    ok(t.hot() === 0 && t.dom.doc.activeElement === t.rows()[0] && t.glide().classes.has('is-key'), 'Enter or Space on More (a click with no pointer) opens on Favorites');
    t.dom.menu.dispatch('keydown', t.key('Escape'));
    t.runTimers();
    let e = t.key('ArrowUp');
    t.dom.more.dispatch('keydown', e);
    ok(t.hot() === 5 && t.dom.doc.activeElement === t.rows()[5] && e.prevented, 'Up on More opens on the last entry');
    t.dom.menu.dispatch('keydown', t.key('Escape'));
    t.runTimers();
    t.dom.more.dispatch('keydown', t.key('ArrowDown'));
    ok(t.hot() === 0, 'Down on More opens on the first entry');
    e = t.key('x');
    t.dom.menu.dispatch('keydown', t.key('Escape'));
    t.runTimers();
    t.dom.more.dispatch('keydown', e);
    ok(!t.open() && !e.prevented, 'other keys on More do nothing');
    t.click(1);
    e = t.key('Enter', { target: t.dom.menu });
    t.dom.menu.dispatch('keydown', e);
    ok(t.open() && t.calls.every(c => c[0] !== 'library'), 'Enter with nothing lit does nothing');
  }

  // ── 6. Choosing: focus lands on the page's heading ─────────────────────
  {
    const t = controller();
    t.click(0);
    t.dom.menu.dispatch('click', { target: t.rows()[0], stopPropagation() {} });
    ok(t.calls.some(c => c[0] === 'library' && c[1] === 'favorites') && t.dom.doc.activeElement === t.dom.byId['library-title'],
      'Favorites opens the Library view and focus lands on its heading');
    ok(t.dom.byId['library-title'].getAttribute('tabindex') === '-1', 'the heading takes focus without joining the tab order');
    t.runTimers();
    t.click(1);
    ok(t.rows()[0].classes.has('is-current') && t.rows()[0].getAttribute('aria-current') === 'page' && t.rows()[0].hasDot, 'the page on screen is marked current, with a dot');
    const before = t.calls.length;
    t.dom.menu.dispatch('click', { target: t.rows()[0], stopPropagation() {} });
    ok(t.calls.length === before && t.dom.doc.activeElement === t.dom.byId['library-title'], 'choosing the page on screen only lands on it');
    t.runTimers();
    t.click(0);
    t.dom.menu.dispatch('keydown', t.key('a'));
    t.dom.menu.dispatch('click', { target: t.rows()[2], stopPropagation() {} });
    ok(t.ctx.activeLibraryMode === 'archive' && t.dom.doc.activeElement === t.dom.byId['archive-title'], 'Archive: focus on the Archive heading');
    t.runTimers();

    t.click(1);
    t.dom.menu.dispatch('click', { target: t.rows()[5], stopPropagation() {} });
    ok(t.calls.some(c => c[0] === 'settings' && c[1] === 'general' && c[2] === 'nav-more'), 'Settings opens at General with More as its focus-return owner');
    ok(t.dom.doc.activeElement === t.dom.byId['sp-side-title'] && !t.calls.some(c => c[0] === 'settings-section-focus') && !t.ctx.__pending(),
      'focus lands on the Settings heading, not the section list');
    t.runTimers();
    t.click(1);
    ok(t.rows()[5].classes.has('is-current') && !t.rows()[2].classes.has('is-current'), 'Settings over Archive: Settings is current');
    t.dom.menu.dispatch('click', { target: t.rows()[2], stopPropagation() {} });
    const closeAt = t.calls.findIndex(c => c[0] === 'closeSettings');
    const libraryAt = t.calls.map(c => c[0]).lastIndexOf('library');
    ok(closeAt >= 0 && closeAt < libraryAt && t.calls[closeAt][1].restoreFocus === false && !t.ctx.settingsOpen,
      'a page entry leaves Settings first, even for the page under it');
    ok(t.dom.doc.activeElement === t.dom.byId['archive-title'], '…and lands on that page\'s heading');
    t.runTimers();

    t.click(1);
    t.dom.menu.dispatch('click', { target: t.rows()[4], stopPropagation() {} });
    ok(t.calls.some(c => c[0] === 'tools' && c[1] === 'nav-more') && t.dom.doc.activeElement === t.dom.hubCard,
      'Tools opens its window with More as its focus-return owner; the window keeps its own focus');
    t.runTimers();
    t.dom.hub.classList.add('hidden');
    t.ctx.hubRefuses = true;
    t.click(1);
    t.dom.menu.dispatch('click', { target: t.rows()[4], stopPropagation() {} });
    t.runTimers();
    ok(t.dom.doc.activeElement === t.dom.more, 'if Tools cannot open, focus returns to More, never the page body');
  }

  // ── 7. Collapsed rail, phone, reduced motion ───────────────────────────
  {
    const t = controller();
    t.dom.sidebar.classList.add('collapsed');
    t.dom.sidebar.box = { left: 0, top: 0, width: 64, height: 900 };
    t.dom.more.box = { left: 10, top: 799, width: 43, height: 40 };
    t.click(1);
    eq([t.dom.menu.dataset.side, t.dom.menu.style.left, t.dom.menu.style.width, t.dom.menu.style.top], ['beside', '73px', '240px', '548px'],
      'collapsed: the menu opens beside the rail, not over it');
    t.ctx.window.innerHeight = 260;
    t.dom.more.box = { left: 10, top: 159, width: 43, height: 40 };
    t.ctx.window.listeners.get('resize')();
    eq([t.dom.menu.style.top, t.dom.menu.style.maxHeight], ['8px', '244px'], 'a resize re-places it inside the window, scrolling when it must');
  }
  {
    const t = controller({ reducedMotion: true });
    t.click(1);
    ok(t.open() && !t.dom.menu.classes.has('is-in'), 'reduced motion: the menu appears without the rise');
    t.dom.menu.dispatch('keydown', t.key('Escape'));
    ok(t.dom.menu.classes.has('hidden') && !t.timers.length && t.dom.doc.activeElement === t.dom.more, '…and closes at once, focus on More');
    t.state.reduced = false;
    t.ctx.document.body.dataset.anim = 'off';
    t.click(1);
    ok(!t.dom.menu.classes.has('is-in'), 'the app\'s own animation setting stops the rise too');
  }

  // ── 8. The rail's current-page light ───────────────────────────────────
  {
    const names = ['railMorePage', 'spaceNavItemIsCurrent', 'syncRailMoreButton', 'syncPlanReminderSignal', 'updateNavChrome'];
    const made = () => {
      const node = id => ({
        id, classes: new Set(), attrs: new Map(), dataset: {}, title: '', text: '',
        classList: { toggle(name, on) { if (on) this.owner.classes.add(name); else this.owner.classes.delete(name); }, contains(name) { return this.owner.classes.has(name); } },
        setAttribute(name, value) { this.attrs.set(name, String(value)); }, removeAttribute(name) { this.attrs.delete(name); },
        getAttribute(name) { return this.attrs.get(name) ?? null; },
        querySelector() { return this.label; },
      });
      const nodes = {};
      for (const id of ['nav-home', 'nav-search', 'nav-all', 'nav-favorites', 'nav-read-later', 'nav-archive', 'nav-trash', 'nav-inbox', 'nav-plan', 'nav-more', 'nav-plan-count']) {
        nodes[id] = node(id);
        nodes[id].classList.owner = nodes[id];
        nodes[id].label = { textContent: '' };
      }
      const spaces = ['c1', 'c2'].map(catId => { const n = node(catId); n.classList.owner = n; n.dataset.catId = catId; return n; });
      return { nodes, spaces };
    };
    const { nodes, spaces } = made();
    const ws = { id: 'w', activeCatId: 'c1', categories: [{ id: 'c1', groups: [{ id: 'g-in', name: 'Inbox', items: [] }] }, { id: 'c2', groups: [] }] };
    const ctx = vm.createContext({
      document: { getElementById: id => nodes[id] || null, querySelectorAll: selector => (selector === '#space-nav .space-item' ? spaces : []) },
      State: { get: () => ({ archive: [], trash: [] }) },
      activeWs: () => ws, activeCat: () => ws.categories[0],
      collectWorkspaceTabs: () => [], createLandingInboxContext: () => ({}), resolveLandingInboxTarget: () => ({ group: ws.categories[0].groups[0] }),
      planTodayCount: () => 4, collectPendingReminders: () => new Array(16), syncTopbarMoreState: () => {},
      isSettingsPageOpen: () => ctx.settingsOpen,
      tr: (key, values = {}) => ({
        'nav.inbox': 'Inbox', 'nav.plan': 'Plan', 'plan.navToday': `${values.count} today`, 'nav.planReminders': `Reminders: ${values.count}`,
        'action.more': 'More', 'nav.moreShowing': `More, showing ${values.page}`, 'nav.archive': 'Archive', 'nav.trash': 'Trash', 'action.settings': 'Settings',
      }[key] || key),
      activeHome: false, activeSearch: null, activeLibraryMode: null, activeGroupPage: null, activeCalendar: null, settingsOpen: false,
      _pendingReminderCount: 0, Array, Object, String, Number, Math,
    });
    vm.runInContext(`${names.map(extractFunction).join('\n')}\nglobalThis.__nav = updateNavChrome;`, ctx, { filename: 'more-menu-light.js' });
    const lit = () => [...Object.values(nodes), ...spaces].filter(n => n.classes.has('active')).map(n => n.id).filter(id => !['nav-favorites', 'nav-read-later', 'nav-archive', 'nav-trash', 'nav-search'].includes(id));
    const go = patch => { Object.assign(ctx, { activeHome: false, activeSearch: null, activeLibraryMode: null, activeGroupPage: null, activeCalendar: null, settingsOpen: false }, patch); ctx.__nav(); };
    go({ activeHome: true });
    eq([lit(), nodes['nav-more'].label.textContent, nodes['nav-home'].getAttribute('aria-current')], [['nav-home'], 'More', 'page'], 'Today: Home lit, More plain');
    go({ activeLibraryMode: 'favorites' });
    eq([lit(), nodes['nav-more'].label.textContent], [['nav-all'], 'More'], 'Favorites lights All links, a Library view, not More');
    go({ activeLibraryMode: 'read-later' });
    eq(lit(), ['nav-all'], 'Read later lights All links');
    go({ activeLibraryMode: 'archive' });
    eq([lit(), nodes['nav-more'].label.textContent, nodes['nav-more'].getAttribute('aria-label'), nodes['nav-more'].title],
      [['nav-more'], 'More · Archive', 'More, showing Archive', 'More · Archive'], 'Archive: More lights as "More · Archive", read "More, showing Archive"');
    go({ activeLibraryMode: 'trash' });
    eq([lit(), nodes['nav-more'].label.textContent], [['nav-more'], 'More · Trash'], 'Trash: More · Trash');
    go({ activeHome: true, settingsOpen: true });
    eq([lit(), nodes['nav-more'].label.textContent, nodes['nav-home'].getAttribute('aria-current')], [['nav-more'], 'More · Settings', null],
      'Settings: More · Settings, and the page it came from is no longer lit');
    go({ settingsOpen: true });
    eq(lit(), ['nav-more'], 'Settings over a Space: the Space is not lit');
    go({});
    eq(lit(), ['c1'], 'a Space board lights that Space only');
    go({ activeSearch: { q: '' } });
    eq([lit(), nodes['nav-more'].label.textContent], [[], 'More'], 'Find again lights nothing in the rail and More stays plain (Search is not in More)');
    go({ activeCalendar: { view: 'agenda' } });
    eq(lit(), ['nav-plan'], 'the Calendar lights Plan, its home');
    go({ activeGroupPage: { groupId: 'g-in' } });
    eq(lit(), ['nav-inbox'], 'the Inbox lights Inbox, not its Space');
    ok(nodes['nav-plan'].classes.has('has-notif') && nodes['nav-plan'].getAttribute('aria-label') === 'Plan, 4 today, Reminders: 16',
      'Plan carries the reminder dot and names the reminders');
  }

  // ── 9. CSS: the rise, rows, glide, motion and forced colours ───────────
  ok(layerStart > 0 && layerStart < css.indexOf('TODAY BOARD (2026-11 canvas)'),
    'the layer sits before the canvas page layers, whose suites read to the end of the file and keep page layers off the rail');
  ok(!layer.includes('TODAY BOARD'), 'the layer slice ends at the next header');
  ok(/#rail-more-menu \{[^}]*position: fixed;[^}]*border-radius: 16px;[^}]*backdrop-filter: none;/.test(layer) && !/blur\(/.test(layer),
    'a 16 px card with no blur');
  ok(/#rail-more-menu\.is-in \{ animation: mor-rise \.14s var\(--today-ease/.test(layer) && /@keyframes mor-rise \{ from \{ opacity: 0; transform: translateY\(6px\); \} \}/.test(layer),
    'it rises 6 px and fades in over 140 ms');
  ok(/#rail-more-menu\.is-out \{ animation: mor-fall \.1s [^}]*pointer-events: none; \}/.test(layer), 'it falls out over 100 ms and ignores the pointer meanwhile');
  ok(/\.mor-row \{[^}]*height: 44px;/.test(layer), 'rows are 44 px');
  ok(/\.mor-glide \{[^}]*transform: translateY\(var\(--mor-y, 0\)\);[^}]*transition: transform \.16s/.test(layer) && /\.mor-glide\.is-jump \{ transition: opacity \.12s ease; \}/.test(layer),
    'the highlight glides between rows in 160 ms and appears in place');
  ok(/\.mor-glide\.is-key \.mor-gi \{ background: var\(--mor-key\); box-shadow: inset 0 0 0 2px var\(--mor-ring\); \}/.test(layer), 'the keyboard draws it as a blue ring');
  ok(/\.mor-row\.is-current,\n\.mor-row\.is-current svg \{ color: var\(--mor-cur\); \}/.test(layer) && /\.mor-dot \{[^}]*background: var\(--mor-ring\);/.test(layer),
    'the page on screen is blue with a dot');
  ok(!/\.mor-(?:count|label-head|head)/.test(layer + source), 'no counts and no visible group headers');
  ok(/body\[data-anim="off"\] :is\(#rail-more-menu, #rail-more-menu \*\) \{ animation: none !important; transition: none !important; \}/.test(layer)
    && /@media \(prefers-reduced-motion: reduce\) \{\n\s*#rail-more-menu, #rail-more-menu \* \{ animation: none !important; transition: none !important; \}/.test(layer),
    'reduced motion and the app\'s animation switch stop every menu motion');
  ok(/@media \(forced-colors: active\) \{[\s\S]*\.mor-glide\.is-on \.mor-gi \{[^}]*outline: 2px solid Highlight;[\s\S]*#sidebar #nav-plan\.has-notif \.notif-dot \{[^}]*background: Highlight;/.test(layer),
    'forced colours keep the highlight and Plan\'s reminder dot');
  ok(/#sidebar #nav-plan \.notif-dot \{[^}]*background: var\(--when-on-registry, color-mix\(in srgb, var\(--orange\) \d+%, var\(--index-registry-text\)\)\);/.test(layer) &&/#sidebar #nav-plan\.has-notif \.notif-dot \{ display: block; \}/.test(layer),
    'Plan\'s dot is orange, the colour of "when"');
  ok(!/#sidebar #nav-(?:home|inbox|all|plan)\s*\{|\.nav-item\s*\{|\.space-item\s*\{/.test(layer), 'the rail\'s rows, size and collapse stay as they are');

  // ── 10. Contrast in every bundled theme ────────────────────────────────
  {
    const parse = value => {
      const text = String(value || '').trim();
      let m = /^#([0-9a-f]{6})$/i.exec(text);
      if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4), 16) };
      m = /^#([0-9a-f]{3})$/i.exec(text);
      if (m) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16) };
      return null;
    };
    const mix = (a, share, b) => ({ r: a.r * share + b.r * (1 - share), g: a.g * share + b.g * (1 - share), b: a.b * share + b.b * (1 - share) });
    const lum = ({ r, g, b }) => [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (fg, bg) => { const a = lum(fg); const b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
    const share = (token, re) => { const m = re.exec(layer); assert.ok(m, `${token} is declared as a theme-aware mix`); return Number(m[1]) / 100; };
    const ink2 = share('--mor-ink-2', /--mor-ink-2: color-mix\(in srgb, var\(--text2\) (\d+)%, var\(--text\)\);/);
    const hl = share('--mor-hl', /--mor-hl: color-mix\(in srgb, var\(--text\) (\d+)%, var\(--mor-card\)\);/);
    const key = share('--mor-key', /--mor-key: color-mix\(in srgb, var\(--index-locator, var\(--accent\)\) (\d+)%, var\(--mor-card\)\);/);
    const cur = share('--mor-cur', /--mor-cur: var\(--where-soft-text, color-mix\(in srgb, var\(--index-locator, var\(--accent\)\) (\d+)%, var\(--text\)\)\);/);
    const ring = share('--mor-ring', /--mor-ring: color-mix\(in srgb, var\(--index-locator, var\(--accent\)\) (\d+)%, var\(--text\)\);/);
    const dotShare = share('the Plan dot', /#sidebar #nav-plan \.notif-dot \{[^}]*background: var\(--when-on-registry, color-mix\(in srgb, var\(--orange\) (\d+)%, var\(--index-registry-text\)\)\);/);
    const themes = {};
    for (const m of read('themes.css').matchAll(/\n\[data-theme="([\w-]+)"\] \{([^}]*)\}/g)) {
      if (themes[m[1]]) continue;
      const raw = {};
      for (const d of m[2].matchAll(/--([\w-]+):\s*([^;]+);/g)) raw[d[1]] = d[2].trim();
      const c = name => parse(raw[name]);
      themes[m[1]] = {
        text: c('text'), text2: c('text2'), card: c('card') || c('paper-strong') || c('panel'),
        locator: c('locator') || c('accent'), whereText: c('where-soft-text'), rail: c('registry-bg') || c('text'),
        railText: c('registry-text') || c('bg2'), whenOnRail: c('when-on-registry'), orange: c('orange'),
      };
    }
    eq(Object.keys(themes).length, 19, 'all 19 bundled themes are checked');
    const fails = [];
    for (const [id, k] of Object.entries(themes)) {
      const grounds = { card: k.card, hover: mix(k.text, hl, k.card), keyboard: mix(k.locator, key, k.card) };
      for (const [where, bg] of Object.entries(grounds)) {
        const pairs = [['label', k.text, 4.5], ['current page', k.whereText || mix(k.locator, cur, k.text), 4.5], ['icon', mix(k.text2, ink2, k.text), 3], ['dot and ring', mix(k.locator, ring, k.text), 3]];
        for (const [what, fg, min] of pairs) {
          const value = ratio(fg, bg);
          if (value < min) fails.push(`${id}: ${what} on the ${where} row ${value.toFixed(2)}`);
        }
      }
      const dot = ratio(k.whenOnRail || mix(k.orange, dotShare, k.railText), k.rail);
      if (dot < 3) fails.push(`${id}: Plan's reminder dot on the rail ${dot.toFixed(2)}`);
    }
    eq(fails, [], 'the menu\'s text holds 4.5:1 and its marks 3:1 on the card, the pointer highlight and the keyboard highlight in every theme');
  }

  // ── 11. CI ─────────────────────────────────────────────────────────────
  ok(/scripts\/more-menu-contract-test\.js/.test(ci.split('\n').find(line => line.includes('for f in')) || ''), 'CI syntax-checks this suite');
  ok(/run: node scripts\/more-menu-contract-test\.js/.test(ci), 'CI runs this suite');

  console.log(`More menu contracts passed: ${checks} checks (entries without Calendar or counts, Tools, placement above or beside never over More, wrap/Home/End/letters, resting pointer, glide, Escape/Tab/outside click to More, heading focus, Settings and Tools owners, reduced motion, the rail light for Archive/Trash/Settings and All links for Library views, Plan's reminder dot, CSS, 19-theme contrast, CI)`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
