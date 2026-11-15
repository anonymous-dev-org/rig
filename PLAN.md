# Overview
- Replace the static every-20-model-call reminder with automatic independent pair review of goal alignment, unnecessary complexity, simpler safe solutions, and correctness.
- Use installed pi-subagents watchdog rather than custom launch/orchestration code. Keep clean reviews silent and route actionable findings to the main agent.
- Scope: managed settings, reviewer guidance, reminder retirement, deployment inventory, documentation. No live HOME deployment, package changes, or paid provider validation.
- Main pulled/current at 22d5356; .local/ ignored; worktree feat/automatic-pair-review created from main.

# Todos
- [x] Automatic pair review replaces the fixed reminder.
  - Requirement: enable read-only watchdog for the main session, retain the user's goal, review trajectory/complexity/correctness, and return only actionable evidence-backed findings.
  - Definition of done: isolated settings/guidance and lifecycle checks pass, existing relevant checks run, independent read-only review completed, diff checked and committed.
  - Decision: native cadence counts tool results, not messages/model requests; use everyNTools: 20 plus native changed-code end-of-run review. Native boundary reviews are gated on changes; cadence can review work without edits.
  - Decision: inherit current main model/thinking, disable child watchdogs, and use standing WATCHDOG.md guidance to mark actionable findings high importance so they reach the main agent.
  - Decision: retain goal-reminder.ts as a no-op compatibility asset so full sync disables existing installs without deleting an existing file or adding retirement machinery.
  - Verification must not invoke a paid provider: exercise installed watchdog with mocked model responses and real settings/guidance, then document live-model judgment as unverified.
  - Verified installed watchdog offline with deterministic model responses: config/guidance loading, inherited model/thinking, read-only tool set, no request before 20 tool results, no message on clean review, actionable high-importance finding steered to main, old reminder registers no hook. No provider requests.
  - Verified managed inventory contains guidance and no-op reminder, every Pi manifest path exists, sync enforces new enabled/scope/guidance/children defaults, script syntax and git diff --check pass. Added WATCHDOG.md to .gitignore shared-resource allowlist.
  - Existing node --test pi/sync-settings.test.mjs: 41/43 pass. Unrelated existing failures: obsolete --headless expectation at line 387 and removed init.sh reference at line 513. Their source/test inputs are unchanged; leave repairs out of scope.
  - Independent scout review 2691d345: full diff/new guidance plus installed runtime source; no blocking findings. Static review only.
  - Verification adjustment: direct Node import needs Pi's host peer-package aliases; scratch check used existing installed peers. Updated the mock to current system-message transcript format and waited for its immediate completion rather than runtime idle (cadence retains pending evidence). Scratch code removed after successful check.
  - Full-sync preview declined the uncommitted worktree as designed; no installation attempted. Source inventory and merge behavior verified directly instead.
  - Known limits: native cadence is per-run tool-result count; busy reviews can skip opportunities. Evidence is bounded, not full history. Importance routing and quality depend on model judgment; real-provider review is not exercised.
  - Ready for handover on feat/automatic-pair-review. Live HOME configuration and main checkout remain unchanged; merge/deployment require approval.
