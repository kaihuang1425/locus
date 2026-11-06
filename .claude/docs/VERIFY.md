# Locus verification playbook

Run the static checks after every change; run the runtime pass before calling a
slice done. Never claim visual verification that didn't happen.

## Static checks (fast, always)

```bash
for f in newtab.js popup.js background.js suspended.js emoji-data.js prepaint.js import-utils.js scripts/*.js; do node --check "$f"; done
node scripts/quality-gates.js
node scripts/core-visual-system-contract-test.js
node scripts/general-settings-contract-test.js
node scripts/appearance-settings-contract-test.js
node scripts/privacy-settings-contract-test.js
node scripts/plugins-hub-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/saved-page-reopen-contract-test.js
node scripts/search-recovery-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/library-recovery-contract-test.js
node scripts/popup-locate-contract-test.js
node scripts/trash-recovery-contract-test.js
node scripts/organization-removal-contract-test.js
node scripts/organization-delete-contract-test.js
node scripts/organization-naming-contract-test.js
node scripts/organization-terminology-contract-test.js
node scripts/organization-creation-contract-test.js
node scripts/organization-move-contract-test.js
node scripts/paste-links-contract-test.js
node scripts/group-stack-identity-contract-test.js
node scripts/selection-docket-contract-test.js
node scripts/import-recovery-test.js
node scripts/archive-scale-contract-test.js
node scripts/export-import-scale-contract-test.js
node scripts/background-contract-test.js
node scripts/reminder-identity-contract-test.js
node scripts/calendar-add-task-contract-test.js
node scripts/reminder-overdue-contract-test.js
node scripts/reminder-timezone-contract-test.js
node scripts/undo-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/concurrency-contract-test.js
node scripts/state-storage-order-contract-test.js
node scripts/plan-contract-test.js
node scripts/plan-companion-contract-test.js
node scripts/calendar-planner-contract-test.js
node scripts/today-contract-test.js
git diff --check
```

`today-contract-test.js` (2026-11-06) runs `todayTaskModel()` and
`parseTodayCapture()` in a VM with a fixed Europe/London clock: task order, Later,
duplicate IDs, English and zh-TW date words, `#space` prefixes, rolled times, and a
London DST gap through `plan-contract.js`. It also checks the reused completion and
capture transactions, the edge tab's rail reuse, locale parity, reduced motion,
bundled fonts, and that permissions, CSP, and schema did not move. It does not
render the board; the installed-browser pass for Today is a throwaway Edge profile
driven over CDP (capture, check, Later, card toggle, drawer, themes, 1440 and
390 px, reduced motion).

On `work/locus-redesign` all suites pass on CRLF and LF checkouts. The three
that failed on `654b4a7` (`group-stack-identity`, `concurrency`, and `item-detail` on
CRLF only) were test-harness defects, fixed in `8334709`, `fab7696` and `5b527f2`.

The deterministic suites prove only the contracts they model. They do not promote
a capability to installed-extension runtime verification.
`state-storage-order-contract-test.js` (2026-11-05) models Chromium's
`chrome.storage` round trip, which hands every object back with sorted keys. It
races a fresh profile's own `storage.onChanged` echo against its write receipt in
both orders, covers the boot layout write on the next open, requires the layout
pass and the boot-end `persistBootChanges()` check of a later open to write
nothing, saves a render-created slice once, keeps an own `__proto__` key in the
compared content, and keeps adoption and recovery for genuine foreign graphs. It
does not run the full render. The installed-browser evidence for the race and for
quiet later opens is the throwaway-profile CDP pass in DESIGN.md §6 (2026-11-05).
For the 2026-08-13 current candidate, the complete runner block is the quality gate
plus 32 contract/import/stress scripts (33 runner commands total). A repository-wide
`rg --files -g '*.js'` syntax pass covers 42 JavaScript files, including the two
marketing scripts outside the smaller product/script loop. The default 10,000-
schedule concurrency run and `git diff --check` pass.
The quality gate also requires `--brand-grad` to resolve on the theme-bearing body;
declaring it on `:root` silently invalidates the top-bar primary action because
the active `--accent` tokens do not exist there.

The onboarding suite now also extracts the active-Workspace Locus Trail model,
recovery identity, browser-tab candidate selector, save controller, Home hierarchy,
and tab-refresh focus boundary. It requires the newest allowed saved page to lead
over a newer note, to-do, or unsupported page, while retaining the original newest-
item fallback when no page is eligible for guarded Reopen. Ordering within each
tier uses real `createdAt` and deterministic reverse traversal for legacy rows;
the leading heading is **Continue saved work / 繼續查看已儲存內容**. Exact Workspace,
Space, object-reference, value, and location identity for recovery; and the shared
saved-address allowlist for both candidate selection and Open page. Conflicting
pending navigation, unsafe URLs, stale browser tabs, changed destinations, moved
or replaced saved rows, duplicate activation, and rejected persistence fail closed.
The pending destination contract executes exact Workspace, Space, and existing
Inbox references plus visible path names: same-ID replacement, rename, duplicate
Inbox, replaced Inbox, and an Inbox appearing after an absent-Inbox review all
require another review. The tab-refresh controller executes overlapping query
ordering, exact focus restoration, and suppression of Home repaint while the
capture graph remains optimistic and unacknowledged.
The primary and alternate Save consequences follow and invert the existing
`closeTabOnSave` preference, respectively, while both converge on the shared
receipt-gated capture path and its fresh pre-close source check. A production-
extracted capture action plan requires both Save controls to remain secondary when
recovery exists; on an empty Home, the preferred Save is primary and its inverse
secondary. The same contract
requires English/native zh-TW capture-result parity, one localized live owner,
Home ordering as Trail → Inbox → Spaces, featured-item de-duplication, removed
scenic-hero source, a hidden duplicate top-bar Save on Home, contextual recovery
names, refresh-generation and keyboard-focus restoration, the base stacked vertical
Trail, the exact 901–1100 px compact two-row projection, the horizontal restore
above 1100 px, a visible capture-group fallback focus ring, reduced motion, and
forced-color source rules. The Inbox snapshot label is localized before it enters
Undo history.
The same production-extracted component plan requires an eligible saved page to
render **Open page** first as the only primary action and **View details** second;
a non-page or malformed fallback retains one primary Details continuation.
Keyboard-origin Save success must restore the newly rendered Open control. This is
DOM/model evidence, not installed pixels, screen-reader output, or a real browser
activation.

The same onboarding suite now freezes new-tab capture eligibility against the
production `isOpenableSavedTabUrl()` Reopen policy. Browser-shim cases cover direct
Inbox Save, Welcome, Save all, selected Inbox/new Group/existing Group, palette,
and single drop; mixed fixtures require `http:`, `https:`, `ftp:`, and `file:` to
persist while `data:`, `blob:`, and `javascript:` remain outside the graph and
source-close list. Static production-handler checks require Space, Group insertion,
and Board/List Stack multi-drops to filter before `State.snapshot()`. Rail checks
keep every non-internal tab visible for switch and explicit Close while limiting
Save, drag, batch counts, and dragging state to Reopen-eligible rows. Accepted mixed
captures retain unsupported selection and return focus to its exact checkbox; a
filtered selection uses the rail filter/toggle, and a delayed tab-event repaint
restores the exact checkbox focused immediately before rebuild. Unsafe child drags
stop before batch promotion or `dataTransfer`. The shared Stack-preview controller
executes hover, cancel, refusal, ARIA synchronization, and post-snapshot accepted
commit; handler wiring keeps unsupported and duplicate-only drops outside durable
expansion. A complete selection returns focus to the rail filter. This is static and
production-extracted deterministic evidence, not installed native drag, real tab
cleanup, rendered pixels, screen-reader output, representative-user validation, or
release evidence.

The Undo/capture suite additionally requires all five new-tab drag-drop commit
sites to request a fresh pre-save source read when cleanup is enabled. Its
production-extracted stale-cache case begins with cached `active:true`, observes
the live source inactive, then activates it before the asynchronous read settles:
that single read protects the source and no post-receipt removal read occurs. The
multi-drag case pre-reads both sources, leaves a moved-window source open, closes
only the unchanged sibling after its second read, preserves the accepted graph,
and keeps action-scoped Undo metadata. Separate deferred-read cases mutate the
graph before a successful and a failed combined write; both protect every source,
and failure retains the later edit behind explicit recovery. Missing/malformed
identity and malformed/conflicting pending URLs fail closed. This is deterministic
mocked-browser authority evidence; native HTML5 drag, real event ordering/tab
effects, installed MV3, and user validation remain open.

The saved-page Reopen suite extracts the real workspace walker, globally unique
recovery receipt, URL allowlist/normalizer, direct/suspended/pending destination
matcher, deterministic candidate selector, browser-effect controller, same-URL
lane with exact-context comparison, lock name/manager boundary, sequential bulk
planner/controller, and synchronous UI facades. It covers foreground live and
background live/Hibernate creation only after a fresh exact final tab read;
settled and pending live/suspended reuse; live preference;
near, foreign, malformed, and navigating-away candidates; background reuse;
Hibernate creation; and an explicit new-tab disposition that does not query for
reuse. Unsafe/missing/duplicate/replaced/moved/URL-edited targets and mutations
while query/get is pending produce no browser mutation. Query, candidate,
activation, window-focus, and create failures return distinct typed outcomes
without an uncertain create fallback; activation must report the same exact active
tab, focus must report the expected focused window, and foreground reuse must
fresh-confirm that same exact active tab after focus. Final confirmation accepts
an exact pending destination and rejects a wrong URL, conflicting pending URL,
changed tab/window identity, wrong active disposition, wrong live/Hibernate
representation, or rejected read. A created effect that fails final confirmation
is never retried; one such bulk outcome is counted unconfirmed and stops later
entries as not checked. Identical rapid requests
in one document share one read/effect; a queued different disposition stops behind
an unconfirmed prior effect. Two modeled Locus documents share a LockManager, so
an acknowledged first create is visible to and reused by the second. Confirmed
success is quiet, a coalesced failure owns one localized message and focus return,
and static convergence rejects individual bypasses in Landing, Library/Read Later,
Home Trail, shared cards/layouts, Search, Details, Explorer, Graph, and drop-to-open
and rejects the old blind bulk creator. Bulk coverage freezes exact contexts before
effects; requires the exact rendered Group and nested Stack traversal; keeps
different same-URL saved items independent; reuses before create; and proves strict
one-at-a-time ordering plus new/already-open/not-opened/check-failed/unconfirmed/not-
checked accounting. A failed or malformed profile read and the first unknown effect
stop later work. Board, focused-Group, List, menus, and selection preserve their
opener; ineligible selection Open is disabled with a reason; duplicate activation
has one browser effect; a focusable `aria-busy`/`aria-disabled` opener reports
competing activation and restores prior state/focus; and required recovery remains
in an inline dismissible status instead of an expiring toast. English/native zh-TW,
busy/reduced-motion CSS, and the warning-mark source are statically gated. Popup
route reuse remains separate. This is deterministic production-extracted
browser-API evidence only. It does not establish installed Chrome tab/window/Web
Lock behavior, cross-document visibility after an unknown effect, or eliminate
the non-atomic race in which a user or another extension opens the same URL after
Locus's final query.

The Library recovery suite extracts the production workspace/Stack tab traversal,
route-backed state and canonical query, filtered/status/sorted row projection,
complete destination formatter, row model, exact route-bound recovery receipt,
globally unique visible-target resolver, activation controller, and shared ledger
renderer. It covers one ordered Read Later result, nested Stack destinations,
explicit per-item Open/Details controls, route-only navigation without durable
writes, stale/filtered/duplicate refusal, detail close/Back state, exact rebuilt-row
focus, one renderer across All Links/Favorites/Read Later, removal of the duplicate
Up-next/card implementation, early desktop and 800 px reflow, persistent destination
visibility, privacy blur, anchored keyboard menus, accessible action names, and
English/native zh-TW parity. `item-detail-contract-test.js` separately executes
full `q`/`status`/`sort`/`item` hash round trips, `persist: false` Details open/close,
and unique visible-item validation; the saved-page suite verifies delegation into
the shared exact Reopen coordinator. The Library suite also extracts the shared
return-marker controller and proves both Favorite directions, Read Later add/remove,
read/unread, activation timestamps, exact nested stale/recovery/pending refusal,
one accepted write, zero pre-receipt render/toast/focus, unknown acknowledgement
without retry, and Board/Library continuation plus busy/interlock/navigation
wiring. Its saved-page Archive case separately proves one exact nested tab, the
literal compatible Archive entry and frozen time, duplicate/return-marker/stale/
recovery refusal, one accepted write, no pre-receipt projection or success, accepted
reversible success and caller continuation, unknown acknowledgement without retry,
and exact Board/Library busy ownership.
The same focused suite now extracts the primary Archive ledger's individual saved-
page Restore review/commit seam. It proves exact displayed destination, original and
existing/new Inbox plans, active-ID collision, stale/recovery/pending refusal, exact
object retention, one accepted write, zero pre-receipt projection/success/focus,
unknown acknowledgement without retry, accepted neighbor-focus sequencing, native
en/zh-TW copy, and static row/busy/interlock/navigation wiring. The same suite now
extracts the compact saved-page review continuation: it covers current, stale, and
post-route drift; exact Archive entry-reference focus; zero mutation/persistence;
reachable Search plus dormant Settings wiring; and unchanged non-tab legacy scope.
Its selected saved-page seam separately covers two exact destinations, one shared
missing Inbox, duplicate stable IDs, mixed-content refusal, stale/recovery/pending
refusal, exact object order, one accepted write, zero pre-receipt projection,
unknown acknowledgement without retry, exact one/many-destination success, native
en/zh-TW copy, selection-bar disclosure, and busy/interlock wiring. Its strict Trash
wrappers additionally cover exact row and two-destination batch reviews, frozen
retention fields, Archive/Trash collection isolation, original page-object
retention, one accepted write per action, zero pre-receipt projection, exact
destination-specific success, native en/zh-TW copy and accessible labels, and
row/selection render wiring. Shared collection-aware cases continue to own missing-
Inbox, collision, stale, recovery, and unknown-ack behavior.
The suite's individual Group seam now separately proves one exact Archive entry and
strict Trash wrapper, complete nested Group/item/Stack and reminder identity,
retention preservation, globally conflicting IDs and cross-collection reference
refusal, stale/recovery/duplicate-pending refusal, one accepted write, zero pre-
receipt projection, unknown acknowledgement without retry, exact Workspace/Space
success, destination-only accessible labels, native en/zh-TW copy, neighbor/search
focus, primary row wiring, and compact Search/Settings review routing. The
individual local-item seam now proves note, to-do, and complete nested Stack
review; exact Workspace/Space/Group and new-Inbox plans; original object and every
nested ID; active collision, duplicate, stale, recovery, and unknown-receipt
refusal; one accepted write with zero pre-receipt projection; strict Trash
retention/collection handling; native en/zh-TW copy; primary row, compact review,
focus, and receipt-signal wiring. Selected Group Restore composes its individual
seam and separately proves two exact destinations
plus one shared destination, selected/exact object order, duplicate Group identity
and mixed local-item refusal, stale/recovery/duplicate-pending refusal, one accepted
write, zero pre-receipt projection, unknown acknowledgement without retry, strict
Trash retention/collection handling, exact one/many-destination success, native
en/zh-TW copy, selection disclosure, focus, and busy/interlock wiring. Selected
local-item Restore now composes the individual local seam and proves one mixed note/
to-do/Stack selection, complete nested identity, one and several destinations, one
shared collision-safe Inbox, exact object/order retention, duplicate/stale/recovery/
unknown refusal, one accepted write with zero pre-receipt projection, strict Trash
collection/retention handling, native en/zh-TW copy, selection disclosure, focus,
and the shared receipt signal.
Together, these are static and production-extracted deterministic evidence, not
installed or rendered evidence. Real CSS pixels, browser history/storage and Trash-
retention timing, restored Group reminder-alarm behavior, native screen-reader
output, theme/locale/viewport presentation, representative-user success, and
release remain open.

The Search recovery suite extracts the production saved-address allowlist,
recursive workspace walker, globally unique item resolver, full item and
Workspace/Space/Group/Stack fingerprints, shared recovery context, query
activation, IME input, stale-debounce, in-place roving selection, Search-owned
detail routing, Router apply/build/parse, render canonicalization, persistent live
announcements, and Open/View-details controllers. It accepts exact
`http:`, `https:`, `ftp:`, and `file:` saves once through the shared opener and
rejects blank, malformed, relative, script, data, blob, browser-internal,
extension, mail, telephone, view-source, and custom protocols from that browser
path. Missing items, duplicate workspace/item IDs, cross-workspace duplicates,
same-ID replacements, same-reference path renames, parent insertion/reorder,
moves, URL edits, active-Workspace switches, and opener refusal fail closed with
focus restoration. Unsupported/non-tab Details add `detail=1` to the exact Search
route with `persist: false`; Close and Back preserve every query/filter/sort/
selection field, expanded result window, apply no durable write, and restore the
rebuilt exact result. Detail routes must also remain in the current visible result
window. Search starts with 100 rows; valid URL-backed multiples of 100 reveal
later batches, while invalid values and query/filter/sort changes reset to 100.
The continuation controller selects, focuses, and nearest-scrolls to the first
new row; stale Search sessions cannot receive its delayed focus. Removed or
filtered-out targets clear selected ID, detail flag, sheet target, and canonical
URL together; an interlock refusal clears prepared metadata and reports failure.
Executed activation checks cover settled query Enter, debounce overlap and
cross-session isolation, the full zh-TW IME composition input sequence, result
Enter, ArrowUp/Down reverse/forward wrap, Home/End, related selection, and the
real click → click → double-click event sequence. Selection retains mounted node
identity, updates ARIA/tab order/detail/focus/nearest scroll, and uses URL
replacement rather than adding history. Full encoded URL state, production
apply/render matching, one/many/progressive result copy, URL-window
canonicalization, hidden-before-reveal and exact-after-reveal recovery, live-region signature deduplication,
English/native zh-TW parity, collapsed filters, focus-preserving filter targets,
roving listbox semantics, a button-driven footer outside the listbox,
populated-only bounded narrow results, wrapping tags,
reduced motion, and forced-color focus/selection have executable or source
contracts as appropriate.
The same suite now executes launch-field submission through the real
`submitLandingSearch()`, `closeLandingLayer()`, and `openSearchSurface()` functions.
It requires the trimmed query on the existing active-Workspace Search route,
immediate launch reset/dismissal, Search-input focus, zero browser web-search
calls, English/native zh-TW local-search copy, and no manifest `search` permission.

On 2026-08-02 the complete deterministic/static block above passed against the
current shared worktree. The in-app browser connected, but its security policy
blocked the local-file URL; no alternate backend or indirect server was used, so
no rendered current-source pass was performed. These results do not establish installed MV3
storage/message/service-worker behavior, real browser-tab open/close effects,
screen-reader output, zoom, forced-colors rendering, representative-user approval,
or release.

The organization-terminology contract executes the presentation boundary between
the durable `categories` schema and the Workspace → Space → Group interface. Raw
validator messages and indexed backup paths remain stable for compatibility; user
feedback maps them to one-based localized Workspace/Space/Group/Item/Reminder
locations, preserves quoted values, and prevents fallback diagnostics from
exposing internal organization terminology. The same suite executes English/native
zh-TW key and placeholder parity, dynamic import-count repaint while retaining
`counts.categories`, Explorer labels/listbox names, legacy Space-scroll accessible
names, generic symbol/Finance category preservation, and unchanged
`activeCatId`/`categoryId` fields.

Import review now requires six counts in a flat two-column manifest, one non-color
cobalt locator on the selected mode, a dark registry header, and a bounded
header/body/footer whose body alone scrolls on short screens. At 520 px, manifest
counts and actions become one column. The earlier soft-fill 3×2 fixture dimensions
recorded the superseded presentation and do not verify this current surface.
Current contracts establish DOM order, stable names, overflow ownership,
light/dark tokens, reduced-motion suppression, forced-color rules, and responsive
source rules only. No current rendered Import pass was available. Explorer's prior
fixture evidence remains scoped to Explorer. Actual File/FileReader/chooser/
download behavior, installed MV3, screen-reader output, zoom, pixels,
representative-user approval, and release remain unverified.

The item-detail suite now also extracts the shared rich-text Link controller.
Full `http://` and `https://` addresses normalize; blank, malformed, relative,
script/data/mail/tel/file, and whitespace-bearing values fail closed. The matrix
opens and cancels without a command, restores the exact editor range, rejects
changed HTML/text/nodes/offsets plus replaced, disconnected, or non-editable
targets, and requires one successful `createLink` plus one bubbling `input`.
False and thrown commands restore reviewed HTML, report failure, and keep the
dialog interlock. Static contracts require one delegated Ctrl/Cmd+K path across
Board Notes, Group READMEs, and item-detail notes; blur persistence suppression
only while the dialog owns that editor; localized toolbar/dialog/error semantics;
recovery precedence; narrow/short layout; and reduced motion.

Browser policy rejected the documented current-source `javascript:` shim for this
slice. Per the fallback below, interaction/persistence remained in the
production-extracted harness while a script-free fixture rendered the exact
production HTML fragment and stylesheet. English/light and native zh-TW/Locus
Dark were coherent at 1280×720 and 800×720; the dark compact panel fit 480×500
with 12 px gutters. Valid/invalid URL states and the named toolbar/dialog were
visible, viewport and scroll widths matched, and a fresh fixture tab had no
duplicate IDs, raw localization keys, warnings, or errors. This is static
current-source visual evidence, not live app interaction, installed MV3,
screen-reader, zoom, forced-colors, representative-user, or release evidence.

The background contextual-capture contract now executes one production path for
page, link, selection, image, keyboard-shortcut, and whole-window context-menu
saves. Remembered Workspace/Space/Group tuples, configured default Spaces, and
active Workspace/Space fallbacks must resolve uniquely in their exact hierarchy;
stale, moved, incomplete, or duplicate identities fail closed. Single capture
requires one existing Inbox or provisions exactly one, while Session capture
creates its Group directly in the exact Space with no Inbox side effect. The
allocator skips active, Archive, Trash, capture/default hint, sizing, and Canvas
identities.

Deterministic browser-API cases cover exact-URL duplicates, unsupported addresses,
accepted/conflict/quota/error writes, one-attempt persistence, accepted source
close, navigation after save, disabled close, exact-window query, and
  initiating/newly-active tab preservation. Success and source effects begin only
  after the guarded state receipt. One stable native receipt must then be confirmed
  and carry an exact actionable locator before any source inspection or removal.
  Generic Home fallback retains the accepted save and every source without entering
  cleanup or updating its conservative outcome. Every actionable close fresh-checks
  tab ID, window, URL, and pending URL. An absent pending URL is valid; any present
  pending value must be a string and either empty or exact. Whole-window removal
  additionally requires `active === false`, so missing/non-boolean state is not
  inferred inactive. The generated Session name also executes native zh-TW
  **工作階段**.

The post-receipt cleanup contract now pauses callback-only native creation, accepts
a real intervening `locus-state-write`, and requires exactly one later authority
read under the same background FIFO/Web Lock that serializes whole-state writes.
The lock remains owned through source reads/removals. Single-page cleanup requires
one unique exact accepted Workspace/Space/Group/direct-item tuple at the saved URL;
Session cleanup carries a transient saved-item ID with each source and validates
the original exact Group plus each direct item separately. Current revision may be
newer than the accepted receipt, so harmless unrelated edits still close safely.
Moved/missing/duplicated/nested/retyped/URL-changed or unreadable authority stops
before the affected `tabs.get()`, preserves newer `te`, repeats no write, and emits
no false not-saved warning. Deterministic cases cover displaced item, unrelated
newer write, a queued writer held until source removal completes, rejected
authority read, displaced Session Group, and truthful partial Session cleanup when
only one saved item remains authoritative.

Two additional public-listener cases use a valid 170-character Unicode Workspace
ID whose percent-encoded item or Session locator exceeds Chrome's 500-character
notification-ID limit. Page and whole-window saves must each persist once and
create one generic Home receipt while performing only the two state reads needed
for acceptance: no post-receipt authority read, `tabs.get()`, `tabs.remove()`, or
receipt update is permitted. The conservative page and window outcomes remain
visible and every source remains open.

The same suite now executes the background receipt continuation for page, link,
selection, image, shortcut, duplicate, and whole-window results. It requires one
no-throw conservative notification creation after persistence and before requested
source effects, followed by an in-place final update; typed English/native zh-TW
copy; truthfully closed, kept-open, unconfirmed, and partially closed outcomes;
and zero success receipts for rejected writes. Callback-only create success/error,
update, and clear must remain pending until their callbacks settle; callback-first
success plus late Promise rejection and Promise-first success plus late callback
error must each settle once without repeating effects. The shared adapter reads
runtime errors at the callback boundary. It injects receipt creation/update,
badge, source-read, source-removal,
and continuation-tab failures to prove creation failure keeps sources open, update
failure leaves the conservative clickable receipt, no accepted write/effect
repeats, no false not-saved warning appears, continuation creates before clear,
and a failed continuation preserves its receipt. Receipt locators are rebuilt
without runtime memory, round-trip
reserved characters inside a bounded versioned codec, fresh-resolve exact
same-Workspace item/Group moves, and fall back to local Home for malformed,
missing, duplicated, or cross-Workspace targets without mutation. Privacy cases
require the existing blur setting to hide every organization label and require
unblurred user labels to collapse whitespace, strip control/bidi formatting and
the path delimiter, retain only a bounded recognizable path, and omit page title,
URL, favicon host, selection, and note content.

This is production-extracted model evidence only. On 2026-08-04 the focused
background suite passed eight capture-authority guards, including the two generic-
receipt fallbacks, alongside its existing callback/Promise/hybrid, privacy,
locale, close, and continuation matrix. The prior six post-receipt authority
guards and malformed pending/inactive-source cases remain green. Independent
max-effort review found no actionable P0/P1. All 36 repository JavaScript syntax
checks and all 27 deterministic commands pass, including the default 10,000-
schedule concurrency gate; `git diff --check` and the untracked current-slice
whitespace scan are clean.
A fresh 2026-08-09 supported-browser diagnostic exposed only the in-app browser.
Google Chrome is installed but not running; its shared native-host manifest and
registry entry are correct, while the ChatGPT browser-control extension is absent
from the selected Default profile. No browser launch, profile mutation, raw CDP,
shell automation, or alternate backend was attempted. This is environment-gate
evidence only, not installed Locus evidence. Installed MV3 context-menu, native
receipt rendering/accumulation, screen-reader pronunciation, storage/message
teardown, real tab effects, service-worker restart/crash timing,
representative-user, and release evidence remain open.

Accepted quick-capture receipt truth has a production-extracted state-write handler
contract.
On 2026-08-13, `testQuickCaptureStateReceiptBoundary()` was extended through the
real extracted `handleStateWriteMessage()` seam. Four root-valid accepted candidates
add an unrelated present non-array Workspace/Space/Group/nested-item collection;
each advances storage exactly once, returns top-level `{ok:true, revision}` with
the strict unavailable destination, retains the accepted graph, and performs zero
tab, route, notification, or source effects. A malformed Space ID also returns
unavailable rather than a malformed success destination. A separate valid
200,000-entry nested Stack proves receipt traversal no longer depends on variadic
argument limits. Existing exact-success, wrong-URL, pre-write rejection, malformed
popup-receipt, and explicit worker-owned Open/Close cases remain green. The focused
script syntax and popup Locate suite pass; the broader 2026-08-04 repository suite
is historical evidence and was not rerun for this regression-only cycle. This is
deterministic mocked-browser evidence only. Installed MV3 message/storage ordering,
worker termination, rendered/accessibility behavior, representative-user
comprehension, approval, and release remain open.

Fresh current-source browser-shim evidence covers the canonical first save,
exact Inbox handoff, navigation away, reload persistence, Home recovery, and one
guarded reopen request. The same source rendered the repaired primary Save action
at 1440×900 and 1280×720 in English/light plus 800×720 in native zh-TW,
dark theme, and reduced motion. Computed gradients were present, viewport and
scroll widths matched, duplicate-ID/raw-key scans and browser error logs were
empty. This remains non-installed evidence: MV3 CSP/permissions, service-worker
and message lifetime, real browser effects, forced colors, zoom, and screen-reader
output are still open.

The core sidebar toggle contract now executes expanded and collapsed production
labels, asserts English/native-zh-TW key parity, and requires tooltip,
accessible-name, `aria-controls`, and `aria-expanded` agreement. Current-source
browser checks exercised both states, focus retention, and collapsed-state reload
persistence at 1440×900, 1280×720, and 800×720 zh-TW/dark/reduced-motion. This is
DOM/current-source evidence, not actual screen-reader output or installed Chrome
evidence.

The core-shell contract now also executes both opened-tabs rail states, requires
English/native-zh-TW parity for **Views / 檢視**, the rail consequences, and
**Switch layout / 切換版面**, and rejects markup without the corresponding
accessible-name, controlled-content, and expanded-state semantics. Current-source
checks covered Home and a populated Space, click focus, expanded-state reload
persistence, English/light 1280×720, native zh-TW/dark/reduced-motion 1440×900,
and the hidden rail at 800×720. Viewport widths matched, duplicate-ID scans were
empty, and the scoped zh-TW audit found no English residue in those controls. This
does not establish installed MV3, real screen-reader, zoom, or forced-colors
behavior.

The Board contract rejects hardcoded Add-tab/Note/To-do controls and the
stylesheet-owned English empty-Note hint. It requires English/native-zh-TW parity
for creation, read-only record actions, empty excerpts, marker choices, and Details
editor names. Board and command-palette Note/To-do creation must freeze one exact
Group item-list, create one compatible record, establish an exact destination
receipt, await `State.persistNow()`, and only then render and focus the new Details
field. Static assertions reject the retired delayed `State.persist()` plus
`.note-text`/`.todo-text` focus paths. Installed MV3 creation timing, current pixels,
reload, native assistive technology, and real focus remain open.

The Board contract requires Note and To-do cards to be native read-only Details
routes. `detailPrimaryEditor()` owns rich Note HTML sanitization/auto-linking and
To-do text; both use the production-extracted item-detail transaction. The shared
receipt harness proves detached candidate planning, exact current-graph
re-resolution, no-op behavior, one snapshot/write, duplicate refusal, stale and
recovery refusal, acknowledged success, rejected/unknown recovery, and zero retry.
Link-dialog blur remains owned by the exact Note editor. This is source and
production-extracted deterministic evidence; installed storage lifetime, rendered
pixels, real formatting/Link and paste sanitization, IME, keyboard, and screen-reader
behavior remain open.

The Board contract now executes deferred `toggleBoardTodoCompletion()` receipts in
both states. It requires exact context create/re-resolution, one localized next-
consequence snapshot, one `done` inversion, and exactly one `persistNow()` with no
pre-receipt render or focus. Duplicate pending, stale, changed, retyped, and
recovery-owned targets are refused before another write. Acceptance releases the
inert path, renders once, and focuses the same item ID's rebuilt native button;
unknown acknowledgement releases local busy state into recovery without retry,
render, or focus. Static checks require the busy checkbox/card state, exact sibling-
path inert ownership, route/history/programmatic/global-shortcut blocking,
`aria-pressed`, localized next-action/editor names, localized Note/To-do Archive
controls, and keyboard-visible To-do actions. Installed storage ordering, rendered
pending pixels, and real keyboard/screen-reader focus are not verified by this case.
Current-source checks covered both states, exact-item focus return, completion
reload persistence, new-To-do focus and reload persistence, English/light
1280×720, and native zh-TW/dark/reduced-motion 1440×900 and 800×720. Width and
duplicate-ID checks passed. Installed keyboard and screen-reader behavior remains
open.

The opened-tabs contract now requires native checkbox-button semantics, localized
exact-tab Select/Deselect and Close names, immediate dynamic repaint after locale
changes, and post-render focus by stable browser tab ID. It rejects the prior
custom keydown handler and hardcoded empty, sleeping, menu, badge, drag, and row
copy. Current-source checks covered populated/empty/sleeping rails, one- and
two-tab selection, deselection, batch controls, context menus, and an exact
tab-remove request at 1440×900 and 1280×720; the zh-TW/dark/reduced-motion rail
remained hidden at 800×720. Width and duplicate-ID checks passed. Real installed
keyboard, screen-reader, drag, and tab effects remain open.

The Board resize contract now executes keyboard 16/48 px steps, exact pointer
deltas, lower/upper bounds, untouched-axis preservation, and the existing exact
`columnSizes[groupId] = { w, h }` writer with one `State.persist()`. Static checks
require native English/native-zh-TW Group-specific controls, capture/release,
handle-local pointer move/up/cancel/lost-capture listeners, temporary Group-reorder
suspension, light/dark/forced-color focus, and absence of the old pointer-only
markup, English **Resize**, `mousedown`, and document mouse listeners.
Current-source keyboard and visual checks covered 1440×900, English/light
1280×720, and native zh-TW/dark/reduced-motion 800×720. Width moved
290→306→354 px, height moved 283→299 px, exact focus remained, and reload
retained 354×299 px; focused Group pages hid both controls, widths matched, and
captured browser errors were empty. A CUA drag is explicitly not a pass: after
capture the in-app driver emitted only `pointerdown`, with no continuation event.
Installed Chrome must still establish the real captured-pointer lifecycle,
screen-reader output, zoom, and forced-colors behavior.

The Details marker contract executes the production `detailItemMarkerPicker()`.
It requires one localized named radiogroup, roving Arrow/Home/End focus, six
compatible explicit choices, and a seventh truthful read-only custom choice only
when current imported bytes are nonstandard. Its extracted case proves the exact
custom color is exposed without a write, keyboard focus moves predictably, and an
explicit choice delegates to the shared item-detail commit. Static checks require
the card More/pointer/Shift+F10/Context Menu paths to route to this same Details
field, forbid `.color-menu`/`.cdot` residue, and constrain custom bytes to a
`background-color` variable. The generic item-detail receipt harness owns actual
standard-marker persistence evidence. Installed MV3 storage timing, rendered
light/dark/forced-color pixels, native keyboard/screen-reader behavior,
representative-user comprehension, and release remain open.

The onboarding suite extracts the production welcome controller and drives its
loading, real-tab success, no-eligible-tab, tab-query error/retry, failed-save,
focus, Tab containment, Escape, opener-return, Inbox handoff, and saved-item focus
paths against a minimal DOM/browser model. It also requires one canonical welcome
in the markup, localized English and zh-TW query failure copy, the retained narrow
and reduced-motion rules, and absence of the old questionnaire, spotlight tour,
coach mark, tip controls, and native reset confirmation. This is deterministic
production-controller and static-source evidence, not installed Chrome tab-close,
pixel, screen-reader, viewport, theme, reload, or browser-history evidence.

The same suite extracts the saved-address guard, Open delegation, primary-focus
resolver, and first-save focus helper. It accepts an ordinary HTTPS save, rejects
blank, malformed, script, and extension addresses without a browser effect, and
preserves exact URL/focus intent for a valid request. Static and helper contracts
require a native localized title/Open action, wrapper `tabindex="-1"`,
keyboard-visible sibling actions, direct-card scoping that cannot enter a nested
Stack, whitespace-title fallback, direct-primary detail return, and a render-only
expanded focused Group/Inbox that does not mutate the stored collapse preference.
It also drives pointer and Shift+F10/Context Menu opening against the production
saved-tab builder, requiring primary-action anchoring, first-item focus, Escape
opener return, localized commands, no native title prompt, truthful clipboard
success/failure receipts, post-toggle card focus, next/previous/Group archive
fallback, and omission of the click-only color and legacy direct-reminder pickers.
The item-detail contract requires Edit title to carry a one-shot `title` focus key
through route preparation, focus the real title field before the panel fallback,
and gate detail Open through the same allowlisted saved-address helper.
The Group/Stack identity suite additionally requires post-render Group focus to
skip the hidden focused-page collapse control and land on the visible More action.
This remains deterministic/static accessibility evidence; installed tab creation,
screen-reader output, pixels, browser zoom, themes/locales, and 1280×720/800 px
behavior are not verified.

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
accepted-state receipt before separate `locus-complete-popup-locate` dispatch plus
the effect listener's FIFO/Web Lock handoff; no effect after rejected or unknown
state; exact
and moved/nested same-Workspace identity;
missing, duplicate, archived/trashed, and moved-out fail-closed targets; encoded
Home-detail routes; exact source ID/window/original-active/current/pending-URL
preflight; source-window route create, activation, focus, and confirmation before
close; exact inactive source revalidation and a final exact active committed-route
read immediately before removal; close-disabled, route-create, source-close, activation,
route-changed/unconfirmed, and fresh exact already-created-tab/notification retry
outcomes before activation and after focus, including inactive and legacy-notice
fallback cases; accepted-save/failed-Locate typing; non-authoritative
effect-unknown handling without rollback or retry; optimistic rollback on rejected state;
receipt timeout,
native-coded and non-object transport rejection, and late receiver-retry
cancellation; semantic in-section recovery and retry live feedback, English/zh-TW
parity, focus and motion hooks; and suppression of Landing/Welcome over a valid
recovery deep link.
It proves production-extracted deterministic behavior only. Installed action-popup
teardown, message-port/service-worker lifetime, real tab activation/focus/close,
the last-check-to-effect interval, pixels,
screen readers, themes, locales, and 1280×720/800 px layouts remain open.

The popup suite now also extracts the production destination resolver, retained-ID
allocator, proposed-Inbox materializer, save-before-hibernate flow, bookmark
builder/import transaction, and ordinary source guard. Preview must leave the
graph byte-for-byte unchanged. Explicit, remembered, configured-default, and
active destinations resolve one unique Workspace/Space/Group hierarchy; stale,
incomplete, moved, duplicate, or changed proposed targets fail closed. The
allocator skips active, Archive, Trash, capture/default hint, sizing, and Canvas
identities and reserves its own results across Inbox, Session Group, bookmark
Group, tab, and note generation.

The production-extracted matrix covers existing/proposed/duplicate Inbox,
single-tab and hibernate accepted/rejected/no-content writes, links/queue and
Session generation, Session and bookmark Groups without Inbox side effects,
bookmark pending overlap and empty/rejected rollback, and exact ordinary source
ID/window/current URL/pending URL revalidation. Only an accepted ordinary receipt
may reach `chrome.tabs.get()` and then `chrome.tabs.remove()`; changed,
unavailable, disabled, or unconfirmed sources remain open. The 2026-08-13 extension
adds the accepted-source UI boundary: requested closes rejected by changed URL,
window, or pending navigation, plus unavailable source reads, must render one
existing Saved result card, reuse localized protected/unconfirmed copy, focus Open
saved item, and produce no generic toast, 400 ms dismissal, or removal. The result
must preserve the accepted Workspace/item/source/window/active/URL identity with
`closeSource:false`; the existing quick-action controller then fresh-resolves and
confirms the exact local item route or retains its conservative unavailable/unknown
fallback. Close remains popup-only. Confirmed close and intentional close-off keep
their previous quiet completion. This adds no installed popup, bookmark,
storage/message lifetime, or real tab-effect evidence.

The supported Chrome check on 2026-08-13 exposed only the in-app browser. Google
Chrome is installed but not running; `check-extension-installed.js --browser
chrome --json` reports the selected Default profile without the ChatGPT browser
extension, while `check-native-host-manifest.js --browser chrome --json` reports a
correct shared manifest, origins, and registry path. No Chrome window was launched
because the required bridge is absent, and no raw debugging, shell control, profile
mutation, or alternate browser backend was substituted. This is environment-gate
evidence only.

The expanded production-extracted popup-Locate suite passes for this candidate:
`Popup save/locate contracts passed: receipts, identity, URL-safe source recovery,
exact destination routes, LIFO focus, and locale parity.` Its asked single-tab
matrix executes returned source-ID/window/active/current/pending changes, an empty
pending URL, pending-only recovery refusal, route replacement/read failure,
activation/focus/remove failure,
close-off, state/effect dispatch ordering, delayed retry tab reuse, typed unknown
effects, exact queue ordering, and the successful preflight → route → final-close
sequence. Static gates require single-tab Locate and
`saveWindow()` to await a valid ordinary
state receipt before dispatching the separate worker-owned
completion request, prohibit page-owned tab removal, require the
completion worker to fresh-resolve the exact Workspace/Group destination, and
require its listener to hold the central `enqueueStateWrite` FIFO/Web Lock from
fresh resolution through removal. They also require recursive expected-URL
membership in the exact receiving Group, unique `{ tabId, expectedUrl }`
descriptors, and `chrome.tabs.get()` source-window, inactive-state, current-URL,
and pending-URL confirmation before each removal. Markup and source checks retain
the in-section result, exact Open-destination route,
last-opened-first-closed section history, roving save-mode radio Tab stop, localized
radiogroup/tag/note names, and truthful **Close other tabs after saving** copy.

The production-extracted matrix covers links-only, session-Group, reading-queue,
duplicate-only note saves, and the all-duplicate/no-note early no-op;
rejected/unknown writes with zero completion dispatch; missing, duplicate,
moved-out, and moved-within destinations; close-off, all-success, partial-failure,
unknown completion receipts, no-other-tab, active-tab retention, source-window
filtering, active-state and URL/pending-URL rechecks, malformed/duplicate source
descriptors, navigated/redirecting candidates, authoritative moved/renamed
destination names, recursive nested-Stack saved-URL membership,
malformed count/destination receipts, and exact counts;
encoded Group-route round trips; create/activate/focus failures and exact-tab retry;
fresh destination redispatch instead of direct remembered-tab activation;
route-navigation mismatch after activation;
first-use Group-route Welcome suppression without onboarding mutation; the localized
receipt and the result primary's destination/summary/source accessible description;
LIFO Back/Escape/opener return with hidden, disabled, and disconnected opener
fallback; and roving radio behavior.
Installed popup teardown, real tab effects, screen-reader output, theme/locale
pixels, reduced motion, 1280×720/800 px layouts, and representative-user behavior
remain open regardless of that deterministic result.

The same popup suite now includes the ask-every-time-off single-tab quick-capture
matrix without treating it as the asked ordinary Save/Locate path. A valid accepted
state receipt must produce one strict `quickCaptureResult` and render the existing
result card with current Space/Group/title while leaving the source open. Rejected,
timed-out, lost, malformed, or acknowledgement-unknown state must dispatch no quick
browser action. Static/source contracts prohibit page-owned quick removal, timed
close, toast, modal, notification, and forced navigation; require primary **Open
saved item**, conditional **Close tab** or **Close popup**, initial primary focus,
localized English/zh-TW names, `100dvh`, compact rules at 520 px height or less, and
retained reduced-motion behavior.

Quick Open/Close tests extract the worker resolver, action handler, route helper,
and popup result/action controllers. The matrix covers exact active saved-item URL
and owning-Space identity; same-Workspace move/rename; missing, duplicate, stored-
only, and moved-out rejection; encoded `/home?item=<id>` creation/reuse,
activation/focus, and current/pending route confirmation; exact source tab/window/
current URL, different pending URL, and inactive-to-active protection; a route read
after focus and a second read after source validation immediately before removal;
close-disabled, close-only, open-only, open-and-close, route mismatch, route
unconfirmed, protected and unconfirmed source outcomes; strict contradictory/
malformed receipt rejection; and unexpected worker failure typed as
`effectUnknown`, with safe Open identity retained and destructive Close disabled.
Installed action-popup teardown and message-port/service-worker lifetime, actual tab
activation/removal/focus, the final read-to-effect race, real scroll behavior at
520 px or less, pixels, keyboard/screen-reader behavior, light/dark, English/zh-TW,
reduced motion, 1280×720/800 px layouts, reload/history, and representative-user
completion remain open.

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

The same suite now separately extracts
`commitItemReminderMutation()` for non-detail Board and Calendar item reminder
entry points. Set, Change, quick choices, Clear, and Calendar reschedule freeze
Workspace/Space/Group/Stack ancestry, exact record/reference, item type, location,
and the complete value fingerprint. The controller preserves imported reminder
fields, owns only schedule/recurrence/delivery state, takes one localized snapshot,
and awaits exactly one `persistNow({ reconcileReminders: true })` receipt; static
checks reject page-owned alarm creation/clearing and premature picker close.
Accepted, accepted-with-alarm-warning, rejected, unknown, no-op, invalid,
pre-existing-recovery, duplicate, replaced, moved, ancestor-replaced, changed,
retyped, clear, and duplicate-pending outcomes execute against the production
controller. Until acknowledgement, the picker remains open and `aria-busy` with
guarded controls and no render, success, warning, or focus movement. Accepted
completion renders once and restores the exact rebuilt Board item or Calendar
target; rejection leaves the picker open beneath recovery without an optimistic
badge.

Fresh current-source browser-shim checks covered Board Set/Clear and Calendar
Edit/Clear, exact focus return, reload persistence, a 1.2-second deferred receipt,
and rejected-write recovery. The deferred picker stayed open and busy, announced
the localized saving state, and rendered no badge before acknowledgement. The
rejected picker retained localized failure beneath recovery and rendered no badge.
English/light 1280×720 and native zh-TW/Locus Dark 800×720 dialogs remained
bounded; duplicate-ID scans and browser logs were empty. This remains non-installed
evidence: MV3 message/storage/alarm/service-worker lifetime, notifications,
restart/sleep, real screen-reader output, zoom, forced colors, and
representative-user behavior remain open.

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
  runtime gates. Group/Space destructive removal is covered by the focused exact-
  target suite below. Group/Space add, edit, and reschedule remain outside the
  item and entity-removal reminder controllers. Stack identity uses its
  separate identity-controller evidence; Archive and the Open browser effect remain
  separate flows.

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
controller and drives the shared Board/Canvas/focused/List Group action model
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

The Paste links suite extracts the production parser, exact-destination context,
controller, focus/interlock helpers, and route guards. It requires unique full
HTTP(S) lines; one frozen Workspace/Space plus stable existing-Group identity;
active-view changes and harmless sibling reorder without redirection; and zero
snapshot/write for missing, moved, duplicated, replaced, renamed, or otherwise
unsafe reviewed targets. An empty Space must expose New group immediately and use
the current locale's fallback name only when its visible field remains blank.
Detached Group/item allocation must reject active, Archive/Trash-envelope,
capture, sizing, and Canvas identifier collisions. A valid import publishes
pending state synchronously, takes one localized snapshot, mutates once, and
awaits exactly one `State.persistNow()` receipt. Duplicate activation, close,
scrim, Escape, app shortcuts, and route changes stay blocked while pending.
Rejected or acknowledgement-unknown writes retain the dirty graph behind central
recovery without render, close, toast, retry, or false success. Accepted writes
render, restore the exact opener, announce the localized count/destination, and
bind Undo to the exact snapshot action ID. Static contracts require the named
dialog, real field labels, polite validation/error regions, live locale repaint,
background inertness, recovery precedence, 32 px height gutters, body scrolling,
520 px action reflow, focus tokens, reduced motion, and English/zh-TW parity.

A fresh bundled-Node Chromium shim rendered the current source at 1280×720 in
English/light and 800×720 in zh-TW/dark with reduced motion. The dialog remained
480 px wide and inside the 720 px viewport, the body was scroll-bounded, validation
reported two accepted and two skipped lines, initial focus reached the textarea,
and Settings was inert. A deferred acknowledgement kept the dialog `aria-busy`,
blocked Escape/close, and exposed no success; an acknowledgement-unknown outcome
opened central recovery and retained the dialog. A separate accepted receipt
imported exactly one real link into the reviewed Group, restored
`#paste-import-btn`, exposed localized Undo, and survived a shim reload with the
same item ID, locale, and dark theme. The reloaded DOM had no duplicate IDs or
console/page errors after the plain-HTTP harness stubbed the extension-only
`_favicon` endpoint. This is deterministic and current-source browser-shim
evidence, not installed MV3 storage/message lifetime, cross-window adoption, CSP,
local-favicon, network, screen-reader, or representative-user evidence.

The Group/Stack identity suite extracts the production identity controller and
executes it against representative nested graphs. It requires explicit empty-
Space, Board, List, focused-Group, Stack-detail, and selected-item batch entries to
converge on one localized dialog, with the dead generic controller, native naming
prompts, inline/contenteditable identity editors, and the old direct Duplicate
mutation absent. Board, Canvas/focused-Group, List More, and List context Duplicate
actions must converge through one exact-target Group action model on the same
controller. It covers primitive
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

The background notification-click matrix now also executes the shared local-route
fallback used by capture receipts and popup Locate notices. It requires one create,
a non-negative integer returned tab ID, and one fresh read of that exact ID before
the notification may clear. Exact committed or pending routes pass only when the
final tab is active and has a non-negative integer window ID. Final-read rejection,
negative or malformed identity, wrong route, inactive state, conflicting pending
navigation, whitespace-only pending navigation, and non-string pending state keep
the receipt and perform no retry. Nine continuation guards pass. This proves the
modeled browser-API contract only; actual notification-center retention, native
tab presentation, service-worker teardown, and installed click behavior remain
open.

The same background suite invokes the production `alarms.onAlarm` listener for eight
accepted deliveries. Daily item, multi-day nested-item, biweekly group, and monthly
category recurrences must each create exactly one notification in the modeled
Promise-returning API mode, advance only
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
  occurrence and create a clickable scheduling warning. The same public alarm seam
now covers callback-only native creation. With an item callback withheld, delivery
remains pending after a host turn with one attempt, zero delivered notification,
zero state write, and zero reconciliation. Callback error leaves the exact graph and
revision unchanged. Callback success records one native notification, marks only the
one-shot notified through one central write, and produces the observed effect order
`storage-set` then `alarms-get-all`. A separate callback-only recurring Group case
advances only its stable reminder ID and re-arms its exact alarm after that same
receipt/write/reconcile order. The existing Promise-mode delivery matrix and shared
hybrid settle-once wrapper coverage remain green. Installed native delivery,
notification-center behavior, and service-worker lifetime remain open. The focused reminder-identity
suite separately extracts `commitEntityReminderRemoval()` and its production
helpers. Group and Space cases freeze owner/location/runtime identity, stable
reminder ID, reminder identity, and value fingerprint; allow harmless sibling
reorder; and fail closed for missing, duplicate, replaced, changed, moved,
archived, or trashed targets. Pre-existing recovery must stop before snapshot,
write, pending state, or live mutation. A valid target takes one localized
snapshot and waits for one `persistNow({ reconcileReminders: true })` receipt
before close, render, success, Undo, or focus movement. Rejected and unknown
receipts keep the dialog/recovery state with no success; accepted state plus alarm
failure keeps the removal and exposes the localized warning with exact Undo.
Pending must block duplicate activation, Escape, close, and scrim dismissal while
Tab remains trapped. Extracted browser-history handling must restore the reviewed
route before blur or route application while entity removal is pending, and static
Router checks require both programmatic navigation guards to include that receipt.
Success focuses the next reminder, previous reminder, or current owner fallback.
A separate extracted stale-entry controller must refresh current state, announce a
localized error, and schedule owner focus recovery when a captured menu action can
no longer open its reminder. Static wiring requires every Group, Space, and
Calendar destructive entry path to pass a stable ID through that reporting picker,
with English/zh-TW parity. Compatibility assertions continue to cover schema-12
migration persistence, add/edit/reschedule identity, alarm retirement, notified
reminders, and delimiter-safe stable and legacy alarm components.

Fresh bundled-Node Playwright evidence exercises the current source in a browser
shim at 1280×720 and at 800×720 with zh-TW, dark theme, and reduced motion. The
dialog remained bounded with exact destructive initial focus. During a deferred
receipt it stayed open and `aria-busy`, blocked Escape, and retained the old rows;
after acknowledgement it closed, rendered only the survivor, focused that
survivor, and exposed Undo. The run reported no console or page errors. This is
rendered shim evidence, not installed-MV3 evidence for real Chrome storage,
alarms, cross-window adoption, notification delivery, message/service-worker
lifetime, screen-reader output, or representative-user behavior. The focused
time-zone suite below owns the separate deterministic DST/date-line contract.

The reminder-overdue suite extracts the production pending-reminder projection,
item badge, editor, and Calendar-entry paths. Unnotified overdue one-shots and
expired recurrences must retain their stored Past due time; delivered records and
malformed timestamps must leave every pending surface; and future one-shots must
retain their exact time. Missed daily, biweekly, and monthly recurrences must
project to the same first future local-calendar occurrence as background
reconciliation without mutating stored data. Projection must preserve stable
reminder IDs; array indexes may remain only as compatibility metadata. Calendar
edit, remove, drag, and reschedule paths must carry the stable reminder ID, keep
entries sorted, open item/entity editors on the projected occurrence, and wire the
landing, app-menu, Calendar, and item-badge signals through one policy. This is
deterministic DOM-free model evidence, not installed alarm delivery/restart or
notification timing; the rendered reminder-dialog shim evidence is recorded above.

The same suite extracts the shared `fmtTimeRelative()` helper and executes ten
future/past threshold cases in each supported locale. English must retain compact
**soon / now / in 2m / 2m ago / in 2h / 2h ago / in 2d / 2d ago** behavior;
native zh-TW must produce **即將 / 剛剛** plus variable
**分鐘／小時／天 + 前／後** forms. The contract rejects formatter-owned English
literals and requires the settings language handler to repaint dynamic surfaces
from unchanged timestamps. All current formatter callers—reminder badges and
lists, Calendar, search, Read Later, and Archive—therefore share one locale
boundary.

Current-source checks used one persisted item reminder and the real language
controls to repaint `in 58m → 58 分鐘後 → in 58m`, then verified reload. The
Board badge and Calendar Agenda timestamp rendered at English/light 1280×720 and
native zh-TW/Locus Dark 800×720; viewport and scroll widths matched. Duplicate
IDs, raw relative-time keys, scoped zh-TW English relative fragments, and browser
logs were empty. This is current-source browser-shim evidence, not installed MV3,
screen-reader, zoom, forced-colors, or representative-user evidence. The
surrounding Calendar shell is covered by the immediately following slice.

The Calendar copy contract now requires 33 English/native-zh-TW keys and executes
the production empty-Note/untitled fallback, Today/Tomorrow, 0/1/many day-count,
Group/Space source-label, and dot-title helpers. Static checks reject the scoped
English breadcrumb, period, view, navigation, filter, Past due, empty/error, and
fallback literals. They also require a localized breadcrumb landmark, grouped
Month/Week/Agenda controls with exact `aria-pressed` state, an explicitly named
filter, one authoritative workspace-empty or filter-empty state, and Escape
focus restoration after a nonempty filter is cleared. Protected `type:`, `in:`,
`color:`, and `source:` operators and user-authored names remain data.

Fresh current-source checks covered Agenda, Month, and Week routing; Past due and
future sections; localized reminder context menu; exact Open/Back return; filter
match, single no-match state, clear/caret focus; single workspace-empty state; and
live locale repaint. The latter preserved `?cal=agenda`, `source:item`, and the
same two reminder IDs while changing the app-owned shell. English/light
1280×720 and native zh-TW/Locus Dark/reduced-motion 800×720 matched viewport and
scroll width; duplicate IDs, raw Calendar keys, scoped app-owned English residue,
and browser warning/error logs were empty. This remains current-source shim
evidence, not installed MV3, screen-reader, zoom, forced-colors, or
representative-user evidence. Group/Space add/edit/reschedule and Calendar
Add-task are covered immediately below.

The Group/Space reminder mutation contract now extracts one production controller
for add, edit, and Calendar reschedule while retaining destructive removal as a
separate controller. It requires exhaustive owner references and location IDs,
stable reminder ID/reference/value matching for edit, safe sibling reorder and
neighbor changes, collision-safe ID allocation for add, imported-field
preservation, recurrence normalization, Calendar-only time ownership, semantic
no-op, one localized snapshot, and exactly one
`State.persistNow({ reconcileReminders: true })`. Duplicate, replaced, changed,
moved, recovery-owned, invalid-time, and duplicate-pending cases fail closed. The
controller contains no page alarm call, delayed `State.persist`, retry, or
rollback. Accepted state plus alarm failure warns with exact Undo; rejected and
unknown receipts render or claim nothing. Picker and hidden-picker Calendar
pending states execute their close, Escape, shortcut, page-inert, history/route,
and exact row/dot/owner focus interlocks.

Fresh current-source interaction covered accepted Group edit and reload, a
five-second delayed Group add with one old row, open `aria-busy` picker, guarded
controls, blocked Escape, and exact newly allocated row focus, native zh-TW Space
edit with owner focus, and a rejected edit retained beneath fail-closed recovery
with no optimistic row or success. English/light 1280×720 and native zh-TW/Locus
Dark 800×720 screenshots were clean; duplicate IDs, raw keys, and browser
warning/error logs were empty. The in-app coordinate driver did not synthesize a
successful native HTML5 drag. A test-only page-world
`dragstart`/`dragover`/`drop`/`dragend` sequence exercised the current production
handlers, moved the exact stable Space reminder from August 2 to July 31, focused
that dot, and survived reload. Treat this as synthetic current-source handler
evidence only. Installed MV3 storage/message/alarm/service-worker lifetime,
native drag, notification/restart/sleep, screen-reader, zoom, forced-colors, and
representative-user evidence remain open. Calendar Add-task is covered
immediately below.

The Calendar Add-task contract extracts the production dialog and transaction.
It requires a visibly reviewed date, fixed 9:00 AM reminder, active
Workspace/Space, and exact existing or proposed Inbox. Confirmation re-resolves
the frozen object references and IDs; harmless Group reorder and unrelated edits
remain safe, while duplicate IDs/Inboxes, replacement, removal, move, rename, or
active-destination change fail closed. Collision-safe allocation reserves active,
Archive, Trash, and retained destination identities before creating at most one
Inbox plus one to-do/reminder. The path takes one localized snapshot and exactly
one `State.persistNow({ reconcileReminders: true })`; static checks reject the
native prompt, page alarm, delayed writer, retry, and rollback.

Fresh current-source interaction covered accepted save, exact dot focus, Undo,
and reload; a 60-second delayed write with the dialog still busy while native
Escape and Back were blocked; and rejected-write recovery with no optimistic
task or success. English/light 1280×720 and native zh-TW/Locus Dark 800×720
dialogs were visually bounded. The final 800×720 audit found 437 IDs, no
duplicates or raw localization keys, and no warning/error logs. Treat this as
current-source browser-shim evidence only. Installed MV3
storage/message/alarm/service-worker lifetime, notification/restart/sleep,
screen-reader, zoom, forced-colors, and representative-user evidence remain open.

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
report no success. Replace alone creates the safety backup. The suite also executes
the production review controller for pending/duplicate interlock, Replace-to-Home
focus, Merge opener return, rejected persistence, ordinary and pending Escape, and
upper recovery ownership. Its extracted bookmark-import boundary covers pending
overlap, exact post-read Workspace/Space authority, acknowledged action-ID Undo,
destination replacement with zero mutation/write, and rejected persistence with
local rollback and no success. This is fixed-seed deterministic browser-API model
evidence, not evidence for Chrome's DOM-backed rich-text sanitizer transformations,
actual File/FileReader/chooser/download or bookmark effects, rendered preview
behavior, real quota allocation, reminder outcomes, service-worker lifecycle, or
installed round trips.

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

## Focused launch-navigation contract (2026-08-09)

Run:

```powershell
node scripts/onboarding-contract-test.js
```

The public contract must prove that the established-user launch layer does not
render or sequentially focus Tools or Reminders, while Calendar and Tools remain
reachable through the production More-menu source. This is static/deterministic
evidence only; installed rendering, assistive-technology output, and
representative-user comprehension remain open.

## Focused top-bar Save receipt contract (2026-08-09)

Run:

```powershell
node scripts/onboarding-contract-test.js
```

The production-extracted case must accept one top-bar capture once, present the
saved title plus exact Workspace › Space › Inbox path without automatic
navigation, retain exact-action Undo, route Show once with `persist: false`, and
refuse a changed target without another write. Static checks own the top-bar-only
opt-in, optional native toast action, and bounded wrapping. This remains static and
deterministic evidence; installed timing, pixels, real tab effects, keyboard and
screen-reader output, and representative-user comprehension remain open.

## Focused top-bar pre-Save review contract (2026-08-09)

Run:

```powershell
node scripts/onboarding-contract-test.js
```

The production-extracted `saveMostRecentOpenTab()` case must open one menu without
capturing, show the literal page title, host, localized **Save to** label, and exact
Workspace › Space › Inbox path, and give both actions title-and-destination
accessible names. Activating copy must fresh-check source and destination, then
delegate exactly once with `{ closeSource: false, receipt: true }`; changed
destination truth must delegate nothing. Static checks own the optional review
markup and bounded title/host plus wrapping destination geometry. Installed menu
rendering, real browser/storage effects, timing, keyboard and screen-reader output,
and representative-user comprehension remain open.

## Focused prominent Search-entry contract (2026-08-09)

Run:

```powershell
node scripts/search-recovery-contract-test.js
```

The production-extracted case must route the active Workspace into Search, retain
the query focus handoff, and return Home with `{ persist: false }` in both
directions. Static checks must prove that the visible pill uses canonical saved-
work copy and accessible naming, shows an aria-hidden `/`, calls Find again rather
than the command palette, becomes hidden on the Search surface, and leaves
`Ctrl/⌘K` and `/` assigned to commands and Find again respectively. This remains
static and production-extracted deterministic evidence; installed history, focus,
responsive geometry, keyboard and screen-reader output, and representative-user
comprehension remain open.

## Focused selected-Restore manifest render (2026-08-09)

Run:

```powershell
node scripts/library-recovery-contract-test.js
node --check newtab.js
node --check scripts/library-recovery-contract-test.js
node scripts/quality-gates.js
```

Serve `design/fixtures/archive-restore-manifest.html` locally and render the current
production markup plus `themes.css` and `newtab.css` in the supported in-app browser.
Check English/light Archive at 1280x720 and native zh-TW/Locus Dark Trash at
800x720 with the disclosure open; focus the disclosure summary and Restore action
separately.

The first narrow render reproduced a real defect: the 430px route list began at
x=146 while the sidebar ended at x=196, so the board clipped the start of each
destination. The corrected narrow contract requires the full `.archive-selection`
strip to be positioned, the nested details element to be static, and its list width
to be `min(430px, 100%)`. Current geometry is x=352–782 inside the x=196–800 board;
both actions remain in the viewport, document scroll width equals client width,
the wide list remains inside its board, and both focus targets expose a visible 2px
outline. Captured browser warning/error logs are empty.

This is rendered-current-source fixture evidence, not a live controller or installed
extension pass. The browser's reduced-motion media query was inactive; the global
source rule still bounds all animation and transition durations, but a live reduced-
motion render remains open with installed MV3 storage, native disclosure/Escape,
screen-reader output, representative-user comprehension, and release evidence.

## Focused selected-Restore row contrast (2026-08-09)

Run:

```powershell
node --check scripts/library-recovery-contract-test.js
node scripts/library-recovery-contract-test.js
node scripts/quality-gates.js
```

Use `design/fixtures/archive-restore-manifest.html` with current production CSS.
Measure `.archive-row.selected` plus its title, `.archive-restore-destination`, and
visible `time` at 1280x720 in `folio` and `folio-dark`; then render native zh-TW
Trash at 800x720 with the manifest open and disclosure summary focused.

The defect baseline is Light 6.20/2.07/1.09 and Dark 5.66/2.77/1.27 for title,
destination, and date/countdown respectively. The selected background must be the
10% sRGB theme-accent/panel mix, while selected destination and time use `--text2`.
Current rendered results are Light 15.57/5.19/5.19 and Dark 13.82/6.78/6.78. The
durable focused contract parses the actual `folio` and `folio-dark` hexadecimal
tokens, recomputes that mix, and requires at least 4.5:1 for title and selected
metadata. The checked control, 3px filing edge, 2px summary focus, list containment,
reachable actions, bounded document width, and empty warning/error log must remain.

This is static and rendered-current-source evidence only. Installed MV3 behavior,
live reduced motion, forced-colors rendering, screen-reader output, representative-
user comprehension, approval, and release remain open.

## Focused Archive/Trash trust-card contrast (2026-08-09)

Run:

```powershell
node --check scripts/library-recovery-contract-test.js
node scripts/library-recovery-contract-test.js
node scripts/quality-gates.js
```

Use `design/fixtures/archive-restore-manifest.html` with current production CSS.
The Trash query must apply `trash-shell`, `trash-summary`, and `trash-row`; otherwise
the render is not evidence for the real retention variant. Measure the emphasized
summary-card background, `strong`, and `span` across Archive/Trash in both `folio`
and `folio-dark`.

Baselines are Archive Light 1.99/1.11, Archive Dark 3.05/1.54, Trash Light
3.67/2.45, and Trash Dark 6.39/3.40 for heading/body. Archive must use an 8% sRGB
accent/panel background, 80% accent/20% text heading, and `--text2` body. Trash
keeps its 5% red/panel background, uses an 80% red/20% text heading, and shares the
`--text2` body. Current results are 5.55/5.33, 7.58/7.01, 5.06/5.54, and
7.49/7.43 respectively. The durable contract parses the actual release-theme
tokens, recomputes all four mixes, and requires at least 4.5:1.

At 1280x720 English/light and 800x720 native zh-TW/dark, also require complete body
text, stable summary geometry, real Trash classes, open-manifest containment,
visible disclosure focus, bounded document width, and no warning/error log. This is
static and rendered-current-source evidence only; installed MV3 behavior, live
reduced motion/forced colors, screen-reader output, representative-user
comprehension, approval, and release remain open.

## Focused exact Restore-destination wrapping (2026-08-09)

Run:

```powershell
node --check scripts/library-recovery-contract-test.js
node scripts/library-recovery-contract-test.js
node scripts/quality-gates.js
```

Serve `design/fixtures/archive-restore-manifest.html` locally with current production
`themes.css` and `newtab.css`. Render English/light Archive at 1280x720 and native
zh-TW/Locus Dark Trash at 800x720 with a realistic long Workspace / Space / Group
route. Compare each `.archive-restore-destination` client/scroll width and height,
then check exact DOM text, row/action/board geometry, action visibility/enabled
state, document width, and browser warning/error logs.

The defect baseline is 810px of English text in a 683px ellipsized slot and 448px
of zh-TW text in a 340px slot, hiding 127px and 108px respectively. The destination-
specific rule must override the generic metadata ellipsis with visible overflow,
clipped text-overflow behavior, normal white-space, anywhere wrapping, and 1.35 line
height. Current routes fit exactly within 683px and 340px across two visible lines;
their rows grow from 64px to 64.84px and 66.84px. Both shorter routes stay one line
in 64px rows. Exact locale text is unchanged, every Restore action stays visible
and enabled, rows remain horizontally inside the board, document horizontal
overflow remains absent, and captured logs are empty.

This is static and rendered-current-source evidence only. Installed MV3 behavior,
browser zoom and extreme real profile names, live reduced motion/forced colors,
screen-reader output, representative-user comprehension, approval, and release
remain open.

## Focused single-tab Hibernate/capture interlock (2026-08-09)

Run:

```powershell
node --check popup.js
node --check scripts/concurrency-contract-test.js
node scripts/concurrency-contract-test.js
node scripts/quality-gates.js
```

The production-extracted test must start one-tab Hibernate with its tab update held,
then prove a competing capture cannot acquire `popupCapturePending`. After release,
require exactly one tab update, one popup refresh, success feedback, and a reusable
interlock. Invert the order and require pending capture to refuse Hibernate with no
tab update or refresh. Inject one tab-update rejection and require failure feedback,
no refresh, no retry, and interlock release.

Before evaluating the new case, keep the existing `doSave()` overlap harness aligned
with its current exact-target seam and race its write-dispatch signal against early
completion. This prevents an unresolved Promise from letting Node exit 0 before the
test actually exercises a write. The corrected runner first failed because the
unguarded `hibernateSingle()` returned `undefined`; current production returns typed
success/failure and owns the shared interlock through `finally`.

The full focused runner completes 5 client-queue cases, 2 capture-flow cases, 10
deterministic schedules, and 10,000 fixed-seed randomized schedules: 69,880 attempts,
19,947 accepted, 49,379 rejected, and 554 injected failures. This is production-
extracted deterministic evidence only. Installed popup lifetime, real Chrome tab
navigation/storage-event ordering, accessibility feedback, representative-user
comprehension, approval, and release remain open.

## Focused Hibernate prior-write drain (2026-08-09)

Run:

```powershell
node --check popup.js
node --check scripts/concurrency-contract-test.js
node scripts/concurrency-contract-test.js
node scripts/quality-gates.js
```

Hold a pre-existing `popupStateWriteQueue` Promise, activate one-tab Hibernate, and
require zero `chrome.tabs.update` calls until the Promise is released. Keep the
existing competing-capture refusal active during that wait, then require the normal
single update, refresh, feedback, and release behavior. Extract
`hibernateSelectedScope()` and require the same queue drain before
`getHibernateCandidates()` so bulk tab queries/effects and `load()` cannot overtake
earlier selection, destination, or preference writes.

The unguarded baseline starts the one-tab update before release and fails `true !==
false`. Current production drains the queue in both paths. The full runner completes
5 client queues, 2 capture flows, 10 deterministic schedules, and 10,000 fixed-seed
randomized schedules: 69,880 attempts, 19,947 accepted, 49,379 rejected, and 554
injected failures. This is production-extracted deterministic evidence only;
installed popup teardown, real tab/storage-event ordering, accessibility feedback,
representative-user comprehension, approval, and release remain open.

## Focused release-manifest privacy allowlist (2026-08-09)

Run:

```powershell
node --check scripts/quality-gates.js
node scripts/quality-gates.js
```

The current `manifest.json` must contain exactly the seven disclosed API permissions
with no duplicates. `host_permissions`, `optional_host_permissions`, and
`optional_permissions` must be absent or empty; `content_scripts` must be absent or
empty; `externally_connectable` must be absent. The gate's detached mutations must
reject a missing, extra, and duplicate API permission plus required host, optional
host, optional API, automatic content-script, and external-messaging access.

The pre-fix gate accepted one combined detached manifest containing `scripting`,
optional `https://*/*`, an automatic HTTPS content script, and an externally
connectable website. Current production leaves the manifest unchanged, passes the
exact allowlist, and rejects that same combined mutation. This is static manifest
evidence only; installed Chrome prompts, runtime network traffic, Store review,
representative-user trust, approval, and release remain open.

## Focused extension-directed network preflight (2026-08-09)

Run:

```powershell
node --check scripts/quality-gates.js
node scripts/quality-gates.js
```

The six release runtime sources must reject `fetch`, `XMLHttpRequest`, `WebSocket`,
`EventSource`, and `navigator.sendBeacon`. The three extension HTML pages must reject
remote scripts, linked resources, embedded resources, objects, and SVG references.
The four release stylesheets must reject remote `@import` and `url()` resources.
Twelve detached probes exercise those classes without changing production files.

Before the fix, one in-memory mutation adding `fetch()`, a remote script, and remote
CSS printed `Quality gates passed`. Current source passes, while the same combined
mutation is rejected. Explicit user navigation, packaged assets, data SVGs, and the
local `_favicon/` endpoint remain unchanged. This is static source evidence only;
the unpacked extension still needs a recorded CSP/favicon/network log before any
runtime-silence or release claim.

## Focused no-Space Home continuation (2026-08-09)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/quality-gates.js
```

The Home Trail model must return one primary `create-space` action only when the
active Space is absent. The renderer must associate that action with the visible
blocked-destination message and pass its current button to
`openOrganizationCreate('space')`. The same action must stay absent for a present
Space with a different destination conflict. The focused runner also retains its
current acknowledged Favorite/Read Later focus and Archive successor contracts.

The new contract first failed because the no-Space plan was missing. Current syntax,
the Onboarding/Home Trail contract, and the release gate pass. This is static and
production-extracted deterministic evidence only; installed rendering, real dialog/
storage timing, assistive-technology output, representative-user comprehension,
approval, and release remain open.

## Focused duplicate-Inbox Home continuation (2026-08-09)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/quality-gates.js
```

The Home model must expose **Open space** only for a present destination with more
than one Inbox, preserving primary emphasis for an existing saved-item recovery
action. The extracted resolver must require one globally unique exact Workspace/
Space with unchanged runtime references, visible names, and active ownership. The
controller must route to that board with `{ persist: false }`, permit the conflict to
have been resolved before activation, and perform no Inbox choice, repair, snapshot,
or persistence. Replacement, ambiguity, ownership change, and route refusal must
leave Home intact, report one no-effect result, and return focus. English/native
zh-TW action, accessible name, and failure copy must remain paired.

The new contract first failed because the Space-review resolver was missing. Current
syntax, the Onboarding/Home Trail contract, and the release gate pass. This is static
and production-extracted deterministic evidence only; installed pixels, real Router/
history behavior, assistive-technology output, representative-user comprehension,
approval, and release remain open.

## Focused progressive Home recovery zones (2026-08-09)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/quality-gates.js
```

The production-extracted plan must stop a no-Space Home after the Trail, keep Spaces
but omit Inbox review for zero or duplicate Inboxes, and retain both zones for one
exact Inbox. The renderer must derive that state from `createLandingInboxContext()`,
pass the exact context into `buildHomeInboxZone()`, and use `openInboxView()` rather
than a first-name Group lookup. Trail → Inbox → Spaces remains the populated order.

The new contract first failed because the progressive-zone plan was missing.
Current syntax, the Onboarding/Home Trail contract, and the release gate pass. This
is static and production-extracted deterministic evidence only; installed pixels,
real Router/history behavior, assistive-technology output, representative-user
comprehension, approval, and release remain open.

## Focused exact new-tab Inbox capture (2026-08-09)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/quality-gates.js
```

The production-extracted boundary must return no context for duplicate Inboxes,
reuse one exact existing Inbox without allocation, and provision an unchanged
absent Inbox once through `createOrganizationIdAllocator()`. Duplicate refusal must
occur before `State.snapshot()`, dispatch no write or source effect, mutate no Group,
and state that neither save nor close happened. Exact legal imported IDs, including
whitespace-bearing values, remain byte-for-byte unchanged. Static wiring must route
single, selected, and Space-drop Inbox saves through review before history and
materialization afterward, with no first-name lookup.

The first red run lacked the shared context; a second red run caught ID trimming.
Current syntax, the Onboarding/Home Trail contract, and the release gate pass. This
is static and production-extracted deterministic evidence only; installed storage/
tab behavior, cross-context ordering, rendered toast, assistive-technology output,
representative-user comprehension, approval, and release remain open.

## Focused exact new-tab Save receipt (2026-08-09)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/quality-gates.js
```

The production-extracted formatter must name one complete Workspace › Space › Inbox
and return no receipt for an incomplete path. It covers titled single Saves plus
one/many close and keep-open outcomes, with keep-open wording explicitly describing
a copy and literal native zh-TW parity. Static wiring requires single, selected, and
Space-drop paths to freeze the formatter result before `commitCapturedTabs()` and
show it only after acceptance, with no hard-coded English success or duplicate copy.

The red run first failed because `inboxCaptureReceiptMessage()` was missing. Current
syntax, the focused Onboarding/Home Trail contract, and the release gate pass. This
is static and production-extracted deterministic evidence only; installed effects,
rendered toast/assistive-technology output, representative-user comprehension,
approval, and release remain open.

## Focused existing-Group capture receipt (2026-08-09)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/quality-gates.js
```

The production-extracted contract must preserve exact whitespace-bearing IDs;
reject renamed, item-list-replaced, and duplicate-ID Groups; report a rejected
active-tab read; and re-resolve the destination after a successful read. A rejected
read or destination change during it must produce no snapshot, Group mutation,
write, selection change, render, or source close. Accepted selected-tab capture must perform one commit, freeze the old
Workspace › Space › Group label before it, retain filtered-out unsupported
selections, and report “copy” when sources remain open. Static wiring rejects
hard-coded English result/recovery copy and requires native zh-TW parity.

The red run first failed because `captureDestinationReceiptMessage()` was absent.
Current syntax, the focused Onboarding/Home Trail contract, and the release gate
pass. This is static and production-extracted deterministic evidence only;
installed effects, rendered toast/assistive-technology output, representative-user
comprehension, approval, and release remain open.

## Focused active Search-filter cue (2026-08-09)

Run:

```powershell
node --check newtab.js
node --check scripts/search-recovery-contract-test.js
node scripts/search-recovery-contract-test.js
node scripts/quality-gates.js
```

The production-extracted model must count only non-default Space, time, and the
shared tag/Has-tags dimension. Default state and the always-visible query, content
type, and sort controls must contribute zero. Rendering must add localized active-
count context to the toggle's accessible name, keep the visual number hidden from
assistive technology, and preserve active state in forced colors without opening or
clearing the panel.

The new contract first failed because the pure count helper was missing. Current
syntax, the focused Search recovery contract, and the release gate pass. This is
static and production-extracted deterministic evidence only; installed pixels,
assistive-technology output, theme/zoom behavior, representative-user
comprehension, approval, and release remain open.

## Focused Search filter-only reset (2026-08-09)

Run:

```powershell
node --check newtab.js
node --check scripts/search-recovery-contract-test.js
node scripts/search-recovery-contract-test.js
node scripts/quality-gates.js
```

The production-extracted model must enable Clear filters for content type, Space,
time, Has tags, and exact tag, but not for query, sort, or default state. Its reset
patch must contain only the five default filter fields plus `selectedId: null`;
query, sort, panel visibility, and result window remain outside the patch. The real
renderer must share those helpers across the panel and no-result action, natively
disable the panel action at default state, and use **Clear filters / 清除篩選條件**.
The established `_searchSet()` result-window reset remains unchanged.

The new contract first failed because the filter-active helper was missing. Current
syntax, the focused Search recovery contract, and the release gate pass. This is
static and production-extracted deterministic evidence only; installed pixels,
real pointer/keyboard behavior, assistive-technology output, representative-user
comprehension, approval, and release remain open.

## Historical Field Desk visual foundation (superseded 2026-08-12)

The owner rejected this visual direction after the evidence below was recorded.
Keep it only as historical verification; Locus Index is the current source authority.

Run the complete static block at the top of this file. Then serve current
`themes.css`, `newtab.css`, `popup.css`, and their isolated fixtures locally through
the supported in-app browser. Do not use the fixture's hardcoded data or markup as
runtime product authority.

The clean run covers all 36 repository JavaScript syntax files and all 27 quality/
contract runners, including the default 10,000-schedule concurrency matrix. During
the run, extracted router sandboxes in the item-detail, Group/Stack, reminder, and
organization-creation contracts were aligned with the current shared pending guards
and Home opener. Their assertions now check semantic before/after ordering instead
of fixed character distances. The Undo runner counts the required fresh-source
option independent of other valid commit options. These are test-harness repairs;
production behavior is unchanged.

At 1280×720, the isolated Home reference fixture must show the Field Desk shell,
active locator edge, crisp field cards, and the collapsed open-tabs rail. The fixture
contains stale scenic markup and fake reference content, so it proves CSS application
only. The current popup may run on localhost without extension Chrome APIs; in that
case require its real error state to remain legible, with the primary Save hierarchy,
red error edge, destination/receipt styling, and wrapping privacy footer intact.
Loading `newtab.html` directly is not a runtime substitute because its prepaint and
app-loading lifecycle depends on extension APIs.

The managed viewport stayed 1280 px when asked for 800 px. Treat the 800 px rules,
dark theme, reduced-motion/forced-color rendering, and new-tab runtime as source-only
or unavailable evidence, not passes. Installed MV3 behavior, real local data,
screen-reader output, browser zoom, representative-user comprehension, approval,
and release remain open.

## Focused popup capture-docket hierarchy and read states (2026-08-12)

Run:

```powershell
node --check popup.js
node --check scripts/popup-locate-contract-test.js
node scripts/popup-locate-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The focused contract
must require exact English/native zh-TW error title and consequence copy, the
platform-projected shortcut hint, one owner for loading/error/ready availability,
native plus ARIA disabling of every main capture entry point, an atomic alert,
rebuilt Retry focus, a safe post-retry focus target, dominant Save width, 11–14 px
working typography, a two-line 11 px privacy footer, a bounded list at 520 px, and
forced-color treatment. Its first red run must fail because the named error title
and read-state owner do not yet exist.

For bounded current-source rendering, serve `popup.html` from a fresh localhost
origin so an unrelated service worker cannot reuse the origin. At an exact 420×590
popup body, the genuine unavailable-extension-API path must have
`data-read-state="error"`; native disabled plus `aria-disabled="true"` on `#ps`,
`#qs-all`, `#hib-open`, and `#more-save-current`; one atomic alert; and visible,
enabled, focused `#retry-load`. Computed evidence must show a 14 px error title,
12 px consequence, 40 px Retry, Save wider than Hibernate, and the 60 px two-line
footer. Opening More must focus Back; Escape must restore `#open-more`. Repeated
Retry must rebuild one alert, keep capture actions inert, and focus the new Retry.

The focused checks and complete 36-file/27-runner suite pass, including the default
10,000-schedule concurrency matrix. This is static, production-extracted
deterministic, and bounded English/light current-source evidence only. Installed
Chrome control was unavailable because Chrome was closed and the browser-control
extension was not installed/enabled in the Default profile; the native host
manifest was present. No browser was launched without operator permission.
Installed MV3 APIs, real tab/storage/source effects, loading/empty/no-match/success/
receipt pixels, rendered dark/zh-TW/420×520 states, zoom, screen-reader output,
representative-user comprehension, approval, and release remain open.

## Focused Welcome exact filing route and pending handoff (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first red focused
run must stop because `#wc-card` and the exact source → destination filing route do
not exist. The green static contract requires one stable ID each for the sheet,
destination, destination failure, and live status; exact English/native zh-TW task
and source-close copy; equal `1fr 48px 1fr` fields; an 800 px stacked route; a 520 px
scroll-safe sheet; reduced motion; and forced-color locator visibility.

The production-extracted controller must project Personal › Research › Inbox before
Save, then execute exactly one `chrome.tabs.get()` of the immutable reviewed source.
An unchanged accepted case must call the established `saveTabToInbox()` once with
`closeSource:true`, open Inbox once, persist the first-use gate once, and focus the
accepted item. Missing/ambiguous destination, destination drift before the browser
read, URL/navigation drift discovered by the read, query failure, no eligible tab,
and failed persistence must keep Welcome and the source available with no false
handoff. While a deferred Save is pending, the sheet must expose `aria-busy=true`,
disable Save and Explore, consume Escape without dismissal or onboarding persistence,
then release only when the accepted result can complete.

For bounded current-source evidence, load the real `newtab.html` at a fresh localhost
query URL and inspect only its existing DOM/computed styles. At 1280×720 require the
hidden production Welcome to contain every stable ID exactly once, the revised task
title, source/locator/destination DOM order, the complete Save `aria-describedby`
chain, a 720 px/16 px-radius sheet, `minmax(0,1fr) 48px minmax(0,1fr)` grid, 98 px
fields, and a 44 px DM Sans primary action. The local page's expected missing-
extension-storage error prevents runtime initialization and does not verify visible
Welcome pixels.

The complete 36-file/27-runner suite passes, including the default 10,000-schedule
concurrency matrix. The supported installed-Chrome binding remained unavailable.
Browser policy also rejected a synthetic `data:` visual preview; do not bypass that
policy with another automation surface or indirect injection. This is static,
production-extracted deterministic, and bounded current-source DOM evidence only.
Installed MV3 pixels and tab/storage/source effects, rendered 800/520 px,
dark/zh-TW, zoom, screen-reader output, representative-user activation, approval,
and release remain open.

## New-tab capture authority closure (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/concurrency-contract-test.js
```

The caller-level inspection corrected the reopened fact: current source already
freezes `createGeneratedGroupCaptureContext()` / `createGroupCaptureContext()`
before `chrome.tabs.query()` and re-resolves the exact runtime references, IDs,
names, and owner list afterward. The remaining P0 was later in the same user action:
neither `saveAllTabs()` nor `addSidebarOrActiveTabToGroup()` passed a destination
validator to `commitCapturedTabs()`. A Workspace/Space/Group/list/item change during
persistence or a final tab read could therefore leave source-close authority intact
and then announce a stale destination path.

The first exact production-caller run failed in 0.3 seconds because Save all reached
the commit with `typeof options.validateDestination === 'undefined'`. The equivalent
existing-Group assertion then failed on the same absence. Green requires each caller
to create one `createItemListCaptureContext()` and
`createCaptureDestinationReceiptContext()` after mutation, pass
`resolveCaptureDestinationReceiptTarget()` as `validateDestination`, and report
through `toastCaptureDestinationReceipt()` only after acceptance. Receipt creation
failure rolls the single snapshot back; no path-blind result may remain.

The production-extracted Onboarding/Home Trail runner now executes both callers. It
proves clean whole-graph adoption during each browser read stops before history,
mutation, persistence, render, success, or source cleanup; renamed, replaced,
duplicated, or list/item-drifted authority becomes invalid; unsupported-only and
read/allocation failures start no write; recovery and duplicate/competing activation
start no browser read or optimistic mutation; accepted capture preserves the shared
URL allowlist, graph-wide Save-all allocator, localized snapshot, exact item set,
close preference, and keyboard-reachable Open-destination result. Drift after the
receipt yields the existing destination-changed warning and no stale Open action.

The complete pass covers all 38 repository JavaScript syntax files and all 29
documented deterministic/stress runners. The concurrency runner completed 10,000
schedules: 69,880 attempts, 19,947 accepted, 49,379 rejected, and 554 injected
failures. `git diff --check` passes. This is exact current-source execution, not an
installed-browser pass. Installed storage/event ordering, real tab removal,
service-worker termination, native receipt rendering/focus, real local data,
representative-user comprehension, approval, and release remain open.
**Implemented: yes. Verified: partial. User-validated: no. Released: no.**

## Focused Home Space filing register (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first red focused
run must stop because `renderHome()` does not emit `home-space-register`. The green
source contract requires Trail → exact Inbox → Spaces order, one grouped register,
at most three deterministic Space rows, the stored `cat.symbol`, one
`newestHomeItems(items, 1)` preview or the existing empty copy, localized **Open
space** in both the row and anchored menu, and the established exact preview/Space/
drop handlers. It must reject the removed name-inferred icon map, synthetic accent
hash, unused collections-strip builder, and their unreachable production styles.

CSS checks require a one-column register boundary and horizontal filing rows at wide
widths, identity/Open above the latest item at 900 px, one column with a full-width
Open action at 560 px, at least 40 px preview/Open/More controls, visible
`:focus-within`, dark-token inheritance, reduced-motion coverage through the shared
Home rule, and a forced-color register boundary. The structure adds no whole-row
button, overlay, focus trap, or Escape layer.

The focused checks, all 36 repository JavaScript syntax checks, and all 27 documented
runners pass, including the default 10,000-schedule concurrency matrix. No hardcoded
or synthetic populated fixture was used as runtime evidence. This is static and
production-extracted deterministic evidence only. Installed Home pixels with real
local data, actual 1280×720 and 800/560 px rendering, real drag/drop, dark/zh-TW,
zoom, screen-reader output, representative-user comprehension, approval, and release
remain open.

## Focused saved-item recovery docket (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/item-detail-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first red focused
run must stop because `renderItemDetail()` has no `idp-docket-line`. Green source
checks require one localized item type plus complete Workspace › Space › Group path,
one visually hidden exact dialog heading, and one visible primary editor/preview.
The existing safe-URL predicate and `openSavedTabItem()` controller remain the only
authority for Open. Why saved, Reminder, and Tags must use aligned
`idp-context-sec` rows; Cover, Checklist, and Custom fields remain in the existing
Advanced disclosure.

CSS checks require a 560 px Field Desk sheet at 1280/800, a 104 px context-label
column, wrapping non-clipped filing path, one bounded primary record field, 40 px
Open/Close/primary To-do/context actions, stacked context at 560 px, the established
full-screen 520 px sheet, shared focus tokens, reduced motion, and forced-color
boundaries. No new modal, route, Escape owner, stored preference, or data field is
permitted.

The existing production-extracted detail harness must also stay green for route and
global-identity validation, detached candidate mutation, one acknowledged
`persistNow()` receipt, rejected/unknown recovery, direct reminder ordering, pending
pointer/keyboard/history/pagehide blocking, Tab containment, nested Escape, and
opener/rebuilt-target focus. The complete run passed all 36 JavaScript syntax files
and all 27 documented runners, including the default 10,000-schedule concurrency
matrix. This is static and production-extracted deterministic evidence only.
Installed pixels with real local data, real Chrome history/pagehide/storage effects,
actual 1280×720/800/520 px rendering, dark/zh-TW, zoom, screen-reader output,
representative-user comprehension, approval, and release remain open.

## Focused Search locator-ledger hierarchy (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/search-recovery-contract-test.js
node scripts/search-recovery-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first red focused
run must stop because the decorative `search-title-icon` is still rendered. Green
source checks require `_searchResultRow()` to project exact saved location before
snippet/tags and saved age independently, with no generic `search-result-meta` line.
`_searchDetail()` must place `search-detail-actions` immediately after the exact
recovery map and before secondary metadata. Existing recovery contexts, safe Open,
Search-owned Details, route state, and browser effects remain the only authorities.

CSS checks require the 56 px accent-edged query, flat 40 px type rail, wrapping mono
result paths, directly adjacent 40 px recovery actions, and a three-section filter
tray spanning the two-column ledger above 1100 px. Existing 1100/900/620 px
reflow, forced-color selected/focus distinction, reduced motion, long-tag wrapping,
and continuation reachability must remain green. No synthetic result, new data
field, route, copy key, stored preference, or quick mutation is permitted.

The existing production-extracted Search harness must also stay green for exact
target re-resolution, stale/duplicate/moved refusal, safe Open, URL-backed query/
filter/sort/selection/detail/continuation state, IME/debounce, roving Arrow/Home/End,
Enter/double-click, failure/empty states, locale parity, and focus return. The
complete run passed all 36 JavaScript syntax files and all 27 documented runners,
including the default 10,000-schedule concurrency matrix. This is static and
production-extracted deterministic evidence only. Installed pixels with real local
data, real Chrome tab/history/storage effects, actual 1280×720/800/620 px rendering,
dark/zh-TW, zoom, screen-reader output, representative-user comprehension, approval,
and release remain open.

## Focused Library filing-ledger hierarchy (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/library-recovery-contract-test.js
node scripts/library-recovery-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first red focused
run must stop because `renderLibraryLedgerSurface()` still places `library-search`
inside the heading and `library-location` after the toolbar controls. Green source
checks require heading/scope → `library-query-row` with find/sort → count/status
toolbar. Each `buildLibraryLedgerRow()` must keep title → exact destination → source
inside one `library-copy`, order visible Open → Details → Favorite/read status →
More, and keep More free of duplicate Open, Details, Favorite, or read-status
actions while retaining Read Later add/remove and Archive.

CSS checks require a 52 px accent-edged query, plain mono result count, flat 40 px
status rail, 4 px cobalt ledger spine, 88 px records, wrapping mono destinations,
40 px sort/recovery/state/More targets, and one outer query focus boundary. The
1500 px three-band fragmentation must remain absent. At 1100 px actions take one
deliberate second line; at 760 px query/sort, age, status, and actions reflow without
hiding destination. Privacy blur must include the moved Workspace scope, and forced
colors must retain the filing spine. No preview pane, pinned section, fake result,
route, data field, stored preference, copy key, or new mutation is permitted.

The existing production-extracted Library harness must also stay green for URL-
backed query/status/sort/item round trips, one Read Later ledger, nested Stack paths,
exact visible-target re-resolution, stale/duplicate/moved/filtered refusal, safe
Open, Details, Favorite/Read Later/read-status receipts, Archive, pending interlocks,
anchored keyboard menus, mutation focus, empty/no-match recovery, and en/zh-TW
parity. The complete run passed all 36 JavaScript syntax files and all 27 documented
runners, including the default 10,000-schedule concurrency matrix. This is static
and production-extracted deterministic evidence only. Installed pixels with real
local data, real Chrome tab/history/storage effects, actual 1280×720/800/760 px
rendering, dark/zh-TW, zoom, screen-reader output, representative-user
comprehension, approval, and release remain open.

## Focused Settings control-ledger hierarchy (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/quality-gates.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first red focused
run must stop because Settings has no `data-settings-layout="ledger"`, indexed rail,
unified pane boundary, labelled row grid, explicit toggle focus, or bounded narrow
collapse. Green source checks require every established Settings/pane id, the eight
CSS-counter index, one bordered and overflow-contained `.drawer-sections` panel,
`display: contents` for presentation-only `.sp-grid`, and 132–172 px ledger labels.
Opening a section must focus its active index entry; switching sections must scroll
that entry to the nearest visible position without moving focus.

CSS checks require 40 px controls, a 224 px desktop index, a horizontally scrollable
top index at 880 px, one-column ledger rows at 620 px, explicit focus for hidden-input
toggle labels, Settings-wide reduced-motion shutdown, and forced-color outer/row
boundaries. Existing English/native zh-TW text, light/dark theme tokens, pane
renderers, local-only wording, deep-link aliases, focus trap, Escape/opener return,
stable ids, schema/import shape, and permissions must not change.

The complete run passed all 36 JavaScript syntax files and all 27 documented
runners, including the default 10,000-schedule concurrency matrix. An ephemeral
headless unpacked-Chrome probe did not reach the extension render checkpoint and
produced no screenshot, so this is static/deterministic evidence only. Installed
real-data pixels, actual 1280×720/800/620 px geometry, live scroll/focus behavior,
dark/zh-TW pixels, zoom, screen-reader output, representative-user comprehension,
approval, and release remain open.

## Focused Board local-record hierarchy and Archive (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node --check scripts/library-recovery-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/library-recovery-contract-test.js
```

Then run the complete static block at the top of this file. The first red focused
run must stop because `createBoardLocalArchiveContext()` and the shared record header
do not exist. Green source checks require both `buildNote()` and `buildTodo()` to use
`tabIndex=-1`, a localized `.board-record-kind`, `.board-record-body`, and one item-
named `.board-record-menu` with `aria-haspopup="menu"` and `data-item-archive="menu"`.
The direct `data-act="del"` X and `archiveItem(it.id)` path must remain absent.

`bindBoardItemContextMenu()` must route pointer, Context Menu, Shift+F10, and More
through one prepared opener. Pointer-down on More keeps an active editor focused;
`prepareOpen` awaits its exact existing receipt and re-resolves the rebuilt editor or
More button before actions appear. The production-extracted harness must prove that
actions receive the same prepared opener used for anchoring/focus return.

`createBoardLocalArchiveContext()` must admit only exact Note/To-do identities and
reuse `commitSavedPageArchive()`. The production-extracted receipt harness must prove
full record-byte preservation, one snapshot/write, no pending render/success, duplicate
blocking, accepted-only Board/Archive render plus reversible success, and stale/
retyped refusal before mutation. `archiveBoardLocalItemWithFocus()` must choose its
successor before removal, wait for acknowledgement, then focus sibling, Group, or
Board; pending and failed writes must not move focus.

CSS checks require one 40 px filing header and More target, mono type identity, in-
flow reminder, 24 px To-do completion, restrained theme-token Note wash, List-view
parity, narrow padding, forced-color focus/identity, and no infinite `bellShake`.
Reduced motion continues to disable item transitions globally. Existing custom
colors, English/native zh-TW strings, schema/import shape, stable IDs, routes,
permissions, and local-only privacy must not change.

The complete run passed all 36 JavaScript syntax files and all 27 documented
runners, including the default 10,000-schedule concurrency matrix. `git diff
--check` and the trailing-whitespace scan for all 8 untracked files passed. This is
source/CSS and production-extracted deterministic evidence only. Installed real-data
pixels, actual 1280×720/800/narrow geometry, live Chrome focus/selection/drag/storage,
dark/zh-TW pixels, zoom, screen-reader output, representative-user comprehension,
approval, and release remain open.

## Focused Board saved-page record hierarchy (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node --check scripts/saved-page-reopen-contract-test.js
node --check scripts/library-recovery-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/saved-page-reopen-contract-test.js
node scripts/library-recovery-contract-test.js
```

Then run the complete static block at the top of this file. The first red focused
run must stop on the absent saved-page `.board-record-head`, `.board-record-kind`,
and `.board-record-menu`. Green source checks require `buildTab()` to preserve its
non-sequential shell and direct native Open control while adding the existing
localized Link type, in-flow reminder, real source domain, and item-named 40 px More
with `aria-haspopup="menu"` and `data-item-archive="menu"`. `.item-acts`, `.item-btn`,
the direct Archive X, and their dead CSS must remain absent.

`bindBoardItemContextMenu()` must receive the saved-page shell, one menu-item factory,
and the persistent More button. Its existing production-extracted contract proves
pointer, More, Context Menu, and Shift+F10 entry, first-command focus, true opener
anchoring, trapped menu Tab, and Escape return. The saved-page harness must prove
that Open- and More-originated menus pass their respective opener into Favorite,
Read Later, and Archive receipts. Copy URL remains acknowledged, Edit title routes
to the detail title field, foreground Open retains guarded reuse, and Open in
background passes `focus: false, reuse: false`.

Board Archive must continue through `archiveSavedPage()` and choose its successor
before mutation, but request focus only after accepted persistence. Production-
extracted checks cover More-owned and keyboard-owned Archive, next/previous sibling,
Group, and Board fallbacks. Rejected/stale/unknown writes remain covered by the
existing Library recovery suite and must produce no premature removal, success, or
focus continuation.

CSS checks require a padding-free stable saved-page record shell, shared 40 px filing
header/More target, deliberate primary body, mono source locator, List and focused-
Group parity, narrow padding, reduced-motion shutdown, and forced-color focus/
identity. Existing English/native zh-TW keys, light/dark tokens, custom item colors,
privacy blur, stored bytes, schema/import shape, stable IDs, routes, permissions,
and local-only privacy must not change.

The complete run passed all 36 JavaScript syntax files and all 27 documented runners,
including the default 10,000-schedule concurrency matrix. `git diff --check` and the
trailing-whitespace scan for all 8 untracked files pass. This is source/CSS and
production-extracted deterministic evidence only. Installed real-data pixels,
actual 1280 x 720/800/narrow geometry, live Chrome focus/selection/drag/storage,
dark/zh-TW pixels, zoom, screen-reader output, representative-user comprehension,
approval, and release remain open.

## Focused Group filing-register shell (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node --check scripts/group-stack-identity-contract-test.js
node --check scripts/saved-page-reopen-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/group-stack-identity-contract-test.js
node scripts/organization-move-contract-test.js
node scripts/organization-creation-contract-test.js
node scripts/saved-page-reopen-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first red focused
run must stop on the missing native `.gcol-name` page route. Green source checks
require the visible Group name to be a localized native route and forbid the
duplicate icon-only page shortcut. `buildGroupCol()` must create one
`groupMenuItems(opener)` factory and pass it plus the persistent More control to
`bindBoardItemContextMenu()`; the direct pointer-only header context-menu fork must
remain absent. The existing shared production-extracted menu contract continues to
prove pointer, More, Context Menu, and Shift+F10 entry, first-action focus, actual
opener anchoring, contained Tab, and Escape return. Group/Stack identity tests must
keep the name outside `contenteditable` so naming stays in the exact transaction.

CSS checks require a flat shadowless 10 px Group register, a 4 px
`--gcol-tint` vertical locator, flat paper header, persistent action rail, 40 px
symbol/name/collapse/header/footer targets, quiet mono intent context, 800 px
default Board fill, and forced-color locator. The bento signature/lacquer block,
Folio glass override, `colIn`, symbol rotation, title mask, hover-only action
overlay, and duplicate focused-page icon rule must remain absent. Existing collapse,
identity, add, drag/drop, focused-Group/Canvas reuse, saved widths/heights, pointer/
Arrow resize, data bytes, locale keys, routes, schema/import shape, permissions,
storage, and local-only privacy must not change.

The complete run passed all 36 JavaScript syntax files and all 27 documented
runners, including the default 10,000-schedule concurrency matrix (69,880 attempts).
`git diff --check` and the trailing-whitespace scan for all 8 untracked files pass.
This is source/CSS and production-extracted deterministic evidence only. Installed
real-data pixels, actual 1280 x 720/800/narrow geometry, live Chrome focus/context/
drag/resize/storage effects, dark/zh-TW pixels, zoom, screen-reader output,
representative-user comprehension, approval, and release remain open.

## Focused List Group filing-register shell (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node --check scripts/group-stack-identity-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/group-stack-identity-contract-test.js
node scripts/organization-move-contract-test.js
node scripts/organization-creation-contract-test.js
node scripts/organization-delete-contract-test.js
node scripts/saved-page-reopen-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first red focused
run must stop on the missing `groupActionMenuItems()` action model. Green source
checks require `buildLvGroup()` to render stable `.lv-group-name` as a localized
native route, localized item/to-do context, and localized Add-tab name/hint; the
duplicate icon page route and hardcoded English tooltip must remain absent. Board
and List must pass the exact rendered Group and actual opener through
`groupActionMenuItems()` to `bindBoardItemContextMenu()`; the shared action model
must reject a replaced Group, and List must contain no direct `showContextMenu()` or
pointer-only header context-menu fork.

CSS checks require one flat bordered `.lv-group`, a 4 px full-header-height stored-
color locator, quiet mono counts rather than pills, persistent 40 px collapse/
symbol/name/action targets, a deliberate action second line below 900 px, and a
forced-color locator. Symbol scaling and hover/focus-only action reveal must remain
absent. Existing record rows, collapse, identity, capture, selection, drag/drop,
schema/import bytes, stable selectors/IDs, routes, locale keys, permissions,
storage, recovery, reduced motion, and local-only privacy must not change.

The complete run passed all 36 JavaScript syntax files and all 27 documented
runners, including the default 10,000-schedule concurrency matrix. `git diff
--check` and the trailing-whitespace scan for all 8 untracked files pass. This is
source/CSS and production-extracted deterministic evidence only. Installed real-
data pixels, actual 1280 x 720/800/560 geometry, live Chrome focus/context/capture/
drag/storage effects, dark/zh-TW pixels, zoom, screen-reader output,
representative-user comprehension, approval, and release remain open.

## Focused Board/List Stack filing sleeve (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node --check scripts/group-stack-identity-contract-test.js
node --check scripts/library-recovery-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/group-stack-identity-contract-test.js
node scripts/library-recovery-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The initial focused
runs must stop on the missing complete-Stack Archive allowlist, shared
`stackActionMenuItems()` model, and `.lv-stack` pending owner. The owner-fingerprint
case must separately fail until the action model requires the rendered parent item
list and Group as well as the exact Stack object. Green production-extracted checks
must retain Details, the stable Workspace/Space/Group/Stack identity tuple, the
surface disclosure callback, and the complete Stack/parent/Group/opener Archive
tuple while refusing moved, replaced, missing, and ambiguous targets.

Source/CSS checks require Board and List to consume the same actual-opener action
model through `bindBoardItemContextMenu()`, expose localized Stack/item context and
one addressable More/Archive owner, and remove local pointer-menu and intention-icon
forks. CSS must project the unmodified stored color through `--stack-tint`, preserve
List's real `--stack-indent`, render restrained 3 px/2 px binder rails, provide 40 px
collapse/symbol/More targets, use the mono filing voice without count pills, yield
the type label at 560 px, and retain the rail in forced colors. Existing identity,
collapse state, selection, capture, drag/drop, schema/import bytes, custom colors,
stable IDs/selectors, routes, locale keys, permissions, storage, reduced motion,
recovery, and local-only privacy must not change.

The complete run passed all 36 JavaScript syntax files and all 27 documented
runners, including the default 10,000-schedule concurrency matrix (69,880 attempts).
`git diff --check` and the trailing-whitespace scan for all 8 untracked files pass.
This is source/CSS and production-extracted deterministic evidence only. Installed
real-data pixels, actual 1280×720/800/560 geometry, live Chrome focus/context/
capture/drag/storage effects, dark/zh-TW pixels, zoom, screen-reader output,
representative-user comprehension, approval, and release remain open.

## Opened Tabs live-source ledger contract (2026-08-12)

Run `node scripts/onboarding-contract-test.js`. The first-red run must stop because
an opened-tab title is not yet a native exactly named Switch control. Green source
contracts require `renderOpenTabRailState()` to keep loading, Chrome-read failure
with Retry, and true empty distinct; the `refreshOpenTabs()` rejection branch must
repaint that failure. `applyFilter()` must add one localized no-match/Clear state
instead of leaving a blank list. Runtime copy must exist independently in English
and native zh-TW for loading, failure, Retry, empty, no-match, Clear, non-saveable,
and Saving states.

Every populated row must retain the real non-internal Chrome tab, make
`isOpenableSavedTabUrl()` the only Save/drag eligibility boundary, expose native
exactly named Select/Switch/Close controls, and identify an unavailable source as
switch-or-close only. The native checkbox and Close targets must remain visible at
40 px without hover. Pointer context, Context Menu, and Shift+F10 must converge on
`openTabActionMenuItems()` through `bindBoardItemContextMenu()`; the action model
must exact-resolve the rendered tab before exposing actions. The selected receipt
band must announce its count and show named Save-to-Group, Save-to-Inbox, and Clear
controls. `syncOpenTabRailCaptureControls()` may disable duplicate capture and show
localized Saving state, but cannot authorize persistence or retry an outcome.

The production-extracted responsive keyboard harness must execute both the hidden
and reachable cases. At 800 px the `S` shortcut returns false with zero expansion
or focus. At 821–1280 px it expands the collapsed drawer before focusing the filter.
With focus inside the rail, three Escape activations must clear a nonempty filter,
then clear selection and restore the rebuilt exact checkbox, then collapse the
drawer and focus its toggle. Each consumed activation prevents lower-surface
handling; higher overlays retain priority. CSS requires an in-flow rail above
1280 px, a fixed `min(320px, calc(100vw - 64px))` uncollapsed drawer from
821–1280 px, and the existing `display:none` boundary at 800 px and below. Reduced
motion and forced colors must preserve control and locator visibility.

Post-capture focus is also width-aware. An accepted capture may restore an exact
remaining row only while the rail is available. At 800 px and below it must skip
the hidden filter and toggle and return focus to visible `#topbar-save` (falling
back to `#nav-home` only when necessary).

Bounded rendered-current-source evidence used the project localhost server and
the in-app browser without bypassing extension-policy failure. At 1280×720, current
`newtab.html` and CSS rendered the uncollapsed rail as a fixed 320 px panel at the
right edge with header, list, and footer visible. At 800×720, computed style was
`display:none` with zero width/height. The page still failed initialization at
`chrome.storage.local`, so those observations prove shell geometry only, not real
Chrome tab state, keyboard execution, or capture.

A temporary `.tmp` control matrix, removed after review and never shipped, reused
current production CSS and representative production fragments for selected,
non-saveable, no-match, and read-failure states. It rendered at 1280×720 in Folio
light and dark. It is reference evidence rather than product authority and does not
prove real local data. The first light render exposed tertiary-ink failures for the
9.5 px domain line (3.62:1) and 11 px guidance (4.06:1); changing both to secondary
ink raised them to 5.79:1 and 6.50:1. Dark domain contrast measured 7.44:1. The full
state matrix then retained readable hierarchy, visible selection controls, full
non-saveable consequence, and distinct neutral/error locator edges.

The complete run passes all 36 repository JavaScript syntax files and all 27
documented runners, including the default 10,000-schedule concurrency matrix
(69,880 attempts). `git diff --check` and the trailing-whitespace scan for all 8
untracked files pass. This is partial verification: installed MV3 real-data states,
real tab switch/close/context/drag/capture effects, installed 1280×720/800 px,
native zh-TW and forced-color pixels, zoom, screen-reader output, representative-
user comprehension, approval, and release remain open.

## New-tab exact Group/Stack capture receipt contract (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node --check scripts/undo-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/undo-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/concurrency-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first-red
onboarding run must stop because `collectItemListCaptureTargets()` is absent. Green
source contracts require selected-as-Group and all six Board/List Group/Stack
single/multi drop callsites to delegate to one exact controller. That controller
must freeze source descriptors, use the graph-wide allocator, localize history,
create an exact saved-item receipt, request fresh source reads, and offer success
only through `toastCaptureDestinationReceipt()` after the guarded commit.

The production-extracted exact-destination matrix must cover a nested Stack path,
unchanged sibling reorder, saved-item value drift, moving the item out of its Stack,
Stack rename, duplicate Group/Stack IDs, and owner-list replacement. Exact Open
must route with `{ persist: false }`, schedule one rebuilt-target focus, and focus
the deepest Stack. A stale Open must route nowhere. A post-acceptance drift receipt
must retain action-scoped Undo, expose no Open action, use danger styling, and name
the uncertainty in English and native zh-TW.

The Undo suite must also execute destination loss during fresh source refresh and
between two final source reads. The first case removes no source. In the second,
only the source whose final read completed while exact authority remained valid may
close; the later source remains open, the partial outcome is explicit, and Undo
restores the registered closed source. Static source checks require
`commitCapturedTabs()` to validate the exact receipt after asynchronous preparation
and persistence, and both before and after every final source `tabs.get()`.

Receipt CSS must keep a bounded wrapping panel, complete long-path wrapping, 40 px
native actions, primary Open destination, secondary Undo, visible focus, no hover
scale, a two-action row at 520 px, reduced-motion shutdown, and forced-color
hierarchy. A temporary `.tmp` fixture, removed after review and never shipped,
reused production themes and receipt markup. Folio light rendered at 1280×720,
800×720, and 520×720; Folio Dark rendered at 800×720 with native zh-TW receipt
copy. Those screenshots are bounded component references, not installed product or
real-data authority.

The complete run passed all 36 JavaScript syntax files and all 27 documented
runners, including 10,000 randomized concurrency schedules (69,880 attempts).
`git diff --check` and the 8-file untracked whitespace scan pass. This is partial
verification only. The available Chrome profile did
not have the ChatGPT browser-control extension, so installed MV3 storage/tab timing,
native drag and cleanup, installed pixels/focus/screen-reader output, forced-color
rendering, zoom, representative-user comprehension, approval, and release remain
open.

## Focused Locus Index core visual system (2026-08-12)

Run:

```powershell
node scripts/core-visual-system-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first-red visual
contract must stop because the default `folio` theme lacks `--registry-bg`. Green
source checks require semantic paper/registry/locator/receipt/focus tokens in both
default themes; the final new-tab and popup layers; no gradient in those final
layers; dark registry navigation/header/footer; warm work surfaces; a ruled Home
registry; the Welcome intro/operation split; detail recovery boundaries; one 3 px
visible focus system; responsive 800/560/420×520 rules; reduced-motion shutdown;
and forced-color record/context boundaries.

For bounded current-source presentation evidence, serve the repository and a
reference document that imports production `themes.css`, `newtab.css`, and
`popup.css`. References may use only existing empty/default structure and must not
be treated as runtime data authority. Check light Home, Welcome, and detail at
1280×720; dark Home at 1280×720; exact iframe Home and Welcome at 800×720; detail
at 560×720; and popup at 420×590 and 420×520. Require document width to equal
viewport width in every case. At 800 px Welcome must be one column; at 560 px the
detail sheet must be full-width; the normal popup must stack Save above Hibernate;
the compact popup may use the defined two-column row. The localhost popup's real
missing-extension-API error is valid evidence for its error presentation only.

The recorded run passes all 37 repository JavaScript syntax checks and all 28
documented runners. The separate stress runner completes 10,000 schedules: 69,880
attempts, 19,947 accepted, 49,379 rejected, and 554 injected failures. `git diff
--check` and the trailing-whitespace scan for all 9 untracked files pass. Direct
localhost `newtab.html` cannot initialize without `chrome.storage.local`; the
reference renders therefore prove current CSS hierarchy and geometry, not installed
state, persistence, browser effects, or real local data. Inbox uses the shared gated
record rules, but its attempted fixture screenshot was unreliable and is not a
rendered pass. Installed light/dark/en/zh-TW pixels, native keyboard/screen-reader
output, forced-color pixels, zoom, representative-user approval, and release remain
open. **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

## Focused Note/To-do marker picker contract (2026-08-12)

Run:

```powershell
node scripts/onboarding-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/quality-gates.js
node --check newtab.js
```

Then run the complete static block at the top of this file. The first public-seam
DOM run must fail because a Note carrying imported `#2f6f63` receives only the six
standard choices and falsely selects No color. A second red CSS check must reject
the flex/glass/circular/scaling palette. Green requires one named seven-choice
radiogroup for a custom current value; the custom choice must be selected, named,
initially focused, and painted from the exact stored string. Activating that
already-current custom choice must close without calling the persistence boundary
or changing the item byte. Explicit standard/No color choices continue through the
existing exact-target, one-snapshot, awaited-`persistNow()` transaction and its
pending, rejection, unknown-effect, recovery, success, and opener-focus contracts.

CSS checks require one `viewport - 16px` Locus Index paper strip with a 3 px locator
edge, 40 px rectangular tabs, a deliberate four-plus-three custom layout, the shared
3 px visible focus, pending state, reduced-motion behavior, and forced-color selected
state. A custom value must feed `background-color`, never the image-capable
`background` shorthand. Checks must also reject backdrop blur, gradients, circular-
orb styling, and hover scale. For bounded reference evidence, render the production theme/new-tab CSS at
320 x 420 in default light and dark. Require a 304 px menu, seven choices in 4 + 3
rows, exact `rgb(47, 111, 99)` custom paint, selected state, and document width equal
to viewport width. Reference markup may prove presentation only; it is not product
state or installed-extension authority.

The recorded focused checks pass. The privacy-focused first run correctly failed
while custom bytes still fed the broad `background` shorthand, then passed after the
color-only correction. The complete pass covers all 37 repository
JavaScript syntax files and all 28 documented deterministic/stress runners. The
concurrency runner completes 10,000 schedules: 69,880 attempts, 19,947 accepted,
49,379 rejected, and 554 injected failures. `git diff --check` and the trailing-
whitespace scan for all 9 untracked files pass. The bounded light/dark reference
meets the stated geometry and custom-color conditions with no gradient or backdrop
filter; it predates only the final shorthand-to-`background-color` hardening, which
is current-source contract evidence. Installed MV3 timing/effects, real local data, native keyboard/screen-reader
output, forced-color pixels, zoom, representative-user comprehension, approval, and
release remain open. **Implemented: yes. Verified: partial. User-validated: no.
Released: no.**

## Focused Board/List selection and Details controls (2026-08-12)

Run:

```powershell
node scripts/onboarding-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/quality-gates.js
node --check newtab.js
node --check scripts/onboarding-contract-test.js
```

Then run the complete static block at the top of this file. The first public-seam
run must fail because the old `attachItemSelection()` returns no native focus owner.
Green requires one returned `<button type="button" role="checkbox">` for every
Board/List/Stack record; localized Select/Deselect plus the exact item title;
truthful `aria-checked`; placement in the existing record header; Shift range
delegation; and exact focus recovery after the synchronous render rebuild. The List
Stack path must call this seam instead of building its own selector.

`applyItemMeta()` must add one native localized Details button only when real notes,
checklist entries, or custom fields exist. Visible facts must name Why saved,
checklist completion, and custom-field count. Activation must open the shared sheet
with `returnFocusKey: 'board-item-details'`, and close must prefer the rebuilt exact
Details trigger. A record without optional metadata must gain no decorative row.
Custom cover bytes may enter `backgroundColor` only; the extracted function must
contain no broad `cov.style.background =` sink.

CSS checks require a persistent 40×40 px squared selector, a non-color selected
edge, shared 3 px visible focus, and no hidden/circular/scaling selector residue.
The Details action must be a full-width minimum-40 px ruled row whose facts wrap;
it must not restore pills, gradients, glass, or ornamental scale. Forced-color
rules must preserve both selected and detail boundaries.

For bounded presentation evidence, a temporary `.tmp` reference, removed after
review and never shipped, imported production `themes.css` and `newtab.css` and
used the current production record fragments. Folio light at 1280×720 measured a
40×40 px focused selector and a 534×40 px Details row. Folio light at 800×720
measured a 362×40 px focused Details row. Folio Dark with native zh-TW at 560×720
kept the selector at 40×40 px, both Details rows at 538×40 px, localized all new
control names, produced no horizontal overflow, and logged no warnings or errors.
These are current-fragment presentation measurements, not installed product state,
real data, persistence, browser-effect, or assistive-technology evidence.

The first complete run exposed one stale reminder-overdue extractor that depended
on the selector function's old exact parameter list. Its end marker now stops at the
function name, and the failed runner plus the entire playbook were rerun. The final
pass covers all 37 JavaScript syntax files and all 28 documented deterministic/
stress runners. The concurrency runner completes 10,000 schedules: 69,880 attempts,
19,947 accepted, 49,379 rejected, and 554 injected failures. `git diff --check` and
the trailing-whitespace scan for all 9 untracked files pass. Installed MV3 behavior,
real local data, native keyboard/screen-reader and forced-color output, zoom,
reload/back/forward, representative-user comprehension, approval, and release
remain open. **Implemented: yes. Verified: partial. User-validated: no. Released:
no.**

## Focused selected-item action docket and batch receipts (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/selection-docket-contract-test.js
node --check scripts/archive-scale-contract-test.js
node scripts/selection-docket-contract-test.js
node scripts/archive-scale-contract-test.js
node scripts/group-stack-identity-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first public-seam
run must fail on the absent `createSelectedItemMutationContext()` boundary. Green
must execute, not merely grep, exact unchanged selection; duplicate imported IDs;
selected ancestor/descendant rejection; changed ephemeral selection; moved item;
same-ID replacement; clean authoritative graph adoption; cross-Workspace Group and
Stack destinations; direct-parent no-op omission; selected-Stack descendant
omission; duplicate pending activation; accepted receipt ordering; rejected/unknown
receipt recovery; exact Undo; and destination receipt activation.

Archive and Move may mutate the reviewed in-memory graph before the asynchronous
receipt, but no selection clear, board/archive render, focus continuation, success
toast, Undo exposure, or destination action may occur until `State.persistNow()`
accepts. A second activation starts no snapshot or write. Known stale authority must
fail before snapshot; persistence rejection starts no retry and retains selection
and DOM behind recovery. The extracted commit functions must contain
`State.persistNow()` and no delayed `State.persist()`.

The 1,024-record archive scale test must use this acknowledged selection boundary,
retain every imported record object and stable ID exactly once, preserve document
order, create one localized snapshot and one receipt, and recover the authoritative
pre-mutation graph after an injected quota rejection. Existing single-item,
Group, Archive → Trash, and Trash restore scale cases remain unchanged.

Static DOM/CSS checks require `#item-sel-toolbar` to remain the stable ID while
becoming a localized named toolbar with `.isl-summary` and `.isl-actions`; native
40 px minimum buttons; one cobalt primary Open action; danger-colored Archive; a
3 px locator edge and focus ring; no `backdrop-filter`, spring entrance, hover
translation, gradient, or pill geometry; a ≤680 px 2×2 lifecycle grid with a Clear
rail spanning both rows; bottom board reservation; reduced-motion rules; and
Canvas/CanvasText/Highlight forced-color equivalents. English and native zh-TW
must define the full toolbar, stale-review, snapshot, picker, no-destination,
accepted, and destination-changed copy set.

Back/Forward and direct `Router.navigate()` must check
`isSelectedItemMutationPending()` both before and after editor flush. The global
key owner must consume pending keyboard input before Escape can clear selection.
`toggleItemSelect()` and `clearItemSelection()` must refuse the pending token. Board
`M` and the toolbar Move button must both create the exact selection review; the
shared context menu retains Arrow/Home/End/Tab/Escape behavior and opener return.

For bounded presentation evidence, a temporary `.tmp` reference, removed after
review and never shipped, imported production `themes.css` and `newtab.css` and
used an explicitly labelled non-data record fragment. Folio light at 1280×720 and
800×720 measured a 760×60 px docket, five 42 px-high actions, 3 px locator edge,
no backdrop filter, and no horizontal overflow. At 560×720 it measured 544×141 px:
four 238×40 px actions plus one 42×85 px Clear rail, again without overflow. Folio
Dark at 800×720 retained the same hierarchy and an explicit keyboard focus outline.
Console warnings/errors were zero. These are current-fragment presentation
measurements, not installed product state or real data.

The first complete pass truthfully failed twice: the onboarding CSS extractor still
looked for the retired “Floating item-selection toolbar” comment, and the archive
scale harness still modeled `State.persist()`. Both test boundaries were repaired
to current production semantics and rerun. The final pass covers all 38 repository
JavaScript syntax files and all 29 documented deterministic/stress runners. The
concurrency runner completes 10,000 schedules: 69,880 attempts, 19,947 accepted,
49,379 rejected, and 554 injected failures. `git diff --check` passes. Installed
MV3 storage/browser effects, real local data, native screen-reader and forced-color
output, zoom, installed reload/Back/Forward, representative-user comprehension,
approval, and release remain open. **Implemented: yes. Verified: partial.
User-validated: no. Released: no.**

## Focused shared typography contract (2026-08-12)

Run:

```powershell
node --check popup.js
node --check scripts/core-visual-system-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first public visual-
system run must fail while the eight font choices live only in `newtab.css`, popup
does not apply `settings.font`, or any Locus Index core heading hardcodes Lora.
Green requires shared `themes.css` body/display/metadata roles, every existing font
ID, selected-font display selectors across Welcome, Home/Inbox, board,
Search/Library, opened tabs, detail, and popup, plus a safe popup `dm` fallback.
Lora must remain available as an explicit preference; it must not be removed.

Current-source browser checks use a fresh local origin so cached CSS cannot be
mistaken for the candidate. At 1280×720 and 800×720, require `#ws-title` and
`.rail-title` to resolve to DM Sans/weight 700 and document width to equal viewport
width. At 420×590 and 420×520, require `.window-label` to resolve to the same face,
the primary Save to remain 386×50 px at normal height, and no horizontal overflow.
One native Tab must expose an in-viewport visible focus outline. Direct HTTP new-tab
cannot initialize storage-backed product state; popup may therefore prove only its
genuine missing-extension-API error state. Do not promote these checks to installed,
populated-state, persistence, screen-reader, forced-color, or user evidence.

The recorded first-red run stopped on the missing shared `dm` mapping. Green focused
checks pass. Fresh current-source computed styles and screenshots meet the stated
1280/800/420 px typography, control, focus, and overflow conditions. The complete
pass covers all 38 repository JavaScript syntax files and all 29 documented
deterministic/stress runners. The concurrency runner completes 10,000 schedules:
69,880 attempts, 19,947 accepted, 49,379 rejected, and 554 injected failures. `git
diff --check` and trailing-whitespace scans for all 10 untracked files pass.
**Implemented: yes. Verified: partial. User-validated: no. Released: no.** Installed
MV3 font persistence and populated Welcome/Home/Inbox/Details pixels, real data,
native assistive-technology/forced-color output, zoom, owner approval,
representative-user comprehension, and release remain open.

## Focused Home Trail responsive hierarchy contract (2026-08-12)

Run:

```powershell
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first-red
Onboarding/Home Trail run must stop while no exact
`@media (min-width: 901px) and (max-width: 1100px)` projection exists. Green
requires recovery grid areas `item item actions / line destination actions`,
capture grid areas `candidate actions / destination actions`, explicit mapping of
the existing DOM children into those areas, the 2×28 px vertical recovery locator,
and no CSS reordering of the source markup. The established horizontal projection
above 1100 px, single-column projection at 900 px and below, empty recovery state,
focus ring, forced colors, reduced motion, English/native zh-TW copy, and real
capture/recovery controllers must remain unchanged.

For bounded visual evidence, serve a temporary reference that imports current
`themes.css` and `newtab.css` and reproduces the exact production Trail child
structure. Remove it after review and never treat it as real product data. At
1280×720, require a one-row Trail and visible Inbox plus Spaces. At 1100×720 and
901×720, require the two-row grid areas, document width equal to viewport width,
every grid lane's scroll width to remain inside its own width, and the complete
Inbox to end within the viewport. At 900×720 and 800×720, require the established
stack rather than compressing controls into the medium projection. Repeat 1100 px
in Locus Dark and inspect visible hierarchy; source contracts retain the locale,
focus, reduced-motion, and forced-color boundaries.

The recorded first-red run stopped because the exact medium media block was absent.
Green current-source light measurements were: Trail 285.5 px high at 1280 with
Inbox/Spaces ending at 519.5/652.5 px; Trail 351 px at 1100 with Inbox/Spaces ending
at 585/718 px; and Trail 350.5 px at 901 with Inbox ending at 703.6 px. Document
width equalled viewport width throughout. At 800 px the 507.5 px stacked Trail was
retained, exposing a separate unused-width hierarchy issue rather than manufacturing
a pass. The 1100 px Locus Dark reference retained the same grid and no overflow.
All 38 repository JavaScript syntax files and all 29 documented deterministic/
stress runners pass. The concurrency runner completes 10,000 schedules: 69,880
attempts, 19,947 accepted, 49,379 rejected, and 554 injected failures. This is
current-source presentation and deterministic evidence only. Installed MV3 pixels,
real local data, actual theme/locale and assistive-technology output, zoom,
representative-user comprehension, approval, and release remain open.
**Implemented: yes. Verified: partial. User-validated: no. Released: no.**

## Focused Home 800 px work-area contract (2026-08-12)

Run:

```powershell
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The first public red
must reject the missing exact 761–1100 px medium projection. Green requires the
medium capture grid to use `minmax(0, 1fr) minmax(310px, .9fr)`, both action groups
to permit shrinkage, the consequence hint to be width-bounded with emergency
wrapping, and no capture grid to retain `minmax(250px, auto)`. The exact 900 px
shell block must resolve `body[data-theme]` to `--sidebar: 188px` and
`#board.home-mode` to `width: 100%`. Existing DOM order, stable IDs, focus/Escape,
copy, controllers, preferences, state, and effects remain unchanged.

For bounded visual evidence, serve and then remove a temporary current-source
reference that imports production `fonts.css`, `themes.css`, and `newtab.css` and
uses the exact Home Trail child structure and runtime labels. This is presentation
evidence only and must not imply product state. Check 1280, 1101, 1100, 901, 900,
821, 820, 800, 761, 760, and 560 px at 720 px height. Require document width to
equal viewport width, lane scroll widths to stay within their boxes, 188 px Space
registry plus 612 px Home at 800, intact action controls, a nonzero candidate lane,
Inbox bottom at or above 720 px through 761, and the single-column stack to resume
at 760. Render English/light and the existing native zh-TW copy in Locus Dark at
800 px. Do not promote these references to installed or user evidence.

Recorded reds found three coupled defects: no 761–1100 projection; an intrinsic
action track that expanded to about 513 px and collapsed the 800 px candidate to
0; and an initially bounded 220 px track that still wrapped both consequences at
901 px. Final English/light measurements are: 1280 Trail 293.7 px and Inbox bottom
527.7 px; 1100 Trail 351 px and Inbox bottom 585 px; 901 Trail 350.5 px and Inbox
bottom 703.6 px; 800 registry/Home 188/612 px, candidate/actions 202/310 px, Trail
326.5 px, and Inbox bottom 673.6 px; 761 Inbox bottom 692 px. Native zh-TW/Locus
Dark at 800 keeps the 202/310 px tracks and Inbox bottom 681.6 px. The 760 px stack
remains overflow-safe. All 38 JavaScript syntax checks and all 29 documented
runners pass. Concurrency completes 10,000 schedules: 69,880 attempts, 19,947
accepted, 49,379 rejected, and 554 injected failures. `git diff --check` passes and
the temporary reference is removed. **Implemented: yes. Verified: partial.
User-validated: no. Released: no.** Installed populated pixels, actual Chrome
storage/tab state, native preference/theme/locale switching, assistive technology,
zoom/history/reload, representative-user comprehension, owner approval, and release
remain open.

## Focused shared action-menu contract (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/core-visual-system-contract-test.js
node scripts/core-visual-system-contract-test.js
```

Then run the complete static block at the top of this file. The first public red
must reject a `#context-menu` that lacks a viewport-bounded Locus Index sheet.
Green requires 220-320 px width bounds, viewport-height scrolling, a 3 px top
locator, theme-native paper, no backdrop blur or entrance animation, 40 px rows,
locator-plus-outline focus, native zh-TW section-label casing, reduced-motion
suppression, and forced-color Canvas/Highlight treatment. Source checks require a
localized menu name, localized Find/review and Organize sections, localized layout
names, and Board/List separated from the Advanced layout menu. They reject
hardcoded runtime section/layout labels and the legacy glass/spring presentation.

The controller behavior is intentionally frozen: Arrow Up/Down, Home/End, wrapped
Tab/Shift+Tab, Enter/Space, outside dismissal, true LIFO Escape, opener return, and
all action callbacks remain unchanged. No state, route, layout persistence,
schema/import, stable ID, permission, host access, or product effect may be added by
this slice.

Recorded evidence: the first focused run stopped on the missing bounded Locus Index
menu contract. Focused green passed, followed by all 38 repository JavaScript
syntax files, all 29 documented runners, `git diff --check`, and the 10,000-
schedule concurrency run (69,880 attempts, 19,947 accepted, 49,379 rejected, 554
injected failures). A temporary presentation-only current-source reference was
removed. The in-app browser rejected its local-file URL before rendering and the
policy was not bypassed. Therefore light/dark/en/zh-TW pixels, exact 1280x720/
800/520 geometry, native focus/screen-reader/forced-color output, and installed MV3
behavior remain unverified. **Implemented: yes. Verified: partial. User-validated:
no. Released: no.**

## Focused command-discovery contract (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/core-visual-system-contract-test.js
node scripts/core-visual-system-contract-test.js
```

Then run the complete static block at the top of this file. The first public red
must reject a `#cmd-palette` that lacks the no-blur, no-animation Locus Index
contract. Green requires a viewport-bounded flat sheet, dark query owner, 3 px blue
locator, 44 px result/reference rows, locator-plus-outline focus, paper results,
narrow-screen description removal, reduced-motion suppression, and forced-color
Canvas/Highlight treatment. Reject the legacy blur, `fadeDown`, `popIn`, rounded
floating input card, and 39 px mixed-density rows.

Source and production-extracted checks require one immutable
`SHORTCUT_DEFINITIONS` model, localized runtime projection, a guarded
`chrome.commands.getAll()` adapter, explicit loading and unavailable statuses, no
static cheatsheet description rows, and no `APP_SHORTCUTS` fork. Execute the model
and require exactly 14 Settings app rows, 13 compact dialog rows, 2 browser rows,
unique IDs, live custom-key replacement, localized **Not set** for an assigned but
blank key, locale resolution at render time, and no definition mutation through a
projected row. Browser descriptions must not become product copy.

The controller behavior is intentionally frozen: combobox active descendant,
Arrow/Home/End/Enter, wrapped Tab, true LIFO Escape, opener return, command order,
and every action callback remain unchanged. The shortcut dialog retains contained
Tab, outside/Close/Escape dismissal, and opener return. No command, route, product
state, Advanced-view promotion, schema/import byte, stable ID, permission, host
access, network path, onboarding step, or fake populated state may be added.

Recorded evidence: the first focused run failed on the absent Locus Index palette
rule. Focused syntax and visual-system/model checks then passed, followed by all 38
repository JavaScript syntax files, all 29 documented runners, `git diff --check`,
and 10,000 concurrency schedules (69,880 attempts, 19,947 accepted, 49,379 rejected,
554 injected failures). Installed MV3 was unavailable; the prior browser security
policy forbids bypassing the rejected local presentation route. Therefore real
light/dark/en/zh-TW pixels, customized Chrome keys, exact 1280x720/800/520 geometry,
native pointer/keyboard/screen-reader/forced-color behavior, navigation/reload,
representative-user validation, approval, and release remain unverified.
**Implemented: yes. Verified: partial. User-validated: no. Released: no.**

## Focused global-feedback receipt contract (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/core-visual-system-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/saved-page-reopen-contract-test.js
node scripts/group-stack-identity-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/reminder-identity-contract-test.js
node scripts/calendar-add-task-contract-test.js
node scripts/selection-docket-contract-test.js
```

Then run quality gates and the complete static block at the top of this file. The
first public red must reject a shared receipt without one localized native Close
control. Green requires one flat theme-native filing strip, 4 px success/info/
warning/error locator, readable wrapping copy, native 40 px action/Undo/Close
controls, explicit focus, no spring/scale entrance, a two-row 520 px action docket,
reduced-motion suppression, and forced-color Canvas/Highlight treatment.

Source and production-extracted checks must require all of the following:

- independent English/native zh-TW keys for the touched core feedback and history
  copy, with the former hardcoded runtime messages absent;
- four tone semantics, error-only `alert`/assertive delivery, and polite status for
  ordinary feedback;
- no timer for a valid action, exact Undo action ID, or explicit persistent receipt;
  a bounded timer only for passive feedback, cancelled by focus or pointer reading;
- native Close and receipt-focused Escape dismiss exactly once and restore the
  connected opener; Escape must not invoke Undo or pop an underlying overlay; and
- unchanged action callbacks, Undo IDs, persistence, routes, state, schema/import,
  stable IDs, permissions, network boundaries, and Advanced feature breadth.

Recorded evidence: the first focused run stopped on the absent localized Close
control. Focused syntax, CSS/source, locale-parity, hardcoded-copy, residue, and
production-extracted controller checks then passed. The controller execution covers
durable Undo/continuation, one-shot continuation, passive-only timing, focus-held
feedback, assertive error semantics, Close focus return, and focused Escape without
Undo. Focused onboarding, reopen, Group/Stack identity, item-detail, reminder,
Calendar, and selection contracts plus quality gates and `git diff --check` pass.
All 38 JavaScript syntax checks and all 29 documented deterministic/stress runners
pass, including 10,000 concurrency schedules (69,880 attempts, 19,947 accepted,
49,379 rejected, 554 injected failures). Installed MV3 and the prior policy-blocked
local presentation route remain unavailable. Therefore real pixels, native assistive
technology, asynchronous post-Undo focus after rebuild, exact 1280x720/800/520
geometry, theme/locale switching, reload/navigation, representative-user validation,
approval, and release remain unverified. **Implemented: yes. Verified: partial.
User-validated: no. Released: no.**

## Focused storage-quota recovery contract (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/core-visual-system-contract-test.js
node --check scripts/state-sync-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/archive-scale-contract-test.js
node scripts/export-import-scale-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The public first red
must reject quota rejection that lacks one atomic, described fail-closed recovery
dialog. Green source checks require the stable quota IDs, backup-first DOM order,
independent English/native zh-TW static and dynamic copy, removal of the former
hardcoded prototype strings, and quota precedence above state recovery without
focus theft.

The production-extracted quota controller must cover all of the following:

- one bound controller; release of a lower modal's inert owner; real usage loading,
  known percentage, and unavailable states; initial Download focus; and live locale
  repaint;
- pending backup disables every action and blocks duplicates, Close, outside click,
  Escape, Archive, and reload while Tab remains contained;
- exactly one silent export request, an honest download-requested success, an
  assertive failure that keeps the sheet open, and refocus after settlement;
- ordinary Close/outside/Escape pops quota only, returns to its standalone opener,
  or transfers focus to the visible state-recovery Reload action when stacked; and
- exact current-Workspace Archive routing followed by authoritative reload, plain
  saved-data reload, missing-Archive refusal, and reload failure without success.

Presentation checks require a 560 px flat paper capacity docket, dark registry
header, 6 px blocked-write rail, truthful meter, blue guidance, 44 px controls,
one-column actions at 520 px, no blur or entrance animation, reduced-motion
suppression, and forced-color treatment. Do not change or simulate the export
payload, central writer, storage thresholds, route model, schema/import bytes,
stable IDs, permissions, network boundary, or user data.

Recorded evidence: the first focused run stopped on the missing atomic described
dialog. Focused syntax, visual-system, state-sync, item-detail, archive-scale,
export/import-scale, and quality contracts pass. Production-extracted execution
covers the states and ordering above. All 38 repository JavaScript syntax files and
all 29 documented runners pass; concurrency completes 10,000 schedules with 69,880
attempts, 19,947 accepted, 49,379 rejected, and 554 injected failures. `git diff
--check` passes. This is deterministic and static evidence only. Real Chrome quota,
browser download completion, installed
pixels, native keyboard/screen-reader/forced-color behavior, exact 1280x720/800/520
geometry, theme/locale switching, reload/navigation, representative-user approval,
and release remain unverified. **Implemented: yes. Verified: partial.
User-validated: no. Released: no.**

## Focused Settings Data backup-first transfer contract (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/core-visual-system-contract-test.js
node --check scripts/export-import-scale-contract-test.js
node --check scripts/organization-terminology-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/export-import-scale-contract-test.js
node scripts/organization-terminology-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The public first red
must stop because Settings Data does not lead with the existing Export or expose
JSON selection through one native named button. Green source checks require stable
`#export-btn`/`#import-json-btn`/`#import-file`/review IDs and DOM order; real
profile summary; localized file states and exact mode consequences; named manifest,
radios, status, and pending state; no label masquerading as a control; one flat
transfer spine/review sheet; 760/620/520 px reflow; explicit focus, reduced motion,
and forced colors; and absence of cloud/account/encryption/scheduling/history/
invented-format claims.

Production-extracted execution must cover FileReader loading, valid preview,
oversize/invalid failure, reselectable input, one review interlock, duplicate
confirmation refusal, Replace-to-Home focus, Merge opener return, rejection that
stays open, ordinary and pending Escape, and upper recovery ownership. Bookmark
execution must hold pending before `chrome.bookmarks.getTree()` settles, refuse a
duplicate, re-resolve the exact reviewed Workspace/Space before mutation, wait for
`persistNow()`, expose only the acknowledged action ID for Undo, stop a replaced
destination before snapshot/write, and roll a rejected write back without success.
Existing schemas/envelopes, validator/normalizers, size/quota limits, exported and
imported bytes, routes, permissions, privacy, and real browser APIs remain in force.

Recorded evidence: the first focused run stopped on missing backup-first/native-
button structure. Focused visual-system, import-scale/controller/bookmark,
organization terminology, item-detail integration, and quality contracts pass. The
complete 38-file JavaScript syntax pass and all 29 runners pass; concurrency
completes 10,000 schedules with 69,880 attempts, 19,947 accepted, 49,379 rejected,
and 554 injected failures. `git diff --check` passes with the existing line-ending
warnings. This is deterministic/static evidence only. Real Chrome chooser,
FileReader/download/bookmark timing and effects, installed pixels, native keyboard/
screen-reader/forced-color behavior, exact 1280×720/800/620/520 geometry,
theme/locale switching, reload/navigation, representative-user approval, and
release remain unverified. **Implemented: yes. Verified: partial. User-validated:
no. Released: no.**

## Focused Settings Capture policy and preference-receipt contract (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/core-visual-system-contract-test.js
node --check scripts/onboarding-contract-test.js
node --check scripts/item-detail-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The public first red
must stop because `#dp-capture` lacks one real settings-derived save contract before
its existing destination and source-close controls. Green source checks require all
stable Capture IDs exactly once; one named/described source → confirmed local copy →
source consequence route; a polite atomic receipt status; native select/check boxes
with exact consequence descriptions; independent English/native zh-TW keys; the
remembered → fixed Space → active Space resolution order; unique identity/ancestry
and ambiguous-Inbox refusal; one `persistNow()` boundary; no `State.persist()` or
premature toast in the Capture bindings; pending section/drawer/global-key ownership;
flat registry/paper/locator/receipt presentation; 620 px vertical reflow; reduced
motion and forced colors; and removal of fake Page title/example.com content,
decorative steps, and obsolete preview CSS.

Production-extracted execution must cover popup versus direct-save projection, the
real remembered and quick-save paths, metadata/deduplication/source consequences,
live locale re-resolution, and graph immutability. It must reject multiple Inbox,
duplicate/stale/moved stable identities, preserve an invalid stored default only as
a disabled unavailable option, expose pending before receipt, block a duplicate,
request exactly one write, and announce saved only after acknowledgement. Destination
plus remembered-target clearing must be one patch. No-op and invalid patches write
nothing. Rejection, existing recovery, graph-owner replacement, or touched-value
drift must expose no success and must remain behind authoritative recovery. Static
keyboard checks retain Tab in Settings while Escape/navigation are blocked and the
initiating control remains the focus owner.

Recorded evidence: the first focused run stopped on the absent settings-derived
Capture contract. Green visual-system and production-extracted model/controller
checks cover the cases above. The first complete run then found one test-integration
gap: the saved-item global-key extraction did not provide the new Capture pending
guard; adding that false-path stub restored the production listener test without
changing runtime behavior. The complete 38-file JavaScript syntax pass and all 29
runners pass; concurrency completes 10,000 schedules with 69,880 attempts, 19,947
accepted, 49,379 rejected, and 554 injected failures. `git diff --check` passes with
the existing line-ending warnings. This is deterministic/static evidence only.
Real installed preference persistence and popup/shortcut/context-menu coupling,
pixels, native keyboard/screen-reader/forced-color behavior, exact 1280×720/800/620/
520 geometry, zoom, theme/locale switching, reload/navigation, representative-user
approval, and release remain unverified. **Implemented: yes. Verified: partial.
User-validated: no. Released: no.**

## Focused Settings General core and Workspace-extras contract (2026-08-13)

Run:

~~~powershell
node --check newtab.js
node --check scripts/general-settings-contract-test.js
node scripts/general-settings-contract-test.js
node scripts/appearance-settings-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/reminder-overdue-contract-test.js
node scripts/saved-page-reopen-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/export-import-scale-contract-test.js
node scripts/quality-gates.js
~~~

Then run the complete static block at the top of this file. DOM/source checks
require one named/busy #general-preferences boundary; stable #seg-language,
#tog-hibernate, #tog-autoswitch, #tog-landing, #profile-name-input, and
#show-tour-btn IDs; a native language select; exact checkbox descriptions; one
atomic #general-status receipt; and one native #general-workspace-plugin containing
only window switching, Welcome visibility, and the retained greeting name. Language,
saved-page opening, and first-save help must precede the plugin. Reject visible
Profile/Your name promises, implicit name-on-blur persistence, legacy hibernation
jargon, inline style, ornamental SVG, gradient, blur, lift, scale, marketplace,
account, download, permission, network, and stored-plugin residue.

English and independently authored native zh-TW keys must exist exactly once per
locale. CSS checks require the shared flat preference ledger, 44 px select, 54 px
toggle rows, 3 px controls, locked plugin summary while pending, 800 px row stacking,
620/520 px name/action stacking, product Motion-off, reduced motion, and canonical
forced-color boundaries.

Production-extracted execution must accept only one language, Hibernate,
auto-switch, Welcome, or compatible profile patch. It must project language
immediately, request exactly one State.persistNow receipt, retain the initiating
control, refuse duplicate/invalid input, preserve compatible profile fields, and
announce saved only after the same State/settings owner and touched-value fingerprint
survive acknowledgement. An unchanged value writes nothing. Rejection, pre-existing
recovery, touched-value drift, or graph adoption emits no success and yields to
authoritative recovery. Workspace-plugin Active derives only from the real
auto-switch or Welcome booleans.

Recorded evidence: the initial integration run exposed an Appearance VM fixture
missing the new General false-path owner; adding that stub changed no runtime
behavior. The new General contract then stopped on its own dataset regex typo before
all dynamic cases passed. The first complete run reached runner 24 before an older
reminder-locale assertion required the removed direct language writer; it now
requires the acknowledged General projection seam. One uninterrupted final pass
covers all 41 JavaScript syntax files, the quality gate, and all 31 test runners
(32 runner commands). Concurrency completed 10,000 schedules with 69,880 attempts,
19,947 accepted, 49,379 rejected, and 554 injected failures. This is
deterministic/static evidence only. Installed storage/reload behavior, pixels,
native keyboard/screen-reader/forced-color output, exact 1280x720/800/620/520
geometry, zoom, actual placeholder/window/Welcome effects, representative-user
approval, and release remain unverified. **Implemented: yes. Verified: partial.
User-validated: no. Released: no.**

## Focused Settings Appearance core and Style-plugin contract (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/appearance-settings-contract-test.js
node scripts/appearance-settings-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/group-stack-identity-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/reminder-identity-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. Source checks require
exactly three promoted color modes (System/Locus Light/Locus Dark); native named
buttons with `aria-pressed`; item-size and card-detail controls in the core ledger;
all fifteen compatible non-core themes, eight fonts, and column width inside the
single native Style-plugin disclosure; and no theme-cycling action, pointer-only
theme tile, inline font styling, prototype blurb, or ornamental spin. Available/
Active must derive from real theme/font/width values without a stored plugin flag,
marketplace, account, download, or fake populated state. English and independently
authored native zh-TW, 800/620 stacking, product Motion-off, reduced motion, forced
colors, explicit focus, and the shared Settings pending boundary are required.

Production-extracted execution must accept only allowlisted Appearance keys and
values, project the chosen value immediately, and request exactly one
`State.persistNow()` receipt. It must retain the initiating control, block duplicate
activation, and announce saved only after the same State/settings owner and touched-
value fingerprint survive acknowledgement. Invalid and no-op input writes nothing.
Existing recovery, rejection, graph adoption, or touched-value drift emits no
success and yields to authoritative recovery. Style-plugin Active projection must
cover optional theme, font, and width independently; reset may change only those
three keys and must preserve density, URL visibility, Motion, and content.

Recorded evidence: focused Appearance, core-visual, onboarding, and quality checks
pass. The first complete run stopped because the extracted Group/Stack history
environment lacked the new shared preference predicate; the item-detail and reminder
extracted keyboard environments needed the same explicit false-path seam. After
those harness-only integrations, one uninterrupted complete pass covered all 39
repository JavaScript files and all 30 runner commands. Concurrency completed 10,000
schedules with 69,880 attempts, 19,947 accepted, 49,379 rejected, and 554 injected
failures. `git diff --check` passed with existing line-ending warnings. This is
deterministic/static evidence only. Real installed preference persistence, OS-theme
response, prepaint/popup coupling, pixels, native keyboard/screen-reader/forced-color
output, zoom, exact 1280x720/800/620/520 geometry, locale/reload/history behavior,
representative-user approval, and release remain unverified. **Implemented: yes.
Verified: partial. User-validated: no. Released: no.**

## Focused optional Plugins registry contract (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/plugins-hub-contract-test.js
node scripts/plugins-hub-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/appearance-settings-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. DOM checks require one
`#tools-hub` modal named by `#plugins-title` and described by the availability and
browser-profile storage notes; one localized native Close; one named plugin list;
and exactly eight native `.hub-card[data-tool]` rows for pomodoro, finance, subs,
habits, water, books, goals, and workout. Each row must expose its localized name,
plain description, neutral Available state, and Open action to assistive technology.
English and independently authored native zh-TW keys must exist exactly once per
locale. Reject turn-on/enable/install/marketplace language, fake populated state,
inline styles, emoji tiles, gradients, blur, lift, scale, and ornamental entrance.

CSS checks require a viewport-bounded internally scrolling Locus Index panel: dark
registry header, sheet/paper rows, two-letter mono slot, 3 px row locator, visible
focus, and neutral availability. The registry stays two columns through 800 px and
becomes one at 620/520 px. Product Motion-off and OS reduced motion suppress every
hub transition; the canonical forced-colors block must retain the panel boundary,
Highlight focus/locator, and LinkText Open affordance.

Production-extracted execution must use only `PLUGIN_TOOL_OPENERS` for the exact
eight existing tool functions. Opening refuses active fail-closed recovery and a
duplicate, records the explicit app-level opener, applies the owner-scoped background
inertness, balances one scroll lock, and focuses the first plugin. Hidden or unknown
activation does nothing. Known activation closes/unlocks the hub, releases inertness,
restores the visible opener, then calls only the allowlisted tool. Close is idempotent;
Tab is trapped; local Escape prevents/stops lower dismissal and restores focus.
Hub code must contain no State persistence, plugin enablement object, Chrome API,
network request, permission, account, catalog, or download path. More/sidebar/app
menu entry points must pass their actual opener; the command palette retains its
existing restore-before-run behavior.

Recorded evidence: the Plugins contract and focused onboarding, visual-system,
Appearance, and quality gates pass. The first integrations found three stale test
assumptions: secondary navigation expected a bare `openToolsHub` action, the shared
visual contract expected its old zero-argument signature, and Home assumed its
forced-colors block would be first. Those contracts now follow the explicit-opener
seam, and plugin forced-color rules live in the canonical shared block. One
uninterrupted complete pass covered all 40 repository JavaScript files, the quality
gate, and all 30 `*test.js` files (31 runner commands). Concurrency completed 10,000
schedules with 69,880 attempts, 19,947 accepted, 49,379 rejected, and 554 injected
failures. This is deterministic/static evidence only. Installed pixels, native
keyboard/screen-reader/forced-color output, exact 1280x720/800/620/520 geometry,
zoom, live theme/locale/entry-point behavior, all eight legacy tool interiors,
representative-user approval, and release remain unverified. **Implemented: yes.
Verified: partial. User-validated: no. Released: no.**

## Focused Settings Storage exact-versus-estimate contract (2026-08-12)

Run:

```powershell
node --check newtab.js
node --check scripts/core-visual-system-contract-test.js
node --check scripts/onboarding-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/archive-scale-contract-test.js
node scripts/export-import-scale-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. The public first red
must stop because Settings Storage lacks one localized native exact browser-usage
meter before the estimated Locus data. Green source checks require stable unique IDs
and order; named meter/list/unavailable/empty states; independent English/native
zh-TW dynamic keys; removal of hardcoded runtime and rainbow dashboard residue; one
620 px stack; reduced-motion suppression; and forced-color boundaries.

Production-extracted execution must cover UTF-8 sizing; mixed and empty real graphs;
exact bucket partition, descending rank, bounded percentages, no Stack-child double
counting, disjoint Archive/Trash, and state immutability. It must also cover loading,
unavailable, known, warning, and full meter states; 100% visual capping; guarded retry;
late-generation refusal; live locale repaint; real Archive/total/list/empty rendering;
and focus preservation. No check may replace the real `storageUsage()` authority with
a fabricated quota or mutate storage to prove presentation.

Recorded evidence: the first focused run stopped on the missing localized native
meter. Focused syntax, visual-system, onboarding/storage, archive-scale, export/
import-scale, state-sync, and quality contracts pass. All 38 repository JavaScript
syntax files and all 29 documented runners pass; concurrency completes 10,000
schedules with 69,880 attempts, 19,947 accepted, 49,379 rejected, and 554 injected
failures. `git diff --check` passes. This is deterministic and static evidence only.
Real Chrome `getBytesInUse()` and quota values, installed retry timing and pixels,
native keyboard/screen-reader/forced-color behavior, exact 1280x720/800/620/520
geometry, theme/locale switching, representative-user approval, and release remain
unverified. **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

## Focused Settings Privacy facts and Screen-share-mask contract (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/privacy-settings-contract-test.js
node scripts/privacy-settings-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/general-settings-contract-test.js
node scripts/appearance-settings-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/library-recovery-contract-test.js
node scripts/background-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/export-import-scale-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. DOM/source checks require
one named/busy `#privacy-contract`; exactly four storage, Locus-network, browser-
access, and recovery facts; primary backup before restore options; one honest
download-limit note; and a native `#privacy-screen-plugin` containing the stable
`#tog-blur`. Reject the shield/checklist, “Privacy & Security,” the old blur-mode
language, unqualified tracking promise, inline style, ornamental SVG, gradient,
glass blur, lift, scale, hover reveal, and filter animation. Visible facts must stay
grounded in the current manifest allowlist, absent host permissions, `connect-src
'none'`, user-initiated saved-site navigation exception, and background destination-
hidden behavior. English and independently authored native zh-TW must name the real
effect and distinguish display masking from encryption, deletion, or saved-data
change.

CSS checks require one registry/paper fact docket, two fact columns through the
1280/800 layouts, one column with stacked actions at 620/520 px, 42 px actions,
restrained 3–4 px radii, canonical tokens, visible native-summary focus, reduced-
motion shutdown, and forced-color boundaries. Static masking coverage must include
saved titles and recovery locations without pointer reveal.

Production-extracted execution must accept only one boolean `blurPrivacy` patch,
project the display effect immediately, request exactly one `State.persistNow()`
receipt, retain the initiating toggle, refuse duplicates/invalid input, and announce
saved only after the same State/settings owner and touched-value fingerprint survive
acknowledgement. Explicit no-op input writes nothing. Existing recovery, rejection,
graph adoption, settings-owner replacement, or touched-value drift emits no success
and yields to authoritative recovery. The plugin state must derive only from current
compatible bytes. The shared Settings owner must block other controls, section/
drawer dismissal, plugin collapse, Escape, Back/Forward, and lower shortcuts while
Tab remains in the existing trap.

Recorded evidence: focused Privacy, core-visual, General, Appearance, onboarding,
Library, background, state-sync, export/import, and quality checks pass. The first
focused Privacy run exposed a harness-scope error: its responsive assertion searched
the local Privacy CSS slice even though the shared 620 px rule lives later in the
Settings stylesheet. Correcting that test scope changed no runtime behavior. One
uninterrupted complete pass covered all 42 repository JavaScript files, the quality
gate, and all 32 `*test.js` runners (33 runner commands). Concurrency completed
10,000 schedules with 69,880 attempts, 19,947 accepted, 49,379 rejected, and 554
injected failures. This is deterministic/static evidence only. Real installed
preference persistence, pixels, native keyboard/screen-reader/forced-color output,
exact 1280x720/800/620/520 geometry, zoom, download completion, notification masking,
reload/navigation, representative-user comprehension, approval, and release remain
unverified. **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

## Focused Board local-record to Details convergence contract (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node --check scripts/item-detail-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/undo-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. Source checks require
Note and To-do cards to expose a localized native primary Details action, a
persistent named More action, and no `contenteditable`, direct text/color writer,
slash mutation, `.color-menu`, or `.cdot` residue. Pointer context, Context Menu,
Shift+F10, primary activation, Edit, and Change marker must converge on the same
route-backed sheet and exact initial focus field. Note excerpts must be sanitized
text, empty records must be explicit, and card content must clamp without hiding
the available edit action.

Creation checks require Board and command-palette entry to freeze one exact Group
item-list, allocate one compatible Note or To-do, establish an exact destination
receipt, await one `State.persistNow()`, and only then render/open Details. Pending
must retain a busy opener, refuse duplicate and conflicting work, block navigation/
Escape/lower shortcuts, and yield to recovery on rejection or destination drift.
The retired delayed write and dead inline-editor focus selectors must be absent.

Details checks require rich Note text and To-do text to share the exact
`commitItemDetailMutation()` transaction. The marker field is one localized named
roving radiogroup. Standard/No marker choices delegate to that same receipt. A
current custom imported value appears as a truthful read-only seventh choice,
retains its exact bytes, and may reach only a color-capable CSS property. Static and
production-extracted execution must cover custom/no-write behavior, Arrow/Home/End
focus, explicit-choice delegation, detached candidate planning, no-op, one snapshot/
write, stale/duplicate/recovery refusal, acknowledgement ordering, rejection, and
unknown outcome.

CSS/i18n checks require the quiet shared record stock, mono type stamp, one 3 px
marker locator, 40 px controls, 3 px visible focus, readable empty state, Note/To-do
clamping, light/dark tokens, reduced-motion shutdown, forced-color boundaries, and
responsive rules that preserve the primary route at 1280x720, 800 px, and 520 px.
English and independently authored native zh-TW must cover edit, empty, marker,
pending, error, and saved states.

Recorded evidence: focused onboarding/Home, item-detail, shared visual-system,
state-sync, Undo, and quality contracts pass. The final complete-run counts and
concurrency totals are recorded in `CURRENT_SLICE.md` and `STATUS.md`. This is
deterministic source and production-extracted evidence only. Installed MV3 storage
and route timing, real pixels at the named viewports, native keyboard/screen-reader/
forced-color behavior, reload/back/forward persistence, representative-user
approval, and release remain unverified. **Implemented: yes. Verified: partial.
User-validated: no. Released: no.**

## Focused Group Save-hierarchy and Add-record contract (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node --check scripts/group-stack-identity-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/group-stack-identity-contract-test.js
node scripts/organization-creation-contract-test.js
node scripts/organization-move-contract-test.js
node scripts/organization-delete-contract-test.js
node scripts/item-detail-contract-test.js
node scripts/core-visual-system-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. Source checks require
the Board/Canvas/focused Group footer to contain exactly two native buttons. The
stable `data-act="add-tab"` control must call the established capture boundary while
presenting localized **Save here** and an exact-destination name. The only secondary
control must be a localized **Add record** menu disclosure; `data-act="add-note"`,
`add-todo`, and `add-stack` must not return to the footer. Empty Groups must lead
with Save and retain the same named Add-record path.

The extracted record-action model must resolve one unique exact Group and require
the same rendered object before exposing Note, To-do, and Stack. Note and To-do must
delegate to `createBoardLocalRecord()` and its exact destination receipt; Stack must
delegate to the identity transaction with the resolved Workspace/Space/Group tuple.
A stale, duplicated, moved, replaced, or unavailable Group exposes no record actions
and performs no write. Board More must suppress the duplicate record section; List
More must retain the shared contextual section and use the same Save wording.

Menu checks require the shared disclosure owner to become `aria-expanded="true"`
only while its menu is open, reset on menu replacement, action selection, outside
close, and Escape, and retain first-item focus plus the established Arrow/Home/End,
contained Tab, Enter/Space, and opener-return behavior. The empty-state builder must
carry `aria-haspopup`/`aria-expanded` and pass its activating native button into the
same controller.

CSS/i18n checks require one `minmax(0, 1fr) auto` footer, a restrained 3 px Save
locator, 40 px controls, a Group-owned inline-size container, and a 250 px container
rule that hides only the secondary visible label while retaining its accessible
name at the supported 200 px resize. Forced colors must project that locator through
the existing shared block; reduced motion and theme tokens remain authoritative.
English and independently authored native zh-TW must cover Save here, its exact
destination consequence, Add record, and its exact Group name.

Recorded evidence: focused onboarding/Home, Group/Stack identity, organization
create/move/delete, item-detail, visual-system, and quality suites pass. One final
complete run covers all 42 repository JavaScript files, the quality gate, and all
32 `*test.js` runners (33 runner commands). Concurrency completes 10,000 schedules:
69,880 attempts, 19,947 accepted, 49,379 rejected, and 554 injected failures. This
is deterministic source and production-extracted evidence only. Installed MV3
storage/tab/menu timing, pixels at 1280x720/800/520 and 200 px Group width, native
keyboard/screen-reader/forced-color behavior, reload/Back/Forward, representative-
user approval, and release remain unverified. **Implemented: yes. Verified: partial.
User-validated: no. Released: no.**

## Unified top-bar overflow and Plugins boundary (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/core-visual-system-contract-test.js
node --check scripts/onboarding-contract-test.js
node --check scripts/plugins-hub-contract-test.js
node --check scripts/quality-gates.js
node scripts/core-visual-system-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/plugins-hub-contract-test.js
node scripts/organization-delete-contract-test.js
node scripts/quality-gates.js
```

Then run the complete static block at the top of this file. DOM checks require
exactly one rendered `#topbar-search`, one reviewed `#topbar-save`, and one
`#more-btn`. Save and More must expose native menu disclosure state. The six stable
legacy action IDs must remain unique, hidden, and `aria-hidden`; Home must keep More
available while retaining its duplicate topbar Save suppression.

Static and extracted runtime menu checks require `secondaryNavigationItems()` to
exclude `search.nav`, include one pending-count Calendar entry, place Plugins and
Settings under localized Options, and pass the actual More/sidebar button into both
modal focus contracts. `openMoreMenu()` must focus its native owner and pass that
owner to the shared context menu. `openAppMenu()` must delegate to the same More
model and use the visible topbar control as disclosure/focus owner even when the
optional Welcome layer supplies only a captured anchor rectangle.

State projection checks require `syncTopbarMoreState()` to retain organize-active
state, add/remove the reminder marker, and update title plus `aria-label` in English
and native zh-TW. CSS checks require no ornamental motion, a compact Search control
at the existing breakpoint, reduced-motion inheritance, and a forced-color reminder
equivalent. Confirmed destructive controls must continue to use `var(--red)` rather
than the ordinary accent.

Recorded evidence: all 42 JavaScript syntax files, the quality gate, and all 32
contract/import/stress scripts pass (33 runner commands). Concurrency completes
10,000 schedules: 69,880 attempts, 19,947 accepted, 49,379 rejected, and 554
injected failures; `git diff --check` passes. This is source and production-extracted
deterministic evidence only. Installed pixels, real MV3 menu/storage/tab timing,
native pointer/keyboard/screen-reader/forced-color output, exact 1280x720/800/520
geometry, reload/Back/Forward, representative-user approval, and release remain
unverified. **Implemented: yes. Verified: partial. User-validated: no. Released:
no.**

## Workspace-extras explicit opt-in and schema 13 (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check import-utils.js
node --check scripts/general-settings-contract-test.js
node --check scripts/state-sync-contract-test.js
node --check scripts/popup-locate-contract-test.js
node --check scripts/export-import-scale-contract-test.js
node scripts/general-settings-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/popup-locate-contract-test.js
node scripts/export-import-scale-contract-test.js
```

Then run the complete static block at the top of this file. Migration checks require
`CURRENT_SCHEMA === 13`, a false fresh-state default, and a pre-schema-13 migration
that preserves valid explicit booleans while resolving absent or malformed
`showLanding` values to false. The numeric fixture list must equal every integer
from zero through `CURRENT_SCHEMA`; both replace and merge must pass all six accepted
envelopes plus raw legacy. Include absent early and late bytes and explicit true
choices on both sides of schema 7.

Runtime/source checks require `GENERAL_SETTING_DEFAULTS.showLanding === false`,
Available plugin projection for an empty settings object, an exact-true boot
predicate, and the same fail-closed guard inside `showLandingLayer()`. The separate
save-first guide remains reachable and unchanged. English, native zh-TW, and the
static English fallback must state that the locally packaged Workspace extras are
off by default and describe the clock/saved-work-search effect without claiming an
install, account, download, or marketplace.

Recorded evidence: focused General, state-sync, popup/deep-link, and export/import
contracts pass. Schemas 0–13 complete 30 compatibility cases; the current scale
fixture is 1,488,149 bytes. One final complete run covers all 42 repository
JavaScript files, the quality gate, and all 32 `*test.js` runners (33 runner
commands). Concurrency completes 10,000 schedules: 69,880 attempts, 19,947 accepted,
49,379 rejected, and 554 injected failures. This is source and production-extracted
deterministic evidence only. Installed migration/reload persistence, real MV3
storage timing, pixels at 1280×720/800/520, native pointer/keyboard/screen-reader/
forced-color output, Back/Forward, representative-user approval, and release remain
unverified. **Implemented: yes. Verified: partial. User-validated: no. Released:
no.**

## Focused short-viewport receipt contract (2026-08-13)

Run:

```powershell
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/core-visual-system-contract-test.js
git diff --check
```

The focused public contract must require `#toast` to remain inside the viewport and
the compact grid to reserve a bounded message row above its action row. Only
`#toast-msg` may scroll. Stable receipt IDs, DOM order, 40 px actions, tone mapping,
focus, reduced motion, forced colors, copy, persistence, routes, and browser effects
remain unchanged.

For bounded presentation evidence, serve a temporary reference that imports the
current production fonts, themes, and receipt CSS and uses the exact receipt child
structure. Remove it after review. At 1280x720 require the established 760 px strip,
no message scroll, all actions visible, and no horizontal overflow. At 420x240
require the full receipt inside the viewport, a scrollable message when content is
long, Open destination / Undo / Dismiss visible, the tone mark aligned to the first
line, and no horizontal overflow.

Recorded red: the focused Onboarding/Home Trail contract stopped because the receipt
had no viewport maximum or scroll owner. Green presentation measured a 760x135.1 px
receipt at 1280x720 with a 113/113 px message. At 420x240 it measured y=20..228,
396x208 px; the message measured 136/188 px and scrolled while every action remained
visible. Both had zero horizontal overflow. The temporary reference and server were
removed. This is current-source presentation evidence, not installed MV3, real-data,
native assistive-technology, representative-user, approval, or release evidence.
**Implemented: yes. Verified: partial. User-validated: no. Released: no.**

## Focused receipt message keyboard-scroll contract (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/core-visual-system-contract-test.js
git diff --check
```

The focused public contract must exercise the production-extracted overflow
synchronizer with overflowing, fully visible, and hidden receipts. Only overflow
may add `tabindex="0"`; all other states must remove it and reset `scrollTop`.
Page Down must advance the focused message by a clamped readable page and prevent
the same key from moving the document. Source assertions must keep resize
synchronization, new-message reset, message-local key binding, and the shared 3 px
focus locator present.

For bounded rendering evidence, use a temporary reference with the production
themes, receipt CSS, exact child structure, and matching focused helpers; remove it
and stop its server after review. At 1280x720 require a fully visible message to
retain `tabIndex = -1`. At 420x240 require a longer message to gain `tabIndex = 0`,
show the focus locator, move under Page Down, retain visible Open destination / Undo
/ Dismiss controls, and produce no horizontal overflow.

Recorded red: the focused contract stopped first at the missing access synchronizer
and then at the missing message-local key handler. Green source checks now cover the
conditional tab stop, reset, resize, and Page Down behavior. The removed reference
measured 132/132 px and `tabIndex = -1` at 1280x720. At 420x240 it measured y=20..228;
the 136/207 px message gained `tabIndex = 0`, showed the 3 px indigo locator, and
Page Down moved it to its clamped 71 px end while all actions stayed visible and
horizontal overflow remained zero. This is production-extracted deterministic and
browser-reference evidence, not installed MV3, native assistive-technology,
representative-user, approval, or release evidence. **Implemented: yes. Verified:
partial. User-validated: no. Released: no.**

## Focused compact receipt action-order contract (2026-08-13)

Run:

```powershell
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/core-visual-system-contract-test.js
git diff --check
```

The focused public contract must preserve the stable message -> Open destination ->
Undo -> Dismiss markup order. Inside the 520 px receipt projection, `.toast-copy`
must span row one, `.toast-actions` must begin row two in column one, and
`#toast-close` must finish row two in column two. Conditional message access,
40 px targets, wide layout, copy, behavior, stable IDs, and data boundaries remain
unchanged.

For bounded presentation evidence, serve a temporary reference using the production
themes, receipt CSS, and exact child structure; remove it and stop its server after
review. At 420x240 require evidence above all three left-to-right actions, the whole
receipt inside the viewport, scrollable long text, and no horizontal overflow. At
1280x720 require the established 760 px filing strip and fully visible message to
remain unchanged.

Recorded red: the focused contract stopped because compact evidence occupied only
column one while the last DOM control, Dismiss, occupied row one. Green source now
freezes matching DOM and grid order. The removed browser reference measured the
420x240 receipt at y=20..228; Open, Undo, and Dismiss all occupied y=177..217 from
left to right, the message measured 136/170 px, and horizontal overflow was zero.
At 1280x720 the 760 px strip retained a 132/132 px message and its established
three-column layout. The in-app browser did not advance native Tab focus inside the
verification iframe, so this is source-order and browser-reference layout evidence,
not installed MV3 Tab traversal, native assistive-technology, representative-user,
approval, or release evidence. **Implemented: yes. Verified: partial.
User-validated: no. Released: no.**

## Focused Search query-Clear availability contract (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/search-recovery-contract-test.js
node scripts/search-recovery-contract-test.js
git diff --check
```

The focused production-extracted contract must exercise
`syncSearchQueryClear(input, clearButton)` with empty and typed values. Empty means
both `hidden` and `disabled`; any present input value means visible and enabled.
`renderSearchSurface()` must synchronize after assigning the route-backed query, on
every ordinary/composing input event, and at composition end before delegating to
the existing IME/debounce controller. The Clear callback remains the existing
query-only `_searchSet()` path.

For bounded presentation evidence, serve a temporary reference using production
themes and Search CSS; remove it and stop its server after review. At 420x590 and
1280x720 require empty Clear to have no layout presence, typed Clear to remain an
enabled 40x40 px control, the query field to retain focus, and horizontal overflow
to remain zero. Activating Clear must empty the field, hide/disable itself, and
return input focus in the reference.

Recorded red: the focused Search suite stopped because the synchronizer was absent.
Green production-extracted evidence covers empty/typed behavior and initial,
ordinary, and IME-completed binding order. The removed 420x590 reference measured
empty Clear as hidden, disabled, and `display:none`; typed text exposed one enabled
40x40 px control, and activation restored an empty focused query. At 1280x720 the
empty query measured 1068x56 px and typed Clear remained 40x40 px. Both widths had
zero horizontal overflow. This is deterministic and browser-reference evidence,
not installed MV3, native IME/screen-reader, representative-user, approval, or
release evidence. **Implemented: yes. Verified: partial. User-validated: no.
Released: no.**

## Focused Library query IME-stability contract (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/library-recovery-contract-test.js
node scripts/library-recovery-contract-test.js
git diff --check
```

The production-extracted contract must drive `bindLibraryQueryControl()` through
composition start, interim input, IME-owned Escape, composition end, the browser's
duplicate follow-up input, ordinary input, and settled Escape. Require zero commits
during composition; no prevented key, clear, or blur for IME Escape; exactly one
completed-value commit; no duplicate commit; immediate ordinary input; then one
empty commit and one blur for settled Escape. The shared Library renderer must bind
this controller and retain no second direct query-event path.

Recorded red: the focused Library suite stopped because
`bindLibraryQueryControl` was absent. Green production-extracted evidence covers
the complete event matrix across the renderer shared by All Links, Favorites, and
Read Later. A removed 420x590 current-source browser reference committed ordinary
`research` input once, retained `#library-query` focus, measured the query row at
420x52 px with zero horizontal overflow, and then made exactly one empty commit and
blurred on settled Escape. The restricted evaluation layer could not create native
composition events or invoke the mounted composition handler, so this is not a
rendered native-IME check. **Implemented: yes. Verified: partial. User-validated:
no. Released: no.**

## Focused popup Hibernate fresh-source guard (2026-08-13)

Run:

```powershell
node --check popup.js
node --check scripts/concurrency-contract-test.js
node scripts/concurrency-contract-test.js
node --check scripts/quality-gates.js
node scripts/quality-gates.js
git diff --check
```

The production-extracted popup case must snapshot the reviewed source before a held
`popupStateWriteQueue`, mutate the caller's object, release the queue, fresh-read
the exact tab once, and update from the immutable URL. Require refusal for changed
window, active state, current URL, different pending URL, malformed pending URL,
and a tab that becomes active during the held wait. Mismatch performs no update or
reload. A rejected update remains one attempt. The bulk source contract must build
descriptors before optional `saveTabsBeforeHibernate()` and fresh-confirm each one
after persistence before its update, allowing exact siblings to continue.

Recorded red: extraction stopped at `Popup single-tab Hibernate must be
extractable` because the shared guard did not exist. Green evidence covers the full
matrix above and completes 5 client queues, 2 capture flows, 10 deterministic
schedules, and 10,000 fixed-seed randomized schedules: 69,880 attempts, 19,947
accepted, 49,379 rejected, and 554 injected failures. The older ordinary-Save
harness stub was aligned with its typed close receipt; the quality gate's quick
branch anchor was aligned with the existing `closeRequested` boundary. This is
production-extracted/static evidence only, not installed popup lifetime, the final
read-to-update race, real Chrome tab/storage ordering, representative-user,
approval, or release evidence.

## Focused exact Inbox capture receipt (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/concurrency-contract-test.js
node scripts/quality-gates.js
git diff --check
```

The production-extracted case must run single, selected, and Space-drop Inbox
callers with the graph-wide allocator and require one exact receipt containing the
new item references. Its resolver must govern `commitCapturedTabs()` and fail after
an Inbox rename or item-list drift. Selected and Space-drop actions must emit one
existing destination receipt and no path-blind success; opened-tab row and palette
single Save must opt in, while Home and Welcome retain their dedicated handoffs.
The richer top-bar receipt must fresh-resolve before presentation and action.

Recorded red: the focused runner stopped at `single Inbox Save must allocate safely
and carry exact saved-item authority through persistence and source cleanup`.
Green evidence covers mixed supported/unsupported selection, retained-safe ID
allocation, one commit, exact-validator revocation after drift, one destination
receipt, no path-blind result, and selection/focus retention. Syntax, onboarding/
Home Trail, state-sync, quality gates, and the 10,000-schedule concurrency matrix
pass. This is production-extracted deterministic/static evidence, not installed
MV3 state/tab ordering, the final read-to-remove race, rendered focus/assistive
technology, representative-user approval, or release evidence.

## Focused existing-Group retained-ID allocation (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/concurrency-contract-test.js
node scripts/quality-gates.js
git diff --check
```

The production-extracted existing-Group case must make the first raw generator
value collide with an ID retained elsewhere in the graph. Selected Save must skip
it, create one distinct ID per accepted page, dispatch one commit, and retain exact
receipt invalidation after destination drift. Static caller evidence must find one
`createOrganizationIdAllocator()` in each selected and active-tab branch and no
direct `uid()` inside `addSidebarOrActiveTabToGroup()`.

Recorded red: the focused runner stopped at `existing-Group capture must allocate
new saved items against every retained graph ID`. Green evidence proves the forced
collision, two unique safe IDs, one commit, both production branches, and unchanged
receipt/drift behavior. Syntax, onboarding/Home Trail, quality gates, diff checks,
and the 10,000-schedule concurrency matrix pass. This is deterministic extracted/
static evidence, not installed Chrome ID/storage/tab timing, rendered focus or
assistive technology, representative-user approval, or release evidence.

## Focused Save-all complete source consequence (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/concurrency-contract-test.js
node scripts/quality-gates.js
git diff --check
```

The production-extracted mixed-window case must persist exactly the HTTP, HTTPS,
FTP, and file candidates and pass those same four source IDs to the one guarded
`commitCapturedTabs()` call. Data, blob, JavaScript, and extension/internal sources
must remain excluded. Keep the one snapshot, exact receipt/validator, accepted
count, and destination-drift invalidation.

Recorded red: the caller produced cleanup IDs `[12, 13, 14]` after saving IDs
`[11, 12, 13, 14]`. Green evidence passes all four supported sources through the
existing cleanup guard without broadening eligibility. Syntax, onboarding/Home
Trail, quality gates, diff checks, and the 10,000-schedule concurrency matrix pass.
This is deterministic extracted/static evidence, not installed Chrome query/
removal ordering, the final read-to-remove race, rendered receipt/assistive
technology, representative-user approval, or release evidence.

## Focused single-page Restore fallback-Inbox identity (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/library-recovery-contract-test.js
node scripts/library-recovery-contract-test.js
node scripts/archive-scale-contract-test.js
node scripts/quality-gates.js
git diff --check
```

The production-extracted missing-Group case must return the archived `groupId`
hint from the first raw generator call. `commitArchivedPageRestore()` must allocate
past that retained ID, create one Inbox with the next safe ID, preserve the exact
saved-page object and metadata, and dispatch one acknowledged write. Caller source
must use `createOrganizationIdAllocator()` and contain no raw `uid()`.

Recorded red: the focused runner stopped at `a newly created restore Inbox must
allocate against active, archived, trashed, and hinted IDs`. Green evidence proves
the forced hint collision is skipped while exact destination, one write, Undo, and
recovery behavior remain intact. The recovery ledger, 1,024-record scale, quality,
and diff gates pass. This is deterministic extracted/static evidence, not installed
storage, rendered focus/assistive technology, representative-user trust, or release
evidence.

## Focused inactive-Space Inbox drop receipt (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/concurrency-contract-test.js
node scripts/quality-gates.js
git diff --check
```

The production-extracted helper case must provide one active Workspace with active
and inactive Spaces plus one foreign Workspace. Default list-context creation for
the inactive Space remains null. Explicit `{ allowInactiveSpace: true }` must
resolve the exact inactive Space/Inbox/list inside the active Workspace and reject
the foreign Workspace. Static caller evidence must show only
`dropTabsIntoCategory()` opting in.

Recorded red: the uniquely resolved inactive-Space target remained null. Green
evidence proves the exact opt-in boundary plus state, quality, diff, and 10,000-
schedule concurrency gates. This is deterministic extracted/static evidence, not
installed native drag/drop, real Chrome storage/tab timing, rendered focus or
assistive technology, representative-user approval, or release evidence.

## Focused Space-drop metadata policy (2026-08-13)

Run:

```powershell
node --check newtab.js
node --check scripts/onboarding-contract-test.js
node scripts/onboarding-contract-test.js
node scripts/quality-gates.js
git diff --check
```

The production-extracted Space-drop caller must receive a descriptor containing a
private raw title and data favicon while `captureTabFields()` returns a domain title
and empty favicon. Require one policy call, one saved record containing only the
policy output, one commit, and one exact destination receipt. Caller source must
contain no direct `tab.title`, `tab.fav`, or hard-coded `Untitled` record field.

Recorded red: the accepted caller made zero canonical policy calls. Green evidence
proves only the configured output reaches the saved item without changing its
destination or effect flow. Syntax, onboarding/Home Trail, quality, and diff gates
pass. This is deterministic extracted/static evidence, not installed native drag,
real preference/storage/tab timing, rendered Search/receipt/assistive technology,
representative-user approval, or release evidence.

## Focused drag duplicate-policy contract (2026-08-13)

Run `node scripts/onboarding-contract-test.js`. The production-extracted Space-drop
case begins with the source URL already saved. With `captureDeduplicate: false`, it
must append one independently allocated record, commit once, and expose one exact
destination receipt. After enabling deduplication, the same caller must append
nothing, make no second commit, roll back its empty history action, and emit the
localized Already saved result. Static caller checks require both Space Inbox and
Group/Stack drops to invoke `captureDuplicateExists()` with their exact item lists.

Also run `node --check newtab.js`,
`node --check scripts/onboarding-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These are deterministic
production-extracted/static checks, not installed native drag delivery, real
storage/tab timing, rendered duplicate-record/receipt/assistive-technology output,
representative-user approval, or release evidence.

## Focused command-palette recent-page Save contract (2026-08-13)

Run `node scripts/onboarding-contract-test.js`. The production-extracted palette
caller receives an active Locus URL, an older eligible page, a freshest eligible
page, and a still-newer page whose pending URL conflicts. It must query exactly
`{ currentWindow: true }`, pass only the freshest stable eligible page to
`saveTabToInbox()` once with `{ destinationReceipt: true }`, and emit no failure.
An unsupported-only inventory and a thrown query must each perform no Save and
reuse one localized danger result.

Also run `node --check newtab.js`,
`node --check scripts/onboarding-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed Chrome `lastAccessed`/query
ordering, real persistence/source cleanup, rendered palette/receipt/focus/native-
assistive-technology output, representative-user approval, or release evidence.

## Focused popup within-batch duplicate contract (2026-08-13)

Run `node scripts/popup-locate-contract-test.js`. Save-before-Hibernate with an
empty existing destination and two exact same-URL sources must create one record
when deduplication is enabled and two when it is disabled. Whole-window Links must
apply the same current-batch reservation, while Queue with duplicates allowed and
fresh Session mode must preserve both records. A deduplicated Links result must
still carry every valid non-active source descriptor into the separate guarded
cleanup phase.

Also run `node --check popup.js`,
`node --check scripts/popup-locate-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed duplicate-tab inventory, real
persistence/close/hibernate timing, rendered receipt/Find/Reopen/native-assistive-
technology output, representative-user approval, or release evidence.

## Focused new-tab within-batch duplicate contract (2026-08-13)

Run `node scripts/onboarding-contract-test.js`. The production-extracted existing-
Group caller starts with two selected exact same-URL sources followed by one
distinct source. With deduplication enabled it must create two collision-safe
records in source order, pass only source IDs 31 and 33 into persistence/cleanup,
retain its exact destination receipt, and clear the handled selection after
acceptance. The extracted batch predicate must retain all three sources when
deduplication is disabled. Static source checks require shared Group/Stack drop to
use the same predicate.

Also run `node --check newtab.js`,
`node --check scripts/onboarding-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed multi-selection/native drag,
real persistence/source cleanup, rendered receipt/Find/Reopen/focus/native-
assistive-technology output, representative-user approval, or release evidence.

## Focused Group Save-here recent-page contract (2026-08-13)

Run `node scripts/onboarding-contract-test.js`. The production-extracted no-
selection caller receives an active Locus tab, one stable eligible browser page,
and a newer page with conflicting pending URL. It must query exactly
`{ currentWindow: true }`, select only the stable page through
`recentSaveCandidate()`, perform one accepted commit, and expose one exact Group
receipt. A wholly unsupported requested selection must not fall through; an
unsupported-only inventory, query failure, or destination drift must produce no
mutation or source effect.

Also run `node --check newtab.js`,
`node --check scripts/onboarding-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed Chrome `lastAccessed`/query
ordering, real persistence/source cleanup, rendered Board/List copy/receipt/focus/
native-assistive-technology output, representative-user approval, or release.

## Focused popup capturable-URL contract (2026-08-13)

Run `node scripts/popup-locate-contract-test.js`. The popup policy must accept only
`http:`, `https:`, `ftp:`, and `file:`. An extracted single Save with a `data:`
source must return false before any state request, graph change, tab read, removal,
or effect. Mixed window Save must persist only the eligible page and include only
that page in guarded cleanup. Mixed Save-before-Hibernate and bookmark import must
also omit unsupported URLs without changing eligible-source behavior.

Also run `node --check popup.js`,
`node --check scripts/popup-locate-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed `file:`/`ftp:` behavior, real
persistence/close/Hibernate timing, rendered popup/native-assistive-technology
output, representative-user approval, or release.

## Focused accepted single-tab destination-drift contract (2026-08-13)

Run `node scripts/onboarding-contract-test.js`. The extracted `saveTabToInbox()`
must accept one write whose exact receipt becomes unavailable, return an opt-in
`{ accepted: true, item, destinationConfirmed: false }`, emit the existing accepted-
save warning with Undo/source consequence and no stale destination action, and make
no retry. The Home controller must return accepted without painting its reviewed
path or focusing stale Open. Welcome must close and complete onboarding without
Inbox navigation or item focus.

Also run `node --check newtab.js`,
`node --check scripts/onboarding-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed storage/tab interleaving,
rendered Home/Welcome focus/native-assistive-technology output, representative-user
approval, or release.

## Focused new-tab bookmark Reopen-policy contract (2026-08-13)

Run `node scripts/export-import-scale-contract-test.js`. The production-extracted
bookmark importer must receive mixed HTTP, HTTPS, FTP, local-file, JavaScript,
inline-data, blob, mail, and malformed addresses. It must persist the first four
exact URLs only, create one reviewed-Space Group, and report exactly four imported
bookmarks. Its first generated Group ID must collide with an Archive-retained
destination hint; the shared production allocator must skip that ID and allocate
one unique Group plus four unique items before the single acknowledged write.
Existing pending overlap, destination drift, rejected-write rollback, Undo, scale,
schema compatibility, and semantic fuzz cases must remain green.

Also run `node --check newtab.js`,
`node --check scripts/export-import-scale-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed `chrome.bookmarks` traversal,
real persistence/Undo, rendered import/native-assistive-technology output,
representative-user approval, or release.

## Focused ordinary-popup destination-before-close contract (2026-08-13)

Run `node scripts/popup-locate-contract-test.js`. A close-enabled ordinary Save must
receive its state acceptance before dispatching exactly one
`locus-complete-quick-capture` close action. The popup must perform no local tab
read/removal. An authoritative missing destination must retain the accepted Save,
leave the source open, issue no mutation retry, and render the existing unavailable
Saved-card continuation. Protected and effect-unknown results also leave the source
open; close-off dispatches no effect.

Also run `node --check popup.js`,
`node --check scripts/popup-locate-contract-test.js`,
`node --check scripts/quality-gates.js`, `node scripts/quality-gates.js`, and
`git diff --check`. These checks are production-extracted/static evidence, not
installed MV3 queue/message lifetime, real storage/tab timing, the final
check-to-remove interval, rendered/native-assistive-technology output,
representative-user approval, or release.

## Focused whole-window destination-projection contract (2026-08-13)

Run `node scripts/popup-locate-contract-test.js`. After accepted persistence, an
authoritative `destinationReady:false` whole-window effect must produce one effect
request, no mutation retry, no destination object, and protected source counts.
`showWindowSaveResult()` must render Space/Group names only from a confirmed worker
destination and must not reference the pre-write `target.cat` or `receiving` names.

Also run `node --check popup.js`,
`node --check scripts/popup-locate-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed MV3 message lifetime, real
storage/tab timing, rendered/native-assistive-technology output, representative-
user approval, or release.

## Focused popup-Locate source-close partial contract (2026-08-13)

Run `node scripts/popup-locate-contract-test.js`. After accepted persistence and an
exact saved-item route, every protected, changed, or rejected source close must
return strict `LOCUS_LOCATE_SOURCE_CLOSE_FAILED`, retain the exact current
destination/route, report `sourceClosed:false`, `sourceCloseFailed:true`, and a
boolean `noticeShown`, and attempt no source removal more than once. A failed native
notice must return `noticeShown:false` without converting the accepted Save into a
write failure or retrying any effect. The popup must keep the existing Saved result
visible and must not call `window.close()` for that typed partial. A
`LOCUS_LOCATE_SOURCE_CLOSE_FAILED` receipt without `routeCreated:true` and its exact
route/destination fields must be rejected as `LOCUS_LOCATE_EFFECT_UNKNOWN` before
the result renderer runs.

Also run `node --check background.js`, `node --check popup.js`,
`node --check scripts/popup-locate-contract-test.js`,
`node scripts/background-contract-test.js`, `node scripts/quality-gates.js`, and
`git diff --check`. These checks are production-extracted/static evidence, not
installed MV3 message lifetime, real route/remove/notification timing, rendered or
native-assistive-technology output, representative-user approval, or release.

## Focused popup-Locate unavailable-destination view contract (2026-08-13)

Run `node scripts/popup-locate-contract-test.js`. Accepted persistence followed by
`LOCUS_LOCATE_TARGET_UNAVAILABLE` must retain the saved item, source, and popup;
dispatch exactly one persistence request and one effect request; render no
pre-write Space/Group path; show the existing `quickCaptureReceiptUnavailable`
message; and retain generic Open Locus recovery with primary focus. It must not
retry the accepted mutation or effect.

Also run `node --check popup.js`,
`node --check scripts/popup-locate-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed MV3 message ordering, real
storage/effect timing, rendered/native-assistive-technology output,
representative-user approval, or release.

## Focused Board local-record identity contract (2026-08-13)

Run `node scripts/onboarding-contract-test.js`. Through the production
`createBoardLocalRecord()` caller, force generated IDs already used by active,
Archive, and Trash records before one fresh value. Both Note and To-do must use the
fresh ID, insert and persist one exact object once, resolve its accepted receipt,
and open Details for that same ID without recovery. Raw colliding IDs must never
reach snapshot, graph mutation, persistence, or Details.

Also run `node --check newtab.js`,
`node --check scripts/onboarding-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed persistence, rendered Board/
palette/Details behavior, native-assistive-technology output, representative-user
approval, or release.

## Focused first-use organization identity contract (2026-08-13)

Run `node scripts/state-sync-contract-test.js`. Through the production-extracted
`ensureDefault()` constructor, make generated values collide first with retained
payload/envelope identities and then with an ID already accepted during the same
default batch. Pinned, Inbox, Later, and My Workspace must receive four exact unique
fresh IDs; `activeWsId` and `activeCatId` must point to their exact defaults.

Also run `node --check newtab.js`,
`node --check scripts/state-sync-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not an installed clean-profile first run,
real first Save/Find/Reopen behavior, native-assistive-technology output,
representative-user approval, or release.

## Focused Group Open-all availability contract (2026-08-13)

Run `node scripts/saved-page-reopen-contract-test.js`. An empty Inbox and a Group
with only local or unsafe legacy records must not offer a usable Open-all action.
One reopenable HTTPS page nested in a Stack must enable the action and flow through
the existing exact bulk Reopen coordinator; unsafe siblings remain skipped.

Also run `node --check newtab.js`,
`node --check scripts/saved-page-reopen-contract-test.js`,
`node scripts/onboarding-contract-test.js`, `node scripts/quality-gates.js`, and
`git diff --check`. These checks are production-extracted/static evidence, not
installed rendering, keyboard/screen-reader behavior, real Chrome effects,
representative-user approval, or release.

## Focused Group Save-here unsaved fallback contract (2026-08-13)

Run `node scripts/onboarding-contract-test.js`. In the production-extracted
`addSidebarOrActiveTabToGroup()` no-selection path, return a newer eligible page
already stored in the exact Group and an older eligible unsaved page. The older
page must be the only source entering one commit; the newer duplicate must produce
no record or cleanup target.

Also run `node --check newtab.js`,
`node --check scripts/onboarding-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed Chrome `lastAccessed` ordering,
real storage/tab effects, rendered feedback, representative-user approval, or
release.

## Focused nested capture-deduplication contract (2026-08-13)

Run `node scripts/onboarding-contract-test.js`,
`node scripts/popup-locate-contract-test.js`, and
`node scripts/background-contract-test.js`. Each production-extracted runtime must
reject a same-URL page already inside a nested Stack in the exact destination
without writing it again. The new-tab case must also retain a distinct candidate
and accept the nested URL when deduplication is disabled; popup Hibernate and
background continuation must retain their existing result contracts.

Also run focused syntax checks for `newtab.js`, `popup.js`, `background.js`, and
the three contract files, then `node scripts/quality-gates.js` and
`git diff --check`. These checks are deterministic/static evidence, not installed
native drag, popup/MV3 storage and tab timing, rendered feedback,
representative-user approval, or release.

## Focused top-bar and Palette duplicate-fallback contract (2026-08-13)

Run `node scripts/onboarding-contract-test.js`. In the production-extracted top-
bar and Palette callers, return a newer eligible page already stored in the exact
active Inbox plus an older eligible unsaved page. Top-bar review and Palette Save
must choose only the older page; no capture may be dispatched merely by opening
the top-bar review menu, and the Palette must retain `destinationReceipt: true`.

Also run `node --check newtab.js`,
`node --check scripts/onboarding-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed Chrome `lastAccessed`
ordering, real storage/tab effects, rendered feedback, representative-user
approval, or release.

## Focused Welcome duplicate-fallback contract (2026-08-13)

Run `node scripts/onboarding-contract-test.js`. In the production-extracted
Welcome harness, pre-populate the exact active Inbox with the newest eligible
browser URL and provide an older eligible unsaved page. Welcome must display and
save only the older page, fresh-read that exact displayed source once, request the
existing guarded close, and retain destination-truth return authority.

Also run `node --check newtab.js`,
`node --check scripts/onboarding-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed Chrome `lastAccessed`
ordering, real storage/tab effects, rendered feedback, representative-user
approval, or release.

## Focused Search nested-destination contract (2026-08-13)

Run `node scripts/search-recovery-contract-test.js`. Build an exact Search recovery
row under two parent Stacks and require the visible location to include Workspace,
Space, localized Group, outer Stack, and inner Stack in order. The shared path HTML
must retain `aria-current="location"` on the innermost destination.

Also run `node --check newtab.js`,
`node --check scripts/search-recovery-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed rendering, screen-reader
output, representative-user approval, or release.

## Focused nested capture-destination reveal contract (2026-08-13)

Run `node scripts/onboarding-contract-test.js`. Build an exact capture receipt for
a saved page inside an inner Stack whose outer and inner Stacks are both collapsed.
After Open destination routes and revalidates, the production controller must add
the transient reveal to outer then inner Stack before focusing the leaf. Stored
collapse flags must remain false, and a duplicated full path must still fail
closed.

Also run `node --check newtab.js`,
`node --check scripts/onboarding-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed Board/List rendering, focus or
screen-reader behavior, representative-user approval, or release.

## Focused selection Open eligibility contract (2026-08-13)

Run `node scripts/saved-page-reopen-contract-test.js`. Execute the production
selection-toolbar renderer with one selected `javascript:` page and require a
disabled, assistive-technology-readable Open control. Repeat with that page plus
one HTTPS page and require Open to remain enabled for the bulk coordinator's
recoverable partial path.

Also run `node scripts/selection-docket-contract-test.js`, `node --check newtab.js`,
`node --check scripts/saved-page-reopen-contract-test.js`,
`node scripts/quality-gates.js`, and `git diff --check`. These checks are
production-extracted/static evidence, not installed DOM/AT, real Chrome effects,
representative-user approval, or release.

## Installed-extension release pass

Before any beta or release claim, load the exact candidate unpacked and record the
artifact/commit, browser version, profile, viewport, console/CSP output, network
log, and result for every P0 core flow. Include new-tab, popup, context menu,
shortcut, save-before-close failure, undo, reload/back/deep links, import replace
and merge, concurrent new-tab/popup/background writes, service-worker restart
during and between state-write messages, overlapping capture and ordinary-edit
interleavings, ask-every-time-off quick-capture result/Open/explicit-Close recovery,
whole-window partial-close receipt and Open-destination recovery,
reminder reconciliation, local favicons, and export recovery. The
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
