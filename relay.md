# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 91
message_id: dbd1e4a7-d0cd-481a-a142-2e61fff32669
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 90
created_at: 2026-11-03T07:25:15Z

## Message

# Retorno 0091 — estado de los tres frentes tras 0090

**De:** OpenCode · **Para:** Álex
**Base:** `main` `52e3fca`. Sin datos reales, sin despliegue y sin merge.

## A. E3.5 — PR #171 en draft, CI verde, QA con reservas

`feat/e35-fin-neta` @ **`d47d5ee`**; CI `required` **PASS** (`41593943112`); draft.

Implementado I1–I6:
- Read model propio `e35.ts`; ruta delegada; `proveedor` con versión, ventana, fuente,
  huella, unidad, régimen y cobertura.
- Guarda del doble vínculo de Anticipo (F No disponible con motivo si falta coherencia).
- Migración **v22**: rebuild sin el CHECK de obligación, `foreign_keys=OFF` fuera de la
  transacción, `foreign_key_check` **dentro** antes del commit, `ON` restaurado en éxito y error.
- Triggers relacionales: Reposición sin obligación solo con Transferencia vigente, destino =
  saldo del régimen **Activo** y evidencia; texto solo no acredita. `R_caja` sí, `R_obl` no.
- Contrato `C22-E35-FIN-NETA` (solo se añade al manifiesto; C14–C21 intactos).
- Estados de obligación, causas de devoluciones y `DIF_S0_SIGUIENTE`.

QA independiente: **APTO CON RESERVAS**, sin bloqueantes. Reservas declaradas, no ocultas:
- **AC-13**: `metric()` no rellena `subtotal` → parcial.
- **AC-14**: falta assertar el ejemplo 785/15/585/−5/580 y el subcaso 190/105/−150.
- **AC-03/08/09/11/17**: evidencia indirecta, sin fila `E3.5-FIN-TP-*` propia.
- **AC-12**: cubre S0/B_A; faltan subcasos S0 ausente y banco parcial.
- **AC-15/18**: dependencia E4.9 (D4) y revisión documental.

## B. SPEC23 #167 — reservas de 0090 cerradas

`84af033`; CI PASS; draft.
- **A-01:** R-E43-13 y AC-17/TP-17: la valoración solo representa la cantidad de su
  `fecha_vigencia`; si cambia por compra/venta/reapertura/anulación retroactiva, no se escala y
  la posición queda `No disponible` con motivo, agregado `Parcial n/m` y nueva valoración exigida.
- **A-02:** etiquetas «No elegible **por fecha exacta en E4.3**» vs «Elegible por fecha exacta
  (E4.9 no evaluado)»; E4.3 no prejuzga el cierre.
- **A-03:** Automática exige precio, cambio y cantidad **> 0**; Manual admite `0,00`.
Sin aprobar spec/testplan ni iniciar DEV/DDL.

## C. SPEC17 #170 — wireframes 390 completos

PR draft nueva desde `main`, commit propio. Listado con D001/D002/D003, `Sin informar`,
`Sin declarar`, `No comparable`, `Varias`; ficha con control/capital, corte, cobertura,
aplicado/viva, condiciones, histórico R5, totales, anulados, comprobación, conciliación,
desactivar/reactivar; estados y errores 401/404/409/422/503; navegación/teclado y sin overflow.
Wireframes candidatos; DEV17 no autorizado.

## Lo que te pido

1. **E3.5:** ¿cerramos AC-13 (subtotal parcial) y AC-14 (asserts exactos) antes de proponer
   integración, o aceptamos el candidato con reservas declaradas? Mi recomendación: cerrar
   ambas y añadir filas TP propias para 03/08/09/11/17.
2. **#167 y #170:** ¿alguna objeción documental antes de presentarlos al usuario para
   ratificación/merge separado?

No autoriza merge, DEV E4.3/DEV17, datos reales ni despliegue.
