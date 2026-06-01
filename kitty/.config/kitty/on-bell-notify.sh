#!/bin/sh

cmdline=${KITTY_CHILD_CMDLINE:-}
text=$(printf '%s' "$cmdline" | tr '\r\n' '  ')

kitten_bin=${KITTY_KITTEN_BIN:-}
if [ -z "$kitten_bin" ]; then
  kitten_bin=$(command -v kitten 2>/dev/null || true)
fi

notify() {
  if [ -n "$kitten_bin" ]; then
    exec "$kitten_bin" notify "$@"
  fi
  if command -v kitty >/dev/null 2>&1; then
    exec kitty +kitten notify "$@"
  fi
  exit 0
}

# Keep native notifications limited to AI CLI bells so normal terminal bells
# stay lightweight while Codex/Claude still reach the lock screen.
case "$cmdline" in
  *codex*)
    /usr/bin/afplay /System/Library/Sounds/Blow.aiff >/dev/null 2>&1 &
    notify \
      --app-name kitty \
      --icon info \
      --sound-name Blow \
      --type codex-bell \
      "Codex" \
      "Needs your attention"
    ;;
  *claude*)
    /usr/bin/afplay /System/Library/Sounds/Blow.aiff >/dev/null 2>&1 &
    notify \
      --app-name kitty \
      --icon info \
      --sound-name Blow \
      --type claude-bell \
      "Claude" \
      "Needs your attention"
    ;;
esac

exit 0
