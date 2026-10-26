#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
export HOME="$TMP/home with spaces and 'quotes'" LOG="$TMP/log"
mkdir -p "$TMP/bin" "$HOME"
cat > "$TMP/bin/osascript" <<'MOCK'
#!/bin/bash
printf '%s\n' "$@" > "$LOG.args"
cat > "$LOG"
exit "${MOCK_STATUS:-0}"
MOCK
cat > "$TMP/bin/open" <<'MOCK'
#!/bin/bash
printf '%s\n' "$@" > "$LOG.args"
exit "${MOCK_STATUS:-0}"
MOCK
chmod +x "$TMP/bin/"*
export PATH="$TMP/bin:$PATH"
SCRIPTS="$ROOT/aerospace/.config/aerospace/scripts"
bash "$SCRIPTS/open-safari.sh"
grep -q 'make new document' "$LOG"
grep -q 'activate' "$LOG"
! grep -q 'System Events' "$LOG"
bash "$SCRIPTS/open-finder.sh"
[[ "$(tail -1 "$LOG.args")" == "$HOME" ]]
grep -q 'make new Finder window' "$LOG"
grep -q 'set index of newWindow to 1' "$LOG"
grep -q 'activate' "$LOG"
bash "$SCRIPTS/open-kitty.sh"
[[ "$(tail -1 "$LOG.args")" == "$HOME" ]]
grep -qx -- '--single-instance' "$LOG.args"
grep -qx -- 'normal' "$LOG.args"
for app in safari finder kitty; do
  if MOCK_STATUS=7 bash "$SCRIPTS/open-$app.sh"; then echo "$app swallowed failure"; exit 1; fi
done
"${PYTHON:-python3}" - "$ROOT/aerospace/.aerospace.toml" <<'PY'
import sys, tomllib
with open(sys.argv[1], 'rb') as f: config = tomllib.load(f)
for key, app in [('alt-s', 'safari'), ('alt-f', 'finder'), ('alt-t', 'kitty')]:
    main = config['mode']['main']['binding'][key]
    assert main == config['mode']['resize']['binding'][key]
    assert main == f'exec-and-forget "$HOME/.config/aerospace/scripts/open-{app}.sh"'
PY
echo 'AeroSpace launcher tests passed (no apps opened)'
