# Agent Rules

## TypeScript

Preserve type safety end to end.

- Never use `as`, `as const`, postfix `!`, unsafe coercion, or suppression comments.
- Never weaken types to silence errors. Fix model, data flow, or boundary.
- Treat external data as `unknown`. Parse and narrow before use.
- Model valid states precisely with types, unions, guards, and parsers.
- Make invalid states unrepresentable.

## React

- `useEffect` last resort: browser APIs, widgets, subscriptions, timers, external systems only.
- State at lowest owner. Lift only when shared. Use Jotai when props or local state get awkward.
- Small, focused components. Split large components.
- Prefer flexbox. Grid only when clearly better.

## Communication

- Be direct. Remove filler, repetition, and irrelevant context.
- Split complex ideas into small, defined concepts.
- Explain from abstract to concrete:
  1. Purpose and behavior in plain language.
  2. Main parts and interactions.
  3. Exact implementation details.
- After each task, report:
  1. What changed and where.
  2. How it works technically.
  3. How it was verified.
- Claim only verified outcomes.

## General

Use smallest complete solution.

Simple means:

- Direct, readable control flow.
- Minimum required state, branches, dependencies, files, and abstractions.
- One source of truth per value.
- No speculative options, extension points, configuration, or fallbacks.
- No code compensating for flawed design.

Elegant means:

- Names and structure reveal behavior.
- Types and data flow enforce constraints.
- Errors are handled where they originate.
- Root causes are fixed, not hidden.
- Local changes stay local.

Implementation rules:

- Find root cause before changing code.
- Simplify or replace flawed approaches. Never stack patches, wrappers, flags, retries, or special cases.
- Keep only code required for behavior, correctness, or clarity.
- Keep state at lowest owning scope.
- Add abstractions only when required by current task.
- Add no speculative features, files, dependencies, configuration, or compatibility layers.
- Follow project patterns unless they cause problem.

Naming rules:

- Use shortest name still unambiguous at use site.
- Describe role, not type or implementation.
- Functions use verbs describing action or returned result.
- Booleans use predicates: `isReady`, `hasAccess`, `canSubmit`.
- Collections use plural nouns.
- Avoid vague names like `data`, `item`, `value`, `result`, `manager`, `helper`, or `utils` when specific name exists.
- Use one term per concept. Never use multiple synonyms for same domain idea.

## Configuration

- Keep shareable defaults in tracked example or template files.
- Keep secrets, credentials, environment values, absolute machine paths, account state, and generated metadata in ignored per-user files.
- Setup scripts seed missing per-user files from tracked examples without overwriting existing local config.
- Before commit, inspect staged config changes for sensitive or machine-specific values.

## Investigation

- Before non-trivial action, inspect existing code and applicable authoritative docs.
- During non-trivial code or docs exploration, update `scratchpad` after each useful read/search batch.
- Use `scratchpad` for important implementation concepts, applicable best practices and examples from docs, task plan details, decisions, constraints, findings, and open questions.
- Keep notes concise and durable. Update scratchpad before first mutation.
- Replace or prune stale notes as understanding changes. Never paste raw tool output.
- Skip scratchpad for tiny tasks needing no investigation and for bounded post-implementation reviews.

## Subagents

- At start of non-trivial work, identify independent investigation, implementation, and verification tracks.
- When two or more tracks can proceed independently, dispatch them together in one parallel subagent call. Do not serialize independent calls.
- Keep simple tasks and work on one blocking path local. Use single subagents only when focused investigation or context isolation saves time.
- Give each subagent bounded scope, exact context, expected output, and disjoint file ownership.
- Keep blocking decisions, shared files, and final integration in main agent.
- Avoid ritual scout → planner → worker chains. Delegate work, not process.

## Review

- Review is post-implementation, after initial validation. Reviewers never pair-program.
- Select only the smallest applicable review scope:
  - `reviewer`: runtime correctness, state, edge cases, and directly affected data flow; use as the fallback when no narrower specialist covers the concern.
  - `reviewer-requirements`: whether multi-part or acceptance-criteria-driven work fully implements the supplied requirements and observable outcomes.
  - `reviewer-quality`: maintainability of structural changes, refactors, shared abstractions, complex data flow, types, naming, ownership, or duplication.
  - `reviewer-data`: schemas, migrations, persistence, caches, serialization, transactions, data compatibility, or integrity.
  - `reviewer-api`: public APIs, shared contracts, request or response schemas, events, protocols, integrations, or compatibility.
  - `reviewer-ui`: UI, interaction, frontend state, accessibility, or responsive behavior.
  - `reviewer-security`: authentication, authorization, secrets, untrusted input, command execution, filesystem or network boundaries, permissions, cryptography, or sensitive data.
- Never invoke a specialist merely because it exists. A UI-only change does not need a security review; a small direct implementation does not automatically need requirements and quality reviews.
- A specialist replaces the fallback for the concern it covers. Combine reviewers only when each has a distinct, explicitly assigned concern that the others do not cover.
- Give every reviewer the exact concern, requirements, changed files, and completed validation. Review changed code and directly affected callers, consumers, contracts, and state paths—not the entire codebase.
- For broad cross-domain changes, dispatch independent applicable reviews together in one parallel subagent call. Use disjoint concerns or file scopes and at most three reviewers.
- Keep routine and low-risk changes local. Use no reviewer for tiny edits, routine config or docs, or investigation-only tasks unless requested.
- Main agent integrates findings. Do not add a synthesis reviewer or automatically re-review fixes.
- Verify findings before applying them and re-run relevant validation after fixes.

## Docs

- Before working, read current authoritative docs for everything relevant to task.
- Match project-pinned versions. Follow latest applicable best practices. Never rely on memory alone.
- Docs unclear or stale: inspect types and source.

## Validation

No automated tests. Use type-check, build, lint, runtime checks, manual verification.
