import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const COMPACT_AT_TOKENS = 150_000;
const CONTINUE_MESSAGE = "Continue the current task from the compacted context.";

export default function (pi: ExtensionAPI) {
  let isCompacting = false;

  pi.on("context", (_event, ctx) => {
    const usage = ctx.getContextUsage();
    if (isCompacting || !usage || usage.tokens < COMPACT_AT_TOKENS) return;

    isCompacting = true;
    ctx.compact({
      customInstructions: "Preserve the current task, progress, decisions, files, errors, and next steps.",
      onComplete: () => {
        isCompacting = false;
        pi.sendMessage(
          {
            customType: "continue-after-compaction",
            content: CONTINUE_MESSAGE,
            display: false,
          },
          { triggerTurn: true },
        );
      },
      onError: (error) => {
        isCompacting = false;
        if (ctx.hasUI) ctx.ui.notify(`Proactive compaction failed: ${error.message}`, "error");
      },
    });
  });
}
