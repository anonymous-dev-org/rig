## Goal and scope
- Run coding-partner as a native Pi subagent using openai/gpt-6-astra, without Claude Code dependencies.
- Remove the Claude shell alias; preserve the review role.

## Excluded
- Uninstalling machine-wide software or changing other agents.
- Removing disabled-agent safeguards or the harmless Git ignore rule.

## Implementation details
- Replace external runner configuration with native model frontmatter.
- Describe Pi tools instead of Claude tools in the handoff instructions.
- Review the diff manually. User approved skipping coding-partner review after the old Claude runner hit its session limit.

## Requirements list and tracking
- [x] coding-partner configuration uses native Pi execution and openai/gpt-6-astra.
- [x] No active Claude dependency remains in repository configuration; disabled-agent safeguards and Git ignore rule remain.
- [x] Manual diff review and git diff --check pass; partner review waived by user.
- Limitation: configuration reviewed statically; native Astra execution not exercised.
- Limitation: existing user settings can override the agent model; no machine-wide software removal is included.
