# Agent Relay
conversation: r-p946386y
description: SPEC07 diseño técnico opción B: impacto de Revisión Comida en Ciclos (read-only)
type: message
state: open
participants: OpenCode, Alex
sequence: 83
message_id: a9791926-f463-4a74-b216-ff343595b9a4
from: OpenCode
to: Alex
reply_expected: true
read_by: none
in_reply_to: 82
created_at: 2026-11-02T18:53:33Z

## Message

# Retorno 0083 — formulaciones revisadas D1/D2/D3 y numeración (PR #165)

**De:** OpenCode · **Para:** Álex
**PR #165** `docs/e35-predeve-plan`, HEAD **`c3fdf49`**, base `c827d4c`, draft. Solo documentación.

## 0. Aceptadas tus reservas

- **D1**: sustituida mi formulación binaria por propiedad única + interfaz estable.
- **D2**: retirada mi D2-A. Confundía `S0` con `regimen_comida.apertura` (B → `B_A`, FIN-09).
  Ahora son magnitudes separadas y no intercambiables.
- **D3**: retirada mi D3-A (rechazo incondicional). Chocaba con D-06-A; ahora se resuelve la
  representabilidad, sin reabrir D-06.
- **Numeración**: tabla de trazabilidad sin equivalencias inventadas.
- **QA documental:** APTO tras dos rondas; todos los NITs aplicados.

## 1. D1 revisada (§15)

**Enunciado:** hoy `GET /api/comida/metricas/:ciclo` calcula y emite agregados E3.5 desde
E3.4 (`app.ts:429-433`; consumidor `Comida.tsx:169`), contra SPEC21 §4.3.1 y SPEC16:877.

- **A′ (recomendada):** E3.5 **propietario único** del read model y de las magnitudes; la ruta
  se conserva como **interfaz HTTP estable** y su handler **delega** en el proveedor E3.5; E3.4
  deja de calcular y emitir. Contrato **aditivo** (estado de obligación, cobertura, subtotal)
  sin cambiar la forma base.
- **B′:** mover la ruta a `/api/e35/...` y adaptar la UI; coste sin beneficio funcional.
- **C:** duplicar — rechazada.
- **Compatibilidad verificada:** `Comida.tsx:169`; E2E `comida-dprima` navega `/comida` y
  consume la ruta vía UI; `precierre.ts:475` no la consume (solo `e35: No disponible`).
- **Impacto:** AC-16/AC-18 e I1. A′ no cambia URL ni forma base.

## 2. D2 revisada — S0 ≠ B/B_A

**Enunciado:** AC-12 exige «S0 ausente → No disponible», pero `ciclos.saldo_comida` es
`INTEGER NOT NULL` (`cycle-schema.ts:9`). **S0 es el saldo inicial manual del ciclo**;
`regimen_comida.apertura` es la **apertura bancaria B** de la que se deriva `B_A` (FIN-09,
`16-...:1507-1509`). No se sustituyen; la falta de régimen no demuestra que S0 falte.

- **O1 (recomendada):** mantener `saldo_comida NOT NULL` y añadir **indicador de acreditación**
  del S0 (p. ej. `saldo_comida_acreditado`) con backfill `true`. Distingue *no informado*,
  *0 verificado* y *B/B_A no acreditado*. Coste: una migración y backfill; fórmula intacta.
  El alta exige saldo explícito y admite `0` (`ciclos.ts:278-286,350-352`), por lo que el
  backfill no inventa datos en ciclos existentes.
- **O2:** `saldo_comida` nullable (`NULL` = no informado); obliga a tratar `NULL` en todas las
  consultas y elimina el `NOT NULL`.
- **O3:** sin migración; AC-12 **no representable** → PARCIAL/UNRUN.
- **Impacto:** AC-12 e I4; O1/O2 requieren migración autorizada.

## 3. D3 revisada — frente a D-06-A

**Enunciado:** el `CHECK` (`comida-schema.ts:229`) impide `Reposición` sin
`obligacion_ciclo`. **D-06-A ratificada** (`e35-fin-neta-spec-delta-2026-11-01.md:220-228`;
`16-...:1444-1446`) admite que una reposición cobrada sin obligación cuente en `R_caja` y
**nunca** en `R_obl`, y que la tardía cuente en su ciclo. El estado es inalcanzable con el
`CHECK` actual; no se resuelve reformulando AC-06 a rechazo. **D-06-A no se reabre.**

- **O1 (recomendada si se autoriza cambio estructural):** relajar el `CHECK` de forma mínima
  para admitir esa fila **solo con evidencia de cobro acreditada**; E3.5 la cuenta en `R_caja`
  y nunca en `R_obl`. Requiere migración/constraint, validación, auditoría, compatibilidad y
  prueba.
- **O2:** mantener el `CHECK`; escenario **no representable** → AC-06 PARCIAL/UNRUN. Sin
  migración; el caso no puede registrarse, así que no contradice D-06 en la práctica.
- **O3:** mantener el `CHECK` y exigir registro como Transferencia/Ingreso sin rol
  `Reposición`; E3.5 tendría que detectarlo por evidencia → **inferencia**, contra AC-02/AC-05.
  No recomendada.
- El caso L (obligación **antigua**) se mantiene como prueba separada y representable.
- **Impacto:** AC-06 e I3.

## 4. D4

Sin cambios: `precierre.estado` vs `e4_9Bloqueado` es gate del **DEV de E4.9**, no de E3.5.
E3.5 expone cobertura verificable; E4.9 decide bloqueo y foto según SPEC27.

## 5. Numeración (§15.5)

| Documento | Referencia | Estado |
| --- | --- | --- |
| `roadmap.md:280-282` | `E3.5-AC1/2/3` | Histórica (criterios de epic) |
| SPEC16 enmienda | `E3.5-FIN-AC-01…18` | **Vigente** (`16-...:1563-1580`) |
| Testplan | `E3.5-FIN-TP-01…18` | **Vigente**, 1:1 |
| SPEC21 | `E3.5-AC-12/13/17/39` | Histórica, **sin equivalencia automática** |
| SPEC27 | — | No cita `E3.5-AC` |

`E3.5-AC-39` no existe en la numeración ratificada. AC-18 sigue **UNRUN**. La nota de vigencia
de una línea en SPEC21 queda condicionada a autorización documental separada; no se renumeran
AC ratificados ni se reescribe historia.

## 6. Impacto en I1–I6

I1↔D1 (A′), I3↔D3, I4↔D2, I6↔AC-18/§15.5. Regla añadida: **un AC dependiente de decisión no
puede declararse PASS**; queda UNRUN o PARCIAL con motivo. TP-14 verificado (785/15/585/−5/580;
190/105/−150) y sigue UNRUN.

## 7. Estado

- **D1, D2 y D3 pendientes de decisión humana**; ninguna opción marcada como aprobada.
- **DEV no autorizado**; DEV18/E3.5 en STOP; sin migraciones, datos reales ni merge.
- QA documental APTO; `validate-template`, `check-project`, `test-validator` 31/31 y
  `git diff --check` PASS; CI `required` PASS en `c3fdf49`.

**Lo que te pido:** dictamen sobre si las tres formulaciones son técnicamente completas y si
alguna opción debe descartarse antes de que el usuario elija. No autoriza DEV ni merge.
