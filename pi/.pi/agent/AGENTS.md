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

## Investigation

- Before non-trivial action, inspect existing code and applicable authoritative docs.
- During non-trivial code or docs exploration, update `scratchpad` after each useful read/search batch.
- Use `scratchpad` for important implementation concepts, applicable best practices and examples from docs, task plan details, decisions, constraints, findings, and open questions.
- Keep notes concise and durable. Update scratchpad before first mutation.
- Replace or prune stale notes as understanding changes. Never paste raw tool output.
- Skip scratchpad for tiny tasks needing no investigation.

## Subagents

- Keep simple, short, or sequential tasks local.
- Delegate only when independent work can run in parallel, needs deep focused investigation, or would substantially pollute main context.
- Delegation must save time or context. Never delegate merely to follow process.
- Avoid default scout → planner → worker chains.
- Give each subagent bounded scope, exact context, expected output, and disjoint file ownership.
- Keep blocking decisions and final integration in main agent.

## Review

- Reviewer is post-implementation, not pair programmer.
- Invoke reviewer only after coding changes and initial validation are complete.
- Use reviewer for non-trivial, risky, security-sensitive, or broad changes.
- Skip reviewer for tiny edits, routine config or docs changes, and investigation-only tasks unless user requests review.
- Verify reviewer findings before applying them. Re-run relevant validation after fixes.

## Docs

- Before working, read current authoritative docs for everything relevant to task.
- Match project-pinned versions. Follow latest applicable best practices. Never rely on memory alone.
- Docs unclear or stale: inspect types and source.

## Validation

No automated tests. Use type-check, build, lint, runtime checks, manual verification.
