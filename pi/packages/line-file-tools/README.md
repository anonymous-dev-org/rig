# Line file tools — guarded text editing

Isolated Pi 1.5.2 extension overriding `read` and `edit`. No OMP/native dependency or global installation.

```sh
pi -e /absolute/path/to/pi/packages/line-file-tools/index.ts
```

Do not load another extension overriding the same names. Other built-in tools remain available. This extension is not a sandbox: `write`, bash, or external editors can still change files.

```js
read({ path: "file.ts", start: 50, end: 150 })
// [200 lines total; showing 50–150]
// 50: actual source text
// ...
edit({ path: "file.ts", changes: { "50": "new source text", "72": "other source text" } })
```

Read ranges are inclusive and 1-based; default is 1–200. An end beyond EOF is clamped. An empty file has zero lines. `changes` replaces existing lines without shifting positions: each value is exactly one line with no CR/LF. `""` blanks a terminated line. Blanking an unterminated final line with `changes` is refused because it would remove that physical line; use a splice instead.

## Insert, delete, or replace a range

A **splice** removes a count of existing lines at a position and puts new lines there. Supply exactly one of `changes` or `splices` per call:

```js
// After reading the file, insert two lines BEFORE original line 12.
edit({ path: "file.ts", splices: [
  { start: 12, deleteCount: 0, lines: ["const enabled = true;", ""] }
] })
// Read again: the insertion changed subsequent line numbers.
read({ path: "file.ts", start: 1, end: 60 })

// In one batch: replace original lines 20–22, and delete original line 40.
edit({ path: "file.ts", splices: [
  { start: 20, deleteCount: 3, lines: ["return result;"] },
  { start: 40, deleteCount: 1, lines: [] }
] })
```

`start` is 1-based; `deleteCount` is nonnegative. A zero count inserts before `start`; empty `lines` deletes. To append to a file with N lines use `start: N+1, deleteCount: 0`. To populate an existing empty file, read it then use `start: 1, deleteCount: 0`. Use stock `write` to create a missing file.

Every splice in a batch addresses the **pre-edit file**, regardless of array order. Overlapping removed ranges, insertions inside a removed range, and duplicate start positions are rejected. Adjacent ranges and an insertion immediately after a removed range are allowed. Combine operations at the same position into one splice. Empty batches and insertions with no new lines are refused. All changes/splices and the resulting size are validated before writing any bytes.

New rows use the file's first line terminator, or LF when none exists. Untouched mixed terminators remain intact except at the new EOF or when separating an old unterminated final row from appended rows. Nonempty final text preserves the original final-newline presence; an originally empty file gains LF-terminated rows. **An empty final row always needs a terminator to exist:** replacing an unterminated `x` with `lines: [""]` produces `\n`, not an empty file. Deleting every row produces an empty body (retaining any BOM). The tool reports the resulting line count. Its terminal display shows this summary and any reread warning or error; it does not yet provide a diff preview.

If any splice inserts/deletes a different number of rows, the tool requires a **fresh read before another edit**, even if other splices make the total line count unchanged. This prevents queued edits from silently using old coordinates after a shift. Equal-length replacements refresh the snapshot normally. A reread establishes freshness, not proof that all later coordinates were correctly recomputed.

The harness stores a SHA-256 of the **entire file** privately in memory on a successful read. Edits need no old text or hash. Before writing, the harness compares the file to that snapshot. A change anywhere in the file rejects the edit and requires a fresh read. Successful position-preserving edits update the private snapshot, allowing another edit without rereading. Position-changing splices invalidate it as described above. No seen-line restriction: a read of any range establishes the full-file snapshot.

Snapshots are cleared on startup, session switching/forking, tree navigation, compaction and shutdown. Reload/resume require rereading; hashes are not restored from conversation history or exposed to the model. Queued operations from before a reset are rejected as well. Canonical paths unify symlink aliases. Paths support ordinary relative/absolute paths and `~/`; stock Pi's `@` prefix and Unicode filename fallback are not implemented.

Local regular UTF-8 files only, at most 4 MiB, without NUL. BOM and LF/CRLF/CR terminators are supported; `changes` preserves them exactly, while splices follow the boundary rules above. Ordinary permission bits are preserved; OS write policy may clear special mode bits. Read output over 50 KiB is rejected with a narrower-range request, not silently truncated. Invalid Unicode replacements are refused. A single line exceeding that output budget cannot be displayed; a file consisting only of such a line cannot establish a snapshot. Images and other stock read formats are not supported.

Pi's shared file mutation queue serializes cooperating tools. Hash comparison and writing run synchronously without an intervening async yield, but **this is optimistic protection, not an OS-level compare-and-swap**: an external process can still race the check/write. In-place writes preserve the inode and hard links; I/O failure can leave a partial write. A write attempt invalidates the snapshot until successful completion, so failures require rereading. Use ordinary version control/backups for recovery.

The [controlled token/time benchmark](../../docs/line-file-tools-benchmark.md) compares the earlier replacement-only version (`93b2753`) with stock Pi. The expanded splice schema and reread policy have not been benchmarked. It completed 17 paired comparisons before a provider subscription limit stopped the planned batch. Results are scoped to those tasks, not a universal performance claim. There is no automatic deployment.
