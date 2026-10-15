# Rig project-local browser automation

Status: awaiting detailed-plan approval. No MCP configuration or installation performed.

## Agreement

Add browser automation to rig using pi's built-in MCP integration and Microsoft's Playwright MCP server. Keep global pi settings, Stow-managed `pi/.pi/agent/`, existing browser profiles, and other projects unchanged. Use an isolated, headless browser; no account login or consequential website actions.

Worktree: `.local/worktrees/browser-automation` (relative to the main rig checkout)
Branch: `setup/browser-automation`
Baseline: `5d01806`; local main refreshed from origin/main; `.local/` verified ignored.

## Verified context and constraints

- Installed pi 1.2.0 loads project MCP configuration from `<session cwd>/.pi/mcp.json` only after project trust. It does not search ancestors. Evidence: installed `dist/extensions/mcp/config.js`, `loadMcpConfig`, lines 105–116.
- Start pi from the rig repository root (or this worktree root). A session started in `rig/pi`, including the current session, will not load root configuration merely by changing a shell subprocess directory or reloading.
- Official pi docs: https://pi.dev/docs/latest/mcp
- Official backend docs: https://github.com/microsoft/playwright-mcp
- Playwright `--isolated` keeps profile state in memory and discards it on close; `--headless` avoids a visible browser. This is profile isolation, not an OS/network security sandbox.
- `npx -y @playwright/mcp@latest` may fetch/cache executable third-party packages. Latest follows upstream setup but is not a reproducible version pin.
- No custom extension, global server registration, package manifest, or persistent browser profile is needed. Default pi MCP exposure is codemode.

## Ordered actions

### 1. Add project configuration and usage instructions — pending

Goal: provide the smallest rig-local integration and explain its scope.

Dependencies: user approval of this complete plan.

Inputs/context: verified discovery behavior and official server flags above; existing dotfile/Stow layout.

Owned files:
- Root `.pi/mcp.json` (new).
- Root `.pi/README.md` (new, concise usage and safety instructions).
- Root `PLAN.md` (status/evidence only).

Operation: register server `playwright` with `command: "npx"` and `args: ["-y", "@playwright/mcp@latest", "--isolated", "--headless"]`. Document root-directory startup, project trust, `/mcp`, `/reload` limitations, codemode discovery, isolated sessions, npm download/cache behavior, and disabling/removing the project entry. Do not edit global settings, init/update scripts, Stow-managed files, or add duplicate subdirectory config.

Completion checks: JSON parses; installed pi configuration loader resolves this server as project-scoped from worktree root and does not resolve it from the `pi/` subdirectory (without connecting unrelated global servers); diff contains only approved files; independent read-only review and parent verification pass. Record results here and commit the reviewed change before action 2.

### 2. Smoke-test the configured browser server — pending

Goal: prove actual navigation, link interaction, and screenshot capture using the configured server command.

Dependencies: action 1 committed.

Inputs/context: committed config; installed Node/npm and browser availability; runtime-discovered MCP tool schemas.

Owned files: `PLAN.md` for validation evidence; `.pi/README.md` only if a verified setup correction is necessary within this agreement. Temporary validation scripts, packages, screenshots, and logs remain outside tracked repository files.

Operation: validate project configuration discovery using installed pi code, then connect only the configured Playwright server using a disposable MCP SDK client in a temporary directory if this session cannot expose its tools. Permit npm package download/cache as needed. Inspect actual schemas, navigate to https://example.com, follow its More information link, verify destination content, capture a screenshot to an absolute temporary path, and close browser/client in cleanup. Check MCP `isError` results, not just process exit codes. Use an already available browser; if browser/system installation, authentication, disabled MCP support, or other access changes are needed, stop and report rather than altering global settings. Do not run `pi mcp list` against all personal servers merely to test this one.

Completion checks: project scoping verified; MCP initialization and tool listing succeed; navigate/click/destination checks pass; screenshot exists and is visually inspected; browser/client cleanup completes; no new tracked runtime artifacts or global settings changes. Independent read-only review and parent evidence review pass. Record exact command/version, test outcomes, artifact location, limitations, and any blocker here; commit the reviewed evidence. If a fresh trusted root pi session has not been tested, explicitly distinguish verified config discovery/backend operation from end-to-end interactive pi integration.

## Delivery boundary

Report branch, commits, validation, limitations, and the exact startup command. Do not merge, push, open a merge request, or modify the main checkout in this plan. The feature remains on the isolated branch until separately integrated.
