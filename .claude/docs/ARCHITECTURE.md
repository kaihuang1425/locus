# Locus architecture map

Everything below was code-inspected on 2026-07-16. Line numbers drift — anchor by
the function/const names given here (grep them). This is an architecture map, not
installed-extension runtime evidence; current limitations are in `STATUS.md`.

## Data model (chrome.storage.local, key `te`)

```
{
  schema: 12,                   // CURRENT_SCHEMA in newtab.js; migrate() upgrades old data
  _revision: 0,                 // absent legacy value means 0; service-worker-owned token
  activeWsId,
  workspaces: [{
    id, name, symbol?, windowId?,          // windowId ← auto-switch binding
    activeCatId,
    categories: [{                          // "Spaces" in the UI
      id, name, symbol, reminders?: [EntityReminder],
      groups: [{ id, name, symbol, color, collapsed, reminders?: [EntityReminder], items: [Item] }]
    }]
  }],
  archive: [ArchiveEntry],       // deliberately hidden groups/items; durable until restored/deleted
  trash: [TrashEntry],           // ArchiveEntry envelope + trashedAt; auto-purged after 30 days
  settings: { ... }              // see below
}
```

`Item.type` ∈ `tab | note | todo | stack` (stack nests `items[]`). Optional item
fields (schema 5+): `favorite`, `readLaterAt`/`readAt`, `tags[]`, `notes` (rich text),
`customFields[]`, `checklist[]`, `cover {color|emoji}`, `color`, reminder fields,
`createdAt`. Tabs carry `url`, `fav` (favicon URL), `title`.

`EntityReminder` is `{ id, at, notified, label?, color?, recur? }`. Schema 12 adds
the persistent `id` to active category/group reminders and to group payloads held
in Archive or Trash. IDs are unique within their owning reminder list; edits,
reschedules, reorderings, and neighboring removals preserve them. Replace migration
and merge-import normalization repair absent or duplicate pre-schema-12 IDs.

Key `settings`: `theme size font width language showUrls animate confirmDelete
blurPrivacy autoSwitchWorkspace hibernate closeTabOnSave sidebarCollapsed
railCollapsed`, capture prefs (`captureAskEveryTime captureDefaultCategoryId
captureRememberLast captureLastTarget captureDeduplicate captureIncludeTitle
captureIncludeFavicon`), legacy `profile {name purpose workflow}` fields
(`profile.name` still drives the home greeting; the visible one-task welcome no
longer asks the questionnaire), `plugins {...}` (research-build tools-hub toggles),
`onboarding {welcomeSeen hintsSeen disabled}` (schema 6). `welcomeSeen` gates the
single save-first welcome. `hintsSeen` and `disabled` remain accepted for schema
and import continuity, but the questionnaire, spotlight tour, coach mark, and tip
controls no longer have runtime UI paths.
`confirmDelete` likewise remains accepted for schema/import continuity, but its
toggle and runtime branch are gone: groups expose the single recoverable Archive
action instead of duplicate Archive/Delete labels.
`showLanding` controls the calm new-tab launch layer (schema 7; absent legacy
values migrate to `true`).
Popup hibernate preferences (`popupHibernateScope`,
`popupHibernateKeepPinned`, `popupHibernateKeepAudio`) are schema 8 settings;
absent values retain the original current-window / keep-pinned / keep-audio
behavior.
`popupSaveMode` is a schema 9 setting; absent values migrate to the session-group
save behavior.
Schema 10 adds top-level `trash[]`. Existing archive entries stay archived; moving
one to Trash preserves its restore metadata and adds `trashedAt`.
`normalizeExpiredTrash()` runs during boot and `purgeExpiredTrash()` rechecks the
Trash surface; both remove valid entries after 30 days while preserving malformed
imports for lossless export/error reporting.
Active saved items have one recoverable removal path: Archive. Archive can then
move an entry to Trash. Only Trash exposes permanent deletion, through
`trash-delete-overlay`; `confirmTrashDelete()` writes immediately through the
central State writer, shows success only after an acknowledged receipt, and then
clears in-memory Undo/Redo history so the stated irreversible consequence remains
true. A rejected write stays behind the existing fail-closed recovery overlay and
does not render or toast success.
Workspace and Space rename use `organization-name-overlay` and the shared
`openOrganizationName()` / `confirmOrganizationName()` controller. The workspace
chip, workspace manager, Home card, and visible sidebar resolve targets only by
stable ID; duplicate IDs fail closed, while duplicate display names remain valid.
The controller stores primitives, re-resolves the entity and a Space's owning
workspace at confirmation, refreshes a concurrently changed name for review, and
turns blank, unchanged, missing, or moved targets into zero-write outcomes. A real
rename takes one localized snapshot, mutates only `name`, then awaits exactly one
`persistNow()` receipt before render, localized success, and action-ID-scoped Undo.
Rejected or unknown acknowledgement leaves the dirty graph behind fail-closed
recovery without retry, rollback, render, close, or success. The text-only dialog
owns an independent body inert owner while excluding recovery, suppresses global
shortcuts and conflicting organization/generic modal opens, consumes Escape while
busy, traps Tab, and restores the visible opener or a rebuilt stable-ID equivalent.
Locale reapplication repaints live title, validation, and pending state without
resetting the draft. Hidden category-tab and mouse-only double-click rename paths
must not return.
Workspace and Space creation reuse `organization-name-overlay` through
`openOrganizationCreate()` / `confirmOrganizationCreate()`. Every reachable
top-bar, workspace-manager, sidebar, Home-empty, and command-palette entry stores
only primitive target IDs and re-resolves the parent at confirmation; the Group
menu's “New Space…” operation additionally re-resolves the source Space and Group.
The shared allocator refuses collisions across active, Archive, and Trash graphs.
A new workspace contains one real, empty, localized `Pinned` Space; a normal new
Space contains no synthetic groups or items. Create-and-move preserves the exact
Group ID and nested graph, transfers its Canvas position and remembered capture
target, and commits the Space plus move as one mutation. Each successful operation
takes one localized snapshot and waits for exactly one `persistNow()` receipt
before rendering, focus restoration, feedback, or action-ID-scoped Undo. Blank,
missing, duplicate, moved, or concurrently renamed targets fail closed or require
review without writing. Rejection retains the dirty graph behind recovery without
retry or false success. The workspace manager is a keyboard-contained dialog below
the naming layer; its stale browser-window capture subsection is removed, while the
canonical Save eligible tabs/window flow remains the only whole-window capture UI.
Explicit Group and Stack identity changes use `modal-overlay` through
`openIdentityEditor()` / `confirmIdentityEditor()`. Reachable empty-Space, Board,
List, focused-Group, Stack-detail, and selected-item entry points pass primitive
Workspace/Space/Group/item IDs. The controller exhaustively re-resolves unique
parents, targets, and ancestor Stacks at confirmation; imported duplicate IDs,
moved targets, nested selections, and cross-Space batches fail before history or
mutation. Duplicate display names remain valid. Edit drafts preserve untouched raw
names and missing or custom symbol/color fields; only explicitly changed fields are
normalized or assigned. Color is a roving radio group with a transient current-
custom option, and the nested emoji picker changes only the draft until its owning
save boundary. Batch Stack creation keeps the selected records in place until
confirmation, then moves their exact stable-ID records in document order to the
first selected item's Group. Every real change takes one localized snapshot and
awaits one `persistNow()` receipt before render, close, selection clearing, rebuilt-
target focus, feedback, or action-ID-scoped Undo. Rejection leaves the dirty graph
behind recovery without retry, rollback, render, close, or success. Recovery
outranks the editor; emoji picker, editor, and lower surfaces close last-opened-
first, with independently owned inertness and focus return.
Duplicate Group is an explicit `openIdentityEditor('group', 'duplicate', …)` mode,
not a direct menu mutation. Board, Canvas/focused-Group, List More, and List context
actions all pass the same primitive Workspace/Space/Group tuple. The open draft
contains only scalars plus a detached source fingerprint; confirmation re-resolves
one unique active target and requires another review after any source-graph or
destination-name change. `createOrganizationIdAllocator()` reserves active,
Archive/Trash payload and envelope, capture, sizing, and Canvas keys before
`cloneGroupForDuplicate()` recursively rekeys the detached Group/item/Stack graph.
The transaction inserts the copy after its source, clones both sizing stores, and
prepares a non-overlapping Canvas coordinate from merged legacy/current per-Group
footprints before taking one snapshot. Null current-size records retain a valid
legacy width, matching render-time `??` fallback; an unsized footprint reserves the
viewport's 60vh cards cap plus 150 px of column chrome. One awaited `persistNow()` owns the whole
mutation. A focused Group page routes to the acknowledged copy with
`Router.navigate(…, { persist: false })`; other surfaces render normally, and both
paths focus the copy. A non-pending browser-history event closes the draft before
applying its route. While the identity receipt or fail-closed recovery owns the
foreground, history restores the reviewed route via `pushState` without flushing,
applying, rendering, or persisting another graph. Reminder-bearing copies reconcile alarms only after receipt;
Undo and Redo also reconcile after their acknowledged history writes. A delayed
copy-specific warning retains exact Undo only while the copy still exists and its
snapshot remains the latest action. Recovery stays above the editor, unavailable
drafts focus an enabled exit when recovery is absent; write rejection surfaces
recovery synchronously and its Reload action receives immediate focus. Untouched generated names
follow live locale changes without translating user-edited drafts.
Workspace and Space removal use `organization-delete-overlay` and the shared
`openOrganizationDelete()` / `confirmOrganizationDelete()` controller. Five entry
points resolve the live entity and `organizationDeleteOccupancy()` recursively
counts groups, stack containers/descendants, and category/group reminders. Any
occupied organization is non-destructive: the alert dialog hides/disables Delete
and directs the user to archive/move groups and remove reminders. Only an empty
structural shell may reach confirmation. The visible Home-card and sidebar Space
menus reopen the first existing category reminder with the localized edit flow
instead of always appending a new one; Remove then exposes the next legacy/imported
reminder, keeping the blocked recovery instruction reachable even after delivery.
The last workspace/Space is refused, and
a fingerprint change repaints the current empty/blocked consequence before any
action. The dialog owns inertness for every body-level background root except
itself and fail-closed recovery; recovery therefore remains operable and outranks
an in-flight decision, while late-mounted body surfaces inherit the organization
owner. Global shortcuts and programmatic command-palette opens are suppressed while
the decision is active; an outside-target Escape closes it only when fail-closed
recovery is not the higher layer. Focus restoration verifies a visible rebuilt workspace or
Space target, and locale reapplication repaints the live blocked, Space-specific,
or pending consequence state. Empty-shell confirmation records a localized
snapshot label, mutates only in this controller, then waits for `persistNow()`
before render, success, or an
action-ID-scoped Undo toast. That Undo uses the normal bounded in-memory history;
the dialog tells users to act before reloading or closing Locus without promising
that the action will remain available through intervening history changes. A
missing target or rejected write never claims success or unlocks the lower
surface. No Archive entry kind or stored graph shape is added.
Schema 11 extends `popupHibernateScope` with `selected`, persists the live
`popupHibernateSelectedTabIds[]` selection (stale ids are removed against
`chrome.tabs` whenever the popup opens), and adds the opt-in
`popupHibernateSaveBefore` safety setting. Existing profiles keep current-window
scope and do not save implicitly before hibernating.

`localStorage.te_settings_mirror` mirrors theme/size/font/width/anim/language for the
packaged `prepaint.js` script loaded by newtab.html (prevents theme flash). Keep both
in sync via `applySettings()` — never write it by hand.

## newtab.js section index (grep anchors)

| Concern | Anchors |
|---|---|
| Schema + i18n | `CURRENT_SCHEMA`, `I18N`, `tr(`, `applyLocale` |
| Router (hash routes) | `const Router`, `Router.sync`, `Router.navigate`; `persist: false` is used only for an already-acknowledged transaction route or an explicitly read-only Home-detail route |
| State store (load/persist/undo/redo/freshness) | `const State`, `needsPersistence`, `observeStoredState`, `recoverAuthoritative`, `startStateStorageSync`, action IDs from `State.snapshot`, `capturePending`, `captureCommitPending`, `registerClosedTabs`, `mutationEpoch`, `persistNow`, `clearUndoHistory`, `stateWriteFailureEpoch`, message type `locus-state-write`, `_revision` |
| Migrations | `function migrate()` |
| Storage quota UI | `refreshStorageUsage`, `showStorageFull`, `STORAGE_QUOTA` |
| Settings page (full-page surface) | `SETTINGS_SECTIONS`, `setSettingsSection`, `renderShortcutsSettings`, `renderStorageSettings`, `renderAboutSettings`, `openSettingsDrawer` |
| Capture settings | `renderCaptureSettings`, `captureTogs` (inside `applySettings`) |
| Apply settings → DOM | `applySettings` (body datasets, seg/toggle sync) |
| Focus/overlay infra | `rememberOpener`, `restoreOpener`, `focusFirstIn`, `trapTabKey` |
| Home surface | `renderHome`, `buildHomePreviewRow`, `resolveUniqueHomePreviewItem`, `openHomePreviewItem`, `buildProjectsRow`, `homeAccentColor`, `homeCardIconHtml` |
| Zen launch layer | `showLandingLayer`, `renderLandingLayer`, `paintLandingResults`, `bindLandingLayer` |
| Library surfaces | `openLibrarySurface`, `renderLibrarySurface`, `renderReadLaterSurface`, `renderArchiveSurface`, `renderTrashSurface`, `collectWorkspaceTabs`, `toggleFavorite`, `toggleReadLater` |
| Archive + Trash lifecycle | `archiveItem`, `archiveGroup`, `moveArchiveEntriesToTrash`, `restoreStoredEntries`, `permanentlyDeleteTrashEntries`, `confirmTrashDelete`, `bindTrashDeleteDialog`, `normalizeExpiredTrash`, `purgeExpiredTrash` |
| Workspace/Space rename | `organizationNameTarget`, `openOrganizationName`, `confirmOrganizationName`, `bindOrganizationNameDialog`, `handleOrganizationNameGlobalKey`; `#organization-name-overlay` |
| Workspace/Space create + create-and-move | `createOrganizationIdAllocator`, `openOrganizationCreate`, `confirmOrganizationCreate`, `setWorkspaceGridInterlock`, `openWsGrid`, `closeWsGrid`; `#organization-name-overlay`, `#ws-grid-overlay` |
| Existing-Space Group move | `organizationGroupMoveOptions`, `organizationGroupMoveFingerprint`, `organizationGroupMoveMenuItems`, `openOrganizationGroupMove`, `confirmOrganizationGroupMove`; `#organization-name-overlay`, `#organization-move-options` |
| Group/Stack identity + Duplicate Group | `identitySpaceTarget`, `identityGroupTarget`, `identityItemTargets`, `identityStackTarget`, `identityGroupDuplicateFingerprint`, `cloneGroupForDuplicate`, `prepareGroupDuplicateLayout`, `applyGroupDuplicateLayout`, `reconcileDuplicatedGroupReminders`, `openIdentityEditor`, `confirmIdentityEditor`, `closeIdentityEditor`, `handleIdentityEditorGlobalKey`; `#modal-overlay`, `#emoji-picker` |
| Workspace/Space removal | `organizationDeleteOccupancy`, `organizationDeleteTarget`, `setOrganizationDeleteInterlock`, `openOrganizationDelete`, `confirmOrganizationDelete`, `bindOrganizationDeleteDialog`; `#organization-delete-overlay` |
| Board layouts | `renderBoard`, `renderListView`, `renderCanvasView`, `renderExplorerView`, `renderTimelineView`, `renderGalleryView`, `renderGraphView` |
| Group pages | `openGroupPage`, `closeGroupPage`, `renderGroupPage` |
| Saved-item detail sheet | `validDetailItemIdForSurface`, `openItemDetail`, `closeItemDetail`, `prepareItemDetailOpen`, `ensureItemDetailRoot`, `createItemDetailMutationContext`, `resolveItemDetailMutationTarget`, `commitItemDetailMutation`, `commitItemDetailReminderMutation`, `applyItemDetailCandidate`, `isItemDetailMutationPending`, `isItemDetailReminderMutationPending`, `setItemDetailMutationBusy`, `setReminderMutationBusy`, `handleReminderGlobalKey`, `flushActiveItemDetailEditor`, `setElementInertOwner`, `setItemDetailBackgroundInert`, `handleItemDetailKeydown`, `renderItemDetail`; Home/board/Library `?item=<id>`, group `/item/<id>` |
| Calendar | `openCalendar`, `renderCalendar` |
| Search + operators | `renderSearchSurface`, `collectWorkspaceItems`, `searchItemMatches`, `applySearchFilter`, operators `type: is: domain: site: url: in: tag: color:` with `-` negation |
| Command palette | `openCommandPalette`, `buildPaletteCommands`, `_palSavedLinkCommand` |
| Shared empty states | `buildSystemEmptyState`, `buildEmptySpaceState`, `SYSTEM_EMPTY_ICONS` |
| App menu / About / Welcome | `openAppMenu`, `openAbout`, `openWelcome`, `loadWelcomeCandidate`; every first-run/replay entry uses the same save-first dialog |
| Import validation/recovery | `validateImportData`, `applyImportReplace`, `applyImportMerge`; pure graph helpers in `import-utils.js` |
| Tools hub (plugins) | `openToolsHub`, overlays `pomo/fin/habit/water/books/goals/workout/subs` |
| All bindings | `function init()` at the bottom — global Escape handler + `_escBlockers` list |

## Surfaces & navigation

One page, many surfaces, switched by state flags + `#board` mode classes:
`activeHome` (home-mode), `activeSearch` (search-mode), `activeLibraryMode`
(`all|favorites|read-later|archive|trash`), `activeGroupPage`, `activeCalendar`,
else the active category board. The settings
page (`#settings-drawer`) and tools overlays sit above as fixed overlays. Router
syncs hash routes so surfaces survive reload/back.

`#landing-layer` is an optional established-user new-tab launch view when
`settings.showLanding !== false` and onboarding has already been completed. It is
a fixed layer above Home, not a router surface: Escape, the chevron, or downward
wheel motion dismiss it for the current
page and reveal the already-rendered Home. Its counts come from the active
category's Inbox and `collectPendingReminders()`. Saved-link typeahead reads
`collectWorkspaceTabs()` and the shared `parseSearchQuery()` operator parser;
web submission uses `chrome.search.query()` (manifest `search` permission) so the
browser's configured default engine remains authoritative.

`#welcome` is the only onboarding surface. `loadWelcomeCandidate()` projects
`chrome.tabs.query()` into explicit loading, eligible-tab, no-eligible-tab, and
query-error/retry states. The save action reuses `saveTabToInbox(...,
{ closeSource: true })`, hands an acknowledged save to Inbox, and focuses that
item; failure keeps the dialog and source tab available. Its local key handler
traps Tab, consumes Escape before it can reach lower surfaces, and restores the
remembered opener. Replays from Settings restore the Settings opener before
opening the welcome so focus never returns to a hidden control.

`#item-detail` is a route-backed modal recovery sheet, not a second page or a
non-blocking inspector. Home, Board, and Library routes carry `?item=<id>`; group
routes carry `/item/<id>`. Every id is validated against the route's workspace and
category/group or Library eligibility before display, so a moved/stale item closes
instead of borrowing the wrong context. Home is stricter: preview activation and
every Home-detail rerender require one globally unique item plus one unique owning
Space in the requested Workspace. The native Home row opens `/home?item=<id>` over
the rebuilt Home rather than selecting or rendering the owning Space. This keeps
the active Space and saved layout unchanged and prevents Canvas position
initialization from becoming a side effect of recovery. The sheet names the real
item and Space/group location, opens saved links through
`openTabMaybeHibernated()`, and keeps saved context, Reminder, and Tags ahead of
progressive cover/checklist/custom-field metadata. Open is a browser effect, not a
detail persistence transaction.

Direct title, URL, task state/text, saved-context, cover, tag, checklist, and
custom-field edits share `commitItemDetailMutation()`. The rendered sheet captures
primitive Workspace/Space/Group/Stack/item identity plus the exact surface,
location, item value/type, ancestry, and runtime object references. Before any
history or mutation, `resolveItemDetailMutationTarget()` exhaustively requires one
unchanged target across the whole active graph. Field logic runs on a detached JSON
candidate; a real diff takes one snapshot, applies only that diff to the live item,
and awaits exactly one `State.persistNow()` receipt. The pending token is visible
synchronously, the detail body becomes `aria-busy`, direct mutation controls are
guarded, and a localized polite status reports Saving, Saved, stale, or failure.
Only acknowledgement permits board/detail render, heading refresh, or success.
Rejected and unknown receipts retain the sole dirty local graph behind fail-closed
recovery with no retry, rollback, lower-surface render, or success claim.

While a direct-field receipt is pending, a second edit, sheet close, programmatic
navigation, and Back/Forward route application are refused. Tab remains trapped
and usable within the sheet. An initial Escape from an active editor may blur it,
focus the stable panel, and synchronously start the transaction; subsequent Escape
is consumed until the receipt settles. A blur-triggered pagehide edit establishes
that token before teardown rechecks, so pagehide never starts a second write for
the same mutation. With no transaction pending, pagehide
still flushes an active editor and replaces any remaining dirty debounce with an
  immediate `persistNow({ recordMutation: false })`; clean state does not write.

Item-detail reminder Set, Change, quick choices, and Clear use
`commitItemDetailReminderMutation()` with the same primitive rendered context and
exhaustive target/route re-resolution. The controller preserves reminder fields it
does not own, normalizes the owned `at`, `notified`, and recurrence fields, takes one
localized snapshot, and makes exactly one
`State.persistNow({ reconcileReminders: true })` request. That message asks the
service worker to persist first and then run its serialized full alarm
reconciliation before returning one structured receipt. Page teardown cannot lose
the post-write effect, and the page never sends a second reconcile message. A known
writer rejection runs no alarm reconciliation. A timed-out, lost, or otherwise
unknown response leaves the dirty graph behind recovery with no page follow-up,
close, render, or false success; because the service worker may already have accepted
the state, its bundled alarm effect may also have completed. A receipt whose state
write succeeded but whose `reminderReconciliation.ok` is false keeps the accepted
state, closes and renders normally, and presents the localized scheduling warning
with a direct Undo action.

The reminder pending token joins the detail mutation boundary synchronously, so it
blocks duplicate activation, picker/detail close, navigation, other detail edits,
and app-wide shortcuts while keeping Tab contained and usable. Recovery remains the
top layer; otherwise Escape closes the reminder before the detail and focus returns
to the rebuilt Set or Change control. Stack identity continues through the existing
receipt-gated identity editor; Archive and Open remain separate actions. Non-detail
item reminder entry points and group/category reminder flows retain their existing
controllers and are not covered by this exact-detail transaction.

While open, `#app` and the launch layer are inert, Tab stays in the sheet, and
Escape blurs/commits an active editor before a subsequent Escape closes when no
receipt owns the foreground. The fully localized reminder picker and recovery
interlock retain precedence; independent inert owner tokens prevent any one layer
from unlocking another, and a lazily mounted body surface inherits owners for
dialogs that are already open. Close and browser history restore the remembered
opener, then the exact rebuilt Home origin, then a current native Home row for the
same item, then the ordinary same-item/heading fallback. Home open/close uses
`persist: false`; Back/Forward compares the durable active Workspace, active Space,
and layout selection before deciding whether route application needs a state write.
An ephemeral Home-detail change therefore renders without persistence, while a
real durable route selection still persists. Stale routes remove the sheet and
owned inertness without changing schema or stored item shape.

The command palette is an overlay, not a route. `buildPaletteCommands()` rebuilds
its localized actions from current workspace/Space/group/layout state whenever it
opens; recent and query link rows come from `collectWorkspaceTabs(activeWs())` and
reuse the board's local operator matcher. Commands must call existing navigation,
capture, settings, and persistence paths rather than maintaining parallel state.

Search is a first-class `…/search` route. Query text, type/Space/time/tag filters,
sort, filter-panel visibility, and selected result ride its hash query so reload,
back, and forward restore the view without a schema field. `collectWorkspaceItems()`
walks links, notes, tasks, stacks, and nested stack contents; `searchItemMatches()`
is the data-level operator matcher reused by the launch layer and command palette.
The older hidden `#search-bar`/`applySearchFilter()` path remains as the layout DOM
filter used after board/list/canvas/gallery renders; do not make it a second public
search entry point.

`buildSystemEmptyState()` is the shared presentation and behavior contract for
zero-data and no-match states across Home, Spaces/groups, Search, Library, Read
Later, Archive, and Trash. Give it a surface-specific title/body and at most two
real recovery actions; callbacks must reuse existing navigation, capture, import,
filter-reset, and persistence paths. Use `buildEmptySpaceState()` for empty boards
and keep compact states inside constrained group/filter contexts. Do not add
decorative placeholder controls or actions that cannot complete their label.

## Settings page specifics (since 2026-07-12)

`#settings-drawer` is a full-page surface: left rail `#drawer-tabs` with `.dt`
buttons (sections: general, appearance, capture, shortcuts, privacy, storage, data,
about), panes `#dp-<section>`, header `#sp-title`/`#sp-sub`. The element id and all
control ids are the drawer's originals — bindings, deep-links
(`openSettingsDrawer('capture')`), and the Escape stack depend on them. Legacy
section names map inside `setSettingsSection` (`behavior→general`,
`archive→storage`). CSS lives under `/* ═══ SETTINGS PAGE ═══ */` + `.sp-*` classes
in newtab.css; rail folds to a top strip below 880px.

## Cross-file invariants

- `media/fonts/fonts.css` is the shared, local-only font source for `newtab.html`
  and `popup.html`. Its WOFF2 files and OFL notices live beside it; keep the
  selectable family names and weight/style ranges aligned with `newtab.css`.
- `isDarkTheme()` (newtab.js) and the `DARK` map in packaged `prepaint.js` must list
  the same dark theme ids; both feed `body[data-theme-mode]`.
- `background.js` owns the only whole-state `chrome.storage.local.set({ te: ... })`.
  New-tab and popup writes freeze an immutable candidate when persistence is
  requested, assign its current `_revision` only when its turn begins, and accept
  only the next revision receipt. If one request fails, a failure epoch cancels
  every candidate already queued behind it so a rollback graph cannot be sent as
  another mutation. A page may resend that same immutable candidate at most twice
  only when `runtime.sendMessage()` rejects with `Receiving end does not exist`,
  because no state-write listener accepted that attempt. Exhaustion becomes the
  typed `LOCUS_STATE_RECEIVER_UNAVAILABLE` failure and keeps the new-tab page behind
  authoritative recovery. The retry lifecycle closes with the request's receipt
  deadline, so a delayed no-receiver rejection cannot launch abandoned writes after
  timeout recovery has begun. The typed recovery button restarts the extension with
  `chrome.runtime.reload()` so an unpacked old-worker/new-page skew can converge; it
  falls back to a page reload if that API is unavailable. Other recovery causes keep
  the narrower page-only reload. Closed ports, lost or malformed receipts, timeouts,
  and every other transport failure retain their never-retry, unknown-outcome handling.
  The service worker runs every background and message write
  through one FIFO, performs the revision comparison inside that queue, and also
  takes the `locus-state-write` Web Lock when available. The FIFO is the modeled
  lock-unavailable boundary for one service-worker lifetime; termination/restart
  remains an installed-runtime gate. Preserve typed conflict replies, visible
  recovery, and the rule that source tabs close only after an accepted receipt.
  Never add a second direct whole-state writer.
- `background.js` also owns reminder-alarm reconciliation at service-worker
  evaluation, browser startup/install, and after import. Future one-shots keep their
  stored time. A past recurring item, nested item, group, or category reminder uses
  `nextRecurTime()` to schedule only its first future wall-clock occurrence; missed
  occurrences are not replayed and reconciliation never mutates workspace state.
  Daily, weekly, and monthly recurrence advances nominal local-calendar coordinates,
  not fixed elapsed milliseconds: wall time survives 23/25-hour days; a nonexistent
  wall time, deleted civil date, or missing month-day is skipped without normalization
  drift; and a repeated fall-back wall time uses its first instant only.
  Past one-shots and recurrences beyond `until` remain unscheduled, while stale
  managed reminder alarms are cleared and unrelated alarms are preserved. Keep alarm
  API failures structured so callers cannot mistake partial reconciliation for
  success. On delivery, `reminderMatchesAlarm()` rejects an alarm whose scheduled
  occurrence no longer belongs to the stored reminder. The handler awaits notification
  creation, advances accepted state through the central writer, then reconciles the
  complete alarm map; notification failure leaves state untouched, writer failure
  leaves authority unchanged and rebuilds alarms from a fresh authoritative read
  without retrying the candidate, and post-write reconciliation failure creates a
  clickable `te-reminder-error-` warning. Non-quota writer failures use the same
  prefix for their update warning; quota retains the storage-full warning. Item
  alarms retain the item ID. Schema-12 group/category alarms use distinct
  `te-greminder2-` / `te-creminder2-` namespaces with delimiter-safe encoded entity
  and reminder IDs; delivery resolves exactly one matching reminder regardless of
  array index. Schema-11 index alarms remain a transition fallback only while older
  authority is stored, then reconciliation removes them after migration persists.
  Pending new-tab surfaces use `collectPendingReminders()` and
  `pendingReminderTime()` rather than treating every stored reminder as active.
  Delivered (`notified`) records do not count or render as pending. A past active
  recurrence is projected, without a state write, to the same first future local-
  calendar occurrence used by `nextRecurTime()`; an overdue one-shot or expired
  recurrence keeps its stored time and remains actionable through Calendar Past
  due. The projection preserves entity reminder IDs and array indexes so existing
  edit, drag, clear, and remove paths still target the stored record.
- A `locus-state-write` request may set `reconcileReminders: true`. The service
  worker accepts the revisioned state first, then awaits
  `requestReminderAlarmReconciliation('state-write')` and includes its structured
  result as `reminderReconciliation` in the same typed response. State acceptance
  remains `ok: true` even when the alarm result is `ok: false`, allowing the caller
  to retain accepted data and distinguish a scheduling warning from an unknown
  write. Keep this state→alarm ordering in the service worker; a page-owned follow-up
  can be lost during teardown.
- A single-tab popup save may also attach `locateSavedItem` to that same
  `locus-state-write` request when the user explicitly chooses the localized
  post-save Open option. The worker accepts state first, fresh-reads authority,
  requires exactly one active item plus one unambiguous owning Space still inside
  the original Workspace, creates an inactive `/home?item=<id>` recovery tab in the
  source popup window, attempts the configured source close, activates the tab, and
  focuses that window. Locate/create/close/activation outcomes return as
  `locateResult`; an activation failure includes the exact already-created route tab
  ID so the popup can retry that tab rather than create a duplicate generic route.
  The same ID makes the localized fallback notification return to the exact route.
  Combined source-close/activation failure must retain both flags, and a failed
  popup retry must update its polite live status. A known effect failure never
  changes the accepted `ok: true` state receipt or rolls data back. Creating
  recovery before closing the source is mandatory.
  Keep this effect worker-owned so action-popup teardown cannot strand a
  page-owned post-receipt handoff. Landing and automatic Welcome must not cover a
  valid Home-detail deep link, and suppressing them must not mark onboarding seen.
- Popup transport rejections other than the exact missing-receiver case are
  acknowledgement-ambiguous even when the browser error carries a native `code` or
  is not an object. Wrap them as `LOCUS_STATE_UNKNOWN_ACK`, preserve any native code
  only as diagnostic metadata, and require popup recovery before another capture.
  Typed worker rejection remains a response object and is not reclassified.
- New-tab keeps a serialized confirmed-state baseline separate from its mutable
  graph. `storage.onChanged` may report the expected stored candidate before the
  service-worker response; matching that event is observation only and never a
  persistence receipt. A clean, idle page may adopt a strictly newer revision.
  A dirty page never merges, rebases, or auto-replaces the incoming graph: it
  invalidates unsent writes and leaves the local view behind the inert,
  non-dismissible `#state-recovery-overlay` until reload. Unknown, failed, or
  timed-out receipts centrally require recovery and interrupt async browser-effect
  loops. Explicit failure recovery drains queued successors and prefers a newer
  `storage.onChanged` graph observed while its read was pending or already remembered.
  Capture recovery re-reads `te` only when `dataMutationToken()` proves no later
  edit would be erased, and revalidates that token immediately before adoption;
  otherwise the local graph remains behind the interlock.
  A bounded accepted-self map distinguishes delayed
  exact events from genuine revision rollback. Both the new-tab client and central
  worker reject fractional or negative revision tokens before sending/writing.
  `initAfterLoad()` persists only when migration, Trash/default, settings, or real
  deep-link normalization differs from the confirmed baseline, so clean boots do
  not advance `_revision`.
- Popup `doSave`, `hibernateSelectedScope`, and `saveWindow` share
  `popupCapturePending` from before mutation through their browser-side effects.
  Pending capture also owns popup Back, Escape, Ctrl/Cmd+K, and competing controls.
  Popup writes use the same bounded receipt deadline and late missing-receiver retry
  closure as new-tab; an unknown/protocol outcome blocks another capture until the
  popup is reopened. The optional single-tab Locate effect is absent from ordinary
  quick/window saves unless those paths explicitly earn a separate continuation.
  New-tab `commitCapturedTabs` uses `captureCommitPending` and rolls back a second
  optimistic capture before it can enqueue or close a source. `dataMutationEpoch`
  prevents capture failure or failed Redo from restoring an older graph over a
  later ordinary edit.
- Capture Undo is action-scoped. Keep it blocked while `capturePending`, preserve
  `restoredTabId` across retries, and use `mutationEpoch` checks around asynchronous
  tab reopening so Undo cannot replace a newer in-page mutation or reorder history.
- Render favicons through Chromium's local `_favicon` endpoint. Stored legacy
  `fav` metadata may be preserved for portability but must never be inserted as a
  remote image source; extension CSP keeps `img-src` local/data/blob and
  `connect-src 'none'`.
- background.js and popup.js each re-implement `captureFields` /
  `resolveCaptureTarget` (no shared modules — plain scripts). Changing capture
  semantics means touching all three copies (newtab.js has `captureTabFields`).
- `esc()` is the HTML-escape helper — required for any user data in `innerHTML`.
- Toasts: `toast(msg, {danger, duration})`; undoable actions pair
  `State.snapshot(label)` before mutation.
- Do not put a permanent-delete action on active items. They archive first. Trash
  deletion is the intentional exception to `State.snapshot`: persist the exact
  Trash mutation with `persistNow()`, wait for its receipt, then call
  `State.clearUndoHistory()` before reporting success.
- Do not reintroduce direct workspace/Space filter mutations at render call sites.
  Route removal through `openOrganizationDelete()`. A workspace/Space containing
  any group, nested item, or category/group reminder must stay blocked until that
  recoverable content is archived, moved, or cleared. For an empty shell, snapshot
  before mutation, wait for `persistNow()`, then render and pass the returned action
  ID to Undo. Group removal remains Archive-only. Keep inert
  `settings.confirmDelete` readable for compatibility unless a deliberate schema
  migration removes it.
- Do not reintroduce native or per-surface workspace/Space rename mutations. Route
  the four reachable rename affordances through `openOrganizationName()` with a
  stable ID and visible opener. Re-resolve before changing only `name`, wait for
  `persistNow()`, and expose Undo only from the acknowledged action ID. Keep
  duplicate names valid, duplicate IDs fail-closed, recovery above the naming
  interlock, and hidden-tab/double-click rename residue removed.
- Do not reintroduce native prompts, generic-modal branches, direct render-site
  mutations, or the workspace manager's duplicate browser-window subsection for
  workspace/Space creation. Route every entry through `openOrganizationCreate()`
  with stable parent/source IDs. Re-resolve before mutation, keep duplicate names
  valid and ID collisions fail-closed, seed only the localized empty starter Space,
  and make new-Space-plus-Group-move one snapshot and one acknowledged
  `persistNow()` operation. The canonical Save flow remains the whole-window
  capture boundary.
- Do not reintroduce flat per-Space Group destinations or `moveGroupToCategory()`.
  Board, Canvas/focused Group, and List menus must use
  `organizationGroupMoveMenuItems()` and `openOrganizationGroupMove()`. Keep the
  destination draft unselected until the user chooses it, re-resolve one active
  Workspace plus unique source Space, destination Space, and Group IDs, and require
  a second confirmation when displayed names, destination order, or counts change.
  One transaction moves the current Group object, transfers its source Canvas
  position, updates its exact remembered-capture and Archive/Trash item restore
  references, and preserves the active source Space. Await one `persistNow()`
  receipt before product render, selection pruning, close, destination-Space focus,
  feedback, or exact-action Undo; an unknown receipt stays behind recovery with no
  retry, rollback, or success claim.
- Do not reintroduce inline/contenteditable or per-surface Group/Stack identity
  mutations. Route explicit create/edit and selected-item Stack creation through
  `openIdentityEditor()` with primitive IDs. Re-resolve the complete parent path,
  preserve untouched imported fields, reject nested/cross-Space batch selections,
  allocate against active/Archive/Trash IDs, and wait for the acknowledged
  `persistNow()` receipt before render, close, focus, selection clearing, feedback,
  or exact-action Undo. Keep the emoji picker draft-only below the editor and
  recovery above both layers.
- Do not reintroduce direct `duplicateGroup()` mutations. Every Board, Canvas,
  focused-Group, and List Duplicate entry must use the shared identity review with
  primitive IDs and full-source stale detection. Clone the complete JSON-compatible
  Group, recursively allocate fresh Group/item/Stack IDs against active, stored,
  restore, capture, sizing, and Canvas identifiers, preserve imported/custom and
  reminder data, and prepare copied sizing plus non-overlapping Canvas placement
  before history or mutation. Await one `persistNow()` receipt before route/render,
  close, focus, success, Undo, or alarm reconciliation. Focused-Group success may
  route with `persist: false` only because the owning state write is already
  acknowledged. Undo/Redo must reconcile alarms after their own receipts, and an
  asynchronous reminder warning must never retain a stale exact-Undo action.
  Browser history must close a non-pending draft before navigation and must not
  flush, apply, render, or persist a route while the receipt or recovery owns the
  foreground. Keep Canvas placement's nullish legacy-size fallback aligned with
  rendering and reserve the 60vh cards cap plus chrome for unsized columns.
- Do not reintroduce captured-object, first-match, debounced, or per-control direct
  saved-item detail mutations. Title, URL, task state/text, saved context, cover,
  tags, checklist, and custom fields must use `commitItemDetailMutation()` with
  primitive rendered context, exhaustive unique graph re-resolution, unchanged
  route/location/type/value/ancestry fingerprints and runtime identity, a detached
  candidate, one snapshot, and exactly one awaited `State.persistNow()` call. No
  render, close, opener-return/rebuilt-target/completion focus, or success feedback
  may precede acknowledgement. In-sheet Tab containment and an initial editor
  Escape that blurs to the stable panel remain allowed.
  Rejected or unknown writes retain the dirty local graph behind recovery without
  retry or rollback. The synchronous pending boundary must block duplicate edits,
  Escape/close, and programmatic or browser-history navigation; pagehide must not
  start a second write. Item-detail reminder Set/Change/quick/Clear must use
  `commitItemDetailReminderMutation()` and one
  `persistNow({ reconcileReminders: true })` receipt. The service worker owns the
  post-write alarm effect and returns its structured result; no page-level second
  reconcile request, close, render, focus return, or success may race ahead of it.
  A known rejected state write runs no alarm effect. Lost/timed-out unknown responses
  stay behind recovery and launch no page follow-up, although an already accepted
  worker transaction may have completed its bundled effect. Accepted state plus a
  failed alarm result remains accepted and receives the localized warning. Stack
  identity stays in the shared identity editor; Archive and the Open
  browser effect remain separate actions. Non-detail item and entity reminder entry
  points are separate mutation boundaries.
- Do not make real Home saved-item previews inert or route them through a stale
  object/first-match ID. Keep them native buttons with localized action names,
  re-resolve one globally unique item and one owning Space from primitive IDs, and
  open the shared sheet on `/home?item=<id>`. Viewing, closing, Back, and Forward
  must not select a Space, render an Advanced layout, snapshot history, or persist
  ephemeral route state. Missing, duplicate, ambiguously owned, or moved-out
  records fail closed without navigation. Preserve exact-origin focus first and a
  native current-row fallback when the item moved inside the Workspace.
- Category home-card icons map names → bundled art in
  `media/locus_icons_one_folder_badge_nobg/set1-<name>-{light,dark}.png`
  (`homeCardIconName`).
