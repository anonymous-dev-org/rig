# Goal and scope
- Stop creating deployment symlinks. Give users ordinary local config files they can customize.
- Update unchanged managed copies; preserve customized files and report newer defaults. Convert positively identified rig links without following foreign links.

# Excluded
- Pi JSON merge changes, new per-app mergers, live home changes, new tests/probes, unrelated installation behavior.

# Implementation details
- Replace shared asset linking with byte copies and a small prior-default hash inventory outside checkout.
- Existing ordinary files without history remain personal. Known rig file/directory links migrate with backups and checks; directory snapshots already exist.
- Preserve known deletions. Do not auto-delete retired assets or follow foreign symlinks.
- Update ownership/customization docs; existing hooks remain optional, not mandatory for customization.

# Requirements list and tracking
- [x] Copy assets with safe updates and no new symlinks in setup/update.
- [x] Convert known links, preserve custom files/deletions, retain Pi JSON behavior. Directory migration preflights baselines, publishes all copies, then records history.
- [x] Update ownership docs; Node/Bash syntax and diff checks pass. Pi suite 41/43: existing headless mismatch plus obsolete Stow-loop assertion from prior orchestration change. Pi JSON implementation unchanged.
- LSP reported no findings but could not confirm clean. No live home migration or runtime checks performed. Stop other config writers during migration; filesystem operations are not a global transaction.
- Standalone legacy AeroSpace installer remains outside setup/update scope and still uses links.
- [ ] Independent review and deliver.
