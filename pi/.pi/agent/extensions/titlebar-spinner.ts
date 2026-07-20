import path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export default function (pi: ExtensionAPI) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let frameIndex = 0;

  function baseTitle(ctx: ExtensionContext): string {
    const project = path.basename(ctx.cwd) || ctx.cwd;
    const session = pi.getSessionName();
    return session ? `π ${session} · ${project}` : `π ${project}`;
  }

  function setWorkingTitle(ctx: ExtensionContext): void {
    const frame = FRAMES[frameIndex] ?? "⠋";
    ctx.ui.setTitle(`${frame} ${baseTitle(ctx)}`);
    frameIndex = (frameIndex + 1) % FRAMES.length;
  }

  function stop(ctx: ExtensionContext): void {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
    frameIndex = 0;
    if (ctx.mode === "tui") ctx.ui.setTitle(baseTitle(ctx));
  }

  function start(ctx: ExtensionContext): void {
    if (ctx.mode !== "tui") return;
    stop(ctx);
    setWorkingTitle(ctx);
    timer = setInterval(() => setWorkingTitle(ctx), 80);
  }

  pi.on("session_start", (_event, ctx) => stop(ctx));
  pi.on("session_info_changed", (_event, ctx) => {
    if (ctx.mode === "tui" && timer === undefined) ctx.ui.setTitle(baseTitle(ctx));
  });
  pi.on("agent_start", (_event, ctx) => start(ctx));
  pi.on("agent_settled", (_event, ctx) => stop(ctx));
  pi.on("session_shutdown", (_event, ctx) => stop(ctx));
}
