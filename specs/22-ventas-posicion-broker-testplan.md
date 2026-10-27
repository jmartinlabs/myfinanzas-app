# 22 — E4.2 Ventas, posición y efectivo de bróker: Test plan

Specification: [22-ventas-posicion-broker-specification.md](22-ventas-posicion-broker-specification.md)
Brainstorming: [22-ventas-posicion-broker-brainstorming.md](22-ventas-posicion-broker-brainstorming.md)
Status: **PROPOSED rev2 — matriz de diseño; D1–D7 confirmadas A por el usuario el 2026-10-27;
wireframes rev3 aprobados visualmente el 2026-10-28; ningún caso ejecutado. Specification completa
no aprobada; DEV22 no autorizado.**
Approval source/date: D1–D7 aprobadas por el usuario el 2026-10-27; SPEC19 rev10 aprobada el
2026-10-27 (registro original `3c271d3`, integrada en `main` `156a50d`); wireframes rev3
aprobados visualmente el 2026-10-28.
Base documental: `main` `4edcfeb`, 2026-10-28.
Historial: rev1 (2026-10-27) matriz inicial de 45 AC; rev2 (2026-10-27) registra Q0 resuelta y
D1–D7 confirmadas A; rev2.1 (2026-10-28) registra la aprobación visual rev3; no hay
implementación, código E4.2, migración ni datos reales.

## 1. Alcance, entorno y lectura de la matriz

- **Objeto:** verificar la Venta, el efectivo del bróker, la posición `Saldo de inversión +
  Instrumento` y la fuente de fechas de inversión de la referencia temporal, reutilizando los
  contratos de E4.1/E1.1/E1.3.
- **Estado:** todos los casos están **UNRUN**. No hay código E4.2, migración ni entorno de
  aceptación. Los estados `PASS`/`FAIL` solo podrán registrarse en DEV/QA con candidato y
  evidencia; esta matriz no acredita comportamiento.
- **Dependencias:** E4.1 está integrada en `main` `156a50d` (v18), con C16/C17 congelados; los
  casos que dependen de su tabla, motor o backup ya no están bloqueados por esa integración.
  Siguen UNRUN por ausencia de implementación E4.2 y de candidato autorizado. D7 requiere una
  enmienda explícita de SPEC19 (guard de cantidad vendida) antes de DEV22.
- **Datos:** exclusivamente ficticios y deterministas. Sin DB real, claves, factores, importes
  personales ni trazas en la evidencia versionada.
- **Decisiones:** D1–D7 = A confirmadas por el usuario el 2026-10-27. AC-05 aplica D1
  (rechazo de cantidad insuficiente); AC-30 aplica D2 (efectivo no negativo en
  correcciones/anulaciones); AC-27 aplica D3 (Instrumento/Saldo inactivo); AC-04/AC-18/AC-19/
  AC-35 aplican D5 (posición a 0); AC-45 aplica D7 (Compra rectificada/anulada por debajo de la
  cantidad vendida). Las alternativas B quedan descartadas; si una decisión cambiara, se
  revisarían los casos antes de DEV.
- **Comandos previstos:** `bun test` (API/SQLite y dominio), `bun run typecheck`, `bun run
  build`, `bun run test:e2e` (Playwright 390/1440) y `python3 scripts/verify --full` en el
  entorno canónico. En esta ronda documental no se ejecutan pruebas funcionales.

## 2. Fixtures ficticios de referencia

Saldo `S003` «Efectivo de inversión demo» (`Efectivo`/`Inversiones`), apertura 1.000,00 el
2026-01-01, entradas 2.500,00 y salidas 300,00. Saldo `S004` «Cartera de inversión demo»
(`Inversión`/`Inversiones`) y `S006` «Cartera secundaria demo» (creado por el servicio).
Instrumento `I1001` «Fondo índice demo», ficticio.

| ID | Fecha | Clase | Saldo inv. | Cantidad | Precio | Divisa | Cambio | EUR | Comisión | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | 2026-02-10 | Compra | S004 | 12,5 | 100,00 | USD | 0,900000 | 1.125,00 | 5,00 | Vigente |
| P2 | 2026-03-03 | Compra | S006 | 3 | 98,00 | USD | 0,900000 | 264,60 | 0,00 | Vigente |
| V1 | 2026-04-10 | Venta | S004 | 5 | 110,00 | USD | 0,920000 | 506,00 | 2,00 | Vigente |
| V2 | 2026-04-15 | Venta | S004 | 7,5 | 112,00 | USD | 0,930000 | 781,20 | 1,20 | Vigente |
| V3 | 2026-04-20 | Venta | S006 | 1 | 105,00 | EUR | NULL | 105,00 | 0,00 | Vigente |
| V4 | 2026-04-25 | Venta | S004 | 1 | 108,00 | USD | 0,910000 | 98,28 | 0,00 | Anulada |

Efectivo de `S003` tras P1/P2: 1.000,00 + 2.500,00 − 300,00 − 1.125,00 − 264,60 = **1.810,40**.
Tras V1: **2.316,40**. Tras V2: **3.097,60**. Tras V3: **3.202,60**. V4 no computa.
Posición `S004/I1001`: 12,5 tras P1; 7,5 tras V1; 0 tras V2. `S006/I1001`: 3 tras P2; 2 tras V3.

Casos adicionales: `P3` Compra de 2 a 100,00 EUR (200,00 total) el 2026-05-02 y `V5` Venta de 2 a
220,00 EUR el mismo día (neto 0 al cierre); `V6` Venta de 1 el mismo día (rechazo bajo D1). Para
D2: Venta de 500,00, gasto posterior de 2.200,00 y anulación de la Venta (efectivo negativo
resultante).

**Snapshots de fixture.** Cada AC parte del snapshot que resulta de las operaciones que menciona
su precondición; los AC que no mencionan operaciones usan **F-A**. No se mezclan snapshots dentro
de un AC. Los AC-05, AC-10, AC-12, AC-16, AC-20, AC-22, AC-30 y AC-35 indican su snapshot
explícito.

| Snapshot | Contenido | Efectivo S003 | Posición |
| --- | --- | --- | --- |
| F-A | P1+P2 (base) | 1.810,40 | S004/I1001 12,5; S006 3 |
| F-B | F-A+V1 | 2.316,40 | S004 7,5; S006 3 |
| F-C | F-B+V2 | 3.097,60 | S004 0; S006 3 |
| F-D | F-C+V3 | 3.202,60 | S004 0; S006 2 |
| F-E | F-D+V4 anulada | 3.202,60 | S004 0; S006 2 (V4 no computa) |
| F-G | F-C+P3 | 2.897,60 | S004 2; S006 3 |
| F-H | Apertura 2.000,00; Venta 500,00; Gasto 2.200,00 | 300,00 antes de anular | No aplica (escenario de efectivo) |
| F-I | Fechas ficticias de Movimientos/Comida/Inversión para `financialReference` | No aplica | No aplica |

## 3. Matriz de aceptación

| ID | Tipo | Precondiciones y acción | Resultado esperado | Método previsto | Estado / evidencia |
| --- | --- | --- | --- | --- | --- |
| E4.2-AC-01 | Positivo | F-A (P1+P2): Venta EUR de 5 a 110,00, EUR 550,00, sin comisión | Venta guardada; efectivo 1.810,40→2.360,40; cantidad 12,5→7,5; sin Movimiento; comisión 0/NULL | API/SQLite real; `bun test` focal de ventas | UNRUN — sin implementación |
| E4.2-AC-02 | Positivo | V1 USD con cambio 0,920000, EUR 506,00, comisión 2,00; después otra operación con cambio 0,950000 | V1 conserva USD/110,00/0,920000/506,00/2,00; efectivo +506,00; cantidad 7,5; la operación posterior no recalcula | API/SQLite real; `bun test` focal | UNRUN |
| E4.2-AC-03 | Positivo | Venta parcial V1 de 5 sobre 12,5 | Posición 7,5; compras=1, ventas=1; sin lote; efectivo +506,00 | API/SQLite + dominio de posición | UNRUN |
| E4.2-AC-04 | Positivo/límite | Venta total V2 de 7,5 sobre 7,5 | Posición 0; fila conservada con compras=1, ventas=2; última venta 15/04/2026; sin «Cerrada» ni valoración; efectivo +781,20 | API/SQLite + UI de ficha | UNRUN |
| E4.2-AC-05 | Negativo (D1=A) | F-B: vender 8 el 20/04; I1002 sin posición: vender 1; F-C: insertar Venta de 1 el 01/03; mismo día P3 2/V5 2/V6 1, en ambos órdenes | 422 `INSUFFICIENT_UNITS` con valores exactos: (a) 7,5/8/−0,5/20-04; (b) 0/1/−1/20-04; (c) 0/1/−1/15-04; (d) 0/1/−1/02-05; sin escritura, contador ni efecto; nunca 409; idéntico en ambos órdenes | API/SQLite + dominio de cantidad con ventana posterior | UNRUN — D1=A confirmada |
| E4.2-AC-06 | Positivo | I1001 en S004 y S006; Venta 5 en S004 y 1 en S006 | S004 12,5→7,5; S006 3→2; posiciones independientes; sin suma única | API/SQLite + ficha | UNRUN |
| E4.2-AC-07 | Positivo | Venta EUR 506,00 con comisión 2,00 incluida; Venta con comisión 0/NULL | Efectivo +506,00, no 504,00 ni 508,00; comisión informativa; sin doble efecto | API/SQLite + motor de efectivo | UNRUN |
| E4.2-AC-08 | Negativo | Comisión > importe, negativa y con 3 decimales | 422 `VALIDATION` con el campo; sin fila ni cambio de efectivo/cantidad | API/SQLite real | UNRUN |
| E4.2-AC-09 | Negativo/límite | Reintento con misma idempotency-key/payload; misma clave con payload distinto; dos Ventas distintas el mismo día | Un solo hecho/abono; 409 `IDEMPOTENCY_CONFLICT` en el payload distinto; dos Ventas del mismo día aceptadas; sin unicidad de operación | API/SQLite; dos conexiones | UNRUN |
| E4.2-AC-10 | Positivo | F-B: rectificar V1: cantidad 5→3, EUR 506,00→303,00, comisión 2,00→1,00, motivo y revisión | Impacto efectivo 2.316,40→2.113,40 y cantidad 7,5→9,5; referencia 303,60 y diferencia −0,60 informativa; escritura atómica; revisión nueva; auditoría antes/después; recálculo | API/SQLite + UI de impacto | UNRUN |
| E4.2-AC-11 | Negativo | Revisión obsoleta; omitir `precio`; `null` en `importeEur`; incluir Instrumento/Saldos | 409 `REVISION_CONFLICT`; 422 `VALIDATION` con el campo; 422 sin escritura; ninguna escribe | API/SQLite real | UNRUN |
| E4.2-AC-12 | Positivo | F-B: anular V1 con revisión y motivo; consultar efectivo, cantidad, ficha y auditoría | Registro `Anulada` conservado; no computa; efectivo 1.810,40; cantidad 12,5 (F-A); auditoría consultable | API/SQLite real | UNRUN |
| E4.2-AC-13 | Negativo | Segunda anulación con revisión vigente; revisión obsoleta; rectificar una anulada | 422 `VALIDATION` por Estado; 409 `REVISION_CONFLICT`; 422 al rectificar anulada; sin escritura | API/SQLite real | UNRUN |
| E4.2-AC-14 | Negativo/integración | Rectificar Instrumento/Saldos; anular y crear otra Venta con otro Instrumento/Saldo y mismo motivo | 422 sin escritura; original Anulada y fuera de cálculos; nueva computa en sus Saldos; sin vínculo persistido | API/SQLite + auditoría | UNRUN |
| E4.2-AC-15 | Negativo/integración | Crear, rectificar y anular Ventas; comparar Movimientos, Presupuesto, Partida, Referencia y Deuda | Sin cambio de Movimientos; sin Gasto/Compra, Partida, Referencia, Presupuesto ni Deuda; sin duplicado | API/SQLite; comparación de tablas | UNRUN |
| E4.2-AC-16 | Integración | F-B: `GET /api/saldos/S003` y `GET /api/inversiones/efectivo?saldo=S003` sin/con fecha | Misma cifra al céntimo (2.316,40); con fecha, corte etiquetado; sin escritura | API real + motor único | UNRUN |
| E4.2-AC-17 | Integración | Consultar S001 antes/después de Venta en S003 | S001 y su número de Movimientos no cambian; la Venta no se incorpora a Efectivo/Movimientos | API/SQLite; comparación | UNRUN |
| E4.2-AC-18 | Positivo | Ficha I1001 tras P1, V1 y V2 | S004 7,5 luego 0; compras=1, ventas=1 luego 2; S006 3/1/0; fechas correctas; sin mezcla de Saldos | API/SQLite + UI de ficha | UNRUN |
| E4.2-AC-19 | Límite/UI | Listado y ficha con posiciones, incluida una a 0 | Cobertura parcial declarada; sin valor/resultado/rentabilidad; «No disponible hasta E4.3»; sin «Cerrada» | API + Playwright | UNRUN |
| E4.2-AC-20 | Positivo | F-A → F-B: V1 10/04/2026, posterior a Movimientos 03/03/2026; Comida pendiente; Ciclos Inicio 01/03 y 01/04; consultar referencia, cobertura, Ciclos y flujo mensual | Antes: referencia 03/03 y ciclo 01/03; después: referencia 10/04, ciclo 01/04 y corte 10/04; inversión `disponible`; Comida `pendiente`; sin `creado`/reloj | API + dominio `financialReference` + Ciclos/flujo | UNRUN |
| E4.2-AC-21 | Positivo/integración | `financialReference` con Movimientos 10/01, Comida 20/02 e Inversión 15/03; después Inversión 15/01; después Inversión 25/02; después Inversión pendiente | Máximos 15/03, 20/02 y 25/02; con Inversión pendiente y Comida 20/02, máximo 20/02; cobertura por fuente; sin suma ni fecha inventada | Dominio puro + API de ciclos | UNRUN |
| E4.2-AC-22 | Límite/integración | F-D: anular V3 (20/04, la vigente más reciente); rectificar fecha de V2 a 25/04/2026 | Referencia 15/04 tras anular V3; luego 25/04 tras rectificar V2; la anulada no se conserva | Dominio + API | UNRUN |
| E4.2-AC-23 | Negativo | Simular error de fuente de inversión; base sin tabla; base con tabla vacía; consultar cabecera, Ciclos y flujo mensual | `estado=error`, `fecha=null`, causa en cobertura; ausente `pendiente`; tabla vacía `sin_referencia` con `maxDate=null` y referencia global `sin_referencia` si no hay otras fechas; referencia de disponibles cuando corresponda; sin reloj/fecha inventada | API + UI de estados | UNRUN |
| E4.2-AC-24 | Límite | Fecha futura, inválida, 29/02 bisiesto, pasada válida; reloj fijo 23:30Z y 00:30Z | Futuro/inválida 422; bisiesto/pasada aceptadas; fecha civil literal; `spanishToday` Europe/Madrid | API/SQLite con reloj fijo | UNRUN |
| E4.2-AC-25 | Límite | Cantidad 9 decimales, precio/cambio 7; límites 8/6/6 y 2⁵³−1; EUR céntimos; producto >2⁵³ | Exceso 422 API/persistencia sin redondeo; límite exacto; EUR exacto; cálculo interno BigInt y presentación a céntimos | API/SQLite + dominio de precisión | UNRUN |
| E4.2-AC-26 | Negativo/límite | EUR con cambio NULL y 1,000000; EUR con 1,100000; USD sin cambio, 0, negativo; divisa US/USDD/usd | EUR válidas; EUR 1,1 y USD inválidas 422 con campo; sin normalización ni cambio actual | API/SQLite real | UNRUN |
| E4.2-AC-27 | Negativo (D3=A) | Instrumento inexistente; Instrumento inactivo sin cantidad; Saldo efectivo/inversión inexistente o inactivo; tipo incorrecto; efectivo=inversión; Efectivo/Movimientos; Venta desde Saldo inactivo; Instrumento inactivo con cantidad en S004 y no en S006 | Inválidos 422 con motivo y sin escritura; bajo D3=A, Instrumento inactivo con cantidad aceptado con aviso, marcado solo para el Saldo donde tiene cantidad y no para Compras; Saldo inactivo rechazado | API/SQLite + UI | UNRUN — D3=A confirmada |
| E4.2-AC-28 | Negativo | Fallo inyectado tras reservar ID o antes de auditar | Rollback completo: sin Venta, efecto, contador ni auditoría parcial | Prueba transaccional | UNRUN |
| E4.2-AC-29 | Negativo/concurrencia | Dos Ventas compitiendo por cantidad; dos rectificaciones con revisión desactualizada; dos altas con misma clave | Una Venta válida y otra 422 `INSUFFICIENT_UNITS`; una rectificación y otra 409 `REVISION_CONFLICT`; un solo hecho idempotente; sin 409 genérico | Dos conexiones/procesos reales | UNRUN |
| E4.2-AC-30 | Negativo (D2=A) | F-H: apertura 2.000,00; Venta 500,00 el 10/04; Gasto 2.200,00 el 11/04 (efectivo 300,00); anular; rectificar a 100,00; rectificar al alza | Anulación 422 `INSUFFICIENT_CASH` con 300,00/500,00/−200,00/11-04; rectificación a 100,00 con mínimo −100,00; alza aceptada; sin escritura ni efecto parcial; alternativa B descartada | API/SQLite + motor de efectivo | UNRUN — D2=A confirmada |
| E4.2-AC-31 | Negativo/seguridad | Sin sesión, sin CSRF/Origin, error interno; `DELETE /api/ventas/{id}` | 401/403; sin escritura; errores sin SQL/importes/tokens; DELETE 404 sin escritura; sin fixtures | HTTP real MFA/Origin/CSRF | UNRUN |
| E4.2-AC-32 | UI | Recorrer listado, alta, impacto, rectificación, anulación (incluido su impacto) y ficha a 390/1440 con teclado | Foco visible/devuelto, etiquetas, sin overflow, tema claro, borrador conservado, confirmación deshabilitada sin motivo, avisos de cantidad/efectivo, impacto de anulación y D2; capturas ficticias | Playwright + capturas 390×844 y 1440×1000 | UNRUN |
| E4.2-AC-33 | UI/negativo | Vacío, carga, error de fuente, 409, cantidad/efectivo insuficiente, sesión expirada | Estados distintos/accionables; «No disponible» con motivo; sin 0 ficticio; borrador conservado; referencia pendiente/error declarada | Playwright con API real e intercepción de estados | UNRUN |
| E4.2-AC-34 | Integración | Inspeccionar IDs y auditoría tras alta/rectificación/anulación; intentar UPDATE/DELETE sobre auditoría | IDs únicos/inmutables; fila por revisión con clase, actor, UTC, motivo y JSON; triggers abortan; `audit`/`instrumento_audit` sin cambios | SQLite/API + triggers | UNRUN |
| E4.2-AC-35 | Integración/límite | F-C: P1 12,5; V1 5; V2 7,5; P3 2 el 02/05; consultar posición/efectivo | 12,5→7,5→0→2; reapertura sin «Cerrada»; S004 1 compra/2 ventas antes de P3 y 2/2 después; S006 1/0; efectivo una sola vez | API/SQLite + ficha | UNRUN |
| E4.2-AC-36 | Integración/esquema | Inspeccionar tablas, clase, auditoría, intentos, contadores; comprobar ausencia de tabla `ventas`; revisar versión/gate | Una tabla `operaciones_inversion` con Compra/Venta; sin tabla `ventas`; misma auditoría/intentos/contador; ninguna versión reservada por SPEC22; migración preserva filas/identidad/datos ajenos; gate de E4.1 | Inspección de esquema + gate documental | UNRUN — sin implementación E4.2 |
| E4.2-AC-37 | Integración/backup | Crear Compras/Ventas, backup, restore en directorio nuevo; consultar posición/efectivo/auditoría | Ventas y auditoría conservadas en `operaciones_inversion`; restore sin mezclar versiones, verifica manifiesto, vacía intentos; sin tabla/mecanismo nuevos | Backup/restore real con fixture aislado | UNRUN — sin implementación E4.2 |
| E4.2-AC-38 | Integración/límite | Referencia con Movimientos e Inversión en la misma fecha máxima; después una pendiente y otra con error | Fecha común una sola vez; cobertura de ambas; pendiente no se omite; error `fecha=null`; sin duplicar/inventar máximo | Dominio + API | UNRUN |
| E4.2-AC-39 | Integración | Saldo solo con Venta y Saldo con Compra y Venta (incluida anulada); cambiar tipo/control/apertura/fechaApertura/permiteSalidaExterior; desactivar/reactivar; cambiar nombre | Cinco cambios 409 `HISTORY_LOCKED` sin escritura en ambos; desactivar/reactivar conservan operaciones; nombre permitido; auditoría del Saldo coherente | API/SQLite real | UNRUN — sin implementación E4.2 |
| E4.2-AC-40 | Integración | Previsualizar Gasto sobre S003; registrar Venta; confirmar con huella; repetir con S001 y Venta en S003 | 409 `IMPACT_CHANGED` sin escribir; efectivo solo con la Venta; borrador conservado; recálculo válido; caso ajeno por huella global | API + dos conexiones + UI | UNRUN — sin implementación E4.2 |
| E4.2-AC-41 | Integración | `flujo-mensual` con S001 activo `liquidez=1` 5.000,00 y S003 `liquidez=1` antes/después de V1; después `=0` y `NULL` | Antes 6.810,40; tras V1 `incluidos` con S003 (2.316,40), `excluidos` sin S003, `Verificado`, `subtotal=null`, `valor=7.316,40`; `=0` valor 5.000,00; `NULL` `Parcial` y subtotal 5.000,00; nota de cobertura; R6 sin cambio | API + flujo mensual | UNRUN — sin implementación E4.2 |
| E4.2-AC-42 | Integración | Invocar las tres rutas de impacto y los GET; comparar tablas, contadores, revisiones y auditoría | Ninguna ruta escribe; sin filas, contador, ID ni revisión; impacto solo lectura | API/SQLite; comparación antes/después | UNRUN |
| E4.2-AC-43 | Negativo/límite | Cantidad 0/negativa/NaN/infinito/exponente; precio/EUR 0/negativo; concepto/nota 2000/2001; idempotency-key ausente/inválida; comisión = importe; importe distinto de cantidad×precio×cambio | 422 `VALIDATION` con campo; 2000 aceptado/2001 rechazado; 422 `IDEMPOTENCY_REQUIRED`; comisión = importe aceptada sin doble efecto; diferencia informativa sin corrección | API/SQLite real | UNRUN |
| E4.2-AC-44 | Positivo/negativo | `GET /api/ventas` con filtros/paginación/estado; detalle y auditoría inexistentes; opciones; Venta con referencias ausentes | Filtros estables y sin filas ajenas; vigentes por defecto/anuladas consultables; 404 en inexistentes; auditoría por revisión; opciones separadas y, bajo D3, `instrumentosVenta` marcados y acotados al Saldo; referencias ausentes «Revisar» sin reparar ni computar | API/SQLite + UI | UNRUN |
| E4.2-AC-45 | Integración/negativo (D7=A) | F-B: anular P1 (12,5) con V1 viva; rectificar P1 a 3; en S006, Venta de 2 el 12/04/2026 y anular P2 (3) | 422 `INSUFFICIENT_UNITS` con 7,5/12,5/−5/10-04; rectificación a 3 rechazada; P2 con 1/3/−2/12-04; sin escritura ni auditoría de éxito; coordinación/documentación previa de SPEC19; alternativa B descartada | API/SQLite + dominio de cantidad | UNRUN — D7=A confirmada |

## 4. Cobertura por tipo de caso

| Tipo | AC | Qué cubre |
| --- | --- | --- |
| Positivo | AC-01, AC-02, AC-03, AC-04, AC-06, AC-07, AC-10, AC-12, AC-18, AC-20, AC-21, AC-35, AC-44 | Venta EUR/divisa, parcial/total, comisión, dos Saldos, rectificación, anulación, ficha, referencia, reapertura y consulta. |
| Negativo | AC-05, AC-08, AC-09, AC-11, AC-13, AC-14, AC-15, AC-23, AC-26, AC-27, AC-28, AC-29, AC-30, AC-31, AC-33, AC-43, AC-44 | Cantidad insuficiente, comisión inválida, duplicado, revisión obsoleta, anulada, identidad no rectificable, sin Movimiento, fuente error, divisa/cambio, elegibilidad, rollback, concurrencia, efectivo, seguridad, estados y validación. |
| Límite | AC-04, AC-05, AC-09, AC-19, AC-22, AC-24, AC-25, AC-26, AC-30, AC-35, AC-38, AC-43 | Venta total 0, cantidad exacta, idempotencia, posición 0, referencia que retrocede, bisiesto/`spanishToday`, escalas y 2⁵³−1, EUR 1, efectivo negativo, reapertura, misma fecha máxima y límites de campo. |
| UI | AC-32, AC-33 | Recorrido 390/1440, foco, teclado, overflow, tema claro, borrador, impacto de anulación, estados vacío/carga/error y D2. |
| Integración/regresión | AC-16, AC-17, AC-21, AC-22, AC-34, AC-35, AC-36, AC-37, AC-38, AC-39, AC-40, AC-41, AC-42, AC-45 | Motor único, Efectivo/Movimientos, referencia, auditoría, esquema, backup, guard de Saldo, huella de Movimiento, Liquidez, impacto sin escritura e invariante de cantidad con Compras. |

## 5. Verificación documental de esta ronda

| Comprobación | Método | Estado |
| --- | --- | --- |
| Enlaces relativos y estructura de los documentos | `python3 scripts/validate-template` | **PASS** — «Template validation passed: structure, links, manifests, contracts, resume, prompt, safety heuristics and CI» (macOS, Python 3.9.6, base `main` `4edcfeb`, candidate sin commitear; wireframes y ZIP versionados) |
| Regresiones del validador | `python3.12 scripts/test-validator` | **PASS** — 26 tests OK (mismo entorno/candidato) |
| Whitespace y diff | `git diff --check` | **PASS** — sin errores, exit 0 |
| Verificación canónica local | `python3.12 scripts/verify baseline` (cliente externo) | **PASS reportado** — baseline phase PASS; application phase no incluida; `test-verification` 15 tests OK; working/commit whitespace PASS. **No reejecutado en esta publicación**: Python 3.9.6 local, el script exige 3.10+ (UNRUN, no FAIL) |
| Trazabilidad roadmap → AC → testplan | Inspección de §14 de la specification y §3/§4 de este testplan | **PASS** — E4.2-AC1/AC2/AC3 mapeados; 45 AC en spec y 45 filas en testplan, IDs 01–45 únicos |
| Sin versión de esquema reservada por E4.2 | Inspección de §1.1/§5.2/§12 de la specification y AC-36 | **PASS** — ninguna versión reservada; migración/gate diferidos a DEV conforme al esquema vigente (v18) |
| Distinción aprobado/propuesto/implementado | Inspección de §1.1 y brainstorming §0 | **PASS** — rev7/rev8 y rev10 aprobadas (rev10 integrada en `main` `156a50d`); E4.1 integrada en v18; sin implementación E4.2 |
| Revisión documental independiente | Tres revisores en contexto separado, solo lectura (`ses_e81331174fferO8rj47V8of431`, `ses_e8124bbb8ffeGN2qfdFZOv2nmT`, `ses_e811d99b3ffevf4K5q3804grOn`) | **PASS final** — la primera emitió CHANGES (19 hallazgos), la segunda CHANGES (2 mayores + 7 menores), la tercera **PASS** con 6 menores editoriales; todas las correcciones aplicadas y verificadas |
| Aprobación visual rev3 | Mensaje explícito del usuario, 2026-10-28 | **PASS** — «Apruebo la revisión visual rev3 de W2/W5 y W11–W16 de SPEC22, incluidos los estados y bloqueos D1/D2/D3.» No autoriza DEV22, esquema, commits, push, PR ni merge |

Estos estados se actualizarán con la evidencia real de la sesión; no se declarará PASS sin
comando, entorno y candidato. No hay pruebas funcionales, CI remoto ni verificación de
implementación en esta ronda.

## 6. Dependencias E4.3 y limitaciones

- E4.3 necesitará la cantidad, el historial de operaciones, los importes EUR, las divisas, los
  cambios históricos y las comisiones que E4.2 conserva; también la posición a 0 y la cobertura
  parcial. E4.2 no calcula valor, resultado, rentabilidad ni Estado Abierta/Cerrada.
- E4.3 deberá decidir el tratamiento de la posición a 0, la reapertura, la valoración manual y
  automática, el resultado abierto/cerrado y los agregados por Tipo saldo=Inversión. No se
  especifican aquí.
- E4.2 no crea lotes ni FIFO; si E4.3 los necesita, es una decisión nueva.
- La fuente «Revisión Comida» pertenece a E3.4 (Revisión bancaria de Comida); E3.5 consume la
  agregación por ciclo. E4.2 solo consume su contrato. La prueba de las tres fuentes puede usar
  fuentes ficticias del contrato puro y no acredita integración de E3.4/E3.5.
- La versión de esquema, la migración y el backup/restore dependen del gate de esquema vigente
  (v18); esta matriz no reserva versión ni declara una migración ejecutada.
- Sin CI remoto, PR, merge ni despliegue en esta ronda.

## 7. Siguiente acción

Los wireframes rev3 están aprobados visualmente desde el 2026-10-28 y D1–D7 siguen confirmadas A.
E4.1 está integrada (`156a50d`, v18). SPEC22 permanece candidata hasta el cierre documental y la
coordinación D7/SPEC19 (enmienda mínima de SPEC19). Solo con una autorización de desarrollo
separada se podrá abrir DEV22, implementar y ejecutar esta matriz con candidato y evidencia. No se
inicia DEV22 por esta ronda documental.
