# Fresh configuration: one task across three harnesses

## Result

All three harnesses passed **all 3 verifier checks** for `multi-source-data-merger`, using **Sol 6.1 / low**, one solver attempt each. All three ran concurrently, with one task container per arm.

| Harness | Agent time | Model turns | Fresh input | Cached input | Output | Total tokens | Estimated cost |
|---|---:|---:|---:|---:|---:|---:|---:|
| Configured Pi | **44.04 s** | 5 | 9,162 | 32,128 | 1,534 | 42,824 | $0.036877 |
| Plain Pi | 53.92 s | 5 | 2,670 | 9,472 | 1,423 | **13,565** | **$0.020517** |
| Codex | 67.62 s | **4** | 9,060 | 54,528 | 1,664 | 65,252 | $0.040213 |

A turn is one model response, including the final answer; a response may issue multiple tool calls. Total tokens = fresh input + cached input + output. All usage was **main-agent usage**; there were no subagent invocations or auxiliary sessions in any arm. Cached input is included in processed input, but priced lower than fresh input. Dollars are token-price estimates, not actual subscription charges.

Agent time excludes installation and verification. The successful three-arm job took **19m 45.47s** overall; setup alone was 680.98s for configured Pi, 816.18s for plain Pi, and 906.45s for Codex. These wall times should not be confused with the 44–68 seconds spent solving.

## Comparison with the previous configured Pi on this task

| Measurement | Previous configured Pi | Current configured Pi |
|---|---:|---:|
| Verifier checks | 3/3 | 3/3 |
| Agent time | 62.89 s | 44.04 s |
| Turns | 9 | 5 |
| Input including cache | 91,982 | 41,290 |
| Output | 2,227 | 1,534 |
| Total tokens | 94,209 | 42,824 |
| Estimated cost | $0.052045 | $0.036877 |

On this sample, current configured Pi used **4 fewer turns**, **54.5% fewer total tokens**, and about **30% less agent time** than the previous configured run. This does not isolate which configuration change caused the difference: the model is nondeterministic, context and package versions changed, and concurrency/network conditions differ.

## What the harnesses did

Configured Pi used three bash calls and one batched read: discover the environment, read JSON/CSV, inspect Parquet, then merge and validate in one inline Python execution. It did not create a plan file or leave a reusable merge script. The task requested the two output artifacts, not a script, so this was a valid one-shot solution. It had zero tool errors.

Plain Pi used three bash calls, two reads, and one write. Its second response issued multiple calls, so six tool calls still resulted in five model turns. It left an 84-line reusable `merge_users.py` using pandas and pyarrow, then ran it and checked IDs, row count and conflict count. It had zero tool errors.

Codex used three execution-tool calls and a final answer. It combined discovery and input inspection, inspected Parquet next, then wrote and ran a 107-line reusable script with persisted-output validation in the same execution. Its model context started at 14,909 input tokens, versus 7,510 for configured Pi and 1,565 for plain Pi. Consequently, fewer turns did not imply fewer processed tokens.

## Code and output quality

Correctness against the supplied verifiers is **tied at 3/3**. Parent inspection covered both saved scripts, the configured inline implementation, the task requirements and each agent's verification commands. No separate delegated review or additional edge-case test suite was performed.

All three normalize field aliases, map activity flags, preserve integer IDs, use explicit Arrow output types, select fields in source-priority order and reject duplicate IDs within a source. All serialize the required conflict report.

- **Configured Pi:** compact one-shot execution; reads persisted artifacts back and checks schema, coverage, dates, selected fields and conflict-report consistency. It refuses to overwrite existing output files. Its verification asserts exactly three conflicts, which is appropriate to this fixture but not a general-purpose assertion.
- **Plain Pi:** reusable script with clear normalization and merge functions. Its pandas dependency is already available and supports missing-value/date handling, but it needs both pandas and pyarrow. Its explicit runtime assertions cover less than the other two solutions; the independent benchmark verifier still passes.
- **Codex:** reusable script using standard-library normalization plus pyarrow, stricter integer-ID validation, duplicate detection, and embedded output checks. Its additional validation and persistence are useful for reuse, but make it longer; many assertions recheck values derived by the same algorithm rather than providing independent expected results.

There is no objective single code-quality winner established by this task. Configured Pi best fits a minimal one-shot artifact request; Codex and plain Pi leave a more reusable deliverable. Robustness on unsupplied input variations was not measured.

## Snapshot and execution evidence

Successful run: `~/.local/share/terminal-bench/comparison-20261117-082008-ipv4/`.

Snapshot SHA-256:

```text
4d8289d6a5e799e00b47e3c918825ab464bdfb430b7d86137134a3660b6c81bd
```

Pi 1.5.2 and Codex 0.169.0 match the previous comparison. Configured packages were freshly captured as `pi-subagents@0.89.0`, `pi-web-access@0.48.0`, `pi-fast@0.3.0`, and `pi-sub-anthropic@0.1.11`. Snapshot proof, package listing, model/effort, native Pi completion and unchanged task revision `69671fbaac6d67a7ef0dfec016cc38a64ef7a77c` were checked. The active host model catalog changed after capture; the trials retained the frozen catalog. No other captured source-file hashes changed.

The snapshot and credentials remain local and are not committed. Portable measurements are in [results/single-task-20261117-082008.json](results/single-task-20261117-082008.json). The run root also contains `single-task-summary.json`, trial/verifier/session records, generated artifacts, and `configured-inline-solution.py` extracted from its transcript for inspection.

## Infrastructure recovery

Earlier attempts failed before inference because package downloads intermittently lost DNS resolution. The active engine was OrbStack, not Docker Desktop; OrbStack was restarted with user approval. Small Debian/npm/Bun connectivity probes then passed, but a full three-arm retry still failed during setup. Those failures remain in `comparison-20261117-082008/` and `comparison-20261117-082008-recovery/`; the earlier interrupted `comparison-20261117-080852/` attempt is separate evidence, not part of the current snapshot's results.

A disposable full package installation succeeded with IPv4-only apt, one retry, a 15-second HTTP timeout and no optional recommended packages. The adapter now applies those settings inside each task container, equally across all three arms; apt update also fails explicitly if indexes are incomplete. The subsequent three-arm benchmark succeeded. This is an observed successful workaround, not proof of the underlying DNS root cause. Host DNS and global Docker settings were not changed.

The workaround affects setup and available optional packages, so comparisons to earlier runs retain that limitation. Main requested helper packages, task revision, solver model, reasoning effort and configuration snapshot were unchanged between the failed and successful retries. No task received a second solver attempt using this snapshot; earlier attempts never reached model execution.

A single curated task cannot establish a general speed or quality ranking. Provider caching, service tier, AMD64 emulation and concurrent contention remain timing confounders.
