# Plan: One clear, consistent agent workflow

Status: Complete. Consolidated rules merged into main and pushed to origin/main. Publication verified; this completion record follows through the same fast-forward and push process.

## Goal and boundaries
Revise `pi/.pi/agent/AGENTS.md` into a consistent set of rules with explicit responsibilities, workflow boundaries, and completion criteria. Incorporate the approved behavior from `docs/agents-subagent-default` and `docs/agents-simple-task-exception` without merging their historical plan files or modifying those branches.

Only `pi/.pi/agent/AGENTS.md` and this plan may change. Preserve the current title, compliance section, communication section, and unrelated simplicity rules. Preserve worktree isolation, verification, implementation-plan approval for non-simple work, scope control, and safe Git integration. No code, tests, role-prompt edits, or branch cleanup. The user's follow-up authorizes merging into main and pushing to origin/main. This is a directly executed, bounded documentation revision; no delegation is needed to apply the supplied wording.

## Exact proposed changes

### Simplicity: replace only the big-picture bullet
Replace the bullet beginning `Look at the big picture before solving the problem as presented.` with:

```markdown
- Do not accept complexity as a requirement. Question the assumptions, identify the core issue, and look for a simpler overall approach before adding code.
```

The surrounding less-code, decomposition, scope, and correctness rules remain unchanged. Simpler design does not authorize broader scope.

### Replace the entire core workflow section
Replace `## How we work: brainstorm, break down, implement.` through the content before `## Git and worktree workflow` with:

```markdown
## How we work: brainstorm, break down, implement.

- For a very simple task with clear scope, an obvious solution, and low risk, inspect the relevant context and do it directly. Skip brainstorming, a written plan, and additional approval. Still validate, review, and commit. If uncertainty, complexity, or broader impact emerges, stop direct implementation and switch to the standard workflow.
- For all other work, follow the three numbered phases below. Agreement on direction and approval to implement are separate decisions.
- Worktree isolation, validation, review, and commits apply to both workflows.

### Delegate the work. Own the result.
- Use subagents by default for exploration and implementation in both workflows. Work directly only when delegation adds no value or is unavailable.
- You own decisions, coordination, review, integration, and final verification. Delegation transfers work, not responsibility.
- Give each assignment a clear goal, context, owned files, exclusions, expected result, and validation checks.
- Delegate sequentially or in parallel. Parallelize independent work only. Give parallel writers separate worktrees and non-overlapping files; never let them edit the same files concurrently.
- Inspect actual findings and changes against the agreed requirements. Verify the evidence and return specific corrections until the work is correct and validated. A subagent's completion report is not proof.

### 1. Brainstorm together
- Read the relevant code, docs, and callers. Verify unfamiliar behavior against official docs for the versions in use.
- Agree with the user on the goal, scope, constraints, and simplest viable approach. Resolve important unknowns instead of guessing.
- Agreement on direction allows planning, not implementation.

### 2. Break the agreement into executable actions
- Write the complete, ordered plan in `PLAN.md` at the isolated worktree's root. Use linked `PLAN_N.md` files only when distinct phases need them; define phases by outcomes, not arbitrary action counts.
- An action is one concrete operation, not a broad task or an individual tool call. Number the actions and state each action's goal, boundaries, affected files or symbols, dependencies, required inputs and context, and observable completion checks.
- Define every action, including later phases, before requesting approval. Do not implement until the user approves the detailed plan.

### 3. Implement the approved plan
- Approval authorizes the whole plan. Execute in dependency order and continue through actions and phases without asking for permission again.
- An action is complete only when its changes are implemented, validated, reviewed, recorded in the plan, and committed. Do not start dependent work before its prerequisites are complete.
- Resolve routine problems independently within the agreement. Never skip validation, weaken safeguards, or silently change scope.
- Stop the affected work when continuing requires a changed agreement, missing access, an unauthorized consequential action, or a problem you cannot resolve after reasonable investigation. Explain what happened, what you tried, its impact, and exactly what is needed to continue.
```

### Git: clarify location and commit timing
Keep the section and integration rule. Replace its first two bullets with:

```markdown
- Before planning or implementation, pull `origin/main` into local `main`, verify `.local/` is ignored, and create a new worktree under `<repository-root>/.local/worktrees/`. Keep all plans and changes there, never in the main checkout.
- Commit each validated, reviewed change immediately. Do not call work complete before committing it.
```

This applies to simple changes as well as planned actions and avoids defining a change as complete before its required commit.

### Replace the reporting section
Replace `## Show the work` through the end of the file with:

```markdown
## Show the work

- For simple tasks, give a brief update and result. Do not create a plan or invent action numbers.
- For planned work, keep root `PLAN.md` current as the shared source of truth. For staged work, identify the active `PLAN_N.md`. Track actions as pending, in progress, blocked, or done; record validation results and blockers.
- During planned implementation, begin every user-facing message with `action N/M:`, identifying the action and total count in the active plan. For staged work, include the plan name, for example `action 2/7: [PLAN_1]`, and restart numbering for each plan.
- Before each tool call or same-action batch, briefly describe its purpose. For planned work, use the action prefix and keep the operation tied to that action. Do not batch operations from different actions.
- Announce each planned action's start and completion with its prefix. Report parallel actions separately; never present one action's progress as another's.
- Obtain approval before changing the agreed goal, scope, or approach. Routine updates and moving to the next approved action or phase are not permission gates.
```

## Action 1/2 — Done: Apply the consolidated rules revision
- Operation/target: update `pi/.pi/agent/AGENTS.md` using the exact four replacement specifications above as one coherent revision. Use targeted replacements; preserve all unspecified content.
- Goal: one consistent definition of simple versus planned work, delegation responsibility, dependency-safe concurrency, and completion/reporting requirements.
- Dependencies/inputs: user approval of this detailed plan; current main file at preparation commit `20135c8`; the two reviewed unmerged branch diffs; exact proposed wording above. No prerequisites remain beyond approval.
- Validation: review the complete diff and compare every replaced block with this plan. Confirm unchanged title, compliance/communication sections, other simplicity bullets, and the merge-request integration rule. Search for obsolete delegation/parallel approval restrictions and sequential-only wording.
- Scenario review: a clear low-risk edit needs no plan or numbering but still uses a worktree, verification, review, and commit; uncertainty switches it to the standard workflow; non-simple implementation requires detailed-plan approval; independent writers may run in parallel with disjoint ownership; dependent work waits for completed prerequisites; a subagent's report alone cannot establish completion; a simpler broader redesign still needs scope approval.
- Done when: exact-content and manual scenario reviews pass, `git diff --check` passes, results and any limits are recorded here, the action is committed, and the worktree is clean. Confirm main and both unmerged branches were not modified. No runtime tests are relevant or added; documentation review cannot prove future agent compliance.

## Action 2/2 — Done: Merge and publish
- Operation/targets: refresh local main from origin/main, merge updated main into the working branch, revalidate, fast-forward main, and push without force. Record the verified delivery result in this worktree and publish that record through the same fast-forward process.
- Goal/boundaries: publish the consolidated rules and plan only. Preserve the existing subagent and simple-task branch refs; no cleanup or unrelated changes.
- Dependencies/inputs: action 1 complete; user's authorization to merge and push; clean checkouts; approved wording above.
- Done when: approved wording and whitespace checks pass, publication succeeds, live origin/main matches local main and the working branch, both checkouts are clean, protected branch refs are unchanged, and the completion record is committed.

## Results
- Applied the four approved replacements exactly. Full-file and diff review, followed by exact-content comparison, confirmed the title, compliance/communication sections, other simplicity bullets, and merge-request rule remain unchanged.
- Obsolete delegation authorization, explicit parallel-approval restrictions, sequential-only completion wording, and third-person main-agent wording are absent from the revised rules.
- Manual scenario review passed: clear low-risk work skips planning/numbering but retains isolation and verification; emerging uncertainty returns to the standard process; non-simple implementation requires detailed-plan approval; independent writers use separate worktrees and file ownership; dependent work waits for completed prerequisites; subagent reports require evidence/review; broader redesign still requires scope approval.
- `git diff --check` passed. Main's rules file was unchanged at action 1 completion. No code or tests were added; no runtime checks apply. Future agent compliance remains unverified. No blockers.

- Action 2: user authorized merge and push. Refreshed main and merged it into the working branch (both already current). Rechecked all four approved wording blocks, reviewed the rules diff, and passed whitespace checks. Fast-forwarded main and pushed without force through `aad67df`; verified live origin/main matched local main and main was clean. No conflicts or blockers. The completion record is committed in the worktree and published through the same fast-forward process; no other branches are changed.

## Preparation
- Read the current rules, current repository plan, and both unmerged rules diffs. Searched tracked files for the affected workflow headings and conflicting wording; relevant matches were in the target rules file.
- Main was clean, `.local/` was ignored, and origin/main was pulled into main (already current).
- Created `.local/worktrees/agents-clarity` on `docs/agents-clarity` before writing this plan.
