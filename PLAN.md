# Goal and scope
- Apply the reminder wording explicitly approved by the user, who requested “ok update it”.
- Update the repository extension, installed copy, and matching documentation.
- User additionally requested removal of the coding-partner agent and its AGENTS.md requirements; remove its dedicated settings too, in repository and installed configuration.

# Excluded
- Changes to the 20-call interval or injection behavior.
- New tests, dependencies, or verification artifacts.

# Implementation details
- Replace only the REMINDER string with the approved wording about goal/scope alignment and checking for a simpler approach.
- Remove the stop-when-complete instruction and update the README summary.
- Compare copies, check the diff, and obtain read-only coding-partner review.

# Requirements list and tracking
- [x] Approved wording appears in the worktree and installed extension; copies match.
- [x] Interval and injection logic unchanged; documentation matches.
- [x] Diff whitespace check passes.
- [x] Reminder review completed with no material issues.
- [x] Removed agent definition, dedicated settings, and consultation requirements; general delegation guidance preserved. Search found no remaining references in worktree Pi files or installed instructions/settings/agents; instruction copies match and diff check passes.
- User authorized opening a pull request and merging into main.
- Limitation: live injection not tested; reload or restart required.
