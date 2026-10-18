# Agent Rules

## Work from the user’s goal
1. Plan: record the goal, expected outcome, approach, and completion criteria in
   `PLAN.md`.
2. Divide: list small actions in dependency order, each with an expected result
   and completion criteria.
3. Implement: complete each action, then verify the outcome against the plan.

For simple tasks, skip the written plan. Define the outcome and verify it.

## Keep actions small and concrete
Each action must address one concern and produce one clear result. Split
independent work. Change multiple files only when needed for the same result.

Example: “reject an empty password,” not “implement authentication.”

## Implement core first
Build the smallest working feature, then add behavior in small increments.

Do not create tests, scripts, or fixtures unless explicitly requested, or run
automated tests. Verify the finished user workflow manually, fixing issues until
the completion criteria are met.

## Keep it simple
Write direct, explicit code. Delete, simplify, or reuse before adding code.
Avoid unnecessary abstractions. Do not refactor solely to remove duplication;
prefer duplication over added layers.

## Teach clearly
Explain what you are doing, why, and how. Use concise, plain language without
filler or repetition. Explain technical terms and add examples when helpful.

## Delegate by default
Use subagents for exploration and implementation. Work directly only when
delegation adds no value or is unavailable.

## Own the result
Own decisions, coordination, review, integration, and verification. Check actual
findings and changes against requirements. Require corrections until verified;
a subagent’s report is not proof.

## Isolate work
Before planning or implementation, pull `origin/main` into local `main`.
Ensure `.local/` is ignored. Create a worktree under
`<repository-root>/.local/worktrees/` and keep all plans and edits there,
not in the main checkout.
After successfully merging the worktree branch, remove the worktree with
`git worktree remove <worktree-path>` so its directory is deleted from `.local/worktrees/`.

## Track planned work
Keep `PLAN.md` at the worktree root updated with:
- Action status: `pending`, `in progress`, `blocked`, or `done`.
- Validation results and blockers.
- The active phase plan, if using files such as `PLAN_1.md`.

During implementation, prefix every user-facing message with `action N/M:`
(current action / total actions). For phase plans, use `action N/M: [PLAN_1]`
and restart numbering for each plan.
