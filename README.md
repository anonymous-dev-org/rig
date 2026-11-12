# rig

Shared defaults live in this checkout and are enforced on every sync for selected components. Personal additions and state stay outside it. Sync creates no deployment symlinks.

## Sync

Put Node on the **parent shell PATH** first. Selected `brew` also requires Homebrew; selected `pi` requires Bun. Rig checks these before changing config. It does not run runtime bootstrap installers.

```sh
./sync.sh --preview
./sync.sh
```

The first sync selects `brew,neovim,zsh,kitty,git,pi`. AeroSpace, Lazysql and macOS configuration are deliberately **untouched**: adoption/update is manual, not a new merger or preference engine. Homebrew may still install their apps from the shared Brewfile. Legacy component install commands (including the AeroSpace helper) are excluded from this no-symlink workflow; do not use them for copy deployment.

There are no prompts: inspect preview before applying. `--yes` remains accepted but never overrides conflicts. Later syncs reuse saved selections, refuse a dirty checkout (including untracked files), pull with `--ff-only`, then re-execute the new orchestrator. The first sync needs no saved state and uses the current checkout. Preview does not fetch/pull: it describes the current checkout, not remote changes.

Use `--components` to **replace the full selection**, stored privately in `~/.local/state/rig/orchestration/settings.json`:

```sh
./sync.sh --components zsh,git,pi --preview
./sync.sh --components zsh,git,pi
./sync.sh --components '' # stop future management; remove nothing
```

Sync accepts:

- `--preview`: report actions/conflicts without writing state or installing packages. Pi JSON sync has no preview CLI, so its action is listed but not run.
- `--components <comma-separated-list>`: select from `brew,neovim,zsh,kitty,git,pi`.
- `--brew-no-upgrade` / `--brew-upgrade`: persist the shared package upgrade preference, including the selected Pi CLI and configured Pi packages. Missing Pi packages still install; incompatible npm versions are repaired to match their declarations.
- `--brewfile <absolute-private-file>`: add an existing trusted private Brewfile outside rig.
- `--pi-migrate-from <checkout>`: forward Pi's explicit legacy migration flag.
- `--install-hooks`: explicitly set this checkout's local `core.hooksPath=.githooks`. A different existing hooks path is preserved and requires a manual composition choice; this flag never replaces it.

Unknown flags fail. Components report independent failures and partial success; rerun after resolving errors. Selection persistence is not a global transaction. Deselecting a component stops management, **not** active includes, existing links or installed apps. Disable active behavior through native controls or explicit detachment. No package cleanup/uninstall is performed.

## Adoption and customization

Explicit file inventories replace Stow traversal. Repository docs, tests, examples, disabled skills and Pi browser captures are not deployed. Foreign links and unsafe paths fail closed. Selecting a component authorizes restoring its explicitly managed files, including changed or deleted copies; unrelated files stay untouched and nothing is adopted into Git. Rig never executes unknown config to infer intent. Do not blindly move old executable config into a startup hook.

Managed non-JSON files always receive repository bytes. Local edits are backed up before replacement under `~/.local/state/rig/orchestration/backups/`; deleted managed files are recreated. Add executable/text customizations in separate private hooks/files, not managed copies. Managed JSON objects keep local-only keys recursively, but repo-defined values win, including scalars and complete arrays (argument order matters). Pi packages are the exception: repo declarations win by package identity and additional local packages survive. Invalid JSON stops that publication. Retired files and JSON keys no longer present in the repo are not automatically removed. `copies.json` records published hashes, not opt-outs.

Known rig links become ordinary files/directories with private snapshots and concurrent-edit checks, then receive enforced repo defaults in the same sync. Unknown content in linked directories blocks migration. Links from another checkout are foreign. Stop editors and applications that write config during migration; checks are not a filesystem transaction.
- **Git:** private `~/.gitconfig` includes deployed `git/rig.conf` before personal settings. Known old rig `.gitconfig` links migrate to a private include entrypoint. Unknown ordinary config is not rewritten. Existing XDG `git/config` blocks automatic activation because shared credential resets must not follow existing private credentials: place the include manually in the earliest config before private settings. Review [Git credential ordering and combined ignores](git/README.md). Additional global ignore patterns need a separate explicitly combined private ignore file. Remove the include to disable; remove personal overrides to reset.
- **Zsh:** private `~/.zshrc.pre` and final `~/.zshrc.local`; see [Zsh](zsh/README.md). Managed `.zshrc` edits/deletions are restored on sync; deselect Zsh to stop management.
- **Kitty:** private `local.conf` beside deployed copies; see [Kitty](kitty/README.md). Managed edits/deletions are restored on sync; retain additions in private files.
- **Neovim:** private `pre.lua`, `deferred.lua` and native `after/` resources in the sibling `nvim-local` directory; see [Neovim](neovim/README.md). Plugin/tool downloads remain Neovim-owned. Managed edits/deletions are restored on sync; retain caches and private hooks.
- **Pi:** [Pi settings migration and resource controls](pi/README.md). Direct agents/extensions/themes/instructions have a separate explicit inventory; personal additions remain untouched. Managed assets and JSON defaults are enforced; unsafe directory/path conflicts still stop Pi safely. Selected Pi installs a missing CLI with `bun add --global --ignore-scripts @earendil-works/pi-coding-agent`; existing CLI is retained in no-upgrade mode, otherwise that command can upgrade it. This is not a reproducible version lock. After settings sync, the installed Pi package-manager API reconciles configured packages (including missing pinned versions) before success is reported; failures fail the Pi component. No-upgrade suppresses optional package refreshes, not missing-package installation or npm version-constraint repair. Restart/reload Pi to load the resources. `--pi-migrate-from` imports only the explicitly named checkout. Deselect Pi to stop managing its local assets, or add Pi-native controls for resources not defined by the repo. Keep personal instruction composition explicit.
- **Skills:** the 24 `principle-*` skills remain active in `pi/.pi/agent/skills/` and deploy with Pi. The other 33 vendored pstack skills are disabled and retained in `pi/disabled-skills/`, outside Pi discovery and deployment. Existing home copies are untouched; package-provided skills remain supported. The empty skills lock does not control these files.

Paths under `.config` respect `XDG_CONFIG_HOME` (default `~/.config`); Zsh and Pi keep their existing HOME-based contracts. Private hooks may still override behavior at application runtime; sync enforces deployed files, not application behavior or project-local configuration. Do not delete private state/history to reset settings.

## Brew controls

[Brew controls](brew/README.md) persist native skip variables, optional private Brewfile and the no-upgrade choice. No separate Bun self-upgrade bypasses them. The selected Pi CLI follows the same upgrade preference, but is not a Brew formula and does not inherit formula-specific skips; deselect Pi to avoid CLI installation/updates.

## Validation

Use existing repository checks. Sync without preview is a live command. Preview can identify missing prerequisites and conflicts; it does not verify application startup, network installs or installed-version compatibility.
