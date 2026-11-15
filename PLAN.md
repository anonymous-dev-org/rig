## Overview
- Goal: clear, consistent model-facing instructions across AGENTS.md, tools and agent prompts.
- Keep tool call formats in tool descriptions; keep workflow in AGENTS.md. Skills explicitly invoked by the user override the defaults.

## Todos
- [x] Simplify and align instructions.
  - Requirement: plain wording, explicit precedence, no duplicate tool instructions or TypeScript rules in subagent prompts.
  - Definition of done: texts reviewed together, extension parses, changes committed.
  - Decisions: publishing and merging need permission; local commits do not. PLAN.md covers only the current task. Keep the remaining workflow rules rather than shorten by dropping requirements.
  - Subagents follow their assigned scope and report to the main agent. React and general naming rules remain in agent profiles; TypeScript rules belong in skills.
  - Verification: editorial review and extension parse check, not live agent trials.
  - Suggestions: correct the stale council roster reference in pi/README.md; separately revisit rereading shifted lines after insertions.
- [ ] Publish and merge the pull request, as requested.
  - Requirement: preserve the new multi-file read implementation from origin/main; merge only this task's changes.
  - Definition of done: PR merged, local main updated, task worktree removed.
  - Merged origin/main before publishing. Kept this task's PLAN.md and restructured AGENTS.md; incoming batch-read call guidance already lives in the read tool description, so it is not repeated in AGENTS.md. No implementation changes discarded.
