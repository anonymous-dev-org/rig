#!/usr/bin/env python3
"""Export per-call usage and per-trial raw metrics; do not grade solution quality."""
import argparse
import collections
import csv
import hashlib
import json
import re
from pathlib import Path

from summarize import arm_for, load, trial

COUNTERS = ('fresh_input', 'cached_input', 'cache_write', 'output', 'total_tokens')


def records(path, warnings):
    try:
        for number, line in enumerate(path.read_text().splitlines(), 1):
            if line.strip():
                try:
                    yield number, json.loads(line)
                except ValueError:
                    warnings.append(f'Malformed JSON: {path.name}:{number}')
    except OSError as error:
        warnings.append(f'Cannot read {path.name}: {error}')


def pi_ledger(directory, warnings):
    agent = directory / 'agent'
    roots = list((agent / 'pi/sessions').glob('*.jsonl'))
    paths = roots + sorted(set((agent / 'pi').rglob('*.jsonl')) - set(roots))
    ledger, seen_entries, seen_responses, review_copies = [], set(), set(), collections.Counter()
    review_logs = []

    def add(usage, scope, kind, source, identity, turns=1, **extra):
        if not isinstance(usage, dict):
            warnings.append(f'Missing usage: {source}')
            return
        values = {key: usage.get(field) for key, field in zip(COUNTERS, ('input', 'cacheRead', 'cacheWrite', 'output', 'totalTokens'))}
        if any(value is None for value in values.values()):
            warnings.append(f'Incomplete usage: {source}')
        ledger.append(dict(scope=scope, kind=kind, source=source, identity=identity,
                           turns=turns, **values, **extra))

    file_hashes = set()
    for path in paths:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in file_hashes:
            continue
        file_hashes.add(digest)
        events = list(records(path, warnings))
        if not any(event.get('type') == 'session' for _, event in events):
            if path.name in ('deep-review.jsonl', 'paired-review.jsonl'):
                review_logs.append((path, events))
            continue  # Status/event streams duplicate native sessions; not extra calls.
        scope = 'main' if path in roots else 'subagent'
        for number, event in events:
            source = f'{path.relative_to(directory)}:{number}'
            entry = event.get('id')
            entry_key = (entry, hashlib.sha256(json.dumps(event, sort_keys=True).encode()).hexdigest())
            if entry and entry_key in seen_entries:
                continue  # Includes inherited prefixes of forked sessions.
            if entry:
                seen_entries.add(entry_key)
            kind = event.get('type')
            if kind == 'message' and event.get('message', {}).get('role') == 'assistant':
                message = event['message']
                response = message.get('responseId')
                if response and response in seen_responses:
                    continue
                if response:
                    seen_responses.add(response)
                usage = message.get('usage')
                failed = message.get('stopReason') in ('error', 'aborted') and not (usage or {}).get('totalTokens')
                if failed:
                    warnings.append(f'Provider request failed without reported token usage: {source}')
                add(usage, scope, 'assistant_request_error' if failed else 'assistant', source,
                    response or entry, turns=0 if failed else 1,
                    model=f"{message.get('provider')}/{message.get('model')}")
                for content in message.get('content', []):
                    if content.get('type') != 'toolCall':
                        continue
                    name, arguments = content.get('name'), content.get('arguments', {})
                    helper = name in ('web_search', 'source_check')
                    helper |= name == 'fetch_content' and (arguments.get('mode') == 'answer' or bool(arguments.get('model')))
                    helper |= name == 'codemode' and bool(re.search(r'\b(web_search|source_check)\b', json.dumps(arguments)))
                    if helper:
                        warnings.append(f'Tool-side model usage may be unmetered ({name}): {source}')
            elif kind in ('compaction', 'branch_summary') and event.get('usage'):
                add(event['usage'], scope, kind, source, entry, turns=0)
            elif kind == 'usage':
                if event.get('kind') != 'rig-deep-review':
                    warnings.append(f'Unclassified standalone usage: {source} ({event.get("kind")})')
                    continue
                model = f"{event.get('provider')}/{event.get('model')}"
                note = event.get('note', '')
                run = note.removeprefix('Review ')
                signature = (run, model, json.dumps(event.get('usage'), sort_keys=True))
                review_copies[signature] += 1
                add(event.get('usage'), 'subagent', 'review', source, entry, model=model)

    for path, events in review_logs:
        for number, event in events:
            if event.get('event') not in ('review_usage', 'review_usage_unattributed'):
                continue
            signature = (event.get('runId'), event.get('model'), json.dumps(event.get('usage'), sort_keys=True))
            if review_copies[signature]:
                review_copies[signature] -= 1
                continue  # Same provider call already recorded as standalone usage.
            add(event.get('usage'), 'subagent', 'review-log-only',
                f'{path.relative_to(directory)}:{number}', None, model=event.get('model'))

    # Detect children with aggregate status but missing canonical sessions.
    for path in (agent / 'pi/subagents-temp').rglob('status.json'):
        text = path.read_text()
        if '"usage"' in text and not any(x['scope'] == 'subagent' for x in ledger):
            warnings.append('Subagent status has usage but no canonical child calls; totals may be incomplete.')
            break
    if not roots:
        warnings.append('No native main Pi session retained.')
    return ledger


def codex_ledger(directory, warnings):
    path = directory / 'agent/trajectory.json'
    if not path.exists():
        warnings.append('No Codex trajectory retained.')
        return []
    trajectory = load(path, warnings)
    ledger = []
    for step in trajectory.get('steps', []):
        if step.get('source') != 'agent' or not step.get('metrics'):
            continue
        metrics = step['metrics']
        prompt, cached, output = (metrics.get(key) for key in ('prompt_tokens', 'cached_tokens', 'completion_tokens'))
        if any(value is None for value in (prompt, cached, output)):
            warnings.append('Incomplete Codex per-response usage.')
            continue
        ledger.append(dict(scope='main', kind='assistant', turns=1,
                           source=f'agent/trajectory.json:step-{step.get("step_id")}', identity=step.get('step_id'),
                           fresh_input=prompt-cached, cached_input=cached, cache_write=0,
                           output=output, total_tokens=prompt+output))
    if len(list((directory / 'agent/sessions').rglob('*.jsonl'))) > 1:
        warnings.append('Multiple Codex sessions retained; child attribution needs inspection.')
    for step in trajectory.get('steps', []):
        for call in step.get('tool_calls', []):
            if re.search(r'\b(spawn_agent|send_input|resume_agent)\b', json.dumps(call)):
                warnings.append('Codex delegation detected; child attribution needs inspection.')
    return ledger


def export(root):
    manifest = json.loads((root / 'manifest.json').read_text())
    tiers = {item['name']: item['difficulty'] for item in manifest.get('selection', {}).get('tasks', [])}
    rows, ledger, warnings = [], [], []
    for path in sorted((root / 'jobs').glob('*/*/result.json')):
        data = json.loads(path.read_text())
        arm = arm_for(path, data)
        local = []
        base = trial(path, data, arm, local)
        calls = (codex_ledger if arm == 'codex' else pi_ledger)(path.parent, local)
        child_durations, timed_sessions = [], set()
        for status_path in (path.parent / 'agent/pi/subagents-temp').rglob('status.json'):
            status = load(status_path, local)
            for step in status.get('steps', []):
                session = step.get('sessionFile')
                if not session or session in timed_sessions:
                    continue
                timed_sessions.add(session)
                if step.get('durationMs') is not None:
                    child_durations.append(step['durationMs'] / 1000)
                else:
                    local.append('Missing completed subagent duration.')
        has_children = any(call['scope'] == 'subagent' for call in calls)
        child_seconds = sum(child_durations) if child_durations or not has_children else None
        if has_children and child_seconds is None:
            local.append('Child calls retained but no elapsed-time metadata available.')
        if base['exception'] and 'Timeout' in base['exception']:
            local.append('Timed-out execution: recorded usage may omit an in-flight provider request.')
        for call in calls:
            ledger.append(dict(arm=arm, task=base['task'], trial=base['trial'], **call))
        for scope in ('main', 'subagent', 'total'):
            group = [call for call in calls if scope == 'total' or call['scope'] == scope]
            # Retain measured amounts even when additional usage is unknown.
            complete = not local and bool(calls)
            row = dict(arm=arm, difficulty=tiers.get(base['task']), task=base['task'],
                       trial=base['trial'], scope=scope, exception=base['exception'],
                       agent_seconds=child_seconds if scope == 'subagent' else base['agent_seconds'],
                       time_basis='sum_child_elapsed' if scope == 'subagent' else 'main_wall_including_child_wait',
                       turns=sum(call['turns'] for call in group) if calls else None,
                       failed_model_requests=sum(call['kind'] == 'assistant_request_error' for call in group),
                       non_assistant_usage_records=sum(call['kind'] in ('compaction', 'branch_summary') for call in group),
                       accounting_complete=complete)
            for key in COUNTERS:
                values = [call.get(key) for call in group]
                row[key] = sum(values) if calls and all(value is not None for value in values) else None
            rows.append(row)
        for warning in local:
            warnings.append(f'{arm}/{base["task"]}: {warning}')
    expected = len(manifest['tasks']) * 3
    observed = len(rows) // 3
    if observed != expected:
        warnings.append(f'Expected {expected} trials, found {observed}.')
    report = dict(expected_trials=expected, observed_trials=observed,
                  snapshot_sha256=manifest['archive_sha256'], selection=manifest.get('selection'),
                  warnings=warnings, trials=rows)
    provenance = root / 'restart-provenance.json'
    if provenance.exists():
        report['restart_provenance'] = json.loads(provenance.read_text())
    (root / 'raw-metrics.json').write_text(json.dumps(report, indent=2) + '\n')
    with (root / 'raw-metrics.csv').open('w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]) if rows else ['arm', 'task', 'scope'], lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows)
    (root / 'usage-ledger.jsonl').write_text(''.join(json.dumps(call) + '\n' for call in ledger))
    print(f'Exported {observed}/{expected} trials; {len(ledger)} usage records; {len(warnings)} warnings.')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    export(parser.parse_args().root.expanduser().resolve())
