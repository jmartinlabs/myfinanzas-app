# Fase final · Light y Hybrid

**Estado:** prototipos aislados, sin integración funcional. **Dark-s no se ha modificado.**
**Rama:** `feature/ui-premium-exploration`.
**Alcance:** Inicio y Movimientos en Light y Hybrid, escritorio 1440. La exploración de los
temas `graphite-lime`, `color-finance` y `pastel-editorial` se mantiene aparte, en
[`../candidates/`](../../graphite-lime-design-2026-11-10/phase-c/candidates/README.md), sin integración.

## Diagnóstico de la iteración anterior

- **Light** ya tenía un héroe oscuro y un objetivo profundo, pero la franja KPI y la posición
  seguían siendo bandas uniformes; el papel no tenía suficiente ritmo y las tarjetas
  secundarias se parecían demasiado entre sí.
- **Hybrid** conservaba bien la sidebar oscura y el héroe, pero el contenido inferior seguía
  demasiado cerca de Light; faltaban bandejas, profundidad y un segundo bloque con carácter.
- **Movimientos** de ambos temas seguía con la versión anterior de Fase C: filtros y tabla
  muy planos, y un detalle oscuro en Light que competía con la tabla.

## Light final · Warm Editorial Finance

- **Bandeja KPI** con cuatro fichas dentro de una bandeja crema. Cada ficha tiene una
  superficie distinta: radial teal, crema con línea naranja, verde salvia punteado y blanco
  con carril teal.
- **Marco crema** alrededor del héroe oscuro: lo integra en el papel en lugar de dejarlo
  flotando.
- **Cabecera de papel** en el ciclo, con índice teal, tabla blanca y cabecera crema.
- **Atención** en arena cálida con borde ámbar y sombra contenida.
- **Objetivo R6** en teal profundo, con arco decorativo y track teal.
- **Bandeja de posición** de cinco fichas, con la cobertura en verde salvia.
- **Movimientos** con filtros de carril teal, cabecera de tabla crema, selección clara y
  **detalle claro** con borde teal. La tabla y el detalle comparten el papel cálido.
- Fondo crema con textura de puntos, arcos editoriales y sombras cálidas.

## Hybrid final · Dark Navigation + Warm Financial Workspace

- Bandeja KPI y bandeja de posición con el mismo sistema que Light, adaptadas a tokens
  híbridos.
- **Marco crema** alrededor del héroe petróleo, con glow teal más marcado.
- **Atención clara** con borde teal y badges semánticos: el héroe sigue siendo el único bloque oscuro protagonista.
- **Objetivo R6 claro** con borde superior teal, para invertir el acento respecto a Light.
- **Movimientos** con filtros y tabla cálidos, selección teal y **detalle claro con más contraste** en encabezados y bordes.
- Fondo crema cálido con glow teal; sidebar petróleo con onda contenida.

## Comparativas antes / después

- `comparativa-inicio-light.png` — Light Inicio, iteración anterior vs final.
- `comparativa-inicio-hybrid.png` — Hybrid Inicio, iteración anterior vs final.
- `comparativa-movimientos-light.png` — Light Movimientos Fase C vs final.
- `comparativa-movimientos-hybrid.png` — Hybrid Movimientos Fase C vs final.
- `comparativa-family.png` — Dark aprobado, Light final y Hybrid final.
- `comparativa-correccion-inicio-hybrid.png` — corrección de Atención oscura → clara.
- `comparativa-correccion-movimientos-light.png` — corrección del detalle oscuro → claro.
- `comparativa-correccion-movimientos-hybrid.png` — corrección del detalle oscuro → claro.

Pantallas completas:

- `shots/after-inicio-light-1440.png`
- `shots/after-inicio-hybrid-1440.png`
- `shots/after-movimientos-light-1440.png`
- `shots/after-movimientos-hybrid-1440.png`

## Tokens y superficies

Los cambios principales son:

- Light: `--paper #F4ECE1`, `--paper-2 #EDE4D7`, `--teal-deep #17363C`, KPI en bandeja,
  cabecera de ciclo crema, posición en fichas y detalle claro con borde teal.
- Hybrid: misma bandeja KPI/posición, atención clara, objetivo claro y detalle claro con más contraste.
- Dark: sin cambios.

Detalle completo en [`tokens.md`](tokens.md).

## QA

- 4 páginas finales a 1440 sin overflow ni errores de consola.
- **0 fallos de contraste** en las parejas comprobadas; mínimo **4.73:1**.
- Light: plan **15.61:1**, objetivo **11.84:1**, detalle claro **16.22:1**.
- Hybrid: atención clara **16.22:1**, detalle claro **16.22:1**.
- **0 textos funcionales < 12 px**.
- Selector Light → Dark → Hybrid y selección de Movimientos verificados.

Detalle en [`qa-report.md`](qa-report.md). No es una auditoría WCAG completa.

## Recomendación

- **Light final:** la opción más editorial y cálida para uso diurno. El héroe y el objetivo R6
  conservan el acento oscuro; el detalle de Movimientos vuelve al papel claro con borde teal.
  La bandeja KPI y el detalle claro son las piezas que más elevan el acabado.
- **Hybrid final:** la alternativa más equilibrada. Sidebar y héroe oscuros, workspace cálido,
  atención clara y objetivo claro. Es la que mejor combina personalidad y lectura diaria.
- **Dark:** referencia intacta.

Si hubiera que elegir un tema diario, **Hybrid final**; para trabajo de día y lectura de tablas,
**Light final**.

## Límites y riesgos

- El héroe y el objetivo R6 de Light conservan el acento oscuro como bloques financieros. El
  detalle y la atención son claros, según la corrección aprobada.
- La bandeja KPI sustituye la banda monolítica por fichas dentro de una bandeja; la fila de
  cuatro indicadores y su orden no cambian.
- No se han diseñado móvil/tablet finales ni estados finales para Light/Hybrid; siguen con la
  versión de Fase C.
- Los tres temas nuevos se exploran en [`../candidates/`](../../graphite-lime-design-2026-11-10/phase-c/candidates/README.md) como
  candidatos visuales aislados; no son temas de producción ni están integrados.
- `UI · SPEC` mantiene cerrados los tokens de producción; esta propuesta no los sustituye.
- Datos sintéticos; sin información real ni Excel.

## Siguiente paso

Validar estas capturas y, si se aprueban, extender Light/Hybrid finales a móvil, tablet y
estados. La exploración de `graphite-lime`, `color-finance` y `pastel-editorial` ya está
iniciada en [`../candidates/`](../../graphite-lime-design-2026-11-10/phase-c/candidates/README.md); queda pendiente su validación visual.
