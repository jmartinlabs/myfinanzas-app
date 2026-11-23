# 14 — Gasto compartido: enmienda 14-E2 (circuito de preview, confirmación y dirty de la regularización)

Status: **PROPUESTA — pendiente de revisión independiente, de la revisión de Álex y de la
aprobación formal del usuario.** **NO AUTORIZA DEV, SQL, migraciones, cambio de datos ni
despliegue, ni F6.**
Fecha: 2026-11-23. Issue: #576.
Origen: veredictos finales de Álex sobre #539 y #549 (2026-11-23), que eligen una **enmienda focal
documental a SPEC14-E1, antes del DEV de F6**, y la instrucción del usuario de prepararla.
Afecta a [14-E1](14-compartidos-enmienda-01.md) **solo** en lo que declara en §1; el resto
de 14-E1, D5 y la base se conservan.

## Motivo

14-E1 define la regularización por porciones, pero su circuito de aviso quedó incompleto: §8 nombra
el preview genérico de Movimientos y §5 la huella `contexto`, sin exigir la confirmación explícita,
el `dirty` material del motor de #547 ni el trío `fingerprint/contextRevision/impactRevision`.
**#549 no duplica ese aviso**: sigue bajo SPEC14 y reutiliza el motor de #547. Sin este circuito, la
regularización **no se expone** (gate de #572).

## 1 · Qué cambia de 14-E1 (declarado)

- **§8 «UI/API», preview:** el preview de la regularización pasa a ser el del §3 de esta enmienda.
- **§5 «huella `contexto`»:** se **compone** con el trío de #547 (§4), no se sustituye.
- **E1-AC-18** se conserva; E2-AC-07 lo completa. Nada más cambia: porciones, límite, discrepancia,
  coste C, R1–R7 y los 29 E1-AC.

## 2 · Reglas de producto fijadas por Álex y el usuario

1. #549 **no** incorpora un flujo de regularización por porciones; el aviso vive en SPEC14.
2. El antes/después financiero y bancario, la confirmación y el `dirty` los da el **motor único de
   #547**; ningún cálculo de tercero ni de huella en el navegador.
3. La regularización **no se expone** si este circuito no está verificado: respeta el gate de #572.

## 3 · Preview de la regularización (contrato)

El servidor devuelve, calculado por él, un bloque `regularizacion` con: Movimiento (Saldo origen,
importe, fecha); **porciones** (tercero, importe, límite antes/después); **efecto bancario** (Saldo
origen antes/después; `S000` no computa como saldo); por tercero, `aportado`, `pendiente` y `exceso`
antes/después; por caso, `recuperado`, `neto` (N = C − R) y **estado** antes/después; `discrepancia`
(debe ser 0 para confirmar, 14-E1 §5.1); y las incidencias. Junto a él, el bloque de impacto de #547
(`ciclosAfectados`, `cierresDirty`) cuando hay impacto material. **La interfaz solo representa estos
valores.** Los nombres y la ubicación exactos del DTO los fija el DEV conforme a `specs/38`.

## 4 · Confirmación, huella y dirty

- **Una sola confirmación explícita**, sin atajo. Cancelar **no escribe** Movimiento, porciones,
  intento, auditoría ni `dirty`.
- `fingerprint`, `contextRevision` e `impactRevision` viajan **juntos desde el mismo preview**
  (`specs/38`), sin segunda llamada ni huella calculada en el cliente.
- Al confirmar, en **la misma transacción IMMEDIATE**: se revalidan el trío, la huella `contexto` de
  14-E1 §5 (vínculos de devolución del caso), el límite por tercero, `Σ porciones = importe` y el
  gate. Cualquier cambio → `409 IMPACT_CHANGED` **sin escritura**.
- **`dirty` solo por materialidad** (motor de #547): un ciclo ya dirty no se limpia por reversión;
  la revisión humana lo limpia; ninguna operación de este flujo emite `HISTORY_LOCKED` por cierre.
- Idempotencia: misma clave y mismo payload, un solo efecto; distinto payload,
  `409 IDEMPOTENCY_CONFLICT`.

## 5 · Gate

Mientras el gate de #572 esté cerrado: el preview y la confirmación devuelven `503
DEVOLUTION_INTEGRATION_UNAVAILABLE` sin efectos, la ficha **no ofrece** «Devolver al tercero» y B-6
no incluye el ofrecimiento. Lo abre solo el PR de F9.

## 6 · DTO de servidor para B-6 y la acción (decisión de Álex)

El **servidor** publica, en el nivel raíz de `GET /api/movimientos/{id}` (**no** dentro de
`devolucionesResumen`, que debe seguir siendo exactamente el `resumen` de R1), un bloque
`regularizacion` con: `casoCompartidoVigente` (ficha y Referencia vigentes), `terceroConExceso`
(existe un tercero con límite > 0) y `accionDisponible` (ambos verdaderos, acción implementada y gate
abierto). B-6 se muestra solo si `casoCompartidoVigente`; el ofrecimiento «Devolver al tercero» solo
si `accionDisponible`. **Ausencia de bloque o de datos = solo B-5**, sin promesa. Ningún cálculo en el
navegador.

## 7 · Criterios de aceptación (todos UNRUN)

| ID | Escenario | Resultado esperado |
| --- | --- | --- |
| E2-AC-01 | Preview de una regularización con dos porciones | Muestra tercero/porciones, importe, efecto bancario y Exceso/Recuperado/Neto/estado antes y después, calculados por el servidor |
| E2-AC-02 | El cliente recibe valores del servidor distintos de una suma local | La interfaz muestra los del servidor; no recalcula |
| E2-AC-03 | Confirmar | Envía el trío del mismo preview; no hay segunda llamada ni huella calculada en el cliente |
| E2-AC-04 | Trío obsoleto (otro cambio entre preview y confirmación) | `409 IMPACT_CHANGED`; sin Movimiento, porciones, intento, auditoría ni `dirty` |
| E2-AC-05 | Cancelar; intentar un atajo sin confirmación | Nada se escribe; no existe atajo |
| E2-AC-06 | Impacto material y no material | `dirty` solo si es material; un ciclo ya dirty no se limpia por reversión; sin `HISTORY_LOCKED` |
| E2-AC-07 | Concurrencia: límite o devolución vinculada cambia tras el preview | Se revalidan trío, `contexto`, límite y `Σ porciones = importe` en la misma transacción; conflicto sin escritura (completa E1-AC-18) |
| E2-AC-08 | Gate cerrado | Preview y confirmación 503 sin efectos; la ficha no ofrece la acción; B-6 sin ofrecimiento |
| E2-AC-09 | Servidor: caso compartido vigente con/sin tercero con exceso; sin ficha; Referencia anulada; gate cerrado | `regularizacion.{casoCompartidoVigente, terceroConExceso, accionDisponible}` correcto en cada caso |
| E2-AC-10 | **E2E antes de exponer U35 (en el DEV de F6)** | B-6 y acción solo cuando corresponde; sin datos, solo B-5 |
| E2-AC-11 | Repetir la confirmación | Misma clave y payload, un efecto; distinto payload, `IDEMPOTENCY_CONFLICT` |
| E2-AC-12 | Regularización y GRE | La materialidad la decide el motor de #547; la regularización no cambia el GRE (14-E1 I-E1-4) |

## 8 · Límites y pendientes

No cambia contratos aprobados fuera de §1. No añade esquema ni migración. Los nombres del DTO son
provisionales. **Pendiente del usuario:** aprobación formal de esta enmienda; después, la autorización
de DEV de F6. Hasta entonces la regularización no se expone. **No autoriza DEV, SQL, migraciones,
datos reales ni despliegue.**
