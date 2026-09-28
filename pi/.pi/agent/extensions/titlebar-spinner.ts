import path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const REQUEST = "subagents:rpc:v1:request";
const READY = "subagents:rpc:v1:ready";
const REPLY = "subagents:rpc:v1:reply:";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default function (pi: ExtensionAPI) {
  let context: ExtensionContext | undefined;
  let sessionId: string | undefined;
  let generation = 0;
  let sequence = 0;
  let parentActive = false;
  let childActive = false;
  let pending: (() => void) | undefined;

  function baseTitle(ctx: ExtensionContext): string {
    const project = path.basename(ctx.cwd) || ctx.cwd;
    const session = pi.getSessionName();
    return session ? `π ${session} · ${project}` : `π ${project}`;
  }

  function render(ctx: ExtensionContext): void {
    if (ctx.mode !== "tui") return;
    const title = baseTitle(ctx);
    ctx.ui.setTitle(parentActive || childActive ? `⏳ ${title}` : title);
  }

  function cancelPending(): void {
    pending?.();
    pending = undefined;
  }

  function refresh(): void {
    const ctx = context;
    if (!ctx || ctx.mode !== "tui" || ctx.sessionManager.getSessionId() !== sessionId) return;
    cancelPending();
    const epoch = generation;
    const current = ++sequence;
    const requestId = crypto.randomUUID();
    const unsubscribe = pi.events.on(`${REPLY}${requestId}`, (value: unknown) => {
      if (epoch !== generation || current !== sequence || !context ||
          context.sessionManager.getSessionId() !== sessionId) return;
      if (!record(value) || value.version !== 1 || value.requestId !== requestId ||
          value.method !== "status" || value.success !== true || !record(value.data) ||
          !record(value.data.fleet)) return;
      const fleet = value.data.fleet;
      if (fleet.version !== 1 || typeof fleet.totalActive !== "number" ||
          !Number.isSafeInteger(fleet.totalActive) || fleet.totalActive < 0) return;
      cancelPending();
      childActive = fleet.totalActive > 0;
      render(context);
    });
    pending = unsubscribe;
    pi.events.emit(REQUEST, { version: 1, requestId, method: "status", params: {} });
  }

  pi.on("session_start", (_event, ctx) => {
    cancelPending();
    generation++;
    context = ctx.mode === "tui" ? ctx : undefined;
    sessionId = ctx.sessionManager.getSessionId();
    parentActive = !ctx.isIdle();
    childActive = false;
    render(ctx);
    refresh();
  });
  pi.on("session_info_changed", (_event, ctx) => {
    if (!context || ctx.mode !== "tui" || ctx.sessionManager.getSessionId() !== sessionId) return;
    context = ctx;
    render(ctx);
    refresh();
  });
  pi.on("agent_start", (_event, ctx) => {
    if (!context || ctx.mode !== "tui" || ctx.sessionManager.getSessionId() !== sessionId) return;
    context = ctx;
    parentActive = true;
    render(ctx);
    refresh();
  });
  pi.on("agent_settled", (_event, ctx) => {
    if (!context || ctx.mode !== "tui" || ctx.sessionManager.getSessionId() !== sessionId) return;
    context = ctx;
    parentActive = false;
    render(ctx);
    refresh();
  });
  pi.events.on(READY, (value: unknown) => {
    if (!record(value) || !record(value.session) ||
        value.session.sessionId !== sessionId) return;
    refresh();
  });
  for (const event of ["subagent:async-started", "subagent:async-complete", "subagent:child-status"]) {
    pi.events.on(event, () => {
      const epoch = generation;
      const activeSession = sessionId;
      // Let pi-subagents' synchronous tracker listeners apply this event first.
      queueMicrotask(() => {
        if (epoch === generation && activeSession === sessionId) refresh();
      });
    });
  }
  pi.on("session_shutdown", (_event, ctx) => {
    cancelPending();
    generation++;
    context = undefined;
    sessionId = undefined;
    parentActive = false;
    childActive = false;
    if (ctx.mode === "tui") ctx.ui.setTitle(baseTitle(ctx));
  });
}
