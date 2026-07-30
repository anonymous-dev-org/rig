# Agent Rules

## TypeScript

Preserve type safety end to end.

- Never use `as`, `as const`, postfix `!`, unsafe coercion, or suppression comments.
- Never weaken types to silence errors. Fix model, data flow, or boundary.
- Treat external data as `unknown`. Parse and narrow before use.
- Model valid states precisely with types, unions, guards, and parsers.
- Make invalid states unrepresentable.

## React

- `useEffect` last resort: browser APIs, widgets, subscriptions, timers, external systems only.
- State at lowest owner. Lift only when shared. Use Jotai when props or local state get awkward.
- Small, focused components. Split large components.
- Prefer flexbox. Grid only when clearly better.

## Communication

- Be direct. Remove filler, repetition, and irrelevant context.
- Split complex ideas into small, defined concepts.
- Explain from abstract to concrete:
  1. Purpose and behavior in plain language.
  2. Main parts and interactions.
  3. Exact implementation details.
- When a task is finished, the final response must contain these sections in this order:
  1. **Overview** — Explain in simple terms exactly which functionality was implemented and what the user can now do. Describe behavior, not just changed files. Add a small Mermaid diagram only when it makes a multi-part flow easier to understand.
  2. **Technical integration** — Explain how the new functionality works as a system: its main parts, data or control flow, and how it connects to the existing code.
  3. **Implementation details** — Briefly explain the important code-level decisions, algorithms, state, types, and files. Use simple wording and keep this concise.
  4. **Verification** — State the checks actually run and their outcomes.
- Keep the sections distinct: overview covers behavior, technical integration covers system interactions, and implementation details covers the code.
- Claim only verified outcomes.

## General

Use smallest complete solution.

- Avoid computer-use tools whenever possible. Use them only when the user explicitly requests computer use or when the task requires it.

Simple means:

- Direct, readable control flow.
- Minimum required state, branches, dependencies, files, and abstractions.
- One source of truth per value.
- No speculative options, extension points, configuration, or fallbacks.
- No code compensating for flawed design.

Elegant means:

- Names and structure reveal behavior.
- Types and data flow enforce constraints.
- Errors are handled where they originate.
- Root causes are fixed, not hidden.
- Local changes stay local.

Implementation rules:

- Find root cause before changing code.
- Simplify or replace flawed approaches. Never stack patches, wrappers, flags, retries, or special cases.
- Keep only code required for behavior, correctness, or clarity.
- Keep state at lowest owning scope.
- Add abstractions only when required by current task.
- Add no speculative features, files, dependencies, configuration, or compatibility layers.
- Follow project patterns unless they cause problem.

Naming rules:

- Use shortest name still unambiguous at use site.
- Describe role, not type or implementation.
- Functions use verbs describing action or returned result.
- Booleans use predicates: `isReady`, `hasAccess`, `canSubmit`.
- Collections use plural nouns.
- Avoid vague names like `data`, `item`, `value`, `result`, `manager`, `helper`, or `utils` when specific name exists.
- Use one term per concept. Never use multiple synonyms for same domain idea.

## Configuration

- Keep shareable defaults in tracked example or template files.
- Keep secrets, credentials, environment values, absolute machine paths, account state, and generated metadata in ignored per-user files.
- Setup scripts seed missing per-user files from tracked examples without overwriting existing local config.
- Before commit, inspect staged config changes for sensitive or machine-specific values.

## Planning

- Always divide plans into trackable tasks.
- Each task must recap its intended outcome and include a todo list.

## Investigation

- Before non-trivial action, inspect existing code and applicable authoritative docs.
- During non-trivial code or docs exploration, update `scratchpad` after each useful read/search batch.
- Use `scratchpad` for important implementation concepts, applicable best practices and examples from docs, task plan details, decisions, constraints, findings, and open questions.
- Before starting each planned task, load that task's complete active plan slice into `scratchpad`: its goal, requirements, todo list, target files, dependencies, decisions, and validation. Refresh it whenever the task or plan changes so implementation-critical context stays close to the work.
- Keep notes concise and durable. Update scratchpad before first mutation.
- Replace completed plan slices and prune stale notes as understanding changes. Never paste raw tool output.
- Skip scratchpad for tiny tasks needing no investigation and for bounded post-implementation reviews.

## Subagents

- At start of non-trivial work, identify independent investigation, implementation, and verification tracks.
- When two or more tracks can proceed independently, dispatch them together in one parallel subagent call. Do not serialize independent calls.
- Keep simple tasks and work on one blocking path local. Use single subagents only when focused investigation or context isolation saves time.
- Give each subagent bounded scope, exact context, expected output, and disjoint file ownership.
- Keep blocking decisions, shared files, and final integration in main agent.
- Avoid ritual scout → planner → worker chains. Delegate work, not process.

## Review

- Review is post-implementation, after initial validation. Reviewers never pair-program.
- Identify the concrete review concerns first, then select one or more specific reviewers that cover only those concerns:
  - `reviewer-runtime`: runtime correctness, control flow, state, edge cases, and directly affected data flow.
  - `reviewer-requirements`: whether multi-part or acceptance-criteria-driven work fully implements the supplied requirements and observable outcomes.
  - `reviewer-quality`: maintainability of structural changes, refactors, shared abstractions, complex data flow, types, naming, ownership, or duplication.
  - `reviewer-data`: schemas, migrations, persistence, caches, serialization, transactions, data compatibility, or integrity.
  - `reviewer-api`: public APIs, shared contracts, request or response schemas, events, protocols, integrations, or compatibility.
  - `reviewer-ui`: UI, interaction, frontend state, accessibility, or responsive behavior.
  - `reviewer-security`: authentication, authorization, secrets, untrusted input, command execution, filesystem or network boundaries, permissions, cryptography, or sensitive data.
- Never invoke a specialist merely because it exists. A UI-only change does not need a security review; a small direct implementation does not automatically need requirements and quality reviews.
- Use multiple reviewers only when the change has multiple distinct concerns. Assign each reviewer one explicit, non-overlapping concern; never add a generic or synthesis review.
- Give every reviewer the exact concern, requirements, changed files, and completed validation. Review changed code and directly affected callers, consumers, contracts, and state paths—not the entire codebase.
- For broad cross-domain changes, dispatch independent applicable reviews together in one parallel subagent call. Use disjoint concerns or file scopes and at most three reviewers.
- Keep routine and low-risk changes local. Use no reviewer for tiny edits, routine config or docs, or investigation-only tasks unless requested.
- Main agent integrates findings. Do not add a synthesis reviewer or automatically re-review fixes.
- Verify findings before applying them and re-run relevant validation after fixes.

## Docs

- Before working, read current authoritative docs for everything relevant to task.
- Match project-pinned versions. Follow latest applicable best practices. Never rely on memory alone.
- Docs unclear or stale: inspect types and source.

## Validation

No automated tests. Use type-check, build, lint, runtime checks, manual verification.
