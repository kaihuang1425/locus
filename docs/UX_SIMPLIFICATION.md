# Locus interface simplification

Status: corrective interaction contract; the three-zone Home and core shell are
implemented in the 2026-07-15 worktree but remain unvalidated. Created: 2026-07-13.
Product strategy, claims, and evidence status are governed by
[`PRODUCT_SUCCESS_SYSTEM.md`](./PRODUCT_SUCCESS_SYSTEM.md).

This document governs first use, the application shell, Home, Calendar, view
selection, microinteractions, and motion. Where it conflicts with the additive
feature assumptions in [`IMPROVEMENTS.md`](./IMPROVEMENTS.md), this document wins.
The earlier plan remains useful as implementation history and feature rationale.

This is a product and UX specification only. It does not ship a code or data-model
change by itself.

## 1. Decision

Locus has accumulated capability faster than it has established hierarchy. A new
user can encounter a questionnaire, a landing layer, a dense dashboard, two
navigation rails, Calendar, search, a command palette, and seven Space layouts
before learning the product's simplest value.

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
5. After the first save, show the saved item in its destination with a short inline
   confirmation. Offer one logical continuation, such as **Create a Space** or
   **Find it again**.
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
| Advanced | Reachable through More, View, command palette, or Settings | Archive and Trash when empty, alternate layouts, bulk actions, and advanced filters. Generic Tools remain research-build-only pending O-04. |

Rules:

- **More** and the command palette keep every hidden capability reachable.
- A user can choose **Show all features** or pin a promoted destination.
- Once the user pins or promotes a destination, it stays stable until they change
  it. The interface must not repeatedly reconfigure itself.
- Nonzero actionable state can promote a destination; vanity counts cannot.
- A route may be hidden from the primary rail without being removed or renamed.
- Existing users keep their data and saved view choices. The simplified default is
  for first use and for users who have not expressed a preference.

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
- Never allow it to squeeze the primary content below its usable width.

### Navigation behavior

- Browser back, forward, reload, and deep links retain their expected meaning.
- Breadcrumbs describe hierarchy; they do not duplicate global destinations.
- A single Escape closes only the topmost transient layer and returns focus to its
  opener.
- The destination name, page title, and selected navigation state must agree.
- Hidden features remain reachable in no more than two actions through **More** or
  the command palette.

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

For an established user, Home may add only information that changes the next
decision:

- continue where they left off;
- Inbox items that need triage;
- up to three recent or pinned Spaces.

Every Home card must make three things obvious without a tooltip: what it is, what
the user can do, and what will happen after the action. Additional modules can be
user-configurable later, but they are not the default.

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
| Save a tab | Button enters a brief busy state | New item appears at its destination with inline confirmation | Undo removes that saved copy |
| Change a view | Selected option updates immediately | Content settles in the chosen view and the choice persists | Reopen View and choose the prior option |
| Archive or delete | Affected row/card leaves its list | Inline notice names what changed | Undo restores it; permanent deletion requires confirmation |
| Apply a filter | Filter visibly becomes active | Result count and content update together | Clear control restores the unfiltered set and focus |
| Navigate | Selected nav state changes with the route | Page title, breadcrumb, and content agree | Back returns to the prior route and selection |

Additional rules:

- Essential controls cannot be hover-only.
- Decorative controls that do nothing cannot look interactive.
- A toast cannot contain information required to continue.
- Disabled controls explain why when the reason is not obvious.
- Drag-and-drop always has a click and keyboard alternative.
- Optimistic changes must revert visibly when persistence fails.
- Loading feedback must not shift the layout or erase the user's context.
- Overlay openers retain focus identity; Escape and completion return focus there.

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
| Home | Redesign around capture, Inbox triage, and recent Spaces rather than feature coverage |
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
