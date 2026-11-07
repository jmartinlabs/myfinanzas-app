# UI · DEV-06 — Pantallas clave: paquete de implementación

**Estado:** propuesta **pendiente de autorización**; no implementa código, no declara PASS y no
autoriza merge. **Base verificada:** `main` `cf4b4e7` (2026-11-07). **Fecha:** 2026-11-07.

- **Spec propietaria:** [ui-specification.md](../ui-specification.md), §4 (`DEV-06`), §5 y §6.
- **Guías:** [ui.md](../guidelines/ui.md) y [quality.md](../guidelines/quality.md).
- **Fronteras:** [SPEC24/E4.6](../24-e46-resumen-inicio-specification.md) y
  [SPEC27/E4.9](../27-e49-cierre-financiero-specification.md).
- **Antecedentes:** [ui-evolution-2026-11-04](ui-evolution-2026-11-04.md) §6–§7 y
  [paquete DEV-04](ui-dev04-package-2026-11-06.md).
- **Gate:** `DEV-06` no está autorizado. Cada incremento necesita autorización, QA independiente
  y un gate de merge separado.

---

## 1. Alcance exacto

Cinco pantallas, una por arquetipo, sin añadir rutas ni funcionalidad:

| # | Pantalla | Ruta actual | Arquetipo | Incremento |
| --- | --- | --- | --- | --- |
| 1 | Inicio (E4.6) | `/inicio` | Resumen | I1 |
| 2 | Movimientos | `/movimientos` | Catálogo/listado | I2 |
| 3 | Saldos · ficha | `/saldos/{id}` | Detalle | I3 |
| 4 | Saldos · alta/edición | `/saldos/nuevo`, `/saldos/{id}/editar` | Formulario | I3 |
| 5 | Cierre (E4.9) | `/cierre` | Operación irreversible | I4 |

El alcance es **presentación y composición**: jerarquía, tipografía, espaciado, estados,
responsive, foco, evidencia y regresión. No se reimplementan pantallas ya migradas por DEV-04 o
DEV-05; se cierra su composición y se demuestra que conservan sus contratos.

### 1.1 Estado de partida relevante

| Superficie | Estado comprobado en `cf4b4e7` | Qué hace DEV-06 |
| --- | --- | --- |
| Inicio | E4.6 integrada; `Inicio.tsx` consume `Metric`, `Amount`, `Badge` y `Skeleton`; el CSS `inicio-*` conserva etiquetas de 9–11 px | Ajuste visual y de densidad, sin recomponer secciones |
| Movimientos | La lista usa `Table`/`DataList` (DEV-04 I2); el formulario usa `Field`/`FormSection` (DEV-05 I3) | Solo `MovementList`: cabecera, filtros, estados y tarjetas |
| Saldos ficha | `SaldoDetail` usa `FormSection`/`FormGrid` (DEV-05 I2) | Jerarquía de la ficha y lectura principal de posición |
| Saldos alta/edición | `SaldoForm` usa `Field`/`FormSection`/`FormGrid` (DEV-05 I2) | Repaso visual, foco/error y rejilla 2→1; sin tocar payload |
| Cierre | E4.9 y la UI E4.10 conviven en `Cierre.tsx`; las tablas E4.9 usan `.table` y `.shared-table-scroll` | Solo las tablas y la composición E4.9; E4.10 queda intacto |

### 1.2 Exclusiones obligatorias

- **Sin E4.10:** no reapertura, re-cierre, preparación, cancelación ni estados `e410-*`. La UI
  E4.10 ya integrada en `Cierre.tsx` se conserva y solo se ejecuta como regresión.
- **Sin E4.11:** no fotos consultables, `/fotos`, agregados, comparaciones ni componentes
  `Fotos.tsx`/`fotos/*`.
- **Sin cambios de contrato:** API, DTO, rutas, permisos, sesión, cálculos, redondeos, formatos,
  estados financieros, filtros, paginación, acciones o textos funcionales.
- **Sin cambios de temas:** `themes.css`, `theme-boot.js`, `themes.ts`, paletas, tokens
  cromáticos y selector quedan cerrados.
- **Sin tocar `ui.tsx`:** las primitivas se consumen; si falta una, se para y se resuelve en el
  bloque propietario (DEV-05), no aquí. Tampoco se modifica `main.tsx`, `api.ts` ni `format.ts`.
- **Sin DEV-05 I5:** este paquete no crea, planifica ni define un I5 de DEV-05. Las carencias de
  formularios/fichas fuera de estas cinco pantallas siguen fuera de alcance.
- **Sin pantallas fuera de la tabla anterior**, sin datos reales, sin dependencias nuevas, sin
  despliegue y sin declarar cerrado `DEV-06`.

---

## 2. Frontera con E4.6 (Inicio)

**Se conserva.** Orden y contenido aprobados en SPEC24: contexto; liquidez y Objetivo R6; ciclo
REAL vs PLAN; Saldos/bolsas, Ahorro, Inversión y Deuda; Pendientes; cobertura del modelo. Se
conservan todas las cifras, la taxonomía de estados (`Verificado`, `Cero verificado`, `Parcial`,
`No disponible`, `Sin datos`, `No aplica`), los motivos, la cobertura, `fuente.motor`, contexto,
IDs, enlaces de drill-down, `details`, el único `h1` y la ausencia de totales o sumas cruzadas.

**No se toca.** `GET /api/resumen-inicio`, su composición, DTO, cálculos, redondeos, formateo,
rutas, enlaces, navegación, `localStorage`, temas ni permisos. No se añaden secciones, cifras,
estados, filtros ni acciones; `AC-01 PARCIAL` de E4.6 no se reabre ni se reclasifica.

**Coordinación.** SPEC24 es la propietaria funcional. Si una mejora visual exige cambiar una
cifra, un estado, un texto funcional o el orden de secciones, se detiene y se eleva a esa spec.
La regresión de Inicio es obligatoria en cada incremento que toque `style.css`.

---

## 3. Frontera con E4.9 (Cierre)

**Se conserva.** Flujo de selección de ciclo, preflight, gates, bloqueos y avisos, estado,
versión, ventana, S0, fingerprint, clave de intento, motivo obligatorio cuando proceda,
confirmación idempotente, foto inmutable, metadatos, cobertura, `No disponible` con motivo y
reintento. No se ofrece «cerrar igualmente», no se crea foto parcial y la ausencia nunca se
presenta como `0`.

**No se toca.** API de cierre, transacciones, versionado, contratos de foto, reglas T1/T2/T3,
persistencia ni auditoría. En el mismo archivo, quedan fuera `PhotoComparison`,
`RevalidacionTable`, `MaterialComparisonView`, `ActionError` y todo bloque `e410-*`; tampoco se
modifican `e410-table`, `e410-note`, `e410-form` ni sus selectores.

**Coordinación.** SPEC27 y su testplan son los propietarios. DEV-06 no cambia el estado de
aceptación de E4.9, no acredita DT6 ni operación real y no convierte reservas históricas en
PASS. La regresión E4.10 (reapertura/re-cierre) es obligatoria aunque no se toque su código.

---

## 4. Incrementos

Regla común: **estrictamente secuenciales** porque todos escriben `style.css`; un único escritor
por PR; se añade una sección comentada al final, sin reordenar ni reescribir reglas previas. No
se paralizan entre sí ni con DEV-05 I5 o Fotos. Clases nuevas, si hacen falta, con prefijo
`ui-dev06-`; nada genérico como `.table` o `.metric`. Cada PR adjunta **antes** (base del PR) y
**después** (candidato) de sus pantallas; la matriz de después se detalla en cada incremento.

### I1 — Inicio (E4.6) · S/M

- **Objetivo.** Cerrar la jerarquía de Inicio: una lectura principal por tarjeta, metadatos
  secundarios agrupados, texto funcional ≥ 12 px, espaciado con `--space-*` y 4/2/1 columnas
  según ancho. La tarjeta Objetivo R6 conserva sus tres cifras, pero coste esencial manda y las
  submétricas quedan visualmente subordinadas.
- **Archivos y ownership.** `apps/web/src/Inicio.tsx` solo si hace falta un hook de clase;
  `apps/web/src/style.css` (bloque I1); `tests/e2e/inicio.spec.ts`. No se toca `ui.tsx` ni
  `main.tsx`.
- **Pruebas.** Unitarias: sin prueba nueva de CSS; `apps/web/test/ui.test.tsx` debe seguir verde.
  E2E: los tests existentes de Inicio (base, cero, degradado, error/401) y comprobaciones de
  orden de secciones, un solo `h1`, tamaño computado ≥ 12 px y ausencia de scroll horizontal.
- **Capturas.** 6 base (`artifacts/dev-06/inicio-{tema}-{1440|390}.png`) + 3 del estado crítico
  «cero verificado» (una por tema); además, antes/después de la base para el PR.
- **Salida.** Cifras, estados y enlaces idénticos; ninguna sección nueva; 390 sin overflow; los
  tres temas sin cambios de color; capturas y nota de regresiones adjuntas.
- **Riesgos.** Que el aumento a 12 px rompa la densidad de los cuatro bloques; que `details`
  abiertos alteren la captura; que un ajuste de copy se cuele como cambio funcional.

### I2 — Movimientos (catálogo/listado) · S/M

- **Objetivo.** Cerrar la composición de la lista: cabecera, filtros, «Más filtros», toolbar,
  estados de carga/vacío/error y paginación; una fila = un hecho y un importe, sin duplicar
  resumen. En móvil, tarjetas con la misma información y acciones que la tabla.
- **Archivos y ownership.** `apps/web/src/Movimientos.tsx` solo `MovementList`; no
  `MovementForm` ni `MovementDetail`. `style.css` (bloque I2) y `tests/e2e/movimientos.spec.ts`.
- **Pruebas.** Unitarias: no aplica cambio de lógica; se conserva la cobertura DEV-05 del
  formulario. E2E: consulta, filtros, paginación, vacío por filtros, error y paridad
  tabla/tarjeta; sin cambiar query ni orden.
- **Capturas.** 6 base + 3 del estado crítico «sin coincidencias» (una por tema).
- **Salida.** Mismos filtros, parámetros, orden, columnas y textos; `Anterior/Siguiente`
  conservan su comportamiento; 390 sin overflow; una lectura principal por fila.
- **Riesgos.** Mover el pie de página o los filtros puede romper selectores E2E; sustituir
  estados a mano por primitivas puede cambiar textos; no tocar el formulario ni la ficha.

### I3 — Saldos ficha y alta/edición · M

- **Objetivo.** En la ficha, hacer de la posición actual la lectura principal y ordenar
  identificación, configuración y atributos; conservar acciones y el tratamiento de S000. En el
  formulario, reforzar la jerarquía de las tres secciones, el foco al primer error, la ayuda y
  la rejilla 2→1, sin cambiar campos ni validaciones.
- **Archivos y ownership.** `apps/web/src/Saldos.tsx` solo `SaldoDetail` (no `SaldoList`);
  `apps/web/src/SaldoForm.tsx`; `style.css` (bloque I3); `apps/web/test/saldos-dev05.test.tsx`
  solo si cambia el marcado estático; `tests/e2e/catalog.spec.ts`.
- **Pruebas.** Unitarias: conservar las assertions de IDs, etiquetas, secciones, ayuda/error,
  payload, omisión de flags sin cambio y `revision`. E2E: recorrido de ficha, S000 no editable,
  alta/edición, validación, foco, borrador y temas.
- **Capturas.** 12 base (ficha y formulario × 3 temas × 390/1440) + 6 críticas (S000/pendiente
  y error de validación, una por tema).
- **Salida.** Cero cambios en payload, idempotencia, revisión, IDs, textos de contrato o reglas
  de S000; foco correcto; 2→1 a 760; sin overflow.
- **Riesgos.** Regresión del formulario por tocar `Field` o el orden de secciones; duplicar la
  migración ya hecha en DEV-05 I2; romper `.detail-grid` global si el CSS no se limita a
  `.saldo-detail-grid`/`.saldo-form`.

### I4 — Cierre E4.9 · M/L

- **Objetivo.** Cerrar la presentación E4.9: métricas de preflight, tabla de gates, totales y
  cobertura, panel de confirmación y resumen de la fotografía; una lectura principal (estado)
  y una acción primaria (confirmar), con bloqueo explícito y foto legible en 390/1440.
- **Archivos y ownership.** `apps/web/src/Cierre.tsx` solo componentes y bloques E4.9
  (`TotalsTable`, `CoverageTable`, tabla de gates, panel `cierre-form` y `cierre-photo`);
  `style.css` (bloque I4, clases nuevas `cierre-e49-*` para aislar de E4.10);
  `tests/e2e/cierre.spec.ts`. **No** se toca ningún fragmento `e410-*`.
- **Cambio permitido.** Migrar solo `TotalsTable` y `CoverageTable` a `Table`/`DataList`, con
  etiquetas de región distintas entre preflight y foto, importes alineados y tarjetas móviles;
  la tabla de gates conserva su estructura y su transformación móvil actual y solo recibe una
  clase E4.9 con estilos scoped. `Table` y `DataList` comparten columnas; la tabla se oculta a ≤760
  con `.desktop-list` o una clase E4.9 equivalente y las tarjetas quedan visibles. Ajustar
  jerarquía y espaciado de métricas, confirmación y foto. El `textarea` del motivo conserva su
  DOM, IDs, `aria-describedby` y foco: no se migra a `Field`. El bloque `reopened` de la foto se
  conserva sin cambiar su condición ni su texto.
- **Pruebas.** Unitarias: `apps/web/test/cierre-photo-count.test.ts` intacto. E2E: escenarios
  `listo`, `bloqueado`, conflicto/idempotencia y foto; 3 temas; E4.10 como regresión.
- **Capturas.** 6 base de preflight listo + 3 del estado crítico bloqueado + 3 de foto (una por
  tema), con 390/1440. Las de foto son un recorte de la sección `cierre-photo`, no de la página
  completa, para no presentar E4.10 como parte de DEV-06; son evidencia adicional y no
  sustituyen a las 30+15 de la matriz.
- **Salida.** E4.9 conserva gates, bloqueos, fingerprint, motivo, idempotencia, foto inmutable y
  ausencia≠0; no aparece ninguna acción nueva; el diff no contiene líneas `e410` ni `Fotos`.
- **Riesgos.** `Cierre.tsx` mezcla E4.9/E4.10 y comparte `Badge`, `cierre-metrics` y
  `cierre-fingerprint`; un selector global puede alterar E4.10. Mitigación: clases nuevas
  `cierre-e49-*`, no tocar `cierre-badge`, `e410-*` ni el `Badge` local, y guarda de diff.

---

## 5. Matriz de aceptación DEV-06

Se comprueba en cada incremento sobre sus pantallas; no es un PASS global ni cierra E4.6/E4.9.

| ID | Criterio | Comprobación | Evidencia |
| --- | --- | --- | --- |
| D06-01 | Inicio conserva secciones y orden | Contexto, liquidez/Objetivo, ciclo, cuatro bloques, Pendientes, cobertura; un solo `h1` | E2E `inicio.spec.ts` + captura |
| D06-02 | Inicio conserva cifras, estados y fuentes | Cada cifra con `fuente.motor`, contexto y motivo; `0,00 €`, `ND`, `No aplica` y `Sin datos` distinguibles; `null ≠ 0` | E2E base/cero/degradado + inspección |
| D06-03 | Una lectura principal por pantalla | Inicio: una cifra por tarjeta; Movimientos: un importe por fila; ficha: posición; formulario: sección y acción; Cierre: estado y una acción primaria. Sin duplicar motivo/CTA; texto funcional ≥ 12 px | E2E de estilos computados + capturas de los cuatro incrementos |
| D06-04 | Movimientos conserva catálogo y estados | Filtros, query, orden, paginación, columnas y acciones iguales; vacío/error/carga explícitos; tabla/tarjeta con la misma información | E2E `movimientos.spec.ts` |
| D06-05 | Ficha de Saldos conserva identidad y posición | Identificación, configuración, atributos, posición, acciones y S000 protegido; estado y condición no se convierten en cero | E2E `catalog.spec.ts` + unitarias |
| D06-06 | Alta/edición conserva formulario | Tres secciones, obligatorios/opcionales, ayuda/error, foco al primer error, borrador, rejilla 2→1 | Unitarias `saldos-dev05` + E2E |
| D06-07 | Cierre E4.9 conserva su operación | Preflight, gates, bloqueos, fingerprint, motivo, idempotencia y confirmación; sin «cerrar igualmente» | E2E `cierre.spec.ts` |
| D06-08 | Cierre: foto y ausencias | Foto inmutable, metadatos, cobertura y `No disponible` con motivo; sin foto parcial; `0` solo si es cero real | E2E foto/conflicto + unitaria |
| D06-09 | Cierre sin features E4.10/E4.11 | Sin reapertura, re-cierre, fotos consultables, `/fotos` ni agregados; `e410-*` y `Fotos.tsx` sin cambios | Diff + E4.10 E2E de regresión |
| D06-10 | Sin cambios de contrato | API, DTO, rutas, permisos, cálculos, formatos, estados, filtros y paginación intactos | Diff + suites existentes |
| D06-11 | Accesibilidad y responsive | AA en 3 temas, foco visible, teclado, objetivos ≥ 44 px, zoom 200 %, `prefers-reduced-motion`, 390 sin overflow | E2E/inspección + capturas |
| D06-12 | Evidencia y QA | 30 capturas base (5×3×2) + 15 críticas, antes/después, nota de regresiones y QA independiente | Artefactos + registro QA |

---

## 6. Orden, dependencias y QA

**Orden:** I1 → I2 → I3 → I4. Es secuencial por `style.css`; no hay paralelismo seguro mientras
un solo archivo concentre los estilos. I1 fija la referencia visual de Inicio; I4 va al final por
ser el de mayor riesgo (E4.9/E4.10 en el mismo archivo).

**Dependencias:** DEV-01, DEV-02, DEV-03, DEV-04 I1–I4, DEV-05 I1–I4 y las specs E4.6/E4.9 ya
integradas. No depende de E4.10/E4.11. No se inicia sin autorización expresa de `DEV-06` y sin
confirmar que no hay otro escritor activo de `style.css`/`ui.tsx` (DEV-05 I5 o Fotos). Si lo hay,
se espera, se rebasa desde `main` y se conserva su trabajo.

**QA independiente por PR.** Cada incremento se revisa contra su diff y su evidencia, no contra
el resumen del autor. El revisor comprueba cifras/estados, contratos, capturas, teclado y
regresiones; emite APTO/APTO CON RESERVAS o devuelve. El merge sigue siendo un gate separado y
nunca se auto-fusiona.

**Verificación mínima por incremento:**

```text
bun install --frozen-lockfile
bun run typecheck
bun run build
bun test apps/web/test/<prueba-afectada>.test.tsx
bun run test:e2e tests/e2e/<spec-afectada>.spec.ts
python3 scripts/verify --base <base> --head <sha>
```

El candidato final de cada PR usa `python3 scripts/verify --full` o la CI manual `full`. Los
cambios de esta propuesta son documentales: el PR de este paquete solo ejecuta el perfil `docs`.

---

## 7. Riesgos y evidencia

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Inicio: cambiar una cifra, estado, texto o el orden de secciones | Alto: reabre E4.6 | Diff limitado a presentación; assertions de contenido y orden; SPEC24 como gate |
| Movimientos: alterar filtros, query, orden o paginación | Alto: regresión funcional | No tocar el estado ni la llamada `api`; solo composición y estados; E2E focal |
| Saldos: tocar payload, idempotencia, revisión o reglas S000 | Alto: contrato E1.1 | No editar lógica de `submit`; unitarias de IDs/payload; diff revisado |
| Cierre: alterar E4.10 al compartir `Cierre.tsx`, `Badge` o `cierre-metrics` | Alto: reabre E4.10 | Clases `cierre-e49-*`, no tocar `e410-*`; guarda de diff y E4.10 E2E |
| Migrar tablas E4.9 y perder el scroll/cartas móviles | Medio: desbordamiento o información oculta | `Table`+`DataList`, región rotulada, etiquetas únicas, 390 verificado |
| Subir texto a 12 px y romper la densidad | Medio: desbordamiento o tarjetas enormes | Medir `scrollWidth`, ajustar solo las cinco pantallas, capturas 390/1440 |
| Colisión de `style.css` con DEV-05 I5 o Fotos | Medio: conflicto de PR | Un escritor por ventana; sección aditiva; rebase y revisión de archivos |
| Playwright no se ejecuta en CI `critical` | Alto para la evidencia | El perfil `critical` solo cubre tipos/build/API; ejecutar E2E en local y en `full`/CI manual, adjuntar log y capturas, no atribuir a CI crítico |
| `artifacts/` está ignorado por Git | Medio: evidencia no versionada | Referenciar rutas y adjuntar capturas/logs al PR o al registro QA; no commitear artefactos |
| E2E largos, puertos y servidores aislados | Medio: flakiness | `workers: 1`, servidores propios, cierre en `finally`, datos ficticios |
| Cambios de tema/paleta por accidente | Alto: rompe #198 | No tocar `themes.css`, tokens cromáticos ni selector; contraste por estilos computados |

---

## 8. Estimación relativa y qué NO entra

| Incremento | Tamaño relativo | Razón |
| --- | --- | --- |
| I1 Inicio | S/M | CSS acotado + evidencia E4.6; sin migración de datos |
| I2 Movimientos | S/M | Una lista y sus estados; sin formulario ni ficha |
| I3 Saldos ficha + formulario | M | Dos pantallas ya migradas, con regresión de contrato sensible |
| I4 Cierre E4.9 | M/L | Tablas, confirmación y foto, con E4.10 en el mismo archivo |
| **Total** | **M** | Cuatro PR pequeños/medianos, QA independiente por PR; sin compromiso de plazo |

**No entra:** E4.10 y E4.11; reapertura, re-cierre, fotos, `/fotos` y agregados; API, DTO, rutas,
permisos, cálculos, redondeos, formatos, estados, filtros, paginación y acciones nuevas; temas,
paletas, tokens cromáticos, `theme-boot.js`, `themes.ts` y selector; `ui.tsx`, `main.tsx`,
`api.ts`, `format.ts`; datos reales, migraciones, dependencias, despliegue o CI nuevo; DEV-05 I5;
pantallas fuera de las cinco aprobadas; declarar PASS, cerrar `DEV-06` o fusionar sin
autorización.

**Nota de índice:** no existe un índice de `specs/investigations/`; este documento queda como
paquete independiente y no modifica ningún índice.
