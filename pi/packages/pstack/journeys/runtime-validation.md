# Pi CLI runtime validation

## Result

Both fixture journeys ran successfully in fresh in-memory **Pi 1.4.0** sessions on branch `feat/pstack-adapter`, using actual model **`openai/gpt-6.1-sol`**. Authoritative `message_end` events confirm the provider/model in both transcripts; both processes exited 0, emitted `agent_settled` with `aborted:false`, and had no tool execution errors.

The verification journey correctly returned **overall INCOMPLETE**, because the separate REQUIRED Java/TLC gate remained blocked despite a passing REQUIRED packaging check. This is the expected negative-gate behavior, not a failed adapter journey.

Delegation was explicitly prohibited for these runs. Both prompts appended that restriction and requested local investigation. Both final answers disclosed that no independent child review occurred. **Native child mapping, child briefs, capabilities, model substitutions, and independent review remain untested.** This was authorized direct CLI behavioral testing, not fallback from a child launch.

## Invocation and retained evidence

Read the package README, both journey JSON fixtures, entry and adapter, and installed `docs/cli.md` and `docs/settings.md` completely before execution. Scratch evidence is retained under `.local/pstack-validation/` and is local, not a tracked transcript archive.

Common flags, with the exact absolute package path in `resumed-flags.json`:

```sh
pi --offline --no-extensions --no-mcp --no-approve --no-context-files \
  --no-prompt-templates --no-themes --no-session --tools read,bash \
  -e <absolute-package-root> --model openai/gpt-6.1-sol
```

- Command discovery used common flags plus `--mode rpc`, stdin `{"type":"get_commands"}`. Evidence: `resumed-discovery.jsonl` and `resumed-discovery.stderr`.
- Investigation used common flags plus `--mode json` and the investigation fixture with the appended no-delegation restriction. Evidence: `resumed-investigation.prompt.txt`, `resumed-investigation.jsonl`, `resumed-investigation.stderr`.
- Verification used common flags plus `--mode json` and the verification fixture with `<ABSOLUTE_PACKAGE_ROOT>` replaced, plus the no-delegation restriction. Evidence: `resumed-verification.prompt.txt`, `resumed-verification.jsonl`, `resumed-verification.stderr`.
- Both journey subprocesses were bounded to 300 seconds and completed within the bound. Raw JSONL transcripts are approximately 796 KB and 595 KB. Extracted tool events and assistant reports are in the corresponding `resumed-*.review.txt` files.

Isolation disabled discovered extensions, MCP connections, project approval/context and persistent sessions while retaining normal provider/auth access. User skills were not disabled; this was not an OS sandbox. Only read and bash were declared tools.

## Observed command discovery

The host's `get_commands` response succeeded and contained exactly one command whose source path is inside this package:

```text
skill:pstack
<absolute-package-root>/skills/pstack/SKILL.md
source=cli, scope=temporary
```

No upstream skill commands were exposed. Three unrelated user skills were also listed (`reverse-engineer-anything`, `council-mode`, `pi-subagents`); thus **the package exports only pstack**, not the entire host inventory. None of those skills or subagent tools was invoked. The investigation model itself appropriately described its own command-inventory evidence as unverified; the separate host RPC response supplies that runtime evidence.

## Investigation journey

Actual user-message events contain the host-expanded `<skill name="pstack" location=".../skills/pstack/SKILL.md">` entry text. The first tool read was `docs/harness/pi.md`, the second was `upstream/skills/poteto-mode/SKILL.md`. Both reads completed without truncation. The model then found and read `poteto-mode/playbooks/investigation.md`, followed by internal `how` and `unslop` leaves.

It read the manifest and entry, counted **58** primary upstream skill files using a read-only Python command, inspected the checker, and ran `node pi/packages/pstack/checks/check.mjs`. Its cited final answer identifies the explicit manifest skill list, not `disable-model-invocation`, as the registration boundary, and explains entry → harness → poteto-mode routing. It kept a final checklist and explicitly disclosed local-only investigation, no independent child review, and the absence of enforced sandbox guarantees.

The actual checker output was:

```text
PASS: 573 pinned files, 58 internal skills, license, single-entry manifest and two journey fixtures. Static integrity only; no behavioral proof.
```

## Verification journey

The host again expanded the entry, then the first two actual tool reads were the Pi harness and upstream poteto-mode, in that order and without truncation. The model read the Investigation playbook, `how`, `unslop`, `principle-prove-it-works`, and the checker source. It then actually executed:

```sh
node <absolute-package-root>/checks/check.mjs; result=$?; git status --porcelain; exit "$result"
```

The tool result reported exit code 0 and the same PASS output above. Final gates remained separate:

| Gate | Actual final verdict |
| --- | --- |
| REQUIRED packaging | Passed, explicitly static integrity rather than live formal behavior. |
| REQUIRED live Java/TLC | Blocked under the journey's unavailable-tooling assumption. No deferred tooling, installs or network formal run attempted. |
| Optional Cursor bot UI | Skipped because it was not needed for the requested gates. |
| Overall acceptance | Incomplete. Requires a separately authorized environment/run with Java/TLC already available. |

The final answer explicitly recorded no edits, installation, settings persistence, commit/PR action, or child review. Actual tool events support this bounded behavior; no deferred upstream scripts ran.

## Mutation checks and limits

`resumed-status-before.txt` and `resumed-status-after.txt` were byte-identical, as were `resumed-diff-before.txt` and `resumed-diff-after.txt`, before updating this evidence document. Existing status entries remained `M pi/.stow-local-ignore`, `M pi/README.md`, and `?? pi/packages/`. No staged paths. Earlier attempt snapshots also matched. No implementation edits, settings changes, installs, commits, merges or pushes were performed by the validator. Git status/diff do not prove absence of all filesystem writes, particularly inside already-untracked directories; this evidence is not a sandbox guarantee.

These runs cover local routing, package-specific command exposure, actual offline packaging execution, required-negative-gate preservation, and optional skip behavior. They do not prove formal correctness, model-family diversity, native child mapping, or every upstream workflow.

## Prior failed setup attempts, resolved

Prior logs remain preserved rather than overwritten:

1. Unisolated `pi --offline --list-models` listed `antigravity/claude-sonnet-5-5`, but isolated RPC discovery and investigation startup rejected that model. See `models.txt`, `flags.json`, `discovery.stderr`, and `investigation.stderr`. Neither attempt executed model/tool work.
2. Same-resource-flags discovery succeeded and listed OpenAI including `gpt-6.1-sol` in `recovery-models.txt`.
3. `pi --offline auth check --provider openai --model gpt-6.1-sol --json --no-refresh` failed with `Unknown options: --json, --no-refresh` (recorded in `recovery-auth.stderr`). **This was parser routing caused by the leading `--offline`, not an authentication failure.** The parent resolved it using `pi auth check --provider openai --model gpt-6.1-sol --json --no-refresh`, obtaining ready/OpenAI/OAuth without exposing credentials, and authorized continuation. No additional credential check was performed by this validator.

The successful runs above supersede the earlier blocked status. No settings or alternate runner were needed.
