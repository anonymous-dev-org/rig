# macOS preferences

Run `macos/defaults.sh --preview` first, then `macos/defaults.sh` to apply.
Node.js must already be on PATH. This component is opt-in; the parent setup/update
workflow decides whether to call it. Running this CLI directly is also consent
to manage the listed preferences, not to restart apps.

Only the typed domain/key list in `sync-defaults.mjs` is read or written. Existing
explicit values are preserved on first adoption, even when they match rig's
value. Missing keys receive defaults. Thereafter, a value changes only while it
still matches the last successfully applied value and native type. Personal
changes (including deletion) permanently relinquish that key to the user;
subsequent runs preserve it. No arbitrary preference domains are exported/scanned.
Changing a managed value away and back between runs cannot be detected.

`--preview` reads preferences and reports proposed writes without changing
preferences or history. It creates/checks the private state directory and takes
the same lock as an apply. `--restart` explicitly permits restarting Dock/Finder,
but only when this run changes their domain. Preview never restarts anything.
Normally no apps restart; some settings need a logout or manual app restart.
No apps are launched and no other processes are restarted.

## State, reset, and recovery

Private state lives at `$HOME/.local/state/rig/macos` (directory 0700, files 0600).
The path must have ordinary, non-group/world-writable directories, no symlinks;
existing state must be owned by the current user with private permissions. Unsafe
paths stop rather than being repaired. `history.json` records ownership and the
last applied typed values. Do not store state in the checkout. Removing this
component from setup stops management without undoing preferences.

To reset one personal key to rig management, quit relevant preference editors,
back up `history.json` outside the checkout, remove only that key's entry from
its `entries` object, and explicitly delete that preference with
`defaults delete DOMAIN KEY` using the domain/key from the allowlist. Preview,
then apply: a missing key with no history is adopted. Deleting a preference
without removing its history is an opt-out, not a reset. To re-adopt everything,
back up/move `history.json`; existing explicit values still remain personal.
These are intentional manual reset operations; the sync never bulk-deletes data.

Writes are individually verified, not a global macOS transaction. Before writing,
`pending.json` durably records the original history text and each planned change's
entry, prior value/absence, and intended value/type. History is atomically replaced
only after successful writes. A failed/interrupted run retains the journal and
stops future runs; it never blindly rolls back personal changes.

If interrupted:

1. Ensure no sync is running. Inspect the private `pending.json` and compare only
   its listed keys with `defaults read DOMAIN KEY` and `defaults read-type DOMAIN KEY`.
   An exit with a retained journal may have applied any prefix of the changes.
2. Back up the entire state directory outside the checkout. Reconcile each listed
   key manually: either retain its current personal value or restore its recorded
   prior value/type (delete only when `before.present` was false and you explicitly
   want that absence). Do not blindly replay the journal over newer personal edits.
3. Restore `history.json` from the journal's `history` string, or remove it if that
   field is null. Move `pending.json` aside after reconciliation. A subsequent
   preview preserves values differing from that prior history; first-adoption
   values now present are deliberately treated as personal.
4. Only when no process is running, remove a leftover empty `lock` directory.
   Inspect/remove any leftover `*.tmp` file after backing it up; it is never used
   automatically. Preview again before applying.

## Retiring a default

To remove a shipped default, move its complete typed entry from `defaults` to the
fixed `retired` list in `sync-defaults.mjs`; do not simply delete it from the
allowlist. The retired list is currently empty. Keep retired entries so users
upgrading from older versions can reconcile their history.

For a known retired key with history, sync deletes the preference only if it is
still managed and exactly matches its recorded applied value and native type.
Personal values and deletions are preserved. Keys without history are untouched.
Retirement uses the same prechecks, verification, and pending journal as writes;
its history entry is dropped only after successful reconciliation. Preview reports
proposed deletions without changing preferences or history. Restarts still require
`--restart`.

If history names a genuinely unknown key (in neither list), sync stops. Reconcile
that key manually, then remove its history entry; unknown preferences are never
automatically read or deleted. Corrupt history must be restored from a trusted
backup or explicitly moved aside for conservative first adoption.

## Limits and verification

The lock coordinates rig invocations, not System Settings or apps. Reads are
per-key, and each key is rechecked immediately before writing, but macOS provides
no compare-and-swap: an app can still race a write. Close preference editors
before applying. Effective/managed-host preferences and OS-specific behavior may
differ from `defaults`' explicit domain/key view; this is not a policy manager.
Read errors other than the native missing-key diagnostic stop the operation.

Development validation is syntax/source review only. No live preference writes,
app restarts, new test/probe scripts, or macOS runtime simulations were performed.
