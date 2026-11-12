# QA · Light y Hybrid finales

Matriz de escritorio 1440 × 1000 sobre Inicio y Movimientos. No es una auditoría WCAG completa.

| Comprobación | Resultado |
| --- | --- |
| Páginas finales | 4 |
| Overflow horizontal | **0** |
| Errores de consola | **0** |
| Fallos de contraste de tokens | **0** |
| Texto funcional < 12 px | **0** |
| Selector Light → Dark → Hybrid | **OK** |
| Selección de Movimientos | **OK** en Light y Hybrid |

## Ratios mínimos

- Light: `on-orange` / `orange` **4.73:1**; `sidebar-muted` / `sidebar` **5.45:1**.
- Hybrid: `on-orange` / `orange` **4.73:1**; `sidebar-active-text` / activo **5.82:1**.
- Light plan **15.61:1**; Light objetivo **11.84:1**; Light detalle claro **16.22:1**.
- Hybrid atención clara **16.22:1**; Hybrid detalle claro **16.22:1**.

## Interacciones

- Cambio de tema en la página final de Inicio.
- Selección de una fila de Movimientos y actualización del detalle claro en Light y Hybrid.
- Sin overflow al cambiar de tema.

## Límites

- Solo escritorio 1440: móvil, tablet y estados finales no forman parte de esta entrega.
- No se ha probado con lector de pantalla, zoom real al 200 % ni una auditoría píxel a píxel.
- Los contrastes se comprueban sobre tokens y superficies representativas.
- Datos sintéticos; sin información real.
- No se ha medido rendimiento; los recursos son CSS/SVG ligeros.

## Evidencia

- `comparativa-inicio-light.png`
- `comparativa-inicio-hybrid.png`
- `comparativa-movimientos-light.png`
- `comparativa-movimientos-hybrid.png`
- `comparativa-family.png`
- `shots/after-inicio-light-1440.png`
- `shots/after-inicio-hybrid-1440.png`
- `shots/after-movimientos-light-1440.png`
- `shots/after-movimientos-hybrid-1440.png`
- `qa-report.json`
