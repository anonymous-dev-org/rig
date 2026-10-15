# Fix update.sh Bun compatibility

Goal: Update Pi without the unsupported Bun global lockfile warning and print the update heading once.

Expected outcome: The update script uses a compatible Bun before installing Pi, preserves --ignore-scripts, and retains pull/re-exec and configuration updates.

## Actions
1. done — Inspect update flow and Bun behavior; identify minimal safe fix. Complete when cause and approach are confirmed.
2. done — Fix runtime compatibility and duplicate heading in update.sh. Complete when changes are narrow and preserve existing behavior.
3. done — Manually exercise the finished update workflow and review diff. Complete when no lockfile warning appears, heading prints once, and no unintended changes exist.

## Publication actions
1. in progress — Review and commit the verified fix.
2. pending — Push branch and open a GitHub pull request.
3. pending — Merge pull request into main after checking merge readiness.
4. pending — Pull origin/main in original checkout and verify fix is present.

## Definition of done
- Unsupported lockfile is handled without deleting users' global lockfiles.
- Pi installation still disables lifecycle scripts.
- Heading prints once across pull/re-exec.
- Manual validation recorded; no automated tests or fixtures added or run.

## Validation / blockers
- main pulled from origin/main; isolated branch fix/update-lockfile in .local/worktrees/fix-update-lockfile.
- Installed standalone Bun is 1.3.14 and shadows Homebrew Bun 1.4.3; global lockfile is currently version 1 after the reported install.
- Implemented upgrade of the selected Bun before global install; Homebrew binaries are identified by their resolved executable path. Duplicate heading removed from re-exec path.
- Manual validation used an isolated home and copy of Bun 1.3.14. Script upgraded that copy to 1.4.3, installed Pi with lifecycle scripts blocked, and generated a version 2 lockfile. Subsequent run read that lockfile without warnings, updated all seven packages, compiled four Swift apps, and reached Done (exit 0).
- Temporary-home setup initially exposed existing prerequisites: Aerospace scripts directory must exist and Pi settings reject /tmp's symlink ancestor. Created the directory and used the physical /private/tmp path; no unrelated code changes made.
- bash -n and git diff --check passed. Pull/re-exec heading behavior reviewed directly; validation invoked --after-pull to avoid changing branch/upstream configuration.
- Live Bun, global packages, and home configuration links were not modified. Homebrew upgrade branch reviewed against actual resolved /opt/homebrew/Cellar/bun/1.4.3/bin/bun path but not executed.
