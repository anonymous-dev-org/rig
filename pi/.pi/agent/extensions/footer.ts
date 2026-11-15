import { homedir } from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { sliceByColumn, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
  let model = "no-model";
  let requestRender: (() => void) | undefined;
  const tokenFormat = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

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
      let inputTokens = 0;
      let outputTokens = 0;

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
          const tokens = usage?.tokens;
          let tokensText = tokens == null ? "?" : `${tokens}`;
          if (tokens != null && tokens >= 1_000_000) tokensText = `${Number((tokens / 1_000_000).toFixed(1))}M`;
          else if (tokens != null && tokens >= 1_000) tokensText = `${Number((tokens / 1_000).toFixed(1))}k`;
          const percent = usage?.percent;
          const context = `ctx ${tokensText}/${limitText} (${percent == null ? "?" : percent.toFixed(0) + "%"})`;
          let contextColor: "dim" | "warning" | "error" = "dim";
          if (percent != null && percent > 90) contextColor = "error";
          else if (percent != null && percent > 70) contextColor = "warning";
          const leaf = ctx.sessionManager.getLeafId();
          if (costLeaf !== leaf) {
            costLeaf = leaf;
            cost = 0;
            inputTokens = 0;
            outputTokens = 0;
            // Match Pi's cumulative accounting without rescanning on every frame.
            for (const entry of ctx.sessionManager.getEntries()) {
              const billed = entry.type === "message"
                ? (entry.message.role === "assistant" || entry.message.role === "toolResult" ? entry.message.usage : undefined)
                : (entry.type === "usage" || entry.type === "compaction" || entry.type === "branch_summary" ? entry.usage : undefined);
              if (billed) {
                cost += billed.cost.total;
                inputTokens += billed.input + billed.cacheRead + billed.cacheWrite;
                outputTokens += billed.output;
              }
            }
          }
          const fast = footerData.getExtensionStatuses().get("pi-fast") ?? "Fast n/a";
          const reviewing = footerData.getExtensionStatuses().get("rig-paired-review");
          const turns = footerData.getExtensionStatuses().get("rig-paired-review-turns");
          const right = (turns ? theme.fg("dim", `${turns}  `) : "") +
            (reviewing ? theme.fg("accent", `${reviewing}  `) : "") +
            theme.fg(contextColor, context) +
            theme.fg("dim", `  in ${tokenFormat.format(inputTokens).toLowerCase()} - out ${tokenFormat.format(outputTokens).toLowerCase()} ($${cost.toFixed(3)})  ${fast} │ `) +
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
