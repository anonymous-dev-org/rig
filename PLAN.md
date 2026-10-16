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
