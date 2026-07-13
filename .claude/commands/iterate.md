---
description: Run one Locus improvement cycle — pick the top slice from the queue, implement it completely, validate, update the docs
argument-hint: [optional slice name to override the queue]
---

Run **one** improvement cycle on the Locus extension in this repo.

## Orient (don't re-audit the whole repo)

1. Root `CLAUDE.md` is your map. Read `.claude/docs/STATUS.md` for what's done and
   what's queued. Open `.claude/docs/ARCHITECTURE.md` before touching code and
   `.claude/docs/VERIFY.md` before validating. Do not re-derive what those files
   already state — but if code and docs disagree, the code wins.
2. Pick the slice: `$ARGUMENTS` if given, else queue item #1 in STATUS.md. Spot-check
   (grep the named functions/files, open the named preview PNG) that it is genuinely
   not yet implemented and the preview is still the newest coherent version of that
   screen.

## Implement — one coherent slice, completely

- Match the named preview closely; prefer its intent over pixel-copying. No
  hardcoded demo data — wire to real state (`State.get()`) and browser APIs.
- Cover empty/loading/error states, keyboard + focus behavior, light/dark themes,
  en + zh-TW strings, persistence across reload, reduced-motion.
- Follow every rule in CLAUDE.md "Hard project rules" (IDs, schema migrations, i18n
  dict, Escape stack, motion gating, changelog).
- Stay desktop / free-tier / local-only. Skip premium or host-permission concepts
  even if the preview shows them; note the skips in STATUS.md.

## Validate

Run the full playbook in `.claude/docs/VERIFY.md` — static checks plus the runtime
pass with the chrome-storage shim. If pixel screenshots are impossible (hidden
pane), verify via DOM/computed styles and say so plainly.

## Close the loop (required, this is what keeps cycles cheap)

1. Update `.claude/docs/STATUS.md`: move the slice to Done, re-rank the queue, log
   any new issue or intentional skip.
2. Append a dated entry at the END of the `DESIGN.md` §6 changelog.
3. If you discovered a wrong or missing fact in `.claude/docs/ARCHITECTURE.md` or
   `VERIFY.md`, fix it now.

## Restrictions

Do not commit, push, branch, rebase, reset, or delete user data. Do not restart the
project or create parallel apps. Ask nothing unless a genuinely risky product
decision can't be inferred from the repo, previews, or STATUS.md.

## Report

End with: the slice shipped and its preview, how it connects to real data, files
changed (grouped), validation run + results + any limitation, and the new queue #1
with one line of why.
