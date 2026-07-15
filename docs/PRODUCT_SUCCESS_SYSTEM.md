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
| Save current tab / save window | yes | partial | no evidence | no public release evidenced | The service worker owns the only whole-state write and serializes new-tab, popup, and background candidates through one FIFO with revision receipts; its optional Web Lock is defense-in-depth. Page queues send immutable call-time candidates and invalidate already-queued candidates after an earlier failure; popup and new-tab capture mutexes reject modeled overlaps before a second source effect. New-tab now keeps a confirmed-state baseline: a clean current-schema boot does not write, a clean idle page adopts a strictly newer stored revision, and a dirty page never auto-rebases or auto-replaces its whole graph. Unsafe active capture/Undo/import reconciliation blocks behind a localized inert reload overlay; in-flight ordinary conflicts, failed capture with a later edit, and failed Redo also retain the local graph rather than replacing it silently. Deterministic capture failure drains invalidated successors and leaves source tabs open after set failure, conflict, or an accepted write whose receipt is lost or times out. With no later mutation it re-reads authoritative `te`; otherwise the later graph remains visible until explicit recovery. The highest remembered event beats a stale recovery read, delayed self-events are distinguished from rollback, and malformed client/stored revision tokens are rejected before writing. Production-extracted client-queue, capture-flow, freshness, Undo, deterministic writer, and 10,000-schedule lockless contracts pass. Installed multi-context event/receipt ordering, unknown-ack lifecycle behavior, service-worker termination/restart, quota, and browser-side recovery UI evidence remain open. |
| Save-and-find first-session loop | partial | partial | no | no | A single-task save-first welcome, explicit and truthful close consequence, direct Inbox handoff, and action-scoped closed-tab Undo are implemented. Undo stays unavailable while capture effects are pending, pauses without overwriting a newer edit, and reuses tabs already reopened on retry. Deterministic contracts pass; installed-runtime, broader accessibility, and usability evidence remain open. |
| Local placeholder reopening | yes | partial | no | no public release evidenced | Function exists; memory benefit has not been benchmarked. |
| No host permissions | yes | manifest-inspected | no | no public release evidenced | Strong factual claim; required browser permissions still need disclosure. |
| No unprompted external requests | remediation implemented in current worktree | no | not applicable | no | Local favicon/CSP work must pass a network audit before the claim is allowed. |
| Export/import | partial | partial | no | no public release evidenced | Recursive guards, full-graph merge rekeying, idless archive preservation, old-Trash grace, active-route normalization, and a pre-replace download are implemented. Deterministic every-level collision fixtures pass. The production validator accepts a valid graph without mutation and rejects 29 malformed boundaries plus 128 fixed-seed structural mutations. A production-extracted 1,488,148-byte current-schema contract serializes 1,024 top-level active records (1,536 counted items), 1,024 Archive, and 1,024 Trash records through replace and merge. A numeric-schema matrix carries schemas 0–11, all six accepted app envelopes, and raw legacy through 26 replace/merge cases. A `0x51a7e5` valid-semantic corpus adds 128 current-schema graphs, 5,013 entities, and 256 mode cases with enforced coverage of data shapes, item/stored-entry kinds, URL families, metadata, selections, references, layouts, settings, and emoji. Exact counts and semantic content survive, and six current/raw/generated rejected writes roll back without changing authoritative storage. Actual quota/large-file behavior, DOM-backed sanitization, rendered file/preview UI, reminder outcomes, and installed-browser legacy/current round trips remain open. |
| Archive and Trash | yes | partial | no | no public release evidenced | The known 200-entry caps are removed. A production-extracted contract preserves 1,024 mixed records through single-item, whole-group, and batch archive paths, then restores canonical-equivalent workspace graphs; the batch path also passes Archive → Trash → restore with exact ID preservation. Injected quota rejections join those production mutations to the page State writer and error router: local data remains visible behind recovery, authoritative storage stays unchanged, and a reload-style read restores every ID. The paired background contract returns a typed quota failure and notification without changing the stored graph. Current-schema serialization now also preserves 1,024 Archive and 1,024 Trash entries through deterministic replace and merge. Real Chrome quota allocation, downloads/previews, installed-browser round trips, and rendered UI evidence remain open. |
| Reminders and Calendar | yes | partial | no | no public release evidenced | Service-worker, startup, install, and post-import reconciliation are implemented, and post-import scheduling failures are surfaced. A deterministic mocked-API contract covers the alarm map, stale cleanup, unrelated-alarm preservation, and idempotence; installed-runtime, overdue, sleep/restart, recurrence, and DST/timezone evidence remain open. |
| Seven Space layouts | yes | fidelity varies | no | no public release evidenced | Advanced capability; not part of the adoption thesis. |
| Built-in personal trackers | yes | partial | no | no public release evidenced | Store single-purpose and product-focus risk; exclude from the initial Store candidate by default. |
| Simplified one-task onboarding and shell | partial | no | no | no | The save-first welcome, direct handoff, core navigation reduction, explicit Save picker, collapsed opened-tabs rail, durable Library routes, progressive layout disclosure, and three-zone Home are implemented. Hidden legacy onboarding and user validation remain open. |

This table is a present-worktree snapshot, not a changelog. `.claude/docs/STATUS.md` must keep the commit-level
implementation/evidence state current.

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
   leaves” requires a repeatable network audit and precise exclusions for user-invoked
   searches and destinations.
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
| Nothing leaves the machine | Blocked | Do not use. Future allowed wording, if proven: “Locus sends no telemetry or background workspace data; opening a page or web search contacts the destination you choose.” | Zero unexpected requests across the release network suite; privacy policy matches behavior. |
| Never reads page content | Qualified | “Locus does not automatically read page content; it stores selected text only when you explicitly save it.” | Context-menu and network audit. |
| One click saves every tab | Blocked | “Save the current tab or the eligible tabs in the current window.” | A one-click claim requires the default path to complete in one invocation and a usability test confirming interpretation. |
| Close the window and lose nothing | Blocked | “After Locus confirms a successful save, you can close the captured tabs.” | The centralized writer model passes two client-queue cases, an overlapping popup-capture failure flow, 10 deterministic writer cases, and seeded lockless schedules. Production-extracted freshness and Undo contracts keep sources open across overlapping capture, ordinary-edit interleaving, set failure, conflict, and lost/timed-out receipts; later edits remain visible until explicit recovery converges on storage. Installed cross-context/lifecycle, save-before-close, quota, recovery-UI, and service-worker restart tests must still pass before this claim can advance. Never imply unsaved tabs are protected. |
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
| P0-03 | **Chrome Web Store single purpose.** Generic finance, habits, hydration, goals, workout, and subscription tools weaken the narrow tab/new-tab purpose. | Initial Store candidate states one purpose: save, organize, and recover browser context. Exclude generic trackers from the candidate by default, or obtain documented policy feedback before inclusion. Audit every required permission. | Release feature manifest, policy mapping, minimum-permission table, clean policy preflight/review. | Open |
| P0-04 | **Concurrent stale overwrite.** New-tab, popup, and background whole-state candidates pass through one service-worker FIFO. That worker owns the only `te` write, checks `_revision` inside the queue, returns typed receipts, and additionally uses the shared Web Lock when available. Page queues freeze candidates at call time and invalidate queued successors after failure; popup and new-tab capture mutexes fail modeled overlaps closed. New-tab now keeps a confirmed-state baseline: clean current-schema boots do not manufacture a revision, clean idle pages adopt and render strictly newer `storage.onChanged` state, and dirty pages never merge, auto-rebase, or auto-replace an incoming whole graph. Unsafe active capture/Undo/import reconciliation, in-flight ordinary conflicts, failed capture with later edits, and failed Redo retain the local graph behind a localized inert reload overlay. Failed capture writes drain invalidated successors and leave sources open; they re-read authoritative `te` only when no later mutation would be erased. Set failure, conflict, stale recovery reads, and accepted writes whose receipts are lost or time out converge fail-closed in production-extracted deterministic contracts. The highest remembered event beats a stale read, delayed exact self-events do not masquerade as rollback, and malformed revision tokens are rejected before writing. Together with the client/capture cases, 10 deterministic writer cases and 10,000 fixed-seed lockless schedules show zero lost accepted mutation tokens. This remains model evidence, not installed-extension proof. | Exercise real new-tab/popup/background writes and `storage.onChanged` versus typed-receipt ordering; verify clean adoption, dirty/active recovery, response loss/timeout, quota behavior, and service-worker termination/restart without blind retry. Record the browser-side recovery overlay and source-tab results. | Deterministic client/writer interleavings plus at least 10,000 randomized schedules show zero lost accepted mutations; lock-unavailable, conflict, set-failure, overlapping capture, clean-refresh, dirty-recovery, ordinary-mutation interleaving, unknown-ack, and installed service-worker restart paths pass. | Open; central writer, immutable/failure-invalidating queues, capture mutexes, confirmed-baseline clean-boot suppression, clean external adoption, dirty fail-closed recovery, delayed-event handling, malformed-token rejection, stale-read protection, later-edit preservation, and authoritative failed/lost/timed-out-receipt recovery are implemented and deterministically modeled; installed multi-context ordering, lifecycle/restart, unknown-ack behavior, quota, and recovery-UI evidence remain open |
| P0-05 | **Data durability.** `storage.local` is asynchronous, quota-limited to 10 MB, and cleared on uninstall; baseline claims exceed that guarantee. Critical capture writes now precede close attempts, close results are reported truthfully, and action-scoped Undo records only tabs actually closed. Deterministic Undo contracts cover stale actions, capture-in-progress blocking, newer-edit interruption and history ordering, tab-open retry reuse, and persistence-failure authoritative recovery without duplicate source restoration. A 1,488,148-byte current-schema export passes production serialization, validation, exact portable pre-replace backup, replace, merge, and rejected-write rollback. Numeric schemas 0–11, all six accepted app envelopes, and raw legacy pass 26 deterministic replace/merge cases; 128 fixed-seed valid semantic graphs add 5,013 entities and 256 mode cases. Six current/raw/generated rejected writes roll back without changing authority. | Complete installed save/close failure, actual quota/large-file, installed legacy/current export/import, corruption, and recovery evidence; keep uninstall/profile-loss warnings visible and current. | Installed save-before-close failure suite; export/import round trips; quota/corruption/reload/uninstall documentation; recovery drill. | Open; core capture/Undo remediation, deterministic scale, numeric-schema, and valid-semantic round trips implemented; installed failure, actual quota/large-file, DOM sanitization/corruption, and recovery evidence open |
| P0-06 | **Unexpected network/privacy leakage.** Baseline Google favicon URLs, saved remote favicons, and rich-note images could send browsing context externally. | Use only local extension favicon endpoints or bundled/data assets; block remote note images/styles; separate user-invoked navigation/search from extension-directed traffic; publish an accurate privacy policy. | Network log across all critical surfaces shows zero unexpected requests; stored legacy remote URLs cannot trigger loads; policy matches behavior. | Remediation implemented in current worktree; verification open |
| P0-07 | **MV3 CSP compliance.** Baseline inline prepaint code and inline event handlers conflict with the MV3 default `script-src 'self'` policy. | Package all logic in local scripts; remove inline handlers; declare a restrictive extension CSP; add static policy checks. Chrome's official [CSP reference](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy) says extension pages cannot run inline JavaScript under the default policy. | Packaged release loads without CSP errors; static scan finds no inline executable code/handlers; every surface passes runtime smoke. | Remediation implemented in current worktree; verification open |
| P0-08 | **Import trust boundary.** Recursive guards are implemented. Merge rekeys workspace/category/group/item graphs and ID-keyed references, preserves idless archive entries, and gives imported old Trash a new retention window. Replace normalizes active IDs/routes/window bindings, starts a pre-replace JSON download, rolls back on normalization/migration/write errors, and lands on Home. Deterministic every-level collision fixtures pass. A production-extracted validator corpus accepts a valid graph without mutation and rejects 29 malformed boundaries plus 128 fixed-seed structural mutations with visible errors. A 1,488,148-byte current-schema fixture containing 1,024 top-level active records (1,536 counted items), 1,024 Archive, and 1,024 Trash records passes production export, FileReader parsing, validation, replace, merge, exact portable safety backup, collision-free rekeying, and rejected-write rollback without semantic loss. Numeric schemas 0–11, all six accepted app envelopes, and raw legacy pass 26 mode cases. A fixed-seed valid-semantic corpus adds 128 graphs, 5,013 entities, and 256 replace/merge cases with enforced coverage, exact semantic equality, unique IDs, remapped references/layout records, settings isolation, immutable input, and authoritative persistence; current, raw-legacy, and generated write rejection rolls back both modes. | Extend actual quota/large-file coverage; verify downloaded files, DOM-backed sanitization, preview/error UI, alarm outcomes, and installed-browser legacy/current round trips. | Valid fixtures for every supported schema; malformed/fuzz corpus rejected safely; merge/replace are lossless and alarm reconciliation runs. | Open; core recovery remediation, numeric-schema fixtures, bounded malformed and valid-semantic fuzz, deterministic scale round trips, and modeled rollback implemented; actual quota/large-file, DOM sanitizer, rendered UI, alarm, and installed-browser evidence open |
| P0-09 | **Silent archive loss.** The known single-item, group, and batch paths no longer cap the archive at 200. A production-extracted contract preserves every entity ID exactly once across 1,024 mixed records in each path; single/group restores and batch Archive → Trash → restore reproduce canonical-equivalent workspace graphs. Two further 1,024-record cases join batch Archive and Archive-to-Trash to the production page State writer, ordinary-failure handler, and storage-error router. Under an injected typed quota rejection, the dirty local graph remains visible behind the reload interlock, the authoritative graph is unchanged, storage-full feedback is routed, and a reload-style read restores every ID. The paired background-writer contract turns a quota exception into a typed failure and notification without changing stored state. A production-extracted serialized round trip also preserves semantic content, restore destinations, metadata, and entity cardinality for 1,024 Archive plus 1,024 Trash entries through replace and merge, with rollback on rejected persistence. This remains deterministic model evidence, not a real Chrome quota, download, preview, or installed-runtime test. | Keep archive paths free of silent truncation. Exercise the real `chrome.storage.local` quota boundary and installed-browser export/import at scale; if storage pressure requires policy, preserve data in Trash/export, explain it before action, and require explicit deletion. | Archive 1,000+ mixed entries through single and batch paths with no loss; quota behavior is visible and recoverable; export/import round trip matches. | Open; archive-cap remediation, 1,024-record transformations, injected quota/reload recovery, and deterministic serialized replace/merge pass; real Chrome quota, downloaded-file/preview UI, and installed-browser evidence remain open |
| P0-10 | **Reminder/alarm drift.** Idempotent alarm reconciliation is implemented at service-worker evaluation, browser startup, install, and after import; it schedules expected future alarms and clears stale Locus alarms. Post-import reconciliation failures now produce an actionable warning. A deterministic mocked-API contract covers item, nested-item, group, category, and subscription alarms, stale managed-alarm cleanup, unrelated-alarm preservation, and idempotence. Overdue reminders are still excluded rather than recovered. | Define overdue and recurrence behavior completely; preserve stable identities; cover restore/migration as well as import. | Clock-controlled installed-runtime tests for restart, sleep, overdue, recurrence, DST/timezone, import, deletion, and duplicate reconciliation. | Open; core reconciliation and deterministic contract evidence present; installed-runtime, overdue, recurrence, and DST/timezone evidence open |
| P0-11 | **Runtime validation gap.** Static syntax and DOM checks do not exercise the installed extension, browser permissions, multiple contexts, alarms, persistence, or CSP. | Add an installed-extension integration harness where feasible, plus a recorded human load-unpacked release checklist. Test real events, reload, service-worker restart, and network. | Versioned evidence bundle for every P0 flow; zero critical console/CSP errors; known limitations signed off. | Open |
| P0-12 | **First-use overload.** The worktree replaces the visible questionnaire with a localized, focus-trapped, single-task save-first welcome; removes the chained landing handoff; simplifies navigation/top bar/rail; implements a context → Inbox capture/recovery → three-Spaces Home; shows the newest Inbox saves; makes Library routes durable; and gates alternate layouts behind Advanced. Hidden legacy questionnaire code and broader shell residue remain. | Remove dead onboarding residue, finish the complete keyboard/screen-reader and responsive acceptance pass, and test the exact release candidate. | Formative rounds pass; then at least 12/15 new ICP users complete save-and-recover in the target time without coaching. | Open; corrective product shape and the welcome focus fix are implemented; installed accessibility, formative, and validation evidence absent |
| P0-13 | **Public truth split.** Two landing sites, stale release notes, unsupported roadmap claims, and a concept site with fake quota/account/plugin/release states can mislead users or Store reviewers. The Cloudflare concept and repaired `docs/index.html` candidate are now `noindex`; the owner has not selected a public surface. | Choose one marketing surface; keep prototypes/candidates unpromoted until approved; derive README/Store/privacy/release copy from this ledger. | Claims audit has zero unapproved claims; version/release/channel facts agree; legal pages are final. | Open; surfaces quarantined and core copy repaired, owner decision and final audit open |

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
| Source tabs closed after failed/unconfirmed persistence | **0** |
| Valid schema fixture round trips with unequal semantic state | **0** across every supported schema and merge/replace mode |
| Silent archive/trash loss | **0** at 1,000 archived entries and quota-boundary tests |
| Missing/duplicate/orphan alarms after reconciliation | **0** in the defined restart/import/time scenarios |
| Unexpected external requests | **0** in scripted new-tab, popup, save, search-local, detail, import, reminder, settings, placeholder, and theme flows |
| CSP violations or critical console errors | **0** |
| Critical accessibility blockers in the core loop | **0** |
| Required permissions without a current feature and disclosure | **0** |
| P0/P1 unresolved security or data-loss defects | **0** |

User-invoked web search and opening a destination are expected network actions. Tests must
identify them separately rather than hiding them in an aggregate request count.

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
- one visible global Save action; opened-tabs rail collapsed by default;
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
| O-04 | What is the single-purpose Store SKU? | Save/organize/recover browser context; exclude generic trackers from candidate. | Product owner + Store policy adviser | Before release-candidate freeze | Open |
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
