## Overview
- Set up Terminal-Bench on this Apple Silicon Mac and verify one task with Codex, using local Docker and existing ChatGPT login.
- Harbor 0.26.0, Docker 29.8.2, uv and Codex 0.169.0 are already installed. No full benchmark, cloud runner, or results upload.
- Keep downloaded tasks and results outside the repository; document a repeatable command without credentials.

## Todos
- [x] One official Harbor smoke task runs through Codex and its verifier.
  - Requirement: use the official runner, isolated Docker execution, existing authentication and one attempt; distinguish this from a benchmark dataset score.
  - Definition of done: inspect trial result and verifier reward, document rerun instructions, and commit repository notes.
  - Verified: hello-world/hello-world passed with Codex 0.169.0 and gpt-6.1-sol: reward 1.0, one completed trial, zero errors, 2m 11s. CODEX_FORCE_AUTH_JSON=1 used ChatGPT login. No installation changes needed.
  - Results: ~/.local/share/terminal-bench/jobs/codex-smoke-20261116-231852/result.json; reward.txt is 1. Instructions: terminal-bench/README.md.
  - First-version scope: actual terminal-bench@2.0 tasks and their ARM/x86 image compatibility remain unverified. Suggest one real dataset task next before a suite.
  - Scout confirmed installed-source CLI/auth behavior but lacked web/shell tools; parent fetched official quick-start docs and ran the smoke test.
