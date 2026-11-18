---
name: bug-analysis
description: "Investigate a reported or in-scope defect in existing behavior. Trace the failure through the code, confirm its cause, then record the fix and expected behavior. A failure introduced by unfinished work stays in the current task."
---

# Bug analysis

Do not implement a fix until the cause is established. Reversible local probes are for gathering evidence, not for leaving a speculative fix in place. Trace the failure first, then record the findings, proposed fix and expected behavior in the implementation file.

**Why:** A fix made where the bug shows up usually hides it and leaves the cause in place to fail somewhere else. An explanation with code references can be checked by the user; a guess cannot.

## Steps

### 1. Reproduce

Make the bug happen and record exactly how: the steps or command, the input, the environment, and the actual output or error text. If you cannot reproduce it, say so, record what you tried, and work from the evidence available (logs, stack traces, reports). Mark the conclusions that then rest on inference.

### 2. Trace the journey

Follow the execution from the starting point (the user action, request, command, or event) to the place where the wrong result becomes visible. For every step, give the file, function and line, say what the code does there, and give the value or state that matters at that point.

Read the actual code and observe the actual state. When reading is not enough, add temporary logging or use a debugger, and remove the instrumentation afterwards. Do not fill a gap in the journey with a guess; an unverified step is marked as unverified.

### 3. Find the root cause

The symptom is where the wrong state became visible. The root cause is the first place the system did something it should not do, or failed to handle a state it should handle. Starting from the symptom, ask "why" at each step back along the journey until the answer is a wrong decision in the code and not a consequence of an earlier one.

- Decide whether the state that triggered the symptom is legitimate. If the system may be in that state, the code that broke on it is the cause. If the state should never exist, find what produced it; a check at the place it broke would only hide the bug.
- When the bug appears only after a restart, suspect persisted state first: config files, caches, lock files, serialized state.
- Test the explanation against the failure: use a replay, a contrasting input, or an isolated probe that would give a different result if you were wrong. Record what you observed, and remove temporary instrumentation or changes. If the evidence does not distinguish the cause from the alternatives, record findings and the next check instead of proposing a fix.
- Find out why it was not caught and, when relevant, which change introduced it (`git log`, `git blame`).
- Search for the same fault elsewhere. List every place that has it.

### 4. Propose the fix

Propose the change that removes the root cause, at the place of the cause. Guards, retries, swallowed errors, clamped values and special cases at the place of the symptom are not fixes unless the state they handle is legitimate. When there is more than one reasonable fix, describe each briefly and recommend one with the reason.

Read `solution-design` if the fix needs a design choice. Read `writing-tests` when writing or changing a test, not just to run the reproduction.

### 5. Write the file and hand it over

Write `.local/specs/bug-<short-name>.md`, or add the findings to the current task's spec if this is a blocker in that task. Share the path and the decisive evidence. Follow the decision rule in `AGENTS.md` section 3.

### 6. Implement from the file

Implement the confirmed fix. If evidence overturns the diagnosis, return to investigation and correct the file before continuing. Rerun the original reproduction and acceptance checks. If a replay is unavailable, report the substitute check and what remains unverified.

## Sections of the file

Scale the file to the bug: a small bug gets a short file, but every section that applies is present.

- **Symptom** — what happens, what was expected instead, and who or what is affected.
- **Reproduction** — exact steps, input and environment, with the actual output. Or the statement that it could not be reproduced and what was tried.
- **Journey** — the numbered path from the starting point to the symptom. Each step: `path/file.ext:line` and function, what the code does, and the relevant value or state. Mark the step where things first go wrong. Add a `mermaid` diagram when the path crosses several components.
- **Root cause** — the wrong decision in the code, with its reference, why it is wrong, and the evidence that confirms it. State what is verified and what is inferred.
- **Why it was not caught** — the missing check, test, or signal, and the change that introduced the bug if known. When the deciding fact took a long search to find, suggest the cheap permanent signal, such as a log line or an assertion, that would have shown it at first look.
- **Other occurrences** — the other places with the same fault, or the statement that you searched and found none, with how you searched.
- **Proposed fix** — the files and functions to change and what changes in each. Alternatives considered and why they were not chosen.
- **Expected behavior** — numbered statements (`E1`, `E2`, ...) of what the system does after the fix, including what must keep working unchanged.
- **Acceptance checks** — how each expected behavior will be verified, by number: the command or action and the result to expect. The reproduction from above must be one of them.
- **Risks and open questions** — side effects of the fix, and anything still unknown.

## Rules

- No fix before the cause is confirmed. If the cause is still unknown after a serious investigation, write the file with what is established, the hypotheses that remain and how to test each, and hand that over instead of trying fixes.
- When two fixes built on the same explanation have failed, the explanation is the suspect, not the fixes. Write down the one sentence both fixes assumed. Find an observation that would come out differently if that sentence were false, and make it before writing a third fix. If it contradicts the assumption, look for what the failures have in common that the assumption did not predict, and correct the analysis file.
- Every claim about the code carries a reference to the file and line it comes from.
- Fix only this bug. Other problems found on the way go in the file as notes, not into the change.
