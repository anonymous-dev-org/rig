# Line file tools — prototype

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

Ranges are inclusive and 1-based; default is 1–200. An end beyond EOF is clamped. An empty file has zero editable lines. A replacement is exactly one line: no CR/LF, insertions or deletions. `""` blanks a terminated line. Blanking an unterminated final line is refused because it would remove that physical line. Use a complete-file `write` for insertions/deletions; it is not protected by this extension. All mapping entries are validated before any write, regardless of key order.

The harness stores a SHA-256 of the **entire file** privately in memory on a successful read. Edits need no old text or hash. Before writing, the harness compares the file to that snapshot. A change anywhere in the file rejects the edit and requires a fresh read. Successful edits update the private snapshot, allowing another edit without rereading. No seen-line restriction: a read of any range establishes the full-file snapshot.

Snapshots are cleared on startup, session switching/forking, tree navigation, compaction and shutdown. Reload/resume require rereading; hashes are not restored from conversation history or exposed to the model. Queued operations from before a reset are rejected as well. Canonical paths unify symlink aliases. Paths support ordinary relative/absolute paths and `~/`; stock Pi's `@` prefix and Unicode filename fallback are not implemented.

Local regular UTF-8 files only, at most 4 MiB, without NUL. BOM, individual LF/CRLF/CR terminators, and final-newline presence are preserved. Ordinary permission bits are preserved; OS write policy may clear special mode bits. Read output over 50 KiB is rejected with a narrower-range request, not silently truncated. Invalid Unicode replacements are refused. A single line exceeding that output budget cannot be displayed; a file consisting only of such a line cannot establish a snapshot. Images and other stock read formats are not supported.

Pi's shared file mutation queue serializes cooperating tools. Hash comparison and writing run synchronously without an intervening async yield, but **this is optimistic protection, not an OS-level compare-and-swap**: an external process can still race the check/write. In-place writes preserve the inode and hard links; I/O failure can leave a partial write. A write attempt invalidates the snapshot until successful completion, so failures require rereading. Use ordinary version control/backups for recovery.

This version has no token/time performance claim and no automatic deployment.
