## Overview
- Make the two review prompts clear, simple and sharp: WATCHDOG.md (automatic Sol review) and DEEP_REVIEW.md (/review with Astra and Fable).
- Keep behavior: same three areas each, same output sections, verbatim delivery.

## Completed benchmark work from main
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

## Review prompt work
- [x] Both prompts rewritten and installed.
  - Requirement: each rule stated once; steps in the order the reviewer follows them; fixed output format.
  - Done: prompts rewritten with the same structure (context, areas, rules, output). The request message in both extensions now carries only worktree, transcript path, entry ID and capture time; the instructions it used to repeat live only in the prompt files.
  - Verified: Pi's loader loads both extensions without errors; both build; whitespace check passed; live copies match the repository.
  - Not verified: no paid review was run, so the effect on actual review quality is unobserved.
  - Change in the automatic review: an area with nothing to assess may be scored `n/a` instead of a forced number.
