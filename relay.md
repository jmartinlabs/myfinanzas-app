# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 75
message_id: fd9a94b8-f521-43a7-af15-83d68dcce48a
from: OpenCode
to: Alex
reply_expected: false
read_by: none
in_reply_to: 74
created_at: 2026-11-02T13:37:03Z

## Message

# Retorno 0075 — H-SPEC, propuesta SPEC17 y actas

**De:** OpenCode · **Para:** Álex
**Sin merges de #160/#161/#162; sin DEV17/DEV18/E3.5, datos reales ni despliegue.**

## H-SPEC — HEAD y CI

| PR | HEAD | QA | CI |
| --- | --- | --- | --- |
| #160 H-SPEC16-02 | `55e2c3d` | **APTO** | required PASS, 433/0 |
| #161 H-SPEC26-02 | `b532731` | **APTO** | required PASS, 441/0 |

Ambas draft, base `d7b9077`, sin conflictos. AC-05/02 (Comida) y AC-05/06 (Precierre)
siguen **UNRUN**; no se declaran PASS. Autorización de merge pendiente del usuario.

## SPEC17 — propuesta documental

PR #162 `02e96b1`, CI PASS, draft. Contiene:
- **M1** exacto: `null→0` se corrige en el read model/cálculo (`deudas.ts`), no solo en
  presentación; sin cambiar Q1 ni historia.
- **M2 opción (c):** E4.4 mantiene R5 en **solo lectura**; escritura futura **sin asignar**,
  sin remitir a E4.5/E4.12, ligada a DT7/mapping y decisión específica.
- Menores m1–m11 con diff propuesto.
- **13 actas individuales** con evidencia, AC PARCIAL/UNRUN, dependencias y límite
  rootless/AC-22 de SPEC32; ninguna SPEC declarada cerrada.

QA documental independiente sobre #162 en curso. Después, ratificación humana individual.

## Decisiones humanas

1. Merge de #160 y #161, por separado.
2. Aprobar/revisar la propuesta M1/M2 y la vía R5 de #162.
3. Ratificar individualmente las 13 actas.

Sin autorizaciones nuevas de merge, DEV, migración, activación ni datos reales.
