'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const importUtils = require('../import-utils.js');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'newtab.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');
const fixedNow = Date.UTC(2030, 0, 15, 12, 0, 0);
const reviewedDay = new Date(2030, 0, 22, 0, 0, 0, 0).getTime();
const reviewedAt = new Date(2030, 0, 22, 9, 0, 0, 0).getTime();

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} must remain extractable from newtab.js`);
  const declarationStart = source.slice(Math.max(0, start - 6), start) === 'async '
    ? start - 6
    : start;
  const parameterOpen = source.indexOf('(', start + `function ${name}`.length);
  let parameterDepth = 0;
  let parameterClose = -1;
  let quote = '';
  let escaped = false;
  for (let index = parameterOpen; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '(') parameterDepth += 1;
    if (char === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) { parameterClose = index; break; }
    }
  }
  assert.ok(parameterClose >= 0, `${name} must have a complete parameter list`);
  const open = source.indexOf('{', parameterClose + 1);
  assert.ok(open >= 0, `${name} must have a function body`);

  let depth = 0;
  quote = '';
  escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(declarationStart, index + 1);
    }
  }
  assert.fail(`${name} function body is unterminated`);
}

function extractBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `${startMarker} must remain extractable`);
  return source.slice(start, end);
}

function readI18n() {
  const startMarker = 'const I18N = ';
  const start = source.indexOf(startMarker);
  const trStart = source.indexOf('\nfunction tr(', start);
  const close = source.lastIndexOf('};', trStart);
  assert.ok(start >= 0 && trStart > start && close > start, 'I18N must remain extractable');
  return vm.runInNewContext(
    `(${source.slice(start + startMarker.length, close + 1)})`,
    {},
    { filename: 'calendar-add-task-i18n-extract.js' },
  );
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function createGraph({ withInbox = true } = {}) {
  const existingItem = {
    id: 'item-existing',
    type: 'todo',
    text: 'Existing',
    done: false,
  };
  const inbox = {
    id: 'group-inbox',
    name: 'Inbox',
    symbol: '📥',
    color: '#6366f1',
    collapsed: false,
    items: [existingItem],
  };
  const neighbor = {
    id: 'group-neighbor',
    name: 'Reading',
    items: [],
  };
  const space = {
    id: 'space-main',
    name: 'Work',
    groups: withInbox ? [inbox, neighbor] : [neighbor],
  };
  const otherSpace = {
    id: 'space-other',
    name: 'Later',
    groups: [],
  };
  const workspace = {
    id: 'workspace-main',
    name: 'Primary',
    activeCatId: space.id,
    categories: [space, otherSpace],
  };
  const otherWorkspace = {
    id: 'workspace-other',
    name: 'Other',
    activeCatId: 'space-third',
    categories: [{ id: 'space-third', name: 'Other space', groups: [] }],
  };
  const state = {
    schema: 12,
    activeWsId: workspace.id,
    workspaces: [workspace, otherWorkspace],
    archive: [{
      kind: 'item',
      wsId: workspace.id,
      catId: space.id,
      groupId: inbox.id,
      data: { id: 'archived-collision', type: 'todo', text: 'Archived' },
    }],
    trash: [{
      kind: 'group',
      wsId: workspace.id,
      catId: space.id,
      groupId: 'trashed-group',
      data: {
        id: 'trashed-collision',
        name: 'Old',
        items: [{ id: 'trashed-item-collision', type: 'todo', text: 'Old' }],
      },
    }],
    settings: {
      captureLastTarget: {
        workspaceId: 'remembered-workspace',
        categoryId: 'remembered-space',
        groupId: 'remembered-group',
      },
    },
  };
  return {
    state,
    workspace,
    otherWorkspace,
    space,
    otherSpace,
    inbox: withInbox ? inbox : null,
    neighbor,
    existingItem,
  };
}

const productionFunctions = [
  'organizationWorkspaceTarget',
  'organizationGroupTarget',
  'createOrganizationIdAllocator',
  'identitySpaceTarget',
  'calendarTaskDateParts',
  'createCalendarTaskMutationContext',
  'resolveCalendarTaskMutationTarget',
  'isCalendarTaskMutationPending',
  'commitCalendarTaskMutation',
];

function createHarness(options = {}) {
  const graph = createGraph({ withInbox: options.withInbox !== false });
  const receipt = deferred();
  let recoveryRequired = options.recoveryRequired === true;
  let nextActionId = 40;
  let uidIndex = 0;
  const uidSequence = options.uidSequence || ['generated-item'];
  const calls = {
    snapshots: [],
    writes: [],
    busy: [],
    errors: [],
    closes: [],
    renders: 0,
    focuses: [],
    toasts: [],
    recovery: [],
    frames: 0,
    uid: 0,
  };

  const State = {
    get: () => graph.state,
    snapshot(label) {
      calls.snapshots.push(label);
      nextActionId += 1;
      return nextActionId;
    },
    persistNow(optionsArg) {
      calls.writes.push(plain(optionsArg));
      return receipt.promise.catch(error => {
        recoveryRequired = true;
        throw error;
      });
    },
    isRecoveryRequired: () => recoveryRequired,
    requireRecovery() { recoveryRequired = true; },
  };

  const elements = new Map([
    ['state-recovery-overlay', {
      classList: { contains: () => true },
    }],
  ]);
  const context = vm.createContext({
    State,
    LocusImportUtils: { collectEntityIds: importUtils.collectEntityIds },
    Date: class extends Date {
      constructor(...args) {
        super(...(args.length ? args : [fixedNow]));
      }
      static now() { return fixedNow; }
    },
    Math,
    JSON,
    Object,
    Array,
    Set,
    Map,
    String,
    Number,
    Error,
    document: {
      getElementById(id) { return elements.get(id) || null; },
    },
    uid() {
      calls.uid += 1;
      const value = uidSequence[Math.min(uidIndex, uidSequence.length - 1)];
      uidIndex += 1;
      return value;
    },
    stampNew(item) {
      if (item && item.createdAt == null) item.createdAt = fixedNow;
      return item;
    },
    appLocale: () => 'en',
    tr(key, vars = {}) {
      return `${key}${Object.keys(vars).length ? `:${JSON.stringify(vars)}` : ''}`;
    },
    setCalendarTaskBusy(value) { calls.busy.push(value); },
    setCalendarTaskError(key, errorOptions = {}) {
      calls.errors.push({ key, options: plain(errorOptions) });
    },
    closeCalendarTaskDialog(closeOptions = {}) {
      calls.closes.push(plain(closeOptions));
      return true;
    },
    renderBoard() { calls.renders += 1; },
    requestAnimationFrame(callback) {
      calls.frames += 1;
      callback();
      return calls.frames;
    },
    focusCalendarTaskMutationTarget(taskContext, itemId, groupId) {
      calls.focuses.push({
        workspaceId: taskContext.workspaceId,
        spaceId: taskContext.spaceId,
        itemId,
        groupId,
      });
      return true;
    },
    toast(message, toastOptions = {}) {
      calls.toasts.push({ message, options: plain(toastOptions) });
    },
    showStateRecoveryRequired(error) {
      calls.recovery.push(error?.code || error?.message || 'error');
    },
  });

  const program = [
    'let calendarTaskMutationPending = null;',
    ...productionFunctions.map(extractFunction),
    'globalThis.contractApi = {',
    '  createCalendarTaskMutationContext,',
    '  resolveCalendarTaskMutationTarget,',
    '  isCalendarTaskMutationPending,',
    '  commitCalendarTaskMutation,',
    '};',
  ].join('\n');
  new vm.Script(program, { filename: 'calendar-add-task-production-extract.js' }).runInContext(context);

  return {
    ...graph,
    api: context.contractApi,
    calls,
    receipt,
    setRecoveryRequired(value) { recoveryRequired = !!value; },
  };
}

function makeContext(harness) {
  return harness.api.createCalendarTaskMutationContext(reviewedDay);
}

function assertNoMutation(calls) {
  assert.deepEqual(calls.snapshots, []);
  assert.deepEqual(calls.writes, []);
  assert.equal(calls.renders, 0);
  assert.deepEqual(calls.closes, []);
  assert.deepEqual(calls.focuses, []);
  assert.deepEqual(calls.toasts, []);
}

{
  const harness = createHarness();
  const context = makeContext(harness);
  assert.ok(context, 'an exact active Calendar destination should create a context');
  assert.equal(context.workspaceId, harness.workspace.id);
  assert.equal(context.spaceId, harness.space.id);
  assert.equal(context.workspaceRef, harness.workspace);
  assert.equal(context.spaceRef, harness.space);
  assert.equal(context.inboxId, harness.inbox.id);
  assert.equal(context.inboxRef, harness.inbox);
  assert.equal(context.dayStart, reviewedDay);
  assert.equal(context.at, reviewedAt);
  assert.equal(harness.api.resolveCalendarTaskMutationTarget(context).inbox, harness.inbox);

  harness.space.groups.reverse();
  harness.neighbor.items.push({ id: 'neighbor-new', type: 'note', html: 'Unrelated' });
  harness.inbox.items.push({ id: 'inbox-neighbor', type: 'todo', text: 'Unrelated', done: false });
  assert.equal(
    harness.api.resolveCalendarTaskMutationTarget(context).inbox,
    harness.inbox,
    'reorder and unrelated item changes must remain safe',
  );
}

{
  const harness = createHarness({ withInbox: false });
  const context = makeContext(harness);
  assert.ok(context);
  assert.equal(context.inboxId, null);
  assert.equal(context.inboxRef, null);
  assert.equal(harness.api.resolveCalendarTaskMutationTarget(context).inbox, null);
  harness.space.groups.push({ id: 'appeared-inbox', name: 'Inbox', items: [] });
  assert.equal(
    harness.api.resolveCalendarTaskMutationTarget(context),
    null,
    'a newly appeared Inbox was not the reviewed destination',
  );
}

for (const [label, mutate] of [
  ['workspace replacement', harness => {
    harness.state.workspaces[0] = { ...harness.workspace, categories: harness.workspace.categories };
  }],
  ['space replacement', harness => {
    harness.workspace.categories[0] = { ...harness.space, groups: harness.space.groups };
  }],
  ['active workspace change', harness => {
    harness.state.activeWsId = harness.otherWorkspace.id;
  }],
  ['active Space change', harness => {
    harness.workspace.activeCatId = harness.otherSpace.id;
  }],
  ['Inbox rename', harness => {
    harness.inbox.name = 'Renamed';
  }],
  ['Inbox move', harness => {
    harness.space.groups.splice(harness.space.groups.indexOf(harness.inbox), 1);
    harness.otherSpace.groups.push(harness.inbox);
  }],
  ['duplicate Inbox', harness => {
    harness.space.groups.push({ id: 'other-inbox', name: 'Inbox', items: [] });
  }],
  ['duplicate Inbox id', harness => {
    harness.otherSpace.groups.push({ id: harness.inbox.id, name: 'Duplicate', items: [] });
  }],
]) {
  const harness = createHarness();
  const context = makeContext(harness);
  mutate(harness);
  assert.equal(
    harness.api.resolveCalendarTaskMutationTarget(context),
    null,
    `${label} must fail closed`,
  );
}

{
  const harness = createHarness();
  assert.equal(harness.api.createCalendarTaskMutationContext(Number.NaN), null);
  assert.equal(harness.api.createCalendarTaskMutationContext(reviewedDay + 60_000), null);
  harness.space.groups.push({ id: 'duplicate-inbox', name: 'Inbox', items: [] });
  assert.equal(harness.api.createCalendarTaskMutationContext(reviewedDay), null);
}

async function runAcceptedExistingInbox() {
  const harness = createHarness({
    uidSequence: [
      'item-existing',
      'archived-collision',
      'trashed-item-collision',
      'remembered-group',
      'calendar-item-unique',
    ],
  });
  const context = makeContext(harness);
  const pending = harness.api.commitCalendarTaskMutation(context, '  Release notes  ');
  assert.equal(harness.api.isCalendarTaskMutationPending(), true);
  assert.deepEqual(harness.calls.busy, [true]);
  assert.deepEqual(harness.calls.snapshots, ['cal.history.addTask']);
  assert.deepEqual(harness.calls.writes, [{ reconcileReminders: true }]);
  assert.equal(harness.inbox.items.length, 2);
  const task = harness.inbox.items[1];
  assert.deepEqual(plain(task), {
    id: 'calendar-item-unique',
    type: 'todo',
    text: 'Release notes',
    done: false,
    reminder: { at: reviewedAt, notified: false },
    createdAt: fixedNow,
  });
  assert.equal(harness.calls.renders, 0);
  assert.deepEqual(harness.calls.closes, []);
  assert.deepEqual(harness.calls.toasts, []);

  assert.equal(
    await harness.api.commitCalendarTaskMutation(context, 'Duplicate'),
    false,
    'a duplicate activation must not start a second write',
  );
  assert.equal(harness.calls.writes.length, 1);

  harness.receipt.resolve({ ok: true, reminderReconciliation: { ok: true } });
  assert.equal(await pending, true);
  assert.equal(harness.api.isCalendarTaskMutationPending(), false);
  assert.deepEqual(harness.calls.busy, [true, false]);
  assert.deepEqual(harness.calls.closes, [{ restoreFocus: false }]);
  assert.equal(harness.calls.renders, 1);
  assert.deepEqual(harness.calls.focuses, [{
    workspaceId: harness.workspace.id,
    spaceId: harness.space.id,
    itemId: task.id,
    groupId: harness.inbox.id,
  }]);
  assert.deepEqual(harness.calls.toasts, [{
    message: `cal.added:${JSON.stringify({ date: context.dateLabel })}`,
    options: { undo: 41 },
  }]);
}

async function runAcceptedProposedInbox() {
  const harness = createHarness({
    withInbox: false,
    uidSequence: [
      'group-neighbor',
      'archived-collision',
      'calendar-inbox-unique',
      'calendar-inbox-unique',
      'calendar-item-unique',
    ],
  });
  const context = makeContext(harness);
  const pending = harness.api.commitCalendarTaskMutation(context, 'Plan launch');
  assert.equal(harness.space.groups.length, 2);
  const inbox = harness.space.groups[0];
  assert.deepEqual(plain(inbox), {
    id: 'calendar-inbox-unique',
    name: 'Inbox',
    symbol: '📥',
    color: '#6366f1',
    collapsed: false,
    items: [{
      id: 'calendar-item-unique',
      type: 'todo',
      text: 'Plan launch',
      done: false,
      reminder: { at: reviewedAt, notified: false },
      createdAt: fixedNow,
    }],
  });
  harness.receipt.resolve({ ok: true, reminderReconciliation: { ok: true } });
  assert.equal(await pending, true);
  assert.equal(harness.calls.focuses[0].groupId, inbox.id);
}

async function runAlarmWarning() {
  const harness = createHarness({ uidSequence: ['calendar-warning-item'] });
  const context = makeContext(harness);
  const pending = harness.api.commitCalendarTaskMutation(context, 'Review alerts');
  harness.receipt.resolve({ ok: true, reminderReconciliation: { ok: false } });
  assert.equal(await pending, true);
  assert.deepEqual(harness.calls.toasts, [{
    message: 'cal.addScheduleWarning',
    options: { tone: 'warning', duration: 8000, undo: 41 },
  }]);
}

async function runRejectedWrite() {
  const harness = createHarness({ uidSequence: ['calendar-rejected-item'] });
  const context = makeContext(harness);
  const pending = harness.api.commitCalendarTaskMutation(context, 'Rejected');
  const error = Object.assign(new Error('write rejected'), { code: 'WRITE_REJECTED' });
  harness.receipt.reject(error);
  assert.equal(await pending, false);
  assert.equal(harness.api.isCalendarTaskMutationPending(), false);
  assert.deepEqual(harness.calls.busy, [true, false]);
  assert.deepEqual(harness.calls.errors, [{
    key: 'cal.saveFailed',
    options: { unavailable: true },
  }]);
  assert.deepEqual(harness.calls.recovery, ['WRITE_REJECTED']);
  assert.equal(harness.inbox.items.at(-1).text, 'Rejected', 'the one dirty graph stays for recovery');
  assert.equal(harness.calls.renders, 0);
  assert.deepEqual(harness.calls.closes, []);
  assert.deepEqual(harness.calls.focuses, []);
  assert.deepEqual(harness.calls.toasts, []);
}

async function runUnknownWrite() {
  const harness = createHarness({ uidSequence: ['calendar-unknown-item'] });
  const context = makeContext(harness);
  void harness.api.commitCalendarTaskMutation(context, 'Unknown');
  await Promise.resolve();
  assert.equal(harness.api.isCalendarTaskMutationPending(), true);
  assert.deepEqual(harness.calls.busy, [true]);
  assert.equal(harness.calls.renders, 0);
  assert.deepEqual(harness.calls.closes, []);
  assert.deepEqual(harness.calls.toasts, []);
}

async function runValidationAndPreflight() {
  {
    const harness = createHarness();
    const context = makeContext(harness);
    assert.equal(await harness.api.commitCalendarTaskMutation(context, '   '), false);
    assert.deepEqual(harness.calls.errors, [{ key: 'cal.taskRequired', options: {} }]);
    assertNoMutation(harness.calls);
  }
  {
    const harness = createHarness({ recoveryRequired: true });
    const context = makeContext(harness);
    assert.equal(await harness.api.commitCalendarTaskMutation(context, 'Blocked'), false);
    assert.deepEqual(harness.calls.errors, [{
      key: 'cal.saveFailed',
      options: { unavailable: true },
    }]);
    assert.equal(harness.calls.recovery.length, 1);
    assertNoMutation(harness.calls);
  }
  {
    const harness = createHarness();
    const context = makeContext(harness);
    harness.inbox.name = 'Changed';
    assert.equal(await harness.api.commitCalendarTaskMutation(context, 'Stale'), false);
    assert.deepEqual(harness.calls.errors, [{
      key: 'cal.destinationChanged',
      options: { unavailable: true },
    }]);
    assertNoMutation(harness.calls);
  }
}

function assertStaticWiring() {
  const section = extractBetween('function openCalDay(', 'function calPeriodLabel(');
  assert.doesNotMatch(section, /\bprompt\s*\(/, 'Calendar Add-task must not use a native prompt');
  assert.doesNotMatch(section, /chrome\.alarms\.(?:create|clear)\s*\(/, 'the page must not own reminder alarms');
  assert.doesNotMatch(section, /\bState\.persist\s*\(/, 'the transaction must not use a delayed write');
  assert.match(section, /openCalendarTaskDialog\(dayStart,\s*opener\)/);
  assert.match(section, /State\.persistNow\(\{\s*reconcileReminders:\s*true\s*\}\)/);
  assert.match(section, /calendarTaskMutationPending\s*=\s*transaction[\s\S]*State\.snapshot\(/);
  assert.match(section, /requestAnimationFrame\(\(\)\s*=>\s*focusCalendarTaskMutationTarget/);

  assert.match(
    source,
    /function handleCalendarTaskGlobalKey[\s\S]*isCalendarTaskMutationPending\(\)[\s\S]*stopImmediatePropagation/,
  );
  assert.match(
    source,
    /document\.addEventListener\('keydown',[\s\S]*handleCalendarTaskGlobalKey\(e\)[\s\S]*openCommandPalette/,
  );
  assert.match(
    source,
    /foregroundBlocksNavigation[\s\S]*isCalendarTaskMutationPending\(\)/,
  );
  assert.match(
    source,
    /navigate\(route,[\s\S]*calendar-task-overlay[\s\S]*isCalendarTaskMutationPending\(\)/,
  );
  assert.match(source, /bindCalendarTaskDialog\(\)/);

  for (const id of [
    'calendar-task-overlay',
    'calendar-task-form',
    'calendar-task-title',
    'calendar-task-description',
    'calendar-task-input',
    'calendar-task-status',
    'calendar-task-cancel',
    'calendar-task-confirm',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `${id} must exist in the dialog`);
  }
  assert.match(
    html,
    /id="calendar-task-overlay"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="calendar-task-title"/,
  );
  assert.match(html, /id="calendar-task-status"[^>]*aria-live="polite"/);
  assert.match(css, /#calendar-task-overlay/);
  assert.match(css, /\.calendar-task-panel/);

  const i18n = readI18n();
  const requiredKeys = [
    'cal.addDialogTitle',
    'cal.addDescription',
    'cal.taskLabel',
    'cal.taskPlaceholder',
    'cal.cancelAdd',
    'cal.confirmAdd',
    'cal.adding',
    'cal.taskRequired',
    'cal.destinationChanged',
    'cal.saveFailed',
    'cal.addScheduleWarning',
    'cal.closeAddDialog',
  ];
  for (const locale of ['en', 'zh-TW']) {
    for (const key of requiredKeys) {
      assert.equal(typeof i18n[locale]?.[key], 'string', `${locale} must define ${key}`);
      assert.ok(i18n[locale][key].trim(), `${locale} ${key} must not be empty`);
    }
  }
  assert.match(i18n['zh-TW']['cal.adding'], /新增|儲存/);
  assert.match(i18n['zh-TW']['cal.destinationChanged'], /儲存位置|收件匣|空間/);
}

Promise.resolve()
  .then(runAcceptedExistingInbox)
  .then(runAcceptedProposedInbox)
  .then(runAlarmWarning)
  .then(runRejectedWrite)
  .then(runUnknownWrite)
  .then(runValidationAndPreflight)
  .then(() => {
    assertStaticWiring();
    console.log(
      'Calendar Add-task contracts passed: exact existing/proposed Inbox identity, unique IDs, receipt/alarm ordering, recovery, pending interlocks, focus/Undo, localization, and legacy-path removal.',
    );
  })
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
