import { createHash } from "node:crypto";
import { constants, openSync, closeSync, fstatSync, readSync, writeSync, ftruncateSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { type ExtensionAPI, withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { Text } from "@earendil-works/pi-tui";

const MAX_BYTES = 4 * 1024 * 1024;
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
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
	return { bytes, bom, rows };
}

export default function lineFileTools(pi: ExtensionAPI) {
	const snapshots = new Map<string, string>();
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
		promptSnippet: "Read numbered lines using inclusive start/end; harness remembers file freshness.",
		description: "Read a local UTF-8 file as numbered lines. start/end are inclusive, 1-based; defaults to lines 1–200. The harness privately remembers the full-file hash for edit. Maximum file 4 MiB and output 50 KiB; request a narrower range if needed. Text only.",
		parameters: Type.Object({
			path: Type.String(),
			start: Type.Optional(Type.Integer({ minimum: 1 })),
			end: Type.Optional(Type.Integer({ minimum: 1 })),
		}),
		async execute(_id, { path, start = 1, end = start + 199 }, signal, _update, ctx) {
			const target = filePath(ctx.cwd, path);
			const startedEpoch = epoch;
			return withFileMutationQueue(target, async () => {
				signal?.throwIfAborted();
				if (epoch !== startedEpoch) throw new Error("Session state changed while queued. Read the file again.");
				if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) throw new Error("Use positive integer start/end with end >= start.");
				const fd = openSync(target, constants.O_RDONLY | constants.O_NONBLOCK);
				try {
					const { bytes, rows } = load(fd);
					if (start > rows.length && !(rows.length === 0 && start === 1)) throw new Error(`Start is beyond EOF (${rows.length} lines).`);
					const last = Math.min(end, rows.length);
					const text = rows.slice(start - 1, last).map((row, i) => `${start + i}: ${row.text}`).join("\n");
					const output = `[${rows.length} lines total; ${rows.length ? `showing ${start}–${last}` : "empty file"}]\n${text}`;
					if (Buffer.byteLength(output) > 50 * 1024) throw new Error("Range exceeds 50 KiB. Read a narrower range.");
					snapshots.set(target, hash(bytes));
					return result(output);
				} finally { closeSync(fd); }
			});
		},
	});

	pi.registerTool({
		name: "edit",
		label: "edit (guarded lines)",
		promptSnippet: "Replace lines with changes, or insert/delete/replace ranges with splices; harness checks freshness.",
		description: "Read first. Supply exactly one of changes (1-based line-number to single-line text) or splices ([{start, deleteCount, lines}]). A splice replaces deleteCount lines starting at 1-based start with lines; count 0 inserts before start, empty lines deletes, start=total+1/count=0 appends. All coordinates refer to the pre-edit file; overlapping splices or duplicate starts are refused. Strings must contain no CR, LF or NUL. No hashes or old text required: harness refuses missing/stale snapshots. Changes preserve original terminators and cannot blank an unterminated final row. Splices use the first file terminator (else LF) for new rows; preserve final-newline presence except an empty final row needs a terminator. Empty files gain LF-terminated rows. After any splice changes row positions, reread before another edit (even when total line count stays equal).",
		parameters: Type.Object({
			path: Type.String(),
			changes: Type.Optional(Type.Record(Type.String(), Type.String())),
			splices: Type.Optional(Type.Array(Type.Object({
				start: Type.Integer({ minimum: 1 }),
				deleteCount: Type.Integer({ minimum: 0 }),
				lines: Type.Array(Type.String()),
			}), { minItems: 1 })),
		}),
		// Stock edit rendering expects oldText/newText and otherwise hides success text.
		renderShell: "default",
		renderCall(args, theme) {
			return new Text(theme.fg("toolTitle", theme.bold("edit (lines) ")) + JSON.stringify(args.path ?? ""), 0, 0);
		},
		renderResult(output, _options, theme, context) {
			const text = output.content.filter(item => item.type === "text").map(item => item.text).join("\n");
			return new Text(theme.fg(context.isError ? "error" : "toolOutput", text), 0, 0);
		},
		async execute(_id, { path, changes, splices }, signal, _update, ctx) {
			if ((changes === undefined) === (splices === undefined)) throw new Error("Provide exactly one of changes or splices.");
			const target = filePath(ctx.cwd, path);
			const startedEpoch = epoch;
			return withFileMutationQueue(target, async () => {
				signal?.throwIfAborted();
				if (epoch !== startedEpoch) throw new Error("Session state changed while queued. Read the file again.");
				const expected = snapshots.get(target);
				if (!expected) throw new Error("No read snapshot. Read this file before editing.");
				const fd = openSync(target, constants.O_RDWR | constants.O_NONBLOCK);
				try {
					const { bytes, bom, rows } = load(fd);
					if (hash(bytes) !== expected) {
						snapshots.delete(target);
						throw new Error("File changed since your last read or successful edit. No edits applied. Reread the file and reconsider the line numbers.");
					}
					let updatedRows = rows;
					let positionsChanged = false;
					let operationCount = 0;
					if (changes !== undefined) {
						const entries = Object.entries(changes);
						if (!entries.length) throw new Error("Provide at least one line replacement.");
						operationCount = entries.length;
						for (const [key, text] of entries) {
							const line = Number(key);
							if (!/^[1-9]\d*$/.test(key) || !Number.isSafeInteger(line) || line > rows.length) throw new Error(`Invalid line number: ${key}. File has ${rows.length} lines.`);
							if (/[\r\n\0]/.test(text) || !text.isWellFormed()) throw new Error(`Line ${key}: replacement must be well-formed Unicode with no CR, LF, or NUL.`);
							if (text === "" && rows[line - 1].eol === "") throw new Error(`Line ${key}: cannot blank an unterminated final line without deleting it. Use splices instead.`);
							rows[line - 1].text = text;
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
							segments.push(rows.slice(cursor, start - 1), lines.map(text => ({ text, eol })));
							cursor = start - 1 + deleteCount;
							previousStart = start;
							positionsChanged ||= lines.length !== deleteCount;
						}
						segments.push(rows.slice(cursor));
						updatedRows = segments.flat();
						for (let i = 0; i < updatedRows.length; i++) {
							const row = updatedRows[i];
							// Only an appended-after old final row can lack an interior separator.
							if (i < updatedRows.length - 1) row.eol ||= eol;
							else if (!finalEol && row.text !== "") row.eol = "";
							else row.eol ||= eol;
						}
						operationCount = splices.length;
					}
					const updated = Buffer.from(bom + updatedRows.map(row => row.text + row.eol).join(""));
					if (updated.length > MAX_BYTES) throw new Error("Edited file would exceed 4 MiB.");
					// Invalidate before any write, including failures/partial writes.
					snapshots.delete(target);
					let offset = 0;
					while (offset < updated.length) {
						const written = writeSync(fd, updated, offset, updated.length - offset, offset);
						if (!written) throw new Error("Write made no progress. Reread the file before retrying.");
						offset += written;
					}
					ftruncateSync(fd, updated.length);
					// Queued calls may still carry pre-splice coordinates. Require a new read
					// after any positional change, including net-zero delete/insert batches.
					if (!positionsChanged) snapshots.set(target, hash(updated));
					return result(`Applied ${operationCount} ${changes !== undefined ? "line replacement(s)" : "splice(s)"}. ${rows.length} -> ${updatedRows.length} lines. ${positionsChanged ? "Line positions changed; read again before the next edit." : "Harness snapshot updated."}`);
				} finally { closeSync(fd); }
			});
		},
	});
}
