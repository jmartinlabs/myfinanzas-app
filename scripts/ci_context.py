"""Choose a stable integration checkout for either surviving push/PR event."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.parse
import urllib.request


def sha(value):
    return isinstance(value, str) and re.fullmatch(r'[0-9a-f]{40}', value) and value != '0' * 40


def pull_ref(number):
    if type(number) is not int or number < 1:
        raise ValueError('invalid pull request number')
    return f'refs/pull/{number}/merge'


def select_ref(event_name, event, repository, list_pulls):
    if not isinstance(repository, str) or not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
        raise ValueError('invalid repository')
    if event_name == 'pull_request':
        if not sha(event['pull_request']['head']['sha']):
            raise ValueError('invalid PR head')
        return pull_ref(event['number'])
    if event_name == 'workflow_dispatch':
        return None  # Checkout already resolved the requested ref; freeze its SHA next.
    if event_name != 'push' or not sha(event.get('after')):
        raise ValueError('unsupported or deleted event')
    ref = event['ref']
    default = event['repository']['default_branch']
    if not isinstance(default, str) or not default:
        raise ValueError('missing default branch')
    if ref == 'refs/heads/' + default or ref.startswith('refs/tags/'):
        return event['after']
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
        mode = sys.argv[1] if len(sys.argv) == 2 else 'resolve' if len(sys.argv) == 1 else ''
        if mode == 'snapshot':
            ref = snapshot(Path(__file__).resolve().parents[1], os.environ['GITHUB_EVENT_NAME'],
                           event, os.environ['CI_CHECKOUT_REF'], os.getenv('GITHUB_SHA'))
            key = 'sha'
        elif mode == 'resolve':
            ref = select_ref(os.environ['GITHUB_EVENT_NAME'], event,
                             os.environ['GITHUB_REPOSITORY'], list_pulls)
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
