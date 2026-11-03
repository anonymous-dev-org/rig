# Global Pi configuration

Pi 1.2 supports MCP natively: no adapter package is needed. Rig's public
`settings.example.json` and `mcp.example.json` are defaults, not effective files.
Run the narrow command from any working directory (use an absolute script path):

```sh
node /path/to/rig/pi/sync-settings.mjs
```

It creates ordinary private `~/.pi/agent/settings.json` and `mcp.json` files,
with history and recovery records under `~/.local/state/rig/pi/`, never in rig.
Init/update call this same command for selected Pi. An explicit asset list excludes
private configs, templates, docs, sync tooling and browser captures from deployment.
Direct agents, extensions, themes and instructions are ordinary local copies: edit them locally. Unchanged copies update; customized copies stay intact and report the default source path for manual adoption. Recorded deletions remain opt-outs. This copy policy does not change the JSON sync described below.
Fresh homes bootstrap both defaults.
Existing settings without history gain missing defaults and missing packages,
while retaining personal values and package declarations. Existing MCP without
history recursively gains missing defaults, preserving personal servers and
overrides. Subsequent runs use three-way history: local overrides and deliberate
deletions survive default updates. Only the `packages` list merges by package
identity: versions update independently of personal resource filters, personal
pins and ordering survive, and removing a known package remains an opt-out.
Ambiguous duplicate identities stop sync before publication. Other arrays remain
atomic (a personal edit retains the whole list). Edit the home files, not the
templates, for personal changes. Keep secrets out of rig; use Pi's environment
variable references (for example `${SERVICE_API_KEY}` in server `env` values),
and supply those variables in Pi's environment rather than committing credentials.

Pi package installs use Bun through `"npmCommand": ["bun"]`. The `npm:`
package prefixes identify registry sources and remain unchanged. Node.js is still
required to run Pi. Pi resolves configured packages on startup/reload; rig does not
implement another package installer. Bundled skills arrive through those packages;
the empty root skills lock declares no separate skill installation.

To disable a bundled resource, use Pi's package object filters (`skills`,
`extensions`, `prompts`, or `themes`); an empty filter list disables that resource
kind. Keep the package `source` unchanged to continue receiving default version
updates. Direct home assets are separate: use extension exclusions for extensions,
`subagents.agentOverrides` for agents, and select a private theme in settings.
Keep personal `AGENTS.md` and subagent configuration user-owned; package filters do
not disable those files. Removing a personal scalar override resets it only after
explicitly restoring the desired current default; deletion of a tracked default
is otherwise preserved as an opt-out.

The global `playwright` server runs exactly:

```sh
bunx @playwright/mcp@latest --isolated
```

It is available independently of session cwd. Use `/reload` or restart Pi after
configuration changes. bunx may download the package and uses Bun's cache;
`@latest` follows upstream and is not a reproducible version pin. A browser must
already be available; this sync does not install packages or browsers. The browser opens visibly so you can sign in manually. Its isolated
profile does not preserve login sessions after closing; it is **not** an OS/network
security sandbox. Do not expose untrusted pages to privileged secrets casually.

## Explicit legacy migration

From this new worktree, explicitly name the **MAIN checkout**, not this worktree:

```sh
node /path/to/new-worktree/pi/sync-settings.mjs --migrate-from /path/to/main/rig
```

This validates recognized legacy settings/history, retains private external
snapshots and a receipt, publishes ordinary home settings, then removes only
verified legacy files. Unexpected checkout MCP copies or symlinks are not
imported: preserve them outside rig and manually reconcile the ordinary home MCP
before retrying. Normal sync refuses stale checkout settings/history and gives
migration guidance. Differing copies and unexpected links fail closed; do not
force Stow to adopt or delete them. No real migration is implied by adding these
tracked files.

After migration, **do not run old main-checkout init/update/sync scripts** until
these changes are integrated there: old scripts can recreate private checkout
files. Use the new worktree's narrow command meanwhile.

## Lock and recovery

One exclusive `~/.local/state/rig/pi/.rig-sync.lock` covers input prevalidation,
migration, both syncs and cleanup. Settings and MCP are separate recoverable
transactions, not a two-file atomic update. A later failure can leave the first
completed; fix the reported condition and rerun the same command. Recovery
records and backups contain private data; keep them outside every checkout.
Path safety assumes HOME and its existing ancestor directories are controlled by
and writable only by the user or trusted administrators. Symlink ancestors are
rejected, and the state root/direct state directories also receive ownership and
write-permission checks; ancestor ownership/permissions are not fully audited.
Changed files and unexpected links fail closed. The lock serializes rig commands,
not arbitrary editors or Pi writes: stop other writers while syncing.

A lock is never stolen automatically. After confirming no rig sync process is
running, inspect the external state and remove only a genuinely stale lock,
then rerun. Do not discard pending journals or migration receipts to bypass an
error. Backups do not imply secure erasure of old snapshots/history.
