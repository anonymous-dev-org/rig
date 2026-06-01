#!/bin/bash
# Move focused window to next/prev cardinal desktop on the focused display.
# Usage: move-to-desktop.sh <next|prev>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/display-workspaces-lib.sh"

normalize_display_workspaces

current=$(aerospace list-workspaces --focused)
pos=$(workspace_position "$current")
slot=$(focused_display_slot)
idx=$(position_index "$pos")

if [[ "$1" == "next" ]]; then
    idx=$(( (idx + 1) % 4 ))
elif [[ "$1" == "prev" ]]; then
    idx=$(( (idx - 1 + 4) % 4 ))
else
    exit 1
fi

aerospace move-node-to-workspace "${POSITIONS[$idx]}${slot}"
