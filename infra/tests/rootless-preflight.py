#!/usr/bin/env python3
"""Read/probe only the disposable runner. No VPS or application state required."""
import json
import os
from pathlib import Path
import pwd
import subprocess
import sys


def command(args):
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=30)
        return result.returncode == 0, result.stdout
    except (OSError, subprocess.TimeoutExpired):
        return False, ''


def subordinate_ids(path):
    user = pwd.getpwuid(os.getuid()).pw_name
    for line in Path(path).read_text().splitlines():
        fields = line.split(':')
        if len(fields) == 3 and fields[0] in (user, str(os.getuid())):
            if fields[1].isdigit() and fields[2].isdigit() and int(fields[2]) >= 65536:
                return True
    return False


def main():
    checks = {'non-root-operator': os.getuid() != 0}
    for name in ('subuid', 'subgid'):
        try:
            checks[name] = subordinate_ids('/etc/' + name)
        except OSError:
            checks[name] = False
    checks['user-namespace'], _ = command(['unshare', '--user', '--map-root-user', 'true'])
    checks['cgroup-v2'] = Path('/sys/fs/cgroup/cgroup.controllers').is_file()
    checks['systemd-user'], _ = command(['systemctl', '--user', 'show-environment'])
    # Prove execution by a real user manager; do not manufacture a manager or use sudo.
    checks['systemd-user-execution'], _ = command([
        'systemd-run', '--user', '--wait', '--pipe', '--collect',
        '--unit=mf32-preflight-' + str(os.getpid()), '/usr/bin/true'])
    ok, info_text = command(['podman', 'info', '--format', 'json'])
    try:
        info = json.loads(info_text) if ok else {}
    except ValueError:
        info = {}
    host = info.get('host', {})
    checks['podman-rootless'] = host.get('security', {}).get('rootless') is True
    checks['podman-cgroup-v2'] = host.get('cgroupVersion') == 'v2'
    checks['podman-systemd-manager'] = host.get('cgroupManager') == 'systemd'
    checks['podman-uidmap'] = any(
        row.get('size', 0) >= 65536 for row in host.get('idMappings', {}).get('uidmap', []))
    checks['podman-gidmap'] = any(
        row.get('size', 0) >= 65536 for row in host.get('idMappings', {}).get('gidmap', []))
    delegation_probe = (
        'import os,pathlib,sys; '
        'group=next(line.split(":",2)[2] for line in '
        'pathlib.Path("/proc/self/cgroup").read_text().splitlines() if line.startswith("0::")); '
        'p=pathlib.Path("/sys/fs/cgroup")/group.lstrip("/"); '
        'sys.exit(0 if all(os.access(p/name,os.W_OK) for name in '
        '("cgroup.procs","cgroup.subtree_control")) else 1)')
    checks['delegated-user-cgroup'], _ = command([
        'systemd-run', '--user', '--wait', '--pipe', '--collect',
        '--property=Delegate=yes', '--unit=mf32-delegation-' + str(os.getpid()),
        sys.executable, '-c', delegation_probe])
    versions = {}
    for name, args in {
        'podman': ['podman', '--version'], 'systemd': ['systemctl', '--version'],
        'kernel': ['uname', '-r'], 'uidmap': ['dpkg-query', '-W', '-f=${Version}', 'uidmap'],
    }.items():
        ok, value = command(args)
        versions[name] = value.splitlines()[0][:160] if ok and value else 'unavailable'
    report = {'checks': checks, 'versions': versions, 'compatible': all(checks.values()),
              'scope': 'ephemeral ubuntu-24.04 runner only; no VPS verification'}
    # Selected booleans/version strings only. Never dump environment or podman info.
    print(json.dumps(report, indent=2))
    safe_versions = json.dumps(versions).replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    print("::notice title=Rootless versions::" + safe_versions)
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a') as output:
            output.write('## Rootless capability gate\n\n')
            output.write('| Check | Result |\n| --- | --- |\n')
            for name, passed in checks.items():
                output.write(f'| {name} | {"PASS" if passed else "BLOCKED"} |\n')
            output.write('\nVersions: ' + json.dumps(versions) + '\n')
            output.write('\nNo application data, keys or production secrets were used.\n')
    if not report['compatible']:
        failed = ', '.join(name for name, passed in checks.items() if not passed)
        print('::error title=Rootless capability gate blocked::' + failed)
        print('BLOCKED: stop here; propose a disposable Debian 13 VM. No mocked PASS.')
        return 1
    print('::notice title=Rootless capability gate passed::real user manager and rootless prerequisites verified')
    return 0


if __name__ == '__main__':
    sys.exit(main())
