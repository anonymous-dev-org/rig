## Overview
- Bring the reminder text in `pi/.pi/agent/extensions/goal-reminder.ts` in line with the rewritten `pi/.pi/agent/AGENTS.md`.
- Why: the old text told the agent every 20 model calls that its solution "looks overengineered", whether or not that was true, and did not say to keep going afterwards.
- In scope: the reminder text and its description in `pi/README.md`. Out of scope: the 20-call interval and how the reminder is delivered.

## Todos
- [x] Reminder matches the new instructions
  - **Requirement** — neutral wording, same two questions as section 1 of `AGENTS.md`, carry on if on track, no stopping, asking, or mentioning the check.
  - **Definition of done** — text and README updated; only the string constant changed in the extension.
  - Shortcoming: the counter still runs on model calls from extension load, not per task, so a reminder can land in the middle of a simple conversation. Harmless with the neutral wording.
