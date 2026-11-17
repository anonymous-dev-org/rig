# Configured Pi vs bare Pi vs Codex — five tasks

## Outcome

**All three arms passed all five tasks: 15/15 successful trials, 60/60 verifier tests, zero exceptions and no retries.** Bare Pi was fastest and cheapest in this sample; the configured setup did not improve the measured output quality.

Every primary agent used **`openai/gpt-6.1-sol`, low thinking**, with one attempt per task. Pi was **1.5.2**, Codex **0.169.0**, Harbor **0.26.0**. Native Pi session records and Codex turn-context records confirm the model and thinking level, rather than relying only on command-line arguments.

| Arm | Tasks passed | Verifier tests | Median agent time | Sum of agent time | Estimated model cost, five tasks |
|---|---:|---:|---:|---:|---:|
| Configured Pi | 5/5 | 20/20 | 62.31 s | 265.13 s | $0.291104 |
| Bare Pi | 5/5 | 20/20 | 41.45 s | 203.95 s | $0.115530 |
| Codex | 5/5 | 20/20 | 49.97 s | 231.68 s | $0.145897 |

Agent time includes startup and tool use but excludes Harbor environment/agent setup and verifier execution. Sums are accumulated work, not parallel wall time. Across these five tasks, configured Pi used **30% more agent time and 2.52× the estimated cost of bare Pi**. These are observations from this sample, not a general ranking.

**Costs are public-token-price estimates, not actual ChatGPT subscription charges or credits.** Total estimated model cost was **$0.552531**. The configured Pi retains its enabled `pi-fast` extension, which requests priority processing for OAuth. This run did not instrument the server's delivered tier, and the displayed dollar estimates do not establish a priority-tier or subscription-credit multiplier.

## Per-task results

All cells below passed the task verifier. Each cell gives **agent seconds / estimated USD**.

| Task | Category | Tests per arm | Configured Pi | Bare Pi | Codex |
|---|---|---:|---:|---:|---:|
| `log-summary-date-ranges` | Log/data processing | 2 | 25.22 / $0.03235 | 23.75 / $0.01399 | 27.87 / $0.02130 |
| `multi-source-data-merger` | Structured data merging | 3 | 65.12 / $0.07336 | 55.46 / $0.02953 | 55.49 / $0.03247 |
| `cancel-async-tasks` | Python concurrency | 6 | 46.86 / $0.04009 | 41.45 / $0.02013 | 49.97 / $0.02448 |
| `sqlite-db-truncate` | Database recovery | 1 | 62.31 / $0.10463 | 35.06 / $0.02346 | 36.88 / $0.03010 |
| `nginx-request-logging` | System administration | 8 | 65.61 / $0.04067 | 48.23 / $0.02842 | 61.46 / $0.03754 |

Quality here means **functional correctness against the tasks' supplied verifiers**, with each task weighted equally. It does not grade readability, maintainability, explanation style, or correctness outside the verifiers' coverage. There was no quality tie-breaker: all arms reached the maximum score on all five tasks.

## Why configured Pi cost more here

| Arm | Input tokens, including cached | Cached input subset | Output tokens |
|---|---:|---:|---:|
| Configured Pi | 452,951 | 363,136 | 7,516 |
| Bare Pi | 67,359 | 37,120 | 5,134 |
| Codex | 350,960 | 323,712 | 5,903 |

Configured Pi sent about **6.7× bare Pi's input tokens**, including cached input. Its user instructions, skill descriptions and extension tool definitions add context, and the configured runs also made more model calls on several tasks. Caching reduced the price difference, but did not eliminate it. This comparison changes the complete configuration at once, so it cannot identify any one extension as the cause.

## Configuration provenance

A **fresh snapshot of the active Mac configuration** was taken immediately before the matrix run, not reused from the earlier smoke test. Its source-file hashes were checked before launch and again after completion; no captured source files changed. All five configured trials recorded the same archive hash:

```text
707a94d516fa27a78274c2d01af76486d5501dff26c88abff0244ea6cc7d5c09
```

The snapshot contains active instructions, `WATCHDOG.md`, custom extensions including numbered file tools and paired review, skills, agent definitions, prompts, themes, the provider catalog and native MCP configuration. Its 45 files include the current `npm/package.json` and **Bun dependency lockfile**, which was used with `--frozen-lockfile` to install Linux-native dependencies. Installed-but-inactive packages remain in the lockfile; settings, not presence on disk, decide what loads.

The active package sources were pinned to their installed versions, preserving resource filters:

- `pi-subagents@0.88.1`
- `pi-web-access@0.47.0`
- `pi-fast@0.3.0`
- `pi-sub-anthropic@0.1.11`

Only the host device identifier was removed from settings. No custom instruction, tool, skill or behavior setting was intentionally disabled. `PI_OFFLINE=1` froze Pi startup catalog/package refreshes after explicit installation; it did not disable model API requests. Native package listings matched all four configured packages in every trial, and the bare-Pi listings contained none. Bare Pi received only authentication and the same provider catalog, not the user's settings, instructions, packages or extensions. All arms received the same helper utilities, including Bun 1.4.4, Git, ripgrep, Node/npm, curl and unzip.

No auxiliary sessions or review logs were created, and the configured sessions contain no auxiliary usage records. Their model-call counts were 4–12, below the paired-review trigger at 40. Thus **no extra reviewer/subagent model costs are missing from this particular comparison**. The configuration retains those capabilities, but the tasks did not exercise them. Browser/MCP functionality and macOS-only TUI behavior were not separately validated.

The shell launcher's option 2 selects the main rig checkout, not a different Pi build. The benchmark used that global executable's version and active global configuration inside isolated task containers. It did not expose the main checkout, host sessions, or histories. Credentials were supplied at runtime, not in the configuration archive or image layer. Task containers were removed after execution.

## Parallelism and timing limits

All three jobs launched together, each with two task slots: **six simultaneous containers**, each limited by the task to 1 CPU and 2 GB. Docker had 10 CPUs and 16 GB; allowing all fifteen containers together would permit 30 GB and risk memory failures. Five image downloads were parallelized before the measured matrix.

| Arm | Job wall time, including queue/setup/verifiers | Median environment + agent setup per trial |
|---|---:|---:|
| Configured Pi | 17m 21.82s | 292.24 s |
| Bare Pi | 16m 32.17s | 284.99 s |
| Codex | 15m 49.70s | 239.94 s |

The complete matrix took **17m 25.57s**. Repeated package installation/setup dominated wall time. Published task images were AMD64 and ran through Docker's emulation on this Apple Silicon Mac. Parallel package installation, shared CPU/network resources, emulation and provider cache/tier differences all affect timings; use agent time rather than whole-job time when comparing this run's solving speed.

The sample was deliberately selected for manageable resource needs and some workload variety: four medium tasks and one hard task, not a random or representative benchmark sample. One attempt per task gives no variance estimate. All arms used the same five task revisions from `terminal-bench@2.0`; there were no substitutions or retries after seeing results.

## Evidence and reproduction

Run root: `~/.local/share/terminal-bench/comparison-20261116-233339/`.

- `manifest.json`: source/snapshot file hashes, installed versions, selected tasks.
- `snapshot.tar.gz`: frozen configuration without authentication or histories.
- `execution.json`: matrix wall time, concurrency and all three process exit codes.
- `jobs/{configured,bare,codex}/`: all trial results, transcripts and verifier reports.
- `summary.json`, `summary.md`: complete metrics; [committed JSON copy](results/comparison-20261116-233339.json).

The per-trial token and cost sums were reconciled with Harbor's job aggregates. All 15 trial records, all 60 verifier checks, model/effort records, task revision equality, package listings and configured snapshot identities were checked. The earlier hello-world and single-task smoke runs are excluded.

See [README.md](README.md#three-arm-five-task-comparison) for fresh-snapshot execution and inspection commands. A more demanding fixed sample or repeated runs would be needed to test whether the configured setup improves quality on harder work; that is a follow-up, not part of these results.
