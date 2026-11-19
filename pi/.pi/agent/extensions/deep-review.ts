import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { Agent, type AgentTool, type ThinkingLevel } from "@earendil-works/pi-agent-core";
import { isRetryableAssistantError, retryDelayMs, StringEnum, type AssistantMessage } from "@earendil-works/pi-ai";
import { isContextOverflow } from "@earendil-works/pi-ai/compat";
import { Type } from "typebox";
import {
	convertToLlm, createReadOnlyTools, getAgentDir,
	type ExtensionAPI, type ExtensionContext, type SessionManager,
} from "@earendil-works/pi-coding-agent";
import { codexServiceTier, reviewSpeedMode } from "./lib/codex-speed";

const REVIEW_TYPE = "rig-deep-review";
export const REVIEW_EFFORTS = ["low", "medium", "hard"] as const;
type ReviewEffort = typeof REVIEW_EFFORTS[number];
type Reviewer = { provider: string; id: string; thinkingLevel: ThinkingLevel };

export function getReviewers(pi: ExtensionAPI, effort: ReviewEffort, { includeAdditional = false } = {}): Reviewer[] {
const settings = pi.getSettings() as {
rigReview?: Partial<Record<ReviewEffort, unknown>>;
rigReviewAdditional?: Partial<Record<ReviewEffort, unknown>>;
};
const pair = settings.rigReview?.[effort];
const settingsPath = join(getAgentDir(), "settings.json");
const pairSetting = `rigReview.${effort}`;
const additionalSetting = `rigReviewAdditional.${effort}`;
if (!Array.isArray(pair) || pair.length !== 2) {
throw new Error(`Set ${pairSetting} in ${settingsPath} to exactly two provider/id/thinkingLevel entries. See pi/personal-settings.example.json.`);
}
const levels: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
const configured = (value: unknown): value is string => typeof value === "string" && !!value.trim() && !/[<>]/.test(value);
const parse = (value: unknown, setting: string): Reviewer => {
const reviewer = value as Partial<Reviewer> | null | undefined;
if (!reviewer || !configured(reviewer.provider) || !configured(reviewer.id) || !reviewer.thinkingLevel || !levels.includes(reviewer.thinkingLevel)) {
throw new Error(`Set ${setting} in ${settingsPath} using valid provider/id/thinkingLevel entries. See pi/personal-settings.example.json.`);
}
return { provider: reviewer.provider.trim(), id: reviewer.id.trim(), thinkingLevel: reviewer.thinkingLevel };
};
const reviewers = pair.map((reviewer) => parse(reviewer, pairSetting));
const additional = includeAdditional ? settings.rigReviewAdditional?.[effort] : undefined;
if (additional != null) reviewers.push(parse(additional, additionalSetting));
return reviewers;
}

function gitTool(pi: ExtensionAPI, cwd: string) {
	const parameters = Type.Object({
		operation: StringEnum(["status", "diff", "log", "show"] as const),
		staged: Type.Optional(Type.Boolean()),
		revision: Type.Optional(Type.String({ description: "Commit hex ID or HEAD with optional ~N/^N suffixes; default HEAD for show/log." })),
		target: Type.Optional(Type.String({ description: "Second commit for diff." })),
		path: Type.Optional(Type.String({ description: "Literal repository path; narrow large output with this." })),
		offset: Type.Optional(Type.Integer({ minimum: 1 })),
		limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })),
	}, { additionalProperties: false });
	return {
		name: "git_inspect", label: "Git inspection",
		description: "Read-only Git status (including untracked), staged/unstaged or commit-to-commit diff, recent log (100 commits), or show commit patch. No shell/options accepted. Output paged at 1000 lines/40KB; use offset and path to examine full diffs. Read untracked files with read.",
		parameters,
		async execute(_id, params, signal) {
			const revision = (value: string) => {
				if (!/^(?:HEAD|[0-9a-fA-F]{4,64})(?:[~^][0-9]*)*$/.test(value)) throw new Error("Use a commit hex ID or HEAD with ~N/^N suffixes.");
				return value;
			};
			if (params.target && (!params.revision || params.operation !== "diff")) throw new Error("target requires diff and revision.");
			if (params.staged && (params.operation !== "diff" || params.revision)) throw new Error("staged is only for index-versus-HEAD diff.");
			const args = ["--no-pager", "--no-optional-locks", "--literal-pathspecs", "-c", "core.fsmonitor=false", "-c", "color.ui=false"];
			switch (params.operation) {
				case "status": args.push("status", "--short", "--untracked-files=all"); break;
				case "diff":
					args.push("diff", "--no-ext-diff", "--no-textconv");
					if (params.staged) args.push("--cached");
					if (params.revision) args.push(revision(params.revision));
					if (params.target) args.push(revision(params.target));
					break;
				case "log": args.push("log", "--no-ext-diff", "--no-textconv", "--format=fuller", "-100", revision(params.revision ?? "HEAD")); break;
				case "show": args.push("show", "--no-ext-diff", "--no-textconv", "--format=fuller", revision(params.revision ?? "HEAD")); break;
			}
			args.push("--");
			if (params.path) args.push(params.path);
			const result = await pi.exec("git", args, { cwd, signal, timeout: 30_000, maxBuffer: 16 * 1024 * 1024 });
			if (result.code !== 0 || result.killed || result.truncated) throw new Error(`Git inspection failed; narrow by path if output is too large: ${result.stderr || `exit ${result.code}`}`);
			const lines = result.stdout.split("\n");
			const start = (params.offset ?? 1) - 1;
			const selected: string[] = [];
			let bytes = 0;
			for (const line of lines.slice(start, start + (params.limit ?? 1000))) {
				if (bytes + Buffer.byteLength(line) + 1 > 40_000) break;
				selected.push(line);
				bytes += Buffer.byteLength(line) + 1;
			}
			return { content: [{ type: "text", text: `${selected.join("\n")}\n[Lines ${start + 1}-${start + selected.length} of ${lines.length}; next offset ${start + selected.length + 1}. Narrow by path if a single line exceeds 40KB.]` }], details: {} };
		},
	} satisfies AgentTool<typeof parameters>;
}

export async function review(
pi: ExtensionAPI, ctx: ExtensionContext, cwd: string, reviewer: Reviewer,
systemPrompt: string, prompt: string,
signal: AbortSignal, recordUsage: (message: AssistantMessage) => void,
): Promise<string> {
	const model = ctx.modelRegistry.find(reviewer.provider, reviewer.id);
	if (!model || !ctx.modelRegistry.hasConfiguredAuth(model)) throw new Error(`Model ${reviewer.provider}/${reviewer.id} is unavailable or unauthenticated.`);
	const serviceTier = codexServiceTier(model, await reviewSpeedMode(cwd));
	const retry = pi.getSettings().retry;
	const maxRetries = retry?.enabled === false ? 0 : retry?.maxRetries ?? 6;
	const backoff = { baseDelayMs: retry?.baseDelayMs ?? 2000, maxAgentDelayMs: retry?.maxAgentDelayMs };
	const agent = new Agent({
		initialState: {
systemPrompt, model, thinkingLevel: reviewer.thinkingLevel,
			tools: [...createReadOnlyTools(cwd).filter((tool) => ["read", "grep", "find", "ls"].includes(tool.name)), gitTool(pi, cwd)],
		},
		convertToLlm,
		streamFn: (requestedModel, context, options) => ctx.modelRegistry.streamSimple(requestedModel, context, {
			...options,
			...(serviceTier && {
				onPayload: async (payload, payloadModel) => {
					const current = await options?.onPayload?.(payload, payloadModel) ?? payload;
					if (current && typeof current === "object" && !Array.isArray(current)) {
						return { ...current, service_tier: serviceTier };
					}
					return current;
				},
			}),
		}),
	});
	const unsubscribe = agent.subscribe((event) => {
		if (event.type === "message_end" && event.message.role === "assistant") recordUsage(event.message);
	});
	const abort = () => agent.abort();
	signal.addEventListener("abort", abort, { once: true });
	try {
		signal.throwIfAborted();
		await agent.prompt(prompt);
		let last = agent.state.messages.at(-1);
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			signal.throwIfAborted();
			if (last?.role !== "assistant" || !isRetryableAssistantError(last) || isContextOverflow(last, model.contextWindow)) break;
			await sleep(retryDelayMs(backoff, attempt), undefined, { signal });
			signal.throwIfAborted();
			// Remove only the failed response so continuation can reuse earlier tool results.
			agent.state.messages = agent.state.messages.slice(0, -1);
			await agent.continue();
			last = agent.state.messages.at(-1);
		}
		signal.throwIfAborted();
		if (!last || last.role !== "assistant" || last.stopReason !== "stop") throw new Error(last?.role === "assistant" ? last.errorMessage || `Review ended with ${last.stopReason}.` : "Review returned no result.");
		const text = last.content.filter((block) => block.type === "text").map((block) => block.text).join("");
		if (!text.trim()) throw new Error("Review returned no final text.");
		return text;
	} finally {
		unsubscribe();
		signal.removeEventListener("abort", abort);
		agent.abort();
	}
}

export default function (pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT_CHILD === "1") return;
	let active: AbortController | undefined;
	let epoch = 0;
	const reset = (_event: unknown, ctx: ExtensionContext) => {
		epoch++;
		active?.abort();
		active = undefined;
		ctx.ui.setStatus(REVIEW_TYPE, undefined);
pi.events.emit("rig-deep-review:status", { sessionId: ctx.sessionManager.getSessionId(), active: false });
	};
	pi.on("session_start", reset);
	pi.on("session_shutdown", reset);
	pi.on("session_tree", reset);
	pi.on("session_before_tree", reset);
	pi.on("session_before_switch", reset);
	pi.on("session_before_fork", reset);
	pi.on("session_before_compact", (event, ctx) => {
		if (event.reason === "manual") reset(event, ctx);
	});

	pi.registerCommand("review", {
description: "Review with low|medium|hard effort and an optional message; /review stop cancels",
getArgumentCompletions: (prefix) => {
const items = [...REVIEW_EFFORTS, "stop"].filter((value) => value.startsWith(prefix));
return items.length ? items.map((value) => ({ value, label: value })) : null;
},
handler: async (args, ctx) => {
const input = args.trim();
if (input === "stop") {
if (!active) { ctx.ui.notify("No review is running.", "info"); return; }
reset(undefined, ctx);
ctx.ui.notify("Deep review stopped.", "info");
return;
}
const match = /^(low|medium|hard)(?:\s+([\s\S]*))?$/.exec(input);
if (!match) { ctx.ui.notify("Usage: /review <low|medium|hard> [message], or /review stop", "error"); return; }
if (active) { ctx.ui.notify("A review is already running. Use /review stop first.", "error"); return; }
const effort = match[1] as ReviewEffort;
let reviewers: Reviewer[];
try { reviewers = getReviewers(pi, effort, { includeAdditional: true }); }
catch (error) { ctx.ui.notify(String(error), "error"); return; }
const message = match[2] ?? "";
const controller = new AbortController();
active = controller;
const generation = epoch;
const cwd = ctx.cwd;
			const runId = randomUUID();
			const startedAt = new Date().toISOString();
			const sessionId = ctx.sessionManager.getSessionId();
			const entryId = ctx.sessionManager.getLeafId();
			const sessionFile = ctx.sessionManager.getSessionFile();
			const usageSession = ctx.sessionManager as typeof ctx.sessionManager & Pick<SessionManager, "appendUsage">;
			const agentDir = getAgentDir();
			const logDir = join(agentDir, "logs");
			let logFailed = false;
			const current = () => generation === epoch && active === controller && !controller.signal.aborted;
			const log = (data: Record<string, unknown>) => {
				try {
					mkdirSync(logDir, { recursive: true, mode: 0o700 });
appendFileSync(join(logDir, "deep-review.jsonl"), `${JSON.stringify({ timestamp: new Date().toISOString(), runId, sessionId, entryId, cwd, effort, reviewers, ...data })}\n`, { mode: 0o600 });
				} catch (error) {
					if (!logFailed && current()) ctx.ui.notify(`Deep review log unavailable: ${String(error)}`, "error");
					logFailed = true;
				}
			};
ctx.ui.setStatus(REVIEW_TYPE, `Reviewing in background (${effort})`);
pi.events.emit("rig-deep-review:status", { sessionId, active: true });
			// Detached deliberately: command handlers must not hold the UI open.
			void (async () => {
				try {
					if (typeof usageSession.appendUsage !== "function") throw new Error("This Pi version cannot record reviewer usage.");
					if (!sessionFile || !entryId) throw new Error("Review requires a persistent session transcript and captured leaf entry ID.");
					const guidance = await readFile(join(agentDir, "DEEP_REVIEW.md"), "utf8");
					controller.signal.throwIfAborted();
const prompt = `Worktree: ${cwd}\nSession transcript: ${sessionFile}\nCaptured entry ID: ${entryId}\nCaptured at: ${startedAt}\nReview effort: ${effort}${message ? `\n\nAdditional instructions from the user:\n${message}` : ""}`;
const results = await Promise.all(reviewers.map(async (reviewer) => {
						const model = `${reviewer.provider}/${reviewer.id}`;
						const start = Date.now();
						let finished = false;
						const finish = (data: Record<string, unknown>) => {
							if (finished) return;
							finished = true;
log({ model, thinkingLevel: reviewer.thinkingLevel, durationMs: Date.now() - start, ...data });
						};
						const cancel = () => finish({ event: "review_cancelled" });
						controller.signal.addEventListener("abort", cancel, { once: true });
log({ event: "review_started", model, thinkingLevel: reviewer.thinkingLevel });
						try {
const result = await review(pi, ctx, cwd, reviewer, guidance, prompt, controller.signal, (message) => {
								if (usageSession.getSessionId() !== sessionId) { log({ event: "review_usage_unattributed", model, usage: message.usage }); return; }
								usageSession.appendUsage(REVIEW_TYPE, message.provider, message.model, message.usage, `Review ${runId}`);
								log({ event: "review_usage", model: `${message.provider}/${message.model}`, usage: message.usage });
							});
							finish({ event: "review_finished", message: result });
return result;
						} catch (error) {
							finish({ event: controller.signal.aborted ? "review_cancelled" : "review_failed", error: String(error) });
return `Review failed: ${String(error)}`;
						} finally {
							controller.signal.removeEventListener("abort", cancel);
						}
					}));
if (!current()) return;
const content = results.map((result, index) => `## Reviewer ${index + 1}\n\n${result}`).join("\n\n");
pi.sendMessage({ customType: REVIEW_TYPE, display: true, content, details: { models: reviewers.map((reviewer) => `${reviewer.provider}/${reviewer.id}`), effort, reviewers, runId, entryId, startedAt } }, { deliverAs: "steer", triggerTurn: true });
log({ event: "findings_queued", models: reviewers.map((reviewer) => `${reviewer.provider}/${reviewer.id}`) });
				} catch (error) {
					log({ event: controller.signal.aborted ? "review_cancelled" : "review_failed", error: String(error) });
					if (current()) ctx.ui.notify(`Deep review failed: ${String(error)}`, "error");
				} finally {
if (active === controller) {
active = undefined;
ctx.ui.setStatus(REVIEW_TYPE, undefined);
pi.events.emit("rig-deep-review:status", { sessionId, active: false });
}
				}
			})();
		},
	});

	pi.on("context_with_system", (event) => {
		if (!event.messages.some((message) => message.role === "custom" && message.customType === REVIEW_TYPE)) return;
		return { messages: event.messages.map((message) => message.role === "custom" && message.customType === REVIEW_TYPE
			? { role: "system" as const, content: typeof message.content === "string" ? message.content : "", timestamp: message.timestamp }
			: message) };
	});
}
