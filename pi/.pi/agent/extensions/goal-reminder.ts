import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const REMINDER_INTERVAL = 20;
const REMINDER = "Step back for a moment and ask the two questions from your working instructions: does the current step move the user's goal forward, and is this the simplest thing that meets the current requirements? If both answers are yes, carry on exactly as you were. If you have drifted into a side problem, or the solution has grown beyond the plan, return to the goal or take the simpler route, without weakening correctness or safety. This is a private check: do not stop, ask the user, or mention it in your messages.";

export default function (pi: ExtensionAPI) {
  let calls = 0;

  pi.on("context_with_system", (event) => {
    calls += 1;
    if (calls % REMINDER_INTERVAL !== 0) return;

    return {
      messages: [
        ...event.messages,
        { role: "system", content: REMINDER, timestamp: Date.now() },
      ],
    };
  });
}
