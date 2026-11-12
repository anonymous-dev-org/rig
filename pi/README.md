# Global Pi configuration

Pi 1.2 supports MCP natively: no adapter package is needed. Rig's public
`settings.example.json` and `mcp.example.json` are defaults, not effective files.
Run the narrow command from any working directory (use an absolute script path):

```sh
node /path/to/rig/pi/sync-settings.mjs
```

It creates ordinary private `~/.pi/agent/settings.json` and `mcp.json` files,
with history and recovery records under `~/.local/state/rig/pi/`, never in rig.
`./sync.sh` calls this same command for selected Pi. An explicit asset list excludes
private configs, templates, repository docs, sync tooling and browser captures from
deployment. Disabled skills are retained in the repo and are not deployed.
Direct principle skills, agents, extensions, themes and instructions are managed local copies. Every full sync restores repo bytes, including edits and deletions, with private backups of replaced files. Add personal resources in separate files outside the managed inventory. Managed JSON assets use the additive ownership policy below.
Pi's built-in auto-compaction is enabled by default (`"compaction": {"enabled": true}`),
using Pi's default token thresholds. Manual `/compact` remains available.
Pi Lens and billion-context are no longer default packages, and rig no longer
deploys their configuration files. This removes their tools and instructions from
new sessions using the defaults.

JSON sync restores `compaction.enabled` to `true`, including on existing installs.
JSON sync removes previously repo-owned package identities absent from current
defaults, even if their pins or filters changed locally. Pi Lens, billion-context
and Ponytail declarations are explicitly retired even without prior sync history.
Full Pi sync also backs up and removes the old managed Pi Lens and billion-context
configuration files. Downloaded package caches are not uninstalled. Restart Pi
afterward; start a new session for a clean comparison of startup token usage.

Every sync enforces both templates, with or without prior history. Repository
keys win recursively, including changed/deleted values; local-only keys and
additional MCP servers remain. Arrays are replaced as a whole by repo arrays,
not concatenated, because commands and argument order must remain valid.
Pi's `packages` list is special: repository declarations come first and win by
package identity; additional personal package identities remain. Local pins,
filters and deletions cannot replace or disable a repo package declaration.
Ambiguous duplicate identities stop sync before publication. Previous repo
baselines identify removed fields and package identities, which are retired rather
than kept as additions. Removing a repo-owned JSON object also removes local
customizations inside it; unrelated local keys remain. Without previous baselines,
only explicitly known retirements are removed.
Add personal keys/packages to home files, not the templates. Existing recovery
journals finish safely before a fresh enforcement pass applies current defaults. Keep secrets out of rig; use Pi's environment
variable references (for example `${SERVICE_API_KEY}` in server `env` values),
and supply those variables in Pi's environment rather than committing credentials.

Pi package installs use Bun through `"npmCommand": ["bun"]`. The `npm:`
package prefixes identify registry sources and remain unchanged. Node.js is still
required to run Pi. After JSON sync, every full sync uses the selected Pi installation's
public package-manager API to install missing packages, including pinned versions,
and report installation failures as a failed Pi component. They then update packages
unless `--brew-no-upgrade` is selected. No-upgrade retains compatible installed
versions, but still installs missing packages and repairs npm versions that do not
match their configured constraint. Pi owns downloading, source parsing and resource
discovery; rig does not implement another package installer.

Reconciliation reads the effective private settings without rewriting them and ignores
project settings. Repository packages are restored by the preceding JSON sync;
local-only package declarations and their filters remain intact.
`PI_OFFLINE` must be disabled, and `PI_CODING_AGENT_DIR` must be unset or point to
`~/.pi/agent`, where rig deploys its configuration. A retained Pi executable must
expose the public Node/Bun package API; unsupported wrappers fail with guidance.
Preview only describes these actions. The narrow `sync-settings.mjs` command remains
JSON-only. Restart/reload Pi after sync to load the installed resources.

Package-provided prompts and skills arrive through the declared packages.
The 24 `principle-*` [pstack skills](vendor/pstack/README.md) remain active in
`pi/.pi/agent/skills/` and deploy with Pi. Their upstream
`disable-model-invocation: true` flags remain unchanged: invoke them explicitly
with `/skill:principle-<name>`. The other 33 skills and their supporting
files are retained in `pi/disabled-skills/`, outside Pi's discovery folders.
Full Pi sync backs up and removes the exact archived files from
`~/.pi/agent/skills/`, including older installs without ownership history. Unlisted
personal files are untouched; skill directories may remain empty. The former
`bro/SKILL.md` is also retired because its rules now live in `AGENTS.md`. The narrow
JSON command does not retire skill files. To re-enable archived skills, restore
their folders to `pi/.pi/agent/skills/`; its deployment inventory is built from
that active directory.
The empty root skills lock does not control these files. Rig has no standalone
prompt inventory. Resources from another user's home are not copied.

Cursor-specific commands, models, paths and external dependencies in the archived
skills are not ported or installed. Ponytail is no longer a default package;
its former repo declaration is removed by JSON sync.

Pi package object filters (`skills`, `extensions`, `prompts`, or `themes`) may
customize additional personal package declarations. Repo package declarations,
repo-defined agent controls and the managed theme are restored on sync; they
cannot be opted out through edits to managed settings. Keep personal instructions
and resources in separate unlisted files. Deselect Pi to stop future management;
this does not remove installed resources or disable already active configuration.
Application/project-local controls may still change runtime behavior; rig does not
police them.

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

## Goal reminder

The `goal-reminder.ts` extension adds a short instruction every 20 model calls:
step back and ask the two questions from section 1 of `AGENTS.md` (does this
move the goal forward, and is it the simplest thing that meets the current
requirements). If yes, the agent carries on; if it has drifted, it returns to
the goal or takes the simpler route. The check is private: the agent should not
stop, ask the user, or mention it.
Change `REMINDER_INTERVAL` in the extension to adjust the cadence. Calls are counted
from extension load, so `/reload` or a restart resets the counter; the first reminder
is on call 20. It uses Pi's `context_with_system` hook without adding saved conversation messages
or starting extra turns. Pi handles the provider's system/developer role mapping;
providers without mid-conversation system messages fold it into the leading prompt.
An extension that forces a replacement `before_agent_start.systemPrompt` can remove
the reminder. This is advisory, not enforcement or a separate goal tracker.

Rig sync deploys it to `~/.pi/agent/extensions/goal-reminder.ts` when Pi is
selected; the JSON-only `sync-settings.mjs` command does not deploy extensions.
After deployment, use `/reload` or restart Pi to activate it.

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

After migration, **do not run old main-checkout deployment scripts** until
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
