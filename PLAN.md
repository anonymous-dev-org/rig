## Overview
- Add /review for two independent deep reviews: Astra and Fable, high thinking, running in parallel.
- Review architecture, bugs/potential issues, and code quality using the session transcript and worktree. Deliver each final report verbatim as developer feedback.
- Preserve the automatic Sol review. No permanent test infrastructure.

## Todos
- [x] /review works end to end and is available locally.
  - Requirement: transcript path and captured branch entry, worktree context, autonomous read-only source/Git inspection, parallel reviewers, exact output delivery, cancellation and usage accounting.
  - Definition of done: build and disposable runtime checks cover command execution, safe Git access, both reviewers, independent failure/delivery, cancellation, and message projection; local copies match; commit changes.
  - Implemented: new deep-review.ts and DEEP_REVIEW.md; deployment manifest, Git allowlist, and docs updated. Existing automatic Sol extension unchanged.
  - Assumption: high thinking for both models for a deep review; no numeric scores because this request asks for substantive analysis and findings.
  - Verified: child Bun build and strict TypeScript check passed. Parent actual Pi loader registered /review without errors. Disposable simulated-Agent checks passed parallel/high configuration, transcript/worktree pointers, exact independent delivery, usage/system projection, duplicate rejection, unavailable/failed/empty peer isolation, missing transcript/prompt, argument rejection, lifecycle cancellation/stale suppression, usage attribution and child exclusion.
  - Verified: Git tool executed against a disposable repository for staged/unstaged/historical diffs, untracked status, log/show, targeted paths and pagination; rejected injected revision options and invalid parameter combinations, reported failures/truncation, left worktree unchanged. Manifest syntax and whitespace checks passed.
  - Installed new extension and prompt in ~/.pi/agent with private permissions; byte comparisons match repository. Run /reload then /review to use it.
  - Limits: no paid reviewer calls; actual model findings remain to observe. Live worktree may change during review. Git output above 16 MiB requires path narrowing; individual lines above 40 KB cannot be displayed by the Git tool. Prompt requires honest evidence limitations.
