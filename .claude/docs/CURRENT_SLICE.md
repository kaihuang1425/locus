# CURRENT_SLICE

Status: Cycle 75 selection Open now enables only when at least one selected saved
page has a supported Reopen address; focused Reopen, selection-docket, syntax,
quality, and diff contracts pass; installed DOM/assistive-technology,
representative-user, approval, and release evidence remain open

## User-visible problem

A selection containing only a retained or imported `data:`, `blob:`, or
`javascript:` page enabled **Open selected tabs**. Activation then opened nothing
because the shared Reopen boundary correctly rejects those addresses.

## Acceptance contract

- Disable selection Open when no selected page uses HTTP, HTTPS, FTP, or file.
- Keep Open enabled for a mixed selection with at least one recoverable page.
- Preserve the bulk coordinator's exact partial-result and recovery behavior.
- Do not rewrite, delete, normalize, or hide unsupported retained records.

## Implemented boundary

- `renderItemSelToolbar()` now combines the existing saved-page type check with
  `isOpenableSavedTabUrl()` before enabling Open.
- The existing disabled state and `selection.openUnavailable` explanation are
  reused. No copy, style, schema, migration, permission, or network path changed.

## Verified evidence

- The red production-render case exposed an enabled Open button for one selected
  `javascript:` record.
- The green case disables unsafe-only Open and retains enabled Open for a mixed
  unsafe/HTTPS selection.
- `node scripts/saved-page-reopen-contract-test.js`,
  `node scripts/selection-docket-contract-test.js`, syntax checks,
  `node scripts/quality-gates.js`, and `git diff --check` pass.

## Honest evidence boundary and next slice

**Implemented: yes. Verified: partial. User-validated: no. Released: no.** This is
production-extracted deterministic/static evidence, not installed rendered DOM,
keyboard/screen-reader behavior, real Chrome effects, representative-user
comprehension, or release. No commit or push was made.
