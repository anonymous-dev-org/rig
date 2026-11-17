# Zsh customization

Sync restores the managed `.zshrc` on every run, backing up replaced edits. Put additions in these existing private hooks:

- `~/.zshrc.pre`: optional readable script sourced after default autocomplete styles and before autocomplete/highlighting initialization. Use it for plugin initialization variables and styles; shell defaults and plugin download/bootstrap have already run.
- `~/.zshrc.local`: existing private hook, now the final source after Bun completion. Use it for aliases, bindings, PATH and ordinary overrides.
- `~/.zsh/functions.zsh`: existing private functions hook, loaded before lazy runtime helpers and the final local hook.

These scripts execute as shell code. Deployment must preserve them and must not blindly source or rename a previous user `.zshrc` into either hook; ambiguous migration requires an explicit choice. Hooks are not created by this component. Paths intentionally retain the existing HOME-based contract (not ZDOTDIR).

Managed edits and deletions are restored on sync; private hooks remain untouched. Private final assignments usually replace earlier values, but plugins can install later callbacks and additive shell state does not universally reset. The pre-hook does not disable bootstrap downloads. To stop management, deselect Zsh before detaching the local `.zshrc`; retain your private files. Remove a private override to restore the shared default on the next shell start. No automatic plugin removal is performed.

Component exclusions apply only to the current invocation: to keep Zsh unmanaged, pass a `--components` list without `zsh` on every sync. Without the flag, all supported components are selected again.

## Pi launcher

Bare interactive `pi` asks whether to create a new worktree or use the main (primary) checkout. Before either option, the launcher requires a clean primary checkout, switches it to `main`, and runs `git pull --ff-only origin main`. A failed switch or pull stops the launch; changes are never automatically stashed and divergent history is never automatically merged or rebased. A new worktree gets a new branch with the name you enter, starts at the refreshed main checkout's HEAD, and lives under `<primary>/.pi/worktrees/<name>`. Pi starts inside it with `--name <name>`, so the conversation has the same name. Existing branch names and paths are refused. Uncommitted changes are not copied. The runtime directory is excluded through Git's local `info/exclude`.

Use ↑/↓ or `1`/`2` to select a checkout, then Enter to confirm. New worktree is selected by default. Basic terminals (`TERM=dumb` or unset), terminals narrower than 48 columns, and terminals whose width cannot be detected use a plain numbered prompt instead. Press `q` to cancel at either the menu or name prompt (`q` and `Q` are reserved rather than usable branch names). Invalid or already-used names can be retried without restarting. Progress messages show the main refresh, worktree creation, and launch location; Git errors remain visible. Color respects `NO_COLOR` and is disabled on basic terminals.

The launcher is `zsh/.local/lib/rig/pi-launcher.sh`, deployed with the Zsh component. The `pi` alias runs it through Bash; its child process calls the real Pi executable, not the alias. The existing version-check skip and macOS sleep prevention are preserved. Outside Git it starts normally. Any explicit arguments (including resume, help, package commands, and initial prompts), or noninteractive input/output, bypass checkout selection unchanged. Use `command pi` to bypass the launcher entirely.

After syncing the Zsh component, open a new shell. You can try the script before syncing with `bash /path/to/rig/zsh/.local/lib/rig/pi-launcher.sh`. Both choices update the primary checkout to `main`; exiting Pi leaves your parent shell directory unchanged and retains the worktree for later use.
