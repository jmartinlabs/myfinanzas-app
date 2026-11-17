# Casa · semántica de Saldo e importes en Movimientos — análisis (2026-11-16)

**Estado: análisis de #421. Este documento no cambia código, CSS ni contratos.** Resuelve los dos
pendientes semánticos registrados en
[`ui-casa-pendientes-semantica.md`](ui-casa-pendientes-semantica.md) contra la semántica que la
API publica hoy y contra las reglas vigentes de UI.

- **Base medida:** `test` `0e1f34d` (2026-11-16).
- **No autoriza:** cambios de API, SQLite, motores financieros, contratos ni merge. La ejecución
  de las correcciones es otra fase.
- **Etiquetas:** `DEMOSTRADO` = leído en el código de la base indicada; `DOCUMENTADO` = spec o
  directriz registrada.

## 1. Lo que publica la API

`DEMOSTRADO` El DTO de un Movimiento (`apps/api/src/movimientos.ts`, `decorate`) publica:
`tipo`, `subtipo`, `origen` y `destino` (Saldo resuelto, con `S000` en el lado técnico),
`importe` como decimal exacto **sin signo**, `fecha`, `anulado`/`estado`, `partida`,
`referencia`, `ciclo` **derivado** por fecha, y los metadatos de Anticipo, Compartido y Comida.

`DEMOSTRADO` **No existe** ningún campo de signo ni de dirección. La dirección se deduce de
`tipo` y, cuando importa el lado, de `origen`/`destino`. Eso concuerda con la directriz vigente:

> «Importe siempre positivo; Tipo comunica dirección.» — [`guidelines/ui.md` §E1.4](../guidelines/ui.md)

`DOCUMENTADO` Y con SPEC04, que además prohíbe una columna de saldo acumulado: «Saldo actual |
Resultado de lectura, no columna acumulada duplicada» ([SPEC04](../04-movimientos-specification.md)).

## 2. Pendiente 1 — la etiqueta «Saldo»

`DEMOSTRADO` La columna se declara así en `apps/web/src/Movimientos.tsx`:

- `id: "saldo"`, `header: "Saldo"`.
- La celda pinta el **Saldo** y, en Transferencia, `origen → destino`; debajo, en pequeño, la
  etiqueta del **ciclo** y, si procede, «· No computa».
- **Nunca** pinta un importe. No hay posición monetaria en esa columna.

`DEMOSTRADO` Tabla y tarjetas comparten **la misma** definición de columnas: el listado móvil se
renderiza con el mismo `columns` (`className="mobile-list movements-cards"`). No hay dos
versiones que puedan divergir.

**Veredicto `[PROPUESTA]`: la etiqueta no es incorrecta; el riesgo está en la sublínea.** «Saldo»
es el término de dominio del proyecto para la cuenta, y SPEC04 lo usa igual (`Saldo
origen/destino`). Lo que puede inducir a leer una posición es ver el ciclo bajo la cuenta, no la
palabra «Saldo». Dos salidas, ambas sin tocar la API:

1. **Recomendada:** mantener «Saldo», documentar en la guía de UI que la columna identifica el
   Saldo afectado y su ciclo, y nunca una posición. Coste: cero código.
2. **Alternativa:** renombrar a «Saldo / ciclo» (o «Cuenta / ciclo»). Es una sola palabra, pero la
   definición de columnas es **compartida por las cinco apariencias**: el cambio se vería en
   Graphite, Claro, Oscuro y Mixto. El criterio de #421 pide que «el resto de temas no cambie», así
   que esta opción **necesita autorización explícita** y no cabe como cambio de Casa.

## 3. Pendiente 2 — importes sin signo

`DEMOSTRADO` El pendiente está **ya resuelto en la interfaz**, no en el contrato:

```ts
/** Dirección visual del hecho; el importe publicado no se altera. */
const movementFlow = (m: Movement) =>
  m.tipo === "Ingreso" || m.tipo === "Devolución de gasto"
    ? "inflow"
    : m.tipo === "Gasto" || m.tipo === "Amortización deuda"
      ? "outflow"
      : "neutral";
```

Ese valor se publica como `data-flow` en el importe de la tabla, en el importe de las tarjetas y
en el contenedor de la ficha. La Transferencia queda `neutral` porque no cambia el patrimonio: es
la clasificación correcta, no un hueco.

**Veredicto `[PROPUESTA]`: no hay que añadir `+`/`−` ni pedir un contrato nuevo.** Añadir signos
contradiría la directriz («importe siempre positivo; Tipo comunica dirección») y duplicaría la
información del Tipo. Lo que falta no es semántica: es **estilo**.

`DEMOSTRADO` Hoy el atributo `data-flow` **solo lo pinta Graphite** (7 reglas en `graphite.css`).
El icono de tipo tiene dos tratamientos más: `light-hybrid.css` lo dibuja para Claro y Mixto
(`::before` por `data-tipo`), y Graphite también. **Casa no tiene ninguno de los dos**: su CSS no
define `movement-type-icon` ni `data-flow`, así que el icono se renderiza sin forma y el importe
sin dirección visual. Oscuro comparte esa ausencia con Casa.

**Recomendación:** que Casa adopte el tratamiento ya existente —color de importe por `data-flow` y
el icono de tipo visible—, con CSS **acotado a Casa** y sin tocar el TSX ni otros temas. Es
exactamente lo que el pendiente pedía comprobar antes de actuar: el motor sí publica la dirección;
solo hay que pintarla.

## 4. Paridad y alcance

- `DEMOSTRADO` Tabla y tarjetas usan las mismas celdas → cualquier cambio de estilo debe aplicarse
  a las dos, y el propio componente compartido garantiza la paridad de contenido.
- `PROPUESTA` Nada de lo anterior requiere contrato nuevo: la dirección se deriva de `tipo`, que
  ya se publica. Si en el futuro se quisiera un **importe con signo** en la API, sería una decisión
  de contrato y este análisis se detendría: hoy no hace falta y contradice la directriz.
- `PROPUESTA` No se toca Graphite ni las otras tres apariencias: el trabajo es CSS de Casa.

## 5. Qué se propone ejecutar después

| Acción | Alcance | Requiere contrato |
| --- | --- | --- |
| Color de importe por `data-flow` en Casa | CSS `casa.css` | No |
| Icono de tipo visible en Casa | CSS `casa.css` | No |
| Nota en la guía de UI sobre qué identifica la columna «Saldo» | `specs/guidelines/ui.md` | No |
| Renombrar la columna | Definición compartida: cinco apariencias | No técnico, pero exige autorización |
| Importe con signo en la API | Motor y DTO | **Sí** → decisión separada, no ahora |

`PROPUESTA` Verificación proporcional: prueba de tema de Casa ampliada para comprobar que un
Ingreso y un Gasto reciben `data-flow` distinto y color distinto, y que una Transferencia queda
`neutral`; captura 1440/390 de la tabla y de las tarjetas; sin cambios de datos.

## 6. Próximo gate

Decisión del usuario sobre las tres primeras acciones de §5 (todas sin contrato) y, si lo quiere,
sobre el renombrado, que afecta a las cinco apariencias. Sin cambios financieros ni de API en
ningún caso.