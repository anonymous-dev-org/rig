#!/bin/bash
# Select a group on the focused display, retaining the cardinal direction.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/display-workspaces-lib.sh"
group="${1:-}"
[[ "$group" =~ ^[1-9]$ ]] || { echo "usage: $(basename "$0") <1..9>" >&2; exit 1; }
normalize_display_workspaces
current=$(aerospace list-workspaces --focused)
aerospace workspace "$(workspace_for_position_on_display "$(workspace_position "$current")" "$(focused_display_slot)" "$group")"
