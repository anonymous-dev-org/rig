#!/bin/bash
# Switch to the next empty cardinal desktop on the focused display.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/display-workspaces-lib.sh"

normalize_display_workspaces

current=$(aerospace list-workspaces --focused)
slot=$(focused_display_slot)
preferred=$(workspace_position "$current")

if workspace=$(first_workspace_clockwise "$preferred" "$slot"); then
    aerospace workspace "$workspace"
    exit 0
fi

osascript -e 'display notification "All 4 desktops on this display are in use" with title "AeroSpace"'
