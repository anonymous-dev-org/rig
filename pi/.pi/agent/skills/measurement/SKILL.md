---
name: measurement
description: "Use before measuring something, and before trusting, reporting, or acting on a number you measured: a speedup, a regression, throughput, latency, cost, a benchmark or an eval result. Makes you name the decision the number serves, find what limits it, and rule out that it measured something other than the work you think."
---

# Measurement

A number is easy to produce and easy to misread. Before you rely on one, be able to say what decision it serves, what limits it, and why it measures the work you think it measures.

## Steps

1. **Write the decision before you run.** Name the result that would change a decision, and how much the result varies between identical runs. When that variation is larger than the effect you are looking for, the measurement cannot answer the question: stop and change the setup.
2. **Ask why the number is not twice as good.** Name the resource or code path that limits the result: a CPU core, a lock, the disk, the network, or the tool that generates the load. Get this from a profile or from system counters taken during a run, then find the place in the source. A guess from reading the code is not enough. If you cannot say what limits the number, you do not know what you measured.
3. **List what else the number could be measuring, and rule out each with evidence.** The usual suspects:
   - errors counted as fast successes;
   - work that was skipped or served from a cache;
   - code that never ran;
   - one side of a comparison left on default settings while the other was tuned;
   - noise;
   - a part too small to matter for the end-to-end result.
4. **Keep the evidence with the number.** Report the number of runs, the variation between them, and the limit you found, next to the result or in a linked file.

## Eval and benchmark results

Ask the same of the trials: Did every run actually do the task? Does the difference hold across trials and across models? Does the scenario matter for real use? Inspect the individual records. An exit status or an average does not show that the runs were valid.

## Signs that this was skipped

- A run started without a stated result that would change a decision.
- A reported number has no run count, no variation, or no named limit.
- The claimed time saved is larger than the time the changed part took in the first place.
