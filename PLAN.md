# Plan: Do more with less code

Status: Complete. Approved simplicity guidance merged into main and pushed. Delivery verified; final record published through the same fast-forward process.

## Goal and scope
Replace only `Keep it fucking simple` in `pi/.pi/agent/AGENTS.md` with the exact agreed section below. Code is a liability; seek simpler overall designs before solving a complex local problem. Preserve all other sections. This replacement removes the old section's testing/fixture and shortcut bullets as part of the agreed full replacement.

Only this rules file and this plan may change. No code, new tests, delegation, or changes to the separate unmerged subagent branch. User requested publication: merge this branch into main and push origin/main without force.

## Agreed replacement
```markdown
## Keep it fucking simple.

- Code is a liability, not an asset. Do more with less: less code, fewer moving parts, and a direct solution to the core issue.
- Look at the big picture before solving the problem as presented. Question the assumptions and surrounding design: can a simpler overall approach make the problem smaller or eliminate it?
- Break complex problems into smaller pieces. Find the simplest solution to each, then check whether the whole can be simpler still.
- Be lazy about adding work and code. Delete, simplify, and reuse before adding. Every action must serve the agreed goal.
- Solve only the real problem. No unrequested features, speculative flexibility, unnecessary abstractions, or “just in case” code.
- Fix root causes, check affected callers, and preserve correctness. Less code is not a win if it hides failures or weakens safeguards.
```

## Actions
### 1/2 — Done: Replace the simplicity section
- Operation/target: replace the heading and bullets from `## Keep it fucking simple` up to, but not including, `## Talk clearly` in `pi/.pi/agent/AGENTS.md` with the agreed replacement.
- Goal/boundaries: establish the less-code and big-picture principles; leave all other sections unchanged.
- Dependencies/inputs: detailed-plan approval; exact wording above; current rules read and heading references checked.
- Done when: manual diff review and exact-text comparison confirm the approved replacement and unchanged surrounding content; `git diff --check` passes; results are recorded here and committed in this worktree.

### 2/2 — Done: Merge and publish
- Operation/targets: pull origin/main into local main, merge refreshed main into this branch, revalidate, commit the delivery record, fast-forward main to this branch, and push origin/main without force. Verify publication and record any unresolved blockers.
- Goal/boundaries: publish only this change and plan records. Preserve the separate subagent branch. Stop if unrelated local changes or upstream conflicts require a material decision.
- Dependencies/inputs: action 1 complete; user's explicit request to update and push; clean checkouts.
- Done when: rules still match the approved replacement, committed diffs pass whitespace checks, local main and live origin/main match, the working checkout is clean, and delivery results are recorded. No application tests are relevant to this documentation-only change.

## Results
- Action 1: exact approved replacement applied. Manual diff review and exact-content comparison confirmed all surrounding rules are unchanged. `git diff --check` passed. No tests added or required for this documentation-only edit.

- Action 2 validation: main was clean and origin/main already current. Updated main merged into the branch without changes or conflicts. Re-reviewed the rules diff; committed-change whitespace checks passed. Fast-forwarded main and pushed without force through `13940d6`; live origin/main matched local main and both checkouts were clean. No blockers. This completion record is published through the same fast-forward process.

## Preparation and limits
- Main was clean; verified `.local/` is ignored; pulled origin/main into local main (already current).
- Created `.local/worktrees/agents-less-code` on `docs/agents-less-code` before planning.
- Existing subagent guidance remains separately committed on `docs/agents-subagent-default`; not included here.
- Wording validation cannot prove future agent compliance.
