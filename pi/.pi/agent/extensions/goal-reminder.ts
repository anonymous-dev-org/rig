import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Compatibility asset: full sync replaces the old reminder on existing installs.
// Automatic pair review is now configured through pi-subagents watchdog settings
// and ~/.pi/agent/WATCHDOG.md; no fixed message is injected here.
export default function (_pi: ExtensionAPI) {
}
