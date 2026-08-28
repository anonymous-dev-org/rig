import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
  let model = "no-model";
  let repository = "no-repository";
  let requestRender: (() => void) | undefined;

  async function updateRepository(cwd: string): Promise<void> {
    const result = await pi.exec("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      timeout: 2_000,
    });
    const root = result.code === 0 ? result.stdout.trim() : "";
    repository = path.basename(root || cwd) || cwd;
  }

  pi.on("session_start", async (_event, ctx) => {
    model = ctx.model?.id ?? "no-model";
    await updateRepository(ctx.cwd);

    ctx.ui.setFooter((tui, theme, footerData) => {
      requestRender = () => tui.requestRender();
      const unsubscribeBranch = footerData.onBranchChange(requestRender);

      return {
        invalidate() {},
        dispose() {
          unsubscribeBranch();
          requestRender = undefined;
        },
        render(width: number): string[] {
          const thinking = pi.getThinkingLevel();
          const branch = footerData.getGitBranch();

          const left =
            theme.fg("accent", ` ${repository}`) +
            theme.fg("dim", branch ? `   ${branch} ` : " ");
          const right = theme.fg("accent", thinking) + theme.fg("dim", ` │ ${model} `);
          const rightWidth = visibleWidth(right);
          if (rightWidth >= width) return [truncateToWidth(right, width)];

          const visibleLeft = truncateToWidth(left, width - rightWidth - 1, "");
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
