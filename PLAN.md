# Plan: Simple, autonomous, task-linked execution

Status: Tasks 1–4 complete. Task 5/5 in progress: commit, integrate into main, and push, explicitly requested by the user.

## Goal and scope
Update `pi/.pi/agent/AGENTS.md` so an approved plan leads to continuous, sequential execution of small tasks, with every implementation action visibly linked to its task. Keep simplicity and avoiding overengineering central.

Affected files: `pi/.pi/agent/AGENTS.md` and this worktree's `PLAN.md` only. The user additionally authorized committing, merging into local `main`, and pushing to `origin/main`. Keep all file edits in the worktree; update main only through Git integration. No code, extensions, automation, new tests, or merge requests are included.

## Approved changes

### Small tasks and staged plans
- Each task has one concrete outcome, affected files, dependencies, and a clear completion check. Do not hide several independent outcomes in one task or make every tool call a separate task.
- For a small change, use root `PLAN.md` with the current task list. Prepare the first task list before requesting approval.
- When a change needs many tasks or distinct phases, keep root `PLAN.md` as a short overview of the agreed goal, scope, approach, ordered phase outcomes, and active plan. Use `PLAN_1.md`, `PLAN_2.md`, etc. for phase plans.
- Detail only the current phase's tasks. Later phases remain brief outcomes, not speculative task lists. Fully implement, validate, review, and close the current phase before creating the next phase's tasks.
- Approval covers the agreed sequence. Detailing the next phase within that agreement does not require another approval. Scope or approach changes still do.
- Split by coherent outcomes, not an arbitrary task-count limit. Do not introduce multiple plans for a small change.

### Autonomous, sequential execution
- Only one task is in progress at a time. Finish its implementation, validation, review, and plan update before starting the next.
- Continue immediately after task completion until the approved work is finished or genuinely requires user input. Progress updates are not permission requests or reasons to end the turn.
- Resolve routine command failures, failed checks, and implementation decisions autonomously within the approved scope. Escalate unavailable access, decisions the agreement does not settle, consequential actions not already authorized, required scope/approach changes, or problems that remain unresolved after reasonable investigation.
- Replace mandatory parallel execution with sequential execution by default; parallel work requires explicit user authorization. Retain isolation and review safeguards for any authorized delegation.

### Task-linked communication and simplicity
- During implementation, begin every user-facing message with `task N/M:` for the active plan. Precede each tool call or same-task batch with a brief, task-prefixed action description. Every action must directly serve the active task; no unrelated work or cross-task batches.
- Use the same prefix for starts, updates, blockers, and completion: `task 2/7: Starting ...`, `task 2/7: Checking ...`, `task 2/7: Completed — ...`.
- For multiple plans, include the active plan after the prefix, e.g. `task 2/7: [PLAN_1] Checking ...`. Task numbering is local to each plan.
- Replace the instruction to teach in every response with concise, factual execution updates. Explain trade-offs when a decision is needed and summarize validation at completion; do not lecture during routine execution.
- Keep the existing safeguards against speculative features, abstractions, wrappers, and unrelated refactors. Apply the simplicity requirement to plans and process as well as code.
- Limit mandatory external research to relevant uncertainty about APIs, behavior, compatibility, or unfamiliar solutions, using official documentation for the versions in use. Remove indiscriminate research requirements.
- Reconcile the existing planning, escalation, parallelism, communication, and progress rules rather than appending contradictory instructions. Preserve unrelated validation, security, accessibility, and worktree safeguards.

### User-requested Git workflow addition
- Add concise rules for refreshing local `main` from `origin/main` before worktree creation, committing completed chunks promptly, and merging freshly updated `main` plus rerunning validation before opening a merge request.
- Reuse the existing implementation-isolation rule. The addition itself changes instruction text only; the subsequent user request authorizes committing and pushing the result in task 5.

## Tasks
1. Done — Define small-task planning, staged plans, and autonomous sequential execution.
   - Files: `pi/.pi/agent/AGENTS.md`, `PLAN.md`.
   - Dependencies: user approval, received.
   - Outcome: one active task; first task list before approval; later phase tasks only after the previous phase completes; clear escalation boundaries; no default parallel execution.
   - Checks: review the changed rules together, trace normal completion and phase transitions, and run `git diff --check` before closing this task.
   - Result: reviewed the actual diff; normal completion proceeds immediately, the next phase is detailed only after completion, and neither transition requires renewed approval. Escalation is limited to genuine constraints; parallel execution requires explicit authorization. `git diff --check` passed.
2. Done — Require task-linked communication and simplify explanations and research.
   - Files: `pi/.pi/agent/AGENTS.md`, `PLAN.md`.
   - Dependencies: task 1 complete.
   - Outcome: every implementation message and tool action tied to `task N/M:`; concise updates; simplicity applies to both code and process; research driven by relevant uncertainty.
   - Checks: verify exact prefix examples and active-plan tracking; ensure validation, security, accessibility, worktree, and anti-overengineering safeguards remain intact; run `git diff --check`.
   - Result: read the full revised file and verified exact `task N/M:` examples for actions, starts, completion, and phase-local numbering. Updates are concise; research is relevant rather than indiscriminate. Existing safety, isolation, and anti-overengineering safeguards remain. Removed a task-specific caveat from the reusable rules. `git diff --check` passed.
3. Done — Review the complete rules and record delivery limits.
   - Files: `pi/.pi/agent/AGENTS.md` (review only), `PLAN.md`.
   - Dependencies: task 2 complete.
   - Outcome: the approved behavior is consistent across the document; validation and remaining limits are recorded.
   - Checks: manually trace all scenarios below, review the full diff, run `git diff --check`, and confirm the main checkout and active global instructions are unchanged.
   - Result: full diff and all five scenarios reviewed; no conflicting execution or approval requirements found. Only the two approved files changed, `git diff --check` passed, and the main checkout and live instruction symlink target remain unchanged.

4. Done — Add the requested worktree and Git workflow rules concisely.
   - Files: `pi/.pi/agent/AGENTS.md`, `PLAN.md`.
   - Dependencies: tasks 1–3 complete; user explicitly requested this follow-up.
   - Outcome: one worktree-sync bullet and a three-bullet Git workflow section, without duplicating isolation requirements.
   - Checks: review wording against the request and Git documentation, preserve the existing rules, and run `git diff --check`.
   - Result: added one refresh-before-worktree bullet and three Git workflow bullets. Clarified isolation as before planning/implementation so refreshing main first is not contradictory. Reviewed against the request and installed Git pull/merge documentation. `git diff --check` passed; the main checkout remains clean. No Git synchronization, commits, or merge-request operations performed.

5. In progress — Commit, integrate into main, and push the reviewed changes.
   - Files: `pi/.pi/agent/AGENTS.md`, `PLAN.md`.
   - Dependencies: tasks 1–4 complete; user requested “commit and push”, then merging into main.
   - Outcome: reviewed changes integrated into local `main` and published to `origin/main`.
   - Checks: inspect staged changes, run the commit hook and `git diff --check`, refresh local main from origin, merge updated main into the working branch, review and revalidate, fast-forward local main, push without force, verify remote/local commit equality, and confirm clean worktrees.

## Checks
- Manually trace: normal task completion; a recoverable failed check; an actual access blocker; transition from `PLAN_1.md` to `PLAN_2.md`; a required scope change.
- Verify exact task-prefix examples, one active task, phase-local task numbering, deferred later-phase task lists, and no repeated approval inside the agreed scope.
- Review the diff for unrelated changes and unnecessary process. Run `git diff --check`.
- Before delivery, confirm main is clean. After integration, verify it contains only the approved changes relative to refreshed main and that the global instruction symlink exposes the updated file. Future model compliance requires observing fresh sessions after reload.

## Validation results and delivery limits
- Normal completion: finish implementation, validation, review, and the plan update, then immediately start the next task without asking permission.
- Recoverable failed check: investigate and fix within the active task; repeat validation rather than skip it or escalate immediately.
- Access blocker: stop the affected work and report the missing access, attempts made, and exact user input required.
- Phase transition: finish the current plan, create only the next agreed phase's task list, update the overview, and use phase-local task labels without renewed approval.
- Scope change: obtain approval before changing the agreed goal, scope, or approach; do not silently update the agreement.
- Actual Markdown diff reviewed; `git diff --check` passed. Existing validation, security, accessibility, no-new-tests, worktree, and anti-overengineering rules are retained.
- No tests added or run: this is an instruction-only change, validated by document review and scenario walkthroughs, not live agent sessions.
- No blockers. Commit, integration into main, and push are authorized and in progress. The live `~/.pi/agent/AGENTS.md` resolves to the main-checkout file and will expose the updated instructions after integration.
- Activation requires integrating the reviewed change and reloading Pi. Future model compliance remains unverified until observed in fresh sessions; these instructions are guidance, not an enforcement mechanism.

## Preparation
- Read the current rules, existing repository plan, and references to `AGENTS.md` / `PLAN.md` in the repository.
- Read installed Pi 1.1.0 documentation on instruction discovery and reload, and Git 2.50.1 worktree documentation; checked existing public AGENTS.md guidance.
- Verified `.local/` is ignored and the main checkout was clean.
- Created `.local/worktrees/agents-task-execution` on `docs/agents-task-execution` before writing this plan.
- User approved the plan with “Ok”; execution is limited to the two files above.
