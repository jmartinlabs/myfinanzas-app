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
    evidence = {'host-uid': os.getuid(), 'host-gid': os.getgid()}
    try:
        stage = 'build-reproducible-private-release'
        source = Path(__file__).resolve().parents[2]
        sys.path.insert(0, str(source / 'infra'))
        from release import build, verify, sha, CONTRACTS
        output = root / 'release'
        manifest = build(output)
        image = manifest['image']
        evidence['final-image-id'] = image
        evidence['release-source'] = manifest['inputs']['source']
        evidence['oci-manifest-digest'] = manifest['oci_manifest_digest']
        evidence['two-clean-builds-payload-equal'] = manifest['reproducibility']['payload_equal']
        digest = (output / 'manifest.sha256').read_text().strip()
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
        evidence['frontend-backend-integrity-and-negative'] = True
        data = root / 'data'
        data.mkdir(mode=0o700)
        env = ['--env=NODE_ENV=production', '--env=APP_ORIGIN=https://myfinanzas.pp.ua',
               '--env=DATABASE_PATH=/var/lib/myfinanzas/state/database.sqlite',
               '--env=AUTH_KEY_PATH=/var/lib/myfinanzas/state/auth.key']
        hardened = ['--pull=never', '--userns=keep-id:uid=10001,gid=10001',
                    '--user=10001:10001', '--cap-drop=all', '--security-opt=no-new-privileges',
                    '--read-only', '--read-only-tmpfs=false', '--pids-limit=128', '--memory=1g', '--cpus=1',
                    '--tmpfs=/tmp:rw,noexec,nosuid,nodev,tmpcopyup,mode=0711,size=64m',
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
        stage = 'bounded-invalid-configuration-restarts'
        before = {p.name: sha(p.read_bytes()) for p in state.iterdir() if p.is_file()}
        unit.write_text(content.replace('Environment=API_BIND_HOST=0.0.0.0', 'Environment=API_BIND_HOST=invalid'))
        run(['systemctl', '--user', 'daemon-reload'])
        run(['systemctl', '--user', 'reset-failed', service])
        subprocess.run(['systemctl', '--user', 'start', service], capture_output=True, timeout=30)
        for _ in range(100):
            result = run(['systemctl', '--user', 'show', service, '--property=Result', '--value']).strip()
            if result == 'start-limit-hit':
                break
            time.sleep(0.25)
        else:
            raise ProbeError('invalid startup did not hit bounded start limit')
        if before != {p.name: sha(p.read_bytes()) for p in state.iterdir() if p.is_file()}:
            raise ProbeError('invalid startup modified existing state')
        health(False)
        evidence['invalid-startup-bounded-no-state-repair'] = True

        # Every API regression runs against the definitive runtime dependencies.
        # Test sources are mounted read-only; no tests/dev tools enter the image.
        stage = 'final-image-api-regressions'
        suite = root / 'suite'
        suite.mkdir(mode=0o700)
        for prefix in ('apps/api/src', 'apps/api/test-support'):
            for relative in run(['git', 'ls-tree', '-r', '--name-only', 'HEAD', '--', prefix]).splitlines():
                if not relative.endswith('.ts'):
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
        (suite / 'node_modules').symlink_to('/app/node_modules')
        (suite / 'apps/api/node_modules').symlink_to('/app/apps/api/node_modules')
        result = subprocess.run(['podman', 'run', '--rm', '--network=none',
                                 *hardened, '--memory=2g', '--pids-limit=512',
                                 '--env=NODE_ENV=test', '--env=PATH=/suite/tools/bin:/usr/local/bin:/usr/bin:/bin', '--volume=' + str(suite) + ':/suite:ro',
                                 '--workdir=/suite', image, 'test', 'apps/api'],
                                capture_output=True, text=True, timeout=600)
        # Never emit raw test output: authentication fixtures can contain factors.
        import re
        counts = re.search(r'(\d+) pass.*?(\d+) fail', result.stderr, re.S)
        if result.returncode or not counts or int(counts[2]) != 0:
            # Emit only labels literally declared in reviewed test sources, never
            # assertions, exception payloads, stdout or authentication factors.
            declared = set()
            for test in (suite / 'apps/api/src').glob('*.test.ts'):
                declared.update(re.findall(r'test\(\s*["\']([^"\']+)["\']', test.read_text()))
            failed = [label for label in declared if '(fail) ' + label in result.stderr]
            print('::error title=Final image regression labels::' + json.dumps({'exit': result.returncode, 'counts': counts.groups() if counts else None, 'failed': sorted(failed)}))
            raise ProbeError('final image API regression failed; private output not published')
        evidence['final-image-api-tests-passed'] = int(counts[1])
        stage = 'previous-private-release-build'
        previous = build(root / 'previous', ref='b0bc5a7634bb5b0102b30bd21ad478c0f3ae72c9')
        if previous['inputs']['contracts'] != manifest['inputs']['contracts']:
            raise ProbeError('incompatible contract metadata; no rollback authorized')
        matrix = root / 'matrix'
        matrix.mkdir(mode=0o700)
        matrix_flags = [flag for flag in hardened if not flag.startswith('--volume=')]
        matrix_flags += ['--volume=' + str(matrix) + ':/var/lib/myfinanzas:rw',
                         '--volume=' + str(source / 'infra/tests/release-contract.mjs') + ':/app/apps/api/infra-contract.mjs:ro']
        stage = 'previous-version-explicit-initialization'
        run(['podman', 'run', '--rm', '--network=none', *matrix_flags, *env,
             previous['image'], 'apps/api/src/production-init.ts'])
        for version, action in [(previous, 'seed'), (manifest, 'update'),
                                (previous, 'rollback'), (manifest, 'restore')]:
            stage = 'real-cross-version-' + action
            run(['podman', 'run', '--rm', '--network=none', *matrix_flags, *env,
                 version['image'], '/app/apps/api/infra-contract.mjs', action], timeout=180)
        evidence['previous-source'] = previous['inputs']['source']
        evidence['previous-image'] = previous['image']
        evidence['schema-data-authentication-and-confirmed-writes-roundtrip'] = True
        evidence['final-image-encrypted-backup-restore-key-mfa-revocation'] = True
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
