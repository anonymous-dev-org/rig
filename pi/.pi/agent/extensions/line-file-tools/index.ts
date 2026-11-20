import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { constants, openSync, closeSync, existsSync, fstatSync, readdirSync, readSync, writeSync, ftruncateSync, realpathSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { type ExtensionAPI, createReadToolDefinition, createWriteToolDefinition, detectSupportedImageMimeTypeFromFile, withFileMutationQueue } from "@earendil-works/pi-coding-agent";
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
	return decode(bytes);
}

function decode(bytes: Buffer) {
	if (bytes.length > MAX_BYTES) throw new Error("File exceeds 4 MiB.");
	const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
	if (text.includes("\0")) throw new Error("NUL-containing files are not supported.");
	const bom = text.startsWith("\uFEFF") ? "\uFEFF" : "";
	const body = text.slice(bom.length);
	// Each row owns its original terminator; a final newline adds no phantom row.
	const rows = Array.from(body.matchAll(/([^\r\n]*)(\r\n|\n|\r|$)/g), m => ({ text: m[1], eol: m[2] }));
	rows.pop(); // The regex always ends with an empty, zero-width match.
	return { bom, rows };
}

function writeAll(fd: number, data: Buffer) {
	let offset = 0;
	while (offset < data.length) {
		const written = writeSync(fd, data, offset, data.length - offset, offset);
		if (!written) throw new Error("Write made no progress.");
		offset += written;
	}
	ftruncateSync(fd, data.length);
}

// Only an applicable project configuration opts a file into format-on-save.
const WEB = /\.(?:[cm]?[jt]sx?|jsonc?|css|graphql|gql)$/i;
const PRETTIER = /\.(?:[cm]?[jt]sx?|json[5c]?|[cm]?mdx?|css|scss|less|graphql|gql|html?|vue|ya?ml)$/i;
const FORMATTERS = [
	{ bin: "biome", files: WEB, config: /^biome\.jsonc?$/, args: (file: string) => ["format", `--stdin-file-path=${file}`] },
	{ bin: "prettier", files: PRETTIER, config: /^(\.prettierrc(\..+)?|prettier\.config\.[cm]?[jt]s)$/, args: (file: string) => ["--stdin-filepath", file] },
	{ bin: "oxfmt", files: PRETTIER, config: /^(\.oxfmtrc\.jsonc?|oxfmt\.config\.[cm]?[jt]s)$/, args: (file: string) => [`--stdin-filepath=${file}`] },
	{ bin: "gofmt", files: /\.go$/i, config: /^go\.mod$/, args: (_file: string) => [] as string[] },
	{ bin: "rustfmt", files: /\.rs$/i, config: /^(Cargo\.toml|\.?rustfmt\.toml)$/, args: (_file: string) => ["--emit", "stdout", "--config", "skip_children=true"] },
	{ bin: "ruff", files: /\.pyi?$/i, config: /^\.?ruff\.toml$/, args: (file: string) => ["format", "--stdin-filename", file, "-"] },
];

function readConfig(path: string) {
	try {
		const fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
		try { return load(fd).rows.map(row => row.text).join("\n"); } finally { closeSync(fd); }
	} catch { return ""; }
}

function findFormatter(file: string) {
	for (let dir = dirname(file); ; dir = dirname(dir)) {
		let names: string[] = [];
		try { names = readdirSync(dir); } catch {}
		let prettier = false;
		try { prettier = Object.hasOwn(JSON.parse(readConfig(join(dir, "package.json"))), "prettier"); } catch {}
		// Recognise ordinary Ruff table headers, including [tool.ruff.format]. Strip TOML
		// multiline strings first so example config inside a string does not opt in.
		const pyproject = readConfig(join(dir, "pyproject.toml")).replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, "");
		const ruff = /^\s*\[tool\.ruff(?:\.[\w-]+)*\]\s*(?:#.*)?$/m.test(pyproject);
		const found = FORMATTERS.find(formatter => formatter.files.test(file) && (
			names.some(name => formatter.config.test(name)) ||
			(formatter.bin === "prettier" && prettier) || (formatter.bin === "ruff" && ruff)
		));
		if (found) {
			let command = found.bin;
			for (let up = dirname(file); ; up = dirname(up)) {
				const local = join(up, "node_modules", ".bin", found.bin);
				if (existsSync(local)) { command = local; break; }
				if (dirname(up) === up) break;
			}
			return { name: found.bin, command, args: found.args(file), cwd: found.bin === "rustfmt" ? dirname(file) : dir };
		}
		if (dirname(dir) === dir) return undefined;
	}
}

// Bound both runtime and buffered output, even if a formatter ignores SIGTERM.
function runFormatter(command: string, args: string[], cwd: string, input: Buffer, timeout: number, signal?: AbortSignal) {
	return new Promise<Buffer | undefined>((done) => {
		if (signal?.aborted) { done(undefined); return; }
		const child = spawn(command, args, { cwd, stdio: ["pipe", "pipe", "ignore"] });
		let settled = false;
		let size = 0;
		const chunks: Buffer[] = [];
		const finish = (output?: Buffer, kill = false) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			signal?.removeEventListener("abort", abort);
			if (kill) child.kill("SIGKILL");
			child.stdin.destroy();
			child.stdout.destroy();
			done(output);
		};
		const timer = setTimeout(() => finish(undefined, true), Math.max(1, timeout));
		const abort = () => finish(undefined, true);
		signal?.addEventListener("abort", abort, { once: true });
		child.on("error", () => finish());
		child.on("close", code => finish(code === 0 ? Buffer.concat(chunks) : undefined));
		child.stdout.on("data", (chunk: Buffer) => {
			size += chunk.length;
			if (size > MAX_BYTES) finish(undefined, true);
			else if (!settled) chunks.push(chunk);
		});
		child.stdin.on("error", () => {});
		child.stdin.end(input);
	});
}

async function rustEdition(file: string, deadline: number, signal?: AbortSignal) {
	for (let dir = dirname(file); ; dir = dirname(dir)) {
		const manifest = join(dir, "Cargo.toml");
		if (existsSync(manifest)) {
			// Cargo resolves package/workspace edition inheritance without a custom TOML parser.
			// --frozen forbids network access and lockfile changes.
			const output = await runFormatter("cargo", ["metadata", "--no-deps", "--format-version", "1", "--frozen", "--manifest-path", manifest], dir, Buffer.alloc(0), deadline - Date.now(), signal);
			if (!output) throw new Error("Cannot resolve Rust edition.");
			const packages = JSON.parse(output.toString()).packages as { manifest_path: string; edition: string }[];
			const pkg = packages.filter(pkg => {
				const path = relative(dirname(pkg.manifest_path), file);
				return path !== ".." && !path.startsWith("../") && !path.startsWith("/");
			}).sort((a, b) => b.manifest_path.length - a.manifest_path.length)[0];
			if (!pkg || !/^(2015|2018|2021|2024)$/.test(pkg.edition)) throw new Error("Cannot resolve Rust edition.");
			return pkg.edition;
		}
		if (dirname(dir) === dir) return undefined; // Config-only projects use rustfmt's edition.
	}
}

// Conservative spacing comparison, not a language parser. Never erase spaces in quoted text,
// regex literals, templates, JSX, or indentation-sensitive languages from a snapshot comparison.
function spacingKeys(file: string, rows: Row[]) {
	if (!/\.(?:[cm]?[jt]s|jsonc?|go|rs)$/i.test(file)) return undefined;
	const body = rows.map(row => row.text).join("\n");
	if (/`|\/\*|\\[\r\n]|\b[bc]?r#*"/.test(body)) return undefined;
	const keys: (string | undefined)[] = [];
	for (const row of rows) {
		let key = "", cursor = 0;
		for (const match of row.text.matchAll(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g)) {
			const plain = row.text.slice(cursor, match.index);
			if (/["']/.test(plain)) return undefined; // Multiline/ambiguous string.
			key += plain.replace(/[ \t]/g, "") + match[0];
			cursor = match.index! + match[0].length;
		}
		const tail = row.text.slice(cursor);
		if (/["']/.test(tail)) return undefined;
		key += tail.replace(/[ \t]/g, "");
		keys.push(key.includes("/") ? undefined : key);
	}
	return keys;
}

const readFields = {
	path: Type.String({ description: "File to read (relative or absolute)." }),
	start: Type.Optional(Type.Integer({ minimum: 1, description: "First line, 1-based. Default 1." })),
	end: Type.Optional(Type.Integer({ minimum: 1, description: "Last line, inclusive. Default start + 199." })),
};

const editFields = {
	path: Type.String({ description: "File to edit, relative or absolute. Shown by read/edit/write." }),
	splices: Type.Optional(Type.Array(Type.Object({
		start: Type.Integer({ minimum: 1, description: "1-based start line; last line + 1 appends." }),
		deleteCount: Type.Integer({ minimum: 0, description: "Lines to remove from start; 0 inserts." }),
		lines: Type.Array(Type.String(), { description: "Replacement lines, one string each; [] deletes." }),
	}), { minItems: 1, description: "Line splices. Numbers = file before this call." })),
};

function readAgain(path: string, line: number, total: number) {
	const start = Math.max(1, Math.min(line, total || 1));
	const end = Math.max(start, Math.min(total, start + 199));
	return `Read ${JSON.stringify(path)} again from line ${start} to ${end} if you need to make edits in that region${total === 0 ? " (empty file; read start 1, end 1)" : ""}; reconsider the coordinates. Narrow the range if it exceeds the read output limit.`;
}

function rejectChanges(input: object) {
	if (Object.hasOwn(input, "changes")) throw new Error("The changes argument was removed. Use splices: [{start: line, deleteCount: 1, lines: [replacement]}] for line replacements, or other splices for insert/delete. No edits applied.");
}

export default function lineFileTools(pi: ExtensionAPI) {
	const stockRead = createReadToolDefinition(process.cwd());
	const snapshots = new Map<string, { lines: string[]; eof: number }>();
	// Deliberately fail closed rather than restoring snapshots from another branch.
	let epoch = 0;
	let lifecycle = new AbortController();
	let reset = { event: "extension initialization", reason: "session start pending", at: new Date().toISOString() };
	const clear = async (event: { type: string; reason?: string }) => {
		lifecycle.abort(); lifecycle = new AbortController();
		epoch++; snapshots.clear();
		reset = { event: event.type, reason: event.reason ?? "not supplied", at: new Date().toISOString() };
	};
	pi.on("session_start", clear);
	pi.on("session_before_switch", clear);
	pi.on("session_before_fork", clear);
	pi.on("session_before_tree", clear);
	pi.on("session_before_compact", clear);
	pi.on("session_shutdown", clear);

	// Run while the mutation owns its queue; previews must observe completed formatting.
	const format = async (target: string, signal?: AbortSignal) => {
		try {
			signal = AbortSignal.any([lifecycle.signal, ...(signal ? [signal] : [])]);
			const formatter = findFormatter(target);
			if (!formatter || signal?.aborted) return;
			const startedEpoch = epoch;
			const fd = openSync(target, constants.O_RDONLY | constants.O_NONBLOCK);
			let before: Buffer;
			try {
				const { bom, rows } = load(fd);
				before = Buffer.from(bom + rows.map(row => row.text + row.eol).join(""));
			} finally { closeSync(fd); }
			const expected = snapshots.get(target);
			const deadline = Date.now() + 10_000;
			const args = [...formatter.args];
			if (formatter.name === "rustfmt") {
				const edition = await rustEdition(target, deadline, signal);
				if (edition) args.push("--edition", edition);
			}
			if (Date.now() >= deadline) return;
			const after = await runFormatter(formatter.command, args, formatter.cwd, before, deadline - Date.now(), signal);
			if (!after || after.equals(before) || epoch !== startedEpoch || signal?.aborted) return;
			const previous = decode(before), formatted = decode(after);
			const next = expected ? { lines: [...expected.lines], eof: expected.eof } : undefined;
			if (next && previous.rows.length === formatted.rows.length) {
				const a = spacingKeys(target, previous.rows), b = spacingKeys(target, formatted.rows);
				previous.rows.forEach((row, i) => {
					if (expected!.lines[i] !== hash(row)) return; // Never bless an external/stale change.
					if (row.text === formatted.rows[i].text || (a?.[i] !== undefined && a[i] === b?.[i])) next.lines[i] = hash(formatted.rows[i]);
				});
			}
			const out = openSync(target, constants.O_RDWR | constants.O_NONBLOCK);
			try {
				const { bom, rows } = load(out);
				if (!Buffer.from(bom + rows.map(row => row.text + row.eol).join("")).equals(before)) return;
				snapshots.delete(target); // A partial write must not keep any baseline usable.
				writeAll(out, after);
				if (next) snapshots.set(target, next);
			} finally { closeSync(out); }
		} catch {} // Formatting failure never fails a completed mutation.
	};

	// Only displayed rows gain fresh baselines; unseen external changes remain stale.
	const preview = (target: string, ranges: { start: number; end: number }[] | undefined, budget: { bytes: number; lines: number }, startedEpoch: number, signal?: AbortSignal, authored?: Buffer) => {
		const parts: string[] = [];
		const add = (text: string) => {
			const bytes = Buffer.byteLength(text) + 1, lines = text.split("\n").length;
			if (bytes > budget.bytes || lines > budget.lines) return false;
			budget.bytes -= bytes; budget.lines -= lines; parts.push(text); return true;
		};
		try {
			if (epoch !== startedEpoch || signal?.aborted) throw new Error("Cancellation/session reset; read before editing.");
			const fd = openSync(target, constants.O_RDONLY | constants.O_NONBLOCK);
			let loaded: ReturnType<typeof load>;
			try { loaded = load(fd); } finally { closeSync(fd); }
			const { bom, rows } = loaded;
			if (authored && !Buffer.from(bom + rows.map(row => row.text + row.eol).join("")).equals(authored)) ranges = undefined;
			if (!add(`File: ${JSON.stringify(target)}\n[${rows.length} lines total; ${rows.length ? "resulting content" : "empty file"}]`)) return `File: ${JSON.stringify(target)}\n[Written, but not shown: output limit reached. Read before editing.]`;
			const expected = snapshots.get(target);
			const next = { lines: [...(expected?.lines ?? [])], eof: expected?.eof ?? -1 };
			let omitted = false, previous = 0;
			for (let i = 0; i < rows.length; i++) {
				if (ranges && !ranges.some(range => i + 1 >= range.start && i + 1 <= range.end)) continue;
				const text = `${i + 1}: ${rows[i].text}`;
				if (budget.bytes < Buffer.byteLength(text) + 256 || budget.lines < 4 || !add((previous && previous !== i ? "[...]\n" : "") + text)) { omitted = true; break; }
				next.lines[i] = hash(rows[i]); previous = i + 1;
				if (i === rows.length - 1) next.eof = rows.length;
			}
			if (!rows.length) next.eof = 0;
			snapshots.set(target, next);
			if (omitted) parts.push("[Output limit reached; later lines not shown. Read them before editing them.]");
		} catch (error) {
			parts.push(`File: ${JSON.stringify(target)}\n[Written, but numbered preview unavailable: ${error instanceof Error ? error.message : String(error)} Read before editing; numbered tools require regular UTF-8 text up to 4 MiB without NUL.]`);
		}
		return parts.join("\n");
	};

	const stockWrite = createWriteToolDefinition(process.cwd());
	pi.registerTool({
		...stockWrite,
		description: stockWrite.description + " Numbered output after formatting; use for next edits. Preview capped 50 KiB/2000 lines; read omitted regions first. Omit cosmetic indent only; keep meaningful whitespace. Unsupported/oversized: written, no preview.",
		promptGuidelines: [...(stockWrite.promptGuidelines ?? []), "Use numbered write output directly for subsequent edit coordinates; read only omitted content, more context, or after rejection/reset. For write, omit cosmetic indentation only; preserve meaningful whitespace."],
		renderResult(output, _options, theme, context) {
			return new Text(theme.fg(context.isError ? "error" : "toolOutput", output.content.filter(item => item.type === "text").map(item => item.text).join("\n")), 0, 0);
		},
		async execute(id, params, signal, update, ctx) {
			const startedEpoch = epoch;
			let notice = "";
			const write = createWriteToolDefinition(ctx.cwd, { operations: {
				mkdir: async dir => { await mkdir(dir, { recursive: true }); },
				writeFile: async (path, content) => {
					if (epoch !== startedEpoch) throw new Error("Session state changed while queued. Retry the write.");
					let target = path;
					try { target = realpathSync(path); } catch {}
					snapshots.delete(target);
					await writeFile(path, content, "utf8");
					try { target = realpathSync(path); } catch {}
					if (epoch !== startedEpoch || signal?.aborted) { notice = "File written; preview unavailable after cancellation/session reset. Read before editing."; return; }
					await format(target, signal);
					notice = preview(target, undefined, { bytes: 48 * 1024, lines: 1900 }, startedEpoch, signal);
				},
			} });
			const output = await write.execute(id, params, signal, update, ctx);
			return { ...output, content: [{ type: "text" as const, text: ["Write succeeded.", notice].filter(Boolean).join("\n") }] };
		},
	});


	pi.registerTool({
		name: "read",
		label: "read (numbered lines)",
		promptSnippet: "Read numbered text lines (inclusive start/end) or images from one or several files; edit/write also return usable numbered content.",
		promptGuidelines: [...(stockRead.promptGuidelines ?? []), "To read several files or ranges together, use reads: [{path, start?, end?}]. Omit top-level path/start/end."],
		outputSchema: Type.Union([stockRead.outputSchema!, Type.Array(Type.Object({ path: Type.String(), result: stockRead.outputSchema! }))]),
		description: "Read UTF-8 as numbered lines; images as attachments. Single: {path,start?,end?}. Lines 1-based, inclusive, default 200. Batch: {reads:[{path,start?,end?}]}, no top-level path/start/end. Limit 4 MiB/file, 50 KiB text/call: narrow or split. Images: no range, not editable. Batch: request order, names paths. Fail: earlier reads keep snapshots.",
		parameters: Type.Object({
			...readFields,
			path: Type.Optional(readFields.path),
			reads: Type.Optional(Type.Array(Type.Object(readFields), { minItems: 1, description: "Read several files or ranges. Omit top-level path/start/end." })),
		}),
		renderCall(args, theme) {
			return new Text(theme.fg("toolTitle", theme.bold("read (lines) ")) + JSON.stringify(args.reads ?? args.path ?? ""), 0, 0);
		},
		async execute(id, params, signal, update, ctx) {
			const { path, start, end, reads } = params;
			if (reads !== undefined && (path !== undefined || start !== undefined || end !== undefined)) throw new Error("Use reads OR top-level path/start/end, not both.");
			const requests = reads ?? (path === undefined ? [] : [{ path, start, end }]);
			if (!requests.length) throw new Error("Provide a path or a nonempty reads array.");
			const startedEpoch = epoch;
			let textBytes = reads ? requests.reduce((sum, entry) => sum + Buffer.byteLength(`File: ${JSON.stringify(entry.path)}\n`), 0) : 0;
			if (textBytes > 50 * 1024) throw new Error("Batch labels exceed 50 KiB. Split the batch.");
			const readOne = async ({ path, start = 1, end = start + 199 }: { path: string; start?: number; end?: number }) => {
				const target = filePath(ctx.cwd, path);
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
						textBytes += Buffer.byteLength(output);
						if (textBytes > 50 * 1024) throw new Error("Batch exceeds 50 KiB of text. Read narrower ranges or split the batch.");
						snapshots.set(target, { lines: rows.map(hash), eof: rows.length });
						return { ...result(output), structuredContent: output };
					} finally { closeSync(fd); }
				});
			};
			if (!reads) return readOne(requests[0]);
			const content: Awaited<ReturnType<typeof readOne>>["content"] = [];
			const structuredContent: { path: string; result: unknown }[] = [];
			for (const request of requests) {
				try {
					const output = await readOne(request);
					content.push({ type: "text", text: `File: ${JSON.stringify(request.path)}` }, ...output.content);
					structuredContent.push({ path: request.path, result: output.structuredContent });
				} catch (error) {
					throw new Error(`${request.path}: ${error instanceof Error ? error.message : String(error)}. Earlier successful reads retain their snapshots.`);
				}
			}
			return { content, details: {}, structuredContent };
		},
	});

	pi.registerTool({
		name: "edit",
		label: "edit (guarded lines)",
		promptSnippet: "Edit lines by number in one or several files using splices (insert, delete, replace ranges).",
		promptGuidelines: [
			"Use line numbers from read or successful edit/write numbered output. Returned coordinates have usable snapshots; do not reread merely to verify success. Read omitted regions, for more context, after rejection, or after session reset/compaction.",
			"After edit shifts lines, use the returned resulting coordinates, not old shifted coordinates. Earlier unchanged regions remain usable.",
			"To change several files together, use one edit call with edits: [{path, splices}, ...].",
			"For edit, omit leading tabs/spaces used only for cosmetic indentation. Preserve required spaces between tokens and all meaningful whitespace: Python/YAML indentation, Makefile recipe tabs, Markdown structure, and string/template contents.",
		],
		description: [
			"Edit files shown numbered by read/edit/write. Coords = file state before call. New file: write.",
			"Single: {path,splices}. Batch: {edits:[{path,splices}]}, one per file, no top-level path/splices.",
			"Splice: replace deleteCount lines at start with lines. Insert: deleteCount 0. Delete: lines []. Append: start = last+1. No overlap or shared start per file. One string per line.",
			"All files checked before write. Missing/stale snapshot: whole call rejected, no change. Read indicated range, fix coords. Never bypass via write/bash. Partial write failure: names done files. Do not replay batch.",
			"Success: numbered affected ranges incl deletion boundaries, after formatting. Use directly for next edits. Formatting changed content: whole file returned, capped 50 KiB/2000 lines. Read omitted regions first. Limits never fail done mutation. Keep meaningful whitespace; omit cosmetic indent only.",
		].join("\n\n"),
		parameters: Type.Object({
			...editFields,
			path: Type.Optional(editFields.path),
			edits: Type.Optional(Type.Array(Type.Object(editFields), { minItems: 1, description: "Batch: one {path,splices} per file. Omit top-level path/splices." })),
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
			const { path, splices, edits } = params;
			rejectChanges(params);
			if (edits !== undefined && (path !== undefined || splices !== undefined)) throw new Error("Use edits OR top-level path/splices, not both. No edits applied.");
			const requests = edits ?? (path === undefined ? [] : [{ path, splices }]);
			if (!requests.length) throw new Error("Provide a path with splices, or a nonempty edits array. No edits applied.");
			for (const entry of requests) {
				rejectChanges(entry);
				if (!entry.splices?.length) throw new Error(`${entry.path}: provide at least one splice. No edits applied.`);
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
					const prepared = targets.map(({ target, splices }) => {
						const expected = snapshots.get(target);
						const fd = openSync(target, constants.O_RDWR | constants.O_NONBLOCK);
						handles.push(fd);
						try {
							const stat = fstatSync(fd);
							const identity = `${stat.dev}:${stat.ino}`;
							if (identities.has(identity)) throw new Error("Each file must appear only once, including hard-link aliases.");
							identities.add(identity);
							const { bom, rows } = load(fd);
if (!expected) throw new Error(`No read snapshot (never read or cleared by write/reset). The snapshot cache was last cleared at ${reset.at} by ${reset.event} (reason: ${reset.reason}); this does not mean the file changed. ${readAgain(target, splices![0].start, rows.length)}`);
							const checkLine = (line: number) => {
								if (!rows[line - 1] || expected.lines[line - 1] !== hash(rows[line - 1])) {
									throw new Error(`File changed or this coordinate has no matching snapshot (possibly moved by edit/formatting). ${readAgain(target, line, rows.length)}`);
								}
							};
							const checkEOF = () => {
								if (expected.eof !== rows.length) throw new Error(`File EOF changed since the snapshot. ${readAgain(target, Math.max(1, rows.length - 199), rows.length)}`);
								if (rows.length) checkLine(rows.length);
							};
							let updatedRows = rows;
							const authored = new Set<Row>();
							const ordered = [...splices!].sort((a, b) => a.start - b.start);
							const eol = rows.find(row => row.eol)?.eol ?? "\n";
							const finalEol = rows.at(-1)?.eol ?? eol;
							const segments: typeof rows[] = [];
							let cursor = 0;
							let previousStart = 0;
							for (const { start, deleteCount, lines } of ordered) {
								if (!Number.isSafeInteger(start) || start < 1 || start > rows.length + 1 || !Number.isSafeInteger(deleteCount) || deleteCount < 0 || deleteCount > rows.length - start + 1) throw new Error(`Splice is outside the current file (${rows.length} lines). Use start 1..total+1 and a valid nonnegative deleteCount. ${readAgain(target, Number.isSafeInteger(start) ? start : 1, rows.length)}`);
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
							const updated = Buffer.from(bom + updatedRows.map(row => row.text + row.eol).join(""));
							if (updated.length > MAX_BYTES) throw new Error("Edited file would exceed 4 MiB.");
							// Keep baselines at their numeric coordinates, even after a shift.
							const next = { lines: [...expected.lines], eof: expected.eof === rows.length ? updatedRows.length : expected.eof };
							updatedRows.forEach((row, index) => { if (authored.has(row)) next.lines[index] = hash(row); });
							let offset = 0;
							const ranges = ordered.map(splice => {
								const start = splice.start + offset;
								offset += splice.lines.length - splice.deleteCount;
								return { start: Math.max(1, start - 1), end: start + splice.lines.length };
							});
							return { target, fd, updated, next, ranges };
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
							writeAll(fd, updated);
							snapshots.set(target, next);
							completed.push(target);
						} catch (error) {
							throw new Error(`Write failed for ${target}; it may be partially modified. Completed files: ${JSON.stringify(completed)}. Remaining files were not written. Inspect completed files and reread the failed file before retrying; do not replay the whole batch. ${error instanceof Error ? error.message : String(error)}`);
						}
					}
					const budget = { bytes: 48 * 1024, lines: 1900 };
					const previews: string[] = [];
					for (const { target, updated, ranges } of prepared) {
						if (epoch === startedEpoch) await format(target, signal);
						previews.push(preview(target, ranges, budget, startedEpoch, signal, updated));
					}
					return result(["Edit succeeded.", ...previews].join("\n"));
				} finally { for (const fd of handles) closeSync(fd); }
			};
			return locked(0);
		},
	});
}
