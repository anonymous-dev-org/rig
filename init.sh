#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
git config --local core.hooksPath .githooks

YES_ALL=false
if [[ "$1" == "--yes" ]]; then
  YES_ALL=true
fi

prepare_local_config() {
  local local_config="$SCRIPT_DIR/$1"
  local example_config="$SCRIPT_DIR/$2"
  local home_config="$HOME/$3"

  mkdir -p "$(dirname "$local_config")"

  if [[ -f "$home_config" && ! -L "$home_config" ]]; then
    if [[ -e "$local_config" ]] && ! cmp -s "$home_config" "$local_config"; then
      echo "  ✗ Config conflict: $home_config differs from $local_config" >&2
      return 1
    fi
    if [[ ! -e "$local_config" ]]; then
      install -m 600 "$home_config" "$local_config"
      cmp -s "$home_config" "$local_config"
    fi
    chmod 600 "$local_config"
    rm "$home_config"
    echo "  Preserved existing $home_config as local ignored config"
    return
  fi

  if [[ -e "$local_config" ]]; then
    chmod 600 "$local_config"
  elif [[ -f "$example_config" ]]; then
    install -m 600 "$example_config" "$local_config"
    echo "  Seeded local config from $example_config"
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
if confirm "Install Homebrew, common tools, and Pi?"; then
  ./brew/install-brew.sh
fi

# --- Stow packages ---
PACKAGES=(neovim zsh aerospace kitty git pi lazysql)
for pkg in "${PACKAGES[@]}"; do
  if [[ ! -d "$SCRIPT_DIR/$pkg" ]]; then
    echo "  ⚠ $pkg skipped (package directory missing)"
    continue
  fi

  if confirm "Install $pkg config?"; then
    echo "  ↻ Syncing $pkg config to $HOME..."
    if [[ "$pkg" == aerospace ]]; then
      bash "$SCRIPT_DIR/scripts/install-aerospace.sh"
      continue
    fi
    prepare_package_config "$pkg"

    # Remove conflicts and migrate absolute links created by older Stow versions
    while IFS= read -r -d '' file; do
      rel="${file#$SCRIPT_DIR/$pkg/}"
      dest="$HOME/$rel"
      if [[ "$pkg" == "pi" && ( "$rel" == ".pi/agent/settings.json" || "$rel" == ".pi/agent/mcp.json" || "$rel" == ".pi/agent/settings.example.json" || "$rel" == ".pi/agent/mcp.example.json" || "$rel" == "README.md" || "$rel" == "sync-settings.mjs" || "$rel" == "sync-settings.test.mjs" || "$rel" == ".stow-local-ignore" || "$rel" == packages/* ) ]]; then
        continue
      fi
      if [[ -L "$dest" && "$(readlink "$dest")" == "$file" ]]; then
        rm "$dest"
      elif [[ -e "$dest" && ! -L "$dest" ]]; then
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


echo ""
echo "Done! Run ./update.sh anytime to pull latest changes."
echo ""
echo "GitLab reviews in Neovim:"
echo "  Run :DepsUpdate in Neovim to install/update plugins, then restart Neovim."
echo "  Authenticate with: glab auth login (self-hosted: add --hostname gitlab.example.com)"
echo "  Neovim reuses glab credentials for the host in the repository's origin remote."
echo "  Optional overrides: GITLAB_TOKEN and GITLAB_URL, or a local .gitlab.nvim file."
echo "  Never commit your token. Press <Leader>l in Neovim to select an MR."
