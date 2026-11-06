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

const controllerSource = extractBetween(
  'let organizationDeleteCtx = null;',
  '\n// CRUD',
);

for (const id of [
  'organization-delete-overlay',
  'organization-delete-title',
  'organization-delete-message',
  'organization-delete-cancel',
  'organization-delete-confirm',
]) {
  const matches = html.match(new RegExp(`\\bid=["']${id}["']`, 'g')) || [];
  assert.equal(matches.length, 1, `Organization confirmation id must occur exactly once: ${id}`);
}
assert.match(html, /id="organization-delete-overlay"[^>]*role="alertdialog"[^>]*aria-modal="true"[^>]*aria-labelledby="organization-delete-title"[^>]*aria-describedby="organization-delete-message"/, 'Organization deletion must expose one labelled alert dialog');
assert.match(html, /id="organization-delete-cancel"[^>]*data-i18n="organization\.cancel"/, 'The safe action must have a localized fallback');
assert.match(html, /id="organization-delete-confirm"[^>]*data-i18n="organization\.workspace\.delete"/, 'The destructive action must have a localized fallback');
assert.match(css, /#modal-overlay,[^\n]*#organization-delete-overlay\s*\{/, 'Organization confirmation must reuse the modal surface');
assert.match(css, /#organization-delete-overlay\.hidden\s*\{/, 'Organization confirmation must have an explicit hidden state');
assert.match(css, /\.destructive-confirm-panel,\s*\.organization-name-panel\s*\{[^}]*calc\(100vw - 32px\)/s, 'The shared destructive dialog rule must fit narrow viewports');
assert.match(css, /\.destructive-confirm-button\s*\{[^}]*var\(--red\)/s, 'The destructive action must use the shared destructive token');
assert.equal(controllerSource.includes('confirm('), false, 'Organization removal must not use a native confirmation');
assert.equal(source.includes('function deleteGroup('), false, 'Group removal must not keep a duplicate Delete alias');
assert.equal(source.includes('deleteGroup('), false, 'Every group removal path must remain Archive-only');
assert.equal(html.includes('id="tog-confirm"'), false, 'The obsolete group-delete confirmation toggle must leave Settings');
assert.equal(source.includes("'settings.confirmDelete':"), false, 'Obsolete group-delete copy must leave both locales');
assert.match(source, /animate:true, confirmDelete:true, sidebarCollapsed:false/, 'The stored compatibility field must remain readable without changing the schema');
// 2026-11: the Home Space register (one entry point) gave way to the Today board.
assert.equal((source.match(/openOrganizationDelete\(/g) || []).length, 5, 'Four visible entry points plus the controller must share one removal path');
assert.equal((source.match(/\bstate\.workspaces\s*=\s*state\.workspaces\.filter\(/g) || []).length, 1, 'Workspace removal must mutate state only inside the shared controller');
assert.equal((source.match(/\binfo\.ws\.categories\s*=\s*info\.ws\.categories\.filter\(/g) || []).length, 1, 'Space removal must mutate state only inside the shared controller');
assert.match(controllerSource, /function organizationDeleteOccupancy\(entity\)[\s\S]*occupancy\.groups[\s\S]*occupancy\.items[\s\S]*occupancy\.reminders/, 'The guard must inspect groups, recursively stored items, and reminders');
assert.match(controllerSource, /blocked: occupancy\.groups > 0 \|\| occupancy\.items > 0 \|\| occupancy\.reminders > 0/, 'Any recoverable organization content must block structural deletion');
assert.match(controllerSource, /confirmButton\.hidden = blocked/, 'A populated organization must not expose a destructive action');
assert.match(controllerSource, /for \(const child of document\.body\.children\)[\s\S]*child === overlay \|\| child === recovery[\s\S]*setElementInertOwner\(child, 'organization', enabled\)/, 'The dialog must inert every background root while leaving itself and fail-closed recovery operable');
assert.match(source, /const organizationDeleteOverlay = document\.getElementById\('organization-delete-overlay'\);[\s\S]{0,260}closeOrganizationDeleteDialog\(\);[\s\S]{0,40}return;/, 'Global Escape must retain a top-layer organization-dialog fallback');
assert.match(source, /_escBlockers = \[[^\]]*'organization-delete-overlay'/, 'The dialog must join the last-opened-first-closed blocker stack');
assert.match(source, /bindTrashDeleteDialog\(\);\s*bindOrganizationDeleteDialog\(\);/, 'The production initializer must bind the dialog');
for (const key of [
  'organization.cancel',
  'organization.close',
  'organization.deleting',
  'organization.workspace.confirmTitle',
  'organization.workspace.confirmEmpty',
  'organization.workspace.blockedTitle',
  'organization.workspace.blockedBody',
  'organization.workspace.delete',
  'organization.workspace.deleteHistory',
  'organization.workspace.deleted',
  'organization.space.confirmTitle',
  'organization.space.confirmEmpty',
  'organization.space.blockedTitle',
  'organization.space.blockedBody',
  'organization.space.delete',
  'organization.space.deleteHistory',
  'organization.space.deleted',
  'history.undid',
  'history.redid',
  'history.undoFailed',
  'history.redoFailed',
]) {
  assert.equal(source.split(`'${key}':`).length - 1, 2, `${key} must exist in English and zh-TW`);
}
assert.ok(source.includes("'organization.workspace.confirmEmpty': '“{name}” has no groups, saved items, or reminders. The workspace and its Space structure will be removed from this browser profile. Other workspaces won’t change. After deleting, choose Undo on this page before reloading or closing Locus.'"), 'English empty-workspace copy must state prerequisites, scope, retained data, and the bounded recovery instruction');
assert.ok(source.includes("'organization.space.blockedBody': '請先封存或移動所有群組，再移除此空間的提醒。這次沒有刪除任何內容。'"), 'zh-TW populated-Space copy must name the recovery step and confirm no deletion');
assert.match(source, /State\.snapshot\(tr\(`organization\.\$\{dialogCtx\.kind\}\.deleteHistory`/, 'Undo history labels must localize the exact deleted organization');
// The result may carry presentation options (it morphs the receipt that
// offered Undo in place); the localized message and the order are the contract.
assert.match(source, /async function performUndo[\s\S]*?if \(label\) \{[\s\S]*?renderAll\(\);[\s\S]*?toast\(tr\('history\.undid', \{ action: label \}\)(?:, \{[^}\n]*\})?\);[\s\S]*?reconcileRemindersAfterHistoryChange\(\);/, 'The resulting Undo toast must preserve the active locale before post-receipt reminder reconciliation');

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

function makeState() {
  return {
    activeWsId: 'ws-a',
    workspaces: [
      {
        id: 'ws-a', name: 'Research', activeCatId: 'cat-a', categories: [
          {
            id: 'cat-a', name: 'Reading', reminders: [{ id: 'cat-reminder', at: 1 }], groups: [{
              id: 'group-a', name: 'Inbox', reminders: [{ id: 'group-reminder', at: 2 }], items: [
                { id: 'tab-a', type: 'tab', title: 'One' },
                { id: 'stack-a', type: 'stack', name: 'Stack', items: [
                  { id: 'note-a', type: 'note', text: 'Two' },
                  { id: 'stack-b', type: 'stack', name: 'Nested', items: [
                    { id: 'todo-a', type: 'todo', text: 'Three' },
                  ] },
                ] },
              ],
            }],
          },
          { id: 'cat-b', name: 'Later', groups: [] },
        ],
      },
      {
        id: 'ws-b', name: 'Personal', activeCatId: 'cat-c', categories: [
          { id: 'cat-c', name: 'Home', groups: [] },
        ],
      },
    ],
  };
}

function emptyWorkspace(state, workspaceId) {
  const workspace = state.workspaces.find(candidate => candidate.id === workspaceId);
  workspace.categories.forEach(category => {
    category.groups = [];
    delete category.reminders;
  });
  return workspace;
}

function emptySpace(state, categoryId) {
  for (const workspace of state.workspaces) {
    const category = workspace.categories.find(candidate => candidate.id === categoryId);
    if (!category) continue;
    category.groups = [];
    delete category.reminders;
    return category;
  }
  return null;
}

function buildHarness({ persistNow = async () => undefined } = {}) {
  const calls = {
    locks: 0,
    unlocks: 0,
    persists: 0,
    snapshots: [],
    renders: 0,
    grids: 0,
    traps: 0,
    recovery: 0,
    toasts: [],
    interlocks: [],
  };
  const listeners = new Map();
  const elements = new Map();
  const document = {
    activeElement: null,
    body: { children: [] },
    getElementById(id) { return elements.get(id) || null; },
    querySelector(selector) {
      if (selector === '#wsg-close') return elements.get('wsg-close') || null;
      if (selector === '#ws-menu-btn') return elements.get('ws-menu-btn') || null;
      if (selector === '.cat-tab.active') return elements.get('active-cat-tab') || null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.space-item') return [elements.get('active-space-item')].filter(Boolean);
      return [];
    },
  };

  function makeElement(id, classes = []) {
    const element = {
      id,
      classList: new ClassList(...classes),
      attributes: new Map(),
      dataset: {},
      disabled: false,
      hidden: false,
      isConnected: true,
      textContent: '',
      onclick: null,
      setAttribute(name, value) { this.attributes.set(name, String(value)); },
      getAttribute(name) { return this.attributes.get(name); },
      focus() { if (this.isConnected !== false) document.activeElement = this; },
      addEventListener(type, listener) { listeners.set(`${id}:${type}`, listener); },
    };
    elements.set(id, element);
    return element;
  }

  const opener = makeElement('delete-opener');
  const menuItem = makeElement('context-menu-item');
  const overlay = makeElement('organization-delete-overlay', ['hidden']);
  const recoveryOverlay = makeElement('state-recovery-overlay', ['hidden']);
  const gridOverlay = makeElement('ws-grid-overlay', ['hidden']);
  const app = makeElement('app');
  const landing = makeElement('landing-layer');
  const workspaceList = makeElement('ws-list');
  document.body.children = [app, landing, gridOverlay, workspaceList, overlay, recoveryOverlay];
  makeElement('organization-delete-title');
  makeElement('organization-delete-message');
  makeElement('organization-delete-cancel');
  makeElement('organization-delete-confirm');
  const gridClose = makeElement('wsg-close');
  const workspaceMenu = makeElement('ws-menu-btn');
  const activeCategoryTab = makeElement('active-cat-tab');
  const activeSpaceItem = makeElement('active-space-item');
  activeSpaceItem.dataset.catId = 'cat-b';
  makeElement('add-ws-btn');
  makeElement('add-cat-btn');
  document.activeElement = menuItem;

  const state = makeState();
  const initialSecondWorkspace = JSON.parse(JSON.stringify(state.workspaces[1]));
  const openers = new WeakMap();
  const translations = {
    'organization.cancel': 'Cancel',
    'organization.close': 'Close',
    'organization.deleting': 'Deleting…',
    'organization.workspace.confirmTitle': 'Delete empty workspace?',
    'organization.workspace.confirmEmpty': 'Empty workspace {name}; other workspaces stay; page-scoped undo.',
    'organization.workspace.blockedTitle': 'Workspace still contains recoverable data',
    'organization.workspace.blockedBody': 'Archive or move every group and remove reminders. Nothing deleted.',
    'organization.workspace.delete': 'Delete workspace',
    'organization.workspace.deleteHistory': 'Delete workspace {name}',
    'organization.workspace.deleted': 'Workspace deleted',
    'organization.space.confirmTitle': 'Delete empty space?',
    'organization.space.confirmEmpty': 'Empty space {name}; other spaces stay; page-scoped undo.',
    'organization.space.blockedTitle': 'Space still contains recoverable data',
    'organization.space.blockedBody': 'Archive or move every group and remove reminders. Nothing deleted.',
    'organization.space.delete': 'Delete Space',
    'organization.space.deleteHistory': 'Delete Space {name}',
    'organization.space.deleted': 'Space deleted',
  };

  const context = vm.createContext({
    document,
    State: {
      get() { return state; },
      snapshot(label) {
        calls.snapshots.push({ label, data: JSON.parse(JSON.stringify(state)) });
        return 41;
      },
      async persistNow() {
        calls.persists += 1;
        try {
          return await persistNow();
        } catch (error) {
          calls.recovery += 1;
          throw error;
        }
      },
    },
    findCategory(id) {
      for (const workspace of state.workspaces) {
        const category = workspace.categories.find(candidate => candidate.id === id);
        if (category) return { ws: workspace, cat: category };
      }
      return null;
    },
    tr(key, vars = {}) {
      return String(translations[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
    },
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
    setElementInertOwner(element, owner, enabled) {
      calls.interlocks.push({ id: element?.id || null, owner, enabled });
      if (element) element.inert = enabled;
    },
    trapTabKey() { calls.traps += 1; },
    renderAll() { calls.renders += 1; opener.isConnected = false; },
    async openWsGrid() { calls.grids += 1; gridOverlay.classList.remove('hidden'); },
    toast(message, options) { calls.toasts.push({ message, options }); },
    setTimeout(callback) { callback(); return 1; },
    JSON,
  });

  vm.runInContext(
    `${controllerSource}\nglobalThis.__organization = { organizationDeleteOccupancy, organizationDeleteTarget, openOrganizationDelete, confirmOrganizationDelete, closeOrganizationDeleteDialog, bindOrganizationDeleteDialog };`,
    context,
    { filename: 'organization-removal-production-contract.js' },
  );

  return {
    api: context.__organization,
    calls,
    document,
    elements,
    listeners,
    opener,
    overlay,
    gridOverlay,
    gridClose,
    workspaceMenu,
    activeCategoryTab,
    activeSpaceItem,
    state,
    initialSecondWorkspace,
  };
}

(async () => {
  const blocked = buildHarness();
  blocked.api.bindOrganizationDeleteDialog();
  const occupancy = blocked.api.organizationDeleteOccupancy(blocked.state.workspaces[0]);
  assert.equal(occupancy.groups, 1, 'Even an empty group must block structural deletion until it is archived or moved');
  assert.equal(occupancy.items, 5, 'Occupancy must recursively include stack containers and descendants');
  assert.equal(occupancy.reminders, 2, 'Category and group reminders must both block deletion');
  assert.equal(blocked.api.openOrganizationDelete('workspace', 'ws-a', blocked.opener), true, 'A populated workspace must open recovery guidance');
  assert.equal(blocked.elements.get('organization-delete-title').textContent, 'Workspace still contains recoverable data', 'Populated scope must be framed as a recovery blocker');
  assert.equal(blocked.elements.get('organization-delete-message').textContent, 'Archive or move every group and remove reminders. Nothing deleted.', 'Blocked copy must give the recovery step and state that nothing changed');
  assert.equal(blocked.elements.get('organization-delete-cancel').textContent, 'Close', 'A non-destructive guidance dialog must use Close');
  assert.equal(blocked.elements.get('organization-delete-confirm').hidden, true, 'A populated workspace must expose no destructive action');
  assert.equal(blocked.elements.get('organization-delete-confirm').disabled, true, 'A hidden populated-workspace action must also be disabled');
  assert.equal(blocked.document.activeElement.id, 'organization-delete-cancel', 'The only safe action must receive initial focus');
  assert.equal(await blocked.api.confirmOrganizationDelete(), false, 'Programmatic confirmation must still refuse populated scope');
  assert.equal(blocked.calls.snapshots.length, 0, 'Blocked removal must create no Undo history');
  assert.equal(blocked.calls.persists, 0, 'Blocked removal must make no write');
  assert.equal(blocked.state.workspaces.length, 2, 'Blocked removal must preserve the workspace graph');
  assert.equal(blocked.calls.interlocks.filter(call => call.enabled).length, 4, 'Opening must independently inert every background root');
  blocked.elements.get('organization-delete-cancel').onclick();
  assert.equal(blocked.calls.interlocks.filter(call => !call.enabled).length, 4, 'Closing must release only the organization interlock');
  assert.equal(blocked.document.activeElement, blocked.opener, 'Recovery guidance must return focus to the visible opener');

  const cancel = buildHarness();
  emptyWorkspace(cancel.state, 'ws-a');
  cancel.api.bindOrganizationDeleteDialog();
  assert.equal(cancel.api.openOrganizationDelete('workspace', 'ws-a', cancel.opener), true, 'An empty workspace must open the confirmation');
  assert.equal(cancel.overlay.classList.contains('hidden'), false, 'Opening must reveal the dialog before mutation');
  assert.equal(cancel.elements.get('organization-delete-title').textContent, 'Delete empty workspace?', 'The title must name the empty-only boundary');
  assert.equal(cancel.elements.get('organization-delete-message').textContent, 'Empty workspace Research; other workspaces stay; page-scoped undo.', 'The body must state scope, retained data, and the bounded Undo instruction');
  assert.equal(cancel.elements.get('organization-delete-confirm').hidden, false, 'An empty workspace may expose the destructive action');
  assert.equal(cancel.elements.get('organization-delete-cancel').textContent, 'Cancel', 'A real confirmation must keep the safe Cancel label');
  assert.equal(cancel.calls.locks, 1, 'Opening must lock background scroll once');
  assert.equal(cancel.api.openOrganizationDelete('space', 'cat-a', cancel.opener), false, 'An open confirmation must reject another request');
  assert.equal(cancel.calls.locks, 1, 'A rejected duplicate must not duplicate the scroll lock');
  cancel.elements.get('organization-delete-cancel').onclick();
  assert.equal(cancel.overlay.classList.contains('hidden'), true, 'Cancel must close the dialog');
  assert.equal(cancel.state.workspaces.length, 2, 'Cancel must preserve workspace state');
  assert.equal(cancel.document.activeElement, cancel.opener, 'Context-menu removal must return focus to the explicit visible opener');
  assert.equal(cancel.calls.unlocks, 1, 'Cancel must release the scroll lock');

  cancel.opener.isConnected = true;
  cancel.document.activeElement = cancel.opener;
  emptySpace(cancel.state, 'cat-a');
  cancel.api.openOrganizationDelete('space', 'cat-a', cancel.opener);
  const keydown = cancel.listeners.get('organization-delete-overlay:keydown');
  keydown({ key: 'Tab', preventDefault() {} });
  assert.equal(cancel.calls.traps, 1, 'Tab must remain inside the dialog');
  let prevented = false;
  let stopped = false;
  keydown({
    key: 'Escape',
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
  });
  assert.equal(prevented, true, 'Escape must be consumed');
  assert.equal(stopped, true, 'Escape must not close a lower surface');
  assert.equal(cancel.overlay.classList.contains('hidden'), true, 'Escape must close only this dialog');
  assert.equal(cancel.state.workspaces[0].categories.length, 2, 'Escape must preserve the Space');

  const changed = buildHarness();
  emptyWorkspace(changed.state, 'ws-a');
  changed.api.bindOrganizationDeleteDialog();
  changed.api.openOrganizationDelete('workspace', 'ws-a', changed.opener);
  changed.state.workspaces[0].categories[1].groups.push({ id: 'new-group', reminders: [{ id: 'new-reminder' }], items: [{ id: 'new-tab', type: 'tab' }] });
  assert.equal(await changed.api.confirmOrganizationDelete(), false, 'Scope populated behind the dialog must require a fresh decision');
  assert.equal(changed.calls.snapshots.length, 0, 'Refreshing changed scope must not create Undo history');
  assert.equal(changed.calls.persists, 0, 'Refreshing changed scope must not write');
  assert.equal(changed.elements.get('organization-delete-title').textContent, 'Workspace still contains recoverable data', 'Changed populated scope must repaint as blocked');
  assert.equal(changed.elements.get('organization-delete-confirm').hidden, true, 'Changed populated scope must remove the destructive action');
  assert.equal(changed.document.activeElement.id, 'organization-delete-cancel', 'A refreshed scope must return focus to the safe action');
  assert.equal(changed.overlay.classList.contains('hidden'), false, 'A changed target must stay open with accurate recovery guidance');

  const stale = buildHarness();
  emptySpace(stale.state, 'cat-a');
  stale.api.bindOrganizationDeleteDialog();
  stale.api.openOrganizationDelete('space', 'cat-a', stale.opener);
  stale.state.workspaces[0].categories = stale.state.workspaces[0].categories.filter(category => category.id !== 'cat-a');
  assert.equal(await stale.api.confirmOrganizationDelete(), false, 'A missing target must be a no-op');
  assert.equal(stale.calls.persists, 0, 'A missing target must not write');
  assert.equal(stale.overlay.classList.contains('hidden'), true, 'A missing target must close safely');

  const guarded = buildHarness();
  guarded.state.workspaces = [guarded.state.workspaces[0]];
  assert.equal(guarded.api.openOrganizationDelete('workspace', 'ws-a', guarded.opener), false, 'The last workspace must not be removable');
  guarded.state.workspaces[0].categories = [guarded.state.workspaces[0].categories[0]];
  assert.equal(guarded.api.openOrganizationDelete('space', 'cat-a', guarded.opener), false, 'The last Space must not be removable');
  assert.equal(guarded.calls.locks, 0, 'Guarded targets must not open or lock the page');

  const write = deferred();
  const workspaceSuccess = buildHarness({ persistNow: () => write.promise });
  emptyWorkspace(workspaceSuccess.state, 'ws-a');
  workspaceSuccess.api.bindOrganizationDeleteDialog();
  workspaceSuccess.gridOverlay.classList.remove('hidden');
  workspaceSuccess.api.openOrganizationDelete('workspace', 'ws-a', workspaceSuccess.opener);
  const committingWorkspace = workspaceSuccess.api.confirmOrganizationDelete();
  assert.equal(workspaceSuccess.elements.get('organization-delete-confirm').disabled, true, 'Confirm must disable while persistence is pending');
  assert.equal(workspaceSuccess.elements.get('organization-delete-cancel').disabled, true, 'Cancel must disable after the write begins');
  assert.equal(workspaceSuccess.elements.get('organization-delete-confirm').textContent, 'Deleting…', 'Pending persistence must have explicit feedback');
  assert.equal(workspaceSuccess.overlay.getAttribute('aria-busy'), 'true', 'Pending persistence must be announced as busy');
  assert.equal(workspaceSuccess.calls.renders, 0, 'Pending persistence must not render a durable deletion');
  assert.equal(workspaceSuccess.calls.toasts.length, 0, 'Pending persistence must not claim success');
  write.resolve();
  assert.equal(await committingWorkspace, true, 'A storage receipt must complete empty-workspace deletion');
  assert.deepEqual(workspaceSuccess.state.workspaces.map(workspace => workspace.id), ['ws-b'], 'Only the confirmed empty workspace must be removed');
  assert.deepEqual(workspaceSuccess.state.workspaces[0], workspaceSuccess.initialSecondWorkspace, 'Other workspaces must remain byte-for-byte unchanged');
  assert.equal(workspaceSuccess.state.activeWsId, 'ws-b', 'Deleting the active workspace must select the remaining workspace');
  assert.equal(workspaceSuccess.calls.snapshots.length, 1, 'Deletion must create one reversible snapshot');
  assert.equal(workspaceSuccess.calls.snapshots[0].label, 'Delete workspace Research', 'Undo history must name the exact workspace in the active locale');
  assert.equal(workspaceSuccess.calls.persists, 1, 'Deletion must request one immediate persistence receipt');
  assert.equal(workspaceSuccess.calls.renders, 1, 'Confirmed persistence must refresh the product');
  assert.equal(workspaceSuccess.calls.grids, 1, 'A workspace manager underneath the dialog must be refreshed and preserved');
  assert.equal(workspaceSuccess.calls.toasts.length, 1, 'Confirmed workspace deletion must show one success');
  assert.equal(workspaceSuccess.calls.toasts[0].message, 'Workspace deleted', 'The success must name the completed workspace action');
  assert.equal(workspaceSuccess.calls.toasts[0].options.undo, 41, 'Success must expose the exact snapshot through Undo');
  assert.equal(workspaceSuccess.overlay.classList.contains('hidden'), true, 'Confirmed deletion must close the dialog');
  assert.equal(workspaceSuccess.document.activeElement, workspaceSuccess.gridClose, 'A removed workspace-manager opener must fall back to the refreshed manager close control');

  const spaceSuccess = buildHarness();
  emptySpace(spaceSuccess.state, 'cat-a');
  spaceSuccess.api.bindOrganizationDeleteDialog();
  spaceSuccess.api.openOrganizationDelete('space', 'cat-a', spaceSuccess.opener);
  assert.equal(await spaceSuccess.api.confirmOrganizationDelete(), true, 'A storage receipt must complete empty-Space deletion');
  assert.deepEqual(spaceSuccess.state.workspaces[0].categories.map(category => category.id), ['cat-b'], 'Only the confirmed empty Space must be removed');
  assert.equal(spaceSuccess.state.workspaces[0].activeCatId, 'cat-b', 'Deleting the active Space must select the remaining Space');
  assert.equal(spaceSuccess.calls.snapshots[0].label, 'Delete Space Reading', 'Undo history must name the exact Space in the active locale');
  assert.equal(spaceSuccess.calls.toasts.length, 1, 'Confirmed Space deletion must show one success');
  assert.equal(spaceSuccess.calls.toasts[0].message, 'Space deleted', 'The success must name the completed Space action');
  assert.equal(spaceSuccess.calls.toasts[0].options.undo, 41, 'Space deletion must expose its exact Undo snapshot');
  assert.equal(spaceSuccess.document.activeElement, spaceSuccess.activeSpaceItem, 'A removed Space opener must fall back to the refreshed visible active Space');

  const failure = buildHarness({ persistNow: async () => { throw new Error('write failed'); } });
  emptySpace(failure.state, 'cat-a');
  failure.api.bindOrganizationDeleteDialog();
  failure.api.openOrganizationDelete('space', 'cat-a', failure.opener);
  assert.equal(await failure.api.confirmOrganizationDelete(), false, 'Rejected persistence must not report success');
  assert.equal(failure.calls.recovery, 1, 'Rejected persistence must route through the existing recovery boundary');
  assert.equal(failure.calls.renders, 0, 'Rejected persistence must not render a durable deletion');
  assert.equal(failure.calls.toasts.length, 0, 'Rejected persistence must not show success or Undo');
  assert.equal(failure.overlay.classList.contains('hidden'), false, 'The confirmation must remain under the fail-closed recovery overlay');
  assert.equal(failure.overlay.getAttribute('aria-busy'), 'false', 'The underlying dialog must leave busy state after a rejected write');
  assert.equal(failure.elements.get('organization-delete-confirm').disabled, false, 'The underlying action must not remain permanently disabled');
  assert.equal(failure.calls.interlocks.filter(call => call.enabled).length, 4, 'Fail-closed recovery must retain the underlying organization interlock');
  assert.equal(failure.calls.interlocks.filter(call => !call.enabled).length, 0, 'Rejected persistence must not unlock lower surfaces');

  console.log('Organization removal contract passed (Archive-first occupancy guard, empty-only localized dialog, persistence receipt, Undo, inertness, focus, Tab, and Escape)');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
