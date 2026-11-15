## Overview
- Add `read({reads: [{path, start?, end?}, ...]})` alongside legacy single-file reads.
- Preserve text/image handling and edit snapshots. Batch results identify each path; reject mixed request forms and empty batches.
- Batch reads run in order and stop on failure; earlier successful reads retain snapshots. Keep the 50 KiB text budget across the batch; no live deployment.

## Todos
- [x] Multi-file reads work and are discoverable.
  - Requirement: backwards-compatible schema, ordered labelled results and structured data, text/image support, clear errors and model guidance.
  - Definition of done: direct registered-tool exercises cover single/batch reads, ranges, images, edits after batch, invalid forms, failure, cancellation and output budget; review diff and commit.
  - Use an isolated worktree on feat/multiread after fast-forwarding main. No persistent test files requested.
  - Verified direct calls: legacy/batch text, ranges/repeated paths, mixed PNG attachments, edit snapshots, invalid forms, missing files, cancellation, lifecycle reset, aggregate text limit and public input/output schemas. Log: .local/check.log.
  - Independent review found epoch capture needed to span the entire batch and image labels needed budget accounting. Fixed both; targeted checks passed for reset between entries and oversized image-label batches.
  - No dedicated extension test suite exists; unrelated sync/settings tests were not run. Throwaway exercise script removed after verification; no live installation changed.
