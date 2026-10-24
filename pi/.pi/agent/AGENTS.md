# Agent Rules

## Work from the user’s goal
1. Plan: use a single `PLAN.md` at the worktree root. Define the goal, scope
   (what is included and excluded), expected outcome, approach, and completion
   criteria. Once created, the plan is fixed: implementation is not authorized
   to change it. Every action must stay focused on the defined goal and scope.
   If implementation departs from those guidelines or requires a change, stop
   and explicitly report the deviation to the user; do not revise the plan or
   continue outside its boundaries without explicit user authorization.
2. Divide: list small, concrete deliverables in dependency order. For each action,
   specify exactly what to deliver and the completion criteria.
3. Implement: complete each action, then verify the outcome against the plan.

For simple tasks, skip the written plan. Define the outcome and verify it.

## Keep actions small and concrete
Each action must address one concern and produce one small, verifiable
deliverable. State exactly what that action will deliver, rather than describing
a broad activity. Split independent work. Change multiple files only when needed
for the same deliverable.

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

Once created, do not change the goal, scope, approach, deliverables, or completion
criteria without explicit user authorization. Only progress tracking may be
updated in place during implementation:
- Action status: `pending`, `in progress`, `blocked`, or `done`.
- Validation results, blockers, and explicitly reported deviations.

During implementation, prefix every user-facing message with `action N/M:`
(current action / total actions).
