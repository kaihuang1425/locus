# Locus Layout & Differentiation Brief

Status: living document. Last updated: 2026-08-13.

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

A distinct identity that is neither TabExtend's pastel favicon rail nor Refern's dark
image gallery. Locus is a **local index**: dark registry chrome establishes place,
warm stock holds saved material, one blue rule locates the current record, and green
appears only after accepted persistence or recovery. The hierarchy follows the
save → locate → recover loop rather than a decorative dashboard pattern.

- **Palette:** default Locus uses warm stock (`#efede7`), registry ink (`#19231f`),
  blue (`#3158db`) for location/action, and green (`#197654`) for accepted receipts.
  Locus Dark keeps the same semantics on `#111613` with a deeper registry edge.
- **Registry + locator:** navigation, top bars, subordinate rails, Welcome's intro,
  detail headers, and popup framing use the dark registry. A single structural blue
  rule answers “where am I / where did this go?” without another badge, illustration,
  gradient, glass panel, or floating-card motif.
- **Recovery index:** Home leads with Trail → Inbox → a ruled Space register. Each
  Space keeps its stored symbol and newest real record. Saved records, Search,
  Library, empty states, dialogs, and recovery sheets use flat paper rows with
  restrained 4–8 px radii and elevation only where stacking is real.
- **Working layout:** the shell is `registry navigation | save/locate/recover index |
  contextual source rail`. Welcome is an explicit source/destination operation;
  saved-item detail is a recovery sheet; popup places Save above Hibernate.
- **Motion and type:** the selected Font family carries readable headings, controls,
  and content across new-tab and popup; the default is DM Sans, and Lora remains an
  explicit option. Geist Mono is reserved for exact paths, counts, shortcuts, and
  filing receipts. Motion communicates state only and is removed under reduced-
  motion preferences.
- **Themes stay first-class:** Rice Paper, Lacquer, Aurora, and the other palettes
  remain selectable. Their colors may vary, but Locus Index spacing, control sizes,
  3 px focus, locator, receipt, and responsive hierarchy remain shared.

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
  field backing the optional Zen landing greeting (`settings.profile.name`, same field the welcome
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
  "Good evening, My." from the workspace-name fallback; the then-current Home hero
  shared the same localized no-name form before its 2026-08-02 replacement), first-run no longer stacks the landing under the
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
- **2026-07-16** -- Completed a **missing state-write receiver recovery cycle**
  against P0-04. New-tab and popup persistence now retry only the exact missing-
  receiver rejection, using the same immutable candidate for at most three total
  attempts. Persistent absence leaves authority unchanged and surfaces a typed
  background-service failure; ambiguous port closure, lost responses, timeouts,
  conflicts, and other failures remain single-shot. Production-extracted new-tab
  and popup contracts cover transient absence, persistent absence, and closure
  after acceptance. This is partial deterministic message-failure evidence only:
  the supplied Edge screenshot proves the pre-fix symptom, browser policy blocked
  privileged new-tab inspection, and post-fix installed service-worker lifecycle
  plus rendered recovery remain open. No schema, permission, markup, style,
  localized dictionary, user-validation, or release status changed.
- **2026-07-16** -- Completed the **persistent receiver-recovery follow-up** for
  P0-04. A request deadline now closes its receiver-retry lifecycle, so a delayed
  no-listener rejection cannot start abandoned sends after timeout recovery. The
  inert recovery overlay marks only `LOCUS_STATE_RECEIVER_UNAVAILABLE` for an
  extension-runtime restart; its existing button then uses `chrome.runtime.reload()`
  to replace a stale unpacked service worker, with page reload as an unavailable-API
  fallback. Revision conflicts, quota failures, and unknown acknowledgements retain
  page-only recovery, avoiding disruption to unrelated open Locus pages. The
  production-extracted state-sync contract covers the post-timeout boundary, scoped
  action, ordinary-write code propagation, and fallback. Installed browser behavior
  remains unverified in this environment. No schema, permission, markup, style,
  localized copy, user-validation, or release status changed.
- **2026-07-16** -- Completed a **canonical save-first welcome cycle** against
  P0-12. First run and every replay now share one localized dialog and one card
  language; the hidden six-step preference questionnaire, unreachable spotlight
  tour, Calendar coach mark, tip controls, duplicate reset action, native
  confirmation, hardcoded coach copy, and roughly 300 lines of obsolete onboarding
  styling are removed. The retained welcome adds explicit loading, no-eligible-tab,
  tab-query error/retry, failed-save, and successful Inbox-handoff behavior.
  It takes focus before tab discovery, focuses the primary or recovery action after
  resolution, consumes Escape before lower surfaces, and restores a visible opener
  from Settings replay. English and zh-TW failure/retry copy follow the existing
  concise product voice. A production-controller/static contract covers all states,
  focus/Tab/Escape, acknowledged close intent, saved-item focus, unique active IDs,
  locale keys, narrow/reduced-motion rules, and absence of the removed systems; the
  complete static/deterministic gate passes. This is **Implemented: yes; Verified:
  partial; User-validated: no; Released: no**. Browser policy blocked the shim and
  static-state fixture, and Chrome integration was not configured, so installed
  capture/closure, pixels, screen-reader output, themes, locale layout, 1280×720/
  800 px behavior, reload/history, and representative-user activation remain open.
- **2026-07-16** — Completed a **saved-item recovery-sheet cycle**. This
  supersedes the item detail pane's former non-blocking interaction model with a
  route-backed modal sheet that preserves source context on board, group, All
  Links/Favorites, and Read Later surfaces. The header uses the real item title,
  type, and Space/group location; saved links expose one primary Open action.
  Route ids are accepted only when they still belong to that workspace and
  category/group or Library filter, preventing moved items from wearing stale
  context.
  Recovery context, Reminder, and Tags lead, while cover, checklist, and custom
  fields live under progressive More details. The 420 px sheet keeps wide context
  visible but inert, dims it at 800 px, and becomes full-width with stacked fields
  on narrow screens. Tab is contained, editor Escape first commits/blurs, and an
  active edit is flushed before route/page teardown; page teardown also replaces
  the ordinary debounce with an immediate write attempt when the editor already
  blurred. Independent inert owners keep
  detail, the localized reminder dialog, and fail-closed recovery from unlocking
  one another, including when the detail root mounts after an overlay has opened;
  final close restores the opener, same item, or board heading.
  English and zh-TW copy, visible focus,
  dark/light token reuse, and reduced motion share the existing design system. A
  production-helper/static contract covers route serialization and ownership,
  immediate pagehide-write wiring, modal/inert/focus behavior including late
  surface inheritance, hierarchy, locale parity, and
  responsive-motion rules; the complete
  static/deterministic gate passes. This remains partial evidence: installed
  Chrome editing and persistence recovery, stale rendering, Back/Forward/reload,
  screen-reader output, pixels at 1280×720/800 px, themes, locale layout, and user
  recovery are unverified. No schema, stored item shape, import compatibility,
  permissions, host access, or local-only boundary changed.
- **2026-07-16** -- Completed an **Archive-first destructive-recovery cycle**
  against P0-09. Active saved items no longer pair Archive with a bypassing
  permanent-delete action; their single removal path is now recoverable through
  Archive, then Trash. Trash row and batch deletion share one localized Locus
  alert dialog with exact scope, retained-data wording, and a safe Cancel default.
  Tab stays contained, Escape closes only this layer, and focus returns to the
  opener or rebuilt Trash search. Confirmation shows a busy state and waits for
  the central State-writer receipt; only then does it clear session Undo/Redo,
  rebuild counts, and report success. A rejected write retains the existing
  fail-closed recovery interlock with no success toast or durable render. English
  and native zh-TW copy use the established design vocabulary; the dialog reuses
  modal, theme, narrow-width, destructive-color, focus, and reduced-motion tokens.
  A production-controller/static contract covers single/batch, duplicate/stale,
  cancel, pending/failure/success, focus, Tab, Escape, locale, and bypass-removal
  paths; the complete static/deterministic gate passes. This is **Implemented:
  yes; Verified: partial; User-validated: no; Released: no**. Installed Chrome
  persistence-failure rendering, screen-reader output, themes, locale layout,
  1280×720/800 px pixels, and representative-user trust remain unverified. No
  schema, permission, import shape, retention policy, or local-only boundary
  changed.
- **2026-07-16** — Completed an **empty-only organization-deletion cycle** for
  the core shell. Workspace chips, the workspace manager, category tabs, Home
  cards, and sidebar Spaces now converge on one localized alert dialog instead of
  native confirmations and duplicated mutations. Before Delete can appear, the
  controller recursively checks every group, stack container/descendant, and
  category/group reminder. Populated organizations expose Close only and direct
  recovery through Archive/move plus reminder removal; they perform no snapshot or
  write. The visible Home-card and sidebar Space menus reopen the first existing
  reminder in the localized edit/Remove flow, so delivered and legacy multiple
  reminders can be cleared sequentially instead of dead-ending the blocker. Empty
  shells name the structural scope and unaffected neighbors, then
  direct users to use the normal bounded in-memory Undo before that Locus page
  reloads or closes without promising availability through intervening history.
  Cancel/Close is initial focus; an independently owned interlock inerts all lower
  body roots while leaving fail-closed recovery operable; Tab stays contained;
  Escape closes only this layer even after programmatic focus loss; and global
  shortcuts plus lazy/programmatic palette opens cannot outrank the decision.
  Context-menu actions retain a visible opener;
  success verifies focus on the refreshed visible workspace manager or active Space;
  and locale reapplication repaints blocked, Space-specific, and pending states.
  Last, missing, duplicate, and changed targets are no-ops
  or repaint as empty/blocked before action. Empty-shell deletion disables both
  actions and waits for the central writer receipt before render, success, or the
  exact localized action-scoped Undo; rejected persistence keeps the interlock and
  reports no success. Group menus now keep the single Archive action, and the
  obsolete group-delete confirmation toggle is gone while its stored compatibility
  field is retained. English and native zh-TW consequence/recovery copy follow the
  shared destructive modal language. Paired production-controller/static contracts
  cover occupancy, populated blocking, empty-only deletion, five entry points,
  stale/last guards, inertness, visible focus, Tab, Escape/shortcut containment,
  lazy palette interlock, receipt gating, failure, Undo, live locale repaint, and
  centralized mutation; the complete static/deterministic gate
  passes. This is **Implemented: yes; Verified: partial; User-validated: no;
  Released: no**. Installed Chrome failure rendering, the reload/close Undo boundary,
  screen-reader output, themes, locale layout, 1280×720/800 px pixels, and user
  trust remain unverified. No schema, permission, host access, stored/import shape,
  archive format, or advanced surface changed.
- **2026-07-16** — Completed a **receipt-gated workspace and Space renaming
  cycle** for the core shell. Workspace chips, workspace-manager cards, Home-card
  menus, and visible sidebar Spaces now converge on one localized, text-only Locus
  dialog; hidden category-tab rename and the sidebar's mouse-only double-click
  duplicate are removed. Keyboard-openable anchored menus preserve a real opener,
  while rebuilt workspace/Space targets carry stable datasets for focus recovery.
  The controller trims outer whitespace, reports blank input inline, treats an
  unchanged name as a no-op, permits duplicate names, refuses duplicate IDs, and
  re-resolves the entity plus a Space's owning workspace before changing only
  `name`. A concurrent rename refreshes the latest value for review; missing or
  moved targets perform no write. A real rename takes one localized snapshot and
  waits for one central-writer receipt before render, success, or the exact action-
  scoped Undo. Rejection stays behind fail-closed recovery without retry, rollback,
  close, render, or success, and the lower dialog interlock leaves keyboard
  activation of recovery Reload intact. Pending state disables all actions and
  consumes Escape; otherwise Enter, Tab, Escape, global-shortcut suppression, live
  locale repaint, and independent inert ownership follow the shared modal system.
  Workspace-chip success waits for the actual asynchronous Chrome window/header
  rebuild before focus restoration rather than guessing with a timer. English and
  native zh-TW use Workspace/`工作區` and Space/`空間`; the panel reuses shared
  typography, spacing, radii, elevation, light/dark, focus, reduced-motion, forced-
  color, 32 px gutter, height-safe, and narrow-action rules. The complete static/
  deterministic gate passes, including strengthened recovery-keyboard and async-
  focus contracts. This is **Implemented: yes; Verified: partial (production-
  controller/static-source contracts only); User-validated: no; Released: no**.
  Installed Chrome write-failure rendering, pixels, screen-reader output, themes,
  locale layout, 1280×720/800 px behavior, reload/history, and representative-user
  trust remain unverified. No schema, permission, host access, state/import shape,
  privacy boundary, stable element ID, or advanced surface changed; organization
  creation and group naming remain the next core coherence slice.
- **2026-07-16** — Completed a **receipt-gated workspace and Space creation
  cycle** for the core shell. Top-bar and workspace-manager Workspace actions plus
  sidebar, Home-empty, and command-palette Space actions now share the localized
  naming dialog; the Group menu's “New Space…” action creates its destination and
  moves the exact Group in the same operation. The controller stores primitive
  parent/source IDs, re-resolves them before mutation, permits duplicate names,
  rejects blank names and duplicate IDs, allocates across active/Archive/Trash
  graphs, and requires review if the Group name changes while the dialog is open.
  A workspace seeds one real empty localized `Pinned`/`釘選` Space, never fake
  saved content. Atomic create-and-move preserves Group identity, nested records,
  Canvas position, and the remembered capture target. Each success takes one
  localized snapshot and waits for exactly one central-writer receipt before
  render, feedback, focus, or exact-action Undo; rejected or unknown
  acknowledgements retain the dirty graph behind fail-closed recovery without
  retry or false success. The workspace manager now owns dialog/interlock state,
  height-safe scrolling, Tab/Escape, opener return, asynchronous selected-chip
  focus, and keyboard-visible deletion. Context-menu Tab and Escape remain in the
  last-opened layer. The stale browser-window subsection, generic-modal creation
  branches, and native New-Space prompt are removed; canonical Save still owns
  whole-window capture. English and native zh-TW use Workspace/`工作區`, Space/
  `空間`, and Group/`群組`; the shared typography, spacing, control, radius,
  elevation, focus, motion, forced-color, and narrow-layout rules remain intact.
  The complete static/deterministic gate passes, including the new production-
  controller creation contract. This is **Implemented: yes; Verified: partial
  (production-controller/static-source contracts only); User-validated: no;
  Released: no**. Installed Chrome persistence/recovery rendering, pixels,
  screen-reader output, themes, locale layout, 1280×720/800 px behavior,
  reload/history, and representative-user trust remain unverified. No schema,
  permission, host access, state/import shape, local-only boundary, existing stable
  element ID, or advanced surface changed.
- **2026-07-16** — Completed a **receipt-gated Group and Stack identity cycle**
  across the core organization surfaces. Empty-Space, Board, List, focused-Group,
  Stack-detail, and selected-item batch actions now share one localized dialog
  instead of hardcoded modal branches, native naming prompts, inline inputs, and
  contenteditable headings. The surface uses the existing typography, spacing,
  32 px viewport gutter, height-safe scrolling, wrapping footer, control radii,
  elevation, focus ring, light/dark, forced-color, and reduced-motion system. Group
  and Stack headings are semantic groups with explicit 24 px expand/collapse,
  symbol, and More controls rather than nested interactive headers. The name field
  owns only name validation; the symbol picker is a nested localized dialog with
  loading, no-match, error, search, category, focus-return, and last-opened-first-
  closed behavior; the color control is a keyboard-roving radiogroup that can show
  an imported current-custom value without replacing it. English and native zh-TW
  use Group/`群組`, Stack/`堆疊`, Add/`新增`, and Save/`儲存`.

  The controller stores primitive IDs and re-resolves the complete live path. It
  permits duplicate display names, refuses blank names and ID collisions, preserves
  untouched raw imported names and missing/custom symbol/color fields, and reloads
  a concurrently changed identity for review. Selected-item Stack creation rejects
  stale, ancestor/descendant, and cross-Space sets, performs no removal before
  confirmation, and moves exact records in document order to the first selected
  item's Group as one transaction. Every real change takes one localized snapshot
  and awaits one central-writer receipt before render, close, selection clearing,
  rebuilt-target focus, feedback, or exact-action Undo. Rejection leaves the dirty
  graph behind fail-closed recovery without retry, rollback, or a success claim;
  the pending dialog retains one guarded keyboard focus anchor. A production-
  controller/static contract covers the reachable entries, graph preservation,
  collision/stale/batch guards, delayed and rejected receipts, validation, focus,
  inertness, picker ownership, locale parity, and responsive hooks, and the complete
  deterministic gate passes. This is **Implemented: yes; Verified: partial
  (production-controller/static-source contracts only); User-validated: no;
  Released: no**. Installed Chrome persistence/recovery rendering, real pixels,
  screen-reader output, theme/locale layout, 1280×720/800 px behavior, reload/
  history, and representative-user trust remain unverified. No schema, permission,
  host access, stored/import shape, privacy boundary, or existing stable element ID
  changed.
- **2026-07-16** — Completed a **receipt-gated existing-Space Group-move cycle**.
  Board, Canvas/focused Group, and both List menus now use one concise “Move to
  another space…” action instead of a potentially overflowing flat destination
  submenu and immediate debounced mutation. The existing organization dialog gains
  a required, scroll-bounded radiogroup: no destination is preselected, the first
  unchecked option receives initial focus, arrows/Home/End and Enter/Space only
  change the draft, and the explicit Move Group action remains separate. Duplicate
  Space names gain a localized Workspace-order qualifier in the option, confirmation,
  history, success feedback, and destination navigation announcement. Full names
  remain available to pointer and assistive-technology users. Rows use the shared
  44 px control height, typography, spacing, radii, borders, light/dark tokens,
  visible focus, forced-color check, reduced-motion rule, 32 px viewport gutter,
  height-safe fixed header/footer, and 520 px wrapped actions.

  Confirmation re-resolves one active Workspace/source Space plus unique
  destination Space and Group IDs. Missing, duplicate, moved, same-Space, cross-
  Workspace, and changed active-context targets fail before history; displayed
  names, order, or Group counts refresh for a second review while current nested
  content moves intact. One localized snapshot moves the exact Group object,
  transfers the source Canvas coordinate, updates exact matching remembered-capture
  and Archive/Trash restore references, and preserves the active source Space,
  unrelated layout/settings records, and outside item selections. The primary is
  the sole guarded focus anchor during one central-writer receipt. Only
  acknowledgement prunes moved hidden selections, renders, closes, scrolls/focuses
  the destination Space, reports success, and exposes exact-action Undo. Rejection
  leaves the dirty graph behind fail-closed recovery without retry, rollback,
  product render, close, focus claim, or false success. English and native zh-TW
  follow the established Space/`空間`, Group/`群組`, and Move/`移動` vocabulary.
  A production-controller/static contract covers entries, keyboard and focus,
  identity/stale guards, exact state/reference changes, delayed/rejected receipts,
  localization, and responsive hooks; the complete deterministic gate passes.
  This is **Implemented: yes; Verified: partial (production-controller/static-
  source contracts only); User-validated: no; Released: no**. Installed Chrome
  persistence/recovery rendering, actual screen-reader output, theme/locale pixels,
  1280×720/800 px behavior, reload/history, and representative-user trust remain
  unverified. No schema, permission, host access, import shape, local-only boundary,
  or existing stable element ID changed.
- **2026-07-16** — Completed a **receipt-gated Duplicate Group cycle**. Board,
  Canvas/focused-Group, List More, and List context actions now share the existing
  identity dialog instead of mutating immediately. The dialog presents a selected,
  localized copy name for review, preserves user-edited name/symbol/color choices
  across a concurrent source refresh, and follows live locale changes only while
  the generated name remains untouched. Long Group and Space names wrap in the
  narrow description. Missing, duplicate, moved, or inactive targets fail before
  history; unavailable inputs move focus to Cancel unless fail-closed recovery is
  the active layer, and a detached menu opener falls back to a durable surface
  control. English and native zh-TW use Group/`群組`, Space/`空間`, and Create copy/
  `建立副本`, with browser-neutral reminder recovery wording.

  Confirmation clones the full JSON-compatible Group and recursively gives the
  Group, items, and nested Stacks fresh IDs from one bounded allocator that reserves
  active, Archive/Trash, restore, capture, sizing, and Canvas identifiers. Imported
  custom fields and reminder records remain detached and intact. The copy appears
  after its source, carries cloned legacy/current sizing, and receives a Canvas
  position calculated by the production placement helpers. Null current sizes fall
  back to valid legacy widths, and unsized columns reserve the 60vh cards cap plus
  chrome at the current viewport height. Clone and layout
  preparation finish before one localized snapshot; one awaited central-writer
  receipt owns the mutation. Pending state keeps the primary as a guarded focus
  anchor. Rejection leaves the single dirty graph behind recovery without retry,
  render, close, feedback, or alarm work. Acknowledgement alone renders or routes
  the focused Group page to the copy without a second state write, focuses it,
  exposes exact-action Undo, and reconciles reminders. Duplicate, Undo, and Redo
  alarm reconciliation follows the corresponding state receipt; delayed failures
  drop stale exact Undo after a newer action. Browser history closes a non-pending
  draft before navigation; a pending receipt or recovery preserves the reviewed
  route without another graph write. Write rejection shows recovery immediately
  and moves focus to Reload in the same turn.

  A production-controller/static contract covers all entries, draft-only cancel,
  stale review, recursive ID collisions, complete graph/custom/reminder
  preservation, legacy/current size fallback, production Canvas non-overlap,
  delayed and rejected receipts, focused-Group routing/history blocking, same-turn
  recovery focus, locale repaint,
  reminder ordering, stale-warning suppression, wrapping, forced colors, and
  reduced motion. The complete deterministic gate passes. This is **Implemented:
  yes; Verified: partial (production-controller/static-source contracts only);
  User-validated: no; Released: no**. Installed browser persistence/recovery
  rendering, live alarm behavior, actual screen-reader output, theme/locale pixels,
  1280×720/800 px behavior, reload/Back/Forward, and representative-user trust
  remain unverified. No schema, permission, host access, import shape, local-only
  boundary, existing stable element ID, or Advanced surface changed.
- **2026-07-16** — Completed a **Home saved-item recovery cycle**.
  The newest real Inbox and recent-Space rows no longer advertise interactivity
  through hover alone: each is now a full-width native button with localized
  English and native zh-TW action/type naming, visible hover, focus-visible, and
  pressed feedback, and unchanged compact title/domain truncation. The rows use the
  existing type, spacing, 7 px radius, background tokens, global focus outline,
  light/dark, forced-color, and reduced-motion system; no ornamental movement or
  parallel detail surface was added.

  Activation carries primitive Workspace, preview-origin, and item IDs and
  re-resolves one globally unique current item plus one owning Space. Missing,
  duplicate, ambiguously owned, and moved-out targets stay on Home with localized
  failure feedback and no route or state mutation; a record moved inside the same
  Workspace opens at its current location. Successful recovery opens the existing
  modal sheet on `/home?item=<id>` over Home. This preserves the active Space and
  its saved layout, avoids Canvas position initialization, and makes open, close,
  Back, and Forward read-only unless a genuinely durable Workspace/Space/layout
  selection changed. Escape closes just the sheet. Focus returns to the exact
  rebuilt Inbox/Space origin, then a current native row for a moved item, then the
  established same-item/heading fallback.

  The updated production-helper/static contract covers native keyboard semantics,
  route build/parse/current/apply/close, reload normalization, nested and moved
  records, global/owning-Space ambiguity, zero-write history, durable-selection
  persistence, Canvas isolation, focus, locale parity, and responsive interaction
  CSS. All 27 JavaScript syntax checks, quality gates, and the full deterministic
  suite pass, including 10,000 concurrency schedules. This is **Implemented: yes;
  Verified: partial (production-helper/static-source contracts only); User-
  validated: no; Released: no**. Installed Chrome rendering and persistence,
  actual Back/Forward/reload, screen-reader output, theme/locale pixels, reduced
  motion, 1280×720/800 px behavior, and representative-user comprehension remain
  unverified. No schema, permission, host access, import shape, local-only boundary,
  stable element ID, or feature breadth changed. Direct-field detail receipt gating
  is covered below; item reminder/alarm ordering is the next trust slice. Popup
  post-save Locate continuation and installed activation evidence remain open.
- **2026-07-16** — Completed a **receipt-gated direct saved-item detail-field
  cycle**. Title, URL, task state/text, saved context, cover, tags, checklist, and
  custom fields now converge on one production transaction instead of per-control
  mutation and deferred persistence. The route-backed sheet retains primitive
  Workspace/Space/Group/Stack/item identity plus exact surface, location, value,
  type, ancestry, and runtime-reference fingerprints, then exhaustively re-resolves
  one unchanged target across the active graph before history or mutation. Missing,
  duplicated, moved, replaced, retyped, concurrently changed, or ambiguously owned
  targets fail closed in place.

  Field logic runs first on a detached JSON candidate, so a synchronous failure
  creates no live change, Undo entry, or write. A real change takes one snapshot,
  applies only its candidate diff to the sole dirty local graph, and awaits one
  central-writer receipt. The header reuses the existing type, spacing, color, and
  responsive system for localized Saving, Saved, stale, and failure states. Its
  polite live status wraps on narrow sheets; the body exposes `aria-busy`; pending,
  success, and error tones use the shared accent, green, and red tokens; and guarded
  controls show wait feedback without ornamental motion or a parallel surface.
  English and native zh-TW remain in the runtime dictionary.

  The synchronous pending state refuses duplicate edits, sheet close, and route or
  Back/Forward application. Tab remains contained and usable within the sheet. An
  initial Escape from an active editor may blur it and focus the stable panel,
  starting the transaction; later Escape is consumed until the receipt settles.
  A blur-started pagehide transaction owns the only write. Acknowledgement alone
  may render, refresh the heading, or report Saved. Rejected or unknown receipts
  keep the dirty graph behind authoritative recovery with no retry, rollback,
  lower-surface render, opener return, or false success.

  The production-controller/static contract covers deferred acceptance, rejected
  and unknown outcomes, one snapshot/one write, existing-recovery refusal, a
  throwing detached mutation, changed-slot/reference/imported-data preservation,
  duplicate/missing/moved/replaced/type/fingerprint/ancestry failures, second-edit
  refusal, executable pending Open/Close/scrim/body/keyboard guards, pending route/
  Escape/pagehide behavior, live-region/busy-region separation, locales, wrapping,
  responsive layout, and theme tokens.
  All 27 JavaScript syntax checks, quality gates, and the full deterministic suite
  pass, including 10,000 concurrency schedules. This is **Implemented: yes;
  Verified: partial (deterministic production-controller/static-source evidence
  only); User-validated: no; Released: no**. Actual installed Chrome
  storage and recovery, Back/Forward/reload/pagehide completion, screen-reader
  output, theme/locale pixels, reduced motion, 1280×720/800 px behavior, and
  representative-user comprehension remain unverified. Item-detail reminder state/
  alarm ordering is addressed by the following cycle. Stack identity stays in the
  separate acknowledged identity editor; Archive and the Open browser effect remain
  separate flows. No schema, import shape, permission, host access, local-only
  boundary, stable element ID, or feature breadth changed.
- **2026-07-16** — Completed a **receipt-gated item-detail reminder/alarm cycle**.
  Saved-item detail Set, Change, quick choices, and Clear now converge on one exact-
  target controller instead of mutating through the picker's ordinary debounced
  path. The controller carries the rendered primitive Workspace/Space/Group/Stack/
  item and route context, re-resolves one unchanged item across the active graph,
  preserves imported reminder fields it does not own, takes one localized snapshot,
  and requests one `State.persistNow({ reconcileReminders: true })` receipt.

  The service worker now owns the entire state→alarm boundary. It first accepts the
  revisioned state through the existing FIFO, then awaits serialized full alarm
  reconciliation and returns that structured result in the same response. The page
  sends no second reconcile message, so reload or close after state acknowledgement
  cannot lose a page-owned post-write effect. A known writer rejection runs no alarm
  pass. A lost/timed-out unknown response retains the dirty reminder graph behind
  recovery without page follow-up, close, render, focus claim, or false success,
  although an accepted worker transaction may already have completed its bundled
  alarm effect. If state is accepted but alarm
  scheduling fails, the accepted reminder remains and the user receives the
  localized scheduling warning with a direct Undo action.

  The existing reminder panel keeps the shared typography, spacing, controls,
  radius, elevation, light/dark, forced-color, narrow-layout, and reduced-motion
  system. Its polite English/native-zh-TW status is structurally outside the
  `aria-busy` body, reserves wrapped feedback space, and uses shared accent/error
  tokens. A synchronous pending boundary blocks duplicate actions, picker/detail
  close, route changes, other detail edits, and lower app shortcuts while Tab stays
  contained. Fail-closed recovery remains above the picker; otherwise Escape closes
  the last-opened reminder before detail, and completion focuses the rebuilt Set or
  Change control.

  The production-controller/static contract covers Set/Change/Clear ordering,
  unowned-field preservation, duplicate/stale targets, rejected/unknown receipts,
  accepted-state alarm warnings, pending/non-pending keys, recovery precedence,
  busy/live regions, locale parity, focus, and responsive/theme hooks. The
  background mocked-browser contract proves storage acceptance precedes alarm-map
  access and that success/failure is returned in the same typed receipt. All 27
  JavaScript syntax checks, quality gates, and the complete deterministic suite pass,
  including the import/scale/reminder matrices and 10,000 concurrency schedules.
  This is **Implemented: yes; Verified: partial (deterministic production-controller/
  static-source and mocked-browser evidence only); User-validated: no; Released:
  no**. Installed Chrome message-port/service-worker lifetime, real alarm creation/
  cleanup and notification scheduling, reload/Back/Forward/pagehide, screen-reader
  output, theme/locale pixels, reduced motion, 1280×720/800 px behavior, and
  representative-user comprehension remain unverified. Non-detail item and group/
  category reminder controllers remain separate follow-up boundaries. No schema,
  import shape, permission, host access, local-only boundary, stable element ID, or
  feature breadth changed.
- **2026-07-16** — Completed a **receipt-gated popup Open-in-Locus cycle** for
  asked single-tab capture. The destination picker now offers one explicit,
  default-off “Open saved item in Locus” / “儲存後在 Locus 開啟項目” consequence
  using the popup's existing toggle, spacing, 9 px radius, accent, focus, light/dark,
  and reduced-motion system. The required continuation is not hidden in the toast.
  A known pre-route Locate failure becomes a compact in-section accepted-save result
  with wrapped localized copy, Open Locus, and Close; focus moves to recovery and
  Escape closes the result without undoing the save.

  Selected Locate identity originally rode the same revisioned `locus-state-write`
  request as the new item; the 2026-08-03 entry below supersedes that transport
  boundary. At this earlier boundary, the service worker accepts state first, fresh-reads authority,
  requires one globally unique active item plus one unambiguous owning Space still
  inside the original Workspace,
  creates an inactive `/home?item=<id>` route in the source popup window, attempts
  close-after-save, activates recovery, and focuses that same window. Missing,
  duplicate, stored-only, moved-out, and corrupt
  targets fail closed before browser effects; movement or Stack nesting inside the
  original Workspace resolves at the current owner. State rejection creates no
  route and closes no source. Locate/create/close/activation failures are typed
  separately from the accepted state receipt, and an already-created recovery tab
  is retained with its exact tab identity so a failed activation can be retried
  without creating a duplicate generic tab. That identity also makes fallback
  notifications reopen the saved item; a retry failure is announced politely, and combined
  source-close/activation failure retains both outcomes. Popup writes now use a
  bounded receipt deadline, cancel delayed missing-receiver retries, classify all
  ambiguous transport rejections as unknown regardless of native error shape, and
  require a reopened popup before another capture. Pending capture owns competing clicks,
  Back, Escape, and Ctrl/Cmd+K. Valid Home-detail boot routes take precedence over
  calm Landing and automatic Welcome without marking onboarding seen.

  The new production-extracted contract covers combined state→effect ordering,
  exact/moved/nested identity, ambiguity and stored-record rejection, Unicode and
  reserved-character route round trips through the production router, create-before-
  close-before-activate order, source-window focus, close-disabled and combined
  partial-failure results, rejected, native-coded, non-object, and timed-out
  receipts, late retry cancellation, popup intent/rollback, semantic recovery
  markup, exact-tab/notification retry, retry live feedback, focus/motion hooks,
  locale parity, and deep-link overlay
  precedence. All 28 JavaScript syntax checks, quality gates, and the complete
  deterministic suite pass, including the import/scale/reminder matrices and 10,000
  concurrency schedules. This is **Implemented: yes; Verified: partial
  (production-extracted/static-source and mocked-browser evidence only); User-
  validated: no; Released: no**. Installed Chrome action-popup teardown and message-
  port/service-worker lifetime, real tab activation/close, actual Back/Forward/
  reload, screen-reader output, theme/locale pixels, reduced motion, 1280×720/800 px
  behavior, and representative-user comprehension remain unverified. Ask-every-time-
  off quick capture and whole-window save still lack an equivalent explicit
  continuation. No schema, import shape, permission, host access, existing stable
  element ID, local-only boundary, or feature breadth changed.
- **2026-07-24** — Completed a **durable whole-window popup receipt and recovery
  cycle**. Whole-window save no longer flashes a 900 ms toast and closes the popup
  before the result can be understood. Links-only, session-Group, and reading-queue
  modes now reuse the existing compact Folio result card to name the saved content,
  exact Space / Group destination, and truthful source outcome. The active popup
  tab stays open. The card offers one clear **Open destination** continuation plus
  Close, wraps its feedback at popup width, and retains the established DM Sans,
  neutral paper, ink, indigo/violet accent, 9 px radius, focus, light/dark, and
  reduced-motion language rather than introducing another surface.

  Whole-window persistence and source effects now have an explicit two-phase
  boundary. The popup first awaits the ordinary revisioned state receipt. Only a
  valid accepted receipt dispatches the separate worker-owned
  `locus-complete-window-save` request; a rejected, lost, timed-out, malformed, or
  otherwise acknowledgement-unknown write dispatches no close request. The worker
  fresh-resolves one exact receiving Group and owning Space in the original
  Workspace while holding the central state FIFO/Web Lock through removal, so
  another Locus mutation cannot change that destination mid-effect. It accepts only
  unique local `{ tabId, expectedUrl }` descriptors and requires each expected URL
  to remain recursively present in the exact receiving Group, then
  confirms each current tab still belongs to the recorded source window, is
  inactive, matches its captured URL, and has no different pending URL immediately
  before removal. Malformed/duplicate, no-longer-saved, moved, newly active,
  navigated, or redirecting candidates remain open or count unconfirmed.
  Missing, duplicated, moved-out, or ambiguous destinations close nothing. The
  receipt reports exact closed and unconfirmed counts and the authoritative current
  Space / Group names after an in-Workspace move or rename. A lost, timed-out,
  malformed, or internally inconsistent completion receipt preserves
  the accepted save and labels the destination and every requested close outcome
  unconfirmed instead of claiming that no source closed. The control now truthfully
  says **Close other tabs after saving** / **儲存後關閉其他分頁**.

  Open destination fresh-resolves the same Group, reuses or creates its encoded
  local Group route, and activates and focuses that exact tab. After activation
  failure, every popup retry fresh-resolves the destination instead of directly
  activating a remembered tab; a route that navigates during activation is not
  accepted as success. A destination removed after saving degrades to Open Locus
  without recasting the accepted save as a failure. A valid first-use Group route
  suppresses automatic Welcome without marking it seen. The short primary label is
  described by the current destination, saved-content summary, and source outcome.
  Popup sections now restore the exact prior opener in true
  last-opened-first-closed order, save modes use one roving radio Tab stop, and the save-options
  group, custom tag input, and optional note input have localized English and native
  zh-TW accessible names.

  Production-source static gates encode valid-state-receipt-before-completion,
  absence of page-owned removal, central FIFO/Web Lock serialization, recursive
  saved-URL membership, and source-window/active/URL confirmation before each close.
  The expanded production-extracted popup-Locate contract passes all three modes,
  duplicate-only note/no-note behavior, receipt/identity ordering, URL-safe source
  recovery, exact destination routes, LIFO focus with unusable-opener fallback,
  accessible semantics, and English/zh-TW parity. This is **Implemented: yes;
  Verified: partial (production-extracted deterministic, static-source, and
  mocked-browser evidence only); User-validated: no; Released: no**. Installed
  action-popup teardown/message lifetime, real tab
  effects, screen-reader output, theme/locale pixels, reduced motion,
  1280×720/800 px behavior, reload/history, and representative-user comprehension
  remain unverified. Ask-every-time-off quick capture remains the popup continuation
  gap. Popup teardown before completion dispatch deliberately leaves sources open
  after the accepted save, but that real lifecycle remains installed-unverified.
  No schema, import shape, permission, host access, existing stable element ID,
  local-only boundary, or feature breadth changed.
- **2026-07-24** — Completed a **recoverable ask-every-time-off quick-capture
  cycle**. A successful one-click single-tab save no longer flashes generic
  confirmation and closes the popup on a timer. It keeps the source open and reuses
  the existing compact Folio result card to show the authoritative current Space,
  Group, and saved title. The card focuses **Open saved item** first. Its secondary
  is **Close tab** only when close-after-save is configured; otherwise it is
  **Close popup**. English and native zh-TW names use the existing type, spacing,
  density, control size, 9 px radius, paper/ink/accent, visible-focus, light/dark,
  and reduced-motion language. `100dvh` and compact rules at 520 px height or less
  keep the fixed popup bounded without creating another surface. There is no timer,
  toast, modal, notification, ornamental motion, or forced navigation. Before
  either action, Escape closes the popup only and requests no source close; Tab
  reaches the secondary.

  Persistence stays the first gate. The same state write returns a strict quick-
  item receipt only after acceptance. Rejected, timed-out, lost, malformed, or
  acknowledgement-unknown state launches no quick browser effect. Open and Close
  are separate service-worker-owned actions. Each fresh-reads authority, requires
  one exact active saved item at the expected URL and one owning Space in the
  original Workspace, and reports current names after a valid in-Workspace move or
  rename. Missing, duplicated, stored-only, moved-out, or URL-changed identity is
  unavailable. Open reuses or creates the encoded `/home?item=<id>` route,
  activates the exact tab, focuses its window, and confirms that route after focus.

  A requested source close additionally confirms the exact source tab/window,
  current URL, no different pending URL, and no inactive-to-active transition. For
  Open-with-Close, the worker reads the route again after source validation
  immediately before removal. Route mismatch/unconfirmed, source protected, and
  source unconfirmed outcomes fail closed without a blind close or false success.
  An unexpected worker failure is typed `effectUnknown`; the popup retains safe
  Open identity while disabling destructive Close. The small unavoidable last-read-
  to-effect interval is recorded as installed risk rather than manufactured proof.

  The expanded production-extracted popup contract covers accepted/rejected/unknown
  state, current and moved/renamed identity, missing/duplicate/stored/moved-out
  targets, encoded route create/reuse/focus, two route rereads, source tab/window/
  current/pending URL and active-transition validation, protected/unconfirmed and
  malformed results, unknown-effect recovery, focus, responsive/motion hooks, and
  English/zh-TW parity. All 28 JavaScript syntax checks, all 21 deterministic suites,
  the popup contract line, quality gates, and diff check pass. This is **Implemented:
  yes; Verified: partial (production-extracted deterministic, static-source, and
  mocked-browser evidence only); User-validated: no; Released: no**. Installed
  action-popup teardown/message-port/service-worker lifetime, actual tab activation/
  removal/focus, the last-check-to-effect race, real scrolling at 520 px or less,
  pixels, keyboard/screen-reader behavior, light/dark, English/zh-TW, reduced motion,
  1280×720/800 px layouts, reload/history, and representative-user comprehension
  remain unverified. The asked ordinary Save/Locate path is unchanged. No schema,
  import shape, permission, host access, existing stable element ID, local-only
  boundary, or feature breadth changed.
- **2026-07-26** — Completed a **keyboard-visible first-save recovery cycle**.
  Saved tab titles are now native primary Open buttons rather than click-only text
  inside a generic focused card. The Welcome → Inbox handoff, Board Arrow
  navigation, and saved-item detail return converge on that direct action. Enter
  and Space use native activation; Details/Open/Archive icon controls reveal on
  `:focus-within` and carry title-specific English and native zh-TW names. Existing
  typography, density, 22 px compact actions, radii, focus tokens, light/dark
  variables, forced-colors behavior, and reduced-motion rules are reused without
  adding a surface or ornamental transition.

  Saved-address activation now fails closed through one allowlisted helper.
  Missing, malformed, script, extension, and unsupported addresses remain
  focusable as unavailable and trigger no browser or state effect. Whitespace-only
  stored titles fall back to the address or localized Untitled copy without
  rewriting imported data. Direct primary lookup cannot descend into nested Stack
  content. Focused Group/Inbox routes render their reused column expanded while
  preserving the board's saved collapse preference. Context menus and post-render
  Group edits return focus to the visible More action instead of the hidden
  focused-page collapse control.

  Saved-tab context commands now converge on the same direct primary action.
  Shift+F10 and the Context Menu key anchor and focus the menu; Escape and command
  dispatch restore the opener before continuing. Open, background Open, Copy URL,
  Edit title, Favorites, Read Later, and Archive copy is localized in English and
  native zh-TW. Clipboard confirmation follows the resolved write and denial
  produces an error. Edit title routes into the receipt-gated detail title field
  instead of a native prompt, with one-shot title focus and rebuilt-card focus
  return. Metadata toggles return to the rebuilt card, both Archive entry points
  use a next/previous/Group/board focus fallback, and detail Open shares the URL
  guard. The click-only color picker and legacy direct reminder writer stay out of
  this core menu; receipt-gated reminders remain in Details.

  The expanded production-extracted onboarding and Group/Stack contracts cover URL
  acceptance and rejection, exact browser-effect delegation, first-save focus,
  Arrow/detail targeting, nested-Stack hierarchy, collapsed-Inbox visibility,
  title fallback, keyboard/pointer context-menu anchoring, first-item/opener and
  post-mutation focus, clipboard receipts, prompt removal, detail-title initial
  focus, guarded detail Open, post-render visible focus, focus-within CSS, and
  locale parity.
  All 28 JavaScript syntax checks, all 21 deterministic suites, quality gates, and
  diff check pass. This is **Implemented: yes; Verified: partial
  (production-extracted deterministic and static-source evidence only); User-
  validated: no; Released: no**. Installed tab effects, real screen-reader output,
  rendered light/dark and English/zh-TW pixels, 1280×720/800 px behavior, browser
  zoom, and representative-user recovery remain unverified. No schema, import
  shape, permission, host access, stable element ID, local-only boundary, or
  feature breadth changed.
- **2026-07-29** — Completed a **stable-ID, receipt-gated Group/Space reminder
  removal cycle**. Destructive removal keeps the established responsive reminder
  dialog and Folio visual language: the same typography, spacing, density, control
  sizes, radii, elevation, light/dark tokens, visible focus, and reduced-motion
  behavior. English and native zh-TW copy identifies the exact reminder. Group
  rows, Space menus, and Calendar reminder menus, including keyboard context-menu
  entry, now converge on that one dialog and destructive action rather than
  maintaining parallel removal patterns. No new layout, surface, or ornamental
  motion was added.

  The dialog freezes one Workspace/Space/Group-or-Space/reminder identity and
  reminder-value fingerprint, then fresh-resolves the target by its stable
  schema-12 reminder ID at confirmation. Reordering an unchanged sibling is safe.
  A missing or duplicate ID, replaced reminder, changed value, moved owner,
  archived/trashed owner, or otherwise stale context fails closed. Pre-existing
  persistence recovery is rejected before snapshot, mutation, or write. A valid
  target takes one localized snapshot, removes only the fresh ID-resolved record,
  and awaits `State.persistNow({ reconcileReminders: true })`; the acknowledged
  state receipt owns dialog close, render, success feedback, and exact Undo.
  Rejected or acknowledgement-unknown writes retain the dialog or recovery layer
  and make no success claim. Accepted state followed by alarm-reconciliation
  failure keeps the authoritative removal and shows a localized warning with the
  same exact Undo.

  Pending removal disables duplicate confirmation and blocks Escape, close, and
  scrim dismissal while preserving the dialog's Tab trap and exposing `aria-busy`
  status. Browser Back/Forward and programmatic route changes retain the reviewed
  route until the receipt settles, with a second check after detail-editor blur.
  Initial focus lands on the exact destructive control. Cancel returns to the
  opener; completion focuses the next reminder, previous reminder, or stable
  Group/Space owner fallback after render. A stale captured menu action refreshes
  current state, explains that the reminder changed or disappeared, and schedules
  the current owner focus fallback rather than ending as a silent no-op.

  A fresh bundled-Node Playwright shim rendered the current source at 1280×720 and
  800×720, including zh-TW, dark theme, and reduced motion. The dialog remained
  bounded, destructive focus was exact, and a deferred receipt kept the dialog
  open and busy while Escape was blocked. Resolving the receipt then closed it,
  focused the surviving reminder, and exposed Undo; no console or page errors were
  captured. All 28 JavaScript syntax checks, the quality gate, all 20 contract
  scripts (21 deterministic checks total), the 10,000-schedule concurrency run,
  and `git diff --check` pass.

  This is **Implemented: yes; Verified: partial (targeted production-extracted
  deterministic/static evidence plus shim-rendered Chromium evidence);
  User-validated: no; Released: no**. The shim does not establish installed MV3
  behavior, real Chrome storage/alarm or cross-window/service-worker lifetime,
  notification delivery, screen-reader output, or representative-user success. No
  schema, import shape, permission, host access, stable element ID, local-only
  boundary, or feature breadth changed. The remaining reminder convergence work is
  non-detail item mutation plus Group/Space add, edit, and reschedule.
- **2026-07-29** — Completed an **exact-destination Paste links cycle**. The
  Settings utility now looks and behaves like the same product as the receipt-gated
  identity and recovery flows: a 480 px token-based modal with 32 px viewport
  gutters, scroll-bounded body, shared header/footer/elevation, 36 px destination
  fields, 8 px input radii, visible accent focus, polite status regions, light/dark
  tokens, forced-color focus, reduced motion, and a one-column reflow below 520 px.
  It adds no illustration, ornamental motion, native prompt, or competing import
  pattern. English and native zh-TW copy names the exact Workspace/Space, accepted
  and skipped lines, existing or new Group, busy/failure state, and successful
  destination. Empty Spaces reveal the visible Group-name field instead of silently
  applying an English-only name.

  The visual review is backed by one exact transaction. Opening freezes the
  Workspace/Space and reviewed Group; active-view changes cannot redirect it,
  harmless sibling reorder remains valid, and missing/moved/duplicated/replaced/
  renamed targets stop before history. Unique HTTP(S) lines are prepared as real
  local tab items with collision-safe Group/item IDs. One localized snapshot and
  one awaited central-writer receipt own render, close, opener focus, feedback, and
  exact Undo. Pending state makes Settings inert, retains textarea focus and Tab
  containment, and blocks duplicate activation, X/Cancel/scrim, Escape, and
  navigation. Unknown or rejected acknowledgement keeps the dirty graph behind
  recovery without a success claim.

  Current-source Chromium evidence covered English/light at 1280×720 and
  zh-TW/dark/reduced-motion at 800×720: bounded geometry, live two-valid/two-skipped
  feedback, initial textarea focus, inert background, pending close/Escape blocking,
  acknowledgement-unknown recovery, exact accepted Group placement, localized Undo,
  opener return, and reload survival with the same item ID. The plain-HTTP harness
  stubbed the extension-only `_favicon` endpoint. This is **Implemented: yes;
  Verified: partial (production-extracted deterministic/static plus browser-shim
  evidence); User-validated: no; Released: no**. The supported browser surface
  exposed no installed Chrome/extension backend, so installed MV3 persistence,
  cross-window adoption, screen-reader output, CSP/local-favicon/network behavior,
  and representative-user trust remain open.
- **2026-07-29** — Completed a **theme-scoped primary Save treatment**.
  Acceptance passed when the theme-bearing body, rather than `:root`, began
  resolving the shared accent gradient. This restores the unmistakable blue→violet
  **Save tab** button and the existing dependent accents without changing layout,
  behavior, data, permissions, or motion.

  Current-source browser-shim evidence covered English/light at 1440×900 and
  1280×720 plus native zh-TW/dark/reduced-motion at 800×720. Computed gradients
  were present, viewport and scroll widths matched, duplicate-ID/raw-key scans and
  browser logs were clean, and the complete deterministic block passed. This is
  **Implemented: yes; Verified: partial (static, deterministic, and current-source
  browser-shim evidence); User-validated: no; Released: no**. Installed MV3,
  forced-colors, browser-zoom, screen-reader, and representative-user evidence
  remain open. The next reproduced visual/localization failure is the English-only
  sidebar-collapse accessible name under native zh-TW.
- **2026-07-29** — Completed a **state-aware localized sidebar toggle**.
  The same compact icon control now names the action it will perform, rather than
  retaining a static English label: **Collapse sidebar / Expand sidebar** and
  native **收合側邊欄 / 展開側邊欄**. Tooltip, accessible name, controlled region,
  and expanded state stay synchronized without changing layout, navigation,
  persistence, motion, or visual treatment.

  Current-source evidence covered both states, focus retention, collapsed-state
  reload persistence, and 1440×900, 1280×720, plus
  zh-TW/dark/reduced-motion 800×720. The complete deterministic block passed.
  This is **Implemented: yes; Verified: partial (static, deterministic, and
  current-source browser-shim evidence); User-validated: no; Released: no**.
  Installed screen-reader, zoom, forced-colors, and representative-user evidence
  remain open. The next bounded core-shell locale failure is the English
  **Views** navigation accessible name in native zh-TW.
- **2026-07-29** — Completed a **localized, state-aware core-shell names cycle**.
  The primary navigation region now exposes **Views / 檢視**. The opened-tabs
  toggle names its live next consequence in English and native zh-TW, while its
  tooltip, accessible name, controlled content, and expanded state stay aligned.
  The Space layout icon also preserves **Switch layout / 切換版面** instead of
  replacing localized copy with an English runtime label.

  Production-helper contracts execute both rail states and both locales.
  Current-source rendering covered Home and a populated Space, click focus,
  expanded-state reload persistence, 1440×900, 1280×720, and a hidden rail at
  800×720 without overflow or duplicate IDs. This is **Implemented: yes;
  Verified: partial (static, deterministic, and current-source browser-shim
  evidence); User-validated: no; Released: no**. Installed MV3, screen-reader,
  zoom, forced-colors, and representative-user evidence remain open. The same
  native zh-TW Board reproduced the next bounded locale failure: English
  **Add tab** actions and the **Write a note…** quick-entry hint.
- **2026-07-29** — Completed a **native zh-TW Board quick-add and Note-guidance
  cycle**. Each Group footer now uses one localized source for visible text,
  tooltip, and accessible name: **Add tab / 加入分頁**,
  **Add note / 新增筆記**, and **Add to-do / 新增待辦**. Empty Note guidance
  moved from a stylesheet-owned English literal to escaped localized data while
  preserving the slash commands, and the editor now exposes named multiline
  textbox semantics.

  Production-source contracts require both locale dictionaries and reject the old
  hardcoded runtime/CSS copies. Current-source rendering covered both locales,
  creation focus, computed placeholder content, exact new-Note reload persistence,
  1440×900, 1280×720, and zh-TW/dark/reduced-motion 800×720. This is
  **Implemented: yes; Verified: partial (static, deterministic, and current-source
  browser-shim evidence); User-validated: no; Released: no**. Installed MV3,
  screen-reader, zoom, forced-colors, and representative-user evidence remain
  open. The next reproduced Board failure is click-only To-do completion plus
  English **Archive** names on Note/To-do controls.
- **2026-07-29** — Completed a **native, focus-stable Board To-do completion
  cycle**. The completion affordance is now a real button whose localized next
  action and `aria-pressed` agree. One shared controller updates the existing
  `done` field and persistence path, re-renders once, then resolves the same
  stable item ID and returns focus to its rebuilt button. The To-do editor is a
  named single-line textbox, Note/To-do Archive controls are localized, and the
  To-do action strip appears when the item contains keyboard focus.

  Production-helper tests execute both completion states, exact mutation/write/
  render counts, and stable focus resolution. Current-source rendering covered
  exact-item focus, completion reload, new-To-do focus/reload, both locales,
  1440×900, 1280×720, and zh-TW/dark/reduced-motion 800×720. This is
  **Implemented: yes; Verified: partial (static, deterministic, and current-source
  browser-shim evidence); User-validated: no; Released: no**. Installed
  Enter/Space, screen-reader, zoom, forced-colors, MV3, and representative-user
  evidence remain open. The next reproduced capture-surface residue is English
  **Select tab / Close tab** in the native zh-TW opened-tabs rail.
- **2026-07-29** — Completed a **native, localized opened-tab row controls
  cycle**. Selection is now a native checkbox button with an exact-tab,
  state-aware localized name; repaint resolves the same browser tab ID and returns
  focus. Direct Close names the tab, and the empty state, sleeping badge, context
  menu, batch badge, and multi-drag count share the English/native-zh-TW
  dictionary. Dynamic rail content repaints immediately after a locale change.

  Production-controller contracts execute selection/deselection and exact focus
  restoration while rejecting the prior custom keyboard and hardcoded copies.
  Current-source rendering covered empty, sleeping, populated, and multi-tab
  states, localized batch/menu actions, plus an exact shim tab-remove request at
  1440×900 and 1280×720; the rail stayed hidden at zh-TW/dark/reduced-motion
  800×720. This is **Implemented: yes; Verified: partial (static, deterministic,
  and current-source browser-shim evidence); User-validated: no; Released: no**.
  Installed keyboard/screen-reader/drag, real tab effects, zoom, forced colors,
  MV3 lifetime, and representative-user evidence remain open. The remaining
  visible app-owned zh-TW shell residue is the pointer-only English **Resize**
  Group handle.
- **2026-07-29** — Completed a **native keyboard Group resize and bounded-listener
  cycle**. The width edge and corner are native buttons with exact localized Group
  names and Arrow-key tooltips. Left/Right and corner Up/Down change only their
  named axis by 16 px or 48 px with Shift, keep the existing size bounds, and
  persist the same `{ w, h }` shape once without rebuilding or losing focus.
  Pointer resize now uses capture plus handle-local move/up/cancel/lost-capture
  listeners; the active Group's reorder gesture is suspended and restored within
  that lifecycle. Rendering a Board no longer accumulates document mouse
  listeners.

  Production helpers execute keyboard and pointer geometry, every bound,
  orthogonal-axis preservation, and the exact size writer. Current-source visuals
  and keyboard/reload checks covered 1440×900, English/light 1280×720, and native
  zh-TW/dark/reduced-motion 800×720, including both focus treatments and focused-
  Group hiding. This is **Implemented: yes; Verified: partial (static,
  deterministic, and current-source visual/keyboard evidence); User-validated:
  no; Released: no**. The in-app pointer driver emitted only captured
  `pointerdown`, so actual pointer completion, installed MV3, screen-reader, zoom,
  forced colors, representative-user, and release evidence remain open. The
  scoped native-zh-TW Board control scan found no further app-owned English core
  residue.
- **2026-07-29** — Completed a **localized accessible Board item-color cycle**.
  The previously invisible direct-color surface is now one compact floating
  palette whose six circular swatches use Locus theme tokens instead of a
  one-off light treatment. No color uses a patterned slash; selected state uses
  the shared accent ring plus a check; keyboard focus is separately visible; and
  the same geometry remains bounded in English/light and native zh-TW/Locus Dark
  at 1280×720 and 800×720.

  The visual control is backed by one exact-identity transaction rather than a
  decorative picker: changed colors persist and return to the same item, current
  colors are no-ops, and stale/ambiguous/recovery-owned targets fail closed. The
  production-extracted/static block and current-source visual/interaction checks
  pass. This is **Implemented: yes; Verified: partial (static, deterministic, and
  current-source evidence); User-validated: no; Released: no**. Installed native
  Enter/Space, screen-reader, zoom, reduced-motion, forced-colors, MV3, and
  representative-user evidence remain open.
- **2026-07-29** — Completed a **receipt-gated non-detail item reminder cycle**.
  Board and Calendar item Set/Change/quick/Clear/reschedule now share one
  non-detail controller. It freezes the complete Workspace/Space/Group/Stack
  ancestry, exact record/reference, item type, location, and full-value identity;
  preserves imported reminder fields; and awaits one combined state/alarm receipt
  before close, render, feedback, or focus. The page no longer creates or clears
  alarms for this path.

  The responsive reminder dialog remains open and busy during an outstanding
  receipt. Acknowledged success renders once and restores the exact Board item or
  Calendar target; rejection keeps the picker beneath fail-closed recovery and
  never paints an optimistic badge. Production-controller tests cover accepted,
  alarm-warning, rejected, unknown, no-op, invalid, recovery, stale/ambiguous
  identity, clear, and pending interlocks. Current-source checks covered
  Board/Calendar Set/Clear/Edit, reload, stable focus, a 1.2-second delayed
  acknowledgement, rejection recovery, English/light 1280×720, and native
  zh-TW/Locus Dark 800×720. This is **Implemented: yes; Verified: partial
  (static, deterministic, and current-source visual/interaction evidence);
  User-validated: no; Released: no**. Installed MV3 message/storage/alarm
  lifetime, notifications, restart/sleep, screen-reader, zoom, forced colors, and
  representative-user evidence remain open. The rendered zh-TW badge exposed the
  next bounded issue: its relative time still appears in English.
- **2026-07-29** — Completed a **locale-aware shared relative-time cycle**.
  One formatter now owns all future/past sub-minute, minute, hour, and day output.
  English retains the existing compact thresholds; native zh-TW uses **即將**,
  **剛剛**, and variable **分鐘／小時／天 + 前／後** wording. Reminder badges
  and lists, Calendar, search, Read Later, Archive, and every existing caller
  inherit the same locale boundary.

  Language changes repaint dynamic surfaces from unchanged timestamps. The real
  settings controls repainted one persisted reminder
  `in 58m → 58 分鐘後 → in 58m`, and reload retained it. Production tests
  execute 20 exact locale/threshold outcomes. Current-source rendering covered
  the Board badge and Calendar Agenda timestamp at English/light 1280×720 and
  native zh-TW/Locus Dark 800×720; widths matched and duplicate IDs, raw keys,
  scoped English relative fragments, and browser logs were empty. This is
  **Implemented: yes; Verified: partial (static, deterministic, and
  current-source visual/interaction evidence); User-validated: no; Released:
  no**. Installed MV3, screen-reader, zoom, forced-colors, and representative-user
  evidence remain open. The same Calendar screenshot reproduced the next bounded
  issue: its surrounding navigation, view, filter, and Agenda labels remain
  English in native zh-TW.
- **2026-07-29** — Completed a **localized accessible Calendar recovery-shell
  cycle**. Breadcrumb, Back consequence, period/view/navigation controls,
  filter, Past due/Today/Tomorrow sections, counts, empty/no-match states,
  feedback, source/tooltips, Undo copy, and fallback titles now use one 33-key
  English/native-zh-TW family. Month/Week/Agenda expose a localized grouped name
  and exact pressed state; protected filter operators and user-authored names
  remain literal data.

  Locale repaint preserves route, view, filter, reminder IDs, and timestamps.
  Workspace-empty and filter-no-match states each render once instead of stacking
  an Agenda duplicate. Escape clears a nonempty filter and restores the rebuilt
  input at caret zero. Production helper/static contracts cover fallbacks,
  Today/Tomorrow, 0/1/many counts, Group/Space source names, dot titles, key
  usage, semantics, and residue. Current-source interaction covered all three
  routes, past/future reminders, localized menu plus Open/Back, filter/empty
  states, and live locale repaint at English/light 1280×720 and native
  zh-TW/Locus Dark/reduced-motion 800×720. Widths matched and duplicate IDs, raw
  keys, scoped English residue, and browser logs were empty. This is
  **Implemented: yes; Verified: partial (static, deterministic, and
  current-source visual/interaction evidence); User-validated: no; Released:
  no**. Installed MV3, screen-reader, zoom, forced-colors, and representative-user
  evidence remain open. Group/Space add/edit/reschedule and Calendar Add-task are
  covered by the following cycles.
- **2026-07-29 — Completed a receipt-gated Group/Space reminder mutation
  cycle.** The existing reminder dialog, Group reminder strip, Space owner menu,
  and Calendar dots keep the same Folio density, typography, tokens, responsive
  geometry, native zh-TW copy, and focus language. No new event type, layout,
  modal, or decorative motion was added.

  The visual path is now backed by one reviewed transaction. Add freezes the exact
  owner and allocates a collision-safe stable ID; edit freezes the exact stable
  reminder and preserves imported fields; Calendar reschedule freezes that same
  identity at drag start and owns only time/delivery state. One acknowledged
  state-plus-alarm receipt owns close, render, Undo/warning feedback, and rebuilt
  row/dot/owner focus. Pending picker and Calendar paths guard lower interaction;
  rejection leaves the edited dialog visible beneath the existing fail-closed
  recovery layer instead of painting an optimistic reminder.

  Production-extracted tests cover identity, field preservation, no-op, receipt,
  alarm-warning, recovery, interlock, and focus outcomes. Current-source checks
  covered accepted and delayed Group mutations, native zh-TW Space edit, reload,
  and rejected recovery at English/light 1280×720 and native zh-TW/Locus Dark
  800×720. Screenshots remained visually coherent; duplicate IDs, raw keys, and
  browser logs were empty. A synthetic page-world drag sequence moved and
  reloaded the exact stable Space reminder; the coordinate driver did not
  synthesize native HTML5 drag, so native installed input remains open. This is
  **Implemented: yes; Verified: partial (static, deterministic, current-source
  visual/interaction, and synthetic drag-handler evidence); User-validated: no;
  Released: no**. Installed MV3 lifetime, real alarm/notification behavior,
  screen-reader, zoom, forced colors, representative-user, and release evidence
  remain absent. Calendar Add-task is covered by the following cycle.
- **2026-07-29 — Completed a receipt-gated Calendar Add-task cycle.** The day
  menu now opens one compact Folio dialog instead of a native prompt. Before
  typing, the user can review the localized date, fixed 9:00 AM reminder, active
  Space, and existing or proposed Inbox. The panel reuses the product's
  typography, spacing, 36 px controls, 8 px radii, elevation, visible focus,
  light/dark tokens, and responsive 32 px viewport gutters; native zh-TW remains
  concise at 800×720.

  The visual review owns one exact transaction. Confirmation re-resolves the
  frozen Workspace/Space/Inbox identity, allocates collision-safe retained IDs,
  creates at most one Inbox plus one to-do/reminder, and awaits one combined
  state-plus-alarm receipt. Pending keeps the dialog busy and blocks dismissal,
  shortcuts, history, navigation, and duplicate activation. Accepted storage
  closes, focuses the exact new dot, and shows localized success plus Undo;
  alarm-only failure warns. Rejection leaves the unavailable dialog beneath
  fail-closed recovery and paints no optimistic task.

  Production-extracted cases cover existing/proposed Inbox, reorder safety,
  stale/ambiguous identities, ID collisions, validation, recovery, receipt
  outcomes, interlocks, localization, focus, and legacy-path absence.
  Current-source interaction covered accepted save/reload, a delayed receipt
  with native Escape/Back blocked, rejected recovery, English/light 1280×720,
  and native zh-TW/Locus Dark 800×720. The narrow DOM audit found no duplicate
  IDs, raw keys, or warning/error logs. **Implemented: yes; Verified: partial
  (static, deterministic, and current-source visual/interaction evidence);
  User-validated: no; Released: no.** Installed MV3 lifetime, notifications,
  restart/sleep, screen-reader, zoom, forced colors, representative-user, and
  release evidence remain open.
- **2026-07-29 — Completed an exact-destination contextual capture cycle.**
  Browser page, link, selection, image, shortcut, and whole-window context-menu
  saves now obey the same product trust language as the visible Save flows even
  though their surface is browser-owned. A configured destination must resolve
  to one exact Workspace/Space/Group hierarchy; stale or ambiguous settings never
  redirect content. Single capture reuses one exact Inbox or provisions it only
  when absent. Whole-window capture creates one native English or zh-TW
  **工作階段** Group directly in the exact Space without a decorative or
  unrelated Inbox.

  The service-worker transaction allocates every generated structure/item ID
  against active and retained identities, performs one guarded state write, and
  treats conflict, quota, invalid, or unknown failure as terminal. Only accepted
  storage may badge success or begin cleanup. Before removal, each exact source
  tab is checked again for ID, window, URL, and pending URL; the initiating tab
  and any newly active whole-window tab remain open.

  Production-extracted browser-API cases cover active/default/remembered/fresh
  destinations, stale and duplicate identities, existing/proposed/duplicate
  Inbox, retained-ID collisions, duplicate/unsupported URLs, accepted and
  rejected writes, navigation after save, disabled close, exact-window Session
  capture, and guarded cleanup. The complete mechanical block passes.
  **Implemented: yes; Verified: partial (static and deterministic browser-API
  model evidence); User-validated: no; Released: no.** No current-source visual
  claim applies to this worker-only surface. Installed MV3 context-menu, badge,
  notification, real tab effects, receipt teardown, restart, accessibility,
  representative-user, and release evidence remain open.
- **2026-07-29 — Completed an exact popup destination and generated-Group
  capture cycle.** The popup's visible destination is now a read-only review of
  one exact explicit, remembered, default, or active hierarchy. An empty Space
  shows a detached proposed Inbox rather than modifying saved data merely because
  the popup rendered. Stale, moved, incomplete, duplicate, or changed targets do
  not redirect the save.

  The real transaction re-resolves that review, uses one retained-ID allocator
  across every generated Inbox, Session/bookmark Group, tab, and note, and makes
  one guarded state request. Single, quick, links/queue, and save-before-hibernate
  may create one needed Inbox; Session and bookmark capture create directly in the
  reviewed Space. Bookmark import now shares the popup pending interlock and
  prepares candidates before mutation. Only accepted ordinary single-tab storage
  may fresh-read and remove the same tab ID/window/URL with no different pending
  URL.

  Production-extracted cases cover destination exactness, changed and ambiguous
  targets, retained-ID collisions, existing/proposed/duplicate Inbox, all popup
  generation families, empty/rejected rollback, pending bookmark overlap, and
  ordinary-source validation. The complete mechanical block passes.
  **Implemented: yes; Verified: partial (static and deterministic
  production-extracted evidence); User-validated: no; Released: no.** This slice
  changes no layout or copy, so it adds no visual claim. Installed popup teardown,
  real bookmark/tab effects, storage/message/service-worker lifetime,
  keyboard/screen-reader, representative-user, and release evidence remain open.
- **2026-07-29 — Completed an exact-selection rich-text Link cycle.** Board
  Notes, Group READMEs, and item-detail notes no longer invoke an English native
  URL prompt. Their localized toolbar and delegated Ctrl/Cmd+K path open one
  compact review dialog that shows the selected text, accepts only a full
  HTTP(S) address, traps focus, preserves recovery precedence, and restores the
  exact editor selection on Cancel or Escape.

  The controller freezes one connected editable `.note-text`, its exact HTML and
  selected text, plus Range nodes and offsets. Confirmation revalidates the whole
  identity before one `createLink` and one bubbling `input`; the existing Board,
  Group README, or detail blur/dirty transaction remains the only persistence and
  history owner. Invalid, changed, replaced, disconnected, false, and thrown
  outcomes remain in the dialog, claim no success, and write no state.

  Production-extracted tests cover URL normalization, exact selection and editor
  identity, success/failure rollback, focus/interlock/recovery behavior, blur
  ownership, English/native zh-TW copy, responsive layout, and reduced motion.
  The complete mechanical block passes. Browser policy blocked the app shim, so
  current-source interaction is not claimed; the prescribed script-free fixture
  rendered the exact production fragment and stylesheet cleanly in English/light
  and native zh-TW/Locus Dark at 1280×720, 800×720, and 480×500 without overflow,
  duplicate IDs, raw keys, warnings, or errors. **Implemented: yes; Verified:
  partial (static, deterministic production-extracted, and current-source static
  visual evidence); User-validated: no; Released: no.** Installed MV3 interaction,
  actual browser `execCommand` and persistence, screen-reader/zoom/forced-colors,
  representative-user, and release evidence remain open.
- **2026-07-29 — Completed a localized organization-terminology boundary.**
  Explorer now presents localized Space, Group, Item, and Stack headings,
  listbox names, and empty states. Import review localizes its metadata, modes,
  actions, six counts, success/warning feedback, and validator diagnostics;
  indexed paths such as `workspaces[0].categories[1].groups[2]` become precise
  one-based Workspace/Space/Group locations before display. The legacy hidden
  Space strip also names its scroll controls with Space terminology.

  The presentation boundary deliberately leaves the durable `categories` schema,
  migrations, routes, reminder kinds, and backup envelopes unchanged. Generic
  symbol categories and Finance transaction categories retain their domain
  wording. A production/static contract executes English and native zh-TW path
  mapping, known and fallback diagnostics, quoted-value preservation, dynamic
  repaint, Explorer copy, markup, schema preservation, and responsive CSS.
  Import recovery still rejects 33 malformed boundaries plus 128 seeded
  mutations, and the 1,488,148-byte scale/compatibility corpus passes.

  Exact current-source fragments with production stylesheets were visually clean
  for English/light and native zh-TW/Locus Dark Explorer and Import at 1280×720
  and 800×720. A 480×500 Import pass kept the header and actions visible while
  scrolling only the review body. **Implemented: yes; Verified: partial
  (static, deterministic production-extracted, and current-source static visual
  evidence); User-validated: no; Released: no.** Live app Import/Explorer
  interaction, FileReader behavior, installed MV3 storage/message/service-worker
  behavior, screen-reader/zoom/forced-colors, representative-user, and release
  evidence remain open.
- **2026-08-02 — Replaced Home's scenic hero with the active-Workspace Locus
  Trail recovery desk.** Home now opens with real recovery context instead of
  decorative atmosphere: the newest saved item in the active Workspace connects
  through one theme-token locator line to its exact Workspace › Space › Group
  path and native Review/Open actions. The next saveable current-window tab and
  its exact active-Space Inbox destination sit in the same Trail. The featured
  item is omitted from the Inbox preview, recent Spaces follow last, and Home's
  competing top-bar and Inbox Save actions are removed. No new route, font,
  remote asset, permission, schema, migration, or durable Trail state was added.

  The Trail has one preference-driven primary action: **Save and close tab** or
  **Save and keep tab open** follows `closeTabOnSave`, while one adjacent quiet
  action states the inverse without changing the preference. Candidate selection
  excludes unsupported saved-page schemes and, when deduplication is enabled,
  URLs already present in the destination Inbox. Recovery retains the reviewed
  Workspace, Space, Group, parent, and item references plus value/location
  fingerprints. Save retains the reviewed Workspace, Space, and Inbox references
  plus the visible path names around the asynchronous tab read; same-ID replacement,
  rename, duplicate Inbox, or changed first-Inbox provisioning requires review
  again. Both capture and any requested close verify the same tab ID, window, URL,
  and nonconflicting pending URL. Tab refreshes cannot repaint Home from an
  optimistic capture graph. Storage acknowledgement remains the only owner
  of success, repaint, and source closing, so stale identity, changed navigation,
  rejection, or an unknown receipt produces no success Trail and leaves the
  source open.

  Native buttons, exact accessible names, keyboard-focus restoration, localized
  loading/empty/error/retry states, English/native zh-TW copy, responsive stacking,
  forced-colors treatment, and reduced-motion behavior preserve the existing
  Folio system. The single short locator-line motion runs only after an accepted
  save. Focused production-extracted and static contracts cover ordering, legacy
  timestamp fallback, active-Workspace isolation, exact recovery references,
  URL and duplicate filtering, stale-tab checks, preference consequences,
  receipt ordering, localization, focus, responsive layout, and motion gates.
  **Implemented: yes; Verified: partial (static and deterministic
  production-extracted evidence); User-validated: no; Released: no.** Installed
  MV3 storage/message/service-worker lifetime, real tab effects, rendered
  viewport/theme/locale pixels, screen-reader/zoom/forced-colors behavior,
  representative-user recovery, and release evidence remain open.
- **2026-08-02 — Reframed Search as the Find-again recovery surface.** The
  subject is a privacy-conscious solo desktop user recovering one older piece of
  browser context, so the page now has one job: find the exact save, confirm its
  destination, and reopen it safely. The decorative four-step process, dashboard
  stats/tips, gradient badge, and in-row Favorite quick mutation are removed.
  Favorite remains available through the item and Library flows. Existing theme
  tokens, body/utility type, and compact Folio geometry remain; the distinctive
  visual is the real Workspace → Space → localized Group recovery path rather
  than invented decoration. Optional filters default closed.

  The result/detail layout now carries long titles and the exact saved path,
  while narrow screens keep a bounded result scroller and stack the recovery
  actions so the selected item's consequence is not buried below up to 100 rows.
  One roving option enters the Tab order; ArrowUp/Down/Home/End stay on mounted
  rows and scroll the focused result into view. Type choices are a labeled pressed
  filter group; inline loading does not duplicate the signature-deduped live
  result announcement; statuses and empty actions do not masquerade as listbox
  options; filter/sort controls restore focus after rerender; related-result and
  selected/pressed states survive forced colors. Empty states do not inherit the
  populated list scroller, and long user tags wrap. The inner nested `main` is
  replaced by a labeled section.
  English singular/plural result copy and native zh-TW describe links, notes,
  tasks, and Stacks as content rather than only pages.

  Settled-query Enter, result Enter, click-click-double-click, and Open page use
  the same exact recovery controller. Composition leaves its input mounted; query
  changes synchronously inert old results/remove old actions, and stale debounce
  callbacks cannot launch or focus a closed-over prior result. Production
  traversal and fingerprint checks reject
  missing, duplicate, replaced, renamed, moved, reordered, URL-edited, or
  Workspace-switched saves; safe schemes use the shared opener. Other item kinds
  and unsafe legacy URLs use an exact Search-owned `detail=1` route. Close/Back
  retain the complete Search state and rebuilt result focus; detail opening also
  requires current visible-result membership, while removed/filtered items clear
  selection, sheet target, and URL together. A navigation interlock refusal clears
  prepared metadata and restores focus. All 34
  repository JavaScript syntax checks, all 25 scripts, the default 10,000-
  schedule concurrency gate, and `git diff --check` pass. Browser policy blocked
  the local file, so **Implemented: yes; Verified: partial (static and
  deterministic production-extracted evidence); User-validated: no; Released:
  no.** Installed effects, rendered pixels, screen-reader/zoom/forced-colors,
  representative-user recovery, and release evidence remain open.
- **2026-08-02 — Completed the fast Save → See destination handoff for background
  capture.** Context-menu and keyboard saves now use the operating system's native
  notification frame as a quiet two-line receipt rather than introducing another
  Locus panel: an outcome-first title, one restrained Workspace › Space › Group
  locator line, then the source-tab consequence and one click instruction. Page,
  link, note, image, duplicate, and whole-window outcomes use direct English and
  native Taiwan zh-TW copy; the existing badge stays a secondary glanceable mark.

  The signature remains the real organization path, not decorative chrome. Its
  accepted labels are whitespace-normalized, stripped of line/direction and path-
  delimiter spoofing, and grapheme-budgeted 24/24/40 so the Group gets the most
  recognition space without crowding out the action. Receipts never show page
  titles, URLs, favicons, selections, or note text. Privacy blur replaces all
  organization names with **Destination hidden / 已隱藏儲存位置**. A versioned
  stable-ID continuation fresh-resolves the saved item or Session Group at click
  time; unsafe or ambiguous targets fall back to local Home. Production-extracted
  English/zh-TW, privacy, hostile-label, failure, restart-codec, and exact-route
  contracts pass with the full 34-file/25-script deterministic block. **Implemented:
  yes; Verified: partial (static and production-extracted deterministic evidence);
  User-validated: no; Released: no.** Native notification layout, accumulation,
  screen-reader pronunciation, installed service-worker lifecycle/tab effects,
  representative-user usefulness, and release evidence remain open.
- **2026-08-02 — Made every reported Find-again result deliberately reachable.**
  Search keeps its calm first 100 rows, then places one restrained continuation
  footer outside the listbox. The footer names visible progress and reveals up to
  100 more; it is not a paginator, dashboard, or scroll-triggered feed. Expansion
  rebuilds the surface with the first newly revealed result selected, focused,
  and nearest-scrolled, giving keyboard users a clear handoff into new content.
  The action stacks to a 38 px full-width target on narrow screens. English and
  native Taiwan zh-TW retain the existing result terminology and compact utility
  register.

  A valid non-default 100-row window rides the Search hash as `shown`, preserving
  reload, navigation away and Back, Forward, and Search-owned Details without a
  schema field. Query/type/Space/time/tag/sort changes reset to 100. Hidden rows
  remain ineligible for Open or Details; deliberate reveal makes them eligible
  only through the existing exact identity, uniqueness, fingerprint, and URL-
  allowlist boundary. Stale continuation callbacks cannot steal focus from a new
  Search session. The progress announcement joins Search's one persistent live
  owner; forced colors retain the button boundary and focus ring. All 34
  repository JavaScript syntax checks, all 25 deterministic checks, the default
  10,000-schedule concurrency gate, and `git diff --check` pass. **Implemented:
  yes; Verified: partial (static and production-extracted deterministic evidence);
  User-validated: no; Released: no.** Installed rendering, native screen-reader
  output, real browser-tab effects, representative-user recovery, and release
  evidence remain open.
- **2026-08-02 — Made Reopen feel like returning, not duplicating.** The subject
  is a privacy-conscious solo desktop user returning to one piece of saved browser
  context, and the interaction's single job is to take that person back without
  adding tab-strip clutter. The design spends its signature on behavior instead
  of new chrome: normal Open quietly reuses the exact live page or Locus suspended
  placeholder, otherwise creates one page; the small arrow retains its explicit
  new-tab promise. No dashboard, modal, badge, animation, typography, color, or
  persistent preference was added.

  Landing, Library/Favorites, both Read Later paths, Home Trail, shared Board and
  Group layouts, Search, Details, Explorer, Graph, and drop-to-open now share one
  exact-item browser boundary. It rechecks the real Workspace › Space › Group ›
  Stack context, treats pending navigation as authoritative, prefers the loaded
  page, fresh-reads a candidate, requires exact active/focused receipts, and
  serializes rapid same-page intent. Same-document duplicates coalesce; when
  available, a same-origin Web Lock lets a second Locus document reuse an
  acknowledged first create. Confirmed success stays quiet. Distinct unsafe/
  stale/candidate/check/uncertain/focus messages use direct English and native
  Taiwan zh-TW; one shared failure returns the initiating focus, and Landing
  preserves its query until confirmation. Bulk opening and popup route reuse
  remain visually and behaviorally separate.

  The production-extracted contract first failed before each core behavior and
  now covers exact live/suspended/pending matching, deterministic preference,
  background/Hibernate and deliberate-copy-without-query behavior, identity/
  candidate races, changed active/focused receipts, query/update/focus/create
  failures, single-document coalescing, confirmed two-document create-to-reuse,
  one-message/focus ownership, and source convergence. All 35 repository JavaScript syntax checks,
  all 26 deterministic checks, the default 10,000-schedule concurrency gate, and
  `git diff --check` pass. **Implemented: yes; Verified: partial (static and
  production-extracted deterministic evidence); User-validated: no; Released:
  no.** Installed Chrome/Web Lock effects, cross-document visibility after an
  unknown receipt, final query/create races against external actors, native
  screen-reader behavior, representative-user usefulness, and release evidence
  remain open.
- **2026-08-02 — Turned Library into a recovery ledger, not another dashboard.**
  The subject is unfinished browser work saved by a privacy-conscious solo desktop
  user; the one job is to scan the exact destination, then choose Open page or View
  details. All Links, Favorites, and Read Later now share one calm ledger. Its
  visual signature is the real Workspace › Space › localized Group › optional
  Stack trail, kept readable beside title, URL, and saved/queued age. The two
  recovery actions are visible in every row, named per page for assistive
  technology, and secondary mutations stay compact. Read Later is one
  oldest-unread-first queue instead of repeating the same saves as Up-next cards
  and list rows.

  The row reflows early enough for common sidebar-and-rail desktop windows and
  gives actions their own line around the 800 px acceptance width; the destination
  wraps rather than disappearing. Keyboard-opened More menus anchor to their row,
  privacy blur includes the new title/URL/path, and colors use existing Folio theme
  tokens. English and native Taiwan zh-TW use direct factual copy. No new palette,
  typography, dashboard, summary-card layer, animation, schema, permission, or
  persistent preference was introduced.

  Query, Read Later status, sort, and selected Details item ride the URL without a
  durable write. Open and Details re-resolve the exact globally unique item,
  location, value, route meaning, and visible-result membership; stale or filtered
  controls do nothing. Closing Details restores the rebuilt row's Open page action,
  and list mutations retain a useful same-row or neighboring focus target. The
  focused tests were observed red before these contracts were implemented. All 36
  repository JavaScript syntax checks, all 27 deterministic commands, the default
  10,000-schedule concurrency gate, and `git diff --check` pass. **Implemented:
  yes; Verified: partial (static and production-extracted deterministic evidence);
  User-validated: no; Released: no.** Installed pixels and browser history/storage,
  native screen-reader behavior, actual theme/locale/viewport presentation,
  representative-user recovery within 30 seconds, and release evidence remain open.
- **2026-08-02 — Put the recovery receipt before the disappearing source.** The
  subject is a privacy-conscious solo desktop user saving browser context through
  a fast browser-owned command, and the interaction's one job is to leave a clear
  way back before Locus removes anything. The existing quiet native notification
  remains the entire surface. No panel, modal, progress ornament, motion, palette,
  type treatment, or second success message was added; the recognizable real
  Workspace › Space › Group path remains the visual signature.

  After the accepted write, Locus first creates one stable actionable receipt with
  conservative **check source tab** language. Only browser-confirmed creation
  permits the exact guarded item/window cleanup. Closed, stayed-open, unconfirmed,
  and partial results update that same notification instead of adding another.
  Creation failure keeps all sources open; update failure or worker interruption
  leaves the truthful clickable first state. Callback-only, Promise, and hybrid
  notification create/update/clear completion share one settle-once boundary, so
  old and current Chrome behavior cannot silently finish early. Existing English
  and native Taiwan zh-TW copy, privacy blur, hostile-label sanitization, badge,
  exact route resolution, and local fallback are unchanged.

  The public context-menu test first failed with a source read before callback-only
  receipt confirmation; the click test then failed on early callback-only clear.
  All 36 repository JavaScript syntax checks, all 27 deterministic commands, the
  default 10,000-schedule concurrency gate, and `git diff --check` pass.
  **Implemented: yes; Verified: partial (static and production-extracted
  deterministic evidence); User-validated: no; Released: no.** Installed native
  notification pixels/accessibility, real tab effects, service-worker teardown,
  representative-user usefulness, and release evidence remain open.
- **2026-08-02 — Made Group and selection Reopen truthful instead of prolific.**
  The subject is a privacy-conscious solo desktop user returning to a saved set;
  the one job is to recover that set without duplicate tab clutter or false
  success. The design signature remains behavioral: the existing Group/selection
  action gains a small progress mark and one compact result. Confirmed outcomes do
  not add a panel, modal, dashboard, palette, animation system, or stored
  preference. Required recovery becomes one quiet inline status beside the action,
  where it persists until dismissed instead of expiring in a toast.

  Board, focused-Group, List, context-menu, and selection actions now capture exact
  saved-item authority before any effect and settle one background Reopen at a
  time. Exact live or Locus-suspended destinations are reused; only missing
  destinations create an inactive live tab or Hibernate placeholder. The exact
  rendered Group must remain uniquely owned, nested Stacks are recursive, and two
  distinct same-URL saves serialize without sharing identity receipts. One failed
  profile read or first unknown effect stops later work. Copy distinguishes new
  tabs, already-open, not-opened, check-failed, unconfirmed, and not-checked counts
  in direct English and native Taiwan zh-TW.

  The initiating control stays focusable with visible reduced-motion-safe busy
  treatment, `aria-busy`, and `aria-disabled`; competing actions explain the active
  operation and return to its anchor. A selection with no saved tabs disables Open
  and names the reason. Danger feedback uses a warning mark. Independent review
  drove red contracts for duplicate Group IDs, distinct same-URL saved items,
  repeated failed reads, silent competing activation, focus-stranding disablement,
  and expiring required recovery. All 36 repository JavaScript syntax checks and
  all 27 deterministic commands pass, including the default 10,000-schedule
  concurrency gate; `git diff --check` is clean. **Implemented: yes; Verified:
  partial (static and production-
  extracted deterministic evidence); User-validated: no; Released: no.** Installed
  tab/window/Web Lock effects, pixels, native accessibility, representative-user
  usefulness, and release remain open.
- **2026-08-02 — Made reminder state wait for the browser's receipt.** The subject
  is a privacy-conscious solo desktop user relying on Locus to bring saved work
  back at the promised time. The interaction's one job is to deliver the existing
  native reminder without silently consuming it first. The strongest UI choice is
  restraint: no new panel, modal, toast, progress ornament, palette, type treatment,
  animation, or setting was added. Reliability is the convenience improvement.

  Item and Group/Space alarm delivery now use the existing settle-once native
  notification boundary. While callback-only Chrome is pending, reminder authority,
  the central state writer, and alarm reconciliation do not move. Failure preserves
  the exact stored reminder. Confirmed creation permits one notification, one
  revisioned write, and then complete reconciliation; a one-shot becomes notified
  and a recurring Group reminder advances by stable ID. Existing schema, migration,
  locale, privacy, permission, and visual behavior remain unchanged.

  The public callback-only tracer was observed red with revision 3 and
  `notified: true` after injected native-create failure. Production-extracted item
  pending/error/success and recurring Group success now pass, including zero pre-
  callback writes and `storage-set` before `alarms-get-all`. **Implemented: yes;
  Verified: partial (production-extracted deterministic API evidence); User-
  validated: no; Released: no.** Callback-only Space is covered compositionally by
  the shared entity branch rather than a separate dynamic trace. API acknowledgement
  is not proof of operating-system display. Installed notification behavior,
  service-worker teardown/restart/sleep, rejection recovery policy, native
  accessibility, representative-user usefulness, and release remain open.

  All 36 repository JavaScript syntax checks and all 27 deterministic commands
  pass, including the default 10,000-schedule concurrency gate; `git diff --check`
  is clean.
- **2026-08-03 — Let recovery arrive before cleanup.** The subject is a
  privacy-conscious solo desktop user who selected **Open saved item in Locus** to
  avoid manually finding the just-saved page. The interaction's job is not to look
  busier; it is to make the existing compact continuation safe. No new panel,
  banner, modal, toast, animation, color, type treatment, copy, or setting was
  added.

  Locate identity no longer rides the state-write request. Only a valid accepted
  state receipt dispatches a separate worker completion; rejected or
  acknowledgement-unknown state launches no route or close. The completion enters
  the shared state queue, resolves the current exact item, creates its encoded Home route inactive, and validates
  the original source. It activates and focuses the recovery route before any
  close, fresh-confirms that exact active route, revalidates the source as the same
  inactive tab at the same URL with no conflicting pending navigation, then checks
  the committed current route once more immediately before removal. A route that
  is still only pending keeps the source open. Activation/focus failure,
  returned-ID/window/active/current/pending mismatch, route replacement, or route-
  read failure preserves the source. An unsafe route is never offered as the
  popup's exact-tab retry; the accepted save and existing partial-result language
  remain truthful. Once completion is dispatched, a lost, timed-out, or malformed
  receipt claims neither route nor close outcome and triggers no retry or rollback.
  Delayed popup and notice retries fresh-check exact tab/window/active/current/
  pending route identity before activation and again after focus, creating a fresh
  exact local route after tab reuse, change, or focus loss. Legacy notices lacking
  exact route authority use generic Locus without reusing a tab ID.

  Red production-extracted tracers first observed close-before-activation, stale-
  URL removal, ambiguous active-state removal, close after route replacement, a
  changed tab trusted after activation error, and a missing post-write queue
  handoff. A later red boundary exposed accepted-but-unknown state still running the
  same request's browser effects, and the max review found delayed retries trusting
  a retained tab ID. The expanded popup matrix now passes those cases plus empty
  pending URL, separate state/effect dispatch, unknown effects, fresh retry identity,
  close-off, activation/focus/remove failure, and the exact success order. All 36
  repository JavaScript syntax checks and all 27
  deterministic commands pass, including the default 10,000-schedule concurrency
  gate; `git diff --check` is clean. **Implemented: yes; Verified: partial
  (production-extracted deterministic and mocked-browser evidence); User-
  validated: no; Released: no.** Installed popup/message/service-worker lifetime,
  real tab effects, rendered/accessibility behavior, representative-user
  usefulness, and release remain open.
- **2026-08-03 — Let success wait for the page.** The subject is a privacy-
  conscious solo desktop user reopening unfinished work so they can stop manually
  checking whether the right page appeared. The interaction's single job is the
  final Reopen-safely handoff. The design choice is deliberate restraint: no new
  panel, toast, badge, animation, color, type treatment, copy, or setting. Quiet
  success itself is now the trust signal, so it is reserved for an exact result.

  A created tab is fulfilled only after a fresh read confirms the returned integer
  tab/window identity, requested foreground/background state, and exact live or
  Hibernate destination. Foreground reuse now activates, validates, focuses, then
  fresh-reads the same exact active live/suspended tab once more. Exact pending
  navigation remains valid browser intent. Wrong destination, conflicting pending
  navigation, changed identity, wrong active state/representation, or unreadable
  final receipt uses the existing unconfirmed recovery; uncertain effects are not
  retried and continue to stop queued and bulk successors. Schema 12, local data,
  stable IDs, migrations, import/export, English and native Taiwan zh-TW copy,
  permissions, host permissions, privacy, and visual hierarchy are unchanged.

  The unchanged focused suite first passed. A red create tracer then returned
  `created-live` for an inactive tab at `https://wrong.example/`; a red reuse
  tracer returned `reused-live` after the destination changed during window focus.
  The expanded production-extracted matrix now passes exact committed/pending
  success, wrong URL/window/active/representation, conflicting pending navigation,
  final-read rejection, Hibernate mismatch, exact-but-inactive final reuse, and a
  bulk post-create mismatch that leaves later entries not checked. All 36
  repository JavaScript syntax checks and all 27 deterministic commands pass,
  including the default 10,000-schedule concurrency gate; `git diff --check` and
  the untracked-file trailing-whitespace scan are clean. **Implemented: yes;
  Verified: partial (static and production-extracted mocked-browser evidence);
  User-validated: no; Released: no.** Installed tab/window/Web Lock timing,
  rendered/accessibility behavior, representative-user usefulness, and release
  remain open.
- **2026-08-03 — Keep the way back until the destination exists.** The subject is
  a privacy-conscious solo desktop user who clicked a capture receipt because they
  want the just-saved page without manually navigating Locus. The UI decision is
  restraint: no new panel, toast, badge, animation, color, type treatment, copy, or
  setting. The existing native receipt is already the recovery affordance, so Locus
  now keeps it until the exact local destination is actually confirmed active.

  The shared notification fallback creates one expected route, requires a non-
  negative returned tab ID, and fresh-reads that exact tab. Only the same active tab
  with a non-negative window identity and exact committed or pending URL may clear
  the receipt. Wrong, inactive, unreadable, negative, malformed, whitespace-pending,
  or conflicting-pending results perform no retry and retain the action. Popup
  Locate keeps its stricter exact-route reuse before using this safe fallback.

  Red production-extracted cases first observed clearing after a rejected final
  read and after a negative created identity. The final background matrix passes
  nine continuation guards, the popup Locate contract remains green, and all 36
  JavaScript syntax checks plus all 27 deterministic commands pass, including the
  10,000-schedule concurrency gate. **Implemented: yes; Verified: partial
  (production-extracted deterministic mocked-browser evidence); User-validated:
  no; Released: no.** Installed notification-center behavior, real tab presentation,
  service-worker lifetime, accessibility, representative-user usefulness, and
  release remain open.
- **2026-08-04 — A saved copy must not close the page the user just returned to.**
  Drag-to-save remains visually unchanged and copy-first. The rail now carries an
  immutable source descriptor with the exact tab, window, URL, and original active
  state. Since the rail itself is an asynchronous cache, a cleanup-enabled drag
  commit fresh-reads every exact source before persistence and uses that active
  state as the cleanup baseline. A separate post-receipt read still authorizes
  each removal.

  Missing or malformed identity, window movement, navigation, a conflicting
  pending URL, or an active source observed by the fresh read leaves that source
  open while preserving the acknowledged saved item. Multi-tab cleanup is per
  source, so an unchanged sibling can close without making the changed sibling
  destructive. If the graph changes while the pre-read is pending, all sources
  stay open on both write success and failure; a failed write cannot automatically
  recover over the later edit. Red/green production-extracted cases reproduce
  stale cached activity, partial window movement, and both preparation-time graph
  outcomes. **Implemented: yes; Verified: partial (static and
  production-extracted deterministic mocked-browser evidence); User-validated:
  no; Released: no.** Installed native drag, actual tab effects and event ordering,
  rendered feedback, representative-user usefulness, and release remain open.
- **2026-08-03 — Never save a page Locus cannot give back.** The subject is a
  privacy-conscious solo desktop user who wants Save to remove future searching,
  not create a dead record or close an irreplaceable local page. The UI keeps the
  full opened-tabs list useful for switching and explicit Close. Recoverability is
  expressed structurally: unsupported rows lose Save, drag, grab cursor, and native
  child dragging without gaining a warning badge, color, modal, tooltip, or new
  copy.

  Welcome, Home Trail, direct/selected Inbox and Group actions, Save all, palette,
  and every Space/Group/Stack browser-tab drop now apply the shared Reopen
  allowlist before history or graph mutation. Mixed selections save only
  `http:`, `https:`, `ftp:`, and `file:` pages, retain unsupported rows, and return
  focus to a visible retained checkbox or the rail filter/toggle. A delayed tab
  refresh restores that exact checkbox. Unsafe child drags stop before batch
  promotion or `dataTransfer`, and Stack hover cannot mutate durable expansion
  state before an eligible snapshotted drop.

  Red production-extracted tracers reproduced unsafe graph/close candidates,
  overbroad selection clearing, filtered and refresh-race focus loss, child-drag
  URL disclosure, and pre-snapshot Stack expansion. The focused capture/Reopen
  contracts and complete 36-file syntax / 27-command deterministic gate pass with
  clean `git diff --check`. **Implemented: yes; Verified: partial (static and
  production-extracted deterministic mocked-browser evidence); User-validated:
  no; Released: no.** Installed native drag, real tab effects, rendered and
  assistive-technology behavior, representative-user usefulness, and release
  remain open.
- **2026-08-03 — Keep the source when a newer edit removes the way back.** The
  subject is a privacy-conscious solo desktop user who expects a fast background
  Save to remove future searching, not close the last source after they reorganize
  Locus. The design remains behavioral restraint: no new panel, modal, toast,
  badge, motion, color, type, copy, or setting. The existing conservative native
  receipt stays the only visible recovery surface.

  After receipt creation settles, background cleanup now joins the sole state
  FIFO/Web Lock, fresh-reads the exact accepted Workspace / Space / Group / direct
  saved item, and keeps that transaction through the browser effect. A Session
  carries a transient item identity per source, allowing exact surviving items to
  close while moved or removed siblings stay open and use the existing partial
  receipt. Harmless newer edits still proceed; missing, moved, duplicated, nested,
  retyped, URL-changed, older, malformed, or unreadable authority stops before the
  affected source is inspected. No accepted or newer graph is retried, repaired,
  or rolled back, and post-acceptance uncertainty cannot become a false not-saved
  warning.

  A public red tracer paused callback-only receipt creation, displaced the accepted
  item through a real newer state write, and observed stale tab `99` removal. A
  whole-window replay observed the same gap for tab `2`. The focused production-
  extracted suite now passes six post-receipt authority guards, including a queued
  writer held until source removal completes, plus the existing callback/Promise/
  hybrid, close, continuation, privacy, and locale matrix.
  Max-effort substitute review found no P0. Red single/window cases then hardened
  malformed pending navigation and unconfirmed inactive state; its remaining
  generic-receipt P1 stays in the next bounded slice.
  All 36 repository JavaScript syntax checks and all 27 deterministic commands
  pass, including the default 10,000-schedule concurrency gate; `git diff --check`
  and the untracked current-slice whitespace scan are clean. **Implemented: yes;
  Verified: partial (static and production-extracted deterministic mocked-browser
  evidence); User-validated: no; Released: no.** Installed storage/notification/
  tab/Web-Lock timing, service-worker teardown, native receipt accessibility, representative-user usefulness,
  and release remain open.

- **2026-08-04 — Keep the source when the way back is only generic.** The subject
  is a solo desktop user who wants Save to remove searching and tab clutter, but
  not at the cost of losing the exact page they just saved. Imported or legacy
  Unicode IDs can be valid stored identities while their encoded notification
  locator is too large for Chrome. In that case Locus already has the right visual
  fallback: one quiet generic Home receipt. The safer design is behavioral
  restraint, not another modal, toast, badge, setting, or recovery screen.

  Page and whole-window completion now require `receipt.actionable === true`
  before any cleanup-authority read or browser source effect. The generic receipt
  still confirms the accepted persistence and opens local Locus Home, but it keeps
  every source open, retains its conservative unconfirmed text, and receives no
  misleading final close update. Exact receipts retain the existing guarded close
  and stable in-place outcome update. No ID shortening, hash, migration, copy,
  locale, schema, permission, host access, network path, telemetry, or privacy
  behavior was introduced.

  Separate real-listener red tracers observed the generic page receipt change to
  "Page saved" after source removal and the generic window receipt claim "Closed 2
  other tabs" after two removals. The focused production-extracted suite now
  passes eight capture-authority guards with zero cleanup traversal/effect on both
  fallback paths. Independent max-effort review found no actionable P0/P1.
  All 36 repository JavaScript syntax checks and all 27 deterministic commands
  pass, including the default 10,000-schedule concurrency gate; `git diff --check`
  and the untracked current-slice whitespace scan are clean.
  **Implemented: yes; Verified: partial (production-extracted deterministic
  mocked-browser evidence); User-validated: no; Released: no.** Installed Chrome
  notification limits, real tab effects, service-worker lifetime, native receipt
  rendering/accessibility, representative-user usefulness, and release remain
  open.

- **2026-08-09 — A saved page stays saved when its destination label fails.** The
  subject is a solo desktop user who trusts Save as a promise and should never be
  prompted to retry an already accepted capture. The useful mental model is “the
  page was put away; the label could not be printed.” The existing popup result
  card already expresses that conservative state, so this change adds no panel,
  modal, toast, badge, animation, copy, setting, or navigation.

  After the sole writer accepts a revision, quick-capture destination projection
  is total. Malformed collection shapes or owner fields return the strict existing
  unavailable continuation while preserving top-level acceptance, the stored
  graph, and the open source. Exact success still requires one original Workspace,
  one owning Space, one global saved-item identity, the expected URL, and primitive
  destination fields. Large valid Stacks use iterative traversal instead of
  variadic arguments. No repair, retry, migration, browser effect, permission,
  host access, network path, telemetry, locale, schema, or ID behavior changed.

  Registered production-listener cases cover four malformed collection levels, a
  malformed Space ID, and a valid 200,000-entry Stack with exactly one write and
  zero browser effects. All 36 JavaScript syntax checks and all 27 deterministic
  commands passed during the slice, including the 10,000-schedule concurrency
  gate. **Implemented: yes; Verified: partial (static and production-extracted
  deterministic mocked-browser evidence); User-validated: no; Released: no.**
  Installed storage/message/service-worker timing, rendered and assistive-
  technology behavior, representative-user usefulness, approval, and release
  remain open.

- **2026-08-09 — Keep the launch surface about getting back to saved work.** The
  subject is a privacy-conscious solo desktop user who opens Locus to save browser
  context and recover it later. The established-user landing layer now presents
  Search, Home, and Inbox without promoting generic Tools or Reminders into the
  same visual and keyboard tier.

  Native `hidden` semantics keep those two shortcuts out of rendering, assistive
  technology, and sequential focus. Their existing handlers, Calendar and Tools
  routes, data, and More-menu entries remain intact, so the change is reversible
  and does not strand advanced users. One focused public contract failed first and
  now proves both demotion and continued More-menu reachability. **Implemented:
  yes. Verified: partial (static production markup plus focused deterministic
  contract). User-validated: no. Released: no.** Installed rendering,
  screen-reader output, representative-user comprehension, and Store review remain
  open.

- **2026-08-09 — Make Home's first card earn the return visit.** The owner chose
  **Resume saved work** as Locus's primary reason to return and delegated dependent
  choices to the recommended focused direction. The subject is a privacy-conscious
  solo desktop user returning to unfinished browser context; Home's single leading
  job is to identify one saved page, show its real destination, and offer guarded
  Reopen.

  The existing destination Trail remains the visual signature. It now promotes the
  newest non-empty-ID saved tab accepted by the shared URL allowlist ahead of newer
  notes, to-dos, Stacks, or unsupported pages, while preserving time/legacy order
  within each tier. If no page qualifies, the original newest-item card remains so
  mixed local context never disappears. The rest of Home stays Trail -> Inbox ->
  Spaces; no new card, palette, typeface, animation, route, schema, permission,
  host access, network path, or stored preference was added.

  A design critique caught that **Latest saved item** became false when an older
  page was promoted. The final transactional heading is **Continue saved work /
  繼續查看已儲存內容**, using the project's existing Taiwan terminology and the
  same i18n key. Two red cases reproduced both mismatches before the focused Home
  contract passed. **Implemented: yes. Verified: partial (static and production-
  extracted deterministic evidence only). User-validated: no. Released: no.**
  Installed pixels and browser activation, screen-reader output,
  representative-user comprehension, and release remain open.

- **2026-08-09 — Let the destination Trail end in one obvious action.** Once Home
  identifies the saved page worth resuming, the first decision is no longer
  inspection versus return. **Open page** is now the first native control and the
  only accent action; **View details** follows quietly. When the lossless fallback
  is a note, to-do, Stack, unsupported page, or malformed-ID record, Details becomes
  its one primary continuation.

  This is a structural visual change, not a new style system. It reuses the existing
  accent, typography, spacing, destination line, focus ring, forced-colors rules,
  reduced-motion behavior, and narrow vertical stack. One production action plan
  owns both DOM and visual order, while keyboard-origin Save success now continues
  at Open. Exact Open and Details activation boundaries, routes, state, schemas,
  IDs, permissions, host/network behavior, and copy remain unchanged.

  The red public component check showed Details built first with both controls
  secondary. The focused production-extracted contract now covers openable,
  fallback, and malformed action plans, component wiring, and post-Save focus.
  **Implemented: yes. Verified: partial (static and production-extracted
  deterministic evidence only). User-validated: no. Released: no.** Installed
  pixels and browser activation, screen-reader output, representative-user
  comprehension, and release remain open.

- **2026-08-09 — Let one accent follow the user's stage.** The established Home
  Trail previously presented recovery and the recommended Save as competing accent
  actions. Recovery now owns the single accent whenever saved work exists; on an
  empty Home, the preference-driven Save owns it. Both close/keep-open Save choices
  remain visible and preserve their exact consequences whenever capture is available.

  The change reuses existing button tokens and Trail geometry. One production-
  extracted capture plan assigns classes from the visible recovery state; it adds
  no CSS, copy, icon, animation, surface, route, preference, or stored data. The
  focused contract failed before the plan existed and now passes both established
  and empty Home states plus renderer wiring. **Implemented: yes. Verified:
  partial (static and production-extracted deterministic evidence only). User-
  validated: no. Released: no.** Installed pixels, browser capture, assistive-
  technology output, representative-user comprehension, and release remain open.

- **2026-08-09 — Make the launch field belong to Locus.** The largest control on
  the established-user launch layer previously duplicated the browser omnibox:
  typing showed local saved-page suggestions, but unselected Enter replaced Locus
  with a web search. It now hands the exact query to the existing **Find again**
  surface, where destination, Details, and guarded Reopen stay visible.

  The scene, type, field geometry, motion, and suggestion list are unchanged. The
  design change is semantic and structural: concise English/native zh-TW copy names
  saved-content search, the no-match state points to all local saved content, and
  the unused browser `search` permission is gone. The focused production-extracted
  case failed on the old web handoff and now passes route, reset, focus, zero-web-
  call, locale, and permission boundaries. **Implemented: yes. Verified: partial
  (static and production-extracted deterministic evidence only). User-validated:
  no. Released: no.** Installed history, pixels, assistive-technology output,
  representative-user comprehension, Store display, and release remain open.

- **2026-08-09 — Let the saved destination identify each launch result.** The
  six-row Landing picker no longer reduces nested saves to `Space / Group`.
  Every row now carries the real `Workspace › Space › localized Group › Stack…`
  trail enforced by its recovery context, so repeated titles and URLs can be
  distinguished before Open.

  This spends no additional visual accent. The complete escaped trail occupies the
  existing quiet utility column, rises from 10 px to 11 px, and ellipsizes within a
  bounded width while retaining its full native hover title and assistive text.
  The scene, Lora greeting, palette, three-column geometry, matching, ranking,
  keyboard state, and exact Reopen behavior remain unchanged. **Implemented: yes.
  Verified: partial (static and production-extracted projection evidence only).
  User-validated: no. Released: no.** Installed pixels, overflow, screen-reader,
  theme/viewport, representative-user, and release evidence remain open.

- **2026-08-09 — Make the Landing Inbox shortcut tell the truth.** The direct
  return shortcut now uses the product's canonical **Inbox / 收件匣** name. An
  empty existing Inbox remains one click away without advertising a meaningless
  zero; a count appears only when the destination exists and has content.

  The segmented chip, icon, theme tokens, geometry, and motion are unchanged. Its
  visible state now freezes one active Workspace, Space, and Inbox identity and
  re-resolves that exact context before non-persisted navigation. Landing closes
  only after the route is accepted. Missing, duplicate, replaced, moved, or ambiguous targets
  keep the calm layer and focus available, open nothing, and never provision data
  as a side effect of navigation.

  The focused production-extracted case failed before the controller existed and
  now passes exact route-before-close, stale and ambiguous refusal, canonical
  locale presentation, nonzero-only count wiring, and the no-write boundary.
  **Implemented: yes. Verified: partial (static and production-extracted
  deterministic evidence only). User-validated: no. Released: no.** Installed
  routing, pixels, assistive-technology behavior, representative-user
  comprehension, and release remain open.

- **2026-08-09 — Make every primary Inbox door mean the same thing.** Landing,
  the sidebar, and the command palette now treat Inbox as one exact existing
  destination. The sidebar captures current active-Space truth at click time; the
  palette retains the destination represented when its command list was painted.
  Its quiet count appears only when that same destination is actionable and
  nonempty.

  This changes authority rather than decoration. The existing row, command, icons,
  typography, themes, and geometry remain intact. Exact navigation performs one
  non-persisted route and never creates storage. Missing, duplicate, replaced,
  moved, or globally ambiguous destinations leave the current surface and local
  graph untouched with one native English/zh-TW explanation. Capture remains the
  place where a reviewed missing Inbox may be provisioned.

  The focused production-extracted case failed on the legacy first-match path and
  now passes exact route authority, zero writes/creates, stale and ambiguous
  refusal, context timing, count authority, and locale feedback. **Implemented:
  yes. Verified: partial (static and production-extracted deterministic evidence
  only). User-validated: no. Released: no.** Installed routing, pixels,
  assistive-technology behavior, representative-user comprehension, and release
  remain open.

- **2026-08-09 — Let palette saved pages complete the return loop.** Recent and
  query-matched saved-page rows now act like launchers instead of hidden Space
  switches. Their quiet second line explicitly says **Open / 開啟**, names the
  host, and carries the complete Workspace-to-Stack destination, so the user sees
  both consequence and local location before pressing Enter.

  The visual system is unchanged: the existing compact row, link icon, Saved-link
  badge, ellipsis, theme tokens, selection rail, keyboard model, and motion remain.
  The structural change is exact activation. A frozen visible context must survive
  active-Workspace, global identity, ancestry, fingerprint, and URL checks before
  the shared foreground Reopen coordinator runs. No Space selection or Details
  route is persisted merely to locate the page.

  Immediate stale or ambiguous refusal keeps the palette and query, refreshes its
  local commands, and restores input focus; accepted activation closes normally.
  The focused production-extracted and shared Reopen cases pass this boundary.
  **Implemented: yes. Verified: partial (static and production-extracted
  deterministic evidence only). User-validated: no. Released: no.** Installed
  browser effects, pixels, assistive-technology behavior, representative-user
  comprehension, and release remain open.

- **2026-08-09 — Put personal destinations before the escape hatch.** The left
  rail now reads **Home, Inbox, All Links, Spaces, More** in one visual, DOM, and
  keyboard sequence. A user scanning where saved work lives reaches their own
  Spaces before secondary tools; More remains anchored after the flexible list.

  This corrects hierarchy without adding chrome. Existing icons, row geometry,
  theme tokens, collapse behavior, nonzero counts, and menu presentation remain.
  Search, Favorites, Read Later, Archive, Trash, Calendar, Tools, and Settings stay
  available from More. Sidebar-only storage/privacy projections were removed;
  their useful facts and live meter remain in Settings.

  The focused contract failed on the former CSS-only order, which left keyboard
  users reaching All Links before Inbox and kept Spaces outside the landmark. It
  now passes exact order, one navigation landmark, secondary reachability, and
  Settings preservation. **Implemented: yes. Verified: partial (static and
  deterministic contract evidence only). User-validated: no. Released: no.**
  Installed pixels, keyboard traversal, menu placement, screen-reader output,
  representative-user comprehension, and release remain open.

- **2026-08-09 — Let the header answer where before what.** The global row now
  carries one quiet current-context title at left, the established local Search
  affordance in the center, and Save plus More at right. Home, Libraries,
  Calendar, Groups, and Spaces share the same orientation cue; the built-in Inbox
  uses its localized product name while user names remain literal and bounded.

  The Space layout selector moved, unchanged, into a board-only subtoolbar. This
  makes its scope visible without inventing another route or action. Its stable
  ID, icon, menu, persistence, themes, and keyboard binding remain, as do deeper
  breadcrumbs and each surface's own controls.

  The production-extracted projector and renderer now pass every named surface,
  fallback, full-title trail, and no-write boundary; static checks prove the
  existing layout control is unique and board-owned. **Implemented: yes. Verified:
  partial (static and production-extracted deterministic evidence only). User-
  validated: no. Released: no.** Installed pixels, responsive geometry, menu
  placement, assistive-technology output, representative-user comprehension, and
  release remain open.

- **2026-08-09 — Make top-bar Save leave a useful receipt.** An accepted Save now
  says what was stored and names its complete Workspace › Space › Inbox location,
  instead of ending at a generic “Saved to Inbox.” One quiet **Show saved item /
  查看已儲存項目** action sits beside the existing Undo; the current surface does
  not move unless the user chooses it.

  The destination trail is the visual signature. The existing toast stays local,
  theme-native, and motion-neutral, but gains bounded width and responsive wrapping
  so real titles and user-authored locations remain readable. No modal, receipt
  center, new palette, decorative success art, or forced navigation was added.

  Show rechecks the frozen accepted item and location before opening the exact
  Group detail without persistence. A moved, changed, missing, ambiguous, or
  blocked target opens nothing and explains the result in native English/zh-TW;
  it never retries the accepted Save. The focused production-extracted and static
  contract, touched syntax, quality gate, and whitespace checks pass.
  **Implemented: yes. Verified: partial (static and production-extracted
  deterministic evidence only). User-validated: no. Released: no.** Installed
  timing, real tab closure, pixels, keyboard and screen-reader output,
  representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Show where top-bar Save will put the page.** The Save menu now
  reads as one compact review: full candidate title, recognizable host, **Save to /
  將儲存至**, then the complete Workspace › Space › Inbox trail above the existing
  copy and close choices. Users no longer have to accept a consequence before
  learning the destination.

  Structure carries the design. The title and host stay quiet and bounded; the
  real destination is the only strong line and wraps instead of being shortened.
  Existing glass surface, colors, type family, icons, action order, focus loop, and
  motion remain. No dialog, extra action, decorative success state, or new palette
  was added. Each nonvisual action name carries the same page, destination, and
  consequence rather than depending on the review block being announced first.

  Activation fresh-checks both the browser tab and exact destination before the
  existing acknowledged Save path. Changed or ambiguous truth saves nothing and
  asks for another review; it does not fall through or retry. The focused
  production-extracted and static contract, touched syntax, quality gate, and
  whitespace checks pass. **Implemented: yes. Verified: partial (static and
  production-extracted deterministic evidence only). User-validated: no.
  Released: no.** Installed menu geometry, real browser/storage effects,
  keyboard and screen-reader output, representative-user comprehension, approval,
  and release remain open.

- **2026-08-09 — Make the largest Search control mean Find again.** The centered
  header pill now enters the dedicated saved-work Search route instead of opening
  a mixed command menu. Its label, accessible name, `/` badge, click, and route
  describe one local recovery action; `Ctrl/⌘K` remains the power-user command
  layer.

  No new surface or ornament was needed. The existing pill, theme tokens, Landing
  wording, Search route, and focus behavior remain. Once Search is open, the pill
  is visually hidden so the routed query field is the sole search owner without
  shifting the header layout. Route entry and exit do not persist state.

  The focused contract passes the active-Workspace route, focus handoff, no-write
  return, canonical English/native zh-TW copy, truthful shortcuts, retained command
  palette, and single-search-owner rule. **Implemented: yes. Verified: partial
  (static and production-extracted deterministic evidence only). User-validated:
  no. Released: no.** Installed pixels, real focus/history, keyboard and screen-
  reader output, representative-user comprehension, approval, and release remain
  open.

- **2026-08-09 — Keep the draft in place until it is saved.** Board To-do wording
  stays directly editable on the card. Blur or Enter now holds the user's literal
  draft in the same one-line editor until local persistence accepts it; a quiet
  accent underline pulse is the only pending cue. There is no detail detour,
  confirmation, success toast, modal, or extra label.

  Focus freezes the exact task before typing. Normal text and the established
  `/done` and color shortcuts share one receipt boundary, and repeating an already-
  applied shortcut restores the real task display without writing. Competing
  actions and navigation wait behind the exact editor path. Acceptance rebuilds
  the card and restores stable-item focus; stale truth leaves the draft available
  and refocuses it, while an unknown acknowledgement stays behind existing
  recovery without a retry.

  The focused production-extracted/static contract passes literal whitespace,
  shortcut compatibility, no-write display restoration, exact identity, pending
  duplicate, stale/recovery refusal, accepted render/focus, unknown receipt, zero
  retry, and busy/interlock wiring. **Implemented: yes. Verified: partial (static
  and production-extracted deterministic evidence only). User-validated: no.
  Released: no.** Installed blur/storage timing, rendered pixels, IME, real
  keyboard/focus and screen-reader behavior, representative-user comprehension,
  approval, and release remain open.

- **2026-08-09 — Let the checkmark mean saved.** Board To-do completion remains a
  one-click native checkbox, but the mark no longer appears before local storage
  accepts it. During the brief wait, the existing box keeps its previous truthful
  state and carries one quiet accent pulse; acceptance swaps in the rebuilt checked
  or unchecked control and restores focus there.

  The interface spends its motion on this one meaningful moment. Existing card
  geometry, type, colors, accessible next-action name, context-menu entry, and
  reduced-motion rules remain. Sibling interaction and navigation wait behind the
  exact checkbox path, so the user cannot accidentally race another edit. There is
  no confirmation, modal, toast, label, or decorative success state.

  The focused production-extracted/static contract passes both directions, exact
  identity, pending duplicate, stale/changed/retyped/recovery refusal, acceptance,
  unknown receipt, rebuilt focus, and busy/interlock behavior. **Implemented: yes.
  Verified: partial (static and production-extracted deterministic evidence only).
  User-validated: no. Released: no.** Installed pending pixels, storage timing,
  keyboard/focus and screen-reader behavior, representative-user comprehension,
  approval, and release remain open.

- **2026-08-09 — Let color become the save receipt.** The compact Board Note/To-do
  palette stays exactly where users expect it; choosing a swatch now holds that
  palette in place until local persistence answers. The chosen card color appears
  as the completion signal only after acceptance, instead of optimistically
  implying a durable edit.

  This is a deliberate small pause in exchange for trust. The existing six circles,
  accent ring, check, typography, themes, keyboard model, and null state remain;
  pending state only dims the swatches and uses a progress cursor. Lower surfaces
  and navigation wait, so another action cannot race the reviewed color. No modal,
  toast, animation, copy, or new palette was added.

  The focused production-extracted/static contract passes exact identity,
  acceptance, duplicate pending, no-op, clear, stale/invalid, recovery, unknown-
  receipt, busy, and interlock behavior. **Implemented: yes. Verified: partial
  (static and production-extracted deterministic evidence only). User-validated:
  no. Released: no.** Installed busy-state pixels, storage timing, keyboard/focus
  and screen-reader behavior, representative-user comprehension, approval, and
  release remain open.

- **2026-08-09 — Let Note edits read like ink drying.** Board Notes remain direct,
  multiline rich-text cards with the same formatting toolbar, Link dialog, slash
  commands, typography, note paper colors, spacing, and Archive action. A real
  blur now keeps the draft legible and draws one quiet accent underline until local
  persistence accepts it. No spinner, Saved badge, modal, confirmation, success
  toast, or second status vocabulary was added.

  Focus freezes the exact Note before DOM editing. Changed HTML crosses the current
  sanitizer and auto-link policy; `/todo`, `/t`, color, and `/clear` keep their
  familiar consequences. Conversion retains stable identity and compatible
  metadata. A durable no-op restores accepted HTML, competing color/navigation
  actions wait, acceptance rebuilds the card and restores stable-item focus, stale
  truth preserves and refocuses the draft, and an unknown acknowledgement enters
  existing recovery without retry.

  The focused production-extracted/static contract passes rich text, auto-linking,
  no-write normalization, slash consequences, metadata retention, exact identity,
  pending duplicate, stale/recovery refusal, accepted render/focus, unknown receipt,
  zero retry, Link ownership, and busy/interlock wiring. **Implemented: yes.
  Verified: partial (static and production-extracted deterministic evidence only).
  User-validated: no. Released: no.** Installed blur/storage timing, rendered
  pixels, formatting/Link behavior, paste sanitization, IME, keyboard/focus and
  screen-reader output, representative-user comprehension, approval, and release
  remain open.

- **2026-08-09 — Let the marker mean it will be there later.** Favorite, Read
  Later, and read/unread remain lightweight one-click decisions. The existing star,
  bookmark consequence, or status control now stays at its last accepted state and
  carries one quiet pulse while browser-profile storage answers. The row/card,
  counts, and existing success message change together only after acceptance.

  This keeps status attached to the exact saved page instead of adding a global
  spinner, modal, pending toast, badge, palette, font, or new copy. The focused
  production-extracted/static contract passes both directions of all three marker
  actions, exact nested identity, frozen timestamps, stale/recovery/pending refusal,
  one accepted write, unknown acknowledgement without retry, exact opener/focus
  continuation, and busy/interlock/navigation wiring. **Implemented: yes. Verified:
  partial (static and production-extracted deterministic evidence only). User-
  validated: no. Released: no.** Installed marker pixels, storage timing, pointer/
  keyboard/focus and screen-reader behavior, representative-user comprehension,
  approval, and release remain open.

- **2026-08-09 — Let a saved page wait at the filing edge.** Individual saved-page
  Archive stays one click and reversible, but the Board card or Library row now
  remains fully legible until browser-profile storage accepts the move. The exact
  Archive button, Library More control, or underlying card reuses the quiet receipt
  underline; only then does the page leave the active surface and appear in Archive.

  Fading the whole card would imply that filing had already happened, so the design
  deliberately preserves its accepted content and geometry. No confirmation,
  spinner, pending toast, badge, new copy, color, font, or animation vocabulary was
  added. The focused production-extracted/static contract passes exact nested
  identity, the compatible Archive entry and frozen time, competing/pending/stale/
  recovery refusal, one accepted write, reversible success, unknown acknowledgement
  without retry, exact caller focus sequencing, and busy/interlock/navigation
  wiring. **Implemented: yes. Verified: partial (static and production-extracted
  deterministic evidence only). User-validated: no. Released: no.** Installed
  pixels/counts, MV3 storage timing, Undo/restore/reload, pointer/keyboard/focus and
  screen-reader behavior, representative-user comprehension, approval, and release
  remain open.

- **2026-08-09 — Make Restore read like a filing instruction.** Each saved-page row
  in the primary Archive ledger now replaces the vague origin line with the action's
  current consequence: `Restore to Workspace › Space › Group`. Original containers
  still win; when they are gone, the existing active/first or Inbox fallback remains
  fast, but it is no longer hidden.

  The route slip is the distinctive element and the receipt. It stays fully legible
  while the exact Restore button reuses the quiet persistence underline; only an
  accepted write removes the Archive row, updates active counts, announces the
  localized destination, and moves focus. Taiwan copy stays compact and literal:
  `復原`, `復原到 {destination}`, and `已復原到 {destination}`. No preview panel,
  confirmation, spinner, badge, new palette/font/route, or animation vocabulary was
  added. The focused production-extracted/static contract passes original and Inbox
  destinations, exact object retention, collision/stale/recovery/pending refusal,
  accepted and unknown receipts, en/zh-TW parity, focus sequencing, and busy/
  interlock/navigation wiring. **Implemented: yes. Verified: partial (static and
  production-extracted deterministic evidence only). User-validated: no. Released:
  no.** Installed destination wrapping/counts, MV3 timing, Inbox creation, Undo/
  reload, pointer/keyboard/focus and screen-reader behavior, representative-user
  comprehension, approval, and release remain open.

- **2026-08-09 — Let compact Restore point to the route slip.** A saved page found
  in the compact Search archive results no longer pairs a right-arrow with a second,
  visually similar Restore arrow that hides the filing consequence. It now has one
  quiet right-arrow continuation. Its localized tooltip names the exact current
  destination, and activation opens the primary Archive ledger with that exact
  entry's visible `Restore to Workspace / Space / Group` instruction focused.

  This keeps the small result scannable and makes the canonical ledger the single
  place where Restore is reviewed and activated. The removed Settings archive
  container remains dormant, but its retained null-guarded renderer follows the
  same rule. Stale truth keeps the source open; drift after navigation stays in
  Archive with safe fallback focus. No modal, panel, palette, font, schema, new
  translation, durable route write, mutation, persistence, retry, or success toast
  was added. The focused production-extracted/static contract passes exact review
  navigation, stale refusal, exact entry-reference focus, zero write delegation,
  both retained call sites, and unchanged non-tab legacy behavior. **Implemented:
  yes. Verified: partial (static and production-extracted deterministic evidence
  only). User-validated: no. Released: no.** Installed routing/focus, rendered
  tooltip/disabled states, keyboard and screen-reader behavior, representative-user
  comprehension, approval, and release remain open.

- **2026-08-09 — Fold the selected routes into one filing slip.** Multi-select in
  Archive now treats the rows as the review instead of covering them with a modal.
  When every selected entry is a saved page, one destination is written directly
  beside the count. Several destinations become one restrained disclosure listing
  every `Workspace / Space / Group` route and the number of pages going there.
  `Restore selected` remains the familiar one-click action after that review.

  The disclosure is the single visual risk: a small accent-tinted filing tab that
  unfolds into a local route ledger. Everything around it stays quiet—existing
  typography, spacing, buttons, row slips, and receipt pulse. Mixed saved pages and
  other archived content are guided into separate selections instead of silently
  bypassing the page receipt. Pending rows and routes remain visible until one
  accepted write; one missing Inbox per Space is created with collision-safe
  identity, and accepted success names the exact route or destination count. No
  confirmation modal, new palette/font, schema, permission, host access, retry, or
  pre-receipt success was added. **Implemented: yes. Verified: partial (static and
  production-extracted deterministic evidence only). User-validated: no. Released:
  no.** Installed large-selection geometry, native disclosure/Escape/focus,
  storage timing, keyboard and screen-reader output, representative-user
  comprehension, approval, and release remain open.

- **2026-08-09 — Let the return route sit beside the countdown.** A saved page in
  Trash now answers the two questions that matter at the same glance: where Restore
  will put it and how long recovery remains available. The row keeps its expiry
  countdown while the established filing slip names the exact
  `Workspace / Space / Group` route; Restore stays one click after that review.

  Saved-page-only selection reuses the same restrained one/many-route disclosure as
  Archive. Mixed saved pages and other deleted content are guided into separate
  selections, so a page cannot silently fall through to the older writer. Pending
  rows, routes, and countdowns remain visible until one accepted receipt; only then
  do Trash counts and active projections change and the localized success name the
  route or destination count. No modal, new palette/font, schema, permission, host
  access, retry, or pre-receipt success was added. **Implemented: yes. Verified:
  partial (static and production-extracted deterministic evidence only). User-
  validated: no. Released: no.** Installed countdown/route wrapping, MV3 storage
  and retention timing, native disclosure/Escape/focus, keyboard and screen-reader
  output, representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Give a whole Group a destination before it moves.** An archived or
  trashed Group can hold an entire browsing session, so its Restore row now reads
  like a filing instruction: `Restore to Workspace › Space`. The Group title and
  item count stay visible; Archive keeps the filed date and Trash keeps the expiry
  countdown. Restore remains one click after that consequence is readable.

  The existing route slip is the sole signature element. Compact Search and the
  retained Settings list now point to that primary review instead of squeezing in a
  second immediate Restore with a hidden destination. During persistence, the row
  and route do not move; the exact button alone uses the established quiet receipt
  underline. An accepted receipt returns the original Group object and names the
  destination. Conflicting nested IDs fail closed rather than being cloned or
  silently rekeyed. No modal, new palette/font, schema, permission, host access,
  retry, or pre-receipt success was added. **Implemented: yes. Verified: partial
  (static and production-extracted deterministic evidence only). User-validated:
  no. Released: no.** Installed route/count wrapping, MV3 storage/retention and
  restored-reminder behavior, keyboard/screen-reader output, representative-user
  comprehension, approval, and release remain open.

- **2026-08-09 — Turn selected Groups into one filing manifest.** Multi-select now
  keeps several browsing contexts understandable before they return. When every
  selected entry is a Group, one `Workspace › Space` destination sits directly
  beside the count; several destinations unfold in the existing filing disclosure,
  with the number of Groups returning to each Space. `Restore selected` remains the
  familiar one-click action after that review.

  The disclosure is structure, not decoration: it is the manifest for the exact
  original Group objects that will move. Groups mixed with notes, to-dos, or Stacks
  are guided into separate selections, while page-containing mixtures retain the
  stricter saved-page rule. Rows and routes remain visible while the selection
  button uses the established quiet receipt underline; only one accepted write
  removes the entries and names the route or destination count. No modal, new
  palette/font, schema, permission, host access, clone/rekey behavior, retry, or pre-
  receipt success was added. **Implemented: yes. Verified: partial (static and
  production-extracted deterministic evidence only). User-validated: no. Released:
  no.** Installed large-selection geometry, native disclosure/Escape/focus, MV3
  storage/retention and restored-reminder behavior, keyboard/screen-reader output,
  representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Give every local item a visible return address.** Individual
  notes, to-dos, and Stacks in Archive and Trash now use the same restrained filing
  slip as saved pages: `Restore to Workspace › Space › Group`. Archive keeps the
  filed date; Trash keeps the expiry countdown. A complete Stack still returns as
  one original object at the Group root, including its nested pages, notes, to-dos,
  Stacks, and stable IDs.

  Compact Search and the retained Settings list point to the canonical ledger row
  instead of offering a second hidden-destination Restore. During persistence, the
  row and route remain legible while only the exact button uses the quiet receipt
  underline. An accepted write alone removes the row and names the destination;
  conflicts or uncertain storage never clone, rekey, retry, repaint, or claim
  success. No modal, new palette/font, schema, permission, host access, or network
  behavior was added. **Implemented: yes. Verified: partial (static and production-
  extracted deterministic evidence only). User-validated: no. Released: no.**
  Installed route wrapping, MV3 storage/retention and restored-reminder behavior,
  keyboard/screen-reader output, representative-user comprehension, approval, and
  release remain open.

- **2026-08-09 — Fold selected local context into one return manifest.** Notes,
  to-dos, and Stacks share a Group destination, so a mixed local-item selection now
  reads as one filing decision before it moves. One `Workspace › Space › Group`
  route sits beside the selected count; several routes unfold in the existing
  restrained disclosure with the number of items returning to each Group.

  The filing manifest remains the sole visual signature. Rows, dates, Trash
  countdowns, and routes stay visible while the selection button uses the quiet
  receipt underline. One accepted write returns the exact original objects in
  selected order and creates at most one Inbox per reviewed Space; uncertain truth
  never clones, rekeys, retries, repaints, or claims success. Pages and Groups keep
  their stricter separate paths. No modal, new palette/font, schema, permission,
  host access, or network behavior was added. **Implemented: yes. Verified: partial
  (static and production-extracted deterministic evidence only). User-validated:
  no. Released: no.** Installed large-selection geometry, MV3 storage/retention and
  restored-reminder behavior, keyboard/screen-reader output, representative-user
  comprehension, approval, and release remain open.

- **2026-08-09 — Keep the return manifest inside its ledger.** The selected Restore
  disclosure already answered the right question, but its open route list was
  positioned from the small summary tab. At 800px that pushed the first 50px behind
  the sidebar, cutting off the beginning of every Workspace / Space / Group address.

  The narrow layout now positions the list from the full selection strip and caps it
  to that strip. This is a structural correction, not a new visual idea: the quiet
  filing tab, selected count, one-click Restore, secondary action, typography,
  palette, and motion language remain unchanged. English/light 1280x720 and native
  zh-TW/Locus Dark 800x720 current-source renders keep the list and actions inside
  the board with visible keyboard focus and no document overflow. **Implemented:
  yes. Verified: partial (static and rendered-current-source evidence only). User-
  validated: no. Released: no.** Installed native disclosure behavior, live reduced
  motion, screen-reader output, representative-user comprehension, approval, and
  release remain open.

- **2026-08-09 — Let selection frame the filing slip instead of flooding it.** The
  checked box and accent edge already made selected Archive/Trash rows unmistakable,
  but a 72% accent fill overwhelmed their actual purpose: reading the return address
  and, in Trash, the remaining recovery time. Measured destination contrast fell to
  2.07:1 in Locus Light and 2.77:1 in Locus Dark.

  Selected rows now use the same restrained 10% accent language as active filters,
  while destination and date/countdown share the existing `--text2` hierarchy.
  Light metadata reaches 5.19:1 and Dark reaches 6.78:1; the checkbox, 3px filing
  edge, open manifest, actions, and focus remain unchanged. No new copy, control,
  palette, font, animation, schema, permission, or product behavior was added.
  **Implemented: yes. Verified: partial (static and rendered-current-source evidence
  only). User-validated: no. Released: no.** Installed reduced-motion/forced-colors,
  screen-reader output, representative-user comprehension, approval, and release
  remain open.

- **2026-08-09 — Let trust copy carry the emphasis.** Archive's Local card contains
  the durability fact users need before uninstalling, but its saturated blue fill
  reduced the export warning to 1.11:1 contrast in Locus Light. Trash was quieter,
  yet its retention explanation still fell below 4.5:1 in both release themes.

  The cards keep their roles rather than becoming generic: Archive uses a quiet 8%
  blue wash and Trash its 5% red wash; each heading stays semantically colored but
  is pulled toward the theme text token, while the evidence line uses `--text2`.
  Every measured heading/body now clears 5.0:1, with the grid, copy, and interactions
  unchanged. No new card, icon, action, palette, font, animation, schema, permission,
  or product behavior was added. **Implemented: yes. Verified: partial (static and
  rendered-current-source evidence only). User-validated: no. Released: no.**
  Installed reduced-motion/forced-colors, screen-reader output, representative-user
  comprehension, approval, and release remain open.

- **2026-08-09 — Let the return address take the space it needs.** Archive and
  Trash already show the filing consequence beside each Restore action, but their
  generic secondary-text rule forced every address onto one ellipsized line. A
  realistic English path lost 127px; native zh-TW lost 108px at the narrow target.

  Only the exact destination slip now wraps, including long unbroken names. Titles,
  dates/countdowns, selection signals, filing manifest, and the one-click action
  keep their established compact treatment. Long rows grow by the minimum natural
  amount while shorter rows stay 64px. No tooltip, disclosure, extra confirmation,
  copy, control, palette, font, animation, schema, permission, host access, or
  product behavior was added. **Implemented: yes. Verified: partial (static and
  rendered-current-source evidence only). User-validated: no. Released: no.**
  Installed zoom/extreme-name behavior, reduced motion/forced colors, screen-reader
  output, representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Make one popup action the unit of trust.** A row-level Hibernate
  looked independent from Save, but it navigated a tab and then reloaded popup state.
  Letting Save begin between those steps could leave the popup showing older truth
  while the save receipt settled.

  Single-tab Hibernate now uses the same quiet action ownership as every popup Save:
  the initiating control and popup remain busy until the browser effect and refresh
  finish, and competing actions keep their sources untouched. Failure releases the
  same boundary without retry or refresh. The existing button, feedback, suspended
  page, layout, motion, and copy remain unchanged; no modal or additional decision
  was added. **Implemented: yes. Verified: partial (production-extracted
  deterministic evidence only). User-validated: no. Released: no.** Installed
  popup/tab/storage timing, accessibility feedback, representative-user
  comprehension, approval, and release remain open.

- **2026-08-09 — Finish accepted work before changing the browser.** Popup actions
  can begin immediately after a user changes a selected tab or Hibernate preference.
  Those choices already use a serialized state receipt, but Hibernate's subsequent
  tab navigation and whole-state refresh could previously overtake it.

  One-tab and bulk Hibernate now keep the existing busy treatment while earlier
  popup writes settle, then perform their unchanged browser effects. The interaction
  remains one click and adds no progress ceremony, retry, notification, copy, or
  visual state; it simply makes the visible result follow accepted local truth.
  **Implemented: yes. Verified: partial (production-extracted deterministic evidence
  only). User-validated: no. Released: no.** Installed timing, accessibility,
  representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Make the privacy promise difficult to weaken by accident.** The
  product tells privacy-conscious users exactly what it can access, but the release
  preflight previously checked only one manifest field. New optional access, page
  injection, or external messaging could have appeared without invalidating that
  visible promise.

  The seven disclosed browser capabilities are now an exact release allowlist.
  Automatic content scripts, host/optional access, and externally initiated
  messaging require an explicit future product decision and matching disclosure.
  Nothing in the shipped manifest or interface changed. **Implemented: yes.
  Verified: partial (static manifest and negative-regression evidence only). User-
  validated: no. Released: no.** Installed permission prompts, network behavior,
  Store review, representative-user trust, approval, and release remain open.

- **2026-08-09 - Keep local convenience from acquiring a hidden network cost.** A
  user should be able to save and recover pages without auditing implementation
  details after every update. The release preflight already checked CSP and one
  favicon service, but it still accepted direct request APIs, remote extension
  scripts, and remote styles.

  The gate now treats extension-directed requests and remote extension resources as
  regressions while preserving the intended product boundary: an explicit Open can
  navigate to a saved page, and packaged/data assets plus local favicons continue to
  work. No interface, copy, flow, runtime, manifest, data, permission, or host access
  changed. **Implemented: yes. Verified: partial (static source and negative-
  regression evidence only). User-validated: no. Released: no.** Installed network
  logs, CSP/local-favicon behavior, representative-user trust, approval, Store
  review, and release remain open.

- **2026-08-09 - Let the filing desk remove its own prerequisite.** Home already
  told a user with no Space what blocked Save, then left the action area empty. The
  person had to leave the Trail and discover a small sidebar plus before the core
  loop could begin.

  The blocked destination now carries one primary **Create space** action. It keeps
  the Trail's filing-line signature and existing button language; no illustration,
  onboarding card, extra explanation, or competing accent was added. The action
  opens the established organization dialog, which already owns naming, focus,
  persistence, Undo, and recovery. Duplicate-Inbox ambiguity remains a different
  fail-closed state. **Implemented: yes. Verified: partial (static and production-
  extracted deterministic evidence only). User-validated: no. Released: no.**
  Installed pixels, real dialog/storage timing, assistive-technology output,
  representative-user comprehension, approval, and release remain open.

- **2026-08-09 - Let a closed filter panel tell the truth.** Search intentionally
  keeps optional controls collapsed, but their URL-backed state can survive reload
  and keep narrowing results while the toggle still looks neutral. That makes an
  empty or unexpectedly short result set feel unreliable.

  The existing control now carries one restrained numeric seal for active Space,
  time, and tag dimensions. It is the only added visual: query, content type, and
  sort remain visible elsewhere, so they do not inflate the count. Native accessible
  copy carries the meaning while the number stays presentation-only; forced colors
  retain the state. Nothing auto-opens or clears. **Implemented: yes. Verified:
  partial (static and production-extracted deterministic evidence only). User-
  validated: no. Released: no.** Installed pixels, assistive-technology output,
  theme/zoom behavior, representative-user comprehension, approval, and release
  remain open.

- **2026-08-09 - Make clearing filters as literal as applying them.** The Search
  panel presented sorting as a separate visible choice, then silently reset it from
  an always-actionable **Clear all** control. The action's name, availability, and
  consequence did not describe the same thing.

  The control is now the quieter **Clear filters / 清除篩選條件**. It clears only the
  actual type, Space, time, and tag dimensions, preserves query and sort, stays
  disabled at the default state, and shares its reset with no-result recovery. No
  new ornament, confirmation, or feedback layer competes with the exact destination
  path. **Implemented: yes. Verified: partial (static and production-extracted
  deterministic evidence only). User-validated: no. Released: no.** Installed
  pixels, real pointer/keyboard behavior, assistive-technology output,
  representative-user comprehension, approval, and release remain open.

- **2026-08-09 - Refuse the guess without creating a dead end.** Home already told
  users with duplicate Inboxes to review the Space, then offered no action. The
  safety boundary was correct—Locus must not guess a destination—but the interface
  pushed the recovery work back onto the user.

  The existing filing lane now offers one literal **Open space / 開啟空間**
  continuation. It spends no new visual motif: the button remains quiet beside an
  existing primary recovery action and becomes primary only when it is Home's sole
  safe next step. Activation rechecks the exact Workspace/Space and enters the board
  without persisting, selecting, or repairing an Inbox. Stale truth keeps Home and
  focus. **Implemented: yes. Verified: partial (static and production-extracted
  deterministic evidence only). User-validated: no. Released: no.** Installed
  pixels, real Router/history behavior, assistive-technology output,
  representative-user comprehension, approval, and release remain open.

- **2026-08-09 - Reveal a Home zone only when its noun is real.** The Trail had
  learned to refuse duplicate Inboxes, but the older Inbox zone beneath it could
  still select the first same-name Group. A no-Space Home also repeated its single
  setup decision in a second empty card.

  Home now spends no new visual device. It simply stops earlier: Trail only when no
  Space exists, Spaces without Inbox review when Inbox is absent or ambiguous, and
  the full Trail → Inbox → Spaces sequence for one exact Inbox. The normal Inbox
  button reuses the existing exact, read-only navigator. **Implemented: yes.
  Verified: partial (static and production-extracted deterministic evidence only).
  User-validated: no. Released: no.** Installed pixels, real Router/history
  behavior, assistive-technology output, representative-user comprehension,
  approval, and release remain open.

- **2026-08-09 - Make the filing line real beneath every Save button.** Home could
  visually refuse duplicate Inboxes while older new-tab entry points still filed
  into the first one. The destination line was therefore a promise some controls
  did not keep.

  One invisible structural rule now supports every tab-to-Inbox action: review the
  exact Workspace, Space, and Inbox before history; reuse or provision only after
  that review; otherwise save and close nothing. No new card, dialog, badge, or
  motion was added. The only new copy states the unchanged outcome directly in
  English and native zh-TW. **Implemented: yes. Verified: partial (static and
  production-extracted deterministic evidence only). User-validated: no. Released:
  no.** Installed storage/tab effects, rendered copy, assistive-technology output,
  representative-user comprehension, approval, and release remain open.

- **2026-08-09 - Let the existing receipt answer “where?”** Exact Inbox authority
  stopped Locus from filing into a guessed destination, but ordinary success still
  said only “Saved to Inbox” or used English-only multi-tab text. That left the user
  to navigate and verify the filing themselves.

  The existing toast now names the accepted Workspace › Space › Inbox for single,
  selected, and Space-drop Saves. It distinguishes a saved copy when the source stays
  open, while the established suffix still reports what actually closed. No new
  card, dialog, badge, color, animation, or navigation was added. **Implemented: yes.
  Verified: partial (static and production-extracted deterministic evidence only).
  User-validated: no. Released: no.** Installed effects, rendered toast/AT output,
  representative-user comprehension, approval, and release remain open.

- **2026-08-09 - Keep the chosen Group visible after Add / Save.** A user chose a
  specific Group, but success collapsed that intent into “Added 2 tabs.” The result
  neither answered where the tabs went nor protected a Group that changed while the
  active browser tab was being read.

  The existing button now carries one exact Workspace › Space › Group context through
  acceptance and rechecks it after the browser read. The existing toast names that
  frozen path and says “copy” when sources stay open; stale authority changes nothing.
  No card, dialog, badge, animation, or navigation was added. The zh-TW copy follows
  the transactional Taiwan-language standard. **Implemented: yes. Verified: partial
  (static and production-extracted deterministic evidence only). User-validated: no.
  Released: no.** Installed effects, rendered toast/AT output, representative-user
  comprehension, approval, and release remain open.

- **2026-08-12 — Replace the prototype collage with one Field Desk.** The core
  surfaces had accumulated lavender glass, bento compartments, scenic launch art,
  soft pills, and unrelated card elevations. Even when individual controls worked,
  Welcome, Home, Search/Library, saved-item detail, Settings, and popup did not feel
  like one trustworthy save → locate → recover product.

  Locus and Locus Dark now share warm-paper/deep-ink foundations, a cobalt locator
  edge, a green receipt signal, an 8 px spacing rhythm, restrained radii/elevation,
  and 38–44 px core controls. Home is treated as a recovery desk; the open-tabs rail
  yields at 1280 px; Welcome, dialogs, Settings, detail, and popup reuse the same
  field-card grammar. Scenic launch imagery is suppressed and ornamental transforms
  are removed from the primary loop. No behavior, schema, stable element ID,
  permission, network boundary, or stored data changed. **Implemented: yes.
  Verified: partial (36 JavaScript syntax checks, 27 static/contract runners, quality
  gates, current-source 1280×720 Home-reference and popup rendering). User-validated:
  rejected by the owner on 2026-08-12; superseded by Locus Index. Released: no.**
  The Home fixture is reference-only; installed extension pixels,
  a real 800 px viewport, dark-theme rendering, assistive-technology output, and
  representative-user approval remain open.

- **2026-08-12 — Keep a saved window attached to its filing Space.** Save all used
  to remember the active Space before asking Chrome for the window's tabs. If clean
  storage adoption replaced the graph during that wait, the generated Group could
  land on a detached object while Locus persisted the unchanged current graph and
  proceeded toward source cleanup.

  Save all now carries one exact Workspace/Space context across the browser read,
  refuses any replacement or authority drift, allocates the Session Group and items
  collision-safely, and names the accepted Workspace › Space › Group in its existing
  receipt. Read, destination, empty, pending, and success states are localized in
  English and native zh-TW. No new surface, layout, motion, schema, permission,
  route, network boundary, or source-close policy was added. **Implemented: yes.
  Verified: partial (36 JavaScript syntax checks, 27 deterministic runners, and a
  production-extracted adoption-race regression). User-validated: no. Released:
  no.** Installed storage/tab timing, real source effects, rendered/AT feedback, and
  representative-user trust remain open.

- **2026-08-12 — Turn the popup into one capture docket.** The extension's fastest
  entry point still gave Save and Hibernate equal weight, squeezed operational copy,
  and paired a generic read failure with controls that looked usable. It carried the
  Field Desk colors without yet carrying its hierarchy or trust model.

  The 420 px popup now reads as one filing sequence: current window, dominant Save,
  quieter Hibernate, then tab status and destination. Loading and read failure make
  every capture entry point truly unavailable; one named alert states that no tab
  was saved or closed and focuses Retry. The platform shortcut, readable type,
  compact-height list bound, and two-line local-first footer finish the same system.
  Existing capture modes, receipts, destinations, section stack, schema, import,
  permissions, routes, storage, and local-only privacy remain unchanged.
  **Implemented: yes. Verified: partial (full static/deterministic suite plus bounded
  English/light 420×590 current-source rendering). User-validated: no. Released:
  no.** Installed real APIs/tab effects, success pixels, dark/zh-TW/420×520 rendering,
  assistive-technology output, and representative-user approval remain open.

- **2026-08-12 — Make the first save look like filing, not onboarding.** Welcome
  taught one useful action, but its generic logo-and-card composition did not show
  the exact place the tab would go. Home used a locator and full Workspace › Space ›
  Inbox language, so the same transaction looked unrelated before and after Save.

  Welcome is now one first-filing sheet. The real reviewed tab and exact destination
  occupy equal fields joined by the established cobalt locator; **Save and close
  tab** names the full consequence. The headline now teaches the loop directly:
  **Save one tab. Find it again.** Native zh-TW says **儲存一個分頁，之後找得回來**
  and states that Locus saves before closing. The route stacks at 800 px, the sheet
  scrolls at 520 px, and pending Save blocks dismissal while retaining trapped Tab
  navigation. The existing Inbox route, saved-item Open focus, schema, import,
  permissions, storage, and local-only privacy remain unchanged. **Implemented: yes.
  Verified: partial (full static/deterministic suite plus bounded 1280×720 current-
  source DOM/computed-style evidence). User-validated: no. Released: no.** Browser
  policy prevented a synthetic preview and was not bypassed; installed pixels and
  effects, dark/zh-TW/800/520 rendering, assistive-technology output, and
  representative-user activation remain open.

- **2026-08-12 — Turn Spaces into a filing index, not another dashboard.** Home's
  recovery Trail and Inbox had a clear order, but the last zone still expanded into
  three equally weighted colored cards, inferred decorative artwork from English
  Space names, and could expose nine additional records. The page ended with more
  visual competition than recovery context.

  Spaces now share one quiet register boundary. Each row uses the stored symbol,
  count, one newest real item, and literal Open/More actions; empty rows stay truthful.
  The register becomes two lines at 900 px and one column at 560 px, with 40 px
  actions, focus-within feedback, dark-token inheritance, and forced-color borders.
  Name-inferred art, synthetic Space accents, and the unused collections-strip code
  and styles left production. Existing routes, menus, drag/drop capture, data,
  schema/import shape, stable IDs, permissions, storage, and privacy remain unchanged.
  **Implemented: yes. Verified: partial (36 syntax checks, 27 deterministic runners,
  and production-source/CSS contracts). User-validated: no. Released: no.** Installed
  Home pixels with real local data, actual 1280×720 and 800/560 px rendering, real
  drag/drop, dark/zh-TW, zoom, assistive-technology output, representative-user
  comprehension, and release remain open.

- **2026-08-12 — Make Details prove the record before offering its metadata.** The
  saved-item sheet had safe persistence and recovery behavior, but presented it as
  a generic form drawer: the title appeared twice, the location clipped to two nouns,
  and core recovery context competed with decoration and arbitrary fields.

  Details now reads as a Field Desk docket. One mono filing line shows item type and
  the complete wrapping Workspace › Space › Group route; one bounded field owns the
  visible record identity; Open remains the dominant guarded action. Why saved,
  Reminder, and Tags align like filing annotations, while Cover, Checklist, and
  Custom fields stay under More details. The 560 px sheet stacks at 560 px and
  becomes full-screen at 520 px, with 40 px primary controls and forced-color
  boundaries. The exact hidden record title still labels the modal. Existing
  transaction controllers, routes, focus stack, schema/import shape, stable IDs,
  permissions, storage, and local-only privacy did not change. **Implemented: yes.
  Verified: partial (36 syntax checks, 27 deterministic runners, and production-
  source/CSS contracts). User-validated: no. Released: no.** Installed pixels with
  real local data, actual 1280×720/800/520 px rendering, real Chrome history/storage,
  dark/zh-TW, zoom, assistive-technology output, representative-user comprehension,
  and release remain open.

- **2026-08-12 — Make Search look like locating, not analytics.** Find again already
  resolved exact records safely, but its destination was the smallest line in each
  row, its primary Open action followed secondary metadata, and expanded filters
  turned the surface into a compressed three-column dashboard.

  Search now reads as one Field Desk locator ledger. A 56 px accent-edged query and
  flat filing rail lead into real result rows whose complete Workspace › Space ›
  Group route appears before optional snippet/tags; saved age has its own mono field.
  The selected record repeats the exact Saved in route and immediately offers the
  guarded Open page and View details actions. Above 1100 px filters form one tray
  over the results/record split; at 1100/900/620 px the detail, ledger, paths, and
  actions progressively reflow. The cobalt locator edge is the single signature
  motif—no stepper, statistics, bento cards, gradient, or synthetic results were
  added. Existing recovery controllers, URL state, focus/IME behavior, failure
  states, routes, schema/import shape, stable IDs, permissions, storage, and local-
  only privacy did not change. **Implemented: yes. Verified: partial (36 syntax
  checks, 27 deterministic runners, and production-source/CSS contracts). User-
  validated: no. Released: no.** Installed real-data pixels, real Chrome effects,
  dark/zh-TW, zoom, assistive-technology output, representative-user comprehension,
  and release remain open.

- **2026-08-12 — Keep each Library page in one filing record.** The shared All
  Links/Favorites/Read Later ledger already reopened exact pages safely, but its
  common-width layout separated title/actions, destination, and age into three or
  four bands. Small count/status pills and duplicated Open, Details, Favorite, and
  reading-status actions in More made the surface feel like an administration table.

  Library now follows the Field Desk's physical filing logic. One heading and mono
  Workspace scope lead into a 52 px cobalt-edged find/sort row, then a quiet count
  and flat Read Later status rail. The register has one cobalt filing spine; every
  88 px record keeps title, complete Workspace › Space › Group › optional Stack
  destination, and source together in DM Sans/Geist Mono hierarchy. Open leads,
  Details follows, the existing state control stays visible, and More owns only the
  additional Read Later and Archive lifecycle actions. At 1100 px actions take one
  intentional second line; at 760 px query/sort, age, status, and actions reflow.
  The moved Workspace scope joins privacy blur, and the spine survives forced colors.
  The historical card grids, preview panes, statistics, tags, and populated examples
  remain reference-only and were not introduced. Existing exact-target recovery,
  URL state, receipt-gated mutations, focus, empty/failure states, routes, schema/
  import shape, stable IDs, permissions, storage, and local-only privacy did not
  change. **Implemented: yes. Verified: partial (36 syntax checks, 27 deterministic
  runners, and production-source/CSS contracts). User-validated: no. Released: no.**
  Installed real-data pixels, real Chrome effects, dark/zh-TW, zoom, assistive-
  technology output, representative-user comprehension, and release remain open.

- **2026-08-12 — Make Settings one control ledger.** Settings had accumulated the
  visual grammar of a generic SaaS dashboard: eight icon tabs, equal card grids, a
  promotional privacy hero, and a second privacy card in the rail. That language
  obscured which controls belonged together and did not match the filing/recovery
  surfaces around it.

  Settings now uses one numbered filing index and one continuous 900 px control
  ledger. Each established section becomes a sequence of labelled rows; DM Sans
  carries choices and consequences while Geist Mono carries index and group labels.
  A single cobalt active marker is the signature detail. Privacy is proof rather
  than ornament, with a quiet rail boundary and one green-spined evidence row. At
  880 px the index becomes a scrollable document strip; at 620 px labels stack above
  controls. Forty-pixel targets, explicit toggle focus, reduced-motion shutdown, and
  forced-color row separators complete the system. Existing controls, copy, state,
  routes, schema/import shape, stable ids, permissions, storage, and local-only
  behavior are unchanged. **Implemented: yes. Verified: partial (36 syntax checks,
  27 deterministic runners, and production-source/CSS contracts). User-validated:
  no. Released: no.** The unpacked headless render did not initialize, so installed
  real-data pixels, actual 1280×720/800/620 px geometry, live focus/scroll behavior,
  dark/zh-TW, zoom, assistive-technology output, representative-user comprehension,
  and release remain open.

- **2026-08-12 — Make Notes and To-dos look like records, not loose widgets.** The
  local Board items still hid their type, floated reminders over content, inserted
  an empty keyboard stop, and exposed Archive as a tiny hover-only X. That made the
  destructive path more visible than Details and obscured the safe receipt behavior
  already underneath editing.

  Note and To-do now share one record slip: a Geist Mono filing stamp, DM Sans
  content, in-flow reminder, existing color spine, and one persistent item-named
  More control. Note uses a restrained cobalt/paper wash rather than the yellow
  sticky-note trope; To-do completion is 24 px; More is 40 px; infinite reminder
  motion is gone. Pointer, Context Menu, and Shift+F10 converge on one prepared
  opener, and local Archive waits for accepted storage before removal or successor
  focus. List view keeps the same hierarchy. No generic badge grid, decorative art,
  new copy, fake record, layout, state field, route, schema/import change, permission,
  or network boundary was added. **Implemented: yes. Verified: partial (36 syntax
  checks, 27 deterministic runners, production-extracted receipt/focus behavior,
  and source/CSS contracts). User-validated: no. Released: no.** Installed real-data
  pixels, actual 1280×720/800/narrow rendering, real Chrome effects, dark/zh-TW,
  zoom, assistive-technology output, representative-user comprehension, and release
  remain open.

- **2026-08-12 — Make saved pages read like records, not hover toolbars.** Saved
  pages were the remaining mixed-language Board item: a floating card with Details,
  new-tab Open, and Archive compressed into three 22 px controls that appeared only
  on hover. The destructive X competed with the title even though returning to the
  saved page is the core job.

  Saved pages now use the same Field Desk record slip as local items: a Geist Mono
  Link filing stamp, optional in-flow reminder, DM Sans title/Open target, real mono
  source domain, existing color spine, and one persistent item-named 40 px More.
  More, right-click, Context Menu, and Shift+F10 share one opener-aware menu;
  background Open deliberately creates a new tab, and Archive still waits for
  accepted local persistence before removal or successor focus. Board, focused-
  Group, and List reuse retain the hierarchy. No badge grid, decorative art, fake
  record, new copy, route, field, schema/import change, permission, or network
  boundary was added. **Implemented: yes. Verified: partial (36 syntax checks, 27
  deterministic runners, production-extracted menu/reopen/archive behavior, and
  source/CSS contracts). User-validated: no. Released: no.** Installed real-data
  pixels, actual 1280×720/800/narrow rendering, real Chrome effects, dark/zh-TW,
  zoom, assistive-technology output, representative-user comprehension, and release
  remain open.

- **2026-08-12 — Make Groups read like filing registers, not bento widgets.** The
  Board's records had converged, but each Group still wrapped them in a gradient
  compartment with a lacquer line, hover lift, entrance motion, rotating symbol,
  masked title, and three 24 px actions hidden until hover. The outer hierarchy was
  louder and less reachable than the saved work inside it.

  Board and focused Group pages now share one flat Field Desk filing register;
  Advanced Canvas reuses its inner structure while retaining placement elevation.
  The real stored Group color is a 4 px vertical locator; the visible DM
  Sans Group name is the native page route; Geist Mono carries item/todo/intent
  context; and persistent 40 px Open all/More controls establish the action rhythm.
  The add rail uses the same targets, while the record well stays a quiet paper
  surface. More, right-click, Context Menu, and Shift+F10 share one actual-opener
  menu, and default Groups fill the Board lane at 800 px. The bento/lacquer and Folio
  glass overrides, `colIn`, symbol rotation, hover mask, duplicate page icon, and
  hidden action overlay are removed. No new copy, fake record, field, route, state,
  schema/import change, permission, or network boundary was added. **Implemented:
  yes. Verified: partial (36 syntax checks, 27 deterministic runners, production-
  extracted menu/identity/reopen convergence, and source/CSS contracts). User-
  validated: no. Released: no.** Installed real-data pixels, actual 1280×720/800/
  narrow rendering, real Chrome focus/context/drag/resize/storage effects, dark/
  zh-TW, zoom, assistive-technology output, representative-user comprehension, and
  release remain open.

- **2026-08-12 — Make List Groups scan like registers, not a hover toolbar.** List
  already reused the converged saved-record rows, but each Group still compressed
  page navigation, Open all, Add tab, and More into four 24 px hover actions. Bare
  count pills, symbol scaling, hardcoded English help, and separate pointer/More
  menus pulled the surface back toward a generic prototype table. The supplied
  dashboard/table previews reinforced what not to promote: fake populated rows,
  metric cards, pill clusters, AI sidebars, and equal-weight administration chrome.

  List now extends the Field Desk filing register without becoming another card
  layout. One flat paper panel carries the real stored-color locator; the DM Sans
  Group name is the native focused-page route; Geist Mono carries localized item
  and to-do context; and persistent 40 px Open all/Add tab/More controls form the
  recovery rail. At 900 px the rail takes one intentional second line and remains
  usable through 800/560 px. Board and List now consume one exact-target Group
  action model, so More, right-click, Context Menu, and Shift+F10 share the actual
  opener and a replaced Group exposes no actions. No new copy, fake record, metric,
  field, route, state, schema/import change, permission, or network boundary was
  added. **Implemented: yes. Verified: partial (36 syntax checks, 27 deterministic
  runners, production-extracted menu/identity/move/reopen convergence, and source/
  CSS contracts). User-validated: no. Released: no.** Installed real-data pixels,
  actual 1280×720/800/560 rendering, real Chrome focus/context/capture/drag/storage
  effects, dark/zh-TW, zoom, assistive-technology output, representative-user
  comprehension, and release remain open.

- **2026-08-12 — Make Stacks read as nested sleeves, not miniature widgets.** The
  outer Group and saved-record hierarchy had converged, but Board and List Stacks
  still used tiny collapse/identity controls, bare count pills, and different menu
  affordances. Board also spent space on a separate intention icon while List hid
  the whole lifecycle menu.

  Both layouts now use one subordinate Field Desk sleeve: the real stored Stack
  color becomes a thin binder rail at the truthful nesting depth; DM Sans carries
  the name; Geist Mono carries localized Stack/item context; and persistent 40 px
  collapse, symbol, and More controls keep recovery reachable. More, right-click,
  Context Menu, and Shift+F10 share one exact Stack/parent/Group action model, while
  complete Stack Archive waits for accepted local storage before removal or focus.
  The supplied generic details preview remained reference-only: its fake article,
  filters, pills, analytics, and properties rail were rejected rather than promoted.
  No new copy, fake record, field, route, state, schema/import change, permission, or
  network boundary was added. **Implemented: yes. Verified: partial (36 syntax
  checks, 27 deterministic runners, production-extracted menu/identity/archive
  behavior, and source/CSS contracts). User-validated: no. Released: no.** Installed
  real-data pixels, actual 1280×720/800/560 rendering, real Chrome focus/context/
  capture/drag/storage effects, dark/zh-TW, zoom, assistive-technology output,
  representative-user comprehension, and release remain open.

- **2026-08-12 — Make Opened Tabs read as a live-source ledger, not a hidden
  control strip.** The final Field Desk CSS had already removed the older rail
  gradient and card lift, so this pass corrected the remaining trust gap instead
  of restyling a settled fact. Loading and tab-read failure previously looked
  empty; filter misses looked blank; title switching and context actions were
  pointer-led; Select/Close shrank to 18–20 px hover discoveries; selected Save
  choices looked like compact icon utilities; and the 1280 px expand button could
  not expand the CSS-collapsed rail.

  Opened Tabs now uses one flat browser-source register. The current browser tab
  keeps the single cobalt locator edge; DM Sans carries titles and named actions;
  Geist Mono carries count, source, sleep, and saveability context. Native Select,
  Switch, and Close controls remain visible at 40 px. Selected tabs produce a quiet
  receipt band with full-text Group/Inbox actions. Loading, failure/Retry, true
  empty, no-match/Clear, pending, and non-saveable states are visibly distinct;
  unsafe sources say that they can only switch or close. At 821–1280 px the rail is
  a real 320 px drawer, and at 800 px it is absent rather than secretly focusable;
  accepted capture there returns focus to visible top-bar Save. The duplicate
  footer tip, hidden action discovery, and icon-only selected-save pattern are
  removed. The generic dashboard previews remained reference-only:
  fake populated tabs, metrics, AI suggestions, premium chrome, and card piles were
  rejected. No graph field, route, preference, schema/import change, permission,
  host access, or network boundary was added.

  **Implemented: yes. Verified: partial. User-validated: no. Released: no.** The
  complete 36-file syntax and 27-runner deterministic block passes, including
  10,000 concurrency schedules. Current-source rendering confirmed the fixed
  320 px 1280×720 drawer, the zero-geometry 800×720 boundary, and a removed non-
  shipping light/dark state matrix. That review found and fixed two contrast misses;
  final light metadata/guidance measure 5.79:1/6.50:1 and dark metadata 7.44:1.
  Installed MV3 real-data pixels and effects, native zh-TW/forced-color rendering,
  zoom, assistive-technology output, representative-user comprehension, approval,
  and release remain open.

- **2026-08-12 — Make capture receipts complete the save → locate → recover
  loop.** Selected-as-Group and Group/Stack drops already wrote useful local data,
  but their generic completion copy concealed where it went. The shared toast also
  made Undo the filled action and reduced Open destination to a tiny outline, so
  recovery visually outranked the next core-loop step.

  These capture entries now freeze and re-resolve the exact Workspace, Space,
  Group, full Stack ancestry, item-list owner, saved records, and browser sources.
  Accepted success names that complete filing path and exposes one cobalt 40 px
  **Open destination** action plus a quieter 40 px **Undo**. A green edge marks the
  storage receipt; post-acceptance destination drift switches to an explicit warning
  with Undo and no unsafe Open. The panel uses paper/ink tokens, restrained
  elevation, long-path wrapping, an equal-width 520 px action row, forced-color
  equivalents, and no ornamental hover scale. Open performs read-only routing and
  focuses the rebuilt Group or deepest Stack. No picker, destination, field, fake
  state, route family, preference, schema/import change, permission, host access,
  or network boundary was added.

  **Implemented: yes. Verified: partial. User-validated: no. Released: no.** All
  36 JavaScript syntax checks and 27 deterministic runners pass, including 10,000
  concurrency schedules. Removed non-shipping production-CSS references rendered
  in Folio light at 1280/800/520 px and Folio Dark with native zh-TW at 800 px.
  Installed MV3 timing/effects, native drag and cleanup, installed real-data pixels,
  assistive-technology output, representative-user comprehension, approval, and
  release remain open.

- **2026-08-12 — Replace the owner-rejected Field Desk with Locus Index.** The
  previous pass flattened many prototype controls but still read as pale generic
  cards across the extension. The owner explicitly rejected that result, so it is
  historical evidence rather than current visual authority.

  Locus Index now uses one local-registry hierarchy across the default light/dark
  shell, optional launch layer, Welcome, Home/Inbox records, Search/Library,
  Settings, saved-item detail/dialogs, and popup. Dark ink navigation and headers
  establish place; warm stock holds real saved material; one blue rule locates the
  active record or action; green is reserved for accepted receipts. Lora headings,
  DM Sans controls, Geist Mono paths, 4–8 px radii, flat ruled records, restrained
  stacking elevation, 3 px focus, and state-only motion replace the mixed soft-card,
  scenic, gradient, and glass languages. Welcome is a two-column source/operation
  sheet that stacks at 800 px. Detail is a 600 px recovery sheet that becomes full-
  width at 560 px. Popup uses a registry header/footer and puts Save above Hibernate,
  with a bounded compact row at 420×520. No new runtime copy, fake populated state,
  route, field, schema/import mutation, permission, or network boundary was added.

  The first-red source contract failed on the missing registry token. Green evidence
  includes 37 JavaScript syntax checks, 28 deterministic/stress runners, 10,000
  concurrency schedules (69,880 attempts), and bounded current-source light/dark
  references at 1280×720, exact 800×720, 560×720 detail, and 420×590/420×520 popup
  without horizontal overflow. Direct localhost new-tab boot remains unavailable
  without extension storage, and the popup evidence covers its genuine missing-API
  error only. **Implemented: yes. Verified: partial. User-validated: no. Released:
  no.** Installed MV3 pixels/effects, real local data, native keyboard/screen-reader
  output, forced-color pixels, zoom, owner approval of Locus Index, representative-
  user comprehension, and release remain open.

- **2026-08-12 — Make record color a truthful index marker.** Note and To-do color
  already used an exact receipt-gated writer in current source, but its picker still
  looked like an inherited glass palette: tiny circular swatches, blur, scaling, and
  no truthful representation of an imported nonstandard color. A custom value such
  as `#2f6f63` remained stored yet was announced as No color.

  The picker now reads as one compact Locus Index marker register. Six standard
  choices are 40 px rectangular filing tabs; a current imported value adds one
  selected localized custom tab painted from the exact transient value. Seven
  choices wrap as a balanced 4 + 3 rather than an orphaned 6 + 1. Paper, a single
  cobalt locator edge, restrained elevation, and 3 px focus replace blur, gradient,
  circular-orb, and hover-scale residue. Choosing the already-current custom marker
  only closes the menu. Its transient value feeds `background-color`, not the broad
  image-capable shorthand, so malformed imported bytes remain stored without
  becoming an image/network paint. Explicit standard changes retain the existing exact-target,
  single-snapshot, awaited-persistence, recovery, and focus-return transaction. No
  new copy, editor, fake state, route, stored field, schema/import change, stable-ID
  change, permission, host access, or network boundary was added.

  The first-red DOM contract failed on the missing seventh choice; later red checks
  rejected the glass language and the initial 6 + 1 wrap, and a final privacy red
  rejected broad `background` consumption. All 37 repository
  JavaScript syntax checks and all 28 documented runners pass, including 10,000
  concurrency schedules and 69,880 attempts. Bounded production-CSS light/dark
  references at 320 × 420 measured a 304 px 4 + 3 strip, exact custom paint,
  selected state, and no horizontal overflow or blur/gradient. That render predates
  only the final color-only property hardening.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.** These
  references are not installed runtime. Real-data pixels/effects, native keyboard/
  screen-reader and forced-color output, zoom, owner approval, representative-user
  comprehension, and release remain open.

- **2026-08-12 — Give each record a selectable index and a readable detail
  docket.** Board, focused-Group, and List records still hid selection inside a
  pointer-only 22 px span, with one hardcoded English name and a separate List Stack
  implementation. Optional saved context collapsed into tiny glyphs with English
  tooltips, so neither selection nor recovery detail had a trustworthy place in the
  Locus Index hierarchy.

  Every record now begins with one persistent 40 px squared filing-index control.
  It is a native checkbox-role button, uses the localized item title, shows a
  non-color cobalt edge when selected, and returns keyboard focus to the exact
  rebuilt record after selection. It stays visually separate from the Todo
  completion box. When real notes, checklist entries, or custom fields exist, the
  card ends with one full-width ruled **Details…** docket row whose localized facts
  wrap and whose close path returns to that exact row. Records without those bytes
  remain quiet. Custom cover paint now uses only `background-color`, preventing
  malformed imported data from becoming an image layer. No fake state, editor,
  stored field, route family, schema/import mutation, stable-ID change, permission,
  host access, or network boundary was added.

  The first-red public seam failed because selection returned no native focus owner.
  Green evidence covers native semantics, en/zh-TW names, exact focus and detail
  routing, conditional facts, forced-color boundaries, and removal of hidden/pill/
  glass residue. All 37 JavaScript syntax checks and all 28 documented runners pass,
  including 10,000 concurrency schedules and 69,880 attempts. A temporary removed
  production-fragment reference held exact 40 px controls with no horizontal
  overflow at 1280×720 and 800×720 light plus 560×720 dark zh-TW. **Implemented:
  yes. Verified: partial. User-validated: no. Released: no.** Installed MV3 effects,
  real-data pixels, native assistive-technology and forced-color output, zoom,
  reload/back/forward, owner approval, representative-user comprehension, and
  release remain open.

- **2026-08-12 — Make selection end in a filing docket, not floating glass.** The
  new persistent record selectors still summoned a translucent rounded toolbar
  whose equal-weight utilities hovered over the board. Its styling contradicted
  Locus Index, and the underlying Archive/Move behavior made the visual promise
  worse: both announced completion before local storage acknowledged the change.

  Selection now resolves into one compact bottom filing docket. A dark registry
  edge holds the exact count; a flat warm-paper rail places guarded **Open** first,
  keeps Move and Stack neutral, marks **Archive** as destructive, and reduces Clear
  to one quiet terminal rail. The cobalt top rule makes the active batch legible
  without blur, gradient, spring entrance, hover lift, or pill geometry. At
  1280/800 px the docket stays one 760 px line; at 560 px the count becomes a header,
  four lifecycle actions form a 2×2 grid, and Clear spans both rows. The board
  reserves the dock's real height instead of letting it cover the final record.

  The visual state is now truthful. Archive and Move freeze exact selected records,
  filing owners, and destination ancestry; reject changed, duplicate, nested,
  detached, self, descendant, and no-op targets; and wait for one accepted storage
  receipt before clearing, repainting, focusing, announcing success, or exposing
  Undo. Accepted Move names the complete filing path and offers Open destination.
  English and native zh-TW share the same scope and recovery consequences. No fake
  populated state, new editor, stored field, route family, schema/import mutation,
  stable-ID change, permission, host access, or network boundary was added.

  The first-red public transaction contract failed on the absent selection context.
  Green evidence covers 6 production-seam cases, a 1,024-record accepted/rejected
  Archive scale, all 38 JavaScript syntax checks, all 29 documented deterministic/
  stress runners, and 10,000 concurrency schedules (69,880 attempts). Removed
  production-CSS references measured the final light docket at 1280×720, 800×720,
  and 560×720 without overflow and the dark docket with visible keyboard focus;
  console warnings/errors were zero. **Implemented: yes. Verified: partial.
  User-validated: no. Released: no.** Installed MV3 storage/browser effects, real-
  data pixels, native screen-reader/forced-color output, zoom, installed navigation,
  owner approval, representative-user comprehension, and release remain open.

- **2026-08-12 — Make exact capture receipts govern source cleanup.** Save all and
  existing-Group Save already looked like one coherent Locus Index filing action,
  but their final browser-effect boundary did not carry the exact newly saved
  records. A destination could change while persistence or the final tab read was
  in flight, leaving the source-close decision and visible path out of sync.

  Both actions now freeze the exact Workspace, Space, Group, owned list, and new
  saved-item identities after mutation and carry that receipt through the shared
  acknowledged commit. Only a still-resolvable receipt can authorize source cleanup
  and the named Open-destination result. Drift keeps remaining sources open and uses
  the existing persistent destination-changed warning; recovery, overlap, browser-
  read failure, unsupported input, allocation failure, and clean graph adoption stop
  before false success. No new surface, runtime copy, route, field, schema/import
  mutation, permission, host access, or network boundary was added.

  The first production-caller contract failed because Save all supplied no
  `validateDestination`; the existing-Group branch failed on the same boundary.
  Green evidence covers caller-level adoption and post-receipt drift, all 38
  JavaScript syntax checks, all 29 documented deterministic/stress runners, and
  10,000 concurrency schedules (69,880 attempts). **Implemented: yes. Verified:
  partial. User-validated: no. Released: no.** Installed MV3 storage/tab ordering,
  real source removal, service-worker termination, native receipt rendering/focus,
  real local data, owner approval, representative-user comprehension, and release
  remain open.

- **2026-08-12 — Let the selected font define Locus, not an imposed editorial
  template.** Locus Index forced Lora onto Welcome, Home/Inbox, board,
  Search/Library, opened-tabs, and popup headings while ordinary controls followed
  the user's Font family preference. Popup did not apply that preference at all.
  Combined with the warm paper/ruled-record palette, the split read as a generic
  editorial template and made a visible setting untruthful.

  Typography is now one shared appearance system. `themes.css` owns all eight
  existing font choices, `--font-display` derives from the selected face, and
  `--font-mono` remains the narrow role for exact paths, counts, shortcuts, and
  accepted receipts. New-tab and popup headings/controls consume the shared role;
  popup validates the persisted value and falls back to DM Sans without mutating
  state. Lora remains available when deliberately selected. Heading weights were
  tightened to 700 so hierarchy comes from readable scale/weight and the real blue
  locator rule, not a disconnected serif voice. No markup, copy, focus owner,
  layout, route, field, schema/import byte, stable ID, permission, host access,
  network boundary, or fake state was added.

  The first-red core visual contract failed because `dm` was not shared. Green
  checks cover all font IDs, display/metadata roles, every core selector, and popup
  application/fallback. Fresh current-source evidence measures DM Sans headings at
  1280×720 and 800×720 new-tab plus 420×590 and 420×520 popup, no horizontal
  overflow, a retained 386×50 px primary Save, and visible native keyboard focus.
  All 38 JavaScript syntax files and all 29 documented deterministic/stress runners
  pass, including 10,000 concurrency schedules (69,880 attempts). `git diff
  --check` and all 10 untracked-file whitespace scans pass. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.** Direct HTTP lacks
  extension storage; installed populated states/font persistence, real data, native
  screen-reader/forced-color output, zoom, owner approval, representative-user
  comprehension, and release remain open.

- **2026-08-12 — Keep the Home recovery route visible through the medium desktop
  range.** Home previously changed from a compact one-row Trail at 1101 px to a
  fully stacked route at 1100 px. That one-pixel cascade jump added more than 220 px
  of vertical weight and displaced Inbox below the 720 px activation viewport.
  Inspection also corrected a misleading reference assumption: a real first
  Workspace already stores the Opened Tabs rail collapsed, so the expanded
  storage-less localhost shell was not authority for changing user preference.

  From 901 through 1100 px, Trail is now a two-row filing route rather than either
  extreme. The recovered record leads to its exact destination through the existing
  vertical cobalt locator while Open/Details remain in a stable adjacent action
  column. The next tab and save destination follow the same two-row rhythm beside
  the existing Save consequences. Above 1100 px the wide one-row ledger remains;
  at 900 px and below controls retain the safe single-column stack. This uses named
  grid areas without CSS `order`, so reading and keyboard order remain the real DOM
  transaction. Empty recovery, dark tokens, focus, reduced motion, forced colors,
  locale copy, and behavior are unchanged.

  The first-red Home Trail contract stopped on the absent medium projection. Green
  checks freeze both route maps, every existing child mapping, and the 2×28 px
  locator. A removed current-source reference measured a 285.5 px Trail at
  1280×720, 351 px at 1100×720, and 350.5 px at 901×720; Inbox ended at 519.5,
  585, and 703.6 px respectively, with no horizontal overflow. Locus Dark retained
  the medium hierarchy. All 38 JavaScript syntax checks and all 29 documented
  deterministic/stress runners pass, including 10,000 concurrency schedules
  (69,880 attempts). **Implemented: yes. Verified: partial. User-validated: no.
  Released: no.** The 800 px source reference still exposes excessive unused work-
  area width and a below-fold Inbox; installed populated pixels, real browser state,
  native accessibility, owner approval, representative-user comprehension, and
  release remain open.

- **2026-08-12 — Spend the 800 px work area on the filing route, not empty canvas.**
  Home's narrow desktop state was not merely a breakpoint problem. A late shell
  token restored the 216 px registry and the Home board shrink-wrapped around auto
  margins, leaving a roughly 332 px Trail inside a substantially wider main area.
  Exact English consequence copy exposed a second structural defect: its intrinsic
  action track could take about 513 px and collapse the reviewed tab to zero.

  At 900 px and below, the registry now uses the established 188 px compact width
  and Home owns the full remaining main area. The two-row filing route reaches down
  through 761 px, while 760 px and below still stacks for safety. A 310 px action
  track keeps the two existing Save consequences intact and makes the candidate/
  destination the flexible side; the helper wraps inside that track instead of
  defining it. This preserves the Locus Index hierarchy—registry, cobalt locator,
  warm record, green accepted state—without adding a mobile shell, hiding the Space
  registry, changing user rail preferences, or inventing another control pattern.

  Three first-red checks rejected the absent 761–1100 projection, the unbounded
  intrinsic track, and an undersized 220 px action lane. A removed exact-copy
  production-CSS reference measured English/light 800×720 at registry/Home 188/612
  px, candidate/actions 202/310 px, Trail 326.5 px, and Inbox bottom 673.6 px;
  native zh-TW/Locus Dark placed Inbox bottom at 681.6 px. The 1100/901/761 px Inbox
  bottoms are 585/703.6/692 px with no horizontal overflow; 1280 remains one row
  and 760 resumes the stack. All 38 JavaScript syntax checks and all 29 documented
  deterministic/stress runners pass, including 10,000 concurrency schedules
  (69,880 attempts). **Implemented: yes. Verified: partial. User-validated: no.
  Released: no.** Installed MV3 real-data pixels, actual preference/theme/locale
  switching, native assistive technology, zoom/history/reload, owner approval,
  representative-user comprehension, and release remain open.

- **2026-08-12 — Make every shared action menu feel attached to the filing
  system.** The menu was behaviorally stronger than it looked. It already owned
  wrapped keyboard navigation, Escape cleanup, and opener return, but still appeared
  as translucent floating glass with spring motion, soft rounded rows, weak focus,
  and English-only structure. Across Home/Inbox, Board/List records, Group/Stack
  controls, Library, and layout switching, that one primitive made the product look
  like several unrelated prototypes.

  The retained action model now wears the same language as the records it controls:
  one flat theme-native sheet, a 3 px cobalt top locator, 40 px rows, compact mono
  section labels, and a locator edge that follows pointer or keyboard focus beside a
  full 3 px outline. The sheet is bounded to 220-320 px and the viewport, scrolls
  when necessary, removes blur and ornamental entrance motion, and maps to
  Canvas/Highlight in forced colors. Danger stays a red label/locator rather than a
  theatrical full-red hover slab. This is a small filing index, not a detachable
  glass card.

  Menu, section, and layout names now resolve through independent English/native
  zh-TW copy. Board and List remain the immediate choices; Canvas, Explorer,
  Timeline, Gallery, and Graph remain under Advanced views. The command palette
  reuses those names, but its own glass shell and the duplicated hardcoded shortcut
  reference remain the next bounded convergence slice. The first contract failed on
  the absent viewport-bounded sheet; all 38 syntax files, all 29 runners,
  `git diff --check`, and 10,000 concurrency schedules later pass. Browser policy
  rejected the temporary local presentation reference before rendering, so no pixel,
  installed, assistive-technology, user-validation, approval, or release claim is
  made. **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-12 — Make command discovery read like one index, not three shortcut
  prototypes.** The command palette already contained the right actions and strong
  keyboard mechanics, but its blurred scrim, springing rounded panel, framed input,
  and mixed row heights read as a detachable launcher. Settings and the keyboard
  reference then repeated the same commands as separate hardcoded English lists.
  The result looked less trustworthy precisely where a user asks Locus, “What can I
  do from here?”

  Command discovery now has one visual and copy owner. A dark registry header makes
  the query unmistakable; the flat paper result index beneath it uses 44 px rows and
  a moving cobalt locator plus a full focus outline. The shortcut dialog uses the
  same dark-header/paper-index grammar, while Settings keeps the same rows inside its
  numbered control ledger. Blur, spring entrance, floating inner cards, shadowed
  keycaps, and mixed 39 px density are gone. Narrow windows remove descriptions
  before they compromise action/key scanning; reduced motion and forced colors keep
  the same hierarchy rather than introducing a second style.

  One immutable localized model now projects the real commands into Settings and
  the compact reference. Chrome-assigned key strings still replace defaults when
  available; loading, unavailable fallback, and an assigned command with no key are
  stated honestly. Browser descriptions never override Locus copy. English and
  native zh-TW resolve when each surface renders or the locale changes. The palette
  retains its combobox, Arrow/Home/End/Enter, contained Tab, LIFO Escape, opener
  return, command order, and real actions; the dialog retains contained Tab and its
  existing dismissal/focus contract. No new command, onboarding layer, route, state,
  Advanced-layout promotion, schema/import change, permission, or fake populated
  example was introduced.

  The first public contract failed on the missing no-blur/no-animation Locus Index
  rule. Green production-extracted checks cover the 14 app, 13 reference, and 2
  browser projections; unique IDs; live custom-key replacement; localized **Not
  set**; render-time locale changes; and definition immutability. All 38 JavaScript
  syntax files, all 29 deterministic/stress runners, `git diff --check`, and 10,000
  concurrency schedules pass. Installed MV3 was unavailable, and the existing
  browser security policy forbids bypassing its rejected local presentation route,
  so real pixels, customized Chrome keys, native assistive technology, user
  validation, approval, and release remain open. **Implemented: yes. Verified:
  partial. User-validated: no. Released: no.**

- **2026-08-12 — Make every save and recovery outcome read like a filed receipt.**
  The product's most repeated trust signal still looked like prototype toastware:
  a rounded green floating card, spring/scale entrance, one polite status role, no
  Close control, and a timer that removed Undo or destination continuations while
  they were still useful. Core storage, Archive, intention, bookmark, export, and
  capture messages also mixed localized copy with hardcoded English.

  The existing global host now reads as a small Locus Index filing receipt: flat
  theme-native paper, restrained elevation, one 4 px locator whose status color has
  a matching non-color mark, a readable message lane, and native 40 px action,
  Undo, and Close controls. Success, information, warning, and error share one
  grammar. At 520 px the message and Close remain the first row while actions become
  a deliberate full-width second row. There is no spring, scale, blur, pill, or
  ornamental motion; reduced motion and forced colors keep the same hierarchy.

  Behavior now matches that visual promise. Errors alone announce assertively.
  Valid actions and exact Undo receipts do not expire; only passive feedback may,
  and focus or pointer reading holds it. Feedback never steals focus. Native Close
  and receipt-focused Escape dismiss one receipt and return to its connected opener
  without closing an underlying surface. Touched core copy resolves independently
  in English and native zh-TW, and uncertain-but-accepted outcomes use warning
  semantics. Save receipts, Undo IDs and callbacks, persistence, routes, state,
  schema/import bytes, permissions, and browser effects are unchanged; no stored
  feed or notification center was added.

  The first public contract failed on the missing localized Close control. Focused
  production-extracted controller, syntax, CSS, locale, and dependent-flow checks
  pass, followed by all 38 JavaScript syntax checks, all 29 documented runners,
  `git diff --check`, and 10,000 concurrency schedules (69,880 attempts). Installed
  MV3 and the policy-blocked local presentation route remain unavailable, so real
  pixels, native assistive technology, asynchronous post-Undo focus after rebuild,
  theme/locale switching, exact responsive geometry, representative-user approval,
  and release remain open. **Implemented: yes. Verified: partial. User-validated:
  no. Released: no.**

- **2026-08-12 — Make a rejected local write look recoverable, not mysterious.**
  Storage-full was the moment when Locus most needed to earn trust, yet it still
  appeared as a generic English modal with a vague capacity line and three similarly
  weighted actions. It did not clearly distinguish the change still visible on the
  page from the latest copy actually accepted by browser storage, and Export had no
  visible pending or settlement ownership.

  The recovery surface is now a compact Locus Index capacity docket. A dark registry
  header names the local-storage boundary; a 6 px red locator marks the rejected
  write; a real capacity ruler reports browser-profile usage when available; blue
  guidance connects backup to the next safe decision; and the paper footer leads
  with Download backup before either reload consequence. At 520 px those actions
  become one readable column. The sheet uses 44 px controls, restrained elevation,
  no blur or entrance animation, product typography for explanation, Geist Mono for
  exact capacity, and explicit reduced-motion and forced-color equivalents.

  The hierarchy is behavioral as well as visual. Backup serializes the current
  in-memory graph—the potential only copy of the rejected change—and claims only
  that a download was requested. Pending blocks duplicates, dismissal, Escape, and
  reload. Closing the quota layer while fail-closed recovery remains visible focuses
  its Reload control instead of returning to inert editable UI. Known, unavailable,
  pending, success, failure, Archive-unavailable, and reload-failure states resolve
  independently in English and native zh-TW. No retry, deletion, quota increase,
  schema/import, permission, route-model, or storage behavior was added.

  The first public contract failed on the missing atomic described recovery dialog.
  Focused production-extracted controller, syntax, CSS, locale, recovery-layer, and
  dependent item-detail checks pass, followed by all 38 JavaScript syntax files, all
  29 documented runners, `git diff --check`, and 10,000 concurrency schedules
  (69,880 attempts). Installed MV3 and the policy-blocked local presentation route
  remain unavailable, so real quota/download completion, pixels, native
  assistive technology, exact responsive geometry, representative-user approval,
  and release remain open. **Implemented: yes. Verified: partial. User-validated:
  no. Released: no.**

- **2026-08-12 — Give local storage two honest rulers.** Settings used to place one
  browser-profile number beside colorful per-type estimates without explaining that
  they came from different authorities. Archive, empty, and failure copy was also
  assembled in English at runtime, so the local-first safety story weakened exactly
  where a user checks whether a backup is needed.

  Storage now begins with one exact browser capacity docket: a named native ruler,
  explicit browser-profile scope, restrained state underline, real 0/limit endpoints,
  and a native Check again action. Archive & recovery follows as a consequence row,
  then a separately titled estimate register ranks only current Locus JSON data. A
  single blue locator shows relative weight; non-color labels carry the meaning.
  Rainbow dots, ornamental dashboard cards, fake cloud/account/history states, and
  invented capacity stay out. Existing warm stock, dark registry, cobalt locator,
  green accepted signal, product typography, and Geist Mono metadata remain the one
  design language. At 620 px, status, action, totals, and rows stack without turning
  into a second mobile dashboard.

  Behavior matches the distinction. Exact usage is generation-guarded across loading,
  known, warning, full, unavailable, and retry states. The estimate measures UTF-8
  bytes from real state, partitions its total exactly, avoids double-counting Stack
  children, and keeps Archive and Trash separate. English and native zh-TW repaint
  every live state without moving focus; native names, reduced motion, and forced
  colors preserve the same hierarchy. Archive routing, quota recovery, storage,
  export/import bytes, schema, stable IDs, permissions, privacy, and user data did
  not change.

  The first public contract failed on the missing localized native exact-usage meter.
  Focused production-extracted model, painter, generation, renderer, locale, empty,
  and focus checks pass, followed by all 38 JavaScript syntax files, all 29 documented
  runners, `git diff --check`, and 10,000 concurrency schedules (69,880 attempts).
  Installed MV3 and the policy-blocked local presentation route remain unavailable,
  so real browser quota/retry timing, pixels, native assistive technology, exact
  responsive geometry, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Make duplicate policy independent of the drag shortcut.** A user
  who allows duplicate URLs is preserving separate contexts, even when those
  contexts share an address. Silently dropping one during drag makes a convenience
  gesture less trustworthy than the adjacent Save buttons.

  Space, Group, and Stack drops now use the same duplicate decision as other
  capture paths. Allowed copies retain distinct collision-safe identities and exact
  destination receipts; enabled deduplication retains the existing no-write result.

  No new surface, copy, style, schema, permission, or network path was added. A
  production-caller allow/block case plus syntax, quality, and diff gates pass.
  Installed native drag, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Give palette Save a real page to act on.** The active tab while a
  person uses Locus is Locus. A command that queries that tab and then rejects it
  is decorative chrome, not a shortcut.

  Palette Save now uses a fresh current-window inventory and the established recent
  eligible-page selector, then enters the same Inbox receipt flow. English and
  native zh-TW name the recent-page behavior directly; unavailable inventory keeps
  one existing recovery message.

  No new surface, style, key, schema, permission, or network path was added. A
  production-caller success/unsupported/read-failure case plus syntax, quality, and
  diff gates pass. Installed Chrome ordering, rendered focus/receipt behavior,
  representative-user approval, and release remain open. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Treat the current popup batch as part of its destination.** A
  duplicate preference that sees yesterday's records but not the record accepted
  one loop iteration ago produces noisy receipts and Find results.

  Save-before-Hibernate and Links/Queue now reserve each accepted exact URL while
  filtering the batch. Allowing duplicates keeps every source; fresh Session mode
  preserves its one-item-per-source cleanup identity. Deduplicated records do not
  remove exact source descriptors from guarded cleanup.

  No new surface, copy, style, schema, permission, or network path was added.
  Focused popup caller cases plus syntax, quality, and diff gates pass. Installed
  duplicate-tab effects, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Apply the same current-batch rule inside existing Groups and
  Stacks.** Selecting or dragging two same-URL pages should not bypass a preference
  merely because both arrived before the destination rendered again.

  Existing-Group selection and Group/Stack drop now reserve each accepted exact URL
  during the action. Allowing duplicates keeps every source, while fresh generated
  Groups retain their complete-snapshot semantics.

  No new surface, copy, style, schema, permission, or network path was added. A
  production existing-Group case, shared-filter and drop-source assertions, syntax,
  quality, and diff gates pass. Installed drag/selection, representative-user
  approval, and release remain open. **Implemented: yes. Verified: partial.
  User-validated: no. Released: no.**

- **2026-08-13 - Make Group Save-here more than a selected-tab-only affordance.**
  The active page inside Locus is Locus, so falling back to it made three visible
  Group controls deterministically refuse the ordinary no-selection case.

  Save-here now prioritizes explicit eligible selection, then reads the fresh
  window and chooses the most recent stable eligible browser page. English and
  native zh-TW state that exact fallback; the existing Group receipt and source
  protection own the consequence.

  No new surface, style, key, schema, permission, or network path was added. A
  production caller success/unsupported/read/drift boundary plus syntax, quality,
  and diff gates pass. Installed browser ordering, rendered focus/receipt behavior,
  representative-user approval, and release remain open. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Keep unsupported popup pages alive.** A green Save result is not
  useful when the recorded address cannot be reopened and the original page is then
  closed or replaced.

  Popup discovery and every single, window, Hibernate, and bookmark write/effect
  boundary now use one positive reopenable-URL rule. Excluded pages do not become
  records or cleanup targets; existing records remain untouched.

  No new surface, copy, style, schema, permission, or network path was added.
  Focused production-writer cases plus syntax, quality, and diff gates pass.
  Installed browser effects, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Do not paint a stale first-save route green.** An acknowledged
  local write and its current filing projection are separate truths. Home and
  Welcome previously treated accepted persistence as proof that the reviewed Inbox
  still existed unchanged.

  The shared Save now exposes destination confirmation only to those two handoff
  controllers. Home suppresses the old-path state; Welcome closes as complete but
  does not navigate or focus through that path. The existing warning, Undo, and
  source consequence remain the only feedback.

  No new surface, copy, style, schema, permission, or network path was added.
  Focused production-writer/Home/Welcome cases plus syntax, quality, and diff gates
  pass. Installed interleaving, representative-user approval, and release remain
  open. **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Let selection Open make a truthful promise.** An enabled Open
  action must correspond to at least one page the shared Reopen boundary can
  actually recover.

  Unsafe-only selections now reuse the existing disabled state and explanation.
  Mixed selections keep the established partial recovery; retained records remain
  visible and unchanged.

  No new surface, copy key, style token, schema, permission, migration, or network
  path was added. Focused Reopen, selection-docket, syntax, quality, and diff gates
  pass. Installed DOM/AT, real Chrome effects, representative-user approval, and
  release remain open. **Implemented: yes. Verified: partial. User-validated: no.
  Released: no.**

- **2026-08-13 - Make Open destination visually arrive.** Routing to the correct
  Group is not enough when the exact Stack remains clipped behind collapsed
  ancestors.

  The receipt continuation now reuses the existing quiet search reveal across the
  exact outer-to-inner Stack path, then focuses the leaf. This is transient DOM
  state: the user's saved layout and history remain untouched.

  No new surface, copy key, style token, schema, permission, migration, or network
  path was added. Focused onboarding, syntax, quality, and diff gates pass.
  Installed rendering/focus, representative-user approval, and release remain
  open. **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Let Search print the complete filing label.** A page nested under
  Stacks should not lose those folder names when the user is deciding which Search
  result to reopen.

  Search now appends its already-frozen parent Stack names to the shared visible
  and accessible destination path. Root-level paths, identity, routes, and Reopen
  remain unchanged.

  No new surface, copy key, style, schema, permission, migration, or network path
  was added. Focused Search, syntax, quality, and diff gates pass. Installed
  rendering/AT, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Keep the first-save guide pointed at unfinished work.** Welcome
  should not advertise a page already filed by popup or context-menu capture while
  another unsaved page is available.

  Welcome now shares the Home/top-bar/Palette candidate policy: apply the exact
  active-Inbox duplicate preference, rank recent eligible pages, then freeze the
  displayed source for activation-time recheck.

  No new surface, copy key, style, schema, permission, migration, or network path
  was added. Focused onboarding, syntax, quality, and diff gates pass. Installed
  ordering/effects, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Let every recent-Save shortcut find useful work.** A prominent
  Save shortcut should not stop on a page already filed in Inbox while an older
  unsaved page is waiting in the same window.

  Top-bar and Palette Save now use the Home card's existing candidate policy:
  apply the exact Inbox duplicate preference, then rank recent eligible pages.
  Review, receipts, and source protection remain unchanged.

  No new surface, copy key, style, schema, permission, migration, or network path
  was added. Focused onboarding, syntax, quality, and diff gates pass. Installed
  ordering/effects, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Make one duplicate preference reach inside Stacks.** A nested
  Stack should organize saved pages, not make an already-filed page invisible to
  the user's Skip duplicate URLs choice.

  Home, Board/List, drag-and-drop, popup, Hibernate, context-menu, and shortcut
  capture now inspect nested pages only inside the exact destination. Traversal is
  cycle-safe; allowing duplicates, exact receipts, and source protection remain
  unchanged.

  No new surface, copy key, style, schema, permission, migration, or network path
  was added. Focused new-tab, popup, background, syntax, quality, and diff gates
  pass. Installed effects, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Make Save here continue to the next useful page.** A recent page
  already filed in the chosen Group previously blocked an older unsaved page and
  forced a manual Opened-Tabs selection.

  The same action now applies the user's duplicate policy before recent-page
  ranking. It files the most recent unsaved candidate while preserving explicit
  selection, exact receipt, and source protection.

  No new surface, copy key, style, schema, permission, migration, or network path
  was added. Focused onboarding, quality, and diff gates pass. Installed tab
  ordering/effects, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Let Open all look actionable only when it is.** The default empty
  Inbox and local-record-only Groups previously carried a prominent action that
  could never fulfill its label.

  Board and List preserve their quiet, stable action geometry but natively disable
  Open all without an eligible page; contextual menus remove that impossible
  choice. Nested safe pages restore the action, while exact bulk Reopen remains the
  effect owner.

  No new surface, copy key, component, schema, permission, migration, or network
  path was added; the existing buttons gained one restrained disabled state.
  Focused Reopen, onboarding/UI, quality, and diff gates pass. Installed
  rendering/keyboard/AT, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Give the first filing cabinet four dependable labels.** The
  automatic Workspace, Pinned, Inbox, and Later records previously accepted raw
  generated IDs, including values retained elsewhere or repeated in the same
  constructor.

  The first-use constructor now shares one collision-safe allocator across all four
  records. Existing names, symbols, active pointers, layout, and onboarding remain
  unchanged.

  No new surface, copy key, style, schema, permission, migration, or network path
  was added. Focused state-sync, quality, and diff gates pass. Installed first-run,
  representative-user approval, and release remain open. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Give every new local record one durable filing identity.** Notes
  and To-dos previously used a raw generated ID even though their receipt and
  Details route require global uniqueness.

  The shared Board/palette creator now skips active and retained identities before
  mutation, persists one exact object, and opens that same record in Details only
  after acknowledgement. Allocation failure uses the existing recovery and writes
  nothing.

  No new surface, copy key, style, schema, permission, migration, or network path
  was added. Focused onboarding, quality, and diff gates pass. Installed rendering/
  persistence, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Remove an obsolete path when Locate loses the target.** A Saved
  card must not repeat the reviewed Space/Group after current worker authority says
  the exact item is unavailable.

  The target-unavailable result now leaves the destination line blank and reuses
  the existing destination-unconfirmed message plus generic Open Locus. Persistence
  stays accepted, and the source/popup stay open without another write or effect.

  No new surface, copy key, style, schema, permission, or network path was added.
  Focused popup, quality, and diff gates pass. Installed rendering/ordering,
  representative-user approval, and release remain open. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Keep the Saved receipt when Locate cleanup fails.** Opening the
  exact saved item did not guarantee that the requested source close finished, but
  the prior full-success receipt closed the popup and hid that distinction.

  Locate now returns a typed partial with current destination/route authority and
  the native-notice outcome. The popup reuses its existing Saved card and exact
  recovery action, while the source stays open and the accepted Save is never
  retried.

  No new surface, copy key, style, schema, permission, or network path was added.
  Focused popup/background, quality, and diff gates pass. Installed rendering and
  notification timing, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Remove obsolete paths from whole-window receipts.** A Saved card
  that says the destination is unavailable must not also print its old Space/Group
  label.

  Whole-window results now render the filing path only from a validated current
  worker receipt. Unavailable and unknown results keep the existing safe recovery
  action with a blank path.

  No new surface, copy, style, schema, permission, or network path was added.
  Focused popup, quality, and diff gates pass. Installed rendering,
  representative-user approval, and release remain open. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Keep the source when its accepted filing disappears.** Ordinary
  popup Save previously checked only the live tab before closing it, so a later
  Locus write could remove the accepted copy first.

  Close-enabled Save now delegates to the serialized worker, which fresh-confirms
  both the saved item and source before removal. Missing destination, protected
  source, or unknown effect reuses the existing Saved recovery card and leaves the
  page open; close-off stays quiet.

  No new surface, copy key, style, schema, permission, or network path was added.
  Focused popup, syntax, quality, and diff gates pass. Installed timing,
  representative-user approval, and release remain open. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Keep imported bookmark identities exact.** Importing a page with an
  ID already owned or retained elsewhere can make Find and Reopen ambiguous even
  when the write itself succeeds.

  Import Bookmarks now shares one collision-safe allocator across the created Group
  and every accepted page. Active entities and retained restore/layout/Capture
  destinations stay reserved; existing records are not migrated or rewritten.

  No new surface, copy, style, schema, permission, or network path was added. A
  forced retained-ID collision plus scale, compatibility, semantic fuzz, syntax,
  quality, and diff gates pass. Installed bookmarks, representative-user approval,
  and release remain open. **Implemented: yes. Verified: partial. User-validated:
  no. Released: no.**

- **2026-08-13 - Keep dead addresses out of bookmark import.** A successful import
  that fills Search with records the Open action cannot use adds cleanup work instead
  of saving it.

  Settings bookmark import now shares the saved-page Reopen allowlist. Supported
  browser URLs retain their exact value; scripts, inline/blob data, mail actions,
  internal pages, and malformed values create no record and add nothing to the
  receipt count.

  No new surface, copy, style, schema, permission, or network path was added. A
  mixed production-import case plus scale, compatibility, semantic fuzz, syntax,
  quality, and diff gates pass. Installed bookmarks, representative-user approval,
  and release remain open. **Implemented: yes. Verified: partial. User-validated:
  no. Released: no.**

- **2026-08-12 — Make local data transfer read in the safe order.** Settings Data
  treated Export, JSON restore, bookmarks, and pasted links as an undifferentiated
  button pile—and put incoming mutation before the backup that makes recovery
  trustworthy. Its styled file label was not a native keyboard control, while the
  review still spoke the older rounded modal language.

  Data now reads top to bottom as a physical transfer ledger. The outbound sheet is
  first: dark profile direction rail, warm paper, live Workspace/item/UTF-8 scope,
  one dominant Download JSON backup, and the honest limitation that Locus cannot
  confirm the browser saved the file. The inbound sheet uses one native Choose JSON
  backup button and visible file state. Bookmarks and pasted links sit in a quieter
  “Other sources” row because they add records rather than restore the full profile.

  Review is a flat backup manifest, not generic modal glass: dark registry header,
  6 px cobalt locator, exact file/date/schema rows, balanced real-data counts,
  consequence-first Replace/Merge records, 44 px actions, sharp restrained radii,
  no blur or ornamental entrance. At 520 px counts and actions become one column;
  reduced motion and forced colors keep the same hierarchy. English and native
  zh-TW were authored independently under the product terminology boundary.

  Behavior now earns the visual promise. File reads expose localized loading,
  failure, reselectable, ready, canceled, blocked, and completed states. Review
  owns Tab, LIFO Escape, opener return, upper-recovery precedence, and one pending
  interlock; it closes only after accepted persistence. Replace still requests the
  exact current backup before mutation and then focuses Home; Merge returns to the
  chooser. Bookmark import freezes and re-resolves its exact Space across the
  browser read, waits for the storage receipt, rolls back rejection, and exposes
  exact Undo only after acknowledgement. Payloads, schemas 0–12, accepted legacy
  envelopes, validation, routes, permissions, local-only privacy, stable IDs, and
  imported bytes remain unchanged. No cloud, account, encryption, scheduling,
  history, or invented format was added.

  The first public contract failed on missing backup-first/native-button structure.
  Focused production-extracted FileReader, review-controller, bookmark-receipt,
  scale/compatibility, locale, CSS, and quality checks pass, followed by all 38
  JavaScript syntax files, all 29 documented runners, `git diff --check`, and 10,000
  concurrency schedules (69,880 attempts). Installed MV3 and the policy-blocked
  presentation route remain unavailable, so real chooser/download/bookmark/import
  effects, pixels, native assistive technology, exact responsive geometry,
  representative-user approval, and release remain open. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.**

- **2026-08-12 — Make Capture settings read like a save contract, not a demo.** The
  page that decides where tabs go still showed a fake Page title, example.com, a
  decorative three-step strip, and reassuring fallback copy that did not match the
  fail-closed capture engine. Worse, destination and toggle changes wrote in the
  background and could announce success before browser storage acknowledged them.

  Capture now begins with one physical transaction: Source tab → confirmed local
  copy → source after receipt. A dark registry heading names the contract. Warm
  paper holds three flat records; cobalt marks source and travel, green is reserved
  for the confirmed local copy, and the final rail states Close or Keep. Product
  typography carries the consequence; Geist Mono carries exact destination,
  metadata, duplicate, and status facts. The route stays horizontal through the
  800 px Settings layout and becomes vertical at 620 px. Restrained 3–4 px radii,
  explicit focus, no blur, no fake populated state, and no ornamental animation
  keep it part of Locus Index rather than another settings prototype. Reduced-motion
  and forced-color modes preserve the same hierarchy.

  Every visible fact is real. The route reads the current remembered Group, fixed
  default Space, or active Space using the same order as capture. Duplicate, moved,
  malformed, or ambiguous identities and multiple Inbox Groups become visibly
  unavailable; Locus neither guesses nor silently repairs them. Popup choice,
  quick-save fallback, title/favicon record, duplicate rule, and source-tab effect
  repaint from the current settings. English and native zh-TW were authored as
  separate interface copy, with the Taiwanese version leading with consequence and
  recovery rather than mechanically mirroring English.

  Preference behavior now earns the transaction language. One select or checkbox
  owns one allowlisted patch and one awaited storage receipt. The initiating control
  retains focus; every other Capture control, Settings section, Close action, Escape,
  and lower shortcut waits, while Tab remains inside Settings. A rejected or drifted
  acknowledgement never becomes success and yields to the established authoritative-
  reload recovery. Explicit destination and remembered-target clearing share one
  write. No-op or invalid patches write nothing. Existing capture effects, source-
  close guards, IDs, setting bytes/defaults, schema/import compatibility, routes,
  permissions, and local-only privacy did not change.

  The first public contract failed on the absent real policy route. Focused static
  and production-extracted checks now cover IDs, semantics, English/native zh-TW,
  exact destination models, graph immutability, ambiguous and stale truth, accepted/
  rejected/drift receipts, pending focus and dismissal, responsive CSS, reduced
  motion, forced colors, and removal of the preview/step residue. All 38 JavaScript
  syntax files, all 29 runners, `git diff --check`, and 10,000 concurrency schedules
  pass (69,880 attempts). Installed MV3 and the policy-blocked presentation route
  remain unavailable, so real preference effects, popup/shortcut/context-menu
  coupling, pixels, native assistive technology, exact responsive geometry, live
  theme/locale/reload behavior, representative-user approval, and release remain
  open. **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 — Make Appearance a small core with optional styling, not a
  specimen wall.** The prior page gave seventeen themes, eight individually styled
  fonts, width, density, URLs, Motion, and a cycling action equal weight. The owner
  clarified the governing direction during this cycle: do not copy preview
  references; make the real interface clean and easy to use, with extras available
  as plugins. Those previews were discarded as design input.

  The core now has three flat ledger rows: System/Locus Light/Locus Dark, item size,
  and card details. Warm stock, dark registry labels, one cobalt locator, green
  acknowledged receipts, 2-4 px radii, native named controls, and visible focus keep
  it in the same Locus Index language as the rest of Settings. The theme-cycling
  shortcut, pointer-only specimen tiles, inline font styling, marketing blurbs,
  gradient/lift/scale decoration, and ornamental spin are gone. Rows stack at
  800 px; choice grids become one column at 620 px. Motion-off, reduced-motion,
  forced-color, English, and native zh-TW variants preserve the hierarchy.

  Fifteen existing themes, eight bundled fonts, and column width remain compatible
  inside one native Style-plugin disclosure. Available/Active is derived from real
  theme/font/width values; there is no account, marketplace, remote download, or
  fictional installed state. Use core defaults resets only those optional values,
  preserving size, URLs, Motion, saved content, and every unrelated preference.

  Every Appearance activation now owns one allowlisted patch and one awaited storage
  receipt. It previews immediately, keeps the initiating focus owner, and shares the
  Settings pending interlock with Capture. Duplicate input, section changes, Close,
  Escape, Back/Forward, and lower shortcuts wait while Tab stays trapped. Rejection,
  existing recovery, graph adoption, or value drift never becomes a saved state and
  yields to authoritative recovery. Existing stored IDs/values, aliases, theme
  files, prepaint/popup behavior, schema/import bytes, permissions, routes, and
  local-only privacy remain intact.

  Focused static and production-extracted checks cover containment, projection,
  receipt ordering, failure/drift/adoption, reset scope, focus, locale, responsive
  CSS, Motion-off, reduced motion, and forced colors. One uninterrupted pass covers
  all 39 JavaScript syntax files and all 30 runner commands; concurrency completes
  10,000 schedules (69,880 attempts), and `git diff --check` passes with existing
  line-ending warnings. Installed MV3/presentation access remains unavailable, so
  real persistence, OS-theme response, prepaint/popup coupling, pixels, native
  assistive technology, exact responsive geometry, representative-user approval,
  and release remain open. **Implemented: yes. Verified: partial. User-validated:
  no. Released: no.**

- **2026-08-13 — Make extras read as available plugins, not a second product.**
  The Plugins entry still presented eight packaged research tools as a colorful
  mini-app marketplace: emoji tiles, bespoke gradients, soft blur, rounded cards,
  hover lift/scale, hardcoded English, and copy telling people to turn tools on.
  None of that matched reality. The tools were already local and opened directly;
  there was no install, enable, catalog, account, or download model. The owner had
  also made the visual authority explicit: design the clean real interface, not a
  preview imitation.

  Plugins now reads as one optional registry inside the established Locus Index
  system. A dark registry header names the boundary; a warm paper note states where
  plugin data lives; eight flat rows use compact mono plug-slot codes, plain names
  and descriptions, a neutral Available label, one Open action, and a single cobalt
  hover/focus locator. The panel uses 3-8 px radii and no glass, gradient, emoji,
  lift, scale, or entrance animation. Two columns keep the 1280/800 px view compact;
  one internally scrolling column keeps 620/520 px readable. Product Motion-off,
  reduced motion, forced colors, English, and native zh-TW retain the hierarchy.

  The presentation is deliberately not an enablement system. One immutable
  allowlist maps the existing Pomodoro, Finance, Subscriptions, Habits, Hydration,
  Reading, Goals, and Workouts IDs to their real openers. Unknown or hidden
  activation does nothing. The hub refuses active state recovery and duplicate
  opening, owns a balanced background inert/scroll lock, traps Tab, handles Escape
  locally, and restores its explicit More/app opener. Tool activation releases the
  hub first and restores that visible app control before the existing tool dialog
  records focus, so closing a tool cannot target a hidden plugin row.

  The eight tool interiors, their data fields, real empty/data behavior, floating
  widgets, schema/import envelopes, stable IDs, routes, permissions, zero host
  permissions, and local-only privacy remain unchanged and contextual. No tracker
  entered the core save -> locate -> recover flow or initial Store feature scope.
  Focused DOM/source/CSS/i18n and production-extracted tests cover exact inventory,
  semantics, locale, recovery, inertness, scroll balance, routing, focus, responsive
  CSS, Motion-off, reduced motion, and forced colors. One uninterrupted complete
  pass covers 40 JavaScript syntax files and 31 runner commands; concurrency
  completes 10,000 schedules (69,880 attempts). Installed pixels, native assistive
  technology, exact geometry, tool interiors, representative-user approval, and
  release remain open. **Implemented: yes. Verified: partial. User-validated: no.
  Released: no.**

- **2026-08-13 — Make General about real recovery preferences, not a local
  Profile.** The pane still carried preview-derived product assumptions: a Profile
  card, “Your name,” a greeting promise, three equal Behavior controls, inline
  spacing, and an ornamental guide icon. Its language, Hibernate, window-switch,
  Welcome, and greeting-name paths also used fire-and-forget persistence, allowing
  the interface to change before browser-profile storage acknowledged the setting.

  General now reads as one ordered Locus Index preference ledger. Interface
  language, saved-page opening, and the first-save guide are the small core. Native
  controls, 44–54 px rows, quiet sheet/paper stock, one cobalt locator, one green
  receipt, 3–6 px radii, and explicit names replace the mixed card pile. Rows stack
  at 800 px; the greeting field and action stack at 620/520 px. Product Motion-off,
  reduced motion, forced colors, English, and independently authored native zh-TW
  preserve that hierarchy. No preview supplied layout or copy authority.

  Existing browser-window switching and the alternate clock-and-search Welcome
  screen remain compatible inside one native Workspace-extras plugin. Its
  Available/Active state derives only from the two real stored booleans. The
  retained greeting name is described as an optional Welcome-screen effect, saved
  explicitly, and preserves compatible profile fields; it no longer implies an
  account or user persona. No install, catalog, download, permission, network, or
  plugin state was added.

  Behavior now earns the receipt language. One allowlisted language, Hibernate,
  auto-switch, Welcome, or profile patch projects the real setting and awaits one
  `State.persistNow()` acknowledgement. The initiating control joins the existing
  Capture/Appearance Settings owner: duplicates, section changes, Close, backdrop,
  plugin collapse, Escape, Back/Forward, and lower shortcuts wait while Tab remains
  inside Settings. Invalid/no-op input writes nothing; rejection, existing
  recovery, graph adoption, owner replacement, or value drift never becomes
  success. Enter saves a changed greeting name; Escape first discards its draft.
  Stored keys/defaults, stable IDs, schema 12/import compatibility, placeholder and
  Welcome behavior, routes, permissions, zero host permissions, and local storage
  remain intact.

  A new static and production-extracted contract covers semantics/order, locale,
  exact keys, one receipt, pending focus, no-op/invalid input, compatible profile
  preservation, failure/recovery, drift/adoption, plugin projection, responsive
  CSS, Motion-off, reduced motion, forced colors, and removal of direct writers.
  One uninterrupted pass covers 41 JavaScript syntax files and 32 runner commands;
  concurrency completes 10,000 schedules (69,880 attempts). Installed persistence,
  pixels, native assistive technology, exact geometry, live placeholder/window/
  Welcome effects, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**
- **2026-08-13 — Make Privacy a fact ledger, not a trust badge.** The prior pane
  opened with a large shield, green checklist, “Privacy & Security,” and broad
  tracking language. Exact storage, permission, backup, and profile-loss limits sat
  underneath as secondary copy, while a fire-and-forget blur toggle appeared beside
  them as though display masking were a security property. The owner's current
  direction remains the authority: design the clean real interface without copying
  previews, and keep extra capabilities available as plugins.

  Privacy now uses one Locus Index fact docket. A dark registry header names the
  local-data boundary; four flat paper records state browser-profile storage,
  network-silent extension pages plus explicit saved-site navigation, the exact
  seven browser capabilities with zero host permissions, and manual JSON recovery
  before uninstall/profile loss. Backup is the leading action, with the existing
  honest note that Locus cannot confirm whether the browser finished saving the
  file. Warm stock, one cobalt locator, green only on Recovery, mono fact labels,
  3–4 px radii, native controls, and visible focus replace the badge/checklist
  language. The facts remain two columns through 800 px and become one at 620/520
  px; light/dark tokens, reduced motion, and forced colors retain the hierarchy.

  The compatible `blurPrivacy` setting now lives inside one native Screen-share-
  mask plugin. Available/Active derives from the real boolean—there is no install,
  catalog, account, download, remote request, or fictional plugin state. Copy names
  its actual consequences: supported saved titles/locations are obscured and capture
  notifications hide their destination. It explicitly says the mask does not
  encrypt, delete, or change saved data. Hover reveal and filter animation are gone,
  so screen sharing cannot expose a title merely because the pointer crosses it.

  Behavior now earns the saved state. One allowlisted boolean patch projects the
  mask immediately and awaits one `State.persistNow()` acknowledgement. The toggle
  joins General/Capture/Appearance as the fourth Settings focus owner: duplicate
  changes, section changes, Close, backdrop, plugin collapse, Escape, Back/Forward,
  and lower shortcuts wait while Tab stays in Settings. Invalid/no-op input writes
  nothing; rejection, existing recovery, graph adoption, settings-owner replacement,
  or value drift never becomes success. Stable IDs, compatible bytes/default,
  schema 12/imports, export and notification behavior, exact permissions, zero host
  permissions, `connect-src 'none'`, routes, and local-only storage remain intact.

  A new static and production-extracted contract grounds the visible facts in the
  manifest, CSP, and background receipt source and covers locale, semantics, visual
  hierarchy, focus, responsive CSS, reduced motion, forced colors, mask coverage,
  one receipt, pending/duplicate focus, failure/recovery, drift/adoption, and real
  plugin projection. One uninterrupted pass covers 42 JavaScript syntax files and
  33 runner commands; concurrency completes 10,000 schedules (69,880 attempts).
  Installed persistence, pixels, native assistive technology, exact geometry,
  download completion, notification masking, representative-user comprehension,
  approval, and release remain open. **Implemented: yes. Verified: partial.
  User-validated: no. Released: no.**

- **2026-08-13 — Make local records scan first and edit in one trusted sheet.**
  Note and To-do cards had accumulated three competing interaction languages:
  contenteditable text, slash mutations, and a separate anchored color palette,
  even though saved-item Details already owned an exact receipt-gated editor. That
  made a compact filing surface feel like a prototype workspace and weakened the
  answer to “where will this change be saved?”

  Cards now behave as records. One flat stock surface carries a mono type stamp,
  optional in-flow reminder, a 3 px compatible marker, a clamped readable excerpt,
  and one persistent 40 px More action. The excerpt itself is a native named route
  to Details, with an explicit empty state rather than an invisible editor. There is
  no glass, lift, scale, ink-drying, completion pop, or second palette. Board,
  focused Group, and List inherit the same hierarchy.

  Details is now the sole Note/To-do text and marker editor. Rich Note HTML retains
  sanitization, auto-linking, and Link-dialog focus ownership; To-do text stays one
  native field. A named roving marker radiogroup uses the six compatible choices.
  Imported custom bytes remain visible through a color-only property as a truthful
  selected, non-writing choice; merely viewing them cannot normalize stored data.
  Every explicit change uses the route-frozen detached-candidate receipt.

  Creation follows the same trust model. Board footer and command-palette Note/
  To-do actions freeze the exact Group item list, allocate one compatible record,
  await one whole-state acknowledgement, then reveal and focus the accepted Details
  field. The prior delayed write and dead inline-focus selector are gone. Pending
  creation retains its real opener and blocks duplicate, navigation, Escape, and
  conflicting local mutations; rejection or destination drift cannot expose a
  falsely accepted blank card.

  English and native zh-TW independently name Edit note, Edit to-do, Change marker,
  Record marker, and empty states. Light/dark, reduced motion, forced colors,
  1280/800/520 responsive rules, schema/import compatibility, stable IDs, local-only
  privacy, zero host permissions, and To-do completion recovery remain intact.
  Optional research tools remain Available/Open in Plugins and uneven layouts stay
  Advanced; this adds no feature surface. Deterministic verification is recorded in
  the current slice and status ledger. Installed pixels, native assistive technology,
  representative-user approval, and release remain open. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 — Make Group capture the decision, not one of four icons.** Group
  footers gave Add tab, Note, To-do, and Stack equal visual weight. At normal width
  this weakened the save loop; at the supported 200 px resize it became four terse
  icon decisions. List used a separate Add-tab label and repeated only Stack inside
  More. The user-directed clean interface needs one obvious primary action, with
  supporting record types available contextually rather than promoted as features.

  Board, Canvas reuse, and focused Group now expose exactly two flat 40 px controls.
  **Save here** owns the flexible track, exact Group destination name, restrained
  cobalt locator, and established receipt-gated capture behavior. **Add record** is
  a quiet named disclosure for Note, To-do, and Stack. List uses the same Save label
  and keeps all three record types inside More; Board More omits that duplicate.
  Empty Groups lead with Save and open the same Add-record menu. No preview supplied
  layout, styling, or copy authority.

  The hierarchy remains truthful under pressure. A Group-local inline-size query
  hides only the secondary visible label below 250 px; both native controls and
  accessible names remain at the supported 200 px width. The shared menu tracks its
  expanded owner, returns focus on Escape, and clears disclosure state on every
  close. Its actions require the exact current Group object before reusing the
  existing Note/To-do receipt or Stack identity transaction. Missing, duplicated,
  moved, or replaced targets write nothing.

  English and native zh-TW independently name Save here, the exact destination,
  Add record, and the exact Group. Light/dark tokens, reduced motion, forced colors,
  schema 12, stable IDs, import bytes, local-only privacy, zero host permissions,
  and the Available/Open Plugins boundary remain unchanged. All 42 JavaScript syntax
  checks and 33 deterministic runner commands pass, including 10,000 concurrency
  schedules (69,880 attempts). Installed pixels, native assistive technology, exact
  responsive geometry, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 — Make the live shell one coherent route, not two hidden menus.**
  The top bar looked quieter only because six older controls were hidden in CSS.
  Its source still carried Undo, Calendar, Search, Settings, Plugins, and an avatar
  beside the visible Search/Save/More set, while a second app-menu controller owned
  a different route list. Search appeared again inside More. That is prototype
  residue, not a clean information hierarchy.

  The rendered shell now has one current context, one global Search, contextual
  Save, and one More owner. Legacy element IDs remain explicit hidden compatibility
  hooks, so routes and internal bindings stay stable without creating focus stops.
  Home retains the global More entry while its Locus Trail remains the one local
  Save decision. Search is removed from More because the global control never left.

  More is one flat, named filing menu: saved-work review, Calendar/reminders,
  Options, then Organize. Optional research tools appear only as **Plugins**; their
  eight interiors remain Available/Open inside the existing registry and never
  become permanent toolbar icons. The optional Welcome avatar and legacy app-menu
  hook delegate to this exact same model. Appearance, first-save Guide, and About
  already live in Settings, while Workspaces keeps its established shell route, so
  Theme/Workspace/Guide/About no longer need a duplicate app menu or icon set.

  Save, topbar More, and sidebar More publish truthful expanded state. Escape and
  every other close path clear it, and Settings/Plugins inherit the visible opener
  for focus return. Pending reminders annotate More with localized accessible text
  and one restrained accent mark that survives forced colors; there is no new
  motion. The full gate also restored confirmed destructive actions from the normal
  accent to the established red semantic token.

  English and native zh-TW, light/dark tokens, responsive source rules, reduced
  motion, stable IDs, schema/import compatibility, local-only privacy, zero host
  permissions, and the noncommercial research boundary remain intact. No preview
  fixture supplied design, layout, copy, or state authority. All 42 JavaScript
  syntax checks and 33 deterministic runner commands pass, including 10,000
  concurrency schedules (69,880 attempts). Installed pixels, native assistive
  technology, exact viewport geometry, representative-user approval, and release
  remain open. **Implemented: yes. Verified: partial. User-validated: no. Released:
  no.**

- **2026-08-13 — Keep Workspace extras Available until the user opts in.** The live
  interface called the clock/search Welcome layer an optional local plugin, but its
  schema-7 migration, General fallback, and runtime guard still interpreted an
  absent preference as enabled. First-Workspace setup happened to overwrite that
  value for a truly empty profile, leaving the implementation internally
  inconsistent and compatible profiles vulnerable to an unchosen full-screen step.

  Schema 13 makes the boundary truthful. Fresh state and General projection default
  `showLanding` to false. Migration preserves every valid explicit true/false choice
  and resolves only absent or malformed schema-0–12 bytes to false. Boot and the
  layer entry point both require exact stored `true`; a missing current-schema byte
  fails closed to Home without manufacturing a persistence write. The separate
  one-task save-first guide remains core.

  The same stable General toggle stays inside the native Workspace-extras
  disclosure. English and independently authored native zh-TW now say the packaged
  feature is local and off by default and name its exact clock/saved-work-search
  effect. No preview supplied layout, visual, copy, product-state, or behavior
  authority. No control, route, permission, network path, or new plugin model was
  added.

  Schemas 0–13 pass all six accepted envelopes plus raw legacy through 30 replace/
  merge cases, including absent early/late values and explicit true preservation.
  All 42 JavaScript syntax checks and all 33 runner commands pass; concurrency
  completes 10,000 schedules (69,880 attempts). Installed migration/reload
  persistence, pixels, native assistive technology, representative-user approval,
  and release remain open. **Implemented: yes. Verified: partial. User-validated:
  no. Released: no.**

- **2026-08-13 — Keep exact Save evidence readable in short viewports.** A long
  saved title, Workspace / Space / Group trail, and source outcome could make the
  bottom-anchored global receipt taller than a short browser window. The top of the
  receipt then sat outside the viewport, hiding part of the evidence users need to
  trust and recover a Save.

  The existing Locus Index filing strip now has a viewport-relative height boundary.
  Only the message body scrolls when necessary; Open destination, Undo, and Dismiss
  remain pinned 40 px controls. The green accepted mark aligns with the first line,
  making the order status, evidence, then action. No new decoration, copy, motion,
  DOM order, state, persistence, route, browser effect, or permission was added.

  A focused public contract first failed on the absent boundary. A removed
  current-source reference then measured the unchanged 760 px strip at 1280x720
  without scrolling, and a fully contained 208 px strip at 420x240 with only its
  136 px message body scrolling, all actions visible, and no horizontal overflow.
  This is source and current-source presentation evidence only. Installed MV3
  pixels, native assistive technology, representative-user approval, and release
  remain open. **Implemented: yes. Verified: partial. User-validated: no. Released:
  no.**

- **2026-08-13 - Make hidden receipt evidence keyboard reachable without adding
  routine friction.** The short-viewport receipt could expose a scrollbar while its
  message remained outside the Tab order. A keyboard user could reach Open
  destination, Undo, and Dismiss but not the clipped title or destination evidence
  those actions referred to.

  The message now becomes a focus stop only when it really overflows. Arrow, Page,
  Home, and End keys stay inside that focused evidence; a wider viewport or receipt
  dismissal removes the stop and resets the shared message to its beginning. The
  existing 3 px Locus Index locator makes this temporary reading state visible, and
  the receipt still never moves focus on its own. Ordinary one-line and fully
  visible receipts keep their prior Tab order.

  The production-extracted contract covers overflow, fit, hidden, reset, resize,
  and Page Down behavior. A removed browser reference showed no extra stop at
  1280x720, then at 420x240 showed the focused 136/207 px message scrolling to its
  71 px end while the pinned actions and viewport boundary held. No copy, new
  component, animation, state, route, schema/import byte, browser effect,
  permission, or network path changed. Installed MV3, native assistive technology,
  representative-user approval, and release remain open. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Let the compact Save receipt tell one directional story.** The
  receipt's stable reading and keyboard order was evidence, Open destination, Undo,
  then Dismiss. Its compact grid contradicted that structure by putting Dismiss
  beside the evidence above the two recovery actions, so the last focus stop jumped
  visually backward.

  Compact receipts now spend their first row entirely on the exact saved title and
  destination. The second row follows the native control order from left to right:
  Open destination, Undo, Dismiss. This is a structural choice, not decoration: the
  filing receipt reads as proof first and decision second. The wider three-column
  strip already followed that order and remains unchanged.

  A focused source contract failed on the former placement and now freezes matching
  markup and compact grid order. A removed 420x240 browser reference kept the whole
  receipt at y=20..228 and aligned all controls at y=177..217 with zero horizontal
  overflow; 1280x720 remained unchanged. No markup, copy, component, animation,
  state, callback, route, schema/import byte, permission, or network path changed.
  Installed MV3 Tab traversal, native assistive technology, representative-user
  approval, and release remain open. **Implemented: yes. Verified: partial.
  User-validated: no. Released: no.**

- **2026-08-13 - Let Search Clear exist only when it can clear something.** Find-
  again Search is meant to begin with one quiet, dominant query field. A permanent
  × at the end of an empty field looked occupied, consumed a keyboard stop, and did
  nothing when activated.

  The custom Clear action now follows the mounted text rather than delayed results.
  It has no layout or keyboard presence when the exact field is empty, appears as
  one 40 px action as soon as ordinary or composing text exists, and disappears
  again after clearing while focus returns to the query. Filters, sort, and panel
  state remain separate because the label says Clear search, not reset Search.

  The production-extracted Search contract failed on the absent synchronizer and
  now covers empty, typed, initial, input, and composition-end behavior. Removed
  browser references verified no empty action, a 40x40 px typed action, retained
  query focus, and zero horizontal overflow at 420x590 and 1280x720. No result
  behavior, copy, route, saved data, component, schema/import byte, permission, or
  network path changed. Installed MV3, native IME/assistive technology,
  representative-user approval, and release remain open. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Keep Library still while a query is being composed.** The
  privacy-conscious user who files and later retrieves zh-TW pages should see one
  stable recovery ledger while finishing a word. Replacing the URL and results for
  interim phonetic input made the interface react before the user's intent existed;
  Escape could also erase and leave the field while the IME still owned it.

  All Links, Favorites, and Read Later now share one query controller. Interim
  composition stays in the field, composition end becomes one settled route/result
  update, and the duplicate browser input is ignored. Ordinary typing remains
  immediate. Escape stays with the IME during composition and resumes the existing
  clear-and-blur action afterward.

  The focused production-extracted contract covers the exact event sequence. A
  removed 420x590 current-source reference confirmed ordinary input, focus, the
  unchanged 420x52 px query row, zero horizontal overflow, and settled Escape. The
  restricted browser layer could not synthesize native composition, so installed
  native IME/assistive technology, representative-user approval, and release remain
  open. No visible design, copy, component, durable state, route shape, schema/import
  byte, permission, or network path changed. **Implemented: yes. Verified: partial.
  User-validated: no. Released: no.**

- **2026-08-13 - Prove the filing can succeed even when its label cannot.** Quick
  capture has two truths: whether the page was stored and whether Locus can project
  its exact current destination. The first must never be rewritten as failure by a
  malformed unrelated branch encountered only while producing the second; a false
  failure invites the user to save the same page again.

  The focused worker regression now sends four malformed collection shapes and one
  malformed destination field through the real extracted state-write handler. Each
  retains one accepted graph and revision, returns the strict unavailable
  destination continuation, performs no browser effect, and never retries. A valid
  200,000-entry Stack preserves exact success, so conservative failure does not
  impose a shallow-data limit.

  No runtime or visible design changed because production already follows this
  contract. The focused syntax and popup Locate suite pass; installed Chrome
  message/storage timing, service-worker termination, rendered popup/assistive
  technology, representative-user comprehension, approval, and release remain
  open. **Implemented: yes (regression evidence). Verified: partial.
  User-validated: no. Released: no.**

- **2026-08-13 - Keep the filing receipt visible when cleanup is uncertain.** An
  ordinary popup Save previously treated source-tab cleanup as invisible
  housekeeping: even when the exact tab changed or could not be confirmed, the
  popup flashed Saved and disappeared after 400 ms. The file was safe, but the
  consequence was hidden precisely when the user needed it.

  The accepted Save now remains on the existing green filing-receipt card whenever
  a requested close is protected or unconfirmed. It shows the accepted destination
  and title, reuses the established English/native zh-TW source message, and offers
  Open Locus or Close with focus on the primary action. Confirmed close and an
  intentional keep-open Save remain quiet; no new visual component, copy key, or
  animation was added.

  The focused source contract failed on the absent controller and now covers
  changed URL, window, pending navigation, and unavailable source read with no
  generic toast, timer, or removal. Popup/test syntax and the popup Locate suite
  pass. A supported Chrome diagnostic found Chrome installed but not running and
  the selected profile missing the ChatGPT browser extension; its native host is
  correct. Installed pixels/effects, native assistive technology, representative-
  user comprehension, approval, and release remain open. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Let a protected-source receipt finish the recovery loop.** Keeping
  the Saved card visible fixed the hidden consequence, but generic Open Locus still
  sent the user back into manual hunting. The receipt already knew which exact item
  had been accepted; its primary action should spend that identity on recovery.

  Open saved item now carries the immutable accepted Workspace/item/source identity
  into the existing worker-owned fresh resolver with source cleanup forcibly off.
  The worker may open only the exact current item route; a moved, unavailable,
  duplicated, URL-changed, or uncertain target stays conservative and can fall back
  to generic Locus. Close remains Close popup, never a second attempt at cleanup.

  This is a structural improvement to the existing green filing receipt, not a new
  card, style, animation, or copy key. The focused contract failed on the missing
  intent and now freezes its primitive identity and `closeSource:false`; the existing
  action matrix covers exact Open and conservative failures. Popup/test syntax and
  the popup Locate suite pass. Installed MV3, real route effects, rendered focus/
  assistive technology, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Recheck the page before replacing it with a placeholder.** A
  Hibernate request is like filing a copy and then clearing the desk: a delay must
  not let the label for the old page replace a newer page now occupying that tab.

  Single Hibernate now freezes the reviewed source before waiting. Bulk drains the
  queue, discovers candidates, and freezes each one before optional saving. Both
  fresh-confirm the exact tab, window, active state, current URL, and pending
  navigation immediately before replacement. Changed, newly active, redirecting,
  missing, or malformed sources remain live. Exact bulk siblings can continue; an
  accepted Save-before copy remains accepted even when its later source effect is
  protected.

  This is a trust correction inside the existing interaction, not a new surface.
  Busy state, placeholders, result counts/toasts, copy, focus, and visual hierarchy
  stay unchanged. The focused regression covers the pre-wait snapshot, mismatch
  matrix, wait-time active transition, zero mismatch effect/reload, no retry, and
  bulk post-persistence guard. Installed MV3 timing, the final read-to-update race,
  real tab effects, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Let every Inbox filing receipt carry the actual pages.** A folder
  name is not enough authority to clear the desk: Locus must still be able to point
  to the exact newly filed page or pages before it changes their source tabs or
  claims where they went.

  Single, selected, and Space-drop Inbox saves now allocate collision-safe IDs,
  freeze the exact new-item set with its Workspace, Space, Inbox, list, and path,
  and re-resolve that receipt through persistence and every source effect. Drift
  protects the source without retrying an accepted save. Opened-tab, selected,
  palette, and Space-drop actions reuse the existing Open-destination receipt;
  Home, Welcome, and top-bar keep their purpose-built handoffs.

  This adds no component, style, copy key, durable field, permission, or network
  path. Focused production-extracted contracts plus state-sync, quality, and 10,000
  fixed-seed concurrency schedules pass. Installed MV3 timing, final read-to-remove
  behavior, rendered/assistive-technology output, representative-user approval,
  and release remain open. **Implemented: yes. Verified: partial.
  User-validated: no. Released: no.**

- **2026-08-13 - Do not let an old label block a new filing.** A user choosing an
  existing Group should not see an unexplained refusal because a newly generated
  page ID happened to match something preserved in Archive, Trash, layout hints,
  or capture preferences.

  Selected and active-tab existing-Group Save now reserve against that complete
  retained set before history or mutation. A collision is skipped; allocator
  exhaustion uses the existing no-save/no-close result. The exact filing receipt,
  one acknowledged write, source protection, and Open-destination continuation
  remain unchanged.

  This is a reliability correction with no new visible surface, copy, style,
  schema, permission, or network path. A forced-collision production-extracted
  case plus syntax, quality, and 10,000 fixed-seed concurrency schedules pass.
  Installed MV3 behavior, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Make the receipt count and desk consequence agree.** When Save all
  says four pages were saved under a close-after-confirmed-save preference, leaving
  one arbitrary eligible source open feels broken even if the local copies are safe.

  Save all now offers every supported page in its accepted count to the same exact
  destination and fresh-source cleanup guard. Unsupported or changed pages remain
  protected; the fix removes only the stale first-item exemption.

  No new surface, copy, style, schema, permission, or network path was added. The
  production-extracted mixed-protocol caller plus syntax, quality, and 10,000 fixed-
  seed concurrency schedules pass. Installed Chrome removal timing, representative-
  user approval, and release remain open. **Implemented: yes. Verified: partial.
  User-validated: no. Released: no.**

- **2026-08-13 - Keep old return labels from claiming a new Inbox.** Archive Restore
  may visibly offer Inbox when the original Group is gone. That new folder must not
  inherit an ID still written on another archived or trashed record, or later
  recovery can point at the wrong place.

  Single-page Restore now allocates its fallback Inbox against active content and
  every retained restore/layout/capture hint before history or mutation. The exact
  page object, destination receipt, one acknowledged write, Undo, and focus remain
  unchanged.

  No new surface, copy, style, schema, permission, or network path was added. A
  forced retained-hint collision plus the Library recovery, 1,024-record Archive
  scale, and quality contracts pass. Installed storage, representative-user trust,
  and release remain open. **Implemented: yes. Verified: partial.
  User-validated: no. Released: no.**

- **2026-08-13 - Make “drag into any Space” true.** A visible drop target that
  always rejects inactive Spaces turns a convenience shortcut into wasted motion
  and undermines confidence in where pages are filed.

  Space-drop alone may now freeze an exact inactive Space/Inbox/list inside the
  active Workspace. It does not select or navigate to that Space, and every other
  capture list remains active-Space-only. The existing exact receipt still owns
  persistence, source cleanup, Undo, and Open destination.

  No new surface, copy, style, schema, permission, or network path was added. The
  production-extracted active/inactive/foreign-Workspace boundary plus state,
  quality, and 10,000 fixed-seed concurrency contracts pass. Installed native drag,
  representative-user approval, and release remain open. **Implemented: yes.
  Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 - Keep drag-and-drop inside the same privacy promise.** Turning off
  page-title or site-icon capture should apply because the user saved a page, not
  depend on which shortcut they used. A Space drop that stores raw drag metadata
  violates that simple expectation and changes how the item is later found.

  Space-drop Save now derives its stored label and icon once through the canonical
  capture policy. URL, collision-safe identity, exact destination receipt,
  acknowledged persistence, and source consequence stay unchanged.

  No new surface, copy, style, schema, permission, or network path was added. A
  production-caller case proves private raw metadata is discarded in favor of the
  configured domain/empty-icon output; syntax, quality, and diff gates pass.
  Installed native drag, representative-user approval, and release remain open.
  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-31 - Add Grid, a monochrome hairline theme, as the shared token layer.**
  Twelve explored design directions collapsed into two independent axes: a skin and
  a structure. The skin axis is settled first because every layout inherits it.

  Grid (`design/canvas/directions/G-grid.html`) is now a real theme in both
  variants. Chrome is black, white, and grey only; depth comes from 1px borders
  rather than blur, so `--card-shadow`, `--card-shadow-h`, and `--shadow-sm`
  resolve to `none` and the elevation scale becomes a hairline ring plus a short,
  faint drop reserved for true overlays. Radii collapse to one 6/8px pair and
  `--glass-blur` / `--blur` go to zero. Colour is spent only on state the user has
  to act on (receipt, error, overdue), so a coloured pixel always means something.

  The structural half lives in `themes.css`, not `newtab.css`, so the popup
  inherits it; it is written against both `:root[data-theme]` and
  `body[data-theme]` because the new tab sets the attribute on `<body>` while the
  popup sets it on `<html>`, and both outrank the plain `:root` scale. `--text2`
  and `--text3` are pinned at 7.5:1 and 4.5:1 on `--bg`; muted grey that fails AA
  is this project's recurring regression. `--registry-bg` stays near-black in both
  variants because `--index-registry` doubles as the modal scrim base, and
  inverting it in dark mode would flash the overlay white.

  Additive only: two `THEMES` entries plus two `THEME_IDS` ids. No schema change,
  no new element id, no copy, no permission, no network path. `isDarkTheme()`
  already derives mode from `colors[0]` luma, so `grid-dark` needs no extra code.

  Evidence: seeded schema-13 state (4 Spaces, 26 items, 2 reminders) rendered
  headless at 1440x900 across all seven registry layouts (board, list, canvas,
  explorer, timeline, gallery, graph) plus the Home and Calendar surfaces. None
  broke. A same-seed folio control proves the defects visible in those shots are
  pre-existing structural ones, not theme regressions: `LINK` mono eyebrow labels
  on every card, two-line titles clipped by the card body, emoji folder glyphs,
  and favicon fallbacks rendering as solid blocks. Those belong to the card
  component and are the next slice, not this one. Quality gates pass. Shots in
  `design/canvas/verify-grid/`.

  **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-11-04 - Explain why Brave new tabs opened Google, and document the fix.**
  In Kai's Brave, new tabs opened Google instead of Locus while Edge was fine. The
  cause is neither Locus code nor a Brave setting. That Brave profile has the Custom
  New Tab extension enabled, set to redirect new tabs to google.com; in Edge the same
  extension is disabled. Chromium keeps one ordered list of new-tab overrides per
  profile (`extensions.chrome_url_overrides.newtab`), puts a newly installed
  extension at the front, and serves the first entry whose extension is enabled. The
  other extension therefore wins whenever it was installed after Locus, or whenever
  Locus is off or fails to load.

  The fix is a user step: turn the other extension off or remove it. README Install
  gains a short troubleshooting note with the steps, plus a warning that removing
  Locus to win the new tab back deletes its saved data. There is no in-app note,
  because Locus is not on screen when this happens. No code, schema, element id,
  copy, permission, or network change.

  Evidence: throwaway Brave 1.98 and Edge 156 profiles loaded Locus and a copy of
  Custom New Tab whose redirect was pointed at a local stand-in page. With both on, a
  new tab landed on the stand-in in both browsers. Turning Custom New Tab off with
  `chrome.management.setEnabled` from the extensions page (the call its toggle
  makes) gave the next new tab back to Locus, with no page or service-worker errors.
  Reversing the load order reverses the winner. Kai's live Brave currently lists
  Locus first, and Custom New Tab's storage was last opened 2026-07-16 04:53, one
  minute before Locus was installed there. The redirect was not reproduced in the
  live profile; the steps stop it from coming back.

  **Implemented: yes. Verified: partial (throwaway profiles over CDP, not Kai's live
  browser). User-validated: no. Released: no.**

- **2026-11-05 - Stop a fresh profile's first new tab from opening the reload dialog.**
  In a fresh profile with only Locus, the first new tab opened "Reload latest saved
  data" over the onboarding, and the next open showed it again. Only one Locus page
  was open, and nothing reached either console. The cause is key order.
  `chrome.storage` hands every object back with its keys sorted, while `State`
  compared graphs as raw `JSON.stringify` strings. The default Workspace that a
  fresh boot builds keeps insertion order, and so does the `category.layout` field
  that the boot layout pass appends on the next open, so neither matches its own
  storage echo. If `storage.onChanged` reports the page's write before the runtime
  receipt, the page does not recognize its own graph, sees a newer revision while
  that write is pending, and requires recovery; the receipt then fails with "Locus
  must reload the latest saved data before it can save more changes". If the
  receipt comes first, the equal-revision echo fails the same comparison and shows
  "Locus changed in another window". The service worker writes nothing at startup;
  the race is between the page's write and its own echo. Separately, the boot
  `setViewMode(getViewMode())` call persisted without checking for a change, which
  is why every open wrote a state whose only difference was `_revision`. Profiles
  that already stored `layout`, like Kai's, echoed in matching order, so they wrote
  on every open but never showed the dialog.

  `State` now compares graphs as JSON with sorted keys, for the self-write echo,
  equal-revision equality, dirtiness and recovery. `setViewMode()` persists only when
  the layout or the legacy `settings.viewMode` changes, so an open with nothing to
  save leaves `_revision` alone. That unconditional boot write had also been saving
  whatever the first render creates on demand (the Pomodoro and floating-widget
  slices, window bindings). `persistBootChanges()` now runs once after the first
  render and saves only when the graph differs from storage; without it, such a
  profile would stay dirty until the next write from another tab brought the dialog
  back. A fresh-context review of the first commit caught that gap. A genuine
  foreign graph is still adopted by a clean page and still blocks a dirty one. The new
  `scripts/state-storage-order-contract-test.js` models the sorted round trip and
  both echo orders. No schema, permission, element-id, copy, or network change.

  Evidence: headed Brave 1.98 and Edge 156 with throwaway profiles holding only
  Locus, driven over CDP with a probe on write sends, receipts and `onChanged`
  events. Unfixed HEAD showed the dialog on the first open in both browsers (send
  rev 0, sorted echo rev 1, then the receipt) and again on the next open. The order
  is timing-dependent: one unfixed working-tree run escaped it. With the fix, HEAD
  and the working tree both show the onboarding with no dialog in both browsers.
  The first open writes revisions 1 and 2, and a later open writes nothing (Brave
  relaunch, Edge second tab; Edge does not reload a command-line extension when an
  existing profile relaunches). The new suite fails on the unfixed code with the
  same error the browser shows and passes with the fix.

  **Implemented: yes. Verified: partial (throwaway profiles over CDP and a
  deterministic suite, not Kai's live profile). User-validated: no. Released: no.**
