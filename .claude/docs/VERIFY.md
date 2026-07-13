# Locus verification playbook

Run the static checks after every change; run the runtime pass before calling a
slice done. Never claim visual verification that didn't happen.

## Static checks (fast, always)

```bash
for f in newtab.js popup.js background.js suspended.js emoji-data.js; do node --check "$f"; done
git diff --check
```

- **Duplicate ids** after HTML edits — see the runtime snippet below (`dupIds`).
- **i18n coverage**: every `data-i18n`/`data-i18n-title`/`data-i18n-placeholder` key
  used in HTML must exist in `I18N.en` in newtab.js (missing keys render literally):
  ```bash
  grep -oh 'data-i18n[a-z-]*="[^"]*"' newtab.html | sed 's/.*="//;s/"//' | sort -u > /tmp/keys
  # then check each against I18N.en (grep -c "'<key>'" newtab.js)
  ```
- **Branding**: `grep -in "folio" *.js *.html manifest.json` — only theme ids
  (`folio`, `folio-dark`), storage keys, and import compatibility may match.
- **Assets**: every `media/`, `icons/` path referenced in code exists on disk.

## Runtime pass (no Chrome extension load needed)

Extension pages throw on plain http (`chrome.storage` missing). Recipe:

1. Start the static server: preview_start with name `folio-static`
   (`.claude/launch.json`, python http.server on port 8777).
2. Open `http://localhost:8777/newtab.html`.
3. Inject the shim below via `javascript_tool`, then it calls the page's global
   `init()`. Persistence works across reloads (shim saves to localStorage).

```js
(() => {
  const mem = {}; try { Object.assign(mem, JSON.parse(localStorage.getItem('__shim_store') || '{}')); } catch {}
  const save = () => { try { localStorage.setItem('__shim_store', JSON.stringify(mem)); } catch {} };
  chrome.storage = chrome.storage || { local: {
    QUOTA_BYTES: 10485760,
    get: async k => (typeof k === 'string' && mem[k] !== undefined) ? { [k]: mem[k] } : (k == null ? { ...mem } : {}),
    set: async o => { Object.assign(mem, o); save(); },
    getBytesInUse: async () => JSON.stringify(mem).length,
    remove: async k => { delete mem[k]; save(); }
  }, onChanged: { addListener: () => {} } };
  chrome.tabs = chrome.tabs || { query: async () => [], onUpdated:{addListener:()=>{}}, onRemoved:{addListener:()=>{}}, onActivated:{addListener:()=>{}}, onCreated:{addListener:()=>{}}, create: async()=>({}), update: async()=>({}), remove: async()=>{} };
  chrome.windows = chrome.windows || { getCurrent: async () => ({ id: 1 }), onFocusChanged:{addListener:()=>{}}, WINDOW_ID_NONE: -1 };
  chrome.runtime = chrome.runtime || {}; chrome.runtime.getURL = chrome.runtime.getURL || (p => '/' + p);
  chrome.runtime.onMessage = chrome.runtime.onMessage || { addListener: () => {} };
  chrome.runtime.sendMessage = chrome.runtime.sendMessage || (() => {});
  chrome.commands = chrome.commands || {}; chrome.bookmarks = chrome.bookmarks || { getTree: async () => [] };
  return (init(), 'booted');
})()
```

### Checklist per slice

- `read_console_messages` with onlyErrors — must be empty.
- Duplicate-id scan:
  `[...document.querySelectorAll('[id]')].map(e=>e.id).filter((v,i,a)=>a.indexOf(v)!==i)` → `[]`.
- Feature flow end-to-end by dispatching real events (click/keydown/change), then
  assert DOM + `State.get()`.
- Reload the page, re-shim, re-`init()` → changed state survived.
- Dark theme: `State.get().settings.theme='folio-dark'; applySettings()` → computed
  styles sane (no hardcoded light colors).
- zh-TW: click the language seg → new strings translate (no raw keys visible).
- Escape closes the new surface; Tab stays trapped inside overlays.
- Narrow width: `resize_window` to ~800 and check layout via computed styles.

### Environment quirk (autonomous sessions)

Browser-pane **screenshots time out when the pane is hidden** (renderer produces no
frames; `document.visibilityState === "hidden"`). Verify through
`javascript_tool`/`read_page`/computed styles instead, and say in the report that
pixel screenshots weren't possible. A human load-unpacked pass
(chrome://extensions → Developer mode → Load unpacked → repo root) is the final
visual check.
