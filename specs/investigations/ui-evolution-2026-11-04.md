# UI — Evolución visual de MyFinanzas: propuesta (2026-11-04)

**Estado:** documento de análisis y diseño actualizado. **No autoriza `DEV`, no cambia contratos
funcionales ni financieros y no modifica código.** La alternativa **B** está adoptada; los tres
temas de #198 están cerrados y no se reabren.

**Base:** `main` **`73fedf8`** (2026-11-05). Temas Fase 1 integrados en `0b8aade` (#198) y
decisión cromática cerrada; E4.6 integrado en `cfbedb0` (#201); E4.9 integrado en `0176ffc`
(#200) con QA APTO CON RESERVAS; E4.10 con **SPEC28 ratificada**, **I1 integrado en `70fa7c0`**
(v26/C26) e **I2 abierto en `5fa0a1e`** (no fusionado, 24 AC `UNRUN`); E4.11 con **SPEC29
DRAFT**, P1-C/P4-A/P5-B aprobadas y P2/P3/P6/P7/P8 pendientes, sin DEV.

**Leyenda.** `[CONFIRMADO]` = regla de un documento aprobado, estado verificado en Git o hecho
medido en el repositorio/artefacto citado. `[PROPUESTA]` = candidato de diseño no aprobado.
`[PENDIENTE]` = decisión o evidencia que todavía no existe.

**Fuentes.** Capturas `artifacts/ui-baseline/inicio-{light,dark,hybrid}-s-1440.png` y variantes
`cero`/`degradado` (la captura de Inicio mide 1440×4475 px); `apps/web/src/style.css` (4.784
líneas), `apps/web/public/themes.css`, `apps/web/public/theme-boot.js`, `apps/web/index.html`,
`apps/web/src/main.tsx`, `Inicio.tsx`, `Saldos.tsx`, `Precierre.tsx`, `ui.tsx`, `api.ts:89-93`;
`specs/guidelines/ui.md`, [SPEC24](../24-e46-resumen-inicio-specification.md),
[roadmap](../roadmap.md), [convención de identificadores](../methodology/identifier-convention.md),
[índice de identificadores](../methodology/identifier-index.md),
[SPEC27](../27-e49-cierre-financiero-specification.md),
[paquete E4.9](e49-dev-authorization-package-2026-11-03.md), `tests/e2e/theme.spec.ts`,
`tests/e2e/inicio.spec.ts`.

---

## 1. Identificador estable propuesto

`[CONFIRMADO]` El identificador canónico del proyecto es la entrega del roadmap
(`E<épica>.<entrega>`), es único, no se renumera y un cambio material de alcance crea un `E`
nuevo (`specs/methodology/identifier-convention.md:7-14`). El roadmap fija **exactamente cuatro
épicas y 30 entregas aprobadas** (`specs/roadmap.md:3,8`). Una iniciativa transversal de
presentación **no puede** ser una entrega `E` ni alterar ese recuento.

`[CONFIRMADO]` La propia convención admite trabajo transversal con un slug documentado para el
`<scope>` del commit/PR (`theme`, `ci`) — `identifier-convention.md:66-67,82`. Ese es el hueco
por el que encaja esta iniciativa.

### 1.1 Decisión

`[CONFIRMADO 2026-11-05]` **`UI`** es el identificador transversal adoptado, siempre cualificado
por etapa:

| Uso | Forma |
| --- | --- |
| Documento de especificación visual | `UI · SPEC` |
| Bloques de desarrollo | `UI · DEV-01 — <nombre>` … |
| Verificación | `UI · QA` |
| Commit / PR | `feat(ui): DEV-01 — fundamentos visuales` |
| Tablero | fila propia de seguimiento transversal, **no** una épica ni una entrega |

Ventajas: es corto, no colisiona con ningún `E`, se lee igual en commit y en tablero, y describe
la capa que realmente se toca (presentación), no la disciplina completa. `[PROPUESTA]` Su
alcance queda atado a la capa visual: **no** puede reabrir reglas financieras, contratos de API,
taxonomías de estado ni decisiones UX ya aprobadas en cada spec; si un cambio exige una decisión
de UX nueva, vuelve a la spec propietaria, no a `UI`.

### 1.2 Alternativas

| Id | Ventaja | Coste / riesgo | Veredicto |
| --- | --- | --- | --- |
| **`UI`** | Corto, neutro, encaja con `feat(ui)`; no insinúa cambio de producto | Coincide con el nombre del archivo `specs/guidelines/ui.md`; hay que escribir siempre `UI · DEV-0x` para desambiguar | **Recomendado** |
| `UX` | Comunica intención de experiencia | Sugiere rediseño de flujos y decisiones UX, que son propiedad de cada spec (SPEC24, SPEC27…). Invita a reabrir lo aprobado | No |
| `VISUAL` | Muy explícito sobre el límite | Largo en commits (`feat(visual)`) y se lee como nombre de épica; el tablero ya tiene prosa con «visual» | Alternativa de reserva |

`[PENDIENTE]` Si el usuario aprueba `UI`, el alta de su fila en
`specs/methodology/identifier-index.md` y en el tablero la hace **solo el coordinador**, cuando
exista autorización; este documento no escribe en ninguno de los dos. `[CONFIRMADO]` El índice
solo registra equivalencias y no crea identidad (`identifier-index.md:1-5`), de modo que `UI`
tampoco necesita un número `SPECnn`: los números libres (`18`, `25`, `28`, `29`, `30`) siguen
reservados a entregas (`identifier-index.md:39-49`).

---

## 2. Estado actual

### 2.1 Lo que existe

| Área | Implementado | Evidencia |
| --- | --- | --- |
| Temas | Tres temas (`light-s`, `dark-s`, `hybrid-s`), los mismos 66 tokens semánticos en cada bloque; arranque antes de React sin parpadeo; preferencia en `localStorage`; selector en cabecera | `themes.css:11-220`, `theme-boot.js:1-13`, `themes.ts`, `main.tsx:39,54-56,474-487`, `theme.spec.ts:76-148` |
| Tokenización del color | `style.css` solo conserva **1 hex de fallback** (`var(--warning, #6b5412)`); el resto de color pasa por `var(--…)`; los componentes no conocen el tema | `style.css:4241`, `themes.css:6-10` |
| Shell | Sidebar fija de 236 px, cabecera global de 84 px con contexto de ciclo, contenido fluido con `max-width: 1450px`, pie; breakpoints 1050/760 px; menú móvil desplegable | `style.css:260-437,888-917,918-1217`, `main.tsx:147-616` |
| Componentes compartidos | `PageHead`, `Tag`, `Alert`, `Switch`, `TableScroll` | `ui.tsx:1-110` |
| Patrones por pantalla | Tabla de escritorio + tarjetas móviles, filtros, toolbar, paginación, fichas en `detail-grid`, formularios en tres bloques, estados vacío/carga/error | `style.css:438-812`, `Saldos.tsx:86-303` |
| Inicio (E4.6) | Contexto, liquidez/objetivo, ciclo real vs plan, cuatro bloques, pendientes, cobertura del modelo; badge único con icono+texto; importes a 22 px con `tabular-nums`; esqueleto y estado degradado | `Inicio.tsx:381-592,681-1556`, `style.css:3684-4175` |
| Accesibilidad de base | Enlace «Saltar al contenido», `:focus-visible` de 3 px, foco al `h1` al navegar, `aria-current`, `aria-invalid`/`aria-describedby` en formularios (33 referencias en el código), objetivos de 44 px en Inicio | `style.css:57-62,238-259`, `main.tsx:76-79,149-151`, `SaldoForm.tsx:57-75`, `style.css:3959-3978` |
| Verificación | E2E de temas (valores RGB reales, persistencia, 390/1440, sin desbordamiento) y de Inicio (contraste ≥ 4.5 en nodos de texto, capturas en tres temas y escenarios cero/degradado) | `theme.spec.ts:69-131`, `inicio.spec.ts:177-227,508-546` |

### 2.2 Carencias confirmadas

| Dimensión | Qué falta | Evidencia |
| --- | --- | --- |
| **Tipografía** | Se declara `Inter` como primera familia pero no se carga ninguna fuente: se usa la del sistema. Escala inexistente: **190** tamaños en píxeles, **79 ≤ 11 px** y **33 ≤ 10 px** (mínimo 7 px) | `style.css:2-9`, medición sobre `style.css` |
| **Espaciado y radios** | `--space` está declarado y **no se usa**; **50** radios literales con 10 valores distintos frente a **9** usos de `var(--radius)` | `style.css:11-12`, medición sobre `style.css` |
| **Tokens** | **30** de los 66 nombres declarados no se consumen en la hoja (incluidos `--chart-*`, `--table-head`, `--negative`, `--strong-*`); los componentes siguen usando alias históricos (`var(--section)`, `var(--white)`, `var(--green)`) | `themes.css:11-220`, medición sobre `style.css` |
| **Jerarquía** | En cada tarjeta de Inicio compiten título (13 px), nota, cifra (22 px), cobertura, motivo, fuente, IDs y contexto en 6–8 líneas; el estado (`NO DISPONIBLE`) puede quedar por encima de la propia cifra `ND` | captura `inicio-light-s-1440.png`, `Inicio.tsx:556-591` |
| **Densidad** | Inicio mide 4.475 px de alto a 1440; la fila de cuatro tarjetas deja ~270 px por tarjeta y empuja fuentes/IDs a 10 px con múltiples saltos de línea; queda un hueco vertical grande antes de «Pendientes» por alturas desiguales | captura y medición del PNG; `style.css:3778-3783,3918-3934` |
| **Legibilidad financiera** | No hay estilo global de importe: solo Inicio usa 22 px/tabulares; en tablas la posición se pinta a 11 px y el ID a 10 px. Dos formateadores con reglas distintas (`eur()` no rellena decimales y usa `-` ASCII; `formatDecimal` usa `−` y rellena a 2) | `Saldos.tsx:233-242`, `api.ts:89-93`, `Inicio.tsx:343-352` |
| **Signo y negativos** | `--negative`/`--negative-soft`/`--negative-border` existen y **no se usan en ningún selector**: un importe negativo no se distingue visualmente | `themes.css:47-49`, medición sobre `style.css` |
| **Estados e indicadores** | El color de éxito es el mismo que el de enlace/acento (`--positive` = `--accent` = `--ok`), así que «completo», un enlace y la navegación activa comparten tono; el estado se apoya en icono+texto, pero no hay un segundo canal (forma o peso). Los conteos de Pendientes se pintan como una fila de encabezados y cifras a 10 px donde un `0` pesa lo mismo que el único valor informativo | `themes.css:39,44,56,109,114,126`, captura `inicio-light-s-1440.png` |
| **Navegación** | **23 enlaces planos** en un único grupo «MI ESPACIO»; iconos y chevrons inconsistentes entre enlaces; sin agrupación por dominio, sin búsqueda ni breadcrumb (solo un `.back` en fichas) | `main.tsx:175-464`, `style.css:302-333` |
| **Cabecera** | `Tema`, «Entorno local» y «Cerrar sesión» conviven con el contexto de ciclo; el título del documento sigue siendo **«MyFinanzas · Catálogo de prueba»** | `main.tsx:471-493`, `index.html:6` |
| **Tema inicial** | `dark-s` está fijado en `index.html`, en `theme-boot.js` y en `themes.ts`; no se consulta `prefers-color-scheme` | `index.html:2`, `theme-boot.js:5-11`, `themes.ts:11` |
| **Tablas** | Un mapa de columnas fijo (29/13/15/13/30 %) se aplica a todas las tablas y cada página lo sobrescribe; `Precierre` usa `className="table"` y la clase `.table` **no está definida** en la hoja: la tabla solo recibe el `min-width` de su contenedor y se pinta con celdas, cabecera y densidad del navegador | `style.css:489-517`, `style.css:3372-3418`, `style.css:2205-2211`, `Precierre.tsx:237-238` |
| **Componentes** | Cinco exportados; no hay `Badge`, `Card`, `Metric`, `Amount`, `Field`, `Table`, `EmptyState` ni `Skeleton` compartidos. Inicio define su propio `Badge`/`MetricCard` internos y hay al menos cinco variantes de «píldora» (`tag`, `inicio-estado`, `local-badge`, `inicio-readonly`, badges de valoración) | `ui.tsx`, `Inicio.tsx:381-592`, `style.css:171-186,3712-3722,3879-3907` |
| **Formularios** | No hay primitiva `Field`: cada form compone etiqueta, ayuda y error a mano; solo `PlanesCiclo` y `Valoracion` usan `fieldset`/`legend`; las secciones se construyen con `.section-title` y `.step-number`. El cableado `aria-invalid`/`aria-describedby` existe en `SaldoForm`, no como patrón garantizado | `style.css:591-740`, `SaldoForm.tsx:57-75`, `PlanesCiclo.tsx`, `Valoracion.tsx` |
| **Tarjetas** | Conviven `.panel` (radio 10, padding 24), `.inicio-metric` (radio 8, padding 14), `.auth-panel` (radio 12, padding 30) y contenedores sin superficie propia; no existe una primitiva de tarjeta con anatomía común | `style.css:145-150,835-841,3809-3816` |
| **Reutilización cruzada** | `Precierre` toma clases de Compartidos (`.shared-metrics`, `.metric`), así que rediseñar Compartidos altera precierre sin tocar su archivo | `Precierre.tsx:176-238`, `style.css:2029-2047` |
| **Móvil** | El comportamiento está definido por CSS (una columna, menú desplegable, cabecera apilada), pero la carpeta de referencia entregada solo contiene capturas a 1440: **no hay revisión visual móvil en este artefacto** | `artifacts/ui-baseline/*-1440.png`, `style.css:918-1217` |
| **Consistencia entre temas** | El tema claro usa un tinte de tarjeta «plan» (`#f2f0eb`) casi igual al fondo (`#f7f5f1`): la diferenciación depende del borde discontinuo; no hay matriz de evidencia de estados por tema | `themes.css:84,87,154,157`, captura `inicio-light-s-1440.png` |
| **Identidad documentada** | `guidelines/ui.md` sigue describiendo la identidad verde `#8DBB2E`, fondo `#EEF7E8` y «tema únicamente claro»; la app usa teal/naranja y tres temas desde #198. Propuesta de actualización en [`ui-specification.md`](../ui-specification.md) §2.1, sin cambiar colores | `guidelines/ui.md:9-15,67-68,160-162` |

`[CONFIRMADO]` Ninguna carencia anterior exige recalcular una cifra ni cambiar una regla de
negocio: todas son de presentación. Varias sí tocan decisiones de UX ya aprobadas (orden de
secciones de Inicio, taxonomía de badges), y por eso el bloque 7 las trata como frontera y no
como libertad de diseño.

---

## 3. Principios de diseño

`[PROPUESTA]` Seis principios, cada uno con una regla verificable. No sustituyen la identidad:
la ordenan.

1. **La cifra manda.** Una tarjeta tiene una sola lectura principal (importe o «No disponible»),
   con tamaño y peso propios; el estado va al lado con icono **y** texto; cobertura, motivo,
   fuente e IDs son secundarios y agrupados. Prohibido: nota por encima de la cifra, dos cifras
   del mismo rango en la misma tarjeta.
2. **Densidad controlada, no comprimida.** Tres niveles de texto (principal, cuerpo, metadato) y
   ninguno funcional por debajo de 12 px; la tabla puede seguir compacta, pero el metadato no se
   convierte en letra pequeña. Prohibido: 7–10 px para información necesaria.
3. **Jerarquía repetible.** Toda pantalla declara su arquetipo (resumen, catálogo, ficha,
   formulario, operación) y usa la misma anatomía de cabecera, sección y tarjeta. Prohibido:
   introducir un patrón nuevo por pantalla.
4. **Consistencia antes que variedad.** Un badge, un botón primario, una tabla, un campo, un
   vacío, un esqueleto. Los estados se distinguen por icono + texto + forma, no por color solo.
5. **Movimiento discreto.** Transiciones de 120–160 ms limitadas a color, borde y opacidad;
   ninguna animación sobre cifras ni sobre datos financieros; `prefers-reduced-motion` respetado
   (hoy solo existe una transición de botón, `style.css:1218-1222`).
6. **AA como suelo, no como extra.** Texto normal ≥ 4.5:1 y texto grande/componentes ≥ 3:1 en
   **los tres temas**, foco visible no oscurecido, objetivos ≥ 44 px en táctil, sin scroll
   horizontal a 390, reflow correcto a 200 % de zoom y navegación completa por teclado.

---

## 4. Propuesta por áreas

### 4.1 Pantallas y distribución

| Hoy | Propuesta | Criterio |
| --- | --- | --- |
| Cada página compone a mano con `.panel`, `.content` y grids locales; Inicio combina rejillas de 2 y 4 columnas con ocho tarjetas de métrica | Cinco arquetipos documentados y una retícula de 12 columnas con 24 px de separación; ancho de lectura ~1120 px y ancho de datos hasta 1450 px; bandas verticales con ritmo 4/8/12/16/24/32 | Toda pantalla nueva elige arquetipo; ninguna define su propio ancho |
| Inicio: primera fila con alturas muy desiguales y hueco posterior | Fila de resumen con altura homogénea por banda (`align-items: stretch`) y detalle secundario plegado | Sin huecos muertos entre secciones |
| «Cómo se calcula y qué falta» arriba y «Cobertura del modelo» al final | Un solo punto de entrada a la explicación; el bloque final queda como referencia técnica | Un CTA principal por página |

`[PROPUESTA]` La distribución de Inicio aprobada en SPEC24 (`spec24:437-513`) **no se cambia**
en la primera pasada: se ajusta altura, jerarquía y agrupación de metadatos, no el orden de
secciones ni las cifras.

### 4.2 Jerarquía y legibilidad

`[PROPUESTA]` Escala tipográfica única: `12 / 13 / 14 / 16 / 20 / 24 / 32` px, con cuerpo a 14 px
y metadato a 12 px. Tres tamaños de cifra: **L 32** (cifra principal de una pantalla de resumen),
**M 22** (tarjeta), **S 15** (cifra en tabla o fila). Siempre `font-variant-numeric: tabular-nums`,
siempre alineada a la derecha en tablas, y el símbolo `€` en un tamaño ligeramente menor que el
número.

Reglas de composición de tarjeta: título → cifra+estado → cobertura (una línea) → motivo (una o
dos líneas) → `details` «Fuente y cobertura» con IDs y contexto. `[PROPUESTA]` Un solo
formateador de importes en la capa de presentación, con `−` para negativos y dos decimales
garantizados; sustituir `eur()` y `formatDecimal` sin tocar valores ni contratos, verificando
las expectativas de los tests existentes. `[PENDIENTE]` Esa unificación puede cambiar cadenas
que algún AC compara; hay que inventariarlas antes de `DEV`.

### 4.3 Navegación y móvil

`[PROPUESTA]` Mantener **las 23 rutas actuales** y agruparlas sin cambiar `href`:

| Grupo | Rutas |
| --- | --- |
| Resumen | Inicio |
| Día a día | Movimientos, Comida, Revisión Comida, D′ · Partidas, Anticipos, Compartidos |
| Periodos | Ciclos, Plan del ciclo, Precierre, Flujo mensual, Cierre |
| Planificación | Presupuestos, Plan anual, Resumen anual, Nómina |
| Patrimonio | Saldos, Clasificación, Inversiones, Deudas, Vehículos, Referencias |
| Control | Pendientes y conciliación |

Cambios de forma, no de ruta: icono en **todos** los elementos (hoy solo en 12 de 23), indicador de
activo con barra lateral + peso + `aria-current` (no solo color), grupos plegables con estado
persistido en memoria, cabecera única con contexto de ciclo + preferencias (tema, sesión) en un
menú, y título de documento actualizado por ruta. En móvil: cabecera compacta con menú modal
accesible (foco atrapado, `Esc`, retorno de foco) y sin duplicar el selector de tema en dos
sitios.

`[PROPUESTA]` Ninguna decisión de navegación puede añadir módulos inexistentes: la regla de
`guidelines/ui.md:61-62` sigue vigente.

### 4.4 Tablas, formularios, tarjetas e indicadores

| Pieza | Propuesta | Aceptación visual |
| --- | --- | --- |
| Tabla | Primitiva única con roles de columna (`id`, texto, importe, estado, acciones), cabecera con `--table-head`, importes a la derecha, hover discreto, densidad única; los listados se convierten en tarjetas a 760 px y las tablas de datos anchos conservan una región desplazable accesible | Ninguna página sobrescribe el mapa de columnas; los listados no generan scroll horizontal a 390 |
| Tarjeta | Anatomía fija: encabezado (título + clase), cuerpo (cifra + badge), metadatos plegables, acción única | Máximo un enlace principal por tarjeta (ya exigido en `spec24:556-557`) |
| Badge / indicador | Un componente con tonos `ok / parcial / nd / info`, icono + texto, sin depender del color; `Tag` para atributos, no para estados de cobertura | Un solo estilo de badge en toda la app; el tono de éxito deja de ser el del enlace |
| Formulario | Primitiva `Field` (etiqueta, ayuda, error, obligatorio) sobre `aria-invalid`/`aria-describedby`; secciones numeradas; rejilla 2→1 columna; error sin salto de layout | Teclado completo, foco al primer error, contraste AA en ayuda y error |
| Vacío / carga / error | Primitivas `EmptyState`, `Skeleton`, `Notice` con el mismo tono en todas las páginas | Ningún estado se representa con un `div.empty` improvisado |

`[PENDIENTE]` La tabla de `Precierre` (`className="table"`, sin estilos) pertenece a la UI
provisional de E4.8; se arregla cuando se decida la UI de E4.9, no antes (ver §7).

### 4.5 Uso de los tres temas

`[PROPUESTA]` Reglas de paridad:

1. Todo componente consume tokens; nunca un color literal ni un `data-theme` en el componente
   (hoy se cumple: 0 hexadecimales en `style.css`).
2. Los tokens existentes se consumen; **no se retiran ni añaden tokens ni colores** en esta
   iniciativa. Los alias históricos se corrigen en `DEV-01` sin cambiar la paleta.
3. Cada estado (`ok`, `parcial`, `nd`, `warning`, `error`, `negativo`) se distingue con
   icono + texto + forma usando los tokens actuales; `--negative` puede aplicarse a importes
   negativos, sin separar ni sustituir colores de la identidad.
4. Matriz de evidencia obligatoria: 5 pantallas representativas (Inicio, catálogo, ficha,
   formulario y operación) × 3 temas × {1440, 390} y, además, estados vacío/carga/error/degradado.
5. `[CONFIRMADO]` El tema inicial sigue siendo `dark-s`; no se reabre en esta iniciativa.

`[PENDIENTE]` El contraste se comprueba hoy por pantalla en algunos E2E
(`inicio.spec.ts:177-227`, `flujo-mensual.spec.ts:183-221`), no de forma transversal: falta una
comprobación por token/tema que cubra todas las parejas texto-fondo.

### 4.6 Componentes reutilizables

`[PROPUESTA]` Un único punto de verdad en `apps/web/src/ui/` (sin dependencias nuevas, CSS
propio): `Button`, `Badge`, `Tag`, `Card`, `Metric`, `Amount`, `Table`, `Field`, `Notice`,
`EmptyState`, `Skeleton`, `PageHead`, `Toolbar`. Contrato por componente: anatomía, estados
(hover/focus/disabled/loading), tamaños y tokens que consume. `PageHead`, `Tag`, `Alert`,
`Switch` y `TableScroll` actuales se conservan como base y se amplían, no se reescriben.

`[PROPUESTA]` Regla de migración: cada bloque `DEV` sustituye un patrón por su primitiva en las
pantallas que toca y deja las demás intactas; no hay «big bang» de componentes.

### 4.7 Accesibilidad y responsive

`[CONFIRMADO]` Ya existe: enlace de salto, foco visible, foco al título al navegar, formularios
con error asociado, objetivos de 44 px en Inicio, sin desbordamiento horizontal verificado a 390
en Saldos e Inicio (`theme.spec.ts:116-128`, `inicio.spec.ts:528-546`).

`[PROPUESTA]` Completar: foco visible con contraste ≥ 3:1 sobre cada superficie de cada tema;
navegación por teclado del menú móvil y del selector de tema; `aria-current` mantenido;
regiones vivas solo donde cambia el contenido asíncrono; sin `div` clicables; tablas con
`caption`/`scope` (hoy existe en Saldos); `prefers-reduced-motion`; reflow a 320 px y zoom 200 %;
texto ampliado sin pérdida de contenido. `[PENDIENTE]` No hay auditoría WCAG completa ni prueba
con lector de pantalla; el objetivo AA es una propuesta de criterio, no una conformidad
declarada.

---

## 5. Alternativas

| | **A — Pulido conservador** | **B — Sistema de componentes y pantallas clave** | **C — Rediseño de navegación** |
| --- | --- | --- | --- |
| **Alcance** | Ajustes de contraste, tamaños mínimos, unificación de badges y corrección de la tabla de precierre | Primitivas visuales + shell + tablas/formularios + 4–6 pantallas clave, sin cambiar rutas ni contratos | Reorganización profunda de información: nuevos agrupados, buscador global, posibles rutas nuevas |
| **Bloques `DEV`** | 2–3 | 7 | 4–5, pero con alcance funcional |
| **Riesgo** | Bajo, pero deja la deuda estructural: 23 enlaces planos, componentes duplicados, tipografía sin escala | Medio y acotado: toca `style.css`, `main.tsx` y primitivas compartidas; exige coordinación con E4.10/E4.11 | Alto: puede alterar rutas y el mapa de drill-down aprobado en SPEC24/SPEC27; rompe E2E y reabre UX |
| **Dependencia de E4.9** | Baja | Media: hay que respetar precierre/cierre congelados | Alta |
| **Veredicto** | Insuficiente como iniciativa | **Recomendada** | Prematura |

`[CONFIRMADO 2026-11-05]` **Adoptada B** por el usuario: evolución progresiva de componentes y
pantallas, sin rediseñar la identidad visual ni cambiar rutas, cifras o contratos. A y C quedan
descartadas para esta iniciativa; C solo podría reconsiderarse después de B y con evidencia.

---

## 6. Bloques `DEV` propuestos

`[PROPUESTA]` Numeración local a `UI` (`UI · DEV-01`…); no continúa la secuencia de ningún `E4.x`
(`identifier-convention.md:36-40`). Ningún bloque está autorizado.

| Bloque | Objetivo | Entregables | Dependencias | Criterio de aceptación visual |
| --- | --- | --- | --- | --- |
| **`UI · DEV-01 — Fundamentos visuales`** | Fijar escala tipográfica, espaciado, radios, foco y tamaños mínimos | Tokens no cromáticos en `style.css: :root`; escala aplicada a shell, tipografía base y foco; retirada de `--space` sin uso o su consumo real | Ninguna; va primero | Capturas 1440/390 × 3 temas del shell sin regresión; ningún texto funcional < 12 px; un solo radio por familia de superficie |
| **`UI · DEV-02 — Cifras, estados e indicadores`** | Unificar importe, badge y tarjeta métrica | `Amount`, `Badge`, `Metric`, `EmptyState`, `Skeleton`; tono de éxito separado del acento; `--negative` aplicado; un formateador | `DEV-01` | Un único estilo de badge; `0,00 €`, `ND`, `No aplica` y `Sin datos` distinguibles por texto+icono; contraste ≥ 4.5 en los tres temas |
| **`UI · DEV-03 — Navegación y cabecera`** | Ordenar 23 rutas sin cambiarlas | Datos de navegación en módulo propio, grupos, iconos homogéneos, activo con barra+peso, preferencias en menú, título de documento por ruta, menú móvil accesible | `DEV-01`; coordinación con E4.10/E4.11 futuras | Las 23 rutas responden igual; activo perceptible sin color; teclado completo; sin desbordamiento a 390 |
| **`UI · DEV-04 — Tablas y listados`** | Una tabla, un comportamiento | Primitiva `Table` con roles de columna, importes a la derecha, cabecera y hover por token; conversión a tarjetas; retirada de mapas de columna por página | `DEV-01`, `DEV-02` | Misma información en tabla y tarjeta; listados sin scroll horizontal a 390 y datos anchos con región desplazable rotulada; ningún `className` de tabla sin estilos |
| **`UI · DEV-05 — Formularios y fichas`** | Formularios y detalle consistentes | `Field`, secciones, ayuda/error, rejilla 2→1, ficha con jerarquía de identificación/configuración/atributos/posición | `DEV-01`, `DEV-02` | Error sin salto de layout; foco al primer error; etiqueta y ayuda legibles; AA en ayuda y error en 3 temas |
| **`UI · DEV-06 — Pantallas clave`** | Llevar el sistema a Inicio y a 4–5 pantallas de referencia | Inicio, un catálogo, una ficha, un formulario y una pantalla de operación con la nueva jerarquía | `DEV-02`…`DEV-05`; frontera de §7 | Inicio conserva secciones, cifras y estados de SPEC24; una lectura principal por tarjeta; sin duplicar motivo/CTA; capturas antes/después |
| **`UI · DEV-07 — Temas y verificación AA`** | Cerrar paridad y evidencia | Matriz 5 pantallas × 3 temas × 2 anchos; contraste automatizado por tema; foco/zoom/reduced motion; actualización de `guidelines/ui.md` y catálogo de componentes | `DEV-01`…`DEV-06` | Todos los pares texto/fondo ≥ 4.5 (normal) y ≥ 3 (grande/componente); cero desbordamiento; evidencia adjunta como capturas, no como aprobación |

`[PROPUESTA]` Orden: `01 → 02 → (03 ∥ 04 ∥ 05) → 06 → 07`. Cada bloque es reversible por sí
mismo y ninguno incluye cambios de API, datos, cálculos ni estados.

---

## 7. Dependencias e interferencias con E4.6 y E4.9

### 7.1 Estado de las superficies

| Superficie | Estado | Qué puede hacer `UI` | Qué no puede hacer |
| --- | --- | --- | --- |
| `/inicio` (E4.6, `cfbedb0`) | Integrada; UX y wireframes aprobados en SPEC24; **la revisión visual de implementación conserva su gate** (`spec24:3-12,434-435`) | Jerarquía, densidad, tipografía, agrupación de metadatos, unificar badges y CTA | Cambiar orden de secciones, añadir/quitar cifras, alterar la taxonomía de estados, reescribir la semántica de cobertura |
| `/precierre` (E4.8) | Integrada; UI provisional y «visual aplazada al final» (`epic-board.md:259`) | Tokens compartidos y pulido que no altere su contrato | Rediseñar la pantalla o su tabla sin autorización de su spec |
| Cierre / foto (E4.9) | Integrada en `0176ffc` (#200), QA APTO CON RESERVAS; UI de su SPEC27 | Consumir patrones de operación irreversible, confirmación y bloqueo ya aprobados | Reabrir rutas, contratos o estados de E4.9 |
| `/deudas`, `/inversiones`, etc. (E1–E4.4) | Integradas, con UX aprobada por su spec | Pulido visual que no altere decisiones | Reabrir reglas o estados |
| E4.7 | Integrada en `0e89562` (#210) | Pulido visual dentro de su contrato | Recalcular o reordenar cifras |
| E4.10 | SPEC28 **ratificada**; **I1 integrado** `70fa7c0` (v26/C26); **I2 abierto** `5fa0a1e`, no fusionado; 24 AC `UNRUN` | Patrón visual futuro de reapertura, sin clases ni rutas | Anticipar pantallas, estados persistidos o contratos de E4.10 |
| E4.11 | SPEC29 **DRAFT**; P1-C/P4-A/P5-B aprobadas; P2/P3/P6/P7/P8 pendientes; sin DEV ni UI | Nada | Fijar pantallas antes de su SPEC |

### 7.2 Cómo evitar conflictos

`[CONFIRMADO]` `style.css` es un monolito de 4.784 líneas con secciones añadidas por entrega y
comentarios de ticket (`/* E3.2 base B — Compartidos */`, `/* E4.6 · Resumen de inicio */`). Es
el punto de colisión principal.

`[PROPUESTA]`

1. **Añadir, no reescribir.** Cada bloque `DEV` añade una sección comentada al final con prefijo
   propio (`.ui-…`) y no reordena, no reformatea ni toca selectores de otras entregas.
2. **Un escritor por archivo y ventana.** `style.css`, `main.tsx` y `themes.css` no se editan en
   paralelo por dos frentes; antes de abrir rama, rebase desde `main` y contraste del tablero.
3. **Tokens cromáticos como gate.** `themes.css` alimenta todas las pantallas y los E2E fijan
   valores RGB concretos (`theme.spec.ts:78-114`): cualquier cambio de paleta es un bloque
   propio, con matriz de evidencia y actualización consciente de tests.
4. **`main.tsx` con un único dueño por cambio.** `DEV-03` extrae las 23 rutas a un módulo de
   datos y deja el JSX estable; E4.9 ya está integrado y cualquier ruta futura de E4.10/E4.11
   exige coordinación previa.
5. **No crear clases genéricas nuevas.** `.metric` y `.table` ya demuestran el problema:
   `Precierre` reutiliza `.metric` de Compartidos y `.table` no existe.
6. **No tocar `ui.tsx` desde dos bloques.** Las primitivas se amplían en `DEV-02` y `DEV-05`;
   `DEV-04` y `DEV-06` solo consumen.
7. **Verificación.** `python3 scripts/verify` (o `--full`) más los E2E de tema e Inicio; las
   capturas son evidencia, no aprobación. No se debilita ningún check para que pase un rediseño.

`[PROPUESTA]` Secuencia: `UI · SPEC` ahora; `DEV-01`/`DEV-02` tras aprobarla; `DEV-03 → 04 →
05` (paralelismo solo con archivos disjuntos); `DEV-06` sobre las cinco pantallas de §5; `DEV-07`
al final. E4.10 I1 está integrado e I2 sigue en PR, así que no se anticipan sus pantallas; E4.11
sigue en DRAFT. `style.css` y `main.tsx` quedan bajo un único escritor UI por ventana.

---

## 8. Fuera de alcance

- Cálculos, redondeos, formateo de valores más allá de la presentación, reglas financieras,
  contratos de API/DTO, taxonomías de estado y cobertura.
- Datos reales, fixtures nuevas, migraciones, esquema, copias o restauración.
- Nuevas entregas del roadmap, quinta épica, renumeración o modificación de las 30 aprobadas.
- Rediseño de identidad, cambio de marca o sustitución por una librería de UI.
- Cambios de rutas, permisos, sesión, autenticación o seguridad.
- Cierre, reapertura, fotos, precierre y cualquier pantalla cuya spec no esté aprobada.
- Despliegue, VPS, CI nuevo o cambios de visibilidad.

---

## 9. Siguiente paso

`[CONFIRMADO 2026-11-05]` Alternativa B adoptada; `UI · SPEC` actualizada en
[`specs/ui-specification.md`](../ui-specification.md), con wireframes 1440/390 en los tres temas
y el plan `UI · DEV-01…07`.

`[PROPUESTA]` **Decisiones para aprobación formal:** cinco pantallas de `DEV-06` (Inicio,
Movimientos, Saldos ficha, Saldos alta/edición, Cierre); secuencia `03 → 04 → 05` con
paralelismo solo si hay archivos disjuntos; matriz 30+15 capturas y criterios AA/foco/teclado/
zoom; actualización documental de `guidelines/ui.md` antes de `DEV-01`; aprobación separada de
`UI · DEV-01`.

`[PENDIENTE]` **No hay `DEV` hasta autorización.** Este documento no crea rama de código, no
modifica `style.css`, `themes.css` ni `main.tsx`, y no toca el tablero.

---

## Para revisión

- **Cerrado:** identificador `UI`, alternativa B y los tres temas de #198. No se reabren.
- **Inicio:** ¿se acepta pulir jerarquía/densidad sin reabrir SPEC24 (mismas secciones, cifras y
  estados)?
- **Navegación:** ¿se valida agrupar los 23 enlaces en grupos sin cambiar rutas ni añadir
  módulos?
- **Pantallas `DEV-06`:** recomendación de cinco (Inicio, Movimientos, Saldos ficha, Saldos
  alta/edición, Cierre); alternativa mínima de cuatro sin ficha.
- **Evidencia:** recomendación 30 capturas base + 15 de estados, AA/foco/teclado/zoom.
- **Secuencia:** `01 → 02 → 03 → 04 → 05 → 06 → 07`; `03 ∥ 04` solo con archivos disjuntos.
- **Guía:** actualización quirúrgica de `guidelines/ui.md` antes de `DEV-01`, sin cambiar
  colores.

## Decisiones

**Cerradas (2026-11-05):** identificador `UI`; alternativa B; tres temas y paletas de #198;
selector existente. No se reabren.

**Pendientes:** aprobación formal de la SPEC; cinco pantallas de `DEV-06`; secuencia/paralelismo;
matriz de evidencia; actualización de `guidelines/ui.md`; autorización separada de `UI · DEV-01`.
