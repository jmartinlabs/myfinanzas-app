# 33 — Dprima simplificada: enmienda 33-E1 (compromisos de aportación y cálculo prospectivo)

Status: **APROBADA — 2026-11-22**, autorización expresa del usuario de la opción (i) y de la
enmienda documental acotada. **NO AUTORIZA DEV, migraciones, cambio de datos ni despliegue.**
Fecha: 2026-11-22. Afecta a la [especificación 33](33-dprima-simplificada-specification.md),
aprobada el 2026-11-17; su texto vigente **no se modifica**.
Autorización: el usuario aprueba la opción (i) con cuatro condiciones explícitas (fórmula y
fotografía inmutables, cálculo prospectivo con corte acreditado, compromisos separados de la
ejecución real, y sobrecompromiso señalado sin anulación automática).
Origen: [§7 de #538](https://github.com/jmartinlabs/myfinanzas-app/issues/538) y las
revisiones de Álex de 2026-11-22 (`7077424924`, `7077719485`).

## Motivo

Una devolución de compra deja liquidez real en un saldo. La planificación de un ciclo futuro
puede necesitar ese dinero, pero asignarlo sin registro produce dos errores posibles: contarlo
dos veces —una por la planificación y otra por la asignación— o simular una aportación que no
se ha ejecutado. Ni SPEC33 ni SPEC38 cubrían ese caso.

Esta enmienda añade **un dato de planificación** —el compromiso de aportación— sin tocar la
fórmula de `P`, sin recalcular la apertura y sin crear ningún Movimiento.

## 1 · Lo que no cambia

- `P = max(0, T − G − S)` conserva su definición exacta, con `G` gasto neto acumulado elegible
  y `S` saldo real exclusivo.
- **La fotografía de apertura es histórica e inmutable**: `T`, `G₀`, `S₀` y
  `P₀ = max(0, T − G₀ − S₀)` quedan fijados al corte común de apertura confirmado y **no se
  reescriben** por hechos posteriores. Una transferencia posterior **no** cambia `P₀`.
- Las **transferencias reales** siguen siendo la ejecución de la fuente «Aportación a saldo»;
  son Movimientos y no se sustituyen por ningún registro de planificación.

## 2 · Cálculo prospectivo `P(t)`

Lectura **separada** de la histórica, nunca sustituta:

- `G(t)` y `S(t)` se toman de los hechos reales hasta el corte `t`.
- `P(t) = max(0, T − G(t) − S(t))` es un **cálculo nuevo**, no una corrección de `P₀`.
- Toda lectura declara **corte acreditado**: instante, de dónde salen `G(t)` y `S(t)`, y las
  revisiones vigentes en ese instante.

Se publican por separado y con etiqueta propia: `P₀` como histórico de apertura y `P(t)` como
prospectivo. **Ningún derivado se calcula sobre `P₀`.**

## 3 · Compromiso de aportación

Entidad de planificación, explícita y auditable:

| Campo | Contenido |
| --- | --- |
| `id` | Identidad propia |
| `ciclo` | Ciclo destino |
| `importe` | Puede ser parcial respecto del origen |
| `origen` | Devolución o decisión que lo motiva, con su identidad |
| `motivo` | Obligatorio |
| `actor`, `instante`, `revision` | Trazabilidad |
| `estado` | `Vigente` \| `Ejecutada` \| `Anulada` |
| `movimiento_id` | Nulo hasta que se ejecute la transferencia real |
| `decision_origen_id` | Para compromisos parciales encadenados |

**Efectos:** no altera `P₀` ni `P(t)`, no altera `S`, **no crea Movimiento**. Su único efecto
es reducir el pendiente de decidir.

`pendienteDeDecidir(t) = max(0, P(t) − Σ compromisos Vigentes a t)`.

Cuenta **solo los vigentes**: los `Ejecutada` ya están absorbidos por `S(t)` y los `Anulada`
no existen. Así el derivado no salta al cumplirse un compromiso.

## 4 · Ejecución y vínculo inequívoco

Al registrarse la transferencia real: `S(t)` aumenta, `P(t)` se recalcula por su fórmula y el
compromiso pasa a `Ejecutada` **en la misma transacción**, con vínculo 1:1 en ambos sentidos
—el Movimiento referencia el compromiso y el compromiso referencia el `movimiento_id`—.

No hay doble financiación por construcción: mientras está `Vigente` el compromiso cubre
`P(t)` sin alterarla; al ejecutarse, `P(t)` baja por `S(t)` y el compromiso deja de descontar.

**Rectificación:** anular solo desde `Vigente`, con motivo y auditoría. Desde `Ejecutada` no se
anula el compromiso: se rectifica el Movimiento, que es el hecho real.

## 5 · Sobrecompromiso: señalar y exigir revisión

Si hechos posteriores reducen `P(t)` hasta dejarlo por debajo de la suma de compromisos
vigentes, el sistema **señala sobrecompromiso** y **exige revisión humana**.

- **No** anula compromisos automáticamente ni elige cuál sobra.
- **No** altera la fotografía histórica ni `P₀`.
- **No** crea Movimientos ni ajustes de saldo.
- El ciclo queda marcado con el déficit visible y la diferencia cuantificada, y el pendiente de
  decidir se publica como `sobrecomprometido` —nunca como cero silencioso—.

La resolución es una decisión del usuario: anular o reducir compromisos, o ejecutar la
transferencia que restablezca la cobertura.

## 6 · Invariantes verificables

- `Σ compromisos Vigentes a t ≤ P(t)` **o** sobrecompromiso señalado; nunca las dos cosas ni
  ninguna.
- `P₀` idéntico antes y después de cualquier compromiso, ejecución o anulación.
- `S(t)` cambia **solo** por Movimientos reales.
- Cero Movimientos creados por compromisos o anulaciones.
- `asignado + pendiente = importe` para cada origen.
- Cada compromiso `Ejecutada` tiene exactamente un `movimiento_id`, y ningún Movimiento ejecuta
  dos compromisos.

## 7 · Fuera de alcance

No fija la interfaz, ni los códigos de error, ni la forma de las lecturas: eso pertenece al §7
de [SPEC38 v7](38-e49b-cierre-validacion-specification.md) —que las consume— y a la SPEC de
devoluciones [#538](https://github.com/jmartinlabs/myfinanzas-app/issues/538). No modifica
SPEC14, cuya acreditación a terceros en Gastos compartidos sigue siendo dependencia obligatoria
antes de DEV. No autoriza implementación.