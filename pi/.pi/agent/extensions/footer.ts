import { homedir } from "node:os";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import { calculateCost } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ProviderStreamEvent } from "@earendil-works/pi-coding-agent";
import { sliceByColumn, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { codexServiceTier } from "./lib/codex-speed";

// https://developers.openai.com/api/docs/pricing?latest-pricing=ultrafast
const ultrafastPromotionEnds = Date.parse("2027-03-01T00:00:00-08:00");

function ultrafastMultiplier(model: string, timestamp: number) {
  switch (model) {
    case "gpt-6.2-astra":
    case "gpt-6.2-sol":
      return timestamp < ultrafastPromotionEnds ? 3 : 6;
    case "gpt-6-astra":
    case "gpt-6.1-sol":
      return 6;
    default:
      return 1;
  }
}

export default function (pi: ExtensionAPI) {
  let activeModel: Parameters<typeof codexServiceTier>[0];
  let requestRender: (() => void) | undefined;
  let ultrafastResponse: Pick<ProviderStreamEvent, "provider" | "api" | "model"> & { id: string } | undefined;

  pi.on("turn_start", () => { ultrafastResponse = undefined; });
  pi.on("provider_stream_event", ({ provider, api, model, data }) => {
    if (provider !== "openai" && provider !== "openai-codex") return;
    if (api !== "openai-responses" && api !== "openai-codex-responses") return;
    const event = data as { type?: string; response?: { id?: unknown; service_tier?: unknown } } | null;
    if (event?.type !== "response.completed" && event?.type !== "response.done" && event?.type !== "response.incomplete") return;
    const response = event.response;
    ultrafastResponse = response?.service_tier === "ultrafast" && typeof response.id === "string"
      ? { provider, api, model, id: response.id }
      : undefined;
  });

  pi.on("message_end", ({ message }, { model }) => {
    if (message.role !== "assistant") return;
    const response = ultrafastResponse;
    ultrafastResponse = undefined;
    if (!response || message.responseId !== response.id || message.provider !== response.provider ||
      message.api !== response.api || message.model !== response.model || model?.id !== response.model ||
      model.provider !== response.provider || model.api !== response.api || message.usage.cost.totalFromProvider) return;

    const multiplier = ultrafastMultiplier(message.model, message.timestamp);
    if (multiplier === 1) return;
    const usage = { ...message.usage, cost: { ...message.usage.cost } };
    const standard = calculateCost(model, usage);
    // Don't reprice a response once Pi itself accounts for the tier.
    if (standard.total !== message.usage.cost.total) return;
    for (const key of ["input", "output", "cacheRead", "cacheWrite", "total"] as const) {
      usage.cost[key] *= multiplier;
    }
    return { message: { ...message, usage } };
  });

  const tokenFormat = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  pi.on("session_start", async (_event, ctx) => {
    activeModel = ctx.model;
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
      let cachedInputTokens = 0;

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
            cachedInputTokens = 0;
            // Match Pi's cumulative accounting without rescanning on every frame.
            for (const entry of ctx.sessionManager.getEntries()) {
              const billed = entry.type === "message"
                ? (entry.message.role === "assistant" || entry.message.role === "toolResult" ? entry.message.usage : undefined)
                : (entry.type === "usage" || entry.type === "compaction" || entry.type === "branch_summary" ? entry.usage : undefined);
              if (billed) {
                cost += billed.cost.total;
                inputTokens += billed.input + billed.cacheRead + billed.cacheWrite;
                cachedInputTokens += billed.cacheRead;
                outputTokens += billed.output;
              }
            }
          }
          const cachedPercent = inputTokens > 0 ? (cachedInputTokens / inputTokens * 100).toFixed(0) : "0";
          const statuses = footerData.getExtensionStatuses();
          const selected = stripVTControlCharacters(statuses.get("fast-priority") ?? "").toLowerCase();
          const speed = codexServiceTier(activeModel, selected) ? selected : "normal";
          const right = (statuses.has("rig-deep-review") ? theme.fg("accent", "reviewing  ") : "") +
            theme.fg(contextColor, context) +
            theme.fg("dim", `  in ${tokenFormat.format(inputTokens).toLowerCase()} (${cachedPercent}%) - out ${tokenFormat.format(outputTokens).toLowerCase()} ($${cost.toFixed(3)})  ${speed} │ `) +
            theme.fg("accent", thinking) + theme.fg("dim", ` │ ${activeModel?.id ?? "no-model"} `);
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
    activeModel = event.model;
    requestRender?.();
  });
}
