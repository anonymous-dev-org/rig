## Overview
- Move checkout selection before Pi startup, using a deployed shell script, not an extension.
- Bare interactive `pi` asks for a new named worktree or the primary checkout. Explicit arguments and noninteractive invocations pass through unchanged.
- New branches start from primary checkout HEAD, without pulling or copying dirty files. Worktrees live in its `.pi/worktrees/`; native `--name` names the conversation.
- Update shared agent instructions to respect the selected checkout. No live sync, push, or merge.

## Todos
- [x] Launcher, shell deployment, and instructions work end to end.
  - Requirement: safe names, no overwrites, ignored worktree directory, argument/exit preservation, no recursive invocation.
  - Definition of done: syntax checks and throwaway Git/PTY checks cover both choices, validation failures, and passthrough; changes committed.
