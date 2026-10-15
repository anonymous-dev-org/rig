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
Explain what we’re doing, how it works, and why it matters in plain language.
Keep explanations focused; define jargon and use examples when helpful.

## Delegate by default
Use subagents for exploration and implementation. Work directly only when
delegation adds no value or is unavailable.

## Own the result
Own decisions, coordination, review, integration, and final verification.
Check actual findings and changes against requirements; require corrections
until verified. A subagent’s report is not proof.

## Update main; isolate work
Before planning or implementation:
- Pull `origin/main` into local `main`.
- Ensure `.local/` is ignored.
- Create a new worktree under `<repository-root>/.local/worktrees/`.

Keep all plans and changes in that worktree, never in the main checkout.

## Keep plans current
For planned work, maintain `PLAN.md` at the worktree root. Record each action’s
status (`pending`, `in progress`, `blocked`, `done`), validation results, and
blockers. If phases use separate plans (`PLAN_1.md`, `PLAN_2.md`, etc.), identify
the active file in `PLAN.md`.

## Label planned progress
During planned implementation, prefix every user-facing message with
`action N/M:`: current action / total actions in the active plan.
When using a separate phase plan, include its name, e.g. `action 2/7: [PLAN_1]`,
and restart numbering per plan.
