#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

YES_ALL=false
if [[ "$1" == "--yes" ]]; then
  YES_ALL=true
fi

compile_swift_apps() {
  local scripts_dir="$HOME/.config/aerospace/scripts"
  [[ -d "$scripts_dir" ]] || return

  for src in "$scripts_dir"/*.swift; do
    [ -f "$src" ] || continue
    local name bin
    name=$(basename "$src" .swift)
    # Convert CamelCase to kebab-case for the binary name
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
    echo "  ✓ $bin built"
  done
}

clean_aerospace_generated_apps() {
  local scripts_dir="$HOME/.config/aerospace/scripts"
  [[ -d "$scripts_dir" ]] || return

  for src in "$SCRIPT_DIR"/aerospace/.config/aerospace/scripts/*.swift; do
    [ -f "$src" ] || continue
    local name bin
    name=$(basename "$src" .swift)
    # Convert CamelCase to kebab-case for the binary name
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
    echo "  Preserved existing ~/.codex/config.toml as local ignored config"
  elif [[ -f "$example_config" ]]; then
    cp "$example_config" "$local_config"
    echo "  Seeded codex local config from config.example.toml"
  fi
}

confirm() {
  if $YES_ALL; then
    return 0
  fi
  read -p "$1 [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]]
}

echo "=== anonymous.rig — New Mac Init ==="
echo ""

# --- Brew ---
if confirm "Install Homebrew + common formulas?"; then
  ./brew/install-brew.sh
fi

# --- Stow packages ---
PACKAGES=(neovim zsh aerospace kitty git codex claude)
for pkg in "${PACKAGES[@]}"; do
  if [[ ! -d "$SCRIPT_DIR/$pkg" ]]; then
    echo "  ⚠ $pkg skipped (package directory missing)"
    continue
  fi

  if confirm "Install $pkg config?"; then
    if [[ "$pkg" == "codex" ]]; then
      prepare_codex_config
    fi

    # Remove any existing non-symlink files that would conflict with stow
    while IFS= read -r -d '' file; do
      rel="${file#$SCRIPT_DIR/$pkg/}"
      dest="$HOME/$rel"
      if [[ -e "$dest" && ! -L "$dest" ]]; then
        rm -rf "$dest"
      fi
    done < <(find "$SCRIPT_DIR/$pkg" -not -type d -print0)
    stow --restow --no-folding -t ~ "$pkg"
    echo "  ✓ $pkg stowed"
  fi
done

# --- macOS defaults ---
if confirm "Apply macOS system defaults (Dock, Finder, keyboard, etc.)?"; then
  ./macos/defaults.sh
fi

# --- Compile Swift picker apps ---
if command -v swiftc &>/dev/null && [[ -d "$HOME/.config/aerospace/scripts" ]]; then
  if confirm "Compile Aerospace picker apps?"; then
    clean_aerospace_generated_apps
    compile_swift_apps
  fi
fi

echo ""
echo "Done! Run ./update.sh anytime to pull latest changes."
