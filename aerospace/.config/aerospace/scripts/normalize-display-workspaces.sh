#!/bin/bash
# Keep cardinal workspaces attached to stable display slots.
# Slot 1 is the Mac built-in display when present; external displays follow it.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/display-workspaces-lib.sh"

normalize_display_workspaces

if [[ "${1:-}" == "--show" ]]; then
  show_preferred_workspace_per_display
fi
