'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');

function extractBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker} must be extractable`);
  return source.slice(start, end);
}

const welcomeSource = extractBetween(
  'function ensureOnboarding(settings) {',
  '\n// BIND STATIC UI',
);

for (const marker of [
  'id="tour-overlay"',
  'id="coach"',
  'class="wc-step',
  'id="wc-name"',
  'id="wc-progress-fill"',
  'id="tog-tips"',
  'id="reset-hints-btn"',
]) {
  assert.equal(html.includes(marker), false, `obsolete onboarding markup must stay removed: ${marker}`);
}
for (const marker of [
  'TOUR_STEPS',
  'WELCOME_STEPS',
  'function wcShow(',
  'function startTour(',
  'function coachMark(',
  'function resetOnboarding(',
  "tr('menu.resetConfirm')",
]) {
  assert.equal(source.includes(marker), false, `obsolete onboarding code must stay removed: ${marker}`);
}
for (const marker of ['.tour-bubble', '.tour-spotlight', '#coach', '.wc-step', '.wc-chip', '.wc-input']) {
  assert.equal(css.includes(marker), false, `obsolete onboarding style must stay removed: ${marker}`);
}
for (const id of [
  'welcome',
  'wc-task-title',
  'wc-task-description',
  'wc-candidate',
  'wc-candidate-title',
  'wc-candidate-url',
  'wc-candidate-fav',
  'wc-empty',
  'wc-error',
  'wc-retry',
  'wc-explore',
  'wc-save-first',
]) {
  const matches = html.match(new RegExp(`\\bid=["']${id}["']`, 'g')) || [];
  assert.equal(matches.length, 1, `active welcome id must occur exactly once: ${id}`);
}
assert.match(css, /@media \(max-width: 520px\)[^{]*\{[^}]*\.wc-card/s, 'welcome must keep its narrow-layout rule');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[^{]*\{[^}]*\.wc-logo \.brand-img, \.wc-card/s, 'welcome motion must remain reduced-motion safe');
assert.ok(source.includes("'welcome.error': 'Locus couldn’t check your open tabs. Try again, or explore without saving.'"), 'English query failure copy must be localized');
assert.ok(source.includes("'welcome.error': 'Locus 無法讀取開啟中的分頁。請再試一次，或先開始使用。'"), 'zh-TW query failure copy must be localized');
assert.match(source, /const drawer = document\.getElementById\('settings-drawer'\);[\s\S]{0,180}restoreOpener\(drawer\);[\s\S]{0,100}openWelcome/, 'settings replay must restore a visible opener before welcome opens');

class ClassList {
  constructor(...initial) {
    this.values = new Set(initial);
  }

  add(...values) { values.forEach(value => this.values.add(value)); }
  remove(...values) { values.forEach(value => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const next = force === undefined ? !this.contains(value) : !!force;
    if (next) this.add(value);
    else this.remove(value);
    return next;
  }
}

function buildHarness(query, save = async () => false) {
  const calls = {
    locks: 0,
    unlocks: 0,
    remembers: 0,
    restores: 0,
    persists: 0,
    inbox: 0,
    focusedItems: [],
    traps: 0,
    saves: [],
  };
  const listeners = new Map();
  const elements = new Map();
  const document = {
    activeElement: null,
    getElementById(id) { return elements.get(id) || null; },
  };

  function makeElement(id, classes = []) {
    const el = {
      id,
      classList: new ClassList(...classes),
      attributes: new Map(),
      disabled: false,
      textContent: '',
      src: '',
      onclick: null,
      setAttribute(name, value) { this.attributes.set(name, String(value)); },
      getAttribute(name) { return this.attributes.get(name); },
      focus() { document.activeElement = this; },
      addEventListener(type, listener) { listeners.set(`${id}:${type}`, listener); },
      click() { if (id === 'nav-inbox') calls.inbox += 1; },
    };
    elements.set(id, el);
    return el;
  }

  const opener = makeElement('opener');
  const overlay = makeElement('welcome', ['hidden']);
  makeElement('wc-candidate').setAttribute('aria-busy', 'true');
  makeElement('wc-candidate-title');
  makeElement('wc-candidate-url');
  makeElement('wc-candidate-fav');
  makeElement('wc-empty', ['hidden']);
  makeElement('wc-error', ['hidden']);
  makeElement('wc-retry', ['hidden']);
  makeElement('wc-explore');
  const saveButton = makeElement('wc-save-first');
  saveButton.disabled = true;
  makeElement('nav-inbox');
  document.activeElement = opener;

  const state = {
    settings: {
      onboarding: { welcomeSeen: false, hintsSeen: {}, disabled: false },
      tourCompleted: false,
    },
  };
  const context = vm.createContext({
    document,
    chrome: { tabs: { query } },
    State: {
      get() { return state; },
      persist() { calls.persists += 1; },
    },
    BLANK_FAV: 'chrome-extension://locus/icons/icon32.png',
    isProto(url) { return /^(?:chrome|edge|about|chrome-extension):/.test(url); },
    dispUrl(url) { return new URL(url).hostname; },
    favUrl(url) { return `chrome-extension://locus/_favicon/?pageUrl=${encodeURIComponent(url)}`; },
    tr(key) { return key === 'welcome.looking' ? 'Looking for an open tab…' : key; },
    rememberOpener(el) { calls.remembers += 1; el.__opener = document.activeElement; },
    restoreOpener(el) { calls.restores += 1; el.__opener?.focus(); },
    lockBodyScroll() { calls.locks += 1; },
    unlockBodyScroll() { calls.unlocks += 1; },
    focusFirstIn() {
      const first = ['wc-retry', 'wc-explore', 'wc-save-first']
        .map(id => elements.get(id))
        .find(el => !el.disabled && !el.classList.contains('hidden'));
      first?.focus();
    },
    trapTabKey() { calls.traps += 1; },
    async saveTabToInbox(tab, options) {
      calls.saves.push({ tab, options });
      return save(tab, options);
    },
    focusItem(id) { calls.focusedItems.push(id); },
    setTimeout(callback) { callback(); return 1; },
    URL,
  });

  vm.runInContext(
    `${welcomeSource}\nglobalThis.__welcome = { loadWelcomeCandidate, openWelcome, closeWelcome, bindWelcome };`,
    context,
    { filename: 'onboarding-production-contract.js' },
  );

  return {
    api: context.__welcome,
    calls,
    document,
    elements,
    listeners,
    opener,
    overlay,
    state,
  };
}

(async () => {
  let releaseQuery;
  const deferred = new Promise(resolve => { releaseQuery = resolve; });
  const loading = buildHarness(() => deferred);
  loading.api.bindWelcome();
  const opening = loading.api.openWelcome();
  assert.equal(loading.overlay.classList.contains('hidden'), false, 'welcome must become visible before tab discovery completes');
  assert.equal(loading.document.activeElement.id, 'wc-explore', 'welcome must take focus immediately while loading');
  assert.equal(loading.elements.get('wc-candidate').getAttribute('aria-busy'), 'true', 'tab discovery must expose a loading state');
  releaseQuery([{ id: 5, url: 'https://example.com/new', title: 'Newest', lastAccessed: 20 }]);
  await opening;
  assert.equal(loading.document.activeElement.id, 'wc-save-first', 'a discovered tab must move focus to the primary save action');

  const success = buildHarness(
    async () => [
      { id: 1, url: 'chrome://settings', title: 'Browser settings', lastAccessed: 100 },
      { id: 2, url: 'https://example.com/older', title: 'Older', lastAccessed: 10 },
      { id: 3, url: 'https://example.com/newer', title: 'Newer', lastAccessed: 30 },
    ],
    async () => ({ id: 'saved-1' }),
  );
  success.api.bindWelcome();
  await success.api.openWelcome();
  assert.equal(success.calls.remembers, 1, 'welcome must remember its opener');
  assert.equal(success.calls.locks, 1, 'welcome must lock background scroll');
  assert.equal(success.elements.get('wc-candidate-title').textContent, 'Newer', 'welcome must show the most recently accessed eligible tab');
  assert.equal(success.elements.get('wc-candidate-url').textContent, 'example.com', 'welcome must show the real candidate URL');
  assert.equal(success.elements.get('wc-candidate').getAttribute('aria-busy'), 'false', 'successful discovery must end loading');
  assert.equal(success.elements.get('wc-save-first').disabled, false, 'save must enable only after a real candidate is found');
  await success.elements.get('wc-save-first').onclick();
  assert.equal(success.calls.saves.length, 1, 'primary action must use the existing capture path once');
  assert.equal(success.calls.saves[0].tab.id, 3, 'primary action must save the candidate shown');
  assert.equal(success.calls.saves[0].options.closeSource, true, 'first save must request close through the acknowledged capture path');
  assert.deepEqual(Object.keys(success.calls.saves[0].options), ['closeSource'], 'first save must not add a parallel capture mode');
  assert.equal(success.overlay.classList.contains('hidden'), true, 'successful save must close the welcome');
  assert.equal(success.calls.inbox, 1, 'successful save must hand off to Inbox');
  assert.deepEqual(success.calls.focusedItems, ['saved-1'], 'successful save must focus the saved item');
  assert.equal(success.state.settings.onboarding.welcomeSeen, true, 'successful completion must persist the first-run gate');

  const empty = buildHarness(async () => [
    { id: 9, url: 'chrome-extension://locus/newtab.html', title: 'Locus', lastAccessed: 50 },
  ]);
  empty.api.bindWelcome();
  await empty.api.openWelcome();
  assert.equal(empty.elements.get('wc-empty').classList.contains('hidden'), false, 'no eligible tab must show the empty state');
  assert.equal(empty.elements.get('wc-error').classList.contains('hidden'), true, 'no eligible tab must not be mislabeled as an error');
  assert.equal(empty.elements.get('wc-save-first').classList.contains('hidden'), true, 'empty state must not expose an unusable primary action');
  assert.equal(empty.document.activeElement.id, 'wc-explore', 'empty state must focus its real continuation');

  let queryMode = 'error';
  const retry = buildHarness(async () => {
    if (queryMode === 'error') throw new Error('tabs unavailable');
    return [{ id: 11, url: 'https://example.org/recovered', title: 'Recovered tab', lastAccessed: 1 }];
  });
  retry.api.bindWelcome();
  await retry.api.openWelcome();
  assert.equal(retry.elements.get('wc-error').classList.contains('hidden'), false, 'query rejection must show a distinct error state');
  assert.equal(retry.elements.get('wc-empty').classList.contains('hidden'), true, 'query rejection must not masquerade as an empty state');
  assert.equal(retry.elements.get('wc-retry').classList.contains('hidden'), false, 'query rejection must provide retry');
  assert.equal(retry.document.activeElement.id, 'wc-retry', 'query rejection must focus retry');
  queryMode = 'success';
  await retry.elements.get('wc-retry').onclick();
  assert.equal(retry.elements.get('wc-error').classList.contains('hidden'), true, 'retry success must clear the error');
  assert.equal(retry.elements.get('wc-candidate-title').textContent, 'Recovered tab', 'retry must refresh from real tab state');
  assert.equal(retry.document.activeElement.id, 'wc-save-first', 'retry success must focus the primary action');

  const failedSave = buildHarness(
    async () => [{ id: 12, url: 'https://example.net/keep-open', title: 'Keep open', lastAccessed: 1 }],
    async () => false,
  );
  failedSave.api.bindWelcome();
  await failedSave.api.openWelcome();
  await failedSave.elements.get('wc-save-first').onclick();
  assert.equal(failedSave.overlay.classList.contains('hidden'), false, 'failed persistence must keep the welcome available');
  assert.equal(failedSave.calls.inbox, 0, 'failed persistence must not claim an Inbox handoff');
  assert.equal(failedSave.calls.persists, 0, 'failed persistence must not mark onboarding complete');

  const keyboard = buildHarness(async () => []);
  keyboard.api.bindWelcome();
  await keyboard.api.openWelcome();
  const keydown = keyboard.listeners.get('welcome:keydown');
  keydown({ key: 'Tab', preventDefault() {} });
  assert.equal(keyboard.calls.traps, 1, 'Tab must stay in the welcome dialog');
  let prevented = false;
  let stopped = false;
  keydown({
    key: 'Escape',
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
  });
  assert.equal(prevented, true, 'Escape must be consumed by the welcome');
  assert.equal(stopped, true, 'Escape must not bubble into lower surfaces');
  assert.equal(keyboard.overlay.classList.contains('hidden'), true, 'Escape must close only the welcome');
  assert.equal(keyboard.calls.restores, 1, 'Escape must restore the opener');
  assert.equal(keyboard.document.activeElement, keyboard.opener, 'Escape must return focus to the opener');
  assert.equal(keyboard.calls.unlocks, 1, 'Escape must release background scroll');

  console.log('Onboarding contract passed (loading, success, empty, error/retry, failed save, focus, Escape, and residue checks)');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
