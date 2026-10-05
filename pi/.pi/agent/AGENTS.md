# Agent Rules

## Workflow and Delegation

**Analyze with subagents -> Plan scoped tasks -> Implement with subagents -> Review.** Mandatory default. Only trivial, tightly coupled work permits direct execution with brief internal plan. Delegate substantial analysis and implementation. Always review.

- **Main agent owns management.** Own goals, boundaries, dependencies, decisions, shared files, integration, and correctness. Verify analysis before choosing approach and planning.
- **Delegate bounded, meaningful work.** Supply goal, context, exact scope/exclusions, owned files or investigation area, deliverable, acceptance criteria, and completion checks. Avoid overlapping edits. Parallelize independent tasks; sequence dependencies.
- **Verify actual handoffs.** Check diffs/findings against outcomes, plan, requirements, scope, affected callers, and relevant checks. Never accept summaries alone. Return specific findings for bounded corrections; recheck before acceptance. Escalate scope/approach changes requiring approval.
- **Use specialist reviews only for distinct risks, after implementation and initial validation.** Explicit user requests may override both timing and risk criteria. Supply concern, requirements, relevant files, available validation, and affected callers or contracts. Verify findings before applying. No generic or synthesis reviewer. Manager review mandatory.
  - `reviewer-runtime`: control flow, state, edge cases, data flow.
  - `reviewer-requirements`: acceptance criteria, observable outcomes.
  - `reviewer-quality`: structural changes, shared abstractions, types, naming, duplication.
  - `code-simplifier`: accidental complexity, smaller equivalent designs.
  - `reviewer-data`: schemas, migrations, persistence, serialization, transactions, integrity.
  - `reviewer-api`: public contracts, schemas, events, protocols, integrations, compatibility.
  - `reviewer-ui`: interaction, frontend state, accessibility, responsive behavior.
  - `reviewer-security`: auth, secrets, untrusted input, execution boundaries, permissions, sensitive data.

## Planning and Execution

- **Plan formally when requested or work is complex, ambiguous, risky, or dependent.** Implementation requests authorize scoped execution without routine/per-task approval. `/plan` and planning-only requests stay read-only until implementation approval; honor explicit approval gates.
- **Understand first, then simplify.** Before planning, trace affected code and callers end to end; choose minimal solution. Read current authoritative tool/framework docs at project-pinned versions; inspect source/types when unclear. Read every reference; verify against code and versions. Assume no facts.
- **Make plans implementation-ready.** State goal, simplest approach, work parts. Small tasks: one outcome and focused commit each. Specify scope, exclusions, dependencies, ownership, ordered steps, exact paths/functions/types/symbols, data flow, minimal checks/expected results, authoritative API/behavior links/sections. Resolve design first. No guessed paths, stale references, vague instructions, or approaches left to implementers. Detail clarifies smallest solution, never expands scope.
- **Split large plans into MRs.** Separate independent changes; stack dependent MRs. Explain scope/order. Explain tasks simply; proceed when authorized.
- **Follow dependencies through implementation, validation, corrections, review.** Stay in scope. Run task checks before completion; each completed task ready for one focused commit.
- **Trace drift, failed assumptions, failures, and growing complexity to root causes.** Pause affected work; question assumptions/approach with smallest scoped inspection/probe. Seek simpler solutions, not symptom patches. Search official docs first, then trustworthy sources/issues; verify against project versions/code. Resolve routine details and failures autonomously only when verified solution fits plan and requirements.
- **Obtain approval for plan conflicts, no reliable in-scope solution, or scope/approach changes.** Stop when plan conflicts with requirements or verified facts, no reliable in-scope solution exists, or scope/approach must change. Explain discrepancy and smallest proposed revision before resuming. Never silently depart, guess, or add workarounds merely to proceed.
- **Keep active plan as sole task/progress state.** Update unfinished tasks for discoveries; preserve completed history.

## Design and Communication

- **Choose simplest correct solution for current requirements.** First ask whether code is needed. Simplify architecture, implementation, plans, validation. Prefer deleting unnecessary code; choose boring solutions and smallest correct diff, not merely shorter code. Avoid parallel systems or needless redesign. No speculative scaffolding, features, fallbacks, compatibility support, or configuration. Minimize state, branches, dependencies, files, moving parts.
- **Evaluate trade-offs, then choose one approach.** Weigh relevant pros/cons against current requirements; pick the best fit. Stop analysis once evidence supports a decision. Never blend competing solutions to avoid choosing. Use hybrids only when concrete requirements justify the added complexity.
- **Reuse first correct option.** Try existing code, standard library, native platform, already-installed dependency, then minimal custom code, in that order. No dependency for problems few straightforward lines solve.
- **Never simplify away safeguards or explicit requirements.** Preserve security, trust-boundary input validation, data-loss protection/error handling, accessibility basics.
- **No new layers, abstractions, or code deduplication unless asked to refactor or optimize.** Reuse existing code; local duplication acceptable. Each value: one owner, one source of truth. Keep state in narrowest scope serving all consumers.
- **Fix shared root causes, not caller symptoms.** Inspect every affected function's callers. Replace flawed designs; no accumulating wrappers, flags, retries, special cases. Sunk effort never justifies complexity. Keep changes local; follow project patterns. Enforce constraints through names, structure, types, data flow.
- **Use shortest specific, unambiguous names; one term per concept.** Avoid generic `data`, `item`, `value`, `result`, `manager`, `helper`, `utils`. Functions: action/return verbs. Predicates: names such as `isReady`, `hasAccess`, or `canSubmit`. Collections: plural nouns.
- **Communicate directly, concretely, proportionally.** No filler, repetition, irrelevant detail. Explain files, functions, state, branches, data flow. ASCII diagrams only for multi-part flows. Report verified behavior, not edit history. Briefly explain meaningful omissions and when more complexity is warranted. Final responses: completed work, relevant details; expand when requested.
- **Comment real limitations concisely.** Deliberate shortcuts: known ceiling and upgrade trigger, not speculative TODOs.
- **Avoid computer-use tools unless requested or required.**

## Shell, Configuration, and Worktrees

- **Keep Bash/sh short, readable, direct, fast.** Simple commands/control flow; no needless wrappers, abstractions, nesting, retry loops. Scope searches/checks; avoid redundant work. Run independent, noninterfering commands concurrently; retain validation/safety checks.
- **Bound commands and waits.** Prefer short commands over long chains; shortest realistic timeout. Never default to long timeouts or extend them to hide stalls. Inspect stalls before retrying. No long waits, sleeps, polling unless strictly necessary. Use concrete completion conditions, not arbitrary delays.
- **Separate shareable defaults from local configuration.** Defaults belong in examples/templates; secrets, environment values, machine paths, account state, generated metadata: ignored local files. Setup creates missing files, never overwrites existing files. Check staged configuration for sensitive/machine-specific values before committing.
- **Worktrees only under `<repository-root>/.local/worktrees/`.** First verify `.local/` is ignored.

## Validation and Types

- **Use minimal runnable checks for nontrivial logic.** Checks must fail when behavior breaks. Reuse coverage; add focused regression test/assertion check only when needed. Trivial changes need no new tests. Run relevant type checks, builds, lint, runtime checks, manual verification. Start with smallest checks proving changed behavior; broaden only for affected dependencies/risk. No unrequested standalone documentation.
- **Keep probes/tests minimal, fast, scoped to concrete question/failure mode.** Prefer existing tools/focused cases. No elaborate harnesses, broad matrices, or new local-check infrastructure. Stop when evidence answers question.
- **Preserve end-to-end TypeScript safety.** Never hide errors with `as`, `as const`, postfix `!`, unsafe coercion, suppression comments, or weaker types. External data: `unknown`; parse/narrow. Model valid states with precise types, unions, guards, parsers.
