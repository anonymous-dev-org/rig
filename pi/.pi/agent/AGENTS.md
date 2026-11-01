# Core principles

## 1. Goal and scope

**Do only what the agreed goal and scope require.**

Before planning and each implementation step, ask: "Is this needed for the goal and within scope?" Skip unrelated work. Ask if scope is unclear. Get explicit user approval before expanding it. Stop when the goal and completion conditions are met.

## 2. Simplest sufficient solution

**Choose the simplest approach that meets every requirement correctly.**

Build for current requirements, not future possibilities. Prefer existing code, then standard libraries, native platform features, installed dependencies, and minimal custom code. Add structure or settings only when current requirements need them. Before each implementation step and whenever complexity grows, ask: "Is there a simpler solution that meets every requirement?" If so, simplify before continuing.

## 3. User understanding

**Explain why the solution fits and how it works, not just what changed.**

Use plain language and define technical terms on first use. Explain plans before implementation and changes during implementation and at completion. Describe internal steps, how parts interact, behavior changes, tradeoffs, and limits. Explain concepts in detail unless the user asks to shorten or skip explanations.

## 4. Visible progress

**Keep `PLAN.md` as the current record of requirements and progress.**

Before implementation, create `PLAN.md` at the worktree root. Keep only one `PLAN.md` per worktree; update the existing file rather than creating additional plans. Skip the file only for mechanical edits with known results requiring no investigation or design decisions.

Structure it with these sections in order:

1. **Goal and scope** — the precise objective and included work.
2. **Excluded** — work explicitly outside the scope.
3. **Implementation details** — the planned approach and concrete implementation steps.
4. **Requirements list and tracking** — detailed requirements as `- [ ]` items, each with an observable completion condition (its definition of done), and progress updates.

Mark each requirement `- [x]` as soon as its definition of done is met; leave partial work unchecked. Record approved scope changes. Record technical debt and implementation shortcomings as they arise, with their impact and remaining work.

## 5. Execute the plan to completion

**Once the plan is written, proceed with implementation and verification until all completion conditions are met.**

Do not stop after planning or at intermediate steps to ask whether to continue. If implementation significantly deviates from the plan, pause, explain the deviation and its impact, and get user approval before proceeding with a revised plan.

When an implementation issue arises, pause implementation and analyze its cause before making further changes. Evaluate possible solutions against the agreed goal and scope, and choose the simplest sufficient solution without adding unnecessary complexity. Update `PLAN.md` as needed and resume implementation if the solution stays within scope and does not significantly deviate from the plan; otherwise, seek user approval first.

# Required workflow

Before planning or implementation, pull `origin/main` into local `main`. Ensure `.local/` is ignored and create a worktree under `<repository-root>/.local/worktrees/`. Keep all plans and edits there, not in the main checkout. After successfully merging the branch, remove its worktree with `git worktree remove <worktree-path>`.

Use subagents for exploration and implementation. Work directly only when there is neither a separable task nor a useful independent review to delegate.

Verify with existing checks or manual review. Never create tests, probes, diagnostic scripts, or other verification artifacts, even temporarily. This includes one-off probes that create no files.
