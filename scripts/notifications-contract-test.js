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

function testToastWiring() {
  ok(/const TOAST_UNDO_MS = 5200;/.test(newtab), 'Undo receipts drain over 5.2 seconds');
  ok(/while \(toastEntries\.length > 2\) toastEntries\.shift\(\);/.test(newtab), 'at most two receipts are kept');
  ok(/<div id="toast-behind" class="hidden" aria-hidden="true" inert>/.test(html), 'the receipt behind is hidden from assistive technology and inert');
  ok(/<span id="toast-drain" class="toast-drain" aria-hidden="true"><\/span>\n  <\/div>/.test(html), 'the drain bar lives inside the receipt');
  ok(/<span id="toast-sub" class="toast-sub" hidden><\/span>/.test(html), 'the receipt has an optional sub-label');
  ok(/t\.addEventListener\('focusin', holdToast\);\n\s*t\.addEventListener\('pointerenter', holdToast\);/.test(newtab), 'hover and focus hold the receipt');
  ok(/#toast \.toast-drain\.is-paused,\n#toast\.is-held \.toast-drain \{ animation-play-state: paused; \}/.test(css), 'the drain pauses while held');
  ok(/const _escToastFirst = !_overlayWasOpen && !higherLayerOpen && !inField\n\s*&& !currentDetailItemId\(\)\n\s*&& !\(_escSearchBar && !_escSearchBar\.classList\.contains\('hidden'\)\)\n\s*&& !\(typeof isTodayTabsDrawerOpen === 'function' && isTodayTabsDrawerOpen\(\)\)\n\s*&& !\(_escTabRail && _escTabRail\.contains\(document\.activeElement\)\);\n\s*if \(_escToastFirst && dismissToastForEscape\(\)\) \{ e\.preventDefault\(\); return; \}/.test(newtab),
    'Escape reaches the newest receipt only when no dialog, field, detail pane, search bar, or Opened Tabs rail would take it');
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

function testPopupReceipt() {
  ok(/el\.dataset\.tone = persistent \? 'error' : 'success';/.test(popupJs), 'the popup receipt carries its tone');
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
  const context = vm.createContext({ console, Date, Math, JSON, Map, Set, localStorage: { getItem: () => null, setItem() {} }, appLocale: () => 'en' });
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
  eq(context.planDueCandidate(ws, now, since, new Set(['b@' + at(10, 9)])).id, 'a', 'an answered reminder is not shown again');
  eq(context.planDueCandidate(ws, at(9), since), null, 'nothing that came due before the page opened');
  eq([context.planDueSnoozeAt('10m', now), context.planDueSnoozeAt('1h', now), context.planDueSnoozeAt('tomorrow', now)],
    [now + 600000, now + 3600000, new Date(2026, 10, 12, 9).getTime()], 'Snooze offers 10 min, 1 hour, and tomorrow 09:00');
  ok(/const ok = await commitTodayTodoToggle\(entry\.id, button\);\n\s*const actionId = ok \? State\.latestActionId\(\) : null;/.test(planSource), 'Done reuses the Board to-do completion transaction and keeps its own action id');
  ok(/if \(!planDueItemIsOpen\(entry\.id\)\) \{[\s\S]{0,200}hidePlanDueCard\(\);\n\s*return;\n\s*\}\n\s*planDueBusy = true;[\s\S]{0,200}commitTodayTodoToggle/.test(planSource),
    'Done never reopens a to-do finished elsewhere: the card closes instead of toggling');
  ok(/toast\(tr\('dueCard\.doneToast'\), \{ sub: entry\.title, undo: actionId \}\)/.test(planSource), 'Done reports with the Undo of that exact completion');
  ok(/const ok = await setReminder\(entry\.id, at\);\n\s*const actionId = ok \? State\.latestActionId\(\) : null;/.test(planSource), 'Snooze reuses setReminder');
  ok(/undo: actionId,\n\s*replaceUndo: actionId,/.test(planSource), 'the snooze answer morphs exactly its own reminder receipt');
  ok(/if \(entry\.recur\) snooze\.remove\(\);/.test(planSource), 'a repeating to-do is offered Done only');
  ok(/if \(typeof checkPlanDue === 'function' && typeof planDueShown !== 'undefined' && planDueShown\) checkPlanDue\(\);/.test(newtab), 'a card whose to-do changed closes on the next render');
  ok(/if \(card\.contains\(document\.activeElement\)\) \{[\s\S]{0,200}target\?\.focus\?\.\(\{ preventScroll: true \}\)/.test(planSource), 'closing the card returns focus');
  ok(/if \(typeof startPlanDueWatch === 'function'\) startPlanDueWatch\(\);/.test(newtab), 'the watch starts after boot');
  ok(/@media \(prefers-reduced-motion: reduce\) \{\n\s*\.plan-due, \.plan-due \*/.test(css), 'the card stops moving under reduced motion');
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
  testPopupReceipt();
  await testSystemNotifications();
  testDueCard();
  testLocales();
  console.log(`Notification contracts passed: ${checks} checks (toast stack, drain, Escape, Undo morph, popup receipt, system notice with Done/Snooze, due card, locales)`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
