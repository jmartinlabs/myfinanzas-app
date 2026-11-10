# QA · Candidatos de Inicio

Matriz de escritorio 1440 × 1000 sobre la página aislada `inicio-candidatos.html`. No es una
auditoría WCAG completa.

| Comprobación | Graphite Lime | Color Finance | Pastel Editorial |
| --- | --- | --- | --- |
| Overflow horizontal | **0** | **0** | **0** |
| Errores de consola | **0** | **0** | **0** |
| Texto funcional < 12 px | **0** | **0** | **0** |
| Fallos de contraste comprobados | **0** | **0** | **0** |
| Contraste mínimo | **6,00:1** | **4,93:1** | **5,30:1** |
| Cambio de tema | **OK** | **OK** | **OK** |
| Selector móvil con 3 valores | **OK** | **OK** | **OK** |

Alturas de página renderizadas: Graphite **1785 px**, Color Finance **1784 px**, Pastel
**1833 px**. Ninguna genera scroll horizontal.

## Cómo se ha comprobado

- Chromium de Playwright, viewport de 1440 × 1000 y capturas a densidad 2×.
- Contraste calculado sobre tokens semánticos y sobre parejas locales de las superficies
  tintadas: KPI, Atención, Objetivo, Presupuesto, Posición, cabeceras de tabla y héroe.
- Detección de texto funcional por debajo de 12 px recorriendo nodos de texto visibles.
- Cambio secuencial entre los tres temas desde el selector de cabecera, verificando
  `data-theme`, ancho de scroll y errores.
- Comprobación de que el selector móvil contiene `graphite-lime`, `color-finance` y
  `pastel-editorial`.

## Ratios relevantes

### Graphite Lime

- KPI: etiqueta **6,87:1**, valor **16,55:1**, ingreso **11,50:1**, gasto **8,98:1**,
  metadato **6,16:1**.
- Tabla: cabecera **7,60:1**, celda **10,92:1**.
- Atención: título **16,11:1**, metadato **6,00:1**.
- Objetivo: valor **16,09:1**, metadato **6,17:1**.
- Presupuesto: nombre **10,92:1**, metadato **6,25:1**.
- Mínimo global: **6,00:1**.

### Color Finance

- KPI: etiquetas **5,09–5,51:1**, valores oscuros sobre tarjetas pastel, metadatos
  **5,77–6,96:1**.
- Tabla: cabecera **4,93:1**, celda **9,27:1**.
- Atención: metadato **5,86:1**; Objetivo: metadato **5,11:1**; Presupuesto: metadato
  **5,58:1**.
- Posición: etiqueta y metadato **5,77:1** en la ficha lavanda.
- Mínimo global: **4,93:1**.

### Pastel Editorial

- KPI: etiquetas **7,29–7,98:1**, metadatos **5,61–6,14:1**.
- Tabla: cabecera **8,45:1**, celda **11,33:1**.
- Atención: metadato **5,83:1**; Objetivo: metadato **5,73:1**.
- Presupuesto: metadato **5,30:1**.
- Posición: etiqueta **7,44:1**, valor **14,20:1**, metadato **5,72:1**.
- Mínimo global: **5,30:1**.

## Tipografía

- Los textos funcionales de 12 px se mantienen en 12 px: etiquetas KPI, metadatos, cabeceras
  de tabla, badges, cobertura, pies y navegación.
- No se ha reducido ninguna etiqueta para forzar contenido en el primer pliegue.
- Los importes principales conservan 50 px en el héroe y 28 px en KPI; las tablas usan 12–13 px.
- Los números siguen en cifras tabulares; Pastel reserva el serif para titulares, no para
  importes.

## Interacciones

- Cambio Graphite → Color → Pastel y vuelta, sin overflow ni errores.
- El selector de cabecera y el de móvil comparten los mismos tres valores.
- La selección de tema no persiste entre recargas; no forma parte de esta exploración.

## Límites

- Solo Inicio a 1440; no se han probado Movimientos, móvil, tablet ni estados de los candidatos.
- La comprobación de contraste es representativa: no mide cada píxel ni cada combinación de
  opacidad, gradiente y texto.
- No se ha probado con lector de pantalla, zoom real al 200 % ni navegación por teclado
  completa.
- Datos sintéticos; no se ha usado información real.
- No se ha medido rendimiento; los recursos son CSS/SVG locales y ligeros.

## Evidencia

- `shots/graphite-lime-1440.jpg`
- `shots/color-finance-1440.jpg`
- `shots/pastel-editorial-1440.jpg`
- `shots/{tema}-1440-fold.jpg`
- `shots/{tema}-{hero,kpis,cycle,rail,movements,budget,position}.jpg`
- `comparativa-candidatos.jpg`
- `comparativa-candidatos-full.jpg`
- `comparativa-familia-6.jpg`
- `qa-report.json`
