# Locus

<p align="center">
  <img src="./marketing/landing_page_demo/public/assets/locus-logo.svg" alt="Locus" width="260">
</p>

<p>
  <a href="./manifest.json"><img src="https://img.shields.io/badge/version-v3.1.0-4f46e5?style=flat-square" alt="version v3.1.0"></a>
  <a href="./manifest.json"><img src="https://img.shields.io/badge/Manifest-MV3-0f766e?style=flat-square&logo=googlechrome&logoColor=white" alt="Manifest V3"></a>
  <img src="https://img.shields.io/badge/local--first-2563eb?style=flat-square" alt="local-first">
  <img src="https://img.shields.io/badge/host%20permissions-none-16a34a?style=flat-square" alt="no host permissions">
  <img src="https://img.shields.io/badge/build-no%20build%20step-f97316?style=flat-square" alt="no build step">
</p>

**A local-first new tab workspace for saved tabs, notes, todos, reminders, and small trackers, with one-click tab hibernation that keeps memory low.**

Landing page: [docs/index.html](./docs/index.html), ready for GitHub Pages (Settings → Pages → deploy from `main`, `/docs` folder → publishes at <https://erichuang1425.github.io/locus/>). Positioning notes live in [docs/landing-page-strategy.md](./docs/landing-page-strategy.md).

Locus replaces the Chromium new tab page. It helps you save tabs, group them with notes and todos, search them later, and reopen pages without keeping every tab loaded. Data stays in `chrome.storage.local`; the extension has no account system, no server, no host permissions, and no page-content reading.

## Screenshot

![Locus workspace home screen](./docs/images/folio-workspace-screenshot.png)

Locus's home surface brings saved spaces, open tabs, search, privacy signals, and local storage status into one calm new-tab workspace.

<p align="center">
  <samp>
    <a href="#why-locus">Why</a> |
    <a href="#what-it-does">What it does</a> |
    <a href="#screenshot">Screenshot</a> |
    <a href="#install">Install</a> |
    <a href="#development">Development</a> |
    <a href="#roadmap">Roadmap</a>
  </samp>
</p>

---

### Hibernate tabs to save memory

Reopen any saved page through a light placeholder that loads the real site only when you click it. A workspace of 50 tabs costs almost nothing until you need them, the browser stays fast, and it works without host permissions or background loading. This is the core trade Locus makes: keep your context without paying for it in RAM.

## Why Locus

Browser work is rarely just tabs. A session can include research links, half-written plans, reminders, reference pages, recurring routines, and things you want to reopen later without keeping them alive forever.

Locus keeps that context in the new tab page:

- Save the current tab, every tab in a window, bookmarks, links, selections, or images.
- Organize saved context into workspaces, categories, groups, stacks, colors, and views.
- Mix tabs with notes, todos, reminders, and personal trackers without leaving the new tab page.
- Search by words, quoted phrases, color, item type, domain, URL, location, todo state, and reminders.
- Reopen saved pages directly or through a hibernated placeholder so the browser stays lighter.

## What it does

| Area | What you can do |
| --- | --- |
| Workspaces | Create multiple workspaces, bind them to browser windows, switch categories, focus a group, archive context, and undo or redo changes. |
| Saved items | Store tabs, notes, todos, stacks inside stacks, color labels, reminders, and selected batches of cards. |
| Link details | Open any item's detail pane (details button or right-click → Details…) to add a rich-text annotation, tags, custom fields, a checklist, and a color/emoji cover — every field optional, deep-linkable, and reload-safe. |
| Views | Move between board, list, focused group, and free-positioned canvas layouts depending on the kind of work. |
| Search | Combine text search with `type:`, `color:`, `domain:`, `site:`, `url:`, `in:`, `tag:`, `is:`, `has:reminder`, and `reminder:` operators. Prefix terms with `-` to exclude matches. |
| Hibernation | Open saved tabs through `suspended.html` and load the destination only when you activate it. |
| Popup | Save the current tab, save every open tab, and inspect open tabs from the extension action. |
| Tools | Use built-in Pomodoro, finance diary, subscriptions, habits, hydration, reading, goals, and workout trackers. |
| Portability | Export and import data with a versioned envelope and preview step before restore. |
| Privacy | Keep data in `chrome.storage.local`; Locus requests no host permissions and never reads page content on its own (only selections you explicitly save). |

Example search:

```text
type:tab in:work domain:github.com "pull request" -is:done
```

## Tech stack

- Platform: Chromium extension, Manifest V3
- Languages: Vanilla JavaScript, HTML, CSS
- Storage: `chrome.storage.local`
- Background runtime: MV3 service worker
- Browser APIs: tabs, storage, context menus, bookmarks, alarms, notifications
- Build tooling: none required
- CI: GitHub Actions syntax and manifest validation

## Install

1. Clone or download this repository.
2. Open `chrome://extensions/` or `edge://extensions/`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the repository folder.
6. Open a new tab to launch Locus.

After editing extension files, reload Locus from the browser extensions page.

## Usage

- Open a new tab to use the main workspace.
- Use the extension popup to save the current tab or all open tabs.
- Right-click supported browser content to save pages, links, selections, and images.
- Use groups and stacks to shape a workspace around projects, reading queues, planning areas, or recurring routines.
- Use search operators when plain text is not enough:

```text
color:red,blue type:todo -is:done
site:github.com url:/issues in:research
has:reminder reminder:overdue
tag:rust,reading -tag:archived
```

## Project structure

```text
locus/
|-- manifest.json        # MV3 manifest, permissions, commands, icons
|-- background.js        # Service worker for menus, alarms, notifications, saves
|-- newtab.html          # Main workspace shell
|-- newtab.css           # Themes, layout, components, tools, responsive styling
|-- newtab.js            # App state, rendering, search, import/export, tools
|-- popup.html           # Toolbar popup shell
|-- popup.css            # Popup styling
|-- popup.js             # Quick-save and popup tab-list behavior
|-- suspended.html       # Hibernated-tab placeholder
|-- suspended.js         # Resume logic for hibernated tabs
|-- emoji-data.js        # Emoji picker data
|-- icons/               # Extension icons
|-- DESIGN.md            # Product and visual-design notes
|-- RELEASE_NOTES.md     # Release history
`-- .github/workflows/   # CI validation
```

## Development

Locus has no package install and no build command.

Run the validation checks used by CI:

```powershell
node --check newtab.js
node --check background.js
node --check popup.js
node --check suspended.js
node --check emoji-data.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))"
node -e "const m = JSON.parse(require('fs').readFileSync('manifest.json','utf8')); if (m.manifest_version !== 3) throw new Error('manifest_version must be 3')"
```

Manual validation checklist:

- Load the unpacked extension in Chrome or Edge.
- Open a new tab and confirm the workspace renders.
- Save the current tab and all open tabs from the popup.
- Create a note, todo, group, stack, reminder, and archived item.
- Try board, list, focus, and canvas views.
- Verify search operators and negative filters.
- Export data, import it into a clean profile, and review the preview step before restore.

## Deployment

For local testing, load the repository folder as an unpacked extension.

For a packaged release:

1. Run the validation checks.
2. Confirm `manifest.json` has the intended version.
3. Zip the extension source files, excluding `.git` and local-only files.
4. Attach the zip to the GitHub release or submit it through the browser extension store workflow.

The current product release is documented in [RELEASE_NOTES.md](./RELEASE_NOTES.md).

## Privacy

Locus keeps data local:

- Stored URLs, titles, notes, todos, reminders, workspace state, and tool data live in `chrome.storage.local`.
- The extension does not request host permissions.
- The extension does not read page content on its own; the only page text it stores is a selection you explicitly right-click to save.
- Browser permissions are limited to tab workflows, storage, context menus, bookmarks import, alarms, and notifications.

| Permission | Why it is used |
| --- | --- |
| `tabs` | Save, reopen, focus, and close tabs for workspace flows. |
| `storage` | Persist local workspace and tool data. |
| `contextMenus` | Save pages, links, selections, and images from the browser context menu. |
| `bookmarks` | Import bookmarks into workspaces. |
| `alarms` | Schedule reminders and subscription alerts. |
| `notifications` | Show reminder and storage notifications. |

## Roadmap

- Add polished product screenshots for the README and browser-store listing.
- Add UI smoke tests for critical save, search, move, and restore flows.
- Expand migration coverage for import/export.
- Improve keyboard workflows, accessibility, and high-contrast support.
- Explore optional encrypted sync while preserving local-first defaults.

## License

Locus is source-available under the [Locus Research and Contribution License 1.0](./LICENSE).

Commercial use is not permitted in any kind or form. The source may be used only for noncommercial research, private study, informal personal experimentation, hobby use, and contributions back to the Locus project, unless a separate written license from the copyright holder says otherwise.
