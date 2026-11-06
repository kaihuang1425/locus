# Locus architecture map

Everything below is maintained from code inspection through 2026-08-13. Line numbers drift — anchor by
the function/const names given here (grep them). This is an architecture map, not
installed-extension runtime evidence; current limitations are in `STATUS.md`.

## Data model (chrome.storage.local, key `te`)

```
{
  schema: 13,                   // CURRENT_SCHEMA in newtab.js; migrate() upgrades old data
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
  plans?: [PlanRecord],          // schema 14, optional: saved AI-planner inputs + bounded apply ledger
  archive: [ArchiveEntry],       // deliberately hidden groups/items; durable until restored/deleted
  trash: [TrashEntry],           // ArchiveEntry envelope + trashedAt; auto-purged after 30 days
  settings: { ... }              // see below
}
```

`Item.type` ∈ `tab | note | todo | stack` (stack nests `items[]`). Optional item
fields (schema 5+): `favorite`, `readLaterAt`/`readAt`, `tags[]`, `notes` (rich text),
`customFields[]`, `checklist[]`, `cover {color|emoji}`, `color`, reminder fields,
`createdAt`. Tabs carry `url`, `fav` (favicon URL), `title`.

Schema 14 (additive, no rewrite): `PlanRecord` is `{ id, title, horizon, start, end,
timezone, goals[], fixedText, constraints { dayStart, dayEnd, maxPerDay, notes },
shareBusy, client { provider, profile, model }, delivery, destination { workspaceId,
spaceId, groupId }, createdAt, updatedAt, applied[≤20] }`. A to-do created from a plan
carries `plan { id, draft, key, date, start, end, tz }`; `key` is the content key that
makes re-apply idempotent. Absent fields mean no plans and an ordinary to-do. Replace
import keeps `plans` from the backup; merge import keeps the local ones.

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
(`profile.name` remains import-compatible but Home no longer renders a personal
greeting; the visible one-task welcome no longer asks the questionnaire),
optional research-tool fields (`pomo`, `fin`, `subs`, `habits`, `habitsCfg`,
`water`, `books`, `booksCfg`, `goals`, `goalsCfg`, `workouts`, `workoutCfg`) are
lazily initialized by their existing tool interiors; the Plugins registry has no
install/enable field,
`onboarding {welcomeSeen hintsSeen disabled}` (schema 6). `welcomeSeen` gates the
single save-first welcome. `hintsSeen` and `disabled` remain accepted for schema
and import continuity, but the questionnaire, spotlight tour, coach mark, and tip
controls no longer have runtime UI paths.
`confirmDelete` likewise remains accepted for schema/import continuity, but its
toggle and runtime branch are gone: groups expose the single recoverable Archive
action instead of duplicate Archive/Delete labels.
`showLanding` controls the optional calm new-tab launch layer. Schema 7 introduced
the byte; schema 13 makes it an explicit opt-in. Migration preserves valid stored
booleans and resolves only absent or malformed schema-0–12 values to `false`.
Missing current-schema values also project as inactive; only exact `true` may show
the layer.
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
Settings → Paste links is an exact-destination transaction owned by
`createPasteImportContext()` / `applyPasteImport()`, not a second capture system.
Opening freezes one Workspace/Space ID pair, runtime owner references, visible
owner names, and stable existing-Group options. Confirmation fresh-resolves that
exact Space and Group across the whole graph. Active-view changes and harmless
sibling reorder do not redirect the import; missing, moved, duplicated, replaced,
renamed, or ambiguous reviewed targets require another review or fail before
history. `analyzePastedLinks()` accepts unique full HTTP(S) lines only. New Group
and tab candidates are detached before snapshot and use
`createOrganizationIdAllocator()` so active, Archive/Trash-envelope, capture,
sizing, and Canvas identifiers remain reserved. One localized snapshot precedes
the single live mutation, and exactly one awaited `State.persistNow()` receipt owns
render, close, opener focus, localized feedback, and action-ID-scoped Undo.
Rejected or acknowledgement-unknown writes retain the dirty graph behind recovery
without retry, rollback, render, close, or success. The dialog owns the
`paste-import` inert token below recovery, traps Tab, blocks duplicate activation,
Escape, dismissal, shortcuts, and routes while pending, and discards an idle draft
before browser history applies another route. Empty Spaces expose New group and
the visible name field immediately; localized fallback naming never changes the
stored schema or import format.
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
Browser context-menu and `save-current-tab` captures are owned by the background
worker's `resolveCaptureDestination()` / `resolveCaptureTarget()` /
`addToInbox()` / `saveContextWindow()` path. A remembered destination must carry
one unique Workspace/Space/Group tuple in the same hierarchy; a configured
default Space and the active Workspace/Space fallback are likewise globally
unique. Stale or ambiguous configuration never redirects. Single capture reuses
one exact Inbox or provisions it only when absent; whole-window capture creates a
collision-safe Session Group directly in the resolved Space. The shared
background allocator reserves active, Archive, Trash, capture/default hint,
sizing, and Canvas identities.

One guarded `setState()` attempt owns each real capture. Conflict, quota, invalid,
and unknown outcomes launch no fallback writer, success badge, or source effect.
After receipt creation settles, requested cleanup proceeds only when the returned
receipt has `actionable === true`, meaning its bounded notification ID contains an
exact item or Session Group locator. A generic Home receipt is a persistence and
local-Home continuation only: it performs no fresh cleanup-authority read, source
inspection, removal, or final outcome update. An actionable path re-enters
`enqueueStateWrite()` for one fresh authoritative read and retains the FIFO's
optional cross-context Web Lock through `tabs.get()` / `tabs.remove()`. It accepts
a current revision greater than or equal to the capture receipt; revision equality
is not a destination proxy. A single source requires one unique exact accepted
Workspace/Space/Group/direct-item tuple with the saved URL. Session results retain
transient item IDs on their source descriptors, so `closeContextWindowSources()`
can require the original exact Group and validate each direct item independently.
Removed or moved sources stay open while an unaffected sibling may close.
`closeCapturedTabIfEnabled()` then fresh-checks the exact tab ID, window, URL, and
optional string pending URL; a present malformed pending value fails closed.
Window cleanup requires each removable source to be explicitly inactive
(`active === false`), keeping the initiating tab plus active or unconfirmed-active
tabs. Read, lock, or effect uncertainty stays conservative; the accepted/newer
graph is never repaired, rolled back, or retried. These are worker/runtime
boundaries and require installed MV3 evidence.

Accepted context-menu and shortcut captures then pass their transient result to
`finishBackgroundItemCapture()` / `finishBackgroundWindowCapture()`. Those
controllers create one quiet conservative native receipt after the accepted write
and before any requested guarded source effect. Only confirmed creation of an
exact actionable receipt permits the authority transaction and close controller to
run once; its closed, stayed-open, unconfirmed, or partial result then updates that
same stable receipt ID. Creation failure or generic Home fallback keeps every
source open and retains the initial conservative receipt without a final update,
while update failure or worker teardown leaves that initial truthful clickable
receipt in place. The badge remains a no-throw secondary signal.
Receipt create, update, and click clearing pass through `runChromeCallbackApi()`,
which settles once from either a callback or Promise and reads
`chrome.runtime.lastError` only during the callback. The receipt
uses accepted-time Workspace/Space/Group display names but never stores them or
includes page titles, URLs, favicons, selections, or note content. User path
labels are stripped of control/bidi formatting and the receipt delimiter,
whitespace-normalized, and grapheme-budgeted with more room for the destination
Group. When `settings.blurPrivacy` is active, the complete visible path is
replaced by localized destination-hidden copy. Otherwise the organization path
is intentionally exposed to the operating-system notification surface.

`buildCaptureReceiptNotificationId()` encodes a versioned, bounded locator from
only target kind, Workspace ID, item/Group ID, and a nonce. Notification clicks
parse that value without an in-memory map, fresh-read authoritative `te`, reuse
the globally unique popup item/Group resolvers, and create exactly one local
new-tab continuation before clearing the receipt. Missing, duplicated,
cross-Workspace, malformed, or otherwise stale targets open generic local Home;
malformed or generic locators do not traverse the stored graph. A failed tab
creation preserves the receipt without retry. Receipt/badge failure cannot escape
into the capture listener, repeat an accepted write/close, or trigger the false
not-saved notification path. The former close-before-receipt crash interval is
removed from the source model. Installed Chrome must still prove native callback/
Promise behavior, notification survival and click handling across service-worker
teardown, and real tab effects; no durable notification outbox was added.

Home's active-Workspace Locus Trail is a new-tab client of the same capture
boundary, not another writer. `recentSaveCandidate()` restricts the reviewed
current-window candidate to URLs the saved-page opener can handle;
`homeTrailSaveCandidate()` also advances past direct Inbox duplicates when
deduplication is enabled. `saveHomeTrailCandidate()` fresh-reads the displayed tab
before delegating to `saveTabToInbox()` / `commitCapturedTabs()`. Its ephemeral
destination context retains exact Workspace, Space, and existing Inbox references,
IDs, and visible names; same-ID replacement, rename, duplicate Inbox, or changed
absent-Inbox provisioning fails closed. `refreshOpenTabs()` may update its browser
rail during capture but cannot rerender Home from the optimistic graph. The latter
fresh-reads the exact tab ID, window, URL, and pending URL again after the storage
receipt and immediately before an optional close. A changed source therefore
leaves the accepted saved copy intact and the browser tab open.
Every new-tab tab-to-Inbox mutation now shares `createInboxCaptureContext()` /
`resolveInboxCaptureTarget()` / `materializeInboxCaptureTarget()`. Single-tab Save
(including Welcome, palette, top bar, Home, and opened-tab actions), selected-tab
Save, and Space-register drop review a globally unique active Workspace/Space plus zero
or one exact Inbox before taking history. Materialization occurs only after the
snapshot: an exact Inbox is reused, while an unchanged absent Inbox receives one ID
from `createOrganizationIdAllocator()`. Duplicate, replaced, renamed, malformed, or
 ambiguous authority rolls back or starts nothing and calls the localized no-save/
 no-close reporter. Exact imported IDs are never normalized.
After materialization, `inboxCaptureReceiptMessage()` freezes the exact localized
Workspace › Space › Inbox receipt before the guarded commit. Single, selected, and
Space-drop Save paths expose it only after accepted persistence, then delegate
closed/stayed-open/partial wording to the existing capture result. Missing path
parts return no receipt and retain the generic localized fallback; no destination
is inferred after acceptance.
Existing-Group Add / Save uses the parallel `createGroupCaptureContext()` /
`resolveGroupCaptureTarget()` boundary. It freezes globally unique Workspace/Space/
Group references, exact IDs and names, plus the owned item-list reference; active-
tab capture reports a rejected `tabs.query()` with no effect and re-resolves after a
successful read. Both selected and active-tab branches then freeze their exact new
saved-item references, IDs, values, and owner list through
`createCaptureDestinationReceiptContext()`. That resolver is passed to
`commitCapturedTabs()` as `validateDestination`; the localized Workspace › Space ›
Group receipt is exposed through `toastCaptureDestinationReceipt()` only after an
accepted write and only while its exact target still resolves. Pre-existing recovery
or another new-tab capture stops before browser reads, history, or mutation. Stale or
ambiguous authority performs no mutation or source cleanup.
Selected-as-Group and Board/List Group/Stack drops use the exhaustive
`collectItemListCaptureTargets()` / `createItemListCaptureContext()` /
`resolveItemListCaptureTarget()` boundary. It freezes the exact active Workspace,
Space, Group, full Stack ancestry, all display names and runtime references, and the
owned item-list reference. `createCaptureDestinationReceiptContext()` additionally
freezes each new saved item's stable ID, runtime reference, complete value
fingerprint, parent list, and Stack ancestry. Reorder outside that ancestry is
harmless; replacement, rename, retype, move, value drift, duplicate identity, or
owner-list replacement invalidates the receipt.

These paths pass that resolver to `commitCapturedTabs()` as
`validateDestination`. The shared commit checks destination authority after an
optional fresh source read, after accepted persistence, and before and after every
final `chrome.tabs.get()` that could authorize removal. A later graph may remain the
accepted write, but a changed destination marks the outcome and protects every
remaining source. Exact success exposes localized Workspace › Space › Group ›
optional Stack copy, action-scoped Undo, and `openCaptureDestinationReceipt()`;
that action fresh-resolves, routes to the Group with `{ persist: false }`, and
focuses the rebuilt deepest Stack or Group. Post-acceptance drift retains Undo,
uses an explicit warning, and exposes no Open action or fallback navigation.
Save all uses `createGeneratedGroupCaptureContext()` /
`resolveGeneratedGroupCaptureTarget()` across its asynchronous whole-window read.
The context owns the active Workspace/Space references, exact IDs and names, and
the Space's Group-list reference. Clean storage adoption, navigation, replacement,
rename, duplicate identity, recovery, or a competing capture therefore stops before
history or source effects. One `createOrganizationIdAllocator()` instance reserves
the Session Group and every saved item against the full retained graph. The exact
item-list/new-item receipt is frozen after mutation and before
`commitCapturedTabs()`, then remains its `validateDestination` authority through
acknowledged persistence and every final source read. Only an accepted, still-
resolvable receipt may render and expose Open destination; drift protects remaining
sources and uses the shared destination-changed warning.
The Trail and Search share `createSavedItemRecoveryContext()` /
`resolveSavedItemRecoveryTarget()`: reviewed runtime references, primitive IDs,
the complete item value, and Workspace/Space/Group/Stack location fingerprint
must still resolve through the globally unique Home preview resolver before a
saved item can be recovered.
For its leading return card, `newestHomeRows(...,
{ preferReopenableTab: true })` ranks non-empty-ID saved tabs with a shared-
allowlist URL ahead of newer notes, to-dos, Stacks, and unsupported tabs, then
preserves `createdAt` and legacy reverse-traversal order within that tier. If no
tab is eligible for guarded Reopen, the original newest-item result remains the
lossless fallback. This ranking is read-only; activation still re-resolves exact
identity and fails closed through `openHomeTrailSavedTab()`.
`homeTrailRecoveryActionPlan()` is the recovery lane's presentation authority:
an eligible page yields primary Open then secondary Details, while a fallback
record yields one primary Details action. The DOM order is the keyboard order.
`homeTrailCaptureActionPlan()` owns the capture lane's state-aware emphasis. When
a saved-item recovery action exists, both Save consequences remain secondary; on
an empty Home, the preference-driven Save is primary and its inverse is secondary.
The plan changes classes only: labels, close/keep-open meaning, action order, and
the receipt-gated capture controller remain unchanged.
Trail presentation has three effective responsive projections. Above 1100 px,
recovery and capture each remain one horizontal route. From 761 through 1100 px,
CSS grid areas place the reviewed item/candidate and destination in two rows with
the unchanged action group beside them; the recovery locator remains vertical.
Capture gives that group a bounded 310 px minimum instead of allowing consequence
copy to create an intrinsic `auto` track, while the group and hint retain
`min-width: 0` / bounded emergency wrapping. At 760 px and below, the existing
single-column stack remains authoritative, and 560 px keeps full-width actions.
At 900 px and below the visible Space registry resolves to 188 px and
`#board.home-mode` fills the remaining main width; this does not mutate the user's
sidebar or Opened Tabs preferences. These projections do not use CSS `order`:
source DOM order remains item, locator, destination, actions for recovery and
candidate, destination, actions for capture, so keyboard and accessible reading
order stay aligned with the transaction. An empty recovery lane resets the medium
grid areas and keeps its established compact two-column empty state.
If the active Workspace has no Space, `homeTrailBlockedDestinationActionPlan()`
replaces the unavailable Save area with one primary Create-space prerequisite.
`buildHomeTrail()` associates it with the visible blocked-destination message and
passes its button to the existing `openOrganizationCreate('space')` controller.
For a present Space with multiple Inboxes, the same plan instead exposes one
Open-space continuation. It stays secondary when saved-item recovery already owns
primary emphasis, otherwise it becomes the sole primary. The reviewed destination
context is passed to `resolveHomeTrailSpaceReviewTarget()`, which requires one exact
global Workspace/Space identity plus unchanged references, names, and active
ownership. `openHomeTrailSpaceReview()` enters that board with `{ persist: false }`;
it does not choose an Inbox or mutate/repair destination data. Refusal keeps Home
and initiating focus with a localized no-effect result.
Below the Trail, `createLandingInboxContext()` is also Home's only Inbox authority.
`homeProgressiveZonePlan()` exposes Inbox review only when that exact context exists
and exposes Spaces only when the Workspace has at least one Space. Consequently a
no-Space Home stops after the Trail prerequisite, while zero or duplicate Inboxes
cannot create a first-name preview or Open-Inbox target. `buildHomeInboxZone()`
receives the reviewed context and delegates to the existing `openInboxView()`
identity resolver and `{ persist: false }` route; it performs no lookup, mutation,
provisioning, or persistence of its own.
The final Spaces zone is a read-only filing register, not another recency model.
`renderHome()` retains active-Space-first deterministic repository order and the
three-Space bound. Each `home-space-row` projects the stored Space symbol and item
count plus at most one `newestHomeItems(items, 1)` record; an empty Space uses the
existing localized empty copy. Preview, explicit Open-space, More, and drop controls
reuse their existing exact routes and capture boundaries. Production must not infer
Space artwork from its name, hash a display accent, or reintroduce the removed
collections-strip prototype. Imported symbols and colors remain stored unchanged.
A keyboard-initiated accepted Home Save restores focus to the newly rendered Open
control; both activations retain their existing exact recovery boundaries.
Schema 11 extends `popupHibernateScope` with `selected`, persists the live
`popupHibernateSelectedTabIds[]` selection (stale ids are removed against
`chrome.tabs` whenever the popup opens), and adds the opt-in
`popupHibernateSaveBefore` safety setting. Existing profiles keep current-window
scope and do not save implicitly before hibernating.

### Today board (Home since 2026-11)

`renderHome()` builds the Today board from the 2026-11 canvas; the Trail, Inbox
zone, and Space register described above are no longer rendered on Home. Today is a
derived projection with no stored field. `todayTaskModel()` walks the active
Workspace's to-dos (Stacks included) and keeps: a reminder `at` inside today (`due`
when it has passed, `upcoming` otherwise), an open to-do whose reminder is on an
earlier day (`overdue`), and a to-do with no reminder created today (`anytime`).
Duplicate stable IDs are left out. Order is overdue, due, anytime (by `createdAt`),
upcoming; then IDs deferred with Later; done to-dos last. The first open task is the
Now card.

Completion (`commitTodayTodoToggle`) is the Board to-do transaction with Today's
presentation: `createBoardTodoCompletionContext` / `resolveBoardTodoCompletionTarget`,
the shared `boardTodoCompletionMutationPending` token, one localized snapshot, one
awaited `persistNow()`. Capture (`commitTodayCapture`) resolves one exact Space (the
`#space` in the line, else the active Space) and zero or one Inbox
(`createTodayCaptureContext` / `resolveTodayCaptureTarget`, the Calendar Add-task
rules without the active-Space requirement), allocates IDs, snapshots, pushes one
to-do (with `reminder { at, notified: false }` only when a time was parsed), and
awaits one write (`reconcileReminders` when a reminder was added) before rendering
and the Undo receipt. `parseTodayCapture()` reads English and zh-TW date words and
`#space` tags and does the zone, day, and DST arithmetic with `LocusPlan`
(`todayInZone`, `addDays`, `weekdayIndex`, `zonedWallToEpoch`); its tokens drive the
capture mirror's highlights.

Later (`deferTodayTask`) is per-device view order in `localStorage.locus.today.later`
(`{ day, ids }`, ignored on any other day, in-memory fallback). It never enters
Undo or the stored graph. The edge tab (`#today-tabs-ear`) opens the existing
`#tabrail` as a drawer through `body.today-tabs-open`; `setTodayTabsDrawer()` never
calls `setOpenTabsRailCollapsed()`, so the saved `railCollapsed` preference is
unchanged. The shared rail helpers (`updateRailToggleLabel`, `focusOpenTabFilter`,
`handleOpenTabsEscape`, `restoreOpenTabSelectionFocus`, `setOpenTabRailCount`) read
that body class through `typeof`-guarded calls. At 820 px and below the edge tab is
hidden, matching the rail. A repaint keeps the capture draft, focus, and caret, and
is deferred while an IME composition is open.

`localStorage.te_settings_mirror` mirrors theme/size/font/width/anim/language for the
packaged `prepaint.js` script loaded by newtab.html (prevents theme flash). Keep both
in sync via `applySettings()` — never write it by hand.

## newtab.js section index (grep anchors)

| Concern | Anchors |
|---|---|
| Schema + i18n | `CURRENT_SCHEMA`, `I18N`, `tr(`, `applyLocale` |
| Router (hash routes) | `const Router`, `Router.sync`, `Router.navigate`; `persist: false` is used for already-acknowledged transaction routes and ephemeral Home/Search/Library recovery routes |
| State store (load/persist/undo/redo/freshness) | `const State`, `needsPersistence`, `observeStoredState`, `recoverAuthoritative`, `startStateStorageSync`, action IDs from `State.snapshot`, `capturePending`, `captureCommitPending`, `registerClosedTabs`, `mutationEpoch`, `persistNow`, `clearUndoHistory`, `stateWriteFailureEpoch`, message type `locus-state-write`, `_revision` |
| Migrations | `function migrate()` |
| Storage quota UI | `refreshStorageUsage`, `isQuotaRecoveryOpen`, `showStorageFull`, `paintQuotaUsage`, `requestQuotaBackup`, `reloadQuotaToArchive`, `bindQuotaOverlay`, `STORAGE_QUOTA` |
| Settings page (full-page surface) | `SETTINGS_SECTIONS`, `setSettingsSection`, `renderGeneralSettings`, `commitGeneralSettingsChange`, `renderAppearanceSettings`, `commitAppearanceSettingsChange`, `renderCaptureSettings`, `commitCaptureSettingsChange`, `settingsPreferencePendingTransaction`, `paintSettingsPreferenceBusy`, `renderShortcutsSettings`, `renderStorageSettings`, `renderDataSettings`, `renderAboutSettings`, `openSettingsDrawer`; `#general-preferences`, `#general-workspace-plugin` |
| Capture settings policy + receipt | `captureSettingsResolveDestination`, `captureSettingsDestinationOptions`, `captureSettingsContractModel`, `renderCaptureSettings`, `paintSettingsPreferenceBusy`, `settingsPreferencePendingTransaction`, `captureSettingsBlocksDismissal`, `commitCaptureSettingsChange`; `#capture-contract`, `#capture-policy-status`, existing destination/toggle IDs |
| Appearance core + local Style plugin receipt | `CORE_APPEARANCE_THEMES`, `buildThemeGrid`, `renderAppearanceSettings`, `appearanceStylePackIsActive`, `appearanceStylePackResetPatch`, `commitAppearanceSettingsChange`, `settingsPreferencePendingTransaction`, `paintSettingsPreferenceBusy`; `#appearance-profile`, `#theme-grid`, `#appearance-style-pack`, `#theme-pack-grid`, `#seg-size`, `#seg-width`, `#seg-font`, `#tog-urls`, `#tog-anim` |
| Apply settings → DOM | `applySettings` (body datasets, seg/toggle sync) |
| Focus/overlay infra | `rememberOpener`, `restoreOpener`, `focusFirstIn`, `trapTabKey` |
| Rich-text Link review | `captureRichTextLinkSelection`, `richTextLinkContextStillMatches`, `normalizeRichTextLinkUrl`, `openRichTextLinkDialog`, `applyRichTextLink`, `handleRichTextLinkGlobalKey`; `#rt-toolbar`, `#rich-text-link-overlay` |
| Today board (Home since 2026-11) | `renderHome`, `buildTodayBoard`, `todayTaskModel`, `parseTodayCapture`, `buildTodayClock`, `paintTodayClock`, `startTodayClock`, `buildTodayNow`, `buildTodayCard`, `commitTodayTodoToggle`, `checkTodayNow`, `laterTodayNow`, `toggleTodayCard`, `deferTodayTask`, `readTodayLaterIds`, `createTodayCaptureContext`, `resolveTodayCaptureTarget`, `commitTodayCapture`, `paintTodayCaptureMirror`, `setTodayTabsDrawer`, `syncTodayTabsEar`, `bindTodayBoard`; `#today-tabs-ear`, `#today-tabs-scrim` |
| Former Home builders (not rendered since 2026-11; kept with their tests until a cleanup slice) | `buildHomeTrail`, `newestHomeRows`, `newestHomeItems`, `recentSaveCandidate`, `homeTrailSaveCandidate`, `homeTrailBlockedDestinationActionPlan`, `resolveHomeTrailSpaceReviewTarget`, `openHomeTrailSpaceReview`, `homeProgressiveZonePlan`, `buildHomeInboxZone`, `createLandingInboxContext`, `openInboxView`, `createSavedItemRecoveryContext`, `resolveSavedItemRecoveryTarget`, `saveHomeTrailCandidate`, `buildHomePreviewRow`, `resolveUniqueHomePreviewItem`, `openHomePreviewItem` |
| Zen launch layer | `showLandingLayer`, `renderLandingLayer`, `paintLandingResults`, `bindLandingLayer` |
| Library recovery ledger | `activeLibraryState`, `libraryStateFromRoute`, `libraryRouteQuery`, `collectWorkspaceTabs`, `libraryRowsForState`, `libraryDetailItemIdForRoute`, `libraryDestinationText`, `libraryLedgerRowModel`, `createLibraryRecoveryContext`, `resolveLibraryRecoveryTarget`, `activateLibraryRecovery`, `buildLibraryLedgerRow`, `bindLibraryQueryControl`, `renderLibraryLedgerSurface`, `focusLibraryLedgerTarget`, `openLibrarySurface`, `renderLibrarySurface`, `renderReadLaterSurface`; Archive/Trash remain `renderArchiveSurface` / `renderTrashSurface` |
| Archive + Trash lifecycle | `archiveItem`, `archiveGroup`, `moveArchiveEntriesToTrash`, `restoreStoredEntries`, `createArchivedLocalItemRestoreContext`, `commitArchivedLocalItemRestore`, `createArchivedLocalItemBatchRestoreContext`, `commitArchivedLocalItemBatchRestore`, `openArchivedLocalItemRestoreReview`, `createArchivedGroupRestoreContext`, `commitArchivedGroupRestore`, `createArchivedGroupBatchRestoreContext`, `commitArchivedGroupBatchRestore`, `openArchivedGroupRestoreReview`, `permanentlyDeleteTrashEntries`, `confirmTrashDelete`, `bindTrashDeleteDialog`, `normalizeExpiredTrash`, `purgeExpiredTrash` |
| Workspace/Space rename | `organizationNameTarget`, `openOrganizationName`, `confirmOrganizationName`, `bindOrganizationNameDialog`, `handleOrganizationNameGlobalKey`; `#organization-name-overlay` |
| Workspace/Space create + create-and-move | `createOrganizationIdAllocator`, `openOrganizationCreate`, `confirmOrganizationCreate`, `setWorkspaceGridInterlock`, `openWsGrid`, `closeWsGrid`; `#organization-name-overlay`, `#ws-grid-overlay` |
| Existing-Space Group move | `organizationGroupMoveOptions`, `organizationGroupMoveFingerprint`, `organizationGroupMoveMenuItems`, `openOrganizationGroupMove`, `confirmOrganizationGroupMove`; `#organization-name-overlay`, `#organization-move-options` |
| Settings Paste links | `analyzePastedLinks`, `createPasteImportContext`, `pasteImportGroupOptions`, `refreshPasteImportReview`, `applyPasteImport`, `handlePasteImportGlobalKey`; `#paste-overlay` |
| Group/Stack identity + Duplicate Group | `identitySpaceTarget`, `identityGroupTarget`, `identityItemTargets`, `identityStackTarget`, `identityGroupDuplicateFingerprint`, `cloneGroupForDuplicate`, `prepareGroupDuplicateLayout`, `applyGroupDuplicateLayout`, `reconcileDuplicatedGroupReminders`, `focusIdentityTarget`, `openIdentityEditor`, `confirmIdentityEditor`, `closeIdentityEditor`, `handleIdentityEditorGlobalKey`; `#modal-overlay`, `#emoji-picker` |
| Workspace/Space removal | `organizationDeleteOccupancy`, `organizationDeleteTarget`, `setOrganizationDeleteInterlock`, `openOrganizationDelete`, `confirmOrganizationDelete`, `bindOrganizationDeleteDialog`; `#organization-delete-overlay` |
| Board layouts | `renderBoard`, `renderListView`, `renderCanvasView`, `renderExplorerView`, `renderTimelineView`, `renderGalleryView`, `renderGraphView` |
| Board Note/To-do records + Details-owned editing | `buildNote`, `buildTodo`, `boardNotePreviewText`, `applyBoardRecordMarker`, `openBoardRecordDetail`, `createBoardLocalRecordContext`, `resolveBoardLocalRecordCreateTarget`, `createBoardLocalRecord`, `createBoardTodoCompletionContext`, `resolveBoardTodoCompletionTarget`, `toggleBoardTodoCompletion`, `detailPrimaryEditor`, `detailItemMarkerPicker`, `commitItemDetailMutation`; cards are read-only native locators, creation and completion await exact receipts, and Note body, To-do text, and standard marker changes use the route-backed Details transaction. Imported custom marker bytes remain visible through a color-only CSS property and are never normalized by viewing them. |
| Board/List record controls | `buildItem`, `attachItemSelection`, `applyItemMeta`, `restoreItemDetailFocus`; every item delegates to one persistent native checkbox-role selector with localized item identity and exact rebuilt focus, while non-Stack records with real notes/checklist/custom fields gain one native localized Details docket row that opens the shared route-backed sheet and restores that exact trigger |
| Group filing registers + pages | `buildGroupCol`, `buildLvGroup`, `groupRecordCreationMenuItems`, `openGroupRecordCreationMenu`, `groupActionMenuItems`, `bindBoardItemContextMenu`, `openGroupAll`, `openGroupPage`, `closeGroupPage`, `renderGroupPage`; Board/focused/List use one flat real-color-spined register language, Canvas reuses the Board inner structure while retaining placement elevation, the visible name owns page navigation, persistent actions plus pointer/Context Menu/Shift+F10 share the actual opener, and `forceExpanded: true` ignores board-only collapse presentation without mutating `group.collapsed`. Board/focused/Canvas footers keep capture primary through **Save here** and contain Note/To-do/Stack behind one exact-target **Add record** menu; List uses the same Save label and keeps the shared record actions inside More. A Group-local container query preserves both 40 px footer targets at a 200 px resize. |
| Stack filing sleeves | `buildStack`, `buildLvStack`, `stackActionMenuItems`, `bindBoardItemContextMenu`, `archiveBoardLocalItemWithFocus`; Board/List project the same localized Stack name/type/item context, stored-color binder rail, and persistent 40 px collapse/symbol/More controls. The action model requires the exact rendered Stack, parent item list, Group, and actual opener before exposing Details, identity, intention, disclosure, reminder, or accepted-storage complete-Stack Archive |
| Opened-tabs live-source ledger | `refreshOpenTabs`, `renderOpenTabs`, `renderOpenTabRailState`, `applyFilter`, `openTabActionMenuItems`, `syncOpenTabRailCaptureControls`, `setOpenTabsRailCollapsed`, `focusOpenTabFilter`, `handleOpenTabsEscape`; real non-internal Chrome tabs remain visible as flat source rows, while loading/error/empty/no-match, saveability, selection, pending, keyboard context, and responsive drawer state stay explicit without a second saved-data model |
| New-tab browser capture | `captureEligibleTabs`, `selectedCaptureTabs`, `clearCapturedTabSelection`, `createInboxCaptureContext`, `resolveInboxCaptureTarget`, `materializeInboxCaptureTarget`, `reportInboxCaptureUnavailable`, `captureDestinationReceiptMessage`, `inboxCaptureReceiptMessage`, `createGroupCaptureContext`, `resolveGroupCaptureTarget`, `reportGroupCaptureUnavailable`, `createGeneratedGroupCaptureContext`, `resolveGeneratedGroupCaptureTarget`, `reportGeneratedGroupCaptureUnavailable`, `generatedCaptureGroupName`, `saveTabToInbox`, `saveSelectedToInbox`, `saveSelectedAsGroup`, `addSidebarOrActiveTabToGroup`, `saveAllTabs`, `dropTabsIntoCategory`, `handleTabDropIntoList`, `_palSaveActiveTab`, `loadWelcomeCandidate`; every candidate converges on `isOpenableSavedTabUrl` before history/graph mutation and every new saved page derives optional title/favicon fields through `captureTabFields()`, including Space-drop. Every new Inbox item and both selected/active existing-Group branches use the graph-wide retained-ID-safe allocator before history or graph mutation. Single, selected, and Space-drop Inbox saves freeze the exact Workspace/Space/Inbox/list/new-item receipt after insertion and pass its resolver through acknowledged persistence and every source cleanup; the explicit Space-drop caller alone may freeze a uniquely resolved inactive Space inside the active Workspace, while all ordinary list-context callers remain active-Space-only. Opened-tab row and palette Save expose the existing exact Open-destination receipt, while Home, Welcome, and top-bar retain their dedicated handoffs. Save all and existing-Group Save freeze destination authority before `chrome.tabs.query()`, re-resolve it afterward, and carry one exact saved-item receipt through acknowledged persistence and source cleanup. Save all passes every supported saved source to that guarded cleanup boundary; it does not drop an arbitrary first candidate. Accepted single/selected/Space-drop/selected-as-Group/drag/Save-all/existing-Group actions name only a still-resolvable exact destination. `renderOpenTabs` retains non-internal unsupported rows for switch and explicit Close but removes Save/drag authority. |
| Shared saved-page Reopen | `isOpenableSavedTabUrl`, `normalizeSavedTabUrl`, `createSavedTabReopenContext`, `resolveSavedTabReopenTarget`, `savedTabDestinationMatch`, `selectSavedTabReopenCandidate`, `savedTabReopenContextsMatch`, `savedTabReopenLockName`, `performSavedTabReopen`, `performSavedTabReopenWithLock`, `queueSavedTabReopen`, `requestSavedTabReopen`, `openSavedTabItem`; normal Open reuses an exact live/suspended tab, while the card arrow passes `reuse: false` for its explicit new-tab promise |
| Bulk Group/selection Reopen | `createBulkSavedTabReopenPlan`, `bulkSavedTabReopenResult`, `performBulkSavedTabReopen`, `requestBulkSavedTabReopen`, `bulkSavedTabReopenMessage`, `showBulkSavedTabReopenRecovery`, `reportBulkSavedTabReopenResult`, `openSavedTabItems`, `bulkSavedTabReopenInFlight`, `openGroupAll`, `runBatchAction`; exact contexts settle sequentially with background reuse/create intent, stop after a failed profile read or unknown effect, and retain busy/focus/recovery ownership |
| Saved-item detail sheet | `validDetailItemIdForSurface`, `libraryDetailItemIdForRoute`, `openItemDetail`, `closeItemDetail`, `prepareItemDetailOpen`, `restoreItemDetailFocus`, `ensureItemDetailRoot`, `createItemDetailMutationContext`, `resolveItemDetailMutationTarget`, `commitItemDetailMutation`, `commitItemDetailReminderMutation`, `applyItemDetailCandidate`, `detailPrimaryEditor`, `detailItemMarkerPicker`, `isItemDetailMutationPending`, `isItemDetailReminderMutationPending`, `setItemDetailMutationBusy`, `setReminderMutationBusy`, `handleReminderGlobalKey`, `flushActiveItemDetailEditor`, `setElementInertOwner`, `setItemDetailBackgroundInert`, `handleItemDetailKeydown`, `renderItemDetail`; Home/board/Library `?item=<id>`, Search `?item=<id>&detail=1`, group `/item/<id>`. This sheet is the sole text/marker editor for Note and To-do records. |
| Group/Space reminder mutation | `createEntityReminderMutationContext`, `resolveEntityReminderMutationTarget`, `buildEntityReminderMutationValue`, `commitEntityReminderMutation`, `focusEntityReminderMutationTarget`; Group picker and Calendar drag |
| Group/Space reminder removal | `openEntityReminderPicker`, `openEntityReminderPickerOrReport`, `createEntityReminderRemovalContext`, `entityReminderOwnerMatchesContext`, `resolveEntityReminderRemovalTarget`, `commitEntityReminderRemoval`, `focusEntityReminderRemovalFallback`, `focusEntityReminderOwnerFallback`, `setReminderMutationBusy`, `isReminderMutationPending`; `#reminder-overlay` |
| Calendar | `openCalendar`, `renderCalendar`, `openCalDay`, `createCalendarTaskMutationContext`, `resolveCalendarTaskMutationTarget`, `commitCalendarTaskMutation`, `handleCalendarTaskGlobalKey`; `#calendar-task-overlay` |
| AI planner (planner.js + plan-contract.js) | `openPlannerDialog`, `closePlannerDialog`, `plannerRebuild`, `plannerAddDraft`, `plannerRefreshPreview`, `plannerAppliedKeyIndex`, `createPlannerApplyContext`, `resolvePlannerApplyTarget`, `commitPlannerApply`, `commitPlannerSave`, `isPlannerMutationPending`, `handlePlannerGlobalKey`, `plannerCompanionConnect`, `plannerCompanionPull`, `plannerCompanionAck`; `LocusPlan.buildPlanRequest`, `LocusPlan.validatePlanDraft`, `LocusPlan.buildPlanPrompt`; `#planner-overlay`, `#cal-plan-btn` |
| Search + operators | `renderSearchSurface`, `collectWorkspaceItems`, `searchItemMatches`, `searchHiddenFilterCount`, `searchFiltersActive`, `searchFilterResetPatch`, `searchResultLimit`, `searchVisibleRows`, `showNextSearchResultBatch`, `createSearchRecoveryContext`, `resolveSearchRecoveryTarget`, `searchRecoveryContextForActivation`, `searchDetailRoute`, `handleSearchQueryKeydown`, `startSearchQueryComposition`, `queueSearchQueryInput`, `endSearchQueryComposition`, `_searchMoveSelection`, `bindSearchResultActivation`, `_searchOpenPrimary`, `_searchOpenDetails`, `applySearchFilter`; operators `type: is: domain: site: url: in: tag: color:` with `-` negation |
| Command palette | `openCommandPalette`, `buildPaletteCommands`, `_palSavedLinkCommand` |
| Shared empty states | `buildSystemEmptyState`, `buildEmptySpaceState`, `SYSTEM_EMPTY_ICONS` |
| App menu / About / Welcome | `openAppMenu`, `openAbout`, `openWelcome`, `loadWelcomeCandidate`; every first-run/replay entry uses the same save-first dialog |
| Settings Data transfer + import review | `renderDataSettings`, `setDataTransferFileStatus`, `resetImportFileInput`, `importJSON`, `paintImportPreview`, `openImportPreview`, `confirmImportPreview`, `closeImportPreview`, `handleImportGlobalKey`, `importBookmarks`; `#data-transfer-ledger`, `#import-json-btn`, `#import-file`, `#import-overlay` |
| Import validation/recovery | `validateImportData`, `applyImportReplace`, `applyImportMerge`; pure graph helpers in `import-utils.js`; existing schemas/envelopes and payload bytes remain authoritative |
| Import/Explorer organization presentation | `localizeImportDiagnosticPath`, `localizeImportValidationError`, `paintImportPreview`, `explorerCopy`; durable backup and state graphs keep `workspaces[].categories[]` |
| Optional Plugins registry | `PLUGIN_TOOL_OPENERS`, `setToolsHubInterlock`, `openToolsHub`, `closeToolsHub`, `activateToolsHubPlugin`, `bindToolsHub`; `#tools-hub`, `#plugins-list`, stable `.hub-card[data-tool]`; existing interiors remain overlays `pomo/fin/habit/water/books/goals/workout/subs` |
| All bindings | `function init()` at the bottom — global Escape handler + `_escBlockers` list |

All Links, Favorites, and Read Later are URL-owned projections of active-workspace
tab records, including tabs nested in Stacks; they are not additional stored
collections. `activeLibraryState` is `{ mode, query, status, sort }`, while `item`
is the route-backed detail selection. Defaults are newest-first for All Links and
Favorites and unread/oldest-first for Read Later; item ID is the deterministic sort
tie-break. Only Favorite, `readLaterAt`, and `readAt` remain durable item fields.
Filtering searches title, URL, Workspace, Space, Group, and parent Stack names.
Every row carries the full localized destination and delegates visible Open/Details
through a Library receipt that combines the shared saved-item value/location
fingerprints with a route fingerprint and focus key. Resolution requires the same
active Workspace/mode/route, globally unique item, ancestor references, and current
visible-result membership. Open uses the shared browser Reopen controller; Details
uses `persist: false`, retains the full Library route, and restores the rebuilt
row's primary action. Query/status/sort changes use URL replacement and do not call
the State writer. `bindLibraryQueryControl()` keeps interim IME text mounted and
outside those route/result updates, commits the exact composition-end value once,
and suppresses the browser's duplicate follow-up input. Ordinary input still
commits immediately. Escape is ignored while `isComposing`, key code 229, or the
mounted composition marker is active; once settled it retains the existing
clear-and-blur behavior. The rendered projection is one Locus Index filing ledger:
`renderLibraryLedgerSurface()` places Workspace scope in the heading, then one
`library-query-row` for the dominant query and Sort, followed by the result count
and optional Read Later status rail. `buildLibraryLedgerRow()` nests exact
destination between title and source so they reflow as one record, then orders the
visible Open, Details, and Favorite/read-status controls before More. More contains
only the additional Read Later add/remove and Archive lifecycle actions; it does not
duplicate visible recovery or state controls. Above 1100 px each record stays one
row, at 1100 px actions move to one second line, and at 760 px query/sort, age,
status, and actions reflow while destination remains visible. The cobalt filing
spine, mono path/scope/count/age, forced-color spine, and Workspace privacy blur are
presentation only. Read Later's single ledger is presentation convergence, not a
schema, migration, permission, or storage change.

Favorite, Read Later add/remove, and read/unread share the saved-tab return-marker
transaction: `createSavedTabReturnMutationContext()` freezes the exhaustive exact
item identity/value, while `commitSavedTabReturnMutation()` re-resolves it after
owning the originating Library marker or Board card. The accepted marker remains
visible until one localized snapshot and one awaited `State.persistNow()` settle.
Acceptance alone renders and announces the established result; Library/Board focus
continuations await that result. Stale truth makes no write, while rejected or
unknown acknowledgement releases into existing recovery without repaint, success,
focus continuation, or retry. These remain projections of the three existing item
fields, not a new collection or schema.

Individual Board/Library item Archive uses one exact transaction. The saved-page
entry `createSavedPageArchiveContext()` admits only `tab`; the Board-local entry
`createBoardLocalArchiveContext()` admits only `note` or `todo`. Both freeze the
globally unique item identity and value, then `commitSavedPageArchive()` (historical
name) re-resolves after owning the direct Archive control, Library More control, or
Board local-record More control. It freezes the activation timestamp, creates the
established item Archive entry, and awaits one `State.persistNow()` before active/
Archive render, reversible success, or caller focus continuation. Stale truth writes
nothing; rejected or unknown acknowledgement keeps the accepted DOM behind recovery
without retry. The controller cross-blocks saved-tab return markers, local-record
creation, To-do completion, and item-detail receipts. Local-card acceptance then
uses `archiveBoardLocalItemWithFocus()` to focus next/previous sibling, Group identity,
or Board heading. Stack `archiveItem()`, selection/batch Archive, Group Archive,
restore, Trash, and permanent deletion retain their separate contracts.

Board, focused-Group, and List reuse `buildNote()` / `buildTodo()` as read-only
record locators. Their native primary action, More menu, pointer context menu,
Context Menu key, and Shift+F10 all route to the same item-detail sheet with an exact
initial focus key. Cards never mutate Note text, To-do text, or marker color. The
Note excerpt is sanitized and reduced to text before display; responsive clamping
changes presentation only.

`detailPrimaryEditor()` owns Note rich text and To-do text. It delegates every
change to the route-frozen `commitItemDetailMutation()` context, which re-resolves
Workspace/Space/Group/Stack/item identity and value before applying a detached
candidate, taking one localized snapshot, and awaiting one `State.persistNow()`.
The same sheet owns `detailItemMarkerPicker()`: one named roving radiogroup of the
six compatible choices. A current nonstandard imported string adds one truthful
read-only custom choice whose bytes reach only a transient CSS variable consumed by
`background-color`; viewing or selecting that choice cannot write or normalize it.
An explicit standard or No marker choice uses the shared detail receipt. Rejection,
unknown acknowledgement, stale identity, or recovery never becomes a repaint,
success, or retry.

`createBoardLocalRecord()` is the only Board/command-palette Note or To-do creation
boundary. It freezes the exact active item-list owner, creates one compatible item,
builds an exact destination receipt, and awaits one whole-state acknowledgement
before rendering or opening Details at the new field. The initiating footer button
owns busy/focus/inert state; duplicate creation, route changes, lower shortcuts, and
conflicting local mutations are blocked while pending. A rejected or drifted receipt
does not expose a blank record or claim success. To-do completion remains the
separate exact-item `toggleBoardTodoCompletion()` transaction because its checkbox
is a useful direct card action.

Saved-page Restore in the primary Archive and Trash ledgers shares one collection-
aware exact-destination engine, separate from the legacy non-tab lifecycle.
`createArchivedPageRestoreContext(entry, collectionName)` freezes one exact entry/
data value from `archive` or `trash`, including Trash retention fields, requires the
stable item ID to be absent from active Workspaces, and resolves the displayed
fallback plan: original Workspace ID then active/first, original Space ID/name then
active/first, and original Group ID/name then existing/new Inbox. Duplicate
candidates or malformed arrays are unavailable. `createTrashedPageRestoreContext()`
is the strict Trash wrapper. `commitArchivedPageRestore()` re-resolves collection
ownership, the same entry/value, active-ID absence, container refs/IDs/names, and
Inbox-creation state after owning the exact button/row;
`commitTrashedPageRestore()` admits only a reviewed Trash context. The shared commit
allocates a missing fallback Inbox against every active, archived, trashed, hinted,
layout, and capture-preference ID before history or graph mutation. It then
awaits one `State.persistNow()` before active/collection render, navigation counts,
localized destination-specific Undo success, or caller focus continuation. Unknown
acknowledgement keeps the accepted DOM behind recovery without retry. Trash rows
retain their expiry countdown beside the exact return route.

`openArchivedPageRestoreReview()` lets compact saved-page rows re-resolve the
Archive context, open the ephemeral Archive route, and focus the exact entry
reference without mutation or persistence. Search uses this reachable continuation;
the dormant null-guarded Settings renderer is hardened the same way. Saved-page-only
multi-selection uses the collection-aware `createArchivedPageBatchRestoreContext()`
and `commitArchivedPageBatchRestore()` engine; the strict Trash wrappers are
`createTrashedPageBatchRestoreContext()` and `commitTrashedPageBatchRestore()`.
Commit re-resolves every entry/value/ID/route, creates at most one collision-safe
Inbox per exact Space, retains page object order, and awaits one
`State.persistNow()`. Both ledgers expose one route directly or every route in a
native disclosure; mixed page/non-page selection is disabled.

Individual Group Restore in both ledgers has its own strict collection-aware seam.
`createArchivedGroupRestoreContext(entry, collectionName)` freezes one exact entry
and complete Group value, validates nonempty unique IDs for the Group and every
nested item/Stack, and requires those IDs to be absent from active Workspaces and
every other Archive/Trash entry. It resolves the displayed destination as original
Workspace then active/first and original Space ID/name then active/first; ambiguous
or malformed truth is unavailable. `createTrashedGroupRestoreContext()` is the
strict Trash wrapper. `commitArchivedGroupRestore()` re-resolves collection
ownership, complete values, global ID absence, destination refs/IDs/names, and the
exact groups array under the shared saved-page/Group pending owner. It removes only
the reviewed entry, appends the original Group object without cloning or rekeying,
and awaits one `State.persistNow()` before rendering, destination-specific Undo
success, or focus continuation; `commitTrashedGroupRestore()` admits only Trash.
Archive rows keep item count/date and Trash rows keep item count/countdown beside
the exact Workspace/Space route. `openArchivedGroupRestoreReview()` lets compact
Search and the dormant Settings renderer focus that exact primary-Archive review
without mutation or persistence. Group-only multi-selection composes those exact
reviews through `createArchivedGroupBatchRestoreContext()`; its strict Trash wrapper
is `createTrashedGroupBatchRestoreContext()`. Destinations are grouped by exact
Workspace/Space refs and displayed inline or in the existing native disclosure.
`commitArchivedGroupBatchRestore()` re-resolves every entry/value/nested ID/route,
removes the reviewed collection entries, appends the original Group objects in
selected order, and awaits one `State.persistNow()` under the same pending owner;
`commitTrashedGroupBatchRestore()` admits only Trash. Any page-containing mixture
keeps the saved-page refusal, and Group/local-item mixtures are disabled.

Individual note, to-do, and Stack Restore now uses a separate exact Group-
destination seam in both ledgers. `createArchivedLocalItemRestoreContext()` freezes
one exact entry and complete root item value, validates the root and every nested
Stack/item ID, requires those IDs to be absent everywhere else, and resolves the
same Workspace/Space/Group or new-Inbox plan shown in the row. Its strict Trash
wrapper is `createTrashedLocalItemRestoreContext()`. Commit re-resolves the full
stored graph and destination under the shared Restore pending owner, creates at
most one collision-safe Inbox, appends the original object without cloning or
rekeying, and awaits one `State.persistNow()` before render, destination-specific
Undo success, or focus continuation. `commitTrashedLocalItemRestore()` admits only
Trash. `openArchivedLocalItemRestoreReview()` routes compact Search and the retained
Settings list to the exact primary-Archive review without mutation. Selected notes,
to-dos, and Stacks compose those exact reviews through
`createArchivedLocalItemBatchRestoreContext()`; its strict Trash wrapper is
`createTrashedLocalItemBatchRestoreContext()`. Destinations are grouped by exact
Workspace/Space/Group refs and displayed inline or in the existing disclosure.
`commitArchivedLocalItemBatchRestore()` re-resolves every entry/value/nested ID/
route, creates at most one collision-safe Inbox per reviewed Space, removes the
reviewed entries, appends the original item objects in selected order, and awaits
one `State.persistNow()` under the shared pending owner;
`commitTrashedLocalItemBatchRestore()` admits only Trash. Page/non-page and Group/
local-item mixtures remain disabled instead of bypassing their stricter receipts.

Individual saved-page browser effects have one coordinator. A request starts from
the rendered item object, finds exactly one reference occurrence, then wraps the
existing globally unique recovery receipt with a normalized allowlisted URL.
Re-resolution therefore rejects duplicate stable IDs, replacement, move/rename,
ancestor change, type/URL edit, and unsafe legacy addresses after every pre-effect
asynchronous read, immediately before browser work. `tabs.query({})` is
intentionally unfiltered:
Locus suspended targets live in the `suspended.html` fragment. A nonempty
`pendingUrl` overrides the committed URL; exact live destinations and this
extension's exact placeholder are eligible, with settled live preferred. Reuse
fresh-reads the same tab/window; its update receipt must be active and still exact
before Locus focuses the window. Foreground reuse then fresh-reads the same tab
after focus and requires the same tab/window, `active: true`, and exact live or
suspended destination before success. Background reuse has no effect, so its
fresh pre-effect read is also its final receipt.
Absence creates one foreground live tab or an inactive live/suspended tab according
to Hibernate. A fulfilled create requires an integer returned tab/window identity,
then a fresh read proving that exact identity, requested active disposition, and
requested live/suspended representation. Exact pending navigation may confirm;
conflicting pending navigation, final-read failure, identity/disposition mismatch,
or wrong representation is effect-unknown and never retried. Explicit
`reuse: false` revalidates inside the lock and creates directly without an unused
all-tabs query. The final read confirms the already-authorized browser effect; it
does not reselect authority or retroactively invalidate an exact handoff because
the saved record changed after that non-destructive effect.
Same-normalized-URL lanes coalesce only identical in-flight intent for the same
exact saved-item context inside one document. Distinct saved items sharing a URL
serialize, then revalidate their own frozen authority. When available, a hashed
same-origin exclusive Web Lock additionally serializes the browser read/effect
across separate Locus documents, so an acknowledged first create is visible to
the next query.
An unconfirmed prior effect blocks an already queued same-document successor;
the lock does not carry that typed outcome into another document, which must
fresh-query and remains an installed unknown-receipt evidence boundary. API failures are
typed and never fall through to create after uncertainty. `openSavedTabItem()`
owns quiet success, localized recovery guidance, and initiating-focus return for
Landing, Library/Read Later, Home Trail, shared cards/layouts, Search, Details,
Explorer, Graph, and saved-card drop-to-open.

Group/selection bulk Reopen captures every exact item context synchronously, then
settles the shared controller sequentially with `{ focus: false, reuse: true }`.
An exact live or suspended destination is reused before a missing destination
creates one inactive live/Hibernate tab. Group activation requires the exact
rendered Group to remain the sole current Workspace/Space/Group identity; nested
Stack tabs are recursive. Selection ignores non-tabs and disables Open when none
are eligible. A safe per-item refusal is counted and processing continues. One
failed `tabs.query({})`, malformed read, or first unknown browser effect stops the
remaining plan and records them as not checked. A single document-level batch owns
one focusable `aria-busy`/`aria-disabled` opener; competing activation is explained
and redirected to that anchor. Confirmed counts are compact; check-failed,
unconfirmed, skipped, and not-checked guidance stays inline until dismissed.
Popup route reuse remains a separate contract. The query/create boundary cannot be atomic
against a user or another extension opening the same URL in the final race window.

## Surfaces & navigation

One page, many surfaces, switched by state flags + `#board` mode classes:
`activeHome` (home-mode), `activeSearch` (search-mode), `activeLibraryMode`
(`all|favorites|read-later|archive|trash`), `activeGroupPage`, `activeCalendar`,
else the active category board. The settings
page (`#settings-drawer`) and tools overlays sit above as fixed overlays. Router
syncs hash routes so surfaces survive reload/back.

The shared visual architecture is the **Locus Index** system. `themes.css` keeps the
compatible `folio` and `folio-dark` IDs while defining semantic paper, registry,
locator, receipt, focus, border, elevation, and typography tokens consumed by new-
tab and popup. Its eight existing `[data-font]` choices now feed one
`--font-display` role for readable UI/headings, while `--font-mono` is reserved for
exact paths, counts, shortcuts, and receipts. New-tab prepaint/`applySettings()` and
popup `applyAppearance()` both apply the persisted font; an unsupported popup value
falls back to `dm` without changing saved state.
The final `LOCUS INDEX REDESIGN` block in `newtab.css` is the current presentation
authority over the earlier Field Desk layer: dark registry navigation/header/rail,
warm saved-material sheets, a single blue location/action rule, green accepted-
receipt signals, the user-selected face for readable headings/controls, and Geist
Mono filing metadata. It converges Home/Inbox, saved records, Search/Library, Settings, Welcome,
dialogs, item detail, and the optional launch layer without a parallel router, state
model, or copy source. The launch layer suppresses the decorative scene, clock, and
quote so it cannot outrank the save → locate → recover loop. The final `LOCUS INDEX
POPUP` block in `popup.css` applies the same grammar to the 420 px popup: registry
header/footer, paper body, flat records, receipt boundaries, and Save above
Hibernate at normal height with a compact two-column fallback at 420×520. Earlier
visual layers remain historical fallbacks, not current authority.
Above 1280 px the open-tabs rail remains an in-flow live-source ledger. From
821–1280 px its saved collapsed state stays a 46 px handle, while explicit expand
or the `S` shortcut opens a fixed 320 px drawer without compressing the work
surface; Escape clears filter, then selection, then the drawer. At 800 px and below
the rail is absent and cannot receive shortcut focus. Home's Space register uses a
horizontal identity/latest/Open row at wide widths, a two-line row below 900 px,
and one column below 560 px. Saved-item detail is a 560 px recovery docket at
1280/800, stacks its context rows below 560 px, and becomes full-width at 560 px.

Board Groups use one shadowless 10 px filing register: `--gcol-tint` supplies the
4 px vertical locator, the Group name is the native page route, and 40 px Open all/
More controls stay visible without hover. The same shell is reused by focused Group
and Canvas routes; unsized Board Groups fill the lane below 800 px, stored widths
remain capped by the viewport, and focused rendering keeps the established 900 px
limit. Collapse, identity, add, drag/drop, and pointer/Arrow resize remain the
existing behavior boundaries rather than a parallel state model. The footer has
only one flexible **Save here** capture control and one content-sized **Add record**
disclosure. `groupRecordCreationMenuItems()` re-resolves the exact rendered Group
before exposing receipt-gated Note/To-do or identity-owned Stack creation; Board
More suppresses that visible duplicate. `.gcol` supplies the inline-size container,
so only the secondary visible label collapses below 250 px while both 40 px named
controls remain available at the supported 200 px resize.

List Groups extend that register without duplicating Board DOM. `buildLvGroup()`
keeps the real-color locator and native Group-name route, adds localized item/to-do
context, and exposes persistent 40 px Open all/Save here/More controls above the
shared record rows. At 900 px those actions move to a deliberate second line. Board and
List pass their exact rendered Group and actual opener to
`groupActionMenuItems()`, which refuses a missing/replaced target and supplies one
action set to `bindBoardItemContextMenu()` for More, pointer context, Context Menu,
and Shift+F10. List More includes the shared Note/To-do/Stack record actions because
it has no separate Add-record disclosure. Collapse, identity, capture, selection,
drag/drop, and persistence remain their established controllers.

Board and List Stacks are subordinate filing sleeves inside that hierarchy.
`buildStack()` and `buildLvStack()` expose the unmodified stored identity color as
`--stack-tint`; List also projects its calculated `--stack-indent`, so the 2 px rail
marks the real nesting level rather than flattening it. Both layouts render the same
localized type/item context and 40 px collapse/symbol/More rhythm. They pass the
rendered Stack, parent item list, Group, and actual opener to
`stackActionMenuItems()`, which refuses a missing, ambiguous, moved, or replaced
target before supplying the shared Details/identity/intention/disclosure/reminder/
Archive actions to `bindBoardItemContextMenu()`. Complete Stack Archive composes the
existing `createBoardLocalArchiveContext()` → `commitSavedPageArchive()` transaction;
pending/failure/recovery and accepted successor focus are not a parallel Stack
writer. Nested/imported bytes, collapse state, capture, selection, and drag/drop
remain unchanged.

Record selection is an ephemeral projection, not durable item state.
`attachItemSelection()` owns the one Board/List/Stack DOM seam: a native button with
checkbox semantics, localized Select/Deselect plus the current item title, Shift
range delegation, and post-render focus recovery through `data-item-select-id`.
It inserts into the existing record or Stack header so the 40 px filing-index cell
stays distinct from Todo completion. `applyItemMeta()` continues to expose tags and
optional covers without changing stored bytes; custom cover paint uses only
`backgroundColor`. When and only when notes, checklist entries, or custom fields
exist, it appends one native Details docket button whose visible localized facts
wrap and whose route uses `returnFocusKey: 'board-item-details'`.
`restoreItemDetailFocus()` resolves that rebuilt exact trigger before falling back
to the established record primary or Board heading. Selection does not persist;
the Details route remains read-only until the shared exact item-detail transaction
owns a mutation.

Settings folds below 900 px;
the popup bounds its tab list at 520 px height or less. Reduced-motion and forced-
color overrides remain last so the foundation cannot restore ornamental motion or
color-only state.

`#landing-layer` is an optional established-user new-tab launch view only when
`settings.showLanding === true` and onboarding has already been completed. Both
boot and the layer entry point enforce that exact opt-in. It is
a fixed layer above Home, not a router surface: Escape, the chevron, or downward
wheel motion dismiss it for the current
page and reveal the already-rendered Home. The focused Store scope keeps the
active Space's Inbox shortcut visible while the retained Tools and Reminders
controls are natively hidden; Calendar and Tools remain reachable through
`secondaryNavigationItems()` under More. Reminder counts are still projected from
`collectPendingReminders()` without changing stored data. Saved-link typeahead reads
`collectWorkspaceTabs()` and the shared `parseSearchQuery()` operator parser;
its result stays mounted until `openSavedTabItem()` confirms the browser handoff,
so a failed tab check preserves the query and initiating focus. Web submission is
intentionally absent: `submitLandingSearch()` dismisses the launch layer and passes
the trimmed query to `openSearchSurface()`, whose existing URL-backed Search route
covers all saved content in the active Workspace. The manifest therefore has no
`search` permission; the browser omnibox remains the user's web-search surface.

`#welcome` is the only onboarding surface. Its existing content is grouped inside
`.wc-task` as `.wc-intro` plus `.wc-operation`; the two-column registry sheet stacks
to one column at 800 px without changing stable IDs, control order, or behavior.
`loadWelcomeCandidate()` projects
`chrome.tabs.query()` into explicit loading, eligible-tab, no-eligible-tab, and
query-error/retry states. `welcomeDestinationContext()` freezes the exact active
Workspace/Space and zero-or-one Inbox authority plus the visible Workspace › Space ›
Inbox path. `welcomeDestinationStillMatches()` requires that same active identity,
object ownership, names, Inbox existence/absence, and path immediately before and
after a fresh `chrome.tabs.get()` of the immutable reviewed source descriptor.
Missing, ambiguous, renamed, replaced, navigated, newly active, moved-window, or
conflicting-pending authority returns to review before persistence or source cleanup.

`welcomeSavePending` owns the transaction from the first exact re-resolution through
the accepted Inbox handoff. It marks the filing sheet busy, disables Save, Retry, and
Explore, consumes Escape without closing, and leaves Tab trapped. Known failure
releases the interlock and returns focus to Retry or the reviewed Save. The save
action still reuses `saveTabToInbox(..., { closeSource: true })`, hands an
acknowledged save to Inbox, and focuses that saved tab's direct native title/Open
action; failure keeps the dialog and source tab available. The production DOM
presents the real source and exact destination as equal fields around the same cobalt
locator used by Home, stacking the route at 800 px without adding another page,
route, or data model. A focused Group route asks `buildGroupCol()` for a render-only
expanded column, so an existing board collapse preference cannot hide the handoff
and is not rewritten. `itemFocusTarget()` is direct-child scoped so a Stack never
borrows a nested tab's primary action. Its local key handler
traps Tab, consumes Escape before it can reach lower surfaces, and restores the
remembered opener. Replays from Settings restore the Settings opener before
opening the welcome so focus never returns to a hidden control.

`#item-detail` is a route-backed modal recovery sheet, not a second page or a
non-blocking inspector. Home, Board, and Library routes carry `?item=<id>`;
Search adds `detail=1` to distinguish its selected preview from the open sheet;
group routes carry `/item/<id>`. Every id is validated against the route's workspace
and category/group before display. Library additionally requires one globally
unique item in the current query/status result, so a moved, duplicated, stale, or
filtered item closes instead of borrowing the wrong context. Home is likewise
strict: preview activation and
every Home-detail rerender require one globally unique item plus one unique owning
Space in the requested Workspace. The native Home row opens `/home?item=<id>` over
the rebuilt Home rather than selecting or rendering the owning Space. This keeps
the active Space and saved layout unchanged and prevents Canvas position
initialization from becoming a side effect of recovery. The sheet names the exact
item through its accessible dialog heading and one visible primary editor/preview.
Its `idp-docket-line` projects the complete wrapping Workspace › Space › Group
location beside the localized item type; the header does not repeat a second visible
title. Why saved, Reminder, and Tags use aligned filing rows, while Cover, Checklist,
and Custom fields remain in the existing Advanced disclosure. This presentation
layer adds no stored field or route. Saved links open through `openSavedTabItem()`;
Open is a browser effect, not a detail persistence transaction.

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

Group/Space reminder removal is a separate exact-target transaction that reuses
the localized reminder dialog across Group, Space, and Calendar destructive entry
paths. `createEntityReminderRemovalContext()` freezes primitive owner location and
runtime identity, the stable reminder ID, reminder object identity, and its value
fingerprint. `resolveEntityReminderRemovalTarget()` permits harmless sibling
reordering but requires exactly one unchanged active owner and reminder; missing,
duplicate, replaced, changed, moved, archived, or trashed targets fail closed.
Pre-existing state recovery blocks the operation before snapshot or mutation. A
valid removal takes one localized snapshot, removes the reminder found by stable
ID, and awaits one `State.persistNow({ reconcileReminders: true })` receipt. The
service worker remains the sole alarm authority. Rejected or acknowledgement-
unknown writes keep the dialog and recovery state without close, render, or false
success. Accepted state plus alarm failure keeps the removal, warns locally, and
offers exact Undo.

The shared removal pending token blocks duplicate activation, Escape, close,
scrim dismissal, lower shortcuts, browser Back/Forward, and programmatic route
changes while preserving the dialog's Tab trap. Route handling checks again after
detail-editor blur before applying or persisting another route.
Acknowledged completion returns focus to the next reminder, then the previous
reminder, then a current owner control; cancellation restores the exact opener.
`openEntityReminderPickerOrReport()` covers captured menu entries that become stale
after current state is adopted: it refreshes the current surface, reports the
localized failure, and schedules the current owner fallback instead of silently
discarding the action.
English and zh-TW names, status, errors, warning, and Undo copy are part of this
boundary.

Group/Space reminder add, edit, and Calendar reschedule use the sibling
`commitEntityReminderMutation()` transaction. Picker review freezes the exact
Workspace/Space/optional Group object and location plus the optional stable
reminder ID/reference/value. Add retains owner authority across harmless
reminder-list changes and allocates against the current unique IDs; edit permits
harmless sibling reorder but rejects target or owner replacement/change/movement.
`buildEntityReminderMutationValue()` preserves fields outside the editor's
ownership, keeps the stable ID, normalizes supported recurrence, and lets Calendar
reschedule own only `at` and `notified`. A semantic no-op writes nothing.

A real mutation installs the shared pending token before graph change, takes one
localized Set/Update snapshot, and awaits exactly one
`State.persistNow({ reconcileReminders: true })`. The new-tab page contains no
entity alarm reconciliation loop. Picker pending state remains open and busy;
non-picker Calendar pending state makes the lower page inert and blocks global
shortcuts. Both block duplicate mutation and route/history changes. Accepted
completion releases the interlock, renders once, focuses the exact stable Group
row or Calendar dot (then owner fallback), and exposes Undo or the alarm warning.
Rejected or acknowledgement-unknown writes retain the one dirty graph behind
fail-closed recovery without render, retry, rollback, or success. Calendar freezes
the entity mutation context on `dragstart`, then submits that reviewed context on
drop. Native installed drag and MV3 receipt lifetime remain verification
requirements, not architectural assumptions.

The reminder pending token joins the detail mutation boundary synchronously, so it
blocks duplicate activation, picker/detail close, navigation, other detail edits,
and app-wide shortcuts while keeping Tab contained and usable. Recovery remains the
top layer; otherwise Escape closes the reminder before the detail and focus returns
to the rebuilt Set or Change control. Stack identity continues through the existing
receipt-gated identity editor; Archive and Open remain separate actions.
Non-detail item reminders retain their own exact controller. Calendar Add-task
uses a separate reviewed exact-destination controller whose one combined
state-plus-alarm receipt owns close, render, focus, feedback, and recovery.

While open, `#app` and the launch layer are inert, Tab stays in the sheet, and
Escape blurs/commits an active editor before a subsequent Escape closes when no
receipt owns the foreground. The fully localized reminder picker and recovery
interlock retain precedence; independent inert owner tokens prevent any one layer
from unlocking another, and a lazily mounted body surface inherits owners for
dialogs that are already open. Close and browser history restore the remembered
opener, then the exact rebuilt Home origin, then a current native Home row for the
same item, then a saved tab's rebuilt direct title/Open action, then the ordinary
same-item/heading fallback. Group identity completion skips a hidden focused-page
collapse control and restores to the visible More action. Home and Search detail
open/close use `persist: false`; Back/Forward compares the durable active Workspace, active Space,
and layout selection before deciding whether route application needs a state write.
An ephemeral Home/Search-detail change therefore renders without persistence, while a
real durable route selection still persists. Stale routes remove the sheet and
owned inertness without changing schema or stored item shape.

The command palette is an overlay, not a route. `buildPaletteCommands()` rebuilds
its localized actions from current workspace/Space/group/layout state whenever it
opens; recent and query link rows come from `collectWorkspaceTabs(activeWs())` and
reuse the board's local operator matcher. Commands must call existing navigation,
capture, settings, and persistence paths rather than maintaining parallel state.

The prominent `#topbar-search` control is the primary Find-again route entry, not
a command-palette alias. It and the global `/` shortcut call
`openSearchSurface()`; `Ctrl/⌘K` remains exclusively assigned to the command
palette. The pill shares Landing's saved-work copy, exposes `/` only visually, and
is hidden while the Search route owns its dedicated query field. Entering Search
and returning Home both navigate with `{ persist: false }`; neither ephemeral
route transition may advance durable state.

Search is a first-class `…/search` route. Query text, type/Space/time/tag filters,
sort, filter-panel visibility, selected result, ephemeral detail-open flag, and a
non-default 100-row result window ride its hash query so reload, back, and forward
restore the view without a schema field. `collectWorkspaceItems()`
walks links, notes, tasks, stacks, and nested stack contents; `searchItemMatches()`
is the data-level operator matcher reused by the launch layer and command palette.
Search defaults optional filters closed and treats its route as Find again, not an
analytics dashboard. `searchHiddenFilterCount()` projects the panel-owned Space,
time, and tag dimensions onto the existing toggle; tag and Has tags share one
dimension, while the always-visible query, type, and sort controls are excluded.
The cue is presentation-only: it neither opens the panel nor changes route or data.
`searchFiltersActive()` and `searchFilterResetPatch()` give the panel and no-result
recovery one filter definition: type, Space, time, Has tags, and exact tag reset;
query, sort, and panel visibility remain independent. The panel action is disabled
at default filter state. `_searchSet()` still clears stale selection, replaces the
route, restores query focus, and resets an expanded window after filter changes.
The rendered surface is one locator ledger: the query and flat type rail precede a
results/selected-record split. `_searchResultRow()` projects the complete exact
Workspace › Space › Group location before optional snippet/tags and exposes saved
age independently; it does not derive or persist another location field.
`syncSearchQueryClear()` removes the custom Clear control from layout, keyboard
order, and activation while the exact mounted input is empty, then restores it
immediately for ordinary or composing text without waiting for result debounce.
Clear retains the established query-only `_searchSet()` patch and query focus
return; it never resets filters, sort, panel visibility, route history, or data.
`_searchDetail()` places `search-detail-actions` immediately after the same shared
recovery path, while the established safe Open and Search-owned Details controllers
remain its only effects. Above 1100 px an opened `.search-filters` spans the ledger
as a tray; at 1100 px the detail slot spans below results, and at 900 px the surface
becomes one block. These are presentation projections only. Every result still
carries the shared exact recovery context.
Settled-query Enter, result Enter/double-click, and Open page re-resolve that
context and pass only allowlisted `http:`, `https:`, `ftp:`, or `file:` tabs to
`openSavedTabItem()`. Composing input stays mounted until `compositionend`, and a
debounce captured by an older Search object cannot render, sync, or focus a newer
session. Debouncing or IME-composition Enter is inert. Missing,
duplicate, replaced, renamed, moved, URL-edited, or Workspace-switched contexts
fail without changing route or state and restore initiating focus. Non-tabs and
unsupported legacy addresses expose View details instead; `_searchOpenDetails()`
adds `detail=1` to the same globally resolved Search route with `persist: false`,
cleans prepared detail metadata if navigation is interlocked, and never selects
or persists another active Space. Detail opening additionally requires the exact
item to remain in the route's current visible result window. The default window
is 100 rows; `shown=<multiple-of-100>` deliberately expands it without durable
state. `showNextSearchResultBatch()` selects and focuses the first new row, uses
URL replacement rather than adding history noise, and rejects stale-session focus.
Query/type/Space/time/tag/sort changes reset the window to 100. Close and
browser Back retain every Search field and restore the rebuilt exact result focus;
filtered-out or removed detail targets clear selection, sheet target, and URL
together. Query/result arrows move focus through mounted roving options, with
Home/End and nearest scrolling; selection updates the attached row and detail pane
in place, so a real click-click-double-click sequence remains deliverable. A
persistent signature-deduped live region announces loading/result-count/visible-
progress changes. The quiet continuation is a sibling outside the listbox rather
than another option; no scroll observer is used. Populated results alone own the
bounded scroller, forced colors retain selected/
pressed state, and long user tags wrap. Search intentionally has no quick Favorite
mutation; item detail and Library remain its owners.
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
`archive→storage`). `data-settings-layout="ledger"` identifies the current visual
contract: CSS counters turn the rail into an eight-entry filing index, one outer
`.drawer-sections` boundary owns each active pane, `.sp-grid` is presentation-only
`display: contents` where legacy panes still use it, and every `.drawer-sec` remains
a labelled ledger row. General, Appearance, Capture, and Privacy use their newer explicit
preference/contract rows inside the same outer boundary. Do not remove wrappers or
stable ids merely because CSS flattens them; renderers and bindings still address
their descendants. `setSettingsSection()` keeps the active index entry
visible without moving focus, while `openSettingsDrawer()` focuses that active entry
so specific-section deep links do not announce General first. CSS lives under
`/* ═══ SETTINGS PAGE / CONTROL LEDGER ═══ */` + `.sp-*` classes in `newtab.css`;
the index folds to a horizontal strip below 880 px and row labels stack below 620 px.
General and Appearance keep core controls in two-column ledger rows above 800 px,
stack those rows at 800 px, and reduce optional plugin content to one column at
620 px. Privacy keeps its four exact fact records in two columns through 800 px and
stacks them at 620 px. The native Workspace-extras, Style, and Screen-share-mask
plugin disclosures do not add another Settings route or stored plugin state.

## Cross-file invariants

- `manifest.json` requests exactly `tabs`, `storage`, `contextMenus`, `bookmarks`,
  `alarms`, `notifications`, and `favicon`. Keep host and optional permission lists
  absent/empty, and do not add manifest content scripts or `externally_connectable`.
  `validateManifestTrustBoundary()` in `scripts/quality-gates.js` owns this release
  allowlist and its detached negative probes. Any expansion requires a separate
  product/privacy decision plus matching user and Store disclosure.
- Release extension pages stay network-silent by construction. Keep
  `connect-src 'none'`, packaged/data/blob resources, and Chromium's local
  `_favicon/` endpoint. `validateExtensionNetworkSource()` rejects direct request
  APIs plus remote HTML/CSS resources across the release source lists. Explicit
  user actions may still navigate tabs to saved HTTP(S) destinations; do not
  misclassify that core browser effect as extension-directed traffic.
- User-facing organization copy is Workspace → Space → Group, with independently
  authored English and native zh-TW values. Import diagnostics/review and Explorer
  translate the durable `categories` model only at the presentation boundary;
  storage, migration, routes, reminder owner kinds, and import/export schemas keep
  their existing field names. Generic symbol categories and Finance transaction
  categories remain domain terms rather than organization labels.
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
- Actionable native-notification clicks use
  `openConfirmedNotificationContinuation()` for any new local route. One create
  must return a non-negative integer tab ID, and one fresh read of that exact ID
  must confirm an active tab, a non-negative integer window ID, and the exact
  committed or pending extension URL before the notification clears. A non-empty
  pending URL is authoritative; malformed, whitespace-only, conflicting, inactive,
  unreadable, or otherwise unconfirmed outcomes keep the receipt and are never
  retried. Popup Locate exact-route reuse remains a stricter branch before this
  shared fallback. A generic Home receipt from an overlong imported/legacy locator
  remains a separate known cleanup-authority gap; exact post-receipt destination
  validation does not make that notification actionable.
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
  occurrence no longer belongs to the stored reminder. Item and Group/Space delivery
  then await `createNativeNotification()` before advancing accepted state through
  the central writer and reconciling the complete alarm map. That settle-once
  boundary owns callback-only, Promise, and hybrid completion, including callback-
  scoped `runtime.lastError`. A pending native create performs no reminder mutation,
  state write, or reconciliation. Native creation failure leaves authority untouched;
  confirmed creation permits exactly one reminder mutation, followed by one central
  write and then complete alarm reconciliation. Writer failure
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
- Rich-text Link creation is one exact-selection dialog shared by Board Notes,
  Group READMEs, and item-detail notes. `captureRichTextLinkSelection()` accepts
  one non-collapsed Range whose endpoints share one connected editable
  `.note-text`; the dialog freezes that editor reference, HTML, text, boundary
  nodes, and offsets. Confirmation permits only normalized HTTP(S), rechecks the
  whole frozen identity, temporarily releases only its own inert owner, restores
  the Range, calls `createLink` once, and dispatches one bubbling `input`. Each
  owning editor retains persistence/history authority: Board Notes use their exact
  receipt controller, Group READMEs retain their dirty blur path, and item-detail
  notes use `commitItemDetailMutation()`. Dialog-induced blur is ignored only while
  that exact editor is owned. Cancel, invalid/stale targets, and failed commands
  write nothing; recovery always stays above the Link interlock.
- Board Note body, To-do text, and marker editing exist only in the route-backed
  saved-item Details sheet. `detailPrimaryEditor()` and
  `detailItemMarkerPicker()` share the exact `commitItemDetailMutation()` receipt;
  Board cards are native read-only locators. Rich Note HTML is sanitized and
  auto-linked after a non-Link-owned blur. Standard/No marker choices change only
  the compatible nullable `item.color` slot. A current imported custom marker is a
  truthful selected, non-writing choice whose bytes feed only `background-color`.
  Stale, moved, duplicated, replaced, recovery-owned, rejected, or acknowledgement-
  unknown targets never produce success, repaint, retry, or normalization.
- Board and command-palette Note/To-do creation uses
  `createBoardLocalRecordContext()` / `resolveBoardLocalRecordCreateTarget()` and
  `createBoardLocalRecord()`. One exact item-list receipt and one
  `State.persistNow()` acknowledgement precede render and focus in the new Details
  field. Pending creation owns the real footer opener and blocks duplicate,
  navigation, Escape, lower shortcuts, Archive, selection mutation, and completion.
  Failure stays behind recovery; accepted command-palette creation first reveals
  the real Group, then opens the new editor.
- Board To-do checkbox and context-menu completion share
  `toggleBoardTodoCompletion()`. It freezes and re-resolves the exhaustive
  non-detail item context, accepts only the exact current `todo`, takes one
  localized next-consequence snapshot, inverts only `done`, and awaits one
  `State.persistNow()`. The DOM retains the previously accepted `aria-pressed`,
  accessible name, and checked appearance while its checkbox/card reports busy.
  An exact ancestor-sibling inert path plus route/history, programmatic-navigation,
  global-shortcut, and duplicate-pending guards owns the wait. Acceptance alone may
  release, render, and focus the rebuilt checkbox; stale, changed, retyped,
  recovery-owned, rejected, or acknowledgement-unknown outcomes perform no retry,
  false render, focus, or success claim. Details owns text editing separately.
- `buildNote()` and `buildTodo()` share a local-record presentation boundary:
  localized type stamp, in-flow reminder, read-only clamped excerpt, and one
  item-named More button. Their shells remain programmatically focusable only
  (`tabIndex=-1`), while the direct native body action opens Details.
  `bindBoardItemContextMenu()` resolves the real focused child for pointer, Context
  Menu, and Shift+F10 entry. Escape restores the actual opener instead of a redundant
  wrapper. The visible More button owns local Archive pending feedback; no direct
  destructive X, anchored color popup, slash writer, or inline editor remains.
- Popup capture target rendering is read-only.
  `resolvePopupCaptureDestination()` /
  `previewPopupCaptureTarget()` require one exact explicit, remembered,
  configured-default, or active Workspace/Space/Group hierarchy. A present but
  stale, incomplete, moved, or duplicate identity fails closed and never falls
  through to another target. With no Inbox, preview returns a detached proposed
  Group; `materializePopupCaptureTarget()` may insert it only after the real flow
  snapshots and re-resolves the reviewed primitive descriptor. A newly appeared
  or duplicate Inbox invalidates that proposal.
- `createPopupCaptureIdAllocator()` reserves IDs throughout the active graph,
  Archive, Trash, capture/default references, column sizing, and Canvas positions,
  then reserves every generated result. Single-tab, quick, links/queue,
  save-before-hibernate, Session Group, bookmark Group, tab, and note creation
  must share that allocator for one transaction. Session and bookmark import
  resolve the reviewed Space directly and never create an unrelated Inbox.
  Bookmark import prepares detached candidates, joins `popupCapturePending`, makes
  one state request, and restores its snapshot on rejection; an empty traversal
  writes nothing.
- An accepted ordinary popup single-tab save may call
  `closeOrdinaryPopupSavedTab()`. That helper dispatches one typed
  `locus-complete-quick-capture` close action only after the state receipt and
  accepts only `isValidQuickCaptureActionResult()` output. The listener enters
  `enqueueStateWrite()`, fresh-resolves the exact saved item and expected URL, then
  validates source tab/window/current/pending/active identity immediately before
  worker-owned removal. The popup performs no ordinary `chrome.tabs.get/remove`.
  Rejection, unknown acknowledgement, close-off, missing/replaced destination,
  changed source, malformed response, or effect uncertainty leaves the source open
  and never retries the accepted mutation. `showOrdinaryCaptureResult()` maps an
  authoritative missing destination to the existing unavailable copy and generic
  Open Locus continuation; protected/unconfirmed source results keep the immutable
  accepted-item Open intent with `closeSource:false`. Close remains popup-only and
  cannot retry cleanup. The card schedules no dismissal or retry. Confirmed close
  and intentional close-off keep their quiet completion. Locate and quick capture
  retain their established worker-owned consequence boundaries below.
- A single-tab popup save keeps Locate identity off the `locus-state-write`
  request. When the user explicitly chooses the localized post-save Open option,
  only a valid accepted state receipt permits the popup to dispatch the separate
  `locus-complete-popup-locate` request; rejected, timed-out, lost, malformed, or
  otherwise acknowledgement-unknown state dispatches no route or close effect.
  The Locate listener enters `enqueueStateWrite()` so no later Locus graph write can interleave from
  fresh resolution through the destructive browser effect. It fresh-reads authority
  and requires exactly one active item plus one unambiguous owning Space still
  inside the original Workspace. An already-queued write may run before this effect;
  the fresh resolver therefore remains authoritative rather than assuming that the
  just-accepted candidate is still current.

  That second request sends transient primitive source ID, window, original active state,
  expected URL, and close policy. The worker derives the encoded
  `/home?item=<id>` route only from the freshly resolved item and creates it inactive
  in the recorded source window. Before activation, a requested close fresh-reads
  the source and requires the returned ID, window, original active state, current
  URL, non-conflicting pending URL, and authoritative saved URL to match. It then
  activates the exact route, focuses its window, validates the returned active tab,
  and fresh-reads that route. Immediately before removal it fresh-reads the source
  again as exact and inactive, then fresh-reads the exact active route once more.
  An exact `pendingUrl` is sufficient to retain route identity during activation or
  a non-destructive retry, but it does not authorize cleanup: the final read must
  have the encoded route as its committed current `url`. Only that order may call
  `chrome.tabs.remove()`.

  Activation/focus failure leaves the source open. Before exposing a retry or
  route-specific notification, the worker fresh-reads the created tab and requires
  the same ID, window, and non-conflicting exact route URL; active state is not
  required because activation itself may have failed. Only that still-exact route
  ID, window, and encoded URL are retained for popup and notification recovery.
  Each delayed popup or native-notice click fresh-reads those exact facts before
  activation, requires the activation result to be active/exact, and reads once
  more after window focus; a reused, changed, navigating, inactive, or unavailable
  tab opens a fresh exact local route instead. Legacy notices without exact route
  authority fall back to generic Locus without reusing their tab ID. A route
  that changed or could not be confirmed closes nothing and is not returned as an
  exact retry tab. Changed, ambiguous, active, navigating, or unreadable sources
  remain open while the confirmed route stays usable. When the route is exact but
  source close cannot be confirmed, the worker returns strict
  `LOCUS_LOCATE_SOURCE_CLOSE_FAILED` with that route, the current exact destination,
  `sourceClosed:false`, `sourceCloseFailed:true`, and boolean `noticeShown`. The
  popup validates that receipt and keeps the existing Saved recovery result visible
  instead of closing itself. A known effect failure never changes the
  accepted state receipt or rolls data back. Once the separate effect is dispatched,
  a lost, timed-out, or malformed effect receipt is non-authoritative: the popup
  keeps the accepted save, retries neither open nor close, and claims neither
  browser outcome. A failed popup retry must update its
  polite live status. Securing and rechecking recovery before closing the source is
  mandatory.
  Keep this effect worker-owned after dispatch so action-popup teardown cannot
  interrupt its route/source checks; popup teardown before dispatch leaves the
  accepted item saved and the source untouched. Landing and automatic Welcome must not cover a
  valid Home-detail deep link, and suppressing them must not mark onboarding seen.
- A whole-window popup save is a two-phase worker boundary. The popup first awaits
  the ordinary revisioned `locus-state-write` receipt. Only a valid accepted
  receipt permits it to dispatch `locus-complete-window-save` with primitive
  Workspace/Group/source-window identity plus unique local
  `{ tabId, expectedUrl }` source descriptors; rejected, timed-out, lost,
  malformed, or otherwise acknowledgement-unknown writes dispatch no close request.
  The completion worker fresh-reads authority and requires exactly one globally
  unique receiving Group with one owning Space still inside the original Workspace
  before any source effect. A missing, duplicated, moved-out, or otherwise
  ambiguous destination returns `destinationReady: false` and closes nothing. For a valid
  close request, the listener runs `performPopupWindowSaveEffect()` through the
  same `enqueueStateWrite` FIFO and optional `locus-state-write` Web Lock as graph
  writes, holding that boundary from fresh destination resolution through all
  source-removal attempts. Another Locus mutation therefore cannot change the
  receiving graph between validation and the destructive browser effect. The worker
  accepts only unique non-negative integer tab IDs with a
  non-empty expected URL, excludes the popup's active `keepTabId`, and calls
  `popupWindowSaveGroupUrls()` before browser lookup; each expected URL must remain
  recursively present in the exact receiving Group, including nested Stacks. It
  then calls `chrome.tabs.get()` before each removal. The current tab
  must still belong to the recorded source window, satisfy `tab.active !== true`,
  match `expectedUrl`, and have no `pendingUrl` or the same pending URL at the last
  observable moment.
  Malformed/duplicate, no-longer-saved, moved, newly active, navigated, or
  redirecting candidates remain open or count unconfirmed. Its typed result reports
  requested, closed, and unconfirmed counts plus authoritative current
  Workspace/Space/Group identity and Space/Group names. Completion failure never
  rolls the already
  accepted saved graph back or recasts it as a failed state write. A lost,
  timed-out, malformed, count-inconsistent, destination-inconsistent, or otherwise
  unknown completion receipt labels the destination and all requested close
  outcomes unconfirmed; it must not claim that no source closed because the worker
  may have completed.
  Popup teardown before completion dispatch can therefore leave an accepted save
  with sources still open, but cannot trigger an unacknowledged close.
- The whole-window receipt remains visible in the existing popup result card; the
  active popup tab intentionally stays open. **Open destination** sends
  `locus-open-window-save-destination` with only Workspace/Group/source-window
  identity. The worker fresh-resolves the destination, reuses or creates the
  encoded `#/ws/<workspace>/group/<group>` route, then activates the exact tab and
  focuses its window. The activated Tab's returned current or pending URL must
  still equal that encoded route before the popup may treat the action as complete.
  After an activation failure, the popup keeps the destination identity and
  redispatches the worker on every retry; it does not directly activate a
  remembered Tab ID. A route that navigates during activation is rejected as a
  mismatch. A target that disappears after saving degrades to ordinary Open Locus
  without changing the accepted save. A valid first-use Group recovery route
  suppresses automatic Welcome without marking onboarding seen. The result primary's
  `aria-describedby` references the current destination, saved-content summary, and
  source outcome. The visible Space/Group path is receipt-only: it is rendered from
  `result.destination` only when `destinationReady === true`. Unavailable or unknown
  completion shows no pre-write target path while retaining its safe recovery intent.
- Ask-every-time-off single-tab quick capture keeps persistence and browser effects
  as separate receipt boundaries. `quickCaptureItem` rides the ordinary
  `locus-state-write` request only to produce an authoritative `quickCaptureResult`;
  rejection or acknowledgement-unknown state performs no quick browser effect. A
  valid accepted receipt leaves the source open and lets the popup render the
  existing result card with the current Space/Group names and title. **Open saved
  item** is primary. The secondary is **Close tab** only when configured; otherwise
  it is **Close popup**. The popup does not own a timer, toast, modal, notification,
  forced navigation, route creation, or tab removal for this path.
- State acceptance is authoritative before that optional destination projection.
  Once `setState()` resolves, malformed or unexpected receipt traversal cannot
  turn the response into a top-level write failure: it returns the accepted
  revision plus strict `destinationReady:false`. Present non-array Workspace,
  Space, Group, or nested item collections fail closed rather than being skipped;
  no graph repair, normalization, retry, migration, or browser effect follows.
  Exact success additionally requires primitive non-empty owner/item IDs and
  primitive Space/Group names. Nested traversal avoids variadic array arguments so
  a large valid Stack can still prove one exact destination.
- Quick-capture Open and Close are explicit `locus-complete-quick-capture` worker
  actions serialized through `enqueueStateWrite()`. `quickCaptureItemReceipt()`
  fresh-resolves exactly one active item with the expected saved URL and one owning
  Space inside the original Workspace. A same-Workspace move or rename is valid and
  returns current identity/names; missing, duplicate, stored-only, moved-out, or URL-
  changed items are unavailable. Open reuses or creates the encoded
  `/home?item=<id>` route in the source window when possible, activates the exact
  tab, focuses its window, and requires the activated tab's current or pending URL
  to equal that route.
- A quick-capture source close additionally requires the exact source tab and
  window, current URL equal to the captured/saved URL, no different pending URL, and
  no inactive-to-active transition. For Open-with-Close, the worker reads the exact
  route after activation/focus and reads it again after source validation
  immediately before removal. A missing or changed route, unconfirmed route,
  protected active source, unconfirmed source, or removal failure fails closed. The
  last browser read and effect cannot be atomic; keep that check-to-effect interval
  in installed-risk reporting. An unexpected completion failure returns typed
  `effectUnknown`; the popup retains safe Open identity but disables destructive
  Close. Known route activation failure remains retryable from the exact identity.
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
  not advance `_revision`. The boot `setViewMode(getViewMode())` pass persists only
  when the layout actually changes, and `persistBootChanges()` after the first
  render saves on-demand slices that rendering created (Pomodoro, floating widgets,
  window bindings) once, only when the graph differs from storage. `chrome.storage` hands every object back with
  its keys sorted, while in-memory graphs keep insertion order, so every graph
  comparison inside `State` (self-write echo, equal-revision equality, dirtiness,
  recovery) goes through the sorted-key `stateJson`; never compare raw
  `JSON.stringify` output against a stored graph (review-dialog fingerprints
  outside `State` still do; see STATUS.md Known issues).
- Popup `doSave`, `hibernateSingle`, `hibernateSelectedScope`, `saveWindow`, and
  bookmark import share `popupCapturePending` from before mutation or tab navigation
  through their browser-side effects and required refresh. One-tab Hibernate updates
  the reviewed tab once, reloads only after success, retries nothing, and releases
  the shared interlock on every outcome. After acquiring that interlock, both
  Hibernate paths await the already-serialized `popupStateWriteQueue` before their
  first tab query/effect, so an earlier selection/preference receipt cannot be
  overtaken by the following whole-state reload. Single Hibernate freezes its
  reviewed tab ID/window/active/URL/display fields before that wait. Bulk drains the
  queue, discovers candidates, then freezes them before optional Save-before
  persistence. Immediately before each replacement,
  `confirmPopupHibernateSource()` fresh-reads the tab and requires the same ID,
  window, active state, current URL, and an absent, empty, or exact pending URL. A
  changed, newly active, redirecting, malformed, or missing source stays open. Bulk
  Save-before persistence remains accepted and exact siblings continue; no skipped
  or failed browser effect is retried.
  Pending capture also owns popup Back, Escape, Ctrl/Cmd+K, and competing controls.
  Popup writes use the same bounded receipt deadline and late missing-receiver retry
  closure as new-tab; an unknown/protocol outcome blocks another capture until the
  popup is reopened. Ordinary whole-window saves now use their separate typed
  destination/source result; ask-every-time-off quick capture uses its own
  authoritative result plus explicit worker-owned Open/Close actions. Asked
  ordinary single-tab Save/Locate remains its distinct accepted-state then
  separately dispatched worker-effect path.
- Popup section navigation uses a true last-opened-first-closed history. Opening a
  section records its exact prior section and opener; Back and non-result Escape
  pop one entry and restore that opener only when it remains visible and enabled.
  Recovery and shortcut resets clear the stack deliberately, so a hidden Back
  control cannot receive focus. Save and hibernate radiogroups keep exactly one
  roving Tab stop; localized `data-pop-aria` names cover the save-options group,
  custom tag field, and optional window-note field.
  `setMainCaptureReadState()` separately owns the main section's loading, error,
  and ready states plus native/ARIA availability for Search, Save, Hibernate, and
  More › Save current tab. `renderLoadingState()` and `renderLoadError()` never
  reuse a success receipt; the atomic error names the consequence, rebuilds one
  Retry, and focuses it. `mainCaptureFocusTarget()` chooses only a visible enabled
  search/Save target after recovery or section return, while
  `renderSearchShortcutHint()` projects the current platform without changing the
  shared Ctrl/Cmd+K command.
  New-tab `commitCapturedTabs` uses `captureCommitPending` and rolls back a second
  optimistic capture before it can enqueue or close a source.
  `syncOpenTabRailCaptureControls()` projects that same boundary into disabled,
  localized rail Save controls; it is presentation only and cannot authorize or
  retry persistence. `dataMutationEpoch` prevents capture failure or failed Redo
  from restoring an older graph over a later ordinary edit.
- New-tab source closure uses an immutable `capturedTabSourceDescriptor` with a
  non-negative tab/window ID, exact URL, and reviewed active state. Opened-tab
  drag payloads retain that complete descriptor instead of reducing it to a tab
  ID and URL. Because the rail cache refreshes asynchronously, every drag-drop
  commit that can close a source also fresh-reads each exact source before
  persistence and replaces the cached active/pinned fields only when ID, window,
  URL, and pending URL still match and the current-window source is inactive.
  Activation before that asynchronous read settles is protection, not new close
  authority. If any ordinary state mutation occurs across the pre-read, the
  combined graph may still persist but every source is protected; a failed write
  must also preserve that later edit behind explicit recovery.
- A separate post-receipt `chrome.tabs.get()` and
  `capturedTabStillMatches()` check remains mandatory before removal. Missing or
  malformed identity, a moved window, navigation, conflicting/malformed pending
  URL, or an originally inactive source that is now active is recorded as an
  unclosed source. Unchanged multi-drag siblings remain independently closable;
  do not retry the accepted graph mutation or close by stale ID alone.
- Capture Undo is action-scoped. Keep it blocked while `capturePending`, preserve
  `restoredTabId` across retries, and use `mutationEpoch` checks around asynchronous
  tab reopening so Undo cannot replace a newer in-page mutation or reorder history.
- Render favicons through Chromium's local `_favicon` endpoint. Stored legacy
  `fav` metadata may be preserved for portability but must never be inserted as a
  remote image source; extension CSP keeps `img-src` local/data/blob and
  `connect-src 'none'`.
- background.js and popup.js each retain plain-script capture helpers rather than
  a shared module. The background copy is intentionally stricter for unreviewed
  context-menu/shortcut capture: exact tuple resolution, retained-ID allocation,
  one guarded write, post-receipt exact destination authority under the writer
  FIFO/Web Lock, and fresh source-tab checks are mandatory. Popup and
  newtab.js (`captureTabFields`) own reviewed UI flows and must be audited
  separately when shared field semantics change.
- Do not reintroduce background capture by Group ID alone, stale configured-target
  fallback, raw `uid()` assignment, `currentWindow` Session queries, implicit
  Inbox creation for an existing Session destination, or post-receipt blind tab
  removal. Route context-menu and shortcut saves through
  `resolveCaptureDestination()` / `resolveCaptureTarget()` and one `setState()`;
  only the accepted result may badge success, and source cleanup must re-enter the
  writer transaction to fresh-confirm its exact accepted hierarchy/item before
  exact tab revalidation.
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
  Board, Canvas/focused Group, and List menus must use `groupActionMenuItems()`,
  whose Move section delegates to `organizationGroupMoveMenuItems()` and
  `openOrganizationGroupMove()`. Keep the
  destination draft unselected until the user chooses it, re-resolve one active
  Workspace plus unique source Space, destination Space, and Group IDs, and require
  a second confirmation when displayed names, destination order, or counts change.
  One transaction moves the current Group object, transfers its source Canvas
  position, updates its exact remembered-capture and Archive/Trash item restore
  references, and preserves the active source Space. Await one `persistNow()`
  receipt before product render, selection pruning, close, destination-Space focus,
  feedback, or exact-action Undo; an unknown receipt stays behind recovery with no
  retry, rollback, or success claim.
- Do not restore four equal Group footer controls or duplicate Note/To-do/Stack
  creation in Board More. Preserve the stable `data-act="add-tab"` capture seam,
  keep **Save here** visually primary, and route supporting record creation through
  `groupRecordCreationMenuItems()`. That helper must require the same exact rendered
  Group object returned by `identityGroupTarget()`; Board owns one visible Add-record
  disclosure, while List owns the shared contextual copy inside More. Every menu
  disclosure must reset `aria-expanded` on selection, outside close, replacement,
  and Escape while retaining the activating control as opener.
- Do not reintroduce `activeCat()` authority at Paste links submit, raw `uid()`
  allocation, fire-and-forget `State.persist()`, or pre-receipt close/success.
  Freeze the exact Workspace/Space and reviewed Group, re-resolve before history,
  permit only harmless sibling reorder, and require review or fail closed for
  changed/missing/ambiguous targets. Prepare collision-safe Group/items before the
  localized snapshot, mutate once, then await one `persistNow()` receipt. Pending
  owns duplicate activation, dismissals, Escape, background shortcuts, and routes;
  rejection stays behind recovery, while acceptance alone may render, close,
  restore focus, report success, and expose the exact action ID for Undo. Preserve
  manual HTTP(S)-only input, local `_favicon` references, visible English/zh-TW
  naming, stable existing element IDs, schema/import compatibility, and zero host
  permissions.
- Do not reintroduce inline/contenteditable or per-surface Group/Stack identity
  mutations. Route explicit create/edit and selected-item Stack creation through
  `openIdentityEditor()` with primitive IDs. Re-resolve the complete parent path,
  preserve untouched imported fields, reject nested/cross-Space batch selections,
  allocate against active/Archive/Trash IDs, and wait for the acknowledged
  `persistNow()` receipt before render, close, focus, selection clearing, feedback,
  or exact-action Undo. Keep the emoji picker draft-only below the editor and
  recovery above both layers.
- Do not reintroduce Board/List-local Stack menus, direct `archiveItem()` lifecycle
  actions, or action resolution from ID alone. Feed the exact rendered Stack, parent
  list, Group, and actual opener to `stackActionMenuItems()`; refuse stale/moved
  ownership, and keep complete Stack removal behind the accepted-storage local-item
  Archive transaction and its recovery/focus rules.
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
- Do not reintroduce hidden, hover-only, pointer-only, or layout-specific item
  selection controls. Board, focused-Group, List, and Stack records must delegate
  to `attachItemSelection()` so native Enter/Space, localized item identity,
  checkbox state, Shift range behavior, visible focus, and exact post-render focus
  stay aligned. Selection remains ephemeral and must not become a stored item byte.
  Optional detail discovery must remain a native conditional action owned by
  `applyItemMeta()`; never render a decorative Details row for absent metadata or
  restore hardcoded glyph/title summaries. Custom cover bytes may feed only a
  color property, never an image-capable background shorthand.
- Do not reintroduce captured-object, first-match, debounced, or per-control direct
  saved-item detail mutations. Keep the accessible exact item heading, one visible
  primary identity, and the complete wrapping Workspace › Space › Group docket path;
  do not restore the duplicated visible heading or clipped two-part location. Title,
  URL, task state/text, saved context, cover,
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
  failed alarm result remains accepted and receives the localized warning. Group/
  Space removal must use `commitEntityReminderRemoval()` with a frozen stable-ID
  context, fail-closed exact owner/reminder re-resolution, one localized snapshot,
  and the same combined receipt. It may tolerate sibling reorder only; pre-existing
  recovery, missing/duplicate/replaced/changed/moved targets, rejected writes, and
  acknowledgement-unknown writes must not mutate or claim success. The pending
  boundary owns duplicate activation, Escape, close, and scrim dismissal while Tab
  remains trapped; completion restores next/previous/current-owner focus and an
  alarm-only failure preserves exact Undo with a localized warning. Stack identity
  stays in the shared identity editor; Archive and the Open browser effect remain
  separate actions. Non-detail item reminders, Group/Space add/edit/reschedule,
  and Calendar Add-task use their separate exact receipt-gated controllers.
  Calendar Add-task must visibly review the date, 9:00 AM reminder, active
  Workspace/Space, and exact existing or proposed Inbox; allocate against active
  and retained IDs; and use one `persistNow({ reconcileReminders: true })`.
  Prompt, page-alarm, delayed-write, retry, rollback, and pre-receipt render or
  success paths are forbidden.
- Do not make real Home saved-item previews inert or route them through a stale
  object/first-match ID. Keep them native buttons with localized action names,
  re-resolve one globally unique item and one owning Space from primitive IDs, and
  open the shared sheet on `/home?item=<id>`. Viewing, closing, Back, and Forward
  must not select a Space, render an Advanced layout, snapshot history, or persist
  ephemeral route state. Missing, duplicate, ambiguously owned, or moved-out
  records fail closed without navigation. Preserve exact-origin focus first and a
  native current-row fallback when the item moved inside the Workspace.
- Do not let browser capture and Reopen disagree. Apply
  `isOpenableSavedTabUrl()` before every new-tab capture snapshot or graph
  mutation, including direct, selected, window, palette, Welcome, Space, Group,
  and Stack paths. Keep unsupported non-internal tabs in the opened-tabs rail for
  switch, selection, Clear, and explicit Close, but omit Save and drag authority.
  After an accepted mixed capture, clear only eligible selection, repaint, and
  restore focus to a retained row or the rail filter. Legacy/imported unsupported
  records remain readable and fail closed at Reopen; this rule is not an implicit
  import migration. Keep the rail's loading, Chrome-read failure/Retry, true-empty,
  filter no-match/Clear, selected, and pending states distinct. At 821–1280 px the
  existing toggle must open a real drawer; at 800 px and below neither `S` nor focus
  restoration may target the hidden rail.
- Treat the top-bar Save menu as a read-only review boundary. Resolve one exact
  active Workspace/Space and zero or one Inbox, then show the candidate title,
  source host, and complete localized Workspace › Space › Inbox path. Each action
  must retain that frozen destination, fresh-read the exact tab, reject changed
  tab/window/URL/pending/active identity, recheck the destination after the read,
  and only then delegate once to `saveTabToInbox()`. Multiple Inboxes, missing
  authority, changed identity, or changed destination must open no fallback and
  perform no write.
- Keep the top-bar capture receipt downstream of accepted persistence. Only the
  two explicit top-bar choices opt in to `saveTabToInbox(..., { receipt: true })`;
  the accepted item and its localized Workspace › Space › Inbox path share the
  existing toast with action-scoped Undo and one Show continuation. Show must
  re-resolve the frozen Workspace, Space, Group, ancestry, item reference, value,
  and location before a non-persisted exact Group/item route. It must not force
  navigation, retry the accepted mutation, fall through to another destination,
  or open anything when identity changed or routing is blocked. A receipt
  projection problem falls back to the existing truthful accepted-Save message.
- Do not make saved-tab recovery pointer-first. `buildTab()` keeps the wrapper out
  of sequential focus and renders one local record: localized link type, optional
  in-flow reminder, one direct native title/Open action, real source domain, and one
  item-named 40 px More control. The hover-only `.item-acts` strip and direct
  destructive X are retired. `focusItem()`, Board Arrow navigation, and detail
  return prefer the direct Open action without descending into a Stack.
  `bindBoardItemContextMenu()` converges More, right-click, Shift+F10, and the
  Context Menu key. It resolves the real invoking Open or More control, anchors and
  focuses the menu from that control, and preserves it for Escape return and
  receipt feedback. Copy URL reports success only after
  `navigator.clipboard.writeText()` resolves and exposes a localized failure state.
  Edit title routes through `openItemDetail(..., { initialFocusKey: 'title' })`;
  `prepareItemDetailOpen()` carries that one-shot focus intent across routed
  rendering while the detail receipt gate remains the sole writer. Foreground Open
  retains guarded reuse; Open in background deliberately passes `reuse: false`.
  Favorite/Read Later restore the rebuilt record. Archive exists only in More,
  remains addressable through `data-item-archive="menu"`, and waits for accepted
  storage before next/previous sibling, visible Group, or Board fallback focus. The
  detail Open button uses the same saved-address guard. Do not promote the Board
  Note/To-do color palette or a legacy direct reminder mutation into this saved-tab
  core menu; item color has its own receipt-gated Board transaction and reminder
  editing remains receipt-gated through Details.
  Focus must reveal sibling controls without changing layout. Trim display-only
  titles before URL/Untitled fallback without rewriting stored data. Guard every
  card Open effect through `isOpenableSavedTabUrl()`/`openSavedTabItem()` so blank,
  malformed, extension, script, and unsupported addresses create no browser
  effect. Focused Group routes remain visually expanded without changing the
  board's saved `group.collapsed` preference, and post-render Group focus must use
  a visible action.
- Home Space rows expose the stored `category.symbol` and at most one newest real
  item. Do not infer identity from names, synthesize per-Space accents, or restore
  the obsolete collections-strip/bundled-badge prototype.

## Focused selected-item action docket and batch mutation boundary (2026-08-12)

- `selectedItemIds` remains ephemeral UI state. `#item-sel-toolbar` remains the
  stable DOM owner but is now a localized `role="toolbar"`: count registry edge,
  guarded Open, exact Move, identity-editor Stack, exact Archive, and Clear. It is
  not a modal; while a batch write is pending, the originating action retains focus
  and an ancestor-sibling inert path makes the receipt the sole foreground owner.
- `createSelectedItemMutationContext(itemIds, { selectionOwned })` is the batch
  authority boundary. It requires nonempty unique IDs, exhaustive unique resolution,
  no selected ancestor/descendant pair, frozen document order, the same item object,
  the full item JSON fingerprint, and one exact Workspace/Space/Group/full-Stack
  list context per item. Toolbar reviews additionally require the current selection
  Set to contain exactly those IDs. A clean storage adoption therefore invalidates
  the old object references even when IDs and values happen to match.
- `createSelectedItemDestinationContext(list)` intentionally accepts a Group or
  Stack item list outside the active Space so the existing cross-Workspace Move
  behavior remains available. It reuses the capture-receipt context shape and
  `resolveItemListCaptureTarget()` but captures exact owner IDs, names, object
  references, full Stack ancestry, and the list reference. Move options omit every
  direct source list plus a selected Stack and all of its descendants.
- `commitSelectedItemArchive()` and `commitSelectedItemMove()` set
  `selectedItemMutationPending` before re-resolution. They reject competing receipt
  owners and recovery-required state, re-resolve selection and destination, take
  one localized snapshot, remove same-list targets in descending index order while
  retaining global document order, and await one `State.persistNow()` call. No
  selection clear, render, focus continuation, success toast, Undo, or destination
  action occurs before acceptance. A mutation exception requires recovery; rejected
  or unknown persistence leaves the optimistic graph hidden behind the recovery
  overlay and never retries.
- Accepted Archive writes full existing item objects into `state.archive` with the
  same Workspace/Space/Group metadata and one activation timestamp, then focuses a
  surviving sibling or Group. Accepted Move appends the same objects in document
  order, freezes `createCaptureDestinationReceiptContext()`, and offers exact Undo
  plus read-only `openCaptureDestinationReceipt()` when that receipt still resolves.
  Schema, imported custom bytes, item IDs, routes, and permissions do not change.
- `isSelectedItemMutationPending()` participates in Browser Back/Forward, direct
  `Router.navigate()`, global-key, selection-toggle, and Clear guards. The shared
  context menu retains Arrow/Home/End/Tab/Escape ownership; Board `M` creates the
  same review used by the toolbar rather than capturing a raw `findItem()` result.
- Presentation uses a 760 px flat Locus Index docket at wide widths and a 2×2
  lifecycle grid plus full-height Clear rail at ≤680 px. Selection mode reserves
  bottom board space. Forced colors replace sheet/registry/locator colors with
  Canvas/CanvasText/Highlight; reduced motion removes transitions. Do not restore
  blur, gradients, spring entrance, hover translation, rounded pills, hardcoded
  batch copy, raw destination-list closures, or delayed `State.persist()` here.

## Shared action-menu presentation and locale boundary (2026-08-12)

- `#context-menu` in `newtab.html` remains the single stable `role="menu"` host.
  `showContextMenu(x, y, items, opts)` still builds section labels, separators, and
  focusable `role="menuitem"` rows; owns Arrow Up/Down, Home/End, wrapped Tab,
  Enter/Space, outside dismissal, and Escape; tears down the previous listener set;
  and returns focus to the opener captured immediately before display. Action
  callbacks and their exact-target/persistence contracts are unchanged.
- The host now receives `opts.ariaLabel` or localized `menu.actions`, so dynamically
  built menus have a screen-reader name. `showAnchoredContextMenu()` and
  `bindAnchoredContextMenu()` remain the pointer plus Context Menu/Shift+F10 entry
  boundary and request first-item focus. Do not fork another core menu primitive.
- `layoutLabel(mode)` is the display-name boundary for Board, List, Canvas,
  Explorer, Timeline, Gallery, and Graph. It resolves independent English/native
  zh-TW dictionary keys. `LAYOUTS` retains functional metadata; the layout menu
  exposes Board/List first and routes every uneven layout through Advanced views.
  The command palette consumes the same localized layout names.
- Final Locus Index CSS, later in cascade than the legacy prototype block, bounds
  the menu to 220-320 px and the viewport, removes blur/spring entrance, and uses a
  flat theme-native sheet, 3 px top locator, 40 px rows, readable section labels,
  locator-plus-outline focus, reduced-motion suppression, and forced-color
  Canvas/Highlight equivalents. Danger remains text/locator scoped instead of
  becoming a full red hover slab. Schema, state, routes, permissions, and product
  effects do not depend on this presentation layer.

## Command-discovery projection and presentation boundary (2026-08-12)

- `SHORTCUT_DEFINITIONS` is the immutable command-discovery vocabulary. Each entry
  owns a stable ID, localized description key, default key tokens, surface membership,
  and optional Chrome command name. It does not own command execution; palette
  actions and their ordering remain in the existing command registry.
- `shortcutRowsForSurface(surface, commands)` is the only projection boundary for
  the Settings app list, Settings browser list, and compact shortcut dialog. It
  resolves locale copy at render time and returns fresh row/key arrays, so callers
  cannot mutate the definitions. Current projections are 14 app rows, 13 compact
  reference rows, and 2 browser rows.
- `readBrowserShortcutCommands()` is a guarded availability adapter around
  `chrome.commands.getAll()`. Browser command IDs and assigned shortcut strings are
  live authority; manifest/default tokens remain the immediate fallback; browser
  descriptions are never product-copy authority. An assigned command with a blank
  shortcut projects localized **Not set**. API absence or rejection keeps localized
  defaults and exposes an explicit fallback status instead of fabricating a live key.
- `renderShortcutsSettings()` and `renderCheatsheet()` paint defaults synchronously,
  mark their existing stable hosts busy, then use generation tokens so a late browser
  response cannot repaint a closed or superseded surface. Locale changes repaint an
  open dialog, visible Settings section, and open command palette from current state.
- `openCommandPalette()` retains the combobox/listbox interaction, active descendant,
  Arrow/Home/End/Enter, wrapped Tab, LIFO Escape, and opener return. The shortcut
  dialog retains contained Tab, outside/Close/Escape dismissal, and opener return.
  Final presentation CSS is later in the cascade: flat theme-native paper, dark
  query/dialog registry, 3 px blue locator, 44 px rows, explicit focus, no blur or
  entrance animation, viewport-bounded scrolling, narrow-screen description
  removal, reduced-motion suppression, and forced-color Canvas/Highlight mapping.
- Do not fork another shortcut model, trust localized browser descriptions, add a
  command to repair presentation, or promote Canvas/Explorer/Timeline/Gallery/Graph
  from Advanced through this boundary. State, routes, schema/import, stable IDs,
  permissions, and product effects remain outside it.

## Shared feedback receipt lifetime and presentation boundary (2026-08-12)

- `#toast` remains the one global in-page feedback host. Stable `#toast-msg`,
  `#toast-action`, and `#toast-undo` IDs remain; `#toast-close` is the single native
  explicit-dismiss control. The host is transient DOM only and must not become a
  stored notification feed, a second history model, or product state.
- `toast(message, options)` owns four presentation tones: `success`, `info`,
  `warning`, and `error`. The legacy `danger` option maps to `error` for caller
  compatibility. Errors use `role="alert"` plus assertive live delivery; all other
  tones use atomic polite status. Tone never changes persistence or product effects.
- A receipt is actionable when it has a valid labelled callback, an exact Undo
  action ID, or `persistent: true`. Actionable receipts receive no timer. Passive
  receipts default to a bounded timer; pointer entry or focus cancels that timer so
  the surface cannot disappear while it is being read or operated.
- `dismissToast({ restoreFocus })` is the dismissal owner. It clears timing, hides
  the host, and restores the connected opener only when focus was inside the
  receipt. Native Close and receipt-focused Escape use this path and stop before
  the global overlay Escape stack. Feedback never auto-focuses itself.
- Final CSS is later than the prototype block and presents one flat Locus Index
  filing receipt: theme-native sheet, 4 px tone locator, restrained shadow, 40 px
  controls, 3 px focus outline, no spring/scale entrance, deliberate 520 px action
  wrap, reduced-motion suppression, and forced-color Canvas/Highlight mapping.
- The host is bounded to the current viewport. If a long title, destination path,
  or outcome exceeds a short viewport, only `#toast-msg` scrolls; Open destination,
  Undo, and Dismiss stay pinned and visible. The tone mark aligns to the first line.
- At 520 px and below, the existing DOM sequence is also the visible sequence:
  `.toast-copy` spans row one, `.toast-actions` begins row two, and `#toast-close`
  finishes row two. The responsive projection must not put the last Tab stop above
  earlier controls or reorder the stable receipt children.
- `syncToastMessageScrollAccess()` gives that message `tabindex="0"` only while it
  has hidden vertical content, rechecks after each message and viewport resize, and
  removes the tab stop plus stale scroll position on dismissal or when all content
  fits. `handleToastMessageScrollKey()` confines Arrow, Page, Home, and End movement
  to the focused message. Neither helper auto-focuses the receipt or changes its
  live-region semantics, lifetime, action callbacks, or focus-return owner.
- Core cross-window, storage, Archive, intention, Stack, bookmark, export, no-tab,
  and capture-destination messages resolve from English/native zh-TW dictionaries.
  Advanced Canvas and tracker messages remain contextual and outside this slice.
  Do not change save acknowledgement, Undo IDs/callbacks, routes, schema/import,
  stable IDs, permissions, or browser effects through this presentation boundary.

## Storage-quota recovery layering and backup boundary (2026-08-12)

- `#quota-overlay` remains the one storage-quota surface and keeps its stable title,
  detail, meter, status, Close, Export, Archive, and reload IDs. It is an atomic
  `alertdialog` describing the unsaved current view, real or unavailable capacity,
  backup guidance, reload consequences, and live operation status.
- `showStorageFull()` is a fail-closed presentation adapter, not a persistence retry.
  It resets a generation-guarded usage read, releases any lower-dialog inert owner
  from the static quota overlay, remembers the opener, opens the sheet, and focuses
  Download backup. `storageUsage()` remains the only authority for browser-profile
  bytes; failure paints an explicit unavailable state rather than a synthetic value.
- `requestQuotaBackup()` reuses `exportJSON({ silent: true })`, which serializes the
  current in-memory State graph without its concurrency revision. That may be the
  user's only copy of the rejected edit. Pending disables every sheet action and
  blocks duplicate activation, Close, outside click, Escape, Archive, and reload.
  Completion claims only that a download was requested; the extension cannot prove
  that the browser finished writing the file.
- State recovery remains the authoritative edit interlock. Its inert owner excludes
  the quota overlay, making quota the only safe layer above it. When quota is open,
  `showStateRecoveryRequired()` uses localized reload consequence copy and does not
  steal focus. Closing quota while recovery remains visible transfers focus to the
  recovery Reload action, never to editable application UI.
- `reloadQuotaToArchive()` builds the existing Archive route for the current
  Workspace before reloading authoritative storage; plain reload uses the existing
  saved-data reload. Neither action deletes, retries, rolls back, raises quota, or
  claims to free capacity. Archive/Trash guidance states that space is released only
  after explicit permanent Trash deletion.
- Static copy and dynamic usage/pending/success/failure states resolve independently
  in English and native zh-TW. Final presentation uses the Locus Index dark registry,
  flat paper docket, 6 px blocked-write rail, real capacity meter, 44 px controls,
  one-column 520 px actions, no ornamental motion, and forced-color equivalents.
  Schema/import bytes, storage thresholds, stable IDs, permissions, local-only data,
  and the central writer remain outside this presentation boundary.

## Settings Storage exact-versus-estimate boundary (2026-08-12)

- `#dp-storage` keeps the existing Archive route and stable IDs while separating two
  authorities. `#storage-bar-meter` is the native named exact-usage meter backed only
  by `storageUsage()`/`chrome.storage.local.getBytesInUse`; `#storage-breakdown` is an
  explicitly estimated list derived from the current in-memory Locus graph. Never
  present the latter as browser quota truth or synthesize a capacity value.
- `refreshStorageUsage()` owns one generation token. It paints loading before the
  asynchronous read, ignores a late older result, then paints known/warning/full or
  explicit unavailable state. `#storage-refresh` remains focusable while busy but is
  guarded by `aria-disabled`; rendering, retry, and locale repaint do not move focus.
- `storageBreakdownModel(state)` is a pure presentation projection. It measures the
  serialized graph and its buckets with UTF-8 bytes, counts active tabs/Notes/To-dos/
  Stacks without double-counting Stack children, includes Archive and Trash only as
  disjoint nonempty buckets, and assigns the remainder to Workspace structure and
  settings. Bucket bytes must sum exactly to the total and the model must not mutate
  state.
- `renderStorageSettings()` paints localized Archive count/estimate, total, empty
  explanation, and descending ranked rows with DOM nodes. `applyLocale()` rerenders
  the pane only when visible, preserving the active control. The visual layer uses
  existing Locus Index tokens, 620 px stacking, reduced-motion suppression, and
  forced-color boundaries; it adds no storage write, cleanup, retry policy, route,
  schema/import change, permission, network access, or fake data.

## Settings Data transfer and JSON review boundary (2026-08-12)

- `#data-transfer-ledger` is a presentation spine over existing product effects.
  Outbound `#export-btn` remains first in DOM/keyboard order and serializes the
  current `State.get()` graph through `exportJSON()`. `renderDataSettings()` adds
  only a live count/UTF-8-size projection and honest FileReader/bookmark status; it
  does not create a second transfer model or claim browser download completion.
- The stable hidden `#import-file` remains the sole JSON input, but native
  `#import-json-btn` is now its named opener. `importJSON()` generation-guards every
  FileReader callback and clears the input after known read/parse/validation/conflict
  failure so the same file can be chosen again. The established size limits,
  `LocusImportUtils.normalizeLegacy()`, `validateImportData()`, rich-text sanitizer,
  schemas 0–13, accepted envelopes, raw legacy shape, and incoming bytes are
  unchanged.
- `#import-overlay` owns one `json-import` inert scope. `openImportPreview()` refuses
  conflicting recovery/dialog layers, remembers the real opener, locks body scroll,
  and focuses Replace. `confirmImportPreview()` disables modes and dismissal while
  one replace/merge application is pending; Tab remains contained, Escape cannot
  dismiss, and upper quota/state recovery keeps keyboard ownership. A failed or
  unknown persistence result remains behind review/recovery without success. An
  acknowledged Merge restores the opener; acknowledged Replace rebuilds Home and
  focuses its visible navigation control. Replace still requests the exact current
  portable backup before mutation.
- `importBookmarks()` freezes active Workspace/Space IDs, names, runtime references,
  and their owned Group list before `chrome.bookmarks.getTree()`. It re-resolves that
  exact authority after the asynchronous read, builds Groups detached from state,
  then takes one localized snapshot and awaits `State.persistNow()`. Replacement,
  rename, move, duplicate activation, read failure, or malformed results stop before
  mutation. Rejected persistence rolls the snapshot back and reports no success;
  only accepted persistence renders and exposes the exact action ID for Undo.
- The transfer ledger and review use existing Locus Index stock, registry, locator,
  receipt, focus, type, spacing, and forced-color tokens. Their 760/620/520 px and
  reduced-motion rules add no cloud sync, account, encryption, scheduling, transfer
  history, invented format, permission, host access, route, or storage schema.

## Settings Capture policy and preference-receipt boundary (2026-08-12)

- `#dp-capture` preserves the existing destination select and six checkbox IDs but
  projects them through one named `#capture-contract`. The route is Source tab →
  confirmed local copy → source after receipt. `captureSettingsContractModel()`
  derives the popup/direct-save choice, exact quick-save path, metadata record,
  duplicate rule, and close/keep consequence only from the current State graph and
  settings. Rendering never creates Inbox, writes preferences, or invents a saved
  page/title/domain.
- `captureSettingsResolveDestination()` mirrors the real capture precedence:
  remembered exact Group when enabled, fixed default Space, then active Workspace/
  Space. It requires one exact identity and ancestry at every level. Existing Inbox
  must be singular and globally exact; no Inbox is a valid proposed destination but
  is not allocated during presentation. Empty, duplicate, moved, malformed, or
  ambiguous truth returns unavailable rather than falling back. Destination options
  include only currently resolvable unique Spaces; a stored invalid default remains
  one selected disabled unavailable option for honest recovery.
- `commitCaptureSettingsChange()` admits only the stable Capture control IDs and
  allowlisted settings keys. It applies one synchronous patch, then awaits exactly
  one `State.persistNow()` without creating a separate preference writer or Undo
  snapshot. An explicit default clears `captureLastTarget` in the same patch. A
  successful receipt still requires the same State object, settings owner, and
  touched-value fingerprint; acknowledgement after graph adoption or preference
  drift requires authoritative recovery and reports no success.
- `captureSettingsPending` owns the initiating control until settlement.
  `paintSettingsPreferenceBusy()` disables every other tracked Settings
  preference plus Settings section buttons and drawer Close;
  duplicate activation rerenders the owned value and returns focus. Pointer outside,
  section changes, Escape, and lower shortcuts are blocked while Tab continues into
  the existing Settings focus trap. Rejection/unknown acknowledgement leaves the
  dirty view behind the existing recovery overlay. Known acknowledgement releases
  the interlock, paints the localized saved status, and does not move focus.
- Static and dynamic copy is independently authored in English and native zh-TW.
  Presentation reuses Locus Index stock/registry/locator/receipt/focus/type tokens:
  a horizontal transaction at desktop/800 px, vertical transaction at 620 px,
  restrained 3–4 px radii, no blur/fake preview/ornamental motion, plus reduced-
  motion and forced-color equivalents. Capture writers, source-tab close guards,
  setting defaults/bytes, stable IDs, schema/import compatibility, permissions,
  routes, and local-only privacy remain outside this presentation/preference seam.

## Settings General core and Workspace-extras boundary (2026-08-13)

- `#general-preferences` is the core General ledger. It promotes only the stable
  `#seg-language` interface-language control, `#tog-hibernate` saved-page opening
  choice, and `#show-tour-btn` first-save guide. Language is a native select and the
  two other controls retain their existing browser/recovery effects. The obsolete
  visible Profile card and implicit name-on-blur writer are not part of the core.
- `<details id="general-workspace-plugin">` contains the existing
  `#tog-autoswitch`, `#tog-landing`, and `#profile-name-input` controls. It is a
  locally packaged Workspace-extras plugin, not an install service.
  `generalWorkspacePluginIsActive()` derives Active from the two effectful booleans;
  a greeting name or missing Welcome byte does not invent an enabled plugin.
  `GENERAL_SETTING_DEFAULTS.showLanding` is false and the layer itself requires an
  exact stored true. `#profile-name-save`
  explicitly commits the trimmed name while preserving other compatible profile
  fields. Enter activates Save and Escape first discards an unsaved draft.
- `commitGeneralSettingsChange()` admits only `language`, `hibernate`,
  `autoSwitchWorkspace`, `showLanding`, or `profile`, validates one exact value,
  applies the real setting, and awaits exactly one `State.persistNow()` receipt.
  Language projects immediately through `applySettings()` plus `renderAll()` so
  static and dynamic copy agree. Invalid/no-op input writes nothing; success still
  requires the same State, settings owner, and touched-value fingerprint. Recovery,
  rejection, adoption, or drift yields to authoritative recovery without a saved
  receipt.
- `generalSettingsPending` joins Capture, Appearance, and Privacy inside
  `settingsPreferencePendingTransaction()`. `paintSettingsPreferenceBusy()` tracks
  all four kinds. The initiating General control owns duplicate focus while section
  changes, drawer Close/backdrop, plugin collapse, Escape, Back/Forward, and lower
  shortcuts are blocked; Tab remains in the Settings trap and normal drawer close
  retains opener return.
- General reuses the established Appearance preference-row/plugin visual grammar:
  sheet/paper surfaces, cobalt locator/focus, green accepted receipt, 3–6 px radii,
  800 px row stacking, 620/520 px name/action stacking, product Motion-off, reduced
  motion, and forced colors. English and native zh-TW name real effects rather than
  an account/Profile. Schema 13 changes only the absent/malformed Welcome fallback;
  explicit choices and every other settings byte/default remain compatible through
  imports. Welcome/profile/window behavior, stable IDs, routes, permissions, zero
  host permissions, and local-only storage otherwise remain unchanged.

## Settings Appearance core and Style-plugin boundary (2026-08-13)

- `#appearance-profile` is the core preference ledger. `CORE_APPEARANCE_THEMES`
  promotes only System (`auto`), Locus Light (`folio`), and Locus Dark
  (`folio-dark`); item size, card URL visibility, and Motion remain beside them.
  `buildThemeGrid()` creates native named buttons with `aria-pressed` instead of
  pointer-only specimen tiles. No preview artifact supplies product state or visual
  authority.
- `<details id="appearance-style-pack">` contains the fifteen existing non-core
  theme IDs, eight bundled font values, and three column-width values. It is a
  packaged local Style plugin, not a marketplace or installation service.
  `appearanceStylePackIsActive()` derives Available/Active from the current values;
  no `pluginEnabled` byte exists. `appearanceStylePackResetPatch()` returns only
  non-default theme/font/width keys, preserving item size, URLs, Motion, and content.
- `commitAppearanceSettingsChange()` admits only the six stable Appearance setting
  keys and their existing value sets. It applies one immediate local projection,
  awaits exactly one `State.persistNow()` receipt, and accepts only the same State,
  settings owner, and touched-value fingerprint. Invalid/no-op activations write
  nothing. Rejection, existing recovery, State adoption, or drift emits no success
  and yields to authoritative recovery.
- `settingsPreferencePendingTransaction()` and `paintSettingsPreferenceBusy()` are
  shared by General, Capture, Appearance, and Privacy. The initiating control remains the owner while
  other tracked controls, section changes, Close, Escape, Back/Forward, and lower
  shortcuts are blocked; Tab remains in the existing Settings trap. Normal close
  continues to restore the drawer opener.
- The visual seam reuses Locus Index stock, registry, locator, receipt, typography,
  focus, and restrained-radius tokens. Core/plugin rows stack at 800 px and optional
  grids at 620 px; product Motion-off, reduced-motion, and forced-color rules preserve
  the hierarchy. English and native zh-TW own the dynamic plugin and receipt copy.
  Stored theme/font/width/size/URL/Motion values, aliases, packaged theme files,
  prepaint, popup application, schema/import compatibility, stable IDs, routes,
  permissions, zero host permissions, and local-only privacy remain unchanged.

## Settings Privacy fact ledger and Screen-share-mask boundary (2026-08-13)

- `#privacy-contract` is the Privacy pane's named, busy-capable fact boundary. Its
  four records state only current release facts: workspace data and preferences use
  this browser profile; extension pages keep `connect-src 'none'` while explicit
  Open actions may navigate to saved sites; the manifest has zero host permissions
  and exactly the seven browser capabilities in the release allowlist; and recovery
  requires a user-kept JSON backup because uninstall/profile loss can remove local
  data. `#privacy-export-btn` reuses the real export request and retains the honest
  browser-download limitation; `#privacy-goto-data` routes to the existing review/
  restore surface.
- `<details id="privacy-screen-plugin">` contains the compatible `#tog-blur`
  preference. It is an already-packaged display utility, not a security control or
  install service. `privacyScreenPluginIsActive()` derives Available/Active only
  from `settings.blurPrivacy`; no plugin byte exists. The effect masks supported
  saved titles/locations and asks background capture receipts to hide the destination.
  It does not encrypt, delete, or rewrite saved data. Hover no longer reveals masked
  content, and masking has no ornamental transition.
- `commitPrivacySettingsChange()` admits only one boolean `blurPrivacy` patch,
  applies the display consequence immediately, and awaits exactly one
  `State.persistNow()` receipt. A saved state still requires the same State object,
  settings owner, and touched-value fingerprint. Invalid/no-op input writes nothing;
  recovery, rejection, adoption, owner replacement, or drift cannot report success.
- `privacySettingsPending` is the fourth shared Settings preference owner. It marks
  `#privacy-contract` busy, retains `#tog-blur` as opener/focus owner, disables other
  tracked controls and section/Close actions, blocks plugin collapse, pointer/
  backdrop dismissal, Escape, Back/Forward, and lower shortcuts, and leaves Tab in
  the Settings trap. Normal close retains the established drawer opener return.
- Presentation reuses the established registry/paper/locator/receipt tokens, native
  details/buttons/checkbox, 3–4 px radii, two columns through 800 px, one column at
  620/520 px, explicit focus, reduced motion, and forced-color boundaries. English
  and independently authored native zh-TW state the exact effects. Stable IDs,
  `blurPrivacy` bytes/default, schema/import compatibility, permissions, network
  policy, routes, notification behavior, and local-only storage remain compatible.

## Optional Plugins registry boundary (2026-08-13)

- `#tools-hub` is the one optional-tools entry boundary. It is a native modal dialog
  named by `#plugins-title` and described by `#plugins-description` plus the honest
  browser-profile storage note. `#plugins-list` is a native list; each of its eight
  existing `.hub-card[data-tool]` buttons owns localized name, description,
  Available state, and Open action. Availability means packaged in this research
  build. It does not mean installed, enabled, downloaded, connected, or purchased.
- `PLUGIN_TOOL_OPENERS` is an immutable allowlist for the real existing Pomodoro,
  Finance, Subscriptions, Habits, Hydration, Reading, Goals, and Workouts openers.
  `activateToolsHubPlugin()` requires the hub to be visibly open and the tool ID to
  exist in that allowlist; unknown/hidden activation does nothing. No plugin state,
  permission, request, catalog, account, install, or persistence API is introduced.
- `openToolsHub(opener)` refuses duplicate opening and refuses to sit above active
  fail-closed state recovery. It records the explicit More/sidebar/app-menu opener,
  applies one `plugins-hub` inert owner to every lower body child, locks scroll, and
  focuses the first plugin. `closeToolsHub()` is idempotent, releases the inert owner
  and scroll lock, then restores the opener. Tab stays in the dialog; local Escape
  stops before the global stack; backdrop and native Close share the same close path.
- Tool activation intentionally closes the hub first. That restores the visible
  app-level opener before the existing tool function calls `rememberOpener()` for its
  own overlay, so tool close never targets a button inside a hidden hub. The command
  palette already restores its opener before running a command; More/sidebar/app
  menu closures now pass their actual button explicitly.
- Presentation uses the existing Locus Index registry/sheet/paper/locator/focus/type
  tokens: a dark header, flat two-column rows, compact mono slot codes, one cobalt
  locator, neutral availability, internally bounded scrolling, and 3-8 px radii.
  There is no blur, gradient, emoji tile, lift, scale, or entrance animation. At
  800 px the bounded two-column registry remains; at 620/520 px it becomes one
  column. Product Motion-off, OS reduced motion, forced colors, English, and native
  zh-TW retain the hierarchy.
- The stable `#plugins-btn`, `data-tool` IDs, optional tool fields, their legacy
  interiors and floating widgets, schema/import envelopes, routes, extension
  permissions, zero host permissions, and local-only privacy are unchanged. The
  generic tracker interiors remain contextual research-build surfaces and do not
  enter the initial Store feature manifest or core save -> locate -> recover loop.

## Unified top-bar overflow boundary (2026-08-13)

- The rendered global shell has one context owner (`#ws-title`), one Search entry
  (`#topbar-search`), contextual reviewed Save (`#topbar-save`), and one overflow
  (`#more-btn`). Home keeps its in-content save trail as the primary Save and leaves
  More visible; the dedicated Search route continues to own its own header.
- Stable `#undo-btn`, `#calendar-btn`, `#search-btn`, `#settings-btn`,
  `#plugins-btn`, and `#menu-btn` IDs remain unique for internal compatibility but
  are explicit hidden/`aria-hidden` hooks. CSS enforces that hidden children cannot
  return to layout. Their routes live in the visible Search, Save, and More model.
- `secondaryNavigationItems(opener)` is the shared non-Search navigation model:
  Favorites, Read Later, Archive, Trash, Calendar/reminders, Plugins, and Settings.
  `openMoreMenu()` appends the existing Undo, selection, reorder, and whole-window
  Save actions. Optional tool interiors never appear individually in global chrome;
  Plugins remains the one packaged Available/Open registry.
- `openAppMenu(anchor)` is a compatibility adapter used by the optional Welcome
  layer. It delegates to `openMoreMenu()` and transfers focus/disclosure ownership
  to the visible `#more-btn`; it no longer owns Theme, Workspaces, Guide, About, or
  a separate icon language. Appearance, first-save Guide, and About remain inside
  Settings, while Workspace switching keeps its established shell route.
- `showContextMenu(..., { expandedOwner })` owns disclosure truth. Save review,
  sidebar More, and topbar More set `aria-expanded=true` only while open and clear it
  on replacement, selection, outside dismissal, or Escape. Settings receives an
  explicit opener through `openSettingsDrawer(tab, opener)`; Plugins already uses
  the same explicit focus-return boundary.
- `_pendingReminderCount` projects only onto the visible overflow. More receives a
  localized title and accessible name plus one accent dot, with forced-color
  equivalence and no animation. Calendar remains contextual until real reminder
  need earns promotion.
- No schema, import, route, persistence, permission, CSP, host-access, network, or
  plugin-state boundary changes. Preview files are neither imported nor consulted
  by this shell contract; production state, established routes, and user direction
  are authoritative.

## Drag capture duplicate-policy boundary (2026-08-13)

- `captureDuplicateExists(groupOrItems, url)` is the single new-tab capture policy
  for exact-URL duplicates. It accepts either a Group record or its exact item list
  and applies `settings.captureDeduplicate` before inspecting saved tabs.
- Space Inbox drop and Group/Stack drop callers must use this helper. They may not
  enforce an unconditional local URL scan that overrides the stored preference.
- Allowing duplicates changes only candidate filtering: every saved copy still
  receives a graph-wide collision-safe ID and the same exact destination receipt,
  acknowledged write, source-protection, and recovery boundaries.
- No schema, import, writer, browser permission/effect, locale, or network boundary
  changes.

## Command-palette recent-page capture boundary (2026-08-13)

- A Locus new-tab page cannot treat `{ active: true }` as an external capture
  source; that query identifies Locus itself. Palette Save therefore reads the full
  current-window inventory and delegates selection to `recentSaveCandidate()`.
- `recentSaveCandidate()` remains the shared authority for protocol eligibility,
  pending-URL stability, `lastAccessed` ordering, and deterministic tie-breaking.
  The palette does not read the stale opened-tabs rail cache.
- The selected page enters the existing Inbox capture controller with
  `destinationReceipt: true`; exact destination, acknowledged persistence, source
  protection, Undo, and Open destination remain owned there.
- A browser inventory failure or no eligible candidate yields one localized
  refusal and no mutation. No schema, import, permission, host/network, writer, or
  browser-effect boundary changed.

## Popup existing-destination batch duplicate boundary (2026-08-13)

- `filterPopupCaptureTabs(tabs, destinationItems, deduplicate)` is the popup-local
  exact-URL batch policy. It seeds seen URLs from destination tab records and adds
  each accepted source URL before evaluating the next source.
- Save-before-Hibernate and whole-window Links/Queue call it because they append to
  an existing destination. `captureDeduplicate === false` returns every source.
- Fresh whole-window Session mode passes `deduplicate: false` intentionally. Its
  one-saved-item-per-source mapping is part of the background cleanup identity
  contract and must not be collapsed without a separate design and effect change.
- Record deduplication does not remove source descriptors: each valid non-active
  source remains available for post-receipt exact URL/tab/window validation and
  cleanup. URLs are compared exactly and are not normalized.
- No schema, import, writer, permission, host/network, locale, or browser-effect
  boundary changed.

## New-tab existing-destination batch duplicate boundary (2026-08-13)

- `createCaptureBatchDuplicateFilter(groupOrItems)` seeds exact tab URLs from an
  existing Group or item list and reserves each accepted source URL before the next
  candidate. `captureDeduplicate === false` returns an accept-all predicate.
- The selected branch of existing-Group Save and the shared Group/Stack drop
  controller must use this stateful per-action predicate. They must not filter the
  whole batch against an unchanged destination snapshot.
- Inbox Save and Space-drop loops already append before checking the next source.
  Fresh selected/session Groups intentionally preserve source multiplicity and do
  not use this existing-destination helper.
- Only accepted representatives enter persistence and guarded source cleanup;
  order, metadata policy, collision-safe allocation, exact receipts, Undo, focus,
  and destination revalidation remain unchanged.
- No schema, import, writer, permission, host/network, locale, or browser-effect
  boundary changed.

## Group Save-here recent-page boundary (2026-08-13)

- `addSidebarOrActiveTabToGroup()` retains selected eligible sidebar tabs as its
  first source. A requested but wholly ineligible selection returns without reading
  or substituting another page.
- Only the no-selection branch reads `{ currentWindow: true }` and delegates to
  `recentSaveCandidate()`. An active-tab query from a Locus page is invalid because
  it identifies the extension itself; the cached opened-tabs rail is not fresh
  enough to authorize capture.
- The established selector owns protocol eligibility, pending-URL stability,
  `lastAccessed` order, and deterministic ties. Exact Group identity is reviewed
  before the browser read and re-resolved after it.
- The chosen source then reuses duplicate policy, metadata policy, collision-safe
  allocation, exact saved-item receipt, acknowledged persistence, and guarded
  cleanup. No schema, import, writer, permission, host/network, or effect boundary
  changed.

## Popup capturable-URL boundary (2026-08-13)

- `isPopupCapturableUrl(value)` is the popup-local positive protocol authority. It
  accepts exactly `http:`, `https:`, `ftp:`, and `file:` and does not normalize the
  stored address.
- Discovery filters improve the visible candidate set, but mutation/effect guards
  remain authoritative: single Save checks before locking or mutation; batch writers
  filter their own input; Hibernate descriptors reject unsafe sources.
- Whole-window records and cleanup descriptors derive from the same capturable
  source set. An excluded source cannot be persisted, closed, or replaced by that
  action.
- Bookmark import uses the same rule. Existing unsupported saved records are not
  repaired, migrated, or deleted and retain fail-closed Reopen behavior.
- No schema, import shape, writer, destination, receipt, permission, host/network,
  locale, or browser-effect ownership boundary changed.

## Accepted single-tab destination outcome boundary (2026-08-13)

- `saveTabToInbox()` retains its legacy saved-item return unless a caller explicitly
  requests `returnOutcome`. The opt-in shape is `{ accepted, item,
  destinationConfirmed }`; `false` remains a rejected/unaccepted Save.
- Destination confirmation requires both `commitCapturedTabs().destinationChanged`
  to remain false and one post-commit resolution of the frozen item-list receipt.
  Projection exceptions fail closed after acceptance.
- An accepted but unconfirmed destination emits the existing generic accepted-save
  warning with Undo and exact source consequence. It exposes no stale destination
  action and never retries or rolls back the accepted mutation.
- Home uses the outcome to suppress its reviewed-route confirmation. Welcome closes
  and completes the first-run gate, but skips Inbox navigation/item focus. Other
  single-tab callers retain their existing exact receipt or item-return behavior.
- No schema, import, writer, permission, host/network, locale, or browser-effect
  ownership boundary changed.

## New-tab bookmark URL eligibility boundary (2026-08-13)

- Settings › Data bookmark import delegates saved-tab eligibility to
  `isOpenableSavedTabUrl()`. It accepts exactly `http:`, `https:`, `ftp:`, and
  `file:` and preserves the browser-provided URL string.
- Unsupported bookmarklets, inline/blob data, mail actions, internal pages, blank
  values, and malformed addresses never become Group items or increment the
  accepted receipt count.
- Destination freeze/re-resolution, bounded traversal, pending ownership, snapshot,
  one acknowledged write, rollback, render, and Undo remain unchanged.
- This boundary does not migrate existing saved records or address retained-ID
  allocation. No schema, export/import envelope, permission, host/network, locale,
  or navigation boundary changed.

## New-tab bookmark identity-allocation boundary (2026-08-13)

- After the reviewed Workspace/Space is re-resolved, `importBookmarks()` creates
  one `createOrganizationIdAllocator()` and uses it for every proposed Group and
  saved item in the traversal.
- The allocator starts with active entity IDs and also reserves Archive/Trash
  destination hints, layout keys, canvas positions, and remembered Capture targets.
  Every returned ID is reserved immediately for the remainder of the import.
- Existing IDs are never rewritten. Initialization failure stops before snapshot,
  mutation, or persistence; traversal failure retains the existing no-write path.
- URL eligibility, exact destination authority, one acknowledged write, rollback,
  Undo, schema/import envelopes, permissions, and browser effects are unchanged.

## Popup Locate source-close partial boundary (2026-08-13)

- State acceptance and Locate browser effects remain separate. The new partial
  result describes only a known effect outcome after an accepted Save; it is not a
  storage rejection and cannot authorize rollback or another Save.
- `performPopupLocateSavedItem()` returns full success only when its requested close
  is confirmed. A protected preflight, post-activation change, or failed removal
  returns `LOCUS_LOCATE_SOURCE_CLOSE_FAILED` while retaining the exact confirmed
  route and freshly resolved destination.
- `showPopupLocateNotice()` returns a boolean. Notice delivery remains best effort;
  failure changes only `noticeShown`, never persistence, route authority, cleanup,
  or retry behavior.
- The popup accepts only the strict partial schema and keeps the existing Saved
  recovery card open. A route-less source-close partial becomes non-authoritative
  effect-unknown before rendering. Its exact-route action fresh-checks identity
  before reuse.
- No schema, writer, route, locale, permission, host/network, or privacy boundary
  changed.

## Popup Locate unavailable-destination projection boundary (2026-08-13)

- `LOCUS_LOCATE_TARGET_UNAVAILABLE` is authoritative evidence that the worker could
  not find one current exact item/owner after the Save was accepted. It is not a
  storage rejection and cannot authorize rollback, retry, or source cleanup.
- `showLocateFailure()` renders no destination for that code. It must not project
  the popup's pre-write `cat`/`group` names as current authority.
- The existing destination-unconfirmed Saved message and generic Open Locus action
  carry recovery. Exact source-close partials retain their separately worker-
  confirmed current destination.
- No schema, writer, route, locale, permission, host/network, or privacy boundary
  changed.

## Board local-record identity-allocation boundary (2026-08-13)

- `createBoardLocalRecord()` is the shared accepted Note/To-do creator for Board
  Group actions and the command palette's Inbox Note action.
- After exact destination resolution and before pending state, snapshot, or list
  mutation, it creates one `createOrganizationIdAllocator()` and allocates the new
  record ID from it.
- The allocator reserves active and nested item/Group/Space/Workspace IDs, retained
  Archive/Trash payload and destination hints, layout keys, and remembered capture
  destinations. Existing IDs are never rewritten.
- The exact new object continues through insertion, one `persistNow()` receipt,
  `resolveCaptureDestinationReceiptTarget()`, and route-backed Details opening.
  Allocation failure uses the existing changed-target recovery before any write.
- No schema, writer, route, locale, permission, host/network, or privacy boundary
  changed.

## First-use organization identity-allocation boundary (2026-08-13)

- `ensureDefault()` remains the only empty-graph constructor for My Workspace,
  Pinned, Inbox, and Later.
- It now creates one `createOrganizationIdAllocator()` before constructing those
  four records. The allocator begins from the complete active/retained graph and
  reserves each accepted candidate immediately, so retained IDs and later values
  in the same constructor cannot be reused.
- The exact allocated Workspace and Pinned IDs remain the `activeWsId` and
  `activeCatId`; default names, symbols, settings, and shape are unchanged.
- Existing data is neither normalized nor rewritten. No schema, writer, route,
  locale, permission, host/network, or privacy boundary changed.

## Group Open-all availability boundary (2026-08-13)

- `groupHasReopenableSavedTab()` is the presentation predicate for Group Open all.
  It scans the exact Group and nested Stacks without mutation, using
  `isOpenableSavedTabUrl()` as the single protocol policy.
- Board/List persistent controls use native `disabled` plus `aria-disabled` and a
  shared muted visual state; the Group menu omits an action that has no eligible
  target.
- Availability grants no browser authority. `openGroupAll()` still fresh-resolves
  the exact rendered Group and delegates effects/results to `openSavedTabItems()`.
- No copy, locale, schema, writer, route, permission, host/network, or privacy
  boundary changed.

## Group Save-here unsaved-candidate boundary (2026-08-13)

- Explicit eligible Opened-Tabs selection remains the first source for
  `addSidebarOrActiveTabToGroup()`.
- With no selection, the caller reads a fresh current-window inventory. It first
  establishes whether any eligible source exists, then exact-resolves the reviewed
  Group and applies `captureDuplicateExists()` before `recentSaveCandidate()`.
- Deduplication disabled leaves every eligible candidate in ranking. An enabled
  policy with no remaining candidate retains the existing Already-saved result.
- The chosen exact tab enters the unchanged collision-safe allocation, receipt,
  writer, guarded cleanup, and recovery path. No schema, locale, permission,
  host/network, route, or privacy boundary changed.

## Nested capture-deduplication boundary (2026-08-13)

- Deduplication remains scoped to the exact accepted Group or item list. It does
  not search neighboring Groups, Spaces, Workspaces, Archive, or Trash.
- `captureDestinationTabUrls()`, `popupCaptureDestinationTabUrls()`, and
  `captureGroupTabItems()` iteratively traverse nested Stack item arrays with
  object-identity cycle guards. Present records are read only; malformed or cyclic
  legacy graphs are neither normalized nor rewritten.
- New-tab single/batch/Home capture, popup single/window/Hibernate capture, and
  background Inbox capture apply the corresponding collector. Exact string URL
  equality, duplicate-off behavior, batch reservation, and exact duplicate
  continuation remain unchanged.
- No schema, writer, route, locale, permission, host/network, or privacy boundary
  changed.

## Recent Inbox Save candidate boundary (2026-08-13)

- Home Trail, top-bar Save, and Palette Save now use
  `homeTrailSaveCandidate(tabs, activeCat())` to rank the fresh current-window
  inventory after applying the exact active-Inbox duplicate preference.
- `recentSaveCandidate()` remains the shared reopenable/pending/recency policy.
  Deduplication disabled returns directly to that policy; an absent Inbox has no
  stored URLs to exclude.
- `saveTabToInbox()` remains the mutation owner and final duplicate/destination
  race guard. Top-bar review and Palette destination receipt behavior are
  unchanged.
- No schema, writer, route, locale, permission, host/network, or privacy boundary
  changed.

## Welcome recent Inbox candidate boundary (2026-08-13)

- `loadWelcomeCandidate()` queries the fresh current-window inventory, delegates
  eligibility/deduplication/ranking to `homeTrailSaveCandidate()`, and freezes only
  that selected tab through `capturedTabSourceDescriptor()`.
- Welcome therefore shares the active-Inbox candidate policy used by Home, top-bar,
  and Palette. Deduplication disabled and an absent Inbox preserve the ordinary
  `recentSaveCandidate()` result.
- Activation still fresh-reads the displayed tab, re-resolves the exact Inbox, and
  delegates mutation/receipt/source protection to `saveTabToInbox()`.
- No schema, writer, route, locale, permission, host/network, or privacy boundary
  changed.

## Search nested-destination presentation boundary (2026-08-13)

- Search recovery contexts already freeze `parentRefs` for exact nested Stack
  identity. `searchRecoveryPathParts()` now projects those names after Workspace,
  Space, and localized Group.
- Result text, result accessible names, and Saved-in detail consume the same helper;
  `searchRecoveryPathHtml()` marks the final Group or Stack as the current
  location.
- Root-level paths remain unchanged. Search route, target resolution, item
  fingerprint, Reopen, storage, and schema authority are unchanged.
- No locale key, writer, permission, host/network, or privacy boundary changed.

## Capture destination nested-reveal boundary (2026-08-13)

- `openCaptureDestinationReceipt()` still routes only after exact receipt
  resolution and re-resolves that receipt after the Group surface renders.
- `revealCaptureDestinationStackPath()` then adds the existing non-persistent
  `search-expand` class to every rendered Board/List Stack in the frozen outer-to-
  inner path before `focusIdentityTarget()` targets the deepest Stack.
- The helper mutates DOM classes only. Stored `expanded` flags, state history,
  persistence, Undo, route authority, and duplicate-path failure are unchanged;
  normal rerender/navigation discards the reveal.
- No schema, locale, writer, permission, host/network, or privacy boundary changed.

## Selection Open eligibility boundary (2026-08-13)

- `renderItemSelToolbar()` enables Open only when a selected record is a saved page
  whose URL passes `isOpenableSavedTabUrl()`.
- Unsafe-only selections reuse the native disabled state and existing unavailable
  explanation. Mixed selections still delegate every item to `openSavedTabItems()`;
  its exact identity, partial-result reporting, and persistent recovery remain the
  effect authority.
- Unsupported retained/imported records remain visible and available to Details;
  no record is rewritten, normalized, or removed.
- No schema, locale, writer, permission, host/network, or privacy boundary changed.

## AI planning contract, Calendar planner, and companion boundary (2026-11-06)

- One versioned contract, `locus.plan/v1`, lives in `plan-contract.js` (UMD: browser
  global `LocusPlan`, Node `require`). It owns the request shape, the draft validator,
  English issue text, idempotency keys, JSON Schemas (strict structured-output form and
  an MCP tool form), and four prompt profiles. The new tab, `companion/mcp-server.js`,
  and `companion/native-host.js` all call the same functions.
- Dates are validated as real calendar dates; times are 24-hour `HH:MM` wall times in
  the plan's IANA zone and resolve to instants with `zonedWallToEpoch()`. A wall time in
  a spring-forward gap is an error with a suggested shifted time; a fall-back time that
  occurs twice uses the earlier instant with a warning. A draft in another zone is
  converted to the plan zone before range checks.
- Fixed commitments are constraints: an exact echo with `fixed: true` is shown as
  locked, a block that moves one is an error, and overlap is a conflict. Shared busy
  times are Calendar reminder instants only (no titles) and only when the person ticks
  the share option. Conflicts and past starts stay selectable but unticked; errors,
  repeats, fixed echoes, and blocks already in the graph are not selectable.
- Calendar stays authoritative. Apply freezes an exact Workspace/Space/Group (or a new
  Group named after the plan), re-reads plan keys across active, Archive, and Trash
  right before mutation, takes one localized snapshot, and awaits one
  `State.persistNow({ reconcileReminders: true })`. Each block becomes a to-do with
  `reminder { at, notified: false }` and `plan` provenance; the plan record gains a
  ledger entry. Success, the alarm warning, Undo, Calendar focus, and the companion
  ack happen only after the receipt; rejection keeps the dirty graph behind recovery.
  Saving plan inputs is its own snapshot-plus-receipt write.
- `isPlannerMutationPending()` joins the Router and selection guards, the sheet owns
  global keys while open, joins the Escape layer lists, refuses to open over another
  modal (Welcome included), and repaints on locale change. Drafts in the sheet are
  memory only; the companion queue is the durable inbox.
- Companion: no listener. MCP is stdio JSON-RPC (protocol 2025-11-25 back to
  2024-11-05). Native Messaging uses 32-bit native-order framing with host-to-browser
  messages under 1 MB. Each browser profile pairs with a random 32-byte key kept in
  `chrome.storage.local.te_planner_link` (outside `te`, not exported); the host keeps
  only its SHA-256. Delivery is at least once: pulled drafts stay `delivered` until
  `ack`; Locus dedupes by draft id and fingerprint and applies by block key. Queue
  bounds: 25 waiting, 256 KiB each, 14-day expiry, 200 tombstones. A newer waiting
  draft from the same client label supersedes the older one. Local runners are
  opt-in commands in `runners.json`, run without a shell in an empty temporary folder.
- Manifest: `optional_permissions: ["nativeMessaging"]` only, requested from the
  Connect click; `quality-gates.js` rejects any other optional permission, an
  install-time `nativeMessaging`, host permissions, and loss of `connect-src 'none'`.
