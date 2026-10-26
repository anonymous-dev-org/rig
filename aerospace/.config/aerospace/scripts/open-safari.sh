#!/bin/bash
set -euo pipefail
# Native activation works on first launch too; do not depend on System Events.
osascript <<'APPLESCRIPT'
tell application "Safari"
  make new document
  activate
end tell
APPLESCRIPT
