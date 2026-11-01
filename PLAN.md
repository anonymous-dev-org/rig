## Goal and scope
- Run coding-partner through Claude Code CLI using claude-opus-5.5, with review instructions and caller context.

## Excluded
- Custom runners, package changes, and unrelated agent settings.

## Implementation details
- Use pi-subagents' existing read-only claude-code adapter.
- Keep concise review output; make supplied-context-only boundaries explicit.
- Review profile and adapter prompt/model wiring.
- User approved skipping quota-blocked coding-partner review and requested PR creation and merge.

## Requirements list and tracking
- [x] Profile selects Claude Code CLI and claude-opus-5.5.
- [x] Prompt defines expected feedback and how to handle supplied or missing context.
- [x] Manual diff and adapter wiring review complete; git diff --check passed. Partner review skipped by user approval.
- Verification limit: no live Claude invocation; model access/authentication not exercised.
- Limitation: adapter has no tools; callers must supply excerpts/diffs. Requires local Claude login and trusted user settings/hooks.
