## Overview
- Support mixed multi-file guarded edits and teach the model the request format; retain single-file compatibility.
- Validate every file before writing; disk-write failures can still partially apply a batch. Reject duplicate resolved paths (including hard-link aliases).

## Todos
- [x] Multi-file edits work with existing freshness guarantees and clear model guidance.
  - Requirement: nonempty edits array, exactly one mode per file, no mixing batch and single-file fields, deterministic mutation locking, validation before writes, actionable partial-write errors.
  - Definition of done: direct tool exercises cover mixed success, validation rejection without writes, aliases, legacy calls, and model-facing schema/instructions; existing checks assessed; commit changes.
  - Verified: direct registered-tool calls passed mixed changes/splices, legacy calls, invalid/stale/missing snapshots without writes, alias rejection, reversed overlapping batches, cancellation, lifecycle reset, and empty files. Injected partial-write failure confirmed completed/failed paths, untouched later files, and snapshot handling.
  - Model guidance is in schema descriptions, tool description, prompt snippet/guidelines, managed AGENTS.md, and README examples. Existing optional-field schema style retained for provider compatibility; cross-field constraints checked at execution.
  - Existing settings suite: 41/43 passed; both failures reproduced on unchanged main (--headless expectation and missing init.sh). Logs: .local/sync-tests.log and .local/base-sync-tests.log.
  - No live installation changed. Try via pi --no-extensions -e <worktree>/pi/.pi/agent/extensions/line-file-tools/index.ts in a new session.
  - Follow-up suggestion: retain focused regression tests if requested; current verification scripts are throwaway, not committed.
  - Public schema checks passed both request formats and rejected empty batches, missing entry paths, and invalid splice coordinates. Independent reviewer found no issues.
