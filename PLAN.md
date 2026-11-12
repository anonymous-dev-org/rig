## Overview
- Sync must apply repo removals as well as additions/updates. Retire previously managed files, JSON fields and package declarations; preserve unrelated user additions.
- Bootstrap known retired skills from the archived inventory and known removed Pi configs/packages, even without old deployment history. Back up retired files outside discovery paths; do not uninstall package downloads or run live home sync automatically.
- Keep selected-component boundaries, path/link refusal, preview, concurrency guards and recovery. No new tests/probes or verification artifacts.

## Todos
- [x] Goal: retired managed resources disappear on sync.
  - Verified: independent review, syntax checks and read-only Pi sync preview passed; home unchanged. Added the former bro skill and normalized destination guards.
  - Requirements: previous deployment inventory drives future removals; explicit archived inventory handles existing 33 skills; removed Pi configs retired; private unknown files preserved; backup before removal.
  - Definition of done: manual/independent review and existing checks pass apart from recorded baseline failures.
  - Scope: selected managed files only; no recursive deletion of user directories.
- [x] Goal: JSON deletions follow repo changes.
  - Verified: ownership/recovery reviewed; existing suite 41/43 passes. Remaining failures are unchanged: stale Playwright --headless expectation and missing init.sh.
  - Limit: legacy hash-only inventory cannot identify historical JSON fields; future syncs save repo baselines. Package downloads are not uninstalled.
  - Requirements: use previous repo baselines to distinguish retired fields/packages from additions; track copied JSON defaults; migrate legacy hash inventory; handle known retired package identities without history.
  - Definition of done: recovery/ownership paths reviewed and existing suite run.
  - Scope: configured declarations, not downloaded package uninstallation.
- [x] Goal: docs describe complete sync ownership accurately.
  - Verified: docs and diff reviewed; retirement, backups and legacy-history limits documented.
  - Requirements: explain retirement/backups and remaining local additions; remove stale no-removal statements.
  - Definition of done: docs and diff reviewed; limitations recorded.
  - Scope: affected sync docs only.
