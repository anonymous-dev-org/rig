import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Shorter descriptions for tools this repo does not own (pi built-ins and npm
// package tools). read/edit/write/council are compressed at their sources.
// The rewrite is deterministic: the same input payload always maps to the same
// bytes, so provider prompt caches stay valid. Unknown shapes are left alone.
// subagent is rewritten only while it uses the script-form essentials text, so
// a future pi-subagents config change takes precedence over this patch.
// Parameter patches apply only when the current text equals the exact original.

const SUBAGENT_SCRIPT_PREFIX = "One child: {agent,task}. Independent parallel children:";

const PATCHES: Record<string, string> = {
	bash: [
		"Run bash in current dir; returns stdout, stderr.",
		"Output truncated to last 2000 lines or 50KB; full output then saved to temp file. Optional timeout, seconds.",
		"",
		"Codemode: tools.bash(args) returns { output, truncated, full_output_path?, exit_code, wall_time_seconds }.",
	].join("\n"),
	codemode: [
		"Raw JavaScript (no JSON, no code fence). Async function body in QuickJS sandbox; top-level await and return work. No Node, file system, network, timers.",
		"- await tools.<name>({...args}): resolves to string or object per tool declaration; rejects on failure. Object result: check its fields even on success. Calls still running at script end are cancelled.",
		"- Optional first line: // @options: {\"max_output_tokens\": 10000, \"timeout_ms\": 60000}",
		"",
		"Globals: text(value), image(dataUrlOrImageBlock), console.log(...), top-level return add output; exit() ends script. Several text items get \"==> text N/M <==\" headers; console output follows in one <console_output> block. image() also saves temp file; result names path.",
		"- store(key, value) and load(key) keep JSON values across calls.",
		"- ALL_TOOLS, searchTools(query, {limit?, namespace?}), describeTool(name), describeNamespace(name): find unlisted tools, e.g. MCP.",
		"- models: classifiers, image generation. Read docs/codemode.md first.",
	].join("\n"),
	subagent: [
		"One child: {agent,task}. Parallel: {workflow:\"parallel\",args:{tasks:[{agent,task,cwd?,model?},...]}}. Multi-step dependent work: one ```js workflow block in this reply, then subagent({workflow:true}). Children launch only inside it.",
		"Management: {action,id?,options:{...}}. Fields not in schema go in options.",
		"Launch agents by name. Models as exact provider/id. Unknown agent or model returns valid choices.",
		"Guides: workflows/recommended-orchestration-pattern (async, review, recovery), workflows/scripted-workflows, tool-reference/retained-children, tool-reference/external-cli-agent-profiles.",
		"",
		"SAFETY-CRITICAL SUBAGENT GUIDANCE:",
		"- Delegate only when the operator asked, directly or through applicable user/project instructions; size, complexity or risk alone is not authorization.",
		"- Native async completion wakes this session: return control; do not sleep, poll or call bg_wait for it.",
		"- One writer per cwd/worktree; isolate concurrent writers.",
		"- After a launch or runtime failure, stop and report it; never silently switch to interactive_shell, pi -ne or another CLI.",
	].join("\n"),
	bg_wait: [
		"Wait for background work, then return. Async subagents wake session natively; use only for provider, detached, or other background work without native notification, needing same-turn result.",
		"{}: first active run or provider item to finish or need attention.",
		"{all:true}: all work active at call time.",
		"{id}: one run; finished async run returns its result references.",
		"{id,nonBlocking:true}: subscribe to run's wake, return now.",
		"Timeout or user message ends wait, no error; work keeps running.",
		"",
		"Codemode: tools.bg_wait(args) returns string.",
	].join("\n"),
	contact_supervisor: "Contact parent/supervisor: blocking decision, structured interview, or progress update.",
	subagent_supervisor: "pi-subagents supervisor: reply/pending/status answer child requests without overriding pi-intercom.",
	web_enable: [
		"Enable configured pi-web-access tools for web research and retrieval. Does not search or fetch; tools appear on next model request.",
		"",
		"Codemode: tools.web_enable(args) returns string.",
	].join("\n"),
};

// [original, replacement] per top-level parameter, applied only on an exact match.
const PARAM_PATCHES: Record<string, Record<string, [string, string]>> = {
	subagent: {
		agent: ["One-child agent or management target.", "Agent name or management target."],
		task: ["One-child task; requires agent.", "Child task. Requires agent."],
		workflow: [
			"true: run the one ```js workflow block written in this same reply (false invalid). String with '/': script file read from request cwd. Other string: named workflow resource. Raw scripts (true or path) have no runs.host.",
			"true: run ```js workflow block in this reply (false invalid). String with '/': script file from request cwd. Other string: named workflow. Raw scripts (true or path): no runs.host.",
		],
		args: [
			"Plain-JSON args for workflow; 16 fields/object, 64 items/array, depth 8, 16 KiB total; raw-script args are exposed deeply frozen and persisted, so do not include secrets.",
			"Plain-JSON workflow args: 16 fields/object, 64 items/array, depth 8, 16 KiB total. Raw-script args frozen and persisted: never secrets.",
		],
		async: [
			"Background; default asyncByDefault. false only to block parent.",
			"Background run (default asyncByDefault). false blocks parent.",
		],
		model: [
			"Child model provider/id; bare id only if unique. Suffix :off/minimal/low/medium/high/xhigh/max overrides agent thinking default.",
			"Child provider/id; bare id only if unique. Suffix :off/minimal/low/medium/high/xhigh/max overrides thinking.",
		],
		cwd: ["Execution/project-pane directory.", "Execution directory."],
		worktree: [
			"Isolate each workflow child in a managed git worktree; child worktree:false overrides default.",
			"Isolate each workflow child in a managed git worktree; child worktree:false overrides.",
		],
		output: [
			"Child output path or false; relative workflow paths use managed artifact routing. Bind durable output here, not task prose; return outputReference/outputPathMapping/artifactPaths.",
			"Child output path or false. Relative paths: managed artifact routing. Bind durable output here, not in task prose; return outputReference/outputPathMapping/artifactPaths.",
		],
		action: [
			"Management/control only; omit for execution. validate accepts workflow: true or a script path. Discover actions with {action:\"guide\",options:{topic:\"tool-reference\"}}.",
			"Management only; omit to execute. validate accepts workflow:true or script path. Discover: {action:\"guide\",options:{topic:\"tool-reference\"}}.",
		],
		options: [
			"Every field not listed here, such as acceptance, timeoutMs, context, view and index; guide tool-reference/parameter-reference.",
			"Any other field (e.g. acceptance, timeoutMs, context, view, index). See guide tool-reference/parameter-reference.",
		],
	},
	bg_wait: {
		all: ["Wait for all work active at call time.", "All work active now."],
		nonBlocking: [
			"Subscribe to id's wake and return immediately; requires id, not with all.",
			"Subscribe to id's wake, return now. Requires id; not with all.",
		],
		stopOnAttention: [
			"false: keep waiting through all attention except supervisor requests.",
			"false: keep waiting through attention, except supervisor requests.",
		],
	},
};

type ToolEntry = { name?: string; description?: string; function?: ToolEntry; parameters?: unknown };

export default function toolDescriptions(pi: ExtensionAPI) {
	pi.on("before_provider_request", (event) => {
		rewriteTools(event.payload);
	});
}

// Tools sit at different places per provider (payload.tools, or inside a
// Codex-style payload.input item). Find every array stored under a "tools" key
// and patch matching entries; everything else is left alone.
function rewriteTools(value: unknown, depth = 0): void {
	if (depth > 8 || value === null || typeof value !== "object") return;
	if (Array.isArray(value)) {
		for (const item of value) rewriteTools(item, depth + 1);
		return;
	}
	const record = value as Record<string, unknown>;
	const tools = record.tools;
	if (Array.isArray(tools)) {
		for (const entry of tools) {
			if (entry === null || typeof entry !== "object") continue;
			const tool = entry as ToolEntry;
			const target = tool.function ?? tool;
			const name = target.name ?? "";
			const patch = PATCHES[name];
			if (patch !== undefined && !(name === "subagent" && !(target.description ?? "").startsWith(SUBAGENT_SCRIPT_PREFIX))) {
				target.description = patch;
			}
			patchParameters(name, target.parameters);
		}
	}
	for (const nested of Object.values(record)) rewriteTools(nested, depth + 1);
}

function patchParameters(toolName: string, parameters: unknown): void {
	const patches = PARAM_PATCHES[toolName];
	const properties = (parameters as { properties?: Record<string, { description?: string }> } | undefined)?.properties;
	if (patches === undefined || properties === undefined) return;
	for (const [param, [from, to]] of Object.entries(patches)) {
		const schema = properties[param];
		if (schema?.description === from) schema.description = to;
	}
}
