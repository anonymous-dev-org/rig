## Goal and scope
- Keep coding-partner on Claude Code with unrestricted CLI tool access, as requested.

## Excluded
- Changing other agents or copying Pi MCP configuration into Claude Code.

## Implementation details
- Use the supported generic external-cli runner with explicit Claude print/model arguments and permission bypass.
- Leave Claude's normal tools, settings, and MCP discovery enabled.
- Replace handoff-only/no-tools instructions with scoped tool use.
- Review configuration manually and request coding-partner feedback.

## Requirements list and tracking
- [x] Claude Code and the existing model remain selected.
- [x] Launch no longer disables tools or MCP; permission prompts are bypassed.
- [x] Prompt permits tools within delegated scope.
- [x] Review diff and address coding-partner feedback. Review aligned; source confirms buildExternalCliPrompt includes instructions and task, sent through stdin. git diff --check passed.
- Verification is static configuration/source review, not an end-to-end tool exercise.
- Scope and recursion restrictions are prompt instructions, not enforced tool limits; callers must avoid concurrent delegated edits.
- Tradeoff: generic runner returns stdout rather than adapter-validated streaming results; model selection moves to CLI arguments.
- Limitation: only Claude-configured MCP servers are available; Pi tools are not automatically shared.
