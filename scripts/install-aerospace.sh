#!/usr/bin/env bash
# Install only the explicit helper manifest; TOML publication has its own owner.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/aerospace"
DEST="$HOME/.config/aerospace/scripts"
helpers=(auto-grid focus-display.sh move-to-display.sh move-to-workspace.sh new-workspace.sh open-finder.sh open-kitty.sh open-safari.sh switch-group.sh switch-workspace.sh workspace-groups-lib.sh)

safe_dir() {
  local cursor="$1"
  while :; do
    [[ ! -L "$cursor" ]] || { echo "Refusing directory symlink: $cursor" >&2; return 1; }
    [[ ! -e "$cursor" || -d "$cursor" ]] || { echo "Not a directory: $cursor" >&2; return 1; }
    [[ "$cursor" != / ]] || break
    cursor="$(dirname "$cursor")"
  done
}

command -v bun >/dev/null || { echo 'Bun with TOML.parse/stringify is required' >&2; exit 1; }
safe_dir "$DEST"
# Check the whole manifest before either independent publication step.
for name in "${helpers[@]}"; do
  src="$SOURCE/.config/aerospace/scripts/$name"
  dest="$DEST/$name"
  [[ -f "$src" && -x "$src" ]] || { echo "Missing/non-executable AeroSpace helper: $name" >&2; exit 1; }
  if [[ -e "$dest" || -L "$dest" ]]; then
    [[ -L "$dest" && "$(readlink "$dest")" == "$src" ]] || { echo "Preserving conflicting helper; reconcile manually: $dest" >&2; exit 1; }
  fi
done
bun "$ROOT/scripts/sync-toml.mjs" aerospace
mkdir -p "$DEST"
for name in "${helpers[@]}"; do
  safe_dir "$DEST"
  src="$SOURCE/.config/aerospace/scripts/$name"
  dest="$DEST/$name"
  if [[ -L "$dest" && "$(readlink "$dest")" == "$src" ]]; then continue; fi
  # ln without force refuses any concurrent insertion rather than overwriting it.
  ln -s "$src" "$dest"
done
for name in display-workspaces-lib.sh normalize-display-workspaces.sh; do
  dest="$DEST/$name"
  safe_dir "$DEST"
  if [[ -L "$dest" && "$(readlink "$dest")" == "$SOURCE/.config/aerospace/scripts/$name" ]]; then rm "$dest"; fi
done
echo '✓ AeroSpace private TOML published and helper manifest installed (not activated)'
echo 'Confirm the intended active path is ~/.aerospace.toml, then validate and activate explicitly:'
echo '  aerospace config --config-path'
echo '  aerospace reload-config --dry-run --no-gui'
echo '  # Only after validation succeeds: aerospace reload-config --no-gui'
echo 'A custom --config-path launch override requires manual reconciliation/relaunch; publication does not change it.'
