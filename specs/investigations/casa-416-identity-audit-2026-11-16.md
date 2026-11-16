# Casa de cuentas — auditoría de identidad y composición compartida (2026-11-16)

**Estado: análisis de #416. Este documento no cambia código, CSS ni datos.** Mide el estado real
de la quinta apariencia sobre la composición compartida que dejó UI-03 (#415, PR #404) y separa lo
que ya cumple de lo que queda por cerrar.

- **Base medida:** `test` `0e1f34d` (2026-11-16).
- **No autoriza:** cambios de código, CSS, API, SQLite, contratos ni merge. La ejecución de las
  correcciones es otra fase.
- **Etiquetas:** `DEMOSTRADO` = medido en el código o en una ejecución de esta sesión;
  `DOCUMENTADO` = verificado en spec, PR o historial; `UNRUN` = no ejecutado.

## 1. Método

`[DEMOSTRADO]` Cuatro medidas, todas reproducibles:

1. **Lectura de estilo:** `apps/web/src/casa.css` (1.655 líneas, 236 reglas, 103 clases),
   `graphite.css`, `light-hybrid.css`, `style.css`, `themes.ts` y `main.tsx`.
2. **Análisis estático:** ámbito de cada selector, recuento de propiedades por categoría
   (estéticas frente a layout), y clases definidas sin consumidor en el TSX.
3. **Medición en navegador:** Playwright contra el servidor de pruebas sintético
   (`apps/api/test-support/theme-server.ts`, la misma receta que `tests/e2e/theme-casa.spec.ts`),
   autenticando una vez y recorriendo las cinco apariencias en `/inicio` con el mismo escenario.
   Para cada una: clase del contenedor, número de elementos, secciones `[data-inicio-section]`,
   paneles, métricas, estilos computados de `.inicio-page`, `.inicio-grid-4`, `.inicio-grid-2` y
   `.inicio-page .panel`, y una **huella estructural** del DOM (etiqueta + clases ordenadas de
   todos los elementos bajo `.inicio-page`, excluyendo `inicio-casa`).
4. **Pruebas existentes:** `tests/e2e/theme-casa.spec.ts` ejecutado en esta sesión.

`[DEMOSTRADO]` La prueba temporal de medición se ejecutó y se **eliminó** después: no queda código
de análisis en el repositorio. Reproducirla exige volver a escribir el mismo recorrido.

## 2. Resultado de la medición

### 2.1 La composición del DOM es idéntica en las cinco apariencias

`[DEMOSTRADO]` Mismo escenario, cinco apariencias:

| Apariencia | Clase del contenedor | Elementos | Secciones | Paneles | Métricas | Huella |
| --- | --- | --- | --- | --- | --- | --- |
| Claro | `inicio-page` | 928 | 6 | 10 | 11 | `5e6cf54f912f` |
| Oscuro | `inicio-page` | 928 | 6 | 10 | 11 | `5e6cf54f912f` |
| Mixto | `inicio-page` | 928 | 6 | 10 | 11 | `5e6cf54f912f` |
| Graphite Lime | `inicio-page` | 928 | 6 | 10 | 11 | `5e6cf54f912f` |
| Casa | `inicio-page inicio-casa` | 928 | 6 | 10 | 11 | `5e6cf54f912f` |

`[DEMOSTRADO]` Una sola huella para las cinco: no hay componentes, textos, paneles, acciones ni
iconos distintos por tema. Casa no reimplementa Inicio.

### 2.2 Queda un enganche condicional de tema, y no es cosmético

`[DEMOSTRADO]` En todo el TSX hay **una única** decisión por tema:
`apps/web/src/Inicio.tsx:1240` → `` className={`inicio-page${theme === "casa" ? " inicio-casa" : ""}`} ``.
Ningún otro componente ramifica por apariencia.

`[DEMOSTRADO]` `casa.css` conserva **27 reglas `.inicio-casa`** y su efecto medido sobre el mismo
DOM es de layout, no de estética:

| Medida | Otras cuatro | Casa |
| --- | --- | --- |
| `max-width` de `.inicio-page` | `none` | **1180 px** |
| `grid-template-columns` de `.inicio-grid-4` | 270 px × 4 | **544 px × 2** |
| `padding` de `.inicio-page .panel` | 24 px | **18 px 0** |

`[DEMOSTRADO]` La rejilla de cuatro columnas pasa a dos en Casa: el contenido se recoloca. Eso
excede «color, tipografía, fondos, bordes y sombras» y es el resto de la portada editorial de
Casa 1B que UI-03 no retiró del todo.

### 2.3 Lo que ya está cerrado

| Comprobación | Resultado |
| --- | --- |
| Ámbito del CSS de Casa | `[DEMOSTRADO]` **229 de 229** selectores con `casa`: ninguna regla se filtra a las otras cuatro apariencias |
| `.casa-cover` | `[DEMOSTRADO]` **0 apariciones**; retirado en `6cf1d38 chore(ui): drop orphan Casa cover styles` `[DOCUMENTADO]` |
| Apariencias disponibles | `[DEMOSTRADO]` cinco opciones, `casa` la quinta, persistencia en `localStorage` y `data-theme` (prueba de tema en verde) |
| Tipografía editorial | `[DEMOSTRADO]` Newsreader en títulos, IBM Plex Sans en cuerpo, ambas cargadas (`theme-casa.spec.ts`) |
| Contraste | `[DEMOSTRADO]` 18 pares de tokens con mínimos 4,5:1 / 3:1, todos por encima del mínimo, en la prueba de tema |
| `.casa-cover` y CSS huérfano de portada | `[DEMOSTRADO]` no queda ninguno salvo el caso de §3.2 |

### 2.4 Prueba ejecutada

`[DEMOSTRADO]` `bunx playwright test tests/e2e/theme-casa.spec.ts` → **2 pruebas, 2 pasadas**
(quinta apariencia, persistencia, tipografía, 1440/390, contraste y aplicación del tema antes de
React).

## 3. Brechas

| # | Brecha | Evidencia | Efecto sobre los criterios de #416 |
| --- | --- | --- | --- |
| **G1** | `Inicio.tsx:1240` añade `inicio-casa` según el tema | `[DEMOSTRADO]` código | Rompe «Casa comparte la composición funcional»: la estructura visible difiere |
| **G2** | 27 reglas `.inicio-casa` con layout (`max-width`, `grid-template-columns`, `gap`, `padding`, `margin`, `display`) | `[DEMOSTRADO]` `casa.css` y medición de §2.2 | Rompe «solo color, tipografía, fondos, bordes y sombras» |
| **G3** | `.e47-skeleton-line` definido en `casa.css` sin consumidor en TSX (el componente usa `ui-skeleton-line`) | `[DEMOSTRADO]` cruce clase ↔ TSX | CSS huérfano residual |
| **G4** | No existe aserción de desbordamiento horizontal a 1440 ni a 390 | `[DEMOSTRADO]` `theme-casa.spec.ts` usa ambos anchos pero no comprueba `scrollWidth` | «Sin overflow 1440/390» queda `UNRUN` |
| **G5** | QA visual independiente y aprobación humana | — | `UNRUN`: es el criterio de cierre de la fase de ejecución |

`[DOCUMENTADO]` Observación que **no** es brecha: las clases `graphite-*` de `Inicio.tsx`
(`GraphiteHero`, `graphite-control`, `graphite-rail`) se renderizan para **todas** las
apariencias; son composición compartida con nombre heredado, no una variante de Graphite. Si se
renombran, que sea en un cambio aparte y sin tocar el DOM que comparten las cinco.

## 4. Recomendación

`[PROPUESTA]` Cerrar G1–G3 en una sola entrega pequeña, sin tocar ninguna otra apariencia:

1. **Quitar el enganche** de `Inicio.tsx:1240` y dejar el contenedor con `inicio-page` para las
   cinco apariencias.
2. **Retirar de `casa.css`** las reglas `.inicio-casa` que cambian layout y conservar, si aportan
   identidad, solo las que cambian color, tipografía, fondo, borde o sombra —reancladas al
   contenedor compartido, no a una clase de tema—.
3. **Borrar** `.e47-skeleton-line` de `casa.css`.
4. **Añadir a la prueba de tema** una aserción de no desbordamiento (`scrollWidth <= clientWidth`)
   a 1440 y a 390, que es lo que falta para no volver a `UNRUN` G4.
5. **QA visual independiente** y comparación 1440/390 con las otras cuatro antes del merge.

`[PROPUESTA]` Si el Inicio a dos columnas fuera una decisión de producto deseada para Casa, no se
puede sostener con el criterio actual: habría que cambiarlo de forma explícita en la spec de UI y
en el AC, no dejarlo como resto. Este análisis recomienda la composición compartida, que es lo
aprobado.

## 5. Lo que este análisis no declara

- Ningún cambio aplicado: G1, G2 y G3 siguen en `test` tal como se midieron.
- Ninguna revisión visual de las superficies restantes (Movimientos, Saldos, Inversiones, Deudas,
  Partidas, formularios y estados): cubiertas por pruebas `[DOCUMENTADO]`, no revisadas a ojo
  aquí.
- G4 y G5 quedan `UNRUN`: requieren la fase de ejecución y la QA independiente.

## 6. Próximo gate

Fase de ejecución con las cinco acciones de §4, en una rama propia y con QA independiente. Sin
cambios financieros, de API, de contratos ni de fórmulas.