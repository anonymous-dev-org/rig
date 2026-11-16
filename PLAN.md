## Overview
- Run configured Pi, bare Pi and Codex on the same five Terminal-Bench 2.0 tasks, one attempt each, gpt-6.1-sol / low thinking. User explicitly requests concurrent execution.
- Freshly snapshot current active Mac Pi configuration and resolved packages. Preserve configured behavior; bare Pi gets no custom instructions/packages/skills. No host histories, live mounts, cloud execution or upload.
- Measure verifier quality, execution/setup/total time, tokens and estimated model cost. Distinguish estimates from subscription billing, and disclose concurrency contention and small-sample limitations.

## Todos
- [x] Fifteen concurrent benchmark trials finish with an auditable configuration and comparison report.
  - Requirement: three isolated arms x five fixed tasks; current configured Pi; same main model/thinking/attempt count; bounded concurrency fitting Docker resources; saved logs and verifier results.
  - Definition of done: inspect all fifteen results, model/effort/config evidence and errors; aggregate timing/cost/quality; document limitations and repeat command; commit.
  - Delegated: workers selected five varied low-resource tasks and implemented the result summarizer; parent integrated adapters, fresh snapshot, execution and verification.
  - Verified: 15/15 trials passed, all 60 verifier tests passed; zero exceptions/retries. Sol 6.1 / low confirmed in all Pi sessions and Codex native turn contexts. Identical five task revisions across arms; all primary assistant sessions completed normally.
  - Active config: fresh 45-file snapshot, source hashes unchanged before/after, Bun lockfile preserved; four active package versions confirmed in all configured trials. Same archive hash 707a94d516fa27a78274c2d01af76486d5501dff26c88abff0244ea6cc7d5c09. Bare Pi gets no user settings/resources/packages; catalog is shared. Offline startup prevents catalog/package drift.
  - Execution: 3 concurrent arms x 2 tasks = 6 simultaneous containers; 1 CPU/2G each on 10CPU/16GB Docker. Fifteen at once would permit 30G. Images pre-pulled in parallel. Matrix 1045.57s; job wall time dominated by repeated setup. Published images are AMD64 under emulation.
  - Results: configured / bare / Codex all 5/5. Median agent seconds 62.31 / 41.45 / 49.97. Estimated USD totals 0.2911036 / 0.11553 / 0.1458972; total 0.5525308. Cost/token sums reconcile exactly with Harbor aggregates.
  - Auxiliary-model decision: retained current review/delegation config instead of silently changing it. None triggered (4–12 configured model calls; review cadence 40); no auxiliary usage records/sessions/logs. All actual model calls were primary Sol 6.1 / low.
  - Evidence: ~/.local/share/terminal-bench/comparison-20261116-233339/. Report: terminal-bench/RESULTS.md and committed summary JSON. Scripts: prepare.py, run-comparison.sh, summarize.py, configured_pi.py.
  - Limitations: quality is verifier correctness only; curated five-task single-attempt sample, not general ranking. Parallel contention/emulation and cache/tier differences affect time. USD are public-token-price estimates, not actual ChatGPT credits; configured pi-fast requests priority but delivered tier was not measured. Browser/MCP and long-run review/delegation paths not exercised.
  - Verification: source/snapshot hashes, package listings, clean Pi diagnostics, versions/effort, native stop reasons, all task revisions/test counts, token/cost reconciliation, Python/Bash syntax and git whitespace checks. No new test files.
  - Suggestions: harder fixed sample or repeated runs to measure variance; warm/bake common setup if measuring end-to-end wall time. Do not change the Mac config or optimize it based only on this sample.
