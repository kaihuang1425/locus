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

const dialogSource = extractBetween(
  'let trashDeleteEntries = [];',
  '\n// CRUD',
);
const commonActsSource = extractBetween(
  'function commonActs(it, extra = []) {',
  '\nfunction renderReminderBadge',
);

for (const id of [
  'trash-delete-overlay',
  'trash-delete-title',
  'trash-delete-message',
  'trash-delete-cancel',
  'trash-delete-confirm',
]) {
  const matches = html.match(new RegExp(`\\bid=["']${id}["']`, 'g')) || [];
  assert.equal(matches.length, 1, `Trash confirmation id must occur exactly once: ${id}`);
}
assert.match(html, /id="trash-delete-overlay"[^>]*role="alertdialog"[^>]*aria-modal="true"[^>]*aria-labelledby="trash-delete-title"[^>]*aria-describedby="trash-delete-message"/, 'Trash deletion must expose one labelled alert dialog');
assert.match(html, /id="trash-delete-cancel"[^>]*data-i18n="trash\.cancelDelete"/, 'Cancel must be localized');
assert.match(html, /id="trash-delete-confirm"[^>]*data-i18n="trash\.deleteForever"/, 'Permanent-delete action must be localized');
assert.match(css, /#modal-overlay,[^\n]*#trash-delete-overlay[^\n]*\{/, 'Trash confirmation must reuse the modal surface');
assert.match(css, /#trash-delete-overlay\.hidden[^\n]*\{/, 'Trash confirmation must have an explicit hidden state');
assert.match(html, /class="rm-panel trash-delete-panel destructive-confirm-panel"/, 'Trash must share the destructive confirmation panel');
assert.match(html, /id="trash-delete-confirm"[^>]*destructive-confirm-button/, 'Trash must share the destructive confirmation action');
assert.match(css, /\.destructive-confirm-panel,\s*\.organization-name-panel\s*\{[^}]*calc\(100vw - 32px\)/s, 'The shared destructive panel rule must keep Trash within narrow viewports');
assert.match(css, /\.destructive-confirm-button\s*\{[^}]*var\(--red\)/s, 'The irreversible action must use the destructive design token');
assert.equal(dialogSource.includes('confirm('), false, 'Trash deletion must not use a native confirmation');
assert.equal(commonActsSource.includes('Delete permanently'), false, 'Active saved items must not expose a permanent-delete bypass');
assert.equal(commonActsSource.includes('cmIcons.delete'), false, 'Active saved-item actions must route removal through Archive');
assert.match(commonActsSource, /text:\s*tr\('itemAction\.archive'\)[\s\S]*archiveItem\(it\.id\)/, 'Active saved items must retain the localized recoverable Archive action');
assert.match(source, /'itemAction\.archive': 'Archive'/, 'English must name the active-item recovery action');
assert.match(source, /'itemAction\.archive': '封存'/, 'zh-TW must name the active-item recovery action');
assert.match(source, /clearUndoHistory\(\)\s*\{\s*history\.length = 0;\s*future\.length = 0;/, 'Confirmed deletion must clear Undo and Redo history');
assert.match(source, /const trashDeleteOverlay = document\.getElementById\('trash-delete-overlay'\);[\s\S]{0,260}closeTrashDeleteDialog\(\);[\s\S]{0,40}return;/, 'Global Escape must retain a top-layer Trash-dialog fallback');
assert.ok(source.includes("'trash.confirmOne': '“{title}” will be removed from this browser profile. Other saved items won’t change, and this cannot be undone.'"), 'English copy must state scope, retained data, and irreversibility');
assert.ok(source.includes("'trash.confirmOne': '「{title}」將從這個瀏覽器設定檔中移除，其他已儲存項目不受影響。刪除後無法復原。'"), 'zh-TW copy must state scope, retained data, and irreversibility');

class ClassList {
  constructor(...initial) { this.values = new Set(initial); }
  add(...values) { values.forEach(value => this.values.add(value)); }
  remove(...values) { values.forEach(value => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function buildHarness({ entries, persistNow }) {
  const calls = {
    locks: 0,
    unlocks: 0,
    persists: 0,
    clears: 0,
    renders: 0,
    headers: 0,
    nav: 0,
    traps: 0,
    toasts: [],
    recovery: 0,
  };
  const listeners = new Map();
  const elements = new Map();
  const document = {
    activeElement: null,
    getElementById(id) { return elements.get(id) || null; },
    querySelector(selector) {
      if (selector.includes('input[type="search"]')) return elements.get('trash-search') || null;
      return null;
    },
  };

  function makeElement(id, classes = []) {
    const element = {
      id,
      classList: new ClassList(...classes),
      attributes: new Map(),
      disabled: false,
      isConnected: true,
      textContent: '',
      onclick: null,
      setAttribute(name, value) { this.attributes.set(name, String(value)); },
      getAttribute(name) { return this.attributes.get(name); },
      focus() { document.activeElement = this; },
      addEventListener(type, listener) { listeners.set(`${id}:${type}`, listener); },
    };
    elements.set(id, element);
    return element;
  }

  const opener = makeElement('opener');
  const search = makeElement('trash-search');
  const overlay = makeElement('trash-delete-overlay', ['hidden']);
  makeElement('trash-delete-message');
  makeElement('trash-delete-cancel');
  makeElement('trash-delete-confirm');
  makeElement('nav-trash');
  document.activeElement = opener;

  const state = { trash: [...entries] };
  const openers = new WeakMap();
  const translations = {
    'trash.confirmOne': 'Remove {title}; other items stay; no undo.',
    'trash.confirmMany': 'Remove {count} selected; other items stay; no undo.',
    'trash.cancelDelete': 'Cancel',
    'trash.deleteForever': 'Delete forever',
    'trash.deleting': 'Deleting…',
    'trash.deleted': 'Permanently deleted',
  };

  const context = vm.createContext({
    document,
    State: {
      get() { return state; },
      async persistNow() {
        calls.persists += 1;
        try {
          return await persistNow();
        } catch (error) {
          calls.recovery += 1;
          throw error;
        }
      },
      clearUndoHistory() { calls.clears += 1; },
    },
    tr(key, vars = {}) {
      return String(translations[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
    },
    archiveEntryTitle(entry) { return entry.data.title; },
    rememberOpener(element) { openers.set(element, document.activeElement); },
    restoreOpener(element) {
      const target = openers.get(element);
      openers.delete(element);
      if (!target || target.isConnected === false) return false;
      target.focus();
      return document.activeElement === target;
    },
    lockBodyScroll() { calls.locks += 1; },
    unlockBodyScroll() { calls.unlocks += 1; },
    trapTabKey() { calls.traps += 1; },
    renderBoard() { calls.renders += 1; opener.isConnected = false; },
    renderHeader() { calls.headers += 1; },
    updateNavChrome() { calls.nav += 1; },
    toast(message, options) { calls.toasts.push({ message, options }); },
    setTimeout(callback) { callback(); return 1; },
    Set,
  });

  vm.runInContext(
    `${dialogSource}\nglobalThis.__trash = { permanentlyDeleteTrashEntries, confirmTrashDelete, closeTrashDeleteDialog, bindTrashDeleteDialog };`,
    context,
    { filename: 'trash-recovery-production-contract.js' },
  );

  return { api: context.__trash, calls, document, elements, listeners, opener, overlay, search, state };
}

(async () => {
  const first = { data: { id: 'a', title: 'First save' } };
  const second = { data: { id: 'b', title: 'Second save' } };

  const cancel = buildHarness({ entries: [first, second], persistNow: async () => undefined });
  cancel.api.bindTrashDeleteDialog();
  assert.equal(cancel.api.permanentlyDeleteTrashEntries([first, first]), true, 'A valid single entry must open the dialog');
  assert.equal(cancel.overlay.classList.contains('hidden'), false, 'Dialog must become visible before any mutation');
  assert.equal(cancel.elements.get('trash-delete-message').textContent, 'Remove First save; other items stay; no undo.', 'Single-entry confirmation must name the exact item');
  assert.equal(cancel.document.activeElement.id, 'trash-delete-cancel', 'The safe Cancel action must receive initial focus');
  assert.equal(cancel.calls.locks, 1, 'Opening must lock background scroll');
  assert.equal(cancel.state.trash.length, 2, 'Opening must not mutate Trash');
  assert.equal(cancel.api.permanentlyDeleteTrashEntries([second]), false, 'An already-open confirmation must reject a second open request');
  assert.equal(cancel.calls.locks, 1, 'A repeated open request must not duplicate the scroll lock');
  cancel.elements.get('trash-delete-cancel').onclick();
  assert.equal(cancel.overlay.classList.contains('hidden'), true, 'Cancel must close the dialog');
  assert.equal(cancel.state.trash.length, 2, 'Cancel must preserve every Trash entry');
  assert.equal(cancel.document.activeElement, cancel.opener, 'Cancel must return focus to its opener');
  assert.equal(cancel.calls.unlocks, 1, 'Cancel must release background scroll');

  cancel.document.activeElement = cancel.opener;
  cancel.api.permanentlyDeleteTrashEntries([second]);
  const keydown = cancel.listeners.get('trash-delete-overlay:keydown');
  keydown({ key: 'Tab', preventDefault() {} });
  assert.equal(cancel.calls.traps, 1, 'Tab must stay inside the confirmation');
  let prevented = false;
  let stopped = false;
  keydown({
    key: 'Escape',
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
  });
  assert.equal(prevented, true, 'Escape must be consumed by the confirmation');
  assert.equal(stopped, true, 'Escape must not close a lower surface');
  assert.equal(cancel.overlay.classList.contains('hidden'), true, 'Escape must close only the confirmation');
  assert.equal(cancel.state.trash.length, 2, 'Escape must not mutate Trash');

  const write = deferred();
  const success = buildHarness({ entries: [first, second], persistNow: () => write.promise });
  success.api.bindTrashDeleteDialog();
  success.api.permanentlyDeleteTrashEntries([first, second]);
  const committing = success.api.confirmTrashDelete();
  assert.equal(success.elements.get('trash-delete-confirm').disabled, true, 'Confirm must disable while persistence is pending');
  assert.equal(success.elements.get('trash-delete-cancel').disabled, true, 'Cancel must disable once deletion persistence starts');
  assert.equal(success.elements.get('trash-delete-confirm').textContent, 'Deleting…', 'Pending persistence must have explicit feedback');
  assert.equal(success.overlay.getAttribute('aria-busy'), 'true', 'Pending persistence must be announced as busy');
  assert.equal(success.calls.toasts.length, 0, 'Pending persistence must not claim success');
  assert.equal(success.calls.clears, 0, 'Undo history must remain until persistence is confirmed');
  write.resolve();
  assert.equal(await committing, true, 'Confirmed persistence must complete deletion');
  assert.equal(success.state.trash.length, 0, 'Confirmed batch deletion must remove every selected entry once');
  assert.equal(success.calls.clears, 1, 'Confirmed deletion must clear Undo and Redo history');
  assert.equal(success.calls.renders, 1, 'Confirmed deletion must refresh the Trash surface');
  assert.equal(success.calls.headers, 1, 'Confirmed deletion must refresh Undo availability');
  assert.equal(success.calls.nav, 1, 'Confirmed deletion must refresh navigation counts');
  assert.equal(success.calls.toasts.length, 1, 'Confirmed persistence may show one success toast');
  assert.equal(success.overlay.classList.contains('hidden'), true, 'Confirmed deletion must close the dialog');
  assert.equal(success.document.activeElement, success.search, 'When the deleted opener disappears, focus must return to the Trash search');

  const failure = buildHarness({ entries: [first], persistNow: async () => { throw new Error('write failed'); } });
  failure.api.bindTrashDeleteDialog();
  failure.api.permanentlyDeleteTrashEntries([first]);
  assert.equal(await failure.api.confirmTrashDelete(), false, 'Rejected persistence must not report success');
  assert.equal(failure.calls.recovery, 1, 'Rejected persistence must route through the existing recovery boundary');
  assert.equal(failure.calls.clears, 0, 'Rejected persistence must not clear recovery history');
  assert.equal(failure.calls.renders, 0, 'Rejected persistence must not render a durable deletion');
  assert.equal(failure.calls.toasts.length, 0, 'Rejected persistence must not show a success toast');
  assert.equal(failure.overlay.classList.contains('hidden'), false, 'The confirmation remains under the fail-closed recovery overlay');

  const stale = buildHarness({ entries: [first], persistNow: async () => undefined });
  stale.api.bindTrashDeleteDialog();
  stale.api.permanentlyDeleteTrashEntries([first]);
  stale.state.trash.length = 0;
  assert.equal(await stale.api.confirmTrashDelete(), false, 'A stale selection must be a no-op');
  assert.equal(stale.calls.persists, 0, 'A stale selection must not write');
  assert.equal(stale.overlay.classList.contains('hidden'), true, 'A stale selection must close safely');

  const invalid = buildHarness({ entries: [], persistNow: async () => undefined });
  invalid.api.bindTrashDeleteDialog();
  assert.equal(invalid.api.permanentlyDeleteTrashEntries([first]), false, 'A foreign entry must not open a destructive dialog');
  assert.equal(invalid.calls.locks, 0, 'A foreign entry must not lock the page');

  console.log('Trash recovery contract passed (recoverable active removal, localized confirmation, persistence gating, no Undo bypass, focus, Tab, and Escape)');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
