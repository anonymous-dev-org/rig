#!/bin/bash
# Find the next unused workspace row and switch to its first desktop.
# A workspace is "unused" if none of its desktops (N.1 through N.9) have windows.

occupied=$(aerospace list-workspaces --monitor all --empty no)

for g in $(seq 1 9); do
    ws_used=false
    for d in $(seq 1 9); do
        if echo "$occupied" | grep -qx "${g}\.${d}"; then
            ws_used=true
            break
        fi
    done
    if ! $ws_used; then
        aerospace workspace "${g}.1"
        exit 0
    fi
done

osascript -e 'display notification "All 9 workspaces are in use" with title "AeroSpace"'
