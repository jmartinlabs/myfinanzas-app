# Inventario de componentes reutilizables

**Regla:** un componente, tokens por tema. No se crea una segunda librería ni se duplican
pantallas por tema.

## 1. Reutilizar sin cambios

| Componente / patrón | Ubicación actual | Uso futuro en Graphite | Notas |
| --- | --- | --- | --- |
| Shell, sidebar, workspace, header global, footer | `apps/web/src/main.tsx`, `style.css` | Reutilizar | No cambiar anchos, orden ni breakpoints por tema |
| Selector de tema y persistencia | `themes.ts`, `theme-boot.js`, `main.tsx` | Añadir entrada y bloque | Actualizar catálogo, tipo y lista previa al render |
| Navegación y grupos | `navigation.ts`, `main.tsx` | Reutilizar | Solo módulos disponibles; no exponer los del prototipo que no existan |
| `PageHead` | `ui.tsx` | Reutilizar | Título, eyebrow, descripción y acciones |
| `TableScroll`, `Table`, `DataList` | `ui.tsx` | Reutilizar | Tabla escritorio y tarjetas móviles desde la misma definición de columnas |
| `Amount` | `ui.tsx` | Reutilizar | `null` sigue siendo ND/No disponible, nunca cero |
| `Badge` | `ui.tsx` | Reutilizar | Tono ok/partial/nd/info; texto e icono, no solo color |
| `Metric` | `ui.tsx` | Reutilizar | Componer KPI/hero con Metric + Amount + Badge |
| `Alert` | `ui.tsx` | Reutilizar | Error con reintento; no convertirlo en vacío |
| `EmptyState` | `ui.tsx` | Reutilizar | Vacío real, sin filas ni importes inventados |
| `Skeleton` | `ui.tsx` | Reutilizar | Carga con espacio reservado |
| `Field` | `ui.tsx` | Reutilizar | Label, ayuda, error, required y aria-describedby |
| `FormSection`, `FormGrid` | `ui.tsx` | Reutilizar | Secciones y rejilla 2→1 |
| `focusFirstInvalidField` | `ui.tsx` | Reutilizar | Foco al primer error |
| `Switch` | `ui.tsx` | Reutilizar | Booleanos con estado Sin informar |
| `Tag` | `ui.tsx` | Reutilizar | Anulado/inactivo |
| `.panel`, `.alert`, `.notice`, `.empty`, `.tag` | `style.css` | Reutilizar y ajustar tokens | No crear variantes por tema |
| `.filters`, `.list-toolbar`, `.desktop-list`, `.mobile-list`, `.list-footer` | `style.css` | Reutilizar | Filtros, listado y paginación |
| `.theme-picker`, `.nav-active`, `.sidebar-*`, `.global-header` | `style.css` | Reutilizar | El activo de Graphite usa `--sidebar-active-*` |
| Auth screen | `AuthScreen.tsx` | Fuera de alcance | No se rediseña en esta integración |

## 2. Adaptar, no duplicar

| Elemento | Acción propuesta |
| --- | --- |
| Catálogo de temas | Añadir `graphite-lime` en `themes.ts` y `theme-boot.js`; conservar IDs y persistencia |
| Bloque de tokens | Añadir un bloque en `themes.css`; no tocar los bloques actuales |
| Botones y inputs | Reutilizar tokens `--action*`, `--control-*`, `--focus`, `--radius*` |
| Tablas | Aplicar los tokens Graphite a `Table/DataList`; conservar densidad, scroll y semántica |
| Badges y estados | Mapear `ok/partial/nd/info` a positivo/aviso/neutro/info; no usar lima para ok |
| Navegación | Aplicar tokens; no cambiar el inventario de rutas |
| Foco | Extender la regla global a inputs/selects/textarea; el base actual sustituye outline por borde/sombra y necesita un anillo explícito |
| Movimiento reducido | Extender la regla de producción para cubrir todas las transiciones, no solo un summary |
| Inicio | Componer el hero/KPI con primitivas existentes; extraer un patrón compartido solo si se repite en otros módulos |

## 3. Patrones del prototipo, todavía no componentes de producción

Estos patrones están resueltos visualmente, pero no deben convertirse en una librería paralela:

- Hero financiero y banda de control.
- Bandeja KPI con fichas y jerarquía cromática.
- Tarjeta de ciclo real vs plan.
- Rail de Atención y Objetivo R6.
- Bandeja de posición de cinco fichas.
- Barras de presupuesto.
- Panel/hoja de detalle de Movimientos.
- Tarjetas de formulario de Compra y Amortización.

**Criterio:** se implementan como composición de `Metric`, `Amount`, `Badge`, `Table`,
`Field`, `FormSection`, `Panel` y CSS de página. Solo se extraen a componente compartido si
aparecen en dos o más módulos con la misma semántica. No se extraen por estética.

## 4. Formularios: usar los existentes

La aplicación ya tiene formularios funcionales que deben conservarse:

- `apps/web/src/Inversiones.tsx` → Compra: fecha, instrumento, saldos, cantidad, precio,
  divisa, cambio condicional, importe EUR, comisión, concepto y nota.
- `apps/web/src/Movimientos.tsx` → Amortización deuda: tipo, fecha, importe, concepto,
  saldo origen, partida, referencia, nota, deuda derivada y capital/intereses de solo lectura.

Las páginas de formularios de Graphite **no sustituyen** esos formularios. Sirven para validar
la presentación de campos, el cambio condicional y los derivados. La implementación debe:

1. Reutilizar los campos y la lógica existentes.
2. Aplicar estilos/tokens, no reescribir validación ni payload.
3. Mantener `required`, `aria-describedby`, foco al error, borrador y estados deshabilitados.
4. No convertir ausencia en cero ni inventar referencias, deudas o cambios.
5. Conservar los controles nativos (fecha, selects, inputs) y su locale.

## 5. Gráficos e indicadores

- No añadir una librería de gráficos.
- El prototipo usa SVG ligero para sparkline y anillo; si se integra, mantenerlo como SVG de
  página o extraer un componente pequeño solo si se repite.
- Colores de series: `--chart-1..4`, `--chart-strong`, `--chart-accent`.
- Cualquier gráfico debe tener texto/aria-label, no depender solo del color y respetar
  `prefers-reduced-motion`.
- Los indicadores numéricos siguen usando `Amount` y su estado (`Verificado`, `Parcial`, `ND`).

## 6. Navegación y rutas

- El prototipo incluye módulos futuros en la sidebar; producción solo debe mostrar lo que ya
  existe y es operable.
- El tema no cambia el orden, los permisos ni el comportamiento del menú.
- El selector de tema debe seguir con las mismas garantías: preferencia guardada, fallback
  `dark-s`, sin parpadeo y sin cambiar la URL.
- No duplicar el shell para el tema: un único `main.tsx` y una única navegación.

## 7. Responsive compartido

- Reutilizar breakpoints 1050/760 y el patrón tabla ↔ tarjetas de `Table`/`DataList`.
- No crear breakpoints por tema.
- Mantener 44 px de objetivo táctil, foco visible y cero overflow de página a 390.
- El detalle de Movimientos puede ser panel lateral en escritorio y hoja inferior en móvil,
  reutilizando el mismo contenido.

## 8. Lo que no se debe hacer

- Copiar `candidates.css` dentro de producción como un tema completo con clases propias.
- Crear un `graphite-components.tsx` paralelo.
- Duplicar `Table`, `DataList`, `Field`, `Badge` o `Amount` por tema.
- Cambiar `themes.ts` sin `theme-boot.js` o viceversa.
- Convertir el prototipo de formularios en una segunda implementación funcional.
- Introducir métricas, campos o acciones que no estén en las specs vigentes.
