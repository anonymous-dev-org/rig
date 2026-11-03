#!/bin/bash
# macOS defaults — only non-default settings
# Run once on a fresh Mac, then log out / restart for all changes to take effect.
set -e

echo "Applying macOS defaults..."

# --- Dock ---
defaults write com.apple.dock autohide -bool true
defaults write com.apple.dock tilesize -int 58
defaults write com.apple.dock magnification -bool true
defaults write com.apple.dock largesize -int 68
defaults write com.apple.dock minimize-to-application -bool true
defaults write com.apple.dock show-recents -bool false
defaults write com.apple.dock mru-spaces -bool false          # Don't rearrange Spaces based on recent use

# --- Keyboard ---
defaults write NSGlobalDomain NSAutomaticCapitalizationEnabled -bool true
defaults write NSGlobalDomain NSAutomaticPeriodSubstitutionEnabled -bool true

# --- Finder ---
defaults write com.apple.finder FXPreferredViewStyle -string "clmv"  # Column view
defaults write com.apple.finder _FXSortFoldersFirst -bool false

# --- Hot Corners ---
# Bottom-right: Quick Note (14)
defaults write com.apple.dock wvous-br-corner -int 14
defaults write com.apple.dock wvous-br-modifier -int 0

# --- Appearance ---
defaults write NSGlobalDomain AppleInterfaceStyle -string "Dark"

# --- Apply ---
killall Dock 2>/dev/null || true
killall Finder 2>/dev/null || true

echo "Done. Some changes may require a log out or restart."
