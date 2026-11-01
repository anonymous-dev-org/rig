## Goal and scope
- Record the 16 requested agent disables in rig defaults and sync this Mac; retain coding-partner on Claude Opus.

## Excluded
- Deleting agent definitions, changing other agents, or changing sync behavior.

## Implementation details
- Add disabled overrides in pi/.pi/agent/settings.example.json; retain existing fields.
- Review with coding-partner, run existing checks, and use pi/sync-settings.mjs.

## Requirements list and tracking
- [x] Rig defaults disable the original 15 agents plus claude-code-writer; the other six remain available.
- [x] coding-partner remains enabled on antigravity/claude-opus-5-5 in rig and the live Mac registry.
- [x] Follow-up disable approved by coding-partner; sync and live list verified; git diff --check passed.
- [x] Independent review complete: coding-partner approved with no findings. git diff --check passed; existing suite: 42/43 passed (unrelated failure below).
- [x] Mac settings aligned using rig sync; live agent list verified.
- Existing check failure: MCP test expects --headless, but unchanged defaults intentionally use a visible browser; unrelated to agent settings and left unchanged.
- Limitation: existing sync preserves personal overrides on other machines; defaults are not enforced policy.
