import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

type SpeedMode = "off" | "fast" | "ultrafast";

// Mirror @calesennett/pi-codex-fast@0.1.14, which does not export its support table.
const fastModels = new Set([
  "gpt-5.4", "gpt-5.5", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna",
  "gpt-6-astra", "gpt-6-sol", "gpt-6-luna", "gpt-6.1-sol", "gpt-6.1-terra",
  "gpt-6.2-sol", "gpt-6.2-astra",
]);
const ultrafastModels = new Set([
  "openai/gpt-5.6-sol",
  ...["gpt-6-astra", "gpt-6.1-sol", "gpt-6.2-sol", "gpt-6.2-astra"]
    .flatMap(id => [`openai/${id}`, `openai-codex/${id}`]),
]);

export function codexServiceTier(model: { provider: string; id: string } | undefined, mode: string) {
  if (!model) return undefined;
  const { provider, id } = model;
  if (mode === "fast" && (provider === "openai" || provider === "openai-codex") && fastModels.has(id)) return "priority";
  if (mode === "ultrafast" && ultrafastModels.has(`${provider}/${id}`)) return "ultrafast";
  return undefined;
}

async function readMode(file: string): Promise<SpeedMode | undefined> {
  try {
    const settings = JSON.parse(await readFile(file, "utf8"))?.["pi-codex-fast"];
    const mode = settings?.mode;
    if (mode === "off" || mode === "fast" || mode === "ultrafast") return mode;
    if (typeof settings?.enabled === "boolean") return settings.enabled ? "fast" : "off";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

// /review and council stream directly, outside Pi's before_provider_request hook.
export async function reviewSpeedMode(cwd: string): Promise<SpeedMode> {
  // Pi's getFlag only exposes flags to the extension that registered them.
  const args = process.argv.slice(2);
  const end = args.indexOf("--");
  const flags = end < 0 ? args : args.slice(0, end);
  if (flags.includes("--no-fast")) return "off";
  if (flags.includes("--ultrafast")) return "ultrafast";
  if (flags.includes("--fast")) return "fast";
  try {
    const global = await readMode(join(getAgentDir(), "settings.json"));
    return await readMode(join(cwd, ".pi", "settings.json")) ?? global ?? "off";
  } catch {
    // Match the package: malformed settings must not opt a request into a paid tier.
    return "off";
  }
}
