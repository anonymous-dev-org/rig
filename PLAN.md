## Overview
- Replace paired automatic review with one Sol 6.1 high-thinking reviewer every 40 assistant responses.
- Score only scope/goal focus, simplicity, and code quality; gather evidence from the session transcript and source. Deliver reviewer text verbatim as developer feedback.
- Keep background execution, cancellation, and usage tracking. No permanent test infrastructure.

## Todos
- [x] Single-reviewer scoring works end to end.
  - Requirement: openai/gpt-6.1-sol with high thinking; transcript path and captured branch entry; read-only context gathering; three explained /10 scores; unchanged final text delivered every review.
  - Definition of done: disposable runtime checks cover cadence, reviewer configuration, transcript pointers, exact output delivery, cancellation and failures; diff checked and committed.
  - Verified: Bun build passed; disposable harness executed extension handlers with a simulated Agent and passed cadence/non-assistant exclusion, one reviewer/high thinking, read-only tools, transcript/entry pointers, whitespace-preserving output, usage recording, system projection, missing transcript/model, empty result, overlap prevention, and navigation cancellation/stale suppression. Whitespace check passed.
  - Applied only the extension and WATCHDOG.md to live ~/.pi/agent; byte comparisons match repository. Backup: /tmp/pi-review-backup.A4jDCj. /reload required to activate extension changes.
  - Limits: no paid model call or full TypeScript typecheck; actual scoring quality and autonomous transcript navigation remain to observe on the next scheduled review. Scores are prompt-enforced, not parsed or rewritten, so output remains verbatim.
