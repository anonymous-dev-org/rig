#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
git config --local core.hooksPath .githooks

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
    pi)
      node "$SCRIPT_DIR/pi/sync-settings.mjs"
      ;;
    lazysql)
      prepare_local_config \
        "lazysql/Library/Application Support/lazysql/config.toml" \
        "lazysql/Library/Application Support/lazysql/config.example.toml" \
        "Library/Application Support/lazysql/config.toml"
      ;;
  esac
}

# Re-exec after pull so remaining steps always use latest update logic.
if [[ "${1:-}" != "--after-pull" ]]; then
  echo "=== anonymous.rig — Update ==="
  git pull
  exec "$SCRIPT_DIR/update.sh" --after-pull
fi

# Install missing Brewfile packages and upgrade existing ones.
brew bundle --file="$SCRIPT_DIR/brew/Brewfile"

# Upgrade Bun first so it can read lockfiles written by newer releases.
# Use Homebrew for Homebrew-managed binaries, otherwise use Bun's self-updater.
bun_path="$(bun -p 'process.execPath')"
case "$bun_path" in
  */Cellar/bun/*|*/Cellar/bun@*/*)
    brew upgrade bun
    ;;
  *)
    bun upgrade
    ;;
esac

# Install or update Pi with Bun, without dependency lifecycle scripts.
bun add --global --ignore-scripts @earendil-works/pi-coding-agent

# Re-stow all packages (stow is idempotent, safe to re-run)
PACKAGES=(neovim zsh aerospace kitty git pi lazysql)
for pkg in "${PACKAGES[@]}"; do
  if [[ -d "$pkg" ]]; then
    echo "↻ Syncing $pkg config to $HOME..."
    if [[ "$pkg" == aerospace ]]; then
      bash "$SCRIPT_DIR/scripts/install-aerospace.sh"
      continue
    fi
    prepare_package_config "$pkg"

    while IFS= read -r -d '' file; do
      rel="${file#$SCRIPT_DIR/$pkg/}"
      dest="$HOME/$rel"
      if [[ "$pkg" == "pi" && ( "$rel" == ".pi/agent/settings.json" || "$rel" == ".pi/agent/mcp.json" || "$rel" == ".pi/agent/settings.example.json" || "$rel" == ".pi/agent/mcp.example.json" || "$rel" == "README.md" || "$rel" == "sync-settings.mjs" || "$rel" == "sync-settings.test.mjs" || "$rel" == ".stow-local-ignore" ) ]]; then
        continue
      fi
      if [[ -L "$dest" && "$(readlink "$dest")" == "$file" ]]; then
        rm "$dest"
      fi
    done < <(find "$SCRIPT_DIR/$pkg" -not -type d -print0)

    stow --no-folding -t ~ -R "$pkg" 2>/dev/null && echo "✓ $pkg updated" || echo "⚠ $pkg skipped (not stowed on this machine)"
  fi
done

echo ""
echo "Done."
