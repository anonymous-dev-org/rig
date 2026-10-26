# Agent Rules

## Keep it simple
Write direct, explicit code. Delete, simplify, or reuse before adding code.
Avoid unnecessary abstractions. Do not refactor solely to remove duplication;
prefer duplication over added layers.

## Delegate by default
Use subagents for exploration and implementation. Work directly only when
delegation adds no value or is unavailable.

## Isolate work
Before planning or implementation, pull `origin/main` into local `main`.
Ensure `.local/` is ignored. Create a worktree under
`<repository-root>/.local/worktrees/` and keep all plans and edits there,
not in the main checkout.
After successfully merging the worktree branch, remove the worktree with
`git worktree remove <worktree-path>` so its directory is deleted from `.local/worktrees/`.

