#!/usr/bin/env python3
"""Synthetic API/UI smoke for a verified release+seed pair. Never production.

Runs only against a private, freshly-built pair and a disposable data root:
production-init -> seed init/apply/verify -> setup -> authenticated read.
Credentials, TOTP secret and cookies are ephemeral and never printed.
"""
import argparse
import base64
import functools
import hashlib
import hmac
import http.client
import http.server
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))
from release import verify  # noqa: E402

ORIGIN = 'https://test.myfinanzas.pp.ua'
SESSION_COOKIE = '__Host-mf_session'
CHALLENGE_COOKIE = '__Host-mf_challenge'
stage = 'setup'


class SmokeError(Exception):
    pass


def run(args, timeout=180, env=None, check=True):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout,
                            env={**os.environ, **(env or {})})
    if check and result.returncode:
        # Never expose command output: it may contain private state or factors.
        raise SmokeError(f'command failed at {stage}, exit {result.returncode}')
    return result


def free_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


def podman_flags(data, tmp_mode=True):
    flags = ['--pull=never', '--http-proxy=false', '--userns=keep-id:uid=10001,gid=10001',
             '--user=10001:10001', '--cap-drop=all', '--security-opt=no-new-privileges',
             '--read-only', '--read-only-tmpfs=false', '--pids-limit=128', '--memory=1g',
             '--cpus=1', '--volume=' + str(data) + ':/var/lib/myfinanzas:rw']
    if tmp_mode:
        flags.append('--tmpfs=/tmp:rw,noexec,nosuid,nodev,tmpcopyup,mode=0711,size=64m')
    return flags


def env_args():
    return ['--env=NODE_ENV=production', '--env=APP_ORIGIN=' + ORIGIN,
            '--env=DATABASE_PATH=/var/lib/myfinanzas/state/database.sqlite',
            '--env=AUTH_KEY_PATH=/var/lib/myfinanzas/state/auth.key']


def assert_private_root(data):
    for path, mode in [(data, 0o700), (data / 'state', 0o700),
                       (data / 'state/database.sqlite', 0o600),
                       (data / 'state/auth.key', 0o600)]:
        info = path.lstat()
        if info.st_uid != os.getuid() or (info.st_mode & 0o777) != mode or path.is_symlink():
            raise SmokeError('private data-root permission/ownership invariant failed')


def set_cookie(headers, name):
    for key, value in headers:
        if key.lower() != 'set-cookie':
            continue
        pair = value.split(';', 1)[0]
        if '=' not in pair:
            continue
        key_name, cookie = pair.split('=', 1)
        if key_name == name:
            return cookie
    return None


def request(connection, method, path, body=None, cookie=None, origin=None):
    headers = {'Accept': 'application/json'}
    if body is not None:
        headers['Content-Type'] = 'application/json'
    if cookie:
        headers['Cookie'] = cookie
    if origin:
        headers['Origin'] = origin
    payload = None if body is None else json.dumps(body).encode('utf-8')
    connection.request(method, path, body=payload, headers=headers)
    response = connection.getresponse()
    data = response.read()
    return response.status, response.getheaders(), data


def totp(secret, timestamp=None):
    key = base64.b32decode(secret.upper())
    counter = int((timestamp if timestamp is not None else time.time()) // 30)
    digest = hmac.new(key, counter.to_bytes(8, 'big'), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = ((digest[offset] & 0x7F) << 24 | digest[offset + 1] << 16 |
            digest[offset + 2] << 8 | digest[offset + 3]) % 1000000
    return f'{code:06d}'


def wait_health(port):
    for _ in range(80):
        try:
            connection = http.client.HTTPConnection('127.0.0.1', port, timeout=2)
            status, _, data = request(connection, 'GET', '/api/health')
            connection.close()
            if status == 200 and json.loads(data) == {'ok': True}:
                return
        except (OSError, ValueError, http.client.HTTPException):
            pass
        time.sleep(0.25)
    raise SmokeError('published API health not ready')


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def start_frontend(root):
    handler = functools.partial(QuietHandler, directory=str(root))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def main():
    global stage
    parser = argparse.ArgumentParser()
    parser.add_argument('--release', required=True)
    parser.add_argument('--expected-commit', required=True)
    parser.add_argument('--expected-manifest-sha256', required=True)
    parser.add_argument('--evidence')
    args = parser.parse_args()
    if os.getuid() in (0, 10001):
        raise SmokeError('runner UID must be non-root and differ from internal 10001')
    rootless = run(['podman', 'info', '--format', '{{.Host.Security.Rootless}}']).stdout.strip()
    if rootless != 'true':
        raise SmokeError('Podman must run rootless for this smoke')
    directory = Path(args.release)
    stage = 'verify-release-pair'
    manifest = verify(directory, args.expected_commit, args.expected_manifest_sha256)
    seed = manifest['seed']
    app_image, seed_image = manifest['image'], seed['image']
    frontend = directory / 'frontend'
    if not (frontend / 'index.html').is_file():
        raise SmokeError('verified frontend index missing')

    root = Path(tempfile.mkdtemp(prefix='mf-test-smoke-'))
    os.chmod(root, 0o700)
    data = root / 'data'
    data.mkdir(mode=0o700)
    name = 'mf-test-smoke-' + os.urandom(8).hex()
    frontend_server = None
    evidence = {'host_uid': os.getuid(), 'release_source': manifest['inputs']['source'],
                'release_manifest_sha256': args.expected_manifest_sha256,
                'app_image': app_image, 'seed_image': seed_image,
                'app_oci_manifest_digest': manifest['oci_manifest_digest'],
                'seed_oci_manifest_digest': seed['oci_manifest_digest'],
                'app_rootfs_payload_sha256': manifest['rootfs_payload_sha256'],
                'seed_rootfs_payload_sha256': seed['rootfs_payload_sha256'],
                'seed_recipe_sha256': seed['recipe_sha256']}
    try:
        stage = 'seed-tool-absent-from-app-image'
        probe = subprocess.run(['podman', 'run', '--http-proxy=false', '--rm', '--pull=never',
                                '--cap-drop=all', '--security-opt=no-new-privileges', '--read-only',
                                '--entrypoint=test', app_image, '-e', '/app/tools/test-seed'],
                               capture_output=True, timeout=60)
        if probe.returncode != 1:
            raise SmokeError('application image must not contain tools/test-seed')
        evidence['seed_tool_absent_from_app_image'] = True

        stage = 'production-init'
        run(['podman', 'run', '--rm', '--network=none', *podman_flags(data), *env_args(),
             app_image, 'apps/api/src/production-init.ts'])
        assert_private_root(data)

        stage = 'seed-init'
        seed_cmd = ['podman', 'run', '--rm', '--network=none', *podman_flags(data), *env_args(),
                    seed_image, 'tools/test-seed/cli.ts']
        run([*seed_cmd, 'init', '--data-root', '/var/lib/myfinanzas',
             '--seed-commit', args.expected_commit, '--seed-image', seed_image])
        stage = 'seed-apply'
        run([*seed_cmd, 'apply', '--data-root', '/var/lib/myfinanzas',
             '--seed-commit', args.expected_commit, '--seed-image', seed_image])
        stage = 'seed-verify'
        # The effective manifest hash is published by apply; read it from the marker.
        marker = json.loads((data / 'test-instance.json').read_text())
        manifest_sha = marker['seed_manifest_sha256']
        if not isinstance(manifest_sha, str) or len(manifest_sha) != 64:
            raise SmokeError('seed apply did not publish a manifest hash')
        run([*seed_cmd, 'verify', '--data-root', '/var/lib/myfinanzas',
             '--expected-manifest-sha256', manifest_sha, '--seed-image', seed_image])

        stage = 'setup'
        token_path = data / 'state/alta.txt'
        run(['podman', 'run', '--rm', '--network=none', *podman_flags(data), *env_args(),
             app_image, 'apps/api/src/setup.ts', '/var/lib/myfinanzas/state/alta.txt'])
        token = token_path.read_text()
        token_path.unlink()

        port = free_port()
        stage = 'start-api'
        run(['podman', 'run', '-d', '--name', name,
             '--publish=127.0.0.1:' + str(port) + ':3001',
             *podman_flags(data), '--env=API_BIND_HOST=0.0.0.0', *env_args(),
             app_image, 'apps/api/src/main.ts'])
        wait_health(port)
        evidence['health_status'] = 200
        connection = http.client.HTTPConnection('127.0.0.1', port, timeout=10)
        status, _, _ = request(connection, 'GET', '/api/saldos')
        connection.close()
        if status != 401:
            raise SmokeError('anonymous /api/saldos must be 401')
        evidence['anonymous_saldos_status'] = 401

        stage = 'frontend-index'
        frontend_server = start_frontend(frontend)
        fport = frontend_server.server_address[1]
        connection = http.client.HTTPConnection('127.0.0.1', fport, timeout=10)
        status, headers, body = request(connection, 'GET', '/')
        connection.close()
        content_type = next((value for key, value in headers if key.lower() == 'content-type'), '')
        if status != 200 or 'text/html' not in content_type or b'id="root"' not in body:
            raise SmokeError('verified frontend index did not serve HTML')
        evidence['frontend_index_status'] = 200

        stage = 'synthetic-enrollment'
        password = 'Synthetic smoke password ' + os.urandom(12).hex()
        connection = http.client.HTTPConnection('127.0.0.1', port, timeout=15)
        status, headers, body = request(connection, 'POST', '/api/auth/enroll',
                                        {'token': token, 'password': password}, origin=ORIGIN)
        token = None
        if status != 200:
            connection.close()
            raise SmokeError('synthetic enrollment failed')
        enrollment = json.loads(body)
        secret = enrollment.get('secret')
        challenge = set_cookie(headers, CHALLENGE_COOKIE)
        if not isinstance(secret, str) or not challenge:
            connection.close()
            raise SmokeError('enrollment response incomplete')
        stage = 'synthetic-mfa'
        mfa = None
        for attempt in range(3):
            code = totp(secret, time.time() + attempt)
            status, headers, body = request(
                connection, 'POST', '/api/auth/mfa', {'code': code},
                cookie=CHALLENGE_COOKIE + '=' + challenge, origin=ORIGIN)
            if status == 200:
                mfa = json.loads(body)
                break
            time.sleep(1)
        secret = None
        if not mfa:
            connection.close()
            raise SmokeError('synthetic TOTP verification failed')
        session = set_cookie(headers, SESSION_COOKIE)
        if not session:
            connection.close()
            raise SmokeError('session cookie missing after MFA')
        evidence['mfa'] = True

        stage = 'authenticated-read'
        status, _, body = request(connection, 'GET', '/api/saldos',
                                  cookie=SESSION_COOKIE + '=' + session)
        connection.close()
        if status != 200:
            raise SmokeError('authenticated /api/saldos must be 200')
        saldos = json.loads(body).get('saldos')
        ids = sorted(item.get('id') for item in saldos if isinstance(item, dict))
        expected = ['S001', 'S002', 'S003', 'S004', 'S005']
        if ids != expected:
            raise SmokeError('authenticated saldos ids differ from FT-1')
        evidence['authenticated_saldos_status'] = 200
        evidence['saldos_ids'] = ids
        evidence['saldos_total'] = len(ids)
        evidence['checks'] = {'production_init': True, 'seed_init': True, 'seed_apply': True,
                              'seed_verify': True, 'setup': True, 'health': True,
                              'anonymous_saldos_401': True, 'frontend_index': True,
                              'authenticated_saldos': True}
    finally:
        if frontend_server:
            frontend_server.shutdown()
            frontend_server.server_close()
        subprocess.run(['podman', 'rm', '--force', name], capture_output=True, timeout=60)
        absent = subprocess.run(['podman', 'container', 'exists', name],
                                capture_output=True, timeout=30).returncode == 1
        shutil.rmtree(root, ignore_errors=True)
        if root.exists() or not absent:
            raise SmokeError('owned fixture cleanup could not be verified')
    evidence['data_root_cleanup'] = True
    text = json.dumps(evidence, indent=2, sort_keys=True)
    if args.evidence:
        path = Path(args.evidence)
        if path.exists() or path.is_symlink():
            raise SmokeError('evidence path must be new')
        path.write_text(text + '\n')
        path.chmod(0o600)
    print(text)
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        detail = str(error) if isinstance(error, SmokeError) else type(error).__name__
        print(f'::error title=Synthetic TEST smoke failed::stage={stage}; reason={detail}')
        sys.exit(1)
