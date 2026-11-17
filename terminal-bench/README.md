# Terminal-Bench on this Mac

Terminal-Bench runs terminal tasks in isolated Linux environments. Its current runner is [Harbor](https://docs.harborframework.com/getting-started/installation.md). Docker Desktop must be running; tasks and results stay outside rig. No rig sync changes are needed.

Latest comparison: [72-trial raw results](TIERED-RESULTS.md), with [selection and accounting details](TIERED-RUN.md) and [quality analysis](QUALITY-RESULTS.md). The tiered run used OrbStack and retained failed trials; the quality analysis separates verifier outcomes from sampled code review.

## Installed and verified

On this Apple Silicon Mac: Harbor 0.26.0 (installed through uv), Docker 29.8.2, Docker Compose 5.5.0, and Codex CLI 0.169.0. Codex is signed in with ChatGPT (`codex login status`).

The [official quick-start](https://docs.harborframework.com/getting-started/quickstart.md) hello-world task passed with Codex and `openai/gpt-6.1-sol`: one trial, reward **1.0**, zero errors, runtime **2m 11s**. This verifies the runner, Docker, authentication, Codex execution, and verifier. It is **not a Terminal-Bench dataset score**.

Results: `~/.local/share/terminal-bench/jobs/codex-smoke-20261116-231852/result.json`. Full console log: `~/.local/share/terminal-bench/smoke.log`.

## Repeat the smoke test

```sh
mkdir -p "$HOME/.local/share/terminal-bench/jobs"
CODEX_FORCE_AUTH_JSON=1 harbor run \
  -t hello-world/hello-world \
  -a codex -m openai/gpt-6.1-sol \
  --ak version=0.169.0 -n 1 -k 1 \
  --jobs-dir "$HOME/.local/share/terminal-bench/jobs" \
  --job-name "codex-smoke-$(date +%Y%m%d-%H%M%S)"
```

`CODEX_FORCE_AUTH_JSON=1` tells Harbor to use `~/.codex/auth.json` rather than requiring an OpenAI API key. Harbor forwards that credential into its isolated Codex home. Only run trusted tasks with account credentials. Do not copy authentication files into this repository. Runs consume your account allowance; Harbor's estimated API cost is not proof of a separate API charge.

Inspect saved runs with:

```sh
harbor view "$HOME/.local/share/terminal-bench/jobs"
```

## Configured Pi: real Terminal-Bench task

The first configured-Pi run passed `log-summary-date-ranges` from `terminal-bench@2.0`: **reward 1.0, both verifier tests passed, zero exceptions**. Pi processed 164 log files and produced the required 15-row CSV summary.

| Setting / measurement | Value |
|---|---|
| Pi | 1.5.2, verified from the actual launcher target and trial metadata |
| Model / thinking | `openai/gpt-6.1-sol` / `low` |
| Agent execution | 24.56 seconds |
| Full job including setup and verification | 2 minutes |
| Input / cached input / output tokens | 41,426 / 18,944 / 681 |
| Attempts | 1; no retries |

The shell alias's option **2** selects the main rig checkout, not another Pi build. Its noninteractive path invokes the same global binary directly. The benchmark uses that Pi version and active global configuration in Docker; it does not mount or run against rig's main checkout.

`configured_pi.py` extends Harbor's Pi adapter to upload a frozen configuration archive and install Linux-native packages. It keeps the active instructions, `WATCHDOG.md`, custom extensions, skills, agent definitions, prompt templates, theme, model catalog, and native MCP configuration. The session's numbered `read` output confirms the custom file tools ran; the package listing records all four configured packages: `pi-subagents@0.88.1`, `pi-web-access@0.47.0`, `pi-fast@0.3.0`, and `pi-sub-anthropic@0.1.11`.

### Repeat this frozen run

Run from this checkout; Docker must be running:

```sh
snapshot="$HOME/.local/share/terminal-bench/configured-pi-20261116-232520/snapshot.tar.gz"
PYTHONPATH="$PWD/terminal-bench${PYTHONPATH:+:$PYTHONPATH}" harbor run \
  -d terminal-bench@2.0 -i log-summary-date-ranges -l 1 \
  -a configured_pi:ConfiguredPi -m openai/gpt-6.1-sol \
  --ak version=1.5.2 --ak "snapshot_archive=$snapshot" \
  --effort low -n 1 -k 1 \
  --jobs-dir "$HOME/.local/share/terminal-bench/jobs" \
  --job-name "configured-pi-$(date +%Y%m%d-%H%M%S)"
```

The private snapshot and file-hash manifest are under `~/.local/share/terminal-bench/configured-pi-20261116-232520/`. The archive has no credentials, host sessions, histories, or caches. Package declarations were pinned to installed versions and the host device identifier removed; transitive dependencies were resolved for Linux, not frozen from the Mac. Bun 1.4.4 supports the unchanged package-manager and MCP commands. The executable reported Pi 1.5.2; an older managed-install marker saying 1.2.0 was not used.

The adapter supplies only OpenAI and `pi-sub-anthropic` credentials at runtime, because paired review may use both. They are not included in the snapshot or an image layer. The Docker environment was deleted after the run. This short task did not exercise delegation, the 40-call paired-review cadence, or the Playwright MCP browser; preserving their configuration does not prove those integrations work on Linux. macOS TUI sound/display behavior does not apply in print mode.

Saved job: `~/.local/share/terminal-bench/jobs/configured-pi-20261116-232520/`. The trial's `agent/pi.txt`, `agent/pi/sessions/`, `agent/configured-packages.txt`, and `verifier/test-stdout.txt` contain execution and verification evidence. Results stay local; Harbor's displayed cost is an estimate, not proof of a separate API charge.

## Three-arm five-task comparison

**Completed:** configured Pi, bare Pi and Codex each passed all five tasks and all 20 verifier checks, with Sol 6.1 / low thinking. See [RESULTS.md](RESULTS.md) for timing, cost, per-task quality and configuration evidence. Complete machine-readable metrics are in [results/comparison-20261116-233339.json](results/comparison-20261116-233339.json).

From this checkout, capture the **current active config** and run all three arms together:

```sh
root="$(python3 terminal-bench/prepare.py)"
bash terminal-bench/run-comparison.sh "$root"
harbor view "$root/jobs"
```

This is a real account-consuming benchmark, not a dry run. The scripts currently pin Pi 1.5.2, Codex 0.169.0 and Bun 1.4.4; update these pins if intentionally changing harness versions. `prepare.py` freezes the current global configuration, hashes its source files, pins configured package sources to installed versions and preserves the current Bun lockfile. It does not copy credentials, histories or sessions. The snapshot contains private instructions/configuration: keep it local.

`run-comparison.sh` starts all three jobs at once, with two task slots each. Six containers can reserve 12 GB of Docker's 16 GB, leaving headroom. Each arm runs the same five named Terminal-Bench 2.0 tasks once, without retries. The custom adapter gives all arms the same helper programs; bare Pi receives no user instructions, skills or packages. Pi startup refreshes are disabled for snapshot stability, while inference remains online.

The configured arm preserves auxiliary review/delegation choices. The current run stayed below the automatic review threshold and made no auxiliary calls; future runs that do trigger auxiliary calls need those logs included in cost accounting. Priority processing is requested by the configured Pi's `pi-fast` extension; reported dollars remain token-price estimates, not measured subscription credits.

To regenerate metrics from saved results without running any agents:

```sh
python3 terminal-bench/summarize.py "$root"
```

This writes `summary.json` and `summary.md`, checks for all 15 results and matching task names, and reports quality, timing, tokens and estimated costs. Missing costs remain unavailable rather than silently becoming zero. A verifier failure is a benchmark result, not a reason to retry until it passes. Other dataset images may need different resources or x86 emulation on Apple Silicon.

## Latest configured-Pi rerun

The new splices-only editor configuration passed all five tasks, with zero edit rejections versus three previously. Estimated cost was $0.2510 versus $0.2911; verifier quality remained 20/20. Four initial installation timeouts were preserved and recovered before those tasks reached inference.

See [NEW-CONFIG-RESULTS.md](NEW-CONFIG-RESULTS.md) for the complete before/after results, infrastructure caveat, and five-way parallel command with a longer setup allowance. Bare Pi and Codex were not rerun.

## Latest single-task three-harness check

After the active configuration changed again, all three harnesses passed `multi-source-data-merger` (3/3 verifier checks each). Configured Pi took 44.04s and 42,824 total tokens, plain Pi 53.92s and 13,565 tokens, and Codex 67.62s and 65,252 tokens. No subagents were invoked.

See [SINGLE-TASK-RESULTS.md](SINGLE-TASK-RESULTS.md) for turn counts, token splits, code-quality observations, snapshot provenance, and the container-network workaround required after setup-only failures. The adapter now uses IPv4-only apt, bounded retries/timeouts, and no optional recommended packages equally for all arms. One task is not a general ranking.
