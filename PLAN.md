## Overview
- Replace init/update with one sync.sh command for fresh and existing Macs. Preserve private selections, customization safety, upgrade controls, and missing Pi package installation.
- Fresh sync uses defaults; subsequent sync retains update's clean-checkout fast-forward pull and re-exec. Preview never pulls or installs. No new tests or verification artifacts.

## Todos
- [x] Goal: unify the entrypoint and documented workflow.
  - Requirements: remove init.sh/update.sh; sync bootstraps missing state and reuses existing state; preserve package reconciliation and no-upgrade installs; update active references.
  - Definition of done: source/manual review, existing checks, independent review, merge and worktree cleanup.
  - Scope: entrypoint, orchestrator and affected documentation; no installer redesign or changes to private opt-outs.
  - Verified: shell/Node syntax, active-reference search, whitespace and LSP checks pass. Existing-state Pi no-upgrade preview passes, including missing-package reconciliation. Existing Pi suite: 41/43 pass both before and after; stale headless expectation and obsolete shell/Stow test fail on baseline too. Tests unchanged per no-new-tests constraint.
  - Independent review approved; delivery merged locally and task worktree removed.
  - Limits: no live installs; package reconciliation remains unconditional for selected Pi, including no-upgrade. Existing stale tests need separate maintenance.
