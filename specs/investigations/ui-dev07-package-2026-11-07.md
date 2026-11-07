# UI · DEV-07 — Temas y AA: paquete de especificación e inventario

**Estado:** propuesta documental **pendiente de autorización**; no implementa código, no añade
pruebas, no declara PASS y no autoriza merge. **Base verificada:** `origin/main` **`557cedb`**
(2026-11-07). **Fecha:** 2026-11-07.

- **Spec propietaria:** [ui-specification.md](../ui-specification.md), §4 (`DEV-07`), §5 y §6.
- **Guías:** [ui.md](../guidelines/ui.md), [quality.md](../guidelines/quality.md) y
  [security.md](../guidelines/security.md).
- **Antecedentes:** [ui-evolution-2026-11-04](ui-evolution-2026-11-04.md),
  [paquete DEV-04](ui-dev04-package-2026-11-06.md) y
  [paquete DEV-06](ui-dev06-package-2026-11-07.md).
- **Gate:** `DEV-07` **no está autorizado ni iniciado**. Cada incremento exige autorización,
  QA independiente y un gate de merge separado.
- **Límite de este documento:** solo especificación, inventario y planificación. No se crea
  código, rama de implementación, test, captura ni cambio de tablero.

> **Nota operativa:** en este checkout el ref local `main` está desfasado (`025adf8`); la base
> real es `origin/main` `557cedb`. Toda comparación debe usar el SHA, no el nombre `main`.

---

## 1. Inventario real

### 1.1 Superficie y componentes

| Elemento | Estado comprobado en `557cedb` |
| --- | --- |
| Navegación | **23 enlaces** en 4 grupos (`navigation.ts`); `/saldos/nuevo` y `/` no son enlaces |
| Temas | **3** (`light-s`, `dark-s`, `hybrid-s`) × **66 tokens** semánticos en `themes.css` |
| Selector y arranque | `themes.ts`/`main.tsx`; preferencia `mf-theme`; inicial `dark-s`; `theme-boot.js` sin parpadeo |
| Primitivas UI | **16 exportaciones** en `ui.tsx` (15 componentes y el helper `focusFirstInvalidField`): `Alert`, `Switch`, `PageHead`, `Tag`, `TableScroll`, `Table`, `DataList`, `Amount`, `Badge`, `Metric`, `EmptyState`, `Skeleton`, `Field`, `FormSection`, `FormGrid` |
| CSS | `style.css`: **5.741 líneas**, 37 bloques comentados, 247 declaraciones `font-size`, 801 usos de `var(--…)`, un solo hex de fallback (`var(--warning, #6b5412)`) |
| Secciones DEV | DEV-01/02/03/04/05 tienen bloque propio; **no existe bloque DEV-06 ni DEV-07** |
| Catálogo | **No existe** un catálogo formal de componentes; `ui.test.tsx` cubre marcado y algunos contratos CSS |
| Evidencia versionada | **0 capturas** en Git; `artifacts/` está ignorado |

Las cinco pantallas de la matriz no son todo el producto. El resto de rutas (E4.5, E4.7, E4.8,
E4.10, E4.11, catálogos E1–E4) queda **fuera de la matriz** y solo entra como regresión.

### 1.2 Cobertura actual de las cinco pantallas

| # | Pantalla | Ruta | Implementación actual | Base 3 temas × 2 anchos | Estado crítico |
| --- | --- | --- | --- | --- | --- |
| 1 | Inicio (E4.6) | `/inicio` | `Inicio.tsx`; `Metric`, `Amount`, `Badge`, `Skeleton` | **6/6** (`artifacts/e4-6/inicio-*`) | Cero y degradado: **12** capturas (3 temas × 2 anchos × 2 estados) |
| 2 | Movimientos | `/movimientos` | `Movimientos.tsx`; `Table`/`DataList` y `Field`/`FormSection` | **0/6**; solo capturas por defecto (`dark-s`), sin bucle de temas | Sin captura por tema |
| 3 | Saldos · ficha | `/saldos/{id}` | `Saldos.tsx` (`SaldoDetail`); `FormSection`/`FormGrid` | **0/6**; solo capturas por defecto | Sin captura por tema |
| 4 | Saldos · alta/edición | `/saldos/nuevo`, `/saldos/{id}/editar` | `SaldoForm.tsx`; `Field`/`FormSection`/`FormGrid` | **0/6**; solo capturas por defecto | Sin captura por tema |
| 5 | Cierre (E4.9) | `/cierre` | `Cierre.tsx`; `TableScroll`, `Tag`, `Badge` local; tablas E4.9 aún sin `Table`/`DataList` (DEV-06 I4) | **6/6** de preflight (`artifacts/e4-9/preflight-*`) | Bloqueado: **1** captura (390, un tema) |

**Cómputo real:** **12/30** capturas base de la matriz. Faltan 18 (Movimientos, ficha y
formulario). Las 6 de `theme.spec.ts` son del listado de Saldos, no de una de las cinco
pantallas; las de `navigation.spec.ts` son del shell; las de DEV-05 I4/I5a son de otros
catálogos y no sustituyen la matriz.

**Críticos:** existen **13** capturas adicionales (12 de Inicio en dos estados y 1 de Cierre
bloqueado) frente a las **15** exigidas (5 pantallas × 3 temas). No hay crítica de Movimientos,
ficha ni formulario; la de Cierre no cubre los tres temas ni ambos anchos.

### 1.3 Pruebas existentes y lo que realmente cubren

| Prueba | Cobertura real | Límite |
| --- | --- | --- |
| `theme.spec.ts` | 3 temas, persistencia, arranque sin flash, shell y listado de Saldos; 6 capturas | No audita las cinco pantallas ni contraste/teclado/zoom |
| `navigation.spec.ts` | 23 enlaces, menú móvil, `Escape`, foco en primer enlace, 3 temas × 2 anchos | Solo el shell; no recorre las pantallas |
| `inicio.spec.ts` | 3 temas × 2 anchos; contraste de texto de Inicio; un `Tab`; cero/degradado | Solo Inicio; no componentes, foco ni zoom |
| `movimientos.spec.ts` | 390/1440, overflow, 2 pulsaciones de teclado | Sin bucle de temas ni contraste |
| `catalog.spec.ts` | Saldos listado/ficha/formulario, 390/1440, foco y algunos `toHaveCSS` | Sin bucle de temas; el contraste que mide usa la **paleta histórica** (incl. `#8DBB2E`), no los tokens vigentes |
| `cierre.spec.ts` | Preflight y foto 3 temas × 2 anchos; bloqueado a 390 | Sin contraste ni teclado; comparte archivo con E4.10 |
| `ui-dev05-i4/i5a.spec.ts` | Catálogos y dos formularios, 3 temas × 2 anchos, foco/error | No son las cinco pantallas |

`inicio.spec.ts` y `resumen-anual.spec.ts` contienen dos copias de un medidor de contraste de
texto (mínimo 4.5). No comprueban texto grande a 3:1, bordes, foco ni estados de componente.
`ui.test.tsx` valida marcado y reglas CSS, pero no mide contraste renderizado.

### 1.4 Foco y teclado

- Existe regla global `:focus-visible` con `outline: 3px solid var(--focus)` y offset 3 px;
  `h1` programático no dibuja outline. Hay estilos locales en `.focus-alert`, `.inversiones-impact h2`
  y `.cierre-photo-head h2`.
- Pruebas reales: menú móvil (abrir, `Tab`, `Escape`, devolver foco), `Tab` en Inicio, foco al
  primer error en formularios DEV-05 y algunas activaciones por teclado. **No hay recorrido
  completo de las cinco pantallas**, ni comprobación de que cada parada tenga foco visible, ni
  contraste del anillo de foco en los tres temas.
- Los enlaces de acciones dentro de tablas/tarjetas no tienen una comprobación sistemática de
  objetivo ≥ 44 px; solo hay una regresión explícita para `.debt-open` en `ui.test.tsx`.
- `TableScroll` es una región enfocable (`tabIndex=0`) y está probada por marcado, pero no se
  comprueba su foco visible en cada pantalla.

### 1.5 Zoom y movimiento reducido

- **No existe** ninguna prueba de zoom 200 % en el repositorio. Tampoco hay comprobación de
  reflow a 720 px CSS (equivalente a 200 % sobre 1440).
- **No existe** ninguna prueba con `emulateMedia({ reducedMotion: "reduce" })`.
- El CSS solo declara una transición, `button { transition: background-color 0.12s; }`, dentro
  de `@media (prefers-reduced-motion: no-preference)`. No hay `@keyframes` ni animación JS.
  El riesgo es bajo, pero no está verificado ni cubierto por una prueba.

### 1.6 Contraste: auditoría estática de tokens

Se midieron **47 pares representativos de tokens × 3 temas = 141 comprobaciones** (texto normal
a 4.5; foco y componente a 3). Resultado:

- **140/141 pasan.**
- **1 falla:** en `hybrid-s`, el anillo global `--focus` (`#1e6f7a`) sobre el sidebar
  (`#1f1f1f`) da **2,83:1**, por debajo de 3:1. Afecta a enlaces del sidebar y al foco del menú.
- `--sidebar-focus` (`#57b2ba`) existe y da **6,66:1** sobre el sidebar de `hybrid-s`, pero
  **no se usa**. Es la corrección natural sin tocar la paleta.
- `--control-border` sobre superficie da **3,24–3,65:1** y cumple el límite de componente.
  `--border` es un separador decorativo (1,4–1,6:1) y no se usa como único límite de control.
- `--focus` sobre superficie da **5,34–7,44:1** en los tres temas.
- Los pares de texto, estados (`positive`, `negative`, `warning`, `error`), acción y sidebar
  pasan en la muestra. No se ha medido el DOM completo de las cinco pantallas.

**Límite:** esta auditoría es estática y representativa; no sustituye el contraste computado
por pantalla. De las cinco pantallas, solo Inicio tiene medición DOM de texto (mínimo 4.5);
E4.7 conserva otra copia fuera de la matriz. Faltan Movimientos, ficha, formulario y Cierre, y
faltan componentes, bordes y foco.

### 1.7 Tipografía funcional y deuda visible

`style.css` conserva **47 declaraciones `font-size` por debajo de 12 px**. **16** afectan a las
cinco pantallas o a primitivas que estas consumen:

| Ámbito | Declaraciones < 12 px |
| --- | --- |
| Inicio | 12 (`inicio-readonly` 10, `inicio-clase` 9, `inicio-estado` 9, metadatos 10–11) |
| Cierre | 1 (`cierre-badge` 11) |
| Primitivas compartidas | 3 (`ui-badge` 10, `ui-amount-note` 11, `ui-metric-class` 9) |

No todas son texto funcional: algunas son decorativas o metadatos secundarios. I1 debe
clasificarlas; las funcionales bajan a 12 px. El resto de declaraciones < 12 px pertenece a
otras pantallas y queda como deuda residual fuera de la matriz.

---

## 2. Objetivo DEV-07

Cerrar la paridad visual y la evidencia AA de las cinco pantallas, **sin cambiar la UX
funcional ni ningún contrato**:

1. **Matriz completa:** 30 capturas base (5 × 3 temas × 2 anchos: 390×844 y 1440×1000) con los
   mismos datos ficticios y el mismo contenido; 15 capturas críticas adicionales.
2. **AA:** texto normal ≥ 4.5:1; texto grande y componentes ≥ 3:1 en `light-s`, `dark-s` y
   `hybrid-s`; foco visible; teclado completo; objetivos ≥ 44 px; zoom 200 %;
   `prefers-reduced-motion`; texto funcional ≥ 12 px; **cero scroll horizontal de página** a 390
   y en el ancho equivalente al zoom.
3. **Sin regresión financiera:** `null ≠ 0`; `ND`, `0,00 €`, `No aplica` y `Sin datos`
   distinguibles; ninguna cifra, estado, motivo, cobertura o cálculo cambia.
4. **Sin cambios de contrato:** API/DTO, rutas, permisos, sesión, cálculos, redondeos,
   formateo, filtros, paginación, acciones, textos funcionales y orden de secciones.
5. **Evidencia, no aprobación:** las capturas y logs se adjuntan; no declaran PASS ni cierran
   E4.6/E4.9 ni la aceptación funcional.

**Fuera de DEV-07:** rediseñar, recomponer o reordenar pantallas (eso es DEV-06); cambiar
paletas, tokens cromáticos, selector o temas; añadir rutas, componentes, dependencias o datos.

---

## 3. Incrementos y ownership

Regla común: **secuencia estricta I1 → I2 → I3 → I4 → I5**. Un solo escritor de `style.css`;
`themes.css` es **solo lectura** en todos los incrementos. No se paraliza con DEV-05 I5b,
DEV-06 ni Fotos. Cada PR se rebasa desde `origin/main` y confirma que no hay otro escritor
activo de `style.css`.

### I1 — Auditoría y línea base · S

- **Objetivo.** Medir el estado real de las cinco pantallas antes de corregir: contraste
  computado, tamaños < 12 px, objetivos < 44 px, overflow a 390/1440/720, teclado y
  `prefers-reduced-motion`; clasificar texto funcional/decorativo.
- **Ownership.** Ingeniero de pruebas/QA; **no escribe** `style.css`, `themes.css`, `ui.tsx`
  ni pantallas.
- **Archivos.** Helper reutilizable en `tests/e2e/` (solo test) y un informe de línea base en
  el PR/registro QA. No se mergea una prueba que falle en `main`: la línea base es diagnóstica y
  las aserciones duras entran en I2/I4.
- **Salida.** Tabla por pantalla × tema × ancho con ratios mínimos, elementos < 12 px, objetivos
  < 44 px, overflow y paradas de teclado; lista explícita de excepciones manuales.
- **Riesgo.** Confundir un fallo de medición con un fallo visual; toda excepción se revisa a mano.

### I2 — Correcciones de tokens y componentes · S/M

- **Objetivo.** Corregir lo compartido antes de tocar pantallas: foco del sidebar en `hybrid-s`
  usando `--sidebar-focus`; subir a 12 px las primitivas y textos funcionales detectados;
  ajustar `white-space`/envoltura de badges; garantizar objetivos ≥ 44 px; dejar
  `prefers-reduced-motion` como guarda.
- **Ownership.** Implementador UI **A**, único escritor de `style.css`. No toca `ui.tsx`; si una
  corrección exige marcado, se detiene y se eleva a DEV-02/DEV-05.
- **Archivos.** `apps/web/src/style.css` (sección aditiva `UI · DEV-07 — temas y AA`);
  `apps/web/test/ui.test.tsx` solo si una aserción CSS existente cambia de forma consciente.
  **No** `themes.css`, `theme-boot.js`, `themes.ts`, `main.tsx`, `api.ts`, `format.ts`.
- **Pruebas.** `bun run typecheck`; `bun test apps/web/test/ui.test.tsx`; `theme.spec.ts` e
  `inicio.spec.ts`; capturas antes/después de las pantallas afectadas.
- **Salida.** Sin cambios de color/tema; foco del sidebar ≥ 3:1; textos funcionales de las
  primitivas a 12 px; sin overflow nuevo a 390; ninguna cifra o estado alterado.
- **Riesgo.** Subir 9–11 px a 12 px aumenta la altura de badges y metadatos y puede desbordar
  tarjetas estrechas a 390; se mide y se ajusta solo la envoltura, no el contenido.

### I3 — Pantallas clave · M

- **Objetivo.** Resolver el residuo propio de cada pantalla que I2 no pueda corregir de forma
  global: contraste/foco/espaciado/objetivos y ajuste de composición **solo visual**, sin
  reordenar secciones ni cambiar textos, columnas, filtros o acciones.
- **Ownership.** El mismo implementador **A**; un solo escritor de `style.css` durante toda la
  ventana. No se paraleliza con DEV-06.
- **Archivos permitidos, solo si hace falta un hook de clase:** `Inicio.tsx`,
  `Movimientos.tsx` (solo `MovementList`), `Saldos.tsx` (solo `SaldoDetail`), `SaldoForm.tsx`,
  `Cierre.tsx` (solo bloques E4.9). `style.css` con clases `ui-dev07-*`. **No** `ui.tsx`,
  `main.tsx`, `api.ts`, `format.ts`, `themes.css` ni ningún `e410-*`/`Fotos`.
- **Pruebas.** Specs propietarios de cada pantalla (`inicio`, `movimientos`, `catalog`,
  `cierre`) + unitarias DEV-05 que conservan IDs, ayuda/error, foco y payload.
- **Salida.** Las cinco pantallas pasan AA en los tres temas y ambos anchos; sin cambios de
  contrato; Cierre E4.9 sin tocar E4.10; Saldos sin tocar payload/idempotencia/revisión.
- **Riesgo.** `Cierre.tsx` mezcla E4.9/E4.10 y `Movimientos.tsx` contiene lista, ficha y
  formulario; el diff se limita a los componentes nombrados y se revisa con guarda de líneas
  `e410-*`.

**No se crea I3a/I3b por adelantado.** Si I1 demuestra que una pantalla necesita un cambio
propio, se divide I3 por pantalla con autorización; si no hay residuo, I3 se reduce a evidencia
y no se abre un PR vacío.

### I4 — Matriz de evidencia y automatización · M

- **Objetivo.** Producir 30 + 15 capturas y convertir las comprobaciones AA en pruebas
  repetibles: contraste computado, foco/teclado, zoom, reduced motion, overflow y tamaño
  mínimo; ejecutar la matriz completa en Linux.
- **Ownership.** Ingeniero de pruebas/QA; **no escribe producción**. Si una prueba falla, se
  devuelve a I2/I3; no se relaja la aserción ni se actualiza la captura para ocultarlo.
- **Archivos.** `tests/e2e/` (helper y specs; extensión de los specs propietarios o un
  `ui-dev07.spec.ts` que reutilice los recorridos existentes, sin duplicar fixtures);
  `apps/web/test/` solo para una guarda estática de tokens; actualización consciente de la
  comprobación histórica de `catalog.spec.ts` si se decide sustituirla por tokens vigentes.
- **Salida.** 30 base + 15 críticas; log de contraste por pantalla/tema/ancho; recorrido de
  teclado; evidencias de zoom/reduced motion; `python3 scripts/verify --full` en Linux.
- **Riesgo.** Runtime y flakiness: la matriz multiplica estados de Cierre y Movimientos. Se
  reparte por pantalla, se reutiliza un login por servidor y se mantiene `workers: 1`; no se
  añaden reintentos que oculten fallos.

### I5 — Cierre documental · S

- **Objetivo.** Actualizar `guidelines/ui.md` con el contrato AA vigente, el procedimiento de
  medición, el catálogo de las 15 primitivas (más el helper de foco) y la deuda residual;
  enlazar la matriz y los comandos. No existe catálogo formal: se añade como sección, sin crear
  un documento redundante.
- **Ownership.** Responsable de documentación; no toca CSS ni código. El coordinador mantiene
  el tablero; este paquete no lo edita.
- **Salida.** Guía y catálogo actualizados; matriz enlazada; límites declarados (sin auditoría
  WCAG completa, sin lector de pantalla, solo Chromium). **No declara PASS ni cierra DEV-07.**
- **Riesgo.** Documentar como cumplido lo que solo es evidencia; el texto distingue "medido" de
  "aprobado".

---

## 4. Pruebas, matriz y evidencia

### 4.1 Matriz visual

Convención: `artifacts/ui-dev07/base/{pantalla}-{tema}-{ancho}.png`, con pantallas `inicio`,
`movimientos`, `saldo-ficha`, `saldo-form`, `cierre`; temas `light-s`, `dark-s`, `hybrid-s`;
anchos `1440x1000` y `390x844`. **30 capturas base.**

Críticas: `artifacts/ui-dev07/estados/{pantalla}-{estado}-{tema}.png`. **15 capturas** (una por
pantalla y tema, en el ancho donde el estado es representativo):

| Pantalla | Estado crítico | Ancho |
| --- | --- | --- |
| Inicio | Cero verificado | 390 |
| Movimientos | Sin coincidencias | 390 |
| Saldos ficha | S000 / posición no disponible | 390 |
| Saldos alta/edición | Error de validación con foco | 390 |
| Cierre | Bloqueado, sin foto parcial | 1440 |

Las capturas 1440 de los estados críticos son evidencia adicional, no parte de las 15. Todas
usan los mismos fixtures ficticios, el mismo contenido y el mismo `data-theme`; se reinicia
scroll y se cierran `details` antes de la captura, salvo que el estado los requiera.

### 4.2 Contraste automatizado, sin dependencias nuevas

**Viable.** Ya hay precedente en `inicio.spec.ts` y `resumen-anual.spec.ts` con Playwright puro.
I4 extrae un helper y lo aplica a las cinco pantallas:

- Recorrer nodos de texto visibles; excluir `script/style/noscript`, `aria-hidden`, `sr-only`,
  texto vacío y controles deshabilitados.
- Calcular luminancia relativa WCAG y componer fondos con alfa; si hay imagen/gradiente,
  marcar para revisión manual y fallar de forma explícita, no ignorar.
- Umbral según tamaño/peso computados: 4.5 para texto normal; 3 para ≥ 24 px o ≥ 18.66 px en
  negrita; 3 para bordes de control, iconos de estado y anillo de foco.
- Reportar `pantalla/tema/ancho/selector/texto/ratio`; el mínimo por pantalla debe cumplir.
- Añadir una guarda estática de tokens en Bun (sin navegador) para los pares que no dependen
  del DOM y para detectar regresiones de paleta sin abrir un cuarto tema.

**No entra:** `axe-core`, `@axe-core/playwright` ni otra dependencia; auditoría WCAG completa;
lector de pantalla; Firefox/WebKit. Si se quiere después, es una decisión separada.

### 4.3 Teclado, zoom y reduced motion

- **Teclado:** en cada pantalla, a 390 y 1440, recorrer con `Tab` todos los interactivos hasta
  volver al primero; comprobar foco visible, `outline`/`box-shadow` ≥ 3:1 contra el fondo
  adyacente, `Enter`/`Space`, `Escape` en menú, skip link y ausencia de trampa. El recorrido
  completo se hace en `dark-s` (el tema no cambia el orden); el color del foco se muestrea en
  los tres temas.
- **Zoom 200 %:** emular el layout a **720×500 CSS** (200 % sobre 1440×1000) y comprobar que no
  hay scroll horizontal de página, que no se pierde contenido y que el menú móvil sigue
  operativo. Es una equivalencia de viewport, no zoom nativo del navegador; se declara así.
- **Reduced motion:** `page.emulateMedia({ reducedMotion: "reduce" })` en las cinco pantallas;
  comprobar `transition-duration: 0s` y `animation-name: none` en una muestra de controles y
  que no hay movimiento dependiente de JS. Con `no-preference` se conserva la transición actual.

### 4.4 Comandos

```text
bun install --frozen-lockfile
bun run typecheck
bun run build
bun test apps/web/test/ui.test.tsx
bun run test:e2e tests/e2e/theme.spec.ts tests/e2e/inicio.spec.ts
bun run test:e2e tests/e2e/ui-dev07.spec.ts   # o los specs propietarios extendidos
python3 scripts/verify --full                  # Linux; incluye E2E completos
```

`python3 scripts/verify --base <base> --head <sha>` sirve para el PR documental o de test;
`--full` es obligatorio para el candidato de cierre en Linux. El perfil `critical` no ejecuta
E2E: no se usa como evidencia de la matriz.

---

## 5. Riesgos, deuda residual y qué NO entra

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| DEV-06 aún no implementado (solo existe el paquete `de9597e`) | Alto: la composición de las cinco pantallas puede cambiar y invalidar la línea base | DEV-07 no empieza hasta que DEV-06 esté autorizado, implementado y fusionado; se re-inventaría al rebasar |
| DEV-05 I5b (Inversiones) sin fusionar (`261ae78`) | Medio: rama paralela y `style.css` compartido | No se toca Inversiones; se espera su merge y se rebasa; DEV-07 no depende de su UI |
| Paleta y tokens cerrados | Alto: un par que falle no se corrige cambiando `themes.css` | Corregir el uso del token (p. ej. `--sidebar-focus`), no la paleta; si no hay token válido, se eleva y se detiene |
| Correcciones globales de primitivas | Alto: afectan a pantallas fuera de la matriz | Sección aditiva, alcance medido, regresión completa y capturas de pantallas no clave |
| Contraste computado con alfa/gradientes/imágenes | Medio: falsos positivos/negativos | Composición de alfa, lista de excepciones manual y fallo explícito; revisión QA |
| Cierre comparte archivo con E4.10 | Alto: romper reapertura/re-cierre | Solo bloques E4.9, clases `cierre-e49-*`/`ui-dev07-*`, guarda de diff `e410-*`, regresión E4.10 |
| Fotos/E4.11 y resto de rutas | Medio: regresión por CSS compartido | No se editan; solo regresión; si una corrección global las afecta, se revisa y se declara |
| Runtime de la matriz (30+15, Cierre grande) | Medio: timeout/flakiness | Repartir por pantalla/servidor, un login por servidor, `workers: 1`, sin retries que oculten fallos |
| `artifacts/` ignorado | Medio: evidencia no versionada | Adjuntar capturas/logs al PR y al registro QA; manifiesto con SHA y rutas; no commitear artefactos |
| Ref local `main` desfasado | Bajo/medio: comparación incorrecta | Usar `origin/main`/SHA `557cedb`; no confiar en `main` local |
| `catalog.spec.ts` mide la paleta histórica | Medio: falsa confianza | I4 añade la comprobación de tokens vigentes; la sustitución consciente se revisa, no se borra sin reemplazo |

### Deuda residual que DEV-07 no cierra

- Las pantallas fuera de las cinco conservan texto < 12 px y AA no medido; quedan fuera de la
  matriz y solo se vigilan por regresión.
- No hay auditoría WCAG completa, lector de pantalla, Firefox/WebKit ni pruebas con datos
  reales. El alcance es Chromium, fixtures ficticios y medición automatizada + revisión manual.
- El zoom se emula por viewport equivalente; no se declara zoom nativo del navegador.
- Los separadores `--border` por debajo de 3:1 se consideran decorativos; si algún control
  depende solo de ellos, se corrige en I2.
- No se automatizan todos los estados posibles: solo el crítico por pantalla/tema.
- La evidencia vive en `artifacts/` (ignorado) y en el PR/registro QA; no en Git.
- DEV-07 no cierra E4.6, E4.9, E4.10 ni E4.11; sus aceptaciones siguen separadas.

### Qué NO entra

- **Nada de DEV-06:** no se recompone, reordena ni rediseña Inicio, Movimientos, ficha,
  formulario o Cierre; DEV-07 solo corrige AA sobre la composición ya aprobada.
- **Nada de E4.10/E4.11:** no se tocan reapertura, re-cierre, `e410-*`, `Fotos.tsx`,
  `fotos/*`, `/fotos`, agregados ni comparaciones. Solo regresión.
- **Nada de contratos:** API/DTO, rutas, permisos, sesión, cálculos, redondeos, formateo,
  estados, filtros, paginación, acciones, textos funcionales, IDs ni orden de secciones.
- **Nada de temas:** `themes.css`, paletas, tokens cromáticos, `theme-boot.js`, `themes.ts`,
  selector, orden de temas, tema inicial o cuarto tema.
- **Nada de arquitectura:** `ui.tsx`, `main.tsx`, `api.ts`, `format.ts`, dependencias nuevas,
  migraciones, datos reales, despliegue o CI nuevo.
- **Nada de cierre prematuro:** declarar PASS, cerrar DEV-07, fusionar o auto-fusionar sin
  autorización explícita y QA independiente.

---

## 6. Secuencia, QA y gates

- **Secuencia:** I1 → I2 → I3 → I4 → I5, estrictamente secuencial por `style.css` y por la
  dependencia de DEV-06. No hay paralelismo seguro mientras un solo archivo concentre estilos.
- **Dependencias:** DEV-01…DEV-06 integrados (DEV-06 **no** lo está a fecha de este paquete),
  DEV-05 I5b fusionado o descartado, y confirmación de que no hay otro escritor de `style.css`.
- **QA independiente por incremento:** revisa diff y evidencia, no el resumen del autor;
  comprueba cifras/estados, contratos, capturas, contraste, teclado, zoom y regresiones;
  emite APTO / APTO CON RESERVAS o devuelve.
- **Merge separado:** cada PR requiere aprobación explícita e identificable del usuario; el
  permiso de push no autoriza merge y DEV-07 no se auto-fusiona.
- **Cierre de DEV-07:** solo con 30+15 capturas, AA medido, teclado/zoom/reduced motion
  verificados, `python3 scripts/verify --full` en Linux y QA independiente. La matriz es
  evidencia, no aprobación; el cierre no reabre E4.6/E4.9/E4.10/E4.11.

**Estado de este paquete:** documental, sin código ni pruebas nuevas. No inicia DEV-07 y no
crea un incremento artificial: si I1 no encuentra residuo, I3 se reduce a evidencia; si I4
encuentra un fallo, se reabre I2/I3 con autorización, no se inventa un I6.
