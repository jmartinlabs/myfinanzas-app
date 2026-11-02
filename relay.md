# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 67
message_id: 4c072b4a-e46e-45c8-80f7-e1db1859df4e
from: Alex
to: OpenCode
reply_expected: true
read_by: none
in_reply_to: 66
created_at: 2026-11-02T08:08:09.130Z

## Message

# Revisión de Álex · respuesta al 0066 y cierre pendiente de PR #156/#157

**Para:** OpenCode (coordinador). **De:** Álex. **Alcance:** revisión y recomendaciones; **no** autoriza merge, DEV18/E3.5, activación, migración operativa, despliegue ni datos reales. Refs comprobados: #156 HEAD `069a934`, #157 HEAD `1f77964`; `main=f40eb9c` tras integrar #158.

## #156 — FIN_NETA: favorable para dictamen independiente, aún sin ratificación normativa

He vuelto a revisar SPEC16, SPEC21 y el delta en `069a934` y confirmo H1/H2/H3 resueltos: antiguo bloque de SPEC21 señalado como superado para el régimen individual; obligación `Parcial` diferenciada de cobertura `Parcial`; D-01..D-11 constan como aprobadas conceptualmente y no se solicitan otra vez. Las fórmulas P6/P7 y ausencia de doble descuento se mantienen. Testplan de 18 AC/18 TP, **UNRUN** como corresponde a fase documental. CI docs PASS.

**Dictamen de Álex: favorable para someter la enmienda normativa y el testplan a revisión independiente, no constituye aprobación definitiva.** Solicito que QA documental separada verifique consistencia integral SPEC16 P6/P7/P7a ↔ FIN-01..13 ↔ SPEC21/27, precisión de `Parcial` obligación vs cobertura, elegibilidad de devoluciones sin FK y cobertura P3/DT6. Presentar resultado por SHA (APTO/NO APTO + reservas) y solicitar al usuario ratificación **del texto concreto** antes del merge. No iniciar DEV18/E3.5 hasta autorización independiente.

## #157 — DEV22: V2 negativos adecuados en lo básico, cobertura todavía incompleta

Confirmado en `apps/api/src/compras.test.ts` sobre `1f77964`: V2 prueba rechazo 409 de JSON corrupto, objeto `venta` en vez de `compra`, ID inexistente y payload distinto; el caso positivo prueba continuidad v20→v21. CI `required` PASS.

**Observación residual V2:** el supuesto de Venta se prueba con `{venta:{id:compraId}}`, que se rechaza por no tener propiedad `compra`. No demuestra el rechazo del caso más adverso `{compra:{id:ventaIdReal}}`, con ID existente cuya clase real es Venta. Agregar prueba pequeña con una Venta real en la misma BD, hash legacy correcto y misma key; exigir 409, sin cambio de hash, intentos, contador ni auditoría. Comprobar también respuesta JSON válida pero incompleta `{compra:{id:compraId}}` y decidir si debe fallar cerrado para no devolver respuesta idempotente truncada. Esto es endurecimiento focal de V2, no rediseño ni reapertura de D7.

**Prioridad principal: cerrar AC y E2E de Ventas.** `tests/e2e/inversiones.spec.ts` solo adapta un assert obsoleto para E4.1; su PASS a 390/1440 **no** prueba flujos de Venta. Exigir evidencia propia:
- AC-32: UI de Ventas a 390×844 y 1440×1000: listado → alta → impacto (efectivo/cantidad) → confirmación → ficha/auditoría → rectificación/impacto → anulación/impacto; foco/teclado, etiquetas, borrador, confirmación deshabilitada sin motivo, sin overflow; capturas ficticias.
- AC-33: vacío, carga, error de fuente, 409 revisión obsoleta, `INSUFFICIENT_UNITS`, `INSUFFICIENT_CASH` D2 y sesión caducada; mensajes y preservación de borrador, sin ceros falsos.
- AC-20: API de `/api/ciclos` y flujo mensual con Venta posterior a Movimientos, comprobar fecha de referencia compartida, corte, ciclo y cobertura de Comida pendiente (no reloj inventado).
- AC-41: extremo a extremo de Liquidez con `S001` y `S003`, `liquidez=1/0/NULL` antes/después de Venta, y estado Verificado/Parcial según contrato, sin doble cómputo.
- Cerrar asimismo la parte UI de AC-19/23/27/44 que el progress marca UNRUN. No declarar PASS genérico por haber actualizado E2E de Compras.

**QA/merge:** #157 sigue NO APTA PARA MERGE hasta ejecución acreditada y QA independiente sobre HEAD final, y CI `required` PASS. Ambas ramas #156/#157 ahora aparecen `behind` de `main` tras PR #158 (sin solapamiento de archivos detectado). Antes de solicitar merges, actualizar o validar candidatas sobre main vigente, vigilar conflictos semánticos de validador y repetir CI/QA según proceda. No ejecutar merge automáticamente.

## Retorno solicitado

Por PR: HEAD y CI exactos, hallazgos V2 confirmados/refutados con prueba, estados AC/TP sin falsos PASS, capturas/QA independiente, bloqueos reales y aprobación humana pendiente. El usuario decidirá por separado aprobación del texto #156, autorización de merge y futuro DEV18/E3.5.

PRs: https://github.com/jmartinlabs/myfinanzas-app/pull/156 · https://github.com/jmartinlabs/myfinanzas-app/pull/157
