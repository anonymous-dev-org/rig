# Quality analysis of the 72-trial comparison

## Conclusion

**Configured Pi leads strict benchmark completion, but this run does not establish a general code-quality winner.** Configured Pi and Codex have identical pass/fail outcomes on the 23 tasks other than the policy-sensitive HTML-filter task. Bare Pi has three additional verifier failures; inspection shows one clear output-correctness error and two more nuanced source-packaging/conformance failures.

This analysis uses the frozen run in `~/.local/share/terminal-bench/comparison-20261117-161604-restart/`, after raw collection completed. It covers all 72 recorded verifier outcomes, diagnostics for every failing task, and matched code spot-checks on adaptive rejection sampling, asynchronous cancellation and the Bottle vulnerability fix. It is not a line-by-line maintainability audit of every submitted program.

## Strict completion

| Harness | Easy | Medium | Hard | Total | Rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Configured Pi | 4/4 | 9/10 | 8/10 | 21/24 | 87.5% |
| Bare Pi | 4/4 | 6/10 | 7/10 | 17/24 | 70.8% |
| Codex | 4/4 | 8/10 | 8/10 | 20/24 | 83.3% |

A pass requires reward 1, valid reward and no trial exception. No score has been adjusted or retroactively converted to a pass.

### Per-task outcomes

✅ Passed; ❌ verifier failure; ⛔ provider refusal/rejection; ⏱ agent timeout; ⚠ shared verifier prerequisite failure (still an official failure).

| Task | Configured | Bare | Codex |
| --- | --- | --- | --- |
| cobol-modernization | ✅ | ✅ | ✅ |
| fix-git | ✅ | ✅ | ✅ |
| overfull-hbox | ✅ | ✅ | ✅ |
| prove-plus-comm | ✅ | ✅ | ✅ |
| adaptive-rejection-sampler | ✅ | ✅ | ✅ |
| break-filter-js-from-html | ✅* | ⛔ | ⛔ |
| build-cython-ext | ✅ | ✅ | ✅ |
| build-pmars | ✅ | ❌ | ✅ |
| build-pov-ray | ✅ | ❌ | ✅ |
| caffe-cifar-10 | ⏱ | ⏱ | ⏱ |
| chess-best-move | ✅ | ✅ | ✅ |
| code-from-image | ✅ | ✅ | ✅ |
| compile-compcert | ✅ | ✅ | ✅ |
| constraints-scheduling | ✅ | ✅ | ✅ |
| bn-fit-modify | ✅ | ✅ | ✅ |
| cancel-async-tasks | ✅ | ✅ | ✅ |
| circuit-fibsqrt | ✅ | ✅ | ✅ |
| configure-git-webserver | ❌ | ❌ | ❌ |
| dna-assembly | ✅ | ❌ | ✅ |
| extract-moves-from-video | ✅ | ✅ | ✅ |
| feal-differential-cryptanalysis | ⚠ | ⚠ | ⚠ |
| feal-linear-cryptanalysis | ✅ | ✅ | ✅ |
| fix-code-vulnerability | ✅ | ✅ | ✅ |
| fix-ocaml-gc | ✅ | ✅ | ✅ |

*Configured produced a passing HTML artifact, but its final provider request hit a subscription-sharing usage limit. Bare was rejected before a measured model response; Codex returned a safety-refusal exception. This is not a clean comparison of three completed implementations.

## What explains the differences?

### pMARS: Debian packaging check, not proven wrong provenance

Bare passed binary existence, no-X11 linkage and debugger checks, but failed `test_debian_source_used` because `/app/pmars-0.9.4/debian/` was absent. Its saved commands show downloads from `https://deb.debian.org/debian/pool/main/p/pmars/`: both the upstream-source archive `pmars_0.9.4.orig.tar.xz` and Debian's `pmars_0.9.4-1.dsc` metadata.

The retained archive SHA-256 is `d0467d602c37af6e887ac81f4cbb812d090224411196d3401023843630fdd00d`, and it matches the retained `.dsc`. Bare did not extract the Debian packaging tree. It therefore missed the grader's packaging expectation, but calling its source non-Debian would overstate the evidence. Configured and Codex satisfied all four checks.

### POV-Ray: source-distribution conformance, despite passing rendering and version checks

Bare passed two of three checks. It downloaded `POVSRC.ZIP` and `POVDOC.ZIP` from the official POV-Ray 2.2 archive directory. Its saved tree retains uppercase metadata names such as `FILE_ID.DIZ`, while the grader expects lowercase paths and particular metadata hashes. Some metadata bytes also differ; this is not established to be merely a filename-case issue.

The failure is `test_povray_built_from_correct_source`; `test_illum1_render_and_verify` and `test_povray_version` both passed. Configured and Codex matched the grader's required source layout and hashes. This is stronger benchmark conformance, but the failure does not by itself establish that bare's renderer behaved incorrectly or used an unofficial source.

### DNA assembly: a concrete correctness difference

Bare failed the primer validation because the reverse primer's full annealing tract was **47 nucleotides**, exceeding the allowed maximum of **45**. The verifier includes overhang/template overlap in that length. Configured and Codex passed. This is a demonstrated output constraint violation, not just packaging or provider behavior.

### HTML filter: provider behavior dominates the comparison

Configured alone produced a passing artifact. The other two arms were refused/rejected, and configured itself hit a quota error on its final request. Its extra benchmark pass is real, but cannot establish that its coding instructions produce better implementations than Codex on this task.

## Shared failures are not all code-quality failures

- **FEAL differential cryptanalysis:** every verifier failed before testing the attack. The verifier installs `gcc` and tries to compile `feal_in_c`; compilation reports `fatal error: stdint.h: No such file or directory`, followed by `ModuleNotFoundError: feal_in_c`. This is a shared verifier dependency problem. The container-wide `APT::Install-Recommends "false"` workaround may contribute to missing development headers; that causal explanation has not been tested in a controlled rerun. The attack implementations remain ungraded by this check, not proven correct or incorrect.
- **Git webserver:** all three failed the end-to-end test with HTTP 404. The verifier tries an SSH clone, commit, push and HTTP fetch. Retained traceback excerpts also show an interrupted `expect` interaction, but are insufficient to isolate the first cause. Treat this as an unresolved shared integration failure, not a proven harness-only fault or a successful server setup.
- **Caffe:** all three hit the 1,200-second agent limit. Configured and Codex have real training logs that did not reach iteration 500; bare lacks a training log and still has GPU mode in the solver configuration. None delivered the complete required result. Resource/time pressure is a confound, not grounds to award a pass. The verifier also reports missing expected build paths and model files.

## Code-quality spot-checks

### Asynchronous cancellation: all correct in the checked cases; different designs

All three `artifacts/app/run.py` files passed the six official checks. Additional disposable checks against the saved functions confirmed bounded execution, awaited cleanup on caller cancellation, and sibling cleanup after a job fails for all three.

Bare and Codex use `asyncio.TaskGroup` to own worker lifetimes and automatically cancel/await sibling workers after failure. Configured uses `asyncio.gather` with explicit cancellation and a second awaited gather in `finally`. Its implementation is correct in the checked cases and clearly documented. The TaskGroup versions express the same lifetime-management requirement more directly through the standard library; that is a local maintainability preference, not evidence of an overall harness winner. Their error API also differs: TaskGroup groups job failures, whereas configured propagates the gather failure after cleanup.

### Adaptive rejection sampling: all pass, with meaningful testing/design differences

I read all three complete `artifacts/app/ars.R` files. All pass the nine official checks and include modular numerical routines, input validation and runtime concavity checks.

Configured and Codex implement chord-based early acceptance, which can avoid an extra density evaluation for accepted proposals. Bare evaluates density and derivative on each proposal and caps its stored support points. Those are algorithmic trade-offs; no separate sampler-runtime benchmark was performed here.

Configured and Codex's `test()` functions restore the caller's random state and throw an error when their internal test suite fails. Bare's `test()` sets the global random seed and returns a boolean without throwing, so an unattended caller must explicitly check that return value. This is a concrete reproducibility/automation advantage in those two implementations, despite all three receiving the same official pass result. It does not justify declaring either implementation universally superior.

### Bottle vulnerability fix: no final-code distinction

All three final `artifacts/app/bottle.py` files have the identical SHA-256 `abf643683b4870e07500f8a035d1a076d4bf0bbf98eb2fb5180fbc3ef8fad802`. `_hkey` rejects newline, carriage return and NUL characters with `ValueError`, and each report identifies `cwe-93`. All three pass **367 original repository tests plus six additional verifier tests**. There is no final-file quality difference to rank on this case.

## Interpretation

- **Best observed strict completion:** configured Pi, by one task over Codex; that entire difference is the policy-sensitive HTML-filter task.
- **Configured versus Codex:** no measured correctness difference on the other 23 tasks. Code spot-checks do not establish a general maintainability winner.
- **Bare Pi:** clearly cheaper in recorded tokens, but lower strict benchmark conformance. The three extra misses relative to Codex consist of two source-packaging checks and one demonstrated DNA constraint error—not evidence that all its programs are lower quality.
- **Delegation:** configured used a child on Cython compatibility; all three arms passed all 11 checks. The extra child work has no demonstrated advantage in that task's measured correctness, although untested properties may differ.

This was one attempt per task on a non-random subset. Verifier passes do not prove general correctness, security or maintainability. These findings do not support a causal claim that configuration alone produced the outcome differences. No solver reruns, benchmark fixes or score changes were made during this analysis.
