# Global pi browser automation and private-config migration

Status: approved; action 1 committed as `b60836d`; action 2 validated and reviewed, ready for commit. Supersedes the project-only plan. No package installation or private-data migration has occurred.

## Agreement

Rig tracks credential-free defaults and shared pi resources. Effective pi settings, MCP servers/credentials, sync recovery records, and migration backups live only outside rig under the user's home configuration/state directories. Add globally available Playwright MCP using an isolated headless browser. Preserve existing personal configuration and overrides. Scope covers pi settings and MCP, not unrelated packages such as lazysql.

Worktree: `.local/worktrees/browser-automation` relative to the main rig checkout.
Branch: `setup/browser-automation`; baseline `5d01806`; main refreshed from origin/main before worktree creation; `.local/` verified ignored.

## Verified inputs and decisions

- Installed pi 1.2.0 supports MCP natively; no adapter/package change to settings defaults is required. Global configuration is `~/.pi/agent/mcp.json`, independent of session cwd. Sources: https://pi.dev/docs/latest/mcp and installed `dist/extensions/mcp/config.js`.
- Current metadata only (private contents not inspected): home settings is a relative symlink to the main checkout's ignored `pi/.pi/agent/settings.json`; legacy `.local/pi-settings/` contains `baseline.json`; home MCP is an ordinary file.
- Existing `pi/sync-settings.mjs` has reusable three-way `merge()` and transaction recovery, but its current ownership model moves private files into rig. Refactor that engine rather than adding a second transaction engine.
- Home destinations: ordinary `~/.pi/agent/settings.json` and `~/.pi/agent/mcp.json`. Private state/backups: `~/.local/state/rig/pi/`, with separate settings/MCP state and migration records. Nothing private is staged inside any rig worktree.
- Preserve settings' existing first-adoption policy when history is absent. MCP first adoption recursively fills only missing defaults, retaining existing values. `merge({}, local, defaults)` alone does NOT add missing nested servers reliably; test this explicitly. Subsequent sync uses historical three-way merge, preserving deliberate deletions and treating arrays atomically.
- Playwright baseline: server `playwright`, command `npx`, args `-y`, `@playwright/mcp@latest`, `--isolated`, `--headless`. Source: https://github.com/microsoft/playwright-mcp. Latest follows upstream setup but is not a reproducible pin. Package fetching/cache is allowed during the approved smoke test. Profile isolation is not an OS/network sandbox.
- Do not read private config into tool output, logs, subagent prompts, or tracked test fixtures. Tests use synthetic temporary homes/checkouts. No broad init/update execution, unrelated stowing, Git-history rewrite, merge, push, or merge request is authorized here.

## Ordered actions

### 1. Refactor synchronization to ordinary home files — done

Goal: establish one shared, safe home-file sync engine without changing settings merge semantics.

Dependencies: approval of this complete revised plan.

Files: `pi/sync-settings.mjs`, `pi/sync-settings.test.mjs`, `PLAN.md`.

Inputs: existing merge/recovery implementation and tests; destination/state policy above.

Operation: parameterize the existing transaction engine for a public baseline, ordinary effective file, and external state directory. Retain settings exports/semantics where useful; no generic framework or duplicated engine. Add recursive fill-missing defaults for explicit MCP adoption. Use atomic publication and private modes (files 0600, newly created private directories 0700), validate paths/recovery records before mutation, reject unexpected symlinks and outputs resolving into source/legacy checkouts, and keep temporaries on the appropriate filesystem. Add a fail-closed exclusive lock for rig sync invocations; never steal a stale lock automatically. Detect source/destination edits before publication rather than overwriting them. Settings and MCP are separate recoverable transactions, not a claimed two-file atomic transaction.

Checks: synthetic tests cover unchanged existing merge cases, ordinary-file ownership, first adoption with nested personal MCP servers and missing Playwright, collisions/overrides, subsequent updates and deliberate deletions, special JSON keys, idempotence, interruption before/after publication, later user edits during recovery, invalid input/content-free errors, permissions, redirected paths/symlinks, and lock contention. Existing tests pass or are adapted explicitly to the new ownership contract. Parent verification, independent read-only review, diff checks, recorded evidence, and commit required before action 2. Do not run new code against actual home yet.

Action 1 evidence: initial review findings were fixed with immutable preparing/ready recovery intent, captured-input guards, stable recovery ancestors, and state-directory trust checks. Parent reran all 20 synthetic tests successfully; `git diff --check` passed. Independent re-review: OK with notes, no remaining P1/P2 findings. Tests inject filesystem publication/fsync failures and concurrent edits; they do not prove physical power-loss guarantees or atomic compare-and-swap against arbitrary editors. Additional ready-journal/post-rename and same-byte replacement cases are optional follow-up coverage. No real private configuration accessed or changed. Included in this action's commit.

### 2. Implement resumable legacy settings migration — done

Goal: move existing private settings and recovery state out of the main checkout without losing configuration or historical merge state.

Dependencies: action 1 reviewed and committed.

Files: `pi/sync-settings.mjs`, `pi/sync-settings.test.mjs`, `PLAN.md`.

Inputs: explicit legacy checkout path via `--migrate-from <main-checkout>`; only expected legacy files/settings transaction records are eligible.

Operation: stage verified copies under the external private state root, never in the worktree. Accept an existing home settings symlink only when it resolves exactly to the explicitly supplied legacy settings file. Reject differing ordinary copies, unexpected links, conflicting external state, and malformed recovery records. Preserve all recognized legacy recovery inputs; recover pending transactions against external copies with the same engine after validating/translating their recorded paths. Publish ordinary home settings and state safely; durable phase records distinguish committed publication from unfinished staging and preserve later user edits on retry. Remove only individually validated legacy private files/state after verified external publication, retaining a private external recovery snapshot/receipt. No recursive deletion of unvalidated directories. Existing unusual MCP symlinks/copies fail with migration guidance rather than being silently imported.

Checks: synthetic tests for current relative-symlink migration, ordinary-file conflicts, baseline retention/deletion semantics, legacy pending/prepared recovery, interruption at migration boundaries, retries after later home edits, unexpected files/paths, permissions, cleanup only after verification, and private sentinel values remaining outside simulated checkout. Review, full focused test suite, evidence, and commit before action 3. No actual-home migration yet.

Action 2 evidence: parent reran all 33 synthetic tests and `git diff --check` successfully. Independent review found one partial-cleanup retry issue for legacy non-fresh pending transactions; fixed with phase-aware validation and a prepared/consumed regression preserving later home edits. Focused re-review: OK, no remaining findings. Migration retains verified external snapshots, translates legacy recovery through the shared engine, and performs identity-checked individual cleanup. No actual-home migration/private-config access occurred. Included in this action's commit.

### 3. Wire credential-free global MCP defaults into rig — pending

Goal: make normal rig sync apply both public baselines without Stow taking ownership of private files.

Dependencies: action 2 reviewed and committed.

Files: new `pi/.pi/agent/mcp.example.json`; `.gitignore`; `pi/.stow-local-ignore`; `init.sh`; `update.sh`; `pi/sync-settings.mjs`; `pi/sync-settings.test.mjs`; new `pi/README.md`; `PLAN.md`. Keep `settings.example.json` unchanged unless a directly verified correction is required within this agreement.

Operation: add the public Playwright baseline and allowlist it in Git. Narrow sync entrypoint processes settings and MCP under the shared lock, prevalidating both before changes. Integrate it with existing Pi preparation. Protect live settings/MCP paths from BOTH pre-Stow cleanup loops before destructive logic, and exclude private config, templates, README, and sync tooling from Stow. Keep other shared pi resources and packages unchanged. Document global availability, local overrides, env-variable references for keys, reload/restart, recovery/stale-lock procedure, npm caching, isolated-browser limitations, and the requirement not to run old main-checkout sync scripts after migration.

Checks: synthetic-HOME integration tests exercise Pi preparation and cleanup/Stow exclusions without executing npm-global installs, brew, git pull, or unrelated scripts. Verify existing home settings/MCP files survive even with stale ignored checkout copies, helpers/templates are not linked, and no effective config/state is produced in a checkout. Run `node --test pi/sync-settings.test.mjs`, `bash -n init.sh update.sh`, JSON parsing, diff/secret-output checks, independent review, and commit before action 4.

### 4. Activate private migration and test browser automation — pending

Goal: safely activate the narrow home-config sync on this machine and prove browser backend operation.

Dependencies: actions 1–3 reviewed, validated, and committed. Actual private migration is specifically authorized only by approval of this plan.

Files: private home settings/MCP/state and validated legacy ignored private files as described above; tracked changes limited to `PLAN.md` and usage corrections in `pi/README.md` if required.

Operation: recheck metadata and detect concurrent changes; run only the worktree's narrow entrypoint with explicit main-checkout migration source, not init/update/Stow. This is the sole exception to keeping changes inside the worktree: it migrates/removes the explicitly identified ignored private data in the main checkout and updates user-home configuration. Preserve unrelated personal servers/values without printing them. Verify ordinary file types, private modes, external state/receipt, verified legacy cleanup, and idempotent rerun using metadata/comparisons only. If unexpected copies, conflicts, concurrent writers, or unavailable access appear, stop affected activation and report without weakening safeguards.

Then load global MCP configuration through installed pi code without connecting unrelated servers, and connect only Playwright. Use runtime-discovered schemas to navigate to https://example.com, follow More information, verify destination, capture and visually inspect a screenshot at an external temporary path, and close client/browser. A disposable MCP SDK client outside rig is acceptable when the current session cannot reload tools. Check `isError` results. Use an available browser; browser/system installation, authentication, or unrelated runtime changes require stopping and reporting. No account actions.

Checks: migration/privacy checks and rerun pass; expected global server resolves independent of cwd; browser init/navigation/click/screenshot and cleanup pass; no private tracked/runtime artifacts. Record exact backend version, commands, bounded non-private evidence, screenshot location, reviewer result, and remaining limitations; commit reviewed evidence. Distinguish configuration/backend validation from end-to-end interactive pi testing if the latter was not exercised. Provide `/reload` or restart instructions.

## Delivery and limitations

- Every action includes tests, independent review, parent verification, plan updates, and its own commit before dependent work starts.
- Report branch/commits and activation status. Tracked changes remain on the isolated branch; do not merge/push automatically.
- After activation, old main-checkout init/update/sync code must NOT run until these tracked changes are integrated; it can recreate private checkout files. Use the new narrow worktree entrypoint meanwhile.
- Migration does not guarantee secure erasure, removal from backups/snapshots, or cleansing old Git history. Scope does not audit arbitrary historical secrets or migrate unrelated rig packages.
- Locks serialize rig syncs, not arbitrary editors or pi writes; changed-file detection fails closed. Recovery backups contain private data and remain only under the private external state root.
