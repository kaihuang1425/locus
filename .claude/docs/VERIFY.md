# Locus verification playbook

Run the static checks after every change; run the runtime pass before calling a
slice done. Never claim visual verification that didn't happen.

## Static checks (fast, always)

```bash
for f in newtab.js popup.js background.js suspended.js emoji-data.js prepaint.js import-utils.js scripts/*.js; do node --check "$f"; done
node scripts/quality-gates.js
node scripts/onboarding-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/popup-locate-contract-test.js
node scripts/trash-recovery-contract-test.js
node scripts/organization-removal-contract-test.js
node scripts/organization-delete-contract-test.js
node scripts/organization-naming-contract-test.js
node scripts/organization-creation-contract-test.js
node scripts/organization-move-contract-test.js
node scripts/group-stack-identity-contract-test.js
node scripts/import-recovery-test.js
node scripts/archive-scale-contract-test.js
node scripts/export-import-scale-contract-test.js
node scripts/background-contract-test.js
node scripts/reminder-identity-contract-test.js
node scripts/reminder-overdue-contract-test.js
node scripts/reminder-timezone-contract-test.js
node scripts/undo-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/concurrency-contract-test.js
git diff --check
```

The deterministic suites prove only the contracts they model. They do not promote
a capability to installed-extension runtime verification.

The onboarding suite extracts the production welcome controller and drives its
loading, real-tab success, no-eligible-tab, tab-query error/retry, failed-save,
focus, Tab containment, Escape, opener-return, Inbox handoff, and saved-item focus
paths against a minimal DOM/browser model. It also requires one canonical welcome
in the markup, localized English and zh-TW query failure copy, the retained narrow
and reduced-motion rules, and absence of the old questionnaire, spotlight tour,
coach mark, tip controls, and native reset confirmation. This is deterministic
production-controller and static-source evidence, not installed Chrome tab-close,
pixel, screen-reader, viewport, theme, reload, or browser-history evidence.

The item-detail suite extracts production routing, Home-item resolution, direct-
field mutation, focus, Escape-stack, inertness, and restoration helpers and combines
them with static render/i18n/CSS contracts. It covers board/group/Library route
persistence plus `/home?item=<id>` build/parse/current/apply/close behavior;
globally unique and owning-Space resolution; nested Stacks; missing, duplicated,
moved-within, and moved-out records; native Home button click and Enter/Space
behavior; localized English/zh-TW action and failure names; exact-origin and current
native-row focus; and active-Space/Canvas/layout isolation. The extracted history
handler proves an ephemeral Home open/close/Back/Forward makes no state write while
a real durable Space change still does.

The popup-Locate suite extracts the production single-tab save, bounded popup
writer, service-worker Locate resolver/effect, and new-tab route codec. It covers
same-request state→Locate ordering; exact and moved/nested same-Workspace identity;
missing, duplicate, archived/trashed, and moved-out fail-closed targets; encoded
Home-detail routes; source-window create/activate/focus and create-before-close
ordering; close-disabled, route-create, source-close, activation, combined close+
activation, and exact already-created-tab/notification retry outcomes; accepted-
save/failed-Locate typing; optimistic rollback on rejected state; receipt timeout,
native-coded and non-object transport rejection, and late receiver-retry
cancellation; semantic in-section recovery and retry live feedback, English/zh-TW
parity, focus and motion hooks; and suppression of Landing/Welcome over a valid
recovery deep link.
It proves production-extracted deterministic behavior only. Installed action-popup
teardown, message-port/service-worker lifetime, real tab activation/close, pixels,
screen readers, themes, locales, and 1280×720/800 px layouts remain open.

The receipt harness drives the production `commitItemDetailMutation()` boundary
with a deferred state receipt. It requires the synchronous pending token, exactly
one snapshot and one write, no product render before acknowledgement, an accepted
render/success path, rejected and unknown acknowledgement paths that retain the
dirty local graph without retry or false render, and refusal when fail-closed
recovery already owns the foreground. A throwing detached-field mutation must
produce no live mutation, history, or write. Duplicate/missing/moved/replaced/
retyped/fingerprint-changed targets, duplicate Workspace/Space/Group owners,
changed Stack ancestry, and a duplicated ancestor ID all fail with zero mutation,
history, write, or render. A second edit is rejected while the first owns the
receipt. The extracted pending guards execute against Open, Close, the scrim, and
a body control: pointer activation plus Enter/Space/later Escape are consumed,
while both Tab directions still reach the sheet's focus trap. The save live region
must remain in the header, structurally outside the `aria-busy` body. Direct
candidate-application fixtures preserve same-length checklist/custom-field row
references, apply structural tag/checklist and cover changes, and leave unrelated
imported JSON reference- and byte-equivalent. Programmatic and browser-history
navigation recheck the pending boundary
after blur; sheet close and later Escape are consumed, while Tab remains contained
and an initial editor Escape may blur to the stable panel; and pagehide neither
blurs nor writes again when a transaction is pending, including when its blur
started that one write.
Static wiring covers exactly title, URL, task state/text, saved context, cover,
tags, checklist, and custom fields. Localized Saving/Saved/stale/failure status,
polite live-region semantics, body `aria-busy`, guarded controls, wrapping, and
shared pending/success/error theme tokens are required.

The same item-detail suite executes the production
`commitItemDetailReminderMutation()` and reminder key guard. Set, Change, quick
choices, and Clear must establish one synchronous detail/reminder pending token,
preserve imported reminder fields outside the editor's ownership, take one localized
snapshot, and request exactly one
`persistNow({ reconcileReminders: true })` receipt. The harness requires state-write
acknowledgement and the structured `reminderReconciliation` result before picker
close, render, rebuilt Set/Change focus, or success/warning feedback, and forbids a
second page runtime/alarm request. Duplicate activation, changed or ambiguous item
identity, rejected and unknown receipts, accepted-state/alarm-failure warnings,
busy/live semantics, pending and non-pending Enter/Space/Tab/Escape/shortcut
behavior, and recovery-over-reminder precedence are covered. Static checks retain
English/zh-TW copy parity, the picker's separate live and busy regions, responsive
wrapping, and shared pending/error tokens.

The suite also covers modal naming, primary recovery hierarchy, workspace/category/
group/Library eligibility checks, the non-transaction dirty-state pagehide fallback,
Tab from the focused sheet, two-step editor Escape when no receipt is pending,
independently owned detail/reminder/recovery inertness including a late-mounted body
surface, ordinary opener/same-item/heading fallback, complete detail/reminder key
parity, full-width Home rows with hover/focus/pressed states, 800 px dimming, 520 px
reflow, and reduced motion. This is deterministic production-controller/helper and
static-source evidence only. It is not installed Chrome storage, history/reload,
Back/Forward, or pagehide-completion evidence; actual persistence and recovery UI,
  screen-reader announcements, theme/locale pixels, 1280×720/800 px pixels, and
  representative-user evidence remain absent. Item-detail reminder ordering is
  deterministically covered, but real Chrome alarm APIs, page teardown during the
  combined receipt, restart/sleep, and notification scheduling remain installed
  runtime gates. Non-detail item and group/category reminder mutation entry points
  remain outside this detail controller. Stack identity uses its separate identity-
  controller evidence; Archive and the Open browser effect remain separate flows.

The Trash-recovery suite extracts the production irreversible-delete controller
and joins it to a minimal DOM and persistence boundary. It requires active saved
items to expose Archive rather than a permanent-delete bypass; Trash alone may
open the localized alert dialog. The suite covers exact single/batch scope,
duplicate and stale entries, safe initial focus, cancellation, Tab containment,
Escape consumption, opener or Trash-search focus return, pending feedback,
confirmed central-writer success, rejected-write recovery routing, no premature
toast/render, and clearing Undo/Redo only after persistence is acknowledged. It
also checks modal, narrow-layout, destructive-token, unique-ID, and en/zh-TW copy
contracts. This is deterministic production-controller/static-source evidence,
not installed Chrome storage-failure rendering, screen-reader output, theme or
viewport pixels, or representative-user trust evidence.

The organization-removal and organization-delete suites extract the production
workspace/Space controller and inert-owner helper, then join them to minimal DOM,
real state graph, focus stack, and persistence boundaries. They require all five
removal entry points across active markup and rendered Home/sidebar surfaces to
converge on one localized alert dialog. Production
occupancy recursively covers groups, stack
containers/descendants, and category/group reminders; populated organizations must
hide/disable Delete, name the archive/move/clear recovery step, and perform zero
snapshot or write. Static wiring also requires the visible Home-card and sidebar
Space menus to reopen the first existing category reminder through localized edit/
remove behavior, making the blocker's recovery step reachable after delivery and
across legacy multiples.
Only empty structural shells may be confirmed. The suite also
refuses duplicate, missing, changed, and last-organization targets, and requires a
fresh empty/blocked decision when displayed scope changes. It covers Cancel/Close-
first focus, independently owned body-root inertness that leaves fail-closed
recovery operable, Tab containment, modal-local and outside-target Escape plus
global-shortcut consumption, lazy command-palette inheritance plus refusal, explicit context-menu
opener capture, refreshed visible workspace-manager/active-Space focus fallback
with active-element verification, live blocked/Space/pending locale repaint, pending
feedback, an immediate central-writer receipt, localized history plus action-ID-
scoped Undo, and rejected persistence without success, render, or premature unlock.
Static checks also require centralized workspace/category mutation, Archive-only
group removal, removal of the obsolete confirmation toggle while retaining its
compatibility field, modal/narrow/theme/destructive-token reuse, unique IDs, and
English/zh-TW consequence parity. This is deterministic production-controller/
static-source evidence, not installed Chrome write-failure rendering, the reload/
close Undo boundary, screen-reader output, theme or viewport pixels, or representative-
user trust evidence.

The organization-naming suite extracts the production workspace/Space rename
controller and drives it against a minimal DOM, real state graph, and immediate
persistence boundary. It requires the workspace chip, workspace manager, Home
card, and visible sidebar Space menu to converge on one localized dialog while
the hidden tab and double-click duplicates stay removed. The suite covers exact
stable-ID lookup, duplicate names and duplicate-ID refusal, blank and unchanged
input, owning-workspace revalidation, concurrent-name refresh, missing targets,
one localized snapshot, one acknowledged write, action-ID-scoped Undo, rejected
write recovery without premature render/close/success, pending controls, modal
interlocks, Tab and Escape containment, outside-target shortcut suppression,
recovery-control keyboard precedence, opener/equivalent-target focus after the
actual asynchronous workspace-chip render boundary, live English/zh-TW repaint,
unique IDs, and the
shared theme, forced-color, reduced-motion, 32 px gutter, 720 px height, and
520 px wrapping contracts. This is deterministic production-controller/static-
source evidence, not installed Chrome persistence-failure rendering, screen-
reader output, theme/locale pixels, 1280×720/800 px behavior, reload/history, or
representative-user trust evidence.

The organization-creation suite extracts the same production naming controller in
its create modes. It requires the top-bar and workspace-manager Workspace actions,
sidebar, Home defensive empty state, and command-palette Space actions, plus the
Group menu's create-and-move action, to converge on one localized dialog. The old
workspace/Space branches in the generic modal, native New-category prompt, and the
workspace manager's duplicate browser-window capture subsection must stay removed.
The suite covers blank and duplicate names, collision-safe IDs across active,
Archive, and Trash graphs, a localized empty starter Space, stable parent/source
IDs, missing/duplicate/moved target refusal, concurrent Group-name review, atomic Group move with Canvas and
remembered-capture references, one localized snapshot, one acknowledged write,
action-ID-scoped Undo, delayed and rejected receipts without premature UI, rebuilt
target focus after the real header boundary, dialog and context-menu Tab/Escape
containment, keyboard-visible manager actions, recovery precedence,
live English/zh-TW repaint, and the shared modal/manager responsive and forced-color
rules. This is deterministic production-controller/static-source evidence, not
installed Chrome persistence rendering, screen-reader output, theme/locale pixels,
1280×720/800 px behavior, reload/history, or representative-user evidence.

The organization-move suite extracts the production existing-Space Group-move
controller and drives the Board/Canvas/focused-Group and both List-menu entries
against a nested real-state graph. It requires one shared, localized destination
radiogroup with no preselection, duplicate-name ordinals, required-state semantics,
roving keys whose Enter/Space only select, contained Tab/Escape, exact opener return,
and a focusable guarded pending anchor. Stable-ID checks refuse duplicate, missing,
moved, same-Space, cross-Workspace, and inactive-Workspace targets before history;
displayed name/list/count changes refresh the review and require a second confirm,
while current nested content moves intact. The transaction preserves Group/item/
reminder/custom identities, transfers the source Canvas position, updates only the
matching capture and Archive/Trash item restore references, leaves the active source
Space and unrelated layout/settings data unchanged, and prunes only moved hidden
selections after one `persistNow()` receipt. Delayed and rejected receipts must not
render, close, toast, expose Undo, or move focus prematurely; acknowledged success
uses the exact snapshot action ID and focuses the now-visible destination Space.
Static checks also cover scroll-bounded 44 px options, 32 px viewport gutters,
520 px action wrapping, light/dark tokens, forced colors, reduced motion, en/zh-TW
parity, anchored menus, and removal of the debounced direct-move path. This is
deterministic production-controller/static-source evidence, not installed Chrome
persistence/recovery rendering, actual screen-reader output, theme/locale pixels,
1280×720/800 px behavior, reload/history, or representative-user trust evidence.

The Group/Stack identity suite extracts the production identity controller and
executes it against representative nested graphs. It requires explicit empty-
Space, Board, List, focused-Group, Stack-detail, and selected-item batch entries to
converge on one localized dialog, with the dead generic controller, native naming
prompts, inline/contenteditable identity editors, and the old direct Duplicate
mutation absent. Board, Canvas/focused-Group, List More, and List context Duplicate
actions must converge on the same controller. It covers primitive
stable-ID contexts, exhaustive duplicate/missing/moved/ancestor lookup, blank and
duplicate names, collision-safe allocation across active/Archive/Trash, concurrent
identity review, untouched raw-name and custom/missing symbol/color preservation,
exact non-nested same-Space batch moves, one localized snapshot, one awaited
receipt, failure without premature render/close/toast, exact-action Undo, receipt-
gated selection clearing, opener/rebuilt-target focus, a focusable guarded pending
anchor, inertness, recovery precedence, Tab/Escape ordering, emoji loading/error/
draft behavior, live English/zh-TW copy, and responsive/forced-color/reduced-motion
hooks. Its Duplicate cases additionally prove draft-only open/cancel, whole-Group
and destination-name stale review, preservation of intentionally edited fields,
recursive fresh IDs for the detached Group/item/Stack graph across active, stored,
restore, capture, sizing, and Canvas collision streams, detached custom/reminder
data, source-adjacent insertion, cloned legacy/current sizes, and Canvas placement
by the real production footprint/overlap/search helpers. Valid `{w,h}` fixtures
cover current sizes, a null current record falling back to a partial legacy width,
and the former 720 px unsized vertical-overlap case by reserving 60vh plus column
chrome. Delayed and rejected receipts prove one write,
no premature UI or alarm work, same-turn recovery display/focus, and exact dirty-graph
retention. A focused-Group case requires one post-receipt route render with
`persist: false` and focus on the copy. Reminder-bearing copies reconcile only
after success; Undo and Redo reconcile only after their history receipts; delayed
failures drop exact Undo after a newer action. Live locale tests update only the
untouched generated copy name, detached opener tests recover durable focus, and
an extracted history-handler test proves that non-pending drafts close before
navigation while pending receipts and recovery restore the reviewed route without
flush/apply/persist/render side effects. Static CSS checks require arbitrary-name wrapping. This is deterministic
production-controller/static-source evidence, not
installed Chrome persistence/recovery rendering, screen-reader output, theme or
locale pixels, 1280×720/800 px behavior, reload/history, or representative-user
trust evidence.

The import-recovery suite accepts a current-schema graph without mutation and
rejects 33 explicit malformed boundaries plus 128 fixed-seed structural mutations.
Schema-12 category/group reminder lists require unique nonempty IDs; schema-11
fixtures may omit them, and merge normalization assigns stable IDs on a cloned
payload before joining a current receiving graph.

The archive-scale suite extracts the production single-item, whole-group, batch,
Archive-to-Trash, and restore paths. Each archive route exercises 1,024 mixed
top-level items (including stacks with nested records), preserves every entity ID
exactly once, and restores a canonical-equivalent workspace graph. Missing IDs and
foreign entries must remain no-ops. The suite also joins the production batch
Archive and Archive-to-Trash functions to the production State writer,
ordinary-write recovery handler, and storage-error router. An injected typed quota
rejection must keep the 1,024-record local mutation visible behind the reload
interlock, leave the authoritative graph unchanged, route storage-full feedback,
and restore every ID on a reload-style authoritative read. The background suite
separately makes the production writer's `chrome.storage.local.set()` reject for
quota, then requires a typed failure, unchanged stored graph, and visible
notification. This proves deterministic failure routing, not Chrome's real quota
allocation, rendered UI, serialized export files, or installed-extension behavior.

The background suite also fixes the production reminder clock. Its initial service-
worker reconciliation must create nine alarms at exact times: future one-shots,
overdue daily, multi-day, biweekly, and monthly recurrences advanced to their first
future occurrences, and a subscription. After advancing eight days and invoking the
registered `runtime.onStartup` listener, it must clear four newly overdue one-shots,
re-arm the four recurring series, retain the subscription, preserve unrelated and
non-reminder Locus alarms, and make no state write or catch-up notification. A repeat
must be idempotent. Injected alarm-create and stale-alarm-clear failures must return
two structured operations with no false success or state mutation. Expired recurring
reminders and overdue one-shots stay unscheduled. This is deterministic mocked-browser
lifecycle evidence, not installed Chrome restart/sleep or delayed-delivery evidence;
rendered Past Due behavior, notification delivery, and installed time-zone transition
behavior remain runtime gates.

The central-writer portion also sends a `locus-state-write` request with
`reconcileReminders: true`. It requires storage acceptance before the first alarm-map
read and one typed response containing the completed structured reconciliation. An
injected alarm-create failure must keep the state response accepted, preserve the new
reminder state, and expose `reminderReconciliation.ok === false`. This proves the
service-worker-owned state→alarm order in the deterministic harness; it does not
prove message-port lifetime or service-worker termination behavior in installed
Chrome.

The same background suite invokes the production `alarms.onAlarm` listener for eight
accepted deliveries. Daily item, multi-day nested-item, biweekly group, and monthly
category recurrences must each create exactly one awaited notification, advance only
their own persisted reminder through one central revisioned write, and reconcile the
same alarm name to its exact next occurrence. It also delivers a stable group reminder
after its array index changes and a legacy schema-11 group reminder before migration.
A one-shot and a recurrence at its `until` boundary must persist as notified without
re-arming. Five stale/malformed paths (rescheduled, removed, same-index/same-time
replacement, duplicate ID, and already-notified) must produce zero notification,
state write, or alarm reconciliation. Injected notification failure must leave state
untouched; injected
quota rejection must leave authority unchanged, avoid a blind write retry, rebuild
the consumed recurring alarm from an authoritative read, and surface the storage
warning. A generic write rejection must do the same and create a clickable update
warning; injected post-write alarm-create failure must retain the accepted next
occurrence and create a clickable scheduling warning. The focused reminder-identity
suite separately extracts the new-tab migration-persistence, add/edit/reschedule/
remove, and alarm-reconcile paths: schema 12 must persist before legacy alarms are
replaced; four mutations must preserve stable IDs across index shifts, retire only the
removed alarm, skip notified reminders, and round-trip stable plus arbitrary legacy
alarm components without delimiter ambiguity. This remains a mocked-browser/state
model, not evidence for installed notification rendering/timing, service-worker
termination, or installed mutation races. The focused time-zone suite below owns
the separate deterministic DST/date-line contract.

The reminder-overdue suite extracts the production pending-reminder projection,
item badge, editor, and Calendar-entry paths. Unnotified overdue one-shots and
expired recurrences must retain their stored Past due time; delivered records and
malformed timestamps must leave every pending surface; and future one-shots must
retain their exact time. Missed daily, biweekly, and monthly recurrences must
project to the same first future local-calendar occurrence as background
reconciliation without mutating stored data. Projection must preserve entity
indexes and stable reminder IDs, keep Calendar entries sorted, open item/entity
editors on the projected occurrence, and wire the landing, app-menu, Calendar,
and item-badge signals through one policy. This is deterministic DOM-free model
evidence, not rendered UI, installed alarm delivery/restart, or notification timing.

The reminder-timezone suite starts fresh Node processes under `America/New_York`,
`Europe/Berlin`, `Asia/Taipei`, and `Pacific/Apia`, then extracts the production
background recurrence/alarm-match helpers and new-tab display projection. Twenty-one
recurrence cases and 37 background/display parity assertions require daily, weekly,
and monthly schedules to retain local wall time across 23- and 25-hour days; skip
nonexistent spring-forward times, a deleted civil date, and missing month-days rather
than accepting forward normalization; accept the first fall-back fold exactly once;
respect `until` against the next valid occurrence; and fail malformed inputs closed.
The suite also rejects the later fold as a stale alarm and proves recurrence inputs
remain unchanged. This is deterministic production-extracted time-zone evidence,
not proof of Chrome's installed alarm timing, browser sleep/restart, bundled time-zone
data, or a live operating-system time-zone change.

The export/import contract suite extracts the production export serializer, FileReader
boundary, validator, replace/merge applications, migration, and page State client.
It serializes 1,024 mixed top-level active records (1,536 items after counting
stack children) plus 1,024 Archive and 1,024 Trash entries.
The portable payload must omit `_revision`, report exact counts, and survive both
replace and merge with semantic content, canvas/column metadata, restore
destinations, and entity cardinality intact. Replace must first download the exact
portable pre-import graph; merge must rekey every imported identity without
collisions. The same suite exercises one fixture for every supported numeric schema
from 0 through 12, rotates all six accepted app envelopes, and includes the raw
legacy shape. All 28 schema/mode combinations must preserve content and exact
counts, migrate version-gated defaults on replace, keep local profile settings on
merge, retain collision-free restore destinations, and preserve or migrate stable
category/group/Trash reminder IDs. The schema list is explicit
so a future `CURRENT_SCHEMA` bump fails until its fixture is added. A fixed-seed
valid-semantic corpus adds 128 current-schema graphs and 256 replace/merge cases
covering 5,013 entities. Coverage assertions require multiple workspaces, Spaces
without groups, empty groups/Archive/Trash, every item and stored-entry kind,
nested stacks, all five accepted URL families, Unicode and already-safe rich text,
optional item metadata, Archive/Trash, selections, restore references,
canvas/column records, settings, and recent emoji. Exact counts,
identity-independent semantic content, references,
settings boundaries, authoritative persistence, and input immutability must survive
every case. Injected write rejection for current-scale, raw-legacy, and generated
semantic inputs must roll both modes back locally, leave authoritative storage
unchanged, surface recovery, and report no success. Four further large-file cases
allocate exact UTF-8 inputs from the production limits: a valid 20,971,520-byte
backup must reach one preview without mutation, while the same valid JSON plus one
byte must be rejected before FileReader. A valid 10,551,296-byte file whose parsed
graph remains above the 10 MiB fallback quota must reach preview in both modes;
injected typed quota rejection must then make one write attempt, roll back locally,
leave authority unchanged, require recovery, skip reminder reconciliation, and
report no success. Replace alone creates the safety backup. This is fixed-seed
deterministic browser-API model evidence, not evidence for Chrome's DOM-backed
rich-text sanitizer transformations, actual File/FileReader/download or rendered
preview behavior, real quota allocation, reminder outcomes, service-worker
lifecycle, or installed round trips.

The Undo suite includes a deferred tab-reopen interleaving: a newer edit must
survive, remain first in history, and let a capture retry reuse any tab already
reopened instead of creating a duplicate. Two rapid same-context writes must wait
for consecutive revision receipts rather than overlap. While one capture owns a
deferred source-tab close, a second modeled capture must roll back immediately,
send no write, and leave its source open. Capture-failure cases interleave a newer
ordinary edit with set failure, revision conflict, and an accepted write whose
response is lost. Every source stays open; the page re-reads authoritative `te`,
clears stale whole-graph history, and keeps only data storage actually accepted
when no later mutation intervened. If a later ordinary edit or queued successor
exists, it remains visible behind the reload interlock until the test explicitly
recovers; both unsent writes are cancelled. A separate deferred recovery-read case
mutates after the first guard check and proves the adoption-point token check still
preserves that edit. Unknown accepted receipts for Undo and
Redo force authoritative recovery. A newer external revision arriving during
deferred multi-tab Undo interrupts the loop before another tab is opened; a newer
edit during failed Redo is likewise preserved instead of being replaced. A failed
recovery read leaves persistence blocked.

The state-sync suite extracts the production new-tab State store plus its boot
normalizers. It proves zero-write current-schema boot, one-write/idempotent schema,
legacy-theme/onboarding, default, and expired-Trash normalization; clean adoption
of a newer external revision; self `storage.onChanged` observation before the typed
receipt; and dirty-page preservation behind explicit authoritative recovery without
rebasing. It also covers a newer event beating a stale in-flight recovery read,
a higher graph remembered before recovery beating a stale read, a delayed exact
self-event after two receipts, an in-flight ordinary conflict retaining its local
graph, accepted-but-lost and never-settling receipt recovery, and the state-write
receiver boundary. An ordinary write omits the optional alarm intent; a
`persistNow({ reconcileReminders: true })` write forwards it and returns the
service-worker's structured `reminderReconciliation` result to the caller. One
transient `Receiving end does not exist` rejection resends
the same candidate and succeeds; persistent absence stops after three total attempts
with unchanged authority and typed recovery; a port closing after acceptance gets
one attempt only and recovers the accepted graph. A delayed no-receiver rejection
arriving after the receipt deadline cannot start a late retry. The extracted error
router shows the typed background-service message directly instead of labeling it a
storage error. The recovery-overlay contract restarts the extension runtime only for
that typed absence, retains page-only reload for reconciliation failures, and falls
back to page reload when `runtime.reload()` is unavailable. Every foreground claim
focuses Reload synchronously and schedules one focus reassertion for a not-yet-
layout-ready overlay. The suite also covers invalid
fractional/negative baseline rejection, active-capture deferral, debounce
cancellation, and fail-closed newer-schema handling. It models event ordering, a
bounded receipt timeout, and injected message failures; it does not establish
Chrome's installed runtime ordering or service-worker lifecycle. The background
suite also rejects malformed client and stored revision tokens before `storage.set`.

The concurrency suite extracts the production popup client queue, single-tab
capture flow, and service-worker writer. Before the writer matrix it covers five
client-queue cases: ordered successes must send immutable candidates at consecutive
revisions; a failed first write must invalidate its already-queued successor without
sending it and permit a fresh post-recovery retry; and transient receiver absence,
persistent receiver absence, and an ambiguous closed-port receipt must respectively
retry the immutable candidate, stop after three attempts, and remain single-shot.
A separate flow defers
and fails the first popup capture, rejects an overlapping capture before another
send, verifies that neither source closes, then confirms that a later successful
retry can close only its own source. The default writer run covers 10 deterministic
Web-Lock/FIFO/conflict/set-failure cases plus 10,000 fixed-seed lockless schedules.
Every accepted mutation token must remain exactly once, rejected/failed tokens must
remain absent, and the stored revision must advance exactly once per accepted
write. Reproduce another schedule with
`node scripts/concurrency-contract-test.js --seed <integer> --runs <n>`; `n` must
be at least 10,000. This proves the modeled FIFO/revision protocol, not MV3
service-worker lifetime, installed message-delivery behavior, or every arbitrary
ordinary edit interleaved with browser-side capture effects.

- **Duplicate ids** after HTML edits — see the runtime snippet below (`dupIds`).
- **i18n coverage**: every `data-i18n`/`data-i18n-title`/`data-i18n-placeholder` key
  used in HTML must exist in `I18N.en` in newtab.js (missing keys render literally):
  ```bash
  grep -oh 'data-i18n[a-z-]*="[^"]*"' newtab.html | sed 's/.*="//;s/"//' | sort -u > /tmp/keys
  # then check each against I18N.en (grep -c "'<key>'" newtab.js)
  ```
- **Branding**: `grep -in "folio" *.js *.html manifest.json` — only theme ids
  (`folio`, `folio-dark`), storage keys, and import compatibility may match.
- **Assets**: every `media/`, `icons/` path referenced in code exists on disk.

## Shimmed UI pass (no Chrome extension load needed)

This pass is useful for DOM/state interaction work, but it does **not** verify MV3
CSP, extension permissions, service-worker lifecycle, local favicon behavior, or
network silence.

Extension pages throw on plain http (`chrome.storage` missing). Recipe:

1. Start the static server: preview_start with name `folio-static`
   (`.claude/launch.json`, python http.server on port 8777).
2. Open `http://localhost:8777/newtab.html`.
3. Inject the shim below via `javascript_tool`, then it calls the page's global
   `init()`. Persistence works across reloads (shim saves to localStorage).

```js
(() => {
  const mem = {}; try { Object.assign(mem, JSON.parse(localStorage.getItem('__shim_store') || '{}')); } catch {}
  const save = () => { try { localStorage.setItem('__shim_store', JSON.stringify(mem)); } catch {} };
  let writeQueue = Promise.resolve();
  chrome.storage = chrome.storage || { local: {
    QUOTA_BYTES: 10485760,
    get: async k => (typeof k === 'string' && mem[k] !== undefined) ? { [k]: mem[k] } : (k == null ? { ...mem } : {}),
    set: async o => { Object.assign(mem, o); save(); },
    getBytesInUse: async () => JSON.stringify(mem).length,
    remove: async k => { delete mem[k]; save(); }
  }, onChanged: { addListener: () => {} } };
  chrome.tabs = chrome.tabs || { query: async () => [], onUpdated:{addListener:()=>{}}, onRemoved:{addListener:()=>{}}, onActivated:{addListener:()=>{}}, onCreated:{addListener:()=>{}}, create: async()=>({}), update: async()=>({}), remove: async()=>{} };
  chrome.windows = chrome.windows || { getCurrent: async () => ({ id: 1 }), onFocusChanged:{addListener:()=>{}}, WINDOW_ID_NONE: -1 };
  chrome.runtime = chrome.runtime || {}; chrome.runtime.getURL = chrome.runtime.getURL || (p => '/' + p);
  chrome.runtime.onMessage = chrome.runtime.onMessage || { addListener: () => {} };
  chrome.runtime.sendMessage = chrome.runtime.sendMessage || (message => {
    if (message?.type === 'reconcile-reminders') return Promise.resolve({ ok: true, reason: 'shim' });
    if (message?.type !== 'locus-state-write') return Promise.resolve();
    const run = writeQueue.then(() => {
      const candidate = JSON.parse(JSON.stringify(message.state));
      const remoteRevision = Number(mem.te?._revision) || 0;
      const localRevision = Number(candidate?._revision) || 0;
      if (remoteRevision !== localRevision) {
        return { ok: false, code: 'LOCUS_STATE_CONFLICT', message: 'Shim state changed before this write.' };
      }
      const revision = localRevision + 1;
      candidate._revision = revision;
      mem.te = candidate; save();
      return {
        ok: true,
        revision,
        ...(message.reconcileReminders === true
          ? { reminderReconciliation: { ok: true, reason: 'shim' } }
          : {}),
      };
    });
    writeQueue = run.catch(() => undefined);
    return run;
  });
  chrome.commands = chrome.commands || {}; chrome.bookmarks = chrome.bookmarks || { getTree: async () => [] };
  return (init(), 'booted');
})()
```

### Checklist per slice

- Before implementation, write the component contract: entry point, primary
  action, default selection, loading/empty/error states, Escape/focus/keyboard
  behavior, persistence boundary, and narrow-layout behavior. A screenshot is
  visual direction, not a substitute for this interaction contract.
- Compare the rendered surface to its reference at the same viewport, then walk
  the complete primary task. Decorative stand-ins, duplicate entry points, and
  controls without real product data or actions fail the slice even if they look
  close to the reference.
- `read_console_messages` with onlyErrors — must be empty.
- Duplicate-id scan:
  `[...document.querySelectorAll('[id]')].map(e=>e.id).filter((v,i,a)=>a.indexOf(v)!==i)` → `[]`.
- Feature flow end-to-end by dispatching real events (click/keydown/change), then
  assert DOM + `State.get()`.
- Reload the page, re-shim, re-`init()` → changed state survived.
- Dark theme: `State.get().settings.theme='folio-dark'; applySettings()` → computed
  styles sane (no hardcoded light colors).
- zh-TW: click the language seg → new strings translate (no raw keys visible).
- Escape closes the new surface; Tab stays trapped inside overlays.
- Narrow width: `resize_window` to ~800 and check layout via computed styles.

## Installed-extension release pass

Before any beta or release claim, load the exact candidate unpacked and record the
artifact/commit, browser version, profile, viewport, console/CSP output, network
log, and result for every P0 core flow. Include new-tab, popup, context menu,
shortcut, save-before-close failure, undo, reload/back/deep links, import replace
and merge, concurrent new-tab/popup/background writes, service-worker restart
during and between state-write messages, overlapping capture and ordinary-edit
interleavings, reminder reconciliation, local favicons, and export recovery. The
current managed-browser limitation is evidence of an unavailable test, not a pass.

### Environment quirk (autonomous sessions)

Browser-pane **screenshots time out when the pane is hidden** (renderer produces no
frames; `document.visibilityState === "hidden"`). Verify through
`javascript_tool`/`read_page`/computed styles instead, and say in the report that
pixel screenshots weren't possible. A human load-unpacked pass
(chrome://extensions → Developer mode → Load unpacked → repo root) is the final
visual check.

Some managed browser surfaces reject `javascript:` shim injection as a security
policy. Do not bypass that policy with another browser backend, raw CDP, or indirect
page execution. In that environment, run a local VM/state harness for feature logic
and a static DOM fixture for computed-style checks, report the full shim/reload pass
as unavailable, and leave the human load-unpacked pass as the final runtime check.
