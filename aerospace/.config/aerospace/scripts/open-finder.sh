#!/bin/bash
set -euo pipefail
osascript - "$HOME" <<'APPLESCRIPT'
on run argv
  tell application "Finder"
    set newWindow to make new Finder window
    set target of newWindow to (POSIX file (item 1 of argv) as alias)
    set index of newWindow to 1
    activate
  end tell
end run
APPLESCRIPT
