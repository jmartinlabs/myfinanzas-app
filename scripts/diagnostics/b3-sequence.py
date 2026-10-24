#!/usr/bin/env python3
"""Bounded Linux diagnostic. Never changes acceptance tests or application guards."""
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
REVISIONS = (
    ('baseline', '568aeedceceacd7c1acaf9caf67803e0ff98cbd6'),
    ('dev09', '88941e1e8fb3e545eae09e1e94df3d699b692030'),
)
MODES = (('isolated', '^SQLite B3:', ['B3']),
         ('sequence', '^SQLite B[123]:', ['B1', 'B2', 'B3']))
TEST_FILE = 'apps/api/src/sqlite-opening.test.ts'


def assess(output, exit_code, expected):
    matches = re.findall(r'\((pass|fail)\) SQLite (B[1-4]):', output)
    actual = [name for _, name in matches]
    valid = (actual[:len(expected)] == expected and
             all(status == 'fail' and name in expected for status, name in matches[len(expected):]))
    return {'exit': exit_code, 'tests': [{'name': n, 'result': s} for s, n in matches],
            'selection_valid': valid,
            'ok': exit_code == 0 and valid and all(s == 'pass' for s, _ in matches)}


def run_case(root, pattern, expected):
    env = {**os.environ, 'NODE_ENV': 'test', 'NO_COLOR': '1'}
    process = subprocess.Popen(['bun', 'test', TEST_FILE, '--test-name-pattern', pattern],
                               cwd=root, env=env, stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT, text=True, start_new_session=True)
    timed_out = False
    try:
        output, _ = process.communicate(timeout=45)
    except subprocess.TimeoutExpired:
        timed_out = True
        os.killpg(process.pid, signal.SIGKILL)
        output, _ = process.communicate()
    print(output, flush=True)
    result = assess(output, process.returncode, expected)
    result['timeout'] = timed_out
    result['ok'] = result['ok'] and not timed_out
    return result


def main():
    if sys.platform != 'linux':
        raise RuntimeError('This diagnostic requires the supported Linux runtime.')
    subprocess.run(['bun', '--version'], check=True)
    records = []
    with tempfile.TemporaryDirectory(prefix='mf-b3-sequence-') as temp:
        roots = {}
        try:
            for label, revision in REVISIONS:
                destination = Path(temp) / label
                subprocess.run(['git', 'worktree', 'add', '--detach', str(destination), revision],
                               cwd=ROOT, check=True)
                roots[label] = destination
                (destination / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
                actual_revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=destination, text=True).strip()
                if actual_revision != revision:
                    raise RuntimeError('Unexpected comparison revision.')
                digest = hashlib.sha256((destination / TEST_FILE).read_bytes()).hexdigest()
                print(json.dumps({'revision': label, 'sha': revision, 'test_sha256': digest}), flush=True)
            # Interleave revisions and arms; every invocation has a fresh Bun process.
            for round_number in range(1, 4):
                for mode, pattern, expected in MODES:
                    for label, revision in REVISIONS:
                        identity = {'revision': label, 'sha': revision, 'mode': mode, 'round': round_number}
                        print('CASE ' + json.dumps(identity), flush=True)
                        result = {**identity, **run_case(roots[label], pattern, expected)}
                        records.append(result)
                        print('RESULT ' + json.dumps(result), flush=True)
        finally:
            for root in roots.values():
                subprocess.run(['git', 'worktree', 'remove', '--force', str(root)], cwd=ROOT, check=True)
    # A diagnostic failure stays red; collecting all fixed cases is not retrying for acceptance.
    summary = [{'revision': label, 'mode': mode,
                'ok': sum(r['ok'] for r in records if r['revision'] == label and r['mode'] == mode),
                'count': sum(1 for r in records if r['revision'] == label and r['mode'] == mode)}
               for label, _ in REVISIONS for mode, _, _ in MODES]
    print('SUMMARY ' + json.dumps(summary), flush=True)
    return 0 if len(records) == 12 and all(r['ok'] for r in records) else 1


if __name__ == '__main__':
    sys.exit(main())
