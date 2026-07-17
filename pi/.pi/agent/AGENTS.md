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

## General

- Smallest complete solution. Fewest moving parts.
- Every line earns place. Remove unneeded code, UI, docs, options, process.
- Names state exact scope and job.
- No speculative features, future-proof layers, extra files, dependencies, config, abstractions.
- No DRY before three repeats unless abstraction removes real complexity.
- Start small. Add structure only when code demands it.

## Subagents

- Use aggressively for independent parallel work: search, mapping, docs, design checks, verification, review.
- Give clear scope, exact context, expected output, owned files.
- Avoid shared write paths. Keep blocking decisions local.
- Non-trivial edit: keep reviewer or pair-programmer active.
- Review for bugs, missed cases, simpler designs, validation gaps.
- Integrate results yourself.
- Tiny serial task: keep local when delegation costs more.

## Docs

- Before working, read current authoritative docs for everything relevant to task.
- Match project-pinned versions. Follow latest applicable best practices. Never rely on memory alone.
- Docs unclear or stale: inspect types and source.

## Validation

No automated tests. Use type-check, build, lint, runtime checks, manual verification.
