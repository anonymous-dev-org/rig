#!/bin/bash
# Send to the destination monitor's visible workspace and follow the window.
# Never relocate or rename a global workspace to match a display.
set -euo pipefail
target="${1:-}"
case "$target" in
  left | down | up | right | next | prev) ;;
  *) echo "usage: $(basename "$0") <left|down|up|right|next|prev>" >&2; exit 1 ;;
esac
if [[ "$target" == next || "$target" == prev ]]; then
  aerospace move-node-to-monitor --focus-follows-window --wrap-around "$target"
else
  aerospace move-node-to-monitor --focus-follows-window "$target"
fi
