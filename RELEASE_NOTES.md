# Release Notes

## v3.1.0

- Introduced the official Locus app mark: stacked gradient pages in blue, violet, and
  soft folded-paper highlights.
- Added a Locus-first visual system while keeping the existing app themes, including light,
  dark, Rice Paper, Lacquer, Aurora, Dracula, Nord, Rose Pine, Tokyo Night, Solarized,
  Gruvbox, Catppuccin, Sepia, and Mono palettes.
- Updated the extension popup header to use the official SVG mark instead of the older inline
  monochrome symbol.

- Renamed the product to Locus. Existing local data and exports are preserved: storage keys
  are unchanged and old `stow`, `tabento`, `tabnest`, and `tabextend` exports still import.
- New default Locus theme: a soft blue/violet signature palette. Locus Dark and the prior
  themes (Rice Paper, Lacquer, Aurora, Dark, Light, and the rest) stay available.
- Board columns restyled as bento "compartments": framed cells with a gradient top accent and a
  faint sheen. Seed categories renamed from Quicklinks/Read later to Pinned/Later.

## v3.0.0

Locus is a local-first visual workspace for browser tabs, notes, todos, stacks,
reminders, and lightweight personal tracking.

### What's Included

- New-tab workspace with board, list, group focus, and canvas views.
- Workspaces, categories, groups, nested stacks, color coding, and drag-and-drop organization.
- Saved tabs, notes, todos, reminders, archive search, undo/redo, and batch actions.
- Advanced search operators for color, type, todo state, domain, URL, containing group or stack,
  reminder presence/state, quoted phrases, and negative filters.
- Hibernated tab opening through a lightweight suspended page to reduce memory use until activation.
- Popup quick-save flow for the current tab or all open tabs.
- Built-in Pomodoro, finance, subscriptions, habits, hydration, reading, goals, and workout tools.
- Import/export support with a versioned data envelope and preview step.
- Local-first privacy posture with no host permissions.

### Compatibility

- Chrome and Microsoft Edge via Manifest V3.
- No build step required.
