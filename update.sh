#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

compile_swift_apps() {
  local scripts_dir="$HOME/.config/aerospace/scripts"
  [[ -d "$scripts_dir" ]] || return

  for src in "$scripts_dir"/*.swift; do
    [ -f "$src" ] || continue
    local name bin
    name=$(basename "$src" .swift)
    bin=$(echo "$name" | sed 's/\([a-z]\)\([A-Z]\)/\1-\2/g' | tr '[:upper:]' '[:lower:]')-app
    echo "  Compiling $name..."

    local swiftc_args=(
      -O
      -o "$scripts_dir/$bin"
      "$src"
      -framework SwiftUI
      -framework AppKit
    )
    if grep -q '^import SQLite3$' "$src"; then
      swiftc_args+=(-lsqlite3)
    fi

    swiftc "${swiftc_args[@]}"
    echo "  ✓ $bin rebuilt"
  done
}

echo "=== anonymous.rig — Update ==="

# Pull latest
git pull

# Re-stow all packages (stow is idempotent, safe to re-run)
PACKAGES=(neovim zsh aerospace kitty git codex claude)
for pkg in "${PACKAGES[@]}"; do
  if [[ -d "$pkg" ]]; then
    stow --no-folding -t ~ -R "$pkg" 2>/dev/null && echo "✓ $pkg updated" || echo "⚠ $pkg skipped (not stowed on this machine)"
  fi
done

# Clean up stale files from previous versions
rm -f "$HOME/.config/aerospace/scripts/notification-picker-app"
rm -f "$HOME/.config/aerospace/last-layout"

# Recompile Swift picker apps
if command -v swiftc &>/dev/null && [[ -d "$HOME/.config/aerospace/scripts" ]]; then
  compile_swift_apps
fi

echo ""
echo "Done."
