import { spawn } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const SOUND = "/System/Library/Sounds/Blow.aiff";

export default function (pi: ExtensionAPI) {
  pi.on("agent_settled", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    const player = spawn("/usr/bin/afplay", [SOUND], {
      detached: true,
      stdio: "ignore",
    });
    player.on("error", () => {});
    player.unref();
  });
}
