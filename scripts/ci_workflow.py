"""Validate the supported CI execution graph; reject unrecognised syntax/conditions.

The candidate uses JSON (a YAML subset accepted by Actions). This avoids a new YAML
dependency or pretending a regex is a general Actions expression/YAML interpreter.
The unchanged legacy workflow is accepted only by its reviewed byte fingerprint.
"""
import hashlib
import json
from pathlib import Path

LEGACY_SHA256 = '758b9d32207baa448b566ada043c637b13f4ba0f7f99aa9e7624e751e44175e8'
CHECKOUT = {'uses': 'actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
            'with': {'fetch-depth': 0, 'persist-credentials': False}}
PYTHON = {'uses': 'actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065',
          'with': {'python-version': '3.12'}}
BUN = {'uses': 'oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6',
       'with': {'bun-version-file': '.bun-version'}}
BASELINE = '\n'.join(('set -eu', './scripts/check-repository', './scripts/check-project',
                      './scripts/validate-template', './scripts/test-checks',
                      './scripts/test-validator', 'git diff --check',
                      'git show --format= --check HEAD'))
CLASSIFY = '''set -eu
classification="$(python3 scripts/ci_policy.py classify)"
case "$classification" in docs|full) ;; *) echo "Invalid CI classification" >&2; exit 1;; esac
printf 'class=%s\\n' "$classification" >> "$GITHUB_OUTPUT"'''
FULL_IF = "${{ needs.baseline.result == 'success' && needs.baseline.outputs.class != 'docs' }}"
AC23_IF = "github.ref_name == 'feat/07-ciclos-operacion' || github.head_ref == 'feat/07-ciclos-operacion'"
AC23 = '''set -e
# Bounded repetition for the historical intermittent v3 opening failure.
for iteration in 1 2 3 4 5; do
  echo "AC23 legacy concurrency run ${iteration}/5"
  NODE_ENV=test bun test apps/api/src/movimientos.test.ts --test-name-pattern '04 AC22/23/28: dos procesos'
done
NODE_ENV=test bun test apps/api/src/cycle-operations.test.ts --test-name-pattern '07 O[457]' '''.rstrip()
ARTIFACT = {'name': 'Fictional E1.1–E1.5 screenshots', 'if': 'always()',
            'uses': 'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
            'with': {'name': 'e1-1-screenshots', 'path': '\n'.join(
                'artifacts/' + n + '/*.png' for n in
                ('e1-1', 'e1-2', 'e1-3', 'e1-4', 'e1-5', 'e1-6', 'e2-1')),
                'if-no-files-found': 'ignore', 'retention-days': 7}}


def required_workflow():
    """Deliberately narrow supported recipe: no unchecked jobs, shell or expressions."""
    return {
        'name': 'Validate project',
        'on': ['push', 'pull_request', 'workflow_dispatch'],
        'permissions': {'contents': 'read'},
        'jobs': {
            'baseline': {
                'runs-on': 'ubuntu-latest', 'timeout-minutes': 15,
                'outputs': {'class': '${{ steps.classify.outputs.class }}'},
                'steps': [CHECKOUT, PYTHON,
                          {'id': 'classify', 'name': 'Classify complete change', 'run': CLASSIFY},
                          {'name': 'Repository, project and document checks', 'run': BASELINE}],
            },
            'full': {
                'needs': ['baseline'], 'if': FULL_IF,
                'runs-on': 'ubuntu-latest', 'timeout-minutes': 15,
                'steps': [CHECKOUT, BUN,
                          {'run': 'bun install --frozen-lockfile'},
                          {'run': 'bun run typecheck'}, {'run': 'bun run build'},
                          {'name': 'Install approved local backup tool',
                           'run': 'sudo apt-get update && sudo apt-get install -y age'},
                          {'name': 'Dev07 AC23 concurrency gate', 'if': AC23_IF, 'run': AC23},
                          {'run': 'bun run test'},
                          {'run': 'bunx playwright install --with-deps chromium'},
                          {'run': 'bun run test:e2e'}, ARTIFACT],
            },
            'required': {
                'needs': ['baseline', 'full'], 'if': '${{ always() }}',
                'runs-on': 'ubuntu-latest', 'timeout-minutes': 5,
                'steps': [CHECKOUT, PYTHON,
                          {'name': 'Reject failed or unexpectedly skipped checks',
                           'env': {'CI_CLASS': '${{ needs.baseline.outputs.class }}',
                                   'CI_BASELINE': '${{ needs.baseline.result }}',
                                   'CI_FULL': '${{ needs.full.result }}'},
                           'run': 'python3 scripts/ci_policy.py result'}],
            },
        },
    }


def no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate workflow key')
        result[key] = value
    return result


def validate_workflow(path, *, allow_legacy=False):
    try:
        raw = Path(path).read_bytes()
        if allow_legacy and hashlib.sha256(raw).hexdigest() == LEGACY_SHA256:
            return []
        value = json.loads(raw, object_pairs_hook=no_duplicates)
        expected = required_workflow()
        # Compare actual parsed objects, including types (false must not equal 0).
        # The accepted graph is closed: filters, env overrides, matrices, allowed
        # failures, alternative conditions and extra shell all require review.
        def same(a, b):
            if type(a) is not type(b):
                return False
            if isinstance(a, dict):
                return a.keys() == b.keys() and all(same(a[k], b[k]) for k in a)
            if isinstance(a, list):
                return len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
            return a == b
        errors = []
        if not isinstance(value, dict) or value.keys() != expected.keys():
            return ['ci: workflow must use the reviewed name/events/permissions/jobs graph']
        for key in ('name', 'on', 'permissions'):
            if not same(value[key], expected[key]):
                errors.append(f'ci: unsupported {key}; no event filters or elevated permissions')
        jobs = value['jobs']
        if not isinstance(jobs, dict) or jobs.keys() != expected['jobs'].keys():
            errors.append('ci: baseline, full and required jobs must all be present, without extras')
        else:
            for job, recipe in expected['jobs'].items():
                if not same(jobs[job], recipe):
                    errors.append(f'ci: {job} execution recipe/dependencies/conditions/security differ from contract')
        return errors
    except (OSError, ValueError, UnicodeError, RecursionError):
        return ['ci: unreadable or unsupported workflow; expected reviewed JSON/YAML-subset recipe']
