# PLAN

## Overview

- Rewrite parts of `pi/.pi/agent/AGENTS.md` so the agent stops asking questions it could answer itself, and writes messages that teach.
- Why: the current file describes stopping far more than continuing, and its communication section is three sentences of adjectives.
- In scope: section 1 (last paragraph), section 3 (what to do if setup fails), section 5, section 6.
- Out of scope: worktree and `PLAN.md` process, simplicity rules, subagent rules, installing the file into `~/.pi/agent/`.
- Branch carries the user's uncommitted edit from main (todo fields reduced to Requirement + Definition of done).

## Todos

- [x] Agent decides by itself unless the action is risky
  - **Requirement** — one default (keep going, decide, record it); ask first only for risky actions (production, deleting, hard to undo) or things only the user can supply.
  - **Definition of done** — section 5 no longer has the four issue categories; sections 1 and 5 contain no other approval or pause triggers.
  - Decision to confirm with user: quick diagnostic commands are now allowed; writing tests and test scripts stays banned.
- [x] Messages teach in plain words
  - **Requirement** — section 6 describes the reader, asks for what / why / how it is wired into the architecture, and says depth wins over brevity.
  - **Definition of done** — section 6 states all of that and applies to every message.
- [ ] User reviews the draft and decides on merge and install
