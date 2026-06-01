#!/bin/bash
set -euo pipefail

if ! pgrep -x Safari >/dev/null; then
  open -a Safari
  exit 0
fi

osascript <<'EOF'
tell application "Safari"
  make new document
end tell
tell application "System Events"
  tell process "Safari" to set frontmost to true
end tell
EOF
