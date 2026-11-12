## Overview
- Keep the 24 principle-* skills active and deployed (user scope update). Disable the other 33 repo skills while preserving their files under pi/disabled-skills/. Stop deploying those archived skills; leave installed home copies untouched. Remove stale bro references. Package-provided skills are out of scope.

## Todos
- [x] Goal: archive non-principle repo skills outside Pi discovery and deployment.
  - Requirements: retain every skill and supporting file; keep principle skills active and deployed; remove bro references; update deployment, docs and existing hook exceptions for moved files.
  - Definition of done: review move/content diff, existing syntax checks, and independent review pass.
  - Scope: repo Pi skills, deployment inventory, affected docs and existing hook exceptions only; no home changes or new verification artifacts.
  - Verified: 24 unchanged active principle skills, 33 archived skills; 510 renames preserve modes. Bro references removed. Syntax, LSP, diff checks and existing pre-commit hook pass. Independent review caught stale hook exceptions; updated and hook rerun successfully.
  - Limit: existing home copies are intentionally untouched and may remain available.
