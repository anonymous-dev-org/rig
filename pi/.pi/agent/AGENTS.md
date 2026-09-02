# Agent Rules

## Communication

- Be direct. Omit filler, repetition, and irrelevant detail.
- Explain with concrete files, functions, state, branches, and data flow.
- Report verified behavior, not edit history. Use ASCII diagrams only when they clarify a multi-part flow.
- In the final response, include what is relevant for the user to understand the completed work.

## General

- Keep architecture, design choices, and features simple. Build the smallest direct solution for current requirements, then build new behavior on top of that foundation instead of introducing parallel systems or redesigning it unnecessarily. Minimize state, branches, dependencies, files, and moving parts. Do not add speculative features, fallbacks, compatibility, or configuration.
- Avoid new layers, abstractions, and DRY unless the task explicitly requests refactoring or optimization. Prefer extending existing code and patterns. Local duplication is acceptable.
- Keep one owner and source of truth for each value. Keep state at its lowest owner.
- Fix errors at their origin. Replace flawed design instead of adding wrappers, flags, retries, or special cases.
- Keep changes local and follow project patterns. Use names, structure, types, and data flow to enforce constraints.
- Avoid computer-use tools unless requested or required.

### Naming

- Use the shortest specific, unambiguous name. Avoid generic terms such as `data`, `item`, `value`, `result`, `manager`, `helper`, and `utils`.
- Name functions with action or return verbs, predicates as `isReady`, `hasAccess`, or `canSubmit`, and collections with plural nouns.
- Use one term per concept.

## Configuration

- Put shareable defaults in examples or templates.
- Keep secrets, environment values, machine paths, account state, and generated metadata in ignored local files. Setup scripts may create missing files but must not overwrite them.
- Before committing, inspect staged configuration for sensitive or machine-specific values.

## Git Worktrees

- Create worktrees only under `<repository-root>/.local/worktrees/`, after verifying that `.local/` is ignored.

## Planning and Investigation

- Plan when requested or when work is complex, ambiguous, risky, or has dependent steps. Skip plans for simple, bounded work.
- Planning is a multi-step process:
  1. State the broad goal.
  2. Create an index of the main topics or tasks.
  3. Expand each task with implementation details and concrete examples from relevant docs or current code.
  4. Explain each task one by one in clear, simple terms and ask the user to approve each task before implementation.
- Give every task an outcome and todo list. Keep the active plan as the only source of task and progress state.
- Update unfinished tasks when discoveries change the work; preserve completed history.
- Before non-trivial work, inspect the relevant code and authoritative docs.
- `/plan` is optional read-only planning mode.

## Subagents

- Use subagents when two or more independent tasks can run in parallel; dispatch them together.
- Give each subagent exact context, scope, expected output, and exclusive file or investigation ownership.
- Keep dependencies, shared files, decisions, and final integration in the main agent. Do not delegate sequential, duplicate, or low-gain work.
- One review specialist may run alone when its expertise materially improves the review.

## Review

- Review only after implementation and initial validation; never pair-program.
- Start with a concrete concern and choose only the matching reviewer:
  - `reviewer-runtime`: control flow, state, edge cases, and data flow.
  - `reviewer-requirements`: acceptance criteria and observable outcomes.
  - `reviewer-quality`: structural changes, shared abstractions, types, naming, and duplication.
  - `code-simplifier`: accidental complexity and smaller equivalent designs.
  - `reviewer-data`: schemas, migrations, persistence, serialization, transactions, and integrity.
  - `reviewer-api`: public contracts, schemas, events, protocols, integrations, and compatibility.
  - `reviewer-ui`: interaction, frontend state, accessibility, and responsive behavior.
  - `reviewer-security`: auth, secrets, untrusted input, execution boundaries, permissions, and sensitive data.
- Give reviewers the concern, requirements, changed files, completed validation, and directly affected callers or contracts. Do not ask for repository-wide or generic review.
- Use multiple reviewers only for distinct concerns and dispatch independent reviews together.
- Skip review for routine, low-risk, documentation, configuration, or investigation-only work unless requested.
- Verify findings before applying them. The main agent integrates changes; do not use a synthesis reviewer or automatically re-review fixes.

## Docs

- Use current authoritative docs and project-pinned versions. If docs are unclear, inspect source and types.

## Validation

- Do not create tests or documentation unless requested.
- Run relevant type checks, builds, lint, runtime checks, and manual verification.

## TypeScript

- Preserve end-to-end type safety.
- Never use `as`, `as const`, postfix `!`, unsafe coercion, suppression comments, or weaker types to hide errors.
- Treat external data as `unknown`, then parse and narrow it.
- Model valid states with precise types, unions, guards, and parsers.

## React

- Use `useEffect` only for external systems such as browser APIs, widgets, subscriptions, and timers.
- Keep state at its lowest owner. Lift only shared state; use Jotai when props or local state become awkward.
- Keep components small and focused.
- Prefer flexbox; use grid only when clearly better.
