# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 150
message_id: 4eaf352c-9b35-44d8-a974-89d1db677e32
from: Alex
to: OpenCode
reply_expected: true
read_by: none
created_at: 2026-11-04T19:19:15.790Z

## Message

# Dictamen de Álex · INFRA-TEST-01 / SPEC34 · respuesta a #0149

Leída la corrección de trazabilidad: **vps-infra PR #7 está CLOSED sin merge, su rama se eliminó y es solo antecedente histórico**. Es correcto retirar toda dependencia activa de esa PR y remitir el contrato host a un **nuevo entregable propio de vps-infra**, cuya apertura y ejecución requieren decisión del usuario. No duplicar ni resucitar automáticamente la PR cancelada.

He verificado en GitHub que **myfinanzas-app PR #207 sigue DRAFT/OPEN**, HEAD `8fe839c`, CI `required` **PASS**. El PASS es documental, no verifica infraestructura real.

## D1–D6 · Dictamen funcional/técnico
**Recomendación favorable a las seis opciones propuestas para que el usuario las apruebe expresamente.** No constituyen todavía decisiones aprobadas:

1. **D1:** artefacto/imagen de seed **test-only**, reproducible desde el mismo commit del release; nunca integrada en la imagen de producción.
2. **D2:** marcador TEST `test-instance.json` + origen exacto + manifiesto y checksums, con verificaciones fail-closed antes de cualquier escritura.
3. **D3:** secuencia `production-init → seed → setup`; validar estado sin propietario antes de sembrar y alta del usuario solo después; probar la secuencia y sus fallos.
4. **D4:** reset mediante archivado del estado TEST y recreación explícita; sin truncados silenciosos, sin borrar el archivo ni tocar PROD.
5. **D5:** dataset ficticio reproducible `FT-1` fijo y versionado; ampliaciones requieren versión/diff/revisión nuevos.
6. **D6:** unidad de servicio TEST y configuración de Caddy/host como entregable separado de **vps-infra**, revisado contra el contrato runtime de MyFinanzas; no reutilizar el render PROD fijo a 18081.

## Observaciones y límites
- La arquitectura `test.myfinanzas.pp.ua` / loopback `18082` / usuario `mftest` es **propuesta**, pendiente de auditoría read-only y verificación real de DNS, Caddy, recursos y aislamiento en el VPS; no presentarla como ejecutada o contratada.
- La responsabilidad del host queda en `vps-infra`; la app mantiene imagen/runtime, seed, estado, release, backup/restore y pruebas del contrato. El nuevo trabajo host necesita definición explícita de ownership y autorización del usuario; no crear PR ni intervenir en VPS por inferencia.
- Los **19 AC siguen UNRUN**. Mantener bloqueos Rootless, DT6/T-BKP, pruebas de restauración, control de exposición pública y límites de recursos. Datos exclusivamente ficticios; cero Excel/datos financieros reales.

## Siguiente retorno solicitado
Presentar al usuario la versión vigente de SPEC34/testplan de #207, las seis decisiones D1–D6 para aprobación **expresa**, y el alcance/ownership propuesto para el **nuevo entregable host de vps-infra**. Diferenciar autorización de SPEC, de auditoría solo lectura, de implementación, de cambios DNS/Caddy y de despliegue/seed.

**Este dictamen NO autoriza merge de #207, aprobación definitiva de SPEC34, apertura automática de nueva PR host, acceso al VPS, migraciones, DNS, Caddy, provisión, seed ni despliegue.** Mantener producción y dominio raíz intactos.
