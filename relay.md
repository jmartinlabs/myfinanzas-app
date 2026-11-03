# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 93
message_id: 53146304-0954-4f38-bac4-c0fabd5ce86b
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 92
created_at: 2026-11-03T08:03:52Z

## Message

# Retorno 0093 — QA final de los tres frentes

**De:** OpenCode · **Para:** Álex
**Base:** `main` `52e3fca`. Sin datos reales, sin despliegue y sin merge.

## A. E3.5 / PR #171 — APTO CON RESERVAS, en draft

`feat/e35-fin-neta` @ **`356bebd`**; CI `required` **PASS** (`41599876278`).

Completado desde 0091:
- **AC-13:** subtotal parcial implementado y probado (`recursos.valor=null`, `estado=Parcial`,
  `subtotal=100,00`, motivo). TP-13 completo sigue parcial: faltan periodo vacío y fallo de fuente.
- **AC-14:** ejemplo **785/15/585/−5/580** y subcaso **190/105/−150** probados. Parcial: faltan
  composición 800/−100 y devolución antigua.
- **AC-03/10/01/02/04/05/06/07/16:** tests propios con asserts.
- **AC-08/09/11/17:** tests propios con asserts parciales (D/banco, Partida NULL, «solo
  agregado», duración Real pendientes).
- **AC-12:** PARCIAL; S0 ausente es inalcanzable con D2-O0 y se documenta sin fabricar ciclos.
- **AC-15:** PARCIAL; proveedor con cobertura/huella/bloqueo; consumo E4.9 es D4.
- **AC-18:** PASS documental (nombres/magnitudes FIN-13; sin integración E4.9).
- **Matriz** `specs/16-revision-comida-progress.md` y PR body ya coinciden; no hay PASS donde la
  evidencia es parcial.
- QA final: **APTO CON RESERVAS**, sin bloqueos de código, migración o seguridad; reservas de
  evidencia declaradas fila a fila.

No propongo merge: E3.5 sigue candidato con reservas funcionales subsanables.

## B. SPEC23 / PR #167 — listo para ratificación humana

`docs/spec23-brainstorm` @ **`c481bc3`**; CI PASS; **17 AC / 17 TP** sincronizados.
A-01/A-02/A-03 cerradas; TP-16 con etiquetas E4.3/E4.9 y TP-17 de consistencia de cantidad.
DT2 sigue identificado para el almacén. Sin spec aprobada ni DEV/DDL.

## C. SPEC17 / PR #170 — APTO

`docs/spec17-wireframes-390` @ **`9c163d2`**; CI PASS; QA focal **APTO**.
Contadores unificados con semántica, `Varias` como indicador de lista, acciones condicionales
Activa/Inactiva, Parcial vs No calculable separados. Wireframes candidatos; DEV17 no autorizado.

## Lo que te pido

1. **E3.5:** ¿exiges cerrar las filas parciales (AC-08/09/11/13/14/17) antes de proponer
   integración, o aceptas el candidato con reservas declaradas? Mi recomendación: cerrar al
   menos AC-13 (vacío/fallo) y AC-17 (Real), que son rápidas.
2. **#167/#170:** ¿alguna objeción para presentarlos al usuario y solicitar ratificación/merge
   documental por separado?

No autoriza merge funcional, DEV E4.3/DEV17, datos reales ni despliegue.
