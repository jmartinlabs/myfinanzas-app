# Aurora · análisis y paquete cerrado de integración

**Issue:** [#489](https://github.com/jmartinlabs/myfinanzas-app/issues/489) · **Fase:** Analysis (autorizada)
**Autor:** OpenCode · **Fecha:** 2026-11-16 · **Base analizada:** `origin/test` `0218de4`
**Estado:** análisis y paquete de desarrollo. **No implementado.** No hay cambios de producto, tokens,
UI, API, SQLite, datos, merge ni despliegue. Ninguna cifra financiera se ha creado ni modificado.

---

## 1. Decisión vigente y fuentes

El usuario decidió (2026-11-16) crear una **sexta apariencia independiente** llamada **Aurora**
(`aurora`, `colorScheme: dark`) a partir del prototipo oscuro premium de fase C, conservando
`dark-s` (Oscuro), `graphite-lime` (Grafito), `light-s`, `hybrid-s` y `casa` sin cambios. Aurora
no sustituye ni recolorea Grafito, y no reabre el trabajo Light/Hybrid de #402.

Fuentes verificadas en la rama `test`:

| Fuente | Uso |
| --- | --- |
| `specs/investigations/graphite-lime-design-2026-11-10/README.md` | archivo documental, estado y límites |
| `phase-c/tokens.css` (bloque `dark-s`) | 78 tokens del prototipo; origen real de Aurora |
| `phase-c/base.css`, `inicio.css`, `movimientos.css`, `estados.css`, `icons.css`, `app.js` | lenguaje visual y composiciones del prototipo |
| `phase-c/final/shots/dark-inicio.jpg`, `phase-c/shots/movimientos-dark-s-1440-fold.jpg` | capturas de referencia |
| `specs/investigations/ui-light-hybrid-final-2026-11-09/` y `specs/ui-specification.md` §2.5 | confirman que Dark quedó intacto como referencia |
| `apps/web/public/themes.css`, `src/themes.ts`, `public/theme-boot.js`, `src/style.css` | sistema de temas productivo |
| `src/graphite.css`, `src/inicio-shared.css`, `src/light-hybrid.css`, `src/casa.css`, `src/Inicio.tsx`, `src/ui.tsx` | composición compartida y capas visuales existentes |

### 1.1 El prototipo reclamado frente al Oscuro actual

La comprobación que pedía la Issue da un resultado concluyente: **el bloque `dark-s` del prototipo
de fase C no es el `dark-s` productivo**. Son dos identidades distintas:

| Rasgo | Prototipo fase C (`tokens.css`, 78 tokens) | Producción `dark-s` (66 tokens) |
| --- | --- | --- |
| Fondo | azul-negro `#091115` con `--bg-image` de reflejos radiales turquesa | gris neutro plano `#141414` |
| Acento | turquesa `#2be4de` con halos `rgba(43,228,222,…)` | verde-azulado `#57b2ba` sin halos |
| Superficies | `#111c21` / `#17252b`, tarjeta en degradado | `#202020` / `#262626`, planas |
| Navegación activa | degradado `#086e70 → #12464c` con borde y glow | sólido `#1e6f7a` |
| Luz ambiental | `--hero-bg`, `--hero-glow`, `--ambient-opacity`, `--wave-opacity`, `--sidebar-glow` | no existe |
| Sidebar | `#0b1115`, 264 px en el prototipo | `#101010`, 236 px en producción |

El prototipo es, por tanto, el origen correcto de Aurora, y deja de ser ambiguo que «Oscuro» en la
app actual no es el «Dark Premium» de las capturas.

---

## 2. Auditoría de paridad: qué se puede trasladar

### 2.1 Los tokens no encajan uno a uno

El prototipo y la producción no comparten nombres: 44 tokens del prototipo no existen en la
producción (`--bg-image`, `--card-*`, `--hero-*`, `--wave-opacity`, `--text-2`, `--muted-2`, …) y
32 tokens productivos no existen en el prototipo (`--action*`, `--strong-surface`, `--chart-*`,
`--chip-*`, `--header-bg`, …).

**Consecuencia:** Aurora no se obtiene pegando el bloque del prototipo. Se traduce a los **66 tokens
semánticos vigentes** y se añade una capa propia, igual que hizo Grafito. La traducción ya está
hecha y medida (§4).

### 2.2 El CSS del prototipo no es trasplantable

El prototipo usa sus propias clases de composición (`.b-*`, `.c-*`, `.detail-*`, `.i-*`). Medido
contra el CSS productivo:

| Archivo del prototipo | Clases | Presentes en producción |
| --- | --- | --- |
| `inicio.css` | 124 | 4 |
| `movimientos.css` | 80 | 7 |
| `estados.css` | 19 | 5 |
| `icons.css` | 52 | 0 |
| `base.css` | 129 | 28 (coincidencias genéricas de utilidad) |

Además, `graphite.css` (6.864 líneas, 3.240 declaraciones, ~768 de layout) demuestra el riesgo
contrario: **una capa de tema no debe reimplementar la composición**. La composición funcional ya es
única y compartida (`inicio-shared.css` + primitivas de `ui.tsx` + clases `graphite-*`/`movement-*`).

**Consecuencia:** Aurora se implementa como **capa fina de identidad** (tokens + superficies,
profundidad, glow, reflejos y bordes) con **cero reglas de layout**. Lo que se traslada del
prototipo es el lenguaje visual, no su HTML/CSS.

### 2.3 Alcance visual por superficie

| Superficie | Qué adopta Aurora | Notas |
| --- | --- | --- |
| Shell | sidebar azul-negro, activo en degradado turquesa con glow, halo inferior, cabecera translúcida, pie | sin cambiar 236 px, rutas ni orden |
| Inicio | hero de control con luz radial, banda KPI con reflejo, tarjeta de ciclo, rail (Atención/Objetivo), posición y cobertura | mesma composición y cifras |
| Movimientos | carril de filtros, tabla, tarjetas móviles, selección, detalle como página, formularios | iconos por `data-tipo` ya existen |
| Saldos / Inversiones / Deudas / Vehículos / Referencias | catálogo, ficha y formulario | imágenes de vehículos sin glow detrás |
| Anticipos, Compartidos, Comida, Revisión Comida, Dprima | tablas, pares, auditoría | estados y motivos intactos |
| Ciclos, Precierre, Cierre, Fotos, Resumen anual | tablas, fotos, estados de bloqueo | sin tocar contratos de cierre |
| Flujo mensual, Nómina, Plan anual, Planes de ciclo, Presupuestos, Clasificación | paneles, tablas, formularios | — |
| Estados | vacío, carga, error, aviso, `ND`, `No aplica`, `Sin datos`, badges, chips, paginación, tabs | misma semántica y misma distinción de ausencias |
| Autenticación | alta, MFA, errores | solo cromático |

---

## 3. Contrato de identidad Aurora

- **ID:** `aurora` · **Etiqueta visible:** `Aurora` · **`colorScheme`:** `dark`
- **Posición en el catálogo:** **última**, tras `casa`. `dark-s` sigue siendo `DEFAULT_THEME`.
- **Persistencia:** `mf-theme` (sin segunda clave, sin `data-experience`).
- **Boot:** `aurora` debe entrar en la lista `known` de `theme-boot.js` en el mismo incremento; si
  no, una preferencia guardada cae a `dark-s` y parpadea.
- **Regla de alcance:** todo selector nuevo bajo `html[data-theme="aurora"]`; sin `!important`; sin
  reglas de layout (`display`, `grid-*`, `flex-*`, `gap`, `padding`, `margin`, `position`, `width`,
  `height`, `order`); sin tocar otros temas.

### 3.1 Tokens (los 66 del contrato)

Valores propuestos, ya contrastados en §4.2. Se marcan las **desviaciones deliberadas** del prototipo.

| Grupo | Valores |
| --- | --- |
| Fondo y superficies | `--bg:#091115` · `--surface:#111c21` · `--surface-2:#17252b` · `--surface-3:#0b1418` |
| Sidebar | `--sidebar:#0b1115` · `--sidebar-text:#f7f5f1` · `--sidebar-muted:#9aa4a6` · `--sidebar-border:#23343a` · `--sidebar-hover:#16262c` · `--sidebar-active-bg:#0d6a6d` · `--sidebar-active-text:#ffffff` · `--sidebar-focus:#2be4de` |
| Texto | `--text:#f7f5f1` · `--muted:#9aa4a6` · `--brand-accent:#2be4de` |
| Bordes | `--border:#304148` · `--control-border:#527f88` *(prototipo `#47727a`: 2,96:1 sobre `--surface-2`, no AA)* |
| Acción | `--action:#e4572e` · `--on-action:#141414` *(prototipo `#121a1c` = 4,79:1; se prefiere el valor productivo, 5,00:1)* · `--action-hover:#f06a45` · `--action-active:#c94520` · `--action-soft:#2a1e19` · `--action-soft-border:#5c382c` |
| Acento | `--accent:#2be4de` · `--on-accent:#06181a` · `--accent-soft:#102b30` · `--accent-border:#1d545c` · `--focus:#2be4de` |
| Estados | `--positive:#6fe0b0` · `--negative:#ff9a8c` · `--warning:#f2c14e` · `--error:#ff7b72` · `--ok:#6fe0b0` + sus `-soft`/`-border` sobre base azul-negro |
| Tablas e interacción | `--row-hover:#172a31` · `--selected:#16313a` · `--table-head:#0e1a20` · `--input-bg:#0b1418` · `--disabled-bg:#16242a` · `--disabled-text:#7f8b8e` |
| Sombras y bloques fuertes | `--shadow-1:rgb(0 0 0/.34)` · `--shadow-2:rgb(0 0 0/.46)` · `--strong-surface:#0b1418` · `--on-strong:#f7f5f1` · `--muted-on-strong:#9aa4a6` · `--strong-border:#2b3d44` |
| Gráficas | `--chart-1:#2be4de` · `--chart-2:#73d7d4` · `--chart-3:#9aa4a6` · `--chart-4:#f7f5f1` · `--chart-strong:#f7f5f1` · `--chart-accent:#e4572e` |
| Chrome | `--header-bg:#0b171c` · `--footer-bg:#080e11` · `--table-head:#0e1a20` · `--chip-bg:#102028` · `--chip-border:#2a424a` · `--chip-text:#f7f5f1` |
| `--muted-2` (no es token productivo) | se cubre con `--muted` y, si hace falta un nivel terciario auxiliar, `#87938f` (5,45:1 sobre `--surface`); nunca el `#7f8b8e` del prototipo (4,24:1 sobre el punto más luminoso del degradado) |

### 3.2 Tokens de capa (7, prefijo `--aurora-`)

Misma convención que `--graphite-*`: viven en `aurora.css`, no en `themes.css`.

`--aurora-bg-image` (tres degradados de fondo) · `--aurora-card-bg` · `--aurora-card-border` ·
`--aurora-card-shadow` · `--aurora-topbar-bg` · `--aurora-hero-bg` · `--aurora-glow`.

### 3.3 Referencias sólidas para medir AA

El contrato AA vigente **falla de forma explícita** ante un fondo con imagen o degradado
(`ui-dev07-audit.ts` marca `background-image` como no resuelto). Aurora es, por definición,
degradados. Se propone el mismo criterio que usó el prototipo (referencias sólidas declaradas) más
una cota superior calculada del degradado:

| Referencia | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#091115` | fondo base |
| Punto más luminoso del fondo | `#0f2b31` | peor caso del radial turquesa sobre `--bg` |
| `--aurora-bg-solid` (nuevo, solo QA) | `#0b171c` | fondo equivalente sin degradado |
| Punto más luminoso de la banda KPI | `#133138` | peor caso del radial sobre la banda |
| Hero sólido | `#14252a` | ya declarado por el prototipo |
| Activo de navegación sólido | `#086e70` | ya declarado por el prototipo |
| `--input-bg`, `--table-head`, `--chip-bg` | `#0b1418`, `#0e1a20`, `#102028` | controles, cabecera de tabla, chips |

### 3.4 Decoración (ondas, ambiente, destellos)

El prototipo usa SVG en el DOM (`.sidebar-wave`, `.c-top-wave`, `.ambient`) y `filter: blur()`.
**Aurora no añadirá nodos SVG ni cambiará el DOM.** La luz ambiental se consigue con
`background-image` en `.sidebar`, `.global-header` y las superficies, más, como máximo, dos
pseudo-elementos decorativos (`::before`/`::after`) ya existentes en la composición o sobre
`.workspace`/`.graphite-control`:

- `pointer-events: none`, sin contenido textual, sin foco, sin captura de eventos;
- **sin animación en la primera versión** (no hay `@keyframes` ni transición de la luz); así
  `prefers-reduced-motion` no cambia nada funcional;
- brillo limitado a las superficies descritas; **nunca detrás de fotos, importes en tablas densas
  ni texto pequeño** (se mide en §4.2).

Si el usuario prefiere el máximo conservador, se puede entregar Aurora **sin** pseudo-elementos:
la identidad se sostiene con degradados de superficie. Es una decisión abierta (§9, D3).

---

## 4. Evidencia medida (previsualización, no producto)

Para que el usuario pueda **ver y comparar antes de autorizar el desarrollo**, se ha montado una
previsualización que aplica candidatos de tokens y capa sobre la app real (`origin/test`) con la
base DEMO ficticia, **sin modificar el repositorio**: `preview/aurora-preview.css` se inyecta en el
navegador y se fuerza `data-theme="aurora"` en el DOM. Es una maqueta de revisión, no el tema.

- Tablero comparativo: `shots/00-comparativa.jpg`
- Capturas Aurora: `shots/aurora-{inicio,movimientos,saldos,inversiones,deudas,referencias}-{1440,820,390}.jpg`
- Reproducción: `preview/README.md` (`capture.mjs`, `measure.mjs`, `contrast.mjs`, `board.mjs`)

### 4.1 Resultados

| Comprobación | Resultado |
| --- | --- |
| Overflow horizontal (18 combinaciones: 6 pantallas × 1440/820/390) | **0 px en todas** |
| Fuga a otros temas (estilos computados de `dark-s` antes/después de inyectar la capa) | **sin cambios** |
| Paridad de tokens con el contrato | **66/66**, 0 extra, 0 ausentes, +7 de capa |
| Degradados activos en Inicio | 14 superficies; 2 en Movimientos; ≥1 por catálogo |
| Consola / errores de página | sin errores en las capturas |

### 4.2 Contraste (calculado sobre peor caso del degradado)

Pares del contrato AA, contra superficie sólida y contra el punto más luminoso del degradado:

| Par | Ratio | Mínimo |
| --- | --- | --- |
| `--text` / `--surface` | 15,91 | 4,5 |
| `--text` / `--bg` | 17,49 | 4,5 |
| `--text` / punto más luminoso del fondo | 13,68 | 4,5 |
| `--muted` / `--surface` | 6,79 | 4,5 |
| `--muted` / `--surface-2` | 6,16 | 4,5 |
| `--muted` / punto más luminoso del fondo | 5,84 | 4,5 |
| `--muted` / banda KPI iluminada | 5,40 | 4,5 |
| `--sidebar-text` / `--sidebar` | 17,45 | 4,5 |
| `--sidebar-muted` / `--sidebar` | 7,45 | 4,5 |
| `--sidebar-active-text` / `--sidebar-active-bg` | 6,36 | 4,5 |
| blanco / activo sólido `#086e70` | 6,04 | 4,5 |
| `--on-action` / `--action` | 5,00 | 4,5 |
| `--on-accent` / `--accent` | 11,49 | 4,5 |
| `--positive` / `--positive-soft` | 9,90 | 4,5 |
| `--warning` / `--warning-soft` | 9,18 | 4,5 |
| `--accent` / `--accent-soft` | 9,40 | 4,5 |
| `--negative` / `--surface` | 8,46 | 4,5 |
| `--error` / `--surface` | 6,87 | 4,5 |
| `--control-border` / `--surface` | 3,92 | 3 |
| `--control-border` / `--surface-2` | 3,56 | 3 |
| `--control-border` / `--input-bg` | 4,21 | 3 |
| `--focus` / `--surface` | 10,94 | 3 |
| `--sidebar-focus` / `--sidebar` | 11,99 | 3 |
| `--text` / fila hover y selección | 13,66 / 12,57 | 4,5 |
| `--muted` / fila hover y selección | 5,83 / 5,37 | 4,5 |
| `--chip-text` / `--chip-bg` | 15,32 | 4,5 |
| `--disabled-text` / `--disabled-bg` | 4,54 | 4,5 |

**Cero fallos** en los 20 pares del contrato y en los 8 pares adicionales de superficie iluminada.
El único cambio obligado por AA es `--control-border` (`#47727a → #527f88`); el resto son valores del
prototipo o valores productivos ya aprobados.

**Límite declarado:** esto es cálculo sobre referencias sólidas declaradas, no una auditoría WCAG
sobre píxeles del degradado renderizado. La QA de DEV debe repetir la medición sobre el CSS real y
sobre las superficies iluminadas, y la aceptación final es visual humana (§6).

---

## 5. Paquete de desarrollo propuesto (una sola autorización)

**Alcance autorizable de una vez:** «Aurora integrada como sexta apariencia completa en toda la
aplicación, sobre la composición compartida, sin tocar las otras cinco». Internamente se ejecuta en
cuatro hitos verificables y **una única PR** hacia `test`; no hay seis autorizaciones ni seis PRs.

### 5.1 Archivos y ownership

| Archivo | Cambio | Riesgo |
| --- | --- | --- |
| `apps/web/public/themes.css` | bloque `:root[data-theme="aurora"]` con los 66 tokens | bajo; aditivo |
| `apps/web/src/themes.ts` | entrada `{ id:"aurora", label:"Aurora", colorScheme:"dark" }` al final | bajo |
| `apps/web/public/theme-boot.js` | `"aurora"` en `known` | bajo; crítico para el arranque |
| `apps/web/src/aurora.css` | **nuevo**: capa de identidad, todo scoped, sin layout | medio; es el núcleo visual |
| `apps/web/src/style.css` | una línea `@import "./aurora.css";` | bajo |
| `apps/web/test/themes.test.ts` | catálogo de 6, paridad de tokens, AA de Aurora | bajo |
| `apps/web/test/aurora-visual.test.ts` | **nuevo**: aislamiento, sin layout, sin `!important`, import | bajo |
| `apps/web/test/ui-dev07-tokens.test.ts` | añadir `aurora` a `THEMES` | bajo |
| `tests/e2e/theme-aurora.spec.ts` | **nuevo**: selección, persistencia, boot, fallback, 1440/820/390, sin overflow, sin errores, reduced motion | bajo |
| `tests/e2e/theme-graphite.spec.ts`, `tests/e2e/theme-casa.spec.ts` | contar 6 opciones; los índices 0–4 no cambian | bajo, esperado |
| `specs/ui-specification.md` §2.5, `specs/guidelines/ui.md` | enmienda documental de la sexta apariencia | documental |
| `specs/investigations/aurora-2026-11-16/` | este análisis, previsualización y evidencia; se conserva como archivo | documental |

No se tocan: `dark-s`, `graphite-lime`, `light-s`, `hybrid-s`, `casa`, `graphite.css`,
`light-hybrid.css`, `casa.css`, `inicio-shared.css`, componentes TSX, rutas, navegación, API,
SQLite, contratos ni datos.

### 5.2 Hitos internos

| Hito | Contenido | Criterio de salida |
| --- | --- | --- |
| **A1 · Sistema** | tokens, catálogo, boot, import y pruebas unitarias de catálogo/paridad/AA | selector con 6 opciones; `aurora` persiste y recarga sin parpadeo; valor desconocido cae a `dark-s`; 5 temas anteriores intactos |
| **A2 · Shell y superficies** | sidebar, cabecera, pie, paneles, tablas, controles, badges, chips, paginación, estados, formularios | identidad perceptible en todas las rutas; mismos textos, cifras y estados; tabla legible y sin glow bajo texto denso |
| **A3 · Inicio y Movimientos** | hero de control, banda KPI, ciclo y rail; filtros, tabla, tarjetas, selección, detalle y formularios de movimiento | sin cambios de DOM ni de datos; `data-inicio-section` y `data-tipo` intactos |
| **A4 · Responsive, evidencia y cierre** | 820/390, foco, teclado, táctil 44 px, `prefers-reduced-motion`, capturas y tablero comparativo | matrices y capturas adjuntas; sin overflow ni fugas; QA independiente |

Cada hito deja commit propio en la misma rama. Si A2 revelara que una superficie exige **layout**,
se detiene esa parte y se presenta la decisión: la autorización no cubre composición.

### 5.3 Pruebas exigidas

1. **Unitarias** (`bun test apps/web/test`): catálogo de 6 en orden, `isThemeId("aurora")`,
   `DEFAULT_THEME`/`mf-theme` sin cambios, 66 tokens por tema, AA de Aurora, boot con `aurora`,
   capa aislada y sin layout.
2. **E2E de tema** (`tests/e2e/theme-aurora.spec.ts`): selección y persistencia, arranque previo a
   React con `mf-theme=aurora`, fallback de valor desconocido, 1440/820/390 sin overflow, sin
   errores de consola, degradados presentes en shell e Inicio, fondo sólido equivalente declarado.
3. **Regresión de las cinco apariencias**: `theme.spec.ts`, `theme-graphite.spec.ts`,
   `theme-casa.spec.ts`, `light-hybrid-l2/l3/l4.spec.ts`, `graphite-g1` y `graphite-g5*`.
4. **Matriz visual propia de Aurora** (6 superficies × 1440/820/390 × estados) con capturas; no se
   añade Aurora a `DEV07_THEMES` (ver §7 R1).
5. **Verificación canónica** `python3.12 scripts/verify --full` (o el perfil aplicable) en el
   candidato, y E2E completo en Linux para el cierre.

### 5.4 QA y aceptación

- **QA independiente del autor** sobre el diff completo, con la matriz de capturas y la medición de
  contraste sobre el CSS real.
- **Aceptación visual humana obligatoria** de la comparativa (prototipo histórico · Oscuro ·
  Grafito · Aurora) en 1440/820/390. CI no declara equivalencia visual.
- Merge y promoción `test → main` siguen siendo aprobaciones separadas del usuario.

### 5.5 Estimación

`themes.css` +66 líneas · `themes.ts` +1 · `theme-boot.js` +1 · `aurora.css` nuevo, objetivo
**≤ 450 declaraciones, 0 de layout** · pruebas +~250 líneas · E2E nuevo +~200 líneas ·
documentación y evidencia. Es comparable a Casa 1A + L2/L3, no a la integración completa de Grafito.

---

## 6. Comparativa visual para la decisión

El tablero `shots/00-comparativa.jpg` contiene, en columnas: **prototipo fase C**, **Oscuro actual**,
**Graphite Lime** y **Aurora propuesta**, en Inicio y Movimientos; debajo, los catálogos de
patrimonio y el responsive de Aurora. La previsualización demuestra que el lenguaje visual del
prototipo (azul-negro, reflejos turquesa, profundidad y luz) llega a la app **sin cambiar la
composición**: la estructura de Aurora es idéntica a la de Oscuro/Grafito, y lo único que cambia es
la presentación.

Discrepancias conocidas frente a las capturas históricas, todas deliberadas:

1. **Composición**: el prototipo usaba su propio layout (hero de tres celdas con sparkline, panel
   lateral de detalle en Movimientos). La app mantiene la composición compartida y el detalle como
   página (D3=A de #402). Aurora **no reintroduce** el panel lateral ni la sparkline.
2. **Ondas SVG**: se sustituyen por luz ambiental CSS (§3.4); si se aprueba D3, sin decoración.
3. **Espaciado y tipografía**: los fija la composición compartida; el prototipo era más ancho
   (sidebar 264 px) y con escala propia (hero 50 px).
4. **AA**: `--control-border` y `--on-action` se separan del prototipo para cumplir contraste.
5. **Datos**: el prototipo usaba un fixture sintético distinto; la app muestra la base DEMO ficticia.

---

## 7. Riesgos y mitigaciones

| # | Riesgo | Impacto | Mitigación |
| --- | --- | --- | --- |
| R1 | El contrato AA vigente **falla explícitamente** ante fondos con degradado | la matriz DEV-07 no puede medir Aurora | Aurora **no** entra en `DEV07_THEMES` (igual que Grafito tiene su QA); QA propia con referencias sólidas declaradas + cota del peor caso, documentada y revisada a mano |
| R2 | Contraste real sobre luz ambiental | texto pequeño ilegible | el glow se limita a superficies amplias; nunca detrás de tablas densas ni texto < 14 px; se mide sobre el peor caso (§4.2) |
| R3 | Rendimiento: fondo fijo, `backdrop-filter` en cabecera fija, 14 degradados en Inicio | repintado en móvil | sin animación; `background-attachment: fixed` solo ≥ 820 px; `backdrop-filter` con color opaco de respaldo; medición de pintura en QA |
| R4 | Fuga de estilos a otros temas | regresión de 5 apariencias | todo scoped; prueba estática de selectores; comparación de estilos computados de `dark-s` antes/después (ya verificada: sin cambios) |
| R5 | Olvidar `theme-boot.js` | parpadeo y caída a Oscuro al recargar | A1 incluye boot + E2E de arranque |
| R6 | Selector con 6 opciones rompe aserciones de 5 | CI rojo | actualización prevista y explícita en `theme-graphite.spec.ts` y `theme-casa.spec.ts`; índices 0–4 invariantes |
| R7 | Duplicar la composición, como el volumen de `graphite.css` | deuda y divergencia | `aurora.css` sin layout, límite ≤ 450 declaraciones, prueba que prohíbe propiedades de layout y `!important` |
| R8 | Fotos de vehículos/recibos | glow detrás de imágenes | fuera del alcance del glow; fondo de tarjeta plano |
| R9 | `backdrop-filter` no soportado | cabecera ilegible | color de respaldo opaco (`--header-bg`) siempre declarado |
| R10 | Semántica financiera | error grave | cero cambios de DOM, datos, signos, importes, motivos, estados ni contratos; mismas pruebas funcionales |
| R11 | Aceptación visual por CI | falsa equivalencia | revisión humana del tablero, declarada como gate |
| R12 | Ampliación del catálogo sin enmienda | conflicto normativo | enmienda documental en §2.5 y `guidelines/ui.md` dentro del paquete |

---

## 8. Fuera de alcance

Eliminar o reordenar apariencias, cambiar el tema por defecto, sustituir `dark-s`, reabrir Grafito,
Casa o Light/Hybrid, cambiar layout, rutas, navegación, datos, API, SQLite, contratos, importes,
signos, estados, la sparkline del prototipo, el panel lateral de detalle, despliegues, merges o
promoción `test → main`.

---

## 9. Decisiones que se solicitan

| # | Decisión | Recomendación |
| --- | --- | --- |
| **D1** | Autorizar el paquete completo de §5 como **una sola autorización DEV** (una rama, una PR, cuatro hitos internos, QA independiente) | **Sí** |
| **D2** | Etiqueta visible `Aurora` y posición **última** del catálogo | **Sí** |
| **D3** | ¿Incluir la luz ambiental con pseudo-elementos CSS decorativos o entregar Aurora solo con degradados de superficie? | incluirla, sin animación; ambas opciones están medidas |
| **D4** | Asumir las desviaciones de AA de §3.1 (`--control-border`, `--on-action`) y ≈`--muted-2` | **Sí** |
| **D5** | Aceptar que la aceptación visual requiere revisión humana del tablero antes de cerrar | **Sí** |

Con D1–D5 aprobadas se ejecuta el paquete y se entrega la PR con capturas comparativas; el merge
seguirá pidiéndose por separado.

---

## 10. Reproducción de la evidencia

```bash
# entorno aislado sobre la rama test (sin tocar el checkout principal)
git worktree add /tmp/aurora-wt origin/test
cd /tmp/aurora-wt && bun install --frozen-lockfile
DEMO_PORT=5174 bun run dev:demo          # base ficticia; no usa datos reales

# previsualización (inyecta la capa candidata, no modifica el repo)
THEMES=aurora AURORA_CSS=$PWD/specs/investigations/aurora-2026-11-16/preview/aurora-preview.css \
  node specs/investigations/aurora-2026-11-16/preview/capture.mjs
node specs/investigations/aurora-2026-11-16/preview/measure.mjs    # overflow y fugas
node specs/investigations/aurora-2026-11-16/preview/contrast.mjs   # contraste
node specs/investigations/aurora-2026-11-16/preview/board.mjs      # tablero comparativo
```

Las capturas se tomaron con Chromium de Playwright, 1440×1000, 820×1000 y 390×844, `locale es-ES`,
contra la base DEMO (`Datos ficticios`), sin autenticación real ni datos personales.
