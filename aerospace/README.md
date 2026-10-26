# AeroSpace: cardinal workspaces and manual layouts

The configuration uses `config-version = 2`. Workspaces `n1/e1/s1/w1`
remain available even when empty. Cardinal navigation is per display; additional
display slots are created on demand. Both container normalizations are disabled
to support manual splits. **Auto-grid is not started.**

Install/symlink `.aerospace.toml` to `~/.aerospace.toml` and the existing
`.config/aerospace/scripts/` helpers into `~/.config/aerospace/scripts/`.
Validate and activate with:

```sh
aerospace reload-config --dry-run --warnings-as-errors
aerospace reload-config --warnings-as-errors
```

## Shortcut cheat sheet

H/J/K/L means left/down/up/right (west/south/north/east).

| Shortcut | Action |
| --- | --- |
| Option + H/J/K/L | Focus a window |
| Option + Shift + H/J/K/L | Move a window |
| Cmd + Option + H/J/K/L | Switch cardinal workspace |
| Cmd + Option + Shift + H/J/K/L | Send window to cardinal workspace |
| Option + Tab | Previous workspace |
| Option + S | New Safari window |
| Option + T or Return | New Kitty window |
| Option + F | Open home folder in Finder |
| Option + Shift + F | AeroSpace fullscreen |
| Option + B / V | Prepare horizontal / vertical split for a new window |
| Option + Shift + B / V | Join existing neighbor right / below |
| Option + E or slash | Tiles; toggle horizontal/vertical |
| Option + W or comma | Accordion; toggle horizontal/vertical |
| Option + Shift + Space | Floating/tiling toggle |
| Option + R | Resize mode: plain H/L adjust width, J/K height by 50; Escape/Return exits |
| Option + M | Focus next display |
| Option + Shift + M | Send window to next display |
| Ctrl + Cmd + Option + H/J/K/L | Focus display in physical direction |
| Ctrl + Cmd + Option + Shift + H/J/K/L | Send window to display and follow |
| Option + C | Raycast clipboard history |
| Option + I | Notification picker |
| Option + Shift + C | Reload config |

A split alone shows no empty pane: press Option+B/V, then launch a window.
Grouping needs an existing neighbor in the requested direction. Layout shortcuts
affect the focused window's immediate container, not necessarily the workspace root.
To tile a pair within horizontal accordion: focus the left window, Option+Shift+B,
then Option+E. Hidden/minimized app windows may not participate normally.

Recovery commands (not undo):

```sh
aerospace flatten-workspace-tree          # Remove nested groups
aerospace layout --root h_accordion       # Set outer layout explicitly
aerospace layout --root h_tiles
aerospace list-workspaces --all
```

## Monitor helper check

The shared helper prints only nonempty monitor arrays to avoid macOS Bash
`set -u` errors when there are no external displays. Check against real displays:

```sh
/bin/bash -uc 'source "$HOME/.config/aerospace/scripts/display-workspaces-lib.sh"; monitor_ids_by_slot; focused_display_slot'
```

Validation: config reload with warnings treated as errors, cardinal navigation
through n1/e1/s1/w1 and return, and two Kitty windows tiled as a subgroup.
Raycast global hotkeys have **not** been cleared or fully audited; those settings
must be managed in Raycast. The launchers below are not configured there by this repository.

---

# Optional legacy automatic grid

`auto-grid` requires Python 3 (`/usr/bin/python3` on this Mac) and the AeroSpace
CLI on PATH (with `/opt/homebrew/bin/aerospace` as fallback). Command semantics
were checked against the official **0.21.3-Beta** source; older releases may not
support the window/workspace-targeted flags used here.

## Install / start / reload

Install `.aerospace.toml` as your AeroSpace config and install or symlink the
**executable** `.config/aerospace/scripts/auto-grid` to
`$HOME/.config/aerospace/scripts/auto-grid`, alongside the existing scripts.
A worktree alone does not change an existing installation's symlink targets.

The current config does **not** start this helper. Starting it manually is an
explicit opt-in and can overwrite manual/accordion layouts. To opt in:

```sh
aerospace reload-config --dry-run
aerospace reload-config
"$HOME/.config/aerospace/scripts/auto-grid" > /tmp/aerospace-auto-grid.log 2>&1 &
```

The helper has a per-user `flock` lock in
`~/Library/Caches/aerospace-auto-grid/lock`; repeated startup/manual launches exit
without starting duplicate managers. Its content is the owner's PID. To stop,
verify that PID is this helper (`ps -p PID -o command=`), then `kill PID`. Do not
remove the lock file: the kernel releases the lock on exit/crash, so a stale PID
needs no cleanup. To pick up changed helper code, stop the old process and launch
again; reloading AeroSpace config alone doesn't replace an existing helper.

For a **disposable workspace only**, with the daemon stopped:

```sh
"$HOME/.config/aerospace/scripts/auto-grid" --once --workspace grid-check
```

Without `--workspace`, the daemon (or `--once`) manages all workspaces, including
existing windows immediately on launch. Don't start it for validation against a
live user's windows. `--workspace NAME` also scopes continuous polling if desired.

## Policy and interactions

- One tiled window fills its workspace; two share one horizontal row.
- Three or more use two equal-height, full-width rows: ceil(n/2) above,
  floor(n/2) below. Widths are equal within each row; the same policy applies
  beyond eight. Existing zero gaps are preserved.
- Floating windows are excluded. Tiled and accordion windows are managed.
- Every 0.75 seconds the helper compares **sorted window IDs per workspace**.
  Opening/closing, workspace moves and floating/tiling changes trigger rebuilding;
  focus changes, resizing, manual tree changes and its own tree mutations do not.
  Manual layouts therefore survive until the next membership change. Stop the
  helper if you want manual layouts to persist across opening/closing windows.
- Rebuilding uses explicit `--window-id` / `--workspace` commands, never focus or
  workspace switching. Window order is deterministic by ID, not focus history.
- Normalization settings remain unchanged. `split` cannot work with flattening
  normalization enabled, so the helper uses `join-with` and `move` instead.

## Algorithm evidence / limitations

Official source at
<https://github.com/nikitabobko/AeroSpace/tree/v0.21.3-Beta/Sources/AppBundle>:
`command/impl/JoinWithCommand.swift` creates an opposite-orientation container;
`MoveCommand.swift` inserts a leaf into an adjacent container;
`BalanceSizesCommand.swift` recursively gives siblings equal weights;
`tree/normalizeContainers.swift` removes singleton containers, not multi-child
row groups. Starting from flattened, vertically ordered leaves, join the first
two, then move the remaining top-row leaves upward into that horizontal group.
Repeat for the bottom row (a singleton bottom needs no group), then balance.
This yields a vertical root with exactly two children for n >= 3. The helper
predicts the resulting depth-first leaf order from these join/move operations
and appends focus-preserving swaps to restore ascending window IDs. For one or
two windows it snapshots the initial depth-first order before flattening instead.

All mutations, including ordering swaps and balancing, are sent in **one `eval`
request per rebuild**, with shell-quoted arguments and `&&` to stop on failure.
The official `command/impl/EvalCommand.swift` and `Shell.swift` support this shell
syntax. Membership checks (and the small-grid order snapshot) remain separate
read-only requests; there are no intermediate mutation CLI requests.

Batching reduces CLI round trips and may reduce visible intermediate layouts;
it does not guarantee flicker-free or atomic display updates. AeroSpace still
normalizes the command model between steps. Polling isn't an atomic transaction:
rapid closes/moves during a rebuild can interrupt it or briefly show an intermediate
tree. Errors retry on the next
poll; continuously changing membership may delay convergence. Native fullscreen,
minimized/hidden-app behavior and apps imposing minimum sizes remain subject to
AeroSpace/macOS limitations. Do not expect a grid while native fullscreen is active.
Deterministic ordering still uses O(n²) move/swap operations inside the batch,
intentionally simple but slower for very large workspaces.

## Manual validation

Revalidated the single-`eval` implementation on AeroSpace 0.21.3-Beta with
real disposable windows: growth/moves from 1–8, closing from 8–1, ascending
window order, and focus preservation when rebuilding a non-focused workspace
passed. CoreGraphics bounds confirmed the agreed geometry. This checks final
results, not frame-by-frame flicker; perceived smoothness still needs user feedback.
The scoped helper and all temporary windows were cleaned up.

Earlier implementation validation used eight disposable kitty windows in a
separate workspace. CoreGraphics window bounds confirmed every layout from 1–8
and automatic shrinking from 8 back to 1. Final ordering was checked at eight
and throughout shrinking. Floating/tiling exclusion, duplicate launch handling,
and focus preservation while rebuilding a non-focused workspace also passed.
`reload-config --dry-run` accepted the config, with the existing config-version-1
migration warning. Temporary windows and the scoped helper were cleaned up;
the installed config was restored unchanged.
