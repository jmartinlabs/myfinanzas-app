"""One diagnostic API execution; no retries and no replacement acceptance verdict."""
import hashlib
import json
import os
from pathlib import Path
import platform
import signal
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'artifacts/b3-capture'
EXPECTED = {
    'b3-capture.preload.ts': '10646d33056d7fe611d83eaa41a62a0782838f19c9be552aa9cf108dc8b92ab4',
    'b3-capture-helper.ts': '5fea125bdf166c7ee7da0ab922a7f5c297fcd83ab78af7d54f8a179ed36bd311',
}


def main():
    os.umask(0o077)
    OUT.mkdir(parents=True, exist_ok=False, mode=0o700)
    summary = {'diagnostic_only': True, 'acceptance': False, 'attempts': 0,
               'timeout_seconds': 900, 'platform': platform.platform()}
    summary_path = OUT / 'summary.json'
    try:
        for name, expected in EXPECTED.items():
            actual = hashlib.sha256((Path(__file__).parent / name).read_bytes()).hexdigest()
            if actual != expected:
                raise ValueError('Capture source hash mismatch: ' + name)
        summary['capture_hashes'] = EXPECTED
        summary['commit'] = subprocess.check_output(
            ['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
        summary['bun'] = subprocess.check_output(['bun', '--version'], text=True).strip()
        if platform.system() != 'Linux' or platform.machine() != 'x86_64':
            raise ValueError('Linux x86_64 required; no suite executed')
        env = {**os.environ, 'NODE_ENV': 'test', 'B3_CAPTURE_LOG': str(OUT / 'capture.jsonl')}
        command = ['bun', 'test', '--preload',
                   './scripts/diagnostics/b3-capture/b3-capture.preload.ts', 'apps/api']
        summary['attempts'] = 1
        child = subprocess.Popen(command, cwd=ROOT, env=env, text=True,
                                 stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                 start_new_session=True)
        try:
            output, _ = child.communicate(timeout=900)
        except subprocess.TimeoutExpired:
            os.killpg(child.pid, signal.SIGTERM)
            try:
                output, _ = child.communicate(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                output, _ = child.communicate()
            summary['timed_out'] = True
        summary['suite_exit'] = child.returncode
        # Standard synthetic-suite output stays in Actions logs, never in artifacts.
        print(output, flush=True)
        records = [json.loads(line) for line in (OUT / 'capture.jsonl').read_text().splitlines()]
        errors = [r for r in records if r.get('event') == 'error']
        b3_errors = [r for r in errors if r.get('errno') == 522 and
                     any('sqlite-opening.test.ts:288:' in f for f in r.get('caller', []))]
        faults = [r for r in records if r.get('inconclusive') or r.get('event') == 'truncated']
        summary.update(records=len(records), error_records=len(errors),
                       b3_522_captured=len(b3_errors), capture_fault_records=len(faults))
        summary['b3_test_failed'] = '(fail) SQLite B3:' in output
        summary['b3_test_passed'] = '(pass) SQLite B3:' in output
        summary['outcome'] = ('CAPTURED_FOR_REVIEW' if b3_errors else 'INCONCLUSIVE')
        summary['inconclusive'] = not b3_errors or bool(faults) or summary.get('timed_out', False)
        for record in b3_errors:
            index = records.index(record)
            # Emit the closest preceding snapshot for the same fixture, not all queries.
            before = next((r for r in reversed(records[:index])
                           if r.get('event') == 'pre' and r.get('db') == record.get('db')), None)
            print('B3_TECHNICAL_SNAPSHOT ' + json.dumps({'before': before, 'error': record}))
        if not records or records[0].get('event') != 'init':
            raise ValueError('Missing capture initialization')
        # Preserve suite failure. A green diagnostic run does not close B3.
        return child.returncode if child.returncode else (2 if faults else 0)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        summary['outcome'] = 'INCONCLUSIVE'
        summary['inconclusive'] = True
        summary['capture_setup_error'] = type(error).__name__
        print('Capture setup/parse error: ' + type(error).__name__, flush=True)
        return 2
    finally:
        summary_path.write_text(json.dumps(summary, indent=2) + '\n')
        print('B3_DIAGNOSTIC_SUMMARY ' + json.dumps(summary), flush=True)


if __name__ == '__main__':
    sys.exit(main())
