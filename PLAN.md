## Overview
- Support mixed multi-file guarded edits and teach the model the request format; retain single-file compatibility.
- Validate every file before writing; disk-write failures can still partially apply a batch. Reject duplicate resolved paths (including hard-link aliases).
- Preserve the merged sync-output task notes below; updating from main conflicted only in this shared plan. No source conflicts.

## Todos
- [x] Multi-file edits work with existing freshness guarantees and clear model guidance.
  - Requirement: nonempty edits array, exactly one mode per file, no mixing batch and single-file fields, deterministic mutation locking, validation before writes, actionable partial-write errors.
  - Definition of done: direct tool exercises cover mixed success, validation rejection without writes, aliases, legacy calls, and model-facing schema/instructions; existing checks assessed; commit changes.
  - Verified: direct registered-tool calls passed mixed changes/splices, legacy calls, invalid/stale/missing snapshots without writes, alias rejection, reversed overlapping batches, cancellation, lifecycle reset, and empty files. Injected partial-write failure confirmed completed/failed paths, untouched later files, and snapshot handling.
  - Model guidance is in schema descriptions, tool description, prompt snippet/guidelines, managed AGENTS.md, and README examples. Existing optional-field schema style retained for provider compatibility; cross-field constraints checked at execution.
  - Existing settings suite: 41/43 passed; both failures reproduced on unchanged main (--headless expectation and missing init.sh). Logs: .local/sync-tests.log and .local/base-sync-tests.log.
  - No live installation changed. Try via pi --no-extensions -e <worktree>/pi/.pi/agent/extensions/line-file-tools/index.ts in a new session.
  - Follow-up suggestion: retain focused regression tests if requested; current verification scripts are throwaway, not committed.
  - Public schema checks passed both request formats and rejected empty batches, missing entry paths, and invalid splice coordinates. Independent reviewer found no issues.
- [x] Tool descriptions are short and say what each tool does and how to call it.
  - Requirement: rewrite read/edit descriptions, prompt snippets, edit guidelines and schema field descriptions; no behavior change; drop internals the model cannot act on (hashes, terminator rules), which stay in the README.
  - Definition of done: extension loads, schema accepts both formats, descriptions printed for review; commit.
  - Per-field usage moved into schema descriptions (start, deleteCount, lines, changes, edits) so the main description covers only call shape, mode choice and failure handling.
  - Added the case that failed twice in this session: replacing lines and inserting in the same file. Description and the exactly-one error now say to use splices for all of it and to omit, not empty, the unused field.
  - Suggestion: the reread policy still says to attempt edits below an insertion and reread on rejection. Telling the model to reread those ranges up front would save a rejected call; left unchanged because it is the benchmarked policy.
- [x] Clean sync output end to end.
  - Requirement: readable progress, green successes/red failures on terminals, actual subprocess errors, plain redirected output and explicit preview outcomes.
  - Definition of done: syntax/diff checks and isolated preview, apply, repeat, component failure, subprocess failure, quiet success, plain output, and green/red pseudo-terminal checks passed. Existing checks evaluated below.
  - Use captured subprocess output to suppress successful tool chatter; print it only on failure. Keep file operations as indented details.
  - Existing Pi checks: 41 passed; two unrelated failures expect removed `--headless` and missing `init.sh`.
  - Verified with isolated HOME and fake Brew commands; no real package installation or personal configuration changes.
  - Captured commands retain up to 64 MiB; long-running commands show their step, not live tool output.
