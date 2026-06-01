#!/bin/bash
# Move the focused window to a 3x3 grid position on the focused monitor.
# Workspaces are named <position><monitor-index>, e.g. nw1, c1, se2.
# Usage: move-to-workspace.sh <nw|n|ne|w|c|e|sw|s|se>

set -euo pipefail

pos="${1:-}"
case "$pos" in
    nw|n|ne|w|c|e|sw|s|se) ;;
    *) echo "usage: $(basename "$0") <nw|n|ne|w|c|e|sw|s|se>" >&2; exit 1 ;;
esac

mon=$(aerospace list-monitors --focused | awk '{print $1; exit}')
aerospace move-node-to-workspace "${pos}${mon}"
