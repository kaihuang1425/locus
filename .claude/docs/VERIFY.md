# Locus verification playbook

Run the static checks after every change; run the runtime pass before calling a
slice done. Never claim visual verification that didn't happen.

## Static checks (fast, always)

```bash
for f in newtab.js popup.js background.js suspended.js emoji-data.js prepaint.js import-utils.js scripts/*.js; do node --check "$f"; done
node scripts/quality-gates.js
node scripts/import-recovery-test.js
node scripts/archive-scale-contract-test.js
node scripts/export-import-scale-contract-test.js
node scripts/background-contract-test.js
node scripts/undo-contract-test.js
node scripts/state-sync-contract-test.js
node scripts/concurrency-contract-test.js
git diff --check
```

The deterministic suites prove only the contracts they model. They do not promote
a capability to installed-extension runtime verification.

The archive-scale suite extracts the production single-item, whole-group, batch,
Archive-to-Trash, and restore paths. Each archive route exercises 1,024 mixed
top-level items (including stacks with nested records), preserves every entity ID
exactly once, and restores a canonical-equivalent workspace graph. Missing IDs and
foreign entries must remain no-ops. The suite also joins the production batch
Archive and Archive-to-Trash functions to the production State writer,
ordinary-write recovery handler, and storage-error router. An injected typed quota
rejection must keep the 1,024-record local mutation visible behind the reload
interlock, leave the authoritative graph unchanged, route storage-full feedback,
and restore every ID on a reload-style authoritative read. The background suite
separately makes the production writer's `chrome.storage.local.set()` reject for
quota, then requires a typed failure, unchanged stored graph, and visible
notification. This proves deterministic failure routing, not Chrome's real quota
allocation, rendered UI, serialized export files, or installed-extension behavior.

The export/import contract suite extracts the production export serializer, FileReader
boundary, validator, replace/merge applications, migration, and page State client.
It serializes 1,024 mixed top-level active records (1,536 items after counting
stack children) plus 1,024 Archive and 1,024 Trash entries.
The portable payload must omit `_revision`, report exact counts, and survive both
replace and merge with semantic content, canvas/column metadata, restore
destinations, and entity cardinality intact. Replace must first download the exact
portable pre-import graph; merge must rekey every imported identity without
collisions. The same suite exercises one fixture for every supported numeric schema
from 0 through 11, rotates all six accepted app envelopes, and includes the raw
legacy shape. All 26 schema/mode combinations must preserve content and exact
counts, migrate version-gated defaults on replace, keep local profile settings on
merge, and retain collision-free restore destinations. The schema list is explicit
so a future `CURRENT_SCHEMA` bump fails until its fixture is added. A fixed-seed
valid-semantic corpus adds 128 current-schema graphs and 256 replace/merge cases
covering 5,013 entities. Coverage assertions require multiple workspaces, Spaces
without groups, empty groups/Archive/Trash, every item and stored-entry kind,
nested stacks, all five accepted URL families, Unicode and already-safe rich text,
optional item metadata, Archive/Trash, selections, restore references,
canvas/column records, settings, and recent emoji. Exact counts,
identity-independent semantic content, references,
settings boundaries, authoritative persistence, and input immutability must survive
every case. Injected write rejection for current-scale, raw-legacy, and generated
semantic inputs must roll both modes back locally, leave authoritative storage
unchanged, surface recovery, and report no success. This is a fixed-seed
deterministic browser-API model, not evidence for Chrome's DOM-backed rich-text
sanitizer transformations, actual Blob/FileReader/download UI, quota/large-file
boundary, reminder outcomes, service-worker lifecycle, or installed round trips.

The Undo suite includes a deferred tab-reopen interleaving: a newer edit must
survive, remain first in history, and let a capture retry reuse any tab already
reopened instead of creating a duplicate. Two rapid same-context writes must wait
for consecutive revision receipts rather than overlap. While one capture owns a
deferred source-tab close, a second modeled capture must roll back immediately,
send no write, and leave its source open. Capture-failure cases interleave a newer
ordinary edit with set failure, revision conflict, and an accepted write whose
response is lost. Every source stays open; the page re-reads authoritative `te`,
clears stale whole-graph history, and keeps only data storage actually accepted
when no later mutation intervened. If a later ordinary edit or queued successor
exists, it remains visible behind the reload interlock until the test explicitly
recovers; both unsent writes are cancelled. A separate deferred recovery-read case
mutates after the first guard check and proves the adoption-point token check still
preserves that edit. Unknown accepted receipts for Undo and
Redo force authoritative recovery. A newer external revision arriving during
deferred multi-tab Undo interrupts the loop before another tab is opened; a newer
edit during failed Redo is likewise preserved instead of being replaced. A failed
recovery read leaves persistence blocked.

The state-sync suite extracts the production new-tab State store plus its boot
normalizers. It proves zero-write current-schema boot, one-write/idempotent schema,
legacy-theme/onboarding, default, and expired-Trash normalization; clean adoption
of a newer external revision; self `storage.onChanged` observation before the typed
receipt; and dirty-page preservation behind explicit authoritative recovery without
rebasing. It also covers a newer event beating a stale in-flight recovery read,
a higher graph remembered before recovery beating a stale read, a delayed exact
self-event after two receipts, an in-flight ordinary conflict retaining its local
graph, accepted-but-lost and never-settling receipt recovery, invalid fractional/
negative baseline rejection, active-capture deferral, debounce cancellation, and
fail-closed newer-schema handling. It models event ordering and a bounded receipt
timeout; it does not establish Chrome's installed runtime ordering or service-worker
lifecycle. The background suite also rejects malformed client and stored revision
tokens before `storage.set`.

The concurrency suite extracts the production popup client queue, single-tab
capture flow, and service-worker writer. Before the writer matrix it covers two
client-queue cases: ordered successes must send immutable candidates at consecutive
revisions, while a failed first write must invalidate its already-queued successor
without sending it and permit a fresh post-recovery retry. A separate flow defers
and fails the first popup capture, rejects an overlapping capture before another
send, verifies that neither source closes, then confirms that a later successful
retry can close only its own source. The default writer run covers 10 deterministic
Web-Lock/FIFO/conflict/set-failure cases plus 10,000 fixed-seed lockless schedules.
Every accepted mutation token must remain exactly once, rejected/failed tokens must
remain absent, and the stored revision must advance exactly once per accepted
write. Reproduce another schedule with
`node scripts/concurrency-contract-test.js --seed <integer> --runs <n>`; `n` must
be at least 10,000. This proves the modeled FIFO/revision protocol, not MV3
service-worker lifetime, installed message-delivery behavior, or every arbitrary
ordinary edit interleaved with browser-side capture effects.

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

## Shimmed UI pass (no Chrome extension load needed)

This pass is useful for DOM/state interaction work, but it does **not** verify MV3
CSP, extension permissions, service-worker lifecycle, local favicon behavior, or
network silence.

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
  let writeQueue = Promise.resolve();
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
  chrome.runtime.sendMessage = chrome.runtime.sendMessage || (message => {
    if (message?.type === 'reconcile-reminders') return Promise.resolve({ ok: true, reason: 'shim' });
    if (message?.type !== 'locus-state-write') return Promise.resolve();
    const run = writeQueue.then(() => {
      const candidate = JSON.parse(JSON.stringify(message.state));
      const remoteRevision = Number(mem.te?._revision) || 0;
      const localRevision = Number(candidate?._revision) || 0;
      if (remoteRevision !== localRevision) {
        return { ok: false, code: 'LOCUS_STATE_CONFLICT', message: 'Shim state changed before this write.' };
      }
      const revision = localRevision + 1;
      candidate._revision = revision;
      mem.te = candidate; save();
      return { ok: true, revision };
    });
    writeQueue = run.catch(() => undefined);
    return run;
  });
  chrome.commands = chrome.commands || {}; chrome.bookmarks = chrome.bookmarks || { getTree: async () => [] };
  return (init(), 'booted');
})()
```

### Checklist per slice

- Before implementation, write the component contract: entry point, primary
  action, default selection, loading/empty/error states, Escape/focus/keyboard
  behavior, persistence boundary, and narrow-layout behavior. A screenshot is
  visual direction, not a substitute for this interaction contract.
- Compare the rendered surface to its reference at the same viewport, then walk
  the complete primary task. Decorative stand-ins, duplicate entry points, and
  controls without real product data or actions fail the slice even if they look
  close to the reference.
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

## Installed-extension release pass

Before any beta or release claim, load the exact candidate unpacked and record the
artifact/commit, browser version, profile, viewport, console/CSP output, network
log, and result for every P0 core flow. Include new-tab, popup, context menu,
shortcut, save-before-close failure, undo, reload/back/deep links, import replace
and merge, concurrent new-tab/popup/background writes, service-worker restart
during and between state-write messages, overlapping capture and ordinary-edit
interleavings, reminder reconciliation, local favicons, and export recovery. The
current managed-browser limitation is evidence of an unavailable test, not a pass.

### Environment quirk (autonomous sessions)

Browser-pane **screenshots time out when the pane is hidden** (renderer produces no
frames; `document.visibilityState === "hidden"`). Verify through
`javascript_tool`/`read_page`/computed styles instead, and say in the report that
pixel screenshots weren't possible. A human load-unpacked pass
(chrome://extensions → Developer mode → Load unpacked → repo root) is the final
visual check.

Some managed browser surfaces reject `javascript:` shim injection as a security
policy. Do not bypass that policy with another browser backend, raw CDP, or indirect
page execution. In that environment, run a local VM/state harness for feature logic
and a static DOM fixture for computed-style checks, report the full shim/reload pass
as unavailable, and leave the human load-unpacked pass as the final runtime check.
