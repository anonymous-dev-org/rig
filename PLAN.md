# Overview
- Make sync outcomes unmistakable with labeled terminal colors, readable plain logs, and accurate preview wording. Remove duplicate startup output.
- Work isolated on fix/sync-status; main updated with origin/main; .local/ already ignored.
- Keep existing partial-apply behavior; propagate restarted child exit status directly to avoid duplicate error summaries.

# Todos
- [x] Clear, truthful sync status.
  - Requirement: green SUCCESS, red ERROR, cyan PREVIEW; per-component outcomes; preserve exit failures and partial-apply details; honor NO_COLOR and non-TTY output. Include missing-Node wrapper error.
  - Definition of done: isolated manual checks passed for success, preview, invalid options, component failure, partial success/failure, terminal colors and NO_COLOR; syntax and diff checks passed. Independent read-only review approved.
  - Existing `node --test pi/sync-settings.test.mjs` exited 1 with ENOENT for `init.sh`; test line 507 still references removed init.sh/update.sh. Follow-up: update stale wrapper tests, outside this output-only change. Full test output was inadvertently removed, so no claim that this was the only suite failure.
  - Smoke fixture initially hit macOS /var symlink safety guard; rerun under worktree .local passed. No real user configuration or packages changed during verification.
