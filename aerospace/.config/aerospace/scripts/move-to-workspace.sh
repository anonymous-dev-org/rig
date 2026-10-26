#!/bin/bash
# Send the focused window to a shared cardinal workspace without following.
# Uses the focused workspace group; noncanonical names default to group 1.
# Usage: move-to-workspace.sh <n|e|s|w>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/workspace-groups-lib.sh"

pos="${1:-}"
if ! is_cardinal_position "$pos"; then
    echo "usage: $(basename "$0") <n|e|s|w>" >&2
    exit 1
fi

aerospace move-node-to-workspace "$(workspace_for_position "$pos" "$(focused_workspace_group)")"
