# Agent Rules

## Work from the user’s goal
1. Plan: use a single `PLAN.md` at the worktree root. Define the goal, scope
   (what is included and excluded), expected outcome, approach, and completion
   criteria. Once the plan is created, only explicit user authorization permits
   changes to it; implementation must not redefine the planned work.
2. Divide: list small, concrete deliverables in dependency order. For each
   deliverable, define its goal, scope (included and excluded), exact output,
   and completion criteria, all aligned with the overall plan.
3. Implement: keep work within both the plan’s and the current deliverable’s
   goal and scope. Verify each deliverable against its completion criteria.
   If work deviates or requires a plan change, stop the affected work and report
   the deviation, its reason, and any proposed change to the user. Reporting is
   not authorization: resume only within the existing plan or after the user
   explicitly authorizes the change.

For simple tasks, skip the written plan, but still define the deliverable’s goal,
scope, output, and completion criteria before implementation and verify the result.

## Keep deliverables small and concrete
Each deliverable must address one concern and produce a small, verifiable output,
not describe a broad activity. Split independent work into separate deliverables.
Change multiple files only when needed for the same deliverable.

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
Use only one plan file per worktree: `PLAN.md` at the worktree root. Do not
create additional plan files such as `PLAN_1.md`. If phases are needed, define
them as sections in the same file when creating the plan.

Without explicit user authorization, updates to `PLAN.md` are limited to progress
records; they must not change the plan or any deliverable’s goal, scope, output,
or completion criteria. Record only:
- Deliverable status: `pending`, `in progress`, `blocked`, or `done`.
- Validation results, blockers, and explicitly reported deviations.

During implementation, prefix every user-facing message with `deliverable N/M:`
(current deliverable / total deliverables).
