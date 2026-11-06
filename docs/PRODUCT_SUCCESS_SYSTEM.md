# Locus Product Success System

| Field | Value |
|---|---|
| Status | **Canonical product strategy and evidence gate** |
| Strategy version | 1.0 |
| Effective date | 2026-07-15 |
| Product owner | I-Kai Huang |
| Market evidence reviewed | 2026-07-15; refresh by 2026-10-15 |
| Review cadence | Weekly before public launch; monthly after launch; market refresh quarterly |
| Scope | Product thesis, target user, claims, success measures, launch gates, and roadmap decisions |

> **There is no guarantee of product success.** This system is designed to make failure
> visible early, prevent avoidable harm, and require evidence before Locus expands its
> claims, audience, or feature surface. A shipped feature is not proof of user value; a
> passing test is not proof of retention; a release is not proof of either.

This document supersedes product-thesis, market-priority, claims, success-metric, and
roadmap guidance in older planning and marketing documents. It does not replace code
invariants, architecture facts, legal advice, Chrome Web Store policy, or test evidence.

## 1. Outcome and strategic thesis

### 1.1 Intended outcome

Locus should become the most trusted way for a narrowly chosen user to save browser
context, close the live tabs, and recover that context later on one desktop browser
profile. The first proof point is not feature breadth or revenue. It is a retained beta
cohort that repeatedly completes the save-and-recover loop without data loss, coaching,
or an account.

The business outcome remains an owner decision. Until the license and business model are
resolved, Locus is a **noncommercial research alpha**, not a general-market free tier or
commercial product.

### 1.2 Product thesis

For privacy-conscious, single-profile desktop Chromium users who keep many tabs open
because closing them feels like losing unfinished work, Locus turns an **explicitly saved**
tab or window into a local, searchable workspace and reopens pages only when requested,
without an account or host permissions.

The wedge is the combination of:

1. explicit capture with a visible destination;
2. recovery of the saved context, not merely storage of URLs;
3. local control with no account, no Locus application backend, and no host permissions;
4. mixed local context—links, notes, tasks, and reminders—only where it supports recovery;
5. exportability and honest disclosure of local-storage limits.

The wedge is **not** seven layouts, themes, trackers, a generic dashboard, or the word
“local-first.” Those can improve the product after the core loop works, but they are not a
defensible reason to adopt it.

### 1.3 The core loop

```text
CAPTURE                 LOCATE                  RECOVER                 TRUST / RETURN
Explicitly save  ->  See exactly where  ->  Find it after leaving  ->  It survived, opens,
a tab or window      the saved item went     the surface or reload     and can be exported
```

A successful loop requires all of the following:

1. The user knowingly invokes Save. Unsaved tabs are not protected.
2. Locus durably persists the saved record before it closes any source tab.
3. The UI shows the real destination and the newly saved item.
4. The user can navigate away or reload, then find the item without coaching.
5. Reopening the item loads the destination directly or through the configured local
   placeholder.
6. Failure is visible and leaves the original tab open.

**Owner return decision (2026-08-09):** the primary reason to reopen Locus is
**Resume saved work**. Home should lead with the newest saved page eligible for the
guarded Reopen path, then show capture, Inbox review, and Spaces. If no page is
eligible, it retains the newest saved-item fallback; mixed local context remains
supporting material rather than disappearing.

**Activation definition:** in the first session, a representative new user saves one real
tab, identifies its destination, navigates away or reloads, and recovers the saved item.

Hibernation terminology must remain precise:

- A **saved link record** is data, not an open tab, and has negligible incremental memory.
- A **suspended placeholder tab** is still an open extension tab and is not zero-memory.
- A **live destination tab** loads the website and bears the website's memory cost.
- No percentage or megabyte claim is allowed until the benchmark in section 9 passes.

## 2. Initial customer profile

### 2.1 Chosen initial ICP

The initial research and beta customer is a person who:

- uses Chrome or Edge on desktop, primarily in one browser profile on one device;
- regularly reaches roughly 30 or more open tabs across unfinished projects;
- deliberately saves sessions or bookmarks because browser tabs act as working memory;
- values no account, no host permissions, local storage, and manual export;
- works or studies independently rather than through a shared team workspace;
- accepts explicit capture instead of expecting invisible automatic session recovery;
- is willing, during beta, to install an unpacked build, keep backups, and provide
  consented research feedback.

Until the license changes, recruitment must be limited to uses the current Locus Research
and Contribution License permits. A developer using Locus for an employer or client is not
in the legally permitted initial cohort.

### 2.2 Job to be done

> When my browser is full of unfinished work, help me deliberately put that context
> somewhere trustworthy so I can close the live tabs and recover the right page and my
> reason for saving it later.

### 2.3 Excluded users and use cases for the initial product

Locus is not initially for:

- teams, shared workspaces, real-time collaboration, or account administration;
- users whose primary need is multi-device sync or automatic cloud backup;
- users who expect crash recovery for tabs they never explicitly saved;
- mobile, Safari, Firefox, or cross-browser parity;
- rich webpage/PDF scraping, screenshot archives, AI summarization, or semantic indexing;
- a generic habits, finance, fitness, hydration, or subscription dashboard;
- corporate or client work while the current noncommercial license forbids it;
- users who require a “forever” storage guarantee without maintaining an export;
- users who need page previews that require host permissions or automatic page reading.

An excluded user is not a failed conversion. It is a user for whom the current product is
not the right promise.

## 3. Product state language

Every substantial capability must be tracked with four independent fields. Do not collapse
them into a single “Done” label.

| Field | Meaning | Required evidence |
|---|---|---|
| **Implemented** | Code exists in a named commit or working tree. | Commit/file anchors and a build that loads. |
| **Verified** | The acceptance contract passed against that exact commit. | Automated results plus recorded runtime evidence and limitations. |
| **User-validated** | Representative ICP users met a predefined outcome threshold. | Research protocol, sample, raw observations, analysis, and decision. |
| **Released** | A specific artifact was distributed through a named channel. | Version, artifact hash, channel URL, release date, and rollback plan. |

These fields are independent. A feature can be Released without being user-validated, and
that fact must remain visible. “Implemented” never implies “verified.” A repository version
number never implies Chrome Web Store publication.

Use these values in status tables: `yes`, `no`, `partial`, or `unknown`. “Unknown” is not a
passing state.

### 3.1 Current-state truth in the present worktree

| Capability | Implemented | Verified | User-validated | Released | Current truth |
|---|---:|---:|---:|---:|---|
| New-tab replacement and local workspace | yes | partial | no evidence | repository v3.1.0 only | Broad surface exists; public Store release is not evidenced. |
| Save current tab / save window | yes | partial | no evidence | no public release evidenced | The service worker owns the only whole-state write and serializes new-tab, popup, and background candidates through one FIFO with revision receipts; its optional Web Lock is defense-in-depth. Page queues send immutable call-time candidates and invalidate already-queued candidates after an earlier failure; popup and new-tab capture mutexes reject modeled overlaps before a second source effect. New-tab now keeps a confirmed-state baseline: a clean current-schema boot does not write, a clean idle page adopts a strictly newer stored revision, and a dirty page never auto-rebases or auto-replaces its whole graph. Unsafe active capture/Undo/import reconciliation blocks behind a localized inert reload overlay; in-flight ordinary conflicts, failed capture with a later edit, and failed Redo also retain the local graph rather than replacing it silently. Deterministic capture failure drains invalidated successors and leaves source tabs open after set failure, conflict, or an accepted write whose receipt is lost or times out. With no later mutation it re-reads authoritative `te`; otherwise the later graph remains visible until explicit recovery. The highest remembered event beats a stale recovery read, delayed self-events are distinguished from rollback, and malformed client/stored revision tokens are rejected before writing. Production-extracted client-queue, capture-flow, freshness, Undo, deterministic writer, and 10,000-schedule lockless contracts pass. Whole-window popup capture now waits for a valid ordinary state receipt before dispatching its separately serialized worker-owned completion. Ask-every-time-off quick capture now leaves its source open after an accepted receipt and delegates explicit exact-item Open/Close actions to the service worker; rejected or unknown state dispatches no quick browser effect. The expanded production-extracted popup-Locate matrix passes fresh exact-Group and exact-item resolution, recursive saved-URL membership, URL-safe source-window/active/navigation validation, no page-owned removal, truthful protected/unconfirmed outcomes, exact destination recovery, LIFO focus, and locale parity. Background context-menu/shortcut captures now confirm one privacy-aware native receipt after accepted persistence, then re-enter the writer FIFO/Web Lock to fresh-confirm the exact accepted Workspace/Space/Group/direct-item authority through source cleanup; whole-window results retain transient source-to-item IDs so missing sources stay open while exact siblings may close. Its bounded accepted-time destination and truthful source result can continue through a restart-safe locator to one freshly resolved item/Group, while malformed or stale locators fall back to local Home. Injected notification, authority-read, badge, close, and continuation failures repeat no accepted effect and emit no false not-saved warning. New-tab Save all and existing-Group capture re-resolve exact destination authority across browser reads. Single, selected, and Space-drop Inbox saves allocate retained-safe IDs and carry exact new-item receipt authority through persistence, cleanup, and recovery. Installed multi-context event/receipt ordering, unknown-ack lifecycle behavior, service-worker termination/restart, native notification rendering/click delivery, quota, real tab effects, and browser-side recovery UI evidence remain open. |
| Save-and-find first-session loop | partial | partial | no | no | A single-task save-first welcome, explicit and truthful close consequence, direct Inbox handoff, and action-scoped closed-tab Undo are implemented. Home is now the active-Workspace recovery desk: its Locus Trail replaces the scenic hero with the newest real saved item, exact Workspace › Space › Group path, safe Review/Open controls, the next supported and nonduplicate current-window candidate, and the exact active-Space Inbox destination. One primary Save follows the remembered close preference; one explicit adjacent inverse keeps the consequence visible without changing that preference. Fast context-menu and shortcut saves now expose a quiet, privacy-aware native See-destination receipt with an exact saved-item/Group continuation instead of only a transient badge. Find again now makes Search a focused recovery surface: optional filters default closed, every selected result exposes its exact destination, and settled-query Enter/result Enter/double-click/Open re-resolve one exact current item through the production uniqueness/fingerprint boundary and shared URL-safe opener. More than 100 matches remain deliberately reachable through quiet 100-row continuation; the URL-backed window survives reload/Back/Forward and Details, while changed search meaning resets it. Stale or ambiguous targets preserve Search and focus; non-tabs and unsupported legacy addresses use an exact Search-owned detail route. Close and Back retain the full query, filters, sort, selection, visible window, and rebuilt-row focus without selecting or persisting another Space; removed or filtered-out detail targets clear selection, sheet target, and URL together. Real newest-Inbox and recent-Space preview rows remain native recovery controls after the Trail: they re-resolve one current saved item, open the shared sheet on `/home?item=<id>` without selecting/rendering its Space or writing ephemeral route state, fail closed on ambiguous/stale identity, and restore rebuilt Home-row focus. Undo stays unavailable while capture effects are pending, pauses without overwriting a newer edit, and reuses tabs already reopened on retry. Direct title, URL, task state/text, saved-context, cover, tags, checklist, custom fields, and item-detail reminder Set/Change/quick/Clear now use exact-target receipt gates with pending/live feedback and fail-closed recovery. Reminder state is acknowledged before the service worker reconciles alarms and returns one combined result; only then may the picker close or report success/warning. Stack identity and Archive remain separate flows. Single-page and Group/selection Open now converge on exact-item recovery: normal Open reuses an exact live page or Locus placeholder before creating once; bulk Open freezes each identity, reuses before inactive create, settles sequentially, and stops after a failed profile read or unknown effect. Same-URL activations serialize without sharing authority across different saves, explicit new-tab copy remains explicit, and stale or uncertain effects fail closed with focus-preserving or persistent inline recovery. Deterministic production-controller/helper contracts pass; installed runtime/history/storage/alarm/recovery, broader accessibility, native notification/screen-reader behavior, rendered Home/Search/bulk-result pixels, and representative-user evidence remain open. |
| Local placeholder reopening | yes | partial | no | no public release evidenced | Single and bulk Reopen recognize and reuse this extension's exact packaged placeholder, or create one inactive placeholder for a new background request when Hibernate is enabled. Exact target, pending navigation, per-item same-URL serialization, sequential bulk accounting, and failure receipts have deterministic production-extracted coverage. Installed activation/navigation and memory benefit remain unverified. |
| No host permissions | yes | manifest-inspected plus negative regression probes | no | no public release evidenced | The release gate requires exactly the seven disclosed API permissions and rejects required/optional hosts, optional APIs, manifest content scripts, and external messaging. Installed prompts, network audit, and Store review remain open. |
| No unprompted external requests | remediation implemented in current worktree | static source gate only | not applicable | no | Release preflight rejects direct request APIs and remote extension HTML/CSS resources while preserving explicit user navigation and local favicons. An installed network audit is still required before the claim is allowed. |
| Export/import | partial | partial | no | no public release evidenced | Recursive guards, full-graph merge rekeying, idless archive preservation, old-Trash grace, active-route normalization, and a pre-replace download are implemented. Deterministic every-level collision fixtures pass. The production validator accepts a valid graph without mutation and rejects 33 malformed boundaries plus 128 fixed-seed structural mutations; current-schema category/group reminder IDs must be present and unique, while older merge payloads are repaired on a clone. A production-extracted 1,488,149-byte current-schema contract serializes 1,024 top-level active records (1,536 counted items), 1,024 Archive, and 1,024 Trash records through replace and merge. A numeric-schema matrix carries schemas 0–13, all six accepted app envelopes, and raw legacy through 30 replace/merge cases, including active and Trash reminder-ID migration plus the schema-13 Welcome opt-in default. A `0x51a7e5` valid-semantic corpus adds 128 current-schema graphs, 5,013 entities, and 256 mode cases with enforced coverage of data shapes, item/stored-entry kinds, URL families, metadata, selections, references, layouts, settings, and emoji. Exact-byte cases accept a valid 20,971,520-byte file to preview, reject the same valid JSON plus one byte before FileReader, and roll both modes back for a 10,551,296-byte file after injected quota rejection. Exact counts and semantic content survive; six current/raw/generated and two quota-sized rejected writes roll back without changing authoritative storage. Actual Chrome File/FileReader and preview behavior, real quota allocation, DOM-backed sanitization, alarm outcomes, and installed-browser legacy/current round trips remain open. |
| Archive and Trash | yes | partial | no | no public release evidenced | The known 200-entry caps are removed. Active saved items now expose Archive as their only removal path; permanent deletion is reserved for Trash and uses one localized alert dialog. It persists through the central writer before showing success, clears Undo/Redo only after acknowledgement, and leaves rejected writes to fail-closed recovery without a false toast/render. A production-controller contract covers single/batch scope, stale entries, cancel, pending/failure/success, focus, Tab, Escape, locale copy, and absence of the active-item bypass. A production-extracted scale contract preserves 1,024 mixed records through single-item, whole-group, and batch archive paths, then restores canonical-equivalent workspace graphs; the batch path also passes Archive → Trash → restore with exact ID preservation. Injected quota rejections join those production mutations to the page State writer and error router: local data remains visible behind recovery, authoritative storage stays unchanged, and a reload-style read restores every ID. The paired background contract returns a typed quota failure and notification without changing the stored graph. Current-schema serialization also preserves 1,024 Archive and 1,024 Trash entries through deterministic replace and merge. Real Chrome quota allocation, installed confirmation/recovery rendering, screen-reader behavior, representative-user trust, downloads/previews, and browser round trips remain open. |
| Reminders and Calendar | yes | partial | no | no public release evidenced | Schema 12 stable identities, service-worker reconciliation, local-calendar recurrence, callback/Promise-settled delivery persistence, Past Due projection, and structured state-plus-alarm receipts are implemented. Item-detail and non-detail item Set/Change/quick/Clear/reschedule, Group/Space add/edit/reschedule/removal, and Calendar Add-task each use frozen exact-target controllers: one localized snapshot and one combined receipt own close, render, focus, warning/success, and Undo; rejected or unknown writes produce no optimistic UI or page-owned alarm retry. Production-extracted identity, ordering, failure, interlock, recurrence, and focus contracts pass across four deterministic time zones. Current-source English/light 1280×720 and native zh-TW/Locus Dark 800×720 evidence covers the reminder dialogs, Calendar shell, accepted/reload, delayed Escape/Back blocking, rejected recovery, exact focus, and clean DOM/log audits. Item and Group/Space delivery now awaits the shared settle-once native receipt before changing reminder authority. Callback-only item pending/error/success and recurring Group success prove zero pre-callback writes/reconciliation, unchanged authority on error, and one write before reconciliation on success. This is API acknowledgement evidence, not proof that the operating system displayed the notification. Installed state-write/alarm/message/service-worker lifetime, restart/sleep, notification and delivery behavior, native drag, rendered Past Due behavior, cross-window behavior, transition timing, live operating-system time-zone changes, screen-reader/zoom/forced-colors, representative-user, and release evidence remain open. |
| Seven Space layouts | yes | fidelity varies | no | no public release evidenced | Advanced capability; not part of the adoption thesis. |
| Built-in personal trackers | yes | partial | no | no public release evidenced | Store single-purpose and product-focus risk; excluded from the initial Store candidate by owner decision O-04. Preserve existing data and secondary research-build access. |
| Simplified one-task onboarding and shell | partial | partial | no | no | The save-first welcome, explicit Save picker, exact Inbox handoff, durable Home/Library recovery routes, collapsed opened-tabs rail, progressive layouts, and localized popup continuations are implemented. Home previews open the shared route-backed detail sheet without mutating durable route state; Find-again Search removes dashboard decoration and quick mutation in favor of one query, exact destination context, URL-safe Open, Search-owned Details with coherent Close/Back recovery, and a deliberate URL-backed continuation when results exceed 100; popup single-tab, quick-capture, and whole-window results retain truthful exact destinations and explicit worker-owned recovery actions. Landing, Library/Read Later, Home Trail, shared Board/Group layouts, Search, Details, Explorer, Graph, and drop-to-open share one exact single-page Reopen boundary; Group/selection Open extends it with frozen exact contexts, sequential background reuse/create, unknown-effect stopping, focusable visible progress, complete English/native zh-TW counts, and persistent inline recovery. Workspace/Space create, rename, empty-only removal, existing-Space Group move, Group/Stack identity, Duplicate Group, Paste links, direct item-detail fields, all reminder mutation families, Calendar Add-task, popup/bookmark-generated Groups, and the shared rich-text Link dialog use scoped exact-target or exact-selection controllers with fail-closed recovery and precise focus/Undo ownership. Import review/diagnostics and Explorer now present localized Workspace/Space/Group language while preserving the durable `categories` schema. Background context-menu and shortcut capture uniquely resolves the complete configured destination, allocates retained-safe IDs, makes one guarded write, fresh-checks every tab before cleanup, and then attempts one quiet privacy-aware See-destination receipt with an exact stable-ID continuation. Populated organization deletion remains recovery-first and Group removal remains Archive-only. A separately backed-up legacy direct-move hint migration requires owner approval; installed keyboard/screen-reader/theme/locale/viewport and notification behavior, formative usability, and representative-user validation remain open. |

The alternate clock/search Welcome layer is
locally Available but schema-13/runtime inactive unless `showLanding` is explicitly
true; the save-first guide remains core.

This table is a present-worktree snapshot, not a changelog. `.claude/docs/STATUS.md` must keep the commit-level
implementation/evidence state current.

Launch Find-again evidence update (2026-08-09): the established-user launch field
now keeps unselected Enter inside Locus. It dismisses the launch layer and carries
the trimmed query into the existing URL-backed active-Workspace Search surface;
selected saved-page suggestions retain guarded Open. English/native zh-TW copy
names saved-content search, and the old `chrome.search` fallback plus manifest
`search` permission are removed. The production-extracted form contract passes
route, reset, focus, zero-web-call, locale, and permission boundaries. **Implemented:
yes; Verified: partial (static and production-extracted deterministic evidence);
User-validated: no; Released: no.** Installed routing/history, rendered behavior,
Store permission presentation, representative-user usefulness, and release remain
open.

In the Reopen rows, “serializes” means same-document coalescing plus modeled
cross-document ordering when the Web Locks API is available and the first effect
is acknowledged. Installed behavior without that API or after an unknown first
receipt remains open evidence, not a passing claim.

Reopen handoff evidence update (2026-08-03): individual creation no longer treats
an integer tab ID as sufficient success. Locus fresh-reads the returned tab and
requires the same integer tab/window identity, requested active disposition, and
exact requested live or Hibernate representation. Foreground reuse now performs
the same final exact active-tab check after activation and window focus. Exact
pending navigation can confirm the destination; wrong URLs, conflicting pending
navigation, changed identity, wrong active state/representation, and rejected
final reads remain unconfirmed and are never retried. The production-extracted
contract includes unknown-effect queue/bulk stopping and passes the complete local
deterministic gate with clean diff/whitespace checks. **Implemented: yes; Verified:
partial (static and mocked-
browser production-extracted evidence); User-validated: no; Released: no.** Real
installed Chrome/Edge timing, tab/window/Web Lock effects, rendered/accessibility
behavior, representative-user recovery, and release evidence remain open.

New-tab capture eligibility evidence update (2026-08-03): the capture side now
uses the same `http:` / `https:` / `ftp:` / `file:` allowlist as Reopen before
history, graph mutation, persistence, or source cleanup. This applies to Welcome,
Home Trail, direct and selected Inbox/Group actions, active Group add, Save all,
palette Save, Space drops, Group insertion, and Board/List Stack drops.

New-tab Save-all/existing-Group authority update (2026-08-12): both production
callers freeze exact destination authority before their browser read and re-resolve
it afterward. After inserting the new saved items, they now also freeze the exact
Workspace/Space/Group/list/item receipt and pass its resolver through the one
acknowledged `commitCapturedTabs()` call. Clean graph adoption, renamed/replaced/
duplicated identity, read or allocation failure, recovery, overlap, and post-write
destination drift cannot authorize a stale source close or path success. The first
caller-level run failed on a missing `validateDestination`; green production-
extracted execution plus the 10,000-schedule matrix is deterministic evidence only.
Installed MV3 storage/tab ordering, real source removal, and service-worker lifetime
remain open under P0-04/P0-05.

Resolution (2026-08-13): later production changes supersede the intermediate
correction above. `saveAllTabs()` and `addSidebarOrActiveTabToGroup()` now freeze and
re-resolve their exact active Workspace/Space/Group authorities across
`chrome.tabs.query()`, freeze exact saved-item receipts after mutation, and pass
those resolvers through the acknowledged commit. The permanent caller contracts
cover clean adoption, renamed/replaced/duplicated targets, post-write drift, and
source protection. Installed MV3 timing and real source effects remain open evidence.

New-tab Inbox receipt update (2026-08-13): single, selected, and Space-drop Inbox
saves now allocate every new page against all retained graph IDs, freeze the exact
new-item set plus its reviewed Workspace/Space/Inbox/list/path, and require that
receipt through acknowledged persistence and every source effect. Opened-tab,
selected, palette, and Space-drop entry points reuse the existing Open-destination
receipt; Home, Welcome, and top-bar retain their dedicated recovery handoffs. The
focused production caller first failed on missing exact item authority and now
passes alongside state-sync, quality, and 10,000 fixed-seed concurrency schedules.
Installed MV3 ordering, the final read-to-remove race, rendered/assistive-technology
behavior, representative-user validation, and release remain open.

Existing-Group retained-ID update (2026-08-13): both selected and active-tab
branches now allocate every new page through the complete graph-wide retained-ID
set before history or mutation. The focused production caller forces the raw
generator to collide with a retained ID, skips it, creates two unique records, and
keeps the existing one-write exact-receipt/drift boundary. Caller structure also
forbids raw `uid()` in either branch. Syntax, onboarding/Home Trail, quality, and
10,000 fixed-seed concurrency schedules pass. Installed MV3 ID/storage/tab timing,
rendered/assistive-technology behavior, representative-user validation, and
release remain open.

Save-all complete-source update (2026-08-13): after persisting its exact supported
page set, `saveAllTabs()` now passes that same complete set to the existing guarded
cleanup boundary. The focused mixed-window caller first proved that four eligible
pages yielded only three cleanup candidates; it now proves HTTP, HTTPS, FTP, and
file sources all enter one guarded commit while data, blob, and JavaScript sources
remain excluded. Exact receipt, destination drift, source revalidation, count, and
preference behavior remain unchanged. Syntax, onboarding/Home Trail, quality, and
10,000 fixed-seed concurrency schedules pass. Installed Chrome query/removal
timing, final read-to-remove behavior, representative-user validation, and release
remain open.

Single-page Restore fallback-ID update (2026-08-13): when a reviewed archived page
needs a new Inbox because its original Group is unavailable, the commit now
allocates that Inbox against every active, archived, trashed, restore-hint, layout,
and capture-preference ID. The focused production case forces the first raw value
to equal the archived Group hint and proves the allocator skips it while preserving
the exact page object, visible destination, and one acknowledged write. The Library
recovery ledger, 1,024-record Archive scale, and quality gates pass. Installed
storage, rendered focus/assistive technology, representative-user trust, and
release remain open.

Cross-Space Inbox-drop update (2026-08-13): dragging an eligible Opened Tabs source
onto another uniquely resolved Space in the active Workspace can now freeze that
exact inactive Space/Inbox/list receipt. Default list-context creation remains
active-Space-only and the explicit exception refuses foreign Workspaces. The
focused production helper first returned no target and now proves the narrow
opt-in, while state-sync, quality, and 10,000 fixed-seed concurrency schedules pass.
Installed native drag/drop, real storage/tab timing, rendered focus/assistive
technology, representative-user validation, and release remain open.

Space-drop metadata-policy update (2026-08-13): accepted cross-Space drag records
now derive title/domain fallback and optional favicon through the same
`captureTabFields()` policy as every adjacent new-tab Save. The focused production
caller injects a private raw title and data icon, then proves only the configured
domain title and omitted favicon reach the one accepted record, commit, and exact
receipt. Syntax, onboarding/Home Trail, quality, and diff gates pass. Installed
native drag, preference/storage timing, rendered Search/receipt behavior,
representative-user validation, and release remain open.

Workspace-extras opt-in evidence update (2026-08-13): schema 13 aligns the optional
clock/search Welcome layer with the Plugins hierarchy. Fresh state, General's
compatible fallback, boot, and the layer entry point now keep it inactive unless
`showLanding` is exactly true. Migration preserves valid explicit booleans and
normalizes only absent or malformed schema-0–12 bytes to false; the separate
save-first guide remains core. English and independently authored native zh-TW say
the packaged feature is local and off by default. Schemas 0–13 pass six accepted
envelopes plus raw legacy through 30 replace/merge cases; all 42 JavaScript syntax
checks and all 33 runner commands pass, including 10,000 concurrency schedules.
**Implemented: yes; Verified: partial (source and production-extracted deterministic
evidence); User-validated: no; Released: no.** Installed migration/reload
persistence, rendered pixels, native assistive technology, representative-user
comprehension, and release remain open.

Core visual-system evidence update (2026-08-12): Locus no longer forces Lora across
the save → locate → recover loop when the user selected another font. The eight
existing choices now live in the shared theme layer; readable new-tab/popup headings
and controls inherit the selected face, Geist Mono stays limited to exact filing
metadata, and popup applies the persisted value with a safe DM Sans fallback. The
first-red visual contract failed on the absent shared mapping. Fresh current-source
shell/error-state evidence covers 1280×720, 800×720, 420×590, and 420×520 with no
horizontal overflow and visible keyboard focus. This is partial source/rendered
verification only: direct HTTP lacks extension storage, and installed populated
states, preference persistence, assistive-technology/forced-color output,
representative-user approval, and release remain open under P0-12.

Home responsive-hierarchy evidence update (2026-08-12): the populated Locus Trail
uses an intermediate two-row route from 761 through 1100 px. At 900 px and below,
the visible Space registry resolves to 188 px and Home fills the remaining work
area; 760 px and below retains the safe vertical stack. A bounded 310 px Save-
consequence lane prevents exact helper copy from collapsing the candidate while
keeping both existing controls intact. The DOM, focus order, accessible names,
copy, capture/recovery controllers, storage, preferences, and wide/stacked behavior
are otherwise unchanged. A current-source reference using production CSS, exact
Trail markup, and runtime labels keeps Inbox inside a 720 px viewport at 1100, 901,
800, and 761 px without horizontal overflow; 1280 px remains one row. English/light
and native zh-TW/Locus Dark 800 px references keep the registry, route, and Inbox
visible. This is partial presentation evidence, not an installed populated-state or
user-validation pass. P0-12 remains open for installed theme/locale, keyboard/
screen-reader, zoom/forced-color, activation, and representative-user evidence.

The UI keeps every non-internal open tab visible because switching and explicit
Close remain useful even when Save is not. Unsupported rows expose no Save or drag
authority, their favicon cannot initiate a native child drag, and their cursor no
longer promises grabbing. Mixed selections count and save only recoverable pages,
retain unsupported rows, and restore a visible retained checkbox or the rail
filter/toggle after repaint; a delayed tab refresh preserves that exact checkbox
focus. Stack hover is presentation-only until an eligible drop owns a snapshot, so
an unsupported drop cannot change durable expansion state. No new surface, copy,
schema, migration, permission, host access, network, telemetry, or privacy behavior
was introduced.

Production-extracted red/green contracts cover unsafe-only and mixed candidates,
all four accepted protocols, direct/window/selected/palette/Group/drop paths,
child-drag disclosure order, Stack mutation order, filtered focus, and the delayed
refresh race. The complete 36-file syntax and 27-command deterministic gate passes
with clean `git diff --check`. **Implemented: yes; Verified: partial (static and
production-extracted deterministic mocked-browser evidence); User-validated: no;
Released: no.** Installed native drag, real close/reopen effects, rendered and
assistive-technology behavior, representative-user usefulness, and release remain
open.

New-tab drag source-authority evidence update (2026-08-04): single- and multi-tab
drag payloads now preserve immutable tab/window/URL/original-active descriptors.
Every cleanup-enabled drag-drop commit fresh-reads those exact sources before
persistence to replace possibly stale rail-cache active state, then performs the
existing second read after the acknowledged write. Missing or malformed identity,
a moved window, navigation, conflicting pending URL, or an inactive-to-active
transition keeps the affected source open; an unchanged sibling may still close,
and every saved item remains available to Find/Reopen. An active source observed
by the fresh current-window read is protected, and any graph mutation during that
read protects the full cleanup set.

Production-extracted red/green cases cover a cached-active source whose live tab
becomes active before the fresh read settles, plus a two-source drag where one
source moves windows. The accepted graph remains, removal reaches only the
unchanged source, and Undo retains closed-source URL/pinned metadata. Separate
deferred-read cases prove that a preparation-time ordinary edit protects every
source whether the combined write succeeds or fails; failure preserves that edit
behind explicit recovery. **Implemented:
yes; Verified: partial (static and production-extracted deterministic mocked-browser
evidence); User-validated: no; Released: no.** Installed native drag, actual tab
effects, Chrome event ordering, rendered feedback, representative-user usefulness,
and release remain open.

New-tab exact Group/Stack receipt evidence update (2026-08-12): selected-as-Group
and all Board/List Group/Stack single/multi drops now freeze the exact active
Workspace, Space, Group, full Stack ancestry, owner references/names, item-list
owner, newly saved item values, and browser source descriptors. One localized
history entry and accepted write produce a complete destination receipt with
action-scoped Undo and primary **Open destination**; Open fresh-resolves, routes
without another durable write, and focuses the rebuilt Group or deepest Stack.

`commitCapturedTabs()` revalidates destination authority after asynchronous source
refresh and persistence and before and after each final source read. Changed,
moved, replaced, renamed, duplicated, retyped, or value-drifted authority cannot
authorize a later close. Post-acceptance drift keeps the accepted graph and Undo,
switches to an explicit warning, and exposes no unsafe Open action. Production-
extracted cases include drift during refresh and between two source cleanup reads.
The complete 36-file syntax and 27-command deterministic gate passes, including
10,000 concurrency schedules. **Implemented: yes; Verified: partial (static,
production-extracted deterministic behavior, and bounded current-source component
references); User-validated: no; Released: no.** Installed MV3/native drag and tab
effects, real-data pixels, assistive-technology behavior, representative-user
completion, and release remain open.

Home Locus Trail evidence update (2026-08-09): Home now answers the core
recovery question inside the active Workspace before showing Inbox or recent
Spaces. The newest saved page eligible for guarded Reopen takes priority and
connects to its exact Workspace › Space › Group destination and re-resolved
Review/Open actions; when none is eligible, the original newest saved item remains
the lossless fallback. Eligible pages expose primary Open before secondary Details;
fallback records keep one primary Details continuation, and keyboard Save success
returns to Open. The Trail uses one accent across recovery and capture: when a
saved item exists, recovery owns it and both Save consequences stay secondary; on
an empty Home, the preference-driven Save is primary and its inverse remains
secondary. A supported, nonduplicate
current-window candidate then shows the exact active-Space Inbox destination.
If no Space exists, the blocked destination now exposes one primary **Create
space** action through the existing receipt-gated organization dialog; the user no
longer has to discover the sidebar plus before the first Home Save can proceed.
That prerequisite is distinct from an ambiguous duplicate-Inbox review state. The
conflict now offers one exact **Open space** continuation: it re-resolves the same
globally unique active Workspace/Space and enters its board without persistence,
Inbox selection, or repair. Changed or ambiguous identity and route refusal keep
Home and focus with a localized no-effect result.
Home now applies that destination truth to its lower zones too. No-Space Home stops
after the Trail instead of repeating Create space. Inbox review appears only from
the existing exact active-Inbox context; zero or duplicate Inboxes show no invented
preview or Open-Inbox target, while real Spaces remain visible. Activation reuses
the shared fail-closed, non-persisting Inbox navigator.
This real-data Trail replaces the scenic hero. Its recommended Save label follows
`closeTabOnSave`, while one adjacent explicit inverse offers the other close/keep-
open consequence without changing the preference.

The recovery side retains and rechecks the reviewed Workspace, Space, Group,
parent, and item references plus value/location fingerprints. The capture side
  admits only the shared saved-page URL allowlist, rechecks the reviewed Workspace,
  Space, and existing Inbox references plus their visible path names before and
  after the asynchronous browser read, and verifies tab ID, window, URL, and
pending URL before mutation and again before any requested close. It reuses
`saveTabToInbox()` and `commitCapturedTabs()`; only an acknowledged local-storage
  receipt can produce the saved status, locator-line confirmation, repaint, or
  source close. Unsupported URLs, destination changes, duplicate candidates,
  same-ID destination replacement, rename, duplicate Inbox, missing/replaced/moved
  records, navigation, rejected writes, and unknown receipts fail closed. Tab
  refresh may update the rail during capture but cannot repaint optimistic Home
  data before acknowledgement. The Trail stores no derived state and adds no route, permission,
schema, migration, font, or remote asset.

Focused production-extracted and static contracts cover newest ordering and
legacy fallback, active-Workspace isolation, exact reference and URL safety,
candidate deduplication, preference-driven consequences, pre-save and pre-close
identity checks, duplicate-Inbox action emphasis, exact read-only Space review,
conflict-resolved activation, progressive no-Space/zero/exact/duplicate-Inbox
zones, exact Inbox navigation, replacement/ambiguity/refusal recovery, zero graph
writes, receipt ordering, English/native zh-TW parity, keyboard focus,
responsive stacking, reduced motion, forced colors, and the state-aware single-
accent hierarchy. **Implemented: yes; Verified: partial (static and deterministic
production-extracted evidence); User-validated: no; Released: no.** Installed MV3
storage/message/service-worker lifetime, real browser effects, rendered
viewport/theme/locale evidence, screen-reader/zoom/forced-colors behavior,
representative-user completion and retention, and release evidence remain open.

New-tab exact Inbox-capture evidence update (2026-08-09): opened-tab, Welcome,
command-palette, top-bar/Home single-tab, selected-tab, and Space-drop saves now
share one exact destination boundary. It reviews one globally unique active
Workspace/Space and zero or one exact Inbox before history. After the snapshot, it
reuses the exact Inbox or provisions an unchanged absent Inbox through the graph-
wide collision-safe organization allocator. Duplicate, replaced, renamed,
malformed, or ambiguous authority saves and closes nothing, preserves selection,
and performs no repair or first-name fallback. Exact imported IDs are validated
without normalization. The production-extracted runner covers exact reuse, absent
provisioning, duplicate refusal before history/write/source effects, localized
no-save/no-close copy, and convergence of all three mutation functions.
**Implemented: yes; Verified: partial (static and deterministic production-
extracted evidence); User-validated: no; Released: no.** Installed storage/tab
effects, multi-context ordering, rendered copy, assistive technology,
representative-user completion, and release evidence remain open.

New-tab exact destination-receipt evidence update (2026-08-09): ordinary single,
selected, and Space-drop Inbox Saves now finish Save → See destination in the
existing toast. Each freezes the accepted Workspace › Space › Inbox label before
the guarded commit, presents it only after acceptance, distinguishes one/many and
close/keep-open copies, and retains the actual closed/stayed-open/partial result.
Incomplete paths fall back to existing localized copy rather than inventing a
destination. The production-extracted contract covers exact and incomplete paths,
all count/source variants, native zh-TW literals, and accepted-order convergence.
**Implemented: yes; Verified: partial (static and deterministic production-extracted
evidence); User-validated: no; Released: no.** Installed effects, rendered toast/AT
output, representative-user comprehension, approval, and release remain open.

Existing-Group Add / Save evidence update (2026-08-09): the primary Group filing
action now freezes globally unique Workspace/Space/Group runtime authority, exact
stable IDs and names, and item-list ownership. Active-tab capture reports a rejected
browser read and re-resolves after a successful one; changed, replaced, duplicate-ID, malformed, or ambiguous authority
saves and closes nothing. Accepted selected/active capture freezes the localized
Workspace › Space › Group receipt before its single guarded commit, distinguishes
saved copies, and leaves actual source results to the shared suffix. The production-
extracted contract covers exact imported IDs, stale/duplicate authority, zero-effect
refusal, one accepted write, receipt ordering, URL/selection compatibility, and
English/native zh-TW parity. **Implemented: yes; Verified: partial (static and
deterministic production-extracted evidence); User-validated: no; Released: no.**
Installed effects, rendered toast/AT output, representative-user comprehension,
approval, and release remain open. Generated Group/Session and nested drag receipts
remain separate later work.

Find-again Search evidence update (2026-08-02): Search now serves one recovery
job inside the active Workspace: query saved content, confirm its exact Workspace
› Space › Group destination, then Open page or View details. Optional filters
default closed; when panel-owned Space, time, or tag state remains active, the
existing control now shows a compact localized count instead of silently narrowing
results. Query, type, and sort remain excluded because their controls stay visible.
The panel's filter-only reset is disabled at default state, clears type/Space/time/
tag state through the same helper as no-result recovery, and preserves query, sort,
and panel visibility; filter changes still reset the progressive window to 100.
The numbered process, dashboard statistics/tips, gradient badge, and in-row Favorite
mutation are removed. Favorite remains in item detail and Library, where its
consequence and recovery already have an owner.

Settled query Enter, result Enter/double-click, related selection, and Open page
share one production exact-target controller. Every effect requires current
visible-window membership, unchanged Workspace/Space/Group/Stack/item references
and fingerprints, global uniqueness, a settled query session, and the shared URL
allowlist. Query and IME composition changes synchronously inert old results and
remove old actions; captured debounce work cannot render, sync, or focus a newer
Search object. Unsupported/non-tab items use a Search-owned `detail=1` route with
`persist: false`. Close and Back retain every query/filter/sort/selection field and
restore the rebuilt result; removed or filtered-out targets clear selected ID,
detail flag, sheet target, and canonical URL together.

Search starts with a bounded 100-row window. A quiet footer outside the listbox
reports visible progress and reveals up to 100 more, then selects and focuses the
first new result. Valid non-default windows ride the route as `shown`, so reload,
Back/Forward, and Details preserve them; query/filter/sort changes and invalid
values return to 100. The final partial batch remains reachable without infinite
scroll or a durable preference, and a superseded Search session cannot receive a
delayed continuation focus.

Production-extracted contracts execute the real recursive graph matcher, exact
resolver/fingerprints, activation controllers, IME sequence, cross-session
debounce, Router encode/parse/apply, render canonicalization, close/Back, focus
return, mounted ArrowUp/Down/Home/End roving, URL replacement, progressive-window
canonicalization, hidden-before-reveal and exact-after-reveal effects, and signature-
deduped live announcements. The same focused suite extracts the pure panel-owned
filter count and checks localized accessible naming plus duplicate-announcement and
forced-colors boundaries. It also executes the shared filter-active predicate and
exact reset patch, including query/sort preservation, native disabling, and panel/
no-result wiring. Source contracts cover English/native zh-TW parity,
populated-only narrow scrolling, wrapped titles/paths/tags, reduced motion, and
forced-color focus/selected/pressed states. The complete deterministic/static
block passes. The in-app browser connected but policy blocked the local-file URL;
no alternate backend or indirect server was used. **Implemented: yes; Verified:
partial (static and deterministic production-extracted evidence); User-validated:
no; Released: no.** Installed MV3 tab effects, rendered pixels, native screen-
reader/zoom/forced-colors behavior, representative-user recovery, and release
evidence remain open.

Single-page Reopen evidence update (2026-08-02): normal Open now means return to
the exact saved page when it already exists, otherwise open it once. One shared
coordinator covers Landing, Library/Favorites, both Read Later entry points, Home
Trail, Board/Group/Canvas/List/Timeline/Gallery cards and nested Stacks, Search,
item Details, Explorer, Graph, and saved-card drop-to-open. The small card arrow
retains explicit new-tab copy semantics. At that slice boundary, bulk Group/
selection Open and popup route reuse remained outside; the newer bulk update below
supersedes the former exclusion, while popup route reuse remains separate.

Each request captures the current item reference and complete Workspace › Space ›
Group › Stack location/value receipt, requires global stable-ID uniqueness and an
openable normalized URL, and re-resolves after browser reads. A profile-wide tab
query recognizes an exact live destination or this extension's exact
`suspended.html#url=...` placeholder; pending navigation is authoritative, live
pages are preferred, and a chosen tab is freshly read before activation and window
focus. Near URLs, foreign/malformed placeholders, unsafe legacy addresses, stale
or duplicated records, moved/replaced/renamed items, and changed candidates fail
closed. Background reuse has no effect; absence creates one inactive live or
Hibernate placeholder according to the existing preference.

A per-URL lane coalesces identical rapid intent, serializes different
dispositions, and stops an already queued same-document request after an
unconfirmed prior browser effect. When available, a same-origin Web Lock spans
the profile query and browser effect across Locus documents, so a deterministic
acknowledged first create is reused by the second. The explicit copy path skips
the unused profile query. Confirmed success stays quiet. Typed unsafe/stale/
candidate/check/uncertain/focus failures use distinct English and native Taiwan
zh-TW guidance, with one message and initiating-focus return; Landing dismisses
only after a confirmed handoff. Production-extracted tests cover exact live/
suspended/pending matching, deterministic preference, Hibernate/background and
explicit-copy-without-query behavior, identity/candidate races, exact active and
focused receipts, query/update/focus/create failures, single- and two-document
coordination, UI ownership, and every in-scope source path. All 35 repository JavaScript syntax
checks, all 26 deterministic checks (including the default 10,000-schedule
concurrency gate), and `git diff --check` pass. **Implemented: yes; Verified:
partial (static and deterministic production-extracted browser-API evidence);
User-validated: no; Released: no.** Installed Chrome/Web Lock effects,
cross-document visibility after an unknown receipt, the final non-atomic query/
create race against external actors, rendered/focus behavior, screen-reader
output, representative-user usefulness, and release evidence remain open.

Bulk Reopen evidence update (2026-08-02): the earlier single-page boundary is now
extended to Board, focused-Group, List, context-menu, and selection multi-page
actions. A Group action captures the exact rendered object and requires one unique
current Workspace/Space/Group identity before recursively collecting nested Stack
tabs. Selection Open accepts saved tabs only and is disabled with a reason when none
are eligible. Every eligible save freezes exact location/value/URL authority before
browser work; different saved items with the same URL serialize without sharing a
receipt.

The batch settles the shared Reopen controller sequentially with background intent.
It reuses an exact live page or Locus suspended placeholder before creating one
inactive live/Hibernate tab. Safe stale/unsafe/ambiguous items are counted without
effect. A failed or malformed profile-tab read runs once and stops the remainder;
the first unknown browser effect likewise stops all later attempts. One result
accounts for new tabs, already-open, not-opened, check-failed, unconfirmed, and not-
checked items. The initiating control stays focusable with visible reduced-motion-
safe progress, `aria-busy`, and `aria-disabled`; competing activation explains the
active plan and returns focus there. Required retry/check-tabs guidance persists
inline until dismissed. English and native Taiwan zh-TW use complete object labels,
and danger feedback uses a warning mark rather than a success check.

The production-extracted suite was observed red before the coordinator and again
for duplicate Group IDs, different same-URL item authority, repeated failed reads,
silent competing activation, focus-stranding native disablement, and expiring
recovery. All 36 repository JavaScript syntax checks and all 27 deterministic
commands pass, including the default 10,000-schedule concurrency gate.
`git diff --check` is clean. **Implemented: yes; Verified: partial (static and
deterministic production-extracted browser-API
evidence); User-validated: no; Released: no.** Installed Chrome tab/window/Web Lock
effects, real pixels/focus, native screen-reader output, representative-user
usefulness, and release remain open. No schema, storage, permission, host permission,
network, telemetry, panel, modal, or persistent preference changed.

Library recovery-ledger evidence update (2026-08-02): All Links, Favorites, and
Read Later now present one active-Workspace recovery ledger rather than separate
browse treatments. Every row keeps the complete Workspace › Space › localized
Group › optional Stack destination, title, URL, age, and visible Open page/View
details actions together. Read Later defaults to unread/oldest-first and no longer
duplicates the first unread saves in Up-next cards plus the full list. The ledger
reflows before common sidebar/rail widths can hide the path, retains its recovery
actions around the 800 px acceptance viewport, and includes privacy blur,
keyboard-anchored More, per-item accessible names, and direct English/native
Taiwan zh-TW copy.

Mode, query, status, sort, and selected Details item are canonical URL state and
use `persist: false` at routed Library boundaries. Each action combines the shared
saved-item value/location receipt with current route meaning, visible-result
membership, and a stable focus key. Missing, duplicated, replaced, moved, renamed,
URL-edited, stale-route, or filtered-out targets cause no Open or Details effect.
Closing Details restores the rebuilt row's visible Open page action; list-changing
mutations retain the same useful control or a neighbor. This strengthens the
implemented P0-12 recovery shell without adding a schema field, stored collection,
permission, telemetry, or another dashboard.

Production-extracted and static contracts cover route round trips, no durable
view-state writes, one ordered Read Later result, nested destination formatting,
exact visible-target revalidation, Reopen/Details delegation, focus recovery,
single-renderer convergence, responsive/privacy/keyboard source rules, accessible
action naming, and locale parity. All 36 repository JavaScript syntax checks, all
27 deterministic commands, the default 10,000-schedule concurrency gate, and
`git diff --check` pass. **Implemented: yes; Verified: partial (static and
deterministic production-extracted evidence); User-validated: no; Released: no.**
Installed pixels/history/storage behavior, native screen-reader output, real
theme/locale/viewport presentation, formative 4/5 usability, release-candidate
12/15 completion, the 80% within-an-additional-30-seconds recovery target, and
Week-1/Week-4 repeat recovery remain open.

Background capture-receipt evidence update (2026-08-02): the fastest background
Save paths now complete Save → See destination instead of ending at a 1.4-second
badge. Context-menu page/link/selection/image/window and `save-current-tab`
captures create one quiet conservative native receipt after the guarded write and
before any requested source-close check. Only confirmed creation permits cleanup;
the guarded result updates that same stable receipt ID. Creation failure keeps all
sources open, and update failure leaves the initial truthful clickable state. The
receipt names the saved kind/count, a bounded recognizable accepted-time Workspace
› Space › localized Group path, and the truthful source outcome. Exact direct-
Group URL duplicates still write and close nothing but can continue to the unique
existing saved item.

The notification ID contains only a versioned target kind, Workspace ID,
item/Group ID, and nonce. Click handling needs no in-memory map: it parses the
bounded locator, fresh-reads authoritative `te`, reuses the globally unique exact
item/Group resolver, opens one local exact route, and clears only after tab
creation. Same-Workspace moves follow the stable target; malformed, missing,
duplicated, and cross-Workspace targets fall back to local Home without mutation.
A failed continuation preserves the receipt without retry.

Visible receipts omit page title, URL, favicon, selection, and note content.
Control/bidi/path-delimiter stripping, whitespace normalization, and 24/24/40
grapheme budgets prevent user/import-controlled organization labels from forging
the hierarchy or hiding the consequence line. Existing screen-sharing privacy
blur replaces every organization label with localized destination-hidden copy;
without that opt-in, the organization path is intentionally exposed to the
operating-system notification surface. A settle-once native boundary awaits
callback-only or Promise create, update, and clear completion and observes
callback-scoped runtime errors. Notification/badge failure and rejected source
read/removal cannot repeat or relabel an accepted write. Production-extracted
cases cover every entry point, English/native zh-TW, privacy and hostile labels,
callback create/update/clear, both hybrid completion orders,
notification/badge/source/continuation failures,
restart-compatible codec parsing, fresh target resolution, receipt-before-close,
in-place update, and create-before-clear ordering. All 36 repository JavaScript
syntax checks, all 27 deterministic commands, the default 10,000-schedule
concurrency gate, and `git diff --check` pass. **Implemented: yes; Verified:
partial (static and deterministic production-extracted browser-API model
evidence); User-validated: no; Released: no.** Installed native notification
rendering/accumulation and click delivery, real callback/Promise behavior,
service-worker suspension between creation/close/update, real tab effects,
screen-reader output, representative-user recovery, and release evidence remain
open. No durable outbox was added; the former close-before-receipt model gap is
closed without claiming installed lifecycle proof.

Contextual-capture evidence update (2026-07-29): background page, link,
selection, image, shortcut, and whole-window context-menu saves now use one
strict destination policy. Remembered Workspace/Space/Group tuples, configured
default Spaces, and active Workspace/Space fallbacks must resolve uniquely in
their exact hierarchy; stale, moved, incomplete, and duplicate identities fail
closed. Single capture reuses one exact Inbox or provisions it only when absent.
Whole-window capture queries the initiating window by ID and creates its
collision-safe Session Group directly in the exact Space without an Inbox side
effect. Generated identities reserve active, Archive, Trash, capture/default
hint, sizing, and Canvas keys.

Each real capture makes one guarded writer attempt. Only acceptance badges
success or begins cleanup; every source close then fresh-checks tab ID, window,
URL, and pending URL, while whole-window cleanup preserves the initiating tab
and any tab that became active. Production-extracted cases cover configured and
fresh destinations, retained-ID collisions, duplicate/unsupported content,
accepted/conflict/quota/error outcomes, navigation after save, disabled close,
native zh-TW **工作階段** naming, and exact source preservation. The complete
30-file syntax and 23-script deterministic block passes. **Implemented: yes;
Verified: partial (static and deterministic browser-API model evidence);
User-validated: no; Released: no.** Installed context-menu, badge, notification,
tab-effect, storage/message teardown, service-worker restart, accessibility,
representative-user, and release evidence remain open.

Saved-tab keyboard evidence update (2026-07-26): the Welcome → Inbox handoff now
focuses a direct native, localized title/Open action. Board Arrow navigation and
detail return prefer that control without descending into nested Stacks; focus
reveals the named sibling actions without layout shift. A focused Group route
renders its reused column expanded without rewriting the saved board-collapse
preference, and post-render Group focus uses a visible action. Missing, malformed,
script, extension, and unsupported saved addresses create no browser effect, while
whitespace-only titles fall back to the address or localized Untitled copy without
rewriting stored data. Shift+F10 and the Context Menu key open the saved-tab menu
at that primary action, focus its first command, and restore the opener before the
command runs. Menu commands and clipboard success/failure feedback are localized;
Edit title routes to the existing receipt-gated detail title field instead of a
native prompt. Metadata toggles restore the rebuilt card, Archive uses a
next/previous/Group fallback, and the detail Open action shares the saved-address
guard. The incomplete legacy color and direct reminder pickers stay out of this
core menu; receipt-gated reminders remain in Details. The production-extracted
onboarding, item-detail, and Group-identity contracts cover these boundaries. The
complete 29-file syntax and 22-check
deterministic block passes. This advances implementation and deterministic
accessibility evidence only; installed tab effects, screen-reader output,
responsive/theme/locale pixels, browser zoom, and representative-user recovery
remain open.

Home recovery evidence update (2026-07-16): real Inbox and recent-Space previews
now complete locate → recover with native localized controls and the existing item
detail sheet on `/home?item=<id>`. Production helpers fail closed on missing,
globally duplicated, ambiguously owned, or moved-out records; moved-within records
resolve at their current location. The Home route preserves active Space/layout,
does not render Canvas or persist ephemeral open/close/history state, and restores
exact or current-row focus. Deterministic route, identity, persistence, focus,
locale, and CSS contracts pass. This improves P0-12 implementation evidence only:
installed rendering/history, screen-reader and viewport evidence, representative-
user completion remain open. Quick-capture and whole-window recovery have the
partial evidence recorded below. Direct-field and item-detail reminder receipt
gating are recorded below.

Popup Locate evidence update (2026-07-16): the asked single-tab destination picker
offers a default-off localized Open-after-save choice. Its primitive saved/source
identity originally rode the same state-write request; the 2026-08-03 update below
supersedes that transport boundary. At this earlier boundary, after acceptance the service worker
fresh-resolves one unique active item and one unambiguous owning Space in the
original Workspace, creates the shared Home-detail route in the source popup window
before any configured source close, then activates it and focuses that window.
Rejected state performs no browser effect. A known post-write Locate failure keeps
the accepted saved item and exposes a localized partial-success path rather than a
false save failure; if activation fails, recovery retries the exact already-created
saved-item tab instead of creating a duplicate generic tab, fallback notifications
return to that same route (or recreate that exact local route if window focus fails),
and a retry failure is announced. Popup writes now bound unknown acknowledgements,
normalize every ambiguous transport rejection regardless of native error shape, and
cancel late missing-receiver retries; valid recovery deep links take precedence over Landing and
automatic Welcome without changing onboarding state. Production-extracted route,
identity, state/effect ordering, timeout, focus/semantic, and en/zh-TW contracts
pass. **Implemented: yes. Verified: partial (deterministic/static/mocked-browser
evidence only). User-validated: no. Released: no.** Installed popup teardown,
message lifetime, real tab close/activation, screen-reader/theme/locale/viewport
rendering, quick/window continuation, and representative-user completion remain
open.

Popup Locate safety evidence update (2026-08-03): the state request now carries no
Locate intent. Rejected or acknowledgement-unknown state dispatches no route/close
effect; only a valid accepted receipt permits a separate
`locus-complete-popup-locate` request to enter the central FIFO/Web Lock before its
fresh authoritative resolve. That request supplies transient source tab/window/
original-active/expected-URL facts. The worker creates the encoded route inactive, validates the source,
then activates, focuses, and fresh-confirms the exact active route. It revalidates
the exact source as inactive and rechecks the route immediately before any removal;
that final check requires the encoded route as the committed current URL, not only
as a pending navigation.
Activation/focus, returned-ID, window, active-state, current/pending URL, route-
replacement, and route-read failures close nothing. A changed or unconfirmed route
is not offered as an exact-tab retry; a protected source stays open while the
accepted item and confirmed route remain usable. After effect dispatch, a lost,
timed-out, or malformed receipt keeps the save accepted and reports route/close as
unconfirmed without retry. Popup and native-notice retry clicks fresh-check exact
tab/window/active/route/pending identity before activation and after focus, and open
a fresh exact local route if the retained tab changed, lost focus, or disappeared.
Legacy notices without exact route authority use generic Locus without tab-ID reuse.
This removes a convenience and
trust failure without adding a screen, copy, stored field, schema, permission,
network request, or host access. The complete 36-file syntax and 27-command
deterministic gate passes, including 10,000 concurrency schedules and the diff
check. **Implemented: yes. Verified: partial (production-extracted deterministic
and mocked-browser evidence only). User-validated: no. Released: no.** Installed
popup/message/service-worker lifetime, real activation/focus/removal, rendered and
assistive behavior, representative-user completion, and release remain open.

Popup whole-window recovery evidence update (2026-07-24): links-only,
session-Group, and reading-queue saves now await the ordinary revisioned state
receipt before dispatching a separate worker-owned
`locus-complete-window-save` request. A rejected, lost, timed-out, malformed, or
otherwise acknowledgement-unknown write dispatches no close effect. After an
accepted receipt, the completion worker fresh-reads authority, requires one globally
unique receiving Group with one owning Space still in the original Workspace,
and holds the central state FIFO/Web Lock through its removal attempts so another
Locus mutation cannot change that graph mid-effect. It accepts only unique local
`{ tabId, expectedUrl }` source descriptors. Before
removal it requires the current tab to remain in the recorded source window,
inactive, at the captured URL, and without a different pending URL. Malformed or
duplicate descriptors, moved or newly active tabs, navigation, and redirects stay
open or count unconfirmed. The captured URL must also remain recursively present in
the exact receiving Group; removed content stays open. The result returns
exact requested, closed, and unconfirmed counts plus authoritative current Space
and Group names after a same-Workspace move or rename. Missing, duplicated, or
moved-out destinations close nothing. A lost, timed-out, or malformed completion
receipt keeps the accepted save and labels the destination and every requested
close outcome unconfirmed rather than claiming no source closed. The active popup
tab remains open for a localized receipt that names the exact Space / Group, saved
content, and source outcome rather than hiding required information in a delayed
toast.

The receipt's explicit Open destination action fresh-resolves the same Group,
reuses or creates its encoded local Group route, and activates and focuses that
exact tab. Activation failure retains destination identity; retry fresh-redispatches
the worker and reuses the exact route rather than directly activating a remembered
created-tab ID. A disappeared destination degrades to Open Locus without changing
the accepted save. A valid first-use Group route suppresses automatic Welcome without
marking it seen. The primary action is described by the current destination,
saved-content summary, and source outcome. Nested popup sections now restore the
last visible opener in last-opened-first-closed order, save modes use a roving radio
Tab stop, and the save-options group, tag input, note input, and close-other-tabs
consequence have
localized English and native zh-TW names. Static production-source gates cover
state-receipt-before-completion dispatch, no page-owned removal, and per-tab source-
window/URL validation plus recursive receiving-Group membership and central FIFO/
Web Lock serialization. The expanded production-extracted popup-Locate contract
passes all three modes, duplicate-only note/no-note behavior, receipt/identity
ordering, URL-safe source recovery, exact destination routes, LIFO focus with
unusable-opener fallback, accessible semantics, and English/zh-TW parity. **Implemented:
yes. Verified: partial (production-extracted deterministic, static-source, and
mocked-browser evidence only). User-validated: no. Released: no.** Installed popup
teardown and message lifetime, real tab effects,
screen-reader/theme/locale/viewport rendering, reduced motion, reload/history, and
representative-user completion remain open. Pre-dispatch popup teardown deliberately
leaves source tabs open after an accepted save, but that real lifecycle outcome
still needs installed evidence.

Popup ask-every-time-off quick-capture evidence update (2026-07-24): after a valid
accepted state receipt, quick capture leaves the source open and reuses the existing
result card to name the authoritative current Space, Group, and saved title. It
offers **Open saved item** plus **Close tab** only when close-after-save is
configured; otherwise the secondary is **Close popup**. There is no timed close,
toast, modal, notification, or forced navigation. Rejected, timed-out, lost,
malformed, or acknowledgement-unknown state dispatches no quick browser action.

Open and Close are separate worker-owned actions. Each fresh-resolves one exact
active item at its saved URL and one owning Space in the original Workspace; same-
Workspace movement/rename remains valid, while missing, duplicate, stored-only, or
moved-out identity fails closed. Open reuses or creates encoded
`/home?item=<id>`, activates/focuses the exact route, and confirms its current or
pending URL. A requested source close additionally checks exact tab/window/current
URL, rejects a different pending URL, and protects an inactive-to-active source.
The worker reads the route after focus and again after source validation immediately
before removal. Route mismatch/unconfirmed and protected/unconfirmed source outcomes
do not produce a success claim or blind retry. Unexpected completion failure is
typed `effectUnknown`; safe Open identity remains, while destructive Close is
disabled. Focus starts on Open, Tab reaches the secondary, and Escape closes the
popup only. English/zh-TW names, reduced motion, `100dvh`, and compact rules at
520 px height or less are retained.

All 28 JavaScript syntax checks, all 21 deterministic suites, the popup contract
line, quality gates, and diff check pass. **Implemented: yes. Verified: partial
(production-extracted deterministic, static-source, and mocked-browser evidence
only). User-validated: no. Released: no.** Installed popup teardown/message-port/
service-worker lifetime, real tab activation/removal/focus, the final check-to-
effect race, real compact-height scrolling, pixels, keyboard/screen-reader,
light/dark, English/zh-TW, reduced motion, 1280×720/800 px layouts, reload/history,
and representative-user completion remain unverified. This evidence does not
converge or replace asked ordinary Save/Locate. No schema, import, permission, host,
stable-ID, or local-only boundary changed.

Accepted quick-capture receipt truth update (2026-08-09): storage acceptance and
destination projection are now explicitly separate truths. Once the centralized
writer accepts a revision, malformed Workspace/Space/Group/nested-item collections,
malformed destination fields, or an unexpected projection error return the strict
existing unavailable continuation under top-level `{ok:true, revision}`. The popup
therefore says the tab was saved, keeps the source open, and offers recovery instead
of a duplicate-inviting Save retry. Present malformed collections fail closed rather
than being skipped; missing/null legacy collections remain empty; large valid
Stacks use iterative traversal. Registered production-listener cases prove one
accepted write and zero browser effects across all four collection levels, a
malformed Space ID, and a valid 200,000-entry Stack. **Implemented: yes. Verified:
partial (production-extracted deterministic mocked-browser evidence only).
User-validated: no. Released: no.** Installed message/storage/service-worker timing,
rendered/accessibility behavior, representative-user comprehension, approval, and
release remain open. No UI copy, locale, schema, migration, stable ID, import,
permission, host-access, network, telemetry, or privacy boundary changed.

Direct item-detail receipt evidence update (2026-07-16): title, URL, task state/
text, saved context, cover, tags, checklist, and custom fields now converge on one
production controller. It exhaustively re-resolves the unchanged rendered target,
runs field logic on a detached candidate, creates one snapshot, and waits for one
central-writer receipt before render or success. Pending feedback is localized and
live; duplicate edits, sheet close, route changes, later Escape, and a duplicate
pagehide write are blocked, while in-sheet Tab and an initial editor Escape to the
stable panel remain available. Rejected or unknown receipts retain the dirty graph behind recovery
without retry or false success. The production-controller/static contract and full
deterministic suite pass. **Implemented: yes. Verified: partial (deterministic
production-controller/static-source evidence only). User-validated: no. Released:
no.** Stack identity continues through its separate receipt-gated identity editor;
Archive and the Open browser effect are separate flows. Installed
storage/recovery, Back/Forward/reload/pagehide completion, screen-reader output,
theme/locale/viewport pixels, and representative-user evidence remain open.

Item-detail reminder receipt evidence update (2026-07-16): Set, Change, quick
choices, and Clear now re-resolve the exact rendered item and route, preserve
unowned/imported reminder fields, take one localized snapshot, and issue one
`persistNow({ reconcileReminders: true })` request. The service worker accepts the
revisioned state before running its serialized full alarm reconciliation and returns
both results in the same receipt, so page teardown cannot lose a page-owned follow-
up. A known writer rejection runs no alarm pass. A lost/timed-out unknown response
keeps the dirty graph behind recovery without page follow-up, close, render, or false
success, although an already accepted worker transaction may have completed its
bundled alarm effect. Accepted state plus alarm failure stays accepted and produces
the localized warning with a direct Undo action. A
synchronous pending boundary blocks duplicates, picker/detail close, route changes,
other detail edits, and app shortcuts; Tab remains contained, recovery remains the
top layer, and completion focuses the rebuilt Set/Change control. Production-
controller/static and background mocked-browser contracts pass. **Implemented: yes.
Verified: partial (deterministic production-controller/static-source and mocked-
browser evidence only). User-validated: no. Released: no.** Installed message-port/
service-worker lifetime, real alarm APIs, teardown/reload/history, notification
scheduling, screen-reader output, theme/locale/viewport pixels, and representative-
user evidence remain open. Non-detail item and group/category reminder mutation
entry points remain outside this exact-detail controller.

Group/Space reminder-removal evidence update (2026-07-29): every destructive
Group, Space, and Calendar entry path now converges on the shared localized
reminder dialog and `commitEntityReminderRemoval()`. The controller freezes exact
owner/location/runtime identity, stable reminder ID, reminder identity, and value
fingerprint; permits harmless sibling reorder; and fails closed for missing,
duplicate, replaced, changed, moved, archived, or trashed targets. Pre-existing
recovery blocks before snapshot or mutation. A valid removal takes one localized
snapshot and waits for one `persistNow({ reconcileReminders: true })` receipt, with
the service worker as the sole alarm authority. Rejected or acknowledgement-
unknown writes keep the dialog/recovery state with no close, render, or success;
accepted state plus alarm failure keeps the removal, warns locally, and exposes
exact Undo. Pending blocks duplicate activation, Escape, close, and scrim dismissal
while Tab remains trapped; success restores next, previous, or current-owner
fallback focus. English and zh-TW contracts pass.

Fresh bundled-Node Playwright shim evidence covers 1280×720 and 800×720 with
zh-TW, dark theme, and reduced motion. The dialog stayed bounded with exact
destructive initial focus; a deferred receipt kept it open and `aria-busy`, blocked
Escape, and retained the old rows; acknowledgement then rendered only the survivor,
focused it, and exposed Undo, with no console or page errors. **Implemented: yes.
Verified: partial (production-extracted deterministic/static-source plus rendered
browser-shim evidence). User-validated: no. Released: no.** This is not installed
MV3 evidence for real Chrome storage/alarm APIs, cross-window adoption,
notification delivery, message/service-worker lifetime, screen-reader output, or
representative-user behavior. Non-detail item, Group/Space, and Calendar Add-task
convergence are recorded by the 2026-07-29 updates below; installed reminder
lifetime remains open.

Reminder pending-policy update (2026-07-16): pending new-tab surfaces now exclude
delivered records, retain an unresolved one-shot or expired recurrence in Past due,
and project an active missed recurrence to the same first future wall-clock
occurrence as background reconciliation without mutating state. Existing reminder
identity and stable reminder IDs remain attached to open, edit, drag, clear, and
remove actions; array indexes remain compatibility metadata only. A production-
extracted DOM-free contract covers six pending cases, three recurrence-parity
projections, and the landing, app-menu, Calendar, editor, and item-badge wiring.
The destructive-dialog shim evidence is recorded above; installed-extension
evidence remains open.

Paste links evidence update (2026-07-29): Settings → Paste links now freezes the
reviewed Workspace/Space and stable existing-Group identity instead of re-reading
mutable active state at submit. Active-view changes cannot redirect the import;
harmless sibling reorder remains valid; and missing, moved, duplicated, replaced,
renamed, or ambiguous targets stop before history. Empty Spaces expose the visible
New group name field, and blank fallback naming follows English or native zh-TW.
Unique HTTP(S) lines become real local tab records with IDs allocated against
active, Archive/Trash-envelope, capture, sizing, and Canvas identifiers. One
localized snapshot and one awaited central-writer receipt own render, close,
opener focus, success, and exact Undo. Pending blocks duplicate activation,
dismissal, Escape, shortcuts, and routes; rejection or acknowledgement-unknown
state stays behind recovery without retry or false success.

The production-extracted suite and current-source Chromium shim cover exact
destination/reorder/stale-target behavior, collision allocation, accepted and
failure receipts, English/light 1280×720, zh-TW/dark/reduced-motion 800×720,
bounded layout, focus/inertness, localized validation, reload persistence, and
duplicate-ID absence. **Implemented: yes. Verified: partial (production-extracted
deterministic/static plus current-source browser-shim evidence). User-validated:
no. Released: no.** The supported browser surface exposed no installed Chrome/
extension backend. Installed MV3 persistence/message lifetime, cross-window
adoption, CSP/local favicon/network behavior, screen-reader output, and
representative-user trust remain open.

## 4. Document authority and conflict resolution

### 4.1 Order of authority

1. **Reality and external obligations:** shipped artifact, code, manifest, browser behavior,
   test evidence, Chrome Web Store policy, and law.
2. **This document:** product thesis, ICP, claims, metrics, gates, roadmap, and owner decisions.
3. **`.claude/docs/STATUS.md`:** current implementation queue and evidence state.
4. **`.claude/docs/ARCHITECTURE.md` and `CLAUDE.md`:** code map, data model, and hard
   implementation invariants.
5. **`docs/UX_SIMPLIFICATION.md`:** current interaction contract for first use, shell,
   Home, Calendar disclosure, views, and motion.
6. **`DESIGN.md`:** visual signature, design provenance, legal posture, and development log.
7. **Public documentation:** `README.md`, privacy policy, Store listing, and release notes;
   these must be derived from verified facts and the claims ledger below.
8. **Historical/reference material:** `docs/IMPROVEMENTS.md`,
   `docs/CAPTIVATION_REVIEW.md`, `docs/COMPETITIVE_MOAT.md`,
   `docs/landing-page-strategy.md`, marketing prototypes, and design previews.

When documents disagree, the higher source wins, but the contradiction must be fixed rather
than silently ignored. Code wins only as a description of current behavior; it does not
automatically win as a product decision.

### 4.2 What each document may claim

| Document | Owns | Must not own |
|---|---|---|
| This file | Product truth policy, market, metrics, gates, roadmap | Low-level implementation details that drift by line number |
| STATUS | Work queue, blocker state, evidence links | New strategy or marketing claims |
| ARCHITECTURE | Verified code/data facts | Product-market conclusions |
| VERIFY | Reproducible validation procedures | Statements that validation passed without an evidence artifact |
| UX_SIMPLIFICATION | Current UX acceptance contract | Market size, monetization, or release status |
| DESIGN | Visual system and dated design decisions | Canonical roadmap or unsupported legal conclusions |
| README / Store / landing page | Approved, user-facing claims | Aspirational or merely implemented claims presented as proven value |
| Marketing prototypes | Clearly marked concept work only | Public product truth or release history |

## 5. Product principles

1. **One successful loop before breadth.** Save, locate, and recover must be obvious before
   Calendar, layouts, trackers, or customization compete for attention.
2. **Explicit action, explicit consequence.** Never imply unsaved tabs are protected. Show
   destination, persistence, completion, failure, and recovery.
3. **No silent data loss.** A quota, archive cap, failed write, bad import, concurrent write,
   or alarm failure must never discard data silently.
4. **Local is not durable by itself.** Chrome clears `storage.local` on uninstall. Local
   control requires backup, export, restore, and honest warnings.
5. **Privacy is architecture plus evidence.** No host permissions is factual; “nothing
   leaves” requires a repeatable network audit and a precise exclusion for user-invoked
   destination opening.
6. **Truth before persuasion.** Qualify weak claims rather than polishing them. Never show
   fabricated quotas, accounts, plugins, testimonials, release history, or premium states.
7. **Progressive disclosure.** Core is always visible; contextual appears with matching
   intent/data; advanced remains reachable without competing with first use.
8. **Store scope follows one purpose.** Every Store-candidate feature must directly support
   saving, organizing, or recovering browser context.
9. **User ownership includes an exit.** Export must be complete, understandable, validated,
   and reversible through import.
10. **Evidence expires.** Competitor, policy, performance, and claim evidence has a review
    date. Old evidence cannot support a current superlative.
11. **A visual preview is a hypothesis.** A surface is not complete until its task,
    accessibility, persistence, failure, and narrow-layout contracts pass.
12. **Complexity must earn promotion.** Existing features may be hidden or removed from a
    release candidate when they harm comprehension, policy compliance, or reliability.

## 6. Market delta: what changed the old thesis

**Evidence date: 2026-07-15.** Vendor counts and benefits below are vendor-reported or
current Store-listing snapshots, not independently audited durable facts. Refresh this table
quarterly and before any comparative claim.

| Product/platform | Current official evidence | Delta from the old Locus analysis | Strategic consequence |
|---|---|---|---|
| [OneTab](https://www.one-tab.com/) / [Help](https://www.one-tab.com/help) / [Privacy](https://www.one-tab.com/privacy) | Claims up to 95% memory reduction and no signup; current product includes folders, search, quick lists, stars/tasks, context capture, export/import, and encrypted sync/backup marked “coming soon.” Its privacy page says domain icons are generated by Google. | It is no longer accurately described as a frozen flat list. It now overlaps organization, tasks, search, capture, privacy, and future sync. | Locus cannot claim the only memory-light local organizer. It must win on a clearer mixed-context recovery loop and verified absence of developer-directed external requests. |
| [Workona](https://workona.com/) | Official page advertises project spaces, autosaved sessions, cloud backups, cross-device sync, tab suspension, restore, and search. | “No hibernation” and weak recovery are stale characterizations. | Workona is stronger at automatic durability and multi-device recovery. Locus's trade is explicit local control, not greater breadth. |
| [Toby](https://www.gettoby.com/) | Official page advertises visual workspaces, session saving, search, to-dos, sharing/collaboration, and “over 500,000” users. | Toby is broader than a simple visual collection and has material self-reported distribution. | Do not compete through a generic “visual workspace” headline. Test privacy and recovery language against Toby switchers. |
| [tabExtend](https://www.tabextend.com/) | Official page advertises workspaces mixing tabs, notes, images, tasks and reminders, plus encrypted cloud storage, backups, sync, collaboration, and “20,000+” users. | The mixed tabs+notes+reminders experience is not unique. | Local/no-account/no-host execution and a simpler core loop must carry differentiation. |
| [Tablerone Store listing](https://chromewebstore.google.com/detail/tablerone-tab-manager/andpjllgocabfacjlelkfpdemfklpfpo) | Listing snapshot shows 20,000 users and an April 17, 2026 update; advertises local/no-account storage, workspaces, notes, tags, favorites, OneTab/Session Buddy import, automatic session saving, screenshots, and suspension. | This is a close local/privacy competitor and invalidates the claim that cloud competitors are the only serious alternative. | Counter-positioning alone is not a moat. Locus needs superior verified data safety, clarity, and repeat use. |
| [Chrome Memory Saver](https://support.google.com/chrome/answer/12929150?hl=en-GB) | Chrome deactivates inactive tabs and reloads them when revisited, with multiple deactivation levels. | Tab deactivation is native browser behavior. | Memory relief is an entry benefit, not a durable moat. The saved context and reason-for-saving must matter. |
| [Microsoft Edge Workspaces](https://support.microsoft.com/en-US/edge/getting-started-with-microsoft-edge-workspaces) / [performance features](https://support.microsoft.com/en-US/edge/learn-about-performance-features-in-microsoft-edge) | Edge groups tabs into project workspaces, returns users to context, syncs workspace state, and provides sleeping tabs. | Native workspaces and memory management continue to converge on the category. | Locus must be browser-independent in value even while Chrome-only in implementation: user-owned mixed context, retrieval, and export. |

### 6.1 Market conclusion

The former “only product with full workspace + hibernation + privacy” statement is not
supportable. Competitors overlap each leg, and Tablerone overlaps much of the local/privacy
position. There is no demonstrated moat today.

The testable opportunity is narrower:

> Can Locus provide a more trustworthy and comprehensible save-and-recover experience for
> privacy-conscious heavy-tab users than mature local lists and cloud workspaces?

The answer must come from retention and switching evidence, not a feature matrix.

### 6.2 Platform and naming constraints

- Chrome Web Store policy requires a single, narrow, understandable purpose. A new-tab or
  tab-management extension may offer related features, but unrelated functionality and
  excessive permissions create rejection/removal risk. See the official
  [single-purpose FAQ](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines-faq)
  and [minimum-permission/user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/).
- Chrome requires a privacy policy even when handled user data stays local. The policy must
  disclose collection, use, sharing, retention, access, and deletion accurately.
- Two active Store products already use the name: an exact
  [“Locus” focus extension](https://chromewebstore.google.com/detail/locus/kfpfniljhodilkekcpfgmklicblgclch)
  updated May 15, 2026, and
  [“Locus — Smart CTRL + F”](https://chromewebstore.google.com/detail/locus-%E2%80%94-smart-ctrl-%2B-f/eppedlbobmdflmhleafebmahnbphgipb)
  from Locus AI, LLC with a 4,000-user listing snapshot. This is not a legal conclusion,
  but it is a material search, confusion, and trademark-clearance risk.

## 7. Claims control system

### 7.1 Claim statuses

| Status | Meaning |
|---|---|
| **Approved** | May be used exactly as qualified in the ledger; evidence is current. |
| **Qualified** | May be used only with the stated limitation in the same visible context. |
| **Blocked** | Plausible, but required proof or product work is incomplete. Do not publish. |
| **Prohibited** | False, absolute, misleading, outside scope, or structurally unprovable. |

Any public claim not in this ledger is Blocked by default. Superlatives such as “best,”
“only,” “zero,” “never,” “forever,” and “guaranteed” require owner approval plus current,
reproducible evidence.

### 7.2 Canonical claims ledger

| Claim | Status | Allowed wording | Evidence / unlock condition |
|---|---|---|---|
| Replaces the Chromium new tab | Approved | “Replaces your Chrome or Edge new tab with a local workspace.” | `manifest.json` override plus load-unpacked smoke test for the release artifact. |
| No host permissions | Approved | “Requests no host permissions.” | Release manifest has no `host_permissions`; re-audit every release. Do not say “no permissions.” |
| No account or Locus application backend | Qualified | “The extension needs no account and stores no workspace data on a Locus server.” | Code/network audit. Marketing website feedback collection must be disclosed separately. |
| Data stored locally | Qualified | “Workspace data is stored in `chrome.storage.local` in this browser profile.” | Storage inspection. Same sentence or nearby copy must state export and uninstall/profile-loss limits. |
| Nothing leaves the machine | Blocked | Do not use. Future allowed wording, if proven: “Locus sends no telemetry or background workspace data; opening a saved page contacts the destination you choose.” | Zero unexpected requests across the release network suite; privacy policy matches behavior. |
| Never reads page content | Qualified | “Locus does not automatically read page content; it stores selected text only when you explicitly save it.” | Context-menu and network audit. |
| One click saves every tab | Blocked | “Save the current tab or the eligible tabs in the current window.” | A one-click claim requires the default path to complete in one invocation and a usability test confirming interpretation. |
| Close the window and lose nothing | Blocked | “After Locus confirms a successful save, you can close the captured tabs.” | The centralized writer model passes two client-queue cases, an overlapping popup-capture failure flow, 10 deterministic writer cases, and seeded lockless schedules. Production-extracted freshness and Undo contracts keep sources open across overlapping capture, ordinary-edit interleaving, set failure, conflict, and lost/timed-out receipts; later edits remain visible until explicit recovery converges on storage. The expanded production-extracted whole-window matrix now passes valid-state-receipt-before-completion ordering, exact-destination and recursive saved-URL validation, URL-safe source-window/active/navigation checks, truthful partial counts, and active-popup-tab retention; a separate static wiring gate requires the completion listener to hold the central state queue through validation and removal. Installed cross-context/lifecycle, save-before-close, quota, recovery-UI, and service-worker restart tests must still pass before this claim can advance. Never imply unsaved tabs are protected or that the whole browser window closes. |
| Zero RAM / about 0 MB | Prohibited | No zero-memory language. | Structurally false for placeholder tabs. |
| Saves up to X% memory / 50 tabs cost almost nothing | Blocked | No number yet. | Repeatable benchmark against live tabs, placeholders, and saved records; publish method, median, range, hardware, browser version. |
| Private by default | Qualified | “No account, no host permissions, local workspace storage, and export.” | Privacy/network/permission gates pass. Do not translate this into “zero privacy cost.” |
| Your data is yours forever / cannot be taken away | Prohibited | “Export your workspace to a local JSON file.” | Browser storage is deleted on uninstall; no architecture can promise forever. |
| Source available / open source | Qualified | “Source-available under the Locus Research and Contribution License.” | Current LICENSE. Do not call it open source or imply commercial permission. |
| Free | Qualified | “Free for the noncommercial uses permitted by the repository license.” | License/business decision. Do not say “free tier,” “free forever,” or “no credit card” before commercial terms exist. |
| Mixed tabs, notes, tasks, reminders | Approved as feature inventory | “Keep saved links beside local notes, tasks, and reminders.” | Release artifact flow tests. Do not present the feature combination as unique. |
| Seven layouts / trackers / Calendar | Qualified | May be listed below the core story as implemented capabilities. | Exact release artifact verification. No claim that breadth improves outcomes until user-validated. |
| Chrome Web Store availability | Blocked | “Research build installed unpacked from the repository,” while true. | Approved listing URL and released artifact. |
| Firefox, Safari, mobile, accounts, sync, collaboration, AI, files, screenshots, plugins, paid storage | Prohibited for current product | Do not advertise as shipped. | Separate approved strategy, implementation, verification, user validation, and release evidence. |
| Locus is the best/only product in the market | Prohibited | No comparative superlative. | Would require a defined category, current exhaustive evidence, and objective benchmark; not a current goal. |

### 7.3 Claim validation record

Before changing a claim to Approved or Qualified, append an evidence record to the relevant
experiment/release log:

```text
Claim:
Exact allowed wording:
Disallowed nearby interpretations:
Artifact/commit tested:
Test method and dataset:
Result:
Known limitations:
Evidence owner:
Verified on:
Expires/recheck on:
Approver:
```

## 8. P0 blocker register

No public Store submission, paid launch, broad marketing campaign, or “trusted/forever/lose
nothing” campaign may proceed while any P0 exit condition is open. A code change alone does
not close a blocker; the evidence gate must pass.

| ID | Blocker and risk | Required decision/work | Exit evidence | Current status |
|---|---|---|---|---|
| P0-01 | **License and business model.** The license forbids ordinary employer/client/commercial use while strategy targets knowledge workers; “free tier” implies nonexistent commercial terms. | Owner chooses noncommercial research product, broader end-user license, or separate commercial offering; counsel reviews final terms and Store distribution rights. | Signed decision record, final LICENSE/EULA/Store wording, target-user copy aligned. | Open |
| P0-02 | **Name collision.** Two active Store products use Locus, including an exact-name listing and Locus AI, LLC. | Professional trademark/search review; choose a clearable public name and identifiers before listing assets are finalized. | Written clearance or rename decision; Store, domain, package, logo, and migration plan checked. | Open |
| P0-03 | **Chrome Web Store single purpose.** Generic finance, habits, hydration, goals, workout, and subscription tools weaken the narrow tab/new-tab purpose. | Initial Store candidate states one purpose: save, organize, and recover browser context. O-04 excludes generic trackers from that candidate; keep them out of the release feature manifest and audit every required permission. | Release feature manifest, policy mapping, minimum-permission table, clean policy preflight/review. | Open; owner scope and exact seven-permission release allowlist are implemented, while the candidate feature manifest, installed prompts, policy mapping/review, and Store evidence remain open |
| P0-04 | **Concurrent stale overwrite.** New-tab, popup, and background whole-state candidates pass through one service-worker FIFO. That worker owns the only `te` write, checks `_revision` inside the queue, returns typed receipts, and additionally uses the shared Web Lock when available. Page queues freeze candidates at call time and invalidate queued successors after failure; popup and new-tab capture mutexes fail modeled overlaps closed. New-tab now keeps a confirmed-state baseline: clean current-schema boots do not manufacture a revision, clean idle pages adopt and render strictly newer `storage.onChanged` state, and dirty pages never merge, auto-rebase, or auto-replace an incoming whole graph. Unsafe active capture/Undo/import reconciliation, in-flight ordinary conflicts, failed capture with later edits, and failed Redo retain the local graph behind a localized inert reload overlay. Failed capture writes drain invalidated successors and leave sources open; they re-read authoritative `te` only when no later mutation would be erased. Set failure, conflict, stale recovery reads, and accepted writes whose receipts are lost or time out converge fail-closed in production-extracted deterministic contracts. The highest remembered event beats a stale read, delayed exact self-events do not masquerade as rollback, and malformed revision tokens are rejected before writing. Together with the client/capture cases, 10 deterministic writer cases and 10,000 fixed-seed lockless schedules show zero lost accepted mutation tokens. This remains model evidence, not installed-extension proof. | Exercise real new-tab/popup/background writes and `storage.onChanged` versus typed-receipt ordering; verify clean adoption, dirty/active recovery, response loss/timeout, quota behavior, and service-worker termination/restart without blind retry. Record the browser-side recovery overlay and source-tab results. | Deterministic client/writer interleavings plus at least 10,000 randomized schedules show zero lost accepted mutations; lock-unavailable, conflict, set-failure, overlapping capture, clean-refresh, dirty-recovery, ordinary-mutation interleaving, unknown-ack, and installed service-worker restart paths pass. | Open; central writer, immutable/failure-invalidating queues, capture mutexes, confirmed-baseline clean-boot suppression, clean external adoption, dirty fail-closed recovery, delayed-event handling, malformed-token rejection, stale-read protection, later-edit preservation, and authoritative failed/lost/timed-out-receipt recovery are implemented and deterministically modeled; installed multi-context ordering, lifecycle/restart, unknown-ack behavior, quota, and recovery-UI evidence remain open |
| P0-05 | **Data durability.** `storage.local` is asynchronous, quota-limited to 10 MB, and cleared on uninstall; baseline claims exceed that guarantee. Critical capture writes now precede close attempts, close results are reported truthfully, and action-scoped Undo records only tabs actually closed. Background post-acceptance capture now creates one conservative stable receipt before any requested source effect and requires that receipt to contain an exact actionable locator before cleanup; a generic Home fallback keeps every source open. An actionable close then updates the same receipt with the guarded result. Creation failure keeps sources open; update failure leaves the truthful clickable first state; callback-only and Promise completion settle once without retrying an accepted write or close. No durable notification outbox was added. Deterministic Undo contracts cover stale actions, capture-in-progress blocking, newer-edit interruption and history ordering, tab-open retry reuse, and persistence-failure authoritative recovery without duplicate source restoration. A 1,488,149-byte current-schema export passes production serialization, validation, exact portable pre-replace backup, replace, merge, and rejected-write rollback. Numeric schemas 0–13, all six accepted app envelopes, and raw legacy pass 30 deterministic replace/merge cases, including stable category/group/Trash reminder-ID migration; 128 fixed-seed valid semantic graphs add 5,013 entities and 256 mode cases. An exact 20,971,520-byte valid file reaches preview, the same JSON plus one byte is rejected before FileReader, and a 10,551,296-byte file whose parsed graph exceeds 10 MiB rolls both modes back after injected quota rejection. Eight total writer rejections leave authority unchanged. New-tab Save all and existing-Group capture still retain destination objects across an asynchronous browser read; clean graph adoption can detach them before mutation and source cleanup, so exact current-graph re-resolution is open P0 work. | Complete installed save/close/receipt lifecycle failure, real Chrome quota allocation and large-file/FileReader/preview behavior, installed legacy/current export/import, corruption, and recovery evidence; keep uninstall/profile-loss warnings visible and current. | Installed receipt-before-close, in-place update, callback/Promise, worker-teardown, and click-recovery suite; export/import round trips; quota/corruption/reload/uninstall documentation; recovery drill. | Open; core capture/Undo/notification-first receipt remediation, deterministic scale, numeric-schema, valid-semantic, and exact-byte/quota-sized import contracts implemented; the two new-tab detached-target callers, installed notification/lifecycle failure, real quota/FileReader/preview behavior, DOM sanitization/corruption, and recovery evidence open |
| P0-06 | **Unexpected network/privacy leakage.** Baseline Google favicon URLs, saved remote favicons, and rich-note images could send browsing context externally. | Use only local extension favicon endpoints or bundled/data assets; block remote note images/styles; separate user-invoked navigation/search from extension-directed traffic; publish an accurate privacy policy. | Network log across all critical surfaces shows zero unexpected requests; stored legacy remote URLs cannot trigger loads; policy matches behavior. | Remediation and static runtime/HTML/CSS regression preflight implemented in current worktree; installed network verification and privacy-policy evidence remain open |
| P0-07 | **MV3 CSP compliance.** Baseline inline prepaint code and inline event handlers conflict with the MV3 default `script-src 'self'` policy. | Package all logic in local scripts; remove inline handlers; declare a restrictive extension CSP; add static policy checks. Chrome's official [CSP reference](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy) says extension pages cannot run inline JavaScript under the default policy. | Packaged release loads without CSP errors; static scan finds no inline executable code/handlers; every surface passes runtime smoke. | Remediation implemented in current worktree; verification open |
| P0-08 | **Import trust boundary.** Recursive guards are implemented. Merge rekeys workspace/category/group/item graphs and ID-keyed references, preserves idless archive entries, gives imported old Trash a new retention window, and repairs older group/category reminder IDs on a cloned payload even when the receiver is already current. Replace normalizes active IDs/routes/window bindings, starts a pre-replace JSON download, rolls back on normalization/migration/write errors, and lands on Home. Deterministic every-level collision fixtures pass. A production-extracted validator corpus accepts a valid graph without mutation and rejects 33 malformed boundaries plus 128 fixed-seed structural mutations with visible errors; schema-12 reminder IDs must be valid and unique. A 1,488,149-byte current-schema fixture containing 1,024 top-level active records (1,536 counted items), 1,024 Archive, and 1,024 Trash records passes production export, FileReader parsing, validation, replace, merge, exact portable safety backup, collision-free rekeying, and rejected-write rollback without semantic loss. Numeric schemas 0–13, all six accepted app envelopes, and raw legacy pass 30 mode cases with active and Trash reminder identity coverage. A fixed-seed valid-semantic corpus adds 128 graphs, 5,013 entities, and 256 replace/merge cases with enforced coverage, exact semantic equality, unique IDs, remapped references/layout records, settings isolation, immutable input, and authoritative persistence. Four exact-byte cases cover the 20,971,520-byte acceptance boundary, one-byte pre-read rejection, and 10,551,296-byte replace/merge rollback after injected quota rejection; current, raw-legacy, generated, and quota-sized write rejection rolls back both modes. | Verify actual Chrome quota allocation, File/FileReader and downloaded-file behavior, DOM-backed sanitization, preview/error UI, alarm outcomes, and installed-browser legacy/current round trips. | Valid fixtures for every supported schema; malformed/fuzz corpus rejected safely; merge/replace are lossless and alarm reconciliation runs. | Open; core recovery remediation, numeric-schema fixtures, bounded malformed and valid-semantic fuzz, deterministic scale and exact-byte round trips, and modeled rollback implemented; real quota/FileReader, DOM sanitizer, rendered UI, alarm, and installed-browser evidence open |
| P0-09 | **Silent archive loss and destructive recovery.** The known single-item, group, and batch paths no longer cap the archive at 200. Active saved items cannot bypass recovery with direct permanent deletion: their removal action archives first, Archive moves to Trash, and Trash alone exposes a localized irreversible confirmation. Workspace/Space structural deletion now blocks whenever any group, recursively nested saved item, or category/group reminder remains; recovery guidance requires Archive/move/clear first, and only empty shells may reach a receipt-gated, localized Undo action. The Trash controller waits for the central-writer receipt before success, clears session Undo/Redo afterward, and makes stale/cancelled/rejected operations no-ops or fail-closed without a success claim. A production-extracted scale contract preserves every entity ID exactly once across 1,024 mixed records in each path; single/group restores and batch Archive → Trash → restore reproduce canonical-equivalent workspace graphs. Two further 1,024-record cases join batch Archive and Archive-to-Trash to the production page State writer, ordinary-failure handler, and storage-error router. Under an injected typed quota rejection, the dirty local graph remains visible behind the reload interlock, the authoritative graph is unchanged, storage-full feedback is routed, and a reload-style read restores every ID. The paired background-writer contract turns a quota exception into a typed failure and notification without changing stored state. A production-extracted serialized round trip also preserves semantic content, restore destinations, metadata, and entity cardinality for 1,024 Archive plus 1,024 Trash entries through replace and merge, with rollback on rejected persistence. This remains deterministic model evidence, not a real Chrome quota, rendered confirmation/recovery, download, preview, or installed-runtime test. | Keep archive paths free of silent truncation. Exercise the real `chrome.storage.local` quota boundary, installed destructive-confirmation/recovery flow (including populated organization blocking and empty-shell Undo), and installed-browser export/import at scale; if storage pressure requires policy, preserve data in Trash/export, explain it before action, and require explicit deletion. | Archive 1,000+ mixed entries through single and batch paths with no loss; populated organizations cannot bypass recovery; quota behavior is visible and recoverable; irreversible deletion is explicit, keyboard/screen-reader complete, and never falsely acknowledged; export/import round trip matches. | Open; archive-cap remediation, recoverable active-item removal, empty-only organization deletion, deterministic confirmation/persistence/focus/inertness coverage, 1,024-record transformations, injected quota/reload recovery, and serialized replace/merge pass; installed confirmation/recovery, real Chrome quota, downloaded-file/preview UI, screen-reader, user-trust, and browser evidence remain open |
| P0-10 | **Reminder/alarm drift.** Schema-12 stable reminder identities, delimiter-safe alarm names, idempotent reconciliation, nominal local-calendar recurrence, callback/Promise-settled delivery persistence, Past Due projection, and structured state-plus-alarm receipts are implemented. Item-detail and non-detail item Set/Change/quick/Clear/reschedule, Group/Space add/edit/reschedule/removal, Duplicate Group reconciliation, and Calendar Add-task use separate frozen exact-target controllers. Each real page mutation takes one localized snapshot and one combined receipt before close, render, focus, success/warning, or Undo; rejected and acknowledgement-unknown writes launch no page alarm, retry, or optimistic UI. Item and Group/Space native delivery now settles before state advancement. Production-extracted callback-only item failure/success and recurring Group success prove pending zero-write behavior, unchanged authority on error, and one central write before reconciliation on success; the Promise delivery matrix and shared hybrid wrapper coverage remain green. | Verify complete state/alarm receipts in installed Chrome, rendered one-shot Past Due behavior, real notification display, native drag, and full lifecycle across service-worker teardown, restart, sleep, cross-window mutation, transition timing, and live time-zone changes. Define recovery policy for a consumed alarm whose native creation rejects without adding a blind retry. | Callback-only and Promise notification settlement tests plus clock-controlled installed-runtime tests for restart, sleep, notification/delivery, overdue one-shots, fired recurrence, every item/group/category/Calendar mutation family, receipt teardown, DST/date-line transitions, live time-zone changes, import, deletion, and duplicate reconciliation. | Open; page-level mutation convergence, deterministic/current-source evidence, and callback-confirmed API creation before reminder-state advancement are present. Installed lifecycle/display, rejection recovery policy, real combined-receipt lifetime, native input, rendered Past Due behavior, screen-reader/zoom/forced-colors, cross-window behavior, transition timing, live time-zone change, representative-user, and release evidence remain open. |
| P0-11 | **Runtime validation gap.** Static syntax and DOM checks do not exercise the installed extension, browser permissions, multiple contexts, alarms, persistence, or CSP. | Add an installed-extension integration harness where feasible, plus a recorded human load-unpacked release checklist. Test real events, reload, service-worker restart, and network. | Versioned evidence bundle for every P0 flow; zero critical console/CSP errors; known limitations signed off. | Open |
| P0-12 | **First-use overload.** The worktree replaces the questionnaire with one localized save-first welcome, simplifies the core shell, makes Home/Library recovery durable, and gives popup single-tab, quick-capture, and whole-window saves explicit exact-destination continuations. Fast background context-menu/shortcut saves now also expose a quiet, privacy-aware native See-destination receipt and exact stable-ID continuation instead of ending at a badge. Single and bulk Reopen are converged: normal Open reuses the exact live page or Locus placeholder before creating once; Group/selection Open freezes exact per-item identity, reuses before inactive create, settles sequentially, and stops after a failed read or unknown effect. Different same-URL saves retain independent authority, every in-scope action preserves focus, and required recovery remains inline. Workspace/Space naming and empty-only removal, existing-Space Group move, Group/Stack identity, Duplicate Group, Paste links, popup/bookmark-generated Group capture, direct item fields, every reminder mutation family, Calendar Add-task, background contextual capture, and the shared exact-selection rich-text Link dialog use scoped exact-target or exact-selection controllers with fail-closed recovery, precise focus/source preservation, and Undo ownership where applicable. Import review/diagnostics and Explorer present localized Workspace/Space/Group language without renaming the internal graph. Populated organization deletion remains recovery-first and Group removal remains Archive-only. Deterministic production contracts and bounded current-source English/light plus native zh-TW/Locus Dark evidence cover the implemented page surfaces; bulk progress/result pixels, the Link, and organization-terminology slices have static or production-extracted rather than installed live-app evidence. | If owner-approved, define and run a separately backed-up migration for ambiguous legacy direct-move hints; then complete installed keyboard/screen-reader, notification, light/dark, en/zh-TW, reduced-motion, 1280×720/800 px, reload/navigation, and save-and-recover acceptance on the exact release candidate. | Formative rounds pass; then at least 12/15 new ICP users complete save-and-recover in the target time without coaching. | Open; corrective product shape and core transaction convergence are implemented with deterministic and bounded current-source evidence. Installed contextual/browser effects and notifications, rendering/accessibility, formative usability, representative-user validation, and release evidence remain absent. |
| P0-13 | **Public truth split.** Two landing sites, stale release notes, unsupported roadmap claims, and a concept site with fake quota/account/plugin/release states can mislead users or Store reviewers. The Cloudflare concept and repaired `docs/index.html` candidate are now `noindex`; the owner has not selected a public surface. | Choose one marketing surface; keep prototypes/candidates unpromoted until approved; derive README/Store/privacy/release copy from this ledger. | Claims audit has zero unapproved claims; version/release/channel facts agree; legal pages are final. | Open; surfaces quarantined and core copy repaired, owner decision and final audit open |

P0-04 evidence update (2026-07-16): new-tab and popup state clients now retry only
the exact `Receiving end does not exist` rejection and stop after three total sends
of the same immutable candidate. Persistent absence leaves authority unchanged and
produces typed background-service recovery. The receipt deadline closes the retry
lifecycle so a delayed no-receiver rejection cannot send after timeout recovery.
For the typed absence only, the explicit recovery action calls `runtime.reload()` to
replace a stale extension worker and falls back to page reload when unavailable;
other recovery causes remain page-only. Closed ports, lost responses, timeouts,
conflicts, and every other ambiguous outcome remain single-shot. Production-
extracted tests cover transient, persistent, and delayed absence, both clients, a
channel closing after acceptance, and the scoped recovery action plus fallback. This
remains deterministic injected-message/DOM-contract evidence. The user-supplied Edge
screenshot establishes the pre-fix symptom only; post-fix installed service-worker
wake/restart, rendered recovery, cross-context ordering, and source-tab behavior
remain open.

P0-10 evidence update (2026-07-16): the deterministic pending/Past due policy, a
production-extracted four-zone local-calendar recurrence contract, and the item-
detail state→alarm receipt contract are present. The time-zone matrix covers 23/25-
hour days, missing and repeated DST wall times, missing month-days, Apia's deleted
civil date, exact `until` handling, stale second-fold rejection, and background/new-
tab parity without state mutation. The detail/background contracts require exact-
item Set/Change/quick/Clear to persist before the service worker reconciles alarms,
return the structured alarm result in that one receipt, and retain accepted state
with warning on scheduling failure. The blocker remains open because installed
message-port/service-worker lifetime, restart/sleep and notification delivery,
rendered Past due interactions, non-detail item and entity mutation races, installed
transition timing, and live operating-system time-zone changes have not been
exercised.

P0-10 evidence update (2026-07-29): Group/Space destructive reminder removal now
uses the exact stable-ID controller and one service-worker-owned state→alarm
receipt from every Group, Space, and Calendar entry path. Deterministic contracts
cover sibling reorder, missing/duplicate/replaced/changed/moved failure, recovery
preflight, localized snapshot count, rejected/unknown receipts, alarm-only warning
with exact Undo, pending Escape/shortcut/history interlocks, stale captured-menu
refresh plus feedback/focus fallback, and English/zh-TW. Fresh
browser-shim evidence covers 1280×720 and 800×720 zh-TW/dark/reduced-motion
rendering, deferred-receipt behavior, focus, Undo, and clean console/page output.
P0-10 remains open for installed MV3 storage/alarm/message lifetime, cross-window
adoption, notifications, restart/sleep, rendered Past due behavior, Group/Space
add/edit/reschedule races, and live time-zone changes.

P0-10 evidence update (2026-07-29, non-detail item reminder): Board and Calendar
item Set/Change/quick/Clear/reschedule now converge on one controller that freezes
the complete Workspace/Space/Group/Stack ancestry, record/reference, item type,
location, and full-value identity. It preserves imported reminder fields and
awaits exactly one `persistNow({ reconcileReminders: true })` receipt before close,
render, feedback, or focus; the page creates or clears no alarm. Deterministic
production-controller cases cover accepted, alarm-warning, rejected, unknown,
no-op, invalid, recovery, duplicate, replacement, movement, ancestor replacement,
value change, retype, clear, and pending interlocks. Current-source browser-shim
checks cover Board Set/Clear, Calendar Edit/Clear, reload, stable focus, a
1.2-second deferred receipt, rejected-write recovery, English/light 1280×720, and
native zh-TW/Locus Dark 800×720. The deferred and rejected paths rendered no
optimistic badge; duplicate-ID scans and browser logs were empty. This supersedes
the older “non-detail item” remainder above. P0-10 remains open for installed MV3
state/alarm/message lifetime, notifications, restart/sleep, rendered Past due
behavior, cross-window mutation, and live time-zone changes. Group/Space and
Calendar Add-task convergence are recorded below.

P0-10 evidence update (2026-08-02, callback-confirmed delivery): the public
service-worker alarm contract first reproduced a callback-only native creation
failure that still advanced revision 2 to 3 and marked the item notified. Item and
Group/Space delivery now await the existing settle-once notification boundary
immediately before changing `at` or `notified`. With an item callback withheld,
delivery stays pending with one attempt, zero successful notifications, zero state
writes, and zero reconciliation. Callback error leaves authority byte-for-byte
equivalent; callback success records one notification, one central write, and the
effect order `storage-set` then `alarms-get-all`. A recurring Group callback case
advances only its stable reminder ID and re-arms its exact alarm after the same
receipt/write/reconcile order. Existing Promise-mode delivery and shared hybrid
wrapper contracts remain green. Callback-only Space behavior is compositional
through the same entity branch, not a separate dynamic case. API acknowledgement
does not prove operating-system display, and rejection adds no immediate retry or
reconciliation. Installed notification delivery, service-worker teardown,
restart/sleep, screen-reader behavior, representative-user usefulness, and release
remain open. All 36 repository JavaScript syntax checks and all 27 deterministic
commands pass, including the default 10,000-schedule concurrency gate;
`git diff --check` is clean.

P0-10/P0-12 evidence update (2026-07-29, relative time): the shared
`fmtTimeRelative()` boundary now resolves locale at each call and supplies all
future/past sub-minute, minute, hour, and day output. English keeps its compact
thresholds; native zh-TW uses **即將**, **剛剛**, and variable
**分鐘／小時／天 + 前／後** forms. The same implementation reaches reminder
badges/lists, Calendar, search, Read Later, Archive, and every existing caller.
The production-extracted suite executes 20 exact locale/threshold cases and
requires language changes to repaint dynamic surfaces. Current-source evidence
used the real settings controls to repaint one persisted timestamp
`in 58m → 58 分鐘後 → in 58m`, then covered Board and Calendar at English/light
1280×720 and native zh-TW/Locus Dark 800×720 with exact viewport widths, no
duplicate IDs/raw relative keys/scoped English relative fragments, and no browser
errors. This closes the relative-time locale residue only. The following update
records the surrounding Calendar shell; installed rendering/accessibility/user
evidence remains open.

P0-10/P0-12 evidence update (2026-07-29, Calendar shell): the routed Calendar now
uses one 33-key English/native-zh-TW family for breadcrumb, period and view
controls, filter, Past due/Today/Tomorrow sections, day counts, empty/no-match
states, feedback, source/tooltips, Undo label, and fallback item titles.
Month/Week/Agenda expose grouped state-aware semantics, filter syntax remains
literal, and user-authored names are not translated. Locale repaint preserves
the exact route/view/filter/reminder IDs and timestamps. Empty workspace and
filter-no-match states no longer stack a second Agenda message; Escape clears a
nonempty filter and restores its rebuilt input/caret. Production helper/static
contracts pass. Current-source checks cover all three views, past/future
reminders, context menu and Open/Back, filter/empty states, English/light
1280×720, and native zh-TW/Locus Dark/reduced-motion 800×720 with matching widths,
no duplicate IDs/raw keys/scoped English residue, and no browser warning/error
logs. This closes the Calendar-shell locale residue only. Installed
rendering/accessibility/user evidence remains open. The Group/Space
add/edit/reschedule and Calendar Add-task boundaries are covered below.

P0-10/P0-12 evidence update (2026-07-29, Group/Space reminder mutation):
Group/Space add, edit, and Calendar reschedule now share one exact-identity
controller while destructive removal remains separate. Picker review freezes the
Workspace/Space/optional Group references and location IDs plus the optional
stable reminder ID/reference/value. Edit preserves that ID and imported fields;
add allocates one collision-safe schema-12 ID against the current list; Calendar
reschedule owns only time and notification state. Harmless sibling reorder and
neighbor changes remain valid, while duplicate, replaced, changed, moved,
recovery-owned, invalid, and duplicate-pending targets fail closed.

A semantic no-op writes nothing. A real mutation takes one localized Set/Update
snapshot and exactly one `persistNow({ reconcileReminders: true })`; the page
entity-alarm loop and fire-and-forget writers are removed. Accepted receipts alone
close/render/focus and expose Undo, alarm failure warns, and rejected or unknown
writes remain beneath fail-closed recovery without optimistic UI or retry.
Production-extracted tests cover those identity, data-preservation, receipt,
interlock, and focus paths. Current-source interaction covers accepted Group edit,
a five-second delayed Group add with blocked Escape and exact new-row focus,
native zh-TW Space edit, reload, and rejected-write recovery at 1280×720 and
800×720. Duplicate IDs, raw keys, and browser warning/error logs are empty. The
coordinate driver did not synthesize native HTML5 drag; a test-only page-world
drag event sequence exercised the production handlers, moved the exact Space
reminder, focused its stable dot, and survived reload. Therefore native installed
drag remains open alongside MV3 storage/message/alarm/service-worker lifetime,
notification/restart/sleep, screen-reader, zoom, forced-colors, cross-window,
representative-user, and release evidence. Calendar Add-task is covered by the
following update.

P0-10/P0-12 evidence update (2026-07-29, Calendar Add-task): the day menu now
opens one localized in-product dialog that reviews the exact date, 9:00 AM
reminder, active Workspace/Space, and existing or proposed Inbox. Confirmation
re-resolves frozen destination object references and IDs, permits harmless Group
reorder and unrelated edits, rejects stale or ambiguous destinations, and
allocates unique retained IDs before creating at most one Inbox plus one
to-do/reminder. One localized snapshot and one
`persistNow({ reconcileReminders: true })` receipt own the graph, alarm outcome,
close, render, exact dot focus, feedback, and Undo. Prompt, page-alarm,
delayed-write, retry, rollback, and pre-receipt success paths are absent.

Production-extracted contracts cover destination identity, collisions,
validation, recovery, accepted/alarm-warning/rejected/unknown outcomes,
interlocks, localization, and focus. Current-source interaction covers accepted
save/reload, a 60-second delayed receipt with native Escape and Back blocked,
rejected recovery without optimistic UI, English/light 1280×720, and native
zh-TW/Locus Dark 800×720. The narrow DOM audit found no duplicate IDs, raw keys,
or warning/error logs. This closes the page-level Calendar Add-task mutation
gap, not P0-10/P0-12: installed MV3 state/message/alarm/service-worker lifetime,
notifications, restart/sleep, screen-reader, responsive/theme/locale pixels,
representative-user, and release evidence remain open.

P0-05/P0-12 evidence update (2026-07-29, popup target and generated Groups):
popup destination preview is now read-only. Explicit, remembered,
configured-default, and active destinations resolve one unique
Workspace/Space/Group hierarchy; stale, incomplete, moved, duplicate, or changed
proposed targets fail closed without fallback. One allocator reserves active,
Archive, Trash, capture/default hint, sizing, and Canvas identities across Inbox,
Session, bookmark Group, tab, and note generation. Inbox is provisioned only
inside a receipt-gated flow that needs it; Session and bookmark Groups write
directly to the reviewed Space. Bookmark import joins the popup capture mutex,
prepares detached candidates, writes once, and restores on rejection. Accepted
ordinary single-tab save fresh-checks exact tab ID/window/current URL/pending URL
before local removal.

The production-extracted popup matrix covers those destination, collision,
existing/proposed/duplicate Inbox, single/hibernate/window/bookmark, pending,
receipt, rollback, and source outcomes, and the complete mechanical block passes.
This closes the popup-generated Group provisioning implementation gap, not P0-05
or P0-12. Installed popup teardown, real bookmark/tab effects,
storage/message/service-worker lifetime, keyboard/screen-reader behavior,
representative-user validation, and release evidence remain open.

P0-04/P0-12 evidence update (2026-08-09, one-tab Hibernate interlock): the
row-level Hibernate browser effect now joins `popupCapturePending` before tab
navigation and retains it through the following popup refresh. Capture-first is
refused before navigation; Hibernate-first blocks a competing capture; success
updates once and refreshes once; failure refreshes and retries nothing; both
outcomes release the shared interlock. The production-extracted concurrency runner
also fail-fast races its existing popup write-dispatch signal against early return,
closing a stale-harness path that could previously exit Node 0 without running the
remaining schedules. The repaired fixed-seed run completes 5 client queues, 2
capture flows, 10 deterministic schedules, and 10,000 randomized schedules. This
closes the source-level overlap, not installed popup/tab/storage event ordering,
service-worker lifetime, accessibility, representative-user, or release evidence.

P0-04/P0-12 evidence update (2026-08-09, Hibernate prior-write drain): after
acquiring popup ownership, both one-tab and bulk Hibernate now await the existing
serialized state-write queue before their first tab query or effect. This prevents
an earlier selection, destination, or preference receipt from being overtaken by a
Hibernate-triggered whole-state reload. A held-write production regression fails
before the change and passes with zero early tab effects; the bulk source contract
places the same drain before candidate discovery. Persistence policy, partial-effect
reporting, and retry behavior are unchanged. Installed Chrome ordering remains open.

P0-12 evidence update (2026-07-29, rich-text Link): Board Notes, Group READMEs,
and item-detail notes now share one localized toolbar action and delegated
Ctrl/Cmd+K entry. One connected same-editor selection is frozen and visibly
reviewed; only a full HTTP(S) address plus unchanged editor HTML, selected text,
Range nodes, and offsets can reach one `createLink` command and one bubbling
`input`. Opening, cancellation, invalid input, stale/replaced/disconnected
targets, and false/thrown commands produce no accepted formatting or state write.
Existing editor blur/dirty/detail transactions remain authoritative.

The production-extracted matrix covers URL, exact-selection, failure rollback,
interlock/recovery, focus, blur ownership, localization, markup, responsive, and
reduced-motion outcomes, and the complete mechanical block passes. Browser policy
blocked the app shim; the prescribed script-free exact-fragment fallback was
visually coherent in English/light and native zh-TW/Locus Dark at 1280×720,
800×720, and 480×500 with no overflow, duplicate IDs, raw keys, warnings, or
errors. This closes the native Link-prompt implementation gap, not P0-12:
live current-source and installed MV3 interaction/persistence, actual browser
`execCommand`, screen-reader/zoom/forced-colors, formative usability,
representative-user, and release evidence remain open.

P0-08/P0-12 evidence update (2026-07-29, organization terminology): Explorer
headings, listbox names, and empty states now use one English/native-zh-TW
Space/Group/Item/Stack family. Import review localizes its metadata, modes,
actions, counts, success/warning feedback, and known validation errors. A pure
presentation helper converts indexed internal paths such as
`workspaces[0].categories[1].groups[2]` to precise one-based
Workspace/Space/Group locations; its bounded fallback removes organization
terminology without rewriting quoted user values.

The durable `categories` schema, migrations, routes, reminder owner kinds, and
portable envelopes are unchanged. Generic symbol categories and Finance
transaction categories retain their domain wording. The production/static
contract executes both locales, path/error mapping, quoted-value preservation,
dynamic repaint, Explorer copy, markup, schema preservation, and responsive CSS.
Import recovery still rejects 33 malformed boundaries plus 128 seeded mutations,
and the 1,488,148-byte scale/compatibility corpus passes.

Exact current-source fragments with production stylesheets were visually coherent
for English/light and native zh-TW/Locus Dark Explorer and Import at 1280×720 and
800×720. A 480×500 Import pass kept the header and actions visible while only the
review body scrolled. This closes the user-visible category terminology residue,
not P0-08 or P0-12: live app Import/Explorer interaction, FileReader behavior,
installed MV3 storage/message/service-worker behavior, screen-reader/zoom/
forced-colors, formative usability, representative-user, and release evidence
remain open. Any repair of ambiguous legacy direct-move hints requires a separate
owner-approved migration and restorable backup.

P0-05 evidence update (2026-07-24): whole-window popup capture now requires a
valid ordinary state receipt before dispatching its separate worker-owned close
completion. Rejected and acknowledgement-unknown writes dispatch no close request;
the serialized completion worker fresh-validates the exact saved Group, recursively
requires each expected URL to remain there, and validates each unique
`{ tabId, expectedUrl }` source against current window, active, URL, and pending-URL
state before removal, and returns truthful closed/unconfirmed counts with
authoritative destination names. Static production-source gates cover that ordering
and keep the page from owning removal. The focused production-extracted whole-window
matrix passes. The blocker remains open because installed popup teardown/message
delivery, real tab effects, service-worker
restart, quota, and installed recovery UI have not been exercised.
Ask-every-time-off quick capture now requires an accepted receipt before exposing
its exact saved-item result and uses separate serialized worker actions for Open/
Close. Its focused matrix covers exact item/owner/URL resolution, same-Workspace
move/rename, invalid destination rejection, route creation/reuse/focus with two
post-focus route reads around source validation, source window/current/pending URL
and active-transition protection, and typed unknown outcomes with no destructive
retry. Installed lifetime, real tab effects, and the final read-to-effect race keep
P0-05 open.

P0-05/P0-12 evidence update (2026-08-03, native receipt continuation): clicking
an actionable capture receipt or the popup Locate safe fallback now creates one
exact local route and fresh-reads the returned non-negative tab ID before clearing
the notification. The final tab must be active, have a non-negative integer window
ID, and match the exact committed or pending route. Wrong, inactive, unreadable,
negative, malformed, whitespace-pending, or conflicting-pending results preserve
the receipt and perform no retry. The production-extracted background matrix passes
nine continuation guards and the popup Locate suite remains green. This improves
the **See destination** recovery contract without adding a screen, copy, schema,
permission, network path, or notification outbox. P0-05 stays open for installed
notification/tab/service-worker behavior.

P0-05 evidence update (2026-08-03, post-receipt destination authority): background
item and Session cleanup now re-enter the sole writer FIFO/Web Lock after native
receipt creation, fresh-read authoritative `te`, and keep that transaction through
source effects. Single cleanup requires one unique original Workspace/Space/Group/
direct-item tuple at the accepted URL. Session source descriptors retain transient
saved-item IDs, allowing still-authoritative siblings to close while a removed or
moved source stays open and uses the existing partial receipt. Harmless newer edits
remain eligible; moved, missing, duplicated, nested, retyped, URL-changed, older,
malformed, or unreadable authority stops before the affected tab is inspected and
cannot retry, roll back, repair newer state, or emit a false not-saved warning. A
public delayed-callback red tracer first observed stale removal of tab `99`; a
whole-window replay observed tab `2`. Six production-extracted authority guards,
including writer-FIFO ownership through source removal, now pass with all 36
syntax checks, all 27 deterministic commands, the default
10,000-schedule concurrency gate, and `git diff --check`. Max-effort substitute
review found no P0; red single/window cases then closed its malformed pending and
unconfirmed-inactive source P1. The 2026-08-04 exact-receipt update below closes
the remaining deterministic generic-receipt gap.
This is deterministic mocked-browser evidence only; installed storage/
notification/tab/Web-Lock timing, service-worker teardown, native accessibility,
representative-user validation, and release remain open.

P0-05 evidence update (2026-08-04, exact receipt authority): item and whole-window
completion now require `receipt.actionable === true` before any cleanup-authority
read, tab inspection, removal, or final receipt update. A valid 170-character
Unicode Workspace ID that exceeds the notification codec only after percent-
encoding still persists unchanged and receives one generic Home receipt; every
source stays open and the initial conservative outcome remains truthful. Separate
public-listener red tracers first observed the generic page receipt claim "Page
saved" after its source closed and the generic window receipt claim "Closed 2
other tabs" after two sources closed. Eight capture-authority guards now pass,
including both fallbacks with only the two acceptance-time state reads and zero
cleanup traversal/effect. Independent max-effort review found no actionable P0/P1.
No locator storage, ID shortening, hash, migration, copy, UI, schema, permission,
host access, network path, telemetry, or privacy behavior changed. Evidence remains
production-extracted deterministic mocked-browser only. All 36 repository
JavaScript syntax checks and all 27 deterministic commands pass, including the
default 10,000-schedule concurrency gate; `git diff --check` and the untracked
current-slice whitespace scan are clean. Installed Chrome
notification limits, real tab effects, service-worker teardown, native rendering/
accessibility, representative-user validation, and release remain open.

P0-12 evidence update (2026-07-24): the whole-window popup no longer hides its
required consequence in a timed toast. The retained result names the exact
destination, saved content, and source outcome; offers an explicit Group-route
continuation; restores nested popup sections last-opened-first-closed; uses roving
save-mode radios; and localizes its radiogroup, tag, note, and close-other-tabs
names. The result primary carries the destination, saved summary, and source outcome
as its accessible description. This is production-extracted deterministic, static,
and mocked-browser evidence only.
Installed keyboard and screen-reader output, light/dark and en/zh-TW pixels, reduced
motion, 1280×720/800 px behavior, reload/navigation, formative usability, and
representative-user validation remain absent. Ask-every-time-off quick capture now
reuses that result language: accepted persistence retains the source and shows exact
Space/Group/title, Open saved item, and optional explicit Close tab with honest
protected/unconfirmed recovery. Its implementation gap is closed; installed
activation and recovery evidence remains the popup priority.

P0-12 evidence update (2026-07-29): Group/Space/Calendar destructive reminder
entry points no longer expose conflicting direct-removal behavior. They reuse one
localized responsive dialog, stable-ID review, receipt-gated pending/success/error
language, last-opened-first-closed Escape ownership, and next/previous/owner focus
return. Pending browser/programmatic navigation retains the reviewed route, and a
captured menu entry that becomes stale refreshes, explains the failure, and
recovers owner focus. The 1280×720 and 800×720 zh-TW/dark/reduced-motion browser shim is useful
rendered evidence, but not installed or user evidence. P0-12 remains open for
remaining shell/terminology work, installed keyboard/screen-reader and
light/dark/en/zh-TW pixels, reload/navigation, formative usability, and
representative-user validation. Page-level Group/Space and Calendar Add-task
convergence are recorded above.

P0-12 evidence update (2026-07-29): current-source rendering reproduced an
invisible global Save action in the default light theme. `--brand-grad` was
computed on `:root` even though its accent inputs live on the theme-bearing body,
leaving white text over a transparent button. The token now resolves on
`body[data-theme]`, and the nearest quality gate requires that scope. Browser-shim
inspection passed the repaired light and dark gradients at 1440×900, 1280×720,
and 800×720; the narrow pass used native zh-TW and reduced motion, with no
horizontal overflow, duplicate IDs, raw localization keys, or captured errors.
The full deterministic block passes. P0-12 remains open for the reproduced
English-only zh-TW sidebar-collapse accessible name, installed rendering,
forced-colors/zoom/screen-reader behavior, and representative-user validation.

P0-12 evidence update (2026-07-29): the core sidebar toggle now reports the
current next action in English and native zh-TW, synchronizes tooltip,
accessible name, `aria-controls`, and `aria-expanded`, and retains focus through
collapse/expand. Current-source checks covered both states, collapsed-state
reload persistence, 1440×900, 1280×720, and zh-TW/dark/reduced-motion 800×720.
The full deterministic block passes. P0-12 remains open for the reproduced
English **Views** navigation name in native zh-TW, other bounded core-shell
locale/accessibility residue, installed screen-reader/zoom/forced-colors evidence,
and representative-user validation.

P0-12 evidence update (2026-07-29): the reproduced core-shell residue is repaired.
The primary navigation region now exposes localized **Views / 檢視** semantics;
the user-enabled opened-tabs rail announces its localized live expand/collapse
consequence with synchronized tooltip, controlled content, and expanded state; and
the Space layout icon no longer overwrites **Switch layout / 切換版面** with an
English runtime label. Production-helper contracts cover both rail states and both
locales. Current-source Home/Space checks cover click focus, reload persistence,
1440×900, 1280×720, and the hidden rail at 800×720 without horizontal overflow or
duplicate IDs. The same native zh-TW Space render reproduced the next bounded
Board residue: English **Add tab** actions and **Write a note…** quick-entry copy.
P0-12 remains open for that creation surface, other bounded shell residue,
installed keyboard/screen-reader/zoom/forced-colors evidence, and
representative-user validation.

P0-12 evidence update (2026-07-29): the reproduced Board quick-creation residue is
repaired. Group footers now use localized **Add tab / 加入分頁**,
**Add note / 新增筆記**, and **Add to-do / 新增待辦** text, tooltips, and
accessible names. Empty Notes receive localized guidance with literal slash
commands and expose a named multiline textbox. Production-source contracts reject
the prior hardcoded runtime/CSS strings and require locale parity. Current-source
rendering covered both locales, creation focus, exact new-Note reload persistence,
1440×900, 1280×720, and native zh-TW/dark/reduced-motion 800×720 without
horizontal overflow or duplicate IDs. P0-12 remains open for the reproduced
click-only To-do completion control and English Note/To-do **Archive** names,
other bounded shell residue, installed accessibility evidence, and
representative-user validation.

P0-12 evidence update (2026-07-29): Board To-do completion is now a native,
localized state button rather than a click-only `<div>`. Its shared controller
uses the existing stored `done` field and persistence path, then focuses the same
item's rebuilt completion button after render. The editor exposes localized
single-line textbox semantics; Note/To-do Archive actions are localized; and the
To-do action strip reveals with keyboard focus. Production-helper contracts
execute both states and exact focus restoration. Current-source checks cover
completion and reload, new-To-do focus and reload, both locales, 1440×900,
1280×720, and native zh-TW/dark/reduced-motion 800×720 without overflow or
duplicate IDs. P0-12 remains open for installed Enter/Space and screen-reader
evidence, the reproduced English **Select tab / Close tab** opened-rail controls,
other bounded residue, and representative-user validation.

P0-12 evidence update (2026-07-29): the user-enabled opened-tabs rail now uses
native checkbox buttons with localized exact-tab Select/Deselect names, truthful
state, and stable-ID focus restoration after each repaint. Direct Close names the
exact tab; empty, sleeping, menu, batch badge, and drag language use both locale
dictionaries; and live language changes repaint dynamic rows. Contracts reject
the prior custom keydown and hardcoded copies. Current-source evidence covers
empty/sleeping/populated/multi-tab states, exact selection focus, batch menus, and
an exact shim tab-remove request at 1440×900 and 1280×720 plus the hidden
zh-TW/dark/reduced-motion rail at 800×720. P0-12 remains open for installed
keyboard/screen-reader/drag and real tab effects, the reproduced pointer-only
English **Resize** Group handle, other bounded residue, and representative-user
validation.

P0-12 evidence update (2026-07-29): Board Group resize is now two localized
native controls with exact Group context. Width accepts Left/Right; the corner
accepts all Arrow keys; normal and Shift steps are 16/48 px with existing bounds.
Both paths preserve the existing `{ w, h }` record and one persistence request.
Pointer resizing uses capture and handle-local lifecycle listeners instead of
registering document move/up listeners on every render. Production helpers execute
keyboard steps, pointer deltas, all bounds, untouched-axis behavior, and the exact
writer. Current-source visuals and keyboard persistence cover 1440×900,
English/light 1280×720, and native zh-TW/dark/reduced-motion 800×720. The in-app
driver emitted no continuation after captured `pointerdown`, so real pointer
completion is not claimed. The scoped zh-TW Board scan found no further app-owned
English core-control residue. P0-12 remains open for installed pointer, keyboard,
screen-reader, zoom/forced-colors, other reproduced workflow failures, and
representative-user validation.

P0-12 evidence update (2026-07-29): the reproduced Board item-color failure is
repaired. Note and To-do wrappers now share pointer plus Shift+F10/Context Menu
opening with first-action focus, and the Note action uses independent English and
native zh-TW copy. The direct color surface is one localized six-button
radiogroup with truthful selection, visible 32×32 px targets, Arrow/Home/End
movement, bounded placement, and centrally owned Escape/Tab/outside/reopen
cleanup. Its mutation controller exhaustively resolves the exact current item and
reference, treats the same value as a no-op, and rejects invalid, duplicated,
replaced, Stack, or recovery-blocked targets before mutation. One valid change
uses one localized history record, existing `item.color` representation,
persistence request, render, and same-ID focus.

Production-extracted and static contracts cover all of those boundaries and
reject the former zero-size `<div>` palette, English **Edit**, and leaking delayed
listener. Current-source interaction covered zh-TW pointer/Shift+F10 focus,
Arrow/Escape, exact semantics and geometry, change/refocus/reload at 1440×900,
plus English/light 1280×720 and native zh-TW/Locus Dark 800×720 without overflow,
duplicate IDs, raw keys, or browser errors. The browser driver did not synthesize
native Enter/Space activation and did not expose reduced-motion/forced-colors
media emulation; those remain native-semantic/static evidence. P0-12 remains open
for installed keyboard/screen-reader/zoom/theme/media behavior, other reproduced
workflow failures, formative usability, and representative-user validation.

P0-12 evidence update (2026-08-12): the shared action menu used across Home/Inbox,
Board/List records, Group/Stack controls, Library, and layout selection now presents
one Locus Index filing sheet instead of the legacy translucent glass/spring surface.
The same controller retains Arrow/Home/End, contained Tab, Enter/Space, outside
dismissal, true LIFO Escape, and opener focus return. Presentation is bounded to
220-320 px and the viewport; uses 40 px rows, a blue top/focused-row locator,
non-color-only focus, reduced-motion suppression, and forced-color equivalents;
and has a localized menu name. Find/review, Organize, Views, Board/List, and every
Advanced layout name now have independent English/native zh-TW dictionary entries.
Board/List remain core and uneven layouts remain under Advanced views. The first
focused contract rejected the missing bounded sheet; all 38 JavaScript syntax
checks and all 29 deterministic/stress runners then passed, including 10,000
concurrency schedules. Browser policy rejected the removed local presentation
reference before rendering and was not bypassed. P0-12 therefore remains open for
installed and rendered light/dark/en/zh-TW pixels, native keyboard/screen-reader/
forced-color output, exact 1280x720/800/520 geometry, zoom/navigation, formative
usability, and representative-user validation.

P0-12 evidence update (2026-08-12): command and shortcut discovery now use one
localized Locus Index presentation and one immutable definition model. The command
palette retains its real command registry, order, combobox active-descendant model,
Arrow/Home/End/Enter behavior, contained Tab, true LIFO Escape, and opener return,
but replaces blurred/spring glass with a flat viewport-bounded filing sheet, dark
query owner, 3 px blue locator, 44 px rows, explicit focus, reduced-motion
suppression, and forced-color equivalents. Settings and the compact shortcut dialog
now project 14 app rows, 13 reference rows, and 2 Chrome-command rows from the same
English/native zh-TW source. Browser-assigned shortcut strings remain live through a
guarded `chrome.commands.getAll()` read; loading, unavailable fallback, and an
assigned-but-blank **Not set** state are explicit, while browser descriptions are not
treated as copy authority. The static hardcoded cheatsheet rows and `APP_SHORTCUTS`
fork are removed. The first focused contract rejected the absent no-blur/
no-animation surface; all 38 JavaScript syntax checks and all 29 deterministic/
stress runners then passed, including 10,000 concurrency schedules. Installed MV3
was unavailable and the prior browser security policy forbids bypassing its rejected
local presentation route. P0-12 therefore remains open for real light/dark/en/zh-TW
pixels, customized Chrome keys, native keyboard/screen-reader/forced-color output,
exact 1280x720/800/520 geometry, reload/navigation, formative usability, and
representative-user validation.

P0-12 evidence update (2026-08-12): the global in-page feedback surface now uses
one durable Locus Index filing receipt instead of a springing rounded green toast.
The existing receipt host and action/Undo IDs remain, with one localized native
Close control, a 4 px success/information/warning/error locator, readable wrapping
copy, 40 px controls, explicit focus, deliberate 520 px reflow, reduced-motion
suppression, and forced-color equivalents. Errors alone use assertive alert
semantics. A real continuation, exact Undo action ID, or explicit persistent receipt
never receives an expiry timer; passive feedback may expire, but focus or pointer
reading holds it. Close and receipt-focused Escape dismiss one receipt and restore
its connected opener without entering the global overlay stack. Touched core
storage, cross-window, Archive, intention, Stack, bookmark, export, no-tab, and
save-destination copy now resolves from independent English/native zh-TW entries;
accepted-but-uncertain outcomes use warning semantics. No save acknowledgement,
Undo ID/callback, route, state, schema/import byte, stable ID, permission, browser
effect, stored feed, or notification center changed. The first focused contract
rejected the missing Close control; all 38 JavaScript syntax checks and all 29
documented deterministic/stress runners then passed, including 10,000 concurrency
schedules. P0-12 remains open for installed pixels and timing, asynchronous post-
Undo focus after rebuild, native keyboard/screen-reader/forced-color behavior,
exact 1280x720/800/520 geometry, theme/locale switching, reload/navigation,
formative usability, and representative-user validation. The adjacent English-only
legacy storage-full recovery dialog is not included in this evidence.

P0-05/P0-09/P0-12 evidence update (2026-08-12, storage-quota recovery): the
storage-full boundary now presents one backup-first Locus Index recovery sheet above
the fail-closed reload interlock. It distinguishes the current unsaved in-memory
view from the latest saved copy, reports real browser-profile usage or an explicit
unavailable state, and leads with an export of the current graph. Its success copy
claims only that the download was requested; it does not claim browser completion.
Reload to Archive and reload saved data state their replacement consequences, and
the guidance does not claim that Archive alone frees storage. Independent English
and native zh-TW cover loading, known, unavailable, pending, success, failure, and
recovery states. Pending backup blocks duplicate activation and every dismissal or
reload path; ordinary Escape closes only the quota layer and hands focus to the
reload interlock underneath. No automatic retry/deletion, quota increase, export
payload, persistence, route model, schema/import byte, permission, host/network
access, or user data changed. The first focused contract rejected the absent atomic
described dialog; focused production-extracted and source checks then passed. All 38
JavaScript syntax files and all 29 documented deterministic/stress runners pass,
including 10,000 concurrency schedules (69,880 attempts).
P0-05/P0-09/P0-12 remain open for real Chrome quota and download completion,
installed recovery pixels and effects, native assistive technology, representative-
user trust/activation, and release evidence.

P0-05/P0-09/P0-12 evidence update (2026-08-12, Settings Storage ledger): the
adjacent Settings surface now reports the exact browser-profile usage authority and
the current Locus JSON estimate as separate measures. The native meter uses only the
real storage read and has explicit loading, warning, full, unavailable, and guarded
retry states; an older asynchronous result cannot overwrite a newer one. The ranked
estimate uses UTF-8 bytes from the real in-memory graph, partitions the serialized
total exactly without double-counting Stack children, and keeps Archive and Trash
disjoint. Real Archive/empty states and uninstall/profile-loss backup consequences
resolve independently in English and native zh-TW. No data write, cleanup, quota
policy, export/import payload, schema byte, stable ID, route, permission, host/network
access, or fake populated state changed. The first focused contract rejected the
missing localized native meter; production-extracted behavior and the complete 38-
file/29-runner deterministic suite then passed, including 10,000 concurrency
schedules. P0-05/P0-09/P0-12 remain open for real Chrome usage/quota and retry
timing, installed pixels, native assistive technology, representative-user trust/
activation, and release evidence.

Official storage facts used by P0-05: Chrome documents that `storage.local` is asynchronous,
has a 10 MB default limit, and is
[cleared when the extension is removed](https://developer.chrome.com/docs/extensions/reference/api/storage#property-local).

## 9. Privacy-compatible measurement and gates

### 9.1 Measurement policy

The extension ships with no silent product analytics or developer-directed telemetry.
Success will be measured through:

1. **Local counters owned by the user**, limited to event names, timestamps, durations, and
   outcomes—never titles, URLs, domains, note text, queries, or workspace names.
2. **Explicit research export**, opt-in per study, previewed before sharing, revocable until
   submission, and deleted on the research schedule.
3. **Moderated observation and diary studies** with consent.
4. **Aggregate Store and website funnel data**, kept separate from extension workspace data
   and disclosed in the website privacy policy.
5. **Support and uninstall surveys**, optional and never injected into browsing pages.

There is no cross-site identity stitching, ad profiling, browsing-history telemetry, or hidden
diagnostic upload. If this policy changes, it requires owner approval, a privacy review, a
prominent disclosure, consent, and an updated claims ledger before code ships.

### 9.2 Local event vocabulary for beta research

Allowed local diagnostic events:

- `first_open`
- `save_started`, `save_persisted`, `save_failed`, `source_tabs_closed`
- `destination_seen`
- `recovery_started`, `recovery_succeeded`, `recovery_failed`
- `export_started`, `export_succeeded`, `import_succeeded`, `import_failed`
- `reminder_scheduled`, `reminder_delivered`, `reminder_reconciled`
- `app_error` with a local error code, never user content

Every event schema must be documented. Unknown fields are prohibited. Diagnostics export is
off by default and separate from normal workspace export.

### 9.3 Non-negotiable safety and release gates

All must pass on the exact release artifact:

| Gate | Target |
|---|---:|
| Accepted concurrent mutations lost | **0** across deterministic cases plus at least 10,000 randomized interleavings |
| Duplicate tabs created by rapid identical Reopen actions | **0** in deterministic same-document and confirmed cross-document schedules; installed unknown-receipt behavior must also pass |
| Duplicate tabs created for already-open bulk targets, or speculative later effects after a failed/unknown bulk result | **0** across exact live/suspended reuse, failed-read, and unknown-effect schedules |
| Source tabs closed after failed/unconfirmed persistence | **0** |
| Valid schema fixture round trips with unequal semantic state | **0** across every supported schema and merge/replace mode |
| Silent archive/trash loss | **0** at 1,000 archived entries and quota-boundary tests |
| Missing/duplicate/orphan alarms after reconciliation | **0** in the defined restart/import/time scenarios |
| Unexpected external requests | **0** in scripted new-tab, popup, save, search-local, detail, import, reminder, settings, placeholder, and theme flows |
| CSP violations or critical console errors | **0** |
| Critical accessibility blockers in the core loop | **0** |
| Required permissions without a current feature and disclosure | **0** |
| P0/P1 unresolved security or data-loss defects | **0** |

Opening a destination is an expected user-invoked network action. Tests must identify it
separately rather than hiding it in an aggregate request count. Saved-content search is
local and must not create an external request.

### 9.4 Product and market decision metrics

These are initial decision thresholds, not current achievements or industry facts. They may
be revised once after the first measured baseline; later changes require an owner decision
record to prevent moving the goalposts.

| Metric | Promote | Hold / investigate | Kill or reposition condition | Minimum evidence |
|---|---:|---:|---:|---|
| New-user save-and-recover completion | ≥12/15 without coaching | 9–11/15 | ≤8/15 after two correction rounds | 15 representative new ICP users on release candidate |
| Time to first durable save | ≥80% within 60 seconds | 60–79% | <60% after two rounds | Same validation cohort |
| Time to recover after save | ≥80% within an additional 30 seconds | 60–79% | <60% after two rounds | Same validation cohort |
| Week-1 repeat value | ≥60% of activated users complete another recovery | 35–59% | <35% after onboarding defects are removed | ≥30 activated beta users |
| Week-4 retained value | ≥30% of activated users recover context in week 4 | 15–29% | <15% in two consecutive cohorts | ≥30 activated users per cohort |
| Core value frequency | ≥50% of retained users complete at least two recoveries in a measured week | 25–49% | <25% in two cohorts | Opt-in local diagnostics + diary check |
| “Very disappointed” without Locus | ≥40% | 25–39% | <25% after stable retention | ≥40 retained, recently active respondents |
| Qualified landing → Store click | ≥15% | 8–14.9% | <8% after two truthful message tests | ≥500 qualified visits; bot/internal traffic excluded |
| Store page → install | ≥20% | 10–19.9% | <10% after listing correction | ≥500 Store page views where available |

Do not optimize acquisition before safety, activation, and retention gates. A high install
count with low recovery or unsafe persistence is failure.

### 9.5 Performance gates

Define and publish a reference machine, browser version, dataset generator, cold/warm method,
and number of runs. Initial release thresholds:

- usable new-tab interaction at p75 ≤1 second warm and ≤2 seconds cold with 1,000 items;
- local search p95 ≤150 ms with 5,000 mixed items and a representative operator query;
- confirmed local save p95 ≤750 ms before any source-tab closure;
- no clipped primary core-loop action at 1280×720 or 800 px width;
- no memory-reduction marketing number until at least 20 controlled runs compare identical
  live destinations, suspended placeholders, and saved records, reporting median and range.

## 10. Evidence-gated roadmap

Roadmap order is determined by gate dependencies, not screenshot availability or implementation
novelty. No new top-level surface enters the roadmap before Stage 2 exits.

### Stage 0 — Truth, policy, and data safety

**Purpose:** make the product safe and claimable.

Work:

- close P0-01 through P0-13;
- choose license/business model and public name;
- define the one-purpose Store candidate and remove unrelated default scope;
- serialize mutations and prove no lost updates;
- finish import, archive, reminder, CSP, privacy, backup, and release validation;
- collapse public documentation onto one approved claims ledger.

**Exit:** every non-negotiable safety gate passes and all owner decisions required before
beta are signed.

### Stage 1 — One obvious core loop

**Purpose:** make first use explain the thesis through action.

Work:

- implement UX simplification phases 0–3;
- one welcome card: Save your first tab / Explore on my own;
- direct handoff to simplified Home, not a second landing screen;
- one Home-owned primary Save action, with one adjacent explicit keep-open/close
  inverse and no competing Home Save entry point; opened-tabs rail collapsed by
  default;
- core nav: Home, Inbox, All Links, Spaces, More;
- inline persistence/destination confirmation and recovery continuation;
- Calendar, advanced layouts, tools, filters, Archive, and Trash remain contextual/Advanced.

**Exit:** formative tests pass, then 12/15 validation users complete the core loop without
coaching and within the time targets.

### Stage 2 — Closed retained beta

**Purpose:** test whether the core loop creates repeated value.

Work:

- recruit at least 30 activated ICP participants under legally permitted use;
- run four weeks with consented local diagnostics export and weekly diary prompts;
- observe failed saves, recovery paths, backup behavior, and reasons for abandonment;
- run the RAM benchmark and permission/privacy comprehension test;
- fix only drivers of safety, activation, retention, and trust.

**Exit:** Week-1 and Week-4 promote thresholds pass; no data-loss incident; at least 80% of
participants correctly understand explicit-save, local-storage, uninstall, and network limits.

### Stage 3 — Chrome Web Store release candidate

**Purpose:** earn trustworthy distribution.

Work:

- Chrome-first listing under the cleared name;
- final privacy policy, license/EULA, permission rationale, support and backup instructions;
- one truthful product story: save → locate → recover;
- real screenshots and measured claims only;
- signed artifact, release evidence record, rollback package, and support triage path;
- Edge packaging follows only after the Chrome artifact is stable.

**Exit:** policy preflight passes, release artifact passes every P0 gate, listing claims audit
has zero exceptions, and the Store channel is live.

### Stage 4 — Retention and switching pull

**Purpose:** deepen demonstrated value rather than add generic breadth.

Candidate work, each independently gated:

- importers for OneTab, Session Buddy, Tablerone, or other formats with measured demand;
- stronger local backup/recovery;
- search discoverability tied to observed recovery failures;
- contextual reminder and Calendar improvements;
- one advanced layout at a time when a real workflow demands it.

**Exit:** two consecutive cohorts meet retention thresholds and at least one switching or
recovery improvement produces a measured lift without harming activation.

### Stage 5 — Compounding assets

**Purpose:** test defensibility after product-market evidence exists.

Possible bets:

- safe, reviewable workspace-pack files;
- an open, versioned portable-browser-context format;
- static first-party templates followed by community-contributed data-only templates;
- a public trust record: permissions, network audit, migration compatibility, and incident log.

Sync, accounts, mobile, collaboration, remote plugins, AI, and billing are not implicit parts
of this stage. Each requires a separate strategy and threat model.

## 11. Promote, hold, and kill rules

### 11.1 Global rules

**Promote** only when:

- safety and policy prerequisites pass;
- the feature has one clear target job and entry point;
- it is Implemented and Verified on the candidate artifact;
- the predefined user or market threshold passes at the minimum sample;
- it does not worsen core-loop completion, first paint, permissions, or privacy;
- evidence and claim wording are recorded.

**Hold** when:

- the sample is below the stated minimum;
- the result is in the hold band;
- confounds or implementation defects prevent interpretation;
- a dependency or owner decision remains open.

A Hold does not authorize more surface area. Fix the confound or stop the experiment.

**Kill, hide, or reposition** when:

- it violates privacy, Store policy, license, or a no-silent-loss principle;
- two adequately powered tests miss the kill threshold after usability defects are fixed;
- it adds default-visible complexity without improving the target task;
- maintenance or permission cost exceeds demonstrated retained value;
- its value depends on a different ICP.

Sunk implementation effort is not evidence.

### 11.2 Bet-specific rules

| Bet | Promote | Hold | Kill/hide |
|---|---|---|---|
| Calendar in primary nav | ≥8/10 users with real reminders find it useful and core activation is unchanged | Sparse reminder use or inconclusive sample | Keep under More if it distracts before reminder intent |
| An advanced layout | ≥8/10 target-workflow users complete the named task better than Bento/List; repeat use in beta | Preference without task improvement | Keep Advanced or remove from release candidate |
| Generic personal trackers | Documented Store-policy safety plus strong demand from retained core users | Any policy ambiguity | Exclude from initial Store candidate; kill as primary positioning |
| Competitor importer | ≥5/15 ICP interviews request it and ≥30% of qualified beta recruits have usable source data | Interest without available exports | Do not build for hypothetical refugee traffic |
| Workspace packs/templates | Core Week-4 retention passes and at least 10 real sharing attempts are observed | Users like examples but do not share | Stop the “network effect” thesis |
| Sync | More than 40% of retained users identify multi-device absence as their top blocker, and a privacy/business architecture is approved | Requested by non-ICP users | Keep out of initial product; kill any casual roadmap promise |
| Product thesis | Two cohorts pass Week-4 retention | One cohort or unresolved safety/onboarding defects | Reposition or stop if two clean cohorts remain below 15% Week-4 retention and interviews show weak problem pull |

## 12. Research and experiment templates

Store completed records in a dated research log or linked issue. Summaries without raw evidence
location are not sufficient.

### 12.1 Problem interview record

```text
Study ID / date:
Research owner:
Decision this study will inform:
Target segment and exclusions:
Recruiting source:
Participants planned / completed:
Consent and retention plan:

Hypotheses:
1.
2.

Past-behavior questions:
- Tell me about the last time open tabs became a problem.
- What did you do, in what order?
- What did you fear losing?
- What have you tried, paid for, abandoned, or uninstalled?
- When did you last recover something you had saved?
- What makes an extension trustworthy or unacceptable?

Observed evidence, not opinions:
Contradicting evidence:
Segment differences:
Decision: promote / hold / kill / revise
Follow-up owner and date:
Raw evidence location:
```

Do not pitch Locus before the past-behavior section ends. Feature requests are weak evidence
unless tied to a recent failed job and a meaningful workaround or cost.

### 12.2 Core-loop usability record

```text
Study ID / build commit / artifact hash:
Participant segment:
Starting browser state and tab set:
Moderator script:

Task 1: Save the page so you can close it and return later.
Task 2: Navigate elsewhere or reload.
Task 3: Find and reopen what you saved.

No-coaching completion: yes / no
Time to durable save:
Could identify destination: yes / no
Time to recovery:
Errors / backtracks / misleading labels:
Understanding of unsaved tabs:
Understanding of local storage and uninstall:
Confidence score and reason:
Critical observation clips/notes:
```

### 12.3 Experiment card

```text
Experiment ID / owner / dates:
Decision:
Hypothesis:
ICP and exclusion criteria:
Current baseline:
Single changed variable:
Primary metric:
Guardrails:
Promote / hold / kill thresholds:
Minimum sample and stopping rule:
Privacy/data collected and retention:
Implementation/artifact:
Result with uncertainty:
Confounds:
Decision and approver:
Claims/roadmap/docs changed:
```

### 12.4 Technical evidence record

```text
Gate ID:
Artifact commit/hash and browser version:
Environment:
Dataset/fixture seed:
Exact commands or manual protocol:
Expected result:
Actual result:
Logs/screenshots/report location:
Known limitations:
Pass / fail / unavailable:
Verifier and date:
Expiry/retest trigger:
```

### 12.5 Release evidence record

```text
Version and channel:
Commit and artifact hash:
Manifest permissions and policy mapping:
P0 evidence bundle:
Claims ledger diff:
Privacy/license/name approvals:
Migration/rollback rehearsal:
Known limitations shown to users:
Published URL and date:
Rollback owner and package:
Post-release observation window and stop conditions:
```

## 13. Owner decisions

Open owner decisions block the associated gate. The recommended default applies only to
prevent accidental expansion; it is not a substitute for a signed decision.

| ID | Decision | Recommended default until decided | Owner / adviser | Required by | Status |
|---|---|---|---|---|---|
| O-01 | Is success adoption/trust, a sustainable business, or a research/contribution project? | Optimize for trusted retained adoption first; make no revenue claims. | Product owner | Before broad beta recruitment | Open |
| O-02 | What license permits the intended user's ordinary use? | Treat product as noncommercial research alpha and exclude employer/client use. | Product owner + IP counsel | Before Store submission or commercial-user marketing | Open |
| O-03 | Is “Locus” clearable and distinguishable? | Treat Locus as a working name; do not finalize Store/domain/paid creative. | Product owner + trademark counsel | Before Store listing assets | Open |
| O-04 | What is the single-purpose Store SKU? | Save/organize/recover browser context; exclude generic trackers from candidate. | Product owner + Store policy adviser | Before release-candidate freeze | Decided 2026-08-09; policy review remains under P0-03 |
| O-05 | Is any opt-in diagnostics channel acceptable? | No silent telemetry; consented local export for research only. | Product owner + privacy adviser | Before closed beta instrumentation | Open |
| O-06 | What durability promise and backup burden are acceptable? | Manual export with explicit uninstall/profile-loss warning; no “forever” claim. | Product owner + engineering | Before beta handles valuable data | Open |
| O-07 | Is sync strategically excluded or merely deferred? | Excluded from the initial ICP and roadmap until the section 11 threshold passes. | Product owner | Before any public roadmap | Open |
| O-08 | Which landing site is canonical? | Use the truthful `docs/index.html` lineage after claims repair; quarantine the Cloudflare concept demo. | Product owner + marketing | Before any public traffic | Open |
| O-09 | Which launch browser comes first? | Chrome first; Edge after the exact Chrome artifact is stable. | Product owner + engineering | Before Store packaging | Open |
| O-10 | Who owns research operations and support response? | Product owner until explicitly delegated; cap beta size to support capacity. | Product owner | Before recruiting the retained beta | Open |

Decision record format:

```text
Decision ID / date:
Owner:
Context and evidence:
Options considered:
Decision:
Consequences and risks accepted:
Documents/code/listings to update:
Revisit trigger/date:
```

## 14. Operating cadence and change control

### Every improvement cycle

1. Name the target metric or P0 gate before implementation.
2. Write the interaction/data/failure contract.
3. Record Implemented, Verified, User-validated, and Released separately.
4. Update STATUS with evidence links and the next highest-risk unknown.
5. Update the claims ledger only if the evidence gate passed.

### Weekly before launch

- review every open P0 blocker and owner decision;
- review new evidence and contradicting observations;
- inspect unapproved public claims and marketing drift;
- confirm no feature work bypassed the stage gate;
- publish a short decision log, including “no change.”

### Monthly after launch

- acquisition, activation, Week-1/Week-4 retained value, support, and safety review;
- permission/network/privacy and data-loss incidents;
- promote/hold/kill decisions;
- release and claims audit.

### Quarterly

- refresh competitor and browser-native evidence from first-party sources;
- refresh Store policies and permission requirements;
- review name/trademark and license assumptions;
- revisit ICP only when evidence, not aspiration, shows a different segment has stronger pull.

### Change rule

Any change to the thesis, ICP, privacy boundary, business model, name, north-star metric,
decision thresholds, or stage order requires an owner decision record. A preview, competitor
feature, or completed implementation does not change strategy by itself.

## 15. Strategy summary

Locus does not win by having the most surfaces. It earns the right to grow by proving five
things in order:

1. a saved item cannot be lost through ordinary concurrent use, quota, archive, import, or
   restart paths;
2. the privacy and permission story is technically true and precisely worded;
3. a new ICP user can save, locate, and recover without coaching;
4. that user repeats the recovery behavior four weeks later;
5. a truthful, single-purpose Store listing converts enough of the right users to sustain
   learning.

Until those are true, added breadth increases risk faster than value. The governing rule is:

> **Protect the data. Prove the loop. Earn the claim. Then earn the complexity.**

### Drag Save must obey the user's duplicate choice (2026-08-13)

The duplicate-URL setting is a capture policy, not a button-specific suggestion.
Space, Group, and Stack drops now preserve a same-URL page when duplicates are
allowed and retain the established Already saved/no-write result when
deduplication is enabled. This keeps separate same-URL work contexts recoverable
without adding a new control or changing persistence, destination, permissions, or
privacy boundaries. Production-extracted allowed/blocked cases and static caller
contracts pass; installed native drag, representative-user validation, approval,
and release remain open.

### A visible Save command must have a successful source (2026-08-13)

The command palette runs inside Locus, so its active browser tab is Locus itself,
not the page the person expects to file. Palette Save now reads the fresh window
inventory and selects the most recently used stable eligible page through the same
policy as the top-bar flow. It retains exact Inbox recovery and gives a localized
no-save result when no page can safely be selected. This repairs a dead core-loop
entry point without adding UI, permissions, network access, or another decision.
Production-extracted success/failure cases pass; installed browser and
representative-user validation remain open.

### Skip duplicates inside one accepted popup batch (2026-08-13)

When Skip duplicate URLs is enabled, the destination includes records accepted a
moment earlier in the same Save, not only records that existed before it started.
Save-before-Hibernate and Links/Queue now reserve each accepted exact URL before
checking the next source. Allowing duplicates and fresh Session capture retain
their established source multiplicity, and record deduplication does not discard
guarded cleanup descriptors. This keeps receipts and later Find results consistent
without adding a control or changing privacy, permissions, or persistence. Focused
production-extracted cases pass; installed effects and representative-user
validation remain open.

### Skip duplicates inside one existing Group or Stack batch (2026-08-13)

Selected existing-Group Save and multi-tab Group/Stack drop now treat earlier
accepted sources in the same action as part of the destination. With deduplication
enabled, one exact URL becomes one record; allowing duplicates retains every
source. Fresh generated Groups remain complete source snapshots. This aligns
new-tab convenience paths with the stated Capture preference without adding UI or
changing storage, permissions, network access, or receipt recovery. Focused
production-extracted behavior passes; installed drag/selection and representative-
user validation remain open.

### Group Save-here must reach a real page (2026-08-13)

The active tab while a person uses Locus is Locus, so it cannot be the fallback
source for an in-app Group Save. Board/List Save-here now preserves explicit
sidebar selection first, then chooses the freshest stable eligible page from a
fresh current-window inventory when nothing is selected. It retains exact Group
location and recovery without adding UI, permissions, network access, or another
decision. English and native zh-TW describe the recent-page behavior truthfully.
Focused production-extracted success/failure cases pass; installed browser and
representative-user validation remain open.

### Never trade a live page for an unusable record (2026-08-13)

A confirmed Save is useful only when Locus can reopen the stored address. Popup
single, window, Hibernate, and bookmark capture now share the same positive
`http`/`https`/`ftp`/`file` boundary as Reopen. Unsupported pages remain open and
are never included in cleanup. This removes a deterministic data-loss path without
adding a decision, surface, permission, network request, or migration. Focused
production-extracted cases pass; installed effects and representative-user
validation remain open.

### Accepted Save truth outranks the reviewed route (2026-08-13)

If storage accepted a first Save but its Inbox changed during the operation, Locus
must say the Save was accepted without pretending the old path is still current.
Home now withholds its green route confirmation, and Welcome completes without
navigating through the stale Inbox or inviting another Save. The existing warning,
Undo, and source consequence carry the truth. Focused production-extracted cases
pass; installed interleaving and representative-user validation remain open.

### Imported bookmarks must complete Find to Reopen (2026-08-13)

Bookmark import is a convenience path into the same saved-page library, not an
exception to its recovery contract. Settings now imports only addresses the Open
flow supports and counts only those accepted records. Bookmarklets, inline data,
blobs, mail actions, and malformed addresses no longer become dead search results.
Focused production-extracted scale/compatibility cases pass; installed bookmark
traversal and representative-user validation remain open.

### Imported bookmarks must remain exactly findable (2026-08-13)

Bookmark import now shares one collision-safe identity allocator across its new
Group and every accepted page. A generated value already used by active content or
retained as a restore/layout/Capture destination is skipped, so a successful import
does not create an ambiguous Find or Reopen target. No new decision, migration,
surface, permission, or network path was added. Focused production-extracted
collision evidence passes; installed bookmark traversal and representative-user
validation remain open.

### Never close the source after its accepted copy disappears (2026-08-13)

Ordinary popup Save now asks the serialized worker to fresh-confirm the exact saved
item before closing its source. A later write that removes or replaces that item
leaves the browser page open and keeps the accepted-Save result truthful; Locus does
not retry the write or invite a duplicate. No new decision, surface, permission, or
network path was added. Focused production-extracted evidence passes; installed
MV3 timing and representative-user validation remain open.

### An unavailable destination must not keep its old label (2026-08-13)

Whole-window Save now prints a Space/Group path only when the serialized worker
confirms it. If the destination disappeared or the effect is unknown, the accepted
result stays visible without an obsolete filing label. This removes contradictory
guidance without adding a decision, surface, permission, or network path. Focused
production-extracted evidence passes; installed timing and representative-user
validation remain open.

### Accepted Save truth must survive a failed source close (2026-08-13)

When popup Locate opens the exact saved item but cannot confirm closing the source,
that is a partial browser effect, not full success and not a failed Save. Locus now
keeps the Saved result visible, preserves exact current destination recovery, leaves
the source open, and reports best-effort notice creation without retrying the write,
route, or cleanup. This removes a silent false-success path without adding a user
decision, surface, permission, network request, or migration. Focused production-
extracted evidence passes; installed MV3/notification timing and representative-user
validation remain open.

### A missing saved target must not keep its old filing label (2026-08-13)

Popup Locate can run after another accepted Locus mutation. If its worker can no
longer resolve the exact saved item, the earlier reviewed Space/Group is not a
current destination receipt. Locus now keeps the Save accepted and source open,
prints no obsolete path, and offers generic local recovery without retrying the
write or effect. This removes false filing guidance without adding a decision,
surface, copy, permission, network request, or migration. Focused production-
extracted evidence passes; installed ordering and representative-user validation
remain open.

### A local record must keep one exact identity through recovery (2026-08-13)

Notes and To-dos enter the same Find/Details system as saved pages. Their shared
creator now skips IDs already active or retained in Archive/Trash and carries the
one fresh object through acknowledged persistence and Details opening. This closes
an ambiguity path without adding a decision, surface, copy, permission, network
request, migration, or data rewrite. Focused production-extracted Note/To-do
collision evidence passes; installed persistence and representative-user
validation remain open.

### The first Inbox must be uniquely addressable before the first Save (2026-08-13)

An empty Locus graph now allocates My Workspace, Pinned, Inbox, and Later from one
collision-safe identity set. Values retained by Archive/Trash and a repeated value
within the same default batch are skipped, so the first saved page has one exact
destination for Find and Reopen. No user decision, surface, copy, permission,
network request, migration, or data rewrite was added. Focused production-extracted
first-use collision evidence passes; installed clean-profile behavior and
representative-user validation remain open.

### A convenience action must have something useful to do (2026-08-13)

Group Open all now appears usable only when that exact Group contains at least one
page Locus can reopen, including inside a Stack. Empty, local-record-only, and
unsafe legacy-only Groups no longer invite a guaranteed no-op; eligible Groups keep
the existing exact bulk Reopen and recovery path. No decision, surface, copy,
permission, network request, migration, or data rewrite was added. Focused
production-extracted evidence passes; installed rendering/effects and
representative-user validation remain open.

### Save here should find the next useful page automatically (2026-08-13)

When the most recent browser page is already in the chosen Group, Save here now
continues to the next recent unsaved eligible page instead of stopping with an
Already-saved result. Explicit selection, allowing duplicates, exact filing
receipts, and source protection remain unchanged. This removes manual hunting
without adding a prompt, control, permission, network request, migration, or data
rewrite. Focused production-extracted evidence passes; installed tab ordering/
effects and representative-user validation remain open.

### A Stack must not hide a duplicate from the user's preference (2026-08-13)

When Skip duplicate URLs is enabled, a page already filed inside a nested Stack
now counts as present in that exact destination across Home, Board/List, drag,
popup, Hibernate, context-menu, and shortcut capture. Exact URL matching,
duplicates-allowed behavior, and current-batch reservation remain unchanged. This
closes a trust gap without adding a decision, surface, copy, permission, network
request, migration, or data rewrite. Focused production-extracted evidence passes;
installed browser effects and representative-user validation remain open.

### Recent Save shortcuts should continue to an unsaved page (2026-08-13)

Top-bar and Palette Save now skip a newer page already filed in the active Inbox
and choose the next recent unsaved eligible page. Home, top bar, and Palette share
the same candidate rule; allowing duplicates and first-Inbox provisioning remain
unchanged. This removes a dead-end convenience action without adding a decision,
surface, copy, permission, network request, migration, or data rewrite. Focused
production-extracted evidence passes; installed ordering/effects and
representative-user validation remain open.

### The first-save guide should not advertise an already-filed page (2026-08-13)

If popup or context-menu capture already filed the newest browser page, Welcome
now presents the next recent unsaved eligible page instead. Welcome, Home, top bar,
and Palette share one active-Inbox candidate rule; allowing duplicates, first-Inbox
provisioning, exact receipt, and guarded close behavior remain unchanged. This
removes a first-session dead end without adding a decision, surface, copy,
permission, network request, migration, or data rewrite. Focused production-
extracted evidence passes; installed ordering/effects and representative-user
validation remain open.

### Find again must name the complete filing location (2026-08-13)

Search now shows every parent Stack after the exact Workspace, Space, and Group in
result labels and Saved-in detail. Pages filed in sibling nested Stacks no longer
look as though they share one destination, while exact recovery and Reopen remain
unchanged. This strengthens destination trust without adding a decision, surface,
copy key, permission, network request, migration, or data rewrite. Focused
production-extracted evidence passes; installed rendering/AT and representative-
user validation remain open.

### Open destination must visibly reach a nested filing (2026-08-13)

An exact capture receipt now transiently reveals every collapsed parent Stack
before focusing the deepest destination. The continuation no longer lands on a
correct but invisible filing; saved collapse preferences, exact identity, and Undo
remain unchanged. This completes the visible handoff without adding a decision,
surface, copy key, permission, network request, migration, or data rewrite.
Focused production-extracted evidence passes; installed rendering/focus and
representative-user validation remain open.

### Selection Open must promise a page it can recover (2026-08-13)

An unsafe-only retained/imported page selection no longer advertises an Open action
that will deterministically open nothing. The docket now uses the same address
allowlist as Reopen; a mixed selection remains actionable for its recoverable page
and keeps the established partial-result recovery. Unsupported records remain
visible and unchanged. No decision, surface, copy key, permission, network request,
migration, or data rewrite was added. Focused production-render evidence passes;
installed DOM/AT, real Chrome effects, and representative-user validation remain
open.
