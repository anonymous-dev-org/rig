## Overview
- Make the two review prompts clear, simple and sharp: WATCHDOG.md (automatic Sol review) and DEEP_REVIEW.md (/review with Astra and Fable).
- Keep behavior: same three areas each, same output sections, verbatim delivery.

## Todos
- [x] Both prompts rewritten and installed.
  - Requirement: each rule stated once; steps in the order the reviewer follows them; fixed output format.
  - Done: prompts rewritten with the same structure (context, areas, rules, output). The request message in both extensions now carries only worktree, transcript path, entry ID and capture time; the instructions it used to repeat live only in the prompt files.
  - Verified: Pi's loader loads both extensions without errors; both build; whitespace check passed; live copies match the repository.
  - Not verified: no paid review was run, so the effect on actual review quality is unobserved.
  - Change in the automatic review: an area with nothing to assess may be scored `n/a` instead of a forced number.
