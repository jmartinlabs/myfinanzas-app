"""Two predeclared contexts, one run each; no retries or acceptance substitution."""
import json
import os
from pathlib import Path
import platform
import re
import signal
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'artifacts/b3-parent-state'
PRELOAD = './scripts/diagnostics/b3-parent-state/preload.ts'


def b3_index(output):
    index = None
    matches = []
    for line in output.splitlines():
        boundary = re.fullmatch(r'B3_PARENT_BOUNDARY (\d+) after', line.strip())
        if boundary:
            index = int(boundary[1])
        if re.match(r'^\((pass|fail)\) SQLite B3:', line):
            if index is not None and index not in matches:
                matches.append(index)
            index = None
        elif re.match(r'^\((pass|fail)\) ', line):
            index = None
    return matches


def execute(label, selection):
    log = OUT / (label + '.jsonl')
    env = {**os.environ, 'NODE_ENV': 'test', 'NO_COLOR': '1',
           'B3_PARENT_LOG': str(log)}
    command = ['bun', 'test', '--preload', PRELOAD, *selection]
    child = subprocess.Popen(command, cwd=ROOT, env=env, text=True,
                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                             start_new_session=True)
    timed_out = False
    try:
        output, _ = child.communicate(timeout=600)
    except subprocess.TimeoutExpired:
        timed_out = True
        os.killpg(child.pid, signal.SIGTERM)
        try:
            output, _ = child.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(child.pid, signal.SIGKILL)
            output, _ = child.communicate()
    print(f'CONTEXT {label}\n{output}', flush=True)
    records = [json.loads(line) for line in log.read_text().splitlines()]
    indexes = b3_index(output)
    selected = [r for r in records if r.get('index') in indexes]
    # Pair only a single uniquely identified canonical B3 result per context.
    valid = len(indexes) == 1 and len(selected) == 2 and all(
        r.get('capture') == 'ok' for r in selected)
    return {'context': label, 'suite_exit': child.returncode, 'attempts': 1,
            'timed_out': timed_out, 'b3_pass': '(pass) SQLite B3:' in output,
            'b3_fail': '(fail) SQLite B3:' in output,
            'short_read_522': 'SQLITE_IOERR_SHORT_READ' in output,
            'boundary_capture_valid': valid, 'b3_boundaries': selected,
            'preceding_boundaries': [r for r in records if indexes and
                                     indexes[0] - 2 <= r.get('index', -1) < indexes[0]]}


def main():
    os.umask(0o077)
    OUT.mkdir(parents=True, exist_ok=False, mode=0o700)
    summary = {'diagnostic_only': True, 'acceptance': False, 'attempts': 0}
    try:
        if platform.system() != 'Linux':
            raise ValueError('Linux required')
        summary['head'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
        cases = []
        # Different test-discovery contexts, not repeated attempts until success.
        for label, selection in [
            ('isolated', ['apps/api/src/sqlite-opening.test.ts', '--test-name-pattern', '^SQLite B3:']),
            ('suite', ['apps/api'])]:
            summary['attempts'] += 1
            cases.append(execute(label, selection))
            if cases[-1]['timed_out'] or not cases[-1]['boundary_capture_valid']:
                break
        summary['cases'] = cases
        summary['outcome'] = 'EVIDENCE_FOR_REVIEW' if any(c['b3_fail'] for c in cases) else 'INCONCLUSIVE'
        summary['cause_demonstrated'] = False
        print('PARENT_STATE_SUMMARY ' + json.dumps(summary), flush=True)
        return 1 if any(c['suite_exit'] or not c['boundary_capture_valid'] for c in cases) else 0
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        summary['outcome'] = 'INCONCLUSIVE'
        summary['error_type'] = type(error).__name__
        return 2
    finally:
        (OUT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')


if __name__ == '__main__':
    sys.exit(main())
