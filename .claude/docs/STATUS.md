# Locus status & slice queue

**Living document — update it at the end of every cycle**: move the shipped slice to
"Done", re-rank the queue, add discoveries to "Known issues". Trust but verify: if
this file and the code disagree, the code wins (then fix this file).
Last updated: 2026-07-13.

## Queue (highest impact first)

1. **Command palette fidelity review** (`locus_command_popup.png`) — the local
   command palette is functional and keyboard-driven, but its visual hierarchy,
   query/empty states, and preview parity have never had a focused pass. It is a
   high-frequency navigation surface and needs no new permissions or remote data.
2. **Search surface fidelity review** (`search_prototype.png`) — the operator
   engine is shipped, but the saved-link search presentation and complete
   keyboard/empty-state flow remain visually unreviewed against the preview.

## Done (newest first)

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
| search_prototype.png | ✅ Board search + operators (fidelity unreviewed) |
| locus_extension_popup.png | ✅ Done 2026-07-13 (local/free subset + remainder pass) |
| locus_command_popup.png | ✅ Command palette (fidelity unreviewed) |
| spaces_* layout pngs (canvas/explorer/gallery/graph/timeline/details) | ✅ Layouts shipped (fidelity varies) |
| calendar.png, calendar_dark_expand.png | ✅ Calendar |
| locus_startup_1–5.png | ✅ Welcome questionnaire |
| plugins_v1/v2 pngs | 🟡 Tools hub exists; marketplace concepts are future/premium |
| trash_prototype.png | ✅ Done 2026-07-13 (local/free subset) |
| bento_dashboard / collab_projects (premium), locus_on_mobile, mobile_extension_workflow | 🚫 Out of scope (premium/mobile) |
| locus_hover_universal_preview_popup.png | ❌ Needs page-content access → conflicts with no-host-permissions; do not build as-is |

## Known issues / tensions

- `renderArchiveList()` in newtab.js is a harmless no-op since the drawer's archive
  tab was removed (element gone, function null-guards); callers remain. Delete
  function + call sites opportunistically when touching those paths.
- `design/fixtures/home-preview.html` is a static fixture with hardcoded counts —
  fine (isolated), but never link it from the product.
- Sample/first-run seed data: the default state ships a few starter todos/notes —
  that's the intended first-run content, not demo debt.
