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
	path: Type.String({ description: "File to edit, relative to cwd or absolute. Read it first." }),
	changes: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "Replace whole lines: each key is a 1-based line number, each value that line's new text. Omit when using splices." })),
	splices: Type.Optional(Type.Array(Type.Object({
		start: Type.Integer({ minimum: 1, description: "1-based line where the splice begins. Last line + 1 appends." }),
		deleteCount: Type.Integer({ minimum: 0, description: "Number of lines to remove starting at start. 0 inserts before start." }),
		lines: Type.Array(Type.String(), { description: "Lines to put there, one string per line. [] deletes only." }),
	}), { minItems: 1, description: "Insert, delete or replace line ranges, numbered as in the file before this call. Omit when using changes." })),
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
		promptSnippet: "Read numbered text lines (inclusive start/end) or images; required before edit can change a file.",
		promptGuidelines: stockRead.promptGuidelines,
		outputSchema: stockRead.outputSchema,
		description: "Read a local UTF-8 text file as numbered lines, or an image (jpg, png, gif, webp, bmp) as an attachment. A text read returns lines start to end, 1-based and inclusive, 200 lines by default. Reading a text file is required before edit can change it. Limits: 4 MiB per text file and 50 KiB per result; read a narrower range if a result is too large. Images ignore start and end and cannot be edited.",
		parameters: Type.Object({
			path: Type.String({ description: "File to read, relative to cwd or absolute." }),
			start: Type.Optional(Type.Integer({ minimum: 1, description: "First line, 1-based. Default 1." })),
			end: Type.Optional(Type.Integer({ minimum: 1, description: "Last line, inclusive. Default start + 199." })),
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
		promptSnippet: "Edit lines by number in one or several files, using changes (replace lines) or splices (insert, delete, replace ranges) per file.",
		promptGuidelines: [
			"Call edit with line numbers from an earlier read. Do not reread a file just to check freshness or after a successful edit: edit rejects any target that no longer matches and writes nothing. Read again only for more context, after a rejection, or after a session reset or compaction.",
			"After edit inserts or deletes lines, the lines above that point keep their numbers and stay editable. If edit rejects a line below it, read that range again and correct the line numbers instead of retrying.",
			"To change several files together, use one edit call with edits: [{path, changes}, {path, splices}].",
		],
		description: [
			"Edit lines in one or more text files that read has already shown. Line numbers come from read and refer to each file as it was before this call. Create new files with write.",
			"One file: {path, changes} or {path, splices}. Several files: {edits: [{path, changes}, {path, splices}]}, listing each file once and passing no top-level path, changes or splices.",
			"Give each file exactly one of changes or splices and leave the other out entirely, not empty. changes replaces whole existing lines by number. A splice replaces deleteCount lines at start with lines, so it can insert (deleteCount 0), delete (lines []), replace a range, or append (start = last line + 1, deleteCount 0). To replace some lines and insert or delete others in the same file, use splices for all of it. Splices in one file must not overlap or share a start. Every string is a single line with no line breaks.",
			"All files are checked before any is written. If a file has not been read, or a target line no longer matches what read showed, the call fails and nothing changes: read that range again and correct the line numbers. Do not reread just to check freshness or after success. If a disk write fails partway through a multi-file call, the error names the files already written; reread the failed file instead of repeating the whole call.",
		].join("\n\n"),
		parameters: Type.Object({
			...editFields,
			path: Type.Optional(editFields.path),
			edits: Type.Optional(Type.Array(Type.Object(editFields), { minItems: 1, description: "Edit several files in one call. Each entry is {path, changes} or {path, splices}; list each file once. Omit top-level path, changes and splices." })),
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
				if ((entry.changes === undefined) === (entry.splices === undefined)) throw new Error(`${entry.path}: provide exactly one of changes or splices and omit the other field. To replace lines and also insert or delete in this file, use splices for all of it. No edits applied.`);
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
