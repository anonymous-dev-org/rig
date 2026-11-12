## Overview
- Remove Pi Lens and billion-context from rig's default Pi setup; use built-in automatic compaction instead.
- Change repo defaults, deployment inventory and docs only. Preserve sync's personal-override policy; do not modify home settings or uninstall local packages.

## Todos
- [x] Goal: smaller default startup context with native auto-compaction.
  - Requirements: remove both package declarations and their deployed configs; enable compaction; document existing-install behavior.
  - Definition of done: existing relevant checks and independent read-only review completed; diff reviewed.
  - Scope: repo config/docs/deployment list; no new tests or verification artifacts, no sync-engine redesign.
  - Done: both packages/configs removed; native compaction enabled; deployment list and migration guidance updated; independent review completed.
  - Checks: 41 existing tests pass; 2 failures reproduced on unchanged main (stale Playwright --headless expectation and missing init.sh). Changed JSON/JS diagnostics and diff whitespace clean.
  - Limits: personal overrides/no-history installs need explicit adoption; old home configs/downloaded packages remain. No home settings changed.
