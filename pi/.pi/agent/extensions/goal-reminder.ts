import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const REMINDER_INTERVAL = 20;
const REMINDER = "Look back at the user's current goal and agreed scope. Keep the next action directly focused on that goal. Choose the simplest solution that meets the requirements; do not add unrelated improvements or speculative abstractions. If the goal is met, stop rather than inventing more work.";

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
