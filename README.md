# rig

Shared defaults live in this checkout and are enforced on every sync for selected components. Personal additions and state stay outside it. Sync creates no deployment symlinks.

Rig seeds Sol 6.2 and Astra 6.2 in Pi and upgrades older OpenAI selections of
those models. Other model and reasoning choices remain personal; see
[model setup](pi/README.md#personal-model-setup).

## Sync

Put Node on the **parent shell PATH** first. Selected `brew` also requires Homebrew; selected `pi` requires Bun. Rig checks these before changing config. It does not run runtime bootstrap installers.

```sh
./sync.sh --preview
./sync.sh
```

Every sync defaults to all supported components: `brew,neovim,zsh,kitty,git,pi,aerospace,lazysql,macos`, regardless of saved selections. Brew installs/updates the shared package list; Pi installs/updates its CLI and configured packages unless the saved no-upgrade preference disables optional upgrades. AeroSpace, Lazysql and macOS settings participate on macOS and are skipped on other platforms.

There are no prompts: inspect preview before applying. `--yes` remains accepted but never overrides conflicts. Later syncs refuse a dirty checkout (including untracked files), pull with `--ff-only`, then re-execute the new orchestrator. The first sync needs no saved state and uses the current checkout. Preview does not fetch/pull: it describes the current checkout, not remote changes.

Use `--components` to **replace the full selection for this invocation only**. Component selections are not persisted or reused; the next invocation without this flag selects all supported components again:

```sh
./sync.sh --components zsh,git,pi --preview
./sync.sh --components zsh,git,pi
./sync.sh --components '' # skip all components for this invocation; remove nothing
```

Sync accepts:

- `--preview`: report actions/conflicts without writing state or installing packages. Pi JSON sync has no preview CLI, so its action is listed but not run.
- `--components <comma-separated-list>`: select from `brew,neovim,zsh,kitty,git,pi,aerospace,lazysql,macos` for this invocation only; an empty list skips all components for this run.
- `--brew-no-upgrade` / `--brew-upgrade`: persist the shared package upgrade preference, including the selected Pi CLI and configured Pi packages. Missing Pi packages still install; incompatible npm versions are repaired to match their declarations.
- `--brewfile <absolute-private-file>`: persist an existing trusted private Brewfile outside rig.
- `--pi-migrate-from <checkout>`: forward Pi's explicit legacy migration flag.
- `--install-hooks`: explicitly set this checkout's local `core.hooksPath=.githooks`. A different existing hooks path is preserved and requires a manual composition choice; this flag never replaces it.

Unknown flags fail. Components report independent failures and partial success; rerun after resolving errors. Skipping a component leaves active includes, existing links and installed apps unchanged; it does not persist an opt-out. Disable active behavior through native controls or explicit detachment. No package cleanup/uninstall is performed.

## Adoption and customization

Explicit file inventories replace Stow traversal. Repository docs, tests, disabled skills and Pi browser captures are not deployed. Lazysql's shared example is explicitly deployed, but private connections are not managed. Foreign links and unsafe paths fail closed. Selecting a component authorizes restoring its explicitly managed files, including changed or deleted copies; unrelated files stay untouched and nothing is adopted into Git. Rig never executes unknown config to infer intent. Do not blindly move old executable config into a startup hook.

Managed non-JSON files always receive repository bytes. Local edits are backed up before replacement under `~/.local/state/rig/orchestration/backups/`; deleted managed files are recreated. Add executable/text customizations in separate private hooks/files, not managed copies. Managed JSON objects keep local-only keys recursively, but repo-defined values win, including scalars and complete arrays (argument order matters). Pi packages are the exception: repo declarations win by package identity and additional local packages survive. Invalid JSON stops that publication. Previously managed files, JSON keys and package declarations removed from the repo are retired on sync, even if locally edited. Unrelated local additions remain. Retiring a JSON object removes that object, including local customizations within it. `copies.json` records file ownership and copied JSON defaults, not opt-outs; legacy hash-only entries establish file ownership but cannot identify old JSON fields. JSON retirement uses previous repo baselines, never guesses from effective home values.

Known rig links become ordinary files/directories with private snapshots and concurrent-edit checks, then receive enforced repo defaults in the same sync. Unknown content in linked directories blocks migration. Links from another checkout are foreign. Stop editors and applications that write config during migration; checks are not a filesystem transaction.
- **Git:** private `~/.gitconfig` includes deployed `git/rig.conf` before personal settings. Known old rig `.gitconfig` links migrate to a private include entrypoint. Unknown ordinary config is not rewritten. Existing XDG `git/config` blocks automatic activation because shared credential resets must not follow existing private credentials: place the include manually in the earliest config before private settings. Review [Git credential ordering and combined ignores](git/README.md). Additional global ignore patterns need a separate explicitly combined private ignore file. Remove the include to disable; remove personal overrides to reset.
- **Zsh:** private `~/.zshrc.pre` and final `~/.zshrc.local`; see [Zsh](zsh/README.md). Managed `.zshrc` edits/deletions are restored on sync; omit Zsh with `--components` to skip management for that invocation.
- **Kitty:** private `local.conf` beside deployed copies; see [Kitty](kitty/README.md). Managed edits/deletions are restored on sync; retain additions in private files.
- **Neovim:** private `pre.lua`, `deferred.lua` and native `after/` resources in the sibling `nvim-local` directory; see [Neovim](neovim/README.md). Plugin/tool downloads remain Neovim-owned. Managed edits/deletions are restored on sync; retain caches and private hooks.
- **Pi:** [Pi settings migration and resource controls](pi/README.md). Direct agents/extensions/themes/instructions have a separate explicit inventory; personal additions remain untouched. Managed assets and JSON defaults are enforced; unsafe directory/path conflicts still stop Pi safely. Selected Pi installs a missing CLI with `bun add --global --ignore-scripts @earendil-works/pi-coding-agent`; existing CLI is retained in no-upgrade mode, otherwise that command can upgrade it. This is not a reproducible version lock. After settings sync, the installed Pi package-manager API reconciles configured packages (including missing pinned versions) before success is reported; failures fail the Pi component. No-upgrade suppresses optional package refreshes, not missing-package installation or npm version-constraint repair. Restart/reload Pi to load the resources. `--pi-migrate-from` imports only the explicitly named checkout. Omit Pi with `--components` to skip managing its local assets for that invocation, or add Pi-native controls for resources not defined by the repo. Keep personal instruction composition explicit.
- **Skills:** [`AGENTS.md` routes the rig skills](pi/.pi/agent/AGENTS.md#3-route-the-task-to-a-skill) from requirements and diagnosis through design, implementation, migration, testing and measurement. See the [skill inventory](pi/README.md#rig-skills) for when each applies. The 57 vendored pstack skills stay archived in `pi/disabled-skills/`, outside discovery and deployment. Full Pi sync backs up and removes their exact files from home; unlisted personal files and package skills remain supported. The empty root skills lock does not control these files.
- **AeroSpace:** config and executable helpers are copied; changed configuration is validated and reloaded if the app is running. Missing CLI/stopped app defers activation; a failed/deferred reload is retried on the next sync. Competing configs, foreign links, custom active config overrides, and non-default `XDG_CONFIG_HOME` fail with guidance. Sync never starts the app or auto-grid. See [AeroSpace](aerospace/README.md).
- **Lazysql:** shared `config.example.toml` is updated in `~/Library/Application Support/lazysql/`. A missing `config.toml` is seeded from it; an existing active config is private and never overwritten, so database connections and credentials survive. Later shared-default changes are available in the example for manual adoption.
- **macOS:** `macos/defaults.sh` applies the shared Dock, Finder, keyboard, hot-corner and appearance preferences. Sync does not kill/restart Finder or Dock; some changes require logout/restart. Preview lists this action without running `defaults`.

Paths under `.config` respect `XDG_CONFIG_HOME` (default `~/.config`), except AeroSpace requires that default because its bindings use HOME-based helper paths. Zsh and Pi keep their existing HOME-based contracts. Private hooks may still override behavior at application runtime; sync enforces deployed files, not application behavior or project-local configuration. Do not delete private state/history to reset settings.

## Brew controls

[Brew controls](brew/README.md) persist native skip variables, optional private Brewfile and the no-upgrade choice in `~/.local/state/rig/orchestration/settings.json`; these preferences persist independently of the invocation-only component selection. No separate Bun self-upgrade bypasses them. The selected Pi CLI follows the same upgrade preference, but is not a Brew formula and does not inherit formula-specific skips; omit Pi with `--components` to avoid CLI installation/updates for that invocation.

## Validation

Use existing repository checks. Sync without preview is a live command. Preview can identify missing prerequisites and conflicts; it does not verify application startup, network installs or installed-version compatibility.
