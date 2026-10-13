# Plan: Two-stage planning and continuous action execution

Status: Approved by the user. Actions 1–2 done; action 3 pending.

## Goal
Make planning explicitly separate collaborative brainstorming from a complete, executable breakdown into small actions. Once the user approves the detailed plan, continue through all approved actions without routine permission requests; stop and report only when the work cannot stay on track within the agreement.

## Scope and approach
- Edit only `pi/.pi/agent/AGENTS.md`, plus this plan's status and validation records.
- Preserve the existing tone, safety/validation rules, worktree isolation, delegation restrictions, and Git workflow.
- Replace task-sized planning units with numbered actions: each describes one concrete operation, not a broad work package or necessarily one tool call.
- Retain phase files as an organizational option, but remove deferred detailing: the complete approved scope must be broken down before implementation approval.
- Use `action N/M:` for future execution reports and align planning/execution bookkeeping terminology throughout the file.
- No subagent prompt edits, code changes, new tests, publishing, or merging to main.

## Agreed behavior to establish

### Stage 1 — Brainstorm and agree on direction
Discuss the goal, scope and exclusions, constraints, and high-level implementation approach with the user. Ground the discussion in current code/docs, resolve material open questions, and agree on the direction before breaking it down into actions. This stage does not authorize implementation.

### Stage 2 — Break the agreed direction into actions
Write the complete ordered list of actions needed to finish and validate the agreed plan. Each action must specify:
- One concrete operation, its goal, and its scope/boundaries.
- Affected files, symbols, or other targets, as applicable.
- Dependencies and required inputs.
- Enough context and explicit references to the relevant plan decisions, code, and documentation to implement the action as intended without guessing.
- A definition of done with observable results and the checks required to establish completion.

Split bundled operations into separate actions. Keep the detail proportional to the work; do not turn every tool invocation into a separate action. Include all actions across any phase files before requesting approval. No implementation until the user approves the detailed plan.

### Execute continuously within the agreement
Approval authorizes the whole plan. Complete, validate, review, record, and commit each action before continuing to the next, sequentially unless parallel execution was explicitly authorized. Progress reports and phase boundaries are not permission gates.

Resolve routine failures and implementation details autonomously when possible within the approved goal, scope, approach, and safeguards. If implementation goes off track and cannot be corrected within the agreement, stop the affected work and report the deviation/blocker, what was tried, its impact, and the specific decision or access needed. Preserve existing escalation conditions for unavailable access, unauthorized consequential actions, unresolved material decisions, changes to the agreement, and problems unresolved after reasonable investigation. Never silently depart from the plan or weaken validation.

## Actions

### 1. Done — Replace the planning section with the two-stage process
- Operation/target: replace `## Plan WITH the user` in `pi/.pi/agent/AGENTS.md`.
- Goal/scope: express the two stages and the complete, small-action breakdown described above; preserve research requirements and worktree-only planning.
- Dependencies: user agreement on this proposal and approval to implement the detailed plan.
- Context/references: this plan's Goal, Scope and approach, and Stage 1/Stage 2 behavior; the existing planning section's approval and phase-file rules.
- Definition of done: manual review confirms both stages, agreement before breakdown, detailed approval before implementation, complete coverage of the plan, and every per-action requirement. Deferred phase detailing and task-sized planning are removed. `git diff --check` passes; result is recorded here and committed.

### 2. Done — Update the execution section for uninterrupted action execution
- Operation/target: replace `## Execute the approved plan` in `pi/.pi/agent/AGENTS.md`.
- Goal/scope: require continuous execution of the approved actions; explain the sole need for intervention when the work cannot stay on track within the agreement.
- Dependencies: action 1.
- Context/references: this plan's Execute continuously within the agreement behavior; the revised planning section; existing autonomy and escalation safeguards.
- Definition of done: manual review confirms no routine permission gates, immediate continuation after each action/phase, autonomous recovery from routine failures, and clear stop/report conditions without authorizing scope changes or unsafe continuation. `git diff --check` passes; result is recorded here and committed.

### 3. Pending — Align action terminology in the remaining workflow rules
- Operation/target: update planning/execution terminology in `Keep it fucking simple`, `Talk clearly`, `Isolate and delegate`, `Git workflow`, and `Show the work` in `pi/.pi/agent/AGENTS.md`.
- Goal/scope: use actions consistently for plan units, active-work limits, commits, status tracking, and `action N/M:` reporting; remove any remaining implication that later phases are detailed only after approval.
- Dependencies: actions 1 and 2.
- Context/references: this plan's Scope and approach; revised planning/execution sections; existing progress, isolation, and Git rules. Subagent role files are outside scope.
- Definition of done: full-file manual review and terminology search confirm that no contradictory task-based workflow or deferred action breakdown remains. Unrelated rules and safeguards are preserved. `git diff --check` passes; results/limits are recorded here and the action is committed. Worktree is clean.

## Validation and limits
- Documentation-only: review wording against the user's request and the existing safeguards; inspect diffs and terminology; run `git diff --check` for every action.
- Do not add tests. No application runtime checks are relevant.
- Future model compliance cannot be proven by a wording review; report it as unverified.
- Commit each completed action in this worktree. Merge/push are not included.

## Preparation
- Read the current `AGENTS.md`, existing repository plan, and planner/worker prompts; checked related references.
- Verified a clean main checkout and ignored `.local/`.
- Pulled `origin/main` into local `main` (already current), then created `.local/worktrees/agents-two-stage-planning` on `docs/agents-two-stage-planning` before writing this plan.

## Results
- User approved the proposed wording, scope, and three-action plan with “Yes”.
- Action 1: replaced the planning rules with explicit brainstorming/agreement and detailed-action stages. Manual diff review confirmed complete action coverage, goal/scope/targets/dependencies/inputs, context/references, and observable definitions of done. Existing research and worktree rules remain unchanged. `git diff --check` passed. Commit: `3d5a516`; commit hook passed.
- Action 2: updated execution to continue across actions/phases without permission gates, commit completed actions before proceeding, recover autonomously within the agreement, and stop/report deviations or blockers that require user input. Manual review confirmed unavailable-access, unauthorized-action, unresolved-decision, agreement-change, and unresolved-problem conditions are preserved, along with validation safeguards. `git diff --check` passed. Reporting and remaining terminology alignment are reserved for action 3.
