# Goal and scope
- Deliver new rig defaults without deleting personal settings or overriding explicit choices.
- User approved trimming the broad rollout after questioning overengineering: Pi package/default updates, safe setup/update, native customization hooks, and Brew controls only.

# Excluded
- New AeroSpace/Lazysql TOML merging and macOS preference synchronization. Their prototype commits were reverted from delivery; isolated branches preserve the work.
- Live installations/configuration changes, automatic package removal, new dependencies/frameworks, new tests/probes.
- Invented standalone skills: the skills lock is empty; Pi packages supply bundled skills.

# Implementation details
- Keep Pi's existing JSON transaction engine. Merge packages by stable identity, preserve pins/filter objects/order/deletions, validate duplicates before staging, and report conflicting key paths without values. Other arrays remain atomic.
- Use native Git includes, Zsh pre/final hooks, Kitty optional local.conf and Neovim private runtime/deferred hooks. Preserve unknown executable configs; require manual migration instead of sourcing or replacing them.
- Shared setup/update must stop destructive adoption, persist component selection, protect dirty checkout before pull, preserve existing hooks, and deploy explicit assets rather than docs/runtime captures.
- Keep Brewfile and native skip/no-upgrade controls. No unconditional Bun/Pi upgrade bypasses. Resolve runtime prerequisites before writes.
- Leave existing AeroSpace/Lazysql/macOS configs untouched by automatic update; report manual adoption rather than adding a new sync engine.
- Integrate latest main (Kitty file-link fix and Pi lens config), run existing checks and independent review, then deliver PR/merge as requested.

# Requirements list and tracking
- [x] Audit existing delivery and preserve personal configuration goal.
- [x] Remove new TOML/macOS machinery from deliverable after scope reduction.
- [x] Implement native hooks, independently reviewed commit 7e8c602; integrated as 653c878. Deployment remains pending.
- [ ] Finish Pi package identity/filter/removal/adoption changes and docs; current existing suite 42/43 passing, sole failure is preexisting Playwright --headless expectation.
- [ ] Integrate safe shared orchestration, selections, explicit assets and Brew controls. Worker active in rig-orchestration, revised scope relayed.
- [ ] Review complete integration, document supported manual migration, run existing checks, deliver MR/merge.
- Pi generic JSON merge retains existing atomic new-table behavior; package list is the scoped exception. No new regression tests permitted; package edge cases source-reviewed only.
- Native caveats: existing XDG Git config must not become subordinate to shared credential resets; Kitty directories must remain user-owned, link files individually; preserve Zsh hooks and nvim-local.
- Runtime behavior remains unverified; no live settings/installations changed. AeroSpace/Lazysql/macOS no longer receive automatic personal/default merging in this scope.
