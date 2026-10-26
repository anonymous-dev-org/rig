#!/usr/bin/env python3
"""Static only; requires Python 3.11+ (tomllib), never invokes AeroSpace."""
from pathlib import Path
import tomllib

root = Path(__file__).resolve().parents[1]
config = tomllib.loads((root / '.aerospace.toml').read_text())
keys = [f'alt-{n}' for n in range(1, 10)]
keys += [f'{prefix}{key}' for prefix in
         ('cmd-alt-', 'cmd-alt-shift-', 'alt-', 'alt-shift-') for key in 'hjkl']
main = config['mode']['main']['binding']
for mode, spec in config['mode'].items():
    for key in keys:
        assert spec['binding'].get(key) == main[key], (mode, key)
for group in range(1, 10):
    assert main[f'alt-{group}'].endswith(f'/switch-group.sh {group}')
for key, direction in zip('hjkl', 'wsne'):
    assert main[f'cmd-alt-{key}'].endswith(f'/switch-workspace.sh {direction}')
    assert main[f'cmd-alt-shift-{key}'].endswith(f'/move-to-workspace.sh {direction}')
assert config['persistent-workspaces'] == ['n', 'e', 's', 'w']
assert config['after-startup-command'] == []
assert 'workspace-to-monitor-force-assignment' not in config
# No per-app callback can bypass the foundational routing contract.
assert not config.get('on-window-detected')
assert not config.get('on-mode-changed')
assert 'if.app-id' not in (root / '.aerospace.toml').read_text()
print('binding contract: all 25 foundational shortcuts match in every mode; no app exceptions')
