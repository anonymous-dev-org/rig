#!/bin/bash
# Select a shared group, retaining the cardinal direction.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/workspace-groups-lib.sh"
group="${1:-}"
[[ "$group" =~ ^[1-9]$ ]] || { echo "usage: $(basename "$0") <1..9>" >&2; exit 1; }
current=$(aerospace list-workspaces --focused)
aerospace workspace "$(workspace_for_position "$(workspace_position "$current")" "$group")"
