# Configured Pi: quality and speed optimization decision

## Decision

**First improve execution and verification discipline, rather than cutting verification, disabling delegation or stripping the prompt.** The council endorsed one bounded first patch: replace two existing execution-rule bullets in `pi/.pi/agent/AGENTS.md` with concrete failure-propagation and final-validation instructions. That patch and the subsequently approved instruction stages are recorded below; no speed improvement has been measured.

The parent accepts this priority. Masked intermediate failures are directly demonstrated; the size of any speed or quality benefit from revised instructions remains untested.

## Council process

- Advisors: `pi-sub-anthropic/claude-opus-5-5` and `openai/gpt-6.1-sol`, council effort `medium` (both high reasoning).
- First deliberation: three paired rounds, **unresolved** on exact proposal wording, despite both ranking execution/verification first.
- Focused reconciliation: two paired rounds on a fixed proposal, **agreed**, reason `same_proposal_endorsed`. Both endorsed the identical first-patch wording, later priorities and validation boundary below.
- The parent checked primary Cython commands and refined one research finding: the parent's outside-source installed-package smoke check is a distinct integration boundary, not redundant source-tree verification.
- At the council handover, no configuration source or live configuration had changed and no benchmark solver had been rerun. Subsequent repository-only changes are recorded below.

## What happened

These are observations from the frozen 24-task-per-arm Sol 6.1 / low run, not controlled ablations of individual instructions. See [quality results](QUALITY-RESULTS.md) and [raw results](TIERED-RESULTS.md).

| Task | Configured seconds / responses | Bare seconds / responses | Interpretation |
| --- | ---: | ---: | --- |
| build-cython-ext | 446.54 / 48 | 266.31 / 19 | Parent handed most remaining work to a child and mostly waited; prerequisite misses, overlapping exploration and an extra install/test after cosmetic editing. Both passed 11 verifier checks. |
| prove-plus-comm | 33.00 / 5 | 32.57 / 5 | Same proof/compiler workflow; 37,789 versus 7,682 recorded tokens without a meaningful elapsed difference. |
| cobol-modernization | 79.45 / 8 | 57.83 / 6 | Configured ran 90 differential cases against GnuCOBOL, checking exit status, stdout and three data files. Extra work supplied real assurance. |
| dna-assembly | 156.54 / 14 | 110.23 / 10 | Configured verified products derived from emitted primers. Bare missed an overhang extending a 43-base binding region to 47, above the limit of 45. |
| extract-moves-from-video | 756.84 / 27 | 1,215.21 / 23 | Configured still incurred two 180-second OCR timeouts before resuming existing frame outputs; bare repeatedly restarted monolithic work and used long fixed sleeps. |
| fix-git | 148.49 / 9 | 54.38 / 7 | Last tool-result to final-response intervals were 90.612 versus 19.181 seconds, with 174 versus 142 final output tokens. Much of the gap is not an observed tool loop; cause remains unknown. |

### Concrete quality defect: shell success could conceal a failed check

In the configured Cython child, a local README assertion expected 5 while the program returned approximately 7. Later diagnostic commands succeeded, so the Bash tool reported success despite the assertion failure. Another build/install/test sequence could similarly have its status replaced by later diagnostics. This is an intermediate failure-reporting defect, **not** a claim that the final submitted artifact was incorrect: later repository tests and the parent's installed-package checks passed.

The source already says to report an operation's own result. More generic reminders would duplicate an existing instruction. The proposed replacement instead gives an executable pattern that captures the required stages' status before displaying diagnostics.

The child also installed/tested, made an import-formatting-only edit, then installed/tested again. Avoiding optional edits after verification is safer than keeping those edits while skipping their required checks.

### Delegation overhead is real in one case, not the entire token difference

The Cython child recorded 33 responses, 572,199 tokens and about 388 seconds within the parent's 446.54-second window. Parent plus child totaled 807,548 tokens. Child time overlaps parent time and must not be added again. The child did useful compiled-versus-Python investigation; the missed opportunity was executing essentially a serial whole-task handoff rather than gaining parallel progress or a demonstrated specialist benefit.

Across the suite, configured recorded 2.97 times bare's total tokens, but 1.38 times its fresh input and 0.977 times its summed agent elapsed. The child accounts for only about 19% of the excess recorded tokens. Configured main alone recorded 3,938,515 tokens versus bare's 1,519,308, so eliminating this one child would not eliminate the difference.

The first successful model response had median input including cache of about 7,192 tokens configured versus 1,251 bare. Configured's median first-response cache read was 6,912 tokens. A larger mostly cached context is not evidence of proportionally greater latency or billable cost.

On the 17 tasks both arms passed, configured was faster on seven; its median paired time ratio was 1.072, although its summed elapsed was lower because long tasks dominate. This illustrates why adoption must use per-task results rather than one suite total.

### Preserve behavior that protected quality

Keep COBOL differential testing, DNA reconstruction from actual emitted primers, full diff review where required, and Cython import/compiled-extension checks against the installed package outside the source tree. Passing source-tree tests alone cannot establish that a global installation works.

Do not infer that dormant machinery caused delays: the primary sessions have no compaction entries, no reviewer usage was observed, and `goal-reminder.ts` is a no-op. No model/thinking-level experiment was performed.

## Agreed first-patch wording

Target only the two existing bullets beginning “Report the operation's own result” and “Do not rerun a check” in `pi/.pi/agent/AGENTS.md`, under **Run commands and wait for completion**. Replace them in place with:

> - Make required-stage failures propagate. Chain dependent required stages with `&&` and use Bash `pipefail` for pipelines. For a logged sequence, set `log` to the actual `.local/` log path and create its parent directory, then use `( set -o pipefail; step1 && step2 ) >"$log" 2>&1; rc=$?; tail -n 40 "$log"; (exit "$rc")`, replacing the step placeholders with the actual required stages. A trailing diagnostic must never replace their exit status. If independent checks continue after a failure, retain each result and return nonzero if any required check failed. A process exiting or an exit file existing does not prove success: inspect the exit status, required results and relevant downstream jobs. An unfinished check is not a pass.
> - Check known prerequisites before an expensive build or test. Complete necessary edits, including formatting, before final validation; avoid optional cosmetic edits afterwards. Reuse a check only while its inputs and execution boundary remain unchanged; read its saved log instead of rerunning for presentation. After any subsequent code change, rerun the affected required checks. Source-tree tests do not replace installed-package or outside-source integration checks.

This replaces rules rather than adding another instruction section. Preserve safety/approval rules and all substantive verification. Do not add planning bookkeeping. Do not change delegation, `worker.md`, model/thinking, retries, compaction, extensions, packages or communication in this first version. Verify instruction inheritance in workers rather than preemptively repeating these rules in their prompts. Live synchronization requires separate approval.

A disposable ordinary-Bash check of this pattern passed three cases: early required-stage failure returned 1, a failed pipeline returned 1, and successful work returned 0, despite trailing log display. That proves these shell examples, not Pi-tool integration, worker compliance or performance improvement.

## Stage 1 repository patch and local checks

Commit `afe4981` applied the two replacement bullets above to `pi/.pi/agent/AGENTS.md`. That initial patch changed no other instruction, worker prompt or runtime setting.

- Actual Pi Bash-tool checks passed: early required-stage failure returned **7**, pipeline failure returned **9**, successful required stages returned **0**, and independent checks continued but collectively returned **1**. Trailing log display did not replace any result; dependent stages after failure did not run.
- An initial offline check using the installed Pi prompt builder and pi-subagents agent discovery/prompt rewriting confirmed the parent received both rules. The repository worker resolved to `systemPromptMode: replace`, `inheritProjectContext: false` and `inheritGlobalContext: false`, so **the worker did not receive either rule**. This checked prompt construction, not model compliance; no provider request was made.
- The initial patch left worker coverage unresolved because worker-prompt changes were explicitly excluded. The user subsequently approved adding the same focused execution guidance to `worker.md`, without enabling broader instruction inheritance.
- `node --test pi/sync-settings.test.mjs` returned **1**: **41 passed, 2 failed**. The unchanged suite expects a Playwright `--headless` argument absent from the existing defaults and references the absent legacy `init.sh`. Neither failure involves the edited instructions; do not treat this suite as passing or repair those separate issues here.
- Local diagnostic logs are under the ignored `.local/stage1-*` paths. The first offline prompt-check attempt could not resolve the host's `pi-ai` peer dependency; explicitly supplying the installed host module directory through `NODE_PATH` allowed the check to complete without package or configuration changes.

### Authorized worker-prompt follow-up

The same two execution/verification bullets are now included directly under **Validation** in `pi/.pi/agent/agents/worker.md`. All existing worker instructions and frontmatter remain unchanged.

An offline check executes the installed pi-subagents runtime's input-filter and final-boundary hooks with Pi's prompt builder. Both rules survive in the constructed worker prompt exactly once, unrelated global/project instructions remain excluded, and the same check detects the original worker's missing rules. The worker still resolves to replacement-prompt mode with both inheritance flags false. This closes the instruction-coverage gap, not a claim of model compliance or performance improvement. The successful check is logged in `.local/stage1-worker-followup.RdhHQu`; an earlier text-only probe omitted the runtime's structured-input filtering and was replaced with this runtime-hook check.

The earlier four Pi Bash checks and the existing settings-suite result remain applicable: the command pattern, Bash tool and settings-test inputs are unchanged. No live synchronization, provider request, solver comparison or stage-2 delegation change accompanies this follow-up.

## Stage 2: benefit-based delegation

The opening delegation rule now requires an expected quality or elapsed-time benefit after startup, context, handoff and integration costs. It allows useful parallel progress or bounded specialist investigation, rather than treating a serial transfer as a benefit by itself. The handoff rule now passes relevant existing findings, paths and completed checks; file ownership and the parent's necessary integration checks remain explicit.

Manual decision walkthroughs:

- **Serial:** the parent already knows the one-file change, has no independent work and has no concrete specialist need. Keep the change local rather than launch a child just to wait.
- **Separable:** a child can implement a UI in assigned UI files against a shared API contract while the parent implements the API in different files. Delegate the UI with the contract and existing findings; the parent still checks the combined behavior.

Explicit user requests for delegation, councils and reviews are preserved; an independent review still requires explicit approval. A bounded specialist investigation can justify delegation even when parallel implementation is unavailable.

The offline prompt check passed and confirmed only the two opening delegation paragraphs changed, the new wording reaches the parent prompt, and stage-1 parent/worker guidance is intact. Log: `.local/stage2-delegation.CupSZb`. These walkthroughs and prompt checks do not establish future model choices or a timing improvement; the solver comparison remains separate.

## Stage 3: resumable, resource-aware independent-item batches

One matching batch-execution bullet is now present in both parent and worker instructions. It calls for a representative throughput sample, concurrency and thread limits within the job's real CPU/memory budget, progressive per-item outputs, and content/input/parameter/tool-identity validation before reuse. Missing, corrupt or stale work is recomputed, and completeness plus required end-to-end checks remain mandatory. No job framework was added.

Local checks passed:

- A disposable six-item batch received an actual `SIGINT` after four completed outputs. Resume preserved the valid unchanged output byte-for-byte and with the same modification time. It recomputed a semantically corrupt result, truncated JSON, an output with changed input, an incomplete item and a missing item; all **6/6** final outputs validated.
- A second resume rejected changed processing parameters and a changed tool-version record while retaining the other four valid outputs.
- The toy batch timed two sample items and estimated total work. It used one worker and one thread under an explicit **1 CPU / 64 MiB** test budget, with measured peak memory below that limit. This checks the mechanics, not representative OCR throughput or a speed gain.
- The installed runtime's prompt hooks confirmed all three execution/verification rules appear exactly once in the worker prompt, broader global/project context remains excluded, and stage-2 delegation wording is preserved. Only the matching batch bullet was added to each instruction file.

Logs: `.local/stage3-batch.eG0IDu` and `.local/stage3-prompt.UpTYLV`. The disposable batch and prompt files were removed; no test infrastructure or fixtures were added to the repository.

All three instruction stages are implemented and locally checked. The earlier four Bash checks remain applicable, and the unchanged settings suite retains its recorded **41 passed / 2 failed** result rather than being rerun or called passing. MR/merge, live synchronization, session reload and a solver comparison are subsequent rollout steps; none was performed here.

## Priority summary and deferred work

| Rank | Candidate | How and guardrail |
| --- | --- | --- |
| 2 | Benefit-based delegation—implemented | Require credible useful parallel work or specialist investigation after counting handoff/context/integration cost. Prefer local execution for an essentially serial handoff without that benefit. Preserve user-requested councils/reviews, ownership and parent integration checks. One Cython observation is not enough to disable delegation globally. |
| 3 | Long-batch recovery—implemented | Probe a small representative batch, respect actual CPU/memory and per-process thread limits, and resume completed per-item outputs only after validating content and unchanged inputs. A nonempty file alone is not proof. No new job framework. |
| 4 | Repair measurement and benchmark prerequisites separately | Persist tool-side web-helper usage. Investigate FEAL's missing `stdint.h`, Git-webserver HTTP 404s and Caffe completion without changing historical scores or calling incomplete work successful. Do not assume the APT workaround caused the header failure. |
| 5 | Consider narrow context consolidation after measurement | Consolidate repeated prose and make worker documentation lookup, React guidance and report detail conditional where appropriate. Preserve useful engineering requirements. The proof and fix-git evidence do not support a promised speedup from shorter instructions. |

## Proposed solver comparison—not authorized

Parent and worker instruction coverage have been checked locally as recorded above. Live synchronization and the solver comparison still require separate approval.

Then compare the frozen configuration against the candidate on six tasks: `build-cython-ext`, `cobol-modernization`, `dna-assembly`, `prove-plus-comm`, `fix-git` and `extract-moves-from-video`. Pin model, low effort, package/runtime versions and resource limits; use fresh isolated artifacts and counterbalance arm order. One attempt per arm per comparison. Predeclare two additional paired repetitions each for fix-git, Cython and video, not retries until success. This is **24 solver trials total**: 12 initial plus 12 repeated.

Report each task's artifact/verifier correctness, constraint and maintainability findings, elapsed main wall including child waits, separate main/child responses, fresh/cached/output tokens, provider errors and timeouts. Inspect masked failures, prerequisite misses, cosmetic-edit rebuilds and preservation of the valuable checks above. Never add child elapsed to parent elapsed or treat recorded tokens as actual subscription charges. Retain lower-bound warnings until helper usage is fully metered.

Reject adoption if required checks are lost, failures are masked, artifacts are incomplete or quality regresses. Investigate added turns from extra probes and timing noise before claiming a speed gain. No full-suite rerun or automatic routing system is proposed.

## Provenance and remaining limits

- Frozen configuration SHA-256: `ffa25dc227fa53e59ca2270ca1850972efaa909b140198d8b3d4f54b68ba499d`.
- Private run root: `~/.local/share/terminal-bench/comparison-20261117-161604-restart/`.
- Read-only forensic research: `~/.pi/agent/sessions/--Users-p78tr4-Documents-anonymous-rig-.pi-worktrees-pi-v3--/subagent-artifacts/756c4ff1-6211-4782-a31b-3f1e7890ae82_worker_output.md`; includes native session paths and pinpoint lines for five task pairs and the Cython child.
- Parent independently inspected fix-git/video command timelines and Cython parent lines 14–26 / child lines 58–66. Suite metrics were recalculated from portable total-scope rows; primary-session event types and first-response usage were parsed directly.
- At inspection, active `AGENTS.md`, worker prompt, line-file tools and compaction fallback matched the frozen files byte-for-byte. Installed package versions matched the frozen versions. The review extension differed; do not attribute the historical results to that newer state.
- Seven original trials have partial provider accounting. Single attempts, a non-random task subset, emulation, concurrent load and external-service behavior limit causal conclusions. Council agreement is a recommendation, not experimental proof.
