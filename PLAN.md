## Goal and scope
- Replace code-simplifier with coding-partner for goal-focused, simplicity-first implementation feedback and help when blocked.

## Excluded
- Automatic monitoring, extension changes, unrelated reviewer changes.

## Implementation details
- Replace the agent prompt; retain read-only review boundaries.
- Require feedback and blocker consultation in AGENTS.md.
- Rename the existing settings override; manually review the diff and obtain independent feedback.

## Requirements list and tracking
- [x] coding-partner replaces code-simplifier and covers goal alignment, simplicity, and blockers.
- [x] AGENTS.md requires implementation feedback and consultation when blocked, with material feedback addressed.
- [x] Settings reference the new name; diff and independent review complete. Reviewer reported no findings; git diff --check passed.
- Limitation: agent discovery and runtime instruction adherence were not exercised; verification was manual only.
