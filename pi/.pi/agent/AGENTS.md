# Agent Rules

## Communication

- Be direct. Omit filler, repetition, and irrelevant detail.
- Explain with concrete files, functions, state, branches, and data flow.
- Report verified behavior, not edit history. Use ASCII diagrams only to clarify multi-part flows.
- Final response: explain completed work with relevant details only.

## General

- Keep architecture, design choices, and features simple. Build the smallest direct solution for current requirements; extend it rather than add parallel systems or redesign unnecessarily. Minimize state, branches, dependencies, files, and moving parts. No speculative features, fallbacks, compatibility, or configuration.
- Avoid new layers, abstractions, and DRY unless explicitly asked to refactor or optimize. Prefer extending existing code. Local duplication is acceptable.
- Give each value one owner and source of truth. Keep state at its lowest owner.
- Fix errors at their origin. Replace flawed design instead of adding wrappers, flags, retries, or special cases.
- Keep changes local; follow project patterns. Enforce constraints through names, structure, types, and data flow.
- Avoid computer-use tools unless requested or required.

### Naming

- Use the shortest specific, unambiguous names. Avoid generic terms: `data`, `item`, `value`, `result`, `manager`, `helper`, and `utils`.
- Use action or return verbs for functions, `isReady`, `hasAccess`, or `canSubmit` for predicates, and plural nouns for collections.
- Use one term per concept.

## Shell Scripts

- Keep Bash/sh scripts short, readable, and direct. Use simple commands and control flow; avoid unnecessary wrappers, abstractions, nesting, and retry loops.
- Avoid long waits or sleeps unless strictly necessary. Bound required waits by concrete completion conditions, not arbitrary delays.

## Configuration

- Put shareable defaults in examples or templates.
- Keep secrets, environment values, machine paths, account state, and generated metadata in ignored local files. Setup scripts may create missing files, never overwrite existing ones.
- Before committing, check staged configuration for sensitive or machine-specific values.

## Git Worktrees

- Create worktrees only under `<repository-root>/.local/worktrees/`, after verifying `.local/` is ignored.

## Planning and Investigation

- Plan when requested or work is complex, ambiguous, risky, or has dependent steps. Skip plans for simple, bounded work.
- `/plan` is optional read-only planning mode.
- Use the active plan as the only source of task and progress state.

### Build the Plan

1. Research first. Read official docs for involved tools and frameworks at the project's versions. Inspect relevant code before choosing an approach.
2. State the goal and list the main parts of the work.
3. Split each part into small, precise tasks. Each task needs one clear outcome and must fit one focused commit. Larger plans need smaller tasks.
4. Give each task a clear scope, concrete todo list, dependencies, and checks that prove completion. Include relevant files, doc references, and examples where useful.
5. For large plans, propose multiple merge requests (MRs): separate MRs for independent changes, stacked MRs for dependent changes. Explain each MR's scope and order.
6. Explain each task in simple terms. Ask the user to approve each task before implementation.

### Follow the Plan

1. Implement approved tasks in dependency order. Stay within each task's scope; no unrelated work.
2. Run task checks before marking complete. Keep each completed task ready for one focused commit.
3. On issues or complications, pause affected work. Search official docs first, then trustworthy sources or relevant issue discussions for existing solutions. Verify applicability to the project's versions and code.
4. Continue only with a verified solution that fits the approved plan. If no reliable solution is found or scope or approach changes, stop implementation and return to planning. Explain the blocker, revise affected tasks, and ask for approval before resuming. Never guess or add workarounds just to keep moving.
5. Keep progress current. Revise unfinished tasks when discoveries change the work; preserve completed history.

## Subagents

- Use subagents when two or more independent tasks can run in parallel; dispatch together.
- Give each subagent exact context, scope, expected output, and exclusive file or investigation ownership.
- Keep dependencies, shared files, decisions, and final integration in the main agent. Never delegate sequential, duplicate, or low-gain work.
- One review specialist may run alone when its expertise materially improves review.

## Review

- Review only after implementation and initial validation; never pair-program.
- Start with a concrete concern; choose only the matching reviewer:
  - `reviewer-runtime`: control flow, state, edge cases, and data flow.
  - `reviewer-requirements`: acceptance criteria and observable outcomes.
  - `reviewer-quality`: structural changes, shared abstractions, types, naming, and duplication.
  - `code-simplifier`: accidental complexity and smaller equivalent designs.
  - `reviewer-data`: schemas, migrations, persistence, serialization, transactions, and integrity.
  - `reviewer-api`: public contracts, schemas, events, protocols, integrations, and compatibility.
  - `reviewer-ui`: interaction, frontend state, accessibility, and responsive behavior.
  - `reviewer-security`: auth, secrets, untrusted input, execution boundaries, permissions, and sensitive data.
- Give reviewers the concern, requirements, changed files, completed validation, and directly affected callers or contracts. No repository-wide or generic reviews.
- Use multiple reviewers only for distinct concerns; dispatch independent reviews together.
- Skip review for routine, low-risk, documentation, configuration, or investigation-only work unless requested.
- Verify findings before applying. Main agent integrates changes; no synthesis reviewer or automatic re-review of fixes.

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
- Lift only shared state; use Jotai when props or local state become awkward.
- Keep components small and focused.
- Prefer flexbox; use grid only when clearly better.
