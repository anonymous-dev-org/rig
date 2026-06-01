#!/bin/bash
# Jump to a cardinal desktop on the currently focused display.
# Workspaces are named <position><display-slot>, e.g. n1, e2.
# Display slot 1 is always the Mac built-in display when present.
# Usage: switch-workspace.sh <n|e|s|w>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/display-workspaces-lib.sh"

pos="${1:-}"
if ! is_cardinal_position "$pos"; then
    echo "usage: $(basename "$0") <n|e|s|w>" >&2
    exit 1
fi

normalize_display_workspaces
aerospace workspace "$(workspace_for_position_on_focused_display "$pos")"
