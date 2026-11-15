import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Compatibility asset: full sync replaces the old reminder on existing installs.
// Automatic pair review now lives in paired-review.ts with the shared prompt
// in ~/.pi/agent/WATCHDOG.md; no fixed message is injected here.
export default function (_pi: ExtensionAPI) {
}
