---
name: writing-code
description: "Read before the first edit that adds or materially changes implementation logic. Use the project's vocabulary, make decisions easy to follow, and preserve behavior outside the requested change. Not needed for prose, formatting, or test-only edits."
---

# Writing code

- **Use the vocabulary of the code you are changing.** Read a nearby implementation and its caller. Follow the project's conventions; choose a name that tells the caller what the value means. `remainingAttempts` and `attemptsUsed` suggest different stopping conditions; `count` hides the distinction.
- **Make the decision easy to trace.** Prefer a direct expression when it reads like the rule. If a reader has to work through nested conditions to discover which path writes, returns or fails, spell out the branches. Extract a helper when its name explains a decision, not just to shorten the function.
- **Preserve the cases the task did not change.** Check what callers observe on errors and unusual but valid inputs, including defaults and side effects. For example, shortening “use the default if no delay was supplied” to `delay || defaultDelay` also replaces a valid zero delay. Check both zero and missing input through the caller.
- **Explain the constraint, not the statement.** When a rule can be expressed once in the changed code, do that rather than asking every caller to remember it. Keep comments for facts the code cannot express: “Retry the request” repeats the next line; “The server deduplicates requests with this key” explains why retrying is safe, if that guarantee actually holds.

Apply these choices in the lines the task needs. Leave unrelated cleanup alone; there is no separate polishing pass or report.
