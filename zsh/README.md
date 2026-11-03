# Zsh customization

Edit the ordinary local `.zshrc` directly. These existing private hooks are optional:

- `~/.zshrc.pre`: optional readable script sourced after default autocomplete styles and before autocomplete/highlighting initialization. Use it for plugin initialization variables and styles; shell defaults and plugin download/bootstrap have already run.
- `~/.zshrc.local`: existing private hook, now the final source after Bun completion. Use it for aliases, bindings, PATH and ordinary overrides.
- `~/.zsh/functions.zsh`: existing private functions hook, loaded before lazy runtime helpers and the final local hook.

These scripts execute as shell code. Deployment must preserve them and must not blindly source or rename a previous user `.zshrc` into either hook; ambiguous migration requires an explicit choice. Hooks are not created by this component. Paths intentionally retain the existing HOME-based contract (not ZDOTDIR).

Updates refresh unchanged local copies; customized copies stay intact with a reported source path for manual default adoption. Private final assignments usually replace earlier values, but plugins can install later callbacks and additive shell state does not universally reset. The pre-hook does not disable bootstrap downloads. To stop using the shared configuration, edit or remove the local `.zshrc` and retain your private files. Remove a private override to restore the shared default on the next shell start. No automatic plugin removal is performed.
