import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

interface Delegation {
  tasks: number;
  isParallel: boolean;
}

interface SessionMetrics {
  delegatedTasks: number;
  parallelTasks: number;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function countTasks(input: unknown): number {
  if (!Array.isArray(input)) return 0;

  return input.filter(
    (task) => isRecord(task) && typeof task.agent === "string" && typeof task.task === "string",
  ).length;
}

function getDelegation(input: unknown): Delegation {
  if (!isRecord(input)) return { tasks: 0, isParallel: false };

  const parallelTasks = countTasks(input.tasks);
  if (parallelTasks > 0) return { tasks: parallelTasks, isParallel: true };

  const chainTasks = countTasks(input.chain);
  if (chainTasks > 0) return { tasks: chainTasks, isParallel: false };

  const hasSingleTask = typeof input.agent === "string" && typeof input.task === "string";
  return { tasks: hasSingleTask ? 1 : 0, isParallel: false };
}

export default function (pi: ExtensionAPI) {
  let model = "no-model";
  let checkout = "no-checkout";
  let checkoutLookup = 0;
  let requestRender: (() => void) | undefined;
  const activeDelegations = new Set<string>();

  async function updateCheckout(cwd: string): Promise<void> {
    const lookup = ++checkoutLookup;
    const result = await pi.exec(
      "git",
      [
        "rev-parse",
        "--path-format=absolute",
        "--show-toplevel",
        "--git-dir",
        "--git-common-dir",
      ],
      { cwd, timeout: 2_000 },
    );
    if (lookup !== checkoutLookup) return;

    const [root = "", gitDir = "", commonGitDir = ""] = result.code === 0
      ? result.stdout.trim().split(/\r?\n/)
      : [];
    const directory = path.basename(root || cwd) || cwd;

    if (!root || !gitDir || !commonGitDir) {
      checkout = `dir:${directory}`;
    } else if (path.normalize(gitDir) === path.normalize(commonGitDir)) {
      checkout = `repo:${directory}`;
    } else {
      const repository = path.basename(path.dirname(commonGitDir));
      checkout = `wt:${directory} · repo:${repository}`;
    }
    requestRender?.();
  }

  pi.on("session_start", async (_event, ctx) => {
    model = ctx.model?.id ?? "no-model";
    activeDelegations.clear();
    await updateCheckout(ctx.cwd);

    ctx.ui.setFooter((tui, theme, footerData) => {
      requestRender = () => tui.requestRender();
      const unsubscribe = footerData.onBranchChange(requestRender);

      return {
        invalidate() {},
        dispose() {
          unsubscribe();
          requestRender = undefined;
        },
        render(width: number): string[] {
          const metrics: SessionMetrics = {
            delegatedTasks: 0,
            parallelTasks: 0,
          };

          for (const entry of ctx.sessionManager.getBranch()) {
            if (entry.type !== "message" || entry.message.role !== "assistant") continue;

            for (const part of entry.message.content) {
              if (part.type !== "toolCall" || part.name !== "subagent") continue;
              const input: unknown = part.arguments;
              const delegation = getDelegation(input);
              metrics.delegatedTasks += delegation.tasks;
              if (delegation.isParallel) metrics.parallelTasks += delegation.tasks;
            }
          }

          const parallelPercent = metrics.delegatedTasks === 0
            ? 0
            : Math.round((metrics.parallelTasks / metrics.delegatedTasks) * 100);
          const branch = footerData.getGitBranch() ?? "no-git";
          const thinking = pi.getThinkingLevel();

          const left = theme.fg("accent", ` ${checkout} `) + theme.fg("dim", ` ${branch}`);
          const active = activeDelegations.size > 0 ? ` active:${activeDelegations.size}` : "";
          const right =
            theme.fg(
              "dim",
              `delegated:${metrics.delegatedTasks} │ parallel:${metrics.parallelTasks}/${metrics.delegatedTasks}` +
                ` (${parallelPercent}%)${active} │ `,
            ) +
            theme.fg("accent", thinking) +
            theme.fg("dim", ` │ ${model} `);
          const rightWidth = visibleWidth(right);
          if (rightWidth >= width) return [truncateToWidth(right, width)];

          const visibleLeft = truncateToWidth(left, width - rightWidth - 1, "");
          const gap = " ".repeat(width - visibleWidth(visibleLeft) - rightWidth);
          return [visibleLeft + gap + right];
        },
      };
    });
  });

  pi.on("before_agent_start", async (event) => {
    await updateCheckout(event.systemPromptOptions.cwd);
  });

  pi.on("tool_execution_start", async (event) => {
    if (event.toolName !== "subagent") return;
    activeDelegations.add(event.toolCallId);
    requestRender?.();
  });

  pi.on("tool_execution_end", async (event) => {
    if (event.toolName !== "subagent") return;
    activeDelegations.delete(event.toolCallId);
    requestRender?.();
  });

  pi.on("thinking_level_select", async () => requestRender?.());

  pi.on("model_select", async (event) => {
    model = event.model.id;
    requestRender?.();
  });
}
