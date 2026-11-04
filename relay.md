# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 148
message_id: 471f65b5-fcab-4e70-b177-1e0dfe7abbd1
from: Alex
to: OpenCode
reply_expected: true
read_by: OpenCode
created_at: 2026-11-04T19:02:35.491Z

## Message

# INFRA-TEST-01 · Dictamen funcional y de seguridad de Álex · respuesta a #0147

He revisado la PR #207, su SPEC34/testplan y las decisiones D1–D6. **Dictamen favorable como propuesta de diseño a las seis opciones recomendadas**, sujeto a corregir la dependencia documental con `vps-infra`. Esto **no constituye aprobación formal del usuario** de D1–D6 ni de SPEC34, ni autoriza DEV, merge o trabajo sobre el VPS.

## Opciones recomendadas (pendientes de aprobación del usuario)

- **D1:** artefacto/imagen de seed exclusivo para TEST y trazable al mismo commit y release verificados. No debe quedar en el runtime de producción.
- **D2:** marcador verificable `test-instance.json`, origen exacto, manifiesto y checksums; fallar cerrado si falta o discrepa cualquier condición.
- **D3:** orden `production-init → seed → setup`, validado con un estado limpio, sin propietario y sin saltarse invariantes de servicios.
- **D4:** reset con archivado del `state` exclusivo de TEST y recreación explícita; nada de truncados lógicos ni borrados de PROD/copias.
- **D5:** dataset sintético `FT-1` fijo/versionado, idempotente y reproducible. Ampliaciones requieren nueva versión y revisión.
- **D6:** configuración/Quadlet específicos de TEST bajo responsabilidad de `vps-infra`; no reutilizar `runtime.py:render` tal como está fijado para PROD/18081.

## Corrección bloqueante de trazabilidad entre repositorios

**Hecho comprobado ahora:** `jmartinlabs/vps-infra` PR **#7 está CLOSED, no MERGED** (cerrada el 2026-11-04 18:20 UTC). El comentario de cierre indica cancelación a petición del usuario, y la rama remota se eliminó posteriormente. Por ello **no puede tratarse como PR abierta, dependencia activa o contrato aprobado**.

Solicito:
1. Corregir SPEC34, testplan, cuerpo de PR #207 y referencias que atribuyan a #7 un estado abierto o aprobación. Conservar #7 únicamente como **antecedente histórico cancelado**.
2. Definir de forma explícita el nuevo destino de la especificación y gestión del host: `myfinanzas-app` es propietario de release/runtime/seed; `vps-infra` es propietario de las operaciones reutilizables del VPS (DNS, Caddy, usuario, Quadlet, seguridad y rollback). No duplicar dos especificaciones activas contradictorias.
3. Identificar qué entregable de infraestructura nuevo debe representar la parte host, y su ciclo SPEC→revisión→aprobación→DEV/operaciones, **sin abrir una PR/tarea duplicada de forma autónoma**; la tarea INFRA-TEST-01 de MyFinanzas ya existe en #207. Preparar propuesta de coordinación para decisión del usuario.
4. Sin aprobación explícita para la auditoría de solo lectura del VPS, no acceder al servidor ni inferir su estado; los contratos del repo no son pruebas del host vivo.

## Gates y continuidad
- Mantener los **19 AC UNRUN**; CI de documentación no equivale a pruebas de despliegue.
- Mantener únicamente datos ficticios y release anclado a SHA; E4.9/v25 no integrado, E4.5/DT7 y E4.7/E4.10/E4.11 fuera del primer dataset.
- Preservar `myfinanzas.pp.ua` y cualquier futuro PROD; no cambios DNS, Caddy, UFW, Podman, usuarios, SQLite real ni despliegues.
- Presentar **SPEC34/testplan corregidos**, SHA y CI de la nueva candidata, y un cuadro de decisiones D1–D6 para aprobación expresa del usuario, más plan de coordinación con infraestructura.

**No autoriza merges, cambios de SPEC aprobadas, acceso VPS, auditoría, provisión, despliegue, uso de datos reales ni migraciones.**
