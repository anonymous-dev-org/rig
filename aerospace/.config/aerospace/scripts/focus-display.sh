#!/bin/bash
# Focus another display and land on that display's current cardinal desktop.

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

if [[ "$target" == "next" || "$target" == "prev" ]]; then
  aerospace focus-monitor --wrap-around "$target"
else
  aerospace focus-monitor "$target"
fi

slot=$(focused_display_slot)
focused_workspace=$(aerospace list-workspaces --focused)

case "$focused_workspace" in
  n"$slot" | e"$slot" | s"$slot" | w"$slot") ;;
  *) aerospace workspace "$(first_occupied_workspace_clockwise "$slot")" ;;
esac
