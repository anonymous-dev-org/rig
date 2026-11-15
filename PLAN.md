# Overview
- Replace specialist reviewers and the single-model watchdog with parallel Astra/Fable reviews every 20 completed main-session tool calls.
- Same prompt and evidence for both; read-only agents return {require_changes:boolean,message?:string}. Collect both before delivering one message containing only actionable findings; clean pairs stay silent.
- Work on paired-review in .local/worktrees/paired-review; main was updated and .local/ is ignored. No live deployment or model substitution.
- Interpret one reviewer flagging an issue as sufficient; do not require agreement. Use Pi system-role projection for developer feedback (provider adapters map the role).

# Todos
- [x] One working paired review mechanism replaces specialist agents.
  - Requirement: exact Astra/Fable models, parallel execution, shared goal/complexity/correctness/security prompt, structured results, silent clean reviews, combined findings, visible failures, cancellation, no nested reviews.
  - Definition of done: real Pi Agent smoke checks with a local fake provider passed cadence/remainder, parallel collection, identical prompts, read-only tools, all clean/mixed outcomes, malformed results, missing models, cancellation, stale context, session reset and child guard. Syntax/diff checks and isolated sync preview passed.
  - Independent Fable review addressed: preserve completed findings when the other reviewer times out; capture the parent signal before context invalidation; update stale compatibility comment. Timeout smoke check passed.
  - Bare public Pi Agents avoid child-session infrastructure. Old watchdog disabled; seven definitions and overrides removed. Full sync explicitly retires deployed definitions with backups, even without prior inventory.
  - Reviews coalesce tool batches crossing multiple thresholds and retain the remainder; nested tool_result events count as in the existing watchdog. Evidence is bounded, not a full history or Git diff.
  - Existing sync suite: 41/43 pass; unrelated failures at pi/sync-settings.test.mjs:387 (stale Playwright --headless expectation) and :513 (removed init.sh). Full log: .local/sync-settings-test.log. No test changes.
  - Not live-deployed; native provider calls from the extension were not exercised. Public Agent transport and event behavior were checked locally without external model calls. Full Pi sync and reload are needed to activate.
  - Follow-up suggestion: add lasting regression coverage for this mechanism if requested. Review usage is not currently included in the main session's token totals.
- [x] Footer shows reviewing only while the paired review is running.
  - Requirement: plain reviewing text, no spinner or additional model messages; clear on completion, failure, cancellation and session reset.
  - Definition of done: local real-Agent/fake-provider lifecycle checks passed success, failure, cancellation, reset and shutdown; footer renders fit widths 9/20/80/120 (normal truncation at 9). Independent review found no issues; diff checks passed.
  - Continue the existing unmerged paired-review worktree; origin/main is up to date. Use native setStatus and the existing custom footer's status map, without extra events or timers.
