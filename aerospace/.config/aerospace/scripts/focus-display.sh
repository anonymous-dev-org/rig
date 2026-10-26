#!/bin/bash
# Native display focus; retain the destination's visible workspace.
set -euo pipefail
target="${1:-}"
case "$target" in
  left | down | up | right | next | prev) ;;
  *) echo "usage: $(basename "$0") <left|down|up|right|next|prev>" >&2; exit 1 ;;
esac
if [[ "$target" == next || "$target" == prev ]]; then
  aerospace focus-monitor --wrap-around "$target"
else
  aerospace focus-monitor "$target"
fi
