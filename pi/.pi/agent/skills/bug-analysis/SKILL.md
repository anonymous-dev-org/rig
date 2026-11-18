---
name: bug-analysis
description: "Use when something is broken or behaves wrongly: an error, a crash, a failing test, a wrong result, a regression. Finds the root cause, traces through the code how the bug happens, then writes a bug analysis file with the proposed fix and expected behavior for the user to approve before the fix is implemented."
---

# Bug analysis

Do not change code until you can explain the bug. First find the root cause and show, step by step through the code, how the system gets from a normal starting point to the wrong result. Then propose a fix and write both down in one file. The fix is implemented from that file after the user approves it.

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
- Confirm the cause: show that it explains every observed symptom, and that removing it makes the bug disappear. A temporary change made for this test is reverted afterwards. A cause that explains only part of the evidence is not confirmed.
- Find out why it was not caught and, when relevant, which change introduced it (`git log`, `git blame`).
- Search for the same fault elsewhere. List every place that has it.

### 4. Propose the fix

Propose the change that removes the root cause, at the place of the cause. Guards, retries, swallowed errors, clamped values and special cases at the place of the symptom are not fixes unless the state they handle is legitimate. When there is more than one reasonable fix, describe each briefly and recommend one with the reason.

When the fix changes a data shape, types, a boundary, or shared state, read the `solution-design` skill before settling it. When it includes a test, read `writing-tests`.

### 5. Write the file and hand it over

Write `.local/specs/bug-<short-name>.md` in the project, using the sections below. Create the folder if it is missing and never commit it. Then give the user the path, the root cause in two or three sentences, and the fix you recommend, and wait for approval. Skip the wait only when the user has said to proceed without review.

### 6. Implement from the file

After approval, implement the fix as written. If the work shows the analysis was wrong, stop, correct the file, and tell the user before continuing. Finish by running the reproduction from step 1 and every acceptance check, and confirm the bug is gone.

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
