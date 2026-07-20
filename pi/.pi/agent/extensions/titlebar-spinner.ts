import path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  function baseTitle(ctx: ExtensionContext): string {
    const project = path.basename(ctx.cwd) || ctx.cwd;
    const session = pi.getSessionName();
    return session ? `π ${session} · ${project}` : `π ${project}`;
  }

  function stop(ctx: ExtensionContext): void {
    if (ctx.mode === "tui") ctx.ui.setTitle(baseTitle(ctx));
  }

  function start(ctx: ExtensionContext): void {
    if (ctx.mode !== "tui") return;
    ctx.ui.setTitle(`⏳ ${baseTitle(ctx)}`);
  }

  function update(ctx: ExtensionContext): void {
    if (ctx.isIdle()) stop(ctx);
    else start(ctx);
  }

  pi.on("session_start", (_event, ctx) => stop(ctx));
  pi.on("session_info_changed", (_event, ctx) => update(ctx));
  pi.on("agent_start", (_event, ctx) => start(ctx));
  pi.on("agent_settled", (_event, ctx) => stop(ctx));
  pi.on("session_shutdown", (_event, ctx) => stop(ctx));
}
