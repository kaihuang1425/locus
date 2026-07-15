---
description: One gated, committed, honestly-evidenced Locus cycle for unattended overnight looping — reads its own log for state, stops itself when done
argument-hint: [optional max cycle count, default 12]
---

Run **one** improvement cycle on the Locus extension, then end your turn. `/loop`
re-invokes you; the loop is the repetition, you are one cycle. All cross-cycle state
lives in files — `.claude/docs/OVERNIGHT-HANDOFF.md`, `.claude/docs/STATUS.md`, and
git history — never in your context. Assume you remember nothing from last cycle.

**You are unattended.** Nobody will answer a question tonight. Prefer stopping the
loop and leaving a clean handoff over guessing.

## 1. Orient (every cycle, from files)

1. Read `.claude/docs/OVERNIGHT-HANDOFF.md` if it exists. It tells you the branch,
   the baseline SHA, how many cycles have run, and what already failed. If it does
   not exist, this is cycle 1 — do Setup below.
2. Read `docs/PRODUCT_SUCCESS_SYSTEM.md`, `.claude/docs/STATUS.md`,
   `.claude/docs/ARCHITECTURE.md`, `.claude/docs/VERIFY.md`. Do not re-audit the
   repo. Do not re-derive settled facts.
3. Check the stop conditions in §5 **before** doing any work. If one fires, finalize
   the handoff and stop the loop.

### Setup (cycle 1 only)

- Verify `git config user.name` is `I-Kai Huang` and `user.email` is
  `61899328+erichuang1425@users.noreply.github.com`. Stop the loop if not.
- Create and switch to `work/overnight-<YYYY-MM-DD>` from current HEAD. The worktree
  already carries ~35 modified/untracked files of real in-progress work: commit that
  state first, unchanged, as one baseline commit (subject:
  `Baseline before overnight cycles`). Record its SHA in the handoff — every later
  diff reads against it. Touch nothing on `main`.
- Create `.claude/docs/OVERNIGHT-HANDOFF.md` with the branch, baseline SHA, and
  `Cycles completed: 0`.

## 2. Pick and implement one slice

Take `.claude/docs/STATUS.md` queue item #1 — follow the existing ranking; do not
re-prioritize toward whatever looks most fun or most visual. Queue #1 is a large P0
bundle, not one slice: take the smallest coherent piece a single cycle can finish
**and** gate. Never start work you cannot land and verify in this same cycle.

Then follow `/iterate` (`.claude/commands/iterate.md`) for the implementation rules,
with one deliberate override — see §4 on committing.

State the acceptance contract before editing: exact behavior, failure behavior, the
evidence level this cycle can reach, and what will remain unverified.

## 3. Gate — all green or nothing commits

Run the full static block from `VERIFY.md`:

- `node --check` on each of `newtab.js popup.js background.js suspended.js
  emoji-data.js prepaint.js import-utils.js scripts/*.js`
- `node scripts/quality-gates.js`
- `node scripts/import-recovery-test.js`
- `node scripts/archive-scale-contract-test.js`
- `node scripts/export-import-scale-contract-test.js`
- `node scripts/background-contract-test.js`
- `node scripts/undo-contract-test.js`
- `node scripts/state-sync-contract-test.js`
- `node scripts/concurrency-contract-test.js`
- `git diff --check`

**Frontend slices also need the shimmed UI pass** (`VERIFY.md`): `preview_start` the
`folio-static` config, open `http://localhost:8777/newtab.html`, inject the
documented `chrome.*` shim, call `init()`. Then: console errors empty, duplicate-id
scan returns `[]`, primary flow driven end-to-end with real dispatched events
asserting DOM **and** `State.get()`, reload + re-shim persistence, `folio-dark`,
zh-TW with no raw keys, Escape + focus containment, ~800px layout.

**Never work around a blocked check.** If the browser pane rejects shim injection or
screenshots time out because the pane is hidden, record it as *unavailable*. Do not
reach for another browser backend, raw CDP, or indirect page execution. Do not call
the slice visually verified.

**Red means revert.** If a gate fails and you cannot fix it inside this cycle,
restore this cycle's changes back to the last green commit, log the attempt and the
reason in both STATUS.md "Known issues" and the handoff, and end the turn. Never
commit a red tree. Never weaken, skip, or edit a gate to make it pass.

## 4. Land and close the loop

- **Commit; never push.** `/iterate` says "do not commit". That line is deliberately
  overridden for this unattended run so each cycle is reviewable and revertable in
  the morning — it is the only `/iterate` rule you may break, and only this way. One
  commit per landed cycle. Short imperative subject. No AI, assistant, tool, or
  Anthropic reference; no `Co-authored-by`; no generated-by trailer.
- Never push, merge, rebase, force-push, hard-reset, delete a branch, or rewrite
  history. Never delete user data.
- Update `.claude/docs/STATUS.md`: cycle record, re-ranked queue, every remaining
  risk, every unavailable check.
- Append a dated entry at the **end** of `DESIGN.md` §6 changelog.
- Correct any wrong fact you hit in ARCHITECTURE.md or VERIFY.md, this cycle.
- Update `docs/PRODUCT_SUCCESS_SYSTEM.md` only if the slice changes the thesis,
  claim status, P0 register, a metric, the roadmap, or an owner decision.
- Append to `.claude/docs/OVERNIGHT-HANDOFF.md`: increment `Cycles completed`, and
  add one line — slice, outcome, evidence level actually reached, commit SHA.

## Evidence honesty — the point of the whole run

Nothing reachable tonight constitutes installed-extension runtime evidence or user
validation. Static + deterministic + shimmed is the hard ceiling.

- Never upgrade Verified, User-validated, or Released beyond what you actually ran.
- `Verified: partial (static/deterministic + shim)` is the strongest honest claim
  available tonight. `User-validated: no.` and `Released: no.` on every entry.
- An unavailable check is recorded as unavailable and leaves its gate **open**. It is
  not a pass. A passing deterministic suite proves only the contract it models.
- No hardcoded, mocked, or demo data in the extension. Wire to real `State.get()` and
  real browser APIs.
- Use only claims the canonical ledger in `docs/PRODUCT_SUCCESS_SYSTEM.md` permits.
  Never turn an implementation, a mock test, a preview PNG, or a commit into a
  verified or released claim. Do not use the word "shipped".

## Hard boundaries

- No new dependencies, `package.json`, build step, server, or host permissions.
- Persistent-data changes bump `CURRENT_SCHEMA` and extend `migrate()`; an absent
  field must mean today's behavior.
- Keep load-bearing element IDs; guard every new `getElementById` binding.
- Every `data-i18n` key must exist in `I18N.en` **and** zh-TW. `data-i18n` on leaf
  text nodes only.
- Motion respects `body[data-anim="off"]` and `prefers-reduced-motion`.
- New overlays join the Escape stack: `rememberOpener`/`restoreOpener`, `trapTabKey`,
  `_escBlockers`.
- Do not modify `docs/index.html`, `docs/landing-page-strategy.md`, or anything under
  `marketing/`. Those are public surfaces.
- Stay in desktop, single-profile, local noncommercial research-alpha scope. No
  accounts, sync, collaboration, billing, mobile, or tracker expansion.
- Never restart, rewrite, or fork the project into a parallel app.

## 5. Stop conditions — finalize and stop the loop when ANY fires

Check these at the START of every cycle, reading the handoff for history:

1. `Cycles completed` ≥ `$ARGUMENTS` (default 12).
2. The same slice has failed its gates twice. Never a third identical retry.
3. Two consecutive cycles landed no committed change.
4. No STATUS.md queue item is reachable without an owner decision or a real Chrome
   pass.
5. Progress needs an owner decision from `docs/PRODUCT_SUCCESS_SYSTEM.md` — license,
   business model, the Locus name collision, Store single-purpose scope. Those are
   the owner's calls, not yours.
6. Any gate failure you could not diagnose within two attempts.

### Finalizing

Complete `.claude/docs/OVERNIGHT-HANDOFF.md` with:

- Branch, baseline SHA, and `git log --oneline <baseline>..HEAD`.
- The per-cycle lines already accumulated.
- Everything reverted, and why.
- The risk-ordered list of checks still needing a human unpacked-extension pass
  (`chrome://extensions` → Developer mode → Load unpacked → repo root).
- Open owner decisions that blocked work.
- New queue #1 and one line of why.
- Which stop condition fired.

Then stop the loop. Do not push. Do not open a PR.
