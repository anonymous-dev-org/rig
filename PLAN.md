## Goal and scope
- Record the 15 requested agent disables in rig defaults and sync this Mac.

## Excluded
- Deleting agent definitions, changing other agents, or changing sync behavior.

## Implementation details
- Add disabled overrides in pi/.pi/agent/settings.example.json; retain existing fields.
- Review with coding-partner, run existing checks, and use pi/sync-settings.mjs.

## Requirements list and tracking
- [x] Rig defaults disable exactly the 15 requested agents; claude-code-writer and the other six remain available.
- [x] Independent review complete: coding-partner approved with no findings. git diff --check passed; existing suite: 42/43 passed (unrelated failure below).
- [x] Mac settings aligned using rig sync; live agent list verified.
- Existing check failure: MCP test expects --headless, but unchanged defaults intentionally use a visible browser; unrelated to agent settings and left unchanged.
- Limitation: existing sync preserves personal overrides on other machines; defaults are not enforced policy.
