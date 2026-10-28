"""Validate the supported CI execution graph; reject unrecognised syntax/conditions.

The candidate uses JSON (a YAML subset accepted by Actions). This avoids a new YAML
dependency or pretending a regex is a general Actions expression/YAML interpreter.
PR runs supersede older candidates; main pushes retain a fast postmerge gate.
"""
import json
from pathlib import Path

CHECKOUT = {'uses': 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
            'with': {'fetch-depth': 0, 'persist-credentials': False}}
PYTHON = {'uses': 'actions/setup-python@6d4fd22b20465ccc0f7354476588e8df7c9ca0e0',
          'with': {'python-version': '3.12'}}
BUN = {'uses': 'oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6',
       'with': {'bun-version-file': '.bun-version'}}
BASELINE = 'python3 scripts/verify baseline'
CLASSIFY = """set -eu
profile="$(python3 scripts/verify ci-plan)"
case "$profile" in docs|fast|critical|full) ;; *) echo "Invalid CI profile" >&2; exit 1;; esac
printf 'profile=%s\\n' "$profile" >> "$GITHUB_OUTPUT"
"""
CONCURRENCY = {
    'group': "${{ github.workflow }}:${{ github.event.pull_request.head.repo.full_name || github.repository }}:${{ github.ref_type == 'tag' && 'tag' || 'branch' }}:${{ github.head_ref || github.ref_name }}:${{ github.event_name == 'workflow_dispatch' && github.run_id || 'automatic' }}",
    'cancel-in-progress': "${{ github.ref != 'refs/heads/main' && github.event_name != 'workflow_dispatch' }}",
}


def required_workflow():
    """One required runner; strict reviewed phases retain failure/skip propagation."""
    app_if = "${{ steps.plan.outputs.profile != 'docs' }}"
    api_if = "${{ steps.plan.outputs.profile == 'critical' || steps.plan.outputs.profile == 'full' }}"
    full_if = "${{ steps.plan.outputs.profile == 'full' }}"
    context = {'CI_CHECKOUT_REF': '${{ steps.context.outputs.ref }}'}
    states = {name: '${{ steps.' + name[3:].lower() + '.outcome }}' for name in (
        'CI_CONTEXT', 'CI_SNAPSHOT', 'CI_PLAN', 'CI_BASELINE', 'CI_VERIFY', 'CI_BUN', 'CI_INSTALL', 'CI_PREPARE', 'CI_BROWSER')}
    states['CI_PROFILE'] = '${{ steps.plan.outputs.profile }}'
    return {
        'name': 'Validate project',
        'on': {'push': {'branches': ['main']},
               'pull_request': {'branches': ['main'], 'types': [
                   'opened', 'synchronize', 'reopened', 'ready_for_review']},
               'workflow_dispatch': {}},
        'permissions': {'contents': 'read'},
        'concurrency': CONCURRENCY,
        'jobs': {'required': {
            'runs-on': 'ubuntu-24.04', 'timeout-minutes': 15,
            'permissions': {'contents': 'read', 'pull-requests': 'read'},
            'steps': [CHECKOUT, PYTHON,
                {'id': 'context', 'name': 'Resolve integration context',
                 'env': {'GH_TOKEN': '${{ github.token }}'}, 'run': 'python3 scripts/ci_context.py'},
                {'uses': CHECKOUT['uses'], 'with': {**CHECKOUT['with'], 'ref': '${{ steps.context.outputs.ref }}'}},
                {'id': 'snapshot', 'name': 'Freeze validated checkout', 'env': context, 'run': 'python3 scripts/ci_context.py snapshot'},
                {'id': 'plan', 'name': 'Select conservative CI execution profile', 'run': CLASSIFY, 'env': context},
                {'id': 'baseline', 'name': 'Repository, project and document checks', 'run': BASELINE},
                {'id': 'bun', 'if': app_if, **BUN},
                {'id': 'install', 'if': app_if, 'run': 'bun install --frozen-lockfile'},
                {'id': 'prepare', 'if': api_if, 'name': 'Prepare Linux API or full dependencies',
                 'env': {'CI_PROFILE': '${{ steps.plan.outputs.profile }}'},
                 'run': 'if [ "$CI_PROFILE" = full ]; then python3 scripts/ci_prepare_linux.py; else python3 scripts/ci_prepare_linux.py api; fi'},
                {'id': 'browser', 'if': full_if, 'run': 'node node_modules/@playwright/test/cli.js install chromium'},
                {'id': 'verify', 'name': 'Canonical CI application verification', 'env': context, 'run': 'python3 scripts/verify ci'},
                {'name': 'Reject failed, cancelled or unexpectedly skipped phases', 'if': '${{ always() }}',
                 'env': states, 'run': 'python3 scripts/verify ci-result'},
            ],
        }},
    }


def no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate workflow key')
        result[key] = value
    return result


def validate_workflow(path):
    try:
        raw = Path(path).read_bytes()
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
        for key in ('name', 'on', 'permissions', 'concurrency'):
            if not same(value[key], expected[key]):
                errors.append(f'ci: unsupported {key}; reviewed events/concurrency/read-only permissions required')
        jobs = value['jobs']
        if not isinstance(jobs, dict) or jobs.keys() != expected['jobs'].keys():
            errors.append('ci: one required job must be present, without extras')
        else:
            for job, recipe in expected['jobs'].items():
                if not same(jobs[job], recipe):
                    errors.append(f'ci: {job} execution recipe/dependencies/conditions/security differ from contract')
        return errors
    except (OSError, ValueError, UnicodeError, RecursionError):
        return ['ci: unreadable or unsupported workflow; expected reviewed JSON/YAML-subset recipe']
