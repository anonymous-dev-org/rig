# Zsh customization

Sync restores the managed `.zshrc` on every run, backing up replaced edits. Put additions in these existing private hooks:

- `~/.zshrc.pre`: optional readable script sourced after default autocomplete styles and before autocomplete/highlighting initialization. Use it for plugin initialization variables and styles; shell defaults and plugin download/bootstrap have already run.
- `~/.zshrc.local`: existing private hook, now the final source after Bun completion. Use it for aliases, bindings, PATH and ordinary overrides.
- `~/.zsh/functions.zsh`: existing private functions hook, loaded before lazy runtime helpers and the final local hook.

These scripts execute as shell code. Deployment must preserve them and must not blindly source or rename a previous user `.zshrc` into either hook; ambiguous migration requires an explicit choice. Hooks are not created by this component. Paths intentionally retain the existing HOME-based contract (not ZDOTDIR).

Managed edits and deletions are restored on sync; private hooks remain untouched. Private final assignments usually replace earlier values, but plugins can install later callbacks and additive shell state does not universally reset. The pre-hook does not disable bootstrap downloads. To stop management, deselect Zsh before detaching the local `.zshrc`; retain your private files. Remove a private override to restore the shared default on the next shell start. No automatic plugin removal is performed.
