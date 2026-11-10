# Fase 2 · Candidatos de Inicio

**Estado:** exploración visual aislada. **No son temas de producción y no están integrados.**
**Rama:** `feature/ui-premium-exploration`.
**Alcance:** Inicio de escritorio a 1440 px para `graphite-lime`, `color-finance` y
`pastel-editorial`. Movimientos y estados se documentan por separado en
[`README-movimientos.md`](README-movimientos.md).

La página de exploración es [`inicio-candidatos.html`](inicio-candidatos.html). El tema se
puede fijar por URL con `?theme=graphite-lime`, `?theme=color-finance` o
`?theme=pastel-editorial`. El selector de la cabecera cambia entre los tres candidatos.

**Movimientos y estados:** la segunda parte de la exploración, con las pantallas operativas y
la galería de formularios/estados, está en
[`README-movimientos.md`](README-movimientos.md).

**Cierre de Graphite y paquete de integración:** la validación final, los formularios de
Compra/Amortización y el plan de consolidación están en
[`README-graphite-final.md`](README-graphite-final.md) y
[`README-integracion.md`](README-integracion.md).

## Cómo leer esta entrega

- `comparativa-candidatos.jpg` — los tres primeros pliegues, con lectura de personalidad,
  jerarquía, profundidad y diferenciación.
- `comparativa-candidatos-full.jpg` — Inicio completo de los tres candidatos.
- `comparativa-familia-6.jpg` — Dark, Light final, Hybrid final y los tres candidatos en una
  sola vista.
- `shots/{tema}-1440.jpg` — pantalla completa.
- `shots/{tema}-1440-fold.jpg` — primer pliegue.
- `shots/{tema}-{hero,kpis,cycle,rail,movements,budget,position}.jpg` — recortes de superficie.
- [`qa-report.md`](qa-report.md) — comprobaciones automáticas y límites.

## Las tres direcciones

### Tema 4 · Graphite Lime

**Referencia:** [Qiespend · AI-Powered Fintech Dashboard](https://dribbble.com/shots/25900652-Qiespend-AI-Powered-Fintech-Dashboard).
**Concepto:** minimal fintech en grafito, carbón y lima eléctrico.

- Fondo casi negro con retícula fina en el héroe, sin ondas ni cyan.
- Superficies carbón `#131513`, bordes finos `#292D28`, radios compactos de 8–10 px.
- Lima eléctrico `#D7FF5E` como único acento de interacción; verde menta y coral solo para
  estados financieros.
- Héroe con una sola línea de luz, sparkline lima y anillo del plan lima.
- Tablas con cabecera casi negra, bordes de 1 px y marca de lima en la fila activa.
- Posición en cinco fichas compactas; la primera y la cobertura tienen acento propio.
- Navegación activa en lima sólido con texto negro: el contraste de chrome más alto de la
  colección.

**Diferencia con Dark-s:** Dark-s es tecnológico y cyan, con ondas y superficies azuladas.
Graphite Lime es más seco, más grafito, con lima y sin ondas. La densidad es mayor y la luz
está más contenida.

**Riesgo:** si el lima se generaliza a fondos grandes, el tema se acerca a un dark genérico o
pierde la sobriedad. En esta propuesta el lima se reserva para acentos, cifras clave y estados.

### Tema 5 · Color Finance

**Referencia:** [Finance Dashboard Design · Nixtio](https://dribbble.com/shots/19700264-Finance-Dashboard-Design).
**Concepto:** colorful premium finance sobre papel cálido.

- Lienzo cálido `#F7F2EA` con lavados de lavanda, amarillo y salvia.
- Sidebar lavanda pálida, activo en violeta `#5B4BCF` con texto blanco.
- Héroe grafito-plum `#2B2635`, anillo amarillo y gráfico lavanda → amarillo.
- Cuatro KPI con jerarquía cromática: lavanda, mantequilla, salvia y blanco con carril violeta.
- Ciclo blanco con cabecera lavanda; Atención en mantequilla; Objetivo en lavanda;
  Presupuesto en salvia con barras de color.
- Posición en cinco fichas tintadas, sin perder la lectura de importes.

**Diferencia con Light-s:** Light-s es papel crema editorial con teal y naranja; su color vive
en acentos y en la bandeja KPI crema. Color Finance usa lavanda, amarillo y salvia como
estructura, con tarjetas KPI de colores y un gráfico más expresivo. Las tablas y los importes
siguen siendo sobrios.

**Riesgo:** la variedad cromática puede fragmentar la jerarquía si se extiende sin disciplina
a tablas, filtros y estados. La propuesta concentra el color en KPI, presupuesto y posición;
las tablas permanecen neutras.

### Tema 6 · Pastel Editorial

**Referencia:** [Eilo Finance Management Dashboard UI](https://dribbble.com/shots/27826935-Eilo-Finance-managment-Dashboard-UI).
**Concepto:** pastel editorial / creative finance; la propuesta más experimental.

- Fondo crema `#F6F0E7` con lavados de lavanda, rosa y limón.
- Sidebar lavanda con activo negro y tipografía limón.
- Titulares en serif editorial; los datos y las tablas siguen en Inter con cifras tabulares.
- Héroe collage de tres celdas pastel con borde de tinta de 2 px.
- KPI asimétricas: colores distintos, radios distintos y desplazamientos deliberados.
- Tarjetas principales con borde negro y sombra dura; Atención y Objetivo con regla superior
  de 4 px; Presupuesto limón con barras negras.
- Posición en cinco bloques pastel con anchuras desiguales.

**Diferencia con todos los temas actuales:** no es un cambio de paleta sobre la misma
superficie. Cambia el lenguaje: impresión, serif, tinta, asimetría y bloques de color. Es la
dirección con más personalidad y la que más exige adaptar tablas, formularios y estados.

**Riesgo:** el borde negro y el serif son muy identitarios; en pantallas densas como
Movimientos pueden pesar. Los desplazamientos de KPI están resueltos con margen, no con
`transform`, para que el layout los tenga en cuenta; aun así habría que revisarlos en responsive.

## Inspiración, no copia

| Referencia | Candidato | Qué se tomó | Qué no se copió |
| --- | --- | --- | --- |
| Qiespend | Graphite Lime | Grafito/carbón, lima, tarjetas compactas, bordes finos, luz contenida | Layout literal, widgets de IA, cyan y ondas |
| Nixtio | Color Finance | Papel cálido, lavanda/amarillo/salvia, tarjetas de color, gráfico expresivo | Composición literal; se conserva la estructura C |
| Eilo | Pastel Editorial | Pasteles, crema, tipografía expresiva, asimetría editorial | Layout literal; los importes no usan serif |

## Diferencias frente a los temas actuales

| Tema | Base | Chrome | Acento | Héroe | Tarjetas | Carácter |
| --- | --- | --- | --- | --- | --- | --- |
| Dark-s | Azul-negro | Sidebar oscura | Cyan | Oscuro luminoso | Superficies profundas | Tecnológico |
| Light-s | Crema cálida | Sidebar clara | Teal + naranja | Teal profundo | Bandeja KPI crema | Editorial diurno |
| Hybrid-s | Crema cálida | Sidebar petróleo | Teal + naranja | Petróleo | Atención/objetivo claros | Equilibrado |
| Graphite Lime | Grafito | Sidebar casi negra | Lima | Carbón con retícula | Compactas, bordes finos | Fintech sobrio |
| Color Finance | Papel cálido | Sidebar lavanda | Lavanda + amarillo + salvia | Grafito-plum | Tarjetas de color | Creativo premium |
| Pastel Editorial | Crema pastel | Sidebar lavanda + activo negro | Tinta + pasteles | Collage pastel | Bordes de tinta, asimetría | Editorial experimental |

Los seis comparten navegación, composición C, componentes, orden de KPI y datos sintéticos.

## Evaluación de diseño

No es una medición objetiva de calidad; es una lectura crítica sobre los criterios pedidos.

| Tema | Personalidad | Profundidad | Jerarquía | Legibilidad | Diferenciación | Recomendación |
| --- | --- | --- | --- | --- | --- | --- |
| Graphite Lime | Alta · fintech sobria | Alta · luz contenida | Alta · héroe y tablas | Excelente · mínimo 6,00:1 | Alta vs Dark-s | **Continuar** |
| Color Finance | Alta · cálida y creativa | Media-alta · capas de color | Alta · KPI y paneles | Alta · mínimo 4,93:1 | Alta vs Light-s | **Continuar** |
| Pastel Editorial | Muy alta · editorial | Alta · collage y tinta | Alta · serif y bordes | Alta · mínimo 5,30:1 | Muy alta vs todos | **Explorar** |

### Recomendación

- **Graphite Lime** es la candidata con menor riesgo y mayor confianza. Aporta una alternativa
  oscura claramente distinta de Dark-s sin abandonar la sobriedad financiera. Debería pasar a
  Movimientos y responsive.
- **Color Finance** es la alternativa diurna más clara frente a Light-s. El color está
  estructurado en tarjetas y grupos, no en las tablas; eso permite conservar precisión. También
  debería pasar a Movimientos y responsive.
- **Pastel Editorial** es la propuesta más diferencial y la que mejor cumple el papel de
  exploración creativa. Antes de extenderla, conviene una segunda iteración acotada de Inicio
  para probar su lenguaje en tablas, filtros y formularios. No la descartaría, pero no la
  pondría por delante de las otras dos para una primera integración.

Si hubiera que elegir **dos**, elegiría **Graphite Lime + Color Finance**. Si hubiera que
elegir **una sola**, **Graphite Lime** por confianza y diferenciación; **Color Finance** sería
la elección si se prioriza una alternativa diurna.

## Arquitectura compartida

- Se reutilizan `tokens.css`, `icons.css`, `base.css`, `inicio.css` y `app.js`.
- [`candidates.css`](candidates.css) añade solo bloques de tokens y tratamientos de superficie
  para los tres candidatos; no crea componentes nuevos ni duplica la composición.
- La página conserva la estructura C, los mismos KPI, el mismo orden, la misma navegación y
  los mismos datos sintéticos.
- Los temas se activan con `data-theme`; el selector de cabecera y el de móvil ofrecen los tres
  candidatos. No hay persistencia de selección: es una exploración visual, no integración.
- No se han modificado la aplicación funcional, los tokens de producción, la API, SQLite, el
  Excel, las ramas `test`/`main` ni ningún despliegue.

## QA

- **3 páginas** a 1440×1000: **0 overflow**, **0 errores de consola**, **0 textos funcionales
  por debajo de 12 px**.
- **0 fallos de contraste** en las parejas de tokens y superficies tintadas comprobadas.
- Mínimos: Graphite **6,00:1**, Color Finance **4,93:1**, Pastel **5,30:1**.
- Cambio entre los tres temas verificado desde la cabecera; el selector móvil contiene los
  mismos tres valores.
- La comprobación es representativa, no una auditoría WCAG completa; no incluye lector de
  pantalla, zoom real al 200 % ni análisis píxel a píxel.

Detalle en [`qa-report.md`](qa-report.md).

## Límites

- Esta entrega de Inicio cubre solo escritorio a 1440. Movimientos, móvil y estados se
  documentan en [`README-movimientos.md`](README-movimientos.md); no todos los temas tienen el
  mismo alcance.
- Los temas son propuestas visuales; no sustituyen los tokens cerrados de `UI · SPEC`.
- Datos exclusivamente sintéticos; no se ha usado información real ni el Excel.
- No hay integración, persistencia, despliegue ni cambios en la aplicación.
- La evaluación de personalidad, profundidad y jerarquía es una lectura de diseño; el contraste
  sí se ha medido sobre parejas representativas.

## Siguiente paso

1. Validar las tres direcciones y elegir cuáles continúan.
2. Si se aprueban, extender solo las elegidas a Movimientos y responsive.
3. Después, preparar el plan de incorporación al catálogo de temas con tokens semánticos,
   persistencia y pruebas de accesibilidad completas.

No se ha iniciado ninguno de esos pasos.
