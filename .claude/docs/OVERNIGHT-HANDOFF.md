# Overnight handoff

- Branch: `work/overnight-2026-07-16`
- Baseline SHA: `8fadde4c2991fbe7a0f6d6ad1834dfbf330f83ac`
- Cycles completed: 12

## Setup notes

- The baseline and all twelve cycle commits completed successfully. Git's post-commit geometric repack continues to report a pre-existing broken hidden checkpoint object; each branch and commit result was verified afterward.

## Latest cycle

- Cycle 12 -- local-calendar recurrence across time zones: daily, weekly, and monthly background re-arming/alarm matching and new-tab pending projection now advance nominal calendar coordinates rather than elapsed milliseconds or a locally normalized cursor. Local wall time survives 23/25-hour days; nonexistent DST times, Apia's deleted civil date, and missing month-days skip without drift; repeated fall-back time resolves to its first instant once; and malformed bounds fail closed. Fresh processes under New York, Berlin, Taipei, and Apia exercise 21 recurrence cases, 37 background/display parity checks, two accepted first-fold alarms, six stale/notified alarm rejections, and 16 invalid-input cases without mutating recurrence inputs; the complete static/deterministic gate passes. Evidence is `Verified: partial (multi-process, production-extracted deterministic time-zone contracts only)`; the managed-browser shim remains unavailable, and installed Chrome sleep/restart, notification delivery, transition timing, live operating-system time-zone changes, and rendered Past Due behavior remain open; commit `009f810816032365830b0c16ce81fb62938c18ef`.

## Prior cycles

- Cycle 11 -- pending-reminder and one-shot Past Due policy: delivered records no longer inflate new-tab pending counts, item badges, or Calendar rows. Unresolved overdue one-shots retain their stored time and existing open/reschedule/drag/clear/remove path; missed active recurrences project without state mutation to the same first future local-calendar occurrence used by background reconciliation, while expired series remain Past due. Projection preserves stable reminder IDs and entity indexes, and editors open on the projected occurrence without changing authority. The production-extracted DOM-free contract covers six pending cases, two resolved omissions, three recurrence-parity paths, two editors, Calendar enrichment, badges, and five production wiring points; the complete static/deterministic gate passes. Evidence is `Verified: partial (production-extracted deterministic state/display contracts only)`; the managed-browser shim is unavailable, and rendered interactions, installed restart/sleep/notification behavior, mutation races, and DST/timezone semantics remain open; commit `b917292ade2d4277fc4ab5990891f32fa894491f`.

- Cycle 10 -- stable group/category reminder identity: schema 12 gives active, archived, and trashed entity reminders persistent IDs; migration repairs missing/invalid/duplicate IDs, older merge imports are repaired on a clone, and current-schema imports require uniqueness. Distinct `te-greminder2-` / `te-creminder2-` alarm namespaces encode the entity plus reminder ID, delivery resolves exactly one identity across index shifts, and schema-11 index alarms remain usable until migration persists before being reconciled away. Contracts cover migration ordering, four new-tab mutations, three stable/legacy name round trips, schemas 0–12 through 28 replace/merge cases, eight accepted deliveries, five stale/malformed no-ops, two identity-mutation paths, and the full static gate. Evidence is `Verified: partial (production-extracted mocked-browser/state contracts only)`; the managed-browser shim remains unavailable, and installed lifecycle/delivery, notification rendering, mutation races, one-shot Past Due policy, and DST/timezone behavior remain open; commit `0c3eb3b3009ed3bcda60d4a2fa16e455d66503af`.

## Earlier cycle log

- Cycle 9 -- fired reminder persistence and stale-alarm rejection: the production alarm handler now accepts only a `scheduledTime` that still belongs to the current reminder, awaits delivery notification creation, advances item/nested-item/group/category recurrence through the central writer, and reconciles the complete map under the same alarm name; one-shots and the final `until` occurrence persist as notified without re-arming. Rejected writes are never retried: authority remains unchanged while the consumed recurrence is rebuilt from a fresh read, with the existing quota warning or a clickable generic update warning; failed post-write scheduling retains accepted state and creates a clickable scheduling warning. The contract covers six deliveries, two stale/removed no-ops, and four failure paths. Evidence is `Verified: partial (clock-controlled mocked-browser delivery only)`, with frontend shim not applicable for this background-only slice and installed notification/delivery timing, service-worker termination, rendered Past Due behavior, group/category index-mutation races, and DST/timezone semantics still open; commit `1cf0faec6df64372872ab8349b5c096e3cd526c2`.

### Cycles 8-5

- Cycle 8 -- recurring reminder restart recovery: background reconciliation now advances an overdue recurring item, nested item, group, or category reminder to its first future wall-clock occurrence without replaying missed notifications or mutating state; expired recurrences and overdue one-shots remain unscheduled. The production-extracted contract creates nine exact initial alarms, advances eight days through the registered browser-startup listener, clears four newly stale one-shots, and retains five alarms by re-arming four daily/multi-day/biweekly/monthly series plus the subscription; repetition is idempotent, unrelated alarms survive, and injected create and clear failures return two structured operations without false success, state write, mutation, or notification. Evidence is `Verified: partial (clock-controlled mocked-browser lifecycle only)`, with frontend shim not applicable for this background-only slice and installed Chrome restart/sleep/delivery, fired-series persistence, rendered Past Due behavior, and DST/timezone semantics still open; commit `08a10dd5125845d41f6ab2e145b651fd005eb93a`.

- Cycle 7 -- import byte-limit and quota-sized rollback contracts: exact UTF-8 fixtures derived from the production limits carry a valid 20,971,520-byte backup through FileReader, parsing, normalization, and validation to one non-mutating preview, while the same valid JSON plus one byte is rejected before FileReader with visible size feedback and no preview or write; a valid 10,551,296-byte file whose parsed graph remains above the 10 MiB fallback quota reaches replace and merge preview, then an injected typed quota rejection makes exactly one write attempt, rolls local state back, leaves authority unchanged, requires recovery, skips reminder reconciliation, and reports no success, with replace alone creating its safety backup; the suite now has eight rejected-write cases; evidence remains `Verified: partial (exact-byte deterministic browser-API model only)`, with frontend shim not applicable and actual Chrome File/FileReader and preview behavior, real quota allocation, DOM-backed sanitizer transformations, alarm outcomes, and installed-browser round trips still open; commit `848c06cd36cc7a8f2882ff2836218aad56686045`.

- Cycle 6 -- valid-semantic import fuzz contracts: a fixed `0x51a7e5` seed generates 128 valid current-schema graphs spanning 5,013 entity IDs and drives 256 replace/merge cases through the production FileReader parser, validator, graph transforms, migration, and State writer; asserted coverage includes multiple workspaces, Spaces without groups, empty groups/Archive/Trash, every item and stored-entry kind, nested stacks, all five accepted URL families, Unicode and safe rich text, optional metadata, selections, restore references, canvas/column records, settings, and emoji; exact counts, identity-independent semantics, unique IDs, remapped references, settings isolation, one authoritative write, input immutability, and six total rejected-write rollback cases pass; evidence remains `Verified: partial (fixed-seed deterministic browser-API model only)`, with frontend shim not applicable and actual Chrome files/previews, DOM-backed sanitizer transformations, quota/large-file limits, reminder/alarm outcomes, and installed-browser round trips still open; commit `ff62975a37b6c801a7a9acce97f4087af2ddbda3`.

- Cycle 5 — numeric-schema import fixture matrix: carried every supported numeric schema from 0 through 11, all six accepted app envelopes, and the raw legacy shape through 26 production-extracted FileReader/normalizer/validator/replace-or-merge/migration/State-writer cases; semantic records, exact counts, versioned defaults, schema-4/5 fields, unique identities, restore destinations, selected-tab cleanup, and profile-setting isolation pass, while four current/raw-legacy rejected writes roll back without changing authority or reporting success; evidence reached `Verified: partial (deterministic browser-API model only)`, with frontend shim not applicable and semantic fuzz, actual Chrome file/preview behavior, quota/large-file limits, alarm outcomes, and installed-browser legacy/current round trips still open; commit `1842beff220464937bfcfa78528d3f7aa984ccbd`.

### Cycle 4

- Cycle 4 — serialized export/import scale contract: exercised the production export serializer, FileReader/validator boundary, replace and merge applications, and State writer with a 1,488,148-byte current-schema payload containing 1,024 top-level active records (1,536 counted items), 1,024 Archive entries, and 1,024 Trash entries; semantic content, restore references, metadata, collision-free rekeying, the exact portable pre-replace backup, and rejected-write rollback pass; evidence reached `Verified: partial (deterministic browser-API model only)`, with frontend shim not applicable and actual Chrome downloads/previews, quota/large-file limits, complete legacy compatibility, and installed-browser round trips still open; commit `79f147669ed4a123c6036eb8813ef5d67a39dd6e`.

### Cycles 1-3

- Cycle 1 — import-validator malformed/fuzz corpus: landed 29 explicit rejection boundaries and 128 fixed-seed structural mutations; evidence reached `Verified: partial (static/deterministic model only)`, with frontend shim not applicable and installed-browser/legacy-schema/semantic-fuzz/quota/large-file round trips still open; commit `0966e34f595dc5d83321caa464c44149db8e42be`.
- Cycle 2 — Archive/Trash 1,024-record scale contract: landed production-extracted single-item, whole-group, batch, Archive-to-Trash, and restore coverage with exact ID preservation and canonical graph recovery; evidence reached `Verified: partial (static/deterministic model only)`, with frontend shim not applicable and real quota, serialized export/import, UI, and installed-browser behavior still open; commit `8995b9c8e6b40808e5df4384a9df5fec9469347b`.
- Cycle 3 — Archive/Trash quota-recovery contract: joined the production batch Archive and Archive-to-Trash mutations to the production State writer, ordinary-failure handler, and quota-error router at 1,024 mixed records; paired background-writer coverage proves a quota exception returns a typed failure and notification without changing stored state; evidence reached `Verified: partial (injected deterministic quota model only)`, with frontend shim not applicable and real Chrome quota, rendered UI, serialized export/import, and installed-browser lifecycle behavior still open; commit `b91af59e81507588d5efe0a89e83d2736efb4bbe`.

## Finalization

- Stop condition fired: **1 -- `Cycles completed` reached the default maximum of 12.**
- Everything reverted: **none**. Every cycle landed one green commit; no failed slice
  or partial implementation remains to explain.
- New queue #1: **Finish P0 durability and release evidence.** Deterministic coverage
  is substantially stronger, but real multi-context MV3 lifecycle, quota/file,
  reminder, rendered recovery, CSP/privacy, and network evidence still gates trust.
- Open owner decisions: license/business model, the Locus name collision before Store
  submission, the initial Store single-purpose scope, and final public-claims/surface
  approval. No decision was guessed during the run; these still block release-facing
  work.

### Commit log from baseline

```text
ba2edd5 Harden state write receiver recovery
009f810 Preserve recurring reminder wall time
b917292 Complete overdue reminder policy
0c3eb3b Stabilize entity reminder identities
1cf0fae Harden reminder delivery persistence
08a10dd Recover recurring reminders on restart
848c06c Add import byte-limit contracts
ff62975 Add semantic import fuzz contracts
1842bef Add import compatibility matrix
79f1476 Add export import scale contracts
b91af59 Add archive quota recovery contracts
8995b9c Add archive scale contracts
0966e34 Expand malformed import coverage
```

### Human unpacked-extension pass (risk order)

Load the repository root from `chrome://extensions` after enabling Developer mode,
then retain console, network, storage, alarm, and visible-flow evidence for:

1. **Whole-state durability and source safety** -- overlap real new-tab, popup, and
   background writes; lose/delay replies; interleave `storage.onChanged`; terminate
   and restart the service worker; inject quota/write failures; confirm accepted
   state converges, rejected state stays recoverable, recovery UI blocks unsafe work,
   and source tabs close only after acknowledged persistence.
2. **Quota, Archive/Trash, and import/export recovery** -- exercise real Chrome quota
   allocation, File/FileReader and preview/download behavior at the exact documented
   boundaries, 1,000+ Archive/Trash records, installed legacy/current replace and
   merge, corruption/sanitization failures, rollback, reload recovery, and the exact
   pre-replace backup.
3. **Reminder lifecycle and clock behavior** -- verify installed startup, sleep/wake,
   service-worker termination, notification delivery, one-shot Past due and
   reschedule/clear, schema-12 group/category mutation races, import/delete cleanup,
   DST/date-line transitions, and a live operating-system time-zone change. Confirm
   no duplicate fold delivery, catch-up burst, normalized drift, or orphan alarm.
4. **CSP, privacy, and unexpected network traffic** -- inspect every critical
   extension surface for CSP/console errors, permission behavior, local favicon/font
   loading, blocked legacy remote content, and zero extension-directed remote
   requests outside explicit user navigation/search.
5. **Rendered first-use and recovery flows** -- run welcome save -> destination ->
   reload/navigation -> find/reopen with no coaching; verify pending/Past due actions,
   reload blockers, Undo, focus/Escape, keyboard and screen-reader behavior, light/
   dark themes, en/zh-TW, reduced motion, and the narrow layout near 800 px. The
   managed-browser shim and narrow viewport were unavailable during this run, so
   neither is counted as passed.

### User-directed post-loop follow-up

- After the twelve-cycle stop condition was finalized, the supplied installed-Edge
  screenshot exposed a concrete P0-04 missing state-write receiver failure. New-tab
  and popup clients now retry only the exact no-receiver rejection for three total
  attempts, retain single-shot handling for ambiguous outcomes, and surface typed
  background-service recovery. The complete static/deterministic gate passes;
  browser policy blocked post-fix inspection of the privileged `edge://newtab/`
  surface, so installed service-worker wake/restart and rendered recovery remain
  open. This user-directed follow-up is not counted as a thirteenth unattended
  cycle; commit `ba2edd5df5abe77311c5b5f544e28cc7bc55c16d`.
