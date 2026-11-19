import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StringEnum } from "@earendil-works/pi-ai";
import { truncateHead, type ExtensionAPI, type SessionManager } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";
import { REVIEW_EFFORTS, getReviewers, review } from "./deep-review";

const effortGuidance = "low = quick bounded decisions; medium = substantial reasoning; hard = difficult/high-stakes tradeoffs. Uses the rigReview pair plus optional rigReviewAdditional reviewers from settings.json, shared with /review; models must be configured first. Higher effort costs more.";
const systemPrompt = "You are a read-only council advisor. Solve the supplied task independently. Do not delegate or modify files. Give concise reasoning and a substantive recommendation.";

type Advisor = { response: string } | { error: string };
const parameters = Type.Object({
 effort: StringEnum(REVIEW_EFFORTS, { description: effortGuidance }),
 task: Type.String({ minLength: 1, description: "Self-contained question/task, context, constraints and relevant file paths." }),
}, { additionalProperties: false });

export default function (pi: ExtensionAPI) {
 if (process.env.PI_SUBAGENT_CHILD === "1") return;
 const active = new Set<AbortController>();
 const reset = () => { for (const controller of active) controller.abort(); };
 pi.on("session_shutdown", reset);
 pi.on("session_start", reset);
 pi.on("session_before_switch", reset);
 pi.on("session_before_fork", reset);
 pi.on("session_before_tree", reset);
 pi.on("session_tree", reset);
 pi.on("session_before_compact", (event) => { if (event.reason === "manual") reset(); });
 pi.registerTool({
  name: "council", label: "Council",
  description: `Run independent read-only advisors in parallel; returns their raw replies when all finish. ${effortGuidance} Output is capped at 2000 lines/50KB; full results go to a temporary file.`,
  promptSnippet: "Consult independent review advisors in parallel",
  promptGuidelines: ["Use council when the user requests it. Supply a self-contained task with relevant context and paths; advisors do not inherit this conversation. Choose council effort explicitly according to its presets. Synthesize the replies yourself, explain important disagreements, and do not claim the tool verified consensus."],
  parameters,
  prepareArguments(args) {
   // Resumed tool calls may still include the old rounds argument.
   const { rounds: _rounds, ...input } = (args ?? {}) as { rounds?: unknown };
   return input as Static<typeof parameters>;
  },
  async execute(_id, params, signal, _onUpdate, ctx) {
   if (!params.task.trim()) throw new Error("Council task must not be blank.");
   const models = getReviewers(pi, params.effort, { includeAdditional: true });
   const usageSession = ctx.sessionManager as typeof ctx.sessionManager & Pick<SessionManager, "appendUsage">;
   if (typeof usageSession.appendUsage !== "function") throw new Error("This Pi version cannot record council usage.");
   const sessionId = usageSession.getSessionId();
   const controller = new AbortController();
   const abort = () => controller.abort();
   signal?.addEventListener("abort", abort, { once: true });
   if (signal?.aborted) abort();
   active.add(controller);
   try {
    const prompt = `Worktree: ${ctx.cwd}\nTask:\n${params.task}`;
    const advisors = controller.signal.aborted ? [] : await Promise.all(models.map(async (model): Promise<Advisor> => {
     try {
      const response = await review(pi, ctx, ctx.cwd, model, systemPrompt, prompt, controller.signal, (message) => {
       if (usageSession.getSessionId() !== sessionId) return;
       usageSession.appendUsage("rig-council", message.provider, message.model, message.usage, `Council ${_id}`);
      });
      return { response };
     } catch (error) {
      return { error: String(error).replaceAll(`${model.provider}/${model.id}`, "[advisor]").replaceAll(model.id, "[advisor]") };
     }
    }));
    const reason = controller.signal.aborted ? "cancelled" : advisors.some((advisor) => "error" in advisor) ? "advisor_failed" : "completed";
    const details = { state: reason === "completed" ? "completed" : "unresolved", reason, effort: params.effort, advisors };
    const full = JSON.stringify(details, null, 2);
    const truncated = truncateHead(full);
    let text = truncated.content;
    if (truncated.truncated) {
     const path = join(await mkdtemp(join(tmpdir(), "pi-council-")), "result.json");
     await writeFile(path, full, { mode: 0o600 });
     text += `\n[Truncated at 2000 lines/50KB. Full council results: ${path}]`;
    }
    return { content: [{ type: "text", text }], details, isError: reason !== "completed" };
   } finally {
    signal?.removeEventListener("abort", abort);
    controller.abort();
    active.delete(controller);
   }
  },
 });
}
