# Pstack Pi adapter

This package exports only `/skill:pstack`. Its entry reads the Pi harness before
upstream poteto-mode. Upstream skills remain internal files, not 58 extra commands.
No extension, runner, dependency, install hook or settings mutation is included.

## Install as a local Pi package

Run Pi's native package command with the absolute path to this checkout:

```sh
pi install /absolute/path/to/rig/pi/packages/pstack
```

Use `/reload` in an existing session or restart Pi, then invoke the entry:

```text
/skill:pstack investigate why the build fails
/skill:pstack verify the current changes
```

This is a local source, not a copied or registry-published package. Keep the
checkout at that location while installed; moving or deleting it breaks the
source. To remove it, use the exact source used for installation:

```sh
pi remove /absolute/path/to/rig/pi/packages/pstack
```

Reload or restart after removal. There is no `pstack on` / `pstack off` command
yet. Installation and removal use Pi's package management, not rig's settings
sync. Init/update do not install this package, and Stow excludes it.

## Alternative: try without installing

From a trusted project, use an absolute package path for one invocation:

```sh
pi -e /absolute/path/to/rig/pi/packages/pstack
```

Then enter `/skill:pstack <task>`. Pi documents `-e` as a temporary package load;
this does not add the package to user settings. To isolate the entry from other
skills during a journey, use `--no-skills --skill
/absolute/path/to/rig/pi/packages/pstack/skills/pstack/SKILL.md` instead. Do not
point `--skill` at the upstream directory. Project trust and other host resources
still apply. This package is excluded from Stow and never installed automatically.

## Source and license

`upstream/` is the complete, unchanged `pstack/` subtree from
<https://github.com/cursor/plugins> at commit
`4dd1d05818d19792e7cd6e818f1667f95f7e1dbe`.
It includes 573 files, 58 primary skill entries (plus three automation skill
entries), all assets, personas, docs, scripts,
automations and the upstream MIT license at `upstream/LICENSE`.
Nothing is omitted. `provenance.json` records every file's SHA256. The retained
host-specific scripts are reference material, not supported Pi executables.

To reproduce the snapshot from an already available clone at that commit, verify
its HEAD and clean subtree, then copy `pstack/` in full to `upstream/`. Compare it
against `provenance.json` with the check below. Do not regenerate the hashes to
hide a mismatch. Upgrades require explicit review of the new pin and adapter.

## Offline integrity and runtime journeys

```sh
node pi/packages/pstack/checks/check.mjs
```

The check needs only Node's standard library. It validates file inventory, hashes,
pin, license presence and the one-entry manifest. This is static packaging
integrity, not proof that a model follows the adapter or tools work.

`journeys/investigation.json` and `journeys/verification.json` contain manual
runtime prompts and expected observations. Run each in a fresh Pi session loaded
as above. Replace `<ABSOLUTE_PACKAGE_ROOT>` in the verification prompt. Preserve
the transcript and actual tool results. For investigation, compare Git status and
diff before/after and inspect any child's brief, actual model, report and gates.
For verification, require an actual offline check result and an overall incomplete
verdict for the unavailable REQUIRED Java/TLC gate, even though packaging passes.
The optional bot UI can be skipped. A static fixture check is not a journey run.

## Limits

Read `docs/harness/pi.md` for authoritative translations. Delegation uses installed
pi-subagents discovery and guide, authored against 0.78.0; no agent profiles are
created. Models must be actual discovered provider/id values; lost model diversity
must be disclosed. Prompt read-only constraints and Git worktrees are not security
sandboxes. No transcript consumer is ported; history-dependent work needs confirmed
active session and leaf or a host active-branch projection, never newest-file
selection. setup-pstack only proposes a session-local role table, never writes
Cursor or host settings.

Automations, bot UI, mutable Bun script directories, Java/TLC/mise/network formal
tooling and upstream transcript consumers are deferred. Missing REQUIRED evidence
blocks completion; optional convenience skips cannot replace it. No automatic
installs, persistence, PR actions or network services are provided.
