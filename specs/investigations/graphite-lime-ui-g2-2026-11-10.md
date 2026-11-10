# Graphite Lime · UI-G2 · integración visual completa

**Estado:** propuesta, pendiente de revisión y autorización. **No implementa código.**
**Fecha:** 2026-11-10.
**Base analizada:** `test` `1d288c5`; la referencia del usuario es `034831f`, que ya incluye
#356, #357 y #362. Los commits posteriores son documentales y no cambian el frontend.
**Diseño de referencia:** [archivo Graphite Lime](graphite-lime-design-2026-11-10/README.md).

## 1. Resumen ejecutivo

Graphite Lime 1A está integrado: tokens, catálogo, selector, persistencia y arranque previo a
React. Falta la **composición visual** que hace que la aplicación se parezca al prototipo
aprobado, no solo que use sus colores.

La brecha principal está en:

- **Inicio:** el prototipo organiza la pantalla como control del ciclo + KPI + ciclo/rail +
  movimientos/presupuesto + posición. Producción mantiene un resumen operativo en paneles,
  con otra jerarquía y otra densidad.
- **Movimientos:** el prototipo separa filtros y listado en tarjetas, usa iconos, selección y
  detalle contextual. Producción tiene una sola tarjeta de catálogo y una ficha de detalle
  separada.
- **Shell y componentes:** el prototipo usa superficies elevadas, tipografía más expresiva,
  badges compactos y cajas de icono; producción conserva la estética base de DEV-01…07.

La integración debe ser **CSS-first y aditiva**, con cambios de composición solo donde el
prototipo no se puede expresar con el DOM actual. No se duplican formularios, motores ni
componentes compartidos.

## 2. Qué falta exactamente

### 2.1 Shell y navegación

| Aspecto | Producción | Prototipo | Acción propuesta |
| --- | --- | --- | --- |
| Sidebar | 236 px, activo sólido, glifos Unicode | 264 px, activo lima, iconos y jerarquía más marcada | Mantener 236 px; aplicar superficie, borde, tipografía y activo con `graphite.css`. La diferencia de ancho es una desviación consciente para no cambiar el layout global |
| Sidebar: ciclo/cobertura | No existe | `side-cycle` y `side-coverage` con plan, días restantes y coberturas | **Fuera de G1–G4**: el API no publica % de plan ni días restantes; añadirlos sería una función de shell nueva. Queda como **G1b opcional** con `contexto.ciclo` y coberturas publicadas, solo si se autoriza |
| Header global | ciclo + selector + acciones | topbar con ciclo, metadata y acciones | Añadir “Consulta” (`contexto.consulta`) y “Referencia” (`referencia.fecha`), o “Calculado a las…”. **No** etiquetar “Actualizado” sin un timestamp de actualización real |
| Botones | base DEV-01 | primario lima, secundario con superficie elevada | Estilos Graphite scoped; misma semántica y tamaños |
| Foco | 3 px global | anillo lima explícito | Reutilizar `--focus`; verificar en inputs, tablas y nav |

No se cambian rutas, permisos, orden de navegación ni breakpoints globales. La acción “Nuevo
movimiento” del prototipo puede añadirse como enlace al formulario existente solo si se acepta
como parte de G2a; no es necesaria para la identidad visual.

### 2.2 Inicio

Producción ya publica los datos del resumen, pero con otra composición:

- `PageHead` + contexto del ciclo.
- Liquidez y Objetivo R6 en dos columnas.
- Ciclo con ocho métricas en tarjetas.
- Cuatro columnas: Saldos, Ahorro, Inversión, Deuda.
- Pendientes y Cobertura del modelo.

El prototipo propone:

1. **Control del ciclo** en un bloque hero de tres celdas: liquidez, gasto/plan y margen.
2. **Banda KPI** de cuatro lecturas: ingresos, gasto, inversión valorada, deuda no
   hipotecaria.
3. **Ciclo real vs plan** en tabla, con rail lateral de Atención y Objetivo R6.
4. **Movimientos recientes** y **presupuesto**.
5. **Banda de posición** y pie de cobertura.

Mapa viable con el contrato actual:

| Bloque del prototipo | Fuente actual | Decisión |
| --- | --- | --- |
| Hero: liquidez | `secciones.liquidez.metrica` + `incluidos.length` + `excluidos.length` | Reutilizar; no sumar posiciones |
| Hero: gasto/plan | `secciones.ciclo.gasto`, `.delMes`, `.nomina`, `.margenReal` | Mostrar **Gasto bruto** y **Del mes planificado** como lecturas separadas. No comparar `gasto` con `delMes` como numerador/denominador ni llamarlo “ejecución del plan”. Etiquetar `margenReal` como “Margen del plan frente a nómina” |
| KPI: ingresos/gasto | `secciones.ciclo.ingresos`, `.gasto` | Reutilizar |
| KPI: inversión | `secciones.inversion.agregado.valorEur` + `coberturaValoracion` | Reutilizar; si es `null`, ND |
| KPI: deuda | `secciones.deudaNoHipotecaria.total.valor` + `aparte` | Reutilizar; hipotecaria aparte |
| Tabla de ciclo | ocho métricas de `secciones.ciclo` | Reutilizar; `clase: real/plan` decide columna. El prototipo muestra 7 filas; producción añade `operativo`, que se conserva |
| Rail Atención | `pendientes.items`, `pendientes.conteo`, `pendientes.fuenteFallos`, `pendientes.metrica` **y** `inversion.cobertura`/`inversion.posiciones` | Reutilizar; no hay pendiente de tipo Inversión, así que el aviso de inversión se compone desde su cobertura, no se inventa |
| Rail Objetivo R6 | `objetivo.metrica`, `mesesCubiertos`, `costeEsencialMensual` | Reutilizar |
| Posición: Saldos | `saldos.conteos` (activos por vista) + `saldos.items.length` (listados, pueden incluir inactivos) | Mostrar conteos, **sin total ni suma entre vistas**; un Saldo puede ser liquidez y ahorro a la vez. Si se usa `items.length`, etiquetarlo como “Saldos listados” |
| Posición: Ahorro | `ahorro.posiciones[].valor` + `estado`/`motivo` | Mostrar posiciones/importes publicados, **sin total de Ahorro** si el API no lo publica |
| Posición: Inversión | `inversion.agregado.valorEur` + `inversion.agregado.coberturaValoracion` | Reutilizar; no inventar total si es parcial |
| Posición: Deuda | `deudaNoHipotecaria.total.valor` + `aparte` | Reutilizar; hipotecaria y sin informar aparte |
| Cobertura | `pendientesDelModelo`, `contexto.motivos`, coberturas por sección; Ahorro usa `posiciones[].estado`/`motivo` (no tiene cobertura de sección) | Conservar en disclosure/pie; no ocultar límites |
| Movimientos recientes | **no está en `/api/resumen-inicio`** | Diferir a G2c; no inventar ni añadir API |
| Presupuesto | **no está en `/api/resumen-inicio`** | Diferir a G2c; no inventar ni añadir API |
| Sparkline / anillo / % plan / días restantes | **no publicado por el resumen** | No reproducir como dato. `racional` solo existe en `objetivo.metrica` y `mesesCubiertos`; usarlo solo si está presente |

**Regla:** el navegador no calcula economía nueva. Si un bloque exige una serie, un porcentaje,
un plan o un total que el API no publica, se omite o se pospone a un incremento con decisión
expresa.

### 2.3 Movimientos

Producción ya tiene filtros completos, tabla, tarjetas móviles, paginación y ficha. El
prototipo añade:

- Tarjeta de filtros separada de la tarjeta de listado.
- Cabecera de tabla con iconos por tipo, jerarquía tipográfica y hover/selección.
- Tarjetas móviles con icono, concepto, importe y campos; barra de contexto móvil.
  La barra se cubre con el shell/global-header actual; si falta información, G3 la añade como
  presentacional, sin cambiar navegación.
- Panel lateral de detalle en escritorio y hoja inferior en móvil.
- Paginador más visual.

Decisiones:

- **G3** implementa la composición de lista/filtros/tabla/tarjetas/paginador **sin cambiar**
  filtros, consulta, columnas, acciones ni navegación.
- La suite actual exige **paridad exacta campo a campo** entre tabla y tarjetas
  (`expectMovementsParity`). G3 conserva esa paridad y logra la densidad con CSS; **no** usa
  `card: "hidden"` ni un `cardCell` que elimine información. Si se quiere reproducir la tarjeta
  móvil más compacta del prototipo, se autoriza un **G3b** separado y se actualiza el test de
  paridad con criterio explícito.
- **Selección + detalle inline** es un cambio de comportamiento, no solo CSS. Se pospone a
  **G4b**, reutilizando `GET /api/movimientos/:id` y el contenido de `MovementDetail`; la ficha
  completa por ruta se conserva como fallback.
- No se duplica `MovementForm` ni se reescribe validación/payload.

### 2.4 Componentes compartidos

Se reutilizan `PageHead`, `Metric`, `Amount`, `Badge`, `Table`, `DataList`, `Field`,
`FormSection`, `FormGrid`, `EmptyState`, `Skeleton` y `Alert`.

No se crea una librería paralela. Solo se añaden:

- CSS de página/Graphite con selectores `html[data-theme="graphite-lime"] …`.
- Un mapa presentacional pequeño tipo → glifo/icono si es necesario, reutilizando la
  convención de glifos existente, sin dependencia externa.
- Ningún cambio en `ui.tsx` está previsto. Si aparece una necesidad real de primitiva
  compartida, se para y se coordina con Casa/DEV-04; no se improvisa una variante por tema.

## 3. Enmienda UI-G2 propuesta

Texto preparado para integrarse en `specs/ui-specification.md` como §2.4 **solo después de su
aprobación**:

> **Enmienda UI-G2 · Integración visual completa de Graphite Lime (2026-11-10).**
> Ratificada para completar la composición visual de Graphite Lime sobre los tokens y el
> catálogo ya integrados en 1A (#356). Autoriza cambios presentacionales en el shell, Inicio,
> Movimientos y componentes existentes, con CSS aislado y scoped, sin duplicar lógica
> financiera ni formularios. Conserva Dark, Light, Hybrid y Casa sin cambios; `dark-s`
> predeterminado y `mf-theme` se mantienen.
>
> Alcance:
> - Shell y navegación: superficies, tipografía, iconos, foco y estados; sin cambiar rutas,
>   permisos, orden ni breakpoints globales.
> - Inicio: composición de hero/KPI/ciclo/rail/posición/cobertura con los datos publicados por
>   `/api/resumen-inicio`; sin nuevas métricas ni cálculos en el navegador.
> - Movimientos: composición de filtros, listado, tabla, tarjetas, paginación y presentación de
>   detalle/formularios existentes; sin cambiar contratos, filtros, validaciones ni payloads.
> - CSS específico en `apps/web/src/graphite.css`, importado de forma aditiva y limitado a
>   `html[data-theme="graphite-lime"]`.
> - Actualización de las pruebas de estructura/visual necesarias, preservando las aserciones de
>   datos, `ND`, errores, sesión y paridad funcional.
>
> Límites:
> - No autoriza API, DTO, SQLite, Excel, motores financieros, datos reales ni contratos.
> - No autoriza duplicar formularios, componentes compartidos ni una segunda librería visual.
> - No autoriza Casa de cuentas, Señal ni sus composiciones.
> - No autoriza 1B (`prefers-reduced-motion`), que sigue siendo un gate separado. La
>   integración no añade movimiento nuevo; solo conserva el comportamiento existente.
> - Cada incremento requiere su PR, pruebas y QA independiente; no autoriza merge ni
>   despliegue por sí misma.
> - Si un bloque del prototipo carece de datos publicados, se omite o se difiere; no se
>   inventan series, porcentajes, presupuestos, totales de Ahorro ni movimientos.

## 4. Incrementos propuestos

| Incremento | Objetivo | Archivos principales | Salida verificable |
| --- | --- | --- | --- |
| **G1 · Fundamento y shell** | Lenguaje visual Graphite: superficies, elevación, tipografía, controles, badges, tablas y shell | `graphite.css` [nuevo], `main.tsx` (solo import), tests de tema | Capturas 1440/820/390; estilos computados; Dark/Light/Hybrid intactos |
| **G1b · Sidebar ciclo/cobertura (opcional)** | Módulos de ciclo/cobertura en la sidebar con datos publicados | Shell/`main.tsx` + `graphite.css`, tests | Solo si se autoriza; sin % de plan ni días no publicados; no duplica Inicio |
| **G2a · Inicio: control y KPI** | Hero de control, banda KPI y contrato `data-inicio-section` | `Inicio.tsx` (incluye `data-inicio-section`), `graphite.css`, `inicio.spec.ts` actualizado | Mismos datos/ND; hero/KPI comparables; responsive; sin gráficos inventados |
| **G2b · Inicio: ciclo, rail y posición** | Tabla de ciclo, Atención/Objetivo, banda de posición y cobertura | `Inicio.tsx`, `graphite.css`, `inicio.spec.ts` actualizado | 8 métricas, rail y posición con datos exactos; cero overflow |
| **G2c · Bloques con datos externos** | Movimientos recientes y presupuesto, solo si se decide usar endpoints existentes | `Inicio.tsx`, estilos; sin API nueva | Decisión explícita; carga/errores aislados; no duplicar fetch; amplía `data-inicio-section` con `recent`/`budget` |
| **G3 · Movimientos: lista** | Filtros/listado en tarjetas, tabla, tarjetas móviles, paginador, con paridad exacta | `Movimientos.tsx`, `graphite.css`, `movimientos.spec.ts` | Paridad tabla/tarjeta; sin cambios de filtros/acciones; responsive |
| **G3b · Tarjetas compactas (opcional)** | Densidad móvil del prototipo si se acepta reducir campos visibles | `Movimientos.tsx`, estilos, `tests/e2e/movimientos.spec.ts` | Cambio de comportamiento autorizado y `expectMovementsParity` actualizado |
| **G4 · Movimientos: detalle y formularios** | Presentación premium de ficha y formularios existentes | `Movimientos.tsx`, estilos, E2E | Mismos campos/validaciones; foco/errores; sin cambios de payload |
| **G4b · Detalle inline (opcional)** | Panel lateral/hoja reutilizando `GET /api/movimientos/:id` | `Movimientos.tsx`, estilos, E2E | Solo si se autoriza; ficha completa como fallback |
| **G5a · Patrimonio** | Saldos, Clasificación, Inversiones y Deudas, un módulo por PR | `graphite.css` + módulo correspondiente | Paridad funcional; AA; responsive; regresión |
| **G5b · Resto y QA final** | Flujo mensual, Pendientes, Anticipos, Compartidos, Vehículos, Referencias, Ciclos, Precierre, Cierre, Fotos, D′ · Partidas, Comida, Revisión Comida, Nómina, Plan Anual, Resumen Anual, Presupuestos y Planes Ciclo; QA global | Un módulo por PR + QA | QA independiente; aceptación explícita de residuales; riesgos aceptados |

**Orden recomendado:** G1 → G2a → G2b → G3 → G4 → G5a → G5b. G1b, G2c, G3b y G4b son
decisiones separadas y no bloquean G1–G4. Cada PR de G1–G4 es pequeño, reversible y con un
único escritor de archivos compartidos; G5a/G5b son **programas de PRs por módulo**, no un
único PR.

### G1 · primer PR de desarrollo propuesto

- **Objetivo:** demostrar el lenguaje visual Graphite sin tocar la composición de pantallas.
- **Archivos:** `apps/web/src/graphite.css` [nuevo]; `apps/web/src/main.tsx` (import después de
  `style.css`); `tests/e2e/theme-graphite.spec.ts` (ampliar). Sin cambios en `themes.css`,
  `themes.ts`, `theme-boot.js`, `style.css`, `ui.tsx`, `Inicio.tsx` ni `Movimientos.tsx`.
- **Contenido:** sidebar/header, botones, inputs, badges, paneles, tablas `ui-table` y tarjetas
  `ui-data-list`, foco, hover, estados. Sin `!important`; todo bajo
  `html[data-theme="graphite-lime"]`.
- **Pruebas:** se ejecuta `apps/web/test/themes.test.ts` sin modificarlo (salvo coordinación
  con Casa); E2E de selector/persistencia; capturas 1440/820/390; computed styles (superficie,
  borde, foco, tabla, badge); regresión de los otros temas.
- **Criterio de salida:** Graphite se ve claramente distinto y premium en el shell y los
  componentes, sin cambios de layout funcional, API, datos ni DOM de páginas.

## 5. Archivos, tests y ownership

| Archivo | Uso Graphite | Riesgo de conflicto | Regla |
| --- | --- | --- | --- |
| `apps/web/src/graphite.css` | Todo el CSS Graphite scoped | Bajo: archivo nuevo | Un solo escritor por incremento |
| `apps/web/src/main.tsx` | Import de `graphite.css` | Medio: Casa importa `casa.css` y cambia el selector | Un import por PR; rebase; no tocar lógica |
| `apps/web/src/Inicio.tsx` | Composición G2a/G2b/G2c | **Alto**: Casa 1B futura y tests de estructura | Graphite primero; DOM semántico compartido; Casa 1B después |
| `apps/web/src/Movimientos.tsx` | Lista/detalle/formularios G3/G4/G4b | Medio: otros frentes UI | No cambiar contratos; PRs pequeños |
| `apps/web/src/style.css` | **Sin cambios globales** | Alto si se edita | Solo CSS scoped en `graphite.css` |
| `apps/web/src/ui.tsx` | Reutilizar; sin cambios previstos | Alto si se edita | Parar y coordinar si falta una primitiva |
| `apps/web/public/themes.css` | Bloque ya integrado en 1A | Alto: Casa añade bloque | **Sin cambios**; variables visuales locales en `graphite.css` |
| `apps/web/src/themes.ts` / `theme-boot.js` | Sin cambios | Alto: Casa añade `casa` | No tocar; rebase y tests estables |
| `apps/web/test/themes.test.ts` | Catálogo/AA de temas | **Alto**: Casa cambia el catálogo | Compartido; Casa 1A lo actualiza. Graphite no asume cuatro temas fijos |
| `apps/web/test/ui-dev07-tokens.test.ts` y otros specs que fijen cuatro temas o «Tema visual» | Regresión compartida | **Alto**: Casa 1A cambia catálogo/label | Actualización única con Casa; Graphite no duplica expectativas |
| `tests/e2e/theme.spec.ts` | Regresión de los temas base | **Alto**: label “Tema visual” → “Apariencia” | Actualizar una vez con Casa; no duplicar expectativas |
| `tests/e2e/theme-graphite.spec.ts` | Graphite: selector, persistencia, shell | Medio | Evitar número fijo de temas; usar rol/aria-label estable |
| `tests/e2e/inicio.spec.ts` | G2a/G2b | **Alto**: fija estructura actual | Reescribir selectores/estructura; preservar datos, ND, 500, 401, loading y sesión |
| `tests/e2e/movimientos.spec.ts` | G3/G4 | Medio: paridad exacta tabla/tarjeta | Mantener `expectMovementsParity`; G3b solo con autorización |

## 6. Coexistencia con Casa de cuentas

Estado observado: la autorización documental de Casa 1A está en `docs/ui-p1-casa`; la
implementación real está en `feat/ui-casa-1a` (no fusionada en la base analizada). Su alcance
1A es base visual (`casa.css`, tokens, selector «Apariencia»), sin Inicio/Movimientos.

Reglas de convivencia:

1. **No compartir selectores de tema.** Todo Graphite va bajo
   `html[data-theme="graphite-lime"]`; Casa bajo `html[data-theme="casa"]`. Nada de estilos
   globales nuevos.
2. **No tocar el catálogo.** Graphite G1–G4 no modifica `themes.ts` ni `theme-boot.js`; Casa
   añade `casa` en su PR. Los tests de Graphite no deben asumir un número fijo de temas.
3. **Un solo import por apariencia.** `main.tsx` importa `graphite.css` y Casa `casa.css`. Es
   una línea por PR; el conflicto se resuelve con rebase y orden de merge acordado.
4. **DOM semántico único en Inicio.** G2a define secciones estables
   (`data-inicio-section="hero|kpis|cycle|rail|position|coverage"`) y un DOM plano que Graphite
   reflúya con CSS Grid. G2c amplía el contrato con `recent|budget` si se autoriza. Casa 1B, si
   se autoriza, debe reutilizar ese DOM o añadir secciones en un cambio propio; **no** se crea
   un `InicioCasa.tsx`/`InicioGraphite.tsx` paralelo.
5. **Inicio/Movimientos con un solo escritor.** Casa 1A no toca los componentes, pero sí los
   tests de tema/label. Si Casa 1B (Inicio editorial) se autoriza, entra después de G2a/G2b o
   parte de esa rama; no en paralelo.
6. **Selector estable.** El label «Apariencia» de Casa puede convivir con Graphite; los E2E
   deben localizar el control por rol/aria-label estable, no por el texto «Tema». Cualquier
   cambio de label se hace una vez y se comparte.
7. **Sin refactor de `ui.tsx`/`style.css`.** Si una primitiva necesita un hook neutral, se
   acuerda entre Graphite, Casa y DEV-04; no se crea una variante por tema.
8. **Orden recomendado:** Casa 1A primero (estabiliza cinco opciones y tests) → Graphite G1
   rebasa → G2a/G2b → G3/G4 → Casa 1B. Si Casa 1A se retrasa, Graphite G1 puede avanzar con el
   import aislado y rebasar después; no se bloquea Inicio/Movimientos.

## 7. Pruebas y criterios de aceptación

### Por incremento

- `bun test apps/web`, typecheck y build.
- E2E específico: `theme-graphite.spec.ts`, `inicio.spec.ts`, `movimientos.spec.ts`.
- Capturas 1440/820/390 de la pantalla tocada y comparación con el JPEG del archivo.
- Comprobaciones computadas: superficie/fondo, borde, foco 3 px, badge, tabla, tarjeta,
  tipografía funcional ≥12 px, sin overflow de página.
- Regresión de Dark/Light/Hybrid: mismas capturas o computed styles; `theme.spec.ts` PASS.
- Cero errores de consola; mismas peticiones y mismos valores que antes del cambio, **salvo
  G2c**, que puede añadir cargas a endpoints existentes si se autoriza.
- G2a/G2b deben conservar los escenarios 500, 401, carga, cero verificado y degradado de
  `inicio.spec.ts`; G3/G4 deben conservar la paridad y los flujos de `movimientos.spec.ts`.

### Criterios visuales mínimos

- **G1:** shell y componentes con la jerarquía, superficies y acentos del prototipo; no solo
  cambio de tokens.
- **G2a:** hero y KPI reconocibles; liquidez, gasto, plan, margen, inversión y deuda con sus
  valores/ND; no aparece un porcentaje, sparkline o total inventado.
- **G2b:** tabla de ciclo, rail y posición con los ocho campos publicados; sin sumar Saldos
  entre vistas ni inventar total de Ahorro.
- **G3:** filtros y listado separados visualmente; tabla y tarjetas con la densidad, iconos y
  jerarquía del prototipo; paridad exacta y paginador coherente.
- **G4:** ficha y formularios con la presentación Graphite, sin cambios de campos, validación,
  foco al error ni payload.
- **G5a/G5b:** QA con la matriz AA/44 px/zoom 200 % existente y sus excepciones aceptadas, sin
  exigir movimiento nuevo; la reducción de movimiento existente se verifica, pero 1B sigue
  fuera de alcance. La aceptación final la declara QA independiente con evidencia, no el
  ejecutor.

## 8. Decisiones necesarias antes de G1

1. **Aprobar UI-G2 y el alcance G1–G4** (o ajustar prioridades). G5a/G5b se autorizan por
   módulo tras la QA de la primera ola; G1b es opcional.
2. **Inicio recientes/presupuesto:** ¿diferir a G2c o autorizar una carga de endpoints
   existentes? Recomendación: diferir; no añadir API.
3. **Detalle inline:** ¿G3 solo estiliza la ficha actual o se autoriza G4b? Recomendación:
   G3/G4 primero; inline después.
4. **Tarjetas móviles compactas:** mantener paridad exacta (recomendado) o autorizar G3b y
   actualizar `expectMovementsParity`.
5. **Shell:** mantener 236 px o aceptar una variante Graphite de 264 px. Recomendación:
   mantener 236 px y lograr la identidad con superficies/tipografía; evita regresiones.
6. **DOM de Inicio compartido con Casa 1B:** aprobar el contrato de secciones estables antes de
   G2a; alternativa: Casa 1B no reutiliza el DOM y se autoriza por separado.
7. **Tests compartidos:** confirmar que Casa 1A actualiza `themes.test.ts`, `theme.spec.ts` e
   `inicio.spec.ts` por el catálogo/label, y que Graphite rebasa sin duplicar esas expectativas.
8. **1B:** confirmar que sigue fuera de alcance; no se implementa movimiento nuevo.

## 9. Riesgos

| Riesgo | Nivel | Mitigación |
| --- | --- | --- |
| CSS global rompe otros temas | Alto | Todo scoped; sin `!important`; regresión visual/computed styles |
| Duplicar markup/lógica para parecerse al prototipo | Alto | Reutilizar primitivas y datos; DOM semántico único; sin `InicioGraphite.tsx` |
| Inventar métricas, totales o gráficos | Alto | Mapa de datos exacto; omitir/diferir; `racional` solo si existe |
| Conflicto con Casa en `main.tsx`/tests | Alto | Un import por PR; no tocar catálogo; orden de merge; tests compartidos una vez |
| Conflicto con DEV-04/otros frentes en `style.css`/`ui.tsx` | Medio | No editar; escalar si hace falta |
| Cambio de comportamiento en Movimientos (selección/detalle) | Medio | G3 visual con paridad; G3b/G4b separados y autorizados |
| G2 rompe `inicio.spec.ts` | Alto | Reescribir estructura preservando datos/ND/errores/sesión; revisión independiente |
| CI `required` no ejecuta web/E2E | Medio | Evidencia local + E2E focal; no confundir CI con aceptación visual |
| Deriva entre prototipo y app real | Medio | Capturas comparativas y criterios por bloque; QA independiente |

## 10. Recomendación

Aprobar **UI-G2** y autorizar como primer PR únicamente **G1 · Fundamento y shell**. Es el
incremento de menor riesgo: no toca Inicio/Movimientos, no cambia datos ni contratos y permite
validar el lenguaje visual Graphite antes de invertir en la composición de pantallas.

Después: G2a control/KPI, G2b ciclo/rail/posición, G3 Movimientos lista, G4 detalle/formularios
y G5a/G5b extensión/QA. G1b (sidebar ciclo/cobertura), G2c (recientes/presupuesto), G3b
(tarjetas compactas) y G4b (detalle inline) quedan como decisiones explícitas.

No se inicia ningún incremento en esta entrega.
