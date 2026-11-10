# Ui guidelines

## Contrato visual vigente — 2026-11-06

Esta sección sustituye como **estado vigente** cualquier referencia posterior a «tema claro
exclusivamente» o a la paleta verde histórica. Las secciones siguientes se conservan como
historia de E1.1–E1.5 y no reabren decisiones.

> **Enmienda Graphite Lime (2026-11-10).** Se aprueba `graphite-lime` («Grafito») como cuarto
> tema y se autoriza su incorporación aditiva 1A. Dark, Light y Hybrid conservan sus
> identidades, tokens y comportamiento; `dark-s` sigue siendo el tema inicial y `mf-theme` la
> clave de persistencia. La enmienda no reabre los tres temas ni autoriza otros candidatos, la
> integración visual completa, 1B (`prefers-reduced-motion`), merge o despliegue.

### Temas y tokens

- Temas **Dark (`dark-s`), Light (`light-s`) y Hybrid (`hybrid-s`)** implementados en `0b8aade`
  (#198); conservan identidad, tokens y comportamiento. **Graphite Lime (`graphite-lime`,
  «Grafito»)** queda aprobado como cuarto tema por la enmienda del 2026-11-10. El catálogo solo
  se amplía por decisión expresa; no se reabren los tres temas.
- Tokens semánticos en `apps/web/public/themes.css`; los componentes consumen `var(--…)` y no
  conocen el tema. `style.css` conserva un único hex de fallback
  (`var(--warning, #6b5412)`); el resto es tokenizado.
- Selector existente (`themes.ts`/`main.tsx`), preferencia persistida y tema inicial `dark-s`;
  no se cambia el mecanismo. La enmienda añade una opción Graphite al final del catálogo, sin
  reordenar los tres temas ni sustituir `mf-theme`.

### Tipografía, shell y espaciado

- Tipografía de sistema; `Inter` está declarada pero no se carga. La escala tipográfica, el
  espaciado y los radios se fijan en `UI · DEV-01`; objetivo: texto funcional ≥ 12 px y un
  consumo real de `--space`/`--radius`.
- Shell: sidebar 236 px, contenido `max-width: 1450px`, breakpoints 1050/760 px y móvil 16 px.

### Accesibilidad

- **Objetivo de los bloques UI** (no una declaración de cumplimiento actual): texto normal
  ≥ 4.5:1 y grande/componentes ≥ 3:1 en los tres temas existentes; foco visible; objetivos
  ≥ 44 px; zoom 200 %; `prefers-reduced-motion`; sin scroll horizontal de página a 390 px.
  Graphite Lime se mide en su QA específico de 1A; no se deduce de la matriz histórica.
  Fuera de la matriz el CSS conserva controles y textos por debajo de esos umbrales;
  `DEV-01`–`DEV-05` corrigieron la base y `DEV-07` mide la matriz y declara la deuda residual
  (véase «Evidencia AA, medición y catálogo de primitivas (DEV-07)»).
- La excepción de contraste de #7 se conserva como registro histórico; los temas actuales deben
  cumplir AA con sus propios tokens.

### Formularios y estados

- Se conservan las reglas vigentes de formularios, foco, errores, borrador, IDs inmutables y
  distinción entre ausencia, cero, `ND`, `No aplica` y `Sin datos`. No se convierten ausencias en
  cero ni se inventan importes.

### Evidencia AA, medición y catálogo de primitivas (DEV-07)

Estado: **evidencia medida, no aprobación ni cierre**. Esta sección recoge el contrato AA que
aplican las pruebas de `DEV-07`, el procedimiento reproducible, el catálogo de primitivas y la
deuda residual. No declara PASS, no cierra `DEV-07` ni E4.6/E4.9/E4.10/E4.11 y no sustituye la
QA independiente. La autoridad funcional sigue en la [spec UI](../ui-specification.md) §4 y el
plan en el [paquete DEV-07](../investigations/ui-dev07-package-2026-11-07.md).

#### Contrato AA vigente

- **Contraste:** texto normal ≥ 4.5:1 y texto grande ≥ 3:1 (`≥ 24 px`, o `≥ 18.66 px` en negrita)
  en `light-s`, `dark-s` y `hybrid-s`; el anillo de foco se muestrea y exige ≥ 3:1. Los bordes de
  los campos de formulario visibles (`input`, `select`, `textarea`) y los glifos de estado
  (`aria-hidden` de `Badge`, `Amount` y `EmptyState`) también se miden y exigen ≥ 3:1; se
  comparan contra el fondo exterior y el relleno interior y se toma el menor ratio. Los botones,
  enlaces y el `Switch` se identifican por su texto visible y quedan cubiertos por el contraste
  de texto y el anillo de foco, no por un borde ornamental. La medición compone fondos con alfa;
  un fondo con imagen/gradiente queda sin resolver y **falla de forma explícita**, no se ignora.
- **Foco:** cada parada de teclado tiene foco visible; el `outline`/`box-shadow` muestreado
  mantiene ≥ 3:1 contra el fondo adyacente en los tres temas. El sidebar de `hybrid-s` usa
  `--sidebar-focus` (6,66:1), no el anillo global (2,83:1 sobre ese fondo).
- **Texto funcional ≥ 12 px** en las cinco pantallas; la tagline de marca de 7–8 px se clasifica
  como decorativa y no cuenta como texto funcional.
- **Objetivos ≥ 44×44 px** para todo control visible. Allowlist explícita: solo enlaces `a` con
  `display: inline*` dentro de prosa/celda (`p`, `li`, `dd`, `dt`, `small`, `summary`, `td`,
  `th`) y en `#main` pueden medir menos; cualquier otro objetivo < 44 px falla. Es una excepción
  de tamaño pendiente de revisión manual, no un AA declarado.
- **Overflow:** sin scroll horizontal de página a 390×844, 1440×1000 y 720×500, con `<details>`
  cerrados y abiertos.
- **Movimiento reducido:** con `prefers-reduced-motion: reduce`, `transition-duration: 0s` y
  `animation-name: none`; la matriz comprueba estilos computados, no movimiento producido por
  JavaScript.
- **Zoom:** 720×500 es la **equivalencia de viewport** a 200 % sobre 1440×1000, no zoom nativo del
  navegador; se declara así.
- **Sin cambio financiero:** la matriz no altera cifras, estados, motivos ni contratos; `null ≠ 0`
  y `ND`, `0,00 €`, `No aplica` y `Sin datos` siguen siendo distinguibles.

**Alcance medido:** cinco pantallas (`inicio`, `movimientos`, `saldo-ficha`, `saldo-form`,
`cierre`) × tres temas × 1440×1000 y 390×844, más 720×500 para la equivalencia de zoom.
**Solo Chromium**, fixtures ficticios, sin lector de pantalla, sin Firefox/WebKit y sin
auditoría WCAG completa.

#### Procedimiento de medición reproducible

Requisitos: Bun 1.4.3, `bun install --frozen-lockfile`, `git`, `age` y Chromium de Playwright; `python3.12 scripts/verify --full` falla si faltan prerrequisitos. Los comandos se ejecutan desde la raíz
del repositorio; `tests/e2e/ui-dev07.spec.ts` forma parte del E2E normal (`bun run test:e2e`).

| Paso | Comando | Salida |
| --- | --- | --- |
| Línea base diagnóstica | `UI_DEV07_AUDIT=1 bunx playwright test tests/e2e/ui-dev07-baseline.spec.ts` | `artifacts/ui-dev07-baseline/report.json`; sin capturas ni aserciones duras |
| Matriz AA | `bunx playwright test tests/e2e/ui-dev07.spec.ts` | 30 capturas base en `artifacts/ui-dev07/base/` y 15 críticas en `artifacts/ui-dev07/critical/`; aserciones duras |
| Verificación completa | `python3.12 scripts/verify --full` | candidato de cierre; **Linux**; incluye los E2E |

- La línea base es **opt-in**: sin `UI_DEV07_AUDIT=1` no registra pruebas y es solo diagnóstica.
  La matriz es la que convierte contraste de texto, bordes de campo, glifos de estado, overflow
  (con `details` cerrados y abiertos), objetivos, texto funcional, teclado, anillo de foco y
  movimiento reducido en aserciones duras. El teclado se recorre a 1440 y 390; a 720 se comprueban
  contraste, overflow, objetivos y que el menú móvil sigue operativo.
- `tests/e2e/ui-dev07.spec.ts` incluye además pruebas focales de activación: `Enter` y `Space`
  abren/cierran `<details>`, activan el `Switch`, el botón de envío y el de actualización del
  cierre, y abren/cierran el menú móvil sin perder el foco (el envío lo mueve al primer campo
  inválido, según su contrato de errores).
- `python3.12 scripts/verify --full` es el comando del candidato de cierre y se ejecuta en Linux.
  El perfil `critical` no ejecuta E2E y no sirve como evidencia de la matriz; para un PR
  documental o de test puede usarse `--base <sha> --head <sha>`.
- `artifacts/` está ignorado por `.gitignore`: capturas y `report.json` no se versionan. Se
  adjuntan al PR o al registro QA; la matriz no se convierte en aprobación por ejecutarse.

#### Catálogo de primitivas

Las quince primitivas de `apps/web/src/ui.tsx` y el helper de foco. La tercera columna describe
el contrato accesible y lo que la matriz mide cuando la primitiva aparece en las cinco
pantallas; una primitiva no instanciada allí conserva su contrato de marcado, pero no tiene
medición DOM propia en esta matriz.

| Primitiva | Contrato accesible | Garantía medida / límite |
| --- | --- | --- |
| `Alert` | `role="alert"`; botón «Reintentar» real cuando hay `retry` | Superficie y texto por tokens de error; botón `secondary` ≥ 44 px; contraste medido donde aparece |
| `Switch` | `button role="switch"`, `aria-label` con el atributo y `aria-checked`; Sí/No visible; ausencia como «Sin informar» + «Informar No» | 68×44 px; estado no depende solo del color; foco visible; no simula un tercer estado |
| `PageHead` | `h1` con `tabIndex={-1}` como destino de foco tras navegar; descripción secundaria | Título y descripción con contraste medido; no dibuja anillo por foco programático |
| `Tag` | Texto de estado/atributo, también cuando está inactivo | Texto a 12 px; `nowrap` contenido sin generar overflow de página; contraste medido |
| `TableScroll` | `role="region"`, `aria-label` obligatorio y `tabIndex={0}` | Región enfocable con anillo ≥ 3:1; el scroll horizontal queda contenido en la región, no en la página |
| `Table` | `caption` visible u `sr-only`; `th scope="col"`; importes a la derecha y tabulares; fila vacía «Sin datos» | Cabecera a 12 px y celdas a 13 px; `overflow-wrap`; paridad de columnas con `DataList`; sin cero inventado |
| `DataList` | `ul role="list"` con etiqueta visible por campo (`data-label`) y `aria-label` opcional | Misma definición de columnas que `Table`; etiqueta 12 px y valor 13 px; importes alineados; sin overflow de página a 390 |
| `Amount` | Estado explícito (`Verificado`, `Cero verificado`, `Parcial`, `No disponible`, `No aplica`, `Sin datos`); `null` nunca se convierte en cero | Icono decorativo `aria-hidden`; importe negativo con `--negative`; nota base a 11 px (deuda residual) |
| `Badge` | Color + icono + texto; el icono es decorativo y el texto comunica el estado | Tonos por tokens con contraste medido; base a 10 px (deuda residual); «Inicio» lo eleva a 12 px |
| `Metric` | `article` con título en `h2`/`h3`/`h4` y `aria-label` opcional | Título a 13 px; importe y badge con contraste medido; clase base a 9 px (deuda residual) |
| `EmptyState` | `role="status"`, `note` o `alert`; icono decorativo | Texto a 12 px; representa vacío/sin datos, nunca un cero o una fila inventada |
| `Skeleton` | `role="status"`, `aria-live="polite"`, `aria-busy="true"` y `aria-label` | Anuncia carga sin contenido falso; sin animación dependiente de JS |
| `Field` | `label htmlFor` al control; `aria-describedby` con ayuda y error; `aria-invalid`; `required` | Etiqueta, ayuda y error a 12 px; hueco de error reservado; exige un único control etiquetable e ids únicos; no sustituye la semántica de `role="switch"` o `fieldset` |
| `FormSection` | `section` con `aria-labelledby` al `h2`; paso decorativo `aria-hidden` | Título a 16 px y descripción a 12 px; conserva jerarquía y contraste |
| `FormGrid` | Rejilla de campos de dos columnas que pasa a una a 760 px | Campos con `min-width: 0`; sin overflow de página a 390 |
| `focusFirstInvalidField` | Helper, no componente: enfoca el primer `[aria-invalid="true"]:not([disabled])` del contenedor | Devuelve el control enfocado o `null`; no valida ni desplaza por sí mismo |

#### Evidencia, excepciones y deuda residual

**«Medido» no es «aprobado»:** la matriz registra lo que las aserciones comprobaron en una
ejecución concreta; la aceptación exige QA independiente y aprobación explícita del usuario.
Trazabilidad de los incrementos:

- [#308](https://github.com/jmartinlabs/myfinanzas-app/pull/308) — I1, línea base diagnóstica
  (`e93dccc`): informe JSON, sin capturas ni aserciones duras.
- [#312](https://github.com/jmartinlabs/myfinanzas-app/pull/312) — I2, tokens y AA (`ba24c29`):
  foco del sidebar, texto funcional y objetivos táctiles.
- [#316](https://github.com/jmartinlabs/myfinanzas-app/pull/316) — I4, matriz AA (`b3571aa`):
  30 capturas base, 15 críticas y las aserciones duras.
- I3 no abrió PR: el paquete preveía reducir I3 a evidencia si no había residuo propio; la
  cabecera de I4 registra que la auditoría sobre `ba24c29` no encontró residuo de producto.
- Cierre AA posterior a I5: la matriz mide bordes de campo y glifos de estado, añade la guarda
  estática de tokens, pruebas focales de `Enter`/`Space` y deja solo las excepciones vigentes.
  No crea un incremento nuevo ni reabre I2/I3.

##### Convención y trazabilidad de capturas

- **Base (30):** `artifacts/ui-dev07/base/{pantalla}-{tema}-{ancho}.png`, con pantallas
  `inicio`, `movimientos`, `saldo-ficha`, `saldo-form` y `cierre`; temas `light-s`, `dark-s` y
  `hybrid-s`; anchos `1440x1000` y `390x844`.
- **Críticas (15):** `artifacts/ui-dev07/critical/{pantalla}-{estado}-{tema}.png`, un estado por
  pantalla y tema: Inicio `zero`, Movimientos `sin-coincidencias`, ficha `s000`, formulario
  `validacion` y Cierre `bloqueado`. El paquete DEV-07 propuso la carpeta `estados/`; la matriz
  implementada usa `critical/` y **no se renombra la evidencia existente**. `critical/` es la ruta
  vigente; `estados/` queda como nombre superado del documento de planificación.
- **Verificación:** `tests/e2e/ui-dev07.spec.ts` genera cada archivo con `shot()`, que falla si la
  página tiene scroll horizontal, después de `prepareShot()` (scroll al inicio, `<details>`
  cerrados salvo que el estado los requiera y animaciones finitas asentadas). Antes de cada
  captura crítica se ejecuta la misma auditoría AA que la matriz; una captura no sustituye una
  aserción. `artifacts/` está ignorado y no se versiona: se adjunta al PR o al registro QA.

El informe de línea base se escribe en `artifacts/ui-dev07-baseline/report.json`; también está
ignorado y no se versiona.

Excepciones y deuda que la matriz **no** convierte en cumplimiento:

- **Fecha nativa:** Chromium dirige el foco al segmento interno del `input[type=date]`; el
  `document.activeElement` sigue siendo el input, pero `:focus`/`:focus-visible` no coinciden y
  el anillo del host no se aplica. No es corregible desde CSS del documento: `nativeDateShadowFocus`
  lo aísla, la aserción lo restringe al `input[type=date]` de `saldo-form` y comprueba aparte que
  el host sí dibuja un anillo ≥ 3:1 al enfocarse.
- **Tagline 7–8 px:** «CONTROL FINANCIERO PERSONAL» se clasifica decorativa; no es texto
  funcional y no se corrige con un tamaño mínimo.
- **Primitivas base por debajo de 12 px:** `.ui-badge` (10 px), `.ui-amount-note` (11 px) y
  `.ui-metric-class` (9 px) siguen así en el CSS base. «Inicio» los eleva a 12 px; fuera de la
  matriz no se garantiza y quedan como deuda residual.
- **Enlaces inline:** los enlaces en prosa/celda por debajo de 44 px son una allowlist de tamaño
  pendiente de revisión manual; no son un AA de objetivo táctil.
- **Estados no cubiertos:** solo se mide un estado crítico por pantalla y tema. Las rutas fuera
  de las cinco pantallas, los estados no críticos, los datos reales y E4.10/E4.11 quedan fuera.
- **Límites de medición:** solo Chromium; sin Firefox/WebKit; sin lector de pantalla; sin
  auditoría WCAG completa; zoom emulado por viewport; el contraste cubre nodos de texto visibles,
  bordes de campo y glifos de estado, pero no placeholders, valores de input, pseudo-elementos ni
  SVG; el anillo de foco se muestrea en los tres temas.
- **Foco de `hybrid-s`:** el anillo global sobre el sidebar quedó corregido en I2 con
  `--sidebar-focus`; no es deuda residual. El resto de usos de `--focus` se mantiene medido, no
  aprobado por esta sección.
- **Bordes de campo:** la matriz mide los campos visibles y exige ≥ 3:1. `textarea` conservaba
  `--border` (1,38–1,50:1); se unificó su `border-color` con `--control-border` en la sección
  aditiva de DEV-07, sin cambiar relleno, tamaño, fondo ni texto. No queda como excepción.

El usuario aprobó el cierre de `DEV-07` con reservas el 2026-11-09 dentro del alcance
auditado; no es una auditoría WCAG universal ni una aceptación financiera. El CI completo y
el job `qa` post-merge de #318 (`0406e5d`) validaron la matriz y los 99 tests web. Las
capturas siguen fuera de Git y las cuatro excepciones vigentes se mantienen.

**Historial:** las secciones siguientes documentan decisiones e implementaciones E1.1–E1.5. Sus
menciones a «tema claro exclusivamente», a la paleta verde `#8DBB2E`/`#EEF7E8` y a capturas de
esa fase son referencia histórica, no el contrato vigente.

## Implementación E1.1 — STEP 7
Diseño aprobado en STEP 5, ahora implementado bajo autorización expresa de $dev 01.
Shell con menú lateral escritorio y menú móvil, header Ciclo financiado: No disponible;
listado con búsqueda/filtros/paginación y tabla/tarjetas; ficha y alta/edición en página propia.
Identidad original MyFinanzas, CSS propio; componentes PageHead/Tag/Alert/Switch reutilizables.

Tokens vigentes: principal #8DBB2E, cabeceras #CBEA7B, secciones/switch off #DCECB3,
fondo #EEF7E8, texto #2B2B2B, blanco; texto auxiliar #536147, foco #335B0D.
Tipografía de sistema sin descarga; shell desktop 236px/sidebar, contenido fluido,
breakpoints 1050px/760px; móvil padding 16px. En E1.1 se fijó tema light explícito incluso con sistema dark; el contrato vigente son los tres temas.
Switch binario accesible, knob blanco, texto Sí/No; ausencia histórica se representa
Sin informar y acción explícita Informar No antes de convertirse en switch, no false implícito.
Los tres indicadores nuevos comienzan false y en edición conservan valores reales.

Formularios en tres bloques, errores asociados a campos, foco al aviso y borrador conservado;
ID visible/inmutable, sin borrado físico. Desactivar/reactivar requiere confirmación.
Aperturas/Objetivo vacíos no se transforman en cero. Sin cálculo disponible: motivo visible
sin importe; no Manual operativo ni nuevas combinaciones. El menú no ofrece módulos inexistentes.

Acceso privado con enrolado/contraseña/TOTP/códigos de recuperación; factores no aparecen
en las capturas de evidencia. Estado de sesión caducada pide conservar borrador antes de
volver a identificarse. Formularios mantienen acciones Cancelar/Guardar y acceso por teclado.

Capturas reales 390×844 y 1440×1000 inspeccionadas; estados loading/empty/error/retry,
conflicto, ausencias y restauración verificados. Resultados y cinco ajustes de revisión
están en [testplan](../01-saldos-control-testplan.md), no en una aprobación gráfica supuesta.
Se midieron pares de texto de la paleta y se operaron switches/menú por teclado;
no auditoría WCAG completa ni ensayo con lector de pantalla.

## Excepción de contraste confirmada en revisión de PR #7
Revisión comunicada por el usuario el 2026-10-21: conservar texto oscuro sobre el verde
principal #8DBB2E, aunque la referencia original de la paleta emplee texto blanco.
La combinación implementada #24320E/#8DBB2E ofrece aproximadamente **6.04:1**;
blanco/#8DBB2E ofrece **2.26:1**, insuficiente para texto normal (4.5:1).
Esta excepción de accesibilidad afecta al texto de acciones, no cambia el verde, la
identidad ni el diseño aprobado. Los indicadores blancos de los switches se conservan;
sus etiquetas Sí/No siguen siendo oscuras. No se ha cambiado CSS ni distribución.
Playwright comprueba el color real de texto y fondo del botón principal, además de los
ratios de paleta; no se afirma una auditoría WCAG completa.

## Registro de aprobación STEP 5
Lo siguiente conserva el contrato visual aprobado y las limitaciones de aquella fase
**documental**. Las frases sobre implementación futura/no autorizada o PR #6 abierta
describen ese momento: PR #6 fue integrada en ebfe75b y STEP 7 sí está autorizado.
No son una revocación de las pruebas reales documentadas arriba ni permiso de merge.

## Diseño visual común aprobado — 2026-10-21

Fuente de aprobación: el usuario comunica que revisó y aprobó con Álex la primera
propuesta visual de MyFinanzas App y pide documentarla en PR #6. Se ha recibido su
descripción textual; no se afirma haber inspeccionado un archivo gráfico, prototipo
externo o aplicación que no se haya proporcionado. Los esquemas ASCII de E1.1 son una
traducción documental de esa descripción, no evidencia de una UI implementada.

### Identidad y distribución
- Estilo profesional, compacto y orientado al control financiero.
- Identidad original MyFinanzas, CSS propio y tokens: no sustituir por otra marca o
  librería de UI. Se aprueba la dirección visual; no afirmar que los tokens existan ya.
- Menú lateral en escritorio; navegación adaptada a móvil. La navegación solo expone
  capacidades disponibles, sin habilitar módulos pendientes por dibujar el menú común.
- Cabecera global con ciclo financiado actual leído del maestro único de Ciclos.
- Tablas compactas en escritorio, tarjetas compactas en móvil. La densidad no debe
  perjudicar legibilidad, foco, etiquetas o áreas de interacción.
- Componentes visuales reutilizables para entregas posteriores, sin construirlos aquí.
- [Histórico E1.1] Tema únicamente claro en esta fase, fondos blancos y verdes suaves MyFinanzas. Sin
  selector ni modo oscuro, tampoco activación automática por preferencia del sistema.

| Papel de la paleta existente | Color aprobado como referencia de identidad |
| --- | --- |
| Verde principal | #8DBB2E |
| Cabeceras | #CBEA7B |
| Secciones | #DCECB3 |
| Fondo | #EEF7E8 |
| Texto | #2B2B2B |

Paleta complementaria procedente de R6, mantenida por la aprobación del usuario.
No deducir que cualquier pareja de colores cumple contraste: comprobar combinaciones
reales en texto, controles, estados y foco durante la futura implementación. Roles de
superficie/acción deben conservar identidad y accesibilidad, sin aprobar valores nuevos
por esta documentación. Tipografía, medidas y breakpoints del bootstrap no se convierten
automáticamente en valores aprobados del nuevo diseño global.

### Cabecera y semántica financiera
El ciclo mostrado procede exclusivamente del maestro de Ciclos y de su contrato de
selección de ciclo actual. No inferirlo del reloj del navegador, Nómina o un catálogo
paralelo. El estado temporal y el cierre financiero son datos diferentes: Fin temporal
no declara cierre financiero y ausencia de Fin no demuestra que haya cierre financiero.
Mostrar etiquetas separadas cuando existan esos datos, sin habilitar acciones de cierre.

Según roadmap, el maestro mínimo llega en E1.3 y cierre financiero después. En E1.1
no se implementan para rellenar la cabecera. Mientras no esté disponible la fuente,
mostrar «Ciclo financiado: No disponible»; no inventar mes, ID, estado o fecha. Durante
carga/error/vacío de esa fuente, distinguir estados y no sustituirlos por un ciclo
supuesto. El corte y selección de ciclo mantienen decisiones DT3 aplicables antes de
su entrega, sin resolverlas aquí. Tampoco inferir estado financiero a partir del temporal.

### Patrones reutilizables previstos, no componentes implementados
| Patrón visual | Contrato previsto |
| --- | --- |
| Estructura común y navegación | Marca, menú lateral escritorio, alternativa móvil accesible y cabecera de contexto |
| Búsqueda y filtros | Etiquetas comprensibles, filtros/estados visibles y estado vacío diferenciado |
| Tabla/tarjeta de Saldo | Misma identidad/atributos y acciones disponibles en ambos formatos; ID visible |
| Ficha y secciones de formulario | Separar identidad, configuración económica y atributos de control |
| Switches de los tres booleanos (M2 vigente) | Alta inicial No/false; edición conserva dato; POST omitido=false, PATCH omitido=sin cambio; histórico ausente distinto de false |
| Estado/importe disponible | Distinguir ausencia, cero explícito, pendiente de motor y no aplicable; sin importes ficticios |
| Avisos y acciones | Carga/vacío/error/éxito, confirmación de acciones, foco y valores del formulario preservados |

## Pantallas E1.1 aprobadas

1. Listado: búsqueda, filtros y estados; tabla compacta escritorio y tarjetas compactas
   móvil, activos por defecto e inactivos consultables.
2. Ficha: identificación, configuración financiera y atributos separados, ID visible e
   inmutable; edición en página propia.
3. Alta/edición en página propia: tres bloques **Identificación**, **Configuración económica**
   y **Atributos de control**; Estado Activa inicial, tres switches No/false al alta y opcionalidad
   de M1/M2. Contrato exacto en [especificación E1.1](../01-saldos-control-specification.md).

No habilitar Manual operativo ni combinaciones Tipo/Control no contrastadas. Motores
aún no entregados no producen importes ficticios; vacío no equivale a cero. M1/M2,
reglas financieras, IDs y separación entre fuentes conservan su autoridad.

## Revisión M2 aprobada: switches — 2026-10-21

La última decisión expresa del usuario **sustituye** controles segmentados y exigencia
de elección manual de cada Sí/No. Contrato común para Liquidez, Mostrar como bolsa y
Permite salida a Exterior, sin derivar valores del Tipo, Control, Finalidad o entre sí.

| Estado booleano real | Apariencia aprobada | Texto visible |
| --- | --- | --- |
| true / activado | Fondo verde principal #8DBB2E, indicador blanco | Sí |
| false / desactivado | Fondo verde suave de la paleta MyFinanzas, indicador blanco | No |

«Desactivado» es off, no disabled: el control sigue siendo operable. Verde suave usa
la paleta existente, sin introducir otro tono como decisión aprobada ni inventar un
hex concreto no indicado para este switch. La etiqueta del atributo y Sí/No visibles
impiden depender solo del color. Indicador blanco en ambos estados; contraste de pista,
indicador, borde, texto y foco se comprobará en futura implementación, sin declarar
conformidad por esta aprobación textual.

Alta: tres switches en No/false inicialmente; no pedir interacción manual para aceptar
ese valor. Edición: representar el valor realmente guardado, nunca inicializar desde el
estado del formulario de alta. Guardar un cambio no modifica los otros dos indicadores.
Semántica accesible de switch con nombre del atributo, estado checked true/false, foco
visible y teclado; no simular un tercer estado mediante checked=false o mixed.

Si una futura importación autorizada conserva un valor ausente, mostrar «Sin informar»
y distinguirlo del switch en No. No asignarle estado falso para dibujar el control ni
normalizarlo al abrir/cancelar/guardar otro campo. Si el usuario informa ese atributo,
se registra el booleano elegido; si no lo toca, PATCH lo omite y conserva la ausencia.
La presentación de ausencia no convierte al switch binario en un control de tres estados.
No se importan datos ni se implementa esta UI en esta PR documental.

POST ordinario omitido aplica false y persiste valor explícito; PATCH omitido no altera
el valor. Null explícito no es booleano de escritura ordinaria ni activa el default de
omisión. No trasladar ese default a futuras importaciones, históricos o S000. Detalle
canónico en [especificación](../01-saldos-control-specification.md).

[Histórico E1.1] Tema claro exclusivamente: superficies blancas/verdes suaves, sin versión oscura,
selector de tema ni tokens oscuros implementados. Futuras pruebas verificarán que una
preferencia de sistema oscura no active otro tema; no ampliar alcance para implementarlo.

## Aprobación de diseño frente a comprobación futura

| Evidencia | Estado real |
| --- | --- |
| Primera propuesta visual común y tres pantallas E1.1 | Aprobadas según comunicación expresa del usuario, 2026-10-21 |
| Documentación y esquemas ASCII | Describen la aprobación; no ejecutan componentes ni sustituyen pruebas |
| Navegación, formularios, tarjetas/tablas nuevos en aplicación | No implementados en este STEP documental |
| Inspección de la futura UI a 390×844 y 1440×1000 | Pendiente de implementación autorizada, capturas e inspección efectiva |
| Contraste, teclado, foco, etiquetas, semántica y estados responsive de la nueva UI | Pruebas futuras; no conformidad WCAG declarada por una aprobación de diseño |

La validación futura cubrirá los tres flujos, menú lateral/navegación móvil, cabecera
con fuente disponible/no disponible/carga/error, ausencia/cero, y persistencia de los
campos después de errores, switches Sí/No y preservación de históricos ausentes. Playwright y capturas inspeccionadas a 390 y 1440 px deben
complementarse con revisión de accesibilidad; capturas viejas del bootstrap y CI de sus
flujos no validan este diseño. La aprobación no autoriza implementar, generar CSS/tokens,
componentes o SQL, hacer merge o iniciar E1.2. PR #6 permanece abierta para revisión final.


## E1.2 Clasificación — implementación en revisión
Reutiliza shell/PageHead/Alert/Tag y tokens aprobados. Pestañas de tres catálogos,
búsqueda y filtros jerárquicos/estado, tabla compacta de tres columnas y tarjetas
móvil. Ficha con enlaces de jerarquía, ID, Estado y dependencias reales; formularios
en página propia, Referencia obligatoria sin preselección (no aplica default de
switches E1.1). Rectificar presenta Antes/Después legibles, motivo y cobertura
financiera no comprobada. No importes fingidos ni motores simulados. Evidencia y
revisión visual en [testplan 02](../02-clasificacion-testplan.md).


## Ciclos E1.3
Base visual aprobada en spec 03; implementación revisable con capturas reales 390/1440
trazadas en [testplan](../03-ciclos-financiados-testplan.md), no aprobación por capturas.
Reutiliza cabecera, navegación, paneles, tabla/tarjetas, etiquetas y texto oscuro sobre
verde #8DBB2E. Cabecera consulta maestro/contexto real: «Sin ciclos» ≠ «No disponible»
por referencia pendiente ≠ error de carga. Abierto es temporal, nunca cierre financiero.
Formulario propio de dos campos, ambos vacíos; vista previa derivada separada. 409
conserva borrador y exige actualizar contexto explícitamente; sin ajustes silenciosos.


## E1.4 — pantallas implementadas, pendiente revisión de PR
Listado tabla/tarjetas, filtros por IDs/intervalo/ciclo/estado, ficha y formularios
propios. Importe siempre positivo; Tipo comunica dirección. Fecha prevista explícita
dd/mm/aaaa junto al input date nativo dependiente de navegador/SO. Cabecera central
usa hechos vigentes, no reloj. Posición calculada de Movimientos con texto de contraste
normal; otros motores siguen con motivo de no disponibilidad.
Vista previa compacta de cambios y efecto en Saldos/ciclos/referencia, duplicados
revisables sin rechazo de hechos distintos. Anulado conserva periodo/relaciones y
no computa, sin confundirse con devolución. Auditoría consultable, sin reactivación.
Controles reales 390/1440 y capturas en [testplan](../04-movimientos-testplan.md);
no equiparar wireframes aprobados con prueba visual ni auditoría WCAG completa.


## E1.5 — UI implementada para auditoría
Reutiliza identidad, shell y componentes existentes; sin nuevo tema ni biblioteca.
Transferencia muestra dos selectores internos, dos posiciones según sus motores y una
confirmación explícita con efecto antes/después. No Partida/Subtipo ni salida Exterior.
Referencia por ID/Tipo/nombre, obligatoria solo según Categoría; no filtrar opcionales
por una compatibilidad adicional. Inactivas conservadas solo en enlaces históricos.
Maestro REF usa tabla/tarjetas, búsqueda/Tipo/Estado y página de alta/edición propia;
Tipo usado bloqueado; desactivación/reactivación confirmadas. Ficha enlaza consulta por
REF sin total económico que mezcle transferencias y gasto.

Borrador al crear caso se conserva en memoria durante ida/vuelta, sin localStorage,
ni datos de formulario en URL; query de consulta solo contiene REF ID, no payload.
Nombres accesibles explícitos y foco en título asíncrono/confirmación/error. Filtros
apilados a 390, paneles separados y comparación en dos columnas solo en escritorio.
La nota de motor usa un bloque propio: no aplicar borde de help sobre texto inline.
Capturas nuevas e inspección en [testplan 05](../05-transferencias-referencias-testplan.md),
separadas de aprobación documental de wireframes. Contraste oscuro/#8DBB2E conservado;
no se declara auditoría WCAG completa ni entrega de fichas E3.
