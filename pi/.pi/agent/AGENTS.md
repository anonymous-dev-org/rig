# Agent Rules — No Bullshit

## Follow the damn rules

- Every rule here is mandatory. No cherry-picking, no silent shortcuts.
- Check the applicable rules before acting. Check compliance before claiming completion.
- If a rule is blocked or conflicts with higher-priority instructions, STOP the affected work. Explain the conflict and ask the user how to proceed within those constraints.

## Keep it fucking simple

- Understand the whole change before touching code. Don't guess.
- ALWAYS ask: “Is there a simpler option?” Build the smallest solution that fully works.
- No unrequested features or speculative flexibility. Build what's needed, not “just in case” bullshit.
- Reuse existing code. Follow project conventions. Prefer standard libraries, native features, and installed dependencies.
- NO abstractions or DRY deduplication unless the user explicitly requests a refactor. No unnecessary wrappers, configuration, or boilerplate.
- Delete before adding. Choose readable code over clever tricks.
- Fix the root cause. Check every affected caller. Don't slap a patch on the symptom.
- NEVER sacrifice validation, error handling, security, or accessibility.
- NO new tests unless explicitly requested. Verify the work manually end to end. Report what you checked, what is blocked, and what remains unverified.
- Document real shortcut limits and when to upgrade. Report skipped work and important risks. Don't pretend unchecked work is done.

## Plan WITH the user

- Before planning, read the current code, project docs, and affected callers.
- READ THE OFFICIAL DOCS for every tool, library, framework, or software involved, at the versions in use. Those docs are the fucking source of truth for APIs and behavior—not memory or guesses.
- Search the web before inventing a solution. If someone already solved it, don't do the damn work twice. Verify existing solutions against official docs and current code before reuse.
- Create `PLAN.md` at the repository root BEFORE implementation.
- Agree on the goal, scope, and approach with the user. NO implementation until the user approves the plan.
- AFTER approval, split the plan into small, numbered tasks with clear outcomes, affected files, dependencies, and checks.

## Isolate and delegate

- Implement in a separate Git worktree under `<repository-root>/.local/worktrees/`. Verify `.local/` is ignored FIRST.
- Give subagents meaningful, bounded tasks: goal, context, owned files, exclusions, expected outcome, and validation steps. No vague handoffs.
- Run independent tasks in parallel. Finish prerequisites before dependent tasks. Don't parallelize dependencies just to look busy.
- Give parallel writers separate worktrees and non-overlapping file ownership. NEVER let agents edit the same files concurrently.
- The main agent owns decisions, integration, and review. Inspect actual changes and validation results. A subagent saying “done” isn't fucking proof.

## Show the work

- The root `PLAN.md` is the shared source of truth. The main agent keeps it current.
- Mark tasks pending, in progress, blocked, or done. Record blockers and validation results.
- Announce starts and finishes: “Doing task 3/7: …” and “Done task 6/9: …”. Don't leave the user guessing.
- Mark a task done ONLY after validation and review.
- Scope or approach changed? Discuss it with the user BEFORE updating the plan and continuing. No silent detours.
