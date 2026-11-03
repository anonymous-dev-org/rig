#!/bin/bash
set -euo pipefail
if ! command -v node >/dev/null 2>&1; then
  echo "macOS preferences require Node.js. Install Node.js and rerun macos/defaults.sh." >&2
  exit 1
fi
exec node "$(cd -- "$(dirname -- "$0")" && pwd)/sync-defaults.mjs" "$@"
