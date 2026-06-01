#!/bin/bash
# Move the focused window to another display.
# The destination desktop keeps the same cardinal position as the source.
# AeroSpace handles multiple windows inside that workspace by tiling them.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/display-workspaces-lib.sh"

target="${1:-}"
case "$target" in
  left | down | up | right | next | prev) ;;
  *) echo "usage: $(basename "$0") <left|down|up|right|next|prev>" >&2; exit 1 ;;
esac

normalize_display_workspaces

window_id=$(aerospace list-windows --focused --format '%{window-id}' | awk 'NF { print $1; exit }')
source_workspace=$(aerospace list-workspaces --focused)
source_position=$(workspace_position "$source_workspace")

if [[ "$target" == "next" || "$target" == "prev" ]]; then
  aerospace focus-monitor --wrap-around "$target"
else
  aerospace focus-monitor "$target"
fi

target_slot=$(focused_display_slot)
target_workspace="${source_position}${target_slot}"

aerospace move-node-to-workspace --window-id "$window_id" "$target_workspace"
aerospace workspace "$target_workspace"
aerospace focus --window-id "$window_id" >/dev/null 2>&1 || true
