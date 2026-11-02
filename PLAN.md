# Goal and scope
- Make shared agent instructions proactive, goal-aligned, and simplicity-driven; align coding-partner advice.

# Excluded
- Runtime enforcement, tooling changes, unrelated agent rewrites, and deployment changes.

# Implementation details
- Add a recurring two-question decision check.
- Replace routine stopping with investigation, a concrete recommendation, and in-scope action.
- Consult coding-partner on material uncertainty; retain user approval for scope changes and real authorization boundaries.
- Manually review the instruction diff and obtain coding-partner feedback.

# Requirements list and tracking
- [x] Shared instructions explicitly repeat goal/scope and simplest-sufficient-solution checks at decision points.
- [x] Ordinary obstacles lead to bounded investigation and in-scope action, not routine permission requests.
- [x] Uncertainty triggers a concrete proposal and coding-partner consultation; genuine blockers include a recommended next step.
- [x] Coding-partner guidance supports proactive resolution without scope expansion or recursive consultation.
- [x] Diff manually checked; final coding-partner review aligned with no material findings; git diff --check passed.
- Limitation: written instructions guide model behavior but cannot guarantee compliance.
