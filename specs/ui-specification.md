# UI — Evolución visual de MyFinanzas: Specification (UI · SPEC)

**Estado:** `[PROPUESTA]` documental — **lista para aprobación formal; NO APROBADA.** No
autoriza `UI · DEV`, no modifica código, componentes, CSS, temas, API, cálculos financieros ni
datos reales. No fusiona nada.

- **Base:** `main` **`043869f`** (2026-11-05; I1 de E4.10 integrado y recarga de agentes #234).
- **Análisis:** [ui-evolution-2026-11-04](investigations/ui-evolution-2026-11-04.md);
  **wireframes:** [ui-evolution-wireframes.html](investigations/ui-evolution-wireframes.html).
- **Identificador:** `UI` (transversal; no crea épica ni altera las 30 entregas).
- **Alternativa adoptada:** **B** — evolución progresiva de componentes y pantallas, sin
  rediseñar la identidad visual (decisión del usuario, 2026-11-05).
- **Temas:** **Dark (`dark-s`), Light (`light-s`) y Hybrid (`hybrid-s`) cerrados** en
  `0b8aade` (#198). Paletas, tokens cromáticos y selector existentes **no se reabren**.
- **Alcance:** tipografía, legibilidad, espaciados, jerarquía, navegación, tablas, formularios
  y adaptación móvil, reutilizando los tres temas.
- **Fuera de alcance:** cambios de color/tema, rediseño de identidad, rutas, permisos,
  contratos de API/DTO, cifras, estados financieros, cálculos, datos reales, despliegue y
  `UI · DEV` sin autorización.

### 0. Estado real verificado (2026-11-05)

| Superficie | Estado comprobado |
| --- | --- |
| Navegación | **23 enlaces** de navegación en un único grupo «MI ESPACIO» (`main.tsx:179-493`); `/saldos/nuevo` es subvista y `/` es alias de Saldos. No se añaden rutas. |
| Temas | Tres temas y **66 tokens** semánticos (`themes.css`, 220 líneas); arranque sin parpadeo y selector existente (`themes.ts`, `theme-boot.js`). |
| Shell | Sidebar 236 px; contenido `max-width: 1450px`; breakpoints 1050/760 px; móvil 16 px (`style.css`). |
| Componentes | `PageHead`, `Tag`, `Alert`, `Switch`, `TableScroll` (`ui.tsx`). |
| CSS | `style.css`: **4.784 líneas**, 1 hex de fallback (`var(--warning, #6b5412)`), 41 nombres `var(--…)` usados (incluye alias locales); de los 66 tokens definidos, 30 sin uso; 0 usos de `var(--space)`. |
| E4.6 | Integrada `cfbedb0` (#201); UX de Inicio aprobada en SPEC24. |
| E4.9 | Integrada `0176ffc` (#200); QA APTO CON RESERVAS; UI y contratos de cierre existen. |
| E4.10 | SPEC28 **ratificada**; **I1 integrado** `70fa7c0` (v26/C26); **I2 abierto** `5fa0a1e` (no fusionado); 24 AC `UNRUN`. Sin UI de reapertura. |
| E4.11 | SPEC29 **DRAFT**; P1-C/P4-A/P5-B aprobadas; P2/P3/P6/P7/P8 pendientes; sin DEV ni UI. |
| `guidelines/ui.md` | Describe «tema únicamente claro» y la identidad verde histórica; **no refleja los tres temas**. Propuesta concreta en §2.1; no se modifica en este PR. |

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
6. **AA como suelo:** texto normal ≥ 4.5:1 y grande/componentes ≥ 3:1 en los **tres temas**;
   foco visible; objetivos ≥ 44 px; sin scroll horizontal a 390; zoom 200 %; teclado completo.

## 2. Contrato de temas (cerrado)

| Tema | `data-theme` | Estado |
| --- | --- | --- |
| Dark | `dark-s` | Implementado y cerrado |
| Light | `light-s` | Implementado y cerrado |
| Hybrid | `hybrid-s` | Implementado y cerrado |

- Los tokens semánticos vigentes son los de `apps/web/public/themes.css`; los componentes
  consumen `var(--…)` y no conocen el tema.
- El selector de tema existente se conserva; no se añade otro selector ni se cambia el
  mecanismo de persistencia.
- **Prohibido:** modificar paletas, tokens cromáticos, `theme-boot.js`, orden/identidad de los
  temas o el tema inicial (`dark-s`), que están cerrados.

### 2.1 Propuesta concreta de actualización de `guidelines/ui.md`

`guidelines/ui.md` conserva la identidad verde y «solo tema claro» de E1.1. **No se modifica en
este PR.** Se propone una actualización documental quirúrgica, sin tocar colores ni código:

1. **Cabecera:** sustituir «Tema únicamente claro» por «Temas vigentes: Dark (`dark-s`), Light
   (`light-s`) y Hybrid (`hybrid-s`), implementados en #198».
2. **Nueva sección «Temas y tokens vigentes»:**
   - tokens semánticos en `apps/web/public/themes.css`; los componentes consumen `var(--…)`;
   - selector existente y preferencia persistida; tema inicial `dark-s`;
   - paleta, tokens y selector **cerrados**: no se añaden colores ni un cuarto tema.
3. **Tipografía y shell:** tipografía de sistema (Inter declarada pero no cargada); sidebar
   236 px; contenido `max-width: 1450px`; breakpoints 1050/760 px; móvil 16 px.
4. **Accesibilidad:** suelo AA (4.5:1 texto normal; 3:1 grande/componentes), foco visible,
   objetivos ≥ 44 px, zoom 200 %, `prefers-reduced-motion`; conservar la excepción de contraste
   documentada de #7.
5. **Sección histórica:** marcar la paleta verde `#8DBB2E`/`#EEF7E8` como referencia histórica
   de E1.1, no como tokens actuales; **no borrar los colores**.
6. **Conservar** las reglas de formularios, foco, estados, IDs y ausencias; solo se actualiza lo
   que contradice los tres temas.

**Aplicación propuesta:** incluir esta actualización en el mismo paquete de aprobación de
`UI · SPEC`, como commit documental separado y antes de `UI · DEV-01`. No requiere PR nuevo ni
cambia CSS, componentes, paletas o selector.

## 3. Dependencias

| Dependencia | Estado | Qué aporta | Límite para `UI` |
| --- | --- | --- | --- |
| E4.6 / `/inicio` | Integrada `cfbedb0` (#201); SPEC24 aprobada | Estructura, cifras y estados de Inicio | No reordenar secciones ni cambiar cifras/estados |
| E4.9 / cierre y foto | Integrada `0176ffc` (#200), QA APTO CON RESERVAS | Patrones de operación irreversible y bloqueo | No reabrir rutas, contratos ni estados |
| E4.10 / reapertura | SPEC28 **ratificada**; **I1 integrado** `70fa7c0` (v26/C26); **I2 abierto** `5fa0a1e`, no fusionado; 24 AC `UNRUN` | Patrón futuro de reapertura/reapertura cancelada | No anticipar pantallas, clases ni rutas de E4.10 hasta su UI |
| E4.11 / fotos periodo | SPEC29 **DRAFT**; P1-C/P4-A/P5-B aprobadas; P2/P3/P6/P7/P8 pendientes; sin DEV | Contexto de consulta | No fijar pantallas antes de su SPEC |
| Temas #198 | Cerrado `0b8aade` | Tokens y selector | No cambiar colores ni temas |

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

- **03 ∥ 04** solo es seguro después de 02 si hay **dos ejecutores con archivos disjuntos**:
  03 posee `main.tsx` y la sección de navegación de `style.css`; 04 posee `ui.tsx` (`Table`) y
  la sección de tablas. `style.css` no puede tener dos escritores.
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

## 7. Decisiones pendientes y recomendación

1. **Pantallas de `DEV-06`.** **Recomendación:** las cinco de §5 (Inicio, Movimientos, Saldos
   ficha, Saldos alta/edición, Cierre). Cubren resumen, catálogo, detalle, formulario y
   operación irreversible; excluyen E4.10/E4.11. Alternativa mínima: Inicio, Movimientos,
   Saldos alta/edición y Cierre (4), dejando la ficha para una segunda pasada. No se acepta una
   pantalla de E4.10/E4.11 sin su UI.
2. **Orden/paralelismo `DEV-03/04/05`.** **Recomendación:** secuencia `03 → 04 → 05`. Único
   paralelismo admisible: `03 ∥ 04` tras 02 con ownership disjunto (`main.tsx`+nav CSS vs
   `ui.tsx`+tabla CSS). `05` después de `04`; `06` después de `05`; `07` al final. Sin
   separación de archivos, no hay paralelismo.
3. **Matriz de evidencia y accesibilidad.** **Recomendación:** 30 capturas base (5×3×2) + 15 de
   estados críticos; criterios AA, foco, teclado, zoom, reduced motion, 390 sin overflow, texto
   ≥ 12 px y `null ≠ 0`; 12 capturas antes/después por bloque; QA independiente. §6 fija el
   detalle.
4. **`guidelines/ui.md`.** **Recomendación:** aplicar la actualización quirúrgica de §2.1 en el
   mismo paquete de aprobación, como commit documental separado y antes de `DEV-01`; conservar
   colores, tokens y selector. No requiere PR nuevo ni cambio de código.
5. **Autorización de `UI · DEV-01`** y de cada bloque posterior: decisión separada. Aprobar esta
   SPEC no autoriza DEV visual.

**Cerradas y no sujetas a reapertura:** identidad cromática, tres temas, paletas, tokens,
selector y alternativa B.

## 8. Aprobación propuesta y plan de `UI · DEV-01`

### 8.1 Texto de aprobación formal propuesto

> Apruebo `UI · SPEC` como contrato visual de evolución progresiva (alternativa B), con los tres
> temas Dark/Light/Hybrid cerrados, sin cambios de paletas, tokens, selector, rutas, permisos,
> contratos, cifras ni comportamiento financiero. Apruebo las cinco pantallas de referencia de
> `DEV-06`, la secuencia `DEV-01 → 02 → 03 → 04 → 05 → 06 → 07` con el paralelismo condicionado
> de §4, la matriz de evidencia de §6 y la actualización documental de `guidelines/ui.md` de
> §2.1. La aprobación no autoriza `UI · DEV` ni ningún merge; cada bloque requiere autorización
> separada.

### 8.2 Plan de inicio de `UI · DEV-01` (no autorizado)

- **Alcance:** escala tipográfica, espaciado, radios, foco y tamaños mínimos; tokens **no
  cromáticos** y consumo real de `--space`/`--radius` en shell y base.
- **Archivos previstos:** `apps/web/src/style.css` (sección propia al final, sin reordenar),
  `apps/web/src/main.tsx` solo si el shell lo exige, y `apps/web/src/ui.tsx` si se añade una
  primitiva mínima. **No** `themes.css`, `theme-boot.js`, `themes.ts`, rutas, API ni datos.
- **Coordinación E4.10:** E4.10 I1 está integrado y I2 afecta `apps/api`; `UI · DEV-01` no toca
  esos archivos. `style.css`/`main.tsx` quedan bajo un único escritor UI; no se solapan con
  E4.10. Antes de abrir rama, rebase desde `main` y contraste del tablero.
- **Pruebas:** `bun run typecheck`, `python3 scripts/verify` (perfil según cambio), E2E
  `theme.spec.ts` e `inicio.spec.ts`; capturas 1440/390 en los tres temas; comprobar que no
  cambian cifras, estados ni contratos.
- **QA:** independiente, con matriz focal de 2 pantallas × 3 temas × 2 anchos y revisión del
  diff. Sin PASS de aceptación global.
- **Gate:** autorización expresa de `UI · DEV-01`; merge separado. No se inicia `DEV-01` por
  aprobar esta SPEC.

### 8.3 Integración

Aprobar esta SPEC no fusiona #205 ni autoriza `UI · DEV`. La iniciativa sigue independiente de
E4.10; los bloques que compartan `style.css`/`main.tsx` se coordinan por archivo y ventana. No se
recomienda iniciar `DEV-06` antes de `DEV-02` y de fijar las pantallas de referencia.
