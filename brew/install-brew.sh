#!/bin/bash
# Shared orchestration owns controls and prerequisite checks. No bootstrap side effects.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/../init.sh" --components brew "$@"
