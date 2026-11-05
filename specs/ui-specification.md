# UI — Evolución visual de MyFinanzas: Specification (UI · SPEC)

**Estado:** `[PROPUESTA]` documental — **NO APROBADA.** No autoriza `UI · DEV`, no modifica
código, componentes, CSS, temas, API, cálculos financieros ni datos reales. No fusiona nada.

- **Base:** `main` **`238af31`** (2026-11-05).
- **Análisis:** [ui-evolution-2026-11-04](investigations/ui-evolution-2026-11-04.md);
  **wireframes:** [ui-evolution-wireframes.html](investigations/ui-evolution-wireframes.html).
- **Identificador:** `UI` (transversal; no crea épica ni altera las 30 entregas).
- **Alternativa adoptada:** **B** — evolución progresiva de componentes y pantallas, sin
  rediseñar la identidad visual (decisión del usuario, 2026-11-05).
- **Temas:** **Dark (`dark-s`), Light (`light-s`) y Hybrid (`hybrid-s`) cerrados** en
  `0b8aade` (#198). Paletas, tokens cromáticos y selector existentes **no se reabren**.
- **Alcance:** tipografía, legibilidad, espaciados, jerarquía, navegación, tablas, formularios
  y adaptación móvil, reutilizando los tres temas.
- **Fuera de alcance:** cambios de color/tema, rediseño de identidad, rutas, permisos,
  contratos de API/DTO, cifras, estados financieros, cálculos, datos reales, despliegue y
  `UI · DEV` sin autorización.

## 1. Principios verificables

1. **La cifra manda:** una lectura principal por tarjeta; estado con icono + texto; metadatos
   secundarios agrupados. Sin dos cifras del mismo rango en la misma tarjeta.
2. **Densidad controlada:** tres niveles de texto; ningún texto funcional por debajo de 12 px;
   tablas compactas pero legibles.
3. **Jerarquía repetible:** arquetipos de resumen, catálogo, ficha, formulario y operación;
   cabecera, sección y tarjeta con anatomía común.
4. **Consistencia:** un badge, un botón primario, una tabla, un campo, un vacío, un esqueleto.
5. **Movimiento discreto:** 120–160 ms, solo color/borde/opacidad; nada sobre cifras;
   `prefers-reduced-motion` respetado.
6. **AA como suelo:** texto normal ≥ 4.5:1 y grande/componentes ≥ 3:1 en los **tres temas**;
   foco visible; objetivos ≥ 44 px; sin scroll horizontal a 390; zoom 200 %; teclado completo.

## 2. Contrato de temas (cerrado)

| Tema | `data-theme` | Estado |
| --- | --- | --- |
| Dark | `dark-s` | Implementado y cerrado |
| Light | `light-s` | Implementado y cerrado |
| Hybrid | `hybrid-s` | Implementado y cerrado |

- Los tokens semánticos vigentes son los de `apps/web/public/themes.css`; los componentes
  consumen `var(--…)` y no conocen el tema.
- El selector de tema existente se conserva; no se añade otro selector ni se cambia el
  mecanismo de persistencia.
- **Prohibido:** modificar paletas, tokens cromáticos, `theme-boot.js`, orden/identidad de los
  temas o el tema inicial (`dark-s`), que están cerrados.

### 2.1 Propuesta de actualización de `guidelines/ui.md`

`guidelines/ui.md` describe la identidad verde histórica y «solo tema claro», en contradicción
con los tres temas implementados. **No se modifica en este PR**; se propone sustituir su
cabecera y tokens por:

```text
Identidad vigente: temas Dark (`dark-s`), Light (`light-s`) y Hybrid (`hybrid-s`)
implementados en #198; tokens semánticos en apps/web/public/themes.css.
Selector de tema existente; preferencia persistida.
La identidad cromática está cerrada: no se cambian paletas, tokens ni selector.
Tipografía de sistema; shell 236 px; breakpoints 1050/760 px; móvil 16 px.
```

El resto de reglas de formularios, foco, estados y accesibilidad se conserva. La aprobación de
esta propuesta es una decisión separada.

## 3. Dependencias

| Dependencia | Estado | Qué aporta | Límite para `UI` |
| --- | --- | --- | --- |
| E4.6 / `/inicio` | Integrada `cfbedb0` (#201); SPEC24 aprobada | Estructura, cifras y estados de Inicio | No reordenar secciones ni cambiar cifras/estados |
| E4.9 / cierre y foto | Integrada `0176ffc` (#200), QA APTO CON RESERVAS | Patrones de operación irreversible y bloqueo | No reabrir rutas, contratos ni estados |
| E4.10 / reapertura | SPEC28 **DRAFT**; D1–D9 y `SIN_CAMBIOS` aprobadas 2026-11-05, incorporación en #223 OPEN/draft sin merge; **sin DEV** | Wireframe conceptual futuro | No anticipar clases, rutas ni implementación |
| E4.11 / fotos periodo | SPEC29 DRAFT | Contexto de consulta | No fijar pantallas antes de su SPEC |
| Temas #198 | Cerrado | Tokens y selector | No cambiar colores ni temas |

## 4. Bloques `UI · DEV-01…07`

| Bloque | Objetivo | Entregables | Dependencias | Aceptación visual |
| --- | --- | --- | --- | --- |
| **DEV-01 Fundamentos** | Escala tipográfica, espaciado, radios, foco y tamaños mínimos | Tokens no cromáticos; escala en shell y base; consumo real de `--space` | — | 1440/390 × 3 temas sin regresión; texto funcional ≥ 12 px; un radio por familia |
| **DEV-02 Cifras y estados** | Unificar importe, badge, tarjeta, vacío y esqueleto | `Amount`, `Badge`, `Metric`, `EmptyState`, `Skeleton`; `--negative` aplicado; formateador único | DEV-01 | Badge único; `0,00 €`, `ND`, `No aplica`, `Sin datos` distinguibles; contraste ≥ 4.5 en 3 temas |
| **DEV-03 Navegación** | Agrupar rutas sin cambiarlas | Datos de navegación en módulo; grupos; activo con barra+peso; título por ruta; menú móvil accesible | DEV-01 | Todas las rutas actuales (23) iguales; activo sin color; teclado; sin desbordamiento a 390 |
| **DEV-04 Tablas y listados** | Una tabla, un comportamiento | Primitiva `Table`; importes a la derecha; cabecera/hover por token; tarjetas móviles | DEV-01, DEV-02 | Misma información tabla/tarjeta; sin scroll horizontal; región desplazable rotulada |
| **DEV-05 Formularios y fichas** | Formularios y detalle consistentes | `Field`, secciones, ayuda/error, rejilla 2→1; ficha por jerarquía | DEV-01, DEV-02 | Error sin salto; foco al primer error; AA en 3 temas |
| **DEV-06 Pantallas clave** | Llevar el sistema a Inicio y 4–5 pantallas | Inicio, catálogo, ficha, formulario, operación | DEV-02…05; frontera E4.6/E4.9/E4.10 | Inicio conserva secciones/cifras/estados; una lectura principal; capturas antes/después |
| **DEV-07 Temas y AA** | Cerrar paridad y evidencia | Matriz 5 pantallas × 3 temas × 2 anchos; contraste automatizado; teclado/zoom/reduced motion; actualizar guía y catálogo | DEV-01…06 | Pares ≥ 4.5/3; cero desbordamiento; evidencia adjunta, no aprobación |

Orden recomendado: `01 → 02 → (03 ∥ 04 ∥ 05) → 06 → 07`. Cada bloque es reversible y ninguno
cambia API, datos, cálculos ni estados.

**DEV-02 — inventario previo:** antes de unificar el formateador, inventariar `eur()`,
`formatDecimal` y las cadenas/AC que comparan `-`/`−` o decimales; actualizar tests de forma
consciente; no cambiar valores, redondeos ni contratos.

## 5. Pantallas de referencia

- **Inicio:** misma estructura y cifras de SPEC24; mejora de jerarquía, densidad, badges y CTA.
- **Catálogo/listado:** tabla de escritorio + tarjetas móviles; vacío/error/carga; filtros.
- **Ficha:** identificación, estado, atributos, relaciones y acciones.
- **Formulario:** secciones, ayuda/error, foco y borrador.
- **Operación irreversible:** confirmación, motivo y bloqueo (solo patrón visual; E4.9/E4.10
  conservan sus contratos).

## 6. QA y evidencia

- Matriz **5 pantallas × 3 temas × 2 anchos (390/1440)** con capturas reproducibles.
- Contraste automatizado por tema; foco visible; teclado; zoom 200 %; `prefers-reduced-motion`.
- Sin scroll horizontal; sin pérdida de cifras/estados; `null ≠ 0` y `ND` visibles.
- `python3 scripts/verify` (o `--full` según el cambio) y E2E de tema/Inicio; capturas como
  evidencia, no como aprobación.
- QA independiente por bloque antes de proponer integración.

## 7. Decisiones pendientes

1. **Pantallas de `DEV-06`** además de Inicio.
2. **Orden/paralelismo** de `DEV-03/04/05`.
3. **Criterio de evidencia** (matriz y umbrales) para cerrar cada bloque.
4. **Actualización de `guidelines/ui.md`**: aprobar la propuesta de §2.1.
5. **Autorización de `UI · DEV-01`** y de cada bloque posterior.

**Cerradas y no sujetas a reapertura:** identidad cromática, tres temas, paletas, tokens,
selector y alternativa B.

## 8. Recomendación de integración

`[PROPUESTA]` Aprobar esta SPEC visual y autorizar `UI · DEV-01` como primer bloque, sin tocar
temas ni contratos. Mantener la iniciativa independiente de E4.10: los bloques que comparten
`style.css`/`main.tsx` se coordinan por archivo y ventana. No se recomienda iniciar `DEV-06`
antes de `DEV-02` y de fijar las pantallas de referencia.
