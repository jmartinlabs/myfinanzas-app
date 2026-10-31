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


def run(args, timeout=60, env=None):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout,
                            env={**os.environ, **(env or {})})
    if result.returncode:
        # Podman 125 means the application was not started. At this first run no
        # key/DB has been created; expose only the bounded runtime diagnostic.
        if stage == 'explicit-production-fixture-initialization' and result.returncode == 125:
            message = result.stderr[:1200].replace(os.environ.get('RUNNER_TEMP', '/tmp'), '<runner-temp>')
            message = message.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
            print('::error title=Podman pre-application runtime rejection::' + message)
        # No application command output: factors must never enter artifacts.
        detail = ''
        if stage in ('previous-version-backup-restore', 'real-cross-version-update', 'current-version-backup-restore', 'previous-version-restored-copy'):
            detail = ' :: ' + result.stderr[-500:].replace('\n', ' | ')
        raise ProbeError(f'{stage}: command failed, exit {result.returncode}{detail}')
    return result.stdout


def e14_diagnostics(stderr):
    """Expose only the existing E1.4 reporter's technical enums, never payloads."""
    import re
    codes = {'SQLITE_BUSY', 'SQLITE_BUSY_RECOVERY', 'SQLITE_BUSY_SNAPSHOT', 'SQLITE_LOCKED',
             'SQLITE_LOCKED_SHAREDCACHE', 'SQLITE_ERROR', 'SQLITE_CONSTRAINT',
             'SQLITE_CONSTRAINT_FOREIGNKEY', 'SQLITE_CANTOPEN', 'SQLITE_IOERR',
             'SQLITE_FULL', 'SQLITE_READONLY', 'SQLITE_NOMEM', 'SQLITE_MISUSE'}
    result = []
    for line in stderr.splitlines():
        marker = 'E1.4 child diagnostic '
        if marker not in line:
            continue
        try:
            value = json.loads(re.sub(r'\x1b\[[0-9;]*m', '', line.split(marker, 1)[1]))
        except (ValueError, TypeError):
            continue
        operation = value.get('operation')
        if operation not in ('upgrade', 'idempotent-write', 'rectification'):
            operation = 'unknown'
        errors = []
        for item in value.get('errors', [])[:4]:
            error = item.get('error', {})
            location = error.get('location')
            if not isinstance(location, str) or not re.fullmatch(r'(?:database|database-schema|database-identity|private-state|auth|movimientos|referencias|movement-ledger|movement-impact|reference-schema)\.ts:[0-9]+:[0-9]+', location):
                location = None
            errors.append({'phase': item.get('phase') if item.get('phase') in ('open', 'write', 'close') else 'unknown',
                           'code': error.get('code') if error.get('code') in codes else 'UNCLASSIFIED',
                           'errno': error.get('errno') if type(error.get('errno')) is int else None,
                           'location': location})
        result.append({'operation': operation, 'exit': value.get('exit') if type(value.get('exit')) is int else None,
                       'errors': errors})
    return result


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
    evidence = {'host-uid': os.getuid(), 'host-gid': os.getgid()}
    try:
        stage = 'build-reproducible-private-release'
        source = Path(__file__).resolve().parents[2]
        sys.path.insert(0, str(source / 'infra'))
        from release import build, verify, sha
        output = root / 'release'
        manifest = build(output)
        image = manifest['image']
        evidence['final-image-id'] = image
        evidence['release-source'] = manifest['inputs']['source']
        evidence['oci-manifest-digest'] = manifest['oci_manifest_digest']
        evidence['two-clean-builds-payload-equal'] = manifest['reproducibility']['payload_equal']
        digest = (output / 'manifest.sha256').read_text().strip()
        evidence['release-manifest-sha256'] = digest
        evidence['rootfs-payload-sha256'] = manifest['rootfs_payload_sha256']
        evidence['runtime-os'] = manifest['runtime_os']
        evidence['runtime-bun-age'] = {'bun': manifest['inputs']['bun'], 'age': manifest['inputs']['age']}
        verify(output, manifest['inputs']['source'], digest)
        # Real corruption checks; never accept a foreign frontend or manifest.
        index = output / 'frontend/index.html'
        original = index.read_bytes()
        index.write_bytes(original + b'<!-- synthetic mismatch -->')
        rejected = False
        try:
            verify(output, manifest['inputs']['source'], digest)
        except Exception:
            rejected = True
        finally:
            index.write_bytes(original)
        if not rejected:
            raise ProbeError('foreign frontend was accepted')
        # Reject corrupted OCI and an untrusted manifest pin before loading state.
        archive = output / 'image.oci.tar'
        with archive.open('r+b') as stream:
            first = stream.read(1)
            stream.seek(0); stream.write(bytes([first[0] ^ 1]))
        try:
            verify(output, manifest['inputs']['source'], digest)
        except Exception:
            pass
        else:
            raise ProbeError('corrupt OCI was accepted')
        finally:
            with archive.open('r+b') as stream:
                stream.write(first)
        try:
            verify(output, manifest['inputs']['source'], '0' * 64)
        except Exception:
            pass
        else:
            raise ProbeError('wrong manifest trust pin was accepted')
        verify(output, manifest['inputs']['source'], digest)
        evidence['frontend-backend-integrity-and-negative'] = True
        data = root / 'data'
        data.mkdir(mode=0o700)
        env = ['--env=NODE_ENV=production', '--env=APP_ORIGIN=https://myfinanzas.pp.ua',
               '--env=DATABASE_PATH=/var/lib/myfinanzas/state/database.sqlite',
               '--env=AUTH_KEY_PATH=/var/lib/myfinanzas/state/auth.key']
        hardened = ['--pull=never', '--http-proxy=false', '--userns=keep-id:uid=10001,gid=10001',
                    '--user=10001:10001', '--cap-drop=all', '--security-opt=no-new-privileges',
                    '--read-only', '--read-only-tmpfs=false', '--pids-limit=128', '--memory=1g', '--cpus=1',
                    '--tmpfs=/tmp:rw,noexec,nosuid,nodev,tmpcopyup,mode=0711,size=64m',
                    '--volume=' + str(data) + ':/var/lib/myfinanzas:rw']
        stage = 'synthetic-host-proxy-inheritance-boundary'
        proxy_host = dict(os.environ, HTTP_PROXY='http://MF32_SYNTHETIC_PROXY_CANARY@127.0.0.1:9',
                          http_proxy='http://MF32_SYNTHETIC_PROXY_CANARY@127.0.0.1:9')
        proxy_js = 'process.exit(Object.values(process.env).some(value=>value?.includes("MF32_SYNTHETIC_PROXY_CANARY"))?42:0)'
        control = subprocess.run(['podman', 'run', '--rm', '--network=none',
                                  *(flag for flag in hardened if flag != '--http-proxy=false'),
                                  image, '-e', proxy_js], env=proxy_host, capture_output=True, timeout=60)
        if control.returncode not in (0, 42):
            raise ProbeError('synthetic proxy control did not execute')
        protected = subprocess.run(['podman', 'run', '--rm', '--network=none', *hardened,
                                    image, '-e', proxy_js], env=proxy_host, capture_output=True, timeout=60)
        if protected.returncode != 0:
            raise ProbeError('runtime inherited synthetic host proxy')
        evidence['podman-default-forwarded-synthetic-proxy'] = control.returncode == 42
        evidence['explicit-runtime-proxy-inheritance-blocked'] = True
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
        identity_js = ('import {statSync,writeFileSync,unlinkSync} from "node:fs";'
                       'let writable=false;try{writeFileSync("/tmp/private/owned-probe","probe",{mode:0o600,flag:"wx"});'
                       'unlinkSync("/tmp/private/owned-probe");writable=true;}catch{};console.log(JSON.stringify({uid:process.getuid(),'
                       'gid:process.getgid(),owner:statSync("/var/lib/myfinanzas/state/auth.key").uid,'
                       'tmpowner:statSync("/tmp/private").uid,tmpmode:statSync("/tmp/private").mode&0o777,writable,'
                       'parentOwner:statSync("/tmp").uid,parentMode:statSync("/tmp").mode&0o777}));')
        identity = json.loads(run(['podman', 'run', '--rm', '--network=none', *hardened,
                                  image, '-e', identity_js]))
        if identity != {'uid': 10001, 'gid': 10001, 'owner': 10001, 'tmpowner': 10001, 'tmpmode': 0o700,
                        'writable': True, 'parentOwner': 0, 'parentMode': 0o711}:
            print('::error title=Nonsecret UID and tmpfs evidence::' + json.dumps(identity))
            raise ProbeError('internal UID/volume ownership mismatch')
        evidence['uid-10001-keep-id-real'] = True
        stage = 'effective-runtime-hardening'
        hardening_js = ('import {readFileSync,writeFileSync,copyFileSync,chmodSync} from "node:fs";'
                        'const status=readFileSync("/proc/self/status","utf8");'
                        'if(!/^CapEff:\\s+0+$/m.test(status)||!/^NoNewPrivs:\\s+1$/m.test(status))process.exit(1);'
                        'let denied=false;try{writeFileSync("/app/forbidden","probe")}catch(e){denied=e.code==="EROFS"||e.code==="EACCES"}'
                        'if(!denied)process.exit(2);'
                        'copyFileSync("/bin/true","/tmp/private/noexec-probe");chmodSync("/tmp/private/noexec-probe",0o700);'
                        'let blocked=false;try{Bun.spawnSync(["/tmp/private/noexec-probe"]);}catch(e){blocked=e.code==="EACCES";}'
                        'if(!blocked)process.exit(3);'
                        'if(readFileSync("/sys/fs/cgroup/memory.max","utf8").trim()!=="1073741824")process.exit(4);'
                        'if(readFileSync("/sys/fs/cgroup/pids.max","utf8").trim()!=="128")process.exit(5);'
                        'const [quota,period]=readFileSync("/sys/fs/cgroup/cpu.max","utf8").trim().split(/\\s+/).map(Number);'
                        'if(quota/period!==1)process.exit(6);')
        run(['podman', 'run', '--rm', '--network=none', *hardened, image, '-e', hardening_js])
        evidence['effective-no-capabilities-nnp-readonly-noexec'] = True

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
        from runtime import render
        content = render(image, data, api_name)
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
        visibility = run(['podman', 'inspect', api_name]) + run(['podman', 'logs', api_name])
        visibility += run(['podman', 'history', '--no-trunc', '--format=json', image])
        visibility += run(['podman', 'image', 'inspect', image])
        import base64
        key_bytes = (state / 'auth.key').read_bytes()
        if any(secret in visibility for secret in (key_bytes.hex(), base64.b64encode(key_bytes).decode())):
            raise ProbeError('authentication key leaked through operational metadata/logs')
        evidence['key-absent-from-logs-inspect-env-history'] = True
        # A v4-only publication must not expose an IPv6 loopback listener either.
        try:
            with socket.create_connection(('::1', 18081), timeout=1):
                raise ProbeError('unexpected IPv6 API publication')
        except OSError:
            pass
        evidence['ipv6-loopback-not-published'] = True
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
        stage = 'bounded-restart-after-sigkill'
        run(['systemctl', '--user', 'reset-failed', service])
        run(['systemctl', '--user', 'start', service])
        health()
        run(['podman', 'healthcheck', 'run', api_name])
        details = json.loads(run(['podman', 'inspect', api_name]))[0]
        if details['State']['Health']['Status'] != 'healthy' or not details['HostConfig']['ReadonlyRootfs']:
            raise ProbeError('runtime health/read-only invariant failed')
        run(['podman', 'kill', '--signal=KILL', api_name])
        # Wait for the actual new systemd-managed container, not stale port health.
        for _ in range(80):
            attempts = int(run(['systemctl', '--user', 'show', service, '--property=NRestarts', '--value']).strip())
            if attempts >= 1:
                break
            time.sleep(0.25)
        else:
            raise ProbeError('systemd did not restart killed API')
        health()
        run(['podman', 'exec', api_name, '/usr/local/bin/bun', '-e', check_js])
        run(['systemctl', '--user', 'stop', service])
        evidence['healthcheck-and-sigkill-restart-preserve-wal'] = True
        stage = 'real-unhealthy-to-systemd-restart'
        run(['systemctl', '--user', 'reset-failed', service])
        run(['systemctl', '--user', 'start', service])
        health()
        # Exercise the production grace/timeout/retry policy unchanged. SIGSTOP
        # freezes only Bun PID1, so independent health execs can detect failure.
        from datetime import datetime, timezone
        started = json.loads(run(['podman', 'inspect', api_name]))[0]['State']['StartedAt']
        started_at = datetime.fromisoformat(started.replace('Z', '+00:00'))
        while (datetime.now(timezone.utc) - started_at).total_seconds() < 31:
            time.sleep(0.25)
        baseline_restarts = int(run(['systemctl', '--user', 'show', service, '--property=NRestarts', '--value']).strip())
        run(['podman', 'kill', '--signal=STOP', api_name])
        failed_health = 0
        for _ in range(3):
            checked = subprocess.run(['podman', 'healthcheck', 'run', api_name], capture_output=True, timeout=10)
            if checked.returncode == 0:
                raise ProbeError('stopped Bun unexpectedly passed health')
            failed_health += 1
        for _ in range(80):
            attempts = int(run(['systemctl', '--user', 'show', service, '--property=NRestarts', '--value']).strip())
            if attempts > baseline_restarts:
                break
            time.sleep(0.25)
        else:
            raise ProbeError('unhealthy container did not cause systemd restart')
        health()
        run(['podman', 'exec', api_name, '/usr/local/bin/bun', '-e', check_js])
        run(['systemctl', '--user', 'stop', service])
        evidence['health-failures-drive-bounded-systemd-restart'] = failed_health

        stage = 'bounded-invalid-configuration-restarts'
        before = {p.name: sha(p.read_bytes()) for p in state.iterdir() if p.is_file()}
        unit.write_text(content.replace('Environment=API_BIND_HOST=0.0.0.0', 'Environment=API_BIND_HOST=invalid'))
        run(['systemctl', '--user', 'daemon-reload'])
        run(['systemctl', '--user', 'reset-failed', service])
        subprocess.run(['systemctl', '--user', 'start', service], capture_output=True, timeout=30)
        # systemd 255 retains Result=exit-code after the start-limit rejection.
        # Verify bounded behavior rather than a version-specific Result label.
        properties = {}
        for _ in range(280):
            raw = run(['systemctl', '--user', 'show', service,
                       '--property=Result,NRestarts,ActiveState,SubState,ExecMainStatus,StartLimitBurst,StartLimitIntervalUSec,RestartUSec'])
            properties = dict(row.split('=', 1) for row in raw.splitlines())
            if properties.get('ActiveState') == 'failed' and properties.get('NRestarts') == '3':
                break
            time.sleep(0.25)
        else:
            print('::error title=Nonsecret startup-limit properties::' + json.dumps(properties))
            raise ProbeError('invalid startup did not stop at configured start limit')
        if properties.get('StartLimitBurst') != '3' or properties.get('StartLimitIntervalUSec') != '1min' or properties.get('RestartUSec') != '5s' or properties.get('ExecMainStatus') != '1':
            raise ProbeError('effective startup limit differs from approved contract')
        # Two backoff periods later the failed service must still be stopped.
        until = time.monotonic() + 11
        while time.monotonic() < until:
            if run(['systemctl', '--user', 'show', service, '--property=NRestarts', '--value']).strip() != '3':
                raise ProbeError('invalid startup continued restarting beyond limit')
            time.sleep(0.25)
        if run(['systemctl', '--user', 'show', service, '--property=ActiveState', '--value']).strip() != 'failed':
            raise ProbeError('invalid startup did not remain stopped')
        if before != {p.name: sha(p.read_bytes()) for p in state.iterdir() if p.is_file()}:
            raise ProbeError('invalid startup modified existing state')
        health(False)
        evidence['invalid-startup-bounded-no-state-repair'] = True

        # Every API regression runs against the definitive runtime dependencies.
        # Test sources are mounted read-only; no tests/dev tools enter the image.
        stage = 'final-image-api-regressions'
        suite = root / 'suite'
        suite.mkdir(mode=0o700)
        for prefix in ('apps/api/src', 'apps/api/test-support', 'apps/web/src'):
            for relative in run(['git', 'ls-tree', '-r', '--name-only', 'HEAD', '--', prefix]).splitlines():
                # API tests import shared web modules; runtime JSON manifests
                # are imported by TS modules and must travel with the suite.
                if not relative.endswith(('.ts', '.tsx', '.json')):
                    continue
                destination = suite / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(subprocess.check_output(['git', 'show', 'HEAD:' + relative]))
        # #31 adds real fcntl lock-holder fixtures requiring Python, not an app
        # dependency. Copy the runner's interpreter/stdlib/loader into the private
        # read-only test mount; never add Python or broad host mounts to runtime.
        import sysconfig
        tools = suite / 'tools'
        (tools / 'bin').mkdir(parents=True)
        (tools / 'lib').mkdir()
        executable = Path(sys.executable).resolve()
        shutil.copyfile(executable, tools / 'bin/python3-real')
        (tools / 'bin/python3-real').chmod(0o755)
        stdlib = Path(sysconfig.get_path('stdlib'))
        shutil.copytree(stdlib, tools / 'lib' / stdlib.name,
                        ignore=shutil.ignore_patterns('site-packages', '__pycache__'))
        import re
        libraries = set()
        for binary in [executable, *(p for p in stdlib.rglob('*.so') if 'site-packages' not in p.parts)]:
            linked = subprocess.run(['ldd', str(binary)], capture_output=True, text=True, timeout=10)
            if linked.returncode:
                raise ProbeError('test-only Python dependency inspection failed')
            libraries.update(re.findall(r'(?:=> )?(/[^ \n]+)', linked.stdout))
        for library in libraries:
            path = Path(library)
            destination = tools / 'lib' / path.name
            if destination.exists() and sha(destination.read_bytes()) != sha(path.read_bytes()):
                raise ProbeError('test-only Python library collision')
            shutil.copyfile(path, destination)
            destination.chmod(0o755)
        loader = tools / 'lib/ld-linux-x86-64.so.2'
        if not loader.exists():
            raise ProbeError('unsupported runner Python loader')
        launcher = tools / 'bin/python3'
        launcher.write_text('#!/bin/sh\nexport PYTHONHOME=/suite/tools\nexec /suite/tools/lib/ld-linux-x86-64.so.2 --library-path /suite/tools/lib /suite/tools/bin/python3-real "$@"\n')
        launcher.chmod(0o755)
        evidence['test-only-python'] = sys.version.split()[0]
        for relative in ('package.json', 'bun.lock', 'apps/api/package.json', 'apps/web/package.json'):
            destination = suite / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(subprocess.check_output(['git', 'show', 'HEAD:' + relative]))
        (suite / 'node_modules').symlink_to('/app/node_modules')
        (suite / 'apps/api/node_modules').symlink_to('/app/apps/api/node_modules')
        result = subprocess.run(['podman', 'run', '--rm', '--network=none',
                                 *hardened, '--memory=2g', '--pids-limit=512', '--cpus=2',
                                 '--env=NODE_ENV=test', '--env=PATH=/suite/tools/bin:/usr/local/bin:/usr/bin:/bin', '--volume=' + str(suite) + ':/suite:ro',
                                 '--workdir=/suite', image, 'test', 'apps/api'],
                                capture_output=True, text=True, timeout=600)
        # Never emit raw test output: authentication fixtures can contain factors.
        import re
        counts = re.search(r'(\d+) pass.*?(\d+) fail', result.stderr, re.S)
        if result.returncode or not counts or int(counts[2]) != 0:
            for diagnostic in e14_diagnostics(result.stderr):
                print('::error title=E1.4 sanitized child diagnostic::' + json.dumps(diagnostic))
            # Emit only labels literally declared in reviewed test sources, never
            # assertions, exception payloads, stdout or authentication factors.
            declared = set()
            for test in (suite / 'apps/api/src').glob('*.test.ts'):
                declared.update(re.findall(r'test\(\s*["\']([^"\']+)["\']', test.read_text()))
            failed = [label for label in declared if '(fail) ' + label in result.stderr]
            # Test labels are static source strings; never print assertions,
            # exception payloads, stdout or authentication factors.
            failed_lines = [line.strip()[:200] for line in result.stderr.splitlines()
                            if '(fail) ' in line]
            # Error classes and module paths only; never raw assertions or payloads.
            kinds = sorted(set(re.findall(
                r'\b(Cannot find module|SyntaxError|TypeError|ReferenceError|Unhandled error|panic|ENOENT|EACCES|EADDRINUSE|SQLITE_[A-Z_]+)\b',
                result.stderr)))
            missing = sorted(set(re.findall(r"Cannot find module '([^']+)'", result.stderr)))
            print('::error title=Final image regression labels::' + json.dumps({'exit': result.returncode, 'counts': counts.groups() if counts else None, 'failed': sorted(failed), 'failed_lines': failed_lines, 'error_kinds': kinds, 'missing_modules': missing, 'timeout_present': 'Test timed out after' in result.stderr, 'locations': sorted(set(re.findall(r'apps/api/src/[a-z0-9-]+\.test\.ts:\d+:\d+', result.stderr)))}))
            raise ProbeError('final image API regression failed; private output not published')
        evidence['final-image-api-tests-passed'] = int(counts[1])
        stage = 'previous-private-release-build'
        previous_ref = subprocess.check_output(
            ['git', '-C', str(source), 'merge-base', 'HEAD', 'origin/main'],
            text=True).strip()
        previous = build(root / 'previous', ref=previous_ref)
        same_contracts = previous['inputs']['contracts'] == manifest['inputs']['contracts']
        authorization = None
        if not same_contracts:
            before = previous['inputs']['contracts'].get('schema')
            after = manifest['inputs']['contracts'].get('schema')
            auth_path = source / 'infra/migrations' / f'{before}-to-{after}.json'
            try:
                authorization = json.loads(auth_path.read_text())
            except (OSError, ValueError):
                raise ProbeError('missing migration authorization; no rollback authorized')
        matrix = root / 'matrix'
        matrix.mkdir(mode=0o700)
        matrix_flags = [flag for flag in hardened if not flag.startswith('--volume=')]
        matrix_flags += ['--volume=' + str(matrix) + ':/var/lib/myfinanzas:rw',
                         '--volume=' + str(source / 'infra/tests/release-contract.mjs') + ':/app/apps/api/infra-contract.mjs:ro',
                         '--volume=' + str(source / 'infra/tests/release-fixture.mjs') + ':/app/apps/api/release-fixture.mjs:ro']
        stage = 'previous-version-explicit-initialization'
        run(['podman', 'run', '--rm', '--network=none', *matrix_flags, *env,
             previous['image'], 'apps/api/src/production-init.ts'])
        stage = 'real-cross-version-seed'
        run(['podman', 'run', '--rm', '--network=none', *matrix_flags, *env,
             previous['image'], '/app/apps/api/infra-contract.mjs', 'seed'], timeout=180)
        if same_contracts:
            for version, action in [(manifest, 'update'),
                                    (previous, 'rollback'), (manifest, 'restore')]:
                stage = 'real-cross-version-' + action
                run(['podman', 'run', '--rm', '--network=none', *matrix_flags, *env,
                     version['image'], '/app/apps/api/infra-contract.mjs', action], timeout=180)
            proof = {'previous_source': previous['inputs']['source'],
                     'current_source': manifest['inputs']['source'],
                     'previous_image': previous['image'], 'current_image': manifest['image'],
                     **{check: True for check in CHECKS}}
        else:
            # Restore-only rollback: previous version keeps a restored copy made
            # before the upgrade; the upgraded state is never downgraded in place.
            stage = 'previous-version-backup-restore'
            seed_state = matrix / 'fixture-private.json'
            seed_copy = matrix / 'fixture-private-seed.json'
            shutil.copyfile(seed_state, seed_copy)
            run(['podman', 'run', '--rm', '--network=none', *matrix_flags, *env,
                 '--env=RELEASE_DEBUG=1',
                 '--env=EXPECTED_MOVEMENTS=3', '--env=SKIP_DERIVED=1',
                 previous['image'], '/app/apps/api/infra-contract.mjs', 'restore'], timeout=180)
            shutil.copyfile(seed_state, matrix / 'fixture-private-previous.json')
            shutil.copyfile(seed_copy, seed_state)
            stage = 'real-cross-version-update'
            run(['podman', 'run', '--rm', '--network=none', *matrix_flags, *env,
                 '--env=RELEASE_DEBUG=1',
                 manifest['image'], '/app/apps/api/infra-contract.mjs', 'update'], timeout=180)
            stage = 'reject-in-place-downgrade'
            negative = subprocess.run(
                ['podman', 'run', '--rm', '--network=none', *matrix_flags, *env,
                 previous['image'], '/app/apps/api/infra-contract.mjs', 'verify'],
                capture_output=True, text=True, timeout=180)
            if negative.returncode == 0:
                raise ProbeError('previous release accepted upgraded schema in place')
            stage = 'current-version-backup-restore'
            run(['podman', 'run', '--rm', '--network=none', *matrix_flags, *env,
                 '--env=EXPECTED_MOVEMENTS=6', '--env=SKIP_DERIVED=1',
                 '--env=RELEASE_DEBUG=1',
                 manifest['image'], '/app/apps/api/infra-contract.mjs', 'restore'], timeout=180)
            stage = 'previous-version-restored-copy'
            prev_schema = str(previous['inputs']['contracts']['schema'])
            run(['podman', 'run', '--rm', '--network=none', *matrix_flags, *env,
                 '--env', 'DATABASE_PATH=/var/lib/myfinanzas/restored-' + prev_schema + '/database.sqlite',
                 '--env', 'AUTH_KEY_PATH=/var/lib/myfinanzas/restored-' + prev_schema + '/auth.key',
                 '--env', 'STATE_FILE=/var/lib/myfinanzas/fixture-private-previous.json',
                 '--env=RELEASE_DEBUG=1',
                 previous['image'], '/app/apps/api/infra-contract.mjs', 'verify'], timeout=180)
            proof = {'previous_source': previous['inputs']['source'],
                     'current_source': manifest['inputs']['source'],
                     'previous_image': previous['image'], 'current_image': manifest['image'],
                     'data_retention': True, 'current_backup_restore': True,
                     'previous_restore': True, 'no_in_place_downgrade': True}
        evidence['previous-source'] = previous['inputs']['source']
        evidence['previous-image'] = previous['image']
        evidence['schema-data-authentication-and-confirmed-writes-roundtrip'] = True
        evidence['final-image-encrypted-backup-restore-key-mfa-revocation'] = True
        stage = 'fail-closed-rollback-review-gate'
        from compatibility import require_rollback, require_migration, CHECKS
        if same_contracts:
            require_rollback(previous, manifest, proof)
        else:
            require_migration(previous, manifest, proof, authorization)
        # Real negative calls: none can open or mutate the application DB.
        import copy
        baseline = {p.name: sha(p.read_bytes()) for p in (matrix / 'state').iterdir() if p.is_file()}
        for kind in ('schema', 'data', 'authentication', 'foreign_pair', 'missing_proof'):
            other = copy.deepcopy(previous)
            evidence_copy = dict(proof)
            if kind in ('schema', 'data', 'authentication'):
                other['inputs']['contracts'][kind] = 'incompatible'
            elif kind == 'foreign_pair':
                evidence_copy['previous_image'] = 'sha256:' + '0' * 64
            else:
                evidence_copy.pop('confirmed_writes', None)
                evidence_copy.pop('no_in_place_downgrade', None)
            try:
                if same_contracts:
                    require_rollback(other, manifest, evidence_copy)
                else:
                    require_migration(other, manifest, evidence_copy, authorization)
            except ValueError:
                pass
            else:
                raise ProbeError('incompatible rollback gate accepted ' + kind)
        if baseline != {p.name: sha(p.read_bytes()) for p in (matrix / 'state').iterdir() if p.is_file()}:
            raise ProbeError('rollback rejection changed current state')
        evidence['incompatible-and-unproven-rollback-rejected'] = True

    finally:
        # Only names/files created by this invocation, never existing user units/data.
        had_error = sys.exc_info()[0] is not None
        cleanup_ok = True
        subprocess.run(['systemctl', '--user', 'stop', service], capture_output=True, timeout=40)
        for name in (api_name, writer_name):
            subprocess.run(['podman', 'rm', '--force', name], capture_output=True, timeout=30)
            absent = subprocess.run(['podman', 'container', 'exists', name], capture_output=True, timeout=30)
            cleanup_ok = cleanup_ok and absent.returncode == 1
        if unit_identity and unit.exists():
            info = unit.lstat()
            if (info.st_dev, info.st_ino) == unit_identity:
                unit.unlink()
                subprocess.run(['systemctl', '--user', 'daemon-reload'], capture_output=True, timeout=30)
        shutil.rmtree(root)
        cleanup_ok = cleanup_ok and not root.exists() and not unit.exists()
        if not cleanup_ok:
            print('::error title=Rootless cleanup incomplete::owned fixture cleanup could not be verified')
            if not had_error:
                raise ProbeError('owned fixture cleanup could not be verified')
    evidence['cleanup-own-resources'] = True
    print('::notice title=Rootless integration PASS::' + json.dumps(evidence))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write('\n## Real rootless integration\n\n```json\n' + json.dumps(evidence, indent=2) + '\n```\n')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Fixed stage and class only: no keys, data, env or command output.
        detail = str(error) if isinstance(error, ProbeError) else type(error).__name__
        print('::error title=Rootless integration failed::stage=' + stage + '; reason=' + detail)
        sys.exit(1)
