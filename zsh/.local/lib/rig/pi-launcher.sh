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

bold='' dim='' reset=''
if [[ -z "${NO_COLOR+x}" && "${TERM:-dumb}" != dumb ]]; then
bold=$'\033[1;36m'
dim=$'\033[2m'
reset=$'\033[0m'
fi

# Refresh main before using it directly or as a new branch's starting point.
refresh_main() {
if [[ -n "$(git -C "$primary" status --porcelain)" ]]; then
printf 'Main checkout has uncommitted changes; commit or stash them before starting Pi.\n' >&2
exit 1
fi
printf '\n%s→ Refreshing main%s\n' "$bold" "$reset" >&2
git -C "$primary" switch --quiet main
git -C "$primary" -c pull.rebase=false pull --quiet --ff-only origin main
printf '%s✓ Main is up to date%s\n' "$dim" "$reset" >&2
}

# Git lists the primary checkout first, even when called in a linked worktree.
IFS= read -r primary < <(git -c core.quotePath=false worktree list --porcelain)
primary=${primary#worktree }
printf '\n%sStart Pi%s\n%s%s%s\n\n' "$bold" "$reset" "$dim" "$primary" "$reset" >&2
choice=1
plain_menu() {
printf '  1) New worktree\n  2) Main checkout\n  q) Cancel\n' >&2
while true; do
printf 'Choose [1/2/q] (Enter = new worktree): ' >&2
IFS= read -r choice || exit 1
case "$choice" in
'') choice=1; break ;;
1|2) break ;;
q|Q) printf 'Cancelled.\n' >&2; exit 0 ;;
*) printf 'Please enter 1, 2, or q.\n' >&2 ;;
esac
done
}
draw_menu() {
local first=' ' second=' ' first_style='' second_style=''
if [[ "$choice" = 1 ]]; then first='›'; first_style=$bold;
else second='›'; second_style=$bold; fi
printf '\r%s  %s New worktree%s\033[K\n' "$first_style" "$first" "$reset" >&2
printf '%s  %s Main checkout%s\033[K\n' "$second_style" "$second" "$reset" >&2
printf '%s  ↑/↓ or 1/2 · Enter confirm · q cancel%s\033[K' "$dim" "$reset" >&2
}
read_escape_sequence() {
# Escape-sequence final bytes are an ASCII range, not a locale sort range.
local LC_ALL=C introducer part
IFS= read -rsn2 -t 1 sequence || return 1
introducer=${sequence:0:1}
[[ "$introducer" = '[' || "$introducer" = O ]] || return 1
part=${sequence:1:1}
while [[ "$part" != [@-~] ]]; do
IFS= read -rsn1 -t 1 part || return 1
sequence+=$part
done
}
# Use actual terminal width rather than a potentially stale COLUMNS variable.
columns=0
if size=$(stty size 2>/dev/null); then
columns=${size##* }
fi
if [[ "${TERM:-dumb}" = dumb || ! "$columns" =~ ^[0-9]+$ || "$columns" -lt 48 ]]; then
plain_menu
else
draw_menu
while true; do
IFS= read -rsn1 key || exit 1
case "$key" in
$'\033')
# Consume the entire CSI/SS3 sequence, including modifier parameters.
read_escape_sequence || continue
case "$sequence" in
'[A'|'[B'|'OA'|'OB')
if [[ "$choice" = 1 ]]; then choice=2; else choice=1; fi
;;
*) continue ;;
esac
;;
1|2) choice=$key ;;
'') printf '\n' >&2; break ;;
q|Q) printf '\nCancelled.\n' >&2; exit 0 ;;
*) continue ;;
esac
printf '\r\033[2A' >&2
draw_menu
done
fi
case "$choice" in
1)
printf '\n%sName your branch using letters, numbers, hyphens, or underscores.%s\n' "$dim" "$reset" >&2
while true; do
printf '%sWorktree name (or q to cancel): %s' "$bold" "$reset" >&2
IFS= read -r name || exit 1
if [[ "$name" = q || "$name" = Q ]]; then
printf 'Cancelled.\n' >&2
exit 0
fi
if [[ ! "$name" =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]*$ ]]; then
printf 'Start with a letter or number; use only letters, numbers, hyphens, and underscores.\n' >&2
continue
fi
if ! git check-ref-format --branch "$name" >/dev/null 2>&1; then
printf 'That name is not a valid Git branch. Please choose another.\n' >&2
continue
fi
if git -C "$primary" show-ref --verify --quiet "refs/heads/$name"; then
printf 'Branch already exists: %s. Please choose another name.\n' "$name" >&2
continue
fi
target="$primary/.pi/worktrees/$name"
if [[ -e "$target" || -L "$target" ]]; then
printf 'Worktree path already exists: %s. Please choose another name.\n' "$target" >&2
continue
fi
break
done
refresh_main
# Keep runtime worktrees out of Git without changing the project's .gitignore.
exclude=$(git -C "$primary" rev-parse --git-path info/exclude)
[[ "$exclude" = /* ]] || exclude="$primary/$exclude"
mkdir -p "$(dirname "$exclude")"
if ! grep -qxF '/.pi/worktrees/' "$exclude" 2>/dev/null; then
printf '\n/.pi/worktrees/\n' >> "$exclude"
fi
printf '\n%s→ Creating worktree: %s%s\n' "$bold" "$name" "$reset" >&2
git -C "$primary" worktree add --quiet -b "$name" "$target" HEAD
cd "$target"
printf '%s✓ Starting Pi in %s%s\n\n' "$bold" "$target" "$reset" >&2
launch --name "$name"
;;
2)
refresh_main
cd "$primary"
printf '\n%s✓ Starting Pi on main%s\n\n' "$bold" "$reset" >&2
launch
;;
esac
