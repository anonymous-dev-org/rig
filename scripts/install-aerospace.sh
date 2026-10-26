#!/bin/bash
# Explicit manifest installer: never stow package docs/tests into HOME.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/aerospace"

backup() {
  local path="$1" dest="${1}.backup-$(date +%Y%m%d-%H%M%S)" n=0
  while [[ -e "$dest" || -L "$dest" ]]; do
    n=$((n + 1)); dest="${path}.backup-$(date +%Y%m%d-%H%M%S)-$n"
  done
  mv "$path" "$dest"
  echo "Preserved $path as $dest" >&2
  BACKUP="$dest"
}

# Detach directory symlinks before touching descendants. Preserve siblings as
# links, not by copying/backing up an entire user's config tree.
ensure_dir() {
  local path="$1" child
  [[ "$path" == / || "$path" == "$HOME" || "$path" == "$(dirname "${XDG_CONFIG_HOME:-$HOME/.config}")" ]] && return
  ensure_dir "$(dirname "$path")"
  if [[ -L "$path" ]]; then
    [[ -d "$path" ]] || { backup "$path"; mkdir "$path"; return; }
    backup "$path"
    mkdir "$path"
    for child in "$BACKUP"/* "$BACKUP"/.[!.]* "$BACKUP"/..?*; do
      [[ -e "$child" || -L "$child" ]] || continue
      ln -s "$child" "$path/$(basename "$child")"
    done
  elif [[ -e "$path" && ! -d "$path" ]]; then
    backup "$path"; mkdir "$path"
  else
    mkdir -p "$path"
  fi
}

install_link() {
  local src="$1" dest="$2"
  ensure_dir "$(dirname "$dest")"
  if [[ -L "$dest" && "$dest" -ef "$src" ]]; then return; fi
  if [[ -e "$dest" || -L "$dest" ]]; then backup "$dest"; fi
  ln -s "$src" "$dest"
}

[[ -s "$SOURCE/.aerospace.toml" ]] || { echo 'Missing AeroSpace config source' >&2; exit 1; }
# Validate the complete source manifest before making any changes.
helpers=(auto-grid focus-display.sh move-to-display.sh move-to-workspace.sh new-workspace.sh open-finder.sh open-kitty.sh open-safari.sh switch-group.sh switch-workspace.sh workspace-groups-lib.sh)
for name in "${helpers[@]}"; do
  [[ -f "$SOURCE/.config/aerospace/scripts/$name" && -x "$SOURCE/.config/aerospace/scripts/$name" ]] || { echo "Missing/non-executable AeroSpace helper: $name" >&2; exit 1; }
done
install_link "$SOURCE/.aerospace.toml" "$HOME/.aerospace.toml"
# AeroSpace rejects competing discovery paths; preserve only the conflicting file.
for alternate in "$HOME/.config/aerospace/aerospace.toml" "${XDG_CONFIG_HOME:-$HOME/.config}/aerospace/aerospace.toml"; do
  if [[ -e "$alternate" || -L "$alternate" ]]; then
    ensure_dir "$(dirname "$alternate")"
    backup "$alternate"
  fi
done
for name in "${helpers[@]}"; do
  install_link "$SOURCE/.config/aerospace/scripts/$name" "$HOME/.config/aerospace/scripts/$name"
done
for name in display-workspaces-lib.sh normalize-display-workspaces.sh; do
  dest="$HOME/.config/aerospace/scripts/$name"
  if [[ -L "$dest" ]]; then
    target="$(readlink "$dest")"
    # Only remove links whose normalized target is this repo's deleted helper.
    case "$target" in /*) ;; *) target="$(dirname "$dest")/$target" ;; esac
    parent="$(cd "$(dirname "$target")" 2>/dev/null && pwd -P)" || continue
    if [[ "$parent/$(basename "$target")" == "$SOURCE/.config/aerospace/scripts/$name" ]]; then rm "$dest"; fi
  fi
done
echo '✓ AeroSpace config installed'
if ! command -v aerospace >/dev/null 2>&1; then
  echo '⚠ AeroSpace reload deferred: CLI missing. Install AeroSpace, launch it, then rerun this installer.' >&2
  exit 0
fi
if ! pgrep -x AeroSpace >/dev/null 2>&1; then
  echo '⚠ AeroSpace reload deferred: app not running. Launch AeroSpace, then rerun this installer.' >&2
  exit 0
fi
if ! aerospace reload-config; then
  echo 'AeroSpace reload/parse failed. Fix the reported config error and rerun scripts/install-aerospace.sh.' >&2
  exit 1
fi
if ! active="$(aerospace config --config-path)"; then
  echo 'Cannot verify active AeroSpace config (config --config-path failed).' >&2
  exit 1
fi
if [[ ! -f "$active" || ! "$active" -ef "$SOURCE/.aerospace.toml" ]]; then
  echo "AeroSpace is using '$active', not $HOME/.aerospace.toml. Remove any custom --config-path launch override and relaunch manually, then rerun this installer." >&2
  exit 1
fi
echo '✓ AeroSpace reloaded and active repo config verified'
