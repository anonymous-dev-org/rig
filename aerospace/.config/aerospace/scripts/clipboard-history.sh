#!/bin/bash
set -euo pipefail

scripts_dir="$HOME/.config/aerospace/scripts"
daemon_bin="$scripts_dir/clipboard-daemon-app"
history_bin="$scripts_dir/clipboard-history-app"
history_file="$HOME/.clipboard-history.json"

ensure_daemon() {
  if pgrep -fx "$daemon_bin" >/dev/null 2>&1; then
    return
  fi

  if [[ -x "$daemon_bin" ]]; then
    "$daemon_bin" >/dev/null 2>&1 &
  fi

  for _ in {1..20}; do
    if pgrep -fx "$daemon_bin" >/dev/null 2>&1; then
      break
    fi
    sleep 0.1
  done

  [[ -e "$history_file" ]] || printf '[]' >"$history_file"
}

pkill -fx "$history_bin" >/dev/null 2>&1 && exit 0

ensure_daemon
exec "$history_bin"
