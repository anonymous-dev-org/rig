# Overview
- Add a cached-input percentage beside the footer input/output totals. Keep existing totals and cost unchanged.
- Interpret cached as cache reads divided by all input (uncached + cache reads + cache writes). Output has no cache metric.

# Todos
- [x] Footer shows cumulative cached-input percentage.
  - Requirement: display `in 120k (80% cached) - out 5k`; show 0% for no input; use the existing usage aggregation and render cache.
  - Verified: five actual-render cases (zero, mixed, full cache, cache writes, leaf changes) and visible widths 1/20/80/250 passed. Throwaway check corrected to use installed dist imports and visibleWidth rather than ANSI string length.
