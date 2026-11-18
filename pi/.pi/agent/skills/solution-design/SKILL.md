---
name: solution-design
description: "Use when deciding how something will be built: while writing the Design section of a requirements spec or the proposed fix of a bug analysis, and during implementation whenever you choose a data shape, types, a module boundary, where validation goes, how state is shared, how an operation behaves when retried, or between UI or product options. Gives the checks for each of those decisions."
---

# Solution design

A design decision is cheap to change while it is a sentence in a spec and expensive once code depends on it. Before you settle one, go through the parts below that match the decision and skip the others. Write the result in the Design and Decisions sections of the requirements spec, or in the proposed fix of the bug analysis.

The simplest design that meets every requirement wins. Each check below exists to remove branches, invalid states, or failure modes. None of them is a reason to add structure that no requirement needs.

## 1. Fitting a new requirement into existing code

Do not bolt the change onto the current design without looking at it.

- Read all the code the change touches and understand the design it has now.
- Ask: "If this requirement had been known from the start, what would we have built?" When the answer differs from the bolt-on, design toward that answer, as far as this requirement needs and no further.
- Carry the change through every place that refers to the old design: types, callers, docs, examples.
- Think the whole redesign through, then deliver it in steps that each work.

## 2. Data and domain model

Get the shape of the data right before writing logic. With the right structure the code that follows is obvious; with the wrong one every function compensates for it.

- Define the core types first. Trace how each one is read and written, and choose structures that fit the most common paths.
- Put the rules of the domain into a structure instead of spreading them over conditionals:
  - a state machine instead of several booleans, phases, or lifecycle checks;
  - a typed model instead of loose parameters or a shape assumed in several files;
  - a map, lookup table, or tagged union instead of the same branching repeated across files;
  - a module organized around one body of domain knowledge instead of around steps such as load, validate, transform, save.
- Signs that the structure is missing: a feature adds one more branch to an existing if/else chain, a second boolean must stay in sync with the first, or modules named after phases repeat the same rule.
- Do not force it. Keep plain code when its shape is clear, local, and unlikely to grow. An abstraction must remove branches, duplicated rules, or invalid states; one that only adds indirection is a cost. Three similar statements are better than a premature abstraction.

## 3. Types, in a statically typed language

Let the compiler reject what must never happen.

- Make invalid states impossible to write down. Prefer a type in which the error case cannot exist over a handler for it.
- Give values with different meanings different types, even when both are strings or numbers underneath: a `UserId` must not be accepted where an `OrderId` is expected. Validate once where the value is created and trust the type afterwards.
- Treat external data as untyped until parsed: JSON, RPC payloads, CLI arguments, config files, environment variables, database rows. One parse function at each entry point turns raw input into the typed model.
- When a schema owns a shape (OpenAPI, protobuf, GraphQL, a database migration), derive the type from it instead of writing a parallel one by hand.
- Handle every variant of a union exhaustively, so that adding a variant fails compilation at every place that must change.

## 4. Boundaries: where validation and error handling go

- Validate, narrow types, and handle errors defensively where data enters the system: CLI arguments, config files, network, external APIs, storage.
- Remove a repeated check only if an earlier check guarantees the same condition still holds here. A well-typed user ID does not prove the caller may access that user's record; state may also have changed since it was checked.
- Keep business logic in pure functions with no framework dependency. The code that talks to the framework is thin and only wires things together.
- Do not expose transport, storage, or framework types through a module's public surface. Expose domain concepts.
- Keep authorization and domain checks where the decision is made, even when the caller is internal.

## 5. Reader load

The cost of code is the work a reader must do to understand it. Two things make up that work: the layers to trace between a question and its answer, and the hidden or mutable state to keep in mind.

- Remove layers that cost more than they save: a wrapper with one caller, an adapter with no second implementation, a layer that passes the same methods and arguments through.
- Shrink the scope of state. Prefer return values over mutation, locals over fields, fields over module state, module state over globals. Compute a value from its source instead of keeping two copies in sync.
- Before adding a layer or a piece of state, check that it removes at least as much reader work elsewhere.
- The test: can a new reader answer "where does this value come from?" and "what can change it?" in about half a minute? If not, cut layers or cut state.

## 6. Operations that can be interrupted or run again

Commands, setup steps, sync jobs, and processing loops run where crashes and retries are normal. Design each one to reach the correct end state however often it runs and wherever the previous run stopped.

- Derive each step from the state that exists, not from what the previous run intended. Read the current state, compare it with the goal, and apply only the difference.
- Whatever a run can leave behind, such as a lock, a temporary file, a half-written record, or a claimed job, must be recognizable as stale by the next run. For example, write to a temporary path and rename it into place.
- The test: What happens if this runs twice in a row? What happens if the previous run stopped at each possible point? If an answer is "it depends on what was left behind", add a step that reconciles the leftover state.

## 7. State with more than one writer

When several processes, agents, or jobs might write the same file, key, branch, or object:

1. Name the shared mutable state.
2. First try to remove the sharing. Ask whether the writers need one common object or are publishing independent facts. Give each writer its own file, key, or directory, and combine only where the data is read.
3. Only when a single shared target is a real requirement, enforce one writer at a time by structure: a lock file, sequential phases, a single owning process, or an atomic compare-and-swap. An instruction or a convention is not concurrency control.

## 8. Product and UI choices

The user is whoever consumes the result: the end user of a screen, the colleague who imports a library, the engineer who maintains the code next.

- When convenience of implementation conflicts with the user's experience, choose the experience, within the agreed scope.
- Every feature, control, and option needs a requirement that justifies it. A few finished features are better than many rough ones.
- Design the details that users notice: empty, loading and error states, feedback after each action, alignment and spacing.
- When a UI interaction or an architecture decision has no precedent in the codebase, write down two or three alternatives that differ in approach, with what each costs and gives, in the Decisions section. Build throwaway prototypes only when the choice depends on how it feels to use and cannot be judged on paper. Show them to the user side by side, keep the chosen one, and delete the others.
