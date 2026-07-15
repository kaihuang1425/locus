# Locus Layout & Differentiation Brief

Status: living document. Last updated: 2026-07-16.

This brief captures the design direction for Locus's layout refresh and — importantly —
how we take *inspiration* from **Refern** and **TabExtend** while staying clearly distinct,
so the product is defensible and independently owned.

> TL;DR — Borrow the **functional patterns** that are common to the whole category (they're not
> protectable), but ship a **visual signature of our own** that reads differently from both
> reference products. Keep a written record (this file) that the design was independently
> created. That combination is what keeps us "inspired, not sued."

---

## 1. The two references

### Refern (`refern.app`) — the video
A desktop **reference / moodboard manager** for creatives. Distinctive traits:
- Image-first **masonry gallery** of saved references.
- Spatial **Canvas** + **Graph** views for arranging references.
- AI **auto-tagging** (reads/describes images), **color-based search**, 14 search operators.
- Local-first, paid one-time consumer app (no subscription). Import from Eagle / PureRef / Allusion.
- Dark, gallery-like, content-over-chrome aesthetic.

### TabExtend — the photo
A **tab manager / workspace**. Distinctive traits visible in their marketing shot:
- Light, airy, **pastel** aesthetic with a colorful gradient hero.
- A left **rail of circular site/favicon icons** ("Quicklinks").
- **Top horizontal pill-tabs** (Today / Read later / Tools), active tab a solid blue pill.
- **Kanban columns** of cards that mix tabs + to-dos + notes; yellow sticky-note styling.
- Tagline "Tab management made easy."

### Where Locus already sits
Locus is functionally close to TabExtend (sidebar + category tabs + kanban columns of mixed
tab/note/todo cards + a free-positioning canvas). That overlap is **fine on the merits** — these
are generic category patterns — but it means our *visual* identity has to carry the
differentiation. That is the core of this brief.

---

## 2. Legal posture (plain-English, not legal advice)

Four buckets matter. Get a real IP attorney before any paid launch; this is our working model.

| Risk | What's protected | Our stance |
|---|---|---|
| **Copyright** | Their *code*, icons, illustrations, marketing copy, exact gradients/art. | Independently written (vanilla JS, our own SVG icons). Never copy their CSS, assets, or taglines. |
| **Trade dress** | The *distinctive, non-functional* total look-and-feel that identifies the source. | Differentiate the signature elements (palette, tab treatment, card styling, motifs). Keep only the *functional* patterns. |
| **Trademark** | Their names/logos ("Refern", "TabExtend"). | Don't use their names/marks anywhere. “Locus” is only a working name: active Chrome Web Store collisions were found in the 2026-07-15 market refresh, so public use requires professional clearance or a rename. Never imitate another product's wordmark/logo. |
| **Patents** | Specific claimed inventions. | None known to read on basic kanban/canvas/tag UI. Re-check before launch. |

### The key distinction: functional vs. distinctive
Trade dress does **not** protect features that are functional or standard to the category.
Kanban columns, a left sidebar, drag-and-drop, top tabs, a canvas view, search, tagging —
these appear across Trello, Notion, Linear, Toby, Workona, Eagle, PureRef. Using them is safe.

What we must make our *own* (the non-functional, source-identifying signature):

**Avoid imitating (TabExtend):**
- ❌ A left rail of circular favicon "quicklink" bubbles as the primary nav motif.
- ❌ Pastel-light board with yellow sticky-note cards as the signature palette.
- ❌ Solid-pill active top tabs in their blue.
- ❌ Their copy ("Tab management made easy") or icon set.

**Avoid imitating (Refern):**
- ❌ Their exact dark gallery masonry styling / image-card chrome.
- ❌ Their marketing copy, AI-tagging wording, or icon set.

**Our signature instead (see §3).**

---

## 3. Our visual signature: "Locus"

A distinct identity that is neither TabExtend's pastel-light favicon-rail nor Refern's dark
image gallery. The name Locus evokes a curated collection of pages; the mark turns that
into stacked, folded sheets, and the UI carries the same organized-space idea through
compartmentalized boards and calm surfaces.

- **Palette:** the default is a soft blue/violet Locus theme (`#eef1fb` base with
  `#5566f2` / `#8b5cf6` accents), rather than TabExtend's white or Refern's neutral
  gallery grey. The accent gradient (`--brand-grad`) replaces TabExtend's flat blue.
  A deep Locus Dark variant ships alongside it.
- **Columns as bento compartments:** board columns are framed cells with a thin gradient top
  accent and a faint sheen (`.gcol` + `.gcol-hd::before`), unlike TabExtend's flat kanban
  columns. The treatment is structural CSS, so it holds across every theme.
- **Category tabs:** the active category gets a short, thicker gradient underline
  (Linear/Vercel-style) instead of TabExtend's solid blue pill.
- **One accent gradient:** `--brand-grad` (derived from each theme's own accents) marks the
  active tab, primary buttons, the active workspace chip, and the column top edge, so the UI
  reads with a single through-line.
- **Sidebar:** workspaces plus a live open-tabs list, not a favicon bubble rail. Different from
  TabExtend by construction.
- **Themes stay first-class:** Locus and Locus Dark are the new defaults. Rice Paper,
  Lacquer, Aurora, and the other themes remain, so users who want warm, light, Nord, or
  Dracula palettes keep them. The identity lives in structure (compartment columns, tab
  divider-tick, accent gradient), not only colors.

### Borrowed *ideas* (functional, safe) worth pursuing next
- From Refern: the **Canvas** view (we already have one) and ~~a future~~ **relationship/graph
  view shipped** (`renderGraphView`, a static radial map — category at the hub, groups on a ring,
  items fanned around them, faint cross-links between same-domain items); ~~tag-based~~
  **tag search shipped** (`tag:` operator, backed by per-item `item.tags` from
  the detail pane) alongside ~~**color search**~~ → **color search shipped** (`color:red` operator
  in the search bar). Refern's "14 search operators" trait → **search operators expanded**:
  `type:tab|note|todo|stack` (by kind), `is:done` / `is:open` (todo state),
  `domain:`/`site:` + `url:` (tab hostname / URL substring), `in:` (scope by the name of
  a containing group/stack), and `tag:` (by user-assigned tag) now join `color:`, and any operator
  or word can be **negated** with a leading `-` to exclude matches. They combine freely (e.g.
  `type:tab in:work domain:github.com "pull request" -is:done`). All derived from local
  item metadata / structure — no host access. Note: **link previews / thumbnails** would require reading
  page content, which conflicts with our no-host-permissions / private-by-default positioning
  — deferred unless we can derive previews without host access.
- From TabExtend: mixing **tabs + notes + todos** in one column (we already do this);
  per-window workspaces (we already do this).

None of those *ideas* are protectable; our distinct execution is what matters.

---

## 4. License posture — no third-party commercial use

The repository license is intentionally narrow: source is available for noncommercial
research, private study, informal personal experimentation, hobby use, and contributions
back to Locus. Commercial use is not permitted in any kind or form unless the copyright
holder grants a separate written license.

If a separate commercial offering ever exists, it must use separate written terms and must
not imply commercial permission for this repository. Public copy should say:
"Free for noncommercial research, contribution, and informal personal use. No commercial
use in any form."

Current evidence-gated positioning: **explicitly save browser context, see where it
went, and recover it later in one desktop browser profile.** The factual boundary is
no Locus account, no host permissions, local workspace storage, and user-managed
JSON export. Do not use “private by default,” “nothing leaves,” “never reads,” or
“yours forever” until the applicable claims ledger gate permits the exact wording.

---

## 5. Pre-launch checklist (before public distribution or any commercial offering)
- [ ] IP counsel review of name, store listing, and UI screenshots vs. TabExtend/Refern.
- [ ] Trademark search + (optionally) register the chosen name/logo.
- [ ] Confirm no copied assets/copy; all icons and strings are original.
- [ ] Store listing avoids competitor names and their taglines.
- [ ] Privacy policy reflects local-first / no-host-permissions reality.

---

## 6. Changelog
- **2026-06-21** — Initial brief. Introduced **Aurora** signature theme (new default),
  **underline** category-tab treatment (diverges from TabExtend pills), and a cohesive
  `--brand-grad` through-line. Documented legal posture and the licensing plan.
- **2026-06-21** — Completed the `--brand-grad` through-line onto the **active workspace chip**
  (gradient left accent bar). Shipped **color search** (`color:red`, `color:red,blue`) in the
  board search bar — the first of the §3 "borrowed ideas" roadmap items.
- **2026-06-21** — Expanded the **search operators** (toward Refern's "14 operators" trait):
  `type:tab|note|todo|stack` (by kind, with synonyms like `link`/`task`/`group`) and
  `is:done` / `is:open` (todo completion state). Operators compose with each other and with
  free/quoted text, and stay privacy-safe (derived purely from local item metadata). Ancestor
  stacks are kept visible when a nested item matches, so operator searches surface items inside
  stacks too. Quoted phrases are tokenized before operators so they compose (`type:todo
  "due today"`), and list-view stack headers (`.lv-stack`) are filtered too, not just board/canvas.
- **2026-06-23** — Added the **`domain:`/`site:`** and **`url:`** search operators (toward
  Refern's "14 operators"): filter tabs by hostname (`domain:github.com`, alias `site:`) or by
  full-URL substring (`url:/issues`). Comma-lists OR together; both compose with the existing
  `color:`/`type:`/`is:` operators and free/quoted text. URLs are read from the locally stored
  item metadata (exposed as `data-host`/`data-url` on tab nodes) — still no host access. Only
  tab items carry a URL, so these operators exclude notes/todos/stacks, and archive results are
  suppressed when they're active (consistent with the other metadata operators).
- **2026-06-23** — Added the **`in:`** scope operator (toward Refern's "14 operators"):
  filter by the name of a containing group or stack (`in:work`, `in:research`), so you can
  narrow results to a location instead of just matching text/metadata on the item itself.
  Works in both board and list views (reads group/stack names from `.gcol-name`/`.stack-name`
  and `.lv-group-name`/`.lv-stack-name`), walks ancestors only (a node isn't "in" itself),
  comma-lists OR together, and composes with every existing operator and free/quoted text
  (e.g. `type:tab in:work domain:github.com`). Derived purely from local structure — no host
  access — and archive results are suppressed while it's active, like the other operators.
- **2026-06-23** — Added **negation** to the search syntax (toward Refern's "14 operators"):
  prefix any operator or word with `-` to **exclude** matches — `-type:todo`,
  `-domain:github.com`, `-color:red`, `-in:work`, `-is:done`, or `-"quoted phrase"`. An item is
  hidden if it matches *any* active negative term (OR across negatives), so negatives compose
  with each other and with all positive operators/text (e.g. `type:tab -domain:github.com`).
  A negative that can't apply to a kind leaves it visible (e.g. `-domain:` never hides a
  note/todo). Negative structured operators suppress archive results like the positive ones;
  negative *text* needles instead just filter out matching archive entries. Still no host
  access — purely local metadata/structure.
- **2026-06-30** — Renamed TabNest to Locus and replaced Aurora as the default signature
  with the Locus stacked-page identity (§3). New default `[data-theme="folio"]`: a soft
  blue/violet base with a matching `folio-dark` variant. The previous rice-paper and
  lacquer palettes remain selectable as `tabento` and `tabento-dark`. Added the structural compartment treatment:
  framed board columns with a gradient top accent and a faint sheen (`.gcol` / `.gcol-hd::before`)
  plus a thicker category-tab underline, so the identity holds across every theme and pushes
  further from TabExtend's flat-kanban look. Aurora and all prior themes stay selectable. Seed
  category names (Quicklinks/Read later, which echoed TabExtend) changed to Pinned/Later. Internal
  storage keys (`te`, `te_settings_mirror`) left unchanged for data continuity; import still
  accepts old `stow`/`tabento`/`tabnest`/`tabextend` envelopes. The name was conflict-checked against the Chrome
  Web Store and app space (unlike "TabPro", which collides with existing extensions).
- **2026-07-02** — Shipped **Phase 2 — Link content** ([IMPROVEMENTS §4.2](docs/IMPROVEMENTS.md)):
  a right-docked, non-blocking **item detail pane** (`renderItemDetail`) that hangs optional,
  migration-safe metadata off any item — a rich-text annotation (`item.notes`, reusing the
  `.note-text` RT toolbar), **tags** (`item.tags`), **custom fields** (`item.customFields`),
  a **checklist** (`item.checklist`), and a user-picked **cover** (`item.cover` = `{color}`|`{emoji}`,
  never a scraped page image — keeps the no-host-permissions line) — plus inline reminder editing
  through the existing `setReminder`/`clearReminder` path. The pane is a **route** (board `?item=<id>`,
  group-page `…/group/<id>/item/<id>`), so it deep-links and survives reload/back-forward, and closes
  as the topmost Escape surface. Tags feed a new **`tag:`** search operator (comma-lists OR, `-tag:`
  negation, substring match) exposed as `data-tags` on cards — the seventh operator toward Refern's
  "14", still purely local. Covers, tag chips, and a "has detail" hint surface on the cards; every
  item type gains a **Details…** context action and tabs get a details button. All behind **schema 5**
  (absent fields = today's behavior; older exports import unchanged).
- **2026-07-03** — Reworked **first-run onboarding** ([IMPROVEMENTS §8](docs/IMPROVEMENTS.md)) toward a
  calmer, more intentional feel. The nine-step spotlight wall is now a **three-card welcome** (what
  Locus is → save a tab → find your way around); everything else is taught **just-in-time** by a
  small, non-modal **coach-mark** (`coachMark`) that fires at most once per surface — the first layout-menu
  reach and the first calendar open — reusing one reusable element, transform-positioned (composite-only)
  and reduced-motion aware. A structured `settings.onboarding` record (`welcomeSeen`, per-surface
  `hintsSeen`, `disabled`) replaces the single `tourCompleted` flag under **schema 6**; the migration folds
  the old flag in so returning users are never re-onboarded. Settings → Behavior gains **Replay welcome**,
  **Reset tips**, and a **Show tips as you explore** switch. No new host access; purely local state.
- **2026-07-03** — Polish pass for smaller windows and a quieter board. The sidebar width is now
  `clamp(184px, 19vw, 240px)`, so it holds its 240px on the common ≥1264px new-tab widths and eases
  down to a 184px floor on narrower or split windows instead of crowding the board; `#board`, `#topbar`,
  and `.ws-bar` trim their outer padding at the 1180px and 940px breakpoints. The board scrolls
  horizontally, so nothing wraps — the columns keep the user's chosen `--gw`. Each column footer now
  reads as one filled **Add tab** plus three ghost note/todo/stack affordances that tint only on hover,
  instead of a row of four bordered boxes. CSS-only; no data or behavior change.
- **2026-07-12** — Settings grew from a right-side drawer into a **full-page surface**
  (matching the `settings_*` previews): a left rail of eight sections — General, Appearance,
  Capture, Shortcuts, Privacy & Security, Storage, Import & Export, About — with card panes on
  the right. Same element id and control ids as the drawer, so every existing binding,
  deep-link (`openSettingsDrawer('capture')`), and the Escape stack carried over unchanged.
  New real-data panes: **Shortcuts** (live `chrome.commands.getAll()` values with manifest
  fallback, plus a filterable in-app list), **Storage** (the existing quota bar plus a
  per-kind breakdown — links/notes/todos/stacks/archive — computed from the serialized size of
  the user's actual items), **Privacy** (the honest four-check "private by design" card and the
  real blur toggle), **About** (version read from the manifest). General gains a **Your name**
  field backing the home greeting (`settings.profile.name`, same field the welcome
  questionnaire writes). The drawer's Archive tab was retired in favour of the archive
  *surface*; its deep-links (quota overlay, search results) now route there. The duplicated
  "Close tabs when saved" toggle collapsed into the Capture pane's single control. Sidebar
  sections are Up/Down-arrow navigable; panes slide in only when animations are on and
  `prefers-reduced-motion` is off; the rail folds into a top strip below 880px. Fully
  localized (en + zh-TW).
- **2026-07-12** — Shipped the **Zen new-tab landing layer** from
  `design/previews/new_tab_landing_page.png` as a calm, full-viewport layer above
  the existing Home. It opens by default with a time-aware Lora greeting backed by
  `settings.profile.name`, the bundled morning/noon/night scene art, a local
  clock/date/quote, and live active-Inbox ("Unsorted") plus reminder counts. The
  search pill offers operator-aware results from the user's locally saved links
  and sends unmatched web queries through `chrome.search.query()`, preserving the
  browser's configured default engine without host access. Escape, the chevron,
  and downward wheel motion reveal the already-rendered Home; focus stays within
  the layer, motion honors both animation settings and reduced-motion, and the
  responsive layout holds at 800px. Added schema 7 for the persisted
  `settings.showLanding` opt-out, plus complete en/zh-TW strings and dark-theme
  treatment. Premium/account/profile-photo/remote-content concepts in the visual
  direction remain intentionally out of scope; the avatar stays a local initial.
- **2026-07-12** — Completed the **toolbar popup fidelity pass** against
  `design/previews/locus_extension_popup.png`. The 420×590 popup now carries the
  preview's compact hierarchy: profile-initial header, ⌘/Ctrl+K tab search,
  current-window count, paired Save window / Hibernate window actions, a
  five-row expandable tab card, the real resolved destination, and focused Save
  tab and Hibernate window subviews. All content comes from `chrome.tabs` and
  the existing `te` state; capture still honors ask-every-time, last/default
  destination, metadata, dedupe, and close-after-save settings. Hibernate scope
  and pinned/audio exclusions persist across popup reloads under schema 8. Added loading,
  empty, error, filtered-empty, keyboard/focus, Escape, dark-theme,
  reduced-motion, and complete en/zh-TW treatment. The mock's screenshot/PDF,
  account avatar, remote feedback, and premium-style More concepts remain out of
  scope because Locus stays local-only and requests no host permissions.
- **2026-07-12** — **Fidelity + first-run pass on the landing layer and popup.**
  Landing: the greeting now uses only `settings.profile.name` (no more
  "Good evening, My." from the workspace-name fallback; the Home hero shares the
  same localized no-name form), first-run no longer stacks the landing under the
  welcome questionnaire — the landing waits and greets with the name the user
  just typed; added the preview's staggered entrance (greeting → search →
  chrome, gated by animation settings and reduced motion), meridiem-free clock
  and "Tue, 11 June"-style date, search resets on dismiss, and the reminders
  chip hides at zero. Popup: "Save window" now opens the preview's save panel —
  destination with Change, suggested/custom tags, save options (links only /
  links + session group / reading queue via `readLaterAt`), close-after-saving,
  and an optional note — while ask-every-time=off keeps one-click saving; the
  main view's "Change" is now a true destination picker (it previously saved the
  active tab), rows show PDF/Video chips derived from URLs, and the footer
  carries the local-first line. Save mode persists as `popupSaveMode` under
  schema 9. Full en/zh-TW coverage for every new string.
- **2026-07-13** — Bundled the extension's full **font set locally**. New-tab and
  popup now share `media/fonts/fonts.css` instead of render-blocking Google Fonts
  requests, with all 41 WOFF2 unicode subsets for DM Sans, Inter, Geist, IBM Plex
  Sans, Lora, JetBrains Mono, and Geist Mono plus their OFL notices. The existing
  selector IDs, variable weight/style ranges, fallback stacks, theme behavior, and
  persistence are unchanged, while first paint now honors the local-first/offline
  product promise with no font-network dependency.
- **2026-07-13** — Shipped the local **Trash recovery surface** from
  `design/previews/trash_prototype.png`, giving deletion a different meaning from
  deliberate Archive storage. Schema 10 adds `trash[]`; deleting an Archive entry
  preserves its real workspace/category/group restore metadata and stamps
  `trashedAt`, while the Trash view provides live counts and recoverable bytes,
  search, type filters, single/batch restore, permanent deletion, empty and damaged
  import states, and a 30-day on-load purge. Sidebar counts, storage reporting,
  export plus replace/merge import, Escape, narrow windows, all themes, reduced
  motion, and en/zh-TW stay connected to existing local state. The preview's
  premium retention upgrades, remote help, detail scraper, auto-clean controls,
  and fabricated quota/statistics were intentionally omitted.
- **2026-07-13** — Completed the remaining local/free **toolbar popup** intent from
  `design/previews/locus_extension_popup.png`. A focused More view now wires Save
  current tab into the existing capture flow, imports real `chrome.bookmarks` into
  the active Space, and opens Chrome's extension-shortcut manager. Open-tab rows
  gained accessible live selection, feeding a persisted Selected hibernate scope.
  Schema 11 adds that selection plus an opt-in "save links to Locus before
  hibernating" safety setting: the exact eligible tabs are written to the resolved
  capture destination first (with capture metadata, dedupe, and remember-last
  semantics), and hibernation aborts if storage fails. Reload persistence,
  loading/empty/error handling, Escape and focus containment, light/dark themes,
  reduced motion, and en/zh-TW are covered. Screenshot/PDF capture,
  account/profile-photo, and remote feedback remain excluded by the
  no-host-access/account/network boundary; no fabricated local release-notes source
  was added solely to populate the mock's What's new row.
- **2026-07-13** — Completed the **command palette fidelity review** against
  `design/previews/locus_command_popup.png`. Its preview-aligned two-column home
  now separates Quick actions, Go to, live recent links, and Shortcuts; query mode
  fuzzily searches the full local command set and the user's actual saved links,
  including a handoff to the existing operator-aware board search. Capture, note,
  window, bookmark-import, navigation, layout, workspace/Space/group, theme,
  sidebar, settings-section, and tools commands all reuse current state and browser
  paths. The dialog adds localized empty/error/result states, listbox semantics,
  focus containment, Escape and full keyboard navigation, responsive 800px/narrow
  treatment, dark themes, and reduced-motion gating. Remote Help center and
  upload/file concepts shown in the mock remain intentionally excluded by the
  local-only, no-host-permissions product boundary.
- **2026-07-13** — Completed the **search surface fidelity review** against
  `design/previews/search_prototype.png`. Search is now a first-class, reload-safe
  route with a preview-aligned query header, live type counts, real Space/time/tag
  filters, best/newest sorting, keyboard-selected result list, and contextual
  detail column. It walks the active workspace's actual links, notes, tasks,
  stacks, and nested stack contents; the shared data matcher carries the existing
  quoted-text, type/state/domain/url/Space/tag/color, and negation operators into
  the launch layer and command palette as well. Selected links open through
  `chrome.tabs`, favorites persist on the real item, and Details hands off to the
  existing deep-linked editor. Loading, empty, filtered-empty, and error states,
  Escape, back/forward and reload persistence, 800px layout, light/dark themes,
  reduced motion, and en/zh-TW are covered. The mock's file/image/tweet sources,
  AI search/auto-sort, scraped remote previews, and premium upgrade card remain
  intentionally excluded by the then-current local, no-host-permissions,
  no-account scope.
- **2026-07-13** — Ran a corrective **Search + command palette UX pass** after
  exercising both surfaces as user flows rather than treating visual resemblance
  as completion. Search now has one clear query owner, a stable result/detail
  selection contract, real counted tag filters, useful note summaries, stored-data
  details and related results, and honest loading/error/empty layouts. Its keyboard
  path advances from the visibly selected first result and Escape returns Home.
  The palette removes the duplicate Search command, uses independent scrolling so
  Recent remains reachable at 1280×720, and restores the invoking result's focus.
  Rendered verification covered query, tag, related-result, reload, keyboard,
  light/dark, and en/zh-TW states with no duplicate IDs or console errors. The
  managed browser ignored its 800px viewport override, so narrow behavior remains
  a required fresh runtime check despite the responsive CSS review.
- **2026-07-13** — Completed the **system empty-state fidelity review** against
  `design/previews/locus_system_empty_state_each_page.png`. A shared responsive
  component now gives Home, Spaces/groups and Inbox, Search, All Links, Favorites,
  Read Later, Archive, and Trash a consistent visual hierarchy while keeping copy
  and recovery actions specific to each user's situation. Every state exposes at
  most two meaningful actions and calls existing create, capture, bookmark-import,
  navigation, filter-reset, and persistence flows. The pass also removed Read
  Later's duplicate empty shell, fixed active-filter contrast, restored focus after
  palette and filter actions, and localized the surrounding Library/Archive shells.
  Rendered verification covered light/dark, reduced motion, en/zh-TW, zero/no-match
  states, real note creation, and Archive-to-Trash recovery. No new schema field,
  permission, remote dependency, or fabricated data source was added.
- **2026-07-15** — Completed an **unreleased product-success, safety, and first-use
  remediation cycle**. Added `docs/PRODUCT_SUCCESS_SYSTEM.md` as the canonical
  thesis, ICP, claims ledger, evidence-gate, and roadmap authority, while preserving
  `docs/UX_SIMPLIFICATION.md` as the first-use and shell contract. In the current
  worktree, prepaint moved to a packaged script; CSP, local favicon handling, rich
  content, and group readmes were tightened; capture paths persist before closing
  source tabs; whole-state writes gained a shared lock and revision guard; silent
  archive caps were removed; reminders gained lifecycle/import reconciliation; and
  import gained recursive size, depth, type, ID, URL, and rich-text checks. The
  first session now starts with one real save task and direct handoff, with reduced
  core navigation, one primary top-bar action, and a collapsed opened-tabs rail.
  The explicit Save choice, durable Library routes, closed-tab-aware Undo, and
  three-zone Home are also implemented. Static quality gates plus deterministic
  import-recovery, background-service-worker, and action-scoped Undo contract
  suites cover core graph, alarm, capture-conflict, pending capture, newer-edit
  interruption/history order, and duplicate-free restoration-retry
  invariants. This entry records implementation and
  limited automated evidence only: the worktree is not released, and Chrome
  runtime, randomized durability, scale/quota, full import compatibility/fuzz,
  clock/DST, accessibility, and representative-user validation have not passed.
- **2026-07-15** — Completed a **central serialized state-writer safety cycle**
  against P0-04. New-tab and popup no longer write the whole `te` graph directly;
  both send revisioned candidates to the service worker, which owns the only
  whole-state storage write and serializes background plus message mutations in a
  FIFO. The existing named Web Lock remains defense-in-depth when available, while
  the FIFO is the modeled lockless boundary for one worker lifetime. Per-context
  queues now freeze candidates at call time and invalidate queued successors after
  failure; popup/new-tab capture mutexes reject modeled overlapping source effects.
  Production-extracted contracts pass two client-queue cases, one popup failure/
  overlap/no-close flow, 10 deterministic writer cases, and 10,000 fixed-seed
  lockless schedules (69,880 attempted mutations) with zero lost accepted mutation
  tokens; an alternate seed also passes. The Undo model separately covers an
  overlapping new-tab capture and an accepted write whose receipt is lost. No
  schema, permission, visual, or public-claim status changed. This is implemented
  and partially verified by static/deterministic evidence only; it is not user-
  validated or released. Installed multi-context/service-worker lifecycle,
  stale-page recovery, and ordinary-edit/failing-capture interleavings remain open.
- **2026-07-16** — Completed a **new-tab state freshness and authoritative-recovery
  cycle** against P0-04. New-tab now tracks a confirmed-state baseline separately
  from its mutable graph, so a clean current-schema boot sends no write and does
  not advance `_revision`. A clean idle page can adopt and render a strictly newer
  `storage.onChanged` graph; a dirty page never merges or auto-rebases it, and an
  unsafe active capture/Undo/import reconciliation blocks behind a localized,
  non-dismissible reload overlay. Failed capture persistence drains invalidated
  queued successors and keeps source tabs open. It re-reads authoritative `te`
  when no later edit exists; otherwise the later local graph stays visible behind
  the reload interlock until explicit recovery. Production-extracted freshness and Undo
  contracts cover clean adoption, self-event versus typed-receipt ordering, dirty
  recovery, active-capture deferral, ordinary-edit interleaving, newer-schema
  blocking, pre/during-read stale-snapshot protection, delayed self-event handling,
  dirty in-flight ordinary-write preservation, adoption-point recovery guarding,
  failed-Redo interruption, malformed-token rejection, bounded unknown-ack recovery, and idempotent
  boot/settings normalization. This is
  static/deterministic model evidence only:
  installed multi-context event ordering, service-worker termination/restart,
  unknown-ack lifecycle behavior, quota behavior, and browser-side recovery UI
  remain unverified. No schema, permission, strategy, owner decision,
  user-validation, or release status changed.
- **2026-07-16** — Completed a bounded **import-validator malformed/fuzz evidence
  cycle** against P0-08. The deterministic import-recovery suite now extracts the
  production `validateImportData()` boundary, proves a representative valid backup
  is accepted without mutation, and exercises 29 explicit rejection boundaries
  spanning future schemas, structure, unsafe keys, resource limits, IDs, item/URL
  forms, and Archive/Trash envelopes. A fixed seed adds 128 mutations across eight
  structural families; every mutation fails closed with a non-empty error. The full
  static/deterministic block passes, including the 10,000-schedule writer model.
  This is partial automated evidence only: no production UI, schema, permission,
  strategy, user-validation, or release status changed, and full legacy-schema,
  semantic-fuzz, quota, large-file, safety-backup/alarm, and installed-browser
  round trips remain open.
- **2026-07-16** — Completed an **Archive/Trash 1,024-record scale evidence cycle**
  against P0-09. A new deterministic suite extracts the production single-item,
  whole-group, batch archive, Archive-to-Trash, and restore paths from `newtab.js`.
  Each archive route preserves 1,024 mixed top-level records, including nested
  stacks, with every entity ID present exactly once. Single/group restores and the
  batch Archive → Trash → restore flow reproduce a canonical-equivalent workspace;
  missing IDs and foreign entries stay no-op without persistence. The contract is
  wired into the verification playbook, unattended gate, and CI, and the full
  static/deterministic block passes. This is partial model evidence only: no
  production UI, schema, permission, strategy, owner decision, user-validation, or
  release status changed. Real storage quota pressure, serialized export/import,
  and installed-browser behavior remain open.
- **2026-07-16** — Completed an **Archive/Trash injected-quota recovery evidence
  cycle** against P0-09. The production batch Archive and Archive-to-Trash paths now
  run with the production State writer, ordinary-failure handler, and storage-error
  router at 1,024 mixed records. Typed quota rejection preserves the optimistic
  graph behind recovery, leaves authoritative storage unchanged, and reloads every
  identity; the paired background-writer contract preserves its stored graph and
  emits a typed failure plus notification. This is deterministic model evidence,
  not a rendered or installed-browser result; no production UI, schema, permission,
  user-validation, or release status changed.
- **2026-07-16** — Completed a **serialized export/import scale evidence cycle**
  against P0-08 and P0-09. A production-extracted suite serializes a 1,488,148-byte
  current-schema graph containing 1,024 mixed top-level active records (1,536 items
  including stack children) plus 1,024 Archive and 1,024 Trash entries, then passes
  it through the real FileReader/JSON/validator
  boundary and both replace and merge applications. Semantic content, entity
  cardinality, canvas/column metadata, restore destinations, exact portable pre-replace
  backup, and collision-free merge rekeying survive; rejected writes roll both
  modes back without changing authority or reporting success. This is deterministic
  browser-API model evidence only: actual Chrome downloads/previews, quota and
  large-file limits, full legacy compatibility, and installed round trips remain
  open. No production UI, schema, permission, user-validation, or release status
  changed.
- **2026-07-16** — Completed a **numeric-schema import compatibility evidence
  cycle** against P0-05 and P0-08. The production-extracted export/import suite now
  carries schemas 0 through 11, all six accepted app envelopes, and the raw legacy
  shape through 26 replace/merge cases. Content, counts, schema-4/5 item fields,
  schema-6–11 defaults, unique identities, restore destinations, profile-setting
  isolation, and migration to the current schema survive; four current/raw-legacy
  rejected writes roll back without changing authority or reporting success. This
  is deterministic browser-API model evidence only: semantic fuzz, actual Chrome
  file/preview behavior, quota and large-file limits, alarm outcomes, and installed
  round trips remain open. No production UI, schema, permission, user-validation,
  or release status changed.
- **2026-07-16** — Completed a **valid semantic import fuzz evidence cycle**
  against P0-05 and P0-08. A `0x51a7e5` fixed seed now generates 128 valid
  current-schema graphs spanning 5,013 entities and drives all 256 replace/merge
  cases through the production FileReader parser, validator, graph transforms,
  migration, and State writer. Enforced coverage includes multiple workspaces,
  Spaces without groups, empty groups/Archive/Trash, all item/stored-entry kinds,
  nested stacks, all five accepted URL families, Unicode and safe rich text,
  optional metadata, selections, Archive/Trash, restore references,
  canvas/column records, settings, and emoji. Exact counts, semantic equality,
  unique identities, remapped references, settings isolation, one authoritative
  write, and two additional generated-graph rollback cases pass. This remains
  fixed-seed deterministic model evidence: actual Chrome file/preview behavior,
  DOM-backed sanitizer transformations, quota/large-file limits, alarm outcomes,
  and installed round trips are open. No production UI, schema, permission,
  user-validation, or release status changed.
- **2026-07-16** — Completed an **import byte-limit and quota-sized rollback
  evidence cycle** against P0-05 and P0-08. The production-extracted suite now
  allocates exact UTF-8 inputs from the live import limits: a valid 20,971,520-byte
  backup reaches one preview without changing state, while the same valid JSON
  plus one byte is rejected before FileReader with no preview or write. A valid
  10,551,296-byte file whose parsed graph remains above the 10 MiB fallback quota
  reaches preview in replace and merge; injected typed quota rejection then makes
  one write attempt, rolls local state back, leaves authority unchanged, requires
  recovery, skips reminder reconciliation, and reports no success. Replace alone
  creates its safety backup. This remains exact-byte deterministic browser-API
  model evidence: actual Chrome File/FileReader and rendered preview behavior,
  real quota allocation, DOM-backed sanitizer transformations, alarm outcomes,
  and installed round trips are open. No production UI, schema, permission,
  user-validation, or release status changed.
- **2026-07-16** -- Completed a **recurring reminder restart-recovery cycle**
  against P0-10. Background reconciliation now advances an overdue recurring item,
  nested item, group, or category reminder to its first future wall-clock occurrence
  without replaying missed notifications or mutating persisted state. Expired
  recurrences and overdue one-shots remain unscheduled. The production-extracted
  contract creates nine exact initial alarms, advances its clock eight days through
  the registered browser-startup listener, clears four newly stale one-shots, and
  retains five alarms by re-arming four daily/multi-day/biweekly/monthly series plus
  the subscription. Repetition is idempotent; unrelated alarms survive; injected
  create and clear failures return two structured operations with no false success,
  state write, mutation, or notification. This is clock-controlled mocked-browser
  lifecycle evidence only: installed Chrome restart/sleep and delivery behavior,
  fired-series persistence, rendered Past Due behavior, and DST/timezone semantics
  remain open. No schema, permission, or UI behavior changed, and the work is not
  user-validated or released.
- **2026-07-16** -- Completed a **fired reminder persistence and stale-alarm
  rejection cycle** against P0-10. The production alarm handler now verifies that
  an event's scheduled occurrence still belongs to the current reminder before any
  side effect, preventing removed or rescheduled alarms from notifying or writing
  stale data. Item, nested-item, group, and category delivery awaits notification
  creation, persists the next occurrence through the central revisioned writer, and
  reconciles the complete alarm map under the same name. One-shots and the last
  occurrence allowed by `until` persist as notified without re-arming. Notification
  failure leaves state untouched; rejected storage is not retried, leaves authority
  unchanged, and rebuilds the consumed recurrence from an authoritative read, using
  the existing quota warning or a clickable generic update warning. Failed post-write
  reconciliation retains the accepted next occurrence and creates a clickable
  scheduling warning. The production-extracted contract covers six deliveries, two
  stale/removed alarms, and four failure paths. This is clock-controlled mocked-
  browser delivery evidence only:
  installed Chrome notification/delivery timing, service-worker termination,
  rendered Past Due behavior, group/category index-mutation races, and DST/timezone
  semantics remain open. No schema, permission, or extension-page UI changed, and
  the work is not user-validated or released.
- **2026-07-16** -- Completed a **stable group/category reminder identity cycle**
  against P0-10 and P0-08. Schema 12 now gives each active, archived, or trashed
  category/group reminder a persistent ID; migration and older merge imports repair
  missing, invalid, or duplicate identities without mutating the preview payload,
  while current-schema imports reject missing or duplicate IDs. Stable alarms use
  distinct `te-greminder2-` / `te-creminder2-` namespaces with encoded entity and
  reminder components, so delivery follows the intended reminder across array
  insertion, removal, and reordering. Legacy schema-11 index alarms remain usable
  until migration is authoritative, then reconciliation replaces them. Production-
  extracted contracts cover four new-tab mutations, three stable/legacy name round
  trips, all schemas 0–12 through 28 replace/merge cases, eight accepted deliveries,
  five stale/malformed no-ops, and two explicit identity-mutation paths. The complete
  static/deterministic gate passes. Evidence remains partial mocked-browser/state
  evidence: the managed-browser shim is unavailable, and installed lifecycle,
  notification rendering/timing, mutation races, one-shot Past Due policy, and
  DST/timezone behavior remain open. No permission, markup, style, user-validation,
  or release status changed.
- **2026-07-16** -- Completed a **pending-reminder and one-shot Past Due policy
  cycle** against P0-10. New-tab pending signals now exclude delivered records;
  unresolved one-shots keep their stored time in Calendar Past due, while missed
  active recurrences project to the same first future local-calendar occurrence as
  service-worker reconciliation without changing stored state. Projection keeps
  stable reminder identities and entity indexes attached to existing open, edit,
  drag, clear, and remove actions; item badges and reminder editors use the same
  policy. A production-extracted DOM-free contract covers six pending cases, two
  resolved omissions, three recurrence-parity paths, Calendar enrichment, two
  editor paths, badges, and five live wiring points. This is partial deterministic
  state/display evidence only; the complete static/deterministic gate passes. The
  managed-browser shim is unavailable, and
  installed restart/sleep/notification behavior, rendered interactions, mutation
  races, and DST/timezone semantics remain open. No schema, permission, markup,
  style, localized copy, user-validation, or release status changed.
- **2026-07-16** -- Completed a **local-calendar recurrence time-zone cycle**
  against P0-10. Background re-arming/alarm matching and new-tab pending projection
  now advance daily, weekly, and monthly series through nominal calendar coordinates
  rather than fixed elapsed time or a locally normalized cursor. Local wall time is
  retained across 23/25-hour days; nonexistent DST times, a deleted civil date, and
  missing month-days are skipped without permanent drift; repeated fall-back time
  resolves to its first instant once; and invalid bounds fail closed. A production-
  extracted contract starts fresh processes under New York, Berlin, Taipei, and
  Apia and passes 21 recurrence cases plus 37 background/display parity checks,
  including exact `until`, input immutability, and stale second-fold rejection. This
  is partial deterministic time-zone evidence only. The managed-browser shim remains
  unavailable, and installed Chrome alarm timing through sleep/restart and time-zone
  transitions, live operating-system time-zone changes, notification delivery, and
  rendered Past Due interactions remain open. No schema, permission, markup, style,
  localized copy, user-validation, or release status changed.
