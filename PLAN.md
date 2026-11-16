## Overview
- Finish format-on-save: spacing-only formatter changes should not force another read; add project opt-in detection for Prettier package.json, Go, Rust and Ruff; format stock write output too.
- Keep fully asynchronous formatting and the per-file mutation queue. Failures stay best-effort. Never promote an external/stale change into a valid snapshot. No Prettier runtime test, per user.
- Worktree format-followups starts from updated main and merges existing direct-line-edits implementation; main's restructured AGENTS.md and stronger edit safeguards are retained. Initial merge into old branch conflicted, aborted without changing it.
- One complete version: shared formatting path for edit/write plus safe snapshot refresh. No live sync or publication.

## Todos
- [x] Format-on-save works without rereads for harmless spacing changes.
  - Requirement: refresh only matched baseline rows at unchanged coordinates when whitespace changes are known safe; changed text, moved lines and meaningful whitespace still reject; lifecycle resets cannot restore snapshots.
  - Requirement: detect project-configured formatters including package.json Prettier, Go, Rust and Ruff, and schedule after successful write as well as edit. No-config projects remain literal.
  - Definition of done: direct registered-tool exercises cover queued formatting, spacing-only reuse, real text/line changes rejecting, stale baselines, write-created files, detection and failure isolation. Existing relevant checks pass; diff reviewed and committed.
  - Complete: direct-tool checks passed and independent review confirmed the raw-string fix with no remaining actionable issues. No dedicated extension test suite exists; unrelated settings/sync suites were not rerun.
  - Decisions: `write` wraps stock operations inside the existing queue (no double lock), invalidates old snapshots and never creates a new one. Both tools use one shared scheduler.
  - Decisions: extension allowlists select applicable formatters in mixed repos. Prettier needs its own config or a package.json config key, not just a dependency. Ruff recognises ordinary table headers; unusual TOML inline/quoted-key forms are not detected.
  - Decisions: Rust uses frozen/offline Cargo metadata to resolve edition/workspace inheritance; skip formatting on metadata failure rather than assume the wrong edition. Config-only Rust uses rustfmt defaults/config.
  - Decisions: spacing normalisation is conservative (JS/TS, JSON/JSONC, Go, Rust only); preserve strings exactly and retain strict guards for JSX/TSX, regex rows, multiline/raw literals, block-comment files and whitespace-sensitive languages. Matching original hashes and unchanged row count are required.
  - Review: fixed Rust raw byte/C string exclusion identified by independent reviewer. Also bounded runtime with forced termination and streaming output size to avoid indefinitely blocked queues/unbounded memory.
  - Verification: .local/check.log covers Biome reuse/text changes/stale baseline, write/no implicit snapshot, literal no-config, native Go, Rust 2024. .local/edge-check.log covers string/line shifts, Ruff routing via stub (Ruff not installed), lifecycle reset, stdout overflow and a SIGTERM-resistant formatter releasing the queue at 10 s. Prettier runtime test omitted as requested.
  - Scope note: formatter failure means approximate indentation may remain; notices mean scheduled, not succeeded. Tooling and executable configs run with full user permissions: trusted projects only.
  - Suggestion: lasting tests may be worthwhile for this extension, but none requested; use throwaway checks only.
