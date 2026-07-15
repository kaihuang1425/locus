# Locus status & slice queue

**Living document — update it at the end of every cycle**: move the implemented slice to
"Done", re-rank the queue, add discoveries to "Known issues". Trust but verify: if
this file and the code disagree, the code wins (then fix this file).
Product priorities and evidence language follow
[`docs/PRODUCT_SUCCESS_SYSTEM.md`](../../docs/PRODUCT_SUCCESS_SYSTEM.md). A "Done"
entry records a completed implementation cycle; it does not by itself mean verified,
user-validated, or released.
Last updated: 2026-07-16.

## Queue (highest impact first)

1. **Finish P0 durability and release evidence** — exercise the centralized
   whole-state writer across real new-tab/popup/background contexts, installed
   lost/timed-out acknowledgements, storage-change ordering, and service-worker
   termination/restart;
   add real-browser failure-path evidence for save-before-close; exercise real installed-browser
   Archive/Trash quota persistence and serialized export/import round trips at scale; complete every
   supported legacy-schema fixture and extend import coverage through semantic fuzz, quota/large-file,
   and real-browser round trips; and run an unpacked-extension CSP/favicon/network
   audit. Extend reminder contracts to
   overdue, restart/sleep, recurrence, and DST/timezone behavior.
2. **Validate and finish the core first-use contract** (`docs/UX_SIMPLIFICATION.md`) — remove
   the hidden questionnaire/coach implementation debt, finish keyboard and narrow-layout checks,
   and run the representative-user activation protocol: save one real tab, see its
   destination, navigate away or reload, then find and reopen it without coaching.
3. **Resolve owner launch decisions** — decide the license/business model, investigate
   the Locus name collision before store submission, choose the initial Store
   single-purpose scope (including whether trackers are excluded), and approve only
   claims that have passed the canonical evidence ledger.
4. **Space layout fidelity triage, after the gates above** — Canvas, Explorer,
   Gallery, Graph, Timeline, and details are functional but uneven. Keep them under
   Advanced views until the core loop passes and each promoted view earns fresh
   rendered and user-flow evidence.

## Done (newest first)

- **2026-07-16 — Archive/Trash quota-recovery evidence / P0-09** — joined the
  production batch Archive and Archive-to-Trash mutations to the production
  new-tab State writer, ordinary-write failure handler, and storage-error router.
  Injected typed quota rejections at 1,024 mixed records leave the authoritative
  active or Archive graph unchanged, retain the optimistic local graph behind the
  reload interlock, route to storage-full feedback, and recover every entity ID
  exactly once on a reload-style authoritative read. The background contract also
  makes the production writer's `chrome.storage.local.set()` throw a quota error;
  it returns a typed failure, preserves the stored revision and graph, and emits a
  storage-full notification. The full static/deterministic block passes.
  **Implemented: yes. Verified: partial (injected deterministic quota model only).
  User-validated: no. Released: no.** No production, schema, permission, or UI
  behavior changed. A real Chrome quota boundary, rendered feedback, serialized
  export/import, and installed-browser lifecycle evidence remain open.
- **2026-07-16 — Archive/Trash 1,024-record scale evidence / P0-09** — added a
  production-extracted contract for single-item, whole-group, and batch archive,
  Archive-to-Trash, and both restore paths. Each archive route preserves 1,024
  mixed top-level records—including stacks with nested records—with every entity
  ID present exactly once. Single-item and whole-group restore, plus the batch
  Archive → Trash → restore flow, reproduce a canonical-equivalent workspace
  graph. Missing IDs and foreign entries remain no-ops without a persistence
  attempt. The contract is now part of `VERIFY.md`, both overnight command copies,
  and CI; the full static/deterministic block passes. **Implemented: yes. Verified:
  partial (static/deterministic model only). User-validated: no. Released: no.**
  No production, schema, permission, or UI behavior changed. Real
  `chrome.storage.local` quota pressure, serialized export/import round trips, and
  installed-browser UI/runtime evidence remain open.
- **2026-07-16 — Import-validator malformed/fuzz evidence / P0-08** — expanded
  `scripts/import-recovery-test.js` to extract the production
  `validateImportData()` boundary from `newtab.js`. A representative current-schema
  backup is accepted without mutation; 29 explicit malformed boundaries cover
  future schemas, invalid root/collection shapes, unsafe object keys, size/depth/
  node limits, active and stored-payload ID failures, item/stack structure, URL
  schemes, and corrupt Archive/Trash envelopes. A fixed-seed corpus adds 128
  mutations across eight structural families, all rejected with a non-empty error.
  The full static/deterministic block passes, including the 10,000-schedule writer
  run. **Implemented: yes. Verified: partial (static/deterministic model only).
  User-validated: no. Released: no.** No production, schema, permission, or UI
  behavior changed. Complete legacy-schema compatibility, semantic fuzz, quota,
  large-file, safety-backup/alarm, and installed-browser round trips remain open.
- **2026-07-16 — New-tab state freshness and authoritative recovery / P0-04** —
  added a confirmed-state baseline and dirty-aware `storage.onChanged` contract.
  A clean, idle page adopts and renders a newer stored revision; a dirty page
  never rebases or auto-replaces its whole graph and remains visible behind a
  localized reload interlock, as does an active async/capture operation.
  Expected self-write events are matched without treating them as the typed
  persistence receipt. Every failed new-tab capture drains invalidated queued
  writes and leaves source tabs open. With no later local mutation it re-reads
  `te`; if an ordinary edit or queued successor intervened, that graph remains
  visible behind the reload interlock until explicit recovery. Clean current-schema
  boots send no write, while real
  migration/default/Trash/deep-link normalization still coalesces into one.
  Production-extracted freshness contracts cover clean adoption, self-event/
  receipt ordering (including delayed earlier self-events), dirty and in-flight
  ordinary-write preservation, a remembered newer graph beating a stale recovery
  read, an edit arriving during capture recovery blocking adoption, lost and timed-out
  receipts, malformed revision blocking, active-capture deferral, newer-schema
  blocking, legacy-theme/onboarding normalization, and
  idempotent boot normalization. The
  Undo suite adds queued-successor invalidation, set-failure, conflict, lost-receipt,
  mid-Undo external revision, and ordinary-edit interleavings. **Implemented: yes. Verified:
  partial (static/deterministic model only). User-validated: no. Released: no.**
  Installed multi-context event ordering, service-worker restart, quota, and
  browser-side recovery UI remain open.
- **2026-07-15 — Central serialized state writer / P0-04 lockless safety** —
  moved the only whole-state `te` write into the service worker. New-tab and popup
  mutations now use typed `locus-state-write` requests, immutable call-time
  candidates, failure epochs that cancel already-queued successors, and revision
  receipts; all background and message writes pass through one FIFO, with the
  shared Web Lock retained when available. Popup capture flows hold one mutex
  through persistence and browser-side effects; new-tab rejects and rolls back a
  second modeled capture while the first is pending. Production-extracted client
  contracts cover two queue order/failure cases and one first-write-failure plus
  overlapping-capture/no-close flow. The writer contract covers 10 deterministic
  lock/lockless/conflict/failure cases and 10,000 fixed-seed lockless schedules
  (69,880 attempts; 19,947 accepted, 49,379 rejected, 554 injected failures) with
  zero lost accepted mutation tokens; an alternate seed also passes. The Undo
  contract covers new-tab overlap/no-second-write and an accepted write whose
  receipt is lost. **Implemented: yes. Verified: partial (static/deterministic
  model only). User-validated: no. Released: no.** Installed multi-context/service-
  worker lifecycle and installed stale-open-page/recovery evidence remain open;
  the later freshness cycle above closes the deterministic ordinary-edit case.
- **2026-07-15 — Unreleased product-success, safety, and first-use remediation** —
  added the canonical Product Success System and reconciled strategy authority;
  moved prepaint code into a packaged script, tightened CSP, switched favicon
  rendering to Chromium's local endpoint, and hardened rich-content/readme handling.
  Capture paths now persist before closing source tabs; whole-state writes gained
  a revision conflict guard (the newer central-writer cycle above now owns their
  serialization); silent archive caps are removed; alarm
  reconciliation runs at service-worker lifecycle and after import; and import has
  recursive size, depth, type, ID, URL, and rich-text checks. The current worktree
  also introduces the single-task save-first welcome, direct handoff, reduced core
  navigation, one primary top-bar action, collapsed opened-tabs rail, and static
  quality gates. This is **implemented but unreleased and only partially verified**:
  deterministic import-recovery, background-service-worker, and Undo contract suites now
  cover graph collisions, legacy normalization, alarm reconciliation, stale-alarm
  cleanup, visible no-retry capture conflicts, stale/pending Undo actions,
  newer-edit interruption, restored history order, and duplicate-free closed-tab
  retries. The explicit Save choice, durable Library routes,
  action-scoped Undo, truthful partial-close feedback, newest-Inbox Home preview,
  and three-zone Home are implemented. Actual extension-runtime, scale/quota,
  clock/DST, accessibility, and representative-user evidence remain open;
  randomized writer evidence is recorded in the newer cycle above.
- **2026-07-13 — System empty-state fidelity review** — replaced the scattered
  zero/no-match placeholders with one responsive, localized contract modeled on
  `locus_system_empty_state_each_page.png`. Home, empty Spaces and Inbox/groups,
  Search, All Links, Favorites, Read Later, Archive, and Trash now use calm
  surface-specific copy, a restrained illustration, and no more than two real
  recovery actions wired to existing create, capture, import, navigation, and
  filter-reset paths. Empty Read Later no longer stacks duplicate shells; filtered
  Archive/Trash states restore rows and focus; action focus survives palette
  dismissal. Rendered checks covered zero and no-match variants, real note creation
  and Archive→Trash recovery, keyboard focus, light/dark, reduced motion, en/zh-TW,
  duplicate-state/ID checks, and console errors. No schema or permission changes.
- **2026-07-13 — Search + command palette corrective UX pass** — the dedicated
  Search route now owns its query field instead of competing with the global
  command trigger; its first visible result and detail always agree, Arrow Down
  advances from that result, and loading/error/no-result states no longer leave a
  misleading detail column behind. Filters now expose real tag choices with
  counts and reload-safe URLs; notes use a concise title/snippet; selected details
  contain only stored metadata, notes, tags, actions, and related local results.
  The command palette has one canonical Search command, keeps Recent visible at a
  1280×720 laptop viewport, scrolls each column independently, and restores focus
  after Escape. Rendered checks covered query/tag/related-result/reload flows,
  keyboard navigation, light/dark, en/zh-TW, duplicate IDs, and console errors.
- **2026-07-13 — Search surface fidelity review** — promoted the old in-board
  filter into a reload-safe `/search` route modeled on `search_prototype.png`.
  It searches real links, notes, tasks, stacks, and nested stack contents across
  the active workspace; the existing text, quoted phrase, type/state/domain/url,
  Space, tag, color, and negation vocabulary now powers the launch layer,
  command palette, and dedicated page through one data-level matcher. The page
  adds live type counts, real Space/time/tag filters, best/newest sorting,
  selected-result detail, external open plus existing item-detail handoff,
  favorite mutation, loading/empty/error states, keyboard selection, Escape,
  reload/back-forward persistence, 800px layout, light/dark themes, reduced
  motion, and en + zh-TW. Files/images/tweets, AI search/auto-sort, remote content
  previews, and premium upgrade concepts from the mock were intentionally omitted
  because Locus stores no page/file content and remains within the local,
  no-account research-alpha scope.
- **2026-07-13 — Command palette fidelity review** — rebuilt the local command
  palette around `locus_command_popup.png`: a preview-aligned two-column home
  groups Quick actions, Go to, live recently saved links, and Shortcuts, while
  query mode fuzzily searches commands plus the user's real saved links and hands
  complex/operator queries to the existing board search. Save tab, create note,
  save window, import bookmarks, navigation, settings, theme, and sidebar actions
  all call existing state/browser paths; workspace, Space, group, layout, and
  settings-section commands are generated from live local state. Empty/error
  handling, listbox semantics, focus containment, Escape/arrow/Home/End/Enter,
  800px/narrow layout, light/dark themes, reduced motion, and en + zh-TW are
  covered. The preview's remote Help center and upload/file concepts were omitted
  to preserve the local-only, no-host-permissions boundary.
- **2026-07-13 — Popup preview remainders** — completed the remaining local/free
  intent in `locus_extension_popup.png`. The new More view provides real Save
  current tab, `chrome.bookmarks` import into the active Space, and browser-managed
  extension-shortcut actions. Live tab checkboxes drive a persisted Selected
  hibernate scope; schema 11 also adds the opt-in "save links to Locus before
  hibernating" safeguard, which writes the exact candidates to the resolved real
  capture destination (honoring metadata, dedupe, and remember-last) before any
  tab is suspended and aborts safely if the write fails. Current/all scope,
  pinned/audio exclusions, loading/empty/error handling, reload persistence,
  Escape/focus containment, light/dark themes, reduced motion, and en + zh-TW are
  covered. Screenshot/PDF capture, account/profile-photo, and remote feedback stay
  excluded by the host-access/account/network boundary; no fabricated local
  release-notes source was added solely to populate the mock's What's new row.
- **2026-07-13 — Trash/undo surface** — `trash_prototype.png` now has a distinct,
  local recovery surface instead of overloading Archive. Deleting from Archive
  moves the existing entry envelope to schema-10 `trash[]` with `trashedAt`;
  items remain searchable/filterable, support single and batch restore to their
  original location (with the existing safe Inbox fallback), permanent deletion,
  corrupt-entry reporting, and automatic on-load purge after 30 days. The sidebar,
  storage breakdown, export/replace/merge import, counts, empty states, Escape,
  narrow layout, dark themes, reduced motion, and en + zh-TW are covered. Premium
  retention upgrades, remote help, auto-clean controls, detail previews, and
  fabricated storage quotas/stats shown in the mock were intentionally skipped.
- **2026-07-13 — Local font bundle** — Replaced the Google Fonts requests in
  `newtab.html` and `popup.html` with a shared local `media/fonts/fonts.css`.
  Bundled all 41 WOFF2 subsets returned for the existing seven-family selector
  (including DM Sans italic), preserving the configured variable weight ranges,
  unicode coverage, and `font-display: swap`; included each family's OFL notice.
  Existing font IDs, theme behavior, language fallback, and persisted settings are
  unchanged. Headless-Chrome network verification loaded new-tab and popup with
  zero remote requests, including after a settings reload.
- **2026-07-12 — Landing + popup fidelity/first-run pass** — Landing greeting no
  longer falls back to the workspace name ("Good evening, My."); Home hero shares
  the localized no-name form. First-run shows welcome first, landing after (greets
  with the just-entered name). Added staggered entrance animation, meridiem-free
  clock, preview-style date, search reset on dismiss, reminders chip hidden at 0.
  Popup "Save window" now opens the preview's save panel (destination + Change,
  suggested/custom tags, links-only / session-group / reading-queue modes,
  close-after-saving, optional note) honoring `captureAskEveryTime`; main-view
  "Change" is a real destination picker (previously it saved the active tab);
  PDF/Video row chips; local-first footer. `popupSaveMode` persists under
  schema 9. en + zh-TW complete.
- **2026-07-12 — Popup fidelity pass** — `locus_extension_popup.png` now drives
  the 420×590 toolbar popup: preview-aligned window actions, a five-row tab card
  with search and expansion, the real resolved capture destination, and focused
  destination-picker and hibernate subviews. Existing capture semantics remain
  intact (`captureAskEveryTime`, last/default target, dedupe, metadata, and
  close-after-save); hibernate scope/options persist under schema 8. Loading, empty,
  error, keyboard/focus, Escape, en + zh-TW, shared themes, and reduced motion are
  covered. Screenshot/PDF capture, account avatar, remote feedback, and the
  preview's premium-style More panel were intentionally skipped because they
  require page, remote, or account concepts outside the local-only scope.
- **2026-07-12 — Zen new-tab landing layer** — `new_tab_landing_page.png` now
  opens above the real Home by default: time-aware serif greeting from
  `settings.profile.name`, bundled time/theme scene art, local clock/date/quote,
  live active-Inbox and reminder counts, operator-aware saved-link typeahead,
  and web submission through the browser's configured default engine. Escape,
  chevron, and downward wheel reveal Home; keyboard focus is contained; en +
  zh-TW, dark themes, narrow windows, reduced motion, reload persistence, and a
  General setting to disable the layer are covered. No premium, account, remote
  content, profile-photo, or host-permission concepts were added; the avatar is
  the existing local profile/workspace initial.
- **2026-07-12 — Full-page Settings surface** (this repo's biggest preview set:
  `capture_settings.png`, `settings_subpages.png`, Jul 8–11). Eight sections wired
  to real data. Premium/mock concepts intentionally skipped: plugin marketplace
  panes, notifications center, encrypt/lock, GB storage donut, scheduled export, AI
  tagging. Details in DESIGN.md changelog.
- **Pre-2026-07-12** (see DESIGN.md changelog for dates): home surface
  (Waypoint-style cards), Favorites/Read Later/All Links/Archive surfaces, capture
  settings end-to-end (popup + background + settings), welcome questionnaire, app
  menu, board layouts (list/canvas/explorer/timeline/gallery/graph), calendar,
  item-detail pane with tags/checklists/covers, search operators + negation,
  onboarding coach-marks, Locus rebrand.

## Preview → implementation matrix

| Preview (design/previews/) | State |
|---|---|
| settings_* (9 files, Jul 8–11) | ✅ Done 2026-07-12 (local/no-account subset) |
| new_tab_landing_page.png (Jul 11) | ✅ Done 2026-07-12 |
| dashboard.png | ✅ Home surface |
| favorites / read_later / all_links / archive / inbox prototypes | ✅ Library surfaces |
| search_prototype.png | ✅ Done 2026-07-13 (local/no-account fidelity pass) |
| locus_system_empty_state_each_page.png | ✅ Done 2026-07-13 (shared local/no-account empty-state contract) |
| locus_extension_popup.png | ✅ Done 2026-07-13 (local/no-account subset + remainder pass) |
| locus_command_popup.png | ✅ Done 2026-07-13 (local/no-account fidelity pass) |
| spaces_* layout pngs (canvas/explorer/gallery/graph/timeline/details) | ✅ Layouts implemented (fidelity varies) |
| calendar.png, calendar_dark_expand.png | ✅ Calendar |
| locus_startup_1–5.png | 🟡 Historical reference; current one-task welcome is implemented but not user-validated |
| plugins_v1/v2 pngs | 🟡 Tools hub exists; marketplace concepts are deferred and outside the initial purpose |
| trash_prototype.png | ✅ Done 2026-07-13 (local/no-account subset) |
| bento_dashboard / collab_projects, locus_on_mobile, mobile_extension_workflow | 🚫 Out of scope (collaboration/mobile) |
| locus_hover_universal_preview_popup.png | ❌ Needs page-content access → conflicts with no-host-permissions; do not build as-is |

## Known issues / tensions

- Fresh Chrome runtime verification is unavailable for the 2026-07-15 worktree:
  Chrome is installed, but this session has no configured Chrome-control/native-host
  path or accessible already-loaded Locus tab; the managed in-app browser also
  rejected the documented localhost shim. Installed MV3 behavior, the shimmed UI
  pass, CSP, local favicon loading, service-worker/message lifecycle behavior,
  actual UI flows, and network silence therefore still require an unpacked-extension
  pass in an environment that can load the candidate.
- The legacy multi-step welcome questionnaire, associated helpers, and coach-mark
  paths remain hidden/dead in the source. Remove them after confirming that no
  current binding or migration depends on them.
- Deterministic import-recovery, archive-scale, background, Undo, freshness, and concurrency contracts now cover legacy and
  every-level ID collisions, idless Archive entries, replace rollback/normalization,
  production-extracted import validation across 29 malformed boundaries and 128
  fixed-seed structural mutations,
  1,024-record single-item/whole-group/batch Archive and Archive-to-Trash restore
  transformations with exact ID preservation, plus injected-quota batch Archive
  and Archive-to-Trash failures that preserve both the dirty local graph and the
  unchanged authoritative graph through reload recovery,
  post-import warning paths, alarm-map reconciliation, no-retry capture conflicts,
  and action-scoped Undo across pending capture, newer-edit interruption, restored
  history order, tab-open retry, persistence-failure recovery, central-writer conflict/failure
  recovery, immutable client candidates, queued-successor invalidation, overlapping
  popup/new-tab capture no-close behavior, clean/dirty external-state handling,
  no-op boot suppression, legacy settings normalization, authoritative failed-capture
  recovery, lost/timed-out receipt recovery, stale-read protection, delayed-event
  handling, invalid-token rejection, dirty ordinary-write preservation,
  browser-effect interruption, and 10,000 seeded lockless schedules.
  Remaining P0 gaps are installed
  cross-context/service-worker restart and unknown-ack lifecycle evidence, full
  legacy-schema/semantic-fuzz/quota/large-file/browser import round trips, overdue/recurrence/
  DST reminder semantics, real installed-browser Archive/Trash quota persistence
  and serialized export/import recovery, and a complete
  unpacked-extension evidence bundle. Static and mocked contracts do not close
  those browser-runtime risks.
- New-tab freshness and failed-capture recovery are production-extracted and
  deterministic only. Installed Chrome must still establish actual
  `storage.onChanged` versus runtime-receipt ordering, multi-page focus/overlay
  behavior, source effects during an active recovery blocker, and convergence
  across service-worker termination. A programmatic `hibernateSingle()`/popup
  reload overlap is also outside the shared popup capture mutex and needs
  installed-runtime disposition.
- The managed in-app browser stayed at 1280×720 when asked for an 800px viewport
  during the corrective Search/palette and empty-state passes. The narrow
  media-query paths were inspected statically, but the next unpacked-extension pass
  should repeat the interactive Search, palette, and empty-state checks at 800px
  before treating that viewport as fresh runtime evidence.
- `renderArchiveList()` in newtab.js is a harmless no-op since the drawer's archive
  tab was removed (element gone, function null-guards); callers remain. Delete
  function + call sites opportunistically when touching those paths.
- `design/fixtures/home-preview.html` is a static fixture with hardcoded counts —
  fine (isolated), but never link it from the product.
