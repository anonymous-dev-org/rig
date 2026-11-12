## Overview
- Review `pi/.pi/agent/AGENTS.md` for clear, simple wording and trim it where words do no work.
- Why: the file is read at the start of every session, and its wording shapes how the agent behaves and writes.
- In scope: wording, order, and layout of the existing rules. Out of scope: changing what any rule asks for.
- Caveman (`caveman-compress`) checked and not applied: it rewrites prose into fragments and drops reasons and connecting words. This file relies on reasons and on a plain, human voice, and the saving would be about 600 tokens per session. Its lightest idea (cut filler, keep grammar) is applied by hand.

## Todos
- [x] Wording is clear and simple, rules unchanged
  - **Requirement** — shorter sentences, steps as lists, section 5 split under sub-headings, leftover approval wording removed.
  - **Definition of done** — every rule in the old file is still present with the same meaning; word count lower.
  - Open point for the user: the file never says who merges and pushes a finished branch.
