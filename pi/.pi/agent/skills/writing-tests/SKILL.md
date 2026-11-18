---
name: writing-tests
description: "Use when writing a test, changing one, or deciding whether to keep or delete one, including the failing test that reproduces a bug. Explains how to assert behavior that users of the code can observe, so the test fails when that behavior breaks and keeps passing when only the internals change."
---

# Writing tests

An acceptance check describes what to verify; it does not authorize adding a test file, fixture or test infrastructure. Unless the user asks for those, use an existing test or a throwaway check. Update existing tests to match an intended behavior change, not to hide an unintended failure.

## What a test asserts

A test is a claim about what the code does for its users: a caller, an end user, or another service.

- **Behavior** is what those users can observe through the interface they use: return values, errors, state they can read back, and effects on systems outside the code, such as a request sent, a row written, or a message emitted.
- **Implementation** is what they cannot observe: private helpers, the order of internal calls, intermediate data, and which internal part did the work.

Assert behavior. Leave implementation free to change.

## Two edits to judge a test

Imagine two edits to the code under test:

1. **Break the behavior.** Make the code return a wrong value, skip an effect, or do the effect twice. If the test still passes, it proves nothing. The usual causes are an assertion looser than the contract, an expected value computed by the code under test, a constant restated in the test without running the code that uses it, and an assertion on data the test built itself.
2. **Change the internals.** Keep every observable result and restructure the code underneath. If the test now fails, it is tied to the implementation. It will need rewriting at every refactor and still catches no bug.

Keep a test that fails on the first edit and passes on the second. Rewrite or delete the others.

## How to write one that does both

- Drive the code through the interface its users use, with a concrete input.
- Take the expected value from the requirement, not from a run of the code.
- Assert what the contract promises, no less and no more.
- For a bug, write the test from the reproduction in the bug analysis and see it fail before the fix and pass after it.

## The contract decides, not the form of the assertion

- When the promise is "an empty cart is never charged", asserting that the payment client received no call is behavior. Pair it with a case where the charge does happen, so the test shows it can see a call.
- The payload a mocked external service receives is behavior, because that service observes it. A call to an internal helper is implementation, because no user can see it.
- An empty list is the exact answer when no record matches, and a hollow check when the test only needs some result.
- An exact error message ties the test to wording no caller reads. The error type that callers branch on is the contract.
- A test may assert an invariant instead of a call, such as a key that must exist in two tables, or a type check at compile time. The invariant is the behavior.
