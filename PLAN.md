## Overview
- Finish format-on-save: spacing-only formatter changes should not force another read; add project opt-in detection for Prettier package.json, Go, Rust and Ruff; format stock write output too.
- Keep fully asynchronous formatting and the per-file mutation queue. Failures stay best-effort. Never promote an external/stale change into a valid snapshot. No Prettier runtime test, per user.
- Worktree format-followups starts from updated main and merges existing direct-line-edits implementation; main's restructured AGENTS.md and stronger edit safeguards are retained. Initial merge into old branch conflicted, aborted without changing it.
- One complete version: shared formatting path for edit/write plus safe snapshot refresh. No live sync or publication.

## Todos
- [ ] Format-on-save works without rereads for harmless spacing changes.
  - Requirement: refresh only matched baseline rows at unchanged coordinates when whitespace changes are known safe; changed text, moved lines and meaningful whitespace still reject; lifecycle resets cannot restore snapshots.
  - Requirement: detect project-configured formatters including package.json Prettier, Go, Rust and Ruff, and schedule after successful write as well as edit. No-config projects remain literal.
  - Definition of done: direct registered-tool exercises cover queued formatting, spacing-only reuse, real text/line changes rejecting, stale baselines, write-created files, detection and failure isolation. Existing relevant checks pass; diff reviewed and committed.
  - Scope note: formatter failure means approximate indentation may remain. This is best-effort formatting, not syntax correction.
  - Suggestion: lasting tests may be worthwhile for this extension, but none requested; use throwaway checks only.
