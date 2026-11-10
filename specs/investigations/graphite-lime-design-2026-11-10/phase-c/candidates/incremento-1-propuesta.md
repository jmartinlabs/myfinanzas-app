# Incremento 1 · Propuesta concreta

**Estado:** propuesta para revisión. **No iniciado.**
**Precheck 2026-11-10:** **BLOQUEADO** por la spec UI vigente (tres temas cerrados y
prohibición de tocar `themes.css`, `themes.ts` y `theme-boot.js`). Ver
[`incremento-1-bloqueo.md`](incremento-1-bloqueo.md).
**Objetivo:** incorporar Graphite Lime como cuarto tema seleccionable, sin cambiar componentes,
pantallas, datos ni comportamiento funcional.

## 0. Resumen ejecutivo

El Incremento 1 es deliberadamente pequeño:

- Añade un bloque de tokens Graphite al catálogo existente.
- Añade el tema al selector y al arranque previo a React.
- No toca `main.tsx`, `ui.tsx`, páginas de módulos, formularios, API ni SQLite.
- No adopta todavía la composición visual de Inicio/Movimientos; eso corresponde a los
  incrementos 2–4.
- Incluye pruebas de catálogo, persistencia, arranque, colores clave y no regresión de los tres
  temas actuales.

La propuesta tiene dos partes separables:

- **1A (necesaria):** tokens, catálogo, boot y pruebas del tema.
- **1B (recomendada, revertible):** refuerzo global de `prefers-reduced-motion`.

El foco visible de inputs en producción ya existe mediante `:focus-visible` global; no se propone
cambiar esa regla. Sí se añade cobertura para evitar que se pierda.

## 1. Archivos que se modificarían

### 1A · Tema y catálogo

| Archivo | Tipo | Cambio |
| --- | --- | --- |
| `apps/web/public/themes.css` | Modificación aditiva | Bloque `:root[data-theme="graphite-lime"]` con tokens ya existentes en el contrato |
| `apps/web/src/themes.ts` | Modificación aditiva | Entrada `{ id: "graphite-lime", label: "Grafito", colorScheme: "dark" }` al final del catálogo |
| `apps/web/public/theme-boot.js` | Modificación mínima | Añadir `"graphite-lime"` a `known` |
| `apps/web/test/themes.test.ts` | Archivo nuevo | Catálogo, IDs, etiqueta, `colorScheme`, default e `isThemeId` |
| `tests/e2e/theme-graphite.spec.ts` | Archivo nuevo | Graphite en selector/persistencia/boot, colores clave, 1440/390 y capturas; no toca la suite de los tres temas |

### 1B · Movimiento reducido

| Archivo | Tipo | Cambio |
| --- | --- | --- |
| `apps/web/src/style.css` | Modificación mínima | Extender la regla existente `prefers-reduced-motion: reduce` a transiciones/animaciones globales |

### Archivos que **no** se tocan en el Incremento 1

- `apps/web/src/main.tsx`: el selector ya se genera desde `themeCatalog`.
- `apps/web/src/ui.tsx`: primitivas compartidas sin cambios.
- Páginas de módulos (`Inicio.tsx`, `Movimientos.tsx`, `Saldos.tsx`, `Inversiones.tsx`, etc.).
- `apps/web/src/style.css` en 1A; solo la regla de motion en 1B.
- API, DTO, SQLite, migraciones, Excel, motores financieros.
- `package.json`, `bun.lock`, workflows, Docker, CI o despliegue.
- `artifacts/ui-premium/phase-c/candidates/`: se preserva entero como referencia; no se copia a
  producción.

## 2. Cambio en el catálogo

`apps/web/src/themes.ts`:

```ts
export const themeCatalog = [
  { id: "light-s", label: "Claro", colorScheme: "light" },
  { id: "dark-s", label: "Oscuro", colorScheme: "dark" },
  { id: "hybrid-s", label: "Mixto", colorScheme: "light" },
  { id: "graphite-lime", label: "Grafito", colorScheme: "dark" },
] as const;
```

Decisiones:

- Se **añade al final** para no alterar el orden existente del selector.
- `DEFAULT_THEME` sigue siendo `dark-s`.
- `THEME_STORAGE_KEY` sigue siendo `mf-theme`.
- `ThemeId` se amplía automáticamente por el `as const`.
- `isThemeId` y `currentTheme` no cambian de lógica.
- No se renombra ningún ID ni etiqueta actual.
- `color-scheme: dark` debe declararse en el bloque CSS.

`apps/web/public/theme-boot.js`:

```js
var known = ["light-s", "dark-s", "hybrid-s", "graphite-lime"];
```

Sin este cambio, una preferencia `graphite-lime` guardada caería a `dark-s` en la recarga.

## 3. Cambio en tokens

Se añade **un bloque nuevo** al final de `apps/web/public/themes.css`:

- Sin editar los bloques `dark-s`, `light-s` ni `hybrid-s`.
- Sin añadir nombres de token nuevos: usa el contrato semántico existente.
- Sin selectores de componentes; solo `:root[data-theme="graphite-lime"]`.
- Sin gradientes de página ni composición de hero/KPI dentro del bloque de tokens.
- `--positive` se separa de `--accent`: lima para marca/acción, menta para positivo.
- `--sidebar-active-bg` lima sólido con texto oscuro.
- `--chart-1..4` y `--strong-*` reutilizan los nombres actuales.

La tabla completa está en
[`catalogo-temas-tokens.md`](catalogo-temas-tokens.md#2-tokens-propuestos-para-graphite-lime).
Resumen de valores clave:

```css
:root[data-theme="graphite-lime"] {
  color-scheme: dark;
  --bg: #0B0C0B;
  --surface: #131513;
  --surface-2: #191C18;
  --surface-3: #0E100E;
  --sidebar: #080908;
  --sidebar-text: #F3F6EC;
  --sidebar-muted: #8F988B;
  --sidebar-border: #1E221D;
  --sidebar-hover: #171A16;
  --sidebar-active-bg: #D7FF5E;
  --sidebar-active-text: #0B0E08;
  --sidebar-focus: #D7FF5E;
  --brand-accent: #D7FF5E;
  --text: #F1F4EC;
  --muted: #8F988B;
  --border: #2B2F2A;
  --control-border: #4A5346;
  --action: #D7FF5E;
  --on-action: #0B0E08;
  --action-hover: #E2FF7C;
  --action-active: #C2E84A;
  --action-soft: #232819;
  --accent: #D7FF5E;
  --on-accent: #0B0E08;
  --accent-soft: #232819;
  --accent-border: #3B4426;
  --focus: #D7FF5E;
  --positive: #7FE0A8;
  --positive-soft: #1D2720;
  --positive-border: #2F4234;
  --negative: #FF9A8C;
  --negative-soft: #28211D;
  --negative-border: #4A302A;
  --warning: #FFD166;
  --warning-soft: #28261B;
  --warning-border: #4A432A;
  --error: #FF8178;
  --error-soft: #2A1B19;
  --error-border: #4A2B27;
  --ok: #7FE0A8;
  --selected: #1C2417;
  --row-hover: #171A16;
  --input-bg: #0C0E0C;
  --table-head: #0E110E;
  --chip-bg: #232819;
  --chip-border: #3B4426;
  --chip-text: #D7FF5E;
  --strong-surface: #181C15;
  --on-strong: #F1F4EC;
  --muted-on-strong: #A6AFA0;
  --strong-border: #2F362C;
}
```

Los valores restantes (hover/active, disabled, sombras, charts, header/footer, etc.) están en la
tabla del catálogo. No se propone añadir `--text-2xl`/`--text-hero` en este incremento; solo serían
necesarios si se adopta la composición de Inicio en el Incremento 3.

## 4. Dependencias y conflictos

### Con UI DEV-04

- DEV-04 I4 está pendiente y toca fundamentos/componentes; coordinación obligatoria antes de
  abrir el PR.
- El Incremento 1 evita `ui.tsx`, `main.tsx` y las páginas de módulo, reduciendo el conflicto a
  `themes.css`, `themes.ts`, `theme-boot.js` y tests de tema.
- DEV-04 conserva `theme.spec.ts`; el Incremento 1 añade `theme-graphite.spec.ts` para no tocarlo. Solo `style.css` (1B) coincide con DEV-04; se separa o coordina.
- El PR del Incremento 1 no debe incluir cambios de DEV-04 ni de módulos.

### Con desarrollo funcional

- No hay dependencia de motores financieros para tokens/catálogo.
- La rama de diseño está **33 commits por delante de `origin/main`** e incluye trabajo funcional
  reciente (E4.5, auth, DEV-06 I4). **No se debe fusionar la rama de exploración completa.**
- El Incremento 1 debe partir de la base autorizada (`test`/`main` según el flujo) y portar solo
  los archivos de tema/tests, o cherry-pick limpio. No arrastrar commits funcionales.
- Los módulos con DEV no autorizado o AC pendientes (E4.5, E4.10–E4.12, etc.) no reciben cambios
  por este incremento.
- No tocar API, DTO, SQLite, Excel ni migraciones.

### Riesgos específicos

| Riesgo | Mitigación |
| --- | --- |
| Etiqueta “Grafito” más ancha que “Oscuro” y posible cambio de ancho del selector | Test 1440/390; si hiciera falta, fijar un ancho mínimo/máximo en `.theme-picker select` en un cambio separado y reversible |
| Tests asumen tres temas | No cambiar los arrays `THEMES` de módulos; añadir Graphite en una suite nueva |
| Boot y catálogo desincronizados | Actualizar ambos en el mismo commit y probar recarga |
| `--positive` igual a `--accent` en los temas actuales | Graphite los separa; auditar componentes que usen `--accent` como positivo antes de la adopción visual |
| Regla global de reduced motion afecta a los tres temas | 1B separado y revertible; probar que el modo normal no cambia |
| Foco de inputs | Ya existe `:focus-visible` global; añadir aserción E2E, no cambiar la regla si pasa |
| Conflicto con rama de diseño | No fusionar la rama completa; solo archivos de tema y tests |

## 5. Pruebas

### Unitarias (`bun test apps/web`)

Nuevo `apps/web/test/themes.test.ts`:

- Catálogo con 4 IDs únicos.
- `graphite-lime` existe, `colorScheme: "dark"`, etiqueta `Grafito`.
- `isThemeId("graphite-lime") === true`.
- `isThemeId("desconocido") === false`.
- `DEFAULT_THEME === "dark-s"`.
- El orden actual de los tres temas se conserva y Graphite queda al final.

### E2E (`tests/e2e/theme-graphite.spec.ts`, nuevo)

Nuevo test aislado:

- El selector ofrece 4 opciones y Graphite es seleccionable.
- Graphite aplica `data-theme="graphite-lime"`.
- `body` y `sidebar` tienen los colores Graphite esperados.
- El botón primario usa `--action` lima y su hover `--action-hover`.
- La tabla/listado existente sigue mostrando los mismos datos.
- 1440 y 390 sin overflow.
- Capturas `artifacts/theme/graphite-lime-1440.jpg` y `-390.jpg`.
- La recarga conserva Graphite.
- Los tres temas actuales conservan sus colores y persistencia.
- `theme-boot` aplica Graphite antes de React.
- Un valor desconocido cae a `dark-s`.
- Sin errores de consola.

### Contraste

- Comprobación de los pares críticos Graphite en la suite nueva: texto/superficie, muted/superficie,
  acción/on-action, positivo/superficie, negativo/superficie, warning/superficie, sidebar y activo.
- Umbral AA 4,5:1 para texto normal; 3:1 para componentes.
- No se crea un motor de contraste nuevo: se reutiliza una función local de ratio en el test.

### Verificación

```bash
bun run typecheck
bun run build
bun test apps/web
bun run test:e2e -- tests/e2e/theme-graphite.spec.ts
python3 scripts/verify --full
```

El perfil completo debe ejecutar API/E2E y demostrar que no hay regresiones.

## 6. Criterios de aceptación

| ID | Criterio |
| --- | --- |
| AC-1 | `graphite-lime` aparece en el selector como “Grafito”. |
| AC-2 | Se aplica y persiste tras recarga; el arranque previo a React no muestra otro tema. |
| AC-3 | Los IDs, etiquetas, colores y persistencia de Dark/Light/Hybrid no cambian. |
| AC-4 | `dark-s` sigue siendo el tema por defecto y el fallback de IDs desconocidos. |
| AC-5 | Los pares críticos Graphite cumplen AA. |
| AC-6 | Foco visible, sin overflow a 1440/390 y sin errores de consola. |
| AC-7 | No se modifica ningún componente, página, API, SQLite, Excel ni workflow. |
| AC-8 | El diff se limita a los archivos declarados; sin formateo masivo ni cambios accidentales. |
| AC-9 | `typecheck`, `build`, `bun test apps/web`, E2E de tema y `scripts/verify --full` pasan. |
| AC-10 | Los prototipos y documentación quedan preservados y referenciados. |

## 7. Regresión de los tres temas existentes

1. **Aditivo:** solo se añade un bloque CSS y una entrada al final del catálogo; no se editan
   valores existentes.
2. **Catálogo estable:** `DEFAULT_THEME`, `THEME_STORAGE_KEY`, IDs y etiquetas actuales no cambian.
3. **Tests intactos:** no se modifican los arrays `THEMES` de los módulos; los tests actuales de
   selector/persistencia siguen ejecutándose.
4. **Test de tema ampliado:** conserva las aserciones de Dark/Light/Hybrid y añade Graphite.
5. **Snapshot visual:** capturas 1440/390 de los cuatro temas; revisión de que los tres actuales
   son idénticos salvo el selector (cuarta opción).
6. **Diff acotado:** revisión de `git diff --stat` y `git diff --check`; sin cambios en `ui.tsx`,
   `main.tsx`, módulos ni `style.css` salvo 1B.
7. **Rollback:** retirar el bloque y la entrada del catálogo restaura el estado anterior sin
   migración de datos.
8. **Gate:** no se expone el tema en `test`/`main` hasta que QA y revisión independiente aprueben.

## 8. Preservación de prototipos y documentación

Los prototipos están en `artifacts/`, que está ignorado por Git. Para que no dependan solo del
worktree local:

1. **No borrar ni mover** `artifacts/ui-premium/phase-c/candidates/`; se conserva como archivo de
   diseño.
2. **Manifiesto SHA-256** de los HTML, CSS, Markdown, JSON y PNG principales; se guarda junto a
   la documentación de diseño.
3. **PR documental separado** (no implementación) que incorpore los Markdown de diseño a
   `specs/investigations/graphite-lime-design-2026-11-10/`, con enlaces al manifiesto y a los
   artefactos. No se incluyen binarios grandes salvo aprobación expresa; las capturas pueden
   adjuntarse al PR/issue como evidencia.
4. **Referencia de diseño:** el PR del Incremento 1 enlaza la documentación archivada, la rama
   `feature/ui-premium-exploration` y su HEAD actual (`c0341d7`), sin fusionar esa rama
   completa.
5. **No copiar** `candidates.css` a producción; solo se traducen tokens y estilos aprobados.
6. **No eliminar** Color Finance ni Pastel Editorial; quedan como candidatos en el archivo.

La publicación del PR documental requiere la aprobación de publicación ya prevista; no se
incluye en el Incremento 1 de código.

## 9. Fuera de alcance

- Hero, KPI, bandejas y composición de Inicio (Incremento 3).
- Filtros, tabla, detalle y móvil de Movimientos (Incremento 4).
- Formularios de Compra/Amortización y estilos de módulos (Incrementos 4–5).
- Cambios de layout, navegación, rutas o permisos.
- Persistencia nueva, migraciones o datos reales.
- Cualquier cambio en API, SQLite, Excel o motores financieros.
- Merge, despliegue o activación en `test`/`main`.

## 10. Recomendación

Aprobar y ejecutar **1A** primero, con revisión independiente. Incluir **1B** solo si se acepta el
cambio global de reduced motion en el mismo paquete; si no, dejarlo como PR de accesibilidad
separado. No iniciar el Incremento 1 hasta que UI DEV-04 y la base funcional estén coordinados y
la spec UI/tema esté ratificada.

**No se ha implementado nada de este documento.**
