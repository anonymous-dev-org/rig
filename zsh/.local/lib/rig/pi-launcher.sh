#!/usr/bin/env bash
set -euo pipefail

# Only bare interactive launches select a checkout. CLI jobs and resume flags
# keep Pi's own argument and working-directory semantics.
launch() {
export PI_SKIP_VERSION_CHECK=1
if command -v caffeinate >/dev/null 2>&1; then
exec caffeinate -i pi "$@"
fi
exec pi "$@"
}

if (( $# )) || [[ ! -t 0 || ! -t 1 ]]; then
launch "$@"
fi
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
launch
fi

# Refresh main before using it directly or as a new branch's starting point.
refresh_main() {
if [[ -n "$(git -C "$primary" status --porcelain)" ]]; then
printf 'Main checkout has uncommitted changes; commit or stash them before starting Pi.\n' >&2
exit 1
fi
git -C "$primary" switch main
printf 'Updating main before starting Pi...\n' >&2
git -C "$primary" -c pull.rebase=false pull --ff-only origin main
}

# Git lists the primary checkout first, even when called in a linked worktree.
IFS= read -r primary < <(git -c core.quotePath=false worktree list --porcelain)
primary=${primary#worktree }
printf 'Start Pi in:\n  1) A new worktree\n  2) The main checkout (%s)\nChoice [1/2]: ' "$primary" >&2
IFS= read -r choice || exit 1
case "$choice" in
1)
printf 'Worktree name (letters, numbers, hyphens, underscores): ' >&2
IFS= read -r name || exit 1
if [[ ! "$name" =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]*$ ]]; then
printf 'Invalid worktree name.\n' >&2
exit 1
fi
git check-ref-format --branch "$name" >/dev/null
if git -C "$primary" show-ref --verify --quiet "refs/heads/$name"; then
printf 'Branch already exists: %s\n' "$name" >&2
exit 1
fi
target="$primary/.pi/worktrees/$name"
if [[ -e "$target" || -L "$target" ]]; then
printf 'Worktree path already exists: %s\n' "$target" >&2
exit 1
fi
refresh_main
# Keep runtime worktrees out of Git without changing the project's .gitignore.
exclude=$(git -C "$primary" rev-parse --git-path info/exclude)
[[ "$exclude" = /* ]] || exclude="$primary/$exclude"
mkdir -p "$(dirname "$exclude")"
if ! grep -qxF '/.pi/worktrees/' "$exclude" 2>/dev/null; then
printf '\n/.pi/worktrees/\n' >> "$exclude"
fi
git -C "$primary" worktree add -b "$name" "$target" HEAD
cd "$target"
launch --name "$name"
;;
2)
refresh_main
cd "$primary"
launch
;;
*)
printf 'Choose 1 or 2; Pi was not started.\n' >&2
exit 1
;;
esac
