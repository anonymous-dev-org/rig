## Overview
- Run Astra and Fable concurrently in the background without blocking the parent. Keep one pair active, deliver advisory findings safely even when idle, cancel on session replacement, and log each review outcome.
- Scope: paired-review extension and its documentation; no live deployment or paid model calls.
- Use Pi's steer queue with triggerTurn for safe busy/idle delivery. Evidence is captured at launch; source reads remain live, so feedback must be rechecked.

## Todos
- [x] Background reviews and observable outcomes work end to end.
  - Requirement: preserve cadence and read-only reviewers; nonblocking launch; one pair at a time; session-safe delivery; log starts, duration, approvals, findings, failures and cancellation.
  - Definition of done: local controlled execution verifies concurrency, parent progress, delivery options, clean/error/cancellation paths and logging; independent review addressed; documentation updated; commit created.
  - Main was clean and updated with origin/main; work isolated in .local/worktrees/background-review.
  - Verified with throwaway controlled execution: nonblocking concurrent start, shared evidence, one active pair, read-only tools, findings/clean/error paths, private log permissions and durations, pre-navigation/shutdown/aborted-turn cancellation, restart, and system-feedback projection.
  - Installed Pi loader accepts the extension; actual sendCustomMessage routes busy sessions to steer and idle sessions to a new run, checked without model calls.
  - Independent review found navigation could race a background result; reset now runs before tree/switch/fork hooks as well as after navigation. Cancelled navigation also cancels the pair, intentionally.
  - Existing sync-settings suite: 41 passed, 2 unrelated failures (stale Playwright --headless expectation and missing init.sh). These files are unchanged; leave repairs outside this task.
  - Logging is append-only without rotation and includes finding text, not full transcripts. Future rotation or full transcripts are optional follow-ups. No timeout added; a stuck reviewer holds the one active pair until cancellation.
  - Follow-up review caught the same race during idle manual compaction. Cancel only for reason=manual; controlled checks confirm manual cancellation and automatic threshold-compaction survival. Findings addressed.
  - Documentation updated with background delivery, log inspection and lifecycle behavior. Verified without paid model calls or live installation. Commit on task branch is the handover; deployment still requires full Pi sync and reload.
