"""Render only: no systemd installation, deployment, initialization or data changes."""
import os
from pathlib import Path
import stat


def render(image, data, name='myfinanzas-api'):
    if not image.startswith('sha256:') or len(image) != 71 or any(c not in '0123456789abcdef' for c in image[7:]):
        raise ValueError('immutable image ID required')
    if not name.replace('-', '').isalnum():
        raise ValueError('invalid unit name')
    data = Path(data)
    if not data.is_absolute() or data.resolve() != data or any(c in str(data) for c in (' ', '\n', '%', ':', '\\')):
        raise ValueError('unsafe data root')
    info = data.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o700:
        raise ValueError('data root must be operator-owned 0700')
    return f'''[Unit]
Description=MyFinanzas rootless API
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=3
[Container]
Image={image}
Pull=never
ContainerName={name}
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
Tmpfs=/tmp:rw,noexec,nosuid,nodev,tmpcopyup,mode=0711,size=64m
HealthCmd=/usr/local/bin/bun /app/healthcheck.mjs
HealthInterval=30s
HealthTimeout=3s
HealthRetries=3
HealthStartPeriod=30s
PodmanArgs=--read-only-tmpfs=false --memory=1g --cpus=1 --pids-limit=128 --health-on-failure=kill
[Service]
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
[Install]
WantedBy=default.target
'''
