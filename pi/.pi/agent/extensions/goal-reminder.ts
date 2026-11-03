import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const REMINDER_INTERVAL = 20;
const REMINDER = "Take a step back and evaluate whether the current work is aligned with the task’s agreed goal and scope. It looks like the current solution is overengineered. Check whether there is a simpler approach that meets all current requirements. If so, use it without weakening correctness or safety. Do not add unrelated improvements or speculative abstractions.";

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
