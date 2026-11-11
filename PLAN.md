## Overview
- Add context percentage/limit, session cost, Fast mode, and working path to Pi's minimal single-line footer. Preserve branch, thinking, and model. No unrelated settings or new tests.
- Layout: path + branch left; context, cost, Fast, thinking, model right. Abbreviate home and shorten path when space is tight.

## Todos
- [x] Goal: implement compact, accurate footer fields.
  - Requirements: live Pi usage and extension Fast status; honest unknown context; current working path; terminal-width-safe rendering.
  - Definition of done: source reviewed, existing checks/manual review completed, installed footer updated.
  - Scope: footer source and installed copy only; no added monitoring or configuration.
  - Verified: independent API/accounting inspection; manual width, lifecycle, and unknown-value review; diff whitespace check; installed copy matches source.
  - Limits: workspace has no resolved Pi/Node type dependencies, so LSP is not authoritative. No interactive visual test during this active session. Cost reflects recorded usage, not subscription balance. Very narrow terminals truncate fields.
- [x] Goal: finish delivery.
  - Requirements: review diff, record limitations, merge task branch and remove worktree.
  - Definition of done: clean repository and clear reload instructions.
  - Scope: this task only.
