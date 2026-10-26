#!/bin/bash
# Shared global workspace contract: n/e/s/w, then n2/e2/s2/w2 through 9.
POSITIONS=(n e s w)

is_cardinal_position() {
  case "${1:-}" in n | e | s | w) return 0 ;; *) return 1 ;; esac
}

is_cardinal_workspace() {
  [[ "${1:-}" =~ ^[nesw][2-9]?$ ]]
}

workspace_position() {
  if is_cardinal_workspace "${1:-}"; then echo "${1:0:1}"; else echo n; fi
}

workspace_group() {
  if is_cardinal_workspace "${1:-}" && [[ ${#1} == 2 ]]; then
    echo "${1:1:1}"
  else
    echo 1
  fi
}

workspace_for_position() {
  local pos="$1" group="${2:-1}"
  is_cardinal_position "$pos" && [[ "$group" =~ ^[1-9]$ ]] || return 1
  if [[ "$group" == 1 ]]; then echo "$pos"; else echo "${pos}${group}"; fi
}

focused_workspace_group() {
  workspace_group "$(aerospace list-workspaces --focused)"
}

workspace_has_windows() {
  local count
  # A failed query is not evidence that a workspace is empty.
  count=$(aerospace list-windows --workspace "$1" --count) || return 2
  count=$(printf '%s' "$count" | tr -d '[:space:]')
  [[ "$count" =~ ^[0-9]+$ ]] || return 2
  [[ "$count" != 0 ]]
}

# Next-empty picker, clockwise within this global group's four workspaces.
first_workspace_clockwise() {
  local preferred="$1" group="${2:-1}" start=0 offset workspace status
  case "$preferred" in n) start=0 ;; e) start=1 ;; s) start=2 ;; w) start=3 ;; esac
  for offset in 0 1 2 3; do
    workspace=$(workspace_for_position "${POSITIONS[$(((start + offset) % 4))]}" "$group") || return 1
    if workspace_has_windows "$workspace"; then
      continue
    else
      status=$?
      [[ "$status" == 1 ]] || return "$status"
      echo "$workspace"
      return 0
    fi
  done
  return 1
}
