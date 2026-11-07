# Goal
- Remove Ponytail from Rig defaults and local Pi; deploy all 58 imported pstack skills and supporting files.
- Preserve upstream content; exclude rewriting Cursor workflows or installing their external dependencies.

# Approach
- Include the complete vendored skills tree in existing copy deployment; preserve executable bits for new assets.
- Remove the Ponytail package default and local installation; copy skills into the ordinary home skills directory.
- Verify with existing checks, deployed/import comparison, and independent read-only review; retain the existing pinned upstream import.

# Definition of done
- All 535 pstack files are copied with matching bytes and executable permissions; future Pi setup/update includes skills.
- Ponytail no longer configured locally or by default; unrelated personal resources preserved.
- Limitation: Cursor-specific instructions and external dependencies remain unchanged; installed does not mean every workflow runs in Pi. Upstream's 57 explicit-invocation flags remain intact; use `/skill:name`.
- Existing test debt: two sync tests fail on both main and this branch (obsolete headless expectation and cleanup-loop assumption); unrelated fixes deferred.

# Todos
- [x] Pull main and create ignored task worktree; inspect deployment and Pi discovery docs.
- [x] Update deployment, package defaults, and documentation.
- [x] Remove local Ponytail with `pi remove`; copy all 535 files into the previously empty home skills directory. Recursive diff matches; all 58 entrypoints and six executable files present. `pi list` confirms Ponytail absent.
- [x] Syntax, LSP, whitespace and deployment preview checks pass. Existing sync suite: 41 pass, two baseline failures reproduced on main. Independent review found no actionable regressions. No new verification artifacts created; no skill workflows executed.
