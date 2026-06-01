#!/bin/bash

POSITIONS=(n e s w)

is_cardinal_position() {
  case "${1:-}" in
    n | e | s | w) return 0 ;;
    *) return 1 ;;
  esac
}

position_index() {
  case "${1:-}" in
    n) echo 0 ;;
    e) echo 1 ;;
    s) echo 2 ;;
    w) echo 3 ;;
    *) echo 0 ;;
  esac
}

workspace_position() {
  local workspace="${1:-}"
  local pos="${workspace:0:1}"
  if is_cardinal_position "$pos"; then
    echo "$pos"
  else
    echo "n"
  fi
}

is_builtin_monitor_name() {
  local name
  name=$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')
  [[ "$name" == *built-in* || "$name" == *retina* || "$name" == *macbook* || "$name" == *"color lcd"* ]]
}

monitor_ids_by_slot() {
  local -a builtin_ids=()
  local -a external_ids=()
  local id name

  while IFS='|' read -r id name; do
    [[ -n "${id:-}" ]] || continue
    if is_builtin_monitor_name "$name"; then
      builtin_ids+=("$id")
    else
      external_ids+=("$id")
    fi
  done < <(aerospace list-monitors --format '%{monitor-id}|%{monitor-name}')

  if ((${#builtin_ids[@]} > 0)); then
    printf '%s\n' "${builtin_ids[@]}" "${external_ids[@]}"
  else
    printf '%s\n' "${external_ids[@]}"
  fi
}

focused_monitor_id() {
  aerospace list-monitors --focused --format '%{monitor-id}' | awk 'NF { print $1; exit }'
}

monitor_id_for_slot() {
  local wanted_slot="$1"
  local slot=1
  local id

  while IFS= read -r id; do
    if [[ "$slot" == "$wanted_slot" ]]; then
      echo "$id"
      return 0
    fi
    slot=$((slot + 1))
  done < <(monitor_ids_by_slot)

  return 1
}

slot_for_monitor_id() {
  local wanted_id="$1"
  local slot=1
  local id

  while IFS= read -r id; do
    if [[ "$id" == "$wanted_id" ]]; then
      echo "$slot"
      return 0
    fi
    slot=$((slot + 1))
  done < <(monitor_ids_by_slot)

  return 1
}

focused_display_slot() {
  local monitor_id
  monitor_id=$(focused_monitor_id)
  slot_for_monitor_id "$monitor_id"
}

workspace_for_position_on_focused_display() {
  local pos="$1"
  local slot
  slot=$(focused_display_slot)
  echo "${pos}${slot}"
}

workspace_has_windows() {
  local workspace="$1"
  local count

  if ! count=$(aerospace list-windows --workspace "$workspace" --count 2>/dev/null); then
    return 1
  fi

  count=$(printf '%s' "$count" | tr -d '[:space:]')
  [[ "${count:-0}" != "0" ]]
}

first_workspace_clockwise() {
  local preferred_pos="$1"
  local slot="$2"
  local start
  local offset
  local pos
  local workspace

  start=$(position_index "$preferred_pos")
  for offset in 0 1 2 3; do
    pos="${POSITIONS[$(((start + offset) % 4))]}"
    workspace="${pos}${slot}"
    if ! workspace_has_windows "$workspace"; then
      echo "$workspace"
      return 0
    fi
  done

  return 1
}

first_occupied_workspace_clockwise() {
  local slot="$1"
  local preferred_pos="${2:-n}"
  local start
  local offset
  local pos
  local workspace

  start=$(position_index "$preferred_pos")
  for offset in 0 1 2 3; do
    pos="${POSITIONS[$(((start + offset) % 4))]}"
    workspace="${pos}${slot}"
    if workspace_has_windows "$workspace"; then
      echo "$workspace"
      return 0
    fi
  done

  echo "n${slot}"
}

normalize_display_workspaces() {
  local slot=1
  local monitor_id
  local pos

  while IFS= read -r monitor_id; do
    for pos in "${POSITIONS[@]}"; do
      aerospace move-workspace-to-monitor --workspace "${pos}${slot}" "$monitor_id" >/dev/null 2>&1 || true
    done
    slot=$((slot + 1))
  done < <(monitor_ids_by_slot)
}

show_preferred_workspace_per_display() {
  local current
  local slot=1
  local monitor_id
  local workspace

  current=$(aerospace list-workspaces --focused 2>/dev/null || true)

  while IFS= read -r monitor_id; do
    workspace=$(first_occupied_workspace_clockwise "$slot")
    aerospace workspace "$workspace" >/dev/null 2>&1 || true
    slot=$((slot + 1))
  done < <(monitor_ids_by_slot)

  if [[ -n "$current" ]]; then
    aerospace workspace "$current" >/dev/null 2>&1 || true
  else
    aerospace workspace n1 >/dev/null 2>&1 || true
  fi
}
