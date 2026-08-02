import { StringEnum } from "@earendil-works/pi-ai";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Key, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

const STATE_ENTRY = "rig-plan-state";
const CREATE_TOOL = "plan_create";
const REVISE_TOOL = "plan_revise";
const UPDATE_TOOL = "plan_update";
const MANAGED_TOOLS = new Set([REVISE_TOOL, UPDATE_TOOL]);
const PLANNING_TOOLS = new Set([
	"read",
	"grep",
	"find",
	"ls",
	"subagent",
	CREATE_TOOL,
]);
const PLANNING_SUBAGENTS = new Set(["planner", "scout"]);
const REVISED_STATUSES: ["pending", "in_progress"] = [
	"pending",
	"in_progress",
];
const UPDATE_STATUSES: ["in_progress", "done", "blocked"] = [
	"in_progress",
	"done",
	"blocked",
];

type PlanMode = "normal" | "planning" | "executing";
type TaskStatus = "pending" | "in_progress" | "done" | "blocked";

interface PlanTask {
	step: number;
	title: string;
	outcome: string;
	todos: string[];
	status: TaskStatus;
	note?: string;
}

interface NormalPlanState {
	mode: "normal";
	tasks: PlanTask[];
}

interface ActivePlanState {
	mode: "planning" | "executing";
	tasks: PlanTask[];
	toolsBeforePlanning: string[];
}

type PlanState = NormalPlanState | ActivePlanState;

const CreatePlanParams = Type.Object({
	tasks: Type.Array(
		Type.Object({
			title: Type.String({ description: "Short task name" }),
			outcome: Type.String({
				description: "Complete intended outcome for this task",
			}),
			todos: Type.Array(
				Type.String({ description: "Concrete work or validation item" }),
				{ minItems: 1 },
			),
		}),
		{ minItems: 1 },
	),
});

const RevisePlanParams = Type.Object({
	reason: Type.String({
		description: "Concise reason new findings require plan changes",
	}),
	tasks: Type.Array(
		Type.Object({
			title: Type.String({ description: "Short task name" }),
			outcome: Type.String({
				description: "Complete intended outcome for this task",
			}),
			todos: Type.Array(
				Type.String({ description: "Concrete work or validation item" }),
				{ minItems: 1 },
			),
			status: StringEnum(REVISED_STATUSES),
		}),
		{ minItems: 1 },
	),
});

const UpdatePlanParams = Type.Object({
	step: Type.Integer({ minimum: 1, description: "Task number to update" }),
	status: StringEnum(UPDATE_STATUSES),
	note: Type.Optional(
		Type.String({
			description: "Current blocker or concise evidence supporting completion",
		}),
	),
});

function unique(names: string[]): string[] {
	return [...new Set(names)];
}

function parseMode(input: unknown): PlanMode | undefined {
	if (input === "normal" || input === "planning" || input === "executing")
		return input;
	return undefined;
}

function parseStatus(input: unknown): TaskStatus | undefined {
	if (
		input === "pending" ||
		input === "in_progress" ||
		input === "done" ||
		input === "blocked"
	)
		return input;
	return undefined;
}

function parseTask(input: unknown): PlanTask | undefined {
	if (typeof input !== "object" || input === null) return undefined;

	const step = Reflect.get(input, "step");
	const title = Reflect.get(input, "title");
	const outcome = Reflect.get(input, "outcome");
	const rawTodos = Reflect.get(input, "todos");
	const status = parseStatus(Reflect.get(input, "status"));
	const rawNote = Reflect.get(input, "note");

	if (typeof step !== "number" || !Number.isInteger(step) || step < 1)
		return undefined;
	if (
		typeof title !== "string" ||
		typeof outcome !== "string" ||
		!Array.isArray(rawTodos) ||
		!status
	) {
		return undefined;
	}

	const todos = rawTodos.filter(
		(todo): todo is string => typeof todo === "string",
	);
	if (
		!title.trim() ||
		!outcome.trim() ||
		todos.length !== rawTodos.length ||
		todos.length === 0 ||
		todos.some((todo) => !todo.trim())
	) {
		return undefined;
	}
	if (rawNote !== undefined && typeof rawNote !== "string") return undefined;

	return rawNote === undefined
		? { step, title, outcome, todos, status }
		: { step, title, outcome, todos, status, note: rawNote };
}

function parseState(input: unknown): PlanState | undefined {
	if (typeof input !== "object" || input === null) return undefined;

	const mode = parseMode(Reflect.get(input, "mode"));
	const rawTasks = Reflect.get(input, "tasks");
	if (!mode || !Array.isArray(rawTasks)) return undefined;

	const tasks = rawTasks.map(parseTask);
	if (tasks.some((task) => task === undefined)) return undefined;

	const parsedTasks = tasks.filter(
		(task): task is PlanTask => task !== undefined,
	);
	if (
		parsedTasks.some(
			(task, index) =>
				index > 0 && task.step <= (parsedTasks[index - 1]?.step ?? 0),
		)
	) {
		return undefined;
	}
	if (mode === "normal") return { mode, tasks: parsedTasks };
	if (mode === "executing" && parsedTasks.length === 0) return undefined;

	const rawTools = Reflect.get(input, "toolsBeforePlanning");
	if (!Array.isArray(rawTools)) return undefined;
	const tools = rawTools.filter(
		(tool): tool is string => typeof tool === "string",
	);
	if (tools.length !== rawTools.length) return undefined;
	return { mode, tasks: parsedTasks, toolsBeforePlanning: unique(tools) };
}

function statusMark(status: TaskStatus): string {
	if (status === "done") return "✓";
	if (status === "in_progress") return "▶";
	if (status === "blocked") return "!";
	return "○";
}

function formatPlan(tasks: PlanTask[]): string {
	if (tasks.length === 0) return "No plan is active.";

	return [
		"Plan:",
		...tasks.flatMap((task) => [
			`${task.step}. [${statusMark(task.status)}] ${task.title}`,
			`   Outcome: ${task.outcome}`,
			...task.todos.map((todo) => `   - ${todo}`),
			...(task.note ? [`   Note: ${task.note}`] : []),
		]),
	].join("\n");
}

function requestAgents(requests: unknown): string[] | undefined {
	if (!Array.isArray(requests) || requests.length === 0) return undefined;

	const agents: string[] = [];
	for (const request of requests) {
		if (typeof request !== "object" || request === null) return undefined;
		const agent = Reflect.get(request, "agent");
		const task = Reflect.get(request, "task");
		if (typeof agent !== "string" || typeof task !== "string") return undefined;
		agents.push(agent);
	}
	return agents;
}

function isPlanningSubagentCall(input: unknown): boolean {
	if (typeof input !== "object" || input === null) return false;

	const agentScope = Reflect.get(input, "agentScope");
	const confirmProjectAgents = Reflect.get(input, "confirmProjectAgents");
	if (
		(agentScope !== undefined && agentScope !== "user") ||
		confirmProjectAgents !== undefined
	) {
		return false;
	}

	const directAgent = Reflect.get(input, "agent");
	const directTask = Reflect.get(input, "task");
	const parallel = Reflect.get(input, "tasks");
	const chain = Reflect.get(input, "chain");

	let agents: string[] | undefined;
	if (
		typeof directAgent === "string" &&
		typeof directTask === "string" &&
		parallel === undefined &&
		chain === undefined
	) {
		agents = [directAgent];
	} else if (
		directAgent === undefined &&
		directTask === undefined &&
		parallel !== undefined &&
		chain === undefined
	) {
		agents = requestAgents(parallel);
	} else if (
		directAgent === undefined &&
		directTask === undefined &&
		parallel === undefined &&
		chain !== undefined
	) {
		agents = requestAgents(chain);
	}

	return agents?.every((agent) => PLANNING_SUBAGENTS.has(agent)) ?? false;
}

export default function planModeExtension(pi: ExtensionAPI): void {
	let state: PlanState = { mode: "normal", tasks: [] };

	function persist(): void {
		pi.appendEntry<PlanState>(STATE_ENTRY, state);
	}

	function configuredPlanningTools(): string[] {
		const configured = new Set(pi.getAllTools().map((tool) => tool.name));
		return [...PLANNING_TOOLS].filter((name) => configured.has(name));
	}

	function normalTools(): string[] {
		return pi.getActiveTools().filter((name) => !MANAGED_TOOLS.has(name));
	}

	function enablePlanningTools(): void {
		pi.setActiveTools(configuredPlanningTools());
	}

	function enableExecutionTools(activeState: ActivePlanState): void {
		pi.setActiveTools(
			unique([
				...activeState.toolsBeforePlanning.filter(
					(name) => name !== CREATE_TOOL,
				),
				REVISE_TOOL,
				UPDATE_TOOL,
			]),
		);
	}

	function restoreTools(tools: string[]): void {
		pi.setActiveTools(tools);
	}

	function updateUI(ctx: ExtensionContext): void {
		if (state.mode === "planning") {
			ctx.ui.setStatus("plan-mode", ctx.ui.theme.fg("warning", "⏸ plan"));
		} else if (state.mode === "executing") {
			const completed = state.tasks.filter(
				(task) => task.status === "done",
			).length;
			ctx.ui.setStatus(
				"plan-mode",
				ctx.ui.theme.fg(
					"accent",
					`executing plan ${completed}/${state.tasks.length}`,
				),
			);
		} else {
			ctx.ui.setStatus("plan-mode", undefined);
		}

		if (state.mode === "normal" || state.tasks.length === 0) {
			ctx.ui.setWidget("plan-tasks", undefined);
			return;
		}

		const lines = state.tasks.map((task) => {
			const mark = statusMark(task.status);
			if (task.status === "done") {
				return ctx.ui.theme.fg(
					"success",
					`${mark} ${ctx.ui.theme.strikethrough(task.title)}`,
				);
			}
			if (task.status === "blocked")
				return ctx.ui.theme.fg("error", `${mark} ${task.title}`);
			if (task.status === "in_progress")
				return ctx.ui.theme.fg("accent", `${mark} ${task.title}`);
			return ctx.ui.theme.fg("muted", `${mark} ${task.title}`);
		});
		ctx.ui.setWidget("plan-tasks", lines);
	}

	function enterPlanning(ctx: ExtensionContext): void {
		const toolsBeforePlanning =
			state.mode === "normal" ? normalTools() : state.toolsBeforePlanning;
		state = { mode: "planning", tasks: [], toolsBeforePlanning };
		enablePlanningTools();
		persist();
		updateUI(ctx);
		ctx.ui.notify(
			"Plan mode enabled. Filesystem and shell mutation tools are unavailable.",
			"info",
		);
	}

	function leavePlanning(ctx: ExtensionContext): void {
		if (state.mode !== "planning") return;
		const tools = state.toolsBeforePlanning;
		state = { mode: "normal", tasks: state.tasks };
		restoreTools(tools);
		persist();
		updateUI(ctx);
		ctx.ui.notify("Plan mode disabled. Previous tools restored.", "info");
	}

	async function togglePlan(ctx: ExtensionContext): Promise<void> {
		if (state.mode === "planning") {
			leavePlanning(ctx);
			return;
		}

		if (state.mode === "executing") {
			const activeState = state;
			const shouldReplace = await ctx.ui.confirm(
				"Replace active plan?",
				"This abandons the current plan and starts a new read-only planning phase.",
			);
			if (!shouldReplace || state !== activeState) return;
		}

		enterPlanning(ctx);
	}

	function restore(ctx: ExtensionContext, applyPlanFlag: boolean): void {
		const fallbackTools =
			state.mode === "normal" ? normalTools() : state.toolsBeforePlanning;
		let restoredState: PlanState = { mode: "normal", tasks: [] };
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "custom" || entry.customType !== STATE_ENTRY) continue;
			const restored = parseState(entry.data);
			if (restored) restoredState = restored;
		}

		if (
			applyPlanFlag &&
			pi.getFlag("plan") === true &&
			restoredState.mode === "normal"
		) {
			restoredState = {
				mode: "planning",
				tasks: [],
				toolsBeforePlanning: fallbackTools,
			};
		}
		state = restoredState;

		if (state.mode === "planning") enablePlanningTools();
		else if (state.mode === "executing") enableExecutionTools(state);
		else restoreTools(fallbackTools);
		updateUI(ctx);
	}

	pi.registerFlag("plan", {
		description: "Start in strict read-only plan mode",
		type: "boolean",
		default: false,
	});

	pi.registerCommand("plan", {
		description: "Toggle strict read-only plan mode",
		handler: async (_args, ctx) => togglePlan(ctx),
	});

	pi.registerCommand("plan:status", {
		description: "Show the current or most recent plan with progress",
		handler: async (_args, ctx) => {
			ctx.ui.notify(
				`${state.mode.toUpperCase()}\n\n${formatPlan(state.tasks)}`,
				"info",
			);
		},
	});

	pi.registerShortcut(Key.ctrlAlt("p"), {
		description: "Toggle strict read-only plan mode",
		handler: togglePlan,
	});

	pi.registerTool({
		name: CREATE_TOOL,
		label: "Create Plan",
		description:
			"Create a structured implementation plan. In normal mode, creation starts execution immediately. In strict /plan mode, creation remains read-only until user approval. Every task requires a short title, complete intended outcome, and concrete todo list.",
		promptSnippet: "Create an adaptive structured task plan when warranted",
		promptGuidelines: [
			"Use plan_create when the user asks for a plan or work is complex, ambiguous, risky, or has multiple dependent steps; skip it for simple, obvious, bounded tasks.",
			"In strict /plan mode, call plan_create after read-only investigation is sufficient and every task has a complete outcome and todo list.",
		],
		parameters: CreatePlanParams,
		executionMode: "sequential",

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			if (state.mode === "executing") {
				throw new Error(
					"A plan is already executing. Use plan_revise to change unfinished work.",
				);
			}

			const tasks: PlanTask[] = params.tasks.map((task, index) => ({
				step: index + 1,
				title: task.title.trim(),
				outcome: task.outcome.trim(),
				todos: task.todos.map((todo) => todo.trim()),
				status: "pending",
			}));
			if (
				tasks.some(
					(task) =>
						!task.title || !task.outcome || task.todos.some((todo) => !todo),
				)
			) {
				throw new Error(
					"Plan titles, outcomes, and todo items cannot be empty",
				);
			}
			if (state.mode === "normal") {
				state = {
					mode: "executing",
					tasks,
					toolsBeforePlanning: normalTools(),
				};
				enableExecutionTools(state);
				persist();
				updateUI(ctx);
				return {
					content: [
						{
							type: "text",
							text: `${formatPlan(tasks)}\n\nAdaptive plan created. Start work, use plan_update for progress, and plan_revise when discoveries change unfinished tasks.`,
						},
					],
					details: { state },
				};
			}

			state = {
				mode: "planning",
				tasks,
				toolsBeforePlanning: state.toolsBeforePlanning,
			};
			const proposedState = state;
			persist();
			updateUI(ctx);

			const planText = formatPlan(state.tasks);
			if (!ctx.hasUI) {
				return {
					content: [
						{
							type: "text",
							text: `${planText}\n\nPlan saved. Execution requires an interactive approval.`,
						},
					],
					details: { state },
					terminate: true,
				};
			}

			ctx.ui.notify(planText, "info");
			const choice = await ctx.ui.select(
				`Plan ready (${state.tasks.length} tasks). What next?`,
				["Execute the plan", "Stay in plan mode", "Refine the plan"],
			);
			if (state !== proposedState) {
				return {
					content: [
						{
							type: "text",
							text: "The plan changed while approval was open. The stale response was ignored.",
						},
					],
					details: { state },
					terminate: true,
				};
			}

			if (choice === "Execute the plan") {
				state = {
					mode: "executing",
					tasks: state.tasks,
					toolsBeforePlanning: state.toolsBeforePlanning,
				};
				enableExecutionTools(state);
				persist();
				updateUI(ctx);
				pi.sendMessage(
					{
						customType: "plan-execution-start",
						content: `${planText}\n\nExecution approved. Begin the plan now.`,
						display: true,
					},
					{ triggerTurn: true, deliverAs: "followUp" },
				);
				return {
					content: [
						{
							type: "text",
							text: "Execution approved. Starting a new execution turn with full tools and execution instructions.",
						},
					],
					details: { state },
					terminate: true,
				};
			}

			if (choice === "Refine the plan") {
				const refinement = await ctx.ui.editor("Refine the plan:", "");
				if (state !== proposedState) {
					return {
						content: [
							{
								type: "text",
								text: "The plan changed while refinement was open. The stale refinement was ignored.",
							},
						],
						details: { state },
						terminate: true,
					};
				}
				if (refinement?.trim()) {
					return {
						content: [
							{
								type: "text",
								text: `${planText}\n\nUser refinement:\n${refinement.trim()}\n\nRevise the plan, then call plan_create again.`,
							},
						],
						details: { state },
					};
				}
			}

			return {
				content: [
					{
						type: "text",
						text: `${planText}\n\nRemain in read-only plan mode and wait for the user.`,
					},
				],
				details: { state },
				terminate: true,
			};
		},

		renderCall(args, theme, context) {
			if (!context.argsComplete) {
				return new Text(theme.fg("muted", "Creating plan…"), 0, 0);
			}
			const tasks: PlanTask[] = args.tasks.map((task, index) => ({
				step: index + 1,
				title: task.title,
				outcome: task.outcome,
				todos: task.todos,
				status: "pending",
			}));
			return new Text(theme.fg("toolTitle", formatPlan(tasks)), 0, 0);
		},
	});

	pi.registerTool({
		name: REVISE_TOOL,
		label: "Revise Plan",
		description:
			"Replace unfinished tasks when new findings change the work. Completed tasks remain immutable with their original step numbers. Supply the complete revised unfinished plan and a concise reason.",
		promptSnippet: "Revise unfinished work in the active structured plan",
		promptGuidelines: [
			"Use plan_revise only when discoveries materially change unfinished tasks; preserve completed work and avoid churn for wording-only updates.",
		],
		parameters: RevisePlanParams,
		executionMode: "sequential",

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			if (state.mode !== "executing") {
				throw new Error("plan_revise is only available while executing a plan");
			}

			const reason = params.reason.trim();
			if (!reason) throw new Error("Plan revision reason cannot be empty");

			const completed = state.tasks.filter((task) => task.status === "done");
			const lastStep = completed.at(-1)?.step ?? 0;
			const revised: PlanTask[] = params.tasks.map((task, index) => ({
				step: lastStep + index + 1,
				title: task.title.trim(),
				outcome: task.outcome.trim(),
				todos: task.todos.map((todo) => todo.trim()),
				status: task.status,
			}));
			if (
				revised.some(
					(task) =>
						!task.title || !task.outcome || task.todos.some((todo) => !todo),
				)
			) {
				throw new Error(
					"Plan titles, outcomes, and todo items cannot be empty",
				);
			}

			state = {
				mode: "executing",
				toolsBeforePlanning: state.toolsBeforePlanning,
				tasks: [...completed, ...revised],
			};
			persist();
			updateUI(ctx);
			return {
				content: [
					{
						type: "text",
						text: `Plan revised: ${reason}\n\n${formatPlan(state.tasks)}`,
					},
				],
				details: { state },
			};
		},

		renderCall(_args, theme, context) {
			return new Text(
				theme.fg(
					context.argsComplete ? "toolTitle" : "muted",
					context.argsComplete ? "Revising plan" : "Revising plan…",
				),
				0,
				0,
			);
		},
	});

	pi.registerTool({
		name: UPDATE_TOOL,
		label: "Update Plan",
		description:
			"Update one task while executing an active plan. Mark it in_progress before work, done only after its todos and validation are complete, or blocked with the concrete blocker. Done and blocked updates require a concise evidence note.",
		promptSnippet: "Track progress against the active implementation plan",
		promptGuidelines: [
			"Use plan_update during plan execution; never mark a task done before its todos and required validation are complete.",
		],
		parameters: UpdatePlanParams,
		executionMode: "sequential",

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			if (state.mode !== "executing")
				throw new Error("plan_update is only available while executing a plan");

			const note = params.note?.trim();
			if ((params.status === "done" || params.status === "blocked") && !note) {
				throw new Error(`${params.status} requires a concise note`);
			}

			const task = state.tasks.find(
				(candidate) => candidate.step === params.step,
			);
			if (!task) throw new Error(`Plan task ${params.step} does not exist`);
			if (task.status === "done")
				throw new Error("Completed tasks are terminal");
			if (params.status === "done" && task.status !== "in_progress") {
				throw new Error(
					"A task must be in_progress before it can be marked done",
				);
			}

			state = {
				mode: "executing",
				toolsBeforePlanning: state.toolsBeforePlanning,
				tasks: state.tasks.map((candidate) => {
					if (candidate.step !== params.step) return candidate;
					const { note: _previousNote, ...taskWithoutNote } = candidate;
					return note
						? { ...taskWithoutNote, status: params.status, note }
						: { ...taskWithoutNote, status: params.status };
				}),
			};

			const isComplete = state.tasks.every(
				(candidate) => candidate.status === "done",
			);
			if (isComplete) {
				const tools = state.toolsBeforePlanning;
				state = { mode: "normal", tasks: state.tasks };
				restoreTools(tools);
			}

			persist();
			updateUI(ctx);
			const message = isComplete
				? `Task ${params.step} marked done. The active plan is complete.`
				: `Task ${params.step} is now ${params.status}.`;
			return {
				content: [
					{ type: "text", text: `${message}\n\n${formatPlan(state.tasks)}` },
				],
				details: { state },
			};
		},
	});

	pi.on("tool_call", (event) => {
		if (state.mode !== "planning") return;
		if (!PLANNING_TOOLS.has(event.toolName)) {
			return {
				block: true,
				reason: `Plan mode blocks ${event.toolName}. Finish or leave the plan first.`,
			};
		}
		if (event.toolName === "subagent" && !isPlanningSubagentCall(event.input)) {
			return {
				block: true,
				reason:
					"Plan mode only allows the read-only planner and scout subagents.",
			};
		}
	});

	pi.on("before_agent_start", (event) => {
		if (state.mode === "planning") {
			return {
				systemPrompt: `${event.systemPrompt}\n\n[STRICT PLAN MODE]\nInvestigate without modifying files or external state. Treat the structured plan as the source of truth for tasks and progress. Ask the user for clarification when a correct plan is blocked. When ready, call plan_create with trackable tasks. Every task must include its complete intended outcome and concrete todo list, including validation or review where required. Do not implement the plan before the user approves execution.`,
			};
		}

		if (state.mode === "executing") {
			return {
				systemPrompt: `${event.systemPrompt}\n\n[EXECUTING PLAN]\n${formatPlan(state.tasks)}\n\nWork from this plan as the source of truth. Use plan_update to mark a task in_progress before work. Mark it done only after every todo and required validation is complete, with a concise evidence note. Mark concrete blockers as blocked. Use plan_revise when discoveries materially change unfinished tasks; completed tasks are immutable.`,
			};
		}
	});

	pi.on("session_start", (_event, ctx) => restore(ctx, true));
	pi.on("session_tree", (_event, ctx) => restore(ctx, false));
}
