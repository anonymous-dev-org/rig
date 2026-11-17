"""Harbor adapter for a frozen copy of the Mac's active Pi configuration.

Only the snapshot archive crosses into Docker; host histories never do.
Credentials are uploaded separately at runtime, never baked into an image.
"""
import hashlib
import json
import shlex
import tarfile
from pathlib import Path

from pydantic import Field
from harbor.agents.installed.pi import Pi, PiOptions
from harbor.agents.installed.codex import Codex


class ConfiguredPiOptions(PiOptions):
    snapshot_archive: str = Field(description="Absolute path to a frozen configuration tar.gz, without auth")


async def install_helpers(agent, environment):
    # Match Codex's helper packages across arms, including the configured Pi's
    # Bun dependency. These tools are available even to the bare-Pi arm.
    # Apply the same container-local network workaround to all three arms.
    # IPv4-only apt with bounded retries succeeded where default apt stalled.
    await agent.exec_as_root(environment, command=(
        "printf '%s\\n' 'Acquire::ForceIPv4 \"true\";' 'Acquire::Retries \"1\";' "
        "'Acquire::http::Timeout \"15\";' 'APT::Install-Recommends \"false\";' "
        "'APT::Update::Error-Mode \"any\";' > /etc/apt/apt.conf.d/99-benchmark-network"
    ))
    await agent.ensure_system_dependencies(environment, ("curl", "bash", "nodejs", "npm", "ripgrep", "git", "unzip"))
    await agent.exec_as_agent(environment, command="curl -fsSL https://bun.com/install | bash -s 'bun-v1.4.4'")
    home = (await agent.exec_as_agent(environment, command='printf %s "$HOME"')).stdout.strip()
    await agent.exec_as_root(environment, command=(
        f"ln -sf {shlex.quote(home + '/.bun/bin/bun')} /usr/local/bin/bun && "
        f"ln -sf {shlex.quote(home + '/.bun/bin/bunx')} /usr/local/bin/bunx"
    ))


async def upload_auth(agent, environment, agent_dir, providers):
    auth = json.loads((Path.home() / ".pi/agent/auth.json").read_text())
    selected = {name: auth[name] for name in providers if name in auth}
    if selected.get("openai", {}).get("type") != "oauth":
        raise RuntimeError("Expected the Mac's OpenAI OAuth login")
    await agent._upload_config_text(
        environment, content=json.dumps(selected), remote_path=agent_dir + "/auth.json", filename="auth.json"
    )
    await agent.exec_as_agent(environment, command=f"chmod 700 {shlex.quote(agent_dir)} && chmod 600 {shlex.quote(agent_dir + '/auth.json')}")


class BarePi(Pi):
    options_model = ConfiguredPiOptions

    async def install(self, environment):
        await install_helpers(self, environment)
        await super().install(environment)

    async def configure(self, environment):
        home = (await self.exec_as_agent(environment, command='printf %s "$HOME"')).stdout.strip()
        agent_dir = home + "/.pi/agent"
        await self.exec_as_agent(environment, command=f"umask 077; mkdir -p {shlex.quote(agent_dir)}")
        await upload_auth(self, environment, agent_dir, ("openai",))
        # This is a provider catalog, not settings, extensions or instructions.
        # Freeze it identically to configured Pi so model metadata cannot drift.
        with tarfile.open(self.options.snapshot_archive, 'r:gz') as archive:
            try:
                catalog = archive.extractfile('models-store.json')
            except KeyError:
                catalog = None
            if catalog is not None:
                await self._upload_config_text(environment, content=catalog.read().decode(), remote_path=agent_dir + '/models-store.json', filename='models-store.json')
        await self.exec_as_agent(environment, command=(
            f". ~/.nvm/nvm.sh; pi list > {shlex.quote(str(self.environment_logs_dir / 'configured-packages.txt'))} 2>&1"
        ))


class ConfiguredPi(BarePi):
    options_model = ConfiguredPiOptions

    async def configure(self, environment):
        if self.mcp_servers or self.config_source is not None:
            raise ValueError("Use the snapshot's native configuration, not Harbor config/MCP overrides")
        home = (await self.exec_as_agent(environment, command='printf %s "$HOME"')).stdout.strip()
        if not home.startswith("/"):
            raise RuntimeError("Cannot determine container home")
        agent_dir = home + "/.pi/agent"
        remote_archive = "/tmp/configured-pi-snapshot.tar.gz"
        archive = Path(self.options.snapshot_archive)
        await environment.upload_file(archive, remote_archive)
        await self.exec_as_root(environment, command=f"chmod 644 {remote_archive}")
        await self.exec_as_agent(environment, command=(
            f"umask 077; mkdir -p {shlex.quote(agent_dir)} && "
            f"tar -xzf {remote_archive} -C {shlex.quote(agent_dir)} && rm {remote_archive}"
        ))
        # Use the host's complete lockfile when provided; only configured
        # settings decide which installed packages actually load.
        await self.exec_as_agent(environment, command=(
            f"cd {shlex.quote(agent_dir + '/npm')} && "
            "if [ -f bun.lock ]; then bun install --frozen-lockfile --ignore-scripts; "
            "else bun install --ignore-scripts; fi"
        ))
        await upload_auth(self, environment, agent_dir, ("openai", "pi-sub-anthropic"))
        # Preserve auxiliary usage/review evidence before Docker cleanup.
        for name in ("logs", "sessions"):
            target = str(self.environment_logs_dir / "pi" / ("auxiliary-" + name))
            await self.exec_as_agent(environment, command=(
                f"mkdir -p {shlex.quote(target)} && ln -s {shlex.quote(target)} {shlex.quote(agent_dir + '/' + name)}"
            ))
        await self._upload_config_text(
            environment, content=json.dumps({"archive_sha256": hashlib.sha256(archive.read_bytes()).hexdigest()}),
            remote_path=str(self.environment_logs_dir / "snapshot-proof.json"), filename="snapshot-proof.json"
        )
        await self.exec_as_agent(environment, command=(
            f". ~/.nvm/nvm.sh; pi list > {shlex.quote(str(self.environment_logs_dir / 'configured-packages.txt'))} 2>&1"
        ))


class BenchmarkCodex(Codex):
    async def install(self, environment):
        await install_helpers(self, environment)
        await super().install(environment)
