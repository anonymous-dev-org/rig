#!/bin/bash
# Move focused window to next/prev desktop within workspace (stay in place, wraps).
# Usage: move-to-desktop.sh <next|prev>

current=$(aerospace list-workspaces --focused)
ws="${current%%.*}"
dt="${current##*.}"

# All 9 desktops always exist in a workspace row
desktops=(1 2 3 4 5 6 7 8 9)
idx=$(( dt - 1 ))

if [[ "$1" == "next" ]]; then
    idx=$(( (idx + 1) % 9 ))
elif [[ "$1" == "prev" ]]; then
    idx=$(( (idx - 1 + 9) % 9 ))
else
    exit 1
fi

aerospace move-node-to-workspace "${ws}.${desktops[$idx]}"
