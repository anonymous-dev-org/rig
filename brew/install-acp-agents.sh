#!/usr/bin/env bash
# Install ACP registry clients: claude-acp, codex-acp, cursor.
# Matches https://agentclientprotocol.com/registry (same artifacts Zed uses).
# CLIs codex / claude-code / cursor-agent come from Homebrew (Brewfile).
set -euo pipefail

CACHE_ROOT="${XDG_DATA_HOME:-$HOME/.local/share}/rig/acp-agents"
BIN_DIR="${HOME}/.local/bin"
REGISTRY_URL="https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json"
REGISTRY_JSON="${CACHE_ROOT}/registry.json"
AGENT_IDS=(claude-acp codex-acp cursor)

platform_key() {
  local os arch
  os=$(uname -s)
  arch=$(uname -m)
  case "$os" in
    Darwin)
      case "$arch" in
        arm64) echo "darwin-aarch64" ;;
        x86_64) echo "darwin-x86_64" ;;
        *) echo "unsupported platform: $os $arch" >&2; return 1 ;;
      esac
      ;;
    Linux)
      case "$arch" in
        aarch64 | arm64) echo "linux-aarch64" ;;
        x86_64) echo "linux-x86_64" ;;
        *) echo "unsupported platform: $os $arch" >&2; return 1 ;;
      esac
      ;;
    *)
      echo "unsupported OS: $os" >&2
      return 1
      ;;
  esac
}

need_cmd() {
  command -v "$1" &>/dev/null || {
    echo "install-acp-agents: missing required command: $1" >&2
    exit 1
  }
}

fetch_registry() {
  mkdir -p "$CACHE_ROOT"
  if [[ -f "$REGISTRY_JSON" ]]; then
    local age
    age=$(( $(date +%s) - $(stat -f %m "$REGISTRY_JSON" 2>/dev/null || stat -c %Y "$REGISTRY_JSON") ))
    if (( age < 86400 )); then
      return 0
    fi
  fi
  echo "  Fetching ACP registry index..."
  curl -fsSL "$REGISTRY_URL" -o "$REGISTRY_JSON"
}

link_bin() {
  local name="$1"
  local target="$2"
  mkdir -p "$BIN_DIR"
  ln -sf "$target" "${BIN_DIR}/${name}"
}

install_binary_agent() {
  local agent_id="$1"
  local platform="$2"
  local dest="${CACHE_ROOT}/${agent_id}"
  local stamp="${dest}/.installed"

  if [[ -f "$stamp" ]]; then
    echo "  ✓ ${agent_id} (cached)"
    link_bin "$agent_id" "${dest}/run"
    return 0
  fi

  python3 - "$agent_id" "$platform" "$REGISTRY_JSON" "$dest" <<'PY'
import json, sys, urllib.request, tarfile, zipfile, shutil
from pathlib import Path

agent_id, platform, registry_path, dest = sys.argv[1:5]
dest = Path(dest)
dest.mkdir(parents=True, exist_ok=True)

with open(registry_path) as f:
    agents = json.load(f)["agents"]

agent = next((a for a in agents if a["id"] == agent_id), None)
if not agent:
    raise SystemExit(f"agent {agent_id} not in registry")

dist = agent.get("distribution", {})
binary = dist.get("binary", {}).get(platform)
if not binary:
    raise SystemExit(f"no binary distribution for {agent_id} on {platform}")

archive_url = binary["archive"]
cmd = binary.get("cmd", "./agent")
args = binary.get("args", [])

archive_name = archive_url.rsplit("/", 1)[-1]
archive_path = dest / archive_name

if not archive_path.exists():
    print(f"  Downloading {agent_id}...")
    req = urllib.request.Request(
        archive_url,
        headers={"User-Agent": "rig-install-acp-agents/1.0"},
    )
    with urllib.request.urlopen(req) as resp, open(archive_path, "wb") as out:
        shutil.copyfileobj(resp, out)

extract_root = dest / "extract"
if extract_root.exists():
    shutil.rmtree(extract_root)
extract_root.mkdir()

if archive_name.endswith(".zip"):
    with zipfile.ZipFile(archive_path) as zf:
        zf.extractall(extract_root)
else:
    with tarfile.open(archive_path) as tf:
        tf.extractall(extract_root)

cmd_path = extract_root / cmd.lstrip("./")
if not cmd_path.exists():
    matches = list(extract_root.rglob(Path(cmd).name))
    if not matches:
        raise SystemExit(f"binary {cmd} not found after extracting {agent_id}")
    cmd_path = matches[0]

launcher = dest / "run"
launcher.write_text(
    "#!/usr/bin/env bash\n"
    f'exec "{cmd_path}" {" ".join(args)}\n'
)
launcher.chmod(0o755)
(dest / ".installed").write_text(f"{cmd_path}\n")
PY

  link_bin "$agent_id" "${dest}/run"
  echo "  ✓ ${agent_id} (binary)"
}

install_npx_agent() {
  local agent_id="$1"
  local dest="${CACHE_ROOT}/${agent_id}"
  local stamp="${dest}/.installed"
  local launcher="${dest}/run"

  if [[ -f "$stamp" && -x "$launcher" ]]; then
    echo "  ✓ ${agent_id} (cached)"
    link_bin "$agent_id" "$launcher"
    return 0
  fi

  local package
  package=$(python3 - "$agent_id" "$REGISTRY_JSON" <<'PY'
import json, sys
with open(sys.argv[2]) as f:
    agents = json.load(f)["agents"]
agent = next(a for a in agents if a["id"] == sys.argv[1])
print(agent["distribution"]["npx"]["package"])
PY
)

  need_cmd npx
  echo "  Installing ${agent_id} (${package})..."
  mkdir -p "$dest"
  # Prefetch via npx without running the package bin — ACP servers (e.g. claude-agent-acp)
  # ignore --version/--help and block on stdin indefinitely.
  npx -y --package="$package" -- node -e "process.exit(0)" >/dev/null

  cat >"$launcher" <<EOF
#!/usr/bin/env bash
exec npx -y "$package" "\$@"
EOF
  chmod +x "$launcher"
  date +%s >"$stamp"
  link_bin "$agent_id" "$launcher"
  echo "  ✓ ${agent_id} (npx)"
}

main() {
  echo "=== ACP clients (claude-acp, codex-acp, cursor) ==="

  need_cmd curl
  need_cmd python3

  local platform
  platform=$(platform_key)

  fetch_registry

  for agent_id in "${AGENT_IDS[@]}"; do
    if python3 - "$agent_id" "$REGISTRY_JSON" <<'PY'
import json, sys
with open(sys.argv[2]) as f:
    agents = json.load(f)["agents"]
agent = next(a for a in agents if a["id"] == sys.argv[1])
dist = agent.get("distribution", {})
sys.exit(0 if "binary" in dist else 1)
PY
    then
      install_binary_agent "$agent_id" "$platform"
    else
      install_npx_agent "$agent_id"
    fi
  done

  # Cursor registry agent is "cursor"; expose a familiar name for tools expecting cursor-acp.
  if [[ -x "${CACHE_ROOT}/cursor/run" ]]; then
    link_bin "cursor-acp" "${CACHE_ROOT}/cursor/run"
  fi

  echo ""
  echo "ACP adapters on PATH (~/.local/bin): claude-acp, codex-acp, cursor-acp"
  echo "Terminal CLIs from brew: claude, codex, cursor-agent"
  echo "Authenticate once:"
  echo "  • claude / Claude ACP: claude auth login (or /login in an ACP session)"
  echo "  • codex / Codex ACP: codex login"
  echo "  • cursor: cursor-agent login  (or agent login if aliased)"
}

main "$@"
