## Overview
- Compare configured Pi, bare Pi, and Codex eventually; current version runs only the Mac's configured Pi on one real Terminal-Bench task.
- Preserve active instructions, skills, extensions, model and thinking settings in an isolated Linux copy. Do not expose host sessions or unrelated credentials; no cloud upload.
- Harbor's stock Pi adapter does not transfer host configuration. Added a small subclass to upload a frozen archive, install Linux packages and inject only required OAuth providers at runtime.

## Todos
- [x] Configured Pi completes one real Terminal-Bench trial with auditable configuration and results.
  - Requirement: Pi 1.5.2 with current active configuration, one fixed task/attempt, local Docker, saved verifier and execution logs.
  - Definition of done: inspect loaded resources and trial result, document exact setup/deviations and repeat command, commit notes.
  - Verified: log-summary-date-ranges from terminal-bench@2.0 passed, reward 1.0, both pytest checks passed, zero exceptions/retries. Agent 24.56s, full job 2m; Pi 1.5.2, gpt-6.1-sol, low thinking confirmed in trial/session metadata.
  - Frozen config + hashes: ~/.local/share/terminal-bench/configured-pi-20261116-232520/. Job: ~/.local/share/terminal-bench/jobs/configured-pi-20261116-232520/. No credentials in snapshot or repository.
  - Captured active global instructions, skills, custom extensions, agents, theme, model catalog and native MCP config. Four configured packages pinned to installed versions; Linux dependencies freshly resolved. Device ID omitted; Bun 1.4.4 added. Numbered read output proves custom file tools active; package log records all four packages.
  - Main-launcher decision: option 2 only changes cwd to the primary checkout; noninteractive runs bypass the menu. Actual target pi --version is 1.5.2, overriding scout's stale 1.2.0 installer marker. Main checkout has no project Pi settings to transfer.
  - Limitations: task did not exercise delegation, 40-call paired review, Playwright browser, or macOS TUI behavior. No claim of full integration parity or performance superiority. No lasting test files added; Python syntax and git whitespace checks pass.
  - Next version: bare Pi, then Codex, using this exact task/model/effort and one attempt. Earlier Codex hello-world is not comparable. Broader suite and transitive dependency lock are future suggestions, not part of this version.
