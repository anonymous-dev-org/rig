# Goal and scope
- Make selected Pi setup/update install declared packages before reporting success, including pinned packages on fresh homes.
- Preserve private package declarations, resource filters and opt-outs.

# Excluded
- Copying undeclared personal skills/prompts or private credentials.
- New installers, dependencies, tests or verification artifacts.

# Implementation details
- Reuse the installed Pi package-manager API after settings sync: resolve missing/mismatched packages, then update only when upgrades are enabled. CLI update alone skips missing pinned npm packages.
- Load the API from the selected Pi installation; use in-memory global settings so project configuration and private JSON are not rewritten. Fail on offline mode, install failures or missing packages.
- Keep preview non-mutating and package actions global, independent of repository trust/config.
- Update setup documentation and manually review control flow; run applicable existing checks only.

# Requirements list and tracking
- [x] Fresh homes explicitly install all configured packages, including pinned ones (Pi resolver and inventory postcheck; source reviewed).
- [x] Failed installs fail the Pi component with actionable output.
- [x] Personal filters/opt-outs, preview and upgrade controls retain their contracts (in-memory global settings; preview passed).
- [x] Documentation matches behavior; coding-partner final review found no material issues.
- Verification: syntax, active LSP and diff checks clean; existing sync suite 41/43 pass. Both failures reproduce on unchanged main (stale headless MCP and removed shell cleanup expectations).
- Known gaps: undeclared standalone resources remain outside deployment; no live fresh-user/network install exercised. API loading requires the selected Node/Bun Pi package's public ESM export. No new verification artifacts created.
