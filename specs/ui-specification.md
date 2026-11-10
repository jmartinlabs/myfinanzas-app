# UI — Evolución visual de MyFinanzas: Specification (UI · SPEC)

**Estado:** `[APROBADA]` — **ratificada formalmente por el usuario el 2026-11-06.** Autoriza
`UI · SPEC`, el merge condicionado de #205 y `UI · DEV-01` por separado; **no** autoriza
`DEV-02…07` ni otros merges. No cambia código, componentes, CSS, temas, API, cálculos
financieros ni datos reales. La enmienda UI-G1 es documental; la implementación de 1A se
realizó en una PR separada y se integró en `test` con #356 (`bff714e`).

> **Enmienda UI-G1 · Graphite Lime (2026-11-10).** Ratificada por el usuario para desbloquear
> el Incremento 1A. Añade `graphite-lime` («Grafito») como cuarto tema, con `colorScheme: dark`,
> y autoriza en alcance los cambios aditivos en `themes.css`, `themes.ts`, `theme-boot.js` y sus
> pruebas. Dark, Light y Hybrid conservan identidad, tokens y comportamiento; `dark-s` sigue
> siendo el tema inicial y `mf-theme` la clave de persistencia. 1A incorpora el tema al sistema,
> **no** representa la integración visual completa del diseño premium. 1B
> (`prefers-reduced-motion`) queda fuera de alcance. No autoriza otros candidatos, cambios de
> pantallas/componentes/formularios, merge ni despliegue. Esta enmienda sustituye únicamente las
> cláusulas de «tres temas cerrados / no cuarto tema» que se indican; el resto de la
> especificación y su historial se conserva. La implementación de 1A se ejecutó en una rama y PR
> separados (#356, `bff714e`), con QA independiente.

- **Base:** `main` **`043869f`** (2026-11-05; I1 de E4.10 integrado y recarga de agentes #234).
- **Análisis:** [ui-evolution-2026-11-04](investigations/ui-evolution-2026-11-04.md);
  **wireframes:** [ui-evolution-wireframes.html](investigations/ui-evolution-wireframes.html).
- **Identificador:** `UI` (transversal; no crea épica ni altera las 30 entregas).
- **Alternativa adoptada:** **B** — evolución progresiva de componentes y pantallas, sin
  rediseñar la identidad visual (decisión del usuario, 2026-11-05).
- **Temas:** **Dark (`dark-s`), Light (`light-s`) y Hybrid (`hybrid-s`) se conservan** con su
  identidad, tokens y comportamiento aprobados en `0b8aade` (#198). **Graphite Lime
  (`graphite-lime`, «Grafito») queda aprobado como cuarto tema** por la enmienda UI-G1 del
  2026-11-10. El catálogo admite ampliaciones solo por decisión expresa y enmienda propia; no se
  reabren los tres temas existentes.
- **Alcance:** tipografía, legibilidad, espaciados, jerarquía, navegación, tablas, formularios
  y adaptación móvil sobre los temas vigentes. **1A** añade Graphite de forma aditiva al sistema
  actual, sin integrar todavía la composición visual premium.
- **Fuera de alcance:** modificar los tres temas existentes, rediseñar la identidad, aprobar o
  implementar otros candidatos, 1B (`prefers-reduced-motion`), rutas, permisos, contratos de
  API/DTO, cifras, estados financieros, cálculos, datos reales, despliegue y `UI · DEV` sin
  autorización.

### 0. Estado real verificado (2026-11-05; actualizado 2026-11-10 para Graphite)

| Superficie | Estado comprobado |
| --- | --- |
| Navegación | **23 enlaces** de navegación en un único grupo «MI ESPACIO» (`main.tsx:179-493`); `/saldos/nuevo` es subvista y `/` es alias de Saldos. No se añaden rutas. |
| Temas | Cuatro temas vigentes con **66 tokens** semánticos por tema (`themes.css`); arranque sin parpadeo y selector existente (`themes.ts`, `theme-boot.js`). Graphite Lime se integró en `test` con #356 (`bff714e`) y es seleccionable. |
| Shell | Sidebar 236 px; contenido `max-width: 1450px`; breakpoints 1050/760 px; móvil 16 px (`style.css`). |
| Componentes | `PageHead`, `Tag`, `Alert`, `Switch`, `TableScroll` (`ui.tsx`). |
| CSS | `style.css`: **4.784 líneas**, 1 hex de fallback (`var(--warning, #6b5412)`), 41 nombres `var(--…)` usados (incluye alias locales); de los 66 tokens definidos, 30 sin uso; 0 usos de `var(--space)`. |
| E4.6 | Integrada `cfbedb0` (#201); UX de Inicio aprobada en SPEC24. |
| E4.9 | Integrada `0176ffc` (#200); QA APTO CON RESERVAS; UI y contratos de cierre existen. |
| E4.10 | SPEC28 **ratificada**; **I1 integrado** `70fa7c0` (v26/C26); **I2 abierto** `6ec63f1` (no fusionado); 24 AC `UNRUN`. Sin UI de reapertura. |
| E4.11 | SPEC29 **DRAFT**; P1-C/P4-A/P5-B aprobadas; P2/P3/P6/P7/P8 pendientes; sin DEV ni UI. |
| `guidelines/ui.md` | Contrato de tres temas actualizado el 2026-11-06; enmienda Graphite 1A y cuarto tema el 2026-11-10. Tokens, selector, tipografía, shell y accesibilidad; historial y paleta histórica preservados. |

## 1. Principios verificables

1. **La cifra manda:** una lectura principal por tarjeta; estado con icono + texto; metadatos
   secundarios agrupados. Sin dos cifras del mismo rango en la misma tarjeta.
2. **Densidad controlada:** tres niveles de texto; ningún texto funcional por debajo de 12 px;
   tablas compactas pero legibles.
3. **Jerarquía repetible:** arquetipos de resumen, catálogo, ficha, formulario y operación;
   cabecera, sección y tarjeta con anatomía común.
4. **Consistencia:** un badge, un botón primario, una tabla, un campo, un vacío, un esqueleto.
5. **Movimiento discreto:** 120–160 ms, solo color/borde/opacidad; nada sobre cifras;
   `prefers-reduced-motion` respetado.
6. **AA como suelo:** texto normal ≥ 4.5:1 y grande/componentes ≥ 3:1 en los **tres temas
   existentes**; foco visible; objetivos ≥ 44 px; sin scroll horizontal a 390; zoom 200 %;
   teclado completo. Graphite Lime se mide en su propio QA de 1A, no se deduce de la matriz
   histórica de tres temas.

## 2. Contrato de temas (ampliable por decisión expresa)

| Tema | `data-theme` | Estado |
| --- | --- | --- |
| Dark | `dark-s` | Implementado y cerrado; predeterminado |
| Light | `light-s` | Implementado y cerrado |
| Hybrid | `hybrid-s` | Implementado y cerrado |
| Graphite Lime | `graphite-lime` | Aprobado 2026-11-10; integrado en `test` con #356 (`bff714e`); seleccionable como cuarto tema |
| Casa | `casa` | Aprobada 2026-11-10; 1A autorizado y en curso |

- Los tokens semánticos vigentes son los de `apps/web/public/themes.css`; los componentes
  consumen `var(--…)` y no conocen el tema.
- El selector existente se etiqueta **«Apariencia»** y conserva un único control; no se añade
  otro selector ni se cambia el mecanismo de persistencia. La ampliación del catálogo se hace
  con una entrada adicional y un bloque de tokens, no con un segundo mecanismo.
- Dark, Light, Hybrid y Graphite Lime no se modifican: ni paletas, ni tokens, ni orden/identidad,
  ni el tema inicial `dark-s`.
- Graphite Lime se añade de forma aditiva por la enmienda UI-G1. **Casa se añade de forma
  aditiva por la enmienda UI-P1 (2.3).** No se implementan otros candidatos sin una decisión
  expresa y una enmienda propia.
- **Prohibido:** reabrir o alterar los cuatro temas existentes, cambiar `dark-s` como
  predeterminado, sustituir `mf-theme` o modificar `theme-boot.js` para una apariencia no
  aprobada.

### 2.1 Actualización aplicada de `guidelines/ui.md` (2026-11-06)

`guidelines/ui.md` conservaba la identidad verde y «solo tema claro» de E1.1. **Actualizada en
este PR** con una intervención quirúrgica, sin tocar colores ni código:

1. **Cabecera:** nueva sección «Contrato visual vigente» con Dark (`dark-s`), Light (`light-s`) y
   Hybrid (`hybrid-s`), implementados en #198.
2. **Temas y tokens vigentes:** tokens en `apps/web/public/themes.css`; componentes consumen
   `var(--…)`; selector existente y preferencia persistida; tema inicial `dark-s`; paleta,
   tokens y selector **cerrados**.
3. **Tipografía y shell:** tipografía de sistema (Inter declarada pero no cargada); sidebar
   236 px; `max-width: 1450px`; breakpoints 1050/760 px; móvil 16 px.
4. **Accesibilidad:** AA 4.5/3, foco, objetivos ≥ 44 px, zoom 200 %, `prefers-reduced-motion`;
   la excepción de contraste de #7 se conserva como registro histórico.
5. **Historial:** las secciones E1.1–E1.5 y la paleta `#8DBB2E`/`#EEF7E8` quedan marcadas como
   referencia histórica; **no se borran colores**.
6. **Conservadas** las reglas de formularios, foco, estados, IDs y ausencias.

No cambia CSS, componentes, paletas, tokens, selector ni comportamiento.

**Nota de vigencia:** el cierre de temas de esta sección describe la redacción del 2026-11-06.
La enmienda 2.2 amplía el catálogo con Graphite Lime; no reabre los tres temas existentes.

### 2.2 Enmienda Graphite Lime 1A (2026-11-10)

Alcance autorizado para 1A, implementado en la PR separada #356 (`bff714e`):

- ID `graphite-lime`, etiqueta «Grafito», `colorScheme: dark`.
- Bloque aditivo de tokens Graphite en `themes.css`, usando los nombres semánticos existentes.
- Registro en `themes.ts` y ampliación de la lista `known` de `theme-boot.js`.
- Pruebas unitarias del catálogo y E2E específicas del tema.
- `dark-s` predeterminado, `mf-theme` y los tres temas actuales sin cambios.
- `--positive`/`--ok` independientes de `--accent`/`--action`; lima para marca/acción,
  menta para positivo y estados correctos.

Límites:

- 1A incorpora el tema al sistema; **no** implementa la composición visual de Inicio,
  Movimientos, formularios ni navegación.
- 1B (`prefers-reduced-motion`) no está autorizado.
- Añadir Graphite no autoriza Color Finance, Pastel Editorial ni ningún otro candidato.
- Esta enmienda no autoriza merge ni despliegue; 1A requirió su PR y QA independiente.
- **Estado (2026-11-10):** 1A integrado en `test` (`bff714e`, #356); Graphite es seleccionable.
  La integración visual premium completa sigue pendiente y 1B permanece fuera de alcance.

Verificación mínima de 1A: pruebas unitarias del catálogo; E2E de selector, persistencia,
arranque previo a React, fallback a `dark-s`, colores clave y ausencia de overflow a 1440/390;
la suite de los tres temas existentes se conserva sin cambios. La matriz AA histórica de tres
temas no se reutiliza como PASS de Graphite.

### 2.3 Enmienda UI-P1 · Casa de cuentas 1A (2026-11-10)

Ratificada por el usuario el 2026-11-10 para iniciar la implementación de **Casa de cuentas**
como **quinta apariencia** del sistema de temas existente. No reabre Graphite Lime ni autoriza
Señal.

Alcance autorizado para 1A:

- ID `casa`, etiqueta «Casa», `colorScheme: light`.
- Bloque aditivo de **66 tokens semánticos** en `themes.css`, con los mismos nombres que los
  cuatro temas existentes.
- Tokens de tipografía, espaciado y superficies, y CSS específico de Casa en un archivo aislado
  (`casa.css`), sin duplicar `style.css` ni usar `!important`.
- Registro en `themes.ts` y ampliación de la lista `known` de `theme-boot.js`.
- Selector único **«Apariencia»** con cinco opciones: Claro, Oscuro, Mixto, Grafito y Casa.
- Persistencia en `mf-theme`; `dark-s` sigue siendo el valor inicial.
- Sin `data-experience`, `mf-experience` ni un segundo script de arranque.
- Pruebas unitarias y E2E de catálogo, selección, persistencia, arranque previo a React y no
  regresión de las cuatro apariencias actuales.

Límites:

- 1A **no** modifica Inicio, Movimientos, navegación ni formularios; solo la base visual
  (tokens, tipografía, espaciado, superficies y estilos de componentes ya existentes).
- 1B (composición editorial de Inicio) requiere propuesta, alcance y autorización separados.
- Señal no está autorizada.
- No se modifican API, DTO, SQLite, Excel, cálculos, datos reales ni contratos financieros.
- No se autoriza merge ni despliegue; 1A requiere su PR y QA independiente.

Esta enmienda sustituye únicamente la cláusula de «no otros candidatos» en lo que respecta a
Casa 1A; el resto de la especificación y las decisiones de Graphite Lime se conservan.

## 3. Dependencias

| Dependencia | Estado | Qué aporta | Límite para `UI` |
| --- | --- | --- | --- |
| E4.6 / `/inicio` | Integrada `cfbedb0` (#201); SPEC24 aprobada | Estructura, cifras y estados de Inicio | No reordenar secciones ni cambiar cifras/estados |
| E4.9 / cierre y foto | Integrada `0176ffc` (#200), QA APTO CON RESERVAS | Patrones de operación irreversible y bloqueo | No reabrir rutas, contratos ni estados |
| E4.10 / reapertura | SPEC28 **ratificada**; **I1 integrado** `70fa7c0` (v26/C26); **I2 abierto** `6ec63f1`, no fusionado; 24 AC `UNRUN` | Patrón futuro de reapertura/reapertura cancelada | No anticipar pantallas, clases ni rutas de E4.10 hasta su UI |
| E4.11 / fotos periodo | SPEC29 **DRAFT**; P1-C/P4-A/P5-B aprobadas; P2/P3/P6/P7/P8 pendientes; sin DEV | Contexto de consulta | No fijar pantallas antes de su SPEC |
| Temas #198 | Tres temas cerrados `0b8aade`; Graphite 1A integrado `bff714e` (#356); enmienda UI-P1 2026-11-10 | Tokens, selector y ampliación Casa 1A | No cambiar los cuatro temas existentes; Casa solo en 1A |

## 4. Bloques `UI · DEV-01…07`

| Bloque | Objetivo | Entregables | Dependencias | Aceptación visual |
| --- | --- | --- | --- | --- |
| **DEV-01 Fundamentos** | Escala tipográfica, espaciado, radios, foco y tamaños mínimos | Tokens no cromáticos; escala en shell y base; consumo real de `--space` | — | 1440/390 × 3 temas sin regresión; texto funcional ≥ 12 px; un radio por familia |
| **DEV-02 Cifras y estados** | Unificar importe, badge, tarjeta, vacío y esqueleto | `Amount`, `Badge`, `Metric`, `EmptyState`, `Skeleton`; `--negative` aplicado; formateador único | DEV-01 | Badge único; `0,00 €`, `ND`, `No aplica`, `Sin datos` distinguibles; contraste ≥ 4.5 en 3 temas |
| **DEV-03 Navegación** | Agrupar rutas sin cambiarlas | Datos de navegación en módulo; grupos; activo con barra+peso; título por ruta; menú móvil accesible | DEV-01 | Los **23 enlaces de navegación** actuales se conservan; `/saldos/nuevo` y `/` mantienen su comportamiento; activo sin color; teclado; sin desbordamiento a 390 |
| **DEV-04 Tablas y listados** | Una tabla, un comportamiento | Primitiva `Table`; importes a la derecha; cabecera/hover por token; tarjetas móviles | DEV-01, DEV-02 | Misma información tabla/tarjeta; sin scroll horizontal; región desplazable rotulada |
| **DEV-05 Formularios y fichas** | Formularios y detalle consistentes | `Field`, secciones, ayuda/error, rejilla 2→1; ficha por jerarquía | DEV-01, DEV-02 | Error sin salto; foco al primer error; AA en 3 temas |
| **DEV-06 Pantallas clave** | Llevar el sistema a Inicio y 4 pantallas más | Inicio, Movimientos, Saldos ficha, Saldos alta/edición y Cierre | DEV-02…05; frontera E4.6/E4.9; **sin E4.10/E4.11** | Inicio conserva secciones/cifras/estados; una lectura principal; capturas antes/después |
| **DEV-07 Temas y AA** | Cerrar paridad y evidencia | Matriz 5 pantallas × 3 temas × 2 anchos; contraste automatizado; teclado/zoom/reduced motion; actualizar guía y catálogo | DEV-01…06 | Pares ≥ 4.5/3; cero desbordamiento; evidencia adjunta, no aprobación |

**Orden recomendado:** `01 → 02 → 03 → 04 → 05 → 06 → 07`.

- **03 ∥ 04** solo si un único propietario escribe **todo** `style.css` (o el CSS de tablas se
  separa en un archivo propio) y el otro ejecutor se limita a `main.tsx`/`ui.tsx`. En el estado
  actual ambos comparten `style.css`, por lo que el orden seguro es `03 → 04`.
- **05 va después de 04**: comparte `ui.tsx` (`Field`) y las tarjetas móviles de tabla; 04 y 05
  no se paralelizan.
- **06** espera a 02–05 y a la decisión de pantallas; **07** cierra la matriz completa.
- Si no se garantiza la separación de archivos, la secuencia es estrictamente secuencial. El
  paralelismo no compensa el riesgo sobre `style.css`/`ui.tsx`.

Cada bloque es reversible y ninguno cambia API, datos, cálculos ni estados.

**DEV-02 — inventario previo:** antes de unificar el formateador, inventariar `eur()`,
`formatDecimal` y las cadenas/AC que comparan `-`/`−` o decimales; actualizar tests de forma
consciente; no cambiar valores, redondeos ni contratos.

## 5. Pantallas de referencia

**Recomendación para `DEV-06`: cinco pantallas, una por arquetipo.**

| # | Pantalla | Arquetipo | Por qué |
| --- | --- | --- | --- |
| 1 | **Inicio** (E4.6) | Resumen | Cifras, estados, densidad y jerarquía ya aprobadas; base de comparación |
| 2 | **Movimientos** | Catálogo/listado | Tabla densa, filtros, paginación, estados vacío/error y tarjetas móviles |
| 3 | **Saldos ficha** | Detalle | Identificación, estado, atributos y acciones; `detail-grid` |
| 4 | **Saldos alta/edición** | Formulario | Secciones, ayuda/error, foco, borrador y rejilla 2→1 |
| 5 | **Cierre** (E4.9) | Operación irreversible | Confirmación, motivo y bloqueo; patrón visual sin reabrir contratos |

- Cubre los cinco arquetipos con **dos pantallas de alta densidad** (Movimientos, Inicio) y una
  operación irreversible real.
- **No** incluye pantallas de E4.10 ni E4.11: no tienen UI implementada y sus specs no fijan
  pantallas.
- Los wireframes actuales cubren Inicio (escritorio/móvil), listado de Saldos y edición de
  Saldo; Movimientos y Cierre se diseñarán en `DEV-06` con la misma matriz.
- Si se prefiere una sola pantalla de catálogo, Movimientos sustituye a Saldos listado; no se
  añaden ambas al mismo bloque.

## 6. QA, evidencia y accesibilidad

**Matriz de cierre (`DEV-07`):** **5 pantallas × 3 temas × 2 anchos = 30 capturas base**, a
390×844 y 1440×1000, todas con datos ficticios y el mismo contenido.

- **Estados críticos:** añadir una captura por pantalla y tema del estado más relevante
  (vacío, error, carga o bloqueo): **15 capturas** adicionales; no sustituyen a las 30 base.
- **Criterios de aceptación:** texto normal ≥ 4.5:1 y grande/componentes ≥ 3:1 en los tres
  temas; foco visible; teclado completo; objetivos ≥ 44 px; zoom 200 %; `prefers-reduced-motion`;
  sin scroll horizontal de página a 390; texto funcional ≥ 12 px; `null ≠ 0`; `ND`, `0,00 €`,
  `No aplica` y `Sin datos` distinguibles; ninguna cifra o estado cambia.
- **Evidencia por bloque (03–06):** antes/después de las 2 pantallas afectadas × 3 temas × 2
  anchos (12 capturas), contraste medido, recorrido de teclado y nota de regresiones.
- **Automatización:** extender `theme.spec.ts` e `inicio.spec.ts`; contraste por estilos
  computados; sin añadir dependencias nuevas en esta SPEC.
- **QA independiente** por bloque. Las capturas son evidencia, no aprobación; `DEV-07` no se
  declara cerrado sin la matriz completa y revisión independiente.

## 7. Decisiones aprobadas (2026-11-06)

Las cuatro decisiones fueron aprobadas por el usuario el 2026-11-06 en los términos de la
ratificación de `UI · SPEC`; se conserva la recomendación como registro.

1. **[APROBADO] Pantallas de `DEV-06`:** cinco pantallas (Inicio, Movimientos, Saldos ficha,
   Saldos alta/edición, Cierre). Alternativa mínima: cuatro sin ficha. Sin E4.10/E4.11.
2. **[APROBADO] Orden/paralelismo:** `03 → 04 → 05`; `03 ∥ 04` solo con ownership disjunto
   (un único propietario de `style.css`; el otro limitado a `main.tsx`/`ui.tsx`). En el estado
   actual comparten `style.css`, así que el orden seguro es secuencial. `05` después de `04`;
   `06` después de `05`; `07` al final.
3. **[APROBADO] Matriz de evidencia:** 30 capturas base (5×3×2) + 15 de estados críticos; AA,
   foco, teclado, zoom, reduced motion, 390 sin overflow, texto ≥ 12 px y `null ≠ 0`; 12
   capturas antes/después por bloque; QA independiente. §6 fija el detalle.
4. **[APROBADO] `guidelines/ui.md`:** actualización aplicada en este PR, sin cambiar colores,
   tokens ni selector; §2.1 y el propio archivo recogen el contrato vigente.
5. **`UI · DEV-01`:** **autorizado por separado**; `DEV-02…07` y sus merges no están autorizados.

**Cerradas y no sujetas a reapertura:** identidad cromática, los tres temas existentes,
paletas, tokens, selector y alternativa B. La enmienda UI-G1 añade Graphite Lime como cuarto
tema sin reabrir esas decisiones; el resto de la aprobación del 2026-11-06 se conserva.

## 8. Aprobación registrada y plan de `UI · DEV-01`

### 8.1 Aprobación formal (2026-11-06)

El usuario aprobó `UI · SPEC` conforme a la PR #205 y su HEAD final, y ratificó:

> Alternativa B, tres temas cerrados, cinco pantallas de `DEV-06`, secuencia `01 → 02 → 03 → 04
> → 05 → 06 → 07` con `03 ∥ 04` solo con ownership disjunto, matriz de 30+15 capturas y
> actualización de `guidelines/ui.md`. Sin cambios de paletas, tokens, selector, rutas,
> permisos, contratos, cifras ni comportamiento financiero.

La aprobación autoriza el merge de #205 tras aplicar `guidelines/ui.md` y, por separado,
`UI · DEV-01`. **No** autoriza `DEV-02…07` ni sus merges.

**Registro histórico:** la mención a «tres temas cerrados» de esta aprobación se conserva como
antecedente. La enmienda UI-G1 del 2026-11-10 amplía el catálogo con Graphite Lime para 1A; no
reabre los tres temas ni el resto de decisiones de esta sección.

### 8.2 Plan de `UI · DEV-01` (autorizado 2026-11-06)

- **Alcance:** escala tipográfica, espaciado, radios, foco y tamaños mínimos; tokens **no
  cromáticos** y consumo real de `--space`/`--radius` en shell y base.
- **Archivos previstos:** `apps/web/src/style.css` (sección propia al final, sin reordenar),
  `apps/web/src/main.tsx` solo si el shell lo exige, y `apps/web/src/ui.tsx` si se añade una
  primitiva mínima. **No** `themes.css`, `theme-boot.js`, `themes.ts`, rutas, API ni datos.
- **Coordinación E4.10:** I1 está integrado e I2 sigue en PR sobre `apps/api`; `UI · DEV-01` no
  toca esos archivos. `style.css`/`main.tsx` quedan bajo un único escritor UI.
- **Pruebas:** `bun run typecheck`, `python3 scripts/verify` (perfil según cambio), E2E
  `theme.spec.ts` e `inicio.spec.ts`; capturas 1440/390 en los tres temas; comprobar que no
  cambian cifras, estados ni contratos.
- **QA:** independiente, con matriz focal de 2 pantallas × 3 temas × 2 anchos y revisión del
  diff. Sin PASS de aceptación global.
- **Gate:** `UI · DEV-01` autorizado; su merge requiere autorización independiente.

### 8.3 Integración

El merge de #205 se autoriza tras aplicar `guidelines/ui.md`, con CI PASS y QA APTO. La
iniciativa sigue independiente de E4.10; los bloques que compartan `style.css`/`main.tsx` se
coordinan por archivo y ventana. `DEV-06` no empieza antes de `DEV-02` y de fijar las pantallas.
