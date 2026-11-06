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

**A local-first, explicit save-and-recover workspace for tabs, notes, todos, and reminders. Locus is currently a noncommercial research alpha.**

Candidate landing page: [docs/index.html](./docs/index.html). It remains `noindex` and must not be promoted until owner decision O-08 and public-truth gate P0-13 are closed in the [Product Success System](./docs/PRODUCT_SUCCESS_SYSTEM.md). The older [landing-page strategy](./docs/landing-page-strategy.md) is retained as a historical implementation record.

Locus replaces the Chromium new tab page. It helps you deliberately save tabs, group them with notes and todos, find them later, and reopen saved destinations when you choose. Workspace data is stored in `chrome.storage.local` in this browser profile; export backups are user-managed, and uninstalling the extension or deleting the profile removes that local data. The extension has no Locus account, no Locus backend, and no host permissions. Saved-content search stays inside Locus; opening a saved destination contacts the destination site through the browser.

<p align="center">
  <samp>
    <a href="#why-locus">Why</a> |
    <a href="#what-it-does">What it does</a> |
    <a href="#install">Install</a> |
    <a href="#development">Development</a> |
    <a href="#roadmap">Roadmap</a>
  </samp>
</p>

---

### Save a page, then recover it when it matters

Saved pages can reopen through a packaged placeholder that waits for you before navigating to the destination. Locus stores the saved reference instead of treating every saved item as a live browser tab. The intended trade is simple: close work deliberately without losing where it belongs, then recover it on demand.

## Why Locus

Browser work is rarely just tabs. A session can include research links, half-written plans, reminders, reference pages, recurring routines, and things you want to reopen later without keeping them alive forever.

Locus keeps that context in the new tab page:

- Save the current tab, eligible tabs in a window, bookmarks, links, selections, or images.
- Organize saved context into workspaces, categories, groups, stacks, colors, and views.
- Mix tabs with notes, todos, and reminders without leaving the new tab page.
- Search by words, quoted phrases, color, item type, domain, URL, location, todo state, and reminders.
- Reopen saved pages directly or through a hibernated placeholder so the browser stays lighter.

## What it does

| Area | What you can do |
| --- | --- |
| Workspaces | Create multiple workspaces, bind them to browser windows, switch categories, focus a group, archive context, and undo or redo changes. |
| Saved items | Store tabs, notes, todos, stacks inside stacks, color labels, reminders, and selected batches of cards. |
| Link details | Open any item's detail pane (details button or right-click → Details…) to add a rich-text annotation, tags, custom fields, a checklist, and a color/emoji cover — every field optional, deep-linkable, and reload-safe. |
| Views | Keep board and list in the core path; open canvas, explorer, timeline, gallery, or graph from Advanced views when needed. |
| Search | Combine text search with `type:`, `color:`, `domain:`, `site:`, `url:`, `in:`, `tag:`, `is:`, `has:reminder`, and `reminder:` operators. Prefix terms with `-` to exclude matches. |
| Hibernation | Open saved tabs through `suspended.html` and load the destination only when you activate it. |
| Popup | Save the current tab, save eligible open tabs, and inspect open tabs from the extension action. |
| Portability | Export and import data with a versioned envelope and preview step before restore. |
| Privacy | Keep workspace data in `chrome.storage.local`; Locus requests no host permissions and does not inspect page content on its own. Explicit context-menu capture can save the page, link, selection, or image URL you choose. |

Example search:

```text
type:tab in:work domain:github.com "pull request" -is:done
```

## Tech stack

- Platform: Chromium extension, Manifest V3
- Languages: Vanilla JavaScript, HTML, CSS
- Storage: `chrome.storage.local`
- Background runtime: MV3 service worker
- Browser APIs: tabs, storage, context menus, bookmarks, alarms, notifications, favicon
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

### If a new tab opens something other than Locus

Only one extension can replace the new tab page. When two installed extensions both replace it, the browser uses the one installed most recently, and it also falls back to the other one whenever Locus is turned off or fails to load. For example, the Custom New Tab extension redirects new tabs to whatever site it is set to, such as Google.

1. Open `brave://extensions/`, `chrome://extensions/`, or `edge://extensions/`.
2. Find the other extension that changes the new tab page.
3. Turn it off with its toggle, or choose **Remove**.
4. Open a new tab. Locus loads.

Do not remove and re-add Locus to win the new tab back. Removing Locus deletes its saved data in that browser profile.

## Usage

- Open a new tab to use the main workspace.
- Use the extension popup to save the current tab or eligible open tabs.
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
- Save the current tab and eligible open tabs from the popup.
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

Historical repository release notes are recorded in [RELEASE_NOTES.md](./RELEASE_NOTES.md); they do not by themselves evidence public distribution of the current worktree.

## Privacy

Locus stores workspace data locally:

- Stored URLs, titles, notes, todos, reminders, workspace state, and tool data live in `chrome.storage.local`.
- Uninstalling the extension or deleting this browser profile removes that storage. Exported JSON backups are user-managed and future import compatibility must be verified per release.
- The extension does not request host permissions.
- The extension has no Locus account or Locus backend. Its extension-page content security policy blocks extension-directed network connections.
- The extension does not inspect page content on its own. Context-menu actions can save the page, link, selected text, or image URL you explicitly choose.
- Opening a saved destination is a user-initiated browser action that contacts the destination site. Saved-content search does not submit the query to a web search provider.
- Browser permissions are limited to the seven capabilities explained below. There are no host permissions.

| Permission | Why it is used |
| --- | --- |
| `tabs` | Save, reopen, focus, and close tabs for workspace flows. |
| `storage` | Persist local workspace and tool data. |
| `contextMenus` | Save pages, links, selections, and images from the browser context menu. |
| `bookmarks` | Import bookmarks into workspaces. |
| `alarms` | Schedule reminders and subscription alerts. |
| `notifications` | Show reminder and storage notifications. |
| `favicon` | Display site icons through Chromium's packaged favicon API without contacting a third-party favicon service. |

## Roadmap

The canonical roadmap is the evidence-gated [Product Success System](./docs/PRODUCT_SUCCESS_SYSTEM.md). Near-term work is intentionally focused on proving the save → close → find → reopen loop, data durability, import/export recovery, accessibility, and truthful distribution claims. Ideas are not presented as commitments until they pass the gates defined there.

## License

Locus is a noncommercial research alpha, source-available under the [Locus Research and Contribution License 1.0](./LICENSE).

Commercial use is not permitted in any kind or form. The source may be used only for noncommercial research, private study, informal personal experimentation, hobby use, and contributions back to the Locus project, unless a separate written license from the copyright holder says otherwise.
