#!/bin/bash
# Safe: all CLI calls are shell mocks, including subprocess script entrypoints.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.config/aerospace/scripts" && pwd)
source "$ROOT/display-workspaces-lib.sh"
log=$(mktemp)
trap 'rm -f "$log"' EXIT
export log
export FOCUSED=e2-g3
export MONITOR=20
aerospace() {
  case "$1 $2" in
    'list-monitors --focused') echo "$MONITOR" ;;
    'list-monitors --format') printf '20|External\n10|Built-in Retina\n' ;;
    'list-workspaces --focused') echo "$FOCUSED" ;;
    'list-workspaces --all') printf 'n\ne2\ne2-g3\nn-g2\nnotes\nn1\nn2-g01\nw3-g9\n' ;;
    'focus-monitor --wrap-around') MONITOR=10; FOCUSED=w-g2 ;;
    'list-windows --focused') echo 42 ;;
    'list-windows --workspace') echo 0 ;;
    *) printf '%s\n' "$*" >> "$log" ;;
  esac
}
export -f aerospace
same() { [[ "$1" == "$2" ]] || { printf 'expected %s, got %s\n' "$2" "$1" >&2; exit 1; }; }
same "$(workspace_group e2-g3)" 3
same "$(workspace_group e2)" 1
same "$(workspace_for_position_on_display w 2 9)" w2-g9
same "$(workspace_for_position_on_focused_display n)" n2-g3
for bad in n1 n01 n-g1 n2-g10 n2-g02 notes e2garbage '' n0; do
  if is_cardinal_workspace "$bad"; then echo "accepted malformed $bad"; exit 1; fi
  same "$(workspace_group "$bad")" 1
  same "$(workspace_position "$bad")" n
done
normalize_display_workspaces
grep -qx 'move-workspace-to-monitor --workspace e2-g3 20' "$log"
grep -qx 'move-workspace-to-monitor --workspace n-g2 10' "$log"
! grep -Eq 'notes|n1|n2-g01|w3-g9' "$log"
bash "$ROOT/switch-group.sh" 4
grep -qx 'workspace e2-g4' "$log"
bash "$ROOT/switch-workspace.sh" w
grep -qx 'workspace w2-g3' "$log"
bash "$ROOT/move-to-workspace.sh" s
grep -qx 'move-node-to-workspace s2-g3' "$log"
FOCUSED=notes bash "$ROOT/switch-group.sh" 1
grep -qx 'workspace n2' "$log"
bash "$ROOT/move-to-display.sh" next
grep -qx 'move-node-to-workspace --window-id 42 e-g3' "$log"
bash "$ROOT/focus-display.sh" next
# Destination display retains its own group, not the source group.
! grep -qx 'workspace w' "$log"
same "$(first_workspace_clockwise n 2 3)" n2-g3
if bash "$ROOT/switch-group.sh" 0 2>/dev/null; then exit 1; fi
echo 'workspace groups: passed (mock CLI only)'
