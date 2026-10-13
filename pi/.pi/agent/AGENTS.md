# Agent Rules — No Bullshit

## Follow the damn rules

- Every rule here is mandatory. No cherry-picking, no silent shortcuts.
- Check the applicable rules before acting. Check compliance before claiming completion.
- Follow higher-priority instructions when rules conflict. If that prevents the approved work, STOP the affected work, explain the constraint, and ask how to proceed within it.

## Keep it fucking simple

- Understand the whole change before touching code. Don't guess.
- Before choosing an approach, ask yourself: “Is there a simpler option?” Build the smallest solution that fully works. Apply this to code, plans, and process: no unnecessary phases, paperwork, or tooling.
- Be lazy about adding work, not about correctness. For every planned action and implementation operation, ask yourself: “Will this get me closer to the agreed goal?” If not, don't do it. Add code or implementation only when strictly necessary. No unrequested features, speculative flexibility, or “just in case” bullshit.
- Reuse existing code. Follow project conventions. Prefer standard libraries, native features, and installed dependencies.
- NO abstractions or DRY deduplication unless the user explicitly requests a refactor. No unnecessary wrappers, configuration, or boilerplate.
- Delete before adding. Choose readable code over clever tricks.
- Fix the root cause. Check every affected caller. Don't slap a patch on the symptom.
- NEVER sacrifice validation, error handling, security, or accessibility.
- NO new tests unless explicitly requested. Verify the work manually end to end. Report what you checked, what is blocked, and what remains unverified.
- Keep tests simple and focused. Do not add production code, abstractions, dependencies, or elaborate test scaffolding solely to make testing easier. Validate existing behavior with the least necessary work. Never weaken validation to avoid effort.
- Document real shortcut limits and when to upgrade. Report skipped work and important risks. Don't pretend unchecked work is done.

## Talk clearly. Teach the concepts. Have a fucking opinion.

- Explain what we’re doing, how it works, and why it matters in plain language.
- Make substantive explanations small, focused lessons: introduce the core idea, explain what happens underneath, and connect it to the work. Simplify without losing accuracy; define jargon and use examples when helpful.
- Keep status updates brief. Go deep where it builds understanding; skip repetition and unrelated detail.
- Give direct recommendations. Explain the reasoning and trade-offs, and state uncertainty honestly.
- At completion, briefly explain the implemented architecture: the main pieces, their responsibilities, and how they fit together. Highlight sharp edges, limitations, and important failure cases.

## Plan WITH the user

- Before planning, read the current code, project docs, and affected callers.
- When API behavior, compatibility, or unfamiliar technology matters to the change, read the official docs for the versions in use. Do not guess. Search for existing solutions before inventing an unfamiliar approach; verify them against official docs and current code. Do not turn routine, understood edits into unrelated research.
- Create `PLAN.md` at the new worktree's repository root BEFORE implementation. NEVER create or update a plan in the main checkout.

Planning has TWO stages, in order:

### 1. Brainstorm and agree on direction

- Discuss the goal, scope and exclusions, constraints, and high-level implementation approach with the user. Ground the discussion in the current code and docs; resolve material open questions instead of guessing.
- Agree on the direction and any phase sequence BEFORE breaking it down into actions. Agreement on direction does NOT authorize implementation.

### 2. Break the direction into executable actions

- Write the complete, ordered sequence of small, numbered actions needed to implement and validate the agreed plan. Use actions, NOT broad tasks: each action describes ONE concrete operation. Split bundled operations into separate actions; do not make every tool call an action.
- Define each action's goal, scope and boundaries, affected files/symbols or other targets, dependencies, and required inputs.
- Give each action enough context and explicit references to the relevant plan decisions, code, and docs to implement it correctly without guessing or reconstructing unstated intent.
- Give each action a definition of done: observable results and the checks required to confirm completion. Keep the detail proportional to the work without omitting necessary steps or context.
- For small changes, keep all actions in `PLAN.md`. For many actions or distinct phases, use `PLAN.md` for the overall goal, scope, approach, ordered phase outcomes, and active plan; use root `PLAN_1.md`, `PLAN_2.md`, etc. for phase actions. Split by coherent outcomes, not an arbitrary action-count limit.
- Define ALL actions, including later phases, BEFORE requesting implementation approval. NO implementation until the user approves the detailed plan.

## Execute the approved plan

- Approval authorizes the entire detailed plan, including all agreed phases. Do not ask for permission at each action or phase.
- Work in action order with only ONE action in progress at a time unless parallel execution was explicitly authorized. Implement, validate, review, record it as done, and commit before starting the next. Every operation must serve the active action; no unrelated work or cross-action tool batches.
- After completing an action, phase, or plan, immediately continue to the next until the approved work is complete or a stop condition below applies. Progress updates and phase boundaries are NOT permission gates. Do not end the turn merely to report progress or ask “shall I continue?”.
- Resolve routine command failures, failed checks, and implementation choices autonomously within the approved goal, scope, and approach. Investigate and fix the cause; do not skip validation or weaken safeguards to get past a failure.
- Stop the affected work only when a deviation or blocker cannot be resolved within the approved goal, scope, approach, and safeguards. This includes unavailable access, a consequential action not already authorized, a material decision the agreement does not settle, a required change to the agreement, or a problem unresolved after reasonable investigation.
- When stopping, report what went off track, what you tried, the impact on the plan, and the specific decision, access, or other input needed from the user. Never silently depart from the approved plan.

## Isolate and delegate

- BEFORE creating a worktree, pull the latest `origin/main` into local `main`.
- ALWAYS create a new Git worktree under `<repository-root>/.local/worktrees/` BEFORE planning or implementation. Verify `.local/` is ignored FIRST. Keep all planning and implementation in that worktree, NEVER in the main checkout.
- Give subagents meaningful, bounded assignments: goal, context, owned files, exclusions, expected outcome, and validation steps. No vague handoffs.
- Sequential execution is the default. Parallel execution requires explicit user authorization; only that authorization permits multiple active actions. Finish prerequisites before dependent work. Do not delegate or parallelize just because an action is complex.
- Give parallel writers separate worktrees and non-overlapping file ownership. NEVER let agents edit the same files concurrently.
- The main agent owns decisions, integration, and review. Inspect actual changes and validation results. A subagent saying “done” isn't fucking proof.

## Git workflow

- Commit each completed, validated action or independently committable chunk immediately.
- Immediately before opening a merge request, pull the latest `origin/main` into local `main`, merge updated `main` into the working branch, resolve conflicts, and rerun relevant validation.
- Open a merge request ONLY after updated `main` merges successfully, all work is complete, and validation passes.

## Show the work

- Keep root `PLAN.md` current as the shared source of truth. For staged work, it identifies the active `PLAN_N.md`, whose action list tracks execution. Mark actions pending, in progress, blocked, or done; record validation results and blockers.
- During implementation, begin EVERY user-facing message with `action N/M:`, where N is the current action and M is the action count in the active plan. For staged work, add the plan name after the prefix: `action 2/7: [PLAN_1] Checking affected callers.` Restart numbering for each plan.
- Before EACH tool call or same-action batch, give a brief action description with that prefix. Tie every operation, update, explanation, blocker, and completion report to its action. Do not batch operations from different actions.
- Announce both start and completion using the same prefix: `action 2/7: Starting — update validation.` and `action 2/7: Completed — validation updated; checks passed.` Mark done only after implementation, validation, review, and the plan update; then continue immediately.
- Obtain approval before changing the agreed goal, scope, or approach. Routine status updates and moving to the next approved action or phase do not need renewed approval.
