"""Harbor adapter for a frozen copy of the Mac's active Pi configuration.

Only the snapshot archive crosses into Docker; host histories never do.
Credentials are uploaded separately at runtime, never baked into an image.
"""
import json
import shlex
from pathlib import Path

from pydantic import Field
from harbor.agents.installed.pi import Pi, PiOptions


class ConfiguredPiOptions(PiOptions):
    snapshot_archive: str = Field(description="Absolute path to a frozen configuration tar.gz, without auth")


class ConfiguredPi(Pi):
    options_model = ConfiguredPiOptions

    async def install(self, environment):
        await super().install(environment)
        await self.ensure_system_dependencies(environment, ("unzip", "git"))
        await self.exec_as_agent(environment, command="curl -fsSL https://bun.com/install | bash -s 'bun-v1.4.4'")
        home = (await self.exec_as_agent(environment, command='printf %s "$HOME"')).stdout.strip()
        await self.exec_as_root(environment, command=(
            f"ln -s {shlex.quote(home + '/.bun/bin/bun')} /usr/local/bin/bun && "
            f"ln -s {shlex.quote(home + '/.bun/bin/bunx')} /usr/local/bin/bunx"
        ))

    async def configure(self, environment):
        if self.mcp_servers or self.config_source is not None:
            raise ValueError("Use the snapshot's native configuration, not Harbor config/MCP overrides")
        home = (await self.exec_as_agent(environment, command='printf %s "$HOME"')).stdout.strip()
        if not home.startswith("/"):
            raise RuntimeError("Cannot determine container home")
        agent_dir = home + "/.pi/agent"
        remote_archive = "/tmp/configured-pi-snapshot.tar.gz"
        await environment.upload_file(Path(self.options.snapshot_archive), remote_archive)
        await self.exec_as_root(environment, command=f"chmod 644 {remote_archive}")
        await self.exec_as_agent(environment, command=(
            f"umask 077; mkdir -p {shlex.quote(agent_dir)} && "
            f"tar -xzf {remote_archive} -C {shlex.quote(agent_dir)} && rm {remote_archive}"
        ))
        # Install Linux-native dependencies; never copy the Mac's node_modules.
        await self.exec_as_agent(environment, command=(
            f"cd {shlex.quote(agent_dir + '/npm')} && bun install --ignore-scripts"
        ))
        # The paired-review extension can use both these providers. Exclude
        # Antigravity and every unrelated host credential.
        auth = json.loads((Path.home() / ".pi/agent/auth.json").read_text())
        selected = {name: auth[name] for name in ("openai", "pi-sub-anthropic") if name in auth}
        if selected.get("openai", {}).get("type") != "oauth":
            raise RuntimeError("Expected the Mac's OpenAI OAuth login")
        await self._upload_config_text(
            environment, content=json.dumps(selected), remote_path=agent_dir + "/auth.json", filename="auth.json"
        )
        await self.exec_as_agent(environment, command=f"chmod 700 {shlex.quote(agent_dir)} && chmod 600 {shlex.quote(agent_dir + '/auth.json')}")
        # Record package/resource startup diagnostics without a model call.
        await self.exec_as_agent(environment, command=(
            f". ~/.nvm/nvm.sh; pi list > {shlex.quote(str(self.environment_logs_dir / 'configured-packages.txt'))} 2>&1"
        ))
