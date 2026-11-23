# 14 — Gasto compartido: enmienda 14-E2 (circuito de preview, confirmación y dirty de la regularización)

Status: **PROPUESTA — con revisión independiente aplicada; pendiente de la revisión de Álex y de la
aprobación formal del usuario.** **NO AUTORIZA DEV, SQL, migraciones, cambio de datos ni
despliegue, ni F6.**
Fecha: 2026-11-23. Issue: #576.
Origen: veredictos finales de Álex sobre #539 (7106870347) y #549 (7106871512), que eligen una
**enmienda focal documental a SPEC14-E1, antes del DEV de F6**, y la instrucción del usuario de
prepararla. Afecta a [14-E1](14-compartidos-enmienda-01.md) **solo** en lo que declara §1.

## Motivo

14-E1 define la regularización por porciones, pero su circuito de aviso quedó incompleto: §8 nombra
el preview genérico de Movimientos y §5 la huella `contexto`, sin exigir confirmación explícita,
`dirty` material del motor de #547 ni el trío `fingerprint/contextRevision/impactRevision`.
**#549 no duplica ese aviso** (decisión de Álex en #549): sigue bajo SPEC14. Sin este circuito la
regularización **no se expone** (gate de #572).

## 1 · Qué cambia de 14-E1 (declarado)

1. **§8, preview de la regularización:** pasa a ser el del §3 de esta enmienda.
2. **§5, huella `contexto`:** pasa a alimentar `contextRevision` del trío de #547, no `fingerprint` (§4).
3. **§8, lectura:** el servidor añade al detalle de un Gasto el bloque `regularizacionOferta` (§6).
4. **E1-AC-18, E1-AC-22, E1-AC-27:** se conservan; los AC de §7 solo añaden lo que no cubren.

Nada más cambia: porciones, límite, discrepancia, coste C, R1–R7, el gate de #572 y los 29 E1-AC.
No hay esquema ni migración.

## 2 · Reglas fijadas (con su fuente)

1. #549 **no** incorpora un flujo de regularización por porciones; el aviso vive en SPEC14, que
   reutiliza #547 para el antes/después, la confirmación y el `dirty` (Álex, #549).
2. Ningún cálculo de tercero ni de huella en el navegador; el servidor distingue los casos de B-6 y
   de la acción (Álex, #539, condición 2).
3. La regularización no se expone si este circuito no está verificado: respeta el gate de #572
   (Álex, #549).

## 3 · Preview de la regularización (contrato)

El servidor devuelve, calculado por él, un bloque propio `regularizacion` con: Movimiento (Saldo origen,
importe, fecha); **porciones** (tercero, importe, límite antes/después, 14-E1 §5); **efecto bancario**
(Saldo origen antes/después; `S000` no computa como saldo); por tercero, `aportado`, `pendiente` y
`exceso` antes/después; por caso, `recuperado`, `neto` (`N = C − R`, 14-E1 §4.1/R7) y **estado**
antes/después; `discrepancia`; e incidencias. **La interfaz solo representa estos valores.**

**Impacto de #547.** La regularización es una **Transferencia real**, no una devolución comercial.
`devolucionImpacto` y `ciclosAfectados` son el shape propietario de la devolución comercial
(SPEC39 y `specs/38` §2): **esta enmienda no los reutiliza ni nombra, y la regularización nunca se
contabiliza como esa devolución**. El impacto se consume del motor único de #547 por su **contrato
genérico de operación** o por un **mapeo expresamente definido en F4**, sin colapsar operación,
signos, motivos ni las listas materiales y de `dirty`. El DTO exacto y la fuente de la lista de
ciclos afectados los fija F4 (provisional: un bloque `impacto`, separado de `regularizacion`);
`cierresDirty` **no** va en el preview, sino en el recibo de la confirmación, desde el estado real
(`specs/38` §2). Un único preview y una única confirmación, **sin segundo motor**.

**Discrepancia (14-E1 §3.5 y §5.1).** Se distinguen dos operaciones:
- **(a) Alta de un Movimiento regularizante nuevo:** `Σ porciones = importe` es obligatoria; si no
  cuadra, el preview lo señala, **no permite confirmar** y la escritura devuelve 422.
- **(b) Acreditación o rectificación de porciones sobre un Movimiento ya existente:** se permiten
  las que **reducen** la discrepancia, con `Σ porciones vigentes ≤ importe del Movimiento`. Mientras
  reste un importe se conservan la cobertura Parcial y la incidencia «Revisar · salida sin
  acreditar»; el estado vuelve a verificable **solo cuando la discrepancia llega a 0**. No altera el
  banco ni crea otro Movimiento.

## 4 · Confirmación, huella y dirty

- **Una sola confirmación explícita**, sin atajo. Cancelar **no escribe** Movimiento, porciones,
  intento, auditoría ni `dirty`.
- **Dependencia declarada (UNRUN):** hoy el preview de Movimientos es el legacy: devuelve
  `fingerprint` y un `contextRevision` global (`financeRevision`) y **no** tiene `impactRevision` ni
  `devolucionImpacto`; su confirmación no compara impacto. Extenderlo al trío de #547 es trabajo de
  **F4 de #538 y es prerrequisito de F6**; hasta entonces esta enmienda no es implementable.
- **Identidad de los tres tokens** (`specs/38` y #547 §2.4; no se mezclan sus funciones):
  `fingerprint` identifica el **payload** de la operación; `contextRevision`, el **estado estructural
  leído**; `impactRevision`, el **resultado medido**. El `contexto` de 14-E1 §5 (Referencia, ficha,
  participantes, movimientos de la Referencia, aportaciones, porciones y vínculos de devolución)
  **invalida `contextRevision`**, sin sustituir ni debilitar `fingerprint`; cualquier cambio material
  medido invalida `impactRevision`. Si la misma representación interna alimenta a más de un token, no
  se confunden sus responsabilidades públicas ni se acepta un preview obsoleto; el mecanismo técnico
  lo elige el DEV, con la prueba de E2-AC-07. Los tres viajan **juntos desde el mismo preview**, sin
  segunda llamada ni huella calculada en el cliente.
- **Precedencia de la confirmación** (`specs/38` §1): idempotencia (misma clave y payload reproducen
  el recibo sin revalidar) → gate → estructura → revisión → `IMPACT_CHANGED`. Si el trío o el
  `contexto` cambian: `409 IMPACT_CHANGED` **sin escritura**. En la misma transacción IMMEDIATE se
  revalidan el límite por tercero y la regla de suma de §3 ((a) exacta; (b) `≤ importe`).
- **`dirty` solo por materialidad** según el motor de #547 (`specs/38` §3); ninguna operación de este
  flujo emite `HISTORY_LOCKED` por cierre. El comportamiento exacto de limpieza lo fija #547 y **se
  verifica en F4**; esta enmienda no lo redefine.

## 5 · Gate

Se aplica a la **escritura**, como en `specs/38` §4 y #572: mientras el gate esté cerrado, la
confirmación devuelve `503 DEVOLUTION_INTEGRATION_UNAVAILABLE` sin efectos ni recibo. El preview es
una lectura y no se gatea; **la protección es que la ficha no ofrece** la acción
(`regularizacionOferta.accionDisponible = false`, §6). Lo abre solo el PR de F9.

## 6 · Oferta de la regularización en el detalle del Gasto

*Propuesta del coordinador; requisito de Álex (#539): el servidor distingue (a) caso compartido con
ficha y Referencia vigentes y (b) tercero con exceso regularizable con la acción disponible.* El
detalle de un Gasto (`GET /api/movimientos/{id}`) añade, **en el raíz y no dentro de
`devolucionesResumen`** (que debe seguir siendo exactamente el `resumen` de R1), el bloque
`regularizacionOferta` con `casoCompartidoVigente`, `terceroConExceso` y `accionDisponible`. No
duplica el bloque `compartido` existente: ese describe la ficha; este decide qué ofrece la pantalla.
- B-6 se muestra solo si `casoCompartidoVigente`; el ofrecimiento «Devolver al tercero», solo si
  `accionDisponible` (ambos casos verdaderos, acción implementada y gate abierto).
- **Coste:** `casoCompartidoVigente` es barato (ficha y Referencia). `terceroConExceso` y
  `accionDisponible` se calculan **solo** para un Gasto con Referencia «Gasto compartido» y ficha
  vigentes y **con el gate abierto**; con el gate cerrado o sin ficha, `accionDisponible = false` por
  cortocircuito, sin calcular el exceso.
- **Ausencia de bloque o de datos = solo B-5**, sin promesa. Ningún cálculo en el navegador.
- Los nombres de los campos son **provisionales** (este documento y el DEV de F6 los fijan juntos).

## 7 · Criterios de aceptación (todos UNRUN)

| ID | Escenario | Resultado esperado |
| --- | --- | --- |
| E2-AC-01 | Preview con dos porciones; el cliente recibe valores distintos de una suma local | Muestra tercero/porciones, importe, efecto bancario y Exceso/Recuperado/Neto/estado antes y después, **calculados por el servidor**; la interfaz no recalcula |
| E2-AC-02 | Alta de un Movimiento regularizante nuevo con `Σ porciones ≠ importe` | El preview lo señala y no permite confirmar; la escritura devuelve 422 |
| E2-AC-03 | Confirmar | Envía el trío del mismo preview; no hay segunda llamada ni huella calculada en el cliente |
| E2-AC-04 | Cambio de payload, de estructura o de resultado medido entre preview y confirmación | `409 IMPACT_CHANGED`; sin Movimiento, porciones, intento, auditoría ni `dirty`; cada token invalida lo suyo |
| E2-AC-05 | Cancelar; intentar un atajo sin confirmación | Nada se escribe; no existe atajo |
| E2-AC-06 | Impacto material y no material (incluido el efecto bancario, que no computa `S000`) | `dirty` solo si es material; sin `HISTORY_LOCKED`; `cierresDirty` solo en el recibo |
| E2-AC-07 | **Mutar un vínculo/devolución o una porción entre preview y confirmación** | Invalida `contextRevision` (y `impactRevision` si cambia el resultado medido); límite y regla de suma revalidados en la misma transacción; conflicto sin escritura (delta sobre E1-AC-18) |
| E2-AC-08 | Gate cerrado | Confirmación 503 sin efectos ni recibo (delta sobre E1-AC-22: la ficha no ofrece la acción y B-6 no incluye el ofrecimiento); una clave ya completada reproduce su recibo (precedencia de `specs/38` §1) |
| E2-AC-09 | Regularización a un tercero de baja (14-E1 R4) | El preview y la confirmación aplican el límite de la baja |
| E2-AC-10 | Servidor: (a) caso vigente con tercero con exceso; (b) sin exceso; (c) sin ficha; (d) Referencia anulada; (e) gate cerrado | `regularizacionOferta` correcto en cada caso, una fila de prueba por escenario |
| E2-AC-11 | Gasto sin ficha o con el gate cerrado | No se calcula `terceroConExceso` (cortocircuito) |
| E2-AC-12 | **E2E antes de exponer U35 (en el DEV de F6)** | B-6 y la acción solo cuando corresponde; sin datos, solo B-5 |
| E2-AC-13 | Movimiento histórico de 100 con una porción de 60; después una de 20 y otra de 20 | Discrepancia 40 → 20 → 0; Parcial e incidencia mientras reste importe; verificable solo al llegar a 0; banco y Movimiento intactos; una auditoría por porción |
| E2-AC-14 | Anular una porción de ese Movimiento | Vuelve la discrepancia de esa porción, con Parcial e incidencia; el banco no cambia; auditoría append-only |
| E2-AC-15 | Preview y recibo de una regularización | No usan `devolucionImpacto` ni `ciclosAfectados` de la devolución comercial; la regularización no se cuenta como devolución; el impacto viene del contrato genérico o del mapeo de F4 |

Idempotencia con la misma clave y un solo efecto: **E1-AC-27**. Regularización y GRE: **I-E1-4**.

## 8 · Límites y pendientes

No cambia contratos aprobados fuera de §1. Sin esquema ni migración. **Dependencias UNRUN:** el
preview con trío de #547 para Movimientos (F4 de #538) y el DEV de F6. **Pendiente del usuario:**
aprobación formal de esta enmienda; después, la autorización de DEV de F6. Hasta entonces la
regularización no se expone. **No autoriza DEV, SQL, migraciones, datos reales ni despliegue.**
