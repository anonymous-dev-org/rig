#!/bin/bash
set -euo pipefail
# Kitty's single-instance protocol creates AND focuses a new OS window in the
# existing process. open's native activation also covers the first launch.
exec open -na kitty --args --single-instance --start-as normal --directory "$HOME"
