#!/usr/bin/env bash
# Run the three arms concurrently, with two task containers per arm.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
root=${1:?Usage: bash terminal-bench/run-comparison.sh ABSOLUTE_PREPARED_RUN_DIRECTORY}
[[ "$root" = /* && -f "$root/manifest.json" && -f "$root/snapshot.tar.gz" ]] || { echo 'Prepare an absolute run directory with prepare.py first.' >&2; exit 1; }
[[ ! -e "$root/jobs" ]] || { echo 'Run directory already has jobs; do not overwrite or silently rerun.' >&2; exit 1; }
mkdir "$root/jobs"
export PYTHONPATH="$here${PYTHONPATH:+:$PYTHONPATH}"
export PYTHONDONTWRITEBYTECODE=1
common=(-d terminal-bench@2.0 -l 5 -n 2 -k 1 --max-retries 0 --agent-setup-timeout-multiplier 3 --jobs-dir "$root/jobs" --effort low -m openai/gpt-6.1-sol --artifact /app --artifact /etc/nginx --artifact /var/www/html)
while IFS= read -r task; do common+=(-i "$task"); done < <(python3 -c 'import json,sys;print("\n".join(json.load(open(sys.argv[1]))["tasks"]))' "$root/manifest.json")
python3 - "$root" <<'PY'
import json,sys,datetime,pathlib
p=pathlib.Path(sys.argv[1]);(p/'execution.json').write_text(json.dumps({'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parallel_arms':3,'task_concurrency_per_arm':2,'max_task_containers':6},indent=2)+'\n')
PY
pids=()
trap 'for pid in "${pids[@]}"; do kill -TERM "$pid" 2>/dev/null || true; done' INT TERM
harbor run "${common[@]}" --job-name configured -a configured_pi:ConfiguredPi --ak version=1.5.2 --ak "snapshot_archive=$root/snapshot.tar.gz" --ae PI_OFFLINE=1 > "$root/configured.log" 2>&1 &
pids+=("$!")
harbor run "${common[@]}" --job-name bare -a configured_pi:BarePi --ak version=1.5.2 --ak "snapshot_archive=$root/snapshot.tar.gz" --ae PI_OFFLINE=1 > "$root/bare.log" 2>&1 &
pids+=("$!")
CODEX_FORCE_AUTH_JSON=1 harbor run "${common[@]}" --job-name codex -a configured_pi:BenchmarkCodex --ak version=0.169.0 > "$root/codex.log" 2>&1 &
pids+=("$!")
failed=0
names=(configured bare codex)
for i in 0 1 2; do
    rc=0
    wait "${pids[$i]}" || rc=$?
    printf '%s\n' "$rc" > "$root/${names[$i]}.exit"
    printf '%s exit: %s; log: %s/%s.log\n' "${names[$i]}" "$rc" "$root" "${names[$i]}"
    if [[ "$rc" != 0 ]]; then failed=1; fi
done
trap - INT TERM
python3 - "$root" <<'PY'
import json,sys,datetime,pathlib
p=pathlib.Path(sys.argv[1]);f=p/'execution.json';d=json.loads(f.read_text());d['finished_at']=datetime.datetime.now(datetime.timezone.utc).isoformat();d['wall_seconds']=(datetime.datetime.fromisoformat(d['finished_at'])-datetime.datetime.fromisoformat(d['started_at'])).total_seconds();d['exit_codes']={n:int((p/(n+'.exit')).read_text()) for n in ['configured','bare','codex']};f.write_text(json.dumps(d,indent=2)+'\n')
PY
python3 "$here/summarize.py" "$root"
python3 - "$root/summary.json" <<'PY' || failed=1
import json, sys
report = json.load(open(sys.argv[1]))
exceptions = sum(arm['exceptions'] for arm in report['arms'].values())
if report['warnings'] or report['observed_results'] != 15 or exceptions:
    print(f"Incomplete benchmark: {report['observed_results']}/15 results, {exceptions} exceptions, {len(report['warnings'])} warnings", file=sys.stderr)
    sys.exit(1)
PY
exit "$failed"
