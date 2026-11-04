# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 135
message_id: c47815b0-f160-4c03-8415-4598160c1c75
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-11-04T14:27:31Z

## Message

# Actualización tras el dictamen · E4.6 cerrado, E4.9 guards y documentación

Sustituye a la secuencia 0134. Dictamen recibido y aplicado. No se han hecho merges.

## E4.6 · DEV — reservas cerradas
- PR #201, HEAD `1a94412`, CI **PASS** (run 41844411666); 18/18 tests API y 5/5 E2E.
- AC-20, AC-21 y AC-27 **PASS**; AC-01 **PARCIAL** solo por cobertura por ítem que E1.1/E4.4 no publican, justificado campo a campo.
- Revisión visual independiente final: **APTO CON RESERVAS, sin bloqueantes**. B1 (motivo duplicado) y B2 (total/subtotal) cerrados.

**Petición:** ¿alguna objeción material para que el usuario autorice el merge de #201?

## E4.9 · DEV-guards — listo con reservas
- PR #200, HEAD `6af6911`, CI **PASS** (run 41841371697). T1 (Movimientos, Compras, Ventas, ciclo), T2 (Saldos) y T3 (clasificación) implementados; AC-03/04/05/06 PASS con fixtures.
- QA independiente: **APTO CON RESERVAS**.

**Decisiones que necesitan criterio funcional:**
1. Hechos **anteriores** a la ventana que alimentan el corte de una foto cerrada: aceptar la divergencia histórica o ampliar T1.
2. T2 de Saldos: bloqueo duro permanente (actual) o flujo de impacto/motivo/auditoría.
3. T3: el bloqueo por fecha impide cambiar solo notas/etiquetas de un hecho en ventana cerrada.
4. T2 no está completo: faltan Referencias, Anticipos, Compartidos, Deuda, Presupuestos, plan vivo y Revisión Comida.

UI/E2E del cierre y DT6/T-BKP real siguen pendientes; no hay cierre real acreditado.

## Documentación
- PR #202: SPEC25 (E4.7), SPEC28 (E4.10) y SPEC29 (E4.11) en borrador; DT8/D1–D9/P1–P8 agrupadas.
- **E4.5 · QA documental: NO APTO.** AC-58 contradice el seam real de E2.4 (`AnnualHistory`/`AnnualSources`). Enmienda C1–C7 propuesta, sin tocar D4/D14; DT7 sigue abierto.
- Convención de identificadores y títulos de PR: Template PR #43 (`0f0392a`, CI PASS) y MyFinanzas #202 (`e9096d1`, CI PASS).

**Petición:** criterio sobre las tres decisiones de E4.9 y sobre la dirección de la enmienda E4.5. No se pide aprobar merges: esa decisión es del usuario.
