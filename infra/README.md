# MyFinanzas VPS deployment — preparation only

**Status: NOT deployable.** This folder is a design proposal. Templates end in
`.example` deliberately, to prevent accidental Quadlet activation.

## Confirmed operational environment (2026-10-21)

- Aruba VPS, Debian 13, 2 vCPU, 4 GB RAM, 40 GB disk; admin `mfadmin`.
- Rootless Podman and user Quadlet/systemd tested with a temporary Nginx
  container, removed afterwards.
- Caddy serves a static placeholder on `https://myfinanzas.pp.ua`.
  Ports 80/443 public; API is *not* public or deployed.
- SSH key authentication tested, root SSH login and password authentication
  disabled; firewall enabled; system clock synchronized.
- Private host directories `/home/mfadmin/myfinanzas/data` and
  `/home/mfadmin/myfinanzas/backups` (mode 0700).
- No Excel or real finance data on the VPS.

These observations describe the user-verified server state, not a CI environment
or automated inspection of the VPS. The repository does not control Caddy yet.

## Target topology

Browser HTTPS → host Caddy (static Vite build + `/api/*` proxy)
→ host loopback `127.0.0.1:18081`
→ rootless Podman API port 3001 → private SQLite and auth key volume.

Caddy serves the built frontend; do **not** expose the Vite dev server.
API proxy must preserve the exact public origin for SameSite/CSRF and host-only
Secure cookies; verify headers under real HTTPS.

## Bloqueos históricos previos a 31/32 (no instrucciones vigentes)

1. `apps/api/src/database.ts` intentionally rejects `NODE_ENV=production`
   before touching SQLite and seeds fictional Saldos for new demo databases.
   Implement and test an explicit **clean production bootstrap** with no demo
   data and no implicit migration of a demo database. Preserve and test
   supported v1–v4 upgrades and guard unexpected/unknown schema versions.
2. `apps/api/src/main.ts` currently binds to `127.0.0.1:3001`
   *inside the process*. For Podman port publishing, add a validated bind-host
   configuration: loopback for local dev, container interface only when
   explicitly configured for deployment. Host exposure must stay
   `127.0.0.1:18081` regardless.
3. Define immutable/pinned image build (Bun 1.4.3, `bun.lock` frozen),
   reliable startup health check, read-only root filesystem and writable
   private state. Confirm rootless UID permissions and SQLite WAL behavior
   across restart/upgrade before using the template.
4. Validate Caddy's actual route ordering, SPA history fallback, content
   security policy and headers (including cache handling), cookie Secure/Origin,
   API rate limits and direct-port non-reachability.
5. Existing `age` encrypted backup and isolated restore are retained.
   Implement off-server encrypted copies, scheduling, retention
   (7 daily / 4 weekly / 3 monthly), recovery-key custody *off VPS*,
   monitoring and a timed restore drill; target RPO 24h / RTO 2h.
6. Verify VPS at-rest storage encryption, vulnerability/update procedure,
   least-privilege runtime, key persistence and operational recovery.
7. Never import `MyFinanzas2026_v5.11(5).xlsx` or real data without separate
   explicit migration approval and financial validation; Excel remains master.

## Activation gates

- Approval of code + tests and an independently reviewed PR/merge.
- Deployment-specific authorization, after checking production readiness.
- Caddy placeholder stays live until all above checks are satisfied.
- Do not copy `*.example` directly into systemd user Quadlet directory or
  replace the live Caddyfile today.

See `infra/Caddyfile.example` and
`infra/myfinanzas-api.container.example` for **non-executable** sketches.
Neither is a completed deployment recipe.


## Preparación de persistencia 31 (sin activación)

La rama de implementación 31 resuelve el bootstrap limpio mediante esquema v6
e identidad persistente, sin habilitar despliegue. El bloqueo 1 anterior describe
main antes de esta entrega; tras revisión/merge se deberá verificar el nuevo
contrato, no eludirlo. Las plantillas `.example` permanecen sin activar/modificar.

La raíz de datos privada del volumen puede contener un nuevo subdirectorio de
estado, por ejemplo `/var/lib/myfinanzas/state/database.sqlite` y
`/var/lib/myfinanzas/state/auth.key`. Solo son rutas de diseño para alinear la
futura imagen/Quadlet: no son cambios aplicados al VPS. La inicialización exige
ese subdirectorio inexistente y publica DB+clave juntas. El runtime exige ambos
archivos existentes 0600, estado 0700 y UID efectivo; no corrige permisos ajenos.
Linux/glibc con renameat2 es requisito de la publicación sin reemplazo.

Los bloqueos 2–7 (bind, imagen/UID real, Caddy/HTTPS, copia externa y operación)
siguen pendientes. El dominio real, Podman y los directorios del VPS no se han
inspeccionado ni modificado. Ver [flujo CLI](../README.md) y
[aceptación 31](../specs/31-sqlite-produccion-testplan.md).

## Preparación 32 vigente — sin activación

La inicialización segura 31 ya está integrada; el bind explícito 32 y el paquete
definitivo se verifican en PR #30. Los bloqueos históricos anteriores conservan
contexto, no describen literalmente main actual. [Runbook](RUNBOOK.md),
`Containerfile`, `release.py` y `runtime.py` definen build privado/pareado,
verificación, UID/volúmenes y unidad revisable. La plantilla se ha alineado con
state, keep-id y endurecimiento; sigue sin instalarse ni activarse.
El workflow ahora usa la receta definitiva, no Containerfile.probe. El estado
verificado de los 24 criterios está en el [testplan](../specs/32-ejecucion-rootless-testplan.md);
preparar un script no acredita su ejecución. VPS/Caddy/HTTPS, copias externas,
custodia y despliegue siguen sujetos a sus gates independientes. R6/fsync y el
fallo API histórico permanecen abiertos.
