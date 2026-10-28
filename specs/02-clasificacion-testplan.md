# 02 — Clasificación: test plan
Status: **E1.2 integrada por PR #11; 27 PASS E1.2 + 4 contratos posteriores.**
Revisión documental 2026-10-28; **F-SPEC02-01 abierto**. La evidencia local es histórica.
Fecha: 2026-10-21. Cierre documental en PR #11.
Especificación aprobada: [02](02-clasificacion-specification.md).

## Evidencia ejecutada
- `bun run typecheck` y `bun run build`: correctos. Sin lint configurado.
- `bun run test`: **25 pass / 0 fail / 322 assertions**, 2 archivos; conserva 16
  regresiones E1.1 y añade 9 pruebas E1.2. Última ejecución local: 8,04 s.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:e2e`:
  **1 recorrido conjunto E1.1+E1.2 pass**, 34,1 s total; 24,0 s del recorrido.
  Autenticación/MFA reales, API Effect/SQLite y restauración cifrada real. Ensayo de
  restauración/MFA/lectura UI: 2843 ms, ficticio local, no SLA ni RTO de producción.
- `validate-template`, sus **18 regresiones**, `check-project`, **22 pruebas de
  controles**, `check-repository`, whitespace y revisión manual: correctos.
- CI push/PR: consultar checks del SHA final de la PR; resultados remotos separados
  de estos resultados locales. No publicación de logs/factores ni traces/storageState.

## Trazabilidad de aceptación
Bun: apps/api/src/clasificacion.test.ts; regresión: apps/api/src/app.test.ts.
Browser: tests/e2e/classification.ts llamado desde catalog.spec.ts, sin bypass MFA.

| AC | Verificación realizada / resultado | Estado |
| --- | --- | --- |
| AC-01 | Altas por servicio, reinicio y restauración de jerarquía desde archivo | PASS |
| AC-02 | Dos procesos v1→v2 + IDs únicos; >999, idempotencia y rollback | PASS |
| AC-03 | Renombrado por ID, nombre vigente derivado; edición real en browser | PASS |
| AC-04 | Padre inexistente rechazado sin fila parcial; FK íntegras | PASS |
| AC-05 | Cadena derivada y cambio explícito de padre sin reescribir descendiente | PASS |
| AC-06 | Esquema/inspección de formularios sin copias de Categoría ni Base/Esencial/Del mes | PASS |
| AC-07 | Grupo opcional/libre, edición real sin maestro | PASS |
| AC-08 | Anual No aplica + mensual Gasto independientes, sin motor | PASS |
| AC-09 | Método fuera de dominio rechazado; no relleno No aplica | PASS |
| AC-10 | Duplicados globales entre padres y dos procesos; Unicode/mayúsculas/tildes/espacios/literales y reintento | PASS |
| AC-11 | Padre con descendientes activos bloqueado, IDs/nombres visibles en browser | PASS |
| AC-12 | Desactivar abajo arriba; reactivar padre deja hijos inactivos | PASS |
| AC-13 | Alta/reactivación con padre inactivo rechazadas | PASS |
| AC-14 | Triggers no DELETE/ID; API no expone borrado y rechaza campos no editables | PASS |
| AC-15 | Cambio de rama usada exige vista, motivo y confirmación real | PASS |
| AC-16 | Descendientes indirectos visibles, aviso de posible recálculo sin afirmar cálculo comprobado | PASS |
| AC-17 | Vista obsoleta rechazada por cambio concurrente; borrador browser conservado | PASS |
| AC-18 | Fallo/guard técnico aislado impide escritura; no motor financiero servido | PASS |
| AC-19 | Impacto real de hechos/planes/indicadores/cierres | CONTRATO FUTURO, NO IMPLEMENTADO |
| AC-20 | Vista cubre catálogo y declara impacto financiero no comprobado | PASS |
| AC-21 | Partida sin Presupuesto/Deuda válida, sin columnas/maestros ni selectores ficticios | PASS |
| AC-22 | Alta Categoría sin elección de Referencia rechazada; selector inicialmente vacío | PASS |
| AC-23 | Ausencias sintéticas preservadas en backend y formulario real al cambiar Grupo | PASS |
| AC-24 | Referencia en Gasto/Amortización y Tipo/mapping esperado | CONTRATO FUTURO, NO IMPLEMENTADO |
| AC-25 | Operaciones Anticipo/Compartido según sus reglas | CONTRATO FUTURO, NO IMPLEMENTADO |
| AC-26 | Ejecución de cálculo anual/mensual/neto compartido | CONTRATO FUTURO, NO IMPLEMENTADO |
| AC-27 | Tres niveles con alta/ficha/edición/estado, filtros, tablas/tarjetas y cancelar | PASS |
| AC-28 | Carga/vacío/error/reintento, conflicto real y borrador tras respuesta 401 | PASS |
| AC-29 | Teclado, etiquetas estables, tema claro, colores reales y sin overflow 390/1440; inspección | PASS |
| AC-30 | HTTP sin MFA/CSRF/Origin inválido rechazado; regresión acceso completa | PASS |
| AC-31 | Inicializador E1.1 congelado, comparación tablas previas/contadores, MFA/sesión, rollback/esquema desconocido, apertura concurrente y copia/restauración v1/v2 | PASS |

Pruebas de impacto con dobles verifican solo protocolo técnico. No demuestran
periodos/resultados financieros ni protección de cierres inexistentes. Cada consumidor
posterior deberá integrar sus consultas e invalidación/revisión financiera real.
Nombres comparados con Unicode toLowerCase: Café/CAFÉ colisionan; Cafe/Café,
espacios, NFC/NFD y Straße/STRASSE no se normalizan entre sí; * y ? son literales.
La comparación no pretende equivalencia exhaustiva con collation/COUNTIF de Excel.
Chequeo y escritura IMMEDIATE, incluye inactivos; sin transformaciones silenciosas.

## Consumidores posteriores (no PASS E1.2)

| AC | Estado real en `main` | Evidencia |
| --- | --- | --- |
| AC-19 | Parcial: Movimientos/Referencia y planes anuales detectados; presupuesto solo al cambiar `presupuesto`; indicadores/cierres sin runtime | `clasificacion.ts`, `movement-impact.ts`, `plan-anual.ts`, `planes-ciclo.ts` |
| AC-24 | Implementado después en E1.4/E1.5; no acreditado por E1.2 | `reference-rules.ts`, `movimientos.ts` |
| AC-25 | Implementado después en E3.1/E3.2; no acreditado por E1.2 | `anticipos.ts`, `compartidos.ts` |
| AC-26 | Sin consumidor runtime: `anual`/`mensual` solo se almacenan | `plan-anual.ts`, `flujo-mensual.ts` |

Estas implementaciones no cambian los **27 PASS E1.2** ni los **4 contratos**. AC-19/24/25/26
siguen C; sus pruebas posteriores pertenecen a sus propias entregas.

**F-SPEC02-01 abierto:** la vista de impacto no declara exhaustivamente los consumidores
pendientes ni muestra los planes anuales; ver [specification](02-clasificacion-specification.md)
y tracker. No se corrige en esta PR.

## Capturas e inspección visual
Artefactos ignorados: `artifacts/e1-2/*.png`, en CI junto a e1-1 en el artifact
`e1-1-screenshots` (7 días). No DB/claves/factores en artifacts ni en Git.
Capturas reales inspeccionadas a 390×844 y 1440×1000:
list-desktop/mobile, form-desktop/mobile, detail-desktop/mobile,
rectification-desktop/mobile, error-desktop y restored-mobile.
Otras evidencias: empty-desktop, validation-desktop, blocked-mobile,
inactive-mobile, conflict-desktop, loading-desktop y session-draft-mobile.

Cinco mejoras prioritarias aplicadas en el mismo incremento:
1. Tabla específica de tres columnas con anchuras legibles, sin heredar cinco de Saldos.
2. Etiquetas accesibles estables en selectores/campos, independientes de opciones/errores.
3. Resumen de rectificación con etiquetas humanas y Antes/Después, nombres más IDs.
4. Nombres largos/espacios preservados y wrapping sin desbordamiento en tarjetas.
5. Error de consulta muestra Consulta no disponible, nunca 0 elementos ni vacío falso.

Se mantuvieron paleta/tokens, tema claro, texto oscuro sobre #8DBB2E y navegación
común; browser contrasta los colores reales y la suite E1.1 mide ratios de paleta.
No auditoría WCAG completa ni lector de pantalla. No rediseño de identidad.

## Incidencias de desarrollo y límites
INSERT inicial de Categoría tenía un placeholder extra, corregido antes de commit.
Primeros recorridos detectaron nombres accesibles dependientes de opciones de select;
corregidos en la app, no ocultados relajando pruebas. Suite final verde.
SQLite v1→v2 no reinicializa Saldos ni acceso. Una base sin versión o desconocida se
rechaza; nueva instalación solo development/test. Copia antes de actualizar mediante
herramientas E1.1 y custodia de clave siguen como precaución operativa documentada;
actualización no genera copias externas automáticamente. No importación, datos reales,
producción, scheduler/retención/custodia externa ni cambio de maestro.
Aprobación final: usuario sobre 58b51f9 tras auditoría de Álex, 2026-10-21.
CI de ese SHA: push 39569358781 y PR 39569369542 SUCCESS. El cierre documental
no cambia código/pruebas ni reclasifica aceptación. SHA de squash y CI posterior
verificables en PR #11; las 27 filas PASS y 4 contratos futuros se conservan.
**Siguiente acción:** revisión documental de SPEC02 y F-SPEC02-01; no iniciar SPEC03
ni modificar código. E1.3 y entregas posteriores avanzaron por sus propias specs.
