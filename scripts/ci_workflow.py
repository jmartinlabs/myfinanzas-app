"""Validate the supported CI execution graph; reject unrecognised syntax/conditions.

The candidate uses JSON (a YAML subset accepted by Actions). This avoids a new YAML
dependency or pretending a regex is a general Actions expression/YAML interpreter.
PR runs supersede older candidates; deploy tag pushes run full on the exact tag
commit. Integration-branch pushes no longer duplicate merged PR validation.
"""
import json
from pathlib import Path
import re

CHECKOUT = {'uses': 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
            'with': {'fetch-depth': 0, 'persist-credentials': False}}
PYTHON = {'uses': 'actions/setup-python@6d4fd22b20465ccc0f7354476588e8df7c9ca0e0',
          'with': {'python-version': '3.12'}}
BUN = {'uses': 'oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6',
       'with': {'bun-version-file': '.bun-version'}}
BASELINE = 'python3 scripts/verify baseline'
CLASSIFY = """set -eu
profile="$(python3 scripts/verify ci-plan)"
case "$profile" in docs|fast|full) ;; *) echo "Invalid CI profile" >&2; exit 1;; esac
printf 'profile=%s\\n' "$profile" >> "$GITHUB_OUTPUT"
"""
CONCURRENCY = {
    # PRs supersede their own candidate. Deploy tag runs must not cancel each
    # other so every tag can publish the required/qa evidence the deploy gate
    # waits for; manual runs are isolated by run_id.
    'group': "${{ github.workflow }}:${{ github.event.pull_request.head.repo.full_name || github.repository }}:${{ github.ref_type == 'tag' && 'tag' || 'branch' }}:${{ github.head_ref || github.ref_name }}:${{ github.event_name == 'workflow_dispatch' && github.run_id || 'automatic' }}",
    'cancel-in-progress': "${{ github.event_name == 'pull_request' }}",
}
PROFILE_SUMMARY = """profile="$(printf '%s' "$CI_PROFILE" | tr '[:lower:]' '[:upper:]')"
case "$profile" in DOCS|FAST|FULL) ;; *) echo "Invalid CI profile" >&2; exit 1;; esac
printf 'Perfil CI: %s\\n' "$profile" >> "$GITHUB_STEP_SUMMARY"
"""
# The required check keeps a fixed name for branch protection. A metadata-only
# job carries the selected profile in its check name, without relying on the
# checks API or running any verification again.
PROFILE_JOB = 'profile'
PROFILE_NAME = "CI profile: ${{ needs.required.outputs.profile || 'UNKNOWN' }}"
PROFILE_LOG = "printf 'CI profile: %s\\n' \"$CI_PROFILE\"\n"


def required_workflow():
    """One required runner; strict reviewed phases retain failure/skip propagation."""
    app_if = "${{ steps.plan.outputs.profile != 'docs' }}"
    full_if = "${{ steps.plan.outputs.profile == 'full' }}"
    context = {'CI_CHECKOUT_REF': '${{ steps.context.outputs.ref }}'}
    states = {name: '${{ steps.' + name[3:].lower() + '.outcome }}' for name in (
        'CI_CONTEXT', 'CI_SNAPSHOT', 'CI_PLAN', 'CI_BASELINE', 'CI_VERIFY', 'CI_BUN', 'CI_INSTALL', 'CI_PREPARE', 'CI_BROWSER')}
    states['CI_PROFILE'] = '${{ steps.plan.outputs.profile }}'
    return {
        'name': 'Validate project',
        'on': {'push': {'tags': ['deploy-test-v*']},
               'pull_request': {'branches': ['main', 'test'], 'types': [
                   'opened', 'synchronize', 'reopened', 'ready_for_review']},
               'workflow_dispatch': {}},
        'permissions': {'contents': 'read'},
        'concurrency': CONCURRENCY,
        'jobs': {'required': {
            'runs-on': 'ubuntu-24.04', 'timeout-minutes': 25,
            'permissions': {'contents': 'read', 'pull-requests': 'read'},
            'outputs': {'profile': '${{ steps.plan.outputs.profile }}'},
            'steps': [CHECKOUT, PYTHON,
                {'id': 'context', 'name': 'Resolve integration context',
                 'env': {'GH_TOKEN': '${{ github.token }}'}, 'run': 'python3 scripts/ci_context.py'},
                {'uses': CHECKOUT['uses'], 'with': {**CHECKOUT['with'], 'ref': '${{ steps.context.outputs.ref }}'}},
                {'id': 'snapshot', 'name': 'Freeze validated checkout', 'env': context, 'run': 'python3 scripts/ci_context.py snapshot'},
                {'id': 'plan', 'name': 'Select conservative CI execution profile', 'run': CLASSIFY, 'env': context},
                {'id': 'summary', 'name': 'Publish selected CI profile',
                 'env': {'CI_PROFILE': '${{ steps.plan.outputs.profile }}'},
                 'run': PROFILE_SUMMARY},
                {'id': 'baseline', 'name': 'Repository, project and document checks', 'run': BASELINE, 'env': context},
                {'id': 'bun', 'if': app_if, **BUN},
                {'id': 'install', 'if': app_if, 'run': 'bun install --frozen-lockfile'},
                {'id': 'prepare', 'if': full_if, 'name': 'Prepare Linux full dependencies',
                 'env': {'CI_PROFILE': '${{ steps.plan.outputs.profile }}'},
                 'run': 'python3 scripts/ci_prepare_linux.py'},
                {'id': 'browser', 'if': full_if, 'run': 'node node_modules/@playwright/test/cli.js install chromium'},
                {'id': 'verify', 'name': 'Canonical CI application verification', 'env': context, 'run': 'python3 scripts/verify ci'},
                {'name': 'Reject failed, cancelled or unexpectedly skipped phases', 'if': '${{ always() }}',
                 'env': states, 'run': 'python3 scripts/verify ci-result'},
            ],
        }, PROFILE_JOB: {
            'name': PROFILE_NAME, 'needs': 'required', 'if': '${{ always() }}',
            'runs-on': 'ubuntu-24.04', 'timeout-minutes': 5,
            'steps': [{'name': 'Record selected CI profile',
                       'env': {'CI_PROFILE': "${{ needs.required.outputs.profile || 'UNKNOWN' }}"},
                       'run': PROFILE_LOG}],
        }},
    }


def no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate workflow key')
        result[key] = value
    return result


ROOTLESS_JOBS = ('capability', 'deploy')
ROOTLESS_CAPABILITY = (
    'python3 infra/tests/rootless-preflight.py',
    'python3 infra/tests/rootless-integration.py',
    'apt-get install -y podman',
)
ROOTLESS_DEPLOY = (
    'environment: test',
    '--qa-equivalence',
    'Wait for the tag\'s own required FULL validation',
    'infra/release.py build',
    '--single-build',
    'infra/smoke.py',
    'deploy:$ACTOR:$version',
    'StrictHostKeyChecking=yes',
)


def deeper_block(lines, index):
    """Lines indented deeper than the mapping key on `lines[index]`."""
    indent = len(lines[index]) - len(lines[index].lstrip(' '))
    block = []
    for line in lines[index + 1:]:
        if line.strip() and len(line) - len(line.lstrip(' ')) <= indent:
            break
        block.append(line)
    return block


def validate_rootless_workflow(path):
    """Bounded review of the rootless/deploy graph; block YAML is not interpreted.

    The canonical profiles own the application suites, so this workflow may only
    build and deploy: an extra test job, a weakened dependency, an unpinned action
    or a removed guard fails visibly instead of shipping with the deploy.
    """
    try:
        lines = Path(path).read_text().splitlines()
    except (OSError, UnicodeError):
        return ['rootless: unreadable workflow']
    if 'jobs:' not in lines:
        return ['rootless: missing jobs']
    start = lines.index('jobs:') + 1
    names = []
    for line in lines[start:]:
        if line and not line.startswith(' '):
            break
        match = re.fullmatch(r'  ([a-z][a-z0-9_-]*):\s*', line)
        if match:
            names.append(match.group(1))
    errors = []
    if tuple(names) != ROOTLESS_JOBS:
        errors.append('rootless: only the capability and deploy jobs are reviewed; '
                      'application suites belong to the canonical profiles')
    blocks = {}
    for name in names:
        header = start + next((offset for offset, line in enumerate(lines[start:])
                               if line == '  ' + name + ':'), -1)
        if header >= start:
            blocks[name] = '\n'.join(deeper_block(lines, header))
    capability, deploy = blocks.get('capability', ''), blocks.get('deploy', '')
    for needle in ROOTLESS_CAPABILITY:
        if needle not in capability:
            errors.append('rootless: capability lost ' + needle)
    if not re.search(r'(?m)^    needs: \[capability\]\s*$', deploy):
        errors.append('rootless: deploy must depend only on capability')
    for needle in ROOTLESS_DEPLOY:
        if needle not in deploy:
            errors.append('rootless: deploy lost ' + needle)
    for line in lines:
        if 'continue-on-error' in line or re.search(r'\bif:\s*false\s*$', line):
            errors.append('rootless: disabled controls or allowed failures are not reviewed')
            break
    for match in re.finditer(r'uses:\s*(\S+)', '\n'.join(lines)):
        if not re.fullmatch(r'[\w.-]+/[\w./-]+@[0-9a-f]{40}', match.group(1)):
            errors.append('rootless: every action must be pinned to a commit SHA')
            break
    if '\n'.join(lines).count('fetch-depth: 0') < len(ROOTLESS_JOBS):
        errors.append('rootless: every job needs complete history')
    if '\n'.join(lines).count('persist-credentials: false') < len(ROOTLESS_JOBS):
        errors.append('rootless: every checkout must avoid persisted credentials')
    if re.search(r'(?m)^\s+[\w-]+: write\s*$', '\n'.join(lines)):
        errors.append('rootless: read-only permissions only')
    try:
        push = deeper_block(lines, lines.index('  push:'))
    except ValueError:
        errors.append('rootless: deploy tag trigger required')
    else:
        pushed = '\n'.join(push)
        if not re.search(r'(?m)^    tags:\s*\n      - \'deploy-test-v\*\'$', pushed):
            errors.append('rootless: only deploy-test tags trigger the workflow')
        if re.search(r'(?m)^    branches:', pushed):
            errors.append('rootless: no postmerge branch push')
    try:
        pull = '\n'.join(deeper_block(lines, lines.index('  pull_request:')))
    except ValueError:
        errors.append('rootless: pull request trigger required')
    else:
        for needle in ("'.github/workflows/rootless.yml'", "'infra/**'", "'bun.lock'",
                       "'package.json'", "'!infra/**/*.md'", "'!infra/**/.*.md'"):
            if needle not in pull:
                errors.append('rootless: pull request paths lost ' + needle)
    return errors


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
            errors.append('ci: required and profile jobs must be present exactly, without extras')
        else:
            for job, recipe in expected['jobs'].items():
                if not same(jobs[job], recipe):
                    errors.append(f'ci: {job} execution recipe/dependencies/conditions/security differ from contract')
        return errors
    except (OSError, ValueError, UnicodeError, RecursionError):
        return ['ci: unreadable or unsupported workflow; expected reviewed JSON/YAML-subset recipe']
