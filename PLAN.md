## Overview
- Ship the supported pi-lens static-tool workaround through rig's existing deployed config. Do not patch Pi/pi-lens or change sync's protection of personal edits.
- Exact reported error remains unavailable; this avoids lazy-tool changes, not every possible schema error.

## Todos
- [x] Goal: synced Pi defaults keep pi-lens tools active.
  - Requirements: set tools.lazy=false in the deployed global config; document restart, context cost and existing-config behavior.
  - Definition of done: review deployment handling and run existing relevant checks; independent review complete.
  - Scope: config and documentation only; no new tests or verification artifacts, no personal home edits.
  - Done: config updated, explicit deployment manifest/copy policy reviewed independently; changed-file diagnostics and diff whitespace clean.
  - Checks: existing Pi suite has 41 passes, 2 failures; same failures reproduced on unchanged main (stale --headless expectation and missing init.sh).
  - Limits: customized whole-file configs need manual adoption; more context used for tools. Runtime error not reproduced; no upstream lifecycle patch.
