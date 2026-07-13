# Landing page strategy

Status: positioning + implementation record for `docs/index.html`. Created 2026-07-04.
Audience: future contributors and future model sessions editing the landing page. Every claim
on the page must trace back to a row in the claims inventory below. If you cannot add a row,
do not add the claim.

## Phase 1: App diagnosis

### 1. What the app actually is

A free, source-available Chrome/Edge extension that replaces the new tab with a local-first
workspace: saved tabs, notes, todos, and reminders organized into bento-style boards, with
one-click tab hibernation that keeps memory low and eight built-in tracker tools.

### 2. Likely target users

- People who keep 40+ tabs open because closing them means losing context: researchers,
  students, developers, planners.
- Privacy-conscious users who will not sign up for a cloud account to manage tabs.
- Users of Toby / Workona / TabExtend looking for a free, local, no-account alternative.
- Traditional Chinese (Taiwan) users: the app ships a full zh-TW locale.

### 3. The current landing page's biggest problem

There is no landing page. The README is the only pitch. A README cannot be a link target for
social posts, store listings, or word of mouth, and it buries the product story under
developer sections. The extension is also not on the Chrome Web Store yet, so the page must
convert a visitor into an unpacked install from GitHub, which takes honest framing.

### 4. Three strongest selling points, ranked

1. Tab hibernation: saved pages reopen through a light placeholder and load only when
   clicked, so a board of fifty saved tabs costs almost no memory. Shipped, on by default,
   and the sharpest differentiator versus "pretty new tab" extensions.
2. Local-first with zero host permissions: no account, no server, no page-content reading.
   Verifiable in 30 seconds by opening `manifest.json`. Most competitors cannot say this.
3. A workspace that is already deep: notes, todos, recurring reminders, stacks, tags, five
   layouts plus a calendar, fifteen themes, and eight built-in tools. Customization here is
   shipped code, not roadmap.

"Free" is real but works best as an amplifier attached to the other three, not as a
standalone selling point.

### 5. Weakest or least credible claims to avoid

1. Any "plugin ecosystem / marketplace / sea of plugins" claim: nothing installable exists.
   The tools are built in. Plugins are direction, not product.
2. Unscoped "free" claims: say the precise license scope instead. The repo is free for
   noncommercial research, contribution, and informal personal use, with no commercial use
   permitted in any form unless separate written terms say otherwise.
3. Social proof: there are no users counts, ratings, testimonials, or store listings to cite.
   The page must earn trust through product proof instead.

### 6. What visitors must understand in 10 seconds

This replaces my new tab with a private workspace. It saves tabs next to notes and todos,
reopens them without eating memory, keeps everything on my machine, and it is free and on
GitHub.

### 7. What visitors must feel in 10 seconds

Relief and calm. "I can finally close this window without losing my work." The page should
feel like the product: warm, quiet, arranged, nothing shouting.

### 8. What to remove, simplify, or move lower

- Search operator reference: one example query on the page, full syntax stays in the README.
- Permission-by-permission table: link to the README privacy section instead.
- Tech stack, project structure, CI: README only.
- Roadmap: one clearly labeled section at the bottom, four items maximum.

### 9. Features confirmed by the repo (claims inventory)

Every landing-page claim maps to proof at git HEAD (e18a078):

| Claim | Proof |
| --- | --- |
| Replaces the new tab | `manifest.json` `chrome_url_overrides.newtab` |
| Tab hibernation via placeholder, loads on click | `suspended.html`, `suspended.js`; setting `hibernate:true` by default in `newtab.js` |
| No host permissions, no page reading | `manifest.json` permissions list: tabs, storage, contextMenus, bookmarks, alarms, notifications only |
| No account, no server, data in `chrome.storage.local` | no network code, no auth; README Privacy section |
| Saved tabs + notes + todos + stacks + color labels | `newtab.js` item kinds; README "What it does" |
| Reminders, recurring reminders, calendar view | `newtab.js` (30 `recur` references at HEAD), calendar route; commit c0fc6ce |
| Five layouts: board, list, canvas, explorer, timeline | `newtab.js` `LAYOUT_ORDER` at HEAD (gallery/graph are uncommitted WIP, do not claim) |
| Focused group pages | `openGroupPage` in `newtab.js` |
| Eight built-in tools (Pomodoro, finance, habits, water, goals, subscriptions, reading, workout) | `FLOATING_TOOLS` registry in `newtab.js`; tools pop out as draggable floating windows |
| Search operators: type, color, domain, site, url, in, tag, is, has:reminder, reminder, quoted phrases, `-` negation | `newtab.js` search; README examples |
| Capture: popup save current/all tabs, context-menu saves (page, link, selection, image), bookmarks import, Ctrl+Shift+S | `popup.js`, `background.js`, `manifest.json` commands |
| Seventeen themes including Locus, Locus Dark, Rice Paper, and Lacquer | `themes.css` (`data-theme` blocks) |
| Seven typefaces, three densities, column widths | `newtab.html` settings (`seg-font` has 7 options) |
| Undo/redo, archive, batch actions | `newtab.js`; README |
| Export/import JSON with versioned envelope and preview before restore | README; `newtab.js` import preview |
| Privacy blur mode for screen sharing | `privacyBlur` setting in `newtab.js` |
| English + Traditional Chinese UI | `SUPPORTED_LOCALES = ['en','zh-TW']` in `newtab.js` |
| Free for noncommercial research, contribution, and informal personal use; source-available under the Locus Research and Contribution License, no build step | `README.md` License; repo layout |
| Works on Chrome and Edge, Manifest V3 | `manifest.json`, RELEASE_NOTES v3.0.0 |

### 10. Roadmap-only ideas (must not be sold as shipped)

- Plugin system / plugin library (tools are currently built in, not installable).
- Desktop companion app.
- User-owned automation (bring your own API keys).
- Optional encrypted sync (README roadmap).
- Gallery and graph layouts (uncommitted work on `work/phase-6-gallery-palette`).
- Business card scanning, and any store listing (not published anywhere yet).

## Phase 2: Positioning debate

## Position A: Defend the app

- Strongest user pain: the browser is slow and cluttered because work is unfinished. People
  keep tabs open as external memory. Locus saves that memory to disk and gives it back
  only when asked, so closing a window stops feeling like losing your place.
- Strongest proof: the code itself. Hibernation is a real file (`suspended.html`), zero host
  permissions is a real manifest line, the eight tools are real registries in `newtab.js`.
  A skeptic can verify every claim in one minute without trusting anyone.
- Strongest emotional hook: "keep your context without carrying the weight." Relief, not
  productivity hype.
- Strongest product advantage: the combination. Tab managers do not have finance diaries and
  habit streaks; dashboard new-tabs do not hibernate tabs or run without a cloud account.
  Nobody else in the category combines hibernation + local-only data + a working toolset.
- Why local-first matters: a tab manager sees everything you browse toward. Locus cannot
  phone home because there is nothing to phone: no server, no account, no host access. That
  is a structural guarantee, not a policy promise.
- Why free matters: there is no server to pay for, so there is no meter running. Free here
  is a consequence of the architecture, not a teaser for a paywall.
- Why customization matters: it is shipped in unusual depth. Fifteen themes, seven
  typefaces, five layouts, three densities, per-column widths. The new tab is the most
  visited page in a browser; people should get to decide what it looks like and what earns
  space on it.
- Why the plugin direction matters: eight built-in tools prove the workspace can host small
  utilities well. Rebuilding them as plugins turns one product into a platform without
  changing the promise: local, free core, user-controlled.
- Why this is more than a pretty new tab: pretty new tabs show a clock and a photo. Locus
  holds work: saved sessions, notes beside them, reminders that fire, tools that track. It
  is a workspace that happens to live in the new tab, not a decoration.

## Position B: Attack the app

- Unclear value risk: "customizable new tab workspace" describes fifty Chrome extensions.
  If the hero reads generic, the visitor files it under "another Momentum" and leaves.
- Weak proof: no store listing, no ratings, no user count, one screenshot. "Install unpacked
  from GitHub" filters out most non-developers immediately.
- Trust gap: an unreviewed extension asking me to sideload it is a hard sell. The page has
  no third-party signal to lean on.
- Overpromising risk: any whiff of "plugin ecosystem" reads as vaporware when there is no
  install button for a single plugin. Same for desktop apps and automation.
- Clutter risk: the app does a lot. Listing everything (layouts, operators, tools, themes,
  stacks, tags, archive, undo...) reads like a settings page and buries the differentiator.
- "Free" can sound cheap: free + sideload + no users can read as abandoned hobbyware unless
  the craft and the reasons are visible.
- Audience confusion: is this for tab hoarders, privacy people, or habit trackers? A page
  that speaks to all three at once speaks to no one.
- The emoji tools can look like a toy: eight emoji in a grid reads as a widget dump unless
  each one earns its line.

## Current-value verdict

- Strongest current selling point: hibernation. "A board of fifty saved tabs costs almost
  nothing until you click one" is concrete, felt, and testable.
- Second: local-first privacy in its verifiable form: no account, no server, no host
  permissions, blur mode, portable JSON exports.
- Third: shipped workspace depth: notes/todos/reminders beside tabs, five layouts, eight
  built-in tools, fifteen themes.
- Above the fold: product category (new-tab workspace extension), hibernation, local-first,
  source-available code, one real screenshot, one honest CTA to GitHub.
- Not above the fold: roadmap, plugin language, search syntax, theme counts, install steps,
  any future tense.

## Roadmap verdict

- Deserves a lower-page section (one line each): plugin library, desktop companion,
  user-owned automation, optional encrypted sync. All four framed as direction under an
  explicit "Planned, not shipped" label.
- Hint only: nothing else. The four items above are the whole roadmap section.
- Not mentioned yet: business card scanning (too speculative for a page with no plugin
  system), gallery/graph layouts (uncommitted), store availability, AI features, teams.
- Plugins, honest phrasing: "The eight tools are built in today. The plan is to rebuild
  them as plugins, so the workspace grows tool by tool and you add only what earns space."
- User-owned automation, honest phrasing: "Automation that runs on your keys. If Locus
  ever talks to outside services, you bring your own API keys; there is no cloud account to
  rent."
- Desktop collaboration, honest phrasing: "A desktop companion that shares the same
  local-first data as the extension."
- Tab hibernation needs no roadmap phrasing: it is shipped, and the page sells it as
  current. (The prompt that drove this work listed it as future; the repo says otherwise.)

## Final positioning decision

- Primary headline: "Your new tab, rebuilt as a local-first workspace."
  Rationale: names the category (new tab), the transformation (rebuilt, workspace), and the
  differentiator (local-first) in nine words. "Built from the tools you choose" was
  considered and rejected for the hero: tools cannot be individually installed yet, so
  "choose" slightly overstates; it survives as the tools-section idea instead.
- Supporting subheadline: "Save tabs next to notes, todos, and reminders. Reopen them
  through hibernated placeholders that load only when you click, so fifty saved tabs cost
  almost no memory. No account. Nothing leaves your machine."
- Primary CTA: "Get it on GitHub" (the only real install path today).
- Secondary CTA: "See what's inside" (anchor to the workspace section).
- CTA honesty line: "Not on the Chrome Web Store yet. Installs unpacked in about a minute."
- Top three sections after the hero: (1) the three moments: save, hibernate, find;
  (2) the workspace: layouts, items, themes; (3) small tools, one workspace.
- Claims removed: plugin marketplace, sea of plugins (page uses it nowhere), unscoped free claims,
  desktop app as present tense, any user/rating/testimonial signal, gallery/graph layouts.
- Claims softened: "plugins" appears only inside the labeled roadmap section, future tense;
  sync appears only as "optional, exploratory" per README roadmap.
- Claims strengthened: hibernation promoted from feature-list row to hero + own section;
  "no host permissions" stated plainly and linked to the manifest; tools presented as
  shipped with a count (eight) instead of vague "many utilities".
- Premium moves: the accent gradient appears only as 2px hairlines (card tops, frame edge);
  everything else is solid ink; Locus/Locus Dark palettes lifted from `themes.css` so the page matches
  the product; generous section spacing; sentence-case headings; one screenshot, framed;
  no stock art, no fake browser mockups with invented data; a light/dark toggle and an
  EN/蝜葉 toggle that quietly prove "your workspace, your rules" on the page itself.

## Phase 3: Selling-point test results

| Candidate | Verdict | Where it landed |
| --- | --- | --- |
| Free when scoped | Too broad unless scoped | Trust chips + install section as "Free for noncommercial research, contribution, and informal personal use"; never as "forever" or as permission for commercial use |
| Local-first / user owns data | True and verifiable | Hero subline + dedicated privacy section |
| Highly customizable | True with unusual depth (15 themes, 7 fonts, 5 layouts, 3 densities) | Workspace section with real theme swatches |
| Plugin-powered direction | Not built; tools are built-in | Roadmap only, future tense, explicitly labeled |
| Practical utilities | True: 8 tools shipped, pop-out floating windows | Own section "Small tools, one workspace" |
| User-owned automation | Not built | Roadmap, one line |
| Desktop + extension | Not built | Roadmap, one line |
| Tab hibernation | Shipped and on by default | Hero + "Reopen only what matters" card |
| Business card scan | Not built, no plugin system to host it | Omitted from the page |

## Copy rules used (for future edits)

Use these copy rules for future edits:

1. No em dashes. Use commas, colons, periods.
2. Sentence-case headings.
3. Banned on this page: seamless, powerful, beautiful, intuitive, revolutionary, all-in-one,
   effortless, ultimate, supercharge, unlock, reimagine, leverage, robust, comprehensive,
   ecosystem (as marketing), "sea of plugins" in the hero.
4. Every feature line answers "why does this matter", not "what setting exists".
5. Numbers over adjectives: eight tools, fifteen themes, five layouts, six permissions,
   about a minute, fifty tabs.
6. Future features only inside the roadmap section, only in future tense, under a visible
   "Planned, not shipped" label.
7. zh-TW copy is written for Taiwan, not translated word-by-word: ?? (tabs), 撌乩??
   (workspace), 隡? (hibernation), 閮擃?(memory), ?游?? (extension), 銵???
   (calendar), 敺齒 (todos), 鞈? (data), ???交撠????(Chrome's actual zh-TW UI
   string for Load unpacked). Use 雿? not ?? Never mainland terms (??, ?唳, ?辣 for
   this context; use 憭?/?辣 carefully: the page uses ????for plugins, Taiwan usage).
8. Match terminology with the app's own zh-TW locale table in `newtab.js` before inventing
   new translations.

## Implementation notes

- Page lives at `docs/index.html`: single self-contained file (inline CSS/JS, no build
  step, matching the repo convention). Images live in `docs/images/` because GitHub Pages
  will serve the `docs/` folder as the site root.
- Publishing is a manual owner step: GitHub repo Settings, Pages, "Deploy from a branch",
  branch `main`, folder `/docs`. Expected URL: <https://erichuang1425.github.io/locus/>.
- Both signature palettes are lifted from `themes.css` (`folio`, `folio-dark`). If those tokens
  change, update the `:root` blocks in `docs/index.html` to match.
- The language toggle stores `tabento-landing-lang` in localStorage and defaults from
  `navigator.language`. The theme toggle stores `tabento-landing-theme` and defaults from
  `prefers-color-scheme`.
- The demo screenshot is `docs/images/tabento-workspace-demo.png` (real UI, rice-paper
  theme). Replace it with a store-quality sequence when one exists; keep it real UI only.
- DESIGN.md legal note applies to marketing too: never reuse TabExtend's or Refern's copy,
  taglines, or assets.

## Remaining weaknesses

1. No third-party trust signal. Until a store listing exists, the CTA asks non-developers
   to sideload. Shipping to the Chrome Web Store is the single highest-leverage fix for
   this page.
2. One screenshot. The page needs a sequence eventually: capture flow, hibernated reopen,
   detail pane, calendar, search. Real UI only.
3. The Pages site is not enabled yet; until the owner flips it on, `docs/index.html` is
   only reachable raw.
4. "Free" needs scope: the page must keep saying free for noncommercial research,
   contribution, and informal personal use, never phrasing that implies unlimited free use or
   commercial permission.
5. No analytics or feedback loop, by design (local-first page for a local-first product).
   Conversion cannot be measured; treat GitHub stars/traffic as the rough proxy.
