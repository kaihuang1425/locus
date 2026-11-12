# Locus privacy policy

Effective: 12 November 2026 · Applies to Locus 3.1.1

Locus is a browser extension maintained by I-Kai Huang. It replaces your new tab with a place to save and recover tabs, notes, tasks and reminders. This policy also describes its optional local planning companion. Locus is currently a noncommercial research alpha.

## What stays in your browser

Locus stores workspace data and preferences in `chrome.storage.local`, within the browser profile where it is installed. It has no Locus account, hosted database, advertising service or analytics service. It does not sell user data or send usage reports to the developer. Local storage is not an encrypted vault provided by Locus.

| Data | Why Locus handles it |
| --- | --- |
| Open-tab URLs, titles, favicon references and tab/window state | Show open tabs, save your chosen tabs, restore saved destinations and manage hibernation. |
| Imported bookmark titles, URLs and folders | Import bookmarks when you choose that action. |
| Pages, links, selected text and image URLs you explicitly capture | Keep material you choose from the browser context menu. Locus has no host permissions or content scripts that automatically read page bodies. |
| Notes, task text, tags, checklists, annotations, reminders and organization | Present, search, edit, schedule and recover your saved work. |
| Task completion, focus sessions, reading and habit entries | Display your own progress within optional tools. These are not developer analytics. |
| Spending, budgets and subscription entries you type | Run the optional personal finance and subscription tools locally. Locus does not access bank accounts or process payments. |
| Water and workout entries you type | Run the optional hydration and exercise tools locally. Locus does not access medical records or device health services. |
| Preferences and imported legacy profile fields | Restore your settings and preserve backup compatibility. A name in an older backup may remain stored even though the current interface no longer asks for it. |
| Planning briefs, returned drafts and local companion pairing information | Support the optional planning workflow described below. |

Free-text fields and imports can contain personal information you choose to put there. Avoid storing secrets that you would not want accessible to someone with access to your browser profile. Screen-sharing blur only hides some visible text; it does not encrypt or remove data.

## Connections and sharing you choose

The extension bundles its scripts, fonts and other interface assets. Extension pages block network connections with a Content Security Policy containing `connect-src 'none'`. Favicons use Chromium's local favicon endpoint. Locus does not download executable code. Opening a saved destination navigates your browser to that website; the destination's own privacy policy then applies.

Export creates a backup file on your device. Import reads the file you select and shows a restore preview. You decide whether to send a backup to anyone else. A backup may contain all the saved information listed above.

AI planning is optional. You can copy a planning brief into a separate assistant or connect the separately installed local companion. A brief contains the goals, constraints and text you enter. Sharing existing calendar busy times is optional and off by default; the brief uses time ranges, not event titles. Review the brief before sending it. Any assistant or command-line provider you use may send the supplied material to its own servers under its own terms and privacy policy. Locus does not supply an AI subscription or silently send your workspace to a model.

The optional `nativeMessaging` permission is requested when you choose Connect. The companion communicates locally using Native Messaging and stdio MCP. It stores pairing records, a bounded request history and pending drafts in its own local Locus Planner directory. It does not open an HTTP listener. Turning off the connection stops extension access; it does not erase files previously written by the companion or another assistant.

## Retention and your controls

You can edit saved entries, archive them, move them to Trash and restore them. Archive entries remain until you remove them. Valid Trash entries expire after 30 days; you can also permanently delete them. Local preferences and active workspace data remain until changed, removed, or the browser profile is cleared. Uninstalling the extension normally removes its browser-local storage, so export a backup before uninstalling.

Downloaded backups remain wherever you saved them. Optional companion data is separate from extension storage and also remains after extension uninstall. Its queues and histories have bounds and expiry rules documented in the companion README; remove its local data separately if you want it erased. The developer cannot recover, inspect or delete data stored only on your device.

## Limited use

Locus uses the data it handles only to provide the features you choose. It does not sell data, use it for advertising, provide it for credit or lending decisions, or transfer it for unrelated purposes. Use and transfer of information received through Chrome APIs follows the Chrome Web Store User Data Policy, including its Limited Use requirements.

## Contact and changes

For privacy questions, open an issue at https://github.com/kaihuang1425/locus/issues. Issues are public: describe the problem without attaching sensitive workspace data or credentials. This policy's effective date will change when its description of data handling changes.
