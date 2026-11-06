# UI · DEV-04 — Tablas y listados: paquete de propuesta

**Estado:** `[PROPUESTA]` — para autorización. **No implementa código, no inicia `DEV-04` y no
declara PASS.** Base verificada: `d7eaffb` (`main` con `UI · DEV-01`, `DEV-02` y `DEV-03`
integrados). Fecha: 2026-11-06.

- **Spec propietaria:** [ui-specification.md](../ui-specification.md), bloque `DEV-04` (§4) y
  criterios transversales (§1, §6).
- **Análisis y referencia visual:** [ui-evolution-2026-11-04](ui-evolution-2026-11-04.md)
  §4.2/§4.4/§7 y [wireframes](ui-evolution-wireframes.html) capítulo «Saldos · listado»
  (notas L1–L6).
- **Guías:** [ui.md](../guidelines/ui.md) y [quality.md](../guidelines/quality.md).
- **Gate:** aprobar este paquete **no** autoriza el desarrollo ni el merge; cada incremento
  requiere autorización y QA independiente.

---

## 1. Inventario real de tablas y listados

Estado comprobado en el código de esta rama: **43 `<table>` en 24 archivos**. La estilización
compartida depende de `.desktop-list` (`style.css:492-539`), no del elemento `table`; las
páginas que no usan ese contenedor quedan con estilos propios o con el estilo del navegador.

### 1.1 Deuda estructural comprobada

| Hecho | Evidencia |
| --- | --- |
| Mapa de columnas fijo de **5 columnas** (29/13/15/13/30 %) aplicado a todas las tablas dentro de `.desktop-list`, de 3 a 12 columnas | `style.css:505-519`; cada página lo sobrescribe con `nth-child` |
| Mapas por página | `movements-list` (`1370-1390`), `classification-list` (`1264-1272`), `cycles-list` (`1335-1346`), `inversiones-table` (`2547-2578`), `debt-list` (`2651-2674`), `vehicle-table` (`2340-2353`), `valoracion-table` (`3387-3418`), `pendientes-table` (`2981-2990`), `shared-list` (`2278-2295`) |
| Cabecera de tabla con alias `--section` (`--surface-2`), no con `--table-head` | `style.css:498-504`; `--table-head` está definido en los tres temas (`themes.css:76,146,216`) pero solo lo consume `.e47-table` (`style.css:4584`); el resto usa `--section` |
| Hover solo en `.desktop-list tbody tr` | `style.css:538-540`; el resto de tablas no lo tiene |
| Importes a la derecha de forma sistemática solo en Movimientos (`.money`), Pendientes (`.pendientes-table .money`) y Valoración (`.valoracion-table .num`) | `style.css:1388-1390,1447-1455,2993-2997,3447-3453`; Saldos, Inversiones, Ventas, Deudas, Nómina, etc. los dejan a la izquierda |
| `className="table"` **sin ninguna regla CSS** | usado en `Comida.tsx:382`, `Cierre.tsx:272,297,684`, `Dprima.tsx:206,264,373,735`, `Precierre.tsx:238`; `.table` no existe en `style.css` |
| Regiones desplazables sin rótulo ni foco | `.inversiones-desktop` (overflow-x, sin `role`/`tabIndex`, `style.css:2543`), `.shared-table-scroll` (`2211`), `.e44-history-desktop` (`2813`); `.payroll-table` (`1781-1793`) y `.table-wrap` (sin regla) tampoco son región. Solo `TableScroll` (`ui.tsx:94-111`) y `.valoracion-desktop` (`Valoracion.tsx:443-449`) son regiones rotuladas y enfocables |
| Cartas móviles duplicadas a mano | `mobile-list` en 14 archivos; `anticipo-cards` se muestra a ≤1050 mientras `.desktop-list` se oculta a ≤760 (`style.css:1903-1918,1064`), por lo que entre 761 y 1050 se ven **tabla y tarjetas a la vez** |
| Cabeceras y texto por debajo de 12 px en tablas de informe | `.e47-table` 9/10/11 px (`style.css:4557-4589`), `.e44-history-desktop th` 10 px (`2823-2832`) |

### 1.2 Tablas por pantalla

| Pantalla / archivo | Componente | Tablas y columnas | Comportamiento actual | Deuda visual |
| --- | --- | --- | --- | --- |
| **Saldos** `Saldos.tsx:205` | `SaldoList` | 1: Saldo/ID, Tipo, Control, Estado, Posición actual | `.desktop-list` + `.mobile-list`; `caption` sr-only; `Tag` de estado | Mapa fijo; posición a la izquierda (12 px); sin región rotulada (no hace falta a 390 porque hay tarjetas) |
| **Movimientos** `Movimientos.tsx:468` | `MovementList` | 1: Fecha, Tipo/Subtipo, Concepto, Saldo, Partida, Importe | Tabla + tarjetas; importe `.money` a la derecha; hover; fila anulada | Único importe bien alineado; mapa de 6 columnas; sin región de scroll rotulada (no la necesita con tarjetas) |
| **Inversiones · Instrumentos** `Inversiones.tsx:433` | `InstrumentList` | 1: ID, Nombre, ISIN, Divisa, Posiciones, Compras, Estado | Tabla + tarjetas; `inversiones-table` con `min-width:1080px` y `nowrap`; scroll propio | Región de scroll sin rótulo ni foco; importes/cantidades a la izquierda; 7 columnas |
| **Inversiones · Posiciones** `Inversiones.tsx:671` | `InstrumentDetail` | 1: Saldo, Cantidad, Compras, Ventas, Última compra/venta/operación | Tabla + tarjetas; misma clase | Idem; tabla de detalle con 7 columnas |
| **Inversiones · Compras** `Inversiones.tsx:756` | `InstrumentDetail` | 1: Fecha, Efectivo, Inversión, Cantidad, Precio, Divisa, Cambio, EUR, Comisión, Estado | Tabla + tarjetas | Idem; 10 columnas |
| **Inversiones · Ventas** `Inversiones.tsx:835` | `InstrumentDetail` | 1: Fecha, Efectivo, Inversión, Cantidad, Precio, Divisa, Cambio, EUR, Comisión, Estado | Tabla + tarjetas | Idem |
| **Inversiones · Compras (listado)** `Inversiones.tsx:1248` | `PurchaseList` | 1: Fecha, Instrumento, Efvo., Inv., Cantidad, Precio, Divisa, Cambio, EUR, Comisión, Estado, Acciones | Tabla + tarjetas; 12 columnas | Tabla muy ancha con `nowrap`; región sin rótulo; importes a la izquierda |
| **Ventas** `Ventas.tsx:279` | `SaleList` | 1: Fecha, Instrumento, Efvo., Inv., Cantidad, Precio, Divisa, Cambio, EUR, Comisión, Estado, Acciones | Tabla + tarjetas; el `<section>` sí tiene `aria-label` «Listado de Ventas» | Mismo patrón ancho; importes a la izquierda; no hay región de scroll rotulada |
| **Valoración · posiciones** `Valoracion.tsx:449` | `CorteList` | 1: Posición, Estado, Cantidad, Valoración, Resultado, Rentabilidad, Cobertura, Acción | `.valoracion-desktop` con `role="region"`, `aria-label`, `tabIndex=0`; `.num` a la derecha; tarjetas móviles | Es el patrón correcto de scroll; convive con el mapa fijo y CSS propio |
| **Valoración · serie** `Valoracion.tsx:1129` | `Serie` | 1: Fecha, Días, Tipo, Cantidad base, Valor, Revisión, Elegibilidad, Acción | Misma región rotulada; `.num` a la derecha | Idem |
| **Deudas · listado** `Deudas.tsx:376` | `List` | 1: ID, Nombre, Tipo, Inicio control, Apertura, Deuda viva, Conciliación | `.debt-list` + `.mobile-list.debt-cards`; mapa de 7 columnas | Importes a la izquierda; `--section` en cabecera; mapa por página |
| **Deudas · histórico** `Deudas.tsx:1043` | `Detail` | 1: Fecha, Tipo, Total, Capital, Intereses, Banco, Aplica, Movimiento | `.e44-history-desktop` con scroll, sin rótulo | Región sin foco; cabecera 10 px |
| **Vehículos · listado** `Vehiculos.tsx:234` | `VehicleList` | 1: Referencia, Matrícula, Próx. ITV, Cita, Subtotal reg., Cob. corte, Total corte, Cob. anual, Total anual, Integridad, Estado | `.vehicle-table` con anchos fijos y fuente 0.78 rem; tarjetas móviles | 11 columnas, importes a la izquierda, mapa por página |
| **Vehículos · gastos** `Vehiculos.tsx:292` | `VehicleDetail` | 1: Fecha, Concepto, Partida, Importe | Tabla simple | Sin alineación de importe; sin región |
| **Vehículos · candidatos** `Vehiculos.tsx:472` | `VehicleDetail` | 1: Partida, Subtotal, Cobertura corte, Total al corte, Cobertura anual, Total anual | Tabla de detalle | Importes a la izquierda; mapa |
| **Anticipos** `Anticipos.tsx:459` | `Anticipos` | 1: Fecha/ID, Rol, Importe, Origen→Destino, Estado/evidencia, Acciones | `.desktop-list.anticipo-table` + `.anticipo-cards` | Tabla y tarjetas simultáneas entre 761 y 1050; importe a la izquierda |
| **Ciclos** `Ciclos.tsx:272` | `CycleList` | 1: Mes financiado, Inicio, Fin, Estado temporal | Tabla + tarjetas; mapa de 4 columnas | Mapa por página; sin importes |
| **Clasificación** `Clasificacion.tsx:377` | `ClassificationList` | 1: Nombre, Grupo/Jerarquía, Estado | Tabla + tarjetas; mapa de 3 columnas | Mapa por página |
| **Presupuestos** `Presupuestos.tsx:218` | `List` | 1: Nombre/ID, Fuente, Saldo destino, Estado | Tabla + tarjetas | Mapa de 5 columnas para 4 reales |
| **Referencias** `Referencias.tsx:163` | `ReferenceList` | 1: Nombre/ID, Tipo, Estado | Tabla + tarjetas | Mapa de 5 columnas para 3 reales |
| **Plan del ciclo** `PlanesCiclo.tsx:344` | `PlanesCiclo` | 1: Presupuesto/Fuente, Base, Esencial, Del mes, A transferir, Ejecutado, Pendiente/Estado, Acciones | Tabla + tarjetas | Importes a la izquierda; acciones apretadas; mapa |
| **Plan anual** `PlanAnual.tsx:416` | `PlanAnual` | 1: Partida, Presupuesto, Periodo previsto, Esencial, Ejecutado, Diferencia, Fecha ejecutada, Acciones | Tabla + tarjetas | Importes a la izquierda; mapa; 8 columnas |
| **Compartidos · listado** `Compartidos.tsx:135` | `SharedList` | 1: Referencia, Caso, Estado, Bruto, Coste propio, Participantes | Tabla + resumen; `.shared-table-scroll` | Importes a la izquierda; región sin rótulo |
| **Compartidos · participantes** `Compartidos.tsx:489` | `SharedDetail` | 1: Nombre/rol/partes, Asignado, Aportado, Pendiente, Exceso, Acciones | `.shared-table-scroll` con transformación a bloques ≤760 | Transformación propia duplicada; importes a la izquierda |
| **Compartidos · histórico** `Compartidos.tsx:853` | `SharedDetail` | 1: Participante, Asignado antes/después, Pendiente después | `.shared-table-scroll` | Tabla de detalle; sin primitiva |
| **Comida** `Comida.tsx:382` | `Comida` | 1: ID, Fecha, Operación, Importe, Partida, Etiqueta, Devolución, Acciones | `TableScroll` + `table.table` (sin estilos) | Clase sin estilos: tipografía y densidad del navegador; importe a la izquierda |
| **Revisión Comida · operaciones** `RevisionComida.tsx:414` | `OperationTable` | 1: ID, Fecha op., Operación, Importe/dirección, Clasificación, Vínculo, Estado | Tabla + tarjetas | Importe a la izquierda; mapa |
| **Revisión Comida · repositorio** `RevisionComida.tsx:757` | `ReposList` | 1: ID, Fecha, Importe, Evidencia, Trazabilidad, Estado/Rev, Acciones | Tabla + tarjetas | Idem |
| **Pendientes · métricas** `Pendientes.tsx:756` | `Pendientes` | 1: Métrica, Importe, Estado, Cobertura, Motivo | `TableScroll` + `.pendiente-metrics` | Mapa de 5 columnas; importe a la izquierda |
| **Pendientes · listado** `Pendientes.tsx:1113` | `Pendientes` | 1: Tipo, Caso/fuente, Ciclo, Ejercicio, Magnitud, Importe, Estado/cobertura, Motivo/alertas, Acciones | `TableScroll` + `.pendientes-table` (1080 px) | Mapa de 9 columnas; el importe sí va a la derecha |
| **Nómina** `Nomina.tsx:224` | `Nomina` | 1: Paga/Mes/Tipo, Neto histórico, Neto documentado, Cobrado asignado, Conciliación, Acciones | `.payroll-table` + tarjetas a ≤760 | Tabla sin primitiva; importes a la izquierda; región sin rótulo |
| **Cierre** `Cierre.tsx:272,297,684` | `TotalsTable`, `CoverageTable` | 3: Total/Valor; Métrica/Cobertura/Motivo; Gate/Estado/Detalle | `TableScroll` + `.shared-table-scroll` + `table.table` sin estilos | Fuera de alcance DEV-04 (E4.9); deuda registrada |
| **Precierre** `Precierre.tsx:238` | `Precierre` | 1: Fuente, Cobertura, Estado, Motivo, Enlace | `TableScroll` + `table.table` sin estilos | UI provisional E4.8; no se toca sin su autorización |
| **D′ Partidas** `Dprima.tsx:206,264,373,735` | `Dprima`, `PartidaRows`, `PlanDetail` | 4: maestro, planificaciones, plan mensual, líneas previstas | `TableScroll` + `table.table` sin estilos | Tablas de planificación, no listados de catálogo; fuera de alcance |
| **Resumen anual** `ResumenAnual.tsx:810,983,1119` | `ResumenAnual` | 3: Partida/Presupuesto/…; Métrica/Valor/…; Ciclo/Margen/… | `.e47-table` con `--table-head`; ocultas ≤760 y sustituidas por tarjetas | 9–11 px; sin región de scroll; contrato E4.7 |
| **Flujo mensual** `FlujoMensual.tsx:323` | `AjusteCompartidosPanel` | 1: Caso, Estado, Neto, Coste propio, Pendiente, Exceso | Tabla con `data-label` y transformación móvil | No es listado de catálogo; fuera de alcance |

---

## 2. Alcance propuesto de la primitiva y pantallas que migran

### 2.1 Primitiva `Table` / `DataList` (en `ui.tsx`, sin tocar `themes.css`)

1. **`TableScroll`** se conserva como base (`ui.tsx:94-111`): `role="region"`, `aria-label`
   obligatorio, `tabIndex=0` y foco visible. Se reutiliza en todas las tablas anchas.
2. **`Table`**: envuelve el `<table>` con `className="ui-table"` y exige `caption` (visible o
   `sr-only`). Acepta `label` para la región desplazable. No impone un mapa de anchos por
   página: los anchos se declaran por columna o se dejan al contenido.
3. **Tipos de columna**: `id`, `text`, `amount`, `status`, `actions`.
   - `amount` aplica `text-align: right` + `font-variant-numeric: tabular-nums` a `th` y `td`.
   - `status` exige texto además del color; `Tag`/`Badge` de `DEV-02` siguen siendo los únicos.
   - `actions` agrupa botones/enlaces y conserva el orden y las etiquetas actuales.
4. **`DataList`**: recibe **las mismas definiciones de columna** y `rows`, y renderiza las
   tarjetas móviles con `data-label` por columna. Así la paridad tabla/tarjeta no depende de
   mantener dos JSX a mano. Las columnas marcadas `card: "hidden"` no se muestran en tarjeta
   (p. ej. una columna puramente decorativa); ninguna columna con información se elimina.
5. **Compatibilidad**: durante `DEV-04` los contenedores conservan las clases
   `desktop-list`/`mobile-list` junto a las nuevas (`ui-table-wrap`/`ui-data-list`), para no
   romper los selectores E2E existentes. La retirada de las clases históricas se pospone a
   `DEV-06/07`, no a este bloque.
6. **CSS aditivo** al final de `style.css`, con prefijo `ui-table`/`ui-data-list`, sin reordenar
   ni reescribir secciones. Consume tokens existentes:
   - cabecera: `--table-head` (ya definido en los tres temas);
   - hover: `--surface-2`;
   - bordes: `--border`/`--surface-2`;
   - cifras: `--text-sm` (mínimo 12 px) y `tabular-nums`;
   - foco: `--focus`, `--focus-width`, `--focus-offset`.
   **No se añaden tokens cromáticos ni se edita `themes.css`, `theme-boot.js` ni `themes.ts`.**

### 2.2 Pantallas que migran en `DEV-04`

Listados de catálogo con tabla de escritorio y tarjetas móviles:

`Saldos`, `Movimientos`, `Inversiones` (Instrumentos, Posiciones, Compras, Ventas),
`Ventas`, `Valoración` (posiciones y serie), `Deudas` (listado), `Vehículos` (listado y
subtablas), `Anticipos`, `Ciclos`, `Clasificación`, `Presupuestos`, `Referencias`,
`PlanesCiclo`, `PlanAnual`, `Compartidos` (listado y participantes), `Comida`,
`Revisión Comida` (operaciones y repositorio), `Pendientes` (métricas y listado) y `Nómina`.

**Exclusión explícita de cambios de datos, rutas, permisos y cálculos:** `DEV-04` no modifica
columnas con información nueva, `href`, contratos de API/DTO, estados financieros, redondeos,
formato de cifras, filtros, paginación ni reglas de negocio. Solo cambia la presentación de
las tablas y tarjetas ya existentes.

### 2.3 Fuera de la migración de `DEV-04`

- **Tablas de informe/operación:** `Cierre` (E4.9), `Precierre` (E4.8), `ResumenAnual` (E4.7),
  `D′ Partidas` (planificación) y `FlujoMensual` (ajuste). Conservan su markup y contrato.
- **`.table` sin estilos:** Comida deja la clase al migrar en `DEV-04`; para Cierre, D′ y Precierre
  se propone un alias CSS mínimo en el incremento 4 (ver §3), **solo si se autoriza**. Si el
  propietario de E4.8/E4.9 no lo autoriza, esas pantallas quedan **fuera** y se registran como
  deuda residual para `DEV-06/07`.
- **Detalle y formularios:** `DEV-05`; no se migran fichas ni campos.

---

## 3. Incrementos pequeños y reversibles

Cada incremento es un commit independiente, con su propia evidencia y reversible por revert.
La secuencia es estrictamente secuencial porque todos comparten `style.css`.

### I1 — Primitiva y contrato (sin migrar pantallas)

- **Archivos:** `apps/web/src/ui.tsx` (`Table`, `DataList`, tipos de columna; `TableScroll`
  conservado), `apps/web/src/style.css` (sección aditiva `ui-table`/`ui-data-list`),
  `apps/web/test/ui.test.tsx`.
- **Pruebas unitarias:** render de `Table` con `caption`, `role="region"`, `aria-label`,
  `tabIndex=0`; `amount` produce `th`/`td` alineados; `DataList` reproduce etiquetas y valores
  de las mismas columnas; `TableScroll` conserva su contrato.
- **E2E:** ninguno nuevo; `theme.spec.ts` debe seguir intacto (no se toca markup de pantallas).
- **Capturas:** ninguna; el diff no debe cambiar píxeles.
- **Reversión:** revertir el commit deja las pantallas actuales sin cambios.

### I2 — Catálogo denso

- **Archivos:** `apps/web/src/Saldos.tsx`, `apps/web/src/Movimientos.tsx`.
- **Cambio:** sustituir tabla + tarjetas escritas a mano por `Table`/`DataList` con las mismas
  columnas; `Posición`/`Importe` pasan a rol `amount`.
- **Pruebas:** `bun test apps/web/test/ui.test.tsx`; E2E `theme.spec.ts`, `catalog.spec.ts`,
  `movimientos.spec.ts` (conservan los selectores `.desktop-list`/`.mobile-list`).
- **Capturas:** 12 (Saldos y Movimientos × 3 temas × 390/1440).
- **Reversión:** revertir el commit devuelve las dos pantallas al JSX anterior.

### I3 — Patrimonio y tablas anchas

- **Archivos:** `Inversiones.tsx`, `Ventas.tsx`, `Valoracion.tsx`, `Deudas.tsx`,
  `Vehiculos.tsx`, `Anticipos.tsx`.
- **Cambio:** migración; toda tabla con `min-width` queda dentro de `TableScroll` rotulado y
  enfocable; se elimina la duplicación tabla+tarjetas de Anticipos entre 761 y 1050.
- **Pruebas:** E2E `inversiones.spec.ts`, `ventas.spec.ts`, `valoracion.spec.ts`,
  `deudas-completa.spec.ts`, `vehiculos.spec.ts`, `anticipos.spec.ts`.
- **Capturas:** 12 (2 pantallas representativas × 3 temas × 390/1440) + comprobación de scroll
  en las tablas de 10–12 columnas.
- **Reversión:** revertir el commit devuelve el lote completo de patrimonio.

### I4 — Resto de listados, alias `.table` y retirada de mapas

- **Archivos:** `Ciclos.tsx`, `Clasificacion.tsx`, `Presupuestos.tsx`, `Referencias.tsx`,
  `PlanesCiclo.tsx`, `PlanAnual.tsx`, `Compartidos.tsx`, `Comida.tsx`, `RevisionComida.tsx`,
  `Pendientes.tsx`, `Nomina.tsx`; `style.css` (retirada de los mapas `nth-child` ya sin
  consumidores y alias mínimo para `.table`).
- **Cambio:** migración mecánica; ninguna columna nueva ni acción nueva. Comida deja de usar
  `table.table` al migrar; el alias mínimo de `.table` cubre Cierre/D′/Precierre **solo si se
  autoriza** (si no, esas tres pantallas quedan fuera y la deuda se registra para `DEV-06/07`).
- **Pruebas:** E2E `catalog.spec.ts`, `compartidos.spec.ts`, `plan-anual.spec.ts`,
  `planes-ciclo.spec.ts`, `comida-dprima.spec.ts`, `revision-comida.spec.ts`,
  `pendientes.spec.ts`, `nomina.spec.ts`, `cierre.spec.ts`, `precierre.spec.ts` y
  `theme.spec.ts`.
- **Capturas:** 12 (2 pantallas representativas × 3 temas × 390/1440) + estados vacío/error de
  un listado.
- **Reversión:** revertir el commit restaura los mapas y el markup del lote.

Si I4 resulta demasiado grande en revisión, puede partirse en dos commits del mismo bloque
(resto de listados / retirada de mapas y alias), sin cambiar el alcance ni el orden.

---

## 4. Criterios de aceptación verificables

Se comprueban en cada incremento sobre las pantallas migradas; no son un PASS global.

1. **Paridad tabla/tarjeta:** en el DOM de cada pantalla, el número de filas de la tabla coincide
   con el de tarjetas; para cada fila, el identificador, la etiqueta principal y el importe
   formateado aparecen en su tarjeta; las acciones presentes en una vista existen en la otra.
   A 1440 se muestra la tabla y a 390 la lista de tarjetas.
2. **Sin scroll horizontal de página a 390:** `document.documentElement.scrollWidth <=
   innerWidth` en cada pantalla migrada; a ≤760 la tabla está oculta y la lista de tarjetas
   visible.
3. **Datos anchos contenidos:** si una tabla conserva columnas que no caben, su contenedor
   tiene `role="region"`, `aria-label` no vacío y `tabIndex=0`; se puede desplazar con teclado
   y el foco es visible; la página no se desplaza horizontalmente.
4. **Importes a la derecha:** las celdas y cabeceras de rol `amount` tienen
   `text-align: right` y `font-variant-numeric: tabular-nums`; el texto formateado es
   exactamente el que produce `formatAmount` (sin cambios de valor, signo ni decimales).
5. **Cabecera y hover por token:** el fondo de `thead` resuelve a `--table-head` en `dark-s`,
   `light-s` y `hybrid-s`; el hover de fila resuelve a `--surface-2`; no aparece ningún color
   literal nuevo.
6. **Foco y teclado:** se alcanzan con Tab todos los enlaces y botones de la tabla y de las
   tarjetas; la región desplazable es enfocable; `:focus-visible` es visible en los tres temas;
   no hay `div` clicables.
7. **Legibilidad:** el texto funcional de cabecera, celdas y tarjetas es ≥12 px y no se
   trunca con `overflow: hidden`; las columnas de texto largo envuelven.
8. **Sin cambios de contrato:** no cambian rutas, `href`, API/DTO, permisos, cálculos,
   estados, filtros, paginación ni cifras; `themes.css`, `theme-boot.js` y `themes.ts` quedan
   sin tocar.
9. **Evidencia:** 12 capturas por incremento (2 pantallas × 3 temas × 390/1440) más la
   comprobación de scroll; las capturas son evidencia, no aprobación.

---

## 5. Dependencias y riesgos de regresión

### 5.1 Dependencias

- **`DEV-01`** (`464c506`): escala tipográfica, `--space`, foco y tamaños mínimos.
- **`DEV-02`** (`025adf8`): `Amount`, `Badge`, `Metric`, `EmptyState`, `Skeleton` y formateador
  único; `DEV-04` solo consume.
- **`DEV-03`** (`d7eaffb`): navegación y shell; no se modifica, pero comparte `style.css` y
  fija el estado de partida.
- **Orden:** `04` después de `03` y antes de `05`; un único escritor de `style.css`.
  `DEV-05` comparte `ui.tsx` y las tarjetas móviles, por lo que no se paraleliza.
- **E4.10/E4.11:** no se anticipan pantallas ni clases; no hay UI que migrar.

### 5.2 Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Los E2E dependen de `.desktop-list tbody tr` y `.mobile-list li` (`theme.spec.ts:79,119`; `catalog.spec.ts:48,70`; `movimientos.spec.ts:412,422`) | Alto: romper selectores invalida suites completas | Conservar ambas clases como hooks durante `DEV-04`; cambiar selectores solo con actualización consciente |
| Nombres de región duplicados (`getByRole("region", { name: "Listado de Ventas" })`) | Medio: `strict mode violation` si se anida otra región con el mismo nombre | Rótulos del scroll distintos del `<section>` o reutilizar el `<section>` como región |
| Retirar el mapa fijo cambia anchos y puede provocar desbordamiento entre 761 y 1050 | Alto | Migrar por lotes, medir `scrollWidth` de cada tabla y usar `TableScroll` en las anchas |
| Reemplazar tarjetas escritas a mano puede perder acciones o metadatos | Alto (pérdida de información) | `DataList` con las mismas columnas; prueba de paridad por fila/tarjeta |
| Importes: mezclar alineación con formato | Medio | `DEV-04` no toca `formatAmount`; solo `text-align`/`tabular-nums` |
| Alias `.table` cambia Cierre/D′/Precierre | Medio: pantallas E4.8/E4.9 con contratos congelados | Requiere autorización explícita; si no, Precierre fuera y deuda registrada |
| `--table-head` cambia el fondo de cabecera respecto a `--section` | Bajo (visual) | Es el token previsto; verificar los tres temas y no tocar paletas |
| Tablas de 12 columnas con `nowrap` | Medio | Región rotulada y enfocable; comprobar scroll con teclado a 390 y 761 |
| `style.css` monolítico | Medio: colisiones con otros frentes | Sección aditiva al final, sin reordenar; un solo escritor por ventana |
| Tests unitarios de `ui.tsx` | Bajo | Ampliar `ui.test.tsx`; `bun test apps/web/test/ui.test.tsx` |

---

## 6. Qué NO entra en `DEV-04`

- Formularios, fichas, campos, ayuda/error y rejilla 2→1 (`DEV-05`).
- Cambios de densidad (altura de fila o preferencia de producto): la densidad se mantiene
  legible y compacta; no se añade selector ni prop de densidad.
- Nuevos filtros, columnas, ordenaciones, paginación, acciones o funcionalidad de producto.
- Cambios de datos, API/DTO, rutas, permisos, cálculos, redondeos, estados o cifras.
- Temas, paletas, tokens cromáticos, `theme-boot.js`, `themes.ts` y selector.
- Navegación y shell (`DEV-03`).
- Pantallas de informe/operación: `Cierre`, `Precierre`, `ResumenAnual`, `D′ Partidas` y
  `FlujoMensual` (salvo el alias `.table` si se autoriza).
- E4.10, E4.11, despliegue, VPS, CI nuevo o cambios de visibilidad.
- Declarar PASS, cerrar `DEV-04` o fusionar sin autorización y QA independiente.

---

## 7. Orden de ejecución y verificación mínima

1. **I1** → typecheck, build, unitarios de `ui.tsx`; sin capturas (no debe haber diff visual).
2. **I2** → E2E de Saldos/Movimientos/Tema; 12 capturas.
3. **I3** → E2E de patrimonio; 12 capturas y prueba de scroll rotulado.
4. **I4** → E2E de resto de listados y de las pantallas tocadas por el alias; 12 capturas y
   estados vacío/error.

**Verificación mínima por incremento:**

```text
bun run typecheck
bun run build
bun test apps/web/test/ui.test.tsx
bun run test:e2e tests/e2e/<spec-afectada>.spec.ts
```

**Cierre del bloque (propuesto, no ejecutado):**

```text
python3 scripts/verify --full
```

más QA independiente, revisión del diff, comprobación de que no cambian cifras/estados y
matriz de capturas 390/1440 × 3 temas. Sin PASS de aceptación global y sin merge automático.

---

**Nota de índice:** no existe un índice de `specs/investigations/`; este paquete queda como
documento independiente y no se modifica ningún índice inexistente.
