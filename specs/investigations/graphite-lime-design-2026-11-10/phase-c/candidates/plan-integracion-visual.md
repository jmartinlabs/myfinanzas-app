# Plan incremental de integración visual

**Estado:** planificación. **No se implementa ningún incremento en esta entrega.**
**Dirección aprobada:** Graphite Lime como candidata prioritaria de integración futura.
**Temas actuales:** Dark, Light y Hybrid se conservan.

## 0. Separación de estados

| Estado | Significado |
| --- | --- |
| **Diseño aprobado** | La dirección Graphite Lime está aprobada como candidata prioritaria (2026-11-10). Color Finance y Pastel Editorial se conservan como candidatos. |
| **Implementación pendiente** | Tokens, catálogo, componentes y pantallas aún no se han tocado en la aplicación. |
| **Validación funcional** | Cada módulo conserva sus propias specs, QA y AC. La integración visual no valida ni cambia sus motores. |

Aprobar el diseño **no autoriza** DEV, merge ni despliegue. Cada incremento requiere su
autorización y su verificación.

## 1. Dependencias y contexto actual

Contrastado con [epic-board](../../../../epic-board.md), la base de la rama y los commits recientes de
`main`. Debe revalidarse al arrancar cada incremento.

| Frente | Estado relevante para la integración |
| --- | --- |
| Temas visuales Fase 1 | Integrados: `light-s`, `dark-s`, `hybrid-s`, selector y persistencia (`0b8aade`, #198) |
| Temas visuales Fase 2 | Este paquete: Graphite aprobado, Color/Pastel candidatos; **sin DEV** |
| UI DEV-01/02/03/04 | DEV-01/02/03 y DEV-04 I1–I3 integrados; **DEV-04 I4 pendiente**; spec UI en draft |
| E4.1 / E4.2 / E4.3 / E4.4 | Integrados; conservan sus AC parciales/reservas y QA propios |
| E4.5 | DEV no autorizado; DT7 abierto; 59 AC UNRUN |
| E4.10 / E4.11 / E4.12 | E4.10/11 con AC pendientes; E4.12 draft; no reabrir por el tema |
| E4.9 / E4.6 / E4.7 | Integrados con aceptación/reservas pendientes |
| Main reciente | Commits posteriores al tablero (E4.5 motor, auth, DEV-06 I4) confirman desarrollo activo; revalidar antes de tocar shell/módulos |

### Lectura de dependencias

- **Tokens y catálogo** pueden avanzar sin motores financieros, pero necesitan coordinación con
  UI/DEV-04 y la spec UI.
- **Shell/navegación** depende de que el inventario de rutas esté estabilizado. No se añaden
  módulos futuros por el tema.
- **Inicio** depende de contratos de datos existentes (E4.6, cierre, etc.). No se inventan
  métricas ni se cambia la semántica de los indicadores.
- **Movimientos** depende de E1.4/E1.5/E1.6/E4.x ya implementados; la integración es visual y
  no debe alterar formularios, validaciones, payloads, filtros ni motores.
- **Compra de inversión y Amortización** ya tienen formularios funcionales. El prototipo sirve
  para validar presentación, no para reimplementarlos.

## 2. Incrementos

### Incremento 1 · Tokens, temas y fundamentos

**Objetivo:** incorporar Graphite Lime como tema seleccionable, sin cambiar aún composiciones
de pantalla.

**Alcance:**

- Bloque `graphite-lime` en `apps/web/public/themes.css`.
- Entrada en `themeCatalog` de `themes.ts`; actualización de `ThemeId`.
- Lista `known` de `theme-boot.js` y prueba de persistencia/recarga.
- Verificar el foco visible de inputs/selects/textarea (producción ya tiene
  `:focus-visible` global; solo se corrige si una prueba demuestra lo contrario).
- Extender `prefers-reduced-motion` como 1B separado y revertible.
- Tests de tema, persistencia y fallback.

**Dependencias:** ratificación de la spec UI; coordinación con DEV-04; no depende de motores.

**Criterios de salida:**

- Dark/Light/Hybrid no cambian.
- Graphite se aplica, persiste y recarga sin parpadeo.
- Un valor desconocido cae a `dark-s`.
- Contraste AA de tokens y foco visible.
- Sin cambios de layout, API, SQLite ni datos.

**Riesgo:** olvidar `theme-boot.js`, mezclar el bloque con cambios de componentes o incluir
1B sin coordinación con DEV-04.

### Incremento 2 · Shell y navegación

**Objetivo:** aplicar Graphite al shell existente sin duplicarlo.

**Alcance:** sidebar, activo, header, selector, menú móvil, footer, foco y breakpoints.
Conservar `--sidebar-width: 236`, `--content-max: 1450` y las rutas reales.

**Dependencias:** Incremento 1; inventario de navegación vigente.

**Criterios de salida:**

- Navegación operable por teclado; menú móvil abre/cierra y devuelve foco.
- 44 px táctil a 390; sin overflow.
- No se exponen módulos no disponibles.
- Prueba visual de shell en 1440/820/390.

### Incremento 3 · Inicio

**Objetivo:** adoptar la composición Graphite aprobada en Inicio sin introducir métricas nuevas.

**Alcance:** hero/control, KPI, ciclo, Atención, Objetivo, movimientos recientes, presupuesto y
posición. Usar `Metric`, `Amount`, `Badge`, `Table` y CSS de página. Si se adopta el hero de
50 px, añadir en este incremento `--text-2xl`/`--text-hero`, no en el incremento 1.

**Dependencias:** contratos de datos de Inicio; E4.6 y fuentes disponibles; aceptación de la
composición visual. No inventar indicadores, ceros ni coberturas.

**Criterios de salida:**

- Mismos datos y significados que la pantalla actual.
- `ND`/`Parcial`/`No disponible` conservados.
- Sin overflow; contraste, foco y responsive.
- Dark/Light/Hybrid sin regresión.

### Incremento 4 · Movimientos

**Objetivo:** aplicar Graphite a filtros, tabla, selección, detalle, paginación y móvil.

**Alcance:** estilos y composición sobre los componentes existentes; sin tocar contrato de API,
filtros, validaciones, selección ni payload. El detalle conserva los campos actuales.

**Dependencias:** E1.4/E1.5/E1.6 y módulos de inversión/deuda ya implementados; coordinación con
DEV-04 I4 y cualquier desarrollo activo de Movimientos.

**Criterios de salida:**

- Paridad funcional con la pantalla actual.
- Tabla → tarjetas a 760; panel → hoja; foco, 44 px y sin overflow.
- Semántica lima/menta/ámbar/coral verificada.
- Pruebas de teclado, contraste y zoom.
- Sin cambios en datos, validaciones ni endpoints.

### Incremento 5 · Resto de módulos

**Objetivo:** extender el tema de forma incremental a los módulos estables, sin duplicar
componentes.

**Alcance:** Saldos, Clasificación, Inversiones, Deudas, Flujo, Presupuestos, Planes, Cierres,
Fotos, etc., por orden de estabilidad y valor. Cada módulo conserva su spec, formularios y QA.

**Reglas:**

- Un módulo por incremento/PR.
- Si un patrón se repite en dos módulos, extraer componente compartido; si no, mantener CSS de
  página.
- No adaptar módulos con DEV no autorizado, AC bloqueados o cambios funcionales abiertos.

**Dependencias:** estado del tablero por módulo; no crear trabajo artificial.

**Criterios de salida:** paridad funcional, QA visual/accesibilidad y ninguna regresión de los
temas actuales.

### Incremento 6 · QA visual, funcional y accesibilidad

**Objetivo:** verificar el conjunto antes de considerar el tema parte del producto.

**Alcance:**

- QA visual 1440/820/390 en los seis temas, con foco en Graphite y regresión de los tres
  actuales.
- Contraste AA, foco, teclado, zoom 200 %, reduced motion, touch, overflow.
- Pruebas funcionales/E2E de los flujos existentes.
- QA independiente; sin autoaprobación.
- Documento de aceptación y riesgos residuales.

**Criterios de salida:** 0 fallos críticos/mayores; residuales aceptados explícitamente;
aprobación de merge separada.

## 3. Estrategia de compatibilidad

- **Aditiva:** un bloque de tokens + entrada de catálogo; sin migración de datos.
- **Sin duplicar:** reutilizar `ui.tsx`, `style.css`, `Themes.ts` y el shell.
- **Persistencia:** misma clave `mf-theme`; IDs actuales intactos; fallback `dark-s`.
- **Rollback:** retirar la entrada del catálogo y el bloque de tokens; no hay datos afectados.
- **Feature gate:** no exponer el tema hasta que tokens, shell y QA estén listos; el bloque CSS
  puede prepararse antes, pero sin entrada visible.
- **Verificación:** `python3 scripts/verify` focal y `--full` según CI; Playwright de tema,
  persistencia, foco, responsive y regresión de los tres temas.
- **Git:** rama por incremento; `feature/* → test → main`; sin merge automático ni deploy.

## 4. Dependencias que no bloquean

- E4.10/E4.11/E4.12 no bloquean el incremento 1/2; sí pueden bloquear pantallas concretas.
- E4.5 no bloquea el tema; bloquea módulos que lo consuman.
- E4.9/E4.6/E4.7 conservan aceptación/reservas; la integración visual no las cierra.

## 5. Recomendación de secuencia

1. **Graphite Lime**: tokens + shell + Inicio + Movimientos.
2. **Color Finance**: solo después de validar Graphite y con una decisión de producto; no hay
   más refinamiento ahora.
3. **Pastel Editorial**: conservar como candidato experimental; no implementar en la primera
   ola.
4. No integrar los seis temas a la vez.

## 6. Puerta de inicio

Antes de abrir el primer PR de implementación:

- Aprobación explícita de este plan y del alcance Graphite.
- Revalidación del tablero y de las dependencias.
- Spec UI/tema actualizada.
- Lista de archivos y tests del incremento 1.
- Confirmación de que no se tocarán API, SQLite, Excel, motores ni ramas `test`/`main`.

No se ha iniciado ninguno de estos incrementos.
