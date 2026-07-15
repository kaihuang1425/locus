---
description: Run one evidence-gated Locus improvement cycle — reduce the top risk, validate honestly, update the system of record
argument-hint: [optional slice name to override the queue]
---

Run **one** improvement cycle on the Locus extension in this repo.

## Orient (don't re-audit the whole repo)

1. Root `CLAUDE.md` is your map. Read `docs/PRODUCT_SUCCESS_SYSTEM.md` first for the
   thesis, ICP, claims ledger, P0 gates, metrics, roadmap, and open owner decisions.
   Then read `.claude/docs/STATUS.md` for current implementation/evidence state.
   Open `.claude/docs/ARCHITECTURE.md` before touching code and
   `.claude/docs/VERIFY.md` before validating. Do not re-derive settled facts — but
   if code, external obligations, and docs disagree, reality wins and the docs must
   be corrected in the same cycle.
2. Pick `$ARGUMENTS` if given; otherwise take queue item #1. Confirm it reduces a
   current P0 risk or advances the explicit save → locate → recover → trust loop.
   A preview is optional visual reference, never product authority and never a
   reason to bypass the evidence-gated roadmap.
3. State the acceptance contract before editing: exact behavior, failure behavior,
   evidence level this cycle can reach, and what will remain unverified. Stop if an
   open owner decision would materially change the implementation.

## Implement — one coherent risk-reducing slice

- Optimize the core contract and data safety before feature breadth. Use previews
  only when they support the current interaction contract. No hardcoded demo data —
  wire to real state (`State.get()`) and browser APIs.
- Cover empty/loading/error states, keyboard + focus behavior, light/dark themes,
  en + zh-TW strings, persistence across reload, reduced motion, concurrency, and
  recovery in proportion to the slice's risk.
- Follow every rule in CLAUDE.md "Hard project rules" (IDs, schema migrations, i18n
  dict, Escape stack, motion gating, changelog).
- Stay within the desktop, single-profile, local noncommercial research-alpha scope.
  Skip account, sync, collaboration, billing, mobile, host-permission, and generic
  tracker expansion unless the canonical roadmap and owner decisions explicitly
  authorize them.
- Use only claims allowed by the canonical ledger. Never turn an implementation,
  mock test, repository version, or preview into a verified, user-validated, or
  released claim.

## Validate

Run the full applicable playbook in `.claude/docs/VERIFY.md`: syntax/static quality
gates, deterministic contract suites, shimmed UI checks, and installed-extension
checks where the environment permits. The shim is not MV3 runtime evidence. If a
browser, viewport, network trace, service-worker lifecycle, or user test is
unavailable, record it as unavailable and keep the associated gate open.

## Close the loop (required, this is what keeps cycles cheap)

1. Update `.claude/docs/STATUS.md`: record the implementation cycle, re-rank the
   queue, and log every remaining risk or unavailable check. “Done” there means the
   scoped implementation cycle ended; it does not mean released or validated.
2. Append a dated entry at the END of the `DESIGN.md` §6 changelog.
3. If you discovered a wrong or missing fact in `.claude/docs/ARCHITECTURE.md` or
   `VERIFY.md`, fix it now.
4. If the slice changes the thesis, claim status, P0 register, metric, roadmap, or
   owner decision, update `docs/PRODUCT_SUCCESS_SYSTEM.md`. Otherwise leave the
   canonical strategy stable.
5. Record Implemented, Verified, User-validated, and Released independently. Do not
   upgrade a field without the evidence required by the canonical definition.

## Restrictions

Do not commit, push, branch, rebase, reset, or delete user data. Do not restart the
project or create parallel apps. Ask nothing unless a genuinely risky product
decision can't be inferred from the repo, previews, or STATUS.md.

## Report

End with: the outcome implemented, how it reduces the named risk or improves the
core loop, files changed (grouped), checks run and their exact evidence level,
remaining limitations/owner decisions, and the new queue #1 with one line of why.
Use “shipped” only when a released artifact and channel are actually evidenced.
