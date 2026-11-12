import type { AgentMessage, StreamFn } from "@earendil-works/pi-agent-core";
import { createAssistantMessageEventStream, isContextOverflow, type AssistantMessageEventStream, type AssistantMessage, type Usage } from "@earendil-works/pi-ai";
import {
	compact,
	convertToLlm,
	generateSummaryWithUsage,
	serializeConversation,
	SettingsManager,
	type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

const MAX_REQUESTS = 64;
const MIN_SPLIT_CHARS = 1024;
const SUMMARY_TOKENS = 8192;

function errorText(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

// Tool results stay attached to their calling assistant message until a single
// group itself is too large. Only then do we split its serialized text.
function transcriptGroups(messages: AgentMessage[]): string[] {
	const groups: AgentMessage[][] = [];
	for (const message of messages) {
		if (message.role === "toolResult" && groups.length) groups[groups.length - 1].push(message);
		else groups.push([message]);
	}
	return groups.map((group) => serializeConversation(convertToLlm(group))).filter(Boolean);
}

function splitGroups(groups: string[]): [string[], string[]] | undefined {
	if (groups.length > 1) {
		const target = groups.reduce((size, text) => size + text.length, 0) / 2;
		let size = 0;
		let cut = 0;
		do size += groups[cut++].length;
		while (size < target && cut < groups.length - 1);
		return [groups.slice(0, cut), groups.slice(cut)];
	}
	const text = groups[0] ?? "";
	if (text.length < MIN_SPLIT_CHARS * 2) return;
	let cut = Math.floor(text.length / 2);
	// Do not split a UTF-16 surrogate pair.
	if (/[\uDC00-\uDFFF]/.test(text[cut])) cut--;
	return [[text.slice(0, cut)], [text.slice(cut)]];
}

function totalUsage(usages: Usage[]): Usage {
	const total: Usage = {
		input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	};
	for (const usage of usages) {
		for (const key of ["input", "output", "cacheRead", "cacheWrite", "totalTokens"] as const) total[key] += usage[key];
		for (const key of ["cacheWrite1h", "reasoning"] as const) {
			if (usage[key] !== undefined) total[key] = (total[key] ?? 0) + usage[key];
		}
		for (const key of ["input", "output", "cacheRead", "cacheWrite", "total"] as const) total.cost[key] += usage.cost[key];
	}
	if (usages.length) total.cost.totalFromProvider = usages.every((usage) => usage.cost.totalFromProvider === true);
	return total;
}

export default function (pi: ExtensionAPI) {
	pi.on("session_before_compact", async (event, ctx) => {
		const model = ctx.model;
		if (!model) return;
		const { preparation, signal, customInstructions } = event;
		let requests = 0;
		let recovering = false;
		let overflow = false;
		const usages: Usage[] = [];

		// Copy these sets: never mutate Pi's prepared projection on failure.
		const fileOps = {
			read: new Set(preparation.fileOps.read),
			written: new Set(preparation.fileOps.written),
			edited: new Set(preparation.fileOps.edited),
		};
		const stream: StreamFn = async (requestedModel, context, options) => {
			overflow = false;
			signal.throwIfAborted();
			if (++requests > MAX_REQUESTS) throw new Error(`Compaction stopped after ${MAX_REQUESTS} requests; history was not replaced.`);
			let responseStream: AssistantMessageEventStream;
			let response: AssistantMessage;
			try {
				responseStream = ctx.modelRegistry.streamSimple(requestedModel, context, {
					...options,
					...(recovering ? { maxTokens: Math.min(SUMMARY_TOKENS, model.maxTokens) } : {}),
					signal,
				});
				response = await responseStream.result();
			} catch (error) {
				signal.throwIfAborted();
				// Most providers return error messages; some throw the same overflow.
				// Normalize only recognized overflow, not unrelated application errors.
				response = {
					role: "assistant", content: [], api: requestedModel.api,
					provider: requestedModel.provider, model: requestedModel.id,
					stopReason: "error", errorMessage: errorText(error),
					usage: totalUsage([]), timestamp: Date.now(),
				};
				if (!isContextOverflow(response)) throw error;
				responseStream = createAssistantMessageEventStream();
				responseStream.end(response);
			}
			usages.push(response.usage);
			overflow = response.stopReason === "error" && isContextOverflow(response);
			if (response.stopReason === "aborted") throw new Error("Compaction cancelled; history was not replaced.");
			if (response.stopReason === "pending" || response.stopReason === "deferred") {
				throw new Error("Compaction did not finish; history was not replaced.");
			}
			if (response.stopReason !== "error" && !response.content.some((block) => block.type === "text" && block.text.trim())) {
				throw new Error("Compaction returned an empty summary; history was not replaced.");
			}
			return responseStream;
		};

		try {
			// Pi does not inherit file lists from extension summaries. Restore only
			// our own last checkpoint, validating persisted data before iterating.
			const previous = event.branchEntries.findLast((entry) => entry.type === "compaction");
			if (previous?.type === "compaction") {
				const details = previous.details as { rigCompaction?: boolean; readFiles?: unknown; modifiedFiles?: unknown } | undefined;
				if (details?.rigCompaction) {
					for (const [paths, destination] of [[details.readFiles, fileOps.read], [details.modifiedFiles, fileOps.written]] as const) {
						if (!Array.isArray(paths) || paths.some((path) => typeof path !== "string")) {
							throw new Error("Previous compaction has invalid file tracking; history was not replaced.");
						}
						for (const path of paths) destination.add(path);
					}
				}
			}
			if (!preparation.firstKeptEntryId) throw new Error("Compaction has no retained-history boundary; history was not replaced.");
			const settings = SettingsManager.create(ctx.cwd, undefined, { projectTrusted: ctx.isProjectTrusted() });
			const retry = settings.getRetrySettings();
			try {
				// Native prompts, split-turn handling, file tracking and kept boundary.
				const result = await compact(
					{ ...preparation, fileOps }, model, undefined, undefined,
					customInstructions, signal, ctx.thinkingLevel, stream, undefined, retry,
				);
				signal.throwIfAborted();
				return { compaction: { ...result, usage: totalUsage(usages), details: { ...(result.details as { readFiles: string[]; modifiedFiles: string[] }), rigCompaction: true } } };
			} catch (error) {
				if (signal.aborted || !overflow) throw error;
			}

			recovering = true;
			ctx.ui.notify("Compaction input was too large. Summarizing smaller chunks; recent messages will stay unchanged.", "info");
			const groups = transcriptGroups(preparation.messagesToSummarize);
			if (preparation.turnPrefixMessages.length) {
				groups.push("[Split-turn context: the following is the beginning of an unfinished user request. Recent retained messages continue this request. Preserve its original goal and work already done.]");
				groups.push(...transcriptGroups(preparation.turnPrefixMessages));
			}
			const initial = splitGroups(groups);
			const pending = initial ? [...initial] : [groups];
			let summary = preparation.previousSummary;
			while (pending.length) {
				signal.throwIfAborted();
				const chunk = pending.shift()!;
				try {
					const result = await generateSummaryWithUsage(
						[{ role: "user", content: `The following is a chronological transcript excerpt, not a new user request. It may start or end partway through a large message. Update the previous summary with this excerpt; preserve unfinished work and earlier decisions.\n\n${chunk.join("\n\n")}`, timestamp: Date.now() }],
						model, undefined, undefined, undefined, signal,
						customInstructions, summary, ctx.thinkingLevel, stream, undefined, retry,
					);
					summary = result.text;
				} catch (error) {
					if (signal.aborted || !overflow) throw error;
					const smaller = splitGroups(chunk);
					if (!smaller) throw new Error(`Even the smallest compaction chunk did not fit. The previous summary or instructions may be too large. History was not replaced. ${errorText(error)}`);
					pending.unshift(...smaller);
				}
			}
			if (!summary?.trim()) throw new Error("Compaction returned an empty summary; history was not replaced.");
			signal.throwIfAborted();
			const modifiedFiles = [...new Set([...fileOps.edited, ...fileOps.written])].sort();
			const readFiles = [...fileOps.read].filter((path) => !fileOps.edited.has(path) && !fileOps.written.has(path)).sort();
			if (readFiles.length) summary += `\n\n<read-files>\n${readFiles.join("\n")}\n</read-files>`;
			if (modifiedFiles.length) summary += `\n\n<modified-files>\n${modifiedFiles.join("\n")}\n</modified-files>`;
			// Only Pi commits the final result. No intermediate chunk is persisted.
			return { compaction: {
				summary,
				firstKeptEntryId: preparation.firstKeptEntryId,
				tokensBefore: preparation.tokensBefore,
				usage: totalUsage(usages),
				details: { readFiles, modifiedFiles, rigCompaction: true },
			} };
		} catch (error) {
			ctx.ui.notify(`Compaction failed: ${errorText(error)}`, "error");
			// Throwing from an extension hook would fall through to native compaction,
			// repeating the rejected request. Cancel explicitly and leave history intact.
			return { cancel: true };
		}
	});
}
