import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const SOUND = "/System/Library/Sounds/Blow.aiff";

export default function (pi: ExtensionAPI) {
  pi.on("agent_settled", async (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    try {
      const sessionManager = ctx.sessionManager;
      const sessionId = sessionManager.getSessionId();
      const requestId = randomUUID();
      const reply = await new Promise<unknown>((resolve) => {
        const finish = (payload: unknown) => {
          unsubscribe();
          clearTimeout(timeout);
          resolve(payload);
        };
        const unsubscribe = pi.events.on(`subagents:rpc:v1:reply:${requestId}`, finish);
        const timeout = setTimeout(() => finish(undefined), 1000);
        try {
          pi.events.emit("subagents:rpc:v1:request", {
            version: 1,
            requestId,
            method: "status",
            params: {},
          });
        } catch {
          finish(undefined);
        }
      });

      if (
        typeof reply !== "object" || reply === null ||
        !("version" in reply) || reply.version !== 1 ||
        !("requestId" in reply) || reply.requestId !== requestId ||
        !("success" in reply) || reply.success !== true ||
        !("data" in reply) || typeof reply.data !== "object" || reply.data === null ||
        !("fleet" in reply.data) || typeof reply.data.fleet !== "object" || reply.data.fleet === null ||
        !("version" in reply.data.fleet) || reply.data.fleet.version !== 1 ||
        !("totalActive" in reply.data.fleet) || reply.data.fleet.totalActive !== 0
      ) return;

      if (
        !ctx.isIdle() || ctx.sessionManager !== sessionManager ||
        ctx.sessionManager.getSessionId() !== sessionId
      ) return;
    } catch {
      // Reloaded or replaced contexts and unavailable status must remain silent.
      return;
    }

    const player = spawn("/usr/bin/afplay", [SOUND], {
      detached: true,
      stdio: "ignore",
    });
    player.on("error", () => {});
    player.unref();
  });
}
