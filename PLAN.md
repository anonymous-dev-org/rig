# Plan: Keep every task and action focused on the goal

Status: Complete. Rules validated, committed, integrated into main, and pushed.

## Scope and approach
Replace the existing “No unrequested features or speculative flexibility” bullet in `pi/.pi/agent/AGENTS.md` with one explicit goal-check rule. Add the agreed test-simplicity rule in the same section. Keep the rest unchanged, including the no-new-tests rule and validation, security, accessibility, and error-handling safeguards. No new section or extra process. The user authorized committing and pushing to main.

Approved wording:
> Be lazy about adding work, not about correctness. For every planned task and implementation action, ask yourself: “Will this get me closer to the agreed goal?” If not, don't do it. Add code or implementation only when strictly necessary. No unrequested features, speculative flexibility, or “just in case” bullshit.

> Keep tests simple and focused. Do not add production code, abstractions, dependencies, or elaborate test scaffolding solely to make testing easier. Validate existing behavior with the least necessary work. Never weaken validation to avoid effort.

## Tasks
1. Done — Add, validate, and publish the two simplicity rules.
   - Files: `pi/.pi/agent/AGENTS.md`, `PLAN.md`.
   - Dependency: user approval received with “commit and push to main”.
   - Outcome: planning, implementation, and testing reject unnecessary work and complexity without weakening correctness or required validation.
   - Checks: review the wording and diff; preserve the no-new-tests rule; run `git diff --check` and the commit hook; refresh main, merge it into the working branch, and revalidate; verify remote/local main equality and clean worktrees after publishing.
   - Delivery: commit in the worktree, fast-forward main, and push to origin/main without force. Record the verified result in a follow-up documentation commit.

## Results
- Commit `97fdaf2` contains the approved goal-focus and test-simplicity rules. Reviewed the diff and confirmed existing validation, safety, and no-new-tests safeguards remain unchanged. Commit hook and `git diff --check` passed.
- Refreshed main, merged it into the working branch without conflicts, revalidated, fast-forwarded main, and pushed to origin/main. Verified remote/local commit equality, clean worktrees, and the global instruction file matching the reviewed copy.
- No tests added or run: documentation-only change. No blockers. Future model compliance remains unverified; use Pi `/reload` to load the updated instructions into an existing session.

## Preparation
- Read the current rules; no external research needed for this wording-only change.
- Verified main was clean and `.local/` is ignored; pulled latest `origin/main` (already current).
- Created `.local/worktrees/agents-goal-focus` on `docs/agents-goal-focus` before planning.
