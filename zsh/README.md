# Zsh customization

The deployed `.zshrc` is shared read-only source. Keep private code outside rig:

- `~/.zshrc.pre`: optional readable script sourced after default autocomplete styles and before autocomplete/highlighting initialization. Use it for plugin initialization variables and styles; shell defaults and plugin download/bootstrap have already run.
- `~/.zshrc.local`: existing private hook, now the final source after Bun completion. Use it for aliases, bindings, PATH and ordinary overrides.
- `~/.zsh/functions.zsh`: existing private functions hook, loaded before lazy runtime helpers and the final local hook.

These scripts execute as shell code. Deployment must preserve them and must not blindly source or rename a previous user `.zshrc` into either hook; ambiguous migration requires an explicit choice. Hooks are not created by this component. Paths intentionally retain the existing HOME-based contract (not ZDOTDIR).

Updates change shared defaults only. Private final assignments usually replace earlier values, but plugins can install later callbacks and additive shell state does not universally reset. The pre-hook does not disable bootstrap downloads. To stop using the shared configuration, detach the shared `.zshrc` through the deployment workflow and retain your private files. Remove a private override to restore the shared default on the next shell start. No automatic plugin removal is performed.
