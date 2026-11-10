# QA · Movimientos y estados de candidatos

Matriz ejecutada con Chromium de Playwright sobre las páginas aisladas de Movimientos y
Estados. No es una auditoría WCAG completa.

## Cobertura

| Vista | Graphite | Color Finance | Pastel Editorial |
| --- | --- | --- | --- |
| Movimientos 1440 | **OK** | **OK** | **OK** |
| Movimientos 820 | **OK** | Base responsive | No validado |
| Movimientos 390 | **OK** + hoja + filtros | **OK** + hoja | No validado |
| Estados 1440 | **OK** | **OK** | **OK** |
| Estados 390 | **OK** | No validado | No validado |

## Resultados

| Comprobación | Resultado |
| --- | --- |
| Overflow horizontal | **0** en todas las vistas |
| Errores de consola | **0** en todas las vistas |
| Texto funcional < 12 px | **0** |
| Fallos de contraste comprobados | **0** |
| Controles táctiles < 44 px a 390 | **0** |
| Cambio de tema | **OK** 3/3 en Movimientos y Estados |
| Hoja de detalle móvil | **OK** abrir, actualizar concepto y cerrar |
| Filtros móviles | **OK** abrir, campos visibles |
| Selector móvil | **OK** 3 valores |
| Formulario de estados | **OK** 9 campos, 10 estados |

Mínimos de contraste:

- **Graphite Lime:** **5,16:1** (metadato del estado guardado sobre menta).
- **Color Finance:** **5,02:1** (`warning` sobre `warning-soft`).
- **Pastel Editorial:** **5,32:1** (`positive` sobre `positive-soft`).

Otros ratios representativos:

- Graphite: tabla **7,60:1** cabecera y **11,00:1** celda; selección **14,38:1**; detalle
  **15,54:1**; nota **6,43:1**; input **17,43:1**.
- Color: tabla **5,62:1** cabecera y **9,27:1** celda; selección **13,02:1**; detalle
  **13,82:1**; nota **5,76:1**; input **15,22:1**.
- Pastel: tabla **8,45:1** cabecera y **11,33:1** celda; selección **14,20:1**; detalle
  **12,94:1**; nota **9,68:1**; input **17,83:1**.

## Cómo se ha comprobado

- Viewports de 1440×1000, 820×1180 y 390×844; capturas a densidad 2×.
- Contraste sobre tokens semánticos y superficies locales: filtros, tabla, selección, detalle,
  hoja móvil, tarjetas, formulario, error y guardado.
- Recorrido de nodos de texto visibles para detectar tamaños menores de 12 px; se excluye solo
  la etiqueta decorativa `brand-sub`.
- Medición de controles visibles a 390: botones, inputs, selects, textareas, paginación, cierre
  de hoja, menú y selector de tema.
- Interacciones móviles: pulsar una tarjeta, comprobar el concepto en la hoja, cerrar, abrir
  filtros y verificar los campos.
- Estados: cambio de tema y presencia de los 9 campos del formulario completo.
- Barrido adicional de ambas páginas en los tres temas a 1024, 820 y 768 px: **sin overflow**
  ni errores de consola.

## Notas

- Los recuentos de controles menores de 44 px a 1440/820 corresponden a controles compactos de
  escritorio (paginación, enlaces y botones secundarios), no a la matriz táctil móvil.
- Pastel Editorial se ha validado solo a 1440; su móvil y sus estados no forman parte de esta
  entrega.
- No se ha probado con lector de pantalla, zoom real al 200 %, navegación completa por teclado
  ni análisis píxel a píxel.
- Datos sintéticos; no se ha usado información real.

## Evidencia

- `qa-movimientos.json`
- `comparativa-movimientos-desktop.jpg`
- `comparativa-movimientos-responsive.jpg`
- `comparativa-movimientos-familia.jpg`
- `comparativa-estados-graphite.jpg`
- `shots-movimientos/` y `shots-estados/`
