## Overview
- Reduce edit failures with one operation mode (`splices`) and actionable, model-visible snapshot notices.
- Keep single-file and multi-file editing, guarded validation, formatting, and existing file safety. Do not deploy to the live Pi installation.
- Notices must distinguish changed files from cleared snapshots, name the file, and give a useful read range when known. Do not require rereads for edits whose snapshots remain valid.

## Todos
- [x] Splice-only editing and snapshot recovery guidance work end to end.
  - Requirement: remove `changes` from the edit interface and implementation; update model-facing guidance and documentation. Tool responses explain invalidated/shifted snapshots and lifecycle resets without inventing a file change. Preserve batching and fail-closed checks.
  - Definition of done: isolated runtime checks cover replacement/insertion/deletion/batches, old-input rejection, stale/missing snapshots, write invalidation, lifecycle resets, and formatting guidance; inspect full diff and commit.
  - Implemented: `splices` is the sole edit mode; legacy `changes` is explicitly rejected. Write/shift/stale-result notices include a file and bounded range; formatting notices say pending. Follow-up correction moves lifecycle reset event/reason/time into missing-snapshot errors instead of changing every model request.
  - Verified: parent disposable checks through Pi's actual loader passed 24 calls covering replacements, insertion/deletion/append, batches, legacy rejection, unchanged regions, stale recovery, write invalidation, atomic pre-write validation, compaction recovery, and empty files. Separate check passed actual notice text and all six reset handlers; full diff inspected and whitespace checks passed.
  - Child verification additionally exercised actual gofmt scheduling and subsequent guarded rejection, and checked Pi argument validation retains legacy fields for explicit rejection.
  - Verification correction: fixed a bracket typo in the parent's disposable checker before it ran; no product-code failure. Scratch scripts/fixtures removed; no permanent test infrastructure.
  - Limitations: ranges are bounded suggestions, not semantic relocation of moved code; callers must reconsider coordinates. After a lifecycle reset, recovery guidance appears on the first attempted edit without a fresh read, not proactively. Live installation unchanged; old `changes` callers must migrate and load the updated extension.
  - Follow-up verified: removed unconditional context injection to avoid disrupting prompt caching and obscuring reset/read ordering. Loader checks confirmed no context hooks, all six reset error messages, unchanged files on rejection, and successful reread recovery. Whitespace check passed. Cache impact is inferred, not measured. Suggest measuring real-session error rates after activation; no claimed reduction yet.
