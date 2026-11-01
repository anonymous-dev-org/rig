# Current task: simplify and clarify the agent prompt

## Goal and scope

Rewrite `pi/.pi/agent/AGENTS.md` to make the existing instructions concise, consistent, and easy to follow without changing the agreed policy. Track this task in this worktree's existing `PLAN.md`.

## Excluded

Application code, new policies, new verification artifacts, remote publication, and changes to the previous task records below.

## Implementation details

1. Consolidate repeated instructions and organize the prompt around scope, simplicity, planning, execution, communication, and repository workflow.
2. Clarify when to continue, pause for analysis, request approval, and finish. Separate required implementation from optional improvements after completion.
3. Have one read-only reviewer compare the rewrite with the original. Resolve concrete ambiguity or lost requirements, then manually review and run `git diff --check`.
4. Commit the verified changes, merge into local `main`, and remove the worktree.

## Requirements list and tracking

- [x] Preserve every existing policy. Done when manual comparison and independent review confirm that scope approval, simplicity, communication, one plan per worktree, plan structure/tracking, execution, issue handling, code-quality priorities, delegation, repository isolation, and verification restrictions remain intact. Completed: independent reviewer found no lost requirements or contradictions; final manual review also preserved immediate debt recording and made approval-before-plan-update-before-implementation explicit.
- [x] Make the instructions clear and concise. Done when repeated rules are consolidated, continuation and approval conditions are explicit, and the rewrite has fewer words without dropping requirements. Completed: consolidated six sections, defined significant deviation, separated issue handling from approval and completion, and reduced the prompt from 663 to 594 words.
- [x] Verify the rewrite without creating verification artifacts. Done when independent review is resolved, manual review is complete, and `git diff --check` passes. Completed: reviewer verdict OK with no findings; manual review and `git diff --check` passed, including the final timing clarifications. No verification code or artifacts were created.

Technical debt / shortcomings: wording can reduce ambiguity but cannot guarantee an agent will always interpret or follow it correctly.

### Previous task records (unchanged)

# Current task: clarify AGENTS.md rules

Goal: make the existing agent instructions concise, non-repetitive, and easy to follow without dropping user requirements.
Scope: rewrite `pi/.pi/agent/AGENTS.md` in this worktree and track this task here. Do not change application code, other instructions, or the earlier plan below. The user authorized a pull request and merge into `main`; exclude unrelated local commits and preserve the original uncommitted draft.

- [x] Consolidate overlapping rules. Done: organized the instructions into four sections and reduced them from 570 to 379 words without repeated reminders.
- [x] Replace vague exceptions with decision criteria. Done: specified the mechanical-edit plan exception, delegation boundary, explicit scope approval, completion conditions, and prohibition on new verification artifacts.
- [x] Preserve all existing requirements. Done: manually compared the rewrite against the original instructions and the delegated draft; all requested behaviors remain. `git diff --check` passed; no tests or probes were added.

- [x] Follow-up: replace the rule catalogue with a few defined concepts. Definition of done: scope and simplicity follow one central principle, communication and tracking explain their purpose and boundaries, concrete workflow requirements remain explicit, and manual comparison plus `git diff --check` confirms no requested behavior was lost. Completed: defined necessary and sufficient work, user understanding, and visible progress; separated required workflow from principles; manual comparison and whitespace check passed.

- [x] Separate goal/scope from simplicity. Definition of done: one principle defines what work belongs in the task, another defines how to choose the simplest correct solution; remaining principles and workflow requirements stay unchanged. Completed: split the principle, renumbered the remaining headings, and confirmed the other text is unchanged. `git diff --check` passed.

- [x] Review remaining ambiguity. Definition of done: inspect all four principles and the workflow, resolve wording that permits materially different actions without adding policy, preserve existing requirements, and manually review the final text with `git diff --check` passing. Completed: independent review found two ambiguities; clarified the delegation exception with "neither/nor" and explicitly included fileless one-off probes in the prohibition. Final manual review found no other material ambiguity; `git diff --check` passed.

- [x] Remove filler and simplify sentences. Definition of done: use direct wording and shorter sentences while preserving the four principles, their boundaries and exceptions, and all workflow requirements; manual comparison and `git diff --check` pass. Completed: reduced this pass from 448 to 384 words, removed repeated wording, and preserved approval, timing, completion, delegation, and verification conditions. Manual comparison and whitespace check passed.

Technical debt / shortcomings: none identified. Instruction wording guides model behavior; it is not a programmatic enforcement mechanism.

---

# Automatic AeroSpace grid

## Publication
- User tried the batched helper and approved its behavior.
- Commit and push the verified changes on fix/aerospace-grid; no merge or active-config deployment requested.

## Active: batch layout updates
Goal: reduce visible intermediate layouts using one eval request per grid rebuild.
Expected outcome: unchanged 1–8 geometry/order and focus, fewer visible intermediate states.
Definition of done: commands batched including ordering correction; manual real-window workflow verified; honest report of visual limitations; existing user windows preserved.
1. done — Batched all tree mutations, predicted-order DFS swaps and balance into one safely quoted eval using &&. No intermediate mutation calls.
2. done — Real disposable windows verified membership growth/moves 1–8, close 8–1, exact geometry/order and nonfocused-workspace focus preservation. Temporary windows/helper cleaned up; original five user windows/workspaces preserved. git diff --check passed. Final geometry verified, not frame-by-frame visual smoothness; no flicker-free guarantee. Installed config unchanged; worktree helper ready for user trial.


## Follow-up: reduce visible rearrangement
Goal: investigate official AeroSpace docs for a smoother implementation before changing code.
Expected outcome: evidence-based recommendation distinguishing documented behavior from unverified batching guarantees.
Definition of done: identify native layout support, event coverage, and command batching; explain tradeoffs and propose next step without mutating live config/windows.
1. done — Read official layout/eval/subscribe documentation and verify batching semantics in versioned source. Parent checked refresh.swift and Shell.swift at v0.21.3-Beta: eval runs command model normalization between steps but ordinary workspace layout follows the enclosing request body. No atomic-display guarantee. subscribe lacks closure event; no native grid layout.
2. done — Recommend first grouping tree operations into one eval per membership update (smallest change), then incremental updates if needed. Keep closure reconciliation; do not promise flicker-free behavior without manual validation. Research only: no helper/live-config changes.


Goal: automatically arrange workspace windows: 1 fills screen; 2 side-by-side; 3–8 use two equal-height rows with ceil(n/2) on top and floor(n/2) below. Each row divides its full width equally. Beyond 8 retain two balanced rows.

Expected outcome: opening and closing tiled windows updates the grid without changing the focused window or mixing workspaces.

Approach: inspect AeroSpace's supported callbacks and tree commands, implement a small layout helper and hook, then manually exercise the installed app.

Definition of done: configuration is accepted by AeroSpace; real windows demonstrate 2/3/4 layouts and growth/shrink behavior; unrelated settings and user changes are preserved. Record any validation limitation.

1. done — Determine supported layout commands and callbacks; completion: use a polling helper for creation/closure detection and vertical-root/horizontal-row tree commands. Live validation still required.
2. done — Implement grid helper and config wiring; completion: membership-driven helper with single-instance flock and scoped operation, startup hook, and operation docs. Parent corrected within-row ordering with focus-preserving DFS swaps.
3. done — Manually exercise and review; completion: real disposable kitty windows confirmed geometry 1–8, shrinking 8–1, correct final ordering, floating exclusion/retiling, duplicate launch handling, and focus preservation across nonfocused workspace rebuild. AeroSpace accepted configuration via dry-run (existing v1 migration warning only). git diff --check passed. Temporary windows/helper cleaned up and original installed config restored.

Validation: definition of done met for implementation. No automated tests/fixtures created or run. Changes remain on fix/aerospace-grid in this worktree; active installation still points to main and has not been deployed. Documented polling latency, non-atomic layout changes, Python3 requirement, and manual layout interaction in aerospace/README.md.
