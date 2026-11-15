# Overview
- Goal: reduce redundant reads with private per-line freshness checks; edit known coordinates first and let the tool reject stale targets. Successful edits return only `Edit succeeded.`.
- Scope: managed line-file extension, its documentation and agent guidance. Preserve existing file/encoding/queue/lifecycle safeguards. No live deployment or benchmark run.
- Setup: `git pull --ff-only origin main` failed with multiple FETCH_HEAD branches; fetched origin/main matches main and explicit `git merge --ff-only origin/main` succeeded. `.local/` is ignored; worktree `.local/worktrees/per-line-edit`, branch `feat/per-line-edit`.
- Tradeoff: hashes check content at a numeric coordinate, not semantic identity; repeated identical lines cannot prove the intended occurrence. Agents still need known source context.
- Delegation: runtime reviewer is disabled; `delegate` completed design and implementation reviews (148c5680, resumed 5d718909). No correctness blockers; applied the wording fix distinguishing mismatching content from every possible shift.

# Todos
- [x] Per-line guarded edits work end to end without automatic rereads.
  - Requirement: unrelated changes do not reject an unchanged target; changed/missing targets reject before any write. Splices guard affected rows and insertion/EOF anchors, retain usable snapshots, and never silently refresh unrelated external changes. Success text is only `Edit succeeded.`.
  - Requirement: update prompt metadata, README and managed AGENTS guidance to attempt known edits directly, including after splices; read on rejection, missing context or lifecycle reset.
  - Definition of done: exercise real registered tools offline for replacement, splice, stale/shifted target, all-or-nothing, EOF/empty, terminator and lifecycle cases; strict TypeScript and diff checks; independent review; commit.
  - No permanent test files: use disposable checks under ignored `.local/`. Existing benchmark is historical, not evidence for this revision.
  - Implemented: SHA-256 per row including terminator; removed/replaced rows and insertion neighbors/EOF are checked before writes. Rejections keep the existing baseline; only write attempts clear it. Success refreshes authored rows only.
  - Decision: keep untouched hashes at numeric coordinates rather than invalidating the entire shifted suffix (reviewer’s more conservative option). User requested unchanged coordinate content to remain editable; matching duplicate rows can pass, as documented. Explicit reads retain the existing whole-loaded-file observation behavior.
  - Verification: 97 offline calls to the actual SDK-loaded registered tools passed, covering unrelated external changes, stale-baseline non-promotion, inserts/deletes/net-zero batches, anchors/EOF/empty files, atomic failures, BOM/mixed endings, renderer acknowledgement, aliases, abort and queued lifecycle resets. No model/provider calls or live installation.
  - Strict TypeScript 6.0.3 passed using the existing Bun compiler cache and installed host declarations (fixed the temporary config’s initial wrong TypeBox declaration path). No dependency installation required.
  - Independent implementation review accepted content-at-coordinate semantics with no correctness blockers; shorter instructions now avoid promising detection of every shift. Existing optimistic external-writer race remains unchanged.
  - Suggestion: retain regression coverage for these cases if permanent tests are requested later. Expanded semantics remain unbenchmarked.
