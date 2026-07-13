# Locus — project guide for agents

Locus is a **local-first MV3 Chrome extension** that replaces the new tab (formerly
TabNest → Folio). Vanilla JS, **no build step, no package.json, no server** — load
unpacked from the repo root. All user data lives in `chrome.storage.local` under key
`te`. **No host permissions, ever** — the extension never reads page content and makes
no runtime network calls (product promise, see DESIGN.md §3–4).

## Read this first — which file for which task

| Task | Read |
|---|---|
| Any code change (file map, data model, invariants) | `.claude/docs/ARCHITECTURE.md` |
| What's done, what's next, known issues, slice queue | `.claude/docs/STATUS.md` |
| Validating / runtime-testing a change | `.claude/docs/VERIFY.md` |
| Design direction, visual signature, legal posture, changelog | `DESIGN.md` |
| Feature roadmap detail (layouts, calendar, onboarding) | `docs/IMPROVEMENTS.md` |
| First use, shell, Home, Calendar visibility, or motion | `docs/UX_SIMPLIFICATION.md` |
| Visual targets | `design/previews/*.png` (newest file dates win) |

Run one full improvement cycle with the `/iterate` command (`.claude/commands/iterate.md`).

## Files (one line each)

- `manifest.json` — MV3: newtab override, popup, `background.js` SW, commands
  (Ctrl+Shift+E popup, Ctrl+Shift+S save tab). Permissions: tabs, storage,
  contextMenus, bookmarks, alarms, notifications, search. No host permissions.
- `newtab.html` / `newtab.js` (~11.6k lines) / `newtab.css` — the whole newtab app.
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

- User-visible branding is **Locus**; internal storage keys stay `te` /
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
- Scope: desktop, free tier, local-only. No accounts, sync, collab, billing, mobile.
