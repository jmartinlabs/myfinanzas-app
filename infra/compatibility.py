"""Fail-closed rollback review gate; never opens application state or runs containers."""
CHECKS = ('schema', 'data', 'authentication', 'confirmed_writes')


def require_rollback(previous, current, proof):
    if previous['inputs']['contracts'] != current['inputs']['contracts']:
        raise ValueError('incompatible schema/data/authentication metadata')
    expected = {'previous_source': previous['inputs']['source'],
                'current_source': current['inputs']['source'],
                'previous_image': previous['image'], 'current_image': current['image']}
    if any(proof.get(key) != value for key, value in expected.items()):
        raise ValueError('missing or foreign image-pair evidence')
    if any(proof.get(check) is not True for check in CHECKS):
        raise ValueError('cross-version behavior is not demonstrated')
    return expected
