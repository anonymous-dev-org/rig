## Overview
- Goal: the model passes `lines: [...]` straight to `edit` without scripting indentation; the edit tool formats the file afterwards like an editor's format on save.
- In scope: background format job in `pi/.pi/agent/extensions/line-file-tools/index.ts`, model guidance, README. Out of scope: indentation inference, other save actions (lint autofix, organise imports), the stock `write` tool.
- Decisions (agreed with user):
  - Format only when the project opted in: a Biome, Prettier or Oxfmt (oxc.rs) config file in a directory above the edited file. Nearest config wins.
  - Fully async: edit returns at once. The job runs in the same per-file queue as reads/edits, so they wait for it. Failure, timeout (10 s) or empty output is ignored.
  - Snapshots are not touched by the formatter. A line it changed is rejected on the next edit by the normal per-line check.
- Own decisions:
  - Formatter gets the file on stdin and the tool writes stdout back only if the file is still what was sent, so an outside change during formatting is not overwritten.
  - Edit result names the files being formatted, so the model knows when approximate indentation is acceptable.
  - Binary: nearest `node_modules/.bin/<name>`, else PATH.

## Todos
- [x] Edits are formatted in the background in opted-in projects.
  - Verified with a throwaway script calling the registered tools: all four definition-of-done cases behaved as stated with Biome 2.6.7; Oxfmt formatted an unindented splice. Prettier path not exercised (not installed here).
  - Requirement: as in Overview; no behaviour change for projects without a formatter config.
  - Definition of done: in a temp Biome project, an unindented splice ends up formatted; an immediate second edit waits and is rejected only on formatter-changed lines; no config or a broken formatter leaves the file as edited and the edit still succeeds.
  - Shortcoming: lines the model wrote and the formatter re-indented need a reread before they can be edited again. Suggestion: refresh the snapshot when only whitespace changed and the line count is the same.
  - Shortcoming: a `prettier` key in `package.json` and formatters without a config file (gofmt, rustfmt, ruff) are not detected. Suggestion: add them, or an override file, when needed.
  - Suggestion: no lasting tests exist for this extension; the queue/snapshot interplay would justify some.
