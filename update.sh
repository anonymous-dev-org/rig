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

clean_aerospace_generated_apps() {
  local scripts_dir="$HOME/.config/aerospace/scripts"
  [[ -d "$scripts_dir" ]] || return

  for src in "$SCRIPT_DIR"/aerospace/.config/aerospace/scripts/*.swift; do
    [ -f "$src" ] || continue
    local name bin
    name=$(basename "$src" .swift)
    bin=$(echo "$name" | sed 's/\([a-z]\)\([A-Z]\)/\1-\2/g' | tr '[:upper:]' '[:lower:]')-app
    rm -f "$scripts_dir/$bin"
  done
}

prepare_codex_config() {
  local local_config="$SCRIPT_DIR/codex/.codex/config.toml"
  local example_config="$SCRIPT_DIR/codex/.codex/config.example.toml"
  local home_config="$HOME/.codex/config.toml"

  [[ -e "$local_config" ]] && return

  mkdir -p "$(dirname "$local_config")"
  if [[ -f "$home_config" && ! -L "$home_config" ]]; then
    cp "$home_config" "$local_config"
    echo "Preserved existing ~/.codex/config.toml as local ignored config"
  elif [[ -f "$example_config" ]]; then
    cp "$example_config" "$local_config"
    echo "Seeded codex local config from config.example.toml"
  fi
}

echo "=== anonymous.rig — Update ==="

# Pull latest
git pull

# Re-stow all packages (stow is idempotent, safe to re-run)
PACKAGES=(neovim zsh aerospace kitty git codex claude)
for pkg in "${PACKAGES[@]}"; do
  if [[ -d "$pkg" ]]; then
    if [[ "$pkg" == "codex" ]]; then
      prepare_codex_config
    fi

    if [[ "$pkg" == "aerospace" ]]; then
      clean_aerospace_generated_apps
    fi
    stow --no-folding -t ~ -R "$pkg" 2>/dev/null && echo "✓ $pkg updated" || echo "⚠ $pkg skipped (not stowed on this machine)"
  fi
done

if [[ -x "$SCRIPT_DIR/brew/install-acp-agents.sh" ]]; then
  "$SCRIPT_DIR/brew/install-acp-agents.sh"
fi

# Clean up generated app binaries before recompiling them locally
clean_aerospace_generated_apps
rm -f "$HOME/.config/aerospace/last-layout"
rm -f "$HOME/.config/aerospace/last-desktop"

# Recompile Swift picker apps
if command -v swiftc &>/dev/null && [[ -d "$HOME/.config/aerospace/scripts" ]]; then
  compile_swift_apps
fi

echo ""
echo "Done."
