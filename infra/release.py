#!/usr/bin/env python3
"""Private OCI + frontend release. Never push, deploy, read app state or use secrets."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request
import uuid

BASE = 'docker.io/oven/bun:1.4.3-debian@sha256:923bedb355f7746666659f71e724998159a5c8c54bd1cb1030e1975a0698415b'
AGE_URL = 'https://github.com/FiloSottile/age/releases/download/v1.3.2/age-v1.3.2-linux-amd64.tar.gz'
AGE_SHA = 'cbe24006683f8eb669266162894b9a522a1af52f2665fbc63a4bb032ed26ac10'
SEED_RECIPE = 'infra/Containerfile.seed'
SEED_INPUTS = 'release-seed-inputs.json'
APP_CONTEXT_FILES = frozenset({'tools/age', 'tools/age-keygen', 'release-inputs.json',
                               'Containerfile', 'healthcheck.mjs'})
SEED_CONTEXT_FILES = frozenset({SEED_INPUTS, 'Containerfile.seed'})
PUBLIC_FORBIDDEN_SUFFIXES = frozenset({'.map', '.sqlite', '.sqlite-wal', '.sqlite-shm',
                                       '.xlsx', '.env', '.pem', '.key', '.p12', '.pfx'})
REFERENCE = re.compile(r'''(?:src|href)\s*=\s*["'](/[^"']+)["']''', re.I)
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
    """Read a path from exactly the selected commit; never fall back to HEAD."""
    value = subprocess.run(['git', '-C', str(SOURCE), 'show', commit + ':' + path],
                           capture_output=True, timeout=600)
    if value.returncode:
        available = subprocess.run(['git', '-C', str(SOURCE), 'rev-parse', '--verify',
                                    commit + '^{commit}'], capture_output=True, timeout=600)
        if available.returncode:
            raise ReleaseError(f'commit {commit} is not available')
        raise ReleaseError(f'source file {path} is absent from commit {commit}')
    return value.stdout


def contracts_for(commit):
    """Derive schema/data contracts from the source being released; never assume a version."""
    identity = source_bytes(commit, 'apps/api/src/database-identity.ts').decode('utf-8')
    match = re.search(r'export const schemaVersion = (\d+);', identity)
    if not match:
        raise ReleaseError('schema version is not declared by source')
    schema = int(match.group(1))
    backup = source_bytes(commit, 'apps/api/src/backup.ts').decode('utf-8')
    data = next((name for name, version in re.findall(r'"(e\d+\.\d+-v(\d+))"', backup)
                 if int(version) == schema), None)
    if data is None:
        raise ReleaseError('data contract is not declared for schema ' + str(schema))
    return {'schema': schema, 'data': data, 'authentication': 'argon2id-aesgcm-totp-session-v1'}


def files(commit, prefix):
    return run(['git', '-C', str(SOURCE), 'ls-tree', '-r', '--name-only', commit, '--', prefix]).decode().splitlines()


def runtime_sources(commit):
    """Application sources shared by the production and test-only seed images."""
    paths = ['package.json', 'bun.lock', 'tsconfig.json', 'apps/api/package.json', 'apps/web/package.json',
             'apps/web/index.html', 'apps/web/vite.config.ts']
    # Runtime JSON manifests (for example the admitted schema contract) are
    # imported by TS modules and must travel with the image; tests stay out.
    paths += [p for p in files(commit, 'apps/api/src')
              if (p.endswith('.ts') or p.endswith('.json'))
              and not p.endswith('.test.ts')]
    paths += [p for p in files(commit, 'apps/web/src') if Path(p).suffix in ('.ts', '.tsx', '.css')]
    # Vite copies public/ verbatim; it is not under src/. Ship every regular
    # file except dotfiles and material that must never become public, then
    # check that index.html only references files that exist.
    paths += [p for p in files(commit, 'apps/web/public')
              if not any(part.startswith('.') for part in Path(p).parts)
              and Path(p).suffix not in PUBLIC_FORBIDDEN_SUFFIXES]
    return paths


def context(commit, target, age_bytes):
    # Recipe and healthcheck must come from the selected commit. Read them
    # before writing anything so an absent file fails closed without artifacts.
    containerfile = source_bytes(commit, 'infra/Containerfile')
    healthcheck = source_bytes(commit, 'infra/healthcheck.mjs')
    contracts = contracts_for(commit)
    paths = runtime_sources(commit)
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
    (target / 'Containerfile').write_bytes(containerfile)
    (target / 'healthcheck.mjs').write_bytes(healthcheck)
    inputs = {'source': commit, 'base': BASE, 'platform': 'linux/amd64', 'bun': '1.4.3',
              'age': '1.3.2', 'age_archive_sha256': AGE_SHA, 'contracts': contracts,
              'source_files': source_hashes, 'lock_sha256': source_hashes['bun.lock'],
              'recipe_sha256': sha((target / 'Containerfile').read_bytes()),
              'healthcheck_sha256': sha((target / 'healthcheck.mjs').read_bytes()),
              # Builder metadata only: the checkout that produced this manifest.
              # It is not a release source and never supplies the recipe above.
              'builder_source': run(['git', '-C', str(SOURCE), 'rev-parse', 'HEAD']).decode().strip()}
    (target / 'release-inputs.json').write_text(json.dumps(inputs, sort_keys=True))
    return inputs


def seed_context(commit, target):
    """Materialize the test-only image from the same commit, base and lock."""
    recipe = source_bytes(commit, SEED_RECIPE)
    contracts = contracts_for(commit)
    paths = runtime_sources(commit)
    # The seed CLI imports application services and reads its frozen dataset.
    # Only runtime TS/JSON files travel; tests and documentation stay out.
    paths += [p for p in files(commit, 'tools/test-seed')
              if p.endswith(('.ts', '.json'))]
    source_hashes = {}
    for relative in paths:
        data = source_bytes(commit, relative)
        path = target / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        source_hashes[relative] = sha(data)
    (target / 'Containerfile.seed').write_bytes(recipe)
    inputs = {'source': commit, 'base': BASE, 'platform': 'linux/amd64', 'bun': '1.4.3',
              'contracts': contracts, 'source_files': source_hashes,
              'lock_sha256': source_hashes['bun.lock'],
              'recipe_sha256': sha(recipe),
              # Builder metadata only, never a release source.
              'builder_source': run(['git', '-C', str(SOURCE), 'rev-parse', 'HEAD']).decode().strip()}
    (target / SEED_INPUTS).write_text(json.dumps(inputs, sort_keys=True))
    return inputs


def check_context(target, inputs, extras=APP_CONTEXT_FILES):
    allowed = set(inputs['source_files']) | set(extras)
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


def missing_frontend_assets(html, web):
    """Root-relative files index.html references but the frontend does not ship."""
    text = html.decode('utf-8', errors='replace') if isinstance(html, bytes) else html
    referenced = set()
    for match in REFERENCE.finditer(text):
        path = match.group(1).split('?', 1)[0].split('#', 1)[0]
        if path.startswith('//'):
            continue
        relative = path.lstrip('/')
        if relative:
            referenced.add(relative)
    return sorted(referenced - set(web))


def inventory(image, root, frontend=None, require_frontend=True):
    name = 'mf32-export-' + uuid.uuid4().hex
    archive_path = root / (name + '.tar')
    run(['podman', 'create', '--http-proxy=false', '--name', name, '--pull=never', image])
    try:
        run(['podman', 'export', '--output', str(archive_path), name])
        entries, web, index_html, pending = {}, {}, b'', {}
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
                    if relative == 'index.html':
                        index_html = data
                    if frontend:
                        pending[relative] = data
        if require_frontend and 'index.html' not in web:
            raise ReleaseError('frontend missing')
        missing = missing_frontend_assets(index_html, web)
        if missing:
            raise ReleaseError('frontend asset missing: ' + ', '.join(missing))
        for relative, data in pending.items():
            destination = frontend / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
        return sha(json.dumps(entries, sort_keys=True).encode()), web
    finally:
        run(['podman', 'rm', name])
        archive_path.unlink(missing_ok=True)


def immutable_image(value):
    return isinstance(value, str) and bool(re.fullmatch(r'sha256:[0-9a-f]{64}', value))


def oci_manifest_digest(archive):
    with tarfile.open(archive) as oci:
        for member in oci:
            if member.isfile() and member.name.removeprefix('./') == 'index.json':
                return json.load(oci.extractfile(member))['manifests'][0]['digest']
    raise ReleaseError('OCI index missing')


def verify_archive(archive, expected_sha, label):
    if archive.is_symlink() or not archive.is_file() or sha(archive.read_bytes()) != expected_sha:
        raise ReleaseError(f'{label} OCI integrity mismatch')
    with tarfile.open(archive) as oci:
        for member in oci:
            name = member.name.removeprefix('./')
            if member.isdir():
                continue
            if not member.isfile() or name.startswith('/') or '..' in PurePosixPath(name).parts:
                raise ReleaseError('unsafe OCI member')
            if name.startswith('blobs/sha256/') and sha(oci.extractfile(member).read()) != name.split('/')[-1]:
                raise ReleaseError('OCI blob checksum mismatch')
    return oci_manifest_digest(archive)


def validate_frontend(directory, manifest):
    web_root = directory / 'frontend'
    actual = {}
    for path in web_root.rglob('*'):
        if path.is_symlink():
            raise ReleaseError('frontend symlink')
        if path.is_file():
            actual[path.relative_to(web_root).as_posix()] = sha(path.read_bytes())
    if actual != manifest['frontend_files']:
        raise ReleaseError('frontend/backend mismatch')


def verify(directory, expected_commit, expected_manifest, require_seed=True):
    directory = Path(directory)
    if directory.is_symlink() or directory.resolve() != directory or (directory / 'frontend').is_symlink():
        raise ReleaseError('unsafe release path')
    manifest_path = directory / 'manifest.json'
    if manifest_path.is_symlink() or sha(manifest_path.read_bytes()) != expected_manifest:
        raise ReleaseError('manifest integrity mismatch')
    manifest = json.loads(manifest_path.read_text())
    if manifest['inputs']['source'] != expected_commit or manifest['inputs']['contracts'] != contracts_for(expected_commit):
        raise ReleaseError('source/contract mismatch')
    # Recompute both recipe hashes from the expected commit; a manifest that
    # carries builder-HEAD hashes for an older source must not be accepted.
    for path, key in (('infra/Containerfile', 'recipe_sha256'),
                      ('infra/healthcheck.mjs', 'healthcheck_sha256')):
        if manifest['inputs'].get(key) != sha(source_bytes(expected_commit, path)):
            raise ReleaseError(f'{key} mismatch for {path} at expected commit {expected_commit}')
    seed = manifest.get('seed')
    if not require_seed:
        # A previous version may predate the test-only seed image. Its manifest
        # is only used for the migration/rollback matrix, never as a current
        # TEST package; the caller builds it with seed=False explicitly.
        if seed is not None:
            raise ReleaseError('previous release unexpectedly declares a seed image')
        archive = directory / 'image.oci.tar'
        app_digest = verify_archive(archive, manifest['oci_archive_sha256'], 'application')
        if manifest.get('oci_manifest_digest') != app_digest:
            raise ReleaseError('application OCI manifest digest mismatch')
        validate_frontend(directory, manifest)
        return manifest
    if not isinstance(seed, dict):
        raise ReleaseError('seed image is missing from release manifest')
    # The app and the test-only seed must come from the same commit, lock,
    # base and contracts. A missing or foreign seed block fails closed.
    if seed.get('source') != expected_commit or seed.get('source') != manifest['inputs']['source']:
        raise ReleaseError('seed/app source mismatch')
    if seed.get('contracts') != manifest['inputs']['contracts'] or seed.get('contracts') != contracts_for(expected_commit):
        raise ReleaseError('seed/app contract mismatch')
    if seed.get('lock_sha256') != manifest['inputs'].get('lock_sha256') or \
            seed.get('lock_sha256') != sha(source_bytes(expected_commit, 'bun.lock')):
        raise ReleaseError('seed/app lock mismatch')
    if seed.get('recipe_sha256') != sha(source_bytes(expected_commit, SEED_RECIPE)):
        raise ReleaseError(f'recipe_sha256 mismatch for {SEED_RECIPE} at expected commit {expected_commit}')
    if not immutable_image(seed.get('image')):
        raise ReleaseError('seed immutable image id missing')
    if not re.fullmatch(r'sha256:[0-9a-f]{64}', str(seed.get('oci_manifest_digest', ''))):
        raise ReleaseError('seed OCI manifest digest missing')
    if not re.fullmatch(r'[0-9a-f]{64}', str(seed.get('rootfs_payload_sha256', ''))):
        raise ReleaseError('seed rootfs payload digest missing')
    if not re.fullmatch(r'[0-9a-f]{64}', str(seed.get('oci_archive_sha256', ''))):
        raise ReleaseError('seed OCI archive digest missing')
    # One-build TEST artifacts do not claim reproducibility: the independent
    # Rootless gate still proves two clean builds for the exact same SHA.
    for item, label in ((manifest, 'application'), (seed, 'seed')):
        proof = item.get('reproducibility')
        if proof is None:
            continue
        builds = proof.get('builds', [])
        if proof.get('mode') == 'single-build':
            if len(builds) != 1 or proof.get('payload_equal') is not None or \
                    builds[0].get('rootfs_payload_sha256') != item.get('rootfs_payload_sha256'):
                raise ReleaseError(label + ' single-build evidence invalid')
        elif proof.get('payload_equal') is not True or len(builds) != 2 or \
                builds[0].get('rootfs_payload_sha256') != builds[1].get('rootfs_payload_sha256') or \
                builds[0].get('rootfs_payload_sha256') != item.get('rootfs_payload_sha256'):
            raise ReleaseError(label + ' clean builds are not reproducible')
    archive = directory / 'image.oci.tar'
    app_digest = verify_archive(archive, manifest['oci_archive_sha256'], 'application')
    if manifest.get('oci_manifest_digest') != app_digest:
        raise ReleaseError('application OCI manifest digest mismatch')
    seed_archive = directory / 'image.seed.oci.tar'
    seed_digest = verify_archive(seed_archive, seed['oci_archive_sha256'], 'seed')
    if seed_digest != seed['oci_manifest_digest']:
        raise ReleaseError('seed OCI manifest digest mismatch')
    validate_frontend(directory, manifest)
    return manifest


def reject_context_canaries(target, inputs, extras):
    """Synthetic credentials/DB/Excel canaries must be rejected before build."""
    for name in ('.env', 'database.sqlite', 'private.xlsx'):
        canary = target / name
        canary.write_bytes(b'MF32_SYNTHETIC_SECRET_CANARY_NOT_FOR_RUNTIME')
        rejected = False
        try:
            check_context(target, inputs, extras)
        except ReleaseError:
            rejected = True
        finally:
            canary.unlink()
        if not rejected:
            raise ReleaseError('context canary was accepted')


def build_repeated(ctx, recipe, scratch, prefix, epoch, commit, repeat, frontend=None):
    results = []
    for index in range(2 if repeat else 1):
        iid = scratch / (prefix + '-' + str(index))
        run(['podman', 'build', '--http-proxy=false', '--platform=linux/amd64', '--no-cache', '--timestamp=' + epoch,
             '--build-arg=SOURCE_COMMIT=' + commit, '--iidfile', str(iid), '--file', str(ctx / recipe), str(ctx)])
        image = iid.read_text().strip()
        payload, web = inventory(image, scratch, frontend if index == 0 else None,
                                 require_frontend=frontend is not None)
        results.append({'image': image, 'rootfs_payload_sha256': payload, 'frontend_files': web})
    if repeat and (results[0]['rootfs_payload_sha256'] != results[1]['rootfs_payload_sha256'] or
                   results[0]['frontend_files'] != results[1]['frontend_files']):
        raise ReleaseError('clean build payloads differ; no acceptance')
    return results


def build(directory, ref='HEAD', repeat=True, seed=True):
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
        reject_context_canaries(ctx, inputs, APP_CONTEXT_FILES)
        seed_inputs = seed_results = seed_chosen = None
        if seed:
            seed_ctx = scratch / 'seed-context'
            seed_ctx.mkdir(mode=0o700)
            seed_inputs = seed_context(commit, seed_ctx)
            check_context(seed_ctx, seed_inputs, SEED_CONTEXT_FILES)
            reject_context_canaries(seed_ctx, seed_inputs, SEED_CONTEXT_FILES)
            if (inputs['source'] != seed_inputs['source'] or
                    inputs['contracts'] != seed_inputs['contracts'] or
                    inputs['lock_sha256'] != seed_inputs['lock_sha256']):
                raise ReleaseError('app/seed context mismatch')
        results = build_repeated(ctx, 'Containerfile', scratch, 'image', epoch, commit, repeat,
                                 directory / 'frontend')
        chosen = results[0]
        if seed:
            seed_results = build_repeated(seed_ctx, 'Containerfile.seed', scratch, 'seed-image', epoch,
                                          commit, repeat)
            seed_chosen = seed_results[0]
        run(['podman', 'save', '--format=oci-archive', '--output', str(directory / 'image.oci.tar'), chosen['image']])
        inspect_layers(directory / 'image.oci.tar')
        oci_digest = oci_manifest_digest(directory / 'image.oci.tar')
        if seed:
            run(['podman', 'save', '--format=oci-archive', '--output', str(directory / 'image.seed.oci.tar'),
                 seed_chosen['image']])
            inspect_layers(directory / 'image.seed.oci.tar')
            seed_digest = oci_manifest_digest(directory / 'image.seed.oci.tar')
        tool_versions = {'podman': run(['podman', '--version']).decode().strip()}
        manifest = {'oci_manifest_digest': oci_digest, 'format': 1, 'inputs': inputs, **chosen,
                    'source_date_epoch': int(epoch),
                    'oci_archive_sha256': sha((directory / 'image.oci.tar').read_bytes()),
                    'reproducibility': {'mode': 'reproducible' if repeat else 'single-build',
                        'builds': results, 'payload_equal': True if repeat else None,
                       'oci_metadata': 'Only tar/image timestamps and container-generated host files are excluded from normalized payload; no unexplained content differences allowed.'},
                    'tool_versions': tool_versions}
        if seed:
            manifest['seed'] = {
                        'image': seed_chosen['image'],
                        'oci_manifest_digest': seed_digest,
                        'rootfs_payload_sha256': seed_chosen['rootfs_payload_sha256'],
                        'recipe_sha256': seed_inputs['recipe_sha256'],
                        'source': seed_inputs['source'],
                        'contracts': seed_inputs['contracts'],
                        'lock_sha256': seed_inputs['lock_sha256'],
                        'oci_archive_sha256': sha((directory / 'image.seed.oci.tar').read_bytes()),
                        'source_date_epoch': int(epoch),
                        'reproducibility': {'mode': 'reproducible' if repeat else 'single-build',
                            'builds': seed_results, 'payload_equal': True if repeat else None,
                           'oci_metadata': 'Same normalization as the application image; duplicate clean builds must match.'},
                        'tool_versions': tool_versions,
                    }
        os_release = run(['podman', 'run', '--http-proxy=false', '--rm', '--pull=never', '--cap-drop=all', '--security-opt=no-new-privileges', '--read-only', '--entrypoint=cat', chosen['image'], '/etc/os-release']).decode()
        manifest['runtime_os'] = dict(line.split('=', 1) for line in os_release.splitlines() if line.startswith(('ID=', 'VERSION_ID=')))
        manifest_path = directory / 'manifest.json'
        manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True))
        manifest_path.chmod(0o600)
        (directory / 'image.oci.tar').chmod(0o600)
        if seed:
            (directory / 'image.seed.oci.tar').chmod(0o600)
        digest = sha(manifest_path.read_bytes())
        (directory / 'manifest.sha256').write_text(digest + '\n')
        verify(directory, commit, digest, require_seed=seed)
        # Roundtrip the private archives without a registry or production credentials.
        run(['podman', 'load', '--input', str(directory / 'image.oci.tar')])
        if seed:
            run(['podman', 'load', '--input', str(directory / 'image.seed.oci.tar')])
        version = run(['podman', 'run', '--http-proxy=false', '--rm', '--pull=never', '--cap-drop=all', '--security-opt=no-new-privileges',
                       '--read-only', '--entrypoint=age', chosen['image'], '--version']).decode().strip().lstrip('v')
        if version != '1.3.2':
            raise ReleaseError('age runtime version mismatch')
        bun = run(['podman', 'run', '--http-proxy=false', '--rm', '--pull=never', '--cap-drop=all', '--security-opt=no-new-privileges', '--read-only', chosen['image'], '--version']).decode().strip()
        if bun != '1.4.3':
            raise ReleaseError('Bun runtime version mismatch')
        if seed:
            seed_bun = run(['podman', 'run', '--http-proxy=false', '--rm', '--pull=never', '--cap-drop=all', '--security-opt=no-new-privileges', '--read-only', seed_chosen['image'], '--version']).decode().strip()
            if seed_bun != '1.4.3':
                raise ReleaseError('seed Bun runtime version mismatch')
            run(['podman', 'run', '--http-proxy=false', '--rm', '--pull=never', '--cap-drop=all', '--security-opt=no-new-privileges',
                 '--read-only', '--entrypoint=test', seed_chosen['image'], '-f', '/app/tools/test-seed/cli.ts'])
        present = subprocess.run(['podman', 'run', '--http-proxy=false', '--rm', '--pull=never', '--cap-drop=all',
                                  '--security-opt=no-new-privileges', '--read-only', '--entrypoint=test',
                                  chosen['image'], '-e', '/app/tools/test-seed'], capture_output=True, timeout=60)
        if present.returncode == 0:
            raise ReleaseError('test-only seed tool leaked into the application image')
        if present.returncode != 1:
            raise ReleaseError('application image test-seed probe failed')
        return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='action', required=True)
    b = sub.add_parser('build'); b.add_argument('--output', required=True); b.add_argument('--ref', default='HEAD')
    b.add_argument('--single-build', action='store_true', help='TEST artifact only; Rootless gate is independent')
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
            build(Path(args.output), args.ref, repeat=not args.single_build)
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
