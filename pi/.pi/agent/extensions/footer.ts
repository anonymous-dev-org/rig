import { homedir } from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { sliceByColumn, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
  let model = "no-model";
  let requestRender: (() => void) | undefined;

  pi.on("session_start", async (_event, ctx) => {
    model = ctx.model?.id ?? "no-model";
    if (ctx.mode !== "tui") return;
    const home = homedir();
    let cwd = ctx.cwd;
    if (cwd === home) cwd = "~";
    else if (cwd.startsWith(home + path.sep)) cwd = `~${cwd.slice(home.length)}`;
    const workingPath = cwd.replace(/[\x00-\x1f\x7f]/g, " ");

    ctx.ui.setFooter((tui, theme, footerData) => {
      requestRender = () => tui.requestRender();
      const unsubscribeBranch = footerData.onBranchChange(requestRender);
      let costLeaf: string | null | undefined;
      let cost = 0;

      return {
        invalidate() {},
        dispose() {
          unsubscribeBranch();
          requestRender = undefined;
        },
        render(width: number): string[] {
          const thinking = pi.getThinkingLevel();
          const branch = footerData.getGitBranch();

          const usage = ctx.getContextUsage();
          const limit = usage?.contextWindow ?? ctx.model?.contextWindow;
          let limitText = limit == null ? "?" : `${limit}`;
          if (limit != null && limit >= 1_000_000) limitText = `${Number((limit / 1_000_000).toFixed(1))}M`;
          else if (limit != null && limit >= 1_000) limitText = `${Number((limit / 1_000).toFixed(1))}k`;
          const percent = usage?.percent;
          const context = `ctx ${percent == null ? "?" : percent.toFixed(0) + "%"}/${limitText}`;
          let contextColor: "dim" | "warning" | "error" = "dim";
          if (percent != null && percent > 90) contextColor = "error";
          else if (percent != null && percent > 70) contextColor = "warning";
          const leaf = ctx.sessionManager.getLeafId();
          if (costLeaf !== leaf) {
            costLeaf = leaf;
            cost = 0;
            // Match Pi's cumulative accounting without rescanning on every frame.
            for (const entry of ctx.sessionManager.getEntries()) {
              if (entry.type === "message") {
                if (entry.message.role === "assistant" || entry.message.role === "toolResult") {
                  cost += entry.message.usage?.cost.total ?? 0;
                }
              } else if (entry.type === "usage" || entry.type === "compaction" || entry.type === "branch_summary") {
                cost += entry.usage?.cost.total ?? 0;
              }
            }
          }
          const fast = footerData.getExtensionStatuses().get("pi-fast") ?? "Fast n/a";
          const right = theme.fg(contextColor, context) +
            theme.fg("dim", `  $${cost.toFixed(3)}  ${fast} │ `) +
            theme.fg("accent", thinking) + theme.fg("dim", ` │ ${model} `);
          const rightWidth = visibleWidth(right);
          if (rightWidth >= width) return [truncateToWidth(right, width)];

          const leftWidth = width - rightWidth - 1;
          const branchText = branch ? `   ${branch}` : "";
          const pathWidth = Math.max(0, leftWidth - visibleWidth(branchText) - 1);
          const pathLength = visibleWidth(workingPath);
          let shortPath = workingPath;
          if (pathLength > pathWidth) {
            shortPath = pathWidth > 1
              ? `…${sliceByColumn(workingPath, pathLength - pathWidth + 1, pathWidth - 1)}` : "";
          }
          const visibleLeft = truncateToWidth(
            theme.fg("accent", ` ${shortPath}`) + theme.fg("dim", branchText), leftWidth, "",
          );
          const gap = " ".repeat(width - visibleWidth(visibleLeft) - rightWidth);
          return [visibleLeft + gap + right];
        },
      };
    });
  });

  pi.on("thinking_level_select", async () => requestRender?.());

  pi.on("model_select", async (event) => {
    model = event.model.id;
    requestRender?.();
  });
}
