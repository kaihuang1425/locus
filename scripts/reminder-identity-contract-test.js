'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const fixedNow = Date.UTC(2030, 0, 15, 12, 0, 0);

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} must remain extractable from newtab.js`);
  const declarationStart = source.slice(Math.max(0, start - 6), start) === 'async '
    ? start - 6
    : start;
  const parameterOpen = source.indexOf('(', start + `function ${name}`.length);
  let parameterClose = -1;
  let parameterDepth = 0;
  let parameterQuote = '';
  let parameterEscaped = false;
  for (let index = parameterOpen; index < source.length; index += 1) {
    const char = source[index];
    if (parameterQuote) {
      if (parameterEscaped) { parameterEscaped = false; continue; }
      if (char === '\\') { parameterEscaped = true; continue; }
      if (char === parameterQuote) parameterQuote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { parameterQuote = char; continue; }
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
  let quote = '';
  let escaped = false;
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
    { filename: 'reminder-identity-i18n-extract.js' },
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

function eventFor(key, target) {
  return {
    key,
    target,
    defaultPrevented: false,
    propagationStopped: false,
    immediatePropagationStopped: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagationStopped = true; },
    stopImmediatePropagation() {
      this.immediatePropagationStopped = true;
      this.propagationStopped = true;
    },
  };
}

function createGraph() {
  const groupFirst = {
    id: 'group-first',
    at: fixedNow + 60_000,
    notified: false,
    label: 'First',
  };
  const groupTarget = {
    id: 'group-target',
    at: fixedNow + 120_000,
    notified: false,
    label: 'Second',
  };
  const spaceFirst = {
    id: 'space-first',
    at: fixedNow + 180_000,
    notified: false,
    label: 'Plan',
  };
  const spaceTarget = {
    id: 'space-target',
    at: fixedNow + 240_000,
    notified: false,
    label: 'Review',
  };
  const group = {
    id: 'group-a',
    name: 'Reading',
    reminders: [groupFirst, groupTarget],
    items: [],
  };
  const space = {
    id: 'space-a',
    name: 'Work',
    reminders: [spaceFirst, spaceTarget],
    groups: [group],
  };
  const otherSpace = {
    id: 'space-b',
    name: 'Later',
    groups: [],
  };
  const workspace = {
    id: 'workspace-a',
    name: 'Primary',
    categories: [space, otherSpace],
  };
  const state = {
    schema: 12,
    activeWsId: workspace.id,
    workspaces: [workspace],
  };
  return {
    state,
    workspace,
    space,
    otherSpace,
    group,
    groupFirst,
    groupTarget,
    spaceFirst,
    spaceTarget,
  };
}

const removalControllerFunctions = [
  'isStableEntityReminderId',
  'organizationGroupTarget',
  'identitySpaceTarget',
  'identityGroupTarget',
  'entityReminderOwnerTarget',
  'entityReminderValueFingerprint',
  'createEntityReminderRemovalContext',
  'entityReminderOwnerMatchesContext',
  'resolveEntityReminderRemovalTarget',
  'isItemDetailReminderMutationPending',
  'isReminderMutationPending',
  'handleReminderGlobalKey',
  'commitEntityReminderRemoval',
];

function createRemovalHarness(options = {}) {
  const graph = createGraph();
  const receipt = deferred();
  let recoveryRequired = options.recoveryRequired === true;
  const calls = {
    busy: [],
    unavailable: [],
    snapshots: [],
    writes: [],
    closes: 0,
    renders: 0,
    timers: [],
    focusFallbacks: [],
    toasts: [],
    recoveries: [],
    requireRecovery: 0,
    closeFocus: 0,
    events: [],
  };
  const reminderOverlay = {
    classList: { contains: name => name === 'hidden' ? false : false },
    contains: target => target?._insideReminder === true,
  };
  const closeControl = {
    focus() {
      calls.closeFocus += 1;
    },
  };
  const State = {
    get() { return graph.state; },
    snapshot(label) {
      calls.snapshots.push(label);
      calls.events.push(`snapshot:${label}`);
      if (options.snapshotError) throw options.snapshotError;
      return options.actionId ?? 73;
    },
    persistNow(writeOptions) {
      calls.writes.push(plain(writeOptions));
      calls.events.push('write');
      if (options.writeError) {
        if (options.recoveryAfterWrite !== false) recoveryRequired = true;
        return Promise.reject(options.writeError);
      }
      return receipt.promise;
    },
    isRecoveryRequired() {
      return recoveryRequired;
    },
    requireRecovery() {
      calls.requireRecovery += 1;
    },
  };
  const context = vm.createContext({
    State,
    document: {
      getElementById(id) {
        if (id === 'reminder-overlay') return reminderOverlay;
        if (id === 'rm-x') return closeControl;
        return null;
      },
    },
    tr(key, vars = {}) {
      return vars.name == null ? key : `${key}(${vars.name})`;
    },
    setReminderMutationBusy(busy, statusKey) {
      calls.busy.push({ busy, statusKey: statusKey || null });
      calls.events.push(`busy:${busy}`);
    },
    setReminderMutationUnavailable(key) {
      calls.unavailable.push(key);
      calls.events.push(`unavailable:${key}`);
    },
    closeReminderPicker() {
      calls.closes += 1;
      calls.events.push('close');
      return true;
    },
    renderBoard() {
      calls.renders += 1;
      calls.events.push('render');
    },
    setTimeout(callback) {
      calls.timers.push(callback);
      calls.events.push('timer');
      return calls.timers.length;
    },
    focusEntityReminderRemovalFallback(removalContext, removedIndex) {
      calls.focusFallbacks.push({ context: removalContext, removedIndex });
      calls.events.push('focus');
      return true;
    },
    toast(message, toastOptions = {}) {
      calls.toasts.push({ message, options: plain(toastOptions) });
      calls.events.push(`toast:${message}`);
    },
    showStateRecoveryRequired(error) {
      calls.recoveries.push(error);
    },
  });
  vm.runInContext(
    `let itemReminderMutationPending = null;\n`
      + `let entityReminderMutationPending = null;\n`
      + `${removalControllerFunctions.map(extractFunction).join('\n\n')}\n`
      + 'globalThis.__api = { createEntityReminderRemovalContext, resolveEntityReminderRemovalTarget, commitEntityReminderRemoval, isReminderMutationPending, handleReminderGlobalKey };',
    context,
    { filename: 'newtab-entity-reminder-removal-extract.js' },
  );
  return { api: context.__api, graph, calls, receipt };
}

const mutationControllerFunctions = [
  'isStableEntityReminderId',
  'allocateEntityReminderId',
  'organizationGroupTarget',
  'identitySpaceTarget',
  'identityGroupTarget',
  'entityReminderOwnerTarget',
  'entityReminderValueFingerprint',
  'cloneEntityReminderRecord',
  'entityReminderOwnerMatchesContext',
  'createEntityReminderMutationContext',
  'resolveEntityReminderMutationTarget',
  'buildEntityReminderMutationValue',
  'isItemDetailReminderMutationPending',
  'isReminderMutationPending',
  'handleReminderGlobalKey',
  'commitEntityReminderMutation',
];

function createMutationHarness(options = {}) {
  const graph = createGraph();
  const receipt = deferred();
  let recoveryRequired = options.recoveryRequired === true;
  let idIndex = 0;
  const generatedIds = options.generatedIds || ['generated-1', 'generated-2'];
  const calls = {
    busy: [],
    unavailable: [],
    timeErrors: 0,
    snapshots: [],
    writes: [],
    closes: 0,
    renders: 0,
    frames: [],
    focus: [],
    toasts: [],
    recoveries: [],
    requireRecovery: 0,
    interlocks: [],
    events: [],
  };
  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [fixedNow]));
    }

    static now() {
      return fixedNow;
    }
  }
  const State = {
    get() { return graph.state; },
    snapshot(label) {
      calls.snapshots.push(label);
      calls.events.push(`snapshot:${label}`);
      if (options.snapshotError) throw options.snapshotError;
      return options.actionId ?? 81;
    },
    persistNow(writeOptions) {
      calls.writes.push(plain(writeOptions));
      calls.events.push('write');
      if (options.writeError) {
        if (options.recoveryAfterWrite !== false) recoveryRequired = true;
        return Promise.reject(options.writeError);
      }
      return receipt.promise;
    },
    isRecoveryRequired() {
      return recoveryRequired;
    },
    requireRecovery() {
      recoveryRequired = true;
      calls.requireRecovery += 1;
    },
  };
  const context = vm.createContext({
    Date: FixedDate,
    State,
    document: {
      getElementById() { return null; },
    },
    uid() {
      const id = generatedIds[Math.min(idIndex, generatedIds.length - 1)];
      idIndex += 1;
      return id;
    },
    tr(key) { return key; },
    setReminderMutationBusy(busy, statusKey) {
      calls.busy.push({ busy, statusKey: statusKey || null });
      calls.events.push(`busy:${busy}`);
    },
    setReminderMutationUnavailable(key) {
      calls.unavailable.push(key);
      calls.events.push(`unavailable:${key}`);
    },
    setReminderInterlock(enabled) {
      calls.interlocks.push(enabled);
      calls.events.push(`interlock:${enabled}`);
    },
    showReminderTimeError() {
      calls.timeErrors += 1;
    },
    closeReminderPicker() {
      calls.closes += 1;
      calls.events.push('close');
      return true;
    },
    renderBoard() {
      calls.renders += 1;
      calls.events.push('render');
    },
    requestAnimationFrame(callback) {
      calls.frames.push(callback);
      calls.events.push('frame');
      return calls.frames.length;
    },
    focusEntityReminderMutationTarget(mutationContext, reminderId) {
      calls.focus.push({ context: mutationContext, reminderId });
      calls.events.push('focus');
      return true;
    },
    toast(message, toastOptions = {}) {
      calls.toasts.push({ message, options: plain(toastOptions) });
      calls.events.push(`toast:${message}`);
    },
    showStateRecoveryRequired(error) {
      calls.recoveries.push(error);
    },
  });
  vm.runInContext(
    `let itemReminderMutationPending = null;\n`
      + `let entityReminderMutationPending = null;\n`
      + `${mutationControllerFunctions.map(extractFunction).join('\n\n')}\n`
      + 'globalThis.__api = { createEntityReminderMutationContext, resolveEntityReminderMutationTarget, buildEntityReminderMutationValue, commitEntityReminderMutation, isReminderMutationPending, handleReminderGlobalKey };',
    context,
    { filename: 'newtab-entity-reminder-mutation-extract.js' },
  );
  return { api: context.__api, graph, calls, receipt };
}

function assertResolutionFails(mutator, label, kind = 'group', entityId = 'group-a', reminderId = 'group-target') {
  const harness = createRemovalHarness();
  const context = harness.api.createEntityReminderRemovalContext(kind, entityId, reminderId);
  assert.ok(context, `${label} needs a valid reviewed context`);
  mutator(harness.graph);
  assert.equal(harness.api.resolveEntityReminderRemovalTarget(context), null, label);
}

function testExactRemovalResolution() {
  const harness = createRemovalHarness();
  const groupContext = harness.api.createEntityReminderRemovalContext('group', 'group-a', 'group-target');
  const spaceContext = harness.api.createEntityReminderRemovalContext('category', 'space-a', 'space-target');
  assert.ok(groupContext, 'a unique Group reminder must produce a removal context');
  assert.ok(spaceContext, 'a unique Space reminder must produce a removal context');
  assert.equal(groupContext.reminderId, 'group-target');
  assert.equal(groupContext.workspaceId, 'workspace-a');
  assert.equal(groupContext.spaceId, 'space-a');
  assert.equal(groupContext.groupId, 'group-a');
  assert.equal(spaceContext.groupId, null);
  assert.equal(harness.api.createEntityReminderRemovalContext('group', 'group-a', ''), null);
  assert.equal(harness.api.createEntityReminderRemovalContext('unknown', 'group-a', 'group-target'), null);

  harness.graph.group.reminders.reverse();
  harness.graph.groupFirst.label = 'Changed neighbor';
  const reordered = harness.api.resolveEntityReminderRemovalTarget(groupContext);
  assert.ok(reordered, 'reordering and unrelated neighbor changes must retain the reviewed stable target');
  assert.equal(reordered.index, 0);
  assert.equal(reordered.reminder, harness.graph.groupTarget);

  assertResolutionFails(
    graph => { graph.group.reminders = graph.group.reminders.filter(reminder => reminder !== graph.groupTarget); },
    'a missing reviewed reminder must fail closed',
  );
  assertResolutionFails(
    graph => { graph.group.reminders.push({ ...graph.groupTarget }); },
    'a duplicated reminder id must fail closed',
  );
  assertResolutionFails(
    graph => {
      const index = graph.group.reminders.indexOf(graph.groupTarget);
      graph.group.reminders[index] = { ...graph.groupTarget };
    },
    'an indistinguishable replacement object must fail closed',
  );
  assertResolutionFails(
    graph => { graph.groupTarget.label = 'Changed target'; },
    'a concurrently changed reviewed reminder must fail closed',
  );
  assertResolutionFails(
    graph => {
      graph.space.groups = graph.space.groups.filter(group => group !== graph.group);
      graph.otherSpace.groups.push(graph.group);
    },
    'a Group moved to another Space after review must fail closed',
  );
  assertResolutionFails(
    graph => { graph.otherSpace.groups.push({ ...graph.group, reminders: [] }); },
    'a duplicated Group id must fail closed',
  );
  assertResolutionFails(
    graph => {
      graph.workspace.categories.push({
        ...graph.space,
        groups: [],
        reminders: [],
      });
    },
    'a duplicated Space id must fail closed',
    'category',
    'space-a',
    'space-target',
  );
  assertResolutionFails(
    graph => { graph.spaceTarget.at += 60_000; },
    'a concurrently changed Space reminder must fail closed',
    'category',
    'space-a',
    'space-target',
  );
}

function assertMutationResolutionFails(
  mutator,
  label,
  kind = 'group',
  entityId = 'group-a',
  reminderId = 'group-target',
) {
  const harness = createMutationHarness();
  const context = harness.api.createEntityReminderMutationContext(kind, entityId, reminderId);
  assert.ok(context, `${label} needs a valid reviewed context`);
  mutator(harness.graph);
  assert.equal(harness.api.resolveEntityReminderMutationTarget(context), null, label);
}

function testExactMutationResolution() {
  const harness = createMutationHarness();
  const groupEdit = harness.api.createEntityReminderMutationContext('group', 'group-a', 'group-target');
  const spaceEdit = harness.api.createEntityReminderMutationContext('category', 'space-a', 'space-target');
  const groupAdd = harness.api.createEntityReminderMutationContext('group', 'group-a');
  assert.ok(groupEdit, 'a unique Group reminder must produce an edit context');
  assert.ok(spaceEdit, 'a unique Space reminder must produce an edit context');
  assert.ok(groupAdd, 'a unique Group owner must produce an add context');
  assert.equal(groupEdit.workspaceId, 'workspace-a');
  assert.equal(groupEdit.spaceId, 'space-a');
  assert.equal(groupEdit.groupId, 'group-a');
  assert.equal(groupEdit.reminderId, 'group-target');
  assert.equal(spaceEdit.groupId, null);
  assert.equal(groupAdd.reminderId, null);
  assert.equal(groupAdd.reminderRef, null);
  assert.equal(harness.api.createEntityReminderMutationContext('unknown', 'group-a'), null);
  assert.equal(harness.api.createEntityReminderMutationContext('group', 'group-a', ''), null);

  harness.graph.group.reminders.reverse();
  harness.graph.groupFirst.label = 'Changed neighbor';
  const reordered = harness.api.resolveEntityReminderMutationTarget(groupEdit);
  assert.ok(reordered, 'reorder and unrelated neighbor edits must keep the exact reviewed target');
  assert.equal(reordered.index, 0);
  assert.equal(reordered.reminder, harness.graph.groupTarget);

  harness.graph.group.reminders.push({
    id: 'added-elsewhere',
    at: fixedNow + 300_000,
    notified: false,
    label: 'Elsewhere',
  });
  const addAfterNeighborChange = harness.api.resolveEntityReminderMutationTarget(groupAdd);
  assert.ok(addAfterNeighborChange,
    'an add context must retain exact owner authority across unrelated reminder-list changes');
  assert.equal(addAfterNeighborChange.reminder, null);

  assertMutationResolutionFails(
    graph => { graph.group.reminders.push({ ...graph.groupTarget }); },
    'a duplicated target reminder id must fail closed',
  );
  assertMutationResolutionFails(
    graph => {
      const index = graph.group.reminders.indexOf(graph.groupTarget);
      graph.group.reminders[index] = { ...graph.groupTarget };
    },
    'an indistinguishable target replacement must fail closed',
  );
  assertMutationResolutionFails(
    graph => { graph.groupTarget.at += 60_000; },
    'a concurrently edited target reminder must fail closed',
  );
  assertMutationResolutionFails(
    graph => {
      graph.space.groups = graph.space.groups.filter(group => group !== graph.group);
      graph.otherSpace.groups.push(graph.group);
    },
    'a Group moved after review must fail closed',
  );
  assertMutationResolutionFails(
    graph => {
      const index = graph.space.groups.indexOf(graph.group);
      graph.space.groups[index] = { ...graph.group, reminders: [...graph.group.reminders] };
    },
    'a replaced Group owner must fail closed',
  );
  assertMutationResolutionFails(
    graph => {
      graph.workspace.categories.push({
        ...graph.space,
        groups: [],
        reminders: [],
      });
    },
    'a duplicated Space owner must fail closed',
    'category',
    'space-a',
    'space-target',
  );

  const movedAdd = createMutationHarness();
  const movedAddContext = movedAdd.api.createEntityReminderMutationContext('group', 'group-a');
  movedAdd.graph.space.groups = movedAdd.graph.space.groups.filter(group => group !== movedAdd.graph.group);
  movedAdd.graph.otherSpace.groups.push(movedAdd.graph.group);
  assert.equal(movedAdd.api.resolveEntityReminderMutationTarget(movedAddContext), null,
    'an add must not follow its owner to a different Space');
}

async function testReceiptGatedEntityEdit() {
  const harness = createMutationHarness();
  harness.graph.groupTarget.color = '#0ea5e9';
  harness.graph.groupTarget.imported = { source: 'fixture', keep: true };
  const context = harness.api.createEntityReminderMutationContext('group', 'group-a', 'group-target');
  harness.graph.group.reminders.reverse();
  harness.graph.groupFirst.label = 'Unrelated neighbor edit';

  const nextAt = fixedNow + 600_000;
  const pending = harness.api.commitEntityReminderMutation(context, {
    at: nextAt,
    label: '  Edited review  ',
    recur: { every: 'week', interval: 9, ignored: true },
  }, { fromPicker: true });

  assert.equal(harness.api.isReminderMutationPending(), true,
    'entity edit pending state must publish synchronously');
  assert.deepEqual(plain(harness.graph.group.reminders[0]), {
    id: 'group-target',
    at: nextAt,
    notified: false,
    label: 'Edited review',
    color: '#0ea5e9',
    imported: { source: 'fixture', keep: true },
    recur: { every: 'week', interval: 1 },
  }, 'editing must preserve stable identity and unowned imported fields while normalizing owned fields');
  assert.deepEqual(harness.calls.busy, [{ busy: true, statusKey: 'reminder.saving' }]);
  assert.deepEqual(harness.calls.snapshots, ['reminder.updateHistory']);
  assert.deepEqual(harness.calls.writes, [{ reconcileReminders: true }]);
  assert.deepEqual(harness.calls.events.slice(0, 3), [
    'busy:true',
    'snapshot:reminder.updateHistory',
    'write',
  ]);
  assert.equal(harness.calls.closes, 0, 'picker close must wait for the acknowledged state/alarm receipt');
  assert.equal(harness.calls.renders, 0, 'render must wait for the acknowledged state/alarm receipt');
  assert.equal(harness.calls.toasts.length, 0, 'success must wait for the acknowledged state/alarm receipt');
  assert.equal(await harness.api.commitEntityReminderMutation(context, {
    at: nextAt + 60_000,
  }), false, 'duplicate activation must be rejected while the first receipt owns the foreground');
  assert.equal(harness.calls.snapshots.length, 1);
  assert.equal(harness.calls.writes.length, 1);

  harness.receipt.resolve({
    ok: true,
    revision: 21,
    reminderReconciliation: { ok: true },
  });
  assert.equal(await pending, true);
  assert.equal(harness.api.isReminderMutationPending(), false);
  assert.equal(harness.calls.closes, 1);
  assert.equal(harness.calls.renders, 1);
  assert.deepEqual(harness.calls.toasts, [{
    message: 'reminder.setSuccess',
    options: { undo: 81 },
  }], 'accepted state and alarm receipts must expose the exact Undo action');
  assert.equal(harness.calls.frames.length, 1);
  harness.calls.frames[0]();
  assert.deepEqual(harness.calls.focus, [{ context, reminderId: 'group-target' }],
    'post-receipt focus must retain the reviewed stable reminder identity');
}

async function testSpaceAddAlarmWarningAndUniqueId() {
  const harness = createMutationHarness({
    actionId: 94,
    generatedIds: ['space-target', 'generated-space'],
  });
  const context = harness.api.createEntityReminderMutationContext('category', 'space-a');
  harness.graph.space.reminders.push({
    id: 'added-elsewhere',
    at: fixedNow + 360_000,
    notified: false,
    label: 'Concurrent neighbor',
  });
  const pending = harness.api.commitEntityReminderMutation(context, {
    at: fixedNow + 720_000,
    label: '  Monthly review  ',
    recur: { every: 'month', interval: 3 },
  }, { fromPicker: true });
  assert.equal(harness.api.isReminderMutationPending(), true);
  assert.deepEqual(harness.graph.space.reminders.map(reminder => reminder.id), [
    'space-first',
    'space-target',
    'added-elsewhere',
    'generated-space',
  ], 'add must allocate one fresh ID against the current list, including changes made after review');
  assert.deepEqual(plain(harness.graph.space.reminders.at(-1)), {
    id: 'generated-space',
    at: fixedNow + 720_000,
    notified: false,
    label: 'Monthly review',
    recur: { every: 'month', interval: 1 },
  });
  assert.deepEqual(harness.calls.snapshots, ['reminder.setHistory']);
  assert.deepEqual(harness.calls.writes, [{ reconcileReminders: true }]);

  harness.receipt.resolve({
    ok: true,
    revision: 22,
    reminderReconciliation: { ok: false, failed: [{ operation: 'create' }] },
  });
  assert.equal(await pending, true);
  assert.deepEqual(harness.calls.toasts, [{
    message: 'reminder.scheduleWarning',
    options: { tone: 'warning', duration: 8000, undo: 94 },
  }], 'accepted state with alarm failure must warn without losing exact Undo');
  harness.calls.frames[0]();
  assert.deepEqual(harness.calls.focus, [{ context, reminderId: 'generated-space' }]);
}

async function testCalendarEntityRescheduleAndNoop() {
  const harness = createMutationHarness();
  harness.graph.spaceTarget.color = '#f97316';
  harness.graph.spaceTarget.recur = { every: 'day', interval: 1 };
  harness.graph.spaceTarget.imported = { keep: 'yes' };
  const context = harness.api.createEntityReminderMutationContext('category', 'space-a', 'space-target');
  const nextAt = fixedNow + 900_000;
  const pending = harness.api.commitEntityReminderMutation(context, { at: nextAt });
  assert.deepEqual(plain(harness.graph.space.reminders[1]), {
    id: 'space-target',
    at: nextAt,
    notified: false,
    label: 'Review',
    color: '#f97316',
    recur: { every: 'day', interval: 1 },
    imported: { keep: 'yes' },
  }, 'Calendar reschedule must own only time and notification state');
  assert.equal(harness.calls.busy.length, 0, 'Calendar reschedule must not manufacture picker UI');
  assert.equal(harness.calls.closes, 0);
  assert.deepEqual(harness.calls.interlocks, [true],
    'Calendar reschedule must make the underlying page inert while its receipt is pending');
  const pendingShortcut = eventFor('z', {});
  assert.equal(harness.api.handleReminderGlobalKey(pendingShortcut), true);
  assert.equal(pendingShortcut.defaultPrevented, true,
    'a hidden-picker Calendar receipt must still block global shortcuts');
  assert.equal(pendingShortcut.immediatePropagationStopped, true);
  harness.receipt.resolve({
    ok: true,
    revision: 23,
    reminderReconciliation: { ok: true },
  });
  assert.equal(await pending, true);
  assert.equal(harness.calls.renders, 1);
  assert.deepEqual(harness.calls.interlocks, [true, false],
    'accepted Calendar completion must release the page before exact focus recovery');
  harness.calls.frames[0]();
  assert.deepEqual(harness.calls.focus, [{ context, reminderId: 'space-target' }]);

  const noop = createMutationHarness();
  const noopContext = noop.api.createEntityReminderMutationContext('group', 'group-a', 'group-target');
  assert.equal(await noop.api.commitEntityReminderMutation(noopContext, {
    at: noop.graph.groupTarget.at,
    label: noop.graph.groupTarget.label,
    recur: null,
  }, { fromPicker: true }), true);
  assert.equal(noop.api.isReminderMutationPending(), false);
  assert.equal(noop.calls.closes, 1, 'a reviewed semantic no-op may close without manufacturing a write');
  assert.equal(noop.calls.snapshots.length, 0);
  assert.equal(noop.calls.writes.length, 0);
  assert.equal(noop.calls.renders, 0);
  assert.equal(noop.calls.toasts.length, 0);

  const invalid = createMutationHarness();
  const invalidContext = invalid.api.createEntityReminderMutationContext('group', 'group-a', 'group-target');
  assert.equal(await invalid.api.commitEntityReminderMutation(invalidContext, {
    at: fixedNow - 1,
  }, { fromPicker: true }), false);
  assert.equal(invalid.calls.timeErrors, 1);
  assert.equal(invalid.calls.snapshots.length, 0);
  assert.equal(invalid.calls.writes.length, 0);
  assert.equal(invalid.calls.closes, 0);
}

async function testEntityMutationRecoveryFailures() {
  const stale = createMutationHarness();
  const staleContext = stale.api.createEntityReminderMutationContext('group', 'group-a', 'group-target');
  stale.graph.groupTarget.label = 'Changed elsewhere';
  assert.equal(await stale.api.commitEntityReminderMutation(staleContext, {
    at: fixedNow + 600_000,
  }, { fromPicker: true }), false);
  assert.deepEqual(stale.calls.unavailable, ['reminder.entityChanged']);
  assert.equal(stale.calls.snapshots.length, 0);
  assert.equal(stale.calls.writes.length, 0);

  const recoveryBlocked = createMutationHarness({ recoveryRequired: true });
  const recoveryContext = recoveryBlocked.api.createEntityReminderMutationContext(
    'category',
    'space-a',
    'space-target',
  );
  const beforeRecovery = plain(recoveryBlocked.graph.spaceTarget);
  assert.equal(await recoveryBlocked.api.commitEntityReminderMutation(recoveryContext, {
    at: fixedNow + 600_000,
  }, { fromPicker: true }), false);
  assert.deepEqual(plain(recoveryBlocked.graph.spaceTarget), beforeRecovery);
  assert.deepEqual(recoveryBlocked.calls.unavailable, ['reminder.saveFailed']);
  assert.equal(recoveryBlocked.calls.snapshots.length, 0);
  assert.equal(recoveryBlocked.calls.writes.length, 0);
  assert.equal(recoveryBlocked.calls.recoveries.length, 1);
  assert.equal(recoveryBlocked.calls.recoveries[0].code, 'LOCUS_STATE_RECOVERY_REQUIRED');

  const writeError = Object.assign(new Error('Unknown state receipt'), {
    code: 'LOCUS_STATE_WRITE_UNKNOWN',
  });
  const rejected = createMutationHarness({ writeError });
  const rejectedContext = rejected.api.createEntityReminderMutationContext(
    'group',
    'group-a',
    'group-target',
  );
  assert.equal(await rejected.api.commitEntityReminderMutation(rejectedContext, {
    at: fixedNow + 840_000,
    label: 'Dirty but recoverable',
    recur: null,
  }, { fromPicker: true }), false);
  assert.equal(rejected.graph.group.reminders[1].label, 'Dirty but recoverable',
    'an unknown receipt must retain the one dirty local graph behind recovery');
  assert.deepEqual(rejected.calls.busy, [
    { busy: true, statusKey: 'reminder.saving' },
    { busy: false, statusKey: null },
  ]);
  assert.deepEqual(rejected.calls.unavailable, ['reminder.saveFailed']);
  assert.equal(rejected.calls.closes, 0);
  assert.equal(rejected.calls.renders, 0);
  assert.equal(rejected.calls.frames.length, 0);
  assert.equal(rejected.calls.toasts.length, 0);
  assert.deepEqual(rejected.calls.recoveries, [writeError]);
}

function testHistoryReceiptInterlock() {
  const calls = { pushes: [], flushes: 0 };
  const context = vm.createContext({
    document: { getElementById() { return null; } },
    build() { return 'home'; },
    currentRoute() { return { type: 'home' }; },
    location: { hash: '#calendar' },
    history: {
      pushState(state, title, hash) {
        calls.pushes.push({ state, title, hash });
      },
    },
    isArchivedPageRestorePending() { return false; },
    isSavedPageArchivePending() { return false; },
    isSelectedItemMutationPending() { return false; },
    isSavedTabReturnMutationPending() { return false; },
    isBoardTodoCompletionPending() { return false; },
    isItemDetailMutationPending() { return false; },
    isReminderMutationPending() { return true; },
    isCalendarTaskMutationPending() { return false; },
    isPasteImportPending() { return false; },
    settingsPreferencePendingTransaction() { return null; },
    closePasteOverlay() {},
    flushActiveItemDetailEditor() { calls.flushes += 1; },
  });
  vm.runInContext(
    `${extractFunction('handleLocationChange')}\nhandleLocationChange();`,
    context,
    { filename: 'newtab-entity-reminder-history-extract.js' },
  );
  assert.deepEqual(calls.pushes, [{ state: null, title: '', hash: '#home' }],
    'Back/Forward must restore the reviewed route while an entity reminder mutation awaits its receipt');
  assert.equal(calls.flushes, 0,
    'a pending entity reminder mutation must block before blur or route application can start another mutation');
}

function testPickerOpenFailureRecovery() {
  const calls = { renders: 0, toasts: [], timers: [], focus: [] };
  const context = vm.createContext({
    openEntityReminderPicker() { return false; },
    renderAll() { calls.renders += 1; },
    tr(key) { return key; },
    toast(message, options) { calls.toasts.push({ message, options: plain(options) }); },
    setTimeout(callback) { calls.timers.push(callback); return calls.timers.length; },
    focusEntityReminderOwnerFallback(kind, entityId) { calls.focus.push({ kind, entityId }); return true; },
  });
  vm.runInContext(
    `${extractFunction('openEntityReminderPickerOrReport')}
     globalThis.__opened = openEntityReminderPickerOrReport('group', 'group-a', 'missing-reminder');`,
    context,
    { filename: 'newtab-entity-reminder-open-recovery-extract.js' },
  );
  assert.equal(context.__opened, false);
  assert.equal(calls.renders, 1, 'a stale captured entry must refresh from the current graph');
  assert.deepEqual(calls.toasts, [{
    message: 'reminder.entityUnavailable',
    options: { danger: true },
  }], 'a stale captured entry must explain why its picker did not open');
  assert.equal(calls.timers.length, 1);
  calls.timers[0]();
  assert.deepEqual(calls.focus, [{ kind: 'group', entityId: 'group-a' }],
    'a stale captured entry must restore focus through the current owner fallback');
}

async function testReceiptGatedGroupRemoval() {
  const harness = createRemovalHarness();
  const context = harness.api.createEntityReminderRemovalContext('group', 'group-a', 'group-target');
  harness.graph.group.reminders.reverse();

  const pending = harness.api.commitEntityReminderRemoval(context);
  assert.equal(harness.api.isReminderMutationPending(), true, 'entity pending state must publish synchronously');
  assert.deepEqual(harness.graph.group.reminders.map(reminder => reminder.id), ['group-first']);
  assert.deepEqual(harness.calls.busy, [{ busy: true, statusKey: 'reminder.removing' }]);
  assert.deepEqual(harness.calls.snapshots, ['reminder.removeHistory(Second)']);
  assert.deepEqual(harness.calls.writes, [{ reconcileReminders: true }]);
  assert.deepEqual(harness.calls.events.slice(0, 3), [
    'busy:true',
    'snapshot:reminder.removeHistory(Second)',
    'write',
  ]);
  assert.equal(harness.calls.closes, 0, 'picker close must wait for the state/alarm receipt');
  assert.equal(harness.calls.renders, 0, 'render must wait for the state/alarm receipt');
  assert.equal(harness.calls.toasts.length, 0, 'success must wait for the state/alarm receipt');

  const inside = { _insideReminder: true };
  const pendingEscape = eventFor('Escape', inside);
  assert.equal(harness.api.handleReminderGlobalKey(pendingEscape), true);
  assert.equal(pendingEscape.defaultPrevented, true, 'pending Escape must not close the reviewed picker');
  assert.equal(pendingEscape.immediatePropagationStopped, true);
  const pendingTab = eventFor('Tab', inside);
  assert.equal(harness.api.handleReminderGlobalKey(pendingTab), true);
  assert.equal(pendingTab.defaultPrevented, false, 'pending Tab must remain available to the modal trap');
  const outsideEscape = eventFor('Escape', { _insideReminder: false });
  assert.equal(harness.api.handleReminderGlobalKey(outsideEscape), true);
  assert.equal(outsideEscape.defaultPrevented, true);
  assert.equal(harness.calls.closeFocus, 1, 'outside focus must recover to the guarded picker close control');

  assert.equal(await harness.api.commitEntityReminderRemoval(context), false, 'duplicate activation must be rejected');
  assert.equal(harness.calls.snapshots.length, 1);
  assert.equal(harness.calls.writes.length, 1);

  harness.receipt.resolve({
    ok: true,
    revision: 14,
    reminderReconciliation: { ok: true },
  });
  assert.equal(await pending, true);
  assert.equal(harness.api.isReminderMutationPending(), false);
  assert.equal(harness.calls.closes, 1);
  assert.equal(harness.calls.renders, 1);
  assert.deepEqual(harness.calls.toasts, [{
    message: 'reminder.removeSuccess',
    options: { undo: 73 },
  }], 'successful reconciliation must expose the exact history action for Undo');
  assert.deepEqual(harness.calls.events.slice(-5), [
    'busy:false',
    'close',
    'render',
    'timer',
    'toast:reminder.removeSuccess',
  ]);
  assert.equal(harness.calls.timers.length, 1);
  harness.calls.timers[0]();
  assert.equal(harness.calls.focusFallbacks.length, 1);
  assert.equal(harness.calls.focusFallbacks[0].context, context);
  assert.equal(harness.calls.focusFallbacks[0].removedIndex, 0, 'focus recovery must use the live reordered index');
}

async function testSpaceAlarmWarningAndFailure() {
  const warning = createRemovalHarness({ actionId: 91 });
  const warningContext = warning.api.createEntityReminderRemovalContext('category', 'space-a', 'space-target');
  warning.graph.space.reminders = [warning.graph.spaceTarget];
  const warningCommit = warning.api.commitEntityReminderRemoval(warningContext);
  warning.receipt.resolve({
    ok: true,
    revision: 15,
    reminderReconciliation: { ok: false, failed: [{ operation: 'clear' }] },
  });
  assert.equal(await warningCommit, true);
  assert.equal(Object.hasOwn(warning.graph.space, 'reminders'), false, 'the last Space reminder must remove the empty list');
  assert.deepEqual(warning.calls.toasts, [{
    message: 'reminder.removeScheduleWarning',
    options: { tone: 'warning', duration: 8000, undo: 91 },
  }], 'accepted state plus alarm failure must warn without losing exact Undo');
  assert.equal(warning.calls.closes, 1);
  assert.equal(warning.calls.renders, 1);

  const writeError = Object.assign(new Error('Unknown state receipt'), {
    code: 'LOCUS_STATE_WRITE_UNKNOWN',
  });
  const rejected = createRemovalHarness({
    writeError,
  });
  const rejectedContext = rejected.api.createEntityReminderRemovalContext('group', 'group-a', 'group-target');
  assert.equal(await rejected.api.commitEntityReminderRemoval(rejectedContext), false);
  assert.deepEqual(rejected.graph.group.reminders.map(reminder => reminder.id), ['group-first'],
    'an unknown receipt must retain the dirty local removal behind recovery');
  assert.equal(rejected.api.isReminderMutationPending(), false);
  assert.deepEqual(rejected.calls.busy, [
    { busy: true, statusKey: 'reminder.removing' },
    { busy: false, statusKey: null },
  ]);
  assert.deepEqual(rejected.calls.unavailable, ['reminder.removeFailed']);
  assert.equal(rejected.calls.closes, 0);
  assert.equal(rejected.calls.renders, 0);
  assert.equal(rejected.calls.toasts.length, 0);
  assert.equal(rejected.calls.timers.length, 0);
  assert.deepEqual(rejected.calls.recoveries, [writeError]);

  const knownWriteError = Object.assign(new Error('Storage rejected reminder removal'), {
    code: 'LOCUS_STATE_WRITE_FAILED',
  });
  const knownRejected = createRemovalHarness({
    writeError: knownWriteError,
  });
  const knownContext = knownRejected.api.createEntityReminderRemovalContext('category', 'space-a', 'space-target');
  assert.equal(await knownRejected.api.commitEntityReminderRemoval(knownContext), false);
  assert.equal(knownRejected.calls.writes.length, 1);
  assert.deepEqual(knownRejected.calls.unavailable, ['reminder.removeFailed']);
  assert.equal(knownRejected.calls.closes, 0);
  assert.equal(knownRejected.calls.renders, 0);
  assert.equal(knownRejected.calls.toasts.length, 0,
    'a rejected state write must not claim removal or alarm cleanup success');
  assert.deepEqual(knownRejected.calls.recoveries, [knownWriteError]);

  const recoveryBlocked = createRemovalHarness({ recoveryRequired: true });
  const recoveryContext = recoveryBlocked.api.createEntityReminderRemovalContext(
    'group',
    'group-a',
    'group-target',
  );
  assert.equal(await recoveryBlocked.api.commitEntityReminderRemoval(recoveryContext), false);
  assert.deepEqual(
    recoveryBlocked.graph.group.reminders.map(reminder => reminder.id),
    ['group-first', 'group-target'],
    'pre-existing recovery must block before snapshotting or mutating the reviewed reminder',
  );
  assert.deepEqual(recoveryBlocked.calls.unavailable, ['reminder.removeFailed']);
  assert.equal(recoveryBlocked.calls.snapshots.length, 0);
  assert.equal(recoveryBlocked.calls.writes.length, 0);
  assert.equal(recoveryBlocked.calls.busy.length, 0);
  assert.equal(recoveryBlocked.calls.closes, 0);
  assert.equal(recoveryBlocked.calls.renders, 0);
  assert.equal(recoveryBlocked.calls.toasts.length, 0);
  assert.equal(recoveryBlocked.calls.timers.length, 0);
  assert.equal(recoveryBlocked.calls.recoveries.length, 1);
  assert.equal(recoveryBlocked.calls.recoveries[0].code, 'LOCUS_STATE_RECOVERY_REQUIRED');

  const stale = createRemovalHarness();
  const staleContext = stale.api.createEntityReminderRemovalContext('group', 'group-a', 'group-target');
  stale.graph.groupTarget.label = 'Changed elsewhere';
  assert.equal(await stale.api.commitEntityReminderRemoval(staleContext), false);
  assert.deepEqual(stale.calls.unavailable, ['reminder.entityChanged']);
  assert.equal(stale.calls.snapshots.length, 0);
  assert.equal(stale.calls.writes.length, 0);
  assert.deepEqual(stale.graph.group.reminders.map(reminder => reminder.id), ['group-first', 'group-target']);
}

async function testExistingAlarmIdentityPaths() {
  const group = {
    id: 'group-with-dash',
    name: 'Group',
    reminders: [
      { id: 'first', at: fixedNow + 60_000, notified: false, label: 'First' },
      { id: 'second', at: fixedNow + 120_000, notified: false, label: 'Second' },
    ],
  };
  const category = { id: 'category', name: 'Category', reminders: [] };
  const alarmMap = new Map([
    ['te-greminder-group-with-dash-0', { name: 'te-greminder-group-with-dash-0' }],
    ['te-greminder-group-with-dash-1', { name: 'te-greminder-group-with-dash-1' }],
    ['unrelated', { name: 'unrelated' }],
  ]);
  const calls = {
    snapshots: [],
    persists: 0,
    renders: 0,
    toasts: [],
    migrationOrder: [],
  };
  let idSequence = 0;
  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [fixedNow]));
    }

    static now() {
      return fixedNow;
    }
  }
  const context = vm.createContext({
    Date: FixedDate,
    chrome: {
      alarms: {
        async getAll() { return [...alarmMap.values()].map(alarm => ({ ...alarm })); },
        async clear(name) { return alarmMap.delete(name); },
        async create(name, options) {
          alarmMap.set(name, { name, scheduledTime: options.when });
        },
      },
      runtime: {
        async sendMessage(message) {
          assert.equal(message?.type, 'reconcile-reminders');
          calls.migrationOrder.push('reconcile');
          return { ok: true };
        },
      },
    },
    State: {
      persist() { calls.persists += 1; },
      async persistNow(options) {
        assert.equal(options?.recordMutation, false);
        calls.migrationOrder.push('persist');
      },
      snapshot(label) { calls.snapshots.push(label); },
    },
    entityReminderOwnerTarget(kind, id) {
      if (kind === 'group' && id === group.id) return { entity: group };
      if (kind === 'category' && id === category.id) return { entity: category };
      return null;
    },
    renderBoard() { calls.renders += 1; },
    toast(message) { calls.toasts.push(message); },
    tr(key) { return key; },
    uid() { return `generated-${++idSequence}`; },
  });
  const names = [
    'isStableEntityReminderId',
    'persistReminderIdentityMigration',
    'legacyEntityReminderAlarmName',
    'entityReminderAlarmName',
    'parseEntityReminderAlarmName',
  ];
  vm.runInContext(
    `${extractBetween('const ENTITY_REMINDER_ALARM_PREFIXES = {', 'function legacyEntityReminderAlarmName(')}\n`
      + `${names.map(extractFunction).join('\n\n')}\n`
      + 'globalThis.__api = { persistReminderIdentityMigration, entityReminderAlarmName, parseEntityReminderAlarmName };',
    context,
    { filename: 'newtab-reminder-alarm-identity-extract.js' },
  );
  const api = context.__api;

  assert.equal(api.persistReminderIdentityMigration(12, true), null);
  await api.persistReminderIdentityMigration(11, true);
  assert.deepEqual(calls.migrationOrder, ['persist', 'reconcile'],
    'schema migration must persist before replacing legacy alarms');

  const firstName = api.entityReminderAlarmName('group', group.id, group.reminders[0], 0);
  const secondName = api.entityReminderAlarmName('group', group.id, group.reminders[1], 1);
  assert.equal(firstName, 'te-greminder2-group-with-dash|first');
  assert.equal(secondName, 'te-greminder2-group-with-dash|second');

  const encoded = api.entityReminderAlarmName('category', 'cat-|空', { id: 'rem-|醒' }, 0);
  assert.equal(encoded, 'te-creminder2-cat-%7C%E7%A9%BA|rem-%7C%E9%86%92');
  assert.deepEqual(
    plain(api.parseEntityReminderAlarmName(encoded)),
    { kind: 'category', entId: 'cat-|空', reminderId: 'rem-|醒', legacyIndex: null },
  );
  assert.deepEqual(
    plain(api.parseEntityReminderAlarmName('te-greminder-group-with-dash-7')),
    { kind: 'group', entId: 'group-with-dash', reminderId: null, legacyIndex: 7 },
  );
  assert.deepEqual(calls.snapshots, []);
  assert.equal(calls.persists, 0);
  assert.equal(calls.renders, 0);
}

function testStaticRemovalBoundaryAndLocales() {
  const controller = extractFunction('commitEntityReminderRemoval');
  assert.match(
    controller,
    /State\.isRecoveryRequired\?\.\(\)[\s\S]*setReminderMutationUnavailable\('reminder\.removeFailed'\)[\s\S]*return false;[\s\S]*resolveEntityReminderRemovalTarget/,
    'pre-existing recovery must fail before exact resolution, snapshot, or mutation',
  );
  assert.match(controller, /State\.persistNow\(\{ reconcileReminders: true \}\)/);
  assert.doesNotMatch(controller, /chrome\.|reconcileEntityAlarms|State\.persist\(/,
    'the page controller must not own a second alarm or fire-and-forget write');
  assert.match(extractFunction('closeReminderPicker'), /isReminderMutationPending\(\)[\s\S]*return false/);
  const binding = extractFunction('bindReminderUI');
  assert.match(binding, /receiptCommit[\s\S]*commitReminderClear\(\)[\s\S]*if \(receiptCommit\) void result;/,
    'entity removal must leave close ownership to the async controller');
  assert.match(binding, /addEventListener\('keydown',[\s\S]*isReminderMutationPending\(\)[\s\S]*stopImmediatePropagation\(\)/);
  assert.match(binding, /addEventListener\('click',[\s\S]*isReminderMutationPending\(\)[\s\S]*stopImmediatePropagation\(\)/);
  assert.match(
    extractFunction('commitReminderClear'),
    /c\.removalContext[\s\S]*commitEntityReminderRemoval\(c\.removalContext\)/,
    'the reviewed picker must submit its frozen removal context',
  );
  const mutationController = extractFunction('commitEntityReminderMutation');
  assert.match(
    mutationController,
    /State\.isRecoveryRequired\?\.\(\)[\s\S]*setReminderMutationUnavailable\('reminder\.saveFailed'\)[\s\S]*return false;[\s\S]*resolveEntityReminderMutationTarget/,
    'pre-existing recovery must fail before exact mutation resolution, snapshot, or graph mutation',
  );
  assert.match(mutationController, /State\.persistNow\(\{ reconcileReminders: true \}\)/);
  assert.doesNotMatch(
    mutationController,
    /chrome\.|reconcileEntityAlarms|State\.persist\(|rollbackSnapshot|setTimeout/,
    'the entity mutation controller must not own page alarms, delayed writes, retries, rollback, or delayed release',
  );
  assert.match(
    mutationController,
    /requestAnimationFrame\(\(\) => focusEntityReminderMutationTarget\(context, nextReminder\.id\)\)/,
    'accepted entity mutations must recover exact stable-reminder focus after rendering',
  );
  assert.match(
    mutationController,
    /if \(fromPicker\) setReminderMutationBusy[\s\S]*else setReminderInterlock\(true\)[\s\S]*else setReminderInterlock\(false\)/,
    'non-picker Calendar mutation must own and release the page interlock around its receipt',
  );
  const picker = extractFunction('openEntityReminderPicker');
  assert.match(
    picker,
    /createEntityReminderMutationContext\(kind, entId, reminderId\)[\s\S]*mutationContext/,
    'the picker must retain a frozen add/edit mutation context',
  );
  assert.match(
    extractFunction('commitReminderSet'),
    /c\.mutationContext[\s\S]*commitEntityReminderMutation\(\s*c\.mutationContext/,
    'picker Save must submit the frozen entity mutation context',
  );
  assert.match(
    binding,
    /receiptCommit[\s\S]*reminderCtx\.mutationContext[\s\S]*commitReminderSet[\s\S]*if \(receiptCommit\) void result;/,
    'entity picker Save must leave close ownership to the receipt-gated controller',
  );
  assert.match(
    binding,
    /querySelectorAll\('\.rm-quick button'\)[\s\S]*receiptCommit[\s\S]*reminderCtx\.mutationContext[\s\S]*if \(receiptCommit\) void result;/,
    'entity quick choices must leave close ownership to the receipt-gated controller',
  );
  // The Calendar's reminder controls share one drag binding (2026-11 board).
  assert.match(extractFunction('buildCalDot'), /calBindDrag\(dot, entry\)/,
    'Calendar reminder controls must keep the drag-to-reschedule binding');
  assert.match(
    extractFunction('calBindDrag'),
    /dragstart[\s\S]*createEntityReminderMutationContext\(entry\.source, entry\.refId, entry\.reminderId\)[\s\S]*mutationContext/,
    'Calendar must freeze entity owner/reminder identity when drag begins',
  );
  assert.match(
    extractFunction('calendarMoveMenuItems'),
    /createEntityReminderMutationContext\(entry\.source, entry\.refId, entry\.reminderId\)[\s\S]*mutationContext[\s\S]*calMoveEntry\(moving/,
    'Calendar Move to must freeze entity owner/reminder identity when its menu opens',
  );
  assert.match(
    extractFunction('calRescheduleTo'),
    /entry\.mutationContext[\s\S]*commitEntityReminderMutation\(entry\.mutationContext, \{ at: ts \}, \{ receipt \}\)/,
    'Calendar drop must submit the drag-start mutation context',
  );
  const mutationFocus = extractFunction('focusEntityReminderMutationTarget');
  assert.match(
    mutationFocus,
    /data-entity-reminder-id[\s\S]*data-reminder-action="edit"/,
    'Group recovery focus must address the exact stable reminder row',
  );
  assert.match(
    mutationFocus,
    /data-reminder-source[\s\S]*data-reminder-owner-id[\s\S]*data-reminder-id/,
    'Calendar recovery focus must address the exact stable reminder dot',
  );
  assert.doesNotMatch(source, /async function setEntityReminder(?:Time)?\(/,
    'legacy page-owned entity reminder mutation entry points must be removed');
  assert.doesNotMatch(source, /async function reconcileEntityAlarms\(/,
    'the new-tab page must no longer own entity alarm reconciliation');
  const handleLocation = extractFunction('handleLocationChange');
  assert.match(
    handleLocation,
    /foregroundBlocksNavigation[\s\S]*isItemDetailMutationPending\(\)[\s\S]*isReminderMutationPending\(\)/,
    'browser Back/Forward must retain the stable route while an entity removal receipt owns the foreground',
  );
  assert.ok(
    handleLocation.indexOf('flushActiveItemDetailEditor()')
      < handleLocation.lastIndexOf('isReminderMutationPending()'),
    'browser Back/Forward must recheck entity removal after a detail blur can start work',
  );
  const routerStart = source.indexOf('const Router = (() => {');
  const routerEnd = source.indexOf('\n})();', routerStart);
  const router = source.slice(routerStart, routerEnd);
  const navigateStart = router.indexOf('navigate(route');
  const navigateEnd = router.indexOf('return true;', navigateStart);
  const navigateSource = router.slice(navigateStart, navigateEnd);
  const detailFlush = navigateSource.indexOf('flushActiveItemDetailEditor()');
  const firstReminderGuard = navigateSource.indexOf('isReminderMutationPending()');
  const secondReminderGuard = navigateSource.indexOf('isReminderMutationPending()', firstReminderGuard + 1);
  assert.ok(
    navigateStart >= 0
      && detailFlush > firstReminderGuard
      && secondReminderGuard > detailFlush,
    'programmatic route changes must reject and recheck the entity removal receipt',
  );
  const groupRows = extractFunction('renderGroupReminders');
  assert.match(groupRows, /row\.dataset\.entityReminderId = r\.id/,
    'Group reminder rows must expose their stable reminder identity');
  assert.match(groupRows, /edit\.onclick = \(\) => openEntityReminderPickerOrReport\('group', g\.id, r\.id,/,
    'Group Edit must open by stable reminder id');
  assert.match(
    groupRows,
    /del\.onclick = \(\) => openEntityReminderPickerOrReport\('group', g\.id, r\.id,[\s\S]*initialFocus: 'remove'/,
    'Group Remove must reopen the reviewed stable reminder and focus its destructive control',
  );

  const i18n = readI18n();
  for (const key of [
    'reminder.removeNamed',
    'reminder.removing',
    'reminder.entityChanged',
    'reminder.entityUnavailable',
    'reminder.saving',
    'reminder.saveFailed',
    'reminder.setSuccess',
    'reminder.scheduleWarning',
    'reminder.setHistory',
    'reminder.updateHistory',
    'reminder.removeFailed',
    'reminder.removeSuccess',
    'reminder.removeScheduleWarning',
    'reminder.removeHistory',
  ]) {
    assert.ok(i18n.en[key]?.trim(), `missing English ${key}`);
    assert.ok(i18n['zh-TW'][key]?.trim(), `missing zh-TW ${key}`);
  }
  assert.notEqual(i18n.en['reminder.removeSuccess'], i18n['zh-TW']['reminder.removeSuccess']);
}

(async () => {
  testExactRemovalResolution();
  testExactMutationResolution();
  testHistoryReceiptInterlock();
  testPickerOpenFailureRecovery();
  await testReceiptGatedEntityEdit();
  await testSpaceAddAlarmWarningAndUniqueId();
  await testCalendarEntityRescheduleAndNoop();
  await testEntityMutationRecoveryFailures();
  await testReceiptGatedGroupRemoval();
  await testSpaceAlarmWarningAndFailure();
  await testExistingAlarmIdentityPaths();
  testStaticRemovalBoundaryAndLocales();
  console.log('Reminder identity contracts passed: exact Group/Space add/edit/reschedule/removal, stable reorder, receipt/alarm ordering, recovery, exact focus/history interlocks, stale-entry feedback, localization, and alarm compatibility.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
