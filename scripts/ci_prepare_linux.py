"""Prepare only missing approved Chromium/age packages; never substitute a browser."""
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CLI = ['node', 'node_modules/@playwright/test/cli.js']
APT_OPTIONS = ['-o', 'Acquire::Retries=3', '-o', 'DPkg::Lock::Timeout=120']
DETAIL_LIMIT = 500


def run(command):
    return subprocess.run(command, capture_output=True, text=True,
                          env={**os.environ, 'LC_ALL': 'C'}, check=False)


def failure_detail(command, result):
    fields = [f'command {" ".join(command)} exited {result.returncode}']
    for label in ('stderr', 'stdout'):
        text = ' '.join((getattr(result, label, '') or '').split())[:DETAIL_LIMIT]
        if text:
            fields.append(f'{label}: {text}')
    return '; '.join(fields)


def prepare(root, execute=run, os_release=None, machine=None, mode='full'):
    root = Path(root)
    info = dict(line.split('=', 1) for line in
                (Path('/etc/os-release').read_text() if os_release is None else os_release).splitlines()
                if '=' in line)
    if info.get('ID', '').strip('"') != 'ubuntu' or info.get('VERSION_ID', '').strip('"') != '24.04':
        raise ValueError('approved Ubuntu 24.04 required')
    if (platform.machine() if machine is None else machine) != 'x86_64':
        raise ValueError('approved x64 runner required')
    if mode not in ('api', 'full'):
        raise ValueError('unsupported preparation profile')
    manifest = json.loads((root / 'scripts/ci-linux-packages.json').read_text())
    expected = json.loads((root / 'package.json').read_text())['devDependencies']['@playwright/test']
    if manifest['playwright'] != expected:
        raise ValueError('Playwright package plan must be reviewed for the installed version')
    version_command = CLI + ['--version']
    version = execute(version_command) if mode == 'full' else None
    if mode == 'full' and (version.returncode or version.stdout.strip() != 'Version ' + expected):
        raise ValueError('installed Playwright CLI differs from approved dependency: '
                         + failure_detail(version_command, version))
    packages = manifest['packages']
    if (not isinstance(packages, list) or not packages or 'age' not in packages
            or len(set(packages)) != len(packages)
            or any(not isinstance(p, str) or not re.fullmatch(r'[a-z0-9][a-z0-9+.-]*', p) for p in packages)):
        raise ValueError('invalid approved package list')
    if mode == 'api':
        packages = ['age']
    missing = []
    for package in packages:
        command = ['dpkg-query', '-W', '-f=${db:Status-Status}', package]
        result = execute(command)
        if result.returncode == 0:
            if result.stdout.strip() != 'installed':
                missing.append(package)
        elif result.returncode == 1 and result.stderr.strip() == f'dpkg-query: no packages found matching {package}':
            missing.append(package)
        else:
            raise ValueError('package inventory failed: ' + failure_detail(command, result))
    if missing:
        for command in (['sudo', 'apt-get', *APT_OPTIONS, 'update'],
                        ['sudo', 'apt-get', *APT_OPTIONS, 'install', '-y', '--no-install-recommends', '--', *missing]):
            result = execute(command)
            if result.returncode:
                raise ValueError('approved package installation failed: ' + failure_detail(command, result))
    print(f'CI Linux packages: {len(packages) - len(missing)} present, {len(missing)} installed.')
    return missing


def main():
    try:
        mode = sys.argv[1] if len(sys.argv) == 2 else 'full' if len(sys.argv) == 1 else ''
        prepare(ROOT, mode=mode)
        return 0
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        print(f'CI Linux preparation detail: {error}', file=sys.stderr)
        print('CI Linux preparation failed; browser checks must not be skipped.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
