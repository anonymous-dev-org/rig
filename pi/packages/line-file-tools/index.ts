import { createHash } from "node:crypto";
import { constants, openSync, closeSync, fstatSync, readSync, writeSync, ftruncateSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { type ExtensionAPI, withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

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
		label: "edit (line replacements)",
		promptSnippet: "Replace existing lines using a line-number-to-text mapping; harness checks freshness.",
		description: "Replace existing lines using changes: a mapping of 1-based line numbers to new single-line text (no newline characters). Read the file first. The harness checks its private hash and refuses edits if the file changed; reread on that error. All entries refer to the current file, apply together, and preserve line endings. Empty text blanks a terminated line; blanking an unterminated final line is refused. For insertions/deletions use a complete-file write. No hashes or old text required.",
		parameters: Type.Object({ path: Type.String(), changes: Type.Record(Type.String(), Type.String()) }),
		async execute(_id, { path, changes }, signal, _update, ctx) {
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
					const entries = Object.entries(changes);
					if (!entries.length) throw new Error("Provide at least one line replacement.");
					for (const [key, text] of entries) {
						const line = Number(key);
						if (!/^[1-9]\d*$/.test(key) || !Number.isSafeInteger(line) || line > rows.length) throw new Error(`Invalid line number: ${key}. File has ${rows.length} lines.`);
						if (/[\r\n\0]/.test(text) || !text.isWellFormed()) throw new Error(`Line ${key}: replacement must be well-formed Unicode with no CR, LF, or NUL.`);
						if (text === "" && rows[line - 1].eol === "") throw new Error(`Line ${key}: cannot blank an unterminated final line without deleting it. Use a complete-file write instead.`);
						rows[line - 1].text = text;
					}
					const updated = Buffer.from(bom + rows.map(row => row.text + row.eol).join(""));
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
					snapshots.set(target, hash(updated));
					return result(`Replaced ${entries.length} line(s). Harness snapshot updated.`);
				} finally { closeSync(fd); }
			});
		},
	});
}
