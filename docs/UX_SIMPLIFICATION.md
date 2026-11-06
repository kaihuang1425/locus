# Locus interface simplification

Status: corrective interaction contract; the canonical save-first welcome,
three-zone Home, core shell, asked single-tab popup Open-after-save continuation,
ask-every-time-off quick-capture result/Open/explicit-Close continuation, and whole-
window destination/source receipt are implemented in the 2026-07-24 worktree but
remain unvalidated in an installed browser and with representative users. Created:
2026-07-13.
Product strategy, claims, and evidence status are governed by
[`PRODUCT_SUCCESS_SYSTEM.md`](./PRODUCT_SUCCESS_SYSTEM.md).

This document governs first use, the application shell, Home, Calendar, view
selection, microinteractions, and motion. Where it conflicts with the additive
feature assumptions in [`IMPROVEMENTS.md`](./IMPROVEMENTS.md), this document wins.
The earlier plan remains useful as implementation history and feature rationale.

Current visual direction, 2026-08-12: the owner rejected the pale Field Desk
presentation. **Locus Index** now carries this interaction contract through dark
registry navigation/headers, warm saved-material sheets, one blue location/action
rule, and green accepted receipts. It changes relative prominence across Welcome,
Home/Inbox, detail, and popup without changing the progressive-disclosure levels,
runtime copy, routes, storage, schema/import shape, permissions, or local-first
boundary. It is implemented and partially source/render verified, but not yet
owner-approved, installed-runtime verified, user-validated, or released.

This is a product and UX specification only. It does not ship a code or data-model
change by itself.

## 1. Decision

Locus accumulated capability faster than it established hierarchy. At the
corrective baseline, a new user could encounter a questionnaire, a landing layer,
a dense dashboard, two navigation rails, Calendar, search, a command palette, and
seven Space layouts before learning the product's simplest value.

The correction is **progressive disclosure around one core loop**:

> Save something, see where it went, and find it again.

Locus should not teach its feature inventory at first use. It should help the user
complete that loop, then reveal capabilities when their data or intent makes those
capabilities useful. No capability needs to be deleted; immature and advanced
capabilities need to stop competing with the core experience.

This direction has four consequences:

1. First use becomes one task, not a preferences interview or product tour.
2. The shell exposes a small, stable set of destinations and one primary action.
3. Calendar, alternate layouts, filters, opened tabs, and tools appear in context
   or under **More** until the user makes them relevant.
4. A feature cannot enter first use or primary navigation until it passes the
   core-ready gate in this document.

## 2. What this does not mean

- Do not delete user data or silently remove existing routes during this corrective
  work. The eventual Store candidate may exclude unrelated generic tools under
  canonical decision O-04; provide an explicit data/export transition if it does.
- Do not solve overload by replacing text with unexplained icons.
- Do not add another tour, tooltip queue, modal coach sequence, or animated demo.
- Do not fabricate analytics, activity, recommendations, or calendar content to
  make a surface look populated.
- Do not perform a restyle-only pass while the information hierarchy remains the
  same.
- Do not expand scope beyond the current desktop, single-profile, local
  noncommercial research alpha while the license and business model remain open.

## 3. The intended first session

The first session should be deterministic and short. It must not chain multiple
introductory surfaces.

1. Show one welcome card. State what Locus does in one sentence.
2. Offer one primary action: **Save your first tab**. Offer one quiet secondary
   action: **Explore on my own**.
3. Go directly to the simplified Home surface. Do not hand off from welcome to a
   second landing layer and then to Home.
4. Keep one inline next action on Home. Do not open a modal coach mark merely
   because the user arrived.
5. After the first save, show the saved item in its destination and put keyboard
   focus on its native **Open** action. Keep Details/Open/Archive visible while the
   card contains focus. Offer one logical continuation, such as **Create a Space**
   or **Find it again**.
6. Introduce a feature only after matching intent. For example, explain views after
   the user opens the View menu, and explain Calendar after the user creates or
   opens a reminder.

The current name, purpose, workflow, and plugin questions must not block the core
loop. Preferences that still have product value belong in Settings or can be
inferred from explicit actions. First use must never choose a Space layout or
rearrange navigation on the user's behalf.

The calm landing experience can remain as an optional new-tab preference for an
established user. It is not an onboarding step.

### First-session constraints

- No stacked modal, coach mark, popover, or landing layer.
- No more than one unsolicited hint; zero is preferred.
- No feature carousel, automatic layout switch, or timed navigation.
- Dismissal is always available and permanent for that prompt.
- Reloading resumes the product, not the onboarding sequence.
- The primary action remains usable with animation disabled and at 800 px wide.

## 4. Progressive disclosure model

Every surface belongs to one of three visibility levels. Promotion is driven by
user intent or relevant data, never by elapsed time.

| Level | Default visibility | Contents |
|---|---|---|
| Core | Always present | Home, Inbox, All Links, the user's Spaces, global Search, and one Save/Add action |
| Contextual | Appears when relevant or explicitly opened | Favorites after the first favorite, Read Later after the first queued item, Calendar after the first reminder, item details after selection, and the opened-tabs rail after the user enables it |
| Advanced | Reachable through More, View, command palette, or Settings | Archive and Trash when empty, alternate layouts, bulk actions, and advanced filters. Generic Tools remain preserved research-build capability and are excluded from the initial Store candidate under O-04. |

Rules:

- **More** and the command palette keep every hidden capability reachable.
- A user can choose **Show all features** or pin a promoted destination.
- Once the user pins or promotes a destination, it stays stable until they change
  it. The interface must not repeatedly reconfigure itself.
- Nonzero actionable state can promote a destination; vanity counts cannot.
- A route may be hidden from the primary rail without being removed or renamed.
- Existing users keep their data and saved view choices. The simplified default is
  for first use and for users who have not expressed a preference.

Owner decision, 2026-08-09: the initial Store candidate is the focused
save/organize/recover browser-context product. The established-user launch layer
therefore keeps Search, Home, and Inbox direct while Calendar and generic Tools
stay reachable through More. Existing routes and data remain intact.
Its centered field is local Find again, not a second browser omnibox: suggestions
retain guarded page Open, while Enter carries the exact query into the existing
URL-backed Search surface. No web-search fallback or `search` permission remains.

## 5. Application shell contract

### Left navigation

On first use, the primary rail has at most five top-level entries or groups:

1. Home
2. Inbox
3. All Links
4. Spaces
5. More

The rail is for navigation. Storage meters, privacy promotion, feature education,
and account-like cards belong in Settings or contextual help, not beside the core
destinations.

- Show exactly one selected destination.
- Put Archive, Trash, Calendar, Tools, and Settings under **More** until they are
  relevant or pinned.
- Show counts only when nonzero and actionable.
- Keep Space creation beside the Spaces heading, not as another global primary
  action.
- Do not duplicate the same destination as a sidebar item, top tab, and dashboard
  card with equal visual weight.
- The sidebar may collapse, but its collapsed icons require accessible labels and
  tooltips.

### Top bar

Use one row with three responsibilities:

- Left: current context title and a breadcrumb only when depth is greater than one.
- Center: one global search/command entry.
- Right: one primary Save/Add action and an overflow menu.

The top bar must not become a second navigation system.

- Allow at most one primary button and two unlabeled icon buttons.
- Give every icon button a visible tooltip and an accessible name.
- Keep layout, Calendar-view, and filter controls in their surface subtoolbar.
- Do not show duplicate search fields on the same surface.
- Do not show a profile/avatar control unless it has a real local product purpose.
- Put infrequent actions in the overflow menu; do not make the global row wider to
  advertise them.

### Opened-tabs rail

The opened-tabs rail is contextual capture assistance, not permanent chrome.

- Collapse it by default.
- Reveal it when the user opens it, begins a tab-capture task, or drags toward it.
- Persist the user's open/closed preference.
- Provide a click and keyboard path for every drag action.
- Keep every non-internal open tab visible for switching and explicit Close; do
  not rename the surface “opened tabs” and then hide unsupported pages.
- Derive Save buttons, Save counts, handles, and draggable state from the exact
  shared Reopen allowlist. An unsupported page may still be selected and closed,
  but it must never look recoverable.
- In a mixed selection, save only recoverable pages and retain unsupported rows.
  Repaint without dropping keyboard focus: use the first retained checkbox, then
  the rail filter when the selection is fully consumed.
- Treat drag-to-save as copy-first. Preserve the exact source window, URL, and
  active state at drag start; when cleanup is requested, refresh that identity
  before persistence and check it again after the save receipt. If the user moved,
  navigated to, or newly activated a source, keep it open while retaining the
  accepted saved copy. An active source observed by the fresh read is protected;
  never reinterpret it as permission to close the page now in use. If the saved
  graph changes during that read, persist the combined graph if possible but keep
  every source open.
- Never allow it to squeeze the primary content below its usable width.

### Navigation behavior

- Browser back, forward, reload, and deep links retain their expected meaning.
- Breadcrumbs describe hierarchy; they do not duplicate global destinations.
- A single Escape closes only the topmost transient layer and returns focus to its
  opener.
- The destination name, page title, and selected navigation state must agree.
- Hidden features remain reachable in no more than two actions through **More** or
  the command palette.

### Find-again Search

Search is a recovery surface, not a feature dashboard. It has one sequence:
query saved content, confirm the exact Workspace › Space › Group destination,
then **Open page** or **View details**.

- Keep one dominant query field. Optional type/Space/time/tag filters start
  collapsed and stay URL-backed for reload, Back, and Forward.
- Show the custom **Clear search** action only while the mounted query contains
  text. Ordinary and IME input update it immediately; clearing preserves filters,
  sort, the filter panel, and query focus instead of offering an empty no-op.
- When the panel is closed, its existing control shows one compact count for active
  Space, time, and tag dimensions. Tag and Has tags count once; query, content type,
  and sort remain excluded because their controls are already visible. The cue must
  explain narrowed results without opening, clearing, or duplicating the panel.
- The panel action says **Clear filters**, is disabled when no filter is active, and
  clears content type, Space, time, and tag filters through the same reset used by
  no-result recovery. It preserves the query, chosen sort, and open panel; ordinary
  filter-change behavior still returns an expanded result window to its first batch.
- Keep the real saved path as the visual signature. Do not add process steppers,
  vanity statistics, generic tips, gradient badges, or decorative insight cards.
- Search rows are read-only recovery controls. Do not put quick Favorite or other
  content mutations in the result row; shared item detail and Library retain them.
- Every Open path rechecks one settled, current, globally unique result and the
  saved-address allowlist immediately before the browser effect. Query/IME changes
  disable old actions synchronously; stale debounce work has no later effect.
- Details belong to the Search route. Close and browser Back retain the exact
  query, filters, sort, selection, and rebuilt-row focus without selecting or
  persisting another Space. If that item leaves the current result set, selection,
  detail state, sheet target, and URL clear together.
- Use one roving listbox with ArrowUp/Down/Home/End and nearest scrolling. One
  persistent, deduplicated live region owns loading/result-count announcements;
  errors remain the sole alerts. Only populated narrow results scroll, and
  user-authored titles, paths, and tags wrap.
- Keep the first result window to 100 rows, then offer a quiet button-driven
  continuation outside the listbox. Show visible progress, reveal at most 100
  more, and focus the first new row. The expanded window rides the Search URL for
  reload/Back/Forward and Details, while query/filter/sort changes return to the
  first batch. Do not use infinite scroll or store a result-count preference.

### Library recovery ledger

Library is the browseable recovery record, not a second Home or Search dashboard.
All Links, Favorites, and Read Later share one sequence: scan the exact saved
destination, then **Open page** or **View details**.

- Use one row grammar and renderer across all three modes. Read Later begins with
  unread saves in oldest-added order and must not repeat them in Up-next cards,
  summary tiles, or another list.
- Lead with the real Workspace › Space › localized Group › optional Stack trail.
  Keep it wrapped and visible at every supported width; never trade it away for
  vanity counts or decorative cards.
- Keep Open page and View details visible and named for the specific saved page.
  Favorite, Read Later, read-status, and Archive stay secondary without hiding the
  recovery choice.
- Preserve mode, query, Read Later status, sort, and selected Details item in the
  URL. Typing/filter changes replace the current entry; Details uses history. None
  of this view state belongs in durable storage.
- Treat a Library query as settled text, not each interim IME syllable. Keep
  composition text in the field without replacing the URL or results, commit once
  at composition end, and ignore the duplicate follow-up input. Escape belongs to
  the IME while composing; only settled Escape clears and blurs the query.
- Before acting, recheck the exact globally unique item, full location/value,
  route meaning, and current visible-result membership. A stale, moved, replaced,
  duplicated, URL-edited, or filtered-out row does nothing.
- Closing Details returns focus to the rebuilt row's Open page action. If a
  mutation removes a row, focus its next useful neighbor, then the previous row,
  then the query or heading.
- Anchor More to its row for pointer and keyboard use. Privacy blur covers title,
  URL, and destination; English and native Taiwan zh-TW use direct factual copy.
- Empty and no-match states offer one obvious way to browse, clear the query, or
  show all. Do not introduce another dashboard, stored collection, or schema.

### Shared saved-page Reopen

Reopen is one product behavior, not a different tab-opening rule on every layout.
For a normal **Open** action, the user intent is “take me back to this saved page”:

- Freeze and fresh-check one globally unique unchanged saved tab plus its exact
  Workspace › Space › Group › Stack location and safe URL. A stale, moved,
  duplicated, replaced, renamed, retyped, or edited save never borrows another
  record.
- Reuse the exact live page or this extension's exact suspended placeholder when
  it already exists. Prefer the loaded page, activate it, focus its window, then
  fresh-confirm the same exact active tab before quiet success. A background
  request leaves an existing match quiet. Near URLs and a tab with a conflicting
  pending destination are not matches.
- Create only when no exact match exists. Foreground creates one live page;
  background preserves the existing Hibernate preference. Report success only
  after a fresh read confirms the returned tab/window, requested active state, and
  exact live or suspended destination. An exact pending destination can confirm;
  a conflicting pending destination cannot. The small card arrow is the exception
  because its accessible name explicitly promises a new tab; it keeps deliberate-
  copy semantics and skips the duplicate scan it does not use.
- Serialize rapid same-page intent. Identical activations in one Locus document
  share one result, while a request queued there behind an unconfirmed browser
  effect stops rather than guessing. When available, one same-origin Web Lock
  also serializes separate Locus documents, so a confirmed first create is reused
  by the next. Installed behavior after an unknown first receipt remains a proof
  gap, and the query/create pair is not atomic against users or other extensions.
- Keep success quiet. On an unsafe address, stale identity, changed candidate,
  failed browser check, unconfirmed final handoff, or unconfirmed window focus,
  name what is known and the next safe action in one localized message. Never
  retry an uncertain create or reuse effect. Restore the
  connected initiating control. Landing results dismiss only after a confirmed
  handoff, so failure preserves the user's query.
- Apply this boundary to Landing, Library/Favorites, Read Later, Home Trail,
  shared Board/Group layouts, Search, Details, Explorer, Graph, and drop-to-open.
- Group **Open all** and selection **Open** reuse the same exact browser boundary
  with background intent. Capture every exact saved-item context before browser
  work, keep distinct same-URL saves independent, and settle them sequentially.
  Reuse live or Locus-suspended destinations before creating inactive live/
  Hibernate tabs. Stop after one failed profile read or unknown effect; do not
  repeat the same failed query or speculate on later entries.
- Keep the bulk opener focusable, visibly busy, and marked `aria-disabled` while
  its plan settles. A competing activation explains which work is still active.
  Report new tabs, already-open, not-opened, check-failed, unconfirmed, and not-
  checked results once. Required check-tabs/retry guidance stays inline beside the
  Group or selection toolbar until dismissed. Confirmed results remain compact.
  Popup route reuse keeps its separate explicit contract.

This behavior is the UI signature for the slice. It needs no new dashboard,
dialog, badge, animation, or decorative status: the absence of duplicate tabs and
the predictable return to an existing page are the visible design.

## 6. Home instead of a feature dashboard

Home should answer, “What should I do now?” It should not summarize every system
Locus contains.

For a new or nearly empty installation, keep the first viewport to three zones:

1. A compact welcome and context line.
2. One capture/Inbox card with the primary action.
3. Up to three recent or pinned Spaces with one **View all** link.

Do not show an oversized decorative hero, persistent right rail, storage or privacy
promotion, fabricated insights, focus recommendations, or empty analytics. An empty
Home gets one strong action, not a grid of competing empty cards.
If its Workspace has no Space, that action is **Create space** beside the visible
save prerequisite. It opens the existing organization dialog; the user should not
have to discover the sidebar plus before Home can perform its core job.

For an established user, Home may add only information that changes the next
decision:

- continue where they left off;
- Inbox items that need triage;
- up to three recent or pinned Spaces.

Owner decision, 2026-08-09: **Resume saved work** is the primary reason to
return. The leading Trail therefore prefers the newest saved page that can enter
the guarded Reopen path, even when a newer note, to-do, Stack, or unsupported page
exists. When no page is eligible, Home keeps the original newest saved-item
fallback so mixed local context remains visible and no data is discarded.
For an eligible page, **Open page** is the first native control and sole primary
action; **View details** follows as secondary. A fallback record keeps Details as
its one primary continuation. Keyboard Save success continues at Open.
The Trail exposes one accent across both lanes: recovery owns it whenever a saved
item exists; on an empty Home, the remembered Save consequence owns it. Both Save
consequences stay available in either state.
The no-Space prerequisite precedes both: Create space owns the sole accent until a
real destination exists. A duplicate-Inbox conflict remains a separate fail-closed
review state and must not be mislabeled as missing setup. It offers **Open space**
only after re-resolving that exact current Space; this continuation may show the
groups but must never choose, rename, merge, delete, or persist an Inbox. Existing
saved-item recovery keeps the accent when present; otherwise conflict review owns it.
The rest of Home follows the same prerequisite truth. With no Space, stop after the
Trail instead of repeating Create space in another empty card. Show the Inbox review
zone only for one exact active Inbox; a missing Inbox is created only by an explicit
Save, while duplicate Inboxes stay behind the Trail's Open-space review. In both
cases, existing Spaces remain visible and Home never selects the first same-name
Group.
That same refusal governs the underlying new-tab capture actions, not only Home's
presentation. Opened-tab, Welcome, palette/top-bar/Home single-tab, selected-tab,
and Space-drop saves review one exact Workspace/Space and zero or one Inbox before
history. An unchanged missing Inbox may be created after review; multiple or changed
Inboxes save and close nothing and leave selection intact. No path repairs or picks
the first same-name Group. After insertion, each path freezes the exact newly saved
item set and requires it to remain in that reviewed Inbox through persistence and
every source effect. Opened-tab, selected-tab, palette, and Space-drop entry points
then reuse the existing Open-destination receipt; Home, Welcome, and top-bar keep
their more specific handoffs. Existing-Group Save follows the same filing trust:
both selected and active-tab branches allocate against every ID retained in active
data, Archive, Trash, and compatibility hints before history or mutation, so an
old record cannot make a valid save mysteriously fail. Save all applies its visible
close-after-confirmed-save consequence to every supported page included in the
accepted count; it never silently exempts the first eligible source.

Recovery follows the same identity rule. If a single archived page's reviewed
Group is gone and Restore explicitly shows a new Inbox fallback, that Inbox must be
allocated against active data plus every Archive/Trash destination hint before
anything moves. An old filing hint cannot silently become authority over a newly
created destination.

The Opened Tabs promise “drag into any Space” must be literal. The Space-drop path
may freeze a uniquely resolved inactive Space inside the active Workspace without
selecting it; every ordinary capture list remains active-Space-only. The exact
Inbox/new-item receipt still governs persistence, source cleanup, and Open
destination, so cross-Space convenience does not weaken filing authority.
That shortcut also obeys the same saved-record privacy preferences as every Save:
title may fall back to the domain and site icon may be omitted. Raw drag metadata
must never become a second capture policy.

Every Home recovery row must make three things obvious without a tooltip: what it is, what
the user can do, and what will happen after the action. Additional modules can be
user-configurable later, but they are not the default.

Current interaction contract: each real saved-item preview is a full-row native
control with a localized action name. It re-resolves the current record from
primitive identity, opens the shared detail sheet on the Home route, and keeps the
active Space and its saved layout unchanged. Missing or ambiguous records stay on
Home with visible failure feedback. Escape closes only the sheet; close and browser
history return focus to the exact rebuilt preview when it still exists, then a
current preview for the same moved item, then the Home heading. Merely locating an
item must not snapshot or persist state, initialize Canvas positions, or manufacture
populated content.

The shared Details sheet is one recovery docket rather than another page or a form
dashboard. Its filing line shows item type and the complete Workspace › Space ›
Group path, while one primary editor/preview owns the visible record identity. Open
is dominant only for a guarded saved page. Why saved, Reminder, and Tags align as
core context; Cover, Checklist, and Custom fields remain under More details. The
exact hidden item name continues to label the modal, and the established route,
receipt, focus, and Escape owners remain authoritative.

Inbox and Board saved-tab cards use the visible title as one native primary Open
button. Welcome handoff and Arrow navigation land on that button; Enter and Space
use native activation, and Details/Open/Archive controls reveal on focus as well as
hover without shifting layout. A focused Group page renders its cards expanded
without changing the board's stored collapse preference, and post-render Group
focus returns to a visible action. Missing, malformed, or unsupported saved
addresses remain explicitly unavailable and create no browser effect. Focus lookup
stays on the current card and never descends into a nested Stack.

Each Group footer makes capture the decision: one dominant **Save here** control
retains the exact Group capture path, and one quiet **Add record** disclosure contains
Note, To-do, and Stack. Do not restore those record types as equal footer icons or
duplicate them in Board More. List uses the same Save wording and keeps the shared
record actions contextually inside More. At a 200 px resized Group, hide only the
secondary visible label; both 40 px native controls, accessible names, and menu
focus/Escape ownership remain intact.

The saved-tab context menu uses the same direct action as its keyboard anchor.
Shift+F10 and the Context Menu key focus the first localized command; Escape and
command dispatch restore the primary action first. Copy URL distinguishes an
acknowledged clipboard write from denial, and Edit title opens the existing
receipt-gated detail title field instead of a browser prompt. Favorite and Read
Later return to the rebuilt card; both Archive entry points advance to a neighbor
or visible Group/board fallback. The duplicate anchored color picker, inline card
editors, and legacy direct reminder mutation stay out of this menu; Details owns
receipt-gated Note/To-do text, marker, and reminder editing.

## 7. Calendar contract

Calendar is a projection of reminders attached to Locus content. It is not a second
task manager or a speculative external calendar product.

- Keep Calendar under **More** until the first reminder exists or the user opens it
  explicitly. After that, offer to pin it; do not pin it automatically.
- On first open, default to **Agenda/Upcoming** when there are fewer than five
  reminders. It explains sparse data better than an empty month grid.
- Keep Month and Week in a local view switcher. Views that have not passed the
  core-ready gate stay under **Advanced views**.
- Make **Add or edit a reminder on an item** the primary Calendar action.
- Use one compact subtoolbar: view, Today, and Filter. Collapse advanced filters.
- Open one detail panel only after an event is selected.
- In an empty state, explain that Calendar shows Locus reminders and offer one
  action: **Add a reminder to an item**.
- Do not show external-calendar integration, productivity analytics, suggested
  focus blocks, or other unavailable concepts.
- Drag-to-reschedule must have a click and keyboard alternative and a clear undo.

Month, Week, recurring reminders, filters, and rescheduling remain available, but
they do not all need to be taught or displayed on first entry.

## 8. Space view policy

Use the simplest proven view as the default. The View menu is a content tool, not a
first-use lesson.

- Use Bento board as the default unless an existing Space already has a saved view.
- Keep List as the first secondary option once it passes the same quality bar.
- Put Canvas, Explorer, Timeline, Gallery, and Graph under **Advanced views** until
  each independently passes the core-ready gate.
- Do not reveal view switching merely because onboarding completed.
- Do not infer a layout from a questionnaire response.
- Show the View control when the current Space has enough content to make the
  choice meaningful, or when the user explicitly asks for it.
- Preserve the user's per-Space selection without repeatedly prompting them.

Advanced does not mean disposable. It means the capability remains reachable while
its interaction quality is brought up to core standards.

### Organization terminology

- Present the saved hierarchy as **Workspace → Space → Group → Item** and
  **工作區 → 空間 → 群組 → 項目**.
- Import review, import diagnostics, and Explorer translate internal
  `.categories[...]` locations only when rendering user-facing copy.
- Keep durable `categories` fields, IDs, routes, migrations, and portable backup
  envelopes unchanged during terminology cleanup.
- Keep **category** only where it is the actual domain term, such as symbol
  categories or Finance transaction classification.

## 9. Microinteraction contract

A polished interaction communicates state, consequence, and recovery. Every action
must provide:

1. A visible hover, focus, and pressed state where applicable.
2. Immediate acknowledgement or an honest loading state.
3. Completion or error feedback near the action or affected object.
4. Undo or confirmation when the consequence is destructive.
5. A predictable focus destination and focus return path.

| Action | Immediate feedback | Completion | Recovery |
|---|---|---|---|
| Save a tab or window | Button or destination enters an honest busy state | New content appears at its destination; new-tab single, selected, and Space-drop Inbox Saves reuse the existing toast to name the accepted Workspace / Space / Inbox and distinguish saved copies; existing-Group Add / Save applies the same receipt after exact Group revalidation; selected-as-Group and Board/List Group/Stack drops name the exact nested destination and offer Undo plus Open destination; an explicitly selected single-tab continuation opens the item in the existing Home recovery sheet; an ordinary popup Save whose requested exact source close is changed or unconfirmed stays on the Saved result card with destination/title and protected-source truth, then offers guarded Open saved item plus Close popup without retrying cleanup; ask-every-time-off quick capture retains the source and names the exact current Space / Group / title with Open saved item and optional explicit Close tab; a whole-window receipt names the authoritative current Space / Group and offers Open destination | Rejected or acknowledgement-unknown state leaves sources open; stale exact Group, quick-item, nested drop, or whole-window identity saves/closes nothing; source/window/current/pending URL, destination, or active-transition changes are protected before each remaining source close; a known continuation failure keeps the accepted save and offers a local recovery action; partial or unknown effects report protected/unconfirmed outcomes rather than a false success or blind close |
| Hibernate one tab or a scope | The shared popup capture state blocks competing Save/Hibernate work | Each exact reviewed source becomes its local placeholder; Save before Hibernate keeps its accepted copies and reports the actual replacement count | Every source is fresh-confirmed after waiting/persistence; changed, newly active, redirecting, missing, or malformed sources stay open while exact siblings continue, and no browser effect is retried |
| Open one saved page | Initiating control remains the recovery anchor; no success toast | Exact existing live/suspended page is reused, otherwise one page is created according to foreground/background intent | Stale or unsafe targets have no effect; read failures avoid a speculative copy; uncertain effects ask the user to check open tabs; unconfirmed focus says the page is open; one coalesced failure restores focus once |
| Open a Group or selection | Exact initiating control stays focusable, visibly busy, and rejects duplicate activation with an explanation | Each frozen exact save settles in order; existing live/suspended tabs are reused and only missing destinations create inactive tabs; one compact localized result accounts for every eligible save | Stale/unsafe items are not opened; one failed profile read or unknown effect stops later work; check-tabs/retry guidance remains inline until dismissed and focus returns to the initiating control |
| Change a view | Selected option updates immediately | Content settles in the chosen view and the choice persists | Reopen View and choose the prior option |
| Archive or delete | Affected row/card leaves its list | Inline notice names what changed | Undo restores it; permanent deletion requires confirmation |
| Apply a filter | Filter visibly becomes active | Result count and content update together | Clear control restores the unfiltered set and focus |
| Navigate | Selected nav state changes with the route | Page title, breadcrumb, and content agree | Back returns to the prior route and selection |

Additional rules:

- Essential controls cannot be hover-only.
- Decorative controls that do nothing cannot look interactive.
- A toast cannot contain information required to continue.
- Single Hibernate freezes its reviewed source before the popup write wait. Bulk
  drains that queue, discovers candidates, then freezes them before optional Save-
  before persistence. Each exact tab is fresh-read immediately before replacement;
  same ID, window, active state, current URL, and safe pending URL are required. A
  protected source remains live without undoing its accepted saved copy.
- A toolbar-popup continuation that can outlive popup teardown stays worker-owned.
  Single-tab Locate waits for a valid state receipt, then dispatches a separate
  worker request under the state mutation lock for its fresh effect. Rejected or
  acknowledgement-unknown state dispatches no request. It must validate the exact source before
  activation, activate/focus/fresh-confirm the exact saved-item route, validate the
  now-inactive source again, and recheck the committed route immediately before any
  close. A matching pending navigation is not yet permission to clean up the source.
  Activation, route, source-ID/window/active/current/pending-URL, or read failure
  leaves the source open; an unsafe route cannot become an exact-tab retry. Delayed
  popup/notice retries fresh-check retained tab/window/active/current/pending route
  identity before activation and again after focus, and create a fresh exact local
  route after reuse, change, or focus loss. Legacy notices without exact route
  authority use generic Locus rather than reusing a tab ID. After effect dispatch,
  a missing receipt means opening and requested close are unconfirmed; never retry
  either effect or roll back the accepted save.
  Whole-window close completion is a separate worker request dispatched only after
  a valid ordinary state receipt;
  it must fresh-resolve the durable saved destination, keep the state mutation lock,
  and confirm each URL still exists there before closing any source. Do not rely on
  a delayed success toast. Popup teardown before completion dispatch leaves
  accepted data saved and source tabs open.
- Ask-every-time-off quick capture keeps the accepted-state receipt separate from
  explicit Open/Close effects. It reuses the existing result card; does not add a
  timer, toast, modal, notification, or forced navigation; and leaves the source
  open until the user chooses. Each worker action fresh-resolves the exact active
  item and current same-Workspace owner. Open must confirm the encoded Home route
  after focus; Open-with-Close must confirm it again after source validation
  immediately before removal. Changed, ambiguous, protected, or unconfirmed state
  fails closed, and an unknown effect disables destructive Close while retaining a
  safe Open identity.
- Browser context-menu and shortcut capture has no review dialog, so its stored
  configuration is the review boundary. The complete remembered
  Workspace/Space/Group tuple, configured default Space, or active
  Workspace/Space must resolve uniquely; stale configuration never falls through
  to another destination. After one guarded write, a conservative stable native
  receipt must be confirmed before any source cleanup. Receipt failure keeps every
  source open. Successful creation permits cleanup only when the receipt contains
  an exact actionable item or Session Group locator. A generic Home receipt still
  confirms the save and opens local Locus, but it keeps every source open, skips
  cleanup traversal, and retains its conservative outcome without a final update.
  An actionable pass re-enters the sole state FIFO/Web Lock, fresh-reads the exact
  accepted Workspace/Space/Group/item authority, and keeps that transaction
  through browser cleanup. A moved or missing single item stays open. Whole-window
  cleanup validates each transient source-to-saved-item identity in the original
  exact Session Group, so missing sources stay open while still-authoritative
  siblings may close and use the existing partial result. Harmless newer state
  edits do not revoke an exact save. The final browser check still requires exact
  tab/window/current/pending URL identity, rejects a malformed present pending
  value, and requires an explicitly inactive whole-window source rather than
  inferring missing/non-boolean state. It preserves the initiating and newly
  active whole-window tabs. The same actionable receipt receives the final
  outcome; a failed update leaves the initial truthful clickable state. The badge
  is secondary.
- Clicking an actionable native receipt removes that recovery surface only after
  one fresh read confirms the newly created local route is the exact active result.
  Negative or malformed identity, read failure, an inactive or wrong route, and
  conflicting or malformed pending navigation keep the receipt. Uncertain creates
  are never retried. This is the restraint that saves hassle: the existing action
  remains available instead of adding another recovery screen.
- Popup destination preview is also a review boundary, not a mutation. It must
  resolve one exact explicit, remembered, default, or active hierarchy and show a
  detached proposed Inbox when none exists. A real single/quick/links/queue/
  hibernate save may provision that Inbox only after revalidation and inside its
  one guarded write. Session and bookmark Groups write directly to the reviewed
  Space. Every generated Group/item uses one retained-ID allocator, bookmark
  import joins the popup pending interlock, and an accepted ordinary single-tab
  save fresh-checks exact tab/window/current/pending URL identity before removal.
- Rich-text Link creation uses one localized in-product review, never a native
  prompt. Board Notes, Group READMEs, and item-detail notes share the Link button
  and Ctrl/Cmd+K. Opening requires one same-editor text selection and performs no
  write. The dialog shows that text, accepts only a full HTTP(S) address, traps
  focus, keeps recovery above its inert layer, and restores the editor selection
  on Cancel/Escape. Confirm rechecks the exact editor HTML, text, nodes, and
  offsets before one formatting command; existing editor blur/dirty/detail paths
  continue to own persistence and history.
- Disabled controls explain why when the reason is not obvious.
- Drag-and-drop always has a click and keyboard alternative.
- Optimistic changes must revert visibly when persistence fails.
- Loading feedback must not shift the layout or erase the user's context.
- Overlay and popup-section openers retain focus identity; nested Back and Escape
  close last-opened-first and return to the last visible opener.

## 10. Motion contract

Motion has three permitted jobs: preserve spatial continuity, connect cause to
effect, and clarify a state change. It is not decoration or proof of polish.

| Motion type | Duration | Typical use |
|---|---:|---|
| Instant | 0 ms | Reduced motion, direct state replacement |
| Feedback | 120–160 ms | Hover, press, selection, small disclosure |
| Surface | 180–220 ms | Popover, panel, or route-local transition |
| Reorder | 200–260 ms | User-initiated item movement |

- No normal surface transition may exceed 260 ms.
- Animate `transform` and `opacity`; avoid layout properties such as `top`, `left`,
  `width`, and `height` for continuous motion.
- Do not stagger the first paint, use parallax, pulse indefinitely, bounce with
  spring overshoot, or animate an entire layout on routine navigation.
- Only one dominant motion event should occur at a time.
- Hover should prefer color, border, and restrained shadow changes over moving the
  card beneath the pointer.
- Motion must be interruptible. The correct final state cannot depend on an
  animation finishing.
- No animation can delay the next click or keyboard action.
- `body[data-anim="off"]` and `prefers-reduced-motion` resolve all nonessential
  motion to an instant, stable state.

## 11. Core-ready gate

A feature may enter first use or primary navigation only when all of the following
are true:

- Its value can be stated in one sentence and it has one clear entry point.
- Its primary flow works end to end with real local data.
- Loading, empty, no-match, error, and success states are deliberate.
- Keyboard navigation, visible focus, Escape, opener focus return, and screen-reader
  names work.
- Back, forward, reload, and stored preferences preserve the expected state.
- It works at 1280 × 720 and 800 px wide without clipped primary actions.
- Light and dark themes plus English and zh-TW are complete.
- Reduced-motion mode is stable and fully usable.
- It contains no placeholder, remote-only, premium, or dead control.
- At least four of five representative new users complete its primary task without
  coaching in a moderated usability check.

If any condition fails, the feature stays Contextual or Advanced. Visual similarity
to a preview does not substitute for this gate.

## 12. Delivery sequence

Do not continue adding top-level surfaces until phases 1–3 pass their acceptance
checks. Each phase should be independently releasable and preserve current data.

### Phase 0 — Freeze and inventory

- Freeze new primary navigation entries, layouts, and first-use prompts.
- Inventory every route, entry point, duplicate control, overlay, and automatic
  prompt.
- Classify each capability as Core, Contextual, or Advanced.

### Phase 1 — First session

- Replace the preference questionnaire with the single-task welcome.
- Remove the welcome-to-landing-to-Home chain.
- Make the first save and its destination explicit.
- Remove unsolicited coach marks from the first-session path.

### Phase 2 — Shell

- Reduce and stabilize left navigation.
- Recompose the top bar around context, search, and one primary action.
- Collapse the opened-tabs rail by default.
- Consolidate duplicate navigation and search entry points.

### Phase 3 — Home

- Replace the feature dashboard with the three-zone Home model.
- Remove promotional and non-actionable modules from the core viewport.
- Add established-user recency and Inbox signals only when real data exists.

### Phase 4 — Calendar and views

- Gate Calendar by reminder relevance and default sparse data to Agenda.
- Move surface-specific controls out of global chrome.
- Move unqualified Space views under Advanced views.

### Phase 5 — Interaction quality

- Apply the microinteraction and motion contracts to all core flows.
- Test focus, recovery, persistence, reduced motion, and responsive behavior.
- Run the usability checks before promoting any advanced capability.

### Phase 6 — Controlled promotion

- Improve one advanced capability at a time.
- Promote it only after it passes the core-ready gate.
- Measure whether promotion helps task completion before exposing another.

## 13. Acceptance criteria for the correction

The simplification program is successful when:

- A new user can explain Locus's purpose and save one tab within 60 seconds without
  help.
- That user can find the saved tab again within another 30 seconds.
- A formative round has at least four of five representative new users complete
  the save-and-find loop without coaching; the release validation gate remains at
  least 12 of 15 under the canonical Product Success System.
- First use shows at most five primary navigation destinations, one primary global
  action, and no stacked introductory surface.
- Calendar and layout education do not appear before matching intent or data.
- An established user can reach any relocated feature in no more than two actions
  and retains existing data and saved view choices.
- Every core destructive action has confirmation or undo.
- No motion blocks input, and reduced-motion mode changes no task outcome.

These are task targets, not telemetry claims. They must be validated with rendered
flows and representative usability sessions before the work is called complete.

## 14. Decision summary

| Area | Decision |
|---|---|
| Onboarding | Replace the six-step preferences flow and chained landing handoff with one task start |
| Home | Lead with recovery/capture, then exact Inbox triage and a compact truthful Space register rather than feature coverage |
| Left navigation | Keep navigation-only, with five core entries and a stable More destination |
| Top bar | Keep context, one search entry, one primary action, and overflow |
| Opened tabs | Collapse by default and reveal for capture intent |
| Calendar | Reveal when reminders make it relevant; default sparse data to Agenda |
| Space layouts | Keep one proven default and gate the rest under Advanced views |
| Microinteractions | Require state, consequence, recovery, and focus behavior |
| Animation | Use short, interruptible, purpose-driven motion with a zero-motion equivalent |
| Existing features | Preserve routes and data; reduce default visibility rather than delete capability |

The governing principle is simple: **Locus earns complexity one successful user
action at a time.**

## Drag Save duplicate consistency (2026-08-13)

One stored Capture preference now governs every drag destination. When Duplicate
URLs are allowed, dragging a page already present in a Space, Group, or Stack saves
a separate record. When deduplication is enabled, the existing localized Already
saved result remains and no write occurs. This removes shortcut-dependent behavior
without adding UI, copy, navigation, or another decision point. Installed native
drag and representative-user comprehension remain open.

## Command-palette Save source truth (2026-08-13)

The palette now says **Save recent browser tab** and selects the most recently used
eligible page from a fresh current-window read. It no longer promises the active
tab while Locus itself owns that position. The existing Inbox destination receipt
and unavailable feedback remain the only consequence surfaces. Native zh-TW uses
**儲存最近使用的分頁** and describes the same behavior without adding another
choice. Installed palette, focus, and representative-user comprehension remain
open.

## Popup batch duplicate consistency (2026-08-13)

Skip duplicate URLs now applies to the whole Save-before-Hibernate or Links/Queue
batch. The first exact URL is filed; another source with that URL does not create a
second record, even when the destination was empty before the action. Allowing
duplicates still files every source. Fresh Session capture retains one record per
source because that flow owns a different exact cleanup mapping. No new dialog,
copy, receipt, or decision point was added. Installed effects and representative-
user comprehension remain open.

## New-tab batch duplicate consistency (2026-08-13)

Skip duplicate URLs now applies across one selected existing-Group Save and one
multi-tab Group/Stack drop, including an initially empty destination. The first
exact URL is filed and later same-URL sources in that action are skipped; allowing
duplicates files every source. Fresh generated Groups remain complete snapshots.
No new control, copy, toast, or decision point was added. Installed selection/drag
and representative-user comprehension remain open.

## Group Save-here source truth (2026-08-13)

Save here now means selected opened tabs when a selection exists, otherwise the
most recent savable browser page from a fresh window read. It no longer attempts to
save the active Locus page and then asks for a selection. The same action, exact
Group receipt, and recovery surface remain. Native zh-TW says
**已選取的開啟分頁或最近瀏覽的可儲存網頁**. No extra prompt or decision point was
added. Installed Board/List behavior and representative-user comprehension remain
open.

## Unsupported pages stay live (2026-08-13)

The popup now shows and saves only addresses that the existing Reopen flow can use:
web, FTP, and local-file pages. Inline data, blobs, scripts, browser internals, and
malformed addresses never enter Save or its cleanup phase. The person keeps the
only usable source instead of receiving a misleading local record. No new prompt,
warning surface, receipt, or choice was added. Installed popup behavior and
representative-user comprehension remain open.

## First Save does not celebrate an old filing route (2026-08-13)

When an accepted Save outlives its reviewed Inbox, Home no longer paints that path
green and Welcome no longer jumps into it. Welcome still closes as complete so the
person is not prompted to create a duplicate. One existing warning states that the
Save was confirmed but its current destination could not be shown. No new prompt,
surface, copy, or decision was added. Installed behavior and representative-user
comprehension remain open.

## Bookmark import yields pages that open (2026-08-13)

Import Bookmarks now files only web, FTP, and local-file addresses that Locus can
later open. Scripts, inline/blob data, mail actions, browser internals, and malformed
entries stay out of the library and its success count. This makes the existing
single Import action more useful without adding review choices, warnings, or a new
surface. Installed bookmark behavior and representative-user comprehension remain
open.

## Bookmark import keeps one exact filing identity (2026-08-13)

The existing Import Bookmarks action now skips generated identities already owned
by active or retained Locus content. Imported pages remain uniquely findable and
reopenable without adding a review step, warning, control, or migration. Focused
production-extracted collision evidence passes; installed bookmark behavior and
representative-user comprehension remain open.

## Keep the live page when its filing cannot be found (2026-08-13)

Close-after-save now happens only after the worker can still find the exact accepted
page record and revalidate the source. If another Locus change removes that filing,
the source stays open and the existing Saved card offers generic Locus recovery.
No prompt, control, toast, or retry was added. Focused production-extracted evidence
passes; installed timing and representative-user comprehension remain open.

## Do not label a destination Locus cannot confirm (2026-08-13)

The whole-window Saved card now shows its filing path only from current worker
authority. When that location is unavailable or unknown, the path is blank and the
existing safe recovery action remains. No warning, prompt, control, or new copy was
added. Focused production-extracted evidence passes; installed rendering and
representative-user comprehension remain open.

## Keep recovery visible when cleanup does not finish (2026-08-13)

Popup Locate now treats an unconfirmed source close as an explicit partial outcome.
The accepted page stays saved, the source stays open, and the existing Saved card
remains visible with its current destination and **Switch to saved item** recovery.
A failed native notice cannot turn that state into silent full success while the
popup survives. No new prompt, copy, control, timer, or retry was added. Installed
rendering/notification timing and representative-user comprehension remain open.

## Do not point to a filing the worker cannot find (2026-08-13)

When popup Locate cannot resolve the exact accepted item in current local data, the
Saved card now leaves its destination blank instead of repeating the optimistic
Space/Group. The source and popup stay open, the existing destination-unconfirmed
message explains the limit, and Open Locus remains the one recovery action. No new
prompt, copy, control, timer, or retry was added. Installed rendering/order and
representative-user comprehension remain open.

## Keep a new Note or To-do exactly findable (2026-08-13)

Creating a local record now reserves one ID that no active, archived, or trashed
record already owns. The same object is filed once and opened in Details only after
its accepted receipt. Allocation trouble stays on the current surface with existing
recovery and writes nothing. No new prompt, copy, control, or migration was added.
Installed rendering/persistence and representative-user comprehension remain open.

## Make the first Inbox dependable without another setup step (2026-08-13)

The automatic first Workspace now gives My Workspace, Pinned, Inbox, and Later four
distinct IDs that cannot reuse retained filing identities. The first Save can be
found and reopened without asking the user to repair or recreate anything. Names,
layout, navigation, and first-run choices stay the same; no prompt, copy, control,
or migration was added. Installed clean-profile behavior and representative-user
comprehension remain open.

## Do not offer Open all when there is nothing Locus can open (2026-08-13)

Empty Inboxes and Groups made only of Notes, To-dos, or unsafe legacy pages no
longer present an enabled Open-all promise. Menus omit it; stable Board/List
controls stay in place but are visibly and semantically disabled for predictable
layout and assistive technology. A safe page nested in a Stack enables the same familiar action. No new
copy, prompt, control, or recovery surface was added. Installed rendering and
representative-user comprehension remain open.

## Save the next useful recent page without making the user select it (2026-08-13)

Save here no longer gives up because the newest eligible page is already filed in
that Group. It quietly chooses the next recent unsaved page; selected Opened Tabs
still win, duplicates-allowed behavior stays intact, and an all-duplicate window
keeps the familiar Already-saved result. No new prompt, copy, control, or decision
point was added. Installed behavior and representative-user comprehension remain
open.

## Let one duplicate preference mean the same thing inside a Stack (2026-08-13)

Skip duplicate URLs now sees pages nested inside Stacks in the chosen destination,
regardless of whether the user saves from Home, a Group, drag-and-drop, popup,
Hibernate, context menu, or shortcut. A duplicate produces the existing familiar
continuation instead of another record; allowing duplicates still accepts it. No
new prompt, copy, control, or recovery surface was added. Installed behavior and
representative-user comprehension remain open.

## Keep recent Save shortcuts moving toward useful work (2026-08-13)

If the newest browser page is already in Inbox, top-bar and Palette Save now
continue to the next recent unsaved page instead of reviewing or retrying the
duplicate. Home, top bar, and Palette behave consistently; allowing duplicates and
the familiar final Save checks remain intact. No new prompt, copy, control, or
recovery surface was added. Installed behavior and representative-user
comprehension remain open.

## Make Welcome offer a page that still needs saving (2026-08-13)

Welcome now skips the newest page when it is already in the active Inbox and shows
the next recent unsaved page. This matters when popup or context-menu capture ran
before the guide appeared. The displayed page is still fresh-checked before Save,
and the exact Inbox receipt still owns any close consequence. No new prompt, copy,
control, or recovery surface was added. Installed behavior and representative-user
comprehension remain open.

## Show the whole saved path when Stacks are part of it (2026-08-13)

Search result labels and Saved-in detail now include every parent Stack after the
Workspace, Space, and Group. Two pages in different nested Stacks no longer appear
to share one filing location. The same frozen path already used for exact recovery
owns the display, with no new prompt, control, or recovery surface. Installed
rendering, screen-reader behavior, and representative-user comprehension remain
open.

## Reveal a nested destination without changing its saved layout (2026-08-13)

Open destination now unfolds the exact parent Stack path just long enough to show
and focus the leaf filing. It reuses the existing transient reveal treatment, so
the user's stored collapsed/expanded choices do not change and the next normal
render restores them. No new prompt, copy, control, or recovery surface was added.
Installed rendering, focus/AT behavior, and representative-user comprehension
remain open.

## Disable selection Open when nothing can reopen (2026-08-13)

The selection docket no longer presents an enabled Open action for only unsupported
legacy addresses. It reuses the existing disabled explanation; mixed selections
remain actionable for their recoverable pages and unsupported records stay
available for review. No new prompt, copy, control, or recovery surface was added.
Installed DOM/AT behavior and representative-user comprehension remain open.
