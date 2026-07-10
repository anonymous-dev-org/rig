# Agent Instructions

## TypeScript

No escape hatches:

- `as` or `as const`
- postfix `!`
- `@ts-ignore`, `@ts-expect-error`, or `@ts-nocheck`
- linter or formatter suppressions

Use types, guards, unions, parsers, and narrowing.

## React

- `useEffect` is last resort: browser APIs, widgets, subscriptions, timers, and
  external systems.
- State lives at the lowest owner. Lift only when shared. Use Jotai when props
  or local state get awkward.
- Small focused components. Big component means split.

## General

- Names must say exact scope and job.
- Do not DRY before three repeats unless abstraction removes real complexity.
- Start small. Add structure when the code asks for it.

## Validation

No automated tests. Use type-check, build, lint, runtime checks, or manual
verification.
