"""Fail-closed release gates; never opens application state or runs containers."""
CHECKS = ('schema', 'data', 'authentication', 'confirmed_writes')
MIGRATION_CHECKS = (
    'data_retention',
    'current_backup_restore',
    'previous_restore',
    'no_in_place_downgrade',
)


def _pair(previous, current, proof):
    expected = {'previous_source': previous['inputs']['source'],
                'current_source': current['inputs']['source'],
                'previous_image': previous['image'], 'current_image': current['image']}
    if any(proof.get(key) != value for key, value in expected.items()):
        raise ValueError('missing or foreign image-pair evidence')
    return expected


def require_rollback(previous, current, proof):
    """Compatible contracts: the existing cross-version rollback matrix applies."""
    if previous['inputs']['contracts'] != current['inputs']['contracts']:
        raise ValueError('incompatible schema/data/authentication metadata')
    expected = _pair(previous, current, proof)
    if any(proof.get(check) is not True for check in CHECKS):
        raise ValueError('cross-version behavior is not demonstrated')
    return expected


def require_migration(previous, current, proof, authorization):
    """Schema upgrade gate: restore-only rollback with explicit human approval.

    Contracts must differ (otherwise require_rollback applies). The authorization
    file is reviewed in Git and must match the actual schema pair; it never grants
    a generic rollback or an in-place downgrade.
    """
    before = previous['inputs']['contracts']
    after = current['inputs']['contracts']
    if before == after:
        return require_rollback(previous, current, proof)
    if not isinstance(authorization, dict):
        raise ValueError('missing migration authorization')
    if authorization.get('from_schema') != before.get('schema'):
        raise ValueError('migration authorization origin mismatch')
    if authorization.get('to_schema') != after.get('schema'):
        raise ValueError('migration authorization destination mismatch')
    if authorization.get('downgrade') != 'restore-only':
        raise ValueError('migration authorization must be restore-only')
    if not str(authorization.get('authorized_by', '')).strip():
        raise ValueError('migration authorization lacks a human authorizer')
    if not str(authorization.get('authorized_at', '')).strip():
        raise ValueError('migration authorization lacks a date')
    if not str(authorization.get('authorization', '')).strip():
        raise ValueError('migration authorization lacks its approved scope')
    expected = _pair(previous, current, proof)
    if any(proof.get(check) is not True for check in MIGRATION_CHECKS):
        raise ValueError('migration behavior is not demonstrated')
    return {**expected, 'from_schema': before.get('schema'),
            'to_schema': after.get('schema'), 'downgrade': 'restore-only'}
