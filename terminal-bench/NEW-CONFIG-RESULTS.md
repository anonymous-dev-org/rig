# New configured Pi — five-task rerun

## Result

The new configured Pi passed **all five tasks and all 20 verifier checks**, with **Sol 6.1 / low thinking** and Pi **1.5.2**. Relative to the previous configured-Pi sample, estimated model cost fell **13.8%**, total agent execution time fell **7.1%**, and edit-tool rejections fell **from 3 to 0**. Functional verifier quality remained tied at the maximum score.

| Measurement, five tasks | Previous configured Pi | New configured Pi |
|---|---:|---:|
| Task/verifier quality | 5/5 tasks; 20/20 tests | 5/5 tasks; 20/20 tests |
| Median agent execution | 62.31 s | 52.65 s |
| Sum of agent execution | 265.13 s | 246.29 s |
| Estimated model cost | $0.291104 | $0.251035 |
| Input tokens including cached | 452,951 | 427,044 |
| Cached input subset | 363,136 | 358,912 |
| Output tokens | 7,516 | 7,888 |
| Read tool calls | 8 | 6 |
| Edit tool calls | 8 | 4 |
| Edit rejections | 3 | 0 |
| All tool error events | 6 | 2, both from bash |

Dollar values are token-price estimates, **not actual ChatGPT subscription charges or credits**. Agent execution excludes Harbor setup and verifier time. Both samples use one solver attempt per task. Bare Pi and Codex were **not rerun**; their earlier results remain in [RESULTS.md](RESULTS.md).

## Per-task comparison

All five tasks passed their complete verifiers in both samples.

| Task | Tests | Old agent time | New agent time | Old estimated cost | New estimated cost | Old → new edit rejections |
|---|---:|---:|---:|---:|---:|---:|
| `log-summary-date-ranges` | 2 | 25.22 s | 31.71 s | $0.032348 | $0.037785 | 0 → 0 |
| `multi-source-data-merger` | 3 | 65.12 s | 62.89 s | $0.073365 | $0.052045 | 0 → 0 |
| `cancel-async-tasks` | 6 | 46.86 s | 52.65 s | $0.040088 | $0.042397 | 0 → 0 |
| `sqlite-db-truncate` | 1 | 62.31 s | 39.73 s | $0.104634 | $0.064425 | 1 → 0 |
| `nginx-request-logging` | 8 | 65.61 s | 59.31 s | $0.040669 | $0.054383 | 2 → 0 |

The old rejections were in editing `PLAN.md`: mixing `changes` and `splices`, an empty `splices` array, and editing a file whose snapshot had been cleared by a write. The new sessions had no edit rejections. Counts use only `tool_execution_start` and `tool_execution_end` events, with top-level `isError == true`; copies embedded in message events are excluded. Every start had a matching end.

Quality means correctness against the supplied verifiers, not readability or maintainability. These short tasks do not establish whether the new tool improves harder or longer work. Different outputs/tool choices and sampling variation can change time/cost even with unchanged configuration.

## Actual new configuration

A fresh snapshot was taken from the Mac's active `~/.pi/agent`. Source-file hashes were compared with the previous snapshot: **only `extensions/line-file-tools/index.ts` changed**. The extension now uses splices-only edits, explicitly reports cleared snapshots after writes/resets, and gives reread ranges after coordinate shifts or stale targets. Settings, instructions, skills, model/thinking defaults, package declarations and dependency-lock inputs were unchanged.

New archive SHA-256:

```text
9b46c035d91a2e0ca479542b067e7006f7a6412666a3da5cf0ddfbf721245834
```

The four active packages remained `pi-subagents@0.88.1`, `pi-web-access@0.47.0`, `pi-fast@0.3.0`, and `pi-sub-anthropic@0.1.11`. All five solver trials recorded this snapshot identity, the expected package listing, Pi 1.5.2, and Sol 6.1/low in native session records. Captured source hashes still matched the active Mac files after the run. No host configuration was changed.

The native configuration and dependency lockfile were preserved, with package sources pinned and device ID omitted as before. Linux dependencies were installed in Docker. Startup catalog/package refreshes were frozen with `PI_OFFLINE=1`; inference remained online. No auxiliary sessions or review logs were created, and primary sessions made 5–9 assistant calls, below the 40-call automatic review threshold.

## Parallel run and infrastructure recovery

All five task containers were launched together, each with the task's 1 CPU / 2 GB limits, on Docker's 10 CPU / 16 GB VM. **Four hit Harbor's 360-second agent-setup limit during Pi installation, before inference.** Only `multi-source-data-merger` reached the solver in that first job, and it passed.

The original job and all four infrastructure failures were retained. Only the four tasks that had not started inference were rerun, concurrently, with `--agent-setup-timeout-multiplier 3`, allowing 1080 seconds for installation. They all completed successfully. **The solver/verifier limits and configuration were unchanged; no task received a second solver attempt.**

| Phase | Concurrent tasks | Outcome | Command wall time |
|---|---:|---|---:|
| Initial job | 5 | 1 solver pass; 4 installation timeouts | 448.34 s |
| Infrastructure recovery | 4 | 4 solver passes | 344.26 s |

Combined active command time was **13m 12.60s**. Elapsed time from first launch through recovery completion, including diagnosis between phases, was **14m 3.64s**. These wall times are not comparable to the old three-arm matrix: the amount of work, concurrency and setup conditions differ. The per-task agent-time comparison excludes the failed setup attempts. Setup failures incurred no recorded model usage, and the five solver costs reconcile with the two Harbor job aggregates.

Harbor returned process exit code 0 and mean 1.0 even when four trials had setup exceptions. Completion was therefore verified from the individual trial records, not from process status or the displayed mean alone.

## Evidence and repeat command

Run root: `~/.local/share/terminal-bench/comparison-20261117-000121/`.

- `manifest.json`, `snapshot.tar.gz`: fresh configuration and hashes, without authentication/history files.
- `jobs/configured/`: first five-way job, including four retained setup failures.
- `jobs/configured-recovery/`: only the four infrastructure-recovery trials.
- `execution.json`, `recovery-execution.json`: concurrency, timing and process status.
- `new-config-summary.json`: all five solver results, before/after tool counts, and all four infrastructure failures; [committed copy](results/new-config-20261117-000121.json).

To run this same task set with a fresh snapshot and all five tasks concurrent, use the longer setup allowance from the outset:

```sh
root="$(python3 terminal-bench/prepare.py)"
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH="$PWD/terminal-bench${PYTHONPATH:+:$PYTHONPATH}" harbor run \
  -d terminal-bench@2.0 \
  -i log-summary-date-ranges -i multi-source-data-merger \
  -i cancel-async-tasks -i sqlite-db-truncate -i nginx-request-logging \
  -l 5 -n 5 -k 1 --max-retries 0 \
  --agent-setup-timeout-multiplier 3 \
  --jobs-dir "$root/jobs" --job-name configured \
  -a configured_pi:ConfiguredPi -m openai/gpt-6.1-sol --effort low \
  --ak version=1.5.2 --ak "snapshot_archive=$root/snapshot.tar.gz" \
  --ae PI_OFFLINE=1
```

This consumes account allowance. The generic `summarize.py` expects the full three-arm matrix and will flag missing arms/duplicates on this partial rerun; use the dedicated saved summary for these results.

Timing remains subject to parallel contention, AMD64 emulation on Apple Silicon, provider caching and requested-versus-delivered priority processing. One sample with a concurrency change cannot establish a causal speedup. The reduction in observed edit rejections is directly recorded, but repeated or more demanding tasks would be needed to assess reliability more broadly.
