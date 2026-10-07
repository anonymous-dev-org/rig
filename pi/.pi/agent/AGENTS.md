# Agent Rules

## Workflow and Delegation

Mandatory default: analyze with subagents -> plan scoped tasks -> implement with subagents -> review. Delegate substantial analysis and implementation. Execute directly only for trivial, tightly coupled work, with a brief internal plan. Always review.

- Main agent owns goals, boundaries, dependencies, decisions, shared files, integration, correctness. Verify analysis before approach selection and planning.
- Delegate bounded, meaningful work with goal, context, exact scope/exclusions, owned files or investigation area, deliverable, acceptance criteria, completion checks. Avoid overlapping edits; parallelize independent tasks, sequence dependencies.
- Verify handoff diffs/findings against outcomes, plan, requirements, scope, affected callers, relevant checks—not summaries alone. Return specific findings for bounded corrections; recheck before acceptance. Escalate scope/approach changes requiring approval.
- Specialist reviews require distinct risks and completed implementation plus initial validation; explicit user requests may override both restrictions. Supply concern, requirements, relevant files, available validation, affected callers/contracts. Verify findings before applying. No generic or synthesis reviewer; manager review mandatory.
  - `reviewer-runtime`: control flow, state, edge cases, data flow.
  - `reviewer-requirements`: acceptance criteria, observable outcomes.
  - `reviewer-quality`: structural changes, shared abstractions, types, naming, duplication.
  - `code-simplifier`: accidental complexity, smaller equivalent designs.
  - `reviewer-data`: schemas, migrations, persistence, serialization, transactions, integrity.
  - `reviewer-api`: public contracts, schemas, events, protocols, integrations, compatibility.
  - `reviewer-ui`: interaction, frontend state, accessibility, responsive behavior.
  - `reviewer-security`: auth, secrets, untrusted input, execution boundaries, permissions, sensitive data.

## Planning and Execution

- Plan formally when requested or work is complex, ambiguous, risky, or dependent. Implementation requests authorize scoped execution without routine/per-task approval. `/plan` and planning-only requests remain read-only until implementation approval; honor explicit gates.
- Before planning, trace affected code and callers end to end and choose the minimal solution. Read current authoritative tool and framework docs at project-pinned versions. Read every reference and verify claims against code and versions; inspect source and types when unclear. Do not treat assumptions as facts.
- Resolve design before planning. State the goal, approach, and work parts. Define small tasks with one outcome each; completed tasks must be ready for one focused commit. Specify scope, exclusions, dependencies, ownership, ordered steps, exact paths, functions, types and symbols, data flow, minimal checks and expected results, and authoritative API or behavior links and sections. No guessed paths, stale references, vague instructions, or design decisions left to implementers. Detail clarifies the smallest solution, never expands scope.
- Split large plans into separate MRs for independent changes, stacked MRs for dependencies. Explain scope/order and tasks simply; proceed when authorized.
- Follow dependencies through implementation, validation, corrections, review; stay in scope. Run task checks before completion.
- For drift, failed assumptions, failures, or growing complexity, pause affected work. Trace root causes and question assumptions and approach with the smallest scoped inspection or probe. Search official docs first, then trustworthy sources/issues; verify against project versions/code. Resolve routine details/failures autonomously only when the verified solution fits plan and requirements.
- Stop and obtain approval if the plan conflicts with requirements/verified facts, no reliable in-scope solution exists, or scope/approach must change. Explain discrepancy and smallest proposed revision before resuming; never silently depart, guess, or add workarounds merely to proceed.
- Active plan is sole task/progress state. Update unfinished tasks for discoveries; preserve completed history.

## Design and Communication

- First ask whether code is needed. Choose the simplest correct architecture, implementation, plan, and validation for current requirements. Prefer deleting unnecessary code and the smallest correct diff, not merely shorter code. Avoid parallel systems and needless redesign. No speculative scaffolding, features, fallbacks, compatibility support, or configuration. Minimize state, branches, dependencies, files, moving parts.
- Weigh relevant pros/cons against current requirements; choose best fit. Stop analysis when evidence supports a decision. Never blend competing solutions to avoid choosing; hybrids require concrete requirements justifying added complexity.
- Reuse the first correct option, in order: existing code, standard library, native platform, installed dependency, minimal custom code. No dependency for problems a few straightforward lines solve.
- Never simplify away safeguards or explicit requirements: security, trust-boundary input validation, data-loss protection/error handling, accessibility basics.
- No new layers, abstractions, or code deduplication unless asked to refactor or optimize. Local duplication is acceptable. Each value has one owner and source of truth; state stays in the narrowest scope serving all consumers.
- Fix shared root causes, not caller symptoms; inspect every affected function's callers. Replace flawed designs; don't accumulate wrappers, flags, retries, special cases. Sunk effort never justifies complexity. Keep changes local; follow project patterns. Enforce constraints through names, structure, types, data flow.
- Use shortest specific, unambiguous names; one term per concept. Avoid generic `data`, `item`, `value`, `result`, `manager`, `helper`, `utils`. Functions: action/return verbs; predicates: `isReady`, `hasAccess`, `canSubmit`-style names; collections: plural nouns.
- Communicate directly and concretely; omit filler, repetition, and irrelevant detail. Explain files, functions, state, branches, data flow; ASCII diagrams only for multi-part flows. Report verified behavior, not edit history. Briefly explain meaningful omissions and when more complexity is warranted. Final responses: completed work and relevant details; expand when requested.
- Explain clearly and deeply in plain language. Define each concept, term, and acronym. Explain how and why with needed context, examples, and limitations. Use short, direct phrases without sacrificing explanation.
- Comment real limitations concisely. Deliberate shortcuts need known ceiling and upgrade trigger, not speculative TODOs.
- Avoid computer-use tools unless requested or required.

## Shell, Configuration, and Worktrees

- Keep Bash/sh short, readable, direct, fast: simple commands/control flow, no needless wrappers, abstractions, nesting, retry loops. Scope searches/checks; avoid redundant work. Run independent, noninterfering commands concurrently; retain validation/safety checks.
- Bound commands/waits: prefer short commands over long chains and shortest realistic timeout. Never default to long timeouts or extend them to hide stalls; inspect stalls before retrying. No long waits, sleeps, polling unless strictly necessary. Use concrete completion conditions, not arbitrary delays.
- Shareable defaults belong in examples/templates; secrets, environment values, machine paths, account state, generated metadata belong in ignored local files. Setup creates missing files, never overwrites existing files. Inspect staged configuration for sensitive/machine-specific values before committing.
- Worktrees only under `<repository-root>/.local/worktrees/`; first verify `.local/` is ignored.

## Validation and Types

- Keep all probes and tests minimal, fast, and scoped to concrete questions or failure modes. Use runnable checks for nontrivial logic; checks must fail when behavior breaks. Reuse existing coverage, tools, and focused cases. Add focused regression tests or assertion checks only when needed. Trivial changes need no new tests. Run relevant type checks, builds, lint, runtime checks, manual verification. Start with smallest checks proving changed behavior; broaden only for affected dependencies/risk. No elaborate harnesses, broad matrices, new local-check infrastructure, or unrequested standalone documentation. Stop when evidence answers the question.
- Preserve end-to-end TypeScript safety. Never hide errors with `as`, `as const`, postfix `!`, unsafe coercion, suppression comments, weaker types. External data: `unknown`; parse/narrow. Model valid states with precise types, unions, guards, parsers.
