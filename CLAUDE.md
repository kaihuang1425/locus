# Locus — project guide for agents

Locus is a **local-first MV3 Chrome extension** that replaces the new tab (formerly
TabNest → Folio). Vanilla JS, **no build step, no package.json, no server** — load
unpacked from the repo root. All user data lives in `chrome.storage.local` under key
`te`. **No host permissions, ever.** The current worktree is designed to make no
extension-directed external requests: packaged assets, Chromium's local `_favicon`
endpoint, and `connect-src 'none'`. That boundary still needs an unpacked-extension
runtime network audit. User-directed actions such as opening a saved URL or submitting
a query through `chrome.search` can, of course, navigate the browser to the network.

## Read this first — which file for which task

| Task | Read |
|---|---|
| Product thesis, target user, claims, evidence gates, or roadmap priorities | `docs/PRODUCT_SUCCESS_SYSTEM.md` |
| Any code change (file map, data model, invariants) | `.claude/docs/ARCHITECTURE.md` |
| What's done, what's next, known issues, slice queue | `.claude/docs/STATUS.md` |
| Validating / runtime-testing a change | `.claude/docs/VERIFY.md` |
| Design direction, visual signature, legal posture, changelog | `DESIGN.md` |
| First use, shell, Home, Calendar visibility, or motion | `docs/UX_SIMPLIFICATION.md` |
| Historical feature rationale and implementation record | `docs/IMPROVEMENTS.md` |
| Visual references (never automatic authority, regardless of timestamp) | `design/previews/*.png` |

Run one full improvement cycle with the `/iterate` command (`.claude/commands/iterate.md`).

## Files (one line each)

- `manifest.json` — MV3: newtab override, popup, `background.js` SW, commands
  (Ctrl+Shift+E popup, Ctrl+Shift+S save tab). Permissions: tabs, storage,
  contextMenus, bookmarks, alarms, notifications, search, favicon. No host
  permissions.
- `newtab.html` / `newtab.js` (~14k lines) / `newtab.css` — the whole newtab app.
- `themes.css` — all theme palettes as `[data-theme]` CSS vars (default `folio` / `folio-dark`).
- `popup.*` — capture UI (quick-capture honors the `capture*` settings).
- `background.js` — context menus, capture target resolution, quota notifications.
- `suspended.html/js` — hibernated-tab placeholder page.
- `emoji-data.js` — emoji picker data.
- `docs/` — **public** GitHub Pages landing + strategy docs. Not agent docs.
- `design/` — previews (PNG visual targets), static fixtures, icon explorations.
  NOT the extension; see `design/README.md`.
- `marketing/landing_page_demo/` — standalone Cloudflare demo site. NOT the extension.

## Hard project rules

- **Locus is the current working name, not a cleared public brand.** Keep it in the
  implementation until owner decision O-03 is resolved, but do not finalize Store,
  domain, or paid assets around it. Internal storage keys stay `te` /
  `te_settings_mirror` for data continuity. Import must keep accepting legacy
  `stow`/`tabento`/`tabnest`/`tabextend` envelopes.
- Persistent-data changes go through the schema: bump `CURRENT_SCHEMA` (newtab.js) +
  extend `migrate()`; absent fields must mean today's behavior.
- Element IDs are load-bearing (`init()` binds by `getElementById`). Keep IDs when
  moving markup; guard new bindings with existence checks.
- Every `data-i18n` key must exist in `I18N.en` in newtab.js (missing keys render as
  raw key text); add zh-TW too. `applyLocale()` overwrites `textContent`, so put
  `data-i18n` only on leaf text elements.
- Motion must respect `body[data-anim="off"]` and `prefers-reduced-motion`
  (global CSS rules already gate `animation`/`transition`).
- New overlays join the Escape stack: `rememberOpener`/`restoreOpener`,
  `trapTabKey`, and the `_escBlockers` list in `init()`.
- Ship log: append a dated entry at the **end** of `DESIGN.md` §6 changelog
  (ascending order) for every completed slice, and update `.claude/docs/STATUS.md`.
- Scope: desktop, single browser profile, local-only **noncommercial research alpha**
  under the current license. No accounts, sync, collaboration, billing, or mobile.
  Do not describe it as a general-market free tier unless the owner resolves the
  license and business model.
