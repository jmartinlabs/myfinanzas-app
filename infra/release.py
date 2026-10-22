#!/usr/bin/env python3
"""Private OCI + frontend release. Never push, deploy, read app state or use secrets."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request
import uuid

BASE = 'docker.io/oven/bun:1.4.3-debian@sha256:923bedb355f7746666659f71e724998159a5c8c54bd1cb1030e1975a0698415b'
AGE_URL = 'https://github.com/FiloSottile/age/releases/download/v1.3.2/age-v1.3.2-linux-amd64.tar.gz'
AGE_SHA = 'cbe24006683f8eb669266162894b9a522a1af52f2665fbc63a4bb032ed26ac10'
CONTRACTS = {'schema': 6, 'data': 'e1.5-v5-direct-sql-v1', 'authentication': 'argon2id-aesgcm-totp-session-v1'}
SOURCE = Path(__file__).resolve().parents[1]


class ReleaseError(Exception):
    pass


def sha(data):
    return hashlib.sha256(data).hexdigest()


def run(args, timeout=600):
    value = subprocess.run(args, capture_output=True, timeout=timeout)
    if value.returncode:
        raise ReleaseError(f'{args[0]} failed, exit {value.returncode}')
    return value.stdout


def source_bytes(commit, path):
    return run(['git', '-C', str(SOURCE), 'show', commit + ':' + path])


def files(commit, prefix):
    return run(['git', '-C', str(SOURCE), 'ls-tree', '-r', '--name-only', commit, '--', prefix]).decode().splitlines()


def context(commit, target, age_bytes):
    paths = ['package.json', 'bun.lock', 'tsconfig.json', 'apps/api/package.json', 'apps/web/package.json',
             'apps/web/index.html', 'apps/web/vite.config.ts']
    paths += [p for p in files(commit, 'apps/api/src') if p.endswith('.ts') and not p.endswith('.test.ts')]
    paths += [p for p in files(commit, 'apps/web/src') if Path(p).suffix in ('.ts', '.tsx', '.css')]
    source_hashes = {}
    for relative in paths:
        data = source_bytes(commit, relative)
        path = target / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        source_hashes[relative] = sha(data)
    (target / 'tools').mkdir()
    with tarfile.open(fileobj=io.BytesIO(age_bytes), mode='r:gz') as archive:
        for name in ('age', 'age-keygen'):
            entry = archive.getmember('age/' + name)
            if not entry.isfile():
                raise ReleaseError('invalid age archive entry')
            path = target / 'tools' / name
            path.write_bytes(archive.extractfile(entry).read())
            path.chmod(0o755)
    inputs = {'source': commit, 'base': BASE, 'platform': 'linux/amd64', 'bun': '1.4.3',
              'age': '1.3.2', 'age_archive_sha256': AGE_SHA, 'contracts': CONTRACTS,
              'source_files': source_hashes, 'lock_sha256': source_hashes['bun.lock'],
              'recipe_sha256': sha(source_bytes('HEAD', 'infra/Containerfile')),
              'builder_source': run(['git', '-C', str(SOURCE), 'rev-parse', 'HEAD']).decode().strip()}
    (target / 'release-inputs.json').write_text(json.dumps(inputs, sort_keys=True))
    (target / 'Containerfile').write_bytes(source_bytes('HEAD', 'infra/Containerfile'))
    (target / 'healthcheck.mjs').write_bytes(source_bytes('HEAD', 'infra/healthcheck.mjs'))
    inputs['healthcheck_sha256'] = sha((target / 'healthcheck.mjs').read_bytes())
    (target / 'release-inputs.json').write_text(json.dumps(inputs, sort_keys=True))
    return inputs


def check_context(target, inputs):
    allowed = set(inputs['source_files']) | {'tools/age', 'tools/age-keygen',
               'release-inputs.json', 'Containerfile', 'healthcheck.mjs'}
    actual = set()
    for path in target.rglob('*'):
        if path.is_symlink():
            raise ReleaseError('symlink in build context')
        if path.is_file():
            actual.add(path.relative_to(target).as_posix())
    if actual != allowed:
        raise ReleaseError('unapproved file in build context')


def inspect_layers(archive):
    with tarfile.open(archive) as oci:
        for blob in oci:
            if not blob.isfile() or not blob.name.startswith('blobs/sha256/'):
                continue
            payload = oci.extractfile(blob).read()
            try:
                layer = tarfile.open(fileobj=io.BytesIO(payload))
            except tarfile.TarError:
                continue  # OCI config/manifest JSON is not a rootfs layer.
            with layer:
                for entry in layer:
                    name = entry.name.removeprefix('./')
                    if not entry.isfile():
                        continue
                    data = layer.extractfile(entry).read()
                    if data.startswith(b'SQLite format 3') or b'MF32_SYNTHETIC_SECRET_CANARY_NOT_FOR_RUNTIME' in data:
                        raise ReleaseError('state/canary in image layer')
                    if name.startswith('app/') and (name.endswith(('.sqlite', '.sqlite-wal', '.sqlite-shm', '.xlsx', '.env')) or '/.local/' in name or '/.git/' in name):
                        raise ReleaseError('unsafe application layer payload')


def inventory(image, root, frontend=None):
    name = 'mf32-export-' + uuid.uuid4().hex
    archive_path = root / (name + '.tar')
    run(['podman', 'create', '--http-proxy=false', '--name', name, '--pull=never', image])
    try:
        run(['podman', 'export', '--output', str(archive_path), name])
        entries, web = {}, {}
        generated = {'etc/hosts', 'etc/hostname', 'etc/resolv.conf', 'run/.containerenv'}
        with tarfile.open(archive_path) as archive:
            for entry in archive:
                path = str(PurePosixPath(entry.name.removeprefix('./')))
                if path in generated or path.split('/')[0] in ('dev', 'proc', 'sys'):
                    continue
                if path.startswith('/') or '..' in PurePosixPath(path).parts:
                    raise ReleaseError('unsafe rootfs path')
                data = archive.extractfile(entry).read() if entry.isfile() or entry.islnk() else b''
                if path.startswith('app/') and ('.test.ts' in path or '/test-support/' in path or '/.local/' in path or path.endswith('.env') or data.startswith(b'SQLite format 3')):
                    raise ReleaseError('sensitive or test payload in runtime')
                if path in ('app/node_modules/.bin/vite', 'app/node_modules/.bin/playwright'):
                    raise ReleaseError('development tool in runtime')
                entries[path] = [('0' if entry.islnk() else entry.type.decode()), entry.mode, entry.uid, entry.gid, ('' if entry.islnk() else entry.linkname), sha(data)]
                if path.startswith('release/frontend/') and entry.isfile():
                    relative = path.removeprefix('release/frontend/')
                    web[relative] = sha(data)
                    if frontend:
                        destination = frontend / relative
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        destination.write_bytes(data)
        if 'index.html' not in web:
            raise ReleaseError('frontend missing')
        return sha(json.dumps(entries, sort_keys=True).encode()), web
    finally:
        run(['podman', 'rm', name])
        archive_path.unlink(missing_ok=True)


def verify(directory, expected_commit, expected_manifest):
    directory = Path(directory)
    if directory.is_symlink() or directory.resolve() != directory or (directory / 'frontend').is_symlink():
        raise ReleaseError('unsafe release path')
    manifest_path = directory / 'manifest.json'
    if manifest_path.is_symlink() or sha(manifest_path.read_bytes()) != expected_manifest:
        raise ReleaseError('manifest integrity mismatch')
    manifest = json.loads(manifest_path.read_text())
    if manifest['inputs']['source'] != expected_commit or manifest['inputs']['contracts'] != CONTRACTS:
        raise ReleaseError('source/contract mismatch')
    archive = directory / 'image.oci.tar'
    if archive.is_symlink() or sha(archive.read_bytes()) != manifest['oci_archive_sha256']:
        raise ReleaseError('OCI integrity mismatch')
    with tarfile.open(archive) as oci:
        for member in oci:
            name = member.name.removeprefix('./')
            if member.isdir():
                continue
            if not member.isfile() or name.startswith('/') or '..' in PurePosixPath(name).parts:
                raise ReleaseError('unsafe OCI member')
            if name.startswith('blobs/sha256/') and sha(oci.extractfile(member).read()) != name.split('/')[-1]:
                raise ReleaseError('OCI blob checksum mismatch')
    web_root = directory / 'frontend'
    actual = {}
    for path in web_root.rglob('*'):
        if path.is_symlink():
            raise ReleaseError('frontend symlink')
        if path.is_file():
            actual[path.relative_to(web_root).as_posix()] = sha(path.read_bytes())
    if actual != manifest['frontend_files']:
        raise ReleaseError('frontend/backend mismatch')
    return manifest


def build(directory, ref='HEAD', repeat=True):
    directory = Path(directory)
    if directory.exists() or not directory.is_absolute() or directory.is_symlink():
        raise ReleaseError('new absolute output directory required')
    if run(['git', '-C', str(SOURCE), 'status', '--porcelain', '--untracked-files=normal']).strip():
        raise ReleaseError('clean checkout required; no dirty builder or source inputs')
    commit = run(['git', '-C', str(SOURCE), 'rev-parse', '--verify', ref + '^{commit}']).decode().strip()
    epoch = run(['git', '-C', str(SOURCE), 'show', '-s', '--format=%ct', commit]).decode().strip()
    directory.mkdir(mode=0o700)
    age_bytes = urllib.request.urlopen(AGE_URL, timeout=60).read()
    if sha(age_bytes) != AGE_SHA:
        raise ReleaseError('age checksum mismatch')
    with tempfile.TemporaryDirectory(prefix='mf32-build-', dir=directory.parent) as scratch:
        scratch = Path(scratch)
        ctx = scratch / 'context'
        ctx.mkdir(mode=0o700)
        inputs = context(commit, ctx, age_bytes)
        check_context(ctx, inputs)
        # Synthetic credentials/DB/Excel canaries must be rejected before build.
        for name in ('.env', 'database.sqlite', 'private.xlsx'):
            canary = ctx / name
            canary.write_bytes(b'MF32_SYNTHETIC_SECRET_CANARY_NOT_FOR_RUNTIME')
            rejected = False
            try:
                check_context(ctx, inputs)
            except ReleaseError:
                rejected = True
            finally:
                canary.unlink()
            if not rejected:
                raise ReleaseError('context canary was accepted')
        results = []
        for index in range(2 if repeat else 1):
            iid = scratch / ('image-' + str(index))
            run(['podman', 'build', '--http-proxy=false', '--platform=linux/amd64', '--no-cache', '--timestamp=' + epoch,
                 '--build-arg=SOURCE_COMMIT=' + commit, '--iidfile', str(iid), '--file', str(ctx / 'Containerfile'), str(ctx)])
            image = iid.read_text().strip()
            payload, web = inventory(image, scratch, directory / 'frontend' if index == 0 else None)
            results.append({'image': image, 'rootfs_payload_sha256': payload, 'frontend_files': web})
        if repeat and (results[0]['rootfs_payload_sha256'] != results[1]['rootfs_payload_sha256'] or results[0]['frontend_files'] != results[1]['frontend_files']):
            raise ReleaseError('clean build payloads differ; no acceptance')
        chosen = results[0]
        run(['podman', 'save', '--format=oci-archive', '--output', str(directory / 'image.oci.tar'), chosen['image']])
        inspect_layers(directory / 'image.oci.tar')
        with tarfile.open(directory / 'image.oci.tar') as oci:
            oci_digest = json.load(oci.extractfile('index.json'))['manifests'][0]['digest']
        manifest = {'oci_manifest_digest': oci_digest, 'format': 1, 'inputs': inputs, **chosen, 'source_date_epoch': int(epoch),
                    'oci_archive_sha256': sha((directory / 'image.oci.tar').read_bytes()),
                    'reproducibility': {'builds': results, 'payload_equal': repeat,
                       'oci_metadata': 'Only tar/image timestamps and container-generated host files are excluded from normalized payload; no unexplained content differences allowed.'},
                    'tool_versions': {'podman': run(['podman', '--version']).decode().strip()}}
        os_release = run(['podman', 'run', '--http-proxy=false', '--rm', '--pull=never', '--cap-drop=all', '--security-opt=no-new-privileges', '--read-only', '--entrypoint=cat', chosen['image'], '/etc/os-release']).decode()
        manifest['runtime_os'] = dict(line.split('=', 1) for line in os_release.splitlines() if line.startswith(('ID=', 'VERSION_ID=')))
        manifest_path = directory / 'manifest.json'
        manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True))
        manifest_path.chmod(0o600)
        (directory / 'image.oci.tar').chmod(0o600)
        digest = sha(manifest_path.read_bytes())
        (directory / 'manifest.sha256').write_text(digest + '\n')
        verify(directory, commit, digest)
        # Roundtrip the private archive without a registry or production credentials.
        run(['podman', 'load', '--input', str(directory / 'image.oci.tar')])
        version = run(['podman', 'run', '--http-proxy=false', '--rm', '--pull=never', '--cap-drop=all', '--security-opt=no-new-privileges',
                       '--read-only', '--entrypoint=age', chosen['image'], '--version']).decode().strip().lstrip('v')
        if version != '1.3.2':
            raise ReleaseError('age runtime version mismatch')
        bun = run(['podman', 'run', '--http-proxy=false', '--rm', '--pull=never', '--cap-drop=all', '--security-opt=no-new-privileges', '--read-only', chosen['image'], '--version']).decode().strip()
        if bun != '1.4.3':
            raise ReleaseError('Bun runtime version mismatch')
        return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='action', required=True)
    b = sub.add_parser('build'); b.add_argument('--output', required=True); b.add_argument('--ref', default='HEAD')
    v = sub.add_parser('verify'); v.add_argument('directory'); v.add_argument('--expected-commit', required=True); v.add_argument('--expected-manifest-sha256', required=True)
    r = sub.add_parser('render-unit'); r.add_argument('directory'); r.add_argument('--expected-commit', required=True); r.add_argument('--expected-manifest-sha256', required=True); r.add_argument('--data', required=True)
    c = sub.add_parser('rollback-check')
    for prefix in ('previous', 'current'):
        c.add_argument('--' + prefix, required=True)
        c.add_argument('--' + prefix + '-commit', required=True)
        c.add_argument('--' + prefix + '-manifest-sha256', required=True)
    c.add_argument('--proof', required=True)
    args = parser.parse_args()
    try:
        if args.action == 'build':
            build(Path(args.output), args.ref)
        elif args.action == 'rollback-check':
            from compatibility import require_rollback
            previous = verify(Path(args.previous), args.previous_commit, args.previous_manifest_sha256)
            current = verify(Path(args.current), args.current_commit, args.current_manifest_sha256)
            require_rollback(previous, current, json.loads(Path(args.proof).read_text()))
        else:
            manifest = verify(Path(args.directory), args.expected_commit, args.expected_manifest_sha256)
            if args.action == 'render-unit':
                from runtime import render
                print(render(manifest['image'], args.data), end='')
                raise SystemExit(0)

        print('Private release operation verified; no deployment or publication.')
    except Exception as error:
        print('::error title=Private release failed::' + type(error).__name__ + (': ' + str(error) if isinstance(error, ReleaseError) else ''))
        raise SystemExit(1)
