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

// Delete forever asks on the shared Keep / Delete receipt since the 2026-11
// Archive & Trash page; the modal Trash dialog is gone.
const dialogSource = extractBetween(
  'let trashDeleteEntries = [];',
  '\n// CRUD',
);
const keySource = extractBetween('function archiveEntryKey(entry) {', '\n}\n') + '\n}\n';
const commonActsSource = extractBetween(
  'function commonActs(',
  '\nfunction renderReminderBadge',
);
const renderBoardSource = extractBetween('function renderBoard() {', '\n// ════');
const pageSource = extractBetween('function renderArchivePage(mode) {', '\nfunction renderArchiveSurface() {');

assert.equal(/id=["']trash-delete-/.test(html), false, 'the modal Trash dialog is gone; Delete forever asks on the shared receipt');
assert.equal(/#trash-delete-overlay/.test(css), false, 'no styles remain for the removed Trash dialog');
assert.equal(/trash-delete-overlay|closeTrashDeleteDialog/.test(source), false, 'no interlock or Escape path still names the removed Trash dialog');
assert.match(dialogSource,
  /toast\(one \? tr\('trash\.confirmTitle'\) : tr\('trash\.askMany', \{ count: valid\.length \}\), \{\s*tone: 'warning',\s*sub: one \? archiveEntryTitle\(valid\[0\]\) : '',\s*actionLabel: tr\('trash\.delete'\),\s*keepLabel: tr\('toast\.keep'\),\s*action: answerTrashDeleteAsk,\s*\}\);/,
  'Delete forever asks on the shared Keep / Delete receipt (toastAskFirst’s ask), naming the exact item');
assert.equal(dialogSource.includes('confirm('), false, 'Trash deletion must not use a native confirmation');
assert.equal(commonActsSource.includes('Delete permanently'), false, 'Active saved items must not expose a permanent-delete bypass');
assert.equal(commonActsSource.includes('cmIcons.delete'), false, 'Active saved-item actions must route removal through Archive');
assert.match(commonActsSource, /text:\s*tr\('itemAction\.archive'\)[\s\S]*archiveItem\(it\.id\)/, 'Active saved items must retain the localized recoverable Archive action');
assert.match(source, /'itemAction\.archive': 'Archive'/, 'English must name the active-item recovery action');
assert.match(source, /'itemAction\.archive': '封存'/, 'zh-TW must name the active-item recovery action');
assert.match(source, /clearUndoHistory\(\)\s*\{\s*history\.length = 0;\s*future\.length = 0;/, 'Confirmed deletion must clear Undo and Redo history');
assert.match(source, /bindTrashDeleteAsk\(\);\s*bindOrganizationDeleteDialog\(\);/, 'the initializer binds the ask to the shared receipt');
assert.match(renderBoardSource,
  /if \(trashDeleteAsk && !\(isArchivePageActive\(\) && activeLibraryMode === 'trash'\)\) closeTrashDeleteAsk\(\{ restoreFocus: false \}\);/,
  'leaving Trash closes an open Delete forever ask');
assert.match(pageSource, /reconcileTrashDeleteAsk\(\);[\s\S]*?paintArchivePage\(\);/,
  'every repaint of the page re-reads the ask’s entries before painting (an Undo closes a stale ask)');
assert.match(source, /if \(!archivePageEscape\(\)\) goHome\(\);/, 'Escape on Archive and Trash clears the selection before leaving the page');
assert.ok(source.includes("'trash.confirmTitle': 'Delete forever?'"), 'English asks whether to delete forever');
assert.ok(source.includes("'trash.askMany': 'Delete {count} items forever?'"), 'English asks about a selection by count');
assert.ok(source.includes("'trash.confirmTitle': '永久刪除？'"), 'zh-TW asks whether to delete forever');
assert.ok(source.includes("'trash.askMany': '永久刪除 {count} 個項目？'"), 'zh-TW asks about a selection by count');
assert.ok(source.includes("'trash.delete': 'Delete'") && source.includes("'trash.delete': '刪除'"), 'the irreversible answer is localized');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function buildHarness({ entries, persistNow }) {
  const calls = {
    persists: 0,
    clears: 0,
    renders: 0,
    headers: 0,
    nav: 0,
    toasts: [],
    removed: [],
    doom: [],
    recovery: 0,
  };
  const elements = new Map();
  const document = {
    activeElement: null,
    getElementById(id) { return elements.get(id) || null; },
    querySelectorAll() { return []; },
  };
  const makeElement = id => {
    const element = {
      id,
      classList: { values: new Set(), contains(value) { return this.values.has(value); } },
      dataset: {},
      focus() { document.activeElement = this; },
    };
    elements.set(id, element);
    return element;
  };
  const keep = makeElement('toast-keep');
  const toastEl = makeElement('toast');
  const opener = makeElement('opener');
  document.activeElement = opener;
  let observerCallback = null;
  const state = { trash: [...entries] };
  let recoveryRequired = false;
  const toastEntries = [];
  const translations = {
    'trash.confirmTitle': 'Delete forever?',
    'trash.askMany': 'Delete {count} items forever?',
    'trash.delete': 'Delete',
    'toast.keep': 'Keep',
    'trash.deleted': 'Permanently deleted',
  };
  const context = vm.createContext({
    document,
    toastEntries,
    State: {
      get() { return state; },
      async persistNow() {
        calls.persists += 1;
        try {
          return await persistNow();
        } catch (error) {
          calls.recovery += 1;
          recoveryRequired = true;
          throw error;
        }
      },
      clearUndoHistory() { calls.clears += 1; },
      isRecoveryRequired() { return recoveryRequired; },
    },
    tr(key, vars = {}) {
      return String(translations[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
    },
    archiveEntryTitle(entry) { return entry.data.title; },
    toast(message, options) {
      const entry = { message, options };
      toastEntries.push(entry);
      calls.toasts.push(entry);
      return true;
    },
    toastFront() { return toastEntries[toastEntries.length - 1] || null; },
    removeToastEntry(entry, options) {
      const index = toastEntries.indexOf(entry);
      if (index >= 0) toastEntries.splice(index, 1);
      calls.removed.push({ entry, options });
      return index >= 0;
    },
    syncArchivePageDoom(options) { calls.doom.push(options || null); },
    renderBoard() { calls.renders += 1; },
    renderHeader() { calls.headers += 1; },
    updateNavChrome() { calls.nav += 1; },
    requestAnimationFrame(callback) { callback(); return 1; },
    setTimeout(callback) { callback(); return 1; },
    MutationObserver: class {
      constructor(callback) { observerCallback = callback; }
      observe() {}
    },
    Set,
    Map,
  });
  vm.runInContext(
    `${keySource}\n${dialogSource}\nglobalThis.__trash = { permanentlyDeleteTrashEntries, confirmTrashDelete, closeTrashDeleteAsk, reconcileTrashDeleteAsk, bindTrashDeleteAsk, answerTrashDeleteAsk, isTrashDeleteAskOpen, state: () => ({ keys: trashDeleteKeys.slice(), entries: trashDeleteEntries.slice(), busy: trashDeleteBusy, ask: trashDeleteAsk }) };`,
    context,
    { filename: 'trash-recovery-production-contract.js' },
  );
  const api = context.__trash;
  api.bindTrashDeleteAsk();
  return {
    api, calls, document, keep, opener, state, toastEntries, toastEl,
    observe: () => observerCallback && observerCallback([]),
    setState(next) { state.trash = next; },
  };
}

const entry = (id, title, trashedAt = 900) => ({ kind: 'item', data: { id, type: 'tab', title }, at: 100, trashedAt });
const clone = value => JSON.parse(JSON.stringify(value));

(async () => {
  const first = entry('a', 'First save');
  const second = entry('b', 'Second save', 901);

  // The ask: no mutation until Delete, the exact item named, Keep focused.
  const ask = buildHarness({ entries: [first, second], persistNow: async () => undefined });
  assert.equal(ask.api.permanentlyDeleteTrashEntries([first, first]), true, 'A valid single entry must open the ask');
  assert.equal(ask.calls.toasts.length, 1, 'one receipt asks');
  const [askToast] = ask.calls.toasts;
  assert.equal(askToast.message, 'Delete forever?', 'the ask says it cannot be undone');
  assert.equal(askToast.options.sub, 'First save', 'Single-entry confirmation must name the exact item');
  assert.deepEqual([askToast.options.tone, askToast.options.actionLabel, askToast.options.keepLabel], ['warning', 'Delete', 'Keep'], 'the shared Keep / Delete ask');
  assert.equal(ask.document.activeElement, ask.keep, 'The safe Keep answer must receive initial focus');
  assert.equal(ask.state.trash.length, 2, 'Asking must not mutate Trash');
  assert.equal(ask.api.isTrashDeleteAskOpen(), true);
  assert.deepEqual(ask.calls.doom.at(-1), null, 'the asked rows are marked on the page');

  // A second Delete forever replaces the open ask (one question at a time).
  assert.equal(ask.api.permanentlyDeleteTrashEntries([second]), true, 'a new ask replaces the open one');
  assert.equal(ask.calls.removed[0].entry, askToast, 'the earlier ask leaves the receipt stack');
  assert.deepEqual(clone(ask.api.state().keys), ['i:b:901'], 'the ask is now about the newer request only');
  assert.equal(ask.calls.toasts.at(-1).options.sub, 'Second save');

  // Keep (or Escape, or the close button) takes the receipt away: the ask
  // closes with it and Trash is untouched.
  ask.toastEntries.length = 0;
  ask.observe();
  assert.equal(ask.api.isTrashDeleteAskOpen(), false, 'Keep closes the ask');
  assert.deepEqual(clone(ask.api.state().keys), [], 'a closed ask holds nothing');
  assert.deepEqual(clone(ask.calls.doom.at(-1)), { closedKeys: ['i:b:901'] }, 'the page unmarks the row and can return focus to it');
  assert.equal(ask.state.trash.length, 2, 'Keep must preserve every Trash entry');

  // Delete: the write waits for storage; only then does history clear and the
  // receipt turn into its result.
  const write = deferred();
  const success = buildHarness({ entries: [first, second], persistNow: () => write.promise });
  success.api.permanentlyDeleteTrashEntries([first, second]);
  assert.equal(success.calls.toasts[0].message, 'Delete 2 items forever?', 'a selection is asked about by count');
  const answering = success.calls.toasts[0].options.action();
  assert.equal(success.api.state().busy, true, 'the ask is busy while persistence is pending');
  assert.equal(success.api.permanentlyDeleteTrashEntries([first]), false, 'no second ask while a deletion is pending');
  assert.equal(success.api.closeTrashDeleteAsk(), false, 'a pending deletion cannot be dismissed into a half state');
  assert.equal(success.calls.clears, 0, 'Undo history must remain until persistence is confirmed');
  assert.equal(success.calls.renders, 0, 'Pending persistence must not repaint a durable deletion');
  write.resolve();
  assert.deepEqual(clone(await answering), { message: 'Permanently deleted', tone: 'info' }, 'Confirmed persistence turns the ask into its result');
  assert.equal(success.state.trash.length, 0, 'Confirmed batch deletion must remove every selected entry once');
  assert.equal(success.calls.clears, 1, 'Confirmed deletion must clear Undo and Redo history');
  assert.equal(success.calls.renders, 1, 'Confirmed deletion must refresh the Trash surface');
  assert.equal(success.calls.headers, 1, 'Confirmed deletion must refresh Undo availability');
  assert.equal(success.calls.nav, 1, 'Confirmed deletion must refresh navigation counts');
  assert.equal(success.api.isTrashDeleteAskOpen(), false, 'the answered ask is no longer an open question');
  assert.equal(success.calls.removed.length, 0, 'the receipt stays to show the result');

  // A refused write reports no success; the recovery overlay owns the page.
  const failure = buildHarness({ entries: [first], persistNow: async () => { throw new Error('write failed'); } });
  failure.api.permanentlyDeleteTrashEntries([first]);
  await assert.rejects(failure.calls.toasts[0].options.action(), /not confirmed/, 'Rejected persistence must not report success');
  assert.equal(failure.calls.recovery, 1, 'Rejected persistence must route through the existing recovery boundary');
  assert.equal(failure.calls.clears, 0, 'Rejected persistence must not clear recovery history');
  assert.equal(failure.calls.renders, 0, 'Rejected persistence must not render a durable deletion');

  // A stale ask writes nothing and closes.
  const stale = buildHarness({ entries: [first], persistNow: async () => undefined });
  stale.api.permanentlyDeleteTrashEntries([first]);
  stale.setState([]);
  assert.equal(await stale.calls.toasts[0].options.action(), null, 'A stale selection must be a no-op');
  assert.equal(stale.calls.persists, 0, 'A stale selection must not write');
  assert.equal(stale.api.isTrashDeleteAskOpen(), false, 'A stale selection must close safely');

  // Undo rebuilds every stored object: the ask follows its entries by key.
  const rebuilt = buildHarness({ entries: [first, second], persistNow: async () => undefined });
  rebuilt.api.permanentlyDeleteTrashEntries([first]);
  const copies = clone(rebuilt.state.trash);
  rebuilt.setState(copies);
  assert.equal(rebuilt.api.reconcileTrashDeleteAsk(), true, 'an unrelated Undo keeps the ask');
  assert.equal(rebuilt.api.state().entries[0], copies[0], 'the ask now holds the rebuilt entry');
  assert.deepEqual(clone(await rebuilt.calls.toasts[0].options.action()), { message: 'Permanently deleted', tone: 'info' });
  assert.deepEqual(clone(rebuilt.state.trash), [clone(second)], 'the rebuilt entry, and only it, is deleted');

  // Review finding A-1: Undo of the Move to Trash takes the item out of Trash;
  // the ask about it closes, and a late Delete reports nothing.
  const undone = buildHarness({ entries: [first], persistNow: async () => undefined });
  undone.api.permanentlyDeleteTrashEntries([first]);
  const lateAnswer = undone.calls.toasts[0].options.action;
  undone.setState([]);
  assert.equal(undone.api.reconcileTrashDeleteAsk(), false, 'an Undo that empties the ask closes it');
  assert.equal(undone.calls.removed.at(-1).entry, undone.calls.toasts[0], 'the stale ask leaves the receipt stack');
  assert.deepEqual(clone(undone.calls.removed.at(-1).options), { restoreFocus: true }, 'focus leaves the closed ask');
  assert.equal(await lateAnswer(), null, 'a Delete pressed after the item left Trash reports no deletion');
  assert.equal(undone.calls.persists, 0, 'and writes nothing');

  // The page wraps the write with its motion through `run`.
  const ran = [];
  const hooked = buildHarness({ entries: [first], persistNow: async () => undefined });
  hooked.api.permanentlyDeleteTrashEntries([first], { run: async commit => { ran.push('before'); const ok = await commit(); ran.push(ok); return ok; } });
  await hooked.calls.toasts[0].options.action();
  assert.deepEqual(ran, ['before', true], 'the page runs the confirmed write inside its own motion hold');

  const invalid = buildHarness({ entries: [], persistNow: async () => undefined });
  assert.equal(invalid.api.permanentlyDeleteTrashEntries([first]), false, 'A foreign entry must not open a destructive ask');
  assert.equal(invalid.calls.toasts.length, 0, 'A foreign entry must not show an ask');

  console.log('Trash recovery contract passed (recoverable active removal, the shared Keep / Delete ask naming the item, persistence gating, no Undo bypass, an Undo closes a stale ask, focus on Keep)');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
