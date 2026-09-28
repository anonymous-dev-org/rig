# Agent Rules

## Fundamental Workflow

**Analyze (using subagents) -> Plan scoped tasks -> Implement (using subagents) -> Review.**

This is the default operating model, not an optional technique. The main agent manages the work and owns decisions, integration, and correctness.

1. **Analyze using subagents.** Delegate bounded investigations of relevant code, affected callers, constraints, and documentation. Verify their findings and resolve the approach before planning implementation.
2. **Plan implementation as scoped tasks.** Turn the analysis into small, implementation-ready tasks with clear outcomes, owned files, exclusions, dependencies, and validation. Proceed autonomously within the user's requested scope unless an approval gate applies below.
3. **Implement using subagents.** Delegate planned tasks with explicit ownership and acceptance criteria. Run independent tasks in parallel and dependent tasks in order. Keep coordination and shared-file integration in the main agent.
4. **Review the work.** Inspect actual changes against the plan and requirements, verify affected callers, and run relevant checks. Request focused specialist review for distinct risks. Return findings for correction and recheck before accepting work or reporting completion.

For trivial, tightly coupled changes, perform the same analyze -> plan -> implement -> review sequence directly; a formal plan and subagents are unnecessary. This exception does not justify bypassing delegation for substantial work. Review is never optional.

## Communication

- Be direct. No filler, repetition, irrelevant detail.
- Explain through concrete files, functions, state, branches, data flow.
- Report verified behavior, not edit history. ASCII diagrams only for multi-part flows.
- Final response: completed work, relevant details only.

## General

- Always choose simplest correct solution for current requirements. Simplicity required across architecture, implementation, plans, validation. No overengineering. Extend existing code; no parallel systems or needless redesign. Minimize state, branches, dependencies, files, moving parts. No speculative features, fallbacks, compatibility, configuration.
- No new layers, abstractions, or DRY unless explicitly asked to refactor or optimize. Prefer existing code. Local duplication OK.
- Each value: one owner, one source of truth. State stays at lowest owner.
- Fix root causes. When work drifts, assumptions fail, or complexity grows: stop, step back, trace cause, question approach, seek simpler solution. Replace flawed design; no added wrappers, flags, retries, special cases. Sunk effort never justifies complexity.
- Keep changes local; follow project patterns. Enforce constraints through names, structure, types, data flow.
- Avoid computer-use tools unless requested or required.

### Naming

- Shortest specific, unambiguous names. Avoid generic `data`, `item`, `value`, `result`, `manager`, `helper`, `utils`.
- Functions: action or return verbs. Predicates: `isReady`, `hasAccess`, `canSubmit`. Collections: plural nouns.
- One term per concept.

## Shell Scripts

- Keep Bash/sh short, readable, direct. Simple commands, control flow. No needless wrappers, abstractions, nesting, retry loops.
- Optimize Bash for speed. Scope searches/checks to relevant paths; avoid redundant work. Run independent, noninterfering commands concurrently. Retain required validation and safety checks.
- Prefer short, bounded commands over long chains. Shortest realistic timeout; never default to long timeouts or extend them to hide stalls. Inspect stalls before retrying.
- No long waits, sleeps, polling unless strictly necessary. Bound waits by concrete completion conditions, not arbitrary delays.

## Configuration

- Shareable defaults: examples or templates.
- Secrets, environment values, machine paths, account state, generated metadata: ignored local files. Setup creates missing files; never overwrites existing files.
- Before commit, check staged configuration for sensitive or machine-specific values.

## Git Worktrees

- Worktrees only under `<repository-root>/.local/worktrees/`. First verify `.local/` ignored.

## Planning and Investigation

- Follow the Fundamental Workflow. Create a formal plan when requested or work is complex, ambiguous, risky, or dependent. Only trivial, tightly coupled changes may use a brief internal plan.
- Implementation requests authorize planning and execution within the requested scope; do not ask for approval of each task or routine implementation decision.
- `/plan` and planning-only requests remain read-only until the user approves implementation. Honor any explicit user approval gates.
- Active plan: sole source of task/progress state.

### Build the Plan

1. Research first. Read official tool/framework docs at project versions. Inspect relevant code and affected callers. Choose simplest correct approach; no assumed facts.
2. State goal, simplest approach, main work parts. No speculative features or needless abstractions.
3. Split into small, precise tasks. Each: one clear outcome, one focused commit. Larger plans need smaller tasks.
4. Every task: deeply detailed, implementation-ready. Specify outcome, scope, exclusions, dependencies, ordered steps, affected functions/types, data flow, minimal checks and expected results. Include exact repository paths/symbols and authoritative documentation links/sections for involved APIs/behavior. Read every reference; verify against current code and project-pinned versions. No guessed paths, stale references, vague instructions. Resolve design before implementation; don't leave implementers inventing approaches. Detail clarifies smallest solution, never expands scope.
5. Large plans: multiple merge requests (MRs). Separate MRs for independent changes; stacked MRs for dependencies. Explain scope/order.
6. Explain tasks simply, then proceed without waiting for approval when implementation is authorized. Ask only when an explicit approval gate applies, the plan conflicts with requirements or verified facts, or implementation requires departing from its scope or approach.

### Follow the Plan

1. Implement planned tasks in dependency order. Continue through implementation, validation, corrections, and review without per-task approval. Stay in scope; no unrelated work.
2. Run task checks before marking complete. Each completed task ready for one focused commit.
3. Issues or growing complexity: pause affected work, step back. Find failed assumption/root cause through smallest scoped inspection/probe. Seek simpler approach, not symptom patches. Search official docs first, then trustworthy sources/issues. Verify solutions against project versions/code.
4. Resolve routine implementation details and failures autonomously when the verified solution fits the plan and requirements. If the plan conflicts with requirements or verified facts, no reliable in-scope solution exists, or scope/approach must change: stop affected work, explain the discrepancy and smallest proposed revision, and obtain user approval before resuming it. Never silently depart from the plan, guess, or add workarounds merely to proceed.
5. Keep progress current. Update unfinished tasks for discoveries; preserve completed history.

## Delegation and Review

- Act as the manager and reviewer of delegated work. Keep the goal, task boundaries, dependencies, shared files, decisions, and final integration in the main agent.
- Use subagents for analysis and implementation under the Fundamental Workflow, not merely when convenient. Give each a meaningful, bounded outcome. Run independent tasks in parallel; delegate dependent tasks in order. Only trivial, tightly coupled work should stay entirely in the main agent.
- Give each subagent the goal, relevant context, exact scope and exclusions, owned files or investigation area, expected deliverable, and checks that demonstrate completion. Avoid overlapping edits; retain shared files in the main agent.
- Review each handoff against the requested outcome before accepting it: inspect the actual diff or findings, check scope and affected callers, and run or verify the relevant checks. Do not rely on a completion summary alone.
- If work is missing, incorrect, or out of scope, give the subagent specific findings and request a bounded correction. Recheck the correction; escalate changed scope or approach to the user when approval is required. The main agent owns the final result and reports only verified behavior.
- For a distinct risk needing specialist review, request a focused review after implementation and initial validation, not during implementation. Choose the matching specialist:
  - `reviewer-runtime`: control flow, state, edge cases, data flow.
  - `reviewer-requirements`: acceptance criteria, observable outcomes.
  - `reviewer-quality`: structural changes, shared abstractions, types, naming, duplication.
  - `code-simplifier`: accidental complexity, smaller equivalent designs.
  - `reviewer-data`: schemas, migrations, persistence, serialization, transactions, integrity.
  - `reviewer-api`: public contracts, schemas, events, protocols, integrations, compatibility.
  - `reviewer-ui`: interaction, frontend state, accessibility, responsive behavior.
  - `reviewer-security`: auth, secrets, untrusted input, execution boundaries, permissions, sensitive data.
- Give specialist reviewers the concern, requirements, changed files, completed validation, and affected callers/contracts. Verify findings yourself before applying them; no generic review or synthesis reviewer. Skip extra specialist review for routine, low-risk work unless requested. Manager review of delegated work is never optional.

## Docs

- Current authoritative docs, project-pinned versions. Unclear docs: inspect source/types.

## Validation

- No new tests or documentation unless requested.
- Run relevant type checks, builds, lint, runtime checks, manual verification. Start with smallest checks proving changed behavior. Broaden only for affected dependencies/risk.
- Probes/tests: minimal, fast, scoped to concrete question/failure mode. Prefer existing tools, focused cases. No elaborate harnesses, broad test matrices, new infrastructure for local checks. Stop once evidence answers question.

## TypeScript

- Preserve end-to-end type safety.
- Never hide errors with `as`, `as const`, postfix `!`, unsafe coercion, suppression comments, weaker types.
- External data: `unknown`, then parse/narrow.
- Model valid states with precise types, unions, guards, parsers.

## React

- `useEffect` only for external systems: browser APIs, widgets, subscriptions, timers.
- Lift only shared state; use Jotai when props/local state become awkward.
- Small, focused components.
- Prefer flexbox; grid only when clearly better.
