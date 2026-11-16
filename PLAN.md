# Overview

- Goal: make delegation available without an enable turn, and distinguish independent review from work whose result the parent needs before implementation.
- Ship one configuration/instruction change using existing pi-subagents features; preserve authorization, file ownership, verification and publication safeguards.
- Worktree: `.local/worktrees/pi-delegation-flow`, branch `task/pi-delegation-flow`, based on updated `main` (`fcd1b99`). `.local/` is already ignored. Earlier benchmark/configuration branches remain separate.
- Scope: managed subagent configuration, delegation instructions and usage documentation. No upstream extension patch, live home-directory edits, provider changes or benchmark reruns.
- Assumption: approval covers the tracked configuration change, not merging/deploying it. Main already removed worktree-specific wording in an unrelated change; do not restore or otherwise alter it.

# Todos

- [x] Delegation starts ready and respects decision dependencies.
  - **Requirement:** set `toolActivation` to `eager`; distinguish implementation ownership, independent assurance and blocking decisions; preserve native async completion; do not treat `progress_update` as delivery to the parent model. Explain fresh versus resumed session activation.
  - **Definition of done:** isolated runtime checks expose `subagent` initially without `subagents_enable`, existing configuration values survive, targeted checks pass, existing-suite failures are assessed, and review finds no new instruction conflict or weakened safeguard.
  - Verification: use the installed package in a throwaway, credential-free session; no model request is needed to inspect initial tool availability. Instruction behavior requires a later separately labeled model experiment before claiming timing/quality gains.
  - Implemented: eager activation plus implementation/review/decision distinctions, async completion guidance and the correct channel for blockers. No new tool or role is needed.
  - Verification passed with Pi 1.5.2 and pi-subagents 0.88.1: fresh eager session exposes delegation tools without the loader; default-auto control exposes only the loader; explicit `subagent` exclusion remains effective. Updated instructions load. Zero model requests/fetch calls; isolated HOME, agent directory and temporary directory.
  - Managed JSON checks passed: eager overrides an older activation preference, existing defaults and personal additions survive, repeated enforcement is idempotent.
  - Existing suite: `node --test pi/sync-settings.test.mjs` gives 41 passes / 2 failures. Tests still expect Playwright `--headless` and a removed `init.sh`; the test file, sync code and MCP template are unchanged from HEAD, which also lacks `init.sh`. These unrelated stale expectations are not fixed here.
  - Review: worker `a1e3a5b0-c40e-4f96-972a-0fef238d63e3` found no proposal-level blocker and confirmed restart/resume caveats; parent checked the complete resulting diff against those findings.
  - Verification logs: `.local/logs/delegation-{eager,auto,excluded}.log` and `.local/logs/sync-settings-test.log`. Throwaway verification code and isolated homes are removed after checks.
  - Limitation/follow-up: instruction behavior, quality and timing are not remeasured. Eager activation adds the full tool declaration even without delegation and does not remove skill reads. Run a separately labeled comparison before claiming net improvement; repair the stale sync tests in a separate task.
  - Setup note: a codemode batch attempted a model-only enable tool and was cancelled; enabling directly succeeded. Oversized inspection output was replaced with bounded reads.
