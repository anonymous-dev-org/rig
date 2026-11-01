## Goal and scope
- Resolve the local Pi config conflict without losing settings.
- Report real Stow failures in update.sh.

## Excluded
- General automatic conflict resolution or unrelated config changes.

## Implementation details
- Identical local/repository subagent config confirmed with diff.
- Back up the local file under ignored .local/, then link to the main checkout copy.
- Remove stderr suppression and stop update.sh on Stow failure.
- Get coding-partner review; run shell syntax and Stow simulation checks.

## Requirements list and tracking
- [x] Local config preserved and Pi restow succeeds. Backup: .local/pi-stow-backup.67xmDv/config.json in main checkout; Stow created its relative link.
- [x] Stow errors remain visible and failed updates exit unsuccessfully.
- [x] Review and existing checks complete. bash -n, git diff --check, and Stow simulation passed; coding-partner final review found no blocking issues.
- Existing limitation: pre-Stow cleanup can remove matching absolute links before a later conflict aborts; unchanged and outside scope. A follow-up could revisit cleanup safety.
