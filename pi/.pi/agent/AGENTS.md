# Agent Rules

## Communication

- Be direct; omit filler, repetition, and irrelevant detail.
- Explain in simple, concrete terms tied to files, functions, state, branches, and data flow. Introduce abstractions only after the core concept is clear.
- Describe verified current behavior, not edit history.
- Use ASCII diagrams only when they clarify a multi-part flow.
- Shape the final response around the task, completed work, and relevant validation.

## General

Use the smallest complete solution.

- For complex goals and long plans, build the smallest working solution first, then add only required complexity. Do not overengineer or design a complex architecture upfront.
- Keep control flow direct and minimize state, branches, dependencies, files, and abstractions.
- Keep one owner and source of truth for each value; keep state at its lowest owner.
- Fix root causes and errors at their origin. Replace flawed design instead of layering patches, wrappers, flags, retries, or special cases.
- Add only what current behavior, correctness, and clarity require. Do not add speculative features, options, configuration, fallbacks, compatibility, or abstractions.
- Use clear names, structure, types, and data flow that enforce constraints.
- Keep changes local and follow sound project patterns.
- Avoid computer-use tools unless requested or required.

### Naming

- Use the shortest unambiguous name for the role, not the type or implementation.
- Name functions with action or return verbs, predicates as `isReady`, `hasAccess`, or `canSubmit`, and collections with plural nouns.
- Prefer specific terms over `data`, `item`, `value`, `result`, `manager`, `helper`, or `utils`.
- Use one term per concept.

## Configuration

- Track shareable defaults in examples or templates.
- Keep secrets, environment values, machine paths, account state, and generated metadata in ignored per-user files.
- Setup scripts may seed missing per-user files but must not overwrite them.
- Before committing, inspect staged configuration for sensitive or machine-specific values.

## Planning and Investigation

- Create a structured plan when requested or when work is complex, ambiguous, risky, or has multiple dependent steps; skip it for simple, obvious, bounded work.
- Every planned task needs an intended outcome and todo list.
- The active plan is the sole task/progress source of truth. Revise unfinished tasks when discoveries change the work; preserve completed-task history.
- `/plan` is optional strict read-only planning mode, not required for normal adaptive planning.
- Before non-trivial action, inspect existing code and applicable authoritative docs.
- Do not duplicate task or planning state outside the structured plan.

## Subagents

Use subagents when two or more independent subtasks can run in parallel.

- Before planning, investigation, research, or implementation, identify two or more independent tasks that can run in parallel.
- Dispatch independent tasks together in one parallel call. Examples: search separate code areas, trace unrelated flows, browse different topics, answer independent questions, or edit disjoint files.
- Give each subagent exact context, bounded scope, expected output, and exclusive investigation or file ownership.
- Keep dependencies, blocking decisions, shared files, and final integration in the main agent. Synthesize findings before making decisions or editing shared code.
- Do not delegate one non-review task, sequential stages, duplicate work, or work whose coordination cost removes the speed gain.
- Exception: one review specialist may run alone when domain expertise materially improves post-implementation review.

## Review

- Review only after implementation and initial validation; never pair-program.
- First identify concrete concerns, then select only matching reviewers:
  - `reviewer-runtime`: runtime correctness, control flow, state, edge cases, affected data flow.
  - `reviewer-requirements`: multi-part/acceptance-criteria completeness and observable outcomes.
  - `reviewer-quality`: maintainability of structural changes/refactors/shared abstractions/complex data flow, types, naming, ownership, duplication.
  - `code-simplifier`: accidental complexity or overengineering; smaller behavior-preserving designs with better concrete tradeoffs.
  - `reviewer-data`: schemas, migrations, persistence, caches, serialization, transactions, compatibility, integrity.
  - `reviewer-api`: public APIs, shared contracts, request/response schemas, events, protocols, integrations, compatibility.
  - `reviewer-ui`: UI, interaction, frontend state, accessibility, responsive behavior.
  - `reviewer-security`: authentication, authorization, secrets, untrusted input, command execution, filesystem/network boundaries, permissions, cryptography, sensitive data.
- Never invoke specialists merely because they are available. A UI-only change needs no security review; requirements/quality reviews are not automatic for small direct work.
- Use multiple reviewers only for distinct concerns. Give each one explicit, non-overlapping scope; never request generic or synthesis review.
- Provide the exact concern, requirements, changed files, and completed validation. Review changed code and directly affected callers, consumers, contracts, and state paths—not the whole codebase.
- For broad cross-domain changes, dispatch independent applicable reviews in one parallel call with disjoint concerns/file scopes.
- Keep routine/low-risk work local. Do not review tiny edits, routine config/docs, or investigation-only work unless requested. A matching reviewer may run alone.
- The main agent integrates findings; use no synthesis reviewer and do not automatically re-review fixes.
- Verify findings before applying them, then rerun relevant validation.

## Docs

- Before work, read current authoritative docs for everything relevant.
- Match project-pinned versions and current applicable best practices; never rely on memory alone.
- If docs are unclear or stale, inspect types and source.

## Validation

- Do not create tests or documentation unless explicitly requested.
- Use type-checks, builds, lint, runtime checks, and manual verification.

## TypeScript

Preserve end-to-end type safety.

- Never use `as`, `as const`, postfix `!`, unsafe coercion, or suppression comments.
- Never weaken types to silence errors; fix the model, data flow, or boundary.
- Treat external data as `unknown`, then parse and narrow it.
- Model valid states precisely with types, unions, guards, and parsers; make invalid states unrepresentable.

## React

- Reserve `useEffect` for browser APIs, widgets, subscriptions, timers, and other external systems.
- Keep state at its lowest owner; lift only shared state. Use Jotai when props or local state become awkward.
- Keep components small and focused; split large ones.
- Prefer flexbox; use grid only when clearly better.
