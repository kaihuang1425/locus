'use strict';

// Contract test for the new-tab planner (planner.js): receipt-gated Apply with
// action-scoped Undo, idempotent retry and redelivery, exact destination
// resolution, recovery on rejected writes, privacy of shared busy times,
// wiring into newtab.js guards, locale parity, and the manifest boundary.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const newtab = read('newtab.js');
const html = read('newtab.html');
const planner = read('planner.js');
const manifest = JSON.parse(read('manifest.json'));
let checks = 0;
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
// Values built inside the vm context come from another realm; compare data, not prototypes.
const plainData = value => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(plainData(actual), plainData(expected), message); };

function readI18n() {
  const start = newtab.indexOf('const I18N = ');
  const end = newtab.lastIndexOf('};', newtab.indexOf('\nfunction tr(', start));
  return vm.runInNewContext(`(${newtab.slice(start + 'const I18N = '.length, end + 1)})`, {}, { filename: 'i18n.js' });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

// ── Sandbox with the real planner and contract code ──────────────────
function createHarness({ withGroup = true } = {}) {
  const metrics = { snapshots: [], persists: [], toasts: [], recovery: 0, renders: 0, acks: [], statuses: [] };
  const group = { id: 'g-plan', name: 'Thesis', symbol: '📁', color: '#123456', collapsed: false, items: [] };
  const space = { id: 's-main', name: 'Work', groups: withGroup ? [group] : [] };
  const workspace = { id: 'w-1', name: 'Main', activeCatId: 's-main', categories: [space] };
  const state = {
    schema: 14,
    activeWsId: 'w-1',
    workspaces: [workspace],
    archive: [],
    trash: [],
    settings: {},
  };
  let persistBehavior = () => Promise.resolve({ ok: true, reminderReconciliation: { ok: true } });
  let recoveryRequired = false;
  let nextId = 1;
  const sandbox = {
    console,
    Intl,
    Date,
    Math,
    JSON,
    Map,
    Set,
    Promise,
    setTimeout,
    clearTimeout,
    crypto: require('node:crypto').webcrypto,
    requestAnimationFrame: fn => fn(),
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      body: { children: [] },
      activeElement: null,
    },
    navigator: {},
    chrome: { runtime: {}, permissions: {}, storage: { local: { get: async () => ({}), set: async () => {} } } },
    State: {
      get: () => state,
      snapshot: label => { metrics.snapshots.push(label); return `action-${metrics.snapshots.length}`; },
      persistNow: options => { metrics.persists.push(options || null); return persistBehavior(); },
      requireRecovery: () => { metrics.recovery += 1; recoveryRequired = true; },
      isRecoveryRequired: () => recoveryRequired,
    },
    tr: (key, vars = {}) => `${key}${Object.keys(vars).length ? JSON.stringify(vars) : ''}`,
    toast: (message, options) => { metrics.toasts.push({ message, options }); return true; },
    appLocale: () => 'en',
    activeWs: () => state.workspaces.find(ws => ws.id === state.activeWsId),
    activeCat: () => space,
    collectPendingReminders: () => [
      { at: Date.UTC(2030, 2, 12, 11, 0), title: 'Private reminder title', source: 'item' },
    ],
    organizationWorkspaceTarget: id => {
      const matches = state.workspaces.filter(ws => ws.id === id);
      return matches.length === 1 ? matches[0] : null;
    },
    identitySpaceTarget: (wsId, spaceId) => {
      const ws = state.workspaces.find(entry => entry.id === wsId);
      const found = ws?.categories.filter(entry => entry.id === spaceId) || [];
      return ws && found.length === 1 ? { workspace: ws, space: found[0] } : null;
    },
    organizationGroupTarget: id => {
      const matches = [];
      for (const ws of state.workspaces) for (const sp of ws.categories) for (const g of sp.groups) if (g.id === id) matches.push({ workspace: ws, space: sp, group: g });
      return matches.length === 1 ? matches[0] : null;
    },
    createOrganizationIdAllocator: () => () => `id-${nextId++}`,
    stampNew: item => { if (item.createdAt == null) item.createdAt = 1; return item; },
    esc: value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    renderBoard: () => { metrics.renders += 1; },
    activeCalendar: { view: 'week', anchor: 0 },
    showStateRecoveryRequired: () => {},
    lockBodyScroll: () => {},
    unlockBodyScroll: () => {},
    setElementInertOwner: () => {},
    rememberOpener: () => {},
    restoreOpener: () => false,
    focusDialogOpener: () => {},
    trapTabKey: () => {},
    _overlayOpeners: new WeakMap(),
    CSS: undefined,
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(read('plan-contract.js'), context, { filename: 'plan-contract.js' });
  vm.runInContext(planner, context, { filename: 'planner.js' });
  vm.runInContext(`
    plannerCompanionAck = async (draftId, status, detail) => { __acks.push({ draftId, status, detail }); return true; };
  `, Object.assign(context, { __acks: metrics.acks }));
  return {
    context,
    state,
    space,
    group,
    metrics,
    run: code => vm.runInContext(code, context),
    setPersist(fn) { persistBehavior = fn; },
    setRecovery(value) { recoveryRequired = value; },
  };
}

function openPlan(harness, overrides = {}) {
  harness.run(`
    plannerCtx = {
      form: Object.assign(plannerNewForm(), ${JSON.stringify({
        planId: 'plan-week-1',
        title: 'Thesis week',
        horizon: 'week',
        start: '2030-03-11',
        end: '2030-03-17',
        timezone: 'Europe/London',
        goals: 'Write chapter 2',
        fixedText: '2030-03-12 14:00-15:00 Supervisor',
        spaceId: 's-main',
        groupId: 'g-plan',
        ...overrides,
      })}),
      drafts: new Map(), selection: new Map(), activeDraftId: null,
      built: null, prompt: '', preview: null, status: null, busy: '', pasteText: '',
    };
    plannerRebuild();
  `);
  return harness.run('plannerCtx.built');
}

function draftText(harness, blocks) {
  const request = harness.run('plannerCtx.built.request');
  return JSON.stringify({
    contract: 'locus.plan/v1',
    plan_id: request.plan_id,
    request_revision: request.revision,
    timezone: request.timezone,
    summary: 'Chapter plan',
    blocks,
    missing: [],
  });
}

const BLOCKS = [
  { date: '2030-03-11', start: '09:30', end: '11:00', title: 'Outline chapter 2', kind: 'focus', notes: 'Use the <draft> notes', fixed: false },
  { date: '2030-03-12', start: '14:00', end: '15:00', title: 'Supervisor', kind: 'meeting', notes: null, fixed: true },
  { date: '2030-03-13', start: '10:00', end: '11:30', title: 'Write section 2.1', kind: 'focus', notes: null, fixed: false },
  { date: '2030-02-30', start: '10:00', end: '11:00', title: 'Impossible', kind: 'task', notes: null, fixed: false },
];

async function main() {
  // Busy times are shared as instants only.
  {
    const harness = createHarness();
    const built = openPlan(harness, { shareBusy: true });
    ok(built.ok, 'the plan request builds');
    eq(built.request.busy, [{ date: '2030-03-12', start: '11:00' }], 'shared busy times carry no reminder titles');
    ok(!JSON.stringify(built.request).includes('Private reminder title'), 'reminder titles never enter the request');
    const withoutShare = openPlan(harness, { shareBusy: false });
    eq(withoutShare.request.busy, [], 'busy times are not shared unless chosen');
    ok(harness.run('plannerCtx.prompt').includes('plan-week-1'), 'the prompt is built for the plan');
  }

  // Happy path: preview, Apply, receipt, Undo, ack.
  {
    const harness = createHarness();
    openPlan(harness);
    const pasted = harness.run(`plannerAddDraft(${JSON.stringify(draftText(harness, BLOCKS))}, { kind: 'paste' })`);
    ok(pasted.entry && !pasted.duplicate, 'a pasted draft is added');
    harness.run('plannerCtx.activeDraftId = ' + JSON.stringify(pasted.entry.draftId) + '; plannerRefreshPreview();');
    const statuses = harness.run('plannerCtx.preview.result.blocks.map(b => b.status)');
    eq(statuses, ['ready', 'fixed', 'ready', 'invalid'], 'the preview classifies each block');
    const again = harness.run(`plannerAddDraft(${JSON.stringify(draftText(harness, BLOCKS))}, { kind: 'paste' })`);
    ok(again.duplicate === true, 'pasting the same draft again does not add a second copy');
    harness.run(`plannerCtx.preview.entry.companion = true; plannerCtx.drafts.get(plannerCtx.activeDraftId).companion = true;`);

    const write = deferred();
    harness.setPersist(() => write.promise);
    const context = harness.run('createPlannerApplyContext()');
    eq(context.blocks.map(block => block.title), ['Outline chapter 2', 'Write section 2.1'], 'only ready, selected blocks are applied');
    const commit = harness.run('commitPlannerApply(createPlannerApplyContext())');
    await Promise.resolve();
    eq(harness.metrics.snapshots, ['planner.history.apply'], 'one localized snapshot precedes the mutation');
    eq(harness.metrics.persists, [{ reconcileReminders: true }], 'exactly one write with reminder reconciliation');
    ok(harness.run('isPlannerMutationPending()'), 'the apply is pending until the receipt');
    eq(harness.metrics.toasts.length, 0, 'no success before the receipt');
    eq(harness.metrics.acks.length, 0, 'no companion ack before the receipt');
    eq(harness.group.items.length, 2, 'items are in the graph that is being written');
    write.resolve({ ok: true, reminderReconciliation: { ok: true } });
    eq(await commit, true, 'apply resolves after the receipt');
    ok(!harness.run('isPlannerMutationPending()'), 'the pending token is released');
    const [first, second] = harness.group.items;
    eq([first.type, first.text, first.done], ['todo', 'Outline chapter 2', false], 'blocks become to-dos');
    eq(first.reminder, { at: Date.UTC(2030, 2, 11, 9, 30), notified: false }, 'the reminder is the exact block start');
    eq(second.reminder.at, Date.UTC(2030, 2, 13, 10, 0), 'each block keeps its own explicit time');
    eq(first.plan.id, 'plan-week-1', 'provenance names the plan');
    ok(/^k[0-9a-f]{16}$/.test(first.plan.key), 'provenance carries the block key');
    ok(first.notes.includes('&lt;draft&gt;') && !first.notes.includes('<draft>'), 'block notes are escaped into rich text');
    eq(harness.metrics.toasts.length, 1, 'one success toast');
    eq(harness.metrics.toasts[0].options, { undo: 'action-1' }, 'the toast carries the action-scoped Undo');
    ok(harness.metrics.toasts[0].message.startsWith('planner.applied'), 'the success names the destination');
    eq(harness.metrics.acks, [{ draftId: context.draftId, status: 'applied', detail: { added: 2, skipped: 0 } }], 'a companion draft is acknowledged after the receipt');
    const plan = harness.state.plans.find(entry => entry.id === 'plan-week-1');
    ok(plan && plan.applied.length === 1 && plan.applied[0].added === 2, 'the plan record keeps a bounded apply ledger');
    eq(plan.destination, { workspaceId: 'w-1', spaceId: 's-main', groupId: 'g-plan' }, 'the plan remembers its destination');
    eq(harness.run('activeCalendar.anchor'), Date.UTC(2030, 2, 11, 9, 30), 'the Calendar moves to the first added block');

    // Retry of the same apply adds nothing.
    harness.metrics.snapshots.length = 0;
    harness.metrics.persists.length = 0;
    // Replay the exact reviewed context (same destination references): every
    // key is now in the graph, so the retry is a no-op with an explanation.
    harness.context.__retry = context;
    const retry = await harness.run('commitPlannerApply(__retry)');
    eq([retry, harness.metrics.snapshots.length, harness.metrics.persists.length, harness.group.items.length], [false, 0, 0, 2], 'replaying the same apply writes nothing and adds nothing');
    eq(harness.run('plannerCtx.status.key'), 'planner.nothingNew', 'the replay explains that everything is already on the Calendar');
    const fresh = harness.run(`(() => { plannerRefreshPreview(); return plannerCtx.preview.result.blocks.map(b => b.status); })()`);
    eq(fresh, ['applied', 'fixed', 'applied', 'invalid'], 'the preview shows applied blocks after the write');
    eq(harness.run('createPlannerApplyContext().blocks.length'), 0, 'applied blocks cannot be selected again');
    const none = await harness.run('commitPlannerApply(createPlannerApplyContext())');
    eq([none, harness.metrics.snapshots.length, harness.metrics.persists.length], [false, 0, 0], 'an empty apply writes nothing');
  }

  // Idempotent re-apply of a changed draft, plus keys found in Archive/Trash.
  {
    const harness = createHarness();
    openPlan(harness);
    const key = harness.run(`LocusPlan.blockKey('plan-week-1', '2030-03-11', '09:30', 'Outline chapter 2')`);
    harness.state.archive.push({ kind: 'item', data: { id: 'old-1', type: 'todo', text: 'Outline chapter 2', plan: { id: 'plan-week-1', key } } });
    const index = harness.run('plannerAppliedKeyIndex("plan-week-1")');
    eq(index.get(key), 'archive', 'archived planned to-dos count as already added');
    const pasted = harness.run(`plannerAddDraft(${JSON.stringify(draftText(harness, BLOCKS))}, { kind: 'mcp', draftId: 'dcompanion1', companion: true })`);
    harness.run(`plannerCtx.activeDraftId = 'dcompanion1'; plannerRefreshPreview();`);
    eq(harness.run('plannerCtx.preview.result.blocks.map(b => b.status)'), ['applied', 'fixed', 'ready', 'invalid'], 'only the new block is ready');
    const redelivered = harness.run(`plannerAddDraft(${JSON.stringify(draftText(harness, BLOCKS))}, { kind: 'mcp', draftId: 'dcompanion1', companion: true })`);
    ok(redelivered.duplicate && redelivered.entry.deliveries === 2, 'a redelivered companion draft is recognized');
    ok(pasted.entry, 'the companion draft is held');
    const done = await harness.run('commitPlannerApply(createPlannerApplyContext())');
    ok(done && harness.group.items.length === 1, 'only the missing block is added');

    // Concurrent duplicate: the key appears between preview and commit.
    const harness2 = createHarness();
    openPlan(harness2);
    const added = harness2.run(`plannerAddDraft(${JSON.stringify(draftText(harness2, BLOCKS.slice(0, 1).concat(BLOCKS.slice(2, 3))))}, { kind: 'paste' })`);
    harness2.run(`plannerCtx.activeDraftId = ${JSON.stringify(added.entry.draftId)}; plannerRefreshPreview();`);
    const ctx2 = harness2.run('globalThis.__ctx = createPlannerApplyContext()');
    const otherKey = ctx2.blocks[0].key;
    harness2.group.items.push({ id: 'from-other-tab', type: 'todo', plan: { id: 'plan-week-1', key: otherKey } });
    const partial = await harness2.run('commitPlannerApply(__ctx)');
    ok(partial && harness2.group.items.length === 2, 'a block added by another tab is skipped at commit time');
    ok(harness2.metrics.toasts[0].message.startsWith('planner.appliedSkipped'), 'the result reports skipped blocks');
  }

  // New group destination, and fail-closed destination changes.
  {
    const harness = createHarness();
    openPlan(harness, { groupId: '__new__' });
    const added = harness.run(`plannerAddDraft(${JSON.stringify(draftText(harness, BLOCKS))}, { kind: 'paste' })`);
    harness.run(`plannerCtx.activeDraftId = ${JSON.stringify(added.entry.draftId)}; plannerRefreshPreview();`);
    const applied = await harness.run('commitPlannerApply(createPlannerApplyContext())');
    const created = harness.space.groups.find(group => group.id !== 'g-plan');
    ok(applied && created && created.name === 'Thesis week' && created.items.length === 2, 'a new group named after the plan holds the tasks');

    const moved = createHarness();
    openPlan(moved);
    const moveDraft = moved.run(`plannerAddDraft(${JSON.stringify(draftText(moved, BLOCKS))}, { kind: 'paste' })`);
    moved.run(`plannerCtx.activeDraftId = ${JSON.stringify(moveDraft.entry.draftId)}; plannerRefreshPreview(); globalThis.__ctx = createPlannerApplyContext();`);
    moved.space.groups[0] = { ...moved.group, items: [] };
    const result = await moved.run('commitPlannerApply(__ctx)');
    eq([result, moved.metrics.snapshots.length, moved.metrics.persists.length], [false, 0, 0], 'a replaced Group fails closed without writing');
    ok(moved.run('plannerCtx.status.key') === 'planner.destinationChanged', 'the planner explains the destination change');
  }

  // Rejected write and recovery; reminder scheduling warning.
  {
    const harness = createHarness();
    openPlan(harness);
    const added = harness.run(`plannerAddDraft(${JSON.stringify(draftText(harness, BLOCKS))}, { kind: 'paste', companion: true })`);
    harness.run(`plannerCtx.activeDraftId = ${JSON.stringify(added.entry.draftId)}; plannerRefreshPreview();`);
    harness.setPersist(() => Promise.reject(Object.assign(new Error('write rejected'), { code: 'LOCUS_STATE_QUEUE_INVALIDATED' })));
    const result = await harness.run('commitPlannerApply(createPlannerApplyContext())');
    eq([result, harness.metrics.recovery, harness.metrics.toasts.length, harness.metrics.acks.length], [false, 1, 0, 0], 'a rejected write enters recovery with no success and no ack');
    ok(!harness.run('isPlannerMutationPending()'), 'the pending token is released after rejection');
    const blocked = await harness.run('commitPlannerApply(createPlannerApplyContext())');
    eq([blocked, harness.metrics.persists.length], [false, 1], 'recovery blocks a second write');

    const warn = createHarness();
    openPlan(warn);
    const draft = warn.run(`plannerAddDraft(${JSON.stringify(draftText(warn, BLOCKS))}, { kind: 'paste' })`);
    warn.run(`plannerCtx.activeDraftId = ${JSON.stringify(draft.entry.draftId)}; plannerRefreshPreview();`);
    warn.setPersist(() => Promise.resolve({ ok: true, reminderReconciliation: { ok: false } }));
    ok(await warn.run('commitPlannerApply(createPlannerApplyContext())'), 'accepted state with an alarm problem still applies');
    eq(warn.metrics.toasts[0], { message: 'planner.applyScheduleWarning', options: { tone: 'warning', duration: 8000, undo: 'action-1' } }, 'the alarm warning keeps Undo');
  }

  // Saving a plan is its own receipt-gated write.
  {
    const harness = createHarness();
    openPlan(harness);
    const saved = await harness.run('commitPlannerSave()');
    ok(saved && harness.state.plans.length === 1 && harness.state.plans[0].goals[0] === 'Write chapter 2', 'saving writes the plan inputs');
    eq([harness.metrics.snapshots, harness.metrics.persists], [['planner.history.save'], [null]], 'save takes one snapshot and one plain write');
    harness.run(`plannerCtx.form.title = 'Renamed week'`);
    await harness.run('commitPlannerSave()');
    eq([harness.state.plans.length, harness.state.plans[0].title], [1, 'Renamed week'], 'editing updates the same plan record');
    const bad = createHarness();
    openPlan(bad, { timezone: 'Mars/Olympus' });
    eq([await bad.run('commitPlannerSave()'), bad.metrics.persists.length], [false, 0], 'an invalid plan is not saved');
  }

  // ── Static wiring ─────────────────────────────────────────────────
  const ids = ['planner-overlay', 'planner-close', 'planner-form', 'planner-plan-select', 'planner-plan-title', 'planner-horizon',
    'planner-start', 'planner-end', 'planner-timezone', 'planner-timezones', 'planner-goals', 'planner-fixed', 'planner-day-start',
    'planner-day-end', 'planner-max-per-day', 'planner-notes', 'planner-share-busy', 'planner-space', 'planner-group',
    'planner-request-issues', 'planner-save', 'planner-save-state', 'planner-provider', 'planner-profile', 'planner-model',
    'planner-delivery', 'planner-prompt', 'planner-copy', 'planner-companion-status', 'planner-mcp-setup', 'planner-connect',
    'planner-share', 'planner-check', 'planner-runner-row', 'planner-runner', 'planner-run', 'planner-paste', 'planner-check-paste',
    'planner-drafts', 'planner-preview', 'planner-status', 'planner-cancel', 'planner-apply'];
  for (const id of ids) ok(html.includes(`id="${id}"`), `newtab.html has #${id}`);
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
  ok(scripts.indexOf('plan-contract.js') < scripts.indexOf('planner.js') && scripts.indexOf('planner.js') < scripts.indexOf('newtab.js'), 'scripts load contract, planner, then newtab');

  const i18n = readI18n();
  const LocusPlan = require('../plan-contract.js');
  const usedKeys = new Set([...planner.matchAll(/tr\('([a-zA-Z0-9_.-]+)'/g)].map(match => match[1]));
  for (const code of Object.keys(LocusPlan.ISSUE_TEXT)) usedKeys.add(`planner.issue.${code}`);
  for (const profile of Object.keys(LocusPlan.PROFILES)) usedKeys.add(`planner.profileName.${profile}`);
  for (const status of ['ready', 'conflict', 'invalid', 'fixed', 'duplicate', 'applied']) usedKeys.add(`planner.blockStatus.${status}`);
  for (const status of ['off', 'connecting', 'connected', 'notInstalled', 'forbidden', 'denied', 'reloadNeeded', 'disconnected', 'error']) usedKeys.add(`planner.companion.${status}`);
  for (const horizon of LocusPlan.HORIZONS) usedKeys.add(`planner.defaultTitle.${horizon}`);
  for (const key of [...html.matchAll(/data-i18n(?:-[a-z-]+)?="(planner\.[^"]+)"/g)].map(match => match[1])) usedKeys.add(key);
  for (const key of usedKeys) {
    if (key.startsWith('cal.') || key.startsWith('stateRecovery.')) { ok(i18n.en[key], `${key} exists`); continue; }
    ok(typeof i18n.en[key] === 'string' && i18n.en[key], `English has ${key}`);
    ok(typeof i18n['zh-TW'][key] === 'string' && i18n['zh-TW'][key], `zh-TW has ${key}`);
    const enVars = [...i18n.en[key].matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    const zhVars = [...i18n['zh-TW'][key].matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    ok(zhVars.every(name => enVars.includes(name)), `${key} zh-TW placeholders exist in English`);
  }
  ok(!Object.values(i18n['zh-TW']).filter((value, index, all) => typeof value === 'string').some(value => /数据|默认|保存|添加|设置/.test(value) && /planner/.test(value)), 'zh-TW planner copy avoids Mainland terms');

  ok(/function migrate\(\)[\s\S]*if \(from < 14\)/.test(newtab) && /const CURRENT_SCHEMA = 14;/.test(newtab), 'schema 14 is declared with an additive migration step');
  ok((newtab.match(/isPlannerMutationPending\(\)\)/g) || []).length >= 5, 'the planner pending token joins navigation and mutation guards');
  ok(/handleCalendarTaskGlobalKey\(e\)\) return;\n\s*if \(typeof handlePlannerGlobalKey === 'function' && handlePlannerGlobalKey\(e\)\) return;/.test(newtab), 'the planner owns global keys while open');
  ok((newtab.match(/'calendar-task-overlay','planner-overlay'/g) || []).length === 2, 'Escape layering knows the planner');
  ok(/bindCalendarTaskDialog\(\);\n\s*if \(typeof bindPlannerDialog === 'function'\) bindPlannerDialog\(\);/.test(newtab), 'init binds the planner');
  ok(/id = 'cal-plan-btn'[\s\S]{0,200}openPlannerDialog\(plan\)/.test(newtab), 'the Calendar toolbar opens the planner');
  const openBody = planner.slice(planner.indexOf('function openPlannerDialog('), planner.indexOf('function closePlannerDialog('));
  for (const id of ['state-recovery-overlay', 'calendar-task-overlay', 'reminder-overlay', 'welcome', 'quota-overlay', 'settings-drawer']) {
    ok(openBody.includes(`'${id}'`), `the planner refuses to open over #${id}`);
  }

  ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(planner), 'planner.js has no network APIs');
  ok(!/chrome\.tabs|chrome\.bookmarks|chrome\.history|chrome\.scripting/.test(planner), 'planner.js does not read tabs, bookmarks, or history');
  ok(!/chrome\.storage\.local\.set\(\{\s*te\s*:/.test(planner), 'planner.js never writes the whole state directly');
  eq([...planner.matchAll(/connectNative\(([^)]*)\)/g)].map(match => match[1]), ['PLANNER_NATIVE_HOST'], 'one native host name is used');
  ok(/chrome\.permissions\.request\(\{ permissions: \['nativeMessaging'\] \}\)/.test(planner), 'native messaging is requested at runtime');
  eq(manifest.optional_permissions, ['nativeMessaging'], 'nativeMessaging is the only optional permission');
  ok(!manifest.permissions.includes('nativeMessaging') && !manifest.host_permissions && !manifest.optional_host_permissions, 'no host permissions and no install-time native messaging');
  ok(/connect-src 'none'/.test(manifest.content_security_policy.extension_pages), "connect-src 'none' stays");
  ok(!manifest.externally_connectable, 'no external messaging');

  console.log(`Calendar planner contracts passed: ${checks} checks (privacy, preview, receipt/Undo/ack ordering, idempotent retry and redelivery, Archive keys, destinations, recovery, save, wiring, locales, manifest)`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
