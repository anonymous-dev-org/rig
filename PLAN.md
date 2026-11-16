## Overview
- Reduce edit failures with one operation mode (`splices`) and actionable, model-visible snapshot notices.
- Keep single-file and multi-file editing, guarded validation, formatting, and existing file safety. Do not deploy to the live Pi installation.
- Notices must distinguish changed files from cleared snapshots, name the file, and give a useful read range when known. Do not require rereads for edits whose snapshots remain valid.

## Todos
- [x] Splice-only editing and snapshot recovery guidance work end to end.
  - Requirement: remove `changes` from the edit interface and implementation; update model-facing guidance and documentation. Tool responses explain invalidated/shifted snapshots with read guidance; lifecycle resets notify model context without inventing a file change. Preserve batching and fail-closed checks.
  - Definition of done: isolated runtime checks cover replacement/insertion/deletion/batches, old-input rejection, stale/missing snapshots, write invalidation, lifecycle resets, and formatting guidance; inspect full diff and commit.
  - Implemented: `splices` is the sole edit mode; legacy `changes` is explicitly rejected. Write/shift/stale-result notices include a file and bounded range; formatting notices say pending. Lifecycle context includes the reset event/reason/time and does not trigger a turn or persist duplicate notices.
  - Verified: parent disposable checks through Pi's actual loader passed 24 calls covering replacements, insertion/deletion/append, batches, legacy rejection, unchanged regions, stale recovery, write invalidation, atomic pre-write validation, compaction recovery, and empty files. Separate check passed actual notice text and all six reset handlers; full diff inspected and whitespace checks passed.
  - Child verification additionally exercised actual gofmt scheduling and subsequent guarded rejection, and checked Pi argument validation retains legacy fields for explicit rejection.
  - Verification correction: fixed a bracket typo in the parent's disposable checker before it ran; no product-code failure. Scratch scripts/fixtures removed; no permanent test infrastructure.
  - Limitations: ranges are bounded suggestions, not semantic relocation of moved code; callers must reconsider coordinates. Lifecycle notices live in model context because resets are not tool calls. Live installation unchanged; old `changes` callers must migrate and load the updated extension.
  - Follow-up suggestion: measure real-session error rates after activation; no claimed measured reduction yet.
