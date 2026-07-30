import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
  let model = "no-model";
  let checkout = "no-checkout";
  let checkoutLookup = 0;
  let requestRender: (() => void) | undefined;

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
          const branch = footerData.getGitBranch() ?? "no-git";
          const thinking = pi.getThinkingLevel();

          const left = theme.fg("accent", ` ${checkout} `) + theme.fg("dim", ` ${branch}`);
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

  pi.on("before_agent_start", async (event) => {
    await updateCheckout(event.systemPromptOptions.cwd);
  });

  pi.on("thinking_level_select", async () => requestRender?.());

  pi.on("model_select", async (event) => {
    model = event.model.id;
    requestRender?.();
  });
}
