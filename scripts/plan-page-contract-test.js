'use strict';

// Contract test for the Plan page (plan.js): lanes, the week bar, Even out,
// Sort inbox, the two Auto-plan rules, and the one-write batch commit. Runs the
// real plan.js in a sandbox with a fixed local clock; wiring is checked against
// newtab.js / newtab.html source.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const planSource = read('plan.js');
const newtab = read('newtab.js');
const html = read('newtab.html');
const gates = read('scripts/quality-gates.js');
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks += 1; };
const plain = value => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const eq = (actual, expected, message) => { assert.deepEqual(plain(actual), expected, message); checks += 1; };

// Wednesday 11 November 2026, 10:00 local time.
const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0).getTime();
const NOW = at(2026, 11, 11, 10, 0);

function sandbox(extra = {}) {
  const store = new Map();
  const context = vm.createContext(Object.assign({
    console,
    Date,
    Math,
    JSON,
    Map,
    Set,
    Number,
    String,
    Object,
    Array,
    localStorage: {
      getItem: key => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => { store.set(key, String(value)); },
      removeItem: key => { store.delete(key); },
    },
    appLocale: () => 'en-GB',
    tr: (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
    reminderItemTitle: item => item.title || item.text || item.url || '',
  }, extra));
  vm.runInContext(`const PLAN_VIEWS = ['upcoming', 'sort']; const CAL_VIEWS = ['month', 'week', 'agenda'];\n${planSource}`, context, { filename: 'plan.js' });
  return { context, store };
}

function workspace(items) {
  return {
    id: 'ws1',
    categories: [{
      id: 'space1',
      name: 'Space',
      groups: [
        { id: 'inbox', name: 'Inbox', color: 'blue', items: items.inbox || [] },
        { id: 'work', name: 'Work', items: items.work || [] },
      ],
    }],
  };
}
const todo = (id, extra = {}) => Object.assign({ id, type: 'todo', text: id, createdAt: at(2026, 11, 1) }, extra);
const tab = (id, extra = {}) => Object.assign({ id, type: 'tab', title: id, url: `https://${id}.example/`, createdAt: at(2026, 11, 1) }, extra);
const rem = time => ({ at: time, notified: false });

function testLanes() {
  const { context } = sandbox();
  const ws = workspace({
    work: [
      todo('overdue', { reminder: rem(at(2026, 11, 10, 9)) }),
      tab('fired-page', { reminder: Object.assign(rem(at(2026, 11, 11, 8)), { notified: true }) }),
      todo('today-16', { reminder: rem(at(2026, 11, 11, 16)) }),
      todo('tomorrow', { reminder: rem(at(2026, 11, 12, 10)) }),
      todo('friday', { reminder: rem(at(2026, 11, 13, 9)) }),
      tab('next-tue', { reminder: rem(at(2026, 11, 17, 9)) }),
      todo('in-three-weeks', { reminder: rem(at(2026, 12, 2, 9)) }),
      todo('anytime', { createdAt: at(2026, 11, 11, 8) }),
      todo('today-but-someday', { createdAt: at(2026, 11, 11, 9) }),
      todo('old-undated'),
      todo('done', { done: true, reminder: rem(at(2026, 11, 11, 15)) }),
      todo('dup'),
      { id: 'stack', type: 'stack', items: [todo('dup'), todo('nested', { reminder: rem(at(2026, 11, 12, 11)) })] },
    ],
    inbox: [tab('marked'), tab('unmarked')],
  });
  const collected = context.planCollect(ws);
  const marked = [{ id: 'marked', type: 'tab', at: null, createdAt: 0, title: 'marked' }];
  const lanes = context.planLaneModel(collected, NOW, new Set(['marked', 'today-but-someday']), collected.dated.concat(collected.undated, marked));
  const ids = Object.fromEntries(lanes.map(lane => [lane.id, lane.items.map(item => item.id)]));
  eq(lanes.map(lane => lane.id), ['today', 'tomorrow', 'week', 'next', 'later', 'someday'], 'lanes appear in order, with Later only when it has items');
  eq(ids.today, ['overdue', 'today-16', 'anytime'], 'Today holds overdue to-dos, today’s times, and undated to-dos written today');
  ok(lanes[0].items[0].overdue === true, 'an overdue to-do is marked overdue');
  eq(ids.tomorrow, ['tomorrow', 'nested'], 'Tomorrow reads nested stack items');
  eq(ids.week, ['friday'], 'This week holds the rest of the week');
  eq(ids.next, ['next-tue'], 'Next week holds Monday to Sunday of next week');
  eq(ids.later, ['in-three-weeks'], 'Later holds dates past next week');
  ok(ids.someday.includes('old-undated') && ids.someday.includes('marked'), 'Someday holds undated to-dos and pages sent to Someday');
  ok(ids.someday.includes('today-but-someday') && !ids.today.includes('today-but-someday'), 'a to-do written today and sent to Someday leaves Today');
  ok(!ids.someday.includes('unmarked'), 'an unmarked Inbox page is not planned');
  const all = Object.values(ids).flat();
  ok(!all.includes('fired-page'), 'a page whose reminder already fired is not shown');
  ok(!all.includes('done'), 'a finished to-do is not shown');
  ok(!all.includes('dup'), 'an id that appears twice is skipped');

  const saturday = at(2026, 11, 14, 10);
  const weekendLanes = context.planLaneModel(context.planCollect(workspace({ work: [] })), saturday);
  ok(!weekendLanes.some(lane => lane.id === 'week'), 'This week disappears when no days are left after tomorrow');
}

function testWeekAndEvenOut() {
  const { context } = sandbox();
  const friday = [8, 9, 10, 11, 12, 13, 14].map((hour, index) => todo(`f${index}`, { reminder: rem(at(2026, 11, 13, hour)) }));
  friday[6].reminder.recur = { every: 'day', interval: 1 };
  const ws = workspace({ work: friday.concat([todo('late', { reminder: rem(at(2026, 11, 9, 9)) })]) });
  const collected = context.planCollect(ws);
  const days = context.planWeekModel(collected, NOW);
  eq(days.map(day => day.count), [0, 0, 1, 0, 7, 0, 0], 'the week bar counts per day from Monday; overdue counts toward today');
  eq(days.map(day => day.over), [false, false, false, false, true, false, false], 'more than five is overloaded');
  ok(days[2].isToday && days[0].isPast && !days[4].isPast, 'today and past days are marked');
  eq(context.planOverloadedDay(days).start, at(2026, 11, 13), 'the first overloaded day from today is offered');
  const changes = context.planEvenOutChanges(collected, at(2026, 11, 13), NOW);
  eq(changes.map(change => change.id), ['f5'], 'Even out keeps the first five, leaves repeating reminders, and moves the rest latest first');
  eq(changes[0].to, at(2026, 11, 14, 13), 'a moved item keeps its time of day on the lightest next day');
  eq(context.planEvenOutChanges(collected, at(2026, 11, 12), NOW), [], 'a day within the limit has nothing to move');
}

function testRollOver() {
  const { context } = sandbox();
  const ws = workspace({
    work: [
      todo('yesterday-9', { reminder: rem(at(2026, 11, 10, 9)) }),
      todo('yesterday-14', { reminder: rem(at(2026, 11, 10, 14)) }),
      todo('repeat', { reminder: Object.assign(rem(at(2026, 11, 10, 8)), { recur: { every: 'day', interval: 1 } }) }),
      todo('done', { done: true, reminder: rem(at(2026, 11, 10, 9)) }),
      tab('page', { reminder: rem(at(2026, 11, 10, 9)) }),
      todo('today', { reminder: rem(at(2026, 11, 11, 15)) }),
    ],
  });
  const changes = context.planRollOverChanges([ws], NOW);
  eq(changes.map(change => [change.id, change.to]), [
    ['yesterday-9', at(2026, 11, 11, 11)],
    ['yesterday-14', at(2026, 11, 11, 14)],
  ], 'open past to-dos come to today at their time, or the next whole hour when it has passed');
  const late = context.planRollOverChanges([ws], at(2026, 11, 11, 23, 30));
  eq(late.map(change => change.to), [at(2026, 11, 12, 9), at(2026, 11, 12, 14)], 'after the last whole hour the move lands tomorrow at the same time');
}

function testMoveAndSortTimes() {
  const { context } = sandbox();
  eq(context.planMoveOptions(NOW).map(option => [option.key, option.at]), [
    ['laterToday', at(2026, 11, 11, 18)],
    ['tonight', at(2026, 11, 11, 20)],
    ['tomorrow', at(2026, 11, 12, 9)],
    ['weekend', at(2026, 11, 14, 10)],
    ['nextWeek', at(2026, 11, 16, 9)],
    ['someday', null],
  ], 'the move menu offers concrete times');
  eq(context.planMoveOptions(at(2026, 11, 11, 19, 45)).map(option => option.key), ['tomorrow', 'weekend', 'nextWeek', 'someday'], 'past evening slots are not offered');
  ok(!context.planMoveOptions(at(2026, 11, 13, 10)).some(option => option.key === 'weekend'), 'This weekend is gone once tomorrow is Saturday');
  eq(context.planSortTodayAt(NOW), at(2026, 11, 11, 18), 'Sort Today means 18:00 later today');
  eq(context.planSortTodayAt(at(2026, 11, 11, 18, 20)), at(2026, 11, 11, 19), 'after 18:00 it means the next whole hour');
  eq(context.planSortTodayAt(at(2026, 11, 11, 23, 30)), at(2026, 11, 12, 9), 'at the end of the day it falls to tomorrow morning');
  const busy = workspace({ work: [todo('t', { reminder: rem(at(2026, 11, 12, 9)) }), todo('f', { reminder: rem(at(2026, 11, 13, 9)) })] });
  eq(context.planSortWeekAt(context.planCollect(busy), NOW), at(2026, 11, 14, 9), 'Sort This week picks the lightest day left this week');
  eq(context.planSortWeekAt(context.planCollect(busy), at(2026, 11, 15, 10)), at(2026, 11, 16, 9), 'on Sunday it falls to Monday');
  const inbox = { items: [tab('a'), tab('b', { reminder: rem(at(2026, 11, 12, 9)) }), todo('c', { done: true }), { id: 's', type: 'stack', items: [] }, tab('d'), todo('e')] };
  eq(context.planSortQueue(inbox, new Set(['d'])).map(item => item.id), ['a', 'e'], 'Sort skips dated, finished, stacked, and Someday items');
}

function testRules() {
  const { context } = sandbox();
  eq(context.planRuleOn({}, 'planRollOver'), false, 'a profile without the key keeps today’s behaviour: no roll-over');
  eq(context.planRuleOn({ planRollOver: true }, 'planRollOver'), true, 'roll-over runs only when turned on');
  eq(context.planRuleOn({}, 'planWarnOverload'), true, 'the overload warning changes no data and is on unless turned off');
  eq(context.planRuleOn({ planWarnOverload: false }, 'planWarnOverload'), false, 'the warning can be turned off');
  const initial = newtab.slice(newtab.indexOf('const createInitialState = () => ({'), newtab.indexOf('let state = createInitialState();'));
  ok(initial.length > 200 && !/planRollOver|planWarnOverload/.test(initial), 'the rules are not hydration defaults, so an existing profile keeps today’s behaviour');
  ok(/const hydrateStoredState = stored => \{\n\s*const base = createInitialState\(\);/.test(newtab), 'hydration fills settings from createInitialState (the reason the default must not live there)');
  ok(/if \(!s\.workspaces\.length\) \{[\s\S]{0,400}s\.settings\.planRollOver = true;/.test(newtab), 'a brand-new profile starts with roll-over on');
  ok(/ok = entry\.at == null \? true : await clearReminder\(entry\.id\);\n\s*if \(ok\) planSetSomeday\(entry\.id, true\);/.test(planSource), 'Someday from the move menu marks every item type');
}

async function testBatchCommit() {
  const events = [];
  const items = { a: todo('a', { reminder: Object.assign(rem(1), { recur: undefined, note: 'kept' }) }), b: todo('b', { reminder: rem(2) }) };
  const contexts = {};
  const harness = sandbox({
    State: {
      isRecoveryRequired: () => false,
      snapshot: label => { events.push(['snapshot', label, items.a.reminder.at]); return 7; },
      persistNow: async options => { events.push(['persist', options, items.a.reminder.at, items.b.reminder.at]); return { reminderReconciliation: { ok: true } }; },
      requireRecovery: () => events.push(['recovery']),
    },
    isReminderMutationPending: () => false,
    createItemReminderMutationContext: id => (items[id] ? (contexts[id] = { id }) : null),
    resolveItemReminderMutationTarget: context => (contexts[context.id] === context ? { item: items[context.id] } : null),
    isItemDetailRecord: value => !!value && typeof value === 'object' && !Array.isArray(value),
    cloneItemDetailJson: value => JSON.parse(JSON.stringify(value)),
  });
  vm.runInContext('var itemReminderMutationPending = null;', harness.context);
  const result = await harness.context.commitPlanReminderBatch([{ id: 'a', to: 100 }, { id: 'b', to: 200 }], 'plan.history.evenOut');
  eq(result.ok && result.moved, 2, 'the batch reports both moves');
  eq(result.actionId, 7, 'the batch returns its Undo action');
  eq(events.map(event => event[0]), ['snapshot', 'persist'], 'one Undo snapshot, then one acknowledged write');
  eq(events[0][2], 1, 'the snapshot is taken before any reminder changes');
  eq(events[1][1], { reconcileReminders: true }, 'the write reconciles alarms');
  eq([events[1][2], events[1][3]], [100, 200], 'every reminder is changed before the single write');
  eq([items.a.reminder.note, items.a.reminder.notified], ['kept', false], 'other reminder fields are kept and the reminder re-arms');
  eq(vm.runInContext('itemReminderMutationPending', harness.context), null, 'the shared reminder pending token is released');
  const missing = await harness.context.commitPlanReminderBatch([{ id: 'a', to: 300 }, { id: 'gone', to: 400 }], 'plan.history.evenOut');
  eq([missing.ok, missing.code, items.a.reminder.at, events.length], [false, 'changed', 100, 2], 'a missing target writes nothing');
}

async function testRollOverRunsOncePerDay() {
  const toasts = [];
  let writes = 0;
  let failNext = false;
  const items = { y: todo('y', { reminder: rem(at(2026, 11, 10, 9)) }) };
  const settings = { planRollOver: true };
  const contexts = {};
  const harness = sandbox({
    State: {
      get: () => ({ settings, workspaces: [workspace({ work: [items.y] })] }),
      isRecoveryRequired: () => false,
      snapshot: () => 3,
      persistNow: async () => { writes += 1; if (failNext) { failNext = false; throw new Error('write failed'); } return { reminderReconciliation: { ok: true } }; },
    },
    isReminderMutationPending: () => false,
    createItemReminderMutationContext: id => (items[id] ? (contexts[id] = { id }) : null),
    resolveItemReminderMutationTarget: context => (contexts[context.id] === context ? { item: items[context.id] } : null),
    isItemDetailRecord: value => !!value && typeof value === 'object',
    cloneItemDetailJson: value => JSON.parse(JSON.stringify(value)),
    renderBoard: () => {},
    toast: (message, options) => toasts.push([message, options]),
  });
  vm.runInContext('var itemReminderMutationPending = null;', harness.context);
  failNext = true;
  const failed = await harness.context.runPlanRollOver(NOW);
  eq([failed.ran, harness.store.has('locus.plan.rolloverDay')], [false, false], 'a failed write leaves the day unrecorded so the next open retries');
  items.y.reminder.at = at(2026, 11, 10, 9);
  const first = await harness.context.runPlanRollOver(NOW);
  eq([first.ran, first.moved, items.y.reminder.at], [true, 1, at(2026, 11, 11, 11)], 'the first open of the day moves unfinished to-dos');
  eq(toasts.at(-1)[1].undo, 3, 'the result toast carries the normal Undo');
  const again = await harness.context.runPlanRollOver(at(2026, 11, 11, 15));
  eq([again.ran, again.reason, writes], [false, 'done-today', 2], 'it runs at most once per day');
  // Two tabs opened together: the second sees the claim taken by the first.
  harness.store.delete('locus.plan.rolloverDay');
  items.y.reminder.at = at(2026, 11, 10, 9);
  const firstTab = harness.context.runPlanRollOver(NOW);
  const secondTab = await harness.context.runPlanRollOver(NOW);
  await firstTab;
  eq([secondTab.ran, secondTab.reason, writes], [false, 'running', 3], 'a second run at the same moment writes nothing');
  harness.store.delete('locus.plan.rolloverDay');
  items.y.reminder.at = at(2026, 11, 10, 9);
  vm.runInContext('planRollOverRunning = false;', harness.context);
  const claimed = harness.context.runPlanRollOver(NOW);
  eq(harness.store.get('locus.plan.rolloverDay'), String(NOW), 'the day is claimed (as the run instant) before the write starts');
  await claimed;
  settings.planRollOver = false;
  const off = await harness.context.runPlanRollOver(at(2026, 11, 12, 8));
  eq([off.ran, off.reason], [false, 'off'], 'turned off, it does nothing');
}

// ── The real State block, loaded in its own VM (P6) ──
function stateSlice() {
  const start = newtab.indexOf('let loadedSchema = 0;\nconst State = (() => {');
  const end = newtab.indexOf('\n})();', start) + '\n})();'.length;
  assert.ok(start >= 0 && end > start, 'the State block is extractable from newtab.js');
  return newtab.slice(start, end);
}
function newtabFunction(name) {
  const start = newtab.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is extractable from newtab.js`);
  const open = newtab.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < newtab.length; index += 1) {
    if (newtab[index] === '{') depth += 1;
    else if (newtab[index] === '}') {
      depth -= 1;
      if (depth === 0) return newtab.slice(start, index + 1);
    }
  }
  throw new Error(`${name} is unterminated`);
}
function realState(stored) {
  const writes = [];
  const context = vm.createContext({
    console, structuredClone, setTimeout, clearTimeout, Promise,
    globalThis: {},
    navigator: { language: 'en-US' },
    chrome: {
      storage: { local: { get: async () => (stored ? { te: JSON.parse(JSON.stringify(stored)) } : {}) } },
      runtime: {
        sendMessage: async message => {
          writes.push(JSON.parse(JSON.stringify(message.state)));
          return { ok: true, revision: message.state._revision + 1, reminderReconciliation: { ok: true } };
        },
      },
    },
    browserLanguage: () => 'en',
    normalizeLanguage: value => value || 'en',
    createOrganizationIdAllocator: () => { let n = 0; return () => `new${n += 1}`; },
    handleStorageError: () => {},
    refreshStorageUsage: () => {},
  });
  vm.runInContext(`${stateSlice()}\n${newtabFunction('ensureDefault')}\nthis.State = State; this.ensureDefault = ensureDefault;`, context, { filename: 'state.js' });
  return { State: context.State, ensureDefault: context.ensureDefault, writes };
}
// Reminder targets resolved against the live graph, as the page's identity
// helpers do: a context binds the exact record, and a duplicated id resolves
// to nothing.
function liveTargets(getState) {
  const find = id => {
    const found = [];
    const walk = items => (items || []).forEach(item => {
      if (String(item.id) === id) found.push(item);
      if (item.type === 'stack') walk(item.items);
    });
    getState().workspaces.forEach(ws => ws.categories.forEach(space => space.groups.forEach(group => walk(group.items))));
    return found.length === 1 ? found[0] : null;
  };
  return {
    isReminderMutationPending: () => false,
    createItemReminderMutationContext: id => { const item = find(String(id)); return item ? { id: String(id), item } : null; },
    resolveItemReminderMutationTarget: context => (context && find(context.id) === context.item ? { item: context.item } : null),
    isItemDetailRecord: value => !!value && typeof value === 'object' && !Array.isArray(value),
    cloneItemDetailJson: value => JSON.parse(JSON.stringify(value)),
  };
}

async function testRulesWithRealState() {
  const { context } = sandbox();
  const legacy = {
    schema: 14, _revision: 41, activeWsId: 'ws1',
    settings: { theme: 'folio', language: 'en' },
    workspaces: [workspace({ work: [todo('y', { reminder: rem(at(2026, 11, 10, 9)) })] })],
  };
  const old = realState(legacy);
  await old.State.load();
  old.ensureDefault();
  eq(context.planRuleOn(old.State.get().settings, 'planRollOver'), false, 'a profile saved before Plan loads through the real State with roll-over off');
  eq(context.planRuleOn(old.State.get().settings, 'planWarnOverload'), true, 'and with the overload warning on');
  const fresh = realState(null);
  await fresh.State.load();
  fresh.ensureDefault();
  eq(context.planRuleOn(fresh.State.get().settings, 'planRollOver'), true, 'a brand-new profile starts with roll-over on');

  // Export → import (replace) keeps both rule settings.
  const ImportUtils = require(path.join(root, 'import-utils.js'));
  const exported = { ...old.State.get(), settings: { ...old.State.get().settings, planRollOver: true, planWarnOverload: false } };
  delete exported._revision;
  const payload = JSON.parse(JSON.stringify({ app: 'locus', schema: 14, data: exported }));
  let nextId = 0;
  const incoming = ImportUtils.normalizeForReplace(payload.data, { makeId: () => `imp${nextId += 1}`, now: NOW, retentionMs: 30 * 86400000 });
  const merged = { ...fresh.State.get().settings, ...incoming.settings };
  const imported = realState({ ...incoming, settings: merged, _revision: 1 });
  await imported.State.load();
  eq([context.planRuleOn(imported.State.get().settings, 'planRollOver'), context.planRuleOn(imported.State.get().settings, 'planWarnOverload')], [true, false],
    'export then import keeps planRollOver and planWarnOverload');
  ok(/const mergedSettings = \{\n\s*\.\.\.currentSettings,\n\s*\.\.\.\(incoming\.settings \|\| \{\}\),/.test(newtab), 'import replace lets the file’s settings win, as the round trip assumes');
}

async function testRollOverUndoWithRealState() {
  const stored = {
    schema: 14, _revision: 5, activeWsId: 'ws1',
    settings: { language: 'en', planRollOver: true },
    workspaces: [workspace({ work: [todo('y', { reminder: rem(at(2026, 11, 10, 9)) }), todo('z', { reminder: rem(at(2026, 11, 9, 14)) })] })],
  };
  const real = realState(stored);
  await real.State.load();
  const toasts = [];
  const harness = sandbox(Object.assign({
    State: real.State,
    renderBoard: () => {},
    toast: (message, options) => toasts.push([message, options]),
  }, liveTargets(() => real.State.get())));
  vm.runInContext('var itemReminderMutationPending = null;', harness.context);
  const result = await harness.context.runPlanRollOver(NOW);
  const items = () => real.State.get().workspaces[0].categories[0].groups[1].items;
  eq([result.ran, result.moved, items().map(item => item.reminder.at)], [true, 2, [at(2026, 11, 11, 11), at(2026, 11, 11, 14)]], 'roll-over moves both through one real write');
  eq(real.writes.length, 1, 'one acknowledged write');
  const actionId = toasts.at(-1)[1].undo;
  ok(typeof actionId === 'number', 'the toast carries the real Undo action');
  eq(JSON.parse(harness.store.get('locus.plan.moves')), { y: 1, z: 1 }, 'each moved to-do counts one move');
  await real.State.undo(actionId);
  harness.context.planUndoMoves(actionId);
  eq(items().map(item => item.reminder.at), [at(2026, 11, 10, 9), at(2026, 11, 9, 14)], 'real State.undo restores the original times');
  eq(JSON.parse(harness.store.get('locus.plan.moves')), {}, 'Undo takes the moves back off the ↻ count (P10)');
  ok(/if \(typeof planUndoMoves === 'function' && undoneId !== true\) planUndoMoves\(undoneId\);/.test(newtab), 'performUndo drops the moves of the action it undid');
}

async function testRollOverTwoTabs() {
  // Two Locus pages share one localStorage (same extension origin) but each has
  // its own plan.js globals, so only the shared claim can stop the second.
  const shared = new Map();
  const background = { revision: 7, writes: 0 };
  const page = () => {
    const state = { _revision: 7, settings: { planRollOver: true }, workspaces: [workspace({ work: [todo('y', { reminder: rem(at(2026, 11, 10, 9)) })] })] };
    const harness = sandbox(Object.assign({
      State: {
        get: () => state,
        isRecoveryRequired: () => false,
        snapshot: () => 1,
        async persistNow() {
          await new Promise(resolve => setTimeout(resolve, 5));
          if (background.revision !== state._revision) throw Object.assign(new Error('conflict'), { code: 'LOCUS_STATE_CONFLICT' });
          background.revision += 1;
          background.writes += 1;
          state._revision = background.revision;
          return { reminderReconciliation: { ok: true } };
        },
      },
      renderBoard: () => {},
      toast: () => {},
    }, liveTargets(() => state)));
    harness.context.localStorage = {
      getItem: key => (shared.has(key) ? shared.get(key) : null),
      setItem: (key, value) => { shared.set(key, String(value)); },
      removeItem: key => { shared.delete(key); },
    };
    vm.runInContext('var itemReminderMutationPending = null;', harness.context);
    return harness.context;
  };
  const a = page();
  const b = page();
  const [ra, rb] = await Promise.all([a.runPlanRollOver(NOW), b.runPlanRollOver(NOW)]);
  eq([ra.ran, ra.moved, rb.ran, rb.reason, background.writes], [true, 1, false, 'done-today', 1], 'the second page sees the first page’s claim and writes nothing');
  eq(shared.get('locus.plan.rolloverDay'), String(NOW), 'the claim is the UTC instant of the run (P13)');
}

function testRollOverEdges() {
  const { context } = sandbox();
  // P4: an id in two workspaces can't be resolved, so it is left out; the rest move.
  const ws1 = workspace({ work: [todo('t1', { reminder: rem(at(2026, 11, 10, 9)) }), todo('shared', { reminder: rem(at(2026, 11, 10, 9)) })] });
  const ws2 = Object.assign(workspace({ work: [todo('shared', { reminder: rem(at(2026, 11, 10, 9)) })] }), { id: 'ws2' });
  eq(context.planRollOverChanges([ws1, ws2], NOW).map(change => change.id), ['t1'], 'a cross-workspace duplicate id is left out of roll-over');
  // P13: the claim compares instants with the local day start.
  const dayRan = (last, now) => context.planRollOverRanToday(last, now);
  eq([dayRan(String(at(2026, 11, 11, 9)), at(2026, 11, 11, 23)), dayRan(String(at(2026, 11, 10, 23, 59)), at(2026, 11, 11, 0, 5)), dayRan(null, NOW)], [true, false, false],
    'a run counts for the local day it fell in, not for the next one');
  eq([dayRan('2026-11-11', NOW), dayRan('2026-11-10', NOW)], [true, false], 'an old YYYY-MM-DD claim is still honoured');
  // P14: the toast names where the to-dos landed.
  const today = at(2026, 11, 11, 15);
  const tomorrow = at(2026, 11, 12, 9);
  eq([
    context.planRollOverToastKey([{ to: today }], NOW),
    context.planRollOverToastKey([{ to: today }, { to: today }], NOW),
    context.planRollOverToastKey([{ to: tomorrow }], NOW),
    context.planRollOverToastKey([{ to: tomorrow }, { to: tomorrow }], NOW),
    context.planRollOverToastKey([{ to: today }, { to: tomorrow }], NOW),
  ], ['plan.rolledOverOne', 'plan.rolledOver', 'plan.rolledOverTomorrowOne', 'plan.rolledOverTomorrow', 'plan.rolledOverSplit'], 'the toast names today, tomorrow, or both');
}

async function testPartialBatch() {
  const items = { a: todo('a', { reminder: rem(1) }) };
  const contexts = {};
  let writes = 0;
  const harness = sandbox({
    State: { isRecoveryRequired: () => false, snapshot: () => 9, persistNow: async () => { writes += 1; return { reminderReconciliation: { ok: true } }; } },
    isReminderMutationPending: () => false,
    createItemReminderMutationContext: id => (items[id] ? (contexts[id] = { id }) : null),
    resolveItemReminderMutationTarget: context => (context && contexts[context.id] === context ? { item: items[context.id] } : null),
    isItemDetailRecord: value => !!value && typeof value === 'object',
    cloneItemDetailJson: value => JSON.parse(JSON.stringify(value)),
  });
  vm.runInContext('var itemReminderMutationPending = null;', harness.context);
  const result = await harness.context.commitPlanReminderBatch([{ id: 'a', to: 50 }, { id: 'gone', to: 60 }], 'plan.history.rollOver', { partial: true });
  eq([result.ok, result.moved, result.skipped, result.ids, items.a.reminder.at, writes], [true, 1, 1, ['a'], 50, 1], 'a partial batch moves what still resolves and reports what it skipped');
  const none = await harness.context.commitPlanReminderBatch([{ id: 'gone', to: 60 }], 'plan.history.rollOver', { partial: true });
  eq([none.ok, none.moved, writes], [true, 0, 1], 'a partial batch with nothing left writes nothing');
}

function testEvenOutMatchesBar() {
  // P9: four overdue to-dos and five later today make the bar show 9 for today;
  // Even out must bring that same count back to five.
  const { context } = sandbox();
  const overdue = [0, 1, 2, 3].map(index => todo(`o${index}`, { reminder: rem(at(2026, 11, 9, 9 + index)) }));
  const later = [12, 13, 14, 15, 16].map(hour => todo(`t${hour}`, { reminder: rem(at(2026, 11, 11, hour)) }));
  const ws = workspace({ work: overdue.concat(later) });
  const collected = context.planCollect(ws);
  const before = context.planWeekModel(collected, NOW);
  eq(before[2].count, 9, 'the bar counts overdue to-dos toward today');
  const changes = context.planEvenOutChanges(collected, at(2026, 11, 11), NOW);
  const byId = new Map(changes.map(change => [change.id, change.to]));
  ws.categories[0].groups[1].items.forEach(item => { if (byId.has(item.id)) item.reminder.at = byId.get(item.id); });
  const after = context.planWeekModel(context.planCollect(ws), NOW);
  eq([changes.length, after[2].count, after[2].over], [4, 5, false], 'Even out moves exactly enough to bring today back under the limit');
}

function testSortTally() {
  // P8: the tally counts only answers still in effect.
  const { context } = sandbox();
  vm.runInContext('planSortSession = null;', context);
  const session = context.planSortState();
  ['a', 'b', 'c'].forEach(id => session.decided.set(id, 'today'));
  const queueAfterUndo = [tab('c'), tab('d')];
  eq(context.planSortTally(session, queueAfterUndo), { today: 2, week: 0, someday: 0, archive: 0 }, 'an answer whose Undo put the item back is not counted');
  ok(/if \(typeof planSortSession !== 'undefined' && planSortSession && activeCalendar\?\.view !== 'sort'\) planSortSession = null;/.test(newtab), 'leaving Sort ends its session');
  ok(/session\.holdRender = true;[\s\S]*await leaveDone;[\s\S]*session\.holdRender = false;/.test(planSource), 'Sort holds its repaint until the leaving card has gone (P7)');
  ok(/\.plan-sort\.is-first \{ animation: plan-rise/.test(read('newtab.css')) && !/\.plan-sort \{[^}]*animation/.test(read('newtab.css')), 'the Sort rise plays on first entry only (P7)');
}

// ── A small element tree, enough to build real Plan markup in a VM (X4) ──
function miniDocument() {
  const camel = name => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  class Node {
    constructor(tag, text = '') {
      this.tagName = tag ? tag.toUpperCase() : '#text';
      this.children = [];
      this.attributes = {};
      this.dataset = {};
      this.text = text;
      this.parentNode = null;
      this.onclick = null;
    }
    get id() { return this.attributes.id || ''; }
    set id(value) { this.setAttribute('id', value); }
    get className() { return this.attributes.class || ''; }
    set className(value) { this.setAttribute('class', value); }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name.startsWith('data-')) this.dataset[camel(name.slice(5))] = String(value);
    }
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); }
    get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
    set innerHTML(html) {
      this.children = [];
      const stack = [this];
      const token = /<\/([a-zA-Z0-9-]+)\s*>|<([a-zA-Z0-9-]+)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g;
      let match;
      while ((match = token.exec(html))) {
        const top = stack[stack.length - 1];
        if (match[1]) { stack.pop(); continue; }
        if (match[5] != null) { if (match[5].trim()) top.appendChild(new Node(null, match[5].trim())); continue; }
        const element = new Node(match[2]);
        for (const attr of (match[3] || '').matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) element.setAttribute(attr[1], attr[2] ?? '');
        top.appendChild(element);
        if (!match[4]) stack.push(element);
      }
    }
    matches(selector) {
      if (selector.startsWith('#')) return this.id === selector.slice(1);
      if (selector.startsWith('.')) return this.className.split(/\s+/).includes(selector.slice(1));
      const attr = selector.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
      if (attr) return attr[2] == null ? this.getAttribute(attr[1]) != null : this.getAttribute(attr[1]) === attr[2];
      return this.tagName === selector.toUpperCase();
    }
    querySelectorAll(selector) {
      const found = [];
      const walk = node => node.children.forEach(child => { if (child.tagName !== '#text' && child.matches(selector)) found.push(child); walk(child); });
      walk(this);
      return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  return { createElement: tag => new Node(tag) };
}

function testPlanHeaderBuilds() {
  const views = [];
  const opened = [];
  const inbox = { id: 'inbox', items: [tab('a'), tab('b'), tab('c', { reminder: rem(at(2026, 11, 12, 9)) })] };
  const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const build = (mode, withPlanner = true) => {
    const extra = {
      document: miniDocument(),
      esc,
      resolveLandingInboxTarget: () => ({ group: inbox }),
      createLandingInboxContext: () => ({}),
    };
    if (withPlanner) extra.openPlannerDialog = opener => opened.push(opener.id);
    const { context } = sandbox(extra);
    context.setPlanView = view => views.push(view);
    return context.buildPlanHeader({ id: 'ws1' }, mode);
  };
  const head = build('sort');
  const viewButtons = head.querySelectorAll('[data-plan-view]');
  eq(viewButtons.map(button => [button.dataset.planView, button.getAttribute('aria-pressed')]), [['upcoming', 'false'], ['sort', 'true'], ['calendar', 'false']],
    'the header builds Upcoming, Sort, and Calendar controls with the right pressed state');
  eq(head.querySelector('#plan-title').textContent, 'plan.title', 'the header carries the page title that labels the page');
  eq(head.querySelector('.plan-bub-badge').textContent, '2', 'the Sort badge counts what is left to sort');
  viewButtons.forEach(button => button.onclick());
  eq(views, ['upcoming', 'sort', 'calendar'], 'each view control switches to its own view');
  const ai = head.querySelector('#plan-ai-btn');
  ok(ai && ai.tagName === 'BUTTON', 'Plan with AI is a real button in the header');
  ai.onclick();
  eq(opened, ['plan-ai-btn'], 'Plan with AI opens the planner from its own button (the focus return target)');
  eq(build('upcoming', false).querySelector('#plan-ai-btn'), null, 'without the planner, its button is not left behind');
  eq(build('calendar').querySelector('[data-plan-view="calendar"]').getAttribute('aria-pressed'), 'true', 'the Calendar control is pressed on the Calendar views');
  ok(/document\.getElementById\('plan-ai-btn'\)/.test(read('planner.js')) && !/cal-plan-btn/.test(read('planner.js')), 'the planner returns focus to Plan with AI, not the removed Calendar button (P11)');
}

function testWiring() {
  ok(/const PLAN_VIEWS = \['upcoming', 'sort'\];/.test(newtab), 'Plan views are declared beside the calendar views');
  ok(/seg\[2\] === 'plan'\) return \{ type: 'calendar'/.test(newtab), '#/ws/<id>/plan opens Plan');
  ok(/PLAN_VIEWS\.includes\(route\.query\?\.cal\)\) \{\n\s*return `\/ws\/\$\{ws\}\/plan`/.test(newtab), 'Plan routes build to /plan');
  ok(/CAL_VIEWS\.includes\(requested\) \|\| PLAN_VIEWS\.includes\(requested\)/.test(newtab), 'the calendar route accepts Plan views');
  ok(/if \(PLAN_VIEWS\.includes\(activeCalendar\.view\)\) \{\n\s*if \(typeof renderPlanSurface === 'function'\) return renderPlanSurface\(ws\);/.test(newtab), 'the calendar surface renders Plan for Plan views');
  ok(/runPlanRollOver\(\)\.catch/.test(newtab) && newtab.indexOf('runPlanRollOver().catch') > newtab.indexOf('persistBootChanges();\n  startStateStorageSync();'), 'roll-over runs after boot, once state sync has started');
  ok(/<button class="nav-item" id="nav-plan" data-i18n-aria-label="nav\.plan"/.test(html), 'the rail has a Plan item');
  ok(html.indexOf('id="nav-inbox"') < html.indexOf('id="nav-plan"') && html.indexOf('id="nav-plan"') < html.indexOf('id="nav-all"'), 'Plan sits between Inbox and All Links');
  ok(html.indexOf('<script src="plan.js"></script>') > html.indexOf('<script src="planner.js"></script>') && html.indexOf('<script src="plan.js"></script>') < html.indexOf('<script src="newtab.js"></script>'), 'plan.js loads before newtab.js');
  ok(/'planner\.js', 'plan\.js'\]/.test(gates), 'quality gates scan plan.js as runtime code');
  ok(/navPlan\.onclick = \(\) => openPlan\('upcoming'\)/.test(newtab), 'the rail item opens Upcoming');
  ok(/CAL_VIEWS\.includes\(activeCalendar\.view\)\) closeCalendar\(\); else openCalendar\(\);/.test(newtab), 'C opens the Calendar from a Plan view instead of closing Plan');
}

function testLocalesAndPrivacy() {
  const start = newtab.indexOf('const I18N = {');
  const end = newtab.indexOf('\n};', start);
  const i18n = vm.runInNewContext(`(${newtab.slice(newtab.indexOf('{', start), end + 2)})`);
  const used = new Set([...planSource.matchAll(/tr\(\s*['`]((?:plan|nav)\.[\w.]+)['`]/g)].map(match => match[1]));
  for (const template of planSource.matchAll(/tr\(`plan\.(lane|move)\.\$\{[^}]+\}`\)/g)) {
    const prefix = `plan.${template[1]}.`;
    Object.keys(i18n.en).filter(key => key.startsWith(prefix)).forEach(key => used.add(key));
  }
  ['plan.rolledOverOne', 'plan.rolledOver', 'plan.rolledOverTomorrowOne', 'plan.rolledOverTomorrow', 'plan.rolledOverSplit', 'plan.evenedOne', 'plan.evened', 'plan.autoOn', 'plan.autoOff', 'plan.sortNone', 'plan.inboxClear'].forEach(key => used.add(key));
  ok(used.size > 40, 'the plan.js strings were found');
  for (const key of used) {
    ok(typeof i18n.en[key] === 'string' && i18n.en[key], `${key} exists in English`);
    ok(typeof i18n['zh-TW'][key] === 'string' && i18n['zh-TW'][key], `${key} exists in zh-TW`);
    const vars = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    eq(vars(i18n['zh-TW'][key]), vars(i18n.en[key]), `${key} keeps the same placeholders`);
  }
  ['plan.lane.today', 'plan.lane.tomorrow', 'plan.lane.week', 'plan.lane.next', 'plan.lane.later', 'plan.lane.someday',
    'plan.move.laterToday', 'plan.move.tonight', 'plan.move.tomorrow', 'plan.move.weekend', 'plan.move.nextWeek', 'plan.move.someday', 'plan.move.pick']
    .forEach(key => ok(used.has(key), `${key} is reachable`));
  ok(!Object.entries(i18n['zh-TW']).some(([key, value]) => key.startsWith('plan.') && /数据|默认|保存|添加|设置|日历/.test(value)), 'zh-TW Plan copy avoids Mainland terms');
  ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(planSource), 'plan.js has no network APIs');
  ok(!/chrome\./.test(planSource), 'plan.js calls no browser APIs directly');
  ok(!/chrome\.storage\.local\.set/.test(planSource), 'plan.js never writes state directly');
  ok(!/CURRENT_SCHEMA/.test(planSource), 'Plan adds no schema field');
}

async function main() {
  testLanes();
  testWeekAndEvenOut();
  testRollOver();
  testMoveAndSortTimes();
  testRules();
  await testBatchCommit();
  await testRollOverRunsOncePerDay();
  await testRulesWithRealState();
  await testRollOverUndoWithRealState();
  await testRollOverTwoTabs();
  testRollOverEdges();
  await testPartialBatch();
  testEvenOutMatchesBar();
  testSortTally();
  testPlanHeaderBuilds();
  testWiring();
  testLocalesAndPrivacy();
  console.log(`Plan page contracts passed: ${checks} checks (lanes, week bar and Even out on one count, roll-over once per day across pages and zones, duplicate ids, landing-day toasts, real State defaults, export/import and Undo, move counts, Sort tally, header built in a VM, wiring, locales, privacy)`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
