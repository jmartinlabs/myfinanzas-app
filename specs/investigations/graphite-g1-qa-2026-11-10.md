# Graphite Lime · G1 · QA de fundamento y shell

**Estado:** evidencia de la PR de G1. **No autoriza merge ni despliegue.**
**Fecha:** 2026-11-10.
**Base:** `origin/test` `1d288c5`.
**Rama:** `feature/graphite-g1-foundation`.
**Diseño de referencia:** [archivo Graphite Lime](graphite-lime-design-2026-11-10/README.md).

## Alcance de G1

G1 traslada la identidad premium al shell y a los componentes existentes, sin cambiar la
composición de Inicio/Movimientos ni la lógica funcional:

- Superficies y elevación de paneles, métricas y tarjetas móviles.
- Tipografía de cabecera, tabla y badges.
- Botones, inputs, foco, tags y estados.
- Sidebar, header, footer y menú móvil.
- Navegación activa lima, superficies grafito y acentos contenidos.

No incluye: hero/KPI/rail de Inicio (G2a/G2b), filtros/listado/detalle de Movimientos (G3/G4),
formularios, API, SQLite, Excel, contratos financieros ni datos reales.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `apps/web/src/graphite.css` | Nuevo: capa visual scoped `html[data-theme="graphite-lime"]` |
| `apps/web/src/style.css` | Import aditivo de `graphite.css` |
| `apps/web/test/graphite-visual.test.ts` | Pruebas estáticas de import, aislamiento y cobertura |
| `tests/e2e/graphite-g1.spec.ts` | E2E de shell, superficies, responsive, foco y regresión |
| `specs/ui-specification.md` | Enmienda UI-G2 y autorización de G1 |

No se modifican `themes.css`, `themes.ts`, `theme-boot.js`, `ui.tsx`, `Inicio.tsx`,
`Movimientos.tsx`, API, SQLite ni contratos.

## Resultados ejecutados

| Prueba | Resultado |
| --- | --- |
| `bun test apps/web` | **114/114 PASS** |
| `bun run typecheck` | **PASS** |
| `bun run build` | **PASS** |
| `bun run test:e2e -- tests/e2e/graphite-g1.spec.ts` | **1/1 PASS** |
| `bun run test:e2e -- tests/e2e/theme-graphite.spec.ts` | **2/2 PASS** |
| `bun run test:e2e -- tests/e2e/theme.spec.ts tests/e2e/graphite-g1.spec.ts` | **3/3 PASS** |
| `bun run test:e2e -- tests/e2e/inicio.spec.ts` | **5/5 PASS** |
| `bun run test:e2e -- tests/e2e/movimientos.spec.ts` | **FAIL** en timeout de restauración del servidor auxiliar 3004 (2 intentos); no relacionado con G1, que no cambia JS/API |

La suite `movimientos.spec.ts` es un recorrido funcional largo; el fallo se produce al restaurar
un servidor auxiliar después de ~46 s, no en una aserción visual de Graphite. No se ha modificado
ningún archivo de lógica de Movimientos. Queda como riesgo residual de entorno, no como PASS.

## Capturas

Ruta local (ignorada por Git): `artifacts/graphite-g1/`.

| Captura | Dimensiones | Uso |
| --- | --- | --- |
| `saldos-1440.png` | 1440 × 1097 | Shell, panel, tabla, botón, badge |
| `saldos-820.png` | 820 × 1000 | Shell intermedio, tabla |
| `saldos-390.png` | 390 × 2398 | Shell móvil, tarjetas |
| `inicio-1440.png` | 1440 × 4121 | Baseline actual; composición G2 pendiente |
| `inicio-820.png` | 820 × 5162 | Baseline actual; composición G2 pendiente |
| `inicio-390.png` | 390 × 7345 | Baseline actual; composición G2 pendiente |
| `movimientos-1440.png` | 1440 × 1000 | Baseline con fixture vacío; G3 pendiente |
| `movimientos-820.png` | 820 × 1097 | Baseline con fixture vacío; G3 pendiente |
| `movimientos-390.png` | 390 × 1495 | Baseline con fixture vacío; G3 pendiente |
| `comparison-board.png` | 1800 × 3660 | Tablero comparativo app/prototipo a 1440/820/390 e Inicio |

Referencias del prototipo:

- Inicio: `specs/investigations/graphite-lime-design-2026-11-10/phase-c/candidates/shots/graphite-lime-1440.jpg`
- Movimientos: `.../shots-movimientos/graphite-lime-1440.jpg`, `-820.jpg`, `-390.jpg`
- Shell/navegación: las mismas capturas de Inicio/Movimientos.

## Comparación visual

### Coincide con el prototipo en G1

- Sidebar grafito con activo lima sólido y texto oscuro; grupos en mayúsculas y jerarquía
  contenido/secundario.
- Header oscuro translúcido con tipografía más compacta y controles de tema/sesión.
- Superficies con gradiente sutil, borde grafito y sombra contenida; ya no son paneles planos.
- Botón primario lima con texto oscuro y sombra; secundario con superficie elevada.
- Inputs/selects oscuros, borde de control y foco lima de 3 px.
- Tablas con cabecera oscura, mayúsculas y hover; badges/tags compactos.
- Tarjetas móviles elevadas con etiquetas de campo en mayúsculas.
- Página con título más grande y `eyebrow` lima; se conserva la escala funcional >= 12 px.

### Diferencias pendientes (fuera de G1)

- **Inicio:** sigue siendo el resumen operativo actual; faltan hero de control, banda KPI, tabla
  de ciclo + rail, posición y cobertura con la composición del prototipo. Es G2a/G2b.
- **Movimientos:** faltan tarjeta de filtros separada, tarjeta de listado, iconos por tipo,
  selección y detalle inline. Es G3/G4/G4b. Las capturas de Movimientos usan el fixture de tema
  vacío; la tabla con datos se validará en G3 con el servidor funcional.
- **Shell:** se conserva 236 px en lugar de 264 px, por decisión aprobada. No se añade la marca
  gráfica “M” ni el juego de iconos SVG del prototipo; se mantienen los glifos y la navegación
  actuales. G1 no cambia la estructura de navegación.
- **820/móvil:** el prototipo colapsa la sidebar a un rail de iconos y compacta el topbar; la app
  conserva la sidebar etiquetada y el header actual. Es una diferencia de composición de shell
  fuera de G1; requeriría autorización específica y no se ha tocado.
- **Tablero comparativo:** `artifacts/graphite-g1/comparison-board.png` (app vs. prototipo a
  1440/820/390, más Inicio 1440). Es evidencia local, no se versiona.
- **Tabla a 820:** en Saldos, la columna “Control” puede partir palabras largas (“Movimientos”)
  por el ancho disponible y el `overflow-wrap` base. No es una regresión de G1; queda como
  ajuste de tabla responsive para G3/G5.
- **Datos:** Inicio aparece con `ND` en el fixture de tema porque el servidor de tema no siembra
  el resumen completo; la composición y los datos reales se validarán en G2 con el entorno
  funcional.

## Accesibilidad y regresión

- Foco visible lima de 3 px y `outline-offset: 3px` en inputs.
- Sin overflow de página a 390 y 820 en las capturas.
- `theme.spec.ts`, `theme-graphite.spec.ts` y `inicio.spec.ts` PASS; Dark, Light y Hybrid
  conservan sus estilos.
- G1 no cambia tokens cromáticos, contrastes ni el mecanismo de tema; usa los tokens Graphite
  ya validados en 1A.
- La regresión G1 comprueba que `dark-s` recupera `background-image: none`, `h1` 28 px y botón
  sin sombra Graphite.

## Riesgos residuales

| Riesgo | Estado |
| --- | --- |
| `movimientos.spec.ts` timeout en servidor auxiliar 3004 | Abierto; no relacionado con G1; repetir en entorno limpio/CI |
| Tabla de Saldos a 820 parte palabras largas | Abierto; ajuste de tabla responsive en G3/G5 |
| Capturas de Inicio/Movimientos con fixture incompleto | Documentado; G2/G3 usarán datos funcionales |
| CI `required` no ejecuta web/E2E | Evidencia local; no confundir CI con aceptación visual |
| Casa 1A pendiente de merge | G1 no toca catálogo/tokens; rebasar y conservar cinco temas al integrarse |

## Conclusión

G1 está listo para revisión independiente. La capa visual es aditiva, scoped y no cambia la
composición ni la lógica. **No se fusiona ni se despliega** sin autorización.
