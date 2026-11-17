# Tiered three-harness raw-data run

## Agreed scope

- 24 distinct Terminal-Bench 2.0 tasks: all **4 easy**, alphabetically first **10 medium**, alphabetically first **10 hard**, using official difficulty labels.
- Every task runs once on configured Pi, bare Pi and Codex: **72 trials**, no automatic retries. Retain failed trials, not just successful solutions.
- Same task revision as the earlier comparison: `69671fbaac6d67a7ef0dfec016cc38a64ef7a77c`. All 89 cached task manifests were matched to Git blob hashes in that revision. Its official difficulty counts are 4 easy, 55 medium and 30 hard; ten unique easy tasks are unavailable.
- Model/effort: `openai/gpt-6.1-sol`, low. Pi 1.5.2; Codex 0.169.0.
- All three harness arms run concurrently, **one active task per arm**. Maximum selected task size is 2 CPUs / 4 GB; three active tasks reserve at most 6 CPUs / 12 GB against Docker's 10 CPUs / 16 GB. Do not increase slots without rechecking the resource bound.
- Raw measurements first. Do not make code-quality judgments until the run and raw-data collection finish. Automated verifier status remains available as execution evidence.

## Frozen run

Root: `~/.local/share/terminal-bench/comparison-20261117-161604-restart/`.

Configuration archive SHA-256:

```text
ffa25dc227fa53e59ca2270ca1850972efaa909b140198d8b3d4f54b68ba499d
```

The private snapshot is a fresh capture of the active Mac configuration, not a reuse of the previous single-task snapshot. Packages: `pi-subagents@0.89.0`, `pi-web-access@0.48.0`, `pi-fast@0.3.0`, `pi-sub-anthropic@0.1.11`.

`manifest.json` includes the exact task list, difficulty, environment resources, declared timeouts and task-manifest hashes. `runtime/` and `runtime-sha256.json` freeze the launcher, adapter and basic summarizer used for execution. Source configuration, credentials and histories are not committed or cloud-uploaded. Credential injection follows the existing adapter.

Execution command (already started by a detached launcher; **do not run it again**):

```sh
BENCH_SLOTS_PER_ARM=1 bash "$root/runtime/run-comparison.sh" "$root"
```

The existing container-local apt workaround applies identically to all arms. It is not a host DNS or global Docker change. Setup allowance is 1080 seconds; solver and verifier limits are the tasks' original limits. This larger set can take hours; installation, compilation, external downloads and verifiers are not included in agent execution time.

## Raw export

After the jobs finish:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 terminal-bench/raw_metrics.py "$root"
```

Outputs:

- `raw-metrics.csv` and `raw-metrics.json`: each trial has `main`, `subagent`, and `total` rows, labeled by difficulty and exception status.
- Columns: agent seconds with an explicit time basis, model-response turns, fresh input, cached input, cache-write input, output, total tokens and accounting completeness. Setup failures with no usage are unavailable, not silently zero.
- `usage-ledger.jsonl`: canonical per-call usage with source file/entry identity for reconciliation; no prompt or solution text is copied into this ledger.
- Compaction/branch-summary usage is retained separately from ordinary model-response turns. These aggregate records are not assumed to represent exactly one provider call.

Pi totals come from native assistant messages, plus separately recorded compaction/summary calls and deep-review calls. Copied fork history, tool-result aggregates, repeated status/event snapshots, and review logs that duplicate standalone usage must not be added again. Fresh input and cache reads follow Pi's native fields; cached input is not added twice to Harbor's inclusive input counter. Nonzero cache writes are an explicit extra input column. Reasoning tokens are not added to output a second time.

Main/total agent seconds are Harbor's overall agent execution window, including time waiting for children. Subagent seconds are the sum of recorded child-step durations; these windows overlap and must not be added to the main time. In this run one configured child took 388.256 seconds inside the parent's 446.537092-second execution window.

The adapter retains native sessions recursively, auxiliary log/session directories, and a trial-local `PI_SUBAGENTS_TEMP_ROOT=/logs/agent/pi/subagents-temp`. Reviewers implemented as in-memory agents are accounted through standalone usage or unmatched review-log call records. Unrecognized usage kinds, missing sessions and ambiguous Codex delegation are flagged for inspection rather than silently attributed.

The exporter was checked against all three prior successful single-task trials, reproducing turn counts and token splits exactly. Disposable checks covered copied parent history in a fork and review-log duplication; no permanent test fixtures were added.

### Known coverage limit discovered in this run

The frozen web-search extension makes provider-backed search calls but discards the provider usage when returning search text (`pi-web-access/openai-search.ts`, `runOpenAISearch`). Configured Pi used it in `build-pov-ray`, `caffe-cifar-10`, and `dna-assembly`. Native sessions and Harbor totals therefore do not measure every tool-side model token. The exporter flags these calls, including search calls inside codemode, without altering the running snapshot. Answer-mode fetch calls are flagged for the same reason.

`accounting_complete=false` means the displayed numeric values are **recorded amounts**, potentially a lower bound, not a complete all-provider bill. A timeout is also flagged because an in-flight provider call may not have written its final usage. Missing sessions remain unavailable. Zero recorded child usage does not imply zero unmetered tool-helper usage. Do not turn missing values into zeros or claim these totals cover all model consumption.

## Selected tasks

**Easy:** cobol-modernization; fix-git; overfull-hbox; prove-plus-comm.

**Medium:** adaptive-rejection-sampler; break-filter-js-from-html; build-cython-ext; build-pmars; build-pov-ray; caffe-cifar-10; chess-best-move; code-from-image; compile-compcert; constraints-scheduling.

**Hard:** bn-fit-modify; cancel-async-tasks; circuit-fibsqrt; configure-git-webserver; dna-assembly; extract-moves-from-video; feal-differential-cryptanalysis; feal-linear-cryptanalysis; fix-code-vulnerability; fix-ocaml-gc.

This is a deterministic alphabetical sample, not a random or representative benchmark estimate. Several tasks depend on external source repositories, package registries, visual input or a YouTube download. Keep infrastructure and provider failures distinct from solution correctness. Quality assessment is deferred.

## Interrupted first launch

The original `comparison-20261117-161604/` launch lost its supervisors when the worker hit its 30-minute runtime limit. Configured Pi had completed nine assistant responses on `break-filter-js-from-html`, but Harbor had not persisted a trial result. Its recorded usage was 12,032 fresh input, 67,200 cached input and 860 output tokens (80,092 total). The other arms had no retained model sessions. All three containers' `/app` trees and logs were archived before removing those task-owned containers.

The user explicitly requested another attempt. The matched run restarted using the identical snapshot and frozen runtime, with a detached launcher that survives the worker/session timeout. `runner-process.json`, `runner.log` and `runner.exit` record supervision and completion. `restart-provenance.json` preserves the old attempt metadata; its usage is reported separately, not silently added to or erased from the new 72-trial comparison.
