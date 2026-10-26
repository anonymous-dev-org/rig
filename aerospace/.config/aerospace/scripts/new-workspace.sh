#!/bin/bash
# Switch to the next empty cardinal workspace in the current shared group.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/workspace-groups-lib.sh"

current=$(aerospace list-workspaces --focused)
preferred=$(workspace_position "$current")

if workspace=$(first_workspace_clockwise "$preferred" "$(workspace_group "$current")"); then
    aerospace workspace "$workspace"
    exit 0
else
    status=$?
    [[ "$status" == 1 ]] || exit "$status"
fi
osascript -e 'display notification "All 4 desktops in this group are in use" with title "AeroSpace"'
