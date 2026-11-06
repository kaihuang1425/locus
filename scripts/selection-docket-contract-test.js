'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'newtab.js'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'newtab.css'), 'utf8').replace(/\r\n/g, '\n');

function extractFunction(name) {
  const expression = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = expression.exec(source);
  assert.ok(match, `${name} must exist in production`);
  const start = match.index;
  const parametersStart = source.indexOf('(', start);
  let parameterDepth = 0;
  let parametersEnd = -1;
  for (let index = parametersStart; index < source.length; index += 1) {
    if (source[index] === '(') parameterDepth += 1;
    else if (source[index] === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) { parametersEnd = index; break; }
    }
  }
  const bodyStart = source.indexOf('{', parametersEnd);
  assert.ok(bodyStart > start, `${name} must have a body`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
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
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`${name} must have a balanced body`);
}

function readI18n() {
  const marker = 'const I18N = ';
  const start = source.indexOf(marker);
  const trStart = source.indexOf('\nfunction tr(', start);
  const close = source.lastIndexOf('};', trStart);
  assert.ok(start >= 0 && trStart > start && close > start, 'I18N must remain extractable');
  return vm.runInNewContext(`(${source.slice(start + marker.length, close + 1)})`, {});
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function makeState() {
  const first = { id: 'item-a', type: 'tab', title: 'Alpha', url: 'https://alpha.test/', extra: { keep: true } };
  const second = { id: 'item-b', type: 'note', html: '<p>Beta</p>', importedColor: '#713f12' };
  const neighbor = { id: 'item-c', type: 'todo', text: 'Gamma', done: false };
  const nested = { id: 'item-nested', type: 'tab', title: 'Nested', url: 'https://nested.test/' };
  const selectedStack = { id: 'stack-selected', type: 'stack', name: 'Selected stack', items: [nested] };
  const destinationStack = { id: 'stack-destination', type: 'stack', name: 'Deep shelf', items: [] };
  const sourceGroup = { id: 'group-source', name: 'Inbox', items: [first, second, neighbor, selectedStack] };
  const destinationGroup = { id: 'group-destination', name: 'Reading', items: [destinationStack] };
  const space = { id: 'space-a', name: 'Sources', groups: [sourceGroup, destinationGroup] };
  const workspace = { id: 'workspace-a', name: 'Research', activeCatId: space.id, categories: [space] };
  const crossGroup = { id: 'group-cross', name: 'Later', items: [] };
  const crossSpace = { id: 'space-cross', name: 'Personal', groups: [crossGroup] };
  const crossWorkspace = { id: 'workspace-cross', name: 'Life', activeCatId: crossSpace.id, categories: [crossSpace] };
  return {
    activeWsId: workspace.id,
    workspaces: [workspace, crossWorkspace],
    archive: [],
    settings: { language: 'en' },
    refs: {
      first, second, neighbor, nested, selectedStack, destinationStack,
      sourceGroup, destinationGroup, crossGroup, space, workspace,
    },
  };
}

const i18n = readI18n();

function buildHarness({ state = makeState(), persist = null, locale = 'en' } = {}) {
  const receipt = persist || deferred();
  const selectedItemIds = new Set();
  const calls = {
    snapshots: [], persists: 0, clears: 0, boardRenders: 0, archiveRenders: 0,
    toasts: [], busy: [], unavailable: 0, recoveries: 0, focus: [], events: [],
  };
  let recoveryRequired = false;
  const dictionary = i18n[locale] || i18n.en;
  const tr = (key, vars = {}) => String(dictionary[key] || i18n.en[key] || key)
    .replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
  const sandbox = {
    State: {
      get: () => state,
      snapshot(label) { calls.snapshots.push(label); calls.events.push('snapshot'); return 71; },
      persistNow() { calls.persists += 1; calls.events.push('persist'); return receipt.promise; },
      isRecoveryRequired: () => recoveryRequired,
      requireRecovery() { recoveryRequired = true; },
    },
    selectedItemIds,
    selectedItemMutationPending: null,
    tr,
    setSelectedItemMutationBusy(kind, opener, busy) {
      calls.busy.push([kind, busy]);
      calls.events.push(busy ? `busy:${kind}` : `ready:${kind}`);
      return true;
    },
    reportSelectedItemMutationUnavailable() { calls.unavailable += 1; calls.events.push('unavailable'); return false; },
    clearItemSelection() { selectedItemIds.clear(); calls.clears += 1; calls.boardRenders += 1; calls.events.push('clear'); return true; },
    renderBoard() { calls.boardRenders += 1; calls.events.push('render-board'); },
    renderArchiveList() { calls.archiveRenders += 1; calls.events.push('render-archive'); },
    requestAnimationFrame(callback) { callback(); },
    focusSelectedItemMutationTarget(itemId, groupId) { calls.focus.push([itemId || null, groupId || null]); return true; },
    toast(message, options = {}) { calls.toasts.push({ message, options }); calls.events.push('toast'); },
    showStateRecoveryRequired() { calls.recoveries += 1; },
    openCaptureDestinationReceipt() { calls.events.push('open-destination'); return true; },
  };
  const names = [
    'itemDetailValueFingerprint',
    'identityItemTargets',
    'collectItemListCaptureTargets',
    'resolveItemListCaptureTarget',
    'createCaptureDestinationReceiptContext',
    'resolveCaptureDestinationReceiptTarget',
    'homeTrailGroupName',
    'homeTrailPathParts',
    'homeTrailPathText',
    'isSelectedItemMutationPending',
    'selectedItemSetMatches',
    'createSelectedItemDestinationContext',
    'createSelectedItemMutationContext',
    'resolveSelectedItemMutationTargets',
    'selectedItemMoveOptions',
    'selectedItemMutationBlocked',
    'selectedItemArchiveFocusPlan',
    'removeSelectedItemTargets',
    'commitSelectedItemArchive',
    'selectedItemMoveDestinationTarget',
    'commitSelectedItemMove',
  ];
  const context = vm.createContext(sandbox);
  vm.runInContext(names.map(extractFunction).join('\n\n'), context, { filename: 'selection-docket-production.js' });
  return {
    context,
    calls,
    receipt,
    selectedItemIds,
    get state() { return state; },
    adopt(next) { state = next; },
    setRecovery(value) { recoveryRequired = !!value; },
  };
}

async function testArchiveWaitsForReceipt() {
  const harness = buildHarness();
  harness.selectedItemIds.add('item-a');
  harness.selectedItemIds.add('item-b');
  const review = harness.context.createSelectedItemMutationContext([...harness.selectedItemIds], { selectionOwned: true });
  assert.ok(review, 'an unchanged selection must create an exact review');
  const pending = harness.context.commitSelectedItemArchive(review, null, 1_900_000_000_000);
  assert.equal(harness.state.archive.length, 2, 'the reviewed records may mutate in memory before acknowledgement');
  assert.equal(harness.calls.persists, 1, 'Archive must start exactly one acknowledged write');
  assert.equal(harness.calls.clears, 0, 'Archive must retain selection while the receipt is pending');
  assert.equal(harness.calls.boardRenders, 0, 'Archive must not render pending graph state');
  assert.equal(harness.calls.toasts.length, 0, 'Archive must not announce pending graph state');
  assert.equal(await harness.context.commitSelectedItemArchive(review), false, 'a duplicate pending Archive must fail closed');
  assert.equal(harness.calls.persists, 1, 'a duplicate activation must not start another write');
  harness.receipt.resolve({ ok: true, revision: 2 });
  assert.equal(await pending, true);
  assert.equal(harness.calls.clears, 1, 'accepted Archive must clear the owned selection once');
  assert.equal(harness.calls.archiveRenders, 1, 'accepted Archive must refresh recovery state once');
  assert.deepEqual(harness.state.archive.map(entry => entry.data.id), ['item-a', 'item-b'],
    'Archive must retain document order and full record objects');
  assert.equal(harness.calls.toasts[0].options.undo, 71, 'success must bind Undo to the exact snapshot');
  assert.ok(harness.calls.events.indexOf('toast') > harness.calls.events.indexOf('clear'),
    'success feedback must follow acknowledged rendering');
}

async function testArchiveFailuresStayBehindRecovery() {
  const rejected = deferred();
  const harness = buildHarness({ persist: rejected });
  harness.selectedItemIds.add('item-a');
  const review = harness.context.createSelectedItemMutationContext(['item-a'], { selectionOwned: true });
  const pending = harness.context.commitSelectedItemArchive(review, null, 1_900_000_000_000);
  harness.setRecovery(true);
  rejected.reject(Object.assign(new Error('receipt unknown'), { code: 'LOCUS_STATE_UNKNOWN_ACK' }));
  assert.equal(await pending, false);
  assert.equal(harness.selectedItemIds.has('item-a'), true, 'rejected Archive must retain selection for recovery');
  assert.equal(harness.calls.clears, 0);
  assert.equal(harness.calls.boardRenders, 0);
  assert.equal(harness.calls.toasts.length, 0, 'rejected Archive must not announce success');
  assert.equal(harness.calls.recoveries, 1, 'rejected Archive must keep the recovery surface authoritative');

  const stale = buildHarness();
  stale.selectedItemIds.add('item-a');
  const staleReview = stale.context.createSelectedItemMutationContext(['item-a'], { selectionOwned: true });
  stale.state.refs.sourceGroup.items[0] = { ...stale.state.refs.first };
  assert.equal(await stale.context.commitSelectedItemArchive(staleReview), false);
  assert.equal(stale.calls.snapshots.length, 0, 'a same-ID replacement must fail before snapshot');
  assert.equal(stale.calls.persists, 0, 'a same-ID replacement must fail before persistence');
  assert.equal(stale.calls.unavailable, 1);
}

function testSelectionContextRejectsAmbiguityAndDrift() {
  const duplicate = buildHarness();
  duplicate.state.refs.destinationGroup.items.push({ ...duplicate.state.refs.first });
  assert.equal(duplicate.context.createSelectedItemMutationContext(['item-a']), null,
    'duplicate imported item IDs must fail closed');

  const nested = buildHarness();
  assert.equal(nested.context.createSelectedItemMutationContext(['stack-selected', 'item-nested']), null,
    'an ancestor and its descendant must not become two mutation targets');

  const changedSelection = buildHarness();
  changedSelection.selectedItemIds.add('item-a');
  const review = changedSelection.context.createSelectedItemMutationContext(['item-a'], { selectionOwned: true });
  changedSelection.selectedItemIds.clear();
  changedSelection.selectedItemIds.add('item-b');
  assert.equal(changedSelection.context.resolveSelectedItemMutationTargets(review), null,
    'a toolbar review must remain owned by the exact current selection');

  const moved = buildHarness();
  const movedReview = moved.context.createSelectedItemMutationContext(['item-a']);
  moved.state.refs.sourceGroup.items.splice(0, 1);
  moved.state.refs.destinationGroup.items.push(moved.state.refs.first);
  assert.equal(moved.context.resolveSelectedItemMutationTargets(movedReview), null,
    'a record moved after review must not borrow its new parent');

  const adopted = buildHarness();
  const adoptedReview = adopted.context.createSelectedItemMutationContext(['item-a']);
  adopted.adopt(JSON.parse(JSON.stringify(adopted.state)));
  assert.equal(adopted.context.resolveSelectedItemMutationTargets(adoptedReview), null,
    'a clean authoritative graph adoption must invalidate detached references');
}

async function testMoveWaitsForReceiptAndNamesDestination() {
  const harness = buildHarness();
  harness.selectedItemIds.add('item-a');
  harness.selectedItemIds.add('item-b');
  const review = harness.context.createSelectedItemMutationContext([...harness.selectedItemIds], { selectionOwned: true });
  const options = harness.context.selectedItemMoveOptions(review);
  assert.ok(options.some(option => option.destinationContext.listRef === harness.state.refs.crossGroup.items),
    'Move must preserve cross-Workspace destinations');
  assert.ok(!options.some(option => option.destinationContext.listRef === harness.state.refs.sourceGroup.items),
    'Move must omit a direct-parent no-op');
  const destination = options.find(option => option.destinationContext.listRef === harness.state.refs.destinationStack.items);
  assert.ok(destination, 'a safe Stack destination must remain available');

  const pending = harness.context.commitSelectedItemMove(review, destination.destinationContext);
  assert.deepEqual(harness.state.refs.destinationStack.items.map(item => item.id), ['item-a', 'item-b'],
    'Move must retain selected document order');
  assert.equal(harness.calls.persists, 1);
  assert.equal(harness.calls.clears, 0);
  assert.equal(harness.calls.toasts.length, 0);
  harness.receipt.resolve({ ok: true, revision: 2 });
  assert.equal(await pending, true);
  assert.equal(harness.calls.clears, 1);
  const success = harness.calls.toasts[0];
  assert.match(success.message, /Research.*Sources.*Reading.*Deep shelf/,
    'accepted Move must name the exact destination path');
  assert.equal(success.options.undo, 71);
  assert.equal(success.options.actionLabel, i18n.en['capture.openDestination']);
  success.options.action();
  assert.ok(harness.calls.events.includes('open-destination'), 'the success receipt must reopen its exact destination');
}

async function testMoveRejectsDestinationDrift() {
  const harness = buildHarness();
  harness.selectedItemIds.add('item-a');
  const review = harness.context.createSelectedItemMutationContext(['item-a'], { selectionOwned: true });
  const destination = harness.context.selectedItemMoveOptions(review)
    .find(option => option.destinationContext.listRef === harness.state.refs.destinationGroup.items);
  harness.state.refs.destinationGroup.name = 'Renamed after review';
  assert.equal(await harness.context.commitSelectedItemMove(review, destination.destinationContext), false);
  assert.equal(harness.calls.snapshots.length, 0, 'a renamed destination must fail before snapshot');
  assert.equal(harness.calls.persists, 0);
  assert.equal(harness.state.refs.sourceGroup.items.includes(harness.state.refs.first), true);

  const selectedStack = buildHarness();
  const stackReview = selectedStack.context.createSelectedItemMutationContext(['stack-selected']);
  const stackOptions = selectedStack.context.selectedItemMoveOptions(stackReview);
  assert.ok(!stackOptions.some(option => option.destinationContext.listRef === selectedStack.state.refs.selectedStack.items),
    'a selected Stack and its descendants must never appear as destinations');
}

function testDocketPresentationAndLocalization() {
  const render = extractFunction('renderItemSelToolbar');
  assert.match(render, /setAttribute\('role',\s*'toolbar'\)/);
  assert.match(render, /setAttribute\('aria-label',\s*tr\('selection\.toolbarLabel'\)\)/);
  assert.match(render, /class="isl-summary"[^>]*aria-live="polite"/);
  assert.match(render, /class="isl-actions"/);
  assert.match(render, /button type="button" data-act="open"/);
  assert.doesNotMatch(render, /isl-sep/);

  const route = source.slice(source.indexOf('const Router = (() => {'), source.indexOf('\n})();', source.indexOf('const Router = (() => {')));
  assert.ok((route.match(/isSelectedItemMutationPending\(\)/g) || []).length >= 4,
    'Back, Forward, and direct routes must stay stable while the receipt is pending');
  const globalKeys = source.slice(source.indexOf('// Global keys'), source.indexOf('bindRtToolbar();'));
  assert.match(globalKeys, /if \(isSelectedItemMutationPending\(\)\)[\s\S]*?stopImmediatePropagation/,
    'pending selection writes must own keyboard input, including Escape');
  assert.match(extractFunction('toggleItemSelect'), /isSelectedItemMutationPending\(\)/,
    'pointer selection must not cross a pending receipt');
  assert.match(extractFunction('clearItemSelection'), /isSelectedItemMutationPending\(\)/,
    'Clear and Escape must not discard a pending receipt owner');
  assert.match(extractFunction('bindBoardArrowNav'),
    /createSelectedItemMutationContext\(ids,[\s\S]*?openMoveTargetPicker\(review/,
    'the Board M shortcut must open Move through the exact selection review');
  assert.match(extractFunction('runBatchAction'),
    /createSelectedItemMutationContext\(\[\.\.\.selectedItemIds\][\s\S]*?commitSelectedItemArchive\(review[\s\S]*?openMoveTargetPicker\(review/,
    'toolbar Archive and Move must share the exact current-selection review');
  assert.match(extractFunction('setSelectedItemMutationInterlock'),
    /setElementInertOwner\(sibling, 'selected-item-mutation', true\)[\s\S]*?setElementInertOwner\(element, 'selected-item-mutation', false\)/,
    'the pending action must own and later release its exact ancestor-sibling path');
  assert.match(extractFunction('setSelectedItemMutationBusy'),
    /focus[\s\S]*?setSelectedItemMutationInterlock\(opener, true\)[\s\S]*?aria-busy[\s\S]*?aria-disabled/,
    'the originating action and docket must expose a truthful pending state');

  const archiveCommit = extractFunction('commitSelectedItemArchive');
  const moveCommit = extractFunction('commitSelectedItemMove');
  assert.match(`${archiveCommit}\n${moveCommit}`, /State\.persistNow\(\)/);
  assert.doesNotMatch(`${archiveCommit}\n${moveCommit}`, /State\.persist\(\)/,
    'selection mutations must not use delayed fire-and-forget persistence');
  assert.match(css, /#item-sel-toolbar\s*\{[^}]*border-top:\s*3px solid var\(--index-locator/s);
  assert.doesNotMatch(css, /#item-sel-toolbar\s*\{[^}]*backdrop-filter/s,
    'the selection docket must not retain prototype glass');
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?#item-sel-toolbar[\s\S]*?grid-template-columns:\s*repeat\(2/s);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?#item-sel-toolbar[\s\S]*?Highlight/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#item-sel-toolbar/s);

  const keys = [
    'selection.toolbarLabel', 'selection.changed', 'selection.archiveHistoryOne',
    'selection.archiveHistoryMany', 'selection.archivedOne', 'selection.archivedMany',
    'selection.movePickerOne', 'selection.movePickerMany', 'selection.moveHistoryOne',
    'selection.moveHistoryMany', 'selection.movedToOne', 'selection.movedToMany',
    'selection.noMoveDestination', 'selection.moveDestinationChanged',
  ];
  for (const locale of ['en', 'zh-TW']) {
    for (const key of keys) assert.ok(String(i18n[locale][key] || '').trim(), `${locale} must define ${key}`);
  }
  assert.equal(i18n['zh-TW']['selection.toolbarLabel'], '所選項目的操作');
  assert.equal(i18n['zh-TW']['selection.changed'], '所選項目已變更。請重新確認後再試一次。');
}

async function main() {
  await testArchiveWaitsForReceipt();
  await testArchiveFailuresStayBehindRecovery();
  testSelectionContextRejectsAmbiguityAndDrift();
  await testMoveWaitsForReceiptAndNamesDestination();
  await testMoveRejectsDestinationDrift();
  testDocketPresentationAndLocalization();
  console.log('Selection docket contracts passed: 6 cases');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
