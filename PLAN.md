# Plan: Clear communication and a three-phase workflow

Status: Complete. Approved rules merged into main and pushed to origin/main. User edits restored unchanged and left uncommitted. Final delivery record follows through the same fast-forward and push process.

## Goal and scope
Update `pi/.pi/agent/AGENTS.md` with the exact wording below: concise explanations that teach, and a core workflow of brainstorming, breaking the agreement into executable actions, then implementing after approval. Integrate delegation into that workflow and merge worktree setup and Git integration into one concise section.

Only this rules file and this plan may change. No code, new tests, subagent prompt changes, or delegation. The user's follow-ups authorize merging the completed work into main and pushing to origin/main. Preserve all unrelated rules. The user's uncommitted changes in the main checkout are outside scope and must remain untouched. Removing the completion-summary sentence from the communication section does not remove validation or reporting obligations elsewhere.

## Agreed communication replacement

```markdown
## Talk clearly. Teach the concepts. Have a fucking opinion.

- Explain what we’re doing, how it works, and why it matters in plain language.
- Make substantive explanations small, focused lessons: introduce the core idea, explain what happens underneath, and connect it to the work. Simplify without losing accuracy; define jargon and use examples when helpful.
- Keep status updates brief. Go deep where it builds understanding; skip repetition and unrelated detail.
- Give direct recommendations. Explain the reasoning and trade-offs, and state uncertainty honestly.
- At completion, briefly explain the implemented architecture: the main pieces, their responsibilities, and how they fit together. Highlight sharp edges, limitations, and important failure cases.
```

## Agreed workflow replacement
Replace both `Plan WITH the user` and `Execute the approved plan` with:

```markdown
## How we work: brainstorm, break down, implement.

### 1. Brainstorm together
- Read the relevant code, docs, and callers. Verify unfamiliar behavior against official docs for the versions in use.
- Agree with the user on the goal, scope, constraints, and simplest viable approach. Resolve important unknowns instead of guessing.
- Agreement on direction allows planning, not implementation.

### 2. Break the agreement into executable actions
- Write the complete, ordered plan in `PLAN.md` at the isolated worktree’s root, never in the main checkout. Use linked `PLAN_N.md` files only when distinct phases need them.
- Make each action one concrete operation. State its goal, boundaries, affected files or symbols, dependencies, required context, and observable completion checks. Keep it small enough to implement and verify without guessing.
- Decide whether subagents would help. Delegation requires authorization from the user or applicable instructions; complexity alone is not permission. Parallel execution requires explicit user approval.
- For authorized delegation, define bounded assignments: goal, context, owned files, exclusions, expected result, and validation. Finish prerequisites before dependent work; give parallel writers separate worktrees and non-overlapping files.
- Define all actions, including later phases, before requesting approval. Do not implement until the user approves the detailed plan.

### 3. Implement the approved plan
- Approval authorizes the whole plan. Execute one action at a time unless parallel work was explicitly approved. Continue through actions and phases without asking for permission again.
- Finish each action before starting the next: implement, validate, review, update the plan, and commit. Keep results and blockers recorded.
- When using subagents, the main agent owns decisions, integration, and review. Inspect their changes and validation results; “done” is not proof.
- Resolve routine problems independently within the agreement. Never skip validation, weaken safeguards, or silently change scope.
- Stop only when continuing requires a changed agreement, missing access, an unauthorized consequential action, or a problem you cannot resolve after reasonable investigation. Explain what happened, what you tried, its impact, and exactly what is needed to continue.
```

## Agreed Git/worktree replacement
Replace `Isolate and delegate` and `Git workflow` with:

```markdown
## Git and worktree workflow

- Before planning or implementation, pull `origin/main` into local `main`, verify `.local/` is ignored, and create a new worktree under `.local/worktrees/`. Keep all plans and changes there, never in the main checkout.
- Commit each completed, validated action immediately.
- Before opening a merge request, refresh local `main` from `origin/main`, merge it into the working branch, resolve conflicts, and rerun relevant validation. Open the request only when the work is complete and checks pass.
```

## Actions

### 1/4 — Done: Replace the communication section
- Operation/target: replace the heading and bullets between `## Talk clearly. Have a fucking opinion.` and `## Plan WITH the user` in `pi/.pi/agent/AGENTS.md` with the exact agreed communication replacement above.
- Goal/boundaries: establish plain-language lessons and architectural completion summaries; preserve all other sections.
- Dependencies/inputs: approval of this expanded detailed plan; agreed communication wording above; existing rules reviewed.
- Done when: diff review confirms the exact replacement, unchanged surrounding content, and absence of the removed completion-summary sentence in the replacement. `git diff --check` passes, results are recorded here, and the action is committed.

### 2/4 — Done: Replace planning and execution with the three-phase workflow
- Operation/target: replace the contiguous `Plan WITH the user` and `Execute the approved plan` sections, ending before `Isolate and delegate`, with the exact agreed workflow replacement above.
- Goal/boundaries: make the three phases explicit and integrate delegation planning and supervision. Preserve communication, isolation, Git, and reporting sections in this action.
- Dependencies/inputs: action 1 complete; agreed workflow wording above and existing isolation/delegation rules.
- Done when: diff review confirms exact wording, distinct direction and implementation approvals, complete action planning, authorized delegation/parallelism, bounded assignments, isolated parallel writers, main-agent review, continuous execution, verification, and clear stop conditions. `git diff --check` passes, results are recorded here, and the action is committed. Delegation duplication is intentionally removed in action 3.

### 3/4 — Done: Unify Git and worktree rules
- Operation/target: replace the contiguous `## Isolate and delegate` and `## Git workflow` sections, ending before `## Show the work`, with the exact agreed Git/worktree replacement above. This also removes delegation bullets now covered by the three-phase workflow.
- Goal/boundaries: give repository isolation, action commits, and safe integration one concise section; preserve unrelated content.
- Dependencies/inputs: action 2 complete; integrated delegation rules and agreed Git/worktree wording above; existing isolation and Git sections.
- Done when: full-file and cumulative diff review confirm all agreed wording, no stale section references or redundant delegation block, preserved isolation and integration safeguards, and unchanged content outside the approved sections. `git diff --check` passes. Record results here, commit, verify the worktree is clean, and verify the main checkout's existing edits remain unchanged.

### 4/4 — Done: Merge into main and push
- Operation/targets: preserve the main checkout's uncommitted edits in a temporary stash, pull `origin/main` into local `main`, merge updated `main` into the working branch, validate, and fast-forward local `main` to the completed branch. Restore the saved edits without committing them, then push main to origin without force.
- Goal/boundaries: deliver the approved rules to main and origin/main; preserve the user's uncommitted changes exactly. Plan updates and commits remain in the isolated worktree.
- Dependencies/inputs: actions 1–3 complete; explicit user requests to merge and push; clean working branch; captured original user changes.
- Done when: approved wording and diff checks pass, main contains the completed branch, user edits are restored unchanged, the worktree is clean, the delivery result is recorded and committed, and origin/main matches local main.

## Results
- Action 1: applied the exact approved communication wording. Manual diff review confirmed surrounding sections are unchanged and the removed completion-summary sentence is absent from the replacement. `git diff --check` passed.

- Action 2: applied the exact approved three-phase workflow. Manual diff review confirmed direction/implementation approval boundaries, complete action planning, authorization and isolation for delegation, main-agent review, uninterrupted approved execution, validation, and stop conditions. Other sections remain unchanged. `git diff --check` passed. The old delegation block remains only until action 3.

- Action 3: applied the exact approved Git/worktree section and removed the relocated delegation block. Full-file and cumulative diff review confirmed preserved isolation/integration safeguards and unchanged content outside the approved sections. Search found no stale headings or old communication wording outside this plan. `git diff --check` passed; the main-checkout file's SHA-256 still matches the pre-implementation value.
- No blockers remain. No runtime checks were needed for this documentation-only change. Future agent compliance remains unverified. The commit hook initially rejected a machine-specific path in this plan; replacing it with a relative description resolved the failure without bypassing the hook.

- Action 4: user explicitly authorized merge and push. Temporarily stashed only the existing uncommitted rules edits, refreshed main (already current), and merged main into the working branch (already current). Committed-change whitespace checks passed. Fast-forwarded main to `c3b7412` and restored the edits without conflict. Exact-content comparison confirmed the original user-edited prefix plus approved updated sections, with nothing staged. Removed the temporary stash only after verification. Pushed without force and verified live origin/main matched local main. This delivery record is committed in the worktree and published through the same fast-forward process.

## Preparation and validation limits
- Repository root: the `rig` checkout, one level above the initial `pi/` working directory.
- Verified `.local/` is ignored and pulled `origin/main` into local `main` (already current).
- Created `.local/worktrees/agents-clear-explanations` on `docs/agents-clear-explanations` before writing this plan.
- Read current rules, the prior repository plan, and the expanded worktree target. Main-checkout changes are confined to unrelated simplicity/testing bullets and remain untouched.
- Documentation-only validation; no runtime tests are needed or added. Wording review cannot establish future agent compliance.
