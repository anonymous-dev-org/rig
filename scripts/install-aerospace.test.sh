#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
export HOME="$TMP/home" XDG_CONFIG_HOME="$TMP/xdg"
mkdir -p "$HOME/.config/aerospace/scripts" "$XDG_CONFIG_HOME/aerospace" "$TMP/bin"
export PATH="$TMP/bin:$PATH"
cat > "$TMP/bin/pgrep" <<'MOCK'
#!/bin/bash
[[ "${RUNNING:-yes}" == yes ]]
MOCK
cat > "$TMP/bin/aerospace" <<'MOCK'
#!/bin/bash
if [[ "$1" == reload-config ]]; then exit "${RELOAD_STATUS:-0}"; fi
printf '%s\n' "${ACTIVE:-$HOME/.aerospace.toml}"
MOCK
chmod +x "$TMP/bin/"*
printf old > "$HOME/.aerospace.toml"
printf alternate > "$XDG_CONFIG_HOME/aerospace/aerospace.toml"
printf alternate > "$HOME/.config/aerospace/aerospace.toml"
printf helper > "$HOME/.config/aerospace/scripts/switch-group.sh"
printf unrelated > "$HOME/.config/aerospace/keep"
run() { bash "$ROOT/scripts/install-aerospace.sh" > "$TMP/log" 2>&1; }
run
[[ -L "$HOME/.aerospace.toml" ]]
[[ "$(find "$HOME" "$XDG_CONFIG_HOME" -name '*.backup-*' | wc -l | tr -d ' ')" == 4 ]]
[[ "$(< "$HOME/.config/aerospace/keep")" == unrelated ]]
run
[[ "$(find "$HOME" "$XDG_CONFIG_HOME" -name '*.backup-*' | wc -l | tr -d ' ')" == 4 ]]
if ACTIVE=/bundled/default.toml run; then echo 'Mismatch accepted'; exit 1; fi
grep -q 'custom --config-path' "$TMP/log"
if RELOAD_STATUS=1 run; then echo 'Reload failure accepted'; exit 1; fi
grep -q 'reload/parse failed' "$TMP/log"
RUNNING=no run; grep -q 'app not running' "$TMP/log"
mv "$TMP/bin/aerospace" "$TMP/aerospace"
# Restrict PATH so an installed host CLI cannot leak into this test.
mkdir "$TMP/system"
for cmd in bash dirname date mkdir ln mv basename readlink; do ln -s "$(command -v "$cmd")" "$TMP/system/$cmd"; done
PATH="$TMP/system" run; grep -q 'CLI missing' "$TMP/log"
mv "$TMP/aerospace" "$TMP/bin/aerospace"
# A folded scripts link must be detached without changing its source.
rm -rf "$HOME/.config/aerospace/scripts"
mkdir "$TMP/original"
printf private > "$TMP/original/switch-group.sh"
printf user > "$TMP/original/normalize-display-workspaces.sh"
ln -s "$TMP/original" "$HOME/.config/aerospace/scripts"
run
[[ "$(< "$TMP/original/switch-group.sh")" == private ]]
[[ -f "$HOME/.config/aerospace/scripts/normalize-display-workspaces.sh" ]]
rm "$HOME/.config/aerospace/scripts/normalize-display-workspaces.sh"
ln -s "$ROOT/aerospace/.config/aerospace/scripts/normalize-display-workspaces.sh" "$HOME/.config/aerospace/scripts/normalize-display-workspaces.sh"
run
[[ ! -L "$HOME/.config/aerospace/scripts/normalize-display-workspaces.sh" ]]
[[ ! -e "$HOME/README.md" && ! -e "$HOME/tests" ]]
echo 'AeroSpace installer tests passed'
