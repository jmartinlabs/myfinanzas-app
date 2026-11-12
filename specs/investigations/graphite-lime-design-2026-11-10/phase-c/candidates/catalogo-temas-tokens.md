# Catálogo de temas y propuesta de tokens

**Estado:** propuesta de consolidación. No se ha modificado `apps/web/public/themes.css`,
`apps/web/src/themes.ts` ni `apps/web/public/theme-boot.js`.

## 1. Catálogo

### Temas vigentes

| ID | Etiqueta actual | `color-scheme` | Estado |
| --- | --- | --- | --- |
| `dark-s` | Oscuro | dark | Aprobado; referencia de calidad |
| `light-s` | Claro | light | Aprobado |
| `hybrid-s` | Mixto | light | Aprobado |

### Candidatos

| ID propuesto | Etiqueta propuesta | `color-scheme` | Estado | Prioridad |
| --- | --- | --- | --- | --- |
| `graphite-lime` | Grafito | dark | **Dirección visual aprobada**; implementación pendiente | **1** |
| `color-finance` | Color | light | Candidato visual conservado; sin más refinamiento | 2 |
| `pastel-editorial` | Editorial | light | Candidato experimental conservado; sin más refinamiento | 3 |

La etiqueta "Grafito" es una propuesta de catálogo en español; el nombre interno y de
documentación sigue siendo `graphite-lime`.

### Mecanismo de extensión

La incorporación futura debe reutilizar el mecanismo actual:

1. Bloque `:root[data-theme="graphite-lime"]` en `apps/web/public/themes.css`.
2. Entrada en `themeCatalog` de `apps/web/src/themes.ts` con `id`, `label` y `colorScheme`.
3. Actualización de la lista `known` de `apps/web/public/theme-boot.js`.
4. Conservar `THEME_STORAGE_KEY = "mf-theme"`, `DEFAULT_THEME = "dark-s"` y el fallback.
5. No crear un segundo selector ni un segundo sistema de tokens.
6. Mantener el orden actual y **añadir Grafito al final** en la primera integración; una
   reorganización del catálogo sería una decisión aparte.

El `theme-boot.js` es un punto crítico: si se añade el tema al catálogo React pero no a la
lista previa al render, una preferencia guardada `graphite-lime` caerá a `dark-s` en la
siguiente carga. Debe actualizarse en el mismo incremento.

## 2. Tokens propuestos para Graphite Lime

Estos valores traducen el prototipo a los nombres semánticos de producción. No son todavía
código de producción.

### Superficies y chrome

| Token | Valor propuesto | Rol |
| --- | --- | --- |
| `--bg` | `#0B0C0B` | Fondo |
| `--surface` | `#131513` | Superficie base |
| `--surface-2` | `#191C18` | Superficie elevada |
| `--surface-3` | `#0E100E` | Superficie hundida |
| `--sidebar` | `#080908` | Navegación |
| `--sidebar-text` | `#F3F6EC` | Texto de navegación |
| `--sidebar-muted` | `#8F988B` | Texto secundario de navegación |
| `--sidebar-border` | `#1E221D` | Borde de navegación |
| `--sidebar-hover` | `#171A16` | Hover de navegación |
| `--sidebar-active-bg` | `#D7FF5E` | Activo sólido lima |
| `--sidebar-active-text` | `#0B0E08` | Texto sobre activo |
| `--sidebar-focus` | `#D7FF5E` | Foco en navegación |
| `--brand-accent` | `#D7FF5E` | Marca |
| `--header-bg` | `#0B0C0B` | Cabecera |
| `--footer-bg` | `#080908` | Pie |

### Texto, bordes y controles

| Token | Valor propuesto | Rol |
| --- | --- | --- |
| `--text` | `#F1F4EC` | Texto principal |
| `--muted` | `#8F988B` | Texto secundario |
| `--border` | `#2B2F2A` | Borde estándar |
| `--control-border` | `#4A5346` | Borde de control |
| `--focus` | `#D7FF5E` | Foco visible |
| `--disabled-bg` | `#171A16` | Deshabilitado |
| `--disabled-text` | `#6F786C` | Texto deshabilitado |
| `--input-bg` | `#0C0E0C` | Inputs |
| `--table-head` | `#0E110E` | Cabecera de tabla |
| `--row-hover` | `#171A16` | Hover de fila |
| `--selected` | `#1C2417` | Selección |

### Acción, marca y semántica

| Token | Valor propuesto | Rol | Restricción |
| --- | --- | --- | --- |
| `--action` | `#D7FF5E` | Acción primaria | No usar para importes positivos |
| `--on-action` | `#0B0E08` | Texto sobre acción | — |
| `--action-hover` | `#E2FF7C` | Hover | — |
| `--on-action-hover` | `#0B0E08` | Texto hover | — |
| `--action-active` | `#C2E84A` | Activo | — |
| `--on-action-active` | `#0B0E08` | Texto activo | — |
| `--action-soft` | `#232819` | Fondo suave de acción/info | No confundir con positivo |
| `--action-soft-border` | `#3B4426` | Borde suave | — |
| `--accent` | `#D7FF5E` | Marca, enlaces, info | No usar para resultados positivos |
| `--on-accent` | `#0B0E08` | Texto sobre marca | — |
| `--accent-soft` | `#232819` | Fondo informativo | — |
| `--accent-border` | `#3B4426` | Borde informativo | — |
| `--positive` | `#7FE0A8` | Ingresos, devoluciones, correcto | **Independiente de `--accent`** |
| `--positive-soft` | `#1D2720` | Fondo positivo | — |
| `--positive-border` | `#2F4234` | Borde positivo | — |
| `--negative` | `#FF9A8C` | Gastos, importes negativos | — |
| `--negative-soft` | `#28211D` | Fondo negativo | — |
| `--negative-border` | `#4A302A` | Borde negativo | — |
| `--warning` | `#FFD166` | Parcial, pendiente, aviso | — |
| `--warning-soft` | `#28261B` | Fondo de aviso | — |
| `--warning-border` | `#4A432A` | Borde de aviso | — |
| `--error` | `#FF8178` | Error | — |
| `--error-soft` | `#2A1B19` | Fondo de error | — |
| `--error-border` | `#4A2B27` | Borde de error | — |
| `--ok` | `#7FE0A8` | Estado correcto | Igual a positivo, no a lima |

### Datos, gráficos y elevación

| Token | Valor propuesto | Rol |
| --- | --- | --- |
| `--strong-surface` | `#181C15` | Héroe/detalle protagonista |
| `--on-strong` | `#F1F4EC` | Texto sobre bloque fuerte |
| `--muted-on-strong` | `#A6AFA0` | Texto secundario sobre bloque fuerte |
| `--strong-border` | `#2F362C` | Borde de bloque fuerte |
| `--chart-1` | `#D7FF5E` | Serie principal/marca |
| `--chart-2` | `#7FE0A8` | Serie positiva |
| `--chart-3` | `#FFD166` | Serie de aviso |
| `--chart-4` | `#C2C8BC` | Serie neutra |
| `--chart-strong` | `#F1F4EC` | Serie sobre bloque fuerte |
| `--chart-accent` | `#D7FF5E` | Acento de gráfico |
| `--chip-bg` | `#232819` | Filtros/chips |
| `--chip-border` | `#3B4426` | Borde de chip |
| `--chip-text` | `#D7FF5E` | Texto de chip |
| `--shadow-1` | `rgb(0 0 0 / 0.40)` | Sombra principal |
| `--shadow-2` | `rgb(0 0 0 / 0.24)` | Sombra secundaria |

La elevación se compone en CSS con `box-shadow` y estos dos colores; no se propone una escala
nueva de sombras.

## 3. Fundamentos reutilizados

No se propone duplicar la escala existente de `apps/web/src/style.css`.

| Grupo | Tokens existentes | Decisión |
| --- | --- | --- |
| Tipografía | `--text-xs 12`, `--text-sm 13`, `--text-base 14`, `--text-md 16`, `--text-xl 28` | Reutilizar |
| Interlineado | `--leading-tight/snug/normal/relaxed` | Reutilizar |
| Espaciado | `--space-1..12` | Reutilizar |
| Radios | `--radius-sm 6`, `--radius 10`, `--radius-pill` | Reutilizar; el prototipo usa 10/8/7, diferencia menor |
| Foco | `--focus-width 3`, `--focus-offset 3` | Reutilizar y garantizar en inputs |
| Controles | `--control-min 44`, `--touch-min 44` | Reutilizar |
| Shell | `--sidebar-width 236`, `--content-max 1450` | **Conservar producción**; el prototipo usa 264 como composición de diseño |
| Sombras | `--shadow-1`, `--shadow-2` | Reutilizar como colores |

### Posible extensión mínima

Solo si se adopta la composición de Inicio aprobada:

- `--text-2xl: 36px` para el título de página/hero secundario.
- `--text-hero: 50px` para la cifra protagonista.

No se añaden en el incremento de tokens; se decidirían en el incremento de Inicio. Movimientos
y el shell no necesitan tokens tipográficos nuevos.

## 4. Reglas semánticas obligatorias

- `--accent`/`--action` = marca, acción, foco, selección, información. **Nunca** ingresos,
  resultados positivos ni “Completo/Guardado”.
- `--positive`/`--ok` = ingresos, devoluciones, estados correctos. **Nunca** botones primarios
  ni navegación activa.
- `--negative`/`--error` = gasto/importe negativo vs error de sistema; no intercambiarlos.
- `--warning` = parcial/pendiente; no usarlo para errores.
- `--muted` = neutro, anulado, no disponible, “Vigente” como estado neutro.
- La selección combina color + barra/forma + texto; el color no es el único canal.

## 5. Mapa prototipo → producción

| Prototipo (`candidates.css`) | Producción (`themes.css`) | Observación |
| --- | --- | --- |
| `--bg`, `--surface`, `--surface-2`, `--surface-3` | mismos nombres | Directo |
| `--sidebar*` | `--sidebar*` | Directo; activo sólido lima |
| `--text`, `--muted`, `--border`, `--control-border` | mismos | Directo |
| `--text-2`, `--muted-2` | `--muted` o `--text` según rol | No crear tokens nuevos sin necesidad |
| `--accent`, `--accent-ink` | `--accent`, `--on-accent` | `--accent-ink` no es nombre de producción |
| `--orange`, `--orange-hi`, `--on-orange` | `--action`, `--action-hover`, `--on-action` | El prototipo usa "orange" como nombre histórico |
| `--positive*`, `--negative*`, `--warning*`, `--error*` | mismos | Directo |
| `--selected-bg`, `--selected-border` | `--selected` | Producción usa un único token de fondo; el borde se compone |
| `--shadow`, `--shadow-soft` | `--shadow-1`, `--shadow-2` | Producción usa colores de sombra, no sombras completas |
| `--hero-*` | `--strong-*` + `--chart-*` | No crear tokens `hero-*` de producción |
| `--card-bg`, `--card-border` | `--surface`/`--surface-2`, `--border` | Evitar un segundo sistema de tarjetas |
| `--radius` 10, `--radius-sm` 8 | `--radius` 10, `--radius-sm` 6 | Diferencia menor; no duplicar radios por tema |

## 6. Compatibilidad de temas

- Mantener los tres temas actuales sin cambios de tokens.
- Añadir Grafito como cuarto bloque; no renombrar IDs existentes.
- Conservar la preferencia guardada; un ID desconocido sigue cayendo a `dark-s`.
- `color-scheme` del bloque debe ser `dark`.
- Los componentes deben consumir tokens; no añadir condicionales por `data-theme` salvo para
  ajustes de superficie muy justificados.
- El tema no debe cambiar el ancho de sidebar, breakpoints ni estructura de navegación.

## 7. Riesgo principal de tokens

El tema actual de producción declara `--positive` con el mismo valor que `--accent` en Dark,
Light y Hybrid. Graphite debe romper esa igualdad (`--accent` lima, `--positive` menta). Antes
de integrar hay que auditar cualquier componente que use `--accent` para representar un
resultado positivo. Es un cambio semántico correcto, pero puede revelar estilos heredados.
