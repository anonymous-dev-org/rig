# Lazysql private configuration

The template is `Library/Application Support/lazysql/config.example.toml`.
Publish it with Bun (the runtime must provide both `Bun.TOML.parse` and
`Bun.TOML.stringify`):

```sh
bun scripts/sync-toml.mjs lazysql --preview
bun scripts/sync-toml.mjs lazysql
```

The effective configuration is an ordinary, private file at
`${XDG_CONFIG_HOME:-$HOME/.config}/lazysql/config.toml`. History and byte-exact
private backups live in `~/.local/state/rig/toml/lazysql`, outside the checkout.
Do not Stow this component or put database credentials in the template.
Lazysql project-local configuration can override this global configuration;
its connection arrays replace rather than extend global arrays.

## Merge policy

First adoption preserves personal values and fills missing default keys.
Subsequent runs compare the prior defaults with the personal file: unchanged
values follow new defaults, personal edits and deletions survive, and unknown
keys are retained. Arrays (including database connections) are atomic. Editing
connections in Lazysql remains a personal edit, not a template edit. When both
the user and defaults change a value, the personal value wins.

Unchanged TOML bytes are retained. When values change, Bun serialization may
remove comments and change formatting; the publisher warns and saves original
bytes before publication. TOML dates/times, nonfinite numbers and any other
non-plain values fail closed before mutation rather than silently changing
types through JSON. No comment-preserving parser is provided.

## Legacy adoption and safety

The publisher recognizes only links to this checkout's
`lazysql/Library/Application Support/lazysql/config.toml`. It also considers that
ordinary checkout-local file and the old macOS
`~/Library/Application Support/lazysql/config.toml`. Different ordinary copies
are a conflict: reconcile them manually outside the checkout before retrying.
The explicit publish command authorizes this narrowly scoped migration. It
backs up the original bytes/link identities privately, publishes outside rig,
then removes only unchanged legacy inputs. Ordinary personal files at the new
destination remain personal inputs, never replaced by template-only defaults.
Foreign links, directory symlinks, aliased files and concurrent changes are
refused; no directory link is detached automatically.

A sibling prepared file plus a private intent journal makes publication
recoverable. Rerun the same command after an interrupted publication. A stale
`lock` requires manual inspection before removal; do not delete the journal or
prepared file to force a retry. A committed destination is never replayed over
later application edits. Legacy cleanup may complete on a subsequent run.

To stop management, deselect Lazysql in the outer setup/update workflow; the
personal file is not deleted. To reset a specific value, explicitly edit the
personal file to the corresponding current template value. No implicit reset
or credentials cleanup is performed.

The publisher does not launch Lazysql and does not promise application-level
schema validation. Development validation did not touch live configuration.
