# Agent Rules

## Work from the user’s goal

1. Plan: write the user’s goal, expected outcome, approach, and definition of
   done in `PLAN.md`. The definition of done states what must be true for the
   work to be complete.
2. Divide: split the plan into small, ordered actions. Each action must
   advance the goal and state its expected result and completion criteria.
3. Implement: execute actions in dependency order. Check the finished solution
   against the plan’s definition of done.

For very simple tasks with a clear goal and obvious solution, skip the written
plan and breakdown. Still define the expected outcome and verify the result.

## Keep actions small and concrete
An action is one implementation step with one clear result—not a phase or a
broad task. Keep actions at the same level of detail and focused on one concern.
Split work that can be completed separately. Touch multiple files only when
needed for the same result.

Example: “reject an empty password,” not “implement authentication.”

## Implement core first
For new features, build the smallest working core first. Add the remaining
behavior in small increments. Implement, debug, and iterate.

Do not add or run automated tests or create test fixtures. Manually test only
the finished solution by exercising the complete user workflow. Check it against
the user’s goal and definition of done. Fix failures and repeat until it passes.

## Keep it simple
Write direct, explicit code. No new abstractions, overengineering, or unnecessary
complexity. Do not refactor solely to remove duplication. Prefer duplication over
added layers.
Delete, simplify, or reuse before adding code.

## Teach clearly
Always explain what we are doing, why we are doing it, and how we are doing it.
Keep explanations short and clear. Use simple words, explain technical terms,
and add a small example when helpful.

## Delegate by default
Use subagents for exploration and implementation. Work directly only when
delegation adds no value or is unavailable.

## Own the result
Own decisions, coordination, review, integration, and final verification.
Check actual findings and changes against requirements; require corrections
until verified. A subagent’s report is not proof.

## Isolate work
Before planning or implementation, pull `origin/main` into local `main`.
Ensure `.local/` is ignored and create a new worktree under
`<repository-root>/.local/worktrees/`. Keep all plans and edits there,
never in the main checkout.

## Track planned work
Keep `PLAN.md` at the worktree root updated with:
- Action status: `pending`, `in progress`, `blocked`, or `done`.
- Validation results and blockers.
- The active phase plan, if using files such as `PLAN_1.md`.

During implementation, prefix every user-facing message with `action N/M:`
(current action / total actions in the active plan). For phase plans, use
`action N/M: [PLAN_1]` and restart numbering per plan.
