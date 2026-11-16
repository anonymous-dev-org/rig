## Overview
- Every sync defaults to all six supported components; --components limits only the current invocation.
- Ignore legacy saved selections while retaining saved Brew preferences. Keep manual components and deployment safeguards unchanged.
- README update delegated to worker; parent owns scripts/rig.mjs and verification. No live sync, push, or merge.

## Todos
- [x] Default-all selection works with legacy state and explicit overrides.
  - Requirement: default selects brew,neovim,zsh,kitty,git,pi every time; subset/empty override is invocation-only; Brew controls survive.
  - Definition of done: isolated CLI checks cover old subset/empty state, explicit subset/empty, subsequent default, and retained Brew preference; syntax and whitespace checks pass; committed.
