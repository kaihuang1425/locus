# Locus architecture map

Everything below was verified against the code on 2026-07-13. Line numbers drift —
anchor by the function/const names given here (grep them).

## Data model (chrome.storage.local, key `te`)

```
{
  schema: 11,                   // CURRENT_SCHEMA in newtab.js; migrate() upgrades old data
  activeWsId,
  workspaces: [{
    id, name, symbol?, windowId?,          // windowId ← auto-switch binding
    activeCatId,
    categories: [{                          // "Spaces" in the UI
      id, name, symbol,
      groups: [{ id, name, symbol, color, collapsed, items: [Item] }]
    }]
  }],
  archive: [ArchiveEntry],       // deliberately hidden groups/items; durable until restored/deleted
  trash: [TrashEntry],           // ArchiveEntry envelope + trashedAt; auto-purged after 30 days
  settings: { ... }              // see below
}
```

`Item.type` ∈ `tab | note | todo | stack` (stack nests `items[]`). Optional item
fields (schema 5+): `favorite`, `readLaterAt`/`readAt`, `tags[]`, `notes` (rich text),
`customFields[]`, `checklist[]`, `cover {color|emoji}`, `color`, reminder fields,
`createdAt`. Tabs carry `url`, `fav` (favicon URL), `title`.

Key `settings`: `theme size font width language showUrls animate confirmDelete
blurPrivacy autoSwitchWorkspace hibernate closeTabOnSave sidebarCollapsed
railCollapsed`, capture prefs (`captureAskEveryTime captureDefaultCategoryId
captureRememberLast captureLastTarget captureDeduplicate captureIncludeTitle
captureIncludeFavicon`), `profile {name purpose workflow}` (welcome questionnaire;
`profile.name` drives the home greeting), `plugins {...}` (tools-hub toggles),
`onboarding {welcomeSeen hintsSeen disabled}` (schema 6).
`showLanding` controls the calm new-tab launch layer (schema 7; absent legacy
values migrate to `true`).
Popup hibernate preferences (`popupHibernateScope`,
`popupHibernateKeepPinned`, `popupHibernateKeepAudio`) are schema 8 settings;
absent values retain the original current-window / keep-pinned / keep-audio
behavior.
`popupSaveMode` is a schema 9 setting; absent values migrate to the session-group
save behavior.
Schema 10 adds top-level `trash[]`. Existing archive entries stay archived; moving
one to Trash preserves its restore metadata and adds `trashedAt`. `purgeExpiredTrash()`
runs on load and removes valid entries after 30 days while preserving malformed
imports for lossless export/error reporting.
Schema 11 extends `popupHibernateScope` with `selected`, persists the live
`popupHibernateSelectedTabIds[]` selection (stale ids are removed against
`chrome.tabs` whenever the popup opens), and adds the opt-in
`popupHibernateSaveBefore` safety setting. Existing profiles keep current-window
scope and do not save implicitly before hibernating.

`localStorage.te_settings_mirror` mirrors theme/size/font/width/anim/language for the
pre-paint inline script in newtab.html (prevents theme flash). Keep both in sync via
`applySettings()` — never write it by hand.

## newtab.js section index (grep anchors)

| Concern | Anchors |
|---|---|
| Schema + i18n | `CURRENT_SCHEMA`, `I18N`, `tr(`, `applyLocale` |
| Router (hash routes) | `const Router`, `Router.sync` |
| State store (load/persist/undo/redo) | `const State`, `State.snapshot`, `persistNow` |
| Migrations | `function migrate()` |
| Storage quota UI | `refreshStorageUsage`, `showStorageFull`, `STORAGE_QUOTA` |
| Settings page (full-page surface) | `SETTINGS_SECTIONS`, `setSettingsSection`, `renderShortcutsSettings`, `renderStorageSettings`, `renderAboutSettings`, `openSettingsDrawer` |
| Capture settings | `renderCaptureSettings`, `captureTogs` (inside `applySettings`) |
| Apply settings → DOM | `applySettings` (body datasets, seg/toggle sync) |
| Focus/overlay infra | `rememberOpener`, `restoreOpener`, `focusFirstIn`, `trapTabKey` |
| Home surface | `renderHome`, `buildProjectsRow`, `homeAccentColor`, `homeCardIconHtml` |
| Zen launch layer | `showLandingLayer`, `renderLandingLayer`, `paintLandingResults`, `bindLandingLayer` |
| Library surfaces | `openLibrarySurface`, `renderLibrarySurface`, `renderReadLaterSurface`, `renderArchiveSurface`, `renderTrashSurface`, `collectWorkspaceTabs`, `toggleFavorite`, `toggleReadLater` |
| Archive + Trash lifecycle | `archiveItem`, `archiveGroup`, `moveArchiveEntriesToTrash`, `restoreStoredEntries`, `permanentlyDeleteTrashEntries`, `purgeExpiredTrash` |
| Board layouts | `renderBoard`, `renderListView`, `renderCanvasView`, `renderExplorerView`, `renderTimelineView`, `renderGalleryView`, `renderGraphView` |
| Group pages + item detail | `openGroupPage`, `renderItemDetail` (route `?item=<id>`) |
| Calendar | `openCalendar`, `renderCalendar` |
| Search + operators | `renderSearchSurface`, `collectWorkspaceItems`, `searchItemMatches`, `applySearchFilter`, operators `type: is: domain: site: url: in: tag: color:` with `-` negation |
| Command palette | `openCommandPalette`, `buildPaletteCommands`, `_palSavedLinkCommand` |
| Shared empty states | `buildSystemEmptyState`, `buildEmptySpaceState`, `SYSTEM_EMPTY_ICONS` |
| App menu / About / Welcome | `openAppMenu`, `openAbout`, `openWelcome`, `wcShow` |
| Tools hub (plugins) | `openToolsHub`, overlays `pomo/fin/habit/water/books/goals/workout/subs` |
| All bindings | `function init()` at the bottom — global Escape handler + `_escBlockers` list |

## Surfaces & navigation

One page, many surfaces, switched by state flags + `#board` mode classes:
`activeHome` (home-mode), `activeSearch` (search-mode), `activeLibraryMode`
(`all|favorites|read-later|archive|trash`), `activeGroupPage`, `activeCalendar`,
else the active category board. The settings
page (`#settings-drawer`) and tools overlays sit above as fixed overlays. Router
syncs hash routes so surfaces survive reload/back.

`#landing-layer` is the default new-tab launch view when
`settings.showLanding !== false`. It is a fixed layer above Home, not a router
surface: Escape, the chevron, or downward wheel motion dismiss it for the current
page and reveal the already-rendered Home. Its counts come from the active
category's Inbox and `collectReminders()`. Saved-link typeahead reads
`collectWorkspaceTabs()` and the shared `parseSearchQuery()` operator parser;
web submission uses `chrome.search.query()` (manifest `search` permission) so the
browser's configured default engine remains authoritative.

The command palette is an overlay, not a route. `buildPaletteCommands()` rebuilds
its localized actions from current workspace/Space/group/layout state whenever it
opens; recent and query link rows come from `collectWorkspaceTabs(activeWs())` and
reuse the board's local operator matcher. Commands must call existing navigation,
capture, settings, and persistence paths rather than maintaining parallel state.

Search is a first-class `…/search` route. Query text, type/Space/time/tag filters,
sort, filter-panel visibility, and selected result ride its hash query so reload,
back, and forward restore the view without a schema field. `collectWorkspaceItems()`
walks links, notes, tasks, stacks, and nested stack contents; `searchItemMatches()`
is the data-level operator matcher reused by the launch layer and command palette.
The older hidden `#search-bar`/`applySearchFilter()` path remains as the layout DOM
filter used after board/list/canvas/gallery renders; do not make it a second public
search entry point.

`buildSystemEmptyState()` is the shared presentation and behavior contract for
zero-data and no-match states across Home, Spaces/groups, Search, Library, Read
Later, Archive, and Trash. Give it a surface-specific title/body and at most two
real recovery actions; callbacks must reuse existing navigation, capture, import,
filter-reset, and persistence paths. Use `buildEmptySpaceState()` for empty boards
and keep compact states inside constrained group/filter contexts. Do not add
decorative placeholder controls or actions that cannot complete their label.

## Settings page specifics (since 2026-07-12)

`#settings-drawer` is a full-page surface: left rail `#drawer-tabs` with `.dt`
buttons (sections: general, appearance, capture, shortcuts, privacy, storage, data,
about), panes `#dp-<section>`, header `#sp-title`/`#sp-sub`. The element id and all
control ids are the drawer's originals — bindings, deep-links
(`openSettingsDrawer('capture')`), and the Escape stack depend on them. Legacy
section names map inside `setSettingsSection` (`behavior→general`,
`archive→storage`). CSS lives under `/* ═══ SETTINGS PAGE ═══ */` + `.sp-*` classes
in newtab.css; rail folds to a top strip below 880px.

## Cross-file invariants

- `media/fonts/fonts.css` is the shared, local-only font source for `newtab.html`
  and `popup.html`. Its WOFF2 files and OFL notices live beside it; keep the
  selectable family names and weight/style ranges aligned with `newtab.css`.
- `isDarkTheme()` (newtab.js) and the inline `DARK` map in newtab.html head must list
  the same dark theme ids; both feed `body[data-theme-mode]`.
- background.js and popup.js each re-implement `captureFields` /
  `resolveCaptureTarget` (no shared modules — plain scripts). Changing capture
  semantics means touching all three copies (newtab.js has `captureTabFields`).
- `esc()` is the HTML-escape helper — required for any user data in `innerHTML`.
- Toasts: `toast(msg, {danger, duration})`; undoable actions pair
  `State.snapshot(label)` before mutation.
- Category home-card icons map names → bundled art in
  `media/locus_icons_one_folder_badge_nobg/set1-<name>-{light,dark}.png`
  (`homeCardIconName`).
