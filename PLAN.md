# Overview
- Make Pi compaction recover from context-overflow errors without dropping history or saving partial summaries.
- Managed extension using public Pi APIs; installed application and main checkout are untouched. Local main was already current with origin/main; .local/ is ignored.
- Scope: manual and automatic compaction, not branch-navigation summaries. Outages, silent provider truncation, and impossible minimum requests cannot be guaranteed recoverable.
- No global deployment or paid provider calls performed. Activate by explicitly loading the extension, or by full Pi sync after integration.

# Todos
- [x] Deliver overflow recovery with bounded incremental summarization.
  - Requirement: native first; split oversized history, carry summaries forward; preserve recent boundary, file tracking, usage, cancellation and custom instructions; publish only one complete checkpoint.
  - Definition of done: native helpers exercised offline, real extension loader smoke-tested, strict TypeScript and syntax checks pass, no new existing-test failures, independent review complete, working version committed.
  - Verified 19 temporary offline cases: normal success, recursive overflow, single oversized message, split-turn prefix/previous summary, auth/rate-limit/server failures, empty/truncated/tool/aborted output, mid-fallback cancellation, minimum chunk/request cap, cumulative file lists, thrown overflow/unrelated exception, malformed checkpoint details, configured transient retry. Temporary checks are removed, not added to the repository.
  - Real Pi offline RPC startup loaded the extension successfully. Strict TypeScript, script syntax and diff whitespace checks pass.
  - Existing settings suite: 41 pass, 2 fail identically on untouched main (obsolete Playwright --headless expectation and removed init.sh reference). Left outside scope.
  - Decision: managed extension, since this repository contains configuration rather than Pi source. Added to the explicit full-sync deployment manifest; JSON-only sync remains unchanged.
  - Review: reviewer agent was disabled; available delegate completed read-only design/final reviews. Addressed thrown overflow and malformed persisted file data findings.
  - Limits: 64 requests, roughly 1024-character minimum text chunks, 8192 recovery output tokens. High reasoning levels may exhaust output allowance; lower thinking and retry. Other compaction-replacing extensions can override this handler; avoid combining them. Unrecognized thrown provider exceptions fail safely rather than retrying. Multi-pass summaries may cost more and lose detail.
