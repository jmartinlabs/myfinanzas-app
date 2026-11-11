#!/usr/bin/env python3
"""Shared conservative classifier and fail-closed result gate (Python standard library)."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PROTECTED_NAMES = {
    'agents.md', 'claude.md', 'skill.md', 'instructions.md',
    'new_project_prompt.md',
}
PROTECTED_PATHS = {
    'specs/readme.md',
    'docs/claude_code.md',
    'docs/guia_visual_orquestacion.md',
}
PROTECTED_PREFIXES = (
    '.agents/', '.claude/', 'templates/',
    'specs/methodology/', 'specs/guidelines/',
)
# Markdown consumed by the application/build or harness. Non-Markdown paths are
# already full; these prefixes keep functional Markdown full as well.
FUNCTIONAL_PREFIXES = (
    'apps/', 'packages/', 'tests/', 'scripts/', '.github/', 'specs/fixtures/',
    'build/', 'dist/',
)
PROMPT_BACKUP = re.compile(r'prompt_backup.*\.md$')
DEPLOY_TAG = re.compile(
    r'refs/tags/deploy-test-v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$')

# Tests that spawn `age`/`age-keygen` or exercise encrypted backup/restore.
# They are excluded from the CRITICAL execution profile so it never needs apt
# packages; FULL runs the whole suite. Names must exist verbatim in
# apps/api/src/*.test.ts (scripts/test-ci-policy enforces it), so a rename is a
# visible failure instead of a silent coverage change.
FULL_ONLY_TESTS = (
    'AC24–26: backup WAL consistente/cifrado, restauración aislada, antigüedad y fallos',
    'AC24: snapshot de archivo WAL mientras otro proceso confirma escrituras',
    'AC26: fallo simulado ENOSPC en cifrado limpia temporales y conserva copia anterior',
    '03 AC20/21: actualización E1.2 genuina, acceso previo intacto y backups v2/v5',
    '02 AC31: base E1.1 genuina conserva tablas completas, MFA, sesiones y backup v1/v5',
    '07 O4 AC23/24: continuidad v7/v8 genuina demo/production, presupuestos/deuda/hechos/MFA, age9 y restore',
    'D5 AC-01: encrypted v18 restore preserves accreditation, evidence and revokes attempts',
    '06 D4 AC28/29: v6 genuina demo/producción ficticia, acceso/clave/historia y age7/MFA',
    'E4.10 I8: backup/restore v28 (fixture v26) conserva la ventana y no la reabre ni duplica',
    'E4.3 AC-24: v28 backup/manifest/restore keeps the valuation, audit and MFA and clears attempts',
    'E4.3 AC-24: historical v23 backups keep e4.4-v23 and restore unchanged',
    'E4.3 AC-24: restoring a v29 package fails without a destination',
    'E4.4 AC-24: v28 backup/manifest/restore keeps new fields, reconciliation and MFA',
    'E4.4 AC-24: historical v22 backups keep e35-v22 and restore; unadmitted versions fail',
    'E4.10 A: v28 backup/manifest/restore keeps the closure, photo, audit and MFA and clears attempts',
    'E4.9 A: historical v24 backups keep e4.3-v24 and restore unchanged',
    'E4.10 A: restoring a v29 package fails without a destination',
    'E4.1-AC-33(j): backup/restore 13, 14, 15, 16, 17 y 18 en directorio nuevo',
    'E4.1-AC-33(j): copia 14 desconocida no se publica',
    '04 AC28/29: upgrade v3 genuino conserva tablas/acceso, backup v3/v5 y restore aislado',
    'P11 genuine v9 demo/production migration retains MFA/key; encrypted v12 restore revokes cycle/annual/payroll attempts and retains delta audit',
    '08 B8 AC22: copia/restore8 recupera maestro/enlaces y rechaza8 ajeno',
    '31 P6 AC24–29: encrypted production identity roundtrip and crossing rejection',
    '31 P9 AC09/24/28/29: malformed markers and encrypted manifest/key corruption fail closed',
    '05 R4 AC28/29: v4 genuina conserva hechos/auditorías/acceso, restaura age v4/v5',
    '05 R10 AC29: manifiesto cifrado identifica v1–v5 y restaura cada esquema',
    'RESTORE-19/20: v19 cifrado conserva Comida y migra a v21',
    'RESTORE-19/20: v20 cifrado conserva D′ y revoca accesos',
    'RESTORE-19/20: negativos no publican destino parcial',
    'AC21: restore cifrado v18 conserva operaciones, devoluciones, reposiciones, vínculos, evidencias y auditoría',
    '31 S6: restore sync failures leave either no target or a complete validated pair',
    'SPEC36 v28: encrypted backup/restore preserves v28 and clears pending attempts',
    'E3.3/E3.2/E3.4 v18 backup manifest and restore preserve vehicle fichas and revoke sessions',
)

# 31 S3 is generated in a loop with three database/key names, so its resolved
# title cannot be listed literally. The prefix covers all three executions.
FULL_ONLY_PREFIXES = (
    '31 S3: reserved-name rejection / encrypted restore for ',
)
FULL_ONLY_DYNAMIC = 3

# Persistence, migration and recovery surfaces: a PR touching them runs FULL
# before merge so the encrypted backup/restore tests cannot be bypassed.
SENSITIVE = re.compile(
    r'^(?:apps/api/src/(?:backup|backup-cli|private-state|database|database-schema|'
    r'database-identity|schema-contract|sqlite[^/]*)\.ts|'
    r'apps/api/src/[^/]*-schema\.ts|'
    r'infra/(?:migrations/[^/]+|compatibility\.py|release\.py|smoke\.py))$')


def full_only_pattern():
    alternatives = [re.escape(name) + '$' for name in FULL_ONLY_TESTS]
    alternatives += [re.escape(prefix) for prefix in FULL_ONLY_PREFIXES]
    return '^(?!(' + '|'.join(alternatives) + ')).*$'


def full_only_expected():
    return len(FULL_ONLY_TESTS) + FULL_ONLY_DYNAMIC


def sensitive_path(path):
    return isinstance(path, str) and SENSITIVE.fullmatch(path) is not None


def full_only_file(path):
    """A test edit must run the tests it changes; age tests are filtered from critical."""
    if not isinstance(path, str) or not path.startswith('apps/api/src/') or not path.endswith('.test.ts'):
        return False
    try:
        text = (ROOT / path).read_text(encoding='utf-8')
    except OSError:
        return False
    return any(name in text for name in FULL_ONLY_TESTS)


def docs_path(path):
    # Documentation Markdown in any directory, except operational/harness files
    # and Markdown consumed by application/build paths. Non-Markdown is full.
    if not isinstance(path, str) or not path or '\\' in path:
        return False
    parts = path.split('/')
    if not all(p not in ('', '.', '..') for p in parts):
        return False
    lower = path.lower()
    name = parts[-1].lower()
    if not lower.endswith('.md'):
        return False
    if (name in PROTECTED_NAMES or PROMPT_BACKUP.fullmatch(name)
            or lower in PROTECTED_PATHS
            or any(lower.startswith(prefix) for prefix in PROTECTED_PREFIXES)
            or any(lower.startswith(prefix) for prefix in FUNCTIONAL_PREFIXES)):
        return False
    return True


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


def is_ancestor(root, ancestor, descendant):
    """True only when Git confirms a complete, existing ancestor relationship."""
    return subprocess.run(['git', '-C', str(root), 'merge-base', '--is-ancestor',
                           ancestor, descendant], stdout=subprocess.DEVNULL,
                          stderr=subprocess.PIPE).returncode == 0


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
            # Deploy tags carry no comparable "before" and must never borrow a
            # documentation-only exemption from an arbitrary old commit.
            if str(event.get('ref', '')).startswith('refs/tags/'):
                return 'full'
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
    if any(sensitive_path(p) or full_only_file(p) for p in paths):
        return 'full'
    if all(docs_path(p) for p in paths):
        return 'docs'
    return 'fast' if all(fast_path(p) for p in paths) else 'critical'


def ci_profile(root, event_name, event, checkout_ref=None):
    """Execution venue differs from docs/full coverage; invalid contexts fail closed."""
    if event_name == 'workflow_dispatch':
        return 'full'
    if event_name == 'push':
        ref = event.get('ref')
        after = event.get('after', '')
        if not re.fullmatch(r'[0-9a-f]{40}', after) or after == '0' * 40:
            raise ValueError('deleted or invalid push ref')
        if isinstance(ref, str) and ref.startswith('refs/tags/deploy-test-v'):
            # Deploy tags always run full over the exact tagged commit. The tag
            # ref (not the raw event SHA, which may be a tag object) is the
            # verified checkout ref, so resolve both to the same commit.
            if not DEPLOY_TAG.fullmatch(ref):
                raise ValueError('malformed deploy tag')
            try:
                tag_kind = git(root, 'cat-file', '-t', ref).strip()
            except (OSError, subprocess.SubprocessError):
                raise ValueError('deploy tag is unavailable')
            if tag_kind != b'tag':
                raise ValueError('deploy tag must be annotated')
            if checkout_ref != ref:
                raise ValueError('deploy tag checkout differs from the event')
            try:
                tagged = git(root, 'rev-parse', after + '^{commit}').decode().strip()
                head = git(root, 'rev-parse', 'HEAD').decode().strip()
            except (OSError, subprocess.SubprocessError):
                raise ValueError('deploy tag commit is unavailable')
            if head != tagged:
                raise ValueError('deploy tag checkout differs from the tag commit')
            return 'full'
        # main/test push compatibility is retained for historical agent runs;
        # the workflows no longer trigger postmerge pushes.
        if ref not in ('refs/heads/main', 'refs/heads/test'):
            raise ValueError('only main/test pushes and deploy tags are supported')
        if git(root, 'rev-parse', 'HEAD').decode().strip() != after or checkout_ref != after:
            raise ValueError('postmerge snapshot differs from event')
        before = event.get('before')
        if not re.fullmatch(r'[0-9a-f]{40}', before or '') or before == '0' * 40:
            return 'fast'
        try:
            git(root, 'merge-base', '--is-ancestor', before, event['after'])
            return 'docs' if classify_git(root, before, event['after']) == 'docs' else 'fast'
        except (OSError, subprocess.SubprocessError):
            return 'fast'
    if event_name != 'pull_request':
        raise ValueError('unsupported CI event')
    pr = event.get('pull_request', {})
    if pr.get('base', {}).get('ref') not in ('main', 'test'):
        raise ValueError('only PRs targeting main or test are supported')
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
            # A queued run can fetch a merge ref rebuilt on a newer integration
            # base (main or test), so the event snapshot may be an older base.
            # Only a base that advanced from that snapshot is legitimate; a
            # rewritten, divergent or older merge ref still fails closed.
            # Ancestry does not prove the tested base is the current tip: the
            # checked-out SHA remains the tested one.
            if not is_ancestor(root, base, tested_base):
                raise ValueError('event base is not an ancestor of the tested integration base')
            base = tested_base
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
    expected['prepare'] = 'success' if profile == 'full' else 'skipped'
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
