# Locus status & slice queue

**Living document — update it at the end of every cycle**: move the implemented slice to
"Done", re-rank the queue, add discoveries to "Known issues". Trust but verify: if
this file and the code disagree, the code wins (then fix this file).
Product priorities and evidence language follow
[`docs/PRODUCT_SUCCESS_SYSTEM.md`](../../docs/PRODUCT_SUCCESS_SYSTEM.md). A "Done"
entry records a completed implementation cycle; it does not by itself mean verified,
user-validated, or released.
Last updated: 2026-07-16.

## Queue (highest impact first)

1. **Finish P0 durability and release evidence** — exercise the centralized
   whole-state writer across real new-tab/popup/background contexts, installed
   receiver absence, lost/timed-out acknowledgements, storage-change ordering, and
   service-worker termination/restart;
   add real-browser failure-path evidence for save-before-close; exercise real installed-browser
   Archive/Trash quota persistence and installed-browser export/import round trips at scale; verify actual
   Chrome import quota allocation, File/FileReader and large-file preview behavior,
   and installed legacy/current round trips; and run an unpacked-extension
   CSP/favicon/network audit. Extend reminder contracts to the installed
   restart/sleep and delivery lifecycle, the rendered/installed one-shot Past Due
   and reschedule/clear flow,
   installed group/category mutation delivery under schema-12 stable identities,
   installed alarm timing through DST/date-line transitions, and live time-zone
   changes.
2. **Complete popup recovery coverage and validate installed core activation**
   (`docs/UX_SIMPLIFICATION.md`) — the asked single-tab destination flow now offers
   an explicit, default-off, receipt-gated Open-in-Locus continuation. Define the
   equally bounded consequence for ask-every-time-off quick capture and whole-window
   save without forcing navigation or duplicating the Home recovery surface. Then run the
   installed keyboard/screen-reader, light/dark, en/zh-TW, reduced-motion,
   1280×720/800 px, reload/navigation, and real capture checks. Include the
   Home previews plus the saved-item recovery sheet on Home, board,
   group, All Links, and Read Later routes:
   Open, direct-field saving/saved/error states and write-failure recovery, item
   reminder set/change/clear, stale items, Tab containment, nested Escape, focus
   return, Back/Forward, and reload. Include Archive → Trash →
   permanent deletion in both locales, with cancel, persistence failure, focus
   return, and screen-reader announcement. Then run the
   representative-user activation protocol: save one real tab, see its
   destination, navigate away or reload, then find and reopen it without coaching.
3. **Converge the remaining reminder mutation boundaries** — item-detail Set,
   Change, quick choices, and Clear now use one exact-target service-worker-owned
   state→alarm receipt. Audit non-detail item entries plus Calendar and group/category
   add/edit/remove paths; route each unsafe path through an exact identity, one
   snapshot, one acknowledged state write, and post-write alarm result before UI
   success. Preserve stable schema-12 entity reminder IDs, import compatibility,
   Past due recovery, English/zh-TW, focus, keyboard, and Escape ordering without
   promoting Calendar or entity reminder tools beyond their earned role.
4. **Finish the remaining organization mutation boundaries** — audit contextual
   capture/paste/import-generated Groups plus the remaining direct title/color
   prompt flows; and remove user-visible organization `category` terminology from
   import diagnostics and Explorer. Preserve real state, focus return, Escape
   ordering, and keyboard alternatives without reopening the centralized
   Workspace/Space, existing-Space Group-move, Group/Stack identity, or Duplicate
   Group contracts or
   expanding breadth. Define a separately backed-up migration before attempting to
   repair ambiguous Canvas/capture/restore hints left by the removed legacy direct-
   move path.
   Keep populated workspace/Space deletion unavailable until a later owner-approved
   container recovery and restore-destination contract exists.
5. **Resolve owner launch decisions** — decide the license/business model, investigate
   the Locus name collision before store submission, choose the initial Store
   single-purpose scope (including whether trackers are excluded), and approve only
   claims that have passed the canonical evidence ledger.
6. **Space layout fidelity triage, after the gates above** — Canvas, Explorer,
   Gallery, Graph, Timeline, and the Space Details layout are functional but
   uneven. Keep them under Advanced views until the core loop passes and each
   promoted view earns fresh rendered and user-flow evidence.

## Done (newest first)

- **2026-07-16 — Receipt-gated popup Open-in-Locus continuation** — added an
  explicit, default-off “Open saved item in Locus” / “儲存後在 Locus 開啟項目”
  choice to the single-tab destination picker. The selected action carries only
  primitive Workspace/item/source-tab identity on the same revisioned
  `locus-state-write` request as the saved item. After state acceptance, the service
  worker fresh-reads authority, requires one globally unique active item and one
  unambiguous owning Space still inside the original Workspace, creates its
  existing `/home?item=<id>` route inactive in the source popup window, attempts
  the configured source close, activates the route, and focuses that window. A known
  resolver or route-create failure remains an accepted save, leaves the source
  open, and shows an
  in-section localized partial-success result; source-close or activation trouble
  retains the already-created route and uses a localized browser notice. An
  activation failure also returns that exact route-tab identity, so the popup retry
  switches to the saved item instead of creating a duplicate generic tab; failed
  retries announce in the existing polite status region. Fallback notifications
  carry and reopen that same route-tab identity. Combined close-and-activation
  failure copy retains both outcomes. Rejected
  state creates no route and closes no source. Popup persistence now has the same
  bounded unknown-ack timeout and late missing-receiver retry closure as new-tab;
  every ambiguous transport rejection, including native-coded and non-object
  failures, becomes an unknown acknowledgement, while unknown/protocol/invalidated-
  queue outcomes require reopening before another capture. Pending
  actions own Back, Escape, Ctrl/Cmd+K, and competing controls. A valid Home-detail
  boot is no longer covered by calm Landing or automatic Welcome, without marking
  onboarding seen. The production-extracted popup Locate contract covers state→
  effect ordering, exact/moved/nested identity, stale/duplicate/stored/moved-out
  rejection, URI round-trip, source-window create/focus, create/close/activate and
  combined partial failures, rejected/unknown receipts, exact-tab activation and
  notification retry, retry live status, semantic recovery/focus hooks, en/zh-TW
  parity, and overlay
  suppression. The complete deterministic gate passes, including 10,000 concurrency
  schedules. This is **Implemented: yes; Verified: partial (production-extracted,
  static, and mocked-browser evidence only); User-validated: no; Released: no**.
  Installed popup teardown/message lifetime, real tab effects, pixels, screen-reader
  output, themes/locales, reduced motion, 1280×720/800 px behavior, reload/history,
  and representative-user activation remain unverified. Ask-every-time-off quick
  capture and whole-window save still lack an explicit recovery continuation. No
  schema, import shape, permission, host access, existing stable element ID, local-
  only boundary, or feature breadth changed.
- **2026-07-16 — Receipt-gated item-detail reminder/alarm ordering** — routed
  saved-item detail Set, Change, quick choices, and Clear through
  `commitItemDetailReminderMutation()`. Each action carries the primitive rendered
  item/route context, exhaustively re-resolves one unchanged target, preserves
  imported reminder fields outside the editor's owned schedule/delivery fields,
  takes one localized snapshot, and issues exactly one
  `State.persistNow({ reconcileReminders: true })` request. Missing, duplicated,
  moved, replaced, retyped, or concurrently changed targets fail closed before
  history, mutation, persistence, alarm work, close, or success.

  The central `locus-state-write` protocol now accepts the optional reminder intent.
  The service worker first commits the revisioned candidate, then awaits its
  serialized full alarm reconciliation and returns the structured result in the same
  typed receipt. This removes the page-teardown gap between acknowledgement and a
  second page-owned reconcile message. A known writer rejection runs no alarm pass.
  A timed-out/lost unknown response retains the sole dirty graph behind recovery with
  no page follow-up, picker close, render, or false success; an already accepted
  worker transaction may still have completed its bundled alarm effect. If state is
  accepted but the alarm API reports a
  failure, the accepted reminder remains and the picker closes to a localized
  warning with a direct Undo action.

  A synchronous reminder token joins the item-detail pending boundary before history
  or live mutation. It blocks duplicate actions, picker/detail close, navigation,
  other detail edits, and app-wide shortcuts while keeping Tab contained and usable.
  Recovery remains the top layer; otherwise Escape closes the reminder before the
  detail, and completion returns focus to the rebuilt Set or Change control. The
  picker's polite status sits outside its `aria-busy` body, exposes pending/error
  tokens and invalid-time semantics, and uses English plus native zh-TW copy.

  The production-controller/static item-detail contract covers Set/Change/Clear,
  strict snapshot→write→alarm-result→close/render/focus/feedback order, imported-
  field preservation, duplicate/stale targets, rejected and unknown receipts,
  accepted-state alarm warnings, pending/non-pending keys, recovery precedence,
  focus, live/busy structure, locale parity, and responsive/theme hooks. The
  background mocked-browser contract additionally proves storage acceptance before
  alarm-map access and structured success/failure receipts; the complete
  deterministic suite passes. **Implemented: yes. Verified: partial (deterministic
  production-controller/static-source and mocked-browser evidence only). User-
  validated: no. Released: no.** Installed Chrome message-port/service-worker
  lifetime, real alarm creation/cleanup, teardown/reload/Back/Forward, notification
  scheduling, screen-reader output, light/dark and en/zh-TW pixels, reduced motion,
  1280×720/800 px behavior, and representative-user comprehension remain
  unverified. Non-detail item and group/category reminder mutation entry points are
  queue item #3. No schema, import shape, permission, host access, local-only
  boundary, stable element ID, or feature breadth changed.

- **2026-07-16 — Receipt-gated direct saved-item detail fields** — routed title,
  URL, task state/text, saved context, cover, tags, checklist, and custom fields
  through one `commitItemDetailMutation()` controller. Each rendered sheet captures
  primitive Workspace/Space/Group/Stack/item identity plus exact route, location,
  value, type, ancestry, and object-reference fingerprints. Confirmation
  exhaustively re-resolves one current target across the whole graph. Missing,
  duplicated, moved, replaced, retyped, concurrently changed, or ambiguously owned
  records fail closed before history, mutation, persistence, or render.

  Field logic first runs against a detached JSON candidate, so a synchronous field
  failure leaves the live graph and Undo history untouched. A real change creates
  one snapshot, applies only the candidate diff to the sole dirty local graph, and
  awaits exactly one `State.persistNow()` receipt. The sheet exposes localized
  Saving, Saved, stale, and failure feedback through a polite live status; its body
  is `aria-busy`, and mutation controls are guarded while pending. A synchronous
  pending token blocks a second edit, sheet close, and programmatic or browser
  history changes while Tab remains usable inside the sheet. An initial editor
  Escape may blur and focus the stable panel; later Escape is consumed until the
  receipt settles. A blur-started pagehide transaction owns the one write, so
  teardown does not start a duplicate fallback write.

  Only an acknowledged receipt may render the board/detail sheet, refresh the
  heading, or report success. Rejected and unknown receipts keep the dirty local
  graph behind authoritative recovery with no retry, rollback, lower-surface
  render, or false success. The production-controller/static contract covers the
  deferred receipt, one-snapshot/one-write boundary, accepted/rejected/unknown
  outcomes, existing-recovery refusal, detached-candidate throw, changed-slot and
  imported-data preservation, stale-target matrix, executable pending controls,
  duplicate-edit refusal, pending history/Escape/pagehide behavior, structurally
  separate live/busy regions, localized status, and responsive/theme-token CSS.
  The direct-field wiring
  covers exactly title, URL, task state/text, saved context, cover, tags, checklist,
  and custom fields. **Implemented: yes. Verified: partial (deterministic
  production-controller/static-source evidence only). User-validated: no.
  Released: no.** Installed Chrome persistence/recovery, actual
  Back/Forward/reload/pagehide completion, screen-reader announcements, themes,
  en/zh-TW pixels, reduced motion, 1280×720/800 px behavior, and representative-
  user comprehension remain unverified. Item-detail reminder Set/Change/quick/Clear
  is covered by the newer state→alarm receipt entry above. Stack identity remains
  under the separate acknowledged identity
  editor; Archive and the Open browser effect are also outside this transaction.
  No schema, import shape, permission, host access, local-only boundary, stable
  element ID, or feature breadth changed.

- **2026-07-16 — Home saved-item recovery** — replaced the inert,
  hover-reactive Inbox and recent-Space preview rows with full-width native
  buttons that name the real saved link, note, task, Stack, or fallback item in
  English and native zh-TW. Activation retains only primitive Workspace/origin/
  item identity, then re-resolves exactly one current item across the active graph
  plus one owning Space. Missing, globally duplicated, ambiguously owned, or
  moved-out-of-Workspace records fail closed with localized feedback, no route,
  no history snapshot, and focus left on the invoking row. Items moved within the
  Workspace open from their current real location.

  A successful preview now uses the canonical `/home?item=<id>` route and shared
  item-detail sheet over Home. It does not select the owning Space, initialize or
  render Canvas/another Advanced layout, or turn inspection into a state write.
  Home item routes survive reload and Back/Forward, normalize duplicate or stale
  IDs closed, and keep the prior active Space intact. Opening and closing pass
  `persist: false`; browser history compares only durable route selections before
  writing, so an ephemeral Home sheet open/close remains read-only while a real
  Workspace/Space/layout selection still persists. Escape closes only the sheet.
  Rebuilt focus first targets the exact Inbox/Space preview origin, then a current
  native Home row for an item that moved, then the existing item/heading fallback.
  Hover, focus-visible, and pressed states share the established background,
  outline, theme, forced-color, and reduced-motion system without ornamental
  movement.

  The production-helper/static contract covers native click and Enter/Space
  semantics, `/home?item` build/parse/current/apply/close, global and owning-Space
  identity ambiguity, nested Stacks, stale/moved records, zero-write open/close/
  Back/Forward, durable-selection persistence, active-Space and Canvas isolation,
  exact and moved-row focus, locale parity, and responsive CSS. All 27 JavaScript
  syntax checks, quality gates, and the complete deterministic suite pass,
  including the 10,000-schedule concurrency corpus. **Implemented: yes. Verified:
  partial (production-helper/static-source contracts only). User-validated: no.
  Released: no.** No schema, import shape, permission, host access, local-only
  boundary, or stable element ID changed. Installed Chrome pixels and behavior at
  1280×720/800 px, real Back/Forward/reload, actual screen-reader output, themes,
  en/zh-TW layout, reduced motion, persistence observation, and representative-user
  comprehension remain unverified. Direct-field detail receipt gating is covered
  above; item-detail reminder/alarm ordering is covered by the newer entry above.
  Popup post-save Locate continuation and installed first-use validation are now
  queue item #2.

- **2026-07-16 — Receipt-gated Duplicate Group** — routed Board, Canvas/focused-
  Group, List More, and List context-menu actions through the shared localized
  identity dialog. Opening creates only a review draft, selects its localized copy
  name, preserves an intentionally edited name/symbol/color across source changes,
  and requires a second confirmation when the exact source graph or destination
  Space name changes. Missing, duplicate, moved, or inactive targets fail before
  history; unavailable fields move focus to an enabled exit unless fail-closed
  recovery owns the foreground, and rejected actions recover from detached menu
  openers. English and native zh-TW update untouched generated names live and use
  Group/`群組`, Space/`空間`, Create copy/`建立副本`, browser-neutral recovery copy,
  and wrapping narrow-dialog descriptions.

  Confirmation deep-clones the complete JSON-compatible Group, preserves reminder
  and imported/custom data, and assigns fresh Group/item/Stack IDs recursively from
  one bounded allocator. That allocator reserves active, Archive, Trash, restore,
  capture, size, and Canvas identifiers. The copy is inserted after its source,
  receives detached legacy/current sizing records, and gets a non-overlapping
  Canvas position computed by the production placement helpers from per-Group
  footprints. Null current records fall back to valid legacy widths like the
  renderer, and unsized columns reserve the 60vh cards cap plus column chrome at
  the current viewport height. One localized
  snapshot and one awaited `persistNow()` receipt own the whole mutation; pending
  state keeps a guarded primary focus anchor, while rejection retains the single
  dirty graph behind recovery without retry, render, close, reconciliation, or
  success feedback. Acknowledgement alone renders, closes, focuses the copy,
  exposes exact-action Undo, and requests reminder reconciliation. Focused-Group
  actions route to the copied Group without a second state write, so Back can
  return to the source. Browser history closes an uncommitted draft before applying
  its route; while a receipt or recovery owns the foreground, it preserves the
  reviewed route without another graph write. Recovery is shown and focuses Reload
  in the same rejection turn. Duplicate, Undo, and Redo reconcile alarms only after
  their state receipts; delayed failures expose exact Undo only while that copy is
  still the latest action, otherwise they use generic recovery guidance.

  The production-controller/static contract covers every entry, cancellation,
  stale review, recursive collision streams, custom/reminder preservation,
  partial legacy/current Canvas sizing, delayed/rejected receipts, focused-Group
  routing and history interlock, production Canvas non-overlap, alarm ordering,
  stale-warning suppression, locale changes, recovery focus,
  responsive wrapping, forced colors, and reduced motion; the complete
  deterministic gate passes. **Implemented: yes. Verified: partial (production-
  controller/static-source contracts only). User-validated: no. Released: no.**
  No schema, permission, host access, import shape, local-only boundary, or existing
  stable element ID changed. Installed browser persistence/recovery rendering,
  live alarm creation/cleanup, actual screen-reader output, themes, en/zh-TW
  layout, 1280×720/800 px pixels, reload/Back/Forward, and representative-user
  trust remain unverified. Generated-Group/direct-prompt/terminology residue stays
  in queue item #4.

- **2026-07-16 — Receipt-gated existing-Space Group move** — replaced the Board
  menu's flat, immediate destination mutations with one shared localized action
  across Board, Canvas/focused Group, and both List menus. The existing organization
  dialog now presents a required, scroll-bounded radiogroup with no preselection;
  duplicate names receive deterministic Workspace-order qualifiers, arrow/Home/End
  and Enter/Space only choose a draft, and a separate confirmation remains required.
  The controller captures primitive IDs, re-resolves one active Workspace plus
  unique source Space, destination Space, and Group targets, refuses missing,
  duplicate, moved, same-Space, cross-Workspace, and inactive-Workspace state before
  history, and requires a second confirmation when displayed names, destination
  order, or Group counts change. Concurrent nested content moves as the current
  exact Group object. One localized snapshot covers the source-to-destination
  append, source Canvas-position transfer, exact remembered-capture repair, and
  exact Archive/Trash item restore-reference repair while leaving the active source
  Space, unrelated layout/settings records, and outside selections unchanged. The
  confirm control remains the sole guarded focus anchor while one `persistNow()`
  receipt is pending. Only acknowledgement prunes moved hidden selections, renders,
  closes, scrolls/focuses the destination Space, reports localized success, and
  exposes exact-action Undo; rejection leaves the one dirty graph behind recovery
  with no retry, rollback, render, close, focus claim, or false success. Cancel,
  Close, outside click, and Escape make no write and restore the exact More/toggle
  opener. English and native zh-TW use Space/`空間`, Group/`群組`, Move/`移動`, and
  the shared typography, spacing, 44 px control, radius, elevation, light/dark,
  forced-color, reduced-motion, 32 px gutter, 720 px height, and 520 px wrapping
  system. A production-controller/static contract covers entry convergence,
  keyboard/radiogroup behavior, stale/duplicate/cross-scope guards, exact graph and
  reference mutations, delayed/rejected receipts, selection timing, focus,
  localization, and responsive hooks; the complete deterministic gate passes.
  **Implemented: yes. Verified: partial (production-controller/static-source
  contracts only). User-validated: no. Released: no.** No schema, permission, host
  access, import shape, local-only boundary, or existing stable element ID changed.
  Installed Chrome persistence/recovery rendering, actual screen-reader output,
  themes, en/zh-TW layout, 1280×720/800 px pixels, reload/history, and
  representative-user trust remain unverified. Duplicate Group is covered above;
  generated-Group/direct-prompt/terminology residue remains queue item #4.

- **2026-07-16 — Receipt-gated Group and Stack identity editing** — converged
  explicit Group create/edit on empty Space, Board, List, and focused Group
  surfaces plus Stack create/edit on Board, List, detail, and selected-item batch
  creation on one localized identity dialog. The controller stores primitive IDs,
  re-resolves unique Workspace/Space/Group/item/ancestor targets, permits duplicate
  display names, rejects blank names and ID collisions, preserves imported custom
  or missing symbols/colors and untouched raw names, and requires review after a
  concurrent identity change. Batch creation validates the exact stable-ID
  selection, rejects ancestor/descendant and cross-Space sets, keeps every item in
  place until confirmation, and moves document-order records into the first
  selected item's Group as one transaction. A success takes one localized snapshot
  and waits for one `State.persistNow()` receipt before rendering, closing,
  clearing selection, returning focus to the rebuilt target, or offering exact-
  action Undo. A rejected receipt leaves the dirty graph behind fail-closed
  recovery with no retry, rollback, render, close, or success claim. Group/Stack
  headers now use explicit keyboard controls rather than nested buttons or inline
  editors. The shared symbol picker has localized loading, no-match, and failure
  states; draft selection performs no write; Recent updates only at an owning save
  boundary; outside dismissal, Tab, and Escape return to the correct last-opened
  layer. The color radiogroup supports roving keys and a transient current-custom
  value without normalizing imported data. English and native zh-TW use Group/
  `群組`, Stack/`堆疊`, Add/`新增`, and Save/`儲存`. A production-controller/static
  contract covers entry convergence, exact graph mutations, stale/duplicate/moved
  guards, delayed/rejected receipts, missing/imported identity preservation, batch
  safety, focus/interlock ordering, live localization, and responsive/forced-color/
  reduced-motion hooks; the complete deterministic gate passes. **Implemented:
  yes. Verified: partial (production-controller/static-source contracts only).
  User-validated: no. Released: no.** No schema, stored/import shape, permission,
  host access, privacy boundary, or existing stable element ID changed. Installed
  Chrome persistence/recovery rendering, pixels, screen-reader output, themes,
  en/zh-TW layout, 1280×720/800 px behavior, reload/history, and representative-
  user trust remain unverified. Duplicate Group is covered above; generated-Group,
  remaining prompt, and terminology residue are queue item #4.

- **2026-07-16 — Receipt-gated workspace and Space creation** — routed the top-bar
  and workspace-manager Workspace actions, sidebar, Home defensive empty state,
  and command-palette Space actions through the shared localized naming dialog.
  The Group menu's “New Space…” action now creates the destination and moves the
  exact Group as one operation. The controller stores only primitive parent/source
  IDs, re-resolves them before mutation, permits duplicate names, refuses blank
  names and duplicate IDs, allocates against active/Archive/Trash graphs, and
  requires explicit review if the Group name changes concurrently. A new workspace
  seeds one real empty localized `Pinned`/`釘選` Space; no fake groups or saved items
  are introduced. Create-and-move preserves the Group ID, nested records, Canvas
  position, and remembered capture target. Each success takes one localized
  snapshot and waits for exactly one `State.persistNow()` receipt before render,
  feedback, focus, or exact-action Undo; a rejected or unknown receipt retains the
  dirty graph behind fail-closed recovery without retry or false success. The
  workspace manager now owns dialog semantics, scroll/interlock state, Tab/Escape,
  opener return, asynchronous selected-chip focus, keyboard-visible deletion, and
  height-safe/narrow styling. Context menus contain Tab and consume Escape so they
  close before the manager. Its duplicate browser-window save subsection and the
  old generic-modal/native-prompt creation routes are removed; the canonical Save
  eligible-tabs/window flow remains. English and native zh-TW use Workspace/
  `工作區`, Space/`空間`, and Group/`群組`. A production-controller/static contract
  covers every entry, graph identity, collision/stale guards, delayed/rejected
  receipts, atomic move, exact Undo, stale-name review, focus/keyboard layering,
  locale repaint, and responsive/forced-color CSS; the complete deterministic gate
  passes. **Implemented: yes. Verified: partial (production-controller/static-
  source contracts only). User-validated: no. Released: no.** No schema,
  state/import shape, permission, host access, privacy boundary, or existing stable
  element ID changed. Installed Chrome persistence/recovery rendering, pixels,
  screen-reader output, themes, en/zh-TW layout, 1280×720/800 px behavior,
  reload/history, and representative-user trust remain unverified. Duplicate Group
  is covered above; generated-Group/direct-prompt audits and lower-priority
  terminology/menu residue are queue item #4.

- **2026-07-16 — Receipt-gated workspace and Space renaming** — replaced the two
  reachable workspace and two reachable Space rename implementations with one
  localized, text-only Locus dialog. Workspace chips, workspace-manager cards,
  Home-card menus, and visible sidebar Space menus now pass stable IDs into the
  same controller; the hidden category-tab handlers and conflicting sidebar
  double-click rename are removed. Context menus are keyboard reachable from
  their visible anchors, and rebuilt targets carry stable datasets for verified
  focus return. The controller trims outer whitespace, reports blank names inline,
  treats an unchanged name as a no-op, permits duplicate names, and refuses
  duplicate IDs. It re-resolves the live entity and owning workspace before
  mutation; a concurrent rename refreshes the field for explicit review, while a
  missing or moved target becomes unavailable without a write. Confirmation takes
  one localized snapshot, mutates only `name`, and waits for one
  `State.persistNow()` receipt. Only an acknowledged write renders, reports
  success, and exposes that exact action ID through Undo. Rejection leaves the
  dirty graph behind fail-closed recovery with no retry, rollback, close, render,
  or success claim. Pending state disables draft/secondary actions while retaining
  one guarded `aria-disabled` primary focus anchor, and consumes Escape;
  otherwise Tab stays contained, Enter confirms from the field, Escape closes only
  this layer, outside-target shortcuts are suppressed, and Cancel or success
  restores the opener or a visible equivalent. Independent inert ownership leaves
  recovery authoritative, late-mounted roots inherit the interlock, and rename,
  delete, legacy-modal, and command-palette decisions cannot stack. English and
  native zh-TW use the public Workspace/`工作區` and Space/`空間` vocabulary; locale
  reapplication repaints title, validation, and pending copy without resetting the
  draft. The dialog reuses the shared type, spacing, radius, elevation, focus,
  light/dark, reduced-motion, forced-color, 32 px gutter, height-safe, and narrow-
  action system. A production-controller/static contract covers the four reachable
  paths, stable targeting, validation/concurrency, one-write receipt gating,
  failure recovery, exact Undo, focus, keyboard/interlocks, locale repaint, and
  responsive CSS; the complete static/deterministic gate passes. **Implemented:
  yes. Verified: partial (production-controller/static-source contracts only).
  User-validated: no. Released: no.** No schema, state/import shape, permission,
  host access, privacy boundary, or stable element ID changed. Installed Chrome
  write-failure rendering, pixels, screen-reader output, themes, en/zh-TW layout,
  1280×720/800 px behavior, reload/history, and representative-user trust remain
  unverified. Organization creation and Group/Stack naming are covered above;
  remaining generated/direct-prompt organization residue is queue item #4.

- **2026-07-16 — Empty-only workspace and Space deletion boundary** — routed the
  workspace chip, workspace manager, category tab, Home card, and sidebar Space
  through one localized Locus alert dialog instead of five native confirmations
  and direct state mutations. Before exposing Delete, the controller recursively
  audits groups, stack containers and descendants, plus category/group reminders.
  Any populated organization shows recovery guidance with Close as its only action:
  archive or move every group and remove remaining reminders; nothing is deleted.
  The visible Home-card and sidebar Space menus now reopen the first existing
  reminder through the localized edit/Remove flow instead of blindly adding another,
  so delivered and legacy multiple reminders can be cleared sequentially rather
  than dead-ending that guidance.
  Only empty structural shells may be confirmed, with copy naming the workspace/
  Space structure that changes, what remains unaffected, and the bounded recovery
  instruction to use Undo before that Locus page reloads or closes. It does not
  promise availability through intervening history changes. Last, duplicate, missing,
  and changed targets are refused or repainted; a newly populated target becomes
  blocked instead of honoring stale consent. Cancel/Close is initial focus, the
  independently owned interlock inerts every background root but the fail-closed
  recovery overlay, Tab is contained, Escape owns only this top layer even after
  programmatic focus loss, and global shortcuts plus lazy/programmatic command-
  palette opens cannot escape the decision.
  Context-menu actions preserve a visible opener; success verifies focus on the
  refreshed visible workspace manager or active Space. Locale reapplication repaints
  the live blocked, Space-specific, and pending states. Empty-shell confirmation
  disables both actions, announces pending state, and waits for `State.persistNow()`; only its
  receipt renders, reports success, and exposes the exact localized snapshot label
  through Undo. Rejection stays behind fail-closed recovery with no success,
  unlock, or durable render. Group menus now expose Archive only, removing the
  duplicate Delete alias, and the obsolete group-delete confirmation toggle is gone
  while its stored field remains inert for schema/import compatibility. English and
  native zh-TW copy share the existing modal, destructive, theme, narrow-width,
  focus, and reduced-motion system. Paired production-controller/static contracts
  cover occupancy, populated blocking, empty-only deletion, stale refresh, guards,
  cancel, pending/failure/success, Undo receipt, inertness, visible focus, Tab,
  Escape/shortcut containment, lazy palette interlock, live locale repaint, five
  entry points, and centralized mutation; the complete static/
  deterministic gate passes. **Implemented: yes. Verified: partial (production-
  controller/static-source contracts only). User-validated: no. Released: no.** No
  schema, permission, host access, state/import shape, archive format, or advanced
  surface changed. Installed pixels, real Chrome write-failure rendering, screen-
  reader output, themes, en/zh-TW layout, 1280×720/800 px behavior, the reload/close
  Undo boundary, and representative-user trust remain open.

- **2026-07-16 — Archive-first destructive recovery / P0-09** — removed the
  active saved-item “Delete permanently” bypass, leaving Archive as the single
  recoverable removal action before Archive → Trash. Trash single-row and batch
  deletion now converge on one localized Locus alert dialog that names the exact
  item or count, states what remains unchanged, and makes irreversibility explicit.
  Cancel is the safe initial focus; Tab stays contained; Escape consumes only this
  top layer; cancellation and stale entries are no-ops; and focus returns to the
  opener or the rebuilt Trash search. Confirm disables both actions, announces a
  busy state, and writes immediately through the central State writer. Only an
  acknowledged receipt clears in-memory Undo/Redo, rebuilds the surface/counts,
  and shows success; rejection uses the existing fail-closed recovery overlay
  without a success toast or durable render. The production-controller/static
  contract covers single/batch scope, duplicate/stale inputs, cancellation,
  pending/success/failure, focus, Tab, Escape, locale copy, modal/narrow/destructive
  styling, unique IDs, and absence of the active-item bypass; the complete
  static/deterministic gate passes. **Implemented: yes. Verified: partial
  (production-controller/static-source contracts only). User-validated: no.
  Released: no.** No schema, permission, host access, import shape, retention
  policy, or advanced surface changed. Installed pixels, screen-reader output,
  real Chrome persistence-failure rendering, 1280×720/800 px behavior, themes,
  locales, and representative-user trust remain open.

- **2026-07-16 — Saved-item recovery sheet** — replaced the former non-blocking
  item inspector with one route-backed modal recovery sheet across board, group,
  All Links/Favorites, and Read Later. Board and Library routes retain
  `?item=<id>`; group routes retain `/item/<id>`, so close stays on the source
  surface and Back/Forward/reload have a canonical state. Routed ids must still
  belong to that workspace/category/group or Library filter; moved and stale items
  normalize closed instead of borrowing the wrong context. The sheet names the real
  item and Space/group, gives saved links a primary Open action, and puts save
  context, Reminder, and Tags before progressive cover/checklist/custom-field
  metadata. It inerts the app background with independent detail/reminder/recovery
  owners, traps Tab from the focused dialog, applies two-step editor Escape, and
  flushes an active editor before route or page teardown. Page teardown replaces
  any focused editor and replaces the edit debounce with an immediate write
  attempt even when that editor already blurred; a late-mounted detail
  root inherits recovery/reminder owners that are already active. Nested layers
  retain precedence, and close restores the connected opener, same item, or board heading.
  Stale routes clear the sheet and only their owned inertness. All detail and
  reminder-dialog copy and control names exist in English and native zh-TW; narrow
  reflow and reduced-motion rules are retained. A new
  production-extracted/static contract covers routing, modal semantics, hierarchy,
  surface validation, immediate pagehide-write wiring, stacked and late-mounted
  inert ownership, focus/Escape
  behavior, locale parity, and responsive-motion
  source rules, and the complete static/deterministic gate passes. **Implemented:
  yes. Verified: partial (production-helper and static-source contracts only).
  User-validated: no. Released: no.** No schema, item shape, permission, import,
  host-access, or local-only boundary changed. Browser policy blocked the shim and
  installed integration is unavailable, so installed editing/persistence recovery,
  stale-item rendering, screen-reader output, themes, locale pixels, 1280×720/
  800 px pixels, browser history/reload, and representative-user recovery remain
  open.

- **2026-07-16 — Canonical save-first welcome / P0-12** — removed the hidden
  six-step preference questionnaire, unreachable spotlight tour, Calendar coach
  mark, tip toggle/reset controls, duplicate Reset onboarding menu action, native
  confirmation, hardcoded coach copy, and their CSS/Escape-stack residue. First run,
  Settings replay, app-menu Guide, and About replay now converge on one localized
  save-first dialog. Its controller exposes immediate focus plus distinct loading,
  eligible-tab, no-eligible-tab, query-error/retry, failed-save, and successful
  Inbox-handoff states; Escape stops before lower surfaces and restores the opener,
  including the Settings replay path. The new production-controller contract covers
  loading, newest eligible candidate selection, acknowledged close intent, empty,
  error/retry, failed persistence, Tab containment, Escape, opener return, Inbox
  navigation, saved-item focus, en/zh-TW copy, narrow/reduced-motion rules, unique
  active IDs, and absence of every removed path. The complete static/deterministic
  gate passes. **Implemented: yes. Verified: partial (production-controller and
  static-source contracts only). User-validated: no. Released: no.** No schema,
  permission, storage shape, import compatibility, capture writer, or advanced
  surface changed. The in-app browser loaded the unshimmed static DOM with no
  duplicate IDs or captured console errors, but browser policy blocked the shim and
  a static-state fixture; Chrome integration lacks its native bridge/profile.
  Installed tab capture/closure, pixels, screen-reader output, themes, locale layout,
  1280×720/800 px behavior, reload/history, and representative-user activation
  therefore remain open.

- **2026-07-16 -- Missing state-write receiver recovery / P0-04** -- new-tab and
  popup writers now retry only the exact `Receiving end does not exist` rejection,
  resending the same immutable candidate for at most three total attempts. A
  persistent absence leaves authoritative storage and local revision unchanged,
  returns `LOCUS_STATE_RECEIVER_UNAVAILABLE`, blocks queued new-tab edits behind
  recovery, and identifies the background service instead of reporting generic
  storage failure. A receipt timeout now closes the retry lifecycle, preventing a
  delayed no-receiver rejection from launching abandoned sends. For this typed
  failure only, the recovery button restarts the extension runtime so a stale
  unpacked service worker can be replaced; unsupported runtime reload falls back to
  the existing page reload, while conflicts and unknown outcomes remain page-only.
  Closed ports, lost responses, timeouts, conflicts, and other transport failures
  remain single-shot because their commit outcome may be unknown. Production-
  extracted contracts cover transient, persistent, and post-timeout receiver
  absence, both page clients, a channel closing after acceptance, the scoped runtime-
  restart action, and its fallback; the full static/deterministic gate passes.
  **Implemented: yes. Verified: partial (production-extracted deterministic message-
  failure and recovery-action contracts only). User-validated: no. Released: no.**
  No schema, permission, markup, style, or localized dictionaries changed. The
  supplied installed-Edge screenshot proves the pre-fix failure only; browser policy
  blocked inspection of the privileged `edge://newtab/` page, so post-fix installed
  service-worker wake/restart behavior and rendered recovery remain open.

- **2026-07-16 -- Local-calendar recurrence across time zones / P0-10** --
  daily, weekly, and monthly reminders now advance nominal local-calendar dates
  instead of carrying elapsed-millisecond or normalized `Date` drift. Their local
  wall time stays fixed across 23- and 25-hour days. A nonexistent spring-forward
  time, deleted civil date, or missing month-day is skipped to the next scheduled
  valid occurrence; a repeated fall-back wall time resolves to its first instant
  once; and malformed bounds fail closed. Service-worker reconciliation/alarm
  matching and new-tab pending projection use the same rule without mutating the
  stored recurrence. A production-extracted contract runs fresh processes in New
  York, Berlin, Taipei, and Apia: 21 recurrence cases, 37 background/display parity
  checks, two accepted first-fold alarms, two rejected second-fold alarms, four
  notified-alarm rejections, and 16 malformed-input cases pass with the complete
  static/deterministic gate. **Implemented: yes. Verified: partial (multi-process,
  production-extracted deterministic time-zone contracts only). User-validated:
  no. Released: no.** No schema, permission, markup, style, or localized copy
  changed. The managed-browser shim remains unavailable; installed Chrome alarm
  timing through sleep/restart and time-zone transitions, live operating-system
  time-zone changes, notification delivery, and rendered Past Due behavior remain
  open.

- **2026-07-16 -- Pending-reminder and one-shot Past Due policy / P0-10** --
  new-tab pending surfaces now exclude delivered (`notified`) records instead of
  counting or rendering them as active. An unresolved overdue one-shot retains its
  stored timestamp and remains in the Calendar Past due path with the existing
  open, reschedule/drag, clear, and remove actions. Because background restart
  recovery intentionally re-arms recurrence without writing state, a missed active
  daily/weekly/monthly series is now projected in badges, counters, editors, and
  Calendar at the same first future local-calendar occurrence used by the service
  worker; an expired series remains Past due. Projection is read-only, re-sorts by
  displayed occurrence, and preserves stable reminder IDs plus entity array indexes.
  The production-extracted DOM-free contract covers six pending cases, two resolved
  omissions, three recurrence-parity projections, two editor paths, Calendar
  enrichment, item badges, and five production wiring points; adjacent background
  and reminder-identity suites plus the complete static/deterministic gate are green.
  **Implemented: yes. Verified: partial
  (production-extracted deterministic state/display contracts only).
  User-validated: no. Released: no.** No schema, permission, markup, style, or
  localized copy changed. The managed-browser shim remains unavailable, so actual
  rendered Past Due interactions, installed restart/sleep/notification timing,
  mutation races, and DST/timezone behavior remain open.

- **2026-07-16 -- Stable group/category reminder identity / P0-10 + P0-08** --
  schema 12 adds a persistent ID to every active category/group reminder and to
  group reminders held in Archive or Trash. Migration repairs missing, invalid, or
  duplicate IDs; replace covers every numeric schema from 0 through 12, while merge
  repairs an older cloned payload even when the receiving graph is already current.
  Current-schema import rejects missing/duplicate reminder IDs. New alarms use the
  distinct `te-greminder2-` / `te-creminder2-` namespaces with encoded entity and
  reminder IDs; delivery resolves exactly one reminder by ID, so removing, inserting,
  or reordering a neighbor cannot retarget the event. Schema-11 index alarms remain
  usable until migration is authoritative and are then reconciled away. Already-
  notified, duplicate, removed, and same-index/same-time replacement events fail
  closed. The production-extracted contracts cover four new-tab mutations, three
  encoded/legacy name round trips, schemas 0–12 through 28 replace/merge cases,
  eight accepted background deliveries, five stale/malformed no-ops, and two explicit
  identity-mutation paths; the complete static/deterministic gate passes.
  **Implemented: yes. Verified: partial (production-extracted mocked-browser/state
  contracts only). User-validated: no. Released: no.** No permission, markup, style,
  or rendered copy changed. The documented shim remains unavailable in this managed
  browser, and installed restart/sleep/delivery, notification rendering, mutation
  races, one-shot Past Due policy, and DST/timezone behavior remain open.

- **2026-07-16 -- Fired reminder persistence and stale-alarm rejection / P0-10** --
  alarm delivery now verifies that `scheduledTime` still belongs to the current
  reminder before any side effect, so removed or rescheduled alarms cannot notify,
  write, or re-arm stale data. Item, nested-item, group, and category notifications
  are awaited before mutation; accepted deliveries advance through the central
  revisioned writer and then run full alarm reconciliation under the same stable
  alarm name. One-shots and the last occurrence allowed by `until` persist as
  notified without re-arming. If notification creation fails, state stays untouched;
  a rejected state write is not retried, leaves authority unchanged, and rebuilds a
  consumed recurring alarm from an authoritative read; quota uses the existing
  warning and other write failures add an update warning. A post-write
  reconciliation failure keeps the accepted next occurrence and adds a scheduling
  warning that opens Locus. The production-extracted contract covers six
  deliveries, two stale/removed alarms, and four failure paths,
  and the complete static/deterministic block passes. **Implemented: yes. Verified:
  partial (clock-controlled mocked-browser delivery only). User-validated: no.
  Released: no.** No schema, permission, or extension-page UI changed. Installed
  notification/delivery timing, service-worker termination, rendered one-shot Past
  Due behavior, group/category index-mutation races, and DST/timezone behavior remain
  open.

- **2026-07-16 -- Recurring reminder restart recovery / P0-10** -- reminder
  reconciliation now re-arms an overdue recurring item, nested item, group, or
  category reminder at its first future wall-clock occurrence. It skips missed
  occurrences without emitting catch-up notifications or mutating persisted state;
  overdue one-shots remain unscheduled for the in-app Past Due path, and recurrences
  beyond `until` remain expired. The production-extracted background contract starts
  with nine exact alarms, advances its clock eight days through the real startup
  listener, clears four newly stale one-shots, and retains five alarms by re-arming
  four daily/multi-day/biweekly/monthly series plus the subscription. Repeating the
  reconciliation is idempotent, preserves unrelated alarms, and injected create and
  clear failures return two structured operations without a false success, state
  write, mutation, or notification. The complete static/deterministic block passes.
  **Implemented: yes. Verified: partial (clock-controlled mocked-browser lifecycle
  only). User-validated: no. Released: no.** No schema, permission, or UI behavior
  changed. Actual installed-Chrome restart/sleep/delivery, fired-series persistence,
  the rendered one-shot Past Due policy, and DST/timezone behavior remain open.

- **2026-07-16 -- Import byte-limit and quota-sized rollback evidence / P0-05 +
  P0-08** -- extended the production-extracted export/import suite with four
  exact-byte large-file cases. A valid 20,971,520-byte backup, allocated from
  per-string chunks within the production validator limit, crosses FileReader,
  JSON parsing, normalization, and validation to reach one preview without
  mutating local or authoritative state. The same valid JSON plus one trailing
  byte is rejected before FileReader with visible size feedback and zero preview
  or write. A valid 10,551,296-byte file whose parsed graph remains above the
  10 MiB fallback storage quota reaches preview in replace and merge; one injected
  typed quota rejection then causes exactly one write attempt, local rollback,
  unchanged authority, recovery guidance, no reminder reconciliation, and no
  false success. Replace alone creates its safety backup. The full suite now has
  eight rejected-write cases, and the complete static/deterministic block passes.
  **Implemented: yes. Verified: partial (exact-byte deterministic browser-API
  model only). User-validated: no. Released: no.** No production, schema,
  permission, or UI behavior changed. Actual Chrome File/FileReader and preview
  behavior, real quota allocation, DOM-backed sanitization, alarm outcomes, and
  installed-browser round trips remain open.

- **2026-07-16 — Valid semantic import fuzz evidence / P0-05 + P0-08** —
  added a `0x51a7e5` fixed-seed corpus of 128 valid current-schema graphs spanning
  5,013 entities and 256 replace/merge cases. Coverage assertions require multiple
  workspaces, Spaces with no groups, empty groups/Archive/Trash, all item and stored
  entry kinds, nested stacks, every accepted URL family, Unicode and already-safe
  rich text, optional item metadata, active selections, restore references,
  canvas/column records, settings, and recent emoji. Every case crosses the
  production FileReader parser, validator, graph transforms, migration, and State
  writer with exact counts, identity-independent semantic equality, unique IDs,
  correctly remapped references/layout keys, replace-only imported settings, one
  authoritative write, and immutable parsed input. Two added generated-graph write
  rejections bring the suite total to six and preserve local rollback, unchanged
  authority, visible recovery, and no false success. The full static/deterministic
  block passes. **Implemented: yes. Verified: partial (fixed-seed deterministic
  browser-API model only). User-validated: no. Released: no.** No production,
  schema, permission, or UI behavior changed. Actual Chrome file/preview behavior,
  DOM-backed sanitizer transformations, quota/large-file limits, alarm outcomes,
  and installed-browser round trips remain open.
- **2026-07-16 — Numeric-schema import fixture matrix evidence / P0-05 +
  P0-08** — extended the production-extracted export/import contract through every
  supported numeric schema from 0 through 11, all six accepted app envelopes, and
  the raw legacy shape. Twenty-six schema/mode cases cross FileReader parsing,
  legacy normalization, validation, replace or merge, migration, and the page State
  writer. They preserve semantic records, exact counts, unique identities, stored
  restore destinations, schema-4/5 item fields, and schema-6–11 defaults. Replace
  reaches schema 11 and clears nonportable selected-tab IDs; merge rekeys without
  importing profile settings. Four injected write rejections cover current and raw
  legacy inputs in both modes, with local rollback, unchanged authority, visible
  recovery, and no success report. The full static/deterministic block passes.
  **Implemented: yes. Verified: partial (deterministic browser-API model only).
  User-validated: no. Released: no.** No production, schema, permission, or UI
  behavior changed. Semantic fuzz, actual Chrome files/previews, quota/large-file
  behavior, alarm outcomes, and installed-browser legacy/current round trips remain
  open.
- **2026-07-16 — Serialized export/import scale evidence / P0-08 + P0-09** — added
  a production-extracted deterministic suite spanning `exportJSON()`, the
  FileReader/JSON/validator boundary, current-schema migration, replace and merge
  application, and the page State writer. A 1,488,148-byte payload carries 1,024
  mixed top-level active records (1,536 items including stack children), 1,024
  Archive entries, and 1,024 Trash entries with exact counts and no portable
  `_revision`. Replace and merge preserve semantic content,
  entity cardinality, canvas/column metadata, and restore destinations; merge
  rekeys without collisions, while replace first downloads the exact portable
  current graph.
  Injected write rejection rolls both modes back, leaves authoritative storage
  unchanged, surfaces recovery, and reports no success. The suite is wired into
  `VERIFY.md`, both overnight command copies, and CI; the full static/deterministic
  block passes. **Implemented: yes. Verified: partial (deterministic browser-API
  model only). User-validated: no. Released: no.** No production, schema,
  permission, or UI behavior changed. Actual Chrome Blob/FileReader/download and
  preview behavior, real quota/large-file limits, complete legacy-schema coverage,
  and installed-browser round trips remain open.
- **2026-07-16 — Archive/Trash quota-recovery evidence / P0-09** — joined the
  production batch Archive and Archive-to-Trash mutations to the production
  new-tab State writer, ordinary-write failure handler, and storage-error router.
  Injected typed quota rejections at 1,024 mixed records leave the authoritative
  active or Archive graph unchanged, retain the optimistic local graph behind the
  reload interlock, route to storage-full feedback, and recover every entity ID
  exactly once on a reload-style authoritative read. The background contract also
  makes the production writer's `chrome.storage.local.set()` throw a quota error;
  it returns a typed failure, preserves the stored revision and graph, and emits a
  storage-full notification. The full static/deterministic block passes.
  **Implemented: yes. Verified: partial (injected deterministic quota model only).
  User-validated: no. Released: no.** No production, schema, permission, or UI
  behavior changed. A real Chrome quota boundary, rendered feedback, serialized
  export/import, and installed-browser lifecycle evidence remain open.
- **2026-07-16 — Archive/Trash 1,024-record scale evidence / P0-09** — added a
  production-extracted contract for single-item, whole-group, and batch archive,
  Archive-to-Trash, and both restore paths. Each archive route preserves 1,024
  mixed top-level records—including stacks with nested records—with every entity
  ID present exactly once. Single-item and whole-group restore, plus the batch
  Archive → Trash → restore flow, reproduce a canonical-equivalent workspace
  graph. Missing IDs and foreign entries remain no-ops without a persistence
  attempt. The contract is now part of `VERIFY.md`, both overnight command copies,
  and CI; the full static/deterministic block passes. **Implemented: yes. Verified:
  partial (static/deterministic model only). User-validated: no. Released: no.**
  No production, schema, permission, or UI behavior changed. Real
  `chrome.storage.local` quota pressure, serialized export/import round trips, and
  installed-browser UI/runtime evidence remain open.
- **2026-07-16 — Import-validator malformed/fuzz evidence / P0-08** — expanded
  `scripts/import-recovery-test.js` to extract the production
  `validateImportData()` boundary from `newtab.js`. A representative current-schema
  backup is accepted without mutation; 29 explicit malformed boundaries cover
  future schemas, invalid root/collection shapes, unsafe object keys, size/depth/
  node limits, active and stored-payload ID failures, item/stack structure, URL
  schemes, and corrupt Archive/Trash envelopes. A fixed-seed corpus adds 128
  mutations across eight structural families, all rejected with a non-empty error.
  The full static/deterministic block passes, including the 10,000-schedule writer
  run. **Implemented: yes. Verified: partial (static/deterministic model only).
  User-validated: no. Released: no.** No production, schema, permission, or UI
  behavior changed. Complete legacy-schema compatibility, semantic fuzz, quota,
  large-file, safety-backup/alarm, and installed-browser round trips remain open.
- **2026-07-16 — New-tab state freshness and authoritative recovery / P0-04** —
  added a confirmed-state baseline and dirty-aware `storage.onChanged` contract.
  A clean, idle page adopts and renders a newer stored revision; a dirty page
  never rebases or auto-replaces its whole graph and remains visible behind a
  localized reload interlock, as does an active async/capture operation.
  Expected self-write events are matched without treating them as the typed
  persistence receipt. Every failed new-tab capture drains invalidated queued
  writes and leaves source tabs open. With no later local mutation it re-reads
  `te`; if an ordinary edit or queued successor intervened, that graph remains
  visible behind the reload interlock until explicit recovery. Clean current-schema
  boots send no write, while real
  migration/default/Trash/deep-link normalization still coalesces into one.
  Production-extracted freshness contracts cover clean adoption, self-event/
  receipt ordering (including delayed earlier self-events), dirty and in-flight
  ordinary-write preservation, a remembered newer graph beating a stale recovery
  read, an edit arriving during capture recovery blocking adoption, lost and timed-out
  receipts, malformed revision blocking, active-capture deferral, newer-schema
  blocking, legacy-theme/onboarding normalization, and
  idempotent boot normalization. The
  Undo suite adds queued-successor invalidation, set-failure, conflict, lost-receipt,
  mid-Undo external revision, and ordinary-edit interleavings. **Implemented: yes. Verified:
  partial (static/deterministic model only). User-validated: no. Released: no.**
  Installed multi-context event ordering, service-worker restart, quota, and
  browser-side recovery UI remain open.
- **2026-07-15 — Central serialized state writer / P0-04 lockless safety** —
  moved the only whole-state `te` write into the service worker. New-tab and popup
  mutations now use typed `locus-state-write` requests, immutable call-time
  candidates, failure epochs that cancel already-queued successors, and revision
  receipts; all background and message writes pass through one FIFO, with the
  shared Web Lock retained when available. Popup capture flows hold one mutex
  through persistence and browser-side effects; new-tab rejects and rolls back a
  second modeled capture while the first is pending. Production-extracted client
  contracts cover two queue order/failure cases and one first-write-failure plus
  overlapping-capture/no-close flow. The writer contract covers 10 deterministic
  lock/lockless/conflict/failure cases and 10,000 fixed-seed lockless schedules
  (69,880 attempts; 19,947 accepted, 49,379 rejected, 554 injected failures) with
  zero lost accepted mutation tokens; an alternate seed also passes. The Undo
  contract covers new-tab overlap/no-second-write and an accepted write whose
  receipt is lost. **Implemented: yes. Verified: partial (static/deterministic
  model only). User-validated: no. Released: no.** Installed multi-context/service-
  worker lifecycle and installed stale-open-page/recovery evidence remain open;
  the later freshness cycle above closes the deterministic ordinary-edit case.
- **2026-07-15 — Unreleased product-success, safety, and first-use remediation** —
  added the canonical Product Success System and reconciled strategy authority;
  moved prepaint code into a packaged script, tightened CSP, switched favicon
  rendering to Chromium's local endpoint, and hardened rich-content/readme handling.
  Capture paths now persist before closing source tabs; whole-state writes gained
  a revision conflict guard (the newer central-writer cycle above now owns their
  serialization); silent archive caps are removed; alarm
  reconciliation runs at service-worker lifecycle and after import; and import has
  recursive size, depth, type, ID, URL, and rich-text checks. The current worktree
  also introduces the single-task save-first welcome, direct handoff, reduced core
  navigation, one primary top-bar action, collapsed opened-tabs rail, and static
  quality gates. This is **implemented but unreleased and only partially verified**:
  deterministic import-recovery, background-service-worker, and Undo contract suites now
  cover graph collisions, legacy normalization, alarm reconciliation, stale-alarm
  cleanup, visible no-retry capture conflicts, stale/pending Undo actions,
  newer-edit interruption, restored history order, and duplicate-free closed-tab
  retries. The explicit Save choice, durable Library routes,
  action-scoped Undo, truthful partial-close feedback, newest-Inbox Home preview,
  and three-zone Home are implemented. Actual extension-runtime, scale/quota,
  clock/DST, accessibility, and representative-user evidence remain open;
  randomized writer evidence is recorded in the newer cycle above.
- **2026-07-13 — System empty-state fidelity review** — replaced the scattered
  zero/no-match placeholders with one responsive, localized contract modeled on
  `locus_system_empty_state_each_page.png`. Home, empty Spaces and Inbox/groups,
  Search, All Links, Favorites, Read Later, Archive, and Trash now use calm
  surface-specific copy, a restrained illustration, and no more than two real
  recovery actions wired to existing create, capture, import, navigation, and
  filter-reset paths. Empty Read Later no longer stacks duplicate shells; filtered
  Archive/Trash states restore rows and focus; action focus survives palette
  dismissal. Rendered checks covered zero and no-match variants, real note creation
  and Archive→Trash recovery, keyboard focus, light/dark, reduced motion, en/zh-TW,
  duplicate-state/ID checks, and console errors. No schema or permission changes.
- **2026-07-13 — Search + command palette corrective UX pass** — the dedicated
  Search route now owns its query field instead of competing with the global
  command trigger; its first visible result and detail always agree, Arrow Down
  advances from that result, and loading/error/no-result states no longer leave a
  misleading detail column behind. Filters now expose real tag choices with
  counts and reload-safe URLs; notes use a concise title/snippet; selected details
  contain only stored metadata, notes, tags, actions, and related local results.
  The command palette has one canonical Search command, keeps Recent visible at a
  1280×720 laptop viewport, scrolls each column independently, and restores focus
  after Escape. Rendered checks covered query/tag/related-result/reload flows,
  keyboard navigation, light/dark, en/zh-TW, duplicate IDs, and console errors.
- **2026-07-13 — Search surface fidelity review** — promoted the old in-board
  filter into a reload-safe `/search` route modeled on `search_prototype.png`.
  It searches real links, notes, tasks, stacks, and nested stack contents across
  the active workspace; the existing text, quoted phrase, type/state/domain/url,
  Space, tag, color, and negation vocabulary now powers the launch layer,
  command palette, and dedicated page through one data-level matcher. The page
  adds live type counts, real Space/time/tag filters, best/newest sorting,
  selected-result detail, external open plus existing item-detail handoff,
  favorite mutation, loading/empty/error states, keyboard selection, Escape,
  reload/back-forward persistence, 800px layout, light/dark themes, reduced
  motion, and en + zh-TW. Files/images/tweets, AI search/auto-sort, remote content
  previews, and premium upgrade concepts from the mock were intentionally omitted
  because Locus stores no page/file content and remains within the local,
  no-account research-alpha scope.
- **2026-07-13 — Command palette fidelity review** — rebuilt the local command
  palette around `locus_command_popup.png`: a preview-aligned two-column home
  groups Quick actions, Go to, live recently saved links, and Shortcuts, while
  query mode fuzzily searches commands plus the user's real saved links and hands
  complex/operator queries to the existing board search. Save tab, create note,
  save window, import bookmarks, navigation, settings, theme, and sidebar actions
  all call existing state/browser paths; workspace, Space, group, layout, and
  settings-section commands are generated from live local state. Empty/error
  handling, listbox semantics, focus containment, Escape/arrow/Home/End/Enter,
  800px/narrow layout, light/dark themes, reduced motion, and en + zh-TW are
  covered. The preview's remote Help center and upload/file concepts were omitted
  to preserve the local-only, no-host-permissions boundary.
- **2026-07-13 — Popup preview remainders** — completed the remaining local/free
  intent in `locus_extension_popup.png`. The new More view provides real Save
  current tab, `chrome.bookmarks` import into the active Space, and browser-managed
  extension-shortcut actions. Live tab checkboxes drive a persisted Selected
  hibernate scope; schema 11 also adds the opt-in "save links to Locus before
  hibernating" safeguard, which writes the exact candidates to the resolved real
  capture destination (honoring metadata, dedupe, and remember-last) before any
  tab is suspended and aborts safely if the write fails. Current/all scope,
  pinned/audio exclusions, loading/empty/error handling, reload persistence,
  Escape/focus containment, light/dark themes, reduced motion, and en + zh-TW are
  covered. Screenshot/PDF capture, account/profile-photo, and remote feedback stay
  excluded by the host-access/account/network boundary; no fabricated local
  release-notes source was added solely to populate the mock's What's new row.
- **2026-07-13 — Trash/undo surface** — `trash_prototype.png` now has a distinct,
  local recovery surface instead of overloading Archive. Deleting from Archive
  moves the existing entry envelope to schema-10 `trash[]` with `trashedAt`;
  items remain searchable/filterable, support single and batch restore to their
  original location (with the existing safe Inbox fallback), permanent deletion,
  corrupt-entry reporting, and automatic on-load purge after 30 days. The sidebar,
  storage breakdown, export/replace/merge import, counts, empty states, Escape,
  narrow layout, dark themes, reduced motion, and en + zh-TW are covered. Premium
  retention upgrades, remote help, auto-clean controls, detail previews, and
  fabricated storage quotas/stats shown in the mock were intentionally skipped.
- **2026-07-13 — Local font bundle** — Replaced the Google Fonts requests in
  `newtab.html` and `popup.html` with a shared local `media/fonts/fonts.css`.
  Bundled all 41 WOFF2 subsets returned for the existing seven-family selector
  (including DM Sans italic), preserving the configured variable weight ranges,
  unicode coverage, and `font-display: swap`; included each family's OFL notice.
  Existing font IDs, theme behavior, language fallback, and persisted settings are
  unchanged. Headless-Chrome network verification loaded new-tab and popup with
  zero remote requests, including after a settings reload.
- **2026-07-12 — Landing + popup fidelity/first-run pass** — Landing greeting no
  longer falls back to the workspace name ("Good evening, My."); Home hero shares
  the localized no-name form. First-run shows welcome first, landing after (greets
  with the just-entered name). Added staggered entrance animation, meridiem-free
  clock, preview-style date, search reset on dismiss, reminders chip hidden at 0.
  Popup "Save window" now opens the preview's save panel (destination + Change,
  suggested/custom tags, links-only / session-group / reading-queue modes,
  close-after-saving, optional note) honoring `captureAskEveryTime`; main-view
  "Change" is a real destination picker (previously it saved the active tab);
  PDF/Video row chips; local-first footer. `popupSaveMode` persists under
  schema 9. en + zh-TW complete.
- **2026-07-12 — Popup fidelity pass** — `locus_extension_popup.png` now drives
  the 420×590 toolbar popup: preview-aligned window actions, a five-row tab card
  with search and expansion, the real resolved capture destination, and focused
  destination-picker and hibernate subviews. Existing capture semantics remain
  intact (`captureAskEveryTime`, last/default target, dedupe, metadata, and
  close-after-save); hibernate scope/options persist under schema 8. Loading, empty,
  error, keyboard/focus, Escape, en + zh-TW, shared themes, and reduced motion are
  covered. Screenshot/PDF capture, account avatar, remote feedback, and the
  preview's premium-style More panel were intentionally skipped because they
  require page, remote, or account concepts outside the local-only scope.
- **2026-07-12 — Zen new-tab landing layer** — `new_tab_landing_page.png` now
  opens above the real Home by default: time-aware serif greeting from
  `settings.profile.name`, bundled time/theme scene art, local clock/date/quote,
  live active-Inbox and reminder counts, operator-aware saved-link typeahead,
  and web submission through the browser's configured default engine. Escape,
  chevron, and downward wheel reveal Home; keyboard focus is contained; en +
  zh-TW, dark themes, narrow windows, reduced motion, reload persistence, and a
  General setting to disable the layer are covered. No premium, account, remote
  content, profile-photo, or host-permission concepts were added; the avatar is
  the existing local profile/workspace initial.
- **2026-07-12 — Full-page Settings surface** (this repo's biggest preview set:
  `capture_settings.png`, `settings_subpages.png`, Jul 8–11). Eight sections wired
  to real data. Premium/mock concepts intentionally skipped: plugin marketplace
  panes, notifications center, encrypt/lock, GB storage donut, scheduled export, AI
  tagging. Details in DESIGN.md changelog.
- **Pre-2026-07-12** (see DESIGN.md changelog for dates): home surface
  (Waypoint-style cards), Favorites/Read Later/All Links/Archive surfaces, capture
  settings end-to-end (popup + background + settings), welcome questionnaire, app
  menu, board layouts (list/canvas/explorer/timeline/gallery/graph), calendar,
  item-detail pane with tags/checklists/covers, search operators + negation,
  onboarding coach-marks, Locus rebrand.

## Preview → implementation matrix

| Preview (design/previews/) | State |
|---|---|
| settings_* (9 files, Jul 8–11) | ✅ Done 2026-07-12 (local/no-account subset) |
| new_tab_landing_page.png (Jul 11) | ✅ Done 2026-07-12 |
| dashboard.png | ✅ Home surface |
| favorites / read_later / all_links / archive / inbox prototypes | ✅ Library surfaces |
| search_prototype.png | ✅ Done 2026-07-13 (local/no-account fidelity pass) |
| locus_system_empty_state_each_page.png | ✅ Done 2026-07-13 (shared local/no-account empty-state contract) |
| locus_extension_popup.png | ✅ Done 2026-07-13 (local/no-account subset + remainder pass) |
| locus_command_popup.png | ✅ Done 2026-07-13 (local/no-account fidelity pass) |
| spaces_* layout pngs (canvas/explorer/gallery/graph/timeline/details) | ✅ Layouts implemented (fidelity varies) |
| calendar.png, calendar_dark_expand.png | ✅ Calendar |
| locus_startup_1–5.png | 🟡 Historical reference; current one-task welcome is implemented but not user-validated |
| plugins_v1/v2 pngs | 🟡 Tools hub exists; marketplace concepts are deferred and outside the initial purpose |
| trash_prototype.png | ✅ Done 2026-07-13 (local/no-account subset) |
| bento_dashboard / collab_projects, locus_on_mobile, mobile_extension_workflow | 🚫 Out of scope (collaboration/mobile) |
| locus_hover_universal_preview_popup.png | ❌ Needs page-content access → conflicts with no-host-permissions; do not build as-is |

## Known issues / tensions

- Workspace and Space create/rename/removal, existing-Space Group move, explicit
  Group/Stack identity editing, and Duplicate Group are now centralized; populated scopes
  are blocked behind Archive/move guidance, empty structural deletion is receipt-
  gated, and group removal is Archive-only. Deleting a populated container remains
  deliberately unavailable until its Archive destination and structural restore
  semantics are defined. Capture/paste/import-generated Groups and
  remaining direct title/color prompts need a bounded audit; and import diagnostics/
  Explorer retain lower-priority organization `category` labels. They remain queue
  item #4.
  The removed legacy direct Group-move path may have left ambiguous orphan Canvas
  positions or stale capture/Archive/Trash restore hints in profiles that used it.
  The new transaction repairs only the exact current source tuple; retroactive
  cleanup needs a separately specified, backed-up migration because same Group IDs
  and several stale positions do not establish authoritative provenance.
  Native confirmations in contextual Advanced trackers are outside this core slice
  and must not be treated as polished or promoted behavior.
- Home now completes locate → recover through real saved-item previews. The sheet's
  direct title, URL, task, saved-context, cover, tag, checklist, and custom-field
  mutations share one acknowledged transaction; its reminder Set/Change/quick/Clear
  path uses a sibling exact-target transaction whose service-worker receipt owns
  state→alarm ordering. Non-detail item and group/category reminder entries retain
  separate controllers and remain queue item #3. The popup's asked single-tab flow
  now offers a worker-owned Open-in-Locus handoff into that same Home sheet. Quick
  capture with ask-every-time off and whole-window save still confirm and close
  without an explicit recovery handoff; keep their resolution in queue item #2
  rather than adding another recovery surface.
- Fresh installed-runtime verification is unavailable for the current worktree. A
  live Locus new-tab was present as the privileged `edge://newtab/` surface, but
  browser security policy blocked page inspection; the supplied screenshot
  establishes the pre-fix missing-receiver failure, not post-fix behavior. A fresh
  2026-07-16 check found Chrome installed but no configured browser-integration
  profile/native bridge. The in-app browser served the unshimmed localhost DOM with
  no duplicate IDs or captured console errors, but `chrome` was unavailable and
  browser policy blocked both the documented shim and a static-state fixture. None
  of that is an active-UI or installed pass. Installed MV3 behavior, the shimmed UI
  pass, CSP, local favicon loading, service-worker/message lifecycle behavior,
  actual UI flows, responsive/theme/locale pixels, and network silence therefore
  still require an unpacked-extension pass in an environment that can load the
  candidate.
- Deterministic onboarding, item-detail, Trash-recovery, organization-removal,
  organization-delete, organization-naming, organization-creation,
  organization-move, Group/Stack identity, import-recovery, archive-scale, export/import-scale,
  reminder-identity, reminder-overdue, reminder-timezone, background, Undo,
  freshness, popup-Locate, and concurrency
  contracts now cover legacy and
  every-level ID collisions, idless Archive entries, replace rollback/normalization,
  Home `/home?item` recovery with global/owning-Space identity checks, native
  activation, read-only open/close/Back/Forward, active-Space/Canvas isolation,
  exact and moved-row focus, and English/zh-TW interaction-state parity,
  same-request popup state→Locate ordering, authoritative exact/moved/nested
  re-resolution, stale/duplicate/stored/moved-out rejection, encoded Home-detail
  handoff, create-before-close-before-activate ordering, typed accepted-save Locate
  failures, bounded popup receipt timeout, and Landing/Welcome deep-link precedence,
  receipt-gated item-detail reminder Set/Change/Clear with exact target/route
  identity, imported-field preservation, one combined state/alarm receipt, failure/
  warning distinction, duplicate suppression, nested keyboard/Escape/recovery
  ordering, rebuilt-control focus, and localized live/busy feedback,
  four reachable workspace/Space rename surfaces, six creation/create-and-move
  entries, and Board/Canvas/focused-Group plus both List existing-Space move
  entries through one stable-ID dialog,
  plus Board/Canvas/focused-Group and both List Duplicate entries through the
  identity dialog with draft-only open/cancel, whole-graph stale review, recursive
  fresh-ID allocation across active/stored/reference/layout keys, detached custom
  and reminder preservation, merged legacy/current Canvas footprints, one-write
  receipt gating, focused-Group routing without another state write, recovery-
  owned focus, and post-receipt alarm reconciliation for Duplicate/Undo/Redo,
  duplicate-name and duplicate-ID behavior, blank/unchanged/stale/moved targets,
  one-write acknowledgement, action-scoped Undo, failed-write recovery precedence,
  recovery-button keyboard activation, actual asynchronous workspace-chip focus
  completion, locale repaint, narrow/forced-color styling, and removal of hidden-
  tab and double-click rename duplicates,
  production-extracted import validation across 33 malformed boundaries and 128
  fixed-seed structural mutations,
  1,024-record single-item/whole-group/batch Archive and Archive-to-Trash restore
  transformations with exact ID preservation, plus injected-quota batch Archive
  and Archive-to-Trash failures that preserve both the dirty local graph and the
  unchanged authoritative graph through reload recovery,
  a 1,488,148-byte current-schema export with 1,024 top-level active records (1,536
  counted items), 1,024 Archive, and 1,024 Trash records through production
  serialization, validation, replace, merge,
  pre-replace backup, collision-free rekeying, and rejected-write rollback,
  all numeric schemas 0–12 across the six accepted app envelopes plus raw legacy
  through 28 replace/merge cases with versioned defaults, exact counts, and stable
  category/group/Trash reminder identity migration,
  128 fixed-seed valid semantic graphs spanning 5,013 entities through 256
  replace/merge cases with enforced coverage families and exact semantic equality,
  an exact 20,971,520-byte valid import reaching preview, a one-byte-over valid
  import rejected before FileReader, and two 10,551,296-byte replace/merge imports
  rolling back after injected typed quota rejection with no false success,
  post-import warning paths, an exact nine-alarm initial map, an advanced-clock
  startup reconciliation that clears four newly overdue one-shots and re-arms four
  recurring item/nested/group/category reminders without catch-up notifications,
  state writes, or mutation, and eight fired-delivery cases that persist item/nested/
  group/category recurrence plus stable-index and legacy-transition delivery, reject
  five stale/malformed alarms, and exercise notification, quota/generic storage,
  and post-write reconciliation failures, plus a central runtime-message case that
  persists before alarm-map access and returns structured reconciliation success or
  accepted-state scheduling failure in the same receipt,
  and a pending-reminder projection that keeps unresolved one-shots and expired series
  in Past due, excludes delivered records, and matches background daily/biweekly/
  monthly recurrence projection without mutating identity-bearing source entries,
  plus a four-zone production-extracted recurrence matrix covering 23/25-hour days,
  missing spring-forward wall times, repeated fall-back folds, missing month-days,
  Apia's deleted civil date, exact `until` behavior, background/display parity,
  immutable inputs, and stale second-fold rejection,
  plus no-retry
  capture conflicts and action-scoped Undo across pending capture, newer-edit interruption, restored
  history order, tab-open retry, persistence-failure recovery, central-writer conflict/failure
  recovery, immutable client candidates, queued-successor invalidation, overlapping
  popup/new-tab capture no-close behavior, clean/dirty external-state handling,
  no-op boot suppression, legacy settings normalization, authoritative failed-capture
  recovery, lost/timed-out receipt recovery, stale-read protection, delayed-event
  handling, invalid-token rejection, transient and persistent missing-receiver
  handling in new-tab and popup, post-timeout retry cancellation, scoped extension-
  runtime recovery with page fallback, ambiguous closed-port no-retry behavior,
  dirty ordinary-write preservation,
  browser-effect interruption, and 10,000 seeded lockless schedules.
  Remaining P0 gaps are installed
  cross-context/service-worker restart and unknown-ack lifecycle evidence,
  actual Chrome quota allocation, File/FileReader/preview behavior, and installed
  browser legacy/current import round trips, installed reminder state/alarm receipt
  teardown plus restart/sleep and delivery behavior, rendered one-shot Past Due
  behavior, remaining non-detail item and group/category mutation races under stable
  identity, installed alarm timing through time-zone
  transitions and live time-zone changes, installed-browser
  Archive/Trash quota and export/import
  recovery, and a complete
  unpacked-extension evidence bundle. Static and mocked contracts do not close
  those browser-runtime risks.
- New-tab freshness and failed-capture recovery are production-extracted and
  deterministic only. Installed Chrome must still establish actual
  `storage.onChanged` versus runtime-receipt ordering, multi-page focus/overlay
  behavior, source effects during an active recovery blocker, and convergence
  across service-worker termination. A programmatic `hibernateSingle()`/popup
  reload overlap is also outside the shared popup capture mutex and needs
  installed-runtime disposition.
- The managed in-app browser stayed at 1280×720 when asked for an 800px viewport
  during the corrective Search/palette and empty-state passes. The narrow
  media-query paths were inspected statically, but the next unpacked-extension pass
  should repeat the interactive Search, palette, and empty-state checks at 800px
  before treating that viewport as fresh runtime evidence.
- `renderArchiveList()` in newtab.js is a harmless no-op since the drawer's archive
  tab was removed (element gone, function null-guards); callers remain. Delete
  function + call sites opportunistically when touching those paths.
- `design/fixtures/home-preview.html` is a static fixture with hardcoded counts —
  fine (isolated), but never link it from the product.
