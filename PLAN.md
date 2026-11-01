## Goal and scope
- Make coding-partner strictly review work against PLAN.md in its launch worktree.
- Require independent checks of the parent handoff using clear, simple rules.

## Excluded
- Runtime enforcement, model/tool changes, other agents, and unrelated cleanup.

## Implementation details
- Require worktree identification and reading its root PLAN.md before review.
- Check parent claims against plan, files, diffs, and available verification evidence.
- Block approval for missing evidence or unresolved conflicts; require user approval and a plan update for scope changes.
- Preserve simplicity guidance and bounded advisory behavior.
- Review the prompt manually, consult coding-partner, and run git diff --check; create no verification artifacts.

## Requirements list and tracking
- [x] Prompt requires reading the launch worktree's root PLAN.md, not a parent summary or another checkout's plan.
- [x] Prompt requires checking parent context and reporting unsupported claims and conflicts.
- [x] Prompt blocks approval when plan/context is missing or scope conflicts remain; scope changes need user approval and a plan update.
- [x] Prompt retains simple, in-scope advice and reports plan/evidence references.
- [x] Independent coding-partner review found no material issues; git diff --check passes.
- Limitation: prompt rules guide model behavior; they are not runtime enforcement.
