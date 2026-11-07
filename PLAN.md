# Goal
- Store all 58 official pstack skills unchanged in `pi/.pi/agent/skills/` in Rig rather than Lira.
- Preserve bundled files and modes; include upstream license and pinned provenance.
- Exclude platform adaptation, deployment changes, agents, and automations.
- Approved scope update: allow the two upstream example-bearing skill files through the machine-specific-value hook; commit and push to main.

# Approach
- Copy the already verified upstream skill tree at `6b0300214a09fd6029cfb7077043125758cd1fd2`.
- Keep provenance and license in `pi/vendor/pstack/`.
- Compare the import with upstream and independently review scope.

# Definition of done
- All 535 skill files match upstream; existing Rig assets remain unchanged.
- Limitation: this stores the skills only; Rig's explicit deployment list does not currently deploy standalone skills. Cursor-specific instructions remain unchanged.
- Preserve upstream blank EOF line in `automate-me/SKILL.md` despite Git whitespace warning.

# Todos
- [x] Update main and create task worktree.
- [x] Copy skills, license, and provenance; recursive diff matches all upstream files.
- [x] Independent review confirms all 535 files, six executable modes, license, and revision match. Fixed reviewer finding by adding the shared skills directory to Git ignore exceptions; all files staged.
- [x] Add approved hook exceptions for `recall/SKILL.md` and `make-bot-ui/SKILL.md`; shell syntax check passes, upstream bytes remain unchanged.
- [ ] Commit and push main; check resulting CI. No runtime execution or deployment changes.
