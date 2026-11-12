#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node is required on the parent PATH. Install Node and export its bin directory, then rerun.' >&2
  exit 1
fi
exec node "$SCRIPT_DIR/scripts/rig.mjs" sync "$@"
