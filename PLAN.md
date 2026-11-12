# Overview
- Goal: agent messages come out short and explain the one or two ideas that matter, with a diagram for flows, instead of long item lists that retell the plan.
- Cause found in the Lira session (gpt-6.1-sol, current AGENTS.md loaded): six lines in `pi/.pi/agent/AGENTS.md` each add required content to the final message, section 6 says longer is better, teaching is a per-item template, and diagrams are never mentioned.
- Scope: `pi/.pi/agent/AGENTS.md` only. Not deployed to `~/.pi/agent` and not merged; both need the user's go-ahead.
- Decision: technical debt and suggestions now live in `PLAN.md`; the message carries only items the user must act on, plus a one-line pointer saying what is waiting in the plan. This reverses the earlier rule to walk through all debt in the final message.
- Not tested against a model: a faithful test is a full agent session on the user's subscription. The next real session is the test.

# Todos
- [x] Final message has one definition and teaching is a selection.
  - Requirement: scattered "mention in the final message" lines point to `PLAN.md`; section 6 defines message contents per message type, asks for depth on one or two ideas in prose, asks for a mermaid diagram for flows, and covers hedging and coined labels; the "longer is better" override is gone.
  - Definition of done: no instruction outside section 6 adds content to the final message; file reads consistently end to end; committed on `docs/agents-final-message`.
