# Line tools: measured tokens and time

## Result

The harness-managed line tools saved tokens on all **17 completed pairs**. The substantive fuzzy-scoring replacement used a median **36.1% fewer total tokens**, **45.4% fewer output tokens in edit-producing responses**, and **38.5% less task time** by paired comparison. Small repairs had essentially tied paired latency, not a reliable speed advantage.

**The planned 36-run batch did not finish.** Runs 1–34 completed and passed checks. Run 35 (line tools, sixth separated-edit repetition) was rejected by the provider: “The ChatGPT user has reached their Subscription Sharing usage limit.” The fail-closed accounting rule prevented run 36 from being dispatched. The failed attempt remains in the evidence, was not rerun, and is not represented as a successful fast run. There are six small pairs, six large pairs, and five separated pairs—not 18 pairs or 36 successful tasks.

Known catalog-estimated task usage was **$3.487330**, below the approved $30 stop-new-runs threshold. The failed request's zero usage is an SDK placeholder, not authoritative billing evidence. These costs are not OAuth invoice charges, and exclude preparation/review conversations.

## Completed paired results

Times and token counts below are marginal medians across completed runs. Percentage columns are **medians of each pair's line/stock change**, not ratios of the displayed medians. Total tokens include uncached input, cache reads, cache writes, and output; reasoning tokens are a subset of output, not added again.

| Workload | Pairs | Stock time | Line-tool time | Paired time change | Stock total tokens | Line-tool total tokens | Paired token change |
|---|---:|---:|---:|---:|---:|---:|---:|
| One-line UndoStack repair | 6 | 15.90 s | 16.54 s | −0.4% | 5,775 | 5,406 | −6.4% |
| Substantial fuzzy-scoring refactor | 6 | 68.39 s | 42.90 s | −38.5% | 21,094.5 | 13,278 | −36.1% |
| Three separated OSC parsing regions | 5 | 43.51 s | 35.42 s | −18.9% | 12,510 | 10,500 | −15.2% |

Line tools were faster in **14/17** pairs: 3/6 small, 6/6 large, and 5/5 separated. They used fewer total tokens in **17/17** pairs. This is a descriptive result for three repeatedly sampled tasks, not a population-wide performance estimate.

Retained task-time ranges:

- Small: stock **14.98–18.24 s**, line **15.00–60.80 s**.
- Large: stock **61.27–78.40 s**, line **33.04–51.33 s**.
- Separated: stock **42.61–47.40 s**, line **32.49–43.37 s**.

The 60.80-second small line-tool run remains in every relevant statistic. No slow samples were removed or selectively rerun.

### Edit-producing responses

This measures actual reported output usage for assistant responses containing an `edit` call. It includes any other output and reasoning represented in that response; it is **not** tokenization of the JSON arguments alone.

| Workload | Stock median output | Line-tool median output | Median paired change |
|---|---:|---:|---:|
| Small | 53 | 37 | −30.2% |
| Large | 2,301 | 1,237.5 | −45.4% |
| Separated | 1,375 | 650 | −53.7% |

Across the 17 completed pairs:

| Metric | Stock | Line tools |
|---|---:|---:|
| Model requests | 72 | 68 |
| Uncached input tokens | 72,096 | 70,483 |
| Cached-input tokens | 118,016 | 81,024 |
| Cache-write tokens | 0 | 0 |
| Output tokens | 23,639 | 13,611 |
| Reasoning tokens (included in output) | 7,379 | 4,060 |
| Total tokens | 213,751 | 165,118 |
| Edit-producing-response output | 20,969 | 10,989 |
| Catalog-estimated task cost | $2.020926 | $1.466404 |

Catalog rates were $10 per million uncached input tokens, $50 per million output tokens, and $1 per million cache-read tokens (cache-write rate $12.50, unused). All contexts were below the higher-price tier. Usage counts come from the completed responses; the SDK's total is the sum of those categories, and its cost is catalog-derived, not provider-reported charges.

That is **22.8% fewer total tokens**, **42.4% fewer output tokens**, and **47.6% less edit-producing-response output** in aggregate. Cache mix matters: the small task's median paired catalog cost actually increased **14.1%**, despite fewer total tokens. Do not equate every token with the same price.

## Why the savings differ from the earlier OMP experiment

This compares the **new minimal line extension**, not the OMP adapter. Stock `edit` repeats old text and new text; the line tool emits replacement text plus line keys and leaves freshness hashes in the harness. Large replacements therefore offer an opportunity that one-line fixes barely exercise.

The measured reduction is not attributable solely to omitted old text. These variants also differ in descriptions, read formatting, returned edit feedback, generated implementations, and reasoning usage. The first small request had 1,201 uncached input tokens with stock versus 1,058 with line tools. Four of six stock large runs made an extra verification read after the visible check, while every line-tool large run completed in four model requests. Stock and line solutions were behaviorally equivalent but not byte-identical. These effects all belong to the measured workflow; this experiment does not isolate a single causal factor.

Every completed live run used one edit call. Stock batched its separated replacements into `edits[]`; the line variant used a single `changes` mapping. The advantage here was not simply fewer edit calls.

## Tasks and correctness

Public source: [earendil-works/pi](https://github.com/earendil-works/pi/tree/b4afdddf44e059c67ccf5097e5317d913521b470), pinned commit `b4afdddf44e059c67ccf5097e5317d913521b470`. The complete upstream MIT license, initial source bytes, source hashes, reference solutions, prompts, and checks are retained in the evidence.

1. **Small:** `packages/tui/src/undo-stack.ts`, 28 lines. Seed `pop()` → `shift()`, then restore destructive newest-first behavior. Check snapshot cloning, nested objects/Map, ordering, falsy values, length, and clear/reuse.
2. **Large:** `packages/tui/src/fuzzy.ts`, 159 lines. Replace private scoring in lines 12–86 to score greedy and contiguous alignments without position arrays, preserving public behavior and score weights. Differential checks compare against the original implementation across exhaustive short strings, 1,000 deterministic longer cases, boundary cases, and filtering behavior. A syntactic allocation check is supplemented by source inspection.
3. **Separated:** `packages/tui/src/terminal-colors.ts`, 91 lines. Normalize hash/rgb/rgba decoding across three regions, totaling 43 editable lines. Check 1–4-digit channels, supported hash widths, scaling, prefix case, alpha validation, malformed forms, foreground/background/palette replies, BEL/ST framing, and unchanged scheme reports.

Both variants received identical constraints: **replace existing lines, preserve total line count, keep lines outside declared regions unchanged, and blank obsolete lines rather than deleting them**. Only `read`, `edit`, and `bash` were enabled. This deliberately exercises the prototype's supported subset; it is not an unrestricted coding-agent benchmark and says nothing about insertion/deletion or whole-file rewrites. Actual read ranges remained model-selected; the first large reads all exposed the full source, with later verification reads differing.

Reference preflights passed for both tools; every starting fixture failed its visible/held-out requirements, every reference passed, and leaving any of the three OSC regions unchanged failed. All **34 completed runs** passed frozen held-out checks, line-count/outside-region preservation, and unchanged-check/license manifests. Source audit confirmed the requested incremental fuzzy algorithm with no position arrays and the OSC shared decoder/signature requirements. An additional **post-run**, nine-case embedded CR/LF channel audit passed for all ten completed OSC runs; it was not part of the frozen checks and did not trigger any model reruns.

Actual edit sizes—not just editable envelopes—were:

| Workload | Stock changed line slots | Line-tool changed line slots | Stock nonblank replacements | Line-tool nonblank replacements |
|---|---:|---:|---:|---:|
| Small | 1 | 1 | 1 | 1 |
| Large | 62–64 | 52–64 | 53–58 | 44–58 |
| Separated | 22–23 | 24–27 | 19–21 | 14–22 |

Line slots count differences at fixed original line numbers, including blanking and moved code; nonblank replacements include comments. The large task genuinely exercised dozens of replacement lines. The separated task turned out smaller than its reference solution, and should not be described as 43 newly written lines.

## Timing protocol and local execution

- Pi **1.5.2**, line extension commit **`93b2753`**, Node **26.13.1**, Bun **1.4.4**, macOS ARM64.
- `openai/gpt-6-astra`, high thinking, normal short cache retention, SSE. Fresh fixture/cwd, session, hash store, settings and resource loader per run. No project context, skills, MCP or other extensions.
- Six planned rounds, small → large → separated. Adjacent stock/line pairs, first variant alternated by task and round. No parallel measured runs.
- Requested 8,192 output tokens, at most 12 requests/task, abort requested at 150 seconds. Agent retries, compaction and cache warming disabled; request retry setting zero.
- Task wall time: prompt dispatch through settlement; includes visible checks and final answer, excludes setup/import/disposal and hidden checks.
- Request interval: stream invocation through assistant completion, including network/provider waiting and local stream processing—not pure inference time.
- Tool interval: execution start through end. Sums can overlap; they are not a guaranteed partition of task wall time.
- Literal relative file paths and exact `ls`/`bun check.ts` commands enforced by hooks. **Not an OS sandbox:** source executed by checks has host-process permissions.
- Usage saved before post-validation; uncertain usage stops subsequent paid runs. An exclusive in-flight marker prevents accidental concurrent launches or blind restart after a crash.

There were no tool errors, recovery attempts, request-limit exits, timeouts, compactions, or retries among completed runs. Provider run 35 failed before any tool use. Completed calls also establish that this provider accepted the extension's mapping schema; they do not establish universal provider compatibility.

### Offline local timing

Five warmups plus 50 retained samples per task/variant (300 samples), alternating variant order. Each sample reads the full source and applies the deterministic reference edit; resulting source bytes are verified outside the timed interval. Stock uses one enclosing changed-span replacement; line tools use changed-row mappings. These payloads are deliberately fixed and are not the live model's chosen edits.

Median read-plus-edit milliseconds, with nearest-rank p10–p90:

| Task | Stock | Line tools |
|---|---:|---:|
| Small | 0.612 [0.410–1.679] | 0.489 [0.337–0.994] |
| Large | 2.366 [2.140–4.205] | 0.488 [0.394–0.711] |
| Separated | 1.161 [0.969–2.057] | 0.495 [0.392–0.865] |

Five fresh processes per variant, alternating order and with warm OS caches: median whole-child wall time **428.93 ms stock / 436.91 ms line**. Median SDK import was **342.68 / 345.00 ms**; session/resource setup was **10.13 / 20.50 ms**. Whole-child wall includes fixture preparation, first read and disposal and is not a pure extension-load measurement.

Local differences are milliseconds; live task differences are seconds. This supports focusing on model requests and output, rather than treating local file I/O as the main speed explanation.

## Evidence and limitations

[Machine-readable evidence](line-file-tools-benchmark-results.json) retains all 35 attempted-run records, response usage and stop reasons, tool arguments/results/timings, initial/final manifests, final source, prompts/checks/reference data, the provider refusal, frozen runner/fixture/extension hashes, and all 300 local/10 startup samples. It excludes credentials and private reasoning text. Full serialized provider-request contexts were not captured; tool schemas/descriptions and the system prompt were reconstructed offline after measurement from the unchanged extension and installed SDK, labeled separately from the frozen task prompts and live traces. Paths are normalized and reconstruction-time metadata is not evidence of the original request context. Runner scripts are disposable, not a permanent benchmark framework or self-contained executable artifact.

The independent pre-run review caught and corrected placeholder-zero usage accounting before paid calls. A separate read-only results review accepted the report with no publication blockers and inspected all 22 substantial final sources. The reviewer checked computation logic and retained summaries, but could not execute an independent statistical recomputation or rerun validations. The parent additionally verified all 140 completed-request token-category sums and catalog-cost identities, final-source hashes, frozen hashes, and the exact upstream license. The review text is retained in the JSON evidence.

Conclusions are limited to **three controlled tasks and 17 completed pairs on one model/provider**. Repeats measure variation, not breadth; cache effects, different valid implementations, line-preservation constraints and provider latency limit generalization. The sixth separated pair remains incomplete due to provider access, not the dollar threshold. No extension optimization, settings deployment, or selective rerun was performed during measurement.
