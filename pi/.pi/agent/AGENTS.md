# Agent Rules

## TypeScript

No escape hatches:

- No `as`, `as const`, postfix `!`.
- No `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`.
- No linter or formatter suppressions.

Use types, guards, unions, parsers, narrowing.

## React

- `useEffect` last resort: browser APIs, widgets, subscriptions, timers, external systems only.
- State at lowest owner. Lift only when shared. Use Jotai when props or local state get awkward.
- Small, focused components. Split large components.
- Prefer flexbox. Grid only when clearly better.

## Communication

- Be direct. Use simple, clear, pragmatic language.
- Explain complex concepts in plain terms without losing technical accuracy.
- After every completed task, clearly explain what changed, where it changed, and how it was verified.

## General

- Prefer simple, elegant code with few moving parts.
- Every line earns place. Remove unneeded code, UI, docs, options, process.
- Names state exact scope and job.
- No speculative features, future-proof layers, extra files, dependencies, config, abstractions.
- Do not abstract or DRY code unless the user explicitly asks for it.
- Start small. Add structure only when code demands it.

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
