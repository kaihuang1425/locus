# Locus Selling Points & Captivation Review

Status: **historical positioning exploration; superseded for public claims and
launch messaging.** Created: 2026-07-03. Last historical update: 2026-07-04.

> **Authority notice (2026-07-15).**
> [`PRODUCT_SUCCESS_SYSTEM.md`](PRODUCT_SUCCESS_SYSTEM.md) is now canonical for
> positioning, audience, approved claims, evidence gates, and roadmap decisions.
> The copy below is retained as a record of hypotheses, not approved public copy.
> Its absolutes, memory claims, market comparisons, and commercial calls to action
> require the evidence and owner decisions defined in the canonical claims ledger.
> [`COMPETITIVE_MOAT.md`](COMPETITIVE_MOAT.md) is likewise a historical snapshot.
> Present-tense implementation statements below describe the 2026-07-04 snapshot
> and may no longer match the worktree.

## Core selling points

1. **Keep browser context without keeping every tab alive.** Locus's strongest promise is that users can save sessions and reopen tabs through hibernated placeholders, preserving context while keeping RAM use low.
2. **A private, local-first workspace.** The app stores workspace data in `chrome.storage.local`, has no account system, no server, no host permissions, and does not read page content on its own (the only page text it stores is a selection the user explicitly right-clicks to save). This is unusually clear and defensible for a browser productivity tool.
3. **Tabs plus thinking space.** Saved tabs live beside notes, todos, reminders, stacks, tags, custom fields, checklists, and lightweight trackers, so Locus is not only a tab list; it is a small operating system for browser work.
4. **Multiple ways to view the same work.** Board, list, focused group pages, canvas, Explorer, Timeline, and Calendar surfaces let different workflows feel native instead of forcing everything into one layout.
5. **Power search without cloud indexing.** Search operators such as `type:`, `color:`, `domain:`, `url:`, `in:`, `tag:`, `is:`, `has:reminder`, `reminder:`, quoted phrases, and negation make local data feel immediately retrievable.
6. **Fast capture everywhere.** The extension can save the current tab, all open tabs, browser context-menu targets, selected text, images, links, and bookmarks, which makes capture feel low-friction.
7. **Distinct premium identity.** The stacked-page mark, Locus blue/violet signature palette, gradient accents, and bento-style organization give the product a memorable identity beyond generic tab management.
8. **No build-step simplicity.** Vanilla JavaScript, HTML, CSS, and Manifest V3 make the app easy to audit, package, and iterate without dependency or build complexity.

## Message hierarchy

The moat analysis found that Locus is the only product in the field holding all three
legs of one promise at once — full workspace (tabs+notes+todos+reminders), zero RAM cost
(hibernation), zero privacy cost (no account, no server, no host permissions). Every
competitor class is missing at least one leg, and the ones missing the privacy leg
*cannot* add it without breaking their business model. The message hierarchy should sell
that intersection, not any single leg — "local-first" alone is a word OneTab and Session
Buddy already own with 1–2M installs each.

### Hero line

**One click saves every tab in the window. Close it. Lose nothing. Leak nothing.**

The leading clause is load-bearing twice over: Locus does not auto-capture sessions —
persistence happens through explicit saves (save tab, save all tabs, save window as
workspace) — and the save-all paths are scoped to the *current window*
(`chrome.tabs.query({ currentWindow: true })` in `newtab.js` and `background.js`), so
"every tab" without "in the window" would overpromise for multi-window users. The hero
visual should show the one-click save *before* the close payoff. Two product changes
would each earn stronger copy: an all-windows save action (the popup already has an
`allWindows` query path to build on) would earn "every tab, every window," and an
automatic session snapshot would earn the unqualified "Close your browser. Lose
nothing. Leak nothing."

### One-line positioning (subline under the hero)

**Locus is a private new-tab workspace that keeps every browsing context — tabs, notes,
todos, reminders — alive at zero RAM cost and zero privacy cost.**

### Three homepage/store bullets — one per moat leg

- **Your whole context, not just tabs.** Saved pages live beside notes, todos, reminders,
  tags, and trackers in calm workspaces — the browser work *around* the tabs comes too.
- **Zero RAM cost.** Hibernation holds a 50-tab workspace at almost no memory until you
  click; keep your context without carrying the weight.
- **Zero privacy cost.** No account, no server, no host permissions — Locus never reads
  your pages on its own; the only page text it ever stores is a selection you explicitly
  right-click to save. Verify the permissions on the store listing before you install.

### Emotional hook

Most tab managers say, "close your tabs." Locus says, **"keep your context without
carrying the weight."** The trust corollary, for a category defined by extensions that
got sold, went rogue, or shut down: **"nothing to sync, nothing to sell, nothing to shut
down — your workspace can't be taken away."**

### Claim discipline (from PR #58 review)

The precise, defensible claim is **"no host permissions / no automatic page reading."**
Two overclaims to avoid:

- Never write "no permissions" or "no install warnings": the `tabs` and `bookmarks`
  permissions do surface Chrome install prompts ("read your browsing history", "read and
  change your bookmarks").
- Never write an absolute "never reads page content": the **Save selection as note**
  context-menu feature stores `selectionText` — page text the user explicitly chose to
  save. The honest framing is "never reads your pages on its own; only text you
  right-click to save."
- Never promise "lose nothing" without the save step: Locus has no automatic session
  capture — closing a window with unsaved tabs stores nothing. Copy must anchor the
  promise to the one-click save (see the hero line), or an auto-snapshot feature must
  ship first.

An overclaim would cost exactly the trust the positioning depends on. Where space
allows, disarm it proactively: "Locus never scans your pages — it stores only what
you explicitly save." (Not "only tab titles and URLs": the supported capture paths also
store bookmarks you import, selections you right-click to save, and image/link URLs.)

**Prerequisite for the hero line.** "Leak nothing" is not literally true yet: the app
currently sends saved-tab hostnames to Google's favicon service and loads Google Fonts
(see [COMPETITIVE_MOAT.md](COMPETITIVE_MOAT.md) §3.2 gaps). Ship local fonts and a local
favicon source *before* the landing page goes live with this copy; until then the proof
strip must say "no Locus server" rather than "no external calls."

## Landing page strategy (moat-aligned)

Structure the landing page (and long-form store description) in this order:

1. **Hero:** the three-leg promise above, over one calm workspace screenshot. Primary CTA
   "Add to Chrome — free", secondary "See how hibernation works".
2. **Proof strip (trust signals above the fold):** no host permissions · no account · no
   Locus server · source-available under the Locus Research and Contribution License · your data exports anytime. Each verifiable, none
   aspirational.
3. **The hero demo — hibernation with a visible number.** Show the RAM trade concretely:
   "38 tabs held, ~0 MB" on a hibernated workspace, then one click loading a single page.
   This is the shareable moment; build the page's one animation/GIF around it.
4. **The workspace story.** Tabs beside notes, todos, reminders, and search
   (`type:tab in:work domain:github.com -is:done`) — positioning against single-purpose
   tab lists without naming them.
5. **The trust section.** Speak to the category's history in general terms — extensions
   that changed owners, read-later services that shut down — and state the structural
   answer: there is no server to breach, no account to leak, no company data pipeline to
   sell. Link the privacy policy and the source code.
6. **Switching funnel — roadmap-gated.** "Bring your saves with you": import from OneTab
   exports, session JSON, and read-later export files. **Do not ship this section until
   the importers exist** — today the import flow accepts only bookmarks and the
`folio`/`stow`/`tabento`/`tabnest`/`tabextend` JSON envelopes (`newtab.js` import path), and a
   refugee whose OneTab or Pocket export gets rejected is a one-star review. Build the
   parsers first (OneTab's URL-list format and Pocket's export are simple; Session Buddy
   exports JSON), then turn this section on. Competitor names in an import-compatibility
   context are nominative use, but keep them out of taglines and ad copy per the legal
   posture in [DESIGN.md](../DESIGN.md) §2, and re-check with counsel before a paid
   launch.
7. **Footer honesty:** free for noncommercial research, contribution, and informal personal
   use, source-available, and no commercial use in any form under the repository license.
   Any separate commercial offering must use separate written terms.

Channel note: the audience that converts on leg three is documented and findable —
privacy-focused communities where "no host permissions" and "no external calls" are
stated purchase criteria. Launch/announce posts should lead with the verifiable
permission claim there, and with the RAM demo everywhere else.

## How to make the app more captivating

### 1. Start every empty state with a guided story

New users should immediately see what makes Locus different. Replace purely blank states with a polished demo workspace or onboarding path that shows:

- a saved research group with hibernated tabs,
- a note and todo beside those links,
- a reminder visible in Calendar,
- tags/details on one item,
- and a quick search example like `type:tab domain:github.com -is:done`.

The goal is to make the product's depth visible in the first 30 seconds without requiring the user to read documentation.

### 2. Make hibernation visibly rewarding

Hibernation is the clearest differentiator, but it should feel more tangible. Add a lightweight "memory saved" moment after saving a session:

- show a calm success toast such as "48 tabs saved as hibernated links",
- include a subtle RAM/weight metaphor in copy,
- surface a small hibernation badge on saved tab cards,
- and make the placeholder page feel premium, not like an error or redirect screen.

### 3. Give each workspace a stronger identity

Workspaces already have symbols and colors. Make them feel like intentional places by adding tasteful workspace header treatments:

- a compact hero strip with the workspace name, symbol, current category, and next reminder,
- optional color/emoji covers for workspaces and groups,
- and a short description or "mission" field for groups that appears in focused group pages.

This reinforces the bento metaphor: each workspace is a curated box, not just another list.

### 4. Reduce top-bar cognitive load

The app has many powerful actions. To preserve the premium big-tech feeling, avoid making the top bar read like a dense control panel:

- keep primary actions visible: search, save, layout, calendar, settings,
- move rarer modes into an overflow or command palette,
- use labeled tooltips and command-palette aliases for discoverability,
- and keep icon sizing, spacing, and hover states consistent.

Power should be available, but the default surface should feel calm.

### 5. Add intentional microinteractions

Captivation can come from small, responsive details rather than more visual effects:

- cards lift only slightly on hover,
- saved tabs glide into their group after capture,
- search filters results with a quick, restrained transition,
- calendar reschedules use a confident snap and toast,
- and reduced-motion settings remain respected.

Every animation should answer, "what just happened?" rather than simply decorate.

### 6. Turn search into a signature feature

The search syntax is powerful but hidden. Make it approachable:

- add clickable search chips for common operators,
- show two or three contextual examples below the search input,
- autocomplete operators and recent domains/tags,
- and include a "Why this matched" hint in results when advanced filters are active.

This would make Locus feel smart while staying fully local-first.

### 7. Sharpen the store-listing narrative

The best external pitch should lead with the pain and proof:

1. "Your browser is full because your work is unfinished."
2. "Locus saves that context into private workspaces."
3. "Hibernation lets you reopen pages only when needed."
4. "Notes, todos, reminders, tags, and search keep the context useful."
5. "Everything stays local; no host permissions."

Screenshots should be sequenced as: calm workspace, save-all-tabs flow, hibernated reopen, item detail pane, calendar/search.

## Recommended next product bets

1. **First-run demo workspace + onboarding tour.** Highest leverage for conversion and comprehension.
2. **Hibernation badges and post-save success moment.** Highest leverage for differentiation.
3. **Search chips/autocomplete.** Highest leverage for making existing power feel accessible.
4. **Top-bar simplification/overflow.** Highest leverage for visual polish.
5. **Premium empty states and placeholder pages.** Highest leverage for perceived quality.

## What is still missing from implementation

The app already has many foundations that support a more captivating experience: a tour shell,
toast system, hibernated placeholder page, routed layouts, calendar, item details, and a strong
visual identity. What is still missing is less about core capability and more about connecting
those pieces into an obvious first-run story.

| Gap | Current state | What is missing | Why it matters |
| --- | --- | --- | --- |
| First-run story | The product has an onboarding tour shell and functional empty states. | A curated demo workspace or guided sample data that shows tabs, notes, todos, reminders, tags, details, calendar, search, and hibernation together. | Users need to understand the product's depth before they have enough of their own data to make it shine. |
| Hibernation proof | Hibernated opening exists through `suspended.html`, and save flows show generic saved-count toasts. | Save-specific copy, badges, and success states that make hibernation feel like the hero feature. | The main differentiator should be visible at capture time, on saved tab cards, and on the placeholder screen. |
| Search discoverability | Advanced operators exist, but users must know or learn the syntax. | Search chips, operator autocomplete, recent domains/tags, and examples inside the search surface. | Power search can become a signature feature only if it feels approachable. |
| Workspace personality | Workspaces/groups have symbols, colors, and group descriptions. | A stronger workspace/group header treatment, optional covers, and “next reminder” or “current focus” context. | The app should feel like curated places, not just containers. |
| Top-bar calm | All major controls are visible and functional. | A simplified primary action set plus overflow/command-palette access for rarer modes. | Premium polish comes from prioritization, not exposing every capability equally. |
| Motion language | Animations and reduced-motion support exist in several places. | A documented motion system for capture, save, search, drag, calendar, and page transitions. | Intentional motion makes interactions understandable while avoiding visual noise. |
| Store/demo assets | README has one workspace screenshot. | A store-ready screenshot sequence and short demo script that tells the product story. | The product needs a clear external narrative for installs and conversion. |

## Further implementation plan

### Phase 1 — Make value obvious on first launch

**Goal:** a new user understands Locus in under 30 seconds.

- Add a first-run demo workspace option with realistic sample groups: Research, Planning,
  Reading, and Follow-up.
- Include one hibernated tab, one note, one todo, one reminder, one tagged/detail-rich item, and
  one example search query in that sample workspace.
- Update empty states to offer three calm actions: **Save current tab**, **Create note**, and
  **Load demo workspace**.
- Connect the existing tour to real product outcomes instead of generic UI explanation: capture,
  organize, hibernate, search, and revisit.

**Acceptance criteria:**

- A fresh install never opens into a visually blank workspace.
- The demo can be dismissed or removed without damaging user data.
- The first-run experience remains usable at extension/new-tab widths and respects reduced motion.

### Phase 2 — Make hibernation the hero interaction

**Goal:** every save/open flow reinforces “keep context without carrying the weight.”

- Change save-toasts from generic saved counts to hibernation-aware copy when hibernation is on.
- Add a small hibernation badge to saved tab cards and group/session summaries.
- Add a “loads when opened” explanation near the hibernation setting.
- Polish the suspended page with one concise benefit line, the destination title/domain, and a
  calm primary **Load now** action.

**Acceptance criteria:**

- Users can tell which saved tabs are hibernated without opening settings.
- Saving a session communicates that pages are preserved without staying active.
- The placeholder page feels intentional and premium, not like an interstitial error state.

### Phase 3 — Make search approachable

**Goal:** turn advanced search from hidden syntax into a visible advantage.

- Add operator chips below the search input for common filters: `type:tab`, `has:reminder`,
  `tag:`, `domain:`, `color:`, and `-is:done`.
- Add lightweight autocomplete for operators and known local values such as tags, domains, colors,
  and workspace/group names.
- Add two rotating examples in the search empty state.
- Consider a small “matched by” hint in filtered results for advanced queries.

**Acceptance criteria:**

- A user can discover advanced search without reading the README.
- Operator chips never crowd the main toolbar; they appear only inside the search surface.
- All suggestions are derived from local metadata and do not require host permissions.

### Phase 4 — Simplify the chrome without removing power

**Goal:** keep the premium big-tech feeling while preserving every feature.

- Audit top-bar actions into three groups: primary, secondary, and contextual.
- Keep search, save, layout, calendar, and settings immediately visible.
- Move lower-frequency actions into a polished overflow menu or command palette.
- Preserve shortcuts and tooltips so relocated features remain discoverable.

**Acceptance criteria:**

- No feature is removed; relocated actions remain reachable within one or two intentional clicks.
- Normal extension/new-tab widths avoid cramped icon clusters.
- The top bar reads as a calm navigation surface rather than a feature inventory.

### Phase 5 — Create a reusable polish system

**Goal:** keep future improvements consistent instead of adding one-off effects.

- Define motion tokens and interaction patterns for hover, press, save, drag, route changes, and
  search filtering.
- Document empty-state components, badge styles, and success-toast copy patterns.
- Add a screenshot checklist for store assets: workspace, capture, hibernation, detail pane,
  calendar, and search.
- Add UI smoke tests or scripted manual checks for first-run, save-all-tabs, search, hibernated
  open, and import/export.

**Acceptance criteria:**

- New UI additions reuse existing tokens and components.
- Motion remains lightweight and disabled for reduced-motion users.
- Store/demo materials can be refreshed from a repeatable checklist.

## What not to do

- Do not add cloud, accounts, or AI before the local-first story is unmistakable.
- Do not add more buttons to the primary chrome just because features exist.
- Do not use noisy gradients, heavy shadows, or novelty animation that conflicts with the calm bento identity.
- Do not hide privacy/no-host-permissions in a footer; it is one of the app's strongest trust signals.
