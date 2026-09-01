#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
git config --local core.hooksPath .githooks

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

prepare_local_config() {
  local local_config="$SCRIPT_DIR/$1"
  local example_config="$SCRIPT_DIR/$2"
  local home_config="$HOME/$3"

  mkdir -p "$(dirname "$local_config")"

  if [[ -f "$home_config" && ! -L "$home_config" ]]; then
    if [[ -e "$local_config" ]] && ! cmp -s "$home_config" "$local_config"; then
      echo "✗ Config conflict: $home_config differs from $local_config" >&2
      return 1
    fi
    if [[ ! -e "$local_config" ]]; then
      install -m 600 "$home_config" "$local_config"
      cmp -s "$home_config" "$local_config"
    fi
    chmod 600 "$local_config"
    rm "$home_config"
    echo "Preserved existing $home_config as local ignored config"
    return
  fi

  if [[ -e "$local_config" ]]; then
    chmod 600 "$local_config"
  elif [[ -f "$example_config" ]]; then
    install -m 600 "$example_config" "$local_config"
    echo "Seeded local config from $example_config"
  fi
}

prepare_package_config() {
  case "$1" in
    lazysql)
      prepare_local_config \
        "lazysql/Library/Application Support/lazysql/config.toml" \
        "lazysql/Library/Application Support/lazysql/config.example.toml" \
        "Library/Application Support/lazysql/config.toml"
      ;;
  esac
}

echo "=== anonymous.rig — Update ==="

# Re-exec after pull so remaining steps always use latest update logic.
if [[ "${1:-}" != "--after-pull" ]]; then
  git pull
  exec "$SCRIPT_DIR/update.sh" --after-pull
fi

# Install or update Pi with its official npm package.
npm install -g --ignore-scripts @earendil-works/pi-coding-agent

# Re-stow all packages (stow is idempotent, safe to re-run)
PACKAGES=(neovim zsh aerospace kitty git pi lazysql)
for pkg in "${PACKAGES[@]}"; do
  if [[ -d "$pkg" ]]; then
    prepare_package_config "$pkg"

    while IFS= read -r -d '' file; do
      rel="${file#$SCRIPT_DIR/$pkg/}"
      dest="$HOME/$rel"
      if [[ -L "$dest" && "$(readlink "$dest")" == "$file" ]]; then
        rm "$dest"
      fi
    done < <(find "$SCRIPT_DIR/$pkg" -not -type d -print0)

    if [[ "$pkg" == "aerospace" ]]; then
      clean_aerospace_generated_apps
    fi
    stow --no-folding -t ~ -R "$pkg" 2>/dev/null && echo "✓ $pkg updated" || echo "⚠ $pkg skipped (not stowed on this machine)"
  fi
done

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
