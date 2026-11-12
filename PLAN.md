## Overview
- Enforce repo-managed configuration on every sync. Users may add local settings but cannot remove or replace repo-defined settings through sync.
- JSON keeps local-only keys; repo arrays are atomic because argv/order matters. Pi packages retain additional identities, but repo pins/filters win. Other managed files restore repo bytes with backups; additions belong in separate local files/hooks. Runtime overrides are not policed.
- Keep selection controls, foreign-link refusal, concurrent-edit checks, recovery and manual-only components unchanged. No new verification artifacts.
- Preserve concurrent main changes removing Pi Lens/billion-context defaults and enabling native compaction. Previously configured packages remain local additions; no uninstall.
- Verified: existing Pi suite 41/43 passes; unchanged baseline failures expect obsolete `--headless` and absent `init.sh`. Syntax/diff checks pass; diagnostics match two existing warnings.
- Limit: existing tests do not directly cover every new enforcement path; manual and independent review used. New tests excluded by project instructions.

## Todos
- [x] Goal: JSON sync restores repo fields and entries.
  - Requirements: settings/MCP and copied JSON keep local-only keys and extra package identities; repo values win; deleted keys/files return; validate before writing.
  - Definition of done: manual and independent review plus existing checks, baseline failures distinguished.
  - Scope: sync policy, not package uninstallation or runtime policing.
  - Review fix: enforced recovery handles a deleted destination before applying current defaults; preserve-mode guards unchanged.
- [x] Goal: managed assets restore safely on sync.
  - Requirements: backups before replacement, restore deletions, enforce during known-link migration, retain unknown files, reject foreign links.
  - Definition of done: deployment paths independently reviewed; existing checks run.
  - Scope: explicit selected inventories only; manual components excluded.
- [x] Goal: docs explain enforced configuration and additions.
  - Requirements: remove conflicting opt-out/personal-wins guidance; explain backups, atomic arrays, restart and private hooks.
  - Definition of done: independent review complete; limits recorded; concurrent main removal retained.
  - Scope: affected sync/config docs only.
