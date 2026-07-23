/* ═══════════════════════════════════════════════════════════════
   Locus — newtab.js (v3)
   ═══════════════════════════════════════════════════════════════ */

// Schema version of the in-storage state. Bump when state shape changes,
// then add a forward-migration branch in migrate(). Older builds reading
// data stamped with a higher value get a blocking "newer data" guard.
const CURRENT_SCHEMA = 12;

const SUPPORTED_LOCALES = ['en', 'zh-TW'];

function browserLanguage() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const lang = (Array.isArray(nav.languages) && nav.languages[0]) || nav.language || 'en';
  return normalizeLanguage(lang);
}

function normalizeLanguage(value) {
  const lang = String(value || 'en').trim();
  if (/^zh(?:[-_]|$)/i.test(lang)) return 'zh-TW';
  return SUPPORTED_LOCALES.includes(lang) ? lang : 'en';
}

function appLocale() {
  return normalizeLanguage(State.get().settings.language || browserLanguage());
}

const I18N = {
  en: {
    'shell.openTabs': 'open tabs',
    'shell.filterTabs': 'Filter tabs',
    'action.collapseSidebar': 'Collapse sidebar',
    'action.newWorkspace': 'New workspace',
    'action.allWorkspaces': 'All workspaces',
    'action.newSpace': 'New space',
    'action.undo': 'Undo (Ctrl+Z)',
    'workspaceManager.title': 'Workspaces',
    'workspaceManager.yours': 'Your workspaces',
    'workspaceManager.items': '{count} items',
    'action.tools': 'Tools (Pomodoro, Finance, Subs...)',
    'action.switchLayout': 'Switch layout',
    'action.calendar': 'Calendar (reminders)',
    'action.selectionMode': 'Selection mode',
    'action.reorderMode': 'Reorder mode',
    'action.search': 'Search ( / )',
    'action.cycleTheme': 'Cycle theme',
    'action.saveAllTabs': 'Save eligible open tabs',
    'action.saveTab': 'Save tab',
    'action.saveCopy': 'Save a copy to Inbox',
    'action.saveClose': 'Save to Inbox and close tab',
    'action.saveCandidate': 'Choose what happens to this tab',
    'welcome.taskTitle': 'Keep one tab without keeping it open',
    'welcome.taskDescription': 'Save a real tab to your Inbox, then Locus will show you exactly where it went.',
    'welcome.looking': 'Looking for an open tab…',
    'welcome.empty': 'No saveable tab is open yet. Explore Locus, then use the toolbar popup from any page.',
    'welcome.error': 'Locus couldn’t check your open tabs. Try again, or explore without saving.',
    'welcome.retry': 'Try again',
    'welcome.explore': 'Explore on my own',
    'welcome.save': 'Save this tab',
    'action.more': 'More',
    'action.settings': 'Settings',
    'action.reminders': 'Reminders',
    'action.plugins': 'Plugins',
    'action.menu': 'Menu',
    'menu.settings': 'Settings',
    'menu.plugins': 'Plugins',
    'menu.calendar': 'Calendar & reminders',
    'menu.theme': 'Theme',
    'menu.workspaces': 'Workspaces',
    'menu.guide': 'Guide / tutorial',
    'menu.about': 'About Locus',
    'about.tagline': 'A calmer home for explicitly saved tabs, notes, tasks, and reminders.',
    'about.private': 'Privacy boundaries — browser-profile storage (export before uninstalling or deleting the profile), no Locus account or backend, and no host permissions.',
    'about.replay': 'Replay welcome guide',
    'about.close': 'Close',
    'plugins.title': 'Plugins',
    'plugins.subtitle': 'Built-in mini-apps — turn on what you need',
    'cal.addTask': 'Add a task on this day…',
    'cal.addPrompt': 'New task for {date}:',
    'cal.added': 'Task added for {date}',
    'cal.needSpace': 'Create a space first to add tasks',
    'settings.title': 'Settings',
    'settings.appearance': 'Appearance',
    'settings.behavior': 'Behavior',
    'settings.archive': 'Archive',
    'settings.data': 'Import & Export',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.language.en': 'English',
    'settings.language.zhTW': 'Traditional Chinese',
    'settings.language.hint': 'New users start with the closest supported browser language.',
    'settings.itemSize': 'Item size',
    'settings.size.compact': 'Compact',
    'settings.size.normal': 'Normal',
    'settings.size.large': 'Large',
    'settings.columnWidth': 'Column width',
    'settings.width.narrow': 'Narrow',
    'settings.width.normal': 'Normal',
    'settings.width.wide': 'Wide',
    'settings.fontFamily': 'Font family',
    'settings.closeTabs': 'Close tabs when saved',
    'settings.hibernate': 'Open saved tabs hibernated',
    'settings.hibernateHint': 'opens a placeholder; the site loads only after you continue',
    'settings.showUrls': 'Show URLs on cards',
    'settings.animations': 'Animations',
    'settings.privacyBlur': 'Privacy blur mode',
    'settings.privacyBlurHint': 'blur all content (for screen sharing)',
    'settings.autoSwitch': 'Auto-switch workspace on window focus',
    'settings.autoSwitchHint': 'each workspace tied to a browser window',
    'settings.showTour': 'Replay welcome',
    'settings.shortcuts': 'Shortcuts',
    'settings.archivedItems': 'Archived items',
    'settings.storage': 'Storage',
    'settings.exportJson': 'Export all data as JSON',
    'settings.general': 'General',
    'settings.generalSub': 'Profile, language, and how Locus behaves.',
    'settings.appearanceSub': 'Theme, type, and board density.',
    'settings.capture': 'Capture',
    'settings.captureSub': 'Control how links, tabs, and notes enter Locus.',
    'settings.captureStorageProof': 'Saved content and capture preferences use this browser profile; export before uninstalling or deleting the profile.',
    'settings.shortcutsSub': 'Speed up your workflow with keyboard shortcuts.',
    'settings.privacy': 'Privacy & Security',
    'settings.privacySub': 'Storage, permissions, export, and profile-loss limits.',
    'settings.storageSub': 'See what your library stores on this device.',
    'settings.dataSub': 'Bring your data in, or take it out. Anytime.',
    'settings.about': 'About Locus',
    'settings.aboutSub': 'Built with focus. Designed for your privacy.',
    'settings.profile': 'Profile',
    'settings.yourName': 'Your name',
    'settings.yourNameHint': 'Used for the home greeting. Stored in this browser profile; export before uninstalling or deleting the profile.',
    'settings.tipsOnboarding': 'Welcome',
    'settings.privacyFirst': 'Privacy first',
    'settings.privacyFirstBody': 'Workspace data is stored in this browser profile; export before uninstalling or deleting it. Locus has no account, backend, or host permissions.',
    'settings.globalShortcuts': 'Browser shortcuts',
    'settings.customizeShortcuts': 'Customize',
    'settings.customizeShortcutsHint': "Opens the browser's extension-shortcuts page",
    'settings.globalShortcutsHint': 'These work anywhere in the browser and are managed by the browser itself.',
    'settings.inAppShortcuts': 'Inside Locus',
    'settings.searchShortcuts': 'Search shortcuts…',
    'settings.noShortcuts': 'No shortcuts match your search.',
    'settings.privateByDesign': 'Privacy boundaries',
    'settings.privateByDesignBody': 'Locus runs in this browser profile and does not send your workspace data to a Locus server.',
    'settings.check.local': 'Browser-profile local storage',
    'settings.check.tracking': 'No tracking or analytics',
    'settings.check.account': 'No account required',
    'settings.check.host': 'No host permissions — no automatic page inspection',
    'settings.onScreen': 'On-screen privacy',
    'settings.yourData': 'Your data',
    'settings.yourDataBody': 'Workspace data is stored in this browser profile on this desktop. Uninstalling the extension or losing the profile can erase it, so export backups regularly.',
    'settings.exportBackup': 'Export backup',
    'settings.openImportExport': 'Open Import & Export',
    'settings.localStorage': 'Local storage',
    'settings.storageHint': 'Workspace data uses this browser profile. Uninstalling the extension or deleting the profile removes it; opening links and searches uses the browser normally.',
    'settings.manageStorage': 'Manage',
    'settings.openArchive': 'Open archive',
    'settings.manageHint': 'Export a backup before pruning old items, and keep the file somewhere safe.',
    'settings.whatsUsingSpace': "What's using space",
    'settings.import': 'Import',
    'settings.export': 'Export',
    'settings.importJson': 'Import JSON',
    'settings.importJsonHint': 'Locus, Folio, TabNest, or TabExtend exports',
    'settings.importBookmarks': 'Import bookmarks',
    'settings.importBookmarksHint': "From the browser's bookmark bar and folders",
    'settings.pasteLinks': 'Paste links',
    'settings.pasteLinksHint': 'One URL per line, straight into a group',
    'settings.exportJsonHint': 'A complete backup of every workspace',
    'settings.exportHint': 'Exports are plain JSON. Keep the file yourself; compatibility with future versions is verified per release.',
    'settings.aboutBody': 'A desktop home for explicitly saved tabs, notes, tasks, and reminders.',
    'settings.proof.account': 'No account',
    'settings.proof.server': 'No Locus server',
    'settings.proof.host': 'No host permissions',
    'settings.proof.export': 'User-managed JSON export',
    'settings.showLanding': 'Show calm new-tab welcome',
    'settings.showLandingHint': 'Dismiss it to reveal your Home workspace',
    'landing.ariaLabel': 'New tab welcome',
    'landing.greeting': '{greeting}, {name}.',
    'landing.greetingNoName': '{greeting}.',
    'landing.subtitle': 'Where will your focus take you today?',
    'landing.searchPlaceholder': 'Search the web or your saved links…',
    'landing.searchWeb': 'Search the web',
    'landing.enter': 'Open Locus home',
    'landing.unsorted': 'Unsorted',
    'landing.reminders': 'Reminders',
    'landing.quote': '“The quieter you become, the more you can hear.”',
    'landing.savedResults': 'Saved links',
    'landing.noResults': 'No saved links match. Press Enter to search the web.',
    'palette.ariaLabel': 'Command palette',
    'palette.placeholder': 'Type a command or search…',
    'palette.quickActions': 'Quick actions',
    'palette.goTo': 'Go to',
    'palette.recent': 'Search recent',
    'palette.shortcuts': 'Shortcuts',
    'palette.results': 'Results',
    'palette.noMatch': 'No commands or saved links match this search.',
    'palette.recentEmpty': 'Recently saved links will appear here.',
    'palette.footer': 'Use ↑ ↓ to navigate, Enter to open, and Esc to close',
    'palette.saveTab': 'Add / Save current tab',
    'palette.saveTabDesc': 'Save the active browser tab to Inbox',
    'palette.createNote': 'Create note',
    'palette.createNoteDesc': 'Start a note in the active Inbox',
    'palette.newSpace': 'New space',
    'palette.newSpaceDesc': 'Create a space in this workspace',
    'palette.saveWindow': 'Save open window',
    'palette.saveWindowDesc': 'Save this window as a session group',
    'palette.importBookmarks': 'Import from browser',
    'palette.importBookmarksDesc': 'Import bookmarks into the active space',
    'palette.homeDesc': 'Open the workspace overview',
    'palette.inboxDesc': 'Open the active space Inbox',
    'palette.calendarDesc': 'View reminders and dated tasks',
    'palette.readLaterDesc': 'Open your reading queue',
    'palette.allLinksDesc': 'Browse every saved link',
    'palette.favoritesDesc': 'Open starred links',
    'palette.archiveDesc': 'Review archived items',
    'palette.trashDesc': 'Restore recently deleted items',
    'palette.search': 'Search saved links',
    'palette.searchDesc': 'Open the local saved-content search',
    'palette.toggleSidebar': 'Toggle sidebar',
    'palette.toggleSidebarDesc': 'Show or hide workspace navigation',
    'palette.nextTheme': 'Toggle theme',
    'palette.nextThemeDesc': 'Switch to the next local theme',
    'palette.help': 'Keyboard shortcuts',
    'palette.helpDesc': 'Open the shortcut reference',
    'palette.settingsDesc': 'Open Locus settings',
    'palette.searchBoard': 'Search Locus for “{query}”',
    'palette.searchBoardDesc': 'Open the full local search with filters and operators',
    'palette.switchLayout': 'Switch layout: {name}',
    'palette.workspace': 'Workspace: {name}',
    'palette.space': 'Space: {name}',
    'palette.group': 'Group: {name}',
    'palette.savedLink': 'Saved link',
    'palette.savedLinkDesc': '{host} · {space}',
    'palette.resultCount': '{count} results',
    'palette.noActiveTab': 'No savable active tab was found',
    'palette.noSpace': 'Create a space first',
    'toast.theme': 'Theme: {theme}',
    'toast.language': 'Language: {language}',
    'stateRecovery.title': 'Reload latest saved data',
    'stateRecovery.body': 'Locus paused editing because this page could not be safely reconciled with browser storage.',
    'stateRecovery.detail': 'Reload before making more changes. Locus will reopen from the latest state saved in this browser profile.',
    'stateRecovery.reload': 'Reload Locus',
    'nav.home': 'Home',
    'nav.allLinks': 'All Links',
    'nav.favorites': 'Favorites',
    'nav.readLater': 'Read Later',
    'nav.inbox': 'Inbox',
    'nav.archive': 'Archive',
    'nav.trash': 'Trash',
    'trash.title': 'Trash',
    'trash.subtitle': 'Valid Trash entries are scheduled for deletion after 30 days; uninstalling or deleting this browser profile removes them sooner.',
    'trash.search': 'Search trash',
    'trash.summary.entries': 'Deleted {count}',
    'trash.summary.items': 'Recoverable {count}',
    'trash.summary.space': 'Recoverable space',
    'trash.summary.retention': 'Auto-delete window',
    'trash.retention': 'Items in trash are permanently deleted after 30 days.',
    'trash.localOnly': 'Browser-profile local',
    'trash.all': 'All',
    'trash.links': 'Links',
    'trash.notes': 'Notes',
    'trash.todos': 'To-dos',
    'trash.groups': 'Groups',
    'trash.selected': '{count} selected',
    'trash.restoreSelected': 'Restore selected',
    'trash.deleteSelected': 'Delete forever',
    'trash.empty': 'Your trash is empty',
    'trash.emptyBody': 'Items deleted from Archive wait here for 30 days.',
    'trash.noMatch': 'No deleted items match',
    'trash.noMatchBody': 'Try another search or content type.',
    'trash.restore': 'Restore',
    'trash.select': 'Select {title}',
    'trash.deleteForever': 'Delete forever',
    'trash.daysLeft': '{count} days left',
    'trash.dayLeft': '1 day left',
    'trash.expiresToday': 'Deletes today',
    'trash.confirmTitle': 'Delete forever?',
    'trash.confirmOne': '“{title}” will be removed from this browser profile. Other saved items won’t change, and this cannot be undone.',
    'trash.confirmMany': '{count} selected items will be removed from this browser profile. Other saved items won’t change, and this cannot be undone.',
    'trash.cancelDelete': 'Cancel',
    'trash.deleting': 'Deleting…',
    'trash.restored': 'Restored from Trash',
    'trash.restoredMany': 'Restored {count} items from Trash',
    'trash.deleted': 'Permanently deleted',
    'organization.cancel': 'Cancel',
    'organization.close': 'Close',
    'organization.deleting': 'Deleting…',
    'organization.changeSymbol': 'Change symbol…',
    'organization.renameMenu': 'Rename…',
    'organization.rename': 'Rename',
    'organization.renaming': 'Renaming…',
    'organization.create': 'Create',
    'organization.creating': 'Creating…',
    'organization.nameChanged': 'The name changed. Review the latest name, then try again.',
    'organization.idUnavailable': 'Locus couldn’t prepare this change. Try again.',
    'organization.workspace.createTitle': 'Create workspace',
    'organization.workspace.renameTitle': 'Rename workspace',
    'organization.workspace.nameLabel': 'Workspace name',
    'organization.workspace.actions': 'Workspace actions for “{name}”',
    'organization.workspace.nameRequired': 'Enter a workspace name.',
    'organization.workspace.unavailable': 'This workspace no longer exists.',
    'organization.workspace.createHistory': 'Create workspace “{name}”',
    'organization.workspace.created': 'Workspace “{name}” created',
    'organization.workspace.renameHistory': 'Rename workspace “{from}” to “{to}”',
    'organization.workspace.renamed': 'Workspace renamed to “{name}”',
    'organization.workspace.confirmTitle': 'Delete empty workspace?',
    'organization.workspace.confirmEmpty': '“{name}” has no groups, saved items, or reminders. The workspace and its Space structure will be removed from this browser profile. Other workspaces won’t change. After deleting, choose Undo on this page before reloading or closing Locus.',
    'organization.workspace.blockedTitle': 'Workspace still contains recoverable data',
    'organization.workspace.blockedBody': 'Archive or move every group from every Space, then remove any remaining Space reminders. Nothing was deleted.',
    'organization.workspace.delete': 'Delete workspace',
    'organization.workspace.deleteHistory': 'Delete workspace “{name}”',
    'organization.workspace.deleted': 'Workspace deleted',
    'organization.space.defaultName': 'Pinned',
    'organization.space.createTitle': 'Create space',
    'organization.space.createForGroupTitle': 'Create a space for “{group}”',
    'organization.space.createForGroupBody': 'The group will move into the new space.',
    'organization.space.renameTitle': 'Rename space',
    'organization.space.nameLabel': 'Space name',
    'organization.space.actions': 'Space actions for “{name}”',
    'organization.space.nameRequired': 'Enter a space name.',
    'organization.space.unavailable': 'This space no longer exists.',
    'organization.space.parentUnavailable': 'This workspace no longer exists. Close this dialog and try again.',
    'organization.space.position': 'Space {position} of {count}',
    'organization.space.duplicateLabel': '{name}, {position}',
    'organization.space.moveMenuLabel': 'Move to another space…',
    'organization.space.newAndMoveMenu': 'Move to a new space…',
    'organization.group.unavailable': 'This group moved or no longer exists. Close this dialog and try again.',
    'organization.group.nameChanged': 'The group name changed. Review the updated group, then try again.',
    'organization.group.moveTitle': 'Move group “{group}”',
    'organization.group.moveBody': 'Currently in “{source}”. Choose another space in “{workspace}”. The group and everything in it will move together.',
    'organization.group.moveListLabel': 'Move to',
    'organization.group.moveClose': 'Close move dialog',
    'organization.group.moveOption': 'Move to “{space}”, {groups}',
    'organization.group.moveOptionDuplicate': 'Move to “{space}”, {groups}, {position}',
    'organization.group.moveOptionOne': '1 group',
    'organization.group.moveOptionMany': '{count} groups',
    'organization.group.move': 'Move group',
    'organization.group.moving': 'Moving…',
    'organization.group.moveRequired': 'Choose a space.',
    'organization.group.moveDestinationUnavailable': 'That space no longer exists. Choose another space.',
    'organization.group.moveChanged': 'The group or space list changed. Review the latest choices, then move again.',
    'organization.group.moveRecoveryRequired': 'Locus couldn’t confirm this move. Reload the latest saved data before continuing.',
    'organization.group.moveContextChanged': 'The active workspace or space changed. Close this dialog and try again.',
    'organization.group.moveNoDestination': 'No other spaces are available.',
    'organization.group.moveHistory': 'Move group “{group}” to space “{space}”',
    'organization.group.moved': 'Moved “{group}” to “{space}”',
    'groupEditor.createTitle': 'Create group',
    'groupEditor.editTitle': 'Edit group',
    'groupEditor.duplicateTitle': 'Duplicate group',
    'groupEditor.close': 'Close group editor',
    'groupEditor.duplicateClose': 'Close duplicate group dialog',
    'groupEditor.symbolLabel': 'Symbol',
    'groupEditor.symbolHint': 'Choose a symbol',
    'groupEditor.nameLabel': 'Group name',
    'groupEditor.namePlaceholder': 'e.g. Research',
    'groupEditor.colorLabel': 'Color',
    'groupEditor.create': 'Create group',
    'groupEditor.creating': 'Creating…',
    'groupEditor.duplicate': 'Create copy',
    'groupEditor.duplicating': 'Creating copy…',
    'groupEditor.save': 'Save changes',
    'groupEditor.saving': 'Saving…',
    'groupEditor.nameRequired': 'Enter a group name.',
    'groupEditor.parentUnavailable': 'This space moved or no longer exists. Close this dialog and try again.',
    'groupEditor.unavailable': 'This group moved or no longer exists. Close this dialog and try again.',
    'groupEditor.changed': 'This group changed. Review the latest name, symbol, and color, then try again.',
    'groupEditor.duplicateChanged': 'This group changed while the dialog was open. Select “Create copy” again to use the latest version.',
    'groupEditor.idUnavailable': 'Locus couldn’t prepare this group. Try again.',
    'groupEditor.duplicateIdUnavailable': 'Locus couldn’t prepare this copy. Try again.',
    'groupEditor.recoveryRequired': 'Locus couldn’t confirm this change. Reload the latest saved data before continuing.',
    'groupEditor.duplicateRecoveryRequired': 'Locus couldn’t confirm whether this copy was saved. Reload the latest saved data before continuing.',
    'groupEditor.duplicateDefaultName': '{name} (copy)',
    'groupEditor.duplicateDescription': 'Create a copy of “{group}”, including everything in it and its reminders. The copy will be added to “{space}”; the original won’t change.',
    'groupEditor.createHistory': 'Create group “{name}”',
    'groupEditor.created': 'Group “{name}” created',
    'groupEditor.duplicateHistory': 'Duplicate group “{source}” as “{name}”',
    'groupEditor.duplicated': 'Created “{name}” from “{source}”',
    'groupEditor.duplicateReminderWarning': 'Created “{name}”, but some copied reminders could not be scheduled. Restart your browser, then review Calendar.',
    'groupEditor.editHistory': 'Update group “{name}”',
    'groupEditor.updated': 'Group “{name}” updated',
    'groupEditor.colorOption': 'Use {color}',
    'groupEditor.color.indigo': 'indigo',
    'groupEditor.color.blue': 'blue',
    'groupEditor.color.cyan': 'cyan',
    'groupEditor.color.green': 'green',
    'groupEditor.color.lime': 'lime',
    'groupEditor.color.yellow': 'yellow',
    'groupEditor.color.orange': 'orange',
    'groupEditor.color.red': 'red',
    'groupEditor.color.pink': 'pink',
    'groupEditor.color.purple': 'purple',
    'groupEditor.color.slate': 'slate',
    'groupEditor.color.custom': 'current custom color',
    'stackEditor.createTitle': 'Create stack',
    'stackEditor.editTitle': 'Edit stack',
    'stackEditor.batchTitle': 'Create stack from selection',
    'stackEditor.close': 'Close stack editor',
    'stackEditor.symbolLabel': 'Symbol',
    'stackEditor.symbolHint': 'Choose a symbol',
    'stackEditor.nameLabel': 'Stack name',
    'stackEditor.namePlaceholder': 'e.g. This week',
    'stackEditor.defaultName': 'Stack',
    'stackEditor.colorLabel': 'Color',
    'stackEditor.create': 'Create stack',
    'stackEditor.creating': 'Creating…',
    'stackEditor.save': 'Save changes',
    'stackEditor.saving': 'Saving…',
    'stackEditor.nameRequired': 'Enter a stack name.',
    'stackEditor.parentUnavailable': 'This group moved or no longer exists. Close this dialog and try again.',
    'stackEditor.unavailable': 'This stack moved or no longer exists. Close this dialog and try again.',
    'stackEditor.changed': 'This stack changed. Review the latest name, symbol, and color, then save again.',
    'stackEditor.selectionUnavailable': 'One or more selected items moved or no longer exist. Close this dialog and select them again.',
    'stackEditor.selectionNested': 'A stack and one of its contents cannot be selected together. Adjust the selection and try again.',
    'stackEditor.selectionScope': 'Select items from the same space.',
    'stackEditor.minimumSelection': 'Select at least 2 items.',
    'stackEditor.idUnavailable': 'Locus couldn’t prepare this stack. Try again.',
    'stackEditor.recoveryRequired': 'Locus couldn’t confirm this change. Reload the latest saved data before continuing.',
    'stackEditor.batchDescription': 'Move {count} selected items into a new stack in “{group}”.',
    'stackEditor.createHistory': 'Create stack “{name}”',
    'stackEditor.created': 'Stack “{name}” created',
    'stackEditor.editHistory': 'Update stack “{name}”',
    'stackEditor.updated': 'Stack “{name}” updated',
    'stackEditor.batchHistory': 'Stack {count} items as “{name}”',
    'stackEditor.stacked': 'Stacked {count} items as “{name}”',
    'stackAction.edit': 'Edit stack…',
    'stackAction.editFor': 'Edit stack “{name}”',
    'stackAction.editIntention': 'Edit intention…',
    'stackAction.expand': 'Expand',
    'stackAction.collapse': 'Collapse',
    'stackAction.expandFor': 'Expand stack “{name}”',
    'stackAction.collapseFor': 'Collapse stack “{name}”',
    'stackAction.archive': 'Archive',
    'stackAction.aria': 'Stack “{name}”',
    'selection.selected': 'selected',
    'selection.open': 'Open',
    'selection.openTitle': 'Open selected tabs',
    'selection.move': 'Move',
    'selection.moveTitle': 'Move selected items',
    'selection.stack': 'Stack',
    'selection.stackTitle': 'Create a stack from selected items',
    'selection.archive': 'Archive',
    'selection.archiveTitle': 'Archive selected items',
    'selection.clearTitle': 'Clear selection',
    'itemAction.details': 'Details…',
    'itemAction.editColor': 'Edit color',
    'itemAction.setReminder': 'Set reminder…',
    'itemAction.clearReminder': 'Clear reminder',
    'itemAction.archive': 'Archive',
    'groupAction.new': 'New group',
    'groupAction.edit': 'Edit group…',
    'groupAction.editFor': 'Edit group “{name}”',
    'groupAction.more': 'More group actions',
    'groupAction.moreFor': 'Group actions for “{name}”',
    'groupAction.editIntention': 'Edit intention…',
    'groupAction.setReminder': 'Set reminder…',
    'groupAction.expand': 'Expand',
    'groupAction.collapse': 'Collapse',
    'groupAction.expandFor': 'Expand group “{name}”',
    'groupAction.collapseFor': 'Collapse group “{name}”',
    'groupAction.openAll': 'Open all tabs',
    'groupAction.openAsPage': 'Open as page',
    'groupAction.duplicate': 'Duplicate group…',
    'groupAction.addStack': 'Add stack…',
    'groupAction.archive': 'Archive',
    'groupAction.oneItem': '1 item',
    'groupAction.items': '{count} items',
    'groupAction.aria': 'Group “{name}”',
    'emojiPicker.title': 'Choose a symbol',
    'emojiPicker.search': 'Search symbols…',
    'emojiPicker.categories': 'Symbol categories',
    'emojiPicker.loading': 'Loading symbols…',
    'emojiPicker.empty': 'No symbols found',
    'emojiPicker.error': 'Couldn’t load symbols. Close this picker and try again.',
    'emojiPicker.choose': 'Choose {symbol}',
    'emojiPicker.current': 'Choose a symbol, current {symbol}',
    'emojiPicker.category.recent': 'Recent',
    'emojiPicker.category.smileys': 'Smileys',
    'emojiPicker.category.people': 'People',
    'emojiPicker.category.objects': 'Objects',
    'emojiPicker.category.symbols': 'Symbols',
    'emojiPicker.category.food': 'Food',
    'emojiPicker.category.activity': 'Activities',
    'emojiPicker.category.places': 'Places',
    'emojiPicker.category.nature': 'Nature',
    'organization.space.createHistory': 'Create space “{name}”',
    'organization.space.created': 'Space “{name}” created',
    'organization.space.createAndMoveHistory': 'Create space “{space}” and move group “{group}”',
    'organization.space.createdAndMoved': 'Created space “{space}” and moved group “{group}”',
    'organization.space.renameHistory': 'Rename space “{from}” to “{to}”',
    'organization.space.renamed': 'Space renamed to “{name}”',
    'organization.space.confirmTitle': 'Delete empty space?',
    'organization.space.confirmEmpty': '“{name}” has no groups, saved items, or reminders. The space and its view settings will be removed from this workspace. Other spaces won’t change. After deleting, choose Undo on this page before reloading or closing Locus.',
    'organization.space.blockedTitle': 'Space still contains recoverable data',
    'organization.space.blockedBody': 'Archive or move every group, then remove this space’s remaining reminders. Nothing was deleted.',
    'organization.space.delete': 'Delete space',
    'organization.space.deleteHistory': 'Delete space “{name}”',
    'organization.space.deleted': 'Space deleted',
    'history.undid': 'Undid: {action}',
    'history.redid': 'Redid',
    'history.undoStale': 'Undo is no longer available because newer changes were made.',
    'history.undoPending': 'This save is still finishing. Undo will be available when it completes.',
    'history.undoInterrupted': 'Undo paused because newer changes were made. Undo the newer change first, then retry.',
    'history.undoFailed': 'Undo failed. Your saved data was left unchanged.',
    'history.redoInterrupted': 'Redo paused because newer changes were made. Reload the latest saved data, then retry.',
    'history.redoFailed': 'Redo failed. Your saved data was left unchanged.',
    'history.reminderReconcileWarning': 'The change was saved, but some reminders could not be updated. Restart your browser, then review Calendar.',
    'trash.today': 'Today',
    'trash.yesterday': 'Yesterday',
    'trash.thisWeek': 'This week',
    'trash.earlier': 'Earlier',
    'trash.invalid': '{count} damaged trash entries could not be displayed. They remain in exports.',
    'archive.moveToTrash': 'Move to Trash',
    'archive.movedToTrash': 'Moved to Trash',
    'archive.subtitle': 'Archived content remains in this browser profile until restored or moved to Trash; uninstalling or deleting the profile removes it.',
    'archive.search': 'Search archive',
    'archive.summary.entries': 'Archived {count}',
    'archive.summary.items': 'Saved {count}',
    'archive.summary.groups': '{count} groups',
    'archive.summary.local': 'Local',
    'archive.summary.localBody': 'Browser-profile storage; export before uninstalling',
    'archive.selected': '{count} selected',
    'archive.restoreSelected': 'Restore selected',
    'nav.spaces': 'Spaces',
    'nav.storage': 'Local storage',
    'priv.title': 'Privacy boundaries',
    'priv.noAccount': 'No account',
    'priv.localOnly': 'Profile-local data',
    'priv.noHost': 'No host permissions',
    'priv.export': 'Export before uninstalling',
    'rail.openedTabs': 'Opened Tabs',
    'rail.dragHint': 'Drag into a space to save',
    'rail.saveAll': 'Save eligible tabs',
    'rail.tip': 'Drag a tab into any space to save it for later.',
    'home.greeting.morning': 'Good morning',
    'home.greeting.afternoon': 'Good afternoon',
    'home.greeting.evening': 'Good evening',
    'home.subtitle': 'Focus on what matters.',
    'home.viewAll': 'View all',
    'home.items': '{n} items',
    'home.empty': 'Empty — drag a tab here to start',
    'home.emptyTitle': 'No spaces yet',
    'home.emptyBody': 'Create a space to start organizing your saved items.',
    'home.inboxZone': 'Inbox',
    'home.inboxHint': 'Capture one page, then recover it here.',
    'home.openInbox': 'Open Inbox',
    'home.recentSpaces': 'Your spaces',
    'home.previewOpen': 'Open saved {type}: {title}',
    'home.previewUnavailable': "This saved item can't be opened from Home right now. Refresh Home and try again.",
    'home.previewType.tab': 'link',
    'home.previewType.note': 'note',
    'home.previewType.todo': 'task',
    'home.previewType.stack': 'stack',
    'home.previewType.item': 'item',
    'empty.addSave': 'Add / Save',
    'empty.addNote': 'Add note',
    'empty.importBookmarks': 'Import bookmarks',
    'empty.createGroup': 'Create group',
    'empty.browseLibrary': 'Browse all links',
    'empty.browseArchive': 'Browse archive',
    'empty.clearSearch': 'Clear search',
    'empty.clearFilters': 'Clear filters',
    'empty.searchAllSpaces': 'Search all spaces',
    'empty.returnHome': 'Return home',
    'empty.showAll': 'Show all',
    'empty.inboxTitle': 'Nothing to triage right now',
    'empty.inboxBody': 'New links from the extension, opened-tabs rail, or imports will appear here.',
    'empty.spaceTitle': '{space} is ready for its first resources',
    'empty.spaceBody': 'Add links, notes, tasks, or stacks to build this space.',
    'empty.searchTitle': 'No results for “{query}”',
    'empty.searchBody': 'Try broader keywords or remove the active filters.',
    'empty.readLaterTitle': 'Your reading queue is clear',
    'empty.readLaterBody': 'Save any library link for later, then come back when it matters.',
    'empty.favoritesTitle': 'Start with the links you use most',
    'empty.favoritesBody': 'Star any saved link to keep it one click away.',
    'empty.trashTitle': 'No deleted items',
    'empty.trashBody': 'Items moved from Archive wait here for 30 days before permanent deletion.',
    'empty.archiveTitle': 'Nothing archived',
    'empty.archiveBody': 'Items and groups you archive will wait here until you need them again.',
    'empty.libraryTitle': 'Nothing saved yet',
    'empty.libraryBody': 'Add a link, import bookmarks, or start a note to build your local library.',
    'empty.noMatchTitle': 'Nothing matches these filters',
    'empty.noMatchBody': 'Clear the search or filters to see everything again.',
    'empty.localNote': 'Stored in this browser profile; export before uninstalling or deleting it.',
    'library.linksAcross': '{count} links across this workspace',
    'library.filterLinks': 'Filter links…',
    'library.workspace': 'Workspace: {name}',
    'readLater.subtitle': 'A calm queue for links you want to return to.',
    'search.placeholder': 'Search your links…',
    'search.title': 'Search Results',
    'search.subtitle': 'Find anything instantly across your saved links, notes, tasks, and spaces.',
    'search.nav': 'Search',
    'search.inputPlaceholder': 'Search everything…',
    'search.filters': 'Filters',
    'search.hideFilters': 'Hide filters',
    'search.clear': 'Clear',
    'search.clearAll': 'Clear all',
    'search.filterBy': 'Filter by',
    'search.contentType': 'Content type',
    'search.all': 'All',
    'search.links': 'Links',
    'search.notes': 'Notes',
    'search.todos': 'Tasks',
    'search.stacks': 'Stacks',
    'search.space': 'Space',
    'search.allSpaces': 'All spaces',
    'search.time': 'Time saved',
    'search.anyTime': 'Any time',
    'search.today': 'Today',
    'search.thisWeek': 'This week',
    'search.thisMonth': 'This month',
    'search.hasTags': 'Has tags',
    'search.tags': 'Tags',
    'search.related': 'Related results',
    'search.sortBy': 'Sort by',
    'search.bestMatch': 'Best match',
    'search.newest': 'Newest',
    'search.results': 'Results',
    'search.recent': 'Recently saved',
    'search.resultCount': '{count} results',
    'search.loading': 'Searching your local library…',
    'search.noItems': 'Nothing saved yet',
    'search.noItemsBody': 'Save a link, note, task, or stack and it will become searchable here.',
    'search.noResults': 'No results match this search',
    'search.noResultsBody': 'Try fewer words, another space, or clear a filter.',
    'search.error': 'Search could not be completed',
    'search.errorBody': 'Your data was not changed. Clear the query and try again.',
    'search.open': 'Open',
    'search.details': 'Details',
    'search.favorite': 'Favorite',
    'search.unfavorite': 'Remove favorite',
    'search.preview': 'Selected result',
    'search.selectResult': 'Select a result to preview it.',
    'search.saved': 'Saved',
    'search.location': 'Location',
    'search.noNotes': 'No notes added.',
    'search.stats': 'Search stats',
    'search.tips': 'Search tips',
    'search.tipOperators': 'Use type:, in:, tag:, domain:, color:, or is: operators.',
    'search.tipQuotes': 'Put phrases in quotes for an exact text match.',
    'search.tipExclude': 'Prefix a word or operator with - to exclude it.',
    'search.resultAria': 'Search result: {title}',
    'search.stackItems': '{count} nested items',
    'search.unknownDate': 'Date unavailable',
    'detail.close': 'Close item details',
    'detail.closeTitle': 'Close details (Esc)',
    'detail.open': 'Open link',
    'detail.emptyNote': 'This note is empty. Edit it on the board.',
    'detail.title': 'Title',
    'detail.url': 'URL',
    'detail.task': 'Task',
    'detail.stackName': 'Stack name',
    'detail.markComplete': 'Mark task complete',
    'detail.markIncomplete': 'Mark task incomplete',
    'detail.whySaved': 'Why you saved it',
    'detail.notesPlaceholder': 'Add context, a quote, or the next step…',
    'detail.reminder': 'Reminder',
    'detail.pastDue': 'Past due',
    'detail.repeats': 'Repeats {schedule}',
    'detail.daily': 'daily',
    'detail.weekly': 'weekly',
    'detail.monthly': 'monthly',
    'detail.everyDays': 'every {count} days',
    'detail.everyWeeks': 'every {count} weeks',
    'detail.everyMonths': 'every {count} months',
    'detail.changeReminder': 'Change',
    'detail.clearReminder': 'Clear',
    'detail.setReminder': 'Set reminder…',
    'detail.closeReminderDialog': 'Close reminder dialog',
    'reminder.setTitle': 'Set reminder',
    'reminder.editTitle': 'Edit reminder',
    'reminder.label': 'Reminder name',
    'reminder.labelOptional': 'Reminder name (optional)',
    'reminder.reviewExample': 'For example: Review “{name}”',
    'reminder.routineExample': 'For example: “{name}” routine',
    'reminder.inOneHour': 'In 1 hour',
    'reminder.inThreeHours': 'In 3 hours',
    'reminder.tomorrow': 'Tomorrow',
    'reminder.nextWeek': 'Next week',
    'reminder.pickDate': 'Or pick a date',
    'reminder.repeat': 'Repeat',
    'reminder.none': 'Does not repeat',
    'reminder.daily': 'Daily',
    'reminder.weekly': 'Weekly',
    'reminder.monthly': 'Monthly',
    'reminder.clear': 'Clear',
    'reminder.remove': 'Remove',
    'reminder.update': 'Update',
    'reminder.set': 'Set',
    'reminder.futureTime': 'Choose a future time',
    'reminder.saving': 'Saving reminder…',
    'reminder.changed': 'This item changed or moved. Close this dialog, reopen the item, then try again.',
    'reminder.saveFailed': 'Locus couldn’t confirm whether this reminder was saved. Reload the latest data before continuing.',
    'reminder.setSuccess': 'Reminder saved',
    'reminder.clearSuccess': 'Reminder cleared',
    'reminder.scheduleWarning': 'The reminder was saved, but it may not alert yet. Restart your browser, then review Calendar.',
    'reminder.clearScheduleWarning': 'The reminder was cleared, but its previous alert may still appear. Restart your browser, then review Calendar.',
    'reminder.setHistory': 'Set reminder',
    'reminder.updateHistory': 'Update reminder',
    'reminder.clearHistory': 'Clear reminder',
    'detail.tags': 'Tags',
    'detail.addTag': 'Add tag…',
    'detail.removeTag': 'Remove tag “{tag}”',
    'detail.more': 'More details',
    'detail.cover': 'Cover',
    'detail.coverColor': 'Use cover color {color}',
    'detail.coverEmoji': 'Cover emoji',
    'detail.clearCover': 'Clear cover',
    'detail.checklist': 'Checklist',
    'detail.checklistItem': 'Checklist item',
    'detail.toggleChecklist': 'Toggle checklist item “{item}”',
    'detail.removeChecklist': 'Remove checklist item “{item}”',
    'detail.addChecklist': 'Add checklist item…',
    'detail.customFields': 'Custom fields',
    'detail.fieldLabel': 'Label',
    'detail.fieldValue': 'Value',
    'detail.removeField': 'Remove custom field “{label}”',
    'detail.addField': 'Add field',
    'detail.saving': 'Saving changes…',
    'detail.saved': 'Changes saved',
    'detail.changed': 'This item changed or moved. Reopen its details, then try again.',
    'detail.saveFailed': 'Locus couldn’t confirm whether this change was saved. Reload the latest data before continuing.',
    'detail.history.editTitle': 'Edit item title',
    'detail.history.editUrl': 'Edit item URL',
    'detail.history.updateTask': 'Update task',
    'detail.history.renameStack': 'Rename stack',
    'detail.history.updateCover': 'Update cover',
    'detail.history.editNotes': 'Edit saved context',
    'detail.history.updateTags': 'Update tags',
    'detail.history.updateChecklist': 'Update checklist',
    'detail.history.updateFields': 'Update custom fields'
  },
  'zh-TW': {
    'shell.openTabs': '開啟分頁',
    'shell.filterTabs': '篩選分頁',
    'action.collapseSidebar': '收合側邊欄',
    'action.newWorkspace': '新增工作區',
    'action.allWorkspaces': '所有工作區',
    'action.newSpace': '新增空間',
    'action.undo': '復原 (Ctrl+Z)',
    'workspaceManager.title': '工作區',
    'workspaceManager.yours': '你的工作區',
    'workspaceManager.items': '{count} 個項目',
    'action.tools': '工具 (番茄鐘、記帳、訂閱...)',
    'action.switchLayout': '切換版面',
    'action.calendar': '行事曆（提醒）',
    'action.selectionMode': '選取模式',
    'action.reorderMode': '重新排序模式',
    'action.search': '搜尋 ( / )',
    'action.cycleTheme': '切換主題',
    'action.saveAllTabs': '儲存符合條件的開啟分頁',
    'action.saveTab': '儲存分頁',
    'action.saveCopy': '儲存副本到收件匣',
    'action.saveClose': '儲存到收件匣並關閉分頁',
    'action.saveCandidate': '選擇如何處理此分頁',
    'welcome.taskTitle': '保留一個分頁，不必一直開著',
    'welcome.taskDescription': '將真實分頁儲存到收件匣，Locus 會清楚顯示它的位置。',
    'welcome.looking': '正在尋找開啟的分頁…',
    'welcome.empty': '目前沒有可儲存的分頁。先探索 Locus，之後可在任何頁面使用工具列彈出視窗。',
    'welcome.error': 'Locus 無法讀取開啟中的分頁。請再試一次，或先開始使用。',
    'welcome.retry': '再試一次',
    'welcome.explore': '自行探索',
    'welcome.save': '儲存此分頁',
    'action.more': '更多',
    'action.settings': '設定',
    'action.reminders': '提醒',
    'action.plugins': '外掛',
    'action.menu': '選單',
    'menu.settings': '設定',
    'menu.plugins': '外掛',
    'menu.calendar': '行事曆與提醒',
    'menu.theme': '主題',
    'menu.workspaces': '工作區',
    'menu.guide': '導覽 / 教學',
    'menu.about': '關於 Locus',
    'about.tagline': '讓明確儲存的分頁、筆記、任務與提醒有個更安靜的首頁。',
    'about.private': '隱私界線－資料存在此瀏覽器設定檔（解除安裝或刪除設定檔前請先匯出），沒有 Locus 帳號、後端或主機權限。',
    'about.replay': '重播歡迎導覽',
    'about.close': '關閉',
    'plugins.title': '外掛',
    'plugins.subtitle': '內建小工具－依需求啟用',
    'cal.addTask': '在這一天新增待辦…',
    'cal.addPrompt': '{date} 的新待辦：',
    'cal.added': '已為 {date} 新增待辦',
    'cal.needSpace': '請先建立一個空間才能新增待辦',
    'settings.title': '設定',
    'settings.appearance': '外觀',
    'settings.behavior': '行為',
    'settings.archive': '封存',
    'settings.data': '匯入與匯出',
    'settings.theme': '主題',
    'settings.language': '語言',
    'settings.language.en': 'English',
    'settings.language.zhTW': '繁體中文',
    'settings.language.hint': '新使用者會依瀏覽器語言自動選擇最接近的支援語言。',
    'settings.itemSize': '項目大小',
    'settings.size.compact': '精簡',
    'settings.size.normal': '標準',
    'settings.size.large': '大型',
    'settings.columnWidth': '欄寬',
    'settings.width.narrow': '窄',
    'settings.width.normal': '標準',
    'settings.width.wide': '寬',
    'settings.fontFamily': '字體',
    'settings.closeTabs': '儲存後關閉分頁',
    'settings.hibernate': '以休眠模式開啟已儲存分頁',
    'settings.hibernateHint': '先開啟預留頁；只有在你繼續時才載入網站',
    'settings.showUrls': '在卡片上顯示網址',
    'settings.animations': '動畫',
    'settings.privacyBlur': '隱私模糊模式',
    'settings.privacyBlurHint': '模糊所有內容，適合螢幕分享',
    'settings.autoSwitch': '視窗聚焦時自動切換工作區',
    'settings.autoSwitchHint': '每個工作區綁定一個瀏覽器視窗',
    'settings.showTour': '重播歡迎導覽',
    'settings.shortcuts': '快捷鍵',
    'settings.archivedItems': '封存項目',
    'settings.storage': '儲存空間',
    'settings.exportJson': '匯出所有資料為 JSON',
    'settings.general': '一般',
    'settings.generalSub': '個人資料、語言，以及 Locus 的行為方式。',
    'settings.appearanceSub': '主題、字體與版面密度。',
    'settings.capture': '擷取',
    'settings.captureSub': '控制連結、分頁與筆記如何進入 Locus。',
    'settings.captureStorageProof': '已儲存內容與擷取偏好使用此瀏覽器設定檔；解除安裝或刪除設定檔前請先匯出。',
    'settings.shortcutsSub': '用鍵盤快捷鍵加速你的工作流程。',
    'settings.privacy': '隱私與安全',
    'settings.privacySub': '儲存、權限、匯出與設定檔遺失限制。',
    'settings.storageSub': '查看你的資料庫在此裝置上的使用情況。',
    'settings.dataSub': '隨時帶入或帶走你的資料。',
    'settings.about': '關於 Locus',
    'settings.aboutSub': '為專注而生，為隱私而設計。',
    'settings.profile': '個人資料',
    'settings.yourName': '你的名字',
    'settings.yourNameHint': '用於首頁問候語。資料存在此瀏覽器設定檔；解除安裝或刪除設定檔前請先匯出。',
    'settings.tipsOnboarding': '歡迎導覽',
    'settings.privacyFirst': '隱私優先',
    'settings.privacyFirstBody': '工作區資料存在此瀏覽器設定檔；解除安裝或刪除前請先匯出。Locus 沒有帳號、後端或主機權限。',
    'settings.globalShortcuts': '瀏覽器快捷鍵',
    'settings.customizeShortcuts': '自訂',
    'settings.customizeShortcutsHint': '開啟瀏覽器的擴充功能快捷鍵頁面',
    'settings.globalShortcutsHint': '這些快捷鍵在瀏覽器任何地方都有效，由瀏覽器管理。',
    'settings.inAppShortcuts': 'Locus 內',
    'settings.searchShortcuts': '搜尋快捷鍵…',
    'settings.noShortcuts': '沒有符合搜尋的快捷鍵。',
    'settings.privateByDesign': '隱私界線',
    'settings.privateByDesignBody': 'Locus 在這個瀏覽器設定檔中執行，不會將你的工作區資料傳送到 Locus 伺服器。',
    'settings.check.local': '瀏覽器設定檔本機儲存',
    'settings.check.tracking': '無追蹤、無分析',
    'settings.check.account': '無需帳號',
    'settings.check.host': '無主機權限 — 不會自動檢查網頁內容',
    'settings.onScreen': '螢幕隱私',
    'settings.yourData': '你的資料',
    'settings.yourDataBody': '工作區資料只儲存在這台電腦的瀏覽器設定檔中。解除安裝擴充功能或遺失設定檔可能會清除資料，請定期匯出備份。',
    'settings.exportBackup': '匯出備份',
    'settings.openImportExport': '開啟匯入與匯出',
    'settings.localStorage': '本機儲存',
    'settings.storageHint': '工作區資料存在此瀏覽器設定檔；解除安裝擴充功能或刪除設定檔會移除資料。開啟連結與搜尋仍由瀏覽器正常連線。',
    'settings.manageStorage': '管理',
    'settings.openArchive': '開啟封存',
    'settings.manageHint': '清理舊項目前先匯出備份，並將匯出檔案妥善保存在安全位置。',
    'settings.whatsUsingSpace': '空間使用情況',
    'settings.import': '匯入',
    'settings.export': '匯出',
    'settings.importJson': '匯入 JSON',
    'settings.importJsonHint': '支援 Locus、Folio、TabNest 或 TabExtend 匯出檔',
    'settings.importBookmarks': '匯入書籤',
    'settings.importBookmarksHint': '從瀏覽器的書籤列與資料夾',
    'settings.pasteLinks': '貼上連結',
    'settings.pasteLinksHint': '每行一個網址，直接匯入群組',
    'settings.exportJsonHint': '所有工作區的完整備份',
    'settings.exportHint': '匯出為純 JSON。檔案由你自行保管；未來版本的相容性會逐版驗證。',
    'settings.aboutBody': '明確儲存分頁、筆記、任務與提醒的桌面首頁。',
    'settings.proof.account': '免帳號',
    'settings.proof.server': '無 Locus 伺服器',
    'settings.proof.host': '免主機權限',
    'settings.proof.export': '使用者保管的 JSON 匯出',
    'settings.showLanding': '顯示寧靜的新分頁歡迎畫面',
    'settings.showLandingHint': '關閉後即可查看首頁工作區',
    'landing.ariaLabel': '新分頁歡迎畫面',
    'landing.greeting': '{greeting}，{name}。',
    'landing.greetingNoName': '{greeting}。',
    'landing.subtitle': '今天，你想把專注帶往哪裡？',
    'landing.searchPlaceholder': '搜尋網路或已儲存的連結…',
    'landing.searchWeb': '搜尋網路',
    'landing.enter': '開啟 Locus 首頁',
    'landing.unsorted': '未整理',
    'landing.reminders': '提醒',
    'landing.quote': '「越安靜，就越能聽見真正重要的聲音。」',
    'landing.savedResults': '已儲存的連結',
    'landing.noResults': '沒有符合的已儲存連結。按 Enter 搜尋網路。',
    'palette.ariaLabel': '指令面板',
    'palette.placeholder': '輸入指令或搜尋…',
    'palette.quickActions': '快速動作',
    'palette.goTo': '前往',
    'palette.recent': '最近項目',
    'palette.shortcuts': '快捷操作',
    'palette.results': '搜尋結果',
    'palette.noMatch': '找不到符合的指令或已儲存連結。',
    'palette.recentEmpty': '最近儲存的連結會顯示在這裡。',
    'palette.footer': '使用 ↑ ↓ 移動、Enter 開啟、Esc 關閉',
    'palette.saveTab': '新增／儲存目前分頁',
    'palette.saveTabDesc': '將目前瀏覽器分頁儲存到收件匣',
    'palette.createNote': '建立筆記',
    'palette.createNoteDesc': '在目前空間的收件匣開始筆記',
    'palette.newSpace': '新增空間',
    'palette.newSpaceDesc': '在此工作區建立空間',
    'palette.saveWindow': '儲存目前視窗',
    'palette.saveWindowDesc': '將此視窗儲存為工作階段群組',
    'palette.importBookmarks': '從瀏覽器匯入',
    'palette.importBookmarksDesc': '將書籤匯入目前空間',
    'palette.homeDesc': '開啟工作區總覽',
    'palette.inboxDesc': '開啟目前空間的收件匣',
    'palette.calendarDesc': '查看提醒與有日期的待辦',
    'palette.readLaterDesc': '開啟稍後閱讀清單',
    'palette.allLinksDesc': '瀏覽所有已儲存連結',
    'palette.favoritesDesc': '開啟已收藏連結',
    'palette.archiveDesc': '查看已封存項目',
    'palette.trashDesc': '復原最近刪除的項目',
    'palette.search': '搜尋已儲存連結',
    'palette.searchDesc': '開啟本機已儲存內容搜尋',
    'palette.toggleSidebar': '切換側邊欄',
    'palette.toggleSidebarDesc': '顯示或隱藏工作區導覽',
    'palette.nextTheme': '切換主題',
    'palette.nextThemeDesc': '切換至下一個本機主題',
    'palette.help': '鍵盤快捷鍵',
    'palette.helpDesc': '開啟快捷鍵參考',
    'palette.settingsDesc': '開啟 Locus 設定',
    'palette.searchBoard': '在 Locus 搜尋「{query}」',
    'palette.searchBoardDesc': '開啟含有篩選條件與運算子的完整本機搜尋',
    'palette.switchLayout': '切換版面：{name}',
    'palette.workspace': '工作區：{name}',
    'palette.space': '空間：{name}',
    'palette.group': '群組：{name}',
    'palette.savedLink': '已儲存連結',
    'palette.savedLinkDesc': '{host} · {space}',
    'palette.resultCount': '{count} 個結果',
    'palette.noActiveTab': '找不到可儲存的目前分頁',
    'palette.noSpace': '請先建立空間',
    'toast.theme': '主題：{theme}',
    'toast.language': '語言：{language}',
    'stateRecovery.title': '重新載入最新儲存資料',
    'stateRecovery.body': '此頁面無法安全地與瀏覽器儲存空間同步，因此 Locus 已暫停編輯。',
    'stateRecovery.detail': '請先重新載入再繼續修改。Locus 會從此瀏覽器設定檔中最新儲存的狀態重新開啟。',
    'stateRecovery.reload': '重新載入 Locus',
    'nav.home': '首頁',
    'nav.allLinks': '所有連結',
    'nav.favorites': '收藏',
    'nav.readLater': '稍後閱讀',
    'nav.inbox': '收件匣',
    'nav.archive': '封存',
    'nav.trash': '垃圾桶',
    'trash.title': '垃圾桶',
    'trash.subtitle': '有效的垃圾桶項目預定於 30 天後刪除；解除安裝或刪除此瀏覽器設定檔會更早移除。',
    'trash.search': '搜尋垃圾桶',
    'trash.summary.entries': '已刪除 {count} 筆',
    'trash.summary.items': '可復原 {count} 個項目',
    'trash.summary.space': '可回收空間',
    'trash.summary.retention': '自動刪除期限',
    'trash.retention': '垃圾桶中的項目會在 30 天後永久刪除。',
    'trash.localOnly': '瀏覽器設定檔本機',
    'trash.all': '全部',
    'trash.links': '連結',
    'trash.notes': '筆記',
    'trash.todos': '待辦',
    'trash.groups': '群組',
    'trash.selected': '已選取 {count} 筆',
    'trash.restoreSelected': '復原所選項目',
    'trash.deleteSelected': '永久刪除',
    'trash.empty': '垃圾桶是空的',
    'trash.emptyBody': '從封存中刪除的項目會在此保留 30 天。',
    'trash.noMatch': '找不到符合的刪除項目',
    'trash.noMatchBody': '請嘗試其他搜尋字詞或內容類型。',
    'trash.restore': '復原',
    'trash.select': '選取「{title}」',
    'trash.deleteForever': '永久刪除',
    'trash.daysLeft': '剩餘 {count} 天',
    'trash.dayLeft': '剩餘 1 天',
    'trash.expiresToday': '今天刪除',
    'trash.confirmTitle': '永久刪除？',
    'trash.confirmOne': '「{title}」將從這個瀏覽器設定檔中移除，其他已儲存項目不受影響。刪除後無法復原。',
    'trash.confirmMany': '所選的 {count} 個項目將從這個瀏覽器設定檔中移除，其他已儲存項目不受影響。刪除後無法復原。',
    'trash.cancelDelete': '取消',
    'trash.deleting': '刪除中…',
    'trash.restored': '已從垃圾桶復原',
    'trash.restoredMany': '已從垃圾桶復原 {count} 個項目',
    'trash.deleted': '已永久刪除',
    'organization.cancel': '取消',
    'organization.close': '關閉',
    'organization.deleting': '刪除中…',
    'organization.changeSymbol': '變更圖示…',
    'organization.renameMenu': '重新命名…',
    'organization.rename': '重新命名',
    'organization.renaming': '重新命名中…',
    'organization.create': '新增',
    'organization.creating': '新增中…',
    'organization.nameChanged': '名稱已變更。請確認最新名稱後再試一次。',
    'organization.idUnavailable': 'Locus 無法準備這項變更，請再試一次。',
    'organization.workspace.createTitle': '新增工作區',
    'organization.workspace.renameTitle': '重新命名工作區',
    'organization.workspace.nameLabel': '工作區名稱',
    'organization.workspace.actions': '「{name}」工作區的操作',
    'organization.workspace.nameRequired': '請輸入工作區名稱。',
    'organization.workspace.unavailable': '這個工作區已不存在。',
    'organization.workspace.createHistory': '新增工作區「{name}」',
    'organization.workspace.created': '已新增工作區「{name}」',
    'organization.workspace.renameHistory': '工作區「{from}」改名為「{to}」',
    'organization.workspace.renamed': '工作區名稱已改為「{name}」',
    'organization.workspace.confirmTitle': '刪除空的工作區？',
    'organization.workspace.confirmEmpty': '「{name}」已沒有群組、已儲存項目或提醒。刪除後，這個工作區及其中的空間結構會從此瀏覽器設定檔移除，其他工作區不受影響。如要復原，請先在這個頁面使用「復原」，再重新載入或關閉 Locus。',
    'organization.workspace.blockedTitle': '工作區仍有可保留的內容',
    'organization.workspace.blockedBody': '請先封存或移動每個空間中的所有群組，再移除剩餘的空間提醒。這次沒有刪除任何內容。',
    'organization.workspace.delete': '刪除工作區',
    'organization.workspace.deleteHistory': '刪除工作區「{name}」',
    'organization.workspace.deleted': '已刪除工作區',
    'organization.space.defaultName': '釘選',
    'organization.space.createTitle': '新增空間',
    'organization.space.createForGroupTitle': '為「{group}」新增空間',
    'organization.space.createForGroupBody': '這個群組會移到新空間。',
    'organization.space.renameTitle': '重新命名空間',
    'organization.space.nameLabel': '空間名稱',
    'organization.space.actions': '「{name}」空間的操作',
    'organization.space.nameRequired': '請輸入空間名稱。',
    'organization.space.unavailable': '這個空間已不存在。',
    'organization.space.parentUnavailable': '這個工作區已不存在。請關閉視窗後再試一次。',
    'organization.space.position': '第 {position} 個空間，共 {count} 個',
    'organization.space.duplicateLabel': '{name}，{position}',
    'organization.space.moveMenuLabel': '移到其他空間…',
    'organization.space.newAndMoveMenu': '移到新空間…',
    'organization.group.unavailable': '這個群組已移動或不存在。請關閉視窗後再試一次。',
    'organization.group.nameChanged': '群組名稱已變更。請確認更新後的群組，再試一次。',
    'organization.group.moveTitle': '移動群組「{group}」',
    'organization.group.moveBody': '目前位於「{source}」。請在「{workspace}」中選擇其他空間。群組和其中所有內容會一起移動。',
    'organization.group.moveListLabel': '移到',
    'organization.group.moveClose': '關閉移動群組視窗',
    'organization.group.moveOption': '移到「{space}」，{groups}',
    'organization.group.moveOptionDuplicate': '移到「{space}」，{groups}，{position}',
    'organization.group.moveOptionOne': '1 個群組',
    'organization.group.moveOptionMany': '{count} 個群組',
    'organization.group.move': '移動群組',
    'organization.group.moving': '移動中…',
    'organization.group.moveRequired': '請選擇空間。',
    'organization.group.moveDestinationUnavailable': '這個空間已不存在，請改選其他空間。',
    'organization.group.moveChanged': '群組或空間清單已變更。請確認最新選項後再移動一次。',
    'organization.group.moveRecoveryRequired': 'Locus 無法確認這次移動是否已儲存。請重新載入最新資料後再繼續。',
    'organization.group.moveContextChanged': '目前的工作區或空間已變更。請關閉視窗後再試一次。',
    'organization.group.moveNoDestination': '這個工作區中沒有其他空間。',
    'organization.group.moveHistory': '將群組「{group}」移到空間「{space}」',
    'organization.group.moved': '已將群組「{group}」移到空間「{space}」',
    'groupEditor.createTitle': '新增群組',
    'groupEditor.editTitle': '編輯群組',
    'groupEditor.duplicateTitle': '建立群組副本',
    'groupEditor.close': '關閉群組編輯器',
    'groupEditor.duplicateClose': '關閉建立群組副本視窗',
    'groupEditor.symbolLabel': '圖示',
    'groupEditor.symbolHint': '選擇圖示',
    'groupEditor.nameLabel': '群組名稱',
    'groupEditor.namePlaceholder': '例如：研究資料',
    'groupEditor.colorLabel': '顏色',
    'groupEditor.create': '新增群組',
    'groupEditor.creating': '新增中…',
    'groupEditor.duplicate': '建立副本',
    'groupEditor.duplicating': '建立副本中…',
    'groupEditor.save': '儲存變更',
    'groupEditor.saving': '儲存中…',
    'groupEditor.nameRequired': '請輸入群組名稱。',
    'groupEditor.parentUnavailable': '這個空間已移動或不存在。請關閉視窗後再試一次。',
    'groupEditor.unavailable': '這個群組已移動或不存在。請關閉視窗後再試一次。',
    'groupEditor.changed': '群組設定已變更。請確認最新的名稱、圖示和顏色，再儲存一次。',
    'groupEditor.duplicateChanged': '開啟視窗期間，群組已變更。請再選一次「建立副本」，複製最新內容。',
    'groupEditor.idUnavailable': 'Locus 無法準備這個群組，請再試一次。',
    'groupEditor.duplicateIdUnavailable': 'Locus 無法準備這個副本，請再試一次。',
    'groupEditor.recoveryRequired': 'Locus 無法確認這項變更是否已儲存。請重新載入最新資料後再繼續。',
    'groupEditor.duplicateRecoveryRequired': 'Locus 無法確認副本是否已儲存。請重新載入最新資料後再繼續。',
    'groupEditor.duplicateDefaultName': '{name}（副本）',
    'groupEditor.duplicateDescription': '建立「{group}」的副本，包括其中所有內容與提醒。副本會新增至「{space}」，原群組不受影響。',
    'groupEditor.createHistory': '新增群組「{name}」',
    'groupEditor.created': '已新增群組「{name}」',
    'groupEditor.duplicateHistory': '建立群組「{source}」的副本「{name}」',
    'groupEditor.duplicated': '已從群組「{source}」建立「{name}」',
    'groupEditor.duplicateReminderWarning': '已建立「{name}」，但副本中的部分提醒無法排程。請重新啟動瀏覽器，再到「行事曆」確認。',
    'groupEditor.editHistory': '更新群組「{name}」',
    'groupEditor.updated': '已更新群組「{name}」',
    'groupEditor.colorOption': '使用{color}',
    'groupEditor.color.indigo': '靛藍',
    'groupEditor.color.blue': '藍色',
    'groupEditor.color.cyan': '青色',
    'groupEditor.color.green': '綠色',
    'groupEditor.color.lime': '黃綠色',
    'groupEditor.color.yellow': '黃色',
    'groupEditor.color.orange': '橘色',
    'groupEditor.color.red': '紅色',
    'groupEditor.color.pink': '粉紅色',
    'groupEditor.color.purple': '紫色',
    'groupEditor.color.slate': '灰藍色',
    'groupEditor.color.custom': '目前的自訂顏色',
    'stackEditor.createTitle': '新增堆疊',
    'stackEditor.editTitle': '編輯堆疊',
    'stackEditor.batchTitle': '將所選項目建立為堆疊',
    'stackEditor.close': '關閉堆疊編輯器',
    'stackEditor.symbolLabel': '圖示',
    'stackEditor.symbolHint': '選擇圖示',
    'stackEditor.nameLabel': '堆疊名稱',
    'stackEditor.namePlaceholder': '例如：本週閱讀',
    'stackEditor.defaultName': '堆疊',
    'stackEditor.colorLabel': '顏色',
    'stackEditor.create': '新增堆疊',
    'stackEditor.creating': '新增中…',
    'stackEditor.save': '儲存變更',
    'stackEditor.saving': '儲存中…',
    'stackEditor.nameRequired': '請輸入堆疊名稱。',
    'stackEditor.parentUnavailable': '這個群組已移動或不存在。請關閉視窗後再試一次。',
    'stackEditor.unavailable': '這個堆疊已移動或不存在。請關閉視窗後再試一次。',
    'stackEditor.changed': '堆疊設定已變更。請確認最新的名稱、圖示和顏色，再儲存一次。',
    'stackEditor.selectionUnavailable': '部分所選項目已移動或不存在。請關閉視窗後重新選取。',
    'stackEditor.selectionNested': '無法同時選取堆疊及其中的項目。請調整選取範圍後再試一次。',
    'stackEditor.selectionScope': '請選取同一個空間中的項目。',
    'stackEditor.minimumSelection': '請至少選取 2 個項目。',
    'stackEditor.idUnavailable': 'Locus 無法準備這個堆疊，請再試一次。',
    'stackEditor.recoveryRequired': 'Locus 無法確認這項變更是否已儲存。請重新載入最新資料後再繼續。',
    'stackEditor.batchDescription': '將 {count} 個所選項目移至「{group}」群組中的新堆疊。',
    'stackEditor.createHistory': '新增堆疊「{name}」',
    'stackEditor.created': '已新增堆疊「{name}」',
    'stackEditor.editHistory': '更新堆疊「{name}」',
    'stackEditor.updated': '已更新堆疊「{name}」',
    'stackEditor.batchHistory': '將 {count} 個項目整理為堆疊「{name}」',
    'stackEditor.stacked': '已將 {count} 個項目整理為堆疊「{name}」',
    'stackAction.edit': '編輯堆疊…',
    'stackAction.editFor': '編輯堆疊「{name}」',
    'stackAction.editIntention': '編輯用途…',
    'stackAction.expand': '展開',
    'stackAction.collapse': '收合',
    'stackAction.expandFor': '展開堆疊「{name}」',
    'stackAction.collapseFor': '收合堆疊「{name}」',
    'stackAction.archive': '封存',
    'stackAction.aria': '堆疊「{name}」',
    'selection.selected': '個已選取',
    'selection.open': '開啟',
    'selection.openTitle': '開啟所選分頁',
    'selection.move': '移動',
    'selection.moveTitle': '移動所選項目',
    'selection.stack': '建立堆疊',
    'selection.stackTitle': '將所選項目建立為堆疊',
    'selection.archive': '封存',
    'selection.archiveTitle': '封存所選項目',
    'selection.clearTitle': '清除選取',
    'itemAction.details': '詳細資料…',
    'itemAction.editColor': '編輯顏色',
    'itemAction.setReminder': '設定提醒…',
    'itemAction.clearReminder': '清除提醒',
    'itemAction.archive': '封存',
    'groupAction.new': '新增群組',
    'groupAction.edit': '編輯群組…',
    'groupAction.editFor': '編輯群組「{name}」',
    'groupAction.more': '更多群組操作',
    'groupAction.moreFor': '「{name}」群組的操作',
    'groupAction.editIntention': '編輯用途…',
    'groupAction.setReminder': '設定提醒…',
    'groupAction.expand': '展開',
    'groupAction.collapse': '收合',
    'groupAction.expandFor': '展開群組「{name}」',
    'groupAction.collapseFor': '收合群組「{name}」',
    'groupAction.openAll': '開啟所有分頁',
    'groupAction.openAsPage': '以頁面開啟',
    'groupAction.duplicate': '建立群組副本…',
    'groupAction.addStack': '新增堆疊…',
    'groupAction.archive': '封存',
    'groupAction.oneItem': '1 個項目',
    'groupAction.items': '{count} 個項目',
    'groupAction.aria': '群組「{name}」',
    'emojiPicker.title': '選擇圖示',
    'emojiPicker.search': '搜尋圖示…',
    'emojiPicker.categories': '圖示分類',
    'emojiPicker.loading': '圖示載入中…',
    'emojiPicker.empty': '找不到圖示',
    'emojiPicker.error': '無法載入圖示。請關閉選擇器後再試一次。',
    'emojiPicker.choose': '選擇 {symbol}',
    'emojiPicker.current': '選擇圖示，目前為 {symbol}',
    'emojiPicker.category.recent': '最近使用',
    'emojiPicker.category.smileys': '表情',
    'emojiPicker.category.people': '人物',
    'emojiPicker.category.objects': '物品',
    'emojiPicker.category.symbols': '符號',
    'emojiPicker.category.food': '食物',
    'emojiPicker.category.activity': '活動',
    'emojiPicker.category.places': '地點',
    'emojiPicker.category.nature': '自然',
    'organization.space.createHistory': '新增空間「{name}」',
    'organization.space.created': '已新增空間「{name}」',
    'organization.space.createAndMoveHistory': '新增空間「{space}」並移動群組「{group}」',
    'organization.space.createdAndMoved': '已新增空間「{space}」並移動群組「{group}」',
    'organization.space.renameHistory': '空間「{from}」改名為「{to}」',
    'organization.space.renamed': '空間名稱已改為「{name}」',
    'organization.space.confirmTitle': '刪除空的空間？',
    'organization.space.confirmEmpty': '「{name}」已沒有群組、已儲存項目或提醒。刪除後，這個空間及其檢視設定會從此工作區移除，其他空間不受影響。如要復原，請先在這個頁面使用「復原」，再重新載入或關閉 Locus。',
    'organization.space.blockedTitle': '空間仍有可保留的內容',
    'organization.space.blockedBody': '請先封存或移動所有群組，再移除此空間的提醒。這次沒有刪除任何內容。',
    'organization.space.delete': '刪除空間',
    'organization.space.deleteHistory': '刪除空間「{name}」',
    'organization.space.deleted': '已刪除空間',
    'history.undid': '已復原：{action}',
    'history.redid': '已重做',
    'history.undoStale': '因為已有較新的變更，現在無法復原這項操作。',
    'history.undoPending': '這項儲存仍在完成中，完成後才能復原。',
    'history.undoInterrupted': '已有較新的變更，因此暫停復原。請先復原較新的變更，再試一次。',
    'history.undoFailed': '無法復原。已儲存的資料未被變更。',
    'history.redoInterrupted': '已有較新的變更，因此暫停重做。請重新載入最新的已儲存資料後再試一次。',
    'history.redoFailed': '無法重做。已儲存的資料未被變更。',
    'history.reminderReconcileWarning': '變更已儲存，但部分提醒無法更新。請重新啟動瀏覽器，再到「行事曆」確認。',
    'trash.today': '今天',
    'trash.yesterday': '昨天',
    'trash.thisWeek': '本週',
    'trash.earlier': '更早',
    'trash.invalid': '有 {count} 筆損壞的垃圾桶資料無法顯示，但仍會保留在匯出檔中。',
    'archive.moveToTrash': '移至垃圾桶',
    'archive.movedToTrash': '已移至垃圾桶',
    'archive.subtitle': '封存內容會留在此瀏覽器設定檔，直到復原或移至垃圾桶；解除安裝或刪除設定檔會移除資料。',
    'archive.search': '搜尋封存',
    'archive.summary.entries': '已封存 {count} 筆',
    'archive.summary.items': '已儲存 {count} 個項目',
    'archive.summary.groups': '{count} 個群組',
    'archive.summary.local': '本機',
    'archive.summary.localBody': '瀏覽器設定檔儲存；解除安裝前請先匯出',
    'archive.selected': '已選取 {count} 筆',
    'archive.restoreSelected': '復原所選項目',
    'nav.spaces': '空間',
    'nav.storage': '本機儲存',
    'priv.title': '隱私界線',
    'priv.noAccount': '免帳號',
    'priv.localOnly': '資料存於目前設定檔',
    'priv.noHost': '免主機權限',
    'priv.export': '解除安裝前先匯出',
    'rail.openedTabs': '開啟的分頁',
    'rail.dragHint': '拖入空間即可儲存',
    'rail.saveAll': '儲存符合條件的分頁',
    'rail.tip': '將分頁拖入任一空間，即可留待稍後查看。',
    'home.greeting.morning': '早安',
    'home.greeting.afternoon': '午安',
    'home.greeting.evening': '晚安',
    'home.subtitle': '專注在真正重要的事。',
    'home.viewAll': '查看全部',
    'home.items': '{n} 個項目',
    'home.empty': '空的 — 拖一個分頁進來開始',
    'home.emptyTitle': '尚無空間',
    'home.emptyBody': '新增空間，開始整理已儲存的項目。',
    'home.inboxZone': '收件匣',
    'home.inboxHint': '先儲存一個頁面，再從這裡找回它。',
    'home.openInbox': '開啟收件匣',
    'home.recentSpaces': '你的空間',
    'home.previewOpen': '開啟已儲存的{type}：「{title}」',
    'home.previewUnavailable': '目前無法從首頁開啟這個已儲存項目。請重新整理首頁後再試一次。',
    'home.previewType.tab': '連結',
    'home.previewType.note': '筆記',
    'home.previewType.todo': '待辦',
    'home.previewType.stack': '堆疊',
    'home.previewType.item': '項目',
    'empty.addSave': '新增／儲存',
    'empty.addNote': '新增筆記',
    'empty.importBookmarks': '匯入書籤',
    'empty.createGroup': '建立群組',
    'empty.browseLibrary': '瀏覽所有連結',
    'empty.browseArchive': '瀏覽封存',
    'empty.clearSearch': '清除搜尋',
    'empty.clearFilters': '清除篩選條件',
    'empty.searchAllSpaces': '搜尋所有空間',
    'empty.returnHome': '返回首頁',
    'empty.showAll': '顯示全部',
    'empty.inboxTitle': '目前沒有需要整理的內容',
    'empty.inboxBody': '從擴充功能、開啟分頁側欄或匯入功能加入的新連結會顯示在這裡。',
    'empty.spaceTitle': '「{space}」已準備好收納第一批資源',
    'empty.spaceBody': '新增連結、筆記、待辦或堆疊，開始建立這個空間。',
    'empty.searchTitle': '找不到「{query}」的結果',
    'empty.searchBody': '請嘗試更廣泛的關鍵字，或移除目前的篩選條件。',
    'empty.readLaterTitle': '稍後閱讀清單是空的',
    'empty.readLaterBody': '將資料庫中的連結留待稍後閱讀，需要時再回來。',
    'empty.favoritesTitle': '先收藏你最常使用的連結',
    'empty.favoritesBody': '將任何已儲存連結加上星號，即可快速開啟。',
    'empty.trashTitle': '沒有已刪除的項目',
    'empty.trashBody': '從封存移除的項目會在這裡保留 30 天，之後永久刪除。',
    'empty.archiveTitle': '尚無封存內容',
    'empty.archiveBody': '你封存的項目和群組會留在這裡，直到再次需要。',
    'empty.libraryTitle': '尚未儲存任何內容',
    'empty.libraryBody': '新增連結、匯入書籤或建立筆記，開始打造你的本機資料庫。',
    'empty.noMatchTitle': '沒有符合這些篩選條件的內容',
    'empty.noMatchBody': '清除搜尋或篩選條件，即可重新查看所有內容。',
    'empty.localNote': '資料存在此瀏覽器設定檔；解除安裝或刪除前請先匯出。',
    'library.linksAcross': '此工作區共有 {count} 個連結',
    'library.filterLinks': '篩選連結…',
    'library.workspace': '工作區：{name}',
    'readLater.subtitle': '平靜收納你想稍後再看的連結。',
    'search.placeholder': '搜尋你的連結…',
    'search.title': '搜尋結果',
    'search.subtitle': '立即搜尋已儲存的連結、筆記、待辦與空間。',
    'search.nav': '搜尋',
    'search.inputPlaceholder': '搜尋所有內容…',
    'search.filters': '篩選條件',
    'search.hideFilters': '隱藏篩選條件',
    'search.clear': '清除',
    'search.clearAll': '全部清除',
    'search.filterBy': '篩選',
    'search.contentType': '內容類型',
    'search.all': '全部',
    'search.links': '連結',
    'search.notes': '筆記',
    'search.todos': '待辦',
    'search.stacks': '堆疊',
    'search.space': '空間',
    'search.allSpaces': '所有空間',
    'search.time': '儲存時間',
    'search.anyTime': '不限時間',
    'search.today': '今天',
    'search.thisWeek': '本週',
    'search.thisMonth': '本月',
    'search.hasTags': '含有標籤',
    'search.tags': '標籤',
    'search.related': '相關結果',
    'search.sortBy': '排序方式',
    'search.bestMatch': '最佳符合',
    'search.newest': '最新',
    'search.results': '搜尋結果',
    'search.recent': '最近儲存',
    'search.resultCount': '{count} 個結果',
    'search.loading': '正在搜尋你的本機資料庫…',
    'search.noItems': '尚未儲存任何內容',
    'search.noItemsBody': '儲存連結、筆記、待辦或堆疊後，就能在這裡搜尋。',
    'search.noResults': '沒有符合此搜尋的結果',
    'search.noResultsBody': '請減少關鍵字、改選其他空間，或清除篩選條件。',
    'search.error': '無法完成搜尋',
    'search.errorBody': '你的資料未被變更。請清除查詢後再試一次。',
    'search.open': '開啟',
    'search.details': '詳細資料',
    'search.favorite': '加入收藏',
    'search.unfavorite': '移除收藏',
    'search.preview': '已選取的結果',
    'search.selectResult': '選取一筆結果即可預覽。',
    'search.saved': '儲存時間',
    'search.location': '位置',
    'search.noNotes': '尚未新增筆記。',
    'search.stats': '搜尋統計',
    'search.tips': '搜尋提示',
    'search.tipOperators': '可使用 type:、in:、tag:、domain:、color: 或 is: 運算子。',
    'search.tipQuotes': '將詞組放在引號中可進行精確文字比對。',
    'search.tipExclude': '在文字或運算子前加上 - 即可排除。',
    'search.resultAria': '搜尋結果：{title}',
    'search.stackItems': '{count} 個巢狀項目',
    'search.unknownDate': '沒有日期',
    'detail.close': '關閉項目詳細資料',
    'detail.closeTitle': '關閉詳細資料（Esc）',
    'detail.open': '開啟連結',
    'detail.emptyNote': '這則筆記目前是空的，請回到看板編輯。',
    'detail.title': '標題',
    'detail.url': '網址',
    'detail.task': '待辦內容',
    'detail.stackName': '堆疊名稱',
    'detail.markComplete': '標示為完成',
    'detail.markIncomplete': '標示為未完成',
    'detail.whySaved': '儲存原因',
    'detail.notesPlaceholder': '補上背景、引用內容或下一步…',
    'detail.reminder': '提醒',
    'detail.pastDue': '已逾期',
    'detail.repeats': '重複：{schedule}',
    'detail.daily': '每天',
    'detail.weekly': '每週',
    'detail.monthly': '每月',
    'detail.everyDays': '每 {count} 天',
    'detail.everyWeeks': '每 {count} 週',
    'detail.everyMonths': '每 {count} 個月',
    'detail.changeReminder': '變更',
    'detail.clearReminder': '清除',
    'detail.setReminder': '設定提醒…',
    'detail.closeReminderDialog': '關閉提醒視窗',
    'reminder.setTitle': '設定提醒',
    'reminder.editTitle': '編輯提醒',
    'reminder.label': '提醒名稱',
    'reminder.labelOptional': '提醒名稱（選填）',
    'reminder.reviewExample': '例如：檢視「{name}」',
    'reminder.routineExample': '例如：「{name}」例行事項',
    'reminder.inOneHour': '1 小時後',
    'reminder.inThreeHours': '3 小時後',
    'reminder.tomorrow': '明天',
    'reminder.nextWeek': '下週',
    'reminder.pickDate': '或選擇日期',
    'reminder.repeat': '重複',
    'reminder.none': '不重複',
    'reminder.daily': '每天',
    'reminder.weekly': '每週',
    'reminder.monthly': '每月',
    'reminder.clear': '清除',
    'reminder.remove': '移除',
    'reminder.update': '更新',
    'reminder.set': '設定',
    'reminder.futureTime': '請選擇未來的時間',
    'reminder.saving': '正在儲存提醒…',
    'reminder.changed': '這個項目已變更或移動。請關閉這個視窗，重新開啟項目後再試一次。',
    'reminder.saveFailed': 'Locus 無法確認提醒是否已儲存。請重新載入最新資料後再繼續。',
    'reminder.setSuccess': '提醒已儲存',
    'reminder.clearSuccess': '提醒已清除',
    'reminder.scheduleWarning': '提醒已儲存，但目前可能不會通知。請重新啟動瀏覽器，再到「行事曆」確認。',
    'reminder.clearScheduleWarning': '提醒已清除，但原本的通知可能仍會出現。請重新啟動瀏覽器，再到「行事曆」確認。',
    'reminder.setHistory': '設定提醒',
    'reminder.updateHistory': '更新提醒',
    'reminder.clearHistory': '清除提醒',
    'detail.tags': '標籤',
    'detail.addTag': '新增標籤…',
    'detail.removeTag': '移除標籤「{tag}」',
    'detail.more': '更多詳細資料',
    'detail.cover': '封面',
    'detail.coverColor': '使用封面色彩 {color}',
    'detail.coverEmoji': '封面表情符號',
    'detail.clearCover': '清除封面',
    'detail.checklist': '檢查清單',
    'detail.checklistItem': '清單項目',
    'detail.toggleChecklist': '切換清單項目「{item}」的完成狀態',
    'detail.removeChecklist': '移除清單項目「{item}」',
    'detail.addChecklist': '新增清單項目…',
    'detail.customFields': '自訂欄位',
    'detail.fieldLabel': '欄位名稱',
    'detail.fieldValue': '內容',
    'detail.removeField': '移除自訂欄位「{label}」',
    'detail.addField': '新增欄位',
    'detail.saving': '正在儲存變更…',
    'detail.saved': '變更已儲存',
    'detail.changed': '這個項目已變更或移動。請重新開啟詳細資料後再試一次。',
    'detail.saveFailed': 'Locus 無法確認這項變更是否已儲存。請重新載入最新資料後再繼續。',
    'detail.history.editTitle': '編輯項目標題',
    'detail.history.editUrl': '編輯項目網址',
    'detail.history.updateTask': '更新待辦',
    'detail.history.renameStack': '重新命名堆疊',
    'detail.history.updateCover': '更新封面',
    'detail.history.editNotes': '編輯儲存原因',
    'detail.history.updateTags': '更新標籤',
    'detail.history.updateChecklist': '更新檢查清單',
    'detail.history.updateFields': '更新自訂欄位'
  }
};

function tr(key, vars = {}) {
  const table = I18N[appLocale()] || I18N.en;
  let text = table[key] || I18N.en[key] || key;
  Object.entries(vars).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, value);
  });
  return text;
}

function applyLocale() {
  const lang = appLocale();
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = tr(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = tr(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = tr(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    el.setAttribute('aria-label', tr(el.dataset.i18nAriaLabel));
  });
  document.querySelectorAll('#seg-language button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === lang);
  });
  const organizationName = document.getElementById('organization-name-overlay');
  if (organizationName && !organizationName.classList.contains('hidden')) {
    paintOrganizationNameDialog();
  }
  const organization = document.getElementById('organization-delete-overlay');
  if (organization && !organization.classList.contains('hidden')) {
    paintOrganizationDeleteDialog();
  }
  const identityEditor = document.getElementById('modal-overlay');
  if (identityEditor && !identityEditor.classList.contains('hidden')) {
    paintIdentityEditor();
  }
  const emojiPicker = document.getElementById('emoji-picker');
  if (emojiPicker && !emojiPicker.classList.contains('hidden')) {
    paintEmojiPicker();
  }
}

// ════════════════════════════════════════════════════════════════
// STATE + UNDO
// ════════════════════════════════════════════════════════════════
let loadedSchema = 0;
const State = (() => {
  const createInitialState = () => ({
    workspaces: [], activeWsId: null, archive: [], trash: [], recentEmoji: [],
    columnWidths: {},
    settings: {
      theme:'folio', size:'normal', font:'dm', width:'normal',
      language: browserLanguage(),
      closeTabOnSave:true, hibernate:true, showUrls:true,
      animate:true, confirmDelete:true, sidebarCollapsed:false,
      blurPrivacy:false, windowSync:false, showLanding:true,
      captureDefaultCategoryId:'', captureAskEveryTime:true,
      captureRememberLast:true, captureDeduplicate:true,
      captureIncludeTitle:true, captureIncludeFavicon:true,
      popupHibernateScope:'window', popupHibernateKeepPinned:true,
      popupHibernateKeepAudio:true, popupHibernateSaveBefore:false,
      popupHibernateSelectedTabIds:[], popupSaveMode:'group',
      onboarding: { welcomeSeen:false, hintsSeen:{}, disabled:false }
    }
  });
  let state = createInitialState();
  let history = [], future = [];
  let nextActionId = 1;
  let mutationEpoch = 0;
  let dataMutationEpoch = 0;
  let persistTimer = null;
  let stateWriteQueue = Promise.resolve();
  let stateWriteFailureEpoch = 0;
  let pendingStateWrites = 0;
  let asyncMutationCount = 0;
  let confirmedRevision = 0;
  let confirmedStateJson = '';
  let inFlightExpectedStateJson = '';
  let recoveryRequired = false;
  let recoveryPromise = null;
  let latestObservedState = null;
  const acceptedSelfWrites = new Map();
  // structuredClone is ~3× faster than JSON round-tripping and handles
  // Dates/Maps/etc. Falls back to JSON for ancient browsers.
  const deepClone = typeof structuredClone === 'function'
    ? (o => structuredClone(o))
    : (o => JSON.parse(JSON.stringify(o)));
  const stateJson = value => JSON.stringify(value);
  const cancelPersistTimer = () => {
    if (persistTimer != null) clearTimeout(persistTimer);
    persistTimer = null;
  };
  const hydrateStoredState = stored => {
    const base = createInitialState();
    const incoming = deepClone(stored);
    return {
      ...base,
      ...incoming,
      settings: { ...base.settings, ...(incoming.settings || {}) },
    };
  };
  const recoveryError = (message = 'Locus must reload the latest saved data before it can save more changes.') => {
    const error = new Error(message);
    error.code = 'LOCUS_STATE_RECOVERY_REQUIRED';
    return error;
  };
  const markConfirmed = confirmed => {
    confirmedRevision = Number(confirmed?._revision) || 0;
    confirmedStateJson = stateJson(confirmed);
  };
  const storedRevision = stored => {
    const revision = Number(stored?._revision ?? 0);
    return Number.isSafeInteger(revision) && revision >= 0 && revision < Number.MAX_SAFE_INTEGER
      ? revision
      : null;
  };
  const rememberObservedState = stored => {
    const revision = storedRevision(stored);
    const latestRevision = storedRevision(latestObservedState);
    if (revision != null && (latestRevision == null || revision >= latestRevision)) {
      latestObservedState = deepClone(stored);
    }
  };
  const rememberAcceptedSelfWrite = candidate => {
    const revision = storedRevision(candidate);
    if (revision == null) return;
    acceptedSelfWrites.set(revision, stateJson(candidate));
    while (acceptedSelfWrites.size > 8) acceptedSelfWrites.delete(acceptedSelfWrites.keys().next().value);
  };
  const adoptAuthoritative = stored => {
    state = hydrateStoredState(stored);
    loadedSchema = Number(state.schema) || 0;
    // The stored graph is the concurrency authority. Record that exact hydrated
    // baseline first, then normalize legacy/default/retention fields only in
    // memory; the normal guarded persistence path can commit those differences.
    markConfirmed(state);
    if (typeof migrate === 'function') migrate();
    if (typeof normalizeExpiredTrash === 'function') normalizeExpiredTrash();
    if (typeof ensureDefault === 'function') ensureDefault();
    if (typeof normalizeLoadedSettings === 'function') normalizeLoadedSettings();
    history = [];
    future = [];
    mutationEpoch++;
    recoveryRequired = false;
  };
  function requireRecovery() {
    if (!recoveryRequired) {
      recoveryRequired = true;
      stateWriteFailureEpoch++;
      // Stop async Undo/Redo or other browser-side mutation loops at their next
      // guarded await boundary. Recovery never lets those effects continue on
      // top of an unknown authoritative graph.
      mutationEpoch++;
    }
    cancelPersistTimer();
  }
  const isMissingStateWriteReceiver = error =>
    /Receiving end does not exist\.?$/i.test(String(error?.message || error || '').trim());
  const configuredReceiverRetryMs = Number(globalThis.LOCUS_STATE_RECEIVER_RETRY_MS);
  const receiverRetryMs = Number.isFinite(configuredReceiverRetryMs) && configuredReceiverRetryMs >= 0
    ? Math.min(configuredReceiverRetryMs, 1000)
    : 150;
  async function sendStateWriteMessage(candidate, retryAllowed = () => true, { reconcileReminders = false } = {}) {
    let missingReceiver = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, receiverRetryMs * attempt));
        // Promise.race cannot cancel an already-sent runtime message. If the
        // receipt deadline won while a delayed no-receiver rejection was still
        // pending, do not let that abandoned operation launch another write.
        if (!retryAllowed()) throw missingReceiver;
      }
      try {
        return await chrome.runtime.sendMessage({
          type: 'locus-state-write',
          state: candidate,
          ...(reconcileReminders ? { reconcileReminders: true } : {}),
        });
      } catch (error) {
        // This exact rejection means no listener accepted the message, so a
        // bounded retry cannot duplicate a committed write. Every other channel
        // failure keeps its unknown-outcome, never-retry semantics.
        if (!isMissingStateWriteReceiver(error) || !retryAllowed()) throw error;
        missingReceiver = error;
      }
    }
    const error = new Error('Locus could not reach its background service. Reload Locus; if this repeats, reload the extension from the browser Extensions page.');
    error.code = 'LOCUS_STATE_RECEIVER_UNAVAILABLE';
    error.receiverError = String(missingReceiver?.message || missingReceiver || '');
    throw error;
  }
  async function requestStateWrite(candidate, { reconcileReminders = false } = {}) {
    const localRevision = storedRevision(state);
    if (localRevision == null) {
      const error = new Error('Locus found an invalid local state revision. Reload before making more changes.');
      error.code = 'LOCUS_STATE_PROTOCOL';
      requireRecovery();
      throw error;
    }
    candidate._revision = localRevision;
    const expectedStoredState = deepClone(candidate);
    expectedStoredState._revision = localRevision + 1;
    inFlightExpectedStateJson = stateJson(expectedStoredState);
    let receiptTimer = null;
    let receiverRetryOpen = true;
    try {
      const configuredTimeout = Number(globalThis.LOCUS_STATE_WRITE_TIMEOUT_MS);
      const receiptTimeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : 10000;
      const receiptTimeout = new Promise((_, reject) => {
        receiptTimer = setTimeout(() => {
          const error = new Error('Locus could not confirm this save in time. Reload the latest saved data before retrying.');
          error.code = 'LOCUS_STATE_UNKNOWN_ACK';
          reject(error);
        }, receiptTimeoutMs);
      });
      const response = await Promise.race([
        sendStateWriteMessage(candidate, () => receiverRetryOpen, { reconcileReminders }),
        receiptTimeout,
      ]);
      if (!response?.ok) {
        const error = new Error(response?.message || 'Locus could not confirm this save. Reload this page, then retry.');
        error.code = response ? (response.code || 'LOCUS_STATE_WRITE_FAILED') : 'LOCUS_STATE_UNKNOWN_ACK';
        throw error;
      }
      const nextRevision = Number(response.revision);
      if (!Number.isSafeInteger(nextRevision) || nextRevision !== localRevision + 1) {
        const error = new Error('Locus received an invalid save confirmation. Reload this page before making more changes.');
        error.code = 'LOCUS_STATE_PROTOCOL';
        throw error;
      }
      candidate._revision = nextRevision;
      state._revision = nextRevision;
      markConfirmed(candidate);
      rememberAcceptedSelfWrite(candidate);
      // A typed receipt confirms this candidate, but a different storage event
      // may already have reported a still-newer graph. Keep the capture/source
      // effects fail-closed until that authoritative graph is reloaded.
      if (recoveryRequired) throw recoveryError();
      return response;
    } catch (error) {
      // An exhausted missing-receiver sequence leaves authority unchanged but
      // still leaves this local graph unsaved. Every other transport failure,
      // malformed/lost receipt, timeout, or writer conflict may have an unknown
      // commit outcome. Both cases block queued successors; only an authoritative
      // reread or reload can resume persistence.
      if (error && typeof error === 'object' && error.code !== 'LOCUS_STATE_RECEIVER_UNAVAILABLE') {
        error.locusExpectedStateJson = inFlightExpectedStateJson;
      }
      requireRecovery();
      throw error;
    } finally {
      receiverRetryOpen = false;
      if (receiptTimer != null) clearTimeout(receiptTimer);
      inFlightExpectedStateJson = '';
    }
  }
  function writeState({ reconcileReminders = false } = {}) {
    if (recoveryRequired) return Promise.reject(recoveryError());
    // Each call owns an immutable candidate. If any earlier queued write fails,
    // every candidate already waiting behind it is invalid because its graph may
    // include optimistic state that a capture failure is about to roll back.
    const candidate = deepClone(state);
    const enqueuedFailureEpoch = stateWriteFailureEpoch;
    const reconcileRemindersAfterWrite = reconcileReminders === true;
    const requestWrite = () => {
      if (recoveryRequired) throw recoveryError();
      if (enqueuedFailureEpoch !== stateWriteFailureEpoch) {
        const error = new Error('An earlier Locus save failed, so this queued save was cancelled. Reload Locus, then retry.');
        error.code = 'LOCUS_STATE_QUEUE_INVALIDATED';
        throw error;
      }
      return requestStateWrite(candidate, { reconcileReminders: reconcileRemindersAfterWrite });
    };
    pendingStateWrites++;
    const run = stateWriteQueue.then(requestWrite);
    const tracked = run.finally(() => { pendingStateWrites--; });
    stateWriteQueue = tracked.then(
      () => undefined,
      () => { stateWriteFailureEpoch++; },
    );
    return tracked;
  }
  return {
    get: () => state,
    async load() {
      cancelPersistTimer();
      state = createInitialState();
      history = [];
      future = [];
      latestObservedState = null;
      acceptedSelfWrites.clear();
      recoveryRequired = false;
      const d = await chrome.storage.local.get('te');
      if (d.te) {
        loadedSchema = Number(d.te.schema) || 0;
        state = hydrateStoredState(d.te);
      }
      if (storedRevision(state) == null) {
        confirmedRevision = 0;
        confirmedStateJson = stateJson(state);
        requireRecovery();
      } else {
        markConfirmed(state);
      }
    },
    needsPersistence: () => stateJson(state) !== confirmedStateJson,
    hasActiveOperation: () => pendingStateWrites > 0
      || asyncMutationCount > 0
      || history.some(entry => entry.capturePending),
    isClean: () => !recoveryRequired
      && persistTimer == null
      && pendingStateWrites === 0
      && asyncMutationCount === 0
      && !history.some(entry => entry.capturePending)
      && stateJson(state) === confirmedStateJson,
    observeStoredState(stored) {
      if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
        requireRecovery();
        return 'recovery';
      }
      const incomingRevision = storedRevision(stored);
      if (incomingRevision == null) {
        requireRecovery();
        return 'recovery';
      }
      rememberObservedState(stored);
      const incomingJson = stateJson(hydrateStoredState(stored));
      // storage.onChanged can precede the runtime receipt for our own write.
      // It is only an observation, never authority to close source tabs.
      if (inFlightExpectedStateJson && incomingJson === inFlightExpectedStateJson) return 'self';
      if ((Number(stored.schema) || 0) > CURRENT_SCHEMA) {
        requireRecovery();
        return 'recovery';
      }
      if (incomingRevision < confirmedRevision
        && acceptedSelfWrites.get(incomingRevision) === incomingJson) return 'ignored';
      if (incomingRevision < confirmedRevision) {
        requireRecovery();
        return 'recovery';
      }
      if (incomingRevision === confirmedRevision) {
        if (incomingJson === confirmedStateJson) return 'ignored';
        requireRecovery();
        return 'recovery';
      }
      if (this.isClean()) {
        adoptAuthoritative(stored);
        latestObservedState = null;
        return 'adopted';
      }
      requireRecovery();
      return 'recovery';
    },
    requireRecovery,
    isRecoveryRequired: () => recoveryRequired,
    matchesUnconfirmedWrite: error => !!error?.locusExpectedStateJson
      && stateJson(state) === error.locusExpectedStateJson,
    async recoverAuthoritative({ expectedDataMutationToken = null } = {}) {
      if (recoveryPromise) return recoveryPromise;
      requireRecovery();
      recoveryPromise = (async () => {
        // Let the in-flight request settle and cancel every already-queued
        // successor before reading. Never merge a dirty whole graph.
        await stateWriteQueue;
        const d = await chrome.storage.local.get('te');
        let authoritative = d.te;
        if (!authoritative || typeof authoritative !== 'object' || Array.isArray(authoritative)) {
          const error = new Error('Locus could not find a valid saved state. Reload this page before editing.');
          error.code = 'LOCUS_STATE_RECOVERY_FAILED';
          throw error;
        }
        const readRevision = storedRevision(authoritative);
        if (readRevision == null) {
          const error = new Error('Locus found an invalid saved-state revision. Reload this page before editing.');
          error.code = 'LOCUS_STATE_PROTOCOL';
          throw error;
        }
        // storage.local.get can resolve with a snapshot older than an onChanged
        // event that arrived while the read was pending. Prefer the highest
        // observed authoritative revision; equal-token graph disagreement is a
        // protocol failure, never a graph to guess between.
        if (latestObservedState) {
          const observedRevision = storedRevision(latestObservedState);
          if (observedRevision == null) {
            const error = new Error('Locus observed an invalid saved-state revision. Reload this page before editing.');
            error.code = 'LOCUS_STATE_PROTOCOL';
            throw error;
          }
          if (observedRevision > readRevision) authoritative = latestObservedState;
          else if (observedRevision === readRevision
            && stateJson(hydrateStoredState(latestObservedState)) !== stateJson(hydrateStoredState(authoritative))) {
            const error = new Error('Locus observed two different saved graphs with the same revision. Reload before editing.');
            error.code = 'LOCUS_STATE_PROTOCOL';
            throw error;
          }
        }
        const authoritativeRevision = storedRevision(authoritative);
        if (authoritativeRevision == null || authoritativeRevision < confirmedRevision) {
          const error = new Error('Locus refused to recover to an older or invalid saved-state revision. Reload before editing.');
          error.code = 'LOCUS_STATE_PROTOCOL';
          throw error;
        }
        const schema = Number(authoritative.schema) || 0;
        if (schema > CURRENT_SCHEMA) {
          loadedSchema = schema;
          const error = new Error(`Saved data uses newer schema ${schema}. Update Locus before continuing.`);
          error.code = 'LOCUS_STATE_NEWER_SCHEMA';
          throw error;
        }
        if (expectedDataMutationToken != null && dataMutationEpoch !== expectedDataMutationToken) {
          const error = new Error('Authoritative recovery paused because a newer local edit was made. Reload before continuing.');
          error.code = 'LOCUS_STATE_RECOVERY_INTERRUPTED';
          throw error;
        }
        adoptAuthoritative(authoritative);
        latestObservedState = null;
        return state;
      })();
      try {
        return await recoveryPromise;
      } finally {
        recoveryPromise = null;
      }
    },
    persist() {
      mutationEpoch++;
      dataMutationEpoch++;
      if (recoveryRequired) {
        const error = recoveryError();
        if (typeof showStateRecoveryRequired === 'function') showStateRecoveryRequired(error);
        else handleStorageError(error);
        return;
      }
      cancelPersistTimer();
      persistTimer = setTimeout(() => {
        persistTimer = null;
        writeState()
          .then(() => { try { refreshStorageUsage(); } catch {} })
          .catch(err => recoverAfterOrdinaryWriteFailure(err));
      }, 180);
    },
    persistNow({ recordMutation = true, reconcileReminders = false } = {}) {
      if (recordMutation) {
        mutationEpoch++;
        dataMutationEpoch++;
      }
      cancelPersistTimer();
      const p = writeState({ reconcileReminders });
      p.then(() => { try { refreshStorageUsage(); } catch {} })
       .catch(err => {
         handleStorageError(err);
         if (recoveryRequired && typeof showStateRecoveryRequired === 'function') showStateRecoveryRequired(err);
       });
      return p;
    },
    snapshot(label) {
      mutationEpoch++;
      dataMutationEpoch++;
      const actionId = nextActionId++;
      history.push({ actionId, label, data: deepClone(state), closedTabs: [], capturePending: false });
      if (history.length > 50) history.shift();
      future.length = 0;
      return actionId;
    },
    latestActionId() {
      return history[history.length - 1]?.actionId ?? null;
    },
    dataMutationToken: () => dataMutationEpoch,
    beginCaptureAction(actionId) {
      const entry = history.find(candidate => candidate.actionId === actionId);
      if (!entry || entry.capturePending) return false;
      entry.capturePending = true;
      return true;
    },
    finishCaptureAction(actionId) {
      const entry = history.find(candidate => candidate.actionId === actionId);
      if (!entry || !entry.capturePending) return false;
      entry.capturePending = false;
      return true;
    },
    registerClosedTabs(actionId, tabs) {
      let entry = null;
      for (let index = history.length - 1; index >= 0; index--) {
        if (history[index].actionId === actionId) { entry = history[index]; break; }
      }
      if (!entry || !Array.isArray(tabs) || !tabs.length) return false;
      entry.closedTabs = tabs.map(tab => ({
        url: tab.url,
        pinned: !!tab.pinned,
        restoredTabId: null,
      })).filter(tab => typeof tab.url === 'string' && tab.url);
      return entry.closedTabs.length > 0;
    },
    rollbackSnapshot(actionId = null) {
      const latest = history[history.length - 1];
      if (actionId != null && latest?.actionId !== actionId) return false;
      cancelPersistTimer();
      const previous = history.pop();
      if (!previous) return false;
      state = previous.data;
      future.length = 0;
      return true;
    },
    clearUndoHistory() {
      history.length = 0;
      future.length = 0;
    },
    async undo(expectedActionId = null) {
      if (!history.length) return null;
      const latest = history[history.length - 1];
      if (expectedActionId != null && latest.actionId !== expectedActionId) {
        const error = new Error('Undo is no longer available because newer changes were made.');
        error.code = 'LOCUS_UNDO_STALE';
        throw error;
      }
      if (latest.capturePending) {
        const error = new Error('This save is still finishing. Undo will be available when it completes.');
        error.code = 'LOCUS_UNDO_PENDING';
        throw error;
      }
      asyncMutationCount++;
      const undoEpoch = mutationEpoch;
      const previousIndex = history.length - 1;
      const current = deepClone(state);
      const previous = history.pop();
      const closedTabs = Array.isArray(previous.closedTabs) ? previous.closedTabs : [];
      const restoreHistoryEntry = () => {
        if (history.some(entry => entry.actionId === previous.actionId)) return;
        history.splice(Math.min(previousIndex, history.length), 0, previous);
        if (history.length > 50) history.shift();
      };
      const interruptedError = () => {
        const error = new Error('Undo paused because newer changes were made. Undo the newer change first, then retry.');
        error.code = 'LOCUS_UNDO_INTERRUPTED';
        return error;
      };
      const ensureUnchanged = () => {
        if (recoveryRequired || mutationEpoch !== undoEpoch) throw interruptedError();
      };
      try {
        // Browser-side capture effects are part of the same undo contract. Open
        // the source pages before removing their saved records. Remember each
        // created tab so a persistence retry does not open it a second time.
        for (const tab of closedTabs) {
          ensureUnchanged();
          if (tab.restoredTabId != null) {
            let stillOpen = false;
            try {
              await chrome.tabs.get(tab.restoredTabId);
              stillOpen = true;
            } catch {
              tab.restoredTabId = null;
            }
            ensureUnchanged();
            if (stillOpen) continue;
          }
          const restored = await chrome.tabs.create({ url: tab.url, pinned: tab.pinned, active: false });
          tab.restoredTabId = restored?.id ?? null;
          ensureUnchanged();
        }
        ensureUnchanged();
        if (closedTabs.length) future.length = 0;
        else future.push({ data: current });
        state = previous.data;
        // History captures user data, not authority to reuse an old concurrency
        // token. Undo must advance from the currently persisted revision.
        state._revision = current._revision;
        await this.persistNow({ recordMutation: false });
        return previous.label;
      } catch (error) {
        if (mutationEpoch !== undoEpoch) {
          restoreHistoryEntry();
          throw error?.code === 'LOCUS_UNDO_INTERRUPTED' ? error : interruptedError();
        }
        state = current;
        if (!closedTabs.length) future.pop();
        restoreHistoryEntry();
        throw error;
      } finally {
        asyncMutationCount--;
      }
    },
    async redo() {
      if (!future.length) return null;
      const current = deepClone(state);
      const next = future.pop();
      history.push({ actionId: nextActionId++, label:'redo', data: current, closedTabs: [], capturePending: false });
      state = next.data;
      state._revision = current._revision;
      let writeDataToken = dataMutationEpoch;
      try {
        const persistence = this.persistNow();
        writeDataToken = dataMutationEpoch;
        await persistence;
        return 'redo';
      } catch (error) {
        if (dataMutationEpoch !== writeDataToken) {
          const interrupted = new Error('Redo paused because newer changes were made. Reload the latest saved data before continuing.');
          interrupted.code = 'LOCUS_REDO_INTERRUPTED';
          throw interrupted;
        }
        state = current;
        history.pop();
        future.push(next);
        throw error;
      }
    },
    canUndo: () => history.length > 0 && !history[history.length - 1].capturePending,
    canRedo: () => future.length > 0
  };
})();

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// Stamp a freshly-built item with a creation time (ms) unless it already has
// one. Enables the Timeline layout (§3.2) and reminder sorting; items created
// before schema 4 have no createdAt and fall back to array order. Returns the
// same object so it can wrap an item literal inline: g.items.push(stampNew({…})).
const stampNew = it => { if (it && it.createdAt == null) it.createdAt = Date.now(); return it; };
const esc = s => !s ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _favCache = new Map();
const favUrl = (u, size = 32) => {
  if (!u) return '';
  try {
    const page = new URL(u);
    if (!/^https?:$/.test(page.protocol)) return '';
    const key = `${page.origin}|${size}`;
    let v = _favCache.get(key);
    if (v === undefined) {
      const endpoint = new URL(chrome.runtime.getURL('_favicon/'));
      endpoint.searchParams.set('pageUrl', page.href);
      endpoint.searchParams.set('size', String(size));
      v = endpoint.href;
      _favCache.set(key, v);
    }
    return v;
  } catch { return ''; }
};
const dispUrl = u => { try { const x = new URL(u); return x.hostname + (x.pathname.length > 1 ? x.pathname.slice(0, 40) : ''); } catch { return u; } };
const isProto = u => !u || u.startsWith('chrome') || u.startsWith('edge') || u.startsWith('about') || u.startsWith('view-source');
const BLANK_FAV = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%23444'/%3E%3C/svg%3E`;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
// Coalesce multiple calls per frame into one rAF-scheduled invocation.
const rafThrottle = fn => { let q = null, lastArgs; return (...a) => { lastArgs = a; if (q != null) return; q = requestAnimationFrame(() => { q = null; fn(...lastArgs); }); }; };
// Cached node list for the board; invalidated whenever renderBoard runs.
let _itemNodeCache = null;
const invalidateItemCache = () => { _itemNodeCache = null; };
const getItemNodes = () => { if (!_itemNodeCache) _itemNodeCache = document.querySelectorAll('.item'); return _itemNodeCache; };
const INTENT_STATUS = ['active', 'paused', 'someday', 'done', 'reference'];
const INTENT_TYPE = ['project', 'study', 'research', 'admin', 'life', 'reference', 'other'];

// Allowlist HTML sanitizer for note content. Notes render through innerHTML,
// and their html can arrive from an imported file or a clipboard paste, so a
// regex pass isn't safe — an unquoted image error handler with no closing
// tag) walks straight through one. Parse into an inert document instead, drop
// disallowed elements, and strip every event handler and unsafe URL.
const SANITIZE_KEEP = new Set(['A','ABBR','B','BLOCKQUOTE','BR','CODE','DEL','DIV','EM','FONT','H1','H2','H3','H4','H5','H6','HR','I','INS','LI','MARK','OL','P','PRE','S','SMALL','SPAN','STRONG','SUB','SUP','U','UL']);
const SANITIZE_DROP = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','LINK','META','BASE','FORM','INPUT','BUTTON','TEXTAREA','SELECT','OPTION','SVG','MATH','NOSCRIPT','TEMPLATE','FRAME','FRAMESET','APPLET','AUDIO','VIDEO','SOURCE']);
const SANITIZE_URL_ATTRS = new Set(['href','src','xlink:href','action','formaction','background','poster','cite','data']);

function safeUrlValue(value) {
  // DOMParser has already decoded HTML entities, so a scheme is either literal
  // or gone. Strip control chars first to defeat `java\tscript:`-style splits.
  const v = String(value).replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (!v) return '';
  if (/^(?:https?:|mailto:|tel:|ftp:)/i.test(v)) return v;
  if (/^data:image\/(?:png|jpe?g|gif|webp|bmp|x-icon)[;,]/i.test(v)) return v;
  if (/^[a-z][a-z0-9+.\-]*:/i.test(v)) return '';   // some other scheme → block
  return v;                                          // relative / anchor / query
}

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(String(html == null ? '' : html), 'text/html');
  if (!doc.body) return '';
  for (const el of [...doc.body.querySelectorAll('*')]) {
    if (!el.isConnected) continue;                   // inside an already-dropped subtree
    const tag = el.tagName;
    if (SANITIZE_DROP.has(tag)) { el.remove(); continue; }
    if (!SANITIZE_KEEP.has(tag)) {
      // Unknown but not dangerous: keep the text, drop the wrapper.
      while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
      el.remove();
      continue;
    }
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name === 'srcset') { el.removeAttribute(attr.name); continue; }
      if (name === 'style') {
        // CSS can't run script in modern Chrome, but url()/expression()/@import
        // can leak requests. Keep plain declarations, drop anything fetching.
        if (/url\s*\(|expression\s*\(|javascript:|@import/i.test(attr.value)) el.removeAttribute(attr.name);
        continue;
      }
      if (SANITIZE_URL_ATTRS.has(name) && !(tag === 'A' && name === 'href')) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (tag === 'A' && name === 'href') {
        const safe = safeUrlValue(attr.value);
        if (safe) el.setAttribute(attr.name, safe); else el.removeAttribute(attr.name);
      }
    }
  }
  return doc.body.innerHTML;
}

function fmtTimeRelative(ts) {
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  if (abs < 60000) return diff > 0 ? 'soon' : 'now';
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  if (mins < 60) return diff > 0 ? `in ${mins}m` : `${mins}m ago`;
  if (hours < 24) return diff > 0 ? `in ${hours}h` : `${hours}h ago`;
  return diff > 0 ? `in ${days}d` : `${days}d ago`;
}

function hasIntentMeta(entity) {
  if (!entity || !entity.intent) return false;
  const i = entity.intent;
  return !!(i.purpose || i.nextAction || i.status || i.type);
}
function ensureIntentMeta(entity) {
  if (!entity) return null;
  if (!entity.intent) entity.intent = {};
  if (!INTENT_STATUS.includes(entity.intent.status)) entity.intent.status = 'active';
  if (!INTENT_TYPE.includes(entity.intent.type)) entity.intent.type = 'other';
  return entity.intent;
}
function clearIntentMeta(entity) {
  if (entity?.intent) delete entity.intent;
}
function renderIntentPills(entity) {
  if (!hasIntentMeta(entity)) return '';
  const i = ensureIntentMeta(entity);
  const next = (i.nextAction || '').trim();
  return `
    <div class="intent-meta">
      <span class="intent-pill status status-${esc(i.status)}">${esc(i.status)}</span>
      <span class="intent-pill type">${esc(i.type)}</span>
      ${next ? `<span class="intent-next">Next: ${esc(next.slice(0, 72))}${next.length > 72 ? '…' : ''}</span>` : ''}
    </div>`;
}

const activeWs = () => State.get().workspaces.find(w => w.id === State.get().activeWsId);
const activeCat = () => { const ws = activeWs(); return ws ? (ws.categories.find(c => c.id === ws.activeCatId) || ws.categories[0]) : null; };

function findGroup(gId) {
  for (const ws of State.get().workspaces)
    for (const cat of ws.categories) {
      const g = cat.groups.find(x => x.id === gId);
      if (g) return { ws, cat, group: g };
    }
  return null;
}
function findCategory(cId) {
  for (const ws of State.get().workspaces) {
    const cat = ws.categories.find(c => c.id === cId);
    if (cat) return { ws, cat };
  }
  return null;
}
function findItemInList(list, itemId, ctx) {
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (it.id === itemId) return { ...ctx, item: it, parent: list, index: i };
    if (it.type === 'stack' && it.items) {
      const sub = findItemInList(it.items, itemId, { ...ctx, stack: it });
      if (sub) return sub;
    }
  }
  return null;
}
function findItem(itemId) {
  for (const ws of State.get().workspaces)
    for (const cat of ws.categories)
      for (const g of cat.groups) {
        const r = findItemInList(g.items, itemId, { ws, cat, group: g });
        if (r) return r;
      }
  return null;
}

// A routed detail id is valid only inside the surface named by that route.
// This prevents a moved item or stale copied URL from borrowing the wrong
// workspace/category/group heading. Library eligibility mirrors its live rows.
function validDetailItemIdForSurface(itemId, surface) {
  surface = surface || {};
  if (!itemId) return null;
  const info = findItem(itemId);
  if (!info) return null;
  if (surface.wsId && info.ws.id !== surface.wsId) return null;
  if (surface.groupId && info.group.id !== surface.groupId) return null;
  if (surface.catId && info.cat.id !== surface.catId) return null;
  if (surface.libraryMode) {
    if (info.item.type !== 'tab') return null;
    if (surface.libraryMode === 'favorites' && !info.item.favorite) return null;
    if (surface.libraryMode === 'read-later' && !info.item.readLaterAt) return null;
    if (!['all', 'favorites', 'read-later'].includes(surface.libraryMode)) return null;
  }
  return String(itemId);
}

// ════════════════════════════════════════════════════════════════
// HASH ROUTER (§2.1)
// ════════════════════════════════════════════════════════════════
// A tiny client-side router keyed off location.hash so every meaningful
// surface has a URL. Today it drives the board (active workspace / category /
// layout); group pages and the calendar (§4/§5) register as new route shapes
// later without touching the data model. Deep links survive reload because the
// selection lives in the URL, and browser back/forward "just work".
//
// Hash grammar (query is optional):
//   #/ws/<wsId>/cat/<catId>?view=<layout>     → board (default surface)
//   #/ws/<wsId>/group/<groupId>               → group page      (§4, parsed now)
//   #/ws/<wsId>/calendar                       → calendar        (§5, parsed now)
//
// We only mutate history via history.pushState/replaceState (which never fire
// hashchange/popstate), and only ever *read* state on popstate/hashchange, so
// there is no apply↔render feedback loop.

// The active non-board surface. null → the board; { groupId, itemId } while a
// group page (§4.1) is open. It lives in a module variable and is mirrored into
// the URL by the Router, so reload and back/forward restore the open group.
// renderBoard() consults it as its dispatch point (mirroring the layout
// registry), so any mutation that re-renders keeps the group page showing.
let activeGroupPage = null;

// Home surface (Waypoint-style dashboard): true → the workspace overview (greeting
// hero + one card per category) is showing instead of a category board. It sits
// above the layout registry in renderBoard() like activeCalendar / activeGroupPage,
// is the default landing surface on a fresh new-tab, and rides the URL as
// `…/home` so reload / back-forward restore it. Opening a category clears it.
let activeHome = false;

// Cross-space library surfaces from the Locus desktop navigation. These are
// intentionally ephemeral (the active workspace remains the durable route),
// while the underlying favorite flag is stored on each tab item.
let activeLibraryMode = null; // null | 'all' | 'favorites' | 'read-later' | 'archive' | 'trash'

// Dedicated saved-content search surface. Its state rides the URL rather than
// chrome.storage so a query/filter/selection survives reload and back/forward
// without becoming durable user data.
let activeSearch = null;
function searchStateFromQuery(query = {}) {
  const type = ['all', 'tab', 'note', 'todo', 'stack'].includes(query.type) ? query.type : 'all';
  const time = ['any', 'today', 'week', 'month'].includes(query.time) ? query.time : 'any';
  const sort = ['best', 'recent'].includes(query.sort) ? query.sort : 'best';
  return {
    query: String(query.q || ''),
    type,
    spaceId: String(query.space || 'all'),
    time,
    hasTags: query.tags === '1',
    tag: String(query.tag || ''),
    sort,
    selectedId: query.item ? String(query.item) : null,
    filtersOpen: query.filters !== '0',
    loading: false,
  };
}
function searchRouteQuery(state = activeSearch) {
  if (!state) return {};
  const query = {};
  if (state.query) query.q = state.query;
  if (state.type && state.type !== 'all') query.type = state.type;
  if (state.spaceId && state.spaceId !== 'all') query.space = state.spaceId;
  if (state.time && state.time !== 'any') query.time = state.time;
  if (state.hasTags) query.tags = '1';
  if (state.tag) query.tag = state.tag;
  if (state.sort && state.sort !== 'best') query.sort = state.sort;
  if (state.selectedId) query.item = state.selectedId;
  if (!state.filtersOpen) query.filters = '0';
  return query;
}

// The item whose detail sheet (§4.2) is open on Home, a board, or a Library
// surface, mirrored into that route as `?item=<id>` so it survives
// reload/back-forward. On a group page the open detail item lives in
// activeGroupPage.itemId instead (that surface owns the
// `…/group/<id>/item/<id>` path shape); the two never apply at once.
// currentDetailItemId() resolves whichever is active.
let boardDetailItemId = null;

// Explorer layout (§3.1) selection: the drilled-into group and the stack path
// (ids of nested stacks) currently expanded across the Miller columns, plus the
// selected leaf item. Ephemeral UI state — validated against live data on each
// render and reset when the category changes. _exFocusAfter carries a keyboard
// focus intent across the re-render a selection triggers.
let explorerSel = { groupId: null, stackPath: [], itemId: null };
let _exFocusAfter = null;
// Timeline layout (§3.2) time granularity: 'day' | 'week' | 'month'.
let timelineZoom = 'day';

// Calendar surface (§5). null → not on the calendar; { view, anchor } while it's
// open. view ∈ CAL_VIEWS; anchor is a ms timestamp *inside* the period being
// shown (prev/next shift it, "Today" resets it). Ephemeral like timelineZoom:
// only the view rides the URL (`…/calendar?cal=<view>`); the anchor resets to
// now on reload, exactly as the timeline's zoom does. Mutually exclusive with
// activeGroupPage — entering one clears the other.
let activeCalendar = null;
// The calendar's own filter string (§5.2) — the board search vocabulary applied
// to reminders. Ephemeral; reset each time the calendar is entered.
let calendarFilter = '';
const CAL_VIEWS = ['month', 'week', 'agenda'];

function currentDetailItemId() {
  return activeGroupPage ? (activeGroupPage.itemId || null) : (boardDetailItemId || null);
}

const Router = (() => {
  let _ready = false;

  // hash string (no leading '#') → Route object, or null when unparseable.
  function parse(hash) {
    const raw = String(hash || '').replace(/^#/, '');
    if (!raw || raw === '/') return null;
    const [pathPart, queryPart] = raw.split('?');
    const seg = pathPart.split('/').filter(Boolean); // ['ws','<id>','cat','<id>']
    const query = {};
    (queryPart ? queryPart.split('&') : []).forEach(kv => {
      const [k, v] = kv.split('=');
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    if (seg[0] !== 'ws' || !seg[1]) return null;
    const wsId = decodeURIComponent(seg[1]);
    if (seg[2] === 'cat' && seg[3]) return { type: 'board', wsId, catId: decodeURIComponent(seg[3]), query };
    if (seg[2] === 'group' && seg[3]) return { type: 'group', wsId, groupId: decodeURIComponent(seg[3]), itemId: seg[4] === 'item' ? decodeURIComponent(seg[5] || '') : null, query };
    if (seg[2] === 'library' && seg[3]) return { type: 'library', wsId, mode: decodeURIComponent(seg[3]), query };
    if (seg[2] === 'calendar') return { type: 'calendar', wsId, query };
    if (seg[2] === 'search') return { type: 'search', wsId, query };
    if (seg[2] === 'home') return { type: 'home', wsId, query };
    return { type: 'board', wsId, catId: null, query };
  }

  // Route object → canonical hash string (no leading '#').
  function build(route) {
    if (!route || !route.wsId) return '';
    const ws = encodeURIComponent(route.wsId);
    let path;
    if (route.type === 'group' && route.groupId) {
      path = `/ws/${ws}/group/${encodeURIComponent(route.groupId)}`;
      if (route.itemId) path += `/item/${encodeURIComponent(route.itemId)}`;
    } else if (route.type === 'library' && ['all', 'favorites', 'read-later', 'archive', 'trash'].includes(route.mode)) {
      path = `/ws/${ws}/library/${encodeURIComponent(route.mode)}`;
    } else if (route.type === 'calendar') {
      path = `/ws/${ws}/calendar`;
    } else if (route.type === 'search') {
      path = `/ws/${ws}/search`;
    } else if (route.type === 'home') {
      path = `/ws/${ws}/home`;
    } else {
      path = `/ws/${ws}/cat/${encodeURIComponent(route.catId || '')}`;
    }
    const q = route.query && Object.keys(route.query).length
      ? '?' + Object.entries(route.query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
      : '';
    return path + q;
  }

  // The canonical route describing the current State — the open group page when
  // one is active, otherwise the board surface.
  function currentRoute() {
    const ws = activeWs();
    if (!ws) return null;
    if (activeLibraryMode) {
      const query = boardDetailItemId ? { item: boardDetailItemId } : {};
      return { type: 'library', wsId: ws.id, mode: activeLibraryMode, query };
    }
    if (activeSearch) return { type: 'search', wsId: ws.id, query: searchRouteQuery(activeSearch) };
    if (activeCalendar) {
      // Only the view is durable in the URL; a bare `…/calendar` means month.
      const q = activeCalendar.view && activeCalendar.view !== 'month' ? { cal: activeCalendar.view } : {};
      return { type: 'calendar', wsId: ws.id, query: q };
    }
    if (activeGroupPage) {
      return { type: 'group', wsId: ws.id, groupId: activeGroupPage.groupId, itemId: activeGroupPage.itemId || null, query: {} };
    }
    if (activeHome) {
      const query = boardDetailItemId ? { item: boardDetailItemId } : {};
      return { type: 'home', wsId: ws.id, query };
    }
    const cat = activeCat();
    const query = {};
    const mode = getViewMode();
    if (mode && mode !== 'board') query.view = mode;
    if (boardDetailItemId) query.item = boardDetailItemId;
    return { type: 'board', wsId: ws.id, catId: cat ? cat.id : null, query };
  }

  // Apply a parsed route to State (select workspace / category / layout, or open
  // a group page or the calendar). Returns true if anything changed. Unknown ids
  // fall back gracefully so a stale deep link never wedges the app.
  function apply(route) {
    if (!route) return false;
    const s = State.get();
    let changed = false;
    const ws = s.workspaces.find(w => w.id === route.wsId);
    if (ws && s.activeWsId !== ws.id) { s.activeWsId = ws.id; changed = true; }

    if (route.type === 'library') {
      const mode = ['all', 'favorites', 'read-later', 'archive', 'trash'].includes(route.mode) ? route.mode : 'all';
      const routeItem = (route.query && route.query.item) || null;
      const routeWs = activeWs();
      const wantItem = validDetailItemIdForSurface(routeItem, { wsId: routeWs?.id, libraryMode: mode });
      if (activeSearch) { activeSearch = null; changed = true; }
      if (activeHome) { activeHome = false; changed = true; }
      if (activeGroupPage) { activeGroupPage = null; changed = true; }
      if (activeCalendar) { activeCalendar = null; changed = true; }
      if (boardDetailItemId !== wantItem) { boardDetailItemId = wantItem; changed = true; }
      if (activeLibraryMode !== mode) { activeLibraryMode = mode; changed = true; }
      return changed;
    }
    if (activeLibraryMode) { activeLibraryMode = null; changed = true; }

    if (route.type === 'search') {
      if (activeHome) { activeHome = false; changed = true; }
      if (activeGroupPage) { activeGroupPage = null; changed = true; }
      if (activeCalendar) { activeCalendar = null; changed = true; }
      if (boardDetailItemId) { boardDetailItemId = null; changed = true; }
      const next = searchStateFromQuery(route.query);
      const current = activeSearch ? JSON.stringify(searchRouteQuery(activeSearch)) : '';
      const wanted = JSON.stringify(searchRouteQuery(next));
      if (!activeSearch || current !== wanted) { activeSearch = next; changed = true; }
      return changed;
    }
    if (activeSearch) { activeSearch = null; changed = true; }

    if (route.type === 'home') {
      // Home is the workspace overview. Its real-item preview opens the shared
      // detail sheet over Home instead of selecting/rendering the owning Space,
      // so recovery cannot rewrite active Space or initialize an advanced
      // layout merely by being viewed.
      if (activeGroupPage) { activeGroupPage = null; changed = true; }
      if (activeCalendar) { activeCalendar = null; changed = true; }
      const routeItem = (route.query && route.query.item) || null;
      const wantItem = resolveUniqueHomePreviewItem(route.wsId, routeItem)?.item?.id || null;
      if (boardDetailItemId !== wantItem) { boardDetailItemId = wantItem; changed = true; }
      if (!activeHome) { activeHome = true; changed = true; }
      return changed;
    }
    // Any other surface leaves Home behind.
    if (activeHome) { activeHome = false; changed = true; }

    if (route.type === 'calendar') {
      // The calendar is its own full surface: leave any group page / board detail
      // pane behind. The view rides the URL; the anchor is ephemeral (defaults to
      // now), and the filter resets so a deep link opens a clean calendar.
      if (activeGroupPage) { activeGroupPage = null; changed = true; }
      if (boardDetailItemId) { boardDetailItemId = null; changed = true; }
      const view = CAL_VIEWS.includes(route.query && route.query.cal) ? route.query.cal : 'month';
      if (!activeCalendar) { activeCalendar = { view, anchor: Date.now() }; calendarFilter = ''; changed = true; }
      else if (activeCalendar.view !== view) { activeCalendar.view = view; changed = true; }
      return changed;
    }

    if (route.type === 'group') {
      // Entering a group page leaves the calendar surface behind.
      if (activeCalendar) { activeCalendar = null; changed = true; }
      // A group page owns the item-detail surface via its path, so any board
      // detail pane is left behind when we enter one.
      if (boardDetailItemId) { boardDetailItemId = null; changed = true; }
      // Resolve the group (searched globally); select its workspace + category
      // so the board underneath and the breadcrumb stay coherent, then mark the
      // group-page surface active. A stale/deleted id falls back to the board.
      const info = route.groupId ? findGroup(route.groupId) : null;
      if (info) {
        if (s.activeWsId !== info.ws.id) { s.activeWsId = info.ws.id; changed = true; }
        if (info.ws.activeCatId !== info.cat.id) { info.ws.activeCatId = info.cat.id; changed = true; }
        const itemId = validDetailItemIdForSurface(route.itemId, { wsId: info.ws.id, groupId: info.group.id });
        if (!activeGroupPage || activeGroupPage.groupId !== info.group.id || activeGroupPage.itemId !== itemId) {
          activeGroupPage = { groupId: info.group.id, itemId };
          changed = true;
        }
      } else if (activeGroupPage) {
        activeGroupPage = null; changed = true;
      }
      return changed;
    }

    // Board surface: leave any open group page or calendar.
    if (activeGroupPage) { activeGroupPage = null; changed = true; }
    if (activeCalendar) { activeCalendar = null; changed = true; }

    const activeW = activeWs();
    if (activeW && route.type === 'board' && route.catId) {
      const cat = activeW.categories.find(c => c.id === route.catId);
      if (cat && activeW.activeCatId !== cat.id) { activeW.activeCatId = cat.id; changed = true; }
    }
    // Layout (§7) is stored per category. A `?view=<layout>` in the URL selects
    // it for the route's category; a bare board URL leaves the category's saved
    // layout untouched (Router.sync re-adds the `?view=` from it), so navigating
    // to a plain link never silently resets a category to the board.
    const wantView = route.query && route.query.view;
    if (typeof LAYOUTS !== 'undefined' && wantView && LAYOUTS[wantView]) {
      const aw = activeWs();
      const tcat = aw ? (aw.categories.find(c => c.id === route.catId) || aw.categories.find(c => c.id === aw.activeCatId)) : null;
      const curLayout = tcat ? (tcat.layout || s.settings.viewMode || 'board') : (s.settings.viewMode || 'board');
      if (curLayout !== wantView) {
        if (tcat) tcat.layout = wantView;
        s.settings.viewMode = wantView;
        document.body.dataset.viewMode = wantView;
        changed = true;
      }
    }
    // Board-surface item detail pane (§4.2): `?item=<id>`. A stale id renders
    // nothing (renderItemDetail resolves it and closes gracefully), so a dead
    // deep link never wedges the app.
    const routeItem = (route.query && route.query.item) || null;
    const routeCat = activeW?.categories.find(cat => cat.id === activeW.activeCatId) || null;
    const wantItem = validDetailItemIdForSurface(routeItem, { wsId: activeW?.id, catId: routeCat?.id });
    if (boardDetailItemId !== wantItem) { boardDetailItemId = wantItem; changed = true; }
    return changed;
  }

  function handleLocationChange() {
    const recovery = document.getElementById('state-recovery-overlay');
    const identityEditor = document.getElementById('modal-overlay');
    const identityOpen = !!(identityEditor && !identityEditor.classList.contains('hidden'));
    const restoreStableRoute = () => {
      const stable = build(currentRoute());
      if (stable !== location.hash.replace(/^#/, '')) {
        history.pushState(null, '', '#' + stable);
      }
    };
    const foregroundBlocksNavigation = !!(recovery && !recovery.classList.contains('hidden'))
      || (identityOpen && identityEditor.getAttribute('aria-busy') === 'true')
      || isItemDetailMutationPending();
    if (foregroundBlocksNavigation) {
      // A history event can arrive while recovery or a foreground state receipt owns
      // the foreground. Keep the reviewed route stable without applying or
      // persisting a second graph. pushState preserves the attempted history entry
      // so the user can navigate to it after the foreground transaction settles.
      restoreStableRoute();
      return;
    }
    if (identityOpen) {
      // A non-pending draft does not own browser history. Discard it before the
      // requested route is applied so its frozen source context cannot survive.
      closeIdentityEditor({ restoreFocus: false });
    }
    flushActiveItemDetailEditor();
    // A dirty editor can synchronously start an acknowledged write from blur.
    // Recheck before parsing or applying the browser's requested history entry.
    if (isItemDetailMutationPending()) {
      restoreStableRoute();
      return;
    }
    // Route application mixes ephemeral surface state with the few selections
    // that actually live in the user graph. Browser Back/Forward should only
    // write when one of those durable selections changed; opening or closing a
    // Home detail sheet must remain a read-only recovery action.
    const durableSelection = () => {
      const state = State.get();
      return JSON.stringify({
        activeWsId: state.activeWsId || null,
        viewMode: state.settings?.viewMode || null,
        workspaces: (state.workspaces || []).map(workspace => ({
          id: workspace.id,
          activeCatId: workspace.activeCatId || null,
          layouts: (workspace.categories || []).map(category => [category.id, category.layout || null]),
        })),
      });
    };
    const durableBefore = durableSelection();
    const route = parse(location.hash);
    const changed = apply(route);
    const durableChanged = durableBefore !== durableSelection();
    const canonical = build(currentRoute());
    if (canonical !== location.hash.replace(/^#/, '')) {
      history.replaceState(null, '', '#' + canonical);
    }
    if (changed) {
      if (durableChanged) State.persist();
      renderAll();
    }
  }

  return {
    parse, build, currentRoute,
    // Reflect current State into the URL. Adds a history entry only when the
    // canonical hash actually changes (a real navigation); otherwise no-op, so
    // incidental re-renders (creating a group, editing a note) never spam
    // history. Called at the tail of renderAll().
    sync({ replace = false } = {}) {
      if (!_ready) return;
      const want = build(currentRoute());
      const have = location.hash.replace(/^#/, '');
      if (want !== have) {
        if (replace) history.replaceState(null, '', '#' + want);
        else history.pushState(null, '', '#' + want);
      }
    },
    // Deep-link navigation used by future surfaces; replace avoids a history
    // entry when appropriate.
    navigate(route, { replace = false, persist = true } = {}) {
      if (isItemDetailMutationPending()) return false;
      flushActiveItemDetailEditor();
      if (isItemDetailMutationPending()) return false;
      const hash = '#' + build(route);
      if (replace) history.replaceState(null, '', hash);
      else history.pushState(null, '', hash);
      if (apply(route)) {
        if (persist) State.persist();
        renderAll();
      }
      return true;
    },
    // Called once after migrate/ensureDefault, before the first render.
    init() {
      const parsed = parse(location.hash);
      if (parsed) apply(parsed);
      // A fresh new-tab (no hash) lands on the Home overview; a deep link to a
      // category / group / calendar restores that surface instead.
      else activeHome = true;
      // Normalize the address bar to the canonical hash without a history entry.
      history.replaceState(null, '', '#' + build(currentRoute()));
      window.addEventListener('popstate', handleLocationChange);
      window.addEventListener('hashchange', handleLocationChange);
      window.addEventListener('pagehide', flushItemDetailBeforePageHide);
      _ready = true;
    },
  };
})();

// ════════════════════════════════════════════════════════════════
// INIT / MIGRATE
// ════════════════════════════════════════════════════════════════
async function init() {
  await State.load();

  if (loadedSchema > CURRENT_SCHEMA) {
    // Older build opening newer data — refuse to clobber until the user
    // explicitly acknowledges (or updates the extension).
    applySettings();
    bindSchemaMismatchOverlay();
    showSchemaMismatch(loadedSchema);
    document.body.classList.remove('app-loading');
    document.body.classList.add('app-ready');
    return;
  }

  initAfterLoad();
}

function normalizeLoadedSettings() {
  const settings = State.get().settings;
  let theme = normalizeThemeId(settings.theme || 'folio');
  if (theme !== 'auto' && !THEMES.some(candidate => candidate.id === theme)) theme = 'folio';
  settings.theme = theme;
  settings.language = normalizeLanguage(settings.language || browserLanguage());
  const onboarding = ensureOnboarding(settings);
  if (typeof onboarding.welcomeSeen !== 'boolean') onboarding.welcomeSeen = !!settings.tourCompleted;
  if (typeof onboarding.disabled !== 'boolean') onboarding.disabled = false;
}

function normalizeLoadedState() {
  migrate();
  normalizeExpiredTrash();
  ensureDefault();
  normalizeLoadedSettings();
  // Resolve any deep link into the active workspace/category/layout, then
  // normalize the URL — before the first render so we paint the right surface.
  Router.init();
  // Persist only when migration/default/retention or a real deep-link
  // navigation changed the hydrated graph. A clean boot must not manufacture
  // a revision.
  if (!State.needsPersistence()) return false;
  State.persist();
  return true;
}

function persistReminderIdentityMigration(fromSchema, normalized) {
  if (!(fromSchema < 12 && normalized)) return null;
  // Replace legacy index alarms only after schema 12 is authoritative. If the
  // write fails, the background's schema-11 fallback alarms remain usable.
  return State.persistNow({ recordMutation: false })
    .then(() => chrome.runtime.sendMessage({ type: 'reconcile-reminders' }))
    .then(result => {
      if (result?.ok === false) toast('Saved reminder identities, but some alarms could not be updated. Restart the browser, then review Calendar.', { danger: true, duration: 8000 });
      return result;
    })
    .catch(() => {
      if (!State.isRecoveryRequired()) toast('Saved reminder identities, but alarm scheduling needs a browser restart', { danger: true, duration: 8000 });
      return null;
    });
}

function initAfterLoad() {
  const fromSchema = loadedSchema;
  const normalized = normalizeLoadedState();
  persistReminderIdentityMigration(fromSchema, normalized);

  applySettings();
  buildThemeGrid();
  buildEmojiPicker();
  bindStateRecoveryOverlay();
  if (State.isRecoveryRequired()) {
    showStateRecoveryRequired(new Error('Locus found an invalid saved-state revision. Reload before editing.'));
  }
  bindStatic();

  renderAll();
  startStateStorageSync();
  // Returning users may opt into the calm landing. First run owns one task and
  // never hands off into a second full-screen layer.
  if (ensureOnboarding(State.get().settings).welcomeSeen && activeHome && !currentDetailItemId()) showLandingLayer();

  // Reveal the app once the first frame paints (avoids any layout flash).
  requestAnimationFrame(() => {
    document.body.classList.remove('app-loading');
    document.body.classList.add('app-ready');
  });

  // Defer non-critical init to idle time so first paint isn't blocked.
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 0));
  idle(() => {
    refreshStorageUsage();
    refreshOpenTabs();
    chrome.tabs.onCreated.addListener(refreshOpenTabs);
    chrome.tabs.onRemoved.addListener(refreshOpenTabs);
    chrome.tabs.onUpdated.addListener(debounce(refreshOpenTabs, 250));
    chrome.tabs.onActivated.addListener(refreshOpenTabs);
    try {
      chrome.windows.onCreated.addListener(() => { refreshOpenTabs(); renderHeader(); });
      chrome.windows.onRemoved.addListener(() => { refreshOpenTabs(); renderHeader(); });
      chrome.windows.onFocusChanged.addListener(async (wid) => {
        if (wid === chrome.windows.WINDOW_ID_NONE) return;
        if (State.get().settings.autoSwitchWorkspace) {
          const match = State.get().workspaces.find(ws => ws.windowId === wid);
          if (match && match.id !== State.get().activeWsId) {
            State.get().activeWsId = match.id;
            State.persist();
            renderAll();
          }
        }
        refreshOpenTabs();
      });
    } catch {}

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (State.get().settings.theme === 'auto') applySettings();
    });
  });
}

let _stateStorageSyncStarted = false;
let _authoritativeRefreshPromise = null;

// `inert` can be owned by more than one stacked surface. Keep independent owner
// tokens so closing a detail sheet cannot unlock the app while recovery is still
// fail-closed (and vice versa). A pre-existing unmanaged inert state is restored.
function setElementInertOwner(element, owner, enabled) {
  if (!element || !owner) return;
  const owners = new Set(String(element.dataset.locusInertOwners || '').split(' ').filter(Boolean));
  if (!enabled && !owners.has(owner)) return;
  if (enabled) {
    if (!owners.size && element.inert) element.dataset.locusInertBase = '1';
    owners.add(owner);
  } else {
    owners.delete(owner);
  }
  if (owners.size) element.dataset.locusInertOwners = [...owners].join(' ');
  else delete element.dataset.locusInertOwners;
  element.inert = owners.size > 0 || element.dataset.locusInertBase === '1';
  if (!owners.size) delete element.dataset.locusInertBase;
}

// Body-level surfaces can be mounted lazily. If a fail-closed recovery,
// reminder dialog, or organization decision is already open, the new surface
// must join that interlock immediately instead of becoming an interactive
// escape hatch behind it.
function inheritActiveBodyInterlocks(element) {
  if (!element) return;
  const recovery = document.getElementById('state-recovery-overlay');
  const reminder = document.getElementById('reminder-overlay');
  const workspaceGrid = document.getElementById('ws-grid-overlay');
  const organizationName = document.getElementById('organization-name-overlay');
  const organization = document.getElementById('organization-delete-overlay');
  const identityEditor = document.getElementById('modal-overlay');
  if (element !== recovery) {
    setElementInertOwner(element, 'recovery', !!(recovery && !recovery.classList.contains('hidden')));
  }
  // Recovery is always the top fail-closed layer. A reminder may make every
  // lower surface inert, but it must never make recovery itself unfocusable.
  if (element !== reminder && element !== recovery) {
    setElementInertOwner(element, 'reminder', !!(reminder && !reminder.classList.contains('hidden')));
  }
  const workspaceGridExempt = [
    workspaceGrid,
    recovery,
    organizationName,
    organization,
    document.getElementById('context-menu'),
    document.getElementById('emoji-picker'),
  ];
  if (!workspaceGridExempt.includes(element)) {
    setElementInertOwner(element, 'workspace-grid', !!(workspaceGrid && !workspaceGrid.classList.contains('hidden')));
  }
  if (element !== organizationName && element !== recovery) {
    setElementInertOwner(element, 'organization-name', !!(organizationName && !organizationName.classList.contains('hidden')));
  }
  // Recovery always outranks an organization decision. Never transfer the
  // organization owner to the recovery layer or a failed write would display
  // a recovery dialog that cannot receive focus or input.
  if (element !== organization && element !== recovery) {
    setElementInertOwner(element, 'organization', !!(organization && !organization.classList.contains('hidden')));
  }
  if (element !== identityEditor && element !== recovery && element !== document.getElementById('emoji-picker')) {
    setElementInertOwner(element, 'identity-editor', !!(identityEditor && !identityEditor.classList.contains('hidden')));
  }
}

function setStateRecoveryInterlock(enabled) {
  const overlay = document.getElementById('state-recovery-overlay');
  for (const child of document.body.children) {
    if (child === overlay) continue;
    setElementInertOwner(child, 'recovery', enabled);
  }
}

function refreshRenderedStateFromStorage() {
  const recoveryOverlay = document.getElementById('state-recovery-overlay');
  if (recoveryOverlay && !recoveryOverlay.classList.contains('hidden')) {
    recoveryOverlay.classList.add('hidden');
    delete recoveryOverlay.dataset.reloadExtension;
    setStateRecoveryInterlock(false);
    restoreOpener(recoveryOverlay);
  }
  applySettings();
  renderAll();
  if (State.needsPersistence()) State.persist();
  try { refreshStorageUsage(); } catch {}
}

async function restoreAuthoritativeState(options = {}) {
  if (_authoritativeRefreshPromise) return _authoritativeRefreshPromise;
  _authoritativeRefreshPromise = (async () => {
    await State.recoverAuthoritative(options);
    refreshRenderedStateFromStorage();
    return true;
  })();
  try {
    return await _authoritativeRefreshPromise;
  } finally {
    _authoritativeRefreshPromise = null;
  }
}

function showStateRecoveryRequired(error) {
  const overlay = document.getElementById('state-recovery-overlay');
  if (!overlay) {
    try { toast(error?.message || tr('stateRecovery.detail'), { danger: true, duration: 10000 }); } catch {}
    return;
  }
  const overlayWasHidden = overlay.classList.contains('hidden');
  if (error?.code === 'LOCUS_STATE_RECEIVER_UNAVAILABLE') {
    overlay.dataset.reloadExtension = '1';
  } else if (overlayWasHidden) {
    overlay.dataset.reloadExtension = '0';
  }
  const detail = document.getElementById('state-recovery-detail');
  if (detail) detail.textContent = error?.message || tr('stateRecovery.detail');
  if (overlayWasHidden) rememberOpener(overlay);
  setStateRecoveryInterlock(true);
  overlay.classList.remove('hidden');
  const reload = document.getElementById('state-recovery-reload');
  try { reload?.focus({ preventScroll: true }); } catch { try { reload?.focus(); } catch {} }
  // Reassert after the opening frame in case layout was not focus-ready yet.
  setTimeout(() => {
    try { reload?.focus({ preventScroll: true }); } catch { try { reload?.focus(); } catch {} }
  }, 50);
}

function reloadLocusRuntime() {
  if (typeof chrome === 'undefined' || typeof chrome.runtime?.reload !== 'function') {
    location.reload();
    return;
  }
  // A successful runtime reload destroys this extension-page context. The
  // timer is only a fallback for environments where reload() is exposed but
  // cannot restart the extension (for example, unsupported kiosk behavior).
  const pageFallback = setTimeout(() => location.reload(), 1000);
  try {
    chrome.runtime.reload();
  } catch {
    clearTimeout(pageFallback);
    location.reload();
  }
}

function bindStateRecoveryOverlay() {
  const overlay = document.getElementById('state-recovery-overlay');
  if (!overlay || overlay.dataset.bound === '1') return;
  overlay.dataset.bound = '1';
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      trapTabKey(event, overlay);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ')
      && event.target === document.getElementById('state-recovery-reload')) return;
    event.preventDefault();
    event.stopPropagation();
  });
  document.getElementById('state-recovery-reload').onclick = () => {
    if (overlay.dataset.reloadExtension === '1') reloadLocusRuntime();
    else location.reload();
  };
}

async function recoverAfterOrdinaryWriteFailure(error) {
  // The mutable graph may contain the user's only copy of an ordinary edit.
  // Never replace it automatically after a conflict, quota failure, or unknown
  // outcome; keep it visible behind the explicit reload interlock.
  handleStorageError(error);
  const recoveryNotice = new Error('Locus could not safely confirm this edit. Your current view has not been replaced. Reload the latest saved data before continuing.');
  if (error?.code) recoveryNotice.code = error.code;
  showStateRecoveryRequired(recoveryNotice);
}

function handleObservedStoredState(stored) {
  const disposition = State.observeStoredState(stored);
  if (disposition === 'adopted') {
    refreshRenderedStateFromStorage();
    toast('Updated from another Locus window');
  } else if (disposition === 'recovery') {
    // Never replace a dirty local graph automatically. The only automatic
    // cross-page path is clean adoption above; recovery is an explicit reload.
    showStateRecoveryRequired(new Error('Locus changed in another window while this page was editing. Reload the latest saved data before continuing.'));
  }
}

function startStateStorageSync() {
  if (_stateStorageSyncStarted || !chrome.storage?.onChanged?.addListener) return;
  _stateStorageSyncStarted = true;
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !Object.prototype.hasOwnProperty.call(changes, 'te')) return;
    handleObservedStoredState(changes.te?.newValue);
  });
  // Close the load-to-listener race without manufacturing a write. Equal or
  // older revisions are ignored by the State contract.
  chrome.storage.local.get('te')
    .then(result => { if (result?.te) handleObservedStoredState(result.te); })
    .catch(error => { State.requireRecovery(); showStateRecoveryRequired(error); });
}

function isStableEntityReminderId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 200;
}

function allocateEntityReminderId(used) {
  for (let attempts = 0; attempts < 10000; attempts++) {
    const id = String(uid());
    if (isStableEntityReminderId(id) && !used.has(id)) return id;
  }
  throw new Error('Could not allocate a unique reminder id');
}

function ensureStableEntityReminderIds(entity) {
  if (!Array.isArray(entity?.reminders)) return false;
  const used = new Set();
  let changed = false;
  for (const reminder of entity.reminders) {
    if (!reminder || typeof reminder !== 'object' || Array.isArray(reminder)) continue;
    if (!isStableEntityReminderId(reminder.id) || used.has(reminder.id)) {
      reminder.id = allocateEntityReminderId(used);
      changed = true;
    }
    used.add(reminder.id);
  }
  return changed;
}

function migrate() {
  const s = State.get();
  const from = Number(s.schema) || 0;

  if (from < 3) {
    // Legacy / unstamped data → schema 3. Covers the original release shape
    // (workspaces had .groups, notes had .text) plus all post-v3.0 additive
    // defaults the renderer assumes.
    (s.workspaces || []).forEach(ws => {
      if (!ws.categories) {
        ws.categories = [{ id: uid(), name: 'Quicklinks', groups: ws.groups || [] }];
        delete ws.groups;
      }
      if (!ws.activeCatId && ws.categories.length) ws.activeCatId = ws.categories[0].id;
      ws.categories.forEach(cat => {
        (cat.groups = cat.groups || []).forEach(g => {
          g.items = (g.items || []).map(it => {
            if (it.type === 'note' && it.text != null && it.html == null) { it.html = esc(it.text); delete it.text; }
            return it;
          });
          g.symbol = g.symbol || '📁';
          g.color = g.color || '#6366f1';
        });
      });
      ws.symbol = ws.symbol || '🏠';
    });
    if (!s.archive) s.archive = [];
    if (!s.recentEmoji) s.recentEmoji = [];
    if (!s.columnWidths) s.columnWidths = {};
  }

  if (from < 4) {
    // Schema 4 introduces optional, additive item metadata — chiefly
    // `createdAt` (used by the Timeline layout and reminder sorting). Existing
    // items are intentionally left un-stamped: we have no real creation time
    // for them, so consumers fall back to array order (see collectReminders /
    // the timeline renderer). Purely additive; nothing to rewrite here.
  }

  if (from < 5) {
    // Schema 5 (§4.2 — Link content) adds optional per-item detail fields:
    //   item.notes       rich HTML annotation ("why I saved this")
    //   item.tags        string[] — feeds the tag: search operator
    //   item.customFields[{ label, value }] — arbitrary key/values
    //   item.checklist   [{ text, done }] — a mini sub-todo list on any item
    //   item.cover       { color } | { emoji } — a user-picked tile look
    // Every field is absent by default (absent = today's behavior), so there is
    // nothing to rewrite: bare links stay valid and older exports import
    // unchanged. Purely additive.
  }

  if (from < 6) {
    // Schema 6 (§8 — progressive onboarding). Fold the old single
    // `tourCompleted` flag into a structured record so returning users are
    // never re-onboarded and each just-in-time hint is tracked on its own.
    // Absent = fresh install (welcome shows once).
    s.settings = s.settings || {};
    const ob = (s.settings.onboarding && typeof s.settings.onboarding === 'object') ? s.settings.onboarding : {};
    // Pre-6 data had no onboarding record, so the legacy tourCompleted flag is
    // the authority — a returning user who finished the old tour is not
    // re-onboarded, a fresh install (flag absent) sees the welcome once.
    ob.welcomeSeen = !!s.settings.tourCompleted;
    if (!ob.hintsSeen || typeof ob.hintsSeen !== 'object') ob.hintsSeen = {};
    if (ob.disabled == null) ob.disabled = false;
    s.settings.onboarding = ob;
  }

  if (from < 7) {
    // Schema 7 adds the opt-out for the calm launch layer. Existing profiles
    // receive the new default once; after that the explicit boolean persists.
    s.settings = s.settings || {};
    if (s.settings.showLanding == null) s.settings.showLanding = true;
  }

  if (from < 8) {
    // Schema 8 persists the toolbar popup's hibernate choices. The defaults
    // preserve the pre-schema behavior: current window, pinned tabs awake,
    // and audio-playing tabs awake.
    s.settings = s.settings || {};
    if (!['window', 'all'].includes(s.settings.popupHibernateScope)) s.settings.popupHibernateScope = 'window';
    if (s.settings.popupHibernateKeepPinned == null) s.settings.popupHibernateKeepPinned = true;
    if (s.settings.popupHibernateKeepAudio == null) s.settings.popupHibernateKeepAudio = true;
  }

  if (from < 9) {
    // Schema 9 persists the popup's save-window mode. 'group' preserves the
    // pre-schema behavior (each window save lands as a dated session group).
    s.settings = s.settings || {};
    if (!['links', 'group', 'queue'].includes(s.settings.popupSaveMode)) s.settings.popupSaveMode = 'group';
  }

  if (from < 10) {
    // Schema 10 separates deliberate Archive storage from deletion recovery.
    // Existing archived entries remain archived; Trash starts empty and keeps
    // the same entry envelope plus a `trashedAt` retention timestamp.
    if (!Array.isArray(s.trash)) s.trash = [];
  }

  if (from < 11) {
    // Schema 11 completes the popup hibernate flow with an opt-in, local
    // save-before-suspending safeguard and a live selected-tab scope. Existing
    // profiles retain the previous behavior (no implicit save and current
    // window scope); stale tab ids are reconciled against chrome.tabs on load.
    s.settings = s.settings || {};
    if (!['window', 'selected', 'all'].includes(s.settings.popupHibernateScope)) s.settings.popupHibernateScope = 'window';
    if (s.settings.popupHibernateSaveBefore == null) s.settings.popupHibernateSaveBefore = false;
    if (!Array.isArray(s.settings.popupHibernateSelectedTabIds)) s.settings.popupHibernateSelectedTabIds = [];
  }

  if (from < 12) {
    // Schema 12 gives every group/category reminder a stable identity. Alarm
    // delivery can then resolve the intended reminder after array insertion,
    // removal, or reordering instead of trusting a mutable index. Existing
    // reminder behavior is unchanged; only the missing identity is added.
    for (const ws of (s.workspaces || [])) {
      for (const cat of (ws.categories || [])) {
        ensureStableEntityReminderIds(cat);
        for (const group of (cat.groups || [])) ensureStableEntityReminderIds(group);
      }
    }
    for (const collection of [s.archive || [], s.trash || []]) {
      for (const entry of collection) {
        if (entry?.kind === 'group') ensureStableEntityReminderIds(entry.data);
      }
    }
  }

  s.schema = CURRENT_SCHEMA;
}

// ════════════════════════════════════════════════════════════════
// STORAGE QUOTA + ERROR HANDLING
// ════════════════════════════════════════════════════════════════
const STORAGE_QUOTA = (chrome.storage?.local?.QUOTA_BYTES) || 10485760;
const STORAGE_WARN_PCT = 0.80;
const STORAGE_FULL_PCT = 0.95;
let _storageWarned = false;
let _storageFullShown = false;
const _formatBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

async function storageUsage() {
  try {
    const used = await chrome.storage.local.getBytesInUse(null);
    const quota = STORAGE_QUOTA;
    return { used, quota, pct: quota ? used / quota : 0 };
  } catch {
    return null;
  }
}

async function refreshStorageUsage() {
  const u = await storageUsage();
  if (!u) return;
  const pctNum = Math.round(u.pct * 100);
  const warn = u.pct >= STORAGE_WARN_PCT && u.pct < STORAGE_FULL_PCT;
  const full = u.pct >= STORAGE_FULL_PCT;

  // Both the Settings→Data pane bar and the compact sidebar widget share this
  // updater; each is optional so the loop skips whichever isn't in the DOM.
  const targets = [
    { fill: 'storage-bar-fill', text: 'storage-bar-text',
      label: `Storage · ${_formatBytes(u.used)} of ${_formatBytes(u.quota)} (${pctNum}%)` },
    { fill: 'side-storage-fill', text: 'side-storage-text',
      label: `${_formatBytes(u.used)} of ${_formatBytes(u.quota)}` },
  ];
  for (const tg of targets) {
    const bar = document.getElementById(tg.fill);
    const txt = document.getElementById(tg.text);
    if (bar) {
      bar.style.width = Math.min(100, pctNum) + '%';
      bar.classList.toggle('warn', warn);
      bar.classList.toggle('full', full);
    }
    if (txt) txt.textContent = tg.label;
  }

  if (u.pct < STORAGE_WARN_PCT) {
    _storageWarned = false;
  } else if (u.pct >= STORAGE_WARN_PCT && u.pct < STORAGE_FULL_PCT && !_storageWarned) {
    _storageWarned = true;
    try { toast(`Storage is ${pctNum}% full — consider exporting and pruning the archive.`, { duration: 5000 }); } catch {}
  }
}

function handleStorageError(err) {
  const msg = String(err?.message || err || '');
  const quotaHit = /quota|QUOTA/i.test(msg);
  if (err?.code === 'LOCUS_STATE_CONFLICT' || err?.code === 'LOCUS_STATE_RECEIVER_UNAVAILABLE') {
    try { toast(msg, { danger: true, duration: 7000 }); } catch {}
  } else if (quotaHit) {
    showStorageFull(msg);
  } else {
    try { toast('Storage error: ' + msg, { danger: true, duration: 5000 }); } catch {}
  }
}

function showStorageFull(msg) {
  if (_storageFullShown) return;
  _storageFullShown = true;
  const overlay = document.getElementById('quota-overlay');
  if (!overlay) {
    try { toast('Storage full: ' + msg, { danger: true, duration: 6000 }); } catch {}
    return;
  }
  const detail = document.getElementById('quota-detail');
  if (detail) {
    storageUsage().then(u => {
      detail.textContent = u
        ? `Using ${_formatBytes(u.used)} of ${_formatBytes(u.quota)} (${Math.round(u.pct * 100)}%).`
        : 'Storage limit reached.';
    });
  }
  rememberOpener(overlay);
  overlay.classList.remove('hidden');
  setTimeout(() => focusFirstIn(overlay), 50);
}

function closeStorageFull() {
  const overlay = document.getElementById('quota-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  restoreOpener(overlay);
  _storageFullShown = false;
}

function bindQuotaOverlay() {
  const overlay = document.getElementById('quota-overlay');
  if (!overlay) return;
  overlay.addEventListener('keydown', e => trapTabKey(e, overlay));
  overlay.addEventListener('click', e => { if (e.target === overlay) closeStorageFull(); });
  const x = document.getElementById('quota-x');
  if (x) x.onclick = closeStorageFull;
  const dismiss = document.getElementById('quota-dismiss');
  if (dismiss) dismiss.onclick = closeStorageFull;
  const exp = document.getElementById('quota-export');
  if (exp) exp.onclick = () => { exportJSON(); };
  const arch = document.getElementById('quota-archive');
  if (arch) arch.onclick = () => {
    closeStorageFull();
    openLibrarySurface('archive');
  };
}

// ════════════════════════════════════════════════════════════════
// SCHEMA-MISMATCH OVERLAY (older build opening newer data)
// ════════════════════════════════════════════════════════════════
function showSchemaMismatch(found) {
  const overlay = document.getElementById('schema-overlay');
  if (!overlay) {
    alert(`This data was created by a newer version (schema ${found}). Update the extension before opening.`);
    return;
  }
  const det = document.getElementById('schema-detail');
  if (det) det.textContent = `Found schema ${found}; this build understands up to ${CURRENT_SCHEMA}.`;
  overlay.classList.remove('hidden');
  setTimeout(() => focusFirstIn(overlay), 50);
}

function bindSchemaMismatchOverlay() {
  const overlay = document.getElementById('schema-overlay');
  if (!overlay) return;
  overlay.addEventListener('keydown', e => trapTabKey(e, overlay));
  const exp = document.getElementById('schema-export');
  if (exp) exp.onclick = () => { exportJSON(); };
  const cont = document.getElementById('schema-continue');
  const ack = document.getElementById('schema-ack');
  if (cont && ack) {
    cont.disabled = true;
    ack.addEventListener('change', () => { cont.disabled = !ack.checked; });
    cont.onclick = () => {
      overlay.classList.add('hidden');
      initAfterLoad();
    };
  }
}

// ════════════════════════════════════════════════════════════════
// KEYBOARD: CHEATSHEET + BOARD ARROW NAV
// ════════════════════════════════════════════════════════════════
function openCheatsheet() {
  const overlay = document.getElementById('cheatsheet-overlay');
  if (!overlay) return;
  rememberOpener(overlay);
  overlay.classList.remove('hidden');
  setTimeout(() => focusFirstIn(overlay), 50);
}

function closeCheatsheet() {
  const overlay = document.getElementById('cheatsheet-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  restoreOpener(overlay);
}

function bindCheatsheetOverlay() {
  const overlay = document.getElementById('cheatsheet-overlay');
  if (!overlay) return;
  overlay.addEventListener('keydown', e => trapTabKey(e, overlay));
  overlay.addEventListener('click', e => { if (e.target === overlay) closeCheatsheet(); });
  const x = document.getElementById('cheatsheet-x');
  if (x) x.onclick = closeCheatsheet;
  const close = document.getElementById('cheatsheet-close');
  if (close) close.onclick = closeCheatsheet;
}

function focusItem(id) {
  if (!id) return;
  const el = document.querySelector(`.item[data-id="${CSS.escape(id)}"]`);
  if (!el) return;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  el.focus();
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function bindBoardArrowNav() {
  const board = document.getElementById('board');
  if (!board) return;
  board.addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const item = e.target.closest && e.target.closest('.item');
    if (!item || !board.contains(item)) return;
    // Ignore arrows when focus is inside an editable child (e.g. note editor).
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) {
      if (ae !== item) return;
    }
    const siblings = Array.from(item.parentElement?.querySelectorAll(':scope > .item') || []);
    const idx = siblings.indexOf(item);
    if (idx < 0) return;
    e.preventDefault();
    const nextIdx = e.key === 'ArrowDown'
      ? (idx + 1) % siblings.length
      : (idx - 1 + siblings.length) % siblings.length;
    const target = siblings[nextIdx];
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '0');
    target.focus();
  });
  board.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const item = e.target.closest && e.target.closest('.item');
    if (!item || e.target !== item) return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
    if (item.classList.contains('tab')) {
      const open = item.querySelector('[data-act="open"]');
      if (open) { e.preventDefault(); open.click(); }
    } else if (item.classList.contains('todo')) {
      const chk = item.querySelector('input[type="checkbox"]');
      if (chk) { e.preventDefault(); chk.click(); }
    } else if (item.classList.contains('stack')) {
      const hd = item.querySelector('.stack-hd') || item;
      e.preventDefault(); hd.click();
    }
  });
  // 'm' on a focused item opens the move-target picker. Falls back to the
  // current multi-selection if one is active.
  board.addEventListener('keydown', e => {
    if (e.key !== 'm' && e.key !== 'M') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const item = e.target.closest && e.target.closest('.item');
    if (!item || e.target !== item) return;
    e.preventDefault();
    let infos;
    if (selectedItemIds.size) {
      infos = getSelectedItemsInfo();
    } else {
      const info = findItem(item.dataset.id);
      if (!info) return;
      infos = [info];
    }
    if (infos.length) openMoveTargetPicker(infos);
  });
}

function ensureDefault() {
  const s = State.get();
  if (!s.settings) s.settings = {};
  if (!Array.isArray(s.archive)) s.archive = [];
  if (!Array.isArray(s.trash)) s.trash = [];
  s.settings.language = normalizeLanguage(s.settings.language || browserLanguage());
  if (!s.workspaces.length) {
    s.settings.railCollapsed = true;
    s.settings.showLanding = false;
    const cat = { id: uid(), name:'Pinned', groups:[{
      id: uid(), name:'Inbox', symbol:'📥', color:'#6366f1', collapsed:false, items:[]
    }] };
    const cat2 = { id: uid(), name:'Later', groups:[] };
    s.workspaces = [{ id: uid(), name:'My Workspace', symbol:'🏠', categories:[cat, cat2], activeCatId: cat.id }];
    s.activeWsId = s.workspaces[0].id;
  }
  if (!s.activeWsId || !s.workspaces.find(w => w.id === s.activeWsId)) s.activeWsId = s.workspaces[0].id;
}

// ════════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════════
const THEMES = [
  { id:'folio',             label:'Locus',             colors:['#f7f8fc','#5566f2','#8b5cf6'] },
  { id:'folio-dark',        label:'Locus Dark',        colors:['#0c0e1a','#8b9bff','#b78cff'] },
  { id:'tabento',          label:'Rice Paper',       colors:['#f3ead7','#c2761a','#d2542f'] },
  { id:'tabento-dark',     label:'Lacquer',          colors:['#17120d','#f5b841','#ec6f4c'] },
  { id:'aurora',           label:'Aurora',           colors:['#0a0c14','#5eead4','#a78bfa'] },
  { id:'dark',             label:'Dark',             colors:['#0b0b10','#6366f1','#9b9bb4'] },
  { id:'light',            label:'Light',            colors:['#f4f4f7','#4f46e5','#52525e'] },
  { id:'dracula',          label:'Dracula',          colors:['#282a36','#bd93f9','#50fa7b'] },
  { id:'nord',             label:'Nord',             colors:['#2e3440','#88c0d0','#a3be8c'] },
  { id:'rose-pine',        label:'Rosé Pine',        colors:['#191724','#eb6f92','#9ccfd8'] },
  { id:'tokyo-night',      label:'Tokyo Night',      colors:['#1a1b26','#7aa2f7','#bb9af7'] },
  { id:'solarized-dark',   label:'Solar. Dark',      colors:['#002b36','#268bd2','#2aa198'] },
  { id:'solarized-light',  label:'Solar. Light',     colors:['#fdf6e3','#268bd2','#859900'] },
  { id:'gruvbox',          label:'Gruvbox',          colors:['#282828','#fabd2f','#b8bb26'] },
  { id:'catppuccin',       label:'Catppuccin',       colors:['#1e1e2e','#cba6f7','#f5c2e7'] },
  { id:'sepia',            label:'Sepia',            colors:['#f4ecd8','#8b4513','#5c7a2a'] },
  { id:'mono',             label:'Mono',             colors:['#0a0a0a','#ffffff','#a0a0a0'] },
];

const THEME_ALIASES = {
  stow: 'folio',
  'stow-dark': 'folio-dark'
};
const normalizeThemeId = theme => THEME_ALIASES[theme] || theme;

// Classify a theme as light- or dark-inclined from its base surface color's
// luminance, so the whole visual system (logo variant, banner art, home-card
// icon set, overlay scrims, contrast) can respond to *any* theme generically
// instead of via a hand-maintained per-theme list. Kept in sync with the DARK
// map in newtab.html's pre-init script.
function isDarkTheme(id) {
  const t = THEMES.find(x => x.id === normalizeThemeId(id));
  const hex = ((t && t.colors && t.colors[0]) || '#ffffff').replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5; // Rec.601 luma
}
// The concrete light/dark mode of the active theme ('auto' resolves to the OS
// preference). Read by renderers that pick a themed asset (banner, card icons).
function activeThemeMode() {
  let theme = normalizeThemeId(State.get().settings.theme || 'folio');
  if (theme === 'auto') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'folio-dark' : 'folio';
  return isDarkTheme(theme) ? 'dark' : 'light';
}

function buildThemeGrid() {
  const grid = document.getElementById('theme-grid');
  if (!grid) return;
  grid.innerHTML = '';
  THEMES.forEach(t => {
    const card = document.createElement('div');
    card.className = 'theme-card';
    card.dataset.theme = t.id;
    // A small board-like preview tile (base surface, an accent header bar, two
    // tinted content cells) reads as a real theme preview instead of the old
    // loud vertical stripes.
    card.innerHTML = `
      <div class="th-preview" style="--tp-bg:${t.colors[0]};--tp-a1:${t.colors[1]};--tp-a2:${t.colors[2]}">
        <span class="th-bar"></span>
        <span class="th-cells">
          <span class="th-cell c1"></span>
          <span class="th-cell c2"></span>
        </span>
      </div>
      <div class="th-name">${t.label}</div>`;
    card.onclick = () => {
      State.get().settings.theme = t.id;
      applySettings();
      State.persist();
    };
    grid.appendChild(card);
  });
}

function renderCaptureSettings() {
  const select = document.getElementById('capture-destination');
  if (!select) return;
  const state = State.get();
  const settings = state.settings || {};
  const selected = settings.captureDefaultCategoryId || 'active';
  select.textContent = '';

  const activeOption = document.createElement('option');
  activeOption.value = 'active';
  activeOption.textContent = 'Inbox in the active space';
  select.appendChild(activeOption);

  for (const ws of (state.workspaces || [])) {
    for (const cat of (ws.categories || [])) {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = `${ws.name} / ${cat.name} / Inbox`;
      select.appendChild(option);
    }
  }
  select.value = [...select.options].some(o => o.value === selected) ? selected : 'active';

  const selectedLabel = select.options[select.selectedIndex]?.textContent || activeOption.textContent;
  const previewTitle = document.getElementById('capture-preview-title');
  const previewIcon = document.getElementById('capture-preview-icon');
  const previewDestination = document.getElementById('capture-preview-destination');
  if (previewTitle) previewTitle.textContent = settings.captureIncludeTitle === false ? 'example.com' : 'Page title';
  if (previewIcon) {
    previewIcon.textContent = settings.captureIncludeFavicon === false ? 'L' : 'e';
    previewIcon.classList.toggle('muted', settings.captureIncludeFavicon === false);
  }
  if (previewDestination) {
    const usingLast = settings.captureRememberLast !== false && settings.captureLastTarget?.groupId;
    previewDestination.textContent = usingLast ? 'Last manually chosen destination' : selectedLabel;
  }
}

// ════════════════════════════════════════════════════════════════
// SETTINGS PAGE (full-page surface: sidebar sections + panes)
// ════════════════════════════════════════════════════════════════
const SETTINGS_SECTIONS = [
  { id: 'general',    title: 'settings.general',    sub: 'settings.generalSub' },
  { id: 'appearance', title: 'settings.appearance', sub: 'settings.appearanceSub' },
  { id: 'capture',    title: 'settings.capture',    sub: 'settings.captureSub' },
  { id: 'shortcuts',  title: 'settings.shortcuts',  sub: 'settings.shortcutsSub' },
  { id: 'privacy',    title: 'settings.privacy',    sub: 'settings.privacySub' },
  { id: 'storage',    title: 'settings.storage',    sub: 'settings.storageSub' },
  { id: 'data',       title: 'settings.data',       sub: 'settings.dataSub' },
  { id: 'about',      title: 'settings.about',      sub: 'settings.aboutSub' },
];

// Activate one settings section: sidebar highlight, pane visibility, header
// copy, and the pane's own (lazy) renderer. `tab` accepts the legacy drawer
// names so old deep-links (menu "Theme" → appearance, palette entries) keep
// working after the drawer → page migration.
function setSettingsSection(tab) {
  const legacy = { behavior: 'general', archive: 'storage' };
  const id = legacy[tab] || tab;
  const section = SETTINGS_SECTIONS.find(s => s.id === id) || SETTINGS_SECTIONS[0];

  document.querySelectorAll('#drawer-tabs .dt').forEach(b => {
    const on = b.dataset.tab === section.id;
    b.classList.toggle('active', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  SETTINGS_SECTIONS.forEach(s => {
    const pane = document.getElementById('dp-' + s.id);
    if (pane) pane.classList.toggle('hidden', s.id !== section.id);
  });

  const title = document.getElementById('sp-title');
  const sub = document.getElementById('sp-sub');
  if (title) { title.dataset.i18n = section.title; title.textContent = tr(section.title); }
  if (sub) { sub.dataset.i18n = section.sub; sub.textContent = tr(section.sub); }

  if (section.id === 'general') {
    const name = document.getElementById('profile-name-input');
    if (name) name.value = (State.get().settings.profile && State.get().settings.profile.name) || '';
  }
  if (section.id === 'capture') renderCaptureSettings();
  if (section.id === 'shortcuts') renderShortcutsSettings();
  if (section.id === 'storage') renderStorageSettings();
  if (section.id === 'about') renderAboutSettings();

  // Content scrolls back to the top and (when motion is allowed) the pane
  // slides in — the movement tells you the page changed, nothing more.
  const main = document.getElementById('sp-main');
  if (main) main.scrollTop = 0;
  const pane = document.getElementById('dp-' + section.id);
  if (pane && !prefersReducedMotion() && State.get().settings.animate) {
    pane.classList.remove('sp-enter');
    void pane.offsetWidth;
    pane.classList.add('sp-enter');
  }
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// The in-app shortcut list mirrors the cheatsheet overlay (kept in one place
// here so the settings pane can filter it).
const APP_SHORTCUTS = [
  { keys: ['Ctrl/⌘', 'K'], label: 'Open the command palette' },
  { keys: ['/'], label: 'Open search' },
  { keys: ['Ctrl/⌘', 'Z'], label: 'Undo' },
  { keys: ['Ctrl/⌘', '⇧', 'Z'], label: 'Redo' },
  { keys: ['S'], label: 'Focus sidebar tab filter' },
  { keys: ['C'], label: 'Open the calendar' },
  { keys: ['?'], label: 'Show the shortcut cheatsheet' },
  { keys: ['Esc'], label: 'Close any open overlay or menu' },
  { keys: ['Ctrl/⌘', 'Click'], label: 'Multi-select a tab' },
  { keys: ['⇧', 'Click'], label: 'Range-select tabs' },
  { keys: ['/todo', '/done', '/red'], label: 'Slash commands in notes' },
];

function shortcutRow(keys, label) {
  const row = document.createElement('div');
  row.className = 'sp-shortcut-row';
  row.setAttribute('role', 'listitem');
  const kbds = keys.map(k => `<kbd>${esc(k)}</kbd>`).join('');
  row.innerHTML = `<span class="sp-shortcut-lbl">${esc(label)}</span><span class="sp-shortcut-keys">${kbds}</span>`;
  return row;
}

async function renderShortcutsSettings() {
  const globalList = document.getElementById('shortcuts-global-list');
  if (globalList) {
    globalList.textContent = '';
    // Live values from the browser when available; manifest defaults otherwise
    // (e.g. when the page is previewed outside the extension context).
    let commands = null;
    try { if (chrome.commands?.getAll) commands = await chrome.commands.getAll(); } catch {}
    const fallback = [
      { description: 'Open Locus popup', shortcut: 'Ctrl+Shift+E' },
      { description: 'Save current tab to Inbox', shortcut: 'Ctrl+Shift+S' },
    ];
    const rows = (commands && commands.length ? commands : fallback)
      .map(c => ({
        label: c.description || (c.name === '_execute_action' ? 'Open Locus popup' : c.name),
        keys: c.shortcut ? c.shortcut.split('+') : ['Not set'],
      }));
    rows.forEach(r => globalList.appendChild(shortcutRow(r.keys, r.label)));
  }
  filterAppShortcuts();
}

function filterAppShortcuts() {
  const appList = document.getElementById('shortcuts-app-list');
  const empty = document.getElementById('shortcuts-empty');
  if (!appList) return;
  const q = (document.getElementById('shortcuts-filter')?.value || '').trim().toLowerCase();
  appList.textContent = '';
  const visible = APP_SHORTCUTS.filter(s =>
    !q || s.label.toLowerCase().includes(q) || s.keys.join(' ').toLowerCase().includes(q));
  visible.forEach(s => appList.appendChild(shortcutRow(s.keys, s.label)));
  if (empty) empty.classList.toggle('hidden', visible.length > 0);
}

// Real usage numbers: total from chrome.storage, per-kind estimates from the
// serialized size of each item. Estimates, but honest ones — derived from the
// user's actual data, never invented.
function renderStorageSettings() {
  refreshStorageUsage();
  const s = State.get();

  const archiveMeta = document.getElementById('storage-archive-meta');
  if (archiveMeta) {
    const n = (s.archive || []).length;
    const bytes = jsonSize(s.archive || []);
    archiveMeta.textContent = n
      ? `${n} ${n === 1 ? 'entry' : 'entries'} · ~${_formatBytes(bytes)}`
      : 'Nothing archived yet';
  }

  const host = document.getElementById('storage-breakdown');
  if (!host) return;
  host.textContent = '';

  const buckets = {
    tab:   { label: 'Links',          count: 0, bytes: 0, color: '#5566f2' },
    note:  { label: 'Notes',          count: 0, bytes: 0, color: '#8b5cf6' },
    todo:  { label: 'Todos',          count: 0, bytes: 0, color: '#06b6d4' },
    stack: { label: 'Stacks',         count: 0, bytes: 0, color: '#10b981' },
    other: { label: 'Trackers & settings', count: 0, bytes: 0, color: '#f59e0b' },
  };
  const walk = items => (items || []).forEach(it => {
    const b = buckets[it.type] || buckets.other;
    b.count++;
    b.bytes += jsonSize(it.type === 'stack' ? { ...it, items: [] } : it);
    if (it.type === 'stack') walk(it.items);
  });
  (s.workspaces || []).forEach(ws => (ws.categories || []).forEach(cat => (cat.groups || []).forEach(g => walk(g.items))));

  buckets.archive = { label: 'Archive', count: (s.archive || []).length, bytes: jsonSize(s.archive || []), color: '#f97316' };
  buckets.trash = { label: tr('nav.trash'), count: (s.trash || []).length, bytes: jsonSize(s.trash || []), color: '#ef4444' };
  const counted = Object.values(buckets).reduce((n, b) => n + b.bytes, 0);
  buckets.other.bytes += Math.max(0, jsonSize(s) - counted);

  const total = Object.values(buckets).reduce((n, b) => n + b.bytes, 0) || 1;
  const rows = Object.values(buckets).filter(b => b.count > 0 || b.bytes > 512);
  if (!rows.length) {
    const em = document.createElement('div');
    em.className = 'sp-empty';
    em.textContent = 'Nothing saved yet — your library is empty.';
    host.appendChild(em);
    return;
  }
  rows.sort((a, b) => b.bytes - a.bytes);
  rows.forEach(b => {
    const pct = Math.round((b.bytes / total) * 100);
    const row = document.createElement('div');
    row.className = 'sp-breakdown-row';
    row.setAttribute('role', 'listitem');
    row.innerHTML = `
      <span class="sp-breakdown-dot" style="--dot:${b.color}"></span>
      <span class="sp-breakdown-lbl">${esc(b.label)}</span>
      <span class="sp-breakdown-meta">${b.count ? b.count + ' · ' : ''}~${_formatBytes(b.bytes)} (${pct}%)</span>
      <span class="sp-breakdown-track"><span class="sp-breakdown-fill" style="width:${Math.max(2, pct)}%;--dot:${b.color}"></span></span>`;
    host.appendChild(row);
  });
}

function jsonSize(value) {
  try { return JSON.stringify(value).length; } catch { return 0; }
}

function renderAboutSettings() {
  const el = document.getElementById('sp-about-version');
  if (!el) return;
  let version = '3.1.0';
  try { version = chrome.runtime.getManifest?.().version || version; } catch {}
  el.textContent = `Version ${version}`;
}

function applySettings() {
  const s = State.get().settings;
  let theme = normalizeThemeId(s.theme || 'folio');
  if (theme !== s.theme && s.theme !== 'auto') s.theme = theme;
  if (theme !== 'auto' && !THEMES.some(t => t.id === theme)) {
    theme = 'folio';
    s.theme = theme;
  }
  if (theme === 'auto') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'folio-dark' : 'folio';
  const language = normalizeLanguage(s.language || browserLanguage());
  s.language = language;
  document.documentElement.lang = language;
  document.body.dataset.theme = theme;
  document.body.dataset.themeMode = isDarkTheme(theme) ? 'dark' : 'light';
  document.body.dataset.size = s.size;
  document.body.dataset.font = s.font;
  document.body.dataset.width = s.width || 'normal';
  document.body.dataset.showUrls = s.showUrls ? 'on' : 'off';
  document.body.dataset.anim = s.animate ? 'on' : 'off';
  document.body.classList.toggle('blur-privacy', !!s.blurPrivacy);

  // Mirror for the inline pre-init script in newtab.html — read on next launch
  // before paint to eliminate theme flash.
  try {
    localStorage.setItem('te_settings_mirror', JSON.stringify({
      theme: s.theme, size: s.size, font: s.font,
      width: s.width || 'normal', anim: s.animate ? 'on' : 'off',
      language
    }));
  } catch {}

  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('collapsed', !!s.sidebarCollapsed);
  const rail = document.getElementById('tabrail');
  if (rail) rail.classList.toggle('collapsed', !!s.railCollapsed);

  document.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('active', c.dataset.theme === s.theme));
  ['seg-size','seg-width','seg-font'].forEach(id => {
    const key = id === 'seg-size' ? 'size' : id === 'seg-width' ? 'width' : 'font';
    document.querySelectorAll(`#${id} button`).forEach(b => b.classList.toggle('active', b.dataset.val === s[key]));
  });
  const togs = [['tog-hibernate','hibernate'],['tog-urls','showUrls'],['tog-anim','animate'],['tog-blur','blurPrivacy'],['tog-autoswitch','autoSwitchWorkspace'],['tog-landing','showLanding']];
  togs.forEach(([id, key]) => { const el = document.getElementById(id); if (el) el.checked = !!s[key]; });
  const captureTogs = [
    ['tog-capture-ask','captureAskEveryTime', true],
    ['tog-capture-remember','captureRememberLast', true],
    ['tog-capture-close','closeTabOnSave', true],
    ['tog-capture-dedupe','captureDeduplicate', true],
    ['tog-capture-title','captureIncludeTitle', true],
    ['tog-capture-favicon','captureIncludeFavicon', true]
  ];
  captureTogs.forEach(([id, key, defaultValue]) => {
    const el = document.getElementById(id);
    if (el) el.checked = s[key] == null ? defaultValue : !!s[key];
  });
  renderCaptureSettings();
  applyLocale();
  const landing = document.getElementById('landing-layer');
  if (landing && !landing.classList.contains('hidden')) renderLandingLayer();
}

// ════════════════════════════════════════════════════════════════
// FOCUS MANAGEMENT (overlays + keyboard activation)
// ════════════════════════════════════════════════════════════════
const _overlayOpeners = new WeakMap();
function rememberOpener(el) {
  const opener = document.activeElement;
  if (opener && opener !== document.body) _overlayOpeners.set(el, opener);
}
function restoreOpener(el) {
  const opener = _overlayOpeners.get(el);
  let restored = false;
  if (opener && opener.isConnected !== false && typeof opener.focus === 'function') {
    try {
      opener.focus({ preventScroll: true });
      restored = document.activeElement === opener;
    } catch {
      try { opener.focus(); restored = document.activeElement === opener; } catch {}
    }
  }
  _overlayOpeners.delete(el);
  return restored;
}
const FOCUSABLE_SELECTOR = 'a[href],area[href],input:not([disabled]),button:not([disabled]),select:not([disabled]),textarea:not([disabled]),[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
function visibleFocusableElements(container) {
  if (!container) return [];
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(element => {
    if (element.hidden || element.closest('[aria-hidden="true"]')) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  });
}
function focusFirstIn(el) {
  const focusable = visibleFocusableElements(el)[0];
  if (focusable) { try { focusable.focus(); } catch {} }
}
function trapTabKey(e, container) {
  if (e.key !== 'Tab' || !container || container.classList.contains('hidden')) return;
  const items = visibleFocusableElements(container);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === container || active === first || !container.contains(active))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (active === container || active === last || !container.contains(active))) { e.preventDefault(); first.focus(); }
}

// Ref-counted body-scroll lock. Nested overlays open/close independently
// without stepping on each other.
let _scrollLockCount = 0;
function lockBodyScroll() {
  if (_scrollLockCount++ === 0) document.body.style.overflow = 'hidden';
}
function unlockBodyScroll() {
  if (_scrollLockCount > 0 && --_scrollLockCount === 0) document.body.style.overflow = '';
}
function resetBodyScrollLock() {
  _scrollLockCount = 0;
  document.body.style.overflow = '';
}
function enableKeyboardClick(el) {
  if (!el || el.dataset.kbReady === '1') return;
  if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  el.addEventListener('keydown', e => {
    if (e.target !== el) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
  });
  el.dataset.kbReady = '1';
}

// ════════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════════
let toastTimer;
function toast(msg, opts = {}) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toast-msg');
  const u = document.getElementById('toast-undo');
  m.textContent = msg;
  t.classList.remove('hidden', 'danger');
  if (opts.danger) t.classList.add('danger');
  const undoActionId = opts.undo === true ? State.latestActionId() : opts.undo;
  if (undoActionId != null) {
    u.classList.remove('hidden');
    u.onclick = () => { performUndo(undoActionId); t.classList.add('hidden'); };
  }
  else u.classList.add('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), opts.duration || 3000);
}
async function performUndo(expectedActionId = null) {
  try {
    const label = await State.undo(expectedActionId);
    if (label) {
      renderAll();
      toast(tr('history.undid', { action: label }));
      reconcileRemindersAfterHistoryChange();
    }
  } catch (error) {
    renderAll();
    const key = {
      LOCUS_UNDO_STALE: 'history.undoStale',
      LOCUS_UNDO_PENDING: 'history.undoPending',
      LOCUS_UNDO_INTERRUPTED: 'history.undoInterrupted',
    }[error?.code] || 'history.undoFailed';
    toast(tr(key), { danger: true, duration: 7000 });
  }
}
async function performRedo() {
  try {
    const label = await State.redo();
    if (label) {
      renderAll();
      toast(tr('history.redid'));
      reconcileRemindersAfterHistoryChange();
    }
  } catch (error) {
    renderAll();
    const key = error?.code === 'LOCUS_REDO_INTERRUPTED'
      ? 'history.redoInterrupted'
      : 'history.redoFailed';
    toast(tr(key), { danger: true, duration: 7000 });
  }
}

function reconcileRemindersAfterHistoryChange() {
  Promise.resolve()
    .then(() => chrome.runtime.sendMessage({ type: 'reconcile-reminders' }))
    .then(result => {
      if (result?.ok !== true) throw new Error('Reminder reconciliation failed');
    })
    .catch(() => {
      toast(tr('history.reminderReconcileWarning'), { danger: true, duration: 8000 });
    });
}

// ════════════════════════════════════════════════════════════════
// TABS (hibernated opens via suspended.html)
// ════════════════════════════════════════════════════════════════
// Instead of chrome.tabs.discard() (which races with Edge's built-in
// sleeping-tabs feature and can leave tabs at about:blank), we open
// a lightweight extension page that shows the title/favicon and only
// loads the real URL when the user clicks. This is the pattern used
// by The Great Suspender and Tablerone.

function buildSuspendedUrl({ url, title, fav }) {
  // Use hash/fragment so the real URL isn't sent as a query param over the wire
  const params = new URLSearchParams();
  if (url)   params.set('url', url);
  if (title) params.set('title', title);
  if (fav)   params.set('fav', fav);
  return chrome.runtime.getURL('suspended.html') + '#' + params.toString();
}

/**
 * Open a single tab. Single clicks are NEVER hibernated — the user
 * clicked it because they want to see it now.
 */
async function openTabMaybeHibernated(url, { focus = true } = {}) {
  if (focus) {
    return chrome.tabs.create({ url, active: true });
  }
  return openTabSuspended({ url });
}

/**
 * Open a hibernated tab. Uses the extension's suspended.html page so the
 * tab shows the correct title and local favicon in a lightweight packaged page. Clicking
 * the tab (which activates it) loads the real URL via JavaScript redirect.
 */
async function openTabSuspended({ url, title, fav }) {
  const hibernate = State.get().settings.hibernate;
  if (!hibernate) {
    return chrome.tabs.create({ url, active: false });
  }
  // Look up the title from our saved item if it was not provided.
  if (!title) {
    for (const ws of State.get().workspaces) {
      for (const cat of ws.categories) {
        for (const g of cat.groups) {
          const found = findInItemsByUrl(g.items, url);
          if (found) {
            title = title || found.title;
            break;
          }
        }
      }
    }
  }
  // Extension pages use Chromium's local favicon cache. Never pass a remote
  // favicon URL into the suspended extension page.
  fav = favUrl(url, 64);
  const suspendedUrl = buildSuspendedUrl({ url, title, fav });
  return chrome.tabs.create({ url: suspendedUrl, active: false });
}

function findInItemsByUrl(items, url) {
  for (const it of items) {
    if (it.type === 'tab' && it.url === url) return it;
    if (it.type === 'stack' && it.items) {
      const f = findInItemsByUrl(it.items, url);
      if (f) return f;
    }
  }
  return null;
}

/**
 * Open many tabs at once, all suspended. Staggered slightly so the
 * browser tab strip animates in smoothly.
 */
async function openAllHibernated(urls, items) {
  // Build a lookup from URL to {title, fav}
  const meta = {};
  if (items) items.forEach(it => { if (it.type === 'tab') meta[it.url] = { title: it.title, fav: it.fav }; });
  const hibernate = State.get().settings.hibernate;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      if (i > 0) await new Promise(r => setTimeout(r, 50));
      if (hibernate) {
        const m = meta[url] || {};
        chrome.tabs.create({
          url: buildSuspendedUrl({ url, title: m.title, fav: m.fav }),
          active: false
        }).catch(() => {});
      } else {
        chrome.tabs.create({ url, active: false }).catch(() => {});
      }
    } catch {}
  }
}

// ════════════════════════════════════════════════════════════════
// REMINDERS
// ════════════════════════════════════════════════════════════════
// The reminder picker is shared by items and by group/category reminders (§6).
// reminderCtx captures which one is being edited:
//   { kind:'item',     id:itemId }
//   { kind:'group',    id:groupId, index }   index absent → adding a new one
//   { kind:'category', id:catId,   index }
let reminderCtx = null;
function setReminderInterlock(enabled) {
  const overlay = document.getElementById('reminder-overlay');
  const recovery = document.getElementById('state-recovery-overlay');
  for (const child of document.body.children) {
    if (child === overlay || child === recovery) continue;
    setElementInertOwner(child, 'reminder', enabled);
  }
}
function isItemDetailReminderMutationPending() {
  return !!itemReminderMutationPending;
}
function handleReminderGlobalKey(event) {
  const overlay = document.getElementById('reminder-overlay');
  if (!overlay || overlay.classList.contains('hidden')) return false;
  const inside = overlay.contains(event.target);
  if (isItemDetailReminderMutationPending()) {
    if (inside && event.key === 'Tab') return true;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!inside) document.getElementById('rm-x')?.focus({ preventScroll: true });
    return true;
  }
  // Events inside the modal keep their native input/select behavior, but they
  // never fall through to app-wide Undo, search, Calendar, or palette shortcuts.
  if (inside) return true;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.key === 'Escape') closeReminderPicker();
  else document.getElementById('rm-datetime')?.focus({ preventScroll: true });
  return true;
}
function setReminderMutationStatus(key = '', tone = '') {
  const status = document.getElementById('rm-status');
  if (!status) return;
  status.textContent = key ? tr(key) : '';
  if (tone) status.dataset.tone = tone;
  else delete status.dataset.tone;
}
function showReminderTimeError() {
  const input = document.getElementById('rm-datetime');
  if (input) input.setAttribute('aria-invalid', 'true');
  setReminderMutationStatus('reminder.futureTime', 'error');
  input?.focus({ preventScroll: true });
}
function clearReminderTimeError() {
  document.getElementById('rm-datetime')?.removeAttribute('aria-invalid');
  if (!isItemDetailReminderMutationPending()) setReminderMutationStatus();
}
function setReminderMutationBusy(busy) {
  const overlay = document.getElementById('reminder-overlay');
  if (!overlay || overlay.classList.contains('hidden')) return;
  const busyRegion = overlay.querySelector('.modal-bd');
  overlay.classList.toggle('rm-mutation-pending', busy);
  if (busyRegion) busyRegion.setAttribute('aria-busy', String(busy));
  const controls = overlay.querySelectorAll('button, input, select');
  if (busy) {
    controls.forEach(control => {
      if (control.dataset.rmBusyControl === 'true') return;
      control.dataset.rmBusyControl = 'true';
      control.dataset.rmPreviousAriaDisabled = control.hasAttribute('aria-disabled')
        ? String(control.getAttribute('aria-disabled'))
        : '__missing__';
      control.setAttribute('aria-disabled', 'true');
      if ('readOnly' in control) {
        control.dataset.rmPreviousReadonly = String(!!control.readOnly);
        control.readOnly = true;
      }
    });
    setReminderMutationStatus('reminder.saving', 'pending');
    return;
  }
  overlay.querySelectorAll('[data-rm-busy-control="true"]').forEach(control => {
    if (control.dataset.rmPreviousAriaDisabled === '__missing__') control.removeAttribute('aria-disabled');
    else control.setAttribute('aria-disabled', control.dataset.rmPreviousAriaDisabled);
    if ('readOnly' in control && control.dataset.rmPreviousReadonly != null) {
      control.readOnly = control.dataset.rmPreviousReadonly === 'true';
    }
    delete control.dataset.rmBusyControl;
    delete control.dataset.rmPreviousAriaDisabled;
    delete control.dataset.rmPreviousReadonly;
  });
}
function resetReminderMutationUi() {
  const overlay = document.getElementById('reminder-overlay');
  if (!overlay) return;
  setReminderMutationBusy(false);
  overlay.querySelectorAll('[data-rm-unavailable="true"]').forEach(control => {
    control.disabled = false;
    delete control.dataset.rmUnavailable;
  });
  const busyRegion = overlay.querySelector('.modal-bd');
  if (busyRegion) busyRegion.setAttribute('aria-busy', 'false');
  overlay.classList.remove('rm-mutation-pending', 'rm-mutation-unavailable');
  document.getElementById('rm-datetime')?.removeAttribute('aria-invalid');
  setReminderMutationStatus();
}
function setReminderMutationUnavailable() {
  const overlay = document.getElementById('reminder-overlay');
  if (!overlay || overlay.classList.contains('hidden')) return;
  if (reminderCtx) reminderCtx.unavailable = true;
  overlay.classList.add('rm-mutation-unavailable');
  overlay.querySelectorAll('#rm-label, #rm-datetime, #rm-recur, #rm-clear, #rm-save, .rm-quick button').forEach(control => {
    control.disabled = true;
    control.dataset.rmUnavailable = 'true';
  });
  setReminderMutationStatus('reminder.changed', 'error');
  document.getElementById('rm-x')?.focus({ preventScroll: true });
}
function openReminderPicker(itemId, detailContext = undefined) {
  const fromDetail = detailContext !== undefined;
  const info = fromDetail ? resolveItemDetailMutationTarget(detailContext) : findItem(itemId);
  if (!info) {
    if (fromDetail) {
      clearItemDetailStatusTimer();
      setItemDetailMutationStatus(document.getElementById('item-detail'), 'detail.changed', 'error');
    }
    return false;
  }
  const existing = info?.item?.reminder || null;
  const projectedAt = pendingReminderTime(existing);
  const displayReminder = projectedAt != null && projectedAt !== Number(existing?.at)
    ? Object.assign({}, existing, { at: projectedAt })
    : existing;
  openReminderOverlay({ kind: 'item', id: itemId, detailContext }, displayReminder, {
    title: tr(existing ? 'reminder.editTitle' : 'reminder.setTitle'),
  });
  return true;
}
function openEntityReminderPicker(kind, entId, index) {
  const ent = findEntity(kind, entId);
  const existing = (index != null && Array.isArray(ent?.reminders)) ? ent.reminders[index] : null;
  const projectedAt = pendingReminderTime(existing);
  const displayReminder = projectedAt != null && projectedAt !== Number(existing?.at)
    ? Object.assign({}, existing, { at: projectedAt })
    : existing;
  const name = ent?.name || '';
  openReminderOverlay({ kind, id: entId, index }, displayReminder, {
    title: tr(existing ? 'reminder.editTitle' : 'reminder.setTitle'),
    showLabel: true,
    label: existing?.label || '',
    labelPlaceholder: tr(kind === 'group' ? 'reminder.reviewExample' : 'reminder.routineExample', { name }),
  });
}
// A datetime-local wants a wall-clock string; convert from an epoch through the
// local offset so the field shows the same instant the reminder fires.
function toLocalDatetimeValue(ts) {
  const d = new Date(ts);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function openReminderOverlay(ctx, existing, opts = {}) {
  reminderCtx = ctx;
  const overlay = document.getElementById('reminder-overlay');
  if (!overlay) return;
  resetReminderMutationUi();
  if (overlay.classList.contains('hidden')) rememberOpener(overlay);
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'reminder-dialog-title');
  setReminderInterlock(true);
  const dflt = new Date(); dflt.setHours(dflt.getHours() + 1, 0, 0, 0);
  document.getElementById('rm-datetime').value =
    toLocalDatetimeValue(existing?.at != null ? existing.at : dflt.getTime());

  const titleKey = existing ? 'reminder.editTitle' : 'reminder.setTitle';
  const h = document.querySelector('#reminder-overlay .modal-hd h2');
  if (h) { h.id = 'reminder-dialog-title'; h.dataset.i18n = titleKey; h.textContent = opts.title || tr(titleKey); }
  const closeButton = document.getElementById('rm-x');
  if (closeButton) closeButton.setAttribute('aria-label', tr('detail.closeReminderDialog'));

  const labelField = document.getElementById('rm-label-field');
  const labelInput = document.getElementById('rm-label');
  if (labelField) labelField.classList.toggle('hidden', !opts.showLabel);
  if (labelInput) {
    labelInput.value = opts.label || '';
    labelInput.placeholder = opts.labelPlaceholder || tr('reminder.labelOptional');
    if (opts.labelPlaceholder) delete labelInput.dataset.i18nPlaceholder;
    else labelInput.dataset.i18nPlaceholder = 'reminder.labelOptional';
  }

  const recurSel = document.getElementById('rm-recur');
  if (recurSel) recurSel.value = existing?.recur?.every || '';

  // "Clear/Remove" only makes sense when a reminder already exists.
  const clearBtn = document.getElementById('rm-clear');
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !existing);
    const clearKey = ctx.kind === 'item' ? 'reminder.clear' : 'reminder.remove';
    clearBtn.dataset.i18n = clearKey;
    clearBtn.textContent = tr(clearKey);
  }
  const saveButton = document.getElementById('rm-save');
  const saveKey = existing ? 'reminder.update' : 'reminder.set';
  saveButton.dataset.i18n = saveKey;
  saveButton.textContent = tr(saveKey);
  overlay.classList.remove('hidden');
  setTimeout(() => document.getElementById('rm-datetime')?.focus({ preventScroll: true }), 0);
}
function closeReminderPicker() {
  if (isItemDetailReminderMutationPending()) return false;
  const overlay = document.getElementById('reminder-overlay');
  if (!overlay) return false;
  overlay.classList.add('hidden');
  setReminderInterlock(false);
  reminderCtx = null;
  restoreOpener(overlay);
  return true;
}
function readRecurControl() {
  const every = document.getElementById('rm-recur')?.value || '';
  return every ? { every, interval: 1 } : null;
}
async function setReminder(itemId, ts, opts = {}) {
  const info = findItem(itemId);
  if (!info) return;
  State.snapshot('Set reminder');
  info.item.reminder = { at: ts, notified: false };
  if (opts.recur) info.item.reminder.recur = opts.recur;
  try { await chrome.alarms.create('te-reminder-' + itemId, { when: ts }); } catch {}
  State.persist();
  renderBoard();
  refreshDetailPane();
  toast('Reminder set');
}
async function clearReminder(itemId) {
  const info = findItem(itemId);
  if (!info) return;
  State.snapshot('Clear reminder');
  delete info.item.reminder;
  try { await chrome.alarms.clear('te-reminder-' + itemId); } catch {}
  State.persist();
  renderBoard();
  refreshDetailPane();
  toast('Reminder cleared');
}

// Item reminders opened from the saved-item detail sheet share its exact
// route/owner/item resolver, but keep their pending token until both durability
// and the post-receipt alarm effect have settled. The service worker reads the
// acknowledged state and remains the only authority that reconciles alarm names.
async function commitItemDetailReminderMutation(context, reminder, opts = {}) {
  if (isItemDetailMutationPending()) return false;
  const root = document.getElementById('item-detail');
  const fromPicker = opts.fromPicker === true;
  if (State.isRecoveryRequired?.()) {
    setItemDetailMutationStatus(root, 'detail.saveFailed', 'error');
    if (fromPicker) setReminderMutationStatus('reminder.saveFailed', 'error');
    return false;
  }
  const target = resolveItemDetailMutationTarget(context);
  if (!root?.classList.contains('open') || !target) {
    clearItemDetailStatusTimer();
    setItemDetailMutationStatus(root, 'detail.changed', 'error');
    if (fromPicker) setReminderMutationUnavailable();
    return false;
  }

  let nextReminder = null;
  if (reminder != null) {
    const at = Number(reminder.at);
    if (!Number.isFinite(at) || at <= Date.now()) {
      if (fromPicker) showReminderTimeError();
      return false;
    }
    // Preserve extension/import fields that this editor does not own. The
    // controller changes only schedule, recurrence, and delivery state.
    nextReminder = isItemDetailRecord(target.item.reminder)
      ? cloneItemDetailJson(target.item.reminder)
      : {};
    nextReminder.at = at;
    nextReminder.notified = false;
    delete nextReminder.recur;
    if (['day', 'week', 'month'].includes(reminder.recur?.every)) {
      nextReminder.recur = { every: reminder.recur.every, interval: 1 };
    }
  }

  const existingFingerprint = itemDetailValueFingerprint(target.item.reminder);
  if (existingFingerprint === itemDetailValueFingerprint(nextReminder)) {
    if (fromPicker) closeReminderPicker();
    return true;
  }

  const hadReminder = !!target.item.reminder;
  const historyKey = nextReminder
    ? (hadReminder ? 'reminder.updateHistory' : 'reminder.setHistory')
    : 'reminder.clearHistory';
  const transaction = { context, itemId: context.itemId };
  itemReminderMutationPending = transaction;
  clearItemDetailStatusTimer();
  setItemDetailMutationBusy(root, true);
  if (fromPicker) setReminderMutationBusy(true);

  let actionId;
  try {
    actionId = State.snapshot(tr(historyKey));
    if (nextReminder) target.item.reminder = nextReminder;
    else delete target.item.reminder;
  } catch (error) {
    if (itemReminderMutationPending === transaction) itemReminderMutationPending = null;
    setItemDetailMutationBusy(root, false);
    setItemDetailMutationStatus(root, 'detail.saveFailed', 'error');
    if (fromPicker) {
      setReminderMutationBusy(false);
      setReminderMutationStatus('reminder.saveFailed', 'error');
    }
    State.requireRecovery?.();
    if (typeof showStateRecoveryRequired === 'function') showStateRecoveryRequired(error);
    return false;
  }

  let writeReceipt;
  try {
    writeReceipt = await State.persistNow({ reconcileReminders: true });
  } catch (error) {
    if (itemReminderMutationPending === transaction) itemReminderMutationPending = null;
    setItemDetailMutationBusy(root, false);
    setItemDetailMutationStatus(root, 'detail.saveFailed', 'error');
    if (fromPicker) {
      setReminderMutationBusy(false);
      setReminderMutationStatus('reminder.saveFailed', 'error');
    }
    if (State.isRecoveryRequired?.() && typeof showStateRecoveryRequired === 'function') {
      showStateRecoveryRequired(error);
    }
    return false;
  }

  context.itemFingerprint = itemDetailValueFingerprint(target.item);
  context.locationFingerprint = itemDetailLocationFingerprint(target);
  const alarmsReconciled = writeReceipt?.reminderReconciliation?.ok === true;

  if (itemReminderMutationPending !== transaction) return false;
  itemReminderMutationPending = null;
  setItemDetailMutationBusy(root, false);
  if (fromPicker) {
    setReminderMutationBusy(false);
    closeReminderPicker();
  }

  renderBoard();
  renderItemDetail();
  const liveRoot = document.getElementById('item-detail');
  if (liveRoot?.classList.contains('open') && liveRoot.dataset.itemId === context.itemId) {
    setItemDetailMutationStatus(liveRoot, 'detail.saved', 'success');
    itemDetailStatusTimer = setTimeout(() => {
      if (!isItemDetailMutationPending()
          && liveRoot.classList.contains('open')
          && liveRoot.dataset.itemId === context.itemId) {
        setItemDetailMutationStatus(liveRoot);
      }
      itemDetailStatusTimer = null;
    }, 2400);
    const focusKey = nextReminder ? 'reminder-change' : 'reminder-set';
    setTimeout(() => {
      if (!isItemDetailMutationPending()
          && liveRoot.classList.contains('open')
          && liveRoot.dataset.itemId === context.itemId) {
        focusItemDetailTarget(liveRoot.querySelector(`[data-idp-focus="${focusKey}"]`));
      }
    }, 0);
  }

  if (alarmsReconciled) {
    toast(tr(nextReminder ? 'reminder.setSuccess' : 'reminder.clearSuccess'), { undo: actionId });
  } else {
    toast(tr(nextReminder ? 'reminder.scheduleWarning' : 'reminder.clearScheduleWarning'), {
      danger: true,
      duration: 8000,
      undo: actionId,
    });
  }
  return true;
}

// ── Group / category reminders (§6) ──────────────────────────────
// Groups and categories carry `reminders[]` (each { id, at, notified, label?,
// recur? }). Their persistent ids keep alarm delivery stable when array order changes.
// Legacy index names remain parseable only for schema-11 transition cleanup.
function findEntity(kind, entId) {
  return kind === 'group' ? (findGroup(entId)?.group || null) : (findCategory(entId)?.cat || null);
}
const ENTITY_REMINDER_ALARM_PREFIXES = {
  group: 'te-greminder2-',
  category: 'te-creminder2-',
};
const LEGACY_ENTITY_REMINDER_ALARM_PREFIXES = {
  group: 'te-greminder-',
  category: 'te-creminder-',
};
function legacyEntityReminderAlarmName(kind, entId, index) {
  return `${LEGACY_ENTITY_REMINDER_ALARM_PREFIXES[kind]}${entId}-${index}`;
}
function entityReminderAlarmName(kind, entId, reminder, index) {
  const prefix = ENTITY_REMINDER_ALARM_PREFIXES[kind];
  if (!prefix) return '';
  if (isStableEntityReminderId(reminder?.id)) {
    return `${prefix}${encodeURIComponent(String(entId))}|${encodeURIComponent(reminder.id)}`;
  }
  return legacyEntityReminderAlarmName(kind, entId, index);
}
function parseEntityReminderAlarmName(name) {
  const stableKind = typeof name === 'string' && name.startsWith(ENTITY_REMINDER_ALARM_PREFIXES.group)
    ? 'group'
    : (typeof name === 'string' && name.startsWith(ENTITY_REMINDER_ALARM_PREFIXES.category) ? 'category' : null);
  if (stableKind) {
    const rest = name.slice(ENTITY_REMINDER_ALARM_PREFIXES[stableKind].length);
    const separator = rest.indexOf('|');
    if (separator < 0 || rest.indexOf('|', separator + 1) >= 0) return null;
    try {
      const entId = decodeURIComponent(rest.slice(0, separator));
      const reminderId = decodeURIComponent(rest.slice(separator + 1));
      if (!entId || !isStableEntityReminderId(reminderId)) return null;
      return { kind: stableKind, entId, reminderId, legacyIndex: null };
    } catch {
      return null;
    }
  }
  const kind = typeof name === 'string' && name.startsWith(LEGACY_ENTITY_REMINDER_ALARM_PREFIXES.group)
    ? 'group'
    : (typeof name === 'string' && name.startsWith(LEGACY_ENTITY_REMINDER_ALARM_PREFIXES.category) ? 'category' : null);
  if (!kind) return null;
  const rest = name.slice(LEGACY_ENTITY_REMINDER_ALARM_PREFIXES[kind].length);
  const cut = rest.lastIndexOf('-');
  if (cut <= 0 || !/^\d+$/.test(rest.slice(cut + 1))) return null;
  return { kind, entId: rest.slice(0, cut), reminderId: null, legacyIndex: Number(rest.slice(cut + 1)) };
}
async function reconcileEntityAlarms(kind, entId, reminders) {
  try {
    const all = await chrome.alarms.getAll();
    await Promise.all(all.filter(alarm => {
      const parsed = parseEntityReminderAlarmName(alarm.name);
      return parsed?.kind === kind && parsed.entId === entId;
    }).map(alarm => chrome.alarms.clear(alarm.name)));
  } catch {}
  const list = reminders || [];
  for (let n = 0; n < list.length; n++) {
    const r = list[n];
    if (r && !r.notified && r.at != null && r.at > Date.now()) {
      try { await chrome.alarms.create(entityReminderAlarmName(kind, entId, r, n), { when: r.at }); } catch {}
    }
  }
}
async function setEntityReminder(kind, entId, data, index) {
  const ent = findEntity(kind, entId);
  if (!ent) return;
  State.snapshot(index != null ? 'Edit reminder' : 'Add reminder');
  if (!Array.isArray(ent.reminders)) ent.reminders = [];
  ensureStableEntityReminderIds(ent);
  const existing = index != null ? ent.reminders[index] : null;
  const used = new Set(ent.reminders.filter(reminder => reminder !== existing).map(reminder => reminder?.id).filter(isStableEntityReminderId));
  const entry = {
    id: isStableEntityReminderId(existing?.id) ? existing.id : allocateEntityReminderId(used),
    at: data.at,
    notified: false,
    label: (data.label || '').trim(),
  };
  if (data.recur) entry.recur = data.recur;
  if (existing) ent.reminders[index] = entry;
  else ent.reminders.push(entry);
  await reconcileEntityAlarms(kind, entId, ent.reminders);
  State.persist();
  renderBoard();
  toast('Reminder set');
}
async function setEntityReminderTime(kind, entId, index, ts) {
  const ent = findEntity(kind, entId);
  const r = ent && Array.isArray(ent.reminders) ? ent.reminders[index] : null;
  if (!r) return;
  State.snapshot('Reschedule reminder');
  ensureStableEntityReminderIds(ent);
  r.at = ts; r.notified = false;
  await reconcileEntityAlarms(kind, entId, ent.reminders);
  State.persist();
  renderBoard();
  toast('Reminder rescheduled');
}
async function removeEntityReminder(kind, entId, index) {
  const ent = findEntity(kind, entId);
  if (!ent || !Array.isArray(ent.reminders) || !ent.reminders[index]) return;
  State.snapshot('Remove reminder');
  ensureStableEntityReminderIds(ent);
  ent.reminders.splice(index, 1);
  if (!ent.reminders.length) delete ent.reminders;
  await reconcileEntityAlarms(kind, entId, ent.reminders);
  State.persist();
  renderBoard();
  toast('Reminder removed');
}
function recurLabel(recur) {
  if (!recur || !recur.every) return '';
  const n = Math.max(1, recur.interval || 1);
  if (n === 1) return recur.every === 'day' ? 'daily' : recur.every === 'week' ? 'weekly' : 'monthly';
  return `every ${n} ${recur.every}s`;
}

// Pending reminder surfaces share the service worker's recurrence projection.
// Reconciliation deliberately does not mutate an overdue recurrence merely to
// re-arm it, so the page projects that same first future occurrence for display.
// An unnotified one-shot (or an expired recurrence) keeps its stored timestamp
// and therefore remains recoverable through the Calendar's Past due path.
function nextReminderOccurrenceForDisplay(at, recur, now = Date.now()) {
  const start = Number(at);
  const cutoff = Number(now);
  if (!Number.isFinite(start) || !Number.isFinite(cutoff)) return null;
  if (!['day', 'week', 'month'].includes(recur?.every)) return null;
  const rawInterval = Number(recur.interval);
  const interval = Number.isFinite(rawInterval) ? Math.max(1, Math.trunc(rawInterval)) : 1;
  const base = new Date(start);
  const hour = base.getHours();
  const minute = base.getMinutes();
  const second = base.getSeconds();
  const millisecond = base.getMilliseconds();
  const monthlyDay = base.getDate();
  const cursor = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate(), 12));
  const until = Number(recur.until);
  const hasUntil = recur.until != null && recur.until !== '';
  if (hasUntil && !Number.isFinite(until)) return null;

  while (true) {
    if (recur.every === 'month') {
      cursor.setUTCDate(1);
      cursor.setUTCMonth(cursor.getUTCMonth() + interval);
    } else {
      cursor.setUTCDate(cursor.getUTCDate() + interval * (recur.every === 'week' ? 7 : 1));
    }

    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const day = recur.every === 'month' ? monthlyDay : cursor.getUTCDate();
    const candidate = new Date(year, month, day, hour, minute, second, millisecond);
    const ts = candidate.getTime();
    if (!Number.isFinite(ts)) return null;
    if (hasUntil && ts > until) return null;

    const exactWallTime = candidate.getFullYear() === year
      && candidate.getMonth() === month
      && candidate.getDate() === day
      && candidate.getHours() === hour
      && candidate.getMinutes() === minute
      && candidate.getSeconds() === second
      && candidate.getMilliseconds() === millisecond;
    if (exactWallTime && ts > cutoff) return ts;
  }
}

function pendingReminderTime(reminder, now = Date.now()) {
  if (!reminder || reminder.notified) return null;
  const at = Number(reminder.at);
  if (!Number.isFinite(at)) return null;
  if (at > now) return at;
  const next = nextReminderOccurrenceForDisplay(at, reminder.recur, now);
  return Number.isFinite(next) && next > now ? next : at;
}

function projectPendingReminders(entries, now = Date.now()) {
  const pending = [];
  for (const entry of (Array.isArray(entries) ? entries : [])) {
    const at = pendingReminderTime(entry, now);
    if (at == null) continue;
    pending.push(Object.assign({}, entry, { at, storedAt: entry.at }));
  }
  return pending.sort((a, b) => a.at - b.at);
}

// ════════════════════════════════════════════════════════════════
// REMINDER AGGREGATION (§2.3)
// ════════════════════════════════════════════════════════════════
// The single place that knows how to find every reminder in the tree. Today
// only items carry `reminder`; groups/categories gain `reminders[]` in a later
// phase (§6) and this sweep already reads them so the calendar and the
// `has:reminder`/`reminder:` search operators can rely on one source of truth
// instead of re-walking state at each call site.
//
// Returns a flat, normalized list:
//   { at, notified, source:'item'|'group'|'category', refId, wsId, catId,
//     groupId?, title, color, recur? }
// sorted ascending by `at`. `refId` is the id you act on (the item / group /
// category); `alarmId` is the chrome.alarms key that fires it.
//
// Options:
//   scope  — 'all' (default) or a workspace id to restrict the sweep.
//   filter — optional predicate (entry) => boolean applied to each result.
function collectReminders({ scope = 'all', filter } = {}) {
  const out = [];
  const reminderTitle = it =>
    it.type === 'note'
      ? (String(it.html || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 80) || 'Note')
      : (it.title || it.text || 'Untitled');

  const pushItem = (it, ctx) => {
    if (it.reminder && it.reminder.at != null) {
      out.push({
        at: it.reminder.at,
        notified: !!it.reminder.notified,
        source: 'item',
        refId: it.id,
        alarmId: 'te-reminder-' + it.id,
        wsId: ctx.wsId, catId: ctx.catId, groupId: ctx.groupId,
        title: reminderTitle(it),
        color: it.color || ctx.groupColor || null,
        itemType: it.type,
        recur: it.reminder.recur || null,
      });
    }
    // Reminders set on items nested inside a stack are found by recursion.
    if (it.type === 'stack' && Array.isArray(it.items)) {
      it.items.forEach(sub => pushItem(sub, ctx));
    }
  };

  for (const ws of State.get().workspaces) {
    if (scope !== 'all' && ws.id !== scope) continue;
    for (const cat of ws.categories) {
      // Category-level reminders (§6) — absent today, read defensively.
      (cat.reminders || []).forEach((r, n) => {
        if (r && r.at != null) out.push({
          at: r.at, notified: !!r.notified, source: 'category',
          refId: cat.id, index: n, reminderId: r.id,
          alarmId: entityReminderAlarmName('category', cat.id, r, n),
          wsId: ws.id, catId: cat.id,
          title: r.label || cat.name, color: r.color || null,
          recur: r.recur || null,
        });
      });
      for (const g of cat.groups) {
        // Group-level reminders (§6) — absent today, read defensively.
        (g.reminders || []).forEach((r, n) => {
          if (r && r.at != null) out.push({
            at: r.at, notified: !!r.notified, source: 'group',
            refId: g.id, index: n, reminderId: r.id,
            alarmId: entityReminderAlarmName('group', g.id, r, n),
            wsId: ws.id, catId: cat.id, groupId: g.id,
            title: r.label || g.name, color: r.color || g.color || null,
            recur: r.recur || null,
          });
        });
        const ctx = { wsId: ws.id, catId: cat.id, groupId: g.id, groupColor: g.color };
        g.items.forEach(it => pushItem(it, ctx));
      }
    }
  }

  out.sort((a, b) => a.at - b.at);
  return typeof filter === 'function' ? out.filter(filter) : out;
}

function collectPendingReminders(options = {}, now = Date.now()) {
  return projectPendingReminders(collectReminders(options), now);
}

// ════════════════════════════════════════════════════════════════
// EMOJI PICKER
// ════════════════════════════════════════════════════════════════
let emojiPickerCtx = null;
let _emojiDataPromise = null;
let _emojiPickerBuilt = false;
let _emojiOutsideCleanup = null;
let _emojiActiveCategory = 'smileys';
// emoji-data.js is ~17KB and only needed when the picker opens. Defer to
// keep first-paint fast.
function loadEmojiData() {
  if (typeof EMOJI_DATA !== 'undefined') return Promise.resolve();
  if (_emojiDataPromise) return _emojiDataPromise;
  _emojiDataPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'emoji-data.js';
    s.onload = () => resolve();
    s.onerror = () => { _emojiDataPromise = null; reject(new Error('emoji-data load failed')); };
    document.head.appendChild(s);
  });
  return _emojiDataPromise;
}
function buildEmojiPicker() {
  if (typeof EMOJI_DATA === 'undefined') return; // deferred; will be built on first open
  const tabs = document.getElementById('ep-tabs');
  if (!tabs) return;
  if (_emojiPickerBuilt) {
    paintEmojiPicker();
    return;
  }
  _emojiPickerBuilt = true;
  tabs.innerHTML = '';
  EMOJI_DATA.categories.forEach((cat, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ep-tab' + (cat.id === _emojiActiveCategory ? ' active' : '');
    b.dataset.categoryId = cat.id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(cat.id === _emojiActiveCategory));
    b.tabIndex = cat.id === _emojiActiveCategory ? 0 : -1;
    b.textContent = cat.label.split(' ')[0];
    b.onclick = () => {
      _emojiActiveCategory = cat.id;
      document.querySelectorAll('.ep-tab').forEach(t => {
        const active = t === b;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', String(active));
        t.tabIndex = active ? 0 : -1;
      });
      document.getElementById('ep-search-input').value = '';
      renderEmojiGrid(cat.id);
    };
    tabs.appendChild(b);
  });
  paintEmojiPicker();
  renderEmojiGrid(_emojiActiveCategory);
}
function paintEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  const input = document.getElementById('ep-search-input');
  const tabs = document.getElementById('ep-tabs');
  if (picker) picker.setAttribute('aria-label', tr('emojiPicker.title'));
  if (input) {
    input.placeholder = tr('emojiPicker.search');
    input.setAttribute('aria-label', tr('emojiPicker.search'));
  }
  if (tabs) tabs.setAttribute('aria-label', tr('emojiPicker.categories'));
  document.querySelectorAll('.ep-tab').forEach(tab => {
    const id = tab.dataset.categoryId;
    tab.title = tr(`emojiPicker.category.${id}`);
    tab.setAttribute('aria-label', tr(`emojiPicker.category.${id}`));
  });
}
function renderEmojiGrid(catId, search) {
  const grid = document.getElementById('ep-grid');
  if (!grid || typeof EMOJI_DATA === 'undefined') return;
  grid.innerHTML = '';
  let emojis = [];
  if (search) {
    const q = search.toLowerCase();
    EMOJI_DATA.categories.forEach(c => { if (c.id !== 'recent') c.emojis.forEach(e => { if (e.k.includes(q)) emojis.push(e); }); });
  } else {
    const cat = EMOJI_DATA.categories.find(c => c.id === catId);
    if (cat) emojis = catId === 'recent' ? State.get().recentEmoji.map(e => ({ e, k:'' })) : cat.emojis;
  }
  if (!emojis.length) {
    const empty = document.createElement('div');
    empty.className = 'ep-empty';
    empty.setAttribute('role', 'status');
    empty.textContent = tr('emojiPicker.empty');
    grid.appendChild(empty);
    return;
  }
  emojis.slice(0, 200).forEach(em => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ep-item';
    b.textContent = em.e;
    b.title = em.k || em.e;
    b.setAttribute('aria-label', tr('emojiPicker.choose', { symbol: em.e }));
    b.onclick = () => selectEmoji(em.e);
    grid.appendChild(b);
  });
}
function positionEmojiPicker(anchor) {
  const ep = document.getElementById('emoji-picker');
  if (!ep || !anchor || typeof anchor.getBoundingClientRect !== 'function') return;
  const r = anchor.getBoundingClientRect();
  const width = ep.offsetWidth || Math.min(340, window.innerWidth - 16);
  const height = ep.offsetHeight || Math.min(340, window.innerHeight - 16);
  const maxLeft = Math.max(8, window.innerWidth - width - 8);
  const maxTop = Math.max(8, window.innerHeight - height - 8);
  const left = Math.min(Math.max(8, r.left), maxLeft);
  const preferredTop = r.bottom + 6;
  const top = preferredTop + height <= window.innerHeight - 8
    ? preferredTop
    : Math.min(Math.max(8, r.top - height - 6), maxTop);
  ep.style.left = `${left}px`;
  ep.style.top = `${top}px`;
}
function closeEmojiPicker({ restoreFocus = true } = {}) {
  const ep = document.getElementById('emoji-picker');
  if (!ep || ep.classList.contains('hidden')) return false;
  ep.classList.add('hidden');
  ep.setAttribute('aria-busy', 'false');
  if (_emojiOutsideCleanup) { _emojiOutsideCleanup(); _emojiOutsideCleanup = null; }
  const trigger = emojiPickerCtx?.anchor;
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
  emojiPickerCtx = null;
  if (restoreFocus) restoreOpener(ep);
  else _overlayOpeners.delete(ep);
  return true;
}
function openEmojiPicker(target, anchor) {
  const ep = document.getElementById('emoji-picker');
  const recovery = document.getElementById('state-recovery-overlay');
  if (!ep || !anchor || (recovery && !recovery.classList.contains('hidden'))) return false;
  if (!ep.classList.contains('hidden')) closeEmojiPicker({ restoreFocus: false });
  focusDialogOpener(anchor);
  rememberOpener(ep);
  emojiPickerCtx = { target, anchor };
  anchor.setAttribute('aria-expanded', 'true');
  ep.classList.remove('hidden');
  paintEmojiPicker();
  positionEmojiPicker(anchor);
  document.getElementById('ep-search-input').value = '';
  const grid = document.getElementById('ep-grid');
  const openingCtx = emojiPickerCtx;
  // Show placeholder while emoji-data.js loads (first open only).
  if (typeof EMOJI_DATA === 'undefined') {
    ep.setAttribute('aria-busy', 'true');
    if (grid) {
      grid.textContent = '';
      const loading = document.createElement('div');
      loading.className = 'ep-empty';
      loading.setAttribute('role', 'status');
      loading.textContent = tr('emojiPicker.loading');
      grid.appendChild(loading);
    }
  }
  loadEmojiData()
    .then(() => {
      if (emojiPickerCtx !== openingCtx) return;
      ep.setAttribute('aria-busy', 'false');
      buildEmojiPicker();
      const search = document.getElementById('ep-search-input')?.value.trim() || '';
      renderEmojiGrid(search ? null : _emojiActiveCategory, search);
      positionEmojiPicker(anchor);
    })
    .catch(() => {
      if (emojiPickerCtx !== openingCtx || !grid) return;
      ep.setAttribute('aria-busy', 'false');
      grid.textContent = '';
      const error = document.createElement('div');
      error.className = 'ep-empty';
      error.setAttribute('role', 'alert');
      error.textContent = tr('emojiPicker.error');
      grid.appendChild(error);
    });
  setTimeout(() => {
    if (emojiPickerCtx !== openingCtx) return;
    const close = event => {
      if (!ep.contains(event.target) && !anchor.contains(event.target)) closeEmojiPicker();
    };
    document.addEventListener('pointerdown', close);
    _emojiOutsideCleanup = () => document.removeEventListener('pointerdown', close);
  }, 0);
  setTimeout(() => {
    if (emojiPickerCtx === openingCtx) document.getElementById('ep-search-input')?.focus({ preventScroll: true });
  }, 0);
  return true;
}
function rememberRecentEmoji(e) {
  const recent = State.get().recentEmoji;
  const idx = recent.indexOf(e);
  if (idx > -1) recent.splice(idx, 1);
  recent.unshift(e);
  if (recent.length > 24) recent.length = 24;
  if (typeof EMOJI_DATA !== 'undefined') {
    EMOJI_DATA.categories[0].emojis = recent.map(value => ({ e: value, k: '' }));
  }
}
function selectEmoji(e) {
  if (!emojiPickerCtx) return;
  const { target } = emojiPickerCtx;
  let draftOnly = false;
  let mutated = false;
  if (target.kind === 'identity-editor') {
    if (!modalCtx) return closeEmojiPicker();
    modalCtx.draftSymbol = e;
    modalCtx.symbolChosen = true;
    document.getElementById('emoji-trigger-val').textContent = e;
    clearIdentityEditorError();
    paintIdentityEditor();
    draftOnly = true;
  } else if (target.kind === 'sub-modal') {
    const icon = document.getElementById('sub-icon-val');
    icon.textContent = e;
    icon.dataset.emojiChosen = 'true';
    draftOnly = true;
  } else if (target.kind === 'habit-icon') {
    const icon = document.getElementById('habit-new-icon-val');
    icon.textContent = e;
    icon.dataset.emojiChosen = 'true';
    draftOnly = true;
  } else if (target.kind === 'workspace') {
    const ws = State.get().workspaces.find(w => w.id === target.id);
    if (ws) {
      State.snapshot('Change symbol');
      ws.symbol = e;
      mutated = true;
      closeEmojiPicker({ restoreFocus: false });
      renderAll();
      requestAnimationFrame(() => focusWorkspaceGridFallback(target.id));
    }
  }
  if (!draftOnly && mutated) {
    rememberRecentEmoji(e);
    State.persist();
  }
  if (emojiPickerCtx) closeEmojiPicker();
}

function handleEmojiPickerKeydown(event) {
  const picker = document.getElementById('emoji-picker');
  if (!picker || picker.classList.contains('hidden')) return false;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeEmojiPicker();
    return true;
  }
  const tab = event.target.closest?.('.ep-tab');
  if (tab && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    const tabs = [...picker.querySelectorAll('.ep-tab')];
    const index = Math.max(0, tabs.indexOf(tab));
    let next = index;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
    else next = (index + 1) % tabs.length;
    event.preventDefault();
    event.stopPropagation();
    tabs[next]?.click();
    tabs[next]?.focus({ preventScroll: true });
    return true;
  }
  if (event.key === 'Tab') trapTabKey(event, picker);
  event.stopPropagation();
  return true;
}

function handleEmojiPickerGlobalKey(event) {
  const picker = document.getElementById('emoji-picker');
  if (!picker || picker.classList.contains('hidden') || picker.contains(event.target)) return false;
  const recovery = document.getElementById('state-recovery-overlay');
  if (recovery && !recovery.classList.contains('hidden') && recovery.contains(event.target)) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.key === 'Escape') closeEmojiPicker();
  return true;
}

// ════════════════════════════════════════════════════════════════
// CONTEXT MENU
// ════════════════════════════════════════════════════════════════
// Holds the teardown for the currently-open context menu (outside-click +
// keyboard listeners). Menu-item clicks call stopPropagation(), so the
// document-level "click outside to close" handler never fired to remove itself
// — that leaked a stale closer on every selection, which then swallowed the
// next open (menu flashed open, the stale closer immediately closed it). We now
// track a single cleanup and always run it from hideContextMenu(), so a menu
// re-opens reliably after any selection.
let _cmCleanup = null;
function showContextMenu(x, y, items, opts) {
  const menu = document.getElementById('context-menu');
  // Tear down any previously-open menu's listeners before opening a new one.
  if (_cmCleanup) { _cmCleanup(); _cmCleanup = null; }
  menu.innerHTML = '';
  items.forEach(it => {
    if (it.sep) menu.appendChild(Object.assign(document.createElement('div'), { className: 'cm-sep' }));
    else if (it.label) { const l = document.createElement('div'); l.className = 'cm-label'; l.textContent = it.label; menu.appendChild(l); }
    else {
      const el = document.createElement('div');
      el.className = 'cm-item' + (it.danger ? ' danger' : '');
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'menuitem');
      el.innerHTML = `${it.icon || ''}<span>${esc(it.text)}</span>${it.sub ? `<span class="cm-sub">${esc(it.sub)}</span>` : ''}`;
      el.onclick = ev => { ev.stopPropagation(); hideContextMenu(); it.action && it.action(); };
      menu.appendChild(el);
    }
  });
  menu.classList.remove('hidden');
  const mw = menu.offsetWidth || 200, mh = menu.offsetHeight || 300;
  let mx = x, my = y;
  if (x + mw > window.innerWidth) mx = window.innerWidth - mw - 8;
  if (y + mh > window.innerHeight) my = window.innerHeight - mh - 8;
  menu.style.left = mx + 'px'; menu.style.top = my + 'px';
  const menuOpener = document.activeElement;
  const menuKey = e => {
    if (menu.classList.contains('hidden')) return;
    const entries = [...menu.querySelectorAll('.cm-item')];
    if (!entries.length) return;
    const cur = entries.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Tab', 'Escape'].includes(e.key)) {
      e.stopPropagation();
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); entries[(cur + 1 + entries.length) % entries.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); entries[(cur - 1 + entries.length) % entries.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); entries[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); entries[entries.length - 1].focus(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const next = e.shiftKey
        ? (cur <= 0 ? entries.length - 1 : cur - 1)
        : (cur < 0 || cur === entries.length - 1 ? 0 : cur + 1);
      entries[next].focus();
    }
    else if (e.key === 'Enter' || e.key === ' ') {
      if (cur >= 0) { e.preventDefault(); entries[cur].click(); }
    } else if (e.key === 'Escape') {
      e.preventDefault(); hideContextMenu();
      if (menuOpener && menuOpener.focus) menuOpener.focus();
    }
  };
  menu.addEventListener('keydown', menuKey);
  const close = e => { if (!menu.contains(e.target)) hideContextMenu(); };
  // Register the single teardown for this menu — removed centrally by
  // hideContextMenu() no matter how the menu is dismissed (outside click,
  // Escape, or a menu-item action that stops propagation).
  _cmCleanup = () => {
    document.removeEventListener('click', close);
    document.removeEventListener('contextmenu', close);
    menu.removeEventListener('keydown', menuKey);
  };
  setTimeout(() => {
    if (opts && opts.focusFirst) {
      const first = menu.querySelector('.cm-item');
      if (first) first.focus();
    }
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
  }, 50);
}
function hideContextMenu() {
  document.getElementById('context-menu').classList.add('hidden');
  if (_cmCleanup) { _cmCleanup(); _cmCleanup = null; }
}

function showAnchoredContextMenu(anchor, items) {
  if (!anchor || typeof anchor.getBoundingClientRect !== 'function') return false;
  const rect = anchor.getBoundingClientRect();
  showContextMenu(rect.left, rect.bottom + 6, items, { focusFirst: true });
  return true;
}

function bindAnchoredContextMenu(anchor, getItems) {
  if (!anchor || typeof getItems !== 'function') return;
  anchor.addEventListener('contextmenu', event => {
    event.preventDefault();
    event.stopPropagation();
    showAnchoredContextMenu(anchor, getItems());
  });
  anchor.addEventListener('keydown', event => {
    if (event.target !== anchor) return;
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
    event.preventDefault();
    event.stopPropagation();
    showAnchoredContextMenu(anchor, getItems());
  });
}

const cmIcons = {
  edit: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2L4 10l-2.5.5L2 8l6.5-6.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  delete: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4.5 3V1.5h3V3M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  archive: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2" width="9" height="2" stroke="currentColor" stroke-width="1.2"/><path d="M2.5 4v6h7V4M5 7h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  copy: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="3.5" y="3.5" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/></svg>',
  open: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2.5H2a1 1 0 00-1 1v6.5A1 1 0 002 11h6.5a1 1 0 001-1V8M7 1h4m0 0v4M11 1L5.5 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  color: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.2"/></svg>',
  symbol: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 6h3M6 4.5v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  clock: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2"/><path d="M6 3v3l2 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  stack: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3l4-2 4 2-4 2-4-2zM2 6l4 2 4-2M2 9l4 2 4-2" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  move: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8M4 4l-2 2 2 2M8 4l2 2-2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  detail: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M7 1.5v9M3.2 4h2.2M3.2 6h2.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>',
  favorite: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1.2l1.35 2.74 3.02.44-2.18 2.13.51 3.01L6 8.1 3.3 9.52l.51-3.01L1.63 4.38l3.02-.44L6 1.2z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
  readLater: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 1.5h6a.8.8 0 01.8.8v8.2L6 8.35 2.2 10.5V2.3a.8.8 0 01.8-.8z" stroke="currentColor" stroke-width="1.15" stroke-linejoin="round"/></svg>',
};

// ════════════════════════════════════════════════════════════════
// ARCHIVE
// ════════════════════════════════════════════════════════════════
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function trashTimestamp(entry) {
  // Imported backups receive a fresh retention window instead of losing old
  // Trash entries during the recovery operation or on the next reload.
  const value = Number(entry?.retentionStartedAt || entry?.trashedAt);
  return Number.isFinite(value) && value > 0 ? value : archiveEntryTimestamp(entry);
}

function normalizeExpiredTrash(now = Date.now()) {
  const s = State.get();
  if (!Array.isArray(s.trash)) {
    s.trash = [];
    return 1;
  }
  const keep = s.trash.filter(entry => {
    // Preserve malformed imports for lossless export; the surface reports them
    // without trying to render or silently destroy them.
    if (!entry || !entry.data) return true;
    const at = trashTimestamp(entry);
    return !at || now - at < TRASH_RETENTION_MS;
  });
  if (keep.length === s.trash.length) return 0;
  const removed = s.trash.length - keep.length;
  s.trash = keep;
  return removed;
}

function purgeExpiredTrash(now = Date.now()) {
  const changed = normalizeExpiredTrash(now);
  if (changed) State.persist();
  return changed;
}

function archiveItem(itemId) {
  const info = findItem(itemId);
  if (!info) return;
  State.snapshot('Archive item');
  const [removed] = info.parent.splice(info.index, 1);
  State.get().archive.unshift({
    kind:'item', data: removed,
    wsId: info.ws.id, catId: info.cat.id, groupId: info.group.id,
    catName: info.cat.name, groupName: info.group.name, at: Date.now()
  });
  State.persist();
  renderBoard();
  renderArchiveList();
  toast('Archived', { undo: true });
}
function archiveGroup(gId) {
  const info = findGroup(gId);
  if (!info) return;
  State.snapshot('Archive group');
  const idx = info.cat.groups.findIndex(g => g.id === gId);
  const [removed] = info.cat.groups.splice(idx, 1);
  State.get().archive.unshift({
    kind:'group', data: removed,
    wsId: info.ws.id, catId: info.cat.id, catName: info.cat.name, at: Date.now()
  });
  State.persist();
  renderBoard();
  renderArchiveList();
  toast('Group archived', { undo: true });
}
function archiveRestoreDestination(entry) {
  const s = State.get();
  const ws = s.workspaces.find(w => w.id === entry.wsId) || activeWs() || s.workspaces[0];
  if (!ws) return null;
  const cat = ws.categories.find(c => c.id === entry.catId)
    || ws.categories.find(c => c.name === entry.catName)
    || ws.categories.find(c => c.id === ws.activeCatId)
    || ws.categories[0];
  return cat ? { ws, cat } : null;
}

function captureTabFields(tab) {
  const settings = State.get().settings || {};
  let fallback = tab?.url || 'Untitled';
  try { fallback = new URL(tab.url).hostname || fallback; } catch {}
  return {
    title: settings.captureIncludeTitle !== false ? (tab?.title || fallback) : fallback,
    fav: settings.captureIncludeFavicon !== false ? (tab?.favIconUrl || tab?.fav || '') : ''
  };
}

function captureDuplicateExists(group, url) {
  return State.get().settings.captureDeduplicate !== false &&
    !!group?.items?.find(it => it.type === 'tab' && it.url === url);
}

function restoreArchiveEntries(entries) {
  return restoreStoredEntries(entries, 'archive');
}

function restoreTrashEntries(entries) {
  return restoreStoredEntries(entries, 'trash');
}

function restoreStoredEntries(entries, collectionName) {
  const s = State.get();
  const collection = Array.isArray(s[collectionName]) ? s[collectionName] : [];
  const valid = (entries || []).filter(entry => collection.includes(entry));
  if (!valid.length) return;
  const fromTrash = collectionName === 'trash';
  State.snapshot(valid.length === 1 ? 'Restore' : `Restore ${collectionName} items`);
  for (const entry of valid) {
    const destination = archiveRestoreDestination(entry);
    if (!destination) continue;
    const { cat } = destination;
    collection.splice(collection.indexOf(entry), 1);
    if (entry.kind === 'item') {
      let group = cat.groups.find(g => g.id === entry.groupId)
        || cat.groups.find(g => g.name === entry.groupName);
      if (!group) {
        group = cat.groups.find(g => g.name === 'Inbox');
        if (!group) {
          group = { id: uid(), name:'Inbox', symbol:'📥', color:'#6366f1', collapsed:false, items:[] };
          cat.groups.unshift(group);
        }
      }
      group.items.push(entry.data);
    } else {
      cat.groups.push(entry.data);
    }
  }
  State.persist();
  renderBoard();
  renderArchiveList();
  updateNavChrome();
  const message = fromTrash
    ? (valid.length === 1 ? tr('trash.restored') : tr('trash.restoredMany', { count: valid.length }))
    : (valid.length === 1 ? 'Restored' : `Restored ${valid.length} archived items`);
  toast(message, { undo: true });
}

function restoreArchive(idx) {
  const entry = State.get().archive[idx];
  if (entry) restoreArchiveEntries([entry]);
}
function moveArchiveEntriesToTrash(entries) {
  const s = State.get();
  const valid = (entries || []).filter(entry => s.archive.includes(entry));
  if (!valid.length) return;
  State.snapshot(valid.length === 1 ? 'Move to Trash' : 'Move archive items to Trash');
  const now = Date.now();
  valid.forEach(entry => {
    s.archive.splice(s.archive.indexOf(entry), 1);
    s.trash.unshift({ ...entry, trashedAt: now });
  });
  State.persist();
  renderBoard();
  renderArchiveList();
  updateNavChrome();
  toast(tr('archive.movedToTrash'), { undo: true });
}

let trashDeleteEntries = [];
let trashDeleteBusy = false;

function setTrashDeleteBusy(busy) {
  const overlay = document.getElementById('trash-delete-overlay');
  const cancel = document.getElementById('trash-delete-cancel');
  const confirmButton = document.getElementById('trash-delete-confirm');
  trashDeleteBusy = !!busy;
  if (overlay) overlay.setAttribute('aria-busy', String(trashDeleteBusy));
  if (cancel) cancel.disabled = trashDeleteBusy;
  if (confirmButton) {
    confirmButton.disabled = trashDeleteBusy;
    confirmButton.textContent = tr(trashDeleteBusy ? 'trash.deleting' : 'trash.deleteForever');
  }
}

function focusTrashDeleteFallback() {
  const target = document.querySelector('.trash-shell input[type="search"], .archive-shell input[type="search"]')
    || document.getElementById('nav-trash');
  if (target && typeof target.focus === 'function') {
    try { target.focus({ preventScroll: true }); } catch { try { target.focus(); } catch {} }
  }
}

function closeTrashDeleteDialog({ restoreFocus = true } = {}) {
  const overlay = document.getElementById('trash-delete-overlay');
  if (!overlay || overlay.classList.contains('hidden') || trashDeleteBusy) return false;
  overlay.classList.add('hidden');
  unlockBodyScroll();
  trashDeleteEntries = [];
  setTrashDeleteBusy(false);
  if (restoreFocus && !restoreOpener(overlay)) setTimeout(focusTrashDeleteFallback, 0);
  else if (!restoreFocus) restoreOpener(overlay);
  return true;
}

function permanentlyDeleteTrashEntries(entries) {
  const s = State.get();
  const valid = [...new Set((entries || []).filter(entry => s.trash.includes(entry)))];
  if (!valid.length) return false;
  const overlay = document.getElementById('trash-delete-overlay');
  if (!overlay || !overlay.classList.contains('hidden')) return false;
  trashDeleteEntries = valid;
  const message = valid.length === 1
    ? tr('trash.confirmOne', { title: archiveEntryTitle(valid[0]) })
    : tr('trash.confirmMany', { count: valid.length });
  document.getElementById('trash-delete-message').textContent = message;
  rememberOpener(overlay);
  setTrashDeleteBusy(false);
  overlay.classList.remove('hidden');
  lockBodyScroll();
  setTimeout(() => document.getElementById('trash-delete-cancel')?.focus({ preventScroll: true }), 0);
  return true;
}

async function confirmTrashDelete() {
  if (trashDeleteBusy) return false;
  const s = State.get();
  const valid = trashDeleteEntries.filter(entry => s.trash.includes(entry));
  if (!valid.length) {
    closeTrashDeleteDialog();
    return false;
  }
  setTrashDeleteBusy(true);
  valid.forEach(entry => s.trash.splice(s.trash.indexOf(entry), 1));
  try {
    await State.persistNow();
  } catch {
    // persistNow routes the failure through the fail-closed recovery overlay.
    // Do not show a durable-success toast for an unconfirmed deletion.
    setTrashDeleteBusy(false);
    return false;
  }
  // A confirmed permanent deletion must not remain recoverable through an
  // older in-memory Undo or Redo snapshot.
  State.clearUndoHistory();
  renderBoard();
  renderHeader();
  updateNavChrome();
  setTrashDeleteBusy(false);
  closeTrashDeleteDialog();
  toast(tr('trash.deleted'), { danger: true });
  return true;
}

function bindTrashDeleteDialog() {
  const overlay = document.getElementById('trash-delete-overlay');
  if (!overlay) return;
  document.getElementById('trash-delete-cancel').onclick = () => closeTrashDeleteDialog();
  document.getElementById('trash-delete-confirm').onclick = confirmTrashDelete;
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeTrashDeleteDialog();
      return;
    }
    trapTabKey(event, overlay);
  });
}

let organizationNameCtx = null;
let organizationNameBusy = false;

function organizationNameTarget(kind, id) {
  const state = State.get();
  if (kind === 'workspace') {
    const matches = state.workspaces.filter(workspace => workspace.id === id);
    if (matches.length !== 1) return null;
    return { kind, id, name: matches[0].name, entity: matches[0] };
  }
  if (kind === 'space') {
    const matches = [];
    state.workspaces.forEach(workspace => {
      workspace.categories.forEach(space => {
        if (space.id === id) matches.push({ workspace, space });
      });
    });
    if (matches.length !== 1) return null;
    return {
      kind,
      id,
      name: matches[0].space.name,
      workspaceId: matches[0].workspace.id,
      entity: matches[0].space,
    };
  }
  return null;
}

function organizationWorkspaceTarget(id) {
  const matches = State.get().workspaces.filter(workspace => workspace.id === id);
  return matches.length === 1 ? matches[0] : null;
}

function organizationGroupTarget(id) {
  const matches = [];
  State.get().workspaces.forEach(workspace => {
    workspace.categories.forEach(space => {
      space.groups.forEach(group => {
        if (group.id === id) matches.push({ workspace, space, group });
      });
    });
  });
  return matches.length === 1 ? matches[0] : null;
}

function createOrganizationIdAllocator() {
  const state = State.get();
  const used = LocusImportUtils.collectEntityIds(state);
  const reserve = value => {
    if (typeof value === 'string' && value) used.add(value);
  };
  // Archive and Trash envelopes retain the last active destination IDs outside
  // their payload. Reserving those hints prevents a newly created entity from
  // silently becoming the restore destination for unrelated stored content.
  for (const collection of [state.archive || [], state.trash || []]) {
    for (const entry of collection) {
      reserve(entry?.wsId);
      reserve(entry?.catId);
      reserve(entry?.groupId);
    }
  }
  for (const key of ['columnSizes', 'columnWidths']) {
    const record = state[key];
    if (record && typeof record === 'object' && !Array.isArray(record)) {
      Object.keys(record).forEach(reserve);
    }
  }
  for (const workspace of state.workspaces || []) {
    for (const space of workspace.categories || []) {
      const positions = space?.canvasPositions;
      if (positions && typeof positions === 'object' && !Array.isArray(positions)) {
        Object.keys(positions).forEach(reserve);
      }
    }
  }
  const remembered = state.settings?.captureLastTarget;
  reserve(remembered?.workspaceId);
  reserve(remembered?.categoryId);
  reserve(remembered?.groupId);
  reserve(state.settings?.captureDefaultCategoryId);
  return () => {
    for (let attempts = 0; attempts < 10000; attempts += 1) {
      const id = String(uid());
      if (id && !used.has(id)) {
        used.add(id);
        return id;
      }
    }
    throw new Error('Could not allocate a unique organization id');
  };
}

function organizationGroupMoveOptions(source) {
  if (!source) return null;
  const workspace = organizationWorkspaceTarget(source.workspace.id);
  const parent = identitySpaceTarget(source.workspace.id, source.space.id);
  if (workspace !== source.workspace || parent?.space !== source.space) return null;

  const options = [];
  const seen = new Set();
  for (let workspaceIndex = 0; workspaceIndex < source.workspace.categories.length; workspaceIndex += 1) {
    const space = source.workspace.categories[workspaceIndex];
    const id = String(space.id);
    const exact = identitySpaceTarget(source.workspace.id, id);
    if (seen.has(id) || exact?.workspace !== source.workspace || exact?.space !== space) return null;
    seen.add(id);
    if (space === source.space) continue;
    options.push({
      id,
      name: space.name,
      groupCount: space.groups.length,
      workspaceIndex: workspaceIndex + 1,
      workspaceCount: source.workspace.categories.length,
      duplicateName: source.workspace.categories
        .filter(candidate => candidate.name === space.name).length > 1,
    });
  }
  return options;
}

function organizationMoveSpaceLabel(option) {
  if (!option?.duplicateName) return option?.name || '';
  const position = tr('organization.space.position', {
    position: option.workspaceIndex,
    count: option.workspaceCount,
  });
  return tr('organization.space.duplicateLabel', { name: option.name, position });
}

function organizationGroupMoveFingerprint(source, options) {
  return JSON.stringify({
    workspaceName: source.workspace.name,
    sourceSpaceName: source.space.name,
    groupName: source.group.name,
    destinations: options.map(option => ({
      id: option.id,
      name: option.name,
      groupCount: option.groupCount,
      workspaceIndex: option.workspaceIndex,
      workspaceCount: option.workspaceCount,
      duplicateName: option.duplicateName,
    })),
  });
}

function organizationGroupItemIds(group) {
  const ids = new Set();
  const walk = items => (items || []).forEach(item => {
    ids.add(String(item.id));
    if (item.type === 'stack') walk(item.items);
  });
  walk(group?.items);
  return ids;
}

function organizationMoveOptionButton(spaceId) {
  return [...document.querySelectorAll('#organization-move-options .organization-move-option')]
    .find(button => button.dataset.spaceId === String(spaceId));
}

function selectOrganizationMoveDestination(spaceId, { focus = false } = {}) {
  if (!organizationNameCtx
    || organizationNameCtx.operation !== 'move-group'
    || organizationNameBusy
    || organizationNameCtx.unavailable) return false;
  const option = (organizationNameCtx.moveOptions || [])
    .find(candidate => candidate.id === String(spaceId));
  if (!option) return false;
  organizationNameCtx.destinationSpaceId = option.id;
  organizationNameCtx.errorKey = null;
  const host = document.getElementById('organization-move-options');
  host?.setAttribute('aria-invalid', 'false');
  document.querySelectorAll('#organization-move-options .organization-move-option')
    .forEach(button => {
      const selected = button.dataset.spaceId === option.id;
      button.setAttribute('aria-checked', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
  const error = document.getElementById('organization-name-error');
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
  const confirm = document.getElementById('organization-name-confirm');
  if (confirm) {
    const confirmLabel = tr('organization.group.moveHistory', {
      group: organizationNameCtx.groupName,
      space: organizationMoveSpaceLabel(option),
    });
    confirm.dataset.i18n = 'organization.group.move';
    confirm.textContent = tr('organization.group.move');
    confirm.disabled = false;
    confirm.setAttribute('aria-disabled', 'false');
    confirm.setAttribute('aria-label', confirmLabel);
    confirm.title = confirmLabel;
  }
  if (focus) {
    const button = organizationMoveOptionButton(option.id);
    try { button?.focus({ preventScroll: true }); } catch { try { button?.focus(); } catch {} }
    try { button?.scrollIntoView({ block: 'nearest' }); } catch {}
  }
  return true;
}

function paintOrganizationMoveOptions() {
  const host = document.getElementById('organization-move-options');
  if (!host) return;
  const focusedId = host.contains(document.activeElement)
    ? document.activeElement?.dataset?.spaceId
    : null;
  const previousScrollTop = host.scrollTop;
  host.textContent = '';
  if (!organizationNameCtx || organizationNameCtx.operation !== 'move-group') return;

  const options = organizationNameCtx.moveOptions || [];
  const selectedId = organizationNameCtx.destinationSpaceId;
  const invalidSelection = [
    'organization.group.moveRequired',
    'organization.group.moveDestinationUnavailable',
  ].includes(organizationNameCtx.errorKey);
  host.setAttribute('aria-invalid', String(invalidSelection));
  host.setAttribute('aria-describedby', 'organization-name-error');
  options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'organization-move-option';
    button.dataset.spaceId = option.id;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(option.id === selectedId));
    const groupCount = option.groupCount === 1
      ? tr('organization.group.moveOptionOne')
      : tr('organization.group.moveOptionMany', { count: option.groupCount });
    const duplicateName = option.duplicateName;
    const position = duplicateName
      ? tr('organization.space.position', {
        position: option.workspaceIndex,
        count: option.workspaceCount,
      })
      : '';
    button.setAttribute('aria-label', tr(
      duplicateName ? 'organization.group.moveOptionDuplicate' : 'organization.group.moveOption',
      { space: option.name, groups: groupCount, position },
    ));
    button.title = option.name;
    button.tabIndex = selectedId ? (option.id === selectedId ? 0 : -1) : (index === 0 ? 0 : -1);
    button.disabled = organizationNameBusy || !!organizationNameCtx.unavailable;

    const copy = document.createElement('span');
    copy.className = 'organization-move-option-copy';
    const name = document.createElement('span');
    name.className = 'organization-move-option-name';
    name.textContent = option.name;
    const meta = document.createElement('span');
    meta.className = 'organization-move-option-meta';
    meta.textContent = duplicateName ? `${groupCount} · ${position}` : groupCount;
    copy.append(name, meta);
    const check = document.createElement('span');
    check.className = 'organization-move-option-check';
    check.setAttribute('aria-hidden', 'true');
    check.textContent = '✓';
    button.append(copy, check);

    button.addEventListener('click', () => {
      selectOrganizationMoveDestination(option.id, { focus: true });
    });
    button.addEventListener('keydown', event => {
      const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End', ' ', 'Enter'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      let nextIndex = index;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % options.length;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + options.length) % options.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = options.length - 1;
      selectOrganizationMoveDestination(options[nextIndex].id, { focus: true });
    });
    host.appendChild(button);
  });
  host.scrollTop = previousScrollTop;
  if (focusedId && !organizationNameBusy && !organizationNameCtx.unavailable) {
    const target = organizationMoveOptionButton(focusedId);
    try { target?.focus({ preventScroll: true }); } catch { try { target?.focus(); } catch {} }
    try { target?.scrollIntoView({ block: 'nearest' }); } catch {}
  }
}

function paintOrganizationNameDialog() {
  if (!organizationNameCtx) return;
  const { kind, errorKey, unavailable } = organizationNameCtx;
  const operation = organizationNameCtx.operation || 'rename';
  const isRename = operation === 'rename';
  const isCreateAndMove = operation === 'create-space-and-move-group';
  const isExistingMove = operation === 'move-group';
  const titleKey = isRename
    ? `organization.${kind}.renameTitle`
    : isCreateAndMove
      ? 'organization.space.createForGroupTitle'
      : isExistingMove
        ? 'organization.group.moveTitle'
        : `organization.${kind}.createTitle`;
  const titleVars = (isCreateAndMove || isExistingMove) ? { group: organizationNameCtx.groupName } : {};
  const labelKey = isExistingMove
    ? 'organization.group.moveListLabel'
    : `organization.${kind}.nameLabel`;
  const title = document.getElementById('organization-name-title');
  const label = document.getElementById('organization-name-label');
  const input = document.getElementById('organization-name-input');
  const description = document.getElementById('organization-name-description');
  const moveField = document.getElementById('organization-move-field');
  const moveLabel = document.getElementById('organization-move-label');
  const error = document.getElementById('organization-name-error');
  const close = document.getElementById('organization-name-close');
  const cancel = document.getElementById('organization-name-cancel');
  const confirm = document.getElementById('organization-name-confirm');
  title.dataset.i18n = titleKey;
  title.textContent = tr(titleKey, titleVars);
  label.hidden = isExistingMove;
  input.hidden = isExistingMove;
  label.dataset.i18n = labelKey;
  label.textContent = tr(labelKey);
  const closeKey = isExistingMove ? 'organization.group.moveClose' : 'organization.close';
  close.dataset.i18nAriaLabel = closeKey;
  close.setAttribute('aria-label', tr(closeKey));
  cancel.dataset.i18n = 'organization.cancel';
  cancel.textContent = tr('organization.cancel');
  const confirmKey = organizationNameBusy
    ? (isRename
      ? 'organization.renaming'
      : isExistingMove
        ? 'organization.group.moving'
        : 'organization.creating')
    : (isRename
      ? 'organization.rename'
      : isExistingMove
        ? 'organization.group.move'
        : 'organization.create');
  confirm.dataset.i18n = confirmKey;
  confirm.textContent = tr(confirmKey);
  let confirmLabel = confirm.textContent;
  if (isExistingMove && !organizationNameBusy && organizationNameCtx.destinationSpaceId) {
    const destination = (organizationNameCtx.moveOptions || [])
      .find(option => option.id === organizationNameCtx.destinationSpaceId);
    if (destination) {
      confirmLabel = tr('organization.group.moveHistory', {
        group: organizationNameCtx.groupName,
        space: organizationMoveSpaceLabel(destination),
      });
    }
  }
  confirm.setAttribute('aria-label', confirmLabel);
  confirm.title = confirmLabel;
  if (description) {
    description.hidden = !(isCreateAndMove || isExistingMove);
    description.textContent = isCreateAndMove
      ? tr('organization.space.createForGroupBody')
      : isExistingMove
        ? tr('organization.group.moveBody', {
          source: organizationNameCtx.sourceSpaceName,
          workspace: organizationNameCtx.workspaceName,
        })
        : '';
    input.setAttribute('aria-describedby', isCreateAndMove
      ? 'organization-name-description organization-name-error'
      : 'organization-name-error');
  }
  if (moveField) moveField.hidden = !isExistingMove;
  if (moveLabel) {
    moveLabel.dataset.i18n = 'organization.group.moveListLabel';
    moveLabel.textContent = tr('organization.group.moveListLabel');
  }
  paintOrganizationMoveOptions();
  error.hidden = !errorKey;
  error.textContent = errorKey ? tr(errorKey) : '';
  input.setAttribute('aria-invalid', String(!isExistingMove && !!errorKey));
  input.disabled = organizationNameBusy || !!unavailable;
  close.disabled = organizationNameBusy;
  cancel.disabled = organizationNameBusy;
  confirm.disabled = !!unavailable || (isExistingMove && !organizationNameCtx.destinationSpaceId);
  confirm.setAttribute('aria-disabled', String(organizationNameBusy || confirm.disabled));
  document.getElementById('organization-name-overlay')
    .setAttribute('aria-busy', String(organizationNameBusy));
}

function setOrganizationNameBusy(busy) {
  organizationNameBusy = !!busy;
  paintOrganizationNameDialog();
  if (organizationNameBusy) {
    const confirm = document.getElementById('organization-name-confirm');
    try { confirm?.focus({ preventScroll: true }); } catch { try { confirm?.focus(); } catch {} }
  }
}

function setOrganizationNameError(errorKey, { unavailable = false } = {}) {
  if (!organizationNameCtx) return;
  organizationNameCtx.errorKey = errorKey || null;
  organizationNameCtx.unavailable = !!unavailable;
  paintOrganizationNameDialog();
}

function setOrganizationNameInterlock(enabled) {
  const overlay = document.getElementById('organization-name-overlay');
  const recovery = document.getElementById('state-recovery-overlay');
  for (const child of document.body.children) {
    if (child === overlay || child === recovery) continue;
    setElementInertOwner(child, 'organization-name', enabled);
  }
}

function focusOrganizationNameFallback(ctx) {
  const candidates = [];
  const targetId = ctx?.createdId || ctx?.id;
  if (ctx?.operation === 'move-group') {
    const spaces = [...document.querySelectorAll('.space-item')];
    candidates.push(spaces.find(element => element.dataset.catId === ctx.destinationSpaceId));
    candidates.push(spaces.find(element => element.dataset.catId === ctx.sourceSpaceId));
    candidates.push(document.getElementById('add-cat-btn'));
    candidates.push(document.getElementById('ws-menu-btn'));
  } else if (ctx?.kind === 'workspace') {
    const gridCards = [...document.querySelectorAll('.wsg-card')];
    const chips = [...document.querySelectorAll('.ws-chip')];
    if (ctx.workspaceGridOpen) {
      candidates.push(gridCards.find(element => element.dataset.wsId === targetId));
      candidates.push(document.getElementById('wsg-close'));
    }
    candidates.push(chips.find(element => element.dataset.wsid === targetId));
    candidates.push(document.getElementById('ws-menu-btn'));
    candidates.push(document.getElementById('add-ws-btn'));
  } else if (ctx?.kind === 'space') {
    const spaces = [...document.querySelectorAll('.space-item')];
    const homeActions = [...document.querySelectorAll('.home-card-more')];
    candidates.push(spaces.find(element => element.dataset.catId === targetId));
    candidates.push(homeActions.find(element => element.dataset.catId === targetId));
    candidates.push(document.getElementById('add-cat-btn'));
    candidates.push(document.getElementById('ws-menu-btn'));
  }
  for (const target of candidates) {
    if (!target || typeof target.focus !== 'function') continue;
    try { target.focus({ preventScroll: true }); } catch { try { target.focus(); } catch {} }
    if (document.activeElement === target) {
      if (ctx?.operation === 'move-group') {
        try { target.scrollIntoView({ block: 'nearest' }); } catch {}
      }
      return true;
    }
  }
  return false;
}

function closeOrganizationNameDialog({ preferTarget = false } = {}) {
  const overlay = document.getElementById('organization-name-overlay');
  if (!overlay || overlay.classList.contains('hidden') || organizationNameBusy) return false;
  const closingCtx = organizationNameCtx;
  overlay.classList.add('hidden');
  unlockBodyScroll();
  setOrganizationNameBusy(false);
  setOrganizationNameInterlock(false);
  organizationNameCtx = null;
  const restored = restoreOpener(overlay);
  if (preferTarget || !restored) {
    setTimeout(() => focusOrganizationNameFallback(closingCtx), 0);
  }
  return true;
}

function openOrganizationName(kind, id, opener) {
  const overlay = document.getElementById('organization-name-overlay');
  const recovery = document.getElementById('state-recovery-overlay');
  const deleteOverlay = document.getElementById('organization-delete-overlay');
  const trashOverlay = document.getElementById('trash-delete-overlay');
  const legacyModal = document.getElementById('modal-overlay');
  if (!overlay || !overlay.classList.contains('hidden')) return false;
  if ([recovery, deleteOverlay, trashOverlay, legacyModal].some(layer => layer && !layer.classList.contains('hidden'))) return false;
  const target = organizationNameTarget(kind, id);
  if (!target) return false;
  organizationNameCtx = {
    operation: 'rename',
    kind,
    id,
    workspaceId: target.workspaceId || null,
    originalName: target.name,
    errorKey: null,
    unavailable: false,
    workspaceGridOpen: !document.getElementById('ws-grid-overlay')?.classList.contains('hidden'),
  };
  focusDialogOpener(opener);
  rememberOpener(overlay);
  const input = document.getElementById('organization-name-input');
  input.value = target.name;
  setOrganizationNameBusy(false);
  setOrganizationNameInterlock(true);
  overlay.classList.remove('hidden');
  lockBodyScroll();
  setTimeout(() => {
    input.focus({ preventScroll: true });
    input.select();
  }, 0);
  return true;
}

function openOrganizationGroupMove(groupId, opener) {
  const overlay = document.getElementById('organization-name-overlay');
  const recovery = document.getElementById('state-recovery-overlay');
  const deleteOverlay = document.getElementById('organization-delete-overlay');
  const trashOverlay = document.getElementById('trash-delete-overlay');
  const legacyModal = document.getElementById('modal-overlay');
  if (!overlay || !overlay.classList.contains('hidden')) return false;
  if ([recovery, deleteOverlay, trashOverlay, legacyModal]
    .some(layer => layer && !layer.classList.contains('hidden'))) return false;

  const source = identityGroupTarget(String(groupId));
  const options = organizationGroupMoveOptions(source);
  if (!source
    || !options
    || State.get().activeWsId !== source.workspace.id
    || source.workspace.activeCatId !== source.space.id) return false;
  organizationNameCtx = {
    operation: 'move-group',
    kind: 'group',
    id: source.group.id,
    workspaceId: source.workspace.id,
    sourceSpaceId: source.space.id,
    groupId: source.group.id,
    workspaceName: source.workspace.name,
    sourceSpaceName: source.space.name,
    groupName: source.group.name,
    destinationSpaceId: null,
    moveOptions: options,
    reviewFingerprint: organizationGroupMoveFingerprint(source, options),
    errorKey: options.length ? null : 'organization.group.moveNoDestination',
    unavailable: !options.length,
    workspaceGridOpen: !document.getElementById('ws-grid-overlay')?.classList.contains('hidden'),
  };
  focusDialogOpener(opener);
  rememberOpener(overlay);
  document.getElementById('organization-name-input').value = '';
  setOrganizationNameBusy(false);
  setOrganizationNameInterlock(true);
  overlay.classList.remove('hidden');
  lockBodyScroll();
  setTimeout(() => {
    const initial = organizationMoveOptionButton(options[0]?.id)
      || document.getElementById('organization-name-cancel');
    try { initial?.focus({ preventScroll: true }); } catch { try { initial?.focus(); } catch {} }
    try { initial?.scrollIntoView({ block: 'nearest' }); } catch {}
  }, 0);
  return true;
}

function organizationGroupMoveMenuItems(groupId, opener) {
  const source = identityGroupTarget(String(groupId));
  const options = organizationGroupMoveOptions(source);
  if (!source || !options) return [];
  const items = [];
  if (options.length) {
    items.push({
      text: tr('organization.space.moveMenuLabel'),
      icon: cmIcons.move,
      action: () => openOrganizationGroupMove(source.group.id, opener),
    });
  }
  items.push({
    text: tr('organization.space.newAndMoveMenu'),
    icon: cmIcons.move,
    action: () => openOrganizationCreate('space', { groupId: source.group.id }, opener),
  });
  return items;
}

function openOrganizationCreate(kind, options = {}, opener) {
  const overlay = document.getElementById('organization-name-overlay');
  const recovery = document.getElementById('state-recovery-overlay');
  const deleteOverlay = document.getElementById('organization-delete-overlay');
  const trashOverlay = document.getElementById('trash-delete-overlay');
  const legacyModal = document.getElementById('modal-overlay');
  if (!overlay || !overlay.classList.contains('hidden')) return false;
  if ([recovery, deleteOverlay, trashOverlay, legacyModal].some(layer => layer && !layer.classList.contains('hidden'))) return false;

  let context = null;
  if (kind === 'workspace') {
    context = { operation: 'create-workspace', kind };
  } else if (kind === 'space' && options.groupId) {
    const source = organizationGroupTarget(options.groupId);
    const exactWorkspace = source ? organizationWorkspaceTarget(source.workspace.id) : null;
    const exactSpace = source ? organizationNameTarget('space', source.space.id) : null;
    if (!source || exactWorkspace !== source.workspace || exactSpace?.entity !== source.space) return false;
    context = {
      operation: 'create-space-and-move-group',
      kind,
      workspaceId: source.workspace.id,
      sourceSpaceId: source.space.id,
      groupId: source.group.id,
      groupName: source.group.name,
    };
  } else if (kind === 'space') {
    const workspaceId = options.workspaceId || State.get().activeWsId;
    if (!organizationWorkspaceTarget(workspaceId)) return false;
    context = { operation: 'create-space', kind, workspaceId };
  }
  if (!context) return false;

  organizationNameCtx = {
    ...context,
    errorKey: null,
    unavailable: false,
    workspaceGridOpen: !document.getElementById('ws-grid-overlay')?.classList.contains('hidden'),
  };
  focusDialogOpener(opener);
  rememberOpener(overlay);
  const input = document.getElementById('organization-name-input');
  input.value = '';
  setOrganizationNameBusy(false);
  setOrganizationNameInterlock(true);
  overlay.classList.remove('hidden');
  lockBodyScroll();
  setTimeout(() => input.focus({ preventScroll: true }), 0);
  return true;
}

async function confirmOrganizationCreate() {
  if (!organizationNameCtx || organizationNameBusy || organizationNameCtx.unavailable) return false;
  const input = document.getElementById('organization-name-input');
  const desiredName = input.value.trim();
  const dialogCtx = { ...organizationNameCtx };
  if (!desiredName) {
    setOrganizationNameError(`organization.${dialogCtx.kind}.nameRequired`);
    input.focus({ preventScroll: true });
    return false;
  }

  let workspace = null;
  let source = null;
  if (dialogCtx.operation === 'create-space') {
    workspace = organizationWorkspaceTarget(dialogCtx.workspaceId);
    if (!workspace) {
      setOrganizationNameError('organization.space.parentUnavailable', { unavailable: true });
      document.getElementById('organization-name-cancel').focus({ preventScroll: true });
      return false;
    }
  } else if (dialogCtx.operation === 'create-space-and-move-group') {
    source = organizationGroupTarget(dialogCtx.groupId);
    const exactWorkspace = organizationWorkspaceTarget(dialogCtx.workspaceId);
    const exactSpace = organizationNameTarget('space', dialogCtx.sourceSpaceId);
    if (!source
      || exactWorkspace !== source.workspace
      || exactSpace?.entity !== source.space
      || source.workspace.id !== dialogCtx.workspaceId
      || source.space.id !== dialogCtx.sourceSpaceId) {
      setOrganizationNameError('organization.group.unavailable', { unavailable: true });
      document.getElementById('organization-name-cancel').focus({ preventScroll: true });
      return false;
    }
    if (source.group.name !== dialogCtx.groupName) {
      organizationNameCtx.groupName = source.group.name;
      setOrganizationNameError('organization.group.nameChanged');
      input.focus({ preventScroll: true });
      return false;
    }
    workspace = source.workspace;
  }

  let created;
  try {
    const allocateId = createOrganizationIdAllocator();
    if (dialogCtx.operation === 'create-workspace') {
      const space = { id: allocateId(), name: tr('organization.space.defaultName'), groups: [] };
      created = {
        id: allocateId(),
        name: desiredName,
        symbol: '🏠',
        categories: [space],
        activeCatId: space.id,
      };
    } else {
      created = { id: allocateId(), name: desiredName, groups: source ? [source.group] : [] };
      if (source?.space?.canvasPositions
        && Object.prototype.hasOwnProperty.call(source.space.canvasPositions, source.group.id)) {
        created.canvasPositions = { [source.group.id]: source.space.canvasPositions[source.group.id] };
      }
    }
  } catch {
    setOrganizationNameError('organization.idUnavailable');
    input.focus({ preventScroll: true });
    return false;
  }

  let actionId;
  let successKey;
  let successVars;
  if (dialogCtx.operation === 'create-workspace') {
    actionId = State.snapshot(tr('organization.workspace.createHistory', { name: desiredName }));
    State.get().workspaces.push(created);
    State.get().activeWsId = created.id;
    successKey = 'organization.workspace.created';
    successVars = { name: desiredName };
  } else if (dialogCtx.operation === 'create-space') {
    actionId = State.snapshot(tr('organization.space.createHistory', { name: desiredName }));
    workspace.categories.push(created);
    workspace.activeCatId = created.id;
    State.get().activeWsId = workspace.id;
    successKey = 'organization.space.created';
    successVars = { name: desiredName };
  } else {
    const sourceIndex = source.space.groups.findIndex(group => group.id === source.group.id);
    if (sourceIndex < 0) {
      setOrganizationNameError('organization.group.unavailable', { unavailable: true });
      document.getElementById('organization-name-cancel').focus({ preventScroll: true });
      return false;
    }
    actionId = State.snapshot(tr('organization.space.createAndMoveHistory', {
      space: desiredName,
      group: source.group.name,
    }));
    source.space.groups.splice(sourceIndex, 1);
    if (source.space.canvasPositions) delete source.space.canvasPositions[source.group.id];
    workspace.categories.push(created);
    workspace.activeCatId = created.id;
    State.get().activeWsId = workspace.id;
    const remembered = State.get().settings?.captureLastTarget;
    if (remembered?.groupId === source.group.id) {
      remembered.workspaceId = workspace.id;
      remembered.categoryId = created.id;
    }
    successKey = 'organization.space.createdAndMoved';
    successVars = { space: desiredName, group: source.group.name };
  }

  organizationNameCtx.createdId = created.id;
  dialogCtx.createdId = created.id;
  setOrganizationNameBusy(true);
  try {
    await State.persistNow();
  } catch {
    // persistNow owns fail-closed recovery. Keep the one dirty transaction and
    // do not render, close, retry, roll back, or claim success.
    setOrganizationNameBusy(false);
    return false;
  }

  const headerReady = renderAll();
  if (dialogCtx.workspaceGridOpen) {
    try { await openWsGrid(); } catch {}
  } else if (dialogCtx.kind === 'workspace') {
    try { await headerReady; } catch {}
  }
  setOrganizationNameBusy(false);
  closeOrganizationNameDialog({ preferTarget: true });
  toast(tr(successKey, successVars), { undo: actionId });
  return true;
}

async function confirmOrganizationGroupMove() {
  if (!organizationNameCtx
    || organizationNameCtx.operation !== 'move-group'
    || organizationNameBusy
    || organizationNameCtx.unavailable) return false;

  const dialogCtx = organizationNameCtx;
  if (State.get().activeWsId !== dialogCtx.workspaceId) {
    setOrganizationNameError('organization.group.moveContextChanged', { unavailable: true });
    document.getElementById('organization-name-cancel').focus({ preventScroll: true });
    return false;
  }
  const source = identityGroupTarget(dialogCtx.groupId);
  if (source && source.workspace.activeCatId !== dialogCtx.sourceSpaceId) {
    setOrganizationNameError('organization.group.moveContextChanged', { unavailable: true });
    document.getElementById('organization-name-cancel').focus({ preventScroll: true });
    return false;
  }
  const exactWorkspace = organizationWorkspaceTarget(dialogCtx.workspaceId);
  const exactSourceSpace = identitySpaceTarget(dialogCtx.workspaceId, dialogCtx.sourceSpaceId);
  if (!source
    || exactWorkspace !== source.workspace
    || exactSourceSpace?.workspace !== source.workspace
    || exactSourceSpace?.space !== source.space
    || source.workspace.id !== dialogCtx.workspaceId
    || source.space.id !== dialogCtx.sourceSpaceId) {
    setOrganizationNameError('organization.group.unavailable', { unavailable: true });
    document.getElementById('organization-name-cancel').focus({ preventScroll: true });
    return false;
  }

  const options = organizationGroupMoveOptions(source);
  if (!options) {
    setOrganizationNameError('organization.group.unavailable', { unavailable: true });
    document.getElementById('organization-name-cancel').focus({ preventScroll: true });
    return false;
  }
  const reviewFingerprint = organizationGroupMoveFingerprint(source, options);
  if (reviewFingerprint !== dialogCtx.reviewFingerprint) {
    const destinationAvailable = options.some(option => option.id === dialogCtx.destinationSpaceId);
    dialogCtx.workspaceName = source.workspace.name;
    dialogCtx.sourceSpaceName = source.space.name;
    dialogCtx.groupName = source.group.name;
    dialogCtx.moveOptions = options;
    dialogCtx.reviewFingerprint = reviewFingerprint;
    dialogCtx.destinationSpaceId = destinationAvailable ? dialogCtx.destinationSpaceId : null;
    dialogCtx.unavailable = !options.length;
    dialogCtx.errorKey = !options.length
      ? 'organization.group.moveNoDestination'
      : destinationAvailable
        ? 'organization.group.moveChanged'
        : 'organization.group.moveDestinationUnavailable';
    paintOrganizationNameDialog();
    const focusTarget = dialogCtx.destinationSpaceId
      ? organizationMoveOptionButton(dialogCtx.destinationSpaceId)
      : organizationMoveOptionButton(options[0]?.id) || document.getElementById('organization-name-cancel');
    try { focusTarget?.focus({ preventScroll: true }); } catch { try { focusTarget?.focus(); } catch {} }
    try { focusTarget?.scrollIntoView({ block: 'nearest' }); } catch {}
    return false;
  }

  if (!dialogCtx.destinationSpaceId) {
    setOrganizationNameError('organization.group.moveRequired');
    const firstOption = organizationMoveOptionButton(options[0]?.id);
    try { firstOption?.focus({ preventScroll: true }); } catch { try { firstOption?.focus(); } catch {} }
    try { firstOption?.scrollIntoView({ block: 'nearest' }); } catch {}
    return false;
  }

  const destination = identitySpaceTarget(dialogCtx.workspaceId, dialogCtx.destinationSpaceId);
  const destinationOption = options.find(option => option.id === dialogCtx.destinationSpaceId);
  if (!destination
    || destination.workspace !== source.workspace
    || destination.space === source.space
    || !destinationOption
    || destinationOption.id !== destination.space.id) {
    dialogCtx.destinationSpaceId = null;
    dialogCtx.moveOptions = options;
    setOrganizationNameError('organization.group.moveDestinationUnavailable');
    const firstOption = organizationMoveOptionButton(options[0]?.id);
    try { firstOption?.focus({ preventScroll: true }); } catch { try { firstOption?.focus(); } catch {} }
    try { firstOption?.scrollIntoView({ block: 'nearest' }); } catch {}
    return false;
  }

  const sourceIndex = source.space.groups.findIndex(group => group === source.group);
  if (sourceIndex < 0) {
    setOrganizationNameError('organization.group.unavailable', { unavailable: true });
    document.getElementById('organization-name-cancel').focus({ preventScroll: true });
    return false;
  }

  const state = State.get();
  const movedItemIds = organizationGroupItemIds(source.group);
  const destinationLabel = organizationMoveSpaceLabel(destinationOption);
  const actionId = State.snapshot(tr('organization.group.moveHistory', {
    group: source.group.name,
    space: destinationLabel,
  }));
  source.space.groups.splice(sourceIndex, 1);
  destination.space.groups.push(source.group);

  if (source.space.canvasPositions
    && Object.prototype.hasOwnProperty.call(source.space.canvasPositions, source.group.id)) {
    if (!destination.space.canvasPositions
      || typeof destination.space.canvasPositions !== 'object'
      || Array.isArray(destination.space.canvasPositions)) {
      destination.space.canvasPositions = {};
    }
    destination.space.canvasPositions[source.group.id] = source.space.canvasPositions[source.group.id];
    delete source.space.canvasPositions[source.group.id];
  }

  const remembered = state.settings?.captureLastTarget;
  if (remembered
    && remembered.workspaceId === source.workspace.id
    && remembered.categoryId === source.space.id
    && remembered.groupId === source.group.id) {
    remembered.workspaceId = source.workspace.id;
    remembered.categoryId = destination.space.id;
  }

  for (const collection of [state.archive, state.trash]) {
    if (!Array.isArray(collection)) continue;
    collection.forEach(entry => {
      if (entry?.kind !== 'item'
        || entry.wsId !== source.workspace.id
        || entry.catId !== source.space.id
        || entry.groupId !== source.group.id) return;
      entry.wsId = source.workspace.id;
      entry.catId = destination.space.id;
      entry.catName = destination.space.name;
      entry.groupName = source.group.name;
    });
  }

  const successVars = { group: source.group.name, space: destinationLabel };
  setOrganizationNameBusy(true);
  try {
    await State.persistNow();
  } catch {
    // persistNow owns fail-closed recovery. The lower dialog remains as an
    // unavailable receipt record; do not retry, roll back, render, close, or
    // claim success for an outcome the storage boundary did not acknowledge.
    organizationNameBusy = false;
    dialogCtx.errorKey = 'organization.group.moveRecoveryRequired';
    dialogCtx.unavailable = true;
    paintOrganizationNameDialog();
    return false;
  }

  let selectionChanged = false;
  movedItemIds.forEach(itemId => {
    if (selectedItemIds.delete(itemId)) selectionChanged = true;
  });
  if (lastSelectedItemId && movedItemIds.has(String(lastSelectedItemId))) {
    lastSelectedItemId = null;
    selectionChanged = true;
  }
  if (selectionChanged) syncItemSelMode();
  renderAll();
  renderItemSelToolbar();
  setOrganizationNameBusy(false);
  closeOrganizationNameDialog({ preferTarget: true });
  toast(tr('organization.group.moved', successVars), { undo: actionId });
  return true;
}

async function confirmOrganizationName() {
  if (!organizationNameCtx || organizationNameBusy || organizationNameCtx.unavailable) return false;
  if (organizationNameCtx.operation === 'move-group') {
    return confirmOrganizationGroupMove();
  }
  if (organizationNameCtx.operation && organizationNameCtx.operation !== 'rename') {
    return confirmOrganizationCreate();
  }
  const input = document.getElementById('organization-name-input');
  const desiredName = input.value.trim();
  const dialogCtx = { ...organizationNameCtx };
  if (!desiredName) {
    setOrganizationNameError(`organization.${dialogCtx.kind}.nameRequired`);
    input.focus({ preventScroll: true });
    return false;
  }
  const target = organizationNameTarget(dialogCtx.kind, dialogCtx.id);
  if (!target || (dialogCtx.kind === 'space' && target.workspaceId !== dialogCtx.workspaceId)) {
    setOrganizationNameError(`organization.${dialogCtx.kind}.unavailable`, { unavailable: true });
    document.getElementById('organization-name-cancel').focus({ preventScroll: true });
    return false;
  }
  if (target.name !== dialogCtx.originalName) {
    organizationNameCtx.originalName = target.name;
    organizationNameCtx.workspaceId = target.workspaceId || null;
    input.value = target.name;
    setOrganizationNameError('organization.nameChanged');
    input.focus({ preventScroll: true });
    input.select();
    return false;
  }
  if (desiredName === target.name) {
    closeOrganizationNameDialog();
    return true;
  }

  const actionId = State.snapshot(tr(`organization.${dialogCtx.kind}.renameHistory`, {
    from: target.name,
    to: desiredName,
  }));
  target.entity.name = desiredName;
  setOrganizationNameBusy(true);
  try {
    await State.persistNow();
  } catch {
    // persistNow owns fail-closed recovery. Keep the dirty local graph and do
    // not render, close, retry, or claim success for an unknown outcome.
    setOrganizationNameBusy(false);
    return false;
  }

  const headerReady = renderAll();
  if (dialogCtx.workspaceGridOpen) {
    try { await openWsGrid(); } catch {}
  } else if (dialogCtx.kind === 'workspace') {
    // Workspace chips are rebuilt only after asynchronous Chrome window queries.
    // Wait for that actual render boundary before restoring focus; a fixed delay
    // can focus a chip that renderWsChips() subsequently removes.
    try { await headerReady; } catch {}
  }
  setOrganizationNameBusy(false);
  closeOrganizationNameDialog({ preferTarget: true });
  toast(tr(`organization.${dialogCtx.kind}.renamed`, { name: desiredName }), { undo: actionId });
  return true;
}

function bindOrganizationNameDialog() {
  const overlay = document.getElementById('organization-name-overlay');
  if (!overlay) return;
  const input = document.getElementById('organization-name-input');
  document.getElementById('organization-name-close').onclick = () => closeOrganizationNameDialog();
  document.getElementById('organization-name-cancel').onclick = () => closeOrganizationNameDialog();
  document.getElementById('organization-name-confirm').onclick = confirmOrganizationName;
  overlay.onclick = event => {
    if (event.target === overlay) closeOrganizationNameDialog();
  };
  input.addEventListener('input', () => {
    if (organizationNameCtx && !organizationNameCtx.unavailable && organizationNameCtx.errorKey) {
      setOrganizationNameError(null);
    }
  });
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeOrganizationNameDialog();
      return;
    }
    if (event.key === 'Enter' && event.target === input) {
      event.preventDefault();
      event.stopPropagation();
      confirmOrganizationName();
      return;
    }
    if (event.key === 'Tab') {
      trapTabKey(event, overlay);
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
  });
}

function handleOrganizationNameGlobalKey(event) {
  const overlay = document.getElementById('organization-name-overlay');
  if (!overlay || overlay.classList.contains('hidden') || overlay.contains(event.target)) return false;
  const recovery = document.getElementById('state-recovery-overlay');
  const recoveryActive = !!(recovery && !recovery.classList.contains('hidden'));
  // The fail-closed recovery layer outranks naming. Do not cancel native
  // keyboard activation of its Reload action as the event reaches document.
  if (recoveryActive && recovery.contains(event.target)) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.key === 'Escape' && !recoveryActive) closeOrganizationNameDialog();
  return true;
}

let organizationDeleteCtx = null;
let organizationDeleteBusy = false;

function organizationDeleteOccupancy(entity) {
  const occupancy = { groups: 0, items: 0, reminders: 0 };
  const walk = items => (items || []).forEach(item => {
    occupancy.items += 1;
    if (item?.type === 'stack') walk(item.items);
  });
  const categories = Array.isArray(entity?.categories) ? entity.categories : [entity];
  categories.forEach(category => {
    occupancy.reminders += Array.isArray(category?.reminders) ? category.reminders.length : 0;
    (category?.groups || []).forEach(group => {
      occupancy.groups += 1;
      occupancy.reminders += Array.isArray(group?.reminders) ? group.reminders.length : 0;
      walk(group.items);
    });
  });
  return occupancy;
}

function organizationDeleteTarget(kind, id) {
  const state = State.get();
  if (kind === 'workspace') {
    if (state.workspaces.length <= 1) return null;
    const workspace = state.workspaces.find(candidate => candidate.id === id);
    if (!workspace) return null;
    const occupancy = organizationDeleteOccupancy(workspace);
    return {
      kind, id, name: workspace.name, occupancy,
      blocked: occupancy.groups > 0 || occupancy.items > 0 || occupancy.reminders > 0,
      fingerprint: JSON.stringify(workspace),
    };
  }
  if (kind === 'space') {
    const info = findCategory(id);
    if (!info || info.ws.categories.length <= 1) return null;
    const occupancy = organizationDeleteOccupancy(info.cat);
    return {
      kind, id, name: info.cat.name, occupancy,
      blocked: occupancy.groups > 0 || occupancy.items > 0 || occupancy.reminders > 0,
      fingerprint: JSON.stringify(info.cat), workspaceId: info.ws.id,
    };
  }
  return null;
}

function paintOrganizationDeleteDialog() {
  if (!organizationDeleteCtx) return;
  const { kind, name, blocked } = organizationDeleteCtx;
  const titleKey = `organization.${kind}.${blocked ? 'blockedTitle' : 'confirmTitle'}`;
  const title = document.getElementById('organization-delete-title');
  title.dataset.i18n = titleKey;
  title.textContent = tr(titleKey);
  document.getElementById('organization-delete-message').textContent = tr(
    `organization.${kind}.${blocked ? 'blockedBody' : 'confirmEmpty'}`,
    { name }
  );
  const cancelKey = blocked ? 'organization.close' : 'organization.cancel';
  const cancelButton = document.getElementById('organization-delete-cancel');
  cancelButton.dataset.i18n = cancelKey;
  cancelButton.textContent = tr(cancelKey);
  const confirmButton = document.getElementById('organization-delete-confirm');
  confirmButton.hidden = blocked;
  const confirmKey = organizationDeleteBusy ? 'organization.deleting' : `organization.${kind}.delete`;
  confirmButton.dataset.i18n = confirmKey;
  confirmButton.textContent = tr(confirmKey);
}

function setOrganizationDeleteBusy(busy) {
  const overlay = document.getElementById('organization-delete-overlay');
  const cancel = document.getElementById('organization-delete-cancel');
  const confirmButton = document.getElementById('organization-delete-confirm');
  organizationDeleteBusy = !!busy;
  if (overlay) overlay.setAttribute('aria-busy', String(organizationDeleteBusy));
  if (cancel) cancel.disabled = organizationDeleteBusy;
  if (confirmButton) confirmButton.disabled = organizationDeleteBusy || !!organizationDeleteCtx?.blocked;
  paintOrganizationDeleteDialog();
}

function setOrganizationDeleteInterlock(enabled) {
  const overlay = document.getElementById('organization-delete-overlay');
  const recovery = document.getElementById('state-recovery-overlay');
  for (const child of document.body.children) {
    if (child === overlay || child === recovery) continue;
    setElementInertOwner(child, 'organization', enabled);
  }
}

function focusOrganizationDeleteFallback(ctx) {
  const state = State.get();
  const workspace = state.workspaces.find(candidate => candidate.id === state.activeWsId);
  const activeCategoryId = workspace?.activeCatId;
  const visibleSpace = ctx?.kind === 'space' && activeCategoryId
    ? [...document.querySelectorAll('.space-item')].find(element => element.dataset.catId === activeCategoryId)
    : null;
  const candidates = ctx?.kind === 'workspace'
    ? [
        ctx.workspaceGridOpen ? document.getElementById('wsg-close') : null,
        document.getElementById('ws-menu-btn'),
        document.getElementById('add-ws-btn'),
      ]
    : [visibleSpace, document.getElementById('add-cat-btn'), document.getElementById('ws-menu-btn')];
  for (const target of candidates) {
    if (!target || typeof target.focus !== 'function') continue;
    try { target.focus({ preventScroll: true }); } catch { try { target.focus(); } catch {} }
    if (document.activeElement === target) return true;
  }
  return false;
}

function closeOrganizationDeleteDialog() {
  const overlay = document.getElementById('organization-delete-overlay');
  if (!overlay || overlay.classList.contains('hidden') || organizationDeleteBusy) return false;
  const closingCtx = organizationDeleteCtx;
  overlay.classList.add('hidden');
  unlockBodyScroll();
  setOrganizationDeleteBusy(false);
  setOrganizationDeleteInterlock(false);
  organizationDeleteCtx = null;
  if (!restoreOpener(overlay)) setTimeout(() => focusOrganizationDeleteFallback(closingCtx), 0);
  return true;
}

function focusDialogOpener(opener) {
  if (!opener || opener.isConnected === false || typeof opener.focus !== 'function') return;
  try { opener.focus({ preventScroll: true }); } catch { try { opener.focus(); } catch {} }
}

function openOrganizationDelete(kind, id, opener) {
  const overlay = document.getElementById('organization-delete-overlay');
  if (!overlay || !overlay.classList.contains('hidden')) return false;
  const namingOverlay = document.getElementById('organization-name-overlay');
  if (namingOverlay && !namingOverlay.classList.contains('hidden')) return false;
  const target = organizationDeleteTarget(kind, id);
  if (!target) return false;
  focusDialogOpener(opener);
  rememberOpener(overlay);
  organizationDeleteCtx = {
    ...target,
    workspaceGridOpen: !document.getElementById('ws-grid-overlay')?.classList.contains('hidden'),
  };
  setOrganizationDeleteBusy(false);
  setOrganizationDeleteInterlock(true);
  overlay.classList.remove('hidden');
  lockBodyScroll();
  setTimeout(() => document.getElementById('organization-delete-cancel')?.focus({ preventScroll: true }), 0);
  return true;
}

async function confirmOrganizationDelete() {
  if (organizationDeleteBusy || !organizationDeleteCtx) return false;
  const current = organizationDeleteTarget(organizationDeleteCtx.kind, organizationDeleteCtx.id);
  if (!current) {
    closeOrganizationDeleteDialog();
    return false;
  }
  if (current.fingerprint !== organizationDeleteCtx.fingerprint) {
    organizationDeleteCtx = { ...organizationDeleteCtx, ...current };
    setOrganizationDeleteBusy(false);
    document.getElementById('organization-delete-cancel')?.focus({ preventScroll: true });
    return false;
  }
  if (current.blocked) {
    organizationDeleteCtx = { ...organizationDeleteCtx, ...current };
    setOrganizationDeleteBusy(false);
    document.getElementById('organization-delete-cancel')?.focus({ preventScroll: true });
    return false;
  }

  const dialogCtx = organizationDeleteCtx;
  setOrganizationDeleteBusy(true);
  const actionId = State.snapshot(tr(`organization.${dialogCtx.kind}.deleteHistory`, { name: dialogCtx.name }));
  const state = State.get();
  if (dialogCtx.kind === 'workspace') {
    state.workspaces = state.workspaces.filter(workspace => workspace.id !== dialogCtx.id);
    if (state.activeWsId === dialogCtx.id) state.activeWsId = state.workspaces[0].id;
  } else {
    const info = findCategory(dialogCtx.id);
    info.ws.categories = info.ws.categories.filter(category => category.id !== dialogCtx.id);
    if (info.ws.activeCatId === dialogCtx.id) info.ws.activeCatId = info.ws.categories[0].id;
  }

  try {
    await State.persistNow();
  } catch {
    // persistNow owns the fail-closed recovery overlay. Do not render or claim
    // success until browser storage has acknowledged this recoverable change.
    setOrganizationDeleteBusy(false);
    return false;
  }

  renderAll();
  if (dialogCtx.workspaceGridOpen) {
    try { await openWsGrid(); } catch {}
  }
  setOrganizationDeleteBusy(false);
  closeOrganizationDeleteDialog();
  toast(tr(`organization.${dialogCtx.kind}.deleted`), { undo: actionId });
  return true;
}

function bindOrganizationDeleteDialog() {
  const overlay = document.getElementById('organization-delete-overlay');
  if (!overlay) return;
  document.getElementById('organization-delete-cancel').onclick = closeOrganizationDeleteDialog;
  document.getElementById('organization-delete-confirm').onclick = confirmOrganizationDelete;
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeOrganizationDeleteDialog();
      return;
    }
    if (event.key === 'Tab') {
      trapTabKey(event, overlay);
      return;
    }
    // Preserve native button activation while preventing document-level
    // shortcuts from opening a second surface above this decision.
    event.stopPropagation();
  });
}

function handleOrganizationDeleteGlobalKey(event) {
  const overlay = document.getElementById('organization-delete-overlay');
  if (!overlay || overlay.classList.contains('hidden') || overlay.contains(event.target)) return false;
  const recovery = document.getElementById('state-recovery-overlay');
  const recoveryActive = !!(recovery && !recovery.classList.contains('hidden'));
  if (recoveryActive && recovery.contains(event.target)) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.key === 'Escape' && !recoveryActive) closeOrganizationDeleteDialog();
  return true;
}

// ════════════════════════════════════════════════════════════════
// CRUD
// ════════════════════════════════════════════════════════════════
function identitySpaceTarget(workspaceId, spaceId) {
  const workspaces = State.get().workspaces.filter(workspace => workspace.id === workspaceId);
  const spaces = [];
  State.get().workspaces.forEach(workspace => {
    workspace.categories.forEach(space => {
      if (space.id === spaceId) spaces.push({ workspace, space });
    });
  });
  if (workspaces.length !== 1 || spaces.length !== 1 || spaces[0].workspace !== workspaces[0]) return null;
  return spaces[0];
}

function identityGroupTarget(groupId) {
  const target = organizationGroupTarget(groupId);
  if (!target) return null;
  const parent = identitySpaceTarget(target.workspace.id, target.space.id);
  if (!parent || parent.workspace !== target.workspace || parent.space !== target.space) return null;
  return { workspace: target.workspace, space: target.space, group: target.group };
}

// Resolve item IDs exhaustively instead of trusting findItem's first match.
// Imported duplicate IDs, selected ancestors/descendants, and moved parents
// therefore fail closed before the identity transaction takes a snapshot.
function identityItemTargets(itemIds) {
  const ids = [...new Set((itemIds || []).map(String))];
  const wanted = new Set(ids);
  const matches = new Map(ids.map(id => [id, []]));
  let order = 0;
  const walk = (items, ctx, parentStack, ancestorStackIds) => {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const id = String(item.id);
      const itemOrder = order++;
      if (wanted.has(id)) {
        matches.get(id).push({
          ...ctx,
          item,
          parentItems: items,
          parentStack,
          parentKey: parentStack ? `stack:${parentStack.id}` : `group:${ctx.group.id}`,
          ancestorStackIds: [...ancestorStackIds],
          index,
          order: itemOrder,
        });
      }
      if (item.type === 'stack' && Array.isArray(item.items)) {
        walk(item.items, ctx, item, [...ancestorStackIds, id]);
      }
    }
  };
  State.get().workspaces.forEach(workspace => {
    workspace.categories.forEach(space => {
      space.groups.forEach(group => {
        walk(group.items || [], { workspace, space, group }, null, []);
      });
    });
  });
  if (ids.some(id => matches.get(id).length !== 1)) return null;
  const targets = ids.map(id => matches.get(id)[0]).sort((a, b) => a.order - b.order);
  const nested = targets.some(target => target.ancestorStackIds.some(id => wanted.has(String(id))));
  return { targets, nested };
}

function identityStackTarget(stackId) {
  const resolved = identityItemTargets([stackId]);
  const target = resolved?.targets[0];
  if (target?.item?.type !== 'stack') return null;
  const group = identityGroupTarget(target.group.id);
  if (!group || group.group !== target.group) return null;
  for (const ancestorId of target.ancestorStackIds) {
    const ancestor = identityItemTargets([ancestorId])?.targets[0];
    if (!ancestor || ancestor.item.type !== 'stack') return null;
  }
  return target;
}

function identityFields(entity) {
  return {
    name: String(entity?.name || ''),
    symbol: String(entity?.symbol || ''),
    color: String(entity?.color || '#6366f1'),
  };
}

function identityFieldsFingerprint(entity) {
  return JSON.stringify(identityFields(entity));
}

function identitySelectionFingerprint(targets) {
  return JSON.stringify(targets.map(target => ({
    id: String(target.item.id),
    workspaceId: String(target.workspace.id),
    spaceId: String(target.space.id),
    groupId: String(target.group.id),
    parentKey: target.parentKey,
  })));
}

function identityGroupDuplicateFingerprint(target) {
  return JSON.stringify({
    workspaceId: target?.workspace?.id,
    spaceId: target?.space?.id,
    spaceName: target?.space?.name,
    group: target?.group,
  });
}

function cloneGroupForDuplicate(source, allocateId) {
  const copy = JSON.parse(JSON.stringify(source));
  const rekeyItems = items => (items || []).forEach(item => {
    item.id = allocateId();
    if (item.type === 'stack' && Array.isArray(item.items)) rekeyItems(item.items);
  });
  copy.id = allocateId();
  rekeyItems(copy.items);
  return copy;
}

function groupContainsReminderData(group) {
  if (Array.isArray(group?.reminders) && group.reminders.length) return true;
  const visit = items => (items || []).some(item => (
    !!item?.reminder || (item?.type === 'stack' && visit(item.items))
  ));
  return visit(group?.items);
}

function cloneGroupLayoutValue(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function prepareGroupDuplicateLayout(state, space, duplicate) {
  const layout = { keyed: [] };
  for (const key of ['columnSizes', 'columnWidths']) {
    const record = state[key];
    if (!record || typeof record !== 'object' || Array.isArray(record)
        || !Object.prototype.hasOwnProperty.call(record, duplicate.sourceId)) continue;
    layout.keyed.push({ key, value: cloneGroupLayoutValue(record[duplicate.sourceId]) });
  }
  const positions = space.canvasPositions;
  if (positions && typeof positions === 'object' && !Array.isArray(positions)) {
    const legacySizes = state.columnWidths && typeof state.columnWidths === 'object' && !Array.isArray(state.columnWidths)
      ? state.columnWidths
      : {};
    const currentSizes = state.columnSizes && typeof state.columnSizes === 'object' && !Array.isArray(state.columnSizes)
      ? state.columnSizes
      : {};
    const effectiveSizes = { ...legacySizes };
    for (const [groupId, savedSize] of Object.entries(currentSizes)) {
      // Rendering uses columnSizes[id] ?? columnWidths[id]; keep placement on
      // that same per-ID contract when imported current records are nullish.
      if (savedSize != null) effectiveSizes[groupId] = savedSize;
    }
    layout.canvasPosition = findOpenCanvasPosition(
      duplicate.group,
      [...space.groups, duplicate.group],
      positions,
      effectiveSizes[duplicate.sourceId],
      effectiveSizes,
    );
  }
  return layout;
}

function applyGroupDuplicateLayout(state, space, duplicate, layout) {
  for (const entry of layout.keyed) {
    if (!state[entry.key] || typeof state[entry.key] !== 'object' || Array.isArray(state[entry.key])) {
      state[entry.key] = {};
    }
    state[entry.key][duplicate.group.id] = entry.value;
  }
  if (layout.canvasPosition) space.canvasPositions[duplicate.group.id] = layout.canvasPosition;
}

function reconcileDuplicatedGroupReminders(group, name, actionId) {
  if (!groupContainsReminderData(group)) return;
  Promise.resolve()
    .then(() => chrome.runtime.sendMessage({ type: 'reconcile-reminders' }))
    .then(result => {
      if (result?.ok !== true) throw new Error('Reminder reconciliation failed');
    })
    .catch(() => {
      const current = identityGroupTarget(group.id);
      if (current?.group === group && State.latestActionId() === actionId) {
        toast(tr('groupEditor.duplicateReminderWarning', { name }), {
          danger: true,
          duration: 8000,
          undo: actionId,
        });
      } else {
        toast(tr('history.reminderReconcileWarning'), { danger: true, duration: 8000 });
      }
    });
}

function openGroupAll(gId) {
  const info = findGroup(gId);
  if (!info) return;
  const items = [];
  const collect = (list) => { list.forEach(it => { if (it.type === 'tab') items.push(it); else if (it.type === 'stack') collect(it.items || []); }); };
  collect(info.group.items);
  if (!items.length) return toast('No tabs to open');
  const urls = items.map(it => it.url);
  openAllHibernated(urls, items);
  toast(`Opened ${urls.length} tabs`);
}

// ════════════════════════════════════════════════════════════════
// GROUP / STACK IDENTITY EDITOR
// ════════════════════════════════════════════════════════════════
let modalCtx = null;
let modalBusy = false;
let intentEditorCtx = null;

function identityEditorPrefix() {
  return modalCtx?.entityKind === 'stack' ? 'stackEditor' : 'groupEditor';
}

function paintIdentityEditor() {
  if (!modalCtx) return;
  const prefix = identityEditorPrefix();
  const operation = modalCtx.operation;
  const isEdit = operation === 'edit';
  const isBatch = operation === 'batch-create';
  const isDuplicate = operation === 'duplicate';
  const titleKey = `${prefix}.${isBatch ? 'batchTitle' : isDuplicate ? 'duplicateTitle' : isEdit ? 'editTitle' : 'createTitle'}`;
  const confirmKey = `${prefix}.${modalBusy
    ? (isEdit ? 'saving' : isDuplicate ? 'duplicating' : 'creating')
    : (isEdit ? 'save' : isDuplicate ? 'duplicate' : 'create')}`;
  const title = document.getElementById('modal-title');
  const close = document.getElementById('modal-x');
  const symbolLabel = document.getElementById('lbl-symbol');
  const symbolHint = document.getElementById('emoji-trigger-hint');
  const symbolTrigger = document.getElementById('emoji-trigger');
  const nameLabel = document.getElementById('modal-name-label');
  const input = document.getElementById('modal-input');
  const colorLabel = document.getElementById('lbl-color');
  const description = document.getElementById('modal-description');
  const error = document.getElementById('modal-error');
  const cancel = document.getElementById('modal-cancel');
  const confirm = document.getElementById('modal-ok');
  const overlay = document.getElementById('modal-overlay');

  // An untouched generated copy name follows a live locale change. Once the
  // user types, their draft is canonical and must never be translated.
  if (isDuplicate && !modalBusy && !modalCtx.nameTouched) {
    modalCtx.draftName = tr('groupEditor.duplicateDefaultName', { name: modalCtx.sourceName });
    input.value = modalCtx.draftName;
  }

  title.dataset.i18n = titleKey;
  title.textContent = tr(titleKey);
  const closeKey = isDuplicate ? 'groupEditor.duplicateClose' : `${prefix}.close`;
  close.dataset.i18nAriaLabel = closeKey;
  close.setAttribute('aria-label', tr(closeKey));
  symbolLabel.dataset.i18n = `${prefix}.symbolLabel`;
  symbolLabel.textContent = tr(`${prefix}.symbolLabel`);
  symbolHint.dataset.i18n = `${prefix}.symbolHint`;
  symbolHint.textContent = tr(`${prefix}.symbolHint`);
  symbolTrigger.setAttribute('aria-label', tr('emojiPicker.current', { symbol: modalCtx.draftSymbol }));
  nameLabel.dataset.i18n = `${prefix}.nameLabel`;
  nameLabel.textContent = tr(`${prefix}.nameLabel`);
  input.dataset.i18nPlaceholder = `${prefix}.namePlaceholder`;
  input.placeholder = tr(`${prefix}.namePlaceholder`);
  colorLabel.dataset.i18n = `${prefix}.colorLabel`;
  colorLabel.textContent = tr(`${prefix}.colorLabel`);
  cancel.dataset.i18n = 'organization.cancel';
  cancel.textContent = tr('organization.cancel');
  confirm.dataset.i18n = confirmKey;
  confirm.textContent = tr(confirmKey);

  description.hidden = !isBatch && !isDuplicate;
  description.textContent = isBatch
    ? tr('stackEditor.batchDescription', { count: modalCtx.batchIds.length, group: modalCtx.groupName })
    : (isDuplicate
      ? tr('groupEditor.duplicateDescription', { group: modalCtx.sourceName, space: modalCtx.spaceName })
      : '');
  error.hidden = !modalCtx.errorKey;
  error.textContent = modalCtx.errorKey ? tr(modalCtx.errorKey) : '';
  const nameInvalid = modalCtx.errorKey === `${prefix}.nameRequired`;
  input.setAttribute('aria-invalid', String(nameInvalid));
  if (nameInvalid) input.setAttribute('aria-describedby', 'modal-error');
  else input.removeAttribute('aria-describedby');
  const disabled = modalBusy || !!modalCtx.unavailable;
  input.disabled = disabled;
  symbolTrigger.disabled = disabled;
  document.querySelectorAll('#color-row .csw').forEach(button => {
    button.disabled = disabled;
    const colorName = tr(`groupEditor.color.${button.dataset.colorKey}`);
    button.setAttribute('aria-label', tr('groupEditor.colorOption', { color: colorName }));
    button.title = colorName;
  });
  close.disabled = modalBusy;
  cancel.disabled = modalBusy;
  confirm.disabled = !!modalCtx.unavailable;
  confirm.setAttribute('aria-disabled', String(disabled));
  overlay.setAttribute('aria-busy', String(modalBusy));
}

function setIdentityEditorBusy(busy) {
  modalBusy = !!busy;
  paintIdentityEditor();
  if (modalBusy) document.getElementById('modal-ok')?.focus({ preventScroll: true });
}

function setIdentityEditorError(errorKey, { unavailable = false } = {}) {
  if (!modalCtx) return;
  modalCtx.errorKey = errorKey || '';
  modalCtx.unavailable = !!unavailable;
  paintIdentityEditor();
  const recovery = document.getElementById('state-recovery-overlay');
  const recoveryOwnsForeground = !!(recovery && !recovery.classList.contains('hidden'))
    || !!State.isRecoveryRequired?.();
  if (modalCtx.unavailable && !recoveryOwnsForeground) {
    const target = document.getElementById('modal-cancel') || document.getElementById('modal-x');
    try { target?.focus({ preventScroll: true }); } catch { try { target?.focus(); } catch {} }
  }
}

function clearIdentityEditorError() {
  if (!modalCtx || modalCtx.unavailable || !modalCtx.errorKey) return;
  if (modalCtx.errorKey === `${identityEditorPrefix()}.nameRequired` &&
      !document.getElementById('modal-input')?.value.trim()) return;
  modalCtx.errorKey = '';
  paintIdentityEditor();
}

function selectIdentityColor(color, { focus = false, chosen = false } = {}) {
  const requested = String(color || '#6366f1');
  const allButtons = [...document.querySelectorAll('#color-row .csw')];
  const custom = document.getElementById('identity-custom-color');
  let selected = allButtons.find(button => button !== custom && button.dataset.c === requested);
  let represented = !!selected;
  if (!selected && custom) {
    custom.hidden = false;
    custom.dataset.c = requested;
    custom.style.setProperty('--identity-custom-color', requested);
    selected = custom;
    represented = true;
  } else if (custom) {
    custom.hidden = true;
    custom.classList.remove('active');
    custom.setAttribute('aria-checked', 'false');
    custom.tabIndex = -1;
    custom.style.removeProperty('--identity-custom-color');
  }
  const buttons = allButtons.filter(button => !button.hidden);
  if (!selected) selected = buttons[0];
  buttons.forEach(button => {
    const active = button === selected;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  if (modalCtx) {
    modalCtx.draftColor = represented ? selected.dataset.c : requested;
    if (chosen) modalCtx.colorChosen = true;
  }
  if (focus && selected) selected.focus({ preventScroll: true });
  clearIdentityEditorError();
}

function handleIdentityColorKeydown(event) {
  if (!event.target.matches?.('#color-row .csw')) return false;
  const buttons = [...document.querySelectorAll('#color-row .csw')].filter(button => !button.hidden);
  const index = Math.max(0, buttons.indexOf(event.target));
  let next = index;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = buttons.length - 1;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
  else return false;
  event.preventDefault();
  event.stopPropagation();
  selectIdentityColor(buttons[next].dataset.c, { focus: true, chosen: true });
  return true;
}

function setIdentityEditorInterlock(enabled) {
  const overlay = document.getElementById('modal-overlay');
  const recovery = document.getElementById('state-recovery-overlay');
  const emoji = document.getElementById('emoji-picker');
  for (const child of document.body.children) {
    if (child === overlay || child === recovery || child === emoji) continue;
    setElementInertOwner(child, 'identity-editor', enabled);
  }
}

function focusIdentityTarget(kind, id) {
  const value = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(String(id)) : String(id).replace(/["\\]/g, '\\$&');
  const detail = document.getElementById('item-detail');
  const selectors = kind === 'group'
    ? [`.gcol[data-gid="${value}"] .gcol-toggle`, `.lv-group[data-gid="${value}"] .lv-group-toggle`]
    : [
        detail?.dataset.itemId === String(id) ? '#item-detail [data-idp-focus="stack-identity"]' : '',
        `.item.stack[data-id="${value}"] .stack-toggle`,
        `.lv-stack[data-id="${value}"] .lv-stack-toggle`,
      ];
  for (const selector of selectors) {
    if (!selector) continue;
    const target = document.querySelector(selector);
    if (!target || typeof target.focus !== 'function') continue;
    try { target.focus({ preventScroll: true }); } catch { try { target.focus(); } catch {} }
    if (document.activeElement === target) {
      try { target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); } catch {}
      return true;
    }
  }
  return false;
}

function focusIdentityFallback(ctx) {
  if (ctx?.operation === 'edit' || ctx?.operation === 'duplicate') {
    if (focusIdentityTarget(ctx.entityKind, ctx.entityId)) return true;
  }
  const batchAction = ctx?.operation === 'batch-create'
    ? document.querySelector('#item-sel-toolbar [data-act="stack"]')
    : null;
  if (batchAction) {
    try { batchAction.focus({ preventScroll: true }); } catch { try { batchAction.focus(); } catch {} }
    if (document.activeElement === batchAction) return true;
  }
  if (ctx?.entityKind === 'stack' && ctx.groupId && focusIdentityTarget('group', ctx.groupId)) return true;
  const candidates = [
    document.querySelector('.lv-add-row'),
    document.querySelector('.add-col-btn'),
    document.getElementById('board'),
  ];
  for (const target of candidates) {
    if (!target || typeof target.focus !== 'function') continue;
    try { target.focus({ preventScroll: true }); } catch { try { target.focus(); } catch {} }
    if (document.activeElement === target) return true;
  }
  return false;
}

function closeIdentityEditor({ restoreFocus = true } = {}) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay || overlay.classList.contains('hidden') || modalBusy) return false;
  const closingCtx = modalCtx;
  if (emojiPickerCtx?.target?.kind === 'identity-editor') closeEmojiPicker({ restoreFocus: false });
  overlay.classList.add('hidden');
  unlockBodyScroll();
  setIdentityEditorInterlock(false);
  modalCtx = null;
  modalBusy = false;
  const restored = restoreFocus ? restoreOpener(overlay) : (_overlayOpeners.delete(overlay), false);
  if (restoreFocus && !restored) setTimeout(() => focusIdentityFallback(closingCtx), 0);
  return true;
}

function closeModal() {
  return closeIdentityEditor();
}

function prepareIdentityBatch(itemIds) {
  const ids = [...new Set((itemIds || []).map(String))];
  if (ids.length < 2) return { errorKey: 'stackEditor.minimumSelection' };
  const resolved = identityItemTargets(ids);
  if (!resolved) return { errorKey: 'stackEditor.selectionUnavailable' };
  const uniqueParents = resolved.targets.every(target => {
    const group = identityGroupTarget(target.group.id);
    if (!group || group.group !== target.group) return false;
    return target.ancestorStackIds.every(ancestorId => {
      const ancestor = identityItemTargets([ancestorId])?.targets[0];
      return !!ancestor && ancestor.item.type === 'stack';
    });
  });
  if (!uniqueParents) return { errorKey: 'stackEditor.selectionUnavailable' };
  if (resolved.nested) return { errorKey: 'stackEditor.selectionNested' };
  const spaces = new Set(resolved.targets.map(target => `${target.workspace.id}:${target.space.id}`));
  if (spaces.size !== 1) return { errorKey: 'stackEditor.selectionScope' };
  const destination = resolved.targets.find(target => String(target.item.id) === ids[0]);
  return { resolved, destination };
}

function rejectIdentityEditorOpen(errorKey, fallbackCtx = null) {
  toast(tr(errorKey), { danger: true, duration: 6000 });
  if (fallbackCtx) setTimeout(() => focusIdentityFallback(fallbackCtx), 0);
  return false;
}

function openIdentityEditor(entityKind, operation, params = {}, opener) {
  const overlay = document.getElementById('modal-overlay');
  const recovery = document.getElementById('state-recovery-overlay');
  const organizationName = document.getElementById('organization-name-overlay');
  const organizationDelete = document.getElementById('organization-delete-overlay');
  if (!overlay || !overlay.classList.contains('hidden')) return false;
  if ((recovery && !recovery.classList.contains('hidden')) ||
      (organizationName && !organizationName.classList.contains('hidden')) ||
      (organizationDelete && !organizationDelete.classList.contains('hidden'))) return false;

  // Context-menu items disappear before their action runs. Move focus back to
  // the durable surface opener even when validation rejects the requested edit.
  focusDialogOpener(opener);
  const rejectionFallback = opener && (opener.isConnected === false || document.activeElement !== opener)
    ? {
        entityKind,
        operation,
        entityId: params.groupId || params.stackId || '',
        groupId: params.groupId || '',
      }
    : null;
  let next = null;
  if (entityKind === 'group' && operation === 'create') {
    const target = identitySpaceTarget(params.workspaceId, params.spaceId);
    if (!target) return rejectIdentityEditorOpen('groupEditor.parentUnavailable', rejectionFallback);
    next = {
      entityKind, operation,
      workspaceId: target.workspace.id,
      spaceId: target.space.id,
      draftName: '', draftSymbol: '📁', draftColor: '#6366f1', nameTouched: false, colorChosen: false,
    };
  } else if (entityKind === 'group' && operation === 'duplicate') {
    const target = identityGroupTarget(params.groupId);
    const state = State.get();
    if (!target || (params.workspaceId && target.workspace.id !== params.workspaceId) ||
        (params.spaceId && target.space.id !== params.spaceId) ||
        state.activeWsId !== target.workspace.id || target.workspace.activeCatId !== target.space.id) {
      return rejectIdentityEditorOpen('groupEditor.unavailable', rejectionFallback);
    }
    const fields = identityFields(target.group);
    next = {
      entityKind, operation, entityId: target.group.id,
      workspaceId: target.workspace.id, spaceId: target.space.id,
      sourceName: fields.name, spaceName: String(target.space.name || ''),
      openedFromGroupPage: typeof activeGroupPage !== 'undefined'
        && activeGroupPage?.groupId === target.group.id,
      baseline: identityGroupDuplicateFingerprint(target),
      draftName: tr('groupEditor.duplicateDefaultName', { name: fields.name }),
      draftSymbol: fields.symbol || '??', draftColor: fields.color,
      nameTouched: false, colorChosen: false,
    };
  } else if (entityKind === 'group' && operation === 'edit') {
    const target = identityGroupTarget(params.groupId);
    if (!target || (params.workspaceId && target.workspace.id !== params.workspaceId) ||
        (params.spaceId && target.space.id !== params.spaceId)) return rejectIdentityEditorOpen('groupEditor.unavailable', rejectionFallback);
    const fields = identityFields(target.group);
    next = {
      entityKind, operation, entityId: target.group.id,
      workspaceId: target.workspace.id, spaceId: target.space.id,
      baseline: identityFieldsFingerprint(target.group),
      draftName: fields.name, draftSymbol: fields.symbol || '📁', draftColor: fields.color, nameTouched: false, colorChosen: false,
    };
  } else if (entityKind === 'stack' && operation === 'create') {
    const target = identityGroupTarget(params.groupId);
    if (!target || (params.workspaceId && target.workspace.id !== params.workspaceId) ||
        (params.spaceId && target.space.id !== params.spaceId)) return rejectIdentityEditorOpen('stackEditor.parentUnavailable', rejectionFallback);
    next = {
      entityKind, operation,
      workspaceId: target.workspace.id, spaceId: target.space.id, groupId: target.group.id,
      draftName: '', draftSymbol: '📚', draftColor: '#6366f1', nameTouched: false, colorChosen: false,
    };
  } else if (entityKind === 'stack' && operation === 'edit') {
    const target = identityStackTarget(params.stackId);
    if (!target || (params.workspaceId && target.workspace.id !== params.workspaceId) ||
        (params.spaceId && target.space.id !== params.spaceId) ||
        (params.groupId && target.group.id !== params.groupId)) return rejectIdentityEditorOpen('stackEditor.unavailable', rejectionFallback);
    const fields = identityFields(target.item);
    next = {
      entityKind, operation, entityId: target.item.id,
      workspaceId: target.workspace.id, spaceId: target.space.id, groupId: target.group.id,
      parentKey: target.parentKey,
      baseline: identityFieldsFingerprint(target.item),
      draftName: fields.name, draftSymbol: fields.symbol || '📚', draftColor: fields.color, nameTouched: false, colorChosen: false,
    };
  } else if (entityKind === 'stack' && operation === 'batch-create') {
    const prepared = prepareIdentityBatch(params.itemIds);
    if (prepared.errorKey) {
      return rejectIdentityEditorOpen(prepared.errorKey, rejectionFallback);
    }
    const targets = prepared.resolved.targets;
    const first = prepared.destination;
    next = {
      entityKind, operation,
      workspaceId: first.workspace.id, spaceId: first.space.id, groupId: first.group.id,
      groupName: first.group.name,
      batchIds: targets.map(target => String(target.item.id)),
      batchBaseline: identitySelectionFingerprint(targets),
      draftName: '', draftSymbol: '📚', draftColor: '#6366f1', nameTouched: false, colorChosen: false,
    };
  }
  if (!next) return false;

  rememberOpener(overlay);
  modalCtx = next;
  modalBusy = false;
  document.getElementById('modal-input').value = next.draftName;
  document.getElementById('emoji-trigger-val').textContent = next.draftSymbol;
  selectIdentityColor(next.draftColor);
  paintIdentityEditor();
  setIdentityEditorInterlock(true);
  overlay.classList.remove('hidden');
  lockBodyScroll();
  setTimeout(() => {
    const target = params.focusField === 'symbol'
      ? document.getElementById('emoji-trigger')
      : document.getElementById('modal-input');
    target?.focus({ preventScroll: true });
    if (operation === 'duplicate' && target === document.getElementById('modal-input')
        && typeof target.select === 'function') target.select();
  }, 0);
  return true;
}

function handleIdentityEditorKeydown(event) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay || overlay.classList.contains('hidden')) return false;
  if (handleIdentityColorKeydown(event)) return true;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    if (!modalBusy) closeIdentityEditor();
    return true;
  }
  if (event.key === 'Tab') trapTabKey(event, overlay);
  if (event.key === 'Enter' && event.target === document.getElementById('modal-input')) {
    event.preventDefault();
    void confirmIdentityEditor();
  }
  event.stopPropagation();
  return true;
}

function handleIdentityEditorGlobalKey(event) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay || overlay.classList.contains('hidden') || overlay.contains(event.target)) return false;
  const emoji = document.getElementById('emoji-picker');
  const recovery = document.getElementById('state-recovery-overlay');
  if ((emoji && !emoji.classList.contains('hidden') && emoji.contains(event.target)) ||
      (recovery && !recovery.classList.contains('hidden') && recovery.contains(event.target))) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.key === 'Escape' && !modalBusy) closeIdentityEditor();
  return true;
}
function openIntentEditor(targetKind, targetId) {
  let entity = null;
  let title = 'Edit Intention';
  if (targetKind === 'group') {
    const info = findGroup(targetId);
    if (!info) return;
    entity = info.group;
    title = `Intention · ${info.group.name}`;
  } else if (targetKind === 'stack') {
    const info = findItem(targetId);
    if (!info || info.item.type !== 'stack') return;
    entity = info.item;
    title = `Intention · ${info.item.name || 'Stack'}`;
  }
  intentEditorCtx = { targetKind, targetId };
  const intent = entity.intent || {};
  document.getElementById('intent-title').textContent = title;
  document.getElementById('intent-purpose').value = intent.purpose || '';
  document.getElementById('intent-next-action').value = intent.nextAction || '';
  document.getElementById('intent-status').value = intent.status || 'active';
  document.getElementById('intent-type').value = intent.type || 'other';
  document.getElementById('intent-overlay').classList.remove('hidden');
}
function closeIntentEditor() {
  document.getElementById('intent-overlay').classList.add('hidden');
  intentEditorCtx = null;
}
function getIntentTarget(ctx = intentEditorCtx) {
  if (!ctx) return null;
  if (ctx.targetKind === 'group') return findGroup(ctx.targetId)?.group || null;
  if (ctx.targetKind === 'stack') {
    const info = findItem(ctx.targetId);
    if (info?.item?.type === 'stack') return info.item;
  }
  return null;
}
function saveIntentEditor() {
  const entity = getIntentTarget();
  if (!entity) return closeIntentEditor();
  const purpose = document.getElementById('intent-purpose').value.trim();
  const nextAction = document.getElementById('intent-next-action').value.trim();
  const status = document.getElementById('intent-status').value;
  const type = document.getElementById('intent-type').value;
  State.snapshot('Edit intention');
  if (!purpose && !nextAction && status === 'active' && type === 'other') clearIntentMeta(entity);
  else {
    const i = ensureIntentMeta(entity);
    i.purpose = purpose;
    i.nextAction = nextAction;
    i.status = INTENT_STATUS.includes(status) ? status : 'active';
    i.type = INTENT_TYPE.includes(type) ? type : 'other';
    i.updatedAt = Date.now();
  }
  State.persist();
  renderBoard();
  closeIntentEditor();
  toast('Intention saved');
}
function clearIntentEditor() {
  const entity = getIntentTarget();
  if (!entity) return closeIntentEditor();
  State.snapshot('Clear intention');
  clearIntentMeta(entity);
  State.persist();
  renderBoard();
  closeIntentEditor();
  toast('Intention cleared', { undo: true });
}
async function confirmIdentityEditor() {
  if (!modalCtx || modalBusy) return false;
  const ctx = modalCtx;
  const prefix = identityEditorPrefix();
  const input = document.getElementById('modal-input');
  let name = input.value.trim();
  const symbol = String(ctx.draftSymbol || (ctx.entityKind === 'stack' ? '📚' : '📁'));
  const color = String(ctx.draftColor || '#6366f1');
  ctx.draftName = input.value;
  if (!name && (ctx.operation !== 'edit' || ctx.nameTouched)) {
    setIdentityEditorError(`${prefix}.nameRequired`);
    input.focus({ preventScroll: true });
    return false;
  }

  let target = null;
  let batchTargets = null;
  let duplicatedGroup = null;
  let duplicateLayout = null;
  let sourceIndex = -1;
  if (ctx.entityKind === 'group' && ctx.operation === 'create') {
    target = identitySpaceTarget(ctx.workspaceId, ctx.spaceId);
    if (!target) {
      setIdentityEditorError('groupEditor.parentUnavailable', { unavailable: true });
      return false;
    }
  } else if (ctx.entityKind === 'group' && ctx.operation === 'duplicate') {
    target = identityGroupTarget(ctx.entityId);
    const state = State.get();
    if (!target || target.workspace.id !== ctx.workspaceId || target.space.id !== ctx.spaceId ||
        state.activeWsId !== ctx.workspaceId || target.workspace.activeCatId !== ctx.spaceId) {
      setIdentityEditorError('groupEditor.unavailable', { unavailable: true });
      return false;
    }
    sourceIndex = target.space.groups.indexOf(target.group);
    if (sourceIndex < 0) {
      setIdentityEditorError('groupEditor.unavailable', { unavailable: true });
      return false;
    }
    const currentBaseline = identityGroupDuplicateFingerprint(target);
    if (currentBaseline !== ctx.baseline) {
      const fields = identityFields(target.group);
      ctx.baseline = currentBaseline;
      ctx.sourceName = fields.name;
      ctx.spaceName = String(target.space.name || '');
      if (!ctx.nameTouched) {
        ctx.draftName = tr('groupEditor.duplicateDefaultName', { name: fields.name });
        input.value = ctx.draftName;
      } else {
        ctx.draftName = input.value;
      }
      if (!ctx.symbolChosen) ctx.draftSymbol = fields.symbol || '??';
      if (!ctx.colorChosen) ctx.draftColor = fields.color;
      document.getElementById('emoji-trigger-val').textContent = ctx.draftSymbol;
      selectIdentityColor(ctx.draftColor);
      setIdentityEditorError('groupEditor.duplicateChanged');
      input.focus({ preventScroll: true });
      return false;
    }
  } else if (ctx.entityKind === 'group' && ctx.operation === 'edit') {
    target = identityGroupTarget(ctx.entityId);
    if (!target || target.workspace.id !== ctx.workspaceId || target.space.id !== ctx.spaceId) {
      setIdentityEditorError('groupEditor.unavailable', { unavailable: true });
      return false;
    }
    const currentBaseline = identityFieldsFingerprint(target.group);
    if (currentBaseline !== ctx.baseline) {
      const fields = identityFields(target.group);
      ctx.baseline = currentBaseline;
      ctx.draftName = fields.name;
      ctx.draftSymbol = fields.symbol || '📁';
      ctx.draftColor = fields.color;
      ctx.nameTouched = false;
      ctx.symbolChosen = false;
      ctx.colorChosen = false;
      input.value = ctx.draftName;
      document.getElementById('emoji-trigger-val').textContent = ctx.draftSymbol;
      selectIdentityColor(ctx.draftColor);
      setIdentityEditorError('groupEditor.changed');
      input.focus({ preventScroll: true });
      return false;
    }
    if (!ctx.nameTouched) name = String(target.group.name || '');
    const nameUnchanged = !ctx.nameTouched || name === String(target.group.name || '');
    const symbolUnchanged = !ctx.symbolChosen || symbol === String(target.group.symbol || '');
    const colorUnchanged = !ctx.colorChosen || color === String(target.group.color || '');
    if (nameUnchanged && symbolUnchanged && colorUnchanged) {
      closeIdentityEditor();
      return true;
    }
  } else if (ctx.entityKind === 'stack' && ctx.operation === 'create') {
    target = identityGroupTarget(ctx.groupId);
    if (!target || target.workspace.id !== ctx.workspaceId || target.space.id !== ctx.spaceId) {
      setIdentityEditorError('stackEditor.parentUnavailable', { unavailable: true });
      return false;
    }
  } else if (ctx.entityKind === 'stack' && ctx.operation === 'edit') {
    target = identityStackTarget(ctx.entityId);
    if (!target || target.workspace.id !== ctx.workspaceId || target.space.id !== ctx.spaceId ||
        target.group.id !== ctx.groupId || target.parentKey !== ctx.parentKey) {
      setIdentityEditorError('stackEditor.unavailable', { unavailable: true });
      return false;
    }
    const currentBaseline = identityFieldsFingerprint(target.item);
    if (currentBaseline !== ctx.baseline) {
      const fields = identityFields(target.item);
      ctx.baseline = currentBaseline;
      ctx.draftName = fields.name;
      ctx.draftSymbol = fields.symbol || '📚';
      ctx.draftColor = fields.color;
      ctx.nameTouched = false;
      ctx.symbolChosen = false;
      ctx.colorChosen = false;
      input.value = ctx.draftName;
      document.getElementById('emoji-trigger-val').textContent = ctx.draftSymbol;
      selectIdentityColor(ctx.draftColor);
      setIdentityEditorError('stackEditor.changed');
      input.focus({ preventScroll: true });
      return false;
    }
    if (!ctx.nameTouched) name = String(target.item.name || '');
    const nameUnchanged = !ctx.nameTouched || name === String(target.item.name || '');
    const symbolUnchanged = !ctx.symbolChosen || symbol === String(target.item.symbol || '');
    const colorUnchanged = !ctx.colorChosen || color === String(target.item.color || '');
    if (nameUnchanged && symbolUnchanged && colorUnchanged) {
      closeIdentityEditor();
      return true;
    }
  } else if (ctx.entityKind === 'stack' && ctx.operation === 'batch-create') {
    const prepared = prepareIdentityBatch(ctx.batchIds);
    batchTargets = prepared.resolved?.targets || null;
    if (prepared.errorKey || !batchTargets || identitySelectionFingerprint(batchTargets) !== ctx.batchBaseline) {
      setIdentityEditorError('stackEditor.selectionUnavailable', { unavailable: true });
      return false;
    }
    target = identityGroupTarget(ctx.groupId);
    if (!target || target.workspace.id !== ctx.workspaceId || target.space.id !== ctx.spaceId) {
      setIdentityEditorError('stackEditor.parentUnavailable', { unavailable: true });
      return false;
    }
  } else {
    return false;
  }

  let entityId = ctx.entityId || null;
  if (ctx.operation !== 'edit') {
    try {
      const allocateId = createOrganizationIdAllocator();
      if (ctx.operation === 'duplicate') {
        duplicatedGroup = cloneGroupForDuplicate(target.group, allocateId);
        entityId = duplicatedGroup.id;
        duplicatedGroup.name = name;
        if (ctx.symbolChosen) duplicatedGroup.symbol = symbol;
        if (ctx.colorChosen) duplicatedGroup.color = color;
        duplicateLayout = prepareGroupDuplicateLayout(State.get(), target.space, {
          sourceId: target.group.id,
          group: duplicatedGroup,
        });
      } else {
        entityId = allocateId();
      }
    } catch {
      setIdentityEditorError(ctx.operation === 'duplicate'
        ? 'groupEditor.duplicateIdUnavailable'
        : `${prefix}.idUnavailable`);
      return false;
    }
  }

  const count = batchTargets?.length || 0;
  const historyKey = ctx.operation === 'batch-create'
    ? 'stackEditor.batchHistory'
    : (ctx.operation === 'duplicate'
      ? 'groupEditor.duplicateHistory'
      : `${prefix}.${ctx.operation === 'edit' ? 'editHistory' : 'createHistory'}`);
  setIdentityEditorBusy(true);
  const actionId = State.snapshot(tr(historyKey, { name, count, source: ctx.sourceName }));
  const state = State.get();
  state.activeWsId = ctx.workspaceId;
  const workspace = state.workspaces.find(candidate => candidate.id === ctx.workspaceId);
  if (workspace) workspace.activeCatId = ctx.spaceId;

  if (ctx.entityKind === 'group' && ctx.operation === 'create') {
    target.space.groups.push({
      id: entityId, name, symbol, color, collapsed: false, items: [],
    });
  } else if (ctx.entityKind === 'group' && ctx.operation === 'duplicate') {
    target.space.groups.splice(sourceIndex + 1, 0, duplicatedGroup);
    applyGroupDuplicateLayout(state, target.space, {
      sourceId: target.group.id,
      group: duplicatedGroup,
    }, duplicateLayout);
  } else if (ctx.entityKind === 'group' && ctx.operation === 'edit') {
    if (ctx.nameTouched) target.group.name = name;
    if (ctx.symbolChosen) target.group.symbol = symbol;
    if (ctx.colorChosen) target.group.color = color;
  } else if (ctx.entityKind === 'stack' && ctx.operation === 'create') {
    target.group.items.push(stampNew({
      id: entityId, type: 'stack', name, symbol, color, expanded: true, items: [],
    }));
  } else if (ctx.entityKind === 'stack' && ctx.operation === 'edit') {
    if (ctx.nameTouched) target.item.name = name;
    if (ctx.symbolChosen) target.item.symbol = symbol;
    if (ctx.colorChosen) target.item.color = color;
  } else if (ctx.operation === 'batch-create') {
    const moved = [];
    for (let index = ctx.batchIds.length - 1; index >= 0; index -= 1) {
      const current = identityItemTargets([ctx.batchIds[index]])?.targets[0];
      if (current) moved.unshift(...current.parentItems.splice(current.index, 1));
    }
    target.group.items.unshift(stampNew({
      id: entityId, type: 'stack', name, symbol, color, expanded: true, items: moved,
    }));
  }
  if (ctx.symbolChosen) rememberRecentEmoji(symbol);

  try {
    await State.persistNow();
  } catch (error) {
    // The persistence layer owns fail-closed recovery. Keep the dirty graph
    // behind it, and do not render, close, retry, or claim success here.
    if (State.isRecoveryRequired?.() && typeof showStateRecoveryRequired === 'function') {
      showStateRecoveryRequired(error);
    }
    setIdentityEditorBusy(false);
    setIdentityEditorError(ctx.operation === 'duplicate'
      ? 'groupEditor.duplicateRecoveryRequired'
      : `${prefix}.recoveryRequired`, { unavailable: true });
    return false;
  }

  if (ctx.operation === 'batch-create') {
    selectedItemIds.clear();
    explicitSelMode = false;
    lastSelectedItemId = null;
    syncItemSelMode();
    document.getElementById('item-sel-toolbar')?.remove();
  }
  if (ctx.operation === 'duplicate' && ctx.openedFromGroupPage && typeof Router !== 'undefined') {
    Router.navigate({
      type: 'group', wsId: ctx.workspaceId, groupId: entityId, itemId: null, query: {},
    }, { persist: false });
  } else {
    renderAll();
  }
  modalBusy = false;
  closeIdentityEditor({ restoreFocus: false });
  requestAnimationFrame(() => {
    if (!focusIdentityTarget(ctx.entityKind, entityId)) focusIdentityFallback(ctx);
  });
  const successKey = ctx.operation === 'batch-create'
    ? 'stackEditor.stacked'
    : (ctx.operation === 'duplicate'
      ? 'groupEditor.duplicated'
      : `${prefix}.${ctx.operation === 'edit' ? 'updated' : 'created'}`);
  toast(tr(successKey, { name, count, source: ctx.sourceName }), { undo: actionId });
  if (ctx.operation === 'duplicate') {
    reconcileDuplicatedGroupReminders(duplicatedGroup, name, actionId);
  }
  return true;
}

// ════════════════════════════════════════════════════════════════
// OPEN-TABS SIDEBAR + Multi-select + Window grouping
// ════════════════════════════════════════════════════════════════
let allOpenTabs = [];
let currentActiveTabId = null;
let selectedTabIds = new Set();
let lastClickedTabId = null;

function openTabSelectionOrder() {
  const visibleRows = Array.from(document.querySelectorAll('#open-tabs .otab:not(.hidden)'));
  const visibleIds = visibleRows.map(el => Number(el.dataset.tid)).filter(Number.isFinite);
  return visibleIds.length ? visibleIds : allOpenTabs.map(t => t.id);
}

function selectOpenTabRangeTo(tabId) {
  if (lastClickedTabId == null) lastClickedTabId = tabId;
  let order = openTabSelectionOrder();
  let aI = order.indexOf(lastClickedTabId);
  let bI = order.indexOf(tabId);
  if (aI < 0 || bI < 0) {
    order = allOpenTabs.map(t => t.id);
    aI = order.indexOf(lastClickedTabId);
    bI = order.indexOf(tabId);
  }
  if (aI < 0 || bI < 0) {
    selectedTabIds.add(tabId);
    lastClickedTabId = tabId;
    return;
  }
  const [lo, hi] = aI < bI ? [aI, bI] : [bI, aI];
  for (let k = lo; k <= hi; k++) selectedTabIds.add(order[k]);
}

function toggleOpenTabSelection(tabId, { range = false } = {}) {
  if (range) {
    selectOpenTabRangeTo(tabId);
  } else {
    if (selectedTabIds.has(tabId)) selectedTabIds.delete(tabId);
    else selectedTabIds.add(tabId);
    lastClickedTabId = selectedTabIds.size ? tabId : null;
  }
  updateSelectedBadge();
  renderOpenTabs();
}

async function refreshOpenTabs() {
  try {
    const [activeArr, all] = await Promise.all([
      chrome.tabs.query({ active: true, currentWindow: true }),
      chrome.tabs.query({ currentWindow: true })  // Current window only for sidebar
    ]);
    allOpenTabs = all.filter(t => !isProto(t.url));
    currentActiveTabId = activeArr[0]?.id;
    document.getElementById('open-count').textContent = allOpenTabs.length;
    renderOpenTabs();
  } catch (e) { console.warn('refreshOpenTabs', e); }
}

function renderOpenTabs() {
  const $el = document.getElementById('open-tabs');
  const scrollPos = $el.scrollTop;
  $el.innerHTML = '';

  // Clean stale selections
  const validIds = new Set(allOpenTabs.map(t => t.id));
  for (const id of [...selectedTabIds]) if (!validIds.has(id)) selectedTabIds.delete(id);
  // Drop the shift-range anchor once nothing is selected so the next
  // shift-click starts a fresh range instead of spanning from a stale tab.
  if (!selectedTabIds.size) lastClickedTabId = null;

  if (!allOpenTabs.length) {
    $el.innerHTML = `<div class="otab-empty">No saveable tabs in this window.</div>`;
    return;
  }

  allOpenTabs.forEach(t => {
    const el = document.createElement('div');
    el.className = 'otab';
    el.dataset.tid = t.id;
    if (t.id === currentActiveTabId) el.classList.add('active-tab');
    if (selectedTabIds.has(t.id)) el.classList.add('selected');
    el.draggable = true;
    el.title = t.title || t.url;
    const fav = favUrl(t.url) || BLANK_FAV;
    // Chrome-discarded tabs keep their URL but are unloaded — flag them so the
    // sidebar reads like a workspace of live + resting tabs, not a flat list.
    const sleeping = t.discarded === true;
    const badge = sleeping
      ? `<span class="folio-badge is-hibernated" title="Asleep — reloads when you open it"><svg viewBox="0 0 14 14" fill="none"><path d="M11.5 8.2A4.6 4.6 0 015.8 2.5a4.6 4.6 0 105.7 5.7z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>asleep</span>`
      : '';
    const domain = (() => { try { return new URL(t.url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
    el.innerHTML = `
      <span class="otab-handle" aria-hidden="true"><svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor"><circle cx="2" cy="2" r="1"/><circle cx="6" cy="2" r="1"/><circle cx="2" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="2" cy="10" r="1"/><circle cx="6" cy="10" r="1"/></svg></span>
      <span class="otab-check" role="checkbox" tabindex="0" aria-checked="${selectedTabIds.has(t.id)}" aria-label="Select tab"></span>
      <img class="otab-fav" src="${esc(fav)}" alt="" loading="lazy" decoding="async">
      <span class="otab-text">
        <span class="otab-title">${esc(t.title || t.url)}</span>
        <span class="otab-domain">${esc(domain)}</span>
      </span>${badge}
      <button class="otab-close" title="Close tab" aria-label="Close tab"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button>`;

    // Checkbox area click — toggles selection without switching tab
    const tabCheck = el.querySelector('.otab-check');
    tabCheck.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleOpenTabSelection(t.id, { range: e.shiftKey });
    });
    tabCheck.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        toggleOpenTabSelection(t.id, { range: e.shiftKey });
      }
    });

    // Close button — closes the browser tab without switching to it
    el.querySelector('.otab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.remove(t.id).catch(() => {});
    });

    el.addEventListener('click', (e) => {
      // Ignore clicks that happen to be on the check
      if (e.target.closest('.otab-check')) return;

      if (e.shiftKey) {
        toggleOpenTabSelection(t.id, { range: true });
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        toggleOpenTabSelection(t.id);
        return;
      }
      // In selection mode: click to add/toggle, not switch
      if (selectedTabIds.size > 0) {
        toggleOpenTabSelection(t.id);
        return;
      }
      // Plain click → switch tab
      lastClickedTabId = t.id;
      chrome.tabs.update(t.id, { active: true }).catch(()=>{});
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const batch = selectedTabIds.has(t.id) && selectedTabIds.size > 1;
      showContextMenu(e.pageX, e.pageY, [
        { text:'Switch to tab', icon: cmIcons.open, action: () => chrome.tabs.update(t.id, { active: true }) },
        { text: selectedTabIds.has(t.id) ? 'Deselect' : 'Select', icon: cmIcons.edit, action: () => toggleOpenTabSelection(t.id) },
        batch ? { text:`Save ${selectedTabIds.size} selected as new group`, icon: cmIcons.stack, action: () => saveSelectedAsGroup() } : null,
        { sep: true },
        { text: batch ? `Save ${selectedTabIds.size} tabs to Inbox` : 'Save to Inbox', icon: cmIcons.archive, action: () => batch ? saveSelectedToInbox() : saveTabToInbox(t) },
        { text: batch ? `Close ${selectedTabIds.size} tabs` : 'Close tab', icon: cmIcons.delete, danger:true, action: () => { if (batch) { for (const id of selectedTabIds) chrome.tabs.remove(id).catch(()=>{}); selectedTabIds.clear(); updateSelectedBadge(); } else chrome.tabs.remove(t.id); } }
      ].filter(Boolean));
    });

    // ── DRAG ── Promote to multi-drag if the dragged tab is selected
    el.addEventListener('dragstart', (e) => {
      let inBatch = selectedTabIds.has(t.id) && selectedTabIds.size > 1;
      // If user starts dragging an unselected tab while a batch exists, keep it single
      if (inBatch) {
        const tabs = allOpenTabs.filter(x => selectedTabIds.has(x.id));
        drag = { kind: 'tabs-multi', data: tabs.map(x => ({ tabId: x.id, title: x.title, url: x.url, fav: x.favIconUrl })) };
        // Mark all selected tabs as dragging visually
        document.querySelectorAll('.otab.selected').forEach(x => x.classList.add('dragging'));
        // Custom drag image showing count
        try {
          const ghost = document.createElement('div');
          ghost.className = 'multi-drag-ghost';
          ghost.textContent = `${tabs.length} tabs`;
          document.body.appendChild(ghost);
          ghost.style.position = 'absolute';
          ghost.style.left = '-9999px';
          e.dataTransfer.setDragImage(ghost, 40, 15);
          setTimeout(() => ghost.remove(), 0);
        } catch {}
      } else {
        drag = { kind:'tab', data: { tabId:t.id, title:t.title, url:t.url, fav:t.favIconUrl } };
        el.classList.add('dragging');
        // Custom compact drag image (favicon + title, no checkbox) so the
        // browser doesn't fall back to a full snapshot of the row — that
        // snapshot duplicated the checkbox and overlapped whatever it was
        // dragged over, reading as two overlapping selection boxes.
        try {
          const ghost = document.createElement('div');
          ghost.className = 'single-drag-ghost';
          const favImg = document.createElement('img');
          favImg.src = favUrl(t.url) || BLANK_FAV;
          ghost.appendChild(favImg);
          const label = document.createElement('span');
          label.textContent = t.title || t.url;
          ghost.appendChild(label);
          document.body.appendChild(ghost);
          ghost.style.position = 'absolute';
          ghost.style.left = '-9999px';
          e.dataTransfer.setDragImage(ghost, 14, 14);
          setTimeout(() => ghost.remove(), 0);
        } catch {}
      }
      e.dataTransfer.effectAllowed = 'copyMove';
      try { e.dataTransfer.setData('text/plain', t.url); } catch {}
    });
    el.addEventListener('dragend', () => {
      document.querySelectorAll('.otab.dragging').forEach(x => x.classList.remove('dragging'));
      document.querySelectorAll('.dragover, .drop-target').forEach(x => { x.classList.remove('dragover'); x.classList.remove('drop-target'); });
      document.querySelectorAll('.drag-ghost').forEach(x => x.remove());
      drag = null;
    });

    $el.appendChild(el);
  });
  applyFilter();
  $el.scrollTop = scrollPos;
}
function updateSelectedBadge() {
  const b = document.getElementById('selected-badge');
  if (selectedTabIds.size) {
    b.innerHTML = `
      <span class="sel-count">${selectedTabIds.size}</span>
      <span class="sel-lbl">selected</span>
      <button class="sel-act" data-act="save" title="Save as group">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2h7l2 2v7H2V2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
      </button>
      <button class="sel-act" data-act="inbox" title="Save to Inbox">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v7m0 0l-2-2m2 2l2-2M2 8v2h8V8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="sel-act" data-act="clear" title="Clear selection">
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>`;
    b.classList.remove('hidden');
    b.querySelectorAll('.sel-act').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'save') saveSelectedAsGroup();
        else if (act === 'inbox') saveSelectedToInbox();
        else if (act === 'clear') { selectedTabIds.clear(); lastClickedTabId = null; updateSelectedBadge(); renderOpenTabs(); }
      };
    });
  } else {
    b.classList.add('hidden');
  }
}

async function saveSelectedToInbox() {
  const tabs = allOpenTabs.filter(t => selectedTabIds.has(t.id));
  if (!tabs.length) return;
  const cat = activeCat(); if (!cat) return;
  const actionId = State.snapshot(`Save ${tabs.length} to inbox`);
  let inbox = cat.groups.find(g => g.name === 'Inbox');
  if (!inbox) { inbox = { id: uid(), name:'Inbox', symbol:'📥', color:'#6366f1', collapsed:false, items:[] }; cat.groups.unshift(inbox); }
  let added = 0;
  const savedTabs = [];
  for (const t of tabs) {
    if (captureDuplicateExists(inbox, t.url)) continue;
    const meta = captureTabFields(t);
    inbox.items.push(stampNew({ id: uid(), type:'tab', title: meta.title, url: t.url, fav: meta.fav }));
    added++;
    savedTabs.push(t);
  }
  if (!added) {
    State.rollbackSnapshot(actionId);
    toast('Already saved', { danger: true });
    return;
  }
  const result = await commitCapturedTabs(savedTabs, { actionId });
  if (!result) return;
  selectedTabIds.clear();
  renderBoard(); updateSelectedBadge();
  toastCaptureResult(`Saved ${added} to Inbox`, result);
}

let captureCommitPending = false;

async function commitCapturedTabs(tabsToClose = [], options = {}) {
  const actionId = options.actionId ?? State.latestActionId();
  if (captureCommitPending) {
    State.rollbackSnapshot(actionId);
    renderAll();
    toast('Another save is still being confirmed — your tabs were left open', { danger: true, duration: 5000 });
    return false;
  }
  captureCommitPending = true;
  if (!State.beginCaptureAction(actionId)) {
    captureCommitPending = false;
    toast('Save could not start safely — your tabs were left open', { danger: true, duration: 5000 });
    return false;
  }
  try {
    let captureWriteDataToken = State.dataMutationToken();
    try {
      // A captured tab is not considered saved until chrome.storage confirms the
      // write. Closing first can destroy the only recoverable copy on quota or
      // extension-shutdown failures.
      const persistence = State.persistNow();
      captureWriteDataToken = State.dataMutationToken();
      await persistence;
    } catch (error) {
      let recovered = false;
      let acceptedWithoutReceipt = false;
      let laterEditsRemain = State.dataMutationToken() !== captureWriteDataToken;
      if (laterEditsRemain) {
        showStateRecoveryRequired(new Error('Save was not confirmed. Your tabs stayed open and later edits remain visible. Reload the latest saved data before continuing.'));
      } else {
        try {
          await restoreAuthoritativeState({ expectedDataMutationToken: captureWriteDataToken });
          recovered = true;
          acceptedWithoutReceipt = State.matchesUnconfirmedWrite(error);
        } catch (recoveryError) {
          if (recoveryError?.code === 'LOCUS_STATE_RECOVERY_INTERRUPTED') {
            laterEditsRemain = true;
            showStateRecoveryRequired(recoveryError);
          } else {
            // Display-only fallback. Further persistence remains blocked, so even
            // an interleaved newer action cannot overwrite authoritative storage.
            State.rollbackSnapshot(actionId);
            renderAll();
            showStateRecoveryRequired(recoveryError);
          }
        }
      }
      toast(laterEditsRemain
        ? 'Save was not confirmed — your tabs stayed open and later edits remain visible. Reload Locus before continuing.'
        : acceptedWithoutReceipt
        ? 'Save reached storage, but confirmation was lost — your tabs were left open. Review the saved item before retrying.'
        : recovered
        ? 'Save was not confirmed — latest saved data restored; your tabs were left open'
        : 'Save failed — your tabs were left open. Reload Locus before continuing.',
      { danger: true, duration: 8000 });
      return false;
    }
    const closeSources = options.closeSources ?? State.get().settings.closeTabOnSave;
    const closedTabs = [];
    const failedTabs = [];
    if (closeSources) {
      for (let index = 0; index < tabsToClose.length; index++) {
        const tab = tabsToClose[index];
        if (State.isRecoveryRequired()) {
          failedTabs.push(...tabsToClose.slice(index));
          break;
        }
        if (tab?.id == null && tab?.tabId == null) { failedTabs.push(tab); continue; }
        try {
          await chrome.tabs.remove(tab.id ?? tab.tabId);
          closedTabs.push(tab);
        } catch { failedTabs.push(tab); }
      }
    }
    // Register browser-side effects before the pending flag is cleared. There
    // must be no event-loop turn in which Undo can pop this capture without the
    // information needed to restore its source tabs.
    State.registerClosedTabs(actionId, closedTabs);
    return {
      actionId,
      closeSources,
      requestedCloseCount: closeSources ? tabsToClose.length : 0,
      closedCount: closedTabs.length,
      failedCloseCount: failedTabs.length,
    };
  } finally {
    State.finishCaptureAction(actionId);
    captureCommitPending = false;
  }
}

function captureResultMessage(base, result) {
  const requested = Number(result?.requestedCloseCount) || 0;
  if (!result?.closeSources || !requested) return base;
  const closed = Number(result.closedCount) || 0;
  if (closed === requested) {
    return requested === 1 ? `${base} · closed the source tab` : `${base} · closed ${closed} source tabs`;
  }
  if (!closed) return requested === 1 ? `${base} · source tab stayed open` : `${base} · source tabs stayed open`;
  return `${base} · closed ${closed} of ${requested} source tabs`;
}

function toastCaptureResult(base, result) {
  const partialClose = Number(result?.failedCloseCount) > 0;
  toast(captureResultMessage(base, result), {
    undo: result?.actionId,
    duration: partialClose ? 6000 : 3000,
  });
}
function applyFilter() {
  const q = document.getElementById('tab-filter').value.toLowerCase().trim();
  // Build id→tab map once instead of O(n²) find() per row.
  const byId = new Map();
  for (const t of allOpenTabs) byId.set(String(t.id), t);
  document.querySelectorAll('#open-tabs .otab').forEach(el => {
    const t = byId.get(el.dataset.tid);
    if (!t) return;
    const match = !q || (t.title||'').toLowerCase().includes(q) || (t.url||'').toLowerCase().includes(q);
    el.classList.toggle('hidden', !match);
  });
}

async function saveTabToInbox(t, options = {}) {
  const cat = activeCat();
  if (!cat) return false;
  const actionId = State.snapshot('Save to inbox');
  let inbox = cat.groups.find(g => g.name === 'Inbox');
  if (!inbox) { inbox = { id: uid(), name:'Inbox', symbol:'📥', color:'#6366f1', collapsed:false, items:[] }; cat.groups.unshift(inbox); }
  if (captureDuplicateExists(inbox, t.url)) { State.rollbackSnapshot(actionId); toast('Already saved', { danger: true }); return false; }
  const meta = captureTabFields(t);
  const savedItem = stampNew({ id: uid(), type:'tab', title: meta.title, url: t.url, fav: meta.fav });
  inbox.items.push(savedItem);
  const closeSources = options.closeSource ?? State.get().settings.closeTabOnSave;
  const result = await commitCapturedTabs([t], { closeSources, actionId });
  if (!result) return false;
  renderBoard();
  toastCaptureResult(closeSources ? 'Saved to Inbox' : 'Saved a copy to Inbox', result);
  return savedItem;
}
async function saveSelectedAsGroup() {
  const tabs = allOpenTabs.filter(t => selectedTabIds.has(t.id));
  if (!tabs.length) return;
  const cat = activeCat();
  const actionId = State.snapshot(`Save ${tabs.length} tabs`);
  const now = new Date();
  const g = {
    id: uid(), symbol:'📂', color:'#6366f1', collapsed:false,
    name: `${tabs.length} tabs ${now.toLocaleDateString(appLocale(), { month:'short', day:'numeric' })}`,
    items: tabs.map(t => { const meta = captureTabFields(t); return stampNew({ id: uid(), type:'tab', title:meta.title, url:t.url, fav:meta.fav }); })
  };
  cat.groups.push(g);
  const result = await commitCapturedTabs(tabs, { actionId });
  if (!result) return;
  selectedTabIds.clear();
  renderBoard(); updateSelectedBadge();
  toastCaptureResult(`Saved ${tabs.length} tabs`, result);
}

async function addSidebarOrActiveTabToGroup(g) {
  const selectedTabs = allOpenTabs.filter(t => selectedTabIds.has(t.id));
  if (selectedTabs.length) {
    const addedTabs = selectedTabs.filter(t => !captureDuplicateExists(g, t.url));
    if (!addedTabs.length) return toast('Already saved', { danger: true });
    const actionId = State.snapshot(`Add ${addedTabs.length} tabs`);
    addedTabs.forEach(t => {
      const meta = captureTabFields(t);
      g.items.push(stampNew({ id: uid(), type:'tab', title:meta.title, url:t.url, fav:meta.fav }));
    });
    const result = await commitCapturedTabs(addedTabs, { actionId });
    if (!result) return;
    selectedTabIds.clear();
    lastClickedTabId = null;
    renderBoard();
    updateSelectedBadge();
    toastCaptureResult(`Added ${addedTabs.length} ${addedTabs.length === 1 ? 'tab' : 'tabs'}`, result);
    return;
  }

  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!t || isProto(t.url)) {
    toast('Select a tab on the left to add it here');
    return;
  }
  if (captureDuplicateExists(g, t.url)) return toast('Already saved');
  const actionId = State.snapshot('Add tab');
  const meta = captureTabFields(t);
  g.items.push(stampNew({ id: uid(), type:'tab', title:meta.title, url:t.url, fav:meta.fav }));
  const result = await commitCapturedTabs([t], { actionId });
  if (!result) return;
  renderBoard();
  toastCaptureResult('Tab added', result);
}

async function saveAllTabs() {
  const cat = activeCat(); if (!cat) return;
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const valid = tabs.filter(t => !isProto(t.url));
  if (!valid.length) return toast('No tabs to save');
  const actionId = State.snapshot('Save eligible tabs');
  const now = new Date();
  cat.groups.push({
    id: uid(), symbol:'💾', color:'#06b6d4', collapsed:false,
    name:`Session ${now.toLocaleDateString(appLocale(), { month:'short', day:'numeric' })} ${now.toLocaleTimeString(appLocale(), { hour:'2-digit', minute:'2-digit' })}`,
    items: valid.map(t => { const meta = captureTabFields(t); return stampNew({ id: uid(), type:'tab', title:meta.title, url:t.url, fav:meta.fav }); })
  });
  const result = await commitCapturedTabs(valid.slice(1), { actionId });
  if (!result) return;
  renderBoard(); toastCaptureResult(`Saved ${valid.length} tabs`, result);
}

// ════════════════════════════════════════════════════════════════
// RENDER (diff-based for items)
// ════════════════════════════════════════════════════════════════
function renderAll() {
  const headerReady = renderHeader();
  renderWsList();
  renderCategoryTabs();
  renderBoard();
  renderItemDetail();
  Router.sync();
  return headerReady;
}

async function renderHeader() {
  const ws = activeWs(); if (!ws) return;
  const titleSym = document.getElementById('ws-title-sym');
  if (titleSym) titleSym.textContent = ws.symbol || '🏠';
  const titleNm = document.getElementById('ws-title-name');
  if (titleNm) titleNm.textContent = ws.name;
  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) undoBtn.classList.toggle('disabled', !State.canUndo());
  await renderWsChips();
}

// ─── Workspace chips (one per open browser window) ───
async function renderWsChips() {
  const $stack = document.getElementById('ws-chips-stack');
  if (!$stack) return;
  const s = State.get();

  let windows = [];
  try { windows = await chrome.windows.getAll({ populate: false }); } catch {}

  if (s.settings.windowSync !== false) {
    for (const w of windows) {
      const boundWs = s.workspaces.find(ws => ws.windowId === w.id);
      if (!boundWs) {
        const orphan = s.workspaces.find(ws => !ws.windowId);
        if (orphan && !s.workspaces.some(x => x.windowId === w.id)) orphan.windowId = w.id;
      }
    }
    const openIds = new Set(windows.map(w => w.id));
    s.workspaces.forEach(ws => { if (ws.windowId && !openIds.has(ws.windowId)) delete ws.windowId; });
    try {
      const cur = await chrome.windows.getCurrent();
      if (s.settings.autoSwitchWorkspace) {
        const match = s.workspaces.find(ws => ws.windowId === cur.id);
        if (match && match.id !== s.activeWsId) s.activeWsId = match.id;
      }
    } catch {}
  }

  $stack.innerHTML = '';
  const liveWorkspaces = s.workspaces.filter(ws => ws.windowId && windows.some(w => w.id === ws.windowId));
  liveWorkspaces.forEach(ws => $stack.appendChild(buildWsChip(ws, { live: true })));

  // If the active workspace is NOT bound to any window (saved/dormant), show it as active chip too
  const activeW = activeWs();
  if (activeW && !liveWorkspaces.some(x => x.id === activeW.id)) {
    $stack.appendChild(buildWsChip(activeW, { live: false }));
  }

  const otherCount = s.workspaces.length - liveWorkspaces.length - (activeW && !liveWorkspaces.some(x => x.id === activeW.id) ? 1 : 0);
  if (otherCount > 0) {
    const more = document.createElement('button');
    more.className = 'ws-chip ws-chip-more';
    more.title = `${otherCount} saved workspace${otherCount > 1 ? 's' : ''}`;
    more.innerHTML = `<span>+${otherCount}</span>`;
    more.onclick = event => openWsGrid(event.currentTarget);
    $stack.appendChild(more);
  }
}

function buildWsChip(ws, { live }) {
  const chip = document.createElement('button');
  chip.className = 'ws-chip' + (ws.id === State.get().activeWsId ? ' active' : '') + (live ? ' live' : '');
  chip.dataset.wsid = ws.id;
  chip.title = ws.name + (live ? ' · live window' : '');
  chip.innerHTML = `
    <span class="ws-chip-sym">${esc(ws.symbol || '🏠')}</span>
    <span class="ws-chip-name">${esc(ws.name)}</span>
    ${live ? '<span class="ws-chip-live-dot"></span>' : ''}`;
  chip.onclick = async () => {
    State.get().activeWsId = ws.id;
    State.persist();
    renderAll();
    if (ws.windowId) { try { await chrome.windows.update(ws.windowId, { focused: true }); } catch {} }
  };
  const workspaceMenuItems = () => {
    const items = [
      { text: tr('organization.renameMenu'), icon: cmIcons.edit, action: () => openOrganizationName('workspace', ws.id, chip) },
      { text: tr('organization.changeSymbol'), icon: cmIcons.symbol, action: () => openEmojiPicker({ kind:'workspace', id: ws.id }, chip) },
      { sep: true }
    ];
    if (ws.windowId) items.push({ text:'Unbind from window', icon: cmIcons.move, action: () => { State.snapshot('Unbind'); delete ws.windowId; State.persist(); renderAll(); } });
    if (State.get().workspaces.length > 1) items.push({ text: tr('organization.workspace.delete'), icon: cmIcons.delete, danger: true, action: () => openOrganizationDelete('workspace', ws.id, chip) });
    return items;
  };
  bindAnchoredContextMenu(chip, workspaceMenuItems);
  return chip;
}

function renderWsList() {
  const $l = document.getElementById('ws-list');
  $l.innerHTML = '';
  const s = State.get();
  s.workspaces.forEach(ws => {
    const el = document.createElement('div');
    el.className = 'ws-item' + (ws.id === s.activeWsId ? ' active' : '');
    el.innerHTML = `<span class="sym">${esc(ws.symbol||'🏠')}</span><span class="name">${esc(ws.name)}</span>`;
    el.onclick = () => { State.get().activeWsId = ws.id; $l.classList.add('hidden'); State.persist(); renderAll(); };
    $l.appendChild(el);
  });
}

function categoryReminderMenuItem(cat) {
  // Reopen existing reminders before offering another one. This keeps delivered
  // and legacy multi-reminder records reachable through the picker's Remove
  // action, which is required before an otherwise-empty Space can be deleted.
  const hasReminder = Array.isArray(cat?.reminders) && cat.reminders.length > 0;
  return {
    text: `${tr(hasReminder ? 'reminder.editTitle' : 'reminder.setTitle')}…`,
    icon: cmIcons.clock,
    action: () => openEntityReminderPicker('category', cat.id, hasReminder ? 0 : undefined),
  };
}

let _catTabsInitialized = false;
function renderCategoryTabs() {
  const ws = activeWs(); if (!ws) return;
  const $c = document.getElementById('cat-tabs');
  // Preserve keyboard focus across re-renders (otherwise arrow-key nav resets focus to body).
  const refocusActive = $c.contains(document.activeElement) && document.activeElement.classList?.contains('cat-tab');
  $c.innerHTML = '';
  const frag = document.createDocumentFragment();
  ws.categories.forEach(cat => {
    const b = document.createElement('button');
    b.className = 'cat-tab' + (cat.id === ws.activeCatId ? ' active' : '');
    b.dataset.cid = cat.id;
    b.textContent = cat.name;
    b.onclick = () => openCategory(cat.id);
    b.oncontextmenu = e => {
      e.preventDefault();
      showContextMenu(e.pageX, e.pageY, [
        categoryReminderMenuItem(cat),
        ws.categories.length > 1 ? { text: tr('organization.space.delete'), icon: cmIcons.delete, danger: true, action: () => openOrganizationDelete('space', cat.id, b) } : null
      ].filter(Boolean));
    };

    // Drag reorder
    b.draggable = true;
    b.ondragstart = e => {
      drag = { kind:'cat', srcId: cat.id };
      b.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    };
    b.ondragend = () => { b.classList.remove('dragging'); document.querySelectorAll('.cat-tab').forEach(x => { x.classList.remove('drop-before'); x.classList.remove('drop-after'); }); drag = null; };
    b.ondragover = e => {
      if (drag?.kind === 'cat' && drag.srcId !== cat.id) {
        e.preventDefault();
        const r = b.getBoundingClientRect();
        const after = e.clientX > r.left + r.width / 2;
        document.querySelectorAll('.cat-tab').forEach(x => { x.classList.remove('drop-before'); x.classList.remove('drop-after'); });
        b.classList.add(after ? 'drop-after' : 'drop-before');
      }
    };
    b.ondrop = e => {
      if (drag?.kind === 'cat' && drag.srcId !== cat.id) {
        e.preventDefault();
        const r = b.getBoundingClientRect();
        const after = e.clientX > r.left + r.width / 2;
        State.snapshot('Reorder cat');
        const srcIdx = ws.categories.findIndex(c => c.id === drag.srcId);
        const [src] = ws.categories.splice(srcIdx, 1);
        let tgtIdx = ws.categories.findIndex(c => c.id === cat.id);
        if (after) tgtIdx++;
        ws.categories.splice(tgtIdx, 0, src);
        State.persist(); renderCategoryTabs();
      }
    };
    frag.appendChild(b);
  });
  $c.appendChild(frag);
  // Scroll the active tab into view; first render snaps without animation.
  const activeBtn = $c.querySelector('.cat-tab.active');
  if (activeBtn) {
    if (_catTabsInitialized) activeBtn.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    else activeBtn.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'auto' });
    if (refocusActive) { try { activeBtn.focus({ preventScroll: true }); } catch { activeBtn.focus(); } }
  }
  _catTabsInitialized = true;
  updateCatScrollState();
  // The sidebar SPACES list is the primary category nav in the refreshed shell;
  // keep it in sync with the (now hidden) top strip on every category re-render.
  renderSpaceNav();
}

function updateCatScrollState() {
  const $c = document.getElementById('cat-tabs');
  const $w = document.getElementById('cat-tabs-wrap');
  if (!$c || !$w) return;
  const max = $c.scrollWidth - $c.clientWidth;
  const left = $c.scrollLeft;
  // 2px tolerance for sub-pixel rounding.
  $w.classList.toggle('can-scroll-left', left > 2);
  $w.classList.toggle('can-scroll-right', left < max - 2);
}

function bindCatScroll() {
  const $c = document.getElementById('cat-tabs');
  const $w = document.getElementById('cat-tabs-wrap');
  if (!$c || !$w) return;
  const STEP = 160;
  const left = document.getElementById('cat-scroll-left');
  const right = document.getElementById('cat-scroll-right');
  if (left) left.addEventListener('click', () => $c.scrollBy({ left: -STEP, behavior: 'smooth' }));
  if (right) right.addEventListener('click', () => $c.scrollBy({ left: STEP, behavior: 'smooth' }));
  $c.addEventListener('scroll', rafThrottle(updateCatScrollState), { passive: true });
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(rafThrottle(updateCatScrollState));
    ro.observe($c);
    ro.observe($w);
  } else {
    window.addEventListener('resize', rafThrottle(updateCatScrollState));
  }
  // Keyboard navigation between categories when a .cat-tab has focus.
  $c.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const tab = e.target.closest('.cat-tab');
    if (!tab) return;
    e.preventDefault(); e.stopPropagation();
    const all = Array.from($c.querySelectorAll('.cat-tab'));
    const idx = all.indexOf(tab);
    if (idx < 0) return;
    const nextIdx = e.key === 'ArrowLeft' ? Math.max(0, idx - 1) : Math.min(all.length - 1, idx + 1);
    const next = all[nextIdx];
    if (next && next !== tab) { next.focus(); next.click(); }
  });
  updateCatScrollState();
}

// SVG glyphs for the layout switcher (§7) — one per registered layout, shown in
// the top-bar button and the switcher menu so every mode has a recognizable mark.
const LAYOUT_ICONS = {
  board:    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="5" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="3" width="5" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/></svg>',
  list:     '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M3 8h10M3 11h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="3" cy="5" r="0.6" fill="currentColor"/><circle cx="3" cy="8" r="0.6" fill="currentColor"/><circle cx="3" cy="11" r="0.6" fill="currentColor"/></svg>',
  canvas:   '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="6" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="3" width="5" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="9" width="5" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>',
  explorer: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="3.6" height="10" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="6.2" y="3" width="3.6" height="10" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="10.4" y="3" width="3.6" height="10" rx="1" stroke="currentColor" stroke-width="1.4"/></svg>',
  timeline: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="4.5" r="1.5" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="9.5" r="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M9.5 4.5H13M9.5 9.5H12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  gallery:  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="6.5" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="2" width="5" height="4" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="2" y="10" width="5" height="4" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="7.5" width="5" height="6.5" rx="1.2" stroke="currentColor" stroke-width="1.4"/></svg>',
  graph:    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="4" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="3.5" cy="11.5" r="1.7" stroke="currentColor" stroke-width="1.4"/><circle cx="12.5" cy="11.5" r="1.7" stroke="currentColor" stroke-width="1.4"/><path d="M6.8 5.7 4.7 10M9.2 5.7 11.3 10M5.2 11.5h5.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
};

// Layout registry (§2.2) — every registered layout is a pure renderer over the
// active category, sharing the same data, search filter, drag/drop and
// selection, so adding a layout is registering an entry here rather than
// touching the data model. The active layout is stored per category
// (`category.layout`, §7) and falls back to the legacy `settings.viewMode`.
const LAYOUTS = {
  board:    { label: 'Bento board', icon: LAYOUT_ICONS.board,    render: renderBoardView },
  list:     { label: 'List',        icon: LAYOUT_ICONS.list,     render: renderListView },
  canvas:   { label: 'Canvas',      icon: LAYOUT_ICONS.canvas,   render: renderCanvasView },
  explorer: { label: 'Explorer',    icon: LAYOUT_ICONS.explorer, render: renderExplorerView },
  timeline: { label: 'Timeline',    icon: LAYOUT_ICONS.timeline, render: renderTimelineView },
  gallery:  { label: 'Gallery',     icon: LAYOUT_ICONS.gallery,  render: renderGalleryView },
  graph:    { label: 'Graph',       icon: LAYOUT_ICONS.graph,    render: renderGraphView },
};
// Order the layout switcher walks through.
const LAYOUT_ORDER = ['board', 'list', 'canvas', 'explorer', 'timeline', 'gallery', 'graph'];

// Single dispatch point: pick the active layout and render it. Everything that
// mutates state calls renderBoard() to re-render whatever layout is showing.
function renderBoard() {
  invalidateItemCache();
  updateCalendarButton();
  updateNavChrome();
  // Home is a block-scrolling surface; clear its class up front so the calendar
  // and group-page gates (which early-return below) never inherit it. renderHome()
  // re-adds it when Home is the active surface.
  document.getElementById('board').classList.remove('home-mode', 'library-mode', 'archive-mode', 'trash-mode', 'read-later-mode', 'search-mode');
  // Reflect the active surface on <body> (diagnostic / styling hook), computed
  // from the flags so it stays correct through every early-returning gate.
  document.body.dataset.surface = activeSearch ? 'search' : activeCalendar ? 'calendar' : activeGroupPage ? 'group' : activeLibraryMode ? 'library' : activeHome ? 'home' : 'board';
  // The calendar (§5) and group pages (§4.1) are surfaces that sit above the
  // layout registry: when one is open every re-render keeps showing it. Each
  // renderer returns false if the user has navigated away, so we fall through to
  // the normal board in that case.
  if (activeSearch && renderSearchSurface()) return;
  if (activeCalendar && renderCalendar()) return;
  // A group page (§4.1) is a surface that sits above the layout registry: when
  // one is open every re-render keeps showing it. renderGroupPage() returns
  // false if its group vanished or the user navigated away, so we fall through
  // to the normal board in that case.
  if (activeGroupPage && renderGroupPage()) return;
  if (activeLibraryMode && renderLibrarySurface()) return;
  // Home (workspace overview) is the third surface above the layout registry, and
  // the default landing on a fresh new-tab. renderHome() returns false and clears
  // the flag if the workspace vanished, falling through to the category board.
  if (activeHome && renderHome()) return;
  hideBreadcrumb();
  const $b = document.getElementById('board');
  $b.classList.remove('group-page-mode', 'list-mode', 'canvas-mode', 'explorer-mode', 'timeline-mode', 'gallery-mode', 'graph-mode', 'calendar-mode', 'home-mode');
  const mode = getViewMode();
  document.body.dataset.viewMode = mode;
  updateViewModeButton(mode);
  const layout = LAYOUTS[mode] || LAYOUTS.board;
  layout.render();
}

// ════════════════════════════════════════════════════════════════
// HOME SURFACE — Waypoint-style workspace overview
// ════════════════════════════════════════════════════════════════
// The dashboard landing: a greeting hero + one card per category, sitting above
// the layout registry like the calendar and group page. The left nav and the
// right Opened-Tabs rail frame it unchanged; only the middle column swaps.

// Enter Home. Clears the other above-registry surfaces so Home wins the next
// renderBoard() dispatch, then mirrors `…/home` into the URL.
function goHome() {
  activeSearch = null;
  activeLibraryMode = null;
  activeHome = true;
  activeGroupPage = null;
  activeCalendar = null;
  boardDetailItemId = null;
  renderBoard();
  renderSpaceNav();
  Router.sync();
}

// Open a category's board (the legacy layout in the middle column). Usable from
// any surface — clears Home / group page / calendar first.
function openCategory(catId) {
  const ws = activeWs(); if (!ws) return;
  if (!ws.categories.some(c => c.id === catId)) return;
  activeSearch = null;
  activeLibraryMode = null;
  activeHome = false;
  activeGroupPage = null;
  activeCalendar = null;
  ws.activeCatId = catId;
  State.persist();
  renderCategoryTabs();
  renderBoard();
  Router.sync();
}

// Smart view: open the active category's Inbox group page, creating it lazily
// (same shape saveTabToInbox uses).
function openInboxView() {
  const cat = activeCat(); if (!cat) return;
  let inbox = cat.groups.find(g => g.name === 'Inbox');
  if (!inbox) {
    State.snapshot('Create Inbox');
    inbox = { id: uid(), name: 'Inbox', symbol: '📥', color: '#6366f1', collapsed: false, items: [] };
    cat.groups.unshift(inbox);
    State.persist();
  }
  activeLibraryMode = null;
  activeHome = false;
  openGroupPage(inbox.id);
}

function collectWorkspaceTabs(ws = activeWs()) {
  if (!ws) return [];
  const rows = [];
  const walk = (items, cat, group) => {
    (items || []).forEach(it => {
      if (it.type === 'stack') walk(it.items, cat, group);
      else if (it.type === 'tab') rows.push({ item: it, cat, group });
    });
  };
  ws.categories.forEach(cat => cat.groups.forEach(group => walk(group.items, cat, group)));
  return rows;
}

// Search uses every saved item kind, including stack containers and their
// descendants. Parent stack names travel with each row so `in:` works without
// reading rendered DOM or duplicating layout-specific traversal.
function collectWorkspaceItems(ws = activeWs()) {
  if (!ws) return [];
  const rows = [];
  const walk = (items, cat, group, parents = []) => {
    (items || []).forEach(item => {
      rows.push({ item, cat, group, parents });
      if (item.type === 'stack') walk(item.items, cat, group, [...parents, item]);
    });
  };
  ws.categories.forEach(cat => cat.groups.forEach(group => walk(group.items, cat, group)));
  return rows;
}

// ── Zen launch layer ──────────────────────────────────────────────────────
let _landingClockTimer = null;
let _landingResultIndex = -1;

function landingInbox(ws = activeWs()) {
  if (!ws) return null;
  const cat = ws.categories.find(c => c.id === ws.activeCatId) || ws.categories[0];
  return cat ? cat.groups.find(g => g.name === 'Inbox') || null : null;
}

function landingLinkMatches(row, query) {
  return !!String(query || '').trim() && searchItemMatches({ ...row, parents: row.parents || [] }, query);
}

function landingResults(query) {
  return collectWorkspaceTabs(activeWs())
    .filter(row => landingLinkMatches(row, query))
    .sort((a, b) => (b.item.createdAt || 0) - (a.item.createdAt || 0))
    .slice(0, 6);
}

function paintLandingResults(query) {
  const host = document.getElementById('landing-search-results');
  if (!host) return;
  const raw = String(query || '').trim();
  _landingResultIndex = -1;
  if (!raw) { host.innerHTML = ''; host.classList.add('hidden'); return; }
  const rows = landingResults(raw);
  host.classList.remove('hidden');
  if (!rows.length) {
    host.innerHTML = `<div class="landing-result-empty">${esc(tr('landing.noResults'))}</div>`;
    return;
  }
  host.innerHTML = rows.map(({ item, cat, group }, index) => `
    <button class="landing-result" type="button" role="option" data-index="${index}" data-id="${esc(item.id)}">
      <img src="${esc(favUrl(item.url) || BLANK_FAV)}" alt="" loading="lazy" decoding="async">
      <span class="landing-result-copy">
        <span class="landing-result-title">${esc(item.title || item.url || 'Untitled')}</span>
        <span class="landing-result-url">${esc(dispUrl(item.url))}</span>
      </span>
      <span class="landing-result-space">${esc(cat.name)} / ${esc(group.name)}</span>
    </button>`).join('');
  host.querySelectorAll('.landing-result').forEach((button, index) => {
    button.onclick = () => {
      const row = rows[index];
      if (!row) return;
      closeLandingLayer({ immediate: true });
      openTabMaybeHibernated(row.item.url, { focus: true });
    };
  });
}

function updateLandingClock() {
  const time = document.getElementById('landing-time');
  const date = document.getElementById('landing-date');
  if (!time || !date) return;
  const now = new Date();
  const locale = appLocale() === 'zh-TW' ? 'zh-TW' : 'en-US';
  // The zen clock reads "9:41" — 12-hour time with no meridiem (the scene art
  // already says morning/evening), matching the landing preview.
  time.textContent = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: appLocale() !== 'zh-TW' })
    .formatToParts(now).filter(part => part.type !== 'dayPeriod').map(part => part.value).join('').trim();
  date.textContent = appLocale() === 'zh-TW'
    ? new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(now)
    : now.toLocaleDateString('en-GB', { weekday: 'short' }) + ', ' + now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

function renderLandingLayer() {
  const layer = document.getElementById('landing-layer');
  const ws = activeWs();
  if (!layer || !ws) return;
  const now = new Date();
  const hour = now.getHours();
  const tod = hour < 12 ? 'morning' : hour < 18 ? 'noon' : 'night';
  const greetingKey = hour < 12 ? 'home.greeting.morning' : hour < 18 ? 'home.greeting.afternoon' : 'home.greeting.evening';
  // Greet with the profile name only — the workspace name is an organizational
  // label ("My Workspace"), not something to address the user by.
  const name = ((State.get().settings.profile && State.get().settings.profile.name) || '').trim().split(/\s+/)[0];
  document.getElementById('landing-greeting').textContent = name
    ? tr('landing.greeting', { greeting: tr(greetingKey), name })
    : tr('landing.greetingNoName', { greeting: tr(greetingKey) });
  const scene = document.getElementById('landing-scene');
  if (scene) scene.src = `media/png/${activeThemeMode() === 'dark' ? 'night' : tod}_transparent_corners.png`;
  const face = document.getElementById('landing-avatar-face');
  if (face) face.textContent = (name || ws.name || 'L').charAt(0).toUpperCase();
  const inbox = landingInbox(ws);
  const inboxCount = inbox ? (inbox.items || []).length : 0;
  const reminders = collectPendingReminders({ scope: ws.id }).length;
  document.getElementById('landing-unsorted-count').textContent = String(inboxCount);
  document.getElementById('landing-reminder-count').textContent = String(reminders);
  document.getElementById('landing-unsorted').setAttribute('aria-label', `${tr('landing.unsorted')}: ${inboxCount}`);
  document.getElementById('landing-reminders').setAttribute('aria-label', `${tr('landing.reminders')}: ${reminders}`);
  // A "0 Reminders" pill is noise on a calm surface — the segment only earns
  // its place when something is actually pending.
  document.getElementById('landing-reminders').classList.toggle('hidden', reminders === 0);
  updateLandingClock();
}

function showLandingLayer() {
  const layer = document.getElementById('landing-layer');
  if (!layer || State.get().settings.showLanding === false) return;
  rememberOpener(layer);
  renderLandingLayer();
  layer.classList.remove('hidden', 'landing-exit');
  // Staggered entrance (greeting → search → footer). Re-trigger per show; the
  // global data-anim/reduced-motion gates neutralize it when motion is off.
  layer.classList.remove('landing-in');
  void layer.offsetWidth;
  layer.classList.add('landing-in');
  clearInterval(_landingClockTimer);
  _landingClockTimer = setInterval(updateLandingClock, 30000);
  setTimeout(() => document.getElementById('landing-search-input')?.focus({ preventScroll: true }), 50);
}

function closeLandingLayer({ immediate = false } = {}) {
  const layer = document.getElementById('landing-layer');
  if (!layer || layer.classList.contains('hidden')) return;
  clearInterval(_landingClockTimer);
  const noMotion = immediate || prefersReducedMotion() || !State.get().settings.animate;
  const finish = () => {
    layer.classList.add('hidden');
    layer.classList.remove('landing-exit', 'landing-in');
    // Reset the search so a later reopen starts fresh instead of resurfacing
    // a stale query.
    const input = document.getElementById('landing-search-input');
    if (input) input.value = '';
    const results = document.getElementById('landing-search-results');
    if (results) { results.innerHTML = ''; results.classList.add('hidden'); }
    _landingResultIndex = -1;
    restoreOpener(layer);
  };
  if (noMotion) finish();
  else { layer.classList.add('landing-exit'); setTimeout(finish, 430); }
}

function submitLandingSearch() {
  const input = document.getElementById('landing-search-input');
  const button = document.getElementById('landing-search-submit');
  const query = input ? input.value.trim() : '';
  if (!query) { input?.focus(); return; }
  const active = document.querySelector('.landing-result.active');
  if (active) { active.click(); return; }
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    if (!chrome.search?.query) throw new Error('Default search is unavailable');
    chrome.search.query({ text: query, disposition: 'CURRENT_TAB' });
  } catch (err) {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    toast(err.message || 'Default search is unavailable', { danger: true });
  }
}

function bindLandingLayer() {
  const layer = document.getElementById('landing-layer');
  const input = document.getElementById('landing-search-input');
  const results = document.getElementById('landing-search-results');
  if (!layer || !input || !results) return;
  layer.addEventListener('keydown', e => trapTabKey(e, layer));
  document.getElementById('landing-search-form').onsubmit = e => { e.preventDefault(); submitLandingSearch(); };
  input.oninput = debounce(() => paintLandingResults(input.value), 70);
  input.onkeydown = e => {
    const options = [...results.querySelectorAll('.landing-result')];
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && options.length) {
      e.preventDefault();
      _landingResultIndex = (_landingResultIndex + (e.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length;
      options.forEach((option, i) => option.classList.toggle('active', i === _landingResultIndex));
      options[_landingResultIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && _landingResultIndex >= 0 && options[_landingResultIndex]) {
      e.preventDefault();
      options[_landingResultIndex].click();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submitLandingSearch();
    } else if (e.key === 'Escape' && !results.classList.contains('hidden')) {
      e.preventDefault(); e.stopPropagation(); results.classList.add('hidden'); _landingResultIndex = -1;
    }
  };
  document.getElementById('landing-enter').onclick = () => closeLandingLayer();
  document.getElementById('landing-unsorted').onclick = () => { closeLandingLayer({ immediate: true }); openInboxView(); };
  document.getElementById('landing-reminders').onclick = () => { closeLandingLayer({ immediate: true }); openCalendar(); };
  document.getElementById('landing-tools').onclick = () => {
    closeLandingLayer({ immediate: true });
    openToolsHub();
    setTimeout(() => focusFirstIn(document.getElementById('tools-hub')), 0);
  };
  document.getElementById('landing-menu').onclick = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    closeLandingLayer({ immediate: true });
    openAppMenu({ getBoundingClientRect: () => rect });
  };
  layer.addEventListener('wheel', e => { if (e.deltaY > 28) closeLandingLayer(); }, { passive: true });
}

function toggleFavorite(it) {
  if (!it || it.type !== 'tab') return;
  State.snapshot(it.favorite ? 'Remove favorite' : 'Add favorite');
  it.favorite = !it.favorite;
  State.persist();
  renderBoard();
  updateNavChrome();
  toast(it.favorite ? 'Added to Favorites' : 'Removed from Favorites');
}

// Read Later is additive metadata on the existing tab item. Keeping the item in
// its original group preserves every legacy import and lets this surface act as
// a cross-space queue rather than another storage silo.
function toggleReadLater(it) {
  if (!it || it.type !== 'tab') return;
  const removing = !!it.readLaterAt;
  State.snapshot(removing ? 'Remove from Read Later' : 'Save to Read Later');
  if (removing) {
    delete it.readLaterAt;
    delete it.readAt;
  } else {
    it.readLaterAt = Date.now();
    delete it.readAt;
  }
  State.persist();
  renderBoard();
  updateNavChrome();
  toast(removing ? 'Removed from Read Later' : 'Saved to Read Later');
}

function toggleReadStatus(it) {
  if (!it || !it.readLaterAt) return;
  State.snapshot(it.readAt ? 'Mark unread' : 'Mark read');
  if (it.readAt) delete it.readAt;
  else it.readAt = Date.now();
  State.persist();
  renderBoard();
  updateNavChrome();
  toast(it.readAt ? 'Marked as read' : 'Marked as unread');
}

// Shared empty-state system. The reference image defines these as calm starting
// points, not decorative placeholders: every state explains why it is empty and
// exposes no more than two actions that enter an existing product flow.
const SYSTEM_EMPTY_ICONS = {
  inbox: `<svg viewBox="0 0 64 64" fill="none"><path d="M14 31h36l5 19H9l5-19Z" fill="currentColor" opacity=".14"/><path d="M17 31l5-17h20l5 17" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 31h44l-3 20H13l-3-20Z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 37h13a9 9 0 0018 0h13" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>`,
  space: `<svg viewBox="0 0 64 64" fill="none"><path d="M9 21h18l5 6h23v25H9V21Z" fill="currentColor" opacity=".15"/><path d="M9 18h18l5 6h23v28H9V18Z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 32v12M26 38h12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  search: `<svg viewBox="0 0 64 64" fill="none"><circle cx="27" cy="27" r="17" fill="currentColor" opacity=".12"/><circle cx="27" cy="27" r="17" stroke="currentColor" stroke-width="3"/><path d="m40 40 13 13" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
  read: `<svg viewBox="0 0 64 64" fill="none"><path d="M19 9h26v46L32 47 19 55V9Z" fill="currentColor" opacity=".15"/><path d="M19 9h26v46L32 47 19 55V9Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
  favorites: `<svg viewBox="0 0 64 64" fill="none"><path d="m32 8 7 15 17 2-12 12 3 17-15-8-15 8 3-17L8 25l17-2 7-15Z" fill="currentColor" opacity=".16"/><path d="m32 8 7 15 17 2-12 12 3 17-15-8-15 8 3-17L8 25l17-2 7-15Z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>`,
  trash: `<svg viewBox="0 0 64 64" fill="none"><path d="M17 19h30l-3 37H20l-3-37Z" fill="currentColor" opacity=".13"/><path d="M17 19h30l-3 37H20l-3-37Z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M13 19h38M25 19v-7h14v7M27 28v18M37 28v18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  archive: `<svg viewBox="0 0 64 64" fill="none"><path d="M11 20h42v34H11V20Z" fill="currentColor" opacity=".13"/><path d="M11 20h42v34H11V20ZM8 11h48v9H8v-9Z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M25 31h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  library: `<svg viewBox="0 0 64 64" fill="none"><path d="M25 39 19 45a9 9 0 01-13-13l9-9a9 9 0 0113 0" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/><path d="m39 25 6-6a9 9 0 0113 13l-9 9a9 9 0 01-13 0" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/><path d="m23 41 18-18" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/></svg>`,
};
let _systemEmptySeq = 0;

function buildSystemEmptyState({ kind = 'library', title, body, actions = [], note = '', compact = false } = {}) {
  const safeKind = Object.prototype.hasOwnProperty.call(SYSTEM_EMPTY_ICONS, kind) ? kind : 'library';
  const section = document.createElement('section');
  const titleId = `system-empty-title-${++_systemEmptySeq}`;
  section.className = 'system-empty' + (compact ? ' compact' : '');
  section.dataset.kind = safeKind;
  section.setAttribute('aria-labelledby', titleId);
  section.innerHTML = `
    <div class="system-empty-visual" aria-hidden="true"><span>${SYSTEM_EMPTY_ICONS[safeKind]}</span><i></i><i></i></div>
    <div class="system-empty-copy">
      <h2 id="${titleId}">${esc(title || '')}</h2>
      <p>${esc(body || '')}</p>
      <div class="system-empty-actions"></div>
      ${note ? `<div class="system-empty-note"><span aria-hidden="true">✓</span>${esc(note)}</div>` : ''}
    </div>`;
  const actionHost = section.querySelector('.system-empty-actions');
  actions.filter(action => action && action.label && typeof action.run === 'function').slice(0, 2).forEach((action, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = (index === 0 ? 'btn-primary' : 'btn-secondary') + ' system-empty-action';
    if (action.icon) {
      const icon = document.createElement('span');
      icon.className = 'system-empty-action-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = action.icon;
      button.appendChild(icon);
    }
    const label = document.createElement('span');
    label.textContent = action.label;
    button.appendChild(label);
    button.onclick = async () => {
      if (button.disabled) return;
      try {
        const outcome = action.run(button);
        if (outcome && typeof outcome.then === 'function') {
          button.disabled = true;
          await outcome;
        }
      }
      catch (error) { console.error(error); toast(error?.message || tr('search.error'), { danger: true }); }
      finally { if (button.isConnected) button.disabled = false; }
    };
    actionHost.appendChild(button);
  });
  if (!actionHost.children.length) actionHost.remove();
  return section;
}

function buildEmptySpaceState(cat) {
  const workspace = activeWs();
  const createGroup = {
    label: tr('empty.createGroup'),
    icon: '+',
    run: opener => openIdentityEditor('group', 'create', {
      workspaceId: workspace?.id,
      spaceId: cat?.id,
    }, opener),
  };
  const addSave = { label: tr('empty.addSave'), icon: '↗', run: () => openCommandPalette() };
  return buildSystemEmptyState({
    kind: 'space',
    title: tr('empty.spaceTitle', { space: cat?.name || tr('search.space') }),
    body: tr('empty.spaceBody'),
    actions: cat?.groups?.length ? [addSave, createGroup] : [createGroup, addSave],
    note: tr('empty.localNote'),
  });
}

function openLibrarySurface(mode) {
  const ws = activeWs();
  if (!ws) return;
  const normalized = ['all', 'favorites', 'read-later', 'archive', 'trash'].includes(mode) ? mode : 'all';
  Router.navigate({ type: 'library', wsId: ws.id, mode: normalized, query: {} });
}

function renderLibrarySurface() {
  const ws = activeWs();
  if (!ws || !activeLibraryMode) return false;
  if (activeLibraryMode === 'archive') return renderArchiveSurface();
  if (activeLibraryMode === 'trash') return renderTrashSurface();
  if (activeLibraryMode === 'read-later') return renderReadLaterSurface();
  hideBreadcrumb();
  const board = document.getElementById('board');
  board.classList.remove('group-page-mode', 'list-mode', 'canvas-mode', 'explorer-mode', 'timeline-mode', 'gallery-mode', 'graph-mode', 'calendar-mode', 'home-mode');
  board.classList.add('library-mode');
  board.innerHTML = '';

  let rows = collectWorkspaceTabs(ws);
  if (activeLibraryMode === 'favorites') rows = rows.filter(row => row.item.favorite);
  rows.sort((a, b) => (b.item.createdAt || 0) - (a.item.createdAt || 0));

  const shell = document.createElement('section');
  shell.className = 'library-shell';
  shell.innerHTML = `
    <header class="library-head">
      <div>
        <h1>${esc(tr(activeLibraryMode === 'favorites' ? 'nav.favorites' : 'nav.allLinks'))}</h1>
        <p>${esc(tr('library.linksAcross', { count: rows.length }))}</p>
      </div>
      <label class="library-search">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <input type="search" placeholder="${esc(tr('library.filterLinks'))}" aria-label="${esc(tr('library.filterLinks'))}">
      </label>
    </header>
    <div class="library-toolbar">
      <span class="library-filter active">${esc(tr('search.all'))}</span>
      <span class="library-location">${esc(tr('library.workspace', { name: ws.name }))}</span>
    </div>
    <div class="library-list" role="list"></div>`;
  board.appendChild(shell);
  const list = shell.querySelector('.library-list');
  const searchInput = shell.querySelector('.library-search input');

  const paint = query => {
    const rawQuery = String(query || '').trim();
    const needle = rawQuery.toLowerCase();
    list.innerHTML = '';
    const visible = rows.filter(({ item, cat, group }) => !needle || [item.title, item.url, cat.name, group.name].join(' ').toLowerCase().includes(needle));
    if (!visible.length) {
      if (needle) {
        list.appendChild(buildSystemEmptyState({
          kind: 'search', compact: true,
          title: tr('empty.searchTitle', { query: rawQuery }), body: tr('empty.noMatchBody'),
          actions: [{ label: tr('empty.clearSearch'), icon: '×', run: () => { searchInput.value = ''; paint(''); searchInput.focus(); } }],
        }));
      } else if (activeLibraryMode === 'favorites') {
        list.appendChild(buildSystemEmptyState({
          kind: 'favorites', title: tr('empty.favoritesTitle'), body: tr('empty.favoritesBody'),
          actions: [{ label: tr('empty.browseLibrary'), icon: '↗', run: () => openLibrarySurface('all') }],
          note: tr('empty.localNote'),
        }));
      } else {
        list.appendChild(buildSystemEmptyState({
          kind: 'library', title: tr('empty.libraryTitle'), body: tr('empty.libraryBody'),
          actions: [
            { label: tr('empty.addSave'), icon: '+', run: () => openCommandPalette() },
            { label: tr('empty.importBookmarks'), icon: '⇩', run: () => importBookmarks() },
          ],
          note: tr('empty.localNote'),
        }));
      }
      return;
    }
    visible.forEach(({ item, cat, group }) => {
      const row = document.createElement('article');
      row.className = 'library-row';
      row.setAttribute('role', 'listitem');
      row.dataset.id = item.id;
      row.innerHTML = `
        <img class="library-fav" src="${esc(favUrl(item.url) || BLANK_FAV)}" alt="" loading="lazy" decoding="async">
        <button class="library-primary" type="button">
          <span class="library-title">${esc(item.title || 'Untitled')}</span>
          <span class="library-url">${esc(dispUrl(item.url))}</span>
        </button>
        <span class="library-space">${esc(cat.name)} / ${esc(group.name)}</span>
        <button class="library-star${item.favorite ? ' active' : ''}" type="button" title="${item.favorite ? 'Remove from Favorites' : 'Add to Favorites'}" aria-label="${item.favorite ? 'Remove from Favorites' : 'Add to Favorites'}">${item.favorite ? '★' : '☆'}</button>
        <button class="library-more" type="button" title="More actions" aria-label="More actions">•••</button>`;
      row.querySelector('.library-primary').onclick = () => openTabMaybeHibernated(item.url, { focus: true });
      row.querySelector('.library-star').onclick = () => toggleFavorite(item);
      row.querySelector('.library-more').onclick = e => showContextMenu(e.pageX, e.pageY, [
        { text: 'Open', icon: cmIcons.open, action: () => openTabMaybeHibernated(item.url, { focus: true }) },
        { text: item.favorite ? 'Remove from Favorites' : 'Add to Favorites', icon: cmIcons.favorite, action: () => toggleFavorite(item) },
        { text: item.readLaterAt ? 'Remove from Read Later' : 'Save to Read Later', icon: cmIcons.readLater, action: () => toggleReadLater(item) },
        { text: 'Details', icon: cmIcons.detail, action: () => openItemDetail(item.id) },
        { sep: true },
        { text: 'Archive', icon: cmIcons.archive, action: () => archiveItem(item.id) }
      ]);
      list.appendChild(row);
    });
  };
  paint('');
  searchInput.oninput = e => paint(e.target.value);
  updateNavChrome();
  return true;
}

function renderReadLaterSurface() {
  const ws = activeWs();
  if (!ws) return false;
  hideBreadcrumb();
  const board = document.getElementById('board');
  board.classList.remove('group-page-mode', 'list-mode', 'canvas-mode', 'explorer-mode', 'timeline-mode', 'gallery-mode', 'graph-mode', 'calendar-mode', 'home-mode');
  board.classList.add('library-mode', 'read-later-mode');
  board.innerHTML = '';

  const rows = collectWorkspaceTabs(ws)
    .filter(row => row.item.readLaterAt)
    .sort((a, b) => (a.item.readLaterAt || 0) - (b.item.readLaterAt || 0));
  const unread = rows.filter(row => !row.item.readAt);
  const read = rows.filter(row => row.item.readAt);
  const shell = document.createElement('section');
  shell.className = 'library-shell read-later-shell';
  shell.innerHTML = `
    <header class="library-head read-later-head">
      <div>
        <h1>${esc(tr('nav.readLater'))}</h1>
        <p>${esc(tr('readLater.subtitle'))}</p>
      </div>
      <label class="library-search">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <input type="search" placeholder="Search reading list" aria-label="Search reading list">
      </label>
    </header>
    <div class="read-later-summary" aria-label="Reading list summary">
      <div><strong>${rows.length}</strong><span>Saved</span></div>
      <div><strong>${unread.length}</strong><span>Unread</span></div>
      <div><strong>${read.length}</strong><span>Read</span></div>
      <div class="read-later-local"><strong>Browser-profile storage</strong><span>Export before uninstalling or deleting the profile</span></div>
    </div>
    <section class="read-later-next" aria-labelledby="read-later-next-title">
      <div class="read-later-section-head"><div><h2 id="read-later-next-title">Up next</h2><p>Oldest unread saves, ready when you are</p></div></div>
      <div class="read-later-cards"></div>
    </section>
    <section class="read-later-all" aria-labelledby="read-later-all-title">
      <div class="read-later-section-head"><div><h2 id="read-later-all-title">All saved items</h2><p>Keep, finish, or remove links without changing their spaces</p></div></div>
      <div class="read-later-toolbar">
        <div class="read-later-filters" role="group" aria-label="Reading status">
          <button type="button" data-status="unread" class="active" aria-pressed="true">Unread</button>
          <button type="button" data-status="read" aria-pressed="false">Read</button>
          <button type="button" data-status="all" aria-pressed="false">All</button>
        </div>
        <label class="read-later-sort">Sort
          <select aria-label="Sort reading list">
            <option value="oldest">Oldest saved</option>
            <option value="newest">Newest saved</option>
            <option value="title">Title</option>
          </select>
        </label>
      </div>
      <div class="read-later-list" role="list"></div>
    </section>`;
  board.appendChild(shell);

  if (!rows.length) {
    shell.querySelector('.library-search')?.remove();
    shell.querySelector('.read-later-summary')?.remove();
    shell.querySelector('.read-later-next')?.remove();
    shell.querySelector('.read-later-all')?.remove();
    const emptyHost = document.createElement('div');
    emptyHost.className = 'library-list read-later-empty-host';
    emptyHost.appendChild(buildSystemEmptyState({
      kind: 'read', title: tr('empty.readLaterTitle'), body: tr('empty.readLaterBody'),
      actions: [
        { label: tr('empty.browseLibrary'), icon: '↗', run: () => openLibrarySurface('all') },
        { label: tr('empty.addSave'), icon: '+', run: () => openCommandPalette() },
      ],
      note: tr('empty.localNote'),
    }));
    shell.appendChild(emptyHost);
    updateNavChrome();
    return true;
  }

  const next = shell.querySelector('.read-later-cards');
  if (!unread.length) {
    next.innerHTML = `<div class="read-later-next-empty"><span>✓</span><strong>You're caught up</strong><small>Save any link for later from its action menu.</small></div>`;
  } else {
    unread.slice(0, 4).forEach(({ item, cat }) => {
      const card = document.createElement('article');
      card.className = 'read-later-card';
      card.innerHTML = `
        <div class="read-later-card-top"><img src="${esc(favUrl(item.url) || BLANK_FAV)}" alt="" loading="lazy"><span>${esc(cat.name)}</span></div>
        <button type="button" class="read-later-card-title">${esc(item.title || 'Untitled')}</button>
        <div class="read-later-card-foot"><span>${esc(dispUrl(item.url))}</span><button type="button" aria-label="Mark ${esc(item.title || 'link')} as read" title="Mark as read">✓</button></div>`;
      card.querySelector('.read-later-card-title').onclick = () => openTabMaybeHibernated(item.url, { focus: true });
      card.querySelector('.read-later-card-foot button').onclick = () => toggleReadStatus(item);
      next.appendChild(card);
    });
  }

  const list = shell.querySelector('.read-later-list');
  const search = shell.querySelector('.library-search input');
  const sort = shell.querySelector('.read-later-sort select');
  let status = 'unread';
  const paint = () => {
    const needle = search.value.trim().toLowerCase();
    let visible = rows.filter(({ item, cat, group }) => {
      const statusMatch = status === 'all' || (status === 'read' ? !!item.readAt : !item.readAt);
      const queryMatch = !needle || [item.title, item.url, cat.name, group.name].join(' ').toLowerCase().includes(needle);
      return statusMatch && queryMatch;
    });
    visible = [...visible].sort((a, b) => {
      if (sort.value === 'newest') return (b.item.readLaterAt || 0) - (a.item.readLaterAt || 0);
      if (sort.value === 'title') return String(a.item.title || '').localeCompare(String(b.item.title || ''));
      return (a.item.readLaterAt || 0) - (b.item.readLaterAt || 0);
    });
    list.innerHTML = '';
    if (!visible.length) {
      const reset = () => {
        if (needle) search.value = '';
        else status = 'all';
        shell.querySelectorAll('.read-later-filters button').forEach(button => {
          const active = button.dataset.status === status;
          button.classList.toggle('active', active);
          button.setAttribute('aria-pressed', String(active));
        });
        paint();
        if (needle) search.focus();
      };
      list.appendChild(buildSystemEmptyState({
        kind: needle ? 'search' : 'read', compact: true,
        title: needle ? tr('empty.searchTitle', { query: search.value.trim() }) : tr('empty.noMatchTitle'),
        body: tr('empty.noMatchBody'),
        actions: [{ label: tr(needle ? 'empty.clearSearch' : 'empty.showAll'), icon: needle ? '×' : '↗', run: reset }],
      }));
      return;
    }
    visible.forEach(({ item, cat, group }) => {
      const row = document.createElement('article');
      row.className = 'read-later-row' + (item.readAt ? ' is-read' : '');
      row.setAttribute('role', 'listitem');
      row.dataset.id = item.id;
      row.innerHTML = `
        <img class="library-fav" src="${esc(favUrl(item.url) || BLANK_FAV)}" alt="" loading="lazy">
        <button class="library-primary" type="button"><span class="library-title">${esc(item.title || 'Untitled')}</span><span class="library-url">${esc(dispUrl(item.url))}</span></button>
        <span class="library-space">${esc(cat.name)} / ${esc(group.name)}</span>
        <time datetime="${new Date(item.readLaterAt).toISOString()}">${esc(fmtTimeRelative(item.readLaterAt))}</time>
        <button class="read-later-status" type="button" aria-pressed="${!!item.readAt}" title="${item.readAt ? 'Mark unread' : 'Mark read'}">${item.readAt ? '↶ Unread' : '✓ Read'}</button>
        <button class="library-more" type="button" title="More actions" aria-label="More actions">•••</button>`;
      row.querySelector('.library-primary').onclick = () => openTabMaybeHibernated(item.url, { focus: true });
      row.querySelector('.read-later-status').onclick = () => toggleReadStatus(item);
      row.querySelector('.library-more').onclick = e => showContextMenu(e.pageX, e.pageY, [
        { text: 'Open', icon: cmIcons.open, action: () => openTabMaybeHibernated(item.url, { focus: true }) },
        { text: item.readAt ? 'Mark unread' : 'Mark read', icon: cmIcons.readLater, action: () => toggleReadStatus(item) },
        { text: 'Remove from Read Later', icon: cmIcons.delete, action: () => toggleReadLater(item) },
        { sep: true },
        { text: 'Details', icon: cmIcons.detail, action: () => openItemDetail(item.id) },
        { text: 'Archive', icon: cmIcons.archive, action: () => archiveItem(item.id) }
      ]);
      list.appendChild(row);
    });
  };
  shell.querySelectorAll('.read-later-filters button').forEach(button => button.onclick = () => {
    status = button.dataset.status;
    shell.querySelectorAll('.read-later-filters button').forEach(other => {
      const active = other === button;
      other.classList.toggle('active', active);
      other.setAttribute('aria-pressed', String(active));
    });
    paint();
  });
  search.oninput = paint;
  search.onkeydown = e => { if (e.key === 'Escape') { search.value = ''; paint(); search.blur(); } };
  sort.onchange = paint;
  paint();
  updateNavChrome();
  return true;
}

function archiveEntryTitle(entry) {
  if (!entry || !entry.data) return 'Untitled';
  if (entry.kind === 'group') return entry.data.name || 'Untitled group';
  const it = entry.data;
  if (it.type === 'note') return String(it.html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || 'Note';
  if (it.type === 'todo') return it.text || it.title || 'To-do';
  if (it.type === 'stack') return it.name || 'Stack';
  return it.title || dispUrl(it.url) || 'Untitled link';
}

function archiveEntryType(entry) {
  if (entry.kind === 'group') return 'groups';
  const type = entry.data?.type;
  if (type === 'note') return 'notes';
  if (type === 'todo') return 'todos';
  if (type === 'stack') return 'groups';
  return 'links';
}

function archiveEntryIcon(entry) {
  if (entry.kind === 'group') return entry.data?.symbol || '📁';
  if (entry.data?.type === 'note') return '✎';
  if (entry.data?.type === 'todo') return entry.data.done ? '✓' : '○';
  if (entry.data?.type === 'stack') return '▱';
  return '↗';
}

function archiveEntryCount(entry) {
  if (entry.kind !== 'group') return 1;
  let count = 0;
  const walk = items => (items || []).forEach(it => { count++; if (it.type === 'stack') walk(it.items); });
  walk(entry.data?.items);
  return count;
}

function archiveEntryTimestamp(entry) {
  const value = Number(entry?.at);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function archiveDateBucket(at) {
  const value = Number(at) || 0;
  const day = new Date(value); day.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const delta = Math.round((today - day) / 86400000);
  if (delta <= 0) return 'Today';
  if (delta === 1) return 'Yesterday';
  if (delta < 7) return 'This week';
  return 'Earlier';
}

// Dedicated desktop archive: the old Settings list remains as a compact
// secondary view, while this primary surface supports finding and restoring
// whole archived sessions without changing the legacy archive schema.
function renderArchiveSurface() {
  hideBreadcrumb();
  const board = document.getElementById('board');
  board.classList.remove('group-page-mode', 'list-mode', 'canvas-mode', 'explorer-mode', 'timeline-mode', 'gallery-mode', 'graph-mode', 'calendar-mode', 'home-mode');
  board.classList.add('library-mode', 'archive-mode');
  board.innerHTML = '';

  // Keep malformed legacy/import records in storage for lossless export, but
  // do not let one incomplete record prevent the rest of the archive loading.
  const allEntries = (State.get().archive || [])
    .filter(entry => entry && entry.data)
    .sort((a, b) => archiveEntryTimestamp(b) - archiveEntryTimestamp(a));
  const itemTotal = allEntries.reduce((sum, entry) => sum + archiveEntryCount(entry), 0);
  const groupTotal = allEntries.filter(entry => entry.kind === 'group').length;
  const selected = new Set();
  let query = '';
  let type = 'all';

  const shell = document.createElement('section');
  shell.className = 'library-shell archive-shell';
  shell.innerHTML = `
    <header class="library-head archive-head">
      <div>
        <h1>${esc(tr('nav.archive'))}</h1>
        <p>${esc(tr('archive.subtitle'))}</p>
      </div>
      <label class="library-search">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <input type="search" placeholder="${esc(tr('archive.search'))}" aria-label="${esc(tr('archive.search'))}">
      </label>
    </header>
    <div class="archive-summary" aria-label="${esc(tr('nav.archive'))}">
      <div><strong>${allEntries.length}</strong><span>${esc(tr('archive.summary.entries', { count: allEntries.length }))}</span></div>
      <div><strong>${itemTotal}</strong><span>${esc(tr('archive.summary.items', { count: itemTotal }))}</span></div>
      <div><strong>${groupTotal}</strong><span>${esc(tr('archive.summary.groups', { count: groupTotal }))}</span></div>
      <div class="archive-local"><strong>${esc(tr('archive.summary.local'))}</strong><span>${esc(tr('archive.summary.localBody'))}</span></div>
    </div>
    <div class="archive-toolbar">
      <div class="archive-filters" role="group" aria-label="${esc(tr('nav.archive'))}">
        ${[['all','search.all'],['links','search.links'],['notes','search.notes'],['todos','search.todos'],['groups','trash.groups']].map(([value, key]) => `<button type="button" data-type="${value}" aria-pressed="${value === 'all'}" class="${value === 'all' ? 'active' : ''}">${esc(tr(key))}</button>`).join('')}
      </div>
      <div class="archive-selection" aria-live="polite">
        <span>${esc(tr('archive.selected', { count: 0 }))}</span>
        <button type="button" class="btn-primary" disabled>${esc(tr('archive.restoreSelected'))}</button>
        <button type="button" class="btn-secondary archive-trash-selected" disabled>${tr('archive.moveToTrash')}</button>
      </div>
    </div>
    <div class="archive-results" aria-live="polite"></div>`;
  board.appendChild(shell);

  const results = shell.querySelector('.archive-results');
  const selectionText = shell.querySelector('.archive-selection span');
  const restoreSelected = shell.querySelector('.archive-selection button');
  const trashSelected = shell.querySelector('.archive-trash-selected');
  const search = shell.querySelector('.library-search input');
  const syncSelection = () => {
    selectionText.textContent = tr('archive.selected', { count: selected.size });
    restoreSelected.disabled = selected.size === 0;
    trashSelected.disabled = selected.size === 0;
  };
  function resetFilters() {
    query = '';
    type = 'all';
    search.value = '';
    shell.querySelectorAll('.archive-filters button').forEach(button => {
      const active = button.dataset.type === 'all';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    paint();
    search.focus();
  }

  const paint = () => {
    const needle = query.trim().toLowerCase();
    const visible = allEntries.filter(entry => {
      if (type !== 'all' && archiveEntryType(entry) !== type) return false;
      return !needle || archiveEntryText(entry).includes(needle);
    });
    results.innerHTML = '';
    if (!visible.length) {
      results.appendChild(allEntries.length
        ? buildSystemEmptyState({
            kind: 'search', compact: true, title: tr('empty.noMatchTitle'), body: tr('empty.noMatchBody'),
            actions: [{ label: tr('empty.clearFilters'), icon: '×', run: resetFilters }],
          })
        : buildSystemEmptyState({
            kind: 'archive', title: tr('empty.archiveTitle'), body: tr('empty.archiveBody'),
            actions: [
              { label: tr('empty.browseLibrary'), icon: '↗', run: () => openLibrarySurface('all') },
              { label: tr('empty.returnHome'), icon: '⌂', run: goHome },
            ],
            note: tr('empty.localNote'),
          }));
      return;
    }

    const buckets = new Map();
    visible.forEach(entry => {
      const bucket = archiveDateBucket(archiveEntryTimestamp(entry));
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(entry);
    });
    buckets.forEach((entries, label) => {
      const section = document.createElement('section');
      section.className = 'archive-group';
      section.innerHTML = `<h2>${label}<span>${entries.length}</span></h2><div class="archive-list" role="list"></div>`;
      const list = section.querySelector('.archive-list');
      entries.forEach(entry => {
        const row = document.createElement('article');
        const title = archiveEntryTitle(entry);
        const origin = [entry.catName, entry.groupName].filter(Boolean).join(' / ') || 'Archive';
        const timestamp = archiveEntryTimestamp(entry);
        const date = timestamp ? new Intl.DateTimeFormat(undefined, { dateStyle:'medium', timeStyle:'short' }).format(new Date(timestamp)) : 'Date unavailable';
        row.className = 'archive-row';
        row.setAttribute('role', 'listitem');
        row.innerHTML = `
          <label class="archive-check"><input type="checkbox" aria-label="Select ${esc(title)}"><span aria-hidden="true"></span></label>
          <span class="archive-icon" aria-hidden="true">${esc(archiveEntryIcon(entry))}</span>
          <span class="archive-copy"><strong>${esc(title)}</strong><span>${esc(origin)} · ${entry.kind === 'group' ? `${archiveEntryCount(entry)} ${archiveEntryCount(entry) === 1 ? 'item' : 'items'}` : archiveEntryType(entry).replace(/s$/, '')}</span></span>
          <time datetime="${timestamp ? new Date(timestamp).toISOString() : ''}" title="${esc(date)}">${timestamp ? esc(fmtTimeRelative(timestamp)) : 'Date unavailable'}</time>
          <button type="button" class="archive-restore" aria-label="Restore ${esc(title)}">Restore</button>
          <button type="button" class="archive-delete" aria-label="${esc(tr('archive.moveToTrash'))}: ${esc(title)}" title="${esc(tr('archive.moveToTrash'))}">×</button>`;
        const checkbox = row.querySelector('input');
        checkbox.checked = selected.has(entry);
        checkbox.onchange = () => { checkbox.checked ? selected.add(entry) : selected.delete(entry); row.classList.toggle('selected', checkbox.checked); syncSelection(); };
        row.classList.toggle('selected', checkbox.checked);
        row.querySelector('.archive-restore').onclick = () => restoreArchiveEntries([entry]);
        row.querySelector('.archive-delete').onclick = () => moveArchiveEntriesToTrash([entry]);
        list.appendChild(row);
      });
      results.appendChild(section);
    });
  };

  search.oninput = e => { query = e.target.value; paint(); };
  shell.querySelectorAll('.archive-filters button').forEach(button => {
    button.onclick = () => {
      type = button.dataset.type;
      shell.querySelectorAll('.archive-filters button').forEach(b => { const on = b === button; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
      paint();
    };
  });
  restoreSelected.onclick = () => restoreArchiveEntries([...selected]);
  trashSelected.onclick = () => moveArchiveEntriesToTrash([...selected]);
  paint();
  syncSelection();
  updateNavChrome();
  return true;
}

function trashDateBucket(at) {
  const bucket = archiveDateBucket(at);
  return tr({ Today:'trash.today', Yesterday:'trash.yesterday', 'This week':'trash.thisWeek', Earlier:'trash.earlier' }[bucket] || 'trash.earlier');
}

function trashDaysLeft(entry, now = Date.now()) {
  return Math.max(0, Math.ceil((TRASH_RETENTION_MS - (now - trashTimestamp(entry))) / 86400000));
}

function renderTrashSurface() {
  purgeExpiredTrash();
  hideBreadcrumb();
  const board = document.getElementById('board');
  board.classList.remove('group-page-mode', 'list-mode', 'canvas-mode', 'explorer-mode', 'timeline-mode', 'gallery-mode', 'graph-mode', 'calendar-mode', 'home-mode', 'archive-mode');
  board.classList.add('library-mode', 'trash-mode');
  board.innerHTML = '';

  const stored = State.get().trash || [];
  const allEntries = stored
    .filter(entry => entry && entry.data)
    .sort((a, b) => trashTimestamp(b) - trashTimestamp(a));
  const invalidCount = stored.length - allEntries.length;
  const itemTotal = allEntries.reduce((sum, entry) => sum + archiveEntryCount(entry), 0);
  const bytes = jsonSize(allEntries);
  const selected = new Set();
  let query = '';
  let type = 'all';

  const shell = document.createElement('section');
  shell.className = 'library-shell archive-shell trash-shell';
  shell.innerHTML = `
    <header class="library-head archive-head">
      <div>
        <h1>${tr('trash.title')}</h1>
        <p>${tr('trash.subtitle')}</p>
      </div>
      <label class="library-search">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <input type="search" placeholder="${esc(tr('trash.search'))}" aria-label="${esc(tr('trash.search'))}">
      </label>
    </header>
    <div class="trash-retention" role="note">
      <span class="trash-retention-icon" aria-hidden="true">⌫</span>
      <strong>${tr('trash.retention')}</strong>
      <span>${tr('trash.localOnly')}</span>
    </div>
    ${invalidCount ? `<div class="trash-error" role="status">${esc(tr('trash.invalid', { count: invalidCount }))}</div>` : ''}
    <div class="archive-summary trash-summary" aria-label="${esc(tr('trash.title'))}">
      <div><strong>${allEntries.length}</strong><span>${tr('trash.summary.entries', { count: allEntries.length })}</span></div>
      <div><strong>${itemTotal}</strong><span>${tr('trash.summary.items', { count: itemTotal })}</span></div>
      <div><strong>${_formatBytes(bytes)}</strong><span>${tr('trash.summary.space')}</span></div>
      <div class="archive-local"><strong>30</strong><span>${tr('trash.summary.retention')}</span></div>
    </div>
    <div class="archive-toolbar">
      <div class="archive-filters" role="group" aria-label="${esc(tr('trash.title'))}">
        ${[['all','trash.all'],['links','trash.links'],['notes','trash.notes'],['todos','trash.todos'],['groups','trash.groups']].map(([value, key]) => `<button type="button" data-type="${value}" aria-pressed="${value === 'all'}" class="${value === 'all' ? 'active' : ''}">${tr(key)}</button>`).join('')}
      </div>
      <div class="archive-selection trash-selection" aria-live="polite">
        <span>${tr('trash.selected', { count: 0 })}</span>
        <button type="button" class="btn-primary trash-restore-selected" disabled>${tr('trash.restoreSelected')}</button>
        <button type="button" class="btn-secondary trash-delete-selected" disabled>${tr('trash.deleteSelected')}</button>
      </div>
    </div>
    <div class="archive-results" aria-live="polite"></div>`;
  board.appendChild(shell);

  const results = shell.querySelector('.archive-results');
  const selectionText = shell.querySelector('.archive-selection span');
  const restoreSelected = shell.querySelector('.trash-restore-selected');
  const deleteSelected = shell.querySelector('.trash-delete-selected');
  const search = shell.querySelector('.library-search input');
  const syncSelection = () => {
    selectionText.textContent = tr('trash.selected', { count: selected.size });
    restoreSelected.disabled = selected.size === 0;
    deleteSelected.disabled = selected.size === 0;
  };
  function resetFilters() {
    query = '';
    type = 'all';
    search.value = '';
    shell.querySelectorAll('.archive-filters button').forEach(button => {
      const active = button.dataset.type === 'all';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    paint();
    search.focus();
  }

  const paint = () => {
    const needle = query.trim().toLowerCase();
    const visible = allEntries.filter(entry => {
      if (type !== 'all' && archiveEntryType(entry) !== type) return false;
      return !needle || archiveEntryText(entry).includes(needle);
    });
    results.innerHTML = '';
    if (!visible.length) {
      const noMatch = allEntries.length > 0;
      results.appendChild(noMatch
        ? buildSystemEmptyState({
            kind: 'search', compact: true, title: tr('empty.noMatchTitle'), body: tr('empty.noMatchBody'),
            actions: [{ label: tr('empty.clearFilters'), icon: '×', run: resetFilters }],
          })
        : buildSystemEmptyState({
            kind: 'trash', title: tr('empty.trashTitle'), body: tr('empty.trashBody'),
            actions: [
              { label: tr('empty.browseArchive'), icon: '↗', run: () => openLibrarySurface('archive') },
              { label: tr('empty.returnHome'), icon: '⌂', run: goHome },
            ],
          }));
      return;
    }

    const buckets = new Map();
    visible.forEach(entry => {
      const bucket = trashDateBucket(trashTimestamp(entry));
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(entry);
    });
    buckets.forEach((entries, label) => {
      const section = document.createElement('section');
      section.className = 'archive-group';
      section.innerHTML = `<h2>${esc(label)}<span>${entries.length}</span></h2><div class="archive-list" role="list"></div>`;
      const list = section.querySelector('.archive-list');
      entries.forEach(entry => {
        const row = document.createElement('article');
        const title = archiveEntryTitle(entry);
        const origin = [entry.catName, entry.groupName].filter(Boolean).join(' / ') || tr('nav.archive');
        const timestamp = trashTimestamp(entry);
        const days = trashDaysLeft(entry);
        const daysLabel = days === 0 ? tr('trash.expiresToday') : days === 1 ? tr('trash.dayLeft') : tr('trash.daysLeft', { count: days });
        row.className = 'archive-row trash-row';
        row.setAttribute('role', 'listitem');
        row.innerHTML = `
          <label class="archive-check"><input type="checkbox" aria-label="${esc(tr('trash.select', { title }))}"><span aria-hidden="true"></span></label>
          <span class="archive-icon" aria-hidden="true">${esc(archiveEntryIcon(entry))}</span>
          <span class="archive-copy"><strong>${esc(title)}</strong><span>${esc(origin)}</span></span>
          <time class="trash-expiry" datetime="${new Date(timestamp).toISOString()}" title="${esc(new Intl.DateTimeFormat(undefined, { dateStyle:'medium', timeStyle:'short' }).format(new Date(timestamp)))}">${esc(daysLabel)}</time>
          <button type="button" class="archive-restore" aria-label="${esc(tr('trash.restore'))}: ${esc(title)}">${tr('trash.restore')}</button>
          <button type="button" class="archive-delete" aria-label="${esc(tr('trash.deleteForever'))}: ${esc(title)}" title="${esc(tr('trash.deleteForever'))}">×</button>`;
        const checkbox = row.querySelector('input');
        checkbox.checked = selected.has(entry);
        checkbox.onchange = () => { checkbox.checked ? selected.add(entry) : selected.delete(entry); row.classList.toggle('selected', checkbox.checked); syncSelection(); };
        row.classList.toggle('selected', checkbox.checked);
        row.querySelector('.archive-restore').onclick = () => restoreTrashEntries([entry]);
        row.querySelector('.archive-delete').onclick = () => permanentlyDeleteTrashEntries([entry]);
        list.appendChild(row);
      });
      results.appendChild(section);
    });
  };

  search.oninput = e => { query = e.target.value; paint(); };
  search.onkeydown = e => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    if (search.value) { search.value = ''; query = ''; paint(); }
    else search.blur();
  };
  shell.querySelectorAll('.archive-filters button').forEach(button => {
    button.onclick = () => {
      type = button.dataset.type;
      shell.querySelectorAll('.archive-filters button').forEach(b => { const on = b === button; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
      paint();
    };
  });
  restoreSelected.onclick = () => restoreTrashEntries([...selected]);
  deleteSelected.onclick = () => permanentlyDeleteTrashEntries([...selected]);
  paint();
  syncSelection();
  updateNavChrome();
  return true;
}

// Save the currently dragged tab / multi-selection into a category's Inbox group.
// Backs the "drag a tab into a space to save it" affordance on the SPACES list.
async function dropTabsIntoCategory(cat) {
  const draggedTabs = drag?.kind === 'tab' ? [drag.data]
    : drag?.kind === 'tabs-multi' ? [...drag.data]
    : [];
  if (!draggedTabs.length) return;

  const actionId = State.snapshot(draggedTabs.length === 1 ? 'Save tab' : 'Save tabs');
  let inbox = cat.groups.find(g => g.name === 'Inbox');
  if (!inbox) {
    inbox = { id: uid(), name: 'Inbox', symbol: '📥', color: '#6366f1', collapsed: false, items: [] };
    cat.groups.unshift(inbox);
  }

  const savedTabs = [];
  for (const tab of draggedTabs) {
    if (inbox.items.some(item => item.type === 'tab' && item.url === tab.url)) continue;
    inbox.items.push(stampNew({
      id: uid(), type: 'tab', title: tab.title || 'Untitled',
      url: tab.url, fav: tab.fav || ''
    }));
    savedTabs.push(tab);
  }
  if (!savedTabs.length) {
    State.rollbackSnapshot(actionId);
    toast('Already saved', { danger: true });
    return;
  }
  const result = await commitCapturedTabs(savedTabs, { actionId });
  if (!result) return;
  selectedTabIds.clear();
  renderBoard();
  updateSelectedBadge();
  toastCaptureResult(`Saved ${savedTabs.length} ${savedTabs.length === 1 ? 'tab' : 'tabs'} to ${cat.name}`, result);
  renderSpaceNav();
}

// Time-of-day greeting word (localized).
function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return tr('home.greeting.morning');
  if (h < 18) return tr('home.greeting.afternoon');
  return tr('home.greeting.evening');
}

// Banner subtitle. Picks a calm phrase once per page load (stable across the
// many re-renders in a session so it never flickers). Falls back to the base
// localized line for non-English locales, which don't ship the variant set.
let _homeSubtitle = null;
function homeSubtitle() {
  if (_homeSubtitle) return _homeSubtitle;
  const base = tr('home.subtitle');
  const variants = (appLocale() === 'en')
    ? [base, 'Pick up where you left off.', 'Everything in its place.',
       'Your browser, organized.', 'Less noise, more focus.',
       'A calm home for your tabs.', 'Right where you left it.']
    : [base];
  _homeSubtitle = variants[Math.floor(Math.random() * variants.length)];
  return _homeSubtitle;
}

// Home previews show real saved records and route directly into their existing
// recovery sheet. They keep only primitive identity across the Home render.
function resolveUniqueHomePreviewItem(workspaceId, itemId) {
  if (!workspaceId || !itemId) return null;
  const state = State.get();
  const workspaces = (state.workspaces || []).filter(workspace => workspace.id === workspaceId);
  if (workspaces.length !== 1) return null;
  const matches = (state.workspaces || []).flatMap(workspace =>
    collectWorkspaceItems(workspace)
      .filter(row => row.item?.id === itemId)
      .map(row => ({ ws: workspace, ...row }))
  );
  if (matches.length !== 1 || matches[0].ws !== workspaces[0]) return null;
  const target = matches[0];
  const spaces = (target.ws.categories || []).filter(space => space.id === target.cat?.id);
  return spaces.length === 1 ? target : null;
}

function homePreviewFocusKey(workspaceId, origin, itemId) {
  return [workspaceId, origin, itemId].map(value => encodeURIComponent(String(value || ''))).join(':');
}

function homePreviewRoute(target) {
  if (!target?.ws?.id || !target?.cat?.id || !target?.item?.id) return null;
  return { type: 'home', wsId: target.ws.id, query: { item: target.item.id } };
}

function openHomePreviewItem(workspaceId, itemId, returnFocusKey, opener) {
  focusDialogOpener(opener);
  const target = resolveUniqueHomePreviewItem(workspaceId, itemId);
  const route = homePreviewRoute(target);
  if (!target || !route) {
    toast(tr('home.previewUnavailable'), { danger: true, duration: 5000 });
    return false;
  }
  prepareItemDetailOpen(target.item.id, returnFocusKey);
  // The hash is the navigation record. Keeping the detail over Home avoids
  // selecting or rendering its owning Space, so a recovery view cannot create
  // an incidental whole-state or advanced-layout write.
  Router.navigate(route, { persist: false });
  return true;
}

function homePreviewTypeKey(type) {
  return `home.previewType.${['tab', 'note', 'todo', 'stack'].includes(type) ? type : 'item'}`;
}

function buildHomePreviewRow(it, { workspaceId, origin }) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'home-prow';
  row.dataset.itemId = String(it?.id || '');
  const returnFocusKey = homePreviewFocusKey(workspaceId, origin, it?.id);
  row.dataset.homePreviewKey = returnFocusKey;
  let icon, label, sub = '';
  if (it.type === 'tab') {
    icon = `<img class="home-prow-fav" src="${esc(favUrl(it.url) || BLANK_FAV)}" alt="" loading="lazy" decoding="async">`;
    label = _searchItemTitle(it);
    try { sub = new URL(it.url).hostname.replace(/^www\./, ''); } catch {}
  } else if (it.type === 'note') {
    icon = `<span class="home-prow-glyph">📝</span>`;
    label = _searchItemTitle(it);
  } else if (it.type === 'todo') {
    icon = `<span class="home-prow-glyph">${it.done ? '☑' : '☐'}</span>`;
    label = _searchItemTitle(it);
  } else if (it.type === 'stack') {
    icon = `<span class="home-prow-glyph">📚</span>`;
    label = _searchItemTitle(it);
  } else {
    icon = `<span class="home-prow-glyph">•</span>`;
    label = _searchItemTitle(it) || tr('home.previewType.item');
  }
  const text = sub
    ? `<span class="home-prow-text"><span class="home-prow-title">${esc(label)}</span><span class="home-prow-domain">${esc(sub)}</span></span>`
    : `<span class="home-prow-text"><span class="home-prow-title">${esc(label)}</span></span>`;
  row.innerHTML = `${icon}${text}`;
  row.setAttribute('aria-label', tr('home.previewOpen', {
    type: tr(homePreviewTypeKey(it.type)),
    title: label,
  }));
  row.addEventListener('click', event => {
    openHomePreviewItem(workspaceId, it.id, returnFocusKey, event.currentTarget);
  });
  return row;
}

// Map a category to one of the bundled Locus icon assets (media/locus_icons_*).
// by keyword-matching its name, so home cards show a meaningful themed icon
// instead of the generic folder emoji. Returns the icon base name (set1-*) or
// null when nothing sensible matches (then we keep the category's own emoji so
// custom categories keep their identity).
const HOME_ICON_MAP = [
  [/research|stud(y|ies)|paper|academ|scholar/, 'research'],
  [/inspir|mood|aesthet/, 'inspiration'],
  [/read|queue|later|watch\s?list/, 'read-later'],
  [/tool|utilit|gadget|plugin/, 'tools'],
  [/project|portfolio/, 'projects'],
  [/task|to-?do|checklist/, 'tasks'],
  [/idea|brainstorm|concept/, 'ideas'],
  [/note|journal|memo/, 'notes'],
  [/design|figma|\bui\b|\bux\b/, 'design'],
  [/cod(e|ing)|dev|program|engineer|repo|git/, 'code'],
  [/\ba\.?i\.?\b|\bml\b|gpt|llm|machine\s?learn/, 'ai'],
  [/archiv|storage/, 'archive'],
  [/bookmark|favou?rite/, 'bookmarks'],
  [/article|blog|news|essay/, 'articles'],
  [/media|video|image|photo|music|film/, 'media'],
  [/librar/, 'library'],
  [/knowledge|wiki|docs?|documentation|reference|learn|course|tutorial/, 'knowledge'],
  [/snippet/, 'snippets'],
  [/source/, 'sources'],
  [/explore|discover|browse/, 'explore'],
  [/focus|deep\s?work/, 'focus'],
  [/highlight|clip/, 'highlights'],
  [/link|url|site|web|resource/, 'links'],
  [/work|office|job|client/, 'projects'],
];
function homeCardIconName(cat) {
  if (cat && cat.icon) return cat.icon; // explicit override (future-proof)
  const name = (cat && cat.name || '').toLowerCase();
  for (const [re, icon] of HOME_ICON_MAP) if (re.test(name)) return icon;
  return null;
}
// Themed icon markup for a category header. Emits both light/dark badge tiles
// tagged .ic-dark / .ic-light so the theme-aware CSS swaps them instantly on a
// theme change (no re-render needed). Falls back to the emoji when unmatched.
function homeCardIconHtml(cat) {
  const name = homeCardIconName(cat);
  if (!name) return `<span class="hcs-emoji">${esc(cat && cat.symbol || '🗂')}</span>`;
  const base = `media/locus_icons_one_folder_badge_nobg/set1-${name}`;
  return `<img class="hcs-img ic-dark" src="${base}-light.png" alt="" aria-hidden="true" decoding="async">` +
         `<img class="hcs-img ic-light" src="${base}-dark.png" alt="" aria-hidden="true" decoding="async">`;
}

function newestHomeItems(items, limit = 3) {
  return (items || [])
    .map((item, index) => ({ item, index, createdAt: Number(item?.createdAt) || 0 }))
    .sort((a, b) => b.createdAt - a.createdAt || b.index - a.index)
    .slice(0, limit)
    .map(entry => entry.item);
}

function buildHomeInboxZone() {
  const ws = activeWs();
  const cat = activeCat();
  const inbox = cat?.groups?.find(group => group.name === 'Inbox') || null;
  const items = inbox?.items || [];
  const section = document.createElement('section');
  section.className = 'home-loop-zone';
  section.setAttribute('aria-labelledby', 'home-loop-title');

  const header = document.createElement('div');
  header.className = 'home-loop-head';
  header.innerHTML = `
    <div>
      <h2 id="home-loop-title">${esc(tr('home.inboxZone'))}</h2>
      <p>${esc(tr('home.inboxHint'))}</p>
    </div>
    <span class="home-loop-count">${esc(tr('home.items', { n: items.length }))}</span>`;
  section.appendChild(header);

  const preview = document.createElement('div');
  preview.className = 'home-loop-preview';
  if (items.length) newestHomeItems(items).forEach(item => preview.appendChild(buildHomePreviewRow(item, {
    workspaceId: ws?.id,
    origin: `inbox:${cat?.id || ''}`,
  })));
  else {
    const empty = document.createElement('p');
    empty.className = 'home-card-empty';
    empty.textContent = tr('home.empty');
    preview.appendChild(empty);
  }
  section.appendChild(preview);

  const actions = document.createElement('div');
  actions.className = 'home-loop-actions';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn-primary';
  save.textContent = tr('action.saveTab');
  save.addEventListener('click', saveMostRecentOpenTab);
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'btn-secondary';
  open.textContent = tr('home.openInbox');
  open.disabled = !cat;
  open.addEventListener('click', () => {
    const target = cat.groups.find(group => group.name === 'Inbox');
    if (target) openGroupPage(target.id);
    else openCategory(cat.id);
  });
  actions.append(save, open);
  section.appendChild(actions);
  return section;
}

// Home surface renderer. Returns false (and drops the flag) if the workspace
// vanished, so renderBoard() falls through to the category board.
function renderHome() {
  const ws = activeWs();
  if (!ws) { activeHome = false; return false; }
  hideBreadcrumb();
  const $b = document.getElementById('board');
  $b.classList.remove('group-page-mode', 'list-mode', 'canvas-mode', 'explorer-mode', 'timeline-mode', 'gallery-mode', 'graph-mode', 'calendar-mode');
  $b.classList.add('home-mode');
  $b.innerHTML = '';

  // Greeting hero. The greeting WORD stays time-aware (morning/afternoon/evening).
  // The banner art follows the theme's mode rather than the clock: light themes
  // get the calm pastel morning scene (near-white band, matches the Waypoint
  // target); dark themes get the night scene so the banner doesn't glow bright
  // against a dark board. This is part of making a theme switch update the whole
  // visual system, not just the background.
  const hr = new Date().getHours();
  const tod = hr < 12 ? 'morning' : hr < 18 ? 'noon' : 'night';
  const heroSrc = activeThemeMode() === 'dark'
    ? 'media/png/night_transparent_corners.png'
    : 'media/png/morning_transparent_corners.png';
  const hero = document.createElement('div');
  hero.className = 'home-hero';
  hero.dataset.tod = tod;
  const greetingName = ((State.get().settings.profile && State.get().settings.profile.name) || '').trim();
  hero.innerHTML = `
    <img class="home-hero-bg" src="${heroSrc}" alt="" aria-hidden="true" decoding="async">
    <div class="home-hero-copy">
      <h1 class="home-greeting">${esc(greetingName
        ? tr('landing.greeting', { greeting: greetingWord(), name: greetingName })
        : tr('landing.greetingNoName', { greeting: greetingWord() }))}</h1>
      <p class="home-subtitle">${esc(homeSubtitle())}</p>
    </div>`;
  $b.appendChild(hero);

  // The core loop is the first actionable zone: capture into Inbox, then see
  // the same saved item here. Capability-heavy views stay out of this path.
  $b.appendChild(buildHomeInboxZone());

  const spacesHeading = document.createElement('h2');
  spacesHeading.className = 'home-zone-heading';
  spacesHeading.textContent = tr('home.recentSpaces');
  $b.appendChild(spacesHeading);

  // Show at most three Spaces. Until recency is measured, the active Space is
  // first and repository order is the deterministic fallback.
  const grid = document.createElement('div');
  grid.className = 'home-grid';

  if (!ws.categories.length) {
    grid.appendChild(buildSystemEmptyState({
      kind: 'space', title: tr('home.emptyTitle'), body: tr('home.emptyBody'),
      actions: [{ label: tr('palette.newSpace'), icon: '+', run: () => openOrganizationCreate('space') }],
      note: tr('empty.localNote'),
    }));
  }

  const activeCategory = activeCat();
  const visibleCategories = [activeCategory, ...ws.categories.filter(cat => cat !== activeCategory)]
    .filter(Boolean)
    .slice(0, 3);
  visibleCategories.forEach(cat => {
    const items = cat.groups.reduce((acc, g) => acc.concat(g.items), []);
    const card = document.createElement('article');
    card.className = 'home-card';
    card.dataset.catId = cat.id;
    card.style.setProperty('--home-accent', homeAccentColor(cat));

    const hd = document.createElement('div');
    hd.className = 'home-card-hd';
    hd.innerHTML = `
      <span class="home-card-sym${homeCardIconName(cat) ? ' has-img' : ''}">${homeCardIconHtml(cat)}</span>
      <div class="home-card-titles">
        <div class="home-card-name">${esc(cat.name)}</div>
        <div class="home-card-count">${esc(tr('home.items', { n: items.length }))}</div>
      </div>
      <button class="home-card-more" title="More" aria-label="More actions">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="1.3" fill="currentColor"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="12" cy="8" r="1.3" fill="currentColor"/></svg>
      </button>`;
    const homeMore = hd.querySelector('.home-card-more');
    homeMore.dataset.catId = cat.id;
    homeMore.title = tr('organization.space.actions', { name: cat.name });
    homeMore.setAttribute('aria-label', tr('organization.space.actions', { name: cat.name }));
    homeMore.addEventListener('click', e => {
      e.stopPropagation();
      showAnchoredContextMenu(homeMore, [
        { text: 'Open', icon: cmIcons.open, action: () => openCategory(cat.id) },
        { text: tr('organization.renameMenu'), icon: cmIcons.edit, action: () => openOrganizationName('space', cat.id, homeMore) },
        categoryReminderMenuItem(cat),
        ws.categories.length > 1 ? { text: tr('organization.space.delete'), icon: cmIcons.delete, danger: true, action: () => openOrganizationDelete('space', cat.id, homeMore) } : null,
      ].filter(Boolean));
    });
    card.appendChild(hd);

    const main = document.createElement('div');
    main.className = 'home-card-main';
    const body = document.createElement('div');
    body.className = 'home-card-body';
    if (!items.length) {
      const em = document.createElement('div');
      em.className = 'home-card-empty';
      em.textContent = tr('home.empty');
      body.appendChild(em);
    } else {
      newestHomeItems(items).forEach(it => body.appendChild(buildHomePreviewRow(it, {
        workspaceId: ws.id,
        origin: `space:${cat.id}`,
      })));
    }
    main.appendChild(body);
    // Derived accent panel: a category-tinted gradient with the category glyph —
    // a calm decorative echo of Waypoint's card art (no fabricated screenshots),
    // shown only when the card has enough content to balance it.
    if (items.length >= 3) {
      const accent = document.createElement('div');
      accent.className = 'home-card-accent';
      accent.setAttribute('aria-hidden', 'true');
      accent.innerHTML = `<span class="home-card-accent-glyph">${esc(cat.symbol || '🗂')}</span>`;
      main.appendChild(accent);
      card.classList.add('has-accent');
    }
    card.appendChild(main);

    const ft = document.createElement('button');
    ft.className = 'home-card-viewall';
    ft.type = 'button';
    ft.innerHTML = `<span>${esc(tr('home.viewAll'))}</span><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h7M6 3l3 3-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    card.appendChild(ft);

    const go = () => openCategory(cat.id);
    ft.addEventListener('click', go);

    // Drop a dragged tab onto a card to save it into that category's Inbox.
    card.addEventListener('dragover', e => {
      if (drag?.kind === 'tab' || drag?.kind === 'tabs-multi') { e.preventDefault(); card.classList.add('drop-target'); }
    });
    card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
    card.addEventListener('drop', async e => {
      if (drag?.kind === 'tab' || drag?.kind === 'tabs-multi') { e.preventDefault(); card.classList.remove('drop-target'); await dropTabsIntoCategory(cat); }
    });

    grid.appendChild(card);
  });

  $b.appendChild(grid);
  return true;
}

// A stable accent color for a category card: prefers a real group color from the
// category, else a hue hashed from its id/name so each card reads distinct.
function homeAccentColor(cat) {
  const g = (cat.groups || []).find(x => x.color && x.name !== 'Inbox');
  if (g && g.color) return g.color;
  const palette = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7'];
  const s = String(cat.id || cat.name || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

// The full-width "collections" strip (Waypoint's Projects row). Renders the
// promoted category's groups as horizontal tiles — each a group-tinted thumbnail
// with the group glyph, its name, and a link count. Real data, no fake imagery.
function buildProjectsRow(cat, ws) {
  const linkCount = cat.groups.reduce((n, g) => n + g.items.length, 0);
  const card = document.createElement('div');
  card.className = 'home-card home-card-wide';
  card.style.setProperty('--home-accent', homeAccentColor(cat));

  const hd = document.createElement('div');
  hd.className = 'home-card-hd';
  hd.innerHTML = `
    <span class="home-card-sym${homeCardIconName(cat) ? ' has-img' : ''}">${homeCardIconHtml(cat)}</span>
    <div class="home-card-titles">
      <div class="home-card-name">${esc(cat.name)}</div>
      <div class="home-card-count">${linkCount} ${linkCount === 1 ? 'link' : 'links'} · ${cat.groups.length} ${cat.groups.length === 1 ? 'collection' : 'collections'}</div>
    </div>`;
  card.appendChild(hd);

  const strip = document.createElement('div');
  strip.className = 'home-proj-strip';
  cat.groups.forEach(g => {
    const tile = document.createElement('button');
    tile.className = 'home-proj-tile';
    tile.type = 'button';
    tile.title = g.name;
    tile.style.setProperty('--proj-tint', g.color || homeAccentColor(cat));
    tile.innerHTML = `
      <div class="home-proj-thumb"><span>${esc(g.symbol || '📁')}</span></div>
      <div class="home-proj-meta">
        <div class="home-proj-name">${esc(g.name)}</div>
        <div class="home-proj-count">${g.items.length} ${g.items.length === 1 ? 'link' : 'links'}</div>
      </div>`;
    tile.addEventListener('click', () => openGroupPage(g.id));
    strip.appendChild(tile);
  });
  card.appendChild(strip);

  return card;
}

// SPACES list in the left nav — one entry per category, plus the smart-view
// counts. Called from renderCategoryTabs() and renderBoard() so counts and the
// active highlight stay fresh across every mutation.
function renderSpaceNav() {
  const ws = activeWs();
  const $nav = document.getElementById('space-nav');
  if ($nav && ws) {
    $nav.innerHTML = '';
    ws.categories.forEach((cat, categoryIndex) => {
      const count = cat.groups.reduce((n, g) => n + g.items.length, 0);
      const el = document.createElement('button');
      const inbox = cat.groups.find(g => g.name === 'Inbox');
      const showingInbox = !!activeGroupPage && activeGroupPage.groupId === inbox?.id;
      el.className = 'space-item' + (!activeSearch && !activeHome && !activeLibraryMode && !activeCalendar && !showingInbox && cat.id === ws.activeCatId ? ' active' : '');
      el.dataset.catId = cat.id;
      const duplicateName = ws.categories.some((candidate, candidateIndex) => (
        candidateIndex !== categoryIndex && candidate.name === cat.name
      ));
      const position = duplicateName
        ? tr('organization.space.position', {
          position: categoryIndex + 1,
          count: ws.categories.length,
        })
        : '';
      el.setAttribute('aria-label', duplicateName
        ? tr('organization.space.duplicateLabel', { name: cat.name, position })
        : cat.name);
      el.innerHTML =
        `<span class="space-sym">${esc(cat.symbol || '🗂')}</span>` +
        `<span class="space-name">${esc(cat.name)}</span>` +
        `<span class="nav-count">${count}</span>`;
      el.onclick = () => openCategory(cat.id);
      enableKeyboardClick(el);
      bindAnchoredContextMenu(el, () => [
          { text: 'Open', icon: cmIcons.open, action: () => openCategory(cat.id) },
          { text: tr('organization.renameMenu'), icon: cmIcons.edit, action: () => openOrganizationName('space', cat.id, el) },
          categoryReminderMenuItem(cat),
          ws.categories.length > 1 ? { text: tr('organization.space.delete'), icon: cmIcons.delete, danger: true, action: () => openOrganizationDelete('space', cat.id, el) } : null
        ].filter(Boolean));
      // Drop a dragged tab onto a space to save it into that category's Inbox.
      el.ondragover = e => { if (drag?.kind === 'tab' || drag?.kind === 'tabs-multi') { e.preventDefault(); el.classList.add('drop-target'); } };
      el.ondragleave = () => el.classList.remove('drop-target');
      el.ondrop = async e => { if (drag?.kind === 'tab' || drag?.kind === 'tabs-multi') { e.preventDefault(); el.classList.remove('drop-target'); await dropTabsIntoCategory(cat); } };
      $nav.appendChild(el);
    });
  }
  updateNavChrome();
}

// Refresh the smart-view counts and active states in the left nav.
function updateNavChrome() {
  const ws = activeWs();
  const s = State.get();
  const linkCount = ws ? collectWorkspaceTabs(ws).length : 0;
  const inbox = (() => { const cat = activeCat(); return cat ? cat.groups.find(g => g.name === 'Inbox') : null; })();
  const setCount = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val > 0 ? String(val) : ''; };
  setCount('nav-all-count', linkCount);
  const favoriteCount = ws ? collectWorkspaceTabs(ws).filter(row => row.item.favorite).length : 0;
  setCount('nav-favorites-count', favoriteCount);
  const readLaterCount = ws ? collectWorkspaceTabs(ws).filter(row => row.item.readLaterAt && !row.item.readAt).length : 0;
  setCount('nav-read-later-count', readLaterCount);
  setCount('nav-inbox-count', inbox ? inbox.items.length : 0);
  setCount('nav-archive-count', (s.archive || []).length);
  setCount('nav-trash-count', (s.trash || []).length);
  const home = document.getElementById('nav-home');
  if (home) home.classList.toggle('active', !!activeHome);
  const search = document.getElementById('nav-search');
  if (search) search.classList.toggle('active', !!activeSearch);
  const all = document.getElementById('nav-all');
  if (all) all.classList.toggle('active', activeLibraryMode === 'all');
  const favorites = document.getElementById('nav-favorites');
  if (favorites) favorites.classList.toggle('active', activeLibraryMode === 'favorites');
  const readLater = document.getElementById('nav-read-later');
  if (readLater) readLater.classList.toggle('active', activeLibraryMode === 'read-later');
  const archive = document.getElementById('nav-archive');
  if (archive) archive.classList.toggle('active', activeLibraryMode === 'archive');
  const trash = document.getElementById('nav-trash');
  if (trash) trash.classList.toggle('active', activeLibraryMode === 'trash');
  const inboxNav = document.getElementById('nav-inbox');
  if (inboxNav) {
    const catName = activeCat()?.name || '';
    const scopedLabel = catName ? `${tr('nav.inbox')} · ${catName}` : tr('nav.inbox');
    inboxNav.classList.toggle('active', !!activeGroupPage && activeGroupPage.groupId === (inbox && inbox.id));
    inboxNav.setAttribute('aria-label', scopedLabel);
    inboxNav.title = scopedLabel;
    const label = inboxNav.querySelector('.nav-lbl');
    if (label) label.textContent = scopedLabel;
  }
  const moreNav = document.getElementById('nav-more');
  if (moreNav) moreNav.classList.toggle('active', !!activeSearch || !!activeCalendar || ['favorites', 'read-later', 'archive', 'trash'].includes(activeLibraryMode));
  // Topbar app-menu chip: initial from the active workspace name + a pending
  // reminder dot (the reminder signal moved here when the bell became Plugins;
  // the menu itself exposes "Calendar & reminders" with the live count).
  const face = document.getElementById('avatar-face');
  if (face && ws) face.textContent = (ws.name || '?').trim().charAt(0).toUpperCase() || '?';
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) {
    let pending = 0;
    try { pending = collectPendingReminders({ scope: ws ? ws.id : undefined }).length; } catch {}
    menuBtn.classList.toggle('has-notif', pending > 0);
    menuBtn.title = pending > 0 ? `${tr('action.menu')} · ${pending} ${tr('action.reminders').toLowerCase()}` : tr('action.menu');
    _pendingReminderCount = pending;
  }
}
// Cached pending-reminder count so openAppMenu can label the Calendar entry
// without recomputing on every open.
let _pendingReminderCount = 0;

// The bento-board layout itself (formerly the body of renderBoard).
function renderBoardView() {
  const $b = document.getElementById('board');
  $b.classList.remove('list-mode', 'canvas-mode');
  $b.innerHTML = '';
  const cat = activeCat(); if (!cat) return;

  if (!cat.groups.length) {
    $b.appendChild(buildEmptySpaceState(cat));
    return;
  }

  cat.groups.forEach(g => $b.appendChild(buildGroupCol(g)));

  // Add group placeholder
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'add-col-btn';
  add.innerHTML = `<svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> <span>${esc(tr('groupAction.new'))}</span>`;
  add.onclick = event => {
    const workspace = activeWs();
    openIdentityEditor('group', 'create', {
      workspaceId: workspace?.id,
      spaceId: cat.id,
    }, event.currentTarget);
  };
  $b.appendChild(add);
  applySearchFilter();
}

function buildGroupCol(g) {
  const col = document.createElement('div');
  col.className = 'gcol' + (g.collapsed ? ' collapsed' : '');
  col.dataset.gid = g.id;
  col.style.setProperty('--gcol-tint', g.color);

  // Todo counter
  const todos = g.items.filter(it => it.type === 'todo');
  const done = todos.filter(it => it.done).length;
  const todoStr = todos.length ? `<span class="todo-count${done === todos.length ? ' all-done' : ''}">${done}/${todos.length}</span>` : '';

  const itemCnt = g.items.length;
  col.innerHTML = `
    <div class="gcol-hd" role="group" aria-label="${esc(tr('groupAction.aria', { name: g.name }))}">
      <button class="gcol-sym-wrap" type="button" style="background:${esc(g.color)}22" aria-label="${esc(tr('groupAction.editFor', { name: g.name }))}">
        <span>${esc(g.symbol || '📁')}</span>
      </button>
      <div class="gcol-info">
        <span class="gcol-name" title="${esc(g.name)}">${esc(g.name)}</span>
        <div class="gcol-meta">
          <button class="chev gcol-toggle" type="button" aria-expanded="${!g.collapsed}" aria-label="${esc(tr(g.collapsed ? 'groupAction.expandFor' : 'groupAction.collapseFor', { name: g.name }))}"><svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M2 3l2 2 2-2" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg></button>
          <span>${esc(itemCnt === 1 ? tr('groupAction.oneItem') : tr('groupAction.items', { count: itemCnt }))}</span>
          ${todoStr}
        </div>
        ${renderIntentPills(g)}
      </div>
      <div class="gcol-acts">
        <button class="gcol-btn go" data-act="open-all" title="${esc(tr('groupAction.openAll'))}" aria-label="${esc(tr('groupAction.openAll'))}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2.5H2a1 1 0 00-1 1v6.5A1 1 0 002 11h6.5a1 1 0 001-1V8M7 1h4m0 0v4M11 1L5.5 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="gcol-btn focus" data-act="focus" title="${esc(tr('groupAction.openAsPage'))}" aria-label="${esc(tr('groupAction.openAsPage'))}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4V2h2M10 4V2H8M2 8v2h2M10 8v2H8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="gcol-btn" data-act="more" title="${esc(tr('groupAction.more'))}" aria-label="${esc(tr('groupAction.moreFor', { name: g.name }))}" aria-haspopup="menu">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="2.5" cy="6" r="1" fill="currentColor"/><circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="9.5" cy="6" r="1" fill="currentColor"/></svg>
        </button>
      </div>
    </div>
    <div class="gcol-scroll-wrap">
      <div class="gcol-cards"></div>
    </div>
    <div class="gcol-ft">
      <button class="primary" data-act="add-tab" title="Add selected sidebar tabs or the active browser tab">
        <svg width="10" height="10" viewBox="0 0 11 11"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <span>Add tab</span>
      </button>
      <button data-act="add-note" title="Add note" aria-label="Add note">
        <svg width="10" height="10" viewBox="0 0 11 11" fill="none"><path d="M2 1.5h5l2 2V9a0.5 0.5 0 01-.5.5H2a0.5 0.5 0 01-.5-.5V2a0.5 0.5 0 01.5-.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
        <span>Note</span>
      </button>
      <button data-act="add-todo" title="Add to-do" aria-label="Add to-do">
        <svg width="10" height="10" viewBox="0 0 11 11" fill="none"><rect x="1.5" y="1.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M3.5 5.5l1.5 1.5 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>To-do</span>
      </button>
      <button data-act="add-stack" title="${esc(tr('groupAction.addStack'))}" aria-label="${esc(tr('groupAction.addStack'))}">
        <svg width="10" height="10" viewBox="0 0 11 11" fill="none"><path d="M2 3l3.5-1.5L9 3 5.5 4.5 2 3zM2 5.5L5.5 7 9 5.5M2 8L5.5 9.5 9 8" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
        <span>${esc(tr('groupAction.addStack').replace(/…$/, ''))}</span>
      </button>
    </div>
    <div class="gcol-resize"></div>
    <div class="gcol-resize-corner" title="Resize"></div>
  `;

  // Header
  const hd = col.querySelector('.gcol-hd');
  const toggleButton = col.querySelector('.gcol-toggle');
  const toggleCollapse = () => {
    State.snapshot('Toggle collapse');
    g.collapsed = !g.collapsed;
    col.classList.toggle('collapsed');
    toggleButton.setAttribute('aria-expanded', String(!g.collapsed));
    toggleButton.setAttribute('aria-label', tr(g.collapsed ? 'groupAction.expandFor' : 'groupAction.collapseFor', { name: g.name }));
    State.persist();
  };
  hd.addEventListener('click', e => {
    if (e.target.closest('button') || e.target.closest('.gcol-sym-wrap') || e.target.closest('.gcol-acts')) return;
    toggleCollapse();
  });
  toggleButton.addEventListener('click', e => { e.stopPropagation(); toggleCollapse(); });
  // Group menu — shared by right-click and the header's compact "More…" button,
  // so every group action stays reachable even though the hover row now shows
  // only the two most-used shortcuts (Open all / Open as page).
  const openGroupMenu = (x, y, opener = toggleButton) => {
    const identity = identityGroupTarget(g.id);
    const identityParams = {
      workspaceId: identity?.workspace.id,
      spaceId: identity?.space.id,
      groupId: g.id,
    };
    const items = [
      { text: tr('groupAction.edit'), icon: cmIcons.edit, action: () => openIdentityEditor('group', 'edit', identityParams, opener) },
      { text: tr('groupAction.editIntention'), icon: cmIcons.edit, action: () => openIntentEditor('group', g.id) },
      { text: tr('groupAction.setReminder'), icon: cmIcons.clock, action: () => openEntityReminderPicker('group', g.id) },
      { text: tr(g.collapsed ? 'groupAction.expand' : 'groupAction.collapse'), icon: cmIcons.edit, action: () => { State.snapshot('Toggle'); g.collapsed = !g.collapsed; State.persist(); renderBoard(); } },
      { sep: true },
      { text: tr('groupAction.openAll'), icon: cmIcons.open, action: () => openGroupAll(g.id) },
      { text: tr('groupAction.openAsPage'), icon: cmIcons.expand || cmIcons.open, action: () => openGroupPage(g.id) },
      { text: tr('groupAction.duplicate'), icon: cmIcons.copy, action: () => openIdentityEditor('group', 'duplicate', identityParams, opener) },
      { text: tr('groupAction.addStack'), icon: cmIcons.stack, action: () => openIdentityEditor('stack', 'create', identityParams, opener) },
    ];
    items.push({ sep: true });
    items.push(...organizationGroupMoveMenuItems(g.id, opener));
    items.push({ sep: true });
    items.push({ text: tr('groupAction.archive'), icon: cmIcons.archive, action: () => archiveGroup(g.id) });
    showContextMenu(x, y, items, { focusFirst: true });
  };
  // Right-click on group
  hd.addEventListener('contextmenu', e => {
    e.preventDefault();
    focusDialogOpener(toggleButton);
    openGroupMenu(e.pageX, e.pageY, toggleButton);
  });

  // Symbol
  col.querySelector('.gcol-sym-wrap').addEventListener('click', (e) => {
    e.stopPropagation();
    const identity = identityGroupTarget(g.id);
    openIdentityEditor('group', 'edit', {
      workspaceId: identity?.workspace.id,
      spaceId: identity?.space.id,
      groupId: g.id,
      focusField: 'symbol',
    }, e.currentTarget);
  });

  // Action buttons
  col.querySelectorAll('.gcol-acts .gcol-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const act = btn.dataset.act;
      if (act === 'open-all') openGroupAll(g.id);
      else if (act === 'focus') openGroupPage(g.id);
      else if (act === 'more') {
        const r = btn.getBoundingClientRect();
        openGroupMenu(r.left, r.bottom + 6, btn);
      }
    });
  });

  // Add-buttons
  col.querySelectorAll('.gcol-ft button').forEach(btn => {
    btn.addEventListener('click', async event => {
      const act = btn.dataset.act;
      if (act === 'add-tab') {
        await addSidebarOrActiveTabToGroup(g);
      } else if (act === 'add-note') {
        State.snapshot('Add note');
        const n = stampNew({ id: uid(), type:'note', html:'' });
        g.items.push(n); State.persist(); renderBoard();
        setTimeout(() => { const el = document.querySelector(`[data-id="${n.id}"] .note-text`); if (el) el.focus(); }, 30);
      } else if (act === 'add-todo') {
        State.snapshot('Add todo');
        const t = stampNew({ id: uid(), type:'todo', text:'', done:false });
        g.items.push(t); State.persist(); renderBoard();
        setTimeout(() => { const el = document.querySelector(`[data-id="${t.id}"] .todo-text`); if (el) el.focus(); }, 30);
      } else if (act === 'add-stack') {
        const identity = identityGroupTarget(g.id);
        openIdentityEditor('stack', 'create', {
          workspaceId: identity?.workspace.id,
          spaceId: identity?.space.id,
          groupId: g.id,
        }, event.currentTarget);
      }
    });
  });

  // Items
  const cardsEl = col.querySelector('.gcol-cards');
  const scrollWrap = col.querySelector('.gcol-scroll-wrap');
  if (!g.items.length) {
    const isInbox = g.name === 'Inbox';
    cardsEl.appendChild(buildSystemEmptyState({
      kind: isInbox ? 'inbox' : 'space',
      title: isInbox ? tr('empty.inboxTitle') : tr('empty.spaceTitle', { space: g.name }),
      body: isInbox ? tr('empty.inboxBody') : tr('empty.spaceBody'),
      actions: isInbox
        ? [
            { label: tr('empty.addSave'), icon: '+', run: () => openCommandPalette() },
            { label: tr('empty.importBookmarks'), icon: '⇩', run: () => importBookmarks() },
          ]
        : [
            { label: tr('empty.addNote'), icon: '+', run: () => col.querySelector('.gcol-ft [data-act="add-note"]')?.click() },
            { label: tr('empty.addSave'), icon: '↗', run: () => addSidebarOrActiveTabToGroup(g) },
          ],
      compact: true,
    }));
  } else {
    g.items.forEach(it => cardsEl.appendChild(buildItem(it, g.items, g)));
  }
  makeGroupDropZone(cardsEl, col, g, g.items);

  // Scroll fade indicators
  const updateFade = () => {
    if (!scrollWrap) return;
    const atTop = cardsEl.scrollTop > 4;
    const atBot = cardsEl.scrollHeight - cardsEl.scrollTop - cardsEl.clientHeight > 4;
    scrollWrap.classList.toggle('scroll-top', atTop);
    scrollWrap.classList.toggle('scroll-bot', atBot);
  };
  cardsEl.addEventListener('scroll', updateFade, { passive: true });
  requestAnimationFrame(updateFade);

  // Column reorder (drag group header)
  col.addEventListener('dragstart', e => {
    if (e.target.closest('input') || e.target.closest('button') || e.target.closest('.item') || e.target.closest('.gcol-resize') || e.target.closest('.gcol-acts')) return;
    drag = { kind:'group', srcId: g.id };
    col.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  col.addEventListener('dragend', () => { col.classList.remove('dragging'); document.querySelectorAll('.gcol').forEach(x => { x.classList.remove('drop-before'); x.classList.remove('drop-after'); }); drag = null; });
  col.addEventListener('dragover', e => {
    if (drag?.kind === 'group' && drag.srcId !== g.id) {
      e.preventDefault();
      const r = col.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      document.querySelectorAll('.gcol').forEach(x => { x.classList.remove('drop-before'); x.classList.remove('drop-after'); });
      col.classList.add(after ? 'drop-after' : 'drop-before');
    }
  });
  col.addEventListener('drop', e => {
    if (drag?.kind === 'group' && drag.srcId !== g.id) {
      e.preventDefault();
      const cat = activeCat();
      const r = col.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      State.snapshot('Reorder groups');
      const srcIdx = cat.groups.findIndex(x => x.id === drag.srcId);
      const [src] = cat.groups.splice(srcIdx, 1);
      let tgtIdx = cat.groups.findIndex(x => x.id === g.id);
      if (after) tgtIdx++;
      cat.groups.splice(tgtIdx, 0, src);
      State.persist(); renderBoard();
    }
  });
  col.draggable = true;

  // Apply saved size
  const savedSize = State.get().columnSizes?.[g.id] ?? State.get().columnWidths?.[g.id];
  if (savedSize) {
    if (typeof savedSize === 'number') col.style.width = savedSize + 'px';
    else {
      if (savedSize.w) col.style.width = savedSize.w + 'px';
      if (savedSize.h) {
        const cards = col.querySelector('.gcol-cards');
        if (cards) { cards.style.maxHeight = savedSize.h + 'px'; cards.style.height = savedSize.h + 'px'; }
      }
    }
  }

  // Resize handles (corner = both axes)
  const resizerH = col.querySelector('.gcol-resize');
  const resizerCorner = col.querySelector('.gcol-resize-corner');
  let resizing = null; // 'h' | 'corner' | null
  let startX = 0, startY = 0, startW = 0, startH = 0;
  const cardsEl2 = col.querySelector('.gcol-cards');

  function beginResize(mode, e) {
    resizing = mode;
    startX = e.clientX; startY = e.clientY;
    startW = col.offsetWidth;
    startH = cardsEl2 ? cardsEl2.offsetHeight : 0;
    document.body.classList.add('resizing');
    e.preventDefault();
  }
  resizerH.addEventListener('mousedown', e => beginResize('h', e));
  if (resizerCorner) resizerCorner.addEventListener('mousedown', e => beginResize('corner', e));

  const onMove = rafThrottle(e => {
    if (!resizing) return;
    if (resizing === 'h' || resizing === 'corner') {
      const w = Math.max(200, Math.min(900, startW + (e.clientX - startX)));
      col.style.width = w + 'px';
    }
    if ((resizing === 'corner') && cardsEl2) {
      const h = Math.max(120, Math.min(window.innerHeight - 200, startH + (e.clientY - startY)));
      cardsEl2.style.maxHeight = h + 'px';
      cardsEl2.style.height = h + 'px';
    }
  });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', () => {
    if (!resizing) return;
    document.body.classList.remove('resizing');
    if (!State.get().columnSizes) State.get().columnSizes = {};
    State.get().columnSizes[g.id] = {
      w: col.offsetWidth,
      h: cardsEl2 ? cardsEl2.offsetHeight : null
    };
    State.persist();
    resizing = null;
  });

  return col;
}

// ════════════════════════════════════════════════════════════════
// ITEMS
// ════════════════════════════════════════════════════════════════
function buildItem(it, parentItems, group) {
  let el;
  if (it.type === 'note') el = buildNote(it, parentItems, group);
  else if (it.type === 'todo') el = buildTodo(it, parentItems, group);
  else if (it.type === 'stack') el = buildStack(it, parentItems, group);
  else el = buildTab(it, parentItems, group);
  attachItemSelection(el, it);
  return el;
}

function commonActs(it, extra = []) {
  const acts = [
    { text: tr('itemAction.details'), icon: cmIcons.detail, action: () => openItemDetail(it.id) },
    ...(it.type === 'tab' ? [{ text: it.favorite ? 'Remove from Favorites' : 'Add to Favorites', icon: cmIcons.favorite, action: () => toggleFavorite(it) }] : []),
    ...(it.type === 'tab' ? [{ text: it.readLaterAt ? 'Remove from Read Later' : 'Save to Read Later', icon: cmIcons.readLater, action: () => toggleReadLater(it) }] : []),
    ...(it.type === 'stack' ? [] : [{ text: tr('itemAction.editColor'), icon: cmIcons.color, action: () => showColorMenu(null, it) }]),
    { text: tr('itemAction.setReminder'), icon: cmIcons.clock, action: () => openReminderPicker(it.id) },
    ...(it.reminder ? [{ text: tr('itemAction.clearReminder'), icon: cmIcons.clock, action: () => clearReminder(it.id) }] : []),
    ...extra,
    { sep: true },
    { text: tr('itemAction.archive'), icon: cmIcons.archive, action: () => archiveItem(it.id) }
  ];
  return acts;
}

function renderReminderBadge(it) {
  const now = Date.now();
  const at = pendingReminderTime(it.reminder, now);
  if (at == null) return '';
  const past = at < now;
  const cls = past ? 'past' : (at - now < 86400000 ? '' : 'future');
  return `<span class="rem-badge ${cls}"><svg width="8" height="8" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M6 3v3l2 1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>${fmtTimeRelative(at)}</span>`;
}

function attachItemSelection(el, it) {
  const chk = document.createElement('span');
  chk.className = 'item-check';
  chk.setAttribute('aria-label', 'Select');
  if (selectedItemIds.has(it.id)) { chk.classList.add('checked'); el.classList.add('item-selected'); }
  chk.addEventListener('click', (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    if (ev.shiftKey) selectRangeTo(it.id);
    else toggleItemSelect(it.id);
  });
  // Place inside item-top (flex row with fav + title) for tabs/notes/todos
  // For stacks, place inside stack-hd
  const target = el.querySelector('.item-top') || el.querySelector('.stack-hd') || el;
  target.insertBefore(chk, target.firstChild);

  // Whole-item click toggles selection when in selection mode
  el.addEventListener('click', (ev) => {
    if (!itemSelMode && !ev.shiftKey) return;
    // Don't capture clicks on the checkbox itself or buttons
    if (ev.target.closest('.item-check') || ev.target.closest('button') || ev.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    ev.stopPropagation();
    ev.preventDefault();
    if (ev.shiftKey) selectRangeTo(it.id);
    else toggleItemSelect(it.id);
  }, true);  // capture phase to beat link openers
}

function visibleItemSelectionOrder() {
  const root = document.getElementById('board') || document;
  return Array.from(root.querySelectorAll('.item[data-id], .lv-stack[data-id]'))
    .filter(el => {
      if (el.classList.contains('hidden') || !el.getClientRects().length) return false;
      const closedStack = el.parentElement?.closest('.stack:not(.expanded):not(.search-expand), .lv-stack:not(.expanded):not(.search-expand)');
      return !closedStack;
    })
    .map(el => el.dataset.id)
    .filter(id => id && findItem(id));
}

// Range selection in the current visual order, with a data-list fallback.
function selectRangeTo(itemId) {
  if (!lastSelectedItemId) {
    selectedItemIds.add(itemId);
    lastSelectedItemId = itemId;
    syncItemSelMode();
    renderBoard();
    renderItemSelToolbar();
    return;
  }
  const order = visibleItemSelectionOrder();
  const aI = order.indexOf(lastSelectedItemId);
  const bI = order.indexOf(itemId);
  if (aI > -1 && bI > -1) {
    const [lo, hi] = aI < bI ? [aI, bI] : [bI, aI];
    for (let i = lo; i <= hi; i++) selectedItemIds.add(order[i]);
    lastSelectedItemId = itemId;
    syncItemSelMode();
    renderBoard();
    renderItemSelToolbar();
    return;
  }
  const a = findItem(lastSelectedItemId), b = findItem(itemId);
  if (!a || !b || a.parent !== b.parent) { toggleItemSelect(itemId); lastSelectedItemId = itemId; return; }
  const [lo, hi] = a.index < b.index ? [a.index, b.index] : [b.index, a.index];
  for (let i = lo; i <= hi; i++) selectedItemIds.add(a.parent[i].id);
  lastSelectedItemId = itemId;
  syncItemSelMode();
  renderBoard();
  renderItemSelToolbar();
}

// Decorate a freshly-built item card with the §4.2 metadata: expose tags to the
// tag: search operator (dataset.tags), paint an optional cover chip, surface tag
// chips, and flag cards that carry hidden detail so the board hints at it. Called
// at the tail of every item builder so all kinds get it uniformly.
function applyItemMeta(el, it) {
  const tags = Array.isArray(it.tags) ? it.tags.filter(Boolean) : [];
  if (tags.length) el.dataset.tags = tags.map(t => String(t).toLowerCase()).join(',');

  // Stacks are containers with their own header-first layout; only expose their
  // tags to search and skip the card-style cover/chip/meta chrome.
  if (it.type === 'stack') return;

  if (it.cover) {
    const cov = document.createElement('div');
    cov.className = 'item-cover';
    if (it.cover.emoji) { cov.classList.add('emoji'); cov.textContent = it.cover.emoji; }
    else if (it.cover.color) { cov.classList.add('color'); cov.style.background = it.cover.color; }
    el.insertBefore(cov, el.firstChild);
    el.classList.add('has-cover');
  }

  if (tags.length) {
    const wrap = document.createElement('div');
    wrap.className = 'item-tags';
    tags.slice(0, 4).forEach(t => { const c = document.createElement('span'); c.className = 'item-tag'; c.textContent = t; wrap.appendChild(c); });
    if (tags.length > 4) { const m = document.createElement('span'); m.className = 'item-tag more'; m.textContent = '+' + (tags.length - 4); wrap.appendChild(m); }
    el.appendChild(wrap);
  }

  const checked = Array.isArray(it.checklist) ? it.checklist.filter(x => x.done).length : 0;
  const total = Array.isArray(it.checklist) ? it.checklist.length : 0;
  const hasNotes = !!(it.notes && it.notes.replace(/<[^>]*>/g, '').trim());
  const hasFields = Array.isArray(it.customFields) && it.customFields.length > 0;
  if (hasNotes || total || hasFields) {
    el.classList.add('has-detail');
    const meta = document.createElement('div');
    meta.className = 'item-detail-meta';
    const bits = [];
    if (hasNotes) bits.push('<span class="idm-note" title="Has notes">✎</span>');
    if (total) bits.push(`<span class="idm-check" title="Checklist">☑ ${checked}/${total}</span>`);
    if (hasFields) bits.push(`<span class="idm-fields" title="Custom fields">⋯ ${it.customFields.length}</span>`);
    meta.innerHTML = bits.join('');
    meta.title = 'Open details';
    meta.addEventListener('click', e => { e.stopPropagation(); openItemDetail(it.id); });
    el.appendChild(meta);
  }
}

function buildTab(it, parentItems, group) {
  const el = document.createElement('div');
  el.className = 'item tab';
  el.dataset.id = it.id;
  el.tabIndex = 0;
  if (it.color) el.dataset.color = it.color;
  // Expose the URL for the domain:/site:/url: search operators. dataset.host is the
  // bare hostname (matched by domain:/site:), dataset.url the full URL (matched by url:).
  // Stored lowercase so the operator parse (which lowercases the query) can substring-match.
  if (it.url) {
    el.dataset.url = it.url.toLowerCase();
    try { el.dataset.host = new URL(it.url).hostname.toLowerCase(); } catch {}
  }
  el.draggable = true;

  const fav = favUrl(it.url) || BLANK_FAV;
  el.innerHTML = `
    ${renderReminderBadge(it)}
    <div class="item-top">
      <img class="item-fav" src="${esc(fav)}" alt="" loading="lazy" decoding="async">
      <span class="item-title">${esc(it.title)}</span>
      <div class="item-acts">
        <button class="item-btn" data-act="detail" title="Details">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M7 1.5v9M3.2 4h2.2M3.2 6h2.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>
        </button>
        <button class="item-btn" data-act="open" title="Open in new tab">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M4 2.5H2a1 1 0 00-1 1v6.5A1 1 0 002 11h6.5a1 1 0 001-1V8M7 1h4m0 0v4M11 1L5.5 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="item-btn danger" data-act="del" title="Archive">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
    <div class="item-url">${esc(dispUrl(it.url))}</div>`;

  el.querySelector('.item-title').addEventListener('click', () => openTabMaybeHibernated(it.url, { focus: true }));
  el.querySelectorAll('.item-btn').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const act = b.dataset.act;
      if (act === 'open') openTabMaybeHibernated(it.url);
      else if (act === 'detail') openItemDetail(it.id);
      else if (act === 'del') archiveItem(it.id);
    });
  });
  el.addEventListener('contextmenu', e => {
    e.preventDefault();
    showContextMenu(e.pageX, e.pageY, [
      { text:'Open (focused)', icon: cmIcons.open, action: () => openTabMaybeHibernated(it.url, { focus: true }) },
      { text:'Open in background', icon: cmIcons.open, action: () => openTabMaybeHibernated(it.url, { focus: false }) },
      { text:'Copy URL', icon: cmIcons.copy, action: () => { navigator.clipboard.writeText(it.url); toast('URL copied'); } },
      { text:'Edit title…', icon: cmIcons.edit, action: () => { const n = prompt('Title:', it.title); if (n) { State.snapshot('Rename tab'); it.title = n; State.persist(); renderBoard(); } } },
      ...commonActs(it)
    ]);
  });
  applyItemMeta(el, it);
  attachItemDrag(el, it, parentItems, group);
  return el;
}

function buildNote(it, parentItems, group) {
  const el = document.createElement('div');
  el.className = 'item note';
  el.dataset.id = it.id;
  el.tabIndex = 0;
  if (it.color) el.dataset.color = it.color;
  el.draggable = true;

  const html = sanitizeHtml(it.html || '');
  el.innerHTML = `
    ${renderReminderBadge(it)}
    <div class="item-top" style="align-items:flex-start;">
      <div class="note-text" contenteditable="true" spellcheck="false">${html}</div>
      <div class="item-acts">
        <button class="item-btn danger" data-act="del" title="Archive">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>`;

  const txt = el.querySelector('.note-text');
  let savedHtml = html;
  txt.addEventListener('blur', () => {
    const plainT = txt.textContent.trim();
    // Slash commands
    if (plainT === '/todo' || plainT === '/t') {
      State.snapshot('Convert to todo');
      const info = findItem(it.id);
      if (info) info.parent[info.index] = { id: it.id, type:'todo', text:'', done:false, color: it.color || null };
      State.persist(); renderBoard(); return;
    }
    if (/^\/(red|orange|yellow|green|blue)$/i.test(plainT)) {
      State.snapshot('Color');
      it.color = plainT.slice(1).toLowerCase();
      it.html = '';
      State.persist(); renderBoard(); return;
    }
    if (/^\/clear$/i.test(plainT)) { State.snapshot('Clear color'); delete it.color; it.html = ''; State.persist(); renderBoard(); return; }

    const newHtml = sanitizeHtml(txt.innerHTML);
    if (newHtml !== savedHtml) {
      State.snapshot('Edit note');
      it.html = autoLinkify(newHtml);
      savedHtml = it.html;
      State.persist();
    }
  });
  txt.addEventListener('keydown', e => {
    if (e.key === 'Escape') txt.blur();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); document.execCommand('bold'); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); document.execCommand('italic'); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') { e.preventDefault(); document.execCommand('underline'); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); rtCreateLink(); }
  });

  el.querySelector('.item-btn.danger').addEventListener('click', e => { e.stopPropagation(); archiveItem(it.id); });
  el.addEventListener('contextmenu', e => {
    if (window.getSelection().toString()) return;
    e.preventDefault();
    showContextMenu(e.pageX, e.pageY, [
      { text:'Edit', icon: cmIcons.edit, action: () => txt.focus() },
      ...commonActs(it)
    ]);
  });
  applyItemMeta(el, it);
  attachItemDrag(el, it, parentItems, group);
  return el;
}

function autoLinkify(html) {
  // Only if not already linked
  const urlRe = /(?<!href=")(?<!>)(https?:\/\/[^\s<>"']+)/gi;
  return html.replace(urlRe, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

function buildTodo(it, parentItems, group) {
  const el = document.createElement('div');
  el.className = 'item todo' + (it.done ? ' done' : '');
  el.dataset.id = it.id;
  el.tabIndex = 0;
  if (it.color) el.dataset.color = it.color;
  el.draggable = true;

  el.innerHTML = `
    ${renderReminderBadge(it)}
    <div class="todo-check ${it.done ? 'checked' : ''}"></div>
    <div class="todo-text" contenteditable="true" spellcheck="false">${esc(it.text)}</div>
    <div class="item-acts-vert">
      <button class="item-btn danger" data-act="del" title="Archive">
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </button>
    </div>`;

  el.querySelector('.todo-check').addEventListener('click', e => {
    e.stopPropagation();
    State.snapshot('Toggle todo');
    it.done = !it.done;
    State.persist(); renderBoard();
  });
  const txt = el.querySelector('.todo-text');
  txt.addEventListener('blur', () => {
    const v = txt.textContent.trim();
    if (v === '/done') { State.snapshot('Mark done'); it.done = true; State.persist(); renderBoard(); return; }
    if (/^\/(red|orange|yellow|green|blue)$/i.test(v)) { State.snapshot('Color'); it.color = v.slice(1).toLowerCase(); it.text = ''; State.persist(); renderBoard(); return; }
    if (v !== it.text) { State.snapshot('Edit todo'); it.text = txt.textContent; State.persist(); }
  });
  txt.addEventListener('keydown', e => { if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); txt.blur(); } });

  el.querySelector('.item-btn.danger').addEventListener('click', e => { e.stopPropagation(); archiveItem(it.id); });
  el.addEventListener('contextmenu', e => {
    e.preventDefault();
    showContextMenu(e.pageX, e.pageY, [
      { text: it.done ? 'Mark not done' : 'Mark done', icon: cmIcons.edit, action: () => { State.snapshot('Toggle'); it.done = !it.done; State.persist(); renderBoard(); } },
      ...commonActs(it)
    ]);
  });
  applyItemMeta(el, it);
  attachItemDrag(el, it, parentItems, group);
  return el;
}

function buildStack(it, parentItems, group) {
  const el = document.createElement('div');
  el.className = 'item stack' + (it.expanded ? ' expanded' : '');
  el.dataset.id = it.id;
  el.tabIndex = -1;
  if (it.color) el.dataset.color = it.color;
  el.draggable = true;

  const cnt = (it.items || []).length;
  el.innerHTML = `
    <div class="stack-hd" role="group" aria-label="${esc(tr('stackAction.aria', { name: it.name || tr('stackEditor.defaultName') }))}">
      <button class="stack-chev stack-toggle" type="button" aria-expanded="${!!it.expanded}" aria-label="${esc(tr(it.expanded ? 'stackAction.collapseFor' : 'stackAction.expandFor', { name: it.name || tr('stackEditor.defaultName') }))}"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 4l2 2 2-2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg></button>
      <button class="stack-sym" type="button" aria-label="${esc(tr('stackAction.editFor', { name: it.name || tr('stackEditor.defaultName') }))}">${esc(it.symbol || '📚')}</button>
      <span class="stack-name">${esc(it.name || tr('stackEditor.defaultName'))}</span>
      <span class="stack-cnt">${cnt}</span>
      <button class="stack-intent-btn" type="button" title="${esc(tr('stackAction.editIntention'))}" aria-label="${esc(tr('stackAction.editIntention'))}">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1.5a3.6 3.6 0 013.6 3.6c0 2.2-1.5 3.2-3.1 3.8l-.2.1v1.5M6 10.8h.01" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
      </button>
    </div>
    ${renderIntentPills(it)}
    <div class="stack-items"></div>`;

  const hd = el.querySelector('.stack-hd');
  const toggleButton = el.querySelector('.stack-toggle');
  const toggleStack = () => {
    State.snapshot('Toggle stack');
    it.expanded = !it.expanded;
    el.classList.toggle('expanded');
    toggleButton.setAttribute('aria-expanded', String(!!it.expanded));
    toggleButton.setAttribute('aria-label', tr(it.expanded ? 'stackAction.collapseFor' : 'stackAction.expandFor', { name: it.name || tr('stackEditor.defaultName') }));
    State.persist();
  };
  const openStackIdentity = (opener, focusField) => {
    const identity = identityStackTarget(it.id);
    return openIdentityEditor('stack', 'edit', {
      workspaceId: identity?.workspace.id,
      spaceId: identity?.space.id,
      groupId: identity?.group.id,
      stackId: it.id,
      focusField,
    }, opener);
  };
  const openStackMenu = (x, y, opener = toggleButton) => showContextMenu(x, y, [
    { text: tr('stackAction.edit'), icon: cmIcons.edit, action: () => openStackIdentity(opener) },
    { text: tr('stackAction.editIntention'), icon: cmIcons.edit, action: () => openIntentEditor('stack', it.id) },
    { text: tr(it.expanded ? 'stackAction.collapse' : 'stackAction.expand'), icon: cmIcons.edit, action: () => { toggleStack(); renderBoard(); } },
    { sep: true },
    ...commonActs(it),
  ], { focusFirst: true });
  hd.addEventListener('click', e => {
    if (e.target.closest('button') || e.target.closest('.stack-sym')) return;
    toggleStack();
  });
  toggleButton.addEventListener('click', e => { e.stopPropagation(); toggleStack(); });
  toggleButton.addEventListener('keydown', event => {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = toggleButton.getBoundingClientRect();
    openStackMenu(rect.left, rect.bottom + 6, toggleButton);
  });
  hd.addEventListener('contextmenu', e => {
    e.preventDefault();
    focusDialogOpener(toggleButton);
    openStackMenu(e.pageX, e.pageY, toggleButton);
  });
  el.querySelector('.stack-sym').addEventListener('click', e => { e.stopPropagation(); openStackIdentity(e.currentTarget, 'symbol'); });
  el.querySelector('.stack-intent-btn').addEventListener('click', e => { e.stopPropagation(); openIntentEditor('stack', it.id); });

  const inner = el.querySelector('.stack-items');
  (it.items || []).forEach(sub => inner.appendChild(buildItem(sub, it.items, group)));
  makeGroupDropZone(inner, el, group, it.items);

  // Auto-expand stack when dragging over its header
  let expandTimer = null;
  hd.addEventListener('dragover', (e) => {
    if (!drag) return;
    e.preventDefault();
    e.stopPropagation();
    hd.classList.add('drop-target');
    if (!it.expanded && !expandTimer) {
      expandTimer = setTimeout(() => {
        it.expanded = true;
        el.classList.add('expanded');
        expandTimer = null;
      }, 500);
    }
  });
  hd.addEventListener('dragleave', (e) => {
    if (!hd.contains(e.relatedTarget)) {
      hd.classList.remove('drop-target');
      if (expandTimer) { clearTimeout(expandTimer); expandTimer = null; }
    }
  });
  hd.addEventListener('drop', async (e) => {
    if (!drag) return;
    e.preventDefault();
    e.stopPropagation();
    hd.classList.remove('drop-target');
    if (expandTimer) { clearTimeout(expandTimer); expandTimer = null; }
    // Expand and drop at end of stack
    it.expanded = true;
    if (drag.kind === 'tab') await handleTabDropIntoList(drag.data, it.items, it.items.length);
    else if (drag.kind === 'tabs-multi') {
      const actionId = State.snapshot(`Save ${drag.data.length} tabs`);
      let added = 0;
      const savedTabs = [];
      for (const t of drag.data) {
        if (it.items.find(x => x.type === 'tab' && x.url === t.url)) continue;
        it.items.push(stampNew({ id: uid(), type:'tab', title: t.title||'Untitled', url: t.url, fav: t.fav||'' }));
        added++;
        savedTabs.push(t);
      }
      if (!added) { State.rollbackSnapshot(actionId); toast('Already saved', { danger: true }); return; }
      const result = await commitCapturedTabs(savedTabs, { actionId });
      if (!result) return;
      selectedTabIds.clear();
      renderBoard(); updateSelectedBadge();
      toastCaptureResult(`Saved ${added} tabs to stack`, result);
    } else if (drag.kind === 'item') {
      const info = findItem(drag.id);
      if (!info) return;
      if (info.item.type === 'stack' && isDescendantOf(it.items, info.item)) { toast('Cannot nest stack in itself', { danger: true }); return; }
      if (info.item.id === it.id) return;
      State.snapshot('Move to stack');
      const [moved] = info.parent.splice(info.index, 1);
      it.items.push(moved);
      State.persist(); renderBoard();
    }
  });

  applyItemMeta(el, it);
  attachItemDrag(el, it, parentItems, group);
  return el;
}

// ════════════════════════════════════════════════════════════════
// COLOR MENU
// ════════════════════════════════════════════════════════════════
function showColorMenu(anchor, item) {
  document.querySelectorAll('.color-menu').forEach(x => x.remove());
  const menu = document.createElement('div');
  menu.className = 'color-menu';
  ['none','red','orange','yellow','green','blue'].forEach(c => {
    const d = document.createElement('div');
    d.className = 'cdot';
    d.dataset.c = c;
    d.onclick = e => {
      e.stopPropagation();
      State.snapshot('Color');
      item.color = c === 'none' ? null : c;
      State.persist(); renderBoard();
      menu.remove();
    };
    menu.appendChild(d);
  });
  document.body.appendChild(menu);
  const r = (anchor || document.querySelector(`[data-id="${item.id}"]`)).getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = (r.bottom + 4) + 'px';
  menu.style.left = Math.min(r.left, window.innerWidth - 200) + 'px';
  setTimeout(() => {
    const close = e => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close); } };
    document.addEventListener('click', close);
  }, 50);
}

// ════════════════════════════════════════════════════════════════
// DRAG & DROP
// ════════════════════════════════════════════════════════════════
let drag = null;

// ─── Item selection (for groups/stacks batch actions) ───
let selectedItemIds = new Set();
let itemSelMode = false;       // derived: explicit mode on, OR something is selected
let explicitSelMode = false;   // sticky mode toggled via the select-mode button
let lastSelectedItemId = null;
// Single source of truth: keep the derived flag, the body class, and the
// toolbar button's active state in lockstep. Previously these were mutated in
// several places independently, so deselecting the last item (or toggling the
// button) could leave the flag and the button visually out of sync.
function syncItemSelMode() {
  itemSelMode = explicitSelMode || selectedItemIds.size > 0;
  document.body.classList.toggle('item-sel-mode', itemSelMode);
  updateModeButtonState();
}
function toggleItemSelect(itemId) {
  if (selectedItemIds.has(itemId)) selectedItemIds.delete(itemId);
  else selectedItemIds.add(itemId);
  // Keep the shift-range anchor on the clicked item, but drop it when the
  // selection is now empty — otherwise a later shift-click (while explicit
  // mode keeps the mode active) would span a range from a stale anchor.
  lastSelectedItemId = selectedItemIds.size ? itemId : null;
  syncItemSelMode();
  renderBoard();
  renderItemSelToolbar();
}
function clearItemSelection() {
  selectedItemIds.clear();
  explicitSelMode = false;
  lastSelectedItemId = null;
  syncItemSelMode();
  renderBoard();
  renderItemSelToolbar();
}

function renderItemSelToolbar() {
  let bar = document.getElementById('item-sel-toolbar');
  if (!selectedItemIds.size) {
    if (bar) bar.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'item-sel-toolbar';
    document.body.appendChild(bar);
  }
  const count = selectedItemIds.size;
  bar.innerHTML = `
    <span class="isl-count">${count}</span>
    <span class="isl-lbl">${esc(tr('selection.selected'))}</span>
    <div class="isl-sep"></div>
    <button data-act="open" title="${esc(tr('selection.openTitle'))}">
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M4 2.5H2a1 1 0 00-1 1v6.5A1 1 0 002 11h6.5a1 1 0 001-1V8M7 1h4m0 0v4M11 1L5.5 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ${esc(tr('selection.open'))}
    </button>
    <button data-act="move" title="${esc(tr('selection.moveTitle'))}">
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8M4 4l-2 2 2 2M8 4l2 2-2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ${esc(tr('selection.move'))}
    </button>
    <button data-act="stack" title="${esc(tr('selection.stackTitle'))}">
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M2 3l4-2 4 2-4 2-4-2zM2 6l4 2 4-2M2 9l4 2 4-2" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
      ${esc(tr('selection.stack'))}
    </button>
    <button data-act="archive" title="${esc(tr('selection.archiveTitle'))}">
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2" width="9" height="2" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 4v6h7V4M5 7h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      ${esc(tr('selection.archive'))}
    </button>
    <button data-act="clear" title="${esc(tr('selection.clearTitle'))}" aria-label="${esc(tr('selection.clearTitle'))}">
      <svg width="11" height="11" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </button>`;
  bar.querySelectorAll('button').forEach(b => {
    b.onclick = event => runBatchAction(b.dataset.act, event.currentTarget);
  });
}

function getSelectedItemsInfo() {
  const out = [];
  for (const id of selectedItemIds) {
    const info = findItem(id);
    if (info) out.push(info);
  }
  return out;
}

function runBatchAction(act, opener) {
  if (act === 'clear') { clearItemSelection(); return; }
  if (act === 'stack') {
    openIdentityEditor('stack', 'batch-create', { itemIds: [...selectedItemIds] }, opener);
    return;
  }
  const infos = getSelectedItemsInfo();
  if (!infos.length) return;
  if (act === 'open') {
    const urls = [];
    infos.forEach(i => {
      if (i.item.type === 'tab') urls.push(i.item.url);
    });
    if (!urls.length) return toast('No tabs in selection');
    openAllHibernated(urls, infos.map(i => i.item));
    toast(`Opened ${urls.length} tabs`);
    return;
  }
  if (act === 'archive') {
    State.snapshot(`Archive ${infos.length} items`);
    // Sort by descending index within parent list to delete safely
    const ids = [...selectedItemIds];
    ids.forEach(id => {
      const info = findItem(id);
      if (info) {
        const [removed] = info.parent.splice(info.index, 1);
        State.get().archive.unshift({
          kind:'item', data: removed,
          wsId: info.ws.id, catId: info.cat.id, groupId: info.group.id,
          catName: info.cat.name, groupName: info.group.name, at: Date.now()
        });
      }
    });
    State.persist();
    clearItemSelection();
    toast(`Archived ${infos.length} items`, { undo: true });
    return;
  }
  if (act === 'move') {
    openMoveTargetPicker(infos);
    return;
  }
}

function openMoveTargetPicker(infos) {
  if (!infos || !infos.length) return;
  const ids = infos.map(i => i.item.id);
  const idSet = new Set(ids);
  const sourceGroups = new Set(infos.map(i => i.group));
  const sourceParents = new Set(infos.map(i => i.parent)); // immediate lists items already live in
  const noun = ids.length === 1 ? 'item' : 'items';
  const items = [{ label: `MOVE ${ids.length} ${noun.toUpperCase()} TO…` }];

  // Move the collected items into `destList` (a group's or stack's item list),
  // preserving their relative document order.
  const moveInto = destList => {
    State.snapshot(`Move ${ids.length} ${noun}`);
    // Walk in doc order to preserve relative order; splice in reverse so
    // indices stay stable.
    const orderedIds = [];
    // Stop descending into a selected stack: its children travel inside it, so
    // recording them separately would splice them out and flatten the subtree.
    const walk = list => { for (const it of list) { if (idSet.has(it.id)) { orderedIds.push(it.id); continue; } if (it.type === 'stack' && it.items) walk(it.items); } };
    State.get().workspaces.forEach(w => w.categories.forEach(c => c.groups.forEach(gr => walk(gr.items))));
    const moved = [];
    for (let i = orderedIds.length - 1; i >= 0; i--) {
      const info = findItem(orderedIds[i]);
      if (info) moved.unshift(...info.parent.splice(info.index, 1));
    }
    destList.push(...moved);
    State.persist();
    const focusId = moved[0]?.id;
    clearItemSelection(); // also re-renders the board
    if (focusId) requestAnimationFrame(() => focusItem(focusId));
    toast(`Moved ${moved.length} ${moved.length === 1 ? 'item' : 'items'}`, { undo: true });
  };

  State.get().workspaces.forEach(ws => {
    ws.categories.forEach(cat => {
      cat.groups.forEach(g => {
        const prefix = `${ws.symbol || '🏠'} ${ws.name} / ${cat.name} / ${g.name}`;
        if (!sourceGroups.has(g)) { // hide source group's own top level as a no-op
          items.push({
            text: prefix,
            icon: cmIcons.folder || cmIcons.open,
            action: () => moveInto(g.items)
          });
        }
        // Offer every stack inside the group as a destination too, so the
        // keyboard picker can drop into a specific stack (not just a group).
        // Skip any stack being moved, and don't descend into it — that would
        // let an item land inside itself or its own descendant.
        const addStacks = (list, path) => {
          for (const it of list) {
            if (it.type !== 'stack' || !it.items) continue;
            if (idSet.has(it.id)) continue; // can't move a stack into itself/descendants (skip subtree)
            const stackPath = `${path} ▸ ${it.symbol || '📚'} ${it.name}`;
            // Skip a stack an item already lives directly in — moving there is a
            // no-op reorder, not a real move. Still descend for nested stacks.
            if (!sourceParents.has(it.items)) {
              items.push({
                text: stackPath,
                icon: cmIcons.stack,
                action: () => moveInto(it.items)
              });
            }
            addStacks(it.items, stackPath);
          }
        };
        addStacks(g.items, prefix);
      });
    });
  });
  // Anchor: above the multi-select toolbar if present; otherwise next to the
  // focused item card; otherwise centered near the top.
  let x, y;
  const bar = document.getElementById('item-sel-toolbar');
  if (bar) {
    const r = bar.getBoundingClientRect();
    x = r.left; y = r.top - 300;
  } else {
    const ae = document.activeElement;
    if (ae && ae.classList && ae.classList.contains('item')) {
      const r = ae.getBoundingClientRect();
      x = r.right + 8; y = r.top;
    } else {
      x = window.innerWidth / 2 - 150; y = 80;
    }
  }
  showContextMenu(x, y, items, { focusFirst: true });
}

function attachItemDrag(el, it, parentItems, group) {
  el.addEventListener('dragstart', e => {
    e.stopPropagation();
    drag = { kind:'item', id: it.id, srcList: parentItems };
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = it.type === 'tab' && it.url ? 'copyMove' : 'move';
    try { e.dataTransfer.setData('text/plain', it.url || ''); } catch {}
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    document.querySelectorAll('.dragover, .drop-target').forEach(x => { x.classList.remove('dragover'); x.classList.remove('drop-target'); });
    document.querySelectorAll('.drag-ghost').forEach(x => x.remove());
    drag = null;
  });
}

function makeGroupDropZone(cardsEl, colEl, g, targetList) {
  let lastOverY = 0;
  let lastGhostIdx = -1;

  function computeInsertIdx(clientY) {
    const children = [...cardsEl.querySelectorAll(':scope > .item:not(.dragging)')];
    for (let i = 0; i < children.length; i++) {
      const r = children[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return children.length;
  }

  function updateGhost(clientY) {
    const idx = computeInsertIdx(clientY);
    if (idx === lastGhostIdx) return;
    lastGhostIdx = idx;
    // Remove existing ghost only from THIS zone
    cardsEl.querySelectorAll(':scope > .drag-ghost').forEach(x => x.remove());
    const children = [...cardsEl.querySelectorAll(':scope > .item:not(.dragging)')];
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    if (idx >= children.length) cardsEl.appendChild(ghost);
    else cardsEl.insertBefore(ghost, children[idx]);
  }

  cardsEl.addEventListener('dragover', e => {
    if (!drag) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    cardsEl.classList.add('dragover');
    if (colEl) colEl.classList.add('drop-target');
    // Throttle - only update when Y changed by >4px
    if (Math.abs(e.clientY - lastOverY) < 4) return;
    lastOverY = e.clientY;
    updateGhost(e.clientY);
  });

  cardsEl.addEventListener('dragleave', e => {
    // Only clear if we truly left this zone (not entered a child)
    if (cardsEl.contains(e.relatedTarget)) return;
    cardsEl.classList.remove('dragover');
    if (colEl) colEl.classList.remove('drop-target');
    cardsEl.querySelectorAll(':scope > .drag-ghost').forEach(x => x.remove());
    lastGhostIdx = -1;
  });

  cardsEl.addEventListener('drop', async e => {
    if (!drag) return;
    e.preventDefault();
    e.stopPropagation();
    cardsEl.classList.remove('dragover');
    if (colEl) colEl.classList.remove('drop-target');

    const insertIdx = computeInsertIdx(e.clientY);
    cardsEl.querySelectorAll(':scope > .drag-ghost').forEach(x => x.remove());
    lastGhostIdx = -1;

    if (drag.kind === 'tab') {
      await handleTabDropIntoList(drag.data, targetList, insertIdx);
    } else if (drag.kind === 'tabs-multi') {
      const actionId = State.snapshot(`Save ${drag.data.length} tabs`);
      let idx = insertIdx;
      let added = 0;
      const savedTabs = [];
      for (const t of drag.data) {
        if (targetList.find(it => it.type === 'tab' && it.url === t.url)) continue;
        const item = stampNew({ id: uid(), type:'tab', title: t.title||'Untitled', url: t.url, fav: t.fav||'' });
        if (idx >= targetList.length) targetList.push(item);
        else targetList.splice(idx, 0, item);
        idx++; added++; savedTabs.push(t);
      }
      if (!added) { State.rollbackSnapshot(actionId); toast('Already saved', { danger: true }); return; }
      const result = await commitCapturedTabs(savedTabs, { actionId });
      if (!result) return;
      selectedTabIds.clear();
      renderBoard(); updateSelectedBadge();
      toastCaptureResult(`Saved ${added} tabs`, result);
    } else if (drag.kind === 'item') {
      const info = findItem(drag.id);
      if (!info) return;
      // Prevent dropping a stack into itself or its descendants
      if (info.item.type === 'stack' && isDescendantOf(targetList, info.item)) {
        toast('Cannot drop a stack into itself', { danger: true });
        return;
      }
      State.snapshot('Move item');
      const srcList = info.parent;
      const srcIdx = info.index;
      const [moved] = srcList.splice(srcIdx, 1);
      let ii = insertIdx;
      if (srcList === targetList && ii > srcIdx) ii--;
      if (ii >= targetList.length) targetList.push(moved);
      else targetList.splice(ii, 0, moved);
      State.persist(); renderBoard();
    }
  });
}

// Returns true if `list` is *inside* stackItem (i.e. dropping into it would
// create a cycle). When walking, skip stackItem itself - finding stackItem
// in its own parent list means the user is reordering it within its parent,
// which is allowed.
function isDescendantOf(list, stackItem) {
  if (list === stackItem.items) return true;
  for (const it of list) {
    if (it === stackItem) continue;  // skip the dragged stack itself
    if (it.type === 'stack' && it.items && isDescendantOf(it.items, stackItem)) return true;
  }
  return false;
}

async function handleTabDropIntoList(tabObj, list, insertIdx, { snapshot = true } = {}) {
  if (list.find(it => it.type === 'tab' && it.url === tabObj.url)) {
    toast('Already saved', { danger: true });
    return;
  }
  const actionId = snapshot ? State.snapshot('Save tab') : State.latestActionId();
  const item = stampNew({ id: uid(), type:'tab', title: tabObj.title||'Untitled', url: tabObj.url, fav: tabObj.fav||'' });
  if (insertIdx == null || insertIdx >= list.length) list.push(item);
  else list.splice(insertIdx, 0, item);
  const result = await commitCapturedTabs([tabObj], { actionId });
  if (!result) return;
  renderBoard();
  if (snapshot) toastCaptureResult('Tab saved', result);
}
async function handleTabDropIntoGroup(tabObj, group) {
  return handleTabDropIntoList(tabObj, group.items);
}

// ════════════════════════════════════════════════════════════════
// RICH TEXT TOOLBAR
// ════════════════════════════════════════════════════════════════
function maybeShowRtToolbar() {
  const tb = document.getElementById('rt-toolbar');
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) { tb.classList.add('hidden'); return; }
  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  const note = (node.nodeType === 3 ? node.parentElement : node).closest?.('.note-text');
  if (!note) { tb.classList.add('hidden'); return; }
  const rect = range.getBoundingClientRect();
  tb.classList.remove('hidden');
  let top = rect.top - tb.offsetHeight - 8;
  let left = rect.left + rect.width / 2 - tb.offsetWidth / 2;
  if (top < 10) top = rect.bottom + 8;
  if (left < 10) left = 10;
  if (left + tb.offsetWidth > window.innerWidth - 10) left = window.innerWidth - tb.offsetWidth - 10;
  tb.style.top = top + 'px';
  tb.style.left = left + 'px';
}

function rtCreateLink() {
  const url = prompt('Link URL:', 'https://');
  if (url) document.execCommand('createLink', false, url);
}

function bindRtToolbar() {
  const tb = document.getElementById('rt-toolbar');
  tb.querySelectorAll('button').forEach(b => {
    b.onmousedown = e => e.preventDefault(); // preserve selection
    b.onclick = e => {
      e.preventDefault();
      const cmd = b.dataset.cmd;
      if (cmd === 'bold') document.execCommand('bold');
      else if (cmd === 'italic') document.execCommand('italic');
      else if (cmd === 'underline') document.execCommand('underline');
      else if (cmd === 'strike') document.execCommand('strikeThrough');
      else if (cmd === 'h') document.execCommand('formatBlock', false, '<h3>');
      else if (cmd === 'ul') document.execCommand('insertUnorderedList');
      else if (cmd === 'link') rtCreateLink();
      else if (cmd === 'color-red') document.execCommand('foreColor', false, '#ef4444');
      else if (cmd === 'color-green') document.execCommand('foreColor', false, '#22c55e');
      else if (cmd === 'color-yellow') document.execCommand('foreColor', false, '#eab308');
      else if (cmd === 'color-clear') document.execCommand('removeFormat');
    };
  });
  document.addEventListener('selectionchange', debounce(maybeShowRtToolbar, 50));
  const rtToolbarTick = rafThrottle(maybeShowRtToolbar);
  document.addEventListener('mouseup', rtToolbarTick);
  document.addEventListener('keyup', rtToolbarTick);
}

// ════════════════════════════════════════════════════════════════
// SEARCH
// ════════════════════════════════════════════════════════════════
const SEARCH_COLORS = ['red','orange','yellow','green','blue'];
// type: operator vocabulary → canonical item type (singular/plural + synonyms).
const SEARCH_TYPES = {
  tab:'tab', tabs:'tab', link:'tab', links:'tab',
  note:'note', notes:'note',
  todo:'todo', todos:'todo', task:'todo', tasks:'todo',
  stack:'stack', stacks:'stack', group:'stack', groups:'stack',
};
// Canonical DOM type of an item node (mirrors the build* classNames).
function itemNodeType(el) {
  const c = el.classList;
  if (c.contains('stack')) return 'stack';
  if (c.contains('todo')) return 'todo';
  if (c.contains('note')) return 'note';
  if (c.contains('tab')) return 'tab';
  return '';
}

// Shared parser for board filtering and the launch layer's saved-link search.
// Keeping the vocabulary in one place prevents the two search entry points
// from drifting as operators are added.
function parseSearchQuery(rawValue) {
  const raw = String(rawValue || '').toLowerCase().trim();
  const makeBucket = () => ({ color: [], type: [], state: [], domain: [], url: [], in: [], tag: [], text: [] });
  const pos = makeBucket(), neg = makeBucket();
  (raw.match(/-?"[^"]*"|\S+/g) || []).forEach(token => {
    let tok = token;
    let bucket = pos;
    if (tok[0] === '-' && tok.length > 1) { bucket = neg; tok = tok.slice(1); }
    if (tok.length > 1 && tok[0] === '"' && tok[tok.length - 1] === '"') {
      const phrase = tok.slice(1, -1).trim();
      if (phrase) bucket.text.push(phrase);
      return;
    }
    let m;
    if ((m = /^colou?r:(.+)$/.exec(tok))) {
      m[1].split(',').forEach(c => { if (SEARCH_COLORS.includes(c)) bucket.color.push(c); });
    } else if ((m = /^type:(.+)$/.exec(tok))) {
      m[1].split(',').forEach(t => { const ct = SEARCH_TYPES[t]; if (ct && !bucket.type.includes(ct)) bucket.type.push(ct); });
    } else if ((m = /^is:(.+)$/.exec(tok))) {
      m[1].split(',').forEach(s => {
        if (s === 'done' || s === 'checked' || s === 'complete') bucket.state.push('done');
        else if (s === 'open' || s === 'undone' || s === 'todo' || s === 'incomplete') bucket.state.push('open');
      });
    } else if ((m = /^(?:domain|site|host):(.+)$/.exec(tok))) {
      m[1].split(',').forEach(d => { const value = d.trim(); if (value) bucket.domain.push(value); });
    } else if ((m = /^url:(.+)$/.exec(tok))) {
      m[1].split(',').forEach(u => { const value = u.trim(); if (value) bucket.url.push(value); });
    } else if ((m = /^in:(.+)$/.exec(tok))) {
      m[1].split(',').forEach(g => { const value = g.trim(); if (value) bucket.in.push(value); });
    } else if ((m = /^tag:(.+)$/.exec(tok))) {
      m[1].split(',').forEach(t => { const value = t.trim(); if (value) bucket.tag.push(value); });
    } else {
      bucket.text.push(tok);
    }
  });
  return { raw, pos, neg };
}

function applySearchFilter() {
  const raw = document.getElementById('search-input').value.toLowerCase().trim();
  // Clear any stack we force-opened on a previous keystroke; the reveal pass below
  // re-adds it only for stacks that still contain a match (so cleared/changed queries
  // restore the user's real collapse state).
  document.querySelectorAll('.search-expand').forEach(n => n.classList.remove('search-expand'));
  // Tokenize honoring "quoted phrases" BEFORE pulling operators, so a quoted phrase
  // survives intact next to an operator (e.g. type:todo "due today"). Structured
  // operators (the plan's borrowed-from-Refern search operators):
  //   color:red[,blue]   — filter by item color
  //   type:tab[,note]    — filter by item kind (tab/note/todo/stack, plus synonyms)
  //   is:done | is:open  — filter todos by completion state
  //   domain:host[,host] — filter tabs by hostname substring (alias site:)
  //   url:frag[,frag]    — filter tabs by full-URL substring
  //   in:name[,name]     — filter by the name of a containing group/stack (scope)
  //   -<term>            — negate any operator or word: EXCLUDE items it matches
  //                        (e.g. -type:todo, -domain:github.com, -"in progress")
  // Everything else (bare words and quoted phrases) becomes a text needle that must
  // appear as a substring; a quoted phrase is one needle so its spaces match verbatim.
  // Each token routes into a positive (must-match, AND across families) or a negative
  // (must-NOT-match, hide if ANY negative family matches) bucket with identical shape.
  const { pos, neg } = parseSearchQuery(raw);
  // Positive filters keep their original names so the match logic below is unchanged.
  const colorFilters = pos.color, typeFilters = pos.type, stateFilters = pos.state,
        domainFilters = pos.domain, urlFilters = pos.url, inFilters = pos.in, tagFilters = pos.tag, textNeedles = pos.text;
  const hasColor = colorFilters.length > 0;
  const hasType = typeFilters.length > 0;
  const hasState = stateFilters.length > 0;
  const hasDomain = domainFilters.length > 0;
  const hasUrl = urlFilters.length > 0;
  const hasIn = inFilters.length > 0;
  const hasTag = tagFilters.length > 0;
  const hasText = textNeedles.length > 0;
  const hasNeg = neg.color.length || neg.type.length || neg.state.length ||
                 neg.domain.length || neg.url.length || neg.in.length || neg.tag.length || neg.text.length;
  // Names of every group/stack a node is nested inside (board + list structures),
  // lowercased — powers the in:<name> scope operator. Walks ancestors only (a node isn't
  // "in" itself): board group names live in .gcol-name, board stack names in .stack-name,
  // list group names in .lv-group-name, list stack names in .lv-stack-name.
  const containerNamesOf = node => {
    const names = [];
    const add = v => { if (v) names.push(v.toLowerCase()); };
    let bs = node.parentElement?.closest('.item.stack');
    while (bs) { add(bs.querySelector(':scope > .stack-hd > .stack-name')?.textContent); bs = bs.parentElement?.closest('.item.stack'); }
    add(node.closest('.gcol')?.querySelector(':scope > .gcol-hd .gcol-name')?.textContent);
    let ls = node.parentElement?.closest('.lv-stack');
    while (ls) { add(ls.querySelector(':scope > .lv-stack-hd > .lv-stack-name')?.textContent); ls = ls.parentElement?.closest('.lv-stack'); }
    add(node.closest('.lv-group')?.querySelector(':scope > .lv-group-hd > .lv-group-name')?.textContent);
    return names;
  };
  const matchIn = (filters, node) => { const ns = containerNamesOf(node); return filters.some(f => ns.some(n => n.includes(f))); };
  // Tags are exposed on each node as a comma-joined, lowercased dataset.tags blob
  // (see the item builders). tag:<x> matches when any of the node's tags contains
  // <x> as a substring — same substring semantics as in:/domain:.
  const tagsOf = node => (node.dataset.tags ? node.dataset.tags.split(',').filter(Boolean) : []);
  const matchTag = (filters, node) => { const ts = tagsOf(node); return filters.some(f => ts.some(t => t.includes(f))); };
  // Lowercased text to match an element against. For a board/canvas stack, use ONLY its own
  // header/name — not descendant cards, which surface on their own as .item matches and
  // reveal their parent. This keeps results consistent with list view (which evaluates
  // just .lv-stack-hd) and avoids type:stack false positives.
  const elemText = el => {
    const hd = el.querySelector(':scope > .stack-hd');
    const t = hd ? hd.textContent : el.textContent;
    return t.toLowerCase();
  };
  const matchText = el => { const t = elemText(el); return textNeedles.every(n => t.includes(n)); };
  // Per-family matchers reused for negation. A todo's completion state, a tab's host/url,
  // and a container scope are the only ones that can ever be true for the relevant kinds;
  // for any other kind they're false, so e.g. -domain:x leaves notes/todos/stacks visible.
  const mState = el => { const isTodo = el.classList.contains('todo'); const done = isTodo && el.classList.contains('done'); return f => isTodo && (f === 'done' ? done : !done); };
  // An .item node is EXCLUDED if it matches any active negative family.
  const excludedItem = el => (
    (neg.color.length && neg.color.includes(el.dataset.color)) ||
    (neg.type.length && neg.type.includes(itemNodeType(el))) ||
    (neg.state.length && neg.state.some(mState(el))) ||
    (neg.domain.length && !!el.dataset.host && neg.domain.some(d => el.dataset.host.includes(d))) ||
    (neg.url.length && !!el.dataset.url && neg.url.some(u => el.dataset.url.includes(u))) ||
    (neg.in.length && matchIn(neg.in, el)) ||
    (neg.tag.length && matchTag(neg.tag, el)) ||
    (neg.text.length && (t => neg.text.some(n => t.includes(n)))(elemText(el)))
  );
  // A list-view stack header is EXCLUDED similarly. A stack has no completion state, host,
  // or URL, so -is:/-domain:/-url: never exclude it; type is hardcoded 'stack' as elsewhere.
  const excludedStack = (st, hd) => (
    (neg.color.length && neg.color.includes(st.dataset.color)) ||
    (neg.type.length && neg.type.includes('stack')) ||
    (neg.in.length && matchIn(neg.in, st)) ||
    (neg.tag.length && matchTag(neg.tag, st)) ||
    (neg.text.length && (t => neg.text.some(n => t.includes(n)))(elemText(hd)))
  );
  getItemNodes().forEach(el => {
    if (!raw) { el.classList.remove('hidden'); return; }
    let match = true;
    if (hasColor) match = colorFilters.includes(el.dataset.color);
    if (match && hasType) match = typeFilters.includes(itemNodeType(el));
    if (match && hasState) {
      // Completion state only applies to todos; non-todos can't satisfy is:done/is:open.
      const isTodo = el.classList.contains('todo');
      const done = isTodo && el.classList.contains('done');
      match = stateFilters.some(s => isTodo && (s === 'done' ? done : !done));
    }
    // domain:/url: only apply to tabs (the only items with a URL); other kinds can't satisfy them.
    if (match && hasDomain) { const h = el.dataset.host || ''; match = !!h && domainFilters.some(d => h.includes(d)); }
    if (match && hasUrl) { const u = el.dataset.url || ''; match = !!u && urlFilters.some(f => u.includes(f)); }
    if (match && hasIn) match = matchIn(inFilters, el);
    if (match && hasTag) match = matchTag(tagFilters, el);
    if (match && hasText) match = matchText(el);
    if (match && hasNeg) match = !excludedItem(el);
    el.classList.toggle('hidden', !match);
  });
  // List view renders stacks as .lv-stack / .lv-stack-hd, not .item.stack, so the loop
  // above never evaluates them. Filter the stack header here (its own children are
  // independent .item nodes handled above; header & children are siblings, so a hidden
  // header doesn't hide a matching child the way a board .item.stack ancestor would).
  document.querySelectorAll('.lv-stack').forEach(st => {
    const hd = st.querySelector(':scope > .lv-stack-hd');
    if (!hd) return;
    if (!raw) { hd.classList.remove('hidden'); return; }
    let match = true;
    if (hasColor) match = colorFilters.includes(st.dataset.color);
    if (match && hasType) match = typeFilters.includes('stack');
    if (match && hasState) match = false; // a stack has no completion state
    if (match && (hasDomain || hasUrl)) match = false; // a stack has no URL
    if (match && hasIn) match = matchIn(inFilters, st); // scope by the stack's ancestor groups/stacks
    if (match && hasTag) match = matchTag(tagFilters, st);
    if (match && hasText) match = matchText(hd);
    if (match && hasNeg) match = !excludedStack(st, hd);
    hd.classList.toggle('hidden', !match);
  });
  // Reveal the ancestor stacks of every visible match so it's actually shown, even when
  // an ancestor didn't match or is collapsed. Matches live on two kinds of node: board/
  // list .item nodes AND list-view .lv-stack-hd headers (a nested stack whose own name
  // matches, e.g. type:stack alpha) — headers aren't .item nodes, so walk both sets.
  if (raw) {
    const revealAncestors = node => {
      // Board: the .item.stack wraps its children — unhide it and force it open
      // (collapsed stacks clip children to max-height:0 via CSS).
      let bp = node.parentElement?.closest('.item.stack');
      while (bp) { bp.classList.remove('hidden'); bp.classList.add('search-expand'); bp = bp.parentElement?.closest('.item.stack'); }
      // List view: open each ancestor .lv-stack and keep its header visible so the whole
      // path down to the match is shown (header & children are siblings inside .lv-stack).
      let lp = node.closest('.lv-stack');
      while (lp) {
        lp.classList.add('search-expand');
        lp.querySelector(':scope > .lv-stack-hd')?.classList.remove('hidden');
        lp = lp.parentElement?.closest('.lv-stack');
      }
    };
    getItemNodes().forEach(el => { if (!el.classList.contains('hidden')) revealAncestors(el); });
    document.querySelectorAll('.lv-stack-hd:not(.hidden)').forEach(revealAncestors);
  }
  document.querySelectorAll('.gcol').forEach(col => {
    const any = col.querySelectorAll('.item:not(.hidden)').length > 0;
    col.style.display = (!raw || any) ? '' : 'none';
  });
  // Gallery (§3.3) groups its masonry into .gl-section blocks (not .gcol); collapse
  // any whose cards are all filtered out so a query doesn't leave empty headers.
  document.querySelectorAll('.gl-section').forEach(sec => {
    const any = sec.querySelectorAll('.item:not(.hidden)').length > 0;
    sec.style.display = (!raw || any) ? '' : 'none';
  });
  // Archive matches on text only. Structured operators (color/type/is) can't be applied
  // faithfully to heterogeneous archive entries — especially whole-group entries — so when
  // any operator is active, suppress archive results rather than surface false positives
  // (e.g. type:todo urgent must not list archived notes/tabs/groups containing "urgent").
  // Negative structured operators count as ops too (can't be faithfully applied to
  // heterogeneous archive entries); negative TEXT needles, though, just exclude matching
  // entries, so they're passed through to filter the archive result list.
  const hasNegOps = neg.color.length || neg.type.length || neg.state.length ||
                    neg.domain.length || neg.url.length || neg.in.length || neg.tag.length;
  const hasOps = hasColor || hasType || hasState || hasDomain || hasUrl || hasIn || hasTag || hasNegOps;
  renderArchiveSearchResults(hasText && !hasOps ? textNeedles : null, neg.text);
}
// Build a normalized search blob for an archive entry (group or item).
// Memoized in a WeakMap so we don't strip HTML on every keystroke.
const _archiveBlobCache = new WeakMap();
function archiveEntryText(entry) {
  const cached = _archiveBlobCache.get(entry);
  if (cached !== undefined) return cached;
  const parts = [];
  if (entry.catName) parts.push(entry.catName);
  if (entry.groupName) parts.push(entry.groupName);
  const pushItem = it => {
    if (!it) return;
    if (it.title) parts.push(it.title);
    if (it.url) parts.push(it.url);
    if (it.text) parts.push(it.text);
    if (it.html) parts.push(it.html.replace(/<[^>]+>/g, ' '));
    if (it.name) parts.push(it.name);
    if (it.type === 'stack' && Array.isArray(it.items)) it.items.forEach(pushItem);
  };
  if (entry.kind === 'group') {
    parts.push(entry.data.name || '');
    (entry.data.items || []).forEach(pushItem);
  } else {
    pushItem(entry.data);
  }
  const blob = parts.join(' ').toLowerCase();
  _archiveBlobCache.set(entry, blob);
  return blob;
}
function renderArchiveSearchResults(textNeedles, negTextNeedles) {
  const $r = document.getElementById('search-archive-results');
  if (!$r) return;
  if (!textNeedles || !textNeedles.length) { $r.classList.add('hidden'); $r.innerHTML = ''; return; }
  const negs = negTextNeedles || [];
  const arr = State.get().archive || [];
  const matches = [];
  arr.forEach((e, i) => {
    const text = archiveEntryText(e);
    if (textNeedles.every(n => text.includes(n)) && !negs.some(n => text.includes(n))) matches.push({ entry: e, idx: i });
  });
  if (!matches.length) { $r.classList.add('hidden'); $r.innerHTML = ''; return; }
  const cap = 20;
  const shown = matches.slice(0, cap);
  const overflow = matches.length - shown.length;
  const head = `<div class="sar-hd">From archive · ${matches.length} result${matches.length === 1 ? '' : 's'}${overflow ? ` (showing ${shown.length})` : ''}</div>`;
  const rows = shown.map(({ entry, idx }) => {
    const name = entry.kind === 'group'
      ? (entry.data.name || 'Group')
      : (entry.data.title || (entry.data.html ? entry.data.html.replace(/<[^>]+>/g, ' ').slice(0, 60) : entry.data.text) || 'Item');
    const icon = entry.kind === 'group' ? '📁' : (entry.data.type === 'note' ? '📝' : entry.data.type === 'todo' ? '✓' : '🔗');
    return `<div class="ar-entry sar-row" data-idx="${idx}">
      <span>${icon}</span>
      <span class="ar-t">${esc(name)}</span>
      <span class="ar-d">${esc(fmtTimeRelative(entry.at))}</span>
      <button class="sar-view" title="Open in archive"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 6h7M6 3l3 3-3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button class="restore" title="Restore"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M3 5.5L5.5 3l2.5 2.5M5.5 3v6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>`;
  }).join('');
  $r.innerHTML = head + rows;
  $r.classList.remove('hidden');
  $r.querySelectorAll('.sar-row').forEach(row => {
    const idx = +row.dataset.idx;
    row.querySelector('.restore').onclick = () => {
      restoreArchive(idx);
      toggleSearchBar(false);
    };
    row.querySelector('.sar-view').onclick = () => {
      toggleSearchBar(false);
      openLibrarySurface('archive');
    };
  });
}
function toggleSearchBar(force) {
  const bar = document.getElementById('search-bar');
  const hide = force === false || !bar.classList.contains('hidden');
  if (hide) { bar.classList.add('hidden'); document.getElementById('search-input').value = ''; applySearchFilter(); }
  else { bar.classList.remove('hidden'); setTimeout(() => document.getElementById('search-input').focus(), 40); }
}

// ── Dedicated search surface ────────────────────────────────────
let _searchRenderTimer = null;

function _searchPlainHtml(html) {
  return String(html || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function _searchNoteParts(item) {
  const text = String(item?.html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ');
  const lines = text.split(/\n+/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const first = lines[0] || '';
  const clipped = first.length > 72 ? `${first.slice(0, 69).trimEnd()}…` : first;
  const remainder = lines.slice(1).join(' ') || (first.length > 72 ? first.slice(69).trim() : '');
  return { title: clipped, snippet: remainder };
}

function _searchItemTitle(item) {
  if (!item) return '';
  if (item.type === 'tab') return item.title || dispUrl(item.url || '') || tr('search.links');
  if (item.type === 'note') return _searchNoteParts(item).title || tr('search.notes');
  if (item.type === 'todo') return item.text || tr('search.todos');
  if (item.type === 'stack') return item.name || tr('search.stacks');
  return item.title || item.text || item.name || item.type || '';
}

function _searchItemSnippet(item) {
  if (!item) return '';
  if (item.type === 'tab') return dispUrl(item.url || '');
  if (item.type === 'note') return _searchPlainHtml(item.notes).slice(0, 180) || _searchNoteParts(item).snippet || tr('search.notes');
  if (item.type === 'todo') return item.done ? tr('search.todos') + ' · ✓' : tr('search.todos');
  if (item.type === 'stack') return tr('search.stackItems', { count: (item.items || []).length });
  return '';
}

function _searchTypeLabel(type) {
  return tr(type === 'tab' ? 'search.links' : type === 'note' ? 'search.notes' : type === 'todo' ? 'search.todos' : 'search.stacks');
}

function _searchItemBlob(row) {
  const { item, cat, group, parents = [] } = row;
  return [
    _searchItemTitle(item), item.url, item.text, _searchPlainHtml(item.html), _searchPlainHtml(item.notes),
    item.name, ...(item.tags || []), cat?.name, group?.name, ...parents.map(parent => parent.name),
  ].filter(Boolean).join(' ').toLowerCase();
}

// Data-level counterpart to applySearchFilter's DOM matcher. The launch layer,
// command palette, and search page now share this exact operator behavior.
function searchItemMatches(row, query) {
  const { item, cat, group, parents = [] } = row;
  if (!item) return false;
  const { pos, neg } = parseSearchQuery(query);
  let host = '';
  try { host = new URL(item.url || '').hostname.toLowerCase(); } catch {}
  const url = String(item.url || '').toLowerCase();
  const color = String(item.color || '').toLowerCase();
  const type = SEARCH_TYPES[item.type] || item.type;
  const tags = (item.tags || []).map(tag => String(tag).toLowerCase());
  const containers = [cat?.name, group?.name, ...parents.map(parent => parent.name)].filter(Boolean).map(name => String(name).toLowerCase());
  const text = _searchItemBlob(row);
  const matchesBucket = (bucket, negative = false) => {
    const checks = [];
    if (bucket.color.length) checks.push(bucket.color.includes(color));
    if (bucket.type.length) checks.push(bucket.type.includes(type));
    if (bucket.state.length) checks.push(item.type === 'todo' && bucket.state.some(state => state === (item.done ? 'done' : 'open')));
    if (bucket.domain.length) checks.push(item.type === 'tab' && !!host && bucket.domain.some(value => host.includes(value)));
    if (bucket.url.length) checks.push(item.type === 'tab' && !!url && bucket.url.some(value => url.includes(value)));
    if (bucket.in.length) checks.push(bucket.in.some(value => containers.some(name => name.includes(value))));
    if (bucket.tag.length) checks.push(bucket.tag.some(value => tags.some(tag => tag.includes(value))));
    if (bucket.text.length) checks.push(negative ? bucket.text.some(value => text.includes(value)) : bucket.text.every(value => text.includes(value)));
    return negative ? checks.some(Boolean) : checks.every(Boolean);
  };
  return matchesBucket(pos) && !matchesBucket(neg, true);
}

function _searchTimeCutoff(time) {
  const now = new Date();
  if (time === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (time === 'week') return Date.now() - 7 * 86400000;
  if (time === 'month') return Date.now() - 30 * 86400000;
  return 0;
}

function _searchScore(row, query) {
  const raw = String(query || '').trim().toLowerCase();
  if (!raw) return Number(row.item.createdAt || 0);
  const title = _searchItemTitle(row.item).toLowerCase();
  const blob = _searchItemBlob(row);
  const words = parseSearchQuery(raw).pos.text;
  let score = 0;
  words.forEach(word => {
    if (title === word) score += 500;
    else if (title.startsWith(word)) score += 300;
    else if (title.includes(word)) score += 180;
    else if (blob.includes(word)) score += 80;
  });
  return score + Math.min(50, Number(row.item.createdAt || 0) / 1e12);
}

function _searchRowsForState(state = activeSearch, { ignoreType = false } = {}) {
  const cutoff = _searchTimeCutoff(state.time);
  const rows = collectWorkspaceItems(activeWs()).filter(row => {
    if (state.query && !searchItemMatches(row, state.query)) return false;
    if (!ignoreType && state.type !== 'all' && row.item.type !== state.type) return false;
    if (state.spaceId !== 'all' && row.cat.id !== state.spaceId) return false;
    if (cutoff && (!row.item.createdAt || row.item.createdAt < cutoff)) return false;
    if (state.hasTags && !(row.item.tags || []).length) return false;
    if (state.tag && !(row.item.tags || []).some(tag => String(tag).toLowerCase() === state.tag.toLowerCase())) return false;
    return true;
  });
  rows.sort(state.sort === 'recent' || !state.query
    ? (a, b) => Number(b.item.createdAt || 0) - Number(a.item.createdAt || 0)
    : (a, b) => _searchScore(b, state.query) - _searchScore(a, state.query));
  return rows;
}

function openSearchSurface(prefill = '') {
  const ws = activeWs();
  if (!ws) return;
  const query = {};
  if (prefill) query.q = String(prefill);
  Router.navigate({ type: 'search', wsId: ws.id, query });
  setTimeout(() => document.getElementById('search-surface-input')?.focus({ preventScroll: true }), 40);
}

function closeSearchSurface() {
  const ws = activeWs();
  if (!ws) return;
  Router.navigate({ type: 'home', wsId: ws.id, query: {} });
}

function _searchOpenDetails(row) {
  if (!row?.item || !row.cat) return;
  if (!validDetailItemIdForSurface(row.item.id, { wsId: activeWs()?.id, catId: row.cat.id })) return;
  prepareItemDetailOpen(row.item.id);
  Router.navigate({ type: 'board', wsId: activeWs()?.id, catId: row.cat.id, query: { item: row.item.id } });
}

function _searchOpenPrimary(row) {
  if (!row?.item) return;
  if (row.item.type !== 'tab') return _searchOpenDetails(row);
  try {
    const result = chrome.tabs.create({ url: row.item.url });
    if (result && typeof result.catch === 'function') result.catch(err => toast(String(err?.message || err), { danger: true }));
  } catch (err) {
    toast(String(err?.message || err), { danger: true });
  }
}

function _searchSet(patch, focus = '') {
  if (!activeSearch) return;
  Object.assign(activeSearch, patch, { loading: false });
  renderBoard();
  Router.sync({ replace: true });
  if (focus) setTimeout(() => document.getElementById(focus)?.focus({ preventScroll: true }), 0);
}

function _searchQueueQuery(query) {
  if (!activeSearch) return;
  activeSearch.query = query;
  activeSearch.loading = true;
  activeSearch.selectedId = null;
  Router.sync({ replace: true });
  const list = document.getElementById('search-result-list');
  if (list) {
    list.setAttribute('aria-busy', 'true');
    list.innerHTML = `<div class="search-state"><span class="search-spinner" aria-hidden="true"></span><strong>${esc(tr('search.loading'))}</strong></div>`;
  }
  clearTimeout(_searchRenderTimer);
  _searchRenderTimer = setTimeout(() => {
    if (!activeSearch) return;
    activeSearch.loading = false;
    renderBoard();
    Router.sync({ replace: true });
    const input = document.getElementById('search-surface-input');
    if (input) { input.focus({ preventScroll: true }); input.setSelectionRange(input.value.length, input.value.length); }
  }, 90);
}

function _searchMoveSelection(delta, focusRow = false) {
  if (!activeSearch) return;
  const rows = _searchRowsForState().slice(0, 100);
  if (!rows.length) return;
  let index = rows.findIndex(row => row.item.id === activeSearch.selectedId);
  if (index < 0) index = 0;
  index = (index + delta + rows.length) % rows.length;
  activeSearch.selectedId = rows[index].item.id;
  renderBoard();
  Router.sync({ replace: true });
  const id = focusRow ? `search-result-${index}` : 'search-surface-input';
  setTimeout(() => document.getElementById(id)?.focus({ preventScroll: true }), 0);
}

function _searchTypeIcon(type) {
  if (type === 'note') return '✎';
  if (type === 'todo') return '✓';
  if (type === 'stack') return '▤';
  return '↗';
}

function _searchStateNode(kind, title, body) {
  const node = document.createElement('div');
  node.className = `search-state ${kind}`;
  node.innerHTML = `<span class="search-state-icon" aria-hidden="true">${kind === 'error' ? '!' : '⌕'}</span><strong>${esc(title)}</strong><p>${esc(body)}</p>`;
  return node;
}

function _searchResultRow(row, index, selected) {
  const item = row.item;
  const title = _searchItemTitle(item);
  const result = document.createElement('div');
  result.id = `search-result-${index}`;
  result.className = 'search-result-row' + (selected ? ' selected' : '');
  result.tabIndex = 0;
  result.setAttribute('role', 'option');
  result.setAttribute('aria-selected', selected ? 'true' : 'false');
  result.setAttribute('aria-label', tr('search.resultAria', { title }));
  result.innerHTML = `
    <span class="search-result-icon type-${esc(item.type)}">${esc(_searchTypeIcon(item.type))}</span>
    <span class="search-result-copy">
      <strong>${esc(title)}</strong>
      <span class="search-result-snippet">${esc(_searchItemSnippet(item))}</span>
      <span class="search-result-tags">${(item.tags || []).slice(0, 3).map(tag => `<span>${esc(tag)}</span>`).join('')}</span>
      <span class="search-result-meta">${esc(row.cat.name)} <i>·</i> ${esc(row.group.name)} <i>·</i> ${esc(item.createdAt ? fmtTimeRelative(item.createdAt) : tr('search.unknownDate'))}</span>
    </span>
    <span class="search-result-end">
      <span class="search-type-badge">${esc(_searchTypeLabel(item.type))}</span>
      ${item.type === 'tab' ? `<button class="search-result-fav" type="button" aria-label="${esc(item.favorite ? tr('search.unfavorite') : tr('search.favorite'))}">${item.favorite ? '★' : '☆'}</button>` : ''}
    </span>`;
  result.addEventListener('click', event => {
    if (event.target.closest('.search-result-fav')) return;
    _searchSet({ selectedId: item.id }, `search-result-${index}`);
  });
  result.addEventListener('dblclick', event => { if (!event.target.closest('button')) _searchOpenPrimary(row); });
  result.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); _searchMoveSelection(event.key === 'ArrowDown' ? 1 : -1, true); }
    else if (event.key === 'Enter') { event.preventDefault(); _searchOpenPrimary(row); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeSearchSurface(); }
  });
  const favorite = result.querySelector('.search-result-fav');
  if (favorite) favorite.onclick = event => {
    event.stopPropagation();
    State.snapshot(item.favorite ? 'Remove favorite' : 'Favorite link');
    item.favorite = !item.favorite;
    State.persist();
    renderBoard();
    updateNavChrome();
  };
  return result;
}

function _searchDetail(row) {
  const aside = document.createElement('aside');
  aside.className = 'search-detail';
  aside.setAttribute('aria-label', tr('search.preview'));
  if (!row) {
    aside.appendChild(_searchStateNode('idle', tr('search.preview'), tr('search.selectResult')));
    return aside;
  }
  const item = row.item;
  const title = _searchItemTitle(item);
  const notes = item.type === 'note' ? _searchNoteParts(item).snippet : _searchPlainHtml(item.notes);
  const currentRows = _searchRowsForState().slice(0, 100);
  const related = currentRows
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidate.item.id !== item.id)
    .sort((a, b) => {
      const rank = candidate => candidate.group.id === row.group.id ? 2 : candidate.cat.id === row.cat.id ? 1 : 0;
      return rank(b.candidate) - rank(a.candidate) || a.index - b.index;
    })
    .slice(0, 3);
  aside.innerHTML = `
    <header><span class="search-detail-icon type-${esc(item.type)}">${esc(_searchTypeIcon(item.type))}</span><div><strong>${esc(title)}</strong><span>${esc(_searchItemSnippet(item))}</span></div></header>
    <dl>
      <div><dt>${esc(tr('search.location'))}</dt><dd>${esc(row.cat.name)} · ${esc(row.group.name)}</dd></div>
      <div><dt>${esc(tr('search.saved'))}</dt><dd>${esc(item.createdAt ? new Date(item.createdAt).toLocaleString(appLocale(), { dateStyle: 'medium', timeStyle: 'short' }) : tr('search.unknownDate'))}</dd></div>
      <div><dt>${esc(tr('search.contentType'))}</dt><dd>${esc(_searchTypeLabel(item.type))}</dd></div>
    </dl>
    <section><h3>${esc(tr('search.notes'))}</h3><p>${esc(notes || tr('search.noNotes'))}</p></section>
    ${(item.tags || []).length ? `<section><h3>${esc(tr('search.tags'))}</h3><div class="search-detail-tags">${item.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div></section>` : ''}
    <footer></footer>
    ${related.length ? `<section class="search-detail-related"><h3>${esc(tr('search.related'))}</h3><div>${related.map(({ candidate, index }) => `<button type="button" data-result-index="${index}" data-result-id="${esc(candidate.item.id)}"><span class="search-related-icon type-${esc(candidate.item.type)}">${esc(_searchTypeIcon(candidate.item.type))}</span><span><strong>${esc(_searchItemTitle(candidate.item))}</strong><small>${esc(candidate.cat.name)} · ${esc(candidate.group.name)}</small></span></button>`).join('')}</div></section>` : ''}`;
  const footer = aside.querySelector('footer');
  if (item.type === 'tab') {
    const open = document.createElement('button'); open.type = 'button'; open.className = 'btn-primary'; open.textContent = tr('search.open'); open.onclick = () => _searchOpenPrimary(row); footer.appendChild(open);
  }
  const details = document.createElement('button'); details.type = 'button'; details.className = 'btn-secondary'; details.textContent = tr('search.details'); details.onclick = () => _searchOpenDetails(row); footer.appendChild(details);
  aside.querySelectorAll('.search-detail-related button').forEach(button => {
    button.onclick = () => _searchSet({ selectedId: button.dataset.resultId }, `search-result-${button.dataset.resultIndex}`);
  });
  return aside;
}

function _searchFilterButton(label, active, onclick, count = null) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'search-filter-option' + (active ? ' active' : '');
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
  button.innerHTML = `<span class="search-filter-mark" aria-hidden="true"></span><span>${esc(label)}</span>${count == null ? '' : `<b>${count}</b>`}`;
  button.onclick = onclick;
  return button;
}

function renderSearchSurface() {
  const state = activeSearch;
  const ws = activeWs();
  if (!state || !ws) return false;
  hideBreadcrumb();
  const board = document.getElementById('board');
  board.classList.remove('group-page-mode', 'list-mode', 'canvas-mode', 'explorer-mode', 'timeline-mode', 'gallery-mode', 'graph-mode', 'calendar-mode', 'home-mode', 'library-mode');
  board.classList.add('search-mode');
  board.innerHTML = '';

  let baseRows = [], rows = [], failure = null;
  try {
    if (state.spaceId !== 'all' && !ws.categories.some(cat => cat.id === state.spaceId)) state.spaceId = 'all';
    baseRows = _searchRowsForState(state, { ignoreType: true });
    rows = _searchRowsForState(state);
  } catch (err) {
    console.error(err);
    failure = err;
  }
  const visibleRows = rows.slice(0, 100);
  if (!failure && state.selectedId && !visibleRows.some(row => row.item.id === state.selectedId)) state.selectedId = null;
  const selected = !failure ? (visibleRows.find(row => row.item.id === state.selectedId) || visibleRows[0] || null) : null;
  const hasDetail = !state.loading && !failure && !!selected;
  const typeCounts = { all: baseRows.length, tab: 0, note: 0, todo: 0, stack: 0 };
  baseRows.forEach(row => { if (typeCounts[row.item.type] != null) typeCounts[row.item.type]++; });

  const page = document.createElement('section');
  page.className = 'search-page' + (state.filtersOpen ? ' filters-open' : '') + (hasDetail ? '' : ' no-detail');
  page.innerHTML = `
    <header class="search-page-head">
      <div><span class="search-title-icon" aria-hidden="true">⌕</span><h2>${esc(tr('search.title'))}</h2><p>${esc(tr('search.subtitle'))}</p></div>
      <ol class="search-steps" aria-hidden="true"><li><b>1</b>${esc(tr('search.nav'))}</li><li><b>2</b>${esc(tr('search.results'))}</li><li><b>3</b>${esc(tr('search.filterBy'))}</li><li><b>4</b>${esc(tr('search.open'))}</li></ol>
    </header>
    <div class="search-query-row">
      <label class="search-query-box"><span aria-hidden="true">⌕</span><input id="search-surface-input" role="combobox" aria-controls="search-result-list" aria-autocomplete="list" autocomplete="off" spellcheck="false"><button type="button" class="search-query-clear" aria-label="${esc(tr('search.clear'))}">×</button></label>
      <button type="button" class="search-filter-toggle"><span aria-hidden="true">⚙</span><span>${esc(state.filtersOpen ? tr('search.hideFilters') : tr('search.filters'))}</span></button>
    </div>
    <div class="search-type-tabs" role="tablist"></div>
    <div class="search-workspace">
      <aside class="search-filters"><header><strong>${esc(tr('search.filterBy'))}</strong><button type="button">${esc(tr('search.clearAll'))}</button></header><div class="search-filter-sections"></div></aside>
      <main class="search-results"><header><strong>${esc(state.query ? tr('search.results') : tr('search.recent'))}</strong><span>${esc(tr('search.resultCount', { count: rows.length }))}</span><label>${esc(tr('search.sortBy'))}<select class="search-sort"><option value="best">${esc(tr('search.bestMatch'))}</option><option value="recent">${esc(tr('search.newest'))}</option></select></label></header><div id="search-result-list" role="listbox"></div></main>
      <div class="search-detail-slot"></div>
    </div>`;
  board.appendChild(page);

  const input = page.querySelector('#search-surface-input');
  input.value = state.query;
  input.placeholder = tr('search.inputPlaceholder');
  input.setAttribute('aria-label', tr('search.inputPlaceholder'));
  input.setAttribute('aria-expanded', 'true');
  if (hasDetail) input.setAttribute('aria-activedescendant', `search-result-${visibleRows.indexOf(selected)}`);
  input.oninput = event => _searchQueueQuery(event.target.value);
  input.onkeydown = event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); _searchMoveSelection(event.key === 'ArrowDown' ? 1 : -1); }
    else if (event.key === 'Enter' && (selected || rows[0])) { event.preventDefault(); _searchOpenPrimary(selected || rows[0]); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeSearchSurface(); }
  };
  page.querySelector('.search-query-clear').onclick = () => _searchSet({ query: '', selectedId: null }, 'search-surface-input');
  page.querySelector('.search-filter-toggle').onclick = () => _searchSet({ filtersOpen: !state.filtersOpen }, 'search-surface-input');

  const typeTabs = page.querySelector('.search-type-tabs');
  [
    ['all', tr('search.all')], ['tab', tr('search.links')], ['note', tr('search.notes')],
    ['todo', tr('search.todos')], ['stack', tr('search.stacks')],
  ].forEach(([type, label]) => {
    const button = document.createElement('button'); button.type = 'button';
    button.className = state.type === type ? 'active' : '';
    button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', state.type === type ? 'true' : 'false');
    button.innerHTML = `${esc(label)} <b>${typeCounts[type]}</b>`;
    button.onclick = () => _searchSet({ type, selectedId: null }, 'search-surface-input');
    typeTabs.appendChild(button);
  });

  const filterSections = page.querySelector('.search-filter-sections');
  const addFilterSection = title => { const section = document.createElement('section'); section.innerHTML = `<h3>${esc(title)}</h3>`; filterSections.appendChild(section); return section; };
  const spaces = addFilterSection(tr('search.space'));
  spaces.appendChild(_searchFilterButton(tr('search.allSpaces'), state.spaceId === 'all', () => _searchSet({ spaceId: 'all', selectedId: null }), collectWorkspaceItems(ws).length));
  ws.categories.forEach(cat => spaces.appendChild(_searchFilterButton(cat.name, state.spaceId === cat.id, () => _searchSet({ spaceId: cat.id, selectedId: null }), collectWorkspaceItems({ categories: [cat] }).length)));
  const times = addFilterSection(tr('search.time'));
  [['any', tr('search.anyTime')], ['today', tr('search.today')], ['week', tr('search.thisWeek')], ['month', tr('search.thisMonth')]].forEach(([time, label]) => times.appendChild(_searchFilterButton(label, state.time === time, () => _searchSet({ time, selectedId: null }))));
  const tagCounts = new Map();
  const activeTag = String(state.tag || '');
  collectWorkspaceItems(ws).forEach(({ item }) => (item.tags || []).forEach(rawTag => {
    const label = String(rawTag || '').trim();
    if (!label) return;
    const key = label.toLowerCase();
    const current = tagCounts.get(key);
    tagCounts.set(key, { label: current?.label || label, count: (current?.count || 0) + 1 });
  }));
  const tags = addFilterSection(tr('search.tags'));
  tags.appendChild(_searchFilterButton(tr('search.hasTags'), state.hasTags, () => _searchSet({ hasTags: !state.hasTags, tag: '', selectedId: null })));
  [...tagCounts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, appLocale()))
    .slice(0, 8)
    .forEach(({ label, count }) => tags.appendChild(_searchFilterButton(label, activeTag.toLowerCase() === label.toLowerCase(), () => _searchSet({ tag: activeTag.toLowerCase() === label.toLowerCase() ? '' : label, hasTags: false, selectedId: null }), count)));
  page.querySelector('.search-filters header button').onclick = () => _searchSet({ type: 'all', spaceId: 'all', time: 'any', hasTags: false, tag: '', sort: 'best', selectedId: null }, 'search-surface-input');

  const sort = page.querySelector('.search-sort');
  sort.value = state.sort;
  sort.onchange = () => _searchSet({ sort: sort.value, selectedId: null }, 'search-surface-input');

  const list = page.querySelector('#search-result-list');
  if (state.loading) {
    list.setAttribute('aria-busy', 'true');
    list.appendChild(_searchStateNode('loading', tr('search.loading'), ''));
  } else if (failure) {
    list.appendChild(_searchStateNode('error', tr('search.error'), tr('search.errorBody')));
  } else if (!collectWorkspaceItems(ws).length) {
    list.appendChild(buildSystemEmptyState({
      kind: 'library', title: tr('empty.libraryTitle'), body: tr('search.noItemsBody'),
      actions: [
        { label: tr('empty.addSave'), icon: '+', run: () => openCommandPalette() },
        { label: tr('empty.importBookmarks'), icon: '⇩', run: () => importBookmarks() },
      ],
      note: tr('empty.localNote'),
    }));
  } else if (!rows.length) {
    const filtersActive = state.type !== 'all' || state.spaceId !== 'all' || state.time !== 'any' || state.hasTags || !!state.tag;
    const clearFilters = () => _searchSet({ type: 'all', spaceId: 'all', time: 'any', hasTags: false, tag: '', selectedId: null }, 'search-surface-input');
    const clearSearch = () => _searchSet({ query: '', selectedId: null }, 'search-surface-input');
    const actions = [{
      label: tr(filtersActive ? 'empty.clearFilters' : 'empty.clearSearch'), icon: '×',
      run: filtersActive ? clearFilters : clearSearch,
    }];
    if (state.spaceId !== 'all') actions.push({ label: tr('empty.searchAllSpaces'), icon: '↗', run: () => _searchSet({ spaceId: 'all', selectedId: null }, 'search-surface-input') });
    else actions.push({ label: tr('empty.browseLibrary'), icon: '↗', run: () => openLibrarySurface('all') });
    list.appendChild(buildSystemEmptyState({
      kind: 'search',
      title: state.query ? tr('empty.searchTitle', { query: state.query }) : tr('empty.noMatchTitle'),
      body: tr('empty.searchBody'), actions,
    }));
  } else {
    visibleRows.forEach((row, index) => list.appendChild(_searchResultRow(row, index, row.item.id === selected?.item.id)));
  }
  if (hasDetail) page.querySelector('.search-detail-slot').appendChild(_searchDetail(selected));

  const footer = document.createElement('div');
  footer.className = 'search-page-footer';
  footer.innerHTML = `
    <section><h3>${esc(tr('search.tips'))}</h3><p>${esc(tr('search.tipOperators'))}</p><p>${esc(tr('search.tipQuotes'))}</p><p>${esc(tr('search.tipExclude'))}</p></section>
    <section><h3>${esc(tr('search.stats'))}</h3><div><span><b>${typeCounts.all}</b>${esc(tr('search.all'))}</span><span><b>${typeCounts.tab}</b>${esc(tr('search.links'))}</span><span><b>${typeCounts.note}</b>${esc(tr('search.notes'))}</span><span><b>${typeCounts.todo}</b>${esc(tr('search.todos'))}</span></div></section>`;
  page.appendChild(footer);
  return true;
}

// ════════════════════════════════════════════════════════════════
// WORKSPACE GRID
// ════════════════════════════════════════════════════════════════
function setWorkspaceGridInterlock(enabled) {
  const allowed = new Set([
    'ws-grid-overlay',
    'state-recovery-overlay',
    'organization-name-overlay',
    'organization-delete-overlay',
    'context-menu',
    'emoji-picker',
  ]);
  for (const child of document.body.children) {
    if (allowed.has(child.id)) continue;
    setElementInertOwner(child, 'workspace-grid', enabled);
  }
}

function focusWorkspaceGridFallback(workspaceId) {
  const chip = [...document.querySelectorAll('.ws-chip')]
    .find(element => element.dataset.wsid === workspaceId);
  const candidates = [chip, document.getElementById('ws-menu-btn'), document.getElementById('add-ws-btn')];
  for (const target of candidates) {
    if (!target || typeof target.focus !== 'function') continue;
    try { target.focus({ preventScroll: true }); } catch { try { target.focus(); } catch {} }
    if (document.activeElement === target) return true;
  }
  return false;
}

function closeWsGrid() {
  const overlay = document.getElementById('ws-grid-overlay');
  if (!overlay || overlay.classList.contains('hidden')) return false;
  overlay.classList.add('hidden');
  setWorkspaceGridInterlock(false);
  unlockBodyScroll();
  if (!restoreOpener(overlay)) setTimeout(() => focusWorkspaceGridFallback(State.get().activeWsId), 0);
  return true;
}

async function openWsGrid(opener) {
  const overlay = document.getElementById('ws-grid-overlay');
  const wasOpen = !overlay.classList.contains('hidden');
  if (!wasOpen) {
    const explicitOpener = opener?.currentTarget || opener;
    if (explicitOpener && typeof explicitOpener.focus === 'function') {
      focusDialogOpener(explicitOpener);
    } else if (document.activeElement?.closest?.('#context-menu')) {
      focusDialogOpener(document.getElementById('ws-menu-btn'));
    }
    rememberOpener(overlay);
  }
  const s = State.get();
  const g = document.getElementById('wsg-grid');
  g.innerHTML = '';
  s.workspaces.forEach(ws => {
    const count = ws.categories.reduce((a, c) => a + c.groups.reduce((b, gp) => b + gp.items.length, 0), 0);
    const card = document.createElement('div');
    card.className = 'wsg-card' + (ws.id === s.activeWsId ? ' active' : '');
    card.dataset.wsId = ws.id;
    card.setAttribute('aria-label', tr('palette.workspace', { name: ws.name }));
    card.innerHTML = `
      ${s.workspaces.length > 1 ? `<button class="del" title="${esc(tr('organization.workspace.delete'))}" aria-label="${esc(tr('organization.workspace.delete'))}"><svg width="10" height="10" viewBox="0 0 11 11"><path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>` : ''}
      <span class="sym">${esc(ws.symbol||'🏠')}</span>
      <div class="nm">${esc(ws.name)}</div>
      <div class="cnt">${esc(tr('workspaceManager.items', { count }))}</div>`;
    card.onclick = async e => {
      if (e.target.closest('.del')) {
        openOrganizationDelete('workspace', ws.id, e.target.closest('.del'));
        return;
      }
      s.activeWsId = ws.id;
      State.persist();
      const headerReady = renderAll();
      closeWsGrid();
      try { await headerReady; } catch {}
      focusWorkspaceGridFallback(ws.id);
    };
    enableKeyboardClick(card);
    bindAnchoredContextMenu(card, () => [
        { text: tr('organization.renameMenu'), icon: cmIcons.edit, action: () => openOrganizationName('workspace', ws.id, card) }
      ]);
    g.appendChild(card);
  });
  if (!wasOpen) {
    overlay.classList.remove('hidden');
    setWorkspaceGridInterlock(true);
    lockBodyScroll();
    setTimeout(() => {
      const activeCard = [...document.querySelectorAll('.wsg-card')]
        .find(element => element.dataset.wsId === s.activeWsId);
      (activeCard || document.getElementById('wsg-close'))?.focus({ preventScroll: true });
    }, 0);
  }
}

// ════════════════════════════════════════════════════════════════
// ARCHIVE LIST
// ════════════════════════════════════════════════════════════════
function renderArchiveList() {
  const $l = document.getElementById('archive-list');
  if (!$l) return;
  const arr = State.get().archive;
  $l.innerHTML = '';
  if (!arr.length) { $l.innerHTML = `<div class="ar-empty">Archive is empty.</div>`; return; }
  arr.forEach((e, i) => {
    const el = document.createElement('div');
    el.className = 'ar-entry';
    const name = e.kind === 'group' ? (e.data.name || 'Group') : (e.data.title || (e.data.html ? e.data.html.slice(0, 60) : e.data.text) || 'Item');
    el.innerHTML = `
      <span>${e.kind === 'group' ? '📁' : (e.data.type === 'note' ? '📝' : e.data.type === 'todo' ? '✓' : '🔗')}</span>
      <span class="ar-t">${esc(name)}</span>
      <span class="ar-d">${fmtTimeRelative(e.at)}</span>
      <button class="restore" title="Restore"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M3 5.5L5.5 3l2.5 2.5M5.5 3v6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button class="del" title="${esc(tr('archive.moveToTrash'))}"><svg width="11" height="11" viewBox="0 0 11 11"><path d="M2 3h7M4.5 3V1.5h2V3M3 3v6.5a0.5 0.5 0 00.5.5h4a0.5 0.5 0 00.5-.5V3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></button>`;
    el.querySelector('.restore').onclick = () => restoreArchive(i);
    el.querySelector('.del').onclick = () => moveArchiveEntriesToTrash([e]);
    $l.appendChild(el);
  });
}

// ════════════════════════════════════════════════════════════════
// BOOKMARKS / EXPORT / IMPORT
// ════════════════════════════════════════════════════════════════
async function importBookmarks() {
  if (!chrome.bookmarks) return toast('Bookmarks API unavailable', { danger:true });
  const tree = await chrome.bookmarks.getTree();
  const cat = activeCat(); if (!cat) return;
  State.snapshot('Import bookmarks');
  const MAX_BOOKMARK_DEPTH = 50;
  let imported = 0;
  let skipped = 0;
  function walk(nodes, folderName, depth) {
    if (depth >= MAX_BOOKMARK_DEPTH) { skipped++; return; }
    const g = { id: uid(), name: folderName || 'Bookmarks', symbol:'🔖', color:'#eab308', collapsed:false, items:[] };
    let has = false;
    for (const n of nodes) {
      if (n.url && !isProto(n.url)) { g.items.push(stampNew({ id: uid(), type:'tab', title:n.title||n.url, url:n.url, fav:'' })); has = true; imported++; }
      else if (n.children) walk(n.children, n.title, depth + 1);
    }
    if (has) cat.groups.push(g);
  }
  tree.forEach(r => (r.children || []).forEach(c => walk(c.children || [], c.title, 0)));
  State.persist(); renderBoard();
  const suffix = skipped ? ` · ${skipped} folder${skipped === 1 ? '' : 's'} too deep` : '';
  toast(`Imported ${imported}${suffix}`, { undo: true });
}
function countState(s) {
  let workspaces = 0, categories = 0, groups = 0, items = 0;
  const countItems = (list) => {
    for (const it of (list || [])) {
      items++;
      if (it && it.type === 'stack') countItems(it.items);
    }
  };
  for (const ws of (s.workspaces || [])) {
    workspaces++;
    for (const cat of (ws.categories || [])) {
      categories++;
      for (const g of (cat.groups || [])) {
        groups++;
        countItems(g.items);
      }
    }
  }
  return { workspaces, categories, groups, items, archived: (s.archive || []).length, trashed: (s.trash || []).length };
}

function pluralize(n, word) { return `${n} ${word}${n === 1 ? '' : 's'}`; }

function exportJSON(options = {}) {
  const data = { ...State.get() };
  // Revision is a live concurrency token for this browser profile, not
  // portable user data. Importing it would create a false write conflict.
  delete data._revision;
  const counts = countState(data);
  const payload = {
    app: 'locus',
    schema: CURRENT_SCHEMA,
    exportedAt: new Date().toISOString(),
    counts,
    data
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const wsTag = counts.workspaces ? `-${counts.workspaces}ws` : '';
  a.href = url;
  const prefix = typeof options.prefix === 'string' && options.prefix ? options.prefix : 'locus';
  a.download = `${prefix}${wsTag}-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (!options.silent) toast(`Exported · ${pluralize(counts.workspaces, 'workspace')} · ${pluralize(counts.items, 'item')}`);
}

let importCtx = null;
const MAX_IMPORT_BYTES = 20 * 1024 * 1024;
const MAX_IMPORT_NODES = 120000;
const MAX_IMPORT_DEPTH = 30;
const MAX_IMPORT_STRING = 1024 * 1024;
const IMPORT_ITEM_TYPES = new Set(['tab', 'note', 'todo', 'stack']);
const IMPORT_DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function validateImportData(data, schema) {
  if (Number.isFinite(Number(schema)) && Number(schema) > CURRENT_SCHEMA) {
    throw new Error(`This backup uses newer schema ${schema}. Update Locus before importing it.`);
  }
  let nodes = 0;
  const inspect = (value, depth, label) => {
    if (depth > MAX_IMPORT_DEPTH) throw new Error(`${label} is nested too deeply`);
    if (++nodes > MAX_IMPORT_NODES) throw new Error('Backup contains too many values');
    if (typeof value === 'string' && value.length > MAX_IMPORT_STRING) {
      throw new Error(`${label} contains an oversized text value`);
    }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) inspect(value[i], depth + 1, `${label}[${i}]`);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (IMPORT_DANGEROUS_KEYS.has(key)) throw new Error(`${label} contains unsafe key "${key}"`);
      inspect(child, depth + 1, `${label}.${key}`);
    }
  };
  inspect(data, 0, 'data');

  const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
  const requiresStableReminderIds = Number.isFinite(Number(schema)) && Number(schema) >= 12;
  if (!isRecord(data) || !Array.isArray(data.workspaces) || !data.workspaces.length) {
    throw new Error('Backup must contain at least one workspace');
  }
  if (data.settings != null && !isRecord(data.settings)) throw new Error('settings must be an object');
  if (data.archive != null && !Array.isArray(data.archive)) throw new Error('archive must be an array');
  if (data.trash != null && !Array.isArray(data.trash)) throw new Error('trash must be an array');

  const activeIds = new Set();
  const registerId = (value, label, ids = activeIds) => {
    if (typeof value !== 'string' || !value || value.length > 200) throw new Error(`${label} has an invalid id`);
    if (ids.has(value)) throw new Error(`${label} reuses id "${value}"`);
    ids.add(value);
  };
  const validateUrl = (value, label) => {
    if (typeof value !== 'string' || !value) throw new Error(`${label} is missing its URL`);
    if (/^data:image\/(?:png|jpe?g|gif|webp);/i.test(value)) return;
    let parsed;
    try { parsed = new URL(value); } catch { throw new Error(`${label} has an invalid URL`); }
    if (!['http:', 'https:', 'ftp:', 'file:'].includes(parsed.protocol)) {
      throw new Error(`${label} uses unsupported URL scheme ${parsed.protocol}`);
    }
  };
  const validateItem = (item, label, ids, stackDepth = 0) => {
    if (!isRecord(item)) throw new Error(`${label} must be an object`);
    registerId(item.id, label, ids);
    if (!IMPORT_ITEM_TYPES.has(item.type)) throw new Error(`${label} has unsupported type "${item.type}"`);
    if (item.type === 'tab') validateUrl(item.url, label);
    if (item.type === 'stack') {
      if (stackDepth >= 12) throw new Error(`${label} contains stacks nested too deeply`);
      if (!Array.isArray(item.items)) throw new Error(`${label}.items must be an array`);
      item.items.forEach((child, index) => validateItem(child, `${label}.items[${index}]`, ids, stackDepth + 1));
    }
  };
  const validateReminderList = (entity, label) => {
    if (entity.reminders == null) return;
    if (!Array.isArray(entity.reminders)) throw new Error(`${label}.reminders must be an array`);
    const reminderIds = new Set();
    entity.reminders.forEach((reminder, index) => {
      const reminderLabel = `${label}.reminders[${index}]`;
      if (!isRecord(reminder)) throw new Error(`${reminderLabel} must be an object`);
      if (requiresStableReminderIds) registerId(reminder.id, reminderLabel, reminderIds);
    });
  };
  const validateGroup = (group, label, ids) => {
    if (!isRecord(group)) throw new Error(`${label} must be an object`);
    registerId(group.id, label, ids);
    validateReminderList(group, label);
    if (!Array.isArray(group.items)) throw new Error(`${label}.items must be an array`);
    group.items.forEach((item, index) => validateItem(item, `${label}.items[${index}]`, ids));
  };

  data.workspaces.forEach((workspace, wi) => {
    const wp = `workspaces[${wi}]`;
    if (!isRecord(workspace)) throw new Error(`${wp} must be an object`);
    registerId(workspace.id, wp);
    if (!Array.isArray(workspace.categories) || !workspace.categories.length) {
      throw new Error(`${wp} must contain at least one category`);
    }
    workspace.categories.forEach((category, ci) => {
      const cp = `${wp}.categories[${ci}]`;
      if (!isRecord(category)) throw new Error(`${cp} must be an object`);
      registerId(category.id, cp);
      validateReminderList(category, cp);
      if (!Array.isArray(category.groups)) throw new Error(`${cp}.groups must be an array`);
      category.groups.forEach((group, gi) => validateGroup(group, `${cp}.groups[${gi}]`, activeIds));
    });
  });

  for (const [collectionName, collection] of [['archive', data.archive || []], ['trash', data.trash || []]]) {
    collection.forEach((entry, index) => {
      const label = `${collectionName}[${index}]`;
      if (!isRecord(entry) || !['item', 'group'].includes(entry.kind) || !isRecord(entry.data)) {
        throw new Error(`${label} is not a valid archived entry`);
      }
      const ids = new Set();
      if (entry.kind === 'group') validateGroup(entry.data, `${label}.data`, ids);
      else validateItem(entry.data, `${label}.data`, ids);
    });
  }
}

function sanitizeImportedRichText(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > MAX_IMPORT_DEPTH) return;
  for (const [key, child] of Object.entries(value)) {
    if ((key === 'html' || key === 'readme' || key === 'annotation') && typeof child === 'string') {
      value[key] = sanitizeHtml(child);
    } else if (child && typeof child === 'object') {
      sanitizeImportedRichText(child, depth + 1);
    }
  }
}

function importJSON(file) {
  if (!file || file.size > MAX_IMPORT_BYTES) {
    toast('Backup is too large to import safely', { danger: true, duration: 5000 });
    return;
  }
  const r = new FileReader();
  r.onload = () => {
    let parsed;
    try { parsed = JSON.parse(r.result); }
    catch (e) {
      const m = (e && e.message || '').match(/position (\d+)/i);
      const where = m ? ` (position ${m[1]})` : '';
      toast(`Invalid JSON${where}`, { danger: true, duration: 5000 });
      return;
    }
    let data, schema, exportedAt;
    if (parsed && (parsed.app === 'locus' || parsed.app === 'folio' || parsed.app === 'stow' || parsed.app === 'tabento' || parsed.app === 'tabnest' || parsed.app === 'tabextend') && parsed.data && typeof parsed.data === 'object') {
      data = parsed.data;
      schema = parsed.schema;
      exportedAt = parsed.exportedAt;
    } else if (parsed && Array.isArray(parsed.workspaces)) {
      data = parsed;
      schema = 'legacy';
    } else {
      toast('Invalid file: missing workspaces field', { danger: true, duration: 5000 });
      return;
    }
    if (!Array.isArray(data.workspaces)) {
      toast('Invalid file: workspaces is not an array', { danger: true, duration: 5000 });
      return;
    }
    try {
      data = LocusImportUtils.normalizeLegacy(data, { makeId: uid, schema });
      validateImportData(data, schema);
      sanitizeImportedRichText(data);
    } catch (error) {
      toast(`Invalid backup: ${error.message}`, { danger: true, duration: 7000 });
      return;
    }
    const counts = countState(data);
    importCtx = { data, counts, filename: file.name, exportedAt, schema };
    openImportPreview();
  };
  r.onerror = () => toast('Could not read file', { danger: true, duration: 5000 });
  r.readAsText(file);
}

function openImportPreview() {
  if (!importCtx) return;
  const { counts, filename, exportedAt, schema } = importCtx;
  document.getElementById('import-filename').textContent = filename || '—';
  document.getElementById('import-date').textContent = exportedAt
    ? new Date(exportedAt).toLocaleString(appLocale())
    : 'Unknown';
  document.getElementById('import-schema').textContent =
    schema === 'legacy' ? 'Legacy' : (schema != null ? String(schema) : '—');
  const cells = [
    ['workspaces', 'Workspaces'],
    ['categories', 'Categories'],
    ['groups', 'Groups'],
    ['items', 'Items'],
    ['archived', 'Archived'],
    ['trashed', tr('nav.trash')]
  ];
  const c = document.getElementById('import-counts');
  c.textContent = '';
  cells.forEach(([k, lbl]) => {
    const el = document.createElement('div');
    el.className = 'import-count';
    const num = document.createElement('div');
    num.className = 'import-count-num';
    num.textContent = String(counts[k] ?? 0);
    const lblEl = document.createElement('div');
    lblEl.className = 'import-count-lbl';
    lblEl.textContent = lbl;
    el.append(num, lblEl);
    c.append(el);
  });
  const replaceRadio = document.querySelector('input[name="import-mode"][value="replace"]');
  if (replaceRadio) replaceRadio.checked = true;
  const overlay = document.getElementById('import-overlay');
  rememberOpener(overlay);
  overlay.classList.remove('hidden');
  setTimeout(() => focusFirstIn(overlay), 50);
}

function closeImportPreview() {
  const overlay = document.getElementById('import-overlay');
  overlay.classList.add('hidden');
  restoreOpener(overlay);
  importCtx = null;
  const inp = document.getElementById('import-file');
  if (inp) inp.value = '';
}

function resetSurfaceAfterImportReplace() {
  activeHome = true;
  activeSearch = null;
  activeLibraryMode = null;
  activeGroupPage = null;
  activeCalendar = null;
  boardDetailItemId = null;
  explorerSel = { groupId: null, stackPath: [], itemId: null };
  calendarFilter = '';
  selectedItemIds.clear();
  lastSelectedItemId = null;
  itemSelMode = false;
  explicitSelMode = false;
  document.body.classList.remove('detail-open', 'reorder-mode');
  document.getElementById('settings-drawer')?.classList.add('hidden');
  document.getElementById('tools-hub')?.classList.add('hidden');
  history.replaceState(null, '', '#' + Router.build({
    type: 'home',
    wsId: State.get().activeWsId,
    query: {},
  }));
}

async function applyImportReplace(data) {
  // Replace is intentionally destructive, so first start a user-owned backup
  // download of the exact current graph.
  exportJSON({ prefix: 'locus-before-import', silent: true });
  State.snapshot('Import');
  const s = State.get();
  try {
    const currentRevision = s._revision;
    const currentSettings = s.settings || {};
    const incoming = LocusImportUtils.normalizeForReplace(data, {
      makeId: uid,
      now: Date.now(),
      retentionMs: TRASH_RETENTION_MS,
    });
    const mergedSettings = {
      ...currentSettings,
      ...(incoming.settings || {}),
      onboarding: {
        ...(currentSettings.onboarding || {}),
        ...(incoming.settings?.onboarding || {}),
      },
    };
    Object.keys(s).forEach(key => { if (key !== '_revision') delete s[key]; });
    Object.assign(s, incoming);
    s._revision = currentRevision;
    s.settings = mergedSettings;
    s.archive = Array.isArray(incoming.archive) ? incoming.archive : [];
    s.trash = Array.isArray(incoming.trash) ? incoming.trash : [];
    s.recentEmoji = Array.isArray(incoming.recentEmoji) ? incoming.recentEmoji : [];
    s.columnWidths = incoming.columnWidths && typeof incoming.columnWidths === 'object' ? incoming.columnWidths : {};
    migrate();
    await State.persistNow();
  } catch (error) {
    State.rollbackSnapshot();
    renderAll();
    handleStorageError(error);
    return false;
  }
  resetSurfaceAfterImportReplace();
  applySettings();
  renderAll();
  const c = countState(s);
  toast(`Imported · ${pluralize(c.workspaces, 'workspace')} · ${pluralize(c.items, 'item')}`, { undo: true });
  chrome.runtime.sendMessage({ type: 'reconcile-reminders' })
    .then(result => {
      if (result?.ok === false) toast('Imported data, but some reminders could not be scheduled. Restart the browser, then review Calendar.', { danger: true, duration: 8000 });
    })
    .catch(() => {
      toast('Imported data, but reminder scheduling needs a browser restart', { danger: true, duration: 8000 });
    });
  return true;
}

async function applyImportMerge(data) {
  const s = State.get();
  const before = countState(s);
  State.snapshot('Merge import');
  let addedWs = 0;
  try {
    const prepared = LocusImportUtils.prepareMerge(data, s, {
      makeId: uid,
      now: Date.now(),
      retentionMs: TRASH_RETENTION_MS,
    });
    addedWs = prepared.workspaces.length;
    s.workspaces.push(...prepared.workspaces);
    s.archive = s.archive || [];
    s.archive.push(...prepared.archive);
    s.trash = s.trash || [];
    s.trash.push(...prepared.trash);
    if (Array.isArray(data.recentEmoji)) {
      s.recentEmoji = s.recentEmoji || [];
      const seen = new Set(s.recentEmoji);
      for (const e of data.recentEmoji) if (!seen.has(e)) { s.recentEmoji.push(e); seen.add(e); }
    }
    s.columnWidths = { ...(s.columnWidths || {}), ...prepared.columnWidths };
    if (Object.keys(prepared.columnSizes).length) {
      s.columnSizes = { ...(s.columnSizes || {}), ...prepared.columnSizes };
    }
    migrate();
    await State.persistNow();
  } catch (error) {
    State.rollbackSnapshot();
    renderAll();
    handleStorageError(error);
    return false;
  }
  renderAll();
  const after = countState(s);
  const addedItems = after.items - before.items;
  toast(`Merged · +${pluralize(addedWs, 'workspace')} · +${pluralize(addedItems, 'item')}`, { undo: true });
  chrome.runtime.sendMessage({ type: 'reconcile-reminders' })
    .then(result => {
      if (result?.ok === false) toast('Merged data, but some reminders could not be scheduled. Restart the browser, then review Calendar.', { danger: true, duration: 8000 });
    })
    .catch(() => {
      toast('Merged data, but reminder scheduling needs a browser restart', { danger: true, duration: 8000 });
    });
  return true;
}

function bindImportUI() {
  const overlay = document.getElementById('import-overlay');
  if (!overlay) return;
  document.getElementById('import-x').onclick = closeImportPreview;
  document.getElementById('import-cancel').onclick = closeImportPreview;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeImportPreview(); });
  overlay.addEventListener('keydown', e => trapTabKey(e, overlay));
  document.getElementById('import-confirm').onclick = async () => {
    if (!importCtx) { closeImportPreview(); return; }
    const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'replace';
    const { data } = importCtx;
    closeImportPreview();
    if (mode === 'merge') await applyImportMerge(data);
    else await applyImportReplace(data);
  };
}

// ════════════════════════════════════════════════════════════════
// PASTE LINKS IMPORT
// ════════════════════════════════════════════════════════════════
function parsePastedLinks(text) {
  return [...new Set(
    text.split('\n').map(l => l.trim()).filter(l => {
      try { const u = new URL(l); return ['http:', 'https:'].includes(u.protocol); }
      catch { return false; }
    })
  )];
}

function openPasteOverlay() {
  const overlay = document.getElementById('paste-overlay');
  const area = document.getElementById('paste-area');
  const dest = document.getElementById('paste-dest');
  const btn = document.getElementById('paste-go');
  const preview = document.getElementById('paste-preview');
  const nameInput = document.getElementById('paste-group-name');

  area.value = '';
  btn.disabled = true;
  btn.textContent = 'Import 0 links';
  preview.textContent = '';
  nameInput.classList.add('hidden');
  nameInput.value = '';

  dest.innerHTML = '';
  const cat = activeCat();
  if (cat) {
    cat.groups.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = (g.symbol ? g.symbol + ' ' : '') + g.name;
      dest.appendChild(opt);
    });
  }
  const newOpt = document.createElement('option');
  newOpt.value = '__new__';
  newOpt.textContent = '+ New group';
  dest.appendChild(newOpt);

  overlay.classList.remove('hidden');
  setTimeout(() => area.focus(), 50);
}

function closePasteOverlay() {
  document.getElementById('paste-overlay').classList.add('hidden');
}

function applyPasteImport() {
  const urls = parsePastedLinks(document.getElementById('paste-area').value);
  if (!urls.length) return;
  const destId = document.getElementById('paste-dest').value;
  const cat = activeCat();
  if (!cat) return;

  State.snapshot('Paste links');

  let targetGroup;
  if (destId === '__new__') {
    const name = document.getElementById('paste-group-name').value.trim() || 'Pasted links';
    targetGroup = { id: uid(), name, symbol: '📋', color: '#6366f1', collapsed: false, items: [] };
    cat.groups.push(targetGroup);
  } else {
    targetGroup = cat.groups.find(g => g.id === destId);
    if (!targetGroup) return;
  }

  for (const url of urls) {
    let host = '';
    try { host = new URL(url).hostname; } catch {}
    targetGroup.items.push(stampNew({
      id: uid(), type: 'tab', url,
      title: host || url, fav: favUrl(url)
    }));
  }

  State.persist();
  renderBoard();
  closePasteOverlay();
  toast(`Imported ${urls.length} link${urls.length === 1 ? '' : 's'}`, { undo: true });
}

function bindPasteImportUI() {
  const overlay = document.getElementById('paste-overlay');
  if (!overlay) return;
  const area = document.getElementById('paste-area');
  const btn = document.getElementById('paste-go');
  const dest = document.getElementById('paste-dest');
  const nameInput = document.getElementById('paste-group-name');

  document.getElementById('paste-x').onclick = closePasteOverlay;
  document.getElementById('paste-cancel').onclick = closePasteOverlay;
  overlay.addEventListener('click', e => { if (e.target === overlay) closePasteOverlay(); });
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePasteOverlay(); e.stopPropagation(); }
    trapTabKey(e, overlay);
  });

  area.addEventListener('input', () => {
    const urls = parsePastedLinks(area.value);
    const n = urls.length;
    btn.disabled = n === 0;
    btn.textContent = `Import ${n} link${n === 1 ? '' : 's'}`;
    document.getElementById('paste-preview').textContent = n ? `${n} valid URL${n === 1 ? '' : 's'} detected` : '';
  });

  dest.addEventListener('change', () => {
    nameInput.classList.toggle('hidden', dest.value !== '__new__');
    if (dest.value === '__new__') nameInput.focus();
  });

  btn.onclick = applyPasteImport;

  document.getElementById('paste-import-btn').onclick = openPasteOverlay;
}

// ════════════════════════════════════════════════════════════════
// REMINDER UI bind
// ════════════════════════════════════════════════════════════════
// Route a picker commit to the item or entity write path, carrying the label
// (entities only) and the chosen recurrence.
function commitReminderSet(ts, recur) {
  const c = reminderCtx; if (!c) return;
  if (c.kind === 'item' && c.detailContext) {
    return commitItemDetailReminderMutation(c.detailContext, { at: ts, recur }, { fromPicker: true });
  }
  if (c.kind === 'item') setReminder(c.id, ts, { recur });
  else {
    const label = (document.getElementById('rm-label')?.value || '').trim();
    setEntityReminder(c.kind, c.id, { at: ts, label, recur }, c.index);
  }
}
function commitReminderClear() {
  const c = reminderCtx; if (!c) return;
  if (c.kind === 'item' && c.detailContext) {
    return commitItemDetailReminderMutation(c.detailContext, null, { fromPicker: true });
  }
  if (c.kind === 'item') clearReminder(c.id);
  else if (c.index != null) removeEntityReminder(c.kind, c.id, c.index);
}
function bindReminderUI() {
  const overlay = document.getElementById('reminder-overlay');
  document.getElementById('rm-x').onclick = closeReminderPicker;
  document.getElementById('rm-clear').onclick = () => {
    if (reminderCtx?.unavailable) return;
    clearReminderTimeError();
    const detailCommit = reminderCtx?.kind === 'item' && !!reminderCtx.detailContext;
    const result = commitReminderClear();
    if (detailCommit) void result;
    else closeReminderPicker();
  };
  document.getElementById('rm-save').onclick = () => {
    if (!reminderCtx || reminderCtx.unavailable) return;
    const dt = document.getElementById('rm-datetime').value;
    if (!dt) { showReminderTimeError(); return; }
    const ts = new Date(dt).getTime();
    if (isNaN(ts) || ts <= Date.now()) { showReminderTimeError(); return; }
    clearReminderTimeError();
    const detailCommit = reminderCtx.kind === 'item' && !!reminderCtx.detailContext;
    const result = commitReminderSet(ts, readRecurControl());
    if (detailCommit) void result;
    else closeReminderPicker();
  };
  document.querySelectorAll('.rm-quick button').forEach(b => {
    b.onclick = () => {
      if (!reminderCtx || reminderCtx.unavailable) return;
      clearReminderTimeError();
      const detailCommit = reminderCtx.kind === 'item' && !!reminderCtx.detailContext;
      const result = commitReminderSet(Date.now() + (+b.dataset.offset), readRecurControl());
      if (detailCommit) void result;
      else closeReminderPicker();
    };
  });
  document.getElementById('rm-datetime').addEventListener('input', clearReminderTimeError);
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      trapTabKey(e, overlay);
      return;
    }
    if (isItemDetailReminderMutationPending()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeReminderPicker(); }
  }, true);
  overlay.addEventListener('click', e => {
    if (isItemDetailReminderMutationPending()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (e.target === overlay) closeReminderPicker();
  }, true);
  overlay.addEventListener('pointerdown', e => {
    if (!isItemDetailReminderMutationPending()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
}

// ════════════════════════════════════════════════════════════════
// SUBSCRIPTION TRACKER
// ════════════════════════════════════════════════════════════════
const CURRENCY_SYMBOL = { USD:'$', EUR:'€', GBP:'£', TWD:'NT$', JPY:'¥', CNY:'¥', KRW:'₩' };
// Very rough static FX for aggregation when mixed currencies
const FX_TO_USD = { USD:1, EUR:1.09, GBP:1.28, TWD:0.031, JPY:0.0067, CNY:0.14, KRW:0.00074 };
const SUB_CAT_META = {
  entertainment:{ icon:'🎬', label:'Entertainment' },
  productivity: { icon:'💼', label:'Productivity' },
  cloud:        { icon:'☁️', label:'Cloud & Hosting' },
  dev:          { icon:'💻', label:'Developer tools' },
  ai:           { icon:'🤖', label:'AI' },
  music:        { icon:'🎵', label:'Music' },
  news:         { icon:'📰', label:'News' },
  fitness:      { icon:'💪', label:'Fitness' },
  utilities:    { icon:'🔌', label:'Utilities' },
  other:        { icon:'📦', label:'Other' }
};

let subEditingId = null;
let subFilter = 'all';

function getSubs() {
  const s = State.get();
  if (!s.subscriptions) s.subscriptions = [];
  if (!s.subSettings) s.subSettings = { defaultCurrency: 'USD' };
  return s.subscriptions;
}

function subMonthlyCostUSD(sub) {
  if (sub.paused) return 0;
  const base = Number(sub.cost || 0) * (FX_TO_USD[sub.currency] || 1);
  const p = sub.period || 'monthly';
  if (p === 'weekly') return base * 52 / 12;
  if (p === 'yearly') return base / 12;
  if (p === 'quarterly') return base / 3;
  if (p === 'oneoff') return 0;
  return base; // monthly
}

function formatMoney(val, currency = 'USD') {
  const sym = CURRENCY_SYMBOL[currency] || '$';
  const n = Math.abs(val);
  const decimals = (currency === 'JPY' || currency === 'KRW') ? 0 : 2;
  return `${val < 0 ? '-' : ''}${sym}${n.toLocaleString(appLocale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00');
  const today = new Date();
  today.setHours(0,0,0,0);
  return Math.round((d - today) / 86400000);
}

function openSubsTracker() {
  const ov = document.getElementById('subs-overlay');
  rememberOpener(ov);
  ov.classList.remove('hidden');
  renderSubs();
  lockBodyScroll();
  focusFirstIn(ov);
}
function closeSubsTracker() {
  const ov = document.getElementById('subs-overlay');
  ov.classList.add('hidden');
  unlockBodyScroll();
  restoreOpener(ov);
}

function renderSubs() {
  const subs = getSubs();
  const list = document.getElementById('subs-list');
  const empty = document.getElementById('subs-empty');
  const mainCur = State.get().subSettings?.defaultCurrency || 'USD';
  document.getElementById('subs-currency').value = mainCur;

  // Filter
  let filtered = subs;
  if (subFilter === 'monthly') filtered = subs.filter(s => !s.paused && (s.period === 'monthly' || s.period === 'weekly' || s.period === 'quarterly'));
  else if (subFilter === 'yearly') filtered = subs.filter(s => !s.paused && s.period === 'yearly');
  else if (subFilter === 'paused') filtered = subs.filter(s => s.paused);
  else filtered = subs;

  // Sort: active first, then by days-until ascending
  filtered = [...filtered].sort((a, b) => {
    if (a.paused !== b.paused) return a.paused ? 1 : -1;
    const ad = daysUntil(a.nextBilling) ?? 9999;
    const bd = daysUntil(b.nextBilling) ?? 9999;
    return ad - bd;
  });

  // Stats (on ALL subs, not filtered)
  const monthlyUSD = subs.reduce((a, s) => a + subMonthlyCostUSD(s), 0);
  const annualUSD = monthlyUSD * 12;
  const active = subs.filter(s => !s.paused).length;

  // Upcoming in 7 days
  let upcoming = 0;
  subs.forEach(s => {
    if (s.paused) return;
    const d = daysUntil(s.nextBilling);
    if (d != null && d >= 0 && d <= 7) upcoming += Number(s.cost || 0) * (FX_TO_USD[s.currency] || 1);
  });

  // Convert to display currency
  const toDisp = v => v / (FX_TO_USD[mainCur] || 1);
  document.getElementById('subs-monthly').textContent = formatMoney(toDisp(monthlyUSD), mainCur);
  document.getElementById('subs-annual').textContent = formatMoney(toDisp(annualUSD), mainCur);
  document.getElementById('subs-count').textContent = active;
  document.getElementById('subs-upcoming').textContent = formatMoney(toDisp(upcoming), mainCur);

  // Filter chips
  document.querySelectorAll('.subs-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === subFilter));

  list.innerHTML = '';
  if (!filtered.length) {
    empty.classList.remove('hidden');
    list.style.display = 'none';
    return;
  }
  empty.classList.add('hidden');
  list.style.display = '';

  filtered.forEach(sub => {
    const row = document.createElement('div');
    row.className = 'sub-row' + (sub.paused ? ' paused' : '');
    row.style.setProperty('--sub-tint', sub.color || '#6366f1');
    row.style.setProperty('--sub-tint-bg', (sub.color || '#6366f1') + '22');
    const days = daysUntil(sub.nextBilling);
    const catMeta = SUB_CAT_META[sub.category] || SUB_CAT_META.other;
    let nextLabel = '—';
    let nextClass = '';
    if (sub.paused) { nextLabel = 'Paused'; nextClass = 'paused'; }
    else if (days != null) {
      if (days < 0) { nextLabel = `Overdue ${-days}d`; nextClass = 'due'; }
      else if (days === 0) { nextLabel = 'Today'; nextClass = 'due'; }
      else if (days === 1) { nextLabel = 'Tomorrow'; nextClass = 'soon'; }
      else if (days <= 3) { nextLabel = `In ${days} days`; nextClass = 'soon'; }
      else if (days <= 30) { nextLabel = `In ${days} days`; }
      else { const d = new Date(sub.nextBilling); nextLabel = d.toLocaleDateString(appLocale(), { month:'short', day:'numeric' }); }
    }
    const period = sub.period || 'monthly';
    const periodLabel = period === 'monthly' ? '/mo' : period === 'yearly' ? '/yr' : period === 'weekly' ? '/wk' : period === 'quarterly' ? '/qtr' : '';

    row.innerHTML = `
      <div class="sub-icon-box">${esc(sub.icon || catMeta.icon)}</div>
      <div class="sub-info">
        <div class="sub-name-row">
          <span class="sub-name">${esc(sub.name || 'Untitled')}</span>
          <span class="sub-cat-badge">${catMeta.icon} ${catMeta.label}</span>
        </div>
        <div class="sub-meta">
          <span class="sub-meta-next ${nextClass}">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2.5" width="9" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M4 1v2M8 1v2M1.5 5h9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            ${esc(nextLabel)}
          </span>
          ${sub.notes ? `<span title="${esc(sub.notes)}">📝</span>` : ''}
          ${sub.url ? `<span title="${esc(sub.url)}">🔗</span>` : ''}
        </div>
      </div>
      <div class="sub-cost">
        <div class="sub-cost-val">${formatMoney(sub.cost || 0, sub.currency || 'USD')}</div>
        <div class="sub-cost-period">${esc(periodLabel)}</div>
      </div>
      <div class="sub-actions">
        <button class="sub-action-btn" data-act="pause" title="${sub.paused ? 'Resume' : 'Pause'}">
          ${sub.paused
            ? '<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M3 2l6 3.5L3 9V2z" fill="currentColor"/></svg>'
            : '<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="3" y="2" width="2" height="7" fill="currentColor"/><rect x="6" y="2" width="2" height="7" fill="currentColor"/></svg>'}
        </button>
        ${sub.url ? `<button class="sub-action-btn" data-act="open" title="Open website"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M4 2.5H2a1 1 0 00-1 1v6.5A1 1 0 002 11h6.5a1 1 0 001-1V8M7 1h4m0 0v4M11 1L5.5 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
        <button class="sub-action-btn" data-act="edit" title="Edit"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2L4 10l-2.5.5L2 8l6.5-6.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg></button>
        <button class="sub-action-btn danger" data-act="del" title="Delete"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4.5 3V1.5h3V3M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>`;

    row.addEventListener('click', e => {
      const act = e.target.closest('.sub-action-btn')?.dataset.act;
      if (act === 'pause') { State.snapshot('Pause sub'); sub.paused = !sub.paused; State.persist(); renderSubs(); return; }
      if (act === 'open') { chrome.tabs.create({ url: sub.url }); return; }
      if (act === 'del') { if (confirm(`Delete "${sub.name}"?`)) { State.snapshot('Delete sub'); const subs = getSubs(); const i = subs.findIndex(x => x.id === sub.id); if (i > -1) subs.splice(i, 1); State.persist(); renderSubs(); } return; }
      // default → edit
      openSubForm(sub);
    });
    list.appendChild(row);
  });
}

function openSubForm(existing) {
  subEditingId = existing?.id || null;
  document.getElementById('sub-form-title').textContent = existing ? 'Edit subscription' : 'New subscription';
  document.getElementById('sub-name').value = existing?.name || '';
  document.getElementById('sub-cost').value = existing?.cost || '';
  document.getElementById('sub-cur').value = existing?.currency || (State.get().subSettings?.defaultCurrency || 'USD');
  document.getElementById('sub-period').value = existing?.period || 'monthly';
  document.getElementById('sub-next').value = existing?.nextBilling || nextMonthStr();
  document.getElementById('sub-cat').value = existing?.category || 'entertainment';
  document.getElementById('sub-url').value = existing?.url || '';
  document.getElementById('sub-notes').value = existing?.notes || '';
  document.getElementById('sub-remind').checked = existing?.remind !== false;
  document.getElementById('sub-paused').checked = !!existing?.paused;
  const icon = document.getElementById('sub-icon-val');
  icon.textContent = existing?.icon || SUB_CAT_META[existing?.category || 'entertainment'].icon;
  delete icon.dataset.emojiChosen;
  document.querySelectorAll('#sub-color-row .csw').forEach(c => c.classList.toggle('active', c.dataset.c === (existing?.color || '#6366f1')));
  document.getElementById('sub-form-delete').style.display = existing ? '' : 'none';
  document.getElementById('sub-form').classList.remove('hidden');
  setTimeout(() => document.getElementById('sub-name').focus(), 40);
}
function closeSubForm() { document.getElementById('sub-form').classList.add('hidden'); subEditingId = null; }
function nextMonthStr() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

async function saveSubForm() {
  const name = document.getElementById('sub-name').value.trim();
  if (!name) { toast('Name is required', { danger: true }); return; }
  const cost = parseFloat(document.getElementById('sub-cost').value) || 0;
  const currency = document.getElementById('sub-cur').value;
  const period = document.getElementById('sub-period').value;
  const nextBilling = document.getElementById('sub-next').value;
  const category = document.getElementById('sub-cat').value;
  const url = document.getElementById('sub-url').value.trim();
  const notes = document.getElementById('sub-notes').value.trim();
  const remind = document.getElementById('sub-remind').checked;
  const paused = document.getElementById('sub-paused').checked;
  const iconElement = document.getElementById('sub-icon-val');
  const icon = iconElement.textContent;
  const color = document.querySelector('#sub-color-row .csw.active')?.dataset.c || '#6366f1';

  State.snapshot(subEditingId ? 'Edit sub' : 'Add sub');
  const subs = getSubs();
  let sub;
  if (subEditingId) {
    sub = subs.find(x => x.id === subEditingId);
    if (!sub) return;
    Object.assign(sub, { name, cost, currency, period, nextBilling, category, url, notes, remind, paused, icon, color });
  } else {
    sub = { id: uid(), name, cost, currency, period, nextBilling, category, url, notes, remind, paused, icon, color };
    subs.push(sub);
  }
  // Set alarm for reminder
  try {
    await chrome.alarms.clear('te-sub-' + sub.id);
    if (!paused && remind && nextBilling) {
      const d = new Date(nextBilling + 'T09:00');
      d.setDate(d.getDate() - 3);
      if (d.getTime() > Date.now()) await chrome.alarms.create('te-sub-' + sub.id, { when: d.getTime() });
    }
  } catch {}
  if (iconElement.dataset.emojiChosen === 'true') rememberRecentEmoji(icon);
  delete iconElement.dataset.emojiChosen;
  State.persist();
  closeSubForm();
  renderSubs();
}

function deleteSubForm() {
  if (!subEditingId) return;
  if (!confirm('Delete this subscription?')) return;
  State.snapshot('Delete sub');
  const subs = getSubs();
  const i = subs.findIndex(x => x.id === subEditingId);
  if (i > -1) subs.splice(i, 1);
  try { chrome.alarms.clear('te-sub-' + subEditingId); } catch {}
  State.persist();
  closeSubForm();
  renderSubs();
}

function bindSubs() {
  // Subscriptions are now opened from the Tools Hub (see bindToolsHub)
  document.getElementById('subs-close').onclick = closeSubsTracker;
  document.getElementById('subs-overlay').addEventListener('click', e => {
    if (e.target.id === 'subs-overlay') closeSubsTracker();
  });
  document.getElementById('subs-add-btn').onclick = () => openSubForm(null);
  document.getElementById('subs-empty-add').onclick = () => openSubForm(null);
  document.getElementById('subs-currency').onchange = e => {
    const s = State.get();
    if (!s.subSettings) s.subSettings = {};
    s.subSettings.defaultCurrency = e.target.value;
    State.persist(); renderSubs();
  };
  document.querySelectorAll('.subs-chip').forEach(c => {
    c.onclick = () => { subFilter = c.dataset.filter; renderSubs(); };
  });
  // Form
  document.getElementById('sub-form-x').onclick = closeSubForm;
  document.getElementById('sub-form-cancel').onclick = closeSubForm;
  document.getElementById('sub-form-save').onclick = saveSubForm;
  document.getElementById('sub-form-delete').onclick = deleteSubForm;
  document.getElementById('sub-form').addEventListener('click', e => {
    if (e.target.id === 'sub-form') closeSubForm();
  });
  document.getElementById('sub-icon-trigger').onclick = (e) => {
    e.stopPropagation();
    openEmojiPicker({ kind: 'sub-modal' }, e.currentTarget);
  };
  // Color row in sub form
  document.querySelectorAll('#sub-color-row .csw').forEach(c => {
    c.onclick = () => {
      document.querySelectorAll('#sub-color-row .csw').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
    };
    c.setAttribute('aria-label', 'Color ' + (c.dataset.c || ''));
    enableKeyboardClick(c);
  });
  // Auto-icon when category changes (only if not manually set)
  document.getElementById('sub-cat').onchange = e => {
    if (!subEditingId) {
      const icon = document.getElementById('sub-icon-val');
      icon.textContent = SUB_CAT_META[e.target.value].icon;
      delete icon.dataset.emojiChosen;
    }
  };
}

// ════════════════════════════════════════════════════════════════
// GROUP PAGE (§4.1) — a group promoted from a modal overlay to a
// first-class, deep-linkable page with a breadcrumb and real history.
// ════════════════════════════════════════════════════════════════
// Navigate to a group's page. This is a route change (pushState), so browser
// back/forward and reload all work; the old openGroupFocus overlay is gone.
function openGroupPage(gId) {
  const info = findGroup(gId);
  if (!info) return;
  Router.navigate({ type: 'group', wsId: info.ws.id, groupId: gId, itemId: null, query: {} });
}
// Leave the group page, returning to the board it belongs to. A route change,
// so it pushes a board entry and the URL/back-forward stay consistent. We let
// Router.apply() clear activeGroupPage (nulling it here first would make apply
// see no change and skip the re-render).
function closeGroupPage() {
  const ws = activeWs();
  const cat = activeCat();
  Router.navigate({ type: 'board', wsId: ws ? ws.id : null, catId: cat ? cat.id : null, query: {} });
}

// Open the per-item detail sheet (§4.2). Group pages use an item path; Home,
// board, and library surfaces carry `?item=<id>`. Each form is deep-linkable and
// survives reload because Router.sync reflects the active selection into the URL.
function openItemDetail(id) {
  const ws = activeWs();
  const surface = activeGroupPage
    ? { wsId: ws?.id, groupId: activeGroupPage.groupId }
    : activeLibraryMode
      ? { wsId: ws?.id, libraryMode: activeLibraryMode }
      : { wsId: ws?.id, catId: activeCat()?.id };
  if (!validDetailItemIdForSurface(id, surface)) return;
  prepareItemDetailOpen(id);
  if (activeGroupPage) {
    Router.navigate({ type: 'group', wsId: State.get().activeWsId, groupId: activeGroupPage.groupId, itemId: id, query: {} });
  } else if (activeLibraryMode) {
    if (!ws) return;
    Router.navigate({ type: 'library', wsId: ws.id, mode: activeLibraryMode, query: { item: id } });
  } else {
    if (!ws) return;
    const cat = activeCat();
    const query = {};
    const mode = getViewMode();
    if (mode && mode !== 'board') query.view = mode;
    query.item = id;
    Router.navigate({ type: 'board', wsId: ws.id, catId: cat ? cat.id : null, query });
  }
}
// Close the detail sheet without leaving its Home, board, group, or Library surface.
// A route change keeps Back/Forward and reload semantics consistent.
function closeItemDetail() {
  if (isItemDetailMutationPending()) return false;
  if (activeGroupPage) {
    return Router.navigate({ type: 'group', wsId: State.get().activeWsId, groupId: activeGroupPage.groupId, itemId: null, query: {} });
  } else if (activeLibraryMode) {
    const ws = activeWs();
    return Router.navigate({ type: 'library', wsId: ws ? ws.id : null, mode: activeLibraryMode, query: {} });
  } else if (activeHome) {
    const ws = activeWs();
    return Router.navigate({ type: 'home', wsId: ws ? ws.id : null, query: {} }, { persist: false });
  } else {
    const ws = activeWs();
    const cat = activeCat();
    const query = {};
    const mode = getViewMode();
    if (mode && mode !== 'board') query.view = mode;
    return Router.navigate({ type: 'board', wsId: ws ? ws.id : null, catId: cat ? cat.id : null, query });
  }
}

function hideBreadcrumb() {
  const bar = document.getElementById('breadcrumb-bar');
  if (bar && !bar.classList.contains('hidden')) { bar.classList.add('hidden'); bar.innerHTML = ''; }
}

// Render the Workspace › Category › Group breadcrumb under the top bar. Earlier
// crumbs are clickable and route back to the board; the trailing group crumb is
// the current location.
function renderBreadcrumb(ws, cat, g) {
  const bar = document.getElementById('breadcrumb-bar');
  if (!bar) return;
  bar.classList.remove('hidden');
  bar.innerHTML = '';

  const back = document.createElement('button');
  back.className = 'bc-back';
  back.type = 'button';
  back.title = 'Back to board';
  back.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Back`;
  back.onclick = closeGroupPage;
  bar.appendChild(back);

  const crumb = (label, sym, onClick) => {
    const b = document.createElement('button');
    b.className = 'bc-crumb' + (onClick ? '' : ' current');
    b.type = 'button';
    b.innerHTML = (sym ? `<span class="bc-sym">${esc(sym)}</span>` : '') + `<span>${esc(label)}</span>`;
    if (onClick) b.onclick = onClick; else b.setAttribute('aria-current', 'page');
    return b;
  };
  const sep = () => { const s = document.createElement('span'); s.className = 'bc-sep'; s.textContent = '›'; return s; };

  bar.appendChild(crumb(ws.name, ws.symbol, closeGroupPage));
  bar.appendChild(sep());
  bar.appendChild(crumb(cat.name, null, () => {
    // Selecting the category returns to the board with that category active
    // (Router.apply clears the group-page surface for a board route).
    Router.navigate({ type: 'board', wsId: ws.id, catId: cat.id, query: {} });
  }));
  bar.appendChild(sep());
  bar.appendChild(crumb(g.name, g.symbol, null));
}

// Render the active group page into #board. Returns false (leaving the board to
// render) when the group no longer exists or the user has navigated to a
// different workspace/category — which is how a category-tab click or a
// workspace switch transparently exits the page without per-call-site patches.
function renderGroupPage() {
  const info = activeGroupPage ? findGroup(activeGroupPage.groupId) : null;
  const cat = activeCat();
  if (!info || !cat || info.cat.id !== cat.id || info.ws.id !== State.get().activeWsId) {
    activeGroupPage = null;
    return false;
  }
  const g = info.group;

  renderBreadcrumb(info.ws, cat, g);

  const $b = document.getElementById('board');
  $b.classList.remove('list-mode', 'canvas-mode', 'explorer-mode', 'timeline-mode', 'calendar-mode');
  $b.classList.add('group-page-mode');
  $b.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'group-page';

  // Description / README — rich text reusing the note editor (so the RT toolbar
  // works on selection); its own placeholder overrides the note default.
  const readme = document.createElement('div');
  readme.className = 'gp-readme';
  readme.innerHTML = `<div class="gp-readme-editor note-text" contenteditable="true" spellcheck="false">${sanitizeHtml(g.readme || '')}</div>`;
  const rmEd = readme.querySelector('.gp-readme-editor');
  let rmDirty = false;
  rmEd.addEventListener('input', () => { rmDirty = true; });
  rmEd.addEventListener('blur', () => {
    if (!rmDirty) return;
    rmDirty = false;
    const html = sanitizeHtml(rmEd.innerHTML.trim());
    if (html !== (g.readme || '')) { State.snapshot('Edit group description'); g.readme = html; State.persist(); }
  });
  page.appendChild(readme);

  // The group's own reminders (§6) — e.g. "review this reading list every
  // Friday" — listed with edit/remove and an add affordance.
  const rem = document.createElement('div');
  rem.className = 'gp-reminders';
  renderGroupReminders(rem, g);
  page.appendChild(rem);

  // The group's items, reusing the fully-wired bento column (drag/drop, add
  // buttons, context menu, reminders all keep working), sized to the page.
  const body = document.createElement('div');
  body.className = 'gp-body';
  const col = buildGroupCol(g);
  col.classList.add('gcol-focused');
  body.appendChild(col);
  page.appendChild(body);

  $b.appendChild(page);
  applySearchFilter();
  return true;
}

// The reminders strip on a group page: a header with an add button, then one
// row per reminder with its next fire time, recurrence, and edit/remove.
function renderGroupReminders(container, g) {
  container.innerHTML = '';
  const list = Array.isArray(g.reminders) ? g.reminders : [];

  const head = document.createElement('div');
  head.className = 'gp-rem-head';
  head.innerHTML = '<span class="gp-rem-title">Reminders</span>';
  const add = document.createElement('button');
  add.type = 'button'; add.className = 'gp-rem-add';
  add.textContent = list.length ? '+ Add' : '+ Add a reminder';
  add.onclick = () => openEntityReminderPicker('group', g.id);
  head.appendChild(add);
  container.appendChild(head);

  if (!list.length) return;
  const ul = document.createElement('div');
  ul.className = 'gp-rem-list';
  list.forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'gp-rem-item' + (r.at < Date.now() && !r.recur ? ' past' : '');
    const when = new Date(r.at).toLocaleString(appLocale(), { dateStyle: 'medium', timeStyle: 'short' });
    const rec = r.recur ? ` · repeats ${recurLabel(r.recur)}` : '';
    const dot = document.createElement('span');
    dot.className = 'gp-rem-dot';
    dot.style.setProperty('--dot', reminderDotColor(r.color || g.color));
    const label = document.createElement('span');
    label.className = 'gp-rem-label';
    label.textContent = r.label || g.name;
    const time = document.createElement('span');
    time.className = 'gp-rem-when';
    time.textContent = when + rec;
    row.appendChild(dot);
    row.appendChild(label);
    row.appendChild(time);
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'gp-rem-btn'; edit.textContent = 'Edit';
    edit.onclick = () => openEntityReminderPicker('group', g.id, i);
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'gp-rem-btn danger'; del.textContent = 'Remove';
    del.onclick = () => removeEntityReminder('group', g.id, i);
    row.appendChild(edit); row.appendChild(del);
    ul.appendChild(row);
  });
  container.appendChild(ul);
}

// ════════════════════════════════════════════════════════════════
// ITEM DETAIL PANE (§4.2 — per-link content)
// ════════════════════════════════════════════════════════════════
// A right-docked modal context sheet for recovering a saved item: real title
// and location, open action, save context, reminder, and tags lead; cover,
// checklist, and custom fields stay progressive. It is addressable via board,
// library, or group routes so deep links and browser history remain coherent.
const DETAIL_COVER_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899'];
// Normalize a typed tag: trimmed, single-spaced, comma-free (commas delimit the
// dataset.tags blob the tag: operator reads), lowercased for case-insensitive
// matching.
const normalizeTag = s => String(s || '').trim().replace(/\s+/g, ' ').replace(/,/g, '').toLowerCase();

// Detail edits share one acknowledged-write boundary. The pending token is set
// before the graph changes, so blur, route, page-hide, and repeated activation
// all see the same transaction synchronously.
let itemDetailMutationPending = null;
let itemReminderMutationPending = null;
let itemDetailStatusTimer = null;

function isItemDetailMutationPending() {
  return !!itemDetailMutationPending || !!itemReminderMutationPending;
}

function itemDetailValueFingerprint(value) {
  try { return JSON.stringify(value); } catch { return ''; }
}

function itemDetailSurfaceFingerprint() {
  const ws = activeWs();
  const itemId = currentDetailItemId() || null;
  if (activeGroupPage) {
    return itemDetailValueFingerprint({ kind: 'group', wsId: ws?.id || null, groupId: activeGroupPage.groupId, itemId });
  }
  if (activeLibraryMode) {
    return itemDetailValueFingerprint({ kind: 'library', wsId: ws?.id || null, mode: activeLibraryMode, itemId });
  }
  if (activeHome) {
    return itemDetailValueFingerprint({ kind: 'home', wsId: ws?.id || null, itemId });
  }
  return itemDetailValueFingerprint({ kind: 'board', wsId: ws?.id || null, spaceId: activeCat()?.id || null, itemId });
}

function itemDetailLocationFingerprint(target) {
  return itemDetailValueFingerprint({
    workspace: { id: target.ws?.id || null, name: target.ws?.name || '' },
    space: { id: target.cat?.id || null, name: target.cat?.name || '' },
    group: { id: target.group?.id || null, name: target.group?.name || '' },
    parents: (target.parents || []).map(parent => ({
      id: parent?.id || null,
      type: parent?.type || null,
      name: parent?.name || '',
    })),
  });
}

// Capture both primitive identity and runtime references. Primitive IDs make
// exhaustive re-resolution deterministic; references additionally reject an
// indistinguishable object replacement until the user reopens the sheet.
function createItemDetailMutationContext(info) {
  if (!info?.ws || !info?.item || !info?.cat || !info?.group) return null;
  let rows = [];
  try { rows = collectWorkspaceItems(info.ws).filter(row => row.item === info.item); } catch { return null; }
  if (rows.length !== 1) return null;
  const row = rows[0];
  const workspaceId = String(info.ws.id || '');
  const spaceId = String(row.cat?.id || '');
  const groupId = String(row.group?.id || '');
  const parentIds = (row.parents || []).map(parent => String(parent?.id || ''));
  const itemId = String(row.item.id || '');
  const itemType = String(row.item.type || '');
  if (!workspaceId || !spaceId || !groupId || !itemId || !itemType || parentIds.some(id => !id)) return null;
  return {
    workspaceId,
    spaceId,
    groupId,
    parentIds,
    itemId,
    itemType,
    itemFingerprint: itemDetailValueFingerprint(row.item),
    locationFingerprint: itemDetailLocationFingerprint({ ws: info.ws, ...row }),
    surfaceFingerprint: itemDetailSurfaceFingerprint(),
    workspaceRef: info.ws,
    spaceRef: row.cat,
    groupRef: row.group,
    parentRefs: [...(row.parents || [])],
    itemRef: row.item,
  };
}

function resolveItemDetailMutationTarget(context) {
  if (!context || context.surfaceFingerprint !== itemDetailSurfaceFingerprint()) return null;
  const state = State.get();
  const workspaces = (state.workspaces || []).filter(workspace => String(workspace?.id || '') === context.workspaceId);
  if (workspaces.length !== 1 || workspaces[0] !== context.workspaceRef) return null;
  const ws = workspaces[0];
  const spaces = (state.workspaces || []).flatMap(workspace => workspace.categories || [])
    .filter(space => String(space?.id || '') === context.spaceId);
  if (spaces.length !== 1 || spaces[0] !== context.spaceRef) return null;
  const cat = spaces[0];
  const groups = (state.workspaces || []).flatMap(workspace => workspace.categories || [])
    .flatMap(space => space.groups || [])
    .filter(group => String(group?.id || '') === context.groupId);
  if (groups.length !== 1 || groups[0] !== context.groupRef) return null;
  const group = groups[0];

  let rows = [];
  try {
    rows = (state.workspaces || []).flatMap(workspace =>
      collectWorkspaceItems(workspace).map(row => ({ ws: workspace, ...row }))
    );
  } catch { return null; }
  const matches = rows.filter(row => String(row.item?.id || '') === context.itemId);
  if (matches.length !== 1) return null;
  const target = matches[0];
  const parentIds = (target.parents || []).map(parent => String(parent?.id || ''));
  if (target.ws !== ws || target.cat !== cat || target.group !== group || target.item !== context.itemRef) return null;
  if (String(target.item?.type || '') !== context.itemType) return null;
  if (parentIds.length !== context.parentIds.length || parentIds.some((id, index) => id !== context.parentIds[index])) return null;
  if ((target.parents || []).some((parent, index) => parent !== context.parentRefs[index])) return null;
  for (let index = 0; index < context.parentIds.length; index += 1) {
    const ancestorMatches = rows.filter(row => String(row.item?.id || '') === context.parentIds[index]);
    if (ancestorMatches.length !== 1 || ancestorMatches[0].item !== target.parents[index] || target.parents[index]?.type !== 'stack') return null;
  }
  if (itemDetailValueFingerprint(target.item) !== context.itemFingerprint) return null;
  if (itemDetailLocationFingerprint(target) !== context.locationFingerprint) return null;
  return target;
}

function clearItemDetailStatusTimer() {
  if (itemDetailStatusTimer == null) return;
  clearTimeout(itemDetailStatusTimer);
  itemDetailStatusTimer = null;
}

function setItemDetailMutationStatus(root, key = '', tone = '') {
  const status = root?.querySelector?.('[data-idp-save-status]');
  if (!status) return;
  status.textContent = key ? tr(key) : '';
  if (tone) status.dataset.tone = tone;
  else delete status.dataset.tone;
}

function setItemDetailMutationBusy(root, busy) {
  if (!root) return;
  root.classList.toggle('idp-mutation-pending', busy);
  // Keep the live status outside the busy subtree so assistive technology can
  // announce “Saving…” immediately instead of deferring it until completion.
  const busyRegion = root.querySelector('.idp-body');
  if (busyRegion) busyRegion.setAttribute('aria-busy', String(busy));
  const selector = '.idp-actions button, .idp-body button, .idp-body input, .idp-body textarea, .idp-body select, .idp-body summary, .idp-body [contenteditable]';
  if (busy) {
    root.querySelectorAll(selector).forEach(control => {
      if (control.dataset.idpBusyControl === 'true') return;
      control.dataset.idpBusyControl = 'true';
      control.dataset.idpPreviousAriaDisabled = control.hasAttribute('aria-disabled')
        ? String(control.getAttribute('aria-disabled'))
        : '__missing__';
      control.setAttribute('aria-disabled', 'true');
      if ('readOnly' in control) {
        control.dataset.idpPreviousReadonly = String(!!control.readOnly);
        control.readOnly = true;
      }
      if (control.hasAttribute('contenteditable')) {
        control.dataset.idpPreviousContenteditable = String(control.getAttribute('contenteditable'));
        control.setAttribute('contenteditable', 'false');
      }
    });
    setItemDetailMutationStatus(root, 'detail.saving', 'pending');
    return;
  }
  root.querySelectorAll('[data-idp-busy-control="true"]').forEach(control => {
    if (control.dataset.idpPreviousAriaDisabled === '__missing__') control.removeAttribute('aria-disabled');
    else control.setAttribute('aria-disabled', control.dataset.idpPreviousAriaDisabled);
    if ('readOnly' in control && control.dataset.idpPreviousReadonly != null) {
      control.readOnly = control.dataset.idpPreviousReadonly === 'true';
    }
    if (control.dataset.idpPreviousContenteditable != null) {
      control.setAttribute('contenteditable', control.dataset.idpPreviousContenteditable);
    }
    delete control.dataset.idpBusyControl;
    delete control.dataset.idpPreviousAriaDisabled;
    delete control.dataset.idpPreviousReadonly;
    delete control.dataset.idpPreviousContenteditable;
  });
}

function handleItemDetailPendingClick(event) {
  if (!isItemDetailMutationPending()) return;
  const interactive = event.target?.closest?.('.idp-scrim, button, input, textarea, select, summary, [contenteditable]');
  if (!interactive) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function handleItemDetailPendingKeydownCapture(event) {
  if (!isItemDetailMutationPending() || event.key === 'Tab') return;
  // Capture phase prevents target-level formatting/add-item handlers from running
  // against the immutable candidate while the receipt is unresolved.
  event.preventDefault();
  event.stopImmediatePropagation();
}

function cloneItemDetailJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isItemDetailRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

// Apply only the JSON slots changed by the detached candidate. Same-length
// checklist/custom-field arrays retain their live row objects, which lets a
// pane-preserving text edit keep its existing DOM closures and focus.
function applyItemDetailCandidate(target, before, candidate) {
  if (Array.isArray(before) && Array.isArray(candidate)) {
    if (!Array.isArray(target)) throw new Error('Item detail candidate no longer matches the live array.');
    if (before.length !== candidate.length || target.length !== before.length) {
      target.splice(0, target.length, ...candidate.map(cloneItemDetailJson));
      return;
    }
    for (let index = 0; index < candidate.length; index += 1) {
      const beforeValue = before[index];
      const candidateValue = candidate[index];
      if (itemDetailValueFingerprint(beforeValue) === itemDetailValueFingerprint(candidateValue)) continue;
      if (Array.isArray(beforeValue) && Array.isArray(candidateValue) && Array.isArray(target[index])) {
        applyItemDetailCandidate(target[index], beforeValue, candidateValue);
      } else if (isItemDetailRecord(beforeValue) && isItemDetailRecord(candidateValue) && isItemDetailRecord(target[index])) {
        applyItemDetailCandidate(target[index], beforeValue, candidateValue);
      } else {
        target[index] = cloneItemDetailJson(candidateValue);
      }
    }
    return;
  }
  if (!isItemDetailRecord(before) || !isItemDetailRecord(candidate) || !isItemDetailRecord(target)) {
    throw new Error('Item detail candidate no longer matches the live item.');
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(candidate)]);
  keys.forEach(key => {
    const beforeHas = Object.prototype.hasOwnProperty.call(before, key);
    const candidateHas = Object.prototype.hasOwnProperty.call(candidate, key);
    if (beforeHas === candidateHas
        && itemDetailValueFingerprint(before[key]) === itemDetailValueFingerprint(candidate[key])) return;
    if (!candidateHas) {
      delete target[key];
      return;
    }
    if (Array.isArray(before[key]) && Array.isArray(candidate[key]) && Array.isArray(target[key])) {
      applyItemDetailCandidate(target[key], before[key], candidate[key]);
    } else if (isItemDetailRecord(before[key]) && isItemDetailRecord(candidate[key]) && isItemDetailRecord(target[key])) {
      applyItemDetailCandidate(target[key], before[key], candidate[key]);
    } else {
      target[key] = cloneItemDetailJson(candidate[key]);
    }
  });
}

async function commitItemDetailMutation(context, label, mutate, opts = {}) {
  if (isItemDetailMutationPending()) return false;
  const root = document.getElementById('item-detail');
  if (State.isRecoveryRequired?.()) {
    setItemDetailMutationStatus(root, 'detail.saveFailed', 'error');
    return false;
  }
  const target = resolveItemDetailMutationTarget(context);
  if (!root?.classList.contains('open') || !target) {
    clearItemDetailStatusTimer();
    setItemDetailMutationStatus(root, 'detail.changed', 'error');
    return false;
  }

  // User-supplied field logic runs against a detached JSON candidate first. A
  // synchronous bug therefore cannot leave a partial live graph or phantom
  // history entry; the candidate diff is the only live mutation below.
  let before;
  let candidate;
  try {
    const beforeJson = JSON.stringify(target.item);
    before = JSON.parse(beforeJson);
    candidate = JSON.parse(beforeJson);
    mutate(candidate);
  } catch {
    clearItemDetailStatusTimer();
    setItemDetailMutationStatus(root, 'detail.saveFailed', 'error');
    return false;
  }
  if (itemDetailValueFingerprint(before) === itemDetailValueFingerprint(candidate)) return true;

  const transaction = { itemId: context.itemId };
  itemDetailMutationPending = transaction;
  clearItemDetailStatusTimer();
  setItemDetailMutationBusy(root, true);
  try {
    State.snapshot(label);
    applyItemDetailCandidate(target.item, before, candidate);
  } catch (error) {
    itemDetailMutationPending = null;
    setItemDetailMutationBusy(root, false);
    setItemDetailMutationStatus(root, 'detail.saveFailed', 'error');
    State.requireRecovery?.();
    if (typeof showStateRecoveryRequired === 'function') showStateRecoveryRequired(error);
    return false;
  }

  try {
    await State.persistNow();
  } catch (error) {
    if (itemDetailMutationPending === transaction) itemDetailMutationPending = null;
    setItemDetailMutationBusy(root, false);
    setItemDetailMutationStatus(root, 'detail.saveFailed', 'error');
    if (State.isRecoveryRequired?.() && typeof showStateRecoveryRequired === 'function') {
      showStateRecoveryRequired(error);
    }
    return false;
  }

  if (itemDetailMutationPending !== transaction) return false;
  itemDetailMutationPending = null;
  context.itemFingerprint = itemDetailValueFingerprint(target.item);
  context.locationFingerprint = itemDetailLocationFingerprint(target);
  setItemDetailMutationBusy(root, false);
  renderBoard();
  if (opts.pane !== false) renderItemDetail();
  else {
    syncItemDetailHeading(target.item);
    if (typeof opts.afterSuccess === 'function') opts.afterSuccess(target.item);
  }

  const liveRoot = document.getElementById('item-detail');
  if (liveRoot?.classList.contains('open') && liveRoot.dataset.itemId === context.itemId) {
    setItemDetailMutationStatus(liveRoot, 'detail.saved', 'success');
    itemDetailStatusTimer = setTimeout(() => {
      if (!isItemDetailMutationPending() && liveRoot.classList.contains('open') && liveRoot.dataset.itemId === context.itemId) {
        setItemDetailMutationStatus(liveRoot);
      }
      itemDetailStatusTimer = null;
    }, 2400);
  }
  return true;
}

function ensureItemDetailRoot() {
  let root = document.getElementById('item-detail');
  if (!root) {
    root = document.createElement('div');
    root.id = 'item-detail';
    document.body.appendChild(root);
    inheritActiveBodyInterlocks(root);
  }
  if (!root.__itemDetailPendingGuardBound) {
    root.addEventListener('click', handleItemDetailPendingClick, true);
    root.addEventListener('keydown', handleItemDetailPendingKeydownCapture, true);
    root.__itemDetailPendingGuardBound = true;
  }
  return root;
}

// Capture the invoking control before routed navigation rebuilds its surface.
// The item id is the fallback when that exact node no longer exists afterward.
function prepareItemDetailOpen(id, returnFocusKey = '') {
  const root = ensureItemDetailRoot();
  if (!root.classList.contains('open') || root.dataset.itemId !== String(id)) {
    rememberOpener(root);
    root.dataset.returnItemId = String(id);
    if (returnFocusKey) root.dataset.returnFocusKey = String(returnFocusKey);
    else delete root.dataset.returnFocusKey;
  }
}

function setItemDetailBackgroundInert(enabled) {
  ['app', 'landing-layer'].forEach(id => {
    const el = document.getElementById(id);
    setElementInertOwner(el, 'detail', enabled);
  });
}

function focusItemDetailTarget(el, scroll = false) {
  if (!el || typeof el.focus !== 'function') return false;
  if (!el.matches(FOCUSABLE_SELECTOR) && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  try {
    el.focus({ preventScroll: !scroll });
    if (scroll && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
  } catch {
    try { el.focus(); } catch {}
  }
  return document.activeElement === el;
}

function restoreItemDetailFocus(root, itemId, returnFocusKey = '') {
  if (restoreOpener(root)) return;
  const escaped = itemId && typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(String(itemId))
    : String(itemId || '').replace(/["\\]/g, '\\$&');
  const escapedReturnKey = returnFocusKey && typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(String(returnFocusKey))
    : String(returnFocusKey || '').replace(/["\\]/g, '\\$&');
  const selectors = [
    ...(escapedReturnKey ? [`.home-prow[data-home-preview-key="${escapedReturnKey}"]`] : []),
    ...(escaped ? [
      `.home-prow[data-item-id="${escaped}"]`,
      `.library-row[data-id="${escaped}"] .library-more`,
      `.read-later-row[data-id="${escaped}"] .library-more`,
      `.item[data-id="${escaped}"]`,
      `[data-item-id="${escaped}"][tabindex]`,
      `[data-id="${escaped}"] button`,
      `[data-id="${escaped}"]`,
    ] : []),
  ];
  const target = selectors.map(selector => document.querySelector(selector)).find(Boolean);
  if (focusItemDetailTarget(target, true)) return;
  const board = document.getElementById('board');
  focusItemDetailTarget(board?.querySelector('h1, [role="heading"]') || board);
}

function isItemDetailEditor(target) {
  if (!target || target.nodeType !== Node.ELEMENT_NODE) return false;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;
  return !!target.closest('[contenteditable="true"]');
}

function flushActiveItemDetailEditor() {
  const root = document.getElementById('item-detail');
  const active = document.activeElement;
  if (!root?.classList.contains('open') || !root.contains(active) || !isItemDetailEditor(active)) return false;
  const editor = active.closest('[contenteditable="true"]') || active;
  try { editor.blur(); } catch { return false; }
  return true;
}

function flushItemDetailBeforePageHide() {
  if (isItemDetailMutationPending() || State.isRecoveryRequired?.()) return true;
  flushActiveItemDetailEditor();
  if (isItemDetailMutationPending() || State.isRecoveryRequired?.()) return true;
  // An editor may have blurred just before teardown, leaving its ordinary
  // debounce pending even though focus is now elsewhere or the sheet is closed.
  // Replace any dirty-state timer with an immediate write attempt;
  // recordMutation:false avoids counting the same edit twice.
  if (!State.needsPersistence()) return false;
  try { void State.persistNow({ recordMutation: false }); } catch {}
  return true;
}

function handleItemDetailKeydown(event, root) {
  if (event.key === 'Tab') {
    trapTabKey(event, root.querySelector('.idp-panel'));
    return;
  }
  const recovery = document.getElementById('state-recovery-overlay');
  if (recovery && !recovery.classList.contains('hidden')) return;
  if (isItemDetailMutationPending()) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (event.key !== 'Escape') return;
  const reminder = document.getElementById('reminder-overlay');
  if (reminder && !reminder.classList.contains('hidden')) {
    event.preventDefault();
    event.stopPropagation();
    closeReminderPicker();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (isItemDetailEditor(event.target)) {
    const editor = event.target.closest('[contenteditable="true"]') || event.target;
    try { editor.blur(); } catch {}
    focusItemDetailTarget(root.querySelector('.idp-panel'));
    return;
  }
  closeItemDetail();
}

function detailRecurLabel(recur) {
  const interval = Math.max(1, Number(recur?.interval) || 1);
  if (recur?.every === 'day') return interval === 1 ? tr('detail.daily') : tr('detail.everyDays', { count: interval });
  if (recur?.every === 'week') return interval === 1 ? tr('detail.weekly') : tr('detail.everyWeeks', { count: interval });
  if (recur?.every === 'month') return interval === 1 ? tr('detail.monthly') : tr('detail.everyMonths', { count: interval });
  return '';
}

function syncItemDetailHeading(it) {
  const heading = document.getElementById('idp-heading');
  if (heading) heading.textContent = _searchItemTitle(it) || _searchTypeLabel(it.type);
}

// The primary field(s) per item kind. Stack identity routes through the shared
// receipt-gated editor; the note body itself is still edited on the card.
function detailPrimaryEditor(it, commit) {
  const wrap = document.createElement('div');
  wrap.className = 'idp-primary';
  if (it.type === 'note') {
    wrap.innerHTML = `<div class="idp-note-preview">${sanitizeHtml(it.html || '') || `<span class="idp-muted">${esc(tr('detail.emptyNote'))}</span>`}</div>`;
    return wrap;
  }
  const mk = (cls, val, label, focusKey) => {
    const input = document.createElement('input');
    input.className = cls;
    input.value = val || '';
    input.placeholder = label;
    input.setAttribute('aria-label', label);
    input.dataset.idpFocus = focusKey;
    input.spellcheck = false;
    return input;
  };
  if (it.type === 'tab') {
    const t = mk('idp-title-input', it.title, tr('detail.title'), 'title');
    const u = mk('idp-url-input', it.url, tr('detail.url'), 'url');
    t.addEventListener('change', () => {
      if (t.value !== it.title) {
        void commit(tr('detail.history.editTitle'), live => { live.title = t.value; }, { pane: false });
      }
    });
    u.addEventListener('change', () => {
      if (u.value !== it.url) {
        void commit(tr('detail.history.editUrl'), live => { live.url = u.value; }, { pane: false });
      }
    });
    wrap.appendChild(t); wrap.appendChild(u);
    return wrap;
  }
  if (it.type === 'todo') {
    const row = document.createElement('div'); row.className = 'idp-todo-row';
    const chk = document.createElement('button'); chk.type = 'button'; chk.className = 'idp-todo-check' + (it.done ? ' done' : '');
    chk.dataset.idpFocus = 'todo-toggle';
    chk.setAttribute('aria-label', tr(it.done ? 'detail.markIncomplete' : 'detail.markComplete'));
    chk.setAttribute('aria-pressed', String(!!it.done));
    chk.onclick = () => { void commit(tr('detail.history.updateTask'), live => { live.done = !live.done; }); };
    const t = mk('idp-title-input', it.text, tr('detail.task'), 'task');
    t.addEventListener('change', () => {
      if (t.value !== it.text) {
        void commit(tr('detail.history.updateTask'), live => { live.text = t.value; }, { pane: false });
      }
    });
    row.appendChild(chk); row.appendChild(t); wrap.appendChild(row);
    return wrap;
  }
  // stack
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'idp-title-input idp-identity-button';
  edit.textContent = it.name || tr('stackEditor.defaultName');
  edit.dataset.idpFocus = 'stack-identity';
  edit.setAttribute('aria-label', tr('stackAction.editFor', { name: it.name || tr('stackEditor.defaultName') }));
  edit.onclick = event => {
    const identity = identityStackTarget(it.id);
    openIdentityEditor('stack', 'edit', {
      workspaceId: identity?.workspace.id,
      spaceId: identity?.space.id,
      groupId: identity?.group.id,
      stackId: it.id,
    }, event.currentTarget);
  };
  wrap.appendChild(edit);
  return wrap;
}

// Re-render just the detail pane (used by paths that mutate an item's reminder
// through the shared setReminder/clearReminder flow, which only calls renderBoard).
function refreshDetailPane() { renderItemDetail(); }

function renderItemDetail() {
  let root = document.getElementById('item-detail');
  const id = currentDetailItemId();
  const ws = activeWs();
  const surface = activeGroupPage
    ? { wsId: ws?.id, groupId: activeGroupPage.groupId }
    : activeLibraryMode
      ? { wsId: ws?.id, libraryMode: activeLibraryMode }
      : activeHome
        ? { wsId: ws?.id }
        : (!activeSearch && !activeCalendar ? { wsId: ws?.id, catId: activeCat()?.id } : null);
  const homeTarget = activeHome ? resolveUniqueHomePreviewItem(ws?.id, id) : null;
  const validId = activeHome
    ? (homeTarget?.item?.id || null)
    : (surface ? validDetailItemIdForSurface(id, surface) : null);
  const info = activeHome ? homeTarget : (validId ? findItem(validId) : null);
  const wasOpen = !!root?.classList.contains('open');
  const previousItemId = root?.dataset.itemId || '';
  const returnItemId = root?.dataset.returnItemId || previousItemId || id || '';
  const returnFocusKey = root?.dataset.returnFocusKey || '';

  // Nothing open, or a stale/deleted id in the URL → tear the pane down and drop
  // the dead id so Router.sync() normalizes the address bar on the next tick.
  if (!info) {
    if (wasOpen) flushActiveItemDetailEditor();
    clearItemDetailStatusTimer();
    const reminderOverlay = document.getElementById('reminder-overlay');
    if (reminderOverlay && !reminderOverlay.classList.contains('hidden')) closeReminderPicker();
    if (root) {
      root.classList.remove('open');
      setElementInertOwner(root, 'reminder', false);
      root.onkeydown = null;
      root.innerHTML = '';
      delete root.dataset.itemId;
      delete root.dataset.advancedItemId;
      delete root.dataset.advancedOpen;
      delete root.dataset.returnFocusKey;
    }
    document.body.classList.remove('detail-open');
    setItemDetailBackgroundInert(false);
    if (id) { if (activeGroupPage) activeGroupPage.itemId = null; else boardDetailItemId = null; }
    if (wasOpen && root) {
      setTimeout(() => {
        if (!root.classList.contains('open')) restoreItemDetailFocus(root, returnItemId, returnFocusKey);
      }, 0);
    }
    return;
  }
  const it = info.item;
  root = root || ensureItemDetailRoot();
  const sameItem = wasOpen && previousItemId === String(id);
  const focusOwner = sameItem && root.contains(document.activeElement)
    ? document.activeElement.closest('[data-idp-focus]')
    : null;
  const focusKey = focusOwner?.dataset.idpFocus || '';
  const savedAdvancedOpen = root.dataset.advancedItemId === String(id) ? root.dataset.advancedOpen : null;

  root.dataset.itemId = String(id);
  if (!sameItem) root.dataset.returnItemId = String(id);
  root.classList.add('open');
  const reminderOverlay = document.getElementById('reminder-overlay');
  setElementInertOwner(root, 'reminder', !!(reminderOverlay && !reminderOverlay.classList.contains('hidden')));
  root.onkeydown = event => handleItemDetailKeydown(event, root);
  document.body.classList.add('detail-open');
  setItemDetailBackgroundInert(true);

  // Freeze the rendered owner/path/item before wiring fields. Every direct
  // detail edit re-resolves this context and crosses the shared receipt gate.
  const mutationContext = createItemDetailMutationContext(info);
  const commit = (label, fn, opts = {}) => commitItemDetailMutation(mutationContext, label, fn, opts);

  const heading = _searchItemTitle(it) || _searchTypeLabel(it.type);
  const locationLabel = [info.cat?.name, info.group?.name].filter(Boolean).join(' · ');
  root.innerHTML = `
    <div class="idp-scrim" aria-hidden="true"></div>
    <aside class="idp-panel" role="dialog" aria-modal="true" aria-labelledby="idp-heading" aria-describedby="idp-location" tabindex="-1">
      <header class="idp-hd">
        <div class="idp-hd-copy">
          <span class="idp-type idp-type-${esc(it.type)}">${esc(_searchTypeLabel(it.type))}</span>
          <h2 class="idp-heading" id="idp-heading">${esc(heading)}</h2>
          <p class="idp-location" id="idp-location">${esc(locationLabel)}</p>
          <span class="idp-save-status" data-idp-save-status role="status" aria-live="polite" aria-atomic="true"></span>
        </div>
        <div class="idp-actions">
          ${it.type === 'tab' && it.url ? `<button class="idp-open idp-btn primary" type="button" data-idp-focus="open">${esc(tr('detail.open'))}</button>` : ''}
          <button class="idp-close" type="button" data-idp-focus="close" title="${esc(tr('detail.closeTitle'))}" aria-label="${esc(tr('detail.close'))}">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
      </header>
      <div class="idp-body"></div>
    </aside>`;
  root.querySelector('.idp-scrim').onclick = closeItemDetail;
  root.querySelector('.idp-close').onclick = closeItemDetail;
  const openButton = root.querySelector('.idp-open');
  if (openButton) openButton.onclick = () => openTabMaybeHibernated(it.url, { focus: true });
  const body = root.querySelector('.idp-body');

  const section = (title, parent = body) => {
    const s = document.createElement('section');
    s.className = 'idp-sec';
    if (title) { const h = document.createElement('h3'); h.className = 'idp-sec-t'; h.textContent = title; s.appendChild(h); }
    parent.appendChild(s);
    return s;
  };

  // ── Primary editor ───────────────────────────────────────────────
  section().appendChild(detailPrimaryEditor(it, commit));

  // ── Cover ────────────────────────────────────────────────────────
  const cov = section(tr('detail.cover'));
  const covRow = document.createElement('div'); covRow.className = 'idp-cover-row';
  DETAIL_COVER_COLORS.forEach((c, index) => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'idp-swatch' + (it.cover && it.cover.color === c ? ' sel' : '');
    b.style.background = c;
    b.dataset.idpFocus = `cover-color-${index}`;
    b.setAttribute('aria-label', tr('detail.coverColor', { color: c }));
    b.setAttribute('aria-pressed', String(it.cover?.color === c));
    b.onclick = () => { void commit(tr('detail.history.updateCover'), live => { live.cover = { color: c }; }); };
    covRow.appendChild(b);
  });
  const emo = document.createElement('input'); emo.className = 'idp-cover-emoji'; emo.maxLength = 2; emo.placeholder = '😀';
  emo.value = (it.cover && it.cover.emoji) || '';
  emo.dataset.idpFocus = 'cover-emoji';
  emo.setAttribute('aria-label', tr('detail.coverEmoji'));
  emo.addEventListener('change', () => {
    const value = emo.value.trim();
    void commit(tr('detail.history.updateCover'), live => {
      if (value) live.cover = { emoji: value };
      else delete live.cover;
    });
  });
  covRow.appendChild(emo);
  const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'idp-cover-clear'; clr.textContent = tr('detail.clearCover');
  clr.dataset.idpFocus = 'cover-clear';
  clr.onclick = () => { void commit(tr('detail.history.updateCover'), live => { delete live.cover; }); };
  covRow.appendChild(clr);
  cov.appendChild(covRow);

  // ── Reminder ─────────────────────────────────────────────────────
  const rem = section(tr('detail.reminder'));
  const remWrap = document.createElement('div'); remWrap.className = 'idp-rem';
  if (it.reminder && it.reminder.at) {
    const past = it.reminder.at < Date.now();
    const when = document.createElement('span');
    when.className = 'idp-rem-when' + (past ? ' past' : '');
    const recur = it.reminder.recur ? detailRecurLabel(it.reminder.recur) : '';
    when.textContent = [
      past ? tr('detail.pastDue') : '',
      new Date(it.reminder.at).toLocaleString(appLocale()),
      fmtTimeRelative(it.reminder.at),
      recur ? tr('detail.repeats', { schedule: recur }) : '',
    ].filter(Boolean).join(' · ');
    remWrap.appendChild(when);
    const change = document.createElement('button'); change.type = 'button'; change.className = 'idp-btn'; change.textContent = tr('detail.changeReminder'); change.dataset.idpFocus = 'reminder-change'; change.onclick = () => openReminderPicker(it.id, mutationContext);
    const clr2 = document.createElement('button'); clr2.type = 'button'; clr2.className = 'idp-btn danger'; clr2.textContent = tr('detail.clearReminder'); clr2.dataset.idpFocus = 'reminder-clear'; clr2.onclick = () => { void commitItemDetailReminderMutation(mutationContext, null); };
    remWrap.appendChild(change); remWrap.appendChild(clr2);
  } else {
    const set = document.createElement('button'); set.type = 'button'; set.className = 'idp-btn primary'; set.textContent = tr('detail.setReminder'); set.dataset.idpFocus = 'reminder-set'; set.onclick = () => openReminderPicker(it.id, mutationContext);
    remWrap.appendChild(set);
  }
  rem.appendChild(remWrap);

  // ── Notes annotation (rich text, reuses the .note-text RT toolbar) ─
  const nsec = section(tr('detail.whySaved'));
  const ned = document.createElement('div');
  ned.className = 'idp-notes note-text';
  ned.contentEditable = 'true'; ned.spellcheck = false;
  ned.dataset.idpFocus = 'notes';
  ned.setAttribute('aria-label', tr('detail.whySaved'));
  ned.setAttribute('data-ph', tr('detail.notesPlaceholder'));
  ned.innerHTML = sanitizeHtml(it.notes || '');
  ned.addEventListener('blur', () => {
    const html = sanitizeHtml(ned.innerHTML);
    if (html !== (it.notes || '')) {
      void commit(tr('detail.history.editNotes'), live => { live.notes = autoLinkify(html); }, {
        pane: false,
        afterSuccess: live => { ned.innerHTML = sanitizeHtml(live.notes || ''); },
      });
    }
  });
  ned.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); document.execCommand('bold'); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); document.execCommand('italic'); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') { e.preventDefault(); document.execCommand('underline'); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); rtCreateLink(); }
  });
  nsec.appendChild(ned);

  // ── Tags (feed the tag: search operator) ──────────────────────────
  const tsec = section(tr('detail.tags'));
  const chips = document.createElement('div'); chips.className = 'idp-tags';
  (it.tags || []).forEach((tg, i) => {
    const c = document.createElement('span'); c.className = 'idp-tag';
    c.innerHTML = `<span>${esc(tg)}</span>`;
    const x = document.createElement('button'); x.type = 'button'; x.className = 'idp-tag-x'; x.setAttribute('aria-label', tr('detail.removeTag', { tag: tg })); x.textContent = '×';
    x.dataset.idpFocus = `tag-remove-${i}`;
    x.onclick = () => {
      void commit(tr('detail.history.updateTags'), live => {
        live.tags.splice(i, 1);
        if (!live.tags.length) delete live.tags;
      });
    };
    c.appendChild(x); chips.appendChild(c);
  });
  const tin = document.createElement('input'); tin.id = 'idp-tag-input'; tin.className = 'idp-tag-input'; tin.placeholder = tr('detail.addTag'); tin.spellcheck = false;
  tin.dataset.idpFocus = 'tag-add';
  tin.setAttribute('aria-label', tr('detail.addTag'));
  tin.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = normalizeTag(tin.value);
      if (!v || (it.tags || []).includes(v)) return;
      void commit(tr('detail.history.updateTags'), live => { (live.tags = live.tags || []).push(v); });
    }
  });
  chips.appendChild(tin);
  tsec.appendChild(chips);

  // ── Checklist (mini sub-todos on any item) ────────────────────────
  const csec = section(tr('detail.checklist'));
  const list = it.checklist || [];
  if (list.length) {
    const cnt = document.createElement('span'); cnt.className = 'idp-sec-count';
    cnt.textContent = `${list.filter(x => x.done).length}/${list.length}`;
    csec.querySelector('.idp-sec-t').appendChild(cnt);
  }
  const cl = document.createElement('div'); cl.className = 'idp-checklist';
  list.forEach((row, i) => {
    const r = document.createElement('div'); r.className = 'idp-cl-row' + (row.done ? ' done' : '');
    const chk = document.createElement('button'); chk.type = 'button'; chk.className = 'idp-cl-check' + (row.done ? ' done' : ''); chk.setAttribute('aria-label', tr('detail.toggleChecklist', { item: row.text || tr('detail.checklistItem') }));
    chk.dataset.idpFocus = `check-toggle-${i}`;
    chk.setAttribute('aria-pressed', String(!!row.done));
    chk.onclick = () => {
      void commit(tr('detail.history.updateChecklist'), live => { live.checklist[i].done = !live.checklist[i].done; });
    };
    const tx = document.createElement('input'); tx.className = 'idp-cl-text'; tx.value = row.text || ''; tx.placeholder = tr('detail.checklistItem');
    tx.dataset.idpFocus = `check-text-${i}`;
    tx.setAttribute('aria-label', tr('detail.checklistItem'));
    tx.addEventListener('change', () => {
      if (tx.value !== row.text) {
        void commit(tr('detail.history.updateChecklist'), live => { live.checklist[i].text = tx.value; }, { pane: false });
      }
    });
    const x = document.createElement('button'); x.type = 'button'; x.className = 'idp-cl-x'; x.setAttribute('aria-label', tr('detail.removeChecklist', { item: row.text || tr('detail.checklistItem') })); x.textContent = '×';
    x.dataset.idpFocus = `check-remove-${i}`;
    x.onclick = () => {
      void commit(tr('detail.history.updateChecklist'), live => {
        live.checklist.splice(i, 1);
        if (!live.checklist.length) delete live.checklist;
      });
    };
    r.appendChild(chk); r.appendChild(tx); r.appendChild(x); cl.appendChild(r);
  });
  const addIn = document.createElement('input'); addIn.id = 'idp-cl-input'; addIn.className = 'idp-cl-add'; addIn.placeholder = tr('detail.addChecklist');
  addIn.dataset.idpFocus = 'check-add';
  addIn.setAttribute('aria-label', tr('detail.addChecklist'));
  addIn.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = addIn.value.trim();
      if (!v) return;
      void commit(tr('detail.history.updateChecklist'), live => {
        (live.checklist = live.checklist || []).push({ text: v, done: false });
      });
    }
  });
  cl.appendChild(addIn);
  csec.appendChild(cl);

  // ── Custom fields (arbitrary label/value pairs) ───────────────────
  const fsec = section(tr('detail.customFields'));
  const cfList = it.customFields || [];
  const cf = document.createElement('div'); cf.className = 'idp-fields';
  cfList.forEach((row, i) => {
    const r = document.createElement('div'); r.className = 'idp-cf-row';
    const l = document.createElement('input'); l.className = 'idp-cf-label'; l.value = row.label || ''; l.placeholder = tr('detail.fieldLabel');
    l.dataset.idpFocus = `field-label-${i}`;
    l.setAttribute('aria-label', tr('detail.fieldLabel'));
    l.addEventListener('change', () => {
      if (l.value !== row.label) {
        void commit(tr('detail.history.updateFields'), live => { live.customFields[i].label = l.value; }, { pane: false });
      }
    });
    const v = document.createElement('input'); v.className = 'idp-cf-value'; v.value = row.value || ''; v.placeholder = tr('detail.fieldValue');
    v.dataset.idpFocus = `field-value-${i}`;
    v.setAttribute('aria-label', tr('detail.fieldValue'));
    v.addEventListener('change', () => {
      if (v.value !== row.value) {
        void commit(tr('detail.history.updateFields'), live => { live.customFields[i].value = v.value; }, { pane: false });
      }
    });
    const x = document.createElement('button'); x.type = 'button'; x.className = 'idp-cf-x'; x.setAttribute('aria-label', tr('detail.removeField', { label: row.label || tr('detail.fieldLabel') })); x.textContent = '×';
    x.dataset.idpFocus = `field-remove-${i}`;
    x.onclick = () => {
      void commit(tr('detail.history.updateFields'), live => {
        live.customFields.splice(i, 1);
        if (!live.customFields.length) delete live.customFields;
      });
    };
    r.appendChild(l); r.appendChild(v); r.appendChild(x); cf.appendChild(r);
  });
  const addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.className = 'idp-add-field'; addBtn.textContent = `+ ${tr('detail.addField')}`;
  addBtn.dataset.idpFocus = 'field-add';
  addBtn.onclick = () => {
    void commit(tr('detail.history.updateFields'), live => {
      (live.customFields = live.customFields || []).push({ label: '', value: '' });
    });
  };
  cf.appendChild(addBtn);
  fsec.appendChild(cf);

  // Keep recovery context primary. Decoration, checklist, and arbitrary fields
  // stay available without competing with the reason an item was saved.
  body.appendChild(nsec);
  body.appendChild(rem);
  body.appendChild(tsec);
  const advanced = document.createElement('details');
  advanced.className = 'idp-advanced';
  const hasAdvancedData = !!it.cover || !!it.checklist?.length || !!it.customFields?.length;
  advanced.open = savedAdvancedOpen == null ? hasAdvancedData : savedAdvancedOpen === 'true';
  const advancedSummary = document.createElement('summary');
  advancedSummary.className = 'idp-advanced-summary';
  advancedSummary.dataset.idpFocus = 'advanced';
  advancedSummary.textContent = tr('detail.more');
  const advancedBody = document.createElement('div');
  advancedBody.className = 'idp-advanced-body';
  advancedBody.appendChild(cov);
  advancedBody.appendChild(csec);
  advancedBody.appendChild(fsec);
  advanced.appendChild(advancedSummary);
  advanced.appendChild(advancedBody);
  body.appendChild(advanced);
  root.dataset.advancedItemId = String(id);
  root.dataset.advancedOpen = String(advanced.open);
  advanced.addEventListener('toggle', () => { root.dataset.advancedOpen = String(advanced.open); });

  setTimeout(() => {
    if (!root.classList.contains('open') || root.dataset.itemId !== String(id) || root.inert) return;
    const panel = root.querySelector('.idp-panel');
    if (!sameItem) {
      focusItemDetailTarget(panel);
      return;
    }
    if (focusKey) {
      const escapedKey = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(focusKey) : focusKey;
      if (focusItemDetailTarget(root.querySelector(`[data-idp-focus="${escapedKey}"]`))) return;
    }
    if (!root.contains(document.activeElement)) focusItemDetailTarget(panel);
  }, 0);
}

// ════════════════════════════════════════════════════════════════
// FLOATING TOOL WIDGETS - pop tools out as draggable mini windows
// ════════════════════════════════════════════════════════════════
const FLOATING_TOOLS = {
  pomodoro: { title: 'Pomodoro', icon: '🍅' },
  finance:  { title: 'Finance',  icon: '💰' },
  habits:   { title: 'Habits',   icon: '🔁' },
  water:    { title: 'Water',    icon: '💧' },
  goals:    { title: 'Goals',    icon: '🎯' },
  subs:     { title: 'Subs',     icon: '💳' },
  books:    { title: 'Reading',  icon: '📚' },
  workout:  { title: 'Workout',  icon: '💪' }
};

function getFloating() {
  const s = State.get();
  if (!s.floating) s.floating = [];
  return s.floating;
}

function popOutTool(toolKey) {
  const f = getFloating();
  if (f.find(x => x.tool === toolKey)) {
    toast('Already floating');
    return;
  }
  f.push({
    tool: toolKey,
    x: 100 + f.length * 30,
    y: 100 + f.length * 30,
    w: 280,
    h: 200,
    minimized: false
  });
  // Close the source overlay
  const overlayMap = {
    pomodoro: 'pomo-overlay',
    finance:  'fin-overlay',
    habits:   'habit-overlay',
    water:    'water-overlay',
    goals:    'goals-overlay',
    subs:     'subs-overlay',
    books:    'books-overlay',
    workout:  'workout-overlay'
  };
  const ovId = overlayMap[toolKey];
  const ovEl = ovId ? document.getElementById(ovId) : null;
  if (ovEl && !ovEl.classList.contains('hidden')) {
    ovEl.classList.add('hidden');
    unlockBodyScroll();
  }
  State.persist();
  renderFloatingWidgets();
}

function closeFloating(toolKey) {
  const f = getFloating();
  const i = f.findIndex(x => x.tool === toolKey);
  if (i > -1) f.splice(i, 1);
  State.persist();
  renderFloatingWidgets();
}

function renderFloatingWidgets() {
  let layer = document.getElementById('floating-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'floating-layer';
    document.body.appendChild(layer);
  }
  const wanted = new Map(getFloating().map(w => [w.tool, w]));
  // Tear down widgets that are no longer in state. Leaving the rest alone
  // (instead of rebuilding everything) avoids the entrance animation
  // flickering on every open/close, and prevents global drag listeners
  // from being re-registered on widgets that didn't change.
  layer.querySelectorAll('.fw-window').forEach(el => {
    const tool = el.dataset.tool;
    if (!wanted.has(tool)) {
      if (el._abort) try { el._abort.abort(); } catch {}
      const body = el.querySelector('.fw-body');
      if (body && body._pomoUpdater) { clearInterval(body._pomoUpdater); body._pomoUpdater = null; }
      el.remove();
    } else {
      // Sync existing widget's position from state in case it changed.
      const w = wanted.get(tool);
      if (el.style.left !== w.x + 'px') el.style.left = w.x + 'px';
      if (el.style.top !== w.y + 'px') el.style.top = w.y + 'px';
      wanted.delete(tool);
    }
  });
  // Mount only newly added widgets — these animate in fresh.
  wanted.forEach(w => layer.appendChild(buildFloatingWidget(w)));
}

function buildFloatingWidget(w) {
  const meta = FLOATING_TOOLS[w.tool] || { title: w.tool, icon: '⚡' };
  const el = document.createElement('div');
  el.className = 'fw-window' + (w.minimized ? ' minimized' : '');
  el.dataset.tool = w.tool;
  el.style.left = w.x + 'px';
  el.style.top = w.y + 'px';
  if (!w.minimized) {
    el.style.width = w.w + 'px';
    el.style.height = w.h + 'px';
  }

  // Per-widget AbortController so global drag/resize listeners get cleaned
  // up when the widget is torn down (prevents listener-leak induced lag).
  const ac = new AbortController();
  el._abort = ac;
  const sig = ac.signal;

  el.innerHTML = `
    <div class="fw-titlebar">
      <span class="fw-icon">${meta.icon}</span>
      <span class="fw-title">${esc(meta.title)}</span>
      <div class="fw-actions">
        <button class="fw-btn" data-act="min" title="${w.minimized ? 'Restore' : 'Minimize'}">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="${w.minimized ? 'M2 4h6v2H2z' : 'M2 7h6'}" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/></svg>
        </button>
        <button class="fw-btn" data-act="open" title="Open full">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1.5H2A.5.5 0 001.5 2v1M7 1.5h1A.5.5 0 018.5 2v1M3 8.5H2A.5.5 0 011.5 8V7M7 8.5h1A.5.5 0 008.5 8V7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        </button>
        <button class="fw-btn fw-close" data-act="close" title="Close">
          <svg width="9" height="9" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
    <div class="fw-body" id="fw-body-${w.tool}"></div>
    <div class="fw-resize"></div>`;

  // Render compact tool view
  const body = el.querySelector('.fw-body');
  if (!w.minimized) renderFloatingBody(w.tool, body);

  // Buttons
  el.querySelectorAll('.fw-btn').forEach(b => {
    b.onclick = (ev) => {
      ev.stopPropagation();
      const a = b.dataset.act;
      if (a === 'close') closeFloating(w.tool);
      else if (a === 'min') {
        w.minimized = !w.minimized;
        State.persist();
        toggleFloatingMinimize(el, w);
      } else if (a === 'open') {
        // Open the full tool overlay AND remove from floating
        closeFloating(w.tool);
        if (w.tool === 'pomodoro') openPomo();
        else if (w.tool === 'finance') openFin();
        else if (w.tool === 'habits') openHabits();
        else if (w.tool === 'water') openWater();
        else if (w.tool === 'goals') openGoals();
        else if (w.tool === 'subs') openSubsTracker();
        else if (w.tool === 'books') openBooks();
        else if (w.tool === 'workout') openWorkout();
      }
    };
  });

  // Drag the title bar — rAF throttled to keep at 60fps and avoid jank
  // even when several widgets are open.
  const tb = el.querySelector('.fw-titlebar');
  let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
  tb.addEventListener('mousedown', (e) => {
    if (e.target.closest('.fw-actions')) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startLeft = w.x; startTop = w.y;
    el.classList.add('fw-dragging');
    el.style.zIndex = 9999;
    e.preventDefault();
  }, { signal: sig });
  const onMove = rafThrottle((e) => {
    if (!dragging) return;
    w.x = Math.max(0, Math.min(window.innerWidth - 60, startLeft + (e.clientX - startX)));
    w.y = Math.max(0, Math.min(window.innerHeight - 30, startTop + (e.clientY - startY)));
    el.style.left = w.x + 'px';
    el.style.top = w.y + 'px';
  });
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('fw-dragging');
    State.persist();
  };
  document.addEventListener('mousemove', onMove, { signal: sig });
  document.addEventListener('mouseup', onUp, { signal: sig });

  // Resize
  const resizer = el.querySelector('.fw-resize');
  if (resizer && !w.minimized) {
    let resizing = false, rsx = 0, rsy = 0, rsw = 0, rsh = 0;
    resizer.addEventListener('mousedown', (e) => {
      resizing = true;
      rsx = e.clientX; rsy = e.clientY;
      rsw = w.w; rsh = w.h;
      e.stopPropagation();
      e.preventDefault();
    }, { signal: sig });
    const onResMove = rafThrottle((e) => {
      if (!resizing) return;
      w.w = Math.max(220, rsw + (e.clientX - rsx));
      w.h = Math.max(120, rsh + (e.clientY - rsy));
      el.style.width = w.w + 'px';
      el.style.height = w.h + 'px';
    });
    const onResUp = () => {
      if (!resizing) return;
      resizing = false;
      State.persist();
      renderFloatingBody(w.tool, body);
    };
    document.addEventListener('mousemove', onResMove, { signal: sig });
    document.addEventListener('mouseup', onResUp, { signal: sig });
  }

  // Bring to front on click
  el.addEventListener('mousedown', () => {
    el.style.zIndex = 9999;
    document.querySelectorAll('.fw-window').forEach(o => { if (o !== el) o.style.zIndex = 9990; });
  }, { signal: sig });

  return el;
}

// In-place minimize/restore avoids the full rebuild that re-runs the
// fwIn entrance animation across every widget (which is what made
// the popouts flicker on toggle).
function toggleFloatingMinimize(el, w) {
  if (w.minimized) {
    el.classList.add('minimized');
    el.style.width = '';
    el.style.height = '';
  } else {
    el.classList.remove('minimized');
    el.style.width = w.w + 'px';
    el.style.height = w.h + 'px';
    const body = el.querySelector('.fw-body');
    if (body) renderFloatingBody(w.tool, body);
  }
  const minBtn = el.querySelector('.fw-btn[data-act="min"]');
  if (minBtn) {
    minBtn.title = w.minimized ? 'Restore' : 'Minimize';
    minBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10"><path d="${w.minimized ? 'M2 4h6v2H2z' : 'M2 7h6'}" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/></svg>`;
  }
}

function renderFloatingBody(tool, container) {
  if (tool === 'pomodoro') renderFloatingPomo(container);
  else if (tool === 'finance') renderFloatingFin(container);
  else if (tool === 'habits') renderFloatingHabits(container);
  else if (tool === 'water') renderFloatingWater(container);
  else if (tool === 'goals') renderFloatingGoals(container);
  else if (tool === 'subs') renderFloatingSubs(container);
  else if (tool === 'books') renderFloatingBooks(container);
  else if (tool === 'workout') renderFloatingWorkout(container);
}

function renderFloatingBooks(c) {
  const books = getBooks();
  const reading = books.filter(b => b.status === 'reading').length;
  const finishedYr = books.filter(b => {
    if (b.status !== 'finished' || !b.date) return false;
    return new Date(b.date).getFullYear() === new Date().getFullYear();
  }).length;
  const goal = getBooksCfg().yearlyGoal || 12;
  c.innerHTML = `
    <div class="fw-fin">
      <div class="fw-fin-stat">
        <div class="fw-fin-lbl">Currently reading</div>
        <div class="fw-fin-val">${reading}</div>
        <div class="fw-fin-sub">${finishedYr}/${goal} done this year</div>
      </div>
      <button class="fw-quickadd-btn" data-a="add">📖 Open shelves</button>
    </div>`;
  c.querySelector('[data-a=add]').onclick = () => { closeFloating('books'); openBooks(); };
}

function renderFloatingWorkout(c) {
  const wos = getWorkouts();
  const now = Date.now();
  const weekMs = 7 * 86400000;
  const weekCt = wos.filter(w => now - new Date(w.date).getTime() < weekMs);
  const weekMin = weekCt.reduce((a, w) => a + (Number(w.duration) || 0), 0);
  c.innerHTML = `
    <div class="fw-fin">
      <div class="fw-fin-stat">
        <div class="fw-fin-lbl">This week</div>
        <div class="fw-fin-val">${weekCt.length} · ${weekMin}m</div>
        <div class="fw-fin-sub">🔥 ${computeWorkoutStreak()} day streak</div>
      </div>
      <button class="fw-quickadd-btn" data-a="add">+ Log workout</button>
    </div>`;
  c.querySelector('[data-a=add]').onclick = () => { closeFloating('workout'); openWorkout(); };
}

function renderFloatingPomo(c) {
  const p = getPomo();
  const total = (pomoState.mode === 'focus' ? p.settings.focus : pomoState.mode === 'short' ? p.settings.short : p.settings.long) * 60;
  const remaining = pomoState.remaining || total;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  c.innerHTML = `
    <div class="fw-pomo">
      <div class="fw-pomo-time">${m}:${String(s).padStart(2,'0')}</div>
      <div class="fw-pomo-mode">${pomoState.mode}</div>
      <div class="fw-pomo-ctrls">
        <button class="fw-mini-btn" data-a="reset"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M10 4.5a4 4 0 10-1 5m1-5V2m0 2.5h-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="fw-mini-btn primary" data-a="toggle">${pomoState.running ? '⏸' : '▶'}</button>
        <button class="fw-mini-btn" data-a="skip"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 3l5 3-5 3V3zM9 3v6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
    </div>`;
  c.querySelectorAll('.fw-mini-btn').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'toggle') (pomoState.running ? pausePomoTimer() : startPomoTimer());
    else if (a === 'reset') resetPomo();
    else if (a === 'skip') onPomoFinish();
    setTimeout(() => renderFloatingBody('pomodoro', c), 50);
  });
  // Tick: only update the time text — full re-render only on state changes.
  if (pomoState.running && !c._pomoUpdater) {
    c._pomoUpdater = setInterval(() => {
      if (!document.contains(c)) { clearInterval(c._pomoUpdater); c._pomoUpdater = null; return; }
      const timeEl = c.querySelector('.fw-pomo-time');
      if (!timeEl) { clearInterval(c._pomoUpdater); c._pomoUpdater = null; return; }
      const mm = Math.floor(pomoState.remaining / 60);
      const ss = pomoState.remaining % 60;
      timeEl.textContent = `${mm}:${String(ss).padStart(2,'0')}`;
    }, 1000);
  } else if (!pomoState.running && c._pomoUpdater) {
    clearInterval(c._pomoUpdater);
    c._pomoUpdater = null;
  }
}

function renderFloatingFin(c) {
  const f = getFin();
  const cur = f.settings?.defaultCurrency || 'TWD';
  const sym = ({ USD:'$', EUR:'€', GBP:'£', TWD:'NT$', JPY:'¥', CNY:'¥', KRW:'₩' })[cur] || '$';
  const today = new Date().toISOString().slice(0, 10);
  const todayTxns = (f.txns || []).filter(t => (t.date || '').slice(0, 10) === today);
  const FX = { USD:1, EUR:1.09, GBP:1.28, TWD:0.031, JPY:0.0067, CNY:0.14, KRW:0.00074 };
  const totalToday = todayTxns.reduce((a, t) => a + Number(t.amount) * (FX[t.currency] || 1) / (FX[cur] || 1), 0);
  c.innerHTML = `
    <div class="fw-fin">
      <div class="fw-fin-stat">
        <div class="fw-fin-lbl">Today</div>
        <div class="fw-fin-val">${sym}${totalToday.toFixed(cur === 'JPY' || cur === 'KRW' ? 0 : 2)}</div>
        <div class="fw-fin-sub">${todayTxns.length} transactions</div>
      </div>
      <button class="fw-quickadd-btn" data-a="add">+ Quick log</button>
    </div>`;
  c.querySelector('[data-a=add]').onclick = () => { closeFloating('finance'); openFin(); };
}

function renderFloatingHabits(c) {
  const habits = getHabits();
  const today = new Date().toISOString().slice(0, 10);
  if (!habits.length) {
    c.innerHTML = `<div class="fw-empty">No habits yet</div>`;
    return;
  }
  c.innerHTML = `<div class="fw-habits">${habits.slice(0, 6).map(h => {
    const done = (h.dates || []).includes(today);
    return `<div class="fw-habit-row" data-id="${h.id}">
      <span class="fw-habit-icon">${esc(h.icon || '✅')}</span>
      <span class="fw-habit-name">${esc(h.name)}</span>
      <button class="fw-habit-toggle ${done ? 'done' : ''}" data-id="${h.id}">${done ? '✓' : ' '}</button>
    </div>`;
  }).join('')}</div>`;
  c.querySelectorAll('.fw-habit-toggle').forEach(btn => btn.onclick = () => {
    const h = habits.find(x => x.id === btn.dataset.id);
    if (!h) return;
    State.snapshot('Habit toggle');
    h.dates = h.dates || [];
    if (h.dates.includes(today)) h.dates = h.dates.filter(d => d !== today);
    else h.dates.push(today);
    State.persist();
    renderFloatingHabits(c);
  });
}

function renderFloatingWater(c) {
  const w = getWater();
  const today = new Date().toISOString().slice(0, 10);
  const cnt = w.days[today] || 0;
  const pct = Math.min(100, (cnt / w.goal) * 100);
  c.innerHTML = `
    <div class="fw-water">
      <div class="fw-water-bar"><div class="fw-water-fill" style="width:${pct}%"></div></div>
      <div class="fw-water-stat">${cnt} / ${w.goal} glasses</div>
      <div class="fw-water-ctrls">
        <button class="fw-mini-btn" data-a="-">−</button>
        <button class="fw-mini-btn primary" data-a="+">+ Glass</button>
      </div>
    </div>`;
  c.querySelectorAll('.fw-mini-btn').forEach(b => b.onclick = () => {
    State.snapshot('water');
    const w = getWater();
    if (b.dataset.a === '+') { w.days[today] = (w.days[today] || 0) + 1; w.total = (w.total || 0) + 1; }
    else { w.days[today] = Math.max(0, (w.days[today] || 0) - 1); w.total = Math.max(0, (w.total || 0) - 1); }
    State.persist();
    renderFloatingWater(c);
  });
}

function renderFloatingGoals(c) {
  const goals = getGoals();
  if (!goals.length) {
    c.innerHTML = `<div class="fw-empty">No goals yet</div>`;
    return;
  }
  c.innerHTML = `<div class="fw-goals">${goals.slice(0, 5).map(g => `
    <div class="fw-goal-row">
      <div class="fw-goal-name">${esc(g.name)}</div>
      <div class="fw-goal-bar"><div class="fw-goal-fill" style="width:${g.progress || 0}%"></div></div>
      <span class="fw-goal-pct">${g.progress || 0}%</span>
    </div>`).join('')}</div>`;
}

function renderFloatingSubs(c) {
  const subs = getSubs();
  if (!subs.length) {
    c.innerHTML = `<div class="fw-empty">No subscriptions yet</div>`;
    return;
  }
  const mainCur = State.get().subSettings?.defaultCurrency || 'USD';
  const monthlyUSD = subs.reduce((a, s) => a + subMonthlyCostUSD(s), 0);
  const monthly = monthlyUSD / (FX_TO_USD[mainCur] || 1);
  // Upcoming in 7 days (by next billing date)
  const upcoming = subs.filter(s => {
    if (s.paused) return false;
    const d = daysUntil(s.nextBilling);
    return d != null && d >= 0 && d <= 7;
  }).sort((a, b) => (daysUntil(a.nextBilling) ?? 9999) - (daysUntil(b.nextBilling) ?? 9999)).slice(0, 4);
  c.innerHTML = `
    <div class="fw-subs">
      <div class="fw-subs-stat">
        <div class="fw-subs-lbl">Monthly</div>
        <div class="fw-subs-val">${formatMoney(monthly, mainCur)}</div>
      </div>
      ${upcoming.length ? `<div class="fw-subs-up">${upcoming.map(s => `
        <div class="fw-subs-row">
          <span class="fw-subs-name">${esc(s.name)}</span>
          <span class="fw-subs-days">${(daysUntil(s.nextBilling) || 0)}d</span>
        </div>`).join('')}</div>` : `<div class="fw-empty">No upcoming bills</div>`}
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// CANVAS VIEW (free positioning, idea-board style)
// ════════════════════════════════════════════════════════════════
function getCanvasPositions() {
  const cat = activeCat();
  if (!cat) return {};
  if (!cat.canvasPositions) cat.canvasPositions = {};
  return cat.canvasPositions;
}

function getCanvasGroupEl(gId) {
  return Array.from(document.querySelectorAll('.gcol.cv-group')).find(el => el.dataset.gid === gId);
}

function canvasGroupFootprint(savedSize, fallback) {
  const width = typeof savedSize === 'number' ? savedSize : savedSize?.w;
  const cardsHeight = typeof savedSize === 'object' ? savedSize?.h : null;
  return {
    w: Number.isFinite(Number(width)) && Number(width) > 0 ? Number(width) : fallback.w,
    // Saved height belongs to the cards region; include conservative header,
    // composer, and spacing chrome for the complete column footprint.
    h: Number.isFinite(Number(cardsHeight)) && Number(cardsHeight) > 0
      ? Math.max(fallback.h, Number(cardsHeight) + 150)
      : fallback.h,
  };
}

function canvasGroupRect(g, positions, fallback, savedSize = null) {
  const el = getCanvasGroupEl(g.id);
  const pos = positions[g.id] || { x: 0, y: 0 };
  const footprint = canvasGroupFootprint(savedSize, fallback);
  return {
    x: Number(pos.x) || 0,
    y: Number(pos.y) || 0,
    w: el?.offsetWidth || footprint.w,
    h: el?.offsetHeight || footprint.h,
  };
}

function canvasRectsOverlap(a, b, gap = 24) {
  return a.x < b.x + b.w + gap &&
    a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap &&
    a.y + a.h + gap > b.y;
}

function findOpenCanvasPosition(group, groups, positions, preferredSize = null, groupSizes = null) {
  const board = document.getElementById('board');
  const colW = parseFloat(getComputedStyle(document.body).getPropertyValue('--gw')) || 290;
  const viewportHeight = Number(window.innerHeight)
    || Number(document.documentElement?.clientHeight)
    || 720;
  // Unsized cards may occupy the full CSS 60vh cap. Include the same
  // conservative header/composer chrome used for saved card heights.
  const fallback = { w: colW, h: Math.max(330, Math.round(viewportHeight * 0.6) + 150) };
  const footprint = canvasGroupFootprint(preferredSize, fallback);
  const occupied = groups
    .filter(g => g.id !== group.id && positions[g.id])
    .map(g => canvasGroupRect(g, positions, fallback, groupSizes?.[g.id]));

  const startX = Math.max(30, (board?.scrollLeft || 0) + 30);
  const startY = Math.max(30, (board?.scrollTop || 0) + 30);
  const stepX = Math.max(footprint.w + 30, 320);
  const stepY = Math.max(footprint.h + 36, 366);
  const columns = Math.max(3, Math.ceil((board?.clientWidth || 960) / stepX) + 1);

  for (let row = 0; row < 24; row++) {
    for (let col = 0; col < columns; col++) {
      const candidate = { x: startX + col * stepX, y: startY + row * stepY, ...footprint };
      if (!occupied.some(rect => canvasRectsOverlap(candidate, rect))) return { x: candidate.x, y: candidate.y };
    }
  }

  const below = occupied.reduce((max, rect) => Math.max(max, rect.y + rect.h), startY);
  return { x: startX, y: below + 36 };
}

function placeMissingCanvasPositions(cat, positions) {
  let changed = false;
  const live = new Set(cat.groups.map(g => g.id));
  Object.keys(positions).forEach(id => {
    if (!live.has(id)) { delete positions[id]; changed = true; }
  });
  cat.groups.forEach(g => {
    if (!positions[g.id]) {
      positions[g.id] = findOpenCanvasPosition(g, cat.groups, positions);
      changed = true;
    }
  });
  const anchors = new Set();
  cat.groups.forEach(g => {
    const pos = positions[g.id];
    const key = `${Math.round((Number(pos?.x) || 0) / 20)}:${Math.round((Number(pos?.y) || 0) / 20)}`;
    if (anchors.has(key)) {
      positions[g.id] = findOpenCanvasPosition(g, cat.groups, positions);
      changed = true;
    }
    const next = positions[g.id];
    anchors.add(`${Math.round((Number(next?.x) || 0) / 20)}:${Math.round((Number(next?.y) || 0) / 20)}`);
  });
  return changed;
}

function renderCanvasView() {
  const $b = document.getElementById('board');
  $b.innerHTML = '';
  $b.classList.remove('list-mode');
  $b.classList.add('canvas-mode');
  const cat = activeCat(); if (!cat) return;

  if (!cat.groups.length) {
    $b.appendChild(buildEmptySpaceState(cat));
    return;
  }

  // Canvas wrapper - large scrollable area
  const wrap = document.createElement('div');
  wrap.className = 'cv-canvas';
  $b.appendChild(wrap);

  const positions = getCanvasPositions();
  if (placeMissingCanvasPositions(cat, positions)) State.persist();

  cat.groups.forEach(g => {
    const pos = positions[g.id] || { x: 30, y: 30 };
    const col = buildGroupCol(g);
    col.classList.add('cv-group');
    col.style.left = (pos.x || 0) + 'px';
    col.style.top = (pos.y || 0) + 'px';
    if (!col.style.width) col.style.width = '290px';

    // Make the header a drag handle
    const hd = col.querySelector('.gcol-hd');
    if (hd) {
      let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
      hd.addEventListener('mousedown', (e) => {
        // Don't drag when clicking buttons or symbol or input
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.gcol-sym-wrap') || e.target.closest('.gcol-acts')) return;
        dragging = true;
        startX = e.clientX; startY = e.clientY;
        startLeft = parseFloat(col.style.left) || 0;
        startTop = parseFloat(col.style.top) || 0;
        col.classList.add('cv-dragging');
        e.preventDefault();
      });
      const onMove = (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newX = Math.max(0, startLeft + dx);
        const newY = Math.max(0, startTop + dy);
        col.style.left = newX + 'px';
        col.style.top = newY + 'px';
      };
      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        col.classList.remove('cv-dragging');
        positions[g.id] = {
          x: parseFloat(col.style.left) || 0,
          y: parseFloat(col.style.top) || 0
        };
        State.persist();
        // Update wrap min-size to fit content
        sizeCanvas(wrap, cat.groups, positions);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      // Cleanup when re-rendering
      col._cvCleanup = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
    }

    wrap.appendChild(col);
  });

  sizeCanvas(wrap, cat.groups, positions);
  applySearchFilter();
}

function sizeCanvas(wrap, groups, positions) {
  let maxX = 0, maxY = 0;
  for (const g of groups) {
    const p = positions[g.id] || { x: 0, y: 0 };
    const el = wrap.querySelector(`.gcol[data-gid="${g.id}"]`);
    const w = el ? el.offsetWidth : 290;
    const h = el ? el.offsetHeight : 300;
    maxX = Math.max(maxX, p.x + w + 100);
    maxY = Math.max(maxY, p.y + h + 100);
  }
  wrap.style.minWidth = maxX + 'px';
  wrap.style.minHeight = maxY + 'px';
}

function renderListView() {
  const $b = document.getElementById('board');
  $b.innerHTML = '';
  $b.classList.add('list-mode');
  const cat = activeCat(); if (!cat) return;

  if (!cat.groups.length) {
    $b.appendChild(buildEmptySpaceState(cat));
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'lv-wrap';
  cat.groups.forEach(g => wrap.appendChild(buildLvGroup(g)));

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'lv-add-row';
  add.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><path d="M6.5 2v9M2 6.5h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> ${esc(tr('groupAction.new'))}`;
  add.onclick = event => {
    const workspace = activeWs();
    openIdentityEditor('group', 'create', {
      workspaceId: workspace?.id,
      spaceId: cat.id,
    }, event.currentTarget);
  };
  wrap.appendChild(add);

  $b.appendChild(wrap);
  applySearchFilter();
}

function buildLvGroup(g) {
  const wrap = document.createElement('div');
  wrap.className = 'lv-group' + (g.collapsed ? ' collapsed' : '');
  wrap.dataset.gid = g.id;
  wrap.style.setProperty('--gcol-tint', g.color);

  const todoStat = (() => {
    const todos = g.items.filter(it => it.type === 'todo');
    if (!todos.length) return '';
    const done = todos.filter(t => t.done).length;
    return `<span class="lv-todo-cnt${done === todos.length ? ' all-done' : ''}">${done}/${todos.length}</span>`;
  })();

  const hd = document.createElement('div');
  hd.className = 'lv-group-hd';
  hd.setAttribute('role', 'group');
  hd.setAttribute('aria-label', tr('groupAction.aria', { name: g.name }));
  hd.innerHTML = `
    <button class="lv-chev lv-group-toggle" type="button" aria-expanded="${!g.collapsed}" aria-label="${esc(tr(g.collapsed ? 'groupAction.expandFor' : 'groupAction.collapseFor', { name: g.name }))}"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3.5 2.5l3 2.5-3 2.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <button class="lv-group-sym" type="button" aria-label="${esc(tr('groupAction.editFor', { name: g.name }))}">${esc(g.symbol || '📁')}</button>
    <span class="lv-group-name">${esc(g.name)}</span>
    <span class="lv-group-cnt">${g.items.length}</span>
    ${todoStat}
    <div class="lv-group-acts">
      <button class="lv-act-btn" data-act="focus" title="${esc(tr('groupAction.openAsPage'))}" aria-label="${esc(tr('groupAction.openAsPage'))}"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 4V2h2M10 4V2H8M2 8v2h2M10 8v2H8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button class="lv-act-btn" data-act="open-all" title="${esc(tr('groupAction.openAll'))}" aria-label="${esc(tr('groupAction.openAll'))}"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M4 2.5H2a1 1 0 00-1 1v6.5A1 1 0 002 11h6.5a1 1 0 001-1V8M7 1h4m0 0v4M11 1L5.5 6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button class="lv-act-btn" data-act="add-tab" title="Add selected sidebar tabs or the active browser tab"><svg width="11" height="11" viewBox="0 0 12 12"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
      <button class="lv-act-btn" data-act="more" title="${esc(tr('groupAction.more'))}" aria-label="${esc(tr('groupAction.moreFor', { name: g.name }))}" aria-haspopup="menu"><svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><circle cx="3" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="9" cy="6" r="1"/></svg></button>
    </div>`;

  const toggleButton = hd.querySelector('.lv-group-toggle');
  const toggleGroup = () => {
    State.snapshot('Toggle');
    g.collapsed = !g.collapsed;
    wrap.classList.toggle('collapsed');
    toggleButton.setAttribute('aria-expanded', String(!g.collapsed));
    toggleButton.setAttribute('aria-label', tr(g.collapsed ? 'groupAction.expandFor' : 'groupAction.collapseFor', { name: g.name }));
    State.persist();
  };
  hd.addEventListener('click', e => {
    if (e.target.closest('button') || e.target.closest('.lv-group-acts') || e.target.closest('.lv-group-sym')) return;
    toggleGroup();
  });
  toggleButton.addEventListener('click', event => { event.stopPropagation(); toggleGroup(); });
  hd.querySelector('.lv-group-sym').addEventListener('click', (e) => {
    e.stopPropagation();
    const identity = identityGroupTarget(g.id);
    openIdentityEditor('group', 'edit', {
      workspaceId: identity?.workspace.id,
      spaceId: identity?.space.id,
      groupId: g.id,
      focusField: 'symbol',
    }, e.currentTarget);
  });
  hd.querySelectorAll('.lv-act-btn').forEach(btn => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const act = btn.dataset.act;
    if (act === 'focus') openGroupPage(g.id);
    else if (act === 'open-all') openGroupAll(g.id);
    else if (act === 'add-tab') {
      await addSidebarOrActiveTabToGroup(g);
    }
    else if (act === 'more') {
      const identity = identityGroupTarget(g.id);
      const params = { workspaceId: identity?.workspace.id, spaceId: identity?.space.id, groupId: g.id };
      const rect = btn.getBoundingClientRect();
      showContextMenu(rect.left, rect.bottom + 6, [
      { text: tr('groupAction.edit'), icon: cmIcons.edit, action: () => openIdentityEditor('group', 'edit', params, btn) },
      { text: tr('groupAction.duplicate'), icon: cmIcons.copy, action: () => openIdentityEditor('group', 'duplicate', params, btn) },
      { text: tr('groupAction.addStack'), icon: cmIcons.stack, action: () => openIdentityEditor('stack', 'create', params, btn) },
      { sep: true },
      ...organizationGroupMoveMenuItems(g.id, btn),
      { sep: true },
      { text: tr('groupAction.archive'), icon: cmIcons.archive, action: () => archiveGroup(g.id) }
    ], { focusFirst: true });
    }
  }));
  hd.addEventListener('contextmenu', e => {
    e.preventDefault();
    focusDialogOpener(toggleButton);
    const identity = identityGroupTarget(g.id);
    const params = { workspaceId: identity?.workspace.id, spaceId: identity?.space.id, groupId: g.id };
    showContextMenu(e.pageX, e.pageY, [
      { text: tr('groupAction.edit'), icon: cmIcons.edit, action: () => openIdentityEditor('group', 'edit', params, toggleButton) },
      { text: tr('groupAction.openAll'), icon: cmIcons.open, action: () => openGroupAll(g.id) },
      { text: tr('groupAction.duplicate'), icon: cmIcons.copy, action: () => openIdentityEditor('group', 'duplicate', params, toggleButton) },
      { sep: true },
      ...organizationGroupMoveMenuItems(g.id, toggleButton),
      { sep: true },
      { text: tr('groupAction.archive'), icon: cmIcons.archive, action: () => archiveGroup(g.id) }
    ], { focusFirst: true });
  });
  wrap.appendChild(hd);

  const children = document.createElement('div');
  children.className = 'lv-children';
  g.items.forEach(it => children.appendChild(buildLvItem(it, g.items, g, 1)));
  wrap.appendChild(children);
  makeGroupDropZone(children, wrap, g, g.items);

  if (document.body.classList.contains('reorder-mode')) {
    wrap.draggable = true;
    wrap.addEventListener('dragstart', (e) => {
      drag = { kind:'group', srcId: g.id };
      wrap.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.stopPropagation();
    });
    wrap.addEventListener('dragend', () => { wrap.classList.remove('dragging'); document.querySelectorAll('.lv-group').forEach(x => { x.classList.remove('drop-before'); x.classList.remove('drop-after'); }); drag = null; });
    wrap.addEventListener('dragover', e => {
      if (drag?.kind === 'group' && drag.srcId !== g.id) {
        e.preventDefault();
        const r = wrap.getBoundingClientRect();
        const after = e.clientY > r.top + r.height / 2;
        document.querySelectorAll('.lv-group').forEach(x => { x.classList.remove('drop-before'); x.classList.remove('drop-after'); });
        wrap.classList.add(after ? 'drop-after' : 'drop-before');
      }
    });
    wrap.addEventListener('drop', e => {
      if (drag?.kind === 'group' && drag.srcId !== g.id) {
        e.preventDefault();
        const cat = activeCat();
        const r = wrap.getBoundingClientRect();
        const after = e.clientY > r.top + r.height / 2;
        State.snapshot('Reorder groups');
        const srcIdx = cat.groups.findIndex(x => x.id === drag.srcId);
        const [src] = cat.groups.splice(srcIdx, 1);
        let tgtIdx = cat.groups.findIndex(x => x.id === g.id);
        if (after) tgtIdx++;
        cat.groups.splice(tgtIdx, 0, src);
        State.persist(); renderBoard();
      }
    });
  }
  return wrap;
}

function buildLvItem(it, parentItems, group, depth) {
  if (it.type === 'stack') return buildLvStack(it, parentItems, group, depth);
  const inner = buildItem(it, parentItems, group);
  inner.classList.add('lv-item-inner');
  const row = document.createElement('div');
  row.className = 'lv-row';
  row.style.paddingLeft = (16 + depth * 18) + 'px';
  row.appendChild(inner);
  return row;
}

function buildLvStack(it, parentItems, group, depth) {
  const wrap = document.createElement('div');
  wrap.className = 'lv-stack' + (it.expanded ? ' expanded' : '');
  wrap.dataset.id = it.id;
  if (it.color) wrap.dataset.color = it.color; // let color: search match list-view stacks

  const hd = document.createElement('div');
  hd.className = 'lv-stack-hd';
  hd.style.paddingLeft = (16 + depth * 18) + 'px';
  hd.setAttribute('role', 'group');
  hd.setAttribute('aria-label', tr('stackAction.aria', { name: it.name || tr('stackEditor.defaultName') }));
  const cnt = (it.items || []).length;
  hd.innerHTML = `
    <button class="lv-chev lv-stack-toggle" type="button" aria-expanded="${!!it.expanded}" aria-label="${esc(tr(it.expanded ? 'stackAction.collapseFor' : 'stackAction.expandFor', { name: it.name || tr('stackEditor.defaultName') }))}"><svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M3.5 2.5l3 2.5-3 2.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <button class="lv-stack-sym" type="button" aria-label="${esc(tr('stackAction.editFor', { name: it.name || tr('stackEditor.defaultName') }))}">${esc(it.symbol || '📚')}</button>
    <span class="lv-stack-name">${esc(it.name || tr('stackEditor.defaultName'))}</span>
    <span class="lv-stack-cnt">${cnt}</span>`;
  const toggleButton = hd.querySelector('.lv-stack-toggle');
  const toggleStack = () => {
    State.snapshot('Toggle stack');
    it.expanded = !it.expanded;
    wrap.classList.toggle('expanded');
    toggleButton.setAttribute('aria-expanded', String(!!it.expanded));
    toggleButton.setAttribute('aria-label', tr(it.expanded ? 'stackAction.collapseFor' : 'stackAction.expandFor', { name: it.name || tr('stackEditor.defaultName') }));
    State.persist();
  };
  const openStackIdentity = (opener, focusField) => {
    const identity = identityStackTarget(it.id);
    return openIdentityEditor('stack', 'edit', {
      workspaceId: identity?.workspace.id,
      spaceId: identity?.space.id,
      groupId: identity?.group.id,
      stackId: it.id,
      focusField,
    }, opener);
  };
  const openStackMenu = (x, y, opener = toggleButton) => showContextMenu(x, y, [
    { text: tr('stackAction.edit'), icon: cmIcons.edit, action: () => openStackIdentity(opener) },
    { text: tr('stackAction.archive'), icon: cmIcons.archive, action: () => archiveItem(it.id) },
  ], { focusFirst: true });
  hd.addEventListener('click', e => {
    if (e.target.closest('button') || e.target.closest('.lv-stack-sym') || e.target.closest('.item-check')) return;
    if (itemSelMode || e.shiftKey) {
      e.stopPropagation();
      e.preventDefault();
      if (e.shiftKey) selectRangeTo(it.id);
      else toggleItemSelect(it.id);
      return;
    }
    toggleStack();
  });
  toggleButton.addEventListener('click', event => {
    event.stopPropagation();
    if (itemSelMode || event.shiftKey) {
      if (event.shiftKey) selectRangeTo(it.id);
      else toggleItemSelect(it.id);
      return;
    }
    toggleStack();
  });
  toggleButton.addEventListener('keydown', event => {
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      event.stopPropagation();
      const rect = toggleButton.getBoundingClientRect();
      openStackMenu(rect.left, rect.bottom + 6, toggleButton);
    }
  });
  hd.querySelector('.lv-stack-sym').addEventListener('click', (e) => {
    e.stopPropagation();
    openStackIdentity(e.currentTarget, 'symbol');
  });
  hd.addEventListener('contextmenu', e => {
    e.preventDefault();
    focusDialogOpener(toggleButton);
    openStackMenu(e.pageX, e.pageY, toggleButton);
  });
  wrap.appendChild(hd);

  // Selection checkbox for stack
  const stackChk = document.createElement('span');
  stackChk.className = 'item-check';
  if (selectedItemIds.has(it.id)) { stackChk.classList.add('checked'); wrap.classList.add('item-selected'); }
  stackChk.addEventListener('click', (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    if (ev.shiftKey) selectRangeTo(it.id);
    else toggleItemSelect(it.id);
  });
  hd.insertBefore(stackChk, hd.firstChild.nextSibling);

  const inner = document.createElement('div');
  inner.className = 'lv-stack-children';
  (it.items || []).forEach(sub => inner.appendChild(buildLvItem(sub, it.items, group, depth + 1)));
  wrap.appendChild(inner);
  makeGroupDropZone(inner, wrap, group, it.items);

  // Drag stack itself (move to other group)
  wrap.draggable = true;
  wrap.addEventListener('dragstart', (e) => {
    e.stopPropagation();
    drag = { kind:'item', id: it.id, srcList: parentItems };
    wrap.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  wrap.addEventListener('dragend', () => {
    wrap.classList.remove('dragging');
    document.querySelectorAll('.dragover, .drop-target').forEach(x => { x.classList.remove('dragover'); x.classList.remove('drop-target'); });
    document.querySelectorAll('.drag-ghost').forEach(x => x.remove());
    drag = null;
  });

  // Auto-expand on hover-drag
  let expandTimer = null;
  hd.addEventListener('dragover', (e) => {
    if (!drag) return;
    e.preventDefault();
    e.stopPropagation();
    hd.classList.add('drop-target');
    if (!it.expanded && !expandTimer) {
      expandTimer = setTimeout(() => { it.expanded = true; wrap.classList.add('expanded'); expandTimer = null; }, 500);
    }
  });
  hd.addEventListener('dragleave', (e) => {
    if (!hd.contains(e.relatedTarget)) {
      hd.classList.remove('drop-target');
      if (expandTimer) { clearTimeout(expandTimer); expandTimer = null; }
    }
  });
  hd.addEventListener('drop', async (e) => {
    if (!drag) return;
    e.preventDefault();
    e.stopPropagation();
    hd.classList.remove('drop-target');
    if (expandTimer) { clearTimeout(expandTimer); expandTimer = null; }
    it.expanded = true;
    wrap.classList.add('expanded');
    if (drag.kind === 'tab') await handleTabDropIntoList(drag.data, it.items, it.items.length);
    else if (drag.kind === 'tabs-multi') {
      const actionId = State.snapshot(`Save ${drag.data.length} tabs`);
      const savedTabs = [];
      for (const t of drag.data) {
        if (it.items.find(x => x.type === 'tab' && x.url === t.url)) continue;
        it.items.push(stampNew({ id: uid(), type:'tab', title: t.title||'Untitled', url: t.url, fav: t.fav||'' }));
        savedTabs.push(t);
      }
      if (!savedTabs.length) { State.rollbackSnapshot(actionId); toast('Already saved', { danger: true }); return; }
      const result = await commitCapturedTabs(savedTabs, { actionId });
      if (!result) return;
      selectedTabIds.clear();
      renderBoard(); updateSelectedBadge();
      toastCaptureResult(`Saved ${savedTabs.length} tabs to stack`, result);
    } else if (drag.kind === 'item') {
      const info = findItem(drag.id);
      if (!info) return;
      if (info.item.type === 'stack' && isDescendantOf(it.items, info.item)) { toast('Cannot nest stack in itself', { danger: true }); return; }
      if (info.item.id === it.id) return;
      State.snapshot('Move to stack');
      const [moved] = info.parent.splice(info.index, 1);
      it.items.push(moved);
      State.persist(); renderBoard();
    }
  });

  return wrap;
}

// ════════════════════════════════════════════════════════════════
// EXPLORER LAYOUT (§3.1 — Miller / column browser)
// ════════════════════════════════════════════════════════════════
// A macOS-Finder / column-browser over the hierarchy: categories → groups →
// items → (a stack's children as a further column). Selecting an item opens the
// §4.2 detail pane. Keyboard-first (arrows move/descend/ascend, Enter opens).
// Each column reuses the bento `.gcol` framing so it reads as Locus, not Finder.
const EX_CHEVRON = '<svg class="ex-row-chev" width="8" height="8" viewBox="0 0 8 8"><path d="M2.5 1.5L5.5 4l-3 2.5" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function renderExplorerView() {
  const $b = document.getElementById('board');
  $b.innerHTML = '';
  $b.classList.add('explorer-mode');
  const ws = activeWs(), cat = activeCat();
  if (!ws || !cat) return;
  if (!cat.groups.length) {
    $b.appendChild(buildEmptySpaceState(cat));
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'ex-wrap';

  // Validate the drilled-into group against the active category; a stale id
  // (deleted, or the category changed) resets the selection so a dead pointer
  // never wedges the columns.
  let group = cat.groups.find(g => g.id === explorerSel.groupId) || null;
  if (!group) { explorerSel.groupId = null; explorerSel.stackPath = []; explorerSel.itemId = null; }

  // Column 1 — categories of the active workspace. Selecting one makes it active
  // (like a category-tab click) and resets the deeper selection.
  wrap.appendChild(buildExCol('Categories', ws.categories.map(c => ({
    sym: '🗂', label: c.name, meta: String(c.groups.length), hasChildren: true,
    active: c.id === cat.id,
    onSelect: () => {
      if (c.id === cat.id) return;
      ws.activeCatId = c.id;
      explorerSel = { groupId: null, stackPath: [], itemId: null };
      State.persist();
      renderAll();
    },
  }))));

  // Column 2 — groups in the active category. Select drills in; double-click /
  // Enter opens the full group page (§4.1).
  wrap.appendChild(buildExCol('Groups', cat.groups.map(g => ({
    sym: g.symbol || '📁', label: g.name, meta: String(g.items.length), color: g.color,
    hasChildren: true, active: group && g.id === group.id,
    onSelect: () => {
      explorerSel.groupId = g.id; explorerSel.stackPath = []; explorerSel.itemId = null;
      _exFocusAfter = 'deepest';
      renderBoard();
    },
    onOpen: () => openGroupPage(g.id),
  })), { emptyText: 'No groups' }));

  // Columns 3+ — the selected group's items, plus one column per expanded stack
  // level along explorerSel.stackPath.
  if (group) {
    const levels = [group.items];
    let list = group.items;
    for (const sid of explorerSel.stackPath) {
      const st = list.find(x => x.id === sid && x.type === 'stack');
      if (!st) { explorerSel.stackPath = explorerSel.stackPath.slice(0, levels.length - 1); break; }
      levels.push(st.items); list = st.items;
    }
    levels.forEach((lvl, depth) => {
      const rows = lvl.map(it => explorerItemRow(it, lvl, group, depth));
      wrap.appendChild(buildExCol(depth === 0 ? 'Items' : 'Stack', rows, { emptyText: 'Empty' }));
    });
  }

  $b.appendChild(wrap);
  bindExplorerKeys(wrap);

  // Restore keyboard focus across the re-render a selection triggered.
  if (_exFocusAfter) {
    const cols = wrap.querySelectorAll('.ex-col');
    const target = _exFocusAfter === 'deepest' ? cols[cols.length - 1] : null;
    const row = target && (target.querySelector('.ex-row.active') || target.querySelector('.ex-row'));
    if (row) row.focus();
    _exFocusAfter = null;
  }
  applySearchFilter();
}

// Build a row descriptor for an item in an explorer column at the given stack depth.
function explorerItemRow(it, lvl, group, depth) {
  const isStack = it.type === 'stack';
  const label = it.type === 'note'
    ? (String(it.html || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 60) || 'Empty note')
    : (it.title || it.text || it.name || 'Untitled');
  const sym = isStack ? (it.symbol || '📚')
    : it.type === 'note' ? '📝'
    : it.type === 'todo' ? (it.done ? '☑' : '☐')
    : '🔗';
  const active = isStack ? explorerSel.stackPath.includes(it.id) : explorerSel.itemId === it.id;
  return {
    sym, label, color: it.color, hasChildren: isStack, active,
    meta: isStack ? String((it.items || []).length) : '',
    onSelect: () => {
      const prefix = explorerSel.stackPath.slice(0, depth);
      if (isStack) {
        explorerSel.stackPath = prefix.concat(it.id);
        explorerSel.itemId = null;
        _exFocusAfter = 'deepest';
        renderBoard();
      } else {
        explorerSel.stackPath = prefix;
        explorerSel.itemId = it.id;
        openItemDetail(it.id); // navigates + re-renders; opens the §4.2 pane
      }
    },
    onOpen: () => {
      if (it.type === 'tab' && it.url) window.open(it.url, '_blank');
      else openItemDetail(it.id);
    },
  };
}

function buildExCol(title, rows, opts = {}) {
  const col = document.createElement('div');
  col.className = 'ex-col gcol';
  const hd = document.createElement('div');
  hd.className = 'ex-col-hd';
  hd.textContent = title;
  col.appendChild(hd);
  const body = document.createElement('div');
  body.className = 'ex-col-body';
  body.setAttribute('role', 'listbox');
  body.setAttribute('aria-label', title);
  if (!rows.length) {
    const em = document.createElement('div');
    em.className = 'ex-col-empty';
    em.textContent = opts.emptyText || '';
    body.appendChild(em);
  } else {
    rows.forEach(r => body.appendChild(buildExRow(r)));
  }
  col.appendChild(body);
  return col;
}

function buildExRow(r) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ex-row' + (r.active ? ' active' : '');
  b.setAttribute('role', 'option');
  b.setAttribute('aria-selected', r.active ? 'true' : 'false');
  b.tabIndex = r.active ? 0 : -1;
  if (r.color) b.style.setProperty('--ex-tint', r.color);
  b.innerHTML =
    `<span class="ex-row-sym">${esc(r.sym)}</span>` +
    `<span class="ex-row-label">${esc(r.label)}</span>` +
    (r.meta ? `<span class="ex-row-meta">${esc(r.meta)}</span>` : '') +
    (r.hasChildren ? EX_CHEVRON : '');
  b.onclick = () => r.onSelect && r.onSelect();
  b.ondblclick = () => (r.onOpen || r.onSelect) && (r.onOpen || r.onSelect)();
  b._exOpen = r.onOpen;
  return b;
}

// Keyboard model for the column browser: ↑/↓ move within a column, → descends
// into the next column, ← ascends, Enter opens. Rows are native buttons so
// focus/blur are free; we only translate the arrow keys into column moves.
function bindExplorerKeys(wrap) {
  wrap.addEventListener('keydown', (e) => {
    const cur = document.activeElement;
    if (!cur || !cur.classList || !cur.classList.contains('ex-row')) return;
    const col = cur.closest('.ex-col');
    if (!col) return;
    const rows = [...col.querySelectorAll('.ex-row')];
    const i = rows.indexOf(cur);
    if (e.key === 'ArrowDown') { e.preventDefault(); (rows[i + 1] || rows[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (rows[i - 1] || rows[rows.length - 1]).focus(); }
    else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = col.nextElementSibling;
      if (next && next.classList.contains('ex-col')) {
        (next.querySelector('.ex-row.active') || next.querySelector('.ex-row'))?.focus();
      } else {
        cur.click(); // no next column yet — selecting reveals/descends
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = col.previousElementSibling;
      if (prev && prev.classList.contains('ex-col')) {
        (prev.querySelector('.ex-row.active') || prev.querySelector('.ex-row'))?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      cur._exOpen ? cur._exOpen() : cur.click();
    }
  });
}

// ════════════════════════════════════════════════════════════════
// TIMELINE LAYOUT (§3.2 — chronological, animated)
// ════════════════════════════════════════════════════════════════
// Items laid along a time axis by reminder.at when present, else createdAt, else
// (for pre-schema-4 items) their array order in an "Undated" lane. A "now"
// playhead separates overdue reminders (persimmon) from what's upcoming. Cards
// reuse buildItem(), so search / detail / drag keep working; entrance is
// staggered via IntersectionObserver and gated behind prefers-reduced-motion.
const _tlStartOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const _tlStartOfWeek = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const _tlStartOfMonth = ts => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
function _tlBucketStart(ts, zoom) {
  return zoom === 'month' ? _tlStartOfMonth(ts) : zoom === 'week' ? _tlStartOfWeek(ts) : _tlStartOfDay(ts);
}
function _tlBucketLabel(start, zoom) {
  const d = new Date(start);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  if (zoom === 'month') return d.toLocaleDateString(appLocale(), { month: 'long', year: 'numeric' });
  if (zoom === 'week') return 'Week of ' + d.toLocaleDateString(appLocale(), { month: 'short', day: 'numeric' }) + (sameYear ? '' : ', ' + d.getFullYear());
  return d.toLocaleDateString(appLocale(), { weekday: 'short', month: 'short', day: 'numeric' }) + (sameYear ? '' : ', ' + d.getFullYear());
}

function setTimelineZoom(z) {
  if (!['day', 'week', 'month'].includes(z) || z === timelineZoom) return;
  timelineZoom = z;
  renderBoard();
}

function renderTimelineView() {
  const $b = document.getElementById('board');
  $b.innerHTML = '';
  $b.classList.add('timeline-mode');
  const cat = activeCat(); if (!cat) return;

  // Flatten the category's items (recursing through stacks, whose container
  // cards aren't themselves timeline entries) and compute each one's moment.
  const entries = [];
  let order = 0;
  const walk = (list, group) => {
    list.forEach(it => {
      if (it.type === 'stack') { walk(it.items || [], group); return; }
      const time = (it.reminder && it.reminder.at != null) ? it.reminder.at
        : (it.createdAt != null ? it.createdAt : null);
      entries.push({
        it, group, parent: list, order: order++,
        time, dated: time != null,
        overdue: !!(it.reminder && it.reminder.at != null && it.reminder.at < Date.now()),
      });
    });
  };
  cat.groups.forEach(g => walk(g.items, g));

  if (!entries.length) {
    $b.appendChild(buildEmptySpaceState(cat));
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'tl-wrap';

  // Zoom control (day / week / month granularity).
  const ctrl = document.createElement('div');
  ctrl.className = 'tl-controls';
  ctrl.innerHTML = `<span class="tl-controls-label">Scale</span>` +
    ['day', 'week', 'month'].map(z =>
      `<button type="button" class="tl-zoom${z === timelineZoom ? ' active' : ''}" data-zoom="${z}">${z[0].toUpperCase() + z.slice(1)}</button>`
    ).join('');
  ctrl.querySelectorAll('.tl-zoom').forEach(b => b.onclick = () => setTimelineZoom(b.dataset.zoom));
  wrap.appendChild(ctrl);

  const track = document.createElement('div');
  track.className = 'tl-track';

  const dated = entries.filter(e => e.dated).sort((a, b) => a.time - b.time);
  const undated = entries.filter(e => !e.dated); // keep array order

  // Bucket the dated entries by the active granularity.
  const buckets = [];
  let curBucket = null;
  for (const e of dated) {
    const start = _tlBucketStart(e.time, timelineZoom);
    if (!curBucket || curBucket.start !== start) {
      curBucket = { start, label: _tlBucketLabel(start, timelineZoom), items: [] };
      buckets.push(curBucket);
    }
    curBucket.items.push(e);
  }

  // IntersectionObserver drives the staggered entrance; reduced-motion users get
  // the cards revealed instantly (CSS also disables the transition).
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = (!reduce && 'IntersectionObserver' in window)
    ? new IntersectionObserver((obs) => obs.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { root: null, threshold: 0.05 })
    : null;

  const buildEntry = (e, idx) => {
    const entry = document.createElement('div');
    entry.className = 'tl-entry' + (e.overdue ? ' overdue' : '');
    entry.style.setProperty('--i', Math.min(idx, 12));
    const dot = document.createElement('span');
    dot.className = 'tl-dot';
    if (e.it.color || e.group.color) dot.style.background = e.it.color || e.group.color;
    entry.appendChild(dot);
    const card = document.createElement('div');
    card.className = 'tl-card';
    card.appendChild(buildItem(e.it, e.parent, e.group));
    entry.appendChild(card);
    if (io) io.observe(entry); else entry.classList.add('in');
    return entry;
  };

  const nowBucketStart = _tlBucketStart(Date.now(), timelineZoom);
  const nowDivider = () => {
    const d = document.createElement('div');
    d.className = 'tl-now';
    d.innerHTML = `<span class="tl-now-dot"></span><span class="tl-now-label">Now</span>`;
    return d;
  };

  let nowPlaced = false;
  buckets.forEach(bk => {
    if (!nowPlaced && bk.start >= nowBucketStart) { track.appendChild(nowDivider()); nowPlaced = true; }
    const section = document.createElement('div');
    section.className = 'tl-bucket' + (bk.start === nowBucketStart ? ' current' : '');
    const lab = document.createElement('div');
    lab.className = 'tl-bucket-label';
    lab.textContent = bk.label;
    section.appendChild(lab);
    const items = document.createElement('div');
    items.className = 'tl-bucket-items';
    bk.items.forEach((e, i) => items.appendChild(buildEntry(e, i)));
    section.appendChild(items);
    track.appendChild(section);
  });
  if (!nowPlaced) track.appendChild(nowDivider());

  if (undated.length) {
    const section = document.createElement('div');
    section.className = 'tl-bucket tl-undated';
    const lab = document.createElement('div');
    lab.className = 'tl-bucket-label';
    lab.textContent = 'Undated';
    section.appendChild(lab);
    const items = document.createElement('div');
    items.className = 'tl-bucket-items';
    undated.forEach((e, i) => items.appendChild(buildEntry(e, i)));
    section.appendChild(items);
    track.appendChild(section);
  }

  wrap.appendChild(track);
  $b.appendChild(wrap);
  applySearchFilter();
}

// ════════════════════════════════════════════════════════════════
// GALLERY LAYOUT (§3.3 — content-first masonry)
// ════════════════════════════════════════════════════════════════
// A masonry grid of the active category, split into labeled group sections that
// keep the bento compartment feel (gradient top-accent, group tint). Cards reuse
// buildItem(), so search / detail / drag and the item covers all keep working;
// covers and favicons read as "covers" for a quick visual scan. The masonry is
// pure CSS `columns` (no dependency); empty sections collapse under an active
// search via applySearchFilter's .gl-section pass. Clicking a section header
// opens that group's page (§4.1).
function renderGalleryView() {
  const $b = document.getElementById('board');
  $b.innerHTML = '';
  $b.classList.add('gallery-mode');
  const cat = activeCat(); if (!cat) return;

  if (!cat.groups.length) {
    $b.appendChild(buildEmptySpaceState(cat));
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'gl-wrap';

  cat.groups.forEach(g => {
    const section = document.createElement('section');
    section.className = 'gl-section';
    if (g.color) section.style.setProperty('--gl-tint', g.color);

    const hd = document.createElement('button');
    hd.type = 'button';
    hd.className = 'gl-section-hd';
    hd.title = 'Open group page';
    hd.innerHTML =
      `<span class="gl-sec-sym">${g.symbol ? esc(g.symbol) : ''}</span>` +
      `<span class="gl-sec-name">${esc(g.name)}</span>` +
      `<span class="gl-sec-count">${g.items.length}</span>`;
    hd.addEventListener('click', () => openGroupPage(g.id));
    section.appendChild(hd);

    const grid = document.createElement('div');
    grid.className = 'gl-grid';
    if (!g.items.length) {
      const em = document.createElement('div');
      em.className = 'gl-empty';
      em.textContent = 'Empty group';
      grid.appendChild(em);
    } else {
      // Items are placed directly as column children (not wrapped) so the shared
      // .hidden search class removes them from the masonry flow cleanly.
      g.items.forEach(it => grid.appendChild(buildItem(it, g.items, g)));
    }
    section.appendChild(grid);
    wrap.appendChild(section);
  });

  $b.appendChild(wrap);
  applySearchFilter();
}

// ════════════════════════════════════════════════════════════════
// GRAPH LAYOUT (§3.4 — relationship map, stretch)
// ════════════════════════════════════════════════════════════════
// A static radial relationship view of the active category: the category at the
// hub, its groups on a ring, each group's items fanned around it, plus faint
// cross-links between items that share a domain. Deterministic geometry (no
// physics sim) keeps it jank-free and reproducible; nodes are click/keyboard
// targets — a hub opens its group page (§4.1), a leaf opens the item. The whole
// figure fades in unless prefers-reduced-motion. Marked stretch in the plan;
// this is the readable "rings by group" variant rather than a force sim.
const _grReduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function graphItemLabel(it) {
  if (it.type === 'todo') return it.text || 'Untitled';
  if (it.type === 'note') return (it.html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || 'Note';
  if (it.type === 'stack') return it.name || 'Stack';
  return it.title || dispUrl(it.url) || 'Untitled';
}
function _grClip(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function renderGraphView() {
  const $b = document.getElementById('board');
  $b.innerHTML = '';
  $b.classList.add('graph-mode');
  const cat = activeCat(); if (!cat) return;

  // Flatten each group's items (a stack contributes its leaves, not itself).
  const groups = cat.groups.map(g => {
    const items = [];
    const walk = list => list.forEach(it => it.type === 'stack' ? walk(it.items || []) : items.push(it));
    walk(g.items);
    return { g, items };
  });
  if (!groups.length) {
    $b.appendChild(buildEmptySpaceState(cat));
    return;
  }
  const totalItems = groups.reduce((n, x) => n + x.items.length, 0);

  const W = 960, H = 640, cx = W / 2, cy = H / 2;
  const n = groups.length;
  const Rg = n <= 1 ? 0 : Math.min(232, 118 + n * 8);

  const hubs = [], leaves = [], spokes = [], links = [], cross = [];
  const domainMap = new Map();

  groups.forEach((grp, i) => {
    const ga = -Math.PI / 2 + i * (2 * Math.PI / n);
    const hx = n <= 1 ? cx : cx + Rg * Math.cos(ga);
    const hy = n <= 1 ? cy : cy + Rg * Math.sin(ga);
    const color = grp.g.color || 'var(--accent)';
    hubs.push({ x: hx, y: hy, g: grp.g, color });
    if (n > 1) spokes.push([cx, cy, hx, hy]);

    const c = grp.items.length;
    const ri = Math.max(52, Math.min(120, 42 + c * 6));
    grp.items.forEach((it, j) => {
      // Fan the leaves around the hub, biased outward from the centre so they
      // don't pile onto the spoke.
      const ia = n <= 1
        ? (j * 2 * Math.PI / Math.max(c, 1))
        : ga + (c <= 1 ? 0 : (j - (c - 1) / 2) * Math.min(2 * Math.PI / c, 0.62));
      const ix = hx + ri * Math.cos(ia);
      const iy = hy + ri * Math.sin(ia);
      const node = { x: ix, y: iy, it, color: reminderDotColor(it.color || grp.g.color) };
      leaves.push(node);
      links.push([hx, hy, ix, iy, color]);
      let host = '';
      if (it.type === 'tab' && it.url) { try { host = new URL(it.url).hostname.replace(/^www\./, ''); } catch {} }
      if (host) { if (!domainMap.has(host)) domainMap.set(host, []); domainMap.get(host).push(node); }
    });
  });

  // Shared-domain relationship edges (§3.4). Chain consecutive same-domain leaves
  // rather than every pair, so a big domain doesn't turn into a hairball.
  domainMap.forEach(list => { for (let k = 1; k < list.length; k++) cross.push([list[k-1].x, list[k-1].y, list[k].x, list[k].y]); });

  const showLabels = totalItems <= 44;
  const f = v => v.toFixed(1);
  let s = `<svg class="gr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`;
  s += `<g class="gr-edges">`;
  cross.forEach(([x1,y1,x2,y2]) => { s += `<line class="gr-cross" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`; });
  spokes.forEach(([x1,y1,x2,y2]) => { s += `<line class="gr-spoke" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`; });
  links.forEach(([x1,y1,x2,y2,col]) => { s += `<line class="gr-link" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" style="stroke:${col}"/>`; });
  s += `</g>`;
  s += `<g class="gr-node gr-center"><circle r="7" cx="${f(cx)}" cy="${f(cy)}"/><text x="${f(cx)}" y="${f(cy - 15)}">${esc(cat.name)}</text></g>`;
  hubs.forEach((h, i) => {
    const ly = h.y < cy ? h.y - 16 : h.y + 23;
    s += `<g class="gr-node gr-hub" data-group-id="${esc(h.g.id)}" style="--i:${Math.min(i,14)}" tabindex="0" role="button" aria-label="${esc(h.g.name)}">`
      + `<circle r="10" cx="${f(h.x)}" cy="${f(h.y)}" style="fill:${h.color}"/>`
      + `<text x="${f(h.x)}" y="${f(ly)}">${esc(_grClip(h.g.name, 22))}</text>`
      + `<title>${esc(h.g.name)} — open group page</title></g>`;
  });
  leaves.forEach((node, i) => {
    const label = graphItemLabel(node.it);
    s += `<g class="gr-node gr-item" data-item-id="${esc(node.it.id)}" style="--i:${Math.min(i,20)}" tabindex="0" role="button" aria-label="${esc(label)}">`
      + `<circle r="5" cx="${f(node.x)}" cy="${f(node.y)}" style="fill:${node.color}"/>`
      + (showLabels ? `<text x="${f(node.x + 8)}" y="${f(node.y + 3.5)}">${esc(_grClip(label, 20))}</text>` : '')
      + `<title>${esc(label)}</title></g>`;
  });
  s += `</svg>`;

  const wrap = document.createElement('div');
  wrap.className = 'gr-wrap';
  wrap.innerHTML = s;
  $b.appendChild(wrap);

  wrap.querySelectorAll('.gr-hub').forEach(el => {
    const id = el.dataset.groupId;
    const go = () => openGroupPage(id);
    el.addEventListener('click', go);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  wrap.querySelectorAll('.gr-item').forEach(el => {
    const id = el.dataset.itemId;
    const act = () => {
      const info = findItem(id); if (!info) return;
      // A tab opens its page; every other kind opens its detail pane — the same
      // "click a node to act on it" model the other layouts use.
      if (info.item.type === 'tab' && info.item.url) openTabMaybeHibernated(info.item.url, { focus: true });
      else openItemDetail(id);
    };
    el.addEventListener('click', act);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
  });

  const svg = wrap.querySelector('.gr-svg');
  if (svg) { if (_grReduceMotion()) svg.classList.add('in'); else requestAnimationFrame(() => svg.classList.add('in')); }
}

// ════════════════════════════════════════════════════════════════
// CALENDAR (§5 — unified reminders surface)
// ════════════════════════════════════════════════════════════════
// A workspace-scoped calendar that projects the reminder aggregator (§2.3) onto
// a time axis. It is a routed surface (`…/calendar?cal=<view>`), not an overlay,
// so it deep-links and browser back/forward work. Three views share one data
// source and one filter language (the board search operators, §5.2): a Month
// grid, a Week column view, and an Agenda "reminders inbox". Item reminders can
// be dragged to another day (§5.3) — every write routes through the shared
// setReminder/clearReminder path so alarm scheduling stays correct.

// Drag-to-reschedule payload (the entry being dragged); null when idle.
let calDrag = null;
// Filter-input focus/caret to restore across the re-render each keystroke fires,
// so typing in the calendar filter never loses the cursor.
let _calFilterRestore = null;
let _calFilterTimer = null;

// Named item colors resolve to their theme token; group/category hex colors are
// used as-is. Absent → the accent.
const CAL_COLOR_VARS = { red: 'var(--red)', orange: 'var(--orange)', yellow: 'var(--yellow)', green: 'var(--green)', blue: 'var(--blue)' };
function reminderDotColor(color) {
  if (!color) return 'var(--accent)';
  return CAL_COLOR_VARS[color] || color;
}
function _calReduceMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// ── Navigation ──────────────────────────────────────────────────
function openCalendar() {
  const ws = activeWs(); if (!ws) return;
  let reminderCount = 0;
  try { reminderCount = collectPendingReminders({ scope: ws.id }).length; } catch {}
  const view = activeCalendar ? activeCalendar.view : (reminderCount < 5 ? 'agenda' : 'month');
  Router.navigate({ type: 'calendar', wsId: ws.id, query: view !== 'month' ? { cal: view } : {} });
}
function closeCalendar() {
  const ws = activeWs();
  const cat = activeCat();
  Router.navigate({ type: 'board', wsId: ws ? ws.id : null, catId: cat ? cat.id : null, query: {} });
}
function setCalendarView(view) {
  if (!CAL_VIEWS.includes(view) || !activeCalendar || activeCalendar.view === view) return;
  const ws = activeWs(); if (!ws) return;
  Router.navigate({ type: 'calendar', wsId: ws.id, query: view !== 'month' ? { cal: view } : {} });
}
// Prev/next page the anchor by the active granularity. Not a route change (the
// anchor is ephemeral), so it just re-renders.
function shiftCalendar(dir) {
  if (!activeCalendar) return;
  const a = new Date(activeCalendar.anchor);
  if (activeCalendar.view === 'month') a.setMonth(a.getMonth() + dir, 1);
  else a.setDate(a.getDate() + dir * 7);
  activeCalendar.anchor = a.getTime();
  renderBoard();
}
function calendarToday() {
  if (!activeCalendar) return;
  activeCalendar.anchor = Date.now();
  renderBoard();
}
// Reflect calendar-open state on the top-bar button (called from renderBoard,
// which runs before the calendar's own early-return, so it toggles both ways).
function updateCalendarButton() {
  const b = document.getElementById('calendar-btn');
  if (b) { b.classList.toggle('active', !!activeCalendar); b.setAttribute('aria-pressed', activeCalendar ? 'true' : 'false'); }
}

// ── Data + filtering ────────────────────────────────────────────
// Every reminder in the active workspace, enriched with the group/category name
// so the in:/category: filter operators can match by name.
function buildCalendarEntries() {
  const ws = activeWs();
  if (!ws) return [];
  const catName = Object.create(null), groupName = Object.create(null);
  ws.categories.forEach(c => {
    catName[c.id] = c.name;
    c.groups.forEach(g => { groupName[g.id] = g.name; });
  });
  return collectPendingReminders({ scope: ws.id }).map(e => Object.assign({}, e, {
    catName: catName[e.catId] || '',
    groupName: e.groupId ? (groupName[e.groupId] || '') : '',
  }));
}

// Parse the calendar filter string into a predicate over reminder entries,
// reusing the board's operator grammar (§5.2): type:, color:, source:, in:,
// category:, bare/"quoted" text, all with `-` negation. Returns null for an
// empty query (meaning "keep everything").
function parseCalendarFilter(str) {
  const raw = String(str || '').toLowerCase().trim();
  if (!raw) return null;
  const pos = { type: [], color: [], source: [], in: [], category: [], text: [] };
  const neg = { type: [], color: [], source: [], in: [], category: [], text: [] };
  (raw.match(/-?"[^"]*"|\S+/g) || []).forEach(tok => {
    let bucket = pos;
    if (tok[0] === '-' && tok.length > 1) { bucket = neg; tok = tok.slice(1); }
    if (tok.length > 1 && tok[0] === '"' && tok[tok.length - 1] === '"') {
      const p = tok.slice(1, -1).trim(); if (p) bucket.text.push(p); return;
    }
    let m;
    if ((m = /^type:(.+)$/.exec(tok))) m[1].split(',').forEach(t => { const ct = SEARCH_TYPES[t]; if (ct && !bucket.type.includes(ct)) bucket.type.push(ct); });
    else if ((m = /^colou?r:(.+)$/.exec(tok))) m[1].split(',').forEach(c => { if (SEARCH_COLORS.includes(c)) bucket.color.push(c); });
    else if ((m = /^source:(.+)$/.exec(tok))) m[1].split(',').forEach(s => { if (['item', 'group', 'category'].includes(s)) bucket.source.push(s); });
    else if ((m = /^(?:in|group):(.+)$/.exec(tok))) m[1].split(',').forEach(v => { v = v.trim(); if (v) bucket.in.push(v); });
    else if ((m = /^(?:category|cat):(.+)$/.exec(tok))) m[1].split(',').forEach(v => { v = v.trim(); if (v) bucket.category.push(v); });
    else bucket.text.push(tok);
  });
  const inName = e => (e.groupName || '').toLowerCase();
  const catNm = e => (e.catName || '').toLowerCase();
  const title = e => (e.title || '').toLowerCase();
  const keep = e => (
    (!pos.type.length || pos.type.includes(e.itemType)) &&
    (!pos.color.length || pos.color.includes(e.color)) &&
    (!pos.source.length || pos.source.includes(e.source)) &&
    (!pos.in.length || pos.in.some(f => inName(e).includes(f))) &&
    (!pos.category.length || pos.category.some(f => catNm(e).includes(f))) &&
    (!pos.text.length || pos.text.every(n => title(e).includes(n)))
  );
  const drop = e => (
    (neg.type.length && neg.type.includes(e.itemType)) ||
    (neg.color.length && neg.color.includes(e.color)) ||
    (neg.source.length && neg.source.includes(e.source)) ||
    (neg.in.length && neg.in.some(f => inName(e).includes(f))) ||
    (neg.category.length && neg.category.some(f => catNm(e).includes(f))) ||
    (neg.text.length && neg.text.some(n => title(e).includes(n)))
  );
  return e => keep(e) && !drop(e);
}

// Bucket entries by local day-start (ms), each day's list sorted by time.
function calGroupByDay(entries) {
  const m = new Map();
  entries.forEach(e => { const k = _tlStartOfDay(e.at); if (!m.has(k)) m.set(k, []); m.get(k).push(e); });
  m.forEach(list => list.sort((a, b) => a.at - b.at));
  return m;
}

// ── Interactions ────────────────────────────────────────────────
// Click a dot → jump to a contextful destination (the item's group page with its
// detail pane open, the group page, or the category board). Browser Back returns
// to the calendar.
function openReminderTarget(entry) {
  if (entry.source === 'item') {
    if (!validDetailItemIdForSurface(entry.refId, { wsId: entry.wsId, groupId: entry.groupId })) {
      toast('Item no longer exists', { danger: true });
      renderBoard();
      return;
    }
    prepareItemDetailOpen(entry.refId);
    Router.navigate({ type: 'group', wsId: entry.wsId, groupId: entry.groupId, itemId: entry.refId, query: {} });
  } else if (entry.source === 'group') {
    Router.navigate({ type: 'group', wsId: entry.wsId, groupId: entry.groupId, itemId: null, query: {} });
  } else {
    Router.navigate({ type: 'board', wsId: entry.wsId, catId: entry.catId, query: {} });
  }
}
// Right-click a dot → open/reschedule/clear. Item reminders route through the
// shared setReminder/clearReminder path; group/category reminders through the
// entity path (§6).
function calendarDotMenu(entry, x, y) {
  const items = [{ text: 'Open', action: () => openReminderTarget(entry) }];
  if (entry.source === 'item') {
    items.push({ text: 'Reschedule…', action: () => openReminderPicker(entry.refId) });
    items.push({ sep: true });
    items.push({ text: 'Clear reminder', danger: true, action: () => clearReminder(entry.refId) });
  } else {
    items.push({ text: 'Edit…', action: () => openEntityReminderPicker(entry.source, entry.refId, entry.index) });
    items.push({ sep: true });
    items.push({ text: 'Remove reminder', danger: true, action: () => removeEntityReminder(entry.source, entry.refId, entry.index) });
  }
  showContextMenu(x, y, items);
}
// Move a reminder to a different day, preserving its time-of-day.
function calRescheduleTo(entry, dayStart) {
  if (!entry) return;
  const orig = new Date(entry.at);
  const d = new Date(dayStart);
  d.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
  const ts = d.getTime();
  if (ts === entry.at) return;
  if (entry.source === 'item') setReminder(entry.refId, ts, { recur: entry.recur });
  else setEntityReminderTime(entry.source, entry.refId, entry.index, ts);
}
// Wire a container (day cell / week column) as a drop target for reschedule.
function calMakeDropTarget(el, dayStart) {
  el.addEventListener('dragover', e => {
    if (!calDrag) return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch {}
    el.classList.add('cal-drop');
  });
  el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('cal-drop'); });
  el.addEventListener('drop', e => {
    if (!calDrag) return;
    e.preventDefault();
    el.classList.remove('cal-drop');
    const entry = calDrag; calDrag = null;
    calRescheduleTo(entry, dayStart);
  });
}

// A single reminder chip. `showTime` prefixes the time (week/agenda); month cells
// keep it in the tooltip to stay compact.
function buildCalDot(entry, showTime) {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = 'cal-dot' + (entry.at < Date.now() ? ' past' : '') + (entry.notified ? ' notified' : '');
  dot.style.setProperty('--dot', reminderDotColor(entry.color));
  const hm = new Date(entry.at).toLocaleTimeString(appLocale(), { hour: 'numeric', minute: '2-digit' });
  dot.innerHTML = (showTime ? `<span class="cal-dot-time">${esc(hm)}</span>` : '') +
    `<span class="cal-dot-title">${esc(entry.title)}</span>`;
  dot.title = `${entry.title} — ${new Date(entry.at).toLocaleString(appLocale(), { dateStyle: 'medium', timeStyle: 'short' })}` +
    (entry.source !== 'item' ? ` (${entry.source})` : '');
  dot.onclick = e => { e.stopPropagation(); openReminderTarget(entry); };
  dot.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); calendarDotMenu(entry, e.clientX, e.clientY); };
  // Every reminder — item, group, or category — can be dragged to reschedule.
  dot.draggable = true;
  dot.addEventListener('dragstart', ev => {
    calDrag = entry; dot.classList.add('cal-dragging');
    try { ev.dataTransfer.setData('text/plain', entry.refId); ev.dataTransfer.effectAllowed = 'move'; } catch {}
  });
  dot.addEventListener('dragend', () => { calDrag = null; dot.classList.remove('cal-dragging'); });
  return dot;
}

// The persistent "Past due" rail (§5.1). Returns null when nothing is overdue.
function buildPastDueRail(entries) {
  const now = Date.now();
  const overdue = entries.filter(e => e.at < now).sort((a, b) => b.at - a.at);
  if (!overdue.length) return null;
  const rail = document.createElement('div');
  rail.className = 'cal-pastdue';
  const hd = document.createElement('div');
  hd.className = 'cal-pastdue-hd';
  hd.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.6" stroke="currentColor" stroke-width="1.2"/><path d="M6 3.4v3l1.8 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg><span>Past due</span><span class="cal-pastdue-n">${overdue.length}</span>`;
  const strip = document.createElement('div');
  strip.className = 'cal-pastdue-strip';
  overdue.slice(0, 40).forEach(e => strip.appendChild(buildCalDot(e, true)));
  rail.appendChild(hd); rail.appendChild(strip);
  return rail;
}

// A day's panel — opened by clicking any calendar cell (or a cell's "+N more").
// Lets the user ADD a task on that date and VIEW/open the day's reminders;
// existing reminders can be edited/rescheduled by right-clicking their dot or
// by opening the item. Keyboard-openable from the focusable cell.
const CAL_ADD_ICON = '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2v9M2 6.5h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
function openCalDay(dayStart, list, x, y) {
  const dLabel = new Date(dayStart).toLocaleDateString(appLocale(), { weekday: 'long', month: 'long', day: 'numeric' });
  const items = [{ label: dLabel }];
  items.push({ text: tr('cal.addTask'), icon: CAL_ADD_ICON, action: () => addCalendarTaskForDay(dayStart) });
  if (list && list.length) {
    items.push({ sep: true });
    list.forEach(e => items.push({
      text: e.title,
      sub: new Date(e.at).toLocaleTimeString(appLocale(), { hour: 'numeric', minute: '2-digit' }),
      action: () => openReminderTarget(e),
    }));
  }
  showContextMenu(x, y, items, { focusFirst: true });
}

// Add a task on a given calendar day: creates a to-do in the workspace Inbox
// with a reminder at 9:00 AM that day (a real, persisted item — not a fake
// calendar-only event, staying within Locus's reminder-on-item model).
function addCalendarTaskForDay(dayStart) {
  const ws = activeWs();
  if (!ws) return;
  const dateLabel = new Date(dayStart).toLocaleDateString(appLocale(), { month: 'long', day: 'numeric' });
  const text = (prompt(tr('cal.addPrompt', { date: dateLabel }), '') || '').trim();
  if (!text) return;
  const cat = activeCat() || ws.categories[0];
  if (!cat) { toast(tr('cal.needSpace'), { danger: true }); return; }
  let inbox = cat.groups.find(g => g.name === 'Inbox');
  if (!inbox) { inbox = { id: uid(), name: 'Inbox', symbol: '📥', color: '#6366f1', collapsed: false, items: [] }; cat.groups.unshift(inbox); }
  const when = new Date(dayStart); when.setHours(9, 0, 0, 0);
  const ts = when.getTime();
  State.snapshot('Add calendar task');
  const todo = stampNew({ id: uid(), type: 'todo', text, done: false, reminder: { at: ts, notified: false } });
  inbox.items.push(todo);
  try { chrome.alarms.create('te-reminder-' + todo.id, { when: ts }); } catch {}
  State.persist();
  renderBoard();
  toast(tr('cal.added', { date: dateLabel }));
}

// ── View builders ───────────────────────────────────────────────
function calPeriodLabel() {
  if (!activeCalendar) return '';
  if (activeCalendar.view === 'agenda') return 'Upcoming';
  const nowYear = new Date().getFullYear();
  if (activeCalendar.view === 'week') {
    const start = _tlStartOfWeek(activeCalendar.anchor);
    const a = new Date(start), b = new Date(start); b.setDate(b.getDate() + 6);
    const sameMonth = a.getMonth() === b.getMonth();
    const left = a.toLocaleDateString(appLocale(), { month: 'short', day: 'numeric' });
    const right = b.toLocaleDateString(appLocale(), sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
    return `${left} – ${right}` + (a.getFullYear() !== nowYear ? `, ${a.getFullYear()}` : '');
  }
  return new Date(activeCalendar.anchor).toLocaleDateString(appLocale(), { month: 'long', year: 'numeric' });
}

function buildCalToolbar(shownCount, totalCount) {
  const bar = document.createElement('div');
  bar.className = 'cal-toolbar';
  const isAgenda = activeCalendar.view === 'agenda';

  // Left cluster: period label + prev/today/next (paging is hidden in agenda).
  const nav = document.createElement('div');
  nav.className = 'cal-nav';
  const title = document.createElement('div');
  title.className = 'cal-title';
  title.textContent = calPeriodLabel();
  nav.appendChild(title);
  if (!isAgenda) {
    const mkNav = (label, aria, fn) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cal-nav-btn'; b.setAttribute('aria-label', aria);
      b.textContent = label; b.onclick = fn; return b;
    };
    const grp = document.createElement('div');
    grp.className = 'cal-nav-grp';
    grp.appendChild(mkNav('‹', 'Previous', () => shiftCalendar(-1)));
    const today = document.createElement('button');
    today.type = 'button'; today.className = 'cal-today-btn'; today.textContent = 'Today';
    today.onclick = calendarToday;
    grp.appendChild(today);
    grp.appendChild(mkNav('›', 'Next', () => shiftCalendar(1)));
    nav.appendChild(grp);
  }
  bar.appendChild(nav);

  // Middle: view segmented control.
  const seg = document.createElement('div');
  seg.className = 'cal-seg';
  [['month', 'Month'], ['week', 'Week'], ['agenda', 'Agenda']].forEach(([v, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cal-seg-btn' + (activeCalendar.view === v ? ' active' : '');
    b.textContent = label;
    b.onclick = () => setCalendarView(v);
    seg.appendChild(b);
  });
  bar.appendChild(seg);

  // Right: filter input (the differentiator, §5.2).
  const filter = document.createElement('div');
  filter.className = 'cal-filter';
  filter.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const input = document.createElement('input');
  input.id = 'cal-filter-input';
  input.type = 'text';
  input.autocomplete = 'off';
  input.placeholder = 'Filter — type:tab, in:work, color:red, -source:group';
  input.value = calendarFilter;
  input.addEventListener('input', () => {
    calendarFilter = input.value;
    _calFilterRestore = { caret: input.selectionStart };
    clearTimeout(_calFilterTimer);
    _calFilterTimer = setTimeout(() => renderBoard(), 130);
  });
  input.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); if (input.value) { input.value = ''; calendarFilter = ''; renderBoard(); } else input.blur(); } });
  filter.appendChild(input);
  if (calendarFilter) {
    const count = document.createElement('span');
    count.className = 'cal-filter-count';
    count.textContent = `${shownCount}/${totalCount}`;
    filter.appendChild(count);
  }
  bar.appendChild(filter);

  return bar;
}

function _calEmptyNote(text) {
  const n = document.createElement('div');
  n.className = 'cal-empty-note';
  n.textContent = text;
  return n;
}

function buildCalMonth(entries) {
  const body = document.createElement('div');
  body.className = 'cal-body';
  const rail = buildPastDueRail(entries);
  if (rail) body.appendChild(rail);

  const grid = document.createElement('div');
  grid.className = 'cal-grid';

  // Weekday header (Mon-first, matching the timeline's week start).
  const hdCur = new Date(_tlStartOfWeek(Date.now()));
  for (let i = 0; i < 7; i++) {
    const h = document.createElement('div');
    h.className = 'cal-weekhd';
    h.textContent = hdCur.toLocaleDateString(appLocale(), { weekday: 'short' });
    grid.appendChild(h);
    hdCur.setDate(hdCur.getDate() + 1);
  }

  const byDay = calGroupByDay(entries);
  const todayStart = _tlStartOfDay(Date.now());
  const monthStart = _tlStartOfMonth(activeCalendar.anchor);
  const curMonth = new Date(monthStart).getMonth();
  const reduce = _calReduceMotion();
  // Iterate with Date arithmetic (DST-safe) from the Monday of the month's first week.
  const cur = new Date(_tlStartOfWeek(monthStart));
  const MAX_DOTS = 4;
  for (let i = 0; i < 42; i++) {
    const dayStart = _tlStartOfDay(cur.getTime());
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (dayStart === todayStart) cell.classList.add('today');
    if (cur.getMonth() !== curMonth) cell.classList.add('dim');
    if (!reduce) { cell.style.setProperty('--i', Math.min(i, 27)); cell.classList.add('cal-anim'); }

    const dnum = document.createElement('div');
    dnum.className = 'cal-date';
    dnum.textContent = cur.getDate();
    cell.appendChild(dnum);

    const list = byDay.get(dayStart) || [];
    const dots = document.createElement('div');
    dots.className = 'cal-cell-dots';
    list.slice(0, MAX_DOTS).forEach(e => dots.appendChild(buildCalDot(e, false)));
    if (list.length > MAX_DOTS) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'cal-more';
      more.textContent = `+${list.length - MAX_DOTS} more`;
      more.onclick = ev => { ev.stopPropagation(); openCalDay(dayStart, list, ev.clientX, ev.clientY); };
      dots.appendChild(more);
    }
    cell.appendChild(dots);
    // Whole cell is an interactive day target: click / Enter / Space opens the
    // day panel to view reminders and add a task on that date. Dots and the
    // "+N more" button stopPropagation, so they act first.
    cell.tabIndex = 0;
    cell.setAttribute('role', 'button');
    const dowLabel = new Date(dayStart).toLocaleDateString(appLocale(), { weekday: 'long', month: 'long', day: 'numeric' });
    cell.setAttribute('aria-label', list.length
      ? `${dowLabel}, ${list.length} ${list.length === 1 ? 'reminder' : 'reminders'}`
      : `${dowLabel}, no reminders`);
    const openThisDay = ev => {
      const r = cell.getBoundingClientRect();
      openCalDay(dayStart, list, ev && ev.clientX ? ev.clientX : r.left + 24, ev && ev.clientY ? ev.clientY : r.bottom - 8);
    };
    cell.addEventListener('click', openThisDay);
    cell.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openThisDay(ev); } });
    calMakeDropTarget(cell, dayStart);
    grid.appendChild(cell);
    cur.setDate(cur.getDate() + 1);
  }
  body.appendChild(grid);
  return body;
}

function buildCalWeek(entries) {
  const body = document.createElement('div');
  body.className = 'cal-body';
  const rail = buildPastDueRail(entries);
  if (rail) body.appendChild(rail);

  const grid = document.createElement('div');
  grid.className = 'cal-week';
  const byDay = calGroupByDay(entries);
  const todayStart = _tlStartOfDay(Date.now());
  const cur = new Date(_tlStartOfWeek(activeCalendar.anchor));
  const reduce = _calReduceMotion();
  for (let i = 0; i < 7; i++) {
    const dayStart = _tlStartOfDay(cur.getTime());
    const col = document.createElement('div');
    col.className = 'cal-week-col' + (dayStart === todayStart ? ' today' : '');
    if (!reduce) { col.style.setProperty('--i', i); col.classList.add('cal-anim'); }
    const hd = document.createElement('div');
    hd.className = 'cal-week-colhd';
    hd.innerHTML = `<span class="cal-week-dow">${esc(cur.toLocaleDateString(appLocale(), { weekday: 'short' }))}</span><span class="cal-week-dnum">${cur.getDate()}</span>`;
    col.appendChild(hd);
    const colBody = document.createElement('div');
    colBody.className = 'cal-week-colbody';
    const list = byDay.get(dayStart) || [];
    if (!list.length) { const em = document.createElement('div'); em.className = 'cal-week-empty'; colBody.appendChild(em); }
    list.forEach(e => colBody.appendChild(buildCalDot(e, true)));
    col.appendChild(colBody);
    calMakeDropTarget(col, dayStart);
    grid.appendChild(col);
    cur.setDate(cur.getDate() + 1);
  }
  body.appendChild(grid);
  return body;
}

function _calAgendaDayLabel(dayStart) {
  const todayStart = _tlStartOfDay(Date.now());
  const tmr = new Date(todayStart); tmr.setDate(tmr.getDate() + 1);
  if (dayStart === todayStart) return 'Today';
  if (dayStart === _tlStartOfDay(tmr.getTime())) return 'Tomorrow';
  return new Date(dayStart).toLocaleDateString(appLocale(), { weekday: 'long', month: 'short', day: 'numeric' });
}
function _calAgendaSection(label, list, past) {
  const sec = document.createElement('div');
  sec.className = 'cal-ag-sec' + (past ? ' past' : '');
  const hd = document.createElement('div');
  hd.className = 'cal-ag-hd';
  hd.textContent = label;
  sec.appendChild(hd);
  list.forEach(e => {
    const row = document.createElement('div');
    row.className = 'cal-ag-row';
    row.appendChild(buildCalDot(e, true));
    const rel = document.createElement('span');
    rel.className = 'cal-ag-rel';
    rel.textContent = fmtTimeRelative(e.at);
    row.appendChild(rel);
    sec.appendChild(row);
  });
  return sec;
}
function buildCalAgenda(entries) {
  const body = document.createElement('div');
  body.className = 'cal-body cal-agenda';
  if (!entries.length) { body.appendChild(_calEmptyNote('No reminders here.')); return body; }
  const now = Date.now();
  const overdue = entries.filter(e => e.at < now).sort((a, b) => a.at - b.at);
  const upcoming = entries.filter(e => e.at >= now).sort((a, b) => a.at - b.at);
  if (overdue.length) body.appendChild(_calAgendaSection('Past due', overdue, true));
  const byDay = calGroupByDay(upcoming);
  const days = [...byDay.keys()].sort((a, b) => a - b);
  if (!upcoming.length && overdue.length) body.appendChild(_calEmptyNote('Nothing upcoming.'));
  days.forEach(d => body.appendChild(_calAgendaSection(_calAgendaDayLabel(d), byDay.get(d), false)));
  return body;
}

// Workspace › Calendar breadcrumb (mirrors renderBreadcrumb's chrome).
function renderCalendarBreadcrumb(ws) {
  const bar = document.getElementById('breadcrumb-bar');
  if (!bar) return;
  bar.classList.remove('hidden');
  bar.innerHTML = '';
  const back = document.createElement('button');
  back.className = 'bc-back';
  back.type = 'button';
  back.title = 'Back to board';
  back.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Back`;
  back.onclick = closeCalendar;
  bar.appendChild(back);
  const crumb = (label, sym, onClick) => {
    const b = document.createElement('button');
    b.className = 'bc-crumb' + (onClick ? '' : ' current');
    b.type = 'button';
    b.innerHTML = (sym ? `<span class="bc-sym">${esc(sym)}</span>` : '') + `<span>${esc(label)}</span>`;
    if (onClick) b.onclick = onClick; else b.setAttribute('aria-current', 'page');
    return b;
  };
  const sep = () => { const s = document.createElement('span'); s.className = 'bc-sep'; s.textContent = '›'; return s; };
  bar.appendChild(crumb(ws.name, ws.symbol, closeCalendar));
  bar.appendChild(sep());
  bar.appendChild(crumb('Calendar', '📅', null));
}

// Render the calendar surface into #board. Returns false (letting the board
// render) if there's no active workspace, mirroring renderGroupPage's contract.
function renderCalendar() {
  const ws = activeWs();
  if (!ws || !activeCalendar) { activeCalendar = null; return false; }
  renderCalendarBreadcrumb(ws);

  const $b = document.getElementById('board');
  $b.classList.remove('list-mode', 'canvas-mode', 'explorer-mode', 'timeline-mode', 'group-page-mode');
  $b.classList.add('calendar-mode');
  $b.innerHTML = '';

  const all = buildCalendarEntries();
  const pred = parseCalendarFilter(calendarFilter);
  const shown = pred ? all.filter(pred) : all;

  const wrap = document.createElement('div');
  wrap.className = 'cal-wrap';
  wrap.appendChild(buildCalToolbar(shown.length, all.length));
  if (!all.length) wrap.appendChild(_calEmptyNote('No reminders in this workspace yet — set one on any item to see it here.'));
  else if (!shown.length) wrap.appendChild(_calEmptyNote('No reminders match this filter.'));

  const view = activeCalendar.view;
  wrap.appendChild(view === 'agenda' ? buildCalAgenda(shown) : view === 'week' ? buildCalWeek(shown) : buildCalMonth(shown));
  $b.appendChild(wrap);

  // Restore the filter input's focus/caret across the keystroke-triggered render.
  if (_calFilterRestore) {
    const fi = document.getElementById('cal-filter-input');
    if (fi) { fi.focus(); const p = _calFilterRestore.caret; if (p != null) { try { fi.setSelectionRange(p, p); } catch {} } }
    _calFilterRestore = null;
  }
  return true;
}

// ════════════════════════════════════════════════════════════════
// VIEW MODES (board / list) + selection / reorder mode toggles
// ════════════════════════════════════════════════════════════════
// The active layout is stored per category (`category.layout`, §7) so each space
// can default to the mode it's meant to be used in; it falls back to the legacy
// global `settings.viewMode` for categories that have never picked one (which
// keeps existing single-view users on their chosen mode with no migration).
function getViewMode() {
  const cat = activeCat();
  const m = (cat && cat.layout) || State.get().settings.viewMode;
  return LAYOUTS[m] ? m : 'board';
}
function setViewMode(mode) {
  if (!LAYOUTS[mode]) mode = 'board';
  const cat = activeCat();
  if (cat) cat.layout = mode;
  // Keep the legacy global as the "last used" default for categories that
  // haven't picked a layout yet.
  State.get().settings.viewMode = mode;
  document.body.dataset.viewMode = mode;
  updateViewModeButton(mode);
  State.persist();
  renderBoard();
  Router.sync();
}
// Reflect the active layout onto the top-bar button (single dynamic icon).
function updateViewModeButton(mode) {
  const def = LAYOUTS[mode] || LAYOUTS.board;
  const icon = document.getElementById('view-mode-icon');
  if (icon) icon.innerHTML = def.icon;
  const btn = document.getElementById('view-mode-btn');
  if (btn) { btn.title = `View: ${def.label} — click to switch`; btn.dataset.mode = mode; }
}
function cycleViewMode() {
  const order = ['board', 'list'].filter(m => LAYOUTS[m]);
  const i = order.indexOf(getViewMode());
  setViewMode(order[(i + 1) % order.length] || 'board');
}
// The layout switcher (§7) — a dropdown listing every registered layout with its
// icon, anchored under the top-bar button, replacing the old 3-way cycle. Reuses
// the shared context-menu chrome so it stays consistent across the 13 themes.
function openLayoutMenu(btn) {
  const cur = getViewMode();
  const items = [{ label: 'View' }];
  ['board', 'list'].filter(m => LAYOUTS[m]).forEach(m => {
    const def = LAYOUTS[m];
    items.push({
      text: def.label,
      icon: def.icon,
      sub: m === cur ? '✓' : '',
      action: () => setViewMode(m),
    });
  });
  const advanced = LAYOUT_ORDER.filter(m => !['board', 'list'].includes(m) && LAYOUTS[m]);
  if (advanced.length) {
    items.push({ sep: true });
    items.push({
      text: 'Advanced views…',
      icon: LAYOUT_ICONS.canvas,
      sub: advanced.includes(cur) ? LAYOUTS[cur].label : '',
      action: () => openAdvancedLayoutMenu(btn),
    });
  }
  const r = btn.getBoundingClientRect();
  showContextMenu(r.left, r.bottom + 6, items, { focusFirst: true });
}

function openAdvancedLayoutMenu(btn) {
  const cur = getViewMode();
  const items = [{ label: 'Advanced views' }];
  LAYOUT_ORDER.filter(m => !['board', 'list'].includes(m) && LAYOUTS[m]).forEach(m => {
    const def = LAYOUTS[m];
    items.push({
      text: def.label,
      icon: def.icon,
      sub: m === cur ? '✓' : '',
      action: () => setViewMode(m),
    });
  });
  items.push({ sep: true }, { text: 'Back to core views', icon: LAYOUT_ICONS.board, action: () => openLayoutMenu(btn) });
  const r = btn.getBoundingClientRect();
  showContextMenu(r.left, r.bottom + 6, items, { focusFirst: true });
}

// ── Command palette (§7) ──────────────────────────────────────────
// A Cmd/Ctrl-K surface that unifies navigation and quick actions: jump to a
// workspace / category / group, switch layout, open the calendar, save tabs,
// change theme, or drop into board search. It filters its list the same
// subsequence way search matches, is fully keyboard-driven (↑/↓/Enter/Esc), and
// reuses the app's overlay scrim, panel tokens and motion so it reads native
// across the 13 themes. Board text-search still opens directly on `/`.
let _palState = null;

// Open the dedicated local search route, optionally pre-filled from the palette.
function openSearchBar(prefill) {
  openSearchSurface(prefill == null ? '' : prefill);
}

// Open the Settings page from anywhere (mirrors the settings button handler).
// Optional `tab` activates a specific section; legacy drawer names
// ('behavior', 'archive') are mapped inside setSettingsSection so old
// deep-links keep working.
function openSettingsDrawer(tab) {
  const d = document.getElementById('settings-drawer');
  if (!d) return;
  rememberOpener(d);
  d.classList.remove('hidden');
  setSettingsSection(tab || document.querySelector('#drawer-tabs .dt.active')?.dataset.tab || 'general');
  try { renderCaptureSettings(); } catch {}
  setTimeout(() => focusFirstIn(d), 50);
}

// Advance to the next theme in THEMES and announce it (shared by the palette and
// the Settings → Appearance cycle button).
function cycleTheme() {
  const cycle = THEMES.map(t => t.id);
  const i = cycle.indexOf(State.get().settings.theme);
  State.get().settings.theme = cycle[(i + 1) % cycle.length];
  applySettings();
  State.persist();
  const t = THEMES.find(x => x.id === State.get().settings.theme);
  toast(tr('toast.theme', { theme: t?.label || State.get().settings.theme }));
}

const _palSvg = body => `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">${body}</svg>`;
const PAL_ICONS = Object.freeze({
  link: _palSvg('<path d="M8.2 11.8l3.6-3.6M6.1 13.9l-1 .9a3 3 0 01-4.2-4.2l3-3a3 3 0 014.2 0M13.9 6.1l1-.9a3 3 0 114.2 4.2l-3 3a3 3 0 01-4.2 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
  note: _palSvg('<path d="M4 2.5h8l4 4v11H4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 2.5v4h4M7 10h6M7 13h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'),
  space: _palSvg('<path d="M2.5 6.5h6l1.5 2h7.5v8.5h-15zM2.5 6.5v-3h5l1.5 2h8.5v3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'),
  window: _palSvg('<rect x="2.5" y="3" width="15" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 7h15M6 5h.01M9 5h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
  import: _palSvg('<path d="M10 2.5v10M6.5 9l3.5 3.5L13.5 9M3 15v2h14v-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  home: _palSvg('<path d="M2.5 9.5L10 3l7.5 6.5M4.5 8.5v8h11v-8M8 16.5v-5h4v5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'),
  inbox: _palSvg('<path d="M3.5 3.5h13v13h-13zM3.5 11h3l1.5 2h4l1.5-2h3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'),
  calendar: _palSvg('<rect x="2.5" y="4" width="15" height="13.5" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 2.5v3M14 2.5v3M2.5 8h15M6 11h2M11 11h3M6 14h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'),
  read: _palSvg('<path d="M5 2.5h10a1 1 0 011 1v14L10 14l-6 3.5v-14a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'),
  library: _palSvg('<path d="M3 3h4v14H3zM8 3h4v14H8zM13 4l3.5-1 3 13.5-3.5 1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'),
  favorite: _palSvg('<path d="M10 2.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'),
  archive: _palSvg('<path d="M3 5h14v12H3zM2.5 2.5h15V6h-15zM7.5 10h5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>'),
  trash: _palSvg('<path d="M4.5 6h11l-1 11h-9zM3 6h14M7.5 6V3h5v3M8 9.5v4M12 9.5v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'),
  search: _palSvg('<circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.6"/><path d="M12.5 12.5L17 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
  sidebar: _palSvg('<rect x="2.5" y="3" width="15" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7.5 3v14M4.5 6h.01M4.5 9h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
  theme: _palSvg('<path d="M10 2.5a7.5 7.5 0 100 15c1.1 0 1.7-.9 1.3-1.9-.4-1 .3-2.1 1.4-2.1h1.8a3 3 0 003-3c0-4.4-3.4-8-7.5-8z" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="8" r="1" fill="currentColor"/><circle cx="9" cy="5.5" r="1" fill="currentColor"/><circle cx="13" cy="7" r="1" fill="currentColor"/>'),
  settings: _palSvg('<circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'),
  help: _palSvg('<circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5"/><path d="M7.8 7.6a2.3 2.3 0 114 1.5c-.7.8-1.8 1-1.8 2.4M10 14.2h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
  layout: _palSvg('<rect x="2.5" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="11.5" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="2.5" y="12" width="6" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="11.5" y="12" width="6" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/>'),
  tools: _palSvg('<path d="M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM13.5 11v5M11 13.5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'),
});

function _palModKey() {
  return /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl';
}

async function _palSaveActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs && tabs[0];
  if (!tab || !tab.url || isProto(tab.url)) return toast(tr('palette.noActiveTab'), { danger: true });
  await saveTabToInbox(tab);
}

function _palCreateNote() {
  const cat = activeCat();
  if (!cat) return toast(tr('palette.noSpace'), { danger: true });
  let inbox = cat.groups.find(g => g.name === 'Inbox');
  if (!inbox) {
    inbox = { id: uid(), name: 'Inbox', symbol: '📥', color: '#6366f1', collapsed: false, items: [] };
    cat.groups.unshift(inbox);
  }
  State.snapshot('Add note');
  const note = stampNew({ id: uid(), type: 'note', html: '' });
  inbox.items.unshift(note);
  State.persist();
  openGroupPage(inbox.id);
  setTimeout(() => document.querySelector(`[data-id="${note.id}"] .note-text`)?.focus(), 80);
}

function _palToggleSidebar() {
  const settings = State.get().settings;
  settings.sidebarCollapsed = !settings.sidebarCollapsed;
  applySettings();
  State.persist();
}

function _palOpenSavedLink(row) {
  const ws = activeWs();
  if (!ws || !row?.item || !row?.cat) return;
  ws.activeCatId = row.cat.id;
  activeLibraryMode = null;
  activeHome = false;
  activeGroupPage = null;
  activeCalendar = null;
  boardDetailItemId = null;
  State.persist();
  renderAll();
  openItemDetail(row.item.id);
}

function _palRecentTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(appLocale(), { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return tr('trash.yesterday');
  return d.toLocaleDateString(appLocale(), { month: 'short', day: 'numeric' });
}

function _palSavedLinkCommand(row) {
  let host = '';
  try { host = new URL(row.item.url).hostname.replace(/^www\./, ''); } catch { host = dispUrl(row.item.url); }
  return {
    id: `link-${row.item.id}`,
    section: 'recent',
    icon: PAL_ICONS.link,
    label: row.item.title || host || row.item.url,
    desc: tr('palette.savedLinkDesc', { host: host || tr('palette.savedLink'), space: row.cat.name }),
    badge: tr('palette.savedLink'),
    meta: _palRecentTime(row.item.createdAt),
    keywords: `${row.item.url || ''} ${(row.item.tags || []).join(' ')} ${row.cat.name} ${row.group.name}`,
    run: () => _palOpenSavedLink(row),
  };
}

function _palRecentCommands() {
  return collectWorkspaceTabs(activeWs())
    .slice()
    .sort((a, b) => (b.item.createdAt || 0) - (a.item.createdAt || 0))
    .slice(0, 4)
    .map(_palSavedLinkCommand);
}

// The command set is rebuilt each time the palette opens so every label, recent
// item, workspace, space, and group reflects live local state.
function buildPaletteCommands() {
  const cmds = [];
  const add = command => cmds.push(command);
  const s = State.get();
  const ws = activeWs();
  const cat = activeCat();
  const cur = getViewMode();
  const mod = _palModKey();

  add({ id: 'save-tab', section: 'quick', icon: PAL_ICONS.link, label: tr('palette.saveTab'), desc: tr('palette.saveTabDesc'), shortcut: [mod, '⇧', 'S'], run: _palSaveActiveTab });
  add({ id: 'create-note', section: 'quick', icon: PAL_ICONS.note, label: tr('palette.createNote'), desc: tr('palette.createNoteDesc'), run: _palCreateNote });
  add({ id: 'new-space', section: 'quick', icon: PAL_ICONS.space, label: tr('palette.newSpace'), desc: tr('palette.newSpaceDesc'), run: () => openOrganizationCreate('space') });
  add({ id: 'save-window', section: 'quick', icon: PAL_ICONS.window, label: tr('palette.saveWindow'), desc: tr('palette.saveWindowDesc'), run: saveAllTabs });
  add({ id: 'import-bookmarks', section: 'quick', icon: PAL_ICONS.import, label: tr('palette.importBookmarks'), desc: tr('palette.importBookmarksDesc'), run: importBookmarks });

  add({ id: 'home', section: 'go', icon: PAL_ICONS.home, label: tr('nav.home'), desc: tr('palette.homeDesc'), run: goHome });
  add({ id: 'inbox', section: 'go', icon: PAL_ICONS.inbox, label: tr('nav.inbox'), desc: tr('palette.inboxDesc'), run: openInboxView });
  add({ id: 'calendar', section: 'go', icon: PAL_ICONS.calendar, label: tr('action.calendar'), desc: tr('palette.calendarDesc'), run: openCalendar });
  add({ id: 'read-later', section: 'go', icon: PAL_ICONS.read, label: tr('nav.readLater'), desc: tr('palette.readLaterDesc'), run: () => openLibrarySurface('read-later') });
  add({ id: 'all-links', section: 'go', icon: PAL_ICONS.library, label: tr('nav.allLinks'), desc: tr('palette.allLinksDesc'), run: () => openLibrarySurface('all') });
  add({ id: 'favorites', section: 'go', icon: PAL_ICONS.favorite, label: tr('nav.favorites'), desc: tr('palette.favoritesDesc'), home: false, run: () => openLibrarySurface('favorites') });
  add({ id: 'archive', section: 'go', icon: PAL_ICONS.archive, label: tr('nav.archive'), desc: tr('palette.archiveDesc'), home: false, run: () => openLibrarySurface('archive') });
  add({ id: 'trash', section: 'go', icon: PAL_ICONS.trash, label: tr('nav.trash'), desc: tr('palette.trashDesc'), home: false, run: () => openLibrarySurface('trash') });
  add({ id: 'toggle-sidebar', section: 'shortcuts', icon: PAL_ICONS.sidebar, label: tr('palette.toggleSidebar'), desc: tr('palette.toggleSidebarDesc'), run: _palToggleSidebar });
  add({ id: 'next-theme', section: 'shortcuts', icon: PAL_ICONS.theme, label: tr('palette.nextTheme'), desc: tr('palette.nextThemeDesc'), run: cycleTheme });
  add({ id: 'focus-search', section: 'shortcuts', icon: PAL_ICONS.search, label: tr('palette.search'), desc: tr('palette.searchDesc'), shortcut: ['/'], run: () => openSearchBar() });
  add({ id: 'shortcut-help', section: 'shortcuts', icon: PAL_ICONS.help, label: tr('palette.help'), desc: tr('palette.helpDesc'), shortcut: ['?'], run: openCheatsheet });
  add({ id: 'settings', section: 'shortcuts', icon: PAL_ICONS.settings, label: tr('action.settings'), desc: tr('palette.settingsDesc'), run: openSettingsDrawer });

  LAYOUT_ORDER.filter(m => LAYOUTS[m] && m !== cur).forEach(m => {
    add({ id: `layout-${m}`, section: 'more', home: false, icon: PAL_ICONS.layout, label: tr('palette.switchLayout', { name: LAYOUTS[m].label }), keywords: LAYOUTS[m].label, run: () => setViewMode(m) });
  });
  s.workspaces.forEach(w => {
    if (w.id === s.activeWsId) return;
    add({ id: `workspace-${w.id}`, section: 'more', home: false, sym: w.symbol, label: tr('palette.workspace', { name: w.name }), run: () => { State.get().activeWsId = w.id; State.persist(); renderAll(); } });
  });
  if (ws) ws.categories.forEach(c => {
    if (c.id === ws.activeCatId) return;
    add({ id: `space-${c.id}`, section: 'more', home: false, icon: PAL_ICONS.space, label: tr('palette.space', { name: c.name }), run: () => { ws.activeCatId = c.id; State.persist(); renderAll(); } });
  });
  if (cat) cat.groups.forEach(g => {
    add({ id: `group-${g.id}`, section: 'more', home: false, sym: g.symbol, label: tr('palette.group', { name: g.name }), run: () => openGroupPage(g.id) });
  });
  SETTINGS_SECTIONS.forEach(section => {
    add({ id: `settings-${section.id}`, section: 'more', home: false, icon: PAL_ICONS.settings, label: tr(section.title), desc: tr(section.sub), run: () => openSettingsDrawer(section.id) });
  });
  add({ id: 'tools', section: 'more', home: false, icon: PAL_ICONS.tools, label: tr('action.tools'), run: openToolsHub });
  cmds.push(..._palRecentCommands());
  return cmds;
}

// Contiguous matches rank above scattered subsequences; descriptions and local
// metadata participate so a space name, hostname, or tag can find its command.
function _palScore(command, q) {
  if (!q) return 0;
  const text = `${command.label || ''} ${command.desc || ''} ${command.keywords || ''}`.toLowerCase();
  const idx = text.indexOf(q);
  if (idx >= 0) return 1000 - idx;
  let qi = 0, score = 0, last = -2;
  for (let i = 0; i < text.length && qi < q.length; i++) {
    if (text[i] === q[qi]) { score += (last === i - 1) ? 3 : 1; last = i; qi++; }
  }
  return qi === q.length ? score : -1;
}

function _palMatchingLinks(query) {
  return collectWorkspaceTabs(activeWs())
    .filter(row => landingLinkMatches(row, query))
    .sort((a, b) => (b.item.createdAt || 0) - (a.item.createdAt || 0))
    .slice(0, 7)
    .map(_palSavedLinkCommand);
}

function _palEnsureDom() {
  let ov = document.getElementById('cmd-palette');
  if (ov) return ov;
  ov = document.createElement('div');
  ov.id = 'cmd-palette';
  ov.className = 'hidden';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.innerHTML =
    `<div class="cmdp-box">` +
      `<div class="cmdp-inputrow">` +
        `<span class="cmdp-ico">${PAL_ICONS.search}</span>` +
        `<input id="cmdp-input" type="text" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="cmdp-list" aria-autocomplete="list">` +
        `<span class="cmdp-trigger" aria-hidden="true"><kbd></kbd><kbd>K</kbd></span>` +
      `</div>` +
      `<div class="cmdp-list" id="cmdp-list" role="listbox"></div>` +
      `<div id="cmdp-status" class="cmdp-status" aria-live="polite"></div>` +
      `<div class="cmdp-footer"><span aria-hidden="true">✧</span><span></span></div>` +
    `</div>`;
  document.body.appendChild(ov);
  inheritActiveBodyInterlocks(ov);
  const inp = ov.querySelector('#cmdp-input');
  ov.addEventListener('mousedown', e => { if (e.target === ov) closeCommandPalette(); });
  ov.addEventListener('keydown', e => {
    trapTabKey(e, ov);
    if (e.target !== inp && ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape'].includes(e.key)) _palKeydown(e);
  });
  inp.addEventListener('input', () => _palRender(inp.value));
  inp.addEventListener('keydown', _palKeydown);
  return ov;
}

function _palSyncLocale(ov) {
  ov.setAttribute('aria-label', tr('palette.ariaLabel'));
  const inp = ov.querySelector('#cmdp-input');
  inp.placeholder = tr('palette.placeholder');
  inp.setAttribute('aria-label', tr('palette.placeholder'));
  ov.querySelector('.cmdp-trigger kbd').textContent = _palModKey();
  ov.querySelector('.cmdp-footer span:last-child').textContent = tr('palette.footer');
}

function openCommandPalette() {
  const organizationName = document.getElementById('organization-name-overlay');
  if (organizationName && !organizationName.classList.contains('hidden')) return false;
  const organization = document.getElementById('organization-delete-overlay');
  if (organization && !organization.classList.contains('hidden')) return false;
  const ov = _palEnsureDom();
  _palSyncLocale(ov);
  rememberOpener(ov);
  _palState = { cmds: buildPaletteCommands(), filtered: [], sel: 0, query: '', noMatch: false };
  ov.classList.remove('hidden');
  const inp = ov.querySelector('#cmdp-input');
  inp.value = '';
  _palRender('');
  setTimeout(() => inp.focus(), 30);
  return true;
}

function closeCommandPalette() {
  const ov = document.getElementById('cmd-palette');
  if (!ov || ov.classList.contains('hidden')) return;
  ov.classList.add('hidden');
  _palState = null;
  restoreOpener(ov);
}

function _palShortcutHtml(keys) {
  return (keys || []).map(key => `<kbd>${esc(key)}</kbd>`).join('');
}

function _palRow(command, index) {
  const row = document.createElement('button');
  row.type = 'button';
  row.id = `cmdp-option-${index}`;
  row.className = 'cmdp-row' + (index === _palState.sel ? ' sel' : '');
  row.dataset.palIndex = index;
  row.setAttribute('role', 'option');
  row.setAttribute('aria-selected', index === _palState.sel ? 'true' : 'false');
  row.innerHTML =
    `<span class="cmdp-row-ico">${command.icon || (command.sym ? esc(command.sym) : PAL_ICONS.link)}</span>` +
    `<span class="cmdp-row-copy"><span class="cmdp-row-label">${esc(command.label)}</span>${command.desc ? `<span class="cmdp-row-desc">${esc(command.desc)}</span>` : ''}</span>` +
    `<span class="cmdp-row-end">${command.badge ? `<span class="cmdp-row-badge">${esc(command.badge)}</span>` : ''}${command.meta ? `<span class="cmdp-row-meta">${esc(command.meta)}</span>` : ''}${command.shortcut ? `<span class="cmdp-row-shortcut">${_palShortcutHtml(command.shortcut)}</span>` : ''}</span>`;
  row.addEventListener('mouseenter', () => { if (_palState && _palState.sel !== index) { _palState.sel = index; _palSyncSel(); } });
  row.addEventListener('click', () => _palRun(index));
  return row;
}

function _palSection(title, commands, emptyText = '') {
  const section = document.createElement('section');
  section.className = 'cmdp-section';
  section.innerHTML = `<h3>${esc(title)}</h3>`;
  if (!commands.length && emptyText) {
    const empty = document.createElement('p');
    empty.className = 'cmdp-section-empty';
    empty.textContent = emptyText;
    section.appendChild(empty);
    return section;
  }
  commands.forEach(command => section.appendChild(_palRow(command, _palState.filtered.indexOf(command))));
  return section;
}

function _palRenderHome(listEl) {
  const quick = _palState.cmds.filter(c => c.section === 'quick' && c.home !== false);
  const go = _palState.cmds.filter(c => c.section === 'go' && c.home !== false);
  const recent = _palState.cmds.filter(c => c.section === 'recent');
  const shortcuts = _palState.cmds.filter(c => c.section === 'shortcuts' && c.home !== false);
  _palState.filtered = [...quick, ...go, ...recent, ...shortcuts];
  listEl.className = 'cmdp-list cmdp-home';
  const left = document.createElement('div'); left.className = 'cmdp-column cmdp-column-main';
  const right = document.createElement('div'); right.className = 'cmdp-column cmdp-column-side';
  left.appendChild(_palSection(tr('palette.quickActions'), quick));
  left.appendChild(_palSection(tr('palette.goTo'), go));
  left.appendChild(_palSection(tr('palette.recent'), recent, tr('palette.recentEmpty')));
  right.appendChild(_palSection(tr('palette.shortcuts'), shortcuts));
  listEl.append(left, right);
}

function _palRenderResults(listEl, commands) {
  listEl.className = 'cmdp-list cmdp-results';
  const section = document.createElement('section');
  section.className = 'cmdp-section';
  section.innerHTML = `<h3>${esc(tr('palette.results'))}</h3>`;
  if (_palState.noMatch) {
    const empty = document.createElement('p');
    empty.className = 'cmdp-empty';
    empty.textContent = tr('palette.noMatch');
    section.appendChild(empty);
  }
  commands.forEach(command => section.appendChild(_palRow(command, _palState.filtered.indexOf(command))));
  listEl.appendChild(section);
}

function _palRender(query) {
  if (!_palState) return;
  _palState.query = query;
  _palState.sel = 0;
  const raw = query.trim();
  const q = raw.toLowerCase();
  const listEl = document.getElementById('cmdp-list');
  listEl.innerHTML = '';

  if (!q) {
    _palState.noMatch = false;
    _palRenderHome(listEl);
  } else {
    const ranked = _palState.cmds
      .filter(c => c.section !== 'recent')
      .map(c => ({ c, score: _palScore(c, q) }))
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score);
    _palMatchingLinks(raw).forEach(c => ranked.push({ c, score: 900 }));
    const seen = new Set();
    const matches = ranked.filter(({ c }) => !seen.has(c.id) && seen.add(c.id)).map(({ c }) => c).slice(0, 11);
    _palState.noMatch = matches.length === 0;
    const fallback = {
      id: 'search-board-fallback', section: 'results', icon: PAL_ICONS.search,
      label: tr('palette.searchBoard', { query: raw }), desc: tr('palette.searchBoardDesc'),
      shortcut: ['Enter'], run: () => openSearchBar(raw),
    };
    _palState.filtered = [...matches, fallback];
    _palRenderResults(listEl, _palState.filtered);
  }

  const count = _palState.filtered.length;
  document.getElementById('cmdp-status').textContent = tr('palette.resultCount', { count });
  _palSyncSel();
}

function _palSyncSel() {
  if (!_palState) return;
  const rows = document.querySelectorAll('#cmdp-list .cmdp-row');
  rows.forEach(row => {
    const on = Number(row.dataset.palIndex) === _palState.sel;
    row.classList.toggle('sel', on);
    row.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const sel = document.querySelector(`#cmdp-list .cmdp-row[data-pal-index="${_palState.sel}"]`);
  const inp = document.getElementById('cmdp-input');
  if (sel) {
    inp?.setAttribute('aria-activedescendant', sel.id);
    if (sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  } else {
    inp?.removeAttribute('aria-activedescendant');
  }
}

function _palKeydown(e) {
  if (!_palState) return;
  const n = _palState.filtered.length;
  if (e.key === 'ArrowDown') { e.preventDefault(); _palState.sel = n ? (_palState.sel + 1) % n : 0; _palSyncSel(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _palState.sel = n ? (_palState.sel - 1 + n) % n : 0; _palSyncSel(); }
  else if (e.key === 'Home') { e.preventDefault(); _palState.sel = 0; _palSyncSel(); }
  else if (e.key === 'End') { e.preventDefault(); _palState.sel = Math.max(0, n - 1); _palSyncSel(); }
  else if (e.key === 'Enter') { e.preventDefault(); _palRun(_palState.sel); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCommandPalette(); }
}

function _palRun(i) {
  if (!_palState) return;
  const command = _palState.filtered[i];
  if (!command) return;
  closeCommandPalette();
  try {
    const result = command.run();
    if (result && typeof result.catch === 'function') result.catch(err => { console.error(err); toast(String(err?.message || err), { danger: true }); });
  } catch (err) {
    console.error(err);
    toast(String(err?.message || err), { danger: true });
  }
}

function toggleSelectMode() {
  // The button is "active" whenever the mode is on — whether it was entered
  // explicitly or implicitly by selecting items via checkboxes. A click on an
  // active button must turn everything off in one go, so treat the current
  // itemSelMode (not just explicitSelMode) as the off transition.
  if (itemSelMode) { clearItemSelection(); return; }
  explicitSelMode = true;
  syncItemSelMode();
  renderBoard();
}

function toggleReorderMode() {
  const on = document.body.classList.toggle('reorder-mode');
  updateModeButtonState();
  if (on) toast('Reorder mode on — drag to rearrange. Esc to exit.');
}

// Reflect whether an "organize" mode (item selection or reorder) is active onto
// the top-bar overflow (⋯) button. These controls moved off the always-visible
// toolbar into its menu, so the ⋯ button carries their combined active state.
function updateModeButtonState() {
  const on = itemSelMode || document.body.classList.contains('reorder-mode');
  document.getElementById('more-btn')?.classList.toggle('active', on);
}

// The top-bar overflow (⋯) menu — houses the less-frequent "organize" and
// tab-management actions (item selection, reorder, save eligible open tabs) that used
// to be separate always-visible buttons. Relocating them keeps the default
// toolbar calm while leaving everything one click away. Reuses the shared
// context-menu chrome so it matches every theme.
const MORE_MENU_ICONS = {
  select: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="2.2" stroke="currentColor" stroke-width="1.2"/><path d="M3.8 6l1.6 1.6L8.4 4.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  reorder: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="4" cy="2.5" r="0.9" fill="currentColor"/><circle cx="8" cy="2.5" r="0.9" fill="currentColor"/><circle cx="4" cy="6" r="0.9" fill="currentColor"/><circle cx="8" cy="6" r="0.9" fill="currentColor"/><circle cx="4" cy="9.5" r="0.9" fill="currentColor"/><circle cx="8" cy="9.5" r="0.9" fill="currentColor"/></svg>',
  save: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2.7A0.8 0.8 0 012.8 2h5l2.2 2.2v5.1a0.8 0.8 0 01-.8.8H2.8a0.8 0.8 0 01-.8-.8V2.7z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M4 2v2.4h4V2M4 10V7h4v3" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
};

async function saveMostRecentOpenTab(event) {
  let tabs = [];
  try { tabs = await chrome.tabs.query({ currentWindow: true }); } catch {}
  const candidate = tabs
    .filter(tab => tab.url && !isProto(tab.url))
    .sort((a, b) => Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0))[0];
  if (!candidate) {
    toast('No saveable tab is open in this window', { danger: true });
    return false;
  }
  let domain = candidate.url;
  try { domain = new URL(candidate.url).hostname; } catch {}
  const title = String(candidate.title || domain || candidate.url).trim();
  const displayTitle = title.length > 56 ? title.slice(0, 53) + '…' : title;
  const button = event?.currentTarget || document.getElementById('topbar-save');
  const rect = button?.getBoundingClientRect();
  if (!rect) return false;
  showContextMenu(rect.left, rect.bottom + 6, [
    { label: displayTitle },
    { text: tr('action.saveCopy'), icon: MORE_MENU_ICONS.save, sub: domain, action: () => saveTabToInbox(candidate, { closeSource: false }) },
    { text: tr('action.saveClose'), icon: cmIcons.archive, sub: tr('action.saveCandidate'), action: () => saveTabToInbox(candidate, { closeSource: true }) },
  ], { focusFirst: true });
  return true;
}

function secondaryNavigationItems() {
  return [
    { label: 'Find and review' },
    { text: tr('search.nav'), icon: cmIcons.open, action: openSearchSurface },
    { text: tr('nav.favorites'), icon: cmIcons.favorite, action: () => openLibrarySurface('favorites') },
    { text: tr('nav.readLater'), icon: cmIcons.readLater, action: () => openLibrarySurface('read-later') },
    { text: tr('nav.archive'), icon: cmIcons.archive, action: () => openLibrarySurface('archive') },
    { text: tr('nav.trash'), icon: cmIcons.delete, action: () => openLibrarySurface('trash') },
    { sep: true },
    { text: tr('action.calendar'), icon: cmIcons.clock, action: openCalendar },
    { text: tr('action.plugins'), icon: cmIcons.stack, action: openToolsHub },
    { text: tr('action.settings'), icon: cmIcons.edit, action: () => openSettingsDrawer('general') },
  ];
}

function openSidebarMoreMenu(btn) {
  const r = btn.getBoundingClientRect();
  showContextMenu(r.left + 8, r.bottom + 6, secondaryNavigationItems(), { focusFirst: true });
}

function openMoreMenu(btn) {
  const selOn = itemSelMode;
  const reOn = document.body.classList.contains('reorder-mode');
  const items = [
    ...secondaryNavigationItems(),
    { sep: true },
    { label: 'Organize' },
    { text: tr('action.undo'), icon: cmIcons.edit, sub: State.canUndo() ? '' : '—', action: performUndo },
    { text: tr('action.selectionMode'), icon: MORE_MENU_ICONS.select, sub: selOn ? '✓' : '', action: toggleSelectMode },
    { text: tr('action.reorderMode'), icon: MORE_MENU_ICONS.reorder, sub: reOn ? '✓' : '', action: toggleReorderMode },
    { sep: true },
    { text: tr('action.saveAllTabs'), icon: MORE_MENU_ICONS.save, action: saveAllTabs },
  ];
  const r = btn.getBoundingClientRect();
  showContextMenu(r.left, r.bottom + 6, items, { focusFirst: true });
}

// Icons for the top-bar app menu (openAppMenu). Kept local so the menu reads
// consistently with the rest of the context-menu chrome across every theme.
const APP_MENU_ICONS = {
  settings: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6.9 2.2a.6.6 0 01.6-.5h1a.6.6 0 01.6.5l.16 1.05c.44.13.85.36 1.2.66l1-.4a.6.6 0 01.72.26l.5.86a.6.6 0 01-.12.75l-.83.67a4.3 4.3 0 010 1.38l.83.67a.6.6 0 01.12.75l-.5.86a.6.6 0 01-.72.26l-1-.4c-.35.3-.76.53-1.2.66L9.1 14.3a.6.6 0 01-.6.5h-1a.6.6 0 01-.6-.5l-.16-1.05a4.3 4.3 0 01-1.2-.66l-1 .4a.6.6 0 01-.72-.26l-.5-.86a.6.6 0 01.12-.75l.83-.67a4.3 4.3 0 010-1.38l-.83-.67a.6.6 0 01-.12-.75l.5-.86a.6.6 0 01.72-.26l1 .4c.35-.3.76-.53 1.2-.66L6.9 2.2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><circle cx="8" cy="8" r="2.1" stroke="currentColor" stroke-width="1.3"/></svg>',
  plugins: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M10 3.2a2 2 0 014 0V4a1 1 0 001 1h2.8a1 1 0 011 1V9a1 1 0 001 1h.2a2 2 0 010 4h-.2a1 1 0 00-1 1v2.8a1 1 0 01-1 1H15a1 1 0 01-1-1v-.2a2 2 0 00-4 0v.2a1 1 0 01-1 1H6.2a1 1 0 01-1-1V15a1 1 0 00-1-1H4a2 2 0 010-4h.2a1 1 0 001-1V6a1 1 0 011-1H9a1 1 0 001-1v-.8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  calendar: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3" width="11" height="10.5" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 6h11M5.5 2v2.2M10.5 2v2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  theme: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 2a6 6 0 000 12z" fill="currentColor"/></svg>',
  workspaces: '<svg width="14" height="14" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="1.5" width="4" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="7.5" y="1.5" width="4" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="1.5" y="7.5" width="4" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="7.5" y="7.5" width="4" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>',
  guide: '<svg width="14" height="14" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.3"/><path d="M5 5.5a1.5 1.5 0 113 0c0 .8-1.5 1-1.5 2M6.5 9.5v.01" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  about: '<svg width="14" height="14" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.3"/><path d="M6.5 5.6v3.4M6.5 3.9v.01" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
};

// The top-bar app menu (replaces the fake avatar button). Every entry routes to
// an existing surface so nothing here is decorative: Settings, Plugins (tools
// hub), Calendar/reminders, Theme, Workspaces, Guide, and About.
function openAppMenu(btn) {
  const s = State.get();
  const ws = activeWs();
  const theme = THEMES.find(t => t.id === s.settings.theme);
  const pending = _pendingReminderCount;
  const items = [
    { label: ws ? ws.name : 'Locus' },
    { text: tr('menu.settings'), icon: APP_MENU_ICONS.settings, action: () => openSettingsDrawer() },
    { text: tr('menu.plugins'), icon: APP_MENU_ICONS.plugins, action: () => openToolsHub() },
    { text: tr('menu.calendar'), icon: APP_MENU_ICONS.calendar, sub: pending > 0 ? String(pending) : '', action: () => { if (!activeCalendar) openCalendar(); } },
    { text: tr('menu.theme'), icon: APP_MENU_ICONS.theme, sub: theme ? theme.label : '', action: () => openSettingsDrawer('appearance') },
    { sep: true },
    { text: tr('menu.workspaces'), icon: APP_MENU_ICONS.workspaces, action: () => openWsGrid(btn) },
    { text: tr('menu.guide'), icon: APP_MENU_ICONS.guide, action: () => openWelcome() },
    { text: tr('menu.about'), icon: APP_MENU_ICONS.about, action: () => openAbout() },
  ];
  const r = btn.getBoundingClientRect();
  // Anchor to the button's right edge so the menu hugs the corner (clamped to
  // the viewport by showContextMenu).
  showContextMenu(r.right - 236, r.bottom + 8, items, { focusFirst: true });
}

// ── About dialog ────────────────────────────────────────────────────
// A small, real informational modal (version + privacy boundaries + a way
// back into the guide). Reuses the overlay scrim + focus helpers so it behaves
// like every other overlay across themes.
function openAbout() {
  const ov = document.getElementById('about-overlay');
  if (!ov) return;
  let ver = '3.1.0';
  try { if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) ver = chrome.runtime.getManifest().version || ver; } catch {}
  const vEl = document.getElementById('about-version');
  if (vEl) vEl.textContent = 'v' + ver;
  rememberOpener(ov);
  ov.classList.remove('hidden');
  lockBodyScroll();
  focusFirstIn(ov);
}
function closeAbout() {
  const ov = document.getElementById('about-overlay');
  if (!ov) return;
  ov.classList.add('hidden');
  unlockBodyScroll();
  restoreOpener(ov);
}

// ── Drag auto-scroll: when dragging near the top/bottom of any scrollable area, scroll it ──
let autoScrollRaf = null;
function setupDragAutoScroll() {
  document.addEventListener('dragover', (e) => {
    if (!drag) return;
    if (autoScrollRaf) cancelAnimationFrame(autoScrollRaf);
    const targets = document.querySelectorAll('#open-tabs, .gcol-cards, .stack-items, #board, #fin-list');
    let scrolled = false;
    targets.forEach(zone => {
      const r = zone.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right) return;
      if (e.clientY < r.top - 40 || e.clientY > r.bottom + 40) return;
      const edgeT = Math.max(0, r.top + 40 - e.clientY);
      const edgeB = Math.max(0, e.clientY - (r.bottom - 40));
      if (edgeT > 0) { zone.scrollTop -= Math.min(20, edgeT * 0.5); scrolled = true; }
      else if (edgeB > 0) { zone.scrollTop += Math.min(20, edgeB * 0.5); scrolled = true; }
    });
    // Horizontal auto-scroll for #board (the main canvas)
    const board = document.getElementById('board');
    if (board) {
      const r = board.getBoundingClientRect();
      const edgeL = Math.max(0, r.left + 60 - e.clientX);
      const edgeR = Math.max(0, e.clientX - (r.right - 60));
      if (edgeL > 0) { board.scrollLeft -= Math.min(25, edgeL * 0.4); scrolled = true; }
      else if (edgeR > 0) { board.scrollLeft += Math.min(25, edgeR * 0.4); scrolled = true; }
    }
  }, true);
}

// ── Drag a saved tab card onto the sidebar's open-tabs list to open it ──
// Only accepts item-kind drags (board/list cards) whose item is a tab —
// notes/todos/stacks have no URL to open. Dragging FROM the sidebar back
// onto itself (kind 'tab'/'tabs-multi') is ignored; that's not a target.
function setupOpenTabsDropToOpen() {
  const zone = document.getElementById('open-tabs');
  if (!zone) return;

  const getDraggedSavedTab = () => {
    if (drag?.kind !== 'item') return null;
    const info = findItem(drag.id);
    if (!info || info.item.type !== 'tab' || !info.item.url) return null;
    return info.item;
  };

  const acceptSavedTabDrop = (e) => {
    const item = getDraggedSavedTab();
    if (!item) return null;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    zone.classList.add('dragover');
    return item;
  };

  zone.addEventListener('dragenter', acceptSavedTabDrop, true);
  zone.addEventListener('dragover', acceptSavedTabDrop, true);
  zone.addEventListener('dragleave', (e) => {
    if (zone.contains(e.relatedTarget)) return;
    zone.classList.remove('dragover');
  });
  zone.addEventListener('drop', (e) => {
    const item = acceptSavedTabDrop(e);
    zone.classList.remove('dragover');
    if (!item) return;
    openTabMaybeHibernated(item.url, { focus: true }).catch(() => toast('Could not open tab', { danger: true }));
  }, true);
}
function openToolsHub() { document.getElementById('tools-hub').classList.remove('hidden'); }
function closeToolsHub() { document.getElementById('tools-hub').classList.add('hidden'); }
function bindToolsHub() {
  document.getElementById('plugins-btn').onclick = openToolsHub;
  document.getElementById('hub-close').onclick = closeToolsHub;
  document.getElementById('tools-hub').addEventListener('click', e => { if (e.target.id === 'tools-hub') closeToolsHub(); });
  document.querySelectorAll('.hub-card').forEach(c => {
    c.onclick = () => {
      const t = c.dataset.tool;
      closeToolsHub();
      if (t === 'pomodoro') openPomo();
      else if (t === 'finance') openFin();
      else if (t === 'subs') openSubsTracker();
      else if (t === 'habits') openHabits();
      else if (t === 'water') openWater();
      else if (t === 'books') openBooks();
      else if (t === 'goals') openGoals();
      else if (t === 'workout') openWorkout();
    };
  });
}

// ════════════════════════════════════════════════════════════════
// POMODORO
// ════════════════════════════════════════════════════════════════
const POMO_DEFAULT = { focus: 25, short: 5, long: 15, autoStart: false, sound: true, longEvery: 4 };
let pomoTimer = null;
let pomoState = { mode:'focus', remaining:0, running:false, session:0 };

function getPomo() {
  const s = State.get();
  if (!s.pomo) s.pomo = { settings: { ...POMO_DEFAULT }, stats: { total:0, perDay:{}, streak:0, lastDay:'' }, tasks: [] };
  if (!s.pomo.tasks) s.pomo.tasks = [];
  return s.pomo;
}

function openPomo() {
  const p = getPomo();
  // Preserve any in-progress (or paused) session so popping the overlay back
  // open doesn't snap a running timer back to a fresh focus block.
  if (!pomoState.remaining) {
    pomoState.mode = 'focus';
    pomoState.remaining = p.settings.focus * 60;
    pomoState.running = false;
  }
  const ov = document.getElementById('pomo-overlay');
  rememberOpener(ov);
  renderPomo();
  syncPomoInputs();
  ov.classList.remove('hidden');
  lockBodyScroll();
  focusFirstIn(ov);
}
function closePomo() {
  stopPomoTimer();
  const ov = document.getElementById('pomo-overlay');
  ov.classList.add('hidden');
  unlockBodyScroll();
  restoreOpener(ov);
}

function syncPomoInputs() {
  const p = getPomo();
  document.getElementById('pomo-dur-focus').value = p.settings.focus;
  document.getElementById('pomo-dur-short').value = p.settings.short;
  document.getElementById('pomo-dur-long').value = p.settings.long;
  document.getElementById('pomo-auto').checked = p.settings.autoStart;
  document.getElementById('pomo-sound').checked = p.settings.sound;
  document.getElementById('pomo-task').value = p.currentTask || '';
}

function renderPomo() {
  const ov = document.getElementById('pomo-overlay');
  ov.classList.remove('mode-focus','mode-short','mode-long');
  ov.classList.add('mode-' + pomoState.mode);

  const p = getPomo();
  const total = (pomoState.mode === 'focus' ? p.settings.focus : pomoState.mode === 'short' ? p.settings.short : p.settings.long) * 60;
  const pct = total ? pomoState.remaining / total : 0;
  const circ = 2 * Math.PI * 144;
  if (!_pomoRingEl) _pomoRingEl = document.querySelector('.pomo-ring-fg');
  if (_pomoRingEl) _pomoRingEl.style.strokeDashoffset = String(circ * (1 - pct));

  const m = Math.floor(pomoState.remaining / 60);
  const s = pomoState.remaining % 60;
  document.getElementById('pomo-time').textContent = `${m}:${String(s).padStart(2, '0')}`;

  const phase = pomoState.mode === 'focus' ? (pomoState.running ? 'Focusing…' : p.currentTask ? `Ready: ${p.currentTask}` : 'Ready to focus') :
                pomoState.mode === 'short' ? (pomoState.running ? 'Short break' : 'Ready for a break') :
                (pomoState.running ? 'Long break' : 'Well done — take a longer break');
  document.getElementById('pomo-phase').textContent = phase;

  // Update mode buttons
  document.querySelectorAll('.pomo-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === pomoState.mode));

  // Start btn label/icon
  const startLabel = document.getElementById('pomo-start-label');
  const startIcon = document.getElementById('pomo-start-icon');
  if (pomoState.running) {
    startLabel.textContent = 'Pause';
    startIcon.innerHTML = '<rect x="5" y="3" width="4" height="14" fill="currentColor" rx="1"/><rect x="11" y="3" width="4" height="14" fill="currentColor" rx="1"/>';
  } else {
    startLabel.textContent = pomoState.remaining !== total ? 'Resume' : 'Start';
    startIcon.innerHTML = '<path d="M5 3l12 7-12 7V3z" fill="currentColor"/>';
  }

  // Stats
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('pomo-today-count').textContent = p.stats.perDay[today] || 0;
  document.getElementById('pomo-total-count').textContent = p.stats.total || 0;
  document.getElementById('pomo-streak').textContent = p.stats.streak || 0;

  // Title indicator
  if (pomoState.running) {
    document.title = `${m}:${String(s).padStart(2,'0')} · Locus`;
  } else {
    document.title = 'Locus';
  }

  renderPomoTasks();
}

function renderPomoTasks() {
  const p = getPomo();
  const $list = document.getElementById('pomo-tasks-list');
  $list.innerHTML = '';
  const frag = document.createDocumentFragment();
  p.tasks.forEach(t => {
    const el = document.createElement('div');
    el.className = 'pomo-task-item' + (t.done ? ' done' : '');
    el.dataset.taskId = t.id;
    el.innerHTML = `
      <div class="pomo-task-check ${t.done ? 'checked':''}"></div>
      <span class="pomo-task-text">${esc(t.text)}</span>
      <button class="pomo-task-del"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>`;
    frag.appendChild(el);
  });
  $list.appendChild(frag);
}

// Cached pomo nodes set on first openPomo() — avoids per-tick querySelector.
let _pomoRingEl = null, _pomoTimeEl = null, _pomoLastTitle = '';
// Per-second updates for an active Pomodoro session. Only mutates the
// ring, time text, and document title — anything else (mode, phase,
// stats, tasks) needs an explicit renderPomo() call from a state change.
function tickPomo() {
  const p = getPomo();
  const total = (pomoState.mode === 'focus' ? p.settings.focus : pomoState.mode === 'short' ? p.settings.short : p.settings.long) * 60;
  const pct = total ? pomoState.remaining / total : 0;
  if (!_pomoRingEl) _pomoRingEl = document.querySelector('.pomo-ring-fg');
  if (_pomoRingEl) _pomoRingEl.style.strokeDashoffset = String(2 * Math.PI * 144 * (1 - pct));
  const m = Math.floor(pomoState.remaining / 60);
  const s = pomoState.remaining % 60;
  const timeText = `${m}:${String(s).padStart(2, '0')}`;
  if (!_pomoTimeEl) _pomoTimeEl = document.getElementById('pomo-time');
  if (_pomoTimeEl) _pomoTimeEl.textContent = timeText;
  // document.title writes are surprisingly expensive — only change when needed.
  const nextTitle = pomoState.running ? `${timeText} · Locus` : 'Locus';
  if (nextTitle !== _pomoLastTitle) { document.title = nextTitle; _pomoLastTitle = nextTitle; }
}
function startPomoTimer() {
  if (pomoState.running) return;
  pomoState.running = true;
  pomoTimer = setInterval(() => {
    pomoState.remaining--;
    if (pomoState.remaining <= 0) { onPomoFinish(); return; }
    tickPomo();
  }, 1000);
  renderPomo();
}
function pausePomoTimer() {
  pomoState.running = false;
  if (pomoTimer) clearInterval(pomoTimer);
  pomoTimer = null;
  renderPomo();
}
function stopPomoTimer() {
  if (pomoTimer) clearInterval(pomoTimer);
  pomoTimer = null;
  pomoState.running = false;
}
function setPomoMode(mode) {
  stopPomoTimer();
  const p = getPomo();
  pomoState.mode = mode;
  pomoState.remaining = (mode === 'focus' ? p.settings.focus : mode === 'short' ? p.settings.short : p.settings.long) * 60;
  renderPomo();
}
function resetPomo() {
  stopPomoTimer();
  const p = getPomo();
  pomoState.remaining = (pomoState.mode === 'focus' ? p.settings.focus : pomoState.mode === 'short' ? p.settings.short : p.settings.long) * 60;
  renderPomo();
}

function onPomoFinish() {
  stopPomoTimer();
  const p = getPomo();
  if (pomoState.mode === 'focus') {
    // Increment stats
    const today = new Date().toISOString().slice(0,10);
    p.stats.total = (p.stats.total || 0) + 1;
    p.stats.perDay = p.stats.perDay || {};
    p.stats.perDay[today] = (p.stats.perDay[today] || 0) + 1;
    // Streak
    if (p.stats.lastDay !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
      p.stats.streak = p.stats.lastDay === yesterday ? (p.stats.streak || 0) + 1 : 1;
      p.stats.lastDay = today;
    }
    pomoState.session++;
    State.persist();
    if (p.settings.sound) playBeep();
    // Next: long break every N, otherwise short
    const nextMode = (pomoState.session % p.settings.longEvery === 0) ? 'long' : 'short';
    setPomoMode(nextMode);
    if (p.settings.autoStart) startPomoTimer();
    try {
      new Notification('Focus session complete!', { body: 'Time for a break.', icon: chrome.runtime.getURL('icons/icon128.png') });
    } catch {}
  } else {
    // Break finished → back to focus
    setPomoMode('focus');
    if (p.settings.sound) playBeep();
    if (p.settings.autoStart) startPomoTimer();
    try {
      new Notification('Break over', { body: 'Ready to focus?', icon: chrome.runtime.getURL('icons/icon128.png') });
    } catch {}
  }
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    o.start(); o.stop(ctx.currentTime + 0.6);
  } catch {}
}

function bindPomo() {
  document.getElementById('pomo-close').onclick = closePomo;
  document.getElementById('pomo-start').onclick = () => (pomoState.running ? pausePomoTimer() : startPomoTimer());
  document.getElementById('pomo-reset').onclick = resetPomo;
  document.getElementById('pomo-skip').onclick = onPomoFinish;
  document.querySelectorAll('.pomo-mode-btn').forEach(b => b.onclick = () => setPomoMode(b.dataset.mode));

  const p = getPomo();
  ['focus','short','long'].forEach(k => {
    const el = document.getElementById(`pomo-dur-${k}`);
    el.addEventListener('change', () => {
      const v = parseInt(el.value, 10);
      if (v > 0) { p.settings[k] = v; State.persist(); resetPomo(); }
    });
  });
  document.getElementById('pomo-auto').addEventListener('change', e => { p.settings.autoStart = e.target.checked; State.persist(); });
  document.getElementById('pomo-sound').addEventListener('change', e => { p.settings.sound = e.target.checked; State.persist(); });
  document.getElementById('pomo-task').addEventListener('input', e => { p.currentTask = e.target.value; State.persist(); });

  document.getElementById('pomo-new-task').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const v = e.target.value.trim();
      if (v) { p.tasks.push({ id: uid(), text: v, done: false }); e.target.value = ''; State.persist(); renderPomoTasks(); }
    }
  });

  // Delegate task check/delete clicks (renderPomoTasks no longer binds per-row).
  document.getElementById('pomo-tasks-list').addEventListener('click', e => {
    const item = e.target.closest('.pomo-task-item');
    if (!item) return;
    const id = item.dataset.taskId;
    const tasks = getPomo().tasks;
    const idx = tasks.findIndex(x => x.id === id);
    if (idx < 0) return;
    if (e.target.closest('.pomo-task-check')) {
      tasks[idx].done = !tasks[idx].done;
      State.persist(); renderPomoTasks();
    } else if (e.target.closest('.pomo-task-del')) {
      tasks.splice(idx, 1);
      State.persist(); renderPomoTasks();
    }
  });

  // Request notification permission on first open
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

// ════════════════════════════════════════════════════════════════
// FINANCE DIARY
// ════════════════════════════════════════════════════════════════
const FIN_CATS = [
  { id:'food',      icon:'🍜', label:'Food & Drinks', color:'#f97316' },
  { id:'groceries', icon:'🛒', label:'Groceries',      color:'#84cc16' },
  { id:'transport', icon:'🚃', label:'Transport',      color:'#3b82f6' },
  { id:'shopping',  icon:'🛍️', label:'Shopping',       color:'#ec4899' },
  { id:'entertain', icon:'🎬', label:'Entertainment',  color:'#a855f7' },
  { id:'bills',     icon:'💡', label:'Bills',          color:'#eab308' },
  { id:'health',    icon:'🏥', label:'Health',         color:'#ef4444' },
  { id:'education', icon:'📚', label:'Education',      color:'#06b6d4' },
  { id:'travel',    icon:'✈️', label:'Travel',         color:'#10b981' },
  { id:'other',     icon:'📦', label:'Other',          color:'#64748b' },
];
const FIN_CUR_SYM = { USD:'$', EUR:'€', GBP:'£', TWD:'NT$', JPY:'¥', CNY:'¥', KRW:'₩' };
function getFinRange() {
  return getFin().settings.range || 'today';
}
function setFinRange(r) {
  const f = getFin();
  if (!f.settings) f.settings = {};
  f.settings.range = r;
  State.persist();
}

function getFin() {
  const s = State.get();
  if (!s.fin) s.fin = { txns: [], settings: { defaultCurrency: 'TWD' } };
  return s.fin;
}

function openFin() {
  const f = getFin();
  // Populate category select
  const $cat = document.getElementById('fin-q-cat');
  $cat.innerHTML = FIN_CATS.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
  document.getElementById('fin-q-cur').value = f.settings.defaultCurrency || 'TWD';
  const ov = document.getElementById('fin-overlay');
  rememberOpener(ov);
  renderFin();
  ov.classList.remove('hidden');
  lockBodyScroll();
  focusFirstIn(ov);
}
function closeFin() {
  const ov = document.getElementById('fin-overlay');
  ov.classList.add('hidden');
  unlockBodyScroll();
  restoreOpener(ov);
}

function finFilteredTxns() {
  const f = getFin();
  const now = new Date();
  const r = getFinRange();
  let start;
  if (r === 'today') {
    start = new Date(now); start.setHours(0,0,0,0);
  } else if (r === 'week') {
    start = new Date(now); start.setDate(start.getDate() - 7);
  } else if (r === 'month') {
    start = new Date(now); start.setDate(1); start.setHours(0,0,0,0);
  } else {
    start = new Date(0);
  }
  return f.txns.filter(t => new Date(t.date).getTime() >= start.getTime());
}

function renderFin() {
  const f = getFin();
  const txns = finFilteredTxns();
  const cur = f.settings.defaultCurrency || 'TWD';
  const sym = FIN_CUR_SYM[cur] || '$';

  // Convert everything to default currency
  const FX = { USD:1, EUR:1.09, GBP:1.28, TWD:0.031, JPY:0.0067, CNY:0.14, KRW:0.00074 };
  const toDefault = (amt, c) => amt * (FX[c] || 1) / (FX[cur] || 1);

  let total = 0;
  const byCat = {};
  txns.forEach(t => {
    const v = toDefault(Number(t.amount)||0, t.currency || 'USD');
    total += v;
    byCat[t.category] = (byCat[t.category] || 0) + v;
  });

  // Stats
  const fmt = v => {
    const dec = (cur === 'JPY' || cur === 'KRW') ? 0 : 2;
    return `${sym}${v.toLocaleString(appLocale(), { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
  };
  document.getElementById('fin-spent').textContent = fmt(total);
  document.getElementById('fin-count').textContent = txns.length;
  const _r = getFinRange();
  // For 'all' range, span = days from the oldest tx (txns are insertion-ordered).
  const days = _r === 'today' ? 1 : _r === 'week' ? 7 : _r === 'month' ? new Date().getDate() : Math.max(1, Math.ceil((Date.now() - (f.txns[0] ? new Date(f.txns[0].date).getTime() : Date.now()))/86400000));
  document.getElementById('fin-avg').textContent = fmt(total / days);
  const top = Object.entries(byCat).sort((a,b) => b[1]-a[1])[0];
  document.getElementById('fin-top').textContent = top ? FIN_CATS.find(c => c.id === top[0])?.icon + ' ' + FIN_CATS.find(c => c.id === top[0])?.label : '—';

  // Categories (ordered by spend)
  const $cats = document.getElementById('fin-cats');
  $cats.innerHTML = '';
  const catEntries = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
  if (!catEntries.length) { $cats.innerHTML = `<div class="fin-empty">No spending recorded in this period.</div>`; }
  else {
    const frag = document.createDocumentFragment();
    catEntries.forEach(([catId, val]) => {
      const cat = FIN_CATS.find(c => c.id === catId) || FIN_CATS[FIN_CATS.length-1];
      const pct = total ? (val / total * 100) : 0;
      const row = document.createElement('div');
      row.className = 'fin-cat-row';
      row.style.setProperty('--cat-tint', cat.color);
      row.innerHTML = `
        <span class="fci-icon">${cat.icon}</span>
        <div class="fci-info">
          <div class="fci-name">${esc(cat.label)}</div>
          <div class="fci-bar"><div class="fci-bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
        </div>
        <div>
          <div class="fci-val">${fmt(val)}</div>
          <div class="fci-pct">${pct.toFixed(0)}%</div>
        </div>`;
      frag.appendChild(row);
    });
    $cats.appendChild(frag);
  }

  // Transactions — delegate clicks via bindFin's single listener on #fin-list.
  const $list = document.getElementById('fin-list');
  $list.innerHTML = '';
  if (!txns.length) { $list.innerHTML = `<div class="fin-empty">No transactions. Add one above.</div>`; }
  else {
    const frag = document.createDocumentFragment();
    txns.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(t => {
      const cat = FIN_CATS.find(c => c.id === t.category) || FIN_CATS[FIN_CATS.length-1];
      const tSym = FIN_CUR_SYM[t.currency] || '$';
      const dec = (t.currency === 'JPY' || t.currency === 'KRW') ? 0 : 2;
      const amtStr = `${tSym}${Number(t.amount).toLocaleString(appLocale(), { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
      const d = new Date(t.date);
      const dateStr = d.toLocaleDateString(appLocale(), { month:'short', day:'numeric' });
      const row = document.createElement('div');
      row.className = 'fin-tx-row';
      row.dataset.txId = t.id;
      row.innerHTML = `
        <span class="ftx-icon">${cat.icon}</span>
        <div class="ftx-info">
          <div class="ftx-note">${esc(t.note || cat.label)}</div>
          <div class="ftx-meta">${esc(cat.label)} · ${dateStr}</div>
        </div>
        <div class="ftx-amt">${amtStr}</div>
        <button class="ftx-del" title="Delete">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4.5 3V1.5h3V3M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>`;
      frag.appendChild(row);
    });
    $list.appendChild(frag);
  }

  const _activeRange = getFinRange();
  document.querySelectorAll('.fin-tab').forEach(b => b.classList.toggle('active', b.dataset.range === _activeRange));
  renderFinSidebar(byCat, total, fmt);
}

function renderFinSidebar(byCat, total, fmt) {
  const f = getFin();
  // Donut (conic-gradient) using top categories
  const $donut = document.getElementById('fin-donut');
  const $legend = document.getElementById('fin-donut-legend');
  if ($donut && $legend) {
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    if (!total || !entries.length) {
      $donut.style.background = 'conic-gradient(var(--bg3) 0 360deg)';
      $legend.innerHTML = '<div style="font:11px var(--font);color:var(--text3);text-align:center;">No spending yet</div>';
    } else {
      let acc = 0;
      const stops = [];
      const legendRows = [];
      // Top 5 categories + Other bucket
      const top = entries.slice(0, 5);
      const otherSum = entries.slice(5).reduce((a, [, v]) => a + v, 0);
      top.forEach(([cid, val]) => {
        const cat = FIN_CATS.find(c => c.id === cid) || FIN_CATS[FIN_CATS.length - 1];
        const start = (acc / total) * 360;
        acc += val;
        const end = (acc / total) * 360;
        stops.push(`${cat.color} ${start}deg ${end}deg`);
        const pct = (val / total * 100).toFixed(0);
        legendRows.push(`<div class="row"><span class="swatch" style="background:${cat.color}"></span><span>${cat.icon} ${esc(cat.label)}</span><span class="pct">${pct}%</span></div>`);
      });
      if (otherSum > 0.001) {
        const start = (acc / total) * 360;
        acc += otherSum;
        const end = (acc / total) * 360;
        stops.push(`var(--text3) ${start}deg ${end}deg`);
        const pct = (otherSum / total * 100).toFixed(0);
        legendRows.push(`<div class="row"><span class="swatch" style="background:var(--text3)"></span><span>… other</span><span class="pct">${pct}%</span></div>`);
      }
      $donut.style.background = `conic-gradient(${stops.join(', ')})`;
      $legend.innerHTML = legendRows.join('');
    }
  }
  // Donut center & period label
  const $dt = document.getElementById('fin-donut-total');
  if ($dt) $dt.textContent = fmt(total).replace(/\.00$/, '');
  const $dp = document.getElementById('fin-donut-period');
  if ($dp) {
    const r = getFinRange();
    $dp.textContent = r === 'today' ? 'Today' : r === 'week' ? 'This week' : r === 'month' ? 'This month' : 'All time';
  }
  // 7-day sparkline (based on ALL transactions, not the filtered range, so it always shows the trend)
  const now = new Date(); now.setHours(0,0,0,0);
  const cur = f.settings.defaultCurrency || 'TWD';
  const FX = { USD:1, EUR:1.09, GBP:1.28, TWD:0.031, JPY:0.0067, CNY:0.14, KRW:0.00074 };
  const toDefault = (amt, c) => amt * (FX[c] || 1) / (FX[cur] || 1);
  const buckets = new Array(7).fill(0);
  f.txns.forEach(t => {
    const d = new Date(t.date); d.setHours(0,0,0,0);
    const ago = Math.round((now - d) / 86400000);
    if (ago >= 0 && ago < 7) buckets[6 - ago] += toDefault(Number(t.amount) || 0, t.currency || 'USD');
  });
  const max = Math.max(...buckets, 0.001);
  const $line = document.getElementById('fin-spark-line');
  const $fill = document.getElementById('fin-spark-fill');
  if ($line && $fill) {
    const w = 200, h = 44, pad = 2;
    const xs = buckets.map((_, i) => pad + (w - 2 * pad) * (i / 6));
    const ys = buckets.map(v => pad + (h - 2 * pad) * (1 - v / max));
    const linePath = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    const fillPath = `${linePath} L${xs[6].toFixed(1)},${h - pad} L${xs[0].toFixed(1)},${h - pad} Z`;
    $line.setAttribute('d', linePath);
    $fill.setAttribute('d', fillPath);
  }
  const $sparkLbl = document.getElementById('fin-spark-lbl');
  if ($sparkLbl) {
    const sum7 = buckets.reduce((a, b) => a + b, 0);
    $sparkLbl.textContent = `${fmt(sum7)} · 7 days`;
  }
  // Settings inputs
  const $cur = document.getElementById('fin-default-cur');
  if ($cur && $cur !== document.activeElement) $cur.value = f.settings.defaultCurrency || 'TWD';
  const $bud = document.getElementById('fin-budget');
  if ($bud && $bud !== document.activeElement) $bud.value = f.settings.monthlyBudget || 0;
}

function addFinTxn() {
  const amt = parseFloat(document.getElementById('fin-q-amt').value);
  if (!amt || amt <= 0) return toast('Enter a valid amount', { danger:true });
  const category = document.getElementById('fin-q-cat').value;
  const currency = document.getElementById('fin-q-cur').value;
  const note = document.getElementById('fin-q-note').value.trim();
  State.snapshot('Add expense');
  const f = getFin();
  f.settings.defaultCurrency = currency; // remember last-used
  f.txns.push({ id: uid(), amount: amt, currency, category, note, date: new Date().toISOString() });
  State.persist();
  document.getElementById('fin-q-amt').value = '';
  document.getElementById('fin-q-note').value = '';
  renderFin();
  toast(`Logged ${FIN_CUR_SYM[currency] || ''}${amt}`, { undo: true });
}

function exportFinCSV() {
  const f = getFin();
  if (!f.txns.length) return toast('Nothing to export');
  const rows = [['Date','Amount','Currency','Category','Note']];
  f.txns.forEach(t => {
    const cat = FIN_CATS.find(c => c.id === t.category);
    rows.push([new Date(t.date).toISOString().slice(0,10), t.amount, t.currency, cat ? cat.label : t.category, t.note || '']);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `locus-finance-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast('Exported CSV');
}

function bindFin() {
  document.getElementById('fin-close').onclick = closeFin;
  document.getElementById('fin-overlay').addEventListener('click', e => { if (e.target.id === 'fin-overlay') closeFin(); });
  document.getElementById('fin-q-add').onclick = addFinTxn;
  document.getElementById('fin-q-amt').addEventListener('keydown', e => { if (e.key === 'Enter') addFinTxn(); });
  document.getElementById('fin-q-note').addEventListener('keydown', e => { if (e.key === 'Enter') addFinTxn(); });
  document.querySelectorAll('.fin-tab').forEach(b => b.onclick = () => { setFinRange(b.dataset.range); renderFin(); });
  document.getElementById('fin-export').onclick = exportFinCSV;
  // Delegate tx delete clicks once, not per-row on every render.
  document.getElementById('fin-list').addEventListener('click', e => {
    const delBtn = e.target.closest('.ftx-del');
    if (!delBtn) return;
    const row = delBtn.closest('.fin-tx-row');
    const id = row?.dataset.txId;
    if (!id) return;
    if (!confirm('Delete this transaction?')) return;
    State.snapshot('Delete tx');
    const all = getFin().txns; const i = all.findIndex(x => x.id === id);
    if (i > -1) all.splice(i, 1);
    State.persist(); renderFin();
  });
  // Sidebar settings
  const $cur = document.getElementById('fin-default-cur');
  if ($cur) $cur.addEventListener('change', () => {
    const f = getFin(); f.settings.defaultCurrency = $cur.value;
    const $qc = document.getElementById('fin-q-cur');
    if ($qc) $qc.value = $cur.value;
    State.persist(); renderFin();
  });
  const $bud = document.getElementById('fin-budget');
  if ($bud) $bud.addEventListener('change', () => {
    const v = Math.max(0, parseFloat($bud.value) || 0);
    getFin().settings.monthlyBudget = v;
    State.persist();
  });
}

// ════════════════════════════════════════════════════════════════
// HABITS
// ════════════════════════════════════════════════════════════════
function getHabits() {
  const s = State.get();
  if (!s.habits) s.habits = [];
  return s.habits;
}
function getHabitsCfg() {
  const s = State.get();
  if (!s.habitsCfg) s.habitsCfg = { weeklyTarget: 7, selectedId: null };
  return s.habitsCfg;
}

function openHabits() {
  const ov = document.getElementById('habit-overlay');
  rememberOpener(ov);
  renderHabits();
  ov.classList.remove('hidden');
  lockBodyScroll();
  focusFirstIn(ov);
}
function closeHabits() {
  const ov = document.getElementById('habit-overlay');
  ov.classList.add('hidden');
  unlockBodyScroll();
  restoreOpener(ov);
}

function renderHabits() {
  const habits = getHabits();
  const cfg = getHabitsCfg();
  const $list = document.getElementById('habit-list');
  if (!$list) return;
  const today = new Date().toISOString().slice(0,10);
  if (!habits.length) {
    $list.innerHTML = `<div class="fin-empty">No habits yet. Add one above.</div>`;
  } else {
    // Build last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0,10));
    }
    const frag = document.createDocumentFragment();
    habits.forEach(h => {
      const doneSet = new Set(h.dates || []);
      const streak = computeHabitStreak(h);
      const row = document.createElement('div');
      row.className = 'habit-row';
      row.dataset.habitId = h.id;
      row.innerHTML = `
        <div class="hab-icon">${esc(h.icon || '✅')}</div>
        <div class="hab-info">
          <div class="hab-name">${esc(h.name)}</div>
          <div class="hab-streak">🔥 ${streak} day streak · Last 7 days</div>
        </div>
        <div class="hab-grid">
          ${days.map(d => `<div class="hab-cell ${doneSet.has(d) ? 'done':''} ${d === today ? 'today':''}" title="${d}"></div>`).join('')}
        </div>
        <button class="hab-toggle ${doneSet.has(today) ? 'done':''}">${doneSet.has(today) ? '✓ Done' : 'Mark done'}</button>
        <button class="hab-del" title="Delete"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4.5 3V1.5h3V3M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
      frag.appendChild(row);
    });
    $list.innerHTML = '';
    $list.appendChild(frag);
  }
  renderHabitsSidebar();
}

function renderHabitsSidebar() {
  const habits = getHabits();
  const cfg = getHabitsCfg();
  // Stats
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.textContent !== String(v)) {
      el.textContent = v;
      el.classList.remove('tool-num-pop');
      void el.offsetWidth;
      el.classList.add('tool-num-pop');
    }
  };
  let bestStreak = 0, totalChecks = 0, perfectDays = 0;
  habits.forEach(h => {
    const set = new Set(h.dates || []);
    totalChecks += set.size;
    // Compute longest streak by scanning sorted unique dates
    const sorted = [...set].sort();
    let cur = 0, best = 0, prev = null;
    sorted.forEach(d => {
      const dt = new Date(d);
      if (prev && (dt - prev) === 86400000) cur++;
      else cur = 1;
      best = Math.max(best, cur);
      prev = dt;
    });
    if (best > bestStreak) bestStreak = best;
  });
  // Perfect days = days in last 7 where ALL habits are checked
  if (habits.length) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0,10);
      if (habits.every(h => (h.dates || []).includes(key))) perfectDays++;
    }
  }
  setVal('hab-total', habits.length);
  setVal('hab-best', bestStreak);
  setVal('hab-perfect', perfectDays);
  setVal('hab-checks', totalChecks);

  // Heatmap select options
  const $sel = document.getElementById('hab-hm-select');
  if ($sel) {
    if (!habits.length) {
      $sel.innerHTML = '<option>No habits</option>';
    } else {
      let selectedId = cfg.selectedId && habits.find(h => h.id === cfg.selectedId) ? cfg.selectedId : habits[0].id;
      cfg.selectedId = selectedId;
      $sel.innerHTML = habits.map(h => `<option value="${esc(h.id)}" ${h.id === selectedId ? 'selected':''}>${esc(h.icon || '✅')} ${esc(h.name)}</option>`).join('');
    }
  }

  // 12-week heatmap (84 days, organized as 12 columns × 7 rows)
  const $hm = document.getElementById('hab-heatmap');
  if ($hm) {
    const selected = habits.find(h => h.id === cfg.selectedId) || habits[0];
    const doneSet = new Set((selected && selected.dates) || []);
    const today = new Date(); today.setHours(0,0,0,0);
    const dow = today.getDay(); // Sunday=0
    // End column is current week. Go back 11 weeks.
    const cols = [];
    for (let c = 11; c >= 0; c--) {
      const colCells = [];
      for (let r = 0; r < 7; r++) {
        const offset = c * 7 + (6 - r); // newest row at bottom-right? actually want chronological
        // Simpler: start = (84 - 1) - (c*7 + r)  in days ago
        const daysAgo = (11 - c) * 7 + (6 - r);
        // Wait, want most recent at bottom right. Let's compute date.
        const d = new Date(today);
        d.setDate(d.getDate() - daysAgo);
        const key = d.toISOString().slice(0,10);
        const isFuture = d > today;
        colCells.push(`<div class="hab-hm-cell ${doneSet.has(key) ? 'done':''} ${isFuture?'future':''}" title="${key}"></div>`);
      }
      cols.push(`<div class="hab-hm-col">${colCells.join('')}</div>`);
    }
    $hm.innerHTML = cols.join('');
  }

  // Settings input value
  const $wt = document.getElementById('hab-weekly-target');
  if ($wt && $wt !== document.activeElement) $wt.value = cfg.weeklyTarget;
}

function computeHabitStreak(h) {
  const doneSet = new Set(h.dates || []);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    if (doneSet.has(key)) streak++;
    else if (i > 0) break; // Allow today not-yet-done
  }
  return streak;
}

function bindHabits() {
  document.getElementById('habit-close').onclick = closeHabits;
  document.getElementById('habit-overlay').addEventListener('click', e => { if (e.target.id === 'habit-overlay') closeHabits(); });
  document.getElementById('habit-add-btn').onclick = () => {
    const name = document.getElementById('habit-new-name').value.trim();
    if (!name) return toast('Enter a name', { danger: true });
    const iconElement = document.getElementById('habit-new-icon-val');
    const icon = iconElement.textContent || '✅';
    State.snapshot('Add habit');
    getHabits().push({ id: uid(), name, icon, dates: [] });
    if (iconElement.dataset.emojiChosen === 'true') rememberRecentEmoji(icon);
    delete iconElement.dataset.emojiChosen;
    State.persist();
    document.getElementById('habit-new-name').value = '';
    renderHabits();
  };
  document.getElementById('habit-new-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('habit-add-btn').click(); });
  document.getElementById('habit-new-icon').onclick = (e) => {
    e.stopPropagation();
    openEmojiPicker({ kind: 'habit-icon' }, e.currentTarget);
  };
  // Delegate toggle/delete clicks once, not per-row on every render.
  document.getElementById('habit-list').addEventListener('click', e => {
    const row = e.target.closest('.habit-row');
    if (!row) return;
    const id = row.dataset.habitId;
    const habits = getHabits();
    const h = habits.find(x => x.id === id);
    if (!h) return;
    if (e.target.closest('.hab-toggle')) {
      State.snapshot('Habit toggle');
      const today = new Date().toISOString().slice(0,10);
      h.dates = h.dates || [];
      const idx = h.dates.indexOf(today);
      if (idx > -1) h.dates.splice(idx, 1); else h.dates.push(today);
      State.persist(); renderHabits();
    } else if (e.target.closest('.hab-del')) {
      if (!confirm(`Delete habit "${h.name}"?`)) return;
      State.snapshot('Delete habit');
      const idx = habits.findIndex(x => x.id === id);
      if (idx > -1) habits.splice(idx, 1);
      State.persist(); renderHabits();
    }
  });
  // Sidebar: heatmap habit selector
  const $sel = document.getElementById('hab-hm-select');
  if ($sel) $sel.addEventListener('change', () => {
    getHabitsCfg().selectedId = $sel.value;
    State.persist();
    renderHabitsSidebar();
  });
  // Sidebar: weekly target
  const $wt = document.getElementById('hab-weekly-target');
  if ($wt) $wt.addEventListener('change', () => {
    const v = Math.max(1, Math.min(7, parseInt($wt.value, 10) || 7));
    getHabitsCfg().weeklyTarget = v;
    $wt.value = v;
    State.persist();
  });
}

// ════════════════════════════════════════════════════════════════
// HYDRATION
// ════════════════════════════════════════════════════════════════
function getWater() {
  const s = State.get();
  if (!s.water) s.water = { goal: 8, days: {}, total: 0 };
  if (!s.water.glassSize) s.water.glassSize = 250;
  if (!s.water.unit) s.water.unit = 'ml';
  return s.water;
}

function openWater() {
  const ov = document.getElementById('water-overlay');
  rememberOpener(ov);
  renderWater();
  ov.classList.remove('hidden');
  lockBodyScroll();
  focusFirstIn(ov);
}
function closeWater() {
  const ov = document.getElementById('water-overlay');
  ov.classList.add('hidden');
  unlockBodyScroll();
  restoreOpener(ov);
}

function renderWater() {
  const w = getWater();
  const today = new Date().toISOString().slice(0,10);
  const cnt = w.days[today] || 0;
  const $val = document.getElementById('water-val');
  if ($val) $val.textContent = `${cnt} / ${w.goal}`;
  const pct = Math.min(1, cnt / w.goal);
  const circ = 2 * Math.PI * 88;
  const $fg = document.getElementById('water-ring-fg');
  if ($fg) { $fg.style.strokeDasharray = String(circ); $fg.style.strokeDashoffset = String(circ * (1 - pct)); }
  // Label includes total volume if glass-size set
  const $lbl = document.getElementById('water-lbl');
  if ($lbl) {
    const vol = cnt * w.glassSize;
    const volStr = w.unit === 'oz' ? `${(vol / 29.5735).toFixed(1)} oz` : `${vol} ml`;
    $lbl.textContent = `glasses today · ${volStr}`;
  }
  renderWaterSidebar();
}

function renderWaterSidebar() {
  const w = getWater();
  const today = new Date(); today.setHours(0,0,0,0);
  // Build last 7 days, oldest first
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    days.push({ key: d.toISOString().slice(0,10), label: d.toLocaleDateString(appLocale(), { weekday: 'narrow' }), count: w.days[d.toISOString().slice(0,10)] || 0 });
  }
  // Bars
  const $bars = document.getElementById('water-week');
  const $dayLbls = document.getElementById('water-week-days');
  if ($bars) {
    const max = Math.max(w.goal, ...days.map(d => d.count));
    $bars.innerHTML = days.map(d => {
      const pct = max ? d.count / max : 0;
      const h = Math.max(4, Math.round(pct * 80));
      return `<div class="water-week-bar ${d.count ? '' : 'empty'}" style="height:${h}px" title="${d.key}: ${d.count} glasses"><span class="ct">${d.count || ''}</span></div>`;
    }).join('');
  }
  if ($dayLbls) {
    $dayLbls.innerHTML = days.map(d => `<div class="water-week-day" style="flex:1">${d.label}</div>`).join('');
  }
  // Stats
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.textContent !== String(v)) {
      el.textContent = v;
      el.classList.remove('tool-num-pop');
      void el.offsetWidth;
      el.classList.add('tool-num-pop');
    }
  };
  const weekTotal = days.reduce((a, d) => a + d.count, 0);
  const weekAvg = (weekTotal / 7).toFixed(1).replace(/\.0$/, '');
  const best = days.reduce((m, d) => Math.max(m, d.count), 0);
  setVal('water-streak-val', computeWaterStreak());
  setVal('water-total-val', w.total || 0);
  setVal('water-week-avg', weekAvg);
  setVal('water-best', best);
  // Settings inputs
  const $goal = document.getElementById('water-goal');
  if ($goal && $goal !== document.activeElement) $goal.value = w.goal;
  const $gs = document.getElementById('water-glass-size');
  if ($gs && $gs !== document.activeElement) $gs.value = w.glassSize;
  document.querySelectorAll('#water-unit-seg button').forEach(b => b.classList.toggle('active', b.dataset.unit === w.unit));
}
function computeWaterStreak() {
  const w = getWater();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    const c = w.days[key] || 0;
    if (c >= w.goal) streak++;
    else if (i > 0) break;
  }
  return streak;
}
function bindWater() {
  document.getElementById('water-close').onclick = closeWater;
  document.getElementById('water-overlay').addEventListener('click', e => { if (e.target.id === 'water-overlay') closeWater(); });
  const today = () => new Date().toISOString().slice(0,10);
  document.getElementById('water-plus').onclick = () => {
    State.snapshot('+water');
    const w = getWater();
    w.days[today()] = (w.days[today()] || 0) + 1;
    w.total = (w.total || 0) + 1;
    State.persist(); renderWater();
  };
  document.getElementById('water-minus').onclick = () => {
    State.snapshot('-water');
    const w = getWater();
    w.days[today()] = Math.max(0, (w.days[today()] || 0) - 1);
    w.total = Math.max(0, (w.total || 0) - 1);
    State.persist(); renderWater();
  };
  document.getElementById('water-reset').onclick = () => {
    if (!confirm('Reset today\'s count?')) return;
    const w = getWater();
    const t = today();
    const cnt = w.days[t] || 0;
    w.total = Math.max(0, (w.total || 0) - cnt);
    w.days[t] = 0;
    State.persist(); renderWater();
  };
  document.getElementById('water-goal').addEventListener('change', e => {
    const v = parseInt(e.target.value);
    if (v >= 1 && v <= 20) { getWater().goal = v; State.persist(); renderWater(); }
  });
  const $gs = document.getElementById('water-glass-size');
  if ($gs) $gs.addEventListener('change', () => {
    const v = Math.max(50, Math.min(1000, parseInt($gs.value, 10) || 250));
    getWater().glassSize = v; $gs.value = v;
    State.persist(); renderWater();
  });
  document.querySelectorAll('#water-unit-seg button').forEach(b => {
    b.addEventListener('click', () => {
      getWater().unit = b.dataset.unit;
      State.persist(); renderWater();
    });
  });
}

// ════════════════════════════════════════════════════════════════
// READING / BOOKS
// ════════════════════════════════════════════════════════════════
let booksFilter = 'reading';
function getBooks() {
  const s = State.get();
  if (!s.books) s.books = [];
  return s.books;
}
function getBooksCfg() {
  const s = State.get();
  if (!s.booksCfg) s.booksCfg = { yearlyGoal: 12 };
  return s.booksCfg;
}
function openBooks() {
  const ov = document.getElementById('books-overlay');
  rememberOpener(ov);
  renderBooks();
  ov.classList.remove('hidden');
  lockBodyScroll();
  focusFirstIn(ov);
}
function closeBooks() {
  const ov = document.getElementById('books-overlay');
  ov.classList.add('hidden');
  unlockBodyScroll();
  restoreOpener(ov);
}
function renderBooks() {
  const books = getBooks().filter(b => b.status === booksFilter);
  const $list = document.getElementById('books-list');
  if (!$list) return;
  $list.innerHTML = '';
  if (!books.length) {
    $list.innerHTML = `<div class="fin-empty">No books in this shelf yet.</div>`;
  } else {
    const grid = document.createElement('div');
    grid.className = 'bk-grid';
    books.forEach(b => {
      const card = document.createElement('div');
      card.className = 'bk-card';
      card.innerHTML = `
        <div class="bk-title">${esc(b.title)}</div>
        <div class="bk-author">${esc(b.author || 'Unknown author')}${b.date && b.status === 'finished' ? ' · ' + new Date(b.date).toLocaleDateString(appLocale(), { month:'short', year:'numeric' }) : ''}</div>
        <div class="bk-actions">
          ${b.status !== 'reading' ? `<button data-act="reading">📖 Reading</button>` : ''}
          ${b.status !== 'finished' ? `<button data-act="finished">✅ Done</button>` : ''}
          ${b.status !== 'want' ? `<button data-act="want">🔖 Wishlist</button>` : ''}
          <button data-act="del" class="danger">Delete</button>
        </div>`;
      card.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => {
          const act = btn.dataset.act;
          if (act === 'del') {
            if (!confirm('Delete this book?')) return;
            State.snapshot('Delete book');
            const all = getBooks(); const i = all.findIndex(x => x.id === b.id);
            if (i > -1) all.splice(i, 1);
          } else {
            State.snapshot('Status');
            b.status = act;
            if (act === 'finished') b.date = new Date().toISOString();
          }
          State.persist(); renderBooks();
        };
      });
      grid.appendChild(card);
    });
    $list.appendChild(grid);
  }
  document.querySelectorAll('.books-tab').forEach(t => t.classList.toggle('active', t.dataset.st === booksFilter));
  renderBooksSidebar();
}
function renderBooksSidebar() {
  const books = getBooks();
  const cfg = getBooksCfg();
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.textContent !== String(v)) {
      el.textContent = v;
      el.classList.remove('tool-num-pop');
      void el.offsetWidth;
      el.classList.add('tool-num-pop');
    }
  };
  // Shelf counts
  setVal('bk-reading-ct',  books.filter(b => b.status === 'reading').length);
  setVal('bk-finished-ct', books.filter(b => b.status === 'finished').length);
  setVal('bk-want-ct',     books.filter(b => b.status === 'want').length);
  // This month finished
  const now = new Date();
  const moStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthCt = books.filter(b => b.status === 'finished' && b.date && new Date(b.date) >= moStart).length;
  setVal('bk-mo-ct', monthCt);
  // Yearly goal ring
  const yrStart = new Date(now.getFullYear(), 0, 1);
  const yrCt = books.filter(b => b.status === 'finished' && b.date && new Date(b.date) >= yrStart).length;
  const goal = Math.max(1, cfg.yearlyGoal || 12);
  const pct = Math.min(1, yrCt / goal);
  const $ring = document.getElementById('bk-goal-ring-fg');
  if ($ring) {
    const circ = 2 * Math.PI * 56;
    $ring.style.strokeDasharray = String(circ);
    $ring.style.strokeDashoffset = String(circ * (1 - pct));
  }
  setVal('bk-goal-n', `${yrCt}/${goal}`);
  const $d = document.getElementById('bk-goal-d');
  if ($d) $d.textContent = `${now.getFullYear()} reading goal`;
  const $inp = document.getElementById('bk-goal-input');
  if ($inp && $inp !== document.activeElement) $inp.value = cfg.yearlyGoal;
}
function bindBooks() {
  document.getElementById('books-close').onclick = closeBooks;
  document.getElementById('books-overlay').addEventListener('click', e => { if (e.target.id === 'books-overlay') closeBooks(); });
  document.querySelectorAll('.books-tab').forEach(t => t.onclick = () => { booksFilter = t.dataset.st; renderBooks(); });
  document.getElementById('book-add').onclick = () => {
    const title = document.getElementById('book-title').value.trim();
    const author = document.getElementById('book-author').value.trim();
    if (!title) return toast('Enter a title', { danger: true });
    State.snapshot('Add book');
    getBooks().push({ id: uid(), title, author, status: booksFilter, date: new Date().toISOString() });
    State.persist();
    document.getElementById('book-title').value = '';
    document.getElementById('book-author').value = '';
    renderBooks();
  };
  document.getElementById('book-title').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('book-add').click(); });
  document.getElementById('book-author').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('book-add').click(); });
  const $g = document.getElementById('bk-goal-input');
  if ($g) $g.addEventListener('change', () => {
    const v = Math.max(0, Math.min(999, parseInt($g.value, 10) || 0));
    getBooksCfg().yearlyGoal = v; $g.value = v;
    State.persist(); renderBooksSidebar();
  });
}

// ════════════════════════════════════════════════════════════════
// GOALS
// ════════════════════════════════════════════════════════════════
function getGoals() {
  const s = State.get();
  if (!s.goals) s.goals = [];
  return s.goals;
}
function getGoalsCfg() {
  const s = State.get();
  if (!s.goalsCfg) s.goalsCfg = { sort: 'due', showDone: true };
  return s.goalsCfg;
}
function openGoals() {
  const ov = document.getElementById('goals-overlay');
  rememberOpener(ov);
  renderGoals();
  ov.classList.remove('hidden');
  lockBodyScroll();
  focusFirstIn(ov);
}
function closeGoals() {
  const ov = document.getElementById('goals-overlay');
  ov.classList.add('hidden');
  unlockBodyScroll();
  restoreOpener(ov);
}
function renderGoals() {
  const all = getGoals();
  const cfg = getGoalsCfg();
  let goals = all.slice();
  if (!cfg.showDone) goals = goals.filter(g => (g.progress || 0) < 100);
  if (cfg.sort === 'due') goals.sort((a, b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return new Date(a.due) - new Date(b.due);
  });
  else if (cfg.sort === 'progress') goals.sort((a, b) => (b.progress || 0) - (a.progress || 0));
  else if (cfg.sort === 'created') goals.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
  const $list = document.getElementById('goals-list');
  if (!$list) return;
  $list.innerHTML = '';
  if (!goals.length) {
    $list.innerHTML = `<div class="fin-empty">No goals yet.</div>`;
  } else {
    goals.forEach(g => {
      const progress = Math.max(0, Math.min(100, g.progress || 0));
      const daysLeft = g.due ? Math.round((new Date(g.due) - Date.now()) / 86400000) : null;
      let dueCls = '', dueTxt = '';
      if (daysLeft != null) {
        if (daysLeft < 0) { dueCls = 'overdue'; dueTxt = `${-daysLeft}d overdue`; }
        else if (daysLeft <= 7) { dueCls = 'soon'; dueTxt = `${daysLeft}d left`; }
        else { dueTxt = new Date(g.due).toLocaleDateString(appLocale(), { month:'short', day:'numeric', year:'numeric' }); }
      }
      const row = document.createElement('div');
      row.className = 'goal-row';
      row.innerHTML = `
        <div class="goal-row-top">
          <span class="goal-name">${esc(g.name)}</span>
          ${dueTxt ? `<span class="goal-due ${dueCls}">${dueTxt}</span>` : ''}
        </div>
        <div class="goal-bar" title="Click to set progress"><div class="goal-bar-fill" style="width:${progress}%"></div></div>
        <div class="goal-meta">
          <span>${progress}% complete</span>
          <div class="goal-actions">
            <button data-act="-">−10%</button>
            <button data-act="+">+10%</button>
            <button data-act="100">Done</button>
            <button data-act="del" class="danger">✕</button>
          </div>
        </div>`;
      row.querySelector('.goal-bar').onclick = (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100)));
        State.snapshot('Goal progress');
        g.progress = pct; State.persist(); renderGoals();
      };
      row.querySelectorAll('.goal-actions button').forEach(btn => {
        btn.onclick = () => {
          const act = btn.dataset.act;
          State.snapshot('Goal');
          if (act === '+') g.progress = Math.min(100, (g.progress || 0) + 10);
          else if (act === '-') g.progress = Math.max(0, (g.progress || 0) - 10);
          else if (act === '100') g.progress = 100;
          else if (act === 'del') {
            if (!confirm('Delete this goal?')) return;
            const arr = getGoals(); const i = arr.findIndex(x => x.id === g.id);
            if (i > -1) arr.splice(i, 1);
          }
          State.persist(); renderGoals();
        };
      });
      $list.appendChild(row);
    });
  }
  renderGoalsSidebar();
}
function renderGoalsSidebar() {
  const goals = getGoals();
  const cfg = getGoalsCfg();
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.textContent !== String(v)) {
      el.textContent = v;
      el.classList.remove('tool-num-pop');
      void el.offsetWidth;
      el.classList.add('tool-num-pop');
    }
  };
  const active = goals.filter(g => (g.progress || 0) < 100);
  const done   = goals.filter(g => (g.progress || 0) >= 100);
  const overdue = active.filter(g => g.due && new Date(g.due) < Date.now());
  const avg = goals.length ? Math.round(goals.reduce((a, g) => a + (g.progress || 0), 0) / goals.length) : 0;
  setVal('go-active', active.length);
  setVal('go-done', done.length);
  setVal('go-overdue', overdue.length);
  setVal('go-avg', avg + '%');
  const $sort = document.getElementById('go-sort');
  if ($sort && $sort !== document.activeElement) $sort.value = cfg.sort;
  document.querySelectorAll('#go-show-done-seg button').forEach(b => b.classList.toggle('active', String(cfg.showDone ? 1 : 0) === b.dataset.v));
}
function bindGoals() {
  document.getElementById('goals-close').onclick = closeGoals;
  document.getElementById('goals-overlay').addEventListener('click', e => { if (e.target.id === 'goals-overlay') closeGoals(); });
  document.getElementById('goal-add').onclick = () => {
    const name = document.getElementById('goal-name').value.trim();
    const due = document.getElementById('goal-due').value;
    if (!name) return toast('Enter a goal', { danger: true });
    State.snapshot('Add goal');
    getGoals().push({ id: uid(), name, due, progress: 0, created: new Date().toISOString() });
    State.persist();
    document.getElementById('goal-name').value = '';
    document.getElementById('goal-due').value = '';
    renderGoals();
  };
  document.getElementById('goal-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('goal-add').click(); });
  const $sort = document.getElementById('go-sort');
  if ($sort) $sort.addEventListener('change', () => {
    getGoalsCfg().sort = $sort.value;
    State.persist(); renderGoals();
  });
  document.querySelectorAll('#go-show-done-seg button').forEach(b => {
    b.addEventListener('click', () => {
      getGoalsCfg().showDone = b.dataset.v === '1';
      State.persist(); renderGoals();
    });
  });
}

// ════════════════════════════════════════════════════════════════
// WORKOUT
// ════════════════════════════════════════════════════════════════
const WO_TYPES_DEFAULT = ['Run', 'Strength', 'Yoga', 'Cycling', 'Swim', 'Walk', 'HIIT', 'Stretch'];
function getWorkouts() {
  const s = State.get();
  if (!s.workouts) s.workouts = [];
  return s.workouts;
}
function getWorkoutCfg() {
  const s = State.get();
  if (!s.workoutCfg) s.workoutCfg = { weeklyMin: 150, types: WO_TYPES_DEFAULT.slice() };
  if (!s.workoutCfg.types) s.workoutCfg.types = WO_TYPES_DEFAULT.slice();
  return s.workoutCfg;
}
function openWorkout() {
  const ov = document.getElementById('workout-overlay');
  rememberOpener(ov);
  renderWorkout();
  ov.classList.remove('hidden');
  lockBodyScroll();
  focusFirstIn(ov);
}
function closeWorkout() {
  const ov = document.getElementById('workout-overlay');
  ov.classList.add('hidden');
  unlockBodyScroll();
  restoreOpener(ov);
}
function renderWorkout() {
  const wos = getWorkouts().slice().sort((a,b) => new Date(b.date) - new Date(a.date));
  const $list = document.getElementById('wo-list');
  if (!$list) return;
  $list.innerHTML = '';
  if (!wos.length) {
    $list.innerHTML = `<div class="fin-empty">No workouts logged yet.</div>`;
  } else {
    wos.forEach(w => {
      const d = new Date(w.date);
      const row = document.createElement('div');
      row.className = 'wo-row';
      row.innerHTML = `
        <div class="wo-icon">💪</div>
        <div class="wo-info">
          <div class="wo-name">${esc(w.name)}</div>
          <div class="wo-meta">${d.toLocaleDateString(appLocale(), { weekday:'short', month:'short', day:'numeric' })} · ${w.duration || '?'} min${w.note ? ' · ' + esc(w.note) : ''}</div>
        </div>
        <button class="wo-del"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4.5 3V1.5h3V3M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
      row.querySelector('.wo-del').onclick = () => {
        if (!confirm('Delete this workout?')) return;
        State.snapshot('Delete workout');
        const all = getWorkouts(); const i = all.findIndex(x => x.id === w.id);
        if (i > -1) all.splice(i, 1);
        State.persist(); renderWorkout();
      };
      $list.appendChild(row);
    });
  }
  renderWorkoutSidebar();
}
function renderWorkoutSidebar() {
  const wos = getWorkouts();
  const cfg = getWorkoutCfg();
  const now = Date.now();
  const weekMs = 7 * 86400000;
  const monthMs = 30 * 86400000;
  const weekCt = wos.filter(w => now - new Date(w.date).getTime() < weekMs);
  const weekMin = weekCt.reduce((a, w) => a + (Number(w.duration) || 0), 0);
  const monthCt = wos.filter(w => now - new Date(w.date).getTime() < monthMs);
  const streak = computeWorkoutStreak();
  const goalPct = cfg.weeklyMin ? Math.min(100, Math.round(weekMin / cfg.weeklyMin * 100)) : 0;
  const $stats = document.getElementById('wo-stats');
  if ($stats) {
    $stats.innerHTML = `
      <div class="tool-mini-stat"><div class="lbl">This week</div><div class="val">${weekCt.length}</div></div>
      <div class="tool-mini-stat"><div class="lbl">Minutes</div><div class="val">${weekMin}</div></div>
      <div class="tool-mini-stat"><div class="lbl">Month total</div><div class="val">${monthCt.length}</div></div>
      <div class="tool-mini-stat"><div class="lbl">Streak</div><div class="val">${streak}d</div></div>
      <div class="tool-mini-stat" style="grid-column:1/-1"><div class="lbl">Weekly goal</div><div class="val">${goalPct}%</div></div>`;
  }
  // 30-day heatmap (10 columns × 3 rows)
  const $hm = document.getElementById('wo-heatmap');
  if ($hm) {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayKey = today.toISOString().slice(0,10);
    const daySet = new Set(wos.map(w => new Date(w.date).toISOString().slice(0,10)));
    const cells = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0,10);
      cells.push(`<div class="wo-hm-cell ${daySet.has(key) ? 'done':''} ${key === todayKey ? 'today':''}" title="${key}"></div>`);
    }
    $hm.innerHTML = cells.join('');
  }
  // Workout type chips
  const $types = document.getElementById('wo-types');
  if ($types) {
    $types.innerHTML = cfg.types.map(t => `<button class="wo-type-chip" data-t="${esc(t)}">${esc(t)}</button>`).join('');
    $types.querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        const $n = document.getElementById('wo-name');
        if ($n) { $n.value = b.dataset.t; $n.focus(); }
      };
    });
  }
  // Settings input
  const $wm = document.getElementById('wo-weekly-min');
  if ($wm && $wm !== document.activeElement) $wm.value = cfg.weeklyMin;
}
function computeWorkoutStreak() {
  const wos = getWorkouts();
  const daySet = new Set(wos.map(w => new Date(w.date).toISOString().slice(0,10)));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    if (daySet.has(key)) streak++;
    else if (i > 0) break;
  }
  return streak;
}
function bindWorkout() {
  document.getElementById('workout-close').onclick = closeWorkout;
  document.getElementById('workout-overlay').addEventListener('click', e => { if (e.target.id === 'workout-overlay') closeWorkout(); });
  document.getElementById('wo-add').onclick = () => {
    const name = document.getElementById('wo-name').value.trim();
    const duration = parseInt(document.getElementById('wo-dur').value, 10);
    const note = document.getElementById('wo-note').value.trim();
    if (!name) return toast('Enter a workout name', { danger: true });
    State.snapshot('Add workout');
    getWorkouts().push({ id: uid(), name, duration, note, date: new Date().toISOString() });
    State.persist();
    document.getElementById('wo-name').value = '';
    document.getElementById('wo-dur').value = '';
    document.getElementById('wo-note').value = '';
    renderWorkout();
  };
  document.getElementById('wo-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('wo-add').click(); });
  const $wm = document.getElementById('wo-weekly-min');
  if ($wm) $wm.addEventListener('change', () => {
    const v = Math.max(0, Math.min(2000, parseInt($wm.value, 10) || 0));
    getWorkoutCfg().weeklyMin = v; $wm.value = v;
    State.persist(); renderWorkoutSidebar();
  });
}

// ════════════════════════════════════════════════════════════════
// ONBOARDING TOUR
// ════════════════════════════════════════════════════════════════
// Onboarding record accessor. Returns the structured onboarding object,
// creating it (and folding in the legacy tourCompleted flag) if an older
// session never ran the schema-6 migration path.
function ensureOnboarding(settings) {
  const s = settings || State.get().settings;
  if (!s.onboarding || typeof s.onboarding !== 'object') {
    s.onboarding = { welcomeSeen: !!s.tourCompleted, hintsSeen: {}, disabled: false };
  }
  if (!s.onboarding.hintsSeen || typeof s.onboarding.hintsSeen !== 'object') s.onboarding.hintsSeen = {};
  return s.onboarding;
}

let welcomeCandidate = null;
let welcomeRequestId = 0;

async function loadWelcomeCandidate() {
  const ov = document.getElementById('welcome');
  if (!ov || ov.classList.contains('hidden')) return;
  const requestId = ++welcomeRequestId;
  const saveButton = document.getElementById('wc-save-first');
  const candidate = document.getElementById('wc-candidate');
  const empty = document.getElementById('wc-empty');
  const error = document.getElementById('wc-error');
  const retry = document.getElementById('wc-retry');
  const candidateTitle = document.getElementById('wc-candidate-title');
  const candidateUrl = document.getElementById('wc-candidate-url');
  const candidateFav = document.getElementById('wc-candidate-fav');

  candidate.classList.remove('hidden');
  candidate.setAttribute('aria-busy', 'true');
  candidateTitle.textContent = tr('welcome.looking');
  candidateUrl.textContent = '';
  candidateFav.src = BLANK_FAV;
  empty.classList.add('hidden');
  error.classList.add('hidden');
  retry.classList.add('hidden');
  saveButton.classList.remove('hidden');
  saveButton.disabled = true;
  welcomeCandidate = null;
  focusFirstIn(ov);

  try {
    const tabs = (await chrome.tabs.query({ currentWindow: true }))
      .filter(tab => tab.url && !isProto(tab.url))
      .sort((a, b) => Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0));
    if (requestId !== welcomeRequestId || ov.classList.contains('hidden')) return;
    welcomeCandidate = tabs[0] || null;
  } catch {
    if (requestId !== welcomeRequestId || ov.classList.contains('hidden')) return;
    candidate.setAttribute('aria-busy', 'false');
    candidate.classList.add('hidden');
    error.classList.remove('hidden');
    retry.classList.remove('hidden');
    saveButton.classList.add('hidden');
    retry.focus();
    return;
  }

  candidate.setAttribute('aria-busy', 'false');
  candidate.classList.toggle('hidden', !welcomeCandidate);
  empty.classList.toggle('hidden', !!welcomeCandidate);
  if (welcomeCandidate) {
    candidateTitle.textContent = welcomeCandidate.title || welcomeCandidate.url;
    candidateUrl.textContent = dispUrl(welcomeCandidate.url);
    candidateFav.src = favUrl(welcomeCandidate.url) || BLANK_FAV;
    saveButton.disabled = false;
    saveButton.focus();
  } else {
    saveButton.classList.add('hidden');
    document.getElementById('wc-explore').focus();
  }
}

async function openWelcome() {
  const ov = document.getElementById('welcome');
  if (!ov) return;
  rememberOpener(ov);
  ov.classList.remove('hidden');
  lockBodyScroll();
  focusFirstIn(ov);
  await loadWelcomeCandidate();
}

function closeWelcome() {
  const ov = document.getElementById('welcome');
  if (!ov) return;
  welcomeRequestId++;
  ov.classList.add('hidden');
  unlockBodyScroll();
  restoreOpener(ov);
  // Mark first-run onboarding as seen no matter how it's dismissed, so it never
  // auto-reappears for a returning user.
  const s = State.get().settings;
  ensureOnboarding(s).welcomeSeen = true;
  s.tourCompleted = true;
  State.persist();
}

function bindWelcome() {
  const ov = document.getElementById('welcome');
  if (!ov) return;
  document.getElementById('wc-explore').onclick = closeWelcome;
  document.getElementById('wc-retry').onclick = loadWelcomeCandidate;
  document.getElementById('wc-save-first').onclick = async () => {
    if (!welcomeCandidate) return;
    const saved = await saveTabToInbox(welcomeCandidate, { closeSource: true });
    if (!saved) return;
    closeWelcome();
    document.getElementById('nav-inbox')?.click();
    setTimeout(() => focusItem(saved.id), 80);
  };
  ov.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeWelcome(); }
    else trapTabKey(e, ov);
  });
}

// ════════════════════════════════════════════════════════════════
// BIND STATIC UI
// ════════════════════════════════════════════════════════════════
function bindStatic() {
  document.getElementById('ws-menu-btn').onclick = event => openWsGrid(event.currentTarget);
  document.getElementById('wsg-close').onclick = closeWsGrid;
  const workspaceGridOverlay = document.getElementById('ws-grid-overlay');
  workspaceGridOverlay.onclick = event => { if (event.target === workspaceGridOverlay) closeWsGrid(); };
  workspaceGridOverlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeWsGrid();
      return;
    }
    if (event.key === 'Tab') trapTabKey(event, workspaceGridOverlay);
    event.stopPropagation();
  });
  document.getElementById('wsg-add').onclick = event => openOrganizationCreate('workspace', {}, event.currentTarget);
  document.getElementById('add-ws-btn').onclick = event => openOrganizationCreate('workspace', {}, event.currentTarget);
  document.getElementById('sidebar-toggle').onclick = () => { State.get().settings.sidebarCollapsed = !State.get().settings.sidebarCollapsed; applySettings(); State.persist(); };
  document.getElementById('add-cat-btn').onclick = event => openOrganizationCreate('space', {}, event.currentTarget);

  // ── Sidebar smart views ──
  document.getElementById('nav-home').onclick = goHome;
  document.getElementById('nav-search').onclick = () => openSearchSurface();
  document.getElementById('nav-all').onclick = () => openLibrarySurface('all');
  document.getElementById('nav-favorites').onclick = () => openLibrarySurface('favorites');
  document.getElementById('nav-read-later').onclick = () => openLibrarySurface('read-later');
  document.getElementById('nav-inbox').onclick = openInboxView;
  document.getElementById('nav-archive').onclick = () => openLibrarySurface('archive');
  document.getElementById('nav-trash').onclick = () => openLibrarySurface('trash');
  document.getElementById('nav-more').onclick = e => openSidebarMoreMenu(e.currentTarget);

  // ── Opened-tabs rail ──
  const railToggle = document.getElementById('tabrail-toggle');
  if (railToggle) railToggle.onclick = () => {
    State.get().settings.railCollapsed = !State.get().settings.railCollapsed;
    applySettings(); State.persist();
  };
  const railSaveAll = document.getElementById('rail-saveall');
  if (railSaveAll) railSaveAll.onclick = saveAllTabs;

  const _debouncedApplyFilter = debounce(applyFilter, 80);
  document.getElementById('tab-filter').oninput = _debouncedApplyFilter;
  document.getElementById('tab-filter').onkeydown = e => { if (e.key === 'Escape') { e.target.value = ''; applyFilter(); e.target.blur(); } };

  // Cycle theme now lives inside the Settings → Appearance theme section, so it
  // reads as part of theme customization rather than a primary dashboard action.
  const themeCycleBtn = document.getElementById('theme-cycle-btn');
  if (themeCycleBtn) themeCycleBtn.onclick = () => {
    cycleTheme();
    // Nudge the animation so the control feels responsive to the cycle.
    themeCycleBtn.classList.remove('spin');
    void themeCycleBtn.offsetWidth;
    themeCycleBtn.classList.add('spin');
  };
  const _drawer = document.getElementById('settings-drawer');
  const _openDrawer = () => { rememberOpener(_drawer); _drawer.classList.remove('hidden'); setSettingsSection(document.querySelector('#drawer-tabs .dt.active')?.dataset.tab || 'general'); renderCaptureSettings(); setTimeout(() => focusFirstIn(_drawer), 50); };
  const _closeDrawer = () => { _drawer.classList.add('hidden'); restoreOpener(_drawer); };
  document.getElementById('settings-btn').onclick = _openDrawer;
  document.getElementById('drawer-x').onclick = _closeDrawer;
  _drawer.onclick = e => { if (e.target.id === 'settings-drawer') _closeDrawer(); };
  _drawer.addEventListener('keydown', e => trapTabKey(e, _drawer));
  // About dialog (opened from the app menu)
  const _about = document.getElementById('about-overlay');
  if (_about) {
    document.getElementById('about-close').onclick = closeAbout;
    _about.onclick = e => { if (e.target.id === 'about-overlay') closeAbout(); };
    _about.addEventListener('keydown', e => trapTabKey(e, _about));
    document.getElementById('about-replay').onclick = () => { closeAbout(); setTimeout(openWelcome, 200); };
  }
  bindOrganizationNameDialog();
  document.getElementById('search-btn').onclick = () => openSearchSurface();
  const topSearch = document.getElementById('topbar-search');
  if (topSearch) topSearch.onclick = () => openCommandPalette();
  document.getElementById('topbar-save').onclick = saveMostRecentOpenTab;
  document.getElementById('undo-btn').onclick = performUndo;

  document.getElementById('search-input').oninput = debounce(applySearchFilter, 90);
  document.getElementById('search-input').onkeydown = e => { if (e.key === 'Escape') toggleSearchBar(false); };

  // Modal
  const identityOverlay = document.getElementById('modal-overlay');
  document.getElementById('modal-x').onclick = () => closeIdentityEditor();
  document.getElementById('modal-cancel').onclick = () => closeIdentityEditor();
  document.getElementById('modal-ok').onclick = () => { void confirmIdentityEditor(); };
  identityOverlay.onclick = e => { if (e.target === identityOverlay) closeIdentityEditor(); };
  identityOverlay.addEventListener('keydown', handleIdentityEditorKeydown);
  document.getElementById('modal-input').oninput = event => {
    if (modalCtx) {
      modalCtx.draftName = event.target.value;
      modalCtx.nameTouched = true;
    }
    clearIdentityEditorError();
  };
  document.getElementById('intent-x').onclick = closeIntentEditor;
  document.getElementById('intent-cancel').onclick = closeIntentEditor;
  document.getElementById('intent-save').onclick = saveIntentEditor;
  document.getElementById('intent-clear').onclick = clearIntentEditor;
  document.getElementById('intent-overlay').onclick = e => { if (e.target.id === 'intent-overlay') closeIntentEditor(); };
  document.getElementById('emoji-trigger').onclick = e => {
    e.stopPropagation();
    openEmojiPicker({ kind: 'identity-editor' }, e.currentTarget);
  };
  document.querySelectorAll('#color-row .csw').forEach(c => {
    c.onclick = () => selectIdentityColor(c.dataset.c, { chosen: true });
  });

  // Emoji picker search
  document.getElementById('ep-search-input').oninput = e => renderEmojiGrid(null, e.target.value);
  document.getElementById('emoji-picker').addEventListener('keydown', handleEmojiPickerKeydown);

  // Settings-page section nav (sidebar). Click switches the pane; Up/Down
  // arrows move between sections without leaving the keyboard.
  document.querySelectorAll('#drawer-tabs .dt').forEach((b, i, all) => {
    b.onclick = () => setSettingsSection(b.dataset.tab);
    b.onkeydown = e => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const next = all[(i + (e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length];
      next.focus();
      setSettingsSection(next.dataset.tab);
    };
  });

  // Settings-page controls that are new with the full-page surface.
  const nameInput = document.getElementById('profile-name-input');
  if (nameInput) {
    nameInput.onchange = () => {
      const s = State.get().settings;
      s.profile = { ...(s.profile || {}), name: nameInput.value.trim() };
      State.persist();
      if (activeHome) renderBoard();
    };
    nameInput.onkeydown = e => { if (e.key === 'Enter') nameInput.blur(); };
  }
  const shortcutsFilter = document.getElementById('shortcuts-filter');
  if (shortcutsFilter) {
    shortcutsFilter.oninput = filterAppShortcuts;
    shortcutsFilter.onkeydown = e => {
      if (e.key === 'Escape' && shortcutsFilter.value) { e.stopPropagation(); shortcutsFilter.value = ''; filterAppShortcuts(); }
    };
  }
  const shortcutsCustomize = document.getElementById('shortcuts-customize');
  if (shortcutsCustomize) shortcutsCustomize.onclick = () => {
    const url = /Edg\//.test(navigator.userAgent) ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts';
    try { chrome.tabs.create({ url }); } catch { toast(`Open ${url} to customize browser shortcuts.`, { duration: 5000 }); }
  };
  const privacyExport = document.getElementById('privacy-export-btn');
  if (privacyExport) privacyExport.onclick = exportJSON;
  const privacyGotoData = document.getElementById('privacy-goto-data');
  if (privacyGotoData) privacyGotoData.onclick = () => setSettingsSection('data');
  const openArchiveBtn = document.getElementById('storage-open-archive');
  if (openArchiveBtn) openArchiveBtn.onclick = () => {
    const d = document.getElementById('settings-drawer');
    d.classList.add('hidden');
    restoreOpener(d);
    openLibrarySurface('archive');
  };

  // Settings controls
  document.querySelectorAll('#seg-language button').forEach(b => b.onclick = () => {
    const next = normalizeLanguage(b.dataset.val);
    State.get().settings.language = next;
    applySettings();
    State.persist();
    toast(tr('toast.language', { language: tr(next === 'zh-TW' ? 'settings.language.zhTW' : 'settings.language.en') }));
  });
  document.querySelectorAll('#seg-size button').forEach(b => b.onclick = () => { State.get().settings.size = b.dataset.val; applySettings(); State.persist(); });
  document.querySelectorAll('#seg-width button').forEach(b => b.onclick = () => { State.get().settings.width = b.dataset.val; applySettings(); State.persist(); });
  document.querySelectorAll('#seg-font button').forEach(b => b.onclick = () => { State.get().settings.font = b.dataset.val; applySettings(); State.persist(); });
  document.getElementById('tog-hibernate').onchange = e => { State.get().settings.hibernate = e.target.checked; State.persist(); };
  document.getElementById('tog-urls').onchange = e => { State.get().settings.showUrls = e.target.checked; applySettings(); State.persist(); };
  document.getElementById('tog-anim').onchange = e => { State.get().settings.animate = e.target.checked; applySettings(); State.persist(); };
  document.getElementById('tog-blur').onchange = e => { State.get().settings.blurPrivacy = e.target.checked; applySettings(); State.persist(); };
  document.getElementById('tog-autoswitch').onchange = e => { State.get().settings.autoSwitchWorkspace = e.target.checked; State.persist(); renderHeader(); };
  const landingToggle = document.getElementById('tog-landing');
  if (landingToggle) landingToggle.onchange = e => {
    State.get().settings.showLanding = e.target.checked;
    State.persist();
  };

  const captureDestination = document.getElementById('capture-destination');
  if (captureDestination) captureDestination.onchange = e => {
    const settings = State.get().settings;
    settings.captureDefaultCategoryId = e.target.value === 'active' ? '' : e.target.value;
    // An explicit default choice should take effect immediately instead of
    // being masked by an older remembered manual target.
    delete settings.captureLastTarget;
    State.persist();
    renderCaptureSettings();
    toast('Capture destination updated');
  };
  const bindCaptureToggle = (id, key, onChange) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.onchange = e => {
      State.get().settings[key] = e.target.checked;
      if (onChange) onChange(e.target.checked);
      State.persist();
      applySettings();
    };
  };
  bindCaptureToggle('tog-capture-ask', 'captureAskEveryTime');
  bindCaptureToggle('tog-capture-remember', 'captureRememberLast', checked => {
    if (!checked) delete State.get().settings.captureLastTarget;
  });
  bindCaptureToggle('tog-capture-close', 'closeTabOnSave');
  bindCaptureToggle('tog-capture-dedupe', 'captureDeduplicate');
  bindCaptureToggle('tog-capture-title', 'captureIncludeTitle');
  bindCaptureToggle('tog-capture-favicon', 'captureIncludeFavicon');

  document.getElementById('export-btn').onclick = exportJSON;
  document.getElementById('import-file').onchange = e => { if (e.target.files[0]) importJSON(e.target.files[0]); };
  document.getElementById('bookmarks-btn').onclick = importBookmarks;

  // Global keys
  document.addEventListener('keydown', e => {
    const recoveryOverlay = document.getElementById('state-recovery-overlay');
    if (recoveryOverlay && !recoveryOverlay.classList.contains('hidden')) {
      if (!recoveryOverlay.contains(e.target)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      // Recovery is the top layer. Keys inside it keep native dialog behavior
      // and must never fall through to the lower reminder or app shortcuts.
      return;
    }
    if (handleReminderGlobalKey(e)) return;
    if (handleEmojiPickerGlobalKey(e)) return;
    if (handleIdentityEditorGlobalKey(e)) return;
    if (handleOrganizationDeleteGlobalKey(e)) return;
    if (handleOrganizationNameGlobalKey(e)) return;
    const tag = document.activeElement?.tagName;
    const editable = document.activeElement?.isContentEditable;
    const inField = tag === 'INPUT' || tag === 'TEXTAREA' || editable;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !e.shiftKey && !inField) { e.preventDefault(); openCommandPalette(); }
    else if (e.key === '/' && !inField && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); openSearchBar(); }
    else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !inField) { e.preventDefault(); performUndo(); }
    else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z' && !inField) { e.preventDefault(); performRedo(); }
    else if (e.key === 's' && !inField) { e.preventDefault(); document.getElementById('tab-filter').focus(); }
    else if (e.key.toLowerCase() === 'c' && !inField && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) { e.preventDefault(); if (activeCalendar) closeCalendar(); else openCalendar(); }
    else if (e.key === '?' && !inField && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openCheatsheet(); }
    else if (e.key === 'Escape') {
      // The reminder picker is nested above saved-item detail. Its own handler
      // normally owns Escape; this fallback covers programmatic focus outside it.
      const reminderOverlay = document.getElementById('reminder-overlay');
      if (reminderOverlay && !reminderOverlay.classList.contains('hidden')) {
        e.preventDefault();
        closeReminderPicker();
        return;
      }
      // Organization deletion is a top-layer decision. Its own key handler
      // normally owns Escape; this fallback also covers programmatic focus.
      const organizationDeleteOverlay = document.getElementById('organization-delete-overlay');
      if (organizationDeleteOverlay && !organizationDeleteOverlay.classList.contains('hidden')) {
        e.preventDefault();
        closeOrganizationDeleteDialog();
        return;
      }
      // The Trash confirmation owns Escape even if focus was moved
      // programmatically outside it. Its own key handler stops normal bubbling;
      // this guard preserves last-opened-first-closed semantics as a fallback.
      const trashDeleteOverlay = document.getElementById('trash-delete-overlay');
      if (trashDeleteOverlay && !trashDeleteOverlay.classList.contains('hidden')) {
        e.preventDefault();
        closeTrashDeleteDialog();
        return;
      }
      // The launch layer is the base overlay. Dismiss it only when nothing is
      // open above it, so Escape from Welcome/Settings never pops two layers.
      const landingLayer = document.getElementById('landing-layer');
      const higherLayerIds = ['state-recovery-overlay','reminder-overlay','cmd-palette','modal-overlay','settings-drawer','ws-grid-overlay','ws-list','emoji-picker','import-overlay','cheatsheet-overlay','quota-overlay','trash-delete-overlay','organization-name-overlay','organization-delete-overlay','welcome','pomo-overlay','fin-overlay','habit-overlay','water-overlay','books-overlay','goals-overlay','workout-overlay','subs-overlay','tools-hub','about-overlay','context-menu'];
      const higherLayerOpen = higherLayerIds.some(id => { const el = document.getElementById(id); return el && !el.classList.contains('hidden'); });
      if (landingLayer && !landingLayer.classList.contains('hidden') && !higherLayerOpen) {
        e.preventDefault(); closeLandingLayer(); return;
      }
      // Snapshot which layered overlays were open *before* we start closing
      // them, so a single Escape only pops the topmost one — not the group page
      // sitting beneath a modal/menu/tool overlay.
      const _escBlockers = ['state-recovery-overlay','reminder-overlay','landing-layer','cmd-palette','modal-overlay','settings-drawer','ws-grid-overlay','ws-list','emoji-picker','import-overlay','cheatsheet-overlay','quota-overlay','trash-delete-overlay','organization-name-overlay','organization-delete-overlay','pomo-overlay','fin-overlay','habit-overlay','water-overlay','books-overlay','goals-overlay','workout-overlay','subs-overlay','tools-hub'];
      const _overlayWasOpen = _escBlockers.some(id => { const el = document.getElementById(id); return el && !el.classList.contains('hidden'); });
      closeCommandPalette();
      toggleSearchBar(false);
      closeModal();
      const _d = document.getElementById('settings-drawer');
      if (!_d.classList.contains('hidden')) { _d.classList.add('hidden'); restoreOpener(_d); }
      closeWsGrid();
      document.getElementById('ws-list').classList.add('hidden');
      document.getElementById('emoji-picker')?.classList.add('hidden');
      // Tool overlays — route through dedicated close fns so scroll-lock,
      // snapshot, and opener-restore semantics stay correct.
      const _toolCloses = [
        ['pomo-overlay',    closePomo],
        ['fin-overlay',     closeFin],
        ['habit-overlay',   closeHabits],
        ['water-overlay',   closeWater],
        ['books-overlay',   closeBooks],
        ['goals-overlay',   closeGoals],
        ['workout-overlay', closeWorkout],
        ['subs-overlay',    closeSubsTracker],
        ['tools-hub',       closeToolsHub],
        ['about-overlay',   closeAbout]
      ];
      for (const [id, fn] of _toolCloses) {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) { fn(); break; }
      }
      const _imp = document.getElementById('import-overlay');
      if (_imp && !_imp.classList.contains('hidden')) closeImportPreview();
      const _cs = document.getElementById('cheatsheet-overlay');
      if (_cs && !_cs.classList.contains('hidden')) closeCheatsheet();
      const _qf = document.getElementById('quota-overlay');
      if (_qf && !_qf.classList.contains('hidden')) closeStorageFull();
      const wcEl = document.getElementById('welcome');
      if (wcEl && !wcEl.classList.contains('hidden')) closeWelcome();
      // The item detail pane sits above the board/group page: Escape pops it
      // first (when it's the topmost surface and the user isn't mid-edit),
      // leaving the surface beneath intact; a second Escape then leaves that.
      if (currentDetailItemId() && !inField && !_overlayWasOpen) {
        closeItemDetail();
      } else if (activeSearch && !inField && !_overlayWasOpen) {
        closeSearchSurface();
      } else if (activeGroupPage && !inField && !_overlayWasOpen) {
        closeGroupPage();
      } else if (activeCalendar && !inField && !_overlayWasOpen) {
        closeCalendar();
      } else if (activeLibraryMode && !inField && !_overlayWasOpen) {
        goHome();
      }
      if (selectedTabIds.size) { selectedTabIds.clear(); lastClickedTabId = null; updateSelectedBadge(); renderOpenTabs(); }
      // clearItemSelection() resets the selection, the sticky mode, the body
      // class, and the button — so it covers an empty-but-active select mode too.
      if (itemSelMode || selectedItemIds.size) clearItemSelection();
      if (document.body.classList.contains('reorder-mode')) {
        document.body.classList.remove('reorder-mode');
        updateModeButtonState();
      }
    }
  });

  bindRtToolbar();
  bindReminderUI();
  bindImportUI();
  bindPasteImportUI();
  bindQuotaOverlay();
  bindTrashDeleteDialog();
  bindOrganizationDeleteDialog();
  bindCheatsheetOverlay();
  bindLandingLayer();
  bindBoardArrowNav();
  bindCatScroll();
  bindSubs();
  bindToolsHub();
  bindPomo();
  bindFin();
  bindHabits();
  bindWater();
  bindBooks();
  bindGoals();
  bindWorkout();

  // View modes + calendar + overflow (⋯) menu (selection / reorder / save all)
  document.getElementById('view-mode-btn').onclick = (e) => openLayoutMenu(e.currentTarget);
  document.getElementById('calendar-btn').onclick = () => { if (activeCalendar) closeCalendar(); else openCalendar(); };
  document.getElementById('more-btn').onclick = (e) => openMoreMenu(e.currentTarget);
  // Topbar app menu (replaces the fake avatar): Settings, Plugins, Theme,
  // Guide, Workspaces, and About. plugins-btn is wired in
  // bindToolsHub() → openToolsHub.
  document.getElementById('menu-btn').onclick = (e) => openAppMenu(e.currentTarget);

  // Apply saved view mode on boot
  setViewMode(getViewMode());

  // Drag auto-scroll
  setupDragAutoScroll();
  setupOpenTabsDropToOpen();

  // Onboarding and every replay use the same focused first-save task.
  bindWelcome();
  if (!ensureOnboarding(State.get().settings).welcomeSeen) {
    setTimeout(() => {
      // An explicit recovery deep link owns first focus. Do not cover the shared
      // item sheet with onboarding, and do not mark onboarding complete merely
      // because a saved item was located from the popup.
      if (!currentDetailItemId()) openWelcome();
    }, 500);
  }
  document.getElementById('show-tour-btn').onclick = () => {
    const drawer = document.getElementById('settings-drawer');
    drawer.classList.add('hidden');
    restoreOpener(drawer);
    setTimeout(openWelcome, 200);
  };
  // Floating tool widgets - pop-out buttons
  ['pomodoro:pomo-popout', 'finance:fin-popout', 'habits:habit-popout', 'water:water-popout', 'goals:goals-popout', 'subs:subs-popout', 'books:books-popout', 'workout:workout-popout']
    .forEach(p => {
      const [tool, btnId] = p.split(':');
      const btn = document.getElementById(btnId);
      if (btn) btn.onclick = () => popOutTool(tool);
    });

  // Restore any floating widgets from previous session
  renderFloatingWidgets();

}

// ════════════════════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════════════════════
init();
