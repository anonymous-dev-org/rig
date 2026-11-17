#!/usr/bin/env python3
"""Summarize Harbor trial results without reading agent logs or credentials."""
import argparse
import json
import re
import statistics
from datetime import datetime
from pathlib import Path

ARMS = ('configured', 'bare', 'codex')
FIELDS = ('reward', 'agent_seconds', 'setup_seconds', 'total_seconds',
          'input_tokens', 'cache_tokens', 'output_tokens', 'estimated_usd')
NOTES = [
    'USD values are Harbor token-cost estimates, not actual billing; no external price table is assumed.',
    'Harbor main-agent totals may omit auxiliary reviewer/subagent usage; audit auxiliary logs separately before treating these as full configured-arm costs.',
    'Input tokens include cached input; cache tokens are a subset, not additional input.',
    'Setup seconds = environment setup + agent setup. Durations are seconds; totals include verification and other overhead.',
    'Pass means reward == 1, reward_valid is not false, and no exception. All trial results (including retries) are retained; duplicates are flagged.',
    'Unavailable values are null / N/A, never silently zero. Sums and medians use available values only; available counts show coverage.',
]


def load(path, warnings):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        warnings.append(f'Cannot read JSON: {path}')
        return {}


def duration(data):
    try:
        return (datetime.fromisoformat(data['finished_at'].replace('Z', '+00:00')) -
                datetime.fromisoformat(data['started_at'].replace('Z', '+00:00'))).total_seconds()
    except (KeyError, TypeError, ValueError):
        return None


def arm_for(path, data):
    # Directory names take priority, especially for bare Pi (agent name is just pi).
    for part in reversed(path.parts[:-1]):
        for arm in ARMS:
            if re.match(rf'^{arm}(?:$|[-_])', part.lower()):
                return arm
    agent = (data.get('config') or {}).get('agent') or {}
    name = str(agent.get('name') or agent.get('import_path') or '').lower()
    if 'configured' in name:
        return 'configured'
    if 'codex' in name:
        return 'codex'
    if name == 'pi':
        return 'bare'
    return None


def test_counts(directory, warnings):
    ctrf = directory / 'verifier' / 'ctrf.json'
    if ctrf.exists():
        summary = load(ctrf, warnings).get('results', {}).get('summary', {})
        return {key: summary[key] for key in ('tests', 'passed', 'failed', 'skipped', 'pending', 'other') if key in summary} or None
    stdout = directory / 'verifier' / 'test-stdout.txt'
    if stdout.exists():
        try:
            text = stdout.read_text(errors='replace')
            # Only parse a pytest-style final summary, not individual progress lines.
            lines = [line for line in text.splitlines() if re.search(r'\d+ (?:passed|failed|skipped|errors?)', line) and ' in ' in line]
            if lines:
                return {key: int(value) for value, key in re.findall(r'(\d+) (passed|failed|skipped|errors?|xfailed|xpassed)', lines[-1])}
        except OSError:
            warnings.append(f'Cannot read verifier summary: {stdout}')
    return None


def trial(path, data, arm, warnings):
    contexts = [data['agent_result']] if data.get('agent_result') is not None else [s['agent_result'] for s in data.get('step_results') or [] if s.get('agent_result') is not None]
    row = dict(arm=arm, task=data['task_name'], trial=data.get('trial_name', path.parent.name),
               result_path=str(path).replace(str(Path.home()), '$HOME', 1), reward=(data.get('verifier_result') or {}).get('rewards', {}).get('reward'),
               exception=(data.get('exception_info') or {}).get('exception_type'),
               agent_seconds=duration(data.get('agent_execution') or {}), total_seconds=duration(data),
                tests=test_counts(path.parent, warnings),
                task_id=data.get('task_id'), agent_info=data.get('agent_info'),
                reasoning_effort=((data.get('config') or {}).get('agent') or {}).get('kwargs', {}).get('reasoning_effort'))
    setup = [duration(data.get(key) or {}) for key in ('environment_setup', 'agent_setup')]
    row['setup_seconds'] = sum(setup) if all(v is not None for v in setup) else None
    for key, source in [('input_tokens', 'n_input_tokens'), ('cache_tokens', 'n_cache_tokens'), ('output_tokens', 'n_output_tokens'), ('estimated_usd', 'cost_usd')]:
        values = [c.get(source) for c in contexts]
        row[key] = sum(values) if values and all(v is not None for v in values) else None
    row['passed'] = row['reward'] == 1 and data.get('reward_valid') is not False and not data.get('exception_info')
    return row


def summarize(root):
    warnings, rows = [], []
    for path in sorted(root.rglob('result.json')):
        data = load(path, warnings)
        if not data.get('task_name'):
            continue  # Job result aggregates would double-count trial usage.
        arm = arm_for(path, data)
        if arm is None:
            warnings.append(f'Unrecognized arm: {path}')
            continue
        rows.append(trial(path, data, arm, warnings))
    arms = {}
    manifest_path = root / 'manifest.json'
    manifest = load(manifest_path, warnings) if manifest_path.exists() else {}
    expected_tasks = set(manifest.get('tasks', []))
    expected = len(expected_tasks) if expected_tasks else 5
    for arm in ARMS:
        group = [r for r in rows if r['arm'] == arm]
        tasks = {r['task'] for r in group}
        if len(group) != expected or len(tasks) != expected:
            warnings.append(f'{arm}: expected {expected} distinct task results; found {len(group)} results, {len(tasks)} distinct tasks; missing at least {max(0, expected-len(tasks))}.')
        if expected_tasks and tasks != expected_tasks:
            warnings.append(f'{arm}: task mismatch; missing {sorted(expected_tasks - tasks)}, unexpected {sorted(tasks - expected_tasks)}.')
        if len(group) != len(tasks):
            warnings.append(f'{arm}: duplicate tasks / retries present; aggregates include all trials.')
        arms[arm] = dict(expected=expected, results=len(group), distinct_tasks=len(tasks), missing=max(0, expected-len(tasks)), passes=sum(r['passed'] for r in group), exceptions=sum(r['exception'] is not None for r in group), metrics={})
        job_path = root / 'jobs' / arm / 'result.json'
        arms[arm]['job_wall_seconds'] = duration(load(job_path, warnings)) if job_path.exists() else None
        arms[arm]['verifier_tests'] = {key: sum((r['tests'] or {}).get(key, 0) for r in group) for key in ('tests', 'passed', 'failed')}
        for field in FIELDS:
            values = [r[field] for r in group if r[field] is not None]
            arms[arm]['metrics'][field] = dict(available=len(values), sum=sum(values) if values else None, median=statistics.median(values) if values else None)
    if len(rows) != expected * len(ARMS):
        warnings.append(f'Expected {expected * len(ARMS)} trial results overall; found {len(rows)}.')
    return dict(expected_results=expected * len(ARMS), observed_results=len(rows), warnings=warnings, limitations=NOTES,
                configuration_sha256=manifest.get('archive_sha256'), tasks=manifest.get('tasks'), arms=arms, trials=rows)


def cell(value):
    if value is None:
        return 'N/A'
    if isinstance(value, float):
        return f'{value:.6f}'.rstrip('0').rstrip('.')
    return str(value).replace('|', '\\|').replace('\n', ' ')


def markdown(report):
    lines = ['# Harbor comparison', '', '## Warnings', '']
    lines += ['- ' + w for w in report['warnings']] or ['None.']
    lines += ['', '## Definitions and limitations', ''] + ['- ' + n for n in NOTES]
    columns = ['arm', 'task', 'reward', 'exception', 'agent_seconds', 'setup_seconds', 'total_seconds', 'input_tokens', 'cache_tokens', 'output_tokens', 'estimated_usd', 'tests']
    lines += ['', '## Trials', '', '| ' + ' | '.join(columns) + ' |', '| ' + ' | '.join(['---'] * len(columns)) + ' |']
    for row in report['trials']:
        lines.append('| ' + ' | '.join(cell(row[k]) for k in columns) + ' |')
    for arm, data in report['arms'].items():
        lines += ['', f'## {arm}', '', f"Results: {data['results']}/{data['expected']}; distinct tasks: {data['distinct_tasks']}; missing: {data['missing']}; passes: {data['passes']}; exceptions: {data['exceptions']}.", '', '| Metric | Available | Sum | Median |', '| --- | --- | --- | --- |']
        for field, metric in data['metrics'].items():
            lines.append('| ' + ' | '.join(cell(v) for v in [field, metric['available'], metric['sum'], metric['median']]) + ' |')
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path, help='Run root containing Harbor job directories')
    args = parser.parse_args()
    root = args.root.expanduser().resolve()
    if not root.is_dir():
        parser.error('root must be an existing directory')
    report = summarize(root)
    (root / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
    (root / 'summary.md').write_text(markdown(report))
    print(f"Wrote {root / 'summary.json'} and {root / 'summary.md'} ({len(report['warnings'])} warnings)")


if __name__ == '__main__':
    main()
