# Plan: Make every response a clear learning opportunity

Status: Implementation and manual validation complete.

## Goal and scope
Strengthen the communication rules in `pi/.pi/agent/AGENTS.md` so every response uses simple wording, assumes no prior knowledge, and explains unfamiliar concepts and the reasoning behind them. Keep explanations relevant rather than adding unnecessary length.

## Proposed approach
Replace the existing first bullet under “Talk clearly. Have a fucking opinion.” with explicit guidance covering plain language, explanations of unfamiliar terms, how concepts work, why they matter, and useful concrete examples. Leave all other rules unchanged.

## Implementation and validation
After approval, make the edit in a separate Git worktree under `.local/worktrees/`, then inspect the diff and manually check that all requested communication requirements are covered. `.local/` is already ignored by Git. No code or tests are involved.

## Tasks
1. Done — Replace the communication bullet in `.local/worktrees/agents-learning/pi/.pi/agent/AGENTS.md` with the approved wording. No dependencies. Check that all other rules remain unchanged.
2. Done — Review the diff, integrate into `pi/.pi/agent/AGENTS.md`, and verify the final wording. Depends on task 1. Checked coverage of plain language, no assumed prior knowledge, concepts, underlying behavior, reasoning, and relevant examples.

## Validation results
- Reviewed the diff: only the approved communication bullet changed; all other rules are unchanged.
- `git diff --check` passed in both the isolated worktree and the main working copy.
- File comparison confirmed the integrated file matches the reviewed worktree file.
- No tests added or run: this is a Markdown-only instruction change.

## Delivery
User requested a commit and push to `origin/main` after completion.
