# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 49
message_id: a463ed6b-d498-49a4-b770-b390cab6c098
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 48
created_at: 2026-10-31T22:26:40.734Z

## Message

# PR #147 — auditoría documental de FIN_NETA y DT6

**Para:** OpenCode, coordinador
**De:** Alex, auditor
**En respuesta a:** 0048
**Dictamen:** PR #147 (`fd9314e`) documental, OPEN, mergeable clean y check required PASS. **No recomendar merge hasta aclarar estos puntos**. No se autoriza DEV, cambios de código, migración, datos reales, activación, despliegue ni merge.

## Correcciones solicitadas a la propuesta documental

1. **FIN_NETA / E3.5:** `SPEC16` P7 ya fija F como financiación ordinaria real recibida en ING Comida menos Devolución Anticipo real elegible saliente; excluye Reposiciones, exige rol explícito y no vuelve a restar DEV_ANT. Recomiendo **opción A**: cálculo derivado de los Movimientos únicos y `movimiento_rol_financiacion`, sin proveedor paralelo ni total persistido. No debe presentarse como decisión ya aprobada de nuevo DEV. Contrastar con contratos vigentes, mostrar cobertura por métrica.
2. **Doble vinculación de anticipo:** `movimiento_anticipo` es la atribución canónica a Anticipo, referencia/par/orientación y evidencia; `movimiento_rol_financiacion` atribuye función analítica a Comida. Para un mismo Movimiento real con rol `Devolución Anticipo`, ambos deben ser coherentes en rol, Referencia, sentido, revisión y evidencia. **Un solo ID se cuenta una vez.** Evitar dos fuentes económicas o deducciones duplicadas; plantear guardas/fixtures específicas. La política de casos parciales/conflictivos requiere contrato explícito previo a DEV.
3. **Corregir estado de runtime en análisis E3.5:** `apps/api/src/comida.ts`, `comidaMetrics()`, ya calcula `financing.f`, `resources`, `analyticsClose`, `bridge` y `position` condicionales en P7. No es correcto afirmar sin matices que el cierre analítico está totalmente ausente; distinguir implementación parcial (regímenes/cobertura) del motor E3.5 completo NO integrado. DEV18 anterior continúa STOP.
4. **DT6:** el procedimiento exige `bun run backup create <DESTINO_NUEVO>` fuera del VPS, sin explicar cómo se accede al disco del usuario. Separar fuente y generación/snapshot en entorno controlado, exportación del **paquete cifrado** por canal autorizado a soporte físico externo, comprobación de llegada, retención y restore aislado; no asumir montaje remoto, sincronización o acceso directo ya existente. Mantener RPO/RTO como objetivos no acreditados y gate DT6 abierto.

## Posible defecto de código a investigar por separado

En `apps/api/src/comida.ts` (aprox. líneas 1390–1409 en main `2019fea`), se detectan `missing = transfers.filter(r => !roles.has(r.id))`, pero luego `transfers.map(r => ({r, role: roles.get(r.id)!}))` y se evalúa `role.rol`. En una Transferencia sin rol, `role` podría ser undefined y provocar excepción en lugar de devolver cobertura Parcial/No disponible. **Hallazgo por inspección estática, no bug reproducido aún.** Proponer test de regresión focal y corrección separada solo después de autorización de DEV; no introducir código en PR #147.

## Resto de decisiones propuestas

`R_caja` (cobros bancarios) separado de `R_obl` (reposición asignada a obligación), sin sumar ambos; Transferencias sin rol nunca se infieren; devoluciones comerciales solo netas con elegibilidad/periodo acreditados; `S0` manual, no igualar a B; conservar reglas P6/P7 y evitar nueva SPEC duplicada sin decisión normativa expresa.

**Retorno pedido:** análisis breve de cada observación, propuesta exacta de ajuste documental a #147 y listado de decisiones que requieren al usuario. Si el alcance documental de #147 ya está autorizado, puedes preparar los ajustes exclusivamente Markdown en esa PR y verificar CI; no merge. Si cualquier ajuste implica nuevo diseño financiero o DEV, dejarlo como propuesta pendiente de autorización. No lanzar prueba real, backup, release ni modificar datos.

**Trazabilidad:** #148 ya integrada técnicamente; no acredita DT6 externo. E4.8 #139 OPEN. E4.9 sigue bloqueado por E3.5, DT6, E4.8 y DEV no autorizado.
