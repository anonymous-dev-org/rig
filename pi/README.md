# Global Pi configuration

Pi 1.2 supports MCP natively: no adapter package is needed. Rig's public
`settings.example.json` and `mcp.example.json` are defaults, not effective files.
Run the narrow command from any working directory (use an absolute script path):

```sh
node /path/to/rig/pi/sync-settings.mjs
```

It creates ordinary private `~/.pi/agent/settings.json` and `mcp.json` files,
with history and recovery records under `~/.local/state/rig/pi/`, never in rig.
`./sync.sh` calls this same command for selected Pi. An explicit asset list excludes
private configs, templates, repository docs, sync tooling and browser captures from
deployment. Disabled skills are retained in the repo and are not deployed.
Direct principle skills, agents, extensions, themes and instructions are managed local copies. Every full sync restores repo bytes, including edits and deletions, with private backups of replaced files. Add personal resources in separate files outside the managed inventory. Managed JSON assets use the additive ownership policy below.
Pi's built-in auto-compaction is enabled by default. Its token budgets are personal:
rig no longer imposes a reserve sized for one particular model's context window.
Pi Lens and billion-context are no longer default packages, and rig no longer
deploys their configuration files. This removes their tools and instructions from
new sessions using the defaults.

JSON sync restores `compaction.enabled` to `true`, including on existing installs.
JSON sync removes previously repo-owned package identities absent from current
defaults, even if their pins or filters changed locally. Pi Lens, billion-context
and Ponytail declarations are explicitly retired even without prior sync history.
Full Pi sync also backs up and removes the old managed Pi Lens and billion-context
configuration files. Downloaded package caches are not uninstalled. Restart Pi
afterward; start a new session for a clean comparison of startup token usage.

Sync enforces the shared keys in both templates, with or without prior history.
Model defaults are an exception: sync fills missing choices and upgrades older
OpenAI Sol and Astra selections as described below. Personal model, thinking,
token-budget, fast-mode and agent-override choices are otherwise excluded from
enforcement and retirement, even if an older baseline supplied them. Other
repository keys win recursively, including changed/deleted values; local-only
keys and additional MCP servers remain. Arrays are replaced as a whole by repo arrays,
not concatenated, because commands and argument order must remain valid.
Pi's `packages` list is special: repository declarations come first and win by
package identity; additional personal package identities remain. Local pins,
filters and deletions cannot replace or disable a repo package declaration.
Ambiguous duplicate identities stop sync before publication. Previous repo
baselines identify removed fields and package identities, which are retired rather
than kept as additions. Removing a repo-owned JSON object also removes local
customizations inside it; unrelated local keys remain. Without previous baselines,
only explicitly known retirements are removed.
Add personal keys/packages to home files, not the templates. Existing recovery
journals finish safely before a fresh enforcement pass applies current defaults. Keep secrets out of rig; use Pi's environment
variable references (for example `${SERVICE_API_KEY}` in server `env` values),
and supply those variables in Pi's environment rather than committing credentials.

## Personal model setup

After syncing, edit **`~/.pi/agent/settings.json`**, not the repository templates.
Use [`personal-settings.example.json`](personal-settings.example.json) as a menu of
fields to merge into that file. Replace every `<...>` value you use; do not copy
the example over the whole settings file. It is documentation only and is never deployed.

| Personal choice | Setting |
| --- | --- |
| Main model and provider | `defaultModel`, `defaultProvider` |
| Thinking and model cycling | `defaultThinkingLevel`, `modelThinkingLevels`, `thinkingBudgets`, `enabledModels` |
| Context/token budgets | `compaction.reserveTokens`, `compaction.keepRecentTokens`, `compaction.modelOverrides` |
| Subagent models and providers | `subagents.defaultModel`, `subagents.defaultProvider` |
| Per-agent models, thinking, speed and enabled roles | `subagents.agentOverrides`, `subagents.agentOverridesByProvider` |
| Fast mode and watchdog preferences | `pi-codex-fast.mode`, `subagents.watchdog` |
| Review and council pairs | `rigReview.low`, `rigReview.medium`, `rigReview.hard` |
| Extra reviewers for `/review` and council | `rigReviewAdditional.low`, `rigReviewAdditional.medium`, `rigReviewAdditional.hard` |

Compaction budgets follow one rule: Pi auto-compacts when estimated
context exceeds `contextWindow − reserveTokens`. Set each model's
`compaction.modelOverrides` entry to `reserveTokens = 30% of the window the
provider actually serves`, so compaction starts at 70% of that window (a
model served at 1,048,576 tokens takes 314,572; one served at 200,000
takes 60,000). Keys are exact `provider/modelId` values; merge only the
per-model override to leave the ordinary budgets unchanged, and size the
reserve for the window the provider actually serves — subscription-authenticated Claude models advertise 1M but
are served at the standard 200K.

Use `pi --list-models` to find available provider/model IDs, and authenticate the
providers you choose. Main-model IDs and providers are separate fields; subagent
models use `provider/modelId`. Per-agent reasoning uses `thinking`, while review
entries use `thinkingLevel`. Valid levels are `off`, `minimal`, `low`, `medium`,
`high`, `xhigh`, and `max` (support depends on the selected model).

Sync seeds OpenAI Sol 6.2 for main sessions and subagents. Rig does not set a
default model rotation; Pi cycles through all available models unless you set
`enabledModels`. The default `/review` and `council` pairs use Sol 6.2 with
Opus 5.5 for low and medium, and Astra 6.2 with Fable 5.2 for hard. Sign in to OpenAI and
pi-sub-anthropic to use the default pairs, or configure your own. If Sol 6.2
or Astra 6.2 is missing, refresh Pi's catalog with `pi update --models`.

Sync also seeds OpenCode Go GLM-5.3 and DeepSeek V4 Pro as extra reviewers for
`/review` and council. Their thinking levels are `low`, `high`, and `max` for low,
medium, and hard efforts respectively. Each `rigReviewAdditional` entry accepts a
single reviewer object or an array of them. Authenticate `opencode-go` to use them.
To keep two reviewers for a mode, set that mode's `rigReviewAdditional` entry to
`null`; set `"rigReviewAdditional": null` to opt out for every mode.

Sync updates exact older OpenAI model selections in user defaults, model-cycle
entries, subagent overrides and review/council pairs. Sol 6.1 becomes Sol 6.2;
Astra 6 and 6.1 become Astra 6.2. It retains each reviewer's thinking level
and each existing partner, and doesn't replace an existing custom model list.
Restart Pi after syncing. Trusted project settings can still override user
settings through Pi's normal settings merge; explicit model selections and
saved sessions can still use older models.

Shared packages, resource wiring, theme and compaction enablement remain rig-owned.
Provider authentication, custom model definitions and credentials remain private.

## Package management

Pi package installs use Bun through `"npmCommand": ["bun"]`. The `npm:`
package prefixes identify registry sources and remain unchanged. Node.js is still
required to run Pi. After JSON sync, every full sync uses the selected Pi installation's
public package-manager API to install missing packages, including pinned versions,
and report installation failures as a failed Pi component. They then update packages
unless `--brew-no-upgrade` is selected. No-upgrade retains compatible installed
versions, but still installs missing packages and repairs npm versions that do not
match their configured constraint. Pi owns downloading, source parsing and resource
discovery; rig does not implement another package installer.

Reconciliation reads the effective private settings without rewriting them and ignores
project settings. Repository packages are restored by the preceding JSON sync;
local-only package declarations and their filters remain intact.
`PI_OFFLINE` must be disabled, and `PI_CODING_AGENT_DIR` must be unset or point to
`~/.pi/agent`, where rig deploys its configuration. A retained Pi executable must
expose the public Node/Bun package API; unsupported wrappers fail with guidance.
Preview only describes these actions. The narrow `sync-settings.mjs` command remains
JSON-only. Restart/reload Pi after sync to load the installed resources.

### OpenAI Fast and Ultrafast

Rig installs `@calesennett/pi-codex-fast@0.1.14` in place of `pi-fast`, including
for subagent-only extension loading. Sync retires the previous repo-owned package.
After syncing, restart Pi or run `/reload`; use `/codex-fast` or
`/codex-ultrafast` to toggle the corresponding tier. Interactive toggles save
the selection globally. For a one-launch override use `pi --fast` or
`pi --ultrafast`; `pi --no-fast` disables both for that launch.

Normal speed is the default in Pi, native Pi subagents, and `/review` and
`council` reviewers. The footer shows `normal`, `fast`, or `ultrafast` for
the current model; an unsupported
speed selection shows `normal`. The label describes the tier requested, not
the tier OpenAI delivered. Account access and higher usage charges still apply.
For new assistant responses that explicitly report Ultrafast, Rig corrects Pi’s
Standard-rate estimate for the models in [OpenAI’s Ultrafast pricing table](https://developers.openai.com/api/docs/pricing?latest-pricing=ultrafast).
It does not reprice past turns or direct `/review` and `council` requests. The
footer total is an API-dollar estimate, not an account bill.

Sync preserves an existing `pi-codex-fast` preference in `~/.pi/agent/settings.json`
(allowed modes: `off`, `fast`, `ultrafast`). The old `pi-fast` preference is
not read by the replacement. Do not load both speed extensions together.

### Rig skills

Package-provided prompts and skills arrive through the declared packages.
Seven rig skills live in `pi/.pi/agent/skills/` and deploy with Pi. Each belongs
to one moment in the work, and the model loads it on its own: Pi advertises the
skill's description, and the `AGENTS.md` section "Route the task to a skill"
names the same moment and defines when to wait for a user decision. Sharing
the working file does not by itself require a pause.

| Skill | Moment |
| --- | --- |
| `requirements-spec` | Before implementing a feature or an intentional change to behavior, architecture or UI. Writes the requirements and their checks to `.local/specs/`. |
| `bug-analysis` | Before fixing an existing defect. Records the causal path, evidence, proposed fix and expected behavior; a failure introduced during implementation stays in the current task. |
| `solution-design` | While deciding how to build: data model, types, boundaries, reader load, retry-safe operations, shared state, product and UI choices. |
| `refactor-and-migrate` | When restructuring code or changing an existing contract. Check compatibility through an affected consumer, not just by searching for callers. |
| `writing-code` | Before the first edit to implementation logic. Use local conventions, make decisions clear, and preserve unrelated behavior. |
| `writing-tests` | While writing, changing, or keeping a test. |
| `measurement` | Before measuring, and before reporting or acting on a number. |

All 57 imported [pstack skills](vendor/pstack/README.md) stay in `pi/disabled-skills/`, outside Pi's discovery folders. The active skills borrow individual decisions rather than reinstating whole workflows:

- `writing-code` draws on [reader load](disabled-skills/principle-minimize-reader-load/SKILL.md) and [encoding a repeated correction](disabled-skills/correct/SKILL.md). For names, branches and comments it also draws on Anthropic’s [code-simplifier](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/agents/code-simplifier.md) and Google’s [review guide](https://google.github.io/eng-practices/review/reviewer/looking-for.html), not their language-specific style or review process.
- `refactor-and-migrate` takes the real-consumer check from [blast-radius](disabled-skills/blast-radius/SKILL.md), not its report template or review agents.
- Domain modeling, tests and measurement already have active routes. Formal verification, onboarding, writing, and orchestration serve different tasks; they are not defaults for writing a function.

Full Pi sync backs up and removes the exact archived files from
`~/.pi/agent/skills/`, including older installs without ownership history. Unlisted
personal files are untouched; skill directories may remain empty. The former
`bro/SKILL.md` is also retired because its rules now live in `AGENTS.md`. The narrow
JSON command does not retire skill files. To re-enable archived skills, restore
their folders to `pi/.pi/agent/skills/`; its deployment inventory is built from
that active directory.
The empty root skills lock does not control these files. Rig has no standalone
prompt inventory. Resources from another user's home are not copied.

Cursor-specific commands, models, paths and external dependencies in the archived
skills are not ported or installed. Ponytail is no longer a default package;
its former repo declaration is removed by JSON sync.

Pi package object filters (`skills`, `extensions`, `prompts`, or `themes`) may
customize additional personal package declarations. Repo package declarations,
repo-defined agent controls and the managed theme are restored on sync; they
cannot be opted out through edits to managed settings. Keep personal instructions
and resources in separate unlisted files. To skip Pi, pass a `--components` list without `pi` on every sync;
omitting the flag selects all components again. Skipping Pi does not remove installed resources or disable already active configuration.
Application/project-local controls may still change runtime behavior; rig does not
police them.

The global `playwright` server runs exactly:

```sh
bunx @playwright/mcp@latest --isolated
```

It is available independently of session cwd. Use `/reload` or restart Pi after
configuration changes. bunx may download the package and uses Bun's cache;
`@latest` follows upstream and is not a reproducible version pin. A browser must
already be available; this sync does not install packages or browsers. The browser opens visibly so you can sign in manually. Its isolated
profile does not preserve login sessions after closing; it is **not** an OS/network
security sandbox. Do not expose untrusted pages to privileged secrets casually.

## Numbered read and guarded edit

Full Pi sync deploys `extensions/line-file-tools/index.ts` as the default `read`,
`edit` and `write` implementation. Text reads return numbered lines with inclusive
`start/end` ranges. Edits use `splices` for inserting, deleting and replacing
ranges; the harness checks private per-line hashes, so the model supplies neither
hashes nor repeated old text. Successful edits return numbered affected resulting
ranges, including deletion boundaries; writes return numbered written content.
Both await best-effort project formatting, so returned coordinates are final and
have usable edit snapshots. Use them directly without a verification read; read
for omitted content, more context, rejection or session reset. Mutation previews
are bounded to 50 KiB/2000 lines per call, without failing a completed mutation.
`write` retains stock creation/overwrite behaviour and, like `bash`, is not
protected by line checks.

Supported images go through Pi's stock image processing and return attachments;
codemode receives the stock image object or a numbered text string. This is not
full stock API compatibility: text is bounded to regular UTF-8 files up to 4 MiB
and 50 KiB of output, and old `offset/limit` or `oldText/newText` scripts need
updating. See [usage, limits and rollback](packages/line-file-tools/README.md).

The JSON-only settings sync does not install this extension. After full sync,
restart Pi in a new session; do not also load an explicit copy with `-e`.
To try it before deployment:

```sh
pi --no-extensions -e /path/to/rig/pi/.pi/agent/extensions/line-file-tools/index.ts
```

For a temporary stock-tools session, run `pi --no-extensions` (all automatic
extensions are disabled). To roll back just this extension, move its installed
directory outside `~/.pi/agent/extensions/` and restart; preserve the moved copy
without overwriting another path. Full sync restores managed files on the next run.

## Delegation tools and result delivery

The managed `extensions/subagent/config.json` sets `"toolActivation": "eager"`.
A fresh Pi session exposes `subagent` immediately, without a
`subagents_enable` round trip. This makes the tool available; it does not launch
children or change delegation authorization. The full tool declaration is present
even in sessions that never delegate, so lower total token cost is not guaranteed.

`AGENTS.md` permits separate implementation, research and prerequisite-decision
delegation, but review-only children require an explicit user request for delegated
review. The parent must not add an audit, double-check or second-opinion child on its
own, including by relabeling that review as research or a decision. The parent still
performs the verification needed for its work.

A parent must accept a prerequisite answer before implementing the part that
depends on it. Children return findings and evidence in their final report;
ordinary async completion wakes the parent without polling.

With pi-subagents 0.88.1, `contact_supervisor(reason: "progress_update")` is activity
reporting, not a message to the parent model. A child blocked on a decision uses
`reason: "need_decision"` and waits for a reply; completed work returns its final
report. The parent answers through `subagent_supervisor` within existing authority.
This uses the package's native channels, without changing its message-delivery code.

Full Pi sync deploys this configuration and `AGENTS.md`; the JSON-only
`sync-settings.mjs` command does not deploy these assets. Restart Pi after deployment
and start a fresh session. If resuming an old session whose recorded tools lack
`subagent`, run `/reload` after restarting to activate it. Explicit tool exclusions
still apply. These settings remove the activation step, not the skill read or
review work; timing and quality improvements require a separate measured comparison.

## Council tool

The main model can call `council` directly, for example:

```json
{"effort":"medium","task":"Compare the cancellation designs in pi/.pi/agent/extensions/deep-review.ts and pi/.pi/agent/extensions/council.ts. Recommend a lifecycle policy and explain tradeoffs."}
```

Effort is required and uses the **same `rigReview` pairs, optional third reviewer
and read-only Agent runner as `/review`**. See [model setup](#personal-model-setup) for the
defaults and overrides.
Both retry transient model failures from the last completed step without
repeating earlier tool calls. They use Pi's exponential backoff and honor explicit
`retry` settings. Without a configured
`retry.maxRetries`, they retry up to six times (up to 126 seconds of total
backoff with the default delays). Cancelling also interrupts backoff.

The legacy `council-astra`/`council-fable` advisor profiles are retired; full Pi sync
removes their installed files. Use `low` for quick bounded decisions, `medium` for
substantial reasoning, and `hard` for difficult/high-stakes tradeoffs. The names do
not select any built-in model or thinking level.

Supply a self-contained task: advisors do not inherit the main conversation or
skills. All advisors run in parallel, get the same task, and never see one
another's replies. Council waits for all of them and returns their answers
together, retaining successful replies if an advisor fails. The main model
combines the answers and explains important disagreements; council does not
try to reach or verify consensus.

Advisors have only read/grep/find/ls and restricted Git inspection, with no shell,
writes, extensions or recursive council/subagent calls. Cancellation (including
Escape), session navigation, shutdown/reload and manual compaction abort active
work. Nested model usage, including tool-use turns, is returned once for Pi's
session accounting even when an advisor fails. Output over 2000 lines/50KB links
to a private temporary file containing every full response.

Full Pi sync deploys `extensions/council.ts`; JSON-only `sync-settings.mjs` does
not. Reload or restart after deployment and ask Pi to use the council tool. All
preset models must be authenticated.

## Compaction overflow recovery

The managed `compaction-fallback.ts` extension handles manual `/compact` and
automatic compaction. Automatic compaction always summarizes with OpenCode Go
DeepSeek V4 Pro, whatever model the session is running on; manual `/compact`
keeps the active model. Only when DeepSeek V4 Pro is absent from the catalog or
its provider is not authenticated does automatic compaction fall back to the
active model with a warning. The extension first calls Pi's native compaction
helper with configured provider authentication. If a summary request is
rejected because its input is too large, it splits the older history into
smaller chunks and updates a rolling summary in chronological order. A chunk
that still does not fit is split again. Recent messages keep Pi's original
retention boundary.

Tool calls and their results stay together where possible. A single oversized
message/group is split as serialized text, so it does not disappear from the
summary input. Native serialization still truncates large tool results and omits
thinking, as ordinary Pi compaction does. Previous summaries, custom instructions,
split-turn context and cumulative read/modified file lists are preserved.
Intermediate summaries remain in memory; Pi saves one final checkpoint only after
all chunks succeed. Cancellation, empty summaries, output truncation, tool-call
responses and non-overflow errors do not publish a partial checkpoint.

Recovery summaries request at most 8192 output tokens and retain the selected
thinking level; reasoning-heavy models may exhaust that allowance and fail safely.
Use a lower thinking level and retry if this happens. There are at most 64 model
requests per compaction, including the initial native attempt and configured
transient retries. A single text chunk stops shrinking below roughly 1024
characters. If the previous summary/instructions alone are too large, or the
provider cannot accept a minimal request, recovery stops with a notification and
leaves history intact. It is not a guarantee against provider outages or silent
provider-side input truncation. Multiple successful chunks may cost more and lose
more detail than a single summary. Branch-navigation summaries are unchanged.

Rig's full Pi sync deploys this extension; JSON-only `sync-settings.mjs` does not.
Use `/reload` or restart Pi after deployment, then retry `/compact`. For an isolated
trial without installing it globally, start Pi with:

```sh
pi -e /path/to/rig/pi/.pi/agent/extensions/compaction-fallback.ts
```

The extension uses Pi's public model registry rather than a custom provider client.
It does not patch the installed application or edit session files. Compaction is
marked extension-provided, including when the first native attempt succeeds.
Do not combine it with another extension that replaces compaction: Pi allows a
later handler to override the result. Recognized overflow errors are handled both
as provider error responses and thrown exceptions. Unrecognized exceptions stop
safely; they are not automatically retried as smaller chunks.

## On-demand deep review

Run `/review <low|medium|hard> [message]` to launch reviewers in parallel in the
background. Effort selects two `{provider, id, thinkingLevel}` entries from
`rigReview` and any extra reviewers from `rigReviewAdditional` in `settings.json`.
Sync seeds the reviewers described in [model setup](#personal-model-setup); the
runner does not substitute fallback models.

For example, `/review hard Focus on cancellation and session switching` adds that
message to every reviewer's prompt. Without a message, no extra instructions are added.
Its shared system prompt is `~/.pi/agent/DEEP_REVIEW.md`; its extension is `deep-review.ts`.

All reviewers receive the worktree path, session transcript path, and captured
branch entry ID. They independently read the conversation and inspect relevant
source and Git changes, including committed work identified from the conversation.
The restricted Git tool supports inspection only; reviewers cannot edit files,
run arbitrary shell commands, or execute tests.

Each report covers architecture analysis, bug findings, and code quality, with an
explicit numeric rating out of 10 for each area: 10 is perfect and 0 is never ship
this. Higher bug ratings mean greater correctness and fewer or less serious bugs.
Each rating must be justified. Findings
must explain the evidence, consequences, and smallest corrective action; potential
issues are distinguished from confirmed bugs. Reports and individual failures
are delivered together under separate reviewer headings.

Only one `/review` run can be active at once. Run `/review stop` while it is
running to stop the reviewers and clear their status. Starting another review
while one is active shows an error rather than cancelling it. Session navigation,
shutdown/reload, and manual compaction also cancel pending work and prevent stale delivery. Failures are
visible with no model fallback. Reviewer usage is recorded in the parent session;
review activity and final reports are logged privately under `~/.pi/agent/logs/`.
Run `/reload` after installing the extension, then `/review medium` in a saved session.

## Explicit legacy migration

From this new worktree, explicitly name the **MAIN checkout**, not this worktree:

```sh
node /path/to/new-worktree/pi/sync-settings.mjs --migrate-from /path/to/main/rig
```

This validates recognized legacy settings/history, retains private external
snapshots and a receipt, publishes ordinary home settings, then removes only
verified legacy files. Unexpected checkout MCP copies or symlinks are not
imported: preserve them outside rig and manually reconcile the ordinary home MCP
before retrying. Normal sync refuses stale checkout settings/history and gives
migration guidance. Differing copies and unexpected links fail closed; do not
force Stow to adopt or delete them. No real migration is implied by adding these
tracked files.

After migration, **do not run old main-checkout deployment scripts** until
these changes are integrated there: old scripts can recreate private checkout
files. Use the new worktree's narrow command meanwhile.

## Lock and recovery

One exclusive `~/.local/state/rig/pi/.rig-sync.lock` covers input prevalidation,
migration, both syncs and cleanup. Settings and MCP are separate recoverable
transactions, not a two-file atomic update. A later failure can leave the first
completed; fix the reported condition and rerun the same command. Recovery
records and backups contain private data; keep them outside every checkout.
Path safety assumes HOME and its existing ancestor directories are controlled by
and writable only by the user or trusted administrators. Symlink ancestors are
rejected, and the state root/direct state directories also receive ownership and
write-permission checks; ancestor ownership/permissions are not fully audited.
Changed files and unexpected links fail closed. The lock serializes rig commands,
not arbitrary editors or Pi writes: stop other writers while syncing.

A lock is never stolen automatically. After confirming no rig sync process is
running, inspect the external state and remove only a genuinely stale lock,
then rerun. Do not discard pending journals or migration receipts to bypass an
error. Backups do not imply secure erasure of old snapshots/history.
