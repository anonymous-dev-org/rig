# Overview
- Make sync terminal logs easy to follow, with quiet successful commands, clear component progress, and actionable colored outcomes. Keep sync behavior unchanged.
- Worktree created after fast-forwarding main; `.local/` is already ignored.

# Todos
- [x] Clean sync output end to end.
  - Requirement: readable progress, green successes/red failures on terminals, actual subprocess errors, plain redirected output and explicit preview outcomes.
  - Definition of done: syntax/diff checks and isolated preview, apply, repeat, component failure, subprocess failure, quiet success, plain output, and green/red pseudo-terminal checks passed. Existing checks evaluated below.
  - Use captured subprocess output to suppress successful tool chatter; print it only on failure. Keep file operations as indented details.
  - Existing Pi checks: 41 passed; two unrelated failures expect removed `--headless` and missing `init.sh`.
  - Verified with isolated HOME and fake Brew commands; no real package installation or personal configuration changes.
  - Captured commands retain up to 64 MiB; long-running commands show their step, not live tool output.
