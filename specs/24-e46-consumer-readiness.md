# 24 — E4.6 Resumen de inicio: Readiness de consumidores

Status: **DOCUMENTO DE PREPARACIÓN HISTÓRICO — no es especificación.** Actualización
2026-11-04: **DEV24 fue autorizado e implementado** en la rama `feat/e46-inicio` (composición
`GET /api/resumen-inicio` y UI `/inicio`). El estado vigente de los AC es el
[testplan](24-e46-resumen-inicio-testplan.md), no esta matriz: la mayoría tienen evidencia
local PASS, AC-01 es PARCIAL por huecos de fuente/cobertura, AC-27 es PARCIAL (sesión
expirada/500 sin prueba) y AC-20/AC-21 siguen UNRUN. Este documento no implementa código ni
sustituye la revisión de QA; se conserva como análisis de readiness previo.
Base histórica contrastada: `main` `5c4297a` (2026-11-04), esquema SQLite **v24**.
Specification: [24-e46-resumen-inicio-specification.md](24-e46-resumen-inicio-specification.md).
Brainstorming: [24-e46-resumen-inicio-brainstorming.md](24-e46-resumen-inicio-brainstorming.md).

**Qué sí acredita este documento:** qué contratos de origen existían en `main`, qué pruebas
podían reutilizarse como regresión u oráculo y qué faltaba antes del DEV. **Qué no acredita:**
corrección funcional, PASS de ningún AC ni cobertura de QA; para eso rige el testplan y la
revisión independiente.

## 1. Estado de partida y dependencias

### 1.1 Método del contraste

Lectura del código integrado en `5c4297a` y de las pruebas existentes bajo
`apps/api/src`. No se ejecutaron suites financieras ni Playwright: la presencia de un
contrato o de un test se usa como evidencia estructural, no como evidencia de aceptación.
Las etiquetas de estado del documento son: `DISPONIBLE` (contrato en `main`), `PARCIAL`
(contrato existe con hueco de forma o cobertura), `AUSENTE` (no existe) y `FUERA` (frontera
de otra entrega).

### 1.2 Dependencias y contratos de origen

| Dependencia | Contrato en `main` | Estado | Evidencia | Efecto en E4.6 |
| --- | --- | --- | --- | --- |
| E1.3 Ciclos y contexto | `cycleContext`, `cycleMaster`, `GET /api/ciclos/contexto`; `Cycle` con `actual`, `inicio`, `fin`, `mesFinanciado`, `corte`, `estadoCorte`, `revision` | DISPONIBLE | [ciclos.ts](../apps/api/src/ciclos.ts) | Contexto y corte sin reloj; `mesFinanciado` es un dato derivado, no libre (ver F-01) |
| E2.6 Flujo mensual | `monthlyFlow`, `GET /api/flujo-mensual/:id`; `metrics.*`, `liquidez.incluidos/excluidos`, `corteEfectivo`, `revision`, `erroresFuente` | DISPONIBLE | [flujo-mensual.ts](../apps/api/src/flujo-mensual.ts) | Liquidez, ingresos, gasto, extraordinaria, operativo, márgenes, `ahorroCierre` y `variacionAhorro` (hoy `No disponible`) |
| E2.4 Plan anual | `annualEquivalent`, `annualYear`, `GET /api/plan-anual/:year` | DISPONIBLE | [plan-anual.ts](../apps/api/src/plan-anual.ts) | Coste esencial mensual como racional `numeradorCentimos/12` con estado `Completo`/`Incompleto`/`Sin plan anual` |
| E1.1 Saldos | `getSaldo`, `listSaldos`, `GET /api/saldos`; `posicion`, `liquidez`, `finalidad`, `mostrarComoBolsa`, `estado` | DISPONIBLE | [saldos.ts](../apps/api/src/saldos.ts) | Posición y pertenencia; lista paginada de 100 (ver H-06) |
| E4.1/E4.2 Inversiones | `positionsAtDate`, `cashAt`, `cashDto`, `GET /api/inversiones/efectivo?saldo=` | DISPONIBLE | [investment-engine.ts](../apps/api/src/investment-engine.ts) | Cantidades y efectivo; no valora ni publica resultado |
| E4.3 Valoración | `e43Corte`, `GET /api/e43/corte?fecha=`; `agregado`, `posiciones`, `efectivo`, `coberturaHistorica` | PARCIAL — integrado en `main` con v24 (`#189`, `dd56553`); la cabecera de SPEC23 conserva el estado documental previo y falta `revision` de corte | [e43.ts](../apps/api/src/e43.ts), [e43-api.test.ts](../apps/api/src/e43-api.test.ts) | Agregado ya calculado y efectivo separado; **sin `revision` de corte** (ver H-03) |
| E4.4 Deuda completa | `listDeudasCompletas`, `getDeudaCompleta`, `GET /api/deudas`, `GET /api/deudas/{id}?corte=`; `tipoDeuda`, `capital.calculable`, `capital.deudaViva` | DISPONIBLE | [deuda-completa.ts](../apps/api/src/deuda-completa.ts) | Deuda viva por deuda; listado sin `corte` y paginado (ver H-05) |
| E3.6 Pendientes | `listPendientes`, `getPendiente`, `GET /api/pendientes`, `GET /api/pendientes/:tipo/:id`; `filas`, `conteos`, `fuenteFallos`, `soloLectura` | PARCIAL — integrado en `a26fffb`; la forma de lista difiere del DTO propuesto | [pendientes.ts](../apps/api/src/pendientes.ts), [pendientes-api.test.ts](../apps/api/src/pendientes-api.test.ts) | Lista y conteos por estado; sin total monetario (ver H-04) |
| E4.8 Precierre | `getPrecierre`, `getPrecierreEstado`, `GET /api/cierres/precierre/:id` | DISPONIBLE (`e608bbb`) | [precierre.ts](../apps/api/src/precierre.ts), [26-e48-precierre-specification.md](26-e48-precierre-specification.md) | FUERA de E4.6: no se lee ni se usa como fuente ni como foto |
| E4.9 Cierre y foto | Spec aprobada; DEV no autorizado | FUERA | [27-e49-cierre-financiero-specification.md](27-e49-cierre-financiero-specification.md) | E4.6 no anticipa cierre, foto ni ventana |
| E4.7 Resumen anual | Futuro | FUERA | [roadmap](roadmap.md) | E4.6 no compara ejercicios ni agrega por año |
| Configuración R6 (meses objetivo y umbrales) | Sin almacén ni proveedor en v24; Q3-B=A | AUSENTE por diseño | SPEC24 §Objetivo R6 | Solo `minimoObjetivo` queda `No disponible`; `mesesCubiertos` no depende de ella |
| DT8 (formato, UX y métricas no cerradas) | Abierta | AUSENTE | [roadmap](roadmap.md) (DT8), SPEC24 §Objetivo R6 | Formato de meses y ruta `/inicio` conservan gate |

### 1.3 Balance de partida

- **Contratos de motor:** los ocho ámbitos que E4.6 compone (contexto, flujo, plan anual,
  Saldos, inversiones, valoración, deuda y pendientes) están en `main`. La dependencia
  histórica «E4.3 no tiene DEV» de la spec y del testplan **ya no describe** `5c4297a`.
- **Consumidor E4.6 (estado histórico):** `AUSENTE` en `5c4297a`. Actualmente **presente** en
  `feat/e46-inicio`: `GET /api/resumen-inicio`, composición, pantalla `/inicio`, entrada de
  navegación, fixture E2E aislada y `resumen-inicio.test.ts`.
- **Autorización:** DEV24 fue autorizado el 2026-11-04. Sigue sin autorizar merge ni
  despliegue sin aprobación explícita; no hay DDL ni migración de E4.6.
- **Consecuencia vigente:** los AC con prueba concreta están en PASS local según el testplan;
  AC-01 es PARCIAL por huecos de fuente/cobertura en el DTO y AC-27 es PARCIAL porque sesión
  expirada y error 500 no tienen prueba directa. No se declara completa la entrega sin
  `--full`, QA independiente y merge aprobado.

### 1.4 Afirmaciones desactualizadas que no se corrigen aquí

Se registran para evitar que una lectura literal induzca a error; su corrección pertenece a
sus documentos propietarios, no a este.

| Afirmación vigente en documento | Estado real en `5c4297a` |
| --- | --- |
| SPEC24 y testplan: «E4.3 no tiene DEV» | E4.3 A+B+C+QA integrado (`#189`, `dd56553`), esquema v24 y `/api/e43/corte` operativo |
| Cabecera de SPEC23: «DEV E4.3 no autorizado; ningún AC en PASS» | Cabecera documental no actualizada tras el DEV; no se reaudita aquí ni se declara PASS |
| SPEC24 ejemplo de `pendientes` con `No disponible` «consumo E4.6 no implementado» | Sigue siendo correcto como ejemplo del DTO: la fuente E3.6 existe, el consumidor no |
| `Inversiones.tsx` muestra «No disponible hasta E4.3» en fichas de instrumento | Copy previo a E4.3; la vista de valoración sí consume `/api/e43/corte`. No se edita en este trabajo |

## 2. Matriz de los 29 AC

**Lectura de la matriz (histórica).** «Fuente/contrato» indica qué motor ya existía; «prueba
reutilizable» indica una prueba existente que servía como regresión u oráculo, **no** como
evidencia de E4.6; «hueco» era lo que faltaba antes del DEV. Esta matriz se escribió antes de
la autorización del 2026-11-04: **el estado vigente de los AC es el testplan**, no estas filas.
Las decisiones Q1–Q12 están aprobadas y no se reabren; solo se citan.

| AC | Fuente / contrato disponible | Prueba reutilizable | Hueco de consumidor / fixture | Decisión funcional |
| --- | --- | --- | --- | --- |
| AC-01 | `Metric.fuente/ids` de E2.6; `fuente.motor/id/revision` de E3.6; IDs de E4.3/E4.4 | F1–F13 (fuente e IDs), `e43-api` TP-12/16, detalle de pendientes | No existe DTO unificado con `fuente.motor/ids/revisiones`; E2.6 publica `fuente` como texto y E4.4 no rotula motor | Q1=A; los nombres exactos del DTO son propuesta técnica |
| AC-02 | Los cinco motores citados en el AC | Oráculos por motor: flujo, plan anual, E4.3, deuda | Falta fixture integrada y comparación composición↔motor al céntimo | Ya exigida por SPEC24; sin decisión nueva |
| AC-03 | Patrón de solo lectura de `/api/pendientes`, `/api/flujo-mensual`, E4.3 | `pendientes-api` (sin escritura), F6/F9, E4.3 AC-12 y el 405 con `allow: GET` de precierre | El endpoint no existe; el snapshot y la `revision` de composición no están implementados | P-01/Q12 |
| AC-04 | `monthlyFlow.revision`, `cycleContext.revision` | F6 y F11 (revisión y contexto) | E4.3 no publica revisión de corte; E4.6 debe declarar la suya sin inventar dato de motor | Técnica de composición (no funcional) |
| AC-05 | `monthlyFlow.liquidez.incluidos/excluidos` y `subtotal` | F5 (pertenencia parcial) | Adaptar `cobertura` de texto a estructura; prueba de composición | Q2=A / SPEC12 |
| AC-06 | `erroresFuente` de E2.6; `fuenteFallos` de E3.6 | F7 (fallo de fuente aislado), `pendientes-api` | La degradación por sección del DTO no existe | Q12 |
| AC-07 | `Metric` distingue `null`, `Cero verificado` y valor; E4.3 Manual `0,00` | F13/F8; E4.3 TP-02/03 | Composición debe conservar la distinción sin normalizar | P-04 |
| AC-08 | `cycleContext` no usa reloj; `corteEfectivo` de E2.6 | F11 (corte efectivo y contexto) | No hay prueba de reloj a nivel UI ni endpoint | Q2=A/Q4=A |
| AC-09 | Rutas existentes `/saldos`, `/flujo-mensual`, `/inversiones`, `/deudas`, `/pendientes` | Specs Playwright de cada módulo | No existen `/inicio`, entrada «Inicio» ni drill-down; los enlaces deben llevar solo IDs | Q1=A; ruta `/inicio` sigue PENDIENTE DT8 |
| AC-10 | Frontera documental (E4.7 es propietario del patrimonio) | Ninguna prueba de ausencia | Prueba negativa de composición (sin total patrimonial) | Q10 |
| AC-11 | Filtro de liquidez en `monthlyFlow` | F5 AC27–32 | Fixture con Finalidad/bolsa/nombre cambiados | C-01: solo `Liquidez` decide |
| AC-12 | `annualEquivalent.total` exacto | `plan-anual` AC16–19/30/31 | Proveedor R6 solo como doble de contrato; no existe almacén | Q3-B=A |
| AC-13 | `annualEquivalent` + liquidez completa | Oráculo del testplan; sin prueba de composición | División exacta y formato de 2 decimales (DT8) | Q3-B=A y Q11; formato pendiente DT8 |
| AC-14 | Estados y `parcial` de `annualEquivalent` | `plan-anual` AC16–19 | Composición de estados y subtotal conocido | Ya precisado en SPEC24 |
| AC-15 | Zona informativa; sin almacén R6 | Ninguna | DTO y UI de zona; sin proveedor solo `minimoObjetivo` es ND | Q3-B=A / Q11 |
| AC-16 | Liquidez parcial/ND y coste 0 | F5/F8, reglas de `Metric` | Casos de denominador no aplicable y motivo propio | Q11 aprobada |
| AC-17 | `cycleContext.motivo` (`sin_ciclos`, `sin_referencia`, `error_referencia`) y `corte: null` | F11 y pruebas de contexto de ciclos | Fixture sin ciclo y composición de bloques actuales | Q2=A |
| AC-18 | `e43Corte.efectivo` ya separado de `agregado` | E4.3 TP-01/09/15 (efectivo y `cashAt` separados) | Composición y prueba de ausencia de `3153.90` | Q6 / SPEC22 §4.2 / SPEC23 D-11 |
| AC-19 | Atributos independientes de Saldos | F5 (pertenencia parcial) | Fixture con un Saldo en las tres vistas y sin suma | Q9 |
| AC-20 | E2.6 no consume cobertura de Presupuesto para liquidez | F5 (liquidez por `Liquidez`) y ND-03 (diseño) | Prueba de composición «cobertura no altera liquidez» | P3 |
| AC-21 | E4.4 publica deuda; no entra en flujo | F2 (deuda válida no se resta dos veces) | Composición informativa de deuda | Q7=A |
| AC-22 | `gasto` y `extraordinaria` de E2.6 | F2/F3 | Composición sin segunda resta | SPEC12 |
| AC-23 | `listPendientes` con `filas`, `conteos`, `fuenteFallos` | `pendientes.test` y `pendientes-api.test` | Mapear `filas`→`items` y `conteos`→conteo; la spec usa otro nombre de campo | Q8: sin total monetario |
| AC-24 | `e43Corte` deja resultado `No disponible` en valoración manual | E4.3 TP-02/03/10 | Composición y UI; no derivar rentabilidad | D-02/D-10 de SPEC23 |
| AC-25 | Cobertura E4.3 `Parcial n/m`; `capital.calculable` de E4.4 | E4.3 TP-10; deuda «desglose inválido» | Alinear etiquetas (`Verificada`/`Completa`) al DTO de E4.6 | Mapa de contrato, sin motor nuevo |
| AC-26 | Shell, tokens y Playwright MFA existentes | Specs e2e de valoración, pendientes y deudas | No existe pantalla `/inicio`; faltan capturas y teclado | Q1=A; revisión visual conserva gate |
| AC-27 | `no-store` global y sesión MFA en rutas financieras | F9, `pendientes-api` (401/403/404) y E4.3 AC-12 | La ruta nueva no existe; al crearse debe heredar guard y cabeceras | T-SEG |
| AC-28 | `annualEquivalent(2026)` y Q4=A | `annualYear` y pruebas de plan anual (no la selección Q4) | Fixture corregida (F-01); validar C008 ejecutable | Q4=A aprobada; sin decisión pendiente |
| AC-29 | `Cero verificado` de E2.6 con coste > 0 | F8 (universo vacío conocido = cero) | Composición `0/1500 = 0,00` | Q11 |

### 2.1 Recuento de huecos (sin declarar PASS)

- Contrato de origen localizable: **29/29**, con huecos de forma en 7 (H-02 a H-07 y H-09).
- Prueba existente reutilizable como regresión u oráculo: **25/29**; sin antecedente
  directo sobre la composición quedan AC-10, AC-13, AC-15 y AC-28.
- Dependencia de la fixture integrada: **17/29** (AC-02, 05, 11, 13, 14, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 28 y 29). Hoy esa fixture no existe como código.
- Hueco de UI o navegación: AC-01 (parte visual), 09, 10, 15, 26 y 27.
- Consumidor E4.6: **AUSENTE en los 29**. La matriz identifica el hueco específico, no un
  avance de aceptación.

### 2.2 Huecos transversales de consumidor

| ID | Hueco | Consecuencia | Evidencia |
| --- | --- | --- | --- |
| H-01 | No existe módulo/DTO de composición ni `GET /api/resumen-inicio` | Todo AC de integración queda UNRUN | SPEC24 §DTO; búsqueda sin resultados |
| H-02 | E2.6 publica `cobertura` como texto y `Metric.ids`, no un objeto `{estado, incluidos, excluidos, motivos}` | El consumidor debe mapear, no recalcular; no puede inventar incluidos/excluidos que el motor no da | `Metric` en [flujo-mensual.ts](../apps/api/src/flujo-mensual.ts) |
| H-03 | E4.3 usa `Verificada` / `Parcial n/m` / `No aplica` y no publica `revision` de corte | Etiqueta distinta de `Completa` en el ejemplo de SPEC24 y revisión de composición sin fuente directa | `e43Corte` en [e43.ts](../apps/api/src/e43.ts) |
| H-04 | E3.6 publica `filas`/`conteos`; las métricas son por item; no hay `cobertura` de lista | Mapeo al DTO de SPEC24; el conteo debe salir de `conteos`, nunca de un total monetario | `ListaPendientes` en [pendientes.ts](../apps/api/src/pendientes.ts) |
| H-05 | `/api/deudas` no admite `corte` y pagina de 100 en 100; el corte vive en la ficha | Un total Q7 construido desde la primera página sería falso; hay que recorrer todas las deudas activas o usar el motor | `listDeudasCompletas` en [deuda-completa.ts](../apps/api/src/deuda-completa.ts) |
| H-06 | `/api/saldos` pagina de 100 en 100 | Contradice «no truncar listas que afectan a un total»; el consumidor debe recorrer páginas o usar `getSaldo` por ID | `readSaldos` en [saldos.ts](../apps/api/src/saldos.ts) |
| H-07 | No hay `/inicio` ni entrada de navegación; `/` va a `/saldos` | AC-09 y AC-26 no ejecutables | [main.tsx](../apps/web/src/main.tsx) |
| H-08 | La fixture integrada del testplan no era construible tal como estaba escrita | Corregida documentalmente; pendiente validación ejecutable | F-01/F-02 resueltas |
| H-09 | `e43Corte` exige una fecha civil; no tiene modo «actual» | Si `corte` es `null`, la sección de inversión debe quedar `No disponible`; no se sustituye por la fecha de consulta | `e43Corte`/`civil` |
| H-10 | El efectivo puede leerse por `cashAt` o por `e43Corte.efectivo` | Dos lecturas separadas pueden fechar distinto; dentro de una sección debe usarse una sola ruta y el mismo corte | `cashDto`, `e43Corte` |
| H-11 | `Saldos.objetivo` no es el `mesesObjetivo` de R6 | Reutilizarlo inventaría un objetivo no aprobado | SPEC24 §Objetivo R6; `saldos.ts` |
| H-12 | Copy «No disponible hasta E4.3» en fichas de instrumento | Drill-down desde Inicio puede encontrar un texto desactualizado; no es fuente de dato | [Inversiones.tsx](../apps/web/src/Inversiones.tsx) |

## 3. Preparables sin DEV y dependientes de DEV24

### 3.1 Artefactos y gate

Actualización 2026-11-04: los artefactos marcados como dependientes de DEV24 se implementaron
en `feat/e46-inicio`. La columna «Sin DEV24» se conserva como estado histórico.

| Artefacto | Sin DEV24 (histórico) | Estado 2026-11-04 |
| --- | --- | --- |
| Corrección de la fixture integrada (F-01/F-02) | Sí, aplicada en SPEC24/testplan el 2026-11-04 | Validada por la fixture E2E (`inicio-server.ts`) |
| Tabla de mapeo motor→DTO (H-02 a H-06) | Sí, documental | Consumida por `resumen-inicio.ts` |
| Oráculo independiente y cifras prohibidas | Sí; el testplan lo contiene | Ejecutado por `resumen-inicio.test.ts` |
| Diseño de casos de contrato (nombres, precondiciones, asserts) | Sí, como diseño | Implementado en `resumen-inicio.test.ts` |
| Plan de reutilización de regresión y Playwright | Sí, documental | Implementado en `tests/e2e/inicio.spec.ts` |
| Checklist de accesibilidad y capturas | Sí, documental | Capturas `artifacts/e4-6/`; contraste y foco comprobados |
| Registro de riesgos y decisiones abiertas | Sí, este documento | Histórico; ver testplan |
| `GET /api/resumen-inicio`, composición y DTO | No | Implementado; AC-01 PARCIAL por huecos de fuente/cobertura |
| Pantalla `/inicio`, navegación, componentes y estilos | No | Implementada en `feat/e46-inicio` |
| Seed de fixture y specs Playwright | No | `apps/api/test-support/inicio-server.ts` + `tests/e2e/inicio.spec.ts` |
| Doble de contrato para `mesesObjetivo` | No | Implementado y probado en AC-12/13 |
| Cualquier cambio en motores E2.4/E2.6/E3.6/E4.2/E4.3/E4.4 | **No autorizado por E4.6** | Sin cambios de motores; solo se mapean motivos ya publicados |
| Tabla, DDL o migración | **Nunca en E4.6** | No se creó ninguna |

### 3.2 Bloqueos y preguntas que debían resolverse antes de DEV24 (histórico)

Los bloqueos de autorización y fixture quedaron resueltos el 2026-11-04; las decisiones
funcionales abiertas (Q1–Q12) no se reabren. Lo que sigue pendiente es la revisión QA, el
`--full` y el merge.

**F-01 — `mesFinanciado` de la fixture no era producible con el contrato vigente (RESUELTA documentalmente el 2026-11-04).**
[SPEC03](03-ciclos-financiados-specification.md) define «Mes financiado = primer día del mes
siguiente al Inicio» y `createCycle` lo deriva con `fundedMonth`; `deriveCycles` devuelve el
valor almacenado. Por tanto:

- **Corrección aplicada:** C007 se declara abierto con inicio `2026-06-20`, corte
  `2026-07-19` y `mesFinanciado 2026-07` (derivado); C008 de `V-EJERCICIO` usa inicio
  `2026-11-20`, abierto, `mesFinanciado 2026-12` y corte `2027-01-19`. No se cambia el motor.
- **Validación técnica 2026-11-04:** script efímero confirmó `fundedMonth(2026-06-20)=2026-07-01`, `fundedMonth(2026-11-20)=2026-12-01`, creación de ambos ciclos y posición de `S007` con compra a `S003`; no se ejecutaron suites completas.
- El DTO de ejemplo usa `YYYY-MM` y el motor `YYYY-MM-01`; es un mapeo de formato.

**F-02 — El Saldo `S004` tenía dos papeles incompatibles (RESUELTA documentalmente el 2026-11-04).**
Se añade `S007` como `Inversión/Inversiones` para `I1001`/`I1002`; `S004` permanece
`Efectivo/Inversiones` con 500,00 € y `PRE003` pasa a `S007`. No se cambian tipos ni se
fuerza el motor. **Validación 2026-11-04:** compra sobre `S007` con efectivo `S003` y posición resultante correcta en script efímero; queda validar la fixture integrada completa antes de DEV24.

**F-03 — DT8.** Formato de meses (2 decimales propuesto) y ruta `/inicio` con posible
redirección desde `/` siguen pendientes; no cambian valores, pero condicionan AC-13 y AC-09.

**F-04 — Revisión de composición (H-03).** E4.3 no publica revisión de corte. La composición
debe definir una revisión determinista a partir de IDs/revisiones de las fuentes, sin reloj
ni caché; es diseño técnico, no decisión funcional.

**F-05 — Doble de contrato R6.** El proveedor de `mesesObjetivo` del testplan debe ser una
inyección de prueba, no una tabla ni un valor por defecto. Sin él, solo `minimoObjetivo` es
`No disponible`.

Ninguna de estas preguntas reabre Q1–Q12. F-01 y F-02 quedan resueltas documentalmente; falta
validar la fixture ejecutable completa antes de solicitar DEV24. F-03 a F-05 siguen abiertas.

## 4. Riesgos de duplicar motores o inventar agregados

| ID | Riesgo | Señal de alarma | Prevención | AC |
| --- | --- | --- | --- | --- |
| R-01 | Re-sumar Saldos para obtener liquidez | Un importe distinto de `monthlyFlow.metrics.liquidez` | Consumir `metrics.liquidez` y `liquidez.incluidos/excluidos`; no reaplicar el filtro | AC-02/05/11 |
| R-02 | Recalcular el coste esencial dividiendo el plan anual entre 12 | Cociente distinto del racional de `annualEquivalent` | Consumir `total.numeradorCentimos` y `divisor`; propagar `Incompleto`/`Sin plan` | AC-12/14 |
| R-03 | Sumar posiciones E4.3 y efectivo del bróker | `3153.90` como «inversión total» | Mantener `agregado` y `efectivo` separados; usar `e43Corte.efectivo` al mismo corte | AC-18 |
| R-04 | Sumar Liquidez + Ahorro + Bolsas | Cualquier total cruzado de Saldos | Publicar conteos y posiciones por vista; nunca un total de Saldos | AC-10/19 |
| R-05 | Reconstruir capital de deuda desde movimientos | Importe distinto de `capital.deudaViva` o un 0 sustitutivo | Consumir `capital.calculable`; si alguna deuda no es calculable, total `null` con subtotal `n/m` | AC-21/25 |
| R-06 | Restar deuda de liquidez, gasto u operativo | `3456.40 − 1020.00 = 2436.40` o `1800 − 400` | Deuda informativa; no entra en ningún flujo | AC-21/22 |
| R-07 | Sumar o restar pendientes al operativo | `350 +/− pendientes` | Solo lista y conteos por tipo/estado; sin total monetario | AC-23 |
| R-08 | Inventar «ahorro generado» o «patrimonio» | Cifra sin motor nombrado o «neto» | Usar `ahorroCierre`/`variacionAhorro` (ND) y posiciones con Finalidad Ahorro; sin total nuevo | AC-10/19, Q5/Q10 |
| R-09 | Valorar posiciones o derivar resultado/rentabilidad | Valor manual con resultado calculado, o valor 0 sin E4.3 | Consumir `e43Corte`; manual deja resultado `No disponible`; sin E4.3, cantidad sin valor | AC-24/25 |
| R-10 | Normalizar `null` a `0.00` o parcial a total | `No disponible` presentado como cero, o subtotal como total | Conservar `null`, `Cero verificado` y `Parcial n/m`; sin normalización | AC-05/07/16/25 |
| R-11 | Mezclar revisiones de fuentes en una sola lectura | Secciones con cifras de instantes distintos | Una transacción/snapshot y una `revision` de composición; no cachear | AC-03/04 |
| R-12 | Truncar el universo por paginación de 100 | Total de deudas o Saldos calculado sobre la primera página | Recorrer páginas o usar el motor por ID; listas completas para cualquier total | AC-02/21/25 |
| R-13 | Elegir ciclo o corte por reloj | El inicio cambia al cambiar la fecha del sistema | Usar `cycleContext().actual` y `corte` publicado; `null` no se sustituye | AC-08/17 |
| R-14 | Convertir `Saldos.objetivo` en `mesesObjetivo` | «Mínimo objetivo» con un valor no aprobado | Sin proveedor R6, solo `minimoObjetivo` ND; no usar defaults | AC-12/15 |
| R-15 | Crear una tabla o proveedor persistente para R6 | Migración o DDL en E4.6 | Q3-B=A: E4.6 solo lectura; el doble de prueba no persiste | AC-12/15 |
| R-16 | Leer precierre, cierre o foto para rellenar huecos | Sección dependiente de `/api/cierres/*` | Frontera E4.8/E4.9: E4.6 solo lee motores vivos | AC-03/17 |
| R-17 | Calcular o redondear en el navegador | Formato con `float` o suma en cliente | API devuelve cadenas decimales exactas; el cliente solo formatea una vez | AC-01/13 |

Las cifras prohibidas del testplan (`3153.90`, `2436.40`, `1400`, `−50`, `1800 + 180`) se
conservan como aserciones negativas del oráculo; no se reescriben aquí.

## 5. Verificación documental de este cambio

| Comando | Resultado |
| --- | --- |
| `python3 scripts/validate-template` | Correcto (exit 0): estructura, enlaces, manifiestos, contratos, resume, prompt, heurísticas de seguridad y CI |
| `git diff --check` | Exit 0. El archivo está sin trackear, por lo que el comando no inspecciona su contenido; no hay cambios trackeados con errores |

No se ejecutaron `bun test`, Playwright, `bun run typecheck`, `bun run build` ni
`scripts/verify`: este documento no crea candidato funcional y el paquete solo autoriza
validaciones de estructura.

## 6. Próxima acción mínima

**DEV24 ya está implementado en `feat/e46-inicio`; no se reinicia.** La acción siguiente es la
revisión independiente de QA y la ejecución canónica `python3 scripts/verify --full` sobre el
SHA candidato. Después, el merge requiere aprobación explícita e identificable. AC-01 se
mantiene PARCIAL por huecos de fuente/cobertura en el DTO y AC-20/AC-21 siguen UNRUN; no se
declara completa la entrega hasta cerrarlos o bloquearlos con causa verificable.
