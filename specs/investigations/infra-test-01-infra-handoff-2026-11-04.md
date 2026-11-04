# INFRA-TEST-01 · Paquete de requisitos para vps-infra (2026-11-04)

**Estado:** `[PROPUESTA]` de coordinación. No autoriza DEV, acceso al VPS, DNS, Caddy,
UFW, Podman, despliegue, datos reales ni merge.
**Solicitante:** MyFinanzas. **Auditoría, provisión y operación del host:** `vps-infra`.
**Contrato de aplicación:** [SPEC34](../34-infra-test-01-specification.md), aprobada y
mergeada en `main` `58346e1` (PR #207).
**Antecedentes:** vps-infra PR #7 **CLOSED** (no vigente); vps-infra PR #9 es un **borrador
de host** creado bajo autorización previa y queda como input; su coordinador decide si lo
adopta, reemplaza o cierra. MyFinanzas **no modifica `vps-infra`** a partir de este paquete.

## 1. Frontera

| Elemento | MyFinanzas | vps-infra | Usuario |
| --- | --- | --- | --- |
| Release, runtime, seed, esquema, migraciones, tests | Propietario | Consume artefactos | Aprueba SPEC/DEV |
| Auditoría del host, usuario, rutas, UFW, Caddy, DNS, Quadlet | No accede | Propietario y ejecutor | Autoriza cada fase |
| Secretos y datos ficticios | Define requisitos | Custodia en host | Custodia personal |
| Despliegue, rollback y retirada | Entrega candidato y evidencia | Ejecuta | Autoriza |
| Aprobación de SPEC/merge/deploy | Documenta | Documenta | Decide |

## 2. Requisitos de aplicación que el host debe soportar

| Área | Requisito |
| --- | --- |
| Runtime | Imagen inmutable construida por `infra/release.py` desde un SHA verificado; Bun 1.4.3 por digest; `Pull=never`. |
| Proceso | API Bun/Effect en `3001`; frontend estático Vite servido por Caddy; Vite `5173` nunca público. |
| Contenedor | Podman rootless + Quadlet; UID/GID interno `10001`, `keep-id:uid=10001,gid=10001`; rootfs read-only; `cap-drop=all`; `no-new-privileges`; sin socket Podman; tmpfs 64 MiB. |
| Recursos | 1 GiB RAM, 1 CPU, 128 pids. |
| Puertos | Host loopback `127.0.0.1:18082` → contenedor `3001`; Caddy 80/443; API, SQLite y Vite no públicos. |
| Persistencia | Raíz de datos completa montada en `/var/lib/myfinanzas`; `state/database.sqlite` + `state/auth.key`, `0700`/`0600`, mismo directorio, sin symlinks/hardlinks. |
| Salud | `GET /api/health` → `200` `{"ok":true}`; ruta protegida sin sesión → `401`. |
| Seguridad | HTTPS, cookies `__Host-` Secure/HttpOnly/SameSite=Strict, `Origin` validado, CSP/noindex/nosniff, UFW sin puertos nuevos. |
| Copias | `age` cifrado; snapshot SQLite coherente; copia local + externa; restore a destino nuevo; nunca sobreescribir estado activo. |
| Rollback | Solo al par exacto release/imagen/esquema con prueba; si no, bloquear y preservar. |
| Seed | Artefacto **test-only** del mismo SHA, ejecutado en el host antes de `setup`; sin endpoint, sin SQL crudo, con marcador `test-instance.json`, manifiesto/checksums, guardas y reset archivado. |

## 3. Contrato de despliegue (interfaz, sin duplicar operación)

| Campo | Valor |
| --- | --- |
| `public_origin` | `https://test.myfinanzas.pp.ua` |
| `caddy_upstream` | `127.0.0.1:18082` |
| `api_container_port` | `3001` |
| `static_root` | `frontend/` del paquete verificado |
| `image` / `seed_image` | IDs inmutables del manifiesto; seed solo tareas efímeras |
| `container_uid_gid` | `10001:10001`, `keep-id` |
| `data_mount` | raíz de datos completa → `/var/lib/myfinanzas:rw` |
| `env` | `NODE_ENV=production`, `APP_ORIGIN`, `DATABASE_PATH`, `AUTH_KEY_PATH`, `API_BIND_HOST=0.0.0.0` (solo namespace) |
| `backup` | CLI de la misma imagen/UID; montaje separado; `age` |
| `rollback` | bloqueado sin prueba del par exacto |

## 4. Artefactos que entregará MyFinanzas

1. Release verificada: `image.oci.tar`, `frontend/`, `manifest.json`, `manifest.sha256`.
2. Artefacto de seed test-only con manifiesto y checksum propios.
3. Instrucciones mínimas de `production-init`, `seed init/apply/verify`, `setup`, backup y
   restore, ya documentadas en `infra/RUNBOOK.md`.
4. Evidencia del gate Rootless y de compatibilidad sobre el SHA candidato.
5. Dataset `FT-1` y manifiesto de verificación; sin datos reales.

## 5. Preguntas y decisiones que dependen de la auditoría

El host debe responder, con evidencia de solo lectura:

1. Usuario/UID disponibles, `subuid`/`subgid`, `linger`, límites y política de login SSH.
2. Versiones reales de Debian, Podman, Quadlet/systemd, Caddy y Bun del host.
3. Puertos `80/443/18082` libres y ausencia de conflictos con otros servicios.
4. Estructura real de Caddy: fichero principal, imports, sitio raíz y procedimiento de
   validación/recarga/rollback.
5. DNS: proveedor, TTL, A/AAAA, proxy/CDN del dominio raíz y cómo añadir `test` sin tocarlo.
6. UFW/red: reglas vigentes, loopback, IPv6 y exposición.
7. Disco/inodos: espacio, presupuesto TEST ≤ 5 GB y márgenes mínimos.
8. Destino externo de copia, custodia de claves y prueba de restauración.
9. Capacidad para ejecutar tareas efímeras de seed/backup con el UID correcto.
10. Cualquier diferencia entre esta interfaz y el host real.

## 6. Evidencia que debe devolver vps-infra

- Inventario redactado del host (sin secretos ni IPs privadas innecesarias).
- Confirmación de puertos, usuario, rutas, permisos, UFW y Caddy.
- Resultado de la unidad TEST, health, 401 y loopback.
- Copia/restore y rollback ensayados cuando se autoricen.
- Lista de decisiones que requieren aprobación del usuario y riesgos detectados.

## 7. Dependencias y límites

- E4.9/v25 **no mergeado**: TEST se ancla a esquema 24 y no prueba cierres.
- E4.5/DT7 no apta; E4.7/E4.10/E4.11 en DRAFT: fuera del dataset y smoke.
- DT6/T-BKP, gate Rootless, Caddy/DNS reales y flake B3 siguen abiertos.
- MyFinanzas **no accede al VPS**, no ejecuta administración, no modifica `vps-infra`, no
  duplica su documentación operativa y no despliega sin autorización.
