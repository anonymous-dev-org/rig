# Line file tools — managed read/edit defaults

Pi 1.5.2 extension overriding `read` and `edit`, with one implementation at [`pi/.pi/agent/extensions/line-file-tools/index.ts`](../../.pi/agent/extensions/line-file-tools/index.ts). This directory retains its documentation, not a second implementation. No OMP/native addon dependency.

Rig's full sync with Pi selected deploys it to `~/.pi/agent/extensions/line-file-tools/index.ts`; Pi discovers that directory automatically after restart or `/reload`. The JSON-only `pi/sync-settings.mjs` command does not deploy it. Full sync can also install/update Pi packages; do not treat it as an extension-only installer. Adding this source and inventory entry does not itself change an existing live installation.

For an isolated trial without deployment or duplicate overrides:

```sh
pi --no-extensions -e /absolute/path/to/rig/pi/.pi/agent/extensions/line-file-tools/index.ts
```

Start a new session so previous stock-tool calls do not suggest the old schema. Do not load this via `-e` as well as automatic discovery, or combine it with another read/edit override. Other built-in tools remain available. This extension is not a sandbox: `write`, bash, or external editors can still change files.

For a temporary stock-tools session, use `pi --no-extensions` (this disables all automatic extensions). To roll back only this extension, move its installed directory outside `~/.pi/agent/extensions/`, retaining it as a backup without overwriting an existing path, then restart Pi. A later full Rig sync restores this managed default; deselecting Pi only stops future management and does not remove an installed extension.

```js
read({ path: "file.ts", start: 50, end: 150 })
// [200 lines total; showing 50–150]
// 50: actual source text
// ...
edit({ path: "file.ts", changes: { "50": "new source text", "72": "other source text" } })
```

Once the target lines and intended change are known, **call edit directly**. Do not reread merely to check freshness or because an edit succeeded, including after insertions/deletions. The harness checks each target before writing; earlier unchanged lines remain usable after later insertions/deletions. Attempt known coordinates first and let edit reject targets whose content no longer matches there. Read when more context is needed, after a session reset, or when a target is rejected as stale/missing; then reconsider the relevant range and coordinates rather than blindly retrying.

Read ranges are inclusive and 1-based; default is 1–200. An end beyond EOF is clamped. An empty file has zero lines. `changes` replaces existing lines without shifting positions: each value is exactly one line with no CR/LF. `""` blanks a terminated line. Blanking an unterminated final line with `changes` is refused because it would remove that physical line; use a splice instead.

## Read multiple files

```js
read({ reads: [
  { path: "src/config.ts", start: 1, end: 40 },
  { path: "src/main.ts", start: 50, end: 100 },
  { path: "screenshot.png" }
] })
```

Use a nonempty `reads` array and omit top-level `path`, `start`, and `end`. Each entry has the same defaults and rules as a single-file read. Repeated paths are allowed for separate ranges. Results follow request order, with a path label before each text range or image. Successful text reads establish the same edit snapshots as single-file calls.

The 50 KiB numbered-text budget applies across the batch, including path labels; split batches or narrow ranges if needed. Images retain stock processing limits. Reads stop at the first failure, naming the failed path; earlier successful reads retain their snapshots, but their output is not returned. A batch is not an atomic view of all files.

Programmatic single-file results are unchanged. Batch callers receive `[{ path, result }, ...]`, where `result` is the usual numbered string or stock image object. This array form is also declared in the tool's output schema.

## Edit multiple files

Use `edits` to mix line replacements and range edits across files:

```js
edit({ edits: [
  { path: "src/config.ts", changes: { "12": "export const timeout = 5000;" } },
  { path: "src/main.ts", splices: [
    { start: 20, deleteCount: 2, lines: ["initialize(config);"] }
  ] }
] })
```

Read each file first to establish its snapshot, then use known coordinates directly. Each entry must supply exactly one of `changes` or `splices`; omit the unused field entirely. Do not combine `edits` with top-level `path`, `changes`, or `splices`. The original single-file format remains supported. A batch must be nonempty, and each file can appear only once, including relative/absolute, symlink, or hard-link aliases. Combine edits for one file into its single entry; all coordinates refer to that file before the call.

All files are opened and validated before any writes begin, so a validation failure leaves every file unchanged and preserves usable snapshots. Batches acquire file queues in canonical path order to avoid deadlocks. **Writes across files are not atomic:** an I/O failure can leave earlier files completed and the failing file partially modified. The error names the failed file and completed files; later files are not written. Inspect the completed files and reread the failed file before retrying rather than replaying the whole batch.

The model receives this format through the tool's parameter schema, description, prompt snippet, and prompt guidelines; it does not need to discover it in this README.

## Insert, delete, or replace a range

A **splice** removes a count of existing lines at a position and puts new lines there. Supply exactly one of `changes` or `splices` per file:

```js
// After reading the file, insert two lines BEFORE original line 12.
edit({ path: "file.ts", splices: [
  { start: 12, deleteCount: 0, lines: ["const enabled = true;", ""] }
] })
// Original lines before 12 are still usable without another read.
edit({ path: "file.ts", changes: { "5": "// updated heading" } })

// Attempt another known edit directly. Original line 20 may now be stale;
// if edit rejects it, read the relevant range and reconsider its coordinates.
edit({ path: "file.ts", splices: [
  { start: 20, deleteCount: 3, lines: ["return result;"] },
  { start: 40, deleteCount: 1, lines: [] }
] })
```

`start` is 1-based; `deleteCount` is nonnegative. A zero count inserts before `start`; empty `lines` deletes. To append to a file with N lines use `start: N+1, deleteCount: 0`. To populate an existing empty file, read it then use `start: 1, deleteCount: 0`. Use stock `write` to create a missing file.

Every splice in a batch addresses the **pre-edit file**, regardless of array order. Overlapping removed ranges, insertions inside a removed range, and duplicate start positions are rejected. Adjacent ranges and an insertion immediately after a removed range are allowed. Combine operations at the same position into one splice. Empty batches and insertions with no new lines are refused. All changes/splices and the resulting size are validated before writing any bytes.

New rows use the file's first line terminator, or LF when none exists. Untouched mixed terminators remain intact except at the new EOF or when separating an old unterminated final row from appended rows. Nonempty final text preserves the original final-newline presence; an originally empty file gains LF-terminated rows. **An empty final row always needs a terminator to exist:** replacing an unterminated `x` with `lines: [""]` produces `\n`, not an empty file. Deleting every row produces an empty body (retaining any BOM). Successful edits return `Edit succeeded.`, followed by the files being formatted when a formatter applies; the terminal displays that acknowledgement, not a diff or a reread warning.

## Format after edit

After a successful edit, each edited file is formatted in the background, like format on save in an editor. This happens only when a directory above the file holds a Biome config (`biome.json`, `biome.jsonc`), a Prettier config file (`.prettierrc*`, `prettier.config.*`) or an Oxfmt config (`.oxfmtrc.json`, `.oxfmtrc.jsonc`, `oxfmt.config.*`); the nearest one wins. The formatter is taken from the nearest `node_modules/.bin`, otherwise from `PATH`. A `prettier` key in `package.json` is not detected.

The edit returns without waiting. The format job runs in the same per-file queue as reads and edits, so the next read or edit of that file waits for it. The file is piped through the formatter and written back only if it still holds what was sent. A failing, missing or slow formatter (10 s limit) leaves the file as edited and is not reported.

Formatting does not update snapshots. A line the formatter changed, including a line the edit itself wrote, no longer matches and the next edit of it is rejected until that range is read again. Lines it left alone stay editable.

The harness stores private SHA-256 hashes of each row's **text and terminator**, indexed by numeric line position, plus the observed EOF position. Edits need no old text or hashes. A change to an unrelated row does not block an unchanged target. `changes` checks each target; splices check every removed/replaced row. Pure insertions check their immediate neighboring rows where present; appends also check EOF, and empty-file insertion requires an empty-file observation. Any retained boundary row whose terminator changes is checked too. A stale/missing target or anchor rejects the entire call before writing, without discarding other usable snapshots.

Successful edits refresh only the rows the tool authored, not unrelated externally changed rows. Other baseline hashes stay at their existing numeric coordinates rather than following moved lines. After an insertion/deletion, later targets may therefore reject while earlier unchanged targets still work; there is no blanket reread requirement. This checks **content at a coordinate, not semantic identity**: identical repeated rows can still match after a shift. Do not guess source context or assume that a matching hash proves the intended occurrence. A successful explicit read of any range refreshes hashes for the entire loaded file, retaining the existing no-seen-line-restriction behavior.

Snapshots are cleared on startup, session switching/forking, tree navigation, compaction and shutdown. Reload/resume require rereading; hashes are not restored from conversation history or exposed to the model. Queued operations from before a reset are rejected as well. Canonical paths unify symlink aliases. Paths support ordinary relative/absolute paths and `~/`; stock Pi's `@` prefix and Unicode filename fallback are not implemented.

Text reads/edits support local regular UTF-8 files only, at most 4 MiB, without NUL. BOM and LF/CRLF/CR terminators are supported; `changes` preserves them exactly, while splices follow the boundary rules above. Ordinary permission bits are preserved; OS write policy may clear special mode bits. Read output over 50 KiB is rejected with a narrower-range request, not silently truncated. Invalid Unicode replacements are refused. A single line exceeding that output budget cannot be displayed; a file consisting only of such a line cannot establish a snapshot. There is no automatic stock-text fallback for oversized or unsupported text: it would not establish the numbered edit contract. Use stock bash/write deliberately for out-of-contract files.

## Images and programmatic reads

`read({ path: "screenshot.png" })` uses stock Pi's byte-signature detection and image processing for supported JPEG/PNG/GIF/WebP/BMP files, even with a misleading filename. Images return attachments and the stock processing notes, not numbered lines, and do not establish an edit snapshot. Valid `start/end` ranges are ignored for images. Unsupported/corrupt image data follows stock detection/processing behavior; data not recognized as an image must still pass the strict text rules.

Delegation passes the active model context and cancellation signal, preserving model resize limits and nonvision notes. It uses the stock factory's default automatic resizing, rather than reading the user's `images.autoResize` setting. Image sizes follow stock processing rather than the text-only 4 MiB cap. This is local-file support, not remote/custom read operations.

Programmatic callers such as codemode receive the numbered text as a string, or the stock `{ type: "image", data, mimeType, note }` object suitable for `image(...)`. Image-processing failure notes can instead be a string, as with stock read. The text API remains `start/end`, not stock `offset/limit`; this is a deliberate API replacement, not transparent compatibility for old scripts. Old edit scripts using `oldText/newText` must also be updated.

Pi's shared file mutation queue serializes cooperating tools. Hash comparison and writing run synchronously without an intervening async yield, but **this is optimistic protection, not an OS-level compare-and-swap**: an external process can still race the check/write. In-place writes preserve the inode and hard links; I/O failure can leave a partial write. A write attempt invalidates the snapshot until successful completion, so failures require rereading. Image detection/delegation also reopens paths; the regular-file precheck rejects static special files but cannot protect against hostile external path replacement. Lifecycle resets and cancellation during async reads reject results before a text snapshot can be published. Use ordinary version control/backups for recovery.

The [controlled token/time benchmark](../../docs/line-file-tools-benchmark.md) compares the earlier replacement-only version (`93b2753`) with stock Pi. The expanded splice schema, per-line freshness policy, image delegation and structured outputs have not been benchmarked. It completed 17 paired comparisons before a provider subscription limit stopped the planned batch. Results are scoped to those tasks, not a universal performance claim.
