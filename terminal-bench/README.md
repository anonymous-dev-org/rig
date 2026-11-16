# Terminal-Bench on this Mac

Terminal-Bench runs terminal tasks in isolated Linux environments. Its current runner is [Harbor](https://docs.harborframework.com/getting-started/installation.md). Docker Desktop must be running; tasks and results stay outside rig. No rig sync changes are needed.

## Installed and verified

On this Apple Silicon Mac: Harbor 0.26.0 (installed through uv), Docker 29.8.2, Docker Compose 5.5.0, and Codex CLI 0.169.0. Codex is signed in with ChatGPT (`codex login status`).

The [official quick-start](https://docs.harborframework.com/getting-started/quickstart.md) hello-world task passed with Codex and `openai/gpt-6.1-sol`: one trial, reward **1.0**, zero errors, runtime **2m 11s**. This verifies the runner, Docker, authentication, Codex execution, and verifier. It is **not a Terminal-Bench dataset score**.

Results: `~/.local/share/terminal-bench/jobs/codex-smoke-20261116-231852/result.json`. Full console log: `~/.local/share/terminal-bench/smoke.log`.

## Repeat the smoke test

```sh
mkdir -p "$HOME/.local/share/terminal-bench/jobs"
CODEX_FORCE_AUTH_JSON=1 harbor run \
  -t hello-world/hello-world \
  -a codex -m openai/gpt-6.1-sol \
  --ak version=0.169.0 -n 1 -k 1 \
  --jobs-dir "$HOME/.local/share/terminal-bench/jobs" \
  --job-name "codex-smoke-$(date +%Y%m%d-%H%M%S)"
```

`CODEX_FORCE_AUTH_JSON=1` tells Harbor to use `~/.codex/auth.json` rather than requiring an OpenAI API key. Harbor forwards that credential into its isolated Codex home. Only run trusted tasks with account credentials. Do not copy authentication files into this repository. Runs consume your account allowance; Harbor's estimated API cost is not proof of a separate API charge.

Inspect saved runs with:

```sh
harbor view "$HOME/.local/share/terminal-bench/jobs"
```

## Next: actual benchmark tasks

A one-task dataset run uses the following syntax (not yet verified on this Mac):

```sh
CODEX_FORCE_AUTH_JSON=1 harbor run \
  -d terminal-bench@2.0 -l 1 \
  -a codex -m openai/gpt-6.1-sol \
  --ak version=0.169.0 -n 1 -k 1 \
  --jobs-dir "$HOME/.local/share/terminal-bench/jobs"
```

Add `-i TASK_NAME` to select a particular task; `-t` instead selects a standalone registry task. Actual benchmark tasks can require large image downloads and x86 emulation on Apple Silicon. Passing hello-world does not establish compatibility with every dataset image. Start with one task before increasing concurrency or running a suite. Results stay local unless explicitly uploaded.
