#!/usr/bin/env python3
"""Freeze the active Mac Pi configuration, without credentials or histories."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tarfile
from datetime import datetime
from pathlib import Path

TASKS = ['log-summary-date-ranges', 'multi-source-data-merger', 'cancel-async-tasks', 'sqlite-db-truncate', 'nginx-request-logging']
RESOURCES = ['AGENTS.md', 'AGENTS.override.md', 'AGENTS.MD', 'CLAUDE.md', 'CLAUDE.MD', 'WATCHDOG.md', 'SYSTEM.md', 'APPEND_SYSTEM.md', 'settings.json', 'models-store.json', 'models.json', 'mcp.json', 'extensions', 'skills', 'agents', 'prompts', 'themes']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(root, source):
    root.mkdir(mode=0o700, parents=True, exist_ok=False)
    snapshot = root / 'snapshot'
    snapshot.mkdir(mode=0o700)
    before = {}
    for name in RESOURCES:
        path = source / name
        if path.is_dir():
            shutil.copytree(path, snapshot / name)
            before.update({str(p.relative_to(source)): digest(p) for p in path.rglob('*') if p.is_file()})
        elif path.is_file():
            before[name] = digest(path)
            shutil.copy2(path, snapshot / name)
    settings = json.loads((snapshot / 'settings.json').read_text())
    settings.pop('deviceId', None)
    packages = {}
    for index, entry in enumerate(settings.get('packages', [])):
        spec = entry if isinstance(entry, str) else entry['source']
        if not spec.startswith('npm:'):
            raise ValueError(f'Unsupported package source; inspect portability first: {spec}')
        name = re.sub(r'@[^/@]+$', '', spec[4:])
        version = json.loads((source / 'npm/node_modules' / name / 'package.json').read_text())['version']
        packages[name] = version
        pinned = f'npm:{name}@{version}'
        if isinstance(entry, str):
            settings['packages'][index] = pinned
        else:
            entry['source'] = pinned
    (snapshot / 'settings.json').write_text(json.dumps(settings, indent=2) + '\n')
    npm = snapshot / 'npm'
    npm.mkdir()
    # Preserve the existing dependency lock, including installed-but-inactive
    # packages. Pi loads only the four packages declared in settings.
    for name in ['package.json', 'bun.lock']:
        path = source / 'npm' / name
        if not path.is_file():
            raise ValueError(f'Missing dependency lock input: {path}')
        before['npm/' + name] = digest(path)
        shutil.copy2(path, npm / name)
    if any(digest(source / name) != value for name, value in before.items()):
        raise RuntimeError('Active config changed during capture; discard this run directory and capture again')
    for name, value in before.items():
        if name != 'settings.json' and digest(snapshot / name) != value:
            raise RuntimeError(f'Snapshot copy mismatch: {name}')
    archive = root / 'snapshot.tar.gz'
    with tarfile.open(archive, 'w:gz', dereference=True) as output:
        for path in sorted(snapshot.iterdir()):
            output.add(path, arcname=path.name)
    manifest = {
        'created_at': datetime.now().astimezone().isoformat(),
        'pi_version': subprocess.check_output(['pi', '--version'], text=True).strip(),
        'codex_version': subprocess.check_output(['codex', '--version'], text=True).strip(),
        'bun_version': subprocess.check_output(['bun', '--version'], text=True).strip(),
        'provider': 'openai', 'model': 'gpt-6.1-sol', 'thinking': 'low',
        'tasks': TASKS, 'packages': packages, 'archive_sha256': digest(archive),
        'source_sha256': before,
        'snapshot_sha256': {str(p.relative_to(snapshot)): digest(p) for p in snapshot.rglob('*') if p.is_file()},
        'notes': ['Fresh active global config; only deviceId removed and configured npm sources pinned to installed versions.',
                  'Full host Bun lockfile preserved; Linux-native dependencies installed, not copied.',
                  'Credentials injected separately at trial setup; no sessions, histories, logs, or credential files captured.'],
    }
    (root / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(root)
    return root


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path.home() / '.local/share/terminal-bench' / ('comparison-' + datetime.now().strftime('%Y%m%d-%H%M%S')))
    parser.add_argument('--source', type=Path, default=Path.home() / '.pi/agent')
    args = parser.parse_args()
    prepare(args.output.expanduser().resolve(), args.source.expanduser().resolve())
