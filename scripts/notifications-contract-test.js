'use strict';

// Contract test for the shared notification style (2026-11 canvas): the toast
// component's wiring, the popup receipt, system reminder notifications with
// Done / Snooze answers, and the in-Locus card for a reminder that comes due.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const newtab = read('newtab.js');
const html = read('newtab.html');
const css = read('newtab.css');
const popupJs = read('popup.js');
const popupCss = read('popup.css');
const background = read('background.js');
const planSource = read('plan.js');
let checks = 0;
const plain = value => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const eq = (actual, expected, message) => { assert.deepEqual(plain(actual), expected, message); checks += 1; };
function newtabFunction(name) {
  const start = newtab.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is extractable`);
  const open = newtab.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < newtab.length; index += 1) {
    if (newtab[index] === '{') depth += 1;
    else if (newtab[index] === '}') { depth -= 1; if (depth === 0) return newtab.slice(start, index + 1); }
  }
  throw new Error(name);
}

function testToastWiring() {
  ok(/const TOAST_UNDO_MS = 5200;/.test(newtab), 'Undo receipts drain over 5.2 seconds');
  ok(/while \(toastEntries\.length > 2\) toastEntries\.shift\(\);/.test(newtab), 'at most two receipts are kept');
  ok(/<div id="toast-behind" class="hidden" aria-hidden="true" inert>/.test(html), 'the receipt behind is hidden from assistive technology and inert');
  ok(/<span id="toast-drain" class="toast-drain" aria-hidden="true"><\/span>\n  <\/div>/.test(html), 'the drain bar lives inside the receipt');
  ok(/<span id="toast-sub" class="toast-sub" hidden><\/span>/.test(html), 'the receipt has an optional sub-label');
  ok(/t\.addEventListener\('focusin', holdToast\);\n\s*t\.addEventListener\('pointerenter', \(\) => \{\n\s*toastHovered = true;\n\s*holdToast\(\);/.test(newtab), 'hover and focus hold the receipt');
  // N5: the running rule must not use the animation shorthand (it resets
  // animation-play-state and out-ranks the pause rules). Checked on the parsed
  // declarations of each rule, not a whole-file pattern.
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({ selector: match[1].trim(), body: match[2] }));
  const running = rules.filter(rule => /\.toast-drain\.is-running/.test(rule.selector));
  ok(running.length === 1 && !/(^|;|\s)animation\s*:/.test(running[0].body) && !/animation-play-state/.test(running[0].body) && /animation-name:\s*locus-toast-drain/.test(running[0].body),
    'the running drain sets longhands only, so it never overrides the pause');
  const pause = rules.find(rule => /#toast \.toast-drain\.is-paused/.test(rule.selector) && /#toast\.is-held \.toast-drain/.test(rule.selector));
  ok(pause && /animation-play-state:\s*paused/.test(pause.body), 'the drain pauses while held or paused');
  ok(/const _escToastFirst = !_overlayWasOpen && !higherLayerOpen && !inField\n\s*&& !currentDetailItemId\(\)\n\s*&& !\(_escSearchBar && !_escSearchBar\.classList\.contains\('hidden'\)\)\n\s*&& !\(typeof isTodayTabsDrawerOpen === 'function' && isTodayTabsDrawerOpen\(\)\)\n\s*&& !\(_escTabRail && _escTabRail\.contains\(document\.activeElement\)\)\n[^\n]*\n\s*&& !itemSelMode && !selectedItemIds\.size && !selectedTabIds\.size\n\s*&& !document\.body\.classList\.contains\('reorder-mode'\);\n\s*if \(_escToastFirst && dismissToastForEscape\(\)\) \{ e\.preventDefault\(\); return; \}/.test(newtab),
    'Escape reaches the newest receipt only when no dialog, field, detail pane, search bar, Opened Tabs rail, select mode, or reorder mode would take it (N8)');
  ok(/@media \(max-width: 760px\) \{\n\s*body\[data-surface="home"\] #toast-behind \{ bottom: 84px; \}\n\}/.test(css)
    && css.indexOf('body[data-surface="home"] #toast-behind { bottom: 84px; }') > css.indexOf('body[data-surface="home"] #toast-behind { bottom: 108px; }'),
    'on a narrow Home the receipt behind sits with the front one, after the base rule (N16)');
  ok(!/\b(?:window\.)?confirm\(|\balert\(/.test(newtab.replace(/\/\/[^\n]*/g, '')), 'no native confirm() or alert() is left (N6)');
  ok((newtab.match(/toast\(tr\('history\.reminderReconcileWarning'\), \{ tone: 'warning', \.\.\.reminderReconcileRetry\(\) \}\);/g) || []).length === 4,
    'every reminder-alarm failure offers Retry (N6)');
  for (const key of ['tools.deleted', 'tools.deletedTransaction']) {
    ok(new RegExp(`toast\\(tr\\('${key.replace('.', '\\.')}'[^)]*\\)[^;]*undo: true`).test(newtab), `${key} receipts offer Undo`);
  }
  ok(/toastAskFirst\(tr\('tools\.waterResetAsk'\)/.test(newtab), 'the water reset (no Undo) asks with Keep / Reset');
  ok(newtab.indexOf('_escToastFirst && dismissToastForEscape()') > newtab.indexOf('const _overlayWasOpen = _escBlockers.some'), 'the receipt step comes after the overlay check');
  ok(/e\.key\.toLowerCase\(\) === 'z' && !inField\) \{ e\.preventDefault\(\); performUndo\(\); \}/.test(newtab), 'Ctrl+Z still undoes from history');
  ok(/const undoneId = expectedActionId \?\? /.test(newtab) && /toast\(tr\('history\.undid', \{ action: label \}\), \{ tone: 'info', glyph: 'undo', duration: 1600, replaceUndo: undoneId \}\);/.test(newtab),
    'the Undo result morphs the receipt that offered it into "Undone"');
  ok(/if \(result && typeof result\.then === 'function'\) \{\n\s*entry\.busy = true;/.test(newtab), 'an action that returns a promise shows a spinner in place');
  ok(/body\[data-theme\] #toast\[data-busy="true"\] #toast-mark::before \{[\s\S]*animation: locus-toast-spin/.test(css), 'the busy receipt shows a spinner');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n\s*body\[data-theme\] #toast,[\s\S]*?\.toast-drain \{ display: none; \}/.test(css), 'reduced motion removes entrance, morph, and drain');
  for (const [tone, colour] of [['info', '#35423c'], ['warning', '#ff5b2e'], ['error', '#e0281b']]) {
    ok(new RegExp(`#toast\\[data-tone="${tone}"\\][^{]*\\{ --toast-icon: ${colour}; \\}`).test(css), `${tone} receipts use the ${colour} icon circle`);
  }
  ok(/background: var\(--today-now, #19231f\);/.test(css), 'the receipt is the dark registry card');
}

// ── The real toast controller in a VM (N17) ──
function toastHarness() {
  const start = newtab.indexOf('let toastTimer = null;');
  const end = newtab.indexOf('\nfunction reconcileRemindersAfterHistoryChange', start);
  assert.ok(start > 0 && end > start, 'the toast controller is extractable');
  let clock = 1000000;
  const els = new Map();
  const doc = { activeElement: null };
  const classes = init => {
    const set = new Set(init);
    return {
      add: (...names) => names.forEach(name => set.add(name)),
      remove: (...names) => names.forEach(name => set.delete(name)),
      contains: name => set.has(name),
      toggle(name, force) { const on = force === undefined ? !set.has(name) : force; if (on) set.add(name); else set.delete(name); return on; },
    };
  };
  const inside = ['toast-msg', 'toast-action', 'toast-undo', 'toast-keep', 'toast-close'];
  const el = (id, init = []) => {
    const events = new Map();
    const element = {
      id, dataset: {}, classList: classes(init), style: { setProperty() {} }, textContent: '', hidden: false, disabled: false,
      onclick: null, isConnected: true, offsetWidth: 1, scrollHeight: 0, clientHeight: 0, scrollTop: 0, events,
      addEventListener: (type, fn) => events.set(type, fn), setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
      querySelector: () => null, matches: () => false,
      focus() { doc.activeElement = element; },
      contains: target => target === element || (id === 'toast' && inside.includes(target?.id)),
    };
    els.set(id, element);
    return element;
  };
  const host = el('toast', ['hidden']);
  ['toast-msg', 'toast-sub', 'toast-drain', 'toast-close'].forEach(id => el(id));
  ['toast-action', 'toast-undo', 'toast-keep', 'toast-behind'].forEach(id => el(id, ['hidden']));
  const opener = el('opener');
  doc.activeElement = opener;
  doc.getElementById = id => els.get(id) || null;
  const timers = new Map();
  let nextTimer = 1;
  const history = [];
  const sent = [];
  let reconcileOk = false;
  const State = {
    latestActionId: () => history.at(-1) ?? null,
    async undo(expected = null) {
      if (!history.length) return null;
      if (expected != null && history.at(-1) !== expected) throw Object.assign(new Error('stale'), { code: 'LOCUS_UNDO_STALE' });
      return `action ${history.pop()}`;
    },
  };
  const context = vm.createContext({
    document: doc, State, Set, Promise, console, Number, String, Math, Array, Object,
    Date: { now: () => clock },
    window: { addEventListener() {} },
    rafThrottle: fn => fn,
    tr: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
    renderAll() {},
    reconcileRemindersAfterHistoryChange() {},
    chrome: {
      runtime: { sendMessage: async message => { sent.push(message.type); return { ok: reconcileOk }; } },
      notifications: { clear: async id => { sent.push(`clear:${id}`); return true; } },
    },
    setTimeout(callback, ms) { const id = nextTimer; nextTimer += 1; timers.set(id, { callback, ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) { callback(); return 1; },
  });
  vm.runInContext(`${newtab.slice(start, end)}\nglobalThis.__t = { toast, dismissToast, performUndo, holdToast, releaseToast, dropToastUndoAfterHistoryReset, toastAskFirst, reminderReconcileRetry, clearItemReminderNotice, entries: () => toastEntries, held: () => toastHeld };`, context, { filename: 'toast-controller.js' });
  const fire = () => {
    const [id, timer] = [...timers.entries()][0] || [];
    if (!id) return false;
    timers.delete(id);
    clock += timer.ms;
    timer.callback();
    return true;
  };
  return {
    t: context.__t, host, opener, els, doc, history, timers, sent, fire,
    setReconcile: value => { reconcileOk = value; },
    msg: () => els.get('toast-msg').textContent,
    shown: id => !els.get(id).classList.contains('hidden'),
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

async function testToastController() {
  // N4: an older Undo receipt whose action is no longer the latest leaves with
  // the front one instead of coming forward with a dead Undo.
  let e = toastHarness();
  e.history.push(7); e.t.toast('Archived X', { undo: 7 });
  e.history.push(8); e.t.toast('Archived Y', { undo: 8 });
  e.fire();
  eq([e.shown('toast'), e.t.entries().length], [false, 0], 'a stale Undo receipt is not promoted');
  e = toastHarness();
  e.history.push(7); e.t.toast('Archived X', { undo: 7 });
  e.t.toast('Link copied', { tone: 'info' });
  e.fire();
  eq([e.msg(), e.shown('toast-undo')], ['Archived X', true], 'a receipt whose Undo is still the latest comes forward with it');
  e.els.get('toast-undo').onclick();
  await flush(); await flush();
  eq([e.history.length, e.msg()], [0, 'history.undid:{"action":"action 7"}'], 'and that Undo works');
  // N4: an outside write clears history; Undo receipts on screen lose Undo.
  e = toastHarness();
  e.history.push(7); e.t.toast('Moved to Trash', { undo: 7 });
  e.history.push(8); e.t.toast('Archived Y', { undo: 8 });
  e.history.length = 0;
  e.t.dropToastUndoAfterHistoryReset();
  eq([e.msg(), e.shown('toast-undo'), e.t.entries().length], ['Archived Y', false, 1], 'after history is cleared the front keeps its message without Undo, and the one behind goes');
  // N9: hover is its own flag, so a receipt arriving under the pointer stays held.
  e = toastHarness();
  e.history.push(1); e.t.toast('First', { undo: 1 });
  e.host.events.get('pointerenter')();
  e.t.toast('Copied', { tone: 'info' });
  eq([e.t.held(), e.timers.size], [true, 0], 'a new receipt under the pointer stays held');
  e.host.events.get('pointerleave')();
  eq([e.t.held(), e.timers.size], [false, 1], 'leaving resumes it');
  // N14: the focus return target lasts until the stack is empty.
  e = toastHarness();
  e.history.push(1); e.t.toast('One', { undo: 1 });
  e.t.toast('Two', { tone: 'info' });
  e.doc.activeElement = e.els.get('toast-close');
  e.t.dismissToast({ restoreFocus: true });
  eq(e.doc.activeElement.id, 'opener', 'closing the front receipt returns focus');
  e.doc.activeElement = e.els.get('toast-close');
  e.t.dismissToast({ restoreFocus: true });
  eq(e.doc.activeElement.id, 'opener', 'closing the second receipt returns focus too');
  // N6: Retry on a real failure path, with a result state.
  e = toastHarness();
  e.t.toast('history.reminderReconcileWarning', { tone: 'warning', ...e.t.reminderReconcileRetry() });
  eq([e.msg(), e.els.get('toast-action').textContent, e.timers.size], ['history.reminderReconcileWarning', 'toast.retry', 0], 'a reminder-alarm failure offers Retry and waits');
  e.els.get('toast-action').onclick();
  eq(e.t.entries()[0].busy, true, 'Retry shows a spinner');
  await flush(); await flush();
  eq([e.msg(), e.shown('toast-action'), e.sent], ['history.reminderReconcileStill', true, ['reconcile-reminders']], 'a failed retry says so and keeps Retry');
  e.setReconcile(true);
  e.els.get('toast-action').onclick();
  await flush(); await flush();
  eq([e.msg(), e.shown('toast-action'), [...e.timers.values()].map(timer => timer.ms)], ['history.reminderReconcileFixed', false, [2400]], 'a successful retry turns into its result and leaves');
  e = toastHarness();
  e.t.toast('Sync', { actionLabel: 'Go', action: () => Promise.reject(new Error('down')) });
  e.els.get('toast-action').onclick();
  await flush(); await flush();
  eq([e.msg(), e.shown('toast-action')], ['toast.actionFailed', true], 'a rejected action keeps the action offered under a failure line');
  // N6: Keep/Delete for a change with no Undo.
  e = toastHarness();
  let confirmed = 0;
  e.t.toastAskFirst('Reset today?', { actionLabel: 'Reset', onConfirm: () => { confirmed += 1; return { message: 'Reset done', tone: 'success' }; } });
  eq([e.shown('toast-keep'), e.els.get('toast-keep').textContent, e.els.get('toast-action').textContent], [true, 'toast.keep', 'Reset'], 'the receipt offers Keep beside the action');
  e.els.get('toast-keep').onclick();
  eq([e.shown('toast'), confirmed], [false, 0], 'Keep closes it and changes nothing');
  e.t.toastAskFirst('Reset today?', { actionLabel: 'Reset', onConfirm: () => { confirmed += 1; return { message: 'Reset done', tone: 'success' }; } });
  e.els.get('toast-action').onclick();
  eq([confirmed, e.msg(), e.shown('toast-keep')], [1, 'Reset done', false], 'the action runs once and the receipt shows the result');
  // N15: answering on the card clears the system notice.
  e = toastHarness();
  e.t.clearItemReminderNotice('t1');
  await flush();
  eq(e.sent, ['clear:te-notif-t1'], 'the card can clear the item’s system notice');
}

function testPopupReceipt() {
  const fnStart = popupJs.indexOf('function toast(message, { persistent = false, tone = \'\' } = {}) {');
  ok(fnStart > 0, 'the popup receipt takes an explicit tone');
  const fnEnd = popupJs.indexOf('\n}\n', fnStart) + 3;
  const el = { classList: { add() {}, remove() {} }, dataset: {}, attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } };
  const popup = vm.createContext({ $: () => el, requestAnimationFrame: fn => fn(), clearTimeout() {}, setTimeout: () => 1, toastTimer: null });
  vm.runInContext(`let toastTimer = null;\n${popupJs.slice(fnStart, fnEnd)}\nglobalThis.__toast = toast;`, popup);
  const tone = (opts) => { popup.__toast('x', opts); return [el.dataset.tone, el.attrs.role]; };
  eq([tone({ tone: 'error' }), tone({ tone: 'warning' }), tone({}), tone({ persistent: true })],
    [['error', 'alert'], ['warning', 'status'], ['success', 'status'], ['error', 'alert']], 'the popup receipt shows the tone its caller names (N7)');
  for (const [key, expected] of [['couldNotHibernate', 'error'], ['cannotSave', 'warning'], ['openFirst', 'warning'], ['captureBusy', 'warning'], ['bookmarksUnavailable', 'warning'], ['alreadySaved', 'info'], ['noBookmarks', 'info']]) {
    const calls = [...popupJs.matchAll(new RegExp(`toast\\(tr\\('${key}'\\)([^)]*)\\)`, 'g'))];
    ok(calls.length && calls.every(call => call[1].includes(`tone: '${expected}'`)), `every ${key} receipt is ${expected}`);
  }
  ok(/#pop-toast\[data-tone="warning"\] \{ --pop-toast-icon: #ff5b2e; \}/.test(popupCss) && /#pop-toast\[data-tone="info"\] \{ --pop-toast-icon: #35423c; \}/.test(popupCss), 'the popup has warning and info circles');
  ok(/#pop-toast \{\n  --pop-toast-icon: #197654;[\s\S]*background: #19231f;/.test(popupCss), 'the popup receipt is the same dark card');
  ok(/#pop-toast\[data-tone="error"\] \{ --pop-toast-icon: #e0281b; \}/.test(popupCss), 'a popup problem uses the red circle');
}

function backgroundHarness({ state, failWrite = false, locale = 'en' } = {}) {
  const start = background.indexOf('const REMINDER_SNOOZE_MS');
  const end = background.indexOf('if (chrome.notifications?.onButtonClicked?.addListener)');
  assert.ok(start > 0 && end > start, 'the reminder notice code is extractable');
  const calls = { writes: [], reconciled: [], cleared: [], attention: [] };
  const context = vm.createContext({
    console,
    Date,
    chrome: { runtime: { getURL: file => `chrome-extension://locus/${file}` } },
    appLocale: () => locale,
    stripHtml: value => String(value).replace(/<[^>]*>/g, '').trim(),
    getState: async () => state,
    setState: async next => { if (failWrite) throw new Error('write failed'); calls.writes.push(JSON.parse(JSON.stringify(next))); },
    findItemById: (s, id) => {
      for (const ws of s.workspaces) for (const cat of ws.categories) for (const group of cat.groups) {
        const item = group.items.find(candidate => candidate.id === id);
        if (item) return { item, ws, cat, group };
      }
      return null;
    },
    clearNativeNotification: async id => { calls.cleared.push(id); },
    requestReminderAlarmReconciliation: async reason => { calls.reconciled.push(reason); return { ok: true }; },
    showReminderAttention: async (...args) => { calls.attention.push(args); },
  });
  vm.runInContext(background.slice(start, end), context, { filename: 'background-reminder-notice.js' });
  return { context, calls };
}

async function testSystemNotifications() {
  const due = new Date(2026, 10, 11, 14, 30).getTime();
  const state = () => ({
    settings: {},
    workspaces: [{ categories: [{ name: 'Locus build', groups: [{ items: [
      { id: 't1', type: 'todo', text: '<b>Read</b> storage quotas', reminder: { at: due, notified: true } },
      { id: 'p1', type: 'tab', title: 'Nishiki Market', url: 'https://example.test', reminder: { at: due, notified: true } },
    ] }] }] }],
  });
  const s = state();
  const { context } = backgroundHarness({ state: s });
  const todoOptions = context.reminderNoticeOptions(s, context.findItemById(s, 't1'), due);
  eq([todoOptions.title, todoOptions.message], ['Read storage quotas', 'Due 14:30 · Locus build'], 'the task title and "Due HH:MM · Space"');
  eq(todoOptions.buttons, [{ title: 'Done' }, { title: 'Snooze 10 min' }], 'a to-do offers Done and Snooze 10 min');
  ok(todoOptions.iconUrl === 'chrome-extension://locus/icons/icon128.png', 'the Locus icon');
  ok(!/⏰/.test(todoOptions.title), 'no emoji prefix');
  eq(context.reminderNoticeOptions(s, context.findItemById(s, 'p1'), due).buttons, [{ title: 'Snooze 10 min' }], 'a page offers Snooze 10 min');
  const zh = backgroundHarness({ state: s, locale: 'zh-TW' }).context.reminderNoticeOptions(s, context.findItemById(s, 't1'), due);
  eq([zh.message, zh.buttons.map(button => button.title)], ['14:30 到期 · Locus build', ['完成', '10 分鐘後再提醒']], 'zh-TW copy');

  const doneState = state();
  const done = backgroundHarness({ state: doneState });
  const doneResult = await done.context.answerReminderNotice('te-notif-t1', 0, due + 60000);
  eq([doneResult.ok, doneResult.action], [true, 'done'], 'Done answers the to-do');
  eq(done.calls.writes[0].workspaces[0].categories[0].groups[0].items[0].done, true, 'Done marks the to-do done through one state write');
  eq([done.calls.reconciled, done.calls.cleared], [['reminder-notice-done'], ['te-notif-t1']], 'alarms are reconciled and the notification is cleared');

  const snoozeState = state();
  const snooze = backgroundHarness({ state: snoozeState });
  await snooze.context.answerReminderNotice('te-notif-t1', 1, due + 60000);
  eq(snooze.calls.writes[0].workspaces[0].categories[0].groups[0].items[0].reminder, { at: due + 60000 + 600000, notified: false }, 'Snooze moves the reminder 10 minutes on and re-arms it');
  const pageState = state();
  const page = backgroundHarness({ state: pageState });
  await page.context.answerReminderNotice('te-notif-p1', 0, due);
  eq(page.calls.writes[0].workspaces[0].categories[0].groups[0].items[1].reminder.at, due + 600000, 'a page’s only button snoozes');

  // A repeating reminder has already re-armed when it fires; Snooze would move
  // the whole series, so it is neither offered nor accepted.
  const repeating = state();
  repeating.workspaces[0].categories[0].groups[0].items[0].reminder = { at: due + 86400000, notified: false, recur: { every: 'day', interval: 1 } };
  repeating.workspaces[0].categories[0].groups[0].items[1].reminder = { at: due + 86400000, notified: false, recur: { every: 'day', interval: 1 } };
  const rep = backgroundHarness({ state: repeating });
  eq(rep.context.reminderNoticeOptions(repeating, rep.context.findItemById(repeating, 't1'), due).buttons, [{ title: 'Done' }], 'a repeating to-do offers Done only');
  ok(!('buttons' in rep.context.reminderNoticeOptions(repeating, rep.context.findItemById(repeating, 'p1'), due)), 'a repeating page offers no answer buttons');
  eq((await rep.context.answerReminderNotice('te-notif-t1', 1, due)).reason, 'no-action', 'no second button exists on a repeating to-do');
  eq((await rep.context.answerReminderNotice('te-notif-p1', 0, due)).reason, 'no-action', 'no button exists on a repeating page');
  eq(rep.calls.writes.length, 0, 'nothing about a repeating series is written');

  // A notice left in the notification centre after its reminder was moved must
  // not snooze over the newer time.
  const moved = state();
  moved.workspaces[0].categories[0].groups[0].items[0].reminder = { at: due + 3 * 86400000, notified: false };
  const stale = backgroundHarness({ state: moved });
  const staleResult = await stale.context.answerReminderNotice('te-notif-t1', 1, due + 5 * 3600000);
  eq([staleResult.ok, staleResult.reason, stale.calls.writes.length, stale.calls.cleared], [false, 'stale', 0, ['te-notif-t1']], 'a stale Snooze is ignored and its notification cleared');
  eq(moved.workspaces[0].categories[0].groups[0].items[0].reminder.at, due + 3 * 86400000, 'the newer reminder time is kept');

  // N15: a to-do finished on the card (or anywhere) keeps notified: true, so
  // Snooze on its leftover notice must be refused as stale, not re-arm it.
  const finished = state();
  finished.workspaces[0].categories[0].groups[0].items[0].done = true;
  const fin = backgroundHarness({ state: finished });
  const finResult = await fin.context.answerReminderNotice('te-notif-t1', 1, due + 60000);
  eq([finResult.ok, finResult.reason, fin.calls.writes.length, fin.calls.cleared], [false, 'stale', 0, ['te-notif-t1']], 'Snooze on a finished to-do is stale and writes nothing');
  eq(finished.workspaces[0].categories[0].groups[0].items[0].reminder, { at: due, notified: true }, 'the finished to-do is not re-armed');

  // N13: Group and Space reminders use the same copy and language.
  const groupNotice = context.entityReminderNoticeOptions(s, { name: 'Reading list' }, { label: 'Weekly review', at: due }, due);
  eq([groupNotice.title, groupNotice.message, 'buttons' in groupNotice], ['Weekly review', 'Due 14:30 · Reading list', false], 'a Group reminder reads "Due HH:MM · <name>"');
  eq(context.entityReminderNoticeOptions(s, { name: 'Thesis' }, { at: due }, due).title, 'Thesis', 'an unlabelled reminder uses the Space name');
  const zhGroup = backgroundHarness({ state: s, locale: 'zh-TW' }).context.entityReminderNoticeOptions(s, { name: 'Thesis' }, { at: due }, due);
  eq(zhGroup.message, '14:30 到期 · Thesis', 'Group and Space notices follow zh-TW');
  ok(/entityReminderNoticeOptions\(s, ent, r, r\.at\)\);/.test(background) && !/'Group: '|'Category: '|'⏰ '/.test(background), 'the alarm path uses the shared copy, with no English labels or emoji');

  const failed = backgroundHarness({ state: state(), failWrite: true });
  const failure = await failed.context.answerReminderNotice('te-notif-t1', 0, due);
  eq([failure.ok, failed.calls.attention.length, failed.calls.cleared.length], [false, 1, 0], 'a failed write reports and leaves the notification');
  const missing = backgroundHarness({ state: state() });
  eq((await missing.context.answerReminderNotice('te-notif-gone', 0, due)).reason, 'missing', 'a missing item clears its notification');
  eq((await missing.context.answerReminderNotice('te-capture-error-1', 0, due)).reason, 'not-a-reminder', 'other notifications are not answered');
  ok(/chrome\.notifications\?\.onButtonClicked\?\.addListener/.test(background), 'buttons are wired only where the API exists');
  ok(/createNativeNotification\('te-notif-' \+ itemId, reminderNoticeOptions\(s, found, it\.reminder\.at\)\)/.test(background), 'item reminders use the new notice');
}

function testDueCard() {
  const context = vm.createContext({ console, Date, Math, JSON, Map, Set, localStorage: { getItem: () => null, setItem() {} }, appLocale: () => 'en', tr: key => key });
  vm.runInContext(`const PLAN_VIEWS = ['upcoming', 'sort']; const CAL_VIEWS = ['month', 'week', 'agenda'];\n${planSource}`, context, { filename: 'plan.js' });
  const at = (h, m = 0) => new Date(2026, 10, 11, h, m).getTime();
  const ws = { id: 'w', categories: [{ id: 's', groups: [{ id: 'g', items: [
    { id: 'before', type: 'todo', text: 'Due before open', reminder: { at: at(8) } },
    { id: 'a', type: 'todo', text: 'A', reminder: { at: at(10, 5) } },
    { id: 'b', type: 'todo', text: 'B', reminder: { at: at(10, 9) } },
    { id: 'later', type: 'todo', text: 'Later', reminder: { at: at(11) } },
    { id: 'done', type: 'todo', text: 'Done', done: true, reminder: { at: at(10, 8) } },
    { id: 'page', type: 'tab', title: 'Page', reminder: { at: at(10, 7) } },
  ] }] }] };
  const now = at(10, 10);
  const since = at(10);
  eq(context.planDueCandidate(ws, now, since).id, 'b', 'the latest open to-do that came due while Locus was open');
  eq(context.planDueCandidate(ws, now, since, new Set(['b@' + at(10, 9)])).id, 'page', 'an answered reminder is not shown again; a page reminder is next (N11)');
  eq(context.planDueCandidate(ws, at(9), since), null, 'nothing that came due before the page opened');
  eq([context.planDueSnoozeAt('10m', now), context.planDueSnoozeAt('1h', now), context.planDueSnoozeAt('tomorrow', now)],
    [now + 600000, now + 3600000, new Date(2026, 10, 12, 9).getTime()], 'Snooze offers 10 min, 1 hour, and tomorrow 09:00');
  // N11: every workspace is scanned, and the card keeps the item's workspace.
  const other = { id: 'w2', categories: [{ id: 's2', groups: [{ id: 'g2', items: [{ id: 'n1', type: 'note', html: 'Note', reminder: { at: at(10, 8) } }] }] }] };
  eq(plain(context.planDueCandidate([ws, other], now, since)).id, 'b', 'the latest across workspaces wins');
  const fromOther = context.planDueCandidate([ws, other], now, since, new Set(['b@' + at(10, 9)]));
  eq([fromOther.id, fromOther.wsId, fromOther.type], ['n1', 'w2', 'note'], 'a note in another workspace gets a card, keeping its workspace');
  // N3: a repeating to-do the background re-armed past now is shown for the
  // occurrence that fired, and keeps that key across renders.
  vm.runInContext(`globalThis.nextReminderOccurrenceForDisplay = ${newtabFunction('nextReminderOccurrenceForDisplay').replace(/^function nextReminderOccurrenceForDisplay/, 'function')};
globalThis.previousReminderOccurrence = ${newtabFunction('previousReminderOccurrence').replace(/^function previousReminderOccurrence/, 'function')};`, context);
  const daily = { id: 'w3', categories: [{ id: 's3', groups: [{ id: 'g3', items: [
    { id: 'r1', type: 'todo', text: 'Stretch', reminder: { at: at(10, 5) + 86400000, notified: false, recur: { every: 'day', interval: 1 } } },
  ] }] }] };
  const fired = context.planDueCandidate([daily], now, since);
  eq([fired.id, fired.at, fired.storedAt], ['r1', at(10, 5), at(10, 5) + 86400000], 'a re-armed repeating to-do gets a card for the occurrence that fired');
  eq(context.planDueOccurrence(context.planDueFind([daily], { id: 'r1', wsId: 'w3', type: 'todo' }), now + 60000), at(10, 5), 'the same occurrence on the next render, so the card stays');
  // N12: 24-hour times, with the day when the snooze lands later.
  eq([context.planTimeLabel(at(14, 30)), plain(context.planClockLabel(at(14, 30), now)), plain(context.planClockLabel(new Date(2026, 10, 12, 9).getTime(), now))],
    ['14:30', { time: '14:30', day: '' }, { time: '09:00', day: 'dueCard.dayTomorrow' }], 'times use a 24-hour clock and name the day when it is not today');
  ok(/const ok = await commitTodayTodoToggle\(entry\.id, button, \{ workspaceId: entry\.wsId \}\);\n\s*const actionId = ok \? State\.latestActionId\(\) : null;/.test(planSource), 'Done reuses the Board to-do completion transaction in the to-do’s own workspace and keeps its own action id');
  ok(/const workspace = workspaceId != null\n\s*\? \(State\.get\(\)\?\.workspaces \|\| \[\]\)\.find/.test(newtab), 'the completion transaction resolves the given workspace');
  ok(/if \(!planDueItemIsOpen\(entry\.id, entry\.wsId\)\) \{[\s\S]{0,200}hidePlanDueCard\(\);\n\s*return;\n\s*\}\n\s*planDueBusy = true;[\s\S]{0,300}commitTodayTodoToggle/.test(planSource),
    'Done never reopens a to-do finished elsewhere: the card closes instead of toggling');
  ok(/if \(entry\.type !== 'todo'\) card\.querySelector\('\.plan-due-done'\)\.remove\(\);/.test(planSource), 'pages and notes are offered Snooze only');
  ok(/planDueAnswered\.add\(planDueKey\(entry\.id, entry\.at\)\);\n\s*planDueClearNotice\(entry\.id\);/.test(planSource), 'card answers clear the system notice (N15)');
  ok(/toast\(tr\('dueCard\.doneToast'\), \{ sub: entry\.title, undo: actionId \}\)/.test(planSource), 'Done reports with the Undo of that exact completion');
  ok(/const ok = await setReminder\(entry\.id, at\);\n\s*const actionId = ok \? State\.latestActionId\(\) : null;/.test(planSource), 'Snooze reuses setReminder');
  ok(/undo: actionId,\n\s*replaceUndo: actionId,/.test(planSource), 'the snooze answer morphs exactly its own reminder receipt');
  ok(/if \(entry\.recur\) snooze\.remove\(\);/.test(planSource), 'a repeating to-do is offered Done only');
  ok(/if \(typeof checkPlanDue === 'function' && typeof planDueShown !== 'undefined' && planDueShown\) checkPlanDue\(\);/.test(newtab), 'a card whose to-do changed closes on the next render');
  ok(/if \(card\.contains\(document\.activeElement\)\) \{[\s\S]{0,200}target\?\.focus\?\.\(\{ preventScroll: true \}\)/.test(planSource), 'closing the card returns focus');
  ok(/if \(typeof startPlanDueWatch === 'function'\) startPlanDueWatch\(\);/.test(newtab), 'the watch starts after boot');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n\s*\.plan-due, \.plan-due \*/.test(css), 'the card stops moving under reduced motion');
  ok(/const target = planDueReturnFocus && planDueReturnFocus\.isConnected \? planDueReturnFocus : planDueFallbackFocus\(\);/.test(planSource)
    && /heading\.setAttribute\('tabindex', '-1'\)/.test(planSource), 'with nowhere to return to, focus goes to a heading that can take it (N14)');
}

// N10: the Snooze answer never replaces the alarm warning for the same action.
async function testSnoozeKeepsWarning() {
  const run = async front => {
    const toasts = [];
    const cleared = [];
    const context = vm.createContext({
      console, Date, Math, JSON, Map, Set, Promise,
      localStorage: { getItem: () => null, setItem() {} },
      appLocale: () => 'en',
      tr: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
      document: { getElementById: () => null, body: { dataset: {} } },
      matchMedia: () => ({ matches: true }),
      setReminder: async () => true,
      State: { latestActionId: () => 5 },
      toastFront: () => front,
      toast: (message, options) => toasts.push([message, options]),
      clearItemReminderNotice: id => cleared.push(id),
    });
    vm.runInContext(`const PLAN_VIEWS = ['upcoming', 'sort']; const CAL_VIEWS = ['month', 'week', 'agenda'];\n${planSource}`, context, { filename: 'plan.js' });
    await context.planDueSnooze({ id: 't1', at: 1, title: 'Call' }, {}, '10m');
    return { toasts, cleared };
  };
  const warned = await run({ undoActionId: 5, tone: 'warning' });
  eq([warned.toasts.length, warned.cleared], [0, ['t1']], 'with the alarm warning in front, the snooze answer leaves it in place');
  const fine = await run({ undoActionId: 5, tone: 'success' });
  ok(fine.toasts.length === 1 && /^dueCard\.snoozed/.test(fine.toasts[0][0]) && fine.toasts[0][1].replaceUndo === 5, 'otherwise the receipt morphs into "Back at"');
}

function testLocales() {
  const start = newtab.indexOf('const I18N = {');
  const end = newtab.indexOf('\n};', start);
  const i18n = vm.runInNewContext(`(${newtab.slice(newtab.indexOf('{', start), end + 2)})`);
  const used = new Set([...planSource.matchAll(/tr\('(dueCard\.[\w]+)'/g)].map(match => match[1]));
  ok(used.size >= 12, 'due card strings were found');
  for (const key of used) {
    ok(typeof i18n.en[key] === 'string' && typeof i18n['zh-TW'][key] === 'string', `${key} exists in English and zh-TW`);
    const vars = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    eq(vars(i18n['zh-TW'][key]), vars(i18n.en[key]), `${key} keeps its placeholders`);
  }
}

async function main() {
  testToastWiring();
  await testToastController();
  testPopupReceipt();
  await testSystemNotifications();
  testDueCard();
  await testSnoozeKeepsWarning();
  testLocales();
  console.log(`Notification contracts passed: ${checks} checks (toast controller run in a VM: stale Undo, history reset, hover hold, focus return, Retry and Keep results; drain cascade, Escape, Undo morph, popup tones, system notice with Done/Snooze and stale guards, Group/Space copy, due card across workspaces and repeats, locales)`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
