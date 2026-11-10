# Graphite Lime · plan de integración visual completa (2026-11-10)

**Estado:** `[PROPUESTA]` — no autoriza desarrollo ni merge. Base `test` `1d288c5`.
**Alcance:** llevar a la app la composición visual aprobada en
[el archivo de diseño](../investigations/graphite-lime-design-2026-11-10/README.md), sin tocar
los temas Dark, Light e Hybrid y sin interferir con la quinta apariencia Casa de cuentas.

## 1. Qué falta (1A ya está)

1A integró tokens, catálogo, arranque y selector (`bff714e`, #356). Graphite “Grafito” ya se
elige y pinta fondo/superficies/acento/estados, pero conserva **la composición de Dark**. Lo
que falta es una **capa de apariencia**:

| Capa | Estado | Qué añade |
| --- | --- | --- |
| Paleta y semántica de tokens | Hecho | 66 tokens, `accent≠positive`, pares AA de 1A |
| Shell/header/rail (CSS) | Falta | densidad, superficies, tipografía, sidebar 1050/móvil |
| Inicio (CSS + composición con datos existentes) | Falta | carriles, banda KPI, objetivo, posición |
| Movimientos (CSS) | Falta | filtros, tabla, tarjetas, detalle, formulario |
| Estados y formularios | Falta | superficies y jerarquía sobre primitivas existentes |
| Semántica cromática | Falta corregir | “ok” debe ser menta, no lima; avisos ámbar; “Vigente” neutro |
| Bloques no compuestos en `/resumen-inicio` (sparkline, % plan, atención, últimos movimientos, presupuesto) | **Bloqueado** | No se componen en el resumen; requieren decisión de producto/snapshot o endpoints existentes; no se inventan |
| Interacción master-detail, chips, hoja móvil | **Fuera** | No es reskin; requiere decisión de UX |
| 1B `prefers-reduced-motion` | **Fuera** | Sigue sin autorizar |

## 2. Diferencias que sí se pueden cerrar sin datos nuevos

- **Inicio:** hero de control con liquidez + objetivo (sin duplicar el margen del ciclo),
  banda KPI con ingresos/gasto/inversión/deuda y composición de las métricas de ciclo
  **conservando un `article` por métrica** con fuente, cobertura, motivos y enlaces únicos;
  rail de pendientes (conteos existentes) y posición con conteos de Saldos/Ahorro/Inversión/
  Deuda. Sustituir los `article` por una tabla agregada queda fuera: exigiría cambiar AC y
  tests.
- **Movimientos:** superficie de filtros, cabecera y hover de tabla, fila anulada, paginación,
  tarjetas móviles y **ficha existente** (ruta) con la jerarquía Graphite; se conservan
  columnas, filtros y rutas. No se implementa hoja móvil ni panel lateral.
- **Shell:** densidad, superficies, tipografía de página y radios scoped; sidebar 236 px y
  breakpoints 1050/760 sin cambios.
- **Semántica:** `ok`/verificado en menta, avisos en ámbar, “Vigente” neutro, lima para
  marca/acción/selección. Los importes positivos en menta son una decisión aparte.

## 3. Enmienda propuesta (UI-G2)

Añadir a [SPEC UI](../ui-specification.md) §2.5: 2.3 está reservado por la enmienda Casa
(#363) y 2.4 por la propuesta alternativa de UI-G2 (#365).

> **UI-G2 · Integración visual Graphite Lime (propuesta 2026-11-10).** Autoriza una capa de
> apariencia **exclusiva de `graphite-lime`** para shell, Inicio, Movimientos, estados y
> formularios, con estos límites:
>
> 1. CSS nuevo en `apps/web/src/graphite.css`, **100 % prefijado**
>    `:root[data-theme="graphite-lime"]`; sin `!important`, sin hex/rgb y sin redefinir
>    tokens globales fuera de su scope.
> 2. Sin cambios en `themes.css`, `themes.ts`, `theme-boot.js` ni en el catálogo; una quinta
>    apariencia debe seguir siendo aditiva.
> 3. Reutiliza `ui.tsx` (`Table`, `DataList`, `Amount`, `Badge`, `Metric`, `Field`,
>    `FormSection`, `FormGrid`, `EmptyState`, `Skeleton`, `Alert`). No crea una segunda
>    librería ni duplica formularios.
> 4. La composición de Inicio conserva el contrato AC: un `article` por métrica con nombre
>    accesible, `Fuente:`, cobertura, motivos y enlaces únicos. No sustituye métricas por una
>    tabla agregada ni oculta trazabilidad.
> 5. No añade datos, endpoints, cálculos en navegador, fórmulas ni estados financieros.
> 6. No modifica Dark, Light ni Hybrid; sus tokens, apariencia y tests se conservan.
> 7. No autoriza master-detail, hoja móvil, chips de filtros, iconografía SVG global ni 1B
>    (`prefers-reduced-motion`).
> 8. Coexistencia: una hoja por apariencia (`casa.css`, `graphite.css`), mismo punto de
>    importación y selector compartido; sin refactor del sistema de temas.

## 4. Archivos que se tocarán

| Archivo | Cambio | Riesgo |
| --- | --- | --- |
| `apps/web/src/graphite.css` (nuevo) | Capa scoped: shell, Inicio, Movimientos, estados, formularios, escala tipográfica local | Medio: fuga si no se prefija |
| `apps/web/src/main.tsx` | `import "./graphite.css"`; sin tocar selector ni lógica | **Alto textual** con Casa (`casa.css`) |
| `apps/web/src/style.css` | **Sin cambios**: la semántica se corrige scoped en `graphite.css` | — |
| `apps/web/src/Inicio.tsx` | Fase CSS sin JSX; banda KPI y ciclo como layout con `article` por métrica (sin `Table` sustitutiva) | Alto: AC y enlaces únicos |
| `apps/web/src/Movimientos.tsx` | Solo reskin CSS en I4; sin chips/panel | Bajo |
| Tests `themes`, `ui-dev07-*`, `theme-graphite`, `inicio`, `movimientos` | Ampliar Graphite y guardas | Alto con Casa (listas de temas) |

## 5. Incrementos

### I2 · Base de apariencia y semántica (bajo riesgo)

- `graphite.css` scoped: fondo/ambiente, superficies, densidad, tipografía local, header y
  sidebar, foco; corrección scoped de `Tag` (“Vigente” neutro), `.cierre-badge.tone-ok`,
  `.valoracion-*.ok` y `.duplicate-warning` (ámbar).
- Sin JSX. Pruebas: guarda de scope (todo selector prefijado, cero hex/`!important`), ampliación
  de la guarda de tokens/AA a Graphite, E2E de shell en `/saldos`, `/inicio`, `/movimientos`
  y comprobación específica en `/cierre` y `/inversiones` (Valoración) para las clases corregidas.
- Aceptación: Dark/Light/Hybrid sin diferencias; Graphite AA, foco 3 px, 1440/820/390 sin
  overflow.

### I3 · Inicio (composición con datos existentes)

- CSS sobre `.inicio-page`/`.inicio-grid-*`; reutilizar `Metric`, `Amount`, `Badge`. Hero
  liquidez+objetivo, banda KPI, ciclo con `article` por métrica (sin tabla sustitutiva),
  pendientes y posición.
- Sin sparkline, anillo de plan, atención detallada, últimos movimientos ni presupuesto.
- Pruebas: `inicio-graphite.spec.ts` con AC-01/05/09/26, fuentes, hrefs únicos, contraste y
  responsive; matriz base intacta.
- Aceptación: paridad de cifras/estados con los temas actuales; ninguna métrica nueva.

### I4 · Movimientos (reskin)

- CSS sobre filtros, toolbar, tabla, tarjetas, detalle y formulario. Se conservan columnas,
  filtros, rutas y acciones.
- Pruebas: `movimientos-graphite.spec.ts` (paridad tabla/cartas, estados, paginación, detalle,
  validación con foco al primer error, anulado).
- Aceptación: misma información y acciones que hoy; 44 px; sin scroll horizontal.

### I5 · Cierre y evidencia

- Capturas 1440/820/390 de Inicio y Movimientos, QA visual y de teclado, contraste medido.
- Documentar diferencias aceptadas frente al prototipo (datos no disponibles e interacción
  no adoptada).

## 6. Criterios de aceptación visual

- Contraste ≥ 4.5:1 texto y ≥ 3:1 componentes; foco visible 3 px; objetivos ≥ 44 px.
- 0 textos funcionales < 12 px; 1440/820/390 sin overflow de página.
- Semántica: lima = marca/acción/selección; menta = positivo/verificado; ámbar = parcial;
  coral = negativo; neutro = anulado.
- Paridad funcional: mismas cifras, estados, enlaces, columnas y acciones que en los temas
  actuales.
- Dark, Light y Hybrid sin cambios medibles.

## 7. Coexistencia con Casa de cuentas

- **Una hoja por apariencia** (cuando Casa 1A se integre): `casa.css` y `graphite.css`, ambas
  prefijadas por su `data-theme`; sin refactor de `themes.ts`/`themes.css`/`theme-boot.js`.
- **Punto de importación compartido** en `main.tsx`; rebase antes de cada PR y orden estable
  `style.css`, `casa.css`, `graphite.css`.
- **Sin tocar el selector** ni su etiqueta: el cambio “Tema → Apariencia” pertenece a Casa.
- **Listas de temas en tests** desde una constante compartida; evitar `toHaveCount(4/5)` y
  `nth(3)`.
- **Hooks de layout estables** (`.inicio-page`, `.inicio-grid-2/-4`, `.inicio-metric`,
  `.movements-page`, `.movements-list`, `.ui-*`); ninguna apariencia los renombra.
- **Composición por apariencia**: si I3/I4 necesitan JSX, decidir una única vía (`theme` como
  prop desde `App` o contexto) antes de que Casa 1B y Graphite la implementen por separado.
- **E2E**: puertos y `artifacts/` son exclusivos; no ejecutar ambas ramas a la vez.

## 8. Riesgos

1. **Contrato AC de Inicio**: sustituir `article`/fuentes por una tabla agregada rompe tests y
   trazabilidad. Mitigación: conservar `article` y componer solo con CSS alrededor; sin `Table`
   sustitutiva.
2. **Bloques no compuestos en `/resumen-inicio`**: sparkline, % plan, atención detallada,
   últimos movimientos y presupuesto. Mitigación: excluirlos hasta decisión de producto/
   snapshot o consumo de endpoints existentes; no se inventan.
3. **Semántica cromática**: usos heredados de `--accent` como “ok”. Mitigación: corregir
   **solo scoped** en `graphite.css` (`:root[data-theme="graphite-lime"] …`), sin tocar
   `style.css` ni los tres temas. Una corrección global exigiría enmienda separada.
4. **Conflicto con Casa**: `main.tsx`, listas de temas y `themes.css`. Mitigación: ramas
   independientes, rebase, hoja propia, constantes de test. Estado: #363 (enmienda UI-P1) y
   #364 (Casa 1A) están **abiertas y no fusionadas**; `casa.css` no existe en la base. Este
   plan no presupone Casa integrada ni toca su código; el orden de merge debe acordarse.
5. **`display:contents` y a11y**: puede alterar semántica visual sin cambiar el DOM; validar
   foco y lectores.
6. **Coste de matriz**: añadir Graphite a DEV-07 multiplica capturas y tiempo. Mitigación:
   matriz específica para Inicio/Movimientos y matriz general solo si se decide.

## 9. Decisiones previas a la primera PR

1. Aprobar **UI-G2** y el alcance I2–I5.
2. Confirmar que Inicio se limita a datos existentes (sin API nueva).
3. Decidir si los importes positivos pasan a menta en toda la app.
4. Decidir si se adopta master-detail/chips/hoja móvil (fuera de I2–I4) y 1B.
5. Confirmar convivencia con Casa: import y constantes de test.
