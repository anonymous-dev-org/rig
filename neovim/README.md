# Neovim customization

Sync restores the managed files in `stdpath('config')`, backing up replaced edits. Keep additions in a separate user-owned directory at `stdpath('config') .. '-local'` (normally `~/.config/nvim-local`; respects XDG_CONFIG_HOME and NVIM_APPNAME). Deployment must not link or replace this directory. Do not blindly source an old init.lua: executable migration requires an explicit user choice.

Startup order:

1. The private runtime directory is prepended to runtimepath and its `after/` directory appended. Optional `pre.lua` is executed before MiniDeps setup and before shared plugin scripts. Use this for plugin globals and opt-outs.
2. Shared `plugin/10_options.lua` through `40_plugins.lua` load via Neovim's normal runtime convention. Private `plugin/` scripts are also native runtime scripts; they are not a guaranteed final override.
3. Shared `plugin/99_private.lua` queues optional private `deferred.lua` using `MiniDeps.later`, after callbacks queued by the shared scripts. Use this to reconfigure managed modules or mappings after their setup.
4. Private `after/ftplugin/`, `after/lsp/`, snippets and other runtime resources use Neovim/plugin-native lookup semantics. For filetype overrides follow `:help ftplugin-overrule` (including undo behavior); LSP resources require Neovim 0.11+.

The installed MiniDeps implementation drains its FIFO later callback queue one callback per timer tick; a plain `vim.schedule` or synchronous after/plugin script does **not** establish order after that queue. `deferred.lua` is ordered after the callbacks initially queued by rig, not all future nested callbacks, downloads, FileType events or plugin timers. It may run even if an earlier setup callback failed. Private runtime files can shadow same-named modules; avoid shared filenames unless intentionally replacing them.

## Opt-outs before setup

In private `pre.lua`:

```lua
vim.g.rig_mini = false          -- Skip shared plugin/30_mini.lua setup
vim.g.rig_plugins = false       -- Skip shared plugin/40_plugins.lua setup
vim.g.rig_autocommands = false  -- Skip Config.new_autocmd rules and MiniMisc auto behaviors
```

Omit flags to retain defaults. These are coarse file-level controls, not a second plugin manager. MiniDeps itself still bootstraps; third-party plugin files already installed in native start packages may still load. Skipping setup does not delete plugin data, caches, tools or history. Mappings that invoke a disabled plugin must be replaced/removed privately. `rig_autocommands` covers rig's explicit rules and MiniMisc root/cursor/terminal setup, not autocommands internal to other enabled plugin setup calls (including format-on-save). Disable the owning setup file and configure selected plugins privately when you need to prevent those side effects entirely.

Every sync restores managed edits/deletions. Unlisted private files remain untouched. Remove private overrides/flags to reset on the next startup; deselect Neovim before detaching the shared configuration to disable it entirely. Plugin/tool installation and MiniDeps updates are separate from repository updates and can perform downloads during normal startup; this change does not run Neovim or install anything during migration.
