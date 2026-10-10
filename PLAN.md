# Plan: Require a new worktree for planning and implementation

Status: Implementation, review, and delivery complete.

## Goal and scope
Update `pi/.pi/agent/AGENTS.md` to require a new Git worktree before creating a plan or making changes. Keep all unrelated rules unchanged.

## Proposed approach
- Change the planning rule to require `PLAN.md` at the new worktree's repository root, never in the main checkout.
- Change the isolation rule to require creating a new Git worktree under `<repository-root>/.local/worktrees/` before planning or implementation, verifying `.local/` is ignored first, and keeping planning and implementation in that worktree.

## Preparation
- Read the current instructions and existing plan.
- Verified `.local/` is ignored.
- Created `.local/worktrees/agents-worktree-planning` on branch `docs/agents-worktree-planning`.
- Created this plan inside the new worktree; the main checkout's plan is unchanged.

## Validation results
- Reviewed the Markdown diff: both rules require planning and implementation in a new worktree; unrelated instructions are unchanged.
- `git diff --check` passed.
- No tests added or run for this documentation-only change.
- Pushed to `origin/main` and verified that the remote branch matched the local commit; the main checkout was clean.

## Tasks
1. Done — Update the planning and isolation rules in `pi/.pi/agent/AGENTS.md`. No dependencies. Check that planning and implementation both require a new worktree.
2. Done — Review the diff and run `git diff --check`. Depends on task 1. Confirm unrelated instructions are unchanged.
3. Done — Commit, integrate into `main`, and push to `origin/main`. Depends on task 2. Verify the remote branch matches the local commit.
