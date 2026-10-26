# AeroSpace: numbered cardinal workspace groups and manual layouts

The configuration uses `config-version = 2`. Groups **1–9 are shared across
all displays**, not duplicated per monitor. Group 1 (default) is `n/w/e/s`;
group 2 is `n2/w2/e2/s2`, through `n9/w9/e9/s9`. Only group 1 is persistent;
other workspaces are created on demand. There is no separate group state:
the focused workspace determines the current group and direction.

Option+1…9 changes group while retaining direction. Cmd+Option+H/J/K/L
focuses west/south/north/east in the current group; adding Shift sends the
focused window there without following. Ordinary workspace focus follows an
existing workspace to its display; it never summons it to the current monitor.
Display focus uses native monitor focus, retaining the destination's visible
workspace. Display sends use native monitor moves and follow the window into
the destination's visible workspace, without preserving the source direction
or group and without relocating any workspace.

The shared contract is `scripts/workspace-groups-lib.sh`. Noncanonical names
(including `notes`, `n1`, `n10`, and old `-gN` names) default to north/group 1
for navigation only; their windows and names are not automatically changed.
`new-workspace.sh` picks the next empty workspace clockwise within the current
shared group, checking occupancy globally. Both container normalizations are
disabled for manual splits. **Auto-grid is not started.** There is no startup
workspace routing or monitor-slot normalization.

## Install and safe legacy behavior

Install/symlink `.aerospace.toml` to `~/.aerospace.toml` and the complete current
`.config/aerospace/scripts/` directory to `~/.config/aerospace/scripts/`.
A worktree alone does not change live symlink targets. After explicitly choosing
to activate the update, validate and reload:

```sh
aerospace reload-config --dry-run --warnings-as-errors
aerospace reload-config --warnings-as-errors
```

This repository change does **not** reload the live config, move windows, or
rename/migrate workspaces. Existing `n-g2`, `e2-g3`, etc. remain usable via
native workspace commands or a user's external picker; group/cardinal shortcuts
treat them as noncanonical. Existing `n2/e2/s2/w2` now mean **group 2**, even if
they previously represented display 2. No automatic migration can safely infer
that intent. If desired, manually move selected windows after inspecting
`aerospace list-workspaces --all`; do not batch-rename or merge live workspaces.
Old helper files left in an installed directory are not called by this config;
remove obsolete `normalize-display-workspaces.sh` and `display-workspaces-lib.sh`
when updating the installation so they cannot be invoked accidentally.

## Shortcut cheat sheet

H/J/K/L means left/down/up/right (west/south/north/east).

| Shortcut | Action |
| --- | --- |
| Option + H/J/K/L | Focus a window |
| Option + Shift + H/J/K/L | Move a window |
| Option + 1…9 | Select shared group, preserving direction |
| Cmd + Option + H/J/K/L | Switch cardinal workspace in current group |
| Cmd + Option + Shift + H/J/K/L | Send window to cardinal workspace in current group |
| Option + Tab | Previous workspace |
| Option + S | New Safari window |
| Option + T | New Kitty window |
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

## Foundational, application-independent shortcuts

Group selection, cardinal navigation/window sends, and Option+H/J/K/L window
focus/moves are declared directly in **both main and resize modes** with
identical commands. They are not conditional on the focused application, and
remain available without leaving resize mode (plain H/J/K/L still resize).
AeroSpace has no app-specific rules or exceptions in this configuration.

Repository shortcut audit: Kitty's tab bindings use **Ctrl+Option**, not these
Option-number or Cmd+Option chords; Kitty also already disables Secure Keyboard
Entry. Neovim's Mini modules define Option+H/J/K/L actions, but those are
application-local fallbacks: active AeroSpace global bindings take precedence
when macOS delivers the keys. No conflicting group/cardinal app mapping or
system shortcut override was found in the repository's Kitty, Neovim, shell,
macOS defaults, Lazysql or Pi configuration; no app config needed editing.
This is a static audit, **not live override testing**. External app defaults,
Raycast/global hotkeys and user-local settings are outside the repository audit.
macOS Secure Input, missing Accessibility permissions, disabled AeroSpace,
system-reserved shortcuts, or another global hotkey owner can prevent delivery;
configuration cannot universally override those OS-level conditions.

Run `python3 aerospace/tests/binding-contract.py` with Python 3.11+ to statically
check all modes and the absence of AeroSpace app-specific exceptions.

## Mocked regression check

Run `bash aerospace/tests/workspace-groups.sh` from the repository root. It
uses a mocked CLI only, never real windows, and checks naming, group/direction
navigation, global next-empty selection, and native display commands. Run
`python3.14 aerospace/tests/binding-contract.py` for the static mode contract.
No workspace-picker implementation is present in this repository; native or
external pickers can select exact global names without display translation.
Auto-grid already keys membership by the full workspace name (not monitor), so
it needs no code change: `n2` is one workspace and `n` is another. It remains an
explicit opt-in and can change layouts, including legacy workspaces.

Live multi-monitor/key-delivery testing has not been performed for this change.
Raycast/global hotkeys, Accessibility permissions and Secure Input remain
installation-level considerations, not guarantees provided by these bindings.

---

# Optional legacy automatic grid

`auto-grid` requires Python 3 (`/usr/bin/python3` on this Mac) and the AeroSpace
CLI on PATH (with `/opt/homebrew/bin/aerospace` as fallback). Command semantics
were checked against the official **0.21.3-Beta** source; older releases may not
support the window/workspace-targeted flags used here.

## New-window launch shortcuts

Option+S creates a new Safari document then activates Safari. Option+F creates a
new Finder home window (not a possibly reused `open ~` window), raises it and
activates Finder. Option+T uses Kitty's native single-instance new-OS-window
protocol with normal window state and native `open` activation, including when
Kitty already runs. These bindings also work in resize mode. HOME is passed as
a quoted argument. App/AppleScript errors are not swallowed; macOS may require
Automation approval for AeroSpace to control Safari/Finder. No System Events
Accessibility automation or global window-detection focus rule is installed.

`bash scripts/aerospace-launchers.test.sh` checks bindings and mocked launch
commands without opening windows (Python 3.11+; set `PYTHON=python3.14` if your
system `python3` is older). Actual macOS focus/Automation prompts still
require a manual check on the user's desktop. Kitty 0.49.2 installed help confirms
`--single-instance` creates a new top-level window in the existing instance;
its installed single-instance handler focuses the new session's OS window.

## Install / start / reload

`./init.sh` (select AeroSpace) and `./update.sh` both call
`bash scripts/install-aerospace.sh`. You can also run that helper directly.
It installs only the config and an explicit helper manifest, never tests/docs.
Conflicting files or links receive unique timestamped `.backup-*` siblings;
unrelated config files stay in place. Competing default/XDG `aerospace.toml`
files are backed up individually. Folded directory links are detached before
writes so installation cannot overwrite their source through HOME.

The installer never starts/restarts AeroSpace. Missing CLI or a stopped app
produces a deferred-reload warning; launch it manually and rerun the installer.
For a running app, reload/parse failures and an active config path other than
the installed repo config are fatal. A custom `--config-path` launch override
must be removed manually before relaunching. A worktree alone does not change
an existing installation's symlink targets. Run isolated installer checks with
`bash scripts/install-aerospace.test.sh` (temporary HOME and mocked CLI).

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
