# Tiered Terminal-Bench comparison: raw results

## Outcome

**72/72 trials recorded: 24 distinct tasks on each of configured Pi, bare Pi and Codex.** The selected tasks are 4 officially easy, 10 medium and 10 hard. Solver and delegated-agent model: `openai/gpt-6.1-sol`, low thinking. The restarted matched run used one solver attempt per trial, no automatic retries, and one task slot per arm.

All three Harbor processes exited 0. The outer launcher exited **1**, correctly surfacing four trial exceptions rather than treating Harbor's exit status as success: all three arms timed out on `caffe-cifar-10` at its 1,200-second agent limit; Codex refused `break-filter-js-from-html`. Every selected task nevertheless has a saved result, with no duplicate or missing task per arm. There were no agent-setup exceptions in the restarted run.

Native logs also reveal two provider errors that Harbor did not classify as trial exceptions, both on `break-filter-js-from-html`: bare Pi received a cybersecurity-policy rejection; configured Pi's last request hit a subscription-sharing usage limit after producing its artifact. Their zero-usage error entries are retained as failed requests, not counted as model-response turns, and their usage coverage is flagged.

**These are raw measurements and automated verifier outcomes, not a code-quality assessment.** Quality review remains a separate next step.

## Files

- [Per-trial CSV](results/tiered-20261117-161604.csv): 216 rows, one each for main/subagent/total scope in every trial.
- [Portable raw JSON](results/tiered-20261117-161604.json): the same rows, official task selection and hashes, accounting warnings, and interrupted-attempt provenance.
- [Run setup and accounting definitions](TIERED-RUN.md).
- Private full evidence: `~/.local/share/terminal-bench/comparison-20261117-161604-restart/`. This retains native sessions, `usage-ledger.jsonl`, per-trial `result.json`, verifier output, artifacts, configuration proof, runtime hashes and console logs. Credentials, histories and solution artifacts are not committed with this report.

## Overall recorded usage

Agent seconds are the sum of Harbor's per-trial agent execution windows, excluding setup and verification. They include waiting for subagents; child elapsed time is not added again. Cache reads are already part of reported input, so fresh + cached + output equals total here; cache writes were zero.

| Harness | Agent seconds | Turns | Fresh input | Cached input | Output | Total tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Configured Pi | 6,688.06 | 316 | 481,031 | 3,971,328 | 58,355 | 4,510,714 |
| Bare Pi | 6,848.18 | 226 | 348,970 | 1,139,200 | 31,138 | 1,519,308 |
| Codex | 6,704.85 | 531 | 614,934 | 18,473,984 | 80,045 | 19,168,963 |

These figures include failed trials and the Codex refusal. The complete matched run recorded **1,073 model responses, two additional failed provider requests and 25,198,985 tokens**. They are recorded amounts, not a complete all-provider bill: see the coverage limitations below.

Median agent seconds per task were **100.20 configured**, **90.52 bare**, and **102.50 Codex**. Harness job wall times, including setup and verification, were 12,153.75 / 12,108.24 / 11,846.41 seconds respectively, approximately 3h 22m / 3h 22m / 3h 17m. Parallel queues make these wall times overlap.

## Main agents versus subagents

| Harness / scope | Agent seconds | Turns | Fresh input | Cached input | Output | Total tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Configured main | 6,688.06 | 283 | 430,184 | 3,455,872 | 52,459 | 3,938,515 |
| Configured child | 388.256 | 33 | 50,847 | 515,456 | 5,896 | 572,199 |
| Bare main | 6,848.18 | 226 | 348,970 | 1,139,200 | 31,138 | 1,519,308 |
| Bare child | 0 | 0 | 0 | 0 | 0 | 0 |
| Codex main | 6,704.85 | 531 | 614,934 | 18,473,984 | 80,045 | 19,168,963 |
| Codex child | 0 | 0 | 0 | 0 | 0 | 0 |

Configured Pi launched one worker on `build-cython-ext`. Its native session has 33 assistant responses; the worker's completed status also reports 33 turns and 388.256 elapsed seconds. Its model and thinking metadata confirm Sol 6.1 / low. The parent execution window was 446.537092 seconds. **Main and child times overlap and are not additive; token counts and turns are additive.** No reviewer-call records or other child sessions were observed.

Harbor reported only the main agent's 235,349 tokens for that configured trial. Adding the canonical child's 572,199 tokens yields **807,548**. Using the child status summary alone would miss cache reads: its `tokens.total` is 56,743, whereas the native session's actual total including cache reads is 572,199. The export uses native calls, not that aggregate.

## By official difficulty

These rows include main and child recorded usage, including exceptions.

| Difficulty | Harness | Tasks | Agent seconds | Turns | Fresh input | Cached input | Output | Total tokens |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Easy | Configured | 4 | 403.55 | 42 | 54,224 | 432,640 | 6,384 | 493,248 |
| Easy | Bare | 4 | 253.55 | 37 | 31,681 | 115,968 | 3,382 | 151,031 |
| Easy | Codex | 4 | 361.43 | 42 | 50,726 | 765,056 | 7,753 | 823,535 |
| Medium | Configured | 10 | 3,586.36 | 166 | 259,483 | 2,208,896 | 28,566 | 2,496,945 |
| Medium | Bare | 10 | 3,454.87 | 87 | 152,210 | 605,696 | 11,895 | 769,801 |
| Medium | Codex | 10 | 3,627.98 | 269 | 304,985 | 9,886,080 | 36,690 | 10,227,755 |
| Hard | Configured | 10 | 2,698.16 | 108 | 167,324 | 1,329,792 | 23,405 | 1,520,521 |
| Hard | Bare | 10 | 3,139.76 | 102 | 165,079 | 417,536 | 15,861 | 598,476 |
| Hard | Codex | 10 | 2,715.43 | 220 | 259,223 | 7,822,848 | 35,602 | 8,117,673 |

## Automated verifier outcomes

A pass means reward 1, valid reward, and no trial exception. This is functional execution evidence, not a maintainability, safety or code-quality judgment.

| Harness | Easy | Medium | Hard | Total |
| --- | ---: | ---: | ---: | ---: |
| Configured Pi | 4/4 | 9/10 | 8/10 | 21/24 |
| Bare Pi | 4/4 | 6/10 | 7/10 | 17/24 |
| Codex | 4/4 | 8/10 | 8/10 | 20/24 |

## Accounting coverage and interrupted work

Seven trials have `accounting_complete=false`:

- `caffe-cifar-10` on all three arms: the timeout may omit an in-flight request's final provider usage.
- Configured `build-pov-ray`, `caffe-cifar-10`, and `dna-assembly`: the frozen web-search/answer helper makes provider calls without persisting their token usage. These are tool-side model requests, distinct from persisted subagent sessions. The displayed figures are therefore recorded lower bounds. The running configuration was not modified to fix this after launch.
- `break-filter-js-from-html` on both Pi arms: native provider errors have no reported token usage; their zero counters are recorded placeholders, not proof of billed consumption.

There are nine warning records across those seven distinct trials. Recorded main/subagent values remain available rather than being discarded; unknown additional consumption is not silently treated as zero. The other 65 trials have no detected accounting gap under the native-call reconciliation.

The first launch was interrupted by the supervising worker's 30-minute lifetime. The user explicitly authorized another attempt. Its three interrupted trial directories and `/app` artifacts were archived before restarting with the identical snapshot under a persistent launcher. The interrupted configured solver recorded another **9 responses and 80,092 tokens**: 12,032 fresh, 67,200 cached, 860 output. These are retained in the JSON's restart provenance and excluded from the matched 72-trial figures above. No model sessions were retained for the other interrupted arms; their consumption is unavailable, not asserted to be zero.

## Verification and limits

- All 72 results match the exact selected task set, pinned revision `69671fbaac6d67a7ef0dfec016cc38a64ef7a77c`, model, low effort and expected harness versions. All 49 Pi main/child thinking-level records are low.
- All 24 configured trials prove snapshot SHA-256 `ffa25dc227fa53e59ca2270ca1850972efaa909b140198d8b3d4f54b68ba499d`. The archive and all three frozen runtime hashes match.
- Native main input/cache/output totals reconcile with Harbor for all 72 trials. Child usage is added only from canonical call records; inherited history and copied review usage are deduplicated.
- Codex's 531 exported turns independently match 531 distinct cumulative-usage increments in its native session files. They are model responses, not shell commands or CLI user turns.
- The child native turn count, input/output counters and duration reconcile with its completed status. Cached tokens come from native calls because status aggregates omit them.
- Source checks passed: shell syntax, Python AST parsing, Git whitespace, baseline usage reproduction, and disposable fork/reviewer deduplication and unmetered-helper checks. No benchmark solver was rerun for verification.

This is one attempt on a deterministic alphabetical subset, not a random representative estimate. The complete official dataset has only four easy tasks. Apple Silicon emulation, external downloads, caches, service contention and setup overhead limit timing conclusions. No code-quality winner is claimed here, and token counts are not actual subscription charges.
