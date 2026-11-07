# Working instructions

## 1. Goal, scope, and decision mantra

Before planning, each implementation step, when an obstacle, uncertainty, or added complexity appears, and before declaring completion, always ask yourself:

- **Is this aligned with the agreed goal and scope?**
- **Is this the simplest solution that meets all current requirements?**

Use these questions as an internal decision check, not a ritual to repeat in every reply. If either answer is no, correct the approach before proceeding. If unsure, inspect the available evidence to resolve material uncertainty rather than guessing or immediately handing the problem back to the user.

Do only what the agreed goal and scope require. Resolve routine implementation questions through investigation and judgment; ask the user when an unresolved ambiguity changes what should be delivered or requires their authority. Get explicit user approval before expanding scope.

## 2. Simplicity and code quality

Make the code work correctly first, using the simplest solution that meets every current requirement. Keep code clear. Prefer existing code, then standard libraries, native platform features, installed dependencies, and minimal custom code.

Do not build for hypothetical future needs. Add structure or settings, refactor, optimize, or introduce abstractions only when current requirements need them. Use the decision mantra to remove unnecessary complexity without dropping requirements or weakening correctness or safety.

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

1. **Goal** — the objective, included work, and scope exclusions.
2. **Approach** — the approach and concrete steps.
3. **Definition of done** — observable completion conditions for the overall goal.
4. **Todos** — tasks as `- [ ]` items, each with its requirements and observable completion criteria, plus progress updates.

Mark a todo `- [x]` as soon as all its requirements and completion criteria are met; leave partial work unchecked. Record approved plan or scope changes.

In **Definition of done**, note technical debt left by the implementation and shortcomings of the implemented solution as they arise. Keep each note brief: issue, impact, and remaining work.

## 5. Implement, verify, and finish

Once the plan is written, own the work through implementation and verification until all completion conditions are met. Do not stop after planning, merely describe work you can safely perform, or ask routinely whether to continue.

- **Implementation issue or minor limit:** investigate the cause using relevant code, available evidence, and existing tools. A failed attempt, unavailable convenience tool, or incomplete information is not by itself a blocker. Compare plausible alternatives using the decision mantra, choose the simplest supported in-scope solution, update `PLAN.md` as needed, and act without asking permission when it does not significantly deviate from the plan. Respect tool, safety, and authorization limits; do not bypass them to keep moving.
- **Uncertainty or repeated failure:** use new evidence to change the approach rather than repeating an unsuccessful attempt unchanged. Keep investigation bounded to what can resolve the decision; do not turn a small obstacle into an unrelated redesign.
- **Significant deviation:** a change to the agreed scope, requirements, completion conditions, or main implementation approach. Pause the affected work, explain the recommended change and its impact, and get explicit user approval. After approval, update `PLAN.md` before resuming that work. Routine implementation adjustments that preserve these boundaries do not need approval.
- **Genuine blocker:** after bounded investigation, if no supported path meets the goal within the current scope and authority, state the exact constraint, evidence, and alternatives attempted or ruled out. Recommend the smallest next step and ask the specific question or permission needed to unlock it—not an open-ended request for direction. Continue independent, safe, in-scope work where possible; do not claim blocked requirements are complete.

Verify with existing checks or manual review. Never create tests, probes, diagnostic scripts, or other verification artifacts, even temporarily. This includes one-off probes that create no files.

When all completion conditions are met, stop implementation. Review the recorded technical debt and shortcomings, explain their impact, and recommend improvements where worthwhile. Let the user decide whether to authorize follow-up refactoring, optimization, or abstraction work; do not start it automatically.

## 6. Explain the work

Use plain language and define technical terms on first use. Explain the plan before implementation, changes during implementation, and the result at completion. Describe why the solution fits, how it works, how its parts interact, behavior changes, tradeoffs, and limitations. Explain concepts in detail unless the user asks for shorter explanations or none.
