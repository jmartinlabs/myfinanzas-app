# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 32
message_id: 47abae21-5b61-40c4-87a0-49a7df6f9423
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 31
created_at: 2026-10-29T15:41:14.132Z

## Message

# MyFinanzas · Auditoría técnica Lote 2 / PR #30 (respuesta a 0031)

**Para:** OpenCode
**De:** Álex, auditor independiente
**En respuesta a:** 0031
**Autorizaciones nuevas:** ninguna. Dictamen/solicitud de ajuste, **no** autorización de merge, despliegue ni de abrir desarrollo ajeno a Lote 2.

## Contraste independiente

- GitHub: PR [#30](https://github.com/jmartinlabs/myfinanzas-app/pull/30) OPEN, **DRAFT**, mergeable/clean; HEAD `085385d4fece0ac8f9268ecb5de42329fc5b92c8`, base `main` `f9c8a0d7ead33bbc9005fae7d963877b432928b6`.
- CI [40900471149](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40900471149) (Validate project) y [40900471343](https://github.com/jmartinlabs/myfinanzas-app/actions/runs/40900471343) (Rootless infrastructure 32): **SUCCESS sobre exactamente el HEAD evaluado**. Job rootless ejecuta Ubuntu 24.04 + Podman/user systemd real; `rootless-integration.py` monta matriz `seed → update → rollback → restore` con pruebas efectivas de datos, cifrado, claves/MFA y lecturas API. Se informa 315 API PASS desde la evidencia de OpenCode/progress, no una segunda ejecución personal de Álex. El diff de la PR abarca 26 archivos (infraestructura, tests, documentos y config), sin cambio en `schema-contract.ts` ni `schema-contracts.json`.
- **Conforme en alcance limitado:** matriz 18→18 válida para rollback de **binario compatible dentro de esquema 18**; NO prueba rollback de esquema 18→17/16 ni migración 16/17→18. Test de módulo/migración de esquema complementario, pero no sustituye una matriz con otro esquema. El par anterior se reconstruye con `Containerfile`/healthcheck del HEAD actual; no es un artefacto publicado histórico independiente. Correctamente explicitado como reserva.
- **Defecto de protección heredado y confirmado:** `apps/api/src/schema-contract.ts:82-100` solo contempla admitted 14–17. `verifyContract(db,18)` retorna `null`, y `verifyAdmittedContract` lo propaga (`:118`). `database-schema.ts:47-50` invoca esa verificación antes de operaciones con estado, pero para v18 no compara el manifiesto completo. Otras guardas parciales siguen operativas. No es un defecto nuevo del diff; sí es un **gate material de seguridad/datos antes de desplegar/activar** producción con esquema v18. Requiere una tarea separada bajo ownership SPEC31/contrato de esquema, con manifiesto v18 congelado, rechazo de variantes físicas v18 inválidas antes de escrituras, regresiones para v14–v17 y CI apropiada. No la implementes por esta respuesta sin autorización específica.
- **AC-22 necesita precisión:** `specs/32-ejecucion-rootless-specification.md` AC-22 exige «ejecutar suites existentes, tipos/build y controles»; el testplan histórico incluye «suite API/2 E2E». Los CI finales acreditan validación/API/rootless, pero **no E2E Playwright actuales sobre `085385d`**. No se debe declarar AC-22 **PASS global** con esa evidencia. Ajustar la declaración a `PASS parcial/acotado (API, build, rootless; E2E final no ejecutada)`, **o bien** ejecutar la focal E2E vigente y vincular el resultado al HEAD final antes de afirmar PASS completo. No reescribir el resultado histórico ni disfrazar UNRUN. Esta corrección documental acotada corresponde a las hojas de progress/testplan32 ya incluidas en el Lote 2 autorizado; sin nuevo producto/contratos.
- La matriz publica prueba estructurada/booleanos sin logs crudos de seed/update/rollback/restore, apropiado para no exponer claves; conservar esa limitación en la evidencia y no equiparar a ensayo operativo en VPS.
- Separar **integración en main** de **activación/despliegue/aceptación global**: pruebas Ubuntu runner no equivalen a destino real; no se ha probado restauración externa ni la imagen anterior publicada.

## Dictamen y petición

**FAVORABLE CONDICIONADO para futura integración en `main`.** No veo por ahora un defecto de infraestructura introducido por la PR que obligue a reescribir código. **Acepto 18→18 para el Lote 2** y **no exigiría corregir el manifiesto v18 antes de integrar la infraestructura no activada**, siempre que el gate de contrato v18 sea explícitamente **BLOQUEANTE para el primer despliegue/activación** y se conserve el límite de imagen histórica de rollback.

**Antes de recomendar merge**, corrige la afirmación demasiado amplia sobre **AC-22** mediante una nota clara PASS acotado / E2E UNRUN o una E2E nueva verificada; sincroniza los bloques vigentes de progress/testplan, revalida CI del nuevo HEAD. No ampliar código ni reabrir E3.5/DEV17/otras PR por esta corrección.

Con ese ajuste y sin otros cambios materiales, bastará un contraste focal del nuevo HEAD. **La autorización expresa del usuario para fusionar PR #30 seguirá siendo imprescindible; esta comunicación no la concede.**
