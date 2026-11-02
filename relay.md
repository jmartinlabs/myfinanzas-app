# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 72
message_id: 25fe0114-513a-42fa-aaf4-87bb105e6c6e
from: OpenCode
to: Alex
reply_expected: true
read_by: none
created_at: 2026-11-02T10:41:59Z

## Message

# Decisiones y estado — #156, #157 y saneamiento

**De:** OpenCode · **Para:** Álex
**Sin merge pendiente salvo #157; sin DEV18/E3.5, migración ni datos reales.**

## Decisiones del usuario

- **#156:** merge **autorizado y ejecutado**; squash `8e4ef21`, CI post-merge PASS.
- **Lote documental:** autorizado y presentado en PR #159 (`134e1cd`, CI PASS, draft).
- **Validación sin código:** autorizada y ejecutada (resultados abajo).
- **H-SPEC26-02 / H-SPEC16-02:** solo revisión de alcance; **no implementar** hasta validar
  que son correcciones menores sin cambio de reglas financieras.
- **Actas de 12 SPEC:** preparación autorizada; **no ratificadas**.
- **SPEC09:** mantener semántica actual hasta resolver la ambigüedad.
- **SPEC17:** propuesta definitiva presentada en #159, pendiente de aprobación independiente.
- **Prioridad:** #157; sin waiver de E2E.

## #157 — QA final `d300bb2`

CI `required` **PASS** (432/0). E2E Ventas+Inversiones **2/2 PASS**; AC-19/20/23/27/32/33/
39/41/44 con evidencia; AC-40 API PASS / UI UNRUN.

**Dictamen QA: APTO CON RESERVAS; no merge todavía.**
1. Playwright completo 15/17; los 2 fallos son `restore-server` Linux-only (`libc.so.6`),
   no regresiones de Ventas. Falta E2E 17/17 y `verify --full` en Linux/glibc.
2. AC-40 UI: falta e2e Movimientos (preview → Venta → 409/huella → borrador).
3. AC-33/23 `pendiente`: solo se probó `error`.
4. Progress/testplan con “sin push/CI” y causa errónea de `catalog`; tablero con «DEV22 no
   iniciado».
5. PR draft; merge requiere aprobación explícita.

## #159 — saneamiento

- Lote 1: tracker, tablero, notas y actas preparadas; sin cierres declarados.
- Lote 2: SPEC04 E2E **FAIL/BLOCKED** en restauración; `verify --full` **FAIL** de entorno
  macOS; SPEC32 AC-22 typecheck/build PASS, E2E/rootless **UNRUN/BLOCKED**.
- Lote 3: H-SPEC26-02 (precierre usa consulta paralela en vez de `positionsFor(...,fin)`) y
  H-SPEC16-02 (`roles.get(r.id)!` con Transferencia sin rol). Propuestas documentadas, sin
  implementar.
- Lote 4: 12 actas con evidencia y límites; pendientes de ratificación.
- Lote 5: SPEC09 registrada; SPEC17 propuesta de mantener texto/D1–D7 y aprobar
  specification/wireframes sin cambios financieros.

## Confirmación solicitada

- ¿H-SPEC26-02 y H-SPEC16-02 son correcciones menores sin cambio de reglas financieras?
- ¿La propuesta SPEC17 es correcta o falta una precisión?
- ¿El gate #157 exige E2E 17/17 en Linux y AC-40 UI, o algún criterio adicional?

Sin autorizaciones nuevas de merge, DEV18/E3.5, migración ni datos reales.
