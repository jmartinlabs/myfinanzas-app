#!/usr/bin/env python3
"""Real rootless API/Quadlet fixture on a disposable runner; never production."""
import json
import os
from pathlib import Path
import shutil
import socket
import stat
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid


class ProbeError(Exception):
    pass


stage = 'setup'


def run(args, timeout=60):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        # Podman 125 means the application was not started. At this first run no
        # key/DB has been created; expose only the bounded runtime diagnostic.
        if stage == 'explicit-production-fixture-initialization' and result.returncode == 125:
            message = result.stderr[:1200].replace(os.environ.get('RUNNER_TEMP', '/tmp'), '<runner-temp>')
            message = message.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
            print('::error title=Podman pre-application runtime rejection::' + message)
        # No application command output: factors must never enter artifacts.
        raise ProbeError(f'{stage}: command failed, exit {result.returncode}')
    return result.stdout


def health(expected=True):
    for _ in range(60 if expected else 1):
        try:
            with urllib.request.urlopen('http://127.0.0.1:18081/api/health', timeout=1) as response:
                ok = response.status == 200 and json.load(response) == {'ok': True}
            if not expected:
                raise ProbeError('stopped API still reachable')
            if ok:
                return
        except (OSError, urllib.error.URLError):
            if not expected:
                return
        time.sleep(0.25)
    raise ProbeError('published API health not ready')


def main():
    global stage
    if os.getuid() in (0, 10001):
        raise ProbeError('runner UID must be non-root and differ from internal 10001')
    # Refuse a port already in use; never stop an unrelated service.
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 18081))
    root = Path(tempfile.mkdtemp(prefix='mf32-', dir=os.environ['RUNNER_TEMP']))
    os.chmod(root, 0o700)
    token = 'mf32-' + uuid.uuid4().hex
    api_name, writer_name = token + '-api', token + '-wal'
    unit_dir = Path.home() / '.config/containers/systemd'
    unit = unit_dir / (token + '.container')
    service = token + '.service'
    unit_identity = None
    evidence = {}
    try:
        stage = 'build-real-api-test-image'
        source = Path(__file__).resolve().parents[2]
        context = root / 'context'
        context.mkdir(mode=0o700)
        # Explicit allowlist, never use the checkout as container build context.
        for relative in ('package.json', 'bun.lock', 'apps/api/package.json', 'apps/web/package.json'):
            target = context / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source / relative, target)
        api = context / 'apps/api/src'
        api.mkdir()
        for path in (source / 'apps/api/src').glob('*.ts'):
            if not path.name.endswith('.test.ts'):
                shutil.copyfile(path, api / path.name)
        shutil.copyfile(source / 'infra/tests/Containerfile.probe', context / 'Containerfile')
        iidfile = root / 'image.id'
        run(['podman', 'build', '--platform=linux/amd64', '--no-cache',
             '--iidfile', str(iidfile), '--file', str(context / 'Containerfile'), str(context)], 420)
        image = iidfile.read_text().strip()
        if not image.startswith('sha256:') or len(image) != 71:
            raise ProbeError('invalid local image identifier')
        evidence['test-image-id'] = image
        evidence['scope'] = 'test image only; final reproducible release/OCI distribution pending'
        data = root / 'data'
        data.mkdir(mode=0o700)
        env = ['--env=NODE_ENV=production', '--env=APP_ORIGIN=https://myfinanzas.pp.ua',
               '--env=DATABASE_PATH=/var/lib/myfinanzas/state/database.sqlite',
               '--env=AUTH_KEY_PATH=/var/lib/myfinanzas/state/auth.key']
        hardened = ['--pull=never', '--userns=keep-id:uid=10001,gid=10001',
                    '--user=10001:10001', '--cap-drop=all', '--security-opt=no-new-privileges',
                    '--read-only', '--pids-limit=128', '--memory=1g', '--cpus=1',
                    '--tmpfs=/tmp:rw,noexec,nosuid,nodev,mode=0700,uid=10001,gid=10001,size=64m',
                    '--volume=' + str(data) + ':/var/lib/myfinanzas:rw']
        stage = 'explicit-production-fixture-initialization'
        run(['podman', 'run', '--rm', '--network=none', *hardened, *env,
             image, 'apps/api/src/production-init.ts'])
        state = data / 'state'
        for path, mode in [(data, 0o700), (state, 0o700),
                           (state / 'database.sqlite', 0o600), (state / 'auth.key', 0o600)]:
            info = path.lstat()
            if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != mode or path.is_symlink():
                raise ProbeError('host UID/permission invariant failed')
        evidence['host-private-permissions-and-uid'] = True
        stage = 'internal-uid-and-volume-ownership'
        identity_js = ('import {statSync} from "node:fs"; console.log(JSON.stringify({uid:process.getuid(),'
                       'gid:process.getgid(),owner:statSync("/var/lib/myfinanzas/state/auth.key").uid}));')
        identity = json.loads(run(['podman', 'run', '--rm', '--network=none', *hardened,
                                  image, '-e', identity_js]))
        if identity != {'uid': 10001, 'gid': 10001, 'owner': 10001}:
            raise ProbeError('internal UID/volume ownership mismatch')
        evidence['uid-10001-keep-id-real'] = True
        # Leave an idle connection open to retain a real, noncheckpointed WAL.
        stage = 'controlled-wal-commit'
        writer_js = ('import {openDatabase} from "./apps/api/src/database";'
                     'const db=openDatabase(process.env.DATABASE_PATH);'
                     'db.exec("PRAGMA wal_autocheckpoint=0; INSERT INTO counters VALUES(\'infra32_probe\',17)");'
                     'setInterval(()=>{},1000);')
        run(['podman', 'run', '-d', '--name', writer_name, '--network=none',
             *hardened, *env, image, '-e', writer_js])
        for _ in range(60):
            if (state / 'database.sqlite-wal').exists() and (state / 'database.sqlite-wal').stat().st_size > 0:
                break
            time.sleep(0.1)
        else:
            raise ProbeError('WAL fixture did not commit')
        stage = 'quadlet-generation-and-start'
        unit_dir.mkdir(parents=True, exist_ok=True)
        if any(char in str(data) for char in (' ', '\n', '%')):
            raise ProbeError('unsafe unit fixture path')
        content = f'''[Unit]
Description=Ephemeral MyFinanzas 32 infrastructure fixture
StartLimitIntervalSec=60
StartLimitBurst=3
[Container]
Image={image}
Pull=never
ContainerName={api_name}
UserNS=keep-id:uid=10001,gid=10001
User=10001
Group=10001
PublishPort=127.0.0.1:18081:3001
Volume={data}:/var/lib/myfinanzas:rw
Environment=NODE_ENV=production
Environment=APP_ORIGIN=https://myfinanzas.pp.ua
Environment=DATABASE_PATH=/var/lib/myfinanzas/state/database.sqlite
Environment=AUTH_KEY_PATH=/var/lib/myfinanzas/state/auth.key
Environment=API_BIND_HOST=0.0.0.0
NoNewPrivileges=true
ReadOnly=true
DropCapability=all
Tmpfs=/tmp:rw,noexec,nosuid,nodev,mode=0700,uid=10001,gid=10001,size=64m
PodmanArgs=--memory=1g --cpus=1 --pids-limit=128
[Service]
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
'''
        with unit.open('x') as output:
            output.write(content)
        info = unit.stat()
        unit_identity = (info.st_dev, info.st_ino)
        run(['systemctl', '--user', 'daemon-reload'])
        run(['systemctl', '--user', 'start', service])
        health()
        try:
            urllib.request.urlopen('http://127.0.0.1:18081/api/saldos', timeout=3)
            raise ProbeError('anonymous financial access unexpectedly permitted')
        except urllib.error.HTTPError as error:
            if error.code != 401:
                raise ProbeError('anonymous financial status must be 401')
        if run(['podman', 'port', api_name, '3001/tcp']).strip() != '127.0.0.1:18081':
            raise ProbeError('unexpected host port publication')
        evidence['published-host-health-200-finance-401'] = True
        stage = 'cross-namespace-negative-network'
        addresses = json.loads(run(['ip', '-j', '-4', 'address', 'show', 'scope', 'global']))
        ips = [row['local'] for item in addresses for row in item.get('addr_info', [])
               if row.get('family') == 'inet']
        if not ips:
            raise ProbeError('no external host interface for negative test')
        negative_js = ('try {await fetch(' + json.dumps('http://' + ips[0] + ':18081/api/health') +
                       ',{signal:AbortSignal.timeout(1500)});process.exit(1);}catch{process.exit(0);}')
        run(['podman', 'run', '--rm', '--pull=never', '--user=10001:10001', '--cap-drop=all',
             '--security-opt=no-new-privileges', '--read-only', '--network=slirp4netns',
             image, '-e', negative_js])
        evidence['non-loopback-unreachable-from-separate-container'] = True
        stage = 'restart-and-retained-wal'
        run(['systemctl', '--user', 'restart', service])
        health()
        check_js = ('import {openDatabase} from "./apps/api/src/database";'
                    'const db=openDatabase(process.env.DATABASE_PATH);'
                    'const n=db.query("SELECT next FROM counters WHERE name=\'infra32_probe\'").get();'
                    'const ok=db.query("PRAGMA integrity_check").get().integrity_check==="ok" && '
                    'db.query("PRAGMA foreign_key_check").all().length===0 && n?.next===17;'
                    'db.close();process.exit(ok?0:1);')
        run(['podman', 'exec', api_name, '/usr/local/bin/bun', '-e', check_js])
        for name in ('database.sqlite-wal', 'database.sqlite-shm'):
            info = (state / name).lstat()
            if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600 or info.st_nlink != 1:
                raise ProbeError('sidecar permission/ownership invariant failed')
        evidence['quadlet-restart-retains-committed-wal-and-integrity'] = True
        stage = 'controlled-stop'
        run(['systemctl', '--user', 'stop', service])
        health(False)
        evidence['stop-disconnects-published-api'] = True
        print('::notice title=Rootless integration PASS::' + json.dumps(evidence))
        if os.environ.get('GITHUB_STEP_SUMMARY'):
            with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
                summary.write('\n## Real rootless integration\n\n```json\n' + json.dumps(evidence, indent=2) + '\n```\n')
    finally:
        # Only names/files created by this invocation, never existing user units/data.
        subprocess.run(['systemctl', '--user', 'stop', service], capture_output=True, timeout=40)
        for name in (api_name, writer_name):
            subprocess.run(['podman', 'rm', '--force', name], capture_output=True, timeout=30)
        if unit_identity and unit.exists():
            info = unit.lstat()
            if (info.st_dev, info.st_ino) == unit_identity:
                unit.unlink()
                subprocess.run(['systemctl', '--user', 'daemon-reload'], capture_output=True, timeout=30)
        shutil.rmtree(root)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Fixed stage and class only: no keys, data, env or command output.
        detail = str(error) if isinstance(error, ProbeError) else type(error).__name__
        print('::error title=Rootless integration failed::stage=' + stage + '; reason=' + detail)
        sys.exit(1)
