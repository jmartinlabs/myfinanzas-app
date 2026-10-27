# 19 — E4.1 Instrumentos y Compras de inversión: Test plan

Specification: [19-instrumentos-compras-inversion-specification.md](19-instrumentos-compras-inversion-specification.md)
Status: **APPROVED rev10** — aprobada por el usuario el 2026-10-27; **C16 y C17 congelados**
en `apps/api/src/schema-contracts.json` el 2026-10-27. Reconcilia el destino **18** con
`origin/main` `9977210` (esquema 17, D5/PR90) y no cambia las decisiones funcionales de
rev7/rev8. **DEV19 implementó la 18** sobre `main` `2364d9c`; el candidato final `dd450de`
acredita rev10/18 con CI Linux full `40583217493` SUCCESS (13 E2E). **No se autoriza merge ni despliegue.**
Approval source/date: rev8 fue aprobada por el usuario el 2026-10-26 sobre el commit
`f439010d527ba65953a1ccc0aa47cbeb51cfce31`. Rev9 quedó superada; rev10 fue aprobada por el
usuario el 2026-10-27.
Base: `e408b1da5ae9f45c9bfd139d11f362216b5bce26`, 2026-10-26.
Historial: rev1 diseño inicial; rev2 incorpora la matriz de 50 AC y las regresiones de
integración de la revisión independiente (2026-10-26); rev3 aplica N1–N12 (matriz de 54 AC,
regresión F7 de Liquidez con oráculo único, previsualización de los cuatro tipos de
Movimiento, versión de esquema y restore previo, exactitud interna y pruebas de no-escritura),
2026-10-26; rev4 aplica los residuales R3-1–R3-3 de la verificación final (precondiciones de
AC-41, prueba de la invalidación amplia en AC-53 y compuerta `database-identity.ts` en
AC-33), 2026-10-26; rev5 aplica el delta técnico R6 (esquema 15 con upgrade 13→15 y 14→15,
restore en directorio nuevo sin mezclar versiones, códigos de error unívocos y precondición R4-1
de AC-41), 2026-10-26; rev6 corrige los hallazgos de la revisión independiente del delta
(restore en directorio nuevo y vaciado de intentos, rutas `metrics.liquidez`, alcance de
`IMPACT_CHANGED`, precondición AC-41 sin Movimientos y errata de AC-52), 2026-10-26; rev7
delimita y condiciona el contrato de esquema v14 (lista cerrada de contratos admitidos,
manifiestos canónicos y SHA-256 obligatorios antes de DEV, rechazo de variantes desconocidas o
incompletas antes de mutar y revalidación de la versión destino); **aprobado con SPEC19 rev7
por el usuario el 2026-10-26 sobre el commit `47f469a902330ac199c910225563f909bd5116eb`**; rev8
es el ajuste técnico a la versión 16, con contrato real `C15-COMPARTIDOS-AD2EDFE`, rutas
13/14/15→16 y preservación de datos de Compartidos v15, 2026-10-26, **aprobado rev8 por el
usuario sobre el commit `f439010d527ba65953a1ccc0aa47cbeb51cfce31`**, manteniendo las
decisiones funcionales de rev7; rev9 (2026-10-27) propuso la progresión canónica 13/14→16 tras
integrar `main` v15 y quedó superada al ocupar `main` la 16; rev10 (2026-10-27) fija destino
**18**, primero con C16 y, tras integrarse D5/PR90 en `main` `cf6954a`, con el contrato v17
`C17-D5-CF6954A` (145 objetos, SHA-256
`e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50`, congelado), rutas
13/14/15/16/17→18, backup/restore 1..18 y preservación D5; **aprobada por el usuario e
implementada en DEV19**; sin merge ni despliegue.

Matriz de diseño rev7 con ajuste técnico rev8 y rev10 aprobada e implementada en DEV19. El
código declara `schemaVersion = 18` sobre `main` `9977210`, admite C16/C17 y ejecuta la cadena
16→17→18; C16/C17 permanecen congelados. El candidato verificado es `dd450de`.
Los comandos usan el runner real del repositorio (`bun test` bajo el script `test`,
`bun run test:e2e` y `python3 scripts/verify --full`). Datos exclusivamente ficticios; sin DB,
claves, factores ni trazas en la evidencia versionada. Los casos de retroactividad,
preservación de divisa/factor histórico, motor único, límites de magnitud y cobertura parcial
se marcan explícitamente; los estados PARCIAL están justificados y la evidencia Linux/CI está
cerrada con `40583217493`.

**Lectura de la matriz:** los estados `PASS`/`PARCIAL` son evidencia del candidato v18
`dd450de`, verificado en API/SQLite y CI Linux. Los seis PARCIAL conservan sus residuales de
cobertura; no hay FAIL ni UNRUN bloqueante. La migración 17→18 y la preservación D5 tienen
prueba versionada propia.

> Nota de evidencia: la columna «CI Ubuntu pendiente» de las filas históricas conserva el
> estado del momento en que se registró cada fila; la verificación final de DEV19 es CI Linux
> `40583217493` SUCCESS (API crítica). Las filas E2E AC-31/AC-37 mantienen evidencia local
> macOS y no se re-ejecutaron en Linux.

| Acceptance ID | Preconditions and action | Expected result | Automated/manual method and command | Local / CI platform and owner | Expected evidence | Actual result / status | Candidate / run date / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E4.1-AC-01 | Alta de Instrumento solo con nombre, sin ISIN; nombre de 121 caracteres; `divisaReferencia="EURO"` | `Ixxx` único e inmutable, primer ID `I1001` en base sin Instrumentos, estado Activa; nombre 1–120 literal; ISIN/evidencia/`divisaReferencia` NULL o ISO 4217; nombre largo y divisa inválida 422 sin fila; visible en listado; sin Movimiento ni cambio de efectivo/cantidad | API/SQLite real: alta, rechazos y lectura; `bun test apps/api/src/instrumentos.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions API/SQLite y fila `instrumentos`; salida de suite |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-02 | Alta con ISIN + evidencia; alta sin evidencia; ISIN en minúsculas; espacio interior; evidencia de 201 caracteres | Primera guarda normalizada y la muestra; las demás 422 sin Instrumento parcial; validación sintáctica ASCII `[A-Z0-9]{12}`, sin validez registral | API real con ambos payloads; `bun test apps/api/src/instrumentos.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions 201/422; tablas y auditoría sin fila parcial |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-03 | Dos altas con el mismo ISIN variando caja/espacios de borde | Segunda 422 con enlace al existente; sin fusión ni sobrescritura; concurrentes producen un solo Instrumento | API real, comparación normalizada y concurrencia; `bun test apps/api/src/instrumentos.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de unicidad normalizada; conteo de filas |  PARCIAL — unicidad normalizada y índice único probados; carrera de dos procesos no ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-04 | Crear dos Instrumentos con el mismo nombre | Dos IDs distintos, sin fusión; nombre no clave | API real; `bun test apps/api/src/instrumentos.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de dos IDs y listado |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-05 | Renombrar un Instrumento con Compras; repetir sin `motivo` | Conserva `Ixxx`, Compras, posiciones e historial; `instrumento_audit` con revisión, motivo, actor, UTC y antes/después; sin motivo 422 | API/SQLite; `bun test apps/api/src/instrumentos.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de ID, Compras y fila de auditoría; salida de suite |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-06 | Editar ISIN/evidencia de un Instrumento con Compras | Guarda con revisión, motivo y auditoría; revalida unicidad; Compras y efectivo/cantidad intactos | API real; `bun test apps/api/src/instrumentos.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de campos, auditoría y Compras sin cambio |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-07 | Desactivar con revisión/motivo, consultar, intentar compra, reactivar, revisión obsoleta y DELETE | Inactivo no seleccionable ni aceptado (422 `VALIDATION`); historial visible; reactivar permite comprar; obsoleta 409 `REVISION_CONFLICT` sin escritura; DELETE 404 `NOT_FOUND` sin escritura | API/UI real; `bun test apps/api/src/instrumentos.test.ts` + `bun run test:e2e tests/e2e/inversiones.spec.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions 422/409/404 y recorrido navegador; PNG `artifacts/e4-1/` |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-08 | Comprar el mismo Instrumento en `S004` «Cartera de inversión demo» y `S006` «Cartera secundaria demo» (creado por el servicio) | Dos posiciones por Saldo+Instrumento, con cantidad y compras independientes | API/SQLite y motor de posición; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de dos claves y cantidades independientes |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-09 | Compra EUR sin cambio; con `cambio="1.000000"`; con `cambio="1.100000"` | Las dos válidas guardan cantidad/precio/divisa/importe, el efectivo baja una vez y la cantidad sube; la tercera 422 sin escritura; sin Movimiento | API real + consulta de efectivo/posición; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de importes exactos, filas y conteo de Movimientos |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-10 | Compra en divisa ficticia con cambio histórico | Conserva cantidad, precio, divisa, cambio y EUR; efectivo baja una vez; sin Movimiento | API/SQLite; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de campos decimales y efectivo; conteo de Movimientos |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-11 | Registrar después otra Compra con cambio distinto | Compra anterior, efectivo y cantidad no cambian; sin recálculo | API con dos cambios ficticios; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions antes/después de Compra y efectivo |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-12 | Compra con comisión incluida; comisión > importe; comisión negativa | La válida muestra desglose y el efectivo baja por el importe, no por importe+comisión; las otras dos 422 sin escritura | API real y cálculo de efectivo; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de comisión e importe; comparación de efectivo |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-13 | Importe EUR distinto de `cantidad×precio×cambio` | Conserva el importe observado; diferencia informativa; sin sobrescritura ni redondeo | API/UI real; `bun test apps/api/src/compras.test.ts` + E2E | macOS local ejecutado; CI Ubuntu pendiente | Assertions de importe y diferencia; PNG del formulario |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-14 | Cantidad 9 decimales, precio/cambio 7; límites 8/6/6; EUR en céntimos | Exceso 422 en API y rechazo en persistencia sin fila ni redondeo; límites de escala aceptados; EUR exacto sin float | Motor puro + API + intento SQL directo; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de límites, rechazo de persistencia y valores exactos |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-15 | Fecha futura, inválida, 29 de febrero bisiesto y pasada válida | Futuro/inválida 422; bisiesto y pasado aceptados; fecha civil literal sin desplazamiento | API con fechas ficticias; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions 422/201 y fecha persistida literal |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-16 | Compra que a su fecha dejaría efectivo negativo | 422 `INSUFFICIENT_CASH` con `disponible`/`necesario`/`minimo`/`fecha`; sin escritura; aperturas y hechos intactos; nunca 409 | API + cálculo de efectivo; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de bloqueo, código, importes y tablas sin cambio |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-17 | Instrumento/Saldo inexistente o inactivo; tipo incorrecto; efectivo = inversión; `Efectivo`/`Movimientos` | 422 con motivo; sin Compra, efectivo, cantidad ni auditoría de éxito | API real; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de error y tablas sin cambio |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-18 | Fallo inyectado tras reservar ID o antes de auditar | Rollback completo; sin Compra, efecto, contador consumido ni auditoría parcial | Prueba de fallo transaccional; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de rollback y comparación de tablas/contador |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-19 | Reintento con misma idempotency-key/payload; después payload distinto | Un hecho y un cargo; conflicto sin segunda Compra | API real, replay y payload alterado; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de conteo, importe y respuesta de reintento |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-20 | (a) Dos altas concurrentes sin efectivo suficiente para ambas; (b) dos revisiones desactualizadas; (c) confirmación de un Movimiento previsualizado con huella/contexto desactualizado | (a) una escritura y la otra 422 `INSUFFICIENT_CASH` por suficiencia recalculada; (b) una escritura y la otra 409 `REVISION_CONFLICT`; (c) 409 `IMPACT_CHANGED` sin escritura; cada respuesta lleva solo el código de su causa; sin negativo, doble cargo ni 409 genérico por concurrencia. Las rutas de Compra no transportan huella y no emiten `IMPACT_CHANGED`. | Dos conexiones/procesos reales; (a)(b) `bun test apps/api/src/compras.test.ts`, (c) `bun test apps/api/src/movimientos.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de carrera, códigos distintos, conteo y efectivo final |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-21 | Listado con `saldo`, `saldoEfectivo`, `saldoInversion`, fechas, Estado y paginación; búsqueda ISIN/nombre | `saldo` casa con efectivo o inversión; específicos estrechan; filtros/página estables; anuladas consultables; búsqueda normalizada y `%`/`_` literales | API real con >100 filas ficticias; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de filtros, orden y páginas |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-22 | Consultar ficha/posición de un Instrumento | Cantidad = suma de compras vigentes; sin Ventas, valor, resultado ni rentabilidad; «No disponible» sin 0; cobertura parcial visible | API/UI real; `bun test apps/api/src/compras.test.ts` + E2E | macOS local ejecutado; CI Ubuntu pendiente | Assertions de cantidad; PNG de ficha sin valoración |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-23 | Consultar `S003`, `S004` y `S001` antes/después de una Compra | Fórmula con ventas 0 estructural; efectivo separado de la posición; `S004` sigue sin valoración; `S001` no cambia; Ventas no instaladas | Motor puro + API; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de fórmula y DTO; comparación con Saldos |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-24 | Crear, rectificar y anular Compras; consultar referencia temporal | Máximo sin cambios por Compras; fuente Inversión «pendiente hasta E4.2» (E4.2-AC3); sin reloj ni fecha inventada | Motor de referencia + API; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de máximo igual y ausencia de `Date.now` | PARCIAL — creación/anulación cubiertas; rectificación verificada por QA en temporal, no versionada |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-25 | Rectificar Compra vigente con payload completo; repetir con revisión obsoleta y omitiendo `precio` | Impacto efectivo/cantidad antes/después; motivo/revisión; atómico; auditoría; posición recalculada; payload completo obligatorio; revisión obsoleta 409 `REVISION_CONFLICT` y campo omitido 422 `VALIDATION`, sin escritura | API/UI real; `bun test apps/api/src/compras.test.ts` + E2E | macOS local ejecutado; CI Ubuntu pendiente | Assertions de impacto, revisión, códigos y auditoría; PNG de preview |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-26 | Anular con revisión/motivo; repetir con la revisión ya vigente; revisión obsoleta | Queda Anulada, no computa, no se borra; segunda anulación 422 `VALIDATION` por Estado no elegible y revisión obsoleta 409 `REVISION_CONFLICT`, sin escritura; auditoría consultable | API real; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de estado, códigos, cantidad y auditoría |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-27 | Crear, rectificar y anular Compras; comparar Movimientos/Presupuesto | Sin cambio en número de Movimientos; sin Gasto/Compra, Partida, Referencia ni ejecución | API/SQLite, comparación antes/después; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de conteo y tablas de presupuesto | PARCIAL — no se crean Movimientos; comparación de tablas de Presupuesto verificada por QA en temporal, no versionada |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-28 | Transferir efectivo al bróker y después comprar | Dos hechos distintos; cada uno afecta al efectivo una vez; ninguno crea el otro | API real de Transferencia + Compra; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de dos IDs, efectivo y ausencia de relación automática |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-29 | Acceso sin sesión, sin CSRF/Origin y error interno | 401/403; sin escritura; errores sin SQL/importes/tokens; sin DELETE ni fixtures | HTTP real MFA/Origin/CSRF; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de códigos y logs/errores saneados |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-30 | Recorrer listado, ficha, alta, W7/W8 y W9/W10 a 390/1440 con teclado; comprobar filtro de Estado y alcance de W8/W10 | Flujos operables, foco visible y devuelto al aviso, etiquetas, sin overflow, tema claro, borrador conservado, botones deshabilitados sin motivo; en W1/W4 «Todos» muestra `I1003` Inactiva y «Activos» la oculta; W8 declara «Todas (3)» y muestra la Anulada solo con «Ver»; W9/W10 cubren rectificación y anulación | Playwright real, capturas 390×844 y 1440×1000; `bun run test:e2e tests/e2e/inversiones.spec.ts` | macOS local ejecutado; CI Ubuntu pendiente | PNG ficticios inspeccionados `artifacts/e4-1/`; notas de foco/overflow | PARCIAL — capturas 390/1440 y flujo visual PASS; navegación completa por teclado y foco del impacto no automatizados |  `bun run test:e2e tests/e2e/inversiones.spec.ts` |
| E4.1-AC-31 | Provocar vacío, carga, error de fuente, 409 y sesión expirada | Estados distintos/accionables; «No disponible» con motivo; sin 0 ficticio; borrador conservado | Playwright con API real e intercepción solo de estados; `bun run test:e2e tests/e2e/inversiones.spec.ts` | macOS local ejecutado; CI Ubuntu pendiente | PNG de estados; assertions de borrador y foco |  PASS — E2E ejecutado  |  `bun run test:e2e tests/e2e/inversiones.spec.ts` |
| E4.1-AC-32 | Inspeccionar IDs y auditorías dedicadas; intentar UPDATE/DELETE sobre ellas | IDs únicos/inmutables; una fila por revisión con actor, UTC, motivo y JSON antes/después; triggers abortan; `audit` sin cambios | SQLite/API; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de IDs, filas de auditoría y triggers; sin DELETE |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-33 | (a) actualizar una base 13 a 18 sin tablas v14/v15/v16/v17; (b) verificar `C14-COMPARTIDOS-FCE1107` y rechazar su v14; (c) verificar `C14-VEHICULOS-C69E343` y subir su fixture v14 a 18; (d) verificar `C15-COMPARTIDOS-AD2EDFE` y subir su fixture v15 a 18; (e) verificar `C16-REVISION-COMIDA-26B6F0C` (135 objetos) y subir su fixture v16 a 18; (f) verificar `C17-D5-CF6954A` (145 objetos, SHA-256 `e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50`, `cf6954a`) y subir su fixture v17 con filas sintéticas de D5, Compartidos, Revisión de Comida y Vehículos a 18, comprobando `movimiento_compartido`, índices, triggers y Movimientos/auditorías reconstruidos; (g) abrir variantes v14/v15/v16/v17 desconocidas o incompletas; (h) abrir una base 19; (i) gate con main 18+, 18 ocupada, main 14/15/16/17 no verificado, C16/C17 no canónicos, sin manifiestos o worktree en 18; (j) inspeccionar rutas 13/14/15→18, 16→17→18 y 17→18, compuertas y restore 13/14/15/16/17 verificada/18 | (a) 13→18 por progresión canónica 13→14→15→16→17→18, conserva filas y crea vacías las tablas heredadas que falten; (b) histórico v14 rechazado sin mutar; (c) C14V preservado y 14→18 conserva Vehículos; (d) C15 preservado y 15→18 conserva Compartidos; (e) C16 preservado y 16→17→18 conserva Revisión de Comida; (f) C17 coincide (145 objetos/hash) y 17→18 preserva D5, `movimiento_compartido` y sus índices/triggers, las seis tablas reconstruidas (`movimientos`, `movement_audit`, `movimiento_anticipo`, `payroll_allocations`, `revision_comida`, `revision_comida_audit`), el `CHECK` D5 de Transferencia, Compartidos, Revisión de Comida, Vehículos, `referencias`, auditorías, identidad (`database_origin`/`owner`/`key_hash`), contadores y filas, sin reejecutar 14→15/15→16/16→17; (g) variantes desconocidas/incompletas rechazadas antes de `BEGIN IMMEDIATE`/`journal_mode`/DDL/backup/`schema_version` con literal v14/v15/v16/v17 y sin escribir; (h) v19 rechazada antes de mutar; (i) gate STOP si main 18+, 18 ocupada, main 14/15/16/17 no verificado, C16/C17 no canónicos, faltan manifiestos o hay worktree en 18; (j) E4.1 17→18 aditivo sin `DROP`/`ALTER` destructivo; migraciones 14→15/15→16/16→17 son de main; `database-identity.ts` `1..18`, `database-schema.ts` `[1..17, version]`, `backup.ts` `1..18`, etiqueta `e4.1-v18` (origen D5 `e3.2-d5-v17`); restore verifica el manifiesto de la versión de la copia (C14V/C15/C16/C17; 13 solo integridad), copias 13-17 verificadas conservan su esquema, copia desconocida no se publica, copia 18 recupera Instrumentos/Compras/auditorías y vacía sesiones/desafíos/intentos; todas las rutas conservan datos, identidad, auditorías, referencias, contadores e integridad; rollback íntegro | API/SQLite real + fixtures aislados; `bun test apps/api/src/compras.test.ts` + backup/restore | macOS focal PASS; CI Linux SUCCESS | Manifiestos/hash, preservación D5, rechazos sin mutación y restore | PASS/PARCIAL — DEV19 dd450de | — |
| E4.1-AC-34 | Simular error de la fuente de Compras/efectivo (tabla ilegible o consulta fallida) | «No disponible» con causa concreta; identidad/filtros conservados; sin 0, reparación ni guardado que presuma integridad | API/UI con fallo de fuente; `bun run test:e2e tests/e2e/inversiones.spec.ts` | macOS local ejecutado; CI Ubuntu pendiente | PNG de error; assertions de motivo y ausencia de escritura | PARCIAL — error de Compras cubierto; error de fuente de efectivo no probado extremo a extremo |  `bun run test:e2e tests/e2e/inversiones.spec.ts` |
| E4.1-AC-35 | Retroactiva con apertura 1.000,00; entrada 500,00 el 2026-02-01; salida 1.800,00 el 2026-03-01; Compra de 100,00 el 2026-02-10; repetir con salida 200,00; mismo día con entrada 100,00 y Compra 1.050,00 / 1.150,00 | Primer caso 422 `INSUFFICIENT_CASH` con fecha 2026-03-01 y mínimo −400,00; segundo 201 y saldo posterior 1.200,00; mismo día: 1.050,00 aceptada (cierre 50,00) y 1.150,00 rechazada con fecha 2026-02-10 y mínimo −50,00, independiente del orden | API + motor puro de suficiencia con ventana posterior; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de 422/201, código, fecha, importe del mínimo y tablas sin cambio |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-36 | Instrumento con Compra USD (cambio 0,900000); editar su divisa de referencia a EUR | Solo cambia el maestro con auditoría; la Compra conserva USD, 0,900000, precio, 1.125,00 € y comisión; efectivo/cantidad iguales | API/SQLite; `bun test apps/api/src/instrumentos.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de campos históricos y auditoría del maestro |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-37 | Abrir listado, ficha y W7/W8 con posiciones calculadas | Declaración de cobertura parcial visible; no se presenta como posición completa; sin 0 ni datos no registrados | Playwright real; `bun run test:e2e tests/e2e/inversiones.spec.ts` | macOS local ejecutado; CI Ubuntu pendiente | PNG de listado/ficha con la etiqueta; assertion de texto |  PASS — E2E ejecutado  |  `bun run test:e2e tests/e2e/inversiones.spec.ts` |
| E4.1-AC-38 (integración/regresión) | `GET /api/saldos/S003` y `GET /api/inversiones/efectivo?saldo=S003` sin `fecha`, y con `fecha` | Sin `fecha` misma cifra al céntimo del mismo motor; con `fecha` corte etiquetado distinto; ninguna escribe | API + motor puro; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de igualdad exacta, etiqueta de vista y tablas sin cambio |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-39 (integración/regresión) | `flujo-mensual` con `S003` en `liquidez=1` (posición no nula: apertura ficticia de 3.200,00 y Compra de 1.389,60), `=0` y `NULL`; una Compra válida con efectivo `S003` e inversión `S004` y `S001` antes/después | `=1`: `liquidez.incluidos` con `S001` y `S003`, `excluidos` sin `S003`, `metrics.liquidez.estado = "Verificado"`, `metrics.liquidez.subtotal = null` y `metrics.liquidez.valor = posición S001 + 1.810,40`; `metrics.liquidez.motivo` contiene «Cobertura histórica no importada: la posición de inversión solo incluye Compras registradas en la aplicación» y la UI la muestra; `=0`: solo `S001`; `NULL`: `excluidos` con «Liquidez sin informar», `metrics.liquidez.estado = "Parcial"` y `metrics.liquidez.subtotal` de `S001`; la Compra no altera posición ni Movimientos de `S001` | Regresión de integración API + UI; `bun test apps/api/src/flujo-mensual.test.ts` + `bun run test:e2e tests/e2e/flujo-mensual.spec.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de `incluidos`, `excluidos`, valor, cobertura y expectativa actualizada |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-40 (integración/regresión) | `GET /api/saldos/S004` y endpoint de efectivo para `S004` (rechazo); previsualizar Transferencia sobre `S004` | `null` con condición `pendiente_motor` y motivo de valoración E4.3; endpoint de efectivo 422 sin cifra; el preview no inventa el extremo posterior | API real; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de `null`, 422, motivo y ausencia de cifra |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-41 (integración/regresión) | En este orden: (1) partir de `S003` **sin Movimientos y sin Compras** y fijar `permiteSalidaExterior=true` **antes** de que tenga Compras (con Movimientos, el guard E1.1 lo bloquearía; después de una Compra, el guard de AC-42 lo bloquea con 409 `HISTORY_LOCKED`); (2) crear las Compras del fixture; (3) Partida activa con ancestros activos; (4) Subtipo válido para el Ingreso; (5) Partida ligada a una Deuda activa para la Amortización: previsualizar Gasto e Ingreso sobre `S003`, Transferencia `S001 → S003` y `S003 → S001`, y Amortización desde `S003` | En los cuatro tipos el extremo del Saldo de prueba utilizado (`S003`) se calcula antes/después con el motor de efectivo; ninguna previsualización devuelve 422 `EXTERIOR_PERMISSION`, `DEBT_REQUIRED`, `INACTIVE_DEBT` ni `INACTIVE_CLASSIFICATION` por precondición; pendientes ya no afirma que falta ese motor y declara valoración E4.3; no escribe, ni reserva ID, ni audita | API + motor; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions antes/después, texto de pendientes y tablas sin cambio |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-42 (integración/regresión) | Con Compra vigente y anulada en `S003`: cambiar los cinco campos protegidos; desactivar/reactivar; cambiar nombre | Los cinco 409 `HISTORY_LOCKED` sin escritura; desactivar/reactivar funcionan y conservan Compras; el nombre sí cambia | API/SQLite; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions 409, filas y auditoría del Saldo |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-43 | Consultar auditoría de Instrumento y de Compra tras cada acción; ID inexistente | Revisiones ordenadas con acción, motivo, actor, UTC y JSON antes/después; anulación con estado Anulada; 404 si no existe; solo lectura; `audit` intacta | API real; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de orden, contenido y 404; comparación de `audit` |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-44 | Reloj fijo `2026-01-15T23:30:00Z`, `2026-01-16T00:30:00Z`, `2026-07-15T22:30:00Z`, `2026-03-29T00:30:00Z` y `2026-10-25T00:30:00Z` | Máximo admitido 16/01, 16/01, 16/07, 29/03 y 25/10 de 2026 (día civil Madrid); día siguiente 422; fecha guardada literal | Motor puro `spanishToday` + API; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de fecha máxima y persistencia literal |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-45 | Rectificar omitiendo `precio`; `null` en nullable y en `importeEur`; incluir Instrumento/Saldos | Omisión 422 con campo; `null` limpia nullable; `null` en importe 422; Instrumento/Saldos 422 sin escritura; válida guarda revisión y auditoría | API real; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de 422 por campo y de limpieza efectiva |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-46 | Rectificar al alza con saldo posterior negativo; rectificar a importe válido; mover fecha atrás; mismo día en distinto orden de captura; repetir con revisión obsoleta | Primera 422 `INSUFFICIENT_CASH` con `disponible`/`necesario`/`minimo`/`fecha`, sin escritura; válida aceptada; resultado idéntico en ambos órdenes; revisión obsoleta 409 `REVISION_CONFLICT` sin escritura | API + motor de suficiencia; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de 422/201/409, código, mínimo, fecha y determinismo de orden |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-47 | Anular y crear otra con distinto Instrumento y/o Saldos, con el mismo `motivo` textual (sin campo de enlace) | Original Anulada fuera de efectivo/posición; nueva computa en sus Saldos; ambas auditadas; localizables por fecha/estado en el listado y por `motivo` en la auditoría; identidad original intacta y sin vínculo persistido | API/SQLite; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de estados, cantidades y auditoría |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-48 | Escenario con 0, 1 y N Saldos `Efectivo`/`Inversiones` (segundo creado por el servicio); consultar opciones | `saldosEfectivo` y `saldosInversion` separados y sin preselección; 0 bloquea y explica; 1 exige selección vacía; N lista todos con cifra, sin agregado; el módulo muestra una línea por Saldo | API/UI real; `bun test apps/api/src/compras.test.ts` + E2E | macOS local ejecutado; CI Ubuntu pendiente | Assertions de ambas listas, ausencia de total y PNG de selectores |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-49 (integración/regresión) | Desactivar un Saldo con Compras; consultar efectivo/posición/listado/selectores; reactivar | Efectivo y posición siguen incluyendo sus Compras y son consultables; no seleccionable; reactivar lo recupera; Liquidez mantiene su filtro | API/SQLite; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de cifras, selectores y estado del Saldo |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-50 | Cantidad `90071992.54740991`, precio y cambio `9007199254.740991`; una unidad escalada por encima en cada campo | Límite aceptado y persistido exacto; por encima 422 sin fila ni redondeo; sin `number` en el cálculo | Motor puro + API + persistencia; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de límite, rechazo y valores exactos |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-51 | Referencia con cantidad `90071992.54740991`, precio `9007199254.740991` y cambio `1.000000` (producto > 2⁵³; representación escalada > 64 bits); comparar con el valor exacto | Producto exacto sin desbordamiento, truncamiento ni saturación; visualización redondeada a céntimos solo para presentar; cálculo interno `BigInt` no recortado al límite de entrada ni a 64 bits; límite por campo sigue en 422 por encima | Motor puro decimal exacto + API; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions del producto exacto, redondeo de presentación y rechazo del límite por campo |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-52 | Invocar los tres `POST` de impacto y los GET de listado, ficha, auditoría, efectivo y opciones; comparar tablas, contadores, revisiones y auditoría | Ninguna ruta escribe: sin filas nuevas ni modificadas en Compras, Instrumentos, operaciones, auditorías o intentos; contadores sin mover, sin ID reservado y sin cambio de revisión | API/SQLite con snapshot antes/después; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions de tablas, contadores y revisiones idénticas; respuestas de solo lectura |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-53 (integración/regresión) | Previsualizar Gasto sobre `S003`; registrar una Compra que cambie el efectivo; confirmar con la huella y `contextRevision` previas; repetir con un Gasto previsualizado sobre `S001` (sin Compras) y una Compra en `S003` | 409 `IMPACT_CHANGED` sin escribir el Movimiento (no `REVISION_CONFLICT`: la revisión del Movimiento no cambió); el efectivo refleja solo la Compra; borrador conservado; tras recalcular, la confirmación es válida. El caso ajeno devuelve también 409 `IMPACT_CHANGED` sin escritura y se acepta como sobre-invalidación segura de la huella global, no como defecto; tras recalcular, válido | API/Motor + comparación antes/después; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions 409, huella obsoleta, tablas sin cambio y reintento válido en ambos casos |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |
| E4.1-AC-54 | `concepto`/`nota` de 2000 y 2001; `divisa` `US`, `USDD`, `usd`; `comisionEur` `5.001` | 2000 aceptado y literal; 2001, cada divisa inválida y la comisión de 3 decimales devuelven 422 con el campo, sin escritura ni redondeo | API real por campo; `bun test apps/api/src/compras.test.ts` | macOS local ejecutado; CI Ubuntu pendiente | Assertions 201/422 por campo y tablas sin cambio |  PASS — suite focal ejecutada  |  `bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts apps/api/src/inversiones-ac.test.ts` |

## Contratos C14/C15/C16/C17 congelados y gate de destino — 2026-10-27

Evidencia PRE-DEV-SCHEMA. No implementa E4.1 ni modifica el esquema de la aplicación: genera
fixtures aislados desde los commits fuente y congela sus manifiestos. Artefacto versionado:
[`apps/api/src/schema-contracts.json`](../apps/api/src/schema-contracts.json).

| Contrato | Versión | Commit fuente | Objetos | SHA-256 del manifiesto | SHA-256 del fixture SQLite |
| --- | ---: | --- | ---: | --- | --- |
| `C14-COMPARTIDOS-FCE1107` (histórico; no origen) | 14 | `fce1107` | 114 | `df6ad4b2e069392a3aa3e1dd616f15afdd5a78738a64ae0199a57dd67b607c8d` | `e6a490ae25a9c0c3c9d87ce8a599de55a2bb462961a63b03fd05dcb9ec496d96` |
| `C14-VEHICULOS-C69E343` | 14 | `c69e343` | 111 | `f262020fd1658cf0e7c873c32a0322479dbe91f67d3027e178f89b072a86c857` | `34cadc7ef7f98a0db0153e180b4449a78337a7a43121d0c538fccd4c847de383` |
| `C15-COMPARTIDOS-AD2EDFE` | 15 | `ad2edfe16abd14e2088e41a6f0e1f8f20ea9cc02` | 122 | `d1a5b5479cc78c5aaa42d07a3c47ed443b475e3b4cfcac81372d99c50d34fff5` | `6c0b9bb51054d74d34cf67494cee8b6b9745b8a3ce4a4acce75fa95b5b2ea226` |
| `C16-REVISION-COMIDA-26B6F0C` (**real en main; congelado el 2026-10-27**) | 16 | `26b6f0c` (verificado en main `2487656`/`1d539a8`) | 135 | `9d9b0783c519d32d667ae2a3911310b3667bfc4783089db4e6eea9171a9d2dc4` | Pendiente de fixture v16 de datos; no se publica .db |
| `C17-D5-CF6954A` (**real en main; congelado el 2026-10-27**) | 17 | `cf6954a` (PR90/D5) | 145 (57 tablas + 17 índices + 71 triggers) | `e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50` | Pendiente de fixture v17 de datos; no se publica .db |

Comprobaciones:
- Los cinco contratos se auto-verifican contra `schema-contracts.json`; **C16 y C17 están
  congelados** (135 y 145 objetos) con sus hashes canónicos; la cesión de D5 fue autorizada
  temporalmente el 2026-10-27.
- El fixture de `origin/main` `f5bf0325e52cdd4c875aacb32f086dd67a08befa` (esquema 14) produce
  el mismo manifiesto, el mismo SHA-256 (`f262…c857`) y el mismo fixture SQLite que
  `C14-VEHICULOS-C69E343`: **coincide exactamente**.
- `C15-COMPARTIDOS-AD2EDFE` se generó desde la rama local `codex/dev14-base-b` (`ad2edfe`),
  que declara `schemaVersion = 15` y contiene Compartidos v15 + Vehículos. Es el contrato real
  de la reserva 15; incluye 122 objetos. Los HEAD posteriores `935dee9`/`e4ff2df` conservan el
  mismo esquema y producen el mismo manifiesto/hash.
- El fixture v15 de datos (`compartidos-v15-data.db`) contiene filas sintéticas en
  `referencias`, `fichas_compartidos`, `participantes_compartido` y `fichas_vehiculo`; su
  SHA-256 es `6c0b9bb5…ea226` y sirve de base para la prueba de preservación 15→16.
- **Actualización 2026-10-27 (main v16):** `origin/main` avanzó a `2487656`
  (PR82/DEV16, Revisión bancaria de Comida) y después a `1d539a8` (solo docs, mismo esquema);
  declara `schemaVersion = 16`. El manifiesto
  regenerado en `main` y en su fuente de esquema `26b6f0c` coincide: **135 objetos**, SHA-256
  `9d9b0783c519d32d667ae2a3911310b3667bfc4783089db4e6eea9171a9d2dc4`; se propone como
  `C16-REVISION-COMIDA-26B6F0C`. La 16 queda ocupada; la **18 está libre**: ningún ref local ni
  remoto declara `schemaVersion = 18` a 2026-10-27. No se ha integrado main 16/17 en la rama E4.1.
- **Actualización 2026-10-27 (main v17/D5):** `origin/main` avanzó a `cf6954a` (PR90/D5) y
  declara `schemaVersion = 17`. El manifiesto generado tiene **145 objetos** y SHA-256
  `e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50`; se propone como
  `C17-D5-CF6954A`, **congelado; cesión autorizada el 2026-10-27**. La 17 ya es
  origen de E4.1; C16/C17 están congelados; la 18 sigue libre en refs y worktrees.
- Los fixtures se generaron en un directorio aislado temporal, sin abrir ni modificar los
  worktrees de Compartidos o Vehículos y sin datos reales. Los ficheros `.db` no se publican;
  se conservan sus SHA-256 como evidencia. El generador y las instrucciones de reproducción
  están en [`specs/fixtures/e4.1/`](fixtures/e4.1/README.md).

**Resultado del gate:** **STOP para 17 como destino; PASS documental para 18.** `main`
`9977210` (17, D5/PR90) coincide con el manifiesto canónico de **145 objetos** y SHA-256
`e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50`; C16 y C17 están
congelados en `apps/api/src/schema-contracts.json` y la cesión de D5 fue autorizada
temporalmente el 2026-10-27. La 18 está libre en refs y worktrees. Rev10 fija
13/14/15/16/17→18, tablas heredadas vacías si faltaban y preservación D5. El gate de código
queda pendiente de la autorización separada de DEV19; si `main` llega a 18, la 18 se ocupa o
cambia un manifiesto, STOP.

**Congelación (2026-10-27).** `apps/api/src/schema-contracts.json` contiene los cinco contratos
(C14, C14V, C15, C16, C17) y valida sus SHA-256 al cargar. Artefacto:
`f9a30cdcf0d3037f2801c88edbc13d4057f23be9eaa83d8fa8a7f928562eac6c` (212 958 bytes, 5
contratos, +1696/−0). Reproducción: `git archive <commit> apps/api/src | tar -x -C <temp>` y
`bun run specs/fixtures/e4.1/generate-schema-contract.ts <ID> <commit>
<temp>/apps/api/src/database-schema.ts <temp>.db <temp>.json`, desde
`26b6f0c8838e1d4dfe2a7bb38949f4fa240b7d5f` (C16) y
`cf6954a87c3e916f422b989df0faf0bc926c46b6` (C17). La regeneración produjo 135/145 objetos y
los hashes indicados; la revisión independiente read-only fue PASS (9/9). No se modificó
código: `schemaVersion` sigue 16 y `admitted` sigue limitado a 14/15.

## Regression checks

**Evidencia histórica del contrato 16, no de rev10/18:** ejecutada el 2026-10-27 sobre el
candidato fusionado `51d7f5d` (padres `30ff49c` y `main` `24b48c5`):
`bun test apps/api/src/instrumentos.test.ts apps/api/src/compras.test.ts
apps/api/src/inversiones-ac.test.ts apps/api/src/flujo-mensual.test.ts` → **35 pass / 0 fail /
457 aserciones**. El candidato v18 `dd450de` sí adapta el código y ejecuta las pruebas 16→17→18 y 17→18,
incluida la preservación D5 con fila real. Typecheck, build y E2E de Inversiones, flujo mensual
y Compartidos PASS en macOS (2 fallos E2E de restauración por plataforma, cubiertos por CI
Linux). La matriz final es **48 PASS y 6 PARCIAL** (AC-03, AC-24, AC-27, AC-30, AC-33 y
AC-34), sin FAIL ni UNRUN bloqueante. La QA independiente emitió **PASS técnico**; DEV19 está
autorizado e implementado. La evidencia Linux/CI está cerrada con el run full `40583217493` (13 E2E).

Regresiones de integración con expectativa que cambia (H1-1, H1-2, H3-8, N1–N4). No son
fallos: son el efecto declarado de hacer disponible el motor de `Efectivo`/`Inversiones` y de
incluir Compras en el contexto financiero. F5 y F7 fijan el mismo oráculo único de Liquidez,
sin condicionales.

- `apps/api/src/flujo-mensual.test.ts` (F5 AC27–32/42–44): con `S003` dotado en la prueba de
  apertura ficticia de 3.200,00 y una Compra vigente de 1.389,60 (posición 1.810,40), la expectativa pasa
  de `metrics.liquidez.estado = "Parcial"` con `S003` en `excluidos` a
  `metrics.liquidez.estado = "Verificado"`, `excluidos` sin `S003`, `incluidos` con `S001` y
  `S003`, `metrics.liquidez.valor` = posición de `S001` + 1.810,40 y
  `metrics.liquidez.subtotal = null` al no haber exclusiones; `metrics.liquidez.motivo` contiene
  «Cobertura histórica no importada: la posición de inversión solo incluye Compras
  registradas en la aplicación». Con `liquidez=0` en `S003`, el valor es solo `S001`; con
  `liquidez=NULL`, `S003` reaparece en `excluidos` con «Liquidez sin informar»,
  `metrics.liquidez.estado = "Parcial"` y `metrics.liquidez.subtotal` de `S001`.
- `apps/api/src/flujo-mensual.test.ts` (F7 AC33/34/37/38): la aserción
  `metrics.liquidez.subtotal).not.toBeNull()` pasa a `metrics.liquidez.estado = "Verificado"`,
  `metrics.liquidez.subtotal = null` y `metrics.liquidez.valor = S001 + S003`; el fallo de
  Nómina no añade exclusiones de Liquidez y el resto de aserciones de fuente se conservan.
- `apps/api/src/app.test.ts` (AC06/09–12/27/34, «seis pares y posiciones no inventadas»): la
  aserción «todo control distinto de Movimientos devuelve `posicion.importe` null» se
  restringe; `Efectivo`/`Inversiones` (`S003`) pasa a tener cifra calculada y
  `Inversión`/`Inversiones` (`S004`) sigue null.
- `apps/api/src/movimientos.test.ts` (pares ficticios y preview): un Saldo
  `Efectivo`/`Inversiones` creado en la prueba deja de devolver `null`; su posición es la del
  motor de efectivo y la previsualización de Gasto, Ingreso, Transferencia y Amortización
  calcula el extremo afectado. Los pares Terminal y No controlado siguen sin posición.
- `apps/api/src/referencias.test.ts` (control `Inversiones` con tipo `Efectivo`): misma
  corrección de expectativa; el control `Inversiones` con tipo `Efectivo` ya no es «posición
  no calculable».
- `apps/api/src/saldos`/`updateSaldo`: el guard nuevo solo actúa con Compras; las pruebas
  existentes sin Compras conservan 200 y las que cambian `tipo`/`control` con Movimientos
  siguen devolviendo 409 `HISTORY_LOCKED`.
- **Rev10/18 (implementado en DEV19):** `database-identity.ts` deberá declarar `schemaVersion = 18`
  y admitir `1..18`; `database-schema.ts` `[1..17, version]`, verificar los contratos
  v14/v15/v16/v17 y aplicar el esquema de inversión cuando la base sea `< 18`; `backup.ts`
  `1..18` y etiqueta `e4.1-v18` (origen D5 `e3.2-d5-v17`); `database.ts` verificará el contrato
  antes de PRAGMAs persistentes y de la transacción de identidad. Manifiestos: C14 histórico,
  C14 Vehículos, C15 Compartidos, C16 Revisión de Comida y **C17-D5-CF6954A** (145 objetos,
  SHA-256 `e0707d4056522979b26692beb1fe7dfc26984b06afceb7b54a5f6d7011a50e50`,
  congelado; cesión autorizada el 2026-10-27). Las rutas 13/14/15/16/17→18 aplicarán la progresión
  canónica; si faltaban Compartidos, Revisión de Comida o D5, crearán sus tablas vacías. Una
  base 17 **solo** subirá si coincide con C17 canónico; preservará `movimiento_compartido`,
  índices, triggers, Movimientos/auditorías reconstruidos, Compartidos, Revisión de Comida,
  Vehículos, `referencias`, contadores y filas. Una base 14/15/16/17 con objeto ausente, SQL
  alterado, objeto extra, tablas sintéticas o contratos mezclados se rechazará con el literal
  de su versión antes de `BEGIN IMMEDIATE`, `journal_mode`, DDL, backup o cambio de
  `schema_version`. Una versión 19 se rechazará antes de mutar. Los backups 13, 14/15/16/17
  verificados y 18 se restaurarán en directorio nuevo; los de 13-17 conservarán su esquema de
  origen y no incorporarán tablas v18; una copia v14/v15/v16/v17 desconocida se rechazará antes
  de publicar; la de 18 recuperará Instrumentos, Compras y auditorías y vaciará
  sesiones/desafíos/intentos. La extensión propia 17→18 será aditiva; la prueba fallará si su
  SQL contiene `DROP`/`ALTER` destructivo. Las migraciones 14→15, 15→16 y 16→17 son de main y
  pueden reconstruir/crear sus tablas. **Todo esto está implementado y ejecutado en DEV19; ver
  evidencia de CI y QA.**
- **D5/v17 evidencia existente en main (re-ejecutada en DEV19):** `apps/api/src/d5-aportaciones.test.ts`
  cubre T-D5-01/05/06/07/12 (alta atómica), T-D5-09 (replay, concurrencia, contexto obsoleto y
  rollback), T-D5-10/11 (rectificación/anulación sin borrado) y la migración v16→v17 con
  preservación de Movimientos, auditorías y Revisión de Comida; `d5-backup.test.ts` cubre
  restauración v17 con acreditación/evidencia y revocación de intentos. El `CHECK` literal de
  `movimientos` que debe conservarse es
  `tipo='Transferencia' AND destino!='S000' AND origen!=destino AND partida IS NULL AND subtipo IS NULL`.
  Para E4.1/18 estas pruebas se ejecutaron en DEV19; junto con la nueva prueba 17→18 con fila
  D5 acreditan la preservación y no sustituyen la QA de E4.1.
- Gate de destino (rev10): antes de adaptar código se comprueba `origin/main`, **todos los
  refs locales/remotos** y los worktrees/estado sin commitear. Estado observado: `main`
  `cf6954a` = 17 con C17 congelado (145 objetos/hash) y **cesión autorizada
  explícita**; la 18 está libre y ningún ref/worktree declara 18. Si `main` llega a 18 o más, la
  18 se ocupa, `main` contiene un v14/v15/v16/v17 no verificado, falta C16/C17 canónicos o faltan
  manifiestos/hashes, **STOP**: no se adapta código y se repite la revisión. La reserva
  documental 18 no prevalece sobre `main` ni sobre una reserva local activa.
  **Todas las rutas 13–16 deben ejecutar la migración canónica D5 16→17 antes de la extensión
  E4.1 17→18; no se admite un salto ni una ruta 17→18 sin C17 canónico.**
- `app.test.ts`/`saldos`/`movimientos` y los endpoints de error: los códigos esperados se
  unifican con la tabla de §7 de la especificación. Una comprobación que hoy espere 409 para
  un rechazo por suficiencia pasa a 422 `INSUFFICIENT_CASH`; una que espere 409 genérico por
  concurrencia pasa a `REVISION_CONFLICT` (revisión), `IMPACT_CHANGED` (huella) o
  `HISTORY_LOCKED` (guard de Saldo) según la causa. No queda ninguna aserción que acepte un 409
  genérico por coincidencia temporal de dos peticiones.
- `previewMovement`/`/api/movimientos/impacto` y `financeRevision`: `pendientes` deja de
  declarar el motor de efectivo de inversión como ausente, declara la valoración de E4.3 y
  `financeRevision` incluye `operaciones_inversion`, de modo que una Compra invalida la
  previsualización con 409 `IMPACT_CHANGED` sin escritura. La invalidación es global: una
  Compra invalida también una previsualización sobre un Saldo sin Compras y ese 409 se
  registra como sobre-invalidación segura esperada (AC-53), no como fallo; tras recalcular,
  la confirmación es válida.

## Functional verification

**Evidencia DEV19 (v18):** **48 AC PASS y 6 PARCIAL** (AC-03, AC-24, AC-27, AC-30, AC-33 y
AC-34) en API/SQLite real, sin FAIL y sin UNRUN bloqueante. La matriz mantiene 54 AC (47
funcionales de E4.1 y 7 de integración/regresión). Sobre `main` `9977210` se ejecutaron
API/SQLite real, comparación de tablas antes/después, dos procesos para concurrencia, rollback
inyectado, las rutas 13→18, 14→18, 15→18, 16→17→18 y 17→18 con fixtures congelados C14/C14V/
C15/C16/C17, rechazo antes de mutar de v14/v15 desconocidas y de v19, preservación de D5
(`movimiento_compartido` con fila real), Revisión de Comida, Compartidos y Vehículos, y
backup/restore 13..18 en directorio nuevo. También se comprobaron la huella exacta por encima
de 2⁵³, la idempotencia de Instrumento y Compra, el orden de la compuerta de manifiesto, el
trigger de identidad de Compra y la no-escritura de GET/impacto con snapshot. Los códigos de
error se comprueban literalmente: `INSUFFICIENT_CASH` (422), `REVISION_CONFLICT` (409),
`IMPACT_CHANGED` (409), `HISTORY_LOCKED` (409), `VALIDATION` (422), `NOT_FOUND` (404) e
`IDEMPOTENCY_CONFLICT` (409). Typecheck PASS; suite focal 58/58; CI Linux x86_64
`40583217493` SUCCESS sobre `dd450de`; QA independiente PASS. Los residuales PARCIAL no
bloquean la publicación: AC-03 carece de carrera real de alta; AC-24/AC-27 tienen verificación
QA temporal no versionada; AC-30 no automatiza toda la navegación por teclado/foco; AC-33
conserva huecos en variantes v16/v17 incompletas y en la comprobación completa de tablas
heredadas vacías; AC-34 solo simula el error de Compras. La evidencia E2E completa en Linux no
se ha ejecutado en DEV19 y sigue siendo requisito de merge.

## Browser verification (web only)

**Evidencia histórica del contrato 16** en Playwright con API/SQLite reales: listado,
ficha/posición, alta, pestaña Compras
(W7/W8) e impacto/rectificación/anulación (W9/W10) a 390×844 y 1440×1000. La revisión
independiente inspeccionó capturas reales y confirmó ausencia de solapamiento/importes
partidos, listas móviles de posiciones y compras en la ficha, borrador conservado, foco en el
aviso de conflicto y botón de recarga de revisión. Residual AC-30: la navegación completa por
teclado y el foco del panel de impacto no están automatizados; el foco sobre el `h2` del
impacto es un no-op conocido. La nota de cobertura histórica no importada de Liquidez se
comprueba en `tests/e2e/flujo-mensual.spec.ts` sobre el bloque «Liquidez actual». No se
guardaron DB, credenciales, tokens, storageState, factores ni trazas en el repositorio.

## Visual improvements (visual apps only)

Evaluación sobre la UI real del candidato fusionado `51d7f5d`:
1. Separación efectivo/posición y cantidad por Saldo: PASS, incluidos varios Saldos de
   efectivo sin agregado.
2. Legibilidad del desglose cantidad/precio/divisa/cambio/EUR/comisión a 390: PASS tras
   corregir tablas y añadir listas móviles.
3. Impacto antes/después de rectificar/anular: PASS, conserva contexto y motivo; residual de
   foco del panel.
4. Estados «No disponible», «Sin posiciones», «Anulada» y cobertura parcial: PASS y
   distinguibles.
5. Foco, teclado y orden de lectura: PARCIAL; el foco de error es visible, pero el panel de
   impacto y la navegación completa por teclado quedan como residual AC-30.

## Limitations and next action

**Rev10 está aprobada e implementada en DEV19 (v18).** El candidato `dd450de` reconcilia
`main` `9977210`, declara `schemaVersion = 18`, admite C16/C17 y ejecuta la cadena 16→17→18.
Typecheck PASS, suite focal 58/58, CI Linux x86_64 full `40583217493` SUCCESS (13 E2E) y QA independiente
PASS (48 PASS / 6 PARCIAL / 0 FAIL). macOS conserva fallos de plataforma
(`libc.so.6`/`renameat2`) que Linux cubre. La PR #95 sigue en draft; **no hay merge ni
despliegue autorizados**. El aplazamiento de DT7 a E4.5/E4.12 sigue registrado en la
especificación (§5.2, §12, §14) y no se prueba en E4.1.
