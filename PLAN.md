## Overview
- Include all rig-owned configuration in default sync: add AeroSpace, Lazysql, and macOS alongside Brew, Neovim, Zsh, Kitty, Git, and Pi.
- Preserve existing Brew upgrade preferences; normal upgrade mode already updates Brew, Pi CLI, and configured Pi packages. No live sync, push, or merge.
- Accepted scout findings: explicit AeroSpace manifest, execute-bit repair, fail-closed link/discovery handling, and default-XDG prerequisite. User explicitly requested automatic reload after scout launch, overriding its manual-activation recommendation.
- Lazysql contains only a public example; connection settings are private. Deploy/update the example and seed a missing active config, never overwrite an existing active config or database credentials.
- Apply macOS defaults without restarting Finder/Dock during sync; standalone script keeps its existing restart behavior. Platform-specific components skip on non-macOS.

## Todos
- [x] All supported rig configuration participates in default sync safely.
  - Requirement: explicit copy inventories; AeroSpace scripts executable; Lazysql private data preserved; macOS preview has no effects; existing subset flag and Brew controls preserved.
  - Definition of done: isolated deployment and preview checks cover new components, private-config preservation, platform handling, and stubbed macOS defaults; existing AeroSpace checks and syntax/whitespace checks pass; documentation updated and committed.
  - Implemented: nine default components; AeroSpace signature tracks successful activation and retries deferred/failed reloads, including restored local drift. Dry-run validation and active-path verification precede reload.
  - Verification: isolated CLI orchestration with temporary HOME/repository and stubbed package/desktop commands passed: default preview, new-component deployment, private Lazysql preservation, executable repair, unchanged/changed/failed/deferred reloads, known-link migration, competing/active-path/XDG failures, non-macOS skips, macOS writes without restarts, standalone restart preservation.
  - Existing checks passed: workspace-groups, binding-contract, aerospace-launchers, install-aerospace. Logs: `.local/logs/sync-all-{groups,bindings,launchers,installer}.log`. Node/Bash syntax and whitespace checks passed.
  - Limitations: no live application reload or package upgrade was run. Existing Lazysql configs require manual adoption from the updated example. Restart/logout may be needed for macOS defaults; Pi reload/restart remains user-driven.
  - Verification correction: an initial stubbed-defaults assertion expected 15 writes; the existing script has 14. Corrected the throwaway check; all 14 writes verified.
