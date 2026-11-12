# Fase 2 · Movimientos y estados de los candidatos

**Estado:** prototipos visuales aislados. **No integrados, no fusionados y no desplegados.**
**Rama:** `feature/ui-premium-exploration`.
**Alcance:** Movimientos de escritorio para los tres candidatos; móvil para Graphite y Color;
tablet para Graphite; estados y formulario completo para Graphite. Pastel Editorial se queda
en escritorio, según el alcance acordado.

La página compartida es [`movimientos-candidatos.html`](movimientos-candidatos.html) y la
galería de estados es [`estados-candidatos.html`](estados-candidatos.html). El tema se fija con
`?theme=graphite-lime`, `?theme=color-finance` o `?theme=pastel-editorial`, o desde el selector
de la cabecera.

No se han duplicado interfaces: una sola página de Movimientos y una sola galería de estados
consumen los tokens y componentes compartidos.

## Qué se ha construido

### Graphite Lime · prioridad principal

- Filtros carbón con foco lima, chips de filtro y controles de 44 px en móvil.
- Tabla con cabecera casi negra, bordes finos, hover y fila seleccionada con barra lima.
- Detalle carbón con borde superior lima, importe semántico y campos legibles.
- Hoja de detalle móvil, tarjetas de movimiento y filtros abiertos en una columna.
- Formulario completo de movimiento y galería de estados.
- **Semántica separada:** lima = marca/acción/información/selección; menta = positivo,
  completo y guardado; ámbar = parcial/pendiente; coral = negativo/error; gris = anulado/no
  disponible. El estado “Vigente” del detalle usa un badge neutro, no lima. Los importes
  positivos usan menta, no el acento de marca.

### Color Finance · alternativa diurna

- Filtros blancos con carril lavanda; tabla neutra con cabecera lavanda.
- Selección violeta con barra y fondo lavanda; detalle claro con borde violeta.
- Hoja de detalle móvil clara, tarjetas con selección lavanda y controles de 44 px.
- El color se concentra en cabeceras, selección, bordes y estados; la tabla y los importes
  mantienen la lectura financiera.
- Comparte la galería de estados y el formulario con Graphite.

### Pastel Editorial · exploración secundaria

- Filtros y tabla con reglas de tinta, selección lavanda y hover crema.
- Detalle lavanda con borde negro, titulares en serif y campos en Inter.
- El serif se reserva para titulares y conceptos; las cifras y los datos siguen en cifras
  tabulares.
- Solo escritorio en esta entrega. La página base es responsive, pero **no se han validado ni
  diseñado sus estados móviles**.

## Responsive

| Vista | Graphite | Color | Pastel |
| --- | --- | --- | --- |
| Escritorio 1440 | Validado | Validado | Validado |
| Tablet 820 | Validado | Comprobado por la base responsive | No validado |
| Móvil 390 | Validado + hoja + filtros | Validado + hoja | No validado |

- La tabla se sustituye por tarjetas a 760 px; el detalle pasa a hoja inferior.
- En tablet, la sidebar se reduce a iconos y el ciclo secundario de la tabla se consulta en el
  detalle para no truncar filas.
- En móvil, el contexto de ciclo y el selector de tema se apilan en dos líneas para evitar
  truncar “Ciclo 11 · Noviembre 2026”.
- Los controles móviles visibles (botones, campos, selects, cierre de hoja, paginación) tienen
  al menos 44 px de alto.

## Formularios y estados

La galería incluye:

1. Cargando.
2. Vacío verificado.
3. Sin coincidencias.
4. Error de carga.
5. Datos parciales.
6. Selección.
7. Validación.
8. Deshabilitado.
9. **Formulario completo de nuevo movimiento** (fecha, tipo, concepto, importe, saldo,
   partida, referencia, estado y nota).
10. **Guardado** con confirmación y acciones siguientes.

El formulario y los estados son demostrativos: no guardan datos ni ejecutan lógica financiera.
Las fechas se muestran en formato `dd/mm/aaaa` para la lectura española del prototipo. El color
no es el único canal de estado: hay texto, icono y forma.

## Comparativas

- [`comparativa-movimientos-desktop.jpg`](comparativa-movimientos-desktop.jpg) — los tres
  candidatos a 1440, con matriz de filtros, tabla, detalle, móvil, estados y recomendación.
- [`comparativa-movimientos-responsive.jpg`](comparativa-movimientos-responsive.jpg) —
  Graphite 820/390, detalle y filtros; Color 390 y detalle.
- [`comparativa-movimientos-familia.jpg`](comparativa-movimientos-familia.jpg) — Dark, Light
  final, Hybrid final y los tres candidatos.
- [`comparativa-estados-graphite.jpg`](comparativa-estados-graphite.jpg) — estados, formulario
  y móvil de Graphite.
- [`comparativa-candidatos.jpg`](comparativa-candidatos.jpg) — comparativa de Inicio ya
  entregada.

Capturas completas:

- `shots-movimientos/graphite-lime-1440.jpg`, `-820.jpg`, `-390.jpg`, `-390-detail.jpg` y
  `-390-filters.jpg`.
- `shots-movimientos/color-finance-1440.jpg`, `-390.jpg` y `-390-detail.jpg`.
- `shots-movimientos/pastel-editorial-1440.jpg`.
- `shots-estados/graphite-lime-1440.jpg` y `-390.jpg`; recortes de formulario y guardado.

## Referencias y diferencias

| Referencia | Candidato | Qué se tomó | Cómo se adaptó a Movimientos |
| --- | --- | --- | --- |
| Qiespend | Graphite Lime | Grafito, lima, tarjetas compactas, bordes finos | Filtros y tabla densos; detalle carbón; acciones y selección lima; positivo menta |
| Nixtio | Color Finance | Papel cálido, lavanda/amarillo/salvia, color estructurado | Tabla neutra con cabecera lavanda; selección violeta; detalle claro |
| Eilo | Pastel Editorial | Pasteles, crema, tinta, tipografía editorial | Reglas negras, selección lavanda, detalle con serif solo en titulares |

Frente a los temas existentes:

- **Dark-s** sigue siendo tecnológico y cyan; Graphite Lime es grafito/lima, más compacto y sin
  ondas.
- **Light-s** es papel crema con teal/naranja; Color Finance usa lavanda/amarillo/salvia y
  tarjetas KPI de color.
- **Hybrid-s** conserva sidebar oscura y workspace cálido; Pastel Editorial cambia el lenguaje
  a tinta, pastel y serif.

## QA

- **3 escritorios** de Movimientos, **1 tablet**, **2 móviles**, **3 escritorios de estados** y
  **1 móvil de estados**: **0 overflow**, **0 errores de consola**, **0 textos funcionales
  < 12 px**.
- **0 fallos de contraste** en tokens y superficies locales comprobadas.
- Mínimos: Graphite **5,16:1**, Color Finance **5,02:1**, Pastel **5,32:1**.
- Cambio entre los tres temas verificado en Movimientos y estados.
- En móvil: apertura/cierre de hoja de detalle, selección de movimiento, filtros abiertos y
  selector de tema con tres valores.
- **0 controles visibles por debajo de 44 px** a 390 px.

Detalle en [`qa-movimientos.md`](qa-movimientos.md) y `qa-movimientos.json`. No es una auditoría
WCAG completa.

## Evaluación y recomendación

### Graphite Lime

Es la propuesta más sólida para incorporar al catálogo. Mantiene la densidad y la jerarquía de
Movimientos, la tabla se lee con rapidez, el detalle tiene foco sin competir con la tabla y la
separación semántica lima/menta/ámbar/coral funciona. La tablet y el móvil están resueltos sin
duplicar la interfaz.

**Recomendación:** incorporar como tema oscuro adicional, después de la aprobación visual y de
la spec de integración.

### Color Finance

Funciona bien en pantallas densas: la tabla sigue neutra y el color queda en cabeceras,
selección, detalle y estados. El móvil mantiene la lectura y la hoja clara. Es una alternativa
diurna claramente distinta de Light sin convertir la tabla en un ejercicio cromático.

**Recomendación:** incorporar como tema claro adicional. Vigilar que el violeta no compita con
el ámbar de parcial/pendiente en estados futuros.

### Pastel Editorial

La tabla funciona y el detalle conserva la lectura, pero el lenguaje de tinta, serif y bloques
pastel es el más opinionado de los tres. En escritorio tiene personalidad propia; no se han
validado móvil ni estados.

**Recomendación:** conservarlo como candidato secundario. Antes de incorporarlo, completar
Movimientos responsive y estados, y decidir si el coste de mantener un lenguaje editorial
diferenciado está justificado.

### Catálogo

Si hay que priorizar dos incorporaciones: **Graphite Lime + Color Finance**. Pastel Editorial
queda como tercera vía opcional. Los temas Dark, Light y Hybrid se conservan.

## Límites

- Solo se han diseñado y validado las vistas indicadas. Pastel no tiene móvil ni estados finales.
- No se ha modificado la aplicación funcional, la API, SQLite, el Excel, los tokens de
  producción, las ramas `test`/`main` ni ningún despliegue.
- Datos exclusivamente sintéticos; no hay información real.
- No hay persistencia de tema ni integración en el catálogo.
- No hay commits, push, merge ni despliegue. El checkout está limpio.

## Siguiente paso

Validar Movimientos y la galería de estados. Si se aprueban Graphite y Color, preparar la spec
de incorporación al catálogo y completar Pastel Editorial si se decide mantenerlo. No se ha
iniciado ninguna integración.
