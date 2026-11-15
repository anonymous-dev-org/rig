#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  if [[ -t 2 && -z ${NO_COLOR+x} && ${TERM:-} != dumb ]]; then
    printf '\033[1;31m❌ [ERROR] Sync failed: Node is required on the parent PATH. Install Node and export its bin directory, then rerun.\033[0m\n' >&2
  else
    printf '❌ [ERROR] Sync failed: Node is required on the parent PATH. Install Node and export its bin directory, then rerun.\n' >&2
  fi
  exit 1
fi
exec node "$SCRIPT_DIR/scripts/rig.mjs" sync "$@"
