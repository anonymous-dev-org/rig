## Overview
- Rerun the same five Terminal-Bench 2.0 tasks using the newly active configured Pi, Sol 6.1 / low, one attempt each. All five task containers run together (1 CPU / 2G each; Docker 10CPU / 16GB).
- Compare time, estimated cost, verifier quality and edit-tool rejections with the previous configured-Pi run. Saved bare-Pi/Codex results remain historical references, not rerun.
- Fresh active config differs only in extensions/line-file-tools/index.ts: splices-only edits and explicit snapshot/coordinate recovery notices. Settings and four active package versions unchanged.

## Todos
- [x] Five concurrent new-config trials finish with verified provenance and before/after metrics.
  - Requirement: fresh snapshot of actual Mac configuration, unchanged task revisions/model/effort, local Docker, five simultaneous tasks initially, no solver retries or host config edits.
  - Definition of done: inspect five result/verifier/session records and snapshot identity, compare timing/cost/quality and editor errors, save report and commit.
  - Snapshot: ~/.local/share/terminal-bench/comparison-20261117-000121/, archive 9b46c035d91a2e0ca479542b067e7006f7a6412666a3da5cf0ddfbf721245834; source comparison confirms only the file-tool extension changed.
  - Delegated: worker measures baseline tool/rejection counts from old configured transcripts; parent runs and verifies new trials.
  - Limitations: single attempts, concurrency differs from previous two-slots-per-arm matrix, AMD64 emulation and cache/priority-tier effects limit timing conclusions. Dollar costs are token-price estimates, not actual ChatGPT subscription charges.
  - Infrastructure failure: initial five-way run finished with one passed task (multi-source-data-merger) and four AgentSetupTimeoutError failures at 360s, while installing Pi before inference. Harbor returned exit 0 despite exceptions; inspected trial records rather than treating exit status/mean as success.
  - Recovery: retain original job unchanged; rerun only the four unstarted tasks concurrently with --agent-setup-timeout-multiplier 3 (1080s). Task-solving/verifier limits and frozen config unchanged; retain one solver attempt per task.
  - Verified: five solver trials passed all 20 checks. Initial merger pass + four recovery passes, one solver attempt per task. Native session model/effort/version, stop reasons, task revision equality, package listings and snapshot identity all checked. Active source hashes unchanged after execution.
  - Results: old → new cost $0.2911036 → $0.2510352 (-13.8%); accumulated agent time 265.13s → 246.29s (-7.1%); median 62.31s → 52.65s; edit rejections 3 → 0; read calls 8 → 6. Quality unchanged at maximum. Two remaining tool error events are bash, not edit failures.
  - No auxiliary sessions/review logs; configured sessions made 5–9 assistant calls. Five solver costs reconcile with both Harbor job totals; four setup-only failures had no recorded model usage.
  - Timing: initial command 448.34s, recovery 344.26s; active total 792.60s, elapsed including diagnosis 843.64s. Preserve both phases; do not present a clean first-pass success or compare this wall time to the full old matrix.
  - Deliverables: terminal-bench/NEW-CONFIG-RESULTS.md and results/new-config-20261117-000121.json; README links latest rerun. Baseline three-arm results unchanged. No benchmark/harness code changed, new tests added, or Mac config edited.
  - Follow-up suggestion: allow setup multiplier 3 for future five-way runs; repeated/harder tasks needed before claiming causal speed/quality improvements.

## Earlier editor work

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
