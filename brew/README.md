# Homebrew controls

The shared `Brewfile` remains the default package list. Every sync uses the same orchestration and persisted controls; there is no `brew cleanup` or unconditional `bun upgrade`. The selected Pi CLI is installed/updated separately with Bun, respecting the same persisted upgrade preference.

```sh
HOMEBREW_BUNDLE_BREW_SKIP='go nvm' \
HOMEBREW_BUNDLE_CASK_SKIP='notion-calendar' \
  ./sync.sh --brew-no-upgrade --brewfile "$HOME/.config/rig/Brewfile" --preview
# Repeat without --preview to save and apply.
```

Use Homebrew's native `HOMEBREW_BUNDLE_*_SKIP` variables (space-separated names as documented by Homebrew). Values present in the invoking environment replace that key in private orchestration settings and persist for subsequent runs. Set a variable to an empty string to clear its exclusions. Native controls apply to both the shared and optional private Brewfile. Exact formula/cask names and dependency behavior remain Homebrew's responsibility. A skipped optional package can still be installed as another package's dependency.

`--brew-no-upgrade` persists Bundle's `--no-upgrade` mode: install missing packages without upgrading existing ones. `--brew-upgrade` restores the normal Bundle behavior. For selected Pi, no-upgrade retains an existing CLI but still installs a missing CLI using `bun add --global --ignore-scripts @earendil-works/pi-coding-agent`. Deselection is the explicit opt-out from Pi CLI installation/update; formula-specific skips do not apply to this Bun package. Homebrew pins remain Homebrew-owned (`brew pin` / `brew unpin`); neither Brew nor this unversioned Pi command is a reproducible version lock.

The optional private Brewfile must already exist outside the checkout. Both files are processed independently; either may partially succeed. Brewfiles are executable Homebrew input: only choose a file you trust. To remove the private file setting, remove the `brew.file` property from `~/.local/state/rig/orchestration/settings.json` while no rig process is running. Keep private state permissions restrictive. Preview lists commands and skip controls without running Brew.

Homebrew must already be available on the parent PATH. Rig intentionally does not download/run an installer inside config deployment. `brew/install-brew.sh` is a compatibility entrypoint for `sync.sh --components brew`: it replaces the complete selection with Brew only. Prefer the top-level entrypoint with the full desired selection.

Deselecting Brew leaves installed packages alone. Removed defaults stop receiving management; no automatic uninstall or cleanup occurs.
