#!/bin/bash
app="$HOME/.config/aerospace/scripts/notification-picker-app"
pkill -fx "$app" >/dev/null 2>&1 && exit 0
exec "$app"
