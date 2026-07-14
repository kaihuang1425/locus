# Locus status & slice queue

**Living document — update it at the end of every cycle**: move the shipped slice to
"Done", re-rank the queue, add discoveries to "Known issues". Trust but verify: if
this file and the code disagree, the code wins (then fix this file).
Last updated: 2026-07-13.

## Queue (highest impact first)

1. **Shell + Home simplification** (`docs/UX_SIMPLIFICATION.md` §5–6, Phases 2–3) —
   first-session work (Phase 1) shipped; the corrective sequence continues with the
   shell and Home. Do in order: five-entry core navigation (Home, Inbox, All Links,
   Spaces, More — move Archive/Trash/Calendar/Tools/Settings under More until
   relevant/pinned), a one-action top bar (context title + one search entry + one
   Save/Add + overflow, no duplicate search fields), the collapsed-by-default
   opened-tabs rail, and a three-zone Home (welcome/context line, one capture+Inbox
   card, up to three recent/pinned Spaces + View all). Validate the save-and-find
   loop before promoting Calendar or alternate Space views.
2. **Space layout fidelity triage** (`spaces_*` previews) — Canvas, Explorer,
   Gallery, Graph, Timeline, and details are functional, but fidelity and user-flow
   quality vary. Audit the highest-friction layout first, then re-rank the rest from
   rendered evidence rather than treating all six as one rewrite. Keep layouts
   under Advanced views until each passes the core-ready gate.

## Done (newest first)

- **2026-07-13 — First-use simplification, Phase 1 (first session)** — replaced the
  six-step name/purpose/workflow/plugins questionnaire on first launch with one
  single-task welcome card (`#first-run`): one sentence on what Locus is, a primary
  **Save your first tab**, and a quiet **Explore on my own** (`docs/UX_SIMPLIFICATION.md`
  §3, §12). Removed the welcome→landing→Home chain — the calm landing layer no longer
  stacks behind onboarding (`_landingAfterWelcome` deleted) and greets only returning
  users. **Save your first tab** captures the most recently used real open tab (not the
  new-tab page) into the active Space's Inbox via the existing capture fields, shows the
  saved item in place with an inline confirmation + one continuation into its Inbox
  destination, and Undo removes just that copy (welcomeSeen persisted before the snapshot
  so undo never re-arms onboarding). No open page → honest empty state naming the two real
  save paths, never a fabricated save. Dismissal is permanent; reload resumes the product.
  The questionnaire (`openWelcome`) stays reachable on demand from the menu/Settings.
  Escape stack, focus trap, en/zh-TW, dark theme, reduced-motion gate, and 800px layout
  covered. Runtime-verified with headless Chromium + storage shim (34 checks: save/empty/
  explore/Escape paths, Inbox persistence across reload, no duplicate IDs, zero console
  errors). No schema bump or permission change.
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
  because Locus stores no page/file content and remains local-only/free-tier.
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
| settings_* (9 files, Jul 8–11) | ✅ Done 2026-07-12 (free/local subset) |
| new_tab_landing_page.png (Jul 11) | ✅ Done 2026-07-12 |
| dashboard.png | ✅ Home surface |
| favorites / read_later / all_links / archive / inbox prototypes | ✅ Library surfaces |
| search_prototype.png | ✅ Done 2026-07-13 (local/free fidelity pass) |
| locus_system_empty_state_each_page.png | ✅ Done 2026-07-13 (shared local/free empty-state contract) |
| locus_extension_popup.png | ✅ Done 2026-07-13 (local/free subset + remainder pass) |
| locus_command_popup.png | ✅ Done 2026-07-13 (local/free fidelity pass) |
| spaces_* layout pngs (canvas/explorer/gallery/graph/timeline/details) | ✅ Layouts shipped (fidelity varies) |
| calendar.png, calendar_dark_expand.png | ✅ Calendar |
| locus_startup_1–5.png | ✅ Welcome questionnaire |
| plugins_v1/v2 pngs | 🟡 Tools hub exists; marketplace concepts are future/premium |
| trash_prototype.png | ✅ Done 2026-07-13 (local/free subset) |
| bento_dashboard / collab_projects (premium), locus_on_mobile, mobile_extension_workflow | 🚫 Out of scope (premium/mobile) |
| locus_hover_universal_preview_popup.png | ❌ Needs page-content access → conflicts with no-host-permissions; do not build as-is |

## Known issues / tensions

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
- Sample/first-run seed data: the default state ships a few starter todos/notes —
  that's the intended first-run content, not demo debt.
