# Agent Rules

## TypeScript

Preserve end-to-end type safety.

- Never use `as`, `as const`, postfix `!`, unsafe coercion, or suppression comments.
- Never weaken types to silence errors; fix model, data flow, or boundary.
- Treat external data as `unknown`; parse, narrow before use.
- Precisely model valid states via types, unions, guards, parsers.
- Make invalid states unrepresentable.

## React

- `useEffect` only as last resort: browser APIs, widgets, subscriptions, timers, external systems.
- State at lowest owner; lift only when shared. Use Jotai when props/local state get awkward.
- Small, focused components; split large ones.
- Prefer flexbox; grid only when clearly better.

## Communication

- Direct: omit filler, repetition, irrelevant context.
- Split complexity: small, defined concepts.
- Explain abstract → concrete:
  1. Plain-language purpose, behavior.
  2. Main parts, interactions.
  3. Exact implementation details.
- Finished-task final response sections, in order:
  1. **Overview** — Simply state exact implemented functionality and new user capabilities. Behavior, not only changed files. Small Mermaid diagram only when clarifying multi-part flow.
  2. **Technical integration** — System operation: main parts, data or control flow, existing-code connections.
  3. **Implementation details** — Brief, simple key code decisions, algorithms, state, types, files.
  4. **Verification** — Checks actually run; outcomes.
- Sections distinct: overview = behavior; technical integration = system interactions; implementation details = code.
- Claim only verified outcomes.

## General

Use smallest complete solution.

- Avoid computer-use tools unless explicitly user-requested or task-required.

Simple means:

- Direct, readable control flow.
- Minimum required state, branches, dependencies, files, abstractions.
- One source of truth per value.
- No speculative options, extension points, configuration, fallbacks.
- No code compensating for flawed design.

Elegant means:

- Behavior-revealing names, structure.
- Constraint-enforcing types, data flow.
- Handle errors at origin.
- Fix, never hide, root causes.
- Local changes stay local.

Implementation rules:

- Find root cause before changes.
- Simplify/replace flaws; never stack patches, wrappers, flags, retries, special cases.
- Only code required for behavior, correctness, clarity.
- State at lowest owning scope.
- Abstractions only when current task requires.
- No speculative features, files, dependencies, configuration, compatibility layers.
- Follow project patterns unless problematic.

Naming rules:

- Shortest unambiguous name at use site.
- Role, not type/implementation.
- Function verbs describe action/return.
- Boolean predicates: `isReady`, `hasAccess`, `canSubmit`.
- Collections: plural nouns.
- Avoid vague `data`, `item`, `value`, `result`, `manager`, `helper`, or `utils` when specific name exists.
- One term per concept; never multiple synonyms.

## Configuration

- Shareable defaults in tracked example/template files.
- Secrets, credentials, environment values, absolute machine paths, account state, generated metadata in ignored per-user files.
- Setup scripts seed missing per-user files from tracked examples without overwriting existing local config.
- Before commit, inspect staged config changes for sensitive/machine-specific values.

## Planning

- Create a structured plan when the user asks or work is complex, ambiguous, risky, or has multiple dependent steps.
- Skip planning for simple, obvious, bounded tasks.
- Each planned task needs an intended outcome and todo list.
- Keep the active plan as task and progress source of truth. Revise unfinished tasks when discoveries change the work; preserve completed-task history.
- `/plan` is an optional strict read-only planning mode, not required for normal adaptive planning.

## Investigation

- Before non-trivial action, inspect existing code and applicable authoritative docs.
- Do not maintain duplicate task or planning state outside the structured plan.

## Subagents

- Use non-review subagents only to parallelize two or more independent tasks. Dispatch them together in one parallel call; never delegate single or sequential work.
- Keep simple tasks and blocking paths in main agent.
- Give each subagent bounded scope, exact context, expected output, disjoint file ownership.
- Main agent keeps blocking decisions, shared files, final integration.
- Avoid ritual scout → planner → worker chains; delegate parallel work, not process.
- Review specialists are exception: use one reviewer alone when its domain-specific prompt materially improves post-implementation review.

## Review

- Review only post-implementation and initial validation; never pair-program.
- First identify concrete concerns; select only matching reviewers:
  - `reviewer-runtime`: runtime correctness, control flow, state, edge cases, affected data flow.
  - `reviewer-requirements`: multi-part/acceptance-criteria requirement completeness, observable outcomes.
  - `reviewer-quality`: structural-change maintainability, refactors, shared abstractions, complex data flow, types, naming, ownership, duplication.
  - `code-simplifier`: accidental complexity/overengineering; smaller behavior-preserving design with better concrete tradeoff.
  - `reviewer-data`: schemas, migrations, persistence, caches, serialization, transactions, data compatibility, integrity.
  - `reviewer-api`: public APIs, shared contracts, request or response schemas, events, protocols, integrations, compatibility.
  - `reviewer-ui`: UI, interaction, frontend state, accessibility, responsive behavior.
  - `reviewer-security`: authentication, authorization, secrets, untrusted input, command execution, filesystem or network boundaries, permissions, cryptography, sensitive data.
- Never invoke specialists merely for availability. UI-only change: no security review. Small direct implementation: requirements/quality reviews not automatic.
- Multiple reviewers only for distinct concerns; each gets one explicit, non-overlapping concern; never generic/synthesis review.
- Give every reviewer exact concern, requirements, changed files, completed validation. Review changed code plus directly affected callers, consumers, contracts, state paths—not entire codebase.
- Broad cross-domain changes: dispatch independent applicable reviews together in one parallel subagent call; disjoint concerns/file scopes; maximum three reviewers.
- Keep routine/low-risk changes local. No reviewer for tiny edits, routine config/docs, investigation-only tasks unless requested. Unlike other subagents, a matching reviewer may run alone.
- Main agent integrates findings; no synthesis reviewer; never automatically re-review fixes.
- Verify findings before applying; rerun relevant validation after fixes.

## Docs

- Before work, read current authoritative docs for everything relevant to task.
- Match project-pinned versions. Follow latest applicable best practices; never rely on memory alone.
- Unclear/stale docs: inspect types and source.

## Validation

- Do not create tests unless the user explicitly asks for them.
- Use type-check, build, lint, runtime checks, manual verification.
