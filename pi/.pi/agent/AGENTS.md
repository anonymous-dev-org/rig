# Agent Rules

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

## Communication

- Be direct: omit filler, repetition, and irrelevant context.
- Use simple, low-level terms; explain core concepts before naming abstractions or heuristics.
- Tie behavior to concrete files, functions, state, branches, and data flow.
- Describe the new status quo, not merely the edit history.
- Use a small ASCII diagram only when it clarifies a multi-part flow.
- Claim only verified outcomes.
- End finished-task responses with these distinct sections, in order:
  1. **What changed** — Simply explain what changed, why, and current user/system behavior.
  2. **How it works** — Start with the overall flow, then the main parts and interactions, exact code decisions/files, and checks run with outcomes.
  3. **Plan drift** — State deviations and reasons; if none, say so. If there was no plan, say that.

## General

Use the smallest complete solution.

- Avoid computer-use tools unless explicitly requested or required.
- Keep control flow direct and readable.
- Minimize state, branches, dependencies, files, and abstractions.
- Keep one source of truth per value.
- Do not add speculative options, extension points, configuration, fallbacks, features, files, dependencies, compatibility layers, or code that compensates for flawed design.
- Use behavior-revealing names and structure, and constraint-enforcing types and data flow.
- Handle errors at their origin; fix root causes rather than hiding them.
- Keep local changes local and state at its lowest owner.
- Before changing code, find the root cause. Replace or simplify flaws; do not stack patches, wrappers, flags, retries, or special cases.
- Add only code required for behavior, correctness, and clarity; abstract only when the current task requires it.
- Follow project patterns unless they are problematic.

### Naming

- Use the shortest unambiguous name at the use site; name the role, not the type or implementation.
- Function verbs describe the action or return.
- Boolean predicates use forms such as `isReady`, `hasAccess`, and `canSubmit`; collections use plural nouns.
- Avoid vague `data`, `item`, `value`, `result`, `manager`, `helper`, or `utils` when a specific name exists.
- Use one term per concept; do not use synonyms for the same concept.

## Configuration

- Put shareable defaults in tracked examples/templates.
- Put secrets, credentials, environment values, absolute machine paths, account state, and generated metadata in ignored per-user files.
- Setup scripts seed missing per-user files from tracked examples without overwriting existing files.
- Before commit, inspect staged configuration for sensitive or machine-specific values.

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
- For broad cross-domain changes, dispatch independent applicable reviews in one parallel call with disjoint concerns/file scopes; use at most three reviewers.
- Keep routine/low-risk work local. Do not review tiny edits, routine config/docs, or investigation-only work unless requested. A matching reviewer may run alone.
- The main agent integrates findings; use no synthesis reviewer and do not automatically re-review fixes.
- Verify findings before applying them, then rerun relevant validation.

## Docs

- Before work, read current authoritative docs for everything relevant.
- Match project-pinned versions and current applicable best practices; never rely on memory alone.
- If docs are unclear or stale, inspect types and source.

## Validation

- Do not create tests unless explicitly requested.
- Use type-checks, builds, lint, runtime checks, and manual verification.
