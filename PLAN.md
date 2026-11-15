## Overview
- Replace footer cumulative token total with session input/output and total cost, including recorded main-agent, subagent, reviewer and tool usage. Preserve context display.
- Worktree branched from fetched origin/main; leave main checkout untouched.
- Input includes cache reads/writes; cost uses reported prices, not inferred charges for tools without usage.

## Todos
- [x] Version 1: session footer separates recorded input/output and cost.
  - Requirement: remove used-total display; sum recorded session entries, including toolResult and native usage records; preserve context.
  - Definition of done: controlled rendering verifies counts, cache accounting, refresh and layout; installed loader accepts extension; commit changes.
  - Verified all entry kinds and leaf refresh; widths checked with visibleWidth (raw string length includes terminal escapes). Diff check passes. No live installation; controlled checks make no provider calls.
- [ ] Version 2: accurate all-subagent totals, including nested and async runs.
  - Requirement: count each run once across notifications, repeated waits and nested delegation; include main and generic tool usage without double counting.
  - Definition of done: notification-only, repeated wait, nested delegation, reload and missing-artifact checks prove completeness or visibly indicate missing usage.
  - Scout found installed pi-subagents attaches sync usage to tool results but async notification-only runs are absent; repeated waits replay usage; child reconciliation counts assistant messages only, so nested work is not established as included.
  - Existing collectSubagentCost in installed src/slash/subagent-cost.js resolves async artifacts and deduplicates direct runs; branch-only scope and recursive completeness prevent using it as a complete session collector unchanged.
  - Pause after verified version 1 per project instructions. Do not advertise version 1 as complete all-agent accounting.
