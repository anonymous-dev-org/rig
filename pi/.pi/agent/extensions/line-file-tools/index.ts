import { createHash } from "node:crypto";
import { constants, openSync, closeSync, fstatSync, readSync, writeSync, ftruncateSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { type ExtensionAPI, createReadToolDefinition, detectSupportedImageMimeTypeFromFile, withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { Text } from "@earendil-works/pi-tui";

const MAX_BYTES = 4 * 1024 * 1024;
type Row = { text: string; eol: string };
const hash = (row: Row) => createHash("sha256").update(row.text).update(row.eol).digest("hex");
const result = (text: string) => ({ content: [{ type: "text" as const, text }], details: {} });

function filePath(cwd: string, path: string) {
	if (path === "~") path = homedir();
	else if (path.startsWith("~/")) path = resolve(homedir(), path.slice(2));
	return realpathSync(resolve(cwd, path));
}

// Read at most MAX_BYTES + 1, even if an external process grows the file.
function load(fd: number) {
	const stat = fstatSync(fd);
	if (!stat.isFile()) throw new Error("Only regular files are supported.");
	if (stat.size > MAX_BYTES) throw new Error("File exceeds 4 MiB.");
	const buffer = Buffer.alloc(MAX_BYTES + 1);
	let length = 0;
	while (length < buffer.length) {
		const count = readSync(fd, buffer, length, buffer.length - length, length);
		if (!count) break;
		length += count;
	}
	if (length > MAX_BYTES) throw new Error("File exceeds 4 MiB.");
	const bytes = buffer.subarray(0, length);
	const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
	if (text.includes("\0")) throw new Error("NUL-containing files are not supported.");
	const bom = text.startsWith("\uFEFF") ? "\uFEFF" : "";
	const body = text.slice(bom.length);
	// Each row owns its original terminator; a final newline adds no phantom row.
	const rows = Array.from(body.matchAll(/([^\r\n]*)(\r\n|\n|\r|$)/g), m => ({ text: m[1], eol: m[2] }));
	rows.pop(); // The regex always ends with an empty, zero-width match.
	return { bom, rows };
}

const editFields = {
	path: Type.String({ description: "File path, relative to cwd or absolute." }),
	changes: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "1-based line numbers to replacement single-line text. Omit when using splices." })),
	splices: Type.Optional(Type.Array(Type.Object({
		start: Type.Integer({ minimum: 1 }),
		deleteCount: Type.Integer({ minimum: 0 }),
		lines: Type.Array(Type.String()),
	}), { minItems: 1, description: "Range edits using pre-edit coordinates. Omit when using changes." })),
};

export default function lineFileTools(pi: ExtensionAPI) {
	const stockRead = createReadToolDefinition(process.cwd());
	const snapshots = new Map<string, { lines: string[]; eof: number }>();
	// Deliberately fail closed rather than restoring snapshots from another branch.
	let epoch = 0;
	const clear = async () => { epoch++; snapshots.clear(); };
	pi.on("session_start", clear);
	pi.on("session_before_switch", clear);
	pi.on("session_before_fork", clear);
	pi.on("session_before_tree", clear);
	pi.on("session_before_compact", clear);
	pi.on("session_shutdown", clear);

	pi.registerTool({
		name: "read",
		label: "read (numbered lines)",
		promptSnippet: "Read numbered text lines using inclusive start/end, or image attachments; harness remembers text-file freshness.",
		promptGuidelines: stockRead.promptGuidelines,
		outputSchema: stockRead.outputSchema,
		description: "Read local UTF-8 text as numbered lines, or supported images (jpg, png, gif, webp, bmp) as attachments through stock Pi processing. For text, start/end are inclusive, 1-based; defaults to lines 1–200. The harness privately remembers per-line hashes and EOF for edit. Maximum text file 4 MiB and output 50 KiB; request a narrower range if needed. Image ranges are ignored; images do not establish an edit snapshot.",
		parameters: Type.Object({
			path: Type.String(),
			start: Type.Optional(Type.Integer({ minimum: 1 })),
			end: Type.Optional(Type.Integer({ minimum: 1 })),
		}),
		async execute(id, { path, start = 1, end = start + 199 }, signal, update, ctx) {
			const target = filePath(ctx.cwd, path);
			const startedEpoch = epoch;
			return withFileMutationQueue(target, async () => {
				signal?.throwIfAborted();
				if (epoch !== startedEpoch) throw new Error("Session state changed while queued. Read the file again.");
				if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) throw new Error("Use positive integer start/end with end >= start.");
				const fd = openSync(target, constants.O_RDONLY | constants.O_NONBLOCK);
				try {
					// Reject static directories/devices/FIFOs before the stock sniff opens a path.
					if (!fstatSync(fd).isFile()) throw new Error("Only regular files are supported.");
					const mime = await detectSupportedImageMimeTypeFromFile(target);
					signal?.throwIfAborted();
					if (epoch !== startedEpoch) throw new Error("Session state changed during read. Read the file again.");
					if (mime) {
						snapshots.delete(target);
						const image = await stockRead.execute(id, { path: target }, signal, update, ctx);
						signal?.throwIfAborted();
						if (epoch !== startedEpoch) throw new Error("Session state changed during read. Read the file again.");
						return image;
					}
					const { rows } = load(fd);
					if (start > rows.length && !(rows.length === 0 && start === 1)) throw new Error(`Start is beyond EOF (${rows.length} lines).`);
					const last = Math.min(end, rows.length);
					const text = rows.slice(start - 1, last).map((row, i) => `${start + i}: ${row.text}`).join("\n");
					const output = `[${rows.length} lines total; ${rows.length ? `showing ${start}–${last}` : "empty file"}]\n${text}`;
					if (Buffer.byteLength(output) > 50 * 1024) throw new Error("Range exceeds 50 KiB. Read a narrower range.");
					snapshots.set(target, { lines: rows.map(hash), eof: rows.length });
					return { ...result(output), structuredContent: output };
				} finally { closeSync(fd); }
			});
		},
	});

	pi.registerTool({
		name: "edit",
		label: "edit (guarded lines)",
		promptSnippet: "Edit one or multiple files with changes or splices per file; checks freshness and validates the whole batch before writing.",
		promptGuidelines: [
			"When you already know the target lines and intended change from a prior numbered read or successful edit, call edit directly. Do not reread merely to check freshness or after success: edit checks private per-line snapshots before writing.",
			"After insertions/deletions, attempt known edits directly; edit rejects targets whose content no longer matches at that coordinate while earlier unchanged lines stay usable. Read only for needed context, a rejected/missing target snapshot, or a session-state reset. On rejection, read the relevant range and reconsider the coordinates rather than blindly retrying.",
			'For edit, use {path, changes} or {path, splices} for one file, or {edits: [{path, changes}, {path, splices}]} for multiple files. Supply exactly one of changes or splices per file; omit the unused field. Never combine edits with top-level path/changes/splices, and list each file only once. Read each file first to establish its snapshot; do not reread known targets just for freshness.',
		],
		description: "Edit one or multiple files using known lines; do not reread to check freshness or after success, including after splices. Use {path, changes} or {path, splices}, or batch {edits: [{path, changes}, {path, splices}]}; never mix batch and top-level file fields. Supply exactly one of changes (1-based line-number to single-line text) or splices ([{start, deleteCount, lines}]) per file; omit the unused field. List each file once; duplicate paths, symlinks and hard-link aliases are rejected. All files must have read snapshots. All files are validated before any writes; validation failure changes nothing. Disk-write failure can partially apply the batch: inspect the reported paths before retrying. Private per-line hashes reject changed/missing target snapshots; unrelated changes do not block fresh targets. On rejection, read the relevant range and reconsider coordinates. A splice replaces deleteCount lines starting at 1-based start with lines; count 0 inserts before start, empty lines deletes, start=total+1/count=0 appends. All coordinates refer to that file before this call; overlapping splices or duplicate starts are refused. Strings must contain no CR, LF or NUL. No hashes or old text required. Splices check removed rows, insertion anchors and any changed boundary row; appends check EOF and the last row. Hashes stay at their numeric coordinates, so shifted targets may reject while unchanged earlier lines stay usable. Changes preserve original terminators and cannot blank an unterminated final row. Splices use the first file terminator (else LF) for new rows; preserve final-newline presence except an empty final row needs a terminator. Empty files gain LF-terminated rows. Success returns only: Edit succeeded.",
		parameters: Type.Object({
			...editFields,
			path: Type.Optional(editFields.path),
			edits: Type.Optional(Type.Array(Type.Object(editFields), { minItems: 1, description: "Multi-file edits. Each entry has path and exactly one of changes or splices. Omit top-level path, changes and splices." })),
		}),
		// Stock edit rendering expects oldText/newText and otherwise hides success text.
		renderShell: "default",
		renderCall(args, theme) {
			return new Text(theme.fg("toolTitle", theme.bold("edit (lines) ")) + JSON.stringify(args.edits?.map(edit => edit.path) ?? args.path ?? ""), 0, 0);
		},
		renderResult(output, _options, theme, context) {
			const text = output.content.filter(item => item.type === "text").map(item => item.text).join("\n");
			return new Text(theme.fg(context.isError ? "error" : "toolOutput", text), 0, 0);
		},
		async execute(_id, params, signal, _update, ctx) {
			const { path, changes, splices, edits } = params;
			if (edits !== undefined && (path !== undefined || changes !== undefined || splices !== undefined)) throw new Error("Use edits OR top-level path/changes/splices, not both. No edits applied.");
			const requests = edits ?? (path === undefined ? [] : [{ path, changes, splices }]);
			if (!requests.length) throw new Error("Provide a path with changes/splices, or a nonempty edits array. No edits applied.");
			for (const entry of requests) {
				if ((entry.changes === undefined) === (entry.splices === undefined)) throw new Error(`${entry.path}: provide exactly one of changes or splices; omit the unused field. No edits applied.`);
			}
			const targets = requests.map(entry => ({ ...entry, target: filePath(ctx.cwd, entry.path) }));
			if (new Set(targets.map(entry => entry.target)).size !== targets.length) throw new Error("Each file must appear only once, including path/symlink aliases. No edits applied.");
			const startedEpoch = epoch;
			// Acquire overlapping batches in the same order to avoid deadlocks.
			const lockPaths = targets.map(entry => entry.target).sort();
			const locked = (index: number): Promise<ReturnType<typeof result>> => index < lockPaths.length
				? withFileMutationQueue(lockPaths[index], () => locked(index + 1))
				: apply();
			const apply = async () => {
				signal?.throwIfAborted();
				if (epoch !== startedEpoch) throw new Error("Session state changed while queued. Read the files again.");
				const handles: number[] = [];
				const identities = new Set<string>();
				try {
					const prepared = targets.map(({ target, changes, splices }) => {
						const expected = snapshots.get(target);
						if (!expected) throw new Error(`${target}: no read snapshot. Read this file before editing. No edits applied.`);
						const fd = openSync(target, constants.O_RDWR | constants.O_NONBLOCK);
						handles.push(fd);
						try {
							const stat = fstatSync(fd);
							const identity = `${stat.dev}:${stat.ino}`;
							if (identities.has(identity)) throw new Error("Each file must appear only once, including hard-link aliases.");
							identities.add(identity);
							const { bom, rows } = load(fd);
							const checkLine = (line: number) => {
								if (!rows[line - 1] || expected.lines[line - 1] !== hash(rows[line - 1])) {
									throw new Error(`Line ${line} changed or has no matching snapshot. No edits applied. Read the relevant range and reconsider the line numbers.`);
								}
							};
							const checkEOF = () => {
								if (expected.eof !== rows.length) throw new Error("EOF changed since the snapshot. No edits applied. Read the end of the file and reconsider the line numbers.");
								if (rows.length) checkLine(rows.length);
							};
							let updatedRows = rows;
							const authored = new Set<Row>();
							if (changes !== undefined) {
								const entries = Object.entries(changes);
								if (!entries.length) throw new Error("Provide at least one line replacement.");
								for (const [key, text] of entries) {
									const line = Number(key);
									if (!/^[1-9]\d*$/.test(key) || !Number.isSafeInteger(line) || line > rows.length) throw new Error(`Invalid line number: ${key}. File has ${rows.length} lines.`);
									if (/[\r\n\0]/.test(text) || !text.isWellFormed()) throw new Error(`Line ${key}: replacement must be well-formed Unicode with no CR, LF, or NUL.`);
									if (text === "" && rows[line - 1].eol === "") throw new Error(`Line ${key}: cannot blank an unterminated final line without deleting it. Use splices instead.`);
									checkLine(line);
									rows[line - 1].text = text;
									authored.add(rows[line - 1]);
								}
							} else {
								if (!splices?.length) throw new Error("Provide at least one splice.");
								const ordered = [...splices].sort((a, b) => a.start - b.start);
								const eol = rows.find(row => row.eol)?.eol ?? "\n";
								const finalEol = rows.at(-1)?.eol ?? eol;
								const segments: typeof rows[] = [];
								let cursor = 0;
								let previousStart = 0;
								for (const { start, deleteCount, lines } of ordered) {
									if (!Number.isSafeInteger(start) || start < 1 || start > rows.length + 1 || !Number.isSafeInteger(deleteCount) || deleteCount < 0 || deleteCount > rows.length - start + 1) throw new Error("Splice is outside the file. Use start 1..total+1 and a valid nonnegative deleteCount.");
									if (start === previousStart || start - 1 < cursor) throw new Error("Splices overlap or share a start. Combine them into one splice.");
									if (!deleteCount && !lines.length) throw new Error("An empty insertion is not an edit.");
									for (const text of lines) {
										if (/[\r\n\0]/.test(text) || !text.isWellFormed()) throw new Error("Splice lines must be well-formed Unicode with no CR, LF, or NUL.");
									}
									for (let line = start; line < start + deleteCount; line++) checkLine(line);
									if (!deleteCount) {
										if (start > 1) checkLine(start - 1);
										if (start <= rows.length) checkLine(start);
										else checkEOF();
									}
									const added = lines.map(text => ({ text, eol }));
									for (const row of added) authored.add(row);
									segments.push(rows.slice(cursor, start - 1), added);
									cursor = start - 1 + deleteCount;
									previousStart = start;
								}
								segments.push(rows.slice(cursor));
								updatedRows = segments.flat();
								for (let i = 0; i < updatedRows.length; i++) {
									const row = updatedRows[i];
									// Guard retained rows whose terminator changes at a splice boundary.
									let nextEol = row.eol;
									if (i < updatedRows.length - 1) nextEol ||= eol;
									else if (!finalEol && row.text !== "") nextEol = "";
									else nextEol ||= eol;
									if (nextEol !== row.eol) {
										if (!authored.has(row)) checkLine(rows.indexOf(row) + 1);
										row.eol = nextEol;
										authored.add(row);
									}
								}
							}
							const updated = Buffer.from(bom + updatedRows.map(row => row.text + row.eol).join(""));
							if (updated.length > MAX_BYTES) throw new Error("Edited file would exceed 4 MiB.");
							// Keep baselines at their numeric coordinates, even after a shift.
							const next = { lines: [...expected.lines], eof: expected.eof === rows.length ? updatedRows.length : expected.eof };
							updatedRows.forEach((row, index) => { if (authored.has(row)) next.lines[index] = hash(row); });
							return { target, fd, updated, next };
						} catch (error) {
							throw new Error(`${target}: ${error instanceof Error ? error.message : String(error)} No edits applied.`);
						}
					});
					// No async yield between validation and all writes.
					const completed: string[] = [];
					for (const { target, fd, updated, next } of prepared) {
						// Invalidate before any write, including failures/partial writes.
						snapshots.delete(target);
						try {
							let offset = 0;
							while (offset < updated.length) {
								const written = writeSync(fd, updated, offset, updated.length - offset, offset);
								if (!written) throw new Error("Write made no progress.");
								offset += written;
							}
							ftruncateSync(fd, updated.length);
							snapshots.set(target, next);
							completed.push(target);
						} catch (error) {
							throw new Error(`Write failed for ${target}; it may be partially modified. Completed files: ${JSON.stringify(completed)}. Remaining files were not written. Inspect completed files and reread the failed file before retrying; do not replay the whole batch. ${error instanceof Error ? error.message : String(error)}`);
						}
					}
					return result("Edit succeeded.");
				} finally { for (const fd of handles) closeSync(fd); }
			};
			return locked(0);
		},
	});
}
