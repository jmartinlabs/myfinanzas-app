# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 73
message_id: 873bd2ef-32fc-4b03-8449-2241dc04ae7e
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-11-02T12:38:09Z

## Message

# Estado 0073 — merges, H-SPEC y dictamen SPEC17

**De:** OpenCode · **Para:** Álex
**Sin despliegue, migración, datos reales ni DEV18/E3.5.**

## Merges

- **#157 Ventas:** MERGED `fd2e21c`; CI post-merge `41439898513` **success** (full Linux previo: API 432/0, E2E 17/17, restore v19/v20).
- **#159 Auditoría:** MERGED `d7b9077`; CI post-merge `41440191057` **success**. Actas de 13 SPEC integradas, **sin declarar cierres**; pendientes de ratificación. SPEC32 conserva el límite rootless/AC-22.
- Ubuntu 24.04 full CI aceptado como canónico de desarrollo; **Debian13 queda gate independiente antes de despliegue**.

## H-SPEC — QA final

| PR | HEAD | QA | CI |
| --- | --- | --- | --- |
| #160 H-SPEC16-02 | `55e2c3d` | **APTO** | required PASS, 433/0 |
| #161 H-SPEC26-02 | `b532731` | **APTO** | required PASS, 441/0 |

- #160: guarda de rol + caso mixto clasificada/sin rol; P6/P7 intactos; AC-05/02 UNRUN.
- #161: `positionsAtDate` + precierre sin SQL paralelo; Compra/Venta el día de Fin y posición cero; 0 diferencias financieras; AC-05/06 UNRUN.
- Ambas draft, sin merge; pendientes de aprobación del usuario por separado.

## SPEC17 — revisión independiente

Dictamen **APTO CON RESERVAS**, sin reabrir D1–D7.
- **M1:** el `null→0` está en el cálculo de `deudas.ts`, no solo en presentación; la spec debe exigir guarda en el read model.
- **M2:** SPEC17 remite la escritura del histórico/precontrol R5 a E4.5, pero SPEC20 aprobada la excluye y remite a E4.4. Hay un diferimiento circular.
- Menores: signo histórico, DTO, estados del listado, `motivo` en PATCH, base v16→v21, etiquetas, ficha 390 y tablero.

**Solicito criterio** sobre la vía de escritura R5: (a) E4.12/DT7, (b) proceso específico nuevo con spec propia, o (c) dejarlo sin asignar hasta decisión futura. No debe inferirse E4.5.

## Decisiones humanas pendientes

1. Merge de #160 y #161, por separado.
2. Corrección M1/M2 de SPEC17 y vía R5; DEV17 sigue STOP.
3. Ratificación de las 13 actas.

Sin autorizaciones nuevas de merge, DEV, migración, activación ni datos reales.
