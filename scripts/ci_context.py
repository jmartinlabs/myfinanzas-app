"""Freeze the integration checkout for PR merge refs, integration pushes and deploy tags."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.parse
import urllib.request

DEPLOY_TAG = re.compile(
    r'refs/tags/deploy-test-v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$')


def sha(value):
    return isinstance(value, str) and re.fullmatch(r'[0-9a-f]{40}', value) and value != '0' * 40


def pull_ref(number):
    if type(number) is not int or number < 1:
        raise ValueError('invalid pull request number')
    return f'refs/pull/{number}/merge'


def require_annotated_tag(root, ref):
    """Deploy tags must be annotated objects; a lightweight tag is rejected early."""
    try:
        kind = subprocess.check_output(
            ['git', '-C', str(root), 'cat-file', '-t', ref],
            stderr=subprocess.PIPE).strip()
    except subprocess.SubprocessError:
        raise ValueError('deploy tag is unavailable')
    if kind != b'tag':
        raise ValueError('deploy tag must be annotated')


def select_ref(event_name, event, repository, list_pulls, root=None):
    if not isinstance(repository, str) or not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
        raise ValueError('invalid repository')
    if event_name == 'pull_request':
        pr = event['pull_request']
        if not sha(pr['head']['sha']):
            raise ValueError('invalid PR head')
        # Only the two integration branches may be a PR base; anything else is
        # rejected before selecting a merge ref.
        if pr.get('base', {}).get('ref') not in ('main', 'test'):
            raise ValueError('unsupported PR base')
        return pull_ref(event['number'])
    if event_name == 'workflow_dispatch':
        return None  # Checkout already resolved the requested ref; freeze its SHA next.
    if event_name != 'push' or not sha(event.get('after')):
        raise ValueError('unsupported or deleted event')
    ref = event['ref']
    default = event['repository']['default_branch']
    if not isinstance(default, str) or not default:
        raise ValueError('missing default branch')
    # main and test are integration branches: validate their exact tip rather
    # than borrowing a pull-request merge ref. Tags keep their pinned ref so an
    # annotated tag is checked out and peeled to its commit.
    if ref in ('refs/heads/' + default, 'refs/heads/test'):
        return event['after']
    if ref.startswith('refs/tags/'):
        if not ref[len('refs/tags/'):]:
            raise ValueError('invalid tag')
        if ref.startswith('refs/tags/deploy-test-v') and not DEPLOY_TAG.fullmatch(ref):
            raise ValueError('malformed deploy tag')
        if ref.startswith('refs/tags/deploy-test-v') and root is not None:
            require_annotated_tag(root, ref)
        return ref
    if not ref.startswith('refs/heads/') or not ref[len('refs/heads/'):]:
        raise ValueError('invalid branch')
    branch = ref[len('refs/heads/'):]
    pulls = list_pulls(repository, branch)
    if not isinstance(pulls, list) or len(pulls) >= 100:
        raise ValueError('incomplete PR lookup')
    matches = []
    for pr in pulls:
        if (pr['head']['repo']['full_name'] == repository and pr['head']['ref'] == branch
                and pr['state'] == 'open'):
            if pr['head']['sha'] != event['after']:
                raise ValueError('event superseded by another PR head')
            matches.append(pr)
    if len(matches) > 1:
        raise ValueError('multiple PR contexts require explicit review')
    return pull_ref(matches[0]['number']) if matches else event['after']


def list_pulls(repository, branch):
    token = os.environ['GH_TOKEN']
    query = urllib.parse.urlencode({'state': 'open', 'head': repository.split('/')[0] + ':' + branch,
                                    'per_page': 100})
    request = urllib.request.Request(f'https://api.github.com/repos/{repository}/pulls?{query}',
                                     headers={'Authorization': 'Bearer ' + token,
                                              'Accept': 'application/vnd.github+json',
                                              'X-GitHub-Api-Version': '2022-11-28'})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def snapshot(root, event_name, event, checkout_ref, manual_sha=None):
    def rev(expression):
        return subprocess.check_output(['git', '-C', str(root), 'rev-parse', expression],
                                       stderr=subprocess.PIPE).decode().strip()
    expected = (event['pull_request']['head']['sha'] if event_name == 'pull_request'
                else event['after'] if event_name == 'push' else manual_sha)
    actual = rev('HEAD')
    if not sha(expected) or not sha(actual):
        raise ValueError('invalid checkout snapshot')
    if isinstance(checkout_ref, str) and checkout_ref.startswith('refs/tags/'):
        # A tag push checks out the tag ref. GITHUB_SHA may be the tag object or
        # its peeled commit, so accept either while always comparing commits.
        if checkout_ref.startswith('refs/tags/deploy-test-v') and not DEPLOY_TAG.fullmatch(checkout_ref):
            raise ValueError('malformed deploy tag')
        if checkout_ref.startswith('refs/tags/deploy-test-v'):
            require_annotated_tag(root, checkout_ref)
        if event.get('ref') != checkout_ref or not sha(manual_sha):
            raise ValueError('invalid tag checkout snapshot')
        try:
            tag_ref = rev(checkout_ref)
            tag_commit = rev(checkout_ref + '^{commit}')
            event_commit = rev(expected + '^{commit}')
            manual_commit = rev(manual_sha + '^{commit}')
        except subprocess.SubprocessError:
            raise ValueError('tag ref is unavailable')
        if event_commit != tag_commit:
            raise ValueError('tag event does not match the tag ref')
        if manual_commit != tag_commit or actual != tag_commit:
            raise ValueError('tag checkout does not match the event')
        if manual_sha not in (tag_ref, tag_commit, expected):
            # Some checkouts rewrite the tag ref to the bare commit; a tag
            # object supplied as GITHUB_SHA is still valid if it peels here.
            try:
                manual_kind = subprocess.check_output(
                    ['git', '-C', str(root), 'cat-file', '-t', manual_sha],
                    stderr=subprocess.PIPE).strip()
            except subprocess.SubprocessError:
                raise ValueError('GITHUB_SHA is unavailable')
            if manual_kind != b'tag':
                raise ValueError('GITHUB_SHA does not identify the tag')
        return actual
    if isinstance(checkout_ref, str) and re.fullmatch(r'refs/pull/[1-9][0-9]*/merge', checkout_ref):
        # The merge ref may move between API lookup and checkout. Never classify an
        # older docs event while testing a different, newer PR head.
        if rev('HEAD^2') != expected:
            raise ValueError('integration checkout moved to another PR head')
    elif checkout_ref != expected or actual != expected:
        raise ValueError('checkout does not match the event')
    return actual


def main():
    try:
        event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
        root = Path(__file__).resolve().parents[1]
        mode = sys.argv[1] if len(sys.argv) == 2 else 'resolve' if len(sys.argv) == 1 else ''
        if mode == 'snapshot':
            ref = snapshot(root, os.environ['GITHUB_EVENT_NAME'],
                           event, os.environ['CI_CHECKOUT_REF'], os.getenv('GITHUB_SHA'))
            key = 'sha'
        elif mode == 'resolve':
            ref = select_ref(os.environ['GITHUB_EVENT_NAME'], event,
                             os.environ['GITHUB_REPOSITORY'], list_pulls, root)
            if ref is None:
                ref = os.environ['GITHUB_SHA']
                if not sha(ref):
                    raise ValueError('invalid manual SHA')
            key = 'ref'
        else:
            raise ValueError('unsupported context mode')
        # All refs are generated above; no API data is interpolated into shell code.
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
            output.write(f'{key}={ref}\n')
        print('CI checkout context resolved.')
        return 0
    except (OSError, ValueError, KeyError, TypeError, AttributeError, subprocess.SubprocessError):
        # Never expose token, API payload, URLs or credentials through exception text.
        print('CI checkout context could not be verified.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
