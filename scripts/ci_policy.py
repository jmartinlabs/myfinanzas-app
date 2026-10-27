#!/usr/bin/env python3
"""Shared conservative classifier and fail-closed result gate (Python standard library)."""
import argparse
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PROTECTED = {'agents.md', 'claude.md', 'skill.md', 'instructions.md'}
FUNCTIONAL_DOC = re.compile(
    r'[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*-(?:brainstorming|specification|progress|testplan)\.md')
CONTEXT_DOCS = {'project.md', 'roadmap.md', 'setup-progress.md', 'epic-board.md',
                'functional-reference-v5.11.md'}


def docs_path(path):
    # Explicit product-document families only; never all Markdown under specs/.
    if not isinstance(path, str) or not path or '\\' in path:
        return False
    parts = path.split('/')
    if (not all(p not in ('', '.', '..') for p in parts)
            or PurePosixPath(path).name.lower() in PROTECTED):
        return False
    return ((len(parts) == 3 and parts[:2] == ['specs', 'backlog']
             and parts[2].endswith('.md'))
            or (len(parts) == 2 and parts[0] == 'specs'
                and (parts[1] in CONTEXT_DOCS or FUNCTIONAL_DOC.fullmatch(parts[1]) is not None)))


def record_paths(data):
    """Consume Git --name-status -z bytes, retaining both rename/copy endpoints."""
    try:
        if not isinstance(data, bytes) or not data or not data.endswith(b'\0'):
            return None
        tokens = data[:-1].decode('utf-8', errors='strict').split('\0')
        paths = []
        i = 0
        while i < len(tokens):
            status = tokens[i]
            i += 1
            if status in ('A', 'M', 'D', 'T'):
                count = 1
            elif re.fullmatch(r'[RC](?:100|[1-9]?[0-9])', status):
                count = 2
            else:
                return None
            if len(tokens) - i < count:
                return None
            paths.extend(tokens[i:i + count])
            i += count
        return paths or None
    except UnicodeError:
        return None


def classify_records(data):
    paths = record_paths(data)
    return 'docs' if paths and all(docs_path(p) for p in paths) else 'full'


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args], stderr=subprocess.PIPE)


def classify_git(root, base, head, *, pull_request=False):
    """Only complete, verified commit comparisons may opt out of full checks."""
    try:
        if not all(isinstance(s, str) and re.fullmatch(r'[0-9a-f]{40}', s)
                   and s != '0' * 40 for s in (base, head)):
            return 'full'
        if git(root, 'rev-parse', '--is-shallow-repository').strip() != b'false':
            return 'full'
        for sha in (base, head):
            git(root, 'cat-file', '-e', sha + '^{commit}')
        if pull_request:
            base = git(root, 'merge-base', base, head).decode().strip()
        records = git(root, 'diff', '--name-status', '-z', '--find-renames',
                      '--ignore-submodules=none', '--no-ext-diff', '--no-textconv', base, head, '--')
        return classify_records(records)
    except (OSError, subprocess.SubprocessError, UnicodeError):
        return 'full'


def classify_event_range(root, event_name, event):
    try:
        if event_name == 'pull_request':
            pr = event['pull_request']
            return classify_git(root, pr['base']['sha'], pr['head']['sha'], pull_request=True)
        if event_name == 'push':
            return classify_git(root, event['before'], event['after'])
    except (KeyError, TypeError):
        pass
    return 'full'


def classify_event(root, event_name, event, checkout_ref=None):
    original = classify_event_range(root, event_name, event)
    if checkout_ref is None:
        return original
    try:
        expected = (event['pull_request']['head']['sha'] if event_name == 'pull_request'
                    else event['after'] if event_name == 'push' else None)
        if isinstance(checkout_ref, str) and re.fullmatch(r'refs/pull/[1-9][0-9]*/merge', checkout_ref):
            if git(root, 'rev-parse', 'HEAD^2').decode().strip() != expected:
                return 'full'
            base = git(root, 'rev-parse', 'HEAD^1').decode().strip()
            accumulated = classify_git(root, base, expected, pull_request=True)
            # A last docs-only push must not cancel the PR's full checks when
            # earlier commits in the same PR changed application/harness code.
            return 'docs' if original == accumulated == 'docs' else 'full'
        if (not isinstance(checkout_ref, str) or not re.fullmatch(r'[0-9a-f]{40}', checkout_ref)
                or (expected is not None and checkout_ref != expected)):
            return 'full'
        return original
    except (OSError, subprocess.SubprocessError, UnicodeError, KeyError, TypeError):
        return 'full'


# A narrow fast allowlist; everything else retains independent Linux API coverage.
# UI files can contain financial rules, so TS/TSX are deliberately critical.
def fast_path(path):
    return (docs_path(path) or (isinstance(path, str) and all(p not in ('', '.', '..') for p in path.split('/'))
            and '\\' not in path and path.startswith('apps/web/') and path.endswith('.css')))


def profile_records(data):
    paths = record_paths(data)
    if not paths:
        return 'critical'
    if all(docs_path(p) for p in paths):
        return 'docs'
    return 'fast' if all(fast_path(p) for p in paths) else 'critical'


def ci_profile(root, event_name, event, checkout_ref=None):
    """Execution venue differs from docs/full coverage; invalid contexts fail closed."""
    if event_name == 'workflow_dispatch':
        return 'full'
    if event_name == 'push':
        # No feature push, tag or deleted ref may select the postmerge shortcut.
        if event.get('ref') != 'refs/heads/main' or not re.fullmatch(r'[0-9a-f]{40}', event.get('after', '')) or event['after'] == '0' * 40:
            raise ValueError('only main pushes have a fast postmerge gate')
        if git(root, 'rev-parse', 'HEAD').decode().strip() != event['after'] or checkout_ref != event['after']:
            raise ValueError('postmerge snapshot differs from event')
        return 'fast'
    if event_name != 'pull_request':
        raise ValueError('unsupported CI event')
    pr = event.get('pull_request', {})
    if pr.get('base', {}).get('ref') != 'main':
        raise ValueError('only PRs targeting main are supported')
    # Selection compares the complete PR against the exact tested integration base.
    # Unverified data never opts out of independent API/SQLite validation.
    try:
        head = pr['head']['sha']; base = pr['base']['sha']
        if not re.fullmatch(r'refs/pull/[1-9][0-9]*/merge', checkout_ref or ''):
            return 'critical'
        if git(root, 'rev-parse', 'HEAD^2').decode().strip() != head:
            raise ValueError('integration head changed')
        if git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=all'):
            return 'critical'
        tested_base = git(root, 'rev-parse', 'HEAD^1').decode().strip()
        if tested_base != base:
            raise ValueError('integration base changed; rerun against current base')
        if classify_git(root, base, head, pull_request=True) == 'full':
            if git(root, 'rev-parse', '--is-shallow-repository').strip() != b'false':
                return 'critical'
        ancestor = git(root, 'merge-base', base, head).decode().strip()
        records = git(root, 'diff', '--name-status', '-z', '--find-renames',
                      '--ignore-submodules=none', '--no-ext-diff', '--no-textconv', ancestor, head, '--')
        return profile_records(records)
    except (OSError, subprocess.SubprocessError, KeyError, TypeError):
        return 'critical'


def ci_result_ok(profile, states):
    if profile not in ('docs', 'fast', 'critical', 'full'):
        return False
    expected = {name: 'success' for name in ('context', 'snapshot', 'plan', 'baseline', 'verify')}
    expected.update({name: 'success' if profile != 'docs' else 'skipped' for name in ('bun', 'install')})
    expected['prepare'] = 'success' if profile in ('critical', 'full') else 'skipped'
    expected['browser'] = 'success' if profile == 'full' else 'skipped'
    return states == expected


def result_ok(classification, baseline, full):
    return baseline == 'success' and (
        (classification == 'docs' and full == 'skipped')
        or (classification == 'full' and full == 'success'))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    classifier = sub.add_parser('classify')
    classifier.add_argument('--base')
    classifier.add_argument('--head')
    classifier.add_argument('--pull-request', action='store_true')
    sub.add_parser('result')
    args = parser.parse_args(argv)
    if args.command == 'result':
        ok = result_ok(os.getenv('CI_CLASS'), os.getenv('CI_BASELINE'), os.getenv('CI_FULL'))
        print('CI required result: ' + ('PASS' if ok else 'FAIL'))
        return 0 if ok else 1
    if args.base is not None or args.head is not None:
        classification = classify_git(ROOT, args.base, args.head, pull_request=args.pull_request)
    else:
        try:
            event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
            classification = classify_event(ROOT, os.getenv('GITHUB_EVENT_NAME'), event,
                                             os.getenv('CI_CHECKOUT_REF'))
        except (OSError, ValueError, KeyError):
            classification = 'full'
    print(classification)
    return 0


if __name__ == '__main__':
    sys.exit(main())
