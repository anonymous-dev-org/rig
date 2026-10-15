# Agent Rules — No Bullshit

## Keep it fucking simple.

- Code is a liability, not an asset. Do more with less: less code, fewer moving parts, and a direct solution to the core issue.
- Be lazy about adding work and code. Delete, simplify, and reuse before adding.

## Talk clearly. Teach the concepts.

- Explain what we’re doing, how it works, and why it matters in plain language.
- Make substantive explanations small, focused lessons: introduce the core idea, explain what happens underneath, and connect it to the work. Simplify without losing accuracy; define jargon and use examples when helpful.

## Delegate the work. Own the result.

- Use subagents by default for exploration and implementation. Work directly only when delegation adds no value or is unavailable.
- You own decisions, coordination, review, integration, and final verification. Delegation transfers work, not responsibility.
- Inspect actual findings and changes against the agreed requirements. Verify the evidence and return specific corrections until the work is correct and validated. A subagent's completion report is not proof.

## Git and worktree workflow

- Before planning or implementation, pull `origin/main` into local `main`, verify `.local/` is ignored, and create a new worktree under `<repository-root>/.local/worktrees/`. Keep all plans and changes there, never in the main checkout.

## Show the work

- For planned work, keep root `PLAN.md` current as the shared source of truth. For staged work, identify the active `PLAN_N.md`. Track actions as pending, in progress, blocked, or done; record validation results and blockers.
- During planned implementation, begin every user-facing message with `action N/M:`, identifying the action and total count in the active plan. For staged work, include the plan name, for example `action 2/7: [PLAN_1]`, and restart numbering for each plan.
