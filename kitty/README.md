# Kitty customization

Keep the shared `kitty.conf`, theme and open-actions files read-only. Create a private `local.conf` beside the deployed `kitty.conf` (normally `~/.config/kitty/local.conf`, respecting Kitty's selected config directory). The final `globinclude local.conf` uses Kitty's native glob include: no matching file is permitted. Relative includes resolve beside the configuration file. Deployment must leave this private file and existing configurations untouched until adoption is explicitly resolved.

Later scalar settings replace earlier values. Mappings are native Kitty mappings, not a universal last-wins text merge: use `map <shortcut> no_op` to disable a binding; `clear_all_shortcuts yes` discards prior mappings when a full replacement is intended. Other additive directives keep Kitty's own semantics. See https://sw.kovidgoyal.net/kitty/conf/ for include and mapping semantics.

Updates replace only shared source. Edit `local.conf` for private overrides, remove an override to reset it, and reload Kitty configuration explicitly when ready. Disable shared configuration through the deployment workflow without deleting the private file. This component neither starts Kitty nor migrates/executes old configuration.
