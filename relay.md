# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 61
message_id: 77f44e29-95c0-4f7d-8a38-3a4256ee5646
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: none
created_at: 2026-11-01T22:05:21.179Z

## Message

# Dictamen de Álex · revisión PR #156 y #157

**Para:** OpenCode (coordinador). **De:** Álex, asesor financiero/técnico. **Referencia:** revisión pedida por el usuario. Refs auditados sobre main `4eb72643ae257be3f82496eae17173a293dba800`. **Alcance exclusivamente de revisión**: ninguna autorización nueva de merge, migración de datos reales, activación, producción o DEV18/E3.5. Respetar autorizaciones ya existentes, especialmente DEV22, sin ampliarlas por inferencia.

## PR #156 · E3.5/FIN_NETA · HEAD `02808086a0d604da616107075a11467ceb302e7c`

**Estado observado:** OPEN Draft, cuatro archivos documentales, CI `required` PASS, mergeable. D-01..D-11 aprobadas **conceptualmente** con precisiones D-04/07/09/10; el texto normativo final no está ratificado. Los 18 AC y 18 TP siguen **UNRUN**. **Dictamen: favorable con ajustes; no merge todavía.**

**156-H1 · SPEC21 mantiene dos contratos simultáneos.** `specs/21-pendientes-conciliacion-specification.md:202-267` conserva el antiguo bloque `RECURSOS=S0+FIN_NETA+REP`, `CIERRE=RECURSOS−GC−CO`, `FALTA=max(CO−REP,0)`; `§4.3.2` líneas 267+ ya lo reconcilia con SPEC16 P7. Señalar expresamente el bloque anterior como **propuesta histórica superada para el régimen individual**; no dejarlo como segunda regla operativa. Preservar procedencia y las expresiones aprobadas: `Recursos=S0+F+R_caja−C_n`, `Base=Recursos−J_n`, `Otros=D−(F+R_caja−C_n−J_n)`, `Cierre=S0+D`, `Falta=max(C_n−R_obl,0)`. No descontar C_n dos veces; distinguir DIF_BANCO=S0−B_A de DIF_S0_SIGUIENTE=S0_siguiente−Cierre.

**156-H2 · obligación Parcial ≠ cobertura Parcial.** `specs/16-revision-comida-specification.md:1526-1536` agrupa bajo `Parcial` tanto (a) obligación compensable pendiente con datos íntegramente verificados como (b) cobertura/atribución incompletas. Exigir **dos dimensiones semánticas independientes** (estado de obligación, estado de cobertura), con nombres inequívocos y motivo por métrica; sin imponer DTO/columna nueva no aprobada. `R_obl<C_n` con cobertura Verificada no debe bloquear E4.9 por ese solo motivo; el cierre bloquea cuando FIN_NETA/E3.5 requerido es No verificable. `Completada` exige obligación positiva, cobertura y asignaciones acreditadas; ausencia de reposición/obligación no la simula.

**156-H3 · decisiones históricas no consolidadas.** `specs/investigations/e35-fin-neta-spec-delta-2026-11-01.md` documenta aprobación conceptual arriba, pero hacia línea 160 conserva «Ninguna opción está aprobada» y al final vuelve a pedir decidir D-01..D-11. Mantener como antecedente etiquetado cronológicamente o actualizar estados y siguiente paso: falta aprobar la **enmienda normativa final**, no reabrir once decisiones. Evitar tercer contrato vivo y duplicar P6/P7.

**Aspectos correctos:** single ledger Movimientos, F por rol explícito, una deducción de Anticipo, R_caja vs R_obl, S0 manual, devolución acreditada externamente sin FK admitida, legado sin doble suma, proveedor de lectura a E3.6/E4.9, testplan diseñado UNRUN. No reabrir P6/P7/P7a. Riesgo estático `comida.ts` de Transferencias sin rol (`roles.get(r.id)!`) exige prueba focal al autorizar DEV E3.5, sin adjudicarle PASS ni arreglarlo fuera de alcance.

## PR #157 · E4.2 DEV22 Ventas, schema v21 · HEAD `b1bd11f1495b46198762b610909d252c0c1af4a6`

**Estado observado:** OPEN Draft, 45 archivos, seis commits, mergeable, CI `required` Linux PASS (422 pruebas/0 fallos según entrega); typecheck y build reportados PASS. Las correcciones QA H-1/H-3 (rutas de Compra aceptaban Ventas), H-2 (restore v20), H-4 (referencia temporal) y H-5 ya están incorporadas y probadas según la PR. **Dictamen: no apta aún para merge**; tres hallazgos de revisión estática y pruebas de aceptación pendientes:

**157-V1 · impacto de rectificación sin guard D2 de efectivo.** `apps/api/src/ventas.ts:328-363` `previewSaleRectification()` llama `assertUnitsAvailable`, pero NO `assertSufficient`; `rectifySale()` sí lo hace en ~394. Un impacto puede parecer confirmable y la confirmación fallar con 422 `INSUFFICIENT_CASH`. Reproducir un caso en el que reducir el abono histórico deje saldo posterior negativo; exigir la misma validación de D2 para preview y ejecución, con prueba que falle antes del fix.

**157-V2 · incompatibilidad de hash idempotente de Compras pre-v21.** `apps/api/src/compras.ts:521-525` cambia el hash anterior `JSON.stringify(Object.entries(body).sort(...))` para anteponer `["clase","Compra"]`; la migración v20→v21 conserva `operacion_attempts`. Una compra con intento aún vigente puede devolver erróneamente `IDEMPOTENCY_CONFLICT` al reintento de misma key/payload tras upgrade. Reproducir mediante fixture v20 real con `operacion_attempts` válida; tras v21 mismo intento debe devolver mismo ID y no duplicar operación. Proponer compatibilidad sin borrar silenciosamente intentos ni degradar el aislamiento Compra/Venta.

**157-V3 · clase no inmutable en persistencia.** `apps/api/src/venta-schema.ts:16,47+` permite `Compra|Venta` por CHECK pero el trigger de identidad bloquea solo instrumento/saldos y no `clase`. La API impide editar clase, pero `UPDATE` SQL directo de una operación Vigente puede reclasificarla. Confirmar con regresión SQLite, proteger clase en trigger/contrato C21 y comprobar rechazo sin cambiar hechos ni auditoría.

**157-V4 · cierre de pruebas funcionales.** En `specs/22-ventas-posicion-broker-progress.md` quedan UNRUN: AC-20 parte endpoints/flujo, AC-19/23/27/44 parte UI, AC-32/33 Playwright a 390/1440 (teclado, foco, overflow, estados, impacto/confirmación/anulación), AC-41 flujo mensual/liquidez E2E. Requerir evidencia independiente, no asignar PASS por CI unitario. Corregir además el encabezado histórico del progress que aún dice «QA NO APTO y CI pendiente» aunque la descripción actual de PR informa correcciones y PASS. Ejecutar QA independiente final + CI en el HEAD resultante. Mantener fixtures ficticios y esquema/historial/backup/restore protegidos.

**Límites:** no reabrir SPEC22 ni D7 salvo contradicción real confirmada; corregir solamente con autorización/ownership DEV22 vigente. No merge automático.

## Retorno solicitado

Por cada PR: IDs de hallazgos, reproducido/refutado con evidencia, causa y propuesta exacta, archivos implicados, AC/TP PASS y UNRUN, CI/QA sobre SHA final, riesgos y decisión humana solicitada. No declarar entregada E3.5 ni completados los AC de UI sin ejecutar. Cualquier ampliación de alcance requiere autorización explícita del usuario.

Enlaces: https://github.com/jmartinlabs/myfinanzas-app/pull/156 y https://github.com/jmartinlabs/myfinanzas-app/pull/157
