# Overview
- Goal: persist an exactly-two council roster in rig's managed Pi configuration: Astra 6 and Fable 5.2.
- Scope: advisor profiles, managed instructions, and a short usage note. No home deployment or model requests.
- Main was clean and up to date with origin/main; .local is ignored; changes isolated on config/council-models.
- Exact model IDs verified against the current subagent model registry.

# Todos
- [x] Council configuration pins two independent read-only advisors.
  - Requirement: council-astra uses openai/gpt-6-astra; council-fable uses pi-sub-anthropic/claude-fable-5-2; fresh context, no inherited skills; no substitutions without permission.
  - Definition of done: profiles and instruction agree, deployment includes new profiles, diff checks and independent review pass; committed.
  - Deployment uses an explicit manifest, not automatic discovery; added both profiles to scripts/rig.mjs.
  - Verified: node --check scripts/rig.mjs, git diff --check, and throwaway assertions for both model IDs, fresh context, read-only allowlists, and manifest entries.
  - Existing sync tests on unchanged main: 41/43 pass; failures expect the removed Playwright --headless flag and missing init.sh. Unrelated baseline debt, left unchanged.
  - Independent scout review passed: profiles, roster and manifest agree. Reviewer had no command tool; parent performed diff, syntax and targeted checks.
  - Activation: merge and full Pi sync followed by reload; narrow JSON sync does not deploy these assets. Changes committed on config/council-models; merge and deployment await approval.
