import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
  let model = "no-model";
  let requestRender: (() => void) | undefined;

  pi.on("session_start", async (_event, ctx) => {
    model = ctx.model?.id ?? "no-model";

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
          const project = path.basename(ctx.cwd) || ctx.cwd;
          const branch = footerData.getGitBranch() ?? "no-git";
          const thinking = pi.getThinkingLevel();

          const left = theme.fg("accent", ` ${project} `) + theme.fg("dim", ` ${branch}`);
          const right =
            theme.fg("dim", "thinking: ") +
            theme.fg("accent", thinking) +
            theme.fg("dim", ` │ ${model} `);
          const gap = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));

          return [truncateToWidth(left + gap + right, width)];
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
