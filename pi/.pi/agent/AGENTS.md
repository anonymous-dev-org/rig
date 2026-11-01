# Working instructions

## 1. Goal and scope

Do only what the agreed goal and scope require. Before planning and each implementation step, check that the work is necessary and in scope. Ask if scope is unclear; get explicit user approval before expanding it.

## 2. Simplicity and code quality

Make the code work correctly first, using the simplest solution that meets every current requirement. Keep code clear. Prefer existing code, then standard libraries, native platform features, installed dependencies, and minimal custom code.

Do not build for hypothetical future needs. Add structure or settings, refactor, optimize, or introduce abstractions only when current requirements need them. Before each implementation step and whenever complexity grows, check for a simpler sufficient solution and use it.

## 3. Worktree and delegation

Before planning or implementation:

1. Pull `origin/main` into local `main`.
2. Ensure `.local/` is ignored by Git.
3. Create a worktree on a task branch under `<repository-root>/.local/worktrees/`. Keep all plans and edits in that worktree, not the main checkout.

Use subagents for separable exploration or implementation work, or useful independent review. Work without subagents only when none of these applies.

After successfully merging the branch, remove its worktree with `git worktree remove <worktree-path>`.

## 4. Plan and track

Before implementation, create or update the single `PLAN.md` at the worktree root. Never create additional plan files in that worktree. Skip `PLAN.md` only for mechanical edits with known results that require no investigation or design decisions.

Write `PLAN.md` as brief working notes, not a report. Use short bullets and direct wording. Omit filler, repetition, and lengthy explanations. Keep only what is needed to implement and track the current task. Update existing entries instead of appending repetitive history; remove obsolete details.

Use these sections in order:

1. **Goal and scope** — the objective and included work.
2. **Excluded** — work outside the scope.
3. **Implementation details** — the approach and concrete steps.
4. **Requirements list and tracking** — requirements as `- [ ]` items, each with an observable completion condition, plus progress updates.

Mark an item `- [x]` as soon as its completion condition is met; leave partial work unchecked. Record approved plan or scope changes. Record technical debt and implementation shortcomings as they arise, including their impact and remaining work.

## 5. Implement, verify, and finish

Once the plan is written, implement and verify it until all completion conditions are met. Do not stop after planning or ask routinely whether to continue.

- **Implementation issue:** pause implementation, analyze the cause, and evaluate solutions against the goal and scope. Choose the simplest sufficient solution without unnecessary complexity. If it stays within scope and does not significantly deviate from the plan, update `PLAN.md` as needed and resume without asking permission.
- **Significant deviation:** a change to the agreed scope, requirements, completion conditions, or main implementation approach. Pause, explain the change and its impact, and get explicit user approval. After approval, update `PLAN.md` before resuming implementation.
- **Blocked:** if no solution meets the goal within the current scope and plan, explain the blocker and ask the user how to proceed.

Verify with existing checks or manual review. Never create tests, probes, diagnostic scripts, or other verification artifacts, even temporarily. This includes one-off probes that create no files.

When all completion conditions are met, stop implementation. Review the recorded technical debt and shortcomings, explain their impact, and recommend improvements where worthwhile. Let the user decide whether to authorize follow-up refactoring, optimization, or abstraction work; do not start it automatically.

## 6. Explain the work

Use plain language and define technical terms on first use. Explain the plan before implementation, changes during implementation, and the result at completion. Describe why the solution fits, how it works, how its parts interact, behavior changes, tradeoffs, and limitations. Explain concepts in detail unless the user asks for shorter explanations or none.
