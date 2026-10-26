#!/bin/bash
# Safe: all script CLI calls are exported shell mocks, never real windows.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.config/aerospace/scripts" && pwd)
source "$ROOT/workspace-groups-lib.sh"
log=$(mktemp)
trap 'rm -f "$log"' EXIT
export log FOCUSED=e3 OCCUPIED='e3 s3' QUERY_FAIL=0
aerospace() {
  case "$1" in
    list-workspaces) [[ "$2" == --focused ]]; echo "$FOCUSED" ;;
    list-windows)
      [[ "$QUERY_FAIL" == 0 ]] || return 1
      case " $OCCUPIED " in *" $3 "*) echo 1 ;; *) echo 0 ;; esac ;;
    list-monitors|move-workspace-to-monitor|summon-workspace)
      echo "unexpected display routing: $*" >&2; return 99 ;;
    *) printf '%s\n' "$*" >> "$log" ;;
  esac
}
export -f aerospace
same() { [[ "$1" == "$2" ]] || { printf 'expected %s, got %s\n' "$2" "$1" >&2; exit 1; }; }
for group in {1..9}; do
  for pos in n e s w; do
    ws=$(workspace_for_position "$pos" "$group")
    expected="$pos"; [[ "$group" == 1 ]] || expected="$pos$group"
    same "$ws" "$expected"
    same "$(workspace_group "$ws")" "$group"
    same "$(workspace_position "$ws")" "$pos"
  done
done
for bad in n1 n01 n-g2 e2-g3 n10 n2-g02 notes e2garbage '' n0; do
  if is_cardinal_workspace "$bad"; then echo "accepted malformed $bad"; exit 1; fi
  same "$(workspace_group "$bad")" 1
  same "$(workspace_position "$bad")" n
done
same "$(workspace_group)" 1
bash "$ROOT/switch-group.sh" 4
bash "$ROOT/switch-workspace.sh" w
bash "$ROOT/move-to-workspace.sh" s
FOCUSED=w9 bash "$ROOT/switch-group.sh" 1
FOCUSED=notes bash "$ROOT/switch-group.sh" 2
FOCUSED=e2-g3 bash "$ROOT/switch-workspace.sh" e
bash "$ROOT/new-workspace.sh"
same "$(first_workspace_clockwise e 3)" w3
OCCUPIED='n3 e3 s3 w3'
if first_workspace_clockwise e 3; then echo 'accepted full group'; exit 1; fi
OCCUPIED=''
QUERY_FAIL=1
if first_workspace_clockwise n 3; then echo 'accepted failed query'; exit 1; else same "$?" 2; fi
QUERY_FAIL=0
bash "$ROOT/focus-display.sh" next
bash "$ROOT/focus-display.sh" left
bash "$ROOT/move-to-display.sh" next
bash "$ROOT/move-to-display.sh" right
expected=$(printf '%s\n' 'workspace e4' 'workspace w3' 'move-node-to-workspace s3' 'workspace w' 'workspace n2' 'workspace e' 'workspace w3' 'focus-monitor --wrap-around next' 'focus-monitor left' 'move-node-to-monitor --focus-follows-window --wrap-around next' 'move-node-to-monitor --focus-follows-window right')
same "$(<"$log")" "$expected"
for script in switch-group switch-workspace move-to-workspace focus-display move-to-display; do
  if bash "$ROOT/$script.sh" invalid 2>/dev/null; then exit 1; fi
done
echo 'workspace groups: passed (mock CLI only)'
