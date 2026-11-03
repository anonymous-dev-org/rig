# Goal and scope
- Hide pi-lens's remaining below-editor widget, preserving its tools.
- Add a short recurring Pi reminder to look back at the agreed goal, stay focused, and avoid overengineering.

# Excluded
- Goal tracking, new settings, extra agent workflows, provider-specific payload rewriting, unrelated cleanup, live home changes except the targeted pi-lens config deployment.
- New tests, probes, or diagnostic scripts; use existing checks and manual review.

# Implementation details
- User changed cadence: inject periodically, not on every call. User selected a fixed interval of 20 model calls, controlled by one constant; counter starts at extension load.
- Use Pi's context_with_system hook to append one request-only system reminder on every twentieth invocation; preserve existing messages.
- Add the extension to rig's explicit Pi deployment list and briefly document behavior and activation.
- Consult coding-partner on the approach and final diff; run available relevant checks.

# Requirements list and tracking
- [x] A short reminder asks the agent to revisit the goal and choose focused, non-overengineered work.
- [x] Request hook appends the reminder every 20 calls without saving history or starting turns (manual review; no live model run).
- [x] Extension added to deployment inventory; docs explain behavior and activation.
- [x] Existing checks and independent review completed; limitations recorded. Coding-partner approved the counter/hook approach at interval 10; user then selected 20 (constant and docs updated, manually checked).
- Checks: deployment script Node syntax and git diff whitespace pass. Node --check cannot parse this TypeScript extension even with --experimental-strip-types; do not claim TS syntax verification. Existing Pi suite: 41/43 pass; unchanged failures expect Playwright --headless and obsolete Stow cleanup loops. Unrelated fixes excluded.
- Type-check limitation: worktree cannot resolve the globally installed Pi type import; resulting implicit-any warning. Installed API declarations reviewed instead; no new build setup.
- Behavior is advisory, not enforced. A forced replacement system prompt can remove the reminder, including some subagent runtime paths; ordinary parent-session extensions inspected did not demonstrate this override. Some providers fold it into the leading prompt. No live deployment or model-behavior check performed.
- [x] Pi-lens: added widget.visible=false, retained ui.hideLspStatus=true; deployed only this config to home. Config comparison and diff check pass; coding-partner approved.
- Pi-lens limitation: live terminal appearance unverified; /reload or restart required. No package removal or tool disabling.
