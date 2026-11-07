# Locus status & slice queue

**Living document — update it at the end of every cycle**: move the implemented slice to
"Done", re-rank the queue, add discoveries to "Known issues". Trust but verify: if
this file and the code disagree, the code wins (then fix this file).
Product priorities and evidence language follow
[`docs/PRODUCT_SUCCESS_SYSTEM.md`](../../docs/PRODUCT_SUCCESS_SYSTEM.md). A "Done"
entry records a completed implementation cycle; it does not by itself mean verified,
user-validated, or released.
Last updated: 2026-11-06.

## Design system track (decided 2026-08-31)

Twelve explored directions in `design/canvas/directions/` (paired `.html` + `.png`)
resolve into two independent axes, which is also how the code is already built:
`LAYOUTS` in newtab.js is a layout registry with seven implemented entries persisted
per category as `category.layout`, and surfaces (`activeSearch`, `activeCalendar`,
`activeGroupPage`, `activeHome`) sit above it in `renderBoard()`.

- **Skin axis (A-H).** Owner picked **G / Grid**: monochrome hairline system, colour
  reserved for actionable state. Shipped as the `grid` / `grid-dark` themes.
- **View axis (I-L).** I maps to the existing `board` layout, K to `gallery`,
  L to `timeline`. These are redesigns of shipping code, not new architecture.
- **J / Triage is the only structural addition** and is correctly a *surface*, not a
  layout: it belongs beside `activeCalendar` in `renderBoard()`, not in `LAYOUTS`.

Slices, in order:

1. **Done 2026-08-31 - Grid token layer.** See the DESIGN.md changelog entry.
   Verified across all seven layouts plus Home and Calendar; shots in
   `design/canvas/verify-grid/`. Installed-extension pixels remain open.
2. **Next - card component cleanup.** The same-seed folio control proved these are
   structural, not theme, defects and they appear on every layout: `LINK` mono
   uppercase eyebrow labels on every card (the exact pattern the owner rejected as
   AI cliche), two-line titles clipped by a fixed card body height, emoji folder
   glyphs in group headers, and favicon fallbacks rendering as solid blocks. Also
   sweep the 514 hardcoded `border-radius:` declarations in newtab.css onto the
   radius tokens so a theme can actually own corner shape.
3. **Triage surface (direction J).** One item at a time out of Inbox; `1-4` file to
   a Space, `E` archive, `R` remind, `Left` undo, `Esc` stop. Follows the
   `activeCalendar` surface pattern. The only direction that reduces the unfiled
   count rather than re-sorting it.
4. **Timeline + Calendar convergence (direction L).** `renderTimelineView` already
   computes `time = reminder.at ?? createdAt`, but `buildCalendarEntries()` emits
   reminders only - a seeded workspace with 26 saved items renders an almost empty
   month. Unify the time model so Calendar becomes the month/agenda scale of the
   timeline instead of a separate destination.
5. **Board and Gallery to the I and K designs**, including the live Open-tabs column.
   No competitor surveyed (tabExtend, Toby, Workona, Raindrop, mymind, Readwise
   Reader) puts open tabs and saved tabs on one screen; Locus already has
   `chrome.tabs`.

## Queue (highest impact first)

1. **Finish P0 installed capture durability and release evidence** — current
   `saveAllTabs()` and `addSidebarOrActiveTabToGroup()` production callers freeze and
   re-resolve exact Workspace/Space/Group authority across `chrome.tabs.query()`,
   then require an exact post-write destination receipt before source cleanup or
   success. Their caller-level clean-adoption, duplicate/moved/replaced target,
   receipt-ordering, recovery, and source-protection contracts pass. The remaining
   work is installed evidence: exercise the centralized whole-state writer across
   real new-tab/popup/background contexts, including
   receiver absence, lost/timed-out acknowledgements, storage-change ordering, and
   service-worker termination/restart; exercise background capture-receipt
   create-before-source delivery, stable in-place update/click clearing,
   callback-only and Promise API behavior, notification-center accumulation, and
   service-worker termination between receipt creation, guarded close, and update;
   add real-browser failure-path evidence for save-before-close; exercise installed
   Save-all and existing-Group adoption plus post-receipt destination drift and
   prove the exact caller validator protects every source across real storage/tab
   timing; exercise real installed-browser
   Archive/Trash quota persistence and installed-browser export/import round trips at scale; verify actual
   Chrome import quota allocation, File/FileReader and large-file preview behavior,
   and installed legacy/current round trips; and run an unpacked-extension
   CSP/favicon/network audit. Extend reminder contracts to the installed
   restart/sleep and delivery lifecycle, the rendered/installed one-shot Past Due
   and reschedule/clear flow,
   installed group/category mutation delivery under schema-12 stable identities,
   installed alarm timing through DST/date-line transitions, and live time-zone
   changes.
   A supported 2026-08-13 diagnostic exposed only the in-app browser. Google Chrome
   is installed but not running; the selected Default profile lacks the ChatGPT
   browser extension, while the shared native-host manifest and registry entry are
   correct. Do not substitute raw debugging or another browser backend for this
   installed-evidence gate.
2. **Validate Locus Index across the core surfaces and installed activation**
   (`docs/UX_SIMPLIFICATION.md`) — first review the shared redesign page by page at
   1280×720 and 800 px across Welcome, Home/Inbox, Search, Library, saved-item
   detail, Settings, and popup. Correct hierarchy, clipping, contrast, focus, and
   density defects against real local data before extending the visual system to
   Advanced layouts. The earlier Field Desk direction was explicitly rejected by
   the owner; Locus Index is the unapproved replacement candidate. It uses dark
   registry chrome, warm stock, one blue locator rule, and green accepted receipts
   across the core extension. Its typography now follows one truthful shared role:
   the persisted font owns readable headings and controls across new-tab and popup,
   while Geist Mono is limited to exact filing metadata; Lora is no longer forced
   unless selected. Current-source shell/popup evidence covers default DM Sans at
   1280×720, 800×720, 420×590, and 420×520 without horizontal overflow. Installed
   populated-state and user-preference pixels remain open. Source inspection corrected
   a false localhost signal: first-workspace initialization already sets the Opened
   Tabs rail collapsed, while legacy stored choices remain compatible; an expanded
   uninitialized reference is not product-default evidence. Home Trail now uses a
   compact two-row route from 761 through 1100 px, keeping Inbox in the 720 px view
   at 1100, 901, 800, and 761 px without changing markup, focus, copy, or behavior.
   At 900 px and below the Space registry remains visible at 188 px while Home fills
   the remaining work area; 760 px and below retains the safe vertical stack. Exact-
   copy English/light and native zh-TW/Locus Dark 800 px references have no
   horizontal overflow, but installed populated pixels remain open. The popup's
   current-source failure path now uses one explicit
   read-state owner, a dominant Save action, readable consequence/retry copy, and a
   compact local-first footer. Welcome now presents the real reviewed tab and exact
   Workspace › Space › Inbox as one filing route, fresh-checks both authorities,
   and blocks dismissal while Save is pending. Its visible pixels remain installed-
   only evidence. Installed popup states, the complete Welcome → Inbox activation,
   dark/zh-TW pixels, 420×520 popup, 800 px new-tab, zoom, and screen-reader output
   remain open. Home now preserves Trail → Inbox → Spaces while presenting Spaces
   as one quiet filing register with stored symbols and one newest real item per
   row. Saved-item Details now reads as one 560 px recovery docket: complete wrapping
   Workspace › Space › Group location, one visible record identity, dominant guarded
   Open, aligned Why saved/Reminder/Tags context, and retained Advanced metadata.
   Search now reads as a locator ledger: a dominant query, flat type rail, exact
   saved path and age on every result, recovery actions immediately below the
   selected path, and a wide filter tray instead of a third dashboard column.
   Library now reads as one filing ledger: heading/scope, dominant find/sort row,
   quiet count/status rail, cobalt-spined records that keep title/path/source
   together, Open-first actions, and nonduplicated lifecycle More menus. Their
   installed pixels remain open. Settings now reads as one numbered control ledger:
   one active cobalt index marker, one bounded sequence of labelled rows, an exact
   privacy fact docket, explicit focus, and deliberate 880/620 px reflow. Its installed
   pixels also remain open. Settings Data now follows the same local-file grammar:
   Export is first, the live profile summary and honest download limit stay visible,
   one native JSON trigger leads to a flat manifest review, and bookmarks/pasted
   links are explicitly secondary additions rather than backup restoration. Its
   installed file chooser, download, import, and pixel evidence remain open.
   Settings Capture now uses that same trust grammar for the save policy itself:
   one real State-derived source → confirmed local copy → source-consequence route
   replaces the manufactured page preview and decorative steps. Exact remembered,
   fixed-Space, and active-Space destinations fail closed when identity or Inbox
   truth is ambiguous. Every existing destination/toggle control now owns one
   acknowledged preference receipt, with pending focus/dismissal/navigation
   ownership and authoritative recovery on rejection or drift. Its installed
   preference persistence, cross-surface capture coupling, pixels, and native
   assistive-technology behavior remain open.
   Settings Appearance now keeps only System, Locus Light, Locus Dark, item size,
   card URLs, and Motion in the core ledger. Fifteen compatible themes, eight
   bundled fonts, and column width remain locally available inside one optional
   Style plugin; its Available/Active state is derived from the real stored values,
   not an invented install or account model. Every Appearance change now owns one
   acknowledged preference receipt and the shared Settings pending/recovery
   boundary. Installed persistence, prepaint/popup coupling, pixels, and native
   assistive-technology behavior remain open. The Plugins hub now applies that same
   containment rule to all eight packaged research tools: one flat optional registry
   truthfully says Available/Open, while an allowlisted modal controller owns Tab,
   Escape, inertness, scroll lock, and real opener transfer. The emoji/gradient tile
   wall, hardcoded English, and fictional enablement language are gone; no marketplace,
   download, account, permission, or plugin-state model was added. The tool interiors
   remain contextual and unpromoted. Settings General now keeps language,
   saved-page opening, and the first-save guide in its core ledger; window switching
   sits inside one locally available Workspace-extras plugin (the Welcome-screen toggle
   and greeting name were removed 2026-11-07). Its real preferences share one exact
   acknowledged transaction with Capture, Appearance, and Privacy, while Profile framing,
   implicit name-on-blur saving, and inline prototype residue are gone. Installed
   persistence, pixels, window-focus/Welcome behavior, and native assistive-
   technology evidence remain open. Settings Privacy now leads with four exact
   storage, network, browser-access, and recovery facts instead of a shield/checklist.
   Backup stays primary; the compatible screen-share mask sits inside one locally
   available plugin and joins the acknowledged Settings transaction without claiming
   encryption or security. Installed pixels, native assistive technology, real
   download completion, reload persistence, and user comprehension remain open.
   Inbox/Board Note and To-do cards are now read-only record locators; Note body,
   To-do text, and marker editing converge in the exact item-detail receipt path.
   The pointer-only anchored color popup, slash mutation paths, and inline card
   writers are gone. Compatible imported custom marker bytes remain visible and
   non-writing. New local records wait for one exact destination receipt before
   rendering and opening their Details field. Group footers now retain one dominant
   **Save here** action and place Note, To-do, and Stack behind one localized
   **Add record** disclosure; List keeps those record types contextual inside More.
   The live shell now renders one global Search, the contextual Save action, and
   one More disclosure. Legacy Calendar, Search, Settings, Plugins, Undo, and avatar
   IDs remain non-rendered compatibility hooks; the optional Welcome menu delegates
   to the same visible More owner. More no longer duplicates Search, and its named
   Plugins entry is the sole promotion point for the eight packaged research tools.
   Workspace extras are now genuinely opt-in: schema 13 leaves fresh, missing, or
   malformed Welcome preferences Available but inactive, preserves explicit stored
   booleans, and keeps the separate first-save guide core. Source/extracted locale,
   migration, and import evidence passes; installed persistence and pixels remain
   open.
   Inbox/Board Note, To-do, and saved-page cards now share
   one local-record header, localized type label, in-flow reminder, 40 px More
   action, and accepted-storage lifecycle behavior. Saved pages keep one dominant
   guarded Open target plus their real source domain; the tiny hover-only action
   strip and direct Archive X are gone. Board and focused-Group pages now wrap those
   records in one flat Group filing register: a real-color locator spine, native
   Group-name route, persistent 40 px Open all/More controls, and one opener-aware
   context menu replace the bento lacquer, entrance motion, and hover mask. Their
   installed pixels remain open. List Groups now extend that same register grammar:
   real-color locator, native name route, localized item/to-do context, persistent
   40 px Open all/Save here/More, deliberate compact reflow, and the shared exact-
   target opener-aware action model replace its hover toolbar, pill cluster,
   hardcoded tooltip, and menu forks. Note, To-do, and Stack creation share one
   exact-target record-action model: Board exposes it through Add record while List
   keeps it inside More. Board and List Stacks now read as subordinate
   filing sleeves with truthful real-color locator rails, localized type/item
   context, persistent 40 px collapse/symbol/More controls, one exact Stack/parent/
   Group action model, and accepted-storage complete-Stack Archive. Their installed
   pixels remain open. The shared action menu across those and other core routes now
   uses one flat viewport-bounded filing sheet with localized section/layout names,
   a named menu owner, 40 px rows, visible locator-plus-outline focus, reduced-motion
   suppression, and forced-color equivalents; installed pixels and native assistive-
   technology behavior remain open. Every Board/focused-Group/List record now also carries one
   persistent native 40 px Select/Deselect index control, and real optional metadata
   becomes one localized, ruled Details docket row with exact sheet focus return.
   Bounded production-fragment references cover 1280×720 and 800×720 light plus
   560×720 dark zh-TW without horizontal overflow; installed real-data, keyboard/
   screen-reader, forced-color, and navigation evidence remains open. The resulting
   selection now ends in one responsive Locus Index action docket: exact count,
   guarded Open, identity-editor Stack, and receipt-gated Archive/Move with
   localized Undo and exact Open-destination recovery. Bounded references cover
   1280×720, 800×720, 560×720, light/dark, and keyboard focus; its installed
   storage, real-data, navigation, and assistive-technology behavior remains open.
   Opened Tabs
   now reads as a live browser-source ledger with
   distinct loading/error/empty/no-match states, native named Switch, persistent
   40 px Select/Close, visible selected-save receipts, exact pointer/keyboard
   context actions, and a truthful 821–1280 px drawer. Its installed real-data
   pixels and Chrome effects remain open. The
   selected-as-Group path and all six Board/List Group/Stack drop entries now share
   one exact destination transaction and localized receipt with Undo/Open
   destination; installed native drag, tab cleanup, and receipt focus remain open.
   The
   asked single-tab flow, ask-every-time-off
   quick capture, and both whole-window modes now offer explicit, receipt-gated
   continuations without forced navigation or a duplicate Home recovery surface.
   The Welcome → Inbox handoff now lands on a keyboard-visible native Open action;
   Board Arrow navigation and detail return prefer that control, focused Group
   routes render saved items expanded without changing the stored collapse
   preference, and invalid saved addresses fail closed.
   Run the
   installed keyboard/screen-reader, light/dark, en/zh-TW, reduced-motion,
   1280×720/800 px, reload/navigation, and real capture checks. Include the
   privacy-aware context-menu/shortcut receipt, Home Locus Trail, Find-again
   Search (query/filter reload, IME/Enter,
   click/double-click, exact destination, safe Open, Search-owned Details), previews,
   and the saved-item recovery sheet on Home, board,
   group, All Links, and Read Later routes:
   include Group **Open all** and selection **Open** with already-open live and
   suspended destinations, mixed stale/unsafe saves, failed profile reads,
   unknown-effect stopping, competing activation, persistent inline recovery,
   exact focus return, and English/native zh-TW summaries;
   verify individual foreground/background live and suspended creation plus
   foreground reuse through their final exact tab read, including exact pending,
   conflicting pending, wrong active state, and unreadable final receipts;
   exercise Library query/status/sort/item reload and Back/Forward behavior,
   complete destination wrapping, one Read Later queue, anchored keyboard menus,
   list-mutation focus, privacy blur, and stale/filtered exact-target refusal;
   Open, direct-field saving/saved/error states and write-failure recovery, item
   reminder set/change/clear, stale items, Tab containment, nested Escape, focus
   return, Back/Forward, and reload. Include Archive → Trash →
   permanent deletion in both locales, with cancel, persistence failure, focus
   return, and screen-reader announcement. Then run the
   representative-user activation protocol: save one real tab, see its
   destination, navigate away or reload, then find and reopen it without coaching.
3. **Define a separately backed-up legacy organization repair before changing
   stored hints** — the current organization-facing shell, import diagnostics,
   Explorer, capture paths, generated Groups, naming/move/removal dialogs,
   Group/Stack identity, Duplicate Group, Paste links, and rich-text Link action
   now use the bounded Workspace/Space/Group language and exact-target or exact-
   selection contracts. Do not broadly rename the durable `categories`,
   `activeCatId`, `categoryId`, route, reminder-owner, or import/export fields.
   The removed legacy direct Group-move path may have left ambiguous
   Canvas/capture/Archive/Trash restore hints in profiles that used it. Same IDs
   and stale positions do not establish authoritative provenance, so any repair
   requires an owner-approved migration contract plus a separately restorable
   backup before mutation.
   Keep populated workspace/Space deletion unavailable until a later owner-approved
   container recovery and restore-destination contract exists.
4. **Validate the complete reminder path in installed MV3** — non-detail Board
   and Calendar item Set/Change/quick/Clear/reschedule, Group/Space
   add/edit/reschedule/removal, and Calendar Add-task now resolve frozen exact
   identities and wait for the centralized state-plus-alarm receipt before
   success. Shared relative-time projections and the complete Calendar recovery
   shell repaint in English/native zh-TW. Exercise the combined paths across real
   storage/message/alarm/service-worker lifetime, restart/sleep, notification
   delivery, native drag, keyboard/screen-reader, light/dark, 1280×720/800 px,
   reload/navigation, and representative-user recovery. Preserve schema-12
   reminder IDs, import compatibility, Past Due recovery, focus, and Escape
   ordering without broadening Calendar into a second task editor.
5. **Resolve remaining owner launch decisions** — decide the license/business model,
   investigate the Locus name collision before store submission, and approve only
   claims that have passed the canonical evidence ledger. The initial Store scope
   is now decided: focus on save/organize/recover browser context and exclude
   generic trackers from the candidate.
6. **Space layout fidelity triage, after the gates above** — Canvas, Explorer,
   Gallery, Graph, Timeline, and the Space Details layout are functional but
   uneven. Keep them under Advanced views until the core loop passes and each
   promoted view earns fresh rendered and user-flow evidence.
   2026-11-06 (page board): the Space page's seven view tabs replaced the
   Advanced views grouping; the Switch layout button and both menus are gone.

## Done (newest first)

- **2026-11-07 - Final-review fixes for the Inbox, Library and Space pages (R1-1 to R1-15).**
  The Library keeps unchanged rows and draws 120 at a time (the rest as the list scrolls, or Show
  more): at 614 links a repaint went from 1.0–1.5 s to about 30 ms and a filter keystroke from
  500–690 ms to about 20 ms. The Inbox repaint at 300 items keeps its rows (360–610 ms to about
  20 ms); the Space reminder sheet opens in place (190–360 ms to about 5 ms). Privacy blur covers every rebuilt
  page (a suite walk keeps the list complete). Shift-click in the Inbox covers drawn rows only; Sort
  progress counts waiting items only and Undo puts it back; one floating layer (picker, Details,
  drawer, menu); focus returns to the restored card after Undo on the Space page and to the row
  after Details. Text on the three pages holds 4.5:1 in all 19 themes (theme-aware inks, the triage
  card included); every Space target is 44 px on both sides; the Inbox card fits beside an expanded
  rail at 390 px (container queries); the Library view pill shows its whole name and count at 390 px;
  the List carries its Group colour as a full-height locator again. Space quick times and the
  reminder picker keep the clock time across DST. Suites: inbox page, library page, space page,
  privacy settings, onboarding; 35/35 mutations caught. Evidence:
  `locus-redesign-evidence/pages/fixes-r1/` (Edge 157: 55/55 after, 9/55 before on HEAD 88bba46).

- **2026-11-07 - Final-review fixes for Details, Find again with the palette, and the Calendar (R2-1 to R2-18).**
  Focus returns to the same Calendar control after paging, a view change, Undo and quick add, and
  leaving Search or the Calendar lands on a control, never `<body>`. Quick add on today after 9:00
  takes the next whole hour. Move to and the Details quick times keep "every 2 weeks"; Tomorrow and
  Next week keep the clock time across DST. Escape folds Details' quick times first; one-key shortcuts
  wait behind Details or a dialog; Archive drops the id from the address. Enter right after typing
  opens the first result; arrows reuse the painted rows (about 20 ms to 3.5 ms a press at 1,500 items);
  the palette lists links once per open (13–15 ms to 7 ms a key). Calendar, Details, Find again and
  palette text holds 4.5:1 in all 19 themes (theme-aware inks); the listed targets are 44 px boxes;
  the palette field shows its focus again. Suites: calendar page, item detail, search page, search
  recovery, reminder overdue, core visual; 41/41 mutations caught. Evidence:
  `locus-redesign-evidence/pages/fixes-r2/` (Edge 157, 13/13 proof checks).

- **2026-11-07 - Final-review fixes for Archive & Trash, Settings and the popup (R3-1 to R3-10).**
  Delete forever removes exactly the chosen entries by identity (twins that share a key no longer
  collapse; an unrelated entry can no longer be removed). Focus after a write lands on a visible
  control and never the filter field, so Ctrl+Z and Escape keep working, also at 390 px. One floating
  layer on Archive; the All chip is 44 px. Settings and Archive text holds 4.5:1 in all 19 themes
  (theme-aware inks). A later appearance change withdraws the Use core defaults Undo. Popup Undo closes
  the Move list; Move follows Skip duplicate URLs. Suites: archive page, trash recovery, settings page,
  popup page, appearance settings, library recovery; 28/28 mutations caught. Evidence:
  `locus-redesign-evidence/pages/fixes-r3/` (Edge 157: 38/38 after, 9/38 before on HEAD 6684069).

- **2026-11-07 - Settings built from its canvas board (pages build, page 8 of 9).** Settings is a
  page beside the rail (`Settings.dc.html`): a big heading, seven sections with a sliding white pill
  (General, Appearance, Capture, Plan, Shortcuts, Privacy & data, About), and cards of rows with
  springy switches. The work area goes inert while it shows; the rail, any route change or Escape
  leaves it. New: the Plan section (Auto-plan rules through Plan's own setting, and the AI companion
  off switch on the optional nativeMessaging permission, no stored field), the theme preview
  crossfade and sliding ring, Undo on Use core defaults, the filling download whose receipt names the
  file, Clear on an empty shortcut filter. Privacy, Storage and Import & Export are one section.
  Hints, sub-lines and the Capture contract stay as hidden descriptions. Capture copy names the
  popup's Save. Suites: new `settings-page-contract-test.js` (294 checks); ported general, appearance
  and privacy settings, core visual system, quality gates, canvas pages, onboarding. Evidence:
  `locus-redesign-evidence/pages/settings/` (Edge 157, 68/68 checks, `pages-settings-log.txt`,
  25/25 mutations in `mutation-results.txt`).

- **2026-11-07 - Archive & Trash built from its canvas board (pages build, page 7 of 9).** One page
  for both collections (`Archive.dc.html`): a big heading, an Archive / Trash switch whose thumb slides
  and whose counts roll (a growing count bumps), one filter field and the type chips, then the entries by
  day as quiet rows. Each row keeps its filing line ("Restore to Workspace › Space › Group", never cut)
  and, in Trash, the days left (orange when 3 or fewer); its icon turns into its check box. Restore,
  Move to Trash and Delete forever are the same receipt-gated transactions; once storage accepts one, the
  Restore pill turns green and the row arcs out, or the row flies to the Trash tab, or dissolves; the
  shared receipt keeps Undo and a row brought back drops in. Delete forever now asks on the shared
  Keep / Delete receipt naming the item (the modal Trash dialog is gone); the ask holds its entries by
  key, so an Undo or Restore that takes one out of Trash closes it and a late Delete reports nothing
  (review findings A-1, A-5); focus lands on the neighbour row after every write (A-6); an asked row is
  struck through at full contrast (A-7). The selection bar replaces the tools row and keeps the filing
  manifest (one route, or every destination with its count, or why to restore separately). Empty states
  are one line and one button. Phone: title beside the pick and More, meta under it. Performance at
  1,024 archived entries (Edge 157): a repaint went from 620–920 ms to about 15 ms (one-pass Restore
  index, rows 120 at a time, unchanged rows kept). No new stored field. Suites: new
  `archive-page-contract-test.js` (218 checks, in CI); `trash-recovery` rewritten for the ask;
  `library-recovery`, `library-page`, `canvas-pages`, `archive-scale`, `core-visual-system`,
  `organization-creation/move/removal/delete` and `paste-links` ported. Evidence:
  `locus-redesign-evidence/pages/archive/` (`pages-archive-log.txt`, `mutation-results.txt`,
  `perf-before-after.txt`).

- **2026-11-07 - Just Today: Today is the only new tab; the calm new tab is gone.** Kai's
  decision ("Just Today"). Removed the calm launch layer (split-flap clock and timer, greeting,
  saved-page search, three recent pages, "Show Today instead", chips, tone), its Settings
  toggle and "Name on Welcome screen" with its draft/Save handling: 19 layer functions, 6
  settings/name helpers and the now-unused `activeThemeMode`; 26 strings in EN and zh-TW; the
  landing and name markup; 13 CSS edits (the calm layer, three older landing layers and their
  media/forced-colour lines, the name field). Workspace extras keeps window
  switching. First-run Welcome and Today's rolling clock are unchanged. Stored `showLanding`
  and `profile.name` are carried untouched and never read (no schema bump); old exports with
  both still import. Suites: `canvas-pages` (no landing layer even with `showLanding: true`
  stored, booted in a VM; Today's clock rolled in a VM), `general-settings`,
  `export-import-scale` (new retired-key import cases), `state-sync`, `search-recovery`,
  `saved-page-reopen`, `popup-locate`, `item-detail`, `onboarding`, `reminder-overdue` and the
  five organization suites ported; 19 mutations caught. Evidence:
  `locus-redesign-evidence/pages/just-today/` (Edge 157, 24/24 checks, `just-today-log.txt`).

- **2026-11-06 - Calendar built from its canvas board, inside Plan (pages build, page 6 of 9).** The
  Calendar view (`Calendar.dc.html`) keeps Plan's header and adds one toolbar row (Month / Week / Agenda
  with a sliding thumb, Today, paging, the period, the operator filter with a count and Clear), a Past due
  strip (each overdue reminder with Move and a red count) and the view beside a day panel. The grid selects
  a day (a blue box slides to it; arrows, Home, End; Enter goes to the add field; the panel slides in from
  that side); the panel lists the day's reminders (the title opens it, Move to offers Today, Tomorrow, the
  next weekday, This weekend and Next week at the same time of day, then Edit reminder… and Clear / Remove)
  and adds a task through the same receipt-gated Add-task transaction (the reviewed dialog stays on the
  day's right-click / Shift+F10 menu). A move goes through `setReminder` / `commitEntityReminderMutation`
  with a "Moved to …" receipt and Undo, the card travels to its new day and lands, and Plan's "moved N
  times" mark counts it. Today pulses once when the view opens. No breadcrumb bar (as on Upcoming); phone:
  dots in the month, a stacked week, the panel under the view. No new stored field. Suites: new
  `calendar-page-contract-test.js` (190 checks, date rules in 3 time zones, in CI); ported
  `reminder-overdue`, `reminder-identity`, `item-detail`, `calendar-add-task`; 32 mutations caught.
  Evidence: `locus-redesign-evidence/pages/calendar/` (Edge 157, 87/87 behaviour checks,
  `pages-calendar-log.txt`; `00-before-*` are the old view).

- **2026-11-06 - Toolbar popup on its canvas board, with one-click Save (pages build, page 9).** The popup is rebuilt from
  `Popup.dc.html`: a current-tab card whose Save morphs into a green check with a burst and bumps the red
  Inbox count, a destination chip with a list of every Group, rows with hover Save / Hibernate and saved
  marks, a bottom bar with Save window and Hibernate, the More menu, and the one notification card. Save
  is one click (Kai, 2026-11-06): it goes straight to the chip's quick-save destination and the receipt
  "Saved to <Group>" offers Undo, Move and Locate with the 5.2 s drain (held on hover and focus); Undo
  removes exactly that item and Move picks another Group, both through the receipt-gated state write.
  Save window follows the same rule ("Saved N tabs · Open destination"). "Ask where to save" is now an
  opt-in, off for new profiles; a profile that stored true keeps the sheets. Every earlier control is kept
  or one click away. Suites: new `popup-page-contract-test.js`; ported popup-locate, core visual system,
  notifications, canvas pages, concurrency, onboarding (defaults) and quality gates. Evidence:
  `locus-redesign-evidence/pages/popup/` (Edge, 380 x 600, light, dark, zh-TW, reduced motion, three
  older themes; one-click shots `60-*`), `pages-popup-log.txt` and `60-popup-oneclick-log.txt`.

- **2026-11-06 - Find again and the command palette built from their canvas boards (pages build, page 5 of 9)**
  - **What:** Find again is one page: the heading, one search field whose
    operators are marked as the shared parser understands them (blue for
    where, green for is:, grey for type: and colour:, struck through for a
    minus) with the result count rolling inside it, the content-type switch
    with a sliding pill and rolling counts, Filters (a chip panel; a blue
    bubble counts hidden filters) and the sort, then the results in one card.
    Matched words are marked in titles, sources and a note's matching line; a
    highlight glides to the selected row (arrow keys, focus) or the row under
    the pointer, and the selected row shows Details and what Enter does (Open
    for a page, Details otherwise). The preview pane is gone: each row is the
    Open action, Details sits on openable rows, the exact saved path stays
    under every title. One empty state with one next step (Search all spaces
    when scoped, else Clear filters, else Clear search). Escape clears a typed
    query first, then leaves. The palette opens with a 220 ms scale-in, is one
    column (Quick actions, Go to, Recently saved, Shortcuts), a highlight
    slides between rows, the typed text (or the words it used) is marked, the
    selected row shows Run or Open, only a moving pointer changes the
    selection, and no footer or helper lines remain. Opening the palette
    closes Details, a menu and the Today drawer (and Details opening closes
    the palette); opening Find again closes a menu. Large libraries: the
    query is parsed and every row scored once per search, note text is
    remembered, rows off screen are not laid out, and the rows past the first
    screen arrive on the next frame (1,500 items in Edge: 22 to 29 ms median
    settled repaint per keystroke, was about 70 ms).
  - **Evidence:** new `search-page-contract-test.js` (149 checks, in CI);
    `search-recovery`, `core-visual-system`, `canvas-pages` and
    `item-detail` ported; 22 mutations caught; every `scripts/*.js` suite
    passes; Edge 157 proof (69 checks) with screenshots in the shared notes
    `locus-redesign-evidence/pages/search/`.

- **2026-11-06 - Item details built from its canvas board (pages build, page 4 of 9)**
  - **What:** the details panel is the board's 480 px layer: a colour band,
    the kind pill, the full location as the Move control (the Inbox page's
    Space picker folds open under it; same move transaction and Undo; the new
    location rolls in, or the panel closes when the item left the page) and
    Close; the title edits in place through the existing receipt-gated field
    commit (blue underline, green once stored); Open link, Favorite and Read
    later with Undo, Copy URL; why it was saved; the orange reminder chip with
    Change / Clear, quick times and Pick a time…, filling with a tick when set;
    tags; More details; Archive in the footer. The Link review and formatting
    bar take the board's look while Details is open. Opening Details closes a
    menu and the Today drawer, and S stays off behind it. Phone: full width,
    fields stacked, 44 px targets, no horizontal scroll.
  - **Evidence:** `item-detail-contract-test.js` extended (board contracts in
    a VM, ported CSS and location assertions) and `core-visual-system` ported;
    23 mutations caught; all 44 `scripts/*.js` checks pass; Edge 156 proof
    (101 checks) with screenshots in the shared notes
    `locus-redesign-evidence/pages/details/`.

- **2026-11-06 - Space page built from its canvas board (pages build, page 3 of 9)**
  - **What:** a Space opens on one page: its name with a rolling item count
    and an orange reminder chip, one More for Rename, reminder and Delete, and
    one switcher for all seven views (the board shows them all, so the
    "Advanced views" submenu gives way to tabs) whose underline slides while
    the views crossfade. Board groups are columns in a grid with the chevron,
    colour dot (edits the group), name (opens the group page), count bubble,
    to-do progress, Open all, More, the reminder chip and intention, then Save
    here and Add record; cards are the shared cards drawn as quiet white cards
    (whole card opens, More on hover, the lead mark turns into the select box)
    and new or restored ones drop in. List groups are white panels with rows
    and the saved day. Set reminder on a group or the Space opens an inline
    sheet of quick times over the same reminder transactions, with Undo.
    Canvas, Explorer, Timeline, Gallery and Graph keep their behaviour with the
    board's look; Timeline, Gallery and Graph lose their hard-coded English. The
    dark selection bar and the filterable Move picker now serve this page too.
    At phone width columns and cards take the full width (Open all moves to
    More, long group names wrap), and List rows put source and chips under the
    title. Column resize now lives on Canvas only.
  - **Evidence:** `space-page-contract-test.js` (208 checks, 16 mutations
    caught); `onboarding`, `group-stack-identity`, `inbox-page` and the three
    organization suites ported; all 44 `scripts/*.js` checks pass; Edge 156
    proof with behaviour checks and screenshots in the shared notes
    `locus-redesign-evidence/pages/space/`.

- **2026-11-06 - Library page built from its canvas board (pages build, page 2 of 9)**
  - **What:** All links, Favorites and Read later are one page with a big
    heading and one row of controls: a view switch whose pill slides and whose
    counts roll, the Unread/Read/All switch in Read later, the filter (matches
    marked in titles) and the sort. Saved pages are quiet rows in one card; a
    highlight glides to the row under the pointer or focus, the whole row opens
    the page, and Details, Favorite, Read later and Archive show on hover (at
    phone width and on touch they fold into More). Favourite pops with a burst,
    a page sent to Read later flies its bookmark and ticks that count, the
    round read tick fills, leaving rows fold away, and the receipts offer Undo.
    The scope chip, toolbar rows and empty-state paragraphs are gone; every
    action is kept. Escape that clears the filter no longer also leaves the page.
    At phone width a row is the title beside a small icon (the read tick in
    Read later) and More, with the destination wrapping whole on one meta line
    across the row below, followed by the source and the date.
  - **Evidence:** `library-page-contract-test.js` (149 checks, 12 mutations
    caught); `library-recovery`, `canvas-pages`, `inbox-page` and
    `privacy-settings` suites ported; all 43 `scripts/*.js` checks pass; Edge 156 proof with 93
    behaviour checks and screenshots in the shared notes
    `locus-redesign-evidence/pages/library/`.

- **2026-11-06 - Inbox page built from its canvas board (pages build, page 1 of 9)**
  - **What:** the Inbox group opens on its own page instead of the generic
    group page: a big heading with the red waiting count that rolls, one dark
    triage card (1/2/3/A/→ through Plan's `planSortQueue`/`planSortDecide`/
    `planSortTally`; the card leaves toward its answer and Undo brings it back),
    a filterable Move to a Space picker, clean rows with hover actions and
    status chips, the dark selection bar, and an "Inbox is clear." moment with
    the session tally. The breadcrumb, description box and column are gone; the
    description, group reminders, record creation, Save here, Open all and the
    group actions sit in the header More menu; rows keep the record menu, drag,
    selection, reminders and details. Other groups keep the group page.
  - **Evidence:** `inbox-page-contract-test.js` (195 checks, 10 mutations
    caught); all 42 suites; Edge 156 proof with 77 behaviour checks and
    screenshots in the shared notes `locus-redesign-evidence/pages/inbox/`.

- **2026-11-06 - Roll-over moves only yesterday's to-dos (owner decision, P2)**
  - **What:** roll-over moves an open, non-repeating to-do only when it was due
    yesterday (the local calendar day before the run). Older overdue to-dos stay
    put and show as overdue on Today and in Plan's Today lane, including after
    a day when Locus was not opened. Workspace scope is unchanged. The failure
    and Undo history copy now name yesterday's to-dos (EN and zh-TW).
  - **Evidence:** `plan-page-contract-test.js` (296 checks: yesterday's bounds,
    older and done to-dos left alone, the day-away case, real State Undo
    restoring exactly what moved); all 41 suites.

- **2026-11-06 - Triage section 1 fixed (second review of the canvas branch)**
  - **What:** the 46 "fix now" findings, one commit per area: Today capture
    parsing (passed default times roll, spaced and full-width zh-TW times, 12
    tonight, `today's`, quoting), repeating to-dos on Today, Someday on Today,
    focus kept across repaints; Plan roll-over (duplicate ids, partial batch,
    instant claim, landing-day toast), Even out on the bar's count, Sort tally
    and repaint, move counts following Undo, focus after moves; receipts (dead
    Undo never promoted, drain really pauses, hover flag, Retry and Keep result
    states, no native confirm/alert), due card across workspaces, pages and
    notes, 24-hour times, fired-occurrence keys; popup layer root, selected
    rows, calendar cells, toggle contrast; resting page Loading/Loaded and Locus
    settings, minute clock, localized postmark.
  - **New stored field:** `reminder.firedAt` (optional, item reminders only):
    the occurrence the background last fired for a repeating reminder. Today
    and the due card read it; a time the user sets clears it. No schema bump.
  - **Evidence:** all 41 suites on Node 26 after each commit and on Node 22 at
    HEAD; Edge 156 computed-style and behaviour checks; a fresh-context review
    whose findings 1-7 were then fixed.
  - **Left for the owner:** P2 roll-over scope (since decided, see above), P14
    wording, T5 bare `3點`, T7 undated to-dos at midnight, S3, S8, R4, and T6
    two-digit bare times (see
    the triage report in the session notes).

- **2026-11-06 - Review fixes for the canvas steps**
  - **What:** thirteen findings from a fresh-context review fixed (roll-over
    hydration default, due card Done/Undo/focus, repeating and stale Snooze,
    Someday for today's to-dos, Sort focus and animation, roll-over claim, Escape
    precedence, resting-page link, tone toggle label). See DESIGN.md 2026-11-06.
  - **Evidence:** plan-page 243, notifications 85, canvas-pages 62 checks; Edge 156.

- **2026-11-06 - Remaining pages on the canvas (canvas step 6)**
  - **What:** one CSS layer for boards, Library modes, Archive/Trash, Search, Item
    details, command palette, Settings, Calendar, and popup; sub-lines trimmed;
    board cards no longer shrink in a full column.
  - **Evidence:** `canvas-pages-contract-test.js` (60 checks); Edge 156 pass.
  - **Not done:** these boards were not reviewed by Kai yet, so layout and behaviour
    changes beyond restyling were left alone on purpose.

- **2026-11-06 - Welcome, calm new tab, resting page (canvas step 5)**
  - **What:** Welcome envelope with stamp, postmark, and Inbox tray around the
    unchanged first-save transaction; calm new tab flip clock, three recent pages,
    Show Today instead, dark default with a per-device light option; resting page
    card with Load page, Enter hint, Loaded, and placeholder note (no idle copy).
  - **Evidence:** `canvas-pages-contract-test.js` (51 checks); Edge 156 pass.
  - **Not done:** "Change" on the resting page opens Locus in a new tab rather
    than a specific setting (no settings deep link exists yet).

- **2026-11-06 - One notification style (canvas step 4)**
  - **What:** shared dark receipt card with icon circle, sub-label, drain bar, two-deep
    stack, in-place Undo/Retry morphs, Escape; popup receipt restyled; in-Locus due
    reminder card (Done / Snooze); system reminders show title, "Due HH:MM · Space",
    and Done / Snooze 10 min buttons answered by the background.
  - **Changed decision (owner-confirmed 2026-11-06):** Undo receipts drain over
    5.2 s (pause on hover/focus); previously they stayed until dismissed. See
    DESIGN.md 2026-11-06.
  - **Evidence:** `notifications-contract-test.js` (74 checks); Edge 156 pass.
  - **Not done:** system notifications were not seen on screen; inline form status
    lines were left inline on purpose.

- **2026-11-06 - Plan page (canvas step 3: Upcoming, Sort inbox, Auto-plan)**
  - **What:** `plan.js` adds the Plan surface on the calendar route (Upcoming lanes,
    This week bar with Even out, Sort inbox, Auto-plan pill) and the rail Plan item;
    the Calendar is a Plan view and "Plan with AI" lives in the Plan header. Two
    settings keys (`planWarnOverload`, `planRollOver`); no schema change.
  - **Evidence:** `plan-page-contract-test.js` (237 checks); throwaway Edge 156 pass.
  - **Not done:** "After 3 moves, ask if it still matters" and "Each Monday, bring
    back one Someday item" (left for later on purpose); "Put in a space" in Sort
    inbox; Group and Space reminders appear in the Calendar view only, not in lanes.
    Someday marks and move counts are per device and are not exported.

- **2026-11-06 - Today board (canvas steps 1 and 2: palette, fonts, Home)**
  - **What:** canvas palette and brand font tokens in `themes.css`; Bricolage
    Grotesque bundled with its OFL notice; Home rebuilt as Today (rolling clock, Now
    card with check and Later, Rest of today, highlighting capture bar, open-tabs
    edge tab over the existing rail). Today is derived from existing to-do fields;
    no permission, manifest, or schema change. Later order is per-device
    `localStorage` (`locus.today.later`), scoped to the day.
  - **Evidence:** `today-contract-test.js` (189 checks); updated Home assertions in
    onboarding, organization delete/removal/naming, item-detail, and the quality
    gate; throwaway Edge 156 profile over CDP (capture en/zh-TW, check, Later, card
    toggle, drawer open/Escape/scrim, Light/Dark, 1440/390 px, reduced motion).
  - **Not done:** the Trail, Home Inbox zone, and Space register builders are no
    longer rendered but are still in `newtab.js` with their tests; remove them in a
    cleanup slice. Space rename/delete/reminder now live only in the sidebar Space
    context menu (the Home card's visible More is gone). A "today" flag for to-dos
    without a reminder would need a schema field; for now they count only on the
    day they are created. At 820 px and below the edge tab is hidden, like the rail.
    Installed-extension screen-reader output was not checked.
  - **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-11-06 - AI planning for day, week, and month (Calendar planner + local MCP companion)**
  - **What:** `plan-contract.js` (`locus.plan/v1`), `planner.js` (Calendar **Plan with
    AI** sheet: plan create/edit, day/week/month, range, time zone, Claude/Codex/Gemini
    profiles, copy prompt, paste import, preview, receipt-gated Apply with Undo),
    schema 14 (`plans[]`, item `plan` provenance), and `companion/` (stdio MCP server,
    Native Messaging host with per-profile pairing and a bounded queue, opt-in local
    runners, Windows setup CLI). Optional `nativeMessaging` permission only.
  - **Evidence:** `plan-contract-test.js` (176 checks), `plan-companion-contract-test.js`
    (66), `calendar-planner-contract-test.js` (556), quality gates, export/import
    schemas 0-14. Throwaway Edge 156 profile over CDP: create/save/reload, invalid
    date, DST gap, conflict, Apply, Undo, re-apply, duplicate import, zh-TW, Escape,
    400 px. Real clients: Claude Code CLI and Codex CLI submitted over MCP; Antigravity
    CLI ran as a runner through `native-host.js`; their drafts were previewed and one
    applied in Locus by paste. Details and gaps: `companion/README.md`.
  - **Not exercised:** the browser launching the host (no HKCU registration in this
    pass), so Connect/Share/Check/Generate were not clicked in a browser; Claude
    Desktop, Codex desktop, Antigravity's MCP client, Gemini CLI.
  - **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-11-05 - Fresh profile opened the reload dialog: storage key order, fixed**
  - **Root cause:** `chrome.storage` hands every object back with sorted keys, and
    `State` compared graphs as raw `JSON.stringify` strings. The default graph that
    a fresh profile builds (and the `category.layout` that the boot layout pass
    appends on the next open) keeps insertion order, so the page's own
    `storage.onChanged` echo never matched its write. Echo before receipt: the page
    sees a newer revision while its write is pending, requires recovery, and the
    receipt then fails with "must reload the latest saved data". Receipt first: the
    equal-revision echo fails the same comparison ("changed in another window").
    The service worker writes nothing at startup. The boot
    `setViewMode(getViewMode())` call persisted unconditionally, which is why every
    open wrote a `_revision`-only change; profiles with `layout` already stored
    (Kai's) echoed in order and showed no dialog.
  - **Change:** `State` compares graphs as sorted-key JSON (null-prototype copies, so
    an own `__proto__` key still counts); `setViewMode()` persists only a real
    layout change; `persistBootChanges()` after the first render saves on-demand
    slices (Pomodoro, floating widgets, window bindings) once when the graph
    differs, which the old unconditional boot write used to cover. New
    `scripts/state-storage-order-contract-test.js`, in the VERIFY static block and
    CI. No schema, permission, element-id, copy, or network change.
  - **Evidence:** headed Brave 1.98 and Edge 156 throwaway profiles over CDP, with a
    probe on write sends, receipts and `onChanged`. HEAD showed the dialog on the
    first open (send rev 0, sorted echo rev 1, then receipt) and on the next open.
    Fixed HEAD and fixed working tree show the onboarding with no dialog in both
    browsers; a later open writes nothing (Edge second tab, Brave relaunch and
    second tab). A fresh-context review of the first commit found that dropping the
    unconditional boot write left render-created slices unsaved; the follow-up
    commit saves them and the suite covers it. The new suite fails on the unfixed code
    with the browser's error and passes with the fix; the HEAD-based VERIFY block
    passes. On the working tree the pre-existing item-detail,
    group-stack-identity and concurrency failures remain (`isPopupCapturableUrl`),
    unchanged with the fix reverted.
    **Implemented: yes. Verified: partial (throwaway profiles, not Kai's live
    profile). User-validated: no. Released: no.**

- **2026-11-04 - Brave new tab opened Google: competing extension, user fix documented**
  - **Root cause:** Custom New Tab (redirects to google.com) is enabled in Kai's
    Brave and disabled in Edge. Chromium serves the first enabled entry in the
    profile's ordered new-tab override list, and a newly installed extension goes
    first. The other extension takes the new tab when it was installed after Locus,
    or when Locus is off or fails to load. Not Locus code, not a Brave setting.
  - **Change:** README Install troubleshooting note: turn the other extension off or
    remove it, and do not remove Locus, which deletes its data. No code, schema,
    permission, copy, or element-id change.
  - **Evidence:** throwaway Brave 1.98 and Edge 156 profiles with Locus and Custom
    New Tab (redirect pointed at a local stand-in). A new tab landed on the stand-in
    in both. After `chrome.management.setEnabled(false)` from the extensions page,
    the next new tab was Locus, with no page or worker errors. Kai's live Brave lists
    Locus first and Custom New Tab's storage has not been opened since 2026-07-16
    04:53, so the redirect was not reproduced in the live profile.
    **Implemented: yes. Verified: partial (throwaway profiles over CDP).
    User-validated: no. Released: no.** Kai turning the extension off in the live
    Brave remains open.

- **2026-08-13 - Selection Open reflects recoverable pages**
  - **Acceptance criteria implemented:** the selection docket enables Open only
    when at least one selected saved page passes the shared Reopen URL allowlist;
    mixed selections retain their recoverable partial path.
  - **Compatibility boundary:** unsupported retained/imported records, Details,
    exact bulk identity, partial-result recovery, schema, permissions, and local-
    only behavior remain unchanged.
  - **Evidence:** the red production-render case enabled Open for an unsafe-only
    selection. Green disables that action and keeps it enabled for unsafe plus
    HTTPS. Focused Reopen, selection-docket, syntax, quality, and diff checks pass.
    **Implemented: yes. Verified: partial (production-extracted/static only).
    User-validated: no. Released: no.** Installed DOM/AT, real Chrome effects,
    representative-user approval, and release remain open.

- **2026-08-13 - Open destination reveals nested Stack ancestry**
  - **Acceptance criteria implemented:** after exact post-route receipt
    revalidation, the continuation transiently reveals every outer-to-inner Stack
    before focusing the deepest destination in Board or List markup.
  - **Compatibility boundary:** stored collapse flags, history, Undo, persistence,
    exact duplicate-path failure, fallback focus, schema, permissions, and local-
    only behavior remain unchanged.
  - **Evidence:** the red production-controller case focused a clipped leaf. The
    green case reveals both collapsed ancestors in order and preserves fail-closed
    identity. Focused onboarding, syntax, quality, and diff checks pass.
    **Implemented: yes. Verified: partial (production-extracted/static only).
    User-validated: no. Released: no.** Installed rendering/focus,
    representative-user approval, and release remain open.

- **2026-08-13 - Search shows nested Stack destinations**
  - **Acceptance criteria implemented:** result text, accessible result labels, and
    Saved-in detail now show Workspace, Space, localized Group, and every frozen
    parent Stack in order.
  - **Compatibility boundary:** root-level paths, Inbox localization, exact Search
    recovery identity, routes, Reopen, schema, permissions, and local-only behavior
    remain unchanged.
  - **Evidence:** the red production-helper case omitted `Project → Reading`; the
    green case renders the full exact path and current-location markup. Focused
    Search, syntax, quality, and diff checks pass. **Implemented: yes. Verified:
    partial (production-extracted/static only). User-validated: no. Released: no.**
    Installed rendering/AT, representative-user approval, and release remain open.

- **2026-08-13 - Welcome skips a recent Inbox duplicate**
  - **Acceptance criteria implemented:** first-save discovery now applies the exact
    active-Inbox duplicate preference before ranking the fresh current-window
    inventory. A popup/context-menu-saved newest page no longer blocks an older
    unsaved eligible page.
  - **Compatibility boundary:** duplicate-off and absent-Inbox ranking, unsafe and
    changing-page rejection, exact source/destination rechecks, receipts, guarded
    close, schema, permissions, and local-only behavior remain unchanged.
  - **Evidence:** the red production Welcome case displayed the newer duplicate.
    The green case displays and saves only the older unsaved source. Focused
    onboarding, syntax, quality, and diff checks pass. **Implemented: yes.
    Verified: partial (production-extracted/static only). User-validated: no.
    Released: no.** Installed ordering/effects, rendered feedback,
    representative-user approval, and release remain open.

- **2026-08-13 - Top-bar and Palette Save skip a recent Inbox duplicate**
  - **Acceptance criteria implemented:** both shortcuts now apply the exact active-
    Inbox duplicate preference before ranking the fresh current-window inventory.
    A newer filed page no longer blocks an older unsaved eligible page.
  - **Compatibility boundary:** duplicate-off ranking, absent-Inbox provisioning,
    unsafe/pending filtering, recency ties, final duplicate recheck, receipts,
    source cleanup, schema, permissions, and local-only behavior remain unchanged.
  - **Evidence:** the red production-caller case dispatched the newer duplicate.
    The green top-bar and Palette cases review/dispatch only the older unsaved
    source. Focused onboarding, syntax, quality, and diff checks pass.
    **Implemented: yes. Verified: partial (production-extracted/static only).
    User-validated: no. Released: no.** Installed ordering/effects, rendered
    feedback, representative-user approval, and release remain open.

- **2026-08-13 - Skip duplicate URLs reaches pages nested in Stacks**
  - **Acceptance criteria implemented:** new-tab, popup, and service-worker capture
    now collect tab URLs through nested Stacks in the exact destination. Single,
    batch, Home, Hibernate, context-menu, and shortcut paths use that policy.
  - **Compatibility boundary:** traversal is cycle-safe and exact-URL only.
    Duplicate-off behavior, current-batch reservation, exact receipts, cleanup,
    Undo, schema, permissions, and local-only behavior remain unchanged. Stored
    graphs are not normalized or rewritten.
  - **Evidence:** red production-extracted cases accepted an already-nested URL in
    all three runtimes. Green cases reject it without a write while retaining a
    distinct candidate and the duplicate-allowed path. Focused new-tab, popup,
    background, syntax, quality, and diff checks pass. **Implemented: yes.
    Verified: partial (production-extracted/static only). User-validated: no.
    Released: no.** Installed browser effects, rendered feedback,
    representative-user approval, and release remain open.

- **2026-08-13 - Save here skips a recent duplicate for an unsaved page**
  - **Acceptance criteria implemented:** no-selection Group Save now resolves its
    exact destination, applies the stored duplicate policy to the fresh window
    inventory, and then chooses the most recent remaining eligible page. Explicit
    Opened-Tabs selection remains first priority.
  - **Compatibility boundary:** duplicates-allowed, no-eligible-source, and
    all-duplicate results retain their established behavior/copy. Exact receipts,
    persistence, cleanup, Undo, schema, permissions, and local-only behavior remain
    unchanged.
  - **Evidence:** the red production-caller case ignored an older unsaved page when
    the newest was already filed. The green case commits only that unsaved fallback
    once. Syntax, onboarding, quality, and diff checks pass. **Implemented: yes.
    Verified: partial (production-extracted/static only). User-validated: no.
    Released: no.** Installed tab ordering/effects, rendered feedback,
    representative-user approval, and release remain open.

- **2026-08-13 - Group Open all is available only when it can reopen a page**
  - **Acceptance criteria implemented:** one recursive eligibility rule now drives
    Board, List, and menu affordances. Empty, local-record-only, and unsafe-only
    Groups omit the menu action and visibly/semantically disable persistent
    controls; a reopenable page nested in a Stack enables them.
  - **Compatibility boundary:** activation still exact-resolves the rendered Group
    and uses the existing bulk Reopen coordinator. Mixed-item skip/results, copy,
    locales, schema, permissions, and local-only behavior remain unchanged.
  - **Evidence:** the red production-source case found Open all in an empty Inbox.
    The green case proves nested eligibility and one exact safe dispatch while an
    unsafe legacy URL is skipped. Syntax, Reopen, onboarding/UI, quality, and diff
    checks pass. **Implemented: yes. Verified: partial (production-extracted/static
    only). User-validated: no. Released: no.** Installed rendering, keyboard/AT,
    browser effects, representative-user approval, and release remain open.

- **2026-08-13 - First-use organization defaults keep unique retained-safe IDs**
  - **Acceptance criteria implemented:** the empty-state constructor now shares one
    graph-wide allocator across My Workspace, Pinned, Inbox, and Later. It skips
    active/retained identities and reserves every accepted value before allocating
    the next default.
  - **Compatibility boundary:** names, symbols, first-run settings, active pointers,
    schema, storage shape, routes, permissions, and local-only behavior remain
    unchanged. Existing records are not migrated or rewritten.
  - **Evidence:** the red production-default case reused two retained IDs and made
    Later/My Workspace share one ID. The green case forces retained and intra-batch
    collisions, then proves four exact unique defaults and exact active pointers.
    Syntax, state-sync, quality, and diff checks pass. **Implemented: yes. Verified:
    partial (production-extracted/static only). User-validated: no. Released: no.**
    Installed clean-profile first run, first Save/Find/Reopen, representative-user
    approval, and release remain open.

- **2026-08-13 - New Notes and To-dos keep one exact recovery identity**
  - **Acceptance criteria implemented:** Board and command-palette local-record
    creation now allocates Note/To-do IDs against active content, Archive, Trash,
    layout hints, and remembered capture targets before snapshot or mutation. One
    exact object continues through persistence, receipt validation, and Details.
  - **Compatibility boundary:** allocation failure writes nothing and reuses the
    existing changed-target recovery/focus. Existing records are not migrated or
    rewritten; copy, schema, routes, permissions, and local-only behavior remain
    unchanged.
  - **Evidence:** the first production-caller run accepted `active-collision`.
    Green Note and To-do cases force active/Archive/Trash collisions, then prove one
    fresh ID, one acknowledged write, exact inserted-object retention, and exact
    Details handoff. Syntax, onboarding, quality, and diff checks pass.
    **Implemented: yes. Verified: partial (production-extracted/static only).
    User-validated: no. Released: no.** Installed persistence, rendered/accessibility
    behavior, representative-user approval, and release remain open.

- **2026-08-13 - Popup Locate no longer labels a missing target with its old path**
  - **Acceptance criteria implemented:** after accepted persistence, authoritative
    `LOCUS_LOCATE_TARGET_UNAVAILABLE` now leaves the Saved-card destination blank
    and reuses the existing destination-unconfirmed message plus generic Open Locus.
    The source remains open and the accepted mutation is not retried or rolled back.
  - **Compatibility boundary:** worker effect ownership, exact source-close partial
    destinations, other recovery branches, copy, schema, permissions, and local-only
    behavior remain unchanged.
  - **Evidence:** the first production-view run printed `Old Space / Old Group`.
    Green controller/view cases prove one accepted write, one effect, no retry,
    retained item/source/popup, blank path, safe existing message, and primary
    recovery focus. Syntax, popup, quality, and diff checks pass. **Implemented:
    yes. Verified: partial (production-extracted/static only). User-validated: no.
    Released: no.** Installed MV3 ordering, rendered/assistive-technology output,
    representative-user approval, and release remain open.

- **2026-08-13 - Popup Locate no longer hides a failed source close**
  - **Acceptance criteria implemented:** after opening the exact saved-item route,
    a protected, changed, or uncloseable source now returns typed
    `LOCUS_LOCATE_SOURCE_CLOSE_FAILED` instead of full success. The popup stays on
    its existing Saved result, names the current destination, and offers exact route
    recovery; the accepted Save is not retried or rolled back.
  - **Compatibility boundary:** the source remains open, the worker remains the
    effect owner, and native notice creation is recorded as a non-authoritative
    boolean. Existing copy, route format, schema, permissions, and local-only
    behavior remain unchanged.
  - **Evidence:** production-extracted worker cases cover protected/changed/removal-
    failed sources and a failed native notice, with at most one removal attempt and
    no effect retry. The popup cases prove accepted persistence does not close the
    popup on the typed partial and a forged route-less partial becomes effect-
    unknown instead of reaching the renderer. Syntax, popup/background, quality,
    and diff checks pass. **Implemented: yes. Verified: partial (production-extracted/static only).
    User-validated: no. Released: no.** Installed MV3 lifetime, real route/remove/
    notification timing, rendered/assistive-technology output, representative-user
    approval, and release remain open.

- **2026-08-13 - Whole-window Save no longer prints an unavailable path**
  - **Acceptance criteria implemented:** the result card now renders Space/Group
    names only from a validated `destinationReady:true` worker receipt. Unavailable
    and unknown results leave the path blank instead of reusing optimistic names.
  - **Compatibility boundary:** accepted persistence, source protection, one effect
    request, exact recovery identity, generic Locus fallback, copy, schema,
    permissions, and local-only behavior remain unchanged.
  - **Evidence:** a production-extracted destination-loss case proves one write,
    one effect, no retry, no destination projection, and protected source counts.
    Success/partial/unknown/invalid/rejected and recovery cases remain green.
    Syntax, popup, quality, and diff checks pass. **Implemented: yes. Verified:
    partial (production-extracted/static only). User-validated: no. Released: no.**
    Installed MV3 timing, rendered/assistive-technology output, representative-user
    approval, and release remain open.

- **2026-08-13 - Ordinary popup Save revalidates its copy before closing source**
  - **Acceptance criteria implemented:** after persistence acceptance, close-enabled
    ordinary Save now dispatches one worker-owned close action under the writer
    queue. The worker fresh-resolves the exact saved item/URL and source identity
    before any removal. Close-off dispatches no effect.
  - **Compatibility boundary:** an unavailable destination, protected source, or
    unknown effect leaves the source open without retrying or rolling back the
    accepted Save. Existing unavailable/protected recovery copy and Open Locus/Open
    saved item surfaces are reused. Schema, destinations, permissions, copy keys,
    and local-only behavior remain unchanged.
  - **Evidence:** a production-extracted destination-loss case proves
    `persist -> effect`, one dispatch, zero popup tab reads/removals, no write retry,
    and a truthful accepted result. Protected, unknown, success, rejected, duplicate,
    unsupported, proposed-Inbox, and close-off cases remain green. Syntax, popup,
    quality, and diff checks pass. **Implemented: yes. Verified: partial
    (production-extracted/static only). User-validated: no. Released: no.** Installed
    MV3 queue/message lifetime, real storage/tab timing, rendered/assistive-
    technology output, representative-user approval, and release remain open.

- **2026-08-13 - Bookmark import now preserves global identity uniqueness**
  - **Acceptance criteria implemented:** one canonical allocator now owns every
    proposed bookmark Group and item across an import. It skips active identities
    and retained Archive/Trash/layout/Capture hints, reserving each accepted ID
    before allocating the next.
  - **Compatibility boundary:** existing identities are not rewritten or migrated.
    URL eligibility, exact strings, reviewed destination, traversal depth, pending
    ownership, one acknowledged write, rollback, Undo, copy, schema/import envelope,
    permissions, and local-only behavior remain unchanged.
  - **Evidence:** the production-extracted success case forces an Archive-retained
    destination collision, then proves one safe Group, four safe items, and one
    acknowledged write. Destination-drift/rejection, schema 0-13, 1,024-record
    scale, semantic fuzz, syntax, quality, and diff checks pass. **Implemented: yes.
    Verified: partial (production-extracted/static only). User-validated: no.
    Released: no.** Installed bookmark traversal, real persistence/Undo, rendered/
    assistive-technology output, representative-user approval, and release remain
    open.

- **2026-08-13 - Bookmark import now creates only reopenable saved pages**
  - **Acceptance criteria implemented:** new-tab bookmark import now applies the
    exact saved-item Reopen allowlist before Group/item creation and counting.
    HTTP, HTTPS, FTP, and local-file URLs are retained unchanged; script, inline,
    blob, mail, and malformed entries are omitted.
  - **Compatibility boundary:** reviewed Space authority, depth bound, pending
    interlock, one acknowledged write, rollback, Undo, copy, schema/import envelope,
    permissions, and local-only behavior remain unchanged.
  - **Evidence:** a production-extracted mixed-protocol import retains four exact
    supported URLs and reports four. Destination-drift/rejection cases, schema 0–13
    compatibility, 1,024-record scale, semantic fuzz, syntax, quality, and diff
    checks pass. **Implemented: yes. Verified: partial (production-extracted/static
    only). User-validated: no. Released: no.** Installed bookmark traversal,
    rendered/assistive-technology output, representative-user approval, and release
    remain open.

- **2026-08-13 - Accepted first Saves no longer confirm a stale Inbox**
  - **Acceptance criteria implemented:** the shared single-tab writer now exposes an
    opt-in accepted outcome with current destination confirmation. Home suppresses
    its reviewed-route success state after drift. Welcome completes and closes but
    performs no stale Inbox navigation or item focus.
  - **Compatibility boundary:** persistence acceptance, source consequence, warning
    copy, Undo, legacy saved-item returns, exact receipt callers, schema/import
    shapes, permissions, and local-only behavior remain unchanged. The accepted
    mutation is never retried.
  - **Evidence:** extracted writer, Home, and Welcome cases prove one accepted Save,
    one generic warning with no stale action, no stale route confirmation/handoff,
    and no duplicate invitation. Syntax, onboarding, quality, and diff checks pass.
    **Implemented: yes. Verified: partial (production-extracted/static only).
    User-validated: no. Released: no.** Installed interleaving, rendered/assistive-
    technology output, representative-user approval, and release remain open.

- **2026-08-13 - Popup Save no longer accepts pages Locus cannot reopen**
  - **Acceptance criteria implemented:** popup discovery and every single, window,
    Save-before-Hibernate, Hibernate-effect, and bookmark-import boundary now accept
    exactly `http:`, `https:`, `ftp:`, and `file:` URLs. Unsafe sources are neither
    persisted nor offered to guarded cleanup.
  - **Compatibility boundary:** exact URL strings, duplicate policy, destinations,
    receipts, centralized persistence, existing stored records, schema/import
    shapes, permissions, and local-only behavior remain unchanged.
  - **Evidence:** production-extracted single Save rejects `data:` before any write,
    graph change, source read, removal, or effect. Mixed window, Hibernate, and
    bookmark cases retain only reopenable sources, and window cleanup excludes every
    rejected source. Syntax, popup, quality, and diff checks pass. **Implemented:
    yes. Verified: partial (production-extracted/static only). User-validated: no.
    Released: no.** Installed browser protocol behavior, real storage/effects,
    rendered/assistive-technology output, representative-user approval, and release
    remain open.

- **2026-08-13 - Group Save-here now reaches a real browser page**
  - **Acceptance criteria implemented:** eligible selected sidebar tabs retain
    priority. With no selection, Board/List Group Save-here reads the fresh current-
    window inventory, chooses the most recent stable eligible page, and reuses the
    exact Group receipt path. Unsupported selection never falls through.
  - **Copy boundary:** English and native zh-TW helper/accessible wording now names
    the recent savable browser page instead of claiming the active Locus tab. No
    key, UI, route, destination, writer, schema/import byte, permission, or privacy
    boundary changed.
  - **Evidence:** a production caller chooses one stable page over active Locus and
    a newer conflicting pending navigation, then performs one commit/receipt.
    Unsupported-only, query-failure, and destination-drift cases remain fail-closed.
    Syntax, onboarding/Home Trail, quality, and diff checks pass. **Implemented:
    yes. Verified: partial (production-extracted/static only). User-validated: no.
    Released: no.** Installed Chrome ordering, real persistence/effects, rendered/
    assistive-technology output, representative-user approval, and release remain
    open.

- **2026-08-13 - New-tab existing destinations now deduplicate within one Save**
  - **Acceptance criteria implemented:** selected existing-Group Save and multi-tab
    Group/Stack drop now compare each source with stored destination URLs and every
    URL already accepted in that batch. Deduplication keeps the first exact URL;
    allowing duplicates keeps every source.
  - **Compatibility boundary:** fresh generated Groups retain source multiplicity.
    Eligibility, metadata policy, collision-safe IDs, exact receipts, acknowledged
    writes, source protection, selection/focus, English/native zh-TW copy, schema/
    import bytes, permissions, and local-only behavior remain unchanged.
  - **Evidence:** a production-extracted existing-Group caller first persisted two
    same-URL sources plus a distinct source. It now persists only the first and
    distinct source, while the helper retains all when duplicates are allowed.
    Static source checks pin Group/Stack drop to the same policy. Syntax,
    onboarding/Home Trail, quality, and diff checks pass. **Implemented: yes.
    Verified: partial (production-extracted/static only). User-validated: no.
    Released: no.** Installed selection/native drag, real persistence/effects,
    rendered/assistive-technology output, representative-user approval, and release
    remain open.

- **2026-08-13 - Popup batches now deduplicate within the current Save**
  - **Acceptance criteria implemented:** Save-before-Hibernate and whole-window
    Links/Queue now compare each source with stored destination URLs and every URL
    already accepted in that batch. Deduplication keeps the first exact URL;
    allowing duplicates keeps every source.
  - **Compatibility boundary:** fresh Session mode still preserves one saved item
    per source for exact cleanup authority. All valid non-active source descriptors
    remain eligible for guarded cleanup even when records deduplicate. Exact URL
    comparison, metadata, ID allocation, destinations, receipts, writer, English/
    zh-TW copy, schema/import bytes, permissions, and privacy remain unchanged.
  - **Evidence:** focused production-extracted Hibernate and window cases first
    produced two same-URL records with deduplication enabled. They now prove one
    deduplicated record, both records when allowed, both records in Session mode,
    and retained exact cleanup descriptors. Popup syntax/contracts, quality, and
    diff checks pass. **Implemented: yes. Verified: partial (production-extracted/
    static only). User-validated: no. Released: no.** Installed duplicate-tab
    inventory, real persistence/effects, rendered/assistive-technology output,
    representative-user approval, and release remain open.

- **2026-08-13 - Command-palette Save now reaches a real browser page**
  - **Acceptance criteria implemented:** the palette reads the fresh current-window
    inventory, uses the established recent eligible-page selector, and sends that
    exact page through Inbox Save with an exact destination receipt. Unsupported-
    only and failed reads make no Save and retain localized recovery.
  - **Copy boundary:** English and native zh-TW now say recent browser page instead
    of claiming the active Locus tab. No key, surface, route, permission, writer,
    schema/import byte, or local-only privacy boundary changed.
  - **Evidence:** a production-extracted caller chooses the freshest stable eligible
    page over the active Locus page, an older page, and a newer pending-URL mismatch;
    it requests one exact receipt. Unsupported and query-failure cases dispatch no
    Save. Syntax, onboarding/Home Trail, quality, and diff checks pass.
    **Implemented: yes. Verified: partial (production-extracted/static only).
    User-validated: no. Released: no.** Installed Chrome ordering, real persistence/
    source cleanup, rendered/assistive-technology output, representative-user
    approval, and release remain open.

- **2026-08-13 - Drag Save now honors the duplicate-URL preference**
  - **Acceptance criteria implemented:** Space, Group, and Stack drops now use the
    canonical duplicate policy. Same-URL pages are retained when duplicates are
    allowed and keep the existing Already saved/no-write result when deduplication
    is enabled.
  - **Compatibility boundary:** URL eligibility, metadata preferences, collision-
    safe IDs, exact destination receipts, acknowledged writes, source protection,
    Undo/Open destination, English/native zh-TW copy, schema/import bytes,
    permissions, and local-only behavior remain unchanged. No new UI was added.
  - **Evidence:** a production-extracted Space-drop case proves allowed and blocked
    same-URL outcomes, one accepted commit/receipt only, and no write for the
    blocked attempt. Static source contracts require both Space and Group/Stack
    callers to share the helper. Syntax, onboarding/Home Trail, quality, and diff
    checks pass. **Implemented: yes. Verified: partial (production-extracted/static
    only). User-validated: no. Released: no.** Installed native drag, real storage/
    tab timing, rendered/assistive-technology output, representative-user approval,
    and release remain open.

- **2026-08-13 - Space-drop Save now honors title and favicon preferences**
  - **Acceptance criteria implemented:** `dropTabsIntoCategory()` routes each
    accepted source through the canonical `captureTabFields()` policy and stores
    only its title/domain fallback and optional favicon output.
  - **Compatibility boundary:** URL eligibility, collision-safe IDs, exact inactive-
    Space destination, acknowledged write, source protection, Undo/Open destination,
    English/native zh-TW copy, schema/import bytes, permissions, and local-only
    behavior remain unchanged. No new UI or preference was added.
  - **Evidence:** the focused production caller first made zero policy calls. It
    now injects a private raw title/data icon, receives one canonical domain/empty-
    icon result, and proves only that result reaches the accepted record, with one
    commit and one exact receipt. Syntax, onboarding/Home Trail, quality gates, and
    diff checks pass. **Implemented: yes. Verified: partial (production-extracted/
    static only). User-validated: no. Released: no.** Installed native drag,
    preference/storage/tab timing, rendered/assistive-technology output,
    representative-user approval, and release remain open.

- **2026-08-13 - Dragging a tab into another Space now reaches its exact Inbox**
  - **Acceptance criteria implemented:** the explicit Space-drop path may freeze a
    uniquely resolved inactive-Space Inbox/list inside the active Workspace.
    Ordinary capture remains active-Space-only, and the exception cannot cross
    Workspace identity or guess an ambiguous destination.
  - **Compatibility boundary:** existing exact Inbox review, collision-safe IDs,
    saved-item receipt, acknowledged write, source protection, Undo/Open
    destination, English/native zh-TW copy, schema/import bytes, permissions, and
    local-only behavior remain unchanged. No navigation or active-Space mutation
    was added.
  - **Evidence:** the focused runner first returned no inactive-Space receipt. The
    production-extracted helper case now proves default refusal, exact inactive-
    Space acceptance, foreign-Workspace refusal, and the sole production caller
    opt-in. Syntax, onboarding/Home Trail, state sync, 10,000-schedule concurrency,
    quality gates, and diff checks pass. **Implemented: yes. Verified: partial
    (production-extracted/static only). User-validated: no. Released: no.**
    Installed native drag/drop, real storage/tab timing, rendered/assistive-
    technology output, representative-user approval, and release remain open.

- **2026-08-13 - Single-page Restore cannot reuse an old destination hint**
  - **Acceptance criteria implemented:** when exact Archive Restore needs a new
    fallback Inbox, it now allocates against active entities, Archive/Trash
    payloads and destination hints, layout IDs, and capture preferences before
    history or mutation.
  - **Compatibility boundary:** exact reviewed destination, preserved saved-page
    object/metadata, one acknowledged write, Undo, focus, English/native zh-TW,
    schema/import bytes, permissions, and local-only behavior remain unchanged.
  - **Evidence:** the focused runner first failed on the missing allocator. Its
    production-extracted case now makes the first generated ID collide with the
    archived Group hint, skips it, creates only the visible Inbox, preserves the
    page, and commits once. Recovery syntax/contracts, 1,024-record single/Group/
    batch/Trash scale, quality gates, and diff checks pass. **Implemented: yes.
    Verified: partial (production-extracted/static only). User-validated: no.
    Released: no.** Installed storage, rendered/assistive-technology output,
    representative-user trust, and release remain open.

- **2026-08-13 - Save all now honors close-after-save for every eligible page**
  - **Acceptance criteria implemented:** `saveAllTabs()` persists exactly the
    shared URL-policy-eligible pages and now passes that complete set to the
    existing guarded cleanup boundary. It no longer omits the first arbitrary
    supported page after counting it as saved.
  - **Compatibility boundary:** unsupported/internal/changed/missing/active/
    redirecting sources retain their existing protection. Exact destination
    validation, receipt/count, Undo, close preference, English/native zh-TW copy,
    schema/import bytes, permissions, and local-only behavior remain unchanged.
  - **Evidence:** the focused runner first showed three cleanup IDs against four
    supported saved pages. It now executes the production caller with HTTP, HTTPS,
    FTP, file, data, blob, and JavaScript candidates and proves exactly the four
    supported IDs enter one guarded commit. Syntax, onboarding/Home Trail, 10,000-
    schedule concurrency, quality gates, and diff checks pass. **Implemented: yes.
    Verified: partial (production-extracted/static only). User-validated: no.
    Released: no.** Installed MV3 query/removal timing, final read-to-remove,
    rendered/assistive-technology output, representative-user approval, and
    release remain open.

- **2026-08-13 - Existing-Group Save now skips every retained ID collision**
  - **Acceptance criteria implemented:** selected and active-tab Save into an
    existing Group each use the graph-wide allocator for all new page records.
    Allocation completes before history or mutation; exhaustion uses the existing
    fail-closed Group result and dispatches no write or source effect.
  - **Compatibility boundary:** exact destination/receipt validation, acknowledged
    persistence, source protection, duplicate filtering, selection/focus, Undo,
    Open destination, English/native zh-TW copy, schema/import bytes, permissions,
    and local-only behavior remain unchanged. No new UI or durable field was added.
  - **Evidence:** the focused runner first failed on the missing allocator. Its
    production-extracted selected-Group case now forces a raw collision with a
    retained ID and proves two unique safe IDs, one commit, and unchanged receipt/
    drift behavior; static evidence requires both selected and active branches and
    forbids raw `uid()`. Syntax, onboarding/Home Trail, 10,000-schedule concurrency,
    quality gates, and diff checks pass. **Implemented: yes. Verified: partial
    (production-extracted/static only). User-validated: no. Released: no.**
    Installed MV3/storage/tab timing, rendered/assistive-technology output,
    representative-user approval, and release remain open.

- **2026-08-13 - New-tab Inbox saves retain the exact accepted filing**
  - **Acceptance criteria implemented:** single, selected, and Space-drop Inbox
    saves allocate each new item against every retained graph ID, then freeze the
    exact Workspace/Space/Inbox/list/new-item receipt before acknowledged
    persistence. The existing commit boundary re-resolves that receipt before
    source cleanup; drift protects sources without retrying the accepted save.
    Selected and Space-drop actions show the existing Open-destination receipt;
    opened-tab row and palette Save opt in, while Home, Welcome, and top-bar keep
    their dedicated recovery handoffs. The rich top-bar receipt revalidates before
    presentation.
  - **Compatibility boundary:** duplicate filtering, unsupported-tab selection,
    Undo, close preference, English/native zh-TW copy, schema/import bytes,
    permissions, local-only behavior, and the centralized writer remain unchanged.
    No new component, style, durable field, permission, or network path was added.
  - **Evidence:** the focused runner first failed on missing exact item authority.
    It now executes mixed selection through the production caller and proves one
    commit, retained-safe allocation, exact-validator revocation after Inbox drift,
    one destination receipt, no path-blind result, and selection/focus retention.
    New-tab/test syntax, onboarding/Home Trail, state-sync, 10,000-schedule
    concurrency, and quality gates pass. **Implemented: yes. Verified: partial
    (production-extracted/static only). User-validated: no. Released: no.**
    Installed MV3 ordering, final read-to-remove timing, rendered/assistive-
    technology output, representative-user approval, and release remain open.

- **2026-08-13 - Popup Hibernate now protects a source that changed while waiting**
  - **Acceptance criteria implemented:** single Hibernate freezes the reviewed tab
    before its popup write wait. Bulk drains that queue, discovers candidates, then
    freezes each ID/window/active/URL/display field before optional Save-before
    persistence. Both fresh-read and require the exact source plus safe pending-
    navigation state immediately before replacement.
    Changed, newly active, redirecting, missing, or malformed sources stay open;
    exact bulk siblings continue without retry.
  - **Compatibility boundary:** an already accepted Save-before copy stays saved.
    Existing busy state, result counts/toasts, local placeholders, settings, copy,
    English/native zh-TW, schema/import bytes, permissions, and local-only behavior
    remain unchanged. No new UI, durable field, or browser permission was added.
  - **Evidence:** the focused runner first failed because the source guard was
    absent. It now covers immutable pre-wait identity, exact success, changed
    window/active/URL, different and malformed pending navigation, a source change
    during the write wait, no mismatch effect/reload, single-effect failure without
    retry, and bulk revalidation after persistence. Popup/test syntax, the 10,000-
    schedule concurrency suite, and quality gates pass. **Implemented: yes.
    Verified: partial (production-extracted/static only). User-validated: no.
    Released: no.** Installed MV3 timing, the final read-to-update race, real tab
    effects, representative-user approval, and release remain open.

- **2026-08-13 - Protected ordinary Saves can now open the exact saved item**
  - **Acceptance criteria implemented:** the accepted-but-source-open result keeps
    the immutable Workspace/item/source identity with cleanup disabled. Its primary
    is now Open saved item through the existing worker-owned fresh resolver; Close
    remains Close popup and can never repeat the refused source close.
  - **Compatibility boundary:** the same Saved card, accepted destination/title,
    English/native zh-TW copy, conservative unavailable/unknown handling, confirmed
    close, and intentional keep-open behavior remain intact. No state write, new
    message type, browser-close path, schema/import byte, permission, or network
    access was added.
  - **Evidence:** the focused contract failed on the absent intent and now freezes
    Workspace/item/source/window/active/URL fields plus `closeSource:false` across
    changed URL/window/pending-navigation results. Source and existing action tests
    cover exact Open, current destination, unavailable target, route failure, and
    unknown effect. Popup/test syntax and the focused popup Locate suite pass.
    **Implemented: yes. Verified: partial (production-extracted only).
    User-validated: no. Released: no.** Installed MV3, real route effects, rendered
    focus/assistive technology, representative-user approval, and release remain
    open.

- **2026-08-13 - Ordinary accepted Saves now disclose protected source tabs**
  - **Acceptance criteria implemented:** when an ordinary single-tab Save is
    accepted but its requested exact source close is changed or unconfirmed, the
    popup remains on the existing Saved result card with destination, title, the
    established protected/unconfirmed message, Open Locus, Close, and primary
    focus. It no longer flashes a generic toast and auto-dismisses.
  - **Compatibility boundary:** rejected/unknown writes remain failures; confirmed
    close and intentional keep-open Saves retain quiet completion. Existing
    English/native zh-TW copy and result markup are reused. No storage, ID,
    schema/import byte, route, worker request, permission, or network path changed.
  - **Evidence:** the focused contract failed on the absent controller and now
    covers changed URL/window/pending navigation and unavailable reads with one
    accepted result, zero generic toast/timer/removal, plus unchanged confirmed and
    close-off cases. Popup and test syntax plus the popup Locate suite pass.
    **Implemented: yes. Verified: partial (production-extracted only).
    User-validated: no. Released: no.** Chrome is installed but its selected profile
    lacks the ChatGPT browser extension; installed pixels/effects, native assistive
    technology, representative-user comprehension, approval, and release remain
    open.

- **2026-08-13 - Accepted Save truth now has a durable malformed-graph regression**
  - **Acceptance criteria implemented:** four unrelated present non-array
    Workspace/Space/Group/nested-item branches and one malformed destination field
    preserve top-level accepted-state truth while returning only the strict
    unavailable destination. A valid 200,000-entry Stack retains exact success.
  - **Compatibility boundary:** the current fail-safe production behavior is
    unchanged. The regression requires one accepted write, revision +1, exact graph
    retention, zero retry, route, notification, or tab effects, and open sources;
    the existing pre-write rejection remains a rejection.
  - **Evidence:** the production-extracted `handleStateWriteMessage()` case and
    script syntax pass in the focused popup Locate suite. **Implemented: yes
    (regression evidence). Verified: partial (deterministic extracted worker only).
    User-validated: no. Released: no.** Installed MV3 message/storage ordering,
    service-worker termination, rendered popup/assistive technology,
    representative-user comprehension, approval, and release remain open.

- **2026-08-13 - Library query waits for IME composition to settle**
  - **Acceptance criteria implemented:** All Links, Favorites, and Read Later keep
    interim composition text in the mounted field without updating their URL or
    results. Composition end commits exactly once, the duplicate follow-up input is
    ignored, ordinary input remains immediate, and Escape only clears and blurs
    after composition has settled.
  - **Compatibility boundary:** Library mode/query/status/sort URL semantics,
    result rows, exact recovery guards, saved data, copy, English/native zh-TW,
    stable IDs, schema/import bytes, permissions, and local-only behavior remain
    unchanged. No durable write or browser effect was added.
  - **Evidence:** the focused production-extracted contract failed on the absent
    controller and now passes interim input, IME Escape, composition end,
    post-composition deduplication, ordinary input, and settled Escape. A removed
    420x590 current-source reference committed ordinary input once, retained query
    focus in a 420x52 px row with zero horizontal overflow, then made one empty
    commit and blurred on settled Escape. **Implemented: yes. Verified: partial
    (production-extracted composition contract and ordinary browser reference
    only). User-validated: no. Released: no.** Installed MV3, native IME/assistive
    technology, real data, representative-user approval, and release remain open.

- **2026-08-13 - Find-again Search no longer offers an empty Clear action**
  - **Acceptance criteria implemented:** the custom query Clear control is hidden
    and disabled when the exact input is empty, then becomes an enabled 40 px action
    immediately when text exists. Ordinary and IME input synchronize before the
    debounced result render. Clear still resets only query/selection and restores
    query focus.
  - **Compatibility boundary:** filters, sort, panel state, Search route/history,
    result recovery, saved data, copy, English/native zh-TW, stable IDs,
    schema/import bytes, permissions, and local-only behavior remain unchanged.
  - **Evidence:** the focused production-extracted contract failed on the absent
    synchronizer and now passes empty, typed, initial, input, and composition-end
    cases. A removed 420x590 reference hid/disabled empty Clear, exposed one enabled
    40x40 px control for text, returned focus after clearing, and had zero horizontal
    overflow. At 1280x720 the empty 1068x56 px query remained dominant and typed
    Clear stayed 40x40 px. **Implemented: yes. Verified: partial (production-
    extracted contract and current-source browser reference only). User-validated:
    no. Released: no.** Installed MV3, native IME/assistive technology, real data,
    representative-user approval, and release remain open.

- **2026-08-13 - Compact Save receipts now read and focus in one direction**
  - **Acceptance criteria implemented:** the stable receipt order remains message,
    Open destination, Undo, then Dismiss. At 520 px and below the evidence now spans
    row one while the three controls occupy row two left-to-right, so visual order
    no longer contradicts keyboard order. Wide receipts remain unchanged.
  - **Compatibility boundary:** conditional message scrolling/focus, 40 px targets,
    receipt copy, tone/lifetime/action behavior, focus return, themes, reduced
    motion, forced colors, state, routes, stable IDs, schema/import bytes,
    permissions, English/native zh-TW, and local-only behavior remain intact.
  - **Evidence:** the focused contract failed on the old first-row Dismiss placement
    and now freezes both DOM and compact grid order. A removed 420x240 browser
    reference kept the receipt at y=20..228 and placed Open, Undo, and Dismiss at
    y=177..217 left-to-right, with a 136/170 px scrollable message and zero
    horizontal overflow. The 1280x720 760 px strip remained unchanged. **Implemented:
    yes. Verified: partial (source order and current-source browser reference only).
    User-validated: no. Released: no.** Installed native Tab traversal, assistive
    technology, real data, representative-user approval, and release remain open.

- **2026-08-13 - Overflowing Save evidence is now keyboard reachable**
  - **Acceptance criteria implemented:** only an actually overflowing receipt
    message joins the Tab order. Arrow Up/Down, Page Up/Down, Home, and End scroll
    that message without moving the page; dismissal, replacement, or a larger
    viewport removes the tab stop and returns the reused message to its beginning.
    The receipt still never takes focus automatically.
  - **Compatibility boundary:** the existing receipt host, child order, copy,
    tones, lifetime, pinned 40 px actions, action callbacks, focus return, state,
    routes, browser effects, stable IDs, schema/import bytes, permissions, themes,
    reduced motion, forced colors, English/native zh-TW, and local-only behavior
    remain unchanged.
  - **Evidence:** the focused production-extracted contract failed first on the
    absent conditional tab stop and then on the absent message-local key handler.
    It now passes. A removed browser reference measured `tabIndex = -1` for a fully
    visible 132/132 px message at 1280x720. At 420x240, the 136/207 px message had
    `tabIndex = 0`; Page Down focused it, exposed the 3 px locator, and moved it to
    its 71 px end while all controls remained visible and horizontal overflow stayed
    zero. **Implemented: yes. Verified: partial (production-extracted contract and
    current-source browser reference only). User-validated: no. Released: no.**
    Installed MV3, native screen-reader/keyboard output, zoom, real data,
    representative-user approval, and release remain open.

- **2026-08-13 — Long Save receipts remain readable in short viewports**
  - **Acceptance criteria implemented:** the global Locus Index receipt is bounded
    to the visible viewport. Long saved titles, exact destination paths, and source
    outcomes scroll only inside the message body while Open destination, Undo, and
    Dismiss remain visible 40 px controls. The tone mark aligns with the first line.
  - **Compatibility boundary:** no copy, DOM order, receipt lifetime, focus owner,
    state, route, browser effect, stable ID, schema/import byte, permission, host
    access, or local-only behavior changed. Existing reduced-motion and forced-color
    mappings remain authoritative.
  - **Evidence:** the focused contract first failed on the missing viewport bound.
    Current-source reference measurements then passed at 1280x720 with no message
    scroll and at 420x240 with the 208 px receipt fully visible, a 136/188 px
    scrollable message, all actions visible, first-line mark alignment, and zero
    horizontal overflow. The temporary reference was removed. **Implemented: yes.
    Verified: partial (source contract and current-source presentation only).
    User-validated: no. Released: no.** Installed MV3 pixels, real data, native
    keyboard/screen-reader behavior, zoom, representative-user approval, and
    release remain open.

- **2026-08-13 — Workspace extras now remain Available until explicitly enabled**
  - **Acceptance criteria implemented:** the packaged scenic Welcome screen no
    longer activates from a missing preference. Fresh state, the General fallback,
    boot entry, and the layer guard all default off or require exact stored `true`.
    The separate one-task save-first guide remains core. English and independently
    authored native zh-TW now say the local Workspace-extras plugin is off by
    default and name its exact clock/saved-work-search effect. No preview supplied
    design, copy, data, or behavior authority.
  - **Behavior and compatibility boundary:** schema 13 preserves every valid
    explicit `showLanding` boolean and normalizes only absent or malformed
    schema-0–12 bytes to false. Missing current-schema values also fail closed at
    runtime without manufacturing a write. Existing Settings transaction,
    persistence recovery, focus/Tab/Escape/opener ownership, stable IDs, routes,
    import envelopes, other settings bytes, local-only storage, CSP, permissions,
    zero host permissions, and the noncommercial research boundary remain intact.
  - **Evidence:** focused General, state-sync, popup/deep-link, and export/import
    contracts pass. The compatibility matrix covers schemas 0–13 through six
    envelopes plus raw legacy in 30 replace/merge cases, including absent and
    explicit true/false preferences. One uninterrupted complete pass covers all 42
    JavaScript files and all 33 runner commands. Concurrency completes 10,000
    schedules: 69,880 attempts, 19,947 accepted, 49,379 rejected, and 554 injected
    failures. Diff hygiene passes. Installed migration/reload persistence, pixels,
    real MV3 timing, native keyboard/screen-reader/forced-color behavior, exact
    viewport geometry, Back/Forward, representative-user approval, and release
    remain open. **Implemented: yes. Verified: partial. User-validated: no.
    Released: no.**

- **2026-08-13 — One live Search and one overflow now own the global shell**
  - **Acceptance criteria implemented:** the rendered top bar contains context,
    the one global Search affordance, contextual Save, and one More disclosure.
    Home keeps its in-content save trail but now retains More. The six duplicate
    Undo/Calendar/Search/Settings/Plugins/avatar buttons are explicit hidden
    compatibility hooks rather than competing controls. The optional Welcome-layer
    menu and legacy avatar entry delegate to the same More model; the duplicate
    Theme/Workspace/Guide/About app-menu fork and its icon language are gone.
  - **Behavior and compatibility boundary:** More groups saved-work review,
    Calendar/reminders, Options, and Organize; it does not repeat Search. Plugins is
    one named optional entry and continues to open only the eight packaged local
    research tools. Save, sidebar More, and topbar More expose truthful
    `aria-expanded`; the shared menu retains Arrow/Home/End, contained Tab,
    Enter/Space, outside dismissal, Escape, and visible opener return. Pending
    reminders use one localized accessible label and restrained accent signal with
    forced-color support. Settings receives the explicit visible opener. Stable
    IDs, routes, schema 12, import bytes, local-only storage, CSP, permissions, and
    zero host permissions remain intact. No preview fixture supplied design or
    behavior authority.
  - **Evidence:** source/DOM/CSS/i18n checks and extracted runtime menu-state tests
    pass in English/native zh-TW, including singular Search, Plugins/Settings opener
    transfer, reminder state, disclosure ownership, responsive source rules,
    reduced motion, and forced colors. The complete pass covers all 42 JavaScript
    files and all 33 runner commands; concurrency completes 10,000 schedules:
    69,880 attempts, 19,947 accepted, 49,379 rejected, and 554 injected failures.
    The full gate also caught and restored an existing destructive-confirm action
    from the ordinary accent to the established red token. Diff hygiene passes.
    Installed pixels, real MV3 menu/storage/tab timing, native keyboard/screen-
    reader/forced-color behavior, exact viewport geometry, reload/Back/Forward,
    representative-user approval, and release remain open. **Implemented: yes.
    Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 — Group footers now lead with Save and contain supporting records**
  - **Acceptance criteria implemented:** Board, Canvas reuse, and focused Group
    footers expose exactly two native 40 px controls: a dominant **Save here** action
    and one quiet **Add record** menu for Note, To-do, and Stack. The old four-equal-
    control row and its compressed icon-only hierarchy are gone. List uses the same
    exact-destination Save wording and retains record creation contextually inside
    More; Board More suppresses that duplicate. Empty Groups lead with Save and use
    the same named Add-record disclosure.
  - **Behavior and compatibility boundary:** `groupRecordCreationMenuItems()` refuses
    a missing, duplicated, moved, or replaced rendered Group before exposing the
    existing receipt-gated Note/To-do or identity-owned Stack controllers. The
    shared menu owns a localized name, truthful `aria-expanded`, Arrow/Home/End,
    contained Tab, Enter/Space, outside dismissal, LIFO Escape, and opener return.
    A Group-local container query preserves both 40 px targets at the supported
    200 px resize; only the secondary visible label collapses below 250 px. English
    and native zh-TW, light/dark tokens, reduced motion, forced colors, schema 12,
    stable IDs and `data-act="add-tab"`, import bytes, routes, local-only storage,
    permissions, CSP, and zero host permissions remain intact. Research tools remain
    Available/Open in Plugins and uneven layouts stay Advanced.
  - **Evidence:** focused onboarding/Home, Group/Stack identity, organization create/
    move/delete, item-detail, visual-system, and quality contracts pass. One final
    complete pass covers all 42 JavaScript files and all 33 runner commands.
    Concurrency completes 10,000 schedules: 69,880 attempts, 19,947 accepted, 49,379
    rejected, and 554 injected failures; diff hygiene passes. Installed pixels,
    real MV3 storage/tab/menu timing, native keyboard/screen-reader/forced-color
    behavior, exact responsive geometry, reload/Back/Forward, representative-user
    approval, and release remain open. **Implemented: yes. Verified: partial.
    User-validated: no. Released: no.**

- **2026-08-13 — Board local records now scan first and edit in one trusted sheet**
  - **Acceptance criteria implemented:** Note and To-do cards are native read-only
    record locators with explicit empty states, bounded excerpts, one persistent
    More action, and exact pointer/keyboard routing into the saved-item Details
    sheet. Note rich text, To-do text, and standard/No marker choices share the
    route-frozen `commitItemDetailMutation()` transaction. The marker field is one
    localized roving radiogroup; a current imported custom value remains exact,
    visible, and non-writing through a color-only CSS property. The duplicate
    anchored palette, inline card writers, slash mutation paths, dead pending code,
    and ornamental edit/completion motion are removed.
  - Board and command-palette Note/To-do creation now freezes one exact Group item
    list, creates an exact destination receipt, awaits one `State.persistNow()`, and
    only then renders and opens the new Details field. Its initiating footer button
    owns busy/focus/inert state; duplicate, navigation, Escape, lower shortcuts,
    Archive, selection mutation, and completion cannot outrun the receipt. Rejection
    or destination drift exposes no blank accepted card or false success.
  - English and native zh-TW independently name Edit note, Edit to-do, Change marker,
    Record marker, and empty states. Light/dark tokens, reduced motion, forced colors,
    1280/800/520 responsive rules, schema 12, stable IDs, import/search/color bytes,
    local-only storage, permissions, CSP, and zero host permissions remain intact.
    Optional research tools stay Available/Open in Plugins; uneven layouts remain
    Advanced and unpromoted.
  - Focused onboarding/Home, item-detail, shared visual-system, state-sync, Undo,
    and quality contracts pass. One uninterrupted final pass covers all 42 JavaScript
    files, the quality gate, and all 32 `*test.js` runners (33 runner commands).
    Concurrency completes 10,000 schedules: 69,880 attempts, 19,947 accepted, 49,379
    rejected, and 554 injected failures; diff hygiene passes. Installed pixels, real MV3 storage/route timing,
    native keyboard/screen-reader/forced-color behavior, exact responsive geometry,
    reload/Back/Forward, representative-user approval, and release remain open.
    **Implemented: yes. Verified: partial. User-validated: no. Released: no.**

- **2026-08-13 — Settings Privacy now states exact limits and contains display masking**
  - **Acceptance criteria implemented:** Privacy is one named Locus Index fact
    ledger for browser-profile storage, release extension-page networking, exact
    browser capabilities/zero host permissions, and manual backup/profile-loss
    recovery. Backup is the leading native action and retains the honest limitation
    that Locus cannot confirm browser download completion. The promotional shield,
    green checklist, “Privacy & Security” title, unqualified tracking promise,
    ornamental icon, and old blur-mode wording are gone.
  - **Behavior and compatibility boundary:** the retained `#tog-blur` lives in one
    native Screen-share-mask plugin whose Available/Active state derives only from
    the real `blurPrivacy` boolean. Its copy distinguishes presentation masking from
    encryption, deletion, and data mutation, and names the existing hidden capture-
    notification destination effect. Hover no longer reveals masked titles and no
    filter animation remains. One allowlisted boolean patch projects immediately
    and awaits one `State.persistNow()` receipt; success requires the same State,
    settings owner, and touched-value fingerprint. Duplicate, invalid/no-op,
    rejection, existing recovery, adoption, owner replacement, or drift paths
    cannot produce false success. Privacy joins General/Capture/Appearance pending
    ownership for section changes, Close/backdrop, plugin collapse, Escape,
    Back/Forward, lower shortcuts, and focus while Tab remains in Settings. Stable
    IDs, stored bytes/default, schema 12/imports, export behavior, notification
    behavior, routes, exact permissions, zero host permissions, and network-silent
    release policy remain compatible.
  - **Evidence:** `scripts/privacy-settings-contract-test.js` grounds visible facts
    in the manifest/CSP/background source and covers DOM order/semantics, English and
    independently authored native zh-TW, Locus Index CSS, 1280/800 two-column and
    620/520 one-column rules, visible focus, reduced motion, forced colors, mask
    coverage/no-hover reveal, one receipt, pending/duplicate focus, no-op/invalid
    input, rejection/recovery, graph/settings replacement, touched-value drift, and
    real plugin-state derivation. Its first focused run exposed only a test-scope
    error that searched the Privacy-local CSS slice for the shared responsive block;
    correcting the harness scope changed no runtime behavior. One uninterrupted full
    pass covered all 42 JavaScript files and all 33 runner commands. Concurrency
    completed 10,000 schedules (69,880 attempts, 19,947 accepted, 49,379 rejected,
    554 injected failures). **Implemented: yes. Verified: partial. User-validated:
    no. Released: no.** Installed persistence and pixels, native keyboard/screen-
    reader/forced-color output, exact geometry, browser download completion, live
    notification masking, representative-user trust, approval, and release remain open.

- **2026-08-13 — Settings General now separates core recovery preferences from Workspace extras**
  - **Acceptance criteria implemented:** General is one ordered Locus Index ledger
    for interface language, saved-page opening, and the first-save guide. The old
    Profile card, “Your name” promise, equal-weight Behavior/Welcome cards, inline
    spacing, and ornamental guide icon are gone. Window-based Workspace switching,
    the alternate Welcome screen, and its retained greeting name remain available
    inside one native Workspace-extras plugin disclosure. Available/Active derives
    from the real auto-switch and Welcome booleans; there is no install, account,
    catalog, permission, download, network, or stored plugin model.
  - **Behavior and compatibility boundary:** `GENERAL_SETTING_KEYS` admits only the
    existing language, Hibernate, auto-switch, Welcome, and profile fields. One
    normalized patch updates the real setting, projects language immediately, and
    awaits exactly one `State.persistNow()` receipt. Success still requires the same
    State, settings owner, and touched-value fingerprint. Duplicate, invalid, no-op,
    rejection, existing recovery, graph adoption, or drift paths cannot emit false
    success. The initiating control joins Capture/Appearance pending ownership across
    section changes, Close, backdrop, Escape, Back/Forward, lower shortcuts, and
    plugin collapse while Tab stays in Settings. Greeting name uses explicit Save;
    Enter activates it and Escape first discards an unsaved draft. Existing IDs,
    compatible profile fields, stored bytes/defaults, schema 12/imports, landing and
    window behavior, routes, permissions, zero host permissions, and local storage
    remain unchanged.
  - **Evidence:** the new static and production-extracted General contract covers
    exact semantics/order, English/native zh-TW, no Profile/inline/ornamental residue,
    Locus Index CSS, 800/620/520 reflow, Motion-off, reduced motion, forced colors,
    locale projection, pending/duplicate focus, one receipt, no-op/invalid input,
    profile-field preservation, rejection/recovery, drift, graph adoption, and real
    plugin-state derivation. Focused reopen, import, state, Settings, onboarding, and
    quality suites pass. The first full run found one stale reminder-locale assertion
    requiring the removed direct language writer; it now requires the acknowledged
    projection seam. One uninterrupted pass covered all 41 JavaScript files and all
    32 runner commands. Concurrency completed 10,000 schedules (69,880 attempts,
    19,947 accepted, 49,379 rejected, 554 injected failures). **Implemented: yes.
    Verified: partial. User-validated: no. Released: no.** Installed persistence,
    real pixels and geometry, live placeholder/window/Welcome behavior, native
    assistive technology, representative-user approval, and release remain open.

- **2026-08-13 — Optional tools now enter through one truthful Plugins registry**
  - **Acceptance criteria implemented:** the eight real packaged tools remain
    available through one named/described modal list, but no longer imitate an app
    marketplace. Every flat row has a localized name, plain description, neutral
    Available state, and one Open action. A dark Locus registry header, warm sheet,
    compact mono slot codes, and one cobalt locator replace the emoji blocks,
    per-tool gradients, blur, lift, scale, and rounded dashboard tiles. The owner-
    rejected previews supplied no design authority.
  - **Behavior and compatibility boundary:** one `PLUGIN_TOOL_OPENERS` allowlist
    routes the existing Pomodoro, Finance, Subscriptions, Habits, Hydration, Reading,
    Goals, and Workouts surfaces. Open rejects fail-closed recovery and duplicate
    activation, records the explicit More/app opener, makes lower body surfaces
    inert, balances the scroll lock, and focuses the first plugin. Tab remains in the
    hub; local Escape/backdrop closes only it; close is idempotent and restores the
    opener. A tool launch releases the hub and restores that visible app control
    before the existing tool dialog records focus, so tool close cannot target a
    hidden card. Unknown IDs do nothing. Tool data fields, real empty/data states,
    stable IDs, schema/import envelopes, routes, permissions, zero host permissions,
    and local-only privacy are unchanged; no install/enable flag, account, catalog,
    download, remote code, or new feature was added.
  - **Evidence:** focused DOM/source/CSS/i18n and production-extracted execution cover
    exact tool inventory, modal/list/button names, native English/zh-TW, explicit
    entry-point openers, duplicate/recovery/unknown refusal, background inertness,
    scroll-lock balance, tool dispatch, Tab/Escape/backdrop, opener restoration,
    800/620 reflow, Motion-off, reduced motion, forced colors, and removal of
    marketplace/emoji/gradient residue. Three first-pass failures were stale test
    extraction/signature assumptions and were repaired without changing unrelated
    runtime behavior. One uninterrupted pass covered all 40 JavaScript syntax files
    and all 31 runner commands. Concurrency completed 10,000 schedules (69,880
    attempts, 19,947 accepted, 49,379 rejected, 554 injected failures).
    **Implemented: yes. Verified: partial. User-validated: no. Released: no.** Real
    installed pixels, native assistive technology, exact responsive geometry,
    theme/locale/entry-point behavior, tool interiors, representative-user approval,
    and release remain open.

- **2026-08-13 — Settings Appearance now separates core choices from a local Style plugin**
  - **Acceptance criteria implemented:** the core ledger exposes only System,
    Locus Light, Locus Dark, item size, card URL visibility, and Motion. Fifteen
    compatible themes, eight bundled fonts, and column width remain available in
    one native Style-plugin disclosure whose Available/Active state is projected
    from the actual settings. Theme choices are named native buttons; pointer-only
    tiles, inline font styling, the cycling action, prototype blurbs, and ornamental
    motion are removed. The owner explicitly rejected preview imitation, so no
    preview dictated the hierarchy or visual language.
  - **Behavior and compatibility boundary:** each theme, density, width, font, URL,
    Motion, or optional-reset activation owns one allowlisted patch and one awaited
    `persistNow()` receipt. The shared Settings transaction blocks duplicate input,
    section changes, dismissal, Escape, and navigation while retaining Tab and the
    initiating focus owner. Rejection, existing recovery, graph adoption, or
    touched-value drift emits no saved state and hands off to authoritative recovery.
    Optional reset changes only theme/font/width. Existing values, aliases, theme
    files, prepaint/popup behavior, schema/import bytes, stable IDs, permissions,
    routes, and local-only privacy remain compatible; no account, marketplace,
    download, or fictional plugin installation was added.
  - **Evidence:** focused DOM/source/CSS/locale and production-extracted controller
    checks cover core/plugin containment, real-state projection, no-op/invalid/
    accepted/rejected/drift/adoption paths, reset scope, focus ownership, English/
    native zh-TW, 800/620 reflow, Motion-off, reduced motion, and forced colors. The
    first complete run exposed missing false-path stubs in extracted Group/Stack,
    item-detail, and reminder environments; after those harness repairs, one
    uninterrupted pass covered all 39 JavaScript syntax files and all 30 runner
    commands. Concurrency completed 10,000 schedules (69,880 attempts, 19,947
    accepted, 49,379 rejected, 554 injected failures), and `git diff --check` passed
    with existing line-ending warnings. **Implemented: yes. Verified: partial.
    User-validated: no. Released: no.** Real installed preference effects, pixels,
    native assistive technology, exact responsive geometry, theme/locale/reload/
    history behavior, representative-user approval, and release remain open.

- **2026-08-12 — Settings Capture now shows and saves one truthful policy**
  - **Acceptance criteria implemented:** a named Source tab → confirmed local copy
    → source-after-receipt route now derives the popup/direct destination, exact
    quick-save path, metadata, duplicate rule, and close/keep consequence from the
    current local graph and existing settings. The fake Page title/example.com
    preview, decorative 1/2/3 strip, false fallback reassurance, and obsolete visual
    residue are removed. Existing select/checkbox IDs remain native, described, and
    localized in English and independently authored zh-TW.
  - **Behavior and compatibility boundary:** the visible destination mirrors the
    real remembered Group → fixed Space → active Space order and refuses duplicate,
    moved, malformed, or ambiguous identity/Inbox truth. Each preference activation
    owns one allowlisted patch and one awaited `persistNow()` receipt; destination
    selection clears the remembered Group in the same write. Pending blocks duplicate
    input, section changes, drawer dismissal, Escape, and lower navigation while Tab
    remains trapped. Rejection, recovery preflight, State adoption, or touched-value
    drift emits no success and hands off to authoritative reload. Capture behavior,
    source-close guards, settings bytes/defaults, stable IDs, schema/import, routes,
    permissions, and local-only privacy remain unchanged.
  - **Evidence:** the first public contract failed on the missing settings-derived
    route. Focused DOM/source/CSS/locale and production-extracted model/controller
    checks now cover real paths, locale repaint, graph immutability, ambiguity,
    disabled stale defaults, pending/duplicate activation, accepted/rejected/drift
    receipts, atomic destination changes, invalid/no-op writes, focus, responsive
    stacking, reduced motion, and forced colors. The complete 38-file syntax pass,
    all 29 runners, `git diff --check`, and 10,000 concurrency schedules pass (69,880
    attempts, 19,947 accepted, 49,379 rejected, 554 injected failures).
    **Implemented: yes. Verified: partial. User-validated: no. Released: no.** Real
    installed persistence/capture coupling, pixels, native assistive technology,
    exact responsive geometry, live theme/locale/reload behavior, representative-
    user approval, and release remain open.

- **2026-08-12 — Settings Data is now one backup-first local transfer ledger**
  - **Acceptance criteria implemented:** Data leads with the real current-profile
    Export, live Workspace/item/UTF-8 summary, and an honest browser-download
    limitation. One native named button activates the preserved hidden JSON input;
    known files expose localized reading, invalid, blocked, ready, canceled, and
    completed states before a flat manifest review states exact Merge/Replace
    consequences. Bookmarks and pasted links are visibly secondary additions.
  - **Behavior and compatibility boundary:** the JSON review owns one pending
    interlock, trapped Tab, LIFO Escape, opener return, and Replace-to-Home focus.
    It remains open on rejected or unknown persistence and closes only after an
    accepted import. Bookmark import now freezes and re-resolves the exact active
    Workspace/Space across the browser read, blocks duplicate activation, awaits
    `persistNow()`, rolls back a rejected write, and exposes action-ID-scoped Undo
    only after acknowledgement. Existing payloads, validation, normalization,
    schema 0–12 and six legacy/current envelopes, stable IDs, permissions, routes,
    local-only privacy, and imported data bytes remain compatible. No cloud,
    account, encryption, scheduling, history, or invented format was added.
  - **Evidence:** the first public contract failed because backup did not precede
    import and JSON selection was not a native button. Focused source, CSS, locale,
    production-extracted FileReader/review controller, import scale, bookmark
    receipt, terminology, and quality contracts pass. The complete 38-file syntax
    pass, all 29 runners, `git diff --check`, and 10,000 concurrency schedules pass
    (69,880 attempts, 19,947 accepted, 49,379 rejected, 554 injected failures).
    **Implemented: yes. Verified: partial. User-validated: no. Released: no.** Real
    Chrome chooser/FileReader/download timing, installed import and bookmark
    effects, pixels, native assistive technology, exact responsive geometry,
    theme/locale switching, representative-user approval, and release remain open.

- **2026-08-12 — Settings Storage now separates browser truth from Locus estimates**
  - **Acceptance criteria implemented:** one native named capacity meter reports
    exact browser-profile usage across loading, known, near-limit, almost-full, and
    unavailable states, while a separately named register ranks only estimated
    current Locus JSON data. Real Archive status, the estimated total, an explicit
    empty explanation, Check again, profile-loss backup guidance, and permanent-
    deletion consequences resolve independently in English and native zh-TW.
  - **Behavior and compatibility boundary:** a generation token prevents stale
    asynchronous usage reads from repainting newer results. The pure breakdown uses
    UTF-8 bytes, partitions the serialized graph exactly, avoids double-counting
    Stack children, keeps Archive and Trash disjoint, and never mutates state.
    Existing stable IDs, Archive routing, quota policy/recovery, export/import bytes,
    schema, central writer, local-only privacy, permissions, and user data remain.
  - **Evidence:** the first focused contract failed on the absent localized native
    exact-usage meter. Production-extracted model, painter, refresh, renderer, locale,
    empty, stale-read, and focus checks pass with syntax, CSS, archive-scale,
    export/import-scale, state-sync, and quality contracts. All 38 JavaScript syntax
    files, all 29 runners, `git diff --check`, and 10,000 concurrency schedules pass
    (69,880 attempts, 19,947 accepted, 49,379 rejected, 554 injected failures).
    **Implemented: yes. Verified: partial. User-validated: no. Released: no.** Real
    Chrome usage/quota values and retry timing, installed pixels, native assistive
    technology, theme/locale switching, representative-user approval, and release
    remain open.

- **2026-08-12 — Storage-quota rejection is now a backup-first recovery sheet**
  - **Acceptance criteria implemented:** one 560 px Locus Index capacity docket
    distinguishes the current unsaved view from the latest saved copy, reports real
    browser-profile usage or an explicit unavailable state, leads with Download
    backup, and states the consequences of reloading to Archive or reloading saved
    data. The flat paper sheet uses a dark registry header, 6 px blocked-write rail,
    truthful meter, blue guidance, 44 px controls, one-column 520 px actions, no
    blur/entrance motion, and explicit reduced-motion and forced-color treatment.
  - **Behavior and compatibility boundary:** the existing stable quota IDs, real
    Export, Archive route, state writer, recovery overlay, schema/import bytes,
    storage thresholds, permissions, and local-only data remain. English and native
    zh-TW cover every static and dynamic state. Download owns pending, duplicate and
    dismissal blocking, honest requested/success/error status, and focus return.
    Quota recovery is the only safe layer above fail-closed reload recovery; it
    releases stale lower-dialog inert ownership, traps Tab, and closes LIFO to the
    reload control without returning focus to editable content.
  - **Evidence:** the first focused contract failed on the absent atomic described
    quota dialog. Focused syntax, visual-system, state-sync, item-detail, and quality
    contracts then passed. Production-extracted execution covers real and
    unavailable usage, pending/export success and failure, duplicate/Escape/outside
    blocking, opener return, exact Archive route, reload, and reload failure. All 38
    JavaScript syntax files, all 29 runners, `git diff --check`, and 10,000
    concurrency schedules pass (69,880 attempts, 19,947 accepted, 49,379 rejected,
    554 injected failures).
    **Implemented: yes. Verified: partial. User-validated: no. Released: no.** Real
    Chrome quota/download completion, installed pixels, native assistive technology,
    theme/locale switching, representative-user approval, and release remain open.

- **2026-08-12 — Global feedback is now one durable Locus Index receipt**
  - **Acceptance criteria implemented:** the existing stable receipt host now uses
    a flat theme-native sheet, 4 px tone locator, readable message lane, native
    40 px action/Undo/Close controls, restrained elevation, explicit focus, and a
    deliberate 520 px wrap. Spring/scale entrance and rounded floating-card residue
    are removed. Reduced motion and forced colors retain the same hierarchy.
  - **Behavior and compatibility boundary:** `toast()` distinguishes success,
    information, warning, and error; only errors become assertive alerts. A real
    action, exact Undo ID, or explicit persistent receipt never receives an expiry
    timer. Passive feedback may expire, but focus or pointer reading holds it.
    Feedback never steals focus; native Close and focused Escape dismiss one receipt
    and restore its connected opener. Core messages now resolve from independent
    English/native zh-TW copy, while accepted-but-uncertain outcomes use warning
    semantics. Save, persistence, Undo, routes, state, schema/import bytes, stable
    IDs, permissions, and product effects are unchanged; no stored feed or
    notification center was added.
  - **Evidence:** the first focused contract failed on the missing localized native
    Close control. Focused syntax, CSS/source, locale, residue, and production-
    extracted controller checks then passed, including durable actions, passive-
    only timing, assertive errors, one-shot continuation, Close/Escape focus return,
    and no accidental Undo. All 38 repository JavaScript syntax checks, all 29
    deterministic/stress runners, `git diff --check`, and 10,000 concurrency
    schedules pass (69,880 attempts, 19,947 accepted, 49,379 rejected, 554 injected
    failures). **Implemented: yes. Verified: partial. User-validated: no. Released:
    no.** Installed pixels, real pointer/keyboard/screen-reader and theme/locale/
    forced-color behavior, exact responsive geometry, navigation/reload, owner
    approval, representative-user comprehension, and release remain open.

- **2026-08-12 — Command discovery now uses one localized Locus Index registry**
  - **Acceptance criteria implemented:** the existing command palette now uses a
    flat theme-native filing sheet with a dark query owner, 3 px blue locator,
    44 px rows, paper result index, explicit locator-plus-outline focus, bounded
    scrolling, restrained elevation, and no blur or spring entrance. Settings and
    the shortcut dialog project one immutable 16-command definition model into
    14 app rows, 13 compact reference rows, and 2 browser-command rows.
  - **Behavior and compatibility boundary:** the palette retains its combobox,
    active descendant, Arrow/Home/End/Enter, contained Tab, true LIFO Escape, opener
    return, action order, and callbacks. The shortcut dialog retains contained Tab,
    outside/Close/Escape dismissal, and opener return. Browser-assigned keys remain
    live through guarded `chrome.commands.getAll()`; loading and unavailable states
    are explicit, blank assigned commands show localized **Not set**, and browser
    descriptions never become copy authority. English/native zh-TW resolve at render
    time. No command, route, state, Advanced-view promotion, schema/import byte,
    stable ID, permission, host access, network path, onboarding step, or fake state
    was added.
  - **Evidence:** the first focused contract failed on the absent no-blur/no-animation
    Locus Index rule. Focused syntax, CSS/source, and production-extracted model
    checks then passed, including immutable 14/13/2 projections, live custom-key
    replacement, unique IDs, locale-time resolution, and unassigned-key fallback.
    All 38 repository JavaScript syntax checks, all 29 deterministic/stress runners,
    `git diff --check`, and 10,000 concurrency schedules pass (69,880 attempts,
    19,947 accepted, 49,379 rejected, 554 injected failures). **Implemented: yes.
    Verified: partial. User-validated: no. Released: no.** Installed pixels, real
    customized Chrome keys, native pointer/keyboard/screen-reader and theme/locale/
    forced-color behavior, zoom/navigation, owner approval, representative-user
    comprehension, and release remain open.

- **2026-08-12 — Shared actions now use one localized Locus Index menu**
  - **Acceptance criteria implemented:** the existing `#context-menu` now projects
    every shared action list as a bounded 220-320 px filing sheet with a 3 px blue
    locator, 40 px rows, flat paper surface, restrained elevation, readable
    hierarchy, and locator-plus-outline focus. It has a localized screen-reader
    name. English/native zh-TW section names and layout names now come from the
    runtime dictionary; Board/List remain core while Canvas, Explorer, Timeline,
    Gallery, and Graph remain behind Advanced views.
  - **Behavior and compatibility boundary:** Arrow/Home/End, contained Tab,
    Enter/Space, outside dismissal, true LIFO Escape, opener focus return, action
    ordering, routes, and callbacks remain in the existing shared controller.
    Reduced motion removes menu transitions; forced colors replace paper/locator
    tokens with Canvas/Highlight. No command, surface, state mutation, schema/import
    byte, stable ID, permission, host access, network path, or fake state was added.
  - **Evidence:** the first focused contract failed on the absent viewport-bounded
    Locus Index rule. Focused syntax and visual-system contracts then passed, as did
    all 38 repository JavaScript syntax checks, all 29 deterministic/stress runners,
    `git diff --check`, and 10,000 concurrency schedules (69,880 attempts, 19,947
    accepted, 49,379 rejected, 554 injected failures). **Implemented: yes. Verified:
    partial. User-validated: no. Released: no.** Browser policy rejected the removed
    local presentation reference before rendering and was not bypassed. Installed
    pixels, real local data, actual pointer/keyboard/screen-reader and theme/locale/
    forced-color behavior, zoom/navigation, owner approval, representative-user
    comprehension, and release remain open.

- **2026-08-12 — Home uses the available 800 px work area without hiding Inbox**
  - **Acceptance criteria implemented:** at 900 px and below the existing Space
    registry resolves to 188 px and Home fills the remaining main width. The
    two-row Trail route now remains active through 761 px, with a bounded 310 px
    consequence lane that keeps both Save controls intact without collapsing the
    candidate. At 760 px and below the existing safe stack resumes; DOM/focus order,
    copy, state, effects, and the Opened Tabs preference are unchanged.
  - **Rendered and contract evidence:** the first red rejected the absent 761–1100
    projection. Exact runtime copy exposed a second red where the intrinsic action
    column became about 513 px and collapsed the 800 px candidate to 0; a final red
    rejected the 220 px action track that wrapped both consequences at 901 px.
    English/light 800×720 measures registry/Home 188/612 px, candidate/actions
    202/310 px, Trail 326.5 px, and Inbox bottom 673.6 px. Native zh-TW/Locus Dark
    keeps the same tracks and Inbox bottom 681.6 px. The 1100/901/761 px Inbox ends
    at 585/703.6/692 px with no horizontal overflow; 1280 remains one row.
  - **Verification boundary:** all 38 JavaScript syntax checks and all 29 documented
    deterministic/stress runners pass, including 10,000 concurrency schedules
    (69,880 attempts). **Implemented: yes. Verified: partial. User-validated: no.
    Released: no.** The reference was current-source production CSS and exact DOM/
    copy, not installed MV3 state. Real local-data pixels, actual preference/theme/
    locale switching, native assistive technology, zoom/history/reload, owner
    approval, representative-user comprehension, and release remain open.

- **2026-08-12 — Home Trail keeps the recovery loop visible at medium widths**
  - **Acceptance criteria implemented:** from 901 through 1100 px, the populated
    recovery lane now places saved item and destination in two rows beside the
    unchanged recovery actions; capture does the same for candidate and destination
    beside its Save actions. Above 1100 px the existing one-row ledger remains, and
    at 900 px and below the established vertical stack remains. The locator stays
    vertical in the medium route, the empty recovery state resets the grid areas,
    and source DOM/focus order is unchanged.
  - **Rendered and contract evidence:** the first Onboarding/Home Trail run failed
    because no exact 901–1100 px projection existed. Green source contracts require
    both named grid-area maps, their real child mappings, and the 2×28 px locator.
    A temporary removed current-source reference using production CSS and exact Trail
    markup measured a 285.5 px one-row Trail at 1280, a 351 px medium Trail at 1100,
    and a 350.5 px medium Trail at 901. Inbox ended at 519.5, 585, and 703.6 px
    respectively; Spaces ended at 652.5 and 718 px at 1280/1100. Document width
    equalled viewport width, and Locus Dark retained the 1100 px hierarchy. At 800
    px the established 507.5 px stack remains, honestly exposing a separate narrow-
    work-area issue rather than claiming the full Home hierarchy is complete.
  - **Evidence boundary:** all 38 JavaScript syntax files and all 29 documented
    deterministic/stress runners pass, including 10,000 concurrency schedules
    (69,880 attempts; 19,947 accepted; 49,379 rejected; 554 injected failures).
    **Implemented: yes. Verified: partial. User-validated: no. Released: no.** No
    runtime copy, DOM order, route, capture/recovery behavior, persistence, schema,
    import byte, stable ID, permission, host access, network path, or fake data
    changed. Installed populated pixels, actual theme/locale/assistive-technology
    output, zoom, reload/history, representative-user approval, and release remain
    open.

- **2026-08-12 — Core typography follows the selected font across every primary
  surface**
  - **Acceptance criteria implemented:** the eight existing font mappings now live
    in shared `themes.css`; `--font-display` governs readable headings and controls,
    and `--font-mono` remains the exact path/count/shortcut/receipt role. New-tab no
    longer hardcodes Lora or Geist Mono in presentation CSS. Popup validates and
    applies the persisted setting with a safe DM Sans fallback, so Lora remains an
    explicit choice instead of an untruthful default override.
  - **Rendered and contract evidence:** the first core visual contract failed on the
    absent shared `dm` role. Green source checks cover all eight choices, required
    Welcome/Home/Inbox/board/Search/Library/opened-tabs/popup selectors, monospace
    metadata, and popup runtime application. Fresh current-source pixels/computed
    styles show DM Sans headings at 1280×720 and 800×720 new-tab plus 420×590 and
    420×520 popup, no horizontal overflow, a 386×50 px primary Save, and visible
    keyboard focus.
  - **Evidence boundary:** all 38 JavaScript syntax files and all 29 documented
    deterministic/stress runners pass, including 10,000 concurrency schedules
    (69,880 attempts; 19,947 accepted; 49,379 rejected; 554 injected failures).
    `git diff --check` and all 10 untracked-file whitespace scans pass.
    **Implemented: yes. Verified: partial. User-validated: no. Released: no.** Direct
    HTTP lacks `chrome.storage.local`, so populated Welcome/Home/Inbox/Details,
    installed preference persistence, native screen-reader/forced-color output,
    zoom, representative-user approval, and release remain open.

- **2026-08-12 — Save all and existing-Group Save retain exact authority through
  source cleanup**
  - **Acceptance criteria implemented:** `saveAllTabs()` and both branches of
    `addSidebarOrActiveTabToGroup()` freeze the exact new saved items and their
    Workspace/Space/Group/list owner, pass the receipt resolver to the shared
    acknowledged commit, and expose the shared exact Open-destination result only
    while that receipt remains current. Adoption, rename, replacement, duplicate
    identity, read/allocation failure, unsupported-only input, recovery, overlap,
    and post-write drift cannot authorize a stale source close or success path.
  - **Contract evidence:** the first production-caller run failed because Save all
    reached persistence without `validateDestination`; the equivalent existing-
    Group test failed next. Green execution covers clean adoption during each
    browser read, pre/post-commit identity checks, one localized snapshot/receipt,
    retained unsupported selection, pending/recovery interlocks, and truthful
    destination-changed recovery. All 38 JavaScript syntax files and 29 documented
    deterministic/stress runners pass, including 10,000 concurrency schedules
    (69,880 attempts; 19,947 accepted; 49,379 rejected; 554 injected failures).
    `git diff --check` passes.
  - **Evidence boundary:** **Implemented: yes. Verified: partial. User-validated:
    no. Released: no.** Installed MV3 storage/tab ordering, real source removal,
    service-worker termination, real local data, native receipt focus/screen-reader
    output, representative-user comprehension, approval, and release remain open.

- **2026-08-12 — Selection becomes one receipt-gated Locus Index action docket**
  - **Acceptance criteria implemented:** `#item-sel-toolbar` keeps its stable ID but
    is now a named toolbar with a dark registry count edge, flat paper action rail,
    primary guarded Open, identity-editor Stack, and responsive Move/Archive/Clear.
    `createSelectedItemMutationContext()` freezes exact document-order item objects,
    value fingerprints, and Workspace/Space/Group/full-Stack owners. Batch Archive
    and Move reject duplicate, nested, moved, replaced, adopted, renamed, no-op,
    self, and descendant targets; take one localized snapshot; await one
    `persistNow()` receipt; and only then clear/render/focus/toast. Move preserves
    cross-Workspace destinations, names the exact path, and offers exact Undo plus
    Open destination.
  - **Visual and contract evidence:** the first-red selection contract failed on
    the missing exact transaction and now executes 6 production-seam cases. The
    1,024-item Archive scale harness uses the acknowledged path. Removed production-
    CSS references measured a 760×60 px one-row docket at 1280×720 and 800×720,
    plus a 544×141 px 2×2 action grid/full-height Clear rail at 560×720, with no
    horizontal overflow. Folio light/dark and keyboard focus passed; console
    warnings/errors were zero. All 38 JavaScript syntax files and 29 documented
    deterministic/stress runners pass, including 10,000 concurrency schedules
    (69,880 attempts; 19,947 accepted; 49,379 rejected; 554 injected failures).
    `git diff --check` passes.
  - **Evidence boundary:** **Implemented: yes. Verified: partial. User-validated:
    no. Released: no.** Installed MV3 storage and browser effects, real local data,
    native screen-reader/forced-color output, zoom, installed reload/Back/Forward,
    representative-user comprehension, owner approval, and release remain open.

- **2026-08-12 — Board/List records gain a native selection index and Details docket**
  - **Acceptance criteria implemented:** `attachItemSelection()` now returns one
    persistent 40 px native checkbox-role button for every Board, focused-Group,
    List, and Stack record. Its localized Select/Deselect name includes the real
    item title, Shift range behavior is retained, and a rebuild returns focus to the
    exact selector. List Stack no longer owns a second span implementation.
    `applyItemMeta()` emits a native localized Details row only when real notes,
    checklist entries, or custom fields exist; visible facts name that context and
    the shared sheet returns focus to the rebuilt row.
  - **Visual and compatibility boundary:** the selector is one squared filing-index
    cell with a non-color selected edge, distinct from Todo completion. Details is a
    full-width ruled 40 px docket row whose facts wrap instead of becoming pills or
    glyph riddles. Imported cover bytes now enter only `background-color`. No new
    stored field, fake state, editor, route, schema/import mutation, stable-ID
    change, permission, host access, or network boundary was added.
  - **Evidence:** the first public-seam run failed because selection returned no
    native focus owner. Green DOM/CSS contracts cover localized names/state, native
    activation, exact focus return, conditional Details, route ownership, forced-
    color boundaries, and prototype-residue removal. A temporary removed production-
    fragment reference measured exact 40 px controls without horizontal overflow at
    1280×720 and 800×720 light plus 560×720 dark zh-TW; the console was clean. All
    37 JavaScript syntax checks and all 28 documented runners pass, including 10,000
    concurrency schedules and 69,880 attempts. `git diff --check` and all 9
    untracked-file whitespace scans pass. **Implemented: yes. Verified: partial.
    User-validated: no. Released: no.** The reference is not installed runtime or
    real-data evidence; installed MV3 behavior, native assistive-technology and
    forced-color output, zoom, reload/back/forward, representative-user
    comprehension, owner approval, and release remain open.

- **2026-08-12 — Note/To-do color is now a truthful Locus Index marker strip**
  - **Acceptance criteria implemented:** the existing named item-color radiogroup
    now distinguishes absent, standard, and imported custom values. A current custom
    value appears as one selected localized marker and remains byte-for-byte intact;
    choosing it closes without a write. Standard choices retain the exact-target,
    single-snapshot, awaited-receipt, pending, recovery, and focus-return controller.
  - **Visual convergence:** the old glass/flex/circular palette is now one bounded
    paper register with a 3 px locator edge, 40 px rectangular marker tabs, restrained
    elevation, 3 px focus, and a deliberate 4 + 3 layout for seven choices. No new
    editor, runtime copy, field, route, schema/import change, stable-ID change,
    permission, host access, network boundary, or fake data was added. Custom paint
    uses `background-color`, so malformed imported bytes cannot become an image
    background.
  - **Evidence:** the first focused run failed on the missing seventh choice; later
    red checks rejected the old glass language and an unbalanced 6 + 1 wrap. All 37
    repository JavaScript syntax checks and all 28 documented runners pass; a final
    privacy red rejected the image-capable `background` shorthand. The 10,000-
    schedule stress run completed 69,880 attempts. `git diff --check` and all
    9 untracked-file whitespace scans pass. A bounded production-CSS 320 x 420
    light/dark reference measured a 304 px 4 + 3 strip, exact custom swatch, selected
    state, and no horizontal overflow or blur/gradient.
    **Implemented: yes. Verified: partial. User-validated: no. Released: no.** The
    reference predates only the color-only property hardening and is not installed-
    runtime evidence; installed MV3 effects, real local
    data, native keyboard/screen-reader and forced-color pixels, zoom, approval, and
    release remain open. The prior queue claim that Note/To-do writers were still
    fire-and-forget was stale and is repaired: current source already receipt-gates
    Note text, To-do text/completion, and standard item color.

- **2026-08-12 — Locus Index replaces the rejected core visual direction**
  - **Acceptance criteria implemented:** the compatible Folio light/dark defaults
    now define shared paper, registry, locator, receipt, and 3 px focus tokens.
    Welcome, Home/Inbox records, Search/Library, Settings, saved-item detail/dialogs,
    the optional launch layer, and popup use one dark-registry/warm-stock hierarchy.
    Welcome splits real source context from the save operation; Home becomes a ruled
    registry; detail becomes a recovery sheet; popup places Save above Hibernate.
  - **Behavior and compatibility boundary:** the final new-tab/popup presentation
    layers add no runtime copy, fake populated state, route, field, schema/import
    mutation, stable-ID change, permission, network access, or storage path. Existing
    native controls, focus/Escape/opener/pending behavior, light/dark themes, reduced
    motion, forced-color boundaries, and Advanced-view demotion remain intact.
  - **Evidence:** the first-red visual contract stopped on the absent registry token.
    Green source checks and bounded current-source references cover light Home,
    Welcome, detail, dark Home, exact 800 px Home/Welcome, 560 px detail, and popup
    at 420×590/420×520 without horizontal overflow. Popup used its genuine missing-
    extension-API error. All 37 JavaScript syntax checks and all 28 documented
    runners pass; the 10,000-schedule stress run completed 69,880 attempts. `git
    diff --check` and all 9 untracked-file whitespace scans pass. **Implemented:
    yes. Verified: partial. User-validated: no. Released: no.** Direct localhost
    new-tab boot lacks extension storage, Inbox fixture pixels were unreliable, and
    installed MV3/real-data pixels, native keyboard/screen-reader output, forced-
    color pixels, zoom, representative-user comprehension, approval, and release
    remain open.

- **2026-08-12 — New-tab Group captures disclose and reopen their exact destination**
  - **Acceptance criteria implemented:** selected-as-Group and all six Board/List
    Group/Stack single/multi drop entries now freeze the exact active Workspace,
    Space, Group, full Stack ancestry, owner names/references, item-list owner, new
    item identities/values, and browser source descriptors. One graph-wide
    allocator, localized history entry, acknowledged write, and localized
    Workspace › Space › Group › optional Stack receipt replace generic English
    success. The receipt exposes Undo plus a primary **Open destination** action.
  - **Failure, focus, and compatibility boundary:** missing, duplicate, moved,
    replaced, renamed, stale, malformed, unsupported-only, duplicate-only,
    recovery, competing, rejected, and acknowledgement-unknown cases cannot claim
    success or gain new source-close authority. `commitCapturedTabs()` revalidates
    the exact destination before/after asynchronous refresh and persistence, and
    before/after every final source read. Post-acceptance drift becomes an explicit
    warning with Undo but no Open action; unverified remaining sources stay open.
    Open fresh-resolves, routes read-only, and focuses the rebuilt Group/deepest
    Stack. The shared receipt now uses a green edge, 40 px primary Open and quiet
    Undo, 520 px action reflow, forced-color equivalents, and no hover scale.
    Schema/import bytes, stable IDs, custom colors, routes, permissions, and local-
    only privacy remain unchanged.
  - **Evidence:** the first red onboarding run stopped on the absent exact list
    walker. Green production-extracted cases cover nested receipts, stale/moved/
    duplicate identities, value drift, read-only routing, exact focus, warning
    semantics, source drift between two cleanup reads, en/zh-TW parity, responsive
    CSS, and existing Undo/state/concurrency behavior. Removed non-shipping
    production-CSS references rendered at 1280, 800, and 520 px in Folio light and
    at 800 px in Folio Dark with native zh-TW. All 36 syntax checks and all 27
    deterministic runners pass, including 10,000 randomized concurrency schedules
    (69,880 attempts); `git diff --check` and the 8-file untracked whitespace scan
    pass. **Implemented: yes. Verified: partial (source,
    production-extracted deterministic behavior, and bounded current-source
    component references). User-validated: no. Released: no.** Installed MV3
    storage/tab timing, native drag and cleanup, installed pixels/focus/screen-
    reader output, representative-user comprehension, approval, and release remain
    open; the required Chrome browser-control extension was unavailable.

- **2026-08-12 — Opened Tabs becomes a truthful live-source ledger**
  - **Acceptance criteria implemented:** the rail now distinguishes loading,
    Chrome-read failure with Retry, true empty, filter no-match with Clear,
    selected, saving, sleeping, current, and non-saveable states. Each real source
    has native named Select, Switch, and Close controls; Select/Close stay visible
    at 40 px. The selected receipt band exposes full-text Save-to-Group and Save-to-
    Inbox actions instead of compact icons, while unsupported tabs plainly retain
    only switch/selection/Clear/Close authority.
  - **Interaction, responsive, and compatibility boundary:** pointer context,
    Context Menu, and Shift+F10 share `openTabActionMenuItems()` through
    `bindBoardItemContextMenu()` after exact rendered-tab resolution. `S` expands a
    reachable rail before filter focus; Escape clears filter, selection, then the
    821–1280 px drawer without outranking overlays; the 800 px hidden rail receives
    no focus, and accepted capture there returns to visible top-bar Save. Existing
    capture controllers own persistence and guarded source close; their pending
    state now disables duplicate rail Save actions. Stored graphs,
    destinations, schema/import bytes, stable IDs, routes, preference shape,
    permissions, and local-only privacy are unchanged.
  - **Evidence:** the first-red onboarding check stopped on the missing native Switch
    control. Green production-extracted contracts execute state/failure recovery,
    hidden-focus refusal and visible fallback, responsive expansion, the three-step
    Escape stack, exact context actions, pending interlocks, en/zh-TW parity, and
    existing capture/Undo/concurrency boundaries. Current-source CSS rendered a
    fixed 320 px drawer at
    1280×720 and no rail geometry at 800×720. A removed non-shipping light/dark
    control matrix exposed and then verified the contrast fix: light metadata 5.79:1,
    guidance 6.50:1, dark metadata 7.44:1. All 36 syntax checks, all 27 deterministic
    runners, the default 10,000-schedule concurrency matrix, `git diff --check`, and
    8 untracked-file whitespace scans pass. **Implemented: yes. Verified: partial
    (source/deterministic plus bounded current-source CSS/fixture rendering). User-
    validated: no. Released: no.** Installed MV3 real-data states, Chrome switch/
    close/context/drag/capture effects, native zh-TW/forced-color pixels, zoom,
    screen-reader output, representative-user comprehension, and release remain
    open.

- **2026-08-12 — Board/List Stacks become subordinate filing sleeves**
  - **Acceptance criteria implemented:** Board and List now project the same quiet
    Stack header with a real stored-color binder rail, localized Stack/item context,
    and persistent 40 px collapse, symbol, and More controls. Bare count pills, the
    Board-only intention icon, and per-layout menu builders are removed.
  - **Interaction, failure, and compatibility boundary:** both layouts pass the
    exact rendered Stack, parent list, Group, and actual opener through
    `stackActionMenuItems()` and `bindBoardItemContextMenu()`. Missing, duplicate,
    moved, retyped, or replaced targets expose no actions. Complete Stack Archive
    reuses the accepted-storage local-item transaction and List pending ownership;
    failure preserves nested data behind recovery without render, success, retry, or
    focus movement. Collapse, identity, selection, drag/drop, capture, schema/import
    bytes, custom colors, locale keys, routes, IDs, permissions, and privacy remain
    unchanged.
  - **Evidence:** first-red onboarding, identity, Library, and rendered-owner checks
    prove the contracts predated production changes. Green source/CSS and production-
    extracted tests cover real-color/indent projection, responsive and forced-color
    hierarchy, shared action/focus ownership, complete Archive, and stale/moved
    refusal. All 36 syntax checks, all 27 deterministic runners, the default 10,000-
    schedule concurrency matrix, `git diff --check`, and 8 untracked-file whitespace
    scans pass. **Implemented: yes. Verified: partial (source/CSS and deterministic
    behavior only). User-validated: no. Released: no.**

- **2026-08-12 — List Groups become scan-first filing registers**
  - **Acceptance criteria implemented:** List now renders one flat Group register
    with the real stored color as a 4 px locator, the visible name as a native
    focused-page route, localized item/to-do context, and persistent 40 px Open all,
    Add tab, and More controls. The fourth page icon, bare pills, symbol scaling,
    hover-only action reveal, and hardcoded English Add-tab tooltip are removed.
  - **Interaction, responsive, and compatibility boundary:** Board and List consume
    one `groupActionMenuItems()` exact-target action model through
    `bindBoardItemContextMenu()`. More, right-click, Context Menu, and Shift+F10 use
    the actual opener for placement and Escape return; stale/replaced Groups expose
    no menu actions. At 900 px actions move to a deliberate second line and remain
    40 px through 800/560 px. Existing collapse, identity, capture, selection,
    drag/drop, records, schema/import bytes, stable IDs/selectors, routes, locale
    keys, permissions, storage, recovery, and local-only privacy remain unchanged.
  - **Evidence:** the first red onboarding run stopped on the missing shared Group
    action model. Green source/CSS contracts require the native route, localized
    context, real-color register, persistent control rail, shared opener path,
    compact reflow, forced-color locator, and removal of prototype residue. All 36
    syntax checks and all 27 deterministic runners pass, including 10,000 randomized
    concurrency schedules; `git diff --check` and the 8-file untracked whitespace
    scan pass. **Implemented: yes. Verified: partial (source, CSS, and production-
    extracted deterministic evidence). User-validated: no. Released: no.** Installed
    real-data pixels, actual 1280 x 720/800/560 geometry, real Chrome focus/context/
    capture/drag/storage effects, dark/zh-TW, zoom, screen-reader output,
    representative-user comprehension, and release remain open.

- **2026-08-12 — Group containers become flat filing registers**
  - **Acceptance criteria implemented:** Board, Canvas reuse, and focused Group pages
    now share one shadowless Group register with the real stored color as a 4 px
    locator spine; Advanced Canvas reuses the inner register while retaining its
    placement elevation. The visible Group name is the native page route; Open all
    and More remain visible at 40 px; symbol, collapse, and footer targets follow the same
    control rhythm. Bento/lacquer overrides, the entrance animation, symbol rotation,
    title mask, duplicate page icon, and hover-only action overlay are removed.
  - **Interaction, responsive, and compatibility boundary:** More, right-click,
    Context Menu, and Shift+F10 converge through `bindBoardItemContextMenu()` and
    retain the actual opener for anchoring and Escape return. Existing collapse,
    identity, Open-all, add, drag/drop, pointer/Arrow resize, empty/recovery, and
    persistence behavior is unchanged. Unsized Board Groups fill the lane at 800 px;
    stored sizes remain viewport-bounded. Light/dark, privacy blur, reduced motion,
    forced colors, stable selectors/IDs, imported bytes, schema, routes, locale keys,
    permissions, and local-only privacy remain intact.
  - **Evidence:** the first red onboarding run stopped on the absent native
    Group-name route. Green source/CSS checks require the flat shell, real-color
    locator, persistent controls, actual-opener menu wiring, 800 px rule, and removed
    bento/motion residue. Group/Stack identity, organization move/creation,
    saved-page Reopen, onboarding, and quality contracts pass. All 36 syntax checks
    and all 27 runners pass, including 10,000 randomized concurrency schedules;
    `git diff --check` and the 8-file untracked whitespace scan pass. **Implemented:
    yes. Verified: partial (source, CSS, and production-extracted deterministic
    evidence). User-validated: no. Released: no.** Installed real-data pixels,
    actual 1280 x 720/800/narrow geometry, real Chrome focus/context/drag/resize/
    storage effects, dark/zh-TW, zoom, screen-reader output, representative-user
    comprehension, and release remain open.

- **2026-08-12 — Board saved pages join the trustworthy record hierarchy**
  - **Acceptance criteria implemented:** every saved page now uses the shared filing
    header with existing localized Link type, optional in-flow reminder, one native
    title/Open target, real source domain, and one item-named 40 px More control. The
    three-icon hover strip and direct Archive X are removed. Board, focused-Group,
    and List reuse retain the same hierarchy without ornamental motion.
  - **Interaction, recovery, and compatibility boundary:** More, right-click,
    Context Menu, and Shift+F10 converge through `bindBoardItemContextMenu()` and
    retain the real Open or More opener for anchoring, Escape return, and receipt
    feedback. Foreground Open keeps guarded reuse; background Open deliberately uses
    `reuse: false`. Copy, Edit title, Details, Favorite, Read Later, and Archive keep
    their established safe controllers. Archive still awaits accepted storage before
    successor focus. Existing data bytes, custom colors/details, stable IDs, schema,
    routes, permissions, locale strings, and local-only privacy stay intact.
  - **Evidence:** the first red onboarding run stopped on the absent saved-page
    filing header. Green production-extracted checks cover shared menu/openers,
    localized actions, background-new disposition, acknowledged Copy, return-marker
    focus, and accepted Archive successor fallback. Saved-page Reopen and Library
    recovery suites remain green. All 36 syntax checks and all 27 runners pass,
    including 10,000 randomized concurrency schedules; `git diff --check` and the
    8-file untracked whitespace scan pass. **Implemented: yes. Verified: partial
    (source, CSS, and production-extracted deterministic evidence). User-validated:
    no. Released: no.** Installed real-data pixels, actual 1280 x 720/800/narrow
    geometry, real Chrome focus/selection/drag/storage effects, dark/zh-TW, zoom,
    screen-reader output, representative-user comprehension, and release remain open.

- **2026-08-12 — Board Note and To-do cards share one trustworthy record hierarchy**
  - **Acceptance criteria implemented:** both local item types now use one filing
    header with an existing localized type label, optional in-flow reminder, real
    content, and one persistent item-named 40 px More control. The hover-only direct
    Archive X and redundant shell Tab stop are gone. Note uses a restrained accent/
    paper wash instead of the yellow sticky-note costume; To-do completion is 24 px;
    infinite reminder motion is removed; List view preserves the same hierarchy.
  - **Interaction, recovery, and compatibility boundary:** pointer, Context Menu,
    and Shift+F10 converge through `bindBoardItemContextMenu()` and retain the actual
    prepared opener. An active inline editor settles its existing exact receipt before
    the menu opens. Note/To-do Archive now freezes exhaustive identity, blocks
    competing local mutations, awaits one `persistNow()`, keeps failure behind
    recovery without success/retry, and moves focus only after acceptance to sibling,
    Group, or Board. Existing edit/completion/color controllers, IDs, imported bytes,
    schema, routes, permissions, locale strings, and local-only privacy stay intact.
  - **Evidence:** the first red onboarding run stopped on the absent local Archive
    context. Green production-extracted tests cover accepted/rejected/stale/retyped
    Archive, complete local-record preservation, duplicate-pending blocking, prepared
    pointer/keyboard openers, and post-rebuild focus. All 36 syntax checks and all 27
    runners pass, including 10,000 randomized concurrency schedules; `git diff
    --check` and the 8-file untracked whitespace scan pass. **Implemented: yes.
    Verified: partial (source, CSS, and production-extracted deterministic evidence).
    User-validated: no. Released: no.** Installed real-data pixels, actual
    1280×720/800/narrow geometry, real Chrome focus/drag/storage effects, dark/zh-TW,
    zoom, screen-reader output, representative-user comprehension, and release remain
    open.

- **2026-08-12 — Settings is one indexed control ledger**
  - **Acceptance criteria implemented:** General through About retain their eight
    established sections and real controls, but now share one numbered filing index,
    one active cobalt marker, and one 900 px ledger. Former `.sp-grid` card layouts
    flatten into labelled control rows. Privacy becomes a quiet rail boundary plus
    one green-spined proof row rather than a second promotional dashboard.
  - **Interaction, responsive, and compatibility boundary:** opening Settings focuses
    its active section; changing sections keeps that entry visible without stealing
    focus. Existing `aria-current`, modal Tab/Escape/opener behavior, legacy deep-link
    aliases, pane renderers, empty/no-match/storage behavior, stable ids, English/
    native zh-TW copy, schema/import shape, permissions, storage, and local-only
    privacy are unchanged. Controls are at least 40 px; the rail becomes a scrollable
    top index at 880 px, rows stack at 620 px, reduced motion removes animation, and
    forced colors retain one panel plus row separators.
  - **Evidence:** the first red quality gate failed on the absent ledger marker,
    indexed rail, unified panel, row grid, focus, responsive, and motion contracts.
    Green checks require those boundaries plus stable ids, active-entry scrolling/
    focus, and forced-color separators. All 36 syntax checks and 27 runners pass,
    including 10,000 concurrency schedules; `git diff --check` passes. The ephemeral
    unpacked headless render did not initialize and produced no screenshot.
    **Implemented: yes. Verified: partial (static and deterministic evidence).
    User-validated: no. Released: no.** Installed real-data pixels, actual 1280×720/
    800/620 px geometry, live Chrome focus/scroll behavior, dark/zh-TW, zoom, screen-
    reader output, representative-user comprehension, and release remain open.

- **2026-08-12 — Library keeps each saved page in one filing record**
  - **Acceptance criteria implemented:** All Links, Favorites, and Read Later now
    use one heading/scope, 52 px find/sort row, quiet count/status rail, and cobalt-
    spined ledger. Every real row keeps title, complete Workspace › Space › Group ›
    optional Stack path, and source together; saved/queued age remains separate and
    scannable. Visible actions lead with Open page and View details, followed by the
    existing Favorite/read-status control and More. More no longer duplicates those
    visible actions and retains only Read Later add/remove and Archive.
  - **Interaction, responsive, and compatibility boundary:** existing URL-backed
    query/status/sort/item state, query Escape, exact-target refusal, safe Open,
    Details, receipt-gated mutations, pending interlocks, anchored keyboard menus,
    successor focus, and empty/no-match behavior are unchanged. Rows remain coherent
    above 1100 px, actions take one second line at 1100 px, and query/sort, age,
    status, and actions reflow at 760 px. Controls are at least 40 px. English/native
    zh-TW copy, dark tokens, reduced motion, forced colors, schema/import shape,
    stable IDs, permissions, storage, and local-only privacy remain intact; privacy
    blur now also covers the moved Workspace scope.
  - **Evidence:** the first red contract stopped on the old heading/toolbar order;
    later red checks caught the nested query focus ring and unblurred Workspace
    scope. Green source/CSS contracts require the filing hierarchy, record block,
    Open-first ordering, nonduplicated More, responsive spine, control sizes, focus,
    privacy, and forced-color boundaries. The production-extracted Library matrix
    stays green for routes, recovery, mutations, menus, focus, empty states, and
    locale parity. All 36 syntax checks and 27 runners pass, including 10,000
    concurrency schedules; `git diff --check` passes. **Implemented: yes. Verified:
    partial (static and
    production-extracted deterministic evidence). User-validated: no. Released: no.**
    Installed real-data pixels, real Chrome tab/history/storage effects, dark/zh-TW,
    zoom, screen-reader output, representative-user comprehension, and release remain
    open.

- **2026-08-12 — Search is one exact-location recovery ledger**
  - **Acceptance criteria implemented:** Search now leads with a 56 px locator query
    and flat content-type rail. Every real result gives its complete wrapping
    Workspace › Space › Group path first-class hierarchy and separates saved age
    from optional snippet/tags. The selected record puts guarded Open page and View
    details immediately below its exact Saved in route. Opening filters above
    1100 px creates one tray over the two-column ledger rather than a third column.
  - **Interaction, responsive, and compatibility boundary:** existing IME/debounce,
    Arrow/Home/End roving selection, Enter/double-click recovery, URL-backed filter/
    sort/selection/detail/continuation state, unsafe-URL refusal, failure/empty
    states, focus return, and exact-target controllers are unchanged. Detail moves
    below at 1100 px, the ledger becomes a block at 900 px, and paths/actions reflow
    at 620 px. Controls are at least 40 px. English/native zh-TW copy, dark tokens,
    reduced motion, forced colors, schema/import shape, stable IDs, permissions,
    storage, and local-only privacy remain intact.
  - **Evidence:** the first red contract stopped on the decorative heading icon.
    Green source/CSS contracts require location-first rows, immediate recovery
    actions, the flat type rail, wide filter tray, wrapping mono paths, control
    sizes, and forced-color boundaries. The production-extracted Search matrix stays
    green for exact recovery, routes, keyboard/IME, continuation, failure states,
    locale parity, and focus. All 36 syntax checks and 27 runners pass, including
    10,000 concurrency schedules; `git diff --check` passes. **Implemented: yes.
    Verified: partial (static and
    production-extracted deterministic evidence). User-validated: no. Released: no.**
    Installed real-data pixels, real Chrome tab/history/storage effects, dark/zh-TW,
    zoom, screen-reader output, representative-user comprehension, and release remain
    open.

- **2026-08-12 — Saved-item Details is one recovery docket**
  - **Acceptance criteria implemented:** the route-backed sheet now leads with one
    type + complete wrapping Workspace › Space › Group filing line, then one visible
    title/body field and a dominant guarded Open action. It no longer repeats the
    record title in the header. Why saved, Reminder, and Tags align as scan-friendly
    context rows; Cover, Checklist, and Custom fields remain under More details.
  - **Interaction, responsive, and compatibility boundary:** the exact hidden title
    still names the modal for assistive technology. Existing Tab containment,
    editor-first Escape, reminder/detail/recovery stack, receipt-pending interlocks,
    opener/rebuilt-target focus, unsafe-URL refusal, and transaction controllers are
    unchanged. The sheet is 560 px at 1280/800, becomes full-screen at 520 px, stacks
    context at 560 px, and gives Open, Close, the primary To-do toggle, and context
    actions 40 px targets. English/native zh-TW copy, dark tokens, forced colors,
    reduced motion, schema/import shape, stable IDs, permissions, storage, and local-
    only privacy remain intact.
  - **Evidence:** the first red contract stopped on the missing docket line. Green
    source/CSS checks require the exact path, sole visible record identity, context
    rows, responsive structure, control sizes, and retained accessible dialog name.
    The production-extracted controller matrix remains green for exact identity,
    acknowledged persistence, rejection/unknown recovery, reminders, routes, focus,
    and unsafe Open. All 36 syntax checks and 27 runners pass, including 10,000
    concurrency schedules. **Implemented: yes. Verified: partial (static and
    production-extracted deterministic evidence). User-validated: no. Released: no.**
    Installed pixels with real local data, real history/pagehide/storage effects,
    dark/zh-TW, zoom, screen-reader output, representative-user comprehension, and
    release remain open.

- **2026-08-12 — Home ends in a Space filing register, not a second dashboard**
  - **Acceptance criteria implemented:** Trail and exact Inbox review remain Home's
    first two zones. The final Spaces zone is now one grouped register with at most
    three rows. Each row uses the stored Space symbol, name/count, one newest real
    item or the existing empty state, a localized **Open space**, and its established
    anchored More menu. It makes no recency or populated-state claim.
  - **Interaction, responsive, and compatibility boundary:** preview, Open, and More
    remain native controls; no whole-card click target, modal, or Escape layer was
    added. Existing exact detail/Space routes, menu focus return, rename/reminder/
    removal actions, and tab-drop capture remain intact. Rows reflow at 900 px and
    become one column at 560 px; 40 px actions, focus-within, dark tokens, reduced
    motion, and forced colors are explicit. Schema/import data, custom symbols/colors,
    stable IDs, permissions, storage, privacy, and source effects did not change.
  - **Evidence:** the first red Home contract stopped on the absent register class.
    Green source/CSS checks require the stored symbol, one-item limit, localized Open
    actions, wide/900/560 px structure, focus and forced-color boundaries, and reject
    the removed name-inferred icon map, synthetic accent hash, unused collections
    builder, and their production styles. All 36 syntax checks and 27 runners pass,
    including 10,000 concurrency schedules. **Implemented: yes. Verified: partial
    (static and production-extracted deterministic evidence). User-validated: no.
    Released: no.** Installed Home pixels with real local data, actual 1280×720 and
    800/560 px rendering, real drag/drop, dark/zh-TW, zoom, assistive technology,
    representative-user comprehension, and release remain open.

- **2026-08-12 — Welcome previews the exact first filing route**
  - **Acceptance criteria implemented:** the first-use sheet now presents the real
    reviewed browser tab and exact Workspace › Space › Inbox as equal fields joined
    by the Field Desk locator. The single primary action explicitly says **Save and
    close tab**; acceptance still opens Inbox and focuses the saved item's direct
    native Open action.
  - **Failure, interaction, and compatibility boundary:** Welcome freezes and
    re-resolves the exact active destination, fresh-reads the exact source tab, and
    rejects query failure, no eligible tab, missing/ambiguous or drifting authority,
    source navigation/activation/window drift, recovery, failed persistence, and
    duplicate activation before false success or source cleanup. One pending owner
    disables Save, Retry, Explore, and Escape dismissal while Tab remains trapped.
    English/native zh-TW, 800/520 px rules, dark tokens, reduced motion, and forced
    colors are covered without changing the accepted capture controller, Inbox route,
    schema/import shape, permissions, storage, or local-only privacy.
  - **Evidence:** the first red contract stopped on the missing filing sheet. Green
    production-extracted cases cover exact path projection, fresh source read,
    destination/tab drift, pending Escape, known failure recovery, Inbox/Open focus,
    and existing loading/empty/query states. At the real 1280×720 localhost page,
    computed hidden-DOM evidence reports one 720 px sheet, `1fr 48px 1fr` route,
    98 px fields, a 44 px DM Sans primary action, and one complete accessible
    description chain. All 36 syntax checks and 27 runners pass, including 10,000
    concurrency schedules. **Implemented: yes. Verified: partial (static,
    production-extracted deterministic, and bounded current-source DOM evidence).
    User-validated: no. Released: no.** Browser policy prevented a synthetic visual
    preview and was not bypassed. Installed pixels/effects, rendered 800/520 px,
    dark/zh-TW, zoom, assistive technology, representative-user activation, and
    release remain open.

- **2026-08-12 — Popup reads as one trustworthy capture docket**
  - **Acceptance criteria implemented:** at 420×590 the popup now reads brand →
    current window → dominant Save → quieter Hibernate → status/destination. One
    explicit loading/error/ready controller makes every main capture control
    natively and semantically unavailable until the window is readable. Failure is
    one atomic named alert that says no tab was saved or closed and focuses Retry.
  - **Interaction, responsive, and compatibility boundary:** Retry returns to the
    first available search/Save target after success; repeated failure rebuilds and
    refocuses Retry. The shortcut hint is platform-correct, the existing LIFO
    More/Back/Escape opener contract remains intact, and the 520 px rule bounds the
    tab list while preserving the two-line privacy footer. English/native zh-TW,
    light/dark tokens, reduced motion, and forced colors are covered without changing
    capture semantics, receipts, stable existing IDs, schema/import shape,
    permissions, routes, storage, or local-only privacy.
  - **Evidence:** current source rendered at an exact 420×590 popup body with the
    genuine unavailable-extension-API state: Search, Save, Hibernate, and Save
    current tab were disabled; one focused 40 px Retry sat beneath a 14 px title and
    12 px consequence; Save was visibly wider than Hibernate; and the privacy footer
    remained readable. More/Escape restored opener focus and repeated Retry preserved
    the inert state. All 36 JavaScript syntax checks and all 27 documented runners
    pass, including 10,000 concurrency schedules. **Implemented: yes. Verified:
    partial (static, deterministic, and bounded English/light current-source
    rendering). User-validated: no. Released: no.** Installed real Chrome APIs/tab
    effects, success/receipt pixels, dark/zh-TW/420×520 rendering, zoom, assistive-
    technology output, representative-user comprehension, and release remain open.

- **2026-08-12 — Save all keeps exact Space authority across the window read**
  - **Acceptance criteria implemented:** Save all freezes the globally unique active
    Workspace/Space objects, IDs, names, and Group-list owner before
    `chrome.tabs.query()`, then re-resolves the same authority afterward. One
    graph-wide allocator supplies the generated Group and all item IDs. One localized
    snapshot precedes one mutation, the exact Workspace › Space › Group receipt is
    frozen before the guarded commit, and success follows only an accepted receipt.
  - **Failure, interaction, and compatibility boundary:** read rejection, no eligible
    pages, duplicate activation, recovery, a competing capture, changed/replaced/
    ambiguous authority, and allocation failure stop before persistent effects or
    source cleanup. Existing native controls retain focus; no overlay, Escape layer,
    DOM, responsive rule, schema, import shape, permission, route, or privacy boundary
    changed. English and native zh-TW cover every new runtime message.
  - **Evidence:** the production-extracted red case replaced the state graph during
    the browser read and showed the detached Space receiving a Group while the current
    graph stayed empty before commit/success. The permanent regression now proves
    zero mutation, history, write, render, success, ID allocation, or source effect in
    that race; focused failure states also pass. All 36 JavaScript syntax checks and
    all 27 documented runners pass, including 10,000 concurrency schedules.
    **Implemented: yes. Verified: partial (static and production-extracted
    deterministic evidence). User-validated: no. Released: no.** Installed storage/
    tab timing, rendered/AT feedback, representative-user trust, and release remain
    open.

- **2026-08-12 — Field Desk visual foundation across the core extension
  (owner-rejected; superseded by Locus Index)**
  - **Acceptance criteria implemented:** Locus/Locus Dark now use warm paper or
    deep ink, a cobalt locator edge, a green receipt signal, an 8 px rhythm,
    restrained radii/elevation, and 38–44 px controls. Welcome, Home/Inbox,
    Search/Library, empty states, Settings, dialogs, saved-item detail, and popup
    share that grammar. Home reads as a recovery desk; the open-tabs rail yields at
    1280 px; launch scenery and ornamental core-loop transforms are suppressed.
  - **Behavior and compatibility boundary:** presentation only. Existing focus,
    keyboard/Escape order, pending interlocks, opener return, routes, stable element
    IDs, schema/import compatibility, local-only storage, zero-host-permission
    boundary, and real runtime state remain unchanged. Advanced layouts remain
    contextual rather than being visually promoted by this pass.
  - **Evidence:** all 36 repository JavaScript files, all 27 documented quality/
    contract runners, and the quality gate pass in one clean run. Current-source
    1280×720 rendering shows the shared shell/locator treatment and collapsed rail
    in the isolated Home reference fixture, plus the popup's primary Save, real
    Chrome-API error, destination/receipt hierarchy, and wrapping privacy footer.
    Test-only route sandboxes were aligned with the current pending guards, and one
    capture assertion now tolerates additional valid commit options; production
    behavior did not change. **Implemented: yes. Verified: partial (static,
    deterministic, and bounded current-source rendering). User-validated: rejected
    by the owner on 2026-08-12. Released: no.** The Home fixture is not runtime
    authority. Installed MV3,
    actual new-tab content, a real 800 px viewport, dark-theme pixels, zoom,
    assistive-technology output, and representative-user approval remain open.

- **2026-08-09 - Existing-Group Add / Save confirms its exact destination**
  - **Acceptance criteria implemented:** selected-tab and active-tab Add / Save on
    an existing Group now name the accepted Workspace › Space › Group in the existing
    toast. One/many and close/keep-open variants are localized in English and native
    zh-TW, with “copy” explicit when source tabs stay open.
  - **Authority and compatibility boundary:** one reviewed context freezes exact
    runtime references, names, item-list ownership, and stable IDs without
    normalization. Active-tab capture reports a rejected `tabs.query()` and
    re-resolves after a successful read. Changed,
    replaced, duplicate-ID, malformed, or ambiguous authority saves and closes
    nothing. The receipt freezes before the guarded commit and appears only after
    acceptance; incomplete display paths retain a localized fallback. No surface,
    schema, migration, permission, network, privacy, or browser-effect boundary
    changed.
  - **Evidence:** the production-extracted red case first failed because the shared
    destination formatter was absent. It now covers whitespace-bearing IDs, rename/
    item-list replacement and duplicate-ID refusal, read rejection/change zero effects,
    one accepted selected-tab write, pre-write path freezing, URL/selection behavior,
    and locale parity. **Implemented: yes. Verified: partial (static and production-
    extracted deterministic evidence only). User-validated: no. Released: no.**
    Installed effects, rendered toast/AT output, representative-user comprehension,
    approval, and release remain open.

- **2026-08-09 - New-tab Inbox Saves name the accepted destination**
  - **Acceptance criteria implemented:** single-tab, selected-tab, and Space-drop
    Inbox Saves now reuse the existing toast to name the accepted-time Workspace ›
    Space › Inbox path. One/many and close/keep-open variants are localized in
    English and native zh-TW; keep-open feedback explicitly says “copy.”
  - **Ordering and compatibility boundary:** each path freezes its receipt before
    `commitCapturedTabs()` and presents it only after accepted persistence. The
    existing result suffix remains authoritative for closed, stayed-open, and partial
    source effects. Incomplete paths fall back to the existing localized generic
    message. No surface, navigation, stored data, schema, ID, migration, permission,
    network, privacy, or browser-effect boundary changed.
  - **Evidence:** the production-extracted contract first failed because the shared
    formatter was absent. It now covers exact path, titled/one/many/copy variants,
    incomplete-path refusal, zh-TW literals, and static accepted-order convergence
    across all three mutation functions. **Implemented: yes. Verified: partial
    (static and production-extracted deterministic evidence only). User-validated:
    no. Released: no.** Installed effects, rendered toast/AT output,
    representative-user comprehension, approval, and release remain open.

- **2026-08-09 - New-tab Inbox capture refuses ambiguous destinations**
  - **Acceptance criteria implemented:** opened-tab, Welcome, command-palette,
    top-bar/Home single-tab, selected-tab, and Space-drop Inbox saves now converge
    on one exact destination review. One existing Inbox is reused; an unchanged
    absent Inbox is provisioned once; duplicate, replaced, renamed, malformed, or
    ambiguous authority saves and closes nothing.
  - **Identity and compatibility boundary:** review precedes history; materialization
    follows the snapshot and uses the graph-wide collision-safe organization ID
    allocator. Runtime references, exact IDs (including legal whitespace-bearing
    imports), visible names, active Workspace ownership, Group uniqueness, and item
    arrays must remain unchanged. Refusal does not repair data, clear selection,
    render success, dispatch a state write, or touch source tabs.
  - **Evidence:** the production-extracted runner failed before the shared resolver
    existed, and a second red case caught accidental ID trimming. It now covers
    exact reuse, absent provisioning, duplicate refusal, zero pre-refusal effects,
    localized consequence copy, and static convergence of single, selected, and
    dropped-tab paths. **Implemented: yes. Verified: partial (static and production-
    extracted deterministic evidence only). User-validated: no. Released: no.**
    Installed storage/tab effects, cross-context ordering, rendered toast,
    assistive-technology output, representative-user comprehension, approval, and
    release remain open.

- **2026-08-09 - Home exposes only truthful recovery zones**
  - **Acceptance criteria implemented:** Home always renders the Locus Trail, then
    renders Inbox review only for one exact active Inbox and renders Spaces only
    when at least one Space exists. No-Space Home therefore keeps one Create-space
    prerequisite; zero-Inbox and duplicate-Inbox Home no longer claim an arbitrary
    Inbox target, while real Spaces remain available.
  - **Identity and no-write boundary:** the Inbox zone consumes
    `createLandingInboxContext()` and delegates activation to the existing
    `openInboxView()` exact, fail-closed, `{ persist: false }` controller. It no
    longer finds the first Group named Inbox. No copy, CSS, data, schema, migration,
    permission, network, capture, or persistence path changed.
  - **Evidence:** the existing production-extracted Home runner failed before the
    progressive plan existed and now covers no Space, zero Inbox, one exact Inbox,
    duplicate Inbox, exact-context wiring, shared navigation, render ordering, and
    removal of first-name selection. **Implemented: yes. Verified: partial (static
    and production-extracted deterministic evidence only). User-validated: no.
    Released: no.** Installed pixels, real Router/history behavior, assistive-
    technology output, representative-user comprehension, approval, and release
    remain open.

- **2026-08-09 - Home can continue from duplicate-Inbox conflict**
  - **Acceptance criteria implemented:** when the active Space contains more than one
    Inbox, Home now pairs its existing review instruction with **Open space / 開啟空間**.
    A saved-item recovery action keeps primary emphasis; otherwise this sole safe
    continuation becomes primary. Missing and exact/provisionable Inbox states keep
    their existing Create-space or Save behavior.
  - **Identity and no-write boundary:** activation re-resolves one globally unique
    Workspace/Space with unchanged references, names, and active ownership, then
    opens its board through `{ persist: false }`. It never chooses an Inbox, repairs,
    renames, snapshots, or persists data. Replacement, ambiguity, changed ownership,
    or route refusal leaves Home in place, reports that nothing opened or changed,
    and returns focus.
  - **Evidence:** the production-extracted contract failed before the exact review
    resolver existed and now covers state-aware action emphasis, exact navigation,
    conflict resolution before activation, replacement, duplicate ID, route refusal,
    no graph/write effects, focus, wiring, and English/native zh-TW copy.
    **Implemented: yes. Verified: partial (static and production-extracted
    deterministic evidence only). User-validated: no. Released: no.** Installed
    pixels, real Router/history behavior, assistive-technology output,
    representative-user comprehension, approval, and release remain open.

- **2026-08-09 - Search clears filters without discarding sort**
  - **Acceptance criteria implemented:** the filter panel now says **Clear filters /
    清除篩選條件**, resets content type, Space, time, Has tags, and exact tag through
    one shared patch, and preserves the current query, chosen sort, and open panel.
    The existing result-meaning controller still returns expanded results to the
    first 100-row window.
  - **Truth and interaction boundary:** the action is natively disabled when no
    filter is active; query or sort alone do not enable it. Panel and no-result
    recovery now share the same filter-active predicate and reset patch. No new
    surface, message, persistence, data, schema, migration, permission, network, or
    privacy behavior was added.
  - **Evidence:** the production-extracted contract failed before the shared helpers
    existed and now covers default, query/sort-only, all filter dimensions, exact
    reset scope, native disabled wiring, en/zh-TW copy, and disabled styling.
    **Implemented: yes. Verified: partial (static and production-extracted
    deterministic evidence only). User-validated: no. Released: no.** Installed
    pixels, real pointer/keyboard behavior, assistive-technology output,
    representative-user comprehension, approval, and release remain open.

- **2026-08-09 - Search shows when collapsed filters still apply**
  - **Acceptance criteria implemented:** the existing Search filter control now
    shows one compact count when its panel-owned Space, time, or tag dimensions are
    active. Its accessible name includes localized active-count context; the visual
    badge is hidden from assistive technology to avoid a duplicate announcement.
  - **Truth and compatibility boundary:** query, content type, and sort remain out of
    the count because their controls stay visible. `hasTags` and an exact tag count
    as one dimension. Nothing auto-opens, clears, rewrites, or persists, and Search
    matching, routes, data, schema, migrations, permissions, network, and privacy
    boundaries are unchanged.
  - **Evidence:** the production-extracted contract failed before the pure count
    helper existed and now covers default, combined, defensive mixed-tag, and
    visible-control cases plus en/zh-TW naming, duplicate-announcement avoidance,
    active styling, and forced colors. **Implemented: yes. Verified: partial (static
    and production-extracted deterministic evidence only). User-validated: no.
    Released: no.** Installed pixels, assistive-technology output, theme/zoom
    behavior, representative-user comprehension, approval, and release remain open.

- **2026-08-09 - Home can remove its missing-Space prerequisite**
  - **Acceptance criteria implemented:** when the active Workspace has no Space,
    the Home Trail now places one primary **Create space** action beside the visible
    save prerequisite. It remains available across loading, empty, and failed tab
    queries and is the sole primary action in that blocked state.
  - **Reuse and safety boundary:** the button opens the existing localized,
    focus-contained, stable-ID, receipt-gated organization controller with itself as
    opener. It does not appear for a present Space with duplicate Inboxes. No new
    modal, automatic data, copy, locale, persistence path, schema, migration,
    permission, host access, network behavior, or privacy boundary was added.
  - **Evidence:** the production-extracted plan/source contract failed before the
    helper existed and now passes exact no-Space/present-Space behavior, accessible
    description, and controller wiring. Two stale Favorite/Read Later assertions and
    the Archive harness were aligned with current acknowledged production behavior
    so the focused runner executes rather than stopping early. **Implemented: yes.
    Verified: partial (static and production-extracted deterministic evidence only).
    User-validated: no. Released: no.** Installed pixels, real dialog/storage timing,
    screen-reader output, representative-user comprehension, approval, and release
    remain open. Queue order is unchanged.

- **2026-08-09 - Extension-directed network release preflight**
  - **Acceptance criteria implemented:** the existing quality gate now rejects
    `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `sendBeacon` in the
    six release runtime sources; remote executable/linked/embedded/object/SVG
    resources in all three extension pages; and remote imports or `url()` resources
    in all four release stylesheets.
  - **Trust boundary:** explicit user actions may still open saved HTTP(S) pages.
    Packaged assets, data images, and Chromium's local `_favicon/` endpoint remain
    allowed. Production runtime, UI, manifest, local data, schema, IDs, migrations,
    locales, permissions, and host access are unchanged.
  - **Evidence:** a combined in-memory `fetch` plus remote script plus remote CSS
    mutation passed the old gate and is now rejected. Twelve detached negative
    probes cover every guarded source class; current source, syntax, and scoped
    whitespace pass. **Implemented: yes. Verified: partial (static source and
    negative-regression evidence only). User-validated: no. Released: no.** The
    unpacked CSP/favicon/network log, installed MV3 behavior, representative-user
    trust, approval, Store review, and release remain open. Queue order is unchanged.

- **2026-08-09 — Exact release-manifest privacy allowlist**
  - **Acceptance criteria implemented:** the release gate now requires exactly the
    seven permissions disclosed in README—tabs, storage, context menus, bookmarks,
    alarms, notifications, and favicon—with no missing, extra, or duplicate entry.
    Required/optional host patterns, optional API permissions, automatic content
    scripts, and external website/extension messaging are forbidden.
  - **Trust boundary:** the production manifest and requested capabilities are
    unchanged. Any future permission expansion must deliberately change the gate
    and user disclosure together instead of silently weakening the no-host-access/
    no-automatic-page-reading promise.
  - **Evidence:** a combined in-memory manifest with `scripting`, optional all-HTTPS
    access, an HTTPS content script, and external messaging passed the old gate. It
    is now rejected. Eight detached negative probes cover every guarded surface;
    the current manifest, gate syntax, repository quality, and scoped whitespace
    pass. **Implemented: yes. Verified: partial (static release-manifest evidence
    only). User-validated: no. Released: no.** Installed permission prompts, runtime
    network silence, Store policy review, representative-user trust, approval, and
    release remain open. Queue order is unchanged; P0-03/P0-06/P0-11 still require
    candidate and installed evidence.

- **2026-08-09 — Hibernate waits for earlier popup writes**
  - **Acceptance criteria implemented:** after acquiring existing popup ownership,
    both one-tab and bulk Hibernate now drain the serialized state-write queue before
    querying or navigating tabs. A selection, destination, or preference receipt
    already in flight therefore settles before Hibernate can reload whole-state
    truth. The initiating action remains busy through the wait.
  - **Boundary:** accepted and rejected queued writes already settle the shared
    queue, so this changes ordering only. Existing Save-before-Hibernate behavior,
    partial-effect accounting, success/failure feedback, refresh, and zero-retry
    policy remain unchanged. No new lock, state, copy, UI, schema, permission, host
    access, or network behavior was added.
  - **Evidence:** the held-write production regression failed before the fix because
    one-tab navigation started early, then passes zero pre-release effects plus the
    existing overlap/release matrix. A source guard places the same drain before the
    bulk candidate query. The full runner completes 5 client queues, 2 capture flows,
    10 deterministic and 10,000 randomized schedules (69,880 attempts); syntax and
    quality gates pass. **Implemented: yes. Verified: partial (production-extracted
    deterministic evidence only). User-validated: no. Released: no.** Installed
    popup teardown, real tab/storage-event ordering, accessibility, representative-
    user comprehension, approval, and release remain open. Queue order is unchanged.

- **2026-08-09 — Single-tab Hibernate cannot race popup Save**
  - **Acceptance criteria implemented:** the row-level Hibernate action now acquires
    the same popup action interlock as Save, window capture, bookmark import, and
    bulk Hibernate before navigating a tab. It keeps ownership through the popup
    refresh and releases on success or failure. A competing action is refused with
    existing busy feedback; a failed navigation is not retried or followed by a
    state reload.
  - **Trust boundary:** this prevents a completed Hibernate reload from replacing
    the popup's live candidate while a Save receipt is pending. No new state,
    dialog, confirmation, copy, retry, schema, permission, host access, or network
    behavior was added.
  - **Evidence:** activating the canonical concurrency runner exposed and repaired
    a stale `doSave()` harness that previously exited silently before dispatch. The
    new production-extracted regression then failed on the unguarded function and
    passes Hibernate-first, capture-first, success, failure, release, zero blocked
    effects, and zero retry. The runner completes 5 client queues, 2 capture flows,
    10 deterministic schedules, and 10,000 fixed-seed randomized schedules (69,880
    attempts); touched syntax and repository quality pass. **Implemented: yes.
    Verified: partial (production-extracted deterministic evidence only). User-
    validated: no. Released: no.** Installed popup lifetime, real tab/storage event
    ordering, screen-reader feedback, representative-user comprehension, approval,
    and release remain open. Queue order is unchanged.

- **2026-08-09 — Exact Restore destinations wrap instead of disappearing**
  - **Acceptance criteria implemented:** only the shared Archive/Trash return-address
    slip now wraps naturally, including unbroken user-controlled names. Item titles,
    dates/countdowns, selection markers, the filing manifest, and one-click Restore
    keep their existing compact behavior and hierarchy.
  - **Evidence:** the realistic English route changed from 810px in a 683px clipped
    slot to a complete two-line route at 1280x720; native zh-TW changed from 448px
    in a 340px clipped slot to a complete two-line route at 800x720. The affected
    rows grow only to 64.84px and 66.84px; shorter rows remain 64px. Exact text,
    visible/enabled Restore actions, board containment, bounded document width, and
    empty browser logs hold in Locus Light and Dark. The focused recovery contract,
    touched syntax, and repository quality gate pass. **Implemented: yes. Verified:
    partial (static and rendered-current-source evidence only). User-validated: no.
    Released: no.** Installed behavior, zoom/extreme names, live reduced motion/
    forced colors, screen-reader output, representative-user comprehension,
    approval, and release remain open. Queue order is unchanged: installed
    durability/core activation still outranks further visual refinement.

- **2026-08-09 — Readable local-storage and retention trust cards**
  - **Acceptance criteria implemented:** Archive's Local card replaces its 60%
    solid accent fill with an 8% theme-accent wash; Trash keeps its 5% red wash.
    Each semantic heading now mixes 80% hue with 20% `--text`, and both evidence
    lines use `--text2`. The durability/export warning and retention window remain
    in the same summary grid with no new card, copy, icon, action, or step.
  - **Evidence:** Archive Light label/body improves 1.99/1.11 → 5.55/5.33 and Dark
    3.05/1.54 → 7.58/7.01. Trash Light improves 3.67/2.45 → 5.06/5.54 and Dark
    6.39/3.40 → 7.49/7.43. English/light 1280x720 and native zh-TW/dark 800x720
    renders retain grid geometry, complete text, open-manifest containment, focus,
    and bounded width with no captured browser warnings/errors. The fixture now
    applies the real Trash-specific classes, and the focused contract recomputes all
    four token mixes with a 4.5:1 floor. Syntax, quality, and scoped whitespace
    checks pass. **Implemented: yes. Verified: partial (static and rendered-current-
    source evidence only). User-validated: no. Released: no.** Installed behavior,
    live reduced motion/forced colors, screen-reader output, representative-user
    comprehension, approval, and release remain open. Queue order is unchanged:
    installed durability/core activation still outranks further visual refinement.

- **2026-08-09 — Readable selected Restore rows in Locus Light and Dark**
  - **Acceptance criteria implemented:** selected Archive/Trash rows replace the
    72% solid accent fill with a restrained 10% theme-accent wash. The checked box
    and 3px filing edge remain the strong selection markers, while the exact return
    address and selected date/countdown use the existing readable `--text2` token.
    No controller markup, action, copy, or step changed.
  - **Evidence:** the production-CSS fixture measured Light title/destination/time
    contrast at 6.20/2.07/1.09 before and 15.57/5.19/5.19 after. Locus Dark measured
    5.66/2.77/1.27 before and 13.82/6.78/6.78 after. English/light 1280x720 and
    native zh-TW/dark 800x720 renders retain selection, open-manifest containment,
    focus, reachable actions, and bounded document width with no captured browser
    warnings/errors. The focused contract now recomputes the two release-theme
    mixes and requires at least 4.5:1; syntax, quality, and scoped whitespace checks
    pass. **Implemented: yes. Verified: partial (static and rendered-current-source
    evidence only). User-validated: no. Released: no.** Installed controller/
    storage behavior, live reduced motion and forced colors, screen-reader output,
    representative-user comprehension, approval, and release remain open. Queue
    order is unchanged because installed durability/core activation still outranks
    further visual refinement.

- **2026-08-09 — Selected Restore manifest stays inside the recovery ledger**
  - **Acceptance criteria implemented:** at the existing narrow Archive/Trash
    breakpoint, the full selection strip now owns the open destination list's
    positioning context and caps that list at the strip width. Long Workspace / Space
    / Group return addresses no longer begin behind the sidebar; the selected count,
    native disclosure, Restore action, and secondary action remain unchanged.
  - **Visual boundary:** the existing filing manifest remains the sole signature
    element. No modal, wizard, toast, copy, palette, font, animation, controller,
    schema, permission, host access, or network behavior was added.
  - **Evidence:** a production-CSS fixture first reproduced the 800x720 defect: the
    list began at x=146 while the sidebar ended at x=196. Current-source English/
    light 1280x720 and native zh-TW/Locus Dark 800x720 renders now keep the list
    inside the board, both actions inside the viewport, document width bounded, and
    2px keyboard focus visible on the disclosure and Restore; captured browser logs
    were empty. The focused recovery contract, touched syntax, repository quality
    gate, and scoped whitespace checks pass. **Implemented: yes. Verified: partial
    (static and rendered-current-source evidence only). User-validated: no.
    Released: no.** Installed controller/storage behavior, live reduced motion,
    native disclosure/Escape semantics, screen-reader output, representative-user
    comprehension, approval, and release remain open. Queue order is unchanged:
    installed durability and core-activation evidence still outrank another visual
    refinement.

- **2026-08-09 — Receipt-gated selected note, to-do, and Stack Restore**
  - **Acceptance criteria implemented:** local-item-only selection in the primary
    Archive and Trash ledgers now shows one exact `Workspace / Space / Group` route
    inline or every destination and item count in the existing native disclosure.
    Notes, to-dos, and Stacks may be mixed because they share the same Group return
    rule. `Restore selected` remains one click after review; page/non-page and Group/
    local-item mixtures keep their separate-selection rules.
  - **Identity and effect boundary:** the batch review composes exact individual
    reviews, complete entry/item values including Trash retention, every root and
    nested stable ID, selected order, and grouped destination refs/IDs/names. Commit
    re-resolves the whole set under the shared Restore pending owner, creates at
    most one collision-safe Inbox per reviewed Space, removes only reviewed entries,
    appends the original objects in selected order without cloning or rekeying, and
    awaits one `State.persistNow()`. Acceptance alone rebuilds projections, announces
    the exact route or item/destination count with Undo, and focuses ledger search.
  - **Evidence:** the production-extracted tracer failed first because the local-
    item batch seam was absent. It now passes a mixed note/to-do/complete Stack,
    one and several destinations, one Inbox shared by two selected items, exact
    object/order retention, duplicate/stale/recovery/unknown refusal, one accepted
    write with zero pre-receipt projection, strict Trash collection/retention,
    native en/zh-TW copy, disclosure/focus wiring, and the shared receipt signal.
    This is deterministic source-level evidence only; installed MV3 storage/
    retention and restored-reminder behavior, real large-selection geometry,
    keyboard/screen-reader output, representative-user comprehension, approval,
    and release remain open.

- **2026-08-09 — Receipt-gated individual note, to-do, and Stack Restore**
  - **Acceptance criteria implemented:** primary Archive and Trash rows for notes,
    to-dos, and Stacks now show the exact current `Workspace / Space / Group`
    destination while retaining the Archive date or Trash expiry countdown.
    Restore remains one click after review. Compact Search and the retained Settings
    list now open and focus that canonical primary-Archive review instead of
    restoring immediately. Selected local-item Restore remains unchanged.
  - **Identity and effect boundary:** review freezes one exact entry, complete root
    item value, every nested Stack/item stable ID, and exact existing/new-Inbox
    destination. Commit re-resolves the whole graph under the shared Restore pending
    owner, creates at most one collision-safe Inbox, appends the original object
    without cloning or rekeying, and awaits one `State.persistNow()`. Acceptance
    alone rebuilds projections, names the exact destination with Undo, and continues
    focus. Stale, conflicting, malformed, recovery-owned, rejected, or unknown
    truth adds no repaint, success, retry, or second write.
  - **Evidence:** the production-extracted tracer failed first at the missing local-
    item identity seam. It now passes all three root types, a complete nested Stack,
    exact route/object/ID retention, existing and collision-safe new Inbox plans,
    active/duplicate/stale/recovery/unknown refusal, strict Trash collection and
    retention behavior, native en/zh-TW copy, primary/compact wiring, and the shared
    receipt signal. This is deterministic source-level evidence only; installed MV3
    storage/retention timing, restored reminder behavior, real route wrapping,
    keyboard/screen-reader output, representative-user comprehension, approval, and
    release remain open.

- **2026-08-09 — Receipt-gated selected Group Restore**
  - **Acceptance criteria implemented:** Group-only selection in the primary
    Archive and Trash ledgers now shows one exact `Workspace / Space` route inline
    or every destination and Group count in the existing native disclosure.
    `Restore selected` remains one click after review. Groups mixed with notes,
    to-dos, or Stacks receive a direct separate-selection instruction; any selection
    containing saved pages keeps the existing saved-page rule. Local-item-only
    selection remains unchanged.
  - **Identity and effect boundary:** the batch review composes duplicate-free exact
    Group reviews, complete entry/Group values including Trash retention, every
    nested stable ID, selected order, and grouped destination refs/IDs/names. Commit
    re-resolves the whole set under the shared Restore pending owner, removes only
    reviewed entries, appends the original Group objects in selected order without
    cloning or rekeying, and awaits one `State.persistNow()`. Acceptance alone
    rebuilds projections, announces an exact route or Group/destination count with
    Undo, and focuses ledger search. Stale, conflicting, recovery-owned, rejected,
    or unknown truth adds no repaint, success, focus, retry, or second write.
  - **Evidence:** the production-extracted tracer failed first because Group
    destination grouping was absent. It now passes two and one destinations, exact
    object/order retention, duplicate identity and mixed-content refusal,
    stale/recovery/duplicate-pending and unknown-ack handling, one accepted write,
    zero pre-receipt projection, strict Trash retention/collection behavior, exact
    one/many-destination success, en/zh-TW copy, disclosure/focus wiring, and the
    shared receipt signal. Focused contract, touched JavaScript syntax, repository
    quality, and scoped whitespace checks pass. **Implemented: yes. Verified:
    partial (static and production-extracted deterministic evidence only). User-
    validated: no. Released: no.** Installed MV3 storage/retention and restored-
    reminder behavior, real large-selection geometry, native disclosure/focus and
    screen-reader output, representative-user comprehension, approval, and release
    remain open.

- **2026-08-09 — Receipt-gated individual Group Restore**
  - **Acceptance criteria implemented:** primary Archive and Trash Group rows now
    show the exact current `Workspace / Space` return route while retaining the
    Group's item count and Archive date or Trash expiry countdown. Restore remains
    one click after review. Compact Search and the dormant Settings archive list
    now point Groups to that exact primary-Archive row instead of exposing an
    immediate hidden-destination Restore. Group-only selection remains unchanged.
  - **Identity and effect boundary:** review freezes one exact collection-owned
    entry, its complete Group/envelope value including retention, every unique
    nested Group/item/Stack ID, and the destination refs/IDs/names. IDs must be
    absent everywhere else in active Workspaces, Archive, and Trash. Commit
    re-resolves all truth under the shared Restore pending owner, appends the
    original Group object without cloning or rekeying, and awaits one
    `State.persistNow()`. Acceptance alone rebuilds projections, announces the exact
    destination with Undo, and continues focus. Stale, conflicting, recovery-owned,
    rejected, or unknown truth adds no repaint, success, focus, retry, or second
    write.
  - **Evidence:** the production-extracted public-seam test failed first because the
    nested Group identity resolver was absent. It now passes exact Archive and
    strict Trash review/commit, nested object/reminder and retention preservation,
    active-ID and cross-collection refusal, stale/recovery/duplicate-pending and
    unknown-ack handling, one accepted write, zero pre-receipt projection, exact
    destination success, compact routing, destination-only accessible labels,
    en/zh-TW copy, and render/focus/busy wiring. Focused contract, touched JavaScript
    syntax, repository quality, and scoped whitespace checks pass. **Implemented:
    yes. Verified: partial (static and production-extracted deterministic evidence
    only). User-validated: no. Released: no.** Installed MV3 storage/retention and
    restored-reminder behavior, real route/count wrapping, keyboard/screen-reader
    output, representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Receipt-gated saved-page Restore from Trash**
  - **Acceptance criteria implemented:** each saved-page Trash row now shows the
    exact current `Workspace / Space / Group` return route beside its title while
    preserving the independent expiry countdown. Row Restore and saved-page-only
    selection reuse the established one/many-destination filing review; mixed page/
    non-page selection is disabled with a direct separate-selection instruction.
    Non-tab-only Trash Restore remains unchanged.
  - **Identity and effect boundary:** review freezes exact Trash entry references,
    complete values including retention fields, unique absent active item IDs,
    collection ownership, and current destinations. Commit re-resolves that truth
    under the shared Restore pending owner, creates at most one collision-safe Inbox
    per exact Space, retains original page objects and order, and awaits one
    `State.persistNow()`. Acceptance alone removes the Trash rows, rebuilds
    projections, announces the exact route or destination count with Undo, and
    continues focus. Stale, rejected, or unknown truth adds no repaint, success,
    focus, retry, or second write.
  - **Evidence:** the focused public-seam contract failed first because the Trash
    wrapper did not exist. It now passes exact row and two-destination batch reviews,
    one accepted write each, zero pre-receipt projection, object/retention
    preservation, collection isolation, exact destination success, en/zh-TW copy,
    accessible row labels, selection disclosure, and render/busy wiring. Touched
    JavaScript syntax, repository quality, and scoped whitespace checks pass.
    **Implemented: yes. Verified: partial (static and production-extracted
    deterministic evidence only). User-validated: no. Released: no.** Installed MV3
    storage/retention timing, real countdown/route geometry, native disclosure and
    assistive-technology output, representative-user comprehension, approval, and
    release remain open.

- **2026-08-09 — Receipt-gated selected saved-page Restore**
  - **Acceptance criteria implemented:** selecting saved pages in the primary
    Archive ledger now keeps their filing consequence visible without adding a
    modal. One destination appears directly in the selection bar; several appear
    as a compact native disclosure listing every exact Workspace / Space / Group
    route and page count. `Restore selected` stays one click after review. Mixed
    saved-page/non-page selection gives a precise separate-selection instruction
    instead of letting pages fall into the legacy writer; non-tab-only selection
    remains unchanged.
  - **Identity and effect boundary:** the batch review freezes duplicate-free exact
    Archive entries, unique absent active item IDs, full values, destination refs/
    IDs/names, and their visible grouping. Commit re-resolves the whole set after
    taking the shared individual/batch pending owner, allocates collision-safe IDs,
    creates at most one planned Inbox per exact Space, retains original tab objects
    and order, and awaits one `State.persistNow()`. Acceptance alone rebuilds the
    projections, announces an exact route or destination count with Undo, and moves
    focus to Archive search. Stale, recovery-owned, rejected, or unknown truth adds
    no repaint, success, focus, retry, or second write.
  - **Evidence:** the focused public-seam contract failed first because the batch
    context did not exist. It now passes two destinations, one shared missing Inbox,
    duplicate/mixed/stale/recovery refusal, duplicate pending, exact identity/order,
    one accepted write, zero pre-receipt projection, unknown acknowledgement without
    retry, exact one/many-destination success, en/zh-TW copy, inline disclosure, and
    busy/interlock wiring. Touched JavaScript syntax, repository quality, and scoped
    whitespace checks pass. **Implemented: yes. Verified: partial (static and
    production-extracted deterministic evidence only). User-validated: no.
    Released: no.** Installed MV3 timing, real large-selection rendering, native
    disclosure/focus, keyboard and screen-reader output, representative-user
    comprehension, approval, and release remain open.

- **2026-08-09 — Compact saved-page Restore converges on one review**
  - **Acceptance criteria implemented:** the reachable Search archive result no
    longer offers an immediate saved-page Restore whose destination is hidden. Its
    single right-arrow continuation exposes the exact localized destination in its
    accessible tooltip, opens the canonical Archive ledger, and focuses that exact
    entry's visible Restore control. The dormant null-guarded Settings archive
    renderer follows the same rule so it cannot silently recreate the bypass if
    its removed container returns. Non-tab compact Restore remains unchanged.
  - **Identity and effect boundary:** compact rows freeze the existing exact
    archived-page review. Activation re-resolves entry reference/value, active-ID
    absence, and destination before navigation. Stale truth keeps the source open;
    post-route drift remains in Archive with an explanation and safe fallback
    focus. The continuation performs no snapshot, graph mutation, Inbox creation,
    durable route write, persistence, retry, or success/Undo claim.
  - **Evidence:** the focused production-extracted contract failed first because
    the continuation seam was absent. It now passes current/stale/post-route cases,
    exact entry-reference focus, zero Restore/persistence delegation, Search and
    dormant Settings wiring, and scoped non-tab preservation. Touched JavaScript
    syntax, repository quality, and scoped whitespace checks pass. **Implemented:
    yes. Verified: partial (static and production-extracted deterministic evidence
    only). User-validated: no. Released: no.** Installed routing/focus, rendered
    tooltip/disabled pixels, keyboard and screen-reader behavior, representative-
    user comprehension, approval, and release remain open.

- **2026-08-09 — Destination-explicit, receipt-gated saved-page Restore**
  - **Acceptance criteria implemented:** each tab in the primary Archive ledger now
    says exactly where it will return: current Workspace › Space › Group. Original
    containers retain priority; missing containers preserve the established active/
    first and existing/new Inbox fallbacks, but the actual fallback is visible
    before activation. The compact row keeps its title, time, selection, and actions;
    no confirmation dialog, panel, spinner, badge, palette, font, or route was added.
  - **Identity and effect boundary:** the render review freezes one exact Archive
    entry/data reference and full value, requires no active stable-ID collision, and
    owns exact destination refs/IDs/names plus whether Inbox must be created.
    Activation re-resolves all of that after taking the exact button/row and route
    interlock. One localized destination snapshot, exact collection removal, optional
    Inbox allocation, original tab object, and `State.persistNow()` own the move.
    Acceptance alone renders active/Archive projections, updates navigation, shows
    destination-specific Undo success, and permits neighbor/search focus. Stale,
    ambiguous, malformed, recovery-owned, rejected, or unknown truth adds no false
    projection, focus, retry, or second write.
  - **Evidence:** the production-extracted focused contract failed first because the
    seam was absent. It now passes original/existing/new Inbox destinations, exact
    object retention, active-ID collision, pending/stale/recovery refusal, one
    accepted write, zero pre-receipt projection/success/focus, unknown acknowledgement
    without retry, accepted continuation, en/zh-TW copy, and static row/busy/interlock/
    navigation wiring. Touched syntax, repository quality, and scoped whitespace
    checks pass. **Implemented: yes. Verified: partial (static and production-
    extracted deterministic evidence only). User-validated: no. Released: no.**
    Installed MV3 ordering, rendered route wrapping/counts, real Inbox allocation,
    Undo/reload, pointer/keyboard/focus and screen-reader behavior, representative-
    user comprehension, approval, and release remain open.

- **2026-08-09 — Receipt-gated single saved-page Archive**
  - **Acceptance criteria implemented:** individual tab Archive remains one click
    and reversible, but its Board card or Library row no longer disappears before
    browser-profile storage accepts the exact saved page. The originating Archive
    button, Library More control, or underlying Board card keeps the accepted
    content with the existing quiet persistence underline. No confirmation,
    spinner, pending toast, badge, copy, route, or schema field was added.
  - **Identity and effect boundary:** activation freezes and re-resolves the
    globally unique Workspace/Space/Group/Stack item reference, type, and complete
    value. One frozen timestamp, localized snapshot, compatible Archive entry, and
    `State.persistNow()` own the move. Acceptance alone renders active and Archive
    projections, shows established Undo success, and permits the Library/Board
    focus continuation. Stale truth writes nothing; rejected or unknown
    acknowledgement enters existing recovery without render, success, focus,
    retry, or second write. Archive and return-marker actions cannot race on their
    shared More control. Non-tab, batch, and Group Archive remain separate flows.
  - **Evidence:** the production-extracted focused contract failed first because
    the Archive controller was absent. It now passes exact nested identity, literal
    entry shape/time, pending/return-marker/stale/recovery refusal, one accepted
    write, zero pre-receipt feedback, reversible accepted success, unknown
    acknowledgement without retry, exact caller focus sequencing, and static busy/
    interlock/navigation wiring. Touched syntax, repository quality, and scoped
    whitespace checks pass. **Implemented: yes. Verified: partial (static and
    production-extracted deterministic evidence only). User-validated: no.
    Released: no.** Installed MV3 storage timing, rendered Board/Library/Archive
    pixels and counts, real Undo/restore/reload, pointer/keyboard/focus and screen-
    reader behavior, representative-user comprehension, approval, and release
    remain open.

- **2026-08-09 — Receipt-gated saved-tab return markers**
  - **Acceptance criteria implemented:** Favorite, Read Later add/remove, and
    read/unread remain one-click actions, but the star, queue membership, status,
    counts, and existing localized success message now change only after local
    persistence accepts the exact saved tab. The originating Library marker or
    Board card stays at its previously accepted state with one restrained busy
    pulse; no dialog, pending toast, badge, copy, or schema field was added.
  - **Identity and effect boundary:** activation freezes and re-resolves the
    globally unique Workspace/Space/Group/Stack item reference and full value.
    One localized snapshot and one `State.persistNow()` own the marker fields.
    Stale truth performs no write and restores the opener; rejected or unknown
    acknowledgement enters existing recovery without render, success, focus
    continuation, retry, or second write. Library and Board continuations await
    acceptance, while routes, navigation, and global shortcuts wait behind the
    exact pending owner.
  - **Evidence:** the production-extracted focused contract failed first because
    the controller was absent. It now passes both directions of all three marker
    actions, frozen timestamps, exact nested identity, stale/recovery/pending
    refusal, one accepted write, zero pre-receipt feedback, unknown acknowledgement
    without retry, exact opener/focus continuation, and static busy/interlock/
    navigation wiring. Touched syntax, repository quality, and scoped whitespace
    checks pass. **Implemented: yes. Verified: partial (static and production-
    extracted deterministic evidence only). User-validated: no. Released: no.**
    Installed MV3 storage timing, rendered pixels, real pointer/keyboard/focus and
    screen-reader behavior, representative-user comprehension, approval, and
    release remain open.

- **2026-08-09 — Receipt-gated inline Board Note editing**
  - **Acceptance criteria implemented:** the existing multiline rich-text editor,
    formatting toolbar, Link dialog, and slash commands remain the direct path for
    supporting saved-work context. Focus freezes the exact Note; a real blur keeps
    the draft visible with one quiet accent underline until local persistence
    accepts it. Changed HTML is sanitized and auto-linked. `/todo` and `/t` convert
    the Note, color commands retain their color-and-clear consequence, and `/clear`
    clears Note HTML and color. No dialog, confirmation, success toast, label, or
    schema field was added.
  - **Identity and effect boundary:** the controller reuses the exhaustive
    Workspace/Space/Group/Stack exact-item resolver. Conversion preserves the
    stable ID and compatible common/imported metadata instead of rebuilding a
    minimal record. A no-write command or sanitized equivalent restores accepted
    HTML. A real edit owns the exact editor/card and ancestor-sibling inert path,
    takes one localized snapshot, and awaits exactly one `State.persistNow()`.
    Acceptance alone releases, renders once, and restores stable-item focus. Stale
    truth retains and refocuses the draft; rejected or unknown acknowledgement
    enters existing recovery without render, focus, retry, or false success.
    Link-dialog blur ownership, formatting, import/search/display behavior,
    locales, permissions, host/network access, and Save/Reopen paths remain intact.
  - **Evidence:** the production-extracted test failed first because the Note
    receipt controller was absent. It now passes rich-text normalization and
    auto-linking, untouched/no-write display restoration, `/todo`, color, `/clear`,
    compatible metadata, duplicate pending, stale/recovery refusal, one accepted
    write/render/focus, unknown acknowledgement, zero retry, and static Link/focus/
    blur/busy/navigation wiring. Touched JavaScript syntax, repository quality, and
    scoped whitespace checks pass. **Implemented: yes. Verified: partial (static
    and production-extracted deterministic evidence only). User-validated: no.
    Released: no.**
    Installed MV3 blur/storage lifetime, rendered pixels, real formatting/Link and
    paste sanitization, IME, keyboard/focus and screen-reader behavior,
    representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Receipt-gated inline Board To-do editing**
  - **Acceptance criteria implemented:** the existing single-line editor remains
    the fastest way to correct a task. Focus freezes the exact To-do; blur or Enter
    submits the literal draft through one acknowledged controller. Normal text
    changes only `text`, `/done` preserves the task wording while marking it done,
    and color slash commands retain their established color-and-clear consequence.
    An unchanged value makes no write; an already-applied command also restores the
    real task display instead of leaving command text behind.
  - **Identity and effect boundary:** the controller reuses the exhaustive
    Workspace/Space/Group/Stack identity and full-value resolver. A real edit owns
    one synchronous pending token, keeps the draft visible, marks the exact editor
    and card busy, makes its sibling path inert, takes one localized snapshot, and
    awaits exactly one `State.persistNow()`. Acceptance alone releases, renders
    once, and focuses the rebuilt item. Stale truth writes nothing and returns
    focus to the retained draft; rejected or unknown acknowledgement enters the
    existing recovery path without render, focus, retry, or false success. Schema,
    IDs, migrations, import/search/display behavior, locales, permissions,
    host/network access, and Save/Reopen paths are unchanged.
  - **Evidence:** the focused production-extracted contract failed first because
    inline blur had no receipt controller. It now passes literal whitespace,
    `/done`, color, no-write command restoration, duplicate pending, stale and
    recovery refusal, one accepted write/render/focus, unknown acknowledgement,
    zero retry, and static focus/blur/busy/navigation wiring. Touched JavaScript
    syntax, repository quality, and scoped whitespace checks pass. **Implemented:
    yes. Verified: partial (static and production-extracted deterministic evidence only).
    User-validated: no. Released: no.** Installed MV3 blur/storage lifetime,
    rendered pixels, IME, real keyboard/focus and screen-reader behavior,
    representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Receipt-gated Board To-do completion**
  - **Acceptance criteria implemented:** the existing native To-do checkbox and
    context-menu action remain one-click completion paths, but checked/unchecked
    presentation now changes only after local persistence accepts the inversion.
    While pending, the current accepted state stays visible with one subtle busy
    pulse; no confirmation, detail detour, toast, or extra success animation was
    added.
  - **Identity and effect boundary:** activation freezes and re-resolves the exact
    Workspace, Space, Group, Stack ancestry, record/reference, type, and value.
    One localized next-consequence snapshot, one `done` inversion, and exactly one
    awaited `State.persistNow()` are allowed. The exact checkbox path stays visible
    while every sibling path, route/history application, programmatic navigation,
    global shortcut, and duplicate activation waits. Acceptance alone releases,
    renders once, and focuses the rebuilt checkbox. Stale/retyped/recovery-owned
    review writes nothing; rejected or unknown acknowledgement releases into
    existing recovery without render, focus, retry, or false success. Storage
    shape, IDs, migrations, inline slash/import/search semantics, permissions,
    host/network access, and Save/Reopen paths are unchanged.
  - **Evidence:** the production-extracted contract failed first because the exact
    receipt boundary did not exist. It now passes both completion directions,
    duplicate pending, stale/changed/retyped/recovery refusal, accepted render and
    exact focus, unknown-receipt failure, and zero retry, plus static busy/inert/
    navigation wiring. Touched syntax, quality, and scoped whitespace checks pass.
    **Implemented: yes. Verified: partial (static and production-extracted
    deterministic evidence only). User-validated: no. Released: no.** Installed
    MV3 storage ordering, rendered pulse, real keyboard/focus and screen-reader
    behavior, representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Receipt-gated Board item color**
  - **Acceptance criteria implemented:** the existing Note/To-do **Edit color**
    radiogroup remains the fast path, but its visible card change now means the
    local write was accepted. The same six choices, localization, keyboard model,
    theme treatment, null representation, and rebuilt-item focus remain.
  - **Identity and effect boundary:** opening freezes the exhaustive Workspace,
    Space, Group, Stack-ancestry, object-reference, type, and value context.
    Activation re-resolves it, takes one localized snapshot, changes only
    `item.color`, and awaits exactly one `State.persistNow()`. While pending, the
    picker stays busy and lower surfaces, routes, global shortcuts, and duplicate
    activation are blocked. Acceptance alone closes, renders once, and restores
    rebuilt-item focus. Stale or invalid review writes nothing; rejected or unknown
    acknowledgement closes into existing recovery without render, focus, retry, or
    false success. Schema, IDs, migration, import/search/slash-command semantics,
    permissions, host/network access, and Save/Reopen paths are unchanged.
  - **Evidence:** the production-extracted contract failed first because the
    frozen receipt controller did not exist. It now passes accepted, duplicate-
    pending, unchanged, clear-to-null, malformed, stale, Stack, recovery-owned,
    and unknown-receipt cases, plus static busy/interlock wiring. Touched syntax,
    quality, and scoped whitespace checks pass. **Implemented: yes. Verified:
    partial (static and production-extracted deterministic evidence only). User-
    validated: no. Released: no.** Installed MV3 storage ordering, rendered busy
    pixels, actual keyboard/focus and screen-reader behavior, representative-user
    comprehension, approval, and release remain open.

- **2026-08-09 — Prominent Search enters Find again**
  - **Acceptance criteria implemented:** the largest header Search control now
    opens the active Workspace's dedicated Find-again route and focuses its real
    query field. Its visible copy and accessible name use the established
    **Search saved work / 搜尋已儲存內容** language, and its truthful visible
    shortcut is `/`.
  - **Interaction boundary:** Search entry and exit use `{ persist: false }`;
    query, filters, selection, detail state, Back/Forward, reload, and exact
    result recovery remain owned by the existing URL-backed route. The header
    pill is hidden on that route so the routed query input is the sole visible
    Search owner. `Ctrl/⌘K` remains the command palette shortcut and every palette
    entry remains available. No schema, IDs, migration, permission, host/network,
    telemetry, or Save behavior changed.
  - **Evidence:** the focused contract failed first on persistent route entry and
    the former command-palette click binding. It now passes production-extracted
    route/focus entry and no-write exit plus static copy, accessible-name,
    shortcut, binding, palette-retention, and single-owner checks. Touched syntax,
    quality, and scoped whitespace checks pass. **Implemented: yes. Verified:
    partial (static and production-extracted deterministic evidence only). User-
    validated: no. Released: no.** Installed Chrome history/focus, responsive
    pixels, keyboard and screen-reader output, representative-user comprehension,
    approval, and release remain open.

- **2026-08-09 — Exact pre-Save destination review from the top bar**
  - **Acceptance criteria implemented:** opening global Save now shows the complete
    candidate title, source host, localized **Save to / 將儲存至** label, and exact
    Workspace › Space › Inbox destination before either consequence is chosen.
    The existing copy and save-and-close actions remain the only menu choices;
    each accessible name includes the page title and exact destination.
  - **Identity and effect boundary:** menu creation performs no write. Activation
    fresh-checks the frozen Workspace, Space, active selection, names, Inbox
    count/reference, tab ID, window, URL, pending URL, and protected active state
    before delegating once to the existing `saveTabToInbox()` controller and exact
    post-Save receipt. A missing or duplicate Inbox authority, changed candidate,
    or changed destination saves nothing and requires another review; no fallback
    destination or retry exists. Schema, stable IDs, migrations, import/export,
    permissions, host/network access, source effects, and other capture surfaces
    are unchanged.
  - **Evidence:** the production-extracted controller failed first because no
    review projection existed. It now passes literal title/host/path presentation,
    destination-specific accessible names, zero pre-action captures, one fresh tab
    read and copy delegation, and changed-destination refusal. Static menu geometry,
    touched syntax, quality, and whitespace checks pass. **Implemented: yes.
    Verified: partial (static and production-extracted deterministic evidence
    only). User-validated: no. Released: no.** Installed Chrome menu geometry,
    real tab/storage effects, timing, keyboard and screen-reader output,
    representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Exact post-Save receipt from the top bar**
  - **Acceptance criteria implemented:** both explicit top-bar Save choices now
    name the accepted page and exact localized Workspace › Space › Inbox
    destination, retain the existing source-close consequence and action-scoped
    Undo, and offer one **Show saved item / 查看已儲存項目** continuation. Save does
    not navigate automatically.
  - **Identity and effect boundary:** the richer receipt is opt-in and built only
    after `commitCapturedTabs()` accepts the existing write. Show fresh-resolves
    the frozen Workspace, Space, Group, ancestry, item object, value, and location,
    then opens that exact Group/item route with `persist: false`. Changed, moved,
    missing, ambiguous, or blocked targets open nothing and never retry the Save.
    Home Trail, Welcome, palette, rail, drag/drop, and bulk feedback remain
    unchanged; schema, IDs, migrations, permissions, host/network access, and
    source effects are untouched.
  - **Evidence:** the production-extracted case first failed because the receipt
    projection did not exist. It now passes one accepted capture, one render,
    exact English receipt, retained Undo, zero automatic routes, exact Show route,
    stale-target refusal, and zero retries. Static opt-in, native action, wrapping,
    touched syntax, quality, and whitespace checks pass. **Implemented: yes.
    Verified: partial (static and production-extracted deterministic evidence
    only). User-validated: no. Released: no.** Installed Chrome timing, real tab
    closure, pixels, keyboard and screen-reader output, representative-user
    comprehension, approval, and release remain open.

- **2026-08-09 — Context-first top bar with board-owned layout**
  - **Acceptance criteria implemented:** global chrome now presents the current
    Home, Library, Calendar, exact Group, or Space context at left, the existing
    local command/Search entry in the center, and the existing Save plus More
    actions at right. Built-in Inbox uses the canonical localized label;
    user-authored names remain unchanged and ellipsize with the full
    Workspace-to-context trail available as a native title.
  - **Surface ownership boundary:** the unchanged `view-mode-btn` now lives in a
    board-only subtoolbar immediately above the surface it changes. Its ID, icon,
    menu, layouts, focus, state, route, and persistence path are unchanged.
    Breadcrumbs, Home's in-content Save consequence, Search's dedicated header,
    secondary actions, schema, stable data IDs, migrations, import/export,
    permissions, host/network access, and telemetry remain intact. Context
    projection performs no write.
  - **Evidence:** the production-extracted case first failed because no current-
    context projector existed. It now passes Home, Search, Calendar, all Library
    modes, localized Inbox, user Group, active Space, Workspace, and fallback
    projections; exact DOM rendering; every-render wiring; static board-only
    layout placement; stable ID; and bounded title styling. Touched syntax and the
    repository quality gate pass. **Implemented: yes. Verified: partial (static
    and production-extracted deterministic evidence only). User-validated: no.
    Released: no.** Installed Chrome pixels, responsive geometry, menu placement,
    keyboard and screen-reader output, representative-user comprehension,
    approval, and release remain open.

- **2026-08-09 — One task-ordered primary navigation rail**
  - **Acceptance criteria implemented:** the sidebar now exposes one localized
    navigation landmark in the same visual, DOM, and keyboard sequence:
    **Home, Inbox, All Links, Spaces, More**. The flexible Spaces list occupies
    the middle of the rail and More remains the final escape hatch.
  - **Simplification boundary:** Search, Favorites, Read Later, Archive, Trash,
    Calendar, Tools, and Settings remain reachable from More. The hidden sidebar
    storage/privacy projections and their update target were removed; Settings
    retains both the privacy explanation and live storage meter. Exact Inbox,
    nonzero counts, Space creation, current selection, collapse behavior, menu
    behavior, routes, state, stable active-control IDs, schema, migrations,
    import/export, permissions, host/network access, and telemetry are unchanged.
  - **Evidence:** the focused static contract first failed because CSS painted
    Inbox second while DOM/keyboard order still reached All Links first, and the
    Spaces group sat outside the navigation landmark. It now passes exact rail
    order, one landmark, secondary-menu reachability, Settings preservation, and
    removal of sidebar-only projections. Touched syntax and the repository quality
    gate pass. **Implemented: yes. Verified: partial (static and deterministic
    contract evidence only). User-validated: no. Released: no.** Installed Chrome
    pixels, keyboard traversal, menu placement, screen-reader output,
    representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Exact safe Reopen from command-palette saved pages**
  - **Acceptance criteria implemented:** **Recently saved / 最近儲存** and
    query-matched saved-page commands now freeze the exact Workspace, Space,
    Group, Stack ancestry, item, value, and location represented by their row.
    Their secondary line says **Open / 開啟**, names the host, and shows the
    complete localized destination trail before activation. Unsupported saved
    addresses remain available through full Search Details but are not advertised
    as launcher results.
  - **Activation and recovery boundary:** activation rechecks the active Workspace,
    global item uniqueness, references, ancestry, fingerprints, and URL safety,
    then delegates one focused effect to the shared Reopen coordinator. It no
    longer persists an active-Space change, renders item Details, or uses first-
    match IDs. An immediate stale, moved, replaced, ambiguous, or unsafe refusal
    keeps the palette and exact query, rebuilds current local commands, restores
    query focus, opens nothing, and reuses existing localized recovery feedback.
    Accepted activation closes the palette; later browser-effect outcomes remain
    owned by the shared coordinator.
  - **Compatibility boundary:** Search and saved-location Details remain intact.
    Palette dialog geometry, row/badge/icon styling, keyboard order, themes,
    motion, routes, stable IDs, schema, migrations, import/export, permissions,
    host/network access, and telemetry are unchanged.
  - **Evidence:** the production-extracted case first failed on the legacy raw-row
    Space-switch/Details path. It now passes frozen context, complete destination,
    one foreground shared-Reopen delegation, active-Workspace/target refusal,
    URL filtering, zero navigation/write residue, keep-open refresh/query/focus,
    accepted close, and English/native zh-TW copy. The shared Reopen contract,
    touched syntax, and repository quality gate pass. **Implemented: yes. Verified:
    partial (static and production-extracted deterministic evidence only). User-
    validated: no. Released: no.** Installed Chrome reuse/create effects, real
    palette pixels/focus, screen-reader output, representative-user comprehension,
    approval, and release remain open.

- **2026-08-09 — One exact Inbox destination across the primary shell**
  - **Acceptance criteria implemented:** the sidebar and command palette now share
    Landing's exact active Workspace/Space/Inbox context and global Group-ID
    resolver. Sidebar activation freezes current truth at click time; the palette
    retains the context represented by its visible command set. The sidebar count
    appears only for that exact actionable Inbox and only when nonzero.
  - **Effect boundary:** accepted navigation uses one exact Group route with
    `persist: false`. Missing, duplicate, replaced, moved, malformed, globally
    ambiguous, or refused destinations show localized no-effect feedback and open
    nothing. Navigation no longer allocates an ID, inserts an Inbox, snapshots,
    persists, retries, repairs, or delegates to first-match `openGroupPage()`.
    Real capture and explicit content creation retain their reviewed provisioning
    behavior.
  - **Compatibility boundary:** Welcome still reaches Inbox after its accepted
    capture through the same sidebar control. Search, Home, route shapes, stable
    DOM IDs, schema, migrations, import/export, permissions, host/network access,
    and telemetry are unchanged. Existing styles and geometry required no change.
  - **Evidence:** the production-extracted shell case first failed on the legacy
    undefined/first-match path. It now passes one exact non-persisted route, zero
    writes/creates/legacy routes, missing/duplicate refusal, same-ID replacement,
    global-ID ambiguity, sidebar/palette context timing, exact count authority,
    and English/native zh-TW feedback; touched syntax and the repository quality
    gate pass. **Implemented: yes. Verified: partial (static and production-
    extracted deterministic evidence only). User-validated: no. Released: no.**
    Installed routing/storage events, pixels, screen-reader output, theme/viewport
    comparison, representative-user comprehension, approval, and release remain
    open.

- **2026-08-09 — Exact existing-Inbox shortcut on Landing**
  - **Acceptance criteria implemented:** Landing now names its shortcut with the
    canonical **Inbox / 收件匣** label, keeps an empty existing Inbox reachable
    without a zero badge, and shows a count only when nonzero. The shortcut is
    available only for exactly one active-Space Inbox.
  - **Identity and effect boundary:** render freezes the active Workspace, Space,
    and Inbox references and IDs. Activation rechecks the same active context and
    global Group-ID uniqueness before non-persisted routing, then closes Landing
    only after the route is accepted. Missing, duplicate, replaced, moved, malformed, or refused
    targets repaint current truth, retain focus in Landing, and perform no route,
    create, snapshot, retry, repair, or state write.
  - **Compatibility boundary:** Search, Home, routes, scene, geometry, stable DOM
    IDs, schema, migrations, import/export, permissions, host/network access, and
    telemetry are unchanged. One native English/zh-TW recovery message was added.
  - **Evidence:** the production-extracted public case first failed because no
    exact Landing Inbox controller existed. It now passes non-persisted exact route-before-close,
    missing/duplicate refusal, same-ID replacement, global-ID ambiguity, localized
    presentation, nonzero-only count wiring, and zero-write checks; touched syntax
    and the repository quality gate pass. **Implemented: yes. Verified: partial
    (static and production-extracted deterministic evidence only). User-validated:
    no. Released: no.** Installed routing, pixels, screen-reader output,
    theme/viewport comparison, representative-user comprehension, approval, and
    release remain open.

- **2026-08-09 — Complete destination trails in Landing results**
  - **Acceptance criteria implemented:** every saved-page suggestion now projects
    its complete `Workspace › Space › localized Group › Stack…` location. The
    built-in Inbox uses the existing native locale label at presentation time.
    The full escaped trail owns both visible text and the native hover title, while
    a constrained 11 px utility treatment prevents long user names from crushing
    the page title and URL.
  - **Compatibility boundary:** matching, relevance, six-result limit,
    keyboard/IME semantics, exact recovery, Search routing, scene, palette,
    geometry, motion, and browser effects are unchanged. No new copy, color, card,
    state write, schema, persistent ID, migration, import/export change,
    permission, host access, network request, or telemetry was added.
  - **Evidence:** the production-extracted projection case first failed because no
    complete Landing destination formatter existed. It now passes the literal
    nested path in English and native zh-TW, escaped renderer wiring, and static
    overflow/legibility styling; the repository quality gate passes.
    **Implemented: yes. Verified: partial (static and production-extracted
    projection evidence only). User-validated: no. Released: no.** Installed
    pixels, real overflow/tooltips, native screen-reader output, theme/viewport
    comparison, representative-user comprehension, approval, and release remain
    open.

- **2026-08-09 — Relevance-first Landing suggestions**
  - **Acceptance criteria implemented:** the six saved-page suggestions now reuse
    Find again's established relevance score instead of sorting every match only
    by save time. Scores are calculated once per matching row; equal scores resolve
    by newest save, stable item ID, then traversal order. Ordinary text puts a
    likely exact-title intent first while operator-only queries retain recent-first
    usefulness.
  - **Compatibility boundary:** active-Workspace scope, saved-tab-only matching,
    six-result cap, query operators, result markup, keyboard/IME behavior, exact
    recovery, full Search, copy, CSS, routes, and browser effects are unchanged.
    No state write, schema, migration, import/export change, permission, host
    access, network request, or telemetry was added.
  - **Evidence:** the production-extracted seven-page case first placed the newest
    address-only result first and excluded the older exact-title page. It now
    passes exact-title-first ranking, visible-window retention, the six-row cap,
    and newest-first operator ordering; the repository quality gate passes.
    **Implemented: yes. Verified: partial (deterministic production-extracted
    ranking evidence only). User-validated: no. Released: no.** Installed
    rendering, perceived relevance across representative data, assistive behavior,
    representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Truthful Landing keyboard suggestions**
  - **Acceptance criteria implemented:** the saved-work launch field now exposes a
    localized combobox/listbox contract. Painted results have DOM-local option IDs;
    Arrow selection keeps the visible highlight, `aria-selected`, and
    `aria-activedescendant` together. Changing the query synchronously hides and
    deselects the old popup before its 70 ms repaint, so Enter during that interval
    continues to local Search instead of opening a result from the previous query.
    IME confirmation performs no action; Escape and Landing close clear the same
    state.
  - **Compatibility boundary:** the illustrated scene, Lora greeting, palette,
    geometry, result content, matching, exact recovery, confirmed close, English
    and native zh-TW copy, routes, and browser effects are unchanged. No state
    write, schema, persistent ID, migration, import/export change, permission,
    host access, network request, telemetry, or new copy was added.
  - **Evidence:** the production-extracted mounted-input case first failed because
    no shared combobox seam existed. It now passes immediate stale-selection
    revocation, local Search submission during debounce, settled exact-option
    activation, IME no-op, Escape cleanup, accessible state synchronization, and
    source binding; the repository quality gate passes. **Implemented: yes.
    Verified: partial (static and production-extracted deterministic DOM evidence
    only). User-validated: no. Released: no.** Installed Chrome timing, native
    screen-reader output, real IME behavior, rendered pixels, representative-user
    comprehension, approval, and release remain open.

- **2026-08-09 — Exact visible-result recovery from Landing**
  - **Acceptance criteria implemented:** each painted saved-page suggestion now
    carries an exact recovery context. Activation requires the same active
    Workspace, Space, Group, stack ancestry, item object, and saved value before
    delegating to the existing saved-page Reopen coordinator. A changed or moved
    result keeps Landing and its query available, restores suggestion focus, and
    opens nothing.
  - **Compatibility boundary:** the existing localized changed-or-moved message,
    scene, result geometry, keyboard behavior, and confirmed-close behavior are
    reused. No state repair, retry, write, route, schema, ID, migration,
    import/export, permission, host access, or network request was added.
  - **Evidence:** the production-extracted case first failed because Landing had
    no exact visible-result seam. It now moves the same saved item after context
    capture and passes one recovery message, focus return, preserved layer and
    graph, and zero browser effects; the shared Reopen contract and repository
    quality gate pass. **Implemented: yes. Verified: partial (static and
    production-extracted deterministic evidence only). User-validated: no.
    Released: no.** Installed event timing, rendered pixels, assistive-technology
    output, representative-user comprehension, approval, and release remain open.

- **2026-08-09 — Local Find-again handoff from the launch field**
  - **Acceptance criteria implemented:** submitting the established-user launch
    field without choosing a suggestion now dismisses the layer and carries the
    trimmed query into the existing active-Workspace Search route. A selected
    suggestion retains its exact guarded Open behavior.
  - **Focus and privacy boundary:** English and native zh-TW now name saved-content
    search; the empty suggestion state explains the Enter continuation. The old
    `chrome.search` fallback and manifest `search` permission are removed. No
    replacement request, saved-state write, route family, schema, ID, migration,
    import/export, host permission, or destination-opening behavior was added.
  - **Evidence:** the production-extracted form case first failed because submit
    produced no local Search route. It now passes exact query routing, immediate
    layer reset, Search focus, zero web-search calls, locale copy, and manifest
    permission absence. **Implemented: yes. Verified: partial (static and
    production-extracted deterministic evidence only). User-validated: no.
    Released: no.** Installed routing/history, pixels, screen-reader output,
    representative-user comprehension, Store permission display, and release
    remain open.

- **2026-08-09 — One state-aware accent across Home's Trail**
  - **Acceptance criteria implemented:** when a saved-item recovery action exists,
    it owns the Trail's only accent and both close/keep-open Save choices remain
    secondary. On an empty Home, the remembered Save consequence is primary and
    its explicit inverse remains secondary.
  - **Compatibility boundary:** `homeTrailCaptureActionPlan()` changes button
    classes only. Copy, DOM order, preference meaning, reviewed destination,
    receipt-gated persistence, source-close behavior, Undo, focus, routes, state,
    schemas, permissions, host/network access, and locale behavior are unchanged.
  - **Evidence:** the focused public contract failed first because the renderer had
    no state-aware capture plan. It now passes recovery-present and empty-Home
    plans plus production wiring. **Implemented: yes. Verified: partial (static
    and production-extracted deterministic evidence only). User-validated: no.
    Released: no.** Installed pixels, browser capture, screen-reader output,
    representative-user comprehension, and release remain open.

- **2026-08-09 — Primary Reopen action at the end of Home's Trail**
  - **Acceptance criteria implemented:** an eligible saved page now renders
    **Open page** first as the only accent/primary action and **View details**
    second as a quiet secondary action. A note, to-do, Stack, unsupported page,
    or malformed-ID fallback keeps Details as its sole primary continuation.
  - **One component authority:** `homeTrailRecoveryActionPlan()` owns DOM order and
    button hierarchy. The existing exact Open controller and route-backed Details
    controller are unchanged. Keyboard-origin Home Save success now returns focus
    to the newly rendered Open control. Existing mobile stacking, focus-visible,
    forced-colors, reduced-motion, themes, and locales require no new CSS or copy.
  - **Evidence:** the public component seam first failed because Home still built
    Details first and styled both actions secondary. The focused production-
    extracted contract now passes page/fallback/malformed plans, production wiring,
    and post-Save focus. **Implemented: yes. Verified: partial (static and
    production-extracted deterministic evidence only). User-validated: no.
    Released: no.** Installed pixels and browser activation, screen-reader output,
    representative-user comprehension, and release remain open.

- **2026-08-09 — Reopen-first Home return card**
  - **Owner decision implemented:** Locus's primary return promise is **Resume
    saved work**. The leading active-Workspace Trail now prefers the newest saved
    page eligible for the guarded Reopen path instead of allowing a newer note,
    to-do, Stack, or unsupported page to displace it.
  - **Lossless and safety boundary:** eligible pages require a non-empty stable ID
    and the shared saved-address allowlist. Within each tier, existing `createdAt`
    and deterministic legacy ordering remain intact. With no eligible page, Home
    retains its original newest-item fallback. Exact activation still re-resolves
    current Workspace/Space/Group/Stack/item identity and fails closed; selection
    writes no state and changes no route, schema, migration, permission, host,
    network, or import/export behavior.
  - **Visible language:** the truthful heading is **Continue saved work /
    繼續查看已儲存內容** rather than the now-inaccurate **Latest saved item**.
  - **Evidence:** two public red cases first selected the unsafe newer page and
    exposed the stale heading; the focused production-extracted Home contract now
    passes page priority, mixed-item fallback, production wiring, and en/zh-TW
    copy. **Implemented: yes. Verified: partial (static and production-extracted
    deterministic evidence only). User-validated: no. Released: no.** Installed
    rendering and browser activation, assistive-technology output,
    representative-user comprehension, and release remain open.

- **2026-08-09 — Focused launch navigation for the initial Store purpose**
  - **Owner decision implemented:** the initial Store candidate centers on Save ->
    See destination -> Find again -> Reopen safely. Calendar, generic Tools, and
    alternate layouts remain preserved and reachable through More or Advanced
    views, but do not compete with that core task.
  - **Launch-surface change:** the established-user landing layer no longer renders
    or focuses its Tools and Reminders shortcuts. Search, Home, and Inbox retain
    the direct launch paths; no route, handler, stored data, schema, ID, locale,
    permission, or import/export shape changed.
  - **Evidence:** the focused public navigation contract failed before the markup
    change and now passes while also proving Calendar and Tools remain in More.
    **Implemented: yes. Verified: partial (static production markup plus focused
    deterministic contract). User-validated: no. Released: no.** Installed
    rendering, assistive-technology output, representative-user comprehension,
    and Store review remain open.

- **2026-08-09 — Accepted quick-capture receipts stay truthful on malformed graphs**
  - **Acceptance criteria implemented:** after the centralized writer accepts a
    quick-capture candidate, destination projection can no longer reclassify that
    write as failed. The listener retains top-level `{ok:true, revision}` and
    returns a strict unavailable continuation when exact destination authority
    cannot be proven.
  - **Fail-closed and compatibility boundary:** present non-array Workspace,
    Space, Group, or nested item collections are not skipped; malformed owner
    fields cannot become a ready destination. Missing/null legacy collections
    remain empty, large valid nested arrays use iterative traversal, and no stored
    graph is repaired, normalized, retried, migrated, or rolled back. The existing
    saved-but-unconfirmed popup result keeps the source open without new UI or copy.
  - **Evidence:** registered production-listener cases cover all four collection
    levels, a malformed Space ID, and a valid 200,000-entry Stack. They prove one
    accepted write, the accepted graph/revision retained, strict receipt shapes,
    and zero browser effects. The initial independent severity review's P0/P1
    findings were reproduced and fixed; its test-location concern is satisfied by
    the durable listener cases in `scripts/background-contract-test.js`.
    **Implemented: yes. Verified: partial (static and production-extracted
    deterministic mocked-browser evidence only). User-validated: no. Released:
    no.** All 36 repository JavaScript syntax checks and all 27 deterministic
    commands passed during the slice, including the default 10,000-schedule
    concurrency gate; installed MV3 message/storage timing, service-worker
    termination, rendered/accessibility behavior, representative-user usefulness,
    approval, and release remain open.

- **2026-08-04 — Fresh drag-source authority before new-tab cleanup**
  - **Acceptance criteria implemented:** single- and multi-tab drag payloads retain
    immutable tab/window/URL/original-active identity, and all five drop targets
    request a fresh source read before a cleanup-enabled write. The current-window
    source must still be exact and inactive; active, moved, navigated, missing, or
    malformed sources are protected. A separate post-receipt read remains required
    before removal, while unchanged multi-drag siblings remain independent.
  - **Concurrent-edit boundary:** any state mutation during the asynchronous
    pre-read protects the entire cleanup set on both write success and failure. A
    successful combined graph may remain authoritative without closing a source
    whose saved copy was removed or moved; a failed write preserves the later edit
    behind explicit recovery. Only confirmed closures reach action-scoped Undo
    with URL/pinned metadata.
  - **Convenience and compatibility boundary:** Save remains copy-first and keeps
    the existing partial/stayed-open feedback. Keep-open and non-drag captures keep
    their prior timing. No surface, copy, locale, schema, migration, stored ID,
    import/export shape, permission, host access, network, telemetry, or privacy
    behavior changed.
  - **Evidence:** separate red/green cases reproduce stale cached activity with
    activation before the deferred pre-read settles, a moved-window source beside
    an unchanged sibling, a successful combined write after a later edit removed
    the optimistic saved copy, and a failed write after a later edit. Production-
    extracted results protect the affected/all sources, preserve accepted graph
    authority, and require explicit recovery without losing the later edit.
    **Implemented: yes. Verified: partial (static and production-extracted
    deterministic mocked-browser evidence only). User-validated: no. Released:
    no.** Final independent max-effort review found no P0/P1. All 36 repository
    JavaScript syntax checks and all 27 deterministic commands pass, including the
    default 10,000-schedule concurrency gate; `git diff --check` and the untracked
    current-slice whitespace scan are clean. The managed Chrome runtime was
    unavailable, so native drag, real tab effects/event ordering, rendered and
    accessibility behavior, representative-user usefulness, and release remain
    open.

- **2026-08-04 — Exact receipt authority before background cleanup**
  - **Acceptance criteria implemented:** item and whole-window finishers now require
    a successfully created receipt with `actionable === true` before beginning any
    fresh cleanup-authority read, source inspection, tab removal, or final outcome
    update. A valid imported-style 170-character Unicode Workspace ID that exceeds
    the encoded notification-ID limit still persists normally and receives one
    generic Home receipt, but every source remains open and the receipt retains its
    conservative unconfirmed outcome.
  - **Convenience, truth, and compatibility boundary:** an exact receipt keeps the
    existing guarded close and in-place result update; generic Home remains a safe
    local continuation, not destructive authority. No locator storage, ID
    shortening, hash, migration, UI, copy, locale, schema, import/export shape,
    permission, host access, network, telemetry, or privacy behavior changed.
  - **Evidence:** separate public context-menu red tracers observed a generic page
    receipt change to "Page saved" after source removal and a generic window
    receipt claim "Closed 2 other tabs" after two removals. The focused production-
    extracted suite now passes eight capture-authority guards; both fallbacks
    persist once with zero post-receipt authority read, `tabs.get()`, removal, or
    receipt update. **Implemented: yes. Verified: partial (production-extracted
    deterministic mocked-browser evidence only). User-validated: no. Released:
    no.** Independent max-effort review found no actionable P0/P1. All 36
    repository JavaScript syntax checks and all 27 deterministic commands pass,
    including the default 10,000-schedule concurrency gate; `git diff --check` and
    the untracked current-slice whitespace scan are clean. Installed notification
    limits, native rendering/accessibility, storage/tab/service-worker timing,
    representative-user usefulness, and release remain open.

- **2026-08-03 — Post-receipt background capture authority**
  - **Acceptance criteria implemented:** after native receipt creation settles,
    single-page and whole-window cleanup re-enter the service worker's sole state
    FIFO and optional Web Lock, fresh-read authoritative `te`, and keep that
    transaction through source inspection/removal. A single source requires one
    unique exact accepted Workspace / Space / Group / direct item owner and saved
    URL at a current revision. Session cleanup additionally carries a transient
    source-to-saved-item identity and closes only sources whose unique direct item
    remains in the original exact Session Group; removed siblings stay open and
    use the existing partial outcome.
  - **Convenience, truth, and compatibility boundary:** a harmless newer edit does
    not revoke safe cleanup, while moved, missing, duplicated, nested, retyped,
    URL-changed, older, malformed, or unreadable authority stops before the
    affected browser source is inspected. Read/lock/effect uncertainty is
    conservative and cannot escape as a false not-saved warning, retry, repair, or
    rollback over newer state. No copy, UI, locale, schema, migration, durable
    token/outbox, import/export shape, permission, host access, network, telemetry,
    or privacy behavior changed. Generic Home receipt authority remains the next
    separate slice.
  - **Evidence:** a public red tracer paused callback-only receipt creation, moved
    the accepted item with a real newer `locus-state-write`, and observed stale
    removal of tab `99`; a whole-window replay observed the same gap for tab `2`.
    The focused production-extracted suite now passes six authority guards:
    displaced item, unrelated newer write, FIFO ownership through removal,
    state-read failure, displaced Session Group, and per-source partial Session
    cleanup. **Implemented: yes. Verified:
    partial (static and production-extracted deterministic mocked-browser evidence
    only). User-validated: no. Released: no.** All 36 repository JavaScript syntax
    checks and all 27 deterministic commands pass, including the default 10,000-
    schedule concurrency gate; `git diff --check` and the untracked current-slice
    whitespace scan are clean. Max-effort substitute review found no P0; its
    malformed pending/inactive-source P1 now has red-to-green single/window
    guards, while generic receipt actionability remains queued. Installed
    storage/notification/tab/Web-Lock timing, service-worker
    teardown, native receipt rendering/accessibility, representative-user
    usefulness, and release remain open.

- **2026-08-03 — Reopen-aligned new-tab Save eligibility**
  - **Acceptance criteria implemented:** every new-tab browser-page capture path
    now applies `isOpenableSavedTabUrl()` before history or saved-graph mutation.
    Welcome, Home Trail, direct and selected Inbox/Group Save, active Group add,
    Save all, palette Save, Space drop, Group insertion, and Board/List Stack drops
    accept exactly `http:`, `https:`, `ftp:`, and `file:`. Unsupported sources never
    reach persistence or close-after-save.
  - **Convenience and UI boundary:** the opened-tabs rail keeps every non-internal
    tab available for switching, selection, clearing, and explicit Close. Rows that
    cannot be reopened expose neither Save nor drag. Mixed selections count and
    save only recoverable pages, retain unsupported rows, repaint the rail, and
    restore focus to the retained selection or rail filter. No new surface, badge,
    color, type treatment, animation, copy, setting, schema, migration, permission,
    host access, network, telemetry, or privacy behavior was added.
  - **Evidence:** red production-extracted tracers reproduced unsafe direct,
    Welcome, whole-window, selected, palette, active-Group, single-drop, Space-drop,
    and multi-drop capture, plus overbroad selection clearing and lost focus. The
    onboarding/Home contract now covers the converged policy, all four supported
    protocols, rail structure, mixed selection, and focus; the Reopen contract
    remains green. All 36 repository JavaScript syntax checks and all 27
    deterministic commands pass, including the default 10,000-schedule concurrency
    gate; `git diff --check` is clean. **Implemented: yes. Verified: partial
    (static and production-extracted deterministic mocked-browser evidence only).
    User-validated: no. Released: no.** Installed MV3 drag/close/reopen, rendered
    and assistive-technology behavior, representative-user usefulness, approval,
    and release remain open.

- **2026-08-03 — Final-confirmed native receipt continuation**
  - **Acceptance criteria implemented:** the shared actionable-notification fallback
    now creates one expected local route, requires a non-negative integer returned
    tab ID, fresh-reads that exact tab once, and clears the notification only when
    the final tab retains that ID, has a non-negative integer window ID, is active,
    and matches the exact committed or pending destination. Any non-empty pending
    URL is authoritative; whitespace-only and non-string pending values fail closed.
  - **Convenience, truth, and compatibility boundary:** create/read failure,
    malformed or negative identity, inactive state, wrong route, or conflicting
    navigation leaves the receipt available and performs no retry or fallback
    create. Popup Locate retains its exact-route reuse and now uses the same
    confirmed boundary for safe fallback. No visual surface, copy, schema,
    migration, local data, stable ID, import/export shape, permission, host
    permission, network, telemetry, privacy behavior, or preference changed.
  - **Evidence:** a new red case first observed a capture receipt clear after an
    injected final-read failure; a hardening red case observed a negative created
    ID being read and cleared. The final matrix passes nine continuation guards,
    and the popup Locate contract remains green. All 36 repository JavaScript
    syntax checks and all 27 deterministic commands pass, including the default
    10,000-schedule concurrency gate; `git diff --check` is clean. **Implemented:
    yes. Verified: partial (production-extracted deterministic mocked-browser
    evidence only). User-validated: no. Released: no.** Installed notification
    clearing/display, service-worker lifetime, real tab presentation,
    accessibility, representative-user usefulness, and release remain open.

- **2026-08-03 — Final-confirmed saved-page Reopen handoff**
  - **Acceptance criteria implemented:** creation now requires an integer returned
    tab/window identity and a fresh read of that exact tab before reporting
    `created-live` or `created-suspended`. The final tab must preserve the returned
    window, requested active/inactive disposition, and exact live or Locus-
    suspended destination. Foreground reuse now fresh-reads the same tab after
    activation and window focus, then requires the same tab ID, window ID, active
    state, and exact destination before reporting `reused-live` or
    `reused-suspended`. Exact pending navigation remains eligible; a conflicting
    pending URL overrides a matching committed URL and fails closed.
  - **Convenience, truth, and compatibility boundary:** wrong destinations, final-
    read rejection, malformed or changed identity, and wrong active state use the
    existing generic unconfirmed recovery instead of quiet success. Locus never
    retries an uncertain create, never falls through from uncertain reuse to
    create, and keeps queued/bulk unknown-effect stopping. The final receipt
    confirms the browser effect authorized by the last pre-effect saved-item
    check; harmless post-effect save metadata/location changes do not create false
    warnings. No visual surface, copy, schema, migration, local data, stable ID,
    import/export shape, permission, host permission, network, telemetry, or
    preference changed.
  - **Evidence:** the unchanged suite first passed. A new red tracer then observed
    `created-live` for an inactive tab at `https://wrong.example/`; a second
    observed `reused-live` after the activated tab navigated away during window
    focus. The production-extracted matrix now passes exact committed/pending
    success, conflicting pending navigation, wrong URL/window/active disposition,
    final-read rejection, no retry, and all existing individual/bulk/lock/focus
    paths. All 36 repository JavaScript syntax checks and all 27 deterministic
    commands pass, including the default 10,000-schedule concurrency gate.
    `git diff --check` and the untracked-file trailing-whitespace scan are clean.
    **Implemented: yes. Verified: partial (static and production-extracted
    mocked-browser evidence only). User-validated: no. Released: no.** Installed
    Chrome tab/window/Web Lock timing, rendered/accessibility behavior,
    representative-user usefulness, and release remain open.

- **2026-08-03 — Recovery-first popup Locate handoff**
  - **Acceptance criteria implemented:** the popup now waits for one valid accepted
    save receipt before dispatching a separate `locus-complete-popup-locate`
    request. Rejected or acknowledgement-unknown state dispatches no route/close
    effect. The separate request enters the central FIFO/Web Lock and fresh-resolves the exact current saved
    item, creates its encoded Home route inactive, and validates the source before
    activation. It then activates and focuses the exact route, confirms that route,
    revalidates the source as exact and inactive, confirms the route's committed
    current URL once more, and only then may remove the source. Returned tab ID,
    window, original/post active
    state, current URL, pending URL, target URL, route URL, and route identity all
    fail closed.
  - **Convenience, UI, and compatibility boundary:** activation or focus failure
    now preserves the original page instead of removing the user's remaining
    recovery surface. Changed or unreadable source/route tabs remain open; an
    unsafe route is not offered as an exact-tab retry. The existing compact popup
    result and localized notice truthfully retain accepted-save/close-partial
    behavior. A lost, timed-out, or malformed effect receipt keeps the save accepted
    and claims neither opening nor requested close. Popup and notification retry
    clicks fresh-check the exact retained tab/window/route/pending URL and create a
    fresh exact local route when that tab changed, became inactive after focus, or
    disappeared. Legacy notices without exact route authority use generic Locus and
    never reuse their tab ID. No screen, new
    copy, styling, schema, migration, stored field, permission,
    host permission, network, telemetry, or preference was added.
  - **Evidence:** red production-extracted tracers observed close-before-activation,
    stale-URL removal, removal without an explicit inactive source observation,
    close after route replacement, a changed tab trusted after activation error,
    a missing post-write queue handoff, an accepted-but-unknown state receipt that
    could later run Locate effects, and delayed retries trusting a retained tab ID. The
    focused matrix now passes returned-ID/window/active/current/pending source
    changes, empty pending URL, route replacement/read failure, separate state/effect
    dispatch, typed effect-unknown handling, exact activation-error and delayed-click
    retry validation, pending-only recovery, activation/focus/remove
    failures, close-off, and exact success ordering. All 36 repository
    JavaScript syntax checks and all 27 deterministic commands pass, including the
    default 10,000-schedule concurrency gate; `git diff --check` is clean.
    **Implemented: yes. Verified: partial (production-extracted deterministic and
    mocked-browser evidence only). User-validated: no. Released: no.** Installed
    popup/message/service-worker lifetime, real tab effects, rendered/accessibility
    behavior, representative-user usefulness, and release remain open.

- **2026-08-02 — Callback-confirmed reminder delivery before state advancement**
  - **Acceptance criteria implemented:** item and Group/Space alarm delivery now
    await the existing settle-once native notification receipt before changing
    `at` or `notified`. While callback-only Chrome is pending, Locus performs no
    reminder mutation, central state write, or alarm reconciliation. Native-create
    failure leaves the exact authoritative graph unchanged. Success permits one
    notification, one revisioned write, then complete alarm reconciliation; a
    one-shot becomes notified and a recurring Group reminder advances and re-arms
    by its stable ID.
  - **Convenience and scope boundary:** the user can trust that a reminder is not
    silently consumed before Chrome confirms its notification. The existing native
    surface remains the whole interaction; no panel, toast, retry loop, durable
    outbox, schema, migration, storage shape, permission, host permission, network,
    telemetry, or UI preference was added. Existing Promise and hybrid Chrome
    compatibility continues through the shared wrapper.
  - **Evidence:** the public callback-only alarm tracer first failed with revision
    3 and `notified: true` after injected native-create failure. The production-
    loaded background suite now passes withheld-callback, error, and success item
    paths plus recurring Group callback success. It proves one native attempt,
    zero pre-callback writes/reconciliation, unchanged authority on error, and
    `storage-set` before `alarms-get-all` on success. All 36 repository JavaScript
    syntax checks and all 27 deterministic commands pass, including the default
    10,000-schedule concurrency gate; `git diff --check` is clean. **Implemented:
    yes. Verified: partial (production-
    extracted deterministic evidence only). User-validated: no. Released: no.**
    Installed notification/service-worker lifecycle evidence remains open.

- **2026-08-02 — Truthful duplicate-free Group/selection Reopen**
  - **Acceptance criteria implemented:** Board, focused-Group, List, context-menu,
    and selection bulk actions now freeze exact saved-item contexts before any
    effect and settle them sequentially through the shared background Reopen
    boundary. Exact live or Locus-suspended destinations are reused; only an absent
    destination creates one inactive live tab or Hibernate placeholder. Distinct
    same-URL saves retain separate identity authority. Duplicate/stale Group IDs,
    unsafe or changed items, and ineligible selections fail closed.
  - **Truth, convenience, and UI boundary:** one failed profile read or first
    unknown effect stops all later attempts. Results distinguish new tabs,
    already-open, not-opened, browser-check-failed, unconfirmed, and not-checked
    counts. The initiating control stays focusable, visibly busy, and
    `aria-disabled`; competing actions explain the active batch. Confirmed results
    are compact, while required recovery stays inline until dismissed. English and
    native Taiwan zh-TW use complete factual labels, danger feedback uses a warning
    mark, and a no-tab selection disables Open with a reason. No schema, migration,
    storage, permission, host permission, network, telemetry, panel, modal, or
    persistent preference was added.
  - **Evidence:** the first production tracer failed because no bulk coordinator
    existed. Review-driven tracers then failed for duplicate Group IDs, distinct
    same-URL item receipts, repeated profile-read failures, silent competing
    activation, focus-stranding disablement, and expiring recovery guidance. The
    expanded production-extracted saved-page contract now passes with all 36
    repository JavaScript syntax checks and all 27 deterministic commands,
    including the default 10,000-schedule concurrency gate; `git diff --check` is
    clean. **Implemented: yes.
    Verified: partial (static and production-
    extracted deterministic evidence only). User-validated: no. Released: no.**
    Installed tab/window/Web Lock effects, rendered focus/progress/recovery,
    screen-reader output, representative-user usefulness, and release remain open.

- **2026-08-02 — Notification-first background recovery receipt**
  - **Acceptance criteria implemented:** after one accepted contextual or shortcut
    capture write, Locus now confirms one stable actionable native receipt before
    inspecting or removing any source. Its conservative first state says closure
    is unconfirmed; only successful creation permits the existing guarded close,
    whose closed, stayed-open, unconfirmed, or partial result updates that exact
    receipt ID. Receipt creation failure retains the accepted save and keeps every
    item/window source open. Update failure leaves the truthful clickable first
    state rather than losing the handoff or claiming the save failed.
  - **Compatibility and scope boundary:** receipt create, update, and click clear
    share one settle-once wrapper for callback-only, Promise, and hybrid Chrome
    completion, including callback-scoped `runtime.lastError`. Duplicate and
    no-source captures avoid an unnecessary update. Existing English/native zh-TW
    copy, privacy blur, hostile-label sanitization, route codec, authoritative
    click resolution, badge behavior, and exact close guards are preserved. No
    schema, migration, durable outbox, storage shape, permission, host permission,
    new UI surface, or saved-data rewrite was added.
  - **Evidence:** the public context-menu tracer first failed because `tabs.get`
    ran before callback-only receipt confirmation; the click tracer then failed
    because callback-only clear completed early. The production-extracted suite now
    covers callback success/error, stable update/clear settlement, both hybrid
    completion orders, item create/update failure, whole-window create failure,
    exact effect ordering, and the existing continuation/privacy/locale matrix.
    All 36 repository JavaScript
    syntax checks and all 27 deterministic commands, including the default
    10,000-schedule concurrency gate, pass. **Implemented: yes. Verified: partial
    (static and production-extracted deterministic evidence only). User-validated:
    no. Released: no.** Installed native notifications, real source-tab effects,
    service-worker teardown, screen-reader behavior, representative-user recovery,
    and release evidence remain absent.

- **2026-08-02 — Shared Library recovery ledger**
  - **Acceptance criteria implemented:** All Links, Favorites, and Read Later now
    render one scan-friendly recovery ledger. Every row keeps its complete
    Workspace › Space › localized Group › optional Stack destination visible and
    exposes named Open page and View details actions. Read Later is one
    oldest-unread-first queue rather than duplicated Up-next cards plus a list.
  - **Route, safety, focus, and compatibility boundary:** query, Read Later status,
    sort, and detail selection are canonical URL state across reload and browser
    navigation and never write durable storage. Open and Details freeze and
    re-resolve the exact globally unique saved item, location, value, route meaning,
    and current visible-ledger membership before dispatch. Stale or filtered-out
    rows fail closed. Closing Details returns to the rebuilt row's Open page action;
    list mutations retain the same useful control or a neighboring row. Touched
    controls and feedback are English/native zh-TW, keyboard menus remain anchored,
    privacy blur covers the recovery trail, and the row reflows before common
    sidebar/rail widths can hide it. No schema, migration, storage shape,
    permission, host permission, remote asset, telemetry, or saved-data rewrite
    was added.
  - **Evidence:** the focused contract was observed red before route-only
    persistence, unique visible-item validation, stable focus restoration,
    single-ledger CSS, localized status feedback, responsive reflow, privacy blur,
    and keyboard anchoring were implemented. All 36 repository JavaScript syntax
    checks, all 27 deterministic commands (quality plus 26 contract/import checks,
    including the default 10,000-schedule concurrency gate), and
    `git diff --check` pass. **Implemented: yes. Verified: partial (static and
    production-extracted deterministic evidence only). User-validated: no.
    Released: no.** Installed rendering and browser history, native screen-reader
    output, real theme/locale/viewport behavior, representative-user recovery, and
    release evidence remain absent.

- **2026-08-02 — Shared single-page Reopen safety / duplicate prevention**
  - **Acceptance criteria implemented:** every individual saved-page activation
    now freezes and repeatedly re-resolves one globally unique unchanged current
    tab item before a browser effect. Normal Open queries all profile tabs,
    recognizes the exact normalized live destination or this extension's exact
    suspended placeholder, prefers the live page, fresh-reads its tab/window
    identity, and activates then focuses it without creating a copy. With no
    match, foreground creates one live tab; background creates one inactive live
    or Hibernate placeholder. The card arrow keeps explicit new-tab semantics and
    does not depend on a duplicate scan it will not use.
  - **Consistency, failure, and compatibility boundary:** Landing, Library,
    Read Later, Home Trail, Board/Group layouts, Search, Details, Explorer, Graph,
    and drop-to-open now share the coordinator. Same-document identical intent
    shares one effect; when available, a same-origin Web Lock serializes separate
    Locus documents, and a same-document queued request stops behind an
    unconfirmed mutation.
    Unsafe addresses, stale identities, changed browser candidates, near-match,
    foreign-placeholder, browser-read, and uncertain-receipt cases fail closed.
    Confirmed success is quiet; distinct English/native zh-TW recovery messages
    retain the connected opener, and Landing closes only after confirmation. No
    schema, migration, permission, host permission, storage, or saved-data change
    was added. At this historical slice boundary, bulk Group/selection Open and
    popup route reuse remained separate; the newer bulk-Reopen entry supersedes the
    former exclusion, while popup route reuse remains separate.
  - **Evidence:** the focused production-extracted contract first failed at each
    missing behavior, then passed exact creation, live/suspended/pending reuse,
    deterministic preference, Hibernate/background and explicit-copy behavior,
    identity and candidate races, changed activation/focus receipts,
    query/update/focus/create failures, single- and two-document concurrency,
    truthful failure-copy ownership, and all in-scope callsites.
    All 35 repository JavaScript syntax checks, all 26 deterministic checks
    (quality plus 25 contract scripts, including the default 10,000-schedule
    concurrency gate), and `git diff --check` pass. **Implemented: yes. Verified:
    partial (static and production-extracted deterministic evidence only).
    User-validated: no. Released: no.** Installed Chrome tab/window effects, the
    cross-document visibility after an unknown effect, the final non-atomic
    query/create race, native screen-reader behavior,
    representative-user recovery, and release evidence remain absent.

- **2026-08-02 — Progressive Search continuation / reachable Find again**
  - **Acceptance criteria implemented:** Search still opens with a calm 100-row
    result window, but matches after 100 are no longer silently unreachable. When
    more exist, a quiet sibling footer outside the listbox reports visible versus
    total results and reveals up to 100 more. Each expansion selects, focuses, and
    nearest-scrolls to the first new row; the final partial batch removes the
    action while retaining honest progress. There is no infinite scroll,
    pagination dashboard, second Search surface, or stored preference.
  - **Route, safety, and compatibility boundary:** a non-default safe-integer
    multiple of 100 rides the Search URL as `shown`, so reload, navigation away
    and Back, Forward, and Search-owned Details rebuild the same window. Invalid
    values fall back to 100. Query/type/Space/time/tag/sort changes reset to the
    first batch; filter-panel disclosure and selection do not. Open, Enter,
    Details, related results, and roving keys share the visible-window boundary:
    hidden items remain inert, while deliberately revealed items still require
    the existing exact identity, global uniqueness, fingerprints, and address
    allowlist. A delayed callback from a superseded Search session cannot steal
    focus. No schema, migration, permission, host permission, durable state,
    remote asset, or data rewrite was added.
  - **UI/accessibility and evidence:** English and native zh-TW use compact
    progress/action copy; the mobile action is full-width with a 38 px target.
    Progress has one deduplicated live announcement, the footer is not a listbox
    option, and forced-colors focus remains visible. The focused contract first
    failed before the paging model existed, then passed batching, URL
    canonicalization, reset, hidden/revealed recovery, stale-focus, partial-final-
    batch, copy, semantics, and responsive source rules. All 34 repository
    JavaScript syntax checks, all 25 deterministic checks (including the default
    10,000-schedule concurrency gate), and `git diff --check` pass.
    **Implemented: yes. Verified: partial (static and production-extracted
    deterministic evidence only). User-validated: no. Released: no.** Installed
    rendering, native screen-reader output, browser-tab effects, representative-
    user recovery, and release evidence remain absent.

- **2026-08-02 — Actionable background capture receipts / See destination**
  - **Acceptance criteria implemented:** context-menu page, link, selection,
    image, and eligible-window saves plus the `save-current-tab` command now make
    one quiet native-receipt attempt after the accepted write and any requested
    guarded source effect. The receipt names a recognizable accepted-time
    Workspace › Space › localized Group path, the saved kind/count, and the
    truthful closed, kept-open, unconfirmed, or partially closed result. Exact
    direct-Group URL duplicates remain write-free and source-effect-free but can
    continue to the one existing saved item. The badge remains a compact
    secondary signal.
  - **Continuation, privacy, and failure boundary:** the versioned notification
    locator carries only target kind, Workspace/item-or-Group IDs, and a nonce;
    click handling fresh-reads authoritative `te`, follows one globally unique
    same-Workspace item/Group through moves, creates one exact Home-item or Group
    route, and only then clears the receipt. Malformed, missing, duplicated, or
    cross-Workspace targets open generic local Home without mutation. User path
    labels cannot inject another line, bidi direction, or hierarchy delimiter and
    are grapheme-budgeted to keep the action visible. Receipts expose no page
    title, URL, favicon, selection, or note content. Existing privacy blur replaces
    all organization labels with localized destination-hidden copy. Notification,
    badge, source-read/removal, and continuation-open failures cannot repeat an
    accepted write/effect or emit a false not-saved warning. No schema, migration,
    permission, host permission, remote asset, telemetry, or durable outbox was
    added.
  - **Evidence produced:** the production-extracted background suite passes all
    entry points, source outcomes, English/native zh-TW copy, privacy and hostile-
    label cases, exact/ambiguous duplicate routing, restart-safe codec parsing,
    fresh moved/missing/duplicate resolution, create-before-clear ordering, and
    injected post-acceptance failures. All 34 repository JavaScript syntax checks,
    all 25 scripts (including the default 10,000-schedule concurrency gate), and
    `git diff --check` pass. Chrome and Edge executables were found, but the
    expected profiles and native browser-control bridge were absent in this task's
    user context. **Implemented: yes. Verified: partial (static and production-
    extracted deterministic evidence only). User-validated: no. Released: no.**
    Installed notification rendering/accumulation, native click delivery and tab
    effects across service-worker restart/crash, screen-reader behavior,
    representative-user recovery, and release evidence remain absent.

- **2026-08-02 — Search recovery convergence / Find again**
  - **Acceptance criteria implemented:** the active-Workspace `/search` route is
    now a focused Find-again surface. One query leads to real results, the
    selected save's Workspace → Space → localized Group destination, and explicit
    Open page or View details actions. Optional filters default closed. The
    decorative numbered process, stats/tips footer, gradient badge, and in-row
    Favorite quick mutation are removed; Favorite remains available through the
    item/Library flows rather than competing with recovery.
  - **Safety and interaction boundary:** settled-query Enter, result Enter,
    click-click-double-click, and visible Open converge on one exact controller.
    It reuses the Home/Trail recovery context, global uniqueness resolver, full
    item/location fingerprints, saved-address allowlist, and shared opener.
    Debouncing or zh-TW IME Enter is inert. Missing, duplicate, cross-Workspace,
    replaced, renamed, moved, parent-reordered, URL-edited, Workspace-switched,
    and refused-opener targets fail closed without a browser/route/state effect
    and restore focus. Non-tabs and unsafe legacy URLs offer exact Search-owned
    Details with `persist: false`; close and Back retain the complete query,
    filters, sort, selection, and exact rebuilt-row focus. Detail routes require
    current visible-result membership; a refused route clears prepared metadata,
    and removed/filtered targets clear selection, detail state, and URL together.
    Query and composition changes synchronously disable old recovery actions, and
    stale debounce callbacks cannot affect a newer Search session. No schema,
    migration, permission, remote asset, or durable setting was added.
  - **UI/accessibility boundary:** one selected option participates in the Tab
    order; loading/empty/error content no longer inherits listbox semantics;
    content types are a labeled pressed filter group; filters/sort restore their
    own focus after rerender; Search avoids a nested main landmark. Arrow/Home/End
    roving stays mounted and scrolls the focused row into view. A persistent
    signature-deduped live region owns loading/count announcements; inline errors
    remain the sole alert. Only populated narrow results scroll, long titles/paths/
    tags wrap, and stacked actions, reduced motion, forced-color focus and selected/
    pressed states, singular/plural English, and native zh-TW copy have focused
    contracts.
  - **Evidence produced:** the production-extracted Search suite executes the real
    URL, traversal, uniqueness, fingerprint, activation, and routing helpers
    across the cases above plus full reload-safe Search/detail URL state, real
    production Router apply/render canonicalization, IME input sequencing, stale-
    session debounce isolation, roving selection, and live-region deduplication.
    All 34 repository
    JavaScript syntax checks, all 25 scripts (including the default 10,000-schedule
    concurrency gate), and `git diff --check` pass. The in-app browser connected,
    but policy blocked the local-file URL; no alternate backend or indirect server
    was used. **Implemented: yes. Verified: partial (static and production-
    extracted deterministic evidence only). User-validated: no. Released: no.**
    Installed MV3 tab effects, rendered pixels, native screen-reader/zoom/forced-
    colors, representative-user, and release evidence remain absent.

- **2026-08-02 — Active-Workspace Locus Trail recovery desk**
  - **Acceptance criteria implemented:** Home no longer opens with the scenic
    greeting. One real-data Trail leads with the latest saved item in the active
    Workspace, its exact Workspace → Space → Group destination, View-details and
    allowlisted Open-page recovery, then the most recently used saveable browser
    tab and exact Workspace → Space → Inbox destination. Inbox review follows and
    omits the featured item; recent Spaces remain last. The Home top-bar Save and
    the former Inbox Save duplicate are removed from this route.
  - **Safety, accessibility, and compatibility boundary:** the primary Save action
    follows the existing `closeTabOnSave` preference and the adjacent action makes
    the inverse consequence explicit without changing that setting. Candidate and
    destination identity are rechecked before the shared receipt-gated capture;
    the reviewed Workspace, Space, and Inbox references and visible path names
    reject same-ID replacement, rename, duplicate Inbox, and changed provisioning;
    tab refresh cannot repaint Home from the optimistic graph while capture is pending;
    the existing pre-close source check remains authoritative. Latest-item review
    requires the same Workspace, Space, object reference, value fingerprint, and
    location fingerprint; unsafe or stale Open paths fail closed. No route,
    permission, schema, migration, durable Trail state, or remote asset was added.
    English/native zh-TW copy, native buttons, a named control group, contextual
    accessible names, keyboard-focus restoration, a stacked vertical base plus
    current medium/wide Trail projections, reduced motion, and forced-color source
    contracts are present.
  - **Evidence produced:** the production-extracted onboarding/Home Trail suite
    passes ordering and legacy fallback, Workspace isolation, exact recovery
    identity, URL and pending-navigation filtering, preference-driven actions,
    stale source/destination rejection, pre-receipt refresh suppression,
    overlapping-query ordering, receipt ordering, retry/refresh focus,
    localized capture outcomes, Home hierarchy, and responsive source contracts.
    The full 31-file syntax, quality, 23-contract/24-check deterministic,
    10,000-schedule concurrency, and `git diff --check` block passes. The in-app
    browser was unavailable, so no rendered check was performed. **Implemented:
    yes. Verified: partial (static and production-extracted deterministic evidence
    only). User-validated: no. Released: no.** Installed MV3 storage/message/
    service-worker behavior, real tab open/close effects, screen-reader, zoom,
    forced-colors rendering, representative-user, and release evidence remain
    absent.

- **2026-07-29 — Localized organization terminology in Import and Explorer**
  - **Acceptance criteria passed:** Explorer headings, listbox names, and empty
    states now use localized Space/Group/Item/Stack copy. Import review,
    validation feedback, counts, modes, actions, success, and reminder warnings
    use English/native zh-TW product language; legacy Space-scroll controls have
    localized accessible names. Generic symbol and Finance categories remain
    correctly named.
  - **Compatibility boundary:** the raw validator still emits its deterministic
    schema diagnostics and reads `workspaces[].categories[]`; import/export bytes,
    `counts.categories`, `activeCatId`, `categoryId`, routes, reminder kinds,
    persistence, focus, and mutations are unchanged. A presentation-only path
    formatter maps internal indices to precise one-based Workspace → Space →
    Group → Item → Reminder locations and preserves quoted user values.
  - **Visual/accessibility repair:** six review counts form a balanced 3×2 grid;
    selected mode uses a soft theme tint with readable secondary text; and the
    height-bounded panel keeps header/footer actions visible while only its body
    scrolls. English/light 1280×720, native zh-TW/Locus Dark 800×720, and compact
    480×500 static current-source fixtures passed width, duplicate-ID, forbidden-
    copy, and empty browser-log audits.
    Cycle 28 superseded that visual projection with the backup-first flat manifest;
    the terminology and compatibility evidence in this entry remains applicable.
  - **Evidence produced:** the dedicated production/static contract, 33 malformed
    import boundaries, 128 seeded structural mutations, schemas 0–12, six
    envelopes plus raw legacy, the 1,488,148-byte scale corpus, exact-byte and
    quota rollback cases pass. The full 31-file syntax, quality,
    23-contract/24-check deterministic, 10,000-schedule, and `git diff --check`
    block passes. **Implemented: yes. Verified: partial (production-extracted,
    static, and current-source static visual evidence). User-validated: no.
    Released: no.** Installed File/FileReader/preview, MV3 storage/message/
    service-worker behavior, screen-reader, zoom, forced colors,
    representative-user, and release evidence remain absent.

- **2026-07-29 — Exact-selection rich-text Link dialog**
  - **Acceptance criteria passed:** the native English URL prompt is gone.
    Board Notes, Group READMEs, and item-detail notes use one delegated
    Ctrl/Cmd+K path and the same localized toolbar action. Opening requires one
    non-collapsed selection inside one connected editable `.note-text`; the
    dialog reviews that text, accepts only a full HTTP(S) address, traps focus,
    keeps recovery above its inert interlock, and restores the exact editor
    selection on Cancel or Escape.
  - **Mutation boundary:** confirmation revalidates the exact editor reference,
    HTML, selected text, range nodes, and offsets. One unchanged target executes
    `createLink` once and dispatches one bubbling `input` event. Opening, invalid
    input, stale/replaced/disconnected targets, cancellation, and failed or
    thrown commands perform no accepted formatting or state write; each owning
    editor retains its existing blur/save/history path.
  - **Evidence produced:** production-extracted tests cover URL normalization,
    selection/editor identity, valid/invalid/stale/failed outcomes, focus and
    recovery ownership, blur suppression, English/native zh-TW parity, markup,
    narrow layout, and reduced motion. The full 30-file syntax, quality,
    22-contract/23-check deterministic, 10,000-schedule, and `git diff --check`
    block passes.
  - **Visual/evidence boundary:** browser policy blocked the app shim. The
    prescribed script-free fallback rendered the exact production fragment and
    stylesheet cleanly in English/light and native zh-TW/Locus Dark at
    1280×720, 800×720, and compact 480×500, including invalid feedback, without
    overflow, duplicate IDs, raw keys, warnings, or errors. **Implemented: yes.
    Verified: partial (static, production-extracted deterministic, and
    current-source static visual evidence). User-validated: no. Released: no.**
    Installed MV3 interaction/persistence, actual browser `execCommand`,
    screen-reader, zoom, forced colors, representative-user, and release
    evidence remain absent.

- **2026-07-29 — Exact popup destinations and generated capture identities**
  - **Acceptance criteria passed:** destination preview is read-only. Explicit,
    remembered, configured-default, and active Workspace/Space/Group identities
    must resolve once in their exact hierarchy; stale, incomplete, moved, or
    duplicate identities fail closed without redirecting the save. A detached
    proposed Inbox is materialized only inside single-tab, quick, queue, links, or
    save-before-hibernate mutation; exactly one existing Inbox is reused.
    Session and bookmark Groups are created directly in the reviewed Space with no
    unrelated Inbox.
  - **Persistence and source boundary:** one allocator reserves active, Archive,
    Trash, capture/default hint, sizing, and Canvas identities for every generated
    Inbox, Session Group, bookmark Group, tab, and note. Real flows snapshot before
    mutation and make one guarded state request; duplicate/empty targets write
    nothing, and rejected or acknowledgement-unknown writes restore the graph and
    dispatch no source effect. Bookmark import now joins `popupCapturePending`.
    Only an accepted ordinary single-tab save may fresh-read and remove the same
    tab ID/window/URL with no different pending URL.
  - **Evidence produced:** the production-extracted popup contract executes
    read-only preview, exact explicit/remembered/default/active targets,
    stale/incomplete/moved/duplicate identities, existing/proposed/duplicate
    Inbox, retained-ID collisions, single/quick/hibernate/Session/queue/bookmark
    generation, accepted/rejected receipts, pending bookmark overlap, and exact
    ordinary-source revalidation. The full 30-file syntax, quality,
    22-contract/23-check deterministic, 10,000-schedule, and `git diff --check`
    block passes.
  - **Remaining production-gate failure:** this mechanism-only slice has static
    and production-extracted deterministic evidence, not installed MV3 evidence.
    Real popup teardown, storage/message/service-worker lifetime, bookmarks and
    tab effects, keyboard/screen-reader behavior, representative-user, and release
    evidence remain absent. No layout or copy changed, so no new current-source
    visual claim applies. **Implemented: yes. Verified: partial (static and
    production-extracted deterministic evidence). User-validated: no. Released:
    no.**

- **2026-07-29 — Exact-destination contextual capture**
  - **Acceptance criteria passed:** page, link, selection, image, shortcut, and
    whole-window context-menu captures now share one strict destination policy.
    Remembered Workspace/Space/Group tuples, configured default Spaces, and
    active Workspace/Space fallbacks must resolve uniquely in their exact
    hierarchy. Present-but-stale, moved, incomplete, or duplicate identities fail
    closed. Single capture reuses one exact Inbox or provisions it only when none
    exists; duplicate Inboxes are unavailable. Session capture creates its Group
    directly in the exact Space without inventing an Inbox.
  - **Persistence and source boundary:** generated default structures, Inboxes,
    Session Groups, and items allocate against active, Archive, Trash, capture/
    default hints, sizing, and Canvas keys. A real capture makes one guarded state
    write; conflicts, quota rejection, invalid input, and unknown exceptions are
    single-shot. Only an accepted receipt shows success or starts cleanup. Each
    source tab is then fresh-checked by exact ID, window, URL, and pending URL;
    whole-window cleanup also preserves the initiating tab and any tab that became
    active.
  - **Evidence produced:** the production background contract executes active,
    default, remembered, and fresh targets; moved/stale/duplicate identities;
    existing/proposed/duplicate Inbox; retained-ID collision; duplicate and
    unsupported URLs; accepted/conflict/quota/error writes; exact close
    revalidation; and English/native-zh-TW Session creation without Inbox side
    effects. The full 30-file syntax, quality, 22-contract/23-check deterministic,
    10,000-schedule, and `git diff --check` block passes.
  - **Remaining production-gate failure:** this worker-only path has deterministic
    browser-API model evidence, not rendered or installed MV3 evidence. Real
    context-menu/badge/notification behavior, tab cleanup, storage/message receipt
    teardown, service-worker restart, screen-reader, representative-user, and
    release evidence remain absent. **Implemented: yes. Verified: partial
    (static and production-extracted deterministic evidence). User-validated: no.
    Released: no.**

- **2026-07-29 — Receipt-gated Calendar Add-task transaction**
  - **Acceptance criteria passed:** the day menu now opens one localized,
    in-product dialog that visibly reviews the exact date, 9:00 AM reminder,
    active Workspace/Space, and existing or proposed Inbox. Confirmation
    re-resolves that complete destination, tolerates harmless Group reorder and
    unrelated edits, and fails closed on duplicate IDs/Inboxes, replacement,
    removal, move, rename, or active-destination change.
  - **Persistence boundary:** one collision-safe allocation creates at most one
    Inbox and exactly one to-do/reminder, takes one localized snapshot, and awaits
    exactly one `State.persistNow({ reconcileReminders: true })`. The native
    prompt, page-owned alarm, delayed writer, retry, and rollback are absent.
    Pending owns controls, backdrop, Escape, shortcuts, history, programmatic
    navigation, and duplicate activation. Only an accepted receipt closes,
    renders, focuses the exact new dot, and exposes localized success plus Undo;
    alarm failure warns. Rejected or unknown receipts render or claim nothing.
  - **Evidence produced:** production-extracted cases cover existing/proposed
    Inbox creation, collision-safe IDs across active/Archive/Trash/hints,
    reorder/unrelated-edit safety, stale and ambiguous destinations, validation,
    recovery, delayed/accepted/alarm-warning/rejected/unknown receipts, pending
    interlocks, localization, and exact focus/Undo. Current-source interaction
    covered accepted save and reload, a 60-second delayed receipt with native
    Escape and Back blocked, rejected-write recovery with no optimistic task, and
    exact opener/dot focus at English/light 1280×720 and native zh-TW/Locus Dark
    800×720. At 800×720 the live DOM had 437 IDs, no duplicates or raw keys, and
    no warning/error logs. All 30 syntax checks, quality, 22 contract scripts
    (23 deterministic checks), and 10,000 schedules passed.
  - **Remaining production-gate failure:** this is current-source browser-shim
    evidence, not installed MV3 storage/message/alarm/service-worker lifetime.
    Real notifications, restart/sleep, screen-reader, zoom, forced colors,
    representative-user, and release evidence remain absent. **Implemented: yes.
    Verified: partial (static, deterministic, and current-source
    visual/interaction evidence). User-validated: no. Released: no.**

- **2026-07-29 — Receipt-gated Group/Space reminder add, edit, and reschedule**
  - **Acceptance criteria passed:** picker review now freezes the exact
    Workspace/Space/optional Group object and optional stable reminder ID,
    reference, and value. Harmless reminder reorder or neighbor changes remain
    safe; missing, duplicate, replaced, edited, moved, or replaced-owner targets
    fail closed. Add allocates one unique schema-12 ID against the current list.
    Edit preserves that ID plus imported fields; Calendar reschedule owns only
    time and notification state.
  - **Persistence boundary:** a semantic no-op writes nothing. A real mutation
    takes one localized Set/Update snapshot and exactly one
    `State.persistNow({ reconcileReminders: true })`. The page-owned entity alarm
    loop and fire-and-forget writers are removed. Picker and non-picker pending
    paths block duplicate activation, route/history changes, lower interaction,
    and global shortcuts. Accepted receipts alone close, render, restore exact
    row/dot/owner focus, and expose Undo; alarm failure warns. Rejected or unknown
    writes retain the dirty graph beneath fail-closed recovery without optimistic
    render, focus, retry, or success.
  - **Evidence produced:** production-extracted tests cover Group/Space
    add/edit/reschedule/removal, unique-ID collision, imported-field preservation,
    recurrence normalization, no-op/invalid/recovery/stale/ambiguous outcomes,
    delayed/accepted/alarm-warning/rejected/unknown receipts, pending interlocks,
    and exact focus. Current-source interaction covered accepted Group edit,
    five-second delayed Group add with blocked Escape, native zh-TW Space edit,
    reload persistence, and rejected-write recovery at English/light 1280×720
    and native zh-TW/Locus Dark 800×720. Duplicate IDs, raw keys, and browser
    warning/error logs were empty. A test-only page-world drag sequence moved the
    exact Space reminder and survived reload; the coordinate driver itself did
    not synthesize native HTML5 drag. All 29 syntax checks, quality, 21 contract
    scripts (22 deterministic checks), 10,000 schedules, and `git diff --check`
    passed.
  - **Remaining production-gate failure:** drag evidence is synthetic
    current-source behavior, not native installed input. Installed MV3
    storage/message/alarm/service-worker lifetime, notifications, restart/sleep,
    screen-reader, zoom, forced colors, representative-user, and release evidence
    remain absent. Calendar Add-task was a separate follow-up and is recorded
    above.
    **Implemented: yes. Verified: partial (static, deterministic, current-source
    visual/interaction, and synthetic drag-handler evidence). User-validated: no.
    Released: no.**

- **2026-07-29 — Localized accessible Calendar recovery shell**
  - **Acceptance criteria passed:** Breadcrumb, Back consequence, Calendar name,
    period/view/navigation controls, Today/Tomorrow/Past due sections, filter,
    day counts, `+N more`, empty/no-match/upcoming states, missing-item feedback,
    source descriptions, tooltips, Undo label, and Note/untitled fallbacks now
    share one 33-key English/native-zh-TW family. Filter operators and user data
    remain literal. Month/Week/Agenda expose a localized group name plus exact
    `aria-pressed` state; the filter and breadcrumb have localized accessible
    names.
  - **Interaction behavior:** locale repaint preserves the exact Calendar route,
    active view, filter, reminder IDs, and timestamps. Workspace-empty and
    filter-empty states each have one owner instead of stacking an Agenda
    duplicate. Escape clears a nonempty filter and returns focus/caret to its
    rebuilt input; a second Escape retains the existing blur behavior.
  - **Evidence produced:** production helpers execute empty Note/untitled
    fallback, Today/Tomorrow, 0/1/many day counts, Group/Space source names, and
    localized dot titles; static checks reject the scoped English literals and
    missing semantics. Current-source checks covered Agenda/Month/Week routes,
    Past due plus future reminders, localized menu and Open/Back return,
    filter no-match/clear focus, one authoritative empty state, and live locale
    repaint with unchanged `source:item` and exact reminder IDs. English/light
    1280×720 and native zh-TW/Locus Dark/reduced-motion 800×720 matched viewport
    width; duplicate IDs, raw keys, scoped English residue, and browser logs were
    empty. All 29 syntax checks, the quality gate, 21 contract scripts
    (22 deterministic checks), 10,000 concurrency schedules, and
    `git diff --check` passed.
  - **Remaining production-gate failure:** user-authored English Workspace/Space/
    item names and protected filter syntax correctly remain data. The legacy
    Calendar Add-task mutation and Group/Space add/edit/reschedule boundaries are
    separate. Installed MV3, screen-reader, zoom, forced-colors,
    representative-user, and release evidence remain absent. **Implemented:
    yes. Verified: partial (static, deterministic, and current-source
    visual/interaction evidence). User-validated: no. Released: no.**

- **2026-07-29 — Locale-aware shared relative-time projection**
  - **Acceptance criteria passed:** the single formatter now resolves locale at
    call time and owns future/past sub-minute, minute, hour, and day output.
    English retains its compact thresholds; native zh-TW uses **即將**, **剛剛**,
    and variable **分鐘／小時／天 + 前／後** wording. Reminder badges, reminder
    lists, Calendar, search, Read Later, Archive, and every existing caller inherit
    the same implementation without a one-off branch.
  - **Dynamic repaint:** changing language now re-renders dynamic product
    surfaces from the same stored timestamps. The real settings controls repainted
    one reminder `in 58m → 58 分鐘後 → in 58m`; reload retained the selected
    locale and reminder without rewriting time data.
  - **Evidence produced:** the production-extracted overdue-reminder suite executes
    20 exact English/native-zh-TW future/past outputs, including rounding
    transitions from minutes to hours and hours to days, and rejects hardcoded
    formatter copy. Current-source checks covered the Board badge and Calendar
    Agenda timestamp at English/light 1280×720 and native zh-TW/Locus Dark
    800×720. Viewport and scroll widths matched, duplicate IDs, raw relative-time
    keys, English relative fragments in scoped zh-TW surfaces, and browser logs
    were empty. All 29 syntax checks, the quality gate, 21 contract scripts
    (22 deterministic checks), 10,000 concurrency schedules, and
    `git diff --check` passed.
  - **Remaining production-gate failure:** the surrounding Calendar shell still
    has separately scoped English residue. Installed MV3, screen-reader, zoom,
    forced-colors, representative-user, and release evidence remain absent.
    **Implemented: yes. Verified: partial (static, deterministic, and
    current-source visual/interaction evidence). User-validated: no. Released:
    no.**

- **2026-07-29 — Receipt-gated non-detail item reminder transaction**
  - **Acceptance criteria passed:** Board and Calendar item Set/Change/quick/Clear
    and reschedule now share one non-detail controller. It freezes exhaustive
    Workspace/Space/Group/Stack ancestry, record/reference, item type, location,
    and full-value identity; duplicate, missing, moved, replaced, changed,
    retyped, invalid, past-time, recovery-owned, and concurrent targets fail
    closed. Item-detail reminders retain their separately owned controller.
  - **Persistence boundary:** a changed reminder preserves imported extension
    fields, takes one localized snapshot, and awaits exactly one
    `State.persistNow({ reconcileReminders: true })`; the page owns no alarm
    effect. While pending, the picker remains open and busy without render,
    success, focus movement, or premature close. Accepted state plus successful
    reconciliation renders once, restores the exact item or Calendar target, and
    exposes exact Undo; alarm failure uses the existing warning. Rejected or
    unknown acknowledgement leaves the picker under fail-closed recovery with no
    optimistic badge or success.
  - **Evidence produced:** production-extracted tests execute accepted,
    alarm-warning, rejected, unknown, no-op, invalid, recovery, duplicate,
    replaced, moved, ancestor-replaced, changed, retyped, clear, and pending
    interlock outcomes. Current-source checks covered Board Set/Clear and Calendar
    Edit/Clear, reload persistence, exact rebuilt focus, a 1.2-second deferred
    receipt, and rejected-write recovery. English/light 1280×720 and native
    zh-TW/Locus Dark 800×720 dialogs stayed bounded; duplicate-ID scans and
    browser logs were empty. All 29 syntax checks, the quality gate, 21 contract
    scripts (22 deterministic checks), 10,000 concurrency schedules, and
    `git diff --check` passed.
  - **Remaining production-gate failure:** this is current-source browser-shim
    evidence, not installed MV3 storage/message/alarm/service-worker evidence.
    Real screen-reader, zoom, forced-colors, notification/restart/sleep,
    representative-user, and release evidence remain absent. The native zh-TW
    reminder badge also exposed a separate English relative-time residue queued
    for the next slice. **Implemented: yes. Verified: partial (static,
    deterministic, and current-source visual/interaction evidence).
    User-validated: no. Released: no.**

- **2026-07-29 — Localized accessible Board item-color transaction**
  - **Acceptance criteria passed:** Note and To-do wrappers share one pointer plus
    Shift+F10/Context Menu path with first-action focus and native Note-selection
    preservation. The hardcoded Note **Edit** action is localized. **Edit color**
    now opens one localized radiogroup of six native 32×32 px choices with
    truthful selection, visible focus, Arrow/Home/End navigation, viewport
    clamping, and centralized Escape/Tab/outside/reopen cleanup.
  - **Mutation boundary:** a color change exhaustively resolves the one current
    item/reference, rejects duplicates, replacements, Stacks, recovery, and
    invalid values, then uses one localized snapshot, the existing `item.color`
    field, one persistence request, one render, and same-ID focus. Re-selecting
    the current value is a no-op.
  - **Evidence produced:** production-extracted tests execute changed, unchanged,
    clear, invalid, duplicate, replacement, Stack, and recovery cases and reject
    the old invisible `<div>` palette, English action, and leaked listener.
    Current-source checks exercised zh-TW pointer and Shift+F10 menus, first-action
    focus, Arrow/Escape, exact semantics and sizes, changed-color focus, and reload
    persistence at 1440×900; English/light 1280×720 and native zh-TW/Locus Dark
    800×720 remained bounded. Page/scroll widths matched, duplicate-ID/raw-key
    scans and browser logs were empty. All 29 syntax checks, the quality gate,
    21 contract scripts (22 deterministic checks), 10,000 concurrency schedules,
    and `git diff --check` passed.
  - **Remaining production-gate failure:** the current browser input driver did
    not synthesize native Enter/Space activation, and reduced-motion/forced-colors
    remain static CSS evidence. Installed MV3, screen-reader, zoom,
    representative-user, and release evidence remain absent. **Implemented: yes.
    Verified: partial (static, deterministic, and current-source
    visual/interaction evidence). User-validated: no. Released: no.**

- **2026-07-29 — Native keyboard Group resize controls and bounded listeners**
  - **Acceptance criteria passed:** Board width and corner handles are localized
    native buttons whose exact Group names, tooltip consequences, and Arrow-key
    scope agree. Left/Right and corner Up/Down use 16 px steps or 48 px with
    Shift, preserve the untouched axis, and retain the existing 200–900 px width,
    120–`viewport − 200` height, and `columnSizes[groupId] = { w, h }` contract.
    Keyboard completion persists the exact visible size once and keeps focus.
    Pointer handling uses capture plus handle-local move/up/cancel/lost-capture
    listeners; Group reorder is paused only during resize and restored on every
    settled path. The prior per-render document listeners are gone.
  - **Evidence produced:** production helpers execute keyboard steps, pointer
    deltas, all bounds, orthogonal-axis preservation, and one exact
    sibling-preserving write. Source contracts reject the old `<div>`,
    `mousedown`, document mouse listeners, and English **Resize** copy while
    requiring capture/release, localized names, and light/dark/forced-color
    focus. Current-source checks covered English/light 1280×720 plus native
    zh-TW/dark/reduced-motion 1440×900 and 800×720. Keyboard sizing moved
    290→306→354 px and 283→299 px, retained exact focus, and survived reload as
    354×299 px. Focus visuals, no page overflow, and focused-Group handle hiding
    passed; captured browser errors were empty. All 29 syntax checks, the quality
    gate, 21 contract scripts (22 deterministic checks), 10,000 concurrency
    schedules, and `git diff --check` passed.
  - **Remaining production-gate failure:** the in-app driver's real-mouse path
    emitted `pointerdown` but no continuation after capture, so it is not counted
    as pointer-completion evidence. Installed Chrome pointer lifecycle,
    screen-reader, zoom, forced colors, representative-user, MV3, and release
    evidence remain absent. **Implemented: yes. Verified: partial (static,
    deterministic, and current-source visual/keyboard evidence). User-validated:
    no. Released: no.**
  - **Next relevant slice:** the scoped native-zh-TW Board scan found no further
    app-owned English core-control residue; choose the next slice only from a
    reproduced workflow or trust failure rather than manufacturing breadth.

- **2026-07-29 — Native, localized opened-tab row controls**
  - **Acceptance criteria passed:** each opened-tab selection control is now a
    native button with checkbox semantics, truthful `aria-checked`, and an exact
    localized Select/Deselect name containing the browser tab title. Selection
    and deselection repaint once and restore focus by stable tab ID. Direct Close
    names the exact tab. Empty, sleeping, context-menu, batch badge, and multi-drag
    language all use English/native-zh-TW dictionaries; live locale changes
    repaint the dynamic rail.
  - **Evidence produced:** production-controller contracts execute exact-tab
    focus restoration and both selection states, require the native markup and
    locale keys, and reject duplicate custom keyboard handling plus the
    hardcoded runtime copies. Current-source browser checks covered populated,
    empty, sleeping, one- and two-tab selection, deselection, batch controls,
    context menus, and an exact `{ type: "tab-remove", id: 101 }` close request.
    They covered English/light 1280×720, native zh-TW/dark/reduced-motion
    1440×900, and the hidden rail at 800×720; widths matched and duplicate-ID
    scans were empty. All 29 syntax checks, the quality gate, 21 contract scripts
    (22 deterministic checks), 10,000 concurrency schedules, and
    `git diff --check` passed.
  - **Remaining production-gate failure:** the close check is a current-source
    shim request, not a real Chrome effect. Installed Enter/Space, screen-reader,
    close rejection, drag, MV3 lifetime, zoom/forced-colors, representative-user,
    and release evidence remain absent.
  - **Next relevant slice:** the remaining visible native-zh-TW app-owned shell
    residue is the pointer-only English **Resize** Group handle. Its per-render
    document listeners also accumulate. Define a keyboard alternative and bounded
    listener lifecycle without changing stored `columnSizes`.

- **2026-07-29 — Native, focus-stable Board To-do completion**
  - **Acceptance criteria passed:** Board To-do completion is now a native button
    with localized **Mark task complete / 標示為完成** and
    **Mark task incomplete / 標示為未完成** names plus truthful
    `aria-pressed`. The shared controller mutates `done` once, requests one
    existing persistence write, renders once, and focuses the rebuilt button for
    the same item ID. The To-do editor is a named single-line textbox; Note and
    To-do Archive controls use localized tooltips and names; and the To-do action
    strip reveals on `focus-within`.
  - **Evidence produced:** the production completion helper was executed in both
    states with exact snapshot, mutation, persistence, render, selector, and
    focus assertions. Static checks reject the click-only `<div>`, hardcoded
    Archive copies, unnamed editor, and keyboard-invisible action strip.
    Current-source checks exercised both states, exact-item focus return,
    completion reload persistence, new-To-do editor focus and reload persistence,
    English/light 1280×720, and native zh-TW/dark/reduced-motion 1440×900 and
    800×720. Widths matched and duplicate-ID scans were empty. All 29 syntax
    checks, the quality gate, 21 contract scripts (22 deterministic checks),
    10,000 concurrency schedules, and `git diff --check` passed.
  - **Remaining production-gate failure:** native-button semantics are
    mechanically established, but installed Enter/Space, real screen-reader
    output, browser zoom/forced colors, MV3 lifetime, representative-user, and
    release evidence remain absent.
  - **Next relevant slice:** the user-enabled opened-tabs rail still announces
    English **Select tab** and **Close tab** controls in native zh-TW. Localize
    that bounded capture surface and preserve stable tab identity/effects.

- **2026-07-29 — Native zh-TW Board quick-add and Note guidance**
  - **Acceptance criteria passed:** every Group footer now exposes localized
    visible text, tooltip, and accessible names for **Add tab / 加入分頁**,
    **Add note / 新增筆記**, and **Add to-do / 新增待辦**. The tab tooltip
    names its existing selected-open-tab/current-tab behavior. Empty Notes now
    render localized guidance while preserving `/todo`, `/red`, and `/green`,
    and the focused editor is a named multiline textbox.
  - **Evidence produced:** the nearest production-source contract rejects the
    prior hardcoded footer and CSS copies and requires English/native-zh-TW key
    parity plus Note textbox semantics. Current-source browser checks covered a
    populated Board in both locales, English/light 1280×720, native
    zh-TW/dark/reduced-motion 1440×900 and 800×720, creation focus, computed
    pseudo-content, and reload persistence of the exact newly created empty Note
    identity. Viewport and scroll widths matched and duplicate-ID scans were
    empty. All 29 syntax checks, the quality gate, 21 contract scripts (22
    deterministic checks), 10,000 concurrency schedules, and `git diff --check`
    passed.
  - **Remaining production-gate failure:** this is static, deterministic, and
    current-source browser-shim evidence, not installed MV3, screen-reader,
    browser-zoom, forced-colors, representative-user, or release evidence.
  - **Next relevant slice:** the same native zh-TW Board exposes click-only
    To-do completion and English **Archive** names on Note/To-do controls.
    Repair that bounded native-control path without changing stored item shape or
    reopening the receipt-gated detail editor.

- **2026-07-29 — Localized, state-aware core-shell names**
  - **Acceptance criteria passed:** the primary navigation region now exposes
    localized **Views / 檢視** semantics. The opened-tabs toggle names its live
    next consequence as **Collapse opened tabs / Expand opened tabs** or native
    **收合開啟的分頁 / 展開開啟的分頁**, with synchronized tooltip,
    `aria-controls`, and `aria-expanded`. The Space layout icon now retains the
    localized **Switch layout / 切換版面** action instead of overwriting it with
    English runtime copy.
  - **Evidence produced:** the production rail helper was executed in both states
    and both locales. Current-source browser checks covered Home and a populated
    Space, focus retention after click, expanded-state reload persistence,
    English/light 1280×720, native zh-TW/dark/reduced-motion 1440×900, and the
    hidden rail at 800×720. The scoped zh-TW shell audit found no remaining
    English in these three controls; viewport and scroll widths matched and
    duplicate-ID scans were empty. All 29 syntax checks, the quality gate, 21
    contract scripts (22 deterministic checks), 10,000 concurrency schedules,
    and `git diff --check` passed.
  - **Remaining production-gate failure:** this is static, deterministic, and
    current-source browser-shim evidence, not installed screen-reader, zoom,
    forced-colors, MV3, representative-user, or release evidence.
  - **Next relevant slice:** the same rendered native zh-TW Space reproduced
    English **Add tab** controls and the **Write a note…** quick-entry hint on the
    core Board. Localize and contract that bounded creation surface without
    treating user-authored English titles, Group names, URLs, or tags as defects.

- **2026-07-29 — State-aware localized sidebar toggle**
  - **Acceptance criteria passed:** the core sidebar toggle now names its live
    next consequence in its tooltip and accessible name, exposes
    `aria-controls="sidebar"`, and keeps `aria-expanded` synchronized. English
    uses **Collapse sidebar / Expand sidebar**; native zh-TW uses
    **收合側邊欄 / 展開側邊欄**.
  - **Evidence produced:** the production helper was exercised in both states and
    both locales. Current-source browser checks confirmed localized names,
    state, focus retention, click behavior, and collapsed-state reload
    persistence at 1440×900, 1280×720, and zh-TW/dark/reduced-motion 800×720,
    with viewport-width parity, no duplicate IDs, and clean browser logs. All 29
    syntax checks, the quality gate, 21 contract scripts (22 deterministic
    checks), 10,000 concurrency schedules, and `git diff --check` passed.
  - **Remaining production-gate failure:** installed screen-reader output,
    browser zoom/forced colors, and representative-user behavior remain
    unverified; the installed MV3 gate is still unavailable in this environment.
  - **Next relevant slice:** audit and localize the remaining core-shell
    accessible names, beginning with the reproduced English **Views** navigation
    name in native zh-TW, without expanding into Advanced surfaces.

- **2026-07-29 — Theme-scoped primary Save treatment**
  - **Acceptance criteria passed:** the active theme now computes
    `--brand-grad` on `body[data-theme]`; the top-bar **Save tab** action and every
    dependent new-tab accent render from the current theme without a layout,
    behavior, schema, permission, or persistence change.
  - **Evidence produced:** before repair, the default light theme computed an
    empty `--brand-grad` and `background-image: none` with white button text.
    After repair, current-source rendering computed the expected blue→violet
    light and dark gradients at 1440×900, 1280×720, and 800×720; the narrow pass
    used native zh-TW, dark theme, and reduced motion. All widths matched their
    viewport, duplicate-ID and raw-key scans were empty, browser logs were clean,
    and all 29 syntax checks, the quality gate, 21 contract scripts (22
    deterministic checks), the 10,000-schedule concurrency run, and
    `git diff --check` passed.
  - **Remaining production-gate failure:** this is current-source browser-shim
    evidence, not an installed MV3, forced-colors, browser-zoom, screen-reader, or
    representative-user pass; both production gates remain open.
  - **Next relevant slice:** remove the reproduced English-only accessible name
    from the core sidebar collapse control in native zh-TW, then continue the
    installed activation matrix when a supported Chrome bridge is available.

- **2026-07-29 — Exact-destination, receipt-gated Paste links import** — replaced
  the Settings import's mutable `activeCat()` submit lookup with one reviewed
  Workspace/Space context and stable existing-Group identity. Active Workspace or
  Space changes cannot redirect an import. Harmless sibling reorder is accepted;
  a missing, moved, duplicated, replaced, renamed, or otherwise ambiguous owner or
  Group refreshes the review or fails closed before snapshot, mutation, or write.
  Empty Spaces select New group and expose its visible name field immediately;
  leaving it blank uses the current English or native zh-TW fallback. HTTP(S)-only
  parsing reports invalid and duplicate nonblank lines without adding clipboard,
  page-content, or host access.

  Group and item candidates are detached before history and use the shared
  organization allocator, including active, Archive/Trash-envelope, capture,
  sizing, and Canvas identifiers. A valid import publishes pending state
  synchronously, takes one localized snapshot, mutates once, and awaits exactly one
  `State.persistNow()` receipt. Pending state owns duplicate activation, X/Cancel/
  scrim, Escape, Settings shortcuts, and route changes while retaining a contained
  Tab stop and `aria-busy`. Rejected or acknowledgement-unknown persistence leaves
  the dirty graph behind central recovery with no retry, render, close, toast, or
  success claim. Acceptance renders current real state, returns focus to the exact
  Settings opener, announces the localized count and Group, and binds Undo to the
  returned snapshot action ID. Browser history discards an idle draft before
  applying its new route and restores the stable route while the receipt is
  pending.

  The established modal language now supplies a labelled dialog, real textarea/
  select/name labels, polite validation and error regions, explicit Workspace/
  Space context, visible focus, body inertness, 32 px viewport gutters, scroll-
  bounded content, 520 px action reflow, light/dark tokens, forced-color focus, and
  reduced motion. English and native zh-TW copy covers empty, no-valid, skipped,
  stale, busy, failed, and successful states without a native prompt or confirm.
  Existing element IDs, schema/import format, local-only privacy, and zero host
  permissions are unchanged.

  The new production-extracted contract covers URL filtering, frozen destination,
  active-view changes, sibling reorder, five stale-target cases, empty-Space
  localization, collision-heavy allocation, one-snapshot/one-write ordering,
  accepted/rejected/unknown/pre-existing-recovery paths, exact Undo, focus, Escape,
  inertness, routing, responsive CSS, and locale parity. A fresh bundled-Node
  Chromium shim rendered English/light at 1280×720 and zh-TW/dark/reduced-motion at
  800×720. It confirmed bounded layout, live validation, textarea focus, inert
  Settings, pending Escape/close blocking, acknowledgement-unknown recovery, exact
  accepted Group placement, opener focus, localized Undo, duplicate-ID absence,
  and reload survival with the same item ID. The plain-HTTP reload pass stubbed the
  extension-only `_favicon` endpoint.

  All 29 JavaScript syntax checks, the quality gate, all 21 contract scripts (22
  deterministic checks total), the 10,000-schedule concurrency run, and
  `git diff --check` pass. This is **Implemented: yes; Verified: partial
  (production-extracted deterministic/static evidence plus current-source Chromium
  shim evidence); User-validated: no; Released: no**. A supported-browser probe
  exposed only the in-app browser and no installed Chrome/extension backend, so
  installed MV3 writer lifetime, real cross-window adoption, local favicon/CSP/
  network behavior, actual screen-reader output, and representative-user trust
  remain unverified rather than inferred.
- **2026-07-29 — Stable-ID, receipt-gated Group/Space reminder removal** —
  replaced the entity reminder picker's retained array index with one frozen
  Workspace/Space/Group-or-Space/reminder identity and reminder-value fingerprint.
  Commit fresh-resolves that exact reminder by stable schema-12 ID. A harmless
  sibling reorder is allowed; a missing or duplicate ID, replaced reminder,
  changed value, moved owner, archived/trashed owner, or otherwise stale context
  fails closed. Recovery already active at confirmation is blocked before the
  localized snapshot, state mutation, or write.

  A valid target takes one localized snapshot, removes only the fresh ID-resolved
  record, and awaits `State.persistNow({ reconcileReminders: true })`. Close,
  render, success feedback, and exact Undo happen only after the accepted state
  receipt. Rejected or acknowledgement-unknown writes keep the dialog or recovery
  layer available and report no success. If state is accepted but alarm
  reconciliation fails, the removal remains authoritative and a localized warning
  offers exact Undo. Pending state blocks duplicate confirmation, Escape, close,
  and scrim dismissal while retaining the dialog's Tab trap and `aria-busy`
  feedback. Browser Back/Forward and programmatic route changes restore or retain
  the reviewed route while that receipt owns the foreground, including a recheck
  after an active detail editor blurs.

  Group rows, Space menus, and Calendar reminder menus now carry stable reminder
  IDs into the same destructive controller, including keyboard context-menu entry.
  If a captured menu entry no longer resolves after current state is adopted, the
  action refreshes the surface, explains the stale reminder in localized copy,
  and returns focus through the current owner fallback instead of disappearing
  silently.
  The existing responsive reminder dialog opens with exact destructive focus and
  returns focus after success to the next reminder, previous reminder, or stable
  owner control; cancel returns to the opener. English and native zh-TW copy reuse
  the established dialog, typography, spacing, control, color, focus, theme, and
  reduced-motion system without a new layout or ornamental motion.

  A fresh bundled-Node Playwright shim rendered the current source at 1280×720 and
  800×720, including zh-TW, dark theme, and reduced motion. The dialog remained
  bounded with destructive focus. A deferred receipt kept it open and `aria-busy`,
  blocked Escape, then closed only after resolution, focused the surviving reminder,
  and exposed Undo; no console or page errors were captured. All 28 JavaScript
  syntax checks, the quality gate, all 20 contract scripts (21 deterministic
  checks total), the 10,000-schedule concurrency run, and `git diff --check` pass.

  This is **Implemented: yes; Verified: partial (targeted production-extracted
  deterministic/static evidence plus shim-rendered Chromium evidence);
  User-validated: no; Released: no**. The shim is not an installed MV3 extension
  and does not establish real Chrome storage/alarm, cross-window or service-worker
  lifetime, notification delivery, screen-reader output, or representative-user
  behavior. No schema, import shape, permission, host access, stable element ID,
  local-only boundary, or feature breadth changed.
- **2026-07-26 — Keyboard-visible first-save recovery** — made the saved tab title
  the row's native, localized primary Open control instead of handing keyboard
  focus to a generic card before an opacity-hidden action strip. The acknowledged
  Welcome save now reaches that primary control through `focusItem()`, and Board
  Arrow navigation uses the same target. Enter and Space retain native button
  activation. Details, Open, and Archive icon controls have title-specific English
  and native zh-TW accessible names and become visible on `:focus-within` as well
  as hover without changing card geometry.

  Saved-address activation now passes through one allowlisted URL guard. Missing,
  malformed, `javascript:`, extension, and other unsupported addresses remain
  focusable as explicitly unavailable actions and create no browser effect or
  state change; a rejected real tab-open request reports a localized error without
  a success claim. Whitespace-only stored titles fall back to the displayed address
  or localized Untitled copy without rewriting imported data.

  The saved-tab context menu now shares that keyboard boundary. Shift+F10 and the
  Context Menu key anchor the menu to the direct primary action, move focus to its
  first item, and restore the primary action before a command runs. Board-visible
  Open, background Open, Copy URL, Edit title, Favorites, Read Later, and Archive
  commands use English and native zh-TW copy. Clipboard success is reported only
  after an acknowledged write; denial reports a localized error. Edit title no
  longer uses a native prompt: it opens the existing receipt-gated item-detail title
  field, returns focus to the rebuilt primary action on close, and retains the same
  route/back/reload semantics as ordinary detail recovery. Metadata toggles restore
  the rebuilt card; Archive advances to the next/previous item or visible Group
  control. The legacy color and direct reminder pickers stay out of this core menu;
  receipt-gated reminder editing remains available in Details.

  The audit also closed hierarchy/visibility regressions before verification.
  Primary lookup is restricted to the card's direct action, so focusing or
  Arrow-navigating a Stack never dives into a nested saved tab. Focused Group
  routes request a render-only expanded column, hide collapse interactions there,
  preserve the saved board collapse preference, and use a visible More control as
  the context-menu and post-render identity focus fallback. Detail close prefers
  the rebuilt direct primary
  action before the legacy card fallback. Programmatic reveal no longer imposes
  smooth scrolling.

  All 28 JavaScript syntax checks, all 21 deterministic suites, quality gates, and
  `git diff --check` pass. The expanded onboarding and Group/Stack identity suites
  extract and exercise the URL guard, browser-effect delegation, primary focus
  target, first-save handoff, nested-Stack boundary, trimmed-title fallback,
  focused-Group expansion and visible post-render focus, direct detail-return
  selector, keyboard/pointer context-menu anchoring, first-item/opener/post-mutation
  focus, clipboard success/failure receipts, prompt removal, detail-title initial
  focus and guarded detail Open, locale parity, and keyboard-visible CSS. This is
  **Implemented: yes; Verified: partial (production-extracted deterministic and
  static-source evidence only); User-validated: no; Released: no**. Installed
  Chrome tab creation/failure, real screen-reader output, rendered pixels in
  light/dark and English/zh-TW, 1280×720/800 px behavior, browser zoom, and
  representative-user recovery remain unverified. No schema, import shape,
  permission, host access, stable element ID, local-only boundary, or feature
  breadth changed.
- **2026-07-24 — Recoverable ask-every-time-off quick capture** — replaced the
  single-tab quick capture's generic timed confirmation and automatic popup close
  with the existing compact result card. A valid accepted state receipt now leaves
  the source tab open and names the authoritative current Space, Group, and saved
  title. The primary action is **Open saved item**. The secondary action is
  **Close tab** only when close-after-save is configured; otherwise it is **Close
  popup**. There is no timer, toast, modal, notification, or forced navigation.
  State rejection, timeout, lost acknowledgement, malformed acknowledgement, or
  otherwise unknown state acknowledgement runs no quick-capture browser effect.

  The popup's state write carries primitive saved-item and source identity and
  accepts only a strict `quickCaptureResult`. Open and Close are separate service-
  worker-owned `locus-complete-quick-capture` actions. Each action fresh-reads
  authority and resolves exactly one active item at the expected URL plus one owning
  Space still in the original Workspace. A move or rename inside that Workspace is
  valid and returns current names; a missing, duplicated, archived/trashed, or
  moved-out target is unavailable. Open reuses or creates the encoded
  `/home?item=<id>` route, activates its exact tab, focuses its window, and confirms
  that the current or pending URL still matches. When source close is requested, the
  worker also requires the exact saved URL and source tab/window/current URL,
  rejects a different pending URL, and protects a source that changed from inactive
  to active. It fresh-reads the route after focus and again after source validation
  immediately before removal. Route mismatch, an unconfirmed route, a protected
  source, or an unconfirmed source fails closed. The small unavoidable interval
  between the last browser read and its effect remains an installed-runtime risk.

  A known destination failure retains the accepted save without claiming Open or
  Close. An unexpected worker failure returns typed `effectUnknown`, keeps the safe
  Open identity, disables destructive Close, and leaves the source available for
  human confirmation. Focus enters the result primary; Tab reaches the secondary;
  before either action, Escape closes only the popup and requests no source close.
  English and native zh-TW names, reduced-motion behavior, `100dvh` sizing, and
  compact rules at 520 px height or less are retained.

  All 28 JavaScript syntax checks, all 21 deterministic suites, the popup contract
  line, quality gates, and `git diff --check` pass. This is **Implemented: yes;
  Verified: partial (production-extracted deterministic, static-source, and mocked-
  browser evidence only); User-validated: no; Released: no**. Installed popup
  teardown and message-port/service-worker lifetime, actual tab activation/removal/
  focus, the final check-to-effect race, real scrolling at 520 px or less, pixels,
  keyboard and screen-reader behavior, light/dark, English/zh-TW, reduced motion,
  1280×720/800 px layouts, reload/history, and representative-user completion remain
  unverified. This does not change the asked ordinary Save/Locate path. No schema,
  import shape, permission, host access, stable element ID, local-only boundary, or
  feature breadth changed.
- **2026-07-24 — Durable whole-window popup receipt and recovery** — replaced the
  whole-window save's 900 ms toast and timed popup close with the existing compact
  in-section result. Links-only, session-Group, and reading-queue saves first await
  the ordinary revisioned `locus-state-write` receipt. Only a valid accepted
  receipt permits the popup to dispatch a second worker-owned
  `locus-complete-window-save` request carrying primitive Workspace/Group/source-
  window identity plus unique local `{ tabId, expectedUrl }` source descriptors.
  Rejected or acknowledgement-unknown state dispatches no
  close effect. The completion worker fresh-reads authority, requires one globally
  unique receiving Group with one owning Space still inside the original
  Workspace, and only then considers source effects. Missing, duplicated,
  moved-out, or otherwise ambiguous destinations close nothing. The completion
  listener holds the central state FIFO and optional Web Lock from that fresh
  resolution through source removal, so another Locus mutation cannot change the
  receiving graph mid-effect. A valid close
  request checks each requested tab is still in the recorded source window, still
  inactive, still at its captured URL, and not redirecting to another URL
  immediately before removing it; that expected URL must also remain recursively
  present in the exact receiving Group. Malformed or duplicate descriptors, moved
  tabs, newly active tabs, navigation, redirects, and content removed from the
  receiving Group stay open or count unconfirmed. The
  typed receipt returns exact
  requested, closed, and unconfirmed counts plus the authoritative current Space
  and Group names, including after an in-Workspace move or rename. If the
  completion receipt itself is lost, timed out, malformed, or internally
  inconsistent, the
  accepted save remains and the result labels the destination and every requested
  close outcome unconfirmed instead of manufacturing a no-close claim. The popup's
  active tab intentionally stays open so the localized receipt can name what was
  saved, the exact Space / Group destination, whether original tabs stayed open,
  and any partial close outcome.

  The receipt offers **Open destination** without forcing navigation. A separate
  worker request fresh-resolves the same Group, reuses or creates its encoded
  `/ws/<workspace>/group/<group>` route, and activates and focuses that exact tab.
  If activation fails, the popup retains destination identity and every retry asks
  the worker to fresh-resolve and reuse the exact route instead of directly
  activating a remembered tab. A route that navigates during activation is not
  accepted as success. A disappeared destination degrades to Open Locus with
  explicit accepted-save copy; transport and activation trouble remain retryable
  in the polite result status. A valid first-use Group recovery route suppresses
  automatic Welcome without marking it seen.

  Popup subviews now use a true last-opened-first-closed section history:
  nested destination picking returns to the exact prior save/hibernate/More
  section, Back and Escape restore the last visible opener, and deliberate recovery
  resets cannot focus a hidden Back control. Save-mode radios use one roving Tab
  stop. The save-options radiogroup, custom tag field, and optional note field have
  localized English and native zh-TW accessible names, and the close choice now
  truthfully says **Close other tabs after saving** / **儲存後關閉其他分頁**. The
  result primary is described by the destination, saved-content summary, and source
  outcome rather than its short button label alone.

  Production-source quality gates require a valid state receipt before completion
  dispatch, completion serialization through the central FIFO/Web Lock, recursive
  saved-URL membership plus per-tab source-window confirmation before removal, and
  popup delegation to the typed result. The expanded production-extracted popup-
  Locate contract passes all three modes, duplicate-only note/no-note behavior,
  receipts, exact identity, URL-safe source recovery, destination routes, LIFO
  focus with unusable-opener fallbacks, accessible semantics, and English/zh-TW parity.
  This is **Implemented: yes; Verified: partial (production-extracted deterministic,
  static-source, and mocked-browser evidence only); User-
  validated: no; Released: no**. Installed action-popup teardown/message lifetime,
  real tab removal/activation/focus, pixels, screen-reader output, themes/locales,
  reduced motion, 1280×720/800 px behavior, reload/history, and representative-user
  activation remain unverified. Popup teardown before completion dispatch has the
  deliberate safe-open outcome—accepted data can remain saved while source tabs
  stay open—but that real message-lifetime path is not installed-verified.
  Ask-every-time-off quick capture still lacks an
  equivalent explicit continuation. No schema, import shape, permission, host
  access, existing stable element ID, local-only boundary, or feature breadth
  changed.
- **2026-07-16 — Receipt-gated popup Open-in-Locus continuation** — added an
  explicit, default-off “Open saved item in Locus” / “儲存後在 Locus 開啟項目”
  choice to the single-tab destination picker. The selected action carries only
  primitive Workspace/item/source-tab identity on the same revisioned
  `locus-state-write` request as the saved item. This original combined-request
  boundary is superseded by the 2026-08-03 entry above. At this earlier boundary, after state acceptance, the service
  worker fresh-reads authority, requires one globally unique active item and one
  unambiguous owning Space still inside the original Workspace, creates its
  existing `/home?item=<id>` route inactive in the source popup window, attempts
  the configured source close, activates the route, and focuses that window. A known
  resolver or route-create failure remains an accepted save, leaves the source
  open, and shows an
  in-section localized partial-success result; source-close or activation trouble
  retains the already-created route and uses a localized browser notice. An
  activation failure also returns that exact route-tab identity, so the popup retry
  switches to the saved item instead of creating a duplicate generic tab; failed
  retries announce in the existing polite status region. Fallback notifications
  carry and reopen that same route-tab identity. Combined close-and-activation
  failure copy retains both outcomes. Rejected
  state creates no route and closes no source. Popup persistence now has the same
  bounded unknown-ack timeout and late missing-receiver retry closure as new-tab;
  every ambiguous transport rejection, including native-coded and non-object
  failures, becomes an unknown acknowledgement, while unknown/protocol/invalidated-
  queue outcomes require reopening before another capture. Pending
  actions own Back, Escape, Ctrl/Cmd+K, and competing controls. A valid Home-detail
  boot is no longer covered by calm Landing or automatic Welcome, without marking
  onboarding seen. The production-extracted popup Locate contract covers state→
  effect ordering, exact/moved/nested identity, stale/duplicate/stored/moved-out
  rejection, URI round-trip, source-window create/focus, create/close/activate and
  combined partial failures, rejected/unknown receipts, exact-tab activation and
  notification retry, retry live status, semantic recovery/focus hooks, en/zh-TW
  parity, and overlay
  suppression. The complete deterministic gate passes, including 10,000 concurrency
  schedules. This is **Implemented: yes; Verified: partial (production-extracted,
  static, and mocked-browser evidence only); User-validated: no; Released: no**.
  Installed popup teardown/message lifetime, real tab effects, pixels, screen-reader
  output, themes/locales, reduced motion, 1280×720/800 px behavior, reload/history,
  and representative-user activation remain unverified. Ask-every-time-off quick
  capture and whole-window save still lack an explicit recovery continuation. No
  schema, import shape, permission, host access, existing stable element ID, local-
  only boundary, or feature breadth changed.
- **2026-07-16 — Receipt-gated item-detail reminder/alarm ordering** — routed
  saved-item detail Set, Change, quick choices, and Clear through
  `commitItemDetailReminderMutation()`. Each action carries the primitive rendered
  item/route context, exhaustively re-resolves one unchanged target, preserves
  imported reminder fields outside the editor's owned schedule/delivery fields,
  takes one localized snapshot, and issues exactly one
  `State.persistNow({ reconcileReminders: true })` request. Missing, duplicated,
  moved, replaced, retyped, or concurrently changed targets fail closed before
  history, mutation, persistence, alarm work, close, or success.

  The central `locus-state-write` protocol now accepts the optional reminder intent.
  The service worker first commits the revisioned candidate, then awaits its
  serialized full alarm reconciliation and returns the structured result in the same
  typed receipt. This removes the page-teardown gap between acknowledgement and a
  second page-owned reconcile message. A known writer rejection runs no alarm pass.
  A timed-out/lost unknown response retains the sole dirty graph behind recovery with
  no page follow-up, picker close, render, or false success; an already accepted
  worker transaction may still have completed its bundled alarm effect. If state is
  accepted but the alarm API reports a
  failure, the accepted reminder remains and the picker closes to a localized
  warning with a direct Undo action.

  A synchronous reminder token joins the item-detail pending boundary before history
  or live mutation. It blocks duplicate actions, picker/detail close, navigation,
  other detail edits, and app-wide shortcuts while keeping Tab contained and usable.
  Recovery remains the top layer; otherwise Escape closes the reminder before the
  detail, and completion returns focus to the rebuilt Set or Change control. The
  picker's polite status sits outside its `aria-busy` body, exposes pending/error
  tokens and invalid-time semantics, and uses English plus native zh-TW copy.

  The production-controller/static item-detail contract covers Set/Change/Clear,
  strict snapshot→write→alarm-result→close/render/focus/feedback order, imported-
  field preservation, duplicate/stale targets, rejected and unknown receipts,
  accepted-state alarm warnings, pending/non-pending keys, recovery precedence,
  focus, live/busy structure, locale parity, and responsive/theme hooks. The
  background mocked-browser contract additionally proves storage acceptance before
  alarm-map access and structured success/failure receipts; the complete
  deterministic suite passes. **Implemented: yes. Verified: partial (deterministic
  production-controller/static-source and mocked-browser evidence only). User-
  validated: no. Released: no.** Installed Chrome message-port/service-worker
  lifetime, real alarm creation/cleanup, teardown/reload/Back/Forward, notification
  scheduling, screen-reader output, light/dark and en/zh-TW pixels, reduced motion,
  1280×720/800 px behavior, and representative-user comprehension remain
  unverified. Those non-detail item and Group/Space reminder mutation entries were
  later receipt-gated; installed reminder evidence is current queue item #5. No
  schema, import shape, permission, host access, local-only boundary, stable element
  ID, or feature breadth changed.

- **2026-07-16 — Receipt-gated direct saved-item detail fields** — routed title,
  URL, task state/text, saved context, cover, tags, checklist, and custom fields
  through one `commitItemDetailMutation()` controller. Each rendered sheet captures
  primitive Workspace/Space/Group/Stack/item identity plus exact route, location,
  value, type, ancestry, and object-reference fingerprints. Confirmation
  exhaustively re-resolves one current target across the whole graph. Missing,
  duplicated, moved, replaced, retyped, concurrently changed, or ambiguously owned
  records fail closed before history, mutation, persistence, or render.

  Field logic first runs against a detached JSON candidate, so a synchronous field
  failure leaves the live graph and Undo history untouched. A real change creates
  one snapshot, applies only the candidate diff to the sole dirty local graph, and
  awaits exactly one `State.persistNow()` receipt. The sheet exposes localized
  Saving, Saved, stale, and failure feedback through a polite live status; its body
  is `aria-busy`, and mutation controls are guarded while pending. A synchronous
  pending token blocks a second edit, sheet close, and programmatic or browser
  history changes while Tab remains usable inside the sheet. An initial editor
  Escape may blur and focus the stable panel; later Escape is consumed until the
  receipt settles. A blur-started pagehide transaction owns the one write, so
  teardown does not start a duplicate fallback write.

  Only an acknowledged receipt may render the board/detail sheet, refresh the
  heading, or report success. Rejected and unknown receipts keep the dirty local
  graph behind authoritative recovery with no retry, rollback, lower-surface
  render, or false success. The production-controller/static contract covers the
  deferred receipt, one-snapshot/one-write boundary, accepted/rejected/unknown
  outcomes, existing-recovery refusal, detached-candidate throw, changed-slot and
  imported-data preservation, stale-target matrix, executable pending controls,
  duplicate-edit refusal, pending history/Escape/pagehide behavior, structurally
  separate live/busy regions, localized status, and responsive/theme-token CSS.
  The direct-field wiring
  covers exactly title, URL, task state/text, saved context, cover, tags, checklist,
  and custom fields. **Implemented: yes. Verified: partial (deterministic
  production-controller/static-source evidence only). User-validated: no.
  Released: no.** Installed Chrome persistence/recovery, actual
  Back/Forward/reload/pagehide completion, screen-reader announcements, themes,
  en/zh-TW pixels, reduced motion, 1280×720/800 px behavior, and representative-
  user comprehension remain unverified. Item-detail reminder Set/Change/quick/Clear
  is covered by the newer state→alarm receipt entry above. Stack identity remains
  under the separate acknowledged identity
  editor; Archive and the Open browser effect are also outside this transaction.
  No schema, import shape, permission, host access, local-only boundary, stable
  element ID, or feature breadth changed.

- **2026-07-16 — Home saved-item recovery** — replaced the inert,
  hover-reactive Inbox and recent-Space preview rows with full-width native
  buttons that name the real saved link, note, task, Stack, or fallback item in
  English and native zh-TW. Activation retains only primitive Workspace/origin/
  item identity, then re-resolves exactly one current item across the active graph
  plus one owning Space. Missing, globally duplicated, ambiguously owned, or
  moved-out-of-Workspace records fail closed with localized feedback, no route,
  no history snapshot, and focus left on the invoking row. Items moved within the
  Workspace open from their current real location.

  A successful preview now uses the canonical `/home?item=<id>` route and shared
  item-detail sheet over Home. It does not select the owning Space, initialize or
  render Canvas/another Advanced layout, or turn inspection into a state write.
  Home item routes survive reload and Back/Forward, normalize duplicate or stale
  IDs closed, and keep the prior active Space intact. Opening and closing pass
  `persist: false`; browser history compares only durable route selections before
  writing, so an ephemeral Home sheet open/close remains read-only while a real
  Workspace/Space/layout selection still persists. Escape closes only the sheet.
  Rebuilt focus first targets the exact Inbox/Space preview origin, then a current
  native Home row for an item that moved, then the existing item/heading fallback.
  Hover, focus-visible, and pressed states share the established background,
  outline, theme, forced-color, and reduced-motion system without ornamental
  movement.

  The production-helper/static contract covers native click and Enter/Space
  semantics, `/home?item` build/parse/current/apply/close, global and owning-Space
  identity ambiguity, nested Stacks, stale/moved records, zero-write open/close/
  Back/Forward, durable-selection persistence, active-Space and Canvas isolation,
  exact and moved-row focus, locale parity, and responsive CSS. All 27 JavaScript
  syntax checks, quality gates, and the complete deterministic suite pass,
  including the 10,000-schedule concurrency corpus. **Implemented: yes. Verified:
  partial (production-helper/static-source contracts only). User-validated: no.
  Released: no.** No schema, import shape, permission, host access, local-only
  boundary, or stable element ID changed. Installed Chrome pixels and behavior at
  1280×720/800 px, real Back/Forward/reload, actual screen-reader output, themes,
  en/zh-TW layout, reduced motion, persistence observation, and representative-user
  comprehension remain unverified. Direct-field detail receipt gating is covered
  above; item-detail reminder/alarm ordering is covered by the newer entry above.
  Popup post-save Locate continuation and installed first-use validation are now
  queue item #2.

- **2026-07-16 — Receipt-gated Duplicate Group** — routed Board, Canvas/focused-
  Group, List More, and List context-menu actions through the shared localized
  identity dialog. Opening creates only a review draft, selects its localized copy
  name, preserves an intentionally edited name/symbol/color across source changes,
  and requires a second confirmation when the exact source graph or destination
  Space name changes. Missing, duplicate, moved, or inactive targets fail before
  history; unavailable fields move focus to an enabled exit unless fail-closed
  recovery owns the foreground, and rejected actions recover from detached menu
  openers. English and native zh-TW update untouched generated names live and use
  Group/`群組`, Space/`空間`, Create copy/`建立副本`, browser-neutral recovery copy,
  and wrapping narrow-dialog descriptions.

  Confirmation deep-clones the complete JSON-compatible Group, preserves reminder
  and imported/custom data, and assigns fresh Group/item/Stack IDs recursively from
  one bounded allocator. That allocator reserves active, Archive, Trash, restore,
  capture, size, and Canvas identifiers. The copy is inserted after its source,
  receives detached legacy/current sizing records, and gets a non-overlapping
  Canvas position computed by the production placement helpers from per-Group
  footprints. Null current records fall back to valid legacy widths like the
  renderer, and unsized columns reserve the 60vh cards cap plus column chrome at
  the current viewport height. One localized
  snapshot and one awaited `persistNow()` receipt own the whole mutation; pending
  state keeps a guarded primary focus anchor, while rejection retains the single
  dirty graph behind recovery without retry, render, close, reconciliation, or
  success feedback. Acknowledgement alone renders, closes, focuses the copy,
  exposes exact-action Undo, and requests reminder reconciliation. Focused-Group
  actions route to the copied Group without a second state write, so Back can
  return to the source. Browser history closes an uncommitted draft before applying
  its route; while a receipt or recovery owns the foreground, it preserves the
  reviewed route without another graph write. Recovery is shown and focuses Reload
  in the same rejection turn. Duplicate, Undo, and Redo reconcile alarms only after
  their state receipts; delayed failures expose exact Undo only while that copy is
  still the latest action, otherwise they use generic recovery guidance.

  The production-controller/static contract covers every entry, cancellation,
  stale review, recursive collision streams, custom/reminder preservation,
  partial legacy/current Canvas sizing, delayed/rejected receipts, focused-Group
  routing and history interlock, production Canvas non-overlap, alarm ordering,
  stale-warning suppression, locale changes, recovery focus,
  responsive wrapping, forced colors, and reduced motion; the complete
  deterministic gate passes. **Implemented: yes. Verified: partial (production-
  controller/static-source contracts only). User-validated: no. Released: no.**
  No schema, permission, host access, import shape, local-only boundary, or existing
  stable element ID changed. Installed browser persistence/recovery rendering,
  live alarm creation/cleanup, actual screen-reader output, themes, en/zh-TW
  layout, 1280×720/800 px pixels, reload/Back/Forward, and representative-user
  trust remain unverified. Generated-Group/direct-prompt/terminology residue stays
  in queue item #4.

- **2026-07-16 — Receipt-gated existing-Space Group move** — replaced the Board
  menu's flat, immediate destination mutations with one shared localized action
  across Board, Canvas/focused Group, and both List menus. The existing organization
  dialog now presents a required, scroll-bounded radiogroup with no preselection;
  duplicate names receive deterministic Workspace-order qualifiers, arrow/Home/End
  and Enter/Space only choose a draft, and a separate confirmation remains required.
  The controller captures primitive IDs, re-resolves one active Workspace plus
  unique source Space, destination Space, and Group targets, refuses missing,
  duplicate, moved, same-Space, cross-Workspace, and inactive-Workspace state before
  history, and requires a second confirmation when displayed names, destination
  order, or Group counts change. Concurrent nested content moves as the current
  exact Group object. One localized snapshot covers the source-to-destination
  append, source Canvas-position transfer, exact remembered-capture repair, and
  exact Archive/Trash item restore-reference repair while leaving the active source
  Space, unrelated layout/settings records, and outside selections unchanged. The
  confirm control remains the sole guarded focus anchor while one `persistNow()`
  receipt is pending. Only acknowledgement prunes moved hidden selections, renders,
  closes, scrolls/focuses the destination Space, reports localized success, and
  exposes exact-action Undo; rejection leaves the one dirty graph behind recovery
  with no retry, rollback, render, close, focus claim, or false success. Cancel,
  Close, outside click, and Escape make no write and restore the exact More/toggle
  opener. English and native zh-TW use Space/`空間`, Group/`群組`, Move/`移動`, and
  the shared typography, spacing, 44 px control, radius, elevation, light/dark,
  forced-color, reduced-motion, 32 px gutter, 720 px height, and 520 px wrapping
  system. A production-controller/static contract covers entry convergence,
  keyboard/radiogroup behavior, stale/duplicate/cross-scope guards, exact graph and
  reference mutations, delayed/rejected receipts, selection timing, focus,
  localization, and responsive hooks; the complete deterministic gate passes.
  **Implemented: yes. Verified: partial (production-controller/static-source
  contracts only). User-validated: no. Released: no.** No schema, permission, host
  access, import shape, local-only boundary, or existing stable element ID changed.
  Installed Chrome persistence/recovery rendering, actual screen-reader output,
  themes, en/zh-TW layout, 1280×720/800 px pixels, reload/history, and
  representative-user trust remain unverified. Duplicate Group is covered above;
  generated-Group/direct-prompt/terminology residue remains queue item #4.

- **2026-07-16 — Receipt-gated Group and Stack identity editing** — converged
  explicit Group create/edit on empty Space, Board, List, and focused Group
  surfaces plus Stack create/edit on Board, List, detail, and selected-item batch
  creation on one localized identity dialog. The controller stores primitive IDs,
  re-resolves unique Workspace/Space/Group/item/ancestor targets, permits duplicate
  display names, rejects blank names and ID collisions, preserves imported custom
  or missing symbols/colors and untouched raw names, and requires review after a
  concurrent identity change. Batch creation validates the exact stable-ID
  selection, rejects ancestor/descendant and cross-Space sets, keeps every item in
  place until confirmation, and moves document-order records into the first
  selected item's Group as one transaction. A success takes one localized snapshot
  and waits for one `State.persistNow()` receipt before rendering, closing,
  clearing selection, returning focus to the rebuilt target, or offering exact-
  action Undo. A rejected receipt leaves the dirty graph behind fail-closed
  recovery with no retry, rollback, render, close, or success claim. Group/Stack
  headers now use explicit keyboard controls rather than nested buttons or inline
  editors. The shared symbol picker has localized loading, no-match, and failure
  states; draft selection performs no write; Recent updates only at an owning save
  boundary; outside dismissal, Tab, and Escape return to the correct last-opened
  layer. The color radiogroup supports roving keys and a transient current-custom
  value without normalizing imported data. English and native zh-TW use Group/
  `群組`, Stack/`堆疊`, Add/`新增`, and Save/`儲存`. A production-controller/static
  contract covers entry convergence, exact graph mutations, stale/duplicate/moved
  guards, delayed/rejected receipts, missing/imported identity preservation, batch
  safety, focus/interlock ordering, live localization, and responsive/forced-color/
  reduced-motion hooks; the complete deterministic gate passes. **Implemented:
  yes. Verified: partial (production-controller/static-source contracts only).
  User-validated: no. Released: no.** No schema, stored/import shape, permission,
  host access, privacy boundary, or existing stable element ID changed. Installed
  Chrome persistence/recovery rendering, pixels, screen-reader output, themes,
  en/zh-TW layout, 1280×720/800 px behavior, reload/history, and representative-
  user trust remain unverified. Duplicate Group is covered above; generated-Group,
  remaining prompt, and terminology residue are queue item #4.

- **2026-07-16 — Receipt-gated workspace and Space creation** — routed the top-bar
  and workspace-manager Workspace actions, sidebar, Home defensive empty state,
  and command-palette Space actions through the shared localized naming dialog.
  The Group menu's “New Space…” action now creates the destination and moves the
  exact Group as one operation. The controller stores only primitive parent/source
  IDs, re-resolves them before mutation, permits duplicate names, refuses blank
  names and duplicate IDs, allocates against active/Archive/Trash graphs, and
  requires explicit review if the Group name changes concurrently. A new workspace
  seeds one real empty localized `Pinned`/`釘選` Space; no fake groups or saved items
  are introduced. Create-and-move preserves the Group ID, nested records, Canvas
  position, and remembered capture target. Each success takes one localized
  snapshot and waits for exactly one `State.persistNow()` receipt before render,
  feedback, focus, or exact-action Undo; a rejected or unknown receipt retains the
  dirty graph behind fail-closed recovery without retry or false success. The
  workspace manager now owns dialog semantics, scroll/interlock state, Tab/Escape,
  opener return, asynchronous selected-chip focus, keyboard-visible deletion, and
  height-safe/narrow styling. Context menus contain Tab and consume Escape so they
  close before the manager. Its duplicate browser-window save subsection and the
  old generic-modal/native-prompt creation routes are removed; the canonical Save
  eligible-tabs/window flow remains. English and native zh-TW use Workspace/
  `工作區`, Space/`空間`, and Group/`群組`. A production-controller/static contract
  covers every entry, graph identity, collision/stale guards, delayed/rejected
  receipts, atomic move, exact Undo, stale-name review, focus/keyboard layering,
  locale repaint, and responsive/forced-color CSS; the complete deterministic gate
  passes. **Implemented: yes. Verified: partial (production-controller/static-
  source contracts only). User-validated: no. Released: no.** No schema,
  state/import shape, permission, host access, privacy boundary, or existing stable
  element ID changed. Installed Chrome persistence/recovery rendering, pixels,
  screen-reader output, themes, en/zh-TW layout, 1280×720/800 px behavior,
  reload/history, and representative-user trust remain unverified. Duplicate Group
  is covered above; generated-Group/direct-prompt audits and lower-priority
  terminology/menu residue are queue item #4.

- **2026-07-16 — Receipt-gated workspace and Space renaming** — replaced the two
  reachable workspace and two reachable Space rename implementations with one
  localized, text-only Locus dialog. Workspace chips, workspace-manager cards,
  Home-card menus, and visible sidebar Space menus now pass stable IDs into the
  same controller; the hidden category-tab handlers and conflicting sidebar
  double-click rename are removed. Context menus are keyboard reachable from
  their visible anchors, and rebuilt targets carry stable datasets for verified
  focus return. The controller trims outer whitespace, reports blank names inline,
  treats an unchanged name as a no-op, permits duplicate names, and refuses
  duplicate IDs. It re-resolves the live entity and owning workspace before
  mutation; a concurrent rename refreshes the field for explicit review, while a
  missing or moved target becomes unavailable without a write. Confirmation takes
  one localized snapshot, mutates only `name`, and waits for one
  `State.persistNow()` receipt. Only an acknowledged write renders, reports
  success, and exposes that exact action ID through Undo. Rejection leaves the
  dirty graph behind fail-closed recovery with no retry, rollback, close, render,
  or success claim. Pending state disables draft/secondary actions while retaining
  one guarded `aria-disabled` primary focus anchor, and consumes Escape;
  otherwise Tab stays contained, Enter confirms from the field, Escape closes only
  this layer, outside-target shortcuts are suppressed, and Cancel or success
  restores the opener or a visible equivalent. Independent inert ownership leaves
  recovery authoritative, late-mounted roots inherit the interlock, and rename,
  delete, legacy-modal, and command-palette decisions cannot stack. English and
  native zh-TW use the public Workspace/`工作區` and Space/`空間` vocabulary; locale
  reapplication repaints title, validation, and pending copy without resetting the
  draft. The dialog reuses the shared type, spacing, radius, elevation, focus,
  light/dark, reduced-motion, forced-color, 32 px gutter, height-safe, and narrow-
  action system. A production-controller/static contract covers the four reachable
  paths, stable targeting, validation/concurrency, one-write receipt gating,
  failure recovery, exact Undo, focus, keyboard/interlocks, locale repaint, and
  responsive CSS; the complete static/deterministic gate passes. **Implemented:
  yes. Verified: partial (production-controller/static-source contracts only).
  User-validated: no. Released: no.** No schema, state/import shape, permission,
  host access, privacy boundary, or stable element ID changed. Installed Chrome
  write-failure rendering, pixels, screen-reader output, themes, en/zh-TW layout,
  1280×720/800 px behavior, reload/history, and representative-user trust remain
  unverified. Organization creation and Group/Stack naming are covered above;
  remaining generated/direct-prompt organization residue is queue item #4.

- **2026-07-16 — Empty-only workspace and Space deletion boundary** — routed the
  workspace chip, workspace manager, category tab, Home card, and sidebar Space
  through one localized Locus alert dialog instead of five native confirmations
  and direct state mutations. Before exposing Delete, the controller recursively
  audits groups, stack containers and descendants, plus category/group reminders.
  Any populated organization shows recovery guidance with Close as its only action:
  archive or move every group and remove remaining reminders; nothing is deleted.
  The visible Home-card and sidebar Space menus now reopen the first existing
  reminder through the localized edit/Remove flow instead of blindly adding another,
  so delivered and legacy multiple reminders can be cleared sequentially rather
  than dead-ending that guidance.
  Only empty structural shells may be confirmed, with copy naming the workspace/
  Space structure that changes, what remains unaffected, and the bounded recovery
  instruction to use Undo before that Locus page reloads or closes. It does not
  promise availability through intervening history changes. Last, duplicate, missing,
  and changed targets are refused or repainted; a newly populated target becomes
  blocked instead of honoring stale consent. Cancel/Close is initial focus, the
  independently owned interlock inerts every background root but the fail-closed
  recovery overlay, Tab is contained, Escape owns only this top layer even after
  programmatic focus loss, and global shortcuts plus lazy/programmatic command-
  palette opens cannot escape the decision.
  Context-menu actions preserve a visible opener; success verifies focus on the
  refreshed visible workspace manager or active Space. Locale reapplication repaints
  the live blocked, Space-specific, and pending states. Empty-shell confirmation
  disables both actions, announces pending state, and waits for `State.persistNow()`; only its
  receipt renders, reports success, and exposes the exact localized snapshot label
  through Undo. Rejection stays behind fail-closed recovery with no success,
  unlock, or durable render. Group menus now expose Archive only, removing the
  duplicate Delete alias, and the obsolete group-delete confirmation toggle is gone
  while its stored field remains inert for schema/import compatibility. English and
  native zh-TW copy share the existing modal, destructive, theme, narrow-width,
  focus, and reduced-motion system. Paired production-controller/static contracts
  cover occupancy, populated blocking, empty-only deletion, stale refresh, guards,
  cancel, pending/failure/success, Undo receipt, inertness, visible focus, Tab,
  Escape/shortcut containment, lazy palette interlock, live locale repaint, five
  entry points, and centralized mutation; the complete static/
  deterministic gate passes. **Implemented: yes. Verified: partial (production-
  controller/static-source contracts only). User-validated: no. Released: no.** No
  schema, permission, host access, state/import shape, archive format, or advanced
  surface changed. Installed pixels, real Chrome write-failure rendering, screen-
  reader output, themes, en/zh-TW layout, 1280×720/800 px behavior, the reload/close
  Undo boundary, and representative-user trust remain open.

- **2026-07-16 — Archive-first destructive recovery / P0-09** — removed the
  active saved-item “Delete permanently” bypass, leaving Archive as the single
  recoverable removal action before Archive → Trash. Trash single-row and batch
  deletion now converge on one localized Locus alert dialog that names the exact
  item or count, states what remains unchanged, and makes irreversibility explicit.
  Cancel is the safe initial focus; Tab stays contained; Escape consumes only this
  top layer; cancellation and stale entries are no-ops; and focus returns to the
  opener or the rebuilt Trash search. Confirm disables both actions, announces a
  busy state, and writes immediately through the central State writer. Only an
  acknowledged receipt clears in-memory Undo/Redo, rebuilds the surface/counts,
  and shows success; rejection uses the existing fail-closed recovery overlay
  without a success toast or durable render. The production-controller/static
  contract covers single/batch scope, duplicate/stale inputs, cancellation,
  pending/success/failure, focus, Tab, Escape, locale copy, modal/narrow/destructive
  styling, unique IDs, and absence of the active-item bypass; the complete
  static/deterministic gate passes. **Implemented: yes. Verified: partial
  (production-controller/static-source contracts only). User-validated: no.
  Released: no.** No schema, permission, host access, import shape, retention
  policy, or advanced surface changed. Installed pixels, screen-reader output,
  real Chrome persistence-failure rendering, 1280×720/800 px behavior, themes,
  locales, and representative-user trust remain open.

- **2026-07-16 — Saved-item recovery sheet** — replaced the former non-blocking
  item inspector with one route-backed modal recovery sheet across board, group,
  All Links/Favorites, and Read Later. Board and Library routes retain
  `?item=<id>`; group routes retain `/item/<id>`, so close stays on the source
  surface and Back/Forward/reload have a canonical state. Routed ids must still
  belong to that workspace/category/group or Library filter; moved and stale items
  normalize closed instead of borrowing the wrong context. The sheet names the real
  item and Space/group, gives saved links a primary Open action, and puts save
  context, Reminder, and Tags before progressive cover/checklist/custom-field
  metadata. It inerts the app background with independent detail/reminder/recovery
  owners, traps Tab from the focused dialog, applies two-step editor Escape, and
  flushes an active editor before route or page teardown. Page teardown replaces
  any focused editor and replaces the edit debounce with an immediate write
  attempt even when that editor already blurred; a late-mounted detail
  root inherits recovery/reminder owners that are already active. Nested layers
  retain precedence, and close restores the connected opener, same item, or board heading.
  Stale routes clear the sheet and only their owned inertness. All detail and
  reminder-dialog copy and control names exist in English and native zh-TW; narrow
  reflow and reduced-motion rules are retained. A new
  production-extracted/static contract covers routing, modal semantics, hierarchy,
  surface validation, immediate pagehide-write wiring, stacked and late-mounted
  inert ownership, focus/Escape
  behavior, locale parity, and responsive-motion
  source rules, and the complete static/deterministic gate passes. **Implemented:
  yes. Verified: partial (production-helper and static-source contracts only).
  User-validated: no. Released: no.** No schema, item shape, permission, import,
  host-access, or local-only boundary changed. Browser policy blocked the shim and
  installed integration is unavailable, so installed editing/persistence recovery,
  stale-item rendering, screen-reader output, themes, locale pixels, 1280×720/
  800 px pixels, browser history/reload, and representative-user recovery remain
  open.

- **2026-07-16 — Canonical save-first welcome / P0-12** — removed the hidden
  six-step preference questionnaire, unreachable spotlight tour, Calendar coach
  mark, tip toggle/reset controls, duplicate Reset onboarding menu action, native
  confirmation, hardcoded coach copy, and their CSS/Escape-stack residue. First run,
  Settings replay, app-menu Guide, and About replay now converge on one localized
  save-first dialog. Its controller exposes immediate focus plus distinct loading,
  eligible-tab, no-eligible-tab, query-error/retry, failed-save, and successful
  Inbox-handoff states; Escape stops before lower surfaces and restores the opener,
  including the Settings replay path. The new production-controller contract covers
  loading, newest eligible candidate selection, acknowledged close intent, empty,
  error/retry, failed persistence, Tab containment, Escape, opener return, Inbox
  navigation, saved-item focus, en/zh-TW copy, narrow/reduced-motion rules, unique
  active IDs, and absence of every removed path. The complete static/deterministic
  gate passes. **Implemented: yes. Verified: partial (production-controller and
  static-source contracts only). User-validated: no. Released: no.** No schema,
  permission, storage shape, import compatibility, capture writer, or advanced
  surface changed. The in-app browser loaded the unshimmed static DOM with no
  duplicate IDs or captured console errors, but browser policy blocked the shim and
  a static-state fixture; Chrome integration lacks its native bridge/profile.
  Installed tab capture/closure, pixels, screen-reader output, themes, locale layout,
  1280×720/800 px behavior, reload/history, and representative-user activation
  therefore remain open.

- **2026-07-16 -- Missing state-write receiver recovery / P0-04** -- new-tab and
  popup writers now retry only the exact `Receiving end does not exist` rejection,
  resending the same immutable candidate for at most three total attempts. A
  persistent absence leaves authoritative storage and local revision unchanged,
  returns `LOCUS_STATE_RECEIVER_UNAVAILABLE`, blocks queued new-tab edits behind
  recovery, and identifies the background service instead of reporting generic
  storage failure. A receipt timeout now closes the retry lifecycle, preventing a
  delayed no-receiver rejection from launching abandoned sends. For this typed
  failure only, the recovery button restarts the extension runtime so a stale
  unpacked service worker can be replaced; unsupported runtime reload falls back to
  the existing page reload, while conflicts and unknown outcomes remain page-only.
  Closed ports, lost responses, timeouts, conflicts, and other transport failures
  remain single-shot because their commit outcome may be unknown. Production-
  extracted contracts cover transient, persistent, and post-timeout receiver
  absence, both page clients, a channel closing after acceptance, the scoped runtime-
  restart action, and its fallback; the full static/deterministic gate passes.
  **Implemented: yes. Verified: partial (production-extracted deterministic message-
  failure and recovery-action contracts only). User-validated: no. Released: no.**
  No schema, permission, markup, style, or localized dictionaries changed. The
  supplied installed-Edge screenshot proves the pre-fix failure only; browser policy
  blocked inspection of the privileged `edge://newtab/` page, so post-fix installed
  service-worker wake/restart behavior and rendered recovery remain open.

- **2026-07-16 -- Local-calendar recurrence across time zones / P0-10** --
  daily, weekly, and monthly reminders now advance nominal local-calendar dates
  instead of carrying elapsed-millisecond or normalized `Date` drift. Their local
  wall time stays fixed across 23- and 25-hour days. A nonexistent spring-forward
  time, deleted civil date, or missing month-day is skipped to the next scheduled
  valid occurrence; a repeated fall-back wall time resolves to its first instant
  once; and malformed bounds fail closed. Service-worker reconciliation/alarm
  matching and new-tab pending projection use the same rule without mutating the
  stored recurrence. A production-extracted contract runs fresh processes in New
  York, Berlin, Taipei, and Apia: 21 recurrence cases, 37 background/display parity
  checks, two accepted first-fold alarms, two rejected second-fold alarms, four
  notified-alarm rejections, and 16 malformed-input cases pass with the complete
  static/deterministic gate. **Implemented: yes. Verified: partial (multi-process,
  production-extracted deterministic time-zone contracts only). User-validated:
  no. Released: no.** No schema, permission, markup, style, or localized copy
  changed. The managed-browser shim remains unavailable; installed Chrome alarm
  timing through sleep/restart and time-zone transitions, live operating-system
  time-zone changes, notification delivery, and rendered Past Due behavior remain
  open.

- **2026-07-16 -- Pending-reminder and one-shot Past Due policy / P0-10** --
  new-tab pending surfaces now exclude delivered (`notified`) records instead of
  counting or rendering them as active. An unresolved overdue one-shot retains its
  stored timestamp and remains in the Calendar Past due path with the existing
  open, reschedule/drag, clear, and remove actions. Because background restart
  recovery intentionally re-arms recurrence without writing state, a missed active
  daily/weekly/monthly series is now projected in badges, counters, editors, and
  Calendar at the same first future local-calendar occurrence used by the service
  worker; an expired series remains Past due. Projection is read-only, re-sorts by
  displayed occurrence, and preserves stable reminder IDs plus entity array indexes.
  The production-extracted DOM-free contract covers six pending cases, two resolved
  omissions, three recurrence-parity projections, two editor paths, Calendar
  enrichment, item badges, and five production wiring points; adjacent background
  and reminder-identity suites plus the complete static/deterministic gate are green.
  **Implemented: yes. Verified: partial
  (production-extracted deterministic state/display contracts only).
  User-validated: no. Released: no.** No schema, permission, markup, style, or
  localized copy changed. The managed-browser shim remains unavailable, so actual
  rendered Past Due interactions, installed restart/sleep/notification timing,
  mutation races, and DST/timezone behavior remain open.

- **2026-07-16 -- Stable group/category reminder identity / P0-10 + P0-08** --
  schema 12 adds a persistent ID to every active category/group reminder and to
  group reminders held in Archive or Trash. Migration repairs missing, invalid, or
  duplicate IDs; replace covers every numeric schema from 0 through 12, while merge
  repairs an older cloned payload even when the receiving graph is already current.
  Current-schema import rejects missing/duplicate reminder IDs. New alarms use the
  distinct `te-greminder2-` / `te-creminder2-` namespaces with encoded entity and
  reminder IDs; delivery resolves exactly one reminder by ID, so removing, inserting,
  or reordering a neighbor cannot retarget the event. Schema-11 index alarms remain
  usable until migration is authoritative and are then reconciled away. Already-
  notified, duplicate, removed, and same-index/same-time replacement events fail
  closed. The production-extracted contracts cover four new-tab mutations, three
  encoded/legacy name round trips, schemas 0–12 through 28 replace/merge cases,
  eight accepted background deliveries, five stale/malformed no-ops, and two explicit
  identity-mutation paths; the complete static/deterministic gate passes.
  **Implemented: yes. Verified: partial (production-extracted mocked-browser/state
  contracts only). User-validated: no. Released: no.** No permission, markup, style,
  or rendered copy changed. The documented shim remains unavailable in this managed
  browser, and installed restart/sleep/delivery, notification rendering, mutation
  races, one-shot Past Due policy, and DST/timezone behavior remain open.

- **2026-07-16 -- Fired reminder persistence and stale-alarm rejection / P0-10** --
  alarm delivery now verifies that `scheduledTime` still belongs to the current
  reminder before any side effect, so removed or rescheduled alarms cannot notify,
  write, or re-arm stale data. Item, nested-item, group, and category notifications
  are awaited before mutation; accepted deliveries advance through the central
  revisioned writer and then run full alarm reconciliation under the same stable
  alarm name. One-shots and the last occurrence allowed by `until` persist as
  notified without re-arming. If notification creation fails, state stays untouched;
  a rejected state write is not retried, leaves authority unchanged, and rebuilds a
  consumed recurring alarm from an authoritative read; quota uses the existing
  warning and other write failures add an update warning. A post-write
  reconciliation failure keeps the accepted next occurrence and adds a scheduling
  warning that opens Locus. The production-extracted contract covers six
  deliveries, two stale/removed alarms, and four failure paths,
  and the complete static/deterministic block passes. **Implemented: yes. Verified:
  partial (clock-controlled mocked-browser delivery only). User-validated: no.
  Released: no.** No schema, permission, or extension-page UI changed. Installed
  notification/delivery timing, service-worker termination, rendered one-shot Past
  Due behavior, group/category index-mutation races, and DST/timezone behavior remain
  open.

- **2026-07-16 -- Recurring reminder restart recovery / P0-10** -- reminder
  reconciliation now re-arms an overdue recurring item, nested item, group, or
  category reminder at its first future wall-clock occurrence. It skips missed
  occurrences without emitting catch-up notifications or mutating persisted state;
  overdue one-shots remain unscheduled for the in-app Past Due path, and recurrences
  beyond `until` remain expired. The production-extracted background contract starts
  with nine exact alarms, advances its clock eight days through the real startup
  listener, clears four newly stale one-shots, and retains five alarms by re-arming
  four daily/multi-day/biweekly/monthly series plus the subscription. Repeating the
  reconciliation is idempotent, preserves unrelated alarms, and injected create and
  clear failures return two structured operations without a false success, state
  write, mutation, or notification. The complete static/deterministic block passes.
  **Implemented: yes. Verified: partial (clock-controlled mocked-browser lifecycle
  only). User-validated: no. Released: no.** No schema, permission, or UI behavior
  changed. Actual installed-Chrome restart/sleep/delivery, fired-series persistence,
  the rendered one-shot Past Due policy, and DST/timezone behavior remain open.

- **2026-07-16 -- Import byte-limit and quota-sized rollback evidence / P0-05 +
  P0-08** -- extended the production-extracted export/import suite with four
  exact-byte large-file cases. A valid 20,971,520-byte backup, allocated from
  per-string chunks within the production validator limit, crosses FileReader,
  JSON parsing, normalization, and validation to reach one preview without
  mutating local or authoritative state. The same valid JSON plus one trailing
  byte is rejected before FileReader with visible size feedback and zero preview
  or write. A valid 10,551,296-byte file whose parsed graph remains above the
  10 MiB fallback storage quota reaches preview in replace and merge; one injected
  typed quota rejection then causes exactly one write attempt, local rollback,
  unchanged authority, recovery guidance, no reminder reconciliation, and no
  false success. Replace alone creates its safety backup. The full suite now has
  eight rejected-write cases, and the complete static/deterministic block passes.
  **Implemented: yes. Verified: partial (exact-byte deterministic browser-API
  model only). User-validated: no. Released: no.** No production, schema,
  permission, or UI behavior changed. Actual Chrome File/FileReader and preview
  behavior, real quota allocation, DOM-backed sanitization, alarm outcomes, and
  installed-browser round trips remain open.

- **2026-07-16 — Valid semantic import fuzz evidence / P0-05 + P0-08** —
  added a `0x51a7e5` fixed-seed corpus of 128 valid current-schema graphs spanning
  5,013 entities and 256 replace/merge cases. Coverage assertions require multiple
  workspaces, Spaces with no groups, empty groups/Archive/Trash, all item and stored
  entry kinds, nested stacks, every accepted URL family, Unicode and already-safe
  rich text, optional item metadata, active selections, restore references,
  canvas/column records, settings, and recent emoji. Every case crosses the
  production FileReader parser, validator, graph transforms, migration, and State
  writer with exact counts, identity-independent semantic equality, unique IDs,
  correctly remapped references/layout keys, replace-only imported settings, one
  authoritative write, and immutable parsed input. Two added generated-graph write
  rejections bring the suite total to six and preserve local rollback, unchanged
  authority, visible recovery, and no false success. The full static/deterministic
  block passes. **Implemented: yes. Verified: partial (fixed-seed deterministic
  browser-API model only). User-validated: no. Released: no.** No production,
  schema, permission, or UI behavior changed. Actual Chrome file/preview behavior,
  DOM-backed sanitizer transformations, quota/large-file limits, alarm outcomes,
  and installed-browser round trips remain open.
- **2026-07-16 — Numeric-schema import fixture matrix evidence / P0-05 +
  P0-08** — extended the production-extracted export/import contract through every
  supported numeric schema from 0 through 11, all six accepted app envelopes, and
  the raw legacy shape. Twenty-six schema/mode cases cross FileReader parsing,
  legacy normalization, validation, replace or merge, migration, and the page State
  writer. They preserve semantic records, exact counts, unique identities, stored
  restore destinations, schema-4/5 item fields, and schema-6–11 defaults. Replace
  reaches schema 11 and clears nonportable selected-tab IDs; merge rekeys without
  importing profile settings. Four injected write rejections cover current and raw
  legacy inputs in both modes, with local rollback, unchanged authority, visible
  recovery, and no success report. The full static/deterministic block passes.
  **Implemented: yes. Verified: partial (deterministic browser-API model only).
  User-validated: no. Released: no.** No production, schema, permission, or UI
  behavior changed. Semantic fuzz, actual Chrome files/previews, quota/large-file
  behavior, alarm outcomes, and installed-browser legacy/current round trips remain
  open.
- **2026-07-16 — Serialized export/import scale evidence / P0-08 + P0-09** — added
  a production-extracted deterministic suite spanning `exportJSON()`, the
  FileReader/JSON/validator boundary, current-schema migration, replace and merge
  application, and the page State writer. A 1,488,148-byte payload carries 1,024
  mixed top-level active records (1,536 items including stack children), 1,024
  Archive entries, and 1,024 Trash entries with exact counts and no portable
  `_revision`. Replace and merge preserve semantic content,
  entity cardinality, canvas/column metadata, and restore destinations; merge
  rekeys without collisions, while replace first downloads the exact portable
  current graph.
  Injected write rejection rolls both modes back, leaves authoritative storage
  unchanged, surfaces recovery, and reports no success. The suite is wired into
  `VERIFY.md`, both overnight command copies, and CI; the full static/deterministic
  block passes. **Implemented: yes. Verified: partial (deterministic browser-API
  model only). User-validated: no. Released: no.** No production, schema,
  permission, or UI behavior changed. Actual Chrome Blob/FileReader/download and
  preview behavior, real quota/large-file limits, complete legacy-schema coverage,
  and installed-browser round trips remain open.
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
| new_tab_landing_page.png (Jul 11) | Built 2026-07-12; removed 2026-11-07 (Just Today: Today is the only new tab) |
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

- Locus Index supersedes the owner-rejected Field Desk direction but is not yet
  owner-approved. Its current-source references cover light/dark Home, Welcome,
  detail, exact 800 px Home/Welcome, 560 px detail, and 420×590/420×520 popup without
  horizontal overflow. Those references use production CSS but are not installed
  runtime or real-data authority. The popup's genuine missing-extension-API error
  is verified only as a readable inert failure state. Installed loading, empty,
  success, receipt, browser effects, light/dark/zh-TW pixels, zoom, screen-reader
  output, and representative-user approval remain open. Welcome's current-source DOM now proves
  its exact filing-route structure, computed hierarchy, source/destination review,
  and pending-safe controller, but the real overlay stays hidden when localhost boot
  fails on unavailable extension storage. Browser policy rejected a synthetic visual
  preview and was not bypassed. Home's production source now ends its Trail → Inbox
  hierarchy with a compact Space register rather than the stale card collage, but
  that remains static/deterministic evidence. Saved-item Details now presents one
  complete filing docket and recovery-context hierarchy, but likewise has no
  installed pixel or assistive-technology pass. Search's current source now reads as
  an exact-location ledger rather than a three-column dashboard, but it likewise has
  no installed real-data pixel or assistive-technology pass. Queue item #2 therefore
  retains the installed Welcome → Inbox → Home → Search → Library → Details
  activation. Library's current source now keeps each real saved page in one filing
  record with an Open-first recovery hierarchy, but it likewise has no installed
  real-data pixel or assistive-technology pass. Settings now projects its eight real
  sections through one numbered control ledger with a bounded responsive hierarchy,
  but the unpacked headless render did not initialize and it likewise has no installed
  real-data pixel or assistive-technology pass. Board records, their reusable Group
  filing registers, and subordinate Stack sleeves across Board/focused/List now
  share the same flat hierarchy, real-color locators, 40 px action rhythm, and exact-
  target opener-aware menu models. Note and To-do cards now scan as read-only records
  and route editing into the same saved-item Details sheet. Its named marker field
  exposes an imported custom value truthfully without writing or normalizing it; the
  duplicate anchored palette and inline writers are removed. The Board family still
  has no installed real-data pixel or assistive-technology pass.
  Opened Tabs now extends that hierarchy as a live-source
  ledger with explicit loading/error/empty/no-match states, visible 40 px controls,
  named selection receipts, exact pointer/keyboard actions, and a working responsive
  drawer. Current-source 1280/800 geometry and a temporary light/dark state matrix
  are verified, but installed real-data pixels, Chrome effects, native locale/AT
  output, and representative-user approval remain open. Core typography now follows
  the selected font on new-tab and popup instead of forcing Lora, but installed
  preference persistence and populated-state wrapping remain unverified. The prior
  default-expanded rail concern was a false uninitialized-localhost artifact: current
  first-workspace creation sets `railCollapsed = true`, and this cycle deliberately
  left existing stored preferences, shortcut access, Escape order, and migration
  compatibility untouched. Home's 761–1100 px Trail now keeps Inbox visible as a
  compact two-row route in current-source references. At 900/800 px, the Space
  registry resolves to 188 px, Home fills the remaining main area, and a bounded
  310 px action lane prevents exact consequence copy from collapsing the reviewed
  tab; Inbox remains inside 720 px through 761. Installed real-data authority
  remains queue item #2. Board and command-palette local-record creation now wait for
  an exact destination receipt and open the accepted Details editor; dead inline-
  focus paths are removed. The shared action menu around those controls uses one
  localized flat sheet instead of blur, spring motion, and weak hover-only hierarchy.
  Browser policy rejected the local presentation reference before rendering and was
  not bypassed, so installed pixels remain queue item #2. Group footers now lead with
  Save here and contain Note, To-do, and Stack behind one exact-target Add-record
  menu; List reuses the same record actions inside More. Their two-track 200 px
  responsive hierarchy is mechanically verified, not installed pixel evidence. The
  Workspace extras now stay Available and inactive until an explicit opt-in. The
  next safe source slice is the queue-#1 capture-authority repair, not another
  product surface.
- Board/List selection and optional-detail discovery now use persistent native,
  localized controls with exact rebuilt focus. Their action surface is now one
  responsive Locus Index docket; Archive and Move freeze exact selected owners and
  destinations, await acknowledged persistence, and expose localized Undo/Open-
  destination recovery only after acceptance. Removed production-fragment light/
  dark references and deterministic/scale contracts are green. Installed real-data,
  navigation, browser-effect, forced-color, and assistive-technology evidence remains
  part of queue item #2.
- Every supported individual and selection Restore path for saved pages, Groups,
  notes, to-dos, and Stacks in the primary Archive and Trash ledgers is destination-
  explicit and receipt-gated; Trash rows retain their expiry countdown. Compact
  Search and the dormant Settings renderer route individual Archive entries to the
  exact primary review without mutation. Page/non-page and Group/local-item mixtures
  are disabled rather than bypassing their receipts. The legacy writer remains only
  for malformed or unsupported stored-entry types and must not be included in the
  supported Restore claim.
- **Installed reminder delivery evidence remains open:** item and Group/Space
  delivery now waits for the settle-once callback/Promise receipt before changing
  reminder authority. Deterministic item error/success and recurring Group success
  traces pass, but native notification timing, worker teardown, restart/sleep, and
  notification-center behavior are not installed-runtime evidence. A rejected
  native creation deliberately leaves state unchanged and adds no retry/outbox;
  recovery therefore waits for a later reconciliation boundary.
- Storage-quota, capture-failure, popup Locate, reminder-attention, and subscription
  notifications remain best-effort raw creates. None authorizes a following state
  mutation. Treat any compatibility convergence as a separate bounded slice rather
  than expanding the reminder-authority fix.

- Workspace and Space create/rename/removal, existing-Space Group move, explicit
  Group/Stack identity editing, and Duplicate Group are now centralized; populated scopes
  are blocked behind Archive/move guidance, empty structural deletion is receipt-
  gated, and group removal is Archive-only. Deleting a populated container remains
  deliberately unavailable until its Archive destination and structural restore
  semantics are defined. Settings → Paste links now uses a frozen exact destination,
  collision-safe allocation, and one acknowledged receipt before success.
  Context-menu/shortcut capture now uses exact destination, collision-safe ID,
  one-write, and source-revalidation boundaries. Its post-acceptance native
  receipt names a privacy-aware, length-bounded destination and fresh-resolves an
  exact stable-ID continuation. One conservative receipt is now confirmed before
  any source effect and updated in place afterward; creation failure keeps sources
  open, and callback-only create/update/clear completion is awaited. Installed
  rendering, notification accumulation, native callback/Promise behavior, real tab
  effects, and receipt survival/click delivery across worker teardown remain open.
  Popup/bookmark-generated Groups
  now allocate inside their exact receipt-gated destination, rich-text Link
  creation uses one localized exact-selection review, and Import/Explorer now
  present localized Workspace/Space/Group language without renaming internal
  schema fields. Queue item #4 is limited to a separately backed-up migration for
  ambiguous legacy direct-move hints.
  The removed legacy direct Group-move path may have left ambiguous orphan Canvas
  positions or stale capture/Archive/Trash restore hints in profiles that used it.
  The new transaction repairs only the exact current source tuple; retroactive
  cleanup needs a separately specified, backed-up migration because same Group IDs
  and several stale positions do not establish authoritative provenance.
  Native confirmations in contextual Advanced trackers are outside this core slice
  and must not be treated as polished or promoted behavior.
- Home now completes locate → recover through real saved-item previews. The sheet's
  direct title, URL, task, saved-context, cover, tag, checklist, and custom-field
  mutations share one acknowledged transaction; its reminder Set/Change/quick/Clear
  path uses a sibling exact-target transaction whose service-worker receipt owns
  state→alarm ordering. Group/Space/Calendar destructive reminder entry points now
  converge on one stable-ID controller whose centralized state receipt gates close,
  render, success, and Undo. Non-detail item reminders, Group/Space add/edit/
  reschedule, and Calendar Add-task now use their separate exact receipt-gated
  controllers; queue item #5 tracks installed reminder evidence rather than
  another page-level mutation implementation.
  The popup's asked single-tab flow
  now offers a worker-owned Open-in-Locus handoff into that same Home sheet.
  Whole-window save now retains the active popup tab for a worker-owned,
  destination-specific receipt and optional Group-route continuation. Ask-every-
  time-off quick capture now retains the source and reuses the same result language
  for exact saved-item Open and optional explicit source Close. Queue item #2 now
  tracks installed activation and recovery evidence rather than another popup
  implementation surface.
- Fresh installed-runtime verification is unavailable for the current worktree. A
  live Locus new-tab was present as the privileged `edge://newtab/` surface, but
  browser security policy blocked page inspection; the supplied screenshot
  establishes the pre-fix missing-receiver failure, not post-fix behavior. A fresh
  2026-07-16 check found Chrome installed but no configured browser-integration
  profile/native bridge. The in-app browser served the unshimmed localhost DOM with
  no duplicate IDs or captured console errors, but `chrome` was unavailable and
  browser policy blocked both the documented shim and a static-state fixture.
  A fresh 2026-07-29 supported-browser probe again exposed only the in-app browser,
  with no installed Chrome/extension control backend; the project rule against a
  raw-CDP or alternate-backend bypass therefore leaves the installed gate open.
   A 2026-08-02 receipt-slice probe found Chrome and Edge executables, but neither
   expected profile nor the native browser-control bridge in this task's user
   context; process inspection was also unavailable. No launch, repair, raw CDP,
   or alternate backend was attempted.
   A fresh 2026-08-09 supported Chrome diagnostic found Google Chrome installed
   but not running. The shared native-host manifest and registry entry are correct,
   while the ChatGPT browser-control extension is not installed in Chrome's
   selected Default profile; only the in-app browser is connected. No browser was
   launched and no alternate automation backend was used. The next installed gate
   requires enabling the ChatGPT browser extension through **Settings → Computer
   use**, then opening Chrome before retrying the unpacked Locus flow.
   Separately, bundled-Node Chromium shims render the current reminder-removal and
  Paste links source at 1280×720 and 800×720, including English/light,
  zh-TW/dark, reduced motion, exact focus, receipt-pending `aria-busy`/Escape
  interlocks, post-receipt focus/Undo, and Paste links reload persistence. These
  are useful current-source rendered checks, not active installed-extension passes.
  Installed MV3 behavior, CSP, local favicon loading, real storage/alarm and cross-
  window/service-worker lifecycle, notification delivery, screen-reader output,
  representative-user flows, and network silence still require an unpacked-
  extension pass in an environment that can load the candidate.
- Deterministic onboarding, item-detail, Trash-recovery, organization-removal,
  organization-delete, organization-naming, organization-creation,
  organization-move, Paste links, Group/Stack identity, import-recovery, archive-scale, export/import-scale,
  reminder-identity, reminder-overdue, reminder-timezone, background, Undo,
  freshness, popup-Locate, and concurrency
  contracts now cover legacy and
  every-level ID collisions, idless Archive entries, replace rollback/normalization,
  Home `/home?item` recovery with global/owning-Space identity checks, native
  activation, read-only open/close/Back/Forward, active-Space/Canvas isolation,
  exact and moved-row focus, and English/zh-TW interaction-state parity,
  accepted state before separate popup Locate dispatch, effect-unknown handling,
  delayed retry identity, authoritative exact/moved/nested
  re-resolution, stale/duplicate/stored/moved-out rejection, encoded Home-detail
  handoff, source-preflight then activate/focus/confirm-before-close ordering,
  post-activation source and final-route revalidation, typed accepted-save Locate
  failures, bounded popup receipt timeout, and Landing/Welcome deep-link precedence,
  receipt-gated item-detail reminder Set/Change/Clear with exact target/route
  identity, imported-field preservation, one combined state/alarm receipt, failure/
  warning distinction, duplicate suppression, nested keyboard/Escape/recovery
  ordering, rebuilt-control focus, and localized live/busy feedback,
  stable-ID Group/Space/Calendar destructive reminder removal with frozen context,
  harmless sibling reorder, stale/missing/duplicate/changed/moved fail-closed
  resolution, pre-existing-recovery preflight, one snapshot/write receipt, accepted-
  state alarm warning with exact Undo, pending interlocks, and next/previous/owner
  focus fallback,
  four reachable workspace/Space rename surfaces, six creation/create-and-move
  entries, and Board/Canvas/focused-Group plus both List existing-Space move
  entries through one stable-ID dialog,
  plus Board/Canvas/focused-Group and both List Duplicate entries through the
  identity dialog with draft-only open/cancel, whole-graph stale review, recursive
  fresh-ID allocation across active/stored/reference/layout keys, detached custom
  and reminder preservation, merged legacy/current Canvas footprints, one-write
  receipt gating, focused-Group routing without another state write, recovery-
  owned focus, and post-receipt alarm reconciliation for Duplicate/Undo/Redo,
  duplicate-name and duplicate-ID behavior, blank/unchanged/stale/moved targets,
  one-write acknowledgement, action-scoped Undo, failed-write recovery precedence,
  recovery-button keyboard activation, actual asynchronous workspace-chip focus
  completion, locale repaint, narrow/forced-color styling, and removal of hidden-
  tab and double-click rename duplicates,
  production-extracted import validation across 33 malformed boundaries and 128
  fixed-seed structural mutations,
  1,024-record single-item/whole-group/batch Archive and Archive-to-Trash restore
  transformations with exact ID preservation, plus injected-quota batch Archive
  and Archive-to-Trash failures that preserve both the dirty local graph and the
  unchanged authoritative graph through reload recovery,
  a 1,488,149-byte current-schema export with 1,024 top-level active records (1,536
  counted items), 1,024 Archive, and 1,024 Trash records through production
  serialization, validation, replace, merge,
  pre-replace backup, collision-free rekeying, and rejected-write rollback,
  all numeric schemas 0–13 across the six accepted app envelopes plus raw legacy
  through 30 replace/merge cases with versioned defaults, exact counts, and stable
  category/group/Trash reminder identity migration,
  128 fixed-seed valid semantic graphs spanning 5,013 entities through 256
  replace/merge cases with enforced coverage families and exact semantic equality,
  an exact 20,971,520-byte valid import reaching preview, a one-byte-over valid
  import rejected before FileReader, and two 10,551,296-byte replace/merge imports
  rolling back after injected typed quota rejection with no false success,
  post-import warning paths, an exact nine-alarm initial map, an advanced-clock
  startup reconciliation that clears four newly overdue one-shots and re-arms four
  recurring item/nested/group/category reminders without catch-up notifications,
  state writes, or mutation, and eight fired-delivery cases that persist item/nested/
  group/category recurrence plus stable-index and legacy-transition delivery, reject
  five stale/malformed alarms, and exercise notification, quota/generic storage,
  and post-write reconciliation failures, plus a central runtime-message case that
  persists before alarm-map access and returns structured reconciliation success or
  accepted-state scheduling failure in the same receipt,
  and a pending-reminder projection that keeps unresolved one-shots and expired series
  in Past due, excludes delivered records, and matches background daily/biweekly/
  monthly recurrence projection without mutating identity-bearing source entries,
  plus a four-zone production-extracted recurrence matrix covering 23/25-hour days,
  missing spring-forward wall times, repeated fall-back folds, missing month-days,
  Apia's deleted civil date, exact `until` behavior, background/display parity,
  immutable inputs, and stale second-fold rejection,
  plus no-retry
  capture conflicts and action-scoped Undo across pending capture, newer-edit interruption, restored
  history order, tab-open retry, persistence-failure recovery, central-writer conflict/failure
  recovery, immutable client candidates, queued-successor invalidation, overlapping
  popup/new-tab capture no-close behavior, clean/dirty external-state handling,
  no-op boot suppression, legacy settings normalization, authoritative failed-capture
  recovery, lost/timed-out receipt recovery, stale-read protection, delayed-event
  handling, invalid-token rejection, transient and persistent missing-receiver
  handling in new-tab and popup, post-timeout retry cancellation, scoped extension-
  runtime recovery with page fallback, ambiguous closed-port no-retry behavior,
  dirty ordinary-write preservation,
  browser-effect interruption, and 10,000 seeded lockless schedules.
  Static popup-window gates additionally require the page to dispatch the separate
  worker-owned completion only after a valid state receipt and each tab's source-
  window ownership to be confirmed before removal. Ask-every-time-off quick capture
  requires a valid accepted state receipt before showing its exact result and
  delegates Open/Close to the worker. Its matrix covers fresh exact-item/owner
  resolution, same-Workspace moves/renames, missing/duplicate/stored/moved-out
  rejection, source tab/window/current/pending URL and active-transition validation,
  encoded Home routing, two post-focus route reads around source validation,
  fail-closed protected/unconfirmed outcomes, and typed unknown effects. The
  expanded production-extracted popup-Locate contract passes the whole-window and
  quick-capture receipt, identity, URL-safe source recovery, exact destination,
  focus, and locale matrices.
  Remaining P0 gaps include the new-tab Save-all/existing-Group detached-target
  callers described in queue #1, plus installed cross-context/service-worker
  restart and unknown-ack lifecycle evidence,
  actual Chrome quota allocation, File/FileReader/preview behavior, and installed
  browser legacy/current import round trips, installed reminder state/alarm receipt
  teardown plus restart/sleep and delivery behavior, rendered one-shot Past Due
  behavior, installed item/group/category/Calendar mutation races under stable
  identity, installed alarm timing through time-zone
  transitions and live time-zone changes, installed-browser
  Archive/Trash quota and export/import
  recovery, and a complete
  unpacked-extension evidence bundle. Static and mocked contracts do not close
  those browser-runtime risks.
- New-tab freshness and failed-capture recovery are production-extracted and
  deterministic only. Installed Chrome must still establish actual
  `storage.onChanged` versus runtime-receipt ordering, multi-page focus/overlay
  behavior, source effects during an active recovery blocker, and convergence
  across service-worker termination. `hibernateSingle()` now joins the shared popup
  capture interlock through its tab effect and reload; the deterministic overlap
  case covers both action orders and release outcomes, while installed tab/storage
  event ordering remains open.
- The managed in-app browser stayed at 1280×720 when asked for an 800px viewport
  during the corrective Search/palette and empty-state passes. The narrow
  media-query paths were inspected statically, but the next unpacked-extension pass
  should repeat the interactive Search, palette, and empty-state checks at 800px
  before treating that viewport as fresh runtime evidence.
- The shared feedback receipt, quota-rejection sheet, and Settings Storage pane now
  use the same Locus Index
  hierarchy with independent English/native zh-TW copy. Quota recovery exposes real
  or unavailable browser usage, backup-first pending/error ownership, and explicit
  reload consequences while remaining above the fail-closed recovery interlock.
  Deterministic controller/source contracts are green, but real Chrome quota and
  download completion, installed timing/focus, screen-reader announcement, and exact
  1280×720/800/520 pixels remain open under queue items #1 and #2. Settings Storage
  now labels exact browser-profile usage separately from a UTF-8 Locus estimate,
  localizes every live state, and exposes real Archive/empty consequences. Queue #3
  moves to the adjacent backup-first Import & Export transfer ledger.
- `renderArchiveList()` in newtab.js is a harmless no-op since the drawer's archive
  tab was removed (element gone, function null-guards); callers remain. Delete
  function + call sites opportunistically when touching those paths.
- `design/fixtures/home-preview.html` is a static fixture with hardcoded counts —
  fine (isolated), but never link it from the product.
- Review-dialog fingerprints outside `State` still compare raw `JSON.stringify`
  strings: `organizationDeleteTarget()` (Workspace/Space delete) and the identity
  selection and Group-duplicate fingerprints. After this page adopts another
  window's graph, `chrome.storage` hands objects back with sorted keys, so an open
  delete or duplicate review can report a false "changed" and ask again. Fails
  safe. Found in the 2026-11-05 review; not fixed.
